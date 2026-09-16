#!/usr/bin/env node
/**
 * 対照群 — 何も曲げていない写しで tests/paradise.test.js を**単独で**走らせる。
 * findings.md §6.2 の警告(写し同士が git 作業樹/一時領域を奪い合うと偽の ✗ が出る)への対処。
 * 本物のリポジトリには一切書き込まない。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SRC = 'C:/Users/kikus/Documents/workspace/paradise';
const MODE = process.argv[2] || 'ctrl';   // 'ctrl' | 'r1'
const T = path.join(process.env.LOCALAPPDATA || process.env.TMP, 'Temp', 'solo_' + MODE).replace(/\\/g, '/');
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

if (MODE === 'r1') {
  const cj = DST + '/graph/conclave.js';
  const src = fs.readFileSync(cj, 'utf8');
  const EOL = src.includes('\r\n') ? '\r\n' : '\n';
  const NEEDLE = [`  if (!opts.reject) {`, `    d.status = 'ratified';`].join(EOL);
  if (!src.includes(NEEDLE)) { console.error('needle miss'); process.exit(3); }
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
}

console.log('MODE=' + MODE + '  DST=' + DST);
let out, code = 0;
try {
  out = execFileSync(process.execPath, ['tests/paradise.test.js'], { cwd: DST, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
} catch (e) { code = e.status === undefined ? -1 : e.status; out = (e.stdout || '') + (e.stderr || ''); }
const fails = out.match(/^\s*✗ .*$/gm) || [];
const tail = out.trim().split('\n').filter(l => /passed|failed|skipped/.test(l)).slice(-2).join('\n');
console.log('EXIT=' + code);
console.log(tail);
console.log('✗ ' + fails.length + ' 本:');
for (const f of fails) console.log(f);
fs.writeFileSync(path.join(__dirname, '_solo_' + MODE + '_out.txt'), out, 'utf8');
