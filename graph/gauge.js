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
 * **台帳は冪等である**: 同じ観測は二度刻まれない。冪等鍵(指紋 `fp`)は
 * `slug`+`scale`+`metrics` から決まり `ts` に依存しない。予防(record が
 * 追記前に検める)と治癒(readLedger が読み時に畳む)を二重に敷く ——
 * 書き手の規律が競合等で漏れても、読み側が拾う。
 *
 * Usage:
 *   gauge.js score <run.json> [--json]        採点(決定的)
 *   gauge.js record <run.json> --slug <slug>  採点して台帳へ追記(冪等)
 *   gauge.js baseline                         全既存 run-state を record
 *   gauge.js compare <slugA> <slugB>          台帳から Δ 表
 *   gauge.js compare --last <N>               直近 N 件の推移
 *   gauge.js ledger                           台帳の一覧(畳んだ版)
 *   gauge.js ledger --audit                   重複と矛盾を数える(在れば exit 1)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');   // Node 標準。外部依存はゼロのまま(指紋 = sha256)
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
  /**
   * 序列の式を掛けるか (reflect C-3)。
   *
   * ⚠️ 旧実装は `trace.hasEpoch(run)` を読んだ —— **印を消せば式が全部飛ぶ。**
   * 「印なし = legacy = 罰しない」は、印を消しただけの走行にも同じ恩赦を与えた。
   * `epochStatus` は 'legacy'(機構が無かった時代)と 'stripped'(紀元以後なのに印が無い)を
   * 分ける。**stripped には式を掛ける** —— 恩赦は移行のためであって回避のためではない。
   */
  const underEra = (r) => trace.epochStatus(r) !== 'legacy';
  const declaredIs = (n) => marked.filter(p => tt[p.id].declared === n && tt[p.id].state !== 'unobservable').length;
  const tier1 = declaredIs(1), tier2 = declaredIs(2);
  const tier3 = marked.filter(p => trace.isTier3State(tt[p.id].state)).length;
  const unobservable = underEra(run)
    ? marked.filter(p => tt[p.id].state === 'unobservable').length
    // 印を持たない run は全相が観測不能である。**tier1 とは別の鍵で数える**(AC-H1)。
    : phases.length;
  const noTier = underEra(run)
    ? phases.filter(p => p.status === 'done' && (!tt[p.id] || tt[p.id].declared == null) && (!tt[p.id] || tt[p.id].state !== 'unobservable')).length
    : 0;
  // 序列1/2 を名乗りながら証跡の無い相 (門を素通りした legacy 台帳では立たない)
  const tier12Unproven = underEra(run)
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
    - (underEra(run) ? WEIGHTS.tierBreach * (noTier + tier12Unproven) : 0);
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

/**
 * ── 冪等鍵(指紋)の正規化 ──────────────────────────────────────
 *
 * **素の `JSON.stringify` を指紋の材料にしてはならない。** JS の
 * `JSON.stringify` は鍵の並び順に依存する(`{x,y}` と `{y,x}` が別文字列)。
 * `score()` が返す `metrics` を将来誰かが組み直して鍵順を変えれば、
 * **同じ観測の指紋が黙って割れる**。ゆえに指紋は安定化した文字列表現に建てる。
 *
 * - 非有限な数(`NaN`/`±Infinity`)は `"null"` — 第16条。
 *   **測れなかったものを 0 で埋めない。** `0` と区別して名指す。
 * - `-0` は `0` に畳む(`Object.is(-0,0) === false` という JS の非対称を吸う)。
 * - 数は `Number(v.toFixed(6))` で丸める。予防である —— 将来 `metrics` に
 *   生の除算結果(`0.1+0.2 = 0.30000000000000004`)が入っても指紋が割れない。
 *   6 桁は既存の `toFixed(3)` より細かく、現存する全ての値を無損失に通す。
 * - 配列は**順序を保つ**(配列の順序は意味である)。object は鍵を sort する。
 *
 * **深さには底がある(S-2)。** 自己再帰に上限が無ければ、深い入れ子を持つ
 * **たった一行**が `RangeError` で `readLedger()` を倒し、pulse / dashboard まで
 * 巻き添えにする。`JSON.parse` は耐えるのにこちらが倒れるのは、第55条(e)
 * 「一行の破損で秤全体を倒さない」への裏切りである。ゆえに底を越えた値は
 * **例外ではなく判別可能な標識(`GAUGE_TOO_DEEP`)を投げ**、呼び手が「破損行」として
 * 既存の作法どおり読み飛ばす。**握り潰さない** —— 黙って `'null'` を返せば
 * 深い別物どうしが同じ鍵になり、S-1 と同じ「黙って畳む」病になる。
 *
 * 上限 64: 実在する `metrics` の深さは 2。64 は現実の 30 倍の余裕を持ちつつ、
 * Node の既定スタック(数千段)から二桁遠い。
 *
 * 外に export しない —— 出せば第二の正規化規則が生まれる。
 */
const MAX_CANONICAL_DEPTH = 64;

/** 深すぎる値を名指す判別可能な誤り。`readLedger` はこれを破損行として扱う。 */
function tooDeepError(depth) {
  const e = new Error(`ledger value nests deeper than ${depth} — 破損行として扱う (S-2)`);
  e.code = 'GAUGE_TOO_DEEP';
  return e;
}

function canonical(v, depth = 0) {
  if (depth > MAX_CANONICAL_DEPTH) throw tooDeepError(MAX_CANONICAL_DEPTH);
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return 'null';
    const n = Object.is(v, -0) ? 0 : Number(v.toFixed(6));
    return String(n);
  }
  if (Array.isArray(v)) return '[' + v.map(x => canonical(x, depth + 1)).join(',') + ']';
  if (typeof v === 'object') {
    const parts = [];
    for (const k of Object.keys(v).sort()) {
      if (v[k] === undefined) continue;   // undefined の鍵はそもそも出力しない
      parts.push(JSON.stringify(k) + ':' + canonical(v[k], depth + 1));
    }
    return '{' + parts.join(',') + '}';
  }
  return 'null';   // function / symbol / bigint —— 台帳には現れない
}

/**
 * entry の冪等鍵。**材料は `slug` / `scale` / `metrics` の三つに固定する。**
 *
 * - `ts` は含めない —— 同じ観測を別の時刻に record しても同じ鍵でなければ、
 *   冪等性そのものが成り立たない。
 * - `fp` 自身も含めない(自己参照を避ける)。**これが「鍵を持つ旧行と持たない
 *   新行が同じ鍵になる」ことの成立条件である。**
 * - 接頭辞 `g1:` は**材料と正規化の版**を名乗る。将来材料を変える必要が生じたら
 *   `g2:` を名乗り、`g1:` の行は `g1:` の規則で再導出する ——
 *   「過去の指紋が黙って動く」事故を構造的に防ぐ。
 * - 16 桁 = 64bit。台帳は人が目で読む器であり、64 桁の全文はノイズになる。
 *   10^4 行でも誕生日衝突は約 5×10^-12。
 */
function fingerprint(entry) {
  const e = entry || {};
  const material = {
    slug: e.slug ?? null,
    scale: e.scale ?? null,
    metrics: e.metrics ?? null,
  };
  return 'g1:' + crypto.createHash('sha256').update(canonical(material)).digest('hex').slice(0, 16);
}

/**
 * ── 行の**真の**鍵(S-1) ────────────────────────────────────────────
 *
 * **`e.fp` を信じてはならない。** 台帳は JSONL の平文であり、人の手編集・
 * git の衝突解決・将来の版違いで、中身と食い違う `fp` が容易に生まれる。
 * 旧実装は `e.fp || fingerprint(e)` と書いており、行が名乗る鍵を検証せずに
 * 採っていた —— 結果、`score:99` の別観測に `score:10` の鍵を載せるだけで
 * **99 の観測が黙って消え、`--audit` はそれを「重複」としか呼ばなかった**。
 * これは第55条(d)「矛盾を黙って畳まない」の実質的な不成立である。
 *
 * ゆえに鍵は**常に材料から再導出する**。第55条(f)が言う「鍵は読み時に
 * 導出できる」は、まさに格納値を信じる必要が無いことの宣言である。
 * `fp` は人が目で読む注記として残るが、**判断には一切使わない**。
 *
 * 性能: `fingerprint` は sha256 一回。実台帳規模(10^4 行)で無視できる。
 *
 * 深すぎる行(S-2)は `null` を返す —— 呼び手が破損行として扱う。
 */
function trueKey(e) {
  try { return fingerprint(e); }
  catch (err) {
    if (err && err.code === 'GAUGE_TOO_DEEP') return null;
    throw err;
  }
}

/**
 * 同一指紋は**先着(ts 最小)を残し**、ts 昇順に整列して返す。純関数・I/O 無し。
 *
 * **keep-last を採らない理由**: git マージ後の行順は時刻順ではない(実測で
 * `T0, T2, T1` の並びが出る)。「後着 = 新しい」は嘘になりうる。
 * **行位置を時刻の代理にしない** —— それが順序非依存の全てである。
 *
 * `ts` は ISO8601 の UTC 文字列なので**文字列の辞書順 = 時刻順**。
 * `Date.parse` を挟まない —— 壊れた `ts` で `NaN` が出れば比較が非決定になる
 * (第16条の精神: 測れないものを黙って 0 にしない)。
 */
function foldLedger(entries) {
  const keep = new Map();                        // fp -> entry
  const passthrough = [];                        // 畳みの対象外(metrics 無し / 深すぎ)
  for (const e of (Array.isArray(entries) ? entries : [])) {
    if (!e || typeof e !== 'object') continue;   // 壊れた値は落とす(fail-safe)
    // metrics を持たない行(baseline の {slug,error} 等)は畳みの対象外。
    // 指紋の材料が無いものを畳めば、別々の失敗が一つに見える。
    // **`keep` の鍵空間に混ぜない**(R-6: 外から `fp:"raw:0"` を名乗る行と衝突しうる)。
    if (!e.metrics) { passthrough.push(e); continue; }
    const fp = trueKey(e);                       // ★ 常に再導出する。行の自己申告は信じない(S-1)
    if (fp === null) { passthrough.push(e); continue; }   // 深すぎる行は畳まず素通し(S-2)
    const cur = keep.get(fp);
    if (!cur || String(e.ts) < String(cur.ts)) keep.set(fp, e);   // keep-first = ts 最小
  }
  return [...keep.values(), ...passthrough].sort((a, b) => {
    const ta = String((a && a.ts) || ''), tb = String((b && b.ts) || '');
    if (ta !== tb) return ta < tb ? -1 : 1;
    // 同時刻の tie-break も決定的に —— shuffle しても同じ列を返すための必須条件。
    const fa = (a && a.metrics ? trueKey(a) : '') || '';
    const fb = (b && b.metrics ? trueKey(b) : '') || '';
    return fa < fb ? -1 : fa > fb ? 1 : 0;
  });
}

/**
 * 台帳を読む。**既定では畳んで返す。**
 *
 * 畳みを `readLedger` の外の別経路に置かない理由はただ一つ:
 * `pulse.js` が `readLedger()` の全行を断面に載せ、dashboard がそれを描く。
 * pulse / dashboard を触らずに「画面に同じ点が三段並ぶ」を治す道は、
 * **源である `readLedger()` が畳むこと以外に無い。**
 *
 * 生の全行が要る者には `readLedger({ raw: true })` を残す(監査・掃除・後方互換)。
 */
function readLedger(opts = {}) {
  const p = ledgerPath();
  if (!fs.existsSync(p)) return [];
  // 追記型 JSONL は git マージで行が破損し得る。一行の破損で秤全体を
  // 倒さない — 破損行は警告して読み飛ばす(壊れた行は compare に使えないだけ)。
  //
  // **破損は「parse できない」だけではない(S-2)。** `JSON.parse` は耐えるが
  // `canonical()` の底を越えるほど深い入れ子の一行も、同じく破損である。
  // ここで名指して読み飛ばす —— 一行のために台帳全体を落とさない(第55条 e)。
  const out = [];
  for (const line of fs.readFileSync(p, 'utf8').split('\n').filter(Boolean)) {
    let row;
    try { row = JSON.parse(line); }
    catch { console.error(`⚠️ ledger line skipped (corrupt): ${line.slice(0, 60)}…`); continue; }
    if (row && typeof row === 'object' && row.metrics && trueKey(row) === null) {
      console.error(`⚠️ ledger line skipped (too deep, > ${MAX_CANONICAL_DEPTH}): ${line.slice(0, 60)}…`);
      continue;
    }
    out.push(row);
  }
  // 畳みは parse を全部終えた**後**に掛かる。破損行の扱いには一切影響しない。
  // `foldLedger` も try の内側に置く —— 畳みで倒れれば生の行まで失われる。
  if (opts.raw) return out;
  try { return foldLedger(out); }
  catch (err) {
    console.error(`⚠️ fold failed, returning raw rows: ${err.message}`);
    return out;   // fail-open: 畳めなくとも記録は返す
  }
}

/**
 * 採点して台帳に刻む。**同じ観測は二度刻まない(冪等)。**
 *
 * 予防(ここ)と治癒(`foldLedger`)を二重に敷く: 書き手の規律が競合等で
 * 漏れても読み側が拾う。**fail-open** —— 台帳が読めなければ「重複を見逃して
 * 書く」側に倒す。削除・truncate・`writeFileSync` の経路は一つも足さない。
 * **台帳の第一の徳は「記録が失われない」ことである。**
 */
function record(runFile, slug) {
  const run = JSON.parse(fs.readFileSync(runFile, 'utf8'));
  const m = score(run);
  const entry = {
    ts: new Date().toISOString(),
    slug,
    scale: (run.meta && run.meta.scale) || null,
    metrics: m,
  };
  entry.fp = fingerprint(entry);   // ★ 鍵は entry の中に住む(第二の住所を作らない)

  let existing = null;
  try {
    for (const e of readLedger({ raw: true })) {
      if (!e || typeof e !== 'object') continue;
      if (!e.metrics) continue;                  // 材料の無い行は鍵を持たない
      if (trueKey(e) === entry.fp) { existing = e; break; }   // ★ 再導出して突き合わせる(S-1)
    }
  } catch (err) {
    // 読めない台帳は「書く」側に倒す。既存行は決して消さない。
    console.error(`⚠️ ledger unreadable, recording anyway: ${err.message}`);
  }
  // 第一の記録を正とする(keep-first)。`skipped` は**返り値にだけ載る** ——
  // 台帳のファイルには一字も書かない(足す鍵は `fp` 一つだけ)。
  if (existing) return { ...existing, skipped: true };

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

/**
 * 「最新」は **ts の最大**であって末尾行ではない。
 *
 * `entries` は引数で受ける —— 畳みを通っていない配列を渡されうる。
 * ゆえに順序非依存を**関数自身の性質**として持たせる(畳みとの二重防御)。
 * git マージ後の行順は時刻順ではない。行位置を時刻の代理にしてはならない。
 */
function latestFor(slug, entries) {
  const hits = (Array.isArray(entries) ? entries : []).filter(e => e && e.slug === slug && e.metrics);
  if (!hits.length) return null;
  return hits.reduce((best, e) => (String(e.ts || '') > String(best.ts || '') ? e : best), hits[0]);
}

/**
 * 台帳の健全性を数える純関数。**読むだけ。書かない。**
 *
 * ── 矛盾の定義を正した(R-2 / R-5 / S-1) ──────────────────────────
 *
 * 旧定義は「同一 slug に metrics が食い違う観測が二つ以上」だった。これは
 * **同一 slug の正当な改善(80 → 100)を矛盾と呼ぶ**。掃除を完璧に終えた 6 行の
 * 台帳でも `conflicts=1` / exit 1 になり、`requirements.md:318` と `design.md:565`
 * が約束した「掃除後 exit 0」が**達成不能**だった。改善が記録されるたびに
 * 増える門は、`auditLedger` 自身のコメントが戒める「鳴りっぱなしの門」である。
 * 同一 slug の別観測は**矛盾ではなく履歴**である —— 畳みが両方残すのが正しく
 * (AC-3b / AC-7a)、audit がそれを罪と呼ぶのは同じ倉の中で評価が割れている。
 *
 * **真の矛盾は「行が名乗る鍵と、中身から導かれる鍵が食い違うこと」である。**
 * 指紋は中身の関数なのだから、正直な行では必ず一致する。食い違うのは
 * 手編集・git の衝突解決・版ずれで**偽の鍵**が生まれた時だけであり、
 * それこそが「別の観測を黙って飲み込む」S-1 の発火条件そのものである。
 * ここで名指さなければ、第55条(d)「矛盾を黙って畳まない」は成立しない。
 *
 * 数え方はすべて**再導出した鍵**で行う。行の自己申告は数にも入れない(S-1)。
 * 第16条: 鍵の有無や `undefined` を 0 で埋めない —— 名指す。
 */
function auditLedger(entries) {
  const list = Array.isArray(entries) ? entries.filter(e => e && e.metrics) : [];
  const byFp = new Map();      // trueKey -> entry[]
  const conflicts = [];
  let tooDeep = 0;
  for (const e of list) {
    const fp = trueKey(e);
    if (fp === null) {
      // 深すぎて鍵が導けない行(S-2)。読み飛ばされる行であることを名指す。
      tooDeep++;
      conflicts.push({ slug: e.slug, kind: 'too-deep', declared: e.fp || null, actual: null,
        observations: [{ ts: e.ts, fp: e.fp || null, score: null }] });
      continue;
    }
    if (!byFp.has(fp)) byFp.set(fp, []);
    byFp.get(fp).push(e);
    // ★ 名乗った鍵と真の鍵の突き合わせ。ここが S-1 の門である。
    if (e.fp != null && e.fp !== fp) {
      conflicts.push({
        slug: e.slug, kind: 'forged-fp', declared: e.fp, actual: fp,
        observations: [{ ts: e.ts, fp: e.fp, score: e.metrics && e.metrics.score }],
      });
    }
  }
  const rows = list.length;
  const distinct = byFp.size + tooDeep;
  return { rows, distinct, duplicates: Math.max(0, rows - distinct), conflicts };
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
      // 二度目は沈黙しない —— 名乗る。**exit code は 0 のまま**(重複は失敗ではない)。
      if (e.skipped) console.log(`📒 already recorded: ${e.slug} → ${e.metrics.score}/100 @ ${e.ts} (同一指紋 ${fingerprint(e)}) — 追記しない`);
      else console.log(`📒 recorded: ${e.slug} → ${e.metrics.score}/100 (${ledgerPath()})`);
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
    if (cmd === 'ledger') {
      // 監査(FR-7 / 読み取り専用)。**生の全行**を数える —— 畳んでから数えては
      // 重複が見えない。判別可能な信号: 重複か矛盾が在れば exit 1。
      if (argv.includes('--audit')) {
        const a = auditLedger(readLedger({ raw: true }));
        console.log(`📒 rows=${a.rows} distinct=${a.distinct} duplicates=${a.duplicates} conflicts=${a.conflicts.length}`);
        for (const c of a.conflicts) {
          if (c.kind === 'too-deep') {
            console.log(`  ⚠️ 矛盾: ${c.slug} — 入れ子が深すぎて鍵を導けない行(読み飛ばされる)@ ${c.observations[0].ts}`);
          } else {
            console.log(`  ⚠️ 矛盾: ${c.slug} — 名乗る指紋 ${c.declared} が中身から導かれる ${c.actual} と食い違う (@ ${c.observations[0].ts}, score ${c.observations[0].score})`);
          }
        }
        process.exit(a.duplicates > 0 || a.conflicts.length > 0 ? 1 : 0);
      }
      const folded = readLedger();
      const raw = readLedger({ raw: true });
      const lines = [renderLedger(folded)];
      // 畳んだ件数を名乗る —— 黙って行を減らす画面は信用できない。
      if (raw.length !== folded.length) {
        lines.push(`  (raw ${raw.length} 行 / 重複 ${raw.length - folded.length} 行を畳んだ — \`gauge.js ledger --audit\` で内訳)`);
      }
      console.log(lines.join('\n'));
      return;
    }
    console.error('commands: score <run.json> [--json] | record <run.json> --slug <s> | baseline | compare <a> <b> | compare --last N | ledger [--audit]');
    process.exit(3);
  } catch (e) {
    console.error('🔴 ' + e.message);
    process.exit(2);
  }
}

if (require.main === module) main();
module.exports = {
  score, normalize, record, baseline, compare, readLedger, ledgerPath, WEIGHTS,
  // ── 冪等性の器(足すだけ。既存 export は一つも消さない・名も変えない) ──
  fingerprint, foldLedger, latestFor, auditLedger,
};
