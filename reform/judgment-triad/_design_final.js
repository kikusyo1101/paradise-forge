#!/usr/bin/env node
/**
 * design 相の**最終の裏取り**: design.md §2.5 に貼った D5 + C2a のパッチを、
 * **design.md の本文から読み取った形そのまま**で写しに当て、101 件の行列と
 * 既存門 2 本を撃つ。design.md の記述と実測の乖離を許さないための門である。
 * ⚠️ 本物の graph/forge.js は一行も変えない。
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'graph', 'forge.js');
const orig = fs.readFileSync(SRC, 'utf8');
const EOL = orig.includes('\r\n') ? '\r\n' : '\n';
const WORK = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'jt_design');
fs.mkdirSync(WORK, { recursive: true });

// ── design.md §2.5 の形を**一字一句そのまま** ─────────────────────────
const C2A_ANCHOR = 'function isCartography(wish) {' + EOL + '  if (!DIAGRAM_RE.test(wish)) return false;';
const C2A_ADD = EOL + '  if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;';

const D5_ANCHOR =
  "  if (quickJa.test(d) || quickEn.test(w)) return 'quick';" + EOL +
  "  if (fullJa.test(d) || fullEn.test(w)) return 'full';" + EOL +
  "  return 'standard';";
const D5_ADD =
  "  const SITE = 'サイト|ウェブ|ウエブ|ホームページ|ポータル|通販|EC';" + EOL +
  "  const siteWholeJa = new RegExp(" + EOL +
  "    '(?:' + SITE + ')(?:を|が|は)[^をのに]{0,6}(?:作|造|構築|開発|制作|立ち上げ|新設|リニューアル|刷新|欲しい|ほしい|要る|必要)' +" + EOL +
  "    '|(?:' + SITE + ')の(?:構築|開発|制作|作成|新設|立ち上げ|リニューアル|刷新)');" + EOL +
  "  const siteWholeEn = /\\b(?:build|create|launch|develop|make|implement|need|want|set\\s+up)\\b\\s+(?:a|an|the|new|our|my)?\\s*(?:(?!\\b(?:for|to|of|in|on|with|from|into)\\b)[a-z][a-z-]*\\s+){0,2}(?:site|website|web[- ]?app|e-?commerce|portal|shop|store)\\b/i;" + EOL +
  "  if (quickJa.test(d) || quickEn.test(w)) return 'quick';" + EOL +
  "  if (fullJa.test(d) || fullEn.test(w)) return 'full';" + EOL +
  "  if (siteWholeJa.test(d) || siteWholeEn.test(w)) return 'full';" + EOL +
  "  return 'standard';";

if (!orig.includes(C2A_ANCHOR)) throw new Error('C2a の錨が無い');
if (!orig.includes(D5_ANCHOR)) throw new Error('D5 の錨が無い');
const bent = orig.replace(C2A_ANCHOR, C2A_ANCHOR + C2A_ADD).replace(D5_ANCHOR, D5_ADD);
const OUT = path.join(WORK, 'forge.FINAL.js');
fs.writeFileSync(OUT, bent);

// fullJa / fullEn が一字も変わっていないことを確かめる(第60条: 表を足していない)
const fullJaLine = "  const fullJa = /製品|システム|アプリ|プラットフォーム|全体/;";
const fullEnLine = "  const fullEn = /\\b(product|platform|system|app|application|saas|dashboard|end-to-end|mvp|launch)\\b/;";
console.log('fullJa を触っていないか: ' + bent.includes(fullJaLine));
console.log('fullEn を触っていないか: ' + bent.includes(fullEnLine));
console.log('曲げた forge: ' + OUT);

const GATE = path.join(__dirname, '_design_gate.js');
const run = (rel) => {
  try { return { exit: 0, out: execFileSync(process.execPath, [GATE, OUT, rel], { encoding: 'utf8', cwd: ROOT }) }; }
  catch (e) { return { exit: e.status, out: (e.stdout || '') + (e.stderr || '') }; }
};
for (const rel of ['reform/judgment-triad/_design_matrix.js', 'tests/route-matrix.test.js', 'tests/counsel.test.js']) {
  const r = run(rel);
  console.log('\n══ ' + rel + '  exit=' + r.exit + ' ══');
  if (rel.includes('_design_matrix')) {
    const L = r.out.split('\n'); const i = L.findIndex(x => x.includes('混同行列'));
    console.log(L.slice(i >= 0 ? i : 0).join('\n').trimEnd());
  } else {
    console.log(r.out.split('\n').filter(x => x.includes('✗') || /self-test:/.test(x)).map(x => '  ' + x.trim()).join('\n'));
  }
}
