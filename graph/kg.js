#!/usr/bin/env node
/**
 * PARADISE :: Knowledge Graph Memory
 * ---------------------------------------------------------------
 * Git-native, dependency-free persistent memory for AI agents.
 * No DB, no vector store, no embeddings — plain JSONL nodes + edges
 * that live in the repo and survive /clear and /compact.
 *
 * Design synthesized from hilyfux/knowledge-graph (git-native,
 * evidence-based, snapshot survives compaction) + codebase-memory
 * (symbol graph) — reimplemented in pure Node for zero deps.
 *
 * Store layout (default ~/.claude/paradise-kg/):
 *   nodes.jsonl   one JSON object per line: {id,type,label,body,ts,evidence}
 *   edges.jsonl   one JSON object per line: {from,rel,to,ts}
 *
 * Commands:
 *   kg.js remember <type> <id> <label> [body]   add/update a node
 *   kg.js link <from> <rel> <to>                add an edge
 *   kg.js query <substring>                     search nodes
 *   kg.js node <id>                             show a node + its edges
 *   kg.js neighbors <id>                        1-hop neighborhood
 *   kg.js snapshot                              compact context for SessionStart
 *   kg.js stats                                 counts
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = process.env.PARADISE_KG || path.join(os.homedir(), '.claude', 'paradise-kg');
const NODES = path.join(ROOT, 'nodes.jsonl');
const EDGES = path.join(ROOT, 'edges.jsonl');

function ensure() {
  fs.mkdirSync(ROOT, { recursive: true });
  for (const f of [NODES, EDGES]) if (!fs.existsSync(f)) fs.writeFileSync(f, '');
}
function readJsonl(f) {
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}
function appendJsonl(f, obj) { fs.appendFileSync(f, JSON.stringify(obj) + '\n'); }
function now() { return new Date().toISOString(); }

/** Upsert a node: last-write-wins by id (compacts on read). */
function remember(type, id, label, body) {
  ensure();
  const nodes = readJsonl(NODES).filter(n => n.id !== id);
  const node = { id, type, label, body: body || '', ts: now(),
    evidence: process.env.PARADISE_EVIDENCE || null };
  nodes.push(node);
  fs.writeFileSync(NODES, nodes.map(n => JSON.stringify(n)).join('\n') + '\n');
  return node;
}
function link(from, rel, to) {
  ensure();
  const edges = readJsonl(EDGES);
  if (!edges.some(e => e.from === from && e.rel === rel && e.to === to))
    appendJsonl(EDGES, { from, rel, to, ts: now() });
  return { from, rel, to };
}
function query(sub) {
  const s = sub.toLowerCase();
  return readJsonl(NODES).filter(n =>
    (n.id + ' ' + n.label + ' ' + n.body + ' ' + n.type).toLowerCase().includes(s));
}
function getNode(id) { return readJsonl(NODES).find(n => n.id === id) || null; }
function neighbors(id) {
  const edges = readJsonl(EDGES);
  return {
    out: edges.filter(e => e.from === id),
    in: edges.filter(e => e.to === id),
  };
}
function snapshot() {
  const nodes = readJsonl(NODES);
  const edges = readJsonl(EDGES);
  const recent = nodes.slice().sort((a, b) => (b.ts || '').localeCompare(a.ts || '')).slice(0, 12);
  const lines = [];
  lines.push('=== PARADISE KNOWLEDGE SNAPSHOT ===');
  lines.push(`nodes:${nodes.length}  edges:${edges.length}`);
  if (recent.length) {
    lines.push('\nRecent knowledge:');
    for (const n of recent) lines.push(`  [${n.type}] ${n.id}: ${n.label}${n.body ? ' — ' + n.body.slice(0, 80) : ''}`);
  }
  // surface the most-connected nodes (hubs) — the load-bearing knowledge
  const deg = new Map();
  for (const e of edges) { deg.set(e.from, (deg.get(e.from) || 0) + 1); deg.set(e.to, (deg.get(e.to) || 0) + 1); }
  const hubs = [...deg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (hubs.length) {
    lines.push('\nKey nodes (most connected):');
    for (const [id, d] of hubs) { const n = getNode(id); lines.push(`  ${id} (${d} links)${n ? ' — ' + n.label : ''}`); }
  }
  lines.push('===================================');
  return lines.join('\n');
}
function stats() {
  const nodes = readJsonl(NODES), edges = readJsonl(EDGES);
  const byType = {};
  for (const n of nodes) byType[n.type] = (byType[n.type] || 0) + 1;
  return { root: ROOT, nodes: nodes.length, edges: edges.length, byType };
}

function main() {
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case 'remember': { const [type, id, label, ...b] = args;
      if (!type || !id || !label) { console.error('usage: kg.js remember <type> <id> <label> [body]'); process.exit(2); }
      console.log('OK ' + JSON.stringify(remember(type, id, label, b.join(' ')))); break; }
    case 'link': { const [from, rel, to] = args;
      if (!from || !rel || !to) { console.error('usage: kg.js link <from> <rel> <to>'); process.exit(2); }
      console.log('OK ' + JSON.stringify(link(from, rel, to))); break; }
    case 'query': { const r = query(args.join(' '));
      if (!r.length) console.log('(no matches)');
      else r.forEach(n => console.log(`[${n.type}] ${n.id}: ${n.label}${n.body ? ' — ' + n.body : ''}`)); break; }
    case 'node': { const n = getNode(args[0]); if (!n) { console.log('(not found)'); break; }
      console.log(JSON.stringify(n, null, 2));
      const nb = neighbors(args[0]);
      nb.out.forEach(e => console.log(`  -[${e.rel}]-> ${e.to}`));
      nb.in.forEach(e => console.log(`  <-[${e.rel}]- ${e.from}`)); break; }
    case 'neighbors': { console.log(JSON.stringify(neighbors(args[0]), null, 2)); break; }
    case 'snapshot': console.log(snapshot()); break;
    case 'stats': console.log(JSON.stringify(stats(), null, 2)); break;
    default:
      console.error('commands: remember | link | query | node | neighbors | snapshot | stats');
      process.exit(2);
  }
}
if (require.main === module) main();
module.exports = { remember, link, query, getNode, neighbors, snapshot, stats };
