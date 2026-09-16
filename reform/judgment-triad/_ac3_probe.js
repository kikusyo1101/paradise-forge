#!/usr/bin/env node
/**
 * AC-3 の設計判断のための実測(R1 を当てた写しの上で / 本物の graph/ は触らない)。
 *
 *   (a) `--reject` の枝は R1 の関門に触れずに通るか
 *   (b) `rework` 状態の相を抱えた領域に ratify を撃つとどうなるか
 *   (c) `blocked` 状態の相を抱えた領域に ratify を撃つとどうなるか
 *   (d) 既存門 'cross-domain rework…' の ✗ の真因(fixture が ux を done にしていない)
 *
 * 前提: `node reform/judgment-triad/_solo_probe.js r1` が
 *       $LOCALAPPDATA/Temp/solo_r1/paradise に R1 入りの写しを作ってあること。
 */
'use strict';
const path = require('path');
const COPY = path.join(process.env.LOCALAPPDATA || process.env.TMP, 'Temp', 'solo_r1', 'paradise').replace(/\\/g, '/');
const forge = require(COPY + '/graph/forge.js');
const conclave = require(COPY + '/graph/conclave.js');

function mk() {
  const os = require('os'), fs = require('fs');
  const dag = forge.buildDag('hierarchy test', 'standard');   // 既存門 makeConclave() と同じ作り
  const tmp = path.join(os.tmpdir(), 'ac3-' + Math.random().toString(36).slice(2) + '.json');
  fs.writeFileSync(tmp, JSON.stringify(dag));
  return conclave.convene(tmp);
}
function doneAll(run, ids, art) {
  const st = require(COPY + '/graph/spawn-trace.js');
  conclave.markRunning(run, ids);
  for (const id of ids) {
    st.record(run, id, { toolUseId: 'toolu_test_' + id, agent: 'test' });
    conclave.markDone(run, id, art || (COPY + '/tests/paradise.test.js'), { tier: 1 });
  }
}
function phasesOf(run, card) { return run.domains.find(d => d.cardinal === card).phases; }
function try_(label, fn) {
  try { const r = fn(); console.log('  ' + label + ' -> 通った  ' + JSON.stringify(r).slice(0, 140)); return { ok: true, r }; }
  catch (e) { console.log('  ' + label + ' -> 拒まれた  code=' + (e.code || '-') + '  "' + e.message.slice(0, 120) + '"'); return { ok: false, e }; }
}

console.log('=== (d) 既存門の ✗ の真因 — architecture の相の一覧 ===');
{
  const run = mk();
  console.log('  architecture の相: ' + phasesOf(run, 'architecture').map(p => p.id).join(', '));
  console.log('  ✗ になった門の fixture が done にする相: design, detail, identity  (ux を欠く)');
  console.log('  ✓ のままの兄弟の門の fixture: design, detail, identity, ux  (四つ揃う)');
  doneAll(run, ['discover']); conclave.ratify(run, 'discovery');
  doneAll(run, ['specify']); conclave.ratify(run, 'requirements');
  doneAll(run, ['design', 'detail', 'identity']);
  try_('ratify(architecture) — ux を残したまま', () => conclave.ratify(run, 'architecture'));
  doneAll(run, ['ux']);
  try_('ratify(architecture) — ux も done にした後', () => conclave.ratify(run, 'architecture'));
}

console.log('\n=== (a) --reject の枝は関門に触れるか ===');
{
  const run = mk();
  doneAll(run, ['discover']); conclave.ratify(run, 'discovery');
  // requirements の相を**一つも done にせず** reject を撃つ
  console.log('  requirements の相: ' + phasesOf(run, 'requirements').map(p => p.id + '=' + p.status).join(', '));
  try_('ratify(requirements, {reject, from:specify}) — 相は全て pending', () =>
    conclave.ratify(run, 'requirements', { reject: true, from: 'specify' }));
  console.log('    → reject 後: ' + phasesOf(run, 'requirements').map(p => p.id + '=' + p.status).join(', '));
}

console.log('\n=== (b) rework 状態の相を抱えた領域を ratify できるか ===');
{
  const run = mk();
  doneAll(run, ['discover']); conclave.ratify(run, 'discovery');
  doneAll(run, ['specify']);
  conclave.ratify(run, 'requirements', { reject: true, from: 'specify' });
  console.log('  requirements の相: ' + phasesOf(run, 'requirements').map(p => p.id + '=' + p.status).join(', '));
  try_('ratify(requirements) — specify=rework', () => conclave.ratify(run, 'requirements'));
  console.log('    現状(R1 無し)の振る舞い: 無条件に ratified — rework の仕事を握りつぶす');
}

console.log('\n=== (c) blocked 状態の相を抱えた領域を ratify できるか ===');
{
  const run = mk();
  doneAll(run, ['discover']); conclave.ratify(run, 'discovery');
  const p = phasesOf(run, 'requirements').find(x => x.id === 'specify');
  conclave.markRunning(run, ['specify']);
  p.status = 'blocked';
  console.log('  requirements の相: ' + phasesOf(run, 'requirements').map(x => x.id + '=' + x.status).join(', '));
  try_('ratify(requirements) — specify=blocked', () => conclave.ratify(run, 'requirements'));
}

console.log('\n=== (c2) 領域そのものが blocked のとき ===');
{
  const run = mk();
  const d = run.domains.find(x => x.cardinal === 'requirements');
  doneAll(run, ['discover']); conclave.ratify(run, 'discovery');
  doneAll(run, ['specify']);
  d.status = 'blocked';
  console.log('  領域 status=' + d.status + '  相: ' + d.phases.map(x => x.id + '=' + x.status).join(', '));
  try_('ratify(requirements) — 領域が blocked だが相は全て done', () => conclave.ratify(run, 'requirements'));
  console.log('    → ratify 後の領域 status=' + d.status + '  (R1 は領域の blocked を見ていない)');
}
