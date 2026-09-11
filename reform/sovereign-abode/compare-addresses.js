#!/usr/bin/env node
'use strict';
/**
 * compare-addresses.js — 付け替えが**無色透明**であることを機械で証す
 *
 * work-1 の既定は `global` である。ゆえに**素の走行では**、付け替えの前後で
 * engine が解決する住所は一つ残らず同じ値でなければならない。それを散文で
 * 主張せず機械で証す(第10条: 宣言は機構ではない)。
 *
 * **だが「全ての条件で完全に同じ」は、この改革の目的に反する。**
 * 第58条が名指しした病そのものが「env を四本立てても engine は本物のホームを
 * 見ていた」である。ゆえに個別 env を立てた条件では、**一部の住所は必ず変わる**
 * —— 変わらなければ病が治っていない。
 *
 * ここが本器の設計の要である: **差分を「無い」ことにしない。**
 * 差分は `EXPECTED_DIFFS` に**理由つきで宣言**され、宣言に無い差分が
 * 一つでも出れば exit 1 である(第54条(c): 免除は記録されて初めて例外である)。
 * 宣言済みの差分も、**印字して口で名乗る**。黙って通した差分は 0 件。
 *
 * 条件(env を一本ずつ立てる — 束ねると「どの env が効いたか」が見えなくなる):
 *   bare / CLAUDE_HOME / CLAUDE_SETTINGS / PARADISE_SETTINGS / PARADISE_AGENTS /
 *   PARADISE_KG / PARADISE_DAILY_LEDGER / all-overrides /
 *   PARADISE_ABODE=global / PARADISE_ABODE=repo (後者は付け替え後のみ意味を持つ)
 *
 * **倉の根を正規化する。** 前は複製、後は本物の倉に住むので、倉の根から
 * 導かれる住所は文字列として必ず食い違う。根を `<REPO>` に畳んで比べる ——
 * 比べているのは「住所の作り方」であって「どの倉で走らせたか」ではない。
 *
 *   node reform/sovereign-abode/compare-addresses.js <before-root> [after-root]
 *
 * exit 0 = 宣言に無い差分は 0 件(付け替えは無色透明である)
 * exit 1 = 宣言に無い差分が在った(回帰。行を名指す)
 * exit 2 = 検められなかった(前の複製が無い等)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const BEFORE = process.argv[2];
const AFTER = process.argv[3] || path.resolve(__dirname, '..', '..');
if (!BEFORE || !fs.existsSync(path.join(BEFORE, 'graph', 'abode.js'))) {
  console.error(`✗ 前の複製が無い: ${BEFORE} — 検められなかった (第37条)`);
  process.exit(2);
}

/** 個別 env の宛先。両走行で同一の絶対パスを使う —— でなければ比較にならない。 */
const BOX = path.join(os.tmpdir(), 'pdw1-envbox');
for (const d of ['abode', 'abode/agents', 'abode/commands', 'agents', 'kg']) {
  fs.mkdirSync(path.join(BOX, d), { recursive: true });
}
for (const f of ['abode/settings.json', 'settings.json']) {
  if (!fs.existsSync(path.join(BOX, f))) fs.writeFileSync(path.join(BOX, f), '{}\n');
}
const B = (...p) => path.join(BOX, ...p);

const CONDITIONS = [
  { name: 'bare', env: {} },
  { name: 'CLAUDE_HOME', env: { CLAUDE_HOME: B('abode') } },
  { name: 'CLAUDE_SETTINGS', env: { CLAUDE_SETTINGS: B('settings.json') } },
  { name: 'PARADISE_SETTINGS', env: { PARADISE_SETTINGS: B('settings.json') } },
  { name: 'PARADISE_AGENTS', env: { PARADISE_AGENTS: B('agents') } },
  { name: 'PARADISE_KG', env: { PARADISE_KG: B('kg') } },
  { name: 'PARADISE_DAILY_LEDGER', env: { PARADISE_DAILY_LEDGER: B('daily.json') } },
  {
    name: 'all-overrides',
    env: {
      CLAUDE_HOME: B('abode'), CLAUDE_SETTINGS: B('settings.json'),
      PARADISE_SETTINGS: B('settings.json'), PARADISE_AGENTS: B('agents'),
      PARADISE_KG: B('kg'), PARADISE_DAILY_LEDGER: B('daily.json'),
    },
  },
  { name: 'PARADISE_ABODE=global', env: { PARADISE_ABODE: 'global' } },
  { name: 'PARADISE_ABODE=repo', env: { PARADISE_ABODE: 'repo' }, afterOnly: true },
];

/**
 * **理由つきで宣言された差分だけが許される。**
 * 鍵は `<条件>::<住所>`、値は「なぜ変わるのが正しいか」。
 * 宣言に無い差分は回帰である。
 */
const EXPECTED_DIFFS = {
  // ── 病の是正 ①: env の逃げ道を一つも持たなかった engine (第58条 前文の実測) ──
  'CLAUDE_HOME::check-agents.check.dir':
    'AC-17: check-agents は CLAUDE_HOME を見なかった(env 四本でも本物のホームを見る病)。解決器を通したので従う',
  'CLAUDE_HOME::check-agents.hierarchy.dir': 'AC-17: 同上 (hierarchyIntegrity 側)',
  'CLAUDE_HOME::pulse.claudeDir': 'AC-17: pulse.claudeDir は env を一つも見なかった。abode 経由で CLAUDE_HOME に従う',
  'CLAUDE_HOME::pulse.claudeDir(agents)': 'AC-17: 同上 (claudeDir の一点突破が 5 箇所に効く)',
  'CLAUDE_HOME::daily-guard.LEDGER':
    'abode の rebase が dailyLedger を abode 配下に置く(work-0 の設計)。CLAUDE_HOME は「住処ごと差し替える」env であり、日次台帳もその配下である',
  'PARADISE_AGENTS::apply-spawn.AGENTS_DIR':
    'AC-20 の対称性: apply-spawn は CLAUDE_HOME しか見ず、兄弟の apply-models と非対称だった。同一の口にした',
  'PARADISE_AGENTS::check-agents.check.dir': 'AC-17: check-agents は PARADISE_AGENTS を見なかった',
  'PARADISE_AGENTS::check-agents.hierarchy.dir': 'AC-17: 同上',
  'PARADISE_AGENTS::ordain.globalAgents':
    '第58条(a): 名の衝突検査も同じ解決器を通る。散らばった住所が一本になった結果である',
  'CLAUDE_HOME::apply-models.AGENT_DIR':
    'design §3.1 #2: `PARADISE_AGENTS || abode.pathFor("agents")`。apply-models は CLAUDE_HOME を見なかった(discovery の実測 251 行)。' +
    'CLAUDE_HOME は「住処ごと差し替える」env であり、その配下の agents も従うのが一本道の意味である',
  'CLAUDE_HOME::wire-paradise-hooks.SETTINGS':
    'design §3.1 #14: `CLAUDE_SETTINGS || abode.pathFor("settings")`。CLAUDE_HOME で住処を差し替えれば settings もその配下へ移る',
  'PARADISE_SETTINGS::vendor.settingsPath':
    'design §3.1 #13: vendor は CLAUDE_SETTINGS しか見ず、guards の門が使う PARADISE_SETTINGS を無視していた。' +
    '同じ settings を二つの engine が別の住所で見る状態を解消した',
  'PARADISE_SETTINGS::wire-paradise-hooks.SETTINGS':
    'design §3.1 #14 (vendor と同じ理由 — PARADISE_SETTINGS は abode 経由で効くようになった)',

  'all-overrides::apply-spawn.AGENTS_DIR': 'AC-20 の対称性 (PARADISE_AGENTS 単独と同じ理由)',
  'all-overrides::check-agents.check.dir': 'AC-17 (同上)',
  'all-overrides::check-agents.hierarchy.dir': 'AC-17 (同上)',
  'all-overrides::ordain.globalAgents': '第58条(a) (同上)',
  'all-overrides::pulse.claudeDir': 'AC-17 (同上)',
  'all-overrides::pulse.claudeDir(agents)': 'AC-17 (同上)',

  // ── 病の是正 ②: 一台の機械の都合を全ての機械へ当てはめる推測を削った ──
  'bare::session-start.lastResort':
    '第16条: 最後の手段の行 `path.join(os.homedir(), "Documents","workspace","paradise")` を削り null を返す。' +
    '判定不能を推測で埋めれば、別の倉のフックが楽園の記憶を注ぐ',
};
for (const c of CONDITIONS) {
  if (c.afterOnly) continue;
  EXPECTED_DIFFS[`${c.name}::session-start.lastResort`] =
    EXPECTED_DIFFS['bare::session-start.lastResort'];
}

function run(root, env) {
  const r = spawnSync(process.execPath,
    [path.join(root, 'reform', 'sovereign-abode', 'probe-addresses.js'), '--json'],
    { cwd: root, encoding: 'utf8', env: { ...process.env, ...env }, timeout: 180000 });
  if (!r.stdout) throw new Error(`探査器が走らなかった (${root}): ${r.stderr || r.error}`);
  return JSON.parse(r.stdout);
}

/** 倉の根を `<REPO>` に畳む。前と後で倉の場所が違うのは、住所の作り方の差ではない。 */
function norm(v, root) {
  if (v === null) return null;
  const f = (s) => String(s).replace(/\\/g, '/');
  return f(v).replace(f(path.resolve(root)), '<REPO>');
}

let same = 0, declared = 0;
const regressions = [];
const declaredRows = [];

for (const c of CONDITIONS) {
  const after = run(AFTER, c.env);
  const before = c.afterOnly ? null : run(BEFORE, c.env);
  const keys = [...new Set([...Object.keys(after.sites), ...(before ? Object.keys(before.sites) : [])])].sort();
  console.log(`\n═══ 条件: ${c.name}${c.afterOnly ? '  (付け替え後のみ意味を持つ)' : ''} ═══`);
  for (const k of keys) {
    const a = norm(after.sites[k], AFTER);
    const show = (v) => (v === null ? '(無し)' : v);
    if (c.afterOnly) { console.log(`    ${k.padEnd(30)} ${show(a)}`); continue; }
    const b = norm(before.sites[k], BEFORE);
    if (a === b) { same++; console.log(`  ✓ ${k.padEnd(30)} ${show(a)}`); continue; }
    const why = EXPECTED_DIFFS[`${c.name}::${k}`];
    if (why) {
      declared++;
      declaredRows.push({ cond: c.name, site: k, before: b, after: a, why });
      console.log(`  ⟳ ${k.padEnd(30)} 前=${show(b)}  →  後=${show(a)}`);
      console.log(`      宣言された是正: ${why}`);
    } else {
      regressions.push({ cond: c.name, site: k, before: b, after: a });
      console.log(`  ✗ ${k.padEnd(30)} 前=${show(b)}  ≠  後=${show(a)}   ← 宣言に無い差分`);
      if (before.errors[k]) console.log(`      前が測れなかった理由: ${before.errors[k]}`);
      if (after.errors[k]) console.log(`      後が測れなかった理由: ${after.errors[k]}`);
    }
  }
}

console.log('\n═══════════════════════════════════════════════════════');
console.log(`  一致 ${same} 件 / 宣言された是正 ${declared} 件 / **宣言に無い差分 ${regressions.length} 件**`);
if (regressions.length) {
  console.log('✗ 付け替えが宣言していない振る舞いの変化を起こしている:');
  for (const r of regressions) console.log(`  ${r.cond}::${r.site}  前=${r.before} ≠ 後=${r.after}`);
} else {
  console.log('✓ 素の走行では住所は一つも動かず、動いた住所は全て理由つきで宣言されている');
}
process.exit(regressions.length ? 1 : 0);
