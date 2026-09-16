#!/usr/bin/env node
/**
 * PARADISE :: REFORM REACH — 弱い印の**射程**を名前付きで凍らせる門
 *   (reform/weak-signs / AC-4 / 第16条)
 *
 * ── これは xfail の門である ──────────────────────────────────────────
 * 走行 `reform/weak-signs` は PARA-10 / PARA-11 の**語境界の病**を直し、
 * 受け入れ帳 140 件で対角 140/140・非対角 0/30 に到達した。
 * だが **32 件だけ**は直せない —— 印が**独立した語**として当たる同音異義であり
 * (`常夏の**楽園**` / `検索**エンジン**` / `カトリック**枢機卿**`)、
 * 語境界の修理では原理的に触れないからである(reform/weak-signs/reach.md §3)。
 *
 * 表を足せば本コーパスでは緑になる。**だがそれは答案の暗記であって修理ではない。**
 * 第60条が名指しで禁じた形であり、コーパスの外には一切効かない
 * (実測: 表を膨らませた形の耐久 43/48 < 表を「門」の複合語だけに絞った形 44/48)。
 *
 * **黙って外すことは許さない**(第16条: 既定への沈黙の落下を禁じる)。
 * ゆえにこの門は **塞げない病を「塞げない」と名指しして凍らせる**。
 *
 *   ⚠️ **これは門を緩めていない。** 緩めるとは既存の的を落とすことであり、
 *      ここでは一件も落ちていない —— 32 件は本走行の discover 相が自ら発明した的であり、
 *      既存門 `tests/route-matrix.test.js` の本コーパスにも `tests/counsel.test.js` にも
 *      一件も含まれない。既存門の FLOOR は本走行で**上げる**ことしかしていない。
 *
 *   ★ 誰かが射程を詰めた瞬間、R-1 が **赤くなる**。
 *     **赤くなることがこの門の仕事である。** そのとき reach.md §4 の手順に従え。
 *
 *   node tests/reform-reach.test.js   # exit 0 = 射程は射程のまま名前付きで在る
 *
 * ⚠️ この門を `|| true` で黙らせて払ったことにするな(第21条)。
 * ⚠️ `REFORM_FALSE_FRIENDS` にこれらの願いを書き足して緑にするな ——
 *    `tests/reform-sign.test.js` の S-3 が機械でその道を塞いでいる(表の全項が「門」を含むこと)。
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const forge = require(path.join(ROOT, 'graph', 'forge.js'));
const REACH_MD = path.join(ROOT, 'reform', 'weak-signs', 'reach.md');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); pass++; }
  catch (e) { console.log('  \u2717 ' + name + '\n      ' + String(e.message).split('\n').join('\n      ')); fail++; }
}

/**
 * 凍らせる 32 件。**`reach.md` の表と一字一句同じでなければならない**(R-5 が撃つ)。
 *   sign = REFORM_RE の当たった印 / actual = 今の判定器が返す道(誤り) / correct = 本来の道
 */
const REACH = [
  { sign: '楽園', wish: '常夏の楽園を巡るリゾート予約アプリが欲しい', actual: 'reform', correct: 'full' },
  { sign: '楽園', wish: '楽園ビーチの写真を並べる機能を実装して', actual: 'reform', correct: 'standard' },
  { sign: 'paradise', wish: 'build a fan wiki for paradise lost', actual: 'reform', correct: 'standard' },
  { sign: 'paradise', wish: 'i want a travel booking app for paradise island resorts', actual: 'reform', correct: 'full' },
  { sign: 'ハーネス', wish: '登山用ハーネスの通販サイトを作れ', actual: 'reform', correct: 'full' },
  { sign: 'ハーネス', wish: '安全ハーネスの点検記録を付ける機能を実装して', actual: 'reform', correct: 'standard' },
  { sign: 'harness', wish: 'implement an inventory importer for climbing harness stock', actual: 'reform', correct: 'standard' },
  { sign: 'harness', wish: 'build a safety harness inspection app', actual: 'reform', correct: 'full' },
  { sign: '憲法', wish: '日本国憲法の条文を検索できるアプリが欲しい', actual: 'reform', correct: 'full' },
  { sign: 'constitution', wish: 'create a full-text search index for the us constitution', actual: 'reform', correct: 'standard' },
  { sign: 'constitution', wish: 'build a constitution quiz app for students', actual: 'reform', correct: 'full' },
  { sign: 'engine', wish: 'implement a search engine result parser', actual: 'reform', correct: 'standard' },
  { sign: 'engine', wish: 'create a listing page for used car engine parts', actual: 'reform', correct: 'standard' },
  { sign: 'エンジン', wish: '検索エンジンの順位を追うアプリが欲しい', actual: 'reform', correct: 'full' },
  { sign: 'エンジン', wish: 'エンジンオイルの交換履歴を記録する機能を実装して', actual: 'reform', correct: 'standard' },
  { sign: 'パイプライン', wish: '石油パイプラインの保守記録システムを作って', actual: 'reform', correct: 'full' },
  { sign: 'パイプライン', wish: 'データパイプラインの実行ログを表示する機能を実装して', actual: 'reform', correct: 'standard' },
  { sign: 'pipeline', wish: 'implement a sales pipeline stage filter', actual: 'reform', correct: 'standard' },
  { sign: 'pipeline', wish: 'build a crm app with a deal pipeline view', actual: 'reform', correct: 'full' },
  { sign: '自己改善', wish: '自己改善の習慣を記録するアプリが欲しい', actual: 'reform', correct: 'full' },
  { sign: '自己改善', wish: '自己改善のチェックリスト機能を実装して', actual: 'reform', correct: 'standard' },
  { sign: 'オーケストレーション', wish: 'コンテナオーケストレーションの監視ダッシュボードを作って', actual: 'reform', correct: 'full' },
  { sign: 'オーケストレーション', wish: '音楽のオーケストレーション譜面を印刷する機能を実装して', actual: 'reform', correct: 'standard' },
  { sign: 'orchestration', wish: 'implement a kubernetes orchestration status widget', actual: 'reform', correct: 'standard' },
  { sign: 'orchestration', wish: 'build a container orchestration cost dashboard product', actual: 'reform', correct: 'full' },
  { sign: '枢機卿', wish: 'カトリック枢機卿の一覧を引けるアプリが欲しい', actual: 'reform', correct: 'full' },
  { sign: '枢機卿', wish: '枢機卿の選挙結果を取り込むコマンドを実装して', actual: 'reform', correct: 'standard' },
  { sign: 'cardinal', wish: 'implement a cardinal direction compass widget', actual: 'reform', correct: 'standard' },
  { sign: 'cardinal', wish: 'build a birdwatching app for spotting a cardinal', actual: 'reform', correct: 'full' },
  { sign: '神官', wish: '神社の神官の当番表を管理するアプリが欲しい', actual: 'reform', correct: 'full' },
  { sign: '神官', wish: '神官の装束の在庫を数えるコマンドを実装して', actual: 'reform', correct: 'standard' },
  { sign: 'priest', wish: 'implement a parish priest schedule importer', actual: 'reform', correct: 'standard' },
];

const PAID = (d) => `射程が詰まった。reach.md §4 の手順に従い、この願いを ` +
  `tests/route-matrix.test.js の本コーパスへ ${d.correct} として昇格させ、` +
  `同じ commit で W-1 の FLOOR と総数の下限を上げ、` +
  `reform/weak-signs/reach.md と本門の REACH 配列から消せ: 「${d.wish}」`;

// ══════════════════════════════════════════════════════════════════════
// R-1 — 症状を凍らせる(32 件すべてが今なお reform へ誤着する)
// ══════════════════════════════════════════════════════════════════════
test('R-1 [射程]: 種H の 32 件は今なお reform へ誤着する', () => {
  for (const d of REACH) {
    assert.strictEqual(forge.chooseScale(d.wish), d.actual, PAID(d));
  }
});

// ══════════════════════════════════════════════════════════════════════
// R-2 — **紛れ語表が文の骨を削っていないこと**(requirements §3.3 / R-9)
//
// 表に「産物の語を含む長い紛れ語」(`コンテナオーケストレーション`)を入れると、
// 削った跡に `full` を名乗らせる語が残らず、full の願いが standard へ落ちる。
// ここは AC-4 の xfail と衝突しないよう `notStrictEqual` で撃つ ——
// 「reform のまま」であることは R-1 が等号で撃っている。
// ══════════════════════════════════════════════════════════════════════
test('R-2 [射程]: 射程帳の的が standard へ落ちていない — 表が文の骨を削っていないか', () => {
  for (const d of REACH) {
    if (d.correct === 'standard') continue;   // 正解が standard の的はこの検査の対象外
    assert.notStrictEqual(forge.chooseScale(d.wish), 'standard',
      `射程帳の的が standard へ落ちた —— 紛れ語表が文の骨を削っている` +
      `(reform/weak-signs/requirements.md §3.3 / 正解は ${d.correct}): ${d.wish}`);
  }
});

// ══════════════════════════════════════════════════════════════════════
// R-3 — **症状ではなく原因を凍らせる**(第58条の作法 / route-debt.test.js の D-3 と同じ形)
//
// 症状(chooseScale の返り値)だけを凍らせると、原因が別物に入れ替わっても門は黙る。
// 射程帳に載ってよいのは**種H だけ**である —— すなわち印が**独立した語**として
// 当たっているもの。種M(語中埋没)が紛れ込んだら、それは「塞げるものを射程帳へ
// 逃がした」ことであり、第21条(門を緩めるな)違反である。
// ══════════════════════════════════════════════════════════════════════
test('R-3 [射程]: 32 件はすべて種H である — 塞げるものを逃がしていない', () => {
  for (const d of REACH) {
    const denuded = forge.denude(d.wish);
    // (i) 印が実際に当たっていること
    assert.strictEqual(forge.isReformSubject(denuded), true,
      `射程帳の的に印が当たらなくなった —— 原因が変わった: ${d.wish}`);
    // (ii) **語境界の修理を全部当てた後でも**当たること = 種H の定義
    //     紛れ語表を当てても消えない(日本語側) / \b を課しても消えない(英語側)
    const stripped = String(denuded).replace(new RegExp(forge.REFORM_FALSE_FRIENDS.source, 'gi'), ' ');
    assert.strictEqual(forge.REFORM_RE.test(stripped), true,
      `射程帳の的が語境界の修理で消える —— これは種M(塞げる病)である。` +
      `射程帳から外し、tests/route-matrix.test.js の本コーパスへ ${d.correct} として昇格させよ: ${d.wish}`);
    // (iii) 名指しした印が実際に当たっている印であること
    assert.ok(forge.REFORM_RE.test(d.sign),
      `reach.md が名指しした印 "${d.sign}" が REFORM_RE に当たらない —— 帳が古い`);
  }
});

// ══════════════════════════════════════════════════════════════════════
// 門番 —— 帳と門がずれたら鳴る (第16条 / 第22条 / route-debt.test.js の D-4/D-5 と同じ形)
// ══════════════════════════════════════════════════════════════════════

/** reach.md の表から `| n | `印` | `願い` | `現状` | `正解` |` を読む。 */
function readReachTable() {
  const src = fs.readFileSync(REACH_MD, 'utf8');
  const rows = [];
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^\|\s*\d+\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/);
    if (m) rows.push({ sign: m[1], wish: m[2], actual: m[3], correct: m[4] });
  }
  return { src, rows };
}

test('R-4 [門番]: reach.md が実在し、32 件を名指しで載せている', () => {
  assert.ok(fs.existsSync(REACH_MD),
    'reform/weak-signs/reach.md が無い —— 外した的を黙って消したことになる(第16条)。' +
    '射程は「詰める」か「詰められないと宣言して名を付ける」かの二つしかない');
  const { src, rows } = readReachTable();
  for (const d of REACH) {
    assert.ok(src.includes(d.wish),
      `reach.md に願い「${d.wish}」がそのまま載っていない —— ` +
      '門だけ在って帳に無い的は、明日黙って消せる(第16条)');
  }
  assert.strictEqual(rows.length, REACH.length,
    `reach.md の射程表が ${rows.length} 行である(門は ${REACH.length} 件を凍らせている)`);
});

test('R-5 [門番]: reach.md の願いは、この門が撃っている願いと一字一句同じ', () => {
  const { rows } = readReachTable();
  const norm = a => a.map(x => `${x.sign}|${x.wish}|${x.actual}|${x.correct}`).sort();
  assert.deepStrictEqual(norm(rows), norm(REACH),
    '帳(reach.md の表)と門(REACH 配列)がずれている —— ' +
    '片方だけを書き換えれば、射程は静かに姿を変える。両方を同じ commit で動かせ');
});

test('R-6 [門番]: 射程帳は既存門のコーパスを一件も攫っていない (第21条)', () => {
  // **帳を分けることが門を緩める言い訳になっていない**ことを機械で撃つ。
  // 射程帳の的が既存門のコーパスに在れば、それは「既存の的を外して緑にした」ことになる。
  const matrixSrc = fs.readFileSync(path.join(ROOT, 'tests', 'route-matrix.test.js'), 'utf8');
  const counselSrc = fs.readFileSync(path.join(ROOT, 'tests', 'counsel.test.js'), 'utf8');
  for (const d of REACH) {
    assert.ok(!matrixSrc.includes(d.wish),
      `射程帳の的が tests/route-matrix.test.js の本コーパスに在る —— ` +
      `既存の的を別帳へ逃がして緑にしたことになる(第21条): ${d.wish}`);
    assert.ok(!counselSrc.includes(d.wish),
      `射程帳の的が tests/counsel.test.js に在る —— 既存の的を逃がしている(第21条): ${d.wish}`);
  }
});

console.log(`\nReform reach self-test: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
