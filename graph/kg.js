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
const COCHANGE = path.join(ROOT, 'cochange.jsonl');

function ensure() {
  fs.mkdirSync(ROOT, { recursive: true });
  for (const f of [NODES, EDGES, COCHANGE]) if (!fs.existsSync(f)) fs.writeFileSync(f, '');
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
/** A lesson's CHECK lives in the body, encoded as "<check>|applies:<scope>".
 * If a caller crams that spec into the LABEL (easy to do from the CLI, where a
 * quoted phrase lands in <label> when [body] is omitted), the scope would be
 * lost and the lesson would fire on EVERY creation. Normalize at write time so
 * a malformed lesson can never become a global false-positive. */
function normalizeLesson(label, body) {
  const carriesSpec = s => typeof s === 'string' && s.includes('|applies:');
  if (!carriesSpec(body) && carriesSpec(label)) {
    const spec = label;
    const cleanLabel = spec.split('|applies:')[0].replace(/^check:/, '').trim();
    return { label: cleanLabel || spec, body: spec };
  }
  return { label, body: body || '' };
}

function remember(type, id, label, body) {
  ensure();
  const nodes = readJsonl(NODES).filter(n => n.id !== id);
  if (type === 'lesson') ({ label, body } = normalizeLesson(label, body));
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
/** Forget a node and every edge touching it. The paradise can correct its
 * memory, not only accrete it — stale or duplicate knowledge must be removable. */
function forget(id) {
  ensure();
  const nodes = readJsonl(NODES);
  const kept = nodes.filter(n => n.id !== id);
  const removed = nodes.length - kept.length;
  fs.writeFileSync(NODES, kept.map(n => JSON.stringify(n)).join('\n') + (kept.length ? '\n' : ''));
  const edges = readJsonl(EDGES);
  const keptEdges = edges.filter(e => e.from !== id && e.to !== id);
  const removedEdges = edges.length - keptEdges.length;
  fs.writeFileSync(EDGES, keptEdges.map(e => JSON.stringify(e)).join('\n') + (keptEdges.length ? '\n' : ''));
  return { id, removedNodes: removed, removedEdges };
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
    for (const n of recent) {
      // label と body が同じ文なら二度書かない。remember は両方に同じ文字列を
      // 入れるため、素直に連結すると全ての教訓が二重に出て、しかも切り詰めで
      // 途中から千切れる — 情報密度が半分になっていた。
      const body = (n.body || '').trim();
      const label = (n.label || '').trim();
      const extra = body && !label.startsWith(body.slice(0, 40)) ? ' — ' + body.slice(0, 80) : '';
      lines.push(`  [${n.type}] ${n.id}: ${label}${extra}`);
    }
  }
  // surface the most-connected nodes (hubs) — the load-bearing knowledge
  const deg = new Map();
  for (const e of edges) { deg.set(e.from, (deg.get(e.from) || 0) + 1); deg.set(e.to, (deg.get(e.to) || 0) + 1); }
  const hubs = [...deg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (hubs.length) {
    lines.push('\nKey nodes (most connected):');
    for (const [id, d] of hubs) { const n = getNode(id); lines.push(`  ${id} (${d} links)${n ? ' — ' + n.label : ''}`); }
  }
  // surface the strongest evidence-based co-change pairs (learned relationships)
  const cc = [...cochangeCounts().entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
  if (cc.length) {
    lines.push('\nPredicted related (co-change):');
    for (const [k, c] of cc) { const [a, b] = k.split('\u0000'); lines.push(`  ${a} ~ ${b} (${c} co-changes)`); }
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

// --- Evidence-based co-change learning ---------------------------------
// Record that a set of nodes were touched in the same unit of work, then
// tally how often each unordered pair co-occurs to predict related nodes.
function pairKey(a, b) { return a < b ? a + '\u0000' + b : b + '\u0000' + a; }
/** Observe a set of nodes changed together; appends one event to cochange.jsonl. */
function observe(ids) {
  ensure();
  const uniq = [...new Set((ids || []).filter(Boolean))];
  if (uniq.length < 2) return { ids: uniq, pairs: 0 };
  appendJsonl(COCHANGE, { ids: uniq, ts: now() });
  return { ids: uniq, pairs: uniq.length * (uniq.length - 1) / 2 };
}
/** Tally every unordered pair across all observed events. */
function cochangeCounts() {
  const counts = new Map();
  for (const rec of readJsonl(COCHANGE)) {
    const ids = [...new Set((rec.ids || []).filter(Boolean))];
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const k = pairKey(ids[i], ids[j]);
        counts.set(k, (counts.get(k) || 0) + 1);
      }
  }
  return counts;
}
/** Nodes most frequently co-changed with <id>, sorted by count desc. */
function predict(id) {
  const out = [];
  for (const [k, c] of cochangeCounts()) {
    const [a, b] = k.split('\u0000');
    if (a === id) out.push([b, c]);
    else if (b === id) out.push([a, c]);
  }
  return out.sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
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
    case 'forget': { const id = args[0];
      if (!id) { console.error('usage: kg.js forget <id>'); process.exit(2); }
      console.log('OK ' + JSON.stringify(forget(id))); break; }
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
    case 'observe': { const ids = args.filter(Boolean);
      if (ids.length < 2) { console.error('usage: kg.js observe <idA> <idB> [...more ids]'); process.exit(2); }
      console.log('OK ' + JSON.stringify(observe(ids))); break; }
    case 'predict': { const id = args[0];
      if (!id) { console.error('usage: kg.js predict <id>'); process.exit(2); }
      const p = predict(id);
      if (!p.length) console.log('(no matches)');
      else p.forEach(([other, c]) => console.log(`${other}  (${c} co-changes)`)); break; }
    default:
      console.error('commands: remember | link | forget | query | node | neighbors | snapshot | stats | observe | predict');
      process.exit(2);
  }
}
if (require.main === module) main();
module.exports = { remember, link, forget, query, getNode, neighbors, snapshot, stats, observe, predict, cochangeCounts };
