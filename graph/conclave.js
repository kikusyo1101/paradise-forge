#!/usr/bin/env node
/**
 * PARADISE :: Conclave — the Recursive Hierarchical Orchestrator
 * ---------------------------------------------------------------------
 * The engine that runs the clergy. It is a SUPERVISOR-OF-SUPERVISORS:
 *
 *   Pontiff (session) drives the CONCLAVE (the outer PDCA ring over domains).
 *     └ each domain is a CARDINAL, who drives an inner SEE (the domain's own
 *       PDCA ring over its phases).
 *         └ each phase is worked by a PRIEST (large subagent), who may marshal
 *           BELIEVERS (small subagents) for fine work.
 *   The TRIBUNAL (executor) is invoked at the judgment gate, independent of all.
 *
 * Two nested rings, both real:
 *   OUTER (conclave): plan the college → convene cardinals in dependency order →
 *     check each domain's ratification → act (advance or send a domain back).
 *   INNER (see): a cardinal plans its phases → dispatches priests → checks their
 *     reconciled results → acts (rework a phase, guarded) until the domain ratifies.
 *
 * Built ON TOP OF orchestrator.js (the phase-level state machine) — the conclave
 * adds the domain layer above it. Run state is durable JSON, resumable.
 *
 * Usage:
 *   conclave.js convene <dag.json> --run <conclave.json>   # build the nested run
 *   conclave.js next --run <conclave.json>                 # next domain OR next phase-wave within the active domain
 *   conclave.js done <phaseId> --run <conclave.json> --artifact <path>
 *   conclave.js ratify <cardinal> --run <conclave.json> [--reject --from <phase>]
 *   conclave.js status --run <conclave.json>
 */
'use strict';
const fs = require('fs');
const path = require('path');
const engine = require('./graph-engine.js');
const clergy = require('./clergy.js');

const MAX_DOMAIN_REWORK = 3; // loop-guard at the domain level too

function load(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function save(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2)); }
function now() { return new Date().toISOString(); }

/** Build a nested run: domains (cardinals) each holding their phases. */
function convene(dagPath) {
  const dag = engine.loadDag(dagPath);
  const v = engine.validate(dag);
  if (!v.ok) throw new Error('Invalid DAG: ' + v.errors.join('; '));
  const order = dag.tasks.map(t => t.id);
  const groups = clergy.groupByCardinal(order);

  const byId = new Map(dag.tasks.map(t => [t.id, t]));
  const domains = groups.map((g, i) => ({
    seq: i,
    cardinal: g.cardinal,
    domain: (clergy.COLLEGE[g.cardinal] && clergy.COLLEGE[g.cardinal].domain) ||
            (g.cardinal === 'tribunal' ? clergy.TRIBUNAL.domain : g.cardinal),
    status: 'pending',          // pending | active | ratified | rejected | blocked
    reworks: 0,
    phases: g.phases.map(id => ({
      id, agent: byId.get(id).agent, goal: byId.get(id).goal,
      deps: byId.get(id).deps || [], gate: !!byId.get(id).gate,
      artifact: byId.get(id).artifact, status: 'pending', attempts: 0, artifactPath: null,
    })),
    reviewClass: (clergy.COLLEGE[g.cardinal] && clergy.COLLEGE[g.cardinal].reviewClass) ||
                 (g.cardinal === 'tribunal' ? 'god' : 'pontiff'),
    pdca: (clergy.COLLEGE[g.cardinal] && clergy.COLLEGE[g.cardinal].pdca) || clergy.TRIBUNAL.law,
  }));

  return {
    meta: dag.meta || {}, created: now(),
    domains,
    history: [{ ts: now(), event: 'convene', detail: `${domains.length} domains, ${dag.tasks.length} phases` }],
  };
}

/** All phase objects flat, with a lookup by id (across all domains). */
function allPhases(run) { const m = new Map(); for (const d of run.domains) for (const p of d.phases) m.set(p.id, p); return m; }

/** Is a phase dispatchable? deps done (anywhere) AND phase pending/rework. */
function phaseReady(run, phase) {
  if (phase.status !== 'pending' && phase.status !== 'rework') return false;
  const all = allPhases(run);
  return phase.deps.every(d => all.get(d) && all.get(d).status === 'done');
}

/** The active domain = first non-ratified domain whose upstream domains are ratified. */
function activeDomain(run) {
  for (const d of run.domains) {
    if (d.status === 'ratified') continue;
    if (d.status === 'blocked') return { domain: d, blocked: true };
    return { domain: d };
  }
  return null; // all ratified
}

/**
 * next(): the pontiff asks the conclave what to do. Returns either:
 *  - a phase-wave WITHIN the active domain (the cardinal dispatching priests), or
 *  - a ratify signal (the domain's phases are all done → the review class ratifies), or
 *  - conclave-complete.
 */
function next(run) {
  const act = activeDomain(run);
  if (!act) return { level: 'conclave', phase: 'complete', message: 'All domains ratified — creation complete.' };
  const d = act.domain;
  if (act.blocked) return { level: 'domain', phase: 'blocked', cardinal: d.cardinal, message: `${d.domain} blocked — escalate to pontiff.` };
  if (d.status === 'pending') d.status = 'active';

  // ready phases inside this domain
  const ready = d.phases.filter(p => phaseReady(run, p)).map(p => p.id);
  if (ready.length) {
    return {
      level: 'domain', phase: 'wave', cardinal: d.cardinal, domain: d.domain,
      pdca: d.pdca,
      dispatch: ready.map(id => {
        const ph = d.phases.find(x => x.id === id);
        const all = allPhases(run);
        return {
          id, agent: ph.agent, goal: ph.goal, gate: ph.gate,
          expects_artifact: ph.artifact, attempt: ph.attempts + 1,
          context_from: ph.deps.map(dep => ({ from: dep, artifact: (all.get(dep) || {}).artifactPath || null })),
        };
      }),
      parallel: ready.length,
    };
  }

  // no ready phases: are all of this domain's phases done? → ratify
  const allDone = d.phases.every(p => p.status === 'done');
  if (allDone) return { level: 'domain', phase: 'ratify', cardinal: d.cardinal, domain: d.domain,
    reviewClass: d.reviewClass, message: `${d.domain}: all phases done — ${d.reviewClass} ratifies.` };

  return { level: 'domain', phase: 'stuck', cardinal: d.cardinal,
    message: 'No ready phases, not all done — a dependency may be in another unratified domain or reworking.' };
}

/** Mark a phase running (attempts++). Called on dispatch. */
function markRunning(run, ids) {
  const all = allPhases(run);
  for (const id of ids) { const p = all.get(id); if (p) { p.status = 'running'; p.attempts += 1; } }
  run.history.push({ ts: now(), event: 'dispatch', detail: ids.join(', ') });
}

function markDone(run, id, artifactPath) {
  const p = allPhases(run).get(id);
  if (!p) throw new Error('unknown phase: ' + id);
  p.status = 'done'; if (artifactPath) p.artifactPath = artifactPath;
  run.history.push({ ts: now(), event: 'done', detail: id + (artifactPath ? ' → ' + artifactPath : '') });
}

/**
 * ratify(): the review class blesses a domain, or rejects it.
 * On reject the named phase + its downstream reset — ACROSS domains, because a
 * review class may legitimately send work back to an EARLIER domain (Art. 14).
 * Any domain that owns a reset phase loses its ratification and reopens.
 * Guarded by MAX_DOMAIN_REWORK on the domain that owns `from`.
 */
function ratify(run, cardinal, opts = {}) {
  const d = run.domains.find(x => x.cardinal === cardinal);
  if (!d) throw new Error('no such cardinal: ' + cardinal);
  if (!opts.reject) {
    d.status = 'ratified';
    run.history.push({ ts: now(), event: 'ratify', detail: `${d.domain} ratified by ${d.reviewClass}` });
    return { ok: true, ratified: cardinal };
  }
  // rejection → rework, possibly upstream into another domain
  const from = opts.from || d.phases[0].id;
  const ownerOf = id => run.domains.find(x => x.phases.some(p => p.id === id));
  const target = ownerOf(from);
  if (!target) throw new Error('no such phase to rework from: ' + from);

  target.reworks += 1;
  if (target.reworks > MAX_DOMAIN_REWORK) {
    target.status = 'blocked';
    run.history.push({ ts: now(), event: 'domain-loop-guard', detail: `${target.domain} exceeded ${MAX_DOMAIN_REWORK} reworks` });
    return { ok: false, blocked: target.cardinal, message: `Domain ${target.domain} blocked after ${MAX_DOMAIN_REWORK} reworks — escalate to pontiff.` };
  }

  // downstream closure over EVERY phase in the conclave, not just this domain
  const every = [];
  for (const dom of run.domains) for (const p of dom.phases) every.push(p);
  const idset = new Set([from]);
  let changed = true;
  while (changed) { changed = false;
    for (const p of every) { if (idset.has(p.id)) continue; if (p.deps.some(x => idset.has(x))) { idset.add(p.id); changed = true; } }
  }
  const reopened = new Set();
  for (const dom of run.domains) {
    let touched = false;
    for (const p of dom.phases) if (idset.has(p.id)) { p.status = 'rework'; if (p.id !== from) p.artifactPath = null; touched = true; }
    if (touched) { if (dom.status === 'ratified') reopened.add(dom.cardinal); dom.status = 'active'; }
  }
  // the rejecting domain never ratifies itself on a reject
  if (d.status === 'ratified') { d.status = 'active'; reopened.add(d.cardinal); }
  run.history.push({ ts: now(), event: 'domain-rework', detail: `${d.domain} → ${target.domain}: reset ${[...idset].join(', ')} (rework ${target.reworks})${reopened.size ? '; un-ratified ' + [...reopened].join(', ') : ''}` });
  return { ok: true, reworked: [...idset], cardinal, target: target.cardinal, reopened: [...reopened], message: `${d.domain}: rework from ${from} (domain ${target.domain}).` };
}

function statusBoard(run) {
  const dg = { pending: '·', active: '▶', ratified: '✓', rejected: '↻', blocked: '🔴' };
  const pg = { pending: '·', running: '▶', done: '✓', rework: '↻', blocked: '🔴' };
  const lines = ['CONCLAVE — 聖職位階の進行', '═'.repeat(52)];
  for (const d of run.domains) {
    const rw = d.reworks ? ` (rework ${d.reworks})` : '';
    lines.push(`${dg[d.status] || '?'} 枢機卿 ${d.cardinal} — ${d.domain}${rw}   [review: ${d.reviewClass}]`);
    for (const p of d.phases) lines.push(`     ${pg[p.status] || '?'} ${p.gate ? '⚖️' : '  '} ${p.id} @${p.agent}`);
  }
  const dr = run.domains.filter(d => d.status === 'ratified').length;
  lines.push('═'.repeat(52), `domains ratified: ${dr}/${run.domains.length}`);
  return lines.join('\n');
}

// --- CLI ---
function parse(argv) { const f = {}, pos = []; for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) f[argv[i].slice(2)] = (argv[i+1] && !argv[i+1].startsWith('--')) ? argv[++i] : true; else pos.push(argv[i]); } return { f, pos }; }

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { f, pos } = parse(rest);
  const rp = f.run;
  const need = () => { if (!rp) { console.error('--run required'); process.exit(2); } };
  if (cmd === 'convene') {
    if (!pos[0] || !rp) { console.error('usage: conclave.js convene <dag.json> --run <run.json>'); process.exit(2); }
    const run = convene(pos[0]); save(rp, run); console.log(statusBoard(run));
  } else if (cmd === 'next') {
    need(); const run = load(rp); const step = next(run);
    if (step.phase === 'wave') markRunning(run, step.dispatch.map(d => d.id));
    save(rp, run); console.log(JSON.stringify(step, null, 2));
  } else if (cmd === 'done') {
    need(); const run = load(rp); markDone(run, pos[0], f.artifact); save(rp, run); console.log(statusBoard(run));
  } else if (cmd === 'ratify') {
    need(); const run = load(rp); const res = ratify(run, pos[0], { reject: f.reject, from: f.from }); save(rp, run);
    console.log(JSON.stringify(res, null, 2)); console.log('\n' + statusBoard(run));
  } else if (cmd === 'status') {
    need(); console.log(statusBoard(load(rp)));
  } else { console.error('commands: convene <dag> --run f | next --run f | done <id> --run f --artifact p | ratify <cardinal> --run f [--reject --from id] | status --run f'); process.exit(2); }
}
if (require.main === module) main();
module.exports = { convene, next, markRunning, markDone, ratify, activeDomain, allPhases, statusBoard, MAX_DOMAIN_REWORK };
