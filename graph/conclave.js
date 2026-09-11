#!/usr/bin/env node
/**
 * PARADISE :: Conclave — the Recursive Hierarchical Orchestrator
 * ---------------------------------------------------------------------
 * The engine that runs the clergy. It is a SUPERVISOR-OF-SUPERVISORS:
 *
 *   Pontiff (session) drives the CONCLAVE (the outer PDCA ring over domains).
 *     └ each domain is a CARDINAL, who drives an inner SEE (the domain's own
 *       PDCA ring over its phases).
 *         └ each phase is worked by a PRIEST (large subagent), who may marshal
 *           BELIEVERS (small subagents) for fine work.
 *   The TRIBUNAL (executor) is invoked at the judgment gate, independent of all.
 *
 * Two nested rings, both real:
 *   OUTER (conclave): plan the college → convene cardinals in dependency order →
 *     check each domain's ratification → act (advance or send a domain back).
 *   INNER (see): a cardinal plans its phases → dispatches priests → checks their
 *     reconciled results → acts (rework a phase, guarded) until the domain ratifies.
 *
 * Built ON TOP OF orchestrator.js (the phase-level state machine) — the conclave
 * adds the domain layer above it. Run state is durable JSON, resumable.
 *
 * Usage:
 *   conclave.js convene <dag.json> --run <conclave.json>   # build the nested run
 *   conclave.js next --run <conclave.json>                 # next domain OR next phase-wave within the active domain
 *   conclave.js done <phaseId> --run <conclave.json> --artifact <path>
 *   conclave.js beat <phaseId> --run <conclave.json> --evidence <path> --note "<何が着地したか>"
 *   conclave.js ratify <cardinal> --run <conclave.json> [--reject --from <phase>]
 *   conclave.js status --run <conclave.json>
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const engine = require('./graph-engine.js');
const clergy = require('./clergy.js');
/**
 * 序列の門はここから来る (第52条)。
 *
 * かつて conclave は spawn-trace を一度も require していなかった。ゆえに
 * 「誰が働いたか」を環が問わず、教主が己の手で書いた成果物も同じく done になった。
 * **閾値も判定表も spawn-trace ただ一箇所に住む** — 二つ書けば必ず食い違う。
 */
const trace = require('./spawn-trace.js');

const MAX_DOMAIN_REWORK = 3; // loop-guard at the domain level too
// 第51条c: 回復もまた有限である。無限に帰れる環は静止の代わりに永久機関になる。
const MAX_PHASE_RESUME = 2;
// 第51条b: この時を過ぎた `running` は、走者が斃れたものとみなす(15分)。
const STALE_MS = 15 * 60 * 1000;

/**
 * 「沈黙している」と機械が名指しできる境 (reflect C-5)。
 *
 * ⚠️ **`STALE_MS` と別の数である。理由を書く。**
 * `STALE_MS`(15分)は第51条が **`resume` の回収判定**のために置いた数である ——
 * 「この running は剥がして良いか」を問う。`resume --force` で覆せるし、
 * 偽陽性の代償は「生きている走者を剥がしうる」だが `--force` の壁がある。
 *
 * 沈黙の名指しは**別の問い**である ——「神に見せるべきか」。偽陽性の代償は騒音であり、
 * 騒音は門を無視させる(第21条の教訓)。ゆえに閾値も別でなければならない(第36条)。
 *
 * ── 実測から導いた (第38条: 測らなかった走行は語れない) ─────────────
 * 実在8走行の `dispatch` → `done` 所要時間 **66 件**を全て測った:
 *   p25=1.8分  p50=9.9分  p75=32.0分  p90=54.5分  p95=68.0分  max=103.1分
 *   15分以上: 27/66 = **40.9%**   60分以上: 7件   90分以上: 1件   120分以上: **0件**
 *
 * **15分をそのまま沈黙の境にすれば、正常に走っている相の 4 割が鳴る。**
 * reflect が「census は12分・atlas は12分・subagent は1時間超」と警告した通りで、
 * 実測はそれより悪い。騒音になる。
 *
 * `SILENT_MS = 120分` は **p100(103.1分)を超える最小の切りの良い数**である。
 * 実測した 66 件の正常な相は**一件も**この境を越えない = **偽陽性ゼロ**。
 * 越えたなら「これまでのどの相よりも長く黙っている」であり、名指しに値する。
 *
 * **これは「閾値を緩めて門を通した」のではない。** 緩めたのではなく、
 * 元々**存在しなかった**門(`--json` は `dispatchedAt` すら運んでいなかった)を、
 * 実測した分布の上に建てた。境を下げるのは沈黙の長さを実測してからである(C-5b)。
 */
const SILENT_MS = 120 * 60 * 1000;

/**
 * 相の滞留を三値で読む (reflect C-5)。**判定は一箇所に住む** ——
 * `statusBoard`(人が読む)と `status --json`(機械が読む)が別々に数えれば必ず食い違う。
 *
 *   { state:'ok' }                        … running でない、または若い
 *   { state:'no-dispatch' }               … running なのに発令の刻が無い(判定不能)
 *   { state:'stale',  ageMs }             … STALE_MS 超 — resume の回収対象 (第51条)
 *   { state:'silent', ageMs }             … SILENT_MS 超 — 実測のどの相よりも長い沈黙
 * `silent` は必ず `stale` でもある(120 > 15)。両方の鍵を立てる。
 */
function phaseSilence(p, at = Date.now()) {
  if (!p || p.status !== 'running') return { state: 'ok', running: false, stale: false, silent: false, ageMs: null };
  const t = p.dispatchedAt ? Date.parse(p.dispatchedAt) : NaN;
  if (Number.isNaN(t)) return { state: 'no-dispatch', running: true, stale: false, silent: false, ageMs: null };
  const ageMs = at - t;
  return {
    state: ageMs >= SILENT_MS ? 'silent' : (ageMs >= STALE_MS ? 'stale' : 'ok'),
    running: true, stale: ageMs >= STALE_MS, silent: ageMs >= SILENT_MS, ageMs,
  };
}

/**
 * 見捨てられた走行の境 (第53条)。
 *
 * ⚠️ **`STALE_MS`(15分)とも `SILENT_MS`(120分)とも別の数である。理由を書く。**
 * 前の二つは **相** を見る —— 「この `running` の走者は生きているか」。
 * この数は **走行そのもの** を見る —— 「この環は、もう誰も回していないのではないか」。
 * 相が `pending` のまま忘れられた走行は、`running` を一つも持たないので
 * `phaseSilence` の目には一切映らない。**実測がそれを証明した**(下記)。
 *
 * ── 実測から導いた (第38条: 測らなかった走行は語れない) ─────────────
 * 実在する走行帳 8 本 (paradise/reform 4 + creations 4) を全て読み、
 * **環を閉じた 5 本**の全事象間隔 **173 件**を測った:
 *   p50=0.0分  p90=17.5分  p95=32.0分  max=110.4分
 *   **24時間(1440分)を超えた間隔は 0 件。**
 * 対して見捨てられていた 2 本:
 *   reform/claude-md-diet   domains 4/6 のまま **9892分**(6.9日)無音、実装は PR #23 でマージ済
 *   reform/pontiff-office   domains 5/6 のまま **5703分**(4.0日)無音
 *
 * `ABANDONED_MS = 24時間` は **閉じた走行の最長間隔(110.4分)の約13倍**であり、
 * 測った 173 件は**一件も**越えない = **偽陽性ゼロ**。越えたなら
 * 「これまでのどの正常な走行よりも長く環が止まっている」であり、名指しに値する。
 * 境を下げるのは、より多くの走行を測ってからである。
 */
const ABANDONED_MS = 24 * 60 * 60 * 1000;

/**
 * 走行が「見捨てられている」かを判ずる。**判定は一箇所に住む** ——
 * `audit` の CLI も、`tests` も、dashboard も、この関数だけを読む。
 *
 * 第16条の作法: **測れなかったものをゼロで埋めない。** 時刻を一つも読めない
 * 走行帳は `state:'unknown'` / `idleMs:null` で返り、**それでも名指しされる**。
 * 「判定不能」を黙って緑に落とすのは、見逃しと同じである。
 *
 *   { state:'closed' }      … domains が全て ratified — 環は閉じた
 *   { state:'unknown' }     … 時刻が読めない(判定不能)。null のまま名指しする
 *   { state:'active' }      … 未完だが最近動いている
 *   { state:'abandoned' }   … 未完のまま ABANDONED_MS を超えて無音
 *
 * @param {object} run 走行帳
 * @param {number} at  現在時刻(ms)
 */
function runAbandonment(run, at = Date.now()) {
  const ds = (run && run.domains) || [];
  const total = ds.length;
  const ratified = ds.filter(d => d.status === 'ratified').length;
  const closed = total > 0 && ratified === total;
  // 環の「最後の鼓動」は history の最終事象。無ければ created に落ちる。
  const stamps = [];
  if (run && run.created) stamps.push(Date.parse(run.created));
  for (const h of ((run && run.history) || [])) if (h && h.ts) stamps.push(Date.parse(h.ts));
  // 相の発令の刻も鼓動である(history を持たない古い帳のため)
  for (const d of ds) for (const p of (d.phases || [])) if (p && p.dispatchedAt) stamps.push(Date.parse(p.dispatchedAt));
  const valid = stamps.filter(n => !Number.isNaN(n));
  const lastBeat = valid.length ? Math.max(...valid) : null;
  /**
   * **鼓動を数える (第53条 / 錬4)。**
   *
   * 鼓動は状態を一切変えない —— ゆえに `ratified/total` だけを見る目には映らない。
   * だが「この環はまだ誰かが回している」の**唯一の証拠**がそこに在る。
   * `audit` に **黙って緑を渡さない** ために、最後の鼓動が何を携えていたかを運ぶ。
   * **進んでいると名乗る走行は、何を以て進んだのかを言わねばならない。**
   */
  const bs = beatsOf(run);
  const lastProof = bs.length ? bs[bs.length - 1] : null;
  const base = {
    ratified, total, closed, lastBeat: lastBeat === null ? null : new Date(lastBeat).toISOString(),
    beats: bs.length,
    lastProof: lastProof
      ? { ts: lastProof.ts || null, phase: lastProof.phase || null, evidence: lastProof.evidence, note: lastProof.note || null }
      : null,
  };
  if (closed) return { state: 'closed', abandoned: false, idleMs: lastBeat === null ? null : at - lastBeat, ...base };
  if (lastBeat === null) {
    // **ゼロで埋めない。** 判定できないことを名指しして返す (第16条)。
    return { state: 'unknown', abandoned: false, idleMs: null, ...base };
  }
  const idleMs = at - lastBeat;
  return { state: idleMs >= ABANDONED_MS ? 'abandoned' : 'active', abandoned: idleMs >= ABANDONED_MS, idleMs, ...base };
}

/**
 * 全ての走行帳を走査し、見捨てられた環を名指しする (第53条)。
 *
 * **住所は自分で決めない** —— `workspace.runLedgers()` が唯一の権威である(第30条)。
 * 走行帳が読めなければ `state:'unreadable'` として**名指しする**。
 * 読めなかったものを黙って除けば、壊れた帳ほど門をすり抜ける。
 *
 * @returns {{at:string, abandonedMs:number, ledgers:object[], abandoned:string[], unknown:string[], unreadable:string[]}}
 */
function auditRuns(opts = {}) {
  const workspace = require('./workspace.js');
  const at = typeof opts.at === 'number' ? opts.at : Date.now();
  const leds = opts.ledgers || workspace.runLedgers(opts.repoRoot, opts);
  const ledgers = [];
  for (const l of leds) {
    let run;
    try { run = JSON.parse(fs.readFileSync(l.path, 'utf8')); }
    catch (e) { ledgers.push({ ...l, state: 'unreadable', abandoned: false, idleMs: null, ratified: null, total: null, error: String(e.message || e) }); continue; }
    ledgers.push({ ...l, ...runAbandonment(run, at) });
  }
  return {
    at: new Date(at).toISOString(), abandonedMs: ABANDONED_MS, ledgers,
    abandoned: ledgers.filter(l => l.state === 'abandoned').map(l => l.path),
    unknown: ledgers.filter(l => l.state === 'unknown').map(l => l.path),
    unreadable: ledgers.filter(l => l.state === 'unreadable').map(l => l.path),
  };
}

/** 監査を人の画面へ。機械の口(`--json`)と同じ `auditRuns` を読む — 二重集計を書かない。 */
function auditBoard(rep) {
  const lines = ['CONCLAVE AUDIT — 見捨てられた走行 (第53条)', '═'.repeat(56)];
  const d = ms => ms === null ? '判定不能' : `${Math.round(ms / 60000)}分`;
  for (const l of rep.ledgers) {
    const g = { closed: '✓', active: '▶', abandoned: '🔴', unknown: '⚠', unreadable: '⚠' }[l.state] || '?';
    const n = l.total === null ? '?/?' : `${l.ratified}/${l.total}`;
    let note = '';
    if (l.state === 'abandoned') note = `  🔴 環が閉じぬまま ${d(l.idleMs)} 無音 [>${Math.round(rep.abandonedMs / 60000)}分] — 閉じるか畳むかを決めよ`;
    else if (l.state === 'unknown') note = '  ⚠ 時刻を一つも読めない走行帳 — 判定不能(ゼロで埋めない: 第16条)';
    else if (l.state === 'unreadable') note = `  ⚠ 走行帳が読めない: ${l.error}`;
    /**
     * **黙って緑に落とさない (第53条 / 第54条(c))。**
     * 鼓動を持つ未完の走行は「進んでいる」と名乗る。だが名乗りだけでは免除にならない ——
     * **最後の鼓動が何を携えていたかを、証拠の住所ごと語らせる。**
     * 免除は記録されて初めて例外である(第54条(c) をそのまま鼓動へ向ける)。
     */
    else if (l.state === 'active' && l.beats) {
      note = `  ▶ 鼓動 ${l.beats} 回 — 進んでいる(最後の鼓動 ${d(l.idleMs)} 前)`;
    }
    lines.push(`${g} [${l.where}] ${l.slug}  domains ${n}${note}`);
    if (l.state === 'active' && l.lastProof) {
      lines.push(`      ⟡ 証拠: ${l.lastProof.evidence}${l.lastProof.phase ? ` (相 ${l.lastProof.phase})` : ''}`);
      if (l.lastProof.note) lines.push(`        「${l.lastProof.note}」`);
    }
  }
  lines.push('═'.repeat(56),
    `見捨てられた走行: ${rep.abandoned.length} / 判定不能: ${rep.unknown.length + rep.unreadable.length} / 全 ${rep.ledgers.length}`);
  return lines.join('\n');
}

function load(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function save(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2)); }
function now() { return new Date().toISOString(); }

/** Build a nested run: domains (cardinals) each holding their phases. */
function convene(dagPath) {
  const dag = engine.loadDag(dagPath);
  const v = engine.validate(dag);
  if (!v.ok) throw new Error('Invalid DAG: ' + v.errors.join('; '));
  const order = dag.tasks.map(t => t.id);
  const groups = clergy.groupByCardinal(order);

  const byId = new Map(dag.tasks.map(t => [t.id, t]));
  const domains = groups.map((g, i) => ({
    seq: i,
    cardinal: g.cardinal,
    domain: (clergy.COLLEGE[g.cardinal] && clergy.COLLEGE[g.cardinal].domain) ||
            (g.cardinal === 'tribunal' ? clergy.TRIBUNAL.domain : g.cardinal),
    status: 'pending',          // pending | active | ratified | rejected | blocked
    reworks: 0,
    phases: g.phases.map(id => ({
      id, agent: byId.get(id).agent, goal: byId.get(id).goal,
      deps: byId.get(id).deps || [], gate: !!byId.get(id).gate,
      artifact: byId.get(id).artifact, status: 'pending', attempts: 0, artifactPath: null,
      // 第51条: 発令の刻。これが無ければ「死んだ running」を時刻で裁けない。
      // null = まだ発令されていない / undefined = この機構より古い run(判定不能)
      dispatchedAt: null, resumes: 0,
    })),
    reviewClass: (clergy.COLLEGE[g.cardinal] && clergy.COLLEGE[g.cardinal].reviewClass) ||
                 (g.cardinal === 'tribunal' ? 'god' : 'pontiff'),
    pdca: (clergy.COLLEGE[g.cardinal] && clergy.COLLEGE[g.cardinal].pdca) || clergy.TRIBUNAL.law,
  }));

  return {
    meta: dag.meta || {}, created: now(),
    /**
     * 紀元(epoch)の印 — 序列を宣言する経路が機構に在った時代の走行である証 (第52条)。
     *
     * **`meta` の中ではなく run の最上位に置く。** `meta` は forge が作る DAG から
     * 丸ごと転記される(上の `meta: dag.meta || {}`)ので、そこに置けば **古い DAG を
     * 読み直して convene し直した run が印を持たない**という抜け穴が開く。
     * 印は「この run を作った engine が新しかったか」の証であり、
     * **DAG の性質ではなく run の出自**である。ゆえに convene が自分の手で刻む。
     *
     * 印を手で消せば legacy を騙れる。だが `conclave.json` は版管理下に在り、
     * `epoch` の削除は diff に現れる —— **機構は騙りを防げないが、
     * 騙りを見えなくすることはできない。**
     */
    epoch: { tier: trace.TIER_EPOCH, at: now() },
    domains,
    history: [{ ts: now(), event: 'convene', detail: `${domains.length} domains, ${dag.tasks.length} phases` }],
  };
}

/** All phase objects flat, with a lookup by id (across all domains). */
function allPhases(run) { const m = new Map(); for (const d of run.domains) for (const p of d.phases) m.set(p.id, p); return m; }

/** Is a phase dispatchable? deps done (anywhere) AND phase pending/rework. */
function phaseReady(run, phase) {
  if (phase.status !== 'pending' && phase.status !== 'rework') return false;
  const all = allPhases(run);
  return phase.deps.every(d => all.get(d) && all.get(d).status === 'done');
}

/** The active domain = first non-ratified domain whose upstream domains are ratified. */
function activeDomain(run) {
  for (const d of run.domains) {
    if (d.status === 'ratified') continue;
    if (d.status === 'blocked') return { domain: d, blocked: true };
    return { domain: d };
  }
  return null; // all ratified
}

/**
 * next(): the pontiff asks the conclave what to do. Returns either:
 *  - a phase-wave WITHIN the active domain (the cardinal dispatching priests), or
 *  - a ratify signal (the domain's phases are all done → the review class ratifies), or
 *  - conclave-complete.
 */
function next(run, opts = {}) {
  // 第51条: 自動回収は **opt-in** である。既定の next は state を一切書かない
  // (純粋である)。書くのは呼び手の markRunning だけ — この契約に既存の門が
  // 依存しているため、reclaim を既定にすればそれらが静かに嘘になる。
  if (opts.reclaim) resume(run, { staleMs: opts.staleMs });
  const act = activeDomain(run);
  // 道の性質で結びの言を変える。counsel は創造物を産まない(第32条)ので、
  // 「creation complete」と言えばそれ自体が第32条への反例になる。
  //
  // ⚠️ 判定は `run.meta.produces` を第一とする。これは forge が DAG の meta に
  // 刻む **道の性質の宣言** であり、道が増えても意味が保たれる。`run.scale` は
  // 存在せず(実測: undefined)、cardinal 名での判定は枢機卿の改名で壊れる —
  // 名前ではなく宣言された性質で裁く(第16条)。
  if (!act) {
    const produces = run.meta && run.meta.produces;
    const isCounsel = produces === 'document' ||
      (run.meta && run.meta.scale === 'counsel') ||
      (run.domains || []).some(d => d.cardinal === 'counsel');
    // 作図の道も創造物(実装物)を産まない。産むのは**図**であり、
    // その完成は「実ブラウザで測り、目で見た」ことで立つ(第47条・第48条)。
    const isChart = produces === 'diagram';
    return { level: 'conclave', phase: 'complete',
             message: isChart
               ? 'All domains ratified — the map is drawn (図は engine から生まれた。実ブラウザで測り、目で見たことを以て完成とする)。'
               : isCounsel
               ? 'All domains ratified — counsel delivered (諐問は創造物を産まない。根拠と共に献じよ)。'
               : 'All domains ratified — creation complete.' };
  }
  const d = act.domain;
  if (act.blocked) return { level: 'domain', phase: 'blocked', cardinal: d.cardinal, message: `${d.domain} blocked — escalate to pontiff.` };
  if (d.status === 'pending') d.status = 'active';

  // ready phases inside this domain
  const ready = d.phases.filter(p => phaseReady(run, p)).map(p => p.id);
  if (ready.length) {
    const col = clergy.COLLEGE[d.cardinal];
    const believers = (col && col.believers) || [];
    return {
      level: 'domain', phase: 'wave', cardinal: d.cardinal, domain: d.domain,
      pdca: d.pdca,
      // ── 誰がこの発令を受けるのか (憲法 第25条) ────────────────────────
      // かつてここは神官への発令書を **教主に** 返していた。ゆえに教主が神官を
      // 直接呼び、枢機卿は素通りされ、階層は宣言だけになった。
      // 発令は枢機卿が受け、枢機卿が神官を起動する。
      dispatch_to: {
        rank: 'cardinal',
        agent: (col && col.agent) || 'cardinal',
        cardinal: d.cardinal,
        instruction: `あなたは枢機卿 ${d.domain} である。以下の相を配下の神官に発令し、` +
                     '結果を実物と突き合わせて検め、己のPDCAを回してから教主に返せ。' +
                     '自ら細部を作らない — あなたは指揮官である。',
        may_dispatch: (col && col.priests) || [],
        believers_available: believers,
      },
      dispatch: ready.map(id => {
        const ph = d.phases.find(x => x.id === id);
        const all = allPhases(run);
        return {
          id, agent: ph.agent, goal: ph.goal, gate: ph.gate,
          expects_artifact: ph.artifact, attempt: ph.attempts + 1,
          context_from: ph.deps.map(dep => ({ from: dep, artifact: (all.get(dep) || {}).artifactPath || null })),
          // 調査(Anthropic engineering)が求める4点。曖昧な発令は子に重複調査と
          // 取りこぼしを起こさせる — 実際に起きた失敗として docs に記録がある。
          contract: {
            purpose: ph.goal,
            output_format: `${ph.artifact || 'artifact'} を書き、{phase,status,artifact,evidence,summary} を返す`,
            tools_and_sources: ph.deps.length
              ? `依存の成果物のみを読む: ${ph.deps.join(', ')}`
              : '与えられた入力のみ。範囲外を探索しない',
            boundary: `この相(${id})だけを行う。他の相は他の者の領分である`,
            // MAST(arXiv:2503.13657): 検証の失敗が全体の21.3%。うち「検証せず/不完全」6.82%、
            // 「誤った検証」6.66%、「早すぎる終了」7.82%。ゆえに終了条件と証拠を明示する。
            evidence_required: '走らせた命令とその生の出力を添えること。「できました」は主張であって証拠ではない',
            done_when: `${ph.artifact || 'artifact'} が実在し、その中身が目的を満たしていることを自分で確認できたとき`,
            // FM-2.2「確認せず誤った前提で進む」11.65%。黙って進むより問い返す方が安い。
            if_unclear: '前提が不明なら推測で進まず、blocked として何が不明かを述べて返す',
          },
          // 神官がさらに細分する場合の割当（信徒は実体を持つ）
          marshal: believers.length ? clergy.marshalPlan(id, { priestCanSpawn: true }) : null,
          /**
           * その相について既定で妥当な序列の**助言**である。強制ではない (第52条 / 第34条)。
           * 発令の時点で「この相は序列3を名乗れない」と分かっていれば、教主は
           * 最後に拒まれるのではなく最初に知る。**次に何をすべきかを言わない門は罠である。**
           */
          tier_hint: {
            default: 1,
            ...(ph.gate ? { forbidden: [3], why: '門相は序列3を名乗れない (第9条)' } : {}),
          },
        };
      }),
      // 並列度は天井(20)ではなく実用値(4)に従う。
      // arXiv:2512.08296「T ∝ n^1.724、実用的な有効チーム規模は3–4体」逆U字。
      parallel: Math.min(ready.length, clergy.EFFECTIVE_CONCURRENT),
      ready_count: ready.length,
      max_concurrent: clergy.EFFECTIVE_CONCURRENT,
      runtime_ceiling: clergy.RUNTIME_CONCURRENT,
    };
  }

  // no ready phases: are all of this domain's phases done? → ratify
  const allDone = d.phases.every(p => p.status === 'done');
  if (allDone) return { level: 'domain', phase: 'ratify', cardinal: d.cardinal, domain: d.domain,
    reviewClass: d.reviewClass, message: `${d.domain}: all phases done — ${d.reviewClass} ratifies.` };

  return { level: 'domain', phase: 'stuck', cardinal: d.cardinal,
    message: 'No ready phases, not all done — a dependency may be in another unratified domain or reworking.' };
}

/** Mark a phase running (attempts++). Called on dispatch. */
function markRunning(run, ids) {
  const all = allPhases(run);
  for (const id of ids) { const p = all.get(id); if (p) { p.status = 'running'; p.attempts += 1; p.dispatchedAt = now(); } }
  run.history.push({ ts: now(), event: 'dispatch', detail: ids.join(', ') });
}

/**
 * resume(): 中断した走者が残した `running` の化石を環へ戻す (第51条)。
 *
 * なぜ既存の verb で足りないか:
 *   - `done`          … 成果物が無いのに done を刻む = 台帳に嘘を永続化する (第37条)
 *   - `ratify --reject` … 粒度が domain。`reworks` を消費して loop-guard を無駄に削り、
 *                        台帳上で「品質差し戻し」と「走者の死」が混ざって後から区別できない
 *
 * 生死の判定は **人の意思 > 時刻 > (attempts は使わない)**:
 *   - dispatchedAt が新しい      → 生きているとみなし触らない (--force で覆せる)
 *   - dispatchedAt が STALE_MS 超 → 回収する
 *   - dispatchedAt が無い(古い run) → 判定不能。engine は独断で剥がさず --force を要求する
 *     (勝手に剥がせば二重発令という新しい病を生む — 第45条の同型)
 *
 * 回収した相は `pending` ではなく `rework` へ戻す。`phaseReady` はどちらも ready と扱うが、
 * `pending` は「まだ一度も発令されていない」の意であり attempts>=1 の相と矛盾する。
 */
function resume(run, opts = {}) {
  const staleMs = typeof opts.staleMs === 'number' ? opts.staleMs : STALE_MS;
  const all = allPhases(run);
  const targets = opts.phase ? [all.get(opts.phase)].filter(Boolean) : [...all.values()];
  if (opts.phase && !targets.length) throw new Error('unknown phase: ' + opts.phase);

  const resumed = [], skipped = [];
  for (const p of targets) {
    if (p.status !== 'running') { skipped.push({ id: p.id, reason: `not running (${p.status})` }); continue; }
    const at = p.dispatchedAt ? Date.parse(p.dispatchedAt) : NaN;
    if (!Number.isNaN(at)) {
      const age = Date.now() - at;
      if (age < staleMs && !opts.force) {
        skipped.push({ id: p.id, reason: `fresh (${Math.round(age / 1000)}s < ${Math.round(staleMs / 1000)}s) — 生きている走者かもしれない。--force で覆せる`, ageMs: age });
        continue;
      }
    } else if (!opts.force) {
      skipped.push({ id: p.id, reason: 'no dispatchedAt — 判定不能な古い run。--force を要する' });
      continue;
    }
    p.resumes = (p.resumes || 0) + 1;
    if (p.resumes > MAX_PHASE_RESUME) {
      const owner = run.domains.find(d => d.phases.some(x => x.id === p.id));
      if (owner) owner.status = 'blocked';
      run.history.push({ ts: now(), event: 'phase-loop-guard', detail: `${p.id} exceeded ${MAX_PHASE_RESUME} resumes` });
      return { ok: false, resumed, skipped, blocked: owner && owner.cardinal,
        message: `Phase ${p.id} blocked after ${MAX_PHASE_RESUME} resumes — escalate to pontiff.` };
    }
    p.status = 'rework';
    p.dispatchedAt = null;
    resumed.push(p.id);
  }
  if (resumed.length) run.history.push({ ts: now(), event: 'resume', detail: resumed.join(', ') });
  return { ok: true, resumed, skipped,
    message: resumed.length ? `resumed: ${resumed.join(', ')} — 環は再び回る` : 'nothing resumed（回収すべき化石は無かった）' };
}

/**
 * 相を done として記す。
 *
 * ⚠️ **成果物を名乗るなら、その成果物は実在せねばならない**(第22条 / 第27条)。
 *
 * 実測(2026-09-02): security 相の神官が反復上限で打ち切られたにもかかわらず、
 * 教主が `done security --artifact .../security.md` と記録した。**ファイルは
 * 一度も存在したことがなかった**(`git log --all -- security.md` → 0件)。
 * executor(執行官)が `ls` で不在を暴くまで誰も気づかなかった。
 *
 * 第27条「subagent の done を信じない」は、**記録する者自身にも向く**。
 * 教主が神官を疑っても、教主が書いた台帳を誰も疑わなければ嘘は残る。
 * ゆえに engine が拒む —— 人の注意力ではなく機械が守る(第50条)。
 *
 * ── 序列の門 (第52条) ────────────────────────────────────────────
 * `opts.tier` で教主がその相をどの序列で処理したかを申告する。判定は
 * `spawn-trace.judge()` **ただ一つ**が下す(環と器が別の判定を書けば必ず食い違う)。
 *
 * **門は throw する。** 戻り値で可否を返す形にすれば、`markDone` を直に呼ぶ
 * 既存8本の試験がすべて意味を変える。throw なら CLI が `save` に到達せず、
 * **run ファイルは書き換わらない**(既存の実在検査が既にこの形である)。
 *
 * **そして門は「紀元の印を持つ run」にしか立たない。** 印を持たない run
 * (legacy・手書きの合成 run)では `tier` 未申告でも従来通り通り、
 * `tierTrace[id].state = 'unobservable'` が刻まれる —— 黄は緑ではないが、
 * 機構の欠陥を走行者の罪として記録しない(第16条)。
 */
function markDone(run, id, artifactPath, opts = {}) {
  const p = allPhases(run).get(id);
  if (!p) throw new Error('unknown phase: ' + id);
  if (artifactPath) {
    const abs = path.isAbsolute(artifactPath)
      ? artifactPath
      : path.join(path.dirname(__dirname), artifactPath);
    if (!fs.existsSync(abs)) {
      throw new Error(
        `成果物が実在しない: ${artifactPath}\n` +
        `  相 "${id}" を done にはできない —— 名乗った成果物が無い(第22条)。\n` +
        `  神官が打ち切られたか、書く前に done を記したかである。\n` +
        `  実物を確かめてから記録せよ(第27条は記録する者自身にも向く)。`);
    }
  }

  // 序列の判定。**成果物の実在を検めた後**に立つ — 名乗った物が無いのは
  // 序列以前の問題であり、先に鳴るべき門である。
  const v = trace.judge(run, id, { tier: opts.tier, artifact: artifactPath, cwd: opts.cwd });
  if (!v.ok) {
    const e = new Error(v.lines.join('\n') + `\n  (判定: ${v.state} / 相 ${id})`);
    e.tierVerdict = v;
    throw e;
  }
  run.tierTrace = run.tierTrace || {};
  run.tierTrace[id] = {
    declared: opts.tier == null ? null : Number(opts.tier),
    state: v.state,
    ...(v.measured ? { measured: { files: v.measured.files, churn: v.measured.churn, bytes: v.measured.bytes } } : {}),
    lines: v.lines,
    at: (opts.now || now)(),
  };

  p.status = 'done'; if (artifactPath) p.artifactPath = artifactPath;
  run.history.push({ ts: now(), event: 'done', detail: id + (artifactPath ? ' → ' + artifactPath : '') });
  return v;
}

// ══════════════════════════════════════════════════════════════════════════
// 第53条 — 鼓動 (beat): 段が着地したという **真の進捗** を走行帳に刻む口
// ══════════════════════════════════════════════════════════════════════════

/**
 * 鼓動の註釈が「本物か」を判ずる (錬5)。
 *
 * 空・短すぎる・プレースホルダは鼓動ではない。**何が着地したかを言えない鼓動は、
 * 門を黙らせるためだけの操作である。** 第16条の作法をそのまま註釈へ向ける ——
 * 名前が在ることは中身が在ることではない。
 */
const BEAT_NOTE_MIN = 8;
const BEAT_PLACEHOLDER = /^(?:todo|tbd|wip|fixme|n\/?a|none|later|後で|あとで|未定|なし|仮|-+|—+|ー+|\.+|\?+)$/i;
function validateBeatNote(note) {
  const s = typeof note === 'string' ? note.trim() : '';
  if (!s) return { ok: false, why: '註釈が空である — 何が着地したかを言わない鼓動は記録ではない (錬5)' };
  if (BEAT_PLACEHOLDER.test(s)) return { ok: false, why: `註釈がプレースホルダである: "${s}" — 名前は中身ではない (第16条 / 錬5)` };
  if (s.length < BEAT_NOTE_MIN) return { ok: false, why: `註釈が短すぎる (${s.length} < ${BEAT_NOTE_MIN}) — 何が着地したかを述べよ (錬5)` };
  return { ok: true, note: s };
}

/** 証拠の住所を走行帳の中で **一意に比べられる形** へ正規化する(倉の中は相対・POSIX)。 */
function normalizeEvidence(p, repoRoot) {
  const root = repoRoot || path.dirname(__dirname);
  const abs = path.isAbsolute(p) ? p : path.join(root, p);
  const rel = path.relative(root, abs);
  const inside = rel && !rel.startsWith('..') && !path.isAbsolute(rel);
  return { abs, key: (inside ? rel : abs).split(path.sep).join('/'), inside };
}

/**
 * 走行帳に刻まれた鼓動を全て読む。**読み手は一箇所** —— audit も beat の錬2 も
 * dashboard もこの関数だけを読む(二つ書けば必ず食い違う: 第41条)。
 */
function beatsOf(run) {
  return ((run && run.history) || []).filter(h => h && h.event === 'beat' && h.evidence);
}

/**
 * 鼓動を刻む (第53条)。
 *
 * ── なぜこの口が要るか (実測された欠陥) ──────────────────────────────
 * `reform/sovereign-abode` は build 相 1 本を **8 本の仕事 (work-0〜7)** に分けた
 * 改革であり、各段が別々の PR として神のマージを待つ。**環は現に回っている** ——
 * work-0〜3 の四段が着地し、三本の証拠(build-1/2/3-evidence.md)が倉に在る。
 * にもかかわらず走行帳の最後の事象は `dispatch build` のままであり、第53条の門は
 * 1483 分の無音として正しく赤を鳴らした。**門は正しい。欠けていたのは口である。**
 *
 * `done` は使えない —— work-4〜7 が残る相を done にするのは第27条違反。
 * `resume` も違う —— 走者は死んでいない。**進捗そのものを記す語が機構に無かった。**
 *
 * ── これが「門を黙らせる道具」にならないための五つの錬 ────────────────
 *   錬1 証拠が実在せねばならない。空(空白のみを含む)も拒む   → exit 2
 *       (第54条: 在ることは資格ではない / 第16条: 名は中身ではない)
 *   錬2 同じ証拠で二度は鼓動できない。**これが無ければ古い 1 ファイルを毎日
 *       指すだけで永久に門を黙らせられる。** 住所でも中身の sha256 でも拒む
 *       —— 写して名を変えた証拠は、同じ証拠である              → exit 1
 *   錬3 `running` でない相には鼓動が無い(pending は走っておらず、done は終わっている) → exit 1
 *   錬4 **鼓動は status を一切変えない。** 相も domain も動かさない。
 *       done にも ratified にもできない —— 記録するだけの語である
 *   錬5 註釈が空・短すぎる・プレースホルダなら拒む            → exit 2
 *
 * 刻むのは **「今記録した」という真実だけ** である。過去の刻を騙らない(第22条)。
 *
 * @param {object} run 走行帳
 * @param {string} id 相 id
 * @param {{evidence:string, note:string, repoRoot?:string, now?:Function}} opts
 * @returns {{ok:true, phase:string, evidence:string, note:string, ts:string, sha256:string, beats:number}}
 * @throws {Error} `.exitCode` を携える(2 = 引数/証拠の不備・1 = 走行帳の状態が許さない)
 */
function beat(run, id, opts = {}) {
  const fail = (code, msg) => { const e = new Error(msg); e.exitCode = code; throw e; };
  const p = allPhases(run).get(id);
  if (!p) fail(2, `unknown phase: ${id}`);

  // ── 錬5: 註釈 ──────────────────────────────────────────────────────
  const nv = validateBeatNote(opts.note);
  if (!nv.ok) fail(2, `鼓動を刻めない: ${nv.why}\n  相 "${id}" — 何が着地したかを述べよ。`);

  // ── 錬1: 証拠の実在と中身 ───────────────────────────────────────────
  if (!opts.evidence || typeof opts.evidence !== 'string') {
    fail(2, `鼓動には証拠が要る: --evidence <path>\n  証拠を携えない鼓動は、門を黙らせる操作でしかない (第53条)。`);
  }
  const ev = normalizeEvidence(opts.evidence, opts.repoRoot);
  let st;
  try { st = fs.statSync(ev.abs); } catch {
    fail(2, `証拠が実在しない: ${opts.evidence}\n  相 "${id}" に鼓動は刻めない —— 名乗った証拠が無い(第22条 / 錬1)。\n  実物を確かめてから記録せよ(第27条は記録する者自身にも向く)。`);
  }
  if (st.isDirectory()) fail(2, `証拠が束である(ディレクトリ): ${opts.evidence}\n  鼓動は一つの実物を名指す (錬1)。`);
  if (st.size === 0) fail(2, `証拠が空である: ${opts.evidence} (0 バイト)\n  **在ることは資格ではない**(第54条 / 第16条 / 錬1)。`);
  const raw = fs.readFileSync(ev.abs);
  if (st.size < 4 * 1024 * 1024 && raw.toString('utf8').trim() === '') {
    fail(2, `証拠が空白しか含まない: ${opts.evidence} (${st.size} バイト)\n  中身を持たぬ証拠は証拠ではない(第16条 / 錬1)。`);
  }
  const sha256 = crypto.createHash('sha256').update(raw).digest('hex');

  // ── 錬2: 同じ証拠で二度は鼓動できない ────────────────────────────────
  const prior = beatsOf(run);
  const dupPath = prior.find(h => h.evidence === ev.key);
  if (dupPath) {
    fail(1, `この証拠は既に鼓動に使われている: ${ev.key}\n` +
            `  前の鼓動: ${dupPath.ts} (相 ${dupPath.phase || '?'}) — 「${dupPath.note || ''}」\n` +
            `  **同じ証拠を指し続ければ、門は永久に黙る。** 新しい着地には新しい証拠を携えよ (錬2)。`);
  }
  const dupHash = prior.find(h => h.sha256 && h.sha256 === sha256);
  if (dupHash) {
    fail(1, `この証拠は中身が既出である (sha256 ${sha256.slice(0, 12)}…): ${ev.key}\n` +
            `  同一の中身が ${dupHash.ts} に ${dupHash.evidence} として鼓動に使われた。\n` +
            `  **写して名を変えた証拠は、同じ証拠である** (錬2 / 第16条)。`);
  }

  // ── 錬3: 走っていない相に鼓動は無い ──────────────────────────────────
  if (p.status !== 'running') {
    fail(1, `相 "${id}" は running ではない (${p.status}) — 鼓動を刻めない (錬3)。\n` +
            `  pending の相はまだ走っておらず、done の相は既に終わっている。\n` +
            `  進捗を記せるのは、今まさに走っている相だけである。`);
  }

  // ── 錬4: **status を一切変えない。** 記録するだけである ────────────────
  const nowFn = opts.now || now;
  const ts = nowFn();
  run.history.push({
    ts, event: 'beat', phase: id, evidence: ev.key, sha256, bytes: st.size, note: nv.note,
    detail: `${id} ⟡ ${ev.key} — ${nv.note}`,
  });
  return { ok: true, phase: id, evidence: ev.key, note: nv.note, ts, sha256, bytes: st.size, beats: prior.length + 1 };
}

/**
 * ratify(): the review class blesses a domain, or rejects it.
 * On reject the named phase + its downstream reset — ACROSS domains, because a
 * review class may legitimately send work back to an EARLIER domain (Art. 14).
 * Any domain that owns a reset phase loses its ratification and reopens.
 * Guarded by MAX_DOMAIN_REWORK on the domain that owns `from`.
 */
function ratify(run, cardinal, opts = {}) {
  const d = run.domains.find(x => x.cardinal === cardinal);
  if (!d) throw new Error('no such cardinal: ' + cardinal);
  if (!opts.reject) {
    d.status = 'ratified';
    run.history.push({ ts: now(), event: 'ratify', detail: `${d.domain} ratified by ${d.reviewClass}` });
    return { ok: true, ratified: cardinal };
  }
  // rejection → rework, possibly upstream into another domain
  const from = opts.from || d.phases[0].id;
  const ownerOf = id => run.domains.find(x => x.phases.some(p => p.id === id));
  const target = ownerOf(from);
  if (!target) throw new Error('no such phase to rework from: ' + from);

  target.reworks += 1;
  if (target.reworks > MAX_DOMAIN_REWORK) {
    target.status = 'blocked';
    run.history.push({ ts: now(), event: 'domain-loop-guard', detail: `${target.domain} exceeded ${MAX_DOMAIN_REWORK} reworks` });
    return { ok: false, blocked: target.cardinal, message: `Domain ${target.domain} blocked after ${MAX_DOMAIN_REWORK} reworks — escalate to pontiff.` };
  }

  // downstream closure over EVERY phase in the conclave, not just this domain
  const every = [];
  for (const dom of run.domains) for (const p of dom.phases) every.push(p);
  const idset = new Set([from]);
  let changed = true;
  while (changed) { changed = false;
    for (const p of every) { if (idset.has(p.id)) continue; if (p.deps.some(x => idset.has(x))) { idset.add(p.id); changed = true; } }
  }
  const reopened = new Set();
  for (const dom of run.domains) {
    let touched = false;
    for (const p of dom.phases) if (idset.has(p.id)) { p.status = 'rework'; if (p.id !== from) p.artifactPath = null; touched = true; }
    if (touched) { if (dom.status === 'ratified') reopened.add(dom.cardinal); dom.status = 'active'; }
  }
  // the rejecting domain never ratifies itself on a reject
  if (d.status === 'ratified') { d.status = 'active'; reopened.add(d.cardinal); }
  run.history.push({ ts: now(), event: 'domain-rework', detail: `${d.domain} → ${target.domain}: reset ${[...idset].join(', ')} (rework ${target.reworks})${reopened.size ? '; un-ratified ' + [...reopened].join(', ') : ''}` });
  return { ok: true, reworked: [...idset], cardinal, target: target.cardinal, reopened: [...reopened], message: `${d.domain}: rework from ${from} (domain ${target.domain}).` };
}

function statusBoard(run) {
  const dg = { pending: '·', active: '▶', ratified: '✓', rejected: '↻', blocked: '🔴' };
  const pg = { pending: '·', running: '▶', done: '✓', rework: '↻', blocked: '🔴' };
  const lines = ['CONCLAVE — 聖職位階の進行', '═'.repeat(52)];
  for (const d of run.domains) {
    const rw = d.reworks ? ` (rework ${d.reworks})` : '';
    lines.push(`${dg[d.status] || '?'} 枢機卿 ${d.cardinal} — ${d.domain}${rw}   [review: ${d.reviewClass}]`);
    for (const p of d.phases) {
      // 第51条a: 静止は失敗より悪い。中断の疑いがある running を人に見せ、沈黙を破る。
      // **判定は `phaseSilence` ただ一つが下す** (reflect C-5)。
      // `--json` も同じ関数を読む —— 人の画面と機械の口が違う判定を書けば必ず食い違う。
      let note = '';
      const sil = phaseSilence(p);
      if (sil.state === 'no-dispatch') note = '  ⚠ (running・発令の刻なし — resume --force で回収せよ)';
      else if (sil.state === 'silent') note = `  🔴 (running ${Math.round(sil.ageMs / 60000)}分 — 実測のどの相より長い沈黙 [>${Math.round(SILENT_MS / 60000)}分]。神へ知らせよ)`;
      else if (sil.state === 'stale') note = `  ⚠ (running ${Math.round(sil.ageMs / 60000)}分 — 中断の疑い。resume で回収せよ)`;
      const rs = p.resumes ? ` (resume ${p.resumes})` : '';
      lines.push(`     ${pg[p.status] || '?'} ${p.gate ? '⚖️' : '  '} ${p.id} @${p.agent}${rs}${note}`);
    }
  }
  const dr = run.domains.filter(d => d.status === 'ratified').length;
  lines.push('═'.repeat(52), `domains ratified: ${dr}/${run.domains.length}`);
  return lines.join('\n');
}

// --- CLI ---
function parse(argv) { const f = {}, pos = []; for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) f[argv[i].slice(2)] = (argv[i+1] && !argv[i+1].startsWith('--')) ? argv[++i] : true; else pos.push(argv[i]); } return { f, pos }; }

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { f, pos } = parse(rest);
  const rp = f.run;
  const need = () => { if (!rp) { console.error('--run required'); process.exit(2); } };
  if (cmd === 'convene') {
    if (!pos[0] || !rp) { console.error('usage: conclave.js convene <dag.json> --run <run.json>'); process.exit(2); }
    const run = convene(pos[0]); save(rp, run); console.log(statusBoard(run));
  } else if (cmd === 'next') {
    need(); const run = load(rp);
    const step = next(run, { reclaim: !!f.reclaim, staleMs: f['stale-ms'] ? +f['stale-ms'] : undefined });
    if (step.phase === 'wave') markRunning(run, step.dispatch.map(d => d.id));
    save(rp, run); console.log(JSON.stringify(step, null, 2));
  } else if (cmd === 'done') {
    need(); const run = load(rp);
    /**
     * 序列の門が throw したら **save に到達しない** — run ファイルは書き換わらない。
     * これが「拒んだのに台帳だけ進む」を構造的に禁じる形である(第22条)。
     */
    try {
      const v = markDone(run, pos[0], f.artifact, { tier: f.tier });
      save(rp, run);
      if (v && v.state === 'unobservable') console.log(v.lines.join('\n'));
      else if (v && v.lines && v.lines.length) console.log(v.lines.join('\n'));
      console.log(statusBoard(run));
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  } else if (cmd === 'beat') {
    /**
     * 第53条の鼓動。**証拠を携えた進捗だけを刻む。**
     * 錬が throw したら `save` に到達しない —— 拒んだのに台帳だけ進む形を構造で禁ずる
     * (`done` と同じ作法)。exit 2 = 証拠/註釈の不備、exit 1 = 走行帳の状態が許さない。
     */
    need(); const run = load(rp);
    try {
      const before = JSON.stringify(run.domains);
      const res = beat(run, pos[0], {
        evidence: typeof f.evidence === 'string' ? f.evidence : undefined,
        note: typeof f.note === 'string' ? f.note : undefined,
      });
      // 錬4 を engine の外でも撃つ: 鼓動が状態を動かしていないことを保存前に検める。
      if (JSON.stringify(run.domains) !== before) {
        console.error('鼓動が状態を書き換えた — 錬4 違反。保存しない。');
        process.exit(1);
      }
      save(rp, run);
      console.log(JSON.stringify(res, null, 2));
      console.log('\n' + statusBoard(run));
    } catch (e) {
      console.error(e.message);
      process.exit(e.exitCode || 1);
    }
  } else if (cmd === 'resume') {
    // 第51条: 中断した走者の残骸を環へ戻す。
    need(); const run = load(rp);
    const res = resume(run, { phase: pos[0] || (typeof f.phase === 'string' ? f.phase : undefined),
                              force: !!f.force, staleMs: f['stale-ms'] ? +f['stale-ms'] : undefined });
    save(rp, run);
    console.log(JSON.stringify(res, null, 2)); console.log('\n' + statusBoard(run));
    if (!res.ok) process.exit(1);
  } else if (cmd === 'ratify') {
    need(); const run = load(rp); const res = ratify(run, pos[0], { reject: f.reject, from: f.from }); save(rp, run);
    console.log(JSON.stringify(res, null, 2)); console.log('\n' + statusBoard(run));
  } else if (cmd === 'status') {
    need();
    const run = load(rp);
    // FR-05: --json 指定時は人間向けテキストを 1 行も混ぜない。
    // **statusBoard と同じ run から作る** — 別の集計を書けば両者が食い違う。
    if (f.json) {
      const dr = run.domains.filter(d => d.status === 'ratified').length;
      const phases = [...allPhases(run).values()];   // allPhases は Map を返す — 実測で確かめた
      /**
       * 滞留を機械の口へ載せる (reflect C-5)。
       *
       * ⚠️ 実測(reflect): `--json` の相の鍵は `id,agent,status,gate` のみで、
       * **`dispatchedAt` も stale 判定も運んでいなかった。** 第51条が建てた警告は
       * `statusBoard` の**人間向けテキストにしか**載らず、機械は読めなかった。
       * 「鳴らない番人は、番人が居ないことより見つかりにくい」の実例である。
       *
       * **新しい engine は建てない。** 判定は `phaseSilence` ただ一つ ——
       * `statusBoard` が読むのと同じ関数である(別集計を書けば必ず食い違う)。
       */
      const at = Date.now();
      const sil = new Map(phases.map(p => [p.id, phaseSilence(p, at)]));
      const jsonPhase = (p) => {
        const s = sil.get(p.id);
        return {
          id: p.id, agent: p.agent, status: p.status, gate: !!p.gate,
          dispatchedAt: p.dispatchedAt || null,
          // 滞留の三値と経過時間。**閾値も機械へ渡す** — 読み手が別の数を持たないため(第41条)
          silence: s.state, ageMs: s.ageMs, stale: s.stale, silent: s.silent,
        };
      };
      process.stdout.write(JSON.stringify({
        domainsRatified: dr,
        domainsTotal: run.domains.length,
        phasesDone: phases.filter(p => p.status === 'done').length,
        phasesTotal: phases.length,
        domains: run.domains.map(d => ({
          cardinal: d.cardinal, domain: d.domain, status: d.status, reworks: d.reworks || 0,
          reviewClass: d.reviewClass,
          phases: (d.phases || []).map(jsonPhase),
        })),
        historyLength: (run.history || []).length,
        // ── 沈黙の門 (第51条 / reflect C-5) ──
        // 機械が**名指し**できる形にする。数えるだけでは resume を撃てない。
        staleMs: STALE_MS, silentMs: SILENT_MS, at: new Date(at).toISOString(),
        stalePhases: phases.filter(p => sil.get(p.id).stale).map(p => p.id),
        silentPhases: phases.filter(p => sil.get(p.id).silent).map(p => p.id),
        noDispatchPhases: phases.filter(p => sil.get(p.id).state === 'no-dispatch').map(p => p.id),
      }) + '\n');
      return;
    }
    console.log(statusBoard(run));
  } else if (cmd === 'audit') {
    /**
     * 第53条の門。**`--run` を取らない** —— 一本の走行ではなく、全ての走行帳を見る。
     * 見捨てられた走行が一件でも在れば exit 1。判定不能もまた exit 1 である
     * (第16条: 測れなかったものを緑に落とさない)。
     */
    const rep = auditRuns();
    if (f.json) process.stdout.write(JSON.stringify(rep) + '\n');
    else console.log(auditBoard(rep));
    const bad = rep.abandoned.length + rep.unknown.length + rep.unreadable.length;
    process.exit(bad === 0 ? 0 : 1);
  } else { console.error('commands: convene <dag> --run f | next --run f [--reclaim] | done <id> --run f --artifact p [--tier 1|2|3] | beat <id> --run f --evidence p --note "…" | resume [<id>] --run f [--force] [--stale-ms n] | ratify <cardinal> --run f [--reject --from id] | status --run f [--json] | audit [--json]'); process.exit(2); }
}
if (require.main === module) main();
module.exports = { convene, next, markRunning, markDone, resume, ratify, activeDomain, allPhases, statusBoard, phaseSilence,
  runAbandonment, auditRuns, auditBoard,
  beat, beatsOf, validateBeatNote, normalizeEvidence, BEAT_NOTE_MIN,
  MAX_DOMAIN_REWORK, MAX_PHASE_RESUME, STALE_MS, SILENT_MS, ABANDONED_MS };
