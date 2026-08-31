#!/usr/bin/env node
'use strict';
/**
 * check-agents.js — 楽園が名指しする司祭が実在するか確かめる
 *
 * 楽園は agent 名を **複数の場所** で名指しする:
 *   - graph/forge.js       … 各スケールの DAG の phase.agent
 *   - graph/clergy.js      … 各枢機卿が率いる priests[]
 *   - graph/examples/*.json … 出荷している見本 DAG の agent
 * しかし実体は `~/.claude/agents/*.md` にしかない。**名指しする場所が増えるたび
 * 宙吊り参照の入口が増える**。かつて forge.js だけを見ていたため、`frontend`
 * という実在しない司祭が clergy.js と examples に生き残り、検査は緑のままだった
 * （憲法 第21条）。よって検査は「名指しする全ての口」を走査する。
 *
 *   node graph/check-agents.js          # 検査（不足があれば exit 1）
 *   node graph/check-agents.js --list   # 必要な司祭の一覧（出所つき）
 *
 * ハーネス未配置の環境（CI など）では検査せず素通りする。存在しないものを
 * 責めるのではなく、存在すべきものが欠けていないかだけを見る。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const forge = require('./forge.js');
const clergy = require('./clergy.js');

/** engine 側の疑似エージェント（~/.claude に実体を持たない） */
const PSEUDO = new Set(['verification-loop']);

/**
 * 名指しする全ての口を走査し、agent名 -> それを名指した出所[] を返す。
 * 出所を持つことが要点 — 「誰が宙吊りを作ったか」まで言えねば直せない。
 */
function referenceMap(opts = {}) {
  const examplesDir = opts.examplesDir || path.join(__dirname, 'examples');
  const map = new Map();
  const add = (agent, source) => {
    if (!agent || PSEUDO.has(agent)) return;
    if (!map.has(agent)) map.set(agent, new Set());
    map.get(agent).add(source);
  };

  // ① forge.js — 全スケールの DAG
  for (const scale of Object.keys(forge.SCALES)) {
    for (const t of forge.buildDag('probe', scale).tasks) add(t.agent, `forge.js:${scale}`);
  }

  // ② clergy.js — 枢機卿団が率いる司祭
  for (const [id, c] of Object.entries(clergy.COLLEGE || {})) {
    for (const p of c.priests || []) add(p, `clergy.js:${id}`);
  }

  // ③ graph/examples/*.dag.json — 出荷している見本
  let files = [];
  try { files = fs.readdirSync(examplesDir).filter(f => f.endsWith('.json')); } catch { files = []; }
  for (const f of files) {
    let dag;
    try { dag = JSON.parse(fs.readFileSync(path.join(examplesDir, f), 'utf8')); } catch { continue; }
    for (const t of dag.tasks || []) add(t.agent, `examples/${f}`);
  }

  return map;
}

function requiredAgents(opts) {
  return [...referenceMap(opts).keys()].sort();
}

/**
 * 無主の相 — どの枢機卿にも執行官にも属さないフェーズ (憲法 第23条)
 *
 * DAG に相を足すのは forge.js、統べる者を決めるのは clergy.js。二箇所ある以上、
 * 片方だけ更新すれば **誰も審査しない相** が生まれる。実際 `prove` を新設した
 * 直後がその状態だった。宙吊り参照と同じ病である — 名は在るが担い手が居ない。
 */
function ungovernedPhases() {
  const governed = new Set();
  for (const c of Object.values(clergy.COLLEGE || {})) for (const g of c.governs || []) governed.add(g);
  for (const g of (clergy.TRIBUNAL && clergy.TRIBUNAL.governs) || []) governed.add(g);
  const out = [];
  for (const scale of Object.keys(forge.SCALES)) {
    for (const t of forge.buildDag('probe', scale).tasks) {
      if (!governed.has(t.id) && !out.some(o => o.phase === t.id)) out.push({ phase: t.id, scale });
    }
  }
  return out;
}

function installedAgents(dir) {
  try {
    return new Set(fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')));
  } catch { return null; }
}

function check(agentsDir, opts) {
  const dir = agentsDir || path.join(os.homedir(), '.claude', 'agents');
  const map = referenceMap(opts);
  const need = [...map.keys()].sort();
  const sources = {};
  for (const [a, s] of map) sources[a] = [...s].sort();
  const have = installedAgents(dir);
  if (!have || have.size === 0) {
    return { ok: true, skipped: true, dir, need, sources, missing: [], dangling: [],
             note: 'no harness at this path — nothing to verify' };
  }
  const missing = need.filter(a => !have.has(a));
  // 宙吊り参照 = 欠けている司祭 × それを名指した出所
  const dangling = missing.map(a => ({ agent: a, namedBy: sources[a] }));
  const ungoverned = ungovernedPhases();
  return {
    ok: missing.length === 0 && ungoverned.length === 0, skipped: false,
    dir, need, sources, missing, dangling, ungoverned,
    note: missing.length
      ? `${missing.length} agent(s) named by the paradise do not exist`
      : (ungoverned.length
          ? `${ungoverned.length} phase(s) belong to no cardinal and no tribunal`
          : 'every named priest exists and every phase has a master'),
  };
}

if (require.main === module) {
  if (process.argv.includes('--list')) {
    const map = referenceMap();
    for (const a of [...map.keys()].sort()) console.log(a, '←', [...map.get(a)].sort().join(', '));
    process.exit(0);
  }
  const res = check(process.argv[2]);
  console.log('═══════ ⛪ AGENT PRESENCE ═══════');
  console.log('agents dir:', res.dir);
  console.log('named by the paradise:', res.need.length, '(forge.js + clergy.js + examples)');
  if (res.skipped) console.log('  (harness not installed here — check skipped)');
  else if (res.dangling.length) {
    for (const d of res.dangling) console.log(`  🔴 missing: ${d.agent}  ← named by ${d.namedBy.join(', ')}`);
  } else console.log('  ✓ all present');
  if (!res.skipped) {
    if (res.ungoverned && res.ungoverned.length) {
      for (const u of res.ungoverned) console.log(`  🔴 ungoverned phase: ${u.phase}  (scale: ${u.scale}) — no cardinal, no tribunal`);
    } else console.log('  ✓ every phase has a master');
  }
  console.log('─────────────────────────────────');
  console.log(res.note);
  console.log('═════════════════════════════════');
  process.exit(res.ok ? 0 : 1);
}

module.exports = { check, requiredAgents, referenceMap, installedAgents, ungovernedPhases, PSEUDO };
