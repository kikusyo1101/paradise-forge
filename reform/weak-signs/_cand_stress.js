#!/usr/bin/env node
/**
 * discover 相: 修理候補の **耐久試験**(第60条(b) 両枝 / 前走行 design §2.4 の作法)。
 *   ⚠️ 前走行では **行列を通った候補 4 つのうち 3 つが耐久で落ちた**。
 *      行列だけで選ぶな —— これは受け入れコーパスではなく、**候補の脆さを名指す的**である。
 *   的はすべて `_matrix.js` のコーパスの**外**の願いである(重複を機械で確かめる)。
 * ⚠️ 本物の graph/ は一行も変えない。cache 注入(_cand_gate.js と同じ作法)。
 * 使い方: node _cand_stress.js [候補名…]   (既定: 全候補)
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const ROOT = path.join(__dirname, '..', '..');
const REAL_FORGE = path.join(ROOT, 'graph', 'forge.js');
const WORK = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'ws_cand');

// ── 枝A: 楽園の願い —— reform を**失ってはならない**(取りこぼしの枝) ──────
const A = [
  ['reform', '門の閾値を上げよ'],
  ['reform', '楽園のパイプラインに一段を足せ'],
  ['reform', '憲法の条を一つ加えよ'],
  ['reform', '神官の召し方を書き換えろ'],
  ['reform', '枢機卿の割り当てを直せ'],
  ['reform', 'ハーネスの結線を張り直せ'],
  ['reform', 'add a guard to the gate'],
  ['reform', 'extend the paradise engine with a heartbeat endpoint'],
  ['reform', 'wire the orchestration pipeline to the audit ledger'],
  ['reform', '自己改善の輪に一段を足す'],
];
// ── 枝B: 世間の願い —— reform へ攫われては**ならない**(誤着の枝) ─────────
const B = [
  ['full', '武道の流派の門人名簿アプリが欲しい'],
  ['standard', '正門の来客を記録する機能を実装して'],
  ['full', '門松の注文を受ける通販サイトを作れ'],
  ['standard', '山門の写真を並べるページを実装して'],
  ['full', '自動車エンジンの整備記録アプリが欲しい'],
  ['standard', 'implement a payment gateway webhook handler'],
  ['standard', 'create a page to navigate the archive'],
  ['full', 'build a birdwatching app for the northern cardinal'],
  ['standard', 'implement a priesthood census importer'],
  ['full', '熱帯の楽園を紹介する旅行サイトを作れ'],
];
// ── 枝C: 産物を求める願い —— `wantsProduct` が**真でなければならない** ─────
//     ⚠️ **この枝は `chooseScale` では撃てない**(実測): これらの願いは
//        `wantsProduct=false` のままでも `chooseScale` の末尾の段が拾い直すので
//        道は正しく出てしまう。**述語そのものを撃つ**(第58条: 症状でなく原因を撃て)。
const C = [
  [true, '窓口業務のアプリが欲しい'],
  [true, '相手先の一覧を出すコマンドを実装して'],
  [true, '位相差顕微鏡の記録アプリが欲しい'],
  [true, '手相占いのボタンを実装して'],
  [true, '外相会談の記録アプリを作って'],
  [true, '悪口フィルタの機能を実装して'],
  [true, '糸口を探すツールを作る'],
  [true, '火口の様子を映すアプリが欲しい'],
  [true, '蛇口の水量を測る画面を実装して'],
  [true, '傷口の写真を残すツールを作る'],
];
// ── 枝E: 紛れ語 × 作図 × 産物 —— PARA-11 が**実際に道を曲げる**経路 ────────
//     `isCartography` が `PRODUCT_FALSE_FRIENDS` で打ち消しを失う族。
//     図を作る**産物**を求めているので cartography ではない。
const E = [
  ['full', '専門用語の関連図を描けるアプリが欲しい'],
  ['standard', '窓口ごとの構成図を出力するツールを作る'],
  ['full', '人口ピラミッドの図解アプリが欲しい'],
  ['standard', '相場の変動を図示するコマンドを実装して'],
  ['full', '部門の階層図を編集できるアプリが欲しい'],
  ['standard', '口座の資金の流れをフロー図にする機能を実装して'],
  ['full', '相続関係の系統図を作れるアプリが欲しい'],
  ['standard', '入口の人流を可視化するツールを作る'],
];
// ── 枝D: 諐問の願い —— counsel を**失ってはならない** ────────────────────
//     (PARA-11 の修理が `isCounsel` の `!wantsProduct` を裏返さないか)
const D = [
  ['counsel', '窓口の応対を診断してほしい'],
  ['counsel', '入口の動線は妥当か'],
  ['counsel', '相場の先行きはどうすべきか'],
  ['counsel', '人口の偏りを診断してほしい'],
  ['counsel', '出口戦略の見直しは要るか'],
  ['counsel', '口座の整理は妥当か'],
  ['counsel', '肝機能の値を診断してほしい'],
  ['counsel', '真相の究明は必要か'],
  ['counsel', '相互扶助の仕組みを見直すべきではないか'],
  ['counsel', '登竜門の難度は妥当か'],
];

const BRANCHES = [['A-楽園', A], ['B-世間', B], ['C-産物', C], ['D-諐問', D], ['E-作図', E]];
const N = BRANCHES.reduce((n, b) => n + b[1].length, 0);

// ── コーパス外であることを機械で確かめる (第37条: 数が閉じること) ──────────
const matrixSrc = fs.readFileSync(path.join(__dirname, '_matrix.js'), 'utf8');
const inCorpus = [];
for (const [, rows] of BRANCHES) for (const [, wish] of rows) if (matrixSrc.includes(wish)) inCorpus.push(wish);
console.log(`耐久の的: ${N} 件 ` +
  `(枝A=${A.length} 枝B=${B.length} 枝C=${C.length} 枝D=${D.length} 枝E=${E.length})`);
console.log(`コーパス(_matrix.js)との重複: ${inCorpus.length} 件` + (inCorpus.length ? ' ⚠ ' + inCorpus.join(' / ') : '  (= コーパス外であることを確認)'));

const load = (bentPath) => {
  const src = fs.readFileSync(bentPath, 'utf8');
  const m = new Module(REAL_FORGE, null);
  m.filename = REAL_FORGE;
  m.paths = Module._nodeModulePaths(path.dirname(REAL_FORGE));
  m._compile(src, REAL_FORGE);
  m.loaded = true;
  return m.exports;
};

const names = process.argv.slice(2).length ? process.argv.slice(2)
  : ['B0', 'R1', 'R2', 'R3', 'R4', 'R5', 'P1', 'P2', 'P3', 'X1', 'X2'];
const summary = [];
for (const name of names) {
  const p = path.join(WORK, `forge.${name}.js`);
  if (!fs.existsSync(p)) { console.log(`\n${name}: ${p} が無い — 先に _cand.js を走らせよ`); continue; }
  let forge;
  try { forge = load(p); } catch (e) { console.log(`\n${name}: 読み込みに失敗 — ${e.message}`); continue; }
  console.log('\n' + '═'.repeat(84));
  console.log(`候補 ${name} — 耐久 ${N} 件(コーパス外)`);
  console.log('═'.repeat(84));
  const score = {};
  for (const [bn, rows] of BRANCHES) {
    let ok = 0;
    for (const [want, wish] of rows) {
      let got, good, shown;
      try {
        if (bn === 'C-産物') {
          // ★ 述語を直に撃つ(chooseScale では死んだ wantsProduct が見えない — 上の註)
          got = forge.wantsProduct(forge.denude(wish));
          good = got === want;
          shown = `wantsProduct=${got}`;
        } else {
          got = forge.chooseScale(wish);
          good = bn === 'B-世間' ? got !== 'reform' : got === want;
          shown = `-> ${got}`;
        }
      } catch (e) { good = false; shown = 'ERR:' + e.message; }
      if (good) ok++;
      const crit = bn === 'B-世間' ? 'reform でなければ良' : '正解 ' + want;
      console.log(`  ${good ? 'ok ' : '✗  '} [${bn}] "${wish}" ${shown}  (${crit})`);
    }
    score[bn] = ok;
  }
  const total = Object.values(score).reduce((a, b) => a + b, 0);
  console.log(`  枝A(楽園を失わない): ${score['A-楽園']}/${A.length}   枝B(世間を攫わない): ${score['B-世間']}/${B.length}` +
    `   枝C(産物を見失わない): ${score['C-産物']}/${C.length}   枝D(諐問を失わない): ${score['D-諐問']}/${D.length}` +
    `   枝E(図を作る産物): ${score['E-作図']}/${E.length}   合計 ${total}/${N}`);
  summary.push([name, score['A-楽園'], score['B-世間'], score['C-産物'], score['D-諐問'], score['E-作図'], total]);
}
console.log(`\n═══ 耐久まとめ(${N} 件 / コーパス外) ═══`);
console.log('候補   枝A楽園  枝B世間  枝C産物  枝D諐問  枝E作図   合計');
for (const [n, a, b, c, d, e, t] of summary) {
  console.log(`${n.padEnd(6)} ${String(a).padStart(4)}/${A.length} ${String(b).padStart(5)}/${B.length} ${String(c).padStart(5)}/${C.length}` +
    ` ${String(d).padStart(5)}/${D.length} ${String(e).padStart(5)}/${E.length}   ${String(t).padStart(2)}/${N}`);
}
