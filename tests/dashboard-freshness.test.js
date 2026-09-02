#!/usr/bin/env node
'use strict';
/**
 * dashboard-freshness.test.js — 鮮度と「生 / 凍結」(FR-07)
 * 担う AC: AC-07a/07b/07c
 *
 * **境界値を全数検査する。** 10000 と 10001、60000 と 60001 —— 境界の片側だけを
 * 試す門は、不等号の向きを間違えたまま緑を返す。
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');
const { ROOT, makeHarness } = require('./_pulse-fixture.js');

const H = makeHarness('dashboard-freshness');
const { test } = H;
const pulse = require(path.join(ROOT, 'graph', 'pulse.js'));
const client = require(path.join(ROOT, 'dashboard', 'paradise.js'));
const html = fs.readFileSync(path.join(ROOT, 'dashboard', 'index.html'), 'utf8');

console.log('鮮度 (FR-07):');

test('AC-07a: 境界値 5 通り + 第3層 — engine の純関数', () => {
  const want = [[0, 'live'], [10000, 'live'], [10001, 'lagging'], [60000, 'lagging'], [60001, 'frozen']];
  for (const [age, exp] of want) {
    assert.strictEqual(pulse.freshness(age, 'sse'), exp, `age=${age} で ${exp} を期待`);
  }
  // 第3層は ageMs に関わらず必ず frozen。1 秒前のデータでも「これから古くなり続ける」
  assert.strictEqual(pulse.freshness(0, 'frozen'), 'frozen');
});

test('AC-07a: CLI も同じ答えを返す(画面と engine の入口を分けない)', () => {
  const run = (age, tr) => execFileSync(process.execPath,
    [path.join(ROOT, 'graph', 'pulse.js'), 'freshness', '--age-ms', String(age), '--transport', tr],
    { encoding: 'utf8' }).trim();
  assert.strictEqual(run(0, 'sse'), 'live');
  assert.strictEqual(run(10000, 'sse'), 'live');
  assert.strictEqual(run(10001, 'sse'), 'lagging');
  assert.strictEqual(run(60000, 'sse'), 'lagging');
  assert.strictEqual(run(60001, 'sse'), 'frozen');
  assert.strictEqual(run(0, 'frozen'), 'frozen');
});

test('AC-07b: 画面と engine が同じ閾値を持つ(二重管理の禁止)', () => {
  assert.strictEqual(client.TH.FRESH_LIVE_MS, pulse.T.FRESH_LIVE_MS);
  assert.strictEqual(client.TH.FRESH_FROZEN_MS, pulse.T.FRESH_FROZEN_MS);
  // 画面側の分類も engine と同じ答えを返さねばならない
  for (const [age, tr] of [[0, 'sse'], [10000, 'poll'], [10001, 'sse'], [60000, 'poll'], [60001, 'sse'], [0, 'frozen']]) {
    assert.strictEqual(client.freshnessOf(age, tr), pulse.freshness(age, tr),
      `age=${age} transport=${tr} で画面と engine が違う鮮度を言う`);
  }
});

test('AC-07c: 3 区分すべてが画面に実在する', () => {
  const vals = new Set([...html.matchAll(/data-freshness="([a-z]+)"/g)].map(m => m[1]));
  for (const v of ['live', 'lagging', 'frozen']) assert.ok(vals.has(v), `区分 ${v} が画面に無い`);
  assert.strictEqual(vals.size, 3, `区分が ${vals.size} 個`);
});

test('経過は相対表記で出る — toISOString() の文字列を画面に出さない', () => {
  assert.strictEqual(client.relTime(0), 'たった今');
  assert.strictEqual(client.relTime(1999), 'たった今');
  assert.strictEqual(client.relTime(2000), '2 秒前');
  assert.strictEqual(client.relTime(59999), '59 秒前');
  assert.strictEqual(client.relTime(60000), '1 分前');
  assert.ok(/時間/.test(client.relTime(3600000)));
  assert.ok(/日前/.test(client.relTime(86400000 * 3)));
  const js = fs.readFileSync(path.join(ROOT, 'dashboard', 'paradise.js'), 'utf8');
  // 註釈が「toISOString を出さない」と述べることは違反ではない(第28条の同型)。
  // 咎めるのは **実際に呼ぶ行**である。ゆえに註釈を丸ごと取り除いてから見る。
  const code = js.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .filter(l => !l.trim().startsWith('//')).join('\n');
  assert.ok(!/toISOString\(\)/.test(code), '画面が toISOString() を出している — UTC は神の時計ではない');
});

test('凍結時の絶対表記は局所時刻である(Intl は外部依存ではない)', () => {
  const s = client.localStamp(Date.now());
  assert.ok(!/T\d\d:|Z$/.test(s), `絶対表記が ISO のままである: ${s}`);
  assert.ok(/\d/.test(s), '絶対表記が数を持たない');
});

const r = H.report();
if (require.main === module) process.exit(r.fail === 0 ? 0 : 1);
module.exports = r;
