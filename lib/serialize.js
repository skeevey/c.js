'use strict';

// Create a few views around 64 bits so we can easily slice & dice
// different data types and insert them byte by byte into the output array.

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var byteArray = new Int8Array(8);
var intArray = new Int32Array(byteArray.buffer);
var floatArray = new Float64Array(byteArray.buffer);

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
  var outArray = [];

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
    return new Uint8Array.from(outArray); //return ArrayBuffer in browser
  } else {
      return new Buffer(outArray); // Create a Node Buffer from the array
    }
};

var writers = {
  'null': function (value, target) {
    // Null type is 0x65
    writeByte(target, 101);
    writeByte(target, 0);
  },
  'boolean': function (value, target) {
    // Boolean type is 0xff (-1)
    writeByte(target, -1);
    writeByte(target, value ? 1 : 0);
  },
  'number': function (value, target) {
    // Number (double) is 0xf7
    // Numbers are always stored as doubles since Number is always an IEEE754 float
    writeByte(target, -9);
    floatArray[0] = value;
    writeBytesToBuffer(target, 8);
  },
  'date': function (value, target) {
    // Date type is 0xf1
    writeByte(target, -15);
    // Written as a float representing days; IEEE754 is precise enough to store this without any loss
    floatArray[0] = value.getTime() / 86400000 - 10957;
    writeBytesToBuffer(target, 8);
  },
  // case 'string': // intentional
  'symbol': function (value, target) {
    // Symbol type is 0xf5
    writeByte(target, -11);
    for (var i = 0, len = value.length; i < len; i++) {
      writeByte(target, value[i].charCodeAt());
    } // Symbols are null-terminated
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
  'object': function (value, target) {
    // Dict type is 0x63
    writeByte(target, 99);
    // Write keys as symbols

    var _getKeysAndVals = getKeysAndVals(value);

    var _getKeysAndVals2 = _slicedToArray(_getKeysAndVals, 2);

    var keys = _getKeysAndVals2[0];
    var vals = _getKeysAndVals2[1];

    writeData(target, keys, 'symbols');
    // Write values according to their types
    writeData(target, vals, null);
  },
  'array': function (value, target) {
    // General list type is 0x00
    writeByte(target, 0);
    // No attributes
    writeByte(target, 0);
    // Write length as int
    intArray[0] = value.length;
    writeBytesToBuffer(target, 4);
    // Write bytes
    for (var i = 0; i < value.length; i++) {
      writeData(target, value[i], null);
    }
  },
  // Used for object keys
  'symbols': function (value, target) {
    // Write a list of symbols as a symbol list (0x0b)
    writeByte(target, 11);
    // No attributes
    writeByte(target, 0);
    // Write int length
    intArray[0] = value.length;
    writeBytesToBuffer(target, 4);
    // Write each key as a symbol
    for (var i = 0, valLen = value.length; i < valLen; i++) {
      var symbol = value[i];
      for (var j = 0, symLen = symbol.length; j < symLen; j++) {
        writeByte(target, symbol[j].charCodeAt());
      } // Symbols are null-terminated
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
  var jsType = typeof obj;
  if (jsType !== 'object' && jsType !== 'function') return jsType;
  if (!obj) return 'null';
  if (Array.isArray(obj)) return 'array';
  if (obj instanceof Date) return 'date';
  return 'object';
}

function getKeysAndVals(obj) {
  var keys = Object.keys(obj);
  var len = keys.length;
  var values = Array(len);
  for (var i = 0; i < len; i++) {
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
  for (var i = 0; i < bytes; i++) {
    target[target._writePosition++] = byteArray[i];
  }
}

// Write the value we're serializing directly to the buffer.
function writeData(target, value, dataType) {
  var type = dataType || toType(value);
  if (!writers[type]) throw new Error("Unknown data type:" + dataType);
  return writers[type](value, target);
}