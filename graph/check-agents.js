#!/usr/bin/env node
'use strict';
/**
 * check-agents.js — forge が名指しする司祭が実在するか確かめる
 *
 * `forge.js` はフェーズごとに agent 名を書くが、その実体は ~/.claude/agents/ に
 * 置かれる（README ①）。両者は別の場所にあるため、片方だけ更新すると
 * 「存在しない司祭に発令する」宙吊り参照が生まれる — 実際に `frontend` が
 * その状態で full スケールに残っていた。
 *
 *   node graph/check-agents.js          # 検査（不足があれば exit 1）
 *   node graph/check-agents.js --list   # 必要な司祭の一覧を出す
 *
 * ハーネス未配置の環境（CI など）では検査せず素通りする。存在しないものを
 * 責めるのではなく、存在すべきものが欠けていないかだけを見る。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const forge = require('./forge.js');

/** engine 側の疑似エージェント（~/.claude に実体を持たない） */
const PSEUDO = new Set(['verification-loop']);

function requiredAgents() {
  const need = new Set();
  for (const scale of Object.keys(forge.SCALES)) {
    for (const t of forge.buildDag('probe', scale).tasks) {
      if (t.agent && !PSEUDO.has(t.agent)) need.add(t.agent);
    }
  }
  return [...need].sort();
}

function installedAgents(dir) {
  try {
    return new Set(fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')));
  } catch { return null; }
}

function check(agentsDir) {
  const dir = agentsDir || path.join(os.homedir(), '.claude', 'agents');
  const need = requiredAgents();
  const have = installedAgents(dir);
  if (!have || have.size === 0) {
    return { ok: true, skipped: true, dir, need, missing: [], note: 'no harness at this path — nothing to verify' };
  }
  const missing = need.filter(a => !have.has(a));
  return { ok: missing.length === 0, skipped: false, dir, need, missing,
           note: missing.length ? `${missing.length} agent(s) named by forge.js do not exist` : 'every phase names a priest that exists' };
}

if (require.main === module) {
  if (process.argv.includes('--list')) {
    console.log(requiredAgents().join('\n'));
    process.exit(0);
  }
  const res = check(process.argv[2]);
  console.log('═══════ ⛪ AGENT PRESENCE ═══════');
  console.log('agents dir:', res.dir);
  console.log('required by forge.js:', res.need.length);
  if (res.skipped) console.log('  (harness not installed here — check skipped)');
  else if (res.missing.length) for (const m of res.missing) console.log('  🔴 missing:', m);
  else console.log('  ✓ all present');
  console.log('─────────────────────────────────');
  console.log(res.note);
  console.log('═════════════════════════════════');
  process.exit(res.ok ? 0 : 1);
}

module.exports = { check, requiredAgents, installedAgents, PSEUDO };
