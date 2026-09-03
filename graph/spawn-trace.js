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
 * かつてここには「parent_tool_use_id を確認することが実体を検証する唯一の確実な
 * 手段である」と書かれていた。**実測はそれを否定した** —— 本機の ~/.claude を
 * 8,849 行走査して `parentToolUseId` は **0 件**である(findings/design 相の実測)。
 * 必要条件にすれば門は永久に赤であり、赤い門は無視される門になる(第34条の同型)。
 * ゆえに `observed` は次の **いずれか** で立つ(第16条 — 断定は実測に従う):
 *   (a) `toolUseId` が在る。`agentId`/`childLog` を **名乗ったなら** その実在も検める
 *   (b) `delegationId` が在り、その `state` が completed / running である
 *   (c) `parentToolUseId` が在る —— 十分条件の一つに降格した
 *
 * さらに MAST (arXiv:2503.13657) の FM-2.6「推論と実行の不一致」13.98% は
 * まさにこの穴である — 「委譲する」と述べながら自分で実行する挙動。
 *
 *   node graph/spawn-trace.js record <run.json> <phase> --agent <name> --tool-use-id <id>
 *   node graph/spawn-trace.js verify <run.json> <phase>     # 起動されたか（無ければ exit 1）
 *   node graph/spawn-trace.js report <run.json> [--json]    # 全相の起動状況(四値+legacy)
 *
 * 値は五つある: observed / asserted-only / waived / no-trace / legacy。
 * **`waived`(棄権)は「通した」であって「観測した」ではない。緑ではない。**
 * **`legacy`(新門以前の走行)は「証跡が無い」ではなく「判定していない」である。**
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
 * 証跡の kind を決める。**名乗らなければ検めない、名乗ったら検める。**
 *   厚い証跡(採取器が刻むもの)は実在検査を受け、薄い申告(手で record するもの)は
 *   従来どおり toolUseId の有無だけで裁く。両者に別の規則を置けば分岐が二重になる。
 */
function kindOf(evidence) {
  if (evidence.kind === 'waived') return 'waived';
  // (b) Hermes の発令台帳。id と state の両方が要る
  if (evidence.delegationId &&
      (evidence.state === 'completed' || evidence.state === 'running')) return 'observed';
  // (a) tool_use の id。agentId / childLog を **名乗ったなら** その実在も検める
  if (evidence.toolUseId) {
    if (evidence.childLog && !fs.existsSync(evidence.childLog)) return 'asserted';
    if (evidence.agentId && typeof evidence.agentId !== 'string') return 'asserted';
    return 'observed';
  }
  // (c) 親参照。必要条件ではなく十分条件の一つ
  if (evidence.parentToolUseId) return 'observed';
  return 'asserted';
}

/**
 * 起動の証跡を刻む。証跡は **観測されたもの** だけを `observed` と呼ぶ。
 * `toolUseId` も `delegationId` も無い記録は「起動したと自称している」に過ぎない。
 * `kind:'waived'` は人が理由を添えて通した相であり、観測ではない(第16条)。
 */
function record(run, phase, evidence = {}) {
  run.spawnTrace = run.spawnTrace || {};
  const kind = kindOf(evidence);
  const entry = {
    phase,
    agent: evidence.agent || null,
    // Claude Code が返す tool_use の id。これが実在の証。
    toolUseId: evidence.toolUseId || null,
    // 子のメッセージが持つ親参照。かつて「唯一の手段」と呼ばれたが、実測 0 件だった。
    parentToolUseId: evidence.parentToolUseId || null,
    // 採取器(trace-harvest.js)が添える厚い証跡
    source: evidence.source || null,
    agentId: evidence.agentId || null,
    childLog: evidence.childLog || null,
    delegationId: evidence.delegationId || null,
    state: evidence.state || null,
    // 棄権のときのみ意味を持つ。理由なき棄権は棄権ではない(第44条)
    reason: evidence.reason || null,
    by: evidence.by || null,
    rank: evidence.rank || null,
    at: now(),
    // 観測できたか、自己申告か、棄権か。ここを曖昧にしない。
    kind,
  };
  run.spawnTrace[phase] = run.spawnTrace[phase] || [];
  run.spawnTrace[phase].push(entry);
  return entry;
}

/**
 * その相が本当に発令されたか。
 * 四値 + legacy の第五の値で返す:
 *   observed / asserted-only / waived / no-trace / legacy
 * `ok` は「進行を許してよいか」であって「観測できたか」ではない。
 * ゆえに `waived` は ok:true だが緑ではない —— 報告は `clean` で別に名乗る(第16条)。
 * legacy は **証跡がゼロの相にのみ** 適用する。証跡が在れば legacy run でも普通に裁く
 * (測れるものは測る)。
 */
function verify(run, phase, opts = {}) {
  const entries = (run.spawnTrace && run.spawnTrace[phase]) || [];
  if (!entries.length) {
    if (opts.legacy) {
      return { ok: true, state: 'legacy', phase,
        reason: 'この走行は新門の導入以前に建てられたため、証跡について判定していない' };
    }
    return { ok: false, state: 'no-trace', phase,
      reason: 'この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない' };
  }
  const observed = entries.filter(e => e.kind === 'observed');
  if (observed.length) {
    return { ok: true, state: 'observed', phase, entries: observed,
      reason: `${observed.length} 件の起動を観測: ${observed.map(e => e.agent || '?').join(', ')}` };
  }
  const waived = entries.filter(e => e.kind === 'waived');
  if (waived.length) {
    return { ok: true, state: 'waived', phase, entries: waived,
      reason: `棄権: ${waived.map(e => e.reason || '(理由なし)').join(' / ')}` };
  }
  return { ok: false, state: 'asserted-only', phase, entries,
    reason: '「起動した」という自己申告だけで、tool_use の証跡が無い。主張は証拠ではない(第5条)' };
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

  // ⚠️ 引数の型検査を **足さない**。パス文字列を渡すと静かに total:0 を返す現在の挙動は
  // pulse.readSpawn の防御が測る対象であり、故障注入門の前提である(design §4.2 #6)。
  //
  // legacy と呼ぶのは「版の印が無く、かつ証跡を一つも持たない走行」に限る。
  // 版の印が無くとも証跡が在る走行は **測れる** —— 測れるものを「判定していない」と
  // 呼べば、それは第16条の裏面(測ったものを測っていないと言う)に落ちる。
  const traced = Object.values(run.spawnTrace || {}).some(v => Array.isArray(v) && v.length);
  const legacyRun = run.traceSchema === undefined && !traced;
  const rows = phases.map(id => verify(run, id, { legacy: legacyRun }));
  const bypassed = rows.filter(r => !r.ok);
  const of = (s) => rows.filter(r => r.state === s);
  return {
    ok: bypassed.length === 0,
    // clean = 「全相が observed か」。ok と clean を分けるのが M4 の本体である。
    clean: rows.length > 0 && of('observed').length === rows.length,
    total: rows.length,
    observed: of('observed').length,
    assertedOnly: of('asserted-only').length,
    waived: of('waived').length,
    noTrace: of('no-trace').length,
    legacy: of('legacy').length,
    waivedPhases: of('waived').map(r => r.phase),
    traceSchema: run.traceSchema,
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
    console.error('usage: spawn-trace.js [record|verify|report] <run.json> [phase] [--agent n] [--tool-use-id id] [--parent-tool-use-id id] [--agent-id id] [--child-log p] [--delegation-id id] [--state s] [--waive "理由"] [--rank r] [--json]');
    process.exit(2);
  }
  const run = loadRun(runPath);

  if (cmd === 'record') {
    if (!phase) { console.error('record needs a phase'); process.exit(2); }
    const waive = flag('--waive');
    const e = record(run, phase, {
      agent: flag('--agent'), toolUseId: flag('--tool-use-id'),
      parentToolUseId: flag('--parent-tool-use-id'), rank: flag('--rank'),
      agentId: flag('--agent-id'), childLog: flag('--child-log'),
      delegationId: flag('--delegation-id'), state: flag('--state'),
      source: flag('--source'),
      kind: waive ? 'waived' : undefined, reason: waive || undefined,
    });
    saveRun(runPath, run);
    const icon = e.kind === 'observed' ? '✓ observed' : e.kind === 'waived' ? '⚑ waived' : '⚠️  asserted';
    console.log(`${icon} ${phase} ← ${e.agent || '?'}`);
    if (e.kind === 'asserted') console.log('   (tool_use id が無い — これは証拠ではなく自己申告である)');
    if (e.kind === 'waived') console.log('   (棄権は「通した」であって「観測した」ではない — 緑ではない)');
    process.exit(0);
  }
  if (cmd === 'verify') {
    if (!phase) { console.error('verify needs a phase'); process.exit(2); }
    const traced = Object.values(run.spawnTrace || {}).some(v => Array.isArray(v) && v.length);
    const r = verify(run, phase, { legacy: run.traceSchema === undefined && !traced });
    console.log(`${r.ok ? '✓' : '🔴'} ${phase}: ${r.reason}`);
    process.exit(r.ok ? 0 : 1);
  }
  if (cmd === 'report') {
    const r = report(run);
    if (process.argv.includes('--json')) {
      const { rows, bypassed, ...rest } = r;
      process.stdout.write(JSON.stringify({ ...rest,
        rows: rows.map(x => ({ phase: x.phase, state: x.state, ok: x.ok, reason: x.reason })),
        bypassed: bypassed.map(x => x.phase) }) + '\n');
      process.exit(r.ok ? 0 : 1);
    }
    console.log('═══════ 👁  SPAWN TRACE ═══════');
    console.log(`phases: ${r.total}   observed: ${r.observed}   asserted-only: ${r.assertedOnly}   waived: ${r.waived}   no-trace: ${r.noTrace}   legacy: ${r.legacy}`);
    for (const row of r.rows) {
      const icon = row.state === 'observed' ? '✓' : row.state === 'waived' ? '⚑'
        : row.state === 'legacy' ? '？' : row.state === 'asserted-only' ? '⚠️ ' : '🔴';
      console.log(`  ${icon} ${row.phase.padEnd(12)} ${row.reason}`);
    }
    console.log('───────────────────────────────');
    // 棄権と legacy は **沈黙で通さない**(第44条)。通したことを名指しで言う。
    if (r.waived) console.log(`棄権 ${r.waived} 相: ${r.waivedPhases.join(', ')} — 通したが観測はしていない`);
    if (r.legacy) console.log(`legacy ${r.legacy} 相 — この走行は新門の導入以前に建てられたため、証跡について判定していない`);
    console.log(r.ok ? 'every phase was actually dispatched' :
      `${r.bypassed.length} phase(s) bypassed the hierarchy — the ladder was declared but not walked`);
    if (r.ok && !r.clean) console.log('(ok:true / clean:false — 全相を観測したわけではない)');
    console.log('═══════════════════════════════');
    process.exit(r.ok ? 0 : 1);
  }
  console.error(`unknown command: ${cmd}`);
  process.exit(2);
}

module.exports = { record, verify, report, kindOf };
