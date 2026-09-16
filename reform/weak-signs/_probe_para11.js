#!/usr/bin/env node
/**
 * PARA-11 実測: `PRODUCT_FALSE_FRIENDS` の **文全体無効化** が何件の願いを殺すか。
 * 紛れ語 × 強い産物名 の組み合わせを 24 件作り、誤着を数える。
 * さらに (c) DIAGRAM_FALSE_FRIENDS の同型の病、(d) isCounsel の経路への影響を測る。
 * ⚠️ 判定器は一行も変えない。
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const forge = require(path.join(ROOT, 'graph', 'forge.js'));
const { chooseScale, wantsProduct, isCounsel, isCartography,
        PRODUCT_FALSE_FRIENDS, PRODUCT_RE, denude } = forge;

// forge.js は DIAGRAM_FALSE_FRIENDS / PRODUCT_STRONG_RE を export していない。
// ⚠️ 原文から**読み取るだけ**(改変はしない)。export の欠落自体も所見である。
const fs = require('fs');
const src = fs.readFileSync(path.join(ROOT, 'graph', 'forge.js'), 'utf8');
const DFF_SRC = src.match(/const DIAGRAM_FALSE_FRIENDS = (\/[^\n]*\/);/)[1];
const DIAGRAM_FALSE_FRIENDS = eval(DFF_SRC); // eslint-disable-line
const PS_SRC = src.match(/const PRODUCT_STRONG_RE = (new RegExp\([\s\S]*?\));/)[1];
const PRODUCT_STRONG_RE = eval(PS_SRC); // eslint-disable-line
console.log('PRODUCT_STRONG_RE = ' + PRODUCT_STRONG_RE.source);
console.log('(⚠ PRODUCT_STRONG_RE / DIAGRAM_FALSE_FRIENDS は module.exports に無い — 原文から読んだ)');

console.log('PRODUCT_FALSE_FRIENDS = ' + PRODUCT_FALSE_FRIENDS.source.slice(0, 120) + '…');
console.log('DIAGRAM_FALSE_FRIENDS = ' + DIAGRAM_FALSE_FRIENDS);
console.log('wantsProduct = ' + String(wantsProduct).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' '));

// ═══ 2(b) 紛れ語 × 強い産物名 ─ 24 件 ═══════════════════════════════
// 正解の道は既存門のコーパスの前例に従う:
//   アプリ/システム/製品/プラットフォーム を名指す → full
//   ツール/コマンド/機能/画面/ボタン → standard
const B = [
  // 「口」の紛れ語
  ['full', '人口動態のアプリが欲しい'],
  ['standard', '相談窓口のツールを作る'],
  ['standard', '入口の混雑を表示する画面を実装して'],
  ['full', '口コミ投稿のアプリが欲しい'],
  ['standard', '口座残高を取り込むコマンドを実装して'],
  ['standard', '非常口の点検を記録する機能を実装して'],
  // 「相」の紛れ語
  ['full', '相場を追うアプリが欲しい'],
  ['standard', '相談予約のボタンを実装して'],
  ['full', '相続の手続きを進めるアプリが欲しい'],
  ['standard', '相互リンクを集めるツールを作る'],
  ['standard', '真相究明メモの画面を実装して'],
  ['full', '首相の発言を集めるアプリが欲しい'],
  // 「門」の紛れ語
  ['full', '専門店のサイトが欲しい'],
  ['standard', '部門別の集計コマンドを実装して'],
  ['full', '名門校の受験対策アプリが欲しい'],
  ['standard', '入門講座の進捗を記録する機能を実装して'],
  ['standard', '門限を知らせるタイマーを実装して'],
  ['full', '登竜門コンテストの投票アプリが欲しい'],
  // 強い産物名の紛れ語(腎機能/一段落/画面越/タイマー競技)
  ['full', '腎機能の数値を記録するアプリが欲しい'],
  ['standard', '認知機能テストの画面を実装して'],
  ['full', '一段落したタスクを片付けるアプリが欲しい'],
  ['standard', '画面越しの通話を録画するツールを作る'],
  ['full', 'タイマー競技の記録アプリが欲しい'],
  ['standard', '機能性表示食品の一覧を出すコマンドを実装して'],
];

console.log('\n═══ 2(b) PRODUCT_FALSE_FRIENDS の文全体無効化 — 紛れ語 × 強い産物名 ' + B.length + ' 件 ═══\n');
let bad = 0;
for (const [want, wish] of B) {
  const got = chooseScale(wish);
  const ff = wish.match(PRODUCT_FALSE_FRIENDS);
  const st = wish.match(PRODUCT_STRONG_RE);
  const ok = got === want;
  if (!ok) bad++;
  console.log(`  ${ok ? 'ok ' : '✗  '} "${wish}"`);
  console.log(`        紛れ語=${ff ? JSON.stringify(ff[0]) : 'なし'}  強い産物名=${st ? JSON.stringify(st[0]) : 'なし'}` +
              `  wantsProduct=${wantsProduct(wish)}  -> ${got}  (正解 ${want})`);
}
console.log(`\n  誤着: ${bad}/${B.length} 件`);

// 「紛れ語を削ってから探す」形なら wantsProduct が真になるか(修理の見込み)
const strip = w => String(w).replace(new RegExp(PRODUCT_FALSE_FRIENDS.source, 'g'), ' ');
console.log('\n  ── 参考: 紛れ語を削ってから強い名を探した場合の wantsProduct ──');
let recov = 0;
for (const [, wish] of B) {
  const s = strip(wish);
  const after = PRODUCT_STRONG_RE.test(s) || (PRODUCT_RE.test(s) && !PRODUCT_FALSE_FRIENDS.test(s));
  if (after && !wantsProduct(wish)) recov++;
}
console.log(`     現在 false → 削れば true になる願い: ${recov}/${B.length}`);

// ═══ 2(c) DIAGRAM_FALSE_FRIENDS にも同型の病が在るか ═══════════════
console.log('\n═══ 2(c) DIAGRAM_FALSE_FRIENDS(isCartography)の同型の病 ═══\n');
console.log('  isCartography の該当行:');
console.log('    const onlyWeak = !<強い作図語>.test(wish);');
console.log('    if (onlyWeak && DIAGRAM_FALSE_FRIENDS.test(wish)) return false;');
console.log('  → 打ち消しは **onlyWeak(弱い印「図に/図を」だけで当たった場合)に限定** されている。');
console.log('  → つまり「強い作図語 + 紛れ語」の文は殺されない **はず**。実測で確かめる:\n');
const C = [
  ['cartography', '意図を汲んで相関図を描いてほしい'],          // 強い作図語 + 紛れ語「意図」
  ['cartography', '地図データの構成図を作れ'],                   // 強い作図語 + 紛れ語「地図」
  ['cartography', '図書館の蔵書の関連図を可視化して'],           // 強い作図語 + 紛れ語「図書」
  ['cartography', '構図の良し悪しを系統図にして'],               // 強い作図語 + 紛れ語「構図」
  ['cartography', '合図の流れをフロー図にして'],                 // 強い作図語 + 紛れ語「合図」
  ['standard', '意図を汲んで実装せよ'],                          // 弱い印なし・紛れ語のみ → 作図ではない
  ['standard', '地図の縮尺を切り替える機能を実装して'],          // 紛れ語のみ
  ['standard', '図書の貸出を記録するツールを作る'],              // 紛れ語のみ
];
let cbad = 0;
for (const [want, wish] of C) {
  const got = chooseScale(wish);
  const dff = wish.match(DIAGRAM_FALSE_FRIENDS);
  const ok = got === want;
  if (!ok) cbad++;
  console.log(`  ${ok ? 'ok ' : '✗  '} "${wish}"  紛れ語=${dff ? JSON.stringify(dff[0]) : 'なし'}` +
              `  isCartography=${isCartography(wish)}  -> ${got}  (正解 ${want})`);
}
console.log(`\n  誤着: ${cbad}/${C.length} 件`);

// ただし isCartography は **PRODUCT_FALSE_FRIENDS も**使っている(打ち消しの打ち消し)
console.log('\n  ── ただし isCartography は PRODUCT_FALSE_FRIENDS を **打ち消しの条件** に使っている ──');
console.log('    if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;');
console.log('    → 紛れ語が在ると「産物を求めている」打ち消しが効かず、図一枚で返る。実測:\n');
const C2 = [
  ['full', '一門の家系図を作れるアプリが欲しい'],
  ['full', '相関図を描けるアプリを作って'],
  ['full', '専門分野の系統図を編集できるアプリが欲しい'],
  ['standard', '人口分布の構成図を出力するツールを作る'],
  ['standard', '窓口の導線を図示するコマンドを実装して'],
  ['standard', '相場の推移を可視化するツールを作る'],
];
let c2bad = 0;
for (const [want, wish] of C2) {
  const got = chooseScale(wish);
  const ff = wish.match(PRODUCT_FALSE_FRIENDS);
  const ok = got === want;
  if (!ok) c2bad++;
  console.log(`  ${ok ? 'ok ' : '✗  '} "${wish}"  PRODUCT紛れ語=${ff ? JSON.stringify(ff[0]) : 'なし'}` +
              `  isCartography=${isCartography(wish)}  -> ${got}  (正解 ${want})`);
}
console.log(`\n  誤着: ${c2bad}/${C2.length} 件`);

// ═══ 2(d) isCounsel の経路 — 文全体無効化を直すと何が動くか ═══════════
console.log('\n═══ 2(d) isCounsel の経路(wantsProduct を呼ぶ 3 箇所) ═══\n');
console.log('  isCounsel = ' + String(isCounsel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' '));
console.log('\n  wantsProduct が **false** であることに命を預けている counsel の願い');
console.log('  (= 削ってから探す形にすると true に転じ、counsel を失う恐れがある願い):\n');
const D = [
  // 既存門 tests/route-matrix.test.js / counsel.test.js のコーパスより
  ['counsel', '人口動態を調査して報告してほしい'],
  ['counsel', '腎機能の低下を診断してほしい'],
  ['counsel', '相場を分析して所見をくれ'],
  ['counsel', '楽園の構造を調査して報告してほしい'],
  ['counsel', '二つの案の比較表がほしい'],
  ['counsel', '楽園のエンジンを監査してほしい'],
  // 紛れ語 × 諐問語(文全体無効化に守られている疑いの濃い形)
  ['counsel', '窓口の対応品質を調査して報告してほしい'],
  ['counsel', '専門店の客足を分析して所見をくれ'],
  ['counsel', '部門別の残業を集計して報告してほしい'],
  ['counsel', '認知機能の検査結果を診断してほしい'],
  ['counsel', '相談件数の推移を分析してほしい'],
  ['counsel', '入門講座の効果を検討して'],
];
const stripOne = w => String(w).replace(new RegExp(PRODUCT_FALSE_FRIENDS.source, 'g'), ' ');
let moved = 0;
for (const [want, wish] of D) {
  const got = chooseScale(wish);
  const d = denude(wish);
  const wpNow = wantsProduct(d);
  const s = stripOne(d);
  const wpAfter = PRODUCT_STRONG_RE.test(s) || (PRODUCT_RE.test(s) && !PRODUCT_FALSE_FRIENDS.test(s));
  const willMove = wpNow !== wpAfter;
  if (willMove) moved++;
  console.log(`  ${got === want ? 'ok ' : '✗  '} "${wish}"  -> ${got}  (正解 ${want})`);
  console.log(`        wantsProduct 現在=${wpNow}  削ってから探すと=${wpAfter}  ${willMove ? '★ 変わる(counsel の道が動きうる)' : '変わらない'}`);
  if (willMove) console.log(`        削った文= "${s.replace(/\s+/g, ' ').trim()}"`);
}
console.log(`\n  wantsProduct の値が変わる願い: ${moved}/${D.length} 件`);
