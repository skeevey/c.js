'use strict';

const bench = require('./_bench');
const deserialize = require('../src/deserialize');
const serialize = require('../src/serialize');

console.log('KDB Deserialize benchmark.');

const largeObject = serialize(require('./data.json'));

bench([
  {
    iterations: 1000,
    name: 'Deserializing data.json',
    fn: function() {
      deserialize(largeObject);
    }
  },
]);
