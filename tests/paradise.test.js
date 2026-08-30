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
  for (const id of ['discover', 'specify', 'design', 'detail']) { orch.markRunning(run, [id]); orch.markDone(run, id, id + '.md'); }
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

// --- report ---
console.log(`\nParadise self-test: ${pass} passed, ${fail} failed`);
try { fs.rmSync(kgRoot, { recursive: true, force: true }); } catch {}
try { fs.rmSync(ccRoot, { recursive: true, force: true }); } catch {}
process.exit(fail === 0 ? 0 : 1);
