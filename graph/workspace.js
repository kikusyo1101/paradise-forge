#!/usr/bin/env node
/**
 * PARADISE :: workspace — 創造物の住所を決める唯一の場所 (憲法 第30条)
 *
 * 楽園(engine)と創造物(creation)は寿命が違う。
 *   engine     : 法であり道具。永く保たれ、PRで一行ずつ審査される。
 *   creation   : 試みの証跡。捨てられることが前提で、量は際限なく増える。
 * 同じ倉に混ぜると、engine の履歴が試作のノイズで埋まり、
 * 「これは本物か、テストの残骸か」を誰も判定できなくなる。
 *
 * よって創造物は楽園の外に住む。住所の決定は以下の一本道のみ:
 *   1. 環境変数 PARADISE_CREATIONS
 *   2. 楽園リポジトリの兄弟 <repo>/../paradise-creations
 *   3. (移行期のみ) <repo>/creations が存在すれば legacy として認める
 * 3 は必ず `legacy:true` を伴って返る — 呼び手は警告を出せる。
 *
 * CLI:
 *   node graph/workspace.js root            住所を印字 (無ければ既定の住所)
 *   node graph/workspace.js resolve --json  由来つきで印字
 *   node graph/workspace.js init <slug>     創造物の部屋を作り、その道を印字
 *   node graph/workspace.js check           楽園に紛れ込んだ創造物を検める (exit 1 = 汚染)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const SIBLING_NAME = 'paradise-creations';

/** 既定の住所 — 楽園の兄弟。まだ無くてもこの道を答える。 */
function defaultRoot(repoRoot = REPO_ROOT) {
  return path.resolve(repoRoot, '..', SIBLING_NAME);
}

/**
 * 創造物の根を解決する。
 * @returns {{root:string, source:'env'|'sibling'|'legacy'|'default', legacy:boolean, exists:boolean}}
 */
function resolve(opts = {}) {
  const repoRoot = opts.repoRoot || REPO_ROOT;
  const env = opts.env || process.env;
  const raw = (env.PARADISE_CREATIONS || '').trim();
  if (raw) {
    const root = path.resolve(raw);
    return { root, source: 'env', legacy: false, exists: fs.existsSync(root) };
  }
  const sibling = defaultRoot(repoRoot);
  if (isDir(sibling)) return { root: sibling, source: 'sibling', legacy: false, exists: true };

  const legacy = path.join(repoRoot, 'creations');
  if (isDir(legacy)) return { root: legacy, source: 'legacy', legacy: true, exists: true };

  return { root: sibling, source: 'default', legacy: false, exists: false };
}

function root(opts) { return resolve(opts).root; }

/** 創造物の部屋。作るだけで、中身には一切触れない。 */
function creationDir(slug, opts) {
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error(`slug must be lowercase kebab-case: got ${JSON.stringify(slug)}`);
  }
  return path.join(root(opts), slug);
}

function init(slug, opts) {
  const dir = creationDir(slug, opts);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch { return false; } }

/**
 * 楽園リポジトリに創造物が紛れ込んでいないかを、git の追跡簿で検める。
 * 「ディスクに在るか」ではなく「git が抱えているか」で裁く — 汚染とは履歴に残ることだから。
 * git が使えない環境では空を返す (門は黙る。狼少年より無言がまし — 第21条)。
 * @returns {string[]} 追跡されている creations/ 配下のファイル
 */
function strayCreations(repoRoot = REPO_ROOT) {
  let out;
  try {
    out = execFileSync('git', ['-C', repoRoot, 'ls-files', '--', 'creations'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch { return []; }
  return out.split('\n').map(s => s.trim()).filter(Boolean);
}

/**
 * engine のコードが創造物の住所を直書きしていないかを検める。
 * 直書きは倉を移した瞬間に嘘になる — 住所を知ってよいのはこのファイルだけ。
 * 対象は graph/*.js のみ(文書は道を説明するので除く)。自分自身は除く。
 * @returns {{file:string, line:number, text:string}[]}
 */
/**
 * 旧住所の直書きを咎める規則。
 *
 * ⚠️ **形を見る門が意味を見逃した** (第19条の再発)。
 * 従来は /['"`][^'"`]*creations\// の 1 本しか持たず、**引用符の直後にスラッシュが
 * 続く形しか咎めなかった。** ゆえに path.join 経由で組み立てた旧住所を素通りさせ、
 * census.js:75 と export-state.js:32 の 2 件を抱えたまま門は緑を出し続けた。
 * 実在 8 件に対し 0 件と報告する欠陥を、門が守っているつもりで見逃していた。
 */
const HARDCODE_PATTERNS = [
  { re: /['"`][^'"`]*creations\//, why: "引用符の中の 'creations/'" },
  { re: /path\.(join|resolve)\s*\([^)]*['"`]creations['"`]/, why: "path.join/resolve の引数の 'creations'" },
];

/**
 * 除外リストは**コード内に明示する**。
 * 除外を暗黙にすると、除外したこと自体が見えなくなる — それがこの門の元の病である。
 */
const HARDCODE_EXCLUDE_FILES = new Set([
  'workspace.js',   // 自分自身。住所を知るのが職務である
]);

/**
 * Find hardcoded creation-path references in graph/*.js.
 * @returns {{file:string, line:number, text:string, why:string}[]}
 */
function hardcodedRefs(repoRoot = REPO_ROOT) {
  const dir = path.join(repoRoot, 'graph');
  const out = [];
  let names;
  try { names = fs.readdirSync(dir); } catch { return out; }
  for (const name of names) {
    if (!name.endsWith('.js')) continue;
    if (HARDCODE_EXCLUDE_FILES.has(name)) continue;
    const file = path.join(dir, name);
    let src;
    try { src = fs.readFileSync(file, 'utf8'); } catch { continue; }
    src.split('\n').forEach((line, i) => {
      const t = line.trim();
      // 註釈は道を説明してよい。咎めるのは実際に走るコードの中の住所だけ。
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
      for (const p of HARDCODE_PATTERNS) {
        if (p.re.test(line)) {
          // **必ず名指しする。** 名指ししない門は、赤くなっても直せない。
          out.push({ file: `graph/${name}`, line: i + 1, text: t.slice(0, 100), why: p.why });
          return;
        }
      }
    });
  }
  return out;
}

// --- CLI ---
if (require.main === module) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'root') {
    console.log(root());
  } else if (cmd === 'resolve') {
    const r = resolve();
    if (rest.includes('--json')) console.log(JSON.stringify(r, null, 2));
    else console.log(`${r.root}  (source=${r.source}${r.legacy ? ', LEGACY — 移せ' : ''}, exists=${r.exists})`);
  } else if (cmd === 'init') {
    const r = resolve();
    if (!r.exists && r.source !== 'env') {
      console.error(`創造物の倉が無い: ${r.root}`);
      console.error(`  gh repo clone kikusyo1101/paradise-creations "${r.root}"`);
      console.error(`  もしくは PARADISE_CREATIONS=<path> を与えよ`);
      process.exit(2);
    }
    console.log(init(rest[0]));
  } else if (cmd === 'check') {
    const stray = strayCreations();
    const hard = hardcodedRefs();
    if (stray.length === 0 && hard.length === 0) {
      console.log('✓ 楽園に創造物の混入なし・住所の直書きなし');
      process.exit(0);
    }
    if (stray.length) {
      console.log(`✗ 楽園が創造物を抱えている (${stray.length} 件) — paradise-creations へ移せ`);
      for (const f of stray.slice(0, 20)) console.log('  ' + f);
      if (stray.length > 20) console.log(`  … 他 ${stray.length - 20} 件`);
    }
    if (hard.length) {
      console.log(`✗ 創造物の住所を直書きしている engine ファイル (${hard.length} 件) — workspace.js を通せ`);
      for (const h of hard) console.log(`  ${h.file}:${h.line}  ${h.text}`);
    }
    process.exit(1);
  } else {
    console.log('usage: workspace.js root | resolve [--json] | init <slug> | check');
    process.exit(1);
  }
}

module.exports = { resolve, root, defaultRoot, creationDir, init, strayCreations, hardcodedRefs, REPO_ROOT, SIBLING_NAME };
