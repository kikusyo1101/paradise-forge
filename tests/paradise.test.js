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

// --- Co-change learning: (isolated store) ---
console.log('Co-change learning:');
const ccRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-cc-'));
const ccEnv = Object.assign({}, process.env, { PARADISE_KG: ccRoot });
const runCc = (...args) => execFileSync('node', [KG, ...args], { encoding: 'utf8', env: ccEnv });

test('observing A,B then A,B,C increments pair counts correctly', () => {
  runCc('observe', 'A', 'B');
  runCc('observe', 'A', 'B', 'C');
  // reload counts directly against the isolated store
  const out = execFileSync('node', ['-e',
    `const kg=require(${JSON.stringify(KG)});const c=kg.cochangeCounts();` +
    `const o={};for(const [k,v] of c)o[k.split('\\u0000').join('|')]=v;console.log(JSON.stringify(o));`],
    { encoding: 'utf8', env: ccEnv });
  const counts = JSON.parse(out);
  assert.strictEqual(counts['A|B'], 2, 'A~B seen in both events');
  assert.strictEqual(counts['A|C'], 1, 'A~C seen once');
  assert.strictEqual(counts['B|C'], 1, 'B~C seen once');
});

test('predict A returns B ranked appropriately', () => {
  const out = runCc('predict', 'A');
  const lines = out.trim().split('\n');
  assert.ok(/^B\s+\(2 co-changes\)/.test(lines[0]), 'B should rank first with 2 co-changes');
  assert.ok(out.includes('C'), 'C should also appear');
});

test('predict on an unknown id returns no matches gracefully', () => {
  const out = runCc('predict', 'nonexistent');
  assert.ok(out.includes('(no matches)'), 'unknown id yields no matches');
});

test('observe is order-independent (observe A B == observe B A)', () => {
  const r1 = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-cc1-'));
  const r2 = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-cc2-'));
  const e1 = Object.assign({}, process.env, { PARADISE_KG: r1 });
  const e2 = Object.assign({}, process.env, { PARADISE_KG: r2 });
  execFileSync('node', [KG, 'observe', 'A', 'B'], { encoding: 'utf8', env: e1 });
  execFileSync('node', [KG, 'observe', 'B', 'A'], { encoding: 'utf8', env: e2 });
  const p1 = execFileSync('node', [KG, 'predict', 'A'], { encoding: 'utf8', env: e1 });
  const p2 = execFileSync('node', [KG, 'predict', 'A'], { encoding: 'utf8', env: e2 });
  assert.strictEqual(p1.trim(), p2.trim(), 'pair order must not matter');
  try { fs.rmSync(r1, { recursive: true, force: true }); fs.rmSync(r2, { recursive: true, force: true }); } catch {}
});

// --- Forge: the creation pipeline ---
console.log('Forge (creation pipeline):');
const forge = require(path.join(DIR, '..', 'graph', 'forge.js'));
const engineF = require(path.join(DIR, '..', 'graph', 'graph-engine.js'));

test('chooses scale from the wish (quick / standard / full)', () => {
  assert.strictEqual(forge.chooseScale('fix login bug'), 'quick');
  assert.strictEqual(forge.chooseScale('add a dark mode toggle'), 'standard');
  assert.strictEqual(forge.chooseScale('build a habit tracker app'), 'full');
});

test('forges a gated SDLC DAG that graph-engine can schedule', () => {
  const dag = forge.buildDag('add a dark mode toggle', 'standard');
  assert.ok(dag.meta.constitution.length >= 5, 'constitution embedded');
  assert.ok(dag.meta.gates.includes('verdict'), 'verdict is a gate');
  // must be a valid schedulable graph
  const tmpF = path.join(os.tmpdir(), 'paradise-forge-dag.json');
  fs.writeFileSync(tmpF, JSON.stringify(dag));
  const loaded = engineF.loadDag(tmpF);
  const v = engineF.validate(loaded);
  assert.strictEqual(v.ok, true, 'forged DAG must be valid: ' + v.errors.join('; '));
  const waves = engineF.schedule(loaded);
  assert.ok(waves.length >= 5, 'standard SDLC spans multiple waves');
  assert.deepStrictEqual(waves[0], ['discover'], 'discovery runs first — research precedes spec');
  assert.deepStrictEqual(waves[1], ['specify'], 'specify follows discovery');
  assert.strictEqual(waves[waves.length - 1][0], 'verdict', 'verdict runs last');
});

test('every scale begins with discovery (research precedes specification)', () => {
  for (const scale of ['quick', 'standard', 'full']) {
    const dag = forge.buildDag('x', scale);
    assert.strictEqual(dag.tasks[0].id, 'discover', `${scale} must start with discover`);
    assert.strictEqual(dag.tasks[0].agent, 'market-researcher', `${scale} discover uses market-researcher`);
  }
});

test('every phase has an agent and gates are marked', () => {
  const dag = forge.buildDag('x', 'full');
  for (const t of dag.tasks) assert.ok(t.agent, `phase ${t.id} needs an agent`);
  const gated = dag.tasks.filter(t => t.gate).map(t => t.id);
  assert.deepStrictEqual(gated, dag.meta.gates, 'meta.gates matches gate flags');
});

// --- Verdict: the gate of judgment ---
console.log('Verdict (judgment):');
const verdict = require(path.join(DIR, '..', 'graph', 'verdict.js'));

test('SHIP when every gate passes and no breach', () => {
  const v = verdict.judge({ build: 'pass', types: { status: 'pass' }, lint: { status: 'pass' },
    tests: { passed: 14, failed: 0, total: 14, coverage: 92 },
    security: { issues: 0, secrets: 0 }, spec: { satisfied: true } });
  assert.strictEqual(v.verdict, 'SHIP');
});

test('REWORK on fixable defects (failing tests / low coverage)', () => {
  const v = verdict.judge({ build: 'pass', tests: { passed: 8, failed: 3, total: 11, coverage: 61 },
    security: { issues: 0, secrets: 0 }, spec: { satisfied: true } });
  assert.strictEqual(v.verdict, 'REWORK');
  assert.ok(v.defects.some(d => /test/.test(d)) && v.defects.some(d => /coverage/.test(d)));
});

test('BLOCK on constitutional breach (secret or spec unmet)', () => {
  const v = verdict.judge({ build: 'pass', tests: { passed: 14, failed: 0, total: 14, coverage: 95 },
    security: { issues: 1, secrets: 1 }, spec: { satisfied: false, unmet: ['logout missing'] } });
  assert.strictEqual(v.verdict, 'BLOCK');
  assert.ok(v.breaches.length >= 2, 'both secret and spec breaches reported');
});

test('security breach BLOCKS even when all tests pass', () => {
  const v = verdict.judge({ build: 'pass', tests: { passed: 20, failed: 0, total: 20, coverage: 100 },
    security: { issues: 1, secrets: 0 } });
  assert.strictEqual(v.verdict, 'BLOCK', 'passing tests never override a security breach');
});

test('coverage floor is configurable', () => {
  const report = { build: 'pass', tests: { passed: 10, failed: 0, total: 10, coverage: 75 },
    security: { issues: 0, secrets: 0 }, spec: { satisfied: true } };
  assert.strictEqual(verdict.judge(report, { floor: 80 }).verdict, 'REWORK', '75 < 80 => REWORK');
  assert.strictEqual(verdict.judge(report, { floor: 70 }).verdict, 'SHIP', '75 >= 70 => SHIP');
});

// --- Critic: adversarial self-critique ---
console.log('Critic (self-critique):');
const critic = require(path.join(DIR, '..', 'graph', 'critic.js'));

function makeCreation(spec, code, opts = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-critic-'));
  if (spec) fs.writeFileSync(path.join(d, 'requirements.md'), spec);
  if (opts.findings) fs.writeFileSync(path.join(d, 'findings.md'), opts.findings);
  if (code) fs.writeFileSync(path.join(d, 'app.js'), code);
  if (opts.test) fs.writeFileSync(path.join(d, 'app.test.js'), opts.test);
  return d;
}

test('critic flags a flawed creation (no AC, no tests) as gaps', () => {
  const d = makeCreation('# Timer\nA 25/5 timer.', 'let r=1500; function t(){r--;}\nmodule.exports=t;');
  const rev = critic.review(d);
  assert.strictEqual(rev.clean, false, 'flawed creation must not be clean');
  assert.ok(rev.gaps.some(g => /acceptance/.test(g.id)), 'missing AC is a gap');
  assert.ok(rev.gaps.some(g => /tests-exist/.test(g.id)), 'missing tests is a gap');
  fs.rmSync(d, { recursive: true, force: true });
});

test('critic recognises a test suite by SUBSTANCE, not by filename convention', () => {
  // A real suite named `test.js` / `ac-test.js` matches none of the classic
  // `*.test.js` / `*.spec.js` patterns. Judging it "missing" is a FALSE REWORK.
  const spec = '# Habit\n## Acceptance Criteria\n- AC-1 streaks are counted.';
  const code = 'function make(config){var c=config||{};return {ws:c.weekStart};}\nmodule.exports=make;';
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-critic-name-'));
  fs.writeFileSync(path.join(d, 'requirements.md'), spec);
  fs.writeFileSync(path.join(d, 'findings.md'), '# findings\nprior art surveyed.');
  fs.writeFileSync(path.join(d, 'app.js'), code);
  // no `.test.` / `.spec.` in either name — the exact shape that produced the bug
  fs.writeFileSync(path.join(d, 'test.js'), 'const assert=require("assert");\n' + 'assert.ok(1);\n'.repeat(40));
  fs.writeFileSync(path.join(d, 'ac-test.js'), 'const assert=require("assert");\n' + 'assert.strictEqual(1,1);\n'.repeat(40));
  const rev = critic.review(d);
  assert.ok(!rev.gaps.some(g => /tests-exist/.test(g.id)), 'a real suite named test.js is NOT a missing-tests gap');
  assert.ok(!rev.smells.some(s => /runnable-evidence/.test(s.id)), 'a real suite counts as runnable evidence');
  fs.rmSync(d, { recursive: true, force: true });
});

test('critic still flags a creation whose only .js asserts nothing', () => {
  // the substance check must not become a rubber stamp: a plain source file
  // with no assertions is still no evidence at all.
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-critic-noassert-'));
  fs.writeFileSync(path.join(d, 'requirements.md'), '# X\n## Acceptance Criteria\n- AC-1 works.');
  fs.writeFileSync(path.join(d, 'helper.js'), 'module.exports = function(){ return 42; };\n' + '// filler\n'.repeat(80));
  const rev = critic.review(d);
  assert.ok(rev.gaps.some(g => /tests-exist/.test(g.id)), 'a non-asserting file is not a test suite');
  fs.rmSync(d, { recursive: true, force: true });
});

test('critic passes a complete creation (AC + tests + config + findings)', () => {
  const spec = '# Timer\n## Acceptance Criteria\n- AC-1 durations are configurable.';
  const code = 'function createTimer(config){var cfg=config||{};return {work:cfg.workDuration};}\nmodule.exports=createTimer;';
  const bigTest = 'const t=require("./app.js");' + 'a'.repeat(500) + '\n// asserts...';
  const findings = '| 🔴 must | **Custom durations** | universal |';
  const d = makeCreation(spec, code, { test: bigTest, findings });
  const rev = critic.review(d);
  assert.ok(rev.gaps.length === 0, 'complete creation should have no gaps: ' + JSON.stringify(rev.gaps.map(g=>g.id)));
  fs.rmSync(d, { recursive: true, force: true });
});

test('critic detects a hardcoded creation (no real config surface)', () => {
  const spec = '# Timer\n## Acceptance Criteria\n- AC-1 works.';
  const hardcoded = 'let remaining=1500; function tick(){remaining--;}\nmodule.exports={tick};';
  const d = makeCreation(spec, hardcoded, { test: 'x'.repeat(500) });
  const rev = critic.review(d);
  assert.ok(rev.smells.some(s => /hardcoded/.test(s.id)), 'hardcoded values are a smell');
  fs.rmSync(d, { recursive: true, force: true });
});

test('critic extracts must-haves from findings markdown', () => {
  const findings = '| 🔴 must | **Custom durations** | x |\n| 🔴 must | **Skip button** | y |\n| 🟡 nice | **Themes** | z |';
  const musts = critic.extractMustHaves(findings);
  assert.ok(musts.includes('Custom durations') && musts.includes('Skip button'), 'parses red must-haves');
});

test('lessons become checks: a past-miss recurrence is caught', () => {
  const d = makeCreation('# App\n## Acceptance Criteria\n- AC-1', 'function createTimer(config){return config;}\nmodule.exports=createTimer;', { test: 'y'.repeat(500) });
  const lessonsFile = path.join(d, 'lessons.json');
  fs.writeFileSync(lessonsFile, JSON.stringify([{ id: 'l1', label: 'must have notifications', check: 'notification' }]));
  const rev = critic.review(d, { lessons: lessonsFile });
  assert.ok(rev.gaps.some(g => g.id === 'lesson:l1'), 'unaddressed lesson recurs as a gap');
  // now satisfy the lesson
  fs.writeFileSync(path.join(d, 'app.js'), 'function createTimer(config){ /* notification support */ return config;}\nmodule.exports=createTimer;');
  const rev2 = critic.review(d, { lessons: lessonsFile });
  assert.ok(!rev2.gaps.some(g => g.id === 'lesson:l1'), 'satisfied lesson no longer a gap');
  fs.rmSync(d, { recursive: true, force: true });
});

// --- Forge reflect phase ---
test('forge inserts a reflect (self-critique) gate before verdict', () => {
  for (const scale of ['quick', 'standard', 'full']) {
    const dag = forge.buildDag('x', scale);
    const ids = dag.tasks.map(t => t.id);
    assert.ok(ids.includes('reflect'), `${scale} must include reflect`);
    const verdict = dag.tasks.find(t => t.id === 'verdict');
    assert.ok(verdict.deps.includes('reflect'), `${scale}: verdict depends on reflect`);
    assert.ok(dag.meta.gates.includes('reflect'), `${scale}: reflect is a gate`);
  }
});

// --- Orchestrator: the supervisor state machine ---
console.log('Orchestrator (supervisor):');
const orch = require(path.join(DIR, '..', 'graph', 'orchestrator.js'));
const forgeO = require(path.join(DIR, '..', 'graph', 'forge.js'));

function makeRun(scale) {
  const dag = forgeO.buildDag('test wish', scale || 'standard');
  const tmp = path.join(os.tmpdir(), 'paradise-orch-dag-' + Math.random().toString(36).slice(2) + '.json');
  fs.writeFileSync(tmp, JSON.stringify(dag));
  return orch.init(tmp);
}

test('orchestrator computes the first wave as discover only', () => {
  const run = makeRun('standard');
  const nw = orch.nextWave(run);
  assert.deepStrictEqual(nw.wave.map(w => w.id), ['discover'], 'discover runs first');
  assert.strictEqual(nw.wave[0].context_from.length, 0, 'discover has no upstream');
});

test('orchestrator hands off an upstream artifact to the next phase', () => {
  const run = makeRun('standard');
  orch.markRunning(run, ['discover']);
  orch.markDone(run, 'discover', 'findings.md');
  const nw = orch.nextWave(run);
  const specify = nw.wave.find(w => w.id === 'specify');
  assert.ok(specify, 'specify becomes ready');
  assert.strictEqual(specify.context_from[0].from, 'discover');
  assert.strictEqual(specify.context_from[0].artifact, 'findings.md', 'artifact handed off');
});

test('orchestrator runs independent phases in the same wave (parallel)', () => {
  const run = makeRun('standard');
  // build は design(構造)・ux(振る舞い)・identity(見た目)が揃って初めて始まる
  for (const id of ['discover', 'specify', 'design', 'ux', 'identity', 'detail']) { orch.markRunning(run, [id]); orch.markDone(run, id, id + '.md'); }
  const nw = orch.nextWave(run);
  const ids = nw.wave.map(w => w.id).sort();
  assert.deepStrictEqual(ids, ['build', 'tests'], 'build & tests run in parallel after detail');
  assert.strictEqual(nw.parallel, 2);
});

test('REWORK resets the target and its downstream closure', () => {
  const run = makeRun('standard');
  for (const t of run.tasks) { run.phases[t.id].status = 'done'; run.phases[t.id].attempts = 1; run.phases[t.id].artifact = t.id + '.x'; }
  const res = orch.applyVerdict(run, 'REWORK', 'build');
  assert.strictEqual(res.verdict, 'REWORK');
  assert.ok(res.reworked.includes('build') && res.reworked.includes('verdict'), 'build + downstream reset');
  assert.ok(!res.reworked.includes('discover'), 'upstream of build is NOT reset');
  assert.strictEqual(run.phases.verdict.status, 'rework');
  assert.ok(!run.phases.verdict.artifact, 'downstream artifacts cleared');
});

test('loop-guard escalates REWORK to BLOCK after MAX_ATTEMPTS', () => {
  const run = makeRun('quick');
  run.phases.build.attempts = orch.MAX_ATTEMPTS; // already at the ceiling
  const res = orch.applyVerdict(run, 'REWORK', 'build');
  assert.strictEqual(res.verdict, 'BLOCK', 'loop-guard trips to BLOCK');
  assert.strictEqual(run.status, 'blocked');
});

test('SHIP finalizes the run', () => {
  const run = makeRun('quick');
  const res = orch.applyVerdict(run, 'SHIP');
  assert.strictEqual(res.ok, true);
  assert.strictEqual(run.status, 'shipped');
});

test('autoStep guides the loop: wave -> verdict -> done', () => {
  const run = makeRun('quick');
  // fresh: first step is a wave containing discover
  let step = orch.autoStep(run);
  assert.strictEqual(step.phase, 'wave');
  assert.ok(step.dispatch.some(d => d.id === 'discover'));
  // drive every phase to done
  for (const t of run.tasks) { run.phases[t.id].status = 'done'; }
  step = orch.autoStep(run);
  assert.strictEqual(step.phase, 'verdict', 'all done -> verdict');
  // ship it
  orch.applyVerdict(run, 'SHIP');
  step = orch.autoStep(run);
  assert.strictEqual(step.phase, 'done', 'shipped -> done');
});

test('autoStep reports blocked when the loop-guard has tripped', () => {
  const run = makeRun('quick');
  run.phases.build.attempts = orch.MAX_ATTEMPTS;
  orch.applyVerdict(run, 'REWORK', 'build'); // trips loop-guard -> blocked
  const step = orch.autoStep(run);
  assert.strictEqual(step.phase, 'blocked');
});

// --- Subagent contract: result reconciliation ---
console.log('Subagent contract:');
const contract = require(path.join(DIR, '..', 'graph', 'contract.js'));

test('contract rejects a done result with no artifact', () => {
  const v = contract.validate({ phase: 'build', status: 'done' });
  assert.strictEqual(v.ok, false);
  assert.ok(v.errors.some(e => /artifact/.test(e)));
});

test('contract accepts a well-formed result', () => {
  const v = contract.validate({ phase: 'build', status: 'done', artifact: '/x', summary: 'ok' });
  assert.strictEqual(v.ok, true);
});

test('reconcile fails a claimed artifact that does not exist (fail-closed)', () => {
  const rec = contract.reconcile({ phase: 'build', status: 'done', artifact: path.join(os.tmpdir(), 'no-such-' + Math.random()) });
  assert.strictEqual(rec.accepted, false, 'nonexistent artifact must not be accepted');
});

test('reconcile accepts a real, non-trivial artifact', () => {
  const f = path.join(os.tmpdir(), 'paradise-artifact-' + Math.random().toString(36).slice(2) + '.txt');
  fs.writeFileSync(f, 'real content that is not trivial');
  const rec = contract.reconcile({ phase: 'build', status: 'done', artifact: f }, { minBytes: 5 });
  assert.strictEqual(rec.accepted, true, 'real artifact accepted: ' + rec.reason);
  fs.rmSync(f, { force: true });
});

test('reconcile refuses an external handle unless explicitly allowed', () => {
  const claim = { phase: 'deploy', status: 'done', artifact: 'https://example.com/x' };
  assert.strictEqual(contract.reconcile(claim).accepted, false, 'external not verifiable by default');
  assert.strictEqual(contract.reconcile(claim, { allowExternal: true }).accepted, true, 'accepted when caller opts in');
});

test('checkPayload rejects malformed JSON cleanly (fail-closed, no crash)', () => {
  const rec = contract.checkPayload('{ this is not: valid json ');
  assert.strictEqual(rec.accepted, false, 'garbage from a subagent must be rejected, not crash');
  assert.ok(/malformed/.test(rec.reason), 'reason names the malformed payload: ' + rec.reason);
});

test('checkPayload rejects an empty payload (a silent subagent proves nothing)', () => {
  assert.strictEqual(contract.checkPayload('').accepted, false, 'empty string rejected');
  assert.strictEqual(contract.checkPayload('   ').accepted, false, 'whitespace-only rejected');
  assert.strictEqual(contract.checkPayload(null).accepted, false, 'null rejected');
});

test('checkPayload reconciles a well-formed payload just like reconcile', () => {
  const f = path.join(os.tmpdir(), 'paradise-payload-' + Math.random().toString(36).slice(2) + '.txt');
  fs.writeFileSync(f, 'real evidence on disk');
  const rec = contract.checkPayload(JSON.stringify({ phase: 'build', status: 'done', artifact: f }));
  assert.strictEqual(rec.accepted, true, 'valid payload with a real artifact accepted: ' + rec.reason);
  fs.rmSync(f, { force: true });
});

// --- Clergy & Conclave: the ecclesiastical hierarchy ---
console.log('Clergy (hierarchy):');
const clergy = require(path.join(DIR, '..', 'graph', 'clergy.js'));
const conclave = require(path.join(DIR, '..', 'graph', 'conclave.js'));

test('clergy maps every forge phase to a cardinal or the tribunal', () => {
  for (const id of ['discover', 'specify', 'design', 'detail', 'build', 'tests', 'review', 'security', 'verify', 'reflect', 'verdict']) {
    assert.ok(clergy.cardinalFor(id), `${id} must belong to a cardinal/tribunal`);
  }
  assert.strictEqual(clergy.cardinalFor('discover'), 'discovery');
  assert.strictEqual(clergy.cardinalFor('reflect'), 'tribunal');
  assert.strictEqual(clergy.cardinalFor('verdict'), 'tribunal');
});

test('clergy groups phases into ordered cardinal domains', () => {
  const groups = clergy.groupByCardinal(['discover', 'specify', 'design', 'detail', 'build', 'tests', 'reflect', 'verdict']);
  assert.strictEqual(groups[0].cardinal, 'discovery');
  assert.strictEqual(groups[groups.length - 1].cardinal, 'tribunal');
  // architecture domain should hold design+detail together
  const arch = groups.find(g => g.cardinal === 'architecture');
  assert.ok(arch.phases.includes('design') && arch.phases.includes('detail'));
});

function makeConclave() {
  const dag = forgeO.buildDag('hierarchy test', 'standard');
  const tmp = path.join(os.tmpdir(), 'paradise-conclave-' + Math.random().toString(36).slice(2) + '.json');
  fs.writeFileSync(tmp, JSON.stringify(dag));
  return conclave.convene(tmp);
}

console.log('Conclave (recursive orchestration):');

test('conclave convenes domains as cardinals with their phases', () => {
  const run = makeConclave();
  assert.ok(run.domains.length >= 5, 'at least 5 domains');
  assert.strictEqual(run.domains[0].cardinal, 'discovery');
  assert.ok(run.domains[0].phases.some(p => p.id === 'discover'));
  assert.ok(run.domains.every(d => d.pdca), 'every domain has an inner PDCA');
});

test('conclave next() dispatches the active domain\'s ready phases', () => {
  const run = makeConclave();
  const step = conclave.next(run);
  assert.strictEqual(step.level, 'domain');
  assert.strictEqual(step.cardinal, 'discovery');
  assert.strictEqual(step.phase, 'wave');
  assert.ok(step.dispatch.some(d => d.id === 'discover'));
});

test('conclave advances to ratify when a domain\'s phases are all done', () => {
  const run = makeConclave();
  conclave.markRunning(run, ['discover']);
  conclave.markDone(run, 'discover', 'findings.md');
  const step = conclave.next(run);
  assert.strictEqual(step.phase, 'ratify');
  assert.strictEqual(step.reviewClass, 'pontiff', 'discovery is ratified by the pontiff');
});

test('ratify advances the conclave to the next cardinal', () => {
  const run = makeConclave();
  conclave.markRunning(run, ['discover']);
  conclave.markDone(run, 'discover', 'findings.md');
  conclave.ratify(run, 'discovery');
  const step = conclave.next(run);
  assert.strictEqual(step.cardinal, 'requirements', 'next domain becomes active');
  // artifact handoff crosses the domain boundary
  const specify = step.dispatch.find(d => d.id === 'specify');
  assert.strictEqual(specify.context_from[0].artifact, 'findings.md');
});

test('domain-level reject triggers an INNER rework (the small circle)', () => {
  const run = makeConclave();
  conclave.markRunning(run, ['discover']); conclave.markDone(run, 'discover', 'f.md');
  conclave.ratify(run, 'discovery');
  conclave.markRunning(run, ['specify']); conclave.markDone(run, 'specify', 'r.md');
  const res = conclave.ratify(run, 'requirements', { reject: true, from: 'specify' });
  assert.ok(res.reworked.includes('specify'), 'specify reset for inner rework');
  const d = run.domains.find(x => x.cardinal === 'requirements');
  assert.strictEqual(d.status, 'active', 'domain re-activates for rework');
  assert.strictEqual(d.phases.find(p => p.id === 'specify').status, 'rework');
});

test('a review class can send work back ACROSS domains (the great circle)', () => {
  const run = makeConclave();
  // walk the ring: discovery → requirements → architecture → construction all ratified
  for (const [phases, card] of [[['discover'], 'discovery'], [['specify'], 'requirements'],
                                [['design', 'detail', 'identity', 'ux'], 'architecture'], [['build', 'tests'], 'construction']]) {
    conclave.markRunning(run, phases);
    for (const p of phases) conclave.markDone(run, p, p + '.md');
    conclave.ratify(run, card);
  }
  conclave.markRunning(run, ['review', 'security']);
  conclave.markDone(run, 'review', 'rv.md'); conclave.markDone(run, 'security', 'sec.md');
  // quality rejects and sends it back to BUILD, which lives in construction
  const res = conclave.ratify(run, 'quality', { reject: true, from: 'build' });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.target, 'construction', 'rework is charged to the domain that owns `build`');
  assert.ok(res.reworked.includes('build'), 'build itself is reset');
  const constr = run.domains.find(x => x.cardinal === 'construction');
  assert.strictEqual(constr.status, 'active', 'construction LOSES its ratification and reopens');
  assert.strictEqual(constr.phases.find(p => p.id === 'build').status, 'rework');
  assert.strictEqual(constr.reworks, 1, 'the loop-guard counts against construction, not quality');
  const qual = run.domains.find(x => x.cardinal === 'quality');
  assert.strictEqual(qual.status, 'active', 'the rejecting domain never ratifies itself on a reject');
  // and the conclave actually hands `build` back out again
  const step = conclave.next(run);
  assert.strictEqual(step.cardinal, 'construction', 'next() returns to the reopened upstream domain');
  assert.ok(step.dispatch.some(x => x.id === 'build'), 'build is re-dispatched');
});

test('cross-domain rework also resets DOWNSTREAM phases in later domains', () => {
  const run = makeConclave();
  for (const [phases, card] of [[['discover'], 'discovery'], [['specify'], 'requirements'],
                                [['design', 'detail', 'identity'], 'architecture'], [['build', 'tests'], 'construction']]) {
    conclave.markRunning(run, phases);
    for (const p of phases) conclave.markDone(run, p, p + '.md');
    conclave.ratify(run, card);
  }
  conclave.markRunning(run, ['review', 'security']);
  conclave.markDone(run, 'review', 'rv.md'); conclave.markDone(run, 'security', 'sec.md');
  const res = conclave.ratify(run, 'quality', { reject: true, from: 'build' });
  // everything that depended on build must be invalidated, including the finished reviews
  assert.ok(res.reworked.includes('review'), 'a review of stale code is itself stale');
  assert.strictEqual(run.domains.find(x => x.cardinal === 'quality')
    .phases.find(p => p.id === 'review').status, 'rework');
  assert.strictEqual(run.domains.find(x => x.cardinal === 'quality')
    .phases.find(p => p.id === 'review').artifactPath, null, 'stale artifact is dropped');
});

test('domain loop-guard blocks a cardinal after MAX_DOMAIN_REWORK', () => {
  const run = makeConclave();
  const d = run.domains.find(x => x.cardinal === 'requirements');
  d.reworks = conclave.MAX_DOMAIN_REWORK; // at the ceiling
  const res = conclave.ratify(run, 'requirements', { reject: true, from: 'specify' });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(d.status, 'blocked', 'domain blocks → pontiff escalation');
});

test('conclave completes when all domains are ratified', () => {
  const run = makeConclave();
  for (const d of run.domains) { for (const p of d.phases) p.status = 'done'; d.status = 'ratified'; }
  const step = conclave.next(run);
  assert.strictEqual(step.phase, 'complete');
});

test('clergy marshals believers under a priest (priest→believer layer)', () => {
  const plan = clergy.marshalPlan('discover');
  assert.strictEqual(plan.priest, 'market-researcher', 'discover priest is the market-researcher');
  assert.ok(plan.believers.length >= 1, 'the priest can marshal believers');
  assert.ok(plan.division.every(d => d.does), 'each believer has a defined role');
});

// --- Model policy by rank (Constitution Art. 12) ---
console.log('Model policy (rank → model):');

test('every rank that works declares a model and effort', () => {
  for (const r of ['pontiff', 'cardinal', 'priest', 'believer', 'executor']) {
    assert.ok(clergy.RANKS[r].model, `${r} must declare a model`);
    assert.ok(clergy.RANKS[r].effort, `${r} must declare an effort`);
  }
});

test('capability descends with rank: judgment ranks outrank workers', () => {
  assert.strictEqual(clergy.RANKS.cardinal.model, 'opus', 'cardinals decide → strongest');
  assert.strictEqual(clergy.RANKS.priest.model, 'sonnet', 'priests generate → balanced');
  assert.strictEqual(clergy.RANKS.believer.model, 'haiku', 'believers do mechanical volume → fastest');
  assert.strictEqual(clergy.RANKS.executor.model, 'opus', 'the judge is never cheapened');
  assert.strictEqual(clergy.RANKS.executor.effort, 'max');
});

test('the tribunal, security and planner are exempt from thrift', () => {
  for (const name of ['self-critic', 'creation-judge', 'security-reviewer', 'planner']) {
    const m = clergy.modelFor(name, 'priest'); // even asked as a priest…
    assert.strictEqual(m.model, 'opus', `${name} must run at full strength`);
    assert.strictEqual(m.source, 'exception');
  }
});

test('a believer resolves to the cheap fast model, a priest to the balanced one', () => {
  assert.strictEqual(clergy.modelFor('web-scout', 'believer').model, 'haiku');
  assert.strictEqual(clergy.modelFor('architect', 'priest').model, 'sonnet');
});

test('apply-models resolves each agent to its rank (policy is mechanised)', () => {
  const am = require(path.join(DIR, '..', 'graph', 'apply-models.js'));
  assert.strictEqual(am.rankOf('cardinal'), 'cardinal');
  assert.strictEqual(am.rankOf('executor'), 'executor');
  assert.strictEqual(am.rankOf('self-critic'), 'executor', 'tribunal officers hold the executor rank');
  assert.strictEqual(am.rankOf('web-scout'), 'believer');
  assert.strictEqual(am.rankOf('architect'), 'priest');
});

test('apply-models rewrites frontmatter without touching the body', () => {
  const am = require(path.join(DIR, '..', 'graph', 'apply-models.js'));
  const src = '---\nname: x\ndescription: d\n---\n\nBODY STAYS\n';
  const out = am.setFrontmatterKey(am.setFrontmatterKey(src, 'model', 'haiku'), 'effort', 'low');
  assert.ok(/model: haiku/.test(out) && /effort: low/.test(out), 'keys written');
  assert.ok(/BODY STAYS/.test(out), 'body untouched');
  assert.strictEqual(am.readFrontmatterKey(out, 'model'), 'haiku');
  // idempotent: applying twice does not duplicate the key
  const twice = am.setFrontmatterKey(out, 'model', 'haiku');
  assert.strictEqual((twice.match(/model:/g) || []).length, 1, 'no duplicate keys');
});

// --- Synod: the planning cycle between pontiff and cardinals ---
console.log('Synod (planning cycle):');
const synod = require(path.join(DIR, '..', 'graph', 'synod.js'));

test('synod drafts a convocation of cardinals for a wish', () => {
  const convo = synod.draftConvocation('a todo app', 'standard');
  const names = convo.cardinals.map(c => c.cardinal);
  assert.ok(names.includes('discovery') && names.includes('tribunal'), 'discovery + tribunal present');
  assert.ok(convo.cardinals.every(c => c.phases.length > 0), 'every cardinal owns phases');
});

test('synod plan-critique flags a plan missing the discovery cardinal', () => {
  const convo = synod.draftConvocation('x', 'standard');
  // simulate a broken plan: strip discovery
  convo.cardinals = convo.cardinals.filter(c => c.cardinal !== 'discovery');
  const crit = synod.critiquePlan(convo);
  assert.strictEqual(crit.ok, false);
  assert.ok(crit.gaps.some(g => /discovery/.test(g)), 'missing discovery is a plan gap');
});

test('synod ratifies a sound plan and records the refinement trail', () => {
  const res = synod.convene('a calculator app', 'full');
  assert.strictEqual(res.ratified, true, 'a full-scale plan for an app ratifies');
  assert.ok(Array.isArray(res.refinements) && res.refinements.length >= 1, 'the planning cycle is recorded');
});

test('kg upsert is last-write-wins by id', () => {
  const kg = require(path.join(DIR, '..', 'graph', 'kg.js'));
  kg.remember('t', 'lww', 'first', 'a');
  kg.remember('t', 'lww', 'second', 'b');
  const n = kg.getNode('lww');
  assert.strictEqual(n.label, 'second', 'second write wins');
});

test('kg forget removes a node and its edges (memory is correctable)', () => {
  const kg = require(path.join(DIR, '..', 'graph', 'kg.js'));
  kg.remember('t', 'temp-a', 'A', '');
  kg.remember('t', 'temp-b', 'B', '');
  kg.link('temp-a', 'rel', 'temp-b');
  const res = kg.forget('temp-a');
  assert.strictEqual(res.removedNodes, 1, 'node removed');
  assert.ok(res.removedEdges >= 1, 'touching edges removed');
  assert.strictEqual(kg.getNode('temp-a'), null, 'node is gone');
  const nb = kg.neighbors('temp-b');
  assert.ok(!nb.in.some(e => e.from === 'temp-a'), 'dangling edge cleaned');
});

// --- Lesson scoping (a scoped lesson must never false-fire elsewhere) ---
console.log('Lesson scoping (the fence around a past-miss):');

test('kg normalizes a lesson whose check|applies spec was crammed into the label', () => {
  const kg = require(path.join(DIR, '..', 'graph', 'kg.js'));
  // The CLI form `kg.js remember lesson <id> "<check>|applies:<scope>"` omits [body];
  // the spec lands in the label. It must still end up parseable, not global.
  kg.remember('lesson', 'scoped-lesson', 'contract must fail closed|applies:paradise-internal');
  const n = kg.getNode('scoped-lesson');
  assert.ok(n.body.includes('|applies:paradise-internal'), 'the spec is preserved in the body');
  assert.ok(!n.label.includes('|applies:'), 'the label is cleaned of the spec');
});

test('lessons export recovers the scope so the lesson is not global', () => {
  const lessons = require(path.join(DIR, '..', 'graph', 'lessons.js'));
  const out = path.join(kgRoot, 'lessons-test.json');
  const exported = lessons.exportLessons(out);
  const l = exported.find(x => x.id === 'scoped-lesson');
  assert.ok(l, 'the lesson exported');
  assert.strictEqual(l.applies, 'paradise-internal', 'scope is parsed, not null');
  assert.ok(!l.check.includes('|applies:'), 'check is the check alone');
});

test('scope matching is strict: "internally" does not satisfy "paradise-internal"', () => {
  const critic = require(path.join(DIR, '..', 'graph', 'critic.js'));
  assert.strictEqual(critic.scopeMatches('durations are held internally in seconds', 'paradise-internal'),
    false, 'an incidental word must not drag a scoped lesson into scope');
  assert.strictEqual(critic.scopeMatches('this is a paradise-internal engine change', 'paradise-internal'),
    true, 'the whole scope term does match');
});

test('an out-of-scope lesson does not report a regression', () => {
  const critic = require(path.join(DIR, '..', 'graph', 'critic.js'));
  const [chk] = critic.lessonChecks([{ id: 'x', label: 'L', check: 'forget', applies: 'paradise-internal' }]);
  const ctx = { requirements: 'a pomodoro timer held internally in seconds',
    findings: '', prd: '', codeBlob: '' };
  const r = chk.run(ctx);
  assert.strictEqual(r.ok, true, 'out of scope, so no false REWORK');
  assert.ok(/out of scope/.test(r.note), 'and it says why');
});

test('an in-scope lesson still catches a real regression', () => {
  const critic = require(path.join(DIR, '..', 'graph', 'critic.js'));
  const [chk] = critic.lessonChecks([{ id: 'x', label: 'L', check: 'forget', applies: 'paradise-internal' }]);
  const ctx = { requirements: 'a paradise-internal engine change', findings: '', prd: '', codeBlob: '' };
  assert.strictEqual(chk.run(ctx).ok, false, 'in scope and unaddressed = regression');
});

// --- Self-review scope subject (the paradise must not be blind to its own past) ---
console.log('Self-review scope subject (the engine judging itself):');

test('a self review declares its own scopes instead of an empty subject', () => {
  const critic = require(path.join(DIR, '..', 'graph', 'critic.js'));
  const subj = critic.selfScopeSubject(path.join(DIR, '..', 'graph'));
  assert.ok(critic.scopeMatches(subj, 'paradise-internal'), 'the engine IS paradise-internal');
  assert.ok(critic.scopeMatches(subj, 'orchestration'), 'the engine IS the orchestration layer');
  assert.ok(!critic.scopeMatches(subj, 'timer'), 'but it is not a timer creation');
});

test('a paradise-internal lesson actually FIRES on a self review (no silent skip)', () => {
  const critic = require(path.join(DIR, '..', 'graph', 'critic.js'));
  const [chk] = critic.lessonChecks([
    { id: 'x', label: 'L', check: 'zzznotpresentanywhere', applies: 'paradise-internal' }]);
  // scopeSubject present = self mode; the spec fields are empty, as on the real engine
  const r = chk.run({ requirements: '', findings: '', prd: '', codeBlob: '',
    scopeSubject: critic.selfScopeSubject(path.join(DIR, '..', 'graph')) });
  assert.strictEqual(r.ok, false, 'the lesson must be judged, not skipped');
  assert.ok(/LESSON REGRESSION/.test(r.note), 'and reported as a regression');
});

test('a creation-scoped lesson stays out of scope on a self review', () => {
  const critic = require(path.join(DIR, '..', 'graph', 'critic.js'));
  const [chk] = critic.lessonChecks([
    { id: 'x', label: 'L', check: 'zzznotpresentanywhere', applies: 'timer' }]);
  const r = chk.run({ requirements: '', findings: '', prd: '', codeBlob: '',
    scopeSubject: critic.selfScopeSubject(path.join(DIR, '..', 'graph')) });
  assert.strictEqual(r.ok, true, 'a timer lesson must not false-fire on the engine');
  assert.ok(/out of scope/.test(r.note));
});

test('the real engine self-review evaluates its paradise-internal lessons', () => {
  const critic = require(path.join(DIR, '..', 'graph', 'critic.js'));
  const rev = critic.review(path.join(DIR, '..', 'graph'),
    { self: true, lessons: path.join(DIR, '..', 'graph', 'lessons.json') });
  const internal = rev.results.filter(r => /^lesson:/.test(r.id) && /out of scope/.test(r.note || ''));
  assert.ok(!internal.some(r => /paradise-internal/.test(r.note)),
    'no paradise-internal lesson may be skipped when the engine judges itself');
});

test('.paradise-scopes overrides the declared self scopes (a config surface)', () => {
  const critic = require(path.join(DIR, '..', 'graph', 'critic.js'));
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-scopes-'));
  try {
    fs.writeFileSync(path.join(d, '.paradise-scopes'), '# what this module is\nfrontend\n');
    const subj = critic.selfScopeSubject(d);
    assert.ok(critic.scopeMatches(subj, 'frontend'), 'the override is honoured');
    assert.ok(!critic.scopeMatches(subj, 'paradise-internal'), 'and it replaces the defaults');
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

// --- Daily guard: the once-a-day quota with catch-up ---
console.log('Daily guard (quota + catch-up):');

function withGuard(fn, hour) {
  const ledger = path.join(os.tmpdir(), 'paradise-daily-' + Math.random().toString(36).slice(2) + '.json');
  const prevL = process.env.PARADISE_DAILY_LEDGER, prevH = process.env.PARADISE_DAILY_HOUR;
  process.env.PARADISE_DAILY_LEDGER = ledger;
  if (hour !== undefined) process.env.PARADISE_DAILY_HOUR = String(hour);
  delete require.cache[require.resolve(path.join(DIR, '..', 'graph', 'daily-guard.js'))];
  const guard = require(path.join(DIR, '..', 'graph', 'daily-guard.js'));
  try { return fn(guard, ledger); }
  finally {
    if (prevL === undefined) delete process.env.PARADISE_DAILY_LEDGER; else process.env.PARADISE_DAILY_LEDGER = prevL;
    if (prevH === undefined) delete process.env.PARADISE_DAILY_HOUR; else process.env.PARADISE_DAILY_HOUR = prevH;
    try { fs.rmSync(ledger, { force: true }); } catch {}
    delete require.cache[require.resolve(path.join(DIR, '..', 'graph', 'daily-guard.js'))];
  }
}

test('guard does not fire before the daily window opens', () => {
  withGuard((g) => {
    const r = g.isDue();
    assert.strictEqual(r.due, false, 'never run, but the window has not opened');
    assert.ok(/before the/.test(r.reason));
  }, 99); // an hour that can never be reached
});

test('guard fires when the window is open and today has not run', () => {
  withGuard((g) => {
    const r = g.isDue();
    assert.strictEqual(r.due, true, 'owed once the window is open');
  }, 0); // window always open
});

test('guard fires exactly once per day', () => {
  withGuard((g) => {
    assert.strictEqual(g.isDue().due, true, 'owed before running');
    g.markDone('test');
    const after = g.isDue();
    assert.strictEqual(after.due, false, 'not owed again the same day');
    assert.ok(/already ran today/.test(after.reason));
  }, 0);
});

test('guard CATCHES UP when the machine was off for days', () => {
  withGuard((g, ledger) => {
    g.markDone('old run');
    // rewrite the ledger as if the last run was days ago (machine was off)
    const l = JSON.parse(fs.readFileSync(ledger, 'utf8'));
    l.lastDate = '2020-01-01';
    fs.writeFileSync(ledger, JSON.stringify(l));
    const r = g.isDue();
    assert.strictEqual(r.due, true, 'a missed day is owed on wake');
    assert.strictEqual(r.catchUp, true, 'flagged as a catch-up run');
  }, 0);
});

test('guard reports JST regardless of the machine timezone', () => {
  withGuard((g) => {
    const now = g.nowJst();
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(now.date), 'JST calendar date');
    assert.ok(now.hour >= 0 && now.hour <= 23, 'JST hour');
    assert.ok(/JST$/.test(now.stamp));
  }, 0);
});

// ─── 視覚アイデンティティ (憲法 第17条) ───
const identity = require('../graph/identity.js');

test('identity: candidates never repeat a family, and tech_saas gets at most one slot', () => {
  // 同じ family から3つ並べても選択肢にならない。司祭は結局いつもの見た目に落ちる。
  const res = identity.suggest('習慣を記録するトラッカー', 'test-a', { history: path.join(os.tmpdir(), 'no-such-history-' + Math.random() + '.json') });
  const fams = res.candidates.map(c => c.family);
  assert.strictEqual(new Set(fams).size, fams.length, 'every candidate comes from a different family');
  assert.ok(fams.filter(f => f === 'tech_saas').length <= 1, 'tech_saas never fills more than one slot');
});

test('identity: the same wish does NOT keep returning the same look', () => {
  // これが「AIっぽさ」の再生産を止める中核。採用を記録しながら5回繰り返す。
  const hf = path.join(os.tmpdir(), 'paradise-identity-' + Math.random().toString(36).slice(2) + '.json');
  const seen = [];
  for (let i = 0; i < 5; i++) {
    const r = identity.suggest('習慣を記録するトラッカー', 'run' + i, { history: hf, n: 1 });
    const top = r.candidates[0];
    seen.push(top.id);
    identity.record('run' + i, top.id, { history: hf });
  }
  assert.strictEqual(new Set(seen).size, 5, 'five runs must yield five different looks, not the same default');
  fs.rmSync(hf, { force: true });
});

test('identity: selection is deterministic for the same seed and history', () => {
  const hf = path.join(os.tmpdir(), 'paradise-identity-det-' + Math.random().toString(36).slice(2) + '.json');
  const a = identity.suggest('集中のためのタイマー', 'same-slug', { history: hf });
  const b = identity.suggest('集中のためのタイマー', 'same-slug', { history: hf });
  assert.deepStrictEqual(a.candidates.map(c => c.id), b.candidates.map(c => c.id), 'no randomness: the ring must be reproducible');
  fs.rmSync(hf, { force: true });
});

test('identity: the catalog keeps a non-tech majority available', () => {
  // 語彙がテックSaaSばかりなら、どれだけ規律を書いても偏りは戻ってくる。
  const cat = identity.loadCatalog();
  assert.ok(cat.entries.length >= 70, 'catalog carries the full upstream vocabulary');
  const tech = cat.entries.filter(e => e.family === 'tech_saas').length;
  assert.ok(cat.entries.length - tech >= 30, `at least 30 non-tech looks must exist (got ${cat.entries.length - tech})`);
});

test('identity: traits stay discriminating (no trait covers most of the catalog)', () => {
  // 74件中71件が同じ trait を持つ索引は、索引ではない(実測で一度そうなった)。
  const cat = identity.loadCatalog();
  const freq = new Map();
  for (const e of cat.entries) for (const t of e.traits) freq.set(t, (freq.get(t) || 0) + 1);
  for (const [t, c] of freq) {
    assert.ok(c / cat.entries.length <= 0.55, `trait "${t}" covers ${c}/${cat.entries.length} — it no longer discriminates`);
  }
});

test('critic flags a UI creation that defaulted to the generic dev-tool palette', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-visual-'));
  fs.writeFileSync(path.join(d, 'requirements.md'), '# X\n## Acceptance Criteria\n- AC-1 works.');
  // Paradise 自身の習慣トラッカー初版が実際にこうなっていた
  fs.writeFileSync(path.join(d, 'app.html'), '<style>:root{--bg:#0d1117;--fg:#e6edf3;--accent:#58a6ff;--ok:#3fb950}</style>');
  const rev = critic.review(d);
  assert.ok(rev.smells.some(s => /visual-identity-declared/.test(s.id)), 'defaulting to the dev-tool look is a smell');
  // identity.md を添えれば、視覚が意図されたものだと示せる
  fs.writeFileSync(path.join(d, 'identity.md'), '# identity\nmastercard direction: putty cream + signal orange.');
  const rev2 = critic.review(d);
  assert.ok(!rev2.smells.some(s => /visual-identity-declared/.test(s.id)), 'a declared identity clears the smell');
  fs.rmSync(d, { recursive: true, force: true });
});

test('critic does not nag a non-UI creation about visual identity', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-visual-none-'));
  fs.writeFileSync(path.join(d, 'requirements.md'), '# X\n## Acceptance Criteria\n- AC-1 works.');
  fs.writeFileSync(path.join(d, 'lib.js'), 'module.exports = () => 1;');
  const rev = critic.review(d);
  assert.ok(!rev.smells.some(s => /visual-identity-declared/.test(s.id)), 'no UI surface, no visual complaint');
  fs.rmSync(d, { recursive: true, force: true });
});

test('every phase in every forge scale names an agent that actually exists', () => {
  // `frontend` は実在しないのに full スケールが参照していた(宙吊り参照)。
  // engine 化した check-agents.js で同じ検査を行う。
  const ca = require('../graph/check-agents.js');
  const res = ca.check();
  if (res.skipped) return; // ハーネス未配置の環境では検査しない
  assert.deepStrictEqual(res.missing, [], 'forge.js must not name a priest that does not exist');
});

test('check-agents actually catches a missing priest', () => {
  // 検査そのものが機能しているか。全部揃った状態しか見ないなら、それは検査ではない。
  const ca = require('../graph/check-agents.js');
  const need = ca.requiredAgents();
  assert.ok(need.length >= 5, 'forge names a meaningful number of priests');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-agents-'));
  // 1名だけ欠いた状態を作る
  const omitted = need[need.length - 1];
  for (const a of need) { if (a !== omitted) fs.writeFileSync(path.join(d, a + '.md'), 'x'); }
  const res = ca.check(d);
  assert.strictEqual(res.ok, false, 'a missing priest must fail the check');
  assert.deepStrictEqual(res.missing, [omitted], 'and it must name which one');
  fs.rmSync(d, { recursive: true, force: true });
});

test('check-agents skips silently where no harness is installed', () => {
  const ca = require('../graph/check-agents.js');
  const res = ca.check(path.join(os.tmpdir(), 'paradise-no-such-agents-' + Math.random()));
  assert.strictEqual(res.skipped, true, 'CI without ~/.claude must not fail on this');
  assert.strictEqual(res.ok, true);
});

// ─── 表層の実測 (憲法 第18条) ───
const visual = require('../graph/visual-verify.js');

function makeUi(css, extraFiles = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-vv-'));
  fs.writeFileSync(path.join(d, 'app.html'),
    '<!doctype html><html><head><meta name="viewport" content="width=device-width">' +
    `<style>${css}</style></head><body>${extraFiles.body || ''}</body></html>`);
  for (const [f, c] of Object.entries(extraFiles.files || {})) fs.writeFileSync(path.join(d, f), c);
  return d;
}

test('visual: contrast is measured, not assumed (WCAG AA)', () => {
  // 1.92:1 のような読めない配色は、機能テストを全て通っても出荷されうる。
  const d = makeUi(':root{--bg:#ffffff;--fg:#bbbbbb}body{color:var(--fg);background:var(--bg)}');
  const res = visual.check(d);
  const c = res.results.find(r => r.id === 'contrast-aa');
  assert.strictEqual(c.ok, false, 'a 1.9:1 pair must fail AA');
  assert.ok(/needs 4.5/.test(c.note), 'the report states the threshold it measured against');
  fs.rmSync(d, { recursive: true, force: true });
});

test('visual: a readable palette passes contrast', () => {
  const d = makeUi(':root{--bg:#ffffff;--fg:#141413}');
  const res = visual.check(d);
  assert.ok(res.results.find(r => r.id === 'contrast-aa').ok, 'near-black on white must pass');
  fs.rmSync(d, { recursive: true, force: true });
});

test('visual: contrast math matches the WCAG reference values', () => {
  // 黒/白 = 21:1、白/白 = 1:1 は仕様上の固定値。ここがずれたら全ての判定が嘘になる。
  assert.ok(Math.abs(visual.contrast([0, 0, 0], [255, 255, 255]) - 21) < 0.01, 'black on white is 21:1');
  assert.ok(Math.abs(visual.contrast([255, 255, 255], [255, 255, 255]) - 1) < 0.01, 'white on white is 1:1');
});

test('visual: light and dark themes are measured separately', () => {
  // ライトだけ壊れている事故は実在する。テーマを混ぜて平均してはならない。
  const d = makeUi(':root{--bg:#ffffff;--fg:#cccccc}' +
                   ':root[data-theme="dark"]{--bg:#141413;--fg:#f5f5f5}');
  const res = visual.check(d);
  const c = res.results.find(r => r.id === 'contrast-aa');
  assert.strictEqual(c.ok, false, 'the broken light theme must be caught');
  assert.ok(/light:/.test(c.note), 'the failure names the theme it was found in');
  fs.rmSync(d, { recursive: true, force: true });
});

test('visual: empty and error states must be visible somewhere', () => {
  const bare = makeUi(':root{--bg:#fff;--fg:#111}', { body: '<div>data</div>' });
  assert.strictEqual(visual.check(bare).results.find(r => r.id === 'states-covered').ok, false,
    'a UI with no empty/error handling is incomplete');
  const full = makeUi(':root{--bg:#fff;--fg:#111}',
    { body: '<p>まだ記録がありません</p><p class="err">エラーが発生しました</p>' });
  assert.strictEqual(visual.check(full).results.find(r => r.id === 'states-covered').ok, true,
    'declared empty + error states pass');
  fs.rmSync(bare, { recursive: true, force: true }); fs.rmSync(full, { recursive: true, force: true });
});

test('visual: keyboard focus must be visible', () => {
  const d = makeUi(':root{--bg:#fff;--fg:#111}button{color:red}');
  assert.strictEqual(visual.check(d).results.find(r => r.id === 'focus-visible').ok, false,
    'no focus style = keyboard users are lost');
  fs.rmSync(d, { recursive: true, force: true });
});

test('visual: animation without prefers-reduced-motion is flagged', () => {
  const d = makeUi(':root{--bg:#fff;--fg:#111}.x{transition:all .3s}');
  assert.strictEqual(visual.check(d).results.find(r => r.id === 'motion-respected').ok, false,
    'motion that ignores the reduced-motion preference is a smell');
  const ok = makeUi(':root{--bg:#fff;--fg:#111}.x{transition:all .3s}' +
                    '@media (prefers-reduced-motion: reduce){.x{transition:none}}');
  assert.strictEqual(visual.check(ok).results.find(r => r.id === 'motion-respected').ok, true,
    'honouring the preference clears it');
  fs.rmSync(d, { recursive: true, force: true }); fs.rmSync(ok, { recursive: true, force: true });
});

test('visual: a declared identity that never reached the code is called decorative', () => {
  const d = makeUi(':root{--bg:#000000;--fg:#ffffff}', {
    files: { 'identity.md': '# identity\n- `#F3F0EE` cream\n- `#CF4500` signal\n- `#141413` ink\n- `#F37338` warm' },
  });
  const r = visual.check(d).results.find(x => x.id === 'identity-honoured');
  assert.strictEqual(r.ok, false, 'declaring colors that never appear is a decorative identity');
  fs.rmSync(d, { recursive: true, force: true });
});

test('visual: a non-UI creation is not judged on its looks', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-vv-none-'));
  fs.writeFileSync(path.join(d, 'lib.js'), 'module.exports = () => 1;');
  const res = visual.check(d);
  assert.strictEqual(res.applicable, false, 'no surface, no visual verdict');
  assert.strictEqual(res.ok, true);
  fs.rmSync(d, { recursive: true, force: true });
});

test('critic wires the measured surface into judgment', () => {
  // critic が visual-verify の結果を握り潰していないこと。
  const d = makeUi(':root{--bg:#ffffff;--fg:#cccccc}', { body: '<div>x</div>' });
  fs.writeFileSync(path.join(d, 'requirements.md'), '# X\n## Acceptance Criteria\n- AC-1 works.');
  const rev = critic.review(d);
  assert.ok(rev.gaps.some(g => g.id === 'surface-verified'), 'measured visual gaps become real gaps');
  fs.rmSync(d, { recursive: true, force: true });
});

test('critic asks a UI creation for its UX intent and a surface judgment', () => {
  const d = makeUi(':root{--bg:#ffffff;--fg:#141413}',
    { body: '<p>まだありません</p><p>エラー</p>' });
  fs.writeFileSync(path.join(d, 'requirements.md'), '# X\n## Acceptance Criteria\n- AC-1 works.');
  const before = critic.review(d);
  assert.ok(before.smells.some(s => s.id === 'ux-intent-declared'), 'a UI with no ux.md/ux-review.md is a smell');
  fs.writeFileSync(path.join(d, 'ux.md'), '# ux\nflows and states.');
  fs.writeFileSync(path.join(d, 'ux-review.md'), '# ux review\nAPPROVE');
  const after = critic.review(d);
  assert.ok(!after.smells.some(s => s.id === 'ux-intent-declared'), 'declaring intent and judging it clears the smell');
  fs.rmSync(d, { recursive: true, force: true });
});

test('the standard scale designs the surface and judges it', () => {
  // UI/UX の門が standard から抜け落ちていたのが元々の欠陥。
  const ids = forge.buildDag('a small app', 'standard').tasks.map(t => t.id);
  for (const need of ['ux', 'identity', 'ux-review']) {
    assert.ok(ids.includes(need), `standard scale must include the "${need}" phase`);
  }
  const dag = forge.buildDag('a small app', 'standard');
  const build = dag.tasks.find(t => t.id === 'build');
  assert.ok(build.deps.includes('ux') && build.deps.includes('identity'),
    'build may not start before the surface is designed');
  const verify = dag.tasks.find(t => t.id === 'verify');
  assert.ok(verify.deps.includes('ux-review'), 'verification waits on the surface judgment');
});

test('the quality cardinal owns the surface judgment', () => {
  const q = clergy.COLLEGE ? clergy.COLLEGE.quality : null;
  if (!q) return;
  assert.ok(q.governs.includes('ux-review'), 'ux-review belongs to the quality cardinal');
  assert.ok(q.priests.includes('ux-reviewer'), 'the ux-reviewer priest serves under quality');
});

test('visual: adjacent ramp steps must stay distinguishable', () => {
  // ux-reviewer 司祭が手計算と目視でしか見つけられなかった欠陥。
  // 5段階のヒートマップで隣が 1.02:1 なら、段は存在しないに等しい。
  const d = makeUi(':root{--bg:#ffffff;--fg:#141413;' +
    '--level-0:#E7E1DA;--level-1:#F2DCC6;--level-2:#F0B183;--level-3:#EC7F3C;--level-4:#CF4500}');
  const r = visual.check(d).results.find(x => x.id === 'ramp-separation');
  assert.strictEqual(r.ok, false, 'a 1.02:1 step is not a step');
  assert.ok(/level-0 vs --level-1/.test(r.note), 'the report names the offending pair');
  fs.rmSync(d, { recursive: true, force: true });
});

test('visual: a well-separated ramp passes', () => {
  const d = makeUi(':root{--bg:#ffffff;--fg:#141413;' +
    '--level-0:#EEEEEE;--level-1:#BBBBBB;--level-2:#888888;--level-3:#555555;--level-4:#222222}');
  assert.ok(visual.check(d).results.find(x => x.id === 'ramp-separation').ok,
    'a ramp with real steps is fine');
  fs.rmSync(d, { recursive: true, force: true });
});

test('visual: non-text UI boundaries need 3:1 (WCAG 1.4.11)', () => {
  // 毎日押す的の枠が見えないのは、読めない文章と同じ欠陥。
  const d = makeUi(':root{--bg:#EAE5E0;--fg:#141413;--line:#D9D3CC}');
  const r = visual.check(d).results.find(x => x.id === 'non-text-contrast');
  assert.strictEqual(r.ok, false, 'a 1.2:1 border is invisible');
  const ok = makeUi(':root{--bg:#ffffff;--fg:#141413;--line:#6B6B6B}');
  assert.ok(visual.check(ok).results.find(x => x.id === 'non-text-contrast').ok,
    'a border that meets 3:1 passes');
  fs.rmSync(d, { recursive: true, force: true }); fs.rmSync(ok, { recursive: true, force: true });
});

test('visual: themed UIs must declare color-scheme', () => {
  const d = makeUi(':root{--bg:#fff;--fg:#111}:root[data-theme="dark"]{--bg:#111;--fg:#fff}');
  assert.strictEqual(visual.check(d).results.find(x => x.id === 'color-scheme-declared').ok, false,
    'without color-scheme the browser paints light scrollbars on a dark card');
  const ok = makeUi(':root{color-scheme:light dark;--bg:#fff;--fg:#111}:root[data-theme="dark"]{--bg:#111;--fg:#fff}');
  assert.ok(visual.check(ok).results.find(x => x.id === 'color-scheme-declared').ok);
  fs.rmSync(d, { recursive: true, force: true }); fs.rmSync(ok, { recursive: true, force: true });
});

test('visual: an interactive target under 24px is a gap, not a nicety', () => {
  const d = makeUi(':root{--bg:#fff;--fg:#111}.hm-cell{width:13px;height:13px}');
  const r = visual.check(d).results.find(x => x.id === 'touch-target');
  assert.strictEqual(r.ok, false, '13px cells fail WCAG 2.5.8');
  assert.strictEqual(r.severity, 'gap', 'an unhittable control is a gap, not a smell');
  fs.rmSync(d, { recursive: true, force: true });
});

test('visual: an "on-surface" colour is measured against its own surface', () => {
  // --on-signal を主背景と比べるのは誤検出。白文字のボタンが紙の地と
  // 比較されて落ちる、という嘘の指摘を出さないこと。
  const d = makeUi(':root{--bg:#FCFBFA;--fg:#141413;--signal:#CF4500;--on-signal:#FFFFFF}');
  const r = visual.check(d).results.find(x => x.id === 'contrast-aa');
  assert.ok(r.ok, 'white on signal orange is legitimate and must not be flagged against the page background');
  fs.rmSync(d, { recursive: true, force: true });
});

test('visual: tokens survive CSS comments and repeated :root blocks', () => {
  // コメント付き :root と、@media 内の 2 個目の :root。実物がこの形で、
  // これを取りこぼして 25 トークンを丸ごと失い 1.02:1 を見逃した。
  const d = makeUi(
    '/* palette — do not use the default look */\n:root{--bg:#ffffff;--fg:#141413;' +
    '--level-0:#E7E1DA;--level-1:#F2DCC6;--level-2:#F0B183}\n' +
    '@media (max-width:600px){:root{--cell:12px}}');
  const res = visual.check(d);
  assert.ok(res.themes.light >= 5, `the commented :root block must survive (got ${res.themes.light} tokens)`);
  assert.strictEqual(res.results.find(x => x.id === 'ramp-separation').ok, false,
    'and its ramp must still be judged');
  fs.rmSync(d, { recursive: true, force: true });
});

test('visual: the evidence plan demands every theme x width x state', () => {
  const d = makeUi(':root{--bg:#fff;--fg:#111}:root[data-theme="dark"]{--bg:#111;--fg:#fff}');
  const plan = visual.evidencePlan(d);
  assert.strictEqual(plan.applicable, true);
  assert.strictEqual(plan.shots.length, 8, 'light/dark x narrow/wide x empty/populated');
  assert.ok(plan.shots.some(s => s.width <= 400), 'a real phone width must be inspected');
  assert.ok(/not seen/.test(plan.note), 'what could not be captured must be reported as unseen');
  fs.rmSync(d, { recursive: true, force: true });
});

// ─── 借り物の統治 (憲法 第19条) ───
const upstream = require('../graph/upstream.js');
const deploy = require('../graph/deploy.js');

test('upstream: the borrowed tree is treated as read-only', () => {
  const st = upstream.status();
  if (st.error) return; // 上流未配置の環境ではこの検査を行わない
  assert.strictEqual(st.readonly, true, 'overlay.json must declare the upstream read-only');
  assert.strictEqual(st.clean, true,
    `the borrowed worktree must stay pristine — dirty: ${(st.dirty_files || []).join(', ')}`);
});

test('upstream: paradise code is never injected into a borrowed file', () => {
  // 14行のフック注入が実際に未コミットで放置されていた。二度と起こさない。
  const imp = upstream.impact();
  const injected = (imp.reasons || []).filter(r => /injected into the borrowed file/.test(r));
  assert.deepStrictEqual(injected, [], 'a paradise hook belongs beside an upstream hook, never inside it');
});

test('upstream: every divergence kind is declared in the overlay', () => {
  const c = upstream.cfg();
  assert.ok(c.transform && c.transform.agents, 'the model-policy transform over agents is declared');
  assert.ok(c.replace && Object.keys(c.replace).length >= 1, 'replacements are declared, not implicit');
  assert.ok(c.own && Array.isArray(c.own.commands) && c.own.commands.includes('forge.md'),
    'paradise-owned commands are listed');
  assert.ok(c.adopted && Array.isArray(c.adopted.files), 'an adoption list exists even when empty');
});

test('upstream: a transform is not a conflict — it is re-applied, not merged', () => {
  const rel = upstream.relations(upstream.cfg());
  const r = upstream.relationOf(rel, 'agents/architect.md');
  assert.strictEqual(r.kind, 'transform',
    'an upstream agent edited only by the model policy must be classified as a transform');
  const own = upstream.relationOf(rel, 'commands/forge.md');
  assert.strictEqual(own.kind, 'own', "paradise's own command must not be mistaken for upstream drift");
  const rep = upstream.relationOf(rel, 'commands/orchestrate.md');
  assert.strictEqual(rep.kind, 'replace', 'a replaced command is declared as such');
});

test('upstream: adopt refuses to run silently', () => {
  // 既定は dry-run。機械が世界を変えるには人の承認が要る(三権分立)。
  const r = upstream.adopt({});
  assert.ok(r.dry_run || r.note, 'adopt without --yes must not change anything');
  if (r.dry_run) assert.ok(Array.isArray(r.plan), 'a dry run must show the plan it would execute');
});

test('deploy: every deployed file has a declared source', () => {
  // 借り物が無い環境(CI/clone直後)では上流由来の手順が立たない。
  // overlay 由来の手順だけは、どの環境でも成立していなければならない。
  const p = deploy.plan();
  const owned = p.steps.filter(s => s.relation !== 'plain');
  assert.ok(owned.length >= 10, 'the overlay contributes its priests and commands on any machine');
  for (const s of p.steps) {
    assert.ok(['plain', 'replace', 'own', 'adopted'].includes(s.relation),
      `every file carries a declared relation (${s.file} had "${s.relation}")`);
  }
  // 欠けていてよいのは上流由来だけ。楽園が持つべきものが無いのは欠陥。
  const missingOwned = p.missing.filter(m => m.relation !== 'plain');
  assert.deepStrictEqual(missingOwned.map(m => m.src), [],
    'a file paradise owns must exist in the repository, not only on the author machine');
});

test('deploy: the deployed tree matches its declared sources', () => {
  const r = deploy.check();
  if (r.skipped) return; // ハーネス未配置の環境では検査対象が無い
  assert.deepStrictEqual(r.drift.map(d => `${d.kind}/${d.file}: ${d.why}`), [],
    '~/.claude is a product — a difference here means someone edited the product instead of the source');
});

test('deploy: check skips cleanly where no harness is installed', () => {
  // ローカルでしか通らない検査は、検査ではなく作者の思い込みである。
  const r = deploy.check();
  assert.ok(typeof r.skipped === 'boolean', 'check must state whether it could run at all');
  assert.ok(r.ok || r.drift.length > 0, 'a failure must name what drifted');
});

test('deploy: line endings alone are not drift, but real edits are', () => {
  // Windows と Linux を跨ぐと autocrlf で改行が入れ替わる。それを乖離と
  // 呼ぶ検査は環境差で鳴り続け、やがて誰も見なくなる。
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-eol-'));
  const src = path.join(d, 'a.md'), dst = path.join(d, 'b.md');
  fs.writeFileSync(src, 'line one\nline two\n');
  fs.writeFileSync(dst, 'line one\r\nline two\r\n');
  const same = require('crypto').createHash('md5').update(fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n')).digest('hex')
             === require('crypto').createHash('md5').update(fs.readFileSync(dst, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
  assert.ok(same, 'CRLF and LF of the same content must compare equal');
  fs.writeFileSync(dst, 'line one\r\nline two\r\n<!-- tampered -->\n');
  const differs = require('crypto').createHash('md5').update(fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n')).digest('hex')
               !== require('crypto').createHash('md5').update(fs.readFileSync(dst, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
  assert.ok(differs, 'an actual edit must still be caught');
  fs.rmSync(d, { recursive: true, force: true });
});

test('deploy: paradise-owned files come from the repository, not from ~/.claude', () => {
  // 楽園固有のものが配備先にしか無いと、clone した環境で再現できない。
  const p = deploy.plan();
  const owned = p.steps.filter(s => s.relation === 'own');
  assert.ok(owned.length >= 8, 'paradise owns its priests and commands');
  for (const s of owned) {
    assert.ok(s.src.includes('overlay'), `${s.file} must originate from overlay/, not from the deploy target`);
    assert.ok(fs.existsSync(s.src), `${s.file} must exist in the repository`);
  }
});

test('the paradise session hook lives outside the borrowed tree', () => {
  const hookPath = path.join(__dirname, '..', 'tools', 'hooks', 'paradise-session-start.js');
  assert.ok(fs.existsSync(hookPath), 'paradise keeps its own hook file');
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(/PARADISE_ROOT/.test(src), 'the hook resolves its root from the environment, not a hardcoded path');
  assert.ok(/fail-open|catch/.test(src), 'a memory hook must never block a session');
});

// --- report ---
console.log(`\nParadise self-test: ${pass} passed, ${fail} failed`);
try { fs.rmSync(kgRoot, { recursive: true, force: true }); } catch {}
try { fs.rmSync(ccRoot, { recursive: true, force: true }); } catch {}
process.exit(fail === 0 ? 0 : 1);
