'use strict';

var deserialize = require('./deserialize');
var serialize = require('./serialize');
var through = require('through2');

module.exports = {
  // Pipe your outgoing data into this stream and it will be serialized on the way to kdb.
  getSerializeStream: function() {
    // Serializes an incoming value.
    // FIXME do we need objectMode here?
    return through.obj(function write(chunk, end, callback) {
      this.push(serialize(chunk));
      callback();
    });
  },
  getDeserializeStream: function() {
    var t = through.obj(function write(chunk, enc, callback) {
      // It's possible the data coming through here is split into pieces; we need to buffer
      // until we know we have the whole message.
      this._buffer = Buffer.concat([this._buffer, chunk]);
      var expectedLength = getLengthFromBuffer(this._buffer);
      // console.log("Expected length: ", expectedLength, "length:", this._buffer.length);
      if (expectedLength === this._buffer.length) {
        this.push(deserialize(this._buffer));
        this._buffer = new Buffer(0); // clear it out
      }
      callback();
    });
    t._buffer = new Buffer(0);
    return t;
  }
};

function getLengthFromBuffer(buffer) {
  // FIXME we're not supporting big-endian for now (see deserialize.js)
  return buffer.readInt32LE(4);
}
