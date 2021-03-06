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
  sb: Int8Array
};
const bb = new Uint8Array(8);
const hb = new Int16Array(bb.buffer);
const ib = new Int32Array(bb.buffer);
const eb = new Float32Array(bb.buffer);
const fb = new Float64Array(bb.buffer);

// This can also take a Buffer or TypedArray, but Flow chokes on it
module.exports = function deserialize(x: Array<number>): Object {
  const ub = new Uint8Array(x);
  const state: State = {
    a: x[0], // endianness - so far, no support for big-endian
    pos: 8,
    ub: ub,
    sb: new Int8Array(ub.buffer)
  };
  return r(state);
};

function rBool(state: State): boolean {
  return rInt8(state) == 1;
}

function rChar(state): string {
  return String.fromCharCode(rInt8(state));
}

function rInt8(state: State): number {
  return state.sb[state.pos++];
}

function rNUInt8(n: number, state: State): void {
  for (let i = 0; i < n; i++) bb[i] = state.ub[state.pos++];
}

function rUInt8(state: State): number {
  return state.ub[state.pos++];
}

function rGuid(state: State): string {
  let s = "";
  for (let i = 0; i < 16; i++) {
    const c = rUInt8(state);
    s += i == 4 || i == 6 || i == 8 || i == 10 ? "-" : "";
    s += GUID_CHARS[c >> 4];
    s += GUID_CHARS[c & 15];
  }
  return s;
}

function rInt16(state: State): number {
  rNUInt8(2, state);
  const h = hb[0];
  if (h === INT16_MIN) return NaN;
  if (h === INT16_MIN + 1) return -Infinity;
  if (h === INT16_MAX) return Infinity;
  return h;
}

function rInt32(state: State): number {
  rNUInt8(4, state);
  const i = ib[0];
  if (i === INT32_MIN) return NaN;
  if (i === INT32_MIN + 1) return -Infinity;
  if (i === INT32_MAX) return Infinity;
  return i;
}

function rInt64(state: State): number {
  rNUInt8(8, state);
  const [y, x] = ib;
  if (x === INT32_MIN && y === 0) return NaN;
  if (x === INT32_MIN && y === 1) return -Infinity;
  if (x === INT32_MAX && y === -1) return Infinity;
  return x * UINT32_MAX + (y >= 0 ? y : UINT32_MAX + y);
} // closest number to 64 bit int...

function rFloat32(state: State): number {
  rNUInt8(4, state);
  return eb[0];
}

function rFloat64(state: State): number {
  rNUInt8(8, state);
  return fb[0];
}

function rSymbol(state: State): string {
  let c, s = "";
  while ((c = rInt8(state)) !== 0) s += String.fromCharCode(c);
  return s;
}

// Note similarity to date(), but avoids unnecessary massive division by
// 86400000000000 which was causing rounding errors.
function rTimestamp(state: State): ?Date {
  const d = new Date((MS_IN_DAY * UNIX_KDB_EPOCH_DIFF) + (rInt64(state) / 1000000));
  if (d.toString() === "Invalid Date") return null;
  return d;
}

function rMonth(state: State): ?Date {
  let y = rInt32(state);
  const m = y % 12;
  y = 2000 + y / 12;
  const d = new Date(Date.UTC(y, m, 1));
  if (d.toString() === "Invalid Date") return null;
  return d;
}

function date(n: number): ?Date {
  const d = new Date(MS_IN_DAY * (UNIX_KDB_EPOCH_DIFF + n));
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
  const t = rInt8(state);

  if (t < 0 && t > -20){
    // Primitive types, as above.
    return fns[-t](state);
  } else if (t > DICT_TYPE) {
    return over_dict_type(state, t);
  } else if (t === DICT_TYPE) {
    return dict_type(state);
  }
  state.pos++;
  if (t === FLIP_TYPE) {
    return flip_type(state);
  }

  // Arrays
  return array_type(state, t);
}

function over_dict_type(state, t) {
  // This shouldn't ever get sent down the pipe to a JS client/server,
  // rather only between KDB instances.
  if (t === LAMBDA_TYPE) {
    rSymbol(state);
    return r(state);
  }
  // This is Unary or Binary prims, or a Ternary expression
  else if (t < PROJECTION_TYPE) return rInt8(state) === 0 && t == UNARY_PRIM_TYPE ? null : "func";
  // This is f', f/, f\, f', f/:, f\:, and dynamic load
  else if (t > COMPOSITION_TYPE) r(state);
  else {
    // Projection or composition
    for (var n = rInt32(state), i = 0; i < n; i++) r(state);
  }
  return "func";
}

function dict_type(state) {
  const isFlip = (state.ub[state.pos] == FLIP_TYPE);
  // Dicts are represented as two lists, one of keys, one of values.
  // We deserialize each of these lists then construct a JS object.
  const x = r(state);
  const y = r(state);
  let o;
  if (!isFlip) {
    // Dict
    o = {};
    for (let i = 0, len = x.length; i < len; i++) {
      o[x[i]] = y[i];
    }
  } else {
    // Flip (http://code.kx.com/wiki/Reference/flip)
    o = [x, y];
  }
  return o;
}

function flip_type(state) {
  //    return r(); // better as array of dicts?
  rInt8(state); // check type is 99 here
  // read the arrays and then flip them into an array of dicts
  const x = r(state);
  const y = r(state);
  const A = new Array(y[0].length);
  for (let j = 0, len = A.length; j < len; j++) {
    const o = {};
    for (let i = 0; i < x.length; i++) {
      o[x[i]] = y[i][j];
    }
    A[j] = o;
  }
  return A;
}

function array_type(state, t) {
  let n = rInt32(state);
  // Character array
  if (t === CHAR_ARRAY_TYPE) {
    let s = "";
    n += state.pos;
    while(state.pos < n) s += rChar(state);
    return s;
  }
  // Other type of array
  const A = new Array(n);
  const f = fns[t];
  for (let i = 0; i < n; i++) A[i] = f(state);
  return A;
}
