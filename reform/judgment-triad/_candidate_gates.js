#!/usr/bin/env node
/**
 * 候補を**リポジトリ丸ごとの写し**に当て、既存の門をそのまま走らせる。
 * ⚠️ 本物の C:/Users/kikus/Documents/workspace/paradise は一行も変えない。
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'graph', 'forge.js');
const orig = fs.readFileSync(SRC, 'utf8');
const CART_HEAD = 'function isCartography(wish) {\r\n  if (!DIAGRAM_RE.test(wish)) return false;';

const C1 = s => s
  .replace("const fullJa = /製品|システム|アプリ|プラットフォーム|全体/;",
           "const fullJa = /製品|システム|アプリ|プラットフォーム|全体|サイト|ウェブ|EC|通販|ポータル/i;")
  .replace("const fullEn = /\\b(product|platform|system|app|application|saas|dashboard|end-to-end|mvp|launch)\\b/;",
           "const fullEn = /\\b(product|platform|system|app|application|saas|dashboard|end-to-end|mvp|launch|site|website|web[- ]?app|e-?commerce|portal|shop|store)\\b/;");
const C2a = s => s.replace(CART_HEAD, CART_HEAD +
  '\r\n  if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;');

const CANDS = [
  ['C1-サイト語彙', C1],
  ['C2a-作図を強い産物名で打ち消す', C2a],
  ['C3-C1+C2a 併用', s => C2a(C1(s))],
];

const GATES = [
  ['tests/route-matrix.test.js', /Route matrix self-test: .*/],
  ['tests/counsel.test.js', /Counsel self-test: .*/],
  ['tests/paradise.test.js', /(?:Paradise|.*self-test).*: \d+ passed.*/g],
];

for (const [name, fn] of CANDS) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
  const dst = path.join(tmp, 'paradise');
  fs.cpSync(ROOT, dst, { recursive: true, filter: p => !/[\\/]\.git([\\/]|$)/.test(p) });
  const bent = fn(orig);
  if (bent === orig) { console.log(`⚠ ${name}: 差分が当たらなかった`); continue; }
  fs.writeFileSync(path.join(dst, 'graph', 'forge.js'), bent);
  console.log('\n' + '═'.repeat(72));
  console.log(`候補 ${name}  (写し: ${dst})`);
  console.log('═'.repeat(72));
  for (const [g] of GATES) {
    let out = '', ex = 0;
    try { out = execFileSync(process.execPath, [path.join(dst, g)], { encoding: 'utf8', cwd: dst, maxBuffer: 64 * 1024 * 1024 }); }
    catch (e) { out = (e.stdout || '') + (e.stderr || ''); ex = e.status === undefined ? 'crash' : e.status; }
    const failed = out.split('\n').filter(l => l.includes('✗')).slice(0, 12);
    const tail = out.trim().split('\n').slice(-3).join('\n');
    console.log(`\n  $ node ${g}   →  exit=${ex}`);
    if (failed.length) console.log(failed.map(l => '    ' + l.trim()).join('\n'));
    console.log('    ' + tail.split('\n').join('\n    '));
  }
}
