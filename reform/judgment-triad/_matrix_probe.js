#!/usr/bin/env node
/**
 * PARA-9 / PARA-7 実測: 6 道 × 6 道の混同行列。
 * 作法は tests/route-matrix.test.js を踏襲する(第61条: 非対角セルが 0 であること)。
 * ⚠️ この計測器は判定器を一行も変えない。ただ撃って数えるだけである。
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const forgePath = process.env.PROBE_FORGE || path.join(ROOT, 'graph', 'forge.js');
const forge = require(forgePath);

const ROUTES = ['counsel', 'cartography', 'reform', 'quick', 'standard', 'full'];
const CORPUS = [];
/** @param route 正解の道 @param wish 願い @param src 'gate'=既存門のコーパス / 'new'=本走行が足した実測 */
const w = (route, wish, src, tag) => CORPUS.push({ route, wish, src: src || 'new', tag: tag || '' });

// ── counsel (18件) ── 既存門 tests/route-matrix.test.js より ─────────────
w('counsel', '楽園の構造を調査して報告してほしい', 'gate');
w('counsel', '楽園のエンジンを監査してほしい', 'gate');
w('counsel', '二つの案の比較表がほしい', 'gate');
w('counsel', '人口動態を調査して報告してほしい', 'gate');
w('counsel', '腎機能の低下を診断してほしい', 'gate');
w('counsel', '相場を分析して所見をくれ', 'gate');
w('counsel', '憲法に条を足すべきかどう思う', 'gate');
w('counsel', 'gauge に口を設けるのは妥当か', 'gate');
w('counsel', '楽園に相を足すべきかどうすべきか', 'gate');
w('counsel', '楽園の門を直すべきか検討して', 'gate');
w('counsel', 'ポモドーロアプリに休憩の機能を足すべきか検討して', 'gate');
w('counsel', 'should we add a flag to the gate? please advise', 'gate');
w('counsel', 'is it worth adding an endpoint here? give your assessment', 'gate');
w('counsel', 'compare the two approaches and advise whether to add a command', 'gate');
w('counsel', 'review whether introducing a new tool is a good idea', 'gate');
w('counsel', 'should we add a dark mode to the habit tracker? advise', 'gate');
w('counsel', '楽園の門に一段を足すべきか。意見をくれ', 'gate');
w('counsel', 'gauge に口を設けるべきか。所見がほしい', 'gate');

// ── cartography (15件) ── 既存門 9 + 本走行 6 ──────────────────────────
w('cartography', '楽園の位階の相関図を作れ', 'gate');
w('cartography', 'オーケストレーションの相関図を作れ', 'gate');
w('cartography', '家計の流れをフロー図にして', 'gate');
w('cartography', '楽園の相の系統図を描いてほしい', 'gate');
w('cartography', '依存の関連図を可視化して', 'gate');
w('cartography', 'draw an architecture diagram of the engine', 'gate');
w('cartography', 'visualize the phase flowchart', 'gate');
w('cartography', '楽園の位階の相関図を作るべきか検討して', 'gate');
w('cartography', '構成図を描くのは妥当か', 'gate');
w('cartography', '組織の階層図を作って');
w('cartography', 'データの流れを図示して');
w('cartography', '楽園の相の依存をダイアグラムにして');
w('cartography', 'システム構成図を描いてくれ');
w('cartography', 'draw a sequence diagram for the login flow');
w('cartography', '一族の系統図を描いてほしい');

// ── reform (15件) ── 既存門 11 + 本走行 4 ──────────────────────────────
w('reform', '楽園の自己診断に fingerprint を確かめる口を設ける', 'gate');
w('reform', '門に監査の一段を足す', 'gate');
w('reform', '楽園の憲法に条を足せ', 'gate');
w('reform', '楽園の門に一段を設けよ', 'gate');
w('reform', '楽園の判定器を書き換えろ', 'gate');
w('reform', '楽園の走行台帳に印を付与せよ', 'gate');
w('reform', '楽園の相を新設する', 'gate');
w('reform', '楽園の門を見直すべきだ', 'gate');
w('reform', '楽園に監査の口を足すべきである', 'gate');
w('reform', '足すべきか迷ったが決めた。楽園の門に一段を足せ', 'gate');
w('reform', '妥当か検討済み:楽園に監査の口を実装せよ', 'gate');
w('reform', '楽園の走行帳に鼓動の口を足せ');
w('reform', '楽園の相の並びを変えよ');
w('reform', '楽園の憲法の条を書き直せ');
w('reform', '楽園の監査の門を強化せよ');

// ── quick (15件) ── 既存門 8 + 本走行 7 ────────────────────────────────
w('quick', '台帳の毒を直す', 'gate');
w('quick', 'タイポを直して', 'gate');
w('quick', '誤字を修正して', 'gate');
w('quick', '一行のバグを直す', 'gate');
w('quick', 'fix the typo in the readme', 'gate');
w('quick', 'quick tweak to the parser', 'gate');
w('quick', 'hotfix the broken import', 'gate');
w('quick', 'rename the variable', 'gate');
w('quick', '変数名を直す');
w('quick', '誤字の修正');
w('quick', '色を微調整して');
w('quick', 'patch the broken link');
w('quick', 'adjust the padding');
w('quick', 'small tweak to the css');
w('quick', 'typo fix in the docs');

// ── standard (15件) ── 既存門 9 + 本走行 6 ─────────────────────────────
w('standard', 'レシピ検索の並び替えを実現して', 'gate');
w('standard', '写真の整頓を実装して', 'gate');
w('standard', '読書記録の栞を作る', 'gate');
w('standard', '通知の仕組みを構築して', 'gate');
w('standard', 'implement a markdown renderer', 'gate');
w('standard', 'create a csv importer', 'gate');
w('standard', 'develop a caching layer', 'gate');
w('standard', 'make a url shortener service', 'gate');
w('standard', 'build a calorie tracker cli tool', 'gate');
w('standard', 'メモ帳の検索を実装して');
w('standard', 'CSV の取り込みを作る');
w('standard', 'build a rss reader');
w('standard', 'implement a pagination helper');
w('standard', 'create a thumbnail generator');
w('standard', 'develop a rate limiter');

// ── full (15件) ── 既存門 8 + 本走行 7(PARA-7 の族) ────────────────
w('full', '健康診断アプリが欲しい', 'gate');
w('full', 'build a habit tracker app', 'gate');
w('full', 'ポモドーロタイマーのアプリが欲しい', 'gate');
w('full', '家計簿のシステムを作って', 'gate');
w('full', '読書記録のプラットフォームが欲しい', 'gate');
w('full', 'build a calorie tracker application', 'gate');
w('full', 'launch an mvp dashboard product', 'gate');
w('full', 'build an end-to-end saas platform', 'gate');
w('full', 'ECサイトを作れ', 'new', 'PARA-7');
w('full', '社内ポータルサイトを作れ', 'new', 'PARA-7');
w('full', '予約サイトを作りたい', 'new', 'PARA-7');
w('full', 'コーポレートサイトが欲しい', 'new', 'PARA-7');
w('full', '通販サイトを構築して', 'new', 'PARA-7');
w('full', 'ニュースポータルのウェブサイトが欲しい', 'new', 'PARA-7');
w('full', 'build an e-commerce site', 'new', 'PARA-7');

/**
 * ── PARA-9 の族 ──────────────────────────────────────────────────────
 * 「図を作れる**産物**が欲しい」。求められているのは図ではなく物である。
 * 札は既存門の前例に従う:
 *   「健康診断アプリが欲しい」= full  → アプリを名指す願いは full
 *   「build a calorie tracker cli tool」= standard → ツール/tool は full ではない
 */
w('full', '一門の家系図を作れるアプリが欲しい', 'new', 'PARA-9');
w('full', '家系図を作れるアプリが欲しい', 'new', 'PARA-9');
w('full', '相関図を描けるアプリを作って', 'new', 'PARA-9');
w('standard', '組織図を編集できるツールを作る', 'new', 'PARA-9');
w('standard', '系統図を出力するコマンドを実装して', 'new', 'PARA-9');

function buildMatrix(corpus) {
  const m = {};
  for (const a of ROUTES) { m[a] = {}; for (const b of ROUTES) m[a][b] = []; }
  const unknown = [];
  for (const row of corpus) {
    const got = forge.chooseScale(row.wish);
    if (!ROUTES.includes(got)) { unknown.push({ ...row, got }); continue; }
    m[row.route][got].push(row);
  }
  return { m, unknown };
}

function render(m) {
  const head = '正解\\実際'.padEnd(14) + ROUTES.map(r => r.slice(0, 6).padStart(12)).join('') + '     計';
  const lines = [head, '─'.repeat(head.length)];
  for (const a of ROUTES) {
    let n = 0;
    const cells = ROUTES.map(b => { n += m[a][b].length; return String(m[a][b].length).padStart(12); }).join('');
    lines.push(a.padEnd(14) + cells + String(n).padStart(8));
  }
  return lines.join('\n');
}

const { m: MATRIX, unknown: UNKNOWN } = buildMatrix(CORPUS);

console.log('forge: ' + forgePath);
console.log('コーパス件数: ' + CORPUS.length + '  (道ごと: ' +
  ROUTES.map(r => `${r}=${CORPUS.filter(c => c.route === r).length}`).join(', ') + ')');
console.log('\n═══ 6 道 × 6 道 混同行列 ═══\n');
console.log(render(MATRIX));

const diag = ROUTES.reduce((s, r) => s + MATRIX[r][r].length, 0);
console.log('\n対角の合計: ' + diag + ' / ' + CORPUS.length + '  (誤着 ' + (CORPUS.length - diag) + ' 件)');
if (UNKNOWN.length) console.log('6 道の外へ落ちた願い: ' + UNKNOWN.length);

console.log('\n═══ 非ゼロの非対角セル ═══');
let bad = 0;
for (const a of ROUTES) for (const b of ROUTES) {
  if (a === b) continue;
  const cell = MATRIX[a][b];
  if (!cell.length) continue;
  bad++;
  console.log(`\n  [${a} → ${b}] : ${cell.length} 件`);
  for (const c of cell) console.log(`      ・${c.wish}   (${c.src}${c.tag ? '/' + c.tag : ''})`);
}
if (!bad) console.log('  (無し — 全セル 0)');
console.log(`\n非ゼロの非対角セル数: ${bad} / ${ROUTES.length * (ROUTES.length - 1)}`);
process.exitCode = 0;
