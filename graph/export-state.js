#!/usr/bin/env node
/**
 * PARADISE :: State export for the Live Dashboard
 * Dumps the paradise's living state (knowledge graph, lessons, the forge
 * pipeline shape, creations) to a single JSON the dashboard renders.
 *
 * Usage: node graph/export-state.js [--out dashboard/state.json]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const kg = require('./kg.js');
const forge = require('./forge.js');

const ROOT = path.join(__dirname, '..');

function readGraph() {
  const nodes = kg.query('');            // all nodes
  // rebuild edges from the store the same way kg does
  const kgRoot = process.env.PARADISE_KG || path.join(os.homedir(), '.claude', 'paradise-kg');
  let edges = [];
  try {
    edges = fs.readFileSync(path.join(kgRoot, 'edges.jsonl'), 'utf8')
      .split('\n').filter(Boolean).map(l => JSON.parse(l));
  } catch {}
  return { nodes, edges };
}

function creations() {
  const dir = path.join(ROOT, 'creations');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory()).map(name => {
    const cdir = path.join(dir, name);
    const files = fs.readdirSync(cdir);
    let verdict = null;
    try {
      const rep = JSON.parse(fs.readFileSync(path.join(cdir, 'verdict-report.json'), 'utf8'));
      verdict = rep.spec && rep.spec.satisfied ? 'SHIP' : 'REWORK';
    } catch {}
    return { name, files: files.length, verdict, hasFindings: files.includes('findings.md') };
  });
}

function main() {
  let out = path.join(ROOT, 'dashboard', 'state.json');
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) if (argv[i] === '--out') out = argv[++i];

  const g = readGraph();
  const lessons = g.nodes.filter(n => n.type === 'lesson')
    .map(n => ({ id: n.id, label: n.label, check: n.body }));
  // degree for hub sizing
  const deg = {};
  for (const e of g.edges) { deg[e.from] = (deg[e.from] || 0) + 1; deg[e.to] = (deg[e.to] || 0) + 1; }

  const state = {
    generated: new Date().toISOString(),
    pipeline: forge.buildDag('<a small wish>', 'standard').tasks.map(t => ({
      id: t.id, agent: t.agent, gate: !!t.gate, deps: t.deps || [],
    })),
    constitution: forge.CONSTITUTION,
    graph: {
      nodeCount: g.nodes.length,
      edgeCount: g.edges.length,
      nodes: g.nodes.map(n => ({ id: n.id, type: n.type, label: n.label, degree: deg[n.id] || 0 })),
      edges: g.edges.map(e => ({ from: e.from, rel: e.rel, to: e.to })),
      byType: g.nodes.reduce((a, n) => { a[n.type] = (a[n.type] || 0) + 1; return a; }, {}),
    },
    lessons,
    creations: creations(),
  };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(state, null, 2));
  console.error(`state exported -> ${out}  (nodes:${state.graph.nodeCount} edges:${state.graph.edgeCount} lessons:${lessons.length} creations:${state.creations.length})`);
}
if (require.main === module) main();
module.exports = { readGraph };
