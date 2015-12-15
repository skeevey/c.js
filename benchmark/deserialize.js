'use strict';

const deserialize = require('../lib/deserialize');
const serialize = require('../lib/serialize');
const ITERATIONS = 1000;
const BENCH_ITERATIONS = 10;
let benchIters = 0;

console.log('KDB Deserialize benchmark.');

const largeObject = serialize(require('./data.json'));

// Benchmark some of the message parsing functions.
function run() {
  let key = 'deserializing data.json ' + ITERATIONS + ' times:';
  console.time(key);
  for (let i = 0; i < ITERATIONS; i++) {
    deserialize(largeObject);
  }
  console.timeEnd(key);
  benchIters++;
  if (benchIters < BENCH_ITERATIONS) return run();
  console.log('---------');
  process.exit(0);
}

run();

