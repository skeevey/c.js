  // @flow
'use strict';
// Deserialize impl
const INT16_MAX = Math.pow(2, 15) - 1;
const INT16_MIN = -Math.pow(2, 15);
const UINT32_MAX = Math.pow(2, 32);
const INT32_MAX = Math.pow(2, 31) - 1;
const INT32_MIN = -Math.pow(2, 31);
const GUID_CHARS = "0123456789abcdef";
const MINUTES_IN_DAY = 60 * 24;
const SECONDS_IN_DAY = MINUTES_IN_DAY * 60;
const MS_IN_DAY = SECONDS_IN_DAY * 1000;

// Unix epoch is 1/1/1970, KDB's is 1/1/2000
const UNIX_KDB_EPOCH_DIFF = 10957;

// Types (http://code.kx.com/wiki/Reference/type)
const CHAR_ARRAY_TYPE = 10;
const FLIP_TYPE = 98; // Flip/Table
const DICT_TYPE = 99;
const LAMBDA_TYPE = 100;
const UNARY_PRIM_TYPE = 101;
// const BINARY_PRIM_TYPE = 102;
const PROJECTION_TYPE = 104;
const COMPOSITION_TYPE = 105;

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
  let bb = new Uint8Array(8);
  let state: State = {
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
  for (let i = 0; i < n; i++) state.bb[i] = state.ub[state.pos++];
}

function rUInt8(state: State): number {
  return state.ub[state.pos++];
}

function rGuid(state: State): string {
  let s = "";
  for (let i = 0; i < 16; i++) {
    let c = rUInt8(state);
    s += i == 4 || i == 6 || i == 8 || i == 10 ? "-" : "";
    s += GUID_CHARS[c >> 4];
    s += GUID_CHARS[c & 15];
  }
  return s;
}

function rInt16(state: State): number {
  rNUInt8(2, state);
  let h = state.hb[0];
  if (h === INT16_MIN) return NaN;
  if (h === INT16_MIN + 1) return -Infinity;
  if (h === INT16_MAX) return Infinity;
  return h;
}

function rInt32(state: State): number {
  rNUInt8(4, state);
  let i = state.ib[0];
  if (i === INT32_MIN) return NaN;
  if (i === INT32_MIN + 1) return -Infinity;
  if (i === INT32_MAX) return Infinity;
  return i;
}

function rInt64(state: State): number {
  rNUInt8(8, state);
  let x=state.ib[1],y=state.ib[0];
  if (x === INT32_MIN && y === 0) return NaN;
  if (x === INT32_MIN && y === 1) return -Infinity;
  if (x === INT32_MAX && y === -1) return Infinity;
  return x * UINT32_MAX + (y >= 0 ? y : UINT32_MAX + y);
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
  let c, s = "";
  for (;
    (c = rInt8(state)) !== 0; s += String.fromCharCode(c));
  return s;
}

// Note similarity to date(), but avoids unnecessary massive division by
// 86400000000000 which was causing rounding errors.
function rTimestamp(state: State): ?Date {
  let d = new Date((MS_IN_DAY * UNIX_KDB_EPOCH_DIFF) + (rInt64(state) / 1000000));
  if (d.toString() === "Invalid Date") return null;
  return d;
}

function rMonth(state: State): ?Date {
  let y = rInt32(state);
  let m = y % 12;
  y = 2000 + y / 12;
  let d = new Date(Date.UTC(y, m, 1));
  if (d.toString() === "Invalid Date") return null;
  return d;
}

function date(n: number): ?Date {
  let d = new Date(MS_IN_DAY * (UNIX_KDB_EPOCH_DIFF + n));
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
  return date(rInt32(state) / SECONDS_IN_DAY);
}

function rMinute(state: State): ?Date {
  return date(rInt32(state) / MINUTES_IN_DAY);
}

function rTime(state: State): ?Date {
  return date(rInt32(state) / MS_IN_DAY);
}

// This is the definition of KDB types 0 (well, not really) through -20
const fns = [r, rBool, rGuid, function(){}, rUInt8, rInt16, rInt32,
    rInt64, rFloat32, rFloat64, rChar, rSymbol, rTimestamp,
    rMonth, rDate, rDateTime, rTimespan, rMinute, rSecond, rTime];

function r(state: State): any {
  let i = 0,
    n, t = rInt8(state), x, y, o, j, len, A;
  if (t < 0 && t > -20){
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
    else if (t > COMPOSITION_TYPE) r(state);
    else {
      // Projection or composition
      for (n = rInt32(state); i < n; i++) r(state);
    }
    return "func";
  } else if (t === DICT_TYPE) {
    let isFlip = (state.ub[state.pos] == FLIP_TYPE);
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
    let s = "";
    n += state.pos;
    for (; state.pos < n; s += rChar(state));
    return s;
  }
  A = new Array(n);
  let f = fns[t];
  for (i = 0; i < n; i++) A[i] = f(state);
  return A;
}
