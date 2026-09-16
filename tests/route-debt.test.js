#!/usr/bin/env node
/**
 * PARADISE :: ROUTE DEBT — 未払いの誤着を **名前付きで凍らせる** 門 (AC-7 / 第16条)
 *
 * ── これは xfail の門である ──────────────────────────────────────────
 * 走行 `reform/judgment-triad` は PARA-7 / PARA-9 を直したが、
 * **PARA-10 / PARA-11 は直さないと裁定した**(requirements.md §3.4)。
 * 理由は `reform/judgment-triad/debt.md` に書いてある ——
 * 別の病であり、一行では済まず、`REFORM_RE` の再設計は別走行の主題である。
 *
 * **黙って外すことは許さない**(第16条: 既定への沈黙の落下を禁じる)。
 * ゆえにこの門は **誤った振る舞いを「誤りである」と名指しして凍らせる**。
 *
 *   ⚠️ **これは門を緩めていない。** 緩めるとは既存の的を落とすことであり、
 *      ここでは一件も落ちていない(既存門の FLOOR は本走行で上げてある)。
 *
 *   ★ 誰かが PARA-10 / PARA-11 を直した瞬間、D-1〜D-3 が **赤くなる**。
 *     **赤くなることがこの門の仕事である。** そのとき debt.md §4 の手順に従い、
 *     2 件を tests/route-matrix.test.js の本コーパスへ昇格させ、FLOOR を上げ、
 *     この門と debt.md の両方から消せ。
 *
 *   node tests/route-debt.test.js     # exit 0 = 残債は残債のまま名前付きで在る
 *
 * ⚠️ この門を `|| true` で黙らせて払ったことにするな(第21条)。
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const forge = require(path.join(ROOT, 'graph', 'forge.js'));
const DEBT_MD = path.join(ROOT, 'reform', 'judgment-triad', 'debt.md');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); pass++; }
  catch (e) { console.log('  \u2717 ' + name + '\n      ' + String(e.message).split('\n').join('\n      ')); fail++; }
}

/**
 * 凍らせる 2 件。**`debt.md` の表と一字一句同じでなければならない**(D-5 が撃つ)。
 *   actual = 今の判定器が返す道(誤り)  /  correct = 本来の道
 */
const DEBT = [
  { tag: 'PARA-10', wish: '一門の家系図を作れるアプリが欲しい', actual: 'reform', correct: 'full' },
  { tag: 'PARA-11', wish: '相関図を描けるアプリを作って', actual: 'cartography', correct: 'full' },
];
const PAID = '残債が払われた。debt.md §4 の手順に従い、この願いを ' +
  'tests/route-matrix.test.js の本コーパスへ full として昇格させ、' +
  '同じ commit で W-1 の FLOOR と総数の下限を上げ、debt.md と本門の DEBT から消せ。';

// ══════════════════════════════════════════════════════════════════════
// D-1 / D-2 — 症状を凍らせる
// ══════════════════════════════════════════════════════════════════════

test('D-1 [残債 PARA-10]: 一門の家系図…は今なお reform へ落ちる', () => {
  const d = DEBT[0];
  assert.strictEqual(forge.chooseScale(d.wish), d.actual,
    `${d.tag}: 「${d.wish}」の道が ${d.actual} から動いた(正解は ${d.correct})—— ` + PAID);
});

test('D-2 [残債 PARA-11]: 相関図を描けるアプリ…は今なお cartography へ落ちる', () => {
  const d = DEBT[1];
  assert.strictEqual(forge.chooseScale(d.wish), d.actual,
    `${d.tag}: 「${d.wish}」の道が ${d.actual} から動いた(正解は ${d.correct})—— ` + PAID);
});

// ══════════════════════════════════════════════════════════════════════
// D-3 — **症状ではなく原因を凍らせる**(第58条の作法)
//
// 症状(chooseScale の返り値)だけを凍らせると、原因が別物に入れ替わっても
// 門は黙る。残債の名は「どの規則がどう当たっているか」であって、
// 「どこへ着くか」ではない。
// ══════════════════════════════════════════════════════════════════════

test('D-3 [残債]: 原因が消えていないことを名指しで確かめる', () => {
  // PARA-10 の原因: REFORM_RE の弱い印「門」が「一**門**」に当たる。
  const hit = (DEBT[0].wish.match(forge.REFORM_RE) || [])[0] || '';
  assert.match(hit, /^門$/,
    `PARA-10 の原因が変わった: REFORM_RE の当たりが "${hit}" である(かつては "門")—— ` +
    'reform の道 15 件を行列で撃ち直したうえで debt.md を書き換えよ');
  // PARA-11 の原因: 「相関図」が紛れ語に当たり、文全体(= 同じ文の「アプリ」)を無効化する。
  assert.strictEqual(forge.PRODUCT_FALSE_FRIENDS.test(DEBT[1].wish), true,
    'PARA-11 の原因が消えた: PRODUCT_FALSE_FRIENDS がこの願いに当たらなくなった —— ' + PAID);
});

// ══════════════════════════════════════════════════════════════════════
// 門番 —— 帳と門がずれたら鳴る (第16条 / 第22条)
// ══════════════════════════════════════════════════════════════════════

/** debt.md の残債表から `| **PARA-n** | 名 | `願い` | 現状 | 正解 | …` を読む。 */
function readDebtTable() {
  const src = fs.readFileSync(DEBT_MD, 'utf8');
  const rows = [];
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^\|\s*\*\*(PARA-\d+)\*\*\s*\|[^|]*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/);
    if (m) rows.push({ tag: m[1], wish: m[2], actual: m[3], correct: m[4] });
  }
  return { src, rows };
}

test('D-4 [門番]: debt.md が実在し、2 件を名指しで載せている', () => {
  assert.ok(fs.existsSync(DEBT_MD),
    `reform/judgment-triad/debt.md が無い —— 外した的を黙って消したことになる(第16条)。` +
    '残債は「返す」か「返さないと宣言して名を付ける」かの二つしかない');
  const { src, rows } = readDebtTable();
  for (const d of DEBT) {
    assert.ok(src.includes(d.tag), `debt.md が ${d.tag} を名指していない`);
    assert.ok(src.includes(d.wish),
      `debt.md に ${d.tag} の願い「${d.wish}」がそのまま載っていない —— ` +
      '札だけ在って願いが無い帳は、名前だけで中身が無い(第16条)');
  }
  assert.strictEqual(rows.length, DEBT.length,
    `debt.md の残債表が ${rows.length} 行である(門は ${DEBT.length} 件を凍らせている)`);
});

test('D-5 [門番]: debt.md の願いは、この門が撃っている願いと一字一句同じ', () => {
  // 帳と門がずれたら鳴る。数も文も**測定から**取る(第22条)。
  const { rows } = readDebtTable();
  const norm = a => a.map(x => `${x.tag}|${x.wish}|${x.actual}|${x.correct}`).sort();
  assert.deepStrictEqual(norm(rows), norm(DEBT),
    '帳(debt.md の表)と門(DEBT 配列)がずれている —— ' +
    '片方だけを書き換えれば、残債は静かに姿を変える。両方を同じ commit で動かせ:\n' +
    '  帳: ' + norm(rows).join('\n      ') + '\n' +
    '  門: ' + norm(DEBT).join('\n      '));
});

console.log(`\nRoute debt self-test: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
