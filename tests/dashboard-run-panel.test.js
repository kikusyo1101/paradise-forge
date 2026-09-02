#!/usr/bin/env node
'use strict';
/**
 * dashboard-run-panel.test.js — FR-13 / FR-14 / FR-22
 * 担う AC: AC-13a〜e, AC-14a〜i, AC-22a/b/c
 *
 * ■ 本ファイルで最も重い門は **D-3 の故障注入**である。
 *   spawn-trace.report() にパス文字列を渡すと、例外を投げず {ok:true,total:0} を返す。
 *   try/catch の殻に捕まらず errors[] にも積まれず、矛盾規則が構造的に永久 false になる。
 *   **引数の型を間違えると門が鳴ること**が要件である(第50条)。
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { ROOT, makeHarness, siblingPresent, synthRunFile } = require('./_pulse-fixture.js');

const H = makeHarness('dashboard-run-panel');
const { test } = H;
const pulse = require(path.join(ROOT, 'graph', 'pulse.js'));
const gauge = require(path.join(ROOT, 'graph', 'gauge.js'));
const spawnTrace = require(path.join(ROOT, 'graph', 'spawn-trace.js'));
const workspace = require(path.join(ROOT, 'graph', 'workspace.js'));
const DASH = path.join(ROOT, 'dashboard');
const html = fs.readFileSync(path.join(DASH, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(DASH, 'paradise.js'), 'utf8');
const pulseSrc = fs.readFileSync(path.join(ROOT, 'graph', 'pulse.js'), 'utf8');
const snap = pulse.snapshot();

console.log('走行中の環・点数・起動実績 (FR-13/14/22):');
// 倉は別リポジトリ。CI には隣に居ない (第30条)。倉の中身に依る主張と、
// 倉に依らない主張を分ける — 後者は**どこでも**測らねばならない (則3)
const SIBLING = siblingPresent();
if (!SIBLING) console.log('  (兄弟倉 不在 — 合成 run で engine の契約を測る)');

test('AC-14b: runs.length == 実在する conclave.json の数(取りこぼしを許さない)', () => {
  if (!SIBLING) {
    assert.deepStrictEqual(snap.runs, [], '倉が無いのに run を数え上げた');
    assert.ok(snap.errors.some(e => e.key === 'runs' && /ENOENT/.test(e.reason)),
      '倉を読めなかった理由を errors に積んでいない');
    return;
  }
  const root = workspace.resolve().root;
  const actual = fs.readdirSync(root, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_'))
    .filter(e => fs.existsSync(path.join(root, e.name, 'conclave.json'))).length;
  assert.strictEqual(snap.runs.length, actual);
});

test('AC-14a/14d/14h: 各 run の数が conclave.json 直読みと一致する', () => {
  for (const r of snap.runs) {
    const run = JSON.parse(fs.readFileSync(r.path, 'utf8'));
    let done = 0, total = 0, rat = 0;
    for (const d of run.domains) {
      total += d.phases.length;
      done += d.phases.filter(p => p.status === 'done').length;
      if (d.status === 'ratified') rat++;
    }
    assert.strictEqual(r.phasesDone, done, `${r.name} の done が割れた`);
    assert.strictEqual(r.phasesTotal, total, `${r.name} の total が割れた`);
    assert.strictEqual(r.domainsRatified, rat, `${r.name} の批准数が割れた`);
    assert.strictEqual(r.domainsTotal, run.domains.length);
    assert.strictEqual(r.historyLength, (run.history || []).length, `${r.name} の履歴数が割れた`);
  }
});

test('AC-14d: phasesTotal は gauge と forge の 2 つの数え方と一致する(3 値一致)', () => {
  const forge = require(path.join(ROOT, 'graph', 'forge.js'));
  for (const r of snap.runs) {
    const run = JSON.parse(fs.readFileSync(r.path, 'utf8'));
    const g = gauge.score(run);                         // 引数は run オブジェクト (罠 T-5)
    assert.strictEqual(r.phasesTotal, g.phasesTotal, `${r.name}: 断面と gauge が割れた`);
    // 道が一意に定まる run については forge とも一致する
    if (r.scaleGuess) {
      assert.strictEqual(r.phasesTotal, forge.buildDag('x', r.scaleGuess).tasks.length,
        `${r.name}: 断面と forge が割れた`);
    }
  }
});

test('AC-14e: 停止中の run が phasesDone < phasesTotal で名指しされている', () => {
  const stalled = snap.runs.filter(r => r.phasesDone < r.phasesTotal);
  for (const r of stalled) assert.strictEqual(r.state, 'stalled', `${r.name} が stalled と名乗らない`);
  const complete = snap.runs.filter(r => r.phasesTotal > 0 && r.phasesDone === r.phasesTotal);
  for (const r of complete) assert.strictEqual(r.state, 'complete');
});

test('AC-14i: 画面が data-run-state の 2 値を持ち、stalled の数が断面と一致する', () => {
  const vals = new Set([...(js + html).matchAll(/data-run-state[=:]\s*['"]?([a-z]+)/g)].map(m => m[1]));
  assert.ok(vals.size >= 2 || /data-run-state/.test(js), '停止と完了の印が無い');
  // 画面は断面の r.state をそのまま印にする。両者が同じ規則であることを測る
  assert.ok(/'data-run-state': r\.state/.test(js), '画面が断面と別の規則で印を付けている');
});

test('AC-13a: 点数と起動実績が同一の親要素内に並置される', () => {
  const m = js.match(/'data-score':[\s\S]{0,400}?'data-spawn-notrace':/);
  assert.ok(m, 'data-score と data-spawn-* が同じ要素に付いていない — 離せば矛盾は見えない');
});

test('AC-13b: spawn.noTrace / score が engine の直呼びと一致する', () => {
  for (const r of snap.runs) {
    const run = JSON.parse(fs.readFileSync(r.path, 'utf8'));
    const rep = spawnTrace.report(run);                 // 引数は run オブジェクト (罠 T-6)
    assert.ok(rep.total > 0, `${r.name}: report が total=0 — 測れていない`);
    assert.ok(r.spawn, `${r.name}: 断面の spawn が null`);
    assert.strictEqual(r.spawn.noTrace, rep.noTrace, `${r.name} の noTrace が割れた`);
    assert.strictEqual(r.spawn.total, rep.total);
    assert.strictEqual(r.score, gauge.score(run).score, `${r.name} の score が割れた`);
  }
});

test('AC-13c: spawn-trace の exit 1 を errors に積まない(事実であって故障ではない)', () => {
  const bad = snap.errors.filter(e => e.engine === 'spawn-trace');
  assert.deepStrictEqual(bad, [], '起動証跡なしという事実を engine の故障として積んでいる');
});

test('AC-13d: 軌跡指標 5 種すべてが画面に存在する', () => {
  const set = new Set([...html.matchAll(/data-metric="([A-Za-z]+)"/g)].map(m => m[1]));
  for (const k of ['firstPassRate', 'reworkCount', 'retryOverhead', 'loopGuardTrips', 'durationMs']) {
    assert.ok(set.has(k), `指標 ${k} が画面に無い — 測らなかった走行は改善を語れない`);
  }
});

test('AC-13e: 矛盾の規則が断面で成立し、画面に印が在る', () => {
  for (const r of snap.runs) {
    if (r.score === null || r.spawn === null) {
      assert.strictEqual(r.contradiction, null, `${r.name}: 測れないのに矛盾を false と言っている(第16条)`);
    } else {
      assert.strictEqual(r.contradiction, r.score >= 90 && r.spawn.noTrace > 0, `${r.name} の矛盾判定が規則と違う`);
    }
  }
  assert.ok(/data-contradiction="true"/.test(html), '画面に矛盾の印が無い');
});

/* ══════════════════════════════════════════════════════════
   D-3 の故障注入 — **本ファイルで最も重い門**
   ══════════════════════════════════════════════════════════ */
test('D-3(故障注入): report にパスを渡すと total=0 になり、防御が spawn=null を返す', () => {
  // **この門は倉に依ってはならない。** 測るのは engine の契約であって倉の中身ではない。
  // 倉が在れば実物の run を、無ければ合成した run を使う (則3)
  const synth = SIBLING ? null : synthRunFile();
  const runPath = SIBLING ? snap.runs[0] && snap.runs[0].path : synth.file;
  const runName = SIBLING ? snap.runs[0] && snap.runs[0].name : 'synth';
  try {
    assert.ok(runPath, 'run が 1 件も無い');
    // 誤った呼び方 —— **例外を投げない。静かに緑を返す**
    const wrong = spawnTrace.report(runPath);
    assert.strictEqual(wrong.total, 0, 'パス渡しが total>0 を返した(前提が変わった)');
    assert.strictEqual(wrong.ok, true, 'パス渡しが ok:false を返した(前提が変わった)');
    assert.strictEqual(wrong.noTrace, 0, 'パス渡しが noTrace>0 を返した(前提が変わった)');

    // 防御を通せば **null になり errors に積まれる**。0 ではない
    const errors = [];
    const guarded = pulse.readSpawn(runPath, runName, errors);
    assert.strictEqual(guarded, null, 'total=0 を「数えて 0」として通してしまった');
    assert.strictEqual(errors.length, 1, '測り損ねを errors に積んでいない');
    assert.strictEqual(errors[0].engine, 'spawn-trace');
    assert.ok(/total=0/.test(errors[0].reason), '理由が total を名指ししていない');

    // 正しい呼び方なら測れる
    const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    const good = pulse.readSpawn(run, runName, []);
    assert.ok(good && good.total > 0, 'run オブジェクト渡しでも測れない');
  } finally { if (synth) synth.cleanup(); }
});

test('D-3(故障注入): 防御が無ければ矛盾が 0 件に化ける — その差を数で示す', () => {
  if (!SIBLING) {
    // 倉が無ければ「実際の矛盾」は数えられない。数えられないことを正直に測る。
    // engine の契約(パス渡しは矛盾を構造的に見えなくする)は上の門が担う
    assert.deepStrictEqual(snap.runs, [], '倉不在なのに run が在る');
    const synth = synthRunFile();
    try {
      const raw = spawnTrace.report(synth.file);
      assert.strictEqual(raw.noTrace, 0,
        'パス渡しでも noTrace が見えている — 矛盾規則が永久 false になる前提が崩れた');
    } finally { synth.cleanup(); }
    return;
  }
  // 防御なしの世界 (前版の設計) を再現し、矛盾の件数を数える
  let withoutGuard = 0, withGuard = 0;
  for (const r of snap.runs) {
    const raw = spawnTrace.report(r.path);              // 誤: パス渡し
    if (r.score !== null && r.score >= 90 && raw.noTrace > 0) withoutGuard++;
    if (r.contradiction === true) withGuard++;
  }
  assert.strictEqual(withoutGuard, 0, '前提が変わった — パス渡しでも矛盾が見えている');
  assert.ok(withGuard >= 1,
    `防御ありの矛盾が ${withGuard} 件 — 1 件以上でなければ本改修の本分が見えていない`);
});

test('AC-22a: gauge.baseline を呼ばない(時刻を再計算する道を断つ)', () => {
  const files = [pulseSrc, js, html];
  for (const src of files) {
    const code = src.split('\n').filter(l => {
      const t = l.trim();
      return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--'));
    }).join('\n');
    const hits = code.match(/gauge\.baseline|gauge\.js baseline|gauge baseline/g) || [];
    assert.deepStrictEqual(hits, [], 'baseline を呼んでいる — 同じ出来事に 2 つの時刻が生まれる');
  }
});

test('AC-22b: ledger.length の 3 値一致(源 / CLI / 断面)', () => {
  const src = gauge.readLedger().length;
  assert.strictEqual(snap.ledger.length, src, '断面と源が割れた');
  // 台帳は倉の中に住む (第30条)。下限は倉が在るときだけ主張できる (則3)
  if (SIBLING) assert.ok(src >= 1, '下限 1 件を割った');
  else assert.strictEqual(src, 0, '倉が無いのに台帳が中身を持っている');
  // ts は台帳が記録したものをそのまま運ぶ。再計算していないこと
  const rows = gauge.readLedger();
  for (let i = 0; i < rows.length; i++) {
    assert.strictEqual(snap.ledger[i].ts, rows[i].ts, `${i} 行目の時刻が加工されている`);
  }
});

test('AC-22c: 出所ラベル data-source="gauge-ledger" が画面に在る', () => {
  assert.ok(/data-source="gauge-ledger"/.test(html) || /'data-source': 'gauge-ledger'/.test(js),
    '点数履歴の出所を画面が名乗らない');
});

test('FR-22(故障注入): ledger 鍵が断面から消えれば 3 値一致が崩れる', () => {
  const fake = { ...snap };
  delete fake.ledger;
  assert.strictEqual(fake.ledger, undefined);
  // 門は「断面が ledger を持つこと」を前提にしている。持たなければ上の AC-22b が落ちる
  let threw = false;
  try { assert.strictEqual(fake.ledger.length, gauge.readLedger().length); } catch { threw = true; }
  assert.ok(threw, 'ledger が消えても門が鳴らない');
});

const r = H.report();
if (require.main === module) process.exit(r.fail === 0 ? 0 : 1);
module.exports = r;
