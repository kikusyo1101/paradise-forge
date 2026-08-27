#!/usr/bin/env node
/**
 * PARADISE :: Graph Orchestration Engine
 * ---------------------------------------------------------------
 * Turns a goal-DAG (tasks + dependencies) into an execution plan:
 *   - validates the graph (missing deps, cycles)
 *   - topological sort -> waves (Kahn's algorithm)
 *   - each wave = tasks with no unmet deps => run in PARALLEL
 *   - waves run in SEQUENCE (downstream unblocks as upstream completes)
 *
 * This is the "graph engineering" core: harness -> loop -> GRAPH.
 * Synthesized from open-multi-agent (runtime DAG), barkain
 * (wave scheduling), and LangGraph (typed state, native cycles).
 *
 * Usage:
 *   node graph-engine.js plan   <dag.json>      # print wave plan
 *   node graph-engine.js verify <dag.json>      # validate only (exit 1 on error)
 *   node graph-engine.js mermaid <dag.json>     # emit a mermaid diagram
 */
'use strict';
const fs = require('fs');

/** @typedef {{id:string,agent?:string,goal:string,deps?:string[],wave?:number}} Task */

function loadDag(path) {
  const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
  const tasks = Array.isArray(raw) ? raw : raw.tasks;
  if (!Array.isArray(tasks)) throw new Error('DAG must be an array of tasks or {tasks:[...]}');
  const byId = new Map();
  for (const t of tasks) {
    if (!t.id) throw new Error('Every task needs an id');
    if (byId.has(t.id)) throw new Error(`Duplicate task id: ${t.id}`);
    t.deps = t.deps || [];
    byId.set(t.id, t);
  }
  return { meta: raw.meta || {}, tasks, byId };
}

/** Validate: every dep exists; no cycles. Returns {ok, errors[]}. */
function validate({ tasks, byId }) {
  const errors = [];
  for (const t of tasks)
    for (const d of t.deps)
      if (!byId.has(d)) errors.push(`Task "${t.id}" depends on missing task "${d}"`);
  // cycle detection via DFS coloring
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map(tasks.map(t => [t.id, WHITE]));
  const stack = [];
  let cycle = null;
  const dfs = (id) => {
    color.set(id, GRAY); stack.push(id);
    for (const d of byId.get(id).deps) {
      if (!byId.has(d)) continue;
      if (color.get(d) === GRAY) { cycle = [...stack.slice(stack.indexOf(d)), d]; return true; }
      if (color.get(d) === WHITE && dfs(d)) return true;
    }
    color.set(id, BLACK); stack.pop(); return false;
  };
  for (const t of tasks) if (color.get(t.id) === WHITE && dfs(t.id)) break;
  if (cycle) errors.push(`Cycle detected: ${cycle.join(' -> ')}`);
  return { ok: errors.length === 0, errors };
}

/** Kahn's algorithm -> array of waves (each wave = task ids that can run in parallel). */
function schedule({ tasks, byId }) {
  const indeg = new Map(tasks.map(t => [t.id, 0]));
  const dependents = new Map(tasks.map(t => [t.id, []]));
  for (const t of tasks)
    for (const d of t.deps) {
      if (!byId.has(d)) continue;
      indeg.set(t.id, indeg.get(t.id) + 1);
      dependents.get(d).push(t.id);
    }
  const waves = [];
  let frontier = tasks.filter(t => indeg.get(t.id) === 0).map(t => t.id).sort();
  const done = new Set();
  while (frontier.length) {
    waves.push(frontier);
    const next = [];
    for (const id of frontier) {
      done.add(id);
      for (const dep of dependents.get(id)) {
        indeg.set(dep, indeg.get(dep) - 1);
        if (indeg.get(dep) === 0) next.push(dep);
      }
    }
    frontier = next.sort();
  }
  if (done.size !== tasks.length)
    throw new Error('Scheduling failed — graph has a cycle (run verify first)');
  return waves;
}

function planText(dag) {
  const v = validate(dag);
  if (!v.ok) { console.error('INVALID DAG:\n  - ' + v.errors.join('\n  - ')); process.exit(1); }
  const waves = schedule(dag);
  const lines = [];
  lines.push(`PARADISE EXECUTION PLAN  (${dag.tasks.length} tasks, ${waves.length} waves)`);
  lines.push('='.repeat(58));
  waves.forEach((w, i) => {
    const mode = w.length > 1 ? `PARALLEL x${w.length}` : 'single';
    lines.push(`\nWAVE ${i + 1}  [${mode}]`);
    for (const id of w) {
      const t = dag.byId.get(id);
      const agent = t.agent ? `@${t.agent}` : '@general';
      const deps = t.deps.length ? `  (after: ${t.deps.join(', ')})` : '';
      lines.push(`  - ${id} ${agent}: ${t.goal}${deps}`);
    }
  });
  lines.push('\n' + '='.repeat(58));
  lines.push('Dispatch rule: run all tasks in a wave concurrently, wait for the');
  lines.push('whole wave, then advance. Downstream waves consume upstream outputs.');
  return lines.join('\n');
}

function mermaid(dag) {
  const v = validate(dag);
  if (!v.ok) { console.error('INVALID DAG:\n  - ' + v.errors.join('\n  - ')); process.exit(1); }
  const waves = schedule(dag);
  const waveOf = new Map();
  waves.forEach((w, i) => w.forEach(id => waveOf.set(id, i + 1)));
  const lines = ['flowchart TD'];
  for (const t of dag.tasks) {
    const label = `${t.id}<br/>${(t.agent || 'general')}`.replace(/"/g, "'");
    lines.push(`  ${t.id}["${label}"]`);
  }
  for (const t of dag.tasks)
    for (const d of t.deps) lines.push(`  ${d} --> ${t.id}`);
  waves.forEach((w, i) => {
    lines.push(`  subgraph WAVE_${i + 1}`);
    w.forEach(id => lines.push(`    ${id}`));
    lines.push('  end');
  });
  return lines.join('\n');
}

function main() {
  const [cmd, path] = process.argv.slice(2);
  if (!cmd || !path) {
    console.error('Usage: graph-engine.js <plan|verify|mermaid> <dag.json>');
    process.exit(2);
  }
  const dag = loadDag(path);
  if (cmd === 'verify') {
    const v = validate(dag);
    if (v.ok) { console.log(`VALID DAG (${dag.tasks.length} tasks, ${schedule(dag).length} waves)`); }
    else { console.error('INVALID DAG:\n  - ' + v.errors.join('\n  - ')); process.exit(1); }
  } else if (cmd === 'plan') {
    console.log(planText(dag));
  } else if (cmd === 'mermaid') {
    console.log(mermaid(dag));
  } else {
    console.error(`Unknown command: ${cmd}`); process.exit(2);
  }
}

if (require.main === module) main();
module.exports = { loadDag, validate, schedule, planText, mermaid };
