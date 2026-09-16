#!/usr/bin/env node
/**
 * specify 相の追加実測(読むだけ / 本物の graph/ は一行も変えない)。
 *
 *  A. C1 の未測定の危険: 「サイト」語を含むが **部分機能** の依頼が full へ跳ねるか
 *     (findings 5.2 の ⚠️ 申し送り — discover 相では未測定)
 *  B. PARA-10 の修理案(REFORM_RE から弱い印「門」を撃ち捨てる)の巻き添え範囲
 *     — 既存門 tests/route-matrix.test.js の reform コーパスが何件死ぬか
 *
 * graph/ を $LOCALAPPDATA/Temp に写し、写しだけを曲げる。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/kikus/Documents/workspace/paradise';
const T = path.join(process.env.LOCALAPPDATA || process.env.TMP, 'Temp', 'spec_probe').replace(/\\/g, '/');
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(T, { recursive: true });
fs.cpSync(ROOT + '/graph', T + '/graph', { recursive: true });

const FP = T + '/graph/forge.js';
const orig = fs.readFileSync(FP, 'utf8');
const EOL = orig.includes('\r\n') ? '\r\n' : '\n';

function bend(edits) {
  let s = orig;
  for (const [a, b] of edits) {
    if (!s.includes(a)) { console.error('NEEDLE MISS: ' + JSON.stringify(a)); process.exit(3); }
    s = s.replace(a, b);
  }
  fs.writeFileSync(FP, s, 'utf8');
  for (const k of Object.keys(require.cache)) if (k.replace(/\\/g, '/').startsWith(T)) delete require.cache[k];
  return require(FP);
}

// ── C1 の当て方(findings 5.2 と同じ)────────────────────────────────
const C1 = [
  [`const fullJa = /製品|システム|アプリ|プラットフォーム|全体/;`,
   `const fullJa = /製品|システム|アプリ|プラットフォーム|全体|サイト|ウェブ|EC|通販|ポータル/;`],
  [`const fullEn = /\\b(product|platform|system|app|application|saas|dashboard|end-to-end|mvp|launch)\\b/;`,
   `const fullEn = /\\b(product|platform|system|app|application|saas|dashboard|end-to-end|mvp|launch|site|website|web-app|e-commerce|portal|shop|store)\\b/;`],
];

// ── A. サイト語 × 部分機能 ─────────────────────────────────────────
const SITE_PARTIAL = [
  ['standard', 'レシピサイトの並び替えを実装して'],
  ['standard', 'サイトの検索機能を実装して'],
  ['standard', '通販サイトのクーポン計算を作る'],
  ['standard', 'add a sort option to the recipe site'],
  ['standard', 'implement pagination for the site listing'],
  ['quick', 'サイトのタイポを直す'],
  ['quick', 'fix a typo on the website'],
  ['full', 'ECサイトを作れ'],
  ['full', 'build an e-commerce site'],
];

const base = (() => { fs.writeFileSync(FP, orig, 'utf8'); for (const k of Object.keys(require.cache)) if (k.replace(/\\/g,'/').startsWith(T)) delete require.cache[k]; return require(FP); })();
console.log('=== A-0. 基準線(判定器そのまま)— サイト語 × 部分機能 ===');
for (const [want, w] of SITE_PARTIAL) {
  const got = base.chooseScale(w);
  console.log((got === want ? '  ok  ' : '  ✗   ') + JSON.stringify(w) + ' -> ' + got + '  (正解 ' + want + ')');
}

const c1 = bend(C1);
console.log('\n=== A-1. C1 を当てた版 — サイト語 × 部分機能 ===');
let broke = 0;
for (const [want, w] of SITE_PARTIAL) {
  const got = c1.chooseScale(w);
  if (got !== want) broke++;
  console.log((got === want ? '  ok  ' : '  ✗   ') + JSON.stringify(w) + ' -> ' + got + '  (正解 ' + want + ')');
}
console.log('  C1 が壊す件数: ' + broke + ' / ' + SITE_PARTIAL.length);

// ── B. REFORM_RE から「門」を撃ち捨てたときの巻き添え ────────────────
const REFORM_CORPUS = [
  '楽園の自己診断に fingerprint を確かめる口を設ける',
  '門に監査の一段を足す',
  '楽園の憲法に条を足せ',
  '楽園の門に一段を設けよ',
  '楽園の判定器を書き換えろ',
  '楽園の走行台帳に印を付与せよ',
  '楽園の相を新設する',
  '楽園の門を見直すべきだ',
  '楽園に監査の口を足すべきである',
  '足すべきか迷ったが決めた。楽園の門に一段を足せ',
  '楽園の走行帳に鼓動の口を足せ',
  '楽園の相の並びを変えよ',
  '楽園の憲法の条を書き直せ',
  '楽園の監査の門を強化せよ',
];
console.log('\n=== B. REFORM_RE から「門」「gate」を除いた版 — reform コーパスの生死 ===');
const DROP = [[`|門|gate|`, `|`]];
let dead = 0;
try {
  const r = bend([...C1, ...DROP]);
  for (const w of REFORM_CORPUS) {
    const got = r.chooseScale(w);
    if (got !== 'reform') { dead++; console.log('  ✗   ' + JSON.stringify(w) + ' -> ' + got); }
  }
  console.log('  reform を失う件数: ' + dead + ' / ' + REFORM_CORPUS.length);
  console.log('  そのうち既存門 tests/route-matrix.test.js のコーパス(src=gate)の件数も上に含まれる');
  console.log('  「一門の家系図を作れるアプリが欲しい」-> ' + r.chooseScale('一門の家系図を作れるアプリが欲しい'));
} catch (e) { console.log('  needle miss: ' + e.message); }

fs.writeFileSync(FP, orig, 'utf8');
console.log('\n(写しを元に戻した。本物の graph/forge.js は一行も触れていない)');
