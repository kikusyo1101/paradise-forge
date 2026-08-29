/**
 * PARADISE :: Shared browser API for the Live Dashboard
 * Wave-1 scaffold. Pure data + pure functions, no deps, no build.
 * Loaded as a plain <script> — exposes window.PARADISE.
 */
(function (global) {
  'use strict';

  // ---- System inventory (the three layers) ----------------------------
  const INVENTORY = {
    harness: {
      title: 'ハーネス Engineering',
      subtitle: 'everything-claude-code wired into ~/.claude',
      metrics: [
        { k: 'agents', v: 9 },
        { k: 'commands', v: 16 },
        { k: 'skills', v: 13 },
        { k: 'rules', v: 8 },
        { k: 'hooks', v: 14 },
      ],
      items: ['planner', 'architect', 'code-reviewer', 'security-reviewer',
        'tdd-guide', 'build-error-resolver', 'refactor-cleaner', 'doc-updater', 'e2e-runner'],
    },
    loop: {
      title: 'ループ Engineering',
      subtitle: 'self-improving closed loop',
      metrics: [
        { k: 'lifecycle events', v: 6 },
        { k: 'verification phases', v: 6 },
      ],
      items: ['verification-loop', 'eval-harness', 'continuous-learning',
        'memory-persistence', 'strategic-compact'],
    },
    graph: {
      title: 'グラフ Engineering',
      subtitle: 'agent DAG orchestrator + git-native memory',
      metrics: [
        { k: 'engines', v: 2 },
        { k: 'self-tests', v: 10 },
      ],
      items: ['graph-engine.js', 'kg.js', '/graph command', 'SessionStart injection'],
    },
  };

  // ---- planWaves: browser port of graph-engine scheduling -------------
  // Returns { ok, waves:[[id,...]], errors:[...] } for a DAG {tasks:[...]}.
  function planWaves(dag) {
    const tasks = Array.isArray(dag) ? dag : dag.tasks;
    const byId = new Map();
    const errors = [];
    for (const t of tasks) {
      if (byId.has(t.id)) errors.push('Duplicate id: ' + t.id);
      byId.set(t.id, Object.assign({ deps: [] }, t));
    }
    for (const t of byId.values())
      for (const d of t.deps)
        if (!byId.has(d)) errors.push('"' + t.id + '" needs missing "' + d + '"');

    // Kahn's algorithm
    const indeg = new Map([...byId.keys()].map(id => [id, 0]));
    const deps = new Map([...byId.keys()].map(id => [id, []]));
    for (const t of byId.values())
      for (const d of t.deps) {
        if (!byId.has(d)) continue;
        indeg.set(t.id, indeg.get(t.id) + 1);
        deps.get(d).push(t.id);
      }
    const waves = [];
    let frontier = [...byId.values()].filter(t => indeg.get(t.id) === 0).map(t => t.id).sort();
    const done = new Set();
    while (frontier.length) {
      waves.push(frontier);
      const next = [];
      for (const id of frontier) {
        done.add(id);
        for (const dep of deps.get(id)) {
          indeg.set(dep, indeg.get(dep) - 1);
          if (indeg.get(dep) === 0) next.push(dep);
        }
      }
      frontier = next.sort();
    }
    if (done.size !== byId.size) errors.push('Cycle detected (unscheduled tasks remain)');
    return { ok: errors.length === 0, waves, errors, byId };
  }

  // ---- renderMermaid: DAG -> mermaid flowchart source -----------------
  function renderMermaid(dag) {
    const p = planWaves(dag);
    const tasks = Array.isArray(dag) ? dag : dag.tasks;
    const lines = ['flowchart TD'];
    for (const t of tasks) {
      const label = (t.id + '<br/>' + (t.agent || 'general')).replace(/"/g, "'");
      lines.push('  ' + t.id + '["' + label + '"]');
    }
    for (const t of tasks)
      for (const d of (t.deps || [])) lines.push('  ' + d + ' --> ' + t.id);
    p.waves.forEach((w, i) => {
      lines.push('  subgraph WAVE_' + (i + 1));
      w.forEach(id => lines.push('    ' + id));
      lines.push('  end');
    });
    return lines.join('\n');
  }

  // The live example DAG this dashboard was itself built from.
  const SELF_DAG = {
    meta: { goal: 'Build the Paradise Live Dashboard' },
    tasks: [
      { id: 'scaffold', agent: 'architect', goal: 'shared paradise.js API' },
      { id: 'ui', agent: 'frontend', goal: 'dark dashboard', deps: ['scaffold'] },
      { id: 'kg-learn', agent: 'architect', goal: 'co-change learning', deps: ['scaffold'] },
      { id: 'verify', agent: 'verification-loop', goal: 'test + persist', deps: ['ui', 'kg-learn'] },
    ],
  };

  global.PARADISE = { INVENTORY, planWaves, renderMermaid, SELF_DAG };
})(typeof window !== 'undefined' ? window : globalThis);
