#!/usr/bin/env node
/**
 * PARADISE :: REFORM SIGN — 弱い印「楽園の抽象名」の**当たり方**を撃つ門
 *   (reform/weak-signs / AC-1 / AC-2 / AC-3 / AC-5 / AC-8)
 *
 * ── これは**緑であるべき門**である ────────────────────────────────
 * 対になる `tests/reform-reach.test.js` は誤りを誤りのまま凍らせる xfail の門である。
 * 性質が正反対なので**分けてある**(requirements.md §3.5)。混ぜるな。
 *
 * 何を撃つか:
 *   S-1 [種M]   語中に埋没した印は楽園を名乗らない(日 8 件 + 英 8 件 / AC-1)
 *   S-2 [PARA-11] 紛れ語は同じ文の強い産物名を巻き添えにしない(AC-2)
 *   S-3 [門番]   紛れ語表は「門」の複合語だけを持つ(第60条 / AC-3)
 *   S-4 [逆向き] 楽園の願いは reform を失わない(第60条(b) の両枝 / AC-5)
 *   S-5 [作図]   図を作る産物は図そのものではない(AC-8 / 枝E)
 *   S-6 [諐問]   紛れ語を含む諐問の願いは counsel を失わない(AC-8 / 枝D / NFR-7)
 *
 *   node tests/reform-sign.test.js
 *
 * ⚠️ この門を `|| true` で黙らせるな(第21条)。
 */
'use strict';
const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const forge = require(path.join(ROOT, 'graph', 'forge.js'));

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); pass++; }
  catch (e) { console.log('  \u2717 ' + name + '\n      ' + String(e.message).split('\n').join('\n      ')); fail++; }
}

// ══════════════════════════════════════════════════════════════════════
// S-1 — 種M: 印がより長い語の**一部**として当たる形は、一件も残ってはならない
//
// ⚠️ **述語と道を対で撃つ**。`chooseScale` だけでは病が見えない ——
//    下流の段が拾い直して正しい道を返してしまう願いが在る(findings §4.5 の註)。
// ══════════════════════════════════════════════════════════════════════
const KIND_M_JA = [
  '一門の家系図を作れるアプリが欲しい', '専門店のサイトが欲しい', '部門別の集計コマンドを実装して',
  '名門校の受験対策アプリが欲しい', '入門講座の進捗を記録する機能を実装して', '門限を知らせるタイマーを実装して',
  '登竜門コンテストの投票アプリが欲しい', '専門分野の系統図を編集できるアプリが欲しい',
];
const KIND_M_EN = [
  'build a civil engineering estimate app', 'implement a gateway timeout retry helper',
  'build an app to investigate delegate voting records', 'create a script to aggregate the daily sales rows',
  'implement a navigate-back button for the wizard', 'implement a self-improvement streak counter',
  'build a self-improvement journal app', 'build a priesthood directory app for the diocese',
];
const KIND_M = [...KIND_M_JA, ...KIND_M_EN];

test('S-1 [種M]: 語中に埋没した印は楽園を名乗らない (AC-1 / 日 8 + 英 8)', () => {
  for (const wish of KIND_M) {
    assert.strictEqual(forge.isReformSubject(forge.denude(wish)), false,
      `印が語中に埋没したまま楽園を名乗った(PARA-10 の回帰): ${wish}\n` +
      '  日本語は REFORM_FALSE_FRIENDS が、英語は REFORM_EN の \\b が語境界を担う。' +
      'どちらかが壊れている');
    assert.notStrictEqual(forge.chooseScale(wish), 'reform',
      `語中に埋没した印のせいで、世間の願いが改革の道へ攫われた: ${wish}`);
  }
  // **両枝を持つ**(第60条(b)): 日英それぞれが 8 件以上在ることを門自身が数える。
  // 片方の配列を空にして緑にする道を塞ぐ(門番が絞り込みの対象なら門番ではない)。
  assert.ok(KIND_M_JA.length >= 8 && KIND_M_EN.length >= 8,
    `種M の的が日 ${KIND_M_JA.length} 件 / 英 ${KIND_M_EN.length} 件に減っている —— 各 8 件を下回るな`);
});

// ══════════════════════════════════════════════════════════════════════
// S-2 — PARA-11: 紛れ語は同じ文の強い産物名を巻き添えにしない
//
// ⚠️ **述語を直に撃つ**。`chooseScale` では下流の段が拾い直すので病が見えない。
// ══════════════════════════════════════════════════════════════════════
/**
 * ⚠️ **的は「強い産物名が `PRODUCT_STRONG_RE` に実在する」願いだけを載せる**(design 相の実測)。
 *    `専門店のサイトが欲しい` を最初この配列に入れたが、**基準線でも `wantsProduct=false`** だった ——
 *    `サイト` は `PRODUCT_RE` にも `PRODUCT_STRONG_RE` にも居らず、`full` は別の段(PARA-7)が
 *    決めているからである。PARA-11 の症状ではないので外した。
 *    載せてよいのは「紛れ語を削れば `PRODUCT_STRONG_RE` が当たる」願いに限る。
 */
const P11_FAMILY = [
  ['full', '相関図を描けるアプリを作って'],
  ['standard', '人口分布の構成図を出力するツールを作る'],
  ['standard', '窓口の導線を図示するコマンドを実装して'],
  ['standard', '相場の推移を可視化するツールを作る'],
  ['full', '人口動態のアプリが欲しい'],
  ['standard', '部門別の集計コマンドを実装して'],
  ['full', '名門校の受験対策アプリが欲しい'],
];

test('S-2 [PARA-11]: 紛れ語は同じ文の強い産物名を巻き添えにしない (AC-2)', () => {
  for (const [want, wish] of P11_FAMILY) {
    assert.strictEqual(forge.wantsProduct(forge.denude(wish)), true,
      `紛れ語が文全体を無効化し、同じ文の強い産物名まで死んだ(PARA-11 の回帰): ${wish}\n` +
      '  wantsProduct は「紛れ語の一致箇所を**削ってから**強い名を探す」形であること。' +
      '`if (PRODUCT_FALSE_FRIENDS.test(w)) return false;` を先頭に戻すと必ずここが鳴る');
    assert.strictEqual(forge.chooseScale(wish), want, `${wish} の道が ${want} でない`);
  }
});

// ══════════════════════════════════════════════════════════════════════
// S-3 — 【第60条の門番】紛れ語表は「門」の複合語だけを持つ
//
// **これは「表を足せば緑になる」道を機械的に塞ぐ門である。**
// `tests/reform-reach.test.js` の xfail を迂回して射程帳の的を表で暗記しようとすれば、
// この門が鳴る。人の目に頼らない(NFR-5)。
// ══════════════════════════════════════════════════════════════════════
test('S-3 [門番 / 第60条]: 紛れ語表は「門」の複合語だけを持つ (AC-3)', () => {
  assert.ok(forge.REFORM_FALSE_FRIENDS instanceof RegExp,
    'REFORM_FALSE_FRIENDS が export されていない —— 表を門から検められない');
  const entries = forge.REFORM_FALSE_FRIENDS.source.split('|');
  for (const e of entries) {
    assert.ok(e.includes('門'),
      `REFORM_FALSE_FRIENDS に「門」を含まない語 "${e}" が入った —— ` +
      'この表は日本語に \\b が無いことの代用であって、同音異義の的を暗記する場所ではない(第60条)。' +
      '種H を表で塞ごうとするな。塞げないものは reform/weak-signs/reach.md へ載せよ');
    assert.ok(!/[a-z]/i.test(e),
      `英語の語 "${e}" が紛れ語表に入った —— 英語は REFORM_EN の \\b で守れ。表に入れるな(第60条(b))`);
    // 長い紛れ語は文の骨まで削る(requirements §3.3: full→standard の新規誤着)
    assert.ok(e.length <= 4,
      `紛れ語 "${e}" が ${e.length} 字ある —— 長い語は削った跡に産物の名を残さず、` +
      'full の願いを standard へ落とす(reform/weak-signs/requirements.md §3.3)');
  }
  // 表が骨抜きにされていないこと(空にして緑にする道を塞ぐ / 第21条)
  assert.ok(entries.length >= 21,
    `紛れ語表が ${entries.length} 項に減っている(下限 21)—— ` +
    '減らすなら S-1 の的が全件緑のままであることを確かめ、理由を書け');
  // 本物の門の語が表に入っていないこと(「門」一字だけの項は全ての門を殺す)
  assert.ok(!entries.includes('門'),
    '紛れ語表に「門」一字の項が入った —— 本物の門まで削られ、楽園の願いが reform を失う');
});

// ══════════════════════════════════════════════════════════════════════
// S-4 — 逆向き: 楽園の願いは reform を一件も失わない(第60条(b) の両枝 / AC-5)
// ══════════════════════════════════════════════════════════════════════
const PARADISE_WISHES = [
  '門の閾値を上げよ', '楽園のパイプラインに一段を足せ', '憲法の条を一つ加えよ',
  '神官の召し方を書き換えろ', '枢機卿の割り当てを直せ', 'ハーネスの結線を張り直せ',
  'add a guard to the gate', 'extend the paradise engine with a heartbeat endpoint',
  '自己改善の輪に一段を足す',
];

test('S-4 [逆向き]: 楽園の願いは reform を失わない (AC-5 / 第60条(b))', () => {
  for (const wish of PARADISE_WISHES) {
    assert.strictEqual(forge.chooseScale(wish), 'reform',
      `楽園の願いが改革の道を失った —— 紛れ語表か \\b が広すぎる: ${wish}`);
  }
  // ⚠️ **既知の 1 件を黙って落とさない**(第16条)。除外せず、`counsel` を期待する形で撃つ。
  //    `audit` が COUNSEL_EN に当たり、counsel が reform より先に立つ **既知の設計**である
  //    (findings §4.5: 基準線 B0 を含む全候補で同じ)。本走行の病ではない。
  //    直すなら別走行。ここを `reform` に変えたくなったら、まず判定順を動かす代価を測れ。
  assert.strictEqual(forge.chooseScale('wire the orchestration pipeline to the audit ledger'), 'counsel',
    '既知の設計が変わった —— `audit` が COUNSEL_EN に当たり counsel が reform より先に立つ形が' +
    '崩れた。良くなったのなら reform/weak-signs/requirements.md §5 の申し送りを書き換えよ');
});

// ══════════════════════════════════════════════════════════════════════
// S-5 — 作図: 図を**作る産物**は図そのものではない(AC-8 / 耐久 枝E)
// ══════════════════════════════════════════════════════════════════════
const CARTO_PRODUCTS = [
  ['full', '専門用語の関連図を描けるアプリが欲しい'],
  ['standard', '窓口ごとの構成図を出力するツールを作る'],
  ['full', '人口ピラミッドの図解アプリが欲しい'],
  ['standard', '相場の変動を図示するコマンドを実装して'],
  ['full', '部門の階層図を編集できるアプリが欲しい'],
  ['standard', '口座の資金の流れをフロー図にする機能を実装して'],
  ['full', '相続関係の系統図を作れるアプリが欲しい'],
  ['standard', '入口の人流を可視化するツールを作る'],
];

test('S-5 [作図]: 図を作る産物は図そのものではない (AC-8 / 枝E)', () => {
  for (const [want, wish] of CARTO_PRODUCTS) {
    assert.strictEqual(forge.chooseScale(wish), want,
      `紛れ語が isCartography の打ち消しを殺し、図一枚で返された: ${wish}\n` +
      '  isCartography も wantsProduct と**同じ形**(削ってから強い名を探す)であること');
  }
  // 逆向き: 本物の作図の願いは cartography を失わない(触ってはならない側 / R-6 R-7)
  for (const wish of ['楽園の位階の相関図を作れ', '楽園の相の系統図を描いてほしい', '一族の系統図を描いてほしい']) {
    assert.strictEqual(forge.chooseScale(wish), 'cartography',
      `本物の作図の願いが作図の道を失った —— 打ち消しが強すぎる: ${wish}`);
  }
  // ⚠️ `isCartography` の onlyWeak の行(DIAGRAM_FALSE_FRIENDS 側)は健全である。触るな。
  assert.strictEqual(forge.chooseScale('意図を汲んで実装せよ'), 'standard',
    'DIAGRAM_FALSE_FRIENDS の onlyWeak の行が壊れた —— 「意図」が作図の道へ落ちた。' +
    'この行は基準線で 8/8 健全である(findings §2(c)-1)。揃えようとして書き換えるな');
});

// ══════════════════════════════════════════════════════════════════════
// S-6 — 諐問: 紛れ語を含む counsel の願いは counsel を失わない
//        (NFR-7: 削る単位は「一致箇所ごと全体」。部分削除をすればここが鳴る)
// ══════════════════════════════════════════════════════════════════════
const COUNSEL_WISHES = [
  '窓口の応対を診断してほしい', '入口の動線は妥当か', '相場の先行きはどうすべきか',
  '人口の偏りを診断してほしい', '出口戦略の見直しは要るか', '口座の整理は妥当か',
  '肝機能の値を診断してほしい', '真相の究明は必要か', '相互扶助の仕組みを見直すべきではないか',
  '登竜門の難度は妥当か',
];

test('S-6 [諐問]: 紛れ語を含む諐問の願いは counsel を失わない (AC-8 / 枝D / NFR-7)', () => {
  for (const wish of COUNSEL_WISHES) {
    assert.strictEqual(forge.chooseScale(wish), 'counsel',
      `紛れ語を**部分的に**削ったため一字の名(口/相)が残り、産物の依頼と誤読された: ${wish}\n` +
      '  削る単位は「紛れ語の一致箇所ごと全体」である(NFR-7 / findings §2(d))');
  }
});

console.log(`\nReform sign self-test: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
