#!/usr/bin/env node
/**
 * PARA-10 実測: `REFORM_RE` の **全ての印** が他語に埋もれるか。
 * 各印につき「世間の願い(楽園の改修ではない)」を作り、chooseScale が reform へ
 * 攫うかを数える。⚠️ 判定器は一行も変えない。撃って数えるだけ。
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const forgePath = process.env.PROBE_FORGE || path.join(ROOT, 'graph', 'forge.js');
const forge = require(forgePath);
const { chooseScale, REFORM_RE } = forge;

// 印ごとの「世間の願い」と、その願いの正解の道
// 正解は既存門のコーパスの前例に従う:
//   アプリ/システム/製品/プラットフォーム → full  /  ツール/コマンド → standard
//   図を求める → cartography  /  調査・分析を求める → counsel  /  直す → quick
const SIGNS = [
  ['楽園', [
    ['full', '常夏の楽園を巡るリゾート予約アプリが欲しい'],
    ['standard', '楽園ビーチの写真を並べる機能を実装して'],
  ]],
  ['paradise', [
    ['standard', 'build a fan wiki for paradise lost'],
    ['full', 'i want a travel booking app for paradise island resorts'],
  ]],
  ['ハーネス', [
    ['full', '登山用ハーネスの通販サイトを作れ'],
    ['standard', '安全ハーネスの点検記録を付ける機能を実装して'],
  ]],
  ['harness', [
    ['standard', 'implement an inventory importer for climbing harness stock'],
    ['full', 'build a safety harness inspection app'],
  ]],
  ['憲法', [
    ['full', '日本国憲法の条文を検索できるアプリが欲しい'],
    ['counsel', '各国の憲法の前文を比較表がほしい'],
  ]],
  ['constitution', [
    ['standard', 'create a full-text search index for the us constitution'],
    ['full', 'build a constitution quiz app for students'],
  ]],
  ['engine', [
    ['standard', 'implement a search engine result parser'],
    ['full', 'build a civil engineering estimate app'],
    ['standard', 'create a listing page for used car engine parts'],
  ]],
  ['エンジン', [
    ['full', '検索エンジンの順位を追うアプリが欲しい'],
    ['standard', 'エンジンオイルの交換履歴を記録する機能を実装して'],
  ]],
  ['門', [
    ['full', '一門の家系図を作れるアプリが欲しい'],
    ['full', '専門店の在庫を管理するシステムを作って'],
    ['standard', '部門別の売上を集計するコマンドを実装して'],
    ['full', '名門校の受験対策アプリが欲しい'],
    ['standard', '入門講座の進捗を記録する機能を実装して'],
  ]],
  ['gate', [
    ['standard', 'implement a gateway timeout retry helper'],
    ['full', 'build an app to investigate delegate voting records'],
    ['standard', 'create a script to aggregate the daily sales rows'],
    ['standard', 'implement a navigate-back button for the wizard'],
  ]],
  ['パイプライン', [
    ['full', '石油パイプラインの保守記録システムを作って'],
    ['standard', 'データパイプラインの実行ログを表示する機能を実装して'],
  ]],
  ['pipeline', [
    ['standard', 'implement a sales pipeline stage filter'],
    ['full', 'build a crm app with a deal pipeline view'],
  ]],
  ['自己改善', [
    ['full', '自己改善の習慣を記録するアプリが欲しい'],
    ['standard', '自己改善のチェックリスト機能を実装して'],
  ]],
  ['self-improve', [
    ['standard', 'implement a self-improvement streak counter'],
    ['full', 'build a self-improvement journal app'],
  ]],
  ['オーケストレーション', [
    ['full', 'コンテナオーケストレーションの監視ダッシュボードを作って'],
    ['standard', '音楽のオーケストレーション譜面を印刷する機能を実装して'],
  ]],
  ['orchestration', [
    ['standard', 'implement a kubernetes orchestration status widget'],
    ['full', 'build a container orchestration cost dashboard product'],
  ]],
  ['枢機卿', [
    ['full', 'カトリック枢機卿の一覧を引けるアプリが欲しい'],
    ['standard', '枢機卿の選挙結果を取り込むコマンドを実装して'],
  ]],
  ['cardinal', [
    ['standard', 'implement a cardinal direction compass widget'],
    ['full', 'build a birdwatching app for spotting a cardinal'],
  ]],
  ['神官', [
    ['full', '神社の神官の当番表を管理するアプリが欲しい'],
    ['standard', '神官の装束の在庫を数えるコマンドを実装して'],
  ]],
  ['priest', [
    ['standard', 'implement a parish priest schedule importer'],
    ['full', 'build a priesthood directory app for the diocese'],
  ]],
];

let totalWish = 0, misfire = 0;
const perSign = [];
console.log('forge: ' + forgePath);
console.log('REFORM_RE: ' + REFORM_RE);
console.log('\n═══ PARA-10: REFORM_RE の各印が「他語に埋もれる」か ═══\n');
for (const [sign, wishes] of SIGNS) {
  let bad = 0;
  const rows = [];
  for (const [want, wish] of wishes) {
    totalWish++;
    const got = chooseScale(wish);
    const hit = wish.match(REFORM_RE);
    const isBad = got === 'reform' && want !== 'reform';
    if (isBad) { bad++; misfire++; }
    rows.push(`    ${isBad ? '✗ 誤着' : 'ok   '} "${wish}"\n           REFORM_RE一致=${hit ? JSON.stringify(hit[0]) + '@' + hit.index : 'なし'}  -> ${got}  (正解 ${want})`);
  }
  perSign.push([sign, bad, wishes.length]);
  console.log(`  【印 "${sign}"】 紛れの誤着 ${bad}/${wishes.length}`);
  console.log(rows.join('\n'));
  console.log('');
}
console.log('═══ 印ごとのまとめ ═══');
console.log('印'.padEnd(24) + '誤着/試行   危うさ');
for (const [s, b, n] of perSign) {
  console.log(String(s).padEnd(24) + `${b}/${n}`.padStart(7) + '     ' + (b ? '★ 危うい' : '安全'));
}
console.log(`\n合計: ${misfire}/${totalWish} 件が reform へ誤着`);
console.log(`危うい印: ${perSign.filter(x => x[1]).map(x => x[0]).join(', ') || '(無し)'}`);
console.log(`安全な印: ${perSign.filter(x => !x[1]).map(x => x[0]).join(', ')}`);
