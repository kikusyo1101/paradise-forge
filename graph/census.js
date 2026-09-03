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
    /**
     * 起動証跡(spawn-trace)を試す門の本数。
     * 棄権数・legacy 数を誰も数えなければ「棄権が既定になり門が死ぬ」が静かに起きる。
     * 静かに起きたことは第44条により先例として読まれる —— ゆえに数える(第22条)。
     */
    spawnTraceGates: (() => {
      try {
        const t = fs.readFileSync(path.join(ROOT, 'tests', 'paradise.test.js'), 'utf8');
        return (t.match(/^test\('spawn trace: /gm) || []).length;
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
function claims(c) {
  const list = [
    // CLAUDE.md の数値 claim は第39条で撤去された — CLAUDE.md は数値台帳ではない。
    // 数は census が数え、dashboard が神に見せる。CLAUDE.md への数値の再侵入は
    // dietChecks() が裁く (方針転換に門を追従させる — 第36条)。
    { file: 'README.md', re: /paradise\.test\.js\s+#\s*(\d+)\/\d+ pass/, actual: c.tests && c.tests.passed, label: 'README テスト数' },
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
    // 起動証跡の門の本数 (第22条)。門を足して README を直し忘れれば check が赤くなる。
    { file: 'README.md', re: /spawn-trace の門 \*\*(\d+) 本\*\*/,  actual: c.spawnTraceGates,      label: 'README spawn-trace 門数' },
  ];
  return list;
}

function check(opts = {}) {
  const c = census(opts);
  const findings = [];
  for (const cl of claims(c)) {
    if (cl.actual == null) continue;               // 測れなかった主張は裁かない
    const text = readRoot(cl.file);
    const m = text.match(cl.re);
    if (!m) { findings.push({ ...cl, kind: 'missing', claimed: null }); continue; }
    const claimed = Number(m[1]);
    if (claimed !== cl.actual) findings.push({ ...cl, kind: 'stale', claimed });
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

function fix(opts = {}) {
  const res = check(opts);
  const edited = new Set();
  for (const f of res.findings) {
    if (f.kind !== 'stale') continue;
    const p = path.join(ROOT, f.file);
    const text = fs.readFileSync(p, 'utf8');
    const m = text.match(f.re);
    if (!m) continue;
    // 捕捉群だけを置換する — 周りの散文には触れない
    const replaced = m[0].replace(String(m[1]), String(f.actual));
    fs.writeFileSync(p, text.replace(m[0], replaced));
    edited.add(f.file);
  }
  return { edited: [...edited], fixed: res.findings.filter(f => f.kind === 'stale') };
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
      else console.log(`  🔴 ${f.label}: doc says ${f.claimed}, reality is ${f.actual}  (${f.file})`);
    }
    console.log('═══════════════════════════════');
    process.exit(res.ok ? 0 : 1);
  }
  if (cmd === 'fix') {
    const r = fix();
    for (const f of r.fixed) console.log(`  ✏️  ${f.label}: ${f.claimed} → ${f.actual}`);
    console.log(r.edited.length ? `updated: ${r.edited.join(', ')}` : 'nothing to fix');
    process.exit(0);
  }
  console.error('usage: census.js [show|check|fix]');
  process.exit(2);
}

module.exports = { census, check, fix, claims, dietChecks, harnessDietChecks, summaryOf, CLAUDE_MD_BUDGET, GLOBAL_CLAUDE_MD_BUDGET, ALWAYS_ON_RULES_BUDGET };
