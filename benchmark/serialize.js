'use strict';

const serialize = require('../lib/serialize');
const ITERATIONS = 1000;
const BENCH_ITERATIONS = 10;
let benchIters = 0;

console.log('KDB Serialize benchmark.');

const largeObject = require('./data.json');

// Benchmark some of the message parsing functions.
function run() {
  let key = 'serializing data.json ' + ITERATIONS + ' times:';
  console.time(key);
  for (let i = 0; i < ITERATIONS; i++) {
    serialize(largeObject);
  }
  console.timeEnd(key);
  benchIters++;
  if (benchIters < BENCH_ITERATIONS) return run();
  console.log('---------');
  process.exit(0);
}

run();
