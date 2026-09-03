#!/usr/bin/env node
'use strict';
/**
 * pulse.js — 楽園の断面 (snapshot) を作る唯一の engine (第22条 / 第16条)
 *
 * 画面が engine を個別に呼ぶ設計では「画面が出した数」と「engine が出した数」の
 * 突合点が画面の数だけ増え、門が書けない。**断面という単一の突合点**を置けば、
 * 門は「断面の数 == その場で数えた数」の 1 式で書ける。
 *
 *   node graph/pulse.js snapshot --json          断面を 1 個 stdout へ
 *   node graph/pulse.js serve [--port n]         SSE + 静的配信の常駐サーバ
 *   node graph/pulse.js freshness --age-ms n --transport sse|poll|frozen
 *
 * ■ 掟 (design.md §1.2 / NFR-07)
 *   engine は require で常駐させる。**子プロセスを産まない。**
 *   実測 137 倍差: 子プロセス 27〜73ms/engine に対し、常駐 require は 0.53ms。
 *   ゆえに本ファイルに child_process / execFileSync / spawnSync / execSync は
 *   1 件も現れない (AC-N07a)。
 *
 * ■ 掟 (FR-06)
 *   census は呼ばない。census.js は自己診断を子プロセスで丸ごと回すため実測
 *   120,072ms。同期経路に置けば画面が 2 分固まる。断面は census:null を持ち、
 *   画面は data-awaiting で「何を待っているか」を名指しする。
 *
 * ■ 掟 (design.md §1.5.1 — 本 engine で最も重要な一節)
 *   try/catch の殻は「engine が投げてくれる」ことを前提にしている。
 *   **投げない engine がある。** spawn-trace.report() にパス文字列を渡すと
 *   例外を投げず {ok:true,total:0,noTrace:0} を返す。ok:true を信じてはならない。
 *   ゆえに殻(投げる故障を捕らえる)と事前 assert(投げない故障を返り値の妥当性で
 *   捕らえる)の 2 段構えを取る。第16条「判定不能は緑ではない」は engine が緑を
 *   返してきた場合にも適用される。
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

// --- engine を module として常駐させる (NFR-07 / AC-N07c) ---
const clergy = require('./clergy.js');
const forge = require('./forge.js');
const workspace = require('./workspace.js');
const kg = require('./kg.js');
const wiring = require('./wiring.js');
const vendor = require('./vendor.js');
const derived = require('./derived.js');
const checkAgents = require('./check-agents.js');
const gauge = require('./gauge.js');
const spawnTrace = require('./spawn-trace.js');
const dailyGuard = require('./daily-guard.js');
const lessons = require('./lessons.js');
const codex = require('./codex.js');

const ROOT = path.join(__dirname, '..');
const GRAPH = __dirname;
const DASHBOARD = path.join(ROOT, 'dashboard');
const SCHEMA_VERSION = 1;

/**
 * 判定に使う定数。**1 箇所で定義し、二重に書かない** (AC-RT-2 / AC-08b / AC-07b)。
 * 画面が 10000 を、engine が 12000 を持てば、同じ断面に対して画面と engine が
 * 違う鮮度を言う。嘘は齟齬から生まれる。
 */
const T = {
  FIRST_EVENT_TIMEOUT_MS: 5000,   // 接続後これだけ無音なら降格
  ERROR_STREAK: 2,                // onerror がこの回数連続したら降格
  POLL_INTERVAL_MS: 2000,         // 第2層の間隔
  PROMOTE_RETRY_MS: 30000,        // 第1層への再挑戦間隔
  RETRY_HINT_MS: 1000,            // サーバが retry: で指示する値
  KEEPALIVE_MS: 15000,            // : ping の間隔
  WATCH_DEBOUNCE_MS: 80,          // fs.watch のデバウンス (50〜100ms / AC-11e)
  FRESH_LIVE_MS: 10000,           // 生 / 遅延 の境
  FRESH_FROZEN_MS: 60000,         // 遅延 / 凍結 の境
  DEFAULT_PORT: 7317,
};

const nowMs = () => Date.now();
const hr = () => process.hrtime.bigint();
const msSince = (t0) => Number(hr() - t0) / 1e6;

/**
 * 故障注入の入口 (design.md §1.5)。AC-01e / AC-20d が要求する検査手段であり、
 * テスト専用である。PULSE_FAULT=clergy なら clergy の呼び出しが必ず例外になる。
 */
function faulted(engineName) {
  const f = process.env.PULSE_FAULT;
  if (!f) return false;
  return f.split(',').map(s => s.trim()).includes(engineName);
}

/**
 * engine 呼び出しの殻。1 つの engine が落ちても他の鍵は揃う (AC-01e)。
 * **欠けた鍵は null にする。0 や空配列で埋めない** —
 * 0 は「数えて 0 だった」、null は「数えられなかった」であり、画面はこれを
 * 別の状態として出す。推測で埋めることが最大の嘘である (NFR-06)。
 */
function guard(errors, engine, key, fn, fallback = null) {
  try {
    if (faulted(engine)) throw new Error(`PULSE_FAULT=${engine} — 故障注入`);
    return fn();
  } catch (e) {
    errors.push({
      engine, key,
      reason: String((e && e.message) || e).split('\n')[0],
      at: nowMs(), fatal: false,
    });
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────
// §1.3.2a 創造物と作業場を数える唯一の関数。ここ以外で倉を readdirSync しない
// ─────────────────────────────────────────────────────────────

/**
 * 除外規則は 2 段。順序も含めて固定する:
 *   1. isDirectory()          — 倉直下には engine の台帳 (gauge-ledger.jsonl) も置かれる
 *   2. !name.startsWith('.')  — .git / .github は VCS と CI の骨組みであって創造物ではない。
 *                               bash 側の `ls -d <root>/x/` はドットを出さないので node を合わせる
 * `_` 始まりは除かず **分ける** — 作業場として必ず数える。捨てない。
 */
function visibleDirs(root) {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .filter(e => !e.name.startsWith('.'));
}
const isWorkshop = (e) => e.name.startsWith('_');

/** run の列挙。slug を CLI に渡す経路が構造上どこにも無い (D-13 の構造的回避) */
function listRuns(root) {
  return visibleDirs(root)
    .filter(e => !isWorkshop(e))                    // 作業場は run ではない
    .map(e => ({ name: e.name, path: path.join(root, e.name, 'conclave.json') }))
    .filter(r => fs.existsSync(r.path));            // D-6: 不在と 0 件を取り違えない
}

// ─────────────────────────────────────────────────────────────
// §1.3.3 gates — 門ごとに入口が違う。一律 check() で呼んではならない
// ─────────────────────────────────────────────────────────────
const GATES = [
  ['wiring', () => {
    const r = wiring.check();
    return { ok: !!r.ok, detail: { orphans: (r.orphans || []).length, dangling: (r.dangling || []).length } };
  }],
  ['vendor', () => {
    const r = vendor.verify();                       // ← check ではない (罠 T-7)
    return { ok: !!r.ok, detail: { findings: (r.findings || []).length } };
  }],
  ['derived', () => {
    const r = derived.check();
    return { ok: !!r.ok, detail: { undeclared: (r.undeclared || []).length } };
  }],
  ['check-agents', () => {
    const r = checkAgents.check();
    return { ok: !!r.ok, detail: { missing: (r.missing || []).length, ungoverned: (r.ungoverned || []).length } };
  }],
  ['workspace', () => {
    const h = workspace.hardcodedRefs();             // ← check は無い (罠 T-8)
    const s = workspace.strayCreations();            // ← 2 本を合成して ok を作る
    return { ok: h.length === 0 && s.length === 0, detail: { hardcodedRefs: h.length, strayCreations: s.length } };
  }],
];

/**
 * gates の mtime キャッシュ (§1.7)。
 * 鍵は graph/*.js の最大 mtime。engine が 1 本でも書き換われば全門を測り直す。
 * 門ごとに細かく無効化しない — engine は互いを require しており、依存の向きを
 * 人が推測することになる。推測を設計に入れない (NFR-06)。
 */
let _gateCache = null;   // { key, gates }
function graphMtimeKey() {
  let max = 0;
  for (const f of fs.readdirSync(GRAPH)) {
    if (!f.endsWith('.js')) continue;
    try { max = Math.max(max, fs.statSync(path.join(GRAPH, f)).mtimeMs); } catch { /* 消えた engine は鍵に影響しない */ }
  }
  return max;
}

function runGates(errors) {
  let key = null;
  try { key = graphMtimeKey(); } catch { key = null; }
  if (_gateCache && key !== null && _gateCache.key === key && !process.env.PULSE_FAULT) {
    return { gates: _gateCache.gates, cached: true };
  }
  const gates = GATES.map(([name, fn]) => {
    const t0 = hr();
    try {
      if (faulted(name)) throw new Error(`PULSE_FAULT=${name} — 故障注入`);
      const r = fn();
      // ok:false は errors に積まない — 門が赤いのは engine の故障ではなく事実である。
      // 積むのは「engine が例外を投げて合否そのものが取れなかった」場合に限る。
      return { name, ok: r.ok, ms: msSince(t0), at: nowMs(), detail: r.detail || {} };
    } catch (e) {
      errors.push({
        engine: name, key: `gates[${name}]`,
        reason: String((e && e.message) || e).split('\n')[0],
        at: nowMs(), fatal: false,
      });
      return { name, ok: false, ms: msSince(t0), at: nowMs(), detail: {} };
    }
  });
  if (key !== null && !process.env.PULSE_FAULT) _gateCache = { key, gates };
  return { gates, cached: false };
}

// ─────────────────────────────────────────────────────────────
// §1.3.4a spawn-trace.report() の偽陰性に対する防御 — 本 engine の急所
// ─────────────────────────────────────────────────────────────
/**
 * spawn の読み取りは必ずこの関数を通す。素の report() を直接呼ばない。
 *
 * report() が total:0 を返す事態は 2 つしかない:
 *   (a) 引数の型を間違えた (パス文字列を渡した) — 測り損ね
 *   (b) run に相が 1 つも無い                    — 測る対象が無い
 * **どちらも「起動証跡に問題が無い」を意味しない。いずれも緑を出す資格が無い。**
 */
function readSpawn(run, runName, errors) {
  let rep;
  try {
    if (faulted('spawn-trace')) throw new Error('PULSE_FAULT=spawn-trace — 故障注入');
    rep = spawnTrace.report(run);                    // ← 引数は必ず run オブジェクト (罠 T-6)
  } catch (e) {
    errors.push({
      engine: 'spawn-trace', key: `runs[${runName}].spawn`,
      reason: String((e && e.message) || e).split('\n')[0], at: nowMs(), fatal: false,
    });
    return null;
  }
  // ★ 事前 assert: total > 0 でなければ「測れなかった」と表明する。ok:true を信じない
  if (!rep || typeof rep.total !== 'number' || rep.total <= 0) {
    errors.push({
      engine: 'spawn-trace', key: `runs[${runName}].spawn`,
      reason: `spawn-trace.report returned total=${rep && rep.total} — 測れていない(引数型を疑え)`,
      at: nowMs(), fatal: false,
    });
    return null;                                     // ← 0 ではなく null。「数えて 0」ではない
  }
  return {
    total: rep.total, observed: rep.observed,
    assertedOnly: rep.assertedOnly, noTrace: rep.noTrace, ok: !!rep.ok,
    // 四値+legacy を画面まで運ぶ。棄権と「判定していない」を運ばなければ、
    // 次の改善対象(棄権の多さ)が画面から消える(M4 の理由そのもの)。
    waived: rep.waived || 0, legacy: rep.legacy || 0, clean: !!rep.clean,
  };
}

// ─────────────────────────────────────────────────────────────
// §1.3.4 runs[] — conclave.json の直読み。engine を呼ばない (S-3)
// ─────────────────────────────────────────────────────────────
function buildRuns(root, errors, scalePhases) {
  const out = [];
  let entries;
  try { entries = listRuns(root); } catch (e) {
    errors.push({ engine: 'conclave', key: 'runs', reason: String(e.message), at: nowMs(), fatal: false });
    return out;
  }
  for (const r of entries) {
    let run;
    try {
      run = JSON.parse(fs.readFileSync(r.path, 'utf8'));
    } catch (e) {
      errors.push({ engine: 'conclave', key: `runs[${r.name}]`, reason: String(e.message).split('\n')[0], at: nowMs(), fatal: false });
      continue;
    }
    if (!Array.isArray(run.domains)) {
      // run.json 形式 (旧 orchestrator) の混在。run 単位で skip し、断面全体は exit 0 で返る
      errors.push({ engine: 'conclave', run: r.name, key: `runs[${r.name}]`, reason: 'no domains[]', at: nowMs(), fatal: false });
      continue;
    }
    let phasesDone = 0, phasesTotal = 0, domainsRatified = 0;
    const domains = [];
    for (const d of run.domains) {
      const phases = Array.isArray(d.phases) ? d.phases : [];
      const done = phases.filter(p => p.status === 'done').length;
      phasesTotal += phases.length;
      phasesDone += done;
      if (d.status === 'ratified') domainsRatified++;
      domains.push({ cardinal: d.cardinal, domain: d.domain, status: d.status, phasesDone: done, phasesTotal: phases.length });
    }
    const gaugeRes = guard(errors, 'gauge', `runs[${r.name}].score`, () => gauge.score(run), null);
    const spawn = readSpawn(run, r.name, errors);
    const score = gaugeRes && typeof gaugeRes.score === 'number' ? gaugeRes.score : null;
    // 矛盾は spawn が測れて初めて言える。測れなければ false ではなく null (第16条)
    const contradiction = (score !== null && spawn !== null) ? (score >= 90 && spawn.noTrace > 0) : null;
    const history = Array.isArray(run.history) ? run.history : [];
    // 相数逆引き。一意に定まらないときは null + 候補を併記する (罠9)
    const candidates = Object.keys(scalePhases || {}).filter(k => scalePhases[k] === phasesTotal);
    out.push({
      name: r.name, path: r.path,
      phasesDone, phasesTotal, domainsRatified, domainsTotal: run.domains.length,
      domains,
      state: phasesTotal === 0 ? 'unknown' : (phasesDone < phasesTotal ? 'stalled' : 'complete'),
      score, spawn, contradiction,
      metrics: gaugeRes ? {
        firstPassRate: gaugeRes.firstPassRate, reworkCount: gaugeRes.reworkCount,
        retryOverhead: gaugeRes.retryOverhead, loopGuardTrips: gaugeRes.loopGuardTrips,
        durationMs: gaugeRes.durationMs,
      } : null,
      historyLength: history.length,
      lastEvent: history.length ? history[history.length - 1] : null,
      scaleGuess: candidates.length === 1 ? candidates[0] : null,
      scaleCandidates: candidates,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// §1.3.2 counts / §1.3.7 ledger / §1.3.5 daily / §1.3.6 scale / §4.3 atlas
// ─────────────────────────────────────────────────────────────
function countJsonl(file) {
  // 壊れた行への耐性 (AC-17c): 解釈できた行数を返す。部分成功
  const txt = fs.readFileSync(file, 'utf8');
  let n = 0;
  for (const line of txt.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try { JSON.parse(t); n++; } catch { /* 途中書きの行は数えない */ }
  }
  return n;
}

function claudeDir(...seg) { return path.join(os.homedir(), '.claude', ...seg); }
const countEntries = (dir) => fs.readdirSync(dir).length;

function buildAtlas(errors) {
  return guard(errors, 'atlas', 'atlas', () => {
    const dir = path.join(DASHBOARD, 'atlas');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.html') && !f.includes('.visual-check.'))
      .sort()
      .map(f => ({
        name: f.replace(/\.html$/, ''),
        href: 'atlas/' + f,
        exists: fs.existsSync(path.join(dir, f)),
      }));
  }, []);
}

/** census は同期経路で呼ばない。別ファイルが書いたキャッシュを読むだけ (§1.6) */
function readCensusCache(errors) {
  return guard(errors, 'census', 'census', () => {
    const p = path.join(os.tmpdir(), 'pulse-census-cache.json');
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }, null);
}

function snapshot(opts = {}) {
  const t0 = hr();
  const errors = [];

  const wsRes = guard(errors, 'workspace', 'workspace.root', () => workspace.resolve(), null);
  const root = wsRes && wsRes.root;

  // --- scale (§1.3.6) ---
  const scale = guard(errors, 'forge', 'scale', () => {
    const names = Object.keys(forge.SCALES);
    if (!(names.length > 0)) throw new Error('forge.SCALES が空 — 道が 1 本も無い');
    const o = {};
    for (const n of names) o[n] = { phases: forge.buildDag('x', n).tasks.length };
    o.classifierAvailable = typeof forge.chooseScale === 'function';
    return o;
  }, {}) || {};
  const scalePhases = {};
  for (const [k, v] of Object.entries(scale)) if (v && typeof v.phases === 'number') scalePhases[k] = v.phases;

  // --- counts (§1.3.2) ---
  const counts = {};
  counts.articles = guard(errors, 'codex', 'counts.articles', () => codex.parse().length, null);
  counts.engines = guard(errors, 'pulse', 'counts.engines', () => fs.readdirSync(GRAPH).filter(f => f.endsWith('.js')).length, null);
  counts.cardinals = guard(errors, 'clergy', 'counts.cardinals', () => Object.keys(clergy.COLLEGE).length, null);

  const dirCount = guard(errors, 'workspace', 'counts.creations', () => {
    if (!root) throw new Error('workspace.resolve() が住所を返さなかった');
    const vis = visibleDirs(root);
    const c = vis.filter(e => !isWorkshop(e)).length;
    const w = vis.filter(e => isWorkshop(e)).length;
    // 不変条件 (§1.5.1 の返り値の妥当性): creations + workshops == visible
    if (c + w !== vis.length) throw new Error(`不変条件が破れた: ${c}+${w} != ${vis.length}`);
    return { creations: c, workshops: w };
  }, null);
  counts.creations = dirCount ? dirCount.creations : null;
  counts.workshops = dirCount ? dirCount.workshops : null;

  counts.runs = guard(errors, 'conclave', 'counts.runs', () => {
    if (!root) throw new Error('workspace.resolve() が住所を返さなかった');
    return listRuns(root).length;
  }, 0);

  // A-1: check-agents の installedAgents は引数なしで静かに null を返す。
  // 必ずディレクトリを渡す。返り値は Set なので .size (.length は無い)。
  counts.agents = guard(errors, 'check-agents', 'counts.agents', () => {
    const s = checkAgents.installedAgents(claudeDir('agents'));
    if (!s || typeof s.size !== 'number') throw new Error('installedAgents(dir) が Set を返さなかった');
    return s.size;
  }, null);
  counts.commands = guard(errors, 'pulse', 'counts.commands', () => countEntries(claudeDir('commands')), null);
  counts.skills = guard(errors, 'pulse', 'counts.skills', () => countEntries(claudeDir('skills')), null);

  const kgRoot = process.env.PARADISE_KG || claudeDir('paradise-kg');
  counts.kgNodes = guard(errors, 'kg', 'counts.kgNodes', () => countJsonl(path.join(kgRoot, 'nodes.jsonl')), null);
  counts.kgEdges = guard(errors, 'kg', 'counts.kgEdges', () => countJsonl(path.join(kgRoot, 'edges.jsonl')), null);

  // --- lessons (FR-18): export --out が唯一の源。読了後に必ず unlink する (AC-18c) ---
  let lessonsByKind = {};
  counts.lessons = guard(errors, 'lessons', 'counts.lessons', () => {
    // exportLessons は outPath 必須 (罠 T-9)。屑を残さない
    const out = path.join(os.tmpdir(), `pulse-lessons-${process.pid}-${Date.now()}.json`);
    try {
      lessons.exportLessons(out);
      const arr = JSON.parse(fs.readFileSync(out, 'utf8'));
      const by = {};
      for (const l of arr) { const k = l.kind || 'unknown'; by[k] = (by[k] || 0) + 1; }
      lessonsByKind = by;
      return arr.length;
    } finally {
      try { fs.unlinkSync(out); } catch { /* 既に無ければよい */ }
    }
  }, null);

  // --- gates (§1.3.3) ---
  const gateRes = runGates(errors);

  // --- runs (§1.3.4) ---
  const runs = root ? buildRuns(root, errors, scalePhases) : [];

  // --- ledger (§1.3.7 / FR-22): gauge.readLedger() のみ。baseline は呼ばない ---
  const ledger = guard(errors, 'gauge', 'ledger', () => {
    const rows = gauge.readLedger();
    if (!Array.isArray(rows)) throw new Error('readLedger() が配列を返さなかった');
    return rows.map(r => ({
      ts: r.ts,                                  // 台帳が記録した時刻をそのまま。再計算しない
      slug: r.slug, scale: r.scale,
      score: r.metrics ? r.metrics.score : null,
      phasesDone: r.metrics ? r.metrics.phasesDone : null,
      phasesTotal: r.metrics ? r.metrics.phasesTotal : null,
    }));
  }, null);

  // --- daily (§1.3.5): isDue() を module として。exit code は存在しない ---
  const daily = guard(errors, 'daily-guard', 'daily', () => {
    const r = dailyGuard.isDue();
    const o = { due: !!r.due, catchUp: !!r.catchUp, owedDay: r.owedDay, reason: r.reason, jst: r.now && r.now.stamp };
    // lease は status に保持者欄が現れる場合のみ。無ければ鍵ごと出さない (推測を出さない)
    if (r.ledger && r.ledger.lease) o.lease = r.ledger.lease;
    return o;
  }, null);

  const atlas = buildAtlas(errors);
  const census = readCensusCache(errors);

  const generatedAtMs = nowMs();
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date(generatedAtMs).toISOString(),   // 断面は機械の言葉。画面へはそのまま出さない
    generatedAtMs,
    ageMs: 0,
    transportHint: opts.transportHint || 'poll',
    connections: typeof opts.connections === 'number' ? opts.connections : 0,
    counts,
    gates: gateRes.gates,
    gatesCached: gateRes.cached,
    runs,
    ledger,
    daily,
    scale,
    lessonsByKind,
    atlas,
    census,
    thresholds: {
      freshLiveMs: T.FRESH_LIVE_MS, freshFrozenMs: T.FRESH_FROZEN_MS,
      pollIntervalMs: T.POLL_INTERVAL_MS, firstEventTimeoutMs: T.FIRST_EVENT_TIMEOUT_MS,
      errorStreak: T.ERROR_STREAK, promoteRetryMs: T.PROMOTE_RETRY_MS,
      watchDebounceMs: T.WATCH_DEBOUNCE_MS,
    },
    source: {
      articles: 'codex', engines: 'pulse', cardinals: 'clergy',
      creations: 'workspace', workshops: 'workspace', runs: 'conclave',
      agents: 'check-agents', commands: 'pulse', skills: 'pulse',
      kgNodes: 'kg', kgEdges: 'kg', lessons: 'lessons',
      gates: 'wiring,vendor,derived,check-agents,workspace',
      ledger: 'gauge', daily: 'daily-guard', scale: 'forge',
      atlas: 'atlas', census: 'census',
    },
    buildMs: msSince(t0),
    errors,
  };
}

// ─────────────────────────────────────────────────────────────
// FR-07 鮮度の分類 — 純関数。画面はこれと同じ閾値を用いる
// ─────────────────────────────────────────────────────────────
function freshness(ageMs, transport) {
  if (transport === 'frozen') return 'frozen';        // 第3層は ageMs に関わらず必ず frozen
  if (ageMs > T.FRESH_FROZEN_MS) return 'frozen';
  if (ageMs > T.FRESH_LIVE_MS) return 'lagging';
  return 'live';
}

// ─────────────────────────────────────────────────────────────
// §2 サーバ — node 標準 http のみ
// ─────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

function serve(opts = {}) {
  const clients = new Set();
  const keepaliveMs = Number(process.env.PULSE_KEEPALIVE_MS || T.KEEPALIVE_MS);
  let watchers = [];
  let debounceTimer = null;
  let sawRename = false;
  let rescans = 0;

  const currentSnapshot = (transportHint) =>
    snapshot({ transportHint, connections: clients.size });

  function broadcast() {
    if (clients.size === 0) return;
    const payload = JSON.stringify(currentSnapshot('sse'));
    for (const res of clients) {
      // 各イベントは空行 (\n\n) で終端する
      try { res.write(`event: snapshot\ndata: ${payload}\n\n`); } catch { /* 切れた購読者は close で除かれる */ }
    }
  }

  // --- fs.watch (§2.5) ---
  function watchTargets() {
    const out = [];
    try {
      const root = workspace.resolve().root;
      for (const r of listRuns(root)) out.push(r.path);
    } catch { /* 倉が無くてもサーバは立つ */ }
    const kgRoot = process.env.PARADISE_KG || claudeDir('paradise-kg');
    for (const f of ['nodes.jsonl', 'edges.jsonl']) {
      const p = path.join(kgRoot, f);
      if (fs.existsSync(p)) out.push(p);              // 読むだけ。~/.claude へ書かない (N-4)
    }
    out.push(GRAPH);                                  // engine の増減 (counts.engines / gates キャッシュ)
    const st = path.join(DASHBOARD, 'state.js');
    if (fs.existsSync(st)) out.push(st);
    return out;
  }

  function fire() {
    debounceTimer = null;
    if (sawRename) {                                  // rename は inode の差し替え。張り直す (AC-11d)
      sawRename = false;
      rescan();
      return;
    }
    broadcast();
  }

  // eventType は 'change' でも 'rename' でも同じ扱い。filename が null でも分岐しない
  function onRaw(eventType) {
    if (eventType === 'rename') sawRename = true;
    clearTimeout(debounceTimer);                      // 時刻差比較では抑制できない。タイマー式のみが効く
    debounceTimer = setTimeout(fire, T.WATCH_DEBOUNCE_MS);
  }

  function closeWatchers() {
    for (const w of watchers) { try { w.close(); } catch { /* 既に閉じていればよい */ } }
    watchers = [];
  }

  /** バッファ溢れ / rename からの復帰: 閉じる → 全面再走査 → 張り直す (NFR-04) */
  function rescan() {
    rescans++;
    closeWatchers();
    attachWatchers();
    broadcast();
  }

  function attachWatchers() {
    for (const target of watchTargets()) {
      try {
        const w = fs.watch(target, (eventType) => onRaw(eventType));
        w.on('error', () => { setTimeout(rescan, T.WATCH_DEBOUNCE_MS); });
        watchers.push(w);
      } catch { /* 監視できない対象があってもサーバは立つ */ }
    }
  }

  const server = http.createServer((req, res) => {
    // url.parse は非推奨。WHATWG URL で解く。基底は自分の待ち受け先である。
    // ⚠️ ただし WHATWG URL は `..` を**解決してしまう** — `/../../x` が `/x` になる。
    // それに頼ると「脱出が起きなかった」のではなく「脱出が見えなくなった」だけであり、
    // 生ソケットで `..` を直に送られたとき何が起きるかを我々が知らないまま緑になる。
    // ゆえに **生のパス**を自分で切り出し、正規化の前後を自分の目で確かめる(罠7)。
    const rawPath = String(req.url || '/').split('?')[0].split('#')[0];
    let pathname;
    try { pathname = decodeURIComponent(rawPath); } catch { pathname = rawPath; }
    res.setHeader('Access-Control-Allow-Origin', '*');   // file:// の origin は null

    if (pathname === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        // Content-Length を書かない (chunked と衝突する)
      });
      res.write(`retry: ${T.RETRY_HINT_MS}\n\n`);
      clients.add(res);
      res.write(`event: snapshot\ndata: ${JSON.stringify(currentSnapshot('sse'))}\n\n`);
      const ka = setInterval(() => {
        try { res.write(': ping\n\n'); } catch { /* close が後始末する */ }
      }, keepaliveMs);
      req.on('close', () => { clearInterval(ka); clients.delete(res); });
      return;
    }

    if (pathname === '/snapshot.json') {
      const body = JSON.stringify(currentSnapshot('poll'));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
      res.end(body);
      return;
    }

    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ ok: true, port: server.address() && server.address().port, connections: clients.size, rescans }));
      return;
    }

    // 静的配信。dashboard/ の外へ出る参照は 403 で拒む
    const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const target = path.normalize(path.join(DASHBOARD, rel));
    if (target !== DASHBOARD && !target.startsWith(DASHBOARD + path.sep)) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'forbidden' }));
      return;
    }
    fs.readFile(target, (err, buf) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(target)] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
      res.end(buf);
    });
  });

  const wanted = typeof opts.port === 'number' ? opts.port : T.DEFAULT_PORT;
  return new Promise((resolve2) => {
    const announce = () => {
      const port = server.address().port;
      attachWatchers();
      if (!opts.quiet) console.log(`pulse listening port=${port}`);
      resolve2({ server, port, clients, close: () => { closeWatchers(); clearTimeout(debounceTimer); server.close(); }, broadcast, rescanCount: () => rescans });
    };
    server.once('error', (e) => {
      if (e && e.code === 'EADDRINUSE') {
        // 二重起動耐性: 別ポートを取り、両方が生き続ける。process.exit してはならない
        server.listen(0, '127.0.0.1', announce);
      } else { throw e; }
    });
    server.listen(wanted, '127.0.0.1', announce);     // 127.0.0.1 のみ。0.0.0.0 で listen しない
  });
}

// --- CLI ---
function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };

  if (cmd === 'snapshot') {
    const snap = snapshot({ transportHint: 'poll' });
    process.stdout.write(JSON.stringify(snap, null, argv.includes('--json') ? 0 : 2));
    process.stdout.write('\n');
    process.exit(0);                                  // 片方の engine が落ちても exit 0 (AC-14c)
  }
  if (cmd === 'freshness') {
    const age = Number(flag('--age-ms'));
    const transport = flag('--transport') || 'sse';
    if (!Number.isFinite(age)) { console.error('usage: pulse.js freshness --age-ms <n> --transport <sse|poll|frozen>'); process.exit(2); }
    console.log(freshness(age, transport));
    return;
  }
  if (cmd === 'serve') {
    const p = flag('--port');
    serve({ port: p === undefined ? T.DEFAULT_PORT : Number(p) });
    return;
  }
  console.error('commands: snapshot [--json] | serve [--port n] | freshness --age-ms <n> --transport <sse|poll|frozen>');
  process.exit(2);
}
if (require.main === module) main();

module.exports = { snapshot, freshness, serve, visibleDirs, listRuns, readSpawn, T, GATES, SCHEMA_VERSION };
