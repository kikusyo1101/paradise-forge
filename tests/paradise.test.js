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
// require() で kg を直接使うテストもある。kg.js は読み込み時に保存先を固定する
// ため、ここで先に環境変数を立てないと **本番の知識グラフに書き込んでしまう**。
// 実際にそれで [t] のテスト用ノードが本番へ紛れ込み、毎セッション注入されていた。
process.env.PARADISE_KG = kgRoot;
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
    security: { issues: 0, secrets: 0 }, spec: { satisfied: true },
    trajectory: { score: 95, reworkCount: 0, firstPassRate: 1, loopGuardTrips: 0 } });
  assert.strictEqual(v.verdict, 'SHIP');
  assert.ok(v.reasons.some(r => /trajectory 95\/100/.test(r)), 'healthy trajectory is cited as evidence');
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
    security: { issues: 0, secrets: 0 }, spec: { satisfied: true },
    trajectory: { score: 90, reworkCount: 0, firstPassRate: 1, loopGuardTrips: 0 } };
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
  if (code) fs.writeFileSync(path.join(d, opts.fileName || 'app.js'), code);
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
  // **実在する成果物を渡す** —— markDone は住所を名乗ったなら実在を検める
  // (第22条 / 第27条: conclave と同じ厳しさ)。この門が測るのは受け渡しであって
  // 台帳の緩さではないので、実在する道を使う
  orch.markDone(run, 'discover', 'tests/paradise.test.js');
  const nw = orch.nextWave(run);
  const specify = nw.wave.find(w => w.id === 'specify');
  assert.ok(specify, 'specify becomes ready');
  assert.strictEqual(specify.context_from[0].from, 'discover');
  assert.strictEqual(specify.context_from[0].artifact, 'tests/paradise.test.js', 'artifact handed off');
});

test('orchestrator runs independent phases in the same wave (parallel)', () => {
  const run = makeRun('standard');
  // build は design(構造)・ux(振る舞い)・identity(見た目)が揃って初めて始まる
  for (const id of ['discover', 'specify', 'design', 'ux', 'identity', 'detail']) {
    orch.markRunning(run, [id]);
    orch.markDone(run, id, 'tests/paradise.test.js');   // 実在する成果物(上と同じ理由)
  }
  const nw = orch.nextWave(run);
  const ids = nw.wave.map(w => w.id).sort();
  assert.deepStrictEqual(ids, ['build', 'tests'], 'build & tests run in parallel after detail');
  assert.strictEqual(nw.parallel, 2);
});

test('orchestrator: 台帳に虚偽の done を記せない — 住所を名乗るなら実在せよ (第22条 / 第27条)', () => {
  // X-1 を生んだ穴は conclave では塞いだが orchestrator では空いていた。
  // **道が違っても、台帳が嘘をつく害は同じ**である
  const run = makeRun('standard');
  orch.markRunning(run, ['discover']);
  const ghost = 'reform/no-such-dir/findings.md';
  assert.throws(
    () => orch.markDone(run, 'discover', ghost),
    /成果物が実在しない/,
    '存在しない成果物で done にできてしまう — 台帳が嘘をつける');
  assert.notStrictEqual(run.phases.discover.status, 'done',
    '例外を投げたのに status が done になっている(部分適用)');

  // 実在するなら通る
  orch.markDone(run, 'discover', 'tests/paradise.test.js');
  assert.strictEqual(run.phases.discover.status, 'done');

  // **住所でない名は従来どおり通る** —— orchestrator の artifact は
  // 'tests' 'implementation' のような実体そのものの名も許す(conclave との違い)
  const run2 = makeRun('standard');
  orch.markRunning(run2, ['discover']);
  orch.markDone(run2, 'discover', 'implementation');
  assert.strictEqual(run2.phases.discover.status, 'done',
    '住所でない名まで拒んだ — 正しい走行を止めている');
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

test('conclave: 成果物を名乗るなら実在せねばならない — 台帳は虚偽の done を記せない (第22条/第27条)', () => {
  // 実測(2026-09-02): security 相の神官が打ち切られたのに教主が
  // `done security --artifact .../security.md` と記録した。ファイルは
  // 一度も存在せず(`git log --all` → 0件)、executor が `ls` で暴くまで
  // 誰も気づかなかった。第27条は subagent だけでなく**記録する者自身**にも向く。
  const run = makeConclave();
  const id = run.domains[0].phases[0].id;
  const ghost = 'reform/__NO_SUCH_ARTIFACT__' + Date.now() + '.md';

  assert.throws(
    () => conclave.markDone(run, id, ghost),
    /成果物が実在しない/,
    '存在しない成果物で done にできてしまう — 台帳が嘘をつける');

  // 拒んだ後、相の印は汚れていない(部分適用しない)
  assert.notStrictEqual(run.domains[0].phases[0].status, 'done',
    '例外を投げたのに status が done になっている');

  // 実在するなら通る
  conclave.markDone(run, id, 'tests/paradise.test.js');
  assert.strictEqual(run.domains[0].phases[0].status, 'done');

  // 成果物を名乗らない done は従来どおり通る
  const run2 = makeConclave();
  conclave.markDone(run2, run2.domains[0].phases[0].id);
  assert.strictEqual(run2.domains[0].phases[0].status, 'done');
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
  conclave.markDone(run, 'discover', 'tests/paradise.test.js');
  const step = conclave.next(run);
  assert.strictEqual(step.phase, 'ratify');
  assert.strictEqual(step.reviewClass, 'pontiff', 'discovery is ratified by the pontiff');
});

test('ratify advances the conclave to the next cardinal', () => {
  const run = makeConclave();
  conclave.markRunning(run, ['discover']);
  conclave.markDone(run, 'discover', 'tests/paradise.test.js');
  conclave.ratify(run, 'discovery');
  const step = conclave.next(run);
  assert.strictEqual(step.cardinal, 'requirements', 'next domain becomes active');
  // artifact handoff crosses the domain boundary
  const specify = step.dispatch.find(d => d.id === 'specify');
  assert.strictEqual(specify.context_from[0].artifact, 'tests/paradise.test.js');
});

test('domain-level reject triggers an INNER rework (the small circle)', () => {
  const run = makeConclave();
  conclave.markRunning(run, ['discover']); conclave.markDone(run, 'discover', 'tests/paradise.test.js');
  conclave.ratify(run, 'discovery');
  conclave.markRunning(run, ['specify']); conclave.markDone(run, 'specify', 'tests/paradise.test.js');
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
    for (const p of phases) conclave.markDone(run, p, 'tests/paradise.test.js');
    conclave.ratify(run, card);
  }
  conclave.markRunning(run, ['review', 'security']);
  conclave.markDone(run, 'review', 'tests/paradise.test.js'); conclave.markDone(run, 'security', 'tests/paradise.test.js');
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
    for (const p of phases) conclave.markDone(run, p, 'tests/paradise.test.js');
    conclave.ratify(run, card);
  }
  conclave.markRunning(run, ['review', 'security']);
  conclave.markDone(run, 'review', 'tests/paradise.test.js'); conclave.markDone(run, 'security', 'tests/paradise.test.js');
  const res = conclave.ratify(run, 'quality', { reject: true, from: 'build' });
  // everything that depended on build must be invalidated, including the finished reviews
  assert.ok(res.reworked.includes('review'), 'a review of stale code is itself stale');
  assert.strictEqual(run.domains.find(x => x.cardinal === 'quality')
    .phases.find(p => p.id === 'review').status, 'rework');
  assert.strictEqual(run.domains.find(x => x.cardinal === 'quality')
    .phases.find(p => p.id === 'review').artifactPath, null, 'stale artifact is dropped');
});

// ── 第51条: 走者の死は環の死ではない ──────────────────────────────
// 中断した走者が残す `running` の化石は、かつて誰も回収できなかった。
// `phaseReady` は pending/rework しか選ばないので、環は永遠に stuck になる。
// 実際に定時ジョブが1本これで死んでいる。以下はその病を裁く門である。

test('conclave: 中断した running が resume で環に戻る (第51条)', () => {
  const run = makeConclave();
  conclave.markRunning(run, ['discover']);
  // 走者が斃れた — 発令の刻を古くして中断を模す
  conclave.allPhases(run).get('discover').dispatchedAt =
    new Date(Date.now() - 20 * 60 * 1000).toISOString();
  assert.strictEqual(conclave.next(run).phase, 'stuck', '化石があると環は静止する');
  const res = conclave.resume(run);
  assert.deepStrictEqual(res.resumed, ['discover'], 'resume が化石を回収する');
  const p = conclave.allPhases(run).get('discover');
  assert.strictEqual(p.status, 'rework',
    'pending ではなく rework へ戻す — 一度手が付いた相を「未着手」と偽らない');
  assert.strictEqual(p.artifactPath, null, '成果物を騙らない (done を刻まない)');
  const step = conclave.next(run);
  assert.strictEqual(step.phase, 'wave', '環が再び回る');
  assert.ok(step.dispatch.some(x => x.id === 'discover'), '当該相が再発令される');
});

test('conclave: 中断→復帰→complete まで環が回りきる (第51条a)', () => {
  const run = makeConclave();
  let died = false, last = null;
  for (let i = 0; i < 200; i++) {
    const r = conclave.next(run);
    last = r.phase;
    if (r.phase === 'complete') break;
    if (r.phase === 'ratify') { conclave.ratify(run, r.cardinal); continue; }
    if (r.phase === 'blocked') break;
    if (r.phase === 'stuck') {   // 走者の死からの復帰はここでしか起きない
      const res = conclave.resume(run, { force: true });
      assert.ok(res.resumed.length, 'stuck なら回収できる化石があるはずだ');
      continue;
    }
    if (r.phase === 'wave' && r.dispatch) {
      conclave.markRunning(run, r.dispatch.map(d => d.id));
      // 最初の波の途中で走者を殺す — done を刻まずに次の周回へ落ちる
      if (!died) { died = true; continue; }
      for (const d of r.dispatch) conclave.markDone(run, d.id, 'tests/paradise.test.js');
    }
  }
  assert.ok(died, '走者の死を実際に模したことを確かめる');
  assert.strictEqual(last, 'complete',
    `中断を経ても環は complete に着かねばならない (最後の相: ${last})`);
});

test('conclave: 生きている running を resume は既定で殺さない (第51条b/第45条)', () => {
  const run = makeConclave();
  conclave.markRunning(run, ['discover']);     // たった今発令された = 生きている
  const res = conclave.resume(run);
  assert.deepStrictEqual(res.resumed, [], '生きている走者を横から奪えば二重発令になる');
  assert.strictEqual(conclave.allPhases(run).get('discover').status, 'running');
  assert.ok(/fresh/.test(res.skipped.find(s => s.id === 'discover').reason));
  const forced = conclave.resume(run, { force: true });
  assert.deepStrictEqual(forced.resumed, ['discover'], '人の明示的な意思は時刻に優先する');
});

test('conclave: 時刻を持たぬ古い run は --force を要求する (第51条b)', () => {
  const run = makeConclave();
  conclave.markRunning(run, ['discover']);
  delete conclave.allPhases(run).get('discover').dispatchedAt;  // この機構より古い run
  const res = conclave.resume(run);
  assert.deepStrictEqual(res.resumed, [], '判定不能なとき engine は独断で印を剥がさない');
  assert.ok(/no dispatchedAt/.test(res.skipped.find(s => s.id === 'discover').reason));
  assert.deepStrictEqual(conclave.resume(run, { force: true }).resumed, ['discover'],
    '--force があれば古い run も生き返る (後方互換)');
});

test('conclave: markRunning が発令の刻を記す (第51条b)', () => {
  const run = makeConclave();
  conclave.markRunning(run, ['discover']);
  const at = conclave.allPhases(run).get('discover').dispatchedAt;
  assert.ok(at && !Number.isNaN(Date.parse(at)),
    '刻が無ければ死者と生者を時刻で分けられない');
});

test('conclave: resume は reworks を消費せず台帳で区別される (第51条)', () => {
  const run = makeConclave();
  const d = run.domains.find(x => x.cardinal === 'discovery');
  conclave.markRunning(run, ['discover']);
  conclave.resume(run, { force: true });
  assert.strictEqual(d.reworks, 0,
    '走者の死は品質の差し戻しではない — loop-guard を削ってはならない');
  assert.strictEqual(conclave.allPhases(run).get('discover').resumes, 1, '回復は別に数える');
  assert.ok(run.history.some(h => h.event === 'resume'),
    '台帳で domain-rework と区別できる event 名であること');
});

test('conclave: 回復は有限で、尽きたら閉塞して人を呼ぶ (第51条c)', () => {
  const run = makeConclave();
  let blocked = null;
  // 上限そのものを反復の境界に使わない。上限が壊れて Infinity になったとき、
  // 門は「落ちる」のではなく**永久に回り続けて OOM で死ぬ**(実測: heap out of memory)。
  // 落ちない門は飾りである(第21条)。ゆえに境界は上限と独立した定数で持つ。
  const HARD_STOP = 12;
  assert.ok(conclave.MAX_PHASE_RESUME < HARD_STOP,
    `MAX_PHASE_RESUME(${conclave.MAX_PHASE_RESUME}) が有限で、かつ十分小さくなければ回復は無限になる`);
  for (let i = 0; i < HARD_STOP; i++) {
    conclave.markRunning(run, ['discover']);
    const res = conclave.resume(run, { force: true });
    if (!res.ok) { blocked = res; break; }
  }
  assert.ok(blocked, `MAX_PHASE_RESUME(${conclave.MAX_PHASE_RESUME}) を超えたら止まらねばならない`);
  assert.strictEqual(blocked.blocked, 'discovery');
  assert.strictEqual(run.domains.find(x => x.cardinal === 'discovery').status, 'blocked');
  assert.strictEqual(conclave.next(run).phase, 'blocked',
    'stuck(回復可能な静止) と blocked(回復を使い切った閉塞) を混同しない');
  assert.ok(run.history.some(h => h.event === 'phase-loop-guard'), '人を呼んだ記録が残る');
});

test('conclave: next --reclaim は opt-in で、既定の next は純粋である (第51条)', () => {
  const mk = () => {
    const r = makeConclave();
    conclave.markRunning(r, ['discover']);
    conclave.allPhases(r).get('discover').dispatchedAt =
      new Date(Date.now() - 20 * 60 * 1000).toISOString();
    return r;
  };
  const a = mk();
  // 既定の next は **相の status を書かない**。domain を pending→active にするのは
  // 従来からの振る舞いであり(第11条の環の進行)、これは相の回収とは別物である。
  // この門が守るのは「reclaim 無しに running が勝手に剥がされないこと」である。
  const phasesBefore = JSON.stringify(a.domains.flatMap(d => d.phases.map(p => [p.id, p.status, p.resumes])));
  assert.strictEqual(conclave.next(a).phase, 'stuck');
  assert.strictEqual(
    JSON.stringify(a.domains.flatMap(d => d.phases.map(p => [p.id, p.status, p.resumes]))),
    phasesBefore,
    '既定の next は相の status を書かない — 既存の門がこの契約に依存している');
  const b = mk();
  assert.strictEqual(conclave.next(b, { reclaim: true }).phase, 'wave',
    '求められたときだけ自動回収する');
});

test('conclave: status が running の化石を人に見せる (第51条a)', () => {
  const run = makeConclave();
  conclave.markRunning(run, ['discover']);
  assert.ok(!/中断の疑い/.test(conclave.statusBoard(run)), '生きている走者を化石と呼ばない');
  conclave.allPhases(run).get('discover').dispatchedAt =
    new Date(Date.now() - 60 * 60 * 1000).toISOString();
  assert.ok(/中断の疑い/.test(conclave.statusBoard(run)),
    '静止を黙って表示すれば、誰も回収しに来ない (沈黙は放棄と同じ)');
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

test('every rank that works declares a model', () => {
  for (const r of ['pontiff', 'cardinal', 'priest', 'believer', 'executor']) {
    assert.ok(clergy.RANKS[r].model, `${r} must declare a model`);
    // effort は「宣言せよ」ではなく「効くものだけ宣言せよ」(第31条)。
    // Haiku は effort を受けないので、null であることが正しい状態である。
    assert.ok(clergy.supportsEffort(clergy.RANKS[r].model, clergy.RANKS[r].effort),
      `${r}: ${clergy.RANKS[r].model} does not accept effort:${clergy.RANKS[r].effort}`);
  }
});

// 位階と能力の関係は「順序」であって特定のモデル名ではない。
// モデル名を直に書くと、神が方針を変えるたびに門が偽の赤を出す(第29条の精神)。
const TIER = { haiku: 1, 'claude-haiku-4-5': 1, sonnet: 2, 'claude-sonnet-5': 2,
               opus: 3, 'claude-opus-5': 3, fable: 4, 'claude-fable-5': 4 };

test('capability descends with rank: judgment ranks outrank workers', () => {
  const t = m => { assert.ok(TIER[m], `unknown model tier: ${m}`); return TIER[m]; };
  const priest = t(clergy.RANKS.priest.model);
  assert.ok(t(clergy.RANKS.cardinal.model) >= priest, 'cardinals decide → never below a priest');
  assert.ok(t(clergy.RANKS.executor.model) >= priest, 'the judge is never cheapened');
  assert.ok(t(clergy.RANKS.pontiff.model) >= priest, 'the pontiff holds the whole plan');
  assert.ok(t(clergy.RANKS.believer.model) <= priest, 'believers do mechanical volume → fastest');
});

test('the tribunal, security and planner are exempt from thrift', () => {
  for (const name of ['self-critic', 'creation-judge', 'security-reviewer', 'planner']) {
    const m = clergy.modelFor(name, 'priest'); // even asked as a priest…
    assert.ok(TIER[m.model] >= 3, `${name} must run at full strength, got ${m.model}`);
    assert.strictEqual(m.source, 'exception');
  }
});

test('a believer resolves to the cheap fast model, a priest to the balanced one', () => {
  assert.strictEqual(TIER[clergy.modelFor('web-scout', 'believer').model], 1);
  assert.strictEqual(TIER[clergy.modelFor('architect', 'priest').model], 2);
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

// 第43条: 逃した窓は借金であって赦しではない。
// 上の catch-up テストは hour=0（窓が常時開）で走るため、窓判定そのものを
// 迂回していた —— 偽の緑である。以下は「窓が閉じている時刻」で検査する。
test('guard: 22時前に起きた日でも、前日の逃した窓は借金として残る (第43条)', () => {
  withGuard((g, ledger) => {
    // 8/30 に走ったきり。8/31 22:00 は機械が OFF。9/1 の朝 9 時に起動した。
    fs.writeFileSync(ledger, JSON.stringify({ lastDate: '2026-08-30', history: [] }));
    const realDate = Date;
    const fake = new realDate('2026-09-01T00:00:00Z'); // = 9/1 09:00 JST（窓の外）
    global.Date = class extends realDate {
      constructor(...a) { return a.length ? new realDate(...a) : new realDate(fake); }
      static now() { return fake.getTime(); }
    };
    try {
      const r = g.isDue();
      assert.strictEqual(r.due, true, '朝9時でも 8/31 の逃した窓は owed のまま');
      assert.strictEqual(r.catchUp, true, 'catch-up として立つ');
      assert.strictEqual(r.owedDay, '2026-08-31', '負っているのは 8/31 の分');
    } finally { global.Date = realDate; }
  }, 22);
});

test('guard: まだ一度も窓が開いていない当日分を先取りしない (第43条)', () => {
  withGuard((g, ledger) => {
    fs.writeFileSync(ledger, JSON.stringify({ lastDate: '2026-08-31', history: [] }));
    const realDate = Date;
    const fake = new realDate('2026-09-01T00:00:00Z'); // = 9/1 09:00 JST
    global.Date = class extends realDate {
      constructor(...a) { return a.length ? new realDate(...a) : new realDate(fake); }
      static now() { return fake.getTime(); }
    };
    try {
      const r = g.isDue();
      assert.strictEqual(r.due, false, '8/31 は済んでおり 9/1 の窓はまだ開いていない');
    } finally { global.Date = realDate; }
  }, 22);
});

test('guard: 定時と監視が同時に問うても、走る権利は一つしか出ない (リース)', () => {
  withGuard((g) => {
    const first = g.claim('定時22時');
    assert.strictEqual(first.claimed, true, '先に問うた者がリースを得る');
    const second = g.claim('30分監視');
    assert.strictEqual(second.claimed, undefined, '二人目は権利を得られない');
    assert.strictEqual(second.due, false, '二重発火は起きない');
    assert.ok(/lease/.test(second.reason), '理由はリース保持であること: ' + second.reason);
  }, 0);
});

test('guard: 中断した走行はリースを返し、次の監視が拾い直せる', () => {
  withGuard((g) => {
    assert.strictEqual(g.claim('中断する走行').claimed, true);
    assert.strictEqual(g.isDue().due, false, '保持中は誰も走れない');
    g.release();
    assert.strictEqual(g.isDue().due, true, '返却後は再び owed — ノルマは失われない');
  }, 0);
});

// 第45条: 発令者は走者ではない。
// 30分監視は自ら改善せず、改善する者を発火させるだけである。にもかかわらず
// 完全な走行リースを掴んでいたため、発火された当の agent が権利を求めると
// 「他の走者が保持中」と拒まれ、何もせず終了していた。門は全て緑のまま
// キャッチアップの道だけが死んでいた（実測: 発火された agent の claimed=false）。
test('guard: 発令者のリースは、発火した当の走者を締め出さない (第45条)', () => {
  withGuard((g) => {
    const watchdog = g.claim('catchup-watchdog', 'dispatch');
    assert.strictEqual(watchdog.claimed, true, '監視は橋としてのリースを得る');
    assert.strictEqual(watchdog.kind, 'dispatch', '発令者は dispatch として立つ');

    const agent = g.claim('定時22時ジョブ');
    assert.strictEqual(agent.claimed, true, '発火された走者は締め出されない');
    assert.strictEqual(agent.adoptedFrom, 'catchup-watchdog', '橋は継承される');
    assert.strictEqual(agent.kind, 'run', '継承後は本物の走行リース');
  }, 0);
});

test('guard: 継承された後は第三者を締め出す — 排他は失われない (第45条)', () => {
  withGuard((g) => {
    g.claim('catchup-watchdog', 'dispatch');
    g.claim('real-runner');
    const third = g.claim('third-party');
    assert.strictEqual(!!third.claimed, false, '走行中の者が居れば誰も入れない');
    assert.ok(/lease/.test(third.reason), '理由はリース保持: ' + third.reason);
  }, 0);
});

test('guard: 発令者は、継承された走行リースを取り上げられない (第45条)', () => {
  withGuard((g) => {
    g.claim('catchup-watchdog', 'dispatch');
    g.claim('real-runner');
    // 発火に失敗したと誤認した監視が release しても、走行中の者は守られる
    const r = g.release('catchup-watchdog');
    assert.strictEqual(r.released, false, '他人のリースは返せない');
    assert.strictEqual(!!g.claim('intruder').claimed, false, '走者は守られたまま');
  }, 0);
});

test('guard: 発令の橋は走行リースより早く腐る — 走者が来なければ窓は再び開く (第45条)', () => {
  withGuard((g, ledger) => {
    g.claim('catchup-watchdog', 'dispatch');
    const lease = JSON.parse(fs.readFileSync(ledger, 'utf8')).lease;
    const minutes = Math.round((lease.expiresAt - Date.now()) / 60000);
    assert.ok(minutes <= 15, `橋は短命であること (実測 ${minutes} 分)`);
    assert.ok(minutes < g.LEASE_MINUTES, '橋は走行リースより短い');
  }, 0);
});

test('guard: キャッチアップ走行は「負っていた日」を精算する (当日ではなく)', () => {
  withGuard((g, ledger) => {
    fs.writeFileSync(ledger, JSON.stringify({ lastDate: '2026-08-30', history: [] }));
    const realDate = Date;
    const fake = new realDate('2026-09-01T00:00:00Z'); // 9/1 09:00 JST, 負債は 8/31
    global.Date = class extends realDate {
      constructor(...a) { return a.length ? new realDate(...a) : new realDate(fake); }
      static now() { return fake.getTime(); }
    };
    try {
      assert.strictEqual(g.claim('catchup').claimed, true);
      const l = g.markDone('取り戻した');
      assert.strictEqual(l.lastDate, '2026-08-31', '精算されるのは負っていた 8/31');
      assert.strictEqual(l.lease, undefined, '完了時にリースは解ける');
    } finally { global.Date = realDate; }
  }, 22);
});

test('guard reports JST regardless of the machine timezone', () => {
  withGuard((g) => {
    const now = g.nowJst();
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(now.date), 'JST calendar date');
    assert.ok(now.hour >= 0 && now.hour <= 23, 'JST hour: ' + now.hour);
    assert.ok(/JST$/.test(now.stamp));
    assert.ok(/ (?:[01]\d|2[0-3]):\d{2} JST$/.test(now.stamp), '刻印の時も 0..23: ' + now.stamp);
  }, 0);
});

test('guard: 真夜中を 24 時と綴る実装でも 0..23 に畳む', () => {
  // CI が JST 00:38 に落ちた実害の回帰。`hour12:false` は ICU の hourCycle に
  // より真夜中を "24" と綴る。**一日のうち一時間だけ嘘をつく門**は、
  // 緑を見ているだけでは永遠に見つからない (第34条: 壊して鳴らして確かめる)。
  withGuard((g) => {
    const realIntl = global.Intl;
    global.Intl = { DateTimeFormat: class {
      constructor() {}
      formatToParts() {
        return [
          { type: 'year', value: '2026' }, { type: 'month', value: '09' },
          { type: 'day', value: '02' }, { type: 'hour', value: '24' },
          { type: 'minute', value: '38' },
        ];
      }
    } };
    try {
      const now = g.nowJst();
      assert.strictEqual(now.hour, 0, '24時は 0時である');
      assert.ok(/ 00:38 JST$/.test(now.stamp), '刻印も畳まれる: ' + now.stamp);
    } finally { global.Intl = realIntl; }
  }, 0);
});

// ─── 視覚アイデンティティ (憲法 第17条) ───
const identity = require('../graph/identity.js');

test('identity: candidates never repeat a family, and tech_saas gets at most one slot', () => {
  // 同じ family から3つ並べても選択肢にならない。神官は結局いつもの見た目に落ちる。
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
  // ux-reviewer 神官が手計算と目視でしか見つけられなかった欠陥。
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

test('the session hook tells the agent who it is, not just what it knows', () => {
  // 知識だけ注いだ結果、新しいセッションは英語で喋り md を闇雲に検索した。
  // 記憶は「何を知っているか」であって「何者で次に何をするか」ではない。
  const hookPath = path.join(__dirname, '..', 'tools', 'hooks', 'paradise-session-start.js');
  const out = require('child_process').execFileSync('node', [hookPath],
    { encoding: 'utf8', timeout: 30000, env: Object.assign({}, process.env, { PARADISE_ROOT: path.join(__dirname, '..') }) });
  assert.ok(/日本語/.test(out), 'the language to answer in must be stated, or the agent defaults to English');
  assert.ok(/教主|Pontiff/.test(out), 'the role must be stated');
  assert.ok(/CLAUDE\.md/.test(out) && /CONSTITUTION\.md/.test(out),
    'the agent must be told where to look instead of searching blindly');
  assert.ok(/PR|main/.test(out), 'the non-negotiable rules must arrive with the memory');
  // 指示は記憶より先に来ること。後ろに置くと長い記憶に埋もれる。
  const roleAt = out.indexOf('教主');
  const memAt = out.indexOf('KNOWLEDGE SNAPSHOT');
  if (memAt >= 0) assert.ok(roleAt >= 0 && roleAt < memAt, 'the briefing must precede the memory dump');
});

test('CLAUDE.md exists and states the working language and the hard rules', () => {
  // Claude Code が最初に読む場所に楽園の説明が無ければ、素の助手として振る舞う。
  // (第39条改正: CLAUDE.md は「最初の1画面」— 写経ではなく地図を裁く。
  //  掟の全文は機構(apply-guards/critic/codex)にあり、ここは指し示すだけでよい)
  const p = path.join(__dirname, '..', 'CLAUDE.md');
  assert.ok(fs.existsSync(p), 'the repository must brief whoever opens it');
  const src = fs.readFileSync(p, 'utf8');
  assert.ok(/日本語で話す/.test(src), 'the working language is stated up front');
  assert.ok(/PR/.test(src) && /マージは神/.test(src), 'the PR-only / owner-merges rule is stated');
  assert.ok(/apply-guards/.test(src), 'it points at the machine enforcement (not a prose copy of it)');
  assert.ok(/CONSTITUTION\.md/.test(src), 'it points at the supreme law');
  assert.ok(/codex\.js/.test(src), 'it points at the law INDEX instead of restating articles (Art. 33/39)');
  assert.ok(/subagent|「done」を信じない/.test(src), 'the un-mechanizable judgment rules remain');
});

test('kg snapshot does not print the same sentence twice', () => {
  // label と body に同じ文が入るため、素直に連結すると全教訓が二重に出て
  // 切り詰めで千切れる。情報密度が半分になっていた。
  const r1 = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-kg-snap-'));
  const e1 = Object.assign({}, process.env, { PARADISE_KG: r1 });
  const kg = path.join(__dirname, '..', 'graph', 'kg.js');
  const long = 'この教訓は十分に長い文であり、ラベルと本文の両方に同じ内容が格納される典型例である';
  require('child_process').execFileSync('node', [kg, 'remember', 'lesson', 'dup-check', long], { env: e1, encoding: 'utf8' });
  const out = require('child_process').execFileSync('node', [kg, 'snapshot'], { env: e1, encoding: 'utf8' });
  const line = out.split('\n').find(l => l.includes('dup-check')) || '';
  const head = long.slice(0, 30);
  const occurrences = line.split(head).length - 1;
  assert.strictEqual(occurrences, 1, `the same sentence must appear once, appeared ${occurrences}x`);
  fs.rmSync(r1, { recursive: true, force: true });
});

test('kg snapshot carries no test residue into the real memory', () => {
  // テストが作った [t] ノードが本番KGに残り、毎セッション注入されていた。
  // 見るべきは「テスト用の隔離KG」ではなく **本番のKG** — テストは自分で
  // PARADISE_KG を差し替えているので、ここでは明示的に外して問い直す。
  const kg = path.join(__dirname, '..', 'graph', 'kg.js');
  const realEnv = Object.assign({}, process.env);
  delete realEnv.PARADISE_KG;
  let out = '';
  try { out = require('child_process').execFileSync('node', [kg, 'snapshot'], { encoding: 'utf8', timeout: 30000, env: realEnv }); }
  catch { return; } // KG未使用の環境
  const residue = out.split('\n').filter(l => /^\s+\[t\]\s/.test(l));
  assert.deepStrictEqual(residue, [],
    'nodes of type "t" are test fixtures — they must never reach a real session');
});

// ─── 独立 (憲法 第20条) ───
const vendor = require('../graph/vendor.js');

test('independence: paradise carries every asset it needs', () => {
  const st = vendor.status();
  assert.ok(st.present, 'overlay/vendor must exist in the repository');
  assert.ok(st.total >= 50, `paradise carries its harness (got ${st.total} files)`);
  for (const k of ['agents', 'commands', 'skills', 'rules', 'hooks', 'scripts']) {
    assert.ok(st.kinds[k] > 0, `${k} must be vendored — without it paradise is a guest, not a house`);
  }
  assert.strictEqual(st.self_sufficient, true, 'the hook scripts themselves must be carried, not merely referenced');
});

test('independence: nothing points back into a tree paradise does not own', () => {
  // 配備物・設定・フックのどれかが上流の絶対パスを指していれば、それは
  // まだ借り物に紐付いている。上流を消した瞬間に壊れる。
  const r = vendor.verify();
  assert.deepStrictEqual(r.findings, [], 'no path may lead back to the borrowed tree');
});

test('independence: the vendored hooks resolve to files that actually exist', () => {
  const hooks = vendor.resolveHooks();
  if (!hooks) return; // vendor未導入の環境
  const raw = JSON.stringify(hooks);
  assert.ok(!/everything-claude-code/.test(raw),
    'resolved hooks must not name the upstream directory');
  assert.ok(!/\$\{CLAUDE_PLUGIN_ROOT\}/.test(raw), 'the plugin-root placeholder must be resolved');
  // 実体が在ること。参照だけ直しても中身が無ければ独立していない。
  for (const m of raw.matchAll(/\\"([^"\\]*\.js)\\"/g)) {
    const p = m[1];
    if (!p.includes('vendor')) continue;
    assert.ok(fs.existsSync(p), `a vendored hook script must exist on disk: ${p}`);
  }
});

test('independence: upstream absence is not an error once paradise is vendored', () => {
  // 独立したのだから、上流が居ないのは異常ではない。BLOCK を出すのは誤り。
  const upstreamMod = require('../graph/upstream.js');
  const st = upstreamMod.status();
  const imp = upstreamMod.impact();
  if (st.error) {
    assert.notStrictEqual(imp.verdict, 'BLOCK',
      'a missing upstream must not block a paradise that carries its own assets');
  } else {
    assert.ok(['SAFE', 'REVIEW', 'BLOCK'].includes(imp.verdict), 'a present upstream is still judged');
  }
});

test('independence: refresh never copies without a human yes', () => {
  const r = vendor.refresh({});
  assert.ok(r.dry_run || r.skipped, 'refresh must not modify the vendored assets on its own');
});

test('independence: what was borrowed is credited', () => {
  // 自分の足で立つことは、担がれた事実を無かったことにすることではない。
  const p = path.join(__dirname, '..', 'NOTICE.md');
  assert.ok(fs.existsSync(p), 'NOTICE.md must record the origin of adopted assets');
  const src = fs.readFileSync(p, 'utf8');
  assert.ok(/everything-claude-code/.test(src), 'the source project is named');
  assert.ok(/MIT/.test(src), 'the licence is stated');
  assert.ok(/[0-9a-f]{40}/.test(src), 'the exact adopted commit is recorded');
  assert.ok(/LICENSE.*存在しない|LICENSE.*不在/.test(src),
    'the absence of an upstream LICENSE file is recorded honestly, not glossed over');
});

// ══════════════════════════════════════════════════════════════════════
// 第21条 — 門は名を口にする全ての口を見る
// ══════════════════════════════════════════════════════════════════════

test('reference gate: every mouth that names a priest is watched (Art.21)', () => {
  const ca = require('../graph/check-agents.js');
  const map = ca.referenceMap();
  const sources = new Set();
  for (const s of map.values()) for (const one of s) sources.add(one.split(':')[0].split('/')[0]);
  // forge.js だけを見る門は盲点だった。三つの口すべてを読むこと。
  assert.ok([...sources].some(s => s === 'forge.js'), 'forge.js is read');
  assert.ok([...sources].some(s => s === 'clergy.js'), 'clergy.js is read — it names priests too');
  assert.ok([...sources].some(s => s === 'examples'), 'shipped example DAGs are read');
});

test('reference gate: a dangling name is caught AND traced to who named it (Art.21)', () => {
  // 門を、わざと壊して試す。実在しない神官を名指す見本DAGを作って気づくか。
  const ca = require('../graph/check-agents.js');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ex-'));
  fs.writeFileSync(path.join(tmp, 'ghost.dag.json'), JSON.stringify({
    tasks: [{ id: 'x', agent: 'nonexistent-ghost-priest', goal: 'g' }],
  }));
  const agentsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-'));
  for (const a of ca.requiredAgents({ examplesDir: path.join(__dirname, '..', 'graph', 'examples') })) {
    fs.writeFileSync(path.join(agentsDir, `${a}.md`), '# stub');
  }
  const res = ca.check(agentsDir, { examplesDir: tmp });
  assert.strictEqual(res.ok, false, 'a dangling reference must fail the gate');
  assert.ok(res.missing.includes('nonexistent-ghost-priest'), 'the missing priest is named');
  const d = res.dangling.find(x => x.agent === 'nonexistent-ghost-priest');
  assert.ok(d && d.namedBy.some(s => s.includes('ghost.dag.json')),
    'the gate reports WHO named it — a finding you cannot trace you cannot fix');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(agentsDir, { recursive: true, force: true });
});

test('reference gate: a healthy paradise passes it (no false alarm)', () => {
  const ca = require('../graph/check-agents.js');
  const res = ca.check();
  assert.ok(res.ok, `every named priest must exist: missing ${JSON.stringify(res.missing)}`);
});

// ══════════════════════════════════════════════════════════════════════
// 第22条 — 己について語る数は、数えられ、突き合わされる
// ══════════════════════════════════════════════════════════════════════

test('census: the paradise measures itself from the artifacts, not from prose (Art.22)', () => {
  const census = require('../graph/census.js');
  const c = census.census({ runTests: false });   // 自己テストの中で自己テストは呼ばない
  assert.ok(c.articles >= 22, `constitution must have >= 22 articles, measured ${c.articles}`);
  assert.ok(c.engines > 0, 'engines are counted from disk');
  assert.ok(c.vendorFiles > 0, 'vendored files are counted from disk');
});

test('census: a stale number in the documents is a failing gate (Art.22)', () => {
  // 門を、わざと壊して試す。腐った数を仕込んで、名指しで捕らえるか。
  // (第39条改正: CLAUDE.md は数値台帳ではなくなった — 数の門は README を裁く)
  const census = require('../graph/census.js');
  const c = census.census({ runTests: false });
  const claimsList = census.claims(c);
  const testClaim = claimsList.find(x => /README テスト数/.test(x.label));
  assert.ok(testClaim, 'the test count is among the claims that get verified');
  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  const m = readme.match(testClaim.re);
  assert.ok(m, 'the claim is actually present in README.md — a claim that vanished is not verified');
  // CLAUDE.md からは数値 claim が消えたことも門で固定する (再侵入は dietChecks が裁く)
  assert.ok(!claimsList.some(x => x.file === 'CLAUDE.md'),
    'CLAUDE.md must carry no numeric claims — it is a first screen, not a ledger (Art. 39)');
});

test('census: every number the paradise currently claims is true (Art.22)', () => {
  const census = require('../graph/census.js');
  const res = census.check({ runTests: false });
  const stale = res.findings.filter(f => f.kind === 'stale');
  assert.strictEqual(stale.length, 0,
    `stale self-claims: ${stale.map(f => `${f.label} says ${f.claimed} but is ${f.actual}`).join('; ')}`);
});

// ══════════════════════════════════════════════════════════════════════
// 第23条 — 楽園は己の法で己を改める / 無主の相を許さない
// ══════════════════════════════════════════════════════════════════════

test('reform: the paradise has a road to change ITSELF (Art.23)', () => {
  const forge = require('../graph/forge.js');
  assert.ok(forge.SCALES.reform, 'a reform scale must exist — creations-only roads left the paradise unable to reform itself');
  const ids = forge.buildDag('probe', 'reform').tasks.map(t => t.id);
  for (const need of ['discover', 'specify', 'design', 'build', 'prove', 'review', 'security', 'verify', 'reflect', 'verdict']) {
    assert.ok(ids.includes(need), `reform road must include the ${need} phase`);
  }
  // 創造物の道には無い、改革だけの相 — 門をわざと壊して鳴るか試す相。
  assert.ok(!forge.buildDag('p', 'standard').tasks.some(t => t.id === 'prove'),
    'prove is specific to reform: a gate that only ever saw a healthy system is untested');
});

test('reform: a wish about the paradise itself routes to reform, before other heuristics (Art.23)', () => {
  const forge = require('../graph/forge.js');
  for (const wish of ['楽園のオーケストレーションを改善する', '憲法に条を足す', 'improve the harness engine', '門を強化する']) {
    assert.strictEqual(forge.chooseScale(wish), 'reform', `"${wish}" must take the reform road`);
  }
  // 「修正」を含んでも、対象が楽園なら quick へ落ちてはならない(順序が効いている証拠)
  assert.strictEqual(forge.chooseScale('楽園のエンジンのバグを修正する'), 'reform',
    'subject beats verb: a fix TO THE PARADISE is still a reform');
  // 逆に、創造物への願いを reform へ攫ってはならない
  assert.strictEqual(forge.chooseScale('ポモドーロタイマーが欲しい'), 'standard',
    'a wish for a creation must not be dragged into the reform road');
});

test('reform: no phase may be masterless (Art.23)', () => {
  const ca = require('../graph/check-agents.js');
  const un = ca.ungovernedPhases();
  assert.strictEqual(un.length, 0,
    `every phase needs a cardinal or the tribunal; ungoverned: ${JSON.stringify(un)}`);
});

test('reform: the ungoverned-phase gate actually fires when a phase has no master (Art.23)', () => {
  // 門を、わざと壊して試す。統治表から construction を抜けば prove/build が無主になる。
  const clergyMod = require('../graph/clergy.js');
  const saved = clergyMod.COLLEGE.construction.governs;
  try {
    clergyMod.COLLEGE.construction.governs = [];
    delete require.cache[require.resolve('../graph/check-agents.js')];
    const ca = require('../graph/check-agents.js');
    const un = ca.ungovernedPhases();
    assert.ok(un.length > 0, 'removing a cardinal\'s governance must produce ungoverned phases');
    assert.ok(un.some(u => u.phase === 'prove' || u.phase === 'build'),
      `the gate must name the orphaned phase, got ${JSON.stringify(un)}`);
  } finally {
    clergyMod.COLLEGE.construction.governs = saved;
    delete require.cache[require.resolve('../graph/check-agents.js')];
  }
});

// ══════════════════════════════════════════════════════════════════════
// 第24条 — 古い main の上で働かない（門であって、掟ではない）
// ══════════════════════════════════════════════════════════════════════

test('branch guard: a stale base is caught, not merely written down (Art.24)', () => {
  // 実際に起きた事故の再現: 未マージだと思ったPRが既にマージされており、
  // 古い main から分岐して rebase 競合を起こした。隔離リポジトリで門を試す。
  const { execFileSync } = require('child_process');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bg-'));
  const remote = tmp + '.remote';
  const g = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  try {
    g(['init', '-q', '-b', 'main', '.'], tmp);
    g(['config', 'user.email', 't@t'], tmp); g(['config', 'user.name', 't'], tmp);
    fs.writeFileSync(path.join(tmp, 'a.txt'), 'one');
    g(['add', '-A'], tmp); g(['commit', '-q', '-m', 'c1'], tmp);
    const old = g(['rev-parse', 'HEAD'], tmp).trim();
    fs.writeFileSync(path.join(tmp, 'b.txt'), 'two');
    g(['add', '-A'], tmp); g(['commit', '-q', '-m', 'c2'], tmp);
    g(['init', '-q', '--bare', remote], tmp);
    g(['remote', 'add', 'origin', remote], tmp);
    g(['push', '-q', 'origin', 'main'], tmp);

    const guard = require('../graph/branch-guard.js');
    const runIn = (cwd) => {
      const saved = process.cwd();
      // inspect は engine のルートで git を叩くため、子プロセスで隔離リポジトリを見せる
      const out = execFileSync(process.execPath, ['-e', `
        const cp = require('child_process');
        const g = a => { try { return cp.execFileSync('git', a, {cwd: ${JSON.stringify(cwd)}, encoding:'utf8', stdio:['ignore','pipe','ignore']}).trim(); } catch { return null; } };
        const originMain = g(['rev-parse','origin/main']);
        const isAnc = g(['merge-base','--is-ancestor', originMain, 'HEAD']) !== null;
        console.log(JSON.stringify({ isAnc }));
      `], { encoding: 'utf8' });
      return JSON.parse(out);
    };

    // A) 最新の上 → 祖先である
    assert.strictEqual(runIn(tmp).isAnc, true, 'a fresh branch sits on top of origin/main');
    // B) 古い main から分岐 → 祖先でない = STALE_BASE の条件
    g(['checkout', '-q', '-b', 'stale', old], tmp);
    assert.strictEqual(runIn(tmp).isAnc, false,
      'branching from a stale main must be detectable — this is the accident that happened');
    assert.strictEqual(typeof guard.inspect, 'function', 'the guard exposes inspect()');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(remote, { recursive: true, force: true });
  }
});

test('branch guard: it never reports green when it could not look (Art.24)', () => {
  // 判定できないことを緑と偽ってはならない(第16条)。
  const src = fs.readFileSync(path.join(__dirname, '..', 'graph', 'branch-guard.js'), 'utf8');
  assert.ok(/UNKNOWN_BASE/.test(src), 'an unreachable remote yields an explicit unknown, not silence');
  assert.ok(/STALE_BASE/.test(src) && /ON_MAIN/.test(src), 'the guard judges both a stale base and standing on main');
});

// ══════════════════════════════════════════════════════════════════════
// 第19条(改正) — 供給線を検める。在庫を数えるだけの門は独立を証明しない
// ══════════════════════════════════════════════════════════════════════

test('independence: deployment SOURCES from what paradise owns, not the upstream (Art.19/20)', () => {
  // かつての門は overlay/vendor のファイル数だけを数え、deploy が実際にどこから
  // 読むかを一度も見ていなかった。ゆえに配備53件中31件が上流由来のまま緑だった。
  const deploy = require('../graph/deploy.js');
  const p = deploy.plan();
  const fromUpstream = p.steps.filter(s => s.from === 'upstream');
  assert.strictEqual(fromUpstream.length, 0,
    `deployment must not source from the upstream tree; ${fromUpstream.length} file(s) still do: ` +
    fromUpstream.slice(0, 5).map(s => `${s.kind}/${s.file}`).join(', '));
  assert.ok(p.steps.length > 0, 'the plan is not empty');
  assert.strictEqual(p.missing.length, 0, 'every planned source exists');
});

test('independence: hiding the upstream does not change the deployment (Art.20)', () => {
  // 独立の唯一の定義: 上流をマシンから消して、全てが同じに動くか。
  // 理屈で語らず、その環境を実際に作って比べる。
  const { execFileSync } = require('child_process');
  const run = (env) => {
    const out = execFileSync(process.execPath, ['-e', `
      const d = require(${JSON.stringify(path.join(__dirname, '..', 'graph', 'deploy.js'))});
      const p = d.plan();
      const m = {};
      for (const s of p.steps) m[s.from] = (m[s.from] || 0) + 1;
      console.log(JSON.stringify({ total: p.steps.length, from: m, missing: p.missing.length }));
    `], { encoding: 'utf8', env: { ...process.env, ...env } });
    return JSON.parse(out);
  };
  const withUp = run({});
  const without = run({ PARADISE_UPSTREAM: path.join(os.tmpdir(), 'no-such-upstream-xyz') });
  assert.strictEqual(without.total, withUp.total,
    `deployment must be identical without the upstream: ${withUp.total} vs ${without.total}`);
  assert.strictEqual(without.missing, 0, 'nothing may go missing when the upstream is gone');
  assert.deepStrictEqual(without.from, withUp.from,
    'the sources must be identical with and without the upstream');
});

// ══════════════════════════════════════════════════════════════════════
// 第25条 — 階層は実在する（宣言だけの梯子を許さない）
// ══════════════════════════════════════════════════════════════════════

test('hierarchy: every cardinal has an actor, not just a label (Art.25)', () => {
  const clergy = require('../graph/clergy.js');
  for (const [cid, c] of Object.entries(clergy.COLLEGE)) {
    assert.ok(c.agent, `cardinal ${cid} must name the agent that plays it — a label dispatches nobody`);
  }
});

test('hierarchy: believers have bodies, not merely names (Art.25)', () => {
  const ca = require('../graph/check-agents.js');
  const r = ca.hierarchyIntegrity();
  if (r.skipped) return;                     // ハーネス未配置の環境では検めない
  const missing = r.findings.filter(f => f.code === 'BELIEVER_MISSING');
  assert.strictEqual(missing.length, 0,
    `every believer needs a body: ${missing.map(f => f.believer).join(', ')}`);
});

test('hierarchy: a priest with believers can actually dispatch them (Art.25)', () => {
  // 調査(Claude Agent SDK docs)が名指しした第一原因:
  // 「allowedTools に Agent(Task) が無いと起動は黙って拒否される」
  const ca = require('../graph/check-agents.js');
  const r = ca.hierarchyIntegrity();
  if (r.skipped) return;
  const blocked = r.findings.filter(f => f.code === 'PRIEST_CANNOT_SPAWN');
  assert.strictEqual(blocked.length, 0,
    `these priests govern believers but cannot spawn: ${blocked.map(f => f.priest).join(', ')}`);
});

test('hierarchy: the gate fires when a believer loses its body (Art.25)', () => {
  // 門を、わざと壊して試す。実在しない信徒を組織に加えて鳴るか。
  const clergy = require('../graph/clergy.js');
  const ca = require('../graph/check-agents.js');
  const saved = clergy.COLLEGE.discovery.believers;
  try {
    clergy.COLLEGE.discovery.believers = [...saved, 'ghost-believer-xyz'];
    const r = ca.hierarchyIntegrity();
    if (r.skipped) return;
    assert.ok(r.findings.some(f => f.code === 'BELIEVER_MISSING' && f.believer === 'ghost-believer-xyz'),
      'a believer with no body must be named by the gate');
  } finally {
    clergy.COLLEGE.discovery.believers = saved;
  }
});

test('hierarchy: the declared depth fits the runtime (Art.25)', () => {
  const clergy = require('../graph/clergy.js');
  // 教主(0) → 枢機卿(1) → 神官(2) → 信徒(3)
  assert.ok(clergy.MAX_SPAWN_DEPTH >= 3,
    `the declared ladder needs depth 3, runtime allows ${clergy.MAX_SPAWN_DEPTH}`);
  assert.ok(clergy.SPAWN_TOOL, 'the spawn tool is named, not assumed');
});

test('hierarchy: the wave is dispatched TO the cardinal, not past it (Art.25)', () => {
  // 素通りの正体: 神官への発令書が教主に返っていた。
  const forge = require('../graph/forge.js');
  const conclave = require('../graph/conclave.js');
  const tmp = path.join(os.tmpdir(), `dag-${Date.now()}.json`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(forge.buildDag('probe wish', 'reform')));
    const run = conclave.convene(tmp);
    const act = conclave.next(run);
    assert.strictEqual(act.phase, 'wave', 'the first action is a wave');
    assert.ok(act.dispatch_to, 'the wave must name who receives the order');
    assert.strictEqual(act.dispatch_to.rank, 'cardinal',
      'the order goes to the cardinal — the pontiff does not call priests directly');
    assert.ok(act.dispatch_to.agent, 'the receiving cardinal has an actor');
    // 調査(Anthropic)が求めた4点が発令書にあるか
    for (const d of act.dispatch) {
      assert.ok(d.contract, `phase ${d.id} carries a contract`);
      for (const k of ['purpose', 'output_format', 'tools_and_sources', 'boundary']) {
        assert.ok(d.contract[k], `phase ${d.id} contract must state ${k} — vague orders cause duplicated work`);
      }
    }
  } finally { try { fs.rmSync(tmp, { force: true }); } catch {} }
});

// ══════════════════════════════════════════════════════════════════════
// 第26条 — 並列は仕事の性質。天井を設定値にしない
// ══════════════════════════════════════════════════════════════════════

test('parallelism: the runtime ceiling is not the dispatch width (Art.26)', () => {
  // arXiv:2512.08296「T ∝ n^1.724、実用的な有効チーム規模は3–4体」逆U字。
  const clergy = require('../graph/clergy.js');
  assert.ok(clergy.EFFECTIVE_CONCURRENT <= 4,
    `effective width must respect the inverted-U (<=4), got ${clergy.EFFECTIVE_CONCURRENT}`);
  assert.ok(clergy.RUNTIME_CONCURRENT > clergy.EFFECTIVE_CONCURRENT,
    'the ceiling and the setting are distinct numbers — conflating them is the defect');
  assert.strictEqual(clergy.MAX_CONCURRENT, clergy.EFFECTIVE_CONCURRENT,
    'dispatch follows the effective width, not the ceiling');
});

test('parallelism: work that carries implicit decisions is not split (Art.26)', () => {
  // Cognition「行動は暗黙の決定を運ぶ」/ Anthropic「コーディングタスクは特に不向き」
  const clergy = require('../graph/clergy.js');
  assert.strictEqual(clergy.PARALLEL_SAFE.build.parallel, false,
    'implementation must not be parallelised — children build contradictory premises');
  assert.strictEqual(clergy.PARALLEL_SAFE.design.parallel, false,
    'design decisions bind everything downstream — they do not split');
  assert.strictEqual(clergy.PARALLEL_SAFE.research.parallel, true,
    'independent questions parallelise cleanly');
  assert.strictEqual(clergy.PARALLEL_SAFE.review.parallel, true,
    'reviewing one artifact from different angles parallelises');
});

test('parallelism: every domain declares the nature of its work (Art.26)', () => {
  const clergy = require('../graph/clergy.js');
  for (const [cid, c] of Object.entries(clergy.COLLEGE)) {
    assert.ok(c.work, `domain ${cid} must declare its work type — undeclared work cannot be scheduled safely`);
    assert.ok(clergy.PARALLEL_SAFE[c.work], `domain ${cid} declares unknown work type '${c.work}'`);
  }
});

test('parallelism: an undeclared work type falls back to sequential, never parallel (Art.26)', () => {
  // 門を、わざと壊して試す。性質を消したら安全側(逐次)に倒れるか。
  const clergy = require('../graph/clergy.js');
  const saved = clergy.COLLEGE.construction.work;
  try {
    delete clergy.COLLEGE.construction.work;
    const plan = clergy.marshalPlan('build', { priestCanSpawn: true });
    assert.strictEqual(plan.execution.parallel, false,
      'unknown work must default to sequential — the safe side, not the fast side');
    assert.strictEqual(plan.execution.limit, 1, 'sequential means one at a time');
  } finally { clergy.COLLEGE.construction.work = saved; }
});

test('parallelism: the construction domain runs sequentially (Art.26)', () => {
  // 楽園の建造ドメインは実装作業そのもの。調査が名指しで警告した領域である。
  const clergy = require('../graph/clergy.js');
  const plan = clergy.marshalPlan('build', { priestCanSpawn: true });
  assert.strictEqual(plan.execution.parallel, false,
    'construction is implementation — Anthropic names coding as ill-suited to parallel agents');
  assert.ok(/暗黙の決定|implicit/.test(plan.execution.why), 'the reason is stated, not merely the verdict');
});

test('orders: the contract states when it is done and demands evidence (Art.26)', () => {
  // MAST: 検証の失敗が21.3%。「検証せず」6.82% /「誤った検証」6.66% /「早すぎる終了」7.82%
  const forge = require('../graph/forge.js');
  const conclave = require('../graph/conclave.js');
  const tmp = path.join(os.tmpdir(), `dag26-${Date.now()}.json`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(forge.buildDag('probe wish', 'reform')));
    const act = conclave.next(conclave.convene(tmp));
    for (const d of act.dispatch) {
      assert.ok(d.contract.done_when, `phase ${d.id} must state its termination condition (FM-1.5, 9.82%)`);
      assert.ok(d.contract.evidence_required, `phase ${d.id} must demand real evidence, not a claim`);
      assert.ok(d.contract.if_unclear, `phase ${d.id} must tell the child to block rather than guess (FM-2.2, 11.65%)`);
    }
    assert.ok(act.parallel <= 4, `dispatch width must respect the effective limit, got ${act.parallel}`);
  } finally { try { fs.rmSync(tmp, { force: true }); } catch {} }
});

// ══════════════════════════════════════════════════════════════════════
// 第27条 — 成果物は「誰がやったか」を証明しない
// ══════════════════════════════════════════════════════════════════════

test('spawn trace: an artifact with no observed dispatch is rejected (Art.27)', () => {
  // 教主が己の手で書いても、成果物は完璧に存在する。それを見抜けねば
  // 委譲と成りすましを区別できない。11件のPRがそうやって生まれた。
  const contract = require('../graph/contract.js');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
  const art = path.join(tmp, 'findings.md');
  fs.writeFileSync(art, 'これは本物の成果物である');
  try {
    const result = { phase: 'discover', status: 'done', artifact: art, summary: 'やりました' };
    const run = { domains: [{ phases: [{ id: 'discover' }] }] };
    const r = contract.reconcile(result, { run });
    assert.strictEqual(r.accepted, false, 'an unspawned phase must be rejected however good its artifact');
    assert.strictEqual(r.verified, 'file-but-unspawned', 'the reason names the real defect');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('spawn trace: a bare claim of dispatch is not evidence (Art.27/Art.5)', () => {
  // MAST FM-2.6「推論と実行の不一致」13.98% — 委譲すると述べて自分でやる。
  const contract = require('../graph/contract.js');
  const trace = require('../graph/spawn-trace.js');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
  const art = path.join(tmp, 'findings.md');
  fs.writeFileSync(art, 'これは本物の成果物である');
  try {
    const run = { domains: [{ phases: [{ id: 'discover' }] }] };
    trace.record(run, 'discover', { agent: 'market-researcher' });   // tool_use id が無い
    const r = contract.reconcile({ phase: 'discover', status: 'done', artifact: art }, { run });
    assert.strictEqual(r.accepted, false, 'an asserted dispatch with no tool_use id must not pass');
    const v = trace.verify(run, 'discover');
    assert.strictEqual(v.state, 'asserted-only', 'the state is named precisely, not lumped with success');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('spawn trace: an observed dispatch is accepted (Art.27)', () => {
  const contract = require('../graph/contract.js');
  const trace = require('../graph/spawn-trace.js');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
  const art = path.join(tmp, 'findings.md');
  fs.writeFileSync(art, 'これは本物の成果物である');
  try {
    const run = { domains: [{ phases: [{ id: 'discover' }] }] };
    trace.record(run, 'discover', { agent: 'market-researcher', toolUseId: 'toolu_01ABC', rank: 'priest' });
    const r = contract.reconcile({ phase: 'discover', status: 'done', artifact: art }, { run });
    assert.strictEqual(r.accepted, true, 'an observed dispatch with a real artifact is accepted');
    assert.strictEqual(r.verified, 'file+spawn', 'both the artifact and the dispatch were verified');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('spawn trace: the report names which phases bypassed the hierarchy (Art.27)', () => {
  const trace = require('../graph/spawn-trace.js');
  const run = { domains: [{ phases: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }] };
  trace.record(run, 'a', { agent: 'x', toolUseId: 'toolu_1' });
  trace.record(run, 'b', { agent: 'y' });                    // 自己申告のみ
  // c は証跡なし
  const rep = trace.report(run);
  assert.strictEqual(rep.ok, false, 'bypassed phases must fail the report');
  assert.strictEqual(rep.observed, 1);
  assert.strictEqual(rep.assertedOnly, 1);
  assert.strictEqual(rep.noTrace, 1);
  assert.deepStrictEqual(rep.bypassed.map(b => b.phase).sort(), ['b', 'c'],
    'a finding you cannot trace to a phase you cannot fix');
});

test('spawn trace: reconciliation without a run keeps working (backward compatible)', () => {
  // 走行状態を渡さない既存の呼び出しは従来どおり成果物だけで裁く。
  // 新しい門が古い呼び出しを黙って壊してはならない。
  const contract = require('../graph/contract.js');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
  const art = path.join(tmp, 'a.md');
  fs.writeFileSync(art, 'x'.repeat(50));
  try {
    const r = contract.reconcile({ phase: 'p', status: 'done', artifact: art });
    assert.strictEqual(r.accepted, true, 'the old call path is unchanged');
    assert.strictEqual(r.verified, 'file');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

// ══════════════════════════════════════════════════════════════════════
// 第28条 — 規範の教訓は grep で裁けない
// ══════════════════════════════════════════════════════════════════════

test('lessons: a lesson declares its kind, defaulting to mechanism (Art.28)', () => {
  // 注意: lessons.json は KG から生成される成果物である。CI では KG が存在せず
  // 裁定ジョブが lessons.js export を実行するため **空配列になる**。
  // 「中身が在ること」を暗黙に前提した検査は、そこで落ちる（実際に落ちた）。
  // 存在しないから壊れているのではない — 検めるものが無いだけである。
  const lessons = require('../graph/lessons.json');
  for (const l of lessons) {
    assert.ok(l.kind, `lesson ${l.id} must carry a kind`);
    assert.ok(['mechanism', 'conduct', 'artifact'].includes(l.kind), `lesson ${l.id} has unknown kind ${l.kind}`);
  }
  // 既定が mechanism であることは、生成物ではなく **engine** に対して検める。
  // こちらは KG の有無に依存しない真実である。
  const src = fs.readFileSync(path.join(__dirname, '..', 'graph', 'lessons.js'), 'utf8');
  assert.ok(/kind:\s*kind\s*\|\|\s*'mechanism'/.test(src),
    'an undeclared lesson must default to mechanism — asserted against the engine, not its output');
});

test('lessons: the kind marker never leaks into the check text (Art.28)', () => {
  // |kind: が check に残ると、その文字列をコードから探すことになり本末転倒。
  const lessons = require('../graph/lessons.json');
  for (const l of lessons) {
    assert.ok(!/\|kind:/.test(l.check), `lesson ${l.id}: the kind marker leaked into its check`);
    if (l.applies) assert.ok(!/\|kind:/.test(l.applies), `lesson ${l.id}: the kind marker leaked into its scope`);
  }
});

test('lessons: a conduct lesson is surfaced but never graded red (Art.28)', () => {
  // 二つの誤りは等価: 永久に赤 → 門が無視される / 緑にする → 教訓が消える。
  const critic = require('../graph/critic.js');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cr-'));
  try {
    fs.writeFileSync(path.join(tmp, 'x.js'), '// 教訓の語は一切現れない中身\nmodule.exports = 1;\n');
    const lessonsPath = path.join(tmp, 'lessons.json');
    fs.writeFileSync(lessonsPath, JSON.stringify([
      { id: 'c1', label: '掟', check: 'ブラウザを閉じよ', applies: null, kind: 'conduct' },
      { id: 'm1', label: '機構', check: 'zzz-absent-mechanism-token', applies: null, kind: 'mechanism' },
    ]));
    // opts.lessons は **ファイルパス**（配列ではない）。実装を読んで確かめた。
    const r = critic.review(tmp, { lessons: lessonsPath, self: true });
    const conduct = r.results.find(x => x.id === 'lesson:c1');
    const mech = r.results.find(x => x.id === 'lesson:m1');
    assert.ok(conduct, 'the conduct lesson still appears in the review — it is not deleted');
    assert.strictEqual(conduct.ok, true, 'a conduct lesson must not be graded red');
    assert.ok(/CONDUCT/.test(conduct.note), 'it is surfaced as a standing obligation, not silently passed');
    assert.strictEqual(mech.ok, false, 'a mechanism lesson whose remedy is absent is still a real gap');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('lessons: the engine review is clean — no permanently-red gate remains (Art.28)', () => {
  // 常時赤の門は読まれなくなる。無視される門は、無い門より悪い。
  const critic = require('../graph/critic.js');
  const r = critic.review(path.join(__dirname, '..', 'graph'),
    { lessons: path.join(__dirname, '..', 'graph', 'lessons.json'), self: true });
  const hardGaps = r.results.filter(x => !x.ok && !x.soft);
  assert.strictEqual(hardGaps.length, 0,
    `the engine review must be clean: ${hardGaps.map(g => g.id).join(', ')}`);
});

// ══════════════════════════════════════════════════════════════════════
// 第29条 — 生成物は真実の写しであって、真実そのものではない
// ══════════════════════════════════════════════════════════════════════

test('derived: every generated artifact is declared with its source (Art.29)', () => {
  const derived = require('../graph/derived.js');
  for (const [file, spec] of Object.entries(derived.DERIVED)) {
    assert.ok(spec.from, `${file} must name where it comes from`);
    assert.ok(spec.by, `${file} must name the command that regenerates it`);
    assert.ok(spec.note, `${file} must state the hazard it carries`);
  }
  // 実測で罠を踏んだ3つが宣言されていること
  for (const f of ['graph/lessons.json', 'dashboard/state.json', 'dashboard/state.js']) {
    assert.ok(derived.DERIVED[f], `${f} is generated and must be declared`);
  }
});

test('derived: no test asserts on the CONTENT of a derived file (Art.29)', () => {
  // これが本番の門。CIを落とした欠陥がここで捕まる。
  const derived = require('../graph/derived.js');
  const res = derived.check();
  assert.strictEqual(res.findings.length, 0,
    `tests must not assume derived content: ${res.findings.map(f => `${f.file}:${f.line}`).join(', ')}`);
});

test('derived: the gate catches the exact accident that broke CI (Art.29)', () => {
  // 門を、わざと壊して試す。今回CIを落とした形そのものを仕込む。
  const derived = require('../graph/derived.js');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-'));
  const f = path.join(tmp, 'bad.test.js');
  fs.writeFileSync(f, [
    "test('x', () => {",
    "  const lessons = require('../graph/lessons.json');",
    "  assert.ok(lessons.some(l => l.kind === 'mechanism'), 'defaults to mechanism');",
    '});',
  ].join('\n'));
  try {
    const found = derived.offendingAssertions(f);
    assert.ok(found.length > 0, 'asserting presence on a derived file must be caught');
    assert.ok(/lessons\.json/.test(found[0].derived), 'the gate names which derived file');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('derived: the gate does NOT cry wolf on fixtures or negations (Art.29)', () => {
  // 狼少年の門は、無い門より悪い(第21条)。素朴な照合は3件挙げ、3件とも誤検出だった。
  const derived = require('../graph/derived.js');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-'));
  const f = path.join(tmp, 'ok.test.js');
  fs.writeFileSync(f, [
    "test('fixture is not a derived file', () => {",
    "  const lessonsFile = path.join(d, 'lessons.json');",          // 一時ディレクトリの自作
    "  fs.writeFileSync(lessonsFile, JSON.stringify([{id:'l1'}]));",
    "  assert.ok(rev.gaps.some(g => g.id === 'lesson:l1'), 'fixture drives the check');",
    '});',
    "test('a negation survives an empty derived file', () => {",
    "  const rev = critic.review(dir, { lessons: path.join(DIR, '..', 'graph', 'lessons.json') });",
    "  assert.ok(!internal.some(r => /x/.test(r.note)), 'nothing may be skipped');",  // 否定形
    '});',
  ].join('\n'));
  try {
    assert.strictEqual(derived.offendingAssertions(f).length, 0,
      'fixtures and negations must not be reported — a gate that cries wolf gets ignored');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('census: 総括は位置ではなく名前で読む — 子テストの集計行に騙されない (第22条 / 第29条)', () => {
  const census = require('../graph/census.js');
  // 実測(2026-09-02): ダッシュボードの門13本を新設したところ、自己診断の出力に
  // 子テストの集計行が8本現れた。旧実装は String.match の**最初の一致**を拾い、
  // `dashboard-count: 15 passed` を「楽園のテスト総数」と信じた。README の 256 と
  // 突き合わせて第22条違反を叫んだが、**嘘をついていたのは README ではなく数え方だった**。
  const withChildren = [
    'dashboard-count: 15 passed, 0 failed',
    'dashboard-no-deps: 10 passed, 0 failed',
    'dashboard-run-panel: 16 passed, 0 failed',
    '',
    'Paradise self-test: 288 passed, 0 failed',
    '',
  ].join('\n');
  assert.deepStrictEqual(census.summaryOf(withChildren), { passed: 288, failed: 0 },
    '子テストの集計行を総括と取り違えている — 先頭ではなく名乗りで狙え');

  // 赤があっても総括を読む
  assert.deepStrictEqual(
    census.summaryOf('child: 3 passed, 0 failed\nParadise self-test: 287 passed, 1 failed\n'),
    { passed: 287, failed: 1 });

  // 名乗りが無い版でも壊れない — 最後の一致に落ちる
  assert.deepStrictEqual(census.summaryOf('a: 1 passed, 0 failed\nb: 9 passed, 2 failed\n'),
    { passed: 9, failed: 2 }, '名乗りが無いときは最後の一致に落ちるべき');

  // 読めなければ null。0 で埋めてはならない(第16条: 判定不能は緑ではない)
  assert.strictEqual(census.summaryOf('何も無い'), null,
    '読めなかったときに 0 を返すと「テスト0件で全部通った」と嘘をつく');
});

// --- workspace: 創造物は楽園の外に住む (第30条) ---
console.log('\nWorkspace (Art.30):');

test('workspace: PARADISE_CREATIONS が住所を決める', () => {
  const ws = require('../graph/workspace.js');
  const r = ws.resolve({ env: { PARADISE_CREATIONS: path.join(os.tmpdir(), 'x-creations') } });
  assert.strictEqual(r.source, 'env');
  assert.strictEqual(r.legacy, false);
  assert.strictEqual(r.root, path.resolve(path.join(os.tmpdir(), 'x-creations')));
});

test('workspace: 既定の住所は楽園の兄弟であって内部ではない', () => {
  const ws = require('../graph/workspace.js');
  const repo = path.join(os.tmpdir(), 'ws-repo-' + Date.now());
  const def = ws.defaultRoot(repo);
  assert.strictEqual(path.basename(def), 'paradise-creations');
  assert.ok(!def.startsWith(repo + path.sep), '創造物が engine の内側に落ちてはならない: ' + def);
});

test('workspace: 兄弟が在れば legacy の creations/ より優先される', () => {
  const ws = require('../graph/workspace.js');
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-'));
  const repo = path.join(base, 'paradise');
  fs.mkdirSync(path.join(repo, 'creations'), { recursive: true });
  fs.mkdirSync(path.join(base, 'paradise-creations'), { recursive: true });
  const r = ws.resolve({ repoRoot: repo, env: {} });
  assert.strictEqual(r.source, 'sibling', '移行後も内部を掴み続けてはならない');
  assert.strictEqual(r.legacy, false);
  fs.rmSync(base, { recursive: true, force: true });
});

test('workspace: 内部 creations/ しか無ければ legacy と明示して返す', () => {
  const ws = require('../graph/workspace.js');
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-'));
  const repo = path.join(base, 'paradise');
  fs.mkdirSync(path.join(repo, 'creations'), { recursive: true });
  const r = ws.resolve({ repoRoot: repo, env: {} });
  assert.strictEqual(r.source, 'legacy');
  assert.strictEqual(r.legacy, true, '黙って使うな — 呼び手が警告できねばならない');
  fs.rmSync(base, { recursive: true, force: true });
});

test('workspace: slug は厳しく検める(パス走査を許さない)', () => {
  const ws = require('../graph/workspace.js');
  for (const bad of ['../escape', 'Foo', 'a/b', '', null, '.hidden']) {
    assert.throws(() => ws.creationDir(bad, { env: { PARADISE_CREATIONS: os.tmpdir() } }),
      `slug ${JSON.stringify(bad)} must be rejected`);
  }
  const ok = ws.creationDir('habit-tracker', { env: { PARADISE_CREATIONS: os.tmpdir() } });
  assert.strictEqual(path.basename(ok), 'habit-tracker');
});

test('workspace: 楽園が創造物を git で抱えていない (第30条の本番の門)', () => {
  const ws = require('../graph/workspace.js');
  const stray = ws.strayCreations();
  assert.strictEqual(stray.length, 0,
    `paradise still tracks creations: ${stray.slice(0, 5).join(', ')}`);
});

test('workspace: engine が住所を直書きしていない', () => {
  const ws = require('../graph/workspace.js');
  const hard = ws.hardcodedRefs();
  assert.strictEqual(hard.length, 0,
    `hardcoded creation paths: ${hard.map(h => `${h.file}:${h.line}`).join(', ')}`);
});

test('workspace: 直書きの門は註釈で吠えず、コードでは吠える', () => {
  const ws = require('../graph/workspace.js');
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-'));
  const g = path.join(base, 'graph');
  fs.mkdirSync(g, { recursive: true });
  fs.writeFileSync(path.join(g, 'quiet.js'), [
    "// creations/<slug> を産むための道である  ← 註釈は道を説明してよい",
    "const dir = require('./workspace.js').creationDir(slug);",
  ].join('\n'));
  assert.strictEqual(ws.hardcodedRefs(base).length, 0, '註釈で吠える門は無視される(第21条)');
  fs.writeFileSync(path.join(g, 'loud.js'), "const dir = path.join(ROOT, 'creations/' + slug);");
  const found = ws.hardcodedRefs(base);
  assert.strictEqual(found.length, 1, '走るコードの直書きは必ず捕らえる');
  assert.strictEqual(found[0].file, 'graph/loud.js');
  fs.rmSync(base, { recursive: true, force: true });
});

/**
 * G-03: **形を見る門が意味を見逃した**(第19条の再発)。
 *
 * 旧規則 /['"`][^'"`]*creations\// は引用符の直後にスラッシュが続く形しか咎めず、
 * path.join 経由で組み立てた旧住所を素通りさせた。census.js:75 と
 * export-state.js:32 の 2 件を抱えたまま門は緑を出し続け、
 * **実在 8 件に対し 0 件と報告する欠陥**を守っているつもりで見逃していた。
 * AC-04c が本試験の存在を求めている。
 */
test('workspace: hardcodedRefs は path.join(ROOT, \'creations\') 形も咎める (G-03)', () => {
  const ws = require('../graph/workspace.js');
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-join-'));
  const g = path.join(base, 'graph');
  fs.mkdirSync(g, { recursive: true });
  // 旧規則が素通りさせた当の形。合成の見本で機械判定する (AC-04d)
  fs.writeFileSync(path.join(g, 'sneaky.js'), "const dir = path.join(ROOT, 'creations');");
  const found = ws.hardcodedRefs(base);
  assert.strictEqual(found.length, 1, 'path.join 経由の旧住所を素通りさせた — 門の穴が開いたままである');
  assert.strictEqual(found[0].file, 'graph/sneaky.js');
  assert.ok(found[0].line >= 1 && found[0].why, '名指ししない門は、赤くなっても直せない');
  // path.resolve / 二重引用符 / バッククォートも同じ規則で咎める
  fs.writeFileSync(path.join(g, 'sneaky.js'), 'const dir = path.resolve(ROOT, "creations");');
  assert.strictEqual(ws.hardcodedRefs(base).length, 1, 'path.resolve と二重引用符を見逃した');
  // 註釈は道を説明してよい。走るコードだけを咎める
  fs.writeFileSync(path.join(g, 'sneaky.js'), "// path.join(ROOT, 'creations') は旧住所である");
  assert.strictEqual(ws.hardcodedRefs(base).length, 0, '註釈で吠える門は無視される(第21条)');
  fs.rmSync(base, { recursive: true, force: true });
});

// --- dashboard: 画面の数が嘘をつかない (第22条 / G-01〜G-10) ---
/**
 * 新設した門を自己診断から呼ぶ(要件 §6「新設テストはすべて paradise.test.js から
 * 呼ばれ、単独でも走ること」)。**同一プロセスで require する** —— node 起動代
 * 27ms × 本数を払わないためである(design.md §6.2)。
 * ブラウザを起こす門(fallback / motion-probe-leak)は CI と単独走行に委ねる ——
 * 自己診断 282 秒をこれ以上伸ばさない。
 */
console.log('\nDashboard gates (Art.22 / G-01..G-10):');
for (const name of ['dashboard-count', 'dashboard-no-deps', 'dashboard-links',
  'dashboard-no-hardcode', 'dashboard-transport', 'dashboard-freshness',
  'dashboard-states', 'dashboard-run-panel']) {
  test(`dashboard-count 系: ${name} が緑 (G-01/02/04/06)`, () => {
    const rep = require(path.join(DIR, name + '.test.js'));
    assert.strictEqual(rep.fail, 0,
      `${name} が ${rep.fail} 件落ちた: ${(rep.failures || []).join(' / ')}`);
    assert.ok(rep.pass >= 1, `${name} が 1 件も検査していない — 空の門は門ではない`);
  });
}

// --- seat: 教主の座は機構である (第31条) ---
console.log('\nPontiff seat (Art.31):');

test('seat: 位階の宣言が神の裁可どおりである', () => {
  const c = require('../graph/clergy.js');
  assert.strictEqual(c.RANKS.pontiff.model, 'fable', '教主は長丁場の座');
  assert.strictEqual(c.RANKS.pontiff.effort, 'xhigh');
  assert.strictEqual(c.RANKS.cardinal.model, 'claude-opus-5');
  assert.strictEqual(c.RANKS.executor.model, 'claude-opus-5');
  assert.strictEqual(c.RANKS.priest.model, 'claude-sonnet-5', '生成の本体は据え置く — ここを上げると全てが高くつく');
  assert.strictEqual(c.RANKS.priest.effort, 'high');
  assert.strictEqual(c.RANKS.believer.model, 'haiku');
});

test('seat: 判断の座が神官より安くなることは決してない (第12条)', () => {
  const c = require('../graph/clergy.js');
  const tier = { 'haiku': 1, 'claude-haiku-4-5': 1, 'claude-sonnet-5': 2, 'sonnet': 2, 'claude-opus-5': 3, 'opus': 3, 'fable': 4 };
  const priest = tier[c.RANKS.priest.model];
  for (const r of ['pontiff', 'cardinal', 'executor']) {
    assert.ok(tier[c.RANKS[r].model] >= priest, `${r} は神官より安くあってはならない`);
  }
  assert.ok(tier[c.RANKS.believer.model] <= priest, '信徒が神官より高いのは位階の転倒');
  for (const n of ['self-critic', 'creation-judge', 'security-reviewer', 'planner', 'ux-reviewer']) {
    assert.ok(tier[c.modelFor(n, 'priest').model] >= 3, `${n} は決して安く上げない`);
  }
});

test('seat: 効かない effort は宣言しない — Haiku は effort を持たない (第31条)', () => {
  const c = require('../graph/clergy.js');
  assert.strictEqual(c.RANKS.believer.effort, null, 'Haiku に effort を書けば黙って捨てられる');
  assert.deepStrictEqual(c.EFFORT_SUPPORT.haiku, [], '公式表: Haiku 4.5 は effort 非対応');
  assert.ok(!c.supportsEffort('haiku', 'low'), '受けないものを受けると答えてはならない');
  assert.ok(c.supportsEffort('haiku', null), 'null は常に許される');
  assert.ok(c.supportsEffort('claude-opus-5', 'xhigh'));
  assert.ok(c.supportsEffort('未知のモデル', 'xhigh'), '門は名を知らぬものに吠えない(第21条)');
});

test('seat: 全ての位階と例外が、そのモデルが受ける effort だけを宣言している', () => {
  const c = require('../graph/clergy.js');
  for (const [name, r] of Object.entries(c.RANKS)) {
    if (!r.model) continue;
    assert.ok(c.supportsEffort(r.model, r.effort),
      `rank ${name}: ${r.model} は effort:${r.effort} を受けない — 捨てられる宣言である`);
  }
  for (const [name, e] of Object.entries(c.MODEL_EXCEPTIONS)) {
    assert.ok(c.supportsEffort(e.model, e.effort),
      `exception ${name}: ${e.model} は effort:${e.effort} を受けない`);
  }
});

test('seat: apply-models は effort:null のときキーを消す(書かない)', () => {
  const am = require('../graph/apply-models.js');
  const src = ['---', 'name: web-scout', 'model: haiku', 'effort: low', '---', '', 'body'].join('\n');
  const out = am.deleteFrontmatterKey(src, 'effort');
  assert.ok(!/^effort:/m.test(out), 'effort キーが残っている');
  assert.ok(/^model: haiku$/m.test(out), '他のキーを巻き込んではならない');
  assert.ok(/body/.test(out), '本文を壊してはならない');
  assert.strictEqual(am.deleteFrontmatterKey('frontmatter なし', 'effort'), null, '推測で書き換えない');
});

test('seat: apply-seat は宣言を settings.json の二つのキーにだけ書く', () => {
  const seatMod = require('../graph/apply-seat.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seat-'));
  const f = path.join(dir, 'settings.json');
  fs.writeFileSync(f, JSON.stringify({ theme: 'dark', hooks: { PreToolUse: [1, 2] }, env: { PATH: 'x' } }));
  const r = seatMod.apply(f);
  assert.ok(r.ok && r.changed, '書かれていない座は書かれねばならない');
  const s = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.strictEqual(s.model, seatMod.pontiffSeat().model);
  assert.strictEqual(s.effortLevel, seatMod.pontiffSeat().effort);
  assert.strictEqual(s.theme, 'dark', '他の設定に触れてはならない');
  assert.deepStrictEqual(s.hooks, { PreToolUse: [1, 2] }, 'hooks を壊してはならない');
  assert.deepStrictEqual(s.env, { PATH: 'x' });
  assert.strictEqual(seatMod.apply(f).changed, false, '二度目は冪等');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('seat: 門は「無統治」を乖離として捕らえる — 今回の欠陥そのもの (第31条)', () => {
  const seatMod = require('../graph/apply-seat.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seat-'));
  const f = path.join(dir, 'settings.json');
  // 実際にこうなっていた: model も effortLevel も無い settings.json
  fs.writeFileSync(f, JSON.stringify({ theme: 'dark' }));
  const d = seatMod.diff(f);
  assert.strictEqual(d.ok, false, '無統治を緑と呼んではならない');
  assert.strictEqual(d.current.model, null);
  assert.strictEqual(d.current.effort, null);
  seatMod.apply(f);
  assert.strictEqual(seatMod.diff(f).ok, true, '書いた後は緑になる');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('seat: settings.json が無い機では検査は黙って通る(狼少年にしない)', () => {
  const seatMod = require('../graph/apply-seat.js');
  const d = seatMod.diff(path.join(os.tmpdir(), 'nope-' + Date.now(), 'settings.json'));
  assert.strictEqual(d.skipped, true);
  assert.strictEqual(d.ok, true, '配備されていないことは、壊れていることではない');
});

test('seat: 無人(cron)の座は教主の座と分かれており Fable ではない (第31条)', () => {
  const seatMod = require('../graph/apply-seat.js');
  const c = require('../graph/clergy.js');
  const u = seatMod.UNATTENDED_SEAT;
  assert.ok(!/fable/i.test(u.model),
    '非対話では課金同意が出ない — 無人の座に Fable を置いてはならない');
  assert.strictEqual(u.model, 'claude-opus-5');
  assert.ok(u.why && u.why.length > 20, 'なぜ分けたのかを機構自身が語らねばならない');
  // 教主が Fable である限り、無人の座は必ず別物でなければならない
  if (/fable/i.test(c.RANKS.pontiff.model)) {
    assert.notStrictEqual(u.model, c.RANKS.pontiff.model, '無人の座が教主の座と同じでは分けた意味がない');
  }
});

test('seat: deploy は教主の座を配備物として数える (第31条)', () => {
  const src = fs.readFileSync(path.join(DIR, '..', 'graph', 'deploy.js'), 'utf8');
  assert.ok(/apply-seat/.test(src), 'deploy が座を運ばなければ、宣言は永久にどこにも書かれない');
  const dep = require('../graph/deploy.js');
  const r = dep.check();
  assert.ok(r.skipped || typeof r.checked === 'number');
});

// --- Gauge: the scale of proof (証明の秤, 第38条) ---
console.log('\nGauge (証明の秤, 第38条):');
const gauge = require(path.join(DIR, '..', 'graph', 'gauge.js'));

/** 合成 run-state を作る補助 — conclave 形式 */
function makeGaugeRun({ reworks = 0, retries = {}, loopGuards = 0, allRatified = true, allDone = true } = {}) {
  const mk = (id, att) => ({ id, status: allDone ? 'done' : 'pending', attempts: att });
  const phases = ['discover', 'specify', 'build', 'verify'].map(id => mk(id, (retries[id] || 0) + 1));
  const history = [{ ts: '2026-08-31T00:00:00.000Z', event: 'convene', detail: '' }];
  for (let i = 0; i < reworks; i++) history.push({ ts: '2026-08-31T00:10:00.000Z', event: 'domain-rework', detail: '' });
  for (let i = 0; i < loopGuards; i++) history.push({ ts: '2026-08-31T00:20:00.000Z', event: 'domain-loop-guard', detail: '' });
  history.push({ ts: '2026-08-31T00:30:00.000Z', event: 'done', detail: '' });
  return {
    meta: { scale: 'standard' },
    domains: [{ cardinal: 'x', status: allRatified ? 'ratified' : 'active', phases }],
    history,
  };
}

test('gauge: 健全な走行は満点 — 一発完走に減点は無い', () => {
  const m = gauge.score(makeGaugeRun());
  assert.strictEqual(m.score, 100);
  assert.strictEqual(m.firstPassRate, 1);
  assert.strictEqual(m.complete, true);
});

test('gauge: 決定性 — 同じ走行には常に同じ点 (LLM に尋ねない)', () => {
  const run = makeGaugeRun({ reworks: 2, retries: { build: 3 } });
  const a = gauge.score(run), b = gauge.score(JSON.parse(JSON.stringify(run)));
  assert.deepStrictEqual(a, b, '秤が揺れるなら、それは秤ではない');
});

test('gauge: 荒れた走行は健全な走行より必ず低い (trajectory の分水嶺)', () => {
  const clean = gauge.score(makeGaugeRun());
  const messy = gauge.score(makeGaugeRun({ reworks: 3, retries: { build: 2, verify: 2 } }));
  assert.ok(messy.score < clean.score, `荒れ ${messy.score} < 健全 ${clean.score} であるべき`);
  assert.strictEqual(messy.reworkCount, 3);
  assert.strictEqual(messy.retryOverhead, 4);
});

test('gauge: loop-guard 発動は差し戻しより重い罪', () => {
  const reworked = gauge.score(makeGaugeRun({ reworks: 1 }));
  const looped = gauge.score(makeGaugeRun({ loopGuards: 1 }));
  assert.ok(looped.score < reworked.score, '暴走は差し戻しより重く裁かれる');
});

test('gauge: 未完走は減点 — 途中で消えた走行は完走と同じ点を得ない', () => {
  const done = gauge.score(makeGaugeRun());
  const abandoned = gauge.score(makeGaugeRun({ allRatified: false, allDone: false }));
  assert.ok(abandoned.score < done.score);
  assert.strictEqual(abandoned.complete, false);
});

test('gauge: 相の無い run-state は拒否 — 不在は通過ではない (第37条)', () => {
  assert.throws(() => gauge.score({}), /no phases|測れない/);
  assert.throws(() => gauge.score({ domains: [], history: [] }), /no phases|測れない/);
});

test('gauge: orchestrator 形式 (phases{}) も読める — 形式でなく性質で裁く (第16条)', () => {
  const m = gauge.score({
    phases: {
      a: { status: 'done', attempts: 1 },
      b: { status: 'done', attempts: 2 },
    },
    history: [{ ts: '2026-08-31T00:00:00.000Z', event: 'init' }],
  });
  assert.strictEqual(m.phasesTotal, 2);
  assert.strictEqual(m.retryOverhead, 1);
});

test('gauge: 実在の run-state を採点できる — coin は habit より健全 (実測の固定)', () => {
  const root = require(path.join(DIR, '..', 'graph', 'workspace.js')).resolve();
  const coinF = path.join(root.root, 'coin', 'conclave.json');
  const habitF = path.join(root.root, 'habit', 'conclave.json');
  if (!fs.existsSync(coinF) || !fs.existsSync(habitF)) return; // 他マシンでは沈黙 (第20条)
  const coin = gauge.score(JSON.parse(fs.readFileSync(coinF, 'utf8')));
  const habit = gauge.score(JSON.parse(fs.readFileSync(habitF, 'utf8')));
  assert.ok(coin.score > habit.score, `coin ${coin.score} > habit ${habit.score} — 差し戻し3回の走行が同点なら秤は嘘`);
});

test('gauge: 台帳は追記型で record→compare が前後を語る', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-gauge-'));
  // workspace の住所を試験用に付け替える(第30条: 住所を知るのは workspace のみ)
  const prevEnv = process.env.PARADISE_CREATIONS;
  process.env.PARADISE_CREATIONS = tmp;
  delete require.cache[require.resolve(path.join(DIR, '..', 'graph', 'workspace.js'))];
  delete require.cache[require.resolve(path.join(DIR, '..', 'graph', 'gauge.js'))];
  try {
    const g2 = require(path.join(DIR, '..', 'graph', 'gauge.js'));
    const before = path.join(tmp, 'before.json'), after = path.join(tmp, 'after.json');
    fs.writeFileSync(before, JSON.stringify(makeGaugeRun({ reworks: 3, retries: { build: 2 } })));
    fs.writeFileSync(after, JSON.stringify(makeGaugeRun()));
    g2.record(before, 'demo-before');
    g2.record(after, 'demo-after');
    const entries = g2.readLedger();
    assert.strictEqual(entries.length, 2, '台帳は2行を刻む');
    const out = g2.compare('demo-before', 'demo-after');
    assert.ok(/score/.test(out) && /改善/.test(out), '前後比較が改善を数で語る');
    assert.throws(() => g2.compare('demo-before', 'ghost'), /no entry|記録なき/, '記録なき前後は比較できない');
  } finally {
    if (prevEnv === undefined) delete process.env.PARADISE_CREATIONS; else process.env.PARADISE_CREATIONS = prevEnv;
    delete require.cache[require.resolve(path.join(DIR, '..', 'graph', 'workspace.js'))];
    delete require.cache[require.resolve(path.join(DIR, '..', 'graph', 'gauge.js'))];
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  }
});

test('verdict: 低い trajectory score は REWORK — 荒れた走行は改善ではない (第38条)', () => {
  const v = verdict.judge({ build: 'pass', tests: { passed: 9, failed: 0, total: 9, coverage: 92 },
    security: { issues: 0, secrets: 0 }, spec: { satisfied: true },
    trajectory: { score: 45, reworkCount: 3, firstPassRate: 0.7, loopGuardTrips: 0 } });
  assert.strictEqual(v.verdict, 'REWORK');
  assert.ok(v.defects.some(d => /trajectory score 45/.test(d)), '低スコアを名指すこと');
});

test('verdict: loop-guard 発動は tests 全通過でも REWORK (第38条)', () => {
  const v = verdict.judge({ build: 'pass', tests: { passed: 9, failed: 0, total: 9, coverage: 92 },
    security: { issues: 0, secrets: 0 }, spec: { satisfied: true },
    trajectory: { score: 85, reworkCount: 0, firstPassRate: 1, loopGuardTrips: 1 } });
  assert.strictEqual(v.verdict, 'REWORK');
  assert.ok(v.defects.some(d => /loop-guard tripped/.test(d)));
});

test('verdict: artifact の道で trajectory 不在は REWORK — 測らなかった走行は改善を主張できない (第38条)', () => {
  const v = verdict.judge({ build: 'pass', tests: { passed: 9, failed: 0, total: 9, coverage: 92 },
    security: { issues: 0, secrets: 0 }, spec: { satisfied: true } });
  assert.strictEqual(v.verdict, 'REWORK');
  assert.ok(v.defects.some(d => /trajectory was never gauged/.test(d)));
});

test('verdict: engine/document の道は trajectory を要求されない — 門は消さず分ける (第36条)', () => {
  const eng = verdict.judge({ produces: 'engine', build: 'pass',
    tests: { passed: 9, failed: 0, total: 9, coverage: 92 }, security: { issues: 0, secrets: 0 } });
  assert.strictEqual(eng.verdict, 'SHIP', 'CI の断罪 (run-state 無し) は塞がない');
  const doc = verdict.judge({ produces: 'document' });
  assert.notStrictEqual(doc.verdict, 'REWORK', '諐問は走行を測られない');
});

test('verdict: 中身の無い trajectory は欠陥 — 名前だけの証拠は証拠でない (第16条)', () => {
  const v = verdict.judge({ build: 'pass', tests: { passed: 9, failed: 0, total: 9, coverage: 92 },
    security: { issues: 0, secrets: 0 }, trajectory: {} });
  assert.strictEqual(v.verdict, 'REWORK');
  assert.ok(v.defects.some(d => /trajectory carries no/.test(d)));
});

test('gauge→verdict 契約: 秤の実出力がそのまま門に通じる — 欄名の縁は写しでなく直結で試す', () => {
  // 手書き fixture でなく、gauge.score() の生の返り値を verdict に渡す。
  // gauge が欄名を変えれば、この試験が最初に切れる。
  const healthy = gauge.score(makeGaugeRun());
  const messy = gauge.score(makeGaugeRun({ reworks: 3, retries: { build: 2, verify: 2 }, loopGuards: 1 }));
  const base = { build: 'pass', tests: { passed: 9, failed: 0, total: 9, coverage: 92 },
    security: { issues: 0, secrets: 0 }, spec: { satisfied: true } };
  assert.strictEqual(verdict.judge({ ...base, trajectory: healthy }).verdict, 'SHIP');
  const bad = verdict.judge({ ...base, trajectory: messy });
  assert.strictEqual(bad.verdict, 'REWORK');
  assert.ok(bad.defects.some(d => /loop-guard tripped/.test(d)), '実出力の loopGuardTrips が門に届くこと');
});

test('gauge: 手つかずの走行は拒否 — 召集だけで一度も発令されていない run に点は付かない (第37条)', () => {
  const run = makeGaugeRun();
  for (const dom of run.domains) for (const p of dom.phases) { p.attempts = 0; p.status = 'pending'; }
  assert.throws(() => gauge.score(run), /never dispatched|手つかず/);
});

// --- Diet gate + creation-law checks (第39条: CLAUDE.md は最初の1画面) ---
console.log('\nDiet gate (第39条):');

test('diet: 現物の CLAUDE.md は予算内で数値を持たない (第39条)', () => {
  const census = require('../graph/census.js');
  const f = census.dietChecks();
  assert.strictEqual(f.length, 0,
    'CLAUDE.md violates the diet: ' + f.map(x => x.label + ' ' + (x.note || '')).join('; '));
  const size = fs.statSync(path.join(__dirname, '..', 'CLAUDE.md')).size;
  assert.ok(size <= census.CLAUDE_MD_BUDGET, `CLAUDE.md ${size} B > budget ${census.CLAUDE_MD_BUDGET} B`);
});

test('diet: 太った CLAUDE.md と数値の再侵入を門が名指しで捕らえる (第21条: 壊して鳴らす)', () => {
  // census.js は ROOT 直下の CLAUDE.md を読む — 一時 dir に census を偽装再配置は
  // できないので、dietChecks のロジックを合成入力で直接検分する。
  const census = require('../graph/census.js');
  // 予算検査: 実装が Buffer.length (bytes) で裁いていることを予算値で確認
  assert.ok(census.CLAUDE_MD_BUDGET >= 2048 && census.CLAUDE_MD_BUDGET <= 8192,
    'budget stays in the one-screen band');
  // 数値再侵入の正規表現が volatile な数を捕らえ、無害な文は捕らえない
  const src = fs.readFileSync(path.join(__dirname, '..', 'graph', 'census.js'), 'utf8');
  const volatileRes = [/自己診断[^\n]*\d+\s*件/, /\*\*\d+\s*tests?\*\*/i, /憲法[:：]?\s*\*?\*?\d+\s*条/];
  const bad = ['自己診断 (210件)', '**210 tests**', '憲法: **38条**'];
  const good = ['自己診断は tests/paradise.test.js', '憲法は CONSTITUTION.md', 'gauge の前後数値で'];
  for (const b of bad) assert.ok(volatileRes.some(re => re.test(b)), `volatile number escapes: ${b}`);
  for (const g of good) assert.ok(!volatileRes.some(re => re.test(g)), `false alarm on: ${g}`);
  assert.ok(/dietChecks/.test(src) && /findings\.push\(\.\.\.dietChecks\(\)\)/.test(src),
    'dietChecks is wired into check() — a gate not wired is decoration');
});

test('critic: 創造物の掟 — toISOString と CDN を名指しで捕らえ、清い創造物は通す (第39条)', () => {
  const bad = makeCreation('# spec\n- AC: works', `
    <html><head><link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet"></head>
    <script>const d = new Date().toISOString();</script></html>`, { fileName: 'index.html' });
  const rBad = critic.review(bad, {});
  const gapIds = rBad.results.filter(x => !x.ok).map(x => x.id);
  assert.ok(gapIds.includes('no-wall-clock-iso'), 'toISOString must be named: ' + gapIds.join(','));
  assert.ok(gapIds.includes('no-external-deps'), 'CDN reference must be named: ' + gapIds.join(','));
  const clean = makeCreation('# spec\n- AC: works',
    '<html><script>/* DOMAIN:START */ const d = localYmd(); /* DOMAIN:END */</script></html>',
    { fileName: 'index.html' });
  const rClean = critic.review(clean, {});
  const cleanFails = rClean.results.filter(x => !x.ok).map(x => x.id);
  assert.ok(!cleanFails.includes('no-wall-clock-iso') && !cleanFails.includes('no-external-deps')
    && !cleanFails.includes('domain-markers-present'),
    'a lawful creation must pass the creation laws: ' + cleanFails.join(','));
});

test('critic: 創造物の掟は engine 自身 (--self) には適用されない — 門は消さず分ける (第36条)', () => {
  // graph/ の engine は toISOString を正当に使う (kg.js の ts など)。
  const r = critic.review(path.join(__dirname, '..', 'graph'), { self: true });
  const ids = r.results.filter(x => !x.ok).map(x => x.id);
  assert.ok(!ids.includes('no-wall-clock-iso'), 'engines may use toISOString — the law is for creations');
  assert.ok(!ids.includes('no-external-deps'), 'the external-deps law is for creations');
});

test('critic: 門は tests/ の下も見る — 規約通りに置いたテストを「無い」と裁かない (第21条)', () => {
  // かつて collect() は readdirSync のトップ階層しか見ず、tests/ に規約通り
  // 置いた 50/50 で緑のテストが門には見えなかった。現物を見ない門は嘘をつく。
  const d = makeCreation('# spec\n- AC-01: works', 'function f(){return 1;}\nmodule.exports=f;');
  fs.mkdirSync(path.join(d, 'tests'));
  fs.writeFileSync(path.join(d, 'tests', 'thing.test.js'),
    'const assert=require("assert");\nassert.ok(1);\nassert.ok(2);\nassert.ok(3);\nconsole.log("passed: 3");\n'
    + '// padding to clear the 400-byte substance floor '.repeat(12));
  const r = critic.review(d, {});
  const failed = r.results.filter(x => !x.ok).map(x => x.id);
  assert.ok(!failed.includes('tests-exist'),
    'a suite under tests/ must be seen: ' + failed.join(','));

  // 壊して鳴らす: サブディレクトリを消せば門は再び鳴る。
  fs.rmSync(path.join(d, 'tests'), { recursive: true, force: true });
  const r2 = critic.review(d, {});
  assert.ok(r2.results.filter(x => !x.ok).map(x => x.id).includes('tests-exist'),
    'with no tests anywhere the gate must fire');
  fs.rmSync(d, { recursive: true, force: true });
});

test('critic: 工程の教訓は成果物の実在で裁く — 単語の出現で裁かない (第21条)', () => {
  const artifactLesson = [{ id: 'require-discovery', label: '調査フェーズを飛ばすな',
    check: 'findings', artifact: 'findings.md', applies: null, kind: 'artifact' }];
  const lf = path.join(os.tmpdir(), 'paradise-lesson-artifact.json');
  fs.writeFileSync(lf, JSON.stringify(artifactLesson));

  // 本文に "findings" という英単語を1度も含まない、実在する調査成果物。
  const d = makeCreation('# spec\n- AC-01: works', 'function f(){return 1;}',
    { findings: '# 市場調査\n'.repeat(4) + '実在の製品を13件調べ、採用度で三層に分けた。\n'.repeat(20) });
  const r = critic.review(d, { lessons: lf });
  const lesson = r.results.find(x => x.id === 'lesson:require-discovery');
  assert.ok(lesson && lesson.ok,
    '39KB の調査を書いた創造物を、本文の単語だけで「調査を飛ばした」と断じてはならない: '
    + (lesson ? lesson.note : 'check missing'));

  // 壊して鳴らす: 成果物を消せば門は鳴る。
  fs.rmSync(path.join(d, 'findings.md'), { force: true });
  const r2 = critic.review(d, { lessons: lf });
  const lesson2 = r2.results.find(x => x.id === 'lesson:require-discovery');
  assert.ok(lesson2 && !lesson2.ok, '調査成果物が無ければ門は鳴らねばならない');
  fs.rmSync(d, { recursive: true, force: true });
  fs.rmSync(lf, { force: true });
});

test('critic: 掟は振る舞いを裁く — 掟を説明したコメントを違反と数えない (第42条)', () => {
  // 天秤は掟通り localStamp() に直し、その理由をコメントに書いた。すると
  // その説明文が toISOString の使用として数えられた。掟を説明した者が
  // 掟破りとして裁かれる門は、正しい行いを罰し、コードから注釈を追い出す。
  const lawful = makeCreation('# spec\n- AC-01: works', `
    <html><script>
    /* 掟「toISOString を使わない」— toISOString() は UTC に変換するため
       JST 09:00 未満の保存が前日の日付として表示されてしまう。 */
    // したがって toISOString() ではなくローカルの年月日を自前で組む。
    /* DOMAIN:START */
    function localStamp(d) { return d.getFullYear() + "-" + (d.getMonth() + 1); }
    /* DOMAIN:END */
    </script></html>`, { fileName: 'index.html' });
  const rOk = critic.review(lawful, {});
  const okFails = rOk.results.filter(x => !x.ok).map(x => x.id);
  assert.ok(!okFails.includes('no-wall-clock-iso'),
    '掟を説明したコメントは違反ではない: ' + okFails.join(','));

  // 壊して鳴らす: 本当に呼べば門は鳴る。コメントを剥いでも実行経路は残る。
  const guilty = makeCreation('# spec\n- AC-01: works', `
    <html><script>
    /* このコメントは無害である */
    const t = new Date().toISOString();
    </script></html>`, { fileName: 'index.html' });
  const rBad = critic.review(guilty, {});
  assert.ok(rBad.results.filter(x => !x.ok).map(x => x.id).includes('no-wall-clock-iso'),
    '実際に toISOString() を呼べば門は鳴らねばならない');

  fs.rmSync(lawful, { recursive: true, force: true });
  fs.rmSync(guilty, { recursive: true, force: true });
});

test('critic: 抽出可能性は綴りでなく実質で裁く — 独自の一対マーカを認める (第42条)', () => {
  // 天秤は DOMAIN:START ではなく TENBIN-CORE-BEGIN/END でコアを囲み、テストが
  // 実際にそこを切り出して 50/50 で回している。目的(抽出可能であること)は
  // 完全に達成されている。名前だけを見て実質を見ない門は、正しく解いた創造物を
  // 咎める。
  const custom = makeCreation('# spec\n- AC-01: works', `
    <html><script id="core">
    /*===MYAPP-CORE-BEGIN===*/
    function pure(x) { return x + 1; }
    const MyCore = Object.freeze({ pure });
    /*===MYAPP-CORE-END===*/
    globalThis.MyCore = MyCore;
    </script></html>`, { fileName: 'index.html' });
  const r = critic.review(custom, {});
  const failed = r.results.filter(x => !x.ok).map(x => x.id);
  assert.ok(!failed.includes('domain-markers-present'),
    '独自の一対マーカでも抽出可能なら認めねばならない: ' + failed.join(','));

  // 壊して鳴らす: 対になっていなければ抽出できず、門は鳴る。
  const unpaired = makeCreation('# spec\n- AC-01: works',
    '<html><script>function pure(x){return x+1;}</script></html>', { fileName: 'index.html' });
  assert.ok(critic.review(unpaired, {}).results
    .filter(x => !x.ok).map(x => x.id).includes('domain-markers-present'),
    'マーカが無ければ門は鳴らねばならない');

  fs.rmSync(custom, { recursive: true, force: true });
  fs.rmSync(unpaired, { recursive: true, force: true });
});

// --- Harness diet gate (第40条: ハーネス全体が秤に乗る) ---
console.log('\nHarness diet gate (第40条):');

test('diet: 現物の global CLAUDE.md と rules は予算内 (第40条)', () => {
  const census = require('../graph/census.js');
  const f = census.harnessDietChecks();
  assert.strictEqual(f.length, 0,
    'the harness violates the diet: ' + f.map(x => x.label + ' ' + (x.note || '')).join('; '));
  const g = fs.statSync(path.join(__dirname, '..', 'overlay', 'root', 'CLAUDE.md')).size;
  assert.ok(g <= census.GLOBAL_CLAUDE_MD_BUDGET,
    `global CLAUDE.md ${g} B > budget ${census.GLOBAL_CLAUDE_MD_BUDGET} B`);
});

test('diet: ファイル種の掟 3本は paths: スコープを持ち、写経の病巣は再発しない (第40条)', () => {
  const rulesDir = path.join(__dirname, '..', 'overlay', 'rules');
  // (1) file-type rules must be path-scoped — they load only when relevant
  for (const f of ['coding-style.md', 'patterns.md', 'testing.md']) {
    const text = fs.readFileSync(path.join(rulesDir, f), 'utf8');
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(m && /^paths:/m.test(m[1]), `${f} must carry a paths: frontmatter scope`);
  }
  // (2) the named diseases stay dead: no phantom-agent table, no model table,
  //     no hooks-config transcription re-entering always-on prose
  const all = fs.readdirSync(rulesDir).filter(f => f.endsWith('.md'))
    .map(f => fs.readFileSync(path.join(rulesDir, f), 'utf8')).join('\n');
  const g = fs.readFileSync(path.join(__dirname, '..', 'overlay', 'root', 'CLAUDE.md'), 'utf8');
  assert.ok(!/build-error-resolver \|/.test(all), 'agent table (photocopy of agents/) must not return');
  assert.ok(!/Haiku 4\.5|Sonnet 4\.5|Opus 4\.5/.test(all), 'model table duplicates 第31条 — apply-models governs models');
  assert.ok(!/## Current Hooks/.test(all), 'hooks config transcription must not return');
  // (3) global CLAUDE.md stays a map, not a procedure: no Step-by-Step git text
  assert.ok(!/gh pr merge --squash/.test(g), 'merge procedure lives in /ship, not in global CLAUDE.md');
  assert.ok(/\/ship/.test(g), 'global CLAUDE.md must point at /ship instead of transcribing it');
});

test('diet: /ship command は手順の全文を引き受けている (第40条)', () => {
  const ship = fs.readFileSync(path.join(__dirname, '..', 'overlay', 'commands', 'ship.md'), 'utf8');
  assert.ok(/^---\r?\n/.test(ship) && /description:/.test(ship), 'ship.md carries frontmatter');
  for (const need of ['git checkout -b', 'gh pr create', 'APPROVED', 'NEEDS CHANGES', 'BLOCKED', 'feat/', 'reform/'])
    assert.ok(ship.includes(need), `/ship must carry the procedure detail: ${need}`);
  const ov = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'overlay', 'overlay.json'), 'utf8'));
  assert.ok(ov.own.commands.includes('ship.md'), 'ship.md must be owned in overlay.json or deploy never carries it');
  for (const r of ['agents', 'coding-style', 'git-workflow', 'hooks', 'patterns', 'performance', 'security', 'testing'])
    assert.ok(ov.replace[`rules/${r}.md`], `rules/${r}.md must be replaced by the paradise version in overlay.json`);
});

test('diet: 太った global CLAUDE.md と無スコープ rules の総量超過を門が名指しで捕らえる (第21条: 壊して鳴らす)', () => {
  const census = require('../graph/census.js');
  // budgets stay in sane bands
  assert.ok(census.GLOBAL_CLAUDE_MD_BUDGET >= 1024 && census.GLOBAL_CLAUDE_MD_BUDGET <= 4096,
    'global budget stays thinner than or equal to the project budget');
  assert.ok(census.ALWAYS_ON_RULES_BUDGET <= 8192, 'always-on rules budget stays bounded');
  // the gate is wired into check() via dietChecks — a gate not wired is decoration
  const src = fs.readFileSync(path.join(__dirname, '..', 'graph', 'census.js'), 'utf8');
  assert.ok(/findings\.push\(\.\.\.harnessDietChecks\(\)\)/.test(src),
    'harnessDietChecks must be wired into dietChecks()');
  // paths-scope detection: frontmatter only — a paths: mention in the body must not count
  const fm = '---\npaths:\n  - "**/*.ts"\n---\n# x';
  const bodyOnly = '# x\n\npaths: are cool';
  const probe = new Function('text', src.match(/function hasPathsScope[\s\S]*?\n}/)[0] + '; return hasPathsScope(text);');
  assert.ok(probe(fm) === true, 'frontmatter paths: must count as scoped');
  assert.ok(probe(bodyOnly) === false, 'a paths: mention in the body must not count as scoped');
});

// --- Lexicon gate (第41条: 名は一つの出所に従う) ---
console.log('\nLexicon gate (第41条):');

test('lexicon: 神が定めた位階と枢機卿団の名がそのまま辞書に住む (第41条)', () => {
  const L = clergy.LEXICON;
  const wantRanks = { god: '神', pontiff: '教主', cardinal: '枢機卿',
                      priest: '神官', believer: '信徒', executor: '執行官' };
  for (const [k, ja] of Object.entries(wantRanks)) {
    assert.ok(L.ranks[k], `rank ${k} must exist in the LEXICON`);
    assert.strictEqual(L.ranks[k].ja, ja, `rank ${k} の正典の名は ${ja}`);
  }
  const wantCollege = { discovery: '調査', requirements: '要件', architecture: '設計',
                        construction: '建造', quality: '品質', counsel: '諐問', tribunal: '断罪機関' };
  for (const [k, ja] of Object.entries(wantCollege)) {
    assert.ok(L.college[k], `college ${k} must exist in the LEXICON`);
    assert.strictEqual(L.college[k].ja, ja, `college ${k} の正典の名は ${ja}`);
  }
  // 枢機卿団の顔ぶれは COLLEGE + TRIBUNAL と一致する — 辞書だけが知る家は無い
  const colleges = new Set([...Object.keys(clergy.COLLEGE), 'tribunal']);
  assert.deepStrictEqual(new Set(Object.keys(L.college)), colleges,
    'the LEXICON names exactly the cardinals that exist — no phantom domain, no unnamed one');
  assert.strictEqual(clergy.title('priest'), 'Priest 神官');
  assert.strictEqual(clergy.title('tribunal'), 'Tribunal 断罪機関');
});

test('lexicon: 現物の散文に異名は住んでいない (第41条)', () => {
  const r = require('child_process').spawnSync(process.execPath,
    [path.join(__dirname, '..', 'graph', 'clergy.js'), 'lexicon-check'],
    { encoding: 'utf8', cwd: path.join(__dirname, '..') });
  assert.strictEqual(r.status, 0, 'the paradise speaks canonical names:\n' + (r.stdout || '') + (r.stderr || ''));
  assert.ok(/異名なし/.test(r.stdout), 'the gate must actually report a clean sweep: ' + r.stdout);
});

test('lexicon: 異名を門が行番号まで名指しで捕らえる (第21条: 壊して鳴らす)', () => {
  const bad = clergy.lexiconCheck([
    { file: 'x.md', text: '第一行\n枢機卿は司祭を発令する\n第三行\n諮問の道' },  // LEXICON-EXEMPT
  ]);
  const priest = bad.find(f => f.found === '司祭');  // LEXICON-EXEMPT
  assert.ok(priest, 'the alias 司祭 must be caught');  // LEXICON-EXEMPT
  assert.strictEqual(priest.line, 2, 'the gate names the exact line — 「どこかに在る」は直せない');
  assert.strictEqual(priest.want, '神官');
  assert.ok(bad.some(f => f.found === '諮問' && f.want === '諐問'), 'counsel alias must be caught');  // LEXICON-EXEMPT
  // 正典の名しか無い散文は鳴らない — 誤報する門は、やがて誰も見ない
  const clean = clergy.lexiconCheck([{ file: 'y.md', text: '教主が枢機卿を通じ神官と信徒を統べ、執行官が断罪する' }]);
  assert.strictEqual(clean.length, 0, 'canonical prose must not raise a false alarm: ' + JSON.stringify(clean));
  // 名前付きの脱出印は効く — 逃げ道の無い門は、いずれ黙って外される
  const exempt = clergy.lexiconCheck([{ file: 'z.md', text: '旧称は司祭であった  <!-- LEXICON-EXEMPT -->' }]);
  assert.strictEqual(exempt.length, 0, 'LEXICON-EXEMPT must let a deliberate mention through');
});

test('lexicon: 門は CI に配線されている — 配線されぬ門は飾りである (第21条)', () => {
  const ci = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'tribunal.yml'), 'utf8');
  assert.ok(/clergy\.js lexicon-check/.test(ci), 'lexicon-check must run in the tribunal workflow');
});

// --- 定期の営みの機構 (第43条) ---
console.log('日次の営み (第43条):');

test('watchdog: 監視スクリプトは正典に住み、配備された実物と一致する (第43条)', () => {
  const canon = path.join(__dirname, '..', 'tools', 'paradise-catchup.py');
  assert.ok(fs.existsSync(canon), '監視スクリプトが版管理下に無い — 版なき機構は静かに腐る');
  const src = fs.readFileSync(canon, 'utf8');

  // 機構の要点を現物で裁く (第42条: 門は現物を見る)
  assert.ok(/"claim"/.test(src), 'due ではなく claim を使うこと — 権利を取らねば二重発火する');
  assert.ok(/release\(\)/.test(src), '発火に失敗したらリースを返すこと — さもなくば当日のノルマが塞がる');
  assert.ok(/FAILURE_MARKERS/.test(src), 'hermes cron run は失敗しても exit 0 を返す — 出力の実物で裁くこと');

  // 配備先があるなら、正典と同じ中身であること (第29条: 派生は真実の写し)
  // 改行コードは git の autocrlf が勝手に変える — 門は綴りでなく実質を裁く (第42条)。
  const deployed = path.join(os.homedir(), 'AppData', 'Local', 'hermes', 'scripts', 'paradise-catchup.py');
  if (fs.existsSync(deployed)) {
    const norm = (s) => s.split(String.fromCharCode(13)).join('');
    assert.strictEqual(norm(fs.readFileSync(deployed, 'utf8')), norm(src),
      '配備された監視スクリプトが正典と食い違っている — どちらが真実か誰も知らなくなる');
  }
});

test('tools: 呼ぶ者の居ない道具は住み続けない (第44条)', () => {
  // 神の指摘で発覚: tools/ に、誰も呼ばず・cron も持たず・後継に取って代わられた
  // 道具が2本住み続けていた。しかも1本は ~/.claude/settings.json を手編集する
  // 代物で、第19条(b)「配備は産物であり手編集しない」に真正面から反していた。
  // 死んだ道具は無害ではない — 教主がそれを「先例」と読み、腐敗を模倣する。
  const toolsDir = path.join(__dirname, '..', 'tools');
  const repoRoot = path.join(__dirname, '..');

  // 楽園の散文・機構・配備定義の全文を一度だけ集める (第42条: 現物を見る)
  const haystack = [];
  const walk = (dir, depth) => {
    if (depth > 3) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.git', 'tools'].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (/\.(js|md|json|yml|yaml|py)$/.test(e.name)) {
        try { haystack.push(fs.readFileSync(p, 'utf8')); } catch {}
      }
    }
  };
  walk(repoRoot, 0);
  const all = haystack.join('\n');

  const orphans = [];
  for (const f of fs.readdirSync(toolsDir)) {
    if (!/\.(js|py)$/.test(f)) continue;
    if (!all.includes(f)) orphans.push(f);
  }
  assert.deepStrictEqual(orphans, [],
    '楽園の何処からも名を呼ばれぬ道具が tools/ に住んでいる — ' +
    '生きているなら誰かが呼び、死んでいるなら退治せよ: ' + orphans.join(', '));
});

test('tools: 配備は産物であり、手編集する道具を飼わない (第19条b / 第44条)', () => {
  const toolsDir = path.join(__dirname, '..', 'tools');
  const offenders = [];
  for (const f of fs.readdirSync(toolsDir)) {
    if (!/\.js$/.test(f)) continue;
    const src = fs.readFileSync(path.join(toolsDir, f), 'utf8');
    // settings.json を writeFileSync する道具は、apply-* 以外に存在してはならない。
    // wire-paradise-hooks.js は配列へ並べて足す現役の機構であり、名指しで許す。
    if (/settings\.json/.test(src) && /writeFileSync/.test(src) && f !== 'wire-paradise-hooks.js') {
      offenders.push(f);
    }
  }
  assert.deepStrictEqual(offenders, [],
    '~/.claude を手編集する道具が住んでいる — 配備は overlay/ から建て直す産物である: ' + offenders.join(', '));
});

// --- 定期の営みは道を歩く (第46条) ---
console.log('日次の営みは道を歩く (第46条):');

const DAILY_JOB_PROMPT_MARKERS = ['conclave.md', 'claim', 'daily-guard'];

test('conclave: 道は reform の住所を知っている (第23条 / 第30条)', () => {
  const road = fs.readFileSync(path.join(__dirname, '..', 'overlay', 'commands', 'conclave.md'), 'utf8');
  // 楽園自身の改修は創造物ではない。道がその違いを語らなければ、
  // 歩く者は workspace.js init を呼び、楽園の外へ engine を置こうとする。
  assert.ok(/reform/.test(road), '道が reform の存在を知らない — 楽園自身を直す者は迷う');
  assert.ok(/reform\/<slug>/.test(road), 'reform の成果物の住所が道に書かれていない (第23条)');
  assert.ok(/workspace\.js init/.test(road), '創造の道の住所も残っていること (第30条)');
  // 教主は自らを承認しない — reform は PR で神の御手へ渡る
  assert.ok(/gh pr create/.test(road), 'reform の終いに PR が無い — 誰が神へ渡すのか (第23条)');
  assert.ok(/マージは神のみ|マージは神の/.test(road), '三権分立の一文が道から消えている');
});

test('conclave: 配備された道は正典と一致する (第29条)', () => {
  const canon = fs.readFileSync(path.join(__dirname, '..', 'overlay', 'commands', 'conclave.md'), 'utf8');
  const deployed = path.join(os.homedir(), '.claude', 'commands', 'conclave.md');
  if (!fs.existsSync(deployed)) return;      // 未配備なら問わない
  const norm = (t) => t.split(String.fromCharCode(13)).join('');
  assert.strictEqual(norm(fs.readFileSync(deployed, 'utf8')), norm(canon),
    '配備された /conclave が正典と食い違っている — 歩く者は古い道を歩く (deploy.js を走らせよ)');
});

test('conclave: 道は執行官が裁く宛先を知っている (第37条)', () => {
  // 実測された欠陥: PR #28 を土台ブランチ宛に出したところ、執行官は起動せず
  // `no checks reported` のまま静かに神の前に出た。裁かれていないものが
  // 裁かれた顔をしていた。CI の発火条件は道が知っていなければならない。
  const road = fs.readFileSync(path.join(__dirname, '..', 'overlay', 'commands', 'conclave.md'), 'utf8');
  const ci = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'tribunal.yml'), 'utf8');

  // CI が本当に main 宛だけを裁いているか、現物で確かめる (第42条)。
  // 最初この門は `on:` 全体から branches:[main] を1つ見つけて満足していた —
  // だが push と pull_request の 二箇所に在るため、pull_request 側を
  // develop に壊しても push 側が門を黙らせた。**壊しても鳴らぬ門であった。**
  // 節を名指しで切り出して裁く: どこかに在ることは、そこに在ることではない。
  const onBlock = ci.slice(ci.indexOf('on:'), ci.indexOf('jobs:'));
  const prIdx = onBlock.indexOf('pull_request:');
  assert.ok(prIdx >= 0, '執行官が pull_request で起動しない');
  const after = onBlock.slice(prIdx + 'pull_request:'.length);
  // 次のトップレベル項目 (2スペース字下げ) の手前までが pull_request の節
  const NL = String.fromCharCode(10);
  const nextKey = after.search(new RegExp(NL + '  [a-z_]+:'));
  const prBlock = nextKey >= 0 ? after.slice(0, nextKey) : after;
  assert.ok(/branches:\s*\[\s*main\s*\]/.test(prBlock),
    'pull_request の宛先が main でない — 別ブランチ宛のPRは門を素通りする: ' + JSON.stringify(prBlock));

  // 道がその制約を語っていること
  assert.ok(/--base main/.test(road), '道が --base main を命じていない');
  assert.ok(/no checks reported/.test(road),
    '別ブランチ宛のPRが門を素通りする事実が道に書かれていない (第37条)');
  assert.ok(/--body-file/.test(road),
    '長い本文を --body に流し込めば入口で弾かれる — 道が --body-file を教えていない');
});

test('cron: 日次の発火は道を写経せず、道を指す (第46条)', () => {
  // 実測された病: 日次 cron が /conclave の 67 行の劣化コピーを抱え、
  // synod / convene / ratify / tribunal / delegate のいずれも持たなかった。
  // 写経は本物から遅れて腐り、劣化した影が本物の顔で走る。
  const jobs = path.join(os.homedir(), 'AppData', 'Local', 'hermes', 'cron', 'jobs.json');
  if (!fs.existsSync(jobs)) return;          // ハーネス不在の環境では問わない

  const raw = JSON.parse(fs.readFileSync(jobs, 'utf8'));
  const list = Array.isArray(raw) ? raw : (raw.jobs || Object.values(raw));
  const prompts = list.filter(j => j && typeof j.prompt === 'string');
  if (!prompts.length) return;               // ジョブ未登録なら問わない

  // 日次改善のジョブは daily-guard を握る者として名指しで探す。
  // 見つからないことを「通過」にしてはならない — 不在は通過ではない (第37条)。
  // かつて、探索条件が壊れた版に当たらず門が無言で緑を返した (己の門もまた飾りでありうる)。
  const daily = prompts.filter(j => /daily-guard/.test(j.prompt));
  assert.ok(daily.length > 0,
    'daily-guard を握る日次ジョブが cron 台帳に居ない — ' +
    'ノルマの機構は建てたのに、それを発火する者が消えている (第37条)');

  for (const j of daily) {
    const p = j.prompt;
    // (a) 道を名指しで指すこと
    assert.ok(/conclave\.md/.test(p),
      '日次の発火が /conclave を指していない — 道が在るのに呼ばれぬなら、それは眠っている (第23条): ' +
      (j.name || j.id || '(無名)'));
    // (b) 道の中身を写経しないこと: 環の運転手順は道が持つ
    const copied = ['conclave.js convene', 'conclave.js next', 'conclave.js ratify']
      .filter(sig => p.includes(sig));
    assert.deepStrictEqual(copied, [],
      '日次の発火が道の運転手順を写経している — 写経は本物から遅れて腐る: ' + copied.join(', '));
  }
});

// ══════════════════════════════════════════════════════════════════════
// ATLAS — 楽園が己の姿を図にできるか (第47条)
// ══════════════════════════════════════════════════════════════════════
console.log('\nAtlas (自画像):');
const atlas = require(path.join(DIR, '..', 'graph', 'atlas.js'));

test('atlas: 描画器が取り込まれ、電話をかけずに動く (第20条)', () => {
  assert.ok(fs.existsSync(atlas.ARCHIFY), '描画器が取り込まれていない: ' + atlas.ARCHIFY);
  const vroot = path.dirname(path.dirname(atlas.ARCHIFY));
  // 上流の更新チェッカーは取り込み時に削いである。残っていれば供給線である。
  for (const phone of ['scripts/check-update.mjs', 'scripts/update-contract.mjs'])
    assert.ok(!fs.existsSync(path.join(vroot, phone)),
      `取り込んだ写しが上流へ電話をかける: ${phone} — vendored 資産は供給線であってはならない (第20条)`);
  const out = execFileSync(process.execPath, [atlas.ARCHIFY, 'doctor'], {
    cwd: vroot, encoding: 'utf8', env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1' },
  });
  assert.ok(/Archify is ready/.test(out), '描画器が己を健全と言わない:\n' + out);
});

test('atlas: 事実を写経せず、位階の engine から読む (第29条)', () => {
  const clergy = require(path.join(DIR, '..', 'graph', 'clergy.js'));
  const ir = atlas.buildIr('hierarchy');
  const labels = ir.components.map(c => c.label);
  // 枢機卿の数が clergy と食い違えば、それは atlas が数を写経した証拠である
  for (const name of Object.keys(clergy.COLLEGE))
    assert.ok(labels.includes(clergy.LEXICON.college[name].ja),
      `枢機卿 ${name} が位階図に居ない — clergy を読まず写経している疑い`);
  const src = fs.readFileSync(path.join(DIR, '..', 'graph', 'atlas.js'), 'utf8');
  assert.ok(!/6\s*名の枢機卿|5\s*名の枢機卿/.test(src),
    'atlas.js が枢機卿の数を散文に焼き付けている — 数は census と engine が語る (第22条)');
});

test('atlas: 5つの主題すべてに IR が在り、種別が宣言と一致する', () => {
  for (const [subject, spec] of Object.entries(atlas.SUBJECTS)) {
    const ir = atlas.buildIr(subject);
    assert.strictEqual(ir.diagram_type, spec.type,
      `${subject} の種別が宣言と違う: ${ir.diagram_type} != ${spec.type}`);
    assert.ok(ir.meta && ir.meta.title, `${subject} に題が無い`);
  }
});

test('atlas: 同じ入力は同じ図を生む — 乱択は決定的である (第29条)', () => {
  const a = JSON.stringify(atlas.buildIr('dag', { scale: 'full' }));
  const b = JSON.stringify(atlas.buildIr('dag', { scale: 'full' }));
  assert.strictEqual(a, b, '同じ道から二つの違う図が出た — 揺れる図は真実の写しではない');
});

test('atlas: 全ての道が図になる — 描画器が実際に受理する (第47条)', () => {
  // 実物を描かせる。IR が作れることと、描画器が受理することは別である。
  const outdir = path.join(os.tmpdir(), 'paradise-test-atlas');
  for (const scale of ['quick', 'standard', 'full', 'reform', 'counsel']) {
    const res = atlas.check({ scale, outdir });
    const bad = res.rows.filter(r => !r.ok);
    assert.deepStrictEqual(bad.map(r => `${scale}/${r.subject}: ${r.error || r.checks}`), [],
      `${scale} の道で図が壊れた`);
  }
  fs.rmSync(outdir, { recursive: true, force: true });
});

test('atlas: 交差を隠さない — 平面化不能なら standard を名乗り理由を書く (第47条)', () => {
  // full の道は建造2相が品質3相すべてに掛かるので、層化しても交差が残る。
  // それを showcase と偽れば、図は「綺麗だが嘘」になる。
  const ir = atlas.buildIr('dag', { scale: 'full' });
  assert.ok(ir.__minCrossings > 0,
    'full の道が平面的だと主張している — 実測では交差が残るはずである');
  assert.strictEqual(ir.meta.quality_profile, 'standard',
    '平面化不能なのに showcase を名乗っている — 交差を隠している');
  assert.ok(ir.cards.some(c => /消せない交差/.test(c.title)),
    '交差が残る理由が図に書かれていない — 読み手は汚れを欠陥と誤解する');
  // 逆も裁く: 平面的な道が理由なく格下げされていないこと
  const clean = atlas.buildIr('dag', { scale: 'quick' });
  assert.strictEqual(clean.meta.quality_profile, 'showcase',
    '平面的な道が理由なく standard を名乗っている — 格下げは測ってから');
});

test('atlas: 門は己の残骸で落ちない — 同じ作業場で二度走る (第21条)', () => {
  // 実測: visual-check が図の隣に撒く PNG/JSON が残ったまま同じ outdir で
  // 描き直すと、描画器が output/input-alias で鳴いた。図は何も壊れていないのに
  // 門が落ちる — 二度目から不定に赤くなる門は、門ではなく罠である。
  const outdir = path.join(os.tmpdir(), 'paradise-test-atlas-twice');
  fs.rmSync(outdir, { recursive: true, force: true });
  for (const pass of [1, 2]) {
    const res = atlas.check({ scale: 'quick', outdir });
    assert.deepStrictEqual(res.rows.filter(r => !r.ok).map(r => `${r.subject}: ${r.error || r.checks}`), [],
      `${pass} 回目の走行で門が落ちた — 残骸が次の走行を汚している`);
  }
  fs.rmSync(outdir, { recursive: true, force: true });
});

test('atlas: 自画像は生成物であり追跡されない (第29条)', () => {
  const ign = fs.readFileSync(path.join(DIR, '..', '.gitignore'), 'utf8');
  assert.ok(/dashboard\/atlas\//.test(ign),
    '自画像が git 追跡下に置かれている — 700KBのHTMLは engine の履歴を埋め、並行PRで必ず衝突する');
});


test('atlas: 巻物の許しは長さにだけ効く — 読めない字は免除しない (第48条e)', () => {
  // `scroll: true` は「第一画面に収まらない」ことだけを免じる宣言である。
  // かつてこの免除は読みやすさの不合格まで通していた: 溢れ 0px なのに副題が
  // 5.57px に潰れた図が緑を出した。門の免除は、免じる対象を名指ししなければ穴になる。
  const src = fs.readFileSync(path.join(DIR, '..', 'graph', 'atlas.js'), 'utf8');
  assert.ok(/projected-text-readability/.test(src),
    'atlas が実ブラウザの「字が読めない」診断を見ていない — 巻物と名乗れば何でも通る');
  assert.ok(/scroll === true && !\w+\.unreadable/.test(src),
    '巻物の免除が読みやすさまで免除している (第48条e)');
});

test('atlas: 全ての主題が動きを名乗る — 黙秘は静止画への同意である (第50条a)', () => {
  // 神が「signal が動かない・play story が非活性」と告げたとき、静的検査は
  // 6主題すべて 9/9 の緑だった。壊れていたのは図ではなく、名乗りの不在である。
  // 版元の正典: "Omit it … for the default static output" (archify/schemas/README.md)
  for (const subject of Object.keys(atlas.SUBJECTS)) {
    const ir = atlas.buildIr(subject);
    assert.strictEqual(ir.meta.animation, 'trace',
      subject + ' が meta.animation を名乗っていない — 描画器は仕様どおり静止画を作り、' +
      'Live も Signal Flow も Play story も眠る (第50条a)');
  }
});

test('atlas: 静止を選んだ走行は、黙るのではなく断る (第50条a)', () => {
  // 版元の enum は 'trace' | 'none' の二値。名乗らないことと 'none' は同じ結果を
  // 生むが、意図の記録としては別物である。
  const ir = atlas.buildIr('hierarchy', { static: true });
  assert.strictEqual(ir.meta.animation, 'none',
    '--static が meta.animation を落としている — 静止の選択は記録として残さねばならない');
});

test('atlas: 動きの検器が実在し、門がそれを見ている (第50条c)', () => {
  const probe = path.join(DIR, '..', 'graph', 'motion-probe.mjs');
  assert.ok(fs.existsSync(probe), '動きの検器が無い — 門は動きについて何も測れない (第50条c)');
  const psrc = fs.readFileSync(probe, 'utf8');
  // 「押せる」は「動く」ではない。押して、待って、進みを測ることを要求する。
  assert.ok(/beatAdvanced/.test(psrc),
    '検器が章の進みを測っていない — 釦の活性は再生の証拠ではない (第50条c)');
  // 測る側の環境設定で健全な図を落とさない。headless の既定は reduce である。
  assert.ok(/prefers-reduced-motion/.test(psrc) && /no-preference/.test(psrc),
    '検器が reduced-motion を降ろしていない — 測る側の環境が嘘の赤を出す (第50条b)');

  const src = fs.readFileSync(path.join(DIR, '..', 'graph', 'atlas.js'), 'utf8');
  assert.ok(/motionAlive/.test(src) && /mo\.ok/.test(src),
    'atlas の門が動きを裁定に加えていない — 門が見ない機能は壊れても鳴らない (第50条)');
});

test('atlas: 版元の既定値を記憶ではなく正典から引く (第50条d)', () => {
  // 借りた道具の作法は、借りた道具の正典が決める。取り込んだ写しの中に
  // 根拠が在ることを確かめる — 上流が変われば、ここが最初に食い違う。
  const readme = path.join(DIR, '..', 'overlay', 'vendor', 'archify', 'schemas', 'common.schema.json');
  const common = JSON.parse(fs.readFileSync(readme, 'utf8'));
  const anim = common.$defs && common.$defs.animation;
  assert.ok(anim && Array.isArray(anim.enum), '版元の animation 定義が読めない');
  assert.deepStrictEqual(anim.enum.slice().sort(), ['none', 'trace'],
    '版元の animation enum が変わっている — atlas の名乗りを正典に合わせ直せ (第50条d)');
});

// ══════════════════════════════════════════════════════════════════════
// WIRING — 機構の結線 (第44条 / 第48条)
// ══════════════════════════════════════════════════════════════════════
console.log('\n結線 (第48条):');
const wiring = require(path.join(DIR, '..', 'graph', 'wiring.js'));

test('wiring: engine の一覧を写経せず、ディスクを走査する (第29条)', () => {
  const onDisk = fs.readdirSync(path.join(DIR, '..', 'graph'))
    .filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)).sort();
  const measured = wiring.map().engines.map(e => e.id).sort();
  assert.deepStrictEqual(measured, onDisk,
    'wiring が語る engine の一覧が実ディスクと食い違う — 数を写経した証拠である (第22条)');
});

test('wiring: 楽園の結線に孤児も宙吊りも無い (第44条 / 第48条)', () => {
  const r = wiring.check();
  assert.deepStrictEqual(r.orphans, [],
    '誰も require せず、どの面も名を呼ばない engine が住んでいる — ' +
    '生きているなら呼ぶ者を作り、死んでいるなら退治せよ: ' + r.orphans.join(', '));
  assert.deepStrictEqual(r.dangling.map(d => `${d.file} -> graph/${d.name}.js`), [],
    '存在しない engine の名を呼ぶ参照がある (第21条)');
});

test('wiring: 自分で自分を呼んでも呼ばれたことにならない (第48条c)', () => {
  // どの engine も冒頭に自分の使い方を書く。それを呼び手に数えれば孤児は
  // 永久にゼロになり、門は常に緑を出す。常に緑の門は門ではない (第21条)。
  const gdir = path.join(DIR, '..', 'graph');
  const selfOnly = wiring.map().engines.filter(e =>
    !e.requires.length && !e.requiredBy.length &&
    e.callers.length === 1 && e.callers[0] === 'engine');
  for (const e of selfOnly) {
    const esc = e.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const others = fs.readdirSync(gdir)
      .filter(f => f.endsWith('.js') && f !== e.id + '.js')
      .filter(f => new RegExp('graph[/\\\\]' + esc + '\\.js')
        .test(fs.readFileSync(path.join(gdir, f), 'utf8')));
    assert.ok(others.length > 0,
      `${e.id} が自分の註釈だけで孤児を免れている — 門が己を欺いている (第48条c)`);
  }
});

test('wiring: 呼び方の綴りで裁かない — path 結合も「呼んだ」である (第48条b)', () => {
  // 実測: 30分ごとに engine を起動する現役の器物は、斜線を一つも書かずに
  // path を組み立てていた。綴りしか見ない門は、生きた engine を殺す。
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wiring-'));
  const f = path.join(tmp, 'caller.py');
  fs.writeFileSync(f, 'GUARD = os.path.join(PARADISE, "graph", "daily-guard.js")\n');
  const before = wiring.map().engines.find(e => e.id === 'daily-guard');
  assert.ok(before && before.callers.length > 0,
    'path 結合で呼ばれた engine を wiring が見落とす — 孤児の誤審は見逃しより悪い (第48条b)');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('wiring: 結線の図は engine から生まれ、写経しない (第29条 / 第47条)', () => {
  const ir = atlas.buildIr('wiring');
  const m = wiring.map();
  const drawn = new Set(ir.components.map(c => c.label));
  for (const e of m.engines) {
    assert.ok(drawn.has(e.id),
      `結線の図が engine「${e.id}」を落としている — 図は真実の写しでなければならない`);
  }
  assert.strictEqual(ir.components.length, m.engines.length,
    '図の箱の数が実測の engine 数と食い違う');
});


// ══════════════════════════════════════════════════════════════════════
// CARTOGRAPHY — 作図の道 (第47条 / 第48条 / 第49条)
// ══════════════════════════════════════════════════════════════════════
console.log('\n作図の道 (第49条):');
const checkAgents = require(path.join(DIR, '..', 'graph', 'check-agents.js'));

test('cartography: 「図にせよ」は作図の道へ着く — reform に攫われない (第49条)', () => {
  // 実測された誤着: 「オーケストレーションの相関図」は REFORM_RE に当たり
  // engine 改修の道(11相)へ送られ、「位階の図を描いて」は standard(14相)へ落ちて
  // **存在しない実装物に向かって build/security を走らせていた**。
  const cases = [
    ['オーケストレーションの相関図、関連図を作成し連携してほしい', 'cartography'],
    ['位階の図を描いてほしい', 'cartography'],
    ['creations のデータフローを可視化して', 'cartography'],
    ['draw a sequence diagram of the dispatch chain', 'cartography'],
  ];
  for (const [wish, want] of cases) {
    assert.strictEqual(forge.chooseScale(wish), want, `「${wish}」が ${want} へ行かない`);
  }
});

test('cartography: 「図」の一字に紛れる語を攫わない (第49条)', () => {
  // 意図/地図/構図…。素朴な一字判定なら「意図を汲んで実装せよ」が作図へ落ちる。
  // 門が狼少年になれば、正しい道が信用されなくなる(第21条)。
  assert.notStrictEqual(forge.chooseScale('意図を汲んでタイマーを実装してほしい'), 'cartography');
  assert.notStrictEqual(forge.chooseScale('地図アプリが欲しい'), 'cartography');
  // 逆に、既存の道は奪われていない
  assert.strictEqual(forge.chooseScale('楽園の憲法に条を足せ'), 'reform');
  assert.strictEqual(forge.chooseScale('バグを直して'), 'quick');
  assert.strictEqual(forge.chooseScale('エンジンを監査してほしい'), 'counsel');
});

test('cartography: 道は実装物でなく図を産むと宣言する (第36条)', () => {
  const dag = forge.buildDag('位階の図', 'cartography');
  assert.strictEqual(dag.meta.produces, 'diagram',
    '作図の道が artifact を名乗れば、verdict が「build が語られていない」と永久に REWORK を出す');
  for (const forbidden of ['build', 'build-ui', 'security']) {
    assert.ok(!dag.tasks.some(t => t.id === forbidden),
      `作図の道に ${forbidden} 相がある — 図は実装物ではない`);
  }
  // 図の道に固有の門が在ること
  for (const need of ['chart-measure', 'behold', 'prove']) {
    assert.ok(dag.tasks.some(t => t.id === need && t.gate),
      `作図の道に門 ${need} が無い — 測らず見ない図は証明されていない`);
  }
});

test('cartography: 図の断罪は測ったかで立ち、壊せば鳴る (第47条 / 第48条e)', () => {
  const j = (r) => verdict.judge(r).verdict;
  // 描いたと言うだけ = 証拠なし
  assert.strictEqual(j({ produces: 'diagram' }), 'BLOCK',
    '図の証拠が無いレポートが通っている — 断罪の門が素通しなら上の全ての門が無意味になる');
  // 静的検査だけでは足りない: 実ブラウザを見ていない
  assert.strictEqual(j({ produces: 'diagram', diagram: { checksPassed: 9, checkCount: 9 } }), 'REWORK',
    '実ブラウザで測っていない図が通っている (第48条e)');
  // 実ブラウザで落ちている
  assert.strictEqual(j({ produces: 'diagram', diagram: { checksPassed: 9, checkCount: 9, browser: false } }), 'REWORK');
  // 事実を写経した図は違憲
  assert.strictEqual(j({ produces: 'diagram', spec: { satisfied: true },
    diagram: { checksPassed: 9, checkCount: 9, browser: true, derivedFromEngine: false } }), 'BLOCK',
    '事実を写経した図が通っている (第29条)');
  // 全て揃えば SHIP
  assert.strictEqual(j({ produces: 'diagram', spec: { satisfied: true },
    diagram: { checksPassed: 9, checkCount: 9, browser: true, derivedFromEngine: true } }), 'SHIP');
});

test('cartography: 作図の全相に主が居て、発令が宣言通りに届く (第25条)', () => {
  const dag = forge.buildDag('probe', 'cartography');
  for (const t of dag.tasks) {
    const card = clergy.cardinalFor(t.id);
    assert.ok(card, `相 ${t.id} に統べる者が居ない — 無主の相は誰も審査しない`);
    if (card === 'tribunal' || t.agent === 'verification-loop') continue;
    const plan = clergy.marshalPlan(t.id, { priestCanSpawn: true });
    assert.strictEqual(plan.priest, t.agent,
      `相 ${t.id} は ${t.agent} と宣言されているのに ${plan.priest} へ発令される`);
  }
});

test('発令の宛先ずれを門が全ての道で捕らえる (第25条)', () => {
  // 作図の道を作る過程で、既存の道に5件の食い違いが露見した。最も重いのは
  // security — security-reviewer と宣言されながら code-reviewer へ発令され、
  // 第31条の格上げ(opus/xhigh)が一度も効いていなかった。
  const mis = checkAgents.misroutedPhases();
  assert.deepStrictEqual(mis.map(m => `${m.scale}/${m.phase}: 宣言 ${m.declared} → 発令 ${m.dispatched}`), [],
    '宣言された神官と発令先が食い違う相がある — 名は在り主も居て、しかし宛先が違う');
});

test('cartography: 環が最後まで回り、作図の結びに着く (第11条)', () => {
  // 道が在ることと歩けることは別である。全ドメインを批准まで進めて確かめる。
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'carto-'));
  const dagPath = path.join(tmp, 'f.json'), runPath = path.join(tmp, 'c.json');
  const art = path.join(tmp, 'a.md');
  fs.writeFileSync(art, 'x'.repeat(200));
  fs.writeFileSync(dagPath, JSON.stringify(forge.buildDag('位階の図', 'cartography')));
  const conclaveMod = require(path.join(DIR, '..', 'graph', 'conclave.js'));
  let run = conclaveMod.convene(dagPath);
  let last = null;
  for (let i = 0; i < 200; i++) {
    const r = conclaveMod.next(run);
    last = r.phase;
    if (r.phase === 'complete') break;
    if (r.phase === 'ratify') { conclaveMod.ratify(run, r.cardinal); continue; }
    if (r.phase === 'blocked') break;
    // `next` は発令書を返すだけで、相を running にするのは呼び手の責務である
    // (CLI がそうしている)。engine を直に使う側も同じ契約に従う。
    if (r.phase === 'wave' && r.dispatch) conclaveMod.markRunning(run, r.dispatch.map(d => d.id));
    const running = [];
    for (const d of run.domains) for (const p of d.phases) if (p.status === 'running') running.push(p.id);
    if (!running.length) break;
    for (const id of running) conclaveMod.markDone(run, id, art);
  }
  assert.strictEqual(last, 'complete', `作図の環が complete に着かない (最後の相: ${last})`);
  const msg = conclaveMod.next(run).message;
  assert.ok(/図/.test(msg),
    '作図の道が「creation complete」と言っている — 図は実装物ではない (第36条)');
  fs.rmSync(tmp, { recursive: true, force: true });
});

// --- report ---
console.log(`\nParadise self-test: ${pass} passed, ${fail} failed`);
try { fs.rmSync(kgRoot, { recursive: true, force: true }); } catch {}
try { fs.rmSync(ccRoot, { recursive: true, force: true }); } catch {}
process.exit(fail === 0 ? 0 : 1);
