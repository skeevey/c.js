'use strict';
var expect = require('chai').expect;
var c = require('../../index');

/*global describe:true, it:true, afterEach:true */
describe("Datatype Tests", function() {
  var data;
  afterEach(function() {
    expect(conv(data)).to.eql(data);
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
        date: new Date(),
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
    str += "01000000"; // preamble
    str += "11000000"; // msg length (17)
    str += "f9"; // type, (-7, 64-bit Long)
    str += "0000000000000080"; // Long.MIN_VALUE
    expect(str.length).to.equal(34);
    var longNull = c.ipcstr2ab(str);
    expect(c.deserialize(longNull)).to.eql(NaN);
  });

  it("Handles int null (0Ni)", function() {
    var str = "";
    str += "01000000"; // preamble
    str += "0c000000"; // msg length (13)
    str += "fa"; // type, (-6, 32-bit Int)
    str += "00000080"; // Integer.MIN_VALUE
    expect(str.length).to.equal(26);
    var intNull = c.ipcstr2ab(str);
    expect(c.deserialize(intNull)).to.eql(NaN);
  });

  it("Handles short null (0Ns)", function() {
    var str = "";
    str += "01000000"; // preamble
    str += "0c000000"; // msg length (11)
    str += "fb"; // type, (-5, 16-bit Short)
    str += "0080"; // Integer.MIN_VALUE
    expect(str.length).to.equal(22);
    var shortNull = c.ipcstr2ab(str);
    expect(c.deserialize(shortNull)).to.eql(NaN);
  });
});


function conv(val) {
  return c.deserialize(c.serialize(val));
}
