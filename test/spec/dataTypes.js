'use strict';
var expect = require('chai').expect;
var c = require('../../index');

/*global describe:true, it:true, afterEach:true */
describe("Datatype Tests", function() {
  var data;
  afterEach(function() {
    expect(c.deserialize(c.serialize(data))).to.eql(data);
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
  it("Properly Converts Dates", function() {
    data = new Date("Tue Apr 22 2014 12:34:56 GMT+0800 (HKT)");
  });
  it("Properly Converts Arrays", function() {
    data = [1, 2, "foo", "bar", new Date("Tue Apr 22 2014 12:34:56 GMT+0800 (HKT)")];
  });
  it("Properly Converts Complex Objects", function() {
    data = {
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
    };
  });
});
