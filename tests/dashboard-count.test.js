#!/usr/bin/env node
'use strict';
/**
 * dashboard-count.test.js — G-01: **画面の数が嘘をつかない** (第22条)
 *
 * 測るのは常に「断面の数 == その場で数えた数」である。
 * **固定値を期待値にしない** (則3) —— 33 も 7 も 50 も執筆時点の参考値であって、
 * 明日 34 になれば両辺が同時に動く。動かない辺を持つ門は、いつか嘘になる。
 *
 * 担う AC: AC-01a/b/f/g/d/e, AC-02a〜c, AC-03a〜c, AC-E3, AC-17a/b/c, AC-18b/d, AC-21a/b
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { ROOT, makeHarness, siblingPresent } = require('./_pulse-fixture.js');

const pulse = require(path.join(ROOT, 'graph', 'pulse.js'));
const workspace = require(path.join(ROOT, 'graph', 'workspace.js'));
const clergy = require(path.join(ROOT, 'graph', 'clergy.js'));
const codex = require(path.join(ROOT, 'graph', 'codex.js'));
const forge = require(path.join(ROOT, 'graph', 'forge.js'));
const gauge = require(path.join(ROOT, 'graph', 'gauge.js'));

const H = makeHarness('dashboard-count');
const { test } = H;

console.log('G-01 数の一致 (第22条):');
const snap = pulse.snapshot();
// 倉は別リポジトリ。CI には隣に居ない。門は両方の世界で立たねばならない (則3)
const SIBLING = siblingPresent();
if (!SIBLING) console.log('  (兄弟倉 不在 — 不在時の契約を測る)');

test('AC-01d/AC-14c: 断面は例外を投げず、errors[] は fatal を持たない', () => {
  assert.ok(snap && typeof snap === 'object', '断面が返らない');
  for (const e of snap.errors) assert.strictEqual(e.fatal, false, '断面全体を落とす経路が在る');
});

test('AC-01a/AC-E3: counts.engines == その場で数えた graph/*.js (pulse.js 自身を含む)', () => {
  const actual = fs.readdirSync(path.join(ROOT, 'graph')).filter(f => f.endsWith('.js')).length;
  assert.strictEqual(snap.counts.engines, actual,
    `断面 ${snap.counts.engines} != 実地 ${actual} — 固定値と比べてはならない`);
});

test('AC-01b: counts.creations / workshops == 倉を数え直した数、和は visible と等しい', () => {
  if (!SIBLING) {
    // 倉が隣に無い世界 (CI の checkout)。断面は 0 で埋めず null を返し、
    // errors に理由を名指しせねばならない —— これが第16条の本番である
    assert.strictEqual(snap.counts.creations, null, '倉が無いのに creations を数字で答えた(0 で埋めた)');
    assert.strictEqual(snap.counts.workshops, null, '倉が無いのに workshops を数字で答えた');
    assert.ok(snap.errors.some(e => e.key === 'counts.creations' && /ENOENT/.test(e.reason)),
      '測れなかった理由を errors に積んでいない');
    return;
  }
  const root = workspace.resolve().root;
  const vis = fs.readdirSync(root, { withFileTypes: true })
    .filter(e => e.isDirectory()).filter(e => !e.name.startsWith('.'));
  const c = vis.filter(e => !e.name.startsWith('_')).length;
  const w = vis.filter(e => e.name.startsWith('_')).length;
  assert.strictEqual(snap.counts.creations, c, '創造物の数が割れた');
  assert.strictEqual(snap.counts.workshops, w, '作業場の数が割れた');
  assert.strictEqual(c + w, vis.length, '不変条件 creations + workshops == visible が破れた');
});

test('G-01(D-5): ドット始まりを数えると両辺が割れる(数え方が 1 本であることの証明)', () => {
  if (!SIBLING) {
    // 数え方の証明は倉を要する。倉が無いなら「数えられなかった」ことを証明する
    assert.strictEqual(snap.counts.creations, null, '倉不在でも数字を答えている');
    assert.throws(() => pulse.visibleDirs(workspace.resolve().root),
      '不在の倉に対して visibleDirs が黙って空配列を返した — 不在と空は別物である');
    return;
  }
  const root = workspace.resolve().root;
  const withDots = fs.readdirSync(root, { withFileTypes: true }).filter(e => e.isDirectory()).length;
  const visible = pulse.visibleDirs(root).length;
  // .git / .github が在る限り両者は違う。断面は visible 側に立っていなければならない
  assert.ok(withDots >= visible, '数え方が逆転している');
  assert.strictEqual(snap.counts.creations + snap.counts.workshops, visible,
    '断面がドット始まりを数えている — visibleDirs() の `.` 除外が外れた');
});

test('AC-01f: counts.cardinals == Object.keys(clergy.COLLEGE).length', () => {
  assert.strictEqual(snap.counts.cardinals, Object.keys(clergy.COLLEGE).length);
});

test('AC-01g: counts.articles == codex が数える条数', () => {
  assert.strictEqual(snap.counts.articles, codex.parse().length);
});

test('AC-17a/17b: counts.kgNodes / kgEdges == JSONL の解釈できた行数', () => {
  const kgRoot = process.env.PARADISE_KG || path.join(os.homedir(), '.claude', 'paradise-kg');
  for (const [key, file] of [['kgNodes', 'nodes.jsonl'], ['kgEdges', 'edges.jsonl']]) {
    const p = path.join(kgRoot, file);
    if (!fs.existsSync(p)) { assert.strictEqual(snap.counts[key], null, '不在なら null(0 で埋めない)'); continue; }
    let n = 0;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim(); if (!t) continue;
      try { JSON.parse(t); n++; } catch { /* 途中書きは数えない */ }
    }
    assert.strictEqual(snap.counts[key], n, `${key} が割れた`);
  }
});

test('AC-17c: 壊れた行があっても断面は落ちず、解釈できた行数を返す', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-kg-'));
  try {
    fs.writeFileSync(path.join(dir, 'nodes.jsonl'), '{"id":"a"}\n{"id":"b"}\n{"id":"c"  ');
    fs.writeFileSync(path.join(dir, 'edges.jsonl'), '{"from":"a","to":"b"}\n');
    const prev = process.env.PARADISE_KG;
    process.env.PARADISE_KG = dir;
    const s = pulse.snapshot();
    if (prev === undefined) delete process.env.PARADISE_KG; else process.env.PARADISE_KG = prev;
    assert.strictEqual(s.counts.kgNodes, 2, '壊れた末尾行を数えてしまった');
    assert.strictEqual(s.counts.kgEdges, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('AC-18b/18d: lessonsByKind の合計 == counts.lessons、鍵に mechanism / conduct を含む', () => {
  const sum = Object.values(snap.lessonsByKind).reduce((a, b) => a + b, 0);
  // 合計と総数の一致は**常に**主張する。0 件でも一致していなければ嘘である
  assert.strictEqual(sum, snap.counts.lessons, '教訓の内訳と総数が割れた');
  const keys = Object.keys(snap.lessonsByKind);
  // 教訓は KG (~/.claude/paradise-kg) に住む。CI の checkout に KG は無い。
  // 「2 値のいずれかが現れる」は KG が在るときだけ言える (則3)。
  // 教訓ゼロの世界では、内訳が空であること自体が正しい姿である
  if (snap.counts.lessons > 0) {
    assert.ok(keys.includes('mechanism') || keys.includes('conduct'), '2 値のいずれも現れない');
  } else {
    assert.deepStrictEqual(snap.lessonsByKind, {},
      '教訓 0 件なのに内訳が中身を持っている — 数えていない鍵を捏造している');
  }
});

test('AC-18c: 一時ファイルの屑を残さない', () => {
  const tmp = os.tmpdir();
  const before = fs.readdirSync(tmp).filter(f => /pd-lessons|pulse-lessons/.test(f)).length;
  pulse.snapshot();
  const after = fs.readdirSync(tmp).filter(f => /pd-lessons|pulse-lessons/.test(f)).length;
  assert.strictEqual(after, before, `教訓の一時ファイルが ${after - before} 件残った`);
});

test('AC-21a/21b: 6 つの道すべての相数が forge.buildDag と一致する', () => {
  const names = Object.keys(forge.SCALES);
  assert.strictEqual(Object.keys(snap.scale).filter(k => k !== 'classifierAvailable').length, names.length,
    '道の数が forge と割れた');
  for (const n of names) {
    assert.strictEqual(snap.scale[n].phases, forge.buildDag('x', n).tasks.length, `道 ${n} の相数が割れた`);
  }
});

test('AC-22b: ledger.length == readLedger().length(3 値一致の 2 辺)', () => {
  assert.ok(Array.isArray(snap.ledger), 'ledger が配列でない — null は読めなかった印である');
  // 一致は常に主張する。**下限は倉が在るときだけ** —— 台帳 gauge-ledger.jsonl は
  // 倉の中に住む (第30条)。倉が無い CI で「1 件以上」を求めるのは、
  // 固定の環境を期待値にした門である (則3)
  assert.strictEqual(snap.ledger.length, gauge.readLedger().length);
  if (SIBLING) assert.ok(snap.ledger.length >= 1, '下限 1 件を割った');
  else assert.strictEqual(snap.ledger.length, 0, '倉が無いのに台帳が中身を持っている');
});

test('AC-01e: PULSE_FAULT で 1 engine を壊しても断面全体は返り、errors に名が載る', () => {
  const prev = process.env.PULSE_FAULT;
  process.env.PULSE_FAULT = 'clergy';
  let s;
  try { s = pulse.snapshot(); } finally {
    if (prev === undefined) delete process.env.PULSE_FAULT; else process.env.PULSE_FAULT = prev;
  }
  assert.ok(s && s.counts, '故障注入で断面が落ちた');
  assert.ok(s.errors.some(e => e.engine === 'clergy'), 'errors に clergy が載らない');
  assert.strictEqual(s.counts.cardinals, null, '壊れた鍵を 0 で埋めた — null でなければならない');
  assert.notStrictEqual(s.counts.engines, null, '他の鍵まで落ちた');
});

test('AC-02b/02c: 画面に固定メトリクス配列も架空 DAG リテラルも無い', () => {
  const js = fs.readFileSync(path.join(ROOT, 'dashboard', 'paradise.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'dashboard', 'index.html'), 'utf8');
  assert.strictEqual((js.match(/\bv: *[0-9]+/g) || []).length, 0, '固定メトリクス v:<数> が残っている');
  const dagLit = (js + html).match(/SELF_DAG/g) || [];
  assert.strictEqual(dagLit.length, 0, '架空の自己 DAG リテラルが残っている');
});

test('AC-03a: graph/ に旧住所の直書きが 1 件も無い', () => {
  const dir = path.join(ROOT, 'graph');
  let hits = 0;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    hits += (src.match(/path\.join\(ROOT, *['"]creations['"]\)/g) || []).length;
  }
  assert.strictEqual(hits, 0, '旧住所の直書きが残っている');
});

const r = H.report();
if (require.main === module) process.exit(r.fail === 0 ? 0 : 1);
module.exports = r;
