'use strict';

/**
 * Serialize an value into KDB+'s internal IPC format.
 * See IPC reference at http://code.kx.com/wiki/Reference/ipcprotocol
 * 
 * @param  {*} value      Any JS value, except a function.
 * @return {ArrayBuffer}  ArrayBuffer containing binary data for KDB+ consumption.
 */
module.exports = function serialize(value) {
  var size = calcDataSize(value, null);
  // Create an ArrayBuffer for the outgoing data.
  // Message is always 4 bytes (preamble) + 4 bytes (size) + 1 byte (type) + data.
  var outBuffer = new ArrayBuffer(9 + size);
  var outArray = new Uint8Array(outBuffer);

  // Set writing position to 0
  outArray._writePosition = 0;

  writeByte(outArray, 1); // little endian (0x01)
  writeByte(outArray, 0); // async msg
  writeByte(outArray, 0); // 0x00 padding
  writeByte(outArray, 0); // 0x00 padding
  // Write data size as int32
  intArray[0] = outArray.length;
  writeBytesToBuffer(outArray, 4);
  // Write value to arraybuffer
  writeData(outArray, value, null);

  return outBuffer;
};

// Create a few views around 64 bits so we can easily slice & dice
// different data types and insert them byte by byte into the output array.
var byteArray = new Int8Array(8),
  intArray = new Int32Array(byteArray.buffer),
  floatArray = new Float64Array(byteArray.buffer);

function toType(obj) {
  return Object.prototype.toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
}

function getKeys(obj) {
  var keys = [];
  for (var o in obj) keys.push(o);
  return keys;
}

function getVals(obj) {
  var values = [];
  for (var o in obj) values.push(obj[o]);
  return values;
}

// Calculate the total needed ArrayBuffer size.
function calcDataSize(value, dataType) {
  var type = dataType ? dataType : toType(value);
  var size, i, TYPE_SIZE = 1;
  switch (type) {
    case 'undefined':
    case 'null':
      return 1;
    case 'object':
      return TYPE_SIZE + calcDataSize(getKeys(value), 'symbols') + TYPE_SIZE + calcDataSize(getVals(value), null);
    case 'boolean':
      return 1;
    case 'number':
      // Always sending 64-bit floats
      return 8;
    case 'array':
      {
        size = 5; // attributes byte + size
        for (i = 0; i < value.length; i++) size += TYPE_SIZE + calcDataSize(value[i], null);
        return size;
      }
    case 'symbols':
      {
        size = 5; // attributes byte + size
        for (i = 0; i < value.length; i++) size += TYPE_SIZE + calcDataSize(value[i], 'symbol');
        return size;
      }
    case 'string':
      // Symbols are encoded with null terminator, but we strip the leading '`', so we add 0
      // Strings are encoded with attributes byte + size (char[])
      var isSymbol = value[0] === '`';
      return (isSymbol ? 0 : 5) + value.length;
    case 'date':
      // Stored as 64-bit days float
      return 8; 
    case 'symbol':
      // Assuming at this point we are not holding the leading '`', so we add 1 for the null termination
      return 1 + value.length;
  }
  throw "bad type " + type;
}

// Write a value to the buffer.
function writeByte(target, b) {
  target[target._writePosition++] = b;
}

// Write an array of values to the buffer.
function writeBytesToBuffer(target, bytes) {
  for (var i = 0; i < bytes; i++) target[target._writePosition++] = byteArray[i];
}

// Write the value we're serializing directly to the buffer.
function writeData(target, value, dataType) {
  var type = dataType ? dataType : toType(value);
  var i;
  switch (type) {
    case 'undefined':
    case 'null':
      {
        // Null type is 0x65
        writeByte(target, 101);
        writeByte(target, 0);
      }
      break;
    case 'boolean':
      {
        // Boolean type is 0xff (-1)
        writeByte(target, -1);
        writeByte(target, value ? 1 : 0);
      }
      break;
    case 'number':
      {
        // Number (double) is 0xf7
        // Numbers are always stored as doubles since Number is always an IEEE754 float
        writeByte(target, -9);
        floatArray[0] = value;
        writeBytesToBuffer(target, 8);
      }
      break;
    case 'date':
      {
        // Date type is 0xf1
        writeByte(target, -15);
        // Written as a float representing days; IEEE754 is precise enough to store this without any loss
        floatArray[0] = (value.getTime() / 86400000) - 10957;
        writeBytesToBuffer(target, 8);
      }
      break;
    case 'symbol':
      {
        // Symbol type is 0xf5
        writeByte(target, -11);
        for (i = 0; i < value.length; i++) writeByte(target, value[i].charCodeAt());
        // Symbols are null-terminated
        writeByte(target, 0);
      }
      break;
    case 'string':
      // Symbol
      if (value[0] == '`') {
        writeData(target, value.substr(1), 'symbol');
      } 
      // char[] type is 0x0a
      else {
        writeByte(target, 10);
        // No attributes
        writeByte(target, 0);
        // Write length as int
        intArray[0] = value.length;
        writeBytesToBuffer(target, 4);
        // Write bytes
        for (i = 0; i < value.length; i++) writeByte(target, value[i].charCodeAt());
      }
      break;
    case 'object':
      {
        // Dict type is 0x63
        writeByte(target, 99);
        // Write keys as symbols
        writeData(target, getKeys(value), 'symbols');
        // Write values according to their types
        writeData(target, getVals(value), null);
      }
      break;
    case 'array':
      {
        // General list type is 0x00
        writeByte(target, 0);
        // No attributes
        writeByte(target, 0);
        // Write length as int
        intArray[0] = value.length;
        writeBytesToBuffer(target, 4);
        // Write bytes
        for (i = 0; i < value.length; i++) writeData(target, value[i], null);
      }
      break;
    // Used for object keys
    case 'symbols':
      {
        // Write a list of symbols as a general list (0x00)
        writeByte(target, 0);
        // No attributes
        writeByte(target, 0);
        // Write int length
        intArray[0] = value.length;
        writeBytesToBuffer(target, 4);
        // Write each key as a symbol
        for (i = 0; i < value.length; i++) writeData(target, value[i], 'symbol');
      }
      break;
  }
}
