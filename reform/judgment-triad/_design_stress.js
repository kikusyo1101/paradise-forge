#!/usr/bin/env node
/**
 * design 相: 101/101 に届いた D1 / D2 / D4 の**耐久**を、コーパスの外の願いで撃つ。
 * 第60条(b): 規則を足したら両枝を持て —— 「当たるべき形」と「当たってはならない形」の両方。
 * これは受け入れコーパスではない。**候補の脆さを名指すための的**である。
 * 使い方: node _design_stress.js            (全候補)
 * ⚠️ 本物の graph/ は一行も変えない。cache 注入(_design_gate.js と同じ作法)。
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const ROOT = path.join(__dirname, '..', '..');
const REAL_FORGE = path.join(ROOT, 'graph', 'forge.js');
const WORK = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'jt_design');

// ── 耐久の的 ────────────────────────────────────────────────────────
// 枝A: 産物**全体**を求める形の言い換え(full に当たらねばならない)
const WHOLE = [
  ['full', 'ECサイトの構築をお願いしたい'],
  ['full', 'ポータルサイトのリニューアルをしたい'],
  ['full', '新しいコーポレートサイトの立ち上げ'],
  ['full', 'ウェブサイトを一から作ってほしい'],
  ['full', '通販サイトが必要だ'],
  ['full', 'we need a new corporate website'],
  ['full', 'launch a company portal'],
  ['full', 'i want an online shop'],
];
// 枝B: 産物の**一部**を求める形の言い換え(full に当たってはならない)
const PART = [
  ['standard', 'ECサイトに決済の導線を追加して'],
  ['standard', 'サイトのヘッダーを実装して'],
  ['standard', '通販サイトの在庫表示を作る'],
  ['standard', 'ポータルサイトのお知らせ欄を実装して'],
  ['standard', 'サイトの画像を圧縮する仕組みを作る'],
  ['standard', 'add a share button to the website'],
  ['standard', 'implement a login form for the portal'],
  ['standard', 'build a csv export for the shop admin'],
];
const STRESS = [...WHOLE.map(x => [...x, 'A-全体']), ...PART.map(x => [...x, 'B-部分'])];

const load = (bentPath) => {
  const src = fs.readFileSync(bentPath, 'utf8');
  const m = new Module(REAL_FORGE, null);
  m.filename = REAL_FORGE;
  m.paths = Module._nodeModulePaths(path.dirname(REAL_FORGE));
  m._compile(src, REAL_FORGE);
  m.loaded = true;
  return m.exports;
};

const names = process.argv.slice(2).length ? process.argv.slice(2) : ['B0', 'C1', 'D1', 'D2', 'D4'];
const summary = [];
for (const name of names) {
  const p = path.join(WORK, `forge.${name}.js`);
  if (!fs.existsSync(p)) { console.log(`\n${name}: ${p} が無い — 先に _design_para7b.js を走らせよ`); continue; }
  const forge = load(p);
  console.log('\n' + '═'.repeat(76));
  console.log(`候補 ${name} — 耐久 16 件(コーパス外)`);
  console.log('═'.repeat(76));
  let okA = 0, okB = 0;
  for (const [want, wish, branch] of STRESS) {
    const got = forge.chooseScale(wish);
    const ok = got === want;
    if (branch === 'A-全体') okA += ok ? 1 : 0; else okB += ok ? 1 : 0;
    console.log(`  ${ok ? 'ok ' : '✗  '} [${branch}] "${wish}" -> ${got}  (正解 ${want})`);
  }
  console.log(`  枝A(全体→full): ${okA}/${WHOLE.length}   枝B(部分→full にしない): ${okB}/${PART.length}   合計 ${okA + okB}/${STRESS.length}`);
  summary.push([name, okA, okB, okA + okB]);
}
console.log('\n═══ 耐久まとめ ═══');
console.log('候補   枝A(全体)  枝B(部分)  合計');
for (const [n, a, b, t] of summary) console.log(`${n.padEnd(6)} ${String(a).padStart(4)}/${WHOLE.length}     ${String(b).padStart(4)}/${PART.length}     ${t}/${STRESS.length}`);
