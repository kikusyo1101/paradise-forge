#!/usr/bin/env node
/**
 * design 相の計測器 ④: **新設 2 門の骨格を実際に走らせる**。
 *
 * 「何を assert するか」を散文で書くだけでは、その assert が通るかどうか分からない。
 * ゆえに下書き(`_draft_reform-sign.test.js` / `_draft_reform-reach.test.js`)と
 * `_design_reach_draft.md` を**写しのリポジトリ**へ本来の名前で置き、
 * X4″ を当てた `graph/forge.js` の上で実際に走らせる。
 *
 * ⚠️ 本物の `tests/` `graph/` `reform/weak-signs/reach.md` は一行も作らない/変えない。
 *    写しは $LOCALAPPDATA/Temp/ws_newgates に作る。
 *
 * ⚠️ 写しのリポジトリを使う理由: 両門とも `path.join(__dirname,'..')` で ROOT を計算し、
 *    `reform/weak-signs/reach.md` / `tests/route-matrix.test.js` を**実ファイルとして読む**。
 *    require.cache 注入では tests/ の実体が無いので測れない。
 *
 * 使い方: node reform/weak-signs/_design_gates.js [base|x4pp]   (既定: 両方)
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const TMP = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp');
const WORK = path.join(TMP, 'ws_cand');
const REPO = path.join(TMP, 'ws_newgates');

// ── 写しを組む(.git は要らない。両門とも git を見ない) ──
if (fs.existsSync(REPO)) fs.rmSync(REPO, { recursive: true, force: true });
for (const d of ['graph', 'tests', path.join('reform', 'weak-signs')]) fs.mkdirSync(path.join(REPO, d), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, 'graph'))) {
  const s = path.join(ROOT, 'graph', f);
  if (fs.statSync(s).isFile()) fs.copyFileSync(s, path.join(REPO, 'graph', f));
}
for (const f of ['route-matrix.test.js', 'counsel.test.js']) fs.copyFileSync(path.join(ROOT, 'tests', f), path.join(REPO, 'tests', f));
fs.copyFileSync(path.join(__dirname, '_draft_reform-sign.test.js'), path.join(REPO, 'tests', 'reform-sign.test.js'));
fs.copyFileSync(path.join(__dirname, '_draft_reform-reach.test.js'), path.join(REPO, 'tests', 'reform-reach.test.js'));
fs.copyFileSync(path.join(__dirname, '_design_reach_draft.md'), path.join(REPO, 'reform', 'weak-signs', 'reach.md'));

const which = process.argv.slice(2).filter(a => !a.startsWith('-'));
const VARIANTS = (which.length ? which : ['base', 'x4pp']);

for (const v of VARIANTS) {
  // 判定器を差し替える(**写しの中だけ**)
  const src = v === 'base' ? path.join(ROOT, 'graph', 'forge.js') : path.join(WORK, 'forge.D_X4PP.js');
  fs.copyFileSync(src, path.join(REPO, 'graph', 'forge.js'));
  const has = fs.readFileSync(path.join(REPO, 'graph', 'forge.js'), 'utf8').includes('REFORM_FALSE_FRIENDS');
  console.log('\n' + '═'.repeat(88));
  console.log(`【判定器 = ${v}】  REFORM_FALSE_FRIENDS を持つ: ${has}  (base なら false / x4pp なら true)`);
  console.log('═'.repeat(88));

  for (const t of ['reform-sign.test.js', 'reform-reach.test.js']) {
    let out, exit = 0;
    try { out = execFileSync(process.execPath, [path.join(REPO, 'tests', t)], { encoding: 'utf8', cwd: REPO }); }
    catch (e) { exit = e.status; out = (e.stdout || '') + (e.stderr || ''); }
    console.log(`\n── node tests/${t} ──  exit=${exit}`);
    console.log(out.trimEnd().split('\n').map(l => '  ' + l).join('\n'));
  }
}
console.log('\n写しの根: ' + REPO + '  (本物の tests/ graph/ には何も作っていない)');
