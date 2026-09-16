#!/usr/bin/env node
/**
 * R1 の影響を測る計測器(specify 相 / 読むだけ・本物の graph/ は一行も変えない)。
 *
 *  1. リポジトリを $LOCALAPPDATA/Temp へ写す(.git / node_modules を除く)
 *  2. 写しの graph/conclave.js の ratify() にだけ R1(相の done 全揃いの関門)を当てる
 *  3. 写しで tests/paradise.test.js を**単独で**走らせ、何本落ちるかを数える
 *
 * 本物のリポジトリには一切書き込まない。
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SRC = 'C:/Users/kikus/Documents/workspace/paradise';
const T = path.join(process.env.LOCALAPPDATA || process.env.TMP, 'Temp', 'r1probe').replace(/\\/g, '/');
const DST = T + '/paradise';

fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(T, { recursive: true });
fs.cpSync(SRC, DST, {
  recursive: true,
  filter: (s) => {
    const parts = s.replace(/\\/g, '/').split('/');
    return !parts.includes('.git') && !parts.includes('node_modules');
  },
});
console.log('copied ->', DST);

const cj = DST + '/graph/conclave.js';
let src = fs.readFileSync(cj, 'utf8');
const EOL = src.includes('\r\n') ? '\r\n' : '\n';
const NEEDLE = [`  if (!opts.reject) {`, `    d.status = 'ratified';`].join(EOL);
if (!src.includes(NEEDLE)) { console.error('needle not found — ratify() の形が変わった'); process.exit(3); }
const R1 = [
  `  if (!opts.reject) {`,
  `    const notDone = (d.phases || []).filter(p => p.status !== 'done');`,
  `    if (notDone.length) {`,
  `      const e = new Error('cannot ratify ' + cardinal + ': ' + notDone.length + ' phase(s) not done: ' +`,
  `        notDone.map(p => p.id + '=' + p.status).join(', '));`,
  `      e.code = 'RATIFY_PHASES_NOT_DONE';`,
  `      throw e;`,
  `    }`,
  `    d.status = 'ratified';`,
].join(EOL);
fs.writeFileSync(cj, src.replace(NEEDLE, R1), 'utf8');
console.log('R1 applied to the COPY only');

function run(cmd, args, cwd) {
  try {
    const out = execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status === undefined ? -1 : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

for (const [label, args] of [
  ['paradise.test.js', ['tests/paradise.test.js']],
  ['route-matrix.test.js', ['tests/route-matrix.test.js']],
  ['counsel.test.js', ['tests/counsel.test.js']],
]) {
  const r = run(process.execPath, args, DST);
  const fails = (r.out.match(/^\s*✗ .*$/gm) || []);
  const tail = r.out.trim().split('\n').slice(-3).join('\n');
  console.log('\n=== ' + label + '  EXIT=' + r.code + ' ===');
  console.log(tail);
  if (fails.length) { console.log('--- ✗ ' + fails.length + ' 本 ---'); for (const f of fails.slice(0, 40)) console.log(f); }
}
