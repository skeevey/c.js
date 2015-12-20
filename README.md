c.js
====

`c.js` is a serialization/deserialization library for communiciating with [kdb+](http://kx.com/software.php)'s
native IPC format.

This repository is refactoring of the [c.js project](http://code.kx.com/wsvn/code/kx/kdb%2B/c/c.js)
with performance improvements, bugfixes, and unit tests.

Why?
----

We have a project that requires fast, low-latency serialization of data from KDB+ to JSON.

This repository contains the following additions to the original project:

* Performance:
  * ~70-80% faster deserialization (kdb+ -> js)
  * 600%-1000% faster serialization (js -> kdb+)
* Full refactoring with type annotations.
* Added stream wrappers (`require('c.js/lib/stream')`) for easy consumption/production of kdb+ data.
* Bugfixes:
  * `undefined` -> `null`
  * Long null `0Nj` was incorrectly serialized to `-9223372036854776000`. Now `0Nj`, `0Ni`, and `0Nh` are all
    serialized to `NaN`.
  * Fixed incorrect timestamp rounding (precision error)
* Possibly breaking behavior:
  * JS strings are serialized to Symbols.
* Unit tests for all JS types and former c.js bugs, tests for few previously unfound bugs.
* Flow typing + ES6 syntax for source files.
* Make + Webpack build suite for Node.JS & browser output.
* Simple benchmark suite for keeping track of performance improvements and regressions.

Performance
-----------

Performance has improved over the reference c.js by 1.7x to 10x.

See [the benchmark results](/benchmark/RESULTS.md).

Run the benchmark yourself with `make benchmark`.

Build
-----

```js
npm install
make build
```
