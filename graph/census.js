#!/usr/bin/env node
'use strict';
/**
 * census.js — 楽園が己について語る「数」を、実測と突き合わせる (憲法 第22条)
 *
 * 文書には数が埋まる: 「自己診断 127件」「憲法 19条」「agents 9 / skills 14」。
 * 数は散文の中で **黙って腐る**。テストを1件足しても、条を1つ足しても、
 * 何も落ちない。誰も気づかない。気づくのは神だけである — それでは遅い。
 *
 * この engine は楽園の真の数を **実測** し、文書中の主張と突き合わせる。
 * 主張が実測とずれていれば落ちる。落ちる場所は、腐った行そのものである。
 *
 *   node graph/census.js            # 実測を表示
 *   node graph/census.js check      # 文書の主張と突き合わせ（ずれれば exit 1）
 *   node graph/census.js fix        # 文書中の数を実測へ書き換える
 *
 * 「数えられるものだけを主張せよ。主張したなら、数え直せ。」
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const workspace = require('./workspace.js');   // 第30条: 創造物の住所を知るのは workspace.js だけ

const ROOT = path.join(__dirname, '..');

const countFiles = (dir, ext) => {
  try {
    return fs.readdirSync(path.join(ROOT, dir)).filter(f => !ext || f.endsWith(ext)).length;
  } catch { return 0; }
};

const readRoot = f => {
  try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { return ''; }
};

/**
 * 自己診断の出力から**総括の一行だけ**を読む。
 *
 * ⚠️ **位置で決めるな。名前で決めよ**(第29条の精神)。
 *
 * 実測(2026-09-02): ダッシュボードの門13本を新設したところ、自己診断の出力に
 * 子テストの集計行が現れた —— `dashboard-count: 15 passed, 0 failed` ほか計8本。
 * 旧実装は `out.match(/([0-9]+) passed, ([0-9]+) failed/)` を使っており、
 * **String.match は最初の一致しか返さない**。ゆえに census は 1件目の
 * `15` を「楽園のテスト総数」と信じ、README の 256 と突き合わせて
 * 第22条違反を叫んだ。**嘘をついていたのは README ではなく数え方だった。**
 *
 * 総括は「先頭」でも「末尾」でもなく `Paradise self-test:` と名乗る行である。
 * 名前で狙えば、子テストが何本増えても、順序が変わっても壊れない。
 * 名乗りが見つからないときだけ、最後の一致に落ちる(版が変わった場合の保険)。
 *
 * @returns {{passed:number, failed:number}|null} 読めなければ null(= 測れなかった)
 */
function summaryOf(out) {
  const named = String(out).match(/Paradise self-test:\s*([0-9]+) passed, ([0-9]+) failed/);
  if (named) return { passed: +named[1], failed: +named[2] };
  const all = [...String(out).matchAll(/([0-9]+) passed, ([0-9]+) failed/g)];
  if (!all.length) return null;
  const last = all[all.length - 1];
  return { passed: +last[1], failed: +last[2] };
}

/** 楽園の真の数を測る。推測は一つも無い — 全て実ファイル/実行結果から。 */
function census(opts = {}) {
  const constitution = readRoot('CONSTITUTION.md');
  const articles = (constitution.match(/^[0-9]+\. \*\*/gm) || []).length;

  let tests = null;
  if (opts.runTests !== false) {
    /**
     * **打ち切られた走行の部分出力を、真実として報告してはならない**(第16条)。
     *
     * 旧実装は timeout 120 秒で打ち切られた stdout から `N passed, M failed` を
     * 拾い、その時点までに出た **15 件**を「楽園のテストは 15 件」として報告した。
     * README の 256 と突き合わせて census が第22条違反を叫んだが、
     * **嘘をついていたのは README ではなく census の数え方だった。**
     *
     * 途中まで数えた数は「数えた結果」ではなく「数え損ね」である。
     * ゆえに打ち切られたら `tests: null` にして**測れなかったと表明する**。
     * 呼び手は null を見て「(not measured)」と出す —— 0 や部分値で埋めない。
     *
     * ⚠️ **註釈に所要時間を書くな**(review 神官の指摘 F-2/F-3 を受けた是正)。
     * かつてここには「自己診断は 282 秒」「census は 120,072ms」と書かれていた。
     * だが **120,072ms は打ち切り時刻(120,000 + 72)であって所要ではない** ——
     * 打ち切られた値を実測値として扱う、まさにこの註釈が禁じている過ちだった。
     * 所要は機械と同時走行の有無で変わる。**数が要るなら測れ。註釈は約束をするな。**
     */
    const TIMEOUT_MS = Number(opts.testTimeoutMs || process.env.CENSUS_TEST_TIMEOUT_MS || 600000);
    try {
      const out = execFileSync(process.execPath, [path.join(ROOT, 'tests', 'paradise.test.js')],
        { encoding: 'utf8', cwd: ROOT, timeout: TIMEOUT_MS });
      tests = summaryOf(out);
    } catch (e) {
      // 打ち切り (ETIMEDOUT / SIGTERM) は「測れなかった」。部分出力を採らない
      const killed = !!(e && (e.killed || e.signal || e.code === 'ETIMEDOUT'));
      if (killed) {
        tests = null;
      } else {
        // 走り切ったが exit != 0(= 赤があった)。その数は事実なので読む
        tests = summaryOf(String((e && (e.stdout || e.message)) || ''));
      }
    }
  }

  const vendor = {};
  for (const k of ['agents', 'commands', 'skills', 'rules', 'hooks', 'scripts', 'contexts']) {
    vendor[k] = countFiles(path.join('overlay', 'vendor', k));
  }
  let vendorFiles = 0;
  const walk = d => {
    let ents = [];
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.isDirectory()) walk(path.join(d, e.name));
      else vendorFiles++;
    }
  };
  walk(path.join(ROOT, 'overlay', 'vendor'));

  return {
    articles,
    tests,
    engines: countFiles('graph', '.js'),
    /**
     * ダッシュボードを守る門の本数。
     * README が「門 N 本」と書くなら、その N はここが数え直す (第22条)。
     * 門を 1 本足して README を直し忘れれば check が赤くなる —— 散文が腐る前に鳴る。
     * 数える対象は「ダッシュボードの受入を担う試験ファイル」であり、
     * tests/dashboard-*.test.js に motion-probe-leak (門が己の残骸で鳴らないこと) を加える。
     */
    dashboardGates: (() => {
      try {
        return fs.readdirSync(path.join(ROOT, 'tests'))
          .filter(f => /^dashboard-.+\.test\.js$/.test(f) || f === 'motion-probe-leak.test.js')
          .length;
      } catch { return 0; }
    })(),
    creations: (() => {
      // 第30条: 住所を知るのは workspace.js だけ。旧住所を ROOT 直下に直書きしていた頃は、
      // 実在 8 件に対し catch { return 0 } が 0 を返して黙っていた。
      // **解決に失敗したら 0 を返して黙るのではなく、null を返して明示的に告げる。**
      try {
        const r = workspace.resolve();
        if (!r || !r.root || !r.exists) return null;
        return fs.readdirSync(r.root, { withFileTypes: true })
          .filter(e => e.isDirectory())
          .filter(e => !e.name.startsWith('.'))    // .git / .github は創造物ではない
          .filter(e => !e.name.startsWith('_'))    // _ 始まりは作業場
          .length;
      } catch { return null; }
    })(),
    overlayAgents: countFiles(path.join('overlay', 'agents'), '.md'),
    overlayCommands: countFiles(path.join('overlay', 'commands'), '.md'),
    vendor,
    vendorFiles,
  };
}

/**
 * 文書中の「数の主張」。それぞれ実測値を返す resolver を持つ。
 * 主張を増やすときは、必ず実測できる形にすること — 数えられない主張は書かない。
 */
/**
 * 一つの主張が**幾つの数を語っているか**を、正規表現の捕捉群の数で数える。
 * 実行せずに数えるため、空文字に必ず当たる `re|` を撃つ古典手を使う。
 */
function groupCount(re) {
  return new RegExp(re.source + '|').exec('').length - 1;
}

/** 主張の期待値を配列へ正規化する。scalar は「数を一つ語る主張」。 */
function expectedOf(cl) {
  return Array.isArray(cl.actual) ? cl.actual : [cl.actual];
}

/** 主張が測れたか (期待値のどれか一つでも測れなければ、その主張は裁かない)。 */
function measurable(cl) {
  const e = expectedOf(cl);
  return e.length > 0 && e.every(v => v != null);
}

/** 文書からその主張が語る数を**全て**読む。読めなければ null。 */
function readClaim(text, re) {
  const m = String(text).match(re);
  return m ? m.slice(1).map(Number) : null;
}

/**
 * 主張 1 件を文書に突き合わせて裁く。findings 一件 or null を返す。
 *
 * kind:'malformed' は **主張そのものの欠陥** である ——
 * 散文が語る数のうち捕捉群になっていないものが在れば、fix() はそれを
 * 取り残す。それが「336/335」という新たな嘘の出所だった。
 * ゆえに「語る数 ≠ 捕捉群の数」を、腐った値と同格の赤として鳴らす。
 */
function evaluateClaim(text, cl) {
  const expected = expectedOf(cl);
  const n = groupCount(cl.re);
  // finding は表示用に actual を文字列化する。**書き換えの原本は claim 側に残す** ——
  // finding の actual を applyClaim に渡すと '339/339' が「数一つ」に見え、
  // 捕捉群 2 個と食い違って書き換えが拒まれる (実測した回帰)。
  const base = { ...cl, claim: cl };
  if (n !== expected.length) {
    return { ...base, kind: 'malformed', claimed: `捕捉群 ${n} 個`, actual: `語る数 ${expected.length} 個`,
      note: '主張する数は一つ残らず捕捉群にせよ — 捕捉しない数は fix が取り残し、嘘になる (第22条)' };
  }
  const got = readClaim(text, cl.re);
  if (!got) return { ...base, kind: 'missing', claimed: null, actual: expected.join('/') };
  if (got.some((v, i) => v !== expected[i])) {
    return { ...base, kind: 'stale', claimed: got.join('/'), actual: expected.join('/') };
  }
  return null;
}

/**
 * 主張が語る数を**全て**実測値へ書き換えた文書を返す (原文は変えない)。
 *
 * 旧実装は `m[0].replace(String(m[1]), String(f.actual))` ——
 * 捕捉群 1 つしか置換できず、しかも「値が一致する別の場所」を誤爆し得た。
 * ここでは `d` フラグ (hasIndices) で各群の**位置**を得て、後ろから切り貼りする。
 * 位置で切るので、同じ数字が並んでも取り違えない。
 *
 * 書き換えた後、**その主張の正規表現で読み直して検算する**。
 * 一致しなければ投げる —— 「直したのに赤のまま」「fix が別の嘘を作る」を
 * 機構的に不可能にするのは、この検算である。
 */
function applyClaim(text, cl) {
  const expected = expectedOf(cl);
  const n = groupCount(cl.re);
  if (n !== expected.length) {
    throw new Error(`claim ${cl.label}: 捕捉群 ${n} 個に対し語る数 ${expected.length} 個 — 捕捉しない数は fix が嘘にする`);
  }
  const rd = new RegExp(cl.re.source, cl.re.flags.includes('d') ? cl.re.flags : cl.re.flags + 'd');
  const m = rd.exec(String(text));
  if (!m) throw new Error(`claim ${cl.label}: ${cl.file} に主張が見つからない`);
  let out = String(text);
  // 後ろの群から書き換える — 前を先に変えると後ろの位置がずれる
  for (let i = expected.length; i >= 1; i--) {
    const span = m.indices[i];
    if (!span) throw new Error(`claim ${cl.label}: 捕捉群 ${i} が当たらなかった`);
    out = out.slice(0, span[0]) + String(expected[i - 1]) + out.slice(span[1]);
  }
  // 検算 — 書いた文書を、その主張の目で読み直す
  const back = readClaim(out, cl.re);
  if (!back || back.some((v, i) => v !== expected[i])) {
    throw new Error(`claim ${cl.label}: 書き換え後も主張が実測と一致しない ` +
      `(読み直し ${back ? back.join('/') : 'なし'} ≠ 実測 ${expected.join('/')}) — fix は嘘を書かない`);
  }
  return out;
}

function claims(c) {
  const list = [
    // CLAUDE.md の数値 claim は第39条で撤去された — CLAUDE.md は数値台帳ではない。
    // 数は census が数え、dashboard が神に見せる。CLAUDE.md への数値の再侵入は
    // dietChecks() が裁く (方針転換に門を追従させる — 第36条)。
    /**
     * README の「N/M pass」は **数を二つ語っている**。
     * 旧実装は分母を `\d+` と捨てており、fix() が分子だけ書き換えて
     * `336/335` という新たな嘘を残した。語る数は残らず捕捉する。
     * 分母 = 走った総数 = passed + failed (緑なら分子と等しい)。
     *
     * **語る数の個数 (arity) は、測れたかどうかで変わってはならない。**
     * 測れなければ null を並べる —— measurable() が偽になって裁かれず、
     * それでも「この主張は数を二つ語る」という形は保たれる。
     * (arity が測定の成否で揺れると、捕捉群との突合門が測定モードで嘘の赤を出す)
     */
    { file: 'README.md', re: /paradise\.test\.js\s+#\s*(\d+)\/(\d+) pass/,
      actual: [c.tests ? c.tests.passed : null, c.tests ? c.tests.passed + c.tests.failed : null],
      label: 'README テスト数' },
    { file: 'README.md', re: /取り込んだもの（(\d+)ファイル/,     actual: c.vendorFiles,             label: 'README vendor 総ファイル数' },
    { file: 'README.md', re: /`agents (\d+)`/,                   actual: c.vendor.agents,           label: 'README vendor agents' },
    { file: 'README.md', re: /`commands (\d+)`/,                 actual: c.vendor.commands,         label: 'README vendor commands' },
    { file: 'README.md', re: /`skills (\d+)`/,                   actual: c.vendor.skills,           label: 'README vendor skills' },
    { file: 'README.md', re: /`rules (\d+)`/,                    actual: c.vendor.rules,            label: 'README vendor rules' },
    { file: 'README.md', re: /`hooks (\d+)`/,                    actual: c.vendor.hooks,            label: 'README vendor hooks' },
    { file: 'README.md', re: /`scripts (\d+)`/,                  actual: c.vendor.scripts,          label: 'README vendor scripts' },
    { file: 'README.md', re: /`contexts (\d+)`/,                 actual: c.vendor.contexts,         label: 'README vendor contexts' },
    // ダッシュボードの門の本数 (第22条)。散文が「門 N 本」と言うなら N を数え直す。
    { file: 'README.md', re: /ダッシュボードの門 \*\*(\d+) 本\*\*/, actual: c.dashboardGates,       label: 'README ダッシュボード門数' },
  ];
  return list;
}

function check(opts = {}) {
  const c = census(opts);
  const findings = [];
  for (const cl of claims(c)) {
    if (!measurable(cl)) continue;                 // 測れなかった主張は裁かない
    const f = evaluateClaim(readRoot(cl.file), cl);
    if (f) findings.push(f);
  }
  findings.push(...dietChecks());
  return { ok: findings.length === 0, census: c, findings };
}

/**
 * diet 門 (第39条) — CLAUDE.md は「最初の1画面」である。
 * 値でなく不変量を裁く: (1) 常時ロードの散文は予算内に収まる。
 * (2) 機械が数え直す数値 (テスト数・条数) は CLAUDE.md に住まない —
 *     数は census が数え、dashboard が神に見せる。
 * 予算 4,096 B は「1画面 ≈ 500 tokens 帯」の符号化。神が意図して広げるのは
 * 自由 — その時はこの定数を変え、理由を commit に書く。
 */
const CLAUDE_MD_BUDGET = 4096;
const VOLATILE_NUMBER_RES = [
  // [^\n]* → {0,80}? の有界・怠惰量化: 信頼できない入力でも多項式爆発しない (審査指摘)
  { re: /自己診断[^\n]{0,80}?\d+\s*件/, why: 'テスト数は census が数える' },
  { re: /\*\*\d+\s*tests?\*\*/i,  why: 'テスト数は census が数える' },
  { re: /憲法[:：]?\s*\*?\*?\d+\s*条/, why: '条数は codex index が語る' },
];
function dietChecks() {
  const findings = [];
  const p = path.join(ROOT, 'CLAUDE.md');
  if (fs.existsSync(p)) {
    const raw = fs.readFileSync(p);
    if (raw.length > CLAUDE_MD_BUDGET) {
      // kind:'diet' — fix() は kind:'stale' しか書き換えない。'stale' を名乗ると
      // fix() が re の無い finding に空正規表現で当たり「直した」と虚偽報告する (審査指摘)。
      findings.push({ file: 'CLAUDE.md', kind: 'diet', label: 'CLAUDE.md 予算超過 (第39条)',
        claimed: raw.length, actual: CLAUDE_MD_BUDGET,
        note: `常時ロードの散文が ${raw.length} B — 予算 ${CLAUDE_MD_BUDGET} B。法は機構へ、詳細は指した先へ` });
    }
    const text = raw.toString('utf8');
    for (const v of VOLATILE_NUMBER_RES) {
      const m = text.match(v.re);
      if (m) findings.push({ file: 'CLAUDE.md', kind: 'diet', label: 'CLAUDE.md への数値の再侵入 (第39条)',
        claimed: m[0], actual: '(数値は書かない)', note: v.why });
    }
  }
  findings.push(...harnessDietChecks());
  return findings;
}

/**
 * ハーネス diet 門 (第40条) — 毎セッション常時ロードされる散文は
 * project CLAUDE.md だけではない。global CLAUDE.md (overlay/root/) と
 * paths: スコープを持たない rules/*.md も全て予算の対象である。
 * ここは**原本 (overlay/) を裁く** — 配備物 ~/.claude は成果物であり (第29条)、
 * 原本が痩せていれば配備物も痩せる。CI にハーネスが無くても原本は在る。
 */
const GLOBAL_CLAUDE_MD_BUDGET = 2048;      // global は project より薄くあるべき
const ALWAYS_ON_RULES_BUDGET  = 4096;      // 無スコープ rules の総量
function hasPathsScope(text) {
  // 有効な paths: は YAML frontmatter (--- ... ---) の中にだけ住む
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return !!(m && /^paths:/m.test(m[1]));
}
function harnessDietChecks() {
  const findings = [];
  const g = path.join(ROOT, 'overlay', 'root', 'CLAUDE.md');
  if (fs.existsSync(g)) {
    const n = fs.readFileSync(g).length;
    if (n > GLOBAL_CLAUDE_MD_BUDGET) {
      findings.push({ file: 'overlay/root/CLAUDE.md', kind: 'diet', label: 'global CLAUDE.md 予算超過 (第40条)',
        claimed: n, actual: GLOBAL_CLAUDE_MD_BUDGET,
        note: `全プロジェクトの毎セッションに乗る散文が ${n} B — 予算 ${GLOBAL_CLAUDE_MD_BUDGET} B。手順は commands へ、掟は hooks へ` });
    }
  }
  const rulesDir = path.join(ROOT, 'overlay', 'rules');
  if (fs.existsSync(rulesDir)) {
    let alwaysOn = 0; const unscoped = [];
    for (const f of fs.readdirSync(rulesDir).filter(f => f.endsWith('.md'))) {
      const text = fs.readFileSync(path.join(rulesDir, f), 'utf8');
      if (!hasPathsScope(text)) { alwaysOn += Buffer.byteLength(text); unscoped.push(f); }
    }
    if (alwaysOn > ALWAYS_ON_RULES_BUDGET) {
      findings.push({ file: 'overlay/rules/', kind: 'diet', label: '無スコープ rules の総量超過 (第40条)',
        claimed: alwaysOn, actual: ALWAYS_ON_RULES_BUDGET,
        note: `paths: を持たない rule ${unscoped.length} 本 (${unscoped.join(', ')}) が計 ${alwaysOn} B — 予算 ${ALWAYS_ON_RULES_BUDGET} B。ファイル種に紐づく掟は paths: で絞る` });
    }
  }
  return findings;
}

/**
 * 文書中の腐った数を実測へ書き換える。
 *
 * **fix は嘘を書かない** —— 三重の機構でそれを担保する:
 *  1. 主張が語る数を**残らず**捕捉群にすることを強いる (malformed は書き換えず赤で残す)
 *  2. applyClaim が全群を位置で書き換え、書いた直後に**同じ正規表現で読み直して検算**する
 *  3. 書き終えた後、全主張を**もう一度 evaluateClaim で裁き直す** (opts は流用せず
 *     測り直しは避ける — 実測値は既に手中に在る)。残った stale/malformed は
 *     `unresolved` として返し、CLI は exit 1 で落ちる。
 * ゆえに「fix したのに check が赤のまま」「fix が別の嘘を作る」は機構的に起きない。
 */
function fix(opts = {}) {
  const res = check(opts);
  const c = res.census;
  const byFile = new Map();
  const readOf = f => {
    if (!byFile.has(f)) byFile.set(f, readRoot(f));
    return byFile.get(f);
  };
  const fixed = [], failed = [];
  for (const f of res.findings) {
    if (f.kind !== 'stale') continue;              // malformed / diet / missing は fix の領分ではない
    const cl = f.claim || f;                       // 書き換えは常に原本の claim で行う (実測値は配列のまま)
    try {
      byFile.set(f.file, applyClaim(readOf(f.file), cl));
      fixed.push(f);
    } catch (e) {
      failed.push({ ...f, error: e.message });
    }
  }
  for (const [file, text] of byFile) {
    if (text !== readRoot(file)) fs.writeFileSync(path.join(ROOT, file), text);
  }
  // 書き終えた文書を、全主張の目で裁き直す — 直したつもりを実測で潰す
  const unresolved = [];
  for (const cl of claims(c)) {
    if (!measurable(cl)) continue;
    const v = evaluateClaim(readRoot(cl.file), cl);
    if (v) unresolved.push(v);
  }
  return { edited: [...byFile.keys()].filter(f => fixed.some(x => x.file === f)), fixed, failed, unresolved };
}

if (require.main === module) {
  const cmd = process.argv[2] || 'show';
  // FR-06: 自己診断を回さないモード。内部 API は既に opts.runTests !== false の
  // 分岐を持つので、CLI フラグをそこへ繋ぐだけでよい。**既定挙動は変えない。**
  const noTests = process.argv.includes('--no-tests');
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('commands: show [--no-tests] | check [--no-tests] | fix');
    console.log('  --no-tests   自己診断 (tests/paradise.test.js) を回さない。');
    console.log('               既定では回す — 実測 120,072ms かかり、同期経路では待てない。');
    process.exit(0);
  }
  if (cmd === 'show') {
    const c = census({ runTests: !noTests });
    console.log('═══════ 🔢 PARADISE CENSUS ═══════');
    console.log('  constitution articles :', c.articles);
    console.log('  self-test             :', c.tests ? `${c.tests.passed} passed, ${c.tests.failed} failed`
      : (noTests ? '(skipped: --no-tests)' : '(not run)'));
    console.log('  engines (graph/*.js)  :', c.engines);
    console.log('  creations             :', c.creations === null ? '(unresolved — workspace.resolve() が住所を返さない)' : c.creations);
    console.log('  overlay agents/cmds   :', c.overlayAgents, '/', c.overlayCommands);
    console.log('  vendored files        :', c.vendorFiles, JSON.stringify(c.vendor));
    console.log('══════════════════════════════════');
    process.exit(0);
  }
  if (cmd === 'check') {
    const res = check({ runTests: !noTests });
    console.log('═══════ 🔢 CENSUS CHECK ═══════');
    if (res.ok) console.log('  ✓ every number the paradise claims about itself is true');
    for (const f of res.findings) {
      if (f.kind === 'missing') console.log(`  ⚠️  ${f.label}: claim not found in ${f.file} (実測 ${f.actual})`);
      else if (f.kind === 'malformed') console.log(`  🔴 ${f.label}: 主張の形が壊れている — ${f.claimed} / ${f.actual}  (${f.file})\n       ${f.note}`);
      else console.log(`  🔴 ${f.label}: doc says ${f.claimed}, reality is ${f.actual}  (${f.file})`);
    }
    console.log('═══════════════════════════════');
    process.exit(res.ok ? 0 : 1);
  }
  if (cmd === 'fix') {
    const r = fix({ runTests: !noTests });
    for (const f of r.fixed) console.log(`  ✏️  ${f.label}: ${f.claimed} → ${f.actual}`);
    for (const f of r.failed) console.log(`  🔴 ${f.label}: 書き換えできなかった — ${f.error}`);
    console.log(r.edited.length ? `updated: ${r.edited.join(', ')}` : 'nothing to fix');
    // 直したつもりを許さない — 書いた後に裁き直して残った赤は、そのまま落とす
    if (r.unresolved.length || r.failed.length) {
      for (const f of r.unresolved) console.log(`  🔴 未解決 ${f.label}: doc says ${f.claimed}, reality is ${f.actual}  (${f.file})`);
      console.log('  ✗ fix は文書を真実にできなかった — 上の主張を直せ (第22条)');
      process.exit(1);
    }
    console.log('  ✓ 書き換えた数は、その主張の目で読み直して実測と一致する');
    process.exit(0);
  }
  console.error('usage: census.js [show|check|fix]');
  process.exit(2);
}

module.exports = { census, check, fix, claims, groupCount, expectedOf, measurable, readClaim, evaluateClaim, applyClaim, dietChecks, harnessDietChecks, summaryOf, CLAUDE_MD_BUDGET, GLOBAL_CLAUDE_MD_BUDGET, ALWAYS_ON_RULES_BUDGET };
