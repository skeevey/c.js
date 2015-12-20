'use strict';

const bench = require('./_bench');
const serialize = require('../lib/serialize');

console.log('KDB Serialize benchmark.');

const largeObject = require('./data.json');
const smallArray = [1,2,3,4,5];
const smallStr = 'This is a string.';
const smallObj = {foo: 'bar'};

bench([
  {
    iterations: 1000,
    name: 'Serializing data.json',
    fn: function() {
      serialize(largeObject);
    }
  },
  {
    iterations: 100000,
    name: 'Serializing small array',
    fn: function() {
      serialize(smallArray);
    }
  },
  {
    iterations: 100000,
    name: 'Serializing small string',
    fn: function() {
      serialize(smallStr);
    }
  },
  {
    iterations: 100000,
    name: 'Serializing small object',
    fn: function() {
      serialize(smallObj);
    }
  },
]);
