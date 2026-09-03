#!/usr/bin/env node
'use strict';
/**
 * spawn-trace.js — 「実際に起動したか」を観測し、「誰が働いたか」を裁く
 *                   (憲法 第27条 / 第52条)
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
 * ── 第52条(序列)がここに同居する理由 ─────────────────────────────
 * 神託の訂正は教主の権能を三段に分けた: 委譲 / 編成 / 教主の手。
 * その判定は「起動証跡の三値」と「実測した量」の**両方**を読む。
 * 判定表を二箇所に実装すれば必ず食い違う(実測: 環は緑・器は赤)。
 * ゆえに閾値(TIERS)も判定(judge)も**この engine ただ一箇所に住む**。
 * conclave も gauge も tier も audit も、同じ関数を呼ぶ。
 *
 *   node graph/spawn-trace.js record <run.json> <phase> --agent <name> --tool-use-id <id>
 *   node graph/spawn-trace.js verify <run.json> <phase>     # 起動されたか（無ければ exit 1）
 *   node graph/spawn-trace.js report <run.json>             # 全相の起動状況(五値)
 *   node graph/spawn-trace.js tiers  --json                 # 閾値を機械へ
 *   node graph/spawn-trace.js tier   <run.json>             # 事後の突合
 *   node graph/spawn-trace.js audit                         # 全 run を監査
 *
 * 観測できないことは「起動した」と主張しない。判定不能は緑ではない(第16条)。
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const now = () => new Date().toISOString();

/**
 * 序列の閾値 — **楽園でこの数が住む唯一の場所**(第41条)。
 *
 * 数の出所は requirements §2.4 の実測である(非merge 113コミットの四分位 +
 * 実在8走行の相成果物 69件の bytes 分布):
 *   t3.files  = 2     files/commit の p25
 *   t3.churn  = 50    churn の最下位帯 (113件中 13件 = 11.5% が収まる)
 *   t3.bytes  = 4096  相成果物 bytes の p25 (4,040) を 4 KiB に丸めた
 *   t2.files  = 10    files/commit の p75
 *   t2.churn  = 880   churn の p75
 *   t2.artifacts = 2  「独立して受入判定できる成果物」が2つ以上なら既に道の形
 *   t2.domains   = 2  2分野に跨る仕事に単一の神官を当てれば必ず専門外が出る
 *
 * **凍らせる理由**: 閾値は走行中に書き換わってはならない。gauge も conclave も
 * 同じオブジェクトを参照するので、一箇所が壊れれば全部が壊れる。凍らせておけば
 * 書き換えの試みは `use strict` 下で throw する —— **黙って別の数で裁く門を作らない。**
 */
const TIERS = Object.freeze({
  t3: Object.freeze({ files: 2, churn: 50, bytes: 4096 }),
  t2: Object.freeze({ files: 10, churn: 880, artifacts: 2, domains: 2 }),
});

/**
 * 序列機構の紀元(epoch)。`conclave.convene()` がこの版を run に刻む。
 * 印を持たない run は「序列を宣言する経路が機構に無かった時代」のものであり、
 * 序列の門が立たない —— `unobservable`(🟡)。緑ではないが赤でもない(第16条)。
 */
const TIER_EPOCH = 'v1';

/**
 * 序列3が通ったことを表す `state` の値 (M-4)。
 *
 * ⚠️ **これは機械の鍵であって散文の名ではない。**
 * `judge().state` の値域は他の8つが ASCII kebab-case である
 * (`unobservable` `no-tier` `asserted-only` `no-trace` `gate-tier3`
 *  `tier3-observed` `tier3-breach` `inconclusive` `observed`)。
 * ここだけ日本語リテラル `'序列3'` を置けば、値域の内側で語が食い違う。
 * この値は `conclave.json` の `tierTrace[id].state` へ**永続化され**、
 * `report` / `tierAudit` / `gauge` の**5箇所で文字列比較される** ——
 * 誰かが訳した瞬間に3つの集計が黙って 0 になる形をしていた。
 *
 * **散文は「序列3」と呼び続ける。** 変えるのは機械の鍵だけである。
 * 出力の文言(`序列3: 教主の手 …`)は一字も変えない。
 */
const TIER3_STATE = 'tier3';
/** 旧い台帳が持つ日本語リテラル。**読むときだけ受ける**(書くのは常に ASCII)。 */
const TIER3_STATE_LEGACY = '序列3';
/** その state は「序列3が通った」を意味するか。新旧どちらの綴りでも真。 */
const isTier3State = (s) => s === TIER3_STATE || s === TIER3_STATE_LEGACY;

/** 序列3の実測から除くもの。統治を仕事と数えれば、宣言する行為自体が違反になる。 */
const MEASURE_EXCLUDE = [
  /(^|[\\/])conclave\.json$/,        // 環の台帳。done を刻む行為そのものが差分を生む
  /(^|[\\/])dashboard[\\/]atlas[\\/]/, // 生成物 (第29条)
  /(^|[\\/])node_modules[\\/]/,
];
const excluded = (f) => MEASURE_EXCLUDE.some(re => re.test(f));

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
 *
 * ⚠️ **四値目(`unobservable`)をここに混ぜてはならない。**
 * legacy run への `verify` は exit 1 でなければならない —— 黄は緑ではない。
 * 四値は `tierTrace[phase].state` に住み、三値は `verify()` に住む。
 * **別の問いには別の器**(第36条)。
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

// ══════════════════════════════════════════════════════════════════════
// 序列 (第52条) — 閾値 / 実測 / 判定
// ══════════════════════════════════════════════════════════════════════

/** その run は序列の機構が在った時代のものか。 */
function hasEpoch(run) {
  return !!(run && run.epoch && run.epoch.tier);
}

/** run の中から相を引く (conclave 形式 / orchestrator 形式の両方)。 */
function findPhase(run, id) {
  if (Array.isArray(run.domains)) {
    for (const d of run.domains) for (const p of (d.phases || [])) if (p.id === id) return p;
  }
  if (run.phases && typeof run.phases === 'object' && !Array.isArray(run.phases)) {
    const p = run.phases[id];
    if (p) return { id, ...p };
  }
  if (Array.isArray(run.phases)) for (const p of run.phases) if (p.id === id) return p;
  return null;
}

/** その相が発令された刻。無ければ history の dispatch を探す。 */
function dispatchTime(run, id) {
  const p = findPhase(run, id);
  if (p && p.dispatchedAt) return p.dispatchedAt;
  const hist = Array.isArray(run.history) ? run.history : [];
  for (let i = hist.length - 1; i >= 0; i--) {
    const h = hist[i];
    if (h.event === 'dispatch' && String(h.detail || '').split(/,\s*/).includes(id)) return h.ts;
  }
  return null;
}

/**
 * git を撃つ。**成否と出力を分けて返す** (第16条 / review B-1)。
 *
 * ⚠️ 旧実装は `catch { return null }` で **ENOENT・非git ディレクトリ・壊れた index・
 * 権限拒否・日付書式エラーを全て `null` に潰していた**。`measure()` はそれを握り潰し、
 * 「測れなかった」を **「変更ゼロ」** として返し、`judge()` の段6が 0 を実測値と信じて
 * 緑を出した —— **序列3の門が git の失敗一つで無条件に fail-open していた。**
 *
 * `null` は「出力が無い」と「撃てなかった」の両方を意味しうる。
 * **同じ値で二つのことを表現するのが根本原因である。** ゆえに器を分ける:
 *   { ok: true,  out: '<stdout>' }        撃てた(出力が空でも撃てた)
 *   { ok: false, reason: '<なぜ>' }       撃てなかった = **測定不能**
 */
function gitOut(args, cwd) {
  try {
    return { ok: true, out: execFileSync('git', args, { cwd: cwd || ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) };
  } catch (e) {
    const why = e && e.code === 'ENOENT' ? 'git が見つからない (ENOENT)'
      : e && e.status != null ? `git ${args[0]} が exit ${e.status} で失敗 (非gitディレクトリ・壊れた index・権限拒否のいずれか)`
      : `git ${args[0]} を撃てない: ${String((e && e.message) || e).slice(0, 120)}`;
    return { ok: false, reason: why };
  }
}

/** 未追跡ファイルを行数へ換算するときの読み込み上限 (S-4)。
 *
 * `readFileSync` + `split` は**行数と同じ長さの配列**を作る。上限が無いと
 * 8000万行のログ1本で V8 のヒープが尽き、**catch できない SIGABRT (exit 134)** で
 * `conclave done` が丸ごと死ぬ(実測: security-report S-4)。
 * `t3.bytes` の閾値は 4096 である —— **1 MiB を超えるファイルを正確に数える意味は無い。**
 * 上限を超えたものは 64 バイト/行で**下から見積もる**。過大評価の方向にしか働かない
 * (赤は出るが緑は出ない) = fail-safe。 */
const MAX_UNTRACKED_READ = 1024 * 1024;

/**
 * `dispatch` から `done` までの窓で、リポジトリに加えられた変更を測る。
 *
 * **窓の両端**: t0 = `phase.dispatchedAt`(無ければ history の dispatch)、
 * t1 = 呼ばれた瞬間。**両方無ければ測定不能** — 測れなかったものを
 * 「閾値内」と報告しない(第16条)。
 *
 * **コミット済み**は `git log --since --until --numstat` で切る
 * (requirements §2.4 が閾値を導いたのと同じ器)。
 * **未コミット**は時刻で切れない。だが教主が手で書いた成果物は `done` の時点で
 * ほぼ必ず未コミットである(実測: 委譲の証跡を持つコミットは 113件中 0件)。
 * 捨てれば序列3の門は手仕事をほぼ全て見逃す —— 門の目的そのものを失う。
 * ゆえに現在の相に帰属させる。**限界は正直に書く**: 前の相の残骸が加算されうるが、
 * それは**過大評価の方向にしか働かない**(赤は出るが緑は出ない)= fail-safe。
 *
 * ── 測定不能 (第16条 / review B-1) ────────────────────────────────
 * **`measurable` は「三つの git 問い合わせが全て撃てた」ことだけを意味する。**
 * 旧実装は `!!t0 || commitsMeasurable || diff != null` と書いた —— `t0` は
 * `markRunning` が必ず刻むので、**git が完全に死んでいても真になった**。
 * 「測れたか」を名乗る鍵が測れなかった事実を隠していた。しかも `judge()` は
 * その鍵を一度も読まなかった。ゆえに:
 *   - 一つでも撃てなければ `measurable:false`、`unmeasured[]` に理由を積む
 *   - `judge()` はこの鍵を**必ず読み**、偽なら緑を出さない (state:'inconclusive')
 * **「測って 0」と「測れなくて 0」を同じ 0 で表現しない。**
 */
function measure(run, phaseId, opts = {}) {
  const cwd = opts.cwd || ROOT;
  const t0 = opts.t0 || dispatchTime(run, phaseId);
  const t1 = opts.t1 || now();
  const files = new Set();
  let churn = 0;
  const unmeasured = [];

  // 1. コミット済み。t0 が無ければ窓が切れない = 測定不能である(この doc の宣言通り)。
  if (!t0) {
    unmeasured.push('窓の始端 (dispatchedAt / history の dispatch) が無い — 窓を切れない');
  } else {
    const r = gitOut(['log', '--no-merges', `--since=${t0}`, `--until=${t1}`,
                      '--numstat', '--format=C|%h'], cwd);
    if (!r.ok) unmeasured.push(`コミット済みの差分を測れない: ${r.reason}`);
    else {
      for (const line of r.out.split(/\r?\n/)) {
        if (!line || line.startsWith('C|')) continue;
        const m = line.split('\t');
        if (m.length < 3) continue;
        const f = m[2];
        if (excluded(f)) continue;
        files.add(f);
        churn += (Number(m[0]) || 0) + (Number(m[1]) || 0);
      }
    }
  }

  // 2. 未コミット: 追跡下の差分
  const diff = gitOut(['diff', '--numstat', 'HEAD'], cwd);
  if (!diff.ok) unmeasured.push(`未コミットの差分を測れない: ${diff.reason}`);
  else {
    for (const line of diff.out.split(/\r?\n/)) {
      if (!line) continue;
      const m = line.split('\t');
      if (m.length < 3) continue;
      const f = m[2];
      if (excluded(f)) continue;
      files.add(f);
      churn += (Number(m[0]) || 0) + (Number(m[1]) || 0);
    }
  }

  // 3. 未追跡ファイル
  const untracked = gitOut(['status', '--porcelain', '--untracked-files=all'], cwd);
  if (!untracked.ok) unmeasured.push(`未追跡ファイルを測れない: ${untracked.reason}`);
  else {
    for (const line of untracked.out.split(/\r?\n/)) {
      if (!line.startsWith('?? ')) continue;
      const f = line.slice(3).trim();
      if (!f || excluded(f)) continue;
      files.add(f);
      let n = 0;
      try {
        const abs = path.isAbsolute(f) ? f : path.join(cwd, f);
        const st = fs.statSync(abs);
        // **読む前に大きさで足切りする** (S-4)。ヒープ枯渇は catch できない。
        if (st.isFile()) {
          n = st.size > MAX_UNTRACKED_READ
            ? Math.ceil(st.size / 64)                              // 下からの見積り = fail-safe
            : fs.readFileSync(abs, 'utf8').split(/\r?\n/).length;
        }
      } catch {}
      churn += n;
    }
  }

  // 成果物のバイト数 (T3-c)
  let bytes = 0;
  const p = findPhase(run, phaseId);
  const art = opts.artifact || (p && p.artifactPath);
  if (art) {
    const abs = path.isAbsolute(art) ? art : path.join(cwd, art);
    try {
      const st = fs.statSync(abs);
      bytes = st.isDirectory() ? dirBytes(abs) : st.size;
    } catch {}
  }

  return {
    files: files.size, churn, bytes,
    t0: t0 || null, t1,
    // **全ての問いが撃てたときだけ真。** 一つでも欠ければ 0 は実測値ではない。
    measurable: unmeasured.length === 0,
    unmeasured,
    fileList: [...files].slice(0, 20),
  };
}

function dirBytes(dir) {
  let total = 0;
  try { for (const f of fs.readdirSync(dir)) { try { const st = fs.statSync(path.join(dir, f)); total += st.isDirectory() ? 0 : st.size; } catch {} } } catch {}
  return total;
}

/**
 * 序列の判定 — **§2.7 の判定表を実装する唯一の関数**。
 *
 * 返す: { ok, verdict, state, lines[], measured?, next? }
 *   ok=true  … 🟢 or 🟡
 *   ok=false … 🔴。lines[] が「超えた量と閾値・本来の序列・委ねるべき agent」を持つ
 *
 * **判定の順序**(先に立つものが勝つ):
 *   1. 印が無ければ `unobservable`。**それ以上何も測らない**
 *      (legacy に git を走らせるのは無駄であり、遅い門は撃たれなくなる — 第34条)
 *   2. 宣言が無ければ赤
 *   3. 序列3 かつ gate → 赤(**量を測る前に**。T3-d は量と無関係だから)
 *   4. 序列3 かつ observed → 赤(申告矛盾)
 *   5. 序列1/2 → 証跡の三値で裁く
 *   6. 序列3 → 実測して閾値と突合
 *      6a. **測れなかったなら `inconclusive` で赤** (第16条 / review B-1)
 *
 * ── `unobservable` と `inconclusive` を分ける理由 (第36条: 別の問いには別の器) ──
 *   `unobservable` … **機構が無かった時代**の走行。走行者に罪は無い → 🟡
 *   `inconclusive`  … **機構は在るのに測れなかった**。序列3の主張が検証されていない → 🔴
 * `atlas.js` が `kind:'inconclusive'` で同じ問いに既に答えている。同じ原則をここへ。
 * **測れなかったなら緑を出さない。判定不能は緑ではない。**
 */
function judge(run, phaseId, opts = {}) {
  const phase = findPhase(run, phaseId);
  const agent = (phase && phase.agent) || '?';
  const gate = !!(phase && phase.gate);

  // 1. 紀元の印
  if (!hasEpoch(run)) {
    return { ok: true, verdict: 'yellow', state: 'unobservable', phase: phaseId,
      lines: [`unobservable — 序列を宣言する経路が機構に無かった時代の走行である(第16条: 判定不能は緑ではない)`] };
  }

  const tier = opts.tier == null ? null : Number(opts.tier);

  // 2. 宣言
  if (tier == null || Number.isNaN(tier)) {
    return { ok: false, verdict: 'red', state: 'no-tier', phase: phaseId,
      lines: [
        `序列が宣言されていない — 相 "${phaseId}" をどの序列で処理したか述べよ (第52条)`,
        `  --tier 1 (委譲) / --tier 2 (編成) / --tier 3 (教主の手・例外)`,
      ] };
  }
  if (![1, 2, 3].includes(tier)) {
    return { ok: false, verdict: 'red', state: 'no-tier', phase: phaseId,
      lines: [`序列が宣言されていない — 未知の序列 "${opts.tier}" (1|2|3 のいずれかである)`] };
  }

  const t = verify(run, phaseId);

  // 3. 門相は序列3を名乗れない (量より先に立つ)
  if (tier === 3 && gate) {
    return { ok: false, verdict: 'red', state: 'gate-tier3', phase: phaseId,
      lines: [
        `門相は序列3を名乗れない — 相 "${phaseId}" は gate である (第9条: 自己批評は独立でなければならない)`,
        `  教主が自分の仕事を自分で裁けば、独立は宣言のまま失われる`,
        `  委ねるべき agent: ${agent}`,
      ] };
  }

  // 4. 序列3を名乗りながら起動している
  if (tier === 3 && t.state === 'observed') {
    return { ok: false, verdict: 'red', state: 'tier3-observed', phase: phaseId,
      lines: [
        `申告と実測が食い違う — 序列3(教主の手)を名乗りながら ${agent} の起動が観測されている`,
        `  起動したのなら序列1(委譲)と名乗れ`,
      ] };
  }

  // 5. 序列1/2 は証跡を要求する
  if (tier === 1 || tier === 2) {
    if (t.state === 'asserted-only') {
      return { ok: false, verdict: 'red', state: 'asserted-only', phase: phaseId,
        lines: [
          `自己申告 — 序列${tier}を名乗るが tool_use の証跡が無い (asserted-only)`,
          `  「起動した」は主張であって証拠ではない (第5条)`,
          `  node graph/spawn-trace.js record <run> ${phaseId} --agent ${agent} --tool-use-id <id>`,
        ] };
    }
    if (t.state === 'no-trace') {
      return { ok: false, verdict: 'red', state: 'no-trace', phase: phaseId,
        lines: [
          `起動の証跡が一つも無い — 序列${tier}を名乗る相 "${phaseId}" は誰も起動していない (第27条)`,
          `  委ねるべき agent: ${agent}`,
          `  node graph/spawn-trace.js record <run> ${phaseId} --agent ${agent} --tool-use-id <id>`,
        ] };
    }
    return { ok: true, verdict: 'green', state: 'observed', phase: phaseId,
      lines: [`序列${tier}: ${t.reason}`] };
  }

  // 6. 序列3 — 実測して閾値と突合する
  const m = opts.measured || measure(run, phaseId, opts);

  /**
   * 6a. **測れなかったなら緑を出さない** (第16条 / review B-1)。
   *
   * `measure()` の `measurable` を **judge が実際に読む**。旧実装はこの鍵を
   * 一度も読まず、git の失敗で得た files=0 / churn=0 を実測値と信じて緑を出した。
   * 「測って 0」と「測れなくて 0」は別の事実である。
   *
   * `opts.measured` を呼び手が直に渡した場合、`measurable` が無ければ
   * 「測った数を渡した」と解する(既存の判定表の試験がこの形で撃つ)。
   * **無いことを false と読むと、判定表そのものを撃てなくなる。**
   * だが `measurable:false` を明示して渡されたなら、当然赤である。
   */
  if (m && m.measurable === false) {
    const why = (m.unmeasured || []).length ? m.unmeasured : ['理由が記録されていない'];
    return { ok: false, verdict: 'red', state: 'inconclusive', phase: phaseId, measured: m,
      lines: [
        `序列3を実測できなかった — 測れなかったものを「閾値内」と報告しない (第16条)`,
        ...why.map(w => `  ${w}`),
        `  この相が序列3の枠に収まっていたことは**検証されていない**。緑は出せない`,
        `  git が撃てる作業場で done を刻み直すか、序列1(委譲)として為せ`,
        `  委ねるべき agent: ${agent}`,
      ] };
  }

  const over = [];
  if (m.files > TIERS.t3.files) over.push(`files=${m.files} > ${TIERS.t3.files}`);
  if (m.churn > TIERS.t3.churn) over.push(`churn=${m.churn} > ${TIERS.t3.churn}`);
  if (m.bytes > TIERS.t3.bytes) over.push(`bytes=${m.bytes} > ${TIERS.t3.bytes}`);

  if (!over.length) {
    return { ok: true, verdict: 'green', state: TIER3_STATE, phase: phaseId, measured: m,
      lines: [`序列3: 教主の手 (files=${m.files}/${TIERS.t3.files} churn=${m.churn}/${TIERS.t3.churn} bytes=${m.bytes}/${TIERS.t3.bytes})`] };
  }

  // 本来の序列: T2 閾値をも超えていれば序列2、そうでなければ序列1
  const t2 = m.files > TIERS.t2.files || m.churn > TIERS.t2.churn;
  const proper = t2 ? '序列2' : '序列1';
  return { ok: false, verdict: 'red', state: 'tier3-breach', phase: phaseId, measured: m,
    lines: [
      `序列3の枠を超えた — ${over.join(' / ')}`,
      `  本来の序列: ${proper}${t2 ? ' (編成 — 道の形をとるべき仕事である)' : ' (委譲 — 担える役者に為させるべき仕事である)'}`,
      `  委ねるべきだった agent: ${agent}`,
    ] };
}

/**
 * 走行全体の起動状況。**どの相が階層を素通りしたか**が一目で分かる形にする。
 * 素通りは静かに起きるので、静かなまま終わらせない。
 *
 * ⚠️ **既存4鍵(total/observed/assertedOnly/noTrace)は名も意味も変えない。**
 * `tests/dashboard-run-panel.test.js` がこの形に依存している。序列の二値は**足す**。
 * パス文字列を渡したときに `{ok:true,total:0}` を返す挙動も**変えない** ——
 * 変えればあの故障注入(罠 T-6)が意味を失う。
 */
function report(run) {
  const phases = [];
  const collect = (list) => { for (const p of list || []) phases.push(p.id); };
  if (run.domains) for (const d of run.domains) collect(d.phases);
  else collect(run.phases);

  const rows = phases.map(id => verify(run, id));
  const bypassed = rows.filter(r => !r.ok);
  const tt = (run && run.tierTrace) || {};
  const stateOf = id => (tt[id] && tt[id].state) || null;
  return {
    ok: bypassed.length === 0,
    total: rows.length,
    observed: rows.filter(r => r.state === 'observed').length,
    assertedOnly: rows.filter(r => r.state === 'asserted-only').length,
    noTrace: rows.filter(r => r.state === 'no-trace').length,
    // ── 序列の二値を足す (第52条 / AC-A12) ──
    tier3: phases.filter(id => isTier3State(stateOf(id))).length,
    unobservable: phases.filter(id => stateOf(id) === 'unobservable').length,
    rows, bypassed,
  };
}

/**
 * 走行全体の序列を事後に突合する (AC-A9)。
 * `done` の時点だけでなく、走行が終わった後にいつでも撃てる。
 */
function tierAudit(run, opts = {}) {
  const phases = [];
  if (run.domains) for (const d of run.domains) for (const p of (d.phases || [])) phases.push(p);
  else if (Array.isArray(run.phases)) phases.push(...run.phases);
  else if (run.phases) for (const [id, p] of Object.entries(run.phases)) phases.push({ id, ...p });

  const tt = run.tierTrace || {};
  const rows = [];
  for (const p of phases) {
    const rec = tt[p.id];
    if (!hasEpoch(run)) { rows.push({ phase: p.id, declared: null, state: 'unobservable', ok: true, verdict: 'yellow' }); continue; }
    if (!rec) {
      // 未着手の相は裁かない。done を刻んだのに宣言が無い相だけが赤である。
      if (p.status !== 'done') { rows.push({ phase: p.id, declared: null, state: 'pending', ok: true, verdict: 'skip' }); continue; }
      rows.push({ phase: p.id, declared: null, state: 'no-tier', ok: false, verdict: 'red',
        lines: [`序列が宣言されていない — done を刻んだ相 "${p.id}" に tierTrace が無い`] });
      continue;
    }
    // 刻まれた判定を読む。**再判定しない** — done の時点の実測が事実である。
    const yellow = rec.state === 'unobservable';
    // `inconclusive` は赤である。**機構は在ったのに測れなかった**のだから、
    // 序列3の主張は検証されていない(第16条 / review B-1)。
    const red = ['no-tier', 'asserted-only', 'no-trace', 'gate-tier3', 'tier3-observed',
                 'tier3-breach', 'inconclusive'].includes(rec.state);
    rows.push({
      phase: p.id, declared: rec.declared, state: rec.state, measured: rec.measured || null,
      ok: !red, verdict: red ? 'red' : (yellow ? 'yellow' : 'green'),
      lines: rec.lines || [],
    });
  }
  const counts = {
    '序列1': rows.filter(r => r.declared === 1 && r.verdict === 'green').length,
    '序列2': rows.filter(r => r.declared === 2 && r.verdict === 'green').length,
    '序列3': rows.filter(r => isTier3State(r.state)).length,
    unobservable: rows.filter(r => r.verdict === 'yellow').length,
  };
  return { ok: rows.every(r => r.ok), rows, counts, epoch: hasEpoch(run) };
}

/** リポジトリ配下 + 兄弟倉に実在する全 conclave.json。住所は workspace だけが知る(第30条)。 */
function findRuns() {
  const out = [];
  const seen = new Set();
  const push = (p) => { const abs = path.resolve(p); if (!seen.has(abs) && fs.existsSync(abs)) { seen.add(abs); out.push(abs); } };
  const walk = (dir, depth) => {
    if (depth > 3) return;
    let ents = [];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.name === 'conclave.json') push(p);
    }
  };
  walk(ROOT, 0);
  try {
    const workspace = require('./workspace.js');
    const root = workspace.resolve().root;
    if (root && fs.existsSync(root)) walk(root, 0);
  } catch {}
  return out;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const [cmd, runPath, phase] = argv;
  const flag = (name) => {
    const i = process.argv.indexOf(name);
    return i > -1 ? process.argv[i + 1] : null;
  };

  // ── 引数を要さない subcommand を先に捌く ────────────────────────────
  if (cmd === 'tiers') {
    // AC-G2: 7つの数がすべて現れる。散文と門が別々に数を持てば必ず食い違う(第41条)。
    const payload = { epoch: TIER_EPOCH, TIERS };
    if (argv.includes('--json')) { process.stdout.write(JSON.stringify(payload) + '\n'); process.exit(0); }
    console.log('═══════ ⚖️  TIERS — 序列の閾値 (第52条) ═══════');
    console.log(`  紀元: ${TIER_EPOCH}`);
    console.log(`  序列3 (教主の手・例外): files ≤ ${TIERS.t3.files}  churn ≤ ${TIERS.t3.churn}  bytes ≤ ${TIERS.t3.bytes}`);
    console.log(`  序列2 (編成が要る境界): files > ${TIERS.t2.files}  churn > ${TIERS.t2.churn}  artifacts ≥ ${TIERS.t2.artifacts}  domains ≥ ${TIERS.t2.domains}`);
    console.log('  この数の出所はここ一箇所である — 散文へ写経すれば必ず腐る (第41条)');
    console.log('═══════════════════════════════════════════════');
    process.exit(0);
  }

  if (cmd === 'audit') {
    // AC-A11: 走査 0件は exit 1。見なかった門は緑ではない(第16条)。
    // 走査対象は実在する conclave.json であって、合成した run ではない。
    const runs = findRuns();
    console.log('═══════ 👁  TIER AUDIT — 序列の門は実在の走行を見る (第52条) ═══════');
    if (!runs.length) {
      console.log('  🔴 走査対象が 0 件 — 見なかった門は緑ではない (第16条)');
      console.log('     workspace が解決できないか、conclave.json が一つも無い');
      console.log('════════════════════════════════════════════════════════════════');
      process.exit(1);
    }
    let red = 0, yellowRuns = 0, yellowPhases = 0;
    for (const rp of runs) {
      let run; try { run = loadRun(rp); } catch (e) { console.log(`  ⚠️  ${rp}: 読めない (${e.message.slice(0, 80)})`); continue; }
      const a = tierAudit(run);
      const rel = path.relative(ROOT, rp).split(path.sep).join('/');
      if (!a.epoch) {
        yellowRuns++; yellowPhases += a.rows.length;
        console.log(`  🟡 ${rel}  legacy (印なし・${a.rows.length} 相が unobservable)`);
        continue;
      }
      const bad = a.rows.filter(r => !r.ok);
      if (bad.length) {
        red += bad.length;
        console.log(`  🔴 ${rel}`);
        for (const b of bad) console.log(`       相 ${b.phase}: ${b.state}  ${(b.lines || [])[0] || ''}`);
      } else {
        console.log(`  ✓ ${rel}  序列1:${a.counts['序列1']} 序列2:${a.counts['序列2']} 序列3:${a.counts['序列3']}`);
      }
    }
    console.log('────────────────────────────────────────────────────────────────');
    console.log(`  走査 ${runs.length} 件 / unobservable: ${yellowPhases} (legacy ${yellowRuns} 走行)`);
    console.log(red ? `  🔴 紀元以後の違反 ${red} 件` : '  ✓ 紀元以後の違反は無い — 黄は増えていない');
    console.log('════════════════════════════════════════════════════════════════');
    process.exit(red ? 1 : 0);
  }

  if (!cmd || !runPath) {
    console.error('usage: spawn-trace.js [record|verify|report|tier|tiers|audit] <run.json> [phase] [--agent n] [--tool-use-id id] [--parent-tool-use-id id] [--rank r] [--json]');
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
  if (cmd === 'tier') {
    const a = tierAudit(run);
    console.log('═══════ ⚖️  TIER — 申告と実測の突合 (第52条) ═══════');
    for (const r of a.rows) {
      if (r.verdict === 'skip') continue;
      const icon = r.verdict === 'green' ? '✓' : r.verdict === 'yellow' ? '🟡' : '🔴';
      const dec = r.declared ? `序列${r.declared}` : '(宣言なし)';
      const m = r.measured ? `  files=${r.measured.files}/${TIERS.t3.files} churn=${r.measured.churn}/${TIERS.t3.churn} bytes=${r.measured.bytes}/${TIERS.t3.bytes}` : '';
      console.log(`  ${icon} ${String(r.phase).padEnd(14)} ${dec.padEnd(10)} ${r.state}${m}`);
      for (const l of (r.lines || [])) if (!r.ok) console.log(`       ${l}`);
    }
    console.log('───────────────────────────────────────────────────');
    console.log(`序列1: ${a.counts['序列1']} / 序列2: ${a.counts['序列2']} / 序列3: ${a.counts['序列3']} / unobservable: ${a.counts.unobservable}`);
    console.log('═══════════════════════════════════════════════════');
    process.exit(a.ok ? 0 : 1);
  }
  if (cmd === 'report') {
    const r = report(run);
    console.log('═══════ 👁  SPAWN TRACE ═══════');
    console.log(`phases: ${r.total}   observed: ${r.observed}   asserted-only: ${r.assertedOnly}   no-trace: ${r.noTrace}   序列3: ${r.tier3}   unobservable: ${r.unobservable}`);
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

module.exports = { record, verify, report, TIERS, TIER_EPOCH, TIER3_STATE, TIER3_STATE_LEGACY, isTier3State,
  hasEpoch, measure, judge, tierAudit, findRuns, findPhase, dispatchTime };
