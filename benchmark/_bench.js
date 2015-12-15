// @flow
'use strict';
/*eslint no-console: 0*/

type Case = {iterations: number, name: string, fn: Function};
module.exports = function createBench(cases: Array<Case>) {
  let data;
  cases.forEach(function({iterations, name, fn}:Case) {
    times(5, () => {
      let hot = () => fn(data);
      let labelName = `${name} (${iterations} iterations)`;

      // Run bench
      console.time(labelName);
      times(iterations, hot);
      console.timeEnd(labelName);
    });
  });
};

function times(n, fn) {
  for (let i = 0; i < n; i++) {
    fn();
  }
}
