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
    if (h === -32768) return null;
    if (h === -32767) return -Infinity;
    if (h === 32767) return Infinity;
    return h;
  }

  function rInt32() {
    rNUInt8(4);
    var i = ib[0];
    if (i === -2147483648) return null;
    if (i === -2147483647) return -Infinity;
    if (i === 2147483647) return Infinity;
    return i;
  }

  function rInt64() {
    rNUInt8(8);
    var x=ib[1],y=ib[0];
    if (x === -2147483648 && y === 0) return null;
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
