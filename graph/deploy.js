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
 *   5. transform を再適用する (apply-models + apply-spawn)
 *   6. 教主の座を settings.json に書く (apply-seat, 第31条)
 *   7. 掟を settings.json の permissions に落とす (apply-guards)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const up = require('./upstream.js');

function md5(p) { try { return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex'); } catch { return null; } }
/**
 * 中身の同一性は改行コードで判定しない。Windows と Linux を跨ぐと git の
 * autocrlf で CRLF/LF が入れ替わり、内容が同じでも md5 は必ず食い違う。
 * 「改行が違う」を乖離と呼ぶと、検査が環境差で誤警報を出し続け、やがて
 * 誰も検査を見なくなる。見られない検査は無いのと同じである。
 */
function contentHash(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
    return crypto.createHash('md5').update(raw).digest('hex');
  } catch { return null; }
}
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
    const vnDir = path.join(OV, 'vendor', kind);   // 取り込んだ資産（楽園の所有物）
    const upDir = path.join(UP, kind);             // 上流（在れば見るだけ）
    const ovDir = path.join(OV, kind);
    const dstDir = path.join(HOME, kind);

    // 1. 素の資産は **vendor から** 取る (憲法 第20条)
    //
    // かつてここは上流ツリーから直接読んでいた。第20条で「全てを取り込んだ」と
    // 宣言した後もである。実測すると配備53件のうち31件が上流由来で、
    // 上流を隠した瞬間に配備物は22件へ激減し、司祭9名(architect/code-reviewer/
    // tdd-guide/security-reviewer ほか)が消えた。**vendor に複製は在るのに、
    // deploy は一度もそれを見ていなかった。** 在庫を数える門はあったが、
    // 供給線を見る門が無かったので、独立は宣言のまま緑を出し続けた。
    //
    // 楽園は取り込んだ資産で建つ。上流はもはや供給元ではない。
    const primaryDir = fs.existsSync(vnDir) && listMd(vnDir).length ? vnDir : upDir;
    const fromLabel = primaryDir === vnDir ? 'vendor' : 'upstream';
    for (const f of listMd(primaryDir)) {
      const relKey = `${kind}/${f}`;
      if (c.replace && c.replace[relKey]) continue; // replace が勝つので後段で入れる
      if ((c.own && c.own[kind] || []).includes(f)) continue; // own が勝つ
      steps.push({ kind, file: f, from: fromLabel, src: path.join(primaryDir, f), dst: path.join(dstDir, f), relation: 'plain' });
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
    const a = contentHash(s.src), b = contentHash(s.dst);
    if (a === null) { drift.push({ ...s, why: 'source missing' }); continue; }
    if (b === null) { drift.push({ ...s, why: 'not deployed' }); continue; }
    if (a !== b) {
      // transform 対象は変換後に必ず差が出る。乖離ではない。
      if (p.transforms.includes(s.kind)) continue;
      drift.push({ ...s, why: 'deployed copy differs from its source' });
    }
  }
  // 教主の座も配備物である (第31条)。agents だけを見る検査は、最上位を見逃す。
  const seat = require('./apply-seat.js').diff();
  if (!seat.skipped && !seat.ok) {
    drift.push({ kind: 'settings', file: 'settings.json', from: 'clergy(pontiff)',
                 why: `教主の座が宣言と違う: 現状 ${seat.current.model ?? '(無統治)'}/${seat.current.effort ?? '(無統治)'} ⇒ ${seat.want.model}/${seat.want.effort}` });
  }
  // 掟もまた配備物である。permissions が書かれていない配備は、門を一つも
  // 持たない配備であり、agents だけを数える検査はそれを緑と呼んでしまう。
  const guards = require('./apply-guards.js').diff();
  if (!guards.skipped && !guards.ok) {
    for (const c of guards.changes) {
      drift.push({ kind: 'settings', file: 'settings.json', from: 'apply-guards(POLICY)',
                   why: c.kind === 'permissions' ? `掟が機構になっていない: ${c.note}` : `死んだ matcher ${c.event}[${c.index}]: ${c.note}` });
    }
  }
  return { ok: drift.length === 0, skipped: false, drift, checked: p.steps.length + 2, transforms: p.transforms };
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
  //
  // 一つの kind に **複数の変換** が要る。agents には位階モデル(第12条)と
  // 起動の権能(第25条)の二つが乗る。かつてここは engine を1つしか読まず、
  // 建て直すたびに権能が7名分**黙って消えていた**（実測で捕らえた）。
  // 変換が一つだけという前提は、規則が増えた瞬間に嘘になる。
  const applied = [];
  for (const kind of p.transforms) {
    const c = up.cfg();
    const spec = c.transform[kind] || {};
    // `engine`(単数・旧形式) と `engines`(複数) の両方を受ける。順に全て適用する。
    const engines = spec.engines || (spec.engine ? [spec.engine] : []);
    for (const engine of engines) {
      try {
        execFileSync('node', [path.join(ROOT, engine), 'apply'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
        applied.push(`${kind} ← ${engine}`);
      } catch (e) { return { ok: false, deployed: done.length, error: `transform failed for ${kind} via ${engine}: ${e.message}` }; }
    }
  }
  // 6. 教主の座を配備する (第31条)
  //
  // agents だけを運んでいた頃、位階の宣言は L2〜L-1 にしか届いていなかった。
  // 教主(L1)の座は settings.json にあり、deploy はそこを一度も見ていなかったので、
  // 「教主 = <model>」という宣言は**どこにも書かれないまま**緑を出し続けた。
  // 第25条(歩けぬ階層は階層ではない)と同じ形の欠陥である — 最上位だけが機構の外にいた。
  let seat = null;
  try {
    const s = require('./apply-seat.js').apply();
    seat = s.ok ? `${s.model}/${s.effort}${s.changed ? ' (更新)' : ''}` : `失敗: ${s.error}`;
    if (!s.ok) return { ok: false, deployed: done.length, error: `pontiff seat: ${s.error}` };
  } catch (e) { return { ok: false, deployed: done.length, error: `pontiff seat: ${e.message}` }; }

  // 7. 掟を機構にする
  //
  // 配備物は agents と commands と座だけではない。**掟そのもの**が配備物である。
  // permissions を書かない配備は、force push も .env の読み出しも素通しにする
  // 配備であり、CLAUDE.md の「Hooks で自動強制されている」という一文を嘘にする。
  // さらに死んだ matcher を直す — 建て直すたびに門が黙って無効化されていた。
  let guards = null;
  try {
    const g = require('./apply-guards.js').apply();
    if (!g.ok) return { ok: false, deployed: done.length, error: `guards: ${g.error}` };
    guards = g.skipped ? '(settings.json 無し)'
           : `deny ${require('./apply-guards.js').POLICY.deny.length} / ask ${require('./apply-guards.js').POLICY.ask.length} / allow ${require('./apply-guards.js').POLICY.allow.length}${g.changed ? ` (更新 ${g.changes.length})` : ''}`;
  } catch (e) { return { ok: false, deployed: done.length, error: `guards: ${e.message}` }; }

  return { ok: true, deployed: done.length, transforms: applied, pontiff_seat: seat, guards, home: p.home };
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
