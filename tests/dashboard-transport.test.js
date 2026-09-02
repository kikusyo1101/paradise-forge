#!/usr/bin/env node
'use strict';
/**
 * dashboard-transport.test.js — 三層フォールバックの構造 (FR-08 / §4)
 * 担う AC: AC-08a/08b, AC-RT-1, AC-RT-2, AC-N03c
 *
 * **定数の二重管理を禁じる。** 画面が 10000 を、engine が 12000 を持てば、
 * 同じ断面に対して画面と engine が違う鮮度を言う。嘘は齟齬から生まれる。
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { ROOT, makeHarness } = require('./_pulse-fixture.js');

const H = makeHarness('dashboard-transport');
const { test } = H;
const DASH = path.join(ROOT, 'dashboard');
const js = fs.readFileSync(path.join(DASH, 'paradise.js'), 'utf8');
const html = fs.readFileSync(path.join(DASH, 'index.html'), 'utf8');
const pulseSrc = fs.readFileSync(path.join(ROOT, 'graph', 'pulse.js'), 'utf8');
const pulse = require(path.join(ROOT, 'graph', 'pulse.js'));

console.log('三層フォールバック (FR-08):');

test('AC-08a: 3 層すべての分岐が画面に実在する', () => {
  assert.ok(/EventSource/.test(js), '第1層 EventSource が無い');
  assert.ok(/fetch\(/.test(js), '第2層 fetch が無い');
  assert.ok(/window\.PARADISE_STATE/.test(js), '第3層 埋め込み JS が無い');
});

test('AC-08a: data-transport の取り得る値が sse / poll / frozen の 3 つ', () => {
  const vals = new Set();
  for (const m of js.matchAll(/transport = '([a-z]+)'/g)) vals.add(m[1]);
  for (const m of html.matchAll(/data-transport="([a-z]+)"/g)) vals.add(m[1]);
  for (const m of js.matchAll(/render\([^,]+, '([a-z]+)'\)/g)) vals.add(m[1]);
  for (const v of vals) assert.ok(['sse', 'poll', 'frozen'].includes(v), `未知の経路 ${v}`);
  for (const v of ['sse', 'poll', 'frozen']) assert.ok(vals.has(v), `経路 ${v} が現れない`);
});

test('AC-08b/AC-RT-2: 7 定数の定義箇所がそれぞれ 1 箇所のみ', () => {
  const names = ['FIRST_EVENT_TIMEOUT_MS', 'ERROR_STREAK', 'POLL_INTERVAL_MS',
    'PROMOTE_RETRY_MS', 'RETRY_HINT_MS', 'KEEPALIVE_MS', 'WATCH_DEBOUNCE_MS'];
  for (const n of names) {
    // engine 側 (graph/pulse.js) の T に 1 箇所
    const inEngine = (pulseSrc.match(new RegExp(`^\\s*${n}:`, 'gm')) || []).length;
    assert.strictEqual(inEngine, 1, `${n} が engine に ${inEngine} 箇所 — 1 箇所でなければ二重管理`);
  }
  // 画面側 (dashboard/paradise.js) の TH も、持つものは 1 箇所ずつ
  const shown = ['FIRST_EVENT_TIMEOUT_MS', 'ERROR_STREAK', 'POLL_INTERVAL_MS', 'PROMOTE_RETRY_MS'];
  for (const n of shown) {
    const inClient = (js.match(new RegExp(`^\\s*${n}:`, 'gm')) || []).length;
    assert.strictEqual(inClient, 1, `${n} が画面に ${inClient} 箇所`);
  }
});

test('AC-07b: 画面と engine の閾値が一致する(鮮度・降格判定)', () => {
  const client = require(path.join(DASH, 'paradise.js'));
  for (const [ck, ek] of [['FRESH_LIVE_MS', 'FRESH_LIVE_MS'], ['FRESH_FROZEN_MS', 'FRESH_FROZEN_MS'],
    ['POLL_INTERVAL_MS', 'POLL_INTERVAL_MS'], ['FIRST_EVENT_TIMEOUT_MS', 'FIRST_EVENT_TIMEOUT_MS'],
    ['ERROR_STREAK', 'ERROR_STREAK'], ['PROMOTE_RETRY_MS', 'PROMOTE_RETRY_MS']]) {
    assert.strictEqual(client.TH[ck], pulse.T[ek],
      `${ck}: 画面 ${client.TH[ck]} != engine ${pulse.T[ek]} — 同じ断面に 2 つの鮮度が生まれる`);
  }
});

test('AC-RT-1: 降格・昇格の一行ログが画面に在る', () => {
  assert.ok(/data-log="transport"/.test(html), '一行ログの器が無い');
  assert.ok(/data-log="transport"/.test(js), '一行ログへ書く経路が無い');
  assert.ok(/理由: /.test(js), 'ログに理由を書いていない — 降格の理由が判らなければ嘘と同じ');
});

test('AC-N03c: 同時接続の上限に触れる文言が画面に在る', () => {
  assert.ok(/同時接続/.test(html), '同時接続の上限への言及が無い');
});

test('昇格の経路が在る — 一度落ちた画面が二度と戻らないのは嘘である', () => {
  assert.ok(/schedulePromote|PROMOTE_RETRY_MS/.test(js), '第1層への再挑戦が無い');
});

test('自前の再接続を書いていない(EventSource の既定動作に任せる)', () => {
  // onerror で即座に new EventSource する形は、既定の再接続と二重に走り接続数を食う
  const bad = /onerror[\s\S]{0,200}new EventSource/.test(js);
  assert.ok(!bad, '自前の再接続が EventSource の再接続と二重に走る');
});

const r = H.report();
if (require.main === module) process.exit(r.fail === 0 ? 0 : 1);
module.exports = r;
