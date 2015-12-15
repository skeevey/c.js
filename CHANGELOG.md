## 0.1.0 (Dec 15, 2015)

* Refactor `deserialize.js` to avoid repeatedly declaring functions.
* Refactor constants in deserialize().
* Add benchmark suite to see changes. ~40% speed improvement over 0.0.5.
* Added Flow and ESLint for validation.
* Removed Grunt; moved to simple Makefile.
* Added Istanbul for coverage; currently at 80%.

## 0.0.5 (September 9, 2015)

* Fix timestamp rounding and add test.

## 0.0.4 (July 15, 2014)

* Serialize now encodes a list of symbols properly, so we get `symbol$() instead of ()
* Deserialize null and infinite dates to null.
* Throw when serializing an unknown datatype.

## 0.0.3 (July 3, 2014)

* Fix `ignore` configuration for browser embedding (browsers doesn't have Buffer)

## 0.0.2 (July 2, 2014)

* When serializing, use symbols by default rather than char[] arrays.
* Added `c.ipcstr2ab` and `c.ab2ipcstr` to help with debugging & test.
* Properly serialize `undefined` to null.
* Properly deserialize long null.
* Deserialize null numbers to NaN.
* Add Node-only stream implementation & tests.

## 0.0.1 (April 21, 2014)

* Initial commit from http://kx.com/q/c/c.js
* Cleaned up and split with build steps.
