'use strict';

require("babel-register"); // for now, TODO build script and include
var serialize = require('../lib/serialize');
var ITERATIONS = 500;
var OBJ_SIZE = 10000;
var BENCH_ITERATIONS = 10;
var benchIters = 0;

console.log('KDB Serialize benchmark.');

var largeObject = generateObjectOfSize(10000);

// Benchmark some of the message parsing functions.
function run() {
  var key = 'serializing obj of size ' + OBJ_SIZE + ', ' + ITERATIONS + ' times:';
  console.time(key);
  for (var i = 0; i < ITERATIONS; i++) {
    serialize(largeObject);
  }
  console.timeEnd(key);
  benchIters++;
  if (benchIters < BENCH_ITERATIONS) return run();
  console.log('---------');
  process.exit(0);
}

run();


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
