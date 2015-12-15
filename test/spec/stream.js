'use strict';
require('babel-register');
var expect = require('chai').expect;
var c = require('../../index');
var stream = require('../../lib/stream');

/*global describe:true, it:true*/
describe("Stream tests (addon)", function() {
  // Undefined -> null as there is no undefined type in kdb, sanely
  it("Deserializes an ipc buffer correctly.", function(done) {
    var deserializeStream = stream.getDeserializeStream();
    var testObject = generateObjectOfSize(1000);
    var serializedBuffer = c.serialize(testObject);
    deserializeStream.on('data', function(data) {
      expect(JSON.stringify(data)).to.eql(JSON.stringify(testObject));
    });
    deserializeStream.on('end', done);
    deserializeStream.end(serializedBuffer);
  });

  it("Deserializes a large, split ipc buffer correctly.", function(done) {
    var deserializeStream = stream.getDeserializeStream();
    var largeObject = generateObjectOfSize(100000);
    var largeSerializedBuffer = c.serialize(largeObject);

    // Add handlers
    deserializeStream.on('data', function(data) {
      expect(JSON.stringify(data).length).to.eql(JSON.stringify(largeObject).length);
    });
    deserializeStream.on('end', done);

    // Write
    var len = 0, next, step = 10000;
    while (len < largeSerializedBuffer.length) {
      next = len + step;
      if (next > largeSerializedBuffer.length) next = largeSerializedBuffer.length;
      deserializeStream.write(largeSerializedBuffer.slice(len, next));
      len = next;
    }
    deserializeStream.end();
  });

  it("Serializes and deserializes a large object correctly.", function(done) {
    var largeObject = generateObjectOfSize(100000);
    var serializeStream = stream.getSerializeStream();
    var deserializeStream = stream.getDeserializeStream();
    serializeStream.pipe(deserializeStream);

    // Add handlers
    deserializeStream.on('data', function(data) {
      expect(JSON.stringify(data).length).to.eql(JSON.stringify(largeObject).length);
    });
    deserializeStream.on('end', done);

    serializeStream.end(largeObject);
  });
});

// Generate a large object.
// Size is in bytes; e.g. a single key object serializes to
// '{"a":"s"}' which is 9 bytes. Each subsequent key is 8 bytes
// due to the comma.
// Not really accurate because the keys get larger when the numbers go up but,
// it doesn't really matter for this test.
function generateObjectOfSize(size) {
  var obj = {};
  for (var i = 1; i < size; i += 8) {
    obj[i] = "s";
  }
  return obj;
}
