#!/usr/bin/env node
'use strict';
/**
 * trace-harvest.js — 起動の証跡を **ログから採る** 唯一の engine (M1)
 * ---------------------------------------------------------------------
 * 不変条件(この改修の背骨):
 *   **ログを読むのはこのファイルだけである。**
 *   `conclave.markDone` も `spawn-trace.verify` も `run.spawnTrace` しか見ない。
 *   採取(ここ)と判定(spawn-trace.js)を分けるから、判定器は純粋でいられる。
 *
 * 二系統を走査する。片方が空でも他方だけで打ち切らない(第45条の病の再生産を防ぐ):
 *   系統I  ~/.claude/projects/ ** /*.jsonl
 *          tool_use{name∈Task|Agent} → 同 id の tool_result{toolUseResult.agentId}
 *          → 子ログ <親jsonl の basename ディレクトリ>/subagents/agent-<agentId>.jsonl の実在
 *   系統II <hermes>/state.db : async_delegations  (node:sqlite / readOnly)
 *          dispatched_at は **epoch 秒 float** である。ISO 文字列として parse してはならない。
 *
 * 相への対応づけは三段の階梯を成す。誤って observed を刻めば「嘘の緑」であり、
 * no-trace より悪い(第5条)。ゆえに:
 *   階梯A (exact)     … 成果物パスの部分一致 / 既存 id の裏取り → apply が自動で刻む
 *   階梯B (suggested) … 時刻窓・役割名 → **刻まない**。suggestions[] に出して人に問う
 *   階梯C (unmatched) … どの相にも当たらない証跡。捨てずに残す
 *
 *   node graph/trace-harvest.js scan [--source id] [--root dir] [--db path] [--run f] [--json]
 *   node graph/trace-harvest.js apply <run.json> [--phase id] [--pick n] [--force] [--dry-run]
 *
 * exit: 0=拾えた / 1=拒否・不正 / 2=使い方の誤り / 3=harvest-blind(走ったが 1件も無い)
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const spawnTrace = require('./spawn-trace.js');

const ROOT = path.dirname(__dirname);
const SRC_JSONL = 'claude-jsonl';
const SRC_DELEG = 'hermes-async-delegations';
/** AC-1.3 の契約。この語は門が test() で測る — 勝手に言い換えない。 */
const BLIND_REASON = '走査できたが1件も拾えなかった — 採取器が壊れているのか、本当に発令が無いのかを人が判ずること';

const now = () => new Date().toISOString();
const norm = (s) => String(s || '').replace(/\\/g, '/').toLowerCase();

// ── 系統I: ~/.claude の JSONL ────────────────────────────────────────
function defaultClaudeRoot() { return path.join(os.homedir(), '.claude', 'projects'); }

function listJsonl(root) {
  const out = [];
  const walk = (d) => {
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.jsonl')) out.push(p);
    }
  };
  walk(root);
  return out;
}

/** 子ログの住所は版で揺れる。両形を試して見つかった方を採る(当てずっぽうではなく保険)。 */
function findChildLog(parentFile, agentId) {
  const cands = [
    path.join(parentFile.replace(/\.jsonl$/, ''), 'subagents', `agent-${agentId}.jsonl`),
    path.join(path.dirname(parentFile), 'subagents', `agent-${agentId}.jsonl`),
  ];
  for (const c of cands) { try { if (fs.statSync(c).isFile()) return c; } catch {} }
  return null;
}

function scanClaudeJsonl(root) {
  const src = { id: SRC_JSONL, scanned: 0, found: 0, skipped: 0, unavailable: null };
  const entries = [];
  let files;
  try { files = listJsonl(root); }
  catch (e) { src.unavailable = String(e.message || e); return { src, entries }; }
  if (!fs.existsSync(root)) { src.unavailable = `走査対象が無い: ${root}`; return { src, entries }; }

  for (const f of files) {
    src.scanned++;
    let lines;
    try { lines = fs.readFileSync(f, 'utf8').split(/\r?\n/); } catch { src.skipped++; continue; }
    const uses = new Map();     // tool_use_id -> { name, input, at }
    const results = [];         // { toolUseId, tur, at }
    for (const line of lines) {
      if (!line.trim()) continue;
      let o;
      try { o = JSON.parse(line); } catch { src.skipped++; continue; }
      const content = o && o.message && o.message.content;
      if (Array.isArray(content)) {
        for (const b of content) {
          if (b && b.type === 'tool_use' && (b.name === 'Task' || b.name === 'Agent')) {
            uses.set(b.id, { name: b.name, input: b.input || {}, at: o.timestamp || null });
          }
          if (b && b.type === 'tool_result' && o.toolUseResult && o.toolUseResult.agentId) {
            results.push({ toolUseId: b.tool_use_id, tur: o.toolUseResult, at: o.timestamp || null });
          }
        }
      }
    }
    for (const r of results) {
      const u = uses.get(r.toolUseId);
      const agentId = r.tur.agentId;
      const childLog = findChildLog(f, agentId);
      // 鎖として成立していない(子ログが無い)ものは entries に入れない。
      // AC-1.2 の `entries | all(.childLog != null)` を構造で満たす。
      if (!childLog) { src.skipped++; continue; }
      const input = (u && u.input) || {};
      const text = [input.description, input.prompt, r.tur.description, r.tur.prompt]
        .filter(Boolean).join('\n');
      entries.push({
        source: SRC_JSONL,
        toolUseId: r.toolUseId || null,
        parentToolUseId: null,
        agentId,
        agentType: r.tur.agentType || (input.subagent_type || null),
        state: r.tur.status || null,
        childLog,
        parentLog: f,
        at: r.at || (u && u.at) || null,
        text,
      });
      src.found++;
    }
  }
  return { src, entries };
}

// ── 系統II: state.db : async_delegations ────────────────────────────
function defaultDbPath() {
  const la = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(la, 'hermes', 'state.db');
}

function scanDelegations(dbPath) {
  const src = { id: SRC_DELEG, scanned: 0, found: 0, skipped: 0, unavailable: null };
  const entries = [];
  let sqlite;
  // 組込みが無い機体では「名乗る」。黙って 0 にしない(第44条)。sources の要素は残す。
  try { sqlite = require('node:sqlite'); }
  catch (e) { src.unavailable = 'node:sqlite 不在: ' + (e.message || e); return { src, entries }; }
  if (!fs.existsSync(dbPath)) { src.unavailable = `state.db が無い: ${dbPath}`; return { src, entries }; }

  let db;
  try { db = new sqlite.DatabaseSync(dbPath, { readOnly: true }); }
  catch (e) { src.unavailable = 'DB を開けない: ' + (e.message || e); return { src, entries }; }
  try {
    const rows = db.prepare(
      'SELECT delegation_id, state, dispatched_at, completed_at, event_json FROM async_delegations').all();
    for (const r of rows) {
      src.scanned++;
      let ev = {};
      try { ev = r.event_json ? JSON.parse(r.event_json) : {}; }
      catch { src.skipped++; ev = {}; }        // 壊れた 1件で走査全体を止めない
      const goal = [ev.goal, Array.isArray(ev.goals) ? ev.goals.join('\n') : null, ev.context]
        .filter(Boolean).join('\n');
      // dispatched_at は epoch 秒の float。ISO ではない — ここで正規化する。
      const at = typeof r.dispatched_at === 'number'
        ? new Date(r.dispatched_at * 1000).toISOString()
        : (r.dispatched_at || null);
      entries.push({
        source: SRC_DELEG,
        delegationId: r.delegation_id,
        agentType: ev.role || null,
        state: r.state,
        childLog: null,
        at,
        text: goal,
      });
      src.found++;
    }
  } catch (e) {
    src.unavailable = 'async_delegations を読めない: ' + (e.message || e);
  } finally {
    try { db.close(); } catch {}
  }
  return { src, entries };
}

// ── 相への対応づけ ──────────────────────────────────────────────────
function runPhases(run) {
  const out = [];
  if (run && run.domains) for (const d of run.domains) for (const p of d.phases || []) out.push(p);
  else if (run && run.phases) for (const p of run.phases) out.push(p);
  return out;
}

/** その相が「具体的なパス」を名乗っているか。抽象名(implementation/docs…)では突合しない。 */
function phasePaths(run, phase, runDir) {
  const out = [];
  const looksPath = (s) => typeof s === 'string' && /[\/\\]/.test(s) && /\.[a-z0-9]+$/i.test(s);
  if (looksPath(phase.artifactPath)) out.push(norm(phase.artifactPath));
  if (looksPath(phase.artifact)) out.push(norm(phase.artifact));
  else if (runDir && typeof phase.artifact === 'string' && /\.[a-z0-9]+$/i.test(phase.artifact)) {
    out.push(norm(path.join(runDir, phase.artifact)));
  }
  return out.filter(s => s.length >= 8);
}

function existingIds(run, phase) {
  const es = (run.spawnTrace && run.spawnTrace[phase.id]) || [];
  const ids = new Set();
  for (const e of es) {
    if (e.toolUseId) ids.add(e.toolUseId);
    if (e.parentToolUseId) ids.add(e.parentToolUseId);
    if (e.delegationId) ids.add(e.delegationId);
  }
  return ids;
}

/**
 * 階梯A(exact)と階梯B(suggested)を作る。
 * 一つの相に階梯A の候補が 2件以上あれば **刻まない**(曖昧を engine が独断で解かない・第51条b)。
 */
function correlate(entries, run, opts = {}) {
  const matches = [], suggestions = [], matchedEntries = new Set();
  if (!run) return { matches, suggestions, unmatched: entries.slice() };
  const runDir = opts.runDir || null;
  const windowMs = 30 * 60 * 1000;

  for (const phase of runPhases(run)) {
    const paths = phasePaths(run, phase, runDir);
    const ids = existingIds(run, phase);
    const exact = [];
    for (const e of entries) {
      const text = norm(e.text);
      if (paths.length && text && paths.some(p => text.includes(p))) {
        exact.push({ rule: 'A-1', entry: e });
        continue;
      }
      const eid = e.toolUseId || e.delegationId;
      if (eid && ids.has(eid)) exact.push({ rule: 'A-2', entry: e });
    }
    if (exact.length === 1) {
      matches.push({ phase: phase.id, confidence: 'exact', rule: exact[0].rule, entry: exact[0].entry });
      matchedEntries.add(exact[0].entry);
      continue;
    }
    if (exact.length > 1) {
      for (const x of exact) {
        suggestions.push({ phase: phase.id, confidence: 'suggested', rule: x.rule + '-ambiguous', entry: x.entry });
        matchedEntries.add(x.entry);
      }
      continue;
    }
    // 階梯B — 出すだけ。決して刻まない。
    const at = phase.dispatchedAt ? Date.parse(phase.dispatchedAt) : NaN;
    for (const e of entries) {
      let rule = null;
      if (!Number.isNaN(at) && e.at) {
        const d = Math.abs(Date.parse(e.at) - at);
        if (!Number.isNaN(d) && d <= windowMs) rule = 'B-time';
      }
      if (!rule && phase.agent && e.agentType && phase.agent === e.agentType) rule = 'B-role';
      if (rule) { suggestions.push({ phase: phase.id, confidence: 'suggested', rule, entry: e }); matchedEntries.add(e); }
    }
  }
  return { matches, suggestions, unmatched: entries.filter(e => !matchedEntries.has(e)) };
}

// ── scan / apply ────────────────────────────────────────────────────
function scan(opts = {}) {
  const want = opts.source;
  const sources = [], entries = [];
  const jsonlRoot = opts.root || defaultClaudeRoot();
  const dbPath = opts.db || defaultDbPath();

  // sources.length === 2 は **常に** 保つ。使えなくても要素を消さず unavailable を書く。
  if (!want || want === SRC_JSONL) {
    const r = scanClaudeJsonl(jsonlRoot); sources.push(r.src); entries.push(...r.entries);
  } else sources.push({ id: SRC_JSONL, scanned: 0, found: 0, skipped: 0, unavailable: `--source ${want} により走査せず` });
  if (!want || want === SRC_DELEG) {
    const r = scanDelegations(dbPath); sources.push(r.src); entries.push(...r.entries);
  } else sources.push({ id: SRC_DELEG, scanned: 0, found: 0, skipped: 0, unavailable: `--source ${want} により走査せず` });

  const total = sources.reduce((n, s) => n + s.found, 0);
  const cor = correlate(entries, opts.run || null, { runDir: opts.runDir });
  const out = {
    state: total > 0 ? 'ok' : 'harvest-blind',
    at: now(), roots: { claudeJsonl: jsonlRoot, db: dbPath },
    sources, entries, matches: cor.matches, suggestions: cor.suggestions, unmatched: cor.unmatched,
  };
  if (total === 0) out.reason = BLIND_REASON;
  return out;
}

/** 階梯A の matches のみを record() 経由で刻む。形式の分岐を 2 箇所に置かない。 */
function apply(run, res, opts = {}) {
  const legacy = run.traceSchema === undefined;
  if (legacy && !opts.force) {
    return { ok: false, applied: [], reason:
      'legacy run(traceSchema 無し)へ遡って刻むには --force を要する — 事後の書き戻しは誤対応を生みうる' };
  }
  let picked = res.matches;
  if (opts.phase) picked = picked.filter(m => m.phase === opts.phase);
  if (opts.pick != null) {
    const cands = (res.suggestions || []).filter(s => !opts.phase || s.phase === opts.phase);
    const s = cands[Number(opts.pick)];
    if (!s) return { ok: false, applied: [], reason: `--pick ${opts.pick} に当たる示唆が無い(候補 ${cands.length} 件)` };
    picked = picked.concat([s]);
  }
  const applied = [];
  for (const m of picked) {
    const e = m.entry;
    if (opts.dryRun) { applied.push({ phase: m.phase, rule: m.rule, id: e.toolUseId || e.delegationId }); continue; }
    spawnTrace.record(run, m.phase, {
      agent: e.agentType || null, source: e.source,
      toolUseId: e.toolUseId || null, agentId: e.agentId || null, childLog: e.childLog || null,
      delegationId: e.delegationId || null, state: e.state || null,
      by: 'trace-harvest',
    });
    run.history = run.history || [];
    run.history.push({ ts: now(), event: 'trace-harvest',
      detail: `${m.phase} ← ${e.source}:${e.toolUseId || e.delegationId} (${m.rule})` });
    applied.push({ phase: m.phase, rule: m.rule, id: e.toolUseId || e.delegationId });
  }
  return { ok: true, applied, dryRun: !!opts.dryRun };
}

// --- CLI ---
function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const flag = (n) => { const i = argv.indexOf(n); return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null; };
  const has = (n) => argv.includes(n);
  const json = has('--json');

  if (cmd === 'scan') {
    const runPath = flag('--run');
    let run = null, runDir = null;
    if (runPath) {
      try { run = JSON.parse(fs.readFileSync(runPath, 'utf8')); runDir = path.dirname(path.relative(ROOT, runPath)) || null; }
      catch (e) { console.error('--run を読めなかった: ' + e.message); process.exit(1); }
    }
    const res = scan({ source: flag('--source'), root: flag('--root'), db: flag('--db'), run, runDir });
    if (json) process.stdout.write(JSON.stringify(res) + '\n');
    else {
      console.log('═══════ 🌾 TRACE HARVEST ═══════');
      for (const s of res.sources) {
        console.log(`  ${s.id.padEnd(26)} scanned:${s.scanned}  found:${s.found}  skipped:${s.skipped}` +
          (s.unavailable ? `  — ${s.unavailable}` : ''));
      }
      console.log(`  matches: ${res.matches.length}  suggestions: ${res.suggestions.length}  unmatched: ${res.unmatched.length}`);
      if (res.reason) console.log('  ' + res.reason);
      console.log('════════════════════════════════');
    }
    process.exit(res.state === 'harvest-blind' ? 3 : 0);
  }

  if (cmd === 'apply') {
    const runPath = argv[1];
    if (!runPath || runPath.startsWith('--')) { console.error('usage: trace-harvest.js apply <run.json> [--phase id] [--pick n] [--force] [--dry-run]'); process.exit(2); }
    let run;
    try { run = JSON.parse(fs.readFileSync(runPath, 'utf8')); }
    catch (e) { console.error('run を読めなかった: ' + e.message); process.exit(1); }
    const res = scan({ source: flag('--source'), root: flag('--root'), db: flag('--db'),
      run, runDir: path.dirname(path.relative(ROOT, runPath)) || null });
    const ap = apply(run, res, { phase: flag('--phase'), pick: flag('--pick'), force: has('--force'), dryRun: has('--dry-run') });
    if (!ap.ok) { console.error(ap.reason); process.exit(1); }
    if (!ap.dryRun) fs.writeFileSync(runPath, JSON.stringify(run, null, 2));
    if (json) process.stdout.write(JSON.stringify(ap) + '\n');
    else {
      console.log(ap.dryRun ? '(dry-run — 何も書いていない)' : `刻んだ: ${ap.applied.length} 件`);
      for (const a of ap.applied) console.log(`  ${a.phase} ← ${a.id} (${a.rule})`);
      if (res.suggestions.length) console.log(`  示唆 ${res.suggestions.length} 件は刻んでいない — --pick <n> で人が選べ`);
    }
    process.exit(0);
  }

  console.error('commands: scan [--source id] [--root dir] [--db path] [--run f] [--json] | apply <run.json> [--phase id] [--pick n] [--force] [--dry-run]');
  process.exit(2);
}
if (require.main === module) main();

module.exports = { scan, apply, correlate, scanClaudeJsonl, scanDelegations,
  SRC_JSONL, SRC_DELEG, BLIND_REASON, defaultClaudeRoot, defaultDbPath };
