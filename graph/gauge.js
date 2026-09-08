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
 *   gauge.js ledger --audit                   重複・偽の鍵・読めない行・先回りを数える
 *
 * exit code(この秤の全命令に共通。**沈黙を成功と呼ばない**):
 *   0 = 健全 / 正常に終わった
 *   1 = `ledger --audit` のみ。**機械が畳めば消える欠陥**(重複)。掃除(FR-8)で必ずゼロにできる
 *   2 = **人が中身を読むまで消えない事故**。`ledger --audit` では偽の指紋 / 深すぎて鍵を導けない行 /
 *       読めない行(corrupt) / 未来の時刻を名乗る行 / 秤が書かない鍵を持つ行。
 *       `record` では**先回り**(既記録の行が未来に住む・秤の書式でない)。
 *       他の命令では「測れない」(相を持たない run-state 等)。第37条: 不在は通過ではない
 *   3 = 命令・引数の誤り(未知の命令・usage 不足・`--last` が整数でない・
 *       **引数で指されたファイルが読めない/壊れている**)。
 *       **誤字を exit 0 で成功に見せない** —— 何もしなかったことを成功と名乗るのが最も危険な嘘である
 *       **2 は台帳の事故に予約する** —— 打ち間違いを台帳の汚染として報告させない(review-3 D-3)。
 *
 * **`--raw` という CLI の旗は無い。** 生の全行は `readLedger({ raw: true })` という
 * **プログラム側の口**だけが返す(監査・掃除・後方互換のための材料)。
 * `raw:true` は深すぎる行も破損行として捨てず**本当に生のまま**返す ——
 * 上流が先に捨てれば、監査は「読めなかった行」を 0 件と偽り、掃除はその行を永久に消す。
 * 既定(`readLedger()`)は破損行と深すぎる行を名指して読み飛ばし、同一指紋を畳んで ts 昇順で返す。
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
 *
 * (この註は直下の `fingerprint` に掛かる。間に挟まる書式の註は F-1 の検知面である。)
 */
/**
 * ── 秤が書く行の書式(F-1 / 先回り毒の検知面) ──────────────────────
 *
 * `record` が刻む行の鍵は **`ts` / `slug` / `scale` / `metrics` / `fp` の五つだけ**である
 * (`gauge.js:record`)。これ以外の鍵を持つ行は、**秤が書いたものではない** ——
 * 人の手編集・git の衝突解決・他所からの流入・そして**先回り毒**である。
 *
 * 指紋の材料は `slug`+`scale`+`metrics` に固定されている(冪等性の成立条件)。
 * ゆえに材料外の鍵を**いくつ足しても鍵は変わらない** —— 先回り毒はこの窓から入る。
 * 鍵の材料に `ts` を混ぜれば毒は防げるが、**同じ観測が撃つたび別物になり
 * 冪等性そのものが原理的に成立しなくなる**(第55条 a)。
 * ゆえに**材料は変えず、名指す側を強くする**。
 */
const ENTRY_KEYS = ['ts', 'slug', 'scale', 'metrics', 'fp'];

/** 秤が書かない鍵(材料外・書式外)を名指す。0 で埋めず列挙する(第16条)。 */
function alienKeys(e) {
  if (!e || typeof e !== 'object') return [];
  return Object.keys(e).filter(k => !ENTRY_KEYS.includes(k)).sort();
}

/**
 * 読めなかった行の標識(F-2)。`JSON.parse` に失敗した行は**オブジェクトにならない**ので、
 * 判別可能な標識に包んで初めて「何行あったか」を下流が数えられる。
 * `readLedger({ raw:true, withCorrupt:true })` だけがこれを返す ——
 * 既定の `raw` の意味(生きた行の生の列)は一字も変えない。
 */
const CORRUPT_MARK = '__gaugeCorrupt';
function isCorruptMark(e) { return !!(e && typeof e === 'object' && e[CORRUPT_MARK] === true); }

/**
 * 引数で指されたファイルを読む。**読めない/壊れているのは「引数の誤り」である**(review-3 D-3)。
 *
 * 旧実装は `main()` の catch がこれを exit 2 に落としていた。だが 2 は
 * 「台帳に人が読むべき事故がある」に予約された信号である —— **打ち間違いを
 * 台帳の汚染として報告させれば、P-8 が分けた信号がその一段外で崩れる。**
 * 冒頭の散文は既に「3 = 引数の誤り」と約束していた。**散文に実装を追いつかせる。**
 */
function readRunFile(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (err) {
    const e = new Error(`run-state を読めない: ${file} — ${err.message}`);
    e.gaugeExit = 3;
    throw e;
  }
}

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
 * 性能(実測。「無視できる」と書いて測らないのは第38条違反だった —— review-2 P-2):
 * 常時再導出は自己申告の短絡に比べ `foldLedger` を **x8〜x17**、`record` を **x7〜x9** 遅くする
 * (N=20000 で fold 4ms → 68ms、N=10000 の record ×10 で 85ms → 757ms)。
 * **それでも自己申告には戻らない**(S-1 の再発は台帳の記録が黙って消える病である)。
 * 代わりに**同じ行の鍵を二度導出しないこと**で代償を返す:
 *   - `foldLedger` は呼び出しの内側だけで生きる memo を持つ(整列の比較子が O(n log n) 回叩く)
 *   - `baseline` は `keyIndex` を一度だけ組み、M 創造物 × N 行の O(M·N) を O(M+N) に戻す
 * **memo が保持するのは再導出した鍵であって自己申告ではない** —— S-1 とは無関係である。
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
 * **再導出した鍵 → 行** の索引(keep-first)。`record` / `baseline` の重複検査の唯一の材料。
 *
 * **行の自己申告 `fp` は一切見ない(S-1)。** 索引の鍵は必ず `trueKey` の返り値である。
 * 一度組めば `baseline` が M 回の record で使い回せる —— これが R-3 / P-2 の処置である。
 */
function keyIndex(entries) {
  const idx = new Map();
  for (const e of (Array.isArray(entries) ? entries : [])) {
    if (!e || typeof e !== 'object' || !e.metrics) continue;   // 材料の無い行は鍵を持たない
    const derived = trueKey(e);                                // ★ 常に再導出。自己申告は見ない(S-1)
    if (derived === null) continue;                            // 深すぎる行は鍵を持たない(S-2)
    if (!idx.has(derived)) idx.set(derived, e);                // 先着を正とする(keep-first)
  }
  return idx;
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
  /**
   * **鍵の memo(P-2)。** 呼び出しの内側だけで生き、返らない —— 台帳の第二の住所にはならない。
   * 整列の比較子は O(n log n) 回叩くので、memo が無いと同じ行の sha256 を何度も引き直す。
   * **保持するのは `trueKey` の返り値**であって行の自己申告ではない(S-1 とは無関係)。
   */
  const memo = new Map();
  const key = (e) => {
    if (memo.has(e)) return memo.get(e);
    const k = trueKey(e);
    memo.set(e, k);
    return k;
  };
  for (const e of (Array.isArray(entries) ? entries : [])) {
    if (!e || typeof e !== 'object') continue;   // 壊れた値は落とす(fail-safe)
    // metrics を持たない行(baseline の {slug,error} 等)は畳みの対象外。
    // 指紋の材料が無いものを畳めば、別々の失敗が一つに見える。
    // **`keep` の鍵空間に混ぜない**(R-6: 外から `fp:"raw:0"` を名乗る行と衝突しうる)。
    if (!e.metrics) { passthrough.push(e); continue; }
    const fp = key(e);                           // ★ 常に再導出する。行の自己申告は信じない(S-1)
    if (fp === null) { passthrough.push(e); continue; }   // 深すぎる行は畳まず素通し(S-2)
    const cur = keep.get(fp);
    if (!cur || String(e.ts) < String(cur.ts)) keep.set(fp, e);   // keep-first = ts 最小
  }
  return [...keep.values(), ...passthrough].sort((a, b) => {
    const ta = String((a && a.ts) || ''), tb = String((b && b.ts) || '');
    if (ta !== tb) return ta < tb ? -1 : 1;
    // 同時刻の tie-break も決定的に —— shuffle しても同じ列を返すための必須条件。
    const fa = (a && a.metrics ? key(a) : '') || '';
    const fb = (b && b.metrics ? key(b) : '') || '';
    if (fa !== fb) return fa < fb ? -1 : 1;
    /**
     * **第二段(P-4)。** `metrics` を持たない行どうしは `ts` も鍵も持たないので、
     * ここまでで全て比較不能 = `Array.sort` の安定性任せ = 入力順依存だった。
     * 「shuffle しても同じ列」という上の宣言が passthrough について破れていた。
     * 行の正規化文字列を最後の錘にする —— 中身が同じ行なら並べ替えても同じ列になる。
     */
    let ja = '', jb = '';
    try { ja = canonical(a); } catch { ja = ''; }
    try { jb = canonical(b); } catch { jb = ''; }
    return ja < jb ? -1 : ja > jb ? 1 : 0;
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
 *
 * ── `raw:true` は**本当に生**である(review-2 P-1) ─────────────────
 *
 * S-2 の修理は too-deep の読み飛ばしを `opts.raw` の**前**に置いた。結果:
 *   ① `raw:true` が行を落とした(ファイル 2 行 → 1 行)。監査と掃除の唯一の材料が痩せた。
 *   ② `auditLedger` の `too-deep` 枝が CLI から**到達不能**になり、
 *      全行が深すぎる台帳を `--audit` が `rows=0 … exit 0`「健全」と答えた。
 *      **読めなかった行を 0 件と偽るのは第16条に真っ向から反する。**
 *   ③ FR-8 の掃除(畳んだ版で置き換える)が深い行を**ファイルから永久に消す**。
 * ゆえに **`raw` は too-deep の検査より前で返す**。深すぎる行の扱いは
 * `foldLedger`(passthrough)と `auditLedger`(too-deep 枝)が既に持っている ——
 * 上流が先に捨てていたせいで、その備えが使われていなかっただけである。
 *
 * ── 読めなかった行は**数えられる形で**返す(F-2 / 第16条) ──────────
 *
 * P-1 の修理は too-deep を `auditLedger` から見えるようにした。**だが隣の入口が残った。**
 * `JSON.parse` に失敗した行は `raw:true` でもここで捨てられ、監査の目に一度も触れない。
 * 結果、ファイルに 4 行あって全部が壊れている台帳を `--audit` が
 * `rows=0 … exit 0` =「健全」と答えた(security-3 F-2 の実測)。
 * **読めなかった行を 0 件と偽るのは、測れなかったものをゼロで埋める行為である。**
 *
 * ゆえに `withCorrupt:true` を渡された時だけ、壊れた行を判別可能な標識
 * (`{__gaugeCorrupt:true, line}`)として列に混ぜて返す。**既定の `raw` の意味は
 * 一字も変えない** —— 掃除(FR-8)は生の列を書き戻す道具であり、そこに標識が混ざれば
 * 台帳が標識で汚れる。数えるのは監査だけの権能である。
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
  const src = new Map();   // row -> 元の行テキスト(名指しに使う。深い行は JSON.stringify できない)
  for (const line of fs.readFileSync(p, 'utf8').split('\n').filter(Boolean)) {
    let row;
    try { row = JSON.parse(line); }
    catch {
      console.error(`⚠️ ledger line skipped (corrupt): ${line.slice(0, 60)}…`);
      // ★ 監査だけが標識を受け取る。他の全ての呼び手には従来どおり見えない(F-2)。
      if (opts.raw && opts.withCorrupt) out.push({ [CORRUPT_MARK]: true, line: line.slice(0, 200) });
      continue;
    }
    if (row && typeof row === 'object') src.set(row, line);
    out.push(row);
  }
  // ★ 生を名乗る道は、深さの検査より**前**に返る。生は生である(P-1)。
  if (opts.raw) return out;
  const kept = [];
  for (const row of out) {
    if (row && typeof row === 'object' && row.metrics && trueKey(row) === null) {
      // **`JSON.stringify(row)` を使ってはならない** —— 深すぎる行はまさにそこで
      // `RangeError` を投げ、S-2 が塞いだ穴を名指しの側から開け直す。元の行テキストを使う。
      console.error(`⚠️ ledger line skipped (too deep, > ${MAX_CANONICAL_DEPTH}): ${String(src.get(row) || '').slice(0, 60)}…`);
      continue;
    }
    kept.push(row);
  }
  // 畳みは parse を全部終えた**後**に掛かる。破損行の扱いには一切影響しない。
  // `foldLedger` も try の内側に置く —— 畳みで倒れれば生の行まで失われる。
  try { return foldLedger(kept); }
  catch (err) {
    console.error(`⚠️ fold failed, returning raw rows: ${err.message}`);
    return kept;   // fail-open: 畳めなくとも記録は返す
  }
}

/**
 * ── 先回り毒への処置(F-1) ────────────────────────────────────────
 *
 * **設計判断を先に書く。三案を比べた。**
 *
 * (α) 指紋の材料に `ts` を混ぜる → **棄却**。同じ観測が撃つたび別の鍵になり、
 *     冪等性そのものが原理的に成立しなくなる(第55条 a)。毒は防げるが病人が死ぬ。
 * (β) 衝突した既存行を新しい観測で**上書き**する → **棄却**。台帳に削除・上書きの
 *     経路を一つも足さないという第55条(e)の約束を破る。毒の側が「正当な観測」を
 *     名乗れば、今度は本物の記録が消える。
 * (γ) **材料は変えず、黙って捨てるのをやめる** → **採用**。
 *     `record` が skip する前に既存行を三つの物差しで検める:
 *       1. **先回り**: 既存行の `ts` が、観測している走行の**開始よりも前**に住む。
 *          走行が始まる前にその走行を観測することは原理的に不可能である。
 *          攻撃者・**時計の狂った機**・**古い台帳のマージ**のいずれでも同じ形で現れる。
 *       2. **未来**: 既存行の `ts` が今より先に住む(時計の狂い / 捏造)。
 *       3. **書式外**: 秤が書かない鍵(`note` 等)を持つ。指紋の材料外なので
 *          いくら足しても鍵は変わらない —— 毒はまさにこの窓から入る。
 *     一つでも当たれば **skip しない**。正当な観測を**追記した上で**名指す
 *     (`preempted` を返り値に載せ、CLI は exit 2)。
 *     **追記する理由**: 「記録が失われない」が台帳の第一の徳だからである。
 *     拒めば毒の目的(正当な観測を刻ませない)がそのまま達成される。
 *
 * **なぜ走行の「開始」であって「終了」でないか。** 終了(最後の history)を境にすると、
 * 記録後に点を動かさない出来事が一つ足されただけで既存行が「先回り」に見え、
 * R-2 が戒めた「鳴りっぱなしの門」になる。開始は走行が終わっても動かない。
 *
 * **限界を正直に書く。** 走行の開始から今までの窓に `ts` を置き、余分な鍵を持たない毒は
 * 依然として正当な記録と区別できない —— それは冪等性の定義そのものであって、
 * 実装の欠陥ではない。ここで塞げるのは現実に起きる形(1999 年の毒 / 狂った時計 /
 * 古い台帳のマージ / `note` を足した手編集)である。
 */
const CLOCK_SKEW_TOLERANCE_MS = 24 * 60 * 60 * 1000;   // 機の間の時計のずれを罪と呼ばない

/** 走行が始まった時刻(history の最小 ts)。読めなければ null —— 0 で埋めない(第16条)。 */
function runStartTs(run) {
  const h = (run && Array.isArray(run.history)) ? run.history : [];
  let min = null;
  for (const ev of h) {
    const t = ev && typeof ev.ts === 'string' ? ev.ts : null;
    if (t && !isNaN(Date.parse(t)) && (min === null || t < min)) min = t;
  }
  return min;
}

/**
 * 既存行が「正当な先着」と呼べるかを検める。呼べない理由を**列挙して**返す(第16条)。
 * 空の配列 = 正当な先着 = 黙って skip してよい。
 */
function preemptionReasons(existing, entry, run, nowIso) {
  const why = [];
  if (!existing || typeof existing !== 'object') return why;
  const ets = typeof existing.ts === 'string' ? existing.ts : null;
  const start = runStartTs(run);
  if (ets === null || isNaN(Date.parse(ets))) {
    why.push(`既存行の ts が時刻として読めない (${JSON.stringify(existing.ts)})`);
  } else {
    if (start && ets < start) {
      why.push(`既存行 ${ets} が走行の開始 ${start} より前に住む — 走行の前にその走行は観測できない`);
    }
    const skew = Date.parse(ets) - Date.parse(nowIso);
    if (skew > CLOCK_SKEW_TOLERANCE_MS) {
      why.push(`既存行 ${ets} が今 (${nowIso}) より未来に住む`);
    }
  }
  const alien = alienKeys(existing);
  if (alien.length) why.push(`秤が書かない鍵を持つ: ${alien.join(', ')}`);
  return why;
}

/**
 * 採点して台帳に刻む。**同じ観測は二度刻まない(冪等)。**
 *
 * 予防(ここ)と治癒(`foldLedger`)を二重に敷く: 書き手の規律が競合等で
 * 漏れても読み側が拾う。**fail-open** —— 台帳が読めなければ「重複を見逃して
 * 書く」側に倒す。削除・truncate・`writeFileSync` の経路は一つも足さない。
 * **台帳の第一の徳は「記録が失われない」ことである。**
 */
function record(runFile, slug, index) {
  const run = readRunFile(runFile);
  const m = score(run);
  const nowIso = new Date().toISOString();
  const entry = {
    ts: nowIso,
    slug,
    scale: (run.meta && run.meta.scale) || null,
    metrics: m,
  };
  entry.fp = fingerprint(entry);   // ★ 鍵は entry の中に住む(第二の住所を作らない)

  /**
   * 既記録の検査。**`index` を渡されたらそれを使う(P-2 / R-3)** ——
   * `baseline` が M 創造物のために台帳を M 回読み直す O(M·N) を O(M+N) に戻す。
   * 索引の鍵は `keyIndex` が `trueKey` で組んだものであり、**行の自己申告ではない**(S-1)。
   */
  let existing = null;
  try {
    const idx = index instanceof Map ? index : keyIndex(readLedger({ raw: true }));
    existing = idx.get(entry.fp) || null;
  } catch (err) {
    // 読めない台帳は「書く」側に倒す。既存行は決して消さない。
    console.error(`⚠️ ledger unreadable, recording anyway: ${err.message}`);
  }
  /**
   * 第一の記録を正とする(keep-first)。**ただし「第一」を無条件には信じない(F-1)。**
   * 先回りの疑いが一つでも立てば skip せず、正当な観測を刻んだ上で名指す。
   */
  if (existing) {
    const why = preemptionReasons(existing, entry, run, nowIso);
    if (!why.length) return { ...existing, skipped: true };
    fs.appendFileSync(ledgerPath(), JSON.stringify(entry) + '\n');
    if (index instanceof Map) index.set(entry.fp, existing);   // 先着の座は動かさない(索引は既存を指したまま)
    return { ...entry, preempted: true, preemptedBy: existing, reasons: why };
  }

  fs.appendFileSync(ledgerPath(), JSON.stringify(entry) + '\n');
  // 索引を渡されている場合は、いま刻んだ行も索引に載せる ——
  // さもなくば同一走行を二つ持つ倉で `baseline` 一回のうちに二度刻んでしまう。
  if (index instanceof Map && !index.has(entry.fp)) index.set(entry.fp, entry);
  return entry;
}

/** 既存の全 run-state を台帳に刻む(基線)。 */
function baseline() {
  const root = workspace.resolve().root;
  const out = [];
  if (!fs.existsSync(root)) return out;
  /**
   * **台帳は一度だけ読む(P-2 / R-3)。** 旧実装は `record` の内側で創造物の数だけ
   * 台帳を読み直しており、M 創造物 × N 行の O(M·N·sha256) だった(実測: N=4000 / 20 創造物で 602ms)。
   * 集合はメモリ上にしか住まない —— **索引ファイルは作らない**(第30条 / NG-8)。
   */
  let idx;
  try { idx = keyIndex(readLedger({ raw: true })); }
  catch (err) { console.error(`⚠️ ledger unreadable, recording anyway: ${err.message}`); idx = new Map(); }
  for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const name of ['conclave.json']) {
      const f = path.join(root, dir.name, name);
      if (fs.existsSync(f)) {
        try { out.push(record(f, dir.name, idx)); }
        catch (e) { out.push({ slug: dir.name, error: e.message }); }
      }
    }
    // orchestrator 形式 *.run.json も拾う
    for (const f of fs.readdirSync(path.join(root, dir.name)).filter(n => n.endsWith('.run.json'))) {
      try { out.push(record(path.join(root, dir.name, f), dir.name, idx)); }
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
 *
 * **読めない行の排除も関数自身の性質である(review-3 D-4)。** 絞りが `e.metrics` だけ
 * だった頃、**too-deep で鍵を導けない行にも `metrics` は在る**ので、生の配列を渡すと
 * 読めない行が「最新」になった(実測: `compare` の答えが `100→45 (-55)` から
 * `100→1 (-99)` に化けた)。畳んだ列を渡すのは呼び手の作法であって、
 * この関数の保証ではない —— **今日それが守られているのは幸運であって設計ではない。**
 * 破損の標識(`__gaugeCorrupt`)も同じ理由でここで落とす。
 */
function latestFor(slug, entries) {
  const hits = (Array.isArray(entries) ? entries : []).filter(e =>
    e && e.slug === slug && e.metrics && !isCorruptMark(e) && trueKey(e) !== null);
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
function auditLedger(entries, opts = {}) {
  const all = Array.isArray(entries) ? entries : [];
  /**
   * **読めなかった行を数える(F-2 / 第16条)。** `rows` の意味は一字も変えない
   * (`rows` = 観測を持つ行の数。既存の門がこの意味で立っている)。
   * 数えられなかった行は **`corrupt` という自分の鍵**で名乗る ——
   * 重複にも distinct にも混ぜない。混ぜれば「掃除で消える欠陥」に化ける。
   */
  const corrupt = all.filter(isCorruptMark);
  const list = all.filter(e => e && e.metrics && !isCorruptMark(e));
  const byFp = new Set();      // 相異なる trueKey の集合(R-7: 行を溜めても誰も読まなかった)
  const conflicts = [];
  let tooDeep = 0;
  let suspect = 0;             // 先回りの痕跡を持つ行(未来の ts / 秤が書かない鍵)
  const nowMs = Date.parse(opts.now || new Date().toISOString());
  for (const e of list) {
    const fp = trueKey(e);
    if (fp === null) {
      // 深すぎて鍵が導けない行(S-2)。読み飛ばされる行であることを名指す。
      tooDeep++;
      conflicts.push({ slug: e.slug, kind: 'too-deep', declared: e.fp || null, actual: null,
        observations: [{ ts: e.ts, fp: e.fp || null, score: null }] });
      continue;
    }
    byFp.add(fp);
    // ★ 名乗った鍵と真の鍵の突き合わせ。ここが S-1 の門である。
    if (e.fp != null && e.fp !== fp) {
      conflicts.push({
        slug: e.slug, kind: 'forged-fp', declared: e.fp, actual: fp,
        observations: [{ ts: e.ts, fp: e.fp, score: e.metrics && e.metrics.score }],
      });
    }
    /**
     * ── 先回りの痕跡(F-1 の監査側) ────────────────────────────
     * `record` の予防は「その走行を記録しようとした時」にしか働かない。
     * **毒が置かれたまま誰も record しなければ、予防は一度も発火しない。**
     * ゆえに監査も独立に名指す —— 未来に住む行と、秤が書かない鍵を持つ行。
     * どちらも人が中身を読むまで消えない = exit 2 の側である。
     */
    const why = [];
    const ets = typeof e.ts === 'string' ? e.ts : null;
    if (ets === null || isNaN(Date.parse(ets))) why.push(`ts が時刻として読めない (${JSON.stringify(e.ts)})`);
    else if (!isNaN(nowMs) && Date.parse(ets) - nowMs > CLOCK_SKEW_TOLERANCE_MS) why.push(`ts が未来に住む`);
    const alien = alienKeys(e);
    if (alien.length) why.push(`秤が書かない鍵: ${alien.join(', ')}`);
    if (why.length) {
      suspect++;
      conflicts.push({ slug: e.slug, kind: 'preemption-suspect', declared: e.fp || null, actual: fp,
        reasons: why, observations: [{ ts: e.ts, fp: e.fp || null, score: e.metrics && e.metrics.score }] });
    }
  }
  for (const c of corrupt) {
    conflicts.push({ slug: null, kind: 'corrupt', declared: null, actual: null,
      line: c.line, observations: [{ ts: null, fp: null, score: null }] });
  }
  const rows = list.length;
  const distinct = byFp.size + tooDeep;
  /**
   * **`tooDeep` / `corrupt` / `suspect` を返り値に載せる(第16条 / P-1 / F-2 / F-1)。**
   * 「読めなかった行が何行あるか」は `conflicts` の中に埋もれさせてよい数ではない ——
   * 呼び手(CLI)がこれを見て「健全」と答えない義務を負う。0 で埋めず、数えて名乗る。
   */
  return { rows, distinct, tooDeep, corrupt: corrupt.length, suspect, duplicates: Math.max(0, rows - distinct), conflicts };
}

function compare(a, b) {
  const entries = readLedger();
  const ea = latestFor(a, entries), eb = latestFor(b, entries);
  if (!ea || !eb) {
    // **名指された slug が台帳に無いのは「引数の誤り」である**(review-3 D-3)。
    // 2 は台帳の事故に予約する —— 打ち間違いを台帳の汚染として報告させない。
    const err = new Error(`ledger has no entry for: ${!ea ? a : b} — 記録なき前後は比較できない`);
    err.gaugeExit = 3;
    throw err;
  }
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

/**
 * 台帳の画面。**一行の破損で秤全体を倒さない(第55条 e / review-3 D-5)。**
 *
 * `baseline` は壊れた `conclave.json` を持つ創造物に `{slug, error}` を積む —— 実在する形である。
 * その枝を落とすと `e.ts.slice` で画面が全滅する。error 枝だけでなく
 * `ts` / `metrics` の欠落そのものにも耐えさせる(security-3 F-4 が名指した main 由来の穴)。
 * **測れなかったものを 0 で埋めない** —— `?` と名乗る(第16条)。
 */
function renderLedger(entries) {
  const lines = ['═══════ 📒 GAUGE LEDGER ═══════'];
  for (const e of (Array.isArray(entries) ? entries : [])) {
    if (!e || typeof e !== 'object') { lines.push('  ✗ (読めない行)'); continue; }
    if (isCorruptMark(e)) { lines.push(`  ✗ (破損行) ${String(e.line || '').slice(0, 48)}`); continue; }
    if (e.error) { lines.push(`  ✗ ${e.slug}: ${e.error}`); continue; }
    const ts = typeof e.ts === 'string' ? e.ts.slice(0, 16) : '(ts なし)      ';
    const sc = (e.metrics && e.metrics.score != null) ? String(e.metrics.score) : '?';
    lines.push(`  ${ts}  ${sc.padStart(3)}/100  ${e.slug}${e.scale ? ` (${e.scale})` : ''}`);
  }
  if (!entries || entries.length === 0) lines.push('  (empty — まだ何も測られていない)');
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
      const run = readRunFile(file);
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
      /**
       * **先回りを黙って飲み込まない(F-1)。** 「同じ観測は二度刻まない」が
       * 「先に名乗った者が勝つ」に化けていた。正当な観測は既に刻んである ——
       * ここでは何が起きたかを名指し、**人が読むべき事故として exit 2** を返す。
       */
      if (e.preempted) {
        const b = e.preemptedBy || {};
        console.log(`📒 recorded: ${e.slug} → ${e.metrics.score}/100 (${ledgerPath()})`);
        console.error(`  🔴 先回りの疑い: 同一指紋 ${e.fp} の行が既に台帳に在るが、正当な先着とは認められない`);
        console.error(`     既存行: ts=${JSON.stringify(b.ts)} slug=${JSON.stringify(b.slug)}`);
        for (const r of (e.reasons || [])) console.error(`     - ${r}`);
        console.error('     → 観測は刻んだ(記録は失わない)。既存行は人が読んで裁くこと。');
        process.exit(2);
      }
      // 二度目は沈黙しない —— 名乗る。**exit code は 0 のまま**(重複は失敗ではない)。
      if (e.skipped) console.log(`📒 already recorded: ${e.slug} → ${e.metrics.score}/100 @ ${e.ts} (同一指紋 ${fingerprint(e)}) — 追記しない`);
      else console.log(`📒 recorded: ${e.slug} → ${e.metrics.score}/100 (${ledgerPath()})`);
      return;
    }
    if (cmd === 'baseline') {
      const out = baseline();
      console.log(renderLedger(out));
      const pre = out.filter(e => e && e.preempted);
      if (pre.length) {
        for (const e of pre) {
          console.error(`  🔴 先回りの疑い: ${e.slug} (${e.fp}) — ${(e.reasons || []).join(' / ')}`);
        }
        process.exit(2);
      }
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
      /**
       * 監査(FR-7 / 読み取り専用)。**生の全行**を数える —— 畳んでから数えては
       * 重複が見えない。`readLedger({raw:true})` が本当に生を返すこと(P-1 の修理)が
       * この道の前提である。上流が深い行を先に捨てていた頃、この命令は
       * 全行が読めない台帳を `rows=0 … exit 0` =「健全」と答えていた。
       *
       * **信号を分ける(P-8)。**
       *   exit 0 = 健全
       *   exit 1 = 機械が畳めば消える欠陥(重複)。掃除 (FR-8) で必ずゼロにできる。
       *   exit 2 = 人が中身を見るまで消えない事故(偽の鍵 / 深すぎて読めない行)。
       * 掃除で消せるものと消せないものを同じ信号に載せれば、
       * R-2 が戒めた「鳴りっぱなしの門」に再びなる。
       */
      if (argv.includes('--audit')) {
        /**
         * **読めなかった行も数える(F-2)。** `withCorrupt` を渡すのはここだけである ——
         * 掃除(FR-8)は生の列を書き戻す道具であり、標識が混ざれば台帳が汚れる。
         * ファイルに N 行あって `rows=0` と答える道は、これで塞がる。
         */
        const raw = readLedger({ raw: true, withCorrupt: true });
        const a = auditLedger(raw);
        console.log(`📒 rows=${a.rows} distinct=${a.distinct} duplicates=${a.duplicates} conflicts=${a.conflicts.length} too-deep=${a.tooDeep} corrupt=${a.corrupt} suspect=${a.suspect}`);
        for (const c of a.conflicts) {
          if (c.kind === 'too-deep') {
            console.log(`  ⚠️ 読めない行: ${c.slug} — 入れ子が深すぎて鍵を導けない(> ${MAX_CANONICAL_DEPTH}。畳みでも掃除でも消してはならない)@ ${c.observations[0].ts}`);
          } else if (c.kind === 'corrupt') {
            console.log(`  ⚠️ 破損行: JSON として読めない — ${String(c.line || '').slice(0, 60)}…(畳みでも掃除でも消してはならない)`);
          } else if (c.kind === 'preemption-suspect') {
            console.log(`  ⚠️ 先回りの疑い: ${c.slug} — ${c.reasons.join(' / ')} (@ ${c.observations[0].ts}, score ${c.observations[0].score})`);
          } else {
            console.log(`  ⚠️ 矛盾: ${c.slug} — 名乗る指紋 ${c.declared} が中身から導かれる ${c.actual} と食い違う (@ ${c.observations[0].ts}, score ${c.observations[0].score})`);
          }
        }
        const human = a.conflicts.length;   // forged-fp / too-deep / corrupt / 先回り はどれも人の手が要る
        if (human > 0) { console.log(`  🔴 人が読むべき行が ${human} 件ある — 掃除では消えない`); process.exit(2); }
        process.exit(a.duplicates > 0 ? 1 : 0);
      }
      /**
       * **台帳は一度しか読まない(R-8 / P-6)。** 旧実装は `readLedger()` と
       * `readLedger({raw:true})` を続けて呼び、破損行の警告が二重に出ていた
       * (破損 3 行の台帳で `⚠️ line skipped` が 6 回)。同じファイルを二度読んで
       * 二度警告する画面は、行が倍あるように見せる。
       */
      const raw = readLedger({ raw: true });
      const tooDeepRows = raw.filter(r => r && typeof r === 'object' && r.metrics && trueKey(r) === null);
      const foldable = raw.filter(r => !tooDeepRows.includes(r));
      let folded;
      try { folded = foldLedger(foldable); }
      catch (err) { console.error(`⚠️ fold failed, returning raw rows: ${err.message}`); folded = foldable; }
      const lines = [renderLedger(folded)];
      /**
       * 畳んだ件数を名乗る —— 黙って行を減らす画面は信用できない(NFR-1)。
       * **深すぎて読み飛ばした行を「重複」に混ぜない(第16条 / P-1)。**
       * 読めなかった行を畳んだ行と同じ数に載せるのは、測れなかったものを埋める行為である。
       */
      const tooDeep = tooDeepRows.length;
      const dropped = raw.length - folded.length - tooDeep;
      if (dropped > 0 || tooDeep > 0) {
        const parts = [];
        if (dropped > 0) parts.push(`重複 ${dropped} 行を畳んだ`);
        if (tooDeep > 0) parts.push(`深すぎて読めない ${tooDeep} 行を読み飛ばした`);
        lines.push(`  (raw ${raw.length} 行 / ${parts.join(' / ')} — \`gauge.js ledger --audit\` で内訳)`);
      }
      console.log(lines.join('\n'));
      return;
    }
    console.error('commands: score <run.json> [--json] | record <run.json> --slug <s> | baseline | compare <a> <b> | compare --last N | ledger [--audit]');
    process.exit(3);
  } catch (e) {
    console.error('🔴 ' + e.message);
    /**
     * **exit code の規約を一段外でも守る(review-3 D-3)。**
     * 旧実装はここで一律 2 を返した —— `score /no/such/file`(引数の誤り)が
     * `--audit` の「台帳に人が読むべき事故がある」と同じ信号を運び、
     * **P-8 が分けた信号がその一段外で崩れていた**。冒頭の散文は既に
     * 「3 = 引数の誤り」と約束していたのだから、これは散文が嘘をついていた状態である。
     * 引数由来の誤りは自分で `gaugeExit` を名乗る。それ以外(測れない run-state 等)は 2。
     */
    process.exit(e && e.gaugeExit ? e.gaugeExit : 2);
  }
}

if (require.main === module) main();
module.exports = {
  score, normalize, record, baseline, compare, readLedger, ledgerPath, WEIGHTS,
  // ── 冪等性の器(足すだけ。既存 export は一つも消さない・名も変えない) ──
  fingerprint, foldLedger, latestFor, auditLedger, keyIndex,
  // ── F-1 / F-2 の器(足すだけ。既存 export は一つも消さない・名も変えない) ──
  alienKeys, preemptionReasons, runStartTs, ENTRY_KEYS, CLOCK_SKEW_TOLERANCE_MS,
  /**
   * ── 画面を門から撃てるようにする(prove attempt 4 / D-5) ─────────────
   * `renderLedger` の耐性(error 枝 / `ts` 欠落 / `metrics` 欠落 / 非オブジェクト行)は
   * **CLI 越しには一部の枝しか届かない** —— `ledger` は `foldLedger` が非オブジェクトを
   * 先に落とし、`compare --last` は `e.metrics` で絞る。ゆえに教主の実測では
   * `e.ts.slice` / `e.metrics.score` / 非オブジェクト枝を壊しても**一門も鳴らなかった**。
   * 純関数として直に撃てる形にする —— 撃てない実装は守られていない実装である(第21条)。
   */
  renderLedger,
};
