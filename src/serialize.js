'use strict';

// Create a few views around 64 bits so we can easily slice & dice
// different data types and insert them byte by byte into the output array.

let byteArray = new Int8Array(8);
let intArray = new Int32Array(byteArray.buffer);
let floatArray = new Float64Array(byteArray.buffer);

/**
 * Serialize an value into KDB+'s internal IPC format.
 * See IPC reference at http://code.kx.com/wiki/Reference/ipcprotocol
 *
 * @param  {*} value      Any JS value, except a function.
 * @return {ArrayBuffer}  ArrayBuffer containing binary data for KDB+ consumption.
 */
module.exports = function serialize(value) {
  // Create an array for the outgoing data.
  // Message is always 4 bytes (preamble) + 4 bytes (size) + 1 byte (type) + data.
  //
  // Note we're just using a regular array and letting the runtime resize it as we use it.
  // This turns out to be faster than traversing through the data once to determine the size, then again
  // to fill it.
  let outArray = [];

  // Set writing position to 0
  outArray._writePosition = 0;

  writeByte(outArray, 1); // little endian (0x01)
  writeByte(outArray, 0); // async msg
  writeByte(outArray, 0); // 0x00 padding
  writeByte(outArray, 0); // 0x00 padding

  outArray._writePosition += 4; // skip size, we'll come back around

  // Write value to arraybuffer
  writeData(outArray, value, null);

  // Write data size as int32
  outArray._writePosition = 4;
  intArray[0] = outArray.length;
  writeBytesToBuffer(outArray, 4);

  if (process.browser) {
    return new Uint8Array(outArray); //return ArrayBuffer in browser
  } else {
    return new Buffer(outArray); // Create a Node Buffer from the array
  }
};

const writers = {
  'null': function(value, target) {
    // Null type is 0x65
    writeByte(target, 101);
    writeByte(target, 0);
  },
  'boolean': function(value, target) {
    // Boolean type is 0xff (-1)
    writeByte(target, -1);
    writeByte(target, value ? 1 : 0);
  },
  'number': function(value, target) {
    // Number (double) is 0xf7
    // Numbers are always stored as doubles since Number is always an IEEE754 float
    writeByte(target, -9);
    floatArray[0] = value;
    writeBytesToBuffer(target, 8);
  },
  'date': function(value, target) {
    // Date type is 0xf1
    writeByte(target, -15);
    // Written as a float representing days; IEEE754 is precise enough to store this without any loss
    floatArray[0] = (value.getTime() / 86400000) - 10957;
    writeBytesToBuffer(target, 8);
  },
  // case 'string': // intentional
  'symbol': function(value, target) {
    // Symbol type is 0xf5
    writeByte(target, -11);
    for (let i = 0, len = value.length; i < len; i++) writeByte(target, value.charCodeAt(i));
    // Symbols are null-terminated
    writeByte(target, 0);
  },
  // 'string': function(value, target) {
  //   // Symbol
  //   if (value[0] == '`') {
  //     writeData(target, value.substr(1), 'symbol');
  //   }
  //   // char[] type is 0x0a
  //   else {
  //     writeByte(target, 10);
  //     // No attributes
  //     writeByte(target, 0);
  //     // Write length as int
  //     intArray[0] = value.length;
  //     writeBytesToBuffer(target, 4);
  //     // Write bytes
  //     for (i = 0; i < value.length; i++) writeByte(target, value[i].charCodeAt());
  //   }
  // },
  'object': function(value, target) {
    // Dict type is 0x63
    writeByte(target, 99);
    // Write keys as symbols
    let [keys, vals] = getKeysAndVals(value);
    writeData(target, keys, 'symbols');
    // Write values according to their types
    writeData(target, vals, null);
  },
  'array': function(value, target) {
    // General list type is 0x00
    writeByte(target, 0);
    // No attributes
    writeByte(target, 0);
    // Write length as int
    intArray[0] = value.length;
    writeBytesToBuffer(target, 4);
    // Write bytes
    for (let i = 0, len = value.length; i < len; i++) writeData(target, value[i], null);
  },
  // Used for object keys
  'symbols': function(value, target) {
    // Write a list of symbols as a symbol list (0x0b)
    writeByte(target, 11);
    // No attributes
    writeByte(target, 0);
    // Write int length
    intArray[0] = value.length;
    writeBytesToBuffer(target, 4);
    // Write each key as a symbol
    for (let i = 0, valLen = value.length; i < valLen; i++) {
      let symbol = value[i];
      for (let j = 0, symLen = symbol.length; j < symLen; j++) writeByte(target, symbol.charCodeAt(j));
      // Symbols are null-terminated
      writeByte(target, 0);
    }
  }
};

// Aliasing
writers.undefined = writers.null;
writers.string = writers.symbol;

//
// Helpers
//

function toType(obj) {
  let jsType = typeof obj;
  if (jsType !== 'object' && jsType !== 'function') return jsType;
  if (!obj) return 'null';
  if (Array.isArray(obj)) return 'array';
  if (obj instanceof Date) return 'date';
  return 'object';
}

function getKeysAndVals(obj) {
  let keys = Object.keys(obj);
  let len = keys.length;
  let values = Array(len);
  for (let i = 0; i < len; i++) {
    values[i] = obj[keys[i]];
  }
  return [keys, values];
}

// Write a value to the buffer.
function writeByte(target, b) {
  target[target._writePosition++] = b;
}

// Write an array of values to the buffer.
function writeBytesToBuffer(target, bytes) {
  for (let i = 0; i < bytes; i++) writeByte(target, byteArray[i]);
}

// Write the value we're serializing directly to the buffer.
function writeData(target, value, dataType) {
  let type = dataType || toType(value);
  if (!writers[type]) throw new Error("Unknown data type:" + dataType);
  return writers[type](value, target);
}
