'use strict';
/*eslint no-console: 0*/

module.exports = function createBench(cases) {
  let data;
  cases.forEach(function(aCase) {
    times(5, () => {
      let hot = () => aCase.fn(data);
      let labelName = `${aCase.name} (${aCase.iterations} iterations)`;

      // Run bench
      console.time(labelName);
      times(aCase.iterations, hot);
      console.timeEnd(labelName);
    });
  });
};

function times(n, fn) {
  for (let i = 0; i < n; i++) {
    fn();
  }
}
