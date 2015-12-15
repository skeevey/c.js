// @flow
'use strict';
// Deserialize impl
var j2p32 = Math.pow(2, 32);
type State = {
  a: number,
  pos: number,
  ub: Uint8Array,
  sb: Int8Array,
  bb: Uint8Array,
  hb: Int16Array,
  ib: Int32Array,
  eb: Float32Array,
  fb: Float64Array
};

module.exports = function deserialize(x: Array<number>): Object {
  var bb = new Uint8Array(8);
  var state: State = {
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

function rBool(state: State): boolean {
  return rInt8(state) == 1;
}

function rChar(state) {
  return String.fromCharCode(rInt8(state));
}

function rInt8(state: State): number {
  return state.sb[state.pos++];
}

function rNUInt8(n: number, state: State): void {
  for (var i = 0; i < n; i++) state.bb[i] = state.ub[state.pos++];
}

function rUInt8(state: State): number {
  return state.ub[state.pos++];
}

function rGuid(state: State): string {
  var x = "0123456789abcdef",
    s = "";
  for (var i = 0; i < 16; i++) {
    var c = rUInt8(state);
    s += i == 4 || i == 6 || i == 8 || i == 10 ? "-" : "";
    s += x[c >> 4];
    s += x[c & 15];
  }
  return s;
}

function rInt16(state: State): number {
  rNUInt8(2, state);
  var h = state.hb[0];
  if (h === -32768) return NaN;
  if (h === -32767) return -Infinity;
  if (h === 32767) return Infinity;
  return h;
}

function rInt32(state: State): number {
  rNUInt8(4, state);
  var i = state.ib[0];
  if (i === -2147483648) return NaN;
  if (i === -2147483647) return -Infinity;
  if (i === 2147483647) return Infinity;
  return i;
}

function rInt64(state: State): number {
  rNUInt8(8, state);
  var x=state.ib[1],y=state.ib[0];
  if (x === -2147483648 && y === 0) return NaN;
  if (x === -2147483648 && y === 1) return -Infinity;
  if (x === 2147483647 && y === -1) return Infinity;
  return x * j2p32 + (y >= 0 ? y : j2p32 + y);
} // closest number to 64 bit int...

function rFloat32(state: State): number {
  rNUInt8(4, state);
  return state.eb[0];
}

function rFloat64(state: State): number {
  rNUInt8(8, state);
  return state.fb[0];
}

function rSymbol(state: State): string {
  var c, s = "";
  for (;
    (c = rInt8(state)) !== 0; s += String.fromCharCode(c));
  return s;
}

// Note similarity to date(), but avoids unnecessary massive division by
// 86400000000000 which was causing rounding errors.
function rTimestamp(state: State): ?Date {
  var d = new Date((86400000 * 10957) + (rInt64(state) / 1000000));
  if (d.toString() === "Invalid Date") return null;
  return d;
}

function rMonth(state: State): ?Date {
  var y = rInt32(state);
  var m = y % 12;
  y = 2000 + y / 12;
  var d = new Date(Date.UTC(y, m, 1));
  if (d.toString() === "Invalid Date") return null;
  return d;
}

function date(n: number): ?Date {
  var d = new Date(86400000 * (10957 + n));
  if (d.toString() === "Invalid Date") return null;
  return d;
}

function rDate(state: State): ?Date {
  return date(rInt32(state));
}

function rDateTime(state: State): ?Date {
  return date(rFloat64(state));
}

function rTimespan(state: State): ?Date {
  return rTimestamp(state);
}

function rSecond(state: State): ?Date {
  return date(rInt32(state) / 86400);
}

function rMinute(state: State): ?Date {
  return date(rInt32(state) / 1440);
}

function rTime(state: State): ?Date {
  return date(rInt32(state) / 86400000);
}

var fns = [r, rBool, rGuid, function(){}, rUInt8, rInt16, rInt32,
    rInt64, rFloat32, rFloat64, rChar, rSymbol, rTimestamp,
    rMonth, rDate, rDateTime, rTimespan, rMinute, rSecond, rTime];

function r(state: State): Array {
  var i = 0,
    n, t = rInt8(state), x, y, o, j, len, A;
  if (t < 0 && t > -20){
    return fns[-t](state);
  } else if (t > 99) {
    if (t == 100) {
      rSymbol(state);
      return r(state);
    }
    if (t < 104) return rInt8(state) === 0 && t == 101 ? null : "func";
    if (t > 105) r(state);
    else {
      for (n = rInt32(state); i < n; i++) r(state);
    }
    return "func";
  } else if (t === 99) {
    var flip = 98 == state.ub[state.pos];
    x = r(state);
    y = r(state);
    if (!flip) {
      o = {};
      for (i = 0, len = x.length; i < len; i++) {
        o[x[i]] = y[i];
      }
    } else {
      o = [x, y];
    }
    return o;
  }
  state.pos++;
  if (t === 98) {
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
  if (t === 10) {
    var s = "";
    n += state.pos;
    for (; state.pos < n; s += rChar(state));
    return s;
  }
  A = new Array(n);
  var f = fns[t];
  for (i = 0; i < n; i++) A[i] = f(state);
  return A;
}
