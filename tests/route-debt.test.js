#!/usr/bin/env node
/**
 * PARADISE :: ROUTE DEBT — 未払いの誤着を **名前付きで凍らせる** 門 (AC-7 / 第16条)
 *
 * ── これは xfail の門である ──────────────────────────────────────────
 * 走行 `reform/judgment-triad` は PARA-7 / PARA-9 を直したが、
 * **PARA-10 / PARA-11 は直さないと裁定した**(requirements.md §3.4)。
 *
 * ★ **その 2 件は走行 `reform/weak-signs` が払った(2026-09-17)。**
 *   `DEBT` は今 **空**である。空であることは「残債が無い」の意であって、
 *   「門を捨ててよい」の意ではない —— **この門は次の残債の受け皿として残す**
 *   (第44条の結線 / `tribunal.yml` に結線済み)。
 *   D-1 / D-3 は残債 0 件のとき **skip を名乗って**通る(第58条(e))。
 *   黙って `return` すれば「0 件だから緑」が見えなくなる。
 *
 * **黙って外すことは許さない**(第16条: 既定への沈黙の落下を禁じる)。
 * ゆえにこの門は **誤った振る舞いを「誤りである」と名指しして凍らせる**。
 *
 *   ⚠️ **これは門を緩めていない。** 緩めるとは既存の的を落とすことであり、
 *      ここでは一件も落ちていない(既存門の FLOOR は本走行で上げてある)。
 *
 *   ★ 誰かが凍らせた残債を直した瞬間、D-1 / D-3 が **赤くなる**。
 *     **赤くなることがこの門の仕事である。** そのとき debt.md §4 の手順に従い、
 *     当該の的を tests/route-matrix.test.js の本コーパスへ昇格させ、FLOOR を上げ、
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
 * 凍らせる残債。**`debt.md` の表と一字一句同じでなければならない**(D-5 が撃つ)。
 *   actual = 今の判定器が返す道(誤り)  /  correct = 本来の道
 *
 * ⚠️ **reform/weak-signs で PARA-10 / PARA-11 を払ったので空である。**
 *    空であることは「残債が無い」の意であって、「門を捨ててよい」の意ではない ——
 *    次の残債(PARA-12 等)が生まれたらここへ足せ。D-4/D-5 は空でも門番として働く。
 *    払った経緯は `reform/judgment-triad/debt.md` §2 と
 *    `reform/weak-signs/design.md` §4.2 に在る。
 */
const DEBT = [];
const PAID = '残債が払われた。debt.md §4 の手順に従い、この願いを ' +
  'tests/route-matrix.test.js の本コーパスへ full として昇格させ、' +
  '同じ commit で W-1 の FLOOR と総数の下限を上げ、debt.md と本門の DEBT から消せ。';

// ══════════════════════════════════════════════════════════════════════
// D-1 — 症状を凍らせる(件数が変わっても門が壊れないよう DEBT を回す形へ統合した。
//       旧 D-1 / D-2 は PARA-10 / PARA-11 を個別に撃っていたが、
//       両件とも reform/weak-signs で払われたので的が無い)
// ══════════════════════════════════════════════════════════════════════

test('D-1 [残債]: 凍らせた誤着は今なお誤着のままである', () => {
  if (!DEBT.length) {
    console.log('      · skip: 残債 0 件 — 払い終えている(reform/weak-signs で PARA-10 / PARA-11)');
    return;
  }
  for (const d of DEBT) {
    assert.strictEqual(forge.chooseScale(d.wish), d.actual,
      `${d.tag}: 「${d.wish}」の道が ${d.actual} から動いた(正解は ${d.correct})—— ` + PAID);
  }
});

// ══════════════════════════════════════════════════════════════════════
// D-3 — **症状ではなく原因を凍らせる**(第58条の作法)
//
// 症状(chooseScale の返り値)だけを凍らせると、原因が別物に入れ替わっても
// 門は黙る。残債の名は「どの規則がどう当たっているか」であって、
// 「どこへ着くか」ではない。
//
// ⚠️ **skip は名乗って通す**(第58条(e))。黙って return すれば
//    「0 件だから緑」が見えなくなる。`|| true` で黙らせるな(第21条)。
// ══════════════════════════════════════════════════════════════════════

test('D-3 [残債]: 原因が消えていないことを名指しで確かめる', () => {
  if (!DEBT.length) {
    console.log('      · skip: 残債 0 件 — 原因を凍らせる的が無い');
    return;
  }
  for (const d of DEBT) {
    // 残債ごとの原因 assert(足すときに書く)。
    // 症状だけを凍らせた残債は、原因が入れ替わった日に黙る。
    assert.ok(d.cause, `${d.tag}: 残債に原因が書かれていない —— 症状だけを凍らせるな(第58条)`);
    assert.ok(d.cause(forge), `${d.tag}: 原因が消えた —— ` + PAID);
  }
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

test('D-4 [門番]: debt.md が実在し、残債を名指しで載せている', () => {
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
