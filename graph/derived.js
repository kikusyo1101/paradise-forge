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
  return {
    ok: findings.length === 0 && undeclared.length === 0,
    findings, undeclared,
    note: findings.length
      ? `${findings.length} test(s) assert on the CONTENT of a derived file — they break where the source does not exist`
      : (undeclared.length ? `${undeclared.length} derived file(s) not declared` : 'no test depends on derived content'),
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
    if (res.ok) console.log('  ✓ no test asserts on derived content');
    for (const f of res.findings) {
      console.log(`  🔴 ${f.file}:${f.line} asserts on ${f.derived}`);
      console.log(`       ${f.code}`);
      console.log(`       → ${DERIVED[f.derived].note}`);
    }
    for (const u of res.undeclared) console.log(`  ⚠️  undeclared derived file: ${u}`);
    console.log('─────────────────────────────────────');
    console.log(res.note);
    console.log('═════════════════════════════════════');
    process.exit(res.ok ? 0 : 1);
  }
  console.error('usage: derived.js [list|check|drift]');
  process.exit(2);
}

module.exports = { DERIVED, isDerived, offendingAssertions, check, drift };
