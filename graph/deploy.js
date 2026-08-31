#!/usr/bin/env node
'use strict';
/**
 * deploy.js — 借り物 + 楽園の意志 から配備物を建て直す (憲法 第19条)
 *
 *   upstream (read-only)  ──┐
 *                           ├─▶  ~/.claude   ← 成果物。手で触らない
 *   overlay/  (楽園の意志) ──┘
 *
 * 配備物を「原本」だと思っている限り、乖離は永遠に消えない。ここから常に
 * 再生成できると決めた瞬間、乖離という概念そのものが消える。
 *
 *   deploy.js plan     何が起きるかだけ見せる (既定)
 *   deploy.js --write  実際に配備する
 *   deploy.js check    配備物が定義と一致しているか調べる (CI 用, exit 1 で乖離)
 *
 * 配備の順序は overlay.json の四分類そのもの:
 *   1. 上流を素通しで写す
 *   2. replace を楽園版で上書き
 *   3. own を足す
 *   4. adopted (上流が消したが楽園が使う) を足す
 *   5. transform を再適用する (apply-models)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const up = require('./upstream.js');

function md5(p) { try { return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex'); } catch { return null; } }
function listMd(dir) {
  try { return fs.readdirSync(dir).filter(f => f.endsWith('.md')); } catch { return []; }
}

/**
 * 配備計画を組む。何をどこから持ってくるかを、実行前に全て言語化する。
 * 「気づいたら上書きされていた」を無くすのが目的。
 */
function plan() {
  const c = up.cfg();
  const UP = up.upstreamPath(c);
  const HOME = up.claudeHome(c);
  const OV = path.join(ROOT, 'overlay');
  const steps = [];

  for (const kind of c.kinds) {
    const upDir = path.join(UP, kind);
    const ovDir = path.join(OV, kind);
    const dstDir = path.join(HOME, kind);

    // 1. 上流を素通し
    for (const f of listMd(upDir)) {
      const relKey = `${kind}/${f}`;
      if (c.replace && c.replace[relKey]) continue; // replace が勝つので後段で入れる
      steps.push({ kind, file: f, from: 'upstream', src: path.join(upDir, f), dst: path.join(dstDir, f), relation: 'plain' });
    }
    // 2. replace
    for (const [relKey, spec] of Object.entries(c.replace || {})) {
      if (!relKey.startsWith(kind + '/')) continue;
      const f = relKey.slice(kind.length + 1);
      const src = path.join(ROOT, spec.source || path.join('overlay', relKey));
      steps.push({ kind, file: f, from: 'overlay(replace)', src, dst: path.join(dstDir, f), relation: 'replace', reason: spec.reason });
    }
    // 3. own
    for (const f of ((c.own && c.own[kind]) || [])) {
      steps.push({ kind, file: f, from: 'overlay(own)', src: path.join(ovDir, f), dst: path.join(dstDir, f), relation: 'own' });
    }
  }
  // 4. adopted — 上流が捨てたが楽園が拾ったもの
  for (const relKey of ((c.adopted && c.adopted.files) || [])) {
    const kind = relKey.split('/')[0];
    const f = relKey.slice(kind.length + 1);
    steps.push({ kind, file: f, from: 'overlay(adopted)', src: path.join(OV, 'adopted', relKey),
                 dst: path.join(up.claudeHome(c), kind, f), relation: 'adopted' });
  }

  const missing = steps.filter(s => !fs.existsSync(s.src));
  return { home: HOME, upstream: UP, steps, missing,
           transforms: Object.keys(c.transform || {}),
           counts: steps.reduce((a, s) => { a[s.relation] = (a[s.relation] || 0) + 1; return a; }, {}) };
}

/** 配備物が計画と一致しているか。CI はこれで「手で触られた」を検出する。 */
function check() {
  const c = up.cfg();
  const UP = up.upstreamPath(c);
  const HOME = up.claudeHome(c);
  // 借り物も配備先も無い環境(CI, clone直後)では検査対象が存在しない。
  // 「配備されていない」と「配備が壊れている」は別物であり、前者を欠陥と
  // 呼ぶと、ハーネスを持たない環境で永久に落ちるテストになる。
  if (!fs.existsSync(UP) || !fs.existsSync(HOME)) {
    return { ok: true, skipped: true, checked: 0, drift: [], transforms: [],
             note: 'no harness on this machine — nothing deployed to verify' };
  }
  const p = plan();
  const drift = [];
  for (const s of p.steps) {
    const a = md5(s.src), b = md5(s.dst);
    if (a === null) { drift.push({ ...s, why: 'source missing' }); continue; }
    if (b === null) { drift.push({ ...s, why: 'not deployed' }); continue; }
    if (a !== b) {
      // transform 対象は変換後に必ず差が出る。乖離ではない。
      if (p.transforms.includes(s.kind)) continue;
      drift.push({ ...s, why: 'deployed copy differs from its source' });
    }
  }
  return { ok: drift.length === 0, skipped: false, drift, checked: p.steps.length, transforms: p.transforms };
}

function write() {
  const p = plan();
  if (p.missing.length) {
    return { ok: false, error: `${p.missing.length} source file(s) missing`, missing: p.missing.map(m => m.src) };
  }
  const done = [];
  for (const s of p.steps) {
    fs.mkdirSync(path.dirname(s.dst), { recursive: true });
    fs.copyFileSync(s.src, s.dst);
    done.push(`${s.relation}: ${s.kind}/${s.file}`);
  }
  // 5. transform を再適用 — 上流の本文更新の上に、楽園の規則を重ねる
  const applied = [];
  for (const kind of p.transforms) {
    const c = up.cfg();
    const engine = (c.transform[kind] || {}).engine;
    if (!engine) continue;
    try {
      execFileSync('node', [path.join(ROOT, engine), 'apply'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
      applied.push(`${kind} ← ${engine}`);
    } catch (e) { return { ok: false, deployed: done.length, error: `transform failed for ${kind}: ${e.message}` }; }
  }
  return { ok: true, deployed: done.length, transforms: applied, home: p.home };
}

if (require.main === module) {
  const cmd = process.argv[2];
  try {
    if (cmd === 'check') {
      const r = check();
      console.log('═══════ 🏛  DEPLOYMENT CHECK ═══════');
      console.log('checked:', r.checked, ' transforms (diff expected):', r.transforms.join(', ') || 'none');
      if (r.ok) console.log('  ✓ every deployed file matches its declared source');
      else for (const d of r.drift.slice(0, 12)) console.log(`  🔴 ${d.kind}/${d.file} — ${d.why} (${d.from})`);
      console.log('════════════════════════════════════');
      process.exit(r.ok ? 0 : 1);
    }
    if (process.argv.includes('--write')) { console.log(JSON.stringify(write(), null, 2)); process.exit(0); }
    const p = plan();
    console.log('═══════ 🏛  DEPLOYMENT PLAN ═══════');
    console.log('upstream:', p.upstream);
    console.log('target  :', p.home);
    console.log('files   :', JSON.stringify(p.counts));
    console.log('transform after copy:', p.transforms.join(', ') || 'none');
    if (p.missing.length) for (const m of p.missing) console.log('  🔴 missing source:', m.src);
    else console.log('  ✓ every source exists');
    console.log('  (dry run — pass --write to deploy)');
    console.log('═══════════════════════════════════');
    process.exit(p.missing.length ? 1 : 0);
  } catch (e) { console.error('ERROR: ' + e.message); process.exit(1); }
}

module.exports = { plan, check, write };
