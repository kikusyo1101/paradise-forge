#!/usr/bin/env node
/**
 * PARADISE :: Self-test
 * Proves the graph engine and knowledge graph actually work.
 * Pure Node, no test framework. Exit 0 = paradise is healthy.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = __dirname;
const ENGINE = path.join(DIR, '..', 'graph', 'graph-engine.js');
const KG = path.join(DIR, '..', 'graph', 'kg.js');
const engine = require(path.join(DIR, '..', 'graph', 'graph-engine.js'));

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); pass++; }
  catch (e) { console.log('  \u2717 ' + name + '\n      ' + e.message); fail++; }
}

// --- Graph engine ---
console.log('Graph engine:');
const tmp = path.join(os.tmpdir(), 'paradise-test-dag.json');

test('schedules a simple diamond into 3 waves', () => {
  fs.writeFileSync(tmp, JSON.stringify({ tasks: [
    { id: 'a', goal: 'root' },
    { id: 'b', goal: 'left', deps: ['a'] },
    { id: 'c', goal: 'right', deps: ['a'] },
    { id: 'd', goal: 'join', deps: ['b', 'c'] },
  ] }));
  const dag = engine.loadDag(tmp);
  const waves = engine.schedule(dag);
  assert.strictEqual(waves.length, 3, 'expected 3 waves');
  assert.deepStrictEqual(waves[0], ['a']);
  assert.deepStrictEqual(waves[1], ['b', 'c']);
  assert.deepStrictEqual(waves[2], ['d']);
});

test('runs independent tasks in the same wave', () => {
  fs.writeFileSync(tmp, JSON.stringify({ tasks: [
    { id: 'x', goal: 'a' }, { id: 'y', goal: 'b' }, { id: 'z', goal: 'c' },
  ] }));
  const waves = engine.schedule(engine.loadDag(tmp));
  assert.strictEqual(waves.length, 1);
  assert.strictEqual(waves[0].length, 3);
});

test('detects a cycle', () => {
  fs.writeFileSync(tmp, JSON.stringify({ tasks: [
    { id: 'a', goal: 'a', deps: ['c'] },
    { id: 'b', goal: 'b', deps: ['a'] },
    { id: 'c', goal: 'c', deps: ['b'] },
  ] }));
  const v = engine.validate(engine.loadDag(tmp));
  assert.strictEqual(v.ok, false);
  assert.ok(v.errors.some(e => /cycle/i.test(e)), 'should report a cycle');
});

test('detects a missing dependency', () => {
  fs.writeFileSync(tmp, JSON.stringify({ tasks: [
    { id: 'a', goal: 'a', deps: ['ghost'] },
  ] }));
  const v = engine.validate(engine.loadDag(tmp));
  assert.strictEqual(v.ok, false);
  assert.ok(v.errors.some(e => /missing/i.test(e)));
});

test('verify CLI exits non-zero on invalid DAG', () => {
  fs.writeFileSync(tmp, JSON.stringify({ tasks: [{ id: 'a', goal: 'a', deps: ['a'] }] }));
  let code = 0;
  try { execFileSync('node', [ENGINE, 'verify', tmp], { stdio: 'pipe' }); }
  catch (e) { code = e.status; }
  assert.strictEqual(code, 1, 'expected exit 1');
});

// --- Knowledge graph (isolated store) ---
console.log('Knowledge graph:');
const kgRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-kg-'));
const env = Object.assign({}, process.env, { PARADISE_KG: kgRoot });
const runKg = (...args) => execFileSync('node', [KG, ...args], { encoding: 'utf8', env });

test('remembers and queries a node', () => {
  runKg('remember', 'fact', 'sky', 'The sky is blue', 'observed at noon');
  const out = runKg('query', 'blue');
  assert.ok(out.includes('sky'), 'query should find the node');
});

test('upserts (last-write-wins) instead of duplicating', () => {
  runKg('remember', 'fact', 'sky', 'The sky is grey', 'cloudy now');
  const out = runKg('query', 'sky');
  assert.ok(out.includes('grey') && !out.includes('blue'), 'should reflect latest value only');
});

test('links nodes and shows neighbors', () => {
  runKg('remember', 'fact', 'rain', 'It rains from grey skies');
  runKg('link', 'sky', 'causes', 'rain');
  const out = runKg('node', 'sky');
  assert.ok(out.includes('causes') && out.includes('rain'));
});

test('snapshot surfaces hubs and survives reload', () => {
  const out = runKg('snapshot');
  assert.ok(out.includes('KNOWLEDGE SNAPSHOT'));
  assert.ok(out.includes('sky'), 'snapshot should include known nodes');
});

test('link is idempotent (no duplicate edges)', () => {
  runKg('link', 'sky', 'causes', 'rain');
  const stats = JSON.parse(runKg('stats'));
  assert.strictEqual(stats.edges, 1, 'duplicate link must not add an edge');
});

// --- report ---
console.log(`\nParadise self-test: ${pass} passed, ${fail} failed`);
try { fs.rmSync(kgRoot, { recursive: true, force: true }); } catch {}
process.exit(fail === 0 ? 0 : 1);
