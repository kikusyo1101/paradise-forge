#!/usr/bin/env node
/**
 * PARADISE :: Gauge — the Scale of Proof (証明の秤)
 * ---------------------------------------------------------------
 * 「改善した」と語る者は、前後を数値で示さねばならない(第38条)。
 * 楽園には創造物を裁く門(verdict)はあったが、**走行そのもの
 * (trajectory)を測る秤が無かった**。成果物が通れば、荒れた走行
 * (差し戻しの嵐・無限の再試行)も見過ごされていた。
 *
 * 2026 年の定石: outcome だけでなく trajectory を採点する。
 * 決定的に測れるもの(再試行・差し戻し・ループ・完走)は決定的に測り、
 * LLM に尋ねない。定性の裁きは断罪機関(tribunal)の領分のまま。
 *
 * 採点式(全て run-state から機械的に導出。同じ入力には常に同じ点):
 *   score = 100 − 10×rework − 5×retryOverhead − 15×loopGuardTrips
 *               − 20×(未完走なら 1)         → clamp [0,100]
 *   - rework         : domain-rework / rework event の数(有害 = −1 の簡約)
 *   - retryOverhead  : Σattempts − 着手相数(中立 = 0 の簡約: 余分な試行)
 *   - loopGuardTrips : loop-guard 発動数(構造的暴走)
 *   - 完走           : 全 domain ratified(conclave)/ 全 phase done(orchestrator)
 *
 * 不在は通過ではない(第37条): 相を持たない run-state は 0 点でも
 * 100 点でもなく「測れない」— exit 2 で拒否する。
 *
 * 台帳は creations 側 gauge-ledger.jsonl(第30条: 走行の痕跡は
 * 創造物の寿命を生きる。engine repo には式だけが住む)。
 *
 * Usage:
 *   gauge.js score <run.json> [--json]        採点(決定的)
 *   gauge.js record <run.json> --slug <slug>  採点して台帳へ追記
 *   gauge.js baseline                         全既存 run-state を record
 *   gauge.js compare <slugA> <slugB>          台帳から Δ 表
 *   gauge.js compare --last <N>               直近 N 件の推移
 *   gauge.js ledger                           台帳の一覧
 */
'use strict';
const fs = require('fs');
const path = require('path');
const workspace = require('./workspace.js');
/**
 * 序列の集計は **spawn-trace が唯一の出所**である (第41条 / 第52条)。
 * gauge が自分で `tierTrace` を数え直せば、五値の定義が二箇所に住む。
 */
const trace = require('./spawn-trace.js');

const WEIGHTS = { rework: 10, retryOverhead: 5, loopGuard: 15, incomplete: 20, tierBreach: 10 };
const LEDGER_NAME = 'gauge-ledger.jsonl';

function ledgerPath() {
  return path.join(workspace.resolve().root, LEDGER_NAME);
}

/** run-state を正規化する: conclave 形式と orchestrator 形式の両方を読む。 */
function normalize(run) {
  const phases = [];
  let domainsTotal = null, domainsRatified = null;
  if (Array.isArray(run.domains)) {
    // conclave 形式: domains[].phases
    domainsTotal = run.domains.length;
    domainsRatified = run.domains.filter(d => d.status === 'ratified').length;
    for (const dom of run.domains) {
      const ps = Array.isArray(dom.phases) ? dom.phases : Object.values(dom.phases || {});
      for (const p of ps) phases.push({ id: p.id, status: p.status, attempts: p.attempts || 0 });
    }
  } else if (run.phases && typeof run.phases === 'object') {
    // orchestrator 形式: phases{id:{...}}
    for (const [id, p] of Object.entries(run.phases)) {
      phases.push({ id, status: p.status, attempts: p.attempts || 0 });
    }
  }
  const history = Array.isArray(run.history) ? run.history : [];
  return { phases, history, domainsTotal, domainsRatified };
}

/** 決定的採点。相を持たない run は Error を投げる(不在は通過ではない)。 */
function score(run) {
  const { phases, history, domainsTotal, domainsRatified } = normalize(run);
  if (!phases.length) {
    throw new Error('run-state carries no phases — 測れないものに点は付かない(第37条)');
  }
  const started0 = phases.filter(p => (p.attempts || 0) > 0);
  if (!started0.length) {
    throw new Error('run-state was never dispatched — 手つかずの走行に点は付かない(第37条)');
  }
  const events = history.map(h => h.event || '');
  const reworkCount = events.filter(e => /rework/.test(e)).length;
  const loopGuardTrips = events.filter(e => /loop-guard/.test(e)).length;

  const started = phases.filter(p => (p.attempts || 0) > 0);
  const sumAttempts = started.reduce((s, p) => s + p.attempts, 0);
  const retryOverhead = Math.max(0, sumAttempts - started.length);

  const doneCount = phases.filter(p => p.status === 'done').length;
  const complete = domainsTotal != null
    ? domainsRatified === domainsTotal
    : doneCount === phases.length;

  const firstPass = started.filter(p => p.attempts === 1 && p.status === 'done').length;
  const firstPassRate = started.length ? +(firstPass / started.length).toFixed(3) : 0;

  let ts0 = null, ts1 = null;
  if (history.length) { ts0 = Date.parse(history[0].ts); ts1 = Date.parse(history[history.length - 1].ts); }
  const durationMs = (ts0 != null && ts1 != null && !isNaN(ts0) && !isNaN(ts1)) ? ts1 - ts0 : null;

  /**
   * ── 序列の指標 (第52条 / H) ─────────────────────────────────────
   *
   * 「誰が働いたか」はこれまでどの項にも入らなかった。神託が述べた
   * 「教主の工数が圧倒的に多い」は、**`tier3Ratio` が下がることでしか反証できない**(第38条)。
   *
   * **既存9鍵は名も値も一切変えない。足すだけである。** 集計は自前で書かず
   * `spawn-trace` の四値をそのまま読む —— 定義が二箇所に住めば必ず食い違う。
   */
  const tt = (run && run.tierTrace) || {};
  const marked = phases.filter(p => tt[p.id]);
  const declaredIs = (n) => marked.filter(p => tt[p.id].declared === n && tt[p.id].state !== 'unobservable').length;
  const tier1 = declaredIs(1), tier2 = declaredIs(2);
  const tier3 = marked.filter(p => tt[p.id].state === '序列3').length;
  const unobservable = trace.hasEpoch(run)
    ? marked.filter(p => tt[p.id].state === 'unobservable').length
    // 印を持たない run は全相が観測不能である。**tier1 とは別の鍵で数える**(AC-H1)。
    : phases.length;
  const noTier = trace.hasEpoch(run)
    ? phases.filter(p => p.status === 'done' && (!tt[p.id] || tt[p.id].declared == null) && (!tt[p.id] || tt[p.id].state !== 'unobservable')).length
    : 0;
  // 序列1/2 を名乗りながら証跡の無い相 (門を素通りした legacy 台帳では立たない)
  const tier12Unproven = trace.hasEpoch(run)
    ? marked.filter(p => [1, 2].includes(tt[p.id].declared) && ['no-trace', 'asserted-only'].includes(tt[p.id].state)).length
    : 0;
  const tier3Ratio = phases.length ? +(tier3 / phases.length).toFixed(3) : 0;

  const raw = 100
    - WEIGHTS.rework * reworkCount
    - WEIGHTS.retryOverhead * retryOverhead
    - WEIGHTS.loopGuard * loopGuardTrips
    - WEIGHTS.incomplete * (complete ? 0 : 1)
    /**
     * **式は legacy に掛けない** (AC-H3)。過去の台帳の点を後から書き換えれば、
     * 比較の基準線そのものが動き、以後どの reform も改善を証明できなくなる。
     * **そして序列3は罰しない** — 神託の訂正が明示的に許した例外を秤が罰してはならない。
     */
    - (trace.hasEpoch(run) ? WEIGHTS.tierBreach * (noTier + tier12Unproven) : 0);
  const composite = Math.max(0, Math.min(100, raw));

  return {
    score: composite,
    complete,
    phasesTotal: phases.length,
    phasesDone: doneCount,
    domainsTotal, domainsRatified,
    firstPassRate,
    reworkCount,
    retryOverhead,
    loopGuardTrips,
    durationMs,
    // ── 序列 (足すだけ。既存鍵の名も値も動かさない) ──
    tier1, tier2, tier3, noTier, unobservable, tier3Ratio,
  };
}

function renderScore(m, label) {
  const lines = [];
  lines.push('═══════ ⚖️  GAUGE — 証明の秤 ═══════');
  if (label) lines.push(`  run    : ${label}`);
  lines.push(`  score  : ${m.score}/100 ${m.score >= 90 ? '🟢' : m.score >= 60 ? '🟡' : '🔴'}`);
  lines.push(`  complete      : ${m.complete ? '✓ 完走' : '✗ 未完走'} (phases ${m.phasesDone}/${m.phasesTotal}${m.domainsTotal != null ? `, domains ${m.domainsRatified}/${m.domainsTotal}` : ''})`);
  lines.push(`  firstPassRate : ${(m.firstPassRate * 100).toFixed(1)}%`);
  lines.push(`  reworkCount   : ${m.reworkCount}`);
  lines.push(`  retryOverhead : ${m.retryOverhead}`);
  lines.push(`  loopGuardTrips: ${m.loopGuardTrips}`);
  if (m.durationMs != null) lines.push(`  duration      : ${(m.durationMs / 60000).toFixed(1)} min`);
  lines.push('═══════════════════════════════════');
  return lines.join('\n');
}

// ---------- 台帳(追記型 JSONL / creations 側に住む: 第30条) ----------

function readLedger() {
  const p = ledgerPath();
  if (!fs.existsSync(p)) return [];
  // 追記型 JSONL は git マージで行が破損し得る。一行の破損で秤全体を
  // 倒さない — 破損行は警告して読み飛ばす(壊れた行は compare に使えないだけ)。
  const out = [];
  for (const line of fs.readFileSync(p, 'utf8').split('\n').filter(Boolean)) {
    try { out.push(JSON.parse(line)); }
    catch { console.error(`⚠️ ledger line skipped (corrupt): ${line.slice(0, 60)}…`); }
  }
  return out;
}

function record(runFile, slug) {
  const run = JSON.parse(fs.readFileSync(runFile, 'utf8'));
  const m = score(run);
  const entry = {
    ts: new Date().toISOString(),
    slug,
    scale: (run.meta && run.meta.scale) || null,
    metrics: m,
  };
  fs.appendFileSync(ledgerPath(), JSON.stringify(entry) + '\n');
  return entry;
}

/** 既存の全 run-state を台帳に刻む(基線)。 */
function baseline() {
  const root = workspace.resolve().root;
  const out = [];
  if (!fs.existsSync(root)) return out;
  for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const name of ['conclave.json']) {
      const f = path.join(root, dir.name, name);
      if (fs.existsSync(f)) {
        try { out.push(record(f, dir.name)); }
        catch (e) { out.push({ slug: dir.name, error: e.message }); }
      }
    }
    // orchestrator 形式 *.run.json も拾う
    for (const f of fs.readdirSync(path.join(root, dir.name)).filter(n => n.endsWith('.run.json'))) {
      try { out.push(record(path.join(root, dir.name, f), dir.name)); }
      catch (e) { out.push({ slug: dir.name, error: e.message }); }
    }
  }
  return out;
}

const COMPARE_KEYS = ['score', 'firstPassRate', 'reworkCount', 'retryOverhead', 'loopGuardTrips', 'tier3Ratio'];
/** 高いほど良い metric か */
// `tier3Ratio` は **下がるほど良い** — 教主の手の割合が減ることが改善である(第52条)。
const HIGHER_BETTER = { score: true, firstPassRate: true, reworkCount: false, retryOverhead: false, loopGuardTrips: false, tier3Ratio: false };

function latestFor(slug, entries) {
  const hits = entries.filter(e => e.slug === slug && e.metrics);
  return hits.length ? hits[hits.length - 1] : null;
}

function compare(a, b) {
  const entries = readLedger();
  const ea = latestFor(a, entries), eb = latestFor(b, entries);
  if (!ea || !eb) throw new Error(`ledger has no entry for: ${!ea ? a : b} — 記録なき前後は比較できない`);
  const lines = [];
  lines.push('═══════ ⚖️  GAUGE COMPARE — 前後の証明 ═══════');
  lines.push(`  ${'metric'.padEnd(15)} ${a.padStart(10)} ${b.padStart(10)}   Δ`);
  for (const k of COMPARE_KEYS) {
    const va = ea.metrics[k], vb = eb.metrics[k];
    const d = +(vb - va).toFixed(3);
    const better = d === 0 ? '→' : (HIGHER_BETTER[k] ? d > 0 : d < 0) ? '⬆ 改善' : '⬇ 悪化';
    lines.push(`  ${k.padEnd(15)} ${String(va).padStart(10)} ${String(vb).padStart(10)}   ${d >= 0 ? '+' + d : d} ${better}`);
  }
  lines.push('══════════════════════════════════════════════');
  return lines.join('\n');
}

function renderLedger(entries) {
  const lines = ['═══════ 📒 GAUGE LEDGER ═══════'];
  for (const e of entries) {
    if (e.error) { lines.push(`  ✗ ${e.slug}: ${e.error}`); continue; }
    lines.push(`  ${e.ts.slice(0, 16)}  ${String(e.metrics.score).padStart(3)}/100  ${e.slug}${e.scale ? ` (${e.scale})` : ''}`);
  }
  if (entries.length === 0) lines.push('  (empty — まだ何も測られていない)');
  lines.push('═══════════════════════════════');
  return lines.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  try {
    if (cmd === 'score') {
      const file = argv[1];
      if (!file) { console.error('usage: gauge.js score <run.json> [--json]'); process.exit(3); }
      const run = JSON.parse(fs.readFileSync(file, 'utf8'));
      const m = score(run);
      if (argv.includes('--json')) console.log(JSON.stringify(m));
      else console.log(renderScore(m, path.basename(path.dirname(path.resolve(file)))));
      return;
    }
    if (cmd === 'record') {
      const file = argv[1];
      const si = argv.indexOf('--slug');
      const slug = si >= 0 ? argv[si + 1] : null;
      if (!file || !slug) { console.error('usage: gauge.js record <run.json> --slug <slug>'); process.exit(3); }
      const e = record(file, slug);
      console.log(`📒 recorded: ${e.slug} → ${e.metrics.score}/100 (${ledgerPath()})`);
      return;
    }
    if (cmd === 'baseline') {
      const out = baseline();
      console.log(renderLedger(out));
      return;
    }
    if (cmd === 'compare') {
      if (argv[1] === '--last') {
        const n = Number(argv[2] || 5);
        if (!Number.isInteger(n) || n < 1) { console.error('usage: gauge.js compare --last <N≥1>'); process.exit(3); }
        const entries = readLedger().filter(e => e.metrics).slice(-n);
        console.log(renderLedger(entries));
        return;
      }
      if (!argv[1] || !argv[2]) { console.error('usage: gauge.js compare <slugA> <slugB> | compare --last N'); process.exit(3); }
      console.log(compare(argv[1], argv[2]));
      return;
    }
    if (cmd === 'ledger') { console.log(renderLedger(readLedger())); return; }
    console.error('commands: score <run.json> [--json] | record <run.json> --slug <s> | baseline | compare <a> <b> | compare --last N | ledger');
    process.exit(3);
  } catch (e) {
    console.error('🔴 ' + e.message);
    process.exit(2);
  }
}

if (require.main === module) main();
module.exports = { score, normalize, record, baseline, compare, readLedger, ledgerPath, WEIGHTS };
