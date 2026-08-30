#!/usr/bin/env node
/**
 * PARADISE :: Orchestrator — the Supervisor with an explicit state machine
 * ---------------------------------------------------------------------
 * The paradise's conductor. It owns the RUN STATE so the routing logic no
 * longer lives in a prompt with no memory of what it tried. Given a DAG and
 * a persisted run, it computes the next dispatchable wave, produces a
 * dispatch spec (which agent, what context handed off from upstream), records
 * results, and drives the REWORK loop with a loop-guard.
 *
 * Synthesized from the 2025-26 orchestration wisdom:
 *   - Supervisor/Worker (Anthropic Research, LangGraph) : one conductor holds
 *     state, workers are stateless & focused
 *   - Explicit State Machine (the #1 failure is routing-in-a-prompt with no
 *     memory) : run state is durable JSON on disk, resumable
 *   - Loop Guard / Deadlock detection : REWORK is bounded by maxAttempts
 *   - Context Handoff : each phase receives ONLY its deps' artifacts, compressed
 *   - Single-Writer : within a wave, parallel workers add intelligence; the
 *     orchestrator is the sole writer of run state
 *
 * Run-state model (persisted to <run>.run.json):
 *   { dag, phases: { id: { status, attempts, artifact?, note? } }, history: [] }
 *   status ∈ pending | ready | running | done | rework | blocked | failed
 *
 * Usage:
 *   orchestrator.js init  <dag.json> --run <run.json>       # create a run
 *   orchestrator.js next  --run <run.json>                  # print next wave dispatch spec (JSON)
 *   orchestrator.js done  <phaseId> --run <run.json> [--artifact path] [--note ...]
 *   orchestrator.js verdict <SHIP|REWORK|BLOCK> --run <run.json> [--from phaseId]
 *   orchestrator.js status --run <run.json>                 # human-readable board
 */
'use strict';
const fs = require('fs');
const path = require('path');
const engine = require('./graph-engine.js');

const MAX_ATTEMPTS = 3; // loop-guard: a phase may be reworked this many times

function loadRun(runPath) { return JSON.parse(fs.readFileSync(runPath, 'utf8')); }
function saveRun(runPath, run) { fs.writeFileSync(runPath, JSON.stringify(run, null, 2)); }
function now() { return new Date().toISOString(); }

/** Build a fresh run from a DAG file. */
function init(dagPath) {
  const dag = engine.loadDag(dagPath);
  const v = engine.validate(dag);
  if (!v.ok) throw new Error('Invalid DAG: ' + v.errors.join('; '));
  const phases = {};
  for (const t of dag.tasks) phases[t.id] = { status: 'pending', attempts: 0 };
  return {
    meta: dag.meta || {},
    tasks: dag.tasks.map(t => ({ id: t.id, agent: t.agent, goal: t.goal, deps: t.deps || [], gate: !!t.gate, artifact: t.artifact })),
    phases,
    history: [{ ts: now(), event: 'init', detail: `${dag.tasks.length} phases` }],
  };
}

function byId(run) { const m = new Map(); for (const t of run.tasks) m.set(t.id, t); return m; }

/** A phase is dispatchable when it's pending/rework AND all deps are done. */
function computeReady(run) {
  const ready = [];
  for (const t of run.tasks) {
    const st = run.phases[t.id].status;
    if (st !== 'pending' && st !== 'rework') continue;
    const depsDone = t.deps.every(d => run.phases[d] && run.phases[d].status === 'done');
    if (depsDone) ready.push(t.id);
  }
  return ready.sort();
}

/** The next wave = all currently-ready phases (they run in parallel). */
function nextWave(run) {
  const ids = computeReady(run);
  const map = byId(run);
  const dispatch = ids.map(id => {
    const t = map.get(id);
    // context handoff: hand this phase ONLY its deps' artifacts (compressed pointers)
    const handoff = t.deps.map(d => {
      const dep = run.phases[d];
      return { from: d, artifact: dep.artifact || null, note: dep.note || null };
    });
    return {
      id, agent: t.agent, goal: t.goal, gate: t.gate,
      expects_artifact: t.artifact || null,
      attempt: run.phases[id].attempts + 1,
      context_from: handoff,
    };
  });
  const remaining = run.tasks.filter(t => run.phases[t.id].status !== 'done').length;
  const allDone = remaining === 0;
  return { wave: dispatch, parallel: dispatch.length, allDone, remaining };
}

/** Mark a phase started (called when the wave is dispatched). */
function markRunning(run, ids) {
  for (const id of ids) {
    run.phases[id].status = 'running';
    run.phases[id].attempts += 1;
  }
  run.history.push({ ts: now(), event: 'dispatch', detail: ids.join(', ') });
}

/** Record a phase completion with its artifact (the subagent contract result). */
function markDone(run, id, artifact, note) {
  if (!run.phases[id]) throw new Error('unknown phase: ' + id);
  run.phases[id].status = 'done';
  if (artifact) run.phases[id].artifact = artifact;
  if (note) run.phases[id].note = note;
  run.history.push({ ts: now(), event: 'done', detail: id + (artifact ? ' -> ' + artifact : '') });
}

/**
 * Apply a verdict. REWORK resets the failing phase (and its downstream) to be
 * re-run, guarded by MAX_ATTEMPTS. BLOCK halts. SHIP finalizes.
 */
function applyVerdict(run, verdict, fromPhase) {
  verdict = String(verdict).toUpperCase();
  if (verdict === 'SHIP') {
    run.status = 'shipped';
    run.history.push({ ts: now(), event: 'verdict', detail: 'SHIP — creation complete' });
    return { ok: true, verdict, message: 'Creation shipped.' };
  }
  if (verdict === 'BLOCK') {
    run.status = 'blocked';
    run.history.push({ ts: now(), event: 'verdict', detail: 'BLOCK — escalate to human' });
    return { ok: false, verdict, message: 'Blocked — human escalation required.' };
  }
  // REWORK: reset the offending phase + everything downstream of it
  const target = fromPhase || pickReworkTarget(run);
  if (!run.phases[target]) throw new Error('rework target not found: ' + target);
  if (run.phases[target].attempts >= MAX_ATTEMPTS) {
    run.status = 'blocked';
    run.history.push({ ts: now(), event: 'loop-guard', detail: `${target} hit max attempts (${MAX_ATTEMPTS}) — escalating` });
    return { ok: false, verdict: 'BLOCK', message: `Loop-guard tripped: ${target} reworked ${MAX_ATTEMPTS}x. Escalate to human.` };
  }
  const affected = downstreamClosure(run, target);
  for (const id of affected) {
    run.phases[id].status = 'rework';
    if (id !== target) delete run.phases[id].artifact;
  }
  run.history.push({ ts: now(), event: 'rework', detail: `reset ${affected.join(', ')} (from ${target})` });
  return { ok: true, verdict: 'REWORK', reworked: affected, target,
    message: `REWORK: ${target} and downstream reset. Re-run from next wave.` };
}

/** Default rework target: the earliest gate phase, else the build phase, else first non-done. */
function pickReworkTarget(run) {
  const order = ['build', 'detail', 'design', 'specify', 'discover'];
  for (const id of order) if (run.phases[id]) return id;
  const nd = run.tasks.find(t => run.phases[t.id].status !== 'done');
  return nd ? nd.id : run.tasks[0].id;
}

/** target + all phases that (transitively) depend on it. */
function downstreamClosure(run, target) {
  const map = byId(run);
  const out = new Set([target]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of run.tasks) {
      if (out.has(t.id)) continue;
      if (t.deps.some(d => out.has(d))) { out.add(t.id); changed = true; }
    }
  }
  return run.tasks.filter(t => out.has(t.id)).map(t => t.id); // topo-ordered
}

function statusBoard(run) {
  const glyph = { pending: '·', ready: '○', running: '▶', done: '✓', rework: '↻', blocked: '🔴', failed: '✗' };
  const lines = [];
  lines.push(`RUN STATUS  ${run.status ? '[' + run.status + ']' : ''}`);
  lines.push('─'.repeat(48));
  for (const t of run.tasks) {
    const p = run.phases[t.id];
    const g = t.gate ? '⚖️' : '  ';
    const a = p.attempts > 1 ? ` (attempt ${p.attempts})` : '';
    lines.push(`  ${glyph[p.status] || '?'} ${g} ${t.id} @${t.agent}${a}`);
  }
  const done = run.tasks.filter(t => run.phases[t.id].status === 'done').length;
  lines.push('─'.repeat(48));
  lines.push(`progress: ${done}/${run.tasks.length} done`);
  return lines.join('\n');
}

// --- CLI ---------------------------------------------------------------
function parseFlags(argv) {
  const flags = {}; const pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    else pos.push(argv[i]);
  }
  return { flags, pos };
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { flags, pos } = parseFlags(rest);
  const runPath = flags.run;
  const need = () => { if (!runPath) { console.error('--run <run.json> required'); process.exit(2); } };

  if (cmd === 'init') {
    const dagPath = pos[0];
    if (!dagPath || !runPath) { console.error('usage: orchestrator.js init <dag.json> --run <run.json>'); process.exit(2); }
    const run = init(dagPath); saveRun(runPath, run);
    console.log(statusBoard(run));
    console.error(`run initialized -> ${runPath}`);
  } else if (cmd === 'next') {
    need(); const run = loadRun(runPath);
    const nw = nextWave(run);
    if (nw.allDone) { console.log(JSON.stringify({ allDone: true, message: 'All phases done — render verdict.' }, null, 2)); return; }
    if (!nw.wave.length) { console.log(JSON.stringify({ allDone: false, blocked: true, message: 'No ready phases and not all done — check for blocked/rework state.' }, null, 2)); return; }
    markRunning(run, nw.wave.map(w => w.id)); saveRun(runPath, run);
    console.log(JSON.stringify(nw, null, 2));
  } else if (cmd === 'done') {
    need(); const id = pos[0]; const run = loadRun(runPath);
    markDone(run, id, flags.artifact, flags.note); saveRun(runPath, run);
    console.log(statusBoard(run));
  } else if (cmd === 'verdict') {
    need(); const v = pos[0]; const run = loadRun(runPath);
    const res = applyVerdict(run, v, flags.from); saveRun(runPath, run);
    console.log(JSON.stringify(res, null, 2));
    console.log('\n' + statusBoard(run));
  } else if (cmd === 'status') {
    need(); console.log(statusBoard(loadRun(runPath)));
  } else {
    console.error('commands: init <dag> --run f | next --run f | done <id> --run f [--artifact p] | verdict <SHIP|REWORK|BLOCK> --run f [--from id] | status --run f');
    process.exit(2);
  }
}

if (require.main === module) main();
module.exports = { init, nextWave, markRunning, markDone, applyVerdict, computeReady, downstreamClosure, statusBoard, MAX_ATTEMPTS };
