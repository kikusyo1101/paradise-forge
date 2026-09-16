#!/usr/bin/env node
/**
 * PARADISE :: RATIFY GUARD — 仕事をせずに祝福できないことを撃つ門 (PARA-6 / 第37条)
 *
 * ── なぜこの門が要るか ────────────────────────────────────────────────
 * 旧実装の `ratify()` は `d.phases` を一度も見ずに `d.status = 'ratified'` を書いた。
 * 実測で **17 相すべて pending・成果物 0 件のまま `domains ratified: 6/6`** が成立し、
 * `node graph/conclave.js audit` はその走行を `closed` として ✓ で通した
 * (reform/judgment-triad/findings.md 1.2 / 1.4)。
 * **数える対象そのものが偽造可能だった** —— 拒否(`--reject`)の側だけが厳密で、
 * 祝福の側が無条件だったのである。
 *
 * ── 対で撃つ(第21条: 壊して鳴らす)────────────────────────────────
 * 拒む側(G-1 / G-5 / G-6 / G-7)だけなら **「常に throw する」実装でも緑になる**。
 * ゆえに通す側(G-3)を対に置く。さらに G-4 は逆向きの対で、
 * 関門を `--reject` にも掛けてしまう誤実装(第14条の大きな環を殺す形)を捕らえる。
 *
 *   node tests/ratify-guard.test.js     # exit 0 = 関門は四つの枝を正しく裁く
 *
 * ⚠️ 門を緩めて緑にしてはならない(第21条)。関門が誤って拒むなら関門を直せ。
 */
'use strict';
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const forge = require(path.join(ROOT, 'graph', 'forge.js'));
const conclave = require(path.join(ROOT, 'graph', 'conclave.js'));

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); pass++; }
  catch (e) { console.log('  \u2717 ' + name + '\n      ' + String(e.message).split('\n').join('\n      ')); fail++; }
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-ratify-guard-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* 掃除の失敗は門の判定ではない */ } });

/** 台帳を一つ起こす。相は全て pending で始まる(convene の素の姿)。 */
function mkRun() {
  const dag = forge.buildDag('ratify guard gate', 'standard');
  const p = path.join(TMP, 'dag-' + crypto.randomBytes(6).toString('hex') + '.json');
  fs.writeFileSync(p, JSON.stringify(dag));
  return { run: conclave.convene(p), path: p };
}
const dom = (run, c) => run.domains.find(x => x.cardinal === c);
const snap = d => d.phases.map(p => ({ id: p.id, status: p.status }));

/** throw を捕らえて返す(assert.throws では err を後から検分しにくい)。 */
function caught(fn) {
  try { fn(); return null; }
  catch (e) { return e; }
}

// ══════════════════════════════════════════════════════════════════════
// G-1 〜 G-3 — 関門の芯(AC-1 / AC-2)
// ══════════════════════════════════════════════════════════════════════

test('G-1: ratify — 相が pending の領域は祝福できない (AC-1)', () => {
  const { run } = mkRun();
  assert.throws(() => conclave.ratify(run, 'requirements'), /not done/,
    '相が一つも done でない領域が祝福された —— PARA-6 の穴が開いている');
  const err = caught(() => conclave.ratify(run, 'requirements'));
  assert.strictEqual(err && err.code, 'RATIFY_PHASES_NOT_DONE',
    `err.code が RATIFY_PHASES_NOT_DONE でない: ${err && err.code} —— CLI が exit 2 を出せない`);
});

test('G-2: ratify — 拒んだとき領域の印は一つも動かない (NFR-9 部分適用しない)', () => {
  const { run } = mkRun();
  const d = dom(run, 'requirements');
  const before = snap(d);
  const beforeStatus = d.status;
  caught(() => conclave.ratify(run, 'requirements'));
  const after = dom(run, 'requirements');
  assert.strictEqual(after.status, beforeStatus,
    `拒んだのに領域の status が ${beforeStatus} → ${after.status} に動いた —— 部分適用である`);
  assert.deepStrictEqual(snap(after), before,
    '拒んだのに相の印が動いた —— throw より前に書いてはならない');
});

test('G-3: ratify — 相が全て done なら通る(「常に拒む」実装では緑にならない)(AC-2)', () => {
  const { run } = mkRun();
  const d = dom(run, 'requirements');
  for (const p of d.phases) p.status = 'done';
  const res = conclave.ratify(run, 'requirements');
  assert.strictEqual(res.ok, true, '相が全て done なのに祝福が通らない —— 関門が厳しすぎる');
  assert.strictEqual(res.ratified, 'requirements');
  assert.strictEqual(dom(run, 'requirements').status, 'ratified',
    '通ったのに領域の status が ratified になっていない');
});

// ══════════════════════════════════════════════════════════════════════
// G-4 — 逆向きの対: --reject には関門を掛けない (AC-3(a) / 第14条)
// ══════════════════════════════════════════════════════════════════════

test('G-4: ratify — --reject は相が全て pending でも通る (AC-3(a) / 第14条)', () => {
  const { run } = mkRun();
  // 相を一つも done にしない。「仕事が無い」ことは拒否の理由にならない ——
  // 着手前の相を上流へ差し戻す第14条の大きな環を、関門が殺してはならない。
  const res = conclave.ratify(run, 'requirements', { reject: true, from: 'specify' });
  assert.strictEqual(res.ok, true,
    '--reject が関門に拒まれた —— 第14条の大きな環が回らなくなる(AC-3(a) 違反)');
  const specify = dom(run, 'requirements').phases.find(p => p.id === 'specify');
  assert.strictEqual(specify.status, 'rework', `specify が rework に落ちていない: ${specify.status}`);
});

// ══════════════════════════════════════════════════════════════════════
// G-5 〜 G-7 — 三つの拒む枝 (AC-3(b) / (c) / (c2))
// ══════════════════════════════════════════════════════════════════════

test('G-5: ratify — rework の相を握りつぶさない (AC-3(b))', () => {
  const { run } = mkRun();
  const d = dom(run, 'requirements');
  for (const p of d.phases) p.status = 'done';
  d.phases.find(p => p.id === 'specify').status = 'rework';
  const err = caught(() => conclave.ratify(run, 'requirements'));
  assert.ok(err, 'rework の相が在るのに祝福が通った —— 差し戻された仕事が黙って祝福された');
  assert.strictEqual(err.code, 'RATIFY_PHASES_NOT_DONE');
  assert.match(err.message, /specify=rework/,
    `文言が未了の相を名指していない: ${err.message}`);
});

test('G-6: ratify — blocked の相は「待てば直る」ではない。人を呼べと言う (AC-3(c) / NFR-6)', () => {
  const { run } = mkRun();
  const d = dom(run, 'requirements');
  for (const p of d.phases) p.status = 'done';
  d.phases.find(p => p.id === 'specify').status = 'blocked';
  const err = caught(() => conclave.ratify(run, 'requirements'));
  assert.ok(err, 'blocked の相が在るのに祝福が通った');
  assert.strictEqual(err.code, 'RATIFY_PHASES_NOT_DONE');
  assert.match(err.message, /人を呼べ/,
    `blocked をただ "not done" と言っている: ${err.message} —— ` +
    '人は「待てば直る」と読む。待っても直らないものは、待てと言ってはならない');
  assert.match(err.message, /specify/, 'どの相が blocked かを名指していない');
});

test('G-7: ratify — 閉塞した領域は自力で祝福できない (AC-3(c2) / 第51条c)', () => {
  const { run } = mkRun();
  const d = dom(run, 'requirements');
  for (const p of d.phases) p.status = 'done';   // 相は全て done。だが領域が閉塞している
  d.status = 'blocked';
  const err = caught(() => conclave.ratify(run, 'requirements'));
  assert.ok(err, '閉塞した領域が自分で自分を祝福した —— MAX_DOMAIN_REWORK の閉塞機構が無意味になる');
  assert.strictEqual(err.code, 'RATIFY_DOMAIN_BLOCKED',
    `err.code が RATIFY_DOMAIN_BLOCKED でない: ${err.code}`);
  assert.match(err.message, /人を呼べ/, `文言が escalation を教えていない: ${err.message}`);
  assert.strictEqual(dom(run, 'requirements').status, 'blocked',
    '拒んだのに領域の status が blocked から化けた —— 部分適用である(NFR-9)');
});

// ══════════════════════════════════════════════════════════════════════
// G-8 — 拒否の文言は次の一手を含む (NFR-6)
// ══════════════════════════════════════════════════════════════════════

test('G-8: ratify — 拒否の文言は次の一手と未了の相を全て含む (NFR-6)', () => {
  const { run } = mkRun();
  const d = dom(run, 'architecture');   // 四相(ux / design / identity / detail)を持つ領域
  d.phases.find(p => p.id === 'design').status = 'done';
  const notDone = d.phases.filter(p => p.status !== 'done');
  assert.ok(notDone.length >= 2, '前提: 未了の相が 2 つ以上ある領域で撃つ');
  const err = caught(() => conclave.ratify(run, 'architecture'));
  assert.ok(err, '未了の相が在るのに祝福が通った');
  assert.match(err.message, /conclave\.js done/,
    `文言が次の一手(done の命令)を含まない: ${err.message}`);
  for (const p of notDone) {
    assert.ok(err.message.includes(`${p.id}=${p.status}`),
      `未了の相 ${p.id}=${p.status} が文言に無い: ${err.message} —— ` +
      '全部を名指さなければ、人は一つ直しては再び拒まれる');
  }
  assert.ok(Array.isArray(err.phases) && err.phases.length === notDone.length,
    'err.phases が未了の相を機械可読で持っていない —— CLI が一行ずつ出せない');
});

// ══════════════════════════════════════════════════════════════════════
// G-9 — CLI の口: exit 2 で落ち、台帳を汚さない (AC-1 / NFR-9)
// ══════════════════════════════════════════════════════════════════════

test('G-9: ratify — CLI は exit 2 で落ち、走行帳を一バイトも汚さない', () => {
  const { run } = mkRun();
  const rp = path.join(TMP, 'run-' + crypto.randomBytes(6).toString('hex') + '.json');
  fs.writeFileSync(rp, JSON.stringify(run, null, 2));
  const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  const before = sha(rp);

  const CLI = path.join(ROOT, 'graph', 'conclave.js');
  const r = spawnSync(process.execPath, [CLI, 'ratify', 'requirements', '--run', rp],
    { encoding: 'utf8', cwd: ROOT });
  assert.strictEqual(r.status, 2,
    `exit が 2 でない: ${r.status}\n--- stdout ---\n${r.stdout}\n--- stderr ---\n${r.stderr}\n` +
    'exit 1 は「engine が壊れた」、exit 2 は「人がすべきことが残っている」');
  assert.match(r.stderr, /✗ cannot ratify/, `標準エラーが拒否を名乗っていない: ${r.stderr}`);
  assert.strictEqual(sha(rp), before,
    '拒んだのに走行帳が書き換えられた —— catch の中で save を呼んでいる(NFR-9 違反)');

  // 対(第21条): 相を全て done にすれば CLI は exit 0 で通る。
  // これが無ければ「ratify は常に exit 2」でもこの門は緑になる。
  const ok = JSON.parse(fs.readFileSync(rp, 'utf8'));
  for (const p of ok.domains.find(x => x.cardinal === 'requirements').phases) p.status = 'done';
  fs.writeFileSync(rp, JSON.stringify(ok, null, 2));
  const r2 = spawnSync(process.execPath, [CLI, 'ratify', 'requirements', '--run', rp],
    { encoding: 'utf8', cwd: ROOT });
  assert.strictEqual(r2.status, 0,
    `相が全て done なのに CLI が exit ${r2.status} で落ちた\n${r2.stderr}`);
  const after = JSON.parse(fs.readFileSync(rp, 'utf8'));
  assert.strictEqual(after.domains.find(x => x.cardinal === 'requirements').status, 'ratified',
    '通ったのに台帳へ ratified が書かれていない');
});

console.log(`\nRatify guard self-test: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
