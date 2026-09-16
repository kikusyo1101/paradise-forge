#!/usr/bin/env node
/**
 * design 相の計測器 ②: `_design_patch.js` が作った 8 つの写しを
 * **単独で / 併用で** 測り、design.md に貼る生出力を一度に出す。
 *
 * 各写しについて出すもの:
 *   ① 受け入れ帳 140 件の対角 / 非ゼロ非対角セルの名と件数
 *   ② 射程帳 32 件が誤着のまま凍っているか(32/32)
 *   ③ 種M 16 件(AC-1 の的そのもの)
 *   ④ AC-45 の的 5 件 / counsel.test.js:652 の 20 語 / 禁じた固有名 14 語
 *   ⑤ 既存門 route-matrix / counsel / route-debt の exit と ✗ 行
 *   ⑥ 耐久 48 件 5 枝(コーパス外)
 *
 * ⚠️ 本物の graph/ tests/ は一行も書き換えない(require.cache 注入)。
 *     門は**逐次**に走らせる(NFR-1)。
 * 使い方: node reform/weak-signs/_design_measure.js [名…]   (既定: 全 8 つ)
 *        名 = B0 R2 R3 P3 R2R3 R2P3 R3P3 X4PP
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const REAL_FORGE = path.join(ROOT, 'graph', 'forge.js');
const GATE = path.join(__dirname, '_cand_gate.js');
const WORK = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'ws_cand');

const CORPUS = JSON.parse(fs.readFileSync(path.join(__dirname, '_spec_corpus.json'), 'utf8'));
const REACH = JSON.parse(fs.readFileSync(path.join(__dirname, '_spec_reach.json'), 'utf8'));
const REACHSET = new Set(REACH);
const ACC = CORPUS.filter(c => !REACHSET.has(c.wish));
const RCH = CORPUS.filter(c => REACHSET.has(c.wish));
const ROUTES = ['counsel', 'cartography', 'reform', 'quick', 'standard', 'full'];

/** AC-1 の的 16 件(requirements §4.1 AC-1 / 種M = 語中埋没) */
const KIND_M = [
  '一門の家系図を作れるアプリが欲しい', '専門店のサイトが欲しい', '部門別の集計コマンドを実装して',
  '名門校の受験対策アプリが欲しい', '入門講座の進捗を記録する機能を実装して', '門限を知らせるタイマーを実装して',
  '登竜門コンテストの投票アプリが欲しい', '専門分野の系統図を編集できるアプリが欲しい',
  'build a civil engineering estimate app', 'implement a gateway timeout retry helper',
  'build an app to investigate delegate voting records', 'create a script to aggregate the daily sales rows',
  'implement a navigate-back button for the wizard', 'implement a self-improvement streak counter',
  'build a self-improvement journal app', 'build a priesthood directory app for the diocese',
];
/** AC-2 の的 4 件(PARA-11 の族 / 種H だが構造で直る) */
const P11FAM = [
  ['full', '相関図を描けるアプリを作って'], ['standard', '人口分布の構成図を出力するツールを作る'],
  ['standard', '窓口の導線を図示するコマンドを実装して'], ['standard', '相場の推移を可視化するツールを作る'],
];
const MUST20 = ['楽園', 'paradise', 'ハーネス', 'harness', '憲法', 'constitution', 'engine', 'エンジン', '門', 'gate',
  'パイプライン', 'pipeline', '自己改善', 'self-improve', 'オーケストレーション', 'orchestration',
  '枢機卿', 'cardinal', '神官', 'priest'];
const FORBID14 = ['gauge', 'forge', 'conclave', 'codex', 'clergy', 'synod', 'verdict', 'critic',
  'abode', 'hermetic', 'vendor', 'census', 'workflow', 'identity'];

function load(p) {
  const src = fs.readFileSync(p, 'utf8');
  const m = new Module(REAL_FORGE, null);
  m.filename = REAL_FORGE;
  m.paths = Module._nodeModulePaths(path.dirname(REAL_FORGE));
  m._compile(src, REAL_FORGE);
  m.loaded = true;
  return m.exports;
}
function runGate(bent, rel, env) {
  try { return { exit: 0, out: execFileSync(process.execPath, [GATE, bent, rel], { encoding: 'utf8', cwd: ROOT, env: { ...process.env, ...env } }) }; }
  catch (e) { return { exit: e.status, out: (e.stdout || '') + (e.stderr || '') }; }
}

const names = process.argv.slice(2).filter(a => !a.startsWith('-'));
const ALL = ['B0', 'R2', 'R3', 'P3', 'R2R3', 'R2P3', 'R3P3', 'X4PP'];
const WANT = names.length ? names : ALL;
const SKIP_GATES = process.env.DESIGN_NO_GATES === '1';
const SKIP_STRESS = process.env.DESIGN_NO_STRESS === '1';
const rows = [];

for (const name of WANT) {
  const p = path.join(WORK, `forge.D_${name}.js`);
  if (!fs.existsSync(p)) { console.log(`\n${name}: ${p} が無い — 先に _design_patch.js を走らせよ`); continue; }
  const forge = load(p);
  console.log('\n' + '═'.repeat(92));
  console.log(`【${name}】 ${p}`);
  console.log('═'.repeat(92));

  // ① 受け入れ帳
  const bad = ACC.filter(c => forge.chooseScale(c.wish) !== c.route);
  const cells = {};
  for (const c of bad) { const k = `${c.route}→${forge.chooseScale(c.wish)}`; (cells[k] = cells[k] || []).push(c.wish); }
  console.log(`① 受け入れ帳: 対角 ${ACC.length - bad.length} / ${ACC.length}   非ゼロ非対角セル ${Object.keys(cells).length} / 30`);
  for (const [k, v] of Object.entries(cells)) {
    console.log(`     [${k}] ${v.length} 件`);
    for (const w of v) console.log(`        ・${w}`);
  }
  if (!bad.length) console.log('     (非対角はすべて 0 — 第61条の合格線に到達)');

  // ② 射程帳
  const rbad = RCH.filter(c => forge.chooseScale(c.wish) === 'reform');
  const rstd = RCH.filter(c => forge.chooseScale(c.wish) === 'standard');
  console.log(`② 射程帳: reform のまま凍っている ${rbad.length} / ${RCH.length}   standard へ落ちた ${rstd.length} 件` +
    (rstd.length ? ' ⚠ ' + rstd.map(c => c.wish).join(' / ') : ''));
  if (rbad.length !== RCH.length) {
    for (const c of RCH.filter(c => forge.chooseScale(c.wish) !== 'reform'))
      console.log(`     ・reform を離れた: "${c.wish}" -> ${forge.chooseScale(c.wish)}`);
  }

  // ③ 種M 16 件(述語と道を対で / AC-1)
  const mbad = KIND_M.filter(w => forge.isReformSubject(forge.denude(w)) || forge.chooseScale(w) === 'reform');
  console.log(`③ 種M(AC-1): 今なお reform を名乗る ${mbad.length} / ${KIND_M.length}`);
  for (const w of mbad) console.log(`     ✗ "${w}"  isReformSubject=${forge.isReformSubject(forge.denude(w))}  ->${forge.chooseScale(w)}`);
  // AC-2 の族(述語を直に撃つ)
  const pbad = P11FAM.filter(([r, w]) => !(forge.wantsProduct(forge.denude(w)) === true && forge.chooseScale(w) === r));
  console.log(`   種H/PARA-11 の族(AC-2): 未修理 ${pbad.length} / ${P11FAM.length}` +
    (pbad.length ? '\n' + pbad.map(([r, w]) => `     ✗ "${w}" wantsProduct=${forge.wantsProduct(forge.denude(w))} ->${forge.chooseScale(w)} (正解 ${r})`).join('\n') : ''));

  // ④ AC-45 / counsel:652
  console.log('④ AC-45 の的:');
  for (const w of ['専門店の棚の傾きを直したい', '部門別の売上の誤りを直したい'])
    console.log(`     "${w}" -> ${forge.chooseScale(w)}   (門が現在 reform を期待)`);
  for (const w of ['門に監査の一段を足す', '門の判定を書き換える', '門を強化する'])
    console.log(`     "${w}" -> ${forge.chooseScale(w)}   (逆向き / reform を失ってはならない)`);
  const lost = MUST20.filter(w => !forge.REFORM_RE.test(w));
  const crept = FORBID14.filter(n => forge.REFORM_RE.test(`a ${n} app`));
  console.log(`   counsel.test.js:652 — 落ちた語: ${lost.length ? lost.join(', ') : '0 語(過不足なし)'}` +
    ` / 入り込んだ固有名: ${crept.length ? crept.join(', ') : '0 語'}` +
    ` / 台帳系: ${['台帳の毒を直す', 'fix the ledger'].filter(x => forge.REFORM_RE.test(x)).length} 件`);
  console.log(`   REFORM_FALSE_FRIENDS の export: ${forge.REFORM_FALSE_FRIENDS ? '有り(' + forge.REFORM_FALSE_FRIENDS.source.split('|').length + ' 項)' : '無し'}`);
  if (forge.REFORM_FALSE_FRIENDS) {
    const ent = forge.REFORM_FALSE_FRIENDS.source.split('|');
    const noGate = ent.filter(e => !e.includes('門'));
    const hasEn = ent.filter(e => /[a-z]/i.test(e));
    console.log(`   AC-3 の門番: 「門」を含まない項 ${noGate.length} 件${noGate.length ? ' ⚠ ' + noGate.join(',') : ''} / 英語混入 ${hasEn.length} 件`);
  }

  // ⑤ 既存門(逐次)
  if (!SKIP_GATES) {
    console.log('⑤ 既存門(逐次 / NFR-1):');
    for (const t of ['tests/route-matrix.test.js', 'tests/counsel.test.js', 'tests/route-debt.test.js', 'tests/ratify-guard.test.js']) {
      const r = runGate(p, t);
      const xs = r.out.split('\n').filter(l => l.includes('✗'));
      const sum = r.out.split('\n').filter(l => /self-test:/.test(l)).map(l => l.trim());
      console.log(`     ── ${t} ── exit=${r.exit}   ${sum.join(' / ')}`);
      for (const l of xs.slice(0, 14)) console.log('        ' + l.trim());
      if (xs.length > 14) console.log(`        …(他 ${xs.length - 14} 行)`);
    }
  }

  // ⑥ 耐久(コーパス外 48 件 5 枝)
  let stress = '(未走行)';
  if (!SKIP_STRESS) {
    fs.copyFileSync(p, path.join(WORK, `forge.${name}.js`));   // _cand_stress.js は forge.<名>.js を読む
    const so = execFileSync(process.execPath, [path.join(__dirname, '_cand_stress.js'), name], { encoding: 'utf8', cwd: ROOT });
    const lines = so.split('\n');
    const head = lines.filter(l => /枝A\(楽園を失わない\)/.test(l))[0] || '';
    stress = head.trim();
    console.log('⑥ 耐久(コーパス外 48 件):');
    for (const l of lines.filter(l => /^  ✗/.test(l))) console.log('     ' + l.trim());
    console.log('     ' + stress);
  }
  rows.push({ name, diag: `${ACC.length - bad.length}/${ACC.length}`, cells: Object.keys(cells).length,
    reach: `${rbad.length}/${RCH.length}`, m: `${KIND_M.length - mbad.length}/${KIND_M.length}`,
    p11: `${P11FAM.length - pbad.length}/${P11FAM.length}`, stress });
}

console.log('\n' + '═'.repeat(92));
console.log('まとめ  部品        受入対角    非対角セル  射程帳    種M(AC-1)  PARA-11族  耐久');
for (const r of rows) {
  console.log(`        ${r.name.padEnd(10)} ${r.diag.padEnd(11)} ${String(r.cells + '/30').padEnd(11)} ` +
    `${r.reach.padEnd(9)} ${r.m.padEnd(10)} ${r.p11.padEnd(10)} ${(r.stress.match(/合計 (\d+\/\d+)/) || [, '—'])[1]}`);
}
