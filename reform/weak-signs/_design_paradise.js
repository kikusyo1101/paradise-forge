#!/usr/bin/env node
/**
 * design 相の計測器 ③(**作り直し**): `tests/paradise.test.js` への衝撃を測る。
 *
 * ══ なぜ作り直したか(第37条: 絶無を緑と読むな)══════════════════════
 * 初版は `_cand_gate.js`(require.cache 注入)で走らせようとして **一度も走らなかった**。
 * `paradise.test.js` は先頭の gate-filter が `process.argv` を厳格に読み、
 * 知らない引数を `exit 2` で撥ねる —— 曲げた forge のパスが「未知のフラグ」になった。
 *   実測(初版の生出力): `Paradise gate-filter: unknown flag none` / exit=2 / **0.0 秒** /
 *   集計行なし / 「新しく ✗ になった門: 0 本」
 * **471 門が 0.0 秒で終わるはずがない。** 両群とも一本も走っていないので 0 本だっただけである。
 *
 * ⚠️ しかも **require.cache 注入はそもそもこの門には効かない**:
 *    `paradise.test.js` は `child_process` を **85 箇所**で使い、子プロセスを撃つ。
 *    子は親の require.cache を継がず、**本物の graph/forge.js を読む**。
 *    ゆえにこの門だけは「**写しのリポジトリの graph/forge.js を実際に差し替える**」しかない。
 *
 * ══ 本器の形 ════════════════════════════════════════════════════════
 *   1. リポジトリを `.git` ごと $LOCALAPPDATA/Temp へ **二つ**写す(対照群 / 試験群)。
 *      `.git` を写すのは、写しでも対照群が緑であるため(前走行 §2.2 の実測)。
 *   2. 試験群の写しの `graph/forge.js` だけを X4″ に差し替える。
 *      **本物のリポジトリは一行も触らない。**
 *   3. **一つずつ逐次に**走らせる(NFR-1。並行させると hermetic 系が偽の ✗ を出す)。
 *   4. **走ったことを機械で確かめる**(下の three checks)。満たさなければ測定失敗として落ちる。
 *
 * ══ 走行の健全性判定(これを満たさない走行の差分は語らない)════════
 *   (a) 末尾に `Paradise self-test: N passed, M failed` の集計行が在ること
 *   (b) N + M ≥ 471(基準線の門の本数)
 *   (c) 所要時間 > 60 秒(471 門が一瞬で終わることは無い)
 *
 * 使い方: node reform/weak-signs/_design_paradise.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const TMP = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp');
const WORK = path.join(TMP, 'ws_cand');
const BENT = path.join(WORK, 'forge.D_X4PP.js');

/**
 * ══ 走行の健全性判定 ════════════════════════════════════════════════
 * **写しの基準線は本体と同じ「門の総数」である**(第37条: 数が閉じること)。
 *
 * ⚠️ `N ≥ 471` という素朴な閾値は**写しに対して不当**である。
 *    集計行は二形を取る(`graph/census.js:91` が同じ正規表現で読んでいる):
 *      神の機械 : `Paradise self-test: 469 passed, 0 failed`
 *      CI (裸)  : `Paradise self-test: 459 passed, 0 failed, 10 skipped`
 *    **楽園の性質は門の総数であり、それは `passed + failed + skipped` である。**
 *    版管理下の現物を見る門は、見るものが無ければ **skip を名乗って** 通る(第58条(e))。
 *    ゆえに `passed` だけを閾値にすると、正しく走った写しを「測定失敗」と誤審する。
 *
 * 判定:
 *   (a) 集計行が在ること
 *   (b) `failed === 0`
 *   (c) **門の総数(passed + failed + skipped)が本物のリポジトリの総数と等しいこと**
 *   (d) 所要時間 > 60 秒
 *
 * (c) の「本物の総数」は推定しない —— `PARA_BASELINE_TOTAL` で渡すか、
 * 渡されなければ**対照群の総数を基準線として採り、試験群がそれと等しいこと**を撃つ。
 * 対照群と試験群で門の総数が違えば、それ自体が「門が消えた/増えた」の報せである。
 */
const MIN_SECONDS = 60;     // 471 門が 60 秒未満で終わることは無い
const MIN_SANITY = 400;     // 正気検査(桁違いを捕らえるだけ。合否は総数の一致で決める)
const DECLARED_TOTAL = process.env.PARA_BASELINE_TOTAL ? Number(process.env.PARA_BASELINE_TOTAL) : null;

function copyRepo(dest) {
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  // node の cpSync で丸ごと写す(`.git` も含める —— 含めないと対照群でも 4 本が ✗ になる)
  fs.cpSync(ROOT, dest, { recursive: true, dereference: false, force: true, errorOnExist: false });
}

function runParadise(repo, label) {
  const t0 = Date.now();
  let out, exit = 0;
  try {
    out = execFileSync(process.execPath, [path.join(repo, 'tests', 'paradise.test.js')],
      { encoding: 'utf8', cwd: repo, maxBuffer: 256 * 1024 * 1024 });
  } catch (e) { exit = e.status; out = (e.stdout || '') + (e.stderr || ''); }
  const secs = (Date.now() - t0) / 1000;

  // ── 集計行を **skipped まで** 読む(census.js:91 と同じ正規表現)──
  const m = out.match(/Paradise self-test:\s*(\d+) passed, (\d+) failed(?:, (\d+) skipped)?/);
  const passed = m ? Number(m[1]) : -1;
  const failed = m ? Number(m[2]) : -1;
  const skipped = m ? Number(m[3] || 0) : -1;
  const total = m ? passed + failed + skipped : -1;

  const fails = out.split('\n').filter(l => l.includes('\u2717')).map(l => l.trim());
  // skip を名乗った行(第58条(e): 黙った skip は無い。理由が出力に在る)
  const skips = out.split('\n').filter(l => /(^|\s)·\s*skip|skip:/.test(l)).map(l => l.trim());

  console.log(`\n── ${label} ──  exit=${exit}  (${secs.toFixed(1)}s)  repo=${repo}`);
  console.log(`   集計行: ${m ? m[0] : '**無し**'}`);
  console.log(`   門の総数 = passed ${passed} + failed ${failed} + skipped ${skipped} = **${total}**`);
  console.log(`   ✗ の行数: ${fails.length}   skip を名乗った行: ${skips.length}`);
  for (const f of fails) console.log('     ✗ ' + f);
  for (const s of skips) console.log('     · ' + s);
  return { exit, fails, skips, passed, failed, skipped, total, secs, out };
}

/** 健全性は**総数の一致**で決める。閾値を下げるのではなく、写しの正しい基準線に合わせる。 */
function healthy(r, baselineTotal) {
  const reasons = [];
  if (r.total < 0) reasons.push('集計行が無い');
  if (r.failed !== 0) reasons.push(`failed=${r.failed}(0 でなければならない)`);
  if (r.total < MIN_SANITY) reasons.push(`門の総数 ${r.total} が桁違いに小さい`);
  if (r.secs <= MIN_SECONDS) reasons.push(`所要 ${r.secs.toFixed(1)}s が短すぎる`);
  if (baselineTotal !== null && r.total !== baselineTotal)
    reasons.push(`門の総数 ${r.total} が基準線 ${baselineTotal} と閉じない(第37条)`);
  return reasons;
}

const BASE_REPO = path.join(TMP, 'ws_para_base');
const X4_REPO = path.join(TMP, 'ws_para_x4pp');

console.log('【対照群】素の main / 【試験群】X4″ —— **写しのリポジトリ**で一つずつ逐次に走らせる(NFR-1)');
console.log('写し中(.git ごと / 各約 38MB)…');
copyRepo(BASE_REPO);
copyRepo(X4_REPO);
if (!fs.existsSync(BENT)) { console.error('X4″ の写しが無い — 先に _design_patch.js を走らせよ'); process.exit(2); }
fs.copyFileSync(BENT, path.join(X4_REPO, 'graph', 'forge.js'));

// 差し替えが実際に効いていることを確かめる(第58条: 当て損ねを緑にしない)
const chk = s => fs.readFileSync(path.join(s, 'graph', 'forge.js'), 'utf8').includes('REFORM_FALSE_FRIENDS');
console.log(`  対照群の forge に REFORM_FALSE_FRIENDS: ${chk(BASE_REPO)}(false でなければならない)`);
console.log(`  試験群の forge に REFORM_FALSE_FRIENDS: ${chk(X4_REPO)}(true でなければならない)`);
if (chk(BASE_REPO) || !chk(X4_REPO)) { console.error('差し替えが効いていない — 測定を中止する'); process.exit(2); }

// ★ 逐次に(並行させると hermetic 系が偽の ✗ を出す)
const base = runParadise(BASE_REPO, '対照群 (main そのもの / 写し)');
const x4 = runParadise(X4_REPO, '試験群 (X4″ / 写し)');

fs.writeFileSync(path.join(WORK, 'paradise_base.txt'), base.out);
fs.writeFileSync(path.join(WORK, 'paradise_x4pp.txt'), x4.out);

console.log('\n═══ 健全性の裁き(第37条: 数が閉じること)═══');
// 基準線は「宣言された総数」か、無ければ対照群の総数。**試験群は必ず対照群と閉じねばならない。**
const baseline = DECLARED_TOTAL;
const baseBad = healthy(base, baseline);
const x4Bad = healthy(x4, baseline !== null ? baseline : base.total);
console.log(`  対照群: 総数 ${base.total}(基準線 ${baseline === null ? '対照群自身' : baseline})  → ` +
  (baseBad.length ? '**測定失敗**: ' + baseBad.join(' / ') : '健全'));
console.log(`  試験群: 総数 ${x4.total}(基準線 ${baseline !== null ? baseline : base.total})  → ` +
  (x4Bad.length ? '**測定失敗**: ' + x4Bad.join(' / ') : '健全'));
if (base.total !== x4.total) {
  console.log(`  ⚠️ 対照群 ${base.total} 対 試験群 ${x4.total} —— **門の総数が動いた**。` +
    'X4″ が門を消した/増やしたことになる。差分の前にこれを裁け');
}

console.log('\n═══ 差分 ═══');
if (baseBad.length || x4Bad.length) {
  console.log('⛔ **測定失敗。差分を語らない。**(第37条: 走らなかったことを「衝撃なし」と読むな)');
  process.exit(3);
}
const norm = s => s.replace(/^\u2717\s*/, '').split('\n')[0].trim();
const B = new Set(base.fails.map(norm));
const X = new Set(x4.fails.map(norm));
const newly = [...X].filter(n => !B.has(n));
const healed = [...B].filter(n => !X.has(n));
const both = [...X].filter(n => B.has(n));
console.log(`対照群: ${base.passed} passed, ${base.failed} failed, ${base.skipped} skipped (総数 ${base.total})`);
console.log(`試験群: ${x4.passed} passed, ${x4.failed} failed, ${x4.skipped} skipped (総数 ${x4.total})`);
console.log(`\n新しく ✗ になった門: ${newly.length} 本`);
for (const n of newly) console.log('   ✗新 ' + n);
console.log(`✗ から ✓ に戻った門: ${healed.length} 本`);
for (const n of healed) console.log('   ✓治 ' + n);
console.log(`両群で ✗ の門: ${both.length} 本`);
for (const n of both) console.log('   ✗両 ' + n);
// skip の差分も見る(門が黙って skip へ落ちれば、それは ✗ より悪い)
const bs = new Set(base.skips), xs = new Set(x4.skips);
const newSkip = [...xs].filter(s => !bs.has(s));
console.log(`\n新しく skip になった門: ${newSkip.length} 本`);
for (const s of newSkip) console.log('   ·新 ' + s);
console.log('\n生出力: ' + path.join(WORK, 'paradise_base.txt') + ' / paradise_x4pp.txt');
