'use strict';
var expect = require('chai').expect;
var c = require('../../index');

/*global describe:true, it:true, afterEach:true */
describe("Datatype Tests", function() {
  var data;
  afterEach(function() {
    expect(conv(data)).to.eql(data);
  });
  it("Properly Converts True", function() {
    data = true;
  });
  it("Properly Converts False", function() {
    data = false;
  });
  it("Properly Converts Strings", function() {
    data = "test string 123";
  });
  it("Properly Converts Ints", function() {
    data = 1234;
  });
  it("Properly Converts Large Ints", function() {
    data = 9007199254740992;
  });
  it("Properly Converts Floats", function() {
    data = 1234.125;
  });
  it("Properly Converts Floats that may show error", function() {
    data = 668.9299999999999;
  });
  it("Properly Converts null", function() {
    data = null;
  });
  it("Properly Converts the Empty String", function() {
    data = '';
  });
  it("Properly Converts 0", function() {
    data = 0;
  });
  it("Properly Converts Dates", function() {
    data = new Date("Tue Apr 22 2014 12:34:56 GMT+0800 (HKT)");
  });
  it("Properly Converts Arrays", function() {
    data = [1, 2, "foo", "bar", new Date("Tue Apr 22 2014 12:34:56 GMT+0800 (HKT)")];
  });
  it("Properly Converts Complex Objects", function() {
    data = [{
      options: {
        globals: ['should'],
        timeout: 3000,
        ignoreLeaks: false,
        grep: '*-test',
        ui: 'bdd',
        reporter: 'tap',
        date: new Date("2014-01-01"),
        nested: {
          prettyNested: {
            wow: ['such', 'doge']
          }
        }
      }
    }, {
      nested: {
        prettyNested: {
          wow: ['such', 'doge']
        }
      }
    }];
  });
});

describe("Edge-case datatype tests", function() {
  it("Handles -0", function() {
    expect(conv(-0)).to.equal(0);
  });
});

describe("Former bugs", function() {
  // Undefined -> null as there is no undefined type in kdb, sanely
  it("Properly Converts undefined to null", function() {
    expect(conv(undefined)).to.eql(null);
  });

  it("Handles long null (0Nj)", function() {
    var str = "";
    str += "01000000"; // --preamble--
    str += "11000000"; // msg length (17)
    str += "f9"; // type, (-7, 64-bit Long)
    str += "0000000000000080"; // Long.MIN_VALUE
    expect(str.length).to.equal(34);
    var longNull = c.ipcstr2ab(str);
    expect(c.deserialize(longNull)).to.eql(NaN);
  });

  it("Handles int null (0Ni)", function() {
    var str = "";
    str += "01000000"; // --preamble--
    str += "0c000000"; // msg length (13)
    str += "fa"; // type, (-6, 32-bit Int)
    str += "00000080"; // Integer.MIN_VALUE
    expect(str.length).to.equal(26);
    var intNull = c.ipcstr2ab(str);
    expect(c.deserialize(intNull)).to.eql(NaN);
  });

  it("Handles short null (0Nh)", function() {
    var str = "";
    str += "01000000"; // --preamble--
    str += "0c000000"; // msg length (11)
    str += "fb"; // type, (-5, 16-bit Short)
    str += "0080"; // Short.MIN_VALUE
    expect(str.length).to.equal(22);
    var shortNull = c.ipcstr2ab(str);
    expect(c.deserialize(shortNull)).to.eql(NaN);
  });

  it("Doesn't round timestamps", function() {
    var str = "";
    str += "01000000"; // --preamble--
    str += "11000000"; // msg length (17)
    str += "f4"; // type, (-12, 64-bit Timestamp)
    str += "0018f4545e27e506"; //  "2015-09-29T12:57:00.000Z"
    expect(str.length).to.equal(34);
    var timestamp = c.ipcstr2ab(str);
    expect(c.deserialize(timestamp).toISOString()).to.eql("2015-09-29T12:57:00.000Z");
  });

  it("Handles flips (-> Array<object>)", function() {
    var str = "";
    str += '01000000'; // --preamble--
    str += '2f000000'; // msg length (47)
    str += '62'      ; // type 98 (flip/table)
    str += '00'      ; // --attributes--
    str += '63'      ; // type 99 (dict)
    str += '0b'      ; // type 11 (symbol vector)
    str += '00'      ; // --attributes--
    str += '02000000'; // vector len (2)
    str += '6100'    ; // null terminated symbol (`a)
    str += '6200'    ; // null terminated symbol (`b)
    str += '00'      ; // type 0 (list)
    str += '00'      ; // --attributes--
    str += '02000000'; // list len (2)
    str += '06'      ; // type 6 (int vector)
    str += '00'      ; // --attributes--
    str += '01000000'; // vector len (1)
    str += '02000000'; // 1st element, which is 2
    str += '06'      ; // type 6 (int vector)
    str += '00'      ; // --attributes--
    str += '01000000'; // vector len (1)
    str += '03000000'; // 1st element, which is 3
    expect(str.length).to.equal(94);
    var flip = c.ipcstr2ab(str);
    expect(c.deserialize(flip)).to.eql([{a: 2, b: 3}]);
  });
});

describe("New behavior", function() {
  it("Serializes strings into symbols", function() {
    var shouldBeSymbol = c.serialize("foo");
    var expected = "";
    // Bad: (char[])
    //          '01000000
    //           11000000 // len 17
    //           0a000300 // char[]
    //           0000666f // some chars
    //           6f'
    // Good: (symbol)
    expected += "01000000"; // --preamble--
    expected += "0d000000"; // msg length (13)
    expected += "f5"; // type, (-11, symbol)
    expected += "666f6f00"; // 'foo\0'
    expect(c.ab2ipcstr(shouldBeSymbol)).to.eql(expected);
  });
});


function conv(val) {
  return c.deserialize(c.serialize(val));
}
