(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["c"] = factory();
	else
		root["c"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	module.exports = {
	  serialize: __webpack_require__(1),
	  deserialize: __webpack_require__(3),
	  ab2ipcstr: function (buffer) {
	    var str = "";
	    var bufferView = new Uint8Array(buffer);
	    for (var i = 0; i < bufferView.byteLength; i++) {
	      str += (bufferView[i] + 0x100).toString(16).slice(-2);
	    }
	    return str;
	  },
	  ipcstr2ab: function (str) {
	    var buffer = new ArrayBuffer(str.length / 2);
	    var bufferView = new Uint8Array(buffer);
	    for (var i = 0; i < buffer.byteLength; i++) {
	      bufferView[i] = parseInt("0x" + str.substr(2 * i, 2));
	    }
	    return buffer;
	  }
	};

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process, Buffer) {'use strict';
	
	// Create a few views around 64 bits so we can easily slice & dice
	// different data types and insert them byte by byte into the output array.
	
	var _slicedToArray = (function () {
	  function sliceIterator(arr, i) {
	    var _arr = [];var _n = true;var _d = false;var _e = undefined;try {
	      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
	        _arr.push(_s.value);if (i && _arr.length === i) break;
	      }
	    } catch (err) {
	      _d = true;_e = err;
	    } finally {
	      try {
	        if (!_n && _i["return"]) _i["return"]();
	      } finally {
	        if (_d) throw _e;
	      }
	    }return _arr;
	  }return function (arr, i) {
	    if (Array.isArray(arr)) {
	      return arr;
	    } else if (Symbol.iterator in Object(arr)) {
	      return sliceIterator(arr, i);
	    } else {
	      throw new TypeError("Invalid attempt to destructure non-iterable instance");
	    }
	  };
	})();
	
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
	      writeByte(target, value.charCodeAt(i));
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
	        writeByte(target, symbol.charCodeAt(j));
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
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(2), __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"/Users/samuelreed/git/BitMEX/c.js/node_modules/webpack/node_modules/node-libs-browser/node_modules/buffer/index.js\""); e.code = 'MODULE_NOT_FOUND'; throw e; }())).Buffer))

/***/ },
/* 2 */
/***/ function(module, exports) {

	// shim for using process in browser
	
	var process = module.exports = {};
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;
	
	function cleanUpNextTick() {
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}
	
	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = setTimeout(cleanUpNextTick);
	    draining = true;
	
	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    clearTimeout(timeout);
	}
	
	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        setTimeout(drainQueue, 0);
	    }
	};
	
	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};
	
	function noop() {}
	
	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;
	
	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};
	
	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ },
/* 3 */
/***/ function(module, exports) {

	
	'use strict';
	// Deserialize impl
	
	var INT16_MAX = Math.pow(2, 15) - 1;
	var INT16_MIN = -Math.pow(2, 15);
	var UINT32_MAX = Math.pow(2, 32);
	var INT32_MAX = Math.pow(2, 31) - 1;
	var INT32_MIN = -Math.pow(2, 31);
	var GUID_CHARS = "0123456789abcdef";
	var MINUTES_IN_DAY = 60 * 24;
	var SECONDS_IN_DAY = MINUTES_IN_DAY * 60;
	var MS_IN_DAY = SECONDS_IN_DAY * 1000;
	
	// Unix epoch is 1/1/1970, KDB's is 1/1/2000
	var UNIX_KDB_EPOCH_DIFF = 10957;
	
	// Types (http://code.kx.com/wiki/Reference/type)
	var CHAR_ARRAY_TYPE = 10;
	var FLIP_TYPE = 98; // Flip/Table
	var DICT_TYPE = 99;
	var LAMBDA_TYPE = 100;
	var UNARY_PRIM_TYPE = 101;
	// const BINARY_PRIM_TYPE = 102;
	var PROJECTION_TYPE = 104;
	var COMPOSITION_TYPE = 105;
	
	module.exports = function deserialize(x) {
	  var bb = new Uint8Array(8);
	  var state = {
	    a: x[0], // endianness - so far, no support for big-endian
	    pos: 8,
	    ub: new Uint8Array(x),
	    sb: new Int8Array(x),
	    bb: bb,
	    hb: new Int16Array(bb.buffer),
	    ib: new Int32Array(bb.buffer),
	    eb: new Float32Array(bb.buffer),
	    fb: new Float64Array(bb.buffer)
	  };
	  return r(state);
	};
	
	function rBool(state) {
	  return rInt8(state) == 1;
	}
	
	function rChar(state) {
	  return String.fromCharCode(rInt8(state));
	}
	
	function rInt8(state) {
	  return state.sb[state.pos++];
	}
	
	function rNUInt8(n, state) {
	  for (var i = 0; i < n; i++) {
	    state.bb[i] = state.ub[state.pos++];
	  }
	}
	
	function rUInt8(state) {
	  return state.ub[state.pos++];
	}
	
	function rGuid(state) {
	  var s = "";
	  for (var i = 0; i < 16; i++) {
	    var c = rUInt8(state);
	    s += i == 4 || i == 6 || i == 8 || i == 10 ? "-" : "";
	    s += GUID_CHARS[c >> 4];
	    s += GUID_CHARS[c & 15];
	  }
	  return s;
	}
	
	function rInt16(state) {
	  rNUInt8(2, state);
	  var h = state.hb[0];
	  if (h === INT16_MIN) return NaN;
	  if (h === INT16_MIN + 1) return -Infinity;
	  if (h === INT16_MAX) return Infinity;
	  return h;
	}
	
	function rInt32(state) {
	  rNUInt8(4, state);
	  var i = state.ib[0];
	  if (i === INT32_MIN) return NaN;
	  if (i === INT32_MIN + 1) return -Infinity;
	  if (i === INT32_MAX) return Infinity;
	  return i;
	}
	
	function rInt64(state) {
	  rNUInt8(8, state);
	  var x = state.ib[1],
	      y = state.ib[0];
	  if (x === INT32_MIN && y === 0) return NaN;
	  if (x === INT32_MIN && y === 1) return -Infinity;
	  if (x === INT32_MAX && y === -1) return Infinity;
	  return x * UINT32_MAX + (y >= 0 ? y : UINT32_MAX + y);
	} // closest number to 64 bit int...
	
	function rFloat32(state) {
	  rNUInt8(4, state);
	  return state.eb[0];
	}
	
	function rFloat64(state) {
	  rNUInt8(8, state);
	  return state.fb[0];
	}
	
	function rSymbol(state) {
	  var c = undefined,
	      s = "";
	  for (; (c = rInt8(state)) !== 0; s += String.fromCharCode(c)) {}
	  return s;
	}
	
	// Note similarity to date(), but avoids unnecessary massive division by
	// 86400000000000 which was causing rounding errors.
	function rTimestamp(state) {
	  var d = new Date(MS_IN_DAY * UNIX_KDB_EPOCH_DIFF + rInt64(state) / 1000000);
	  if (d.toString() === "Invalid Date") return null;
	  return d;
	}
	
	function rMonth(state) {
	  var y = rInt32(state);
	  var m = y % 12;
	  y = 2000 + y / 12;
	  var d = new Date(Date.UTC(y, m, 1));
	  if (d.toString() === "Invalid Date") return null;
	  return d;
	}
	
	function date(n) {
	  var d = new Date(MS_IN_DAY * (UNIX_KDB_EPOCH_DIFF + n));
	  if (d.toString() === "Invalid Date") return null;
	  return d;
	}
	
	function rDate(state) {
	  return date(rInt32(state));
	}
	
	function rDateTime(state) {
	  return date(rFloat64(state));
	}
	
	function rTimespan(state) {
	  return rTimestamp(state);
	}
	
	function rSecond(state) {
	  return date(rInt32(state) / SECONDS_IN_DAY);
	}
	
	function rMinute(state) {
	  return date(rInt32(state) / MINUTES_IN_DAY);
	}
	
	function rTime(state) {
	  return date(rInt32(state) / MS_IN_DAY);
	}
	
	// This is the definition of KDB types 0 (well, not really) through -20
	var fns = [r, rBool, rGuid, function () {}, rUInt8, rInt16, rInt32, rInt64, rFloat32, rFloat64, rChar, rSymbol, rTimestamp, rMonth, rDate, rDateTime, rTimespan, rMinute, rSecond, rTime];
	
	function r(state) {
	  var i = 0,
	      n = undefined,
	      t = rInt8(state),
	      x = undefined,
	      y = undefined,
	      o = undefined,
	      j = undefined,
	      len = undefined,
	      A = undefined;
	  if (t < 0 && t > -20) {
	    return fns[-t](state);
	  } else if (t > DICT_TYPE) {
	    // This shouldn't ever get sent down the pipe to a JS client/server,
	    // rather only between KDB instances.
	    if (t == LAMBDA_TYPE) {
	      rSymbol(state);
	      return r(state);
	    }
	    // This is Unary or Binary prims, or a Ternary expression
	    else if (t < PROJECTION_TYPE) return rInt8(state) === 0 && t == UNARY_PRIM_TYPE ? null : "func";
	      // This is f', f/, f\, f', f/:, f\:, and dynamic load
	      else if (t > COMPOSITION_TYPE) r(state);else {
	          // Projection or composition
	          for (n = rInt32(state); i < n; i++) {
	            r(state);
	          }
	        }
	    return "func";
	  } else if (t === DICT_TYPE) {
	    var isFlip = state.ub[state.pos] == FLIP_TYPE;
	    x = r(state);
	    y = r(state);
	    if (!isFlip) {
	      // Dict
	      o = {};
	      for (i = 0, len = x.length; i < len; i++) {
	        o[x[i]] = y[i];
	      }
	    } else {
	      // Flip (http://code.kx.com/wiki/Reference/flip)
	      o = [x, y];
	    }
	    return o;
	  }
	  state.pos++;
	  if (t === FLIP_TYPE) {
	    //    return r(); // better as array of dicts?
	    rInt8(state); // check type is 99 here
	    // read the arrays and then flip them into an array of dicts
	    x = r(state);
	    y = r(state);
	    A = new Array(y[0].length);
	    for (j = 0, len = A.length; j < len; j++) {
	      o = {};
	      for (i = 0; i < x.length; i++) {
	        o[x[i]] = y[i][j];
	      }
	      A[j] = o;
	    }
	    return A;
	  }
	  n = rInt32(state);
	  if (t === CHAR_ARRAY_TYPE) {
	    var s = "";
	    n += state.pos;
	    for (; state.pos < n; s += rChar(state)) {}
	    return s;
	  }
	  A = new Array(n);
	  var f = fns[t];
	  for (i = 0; i < n; i++) {
	    A[i] = f(state);
	  }return A;
	}

/***/ }
/******/ ])
});
;
//# sourceMappingURL=c.js.map