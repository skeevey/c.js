!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.c=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';
module.exports = {
  serialize: _dereq_('./lib/serialize'),
  deserialize: _dereq_('./lib/deserialize'),
  ab2ipcstr: function(buffer) {
    var str = "";
    var bufferView = new Uint8Array(buffer);
    for(var i = 0; i < bufferView.byteLength; i++){
      str += (bufferView[i]+0x100).toString(16).slice(-2);
    }
    return str;
  },
  ipcstr2ab: function(str) {
    var buffer = new ArrayBuffer(str.length/2);
    var bufferView = new Uint8Array(buffer);
    for(var i = 0; i < buffer.byteLength; i++){
      bufferView[i] = parseInt("0x"+str.substr(2*i,2));
    }
    return buffer;
  }
};

},{"./lib/deserialize":2,"./lib/serialize":3}],2:[function(_dereq_,module,exports){
'use strict';
// Deserialize impl
module.exports = function deserialize(x) {
  var a = x[0],
    pos = 8,
    j2p32 = Math.pow(2, 32),
    ub = new Uint8Array(x),
    sb = new Int8Array(x),
    bb = new Uint8Array(8),
    hb = new Int16Array(bb.buffer),
    ib = new Int32Array(bb.buffer),
    eb = new Float32Array(bb.buffer),
    fb = new Float64Array(bb.buffer);

  function rBool() {
    return rInt8() == 1;
  }

  function rChar() {
    return String.fromCharCode(rInt8());
  }

  function rInt8() {
    return sb[pos++];
  }

  function rNUInt8(n) {
    for (var i = 0; i < n; i++) bb[i] = ub[pos++];
  }

  function rUInt8() {
    return ub[pos++];
  }

  function rGuid() {
    var x = "0123456789abcdef",
      s = "";
    for (var i = 0; i < 16; i++) {
      var c = rUInt8();
      s += i == 4 || i == 6 || i == 8 || i == 10 ? "-" : "";
      s += x[c >> 4];
      s += x[c & 15];
    }
    return s;
  }

  function rInt16() {
    rNUInt8(2);
    var h = hb[0];
    if (h === -32768) return NaN;
    if (h === -32767) return -Infinity;
    if (h === 32767) return Infinity;
    return h;
  }

  function rInt32() {
    rNUInt8(4);
    var i = ib[0];
    if (i === -2147483648) return NaN;
    if (i === -2147483647) return -Infinity;
    if (i === 2147483647) return Infinity;
    return i;
  }

  function rInt64() {
    rNUInt8(8);
    var x=ib[1],y=ib[0];
    if (x === -2147483648 && y === 0) return NaN;
    if (x === -2147483648 && y === 1) return -Infinity;
    if (x === 2147483647 && y === -1) return Infinity;
    return x * j2p32 + (y >= 0 ? y : j2p32 + y);
  } // closest number to 64 bit int...

  function rFloat32() {
    rNUInt8(4);
    return eb[0];
  }

  function rFloat64() {
    rNUInt8(8);
    return fb[0];
  }

  function rSymbol() {
    var i = pos,
      c, s = "";
    for (;
      (c = rInt8()) !== 0; s += String.fromCharCode(c));
    return s;
  }

  function rTimestamp() {
    return date(rInt64() / 86400000000000);
  }

  function rMonth() {
    var y = rInt32();
    var m = y % 12;
    y = 2000 + y / 12;
    return new Date(Date.UTC(y, m, 1));
  }

  function date(n) {
    return new Date(86400000 * (10957 + n));
  }

  function rDate() {
    return date(rInt32());
  }

  function rDateTime() {
    return date(rFloat64());
  }

  function rTimespan() {
    return date(rInt64() / 86400000000000);
  }

  function rSecond() {
    return date(rInt32() / 86400);
  }

  function rMinute() {
    return date(rInt32() / 1440);
  }

  function rTime() {
    return date(rInt32() / 86400000);
  }

  function r() {
    var fns = [r, rBool, rGuid, null, rUInt8, rInt16, rInt32, 
        rInt64, rFloat32, rFloat64, rChar, rSymbol, rTimestamp, 
        rMonth, rDate, rDateTime, rTimespan, rMinute, rSecond, rTime];
    var i = 0,
      n, t = rInt8(), x, y, o, j, A;
    if (t < 0 && t > -20) return fns[-t]();
    if (t > 99) {
      if (t == 100) {
        rSymbol();
        return r();
      }
      if (t < 104) return rInt8() === 0 && t == 101 ? null : "func";
      if (t > 105) r();
      else
        for (n = rInt32(); i < n; i++) r();
      return "func";
    }
    if (99 == t) {
      var flip = 98 == ub[pos];
      x = r();
      y = r();
      if (!flip) {
        o = {};
        for (i = 0; i < x.length; i++)
          o[x[i]] = y[i];
      } else
        o = new Array(2), o[0] = x, o[1] = y;
      return o;
    }
    pos++;
    if (98 == t) {
      //    return r(); // better as array of dicts?
      rInt8(); // check type is 99 here
      // read the arrays and then flip them into an array of dicts
      x = r();
      y = r();
      A = new Array(y[0].length);
      for (j = 0; j < y[0].length; j++) {
        o = {};
        for (i = 0; i < x.length; i++)
          o[x[i]] = y[i][j];
        A[j] = o;
      }
      return A;
    }
    n = rInt32();
    if (10 == t) {
      var s = "";
      n += pos;
      for (; pos < n; s += rChar());
      return s;
    }
    A = new Array(n);
    var f = fns[t];
    for (i = 0; i < n; i++) A[i] = f();
    return A;
  }
  return r();
};

},{}],3:[function(_dereq_,module,exports){
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

},{}]},{},[1])
(1)
});