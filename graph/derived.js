#!/usr/bin/env node
'use strict';
/**
 * derived.js — 生成物と原本を区別する (憲法 第29条)
 *
 * 執行官(CI)が REWORK を出した。ローカルは172全緑なのにCIで1件落ちる。
 * 原因は「生成物の中身」を前提にした検査だった。
 *
 * `graph/lessons.json` は KG から生成される。CIにKGは無く、裁定ジョブは冒頭で
 * `lessons.js export` を走らせるので、**リポジトリに入っている31件が0件に
 * なる**。実測: clone直後31件 → CI再生成後0件、1682行が消える。
 *
 * これは lessons.json 固有の事故ではなく、**構造的な罠**である。楽園には
 * 生成物が3つ git 追跡下にあり、どれも同じ性質を持つ:
 *   - リポジトリの中身と、実行環境で再生成した中身が食い違いうる
 *   - 並行PRで必ず衝突する（手で解決してはならない。再生成が正しい）
 *   - その中身を前提にした検査は、生成元が無い環境で落ちる
 *
 * ゆえに生成物は **宣言され、区別され、中身を前提にされない** ことを門が守る。
 *
 *   node graph/derived.js list      # 生成物とその生成元
 *   node graph/derived.js check     # 生成物への依存を検める（違反で exit 1）
 *   node graph/derived.js drift     # 再生成すると変わるか（環境差の可視化）
 *
 * 「生成物は真実の写しであって、真実そのものではない。」
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

/**
 * リポジトリ内の住処に住む settings.json の道。**住所を作るのは abode.js だけ**(第58条(a))。
 *
 * `PARADISE_ABODE: 'repo'` を**明示して**引く。既定 mode に依らず同じ道を返すのが要点で、
 * この派生物は「神のマシンの資産」ではなく「**この倉の追跡下のファイル**」だからである。
 * 個別 env(`PARADISE_SETTINGS` など)も渡さない —— 倉の中の一点を指す道は、
 * 環境で揺れてはならない。
 */
const REPO_SETTINGS_KEY = '.claude/settings.json';
const repoSettingsPath = () =>
  require('./abode.js').pathFor('settings', { env: { PARADISE_ABODE: 'repo' } });

/**
 * 楽園の生成物。**engine が書き、人が書かないもの。**
 * `from` は生成元、`by` は生成する命令、`needs` は生成元が要求する環境。
 */
const DERIVED = {
  'CONSTITUTION.INDEX.md': {
    from: 'CONSTITUTION.md',
    by: 'node graph/codex.js index --write',
    needs: null,
    note: '憲法の索引 (第33条)。条が増減・改稿されるたび変わる。並行PRでは必ず衝突するが手で解決してはならない — 再生成が正しい。中身(条数・題・バイト数)を前提にした検査を書かない',
  },
  'graph/lessons.json': {
    from: 'knowledge graph (PARADISE_KG)',
    by: 'node graph/lessons.js export --out graph/lessons.json',
    needs: 'KG',
    note: 'CIにKGは無いため空になる。件数や中身を前提にした検査を書いてはならない',
  },
  'dashboard/state.json': {
    from: 'knowledge graph + creations + lessons',
    by: 'node graph/export-state.js',
    needs: 'KG',
    note: 'ダッシュボード用の写し。並行PRで必ず衝突するので手で解決せず再生成する',
  },
  'dashboard/state.js': {
    from: 'dashboard/state.json',
    by: 'node graph/export-state.js',
    needs: 'KG',
    note: 'file:// で読むための同内容の写し',
  },
  'graph/identity/catalog.json': {
    from: 'VoltAgent/awesome-design-md (MIT) の DESIGN.md 群',
    by: 'node graph/build-identity-catalog.js <srcDir>',
    needs: '上流の DESIGN.md 群 (取り込み時のみ)',
    note: '視覚語彙の索引。第20条により実行時に取りに行かず同梱するので、'
        + '生成元は普段この機械に無い — 件数や中身を前提にした検査を書かない。'
        + '結線の門(第44条)がこの engine を孤児と裁いたことで、生成物であるのに'
        + '**どこにも宣言が無かった**ことが露見した (第29条)',
  },
  /**
   * `<repo>/.claude/settings.json` — **リポジトリ内の住処の掟と座**(第58条 / AC-14)。
   *
   * ⚠️ **第29条との整合。ここは実装で踏み抜きやすい**(design §6.2 が名指しで警告している)。
   *
   * 第29条は「生成物の**中身**を前提にした検査を書くな」と命じる。だが AC-15 は
   * まさに中身を検めることを要求する —— 矛盾ではない。**第29条が禁じているのは
   * 「生成元が無い環境で落ちる検査」**であって「中身を見ること」そのものではない。
   * `graph/lessons.json` が罠だったのは生成元(KG)が CI に無いからであり、
   * `dashboard/state.json` も同じ理由である。ゆえに両者は `needs: 'KG'` を持つ。
   *
   * この派生物の生成元は `apply-guards.POLICY` と `clergy.RANKS.pontiff` ——
   * **どちらも engine の中の定数であり、楽園が clone された全ての環境に必ず在る。**
   * 依存する外部環境はゼロである。ゆえに `needs: null` で登録し、中身を検める
   * (`verifyRepoSettings()`)。生成元が常に在る派生物の中身を検めることは、
   * 第29条が守ろうとした「生成元が無い環境で落ちる」形に**構造的に成り得ない**。
   *
   * **なぜ git 追跡するのか**: clone 直後から存在しなければ、住処を向け直す
   * guards の門は CI で必ず skip に落ちる。skip し続ける門は門ではない(第37条)。
   */
  [REPO_SETTINGS_KEY]: {
    from: 'apply-guards.POLICY (掟) + clergy.RANKS.pontiff (教主の座)',
    by: 'PARADISE_ABODE=repo node graph/deploy.js --write   (単体なら apply-guards.js apply + apply-seat.js apply)',
    needs: null,
    note: 'リポジトリ内の住処の設定。生成元は engine の定数なので**どの環境にも必ず在る** — '
        + 'ゆえに第29条の罠(生成元が無い環境で落ちる検査)に構造的に成り得ず、中身を検めてよい。'
        + '並行PRでは衝突しうるが手で解決してはならない — 再生成が正しい。'
        + '手で編集すれば門が消えた行を名指して鳴る (AC-15)',
  },
};

const isDerived = (p) => Object.keys(DERIVED).some(d => p.replace(/\\/g, '/').endsWith(d));

/**
 * 生成物の**中身**を前提にした検査を探す。
 *
 * 「読むこと」自体は罪ではない — 中身が在ることを前提に**数や存在を主張する**のが罪である。
 * ゆえに単なる require ではなく、その近傍で長さ・件数を assert しているかを見る。
 */
function offendingAssertions(testFile) {
  let src;
  try { src = fs.readFileSync(testFile, 'utf8'); } catch { return []; }
  const lines = src.split('\n');
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── **リポジトリの生成物**を指す参照だけを見る ──────────────────
    // 一時ディレクトリに自作した同名ファイル(fixture)は生成物ではない。
    // それを咎めれば門は狼少年になり、狼少年の門は無い門より悪い(第21条)。
    // 実際、素朴な照合は3件を挙げ、その3件とも誤検出だった。
    // 門自身の回帰テストは、違反コードを**文字列として**持つ。それを咎めれば
    // 「門を試すテスト」が永久に赤になる — 狼少年の別形である(第21条)。
    // 行全体が引用符で包まれた疑似コードなら、実行される参照ではない。
    const trimmed = line.trim();
    const isQuotedLiteral = /^["'`].*["'`],?$/.test(trimmed) || /^\s*["']\s*(assert|const|test)\b/.test(trimmed);
    if (isQuotedLiteral) continue;

    const looksRepoDerived = /require\(['"]\.\.\/graph\/lessons\.json|['"]\.\.['"],\s*['"]graph['"],\s*['"]lessons\.json|dashboard\/state\.js(on)?/.test(line);
    if (!looksRepoDerived) continue;
    const hit = Object.keys(DERIVED).find(d => line.includes(path.basename(d))) || 'graph/lessons.json';

    // その参照が入る変数名を拾う（const lessons = require(...) の "lessons"）
    const varMatch = line.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/);
    const varName = varMatch ? varMatch[1] : null;

    for (let j = i; j < Math.min(i + 25, lines.length); j++) {
      if (j > i && /^\s*test\(/.test(lines[j])) break;
      const l = lines[j];
      // 否定形（「〜が無いこと」）は空集合でも真になるので、生成物が空でも壊れない。
      if (/assert\.ok\(\s*!/.test(l)) continue;
      // 「1件以上ある」を前提にする形だけを咎める。
      const assertsPresence = /assert\.ok\([^)]*\.some\(|assert\.ok\([^)]*\.length\s*[>>=]|assert\.ok\([^)]*\.length\s*\)/.test(l);
      if (!assertsPresence) continue;
      // その主張が、生成物を入れた変数に対するものか（無関係な配列を咎めない）
      if (varName && !new RegExp('\\b' + varName + '\\b').test(l)) continue;
      found.push({ file: path.relative(ROOT, testFile), line: j + 1, derived: hit, code: l.trim().slice(0, 100) });
    }
  }
  return found;
}

/**
 * `<repo>/.claude/settings.json` が生成元の写しであることを検める(AC-14 / AC-15)。
 *
 * 検めるのは**この engine が生成元だと宣言した二点だけ**である:
 *   - `permissions`      ← `apply-guards.POLICY`
 *   - `model` / `effortLevel` ← `clergy.RANKS.pontiff`
 * hooks・env・theme その他は楽園の管轄外であり、写しでもないので見ない
 * (`apply-guards.buildDesired` が「知らない設定を黙って消さない」のと同じ理屈)。
 *
 * **不在の扱い**(第37条 / 第58条(e)): この派生物は git 追跡されるので、
 * 追跡下に在るのに実体が無ければ **赤**である。まだ追跡されていない環境
 * (この派生物を足す前のブランチ、tarball 展開など)では追跡の有無で分ける ——
 * 「まだ無い」と「消された」を同じ色で塗れば、どちらも直せない。
 *
 * @returns {{ok:boolean, file:string, tracked:boolean, exists:boolean,
 *            findings:{key:string, why:string, fix:string}[], note:string}}
 */
function verifyRepoSettings(opts = {}) {
  const file = opts.file || repoSettingsPath();
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const findings = [];
  const fixGuards = 'node graph/apply-guards.js apply';
  const fixSeat = 'node graph/apply-seat.js apply';

  let tracked = false;
  try {
    tracked = execFileSync('git', ['ls-files', '--error-unmatch', '--', rel],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().length > 0;
  } catch { tracked = false; }

  const exists = fs.existsSync(file);
  if (!exists) {
    if (!tracked) {
      return { ok: true, file: rel, tracked, exists, findings,
               note: `${rel} はまだ追跡されていない — この派生物を足す前の作業木である` };
    }
    findings.push({ key: '(file)', why: `${rel} は git 追跡された派生物なのに実体が無い`,
                    fix: 'PARADISE_ABODE=repo node graph/deploy.js --write' });
    return { ok: false, file: rel, tracked, exists, findings, note: '派生物の欠損' };
  }

  let cur;
  try { cur = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) {
    findings.push({ key: '(json)', why: `${rel} が JSON として読めない: ${e.message}`,
                    fix: 'PARADISE_ABODE=repo node graph/deploy.js --write' });
    return { ok: false, file: rel, tracked, exists, findings, note: 'JSON が壊れている' };
  }

  // ── permissions ← apply-guards.policyFor({mode:'repo'}) ──────────────
  // **揃は repo に固定する**(裁可 5-A / AC-53)。`<repo>/.claude/settings.json` は
  // 定義上 repo の住処の派生物であり、走らせた側の env で「あるべき姿」が変わる道理は無い。
  // 既定の `POLICY` を引けば `PARADISE_ABODE=global` で走らせた者には
  // repo 専用の deny 一本 (Edit(**/.claude/**)) が「掟に無い行」と見え、
  // 同じ作業木が env 次第で赤くも緑にもなる —— EX-1 の照合を global に固定したのと同じ形。
  const POLICY = require('./apply-guards.js').policyFor({ mode: 'repo' });
  const perms = (cur && typeof cur.permissions === 'object' && cur.permissions) || {};
  for (const key of ['deny', 'ask', 'allow']) {
    const want = POLICY[key], got = Array.isArray(perms[key]) ? perms[key] : [];
    // **消えた文字列を名指す。** 「件数が違う」だけの診断は、赤くなっても直せない。
    for (const v of want) {
      if (!got.includes(v)) {
        findings.push({ key: `permissions.${key}`, why: `${v} が写しから消えている`, fix: fixGuards });
      }
    }
    for (const v of got) {
      if (!want.includes(v)) {
        findings.push({ key: `permissions.${key}`, why: `${v} は掟に無い — 手で足された行である`, fix: fixGuards });
      }
    }
  }
  if (perms.defaultMode !== POLICY.defaultMode) {
    findings.push({ key: 'permissions.defaultMode',
                    why: `${JSON.stringify(perms.defaultMode)} ⇒ ${JSON.stringify(POLICY.defaultMode)}`, fix: fixGuards });
  }

  // ── model / effortLevel ← clergy.RANKS.pontiff ───────────────────────
  const pontiff = require('./clergy.js').RANKS.pontiff;
  if (cur.model !== pontiff.model) {
    findings.push({ key: 'model', why: `${JSON.stringify(cur.model ?? null)} ⇒ ${JSON.stringify(pontiff.model)} (教主の座)`, fix: fixSeat });
  }
  if (cur.effortLevel !== pontiff.effort) {
    findings.push({ key: 'effortLevel', why: `${JSON.stringify(cur.effortLevel ?? null)} ⇒ ${JSON.stringify(pontiff.effort)} (教主の座)`, fix: fixSeat });
  }

  return { ok: findings.length === 0, file: rel, tracked, exists, findings,
           note: findings.length ? `${findings.length} 件、派生物が生成元と食い違う`
                                 : `${rel} は生成元の写しである (permissions / model / effortLevel)` };
}

function check(opts = {}) {
  const testsDir = path.join(ROOT, 'tests');
  let files = [];
  try { files = fs.readdirSync(testsDir).filter(f => f.endsWith('.js')).map(f => path.join(testsDir, f)); } catch {}
  const findings = [];
  for (const f of files) findings.push(...offendingAssertions(f));

  // 生成物が .gitignore されているかは方針の問題なので裁かない。
  // ただし「宣言されていない生成物」は見逃す — engine が writeFileSync する
  // 追跡下のファイルを拾い、宣言漏れを知らせる。
  const undeclared = [];
  if (opts.scanUndeclared !== false) {
    let tracked = [];
    try {
      tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
    } catch {}
    for (const t of tracked) {
      if (isDerived(t)) continue;
      // engine が名指しで書き出すファイルだけを候補にする
      if (!/\.(json|js)$/.test(t)) continue;
      const base = path.basename(t);
      if (!['state.json', 'state.js', 'lessons.json'].includes(base)) continue;
      undeclared.push(t);
    }
  }
  /**
   * リポジトリ内の住処の settings.json は、生成元が**engine の定数**なので
   * 中身を検めてよい唯一の派生物である(上の DERIVED 宣言の註釈を見よ)。
   */
  const repoSettings = opts.repoSettings === false ? null : verifyRepoSettings(opts.settingsOpts);

  return {
    ok: findings.length === 0 && undeclared.length === 0 && (!repoSettings || repoSettings.ok),
    findings, undeclared, repoSettings,
    note: findings.length
      ? `${findings.length} test(s) assert on the CONTENT of a derived file — they break where the source does not exist`
      : (undeclared.length ? `${undeclared.length} derived file(s) not declared`
      : (repoSettings && !repoSettings.ok ? repoSettings.note : 'no test depends on derived content')),
  };
}

/** 再生成したら変わるか。環境差を数で見せる（判定はしない、可視化する）。 */
function drift() {
  const rows = [];
  for (const [file, spec] of Object.entries(DERIVED)) {
    const p = path.join(ROOT, file);
    let size = null, exists = false;
    try { const st = fs.statSync(p); exists = true; size = st.size; } catch {}
    rows.push({ file, exists, size, from: spec.from, needs: spec.needs });
  }
  return rows;
}

if (require.main === module) {
  const cmd = process.argv[2] || 'check';
  if (cmd === 'list') {
    console.log('═══════ 📄 DERIVED ARTIFACTS ═══════');
    for (const [f, s] of Object.entries(DERIVED)) {
      console.log(`  ${f}`);
      console.log(`     from : ${s.from}   (needs ${s.needs})`);
      console.log(`     by   : ${s.by}`);
      console.log(`     note : ${s.note}`);
    }
    console.log('════════════════════════════════════');
    process.exit(0);
  }
  if (cmd === 'drift') {
    console.log('═══════ 📄 DERIVED STATE ═══════');
    for (const r of drift()) {
      console.log(`  ${r.exists ? '✓' : '🔴'} ${r.file.padEnd(24)} ${r.exists ? r.size + 'b' : 'absent'}  ← ${r.from}`);
    }
    console.log('════════════════════════════════');
    process.exit(0);
  }
  if (cmd === 'check') {
    const res = check();
    console.log('═══════ 📄 DERIVED DEPENDENCY ═══════');
    if (!res.findings.length) console.log('  ✓ no test asserts on derived content');
    for (const f of res.findings) {
      console.log(`  🔴 ${f.file}:${f.line} asserts on ${f.derived}`);
      console.log(`       ${f.code}`);
      console.log(`       → ${DERIVED[f.derived].note}`);
    }
    for (const u of res.undeclared) console.log(`  ⚠️  undeclared derived file: ${u}`);
    // 生成元が engine の定数である派生物だけは、中身まで検める (第29条 / AC-14)
    const rs = res.repoSettings;
    if (rs) {
      console.log('─────────────────────────────────────');
      console.log(`  住処の派生物: ${rs.file}  (git 追跡 ${rs.tracked ? 'あり' : 'なし'} / 実体 ${rs.exists ? 'あり' : 'なし'})`);
      if (rs.ok) console.log(`  ✓ ${rs.note}`);
      for (const f of rs.findings) {
        console.log(`  🔴 ${f.key}: ${f.why}`);
        console.log(`       → ${f.fix}`);
      }
    }
    console.log('─────────────────────────────────────');
    console.log(res.note);
    console.log('═════════════════════════════════════');
    // process.exit() は POSIX で stdout の掃き出しを待たない — CI だけが出力を失う
    process.exitCode = res.ok ? 0 : 1;
  } else {
    console.error('usage: derived.js [list|check|drift]');
    process.exitCode = 2;
  }
}

module.exports = { DERIVED, isDerived, offendingAssertions, check, drift,
                   verifyRepoSettings, repoSettingsPath, REPO_SETTINGS_KEY };
