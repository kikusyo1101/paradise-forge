#!/usr/bin/env node
'use strict';
/**
 * spawn-trace.js — 「実際に起動したか」を観測する (憲法 第27条)
 *
 * 楽園は第25条で階層に実体を与え、権能まで機械適用した。だが自ら認めた通り、
 * **実際に起動したことを確かめる手段を持っていなかった**。
 * 宣言と権能があっても、教主が己の手で全部やってしまえば同じ結果が残る。
 * 成果物だけを見る `contract.js` はそれを見抜けない — 誰が作ったかを問わないからだ。
 *
 * 調査 (Claude Agent SDK docs) が唯一確実な手段を名指ししている:
 *   「tool_use.name in ("Task","Agent") を検出し、子の中のメッセージが
 *     parent_tool_use_id を持つことを確認する。
 *     **これが『実体があるか』を検証する唯一確実な手段である**」
 *
 * さらに MAST (arXiv:2503.13657) の FM-2.6「推論と実行の不一致」13.98% は
 * まさにこの穴である — 「委譲する」と述べながら自分で実行する挙動。
 *
 *   node graph/spawn-trace.js record <run.json> <phase> --agent <name> --tool-use-id <id>
 *   node graph/spawn-trace.js verify <run.json> <phase>     # 起動されたか（無ければ exit 1）
 *   node graph/spawn-trace.js report <run.json>             # 全相の起動状況
 *
 * 観測できないことは「起動した」と主張しない。判定不能は緑ではない(第16条)。
 */
const fs = require('fs');
const path = require('path');

const now = () => new Date().toISOString();

function loadRun(runPath) {
  return JSON.parse(fs.readFileSync(runPath, 'utf8'));
}
function saveRun(runPath, run) {
  fs.writeFileSync(runPath, JSON.stringify(run, null, 2));
}

/**
 * 起動の証跡を刻む。証跡は **観測されたもの** だけを記録する。
 * `toolUseId` が無い記録は「起動したと自称している」に過ぎず、証拠ではない。
 */
function record(run, phase, evidence = {}) {
  run.spawnTrace = run.spawnTrace || {};
  const entry = {
    phase,
    agent: evidence.agent || null,
    // Claude Code が返す tool_use の id。これが実在の証。
    toolUseId: evidence.toolUseId || null,
    // 子のメッセージが持つ親参照。docs が「唯一確実」と呼ぶもの。
    parentToolUseId: evidence.parentToolUseId || null,
    rank: evidence.rank || null,
    at: now(),
    // 観測できたか、自己申告か。ここを曖昧にしない。
    kind: evidence.toolUseId || evidence.parentToolUseId ? 'observed' : 'asserted',
  };
  run.spawnTrace[phase] = run.spawnTrace[phase] || [];
  run.spawnTrace[phase].push(entry);
  return entry;
}

/**
 * その相が本当に発令されたか。
 * 三値で返す — 観測済み / 自己申告のみ / 証跡なし。
 * 「自己申告のみ」を緑にしないことが要点である。
 */
function verify(run, phase) {
  const entries = (run.spawnTrace && run.spawnTrace[phase]) || [];
  if (!entries.length) {
    return { ok: false, state: 'no-trace', phase,
      reason: 'この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない' };
  }
  const observed = entries.filter(e => e.kind === 'observed');
  if (!observed.length) {
    return { ok: false, state: 'asserted-only', phase, entries,
      reason: '「起動した」という自己申告だけで、tool_use の証跡が無い。主張は証拠ではない(第5条)' };
  }
  return { ok: true, state: 'observed', phase, entries: observed,
    reason: `${observed.length} 件の起動を観測: ${observed.map(e => e.agent || '?').join(', ')}` };
}

/**
 * 走行全体の起動状況。**どの相が階層を素通りしたか**が一目で分かる形にする。
 * 素通りは静かに起きるので、静かなまま終わらせない。
 */
function report(run) {
  const phases = [];
  const collect = (list) => { for (const p of list || []) phases.push(p.id); };
  if (run.domains) for (const d of run.domains) collect(d.phases);
  else collect(run.phases);

  const rows = phases.map(id => verify(run, id));
  const bypassed = rows.filter(r => !r.ok);
  return {
    ok: bypassed.length === 0,
    total: rows.length,
    observed: rows.filter(r => r.state === 'observed').length,
    assertedOnly: rows.filter(r => r.state === 'asserted-only').length,
    noTrace: rows.filter(r => r.state === 'no-trace').length,
    rows, bypassed,
  };
}

if (require.main === module) {
  const [cmd, runPath, phase] = process.argv.slice(2);
  const flag = (name) => {
    const i = process.argv.indexOf(name);
    return i > -1 ? process.argv[i + 1] : null;
  };
  if (!cmd || !runPath) {
    console.error('usage: spawn-trace.js [record|verify|report] <run.json> [phase] [--agent n] [--tool-use-id id] [--parent-tool-use-id id] [--rank r]');
    process.exit(2);
  }
  const run = loadRun(runPath);

  if (cmd === 'record') {
    if (!phase) { console.error('record needs a phase'); process.exit(2); }
    const e = record(run, phase, {
      agent: flag('--agent'), toolUseId: flag('--tool-use-id'),
      parentToolUseId: flag('--parent-tool-use-id'), rank: flag('--rank'),
    });
    saveRun(runPath, run);
    console.log(`${e.kind === 'observed' ? '✓ observed' : '⚠️  asserted'} ${phase} ← ${e.agent || '?'}`);
    if (e.kind === 'asserted') console.log('   (tool_use id が無い — これは証拠ではなく自己申告である)');
    process.exit(0);
  }
  if (cmd === 'verify') {
    if (!phase) { console.error('verify needs a phase'); process.exit(2); }
    const r = verify(run, phase);
    console.log(`${r.ok ? '✓' : '🔴'} ${phase}: ${r.reason}`);
    process.exit(r.ok ? 0 : 1);
  }
  if (cmd === 'report') {
    const r = report(run);
    console.log('═══════ 👁  SPAWN TRACE ═══════');
    console.log(`phases: ${r.total}   observed: ${r.observed}   asserted-only: ${r.assertedOnly}   no-trace: ${r.noTrace}`);
    for (const row of r.rows) {
      const icon = row.state === 'observed' ? '✓' : row.state === 'asserted-only' ? '⚠️ ' : '🔴';
      console.log(`  ${icon} ${row.phase.padEnd(12)} ${row.reason}`);
    }
    console.log('───────────────────────────────');
    console.log(r.ok ? 'every phase was actually dispatched' :
      `${r.bypassed.length} phase(s) bypassed the hierarchy — the ladder was declared but not walked`);
    console.log('═══════════════════════════════');
    process.exit(r.ok ? 0 : 1);
  }
  console.error(`unknown command: ${cmd}`);
  process.exit(2);
}

module.exports = { record, verify, report };
