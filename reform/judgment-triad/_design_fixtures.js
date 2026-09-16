#!/usr/bin/env node
/**
 * design 相: **PARA-6 の抜け道に寄りかかった fixture を網羅的に探す**。
 * 「相を done にせずに ratify を撃っている箇所」を、grep ではなく **実際に走らせて**見つける。
 *
 * 作法: 曲げた conclave(R1 入り)を require.cache に注入し、リポジトリの全 tests/ を
 *       一つずつ走らせて、R1 の下でだけ ✗ になる門を名指す。
 *       併せて、静的な grep(ratify を呼ぶ行と、その前の done の有無)も一覧にする。
 * ⚠️ 本物の graph/ tests/ は一行も変えない。
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const WORK = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'jt_para6');
const BENT = path.join(WORK, 'graph', 'conclave.js');
if (!fs.existsSync(BENT)) { console.error('先に _design_para6.js を走らせよ'); process.exit(1); }

// ── 1. 静的な走査: ratify を呼ぶ箇所と、直前の done の面倒を見ているか ──
console.log('═══ 1. tests/ の中で ratify を呼ぶ箇所(静的) ═══\n');
const files = fs.readdirSync(path.join(ROOT, 'tests')).filter(f => f.endsWith('.js'));
const hits = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8');
  const lines = src.split(/\r?\n/);
  lines.forEach((l, i) => {
    if (/\.ratify\s*\(/.test(l) && !/reject\s*:\s*true/.test(l)) {
      hits.push({ file: 'tests/' + f, line: i + 1, text: l.trim() });
    }
  });
}
for (const h of hits) console.log(`  ${h.file}:${h.line}  ${h.text}`);
console.log(`\n  祝福の枝の ratify 呼び出し: ${hits.length} 箇所(--reject は除く)\n`);

// ── 2. 動的な走査: R1 の下でだけ落ちる門を一つずつ走らせて名指す ──
console.log('═══ 2. R1 の下で ✗ になる門(動的 / 一つずつ逐次に走らせる)═══\n');
const GATE = path.join(__dirname, '_design_gate_conclave.js');
fs.writeFileSync(GATE, `'use strict';
const fs=require('fs'),path=require('path'),Module=require('module');
const ROOT=path.join(__dirname,'..','..');
const REAL=path.join(ROOT,'graph','conclave.js');
const bent=process.argv[2];
if(bent&&bent!=='none'){const src=fs.readFileSync(bent,'utf8');const m=new Module(REAL,null);
m.filename=REAL;m.paths=Module._nodeModulePaths(path.dirname(REAL));m._compile(src,REAL);m.loaded=true;require.cache[REAL]=m;}
const target=path.join(ROOT,process.argv[3]);
// argv を切り詰める — paradise.test.js の gate-filter が argv を読むので、
//   余分な引数を残すと 'unknown flag' で exit 2 になる(測定が無効になる)。
process.argv=[process.argv[0],target];
require(target);
`);

const TARGETS = files.filter(f => f.endsWith('.test.js')).map(f => 'tests/' + f);
const run = (bent, rel) => {
  try { return { exit: 0, out: execFileSync(process.execPath, [GATE, bent, rel], { encoding: 'utf8', cwd: ROOT, timeout: 300000 }) }; }
  catch (e) { return { exit: e.status === null ? 'TIMEOUT' : e.status, out: (e.stdout || '') + (e.stderr || '') }; }
};
const fails = l => l.split('\n').filter(x => x.includes('✗')).map(x => x.trim());

const rows = [];
for (const t of TARGETS) {
  const src = fs.readFileSync(path.join(ROOT, t), 'utf8');
  if (!/conclave/.test(src)) continue;      // conclave に触らぬ門は関係が無い
  const a = run('none', t);                 // 対照群(素の conclave)
  const b = run(BENT, t);                   // R1 入り
  const fa = new Set(fails(a.out)), fb = fails(b.out);
  const newFails = fb.filter(x => !fa.has(x));
  rows.push({ t, ctrl: a.exit, r1: b.exit, ctrlFails: fa.size, r1Fails: fb.length, newFails });
  console.log(`  ${t.padEnd(38)} 対照群 exit=${String(a.exit).padEnd(8)} R1 exit=${String(b.exit).padEnd(8)} 新しい ✗ ${newFails.length} 本`);
  for (const x of newFails) console.log(`      ${x}`);
}
console.log('\n═══ 3. まとめ ═══');
const bad = rows.filter(r => r.newFails.length);
if (!bad.length) console.log('  R1 が新たに落とす門は無い。');
for (const r of bad) {
  console.log(`  ✗ ${r.t}  新しい ✗ ${r.newFails.length} 本`);
  for (const x of r.newFails) console.log(`      ${x}`);
}
