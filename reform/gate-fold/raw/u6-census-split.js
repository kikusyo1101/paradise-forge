// Census 段 423s のうち、自己診断の子プロセス以外に何秒かかるか。
// census(opts.runTests:false) は既存の口である(census.js:102)。
const census=require('../../../graph/census.js');
const t=Date.now();
const c=census.census({ runTests:false });
const ms=Date.now()-t;
console.log(`census(runTests:false) = ${ms} ms (${(ms/1000).toFixed(1)}s)`);
console.log(`tests 欄 = ${JSON.stringify(c.tests)}  (runTests:false なので null)`);
console.log(`\nCI の Census 段 = 423s (findings §1.1)`);
console.log(`→ 自己診断の子を除いた census 自身の仕事 = ${(ms/1000).toFixed(1)}s`);
console.log(`→ Census 段のうち自己診断の子が占める代 = 423 - ${(ms/1000).toFixed(1)} = ${(423-ms/1000).toFixed(1)}s`);
