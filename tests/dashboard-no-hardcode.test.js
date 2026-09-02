#!/usr/bin/env node
'use strict';
/**
 * dashboard-no-hardcode.test.js — G-06: **ハードコード数値が再発しない**
 * 担う AC: AC-02a〜c, AC-21a〜e
 *
 * 現行画面は engines=2 / self-tests=10 を主張し、実測は 33 / 210 だった —— **16.5〜21 倍の虚偽**。
 * 「Live Graph Execution」と称して描かれた 4 タスク DAG は 6 つの道のどれとも一致しない架空物だった。
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { ROOT, makeHarness } = require('./_pulse-fixture.js');

const H = makeHarness('dashboard-no-hardcode');
const { test } = H;
const DASH = path.join(ROOT, 'dashboard');
const js = fs.readFileSync(path.join(DASH, 'paradise.js'), 'utf8');
const html = fs.readFileSync(path.join(DASH, 'index.html'), 'utf8');
const pulse = require(path.join(ROOT, 'graph', 'pulse.js'));
const forge = require(path.join(ROOT, 'graph', 'forge.js'));
const snap = pulse.snapshot();

console.log('G-06 ハードコードの根絶 (FR-02 / FR-21):');

/** 走るコードだけを見る。註釈が病を語ることは病ではない(第28条の同型) */
function codeOnly(src) {
  return src.split('\n').filter(l => {
    const t = l.trim();
    return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--'));
  }).join('\n');
}

test('AC-02a/02b: 固定メトリクス配列 v:<数> が 0 件', () => {
  assert.strictEqual((codeOnly(js).match(/\bv: *[0-9]+/g) || []).length, 0);
});

test('AC-02c: 架空の自己 DAG リテラルが 0 件', () => {
  assert.strictEqual(((js + html).match(/SELF_DAG/g) || []).length, 0);
});

test('AC-21c: 相の名を画面に焼き付けていない', () => {
  const hits = codeOnly(js).match(/'(discover|specify|design|prove|verify|reflect|verdict)'/g) || [];
  assert.deepStrictEqual(hits, [], '相の名が画面に焼き付いている — 道が変われば嘘になる');
});

test('AC-21c: 相数のリテラル(6/11/14/17)を画面が持たない', () => {
  const phases = new Set(Object.keys(forge.SCALES).map(k => forge.buildDag('x', k).tasks.length));
  const code = codeOnly(js);
  // 数値そのものは座標や色にも現れる。咎めるのは **相数として使われている形**
  for (const p of phases) {
    const re = new RegExp(`(phases|相|tasks)\\s*[:=]\\s*${p}\\b`);
    assert.ok(!re.test(code), `相数 ${p} が画面に焼き付いている`);
  }
});

test('AC-21e: 画面が描く DAG のタスク数は、断面の道の相数のいずれかと一致する', () => {
  // 画面は DAG を自分で組み立てない。描くのは断面の scale[].phases のみである。
  const known = new Set(Object.entries(snap.scale)
    .filter(([k, v]) => k !== 'classifierAvailable' && v && typeof v.phases === 'number')
    .map(([, v]) => v.phases));
  assert.ok(known.size > 0, '断面が道を 1 本も持たない');
  // 画面に固定のタスク配列が在れば、その長さは known に含まれねばならない。
  // 実装は配列を持たない(断面から描く)ので、ここは「持たないこと」を測る
  const arrays = codeOnly(js).match(/tasks\s*:\s*\[[^\]]*\]/g) || [];
  for (const a of arrays) {
    const n = (a.match(/\{/g) || []).length;
    assert.ok(known.has(n), `画面が ${n} タスクの DAG を描いている — 実在する道のどれとも一致しない`);
  }
  assert.strictEqual(arrays.length, 0, '画面が DAG リテラルを持っている');
});

test('AC-21d: forge の分類器が reform を返し、断面が classifierAvailable を名乗る', () => {
  assert.strictEqual(forge.chooseScale('ダッシュボードを生きた門にせよ'), 'reform');
  assert.strictEqual(snap.scale.classifierAvailable, true);
});

test('画面の数はすべて断面由来 — 数の看板に固定値が 1 つも無い', () => {
  // 数の看板の値は snap.counts[k] からのみ入る。HTML 側に数字が焼かれていないこと
  const panel = html.match(/data-panel="counts"[\s\S]*?<\/section>/);
  assert.ok(panel, '数の看板が無い');
  const nums = panel[0].replace(/<!--[\s\S]*?-->/g, '').match(/>\s*[0-9]+\s*</g) || [];
  assert.deepStrictEqual(nums, [], '数の看板に固定値が焼かれている');
});

test('AC-02d(F-6): 閾値と経路の出所は 1 つ — 深掘り画面が規則を写経していない (第50条)', () => {
  // ■ F-6 が「最も危険」と記された理由 —— 写経は **片方だけ古くなる**。
  //   control.html は DEFAULT_PORT / POLL_MS / base() を自前で持ち、しかも
  //   この画面は門の射程外だったので、**古くなっても鳴らなかった**。
  //   直したのはコードだけでなく、鳴らない状態そのものである。
  const ctl = fs.readFileSync(path.join(DASH, 'control.html'), 'utf8');

  // 1. 規則を自分で定義していないこと(写経の形そのもの)
  const dup = [];
  if (/\bDEFAULT_PORT\s*=\s*[0-9]/.test(ctl)) dup.push('DEFAULT_PORT');
  if (/\bPOLL_MS\s*=\s*[0-9]/.test(ctl)) dup.push('POLL_MS');
  if (/function\s+base\s*\(\s*\)/.test(ctl)) dup.push('base()');
  assert.deepStrictEqual(dup, [],
    `control.html が規則を写経している: ${dup.join(', ')} — 片方を直しても他方は古いまま残る`);

  // 2. 共有の出所を実際に読んでいること
  assert.ok(/<script src="paradise\.js">/.test(ctl), 'control.html が paradise.js を読んでいない');
  assert.ok(/window\.PARADISE/.test(ctl), '共有の窓を参照していない');

  // 3. 出所側が窓を開けていること(片側だけ直しても通らないよう両辺を測る)
  assert.ok(/window\.PARADISE\s*=/.test(js), 'paradise.js が窓を開けていない');

  // 4. **出所が無いとき黙って既定値に落ちない** —— 落ちれば写経が復活する
  assert.ok(/paradise\.js を読めていません/.test(ctl),
    '共有の出所が無いとき名指しで止める分岐が無い(推測で描いてはならない)');

  // 5. start() が画面を選ぶこと —— 同じ script を読むだけの画面で走らせない
  assert.ok(/data-transport/.test(js) && /isGate/.test(js),
    'paradise.js の自動起動が画面を名指しで選んでいない — 深掘り画面で副作用が出る');
});

const r = H.report();
if (require.main === module) process.exit(r.fail === 0 ? 0 : 1);
module.exports = r;
