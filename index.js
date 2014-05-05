'use strict';
module.exports = {
  serialize: require('./lib/serialize'),
  deserialize: require('./lib/deserialize'),
  ab2ipcstr: function(buffer) {
    var str = "";
    var bufferView = new Uint8Array(buffer);
    for(var i = 0; i < bufferView.byteLength; i++){
      str += (bufferView[i]+0x100).toString(16).slice(-2);
    }
    return str;
  },
  ipcstr2ab: function(str) {
    var buffer = new ArrayBuffer(str.length/2);
    var bufferView = new Uint8Array(buffer);
    for(var i = 0; i < buffer.byteLength; i++){
      bufferView[i] = parseInt("0x"+str.substr(2*i,2));
    }
    return buffer;
  }
};
