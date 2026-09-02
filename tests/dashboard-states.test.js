#!/usr/bin/env node
'use strict';
/**
 * dashboard-states.test.js — FR-20: **5 状態をすべて設計する**
 * 担う AC: AC-20a〜e, AC-06d, AC-16a/16b/16c/16d, AC-N06b
 *
 * 「設計されていない状態は、誰も見ていない状態である」(第18条a)。
 * **スピナーは禁じ手** —— 回る円は「動いている」ことしか伝えず、止まっているときも回り続ける。
 * 経過秒は止まったら止まる。**経過秒は嘘をつけない。**
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { ROOT, makeHarness } = require('./_pulse-fixture.js');

const H = makeHarness('dashboard-states');
const { test } = H;
const DASH = path.join(ROOT, 'dashboard');
const html = fs.readFileSync(path.join(DASH, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(DASH, 'paradise.js'), 'utf8');
const pulse = require(path.join(ROOT, 'graph', 'pulse.js'));
const dailyGuard = require(path.join(ROOT, 'graph', 'daily-guard.js'));

console.log('5 状態 (FR-20):');
const STATES = ['ready', 'empty', 'loading', 'error', 'disconnected'];
const faultArg = process.argv.indexOf('--fault');
const fault = faultArg >= 0 ? process.argv[faultArg + 1] : null;

test('AC-20a: 5 つの状態すべてに対応する分岐が画面に在る', () => {
  for (const s of STATES) {
    const inHtml = new RegExp(`data-state="${s}"`).test(html);
    const inJs = new RegExp(`'${s}'`).test(js);
    assert.ok(inHtml || inJs, `状態 ${s} の分岐が無い — 設計されていない状態は誰も見ていない状態である`);
  }
});

test('AC-20a: 全パネルが起動時から data-state を持つ(「どれでもない」を作らない)', () => {
  const sections = html.match(/<section[^>]*data-panel="[a-z-]+"[^>]*>/g) || [];
  assert.ok(sections.length >= 8, `領域が ${sections.length} 個`);
  for (const s of sections) {
    assert.ok(/data-state="/.test(s), `状態を持たない領域が在る: ${s.slice(0, 80)}`);
  }
});

test('AC-20b: スピナー禁止 — loading / disconnected は必ず data-awaiting を持つ', () => {
  // HTML 側: data-state="loading" の要素はすべて data-awaiting を伴う
  for (const m of html.matchAll(/<section[^>]*data-state="(loading|disconnected)"[^>]*>/g)) {
    assert.ok(/data-awaiting="[^"]+"/.test(m[0]), `data-awaiting の無い loading が在る: ${m[0].slice(0, 90)}`);
  }
  // JS 側: setState が loading/disconnected/error で awaiting を立てる
  assert.ok(/state === 'loading' \|\| state === 'disconnected'/.test(js),
    'loading / disconnected で awaiting を立てる分岐が無い');
  // 回る円を作っていないこと
  assert.ok(!/spinner|回転|@keyframes\s+spin/i.test(html), 'スピナーが在る');
});

test('AC-20c: data-awaiting の値がすべて実在する engine の名である', () => {
  const engines = new Set(fs.readdirSync(path.join(ROOT, 'graph'))
    .filter(f => f.endsWith('.js') || f.endsWith('.mjs'))
    .map(f => f.replace(/\.(js|mjs)$/, '')));
  const names = new Set();
  for (const m of html.matchAll(/data-awaiting="([^"]+)"/g)) names.add(m[1]);
  // showError / setState の第3引数(engine 名)と、要素属性として直に書いた値
  for (const m of js.matchAll(/setState\([^,]+, '(?:loading|disconnected|error)', '([a-zA-Z.-]+)'\)/g)) names.add(m[1]);
  for (const m of js.matchAll(/'data-awaiting': '([a-zA-Z.-]+)'/g)) names.add(m[1]);
  // 画面が名指ししてよい engine の白名簿。ここも実在で裁く
  for (const m of js.matchAll(/^var KNOWN_ENGINES = \[([\s\S]*?)\];/gm)) {
    for (const n of m[1].match(/'([a-zA-Z-]+)'/g) || []) names.add(n.replace(/'/g, ''));
  }
  assert.ok(names.size > 0, 'data-awaiting が 1 件も無い');
  for (const n of names) {
    const base = n.split('.')[0];                 // 'pulse.serve' → 'pulse'
    assert.ok(engines.has(base), `架空の名を待っている: ${n}(実在する engine ではない)`);
  }
});

test('AC-20d: PULSE_FAULT で 1 engine を壊すと、その鍵だけが errors に載る', () => {
  const target = fault || 'wiring';
  const prev = process.env.PULSE_FAULT;
  process.env.PULSE_FAULT = target;
  let s;
  try { s = pulse.snapshot(); } finally {
    if (prev === undefined) delete process.env.PULSE_FAULT; else process.env.PULSE_FAULT = prev;
  }
  const named = s.errors.filter(e => e.engine === target);
  assert.ok(named.length >= 1, `${target} を壊したのに errors に載らない`);
  // 他の門は測れている = 「そのパネルだけ」が error になる
  const other = s.gates.filter(g => g.name !== target);
  assert.ok(other.every(g => typeof g.ok === 'boolean'), '他の門まで巻き添えで落ちた');
  assert.ok(s.counts.engines !== null, '全画面が落ちた');
});

test('AC-20e / AC-N06b: 空と 0 を区別する — null は ready にならない', () => {
  // 断面が null を返す鍵は「数えられなかった」であり、画面は ready にしない
  assert.ok(/data-measured/.test(js), '数えられたか否かの印が画面に無い');
  assert.ok(/v === null \|\| v === undefined/.test(js), 'null と 0 を分ける分岐が無い');
  // 走行中の環: 0 件は empty であり、「0」を出す ready ではない
  assert.ok(/snap\.runs\.length === 0[\s\S]{0,200}showEmpty/.test(js),
    '環 0 件のとき empty を出す分岐が無い — 0 を表示する ready にしてはならない');
  assert.ok(/走行中の環はありません/.test(js), '「無い」ことを言い切る文言が無い');
});

test('AC-20f(F-7): 深掘り画面も null を数のように描かない — 掟は画面を問わない (第16条)', () => {
  // ■ F-7 が負債として残った理由は「門の射程外」だった —— この門は index.html と
  //   paradise.js しか見ておらず、control.html は**壊れても鳴らなかった**(第50条)。
  //   実際 control.html:219 は snap.counts.kgNodes を素の文字列連結で描き、
  //   counts=null のとき画面に「KG ノード null」と出ていた。
  //   同画面の errors 表が理由を名指しするので嘘ではないが、
  //   **測れなかったことを値のように見せる**のは第16条の精神に反する。
  const ctl = fs.readFileSync(path.join(DASH, 'control.html'), 'utf8');

  // 素の連結で counts を描いていないこと(これが F-7 の形そのもの)
  const raw = ctl.match(/\+\s*snap\.counts\.[A-Za-z]+/g) || [];
  assert.deepStrictEqual(raw, [],
    `counts を素の文字列連結で描いている ${raw.join(', ')} — null が "null" と出る`);

  // 測れなかったことを名乗る語彙を持っていること
  assert.ok(/測れず|—/.test(ctl), 'null を名乗る文言が無い');
  assert.ok(/v === null \|\| v === undefined/.test(ctl),
    'null と 0 を分ける分岐が無い — 0 は「数えて 0」、null は「数えられなかった」である');
});

test('AC-06d: census 未取得のとき data-state="empty" + data-awaiting="census"', () => {
  const snap = pulse.snapshot();
  assert.strictEqual(snap.census, null, 'census が同期経路で取られている(120 秒が画面に入る)');
  assert.ok(/'data-awaiting', 'census'/.test(js) || /data-awaiting', 'census/.test(js),
    'census を名指しして待つ分岐が無い');
  assert.ok(/最大 120 秒/.test(js), '予想所要を併記していない');
});

test('AC-16a/16b/16c: daily は exit code ではなく due 欄で判ずる', () => {
  const snap = pulse.snapshot();
  const live = dailyGuard.isDue();
  assert.strictEqual(snap.daily.due, !!live.due, 'due が engine と割れた');
  assert.strictEqual(snap.daily.owedDay, live.owedDay, 'owedDay が割れた');
  // exit 1 は「債務なし」。errors に積まない
  assert.deepStrictEqual(snap.errors.filter(e => e.engine === 'daily-guard'), [],
    'exit code を成否と誤読して errors に積んでいる');
  // due:false のとき画面は error にしない
  assert.ok(/d\.due === false[\s\S]{0,300}setState\('daily', 'ready'\)/.test(js),
    'due:false を error として描いている — 良い知らせを赤くしてはならない');
});

test('AC-16d: lease 欄は status に現れる場合のみ出す(未確認の欄を捏造しない)', () => {
  const snap = pulse.snapshot();
  const hasLease = snap.daily && 'lease' in snap.daily;
  const inHtml = (html.match(/data-field="lease"/g) || []).length;
  if (!hasLease) assert.strictEqual(inHtml, 0, '断面に lease が無いのに画面が欄を持っている');
});

test('error から ready へ直接戻らない(一度 loading を経る)', () => {
  // 「いま取り直している」ことを見せずに値が変わると、神は古い値をまだ見ていると思い込む
  assert.ok(/setState\([^,]+, 'loading'/.test(js), 'loading を経る経路が無い');
});

const r = H.report();
if (require.main === module) process.exit(r.fail === 0 ? 0 : 1);
module.exports = r;
