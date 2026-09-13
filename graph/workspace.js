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

/**
 * 創造物の倉であることを名乗る目印ファイル。
 *
 * `git remote` が読めない場所(clone されていない写し、git の無い機械)でも
 * 「ここは倉である」と言えるようにする第二の印である。**engine が `init` で置く**。
 */
const VAULT_MARKER = '.paradise-creations';

/** 既定の住所 — 楽園の兄弟。まだ無くてもこの道を答える。 */
function defaultRoot(repoRoot = REPO_ROOT) {
  return path.resolve(repoRoot, '..', SIBLING_NAME);
}

/**
 * 創造物の根を解決する。
 *
 * `vault` は「**そこが在るか**」ではなく「**そこが創造物の倉か**」を言う。
 * 二つを同じ言葉にしていたのが欠陥B の正体であった —— 解決した道がただの
 * 仮ディレクトリでも `exists:true` としか言えず、走行帳の裁きが偽の赤を出した。
 *
 * @returns {{root:string, source:'env'|'sibling'|'legacy'|'default', legacy:boolean, exists:boolean, vault:boolean|null}}
 */
function resolve(opts = {}) {
  const repoRoot = opts.repoRoot || REPO_ROOT;
  const env = opts.env || process.env;
  /**
   * `vault` は `exists` が真のときだけ測る。
   * **`null` は「見に行けなかった」であって「偽」ではない**(第16条 / 第37条 ——
   * `conclave.js runAbandonment` が測れなかった走行を null のまま名指しする先例に倣う)。
   */
  const withVault = (r) => ({ ...r, vault: r.exists ? isCreationsVault(r.root) : null });

  const raw = (env.PARADISE_CREATIONS || '').trim();
  if (raw) {
    const root = path.resolve(raw);
    return withVault({ root, source: 'env', legacy: false, exists: fs.existsSync(root) });
  }
  const sibling = defaultRoot(repoRoot);
  if (isDir(sibling)) return withVault({ root: sibling, source: 'sibling', legacy: false, exists: true });

  const legacy = path.join(repoRoot, 'creations');
  if (isDir(legacy)) return withVault({ root: legacy, source: 'legacy', legacy: true, exists: true });

  return withVault({ root: sibling, source: 'default', legacy: false, exists: false });
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
  /**
   * 倉の根に目印を置く (FR-11)。**読む側だけを作ってはならない** ——
   * 目印を読む印が、一度も置かれないなら、それは第57条が咎める「発火しない門」である。
   * 冪等: 既に在れば触らない。失敗しても部屋作りは成功とする(目印は印 1 の予備である)。
   */
  try {
    const marker = path.join(root(opts), VAULT_MARKER);
    if (!fs.existsSync(marker)) {
      fs.writeFileSync(marker, 'これは楽園(paradise)の創造物が住む倉であることを示す目印である。\n');
    }
  } catch { /* 目印が置けなくとも部屋は作れた。git remote の印 1 が残る */ }
  return dir;
}

function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch { return false; } }

/**
 * そこは**本物の創造物の倉**か (FR-08)。
 *
 * ⚠️ **ディレクトリ名で裁いてはならない**(L-11)。`tests/abandoned-run.test.js` の
 *    砂場は `paradise-creations` という名の仮倉を作る。名で裁けば既存の門が撃つ
 *    仮倉が本物になり、`B-1 [故障注入]` が死ぬ。
 * ⚠️ **`source === 'env'` でも裁いてはならない**(L-10)。40 箇所以上の門が env で
 *    仮倉を立てて `strayRuns()` を**正しく鳴らしている**。
 *    **印は場所そのものに在るべきで、指され方に在ってはならない。**
 *
 * 判定順は**安い印から**(git は 14〜15ms の代を払う):
 *   1. 在らない/ディレクトリでない → false
 *   2. 目印ファイルが在る          → true   (ディスク一発)
 *   3. git remote origin が paradise-creations で終わる → true
 *   4. それ以外                    → false
 *
 * **例外は一つも外へ出さない**(NFR-02)。git が PATH に無ければ `execFileSync` は
 * `ENOENT` を投げる —— `strayCreations()` の作法に倣って握り潰す。
 */
function isCreationsVault(root) {
  if (!root || !isDir(root)) return false;
  try { if (fs.existsSync(path.join(root, VAULT_MARKER))) return true; } catch { /* 読めぬなら次の印へ */ }
  try {
    const url = execFileSync('git', ['-C', root, 'config', '--get', 'remote.origin.url'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return new RegExp(`/${SIBLING_NAME}(\\.git)?$`).test(url.replace(/\\/g, '/'));
  } catch { return false; }
}

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

/**
 * 走行帳 (conclave.json) の住む二つの場所。
 *
 * 第30条は**創造物**の住所を定めた。だが「走行帳」はそれとは別の生き物である ——
 * 創造物の走行帳は創造物と共に倉に住むが、**楽園自身を改める reform の走行帳は
 * 楽園本体の `reform/` に住まねばならない**(第23条の道)。engine を書き換えた
 * 証跡が engine のリポジトリの外に在れば、PR の審査からも CI からも見えない。
 *
 * ここは**住所を数える者**であって、裁く者ではない。裁きは `strayRuns` と
 * `conclave.js audit` が行う —— 住所を知ってよいのはこのファイルだけだからである。
 *
 * @returns {{path:string, where:'paradise'|'creations', slug:string}[]}
 */
function runLedgers(repoRoot = REPO_ROOT, opts = {}) {
  const out = [];
  const scan = (base, where) => {
    let names;
    try { names = fs.readdirSync(base); } catch { return; }
    for (const slug of names.sort()) {
      const p = path.join(base, slug, 'conclave.json');
      if (fs.existsSync(p)) out.push({ path: p, where, slug });
    }
  };
  scan(path.join(repoRoot, 'reform'), 'paradise');
  const r = resolve({ repoRoot, ...opts });
  // 倉が無い環境(CI の checkout など)では創造物側は数えない。
  // 「見に行けなかった」を「一件も無い」と偽らないため、`where` で出所が判る。
  if (r.exists) scan(r.root, 'creations');
  return out;
}

/**
 * reform の走行帳が engine の repo に**居ることを示す**印。
 *
 * 一本の規則では足りない —— `meta.scale` は forge が付ける宣言に過ぎず、
 * 宣言を欠いた古い走行を素通しにする(第19条: 形だけ見る門は意味を見逃す)。
 * ゆえに**宣言・名前・実際に触った物**の三方から見る。一つでも当たれば reform である。
 */
const REFORM_MARKS = [
  { id: 'scale', why: "meta.scale が 'reform' を名乗っている" },
  { id: 'slug', why: "倉での名が 'reform-' で始まる" },
  { id: 'artifact', why: '成果物が楽園 engine (graph/ tests/ overlay/ .github/ CONSTITUTION.md CLAUDE.md) を指している' },
];
/** 成果物の道が楽園 engine を指しているか。倉の外の道は creation ではない。 */
const ENGINE_PATH_RE = /(^|[\\/])(graph|tests|overlay|hooks|\.github|dashboard)[\\/]|(^|[\\/])(CONSTITUTION|CONSTITUTION\.INDEX|CLAUDE|README)\.md$/;

/**
 * reform の走行が **engine を改めたのに、走行帳だけ創造物の倉に居る** のを検める。
 *
 * `strayCreations()` の**逆向き**である。あちらは「創造物が楽園に紛れ込む」を見た。
 * こちらは「楽園を改めた証跡が楽園の外へ流れ出る」を見る。害はあちらより重い ——
 * 混入は履歴を汚すだけだが、**流出は審査そのものを迂回する**。engine を書き換えた
 * 走行帳が PR に載らなければ、環が閉じたかを誰も PR の上で確かめられない。
 *
 * 倉が無ければ空を返す(門は黙る。狼少年より無言がまし — 第21条)。
 * @returns {{path:string, slug:string, marks:string[], why:string, ratified:number|null, total:number|null}[]}
 */
function strayRuns(repoRoot = REPO_ROOT, opts = {}) {
  const out = [];
  for (const led of runLedgers(repoRoot, opts)) {
    if (led.where !== 'creations') continue;
    let run;
    try { run = JSON.parse(fs.readFileSync(led.path, 'utf8')); } catch { continue; }
    const marks = [];
    if (run && run.meta && String(run.meta.scale) === 'reform') marks.push('scale');
    if (/^reform[-_]/i.test(led.slug)) marks.push('slug');
    const arts = [];
    for (const d of (run.domains || [])) for (const p of (d.phases || [])) if (p.artifactPath) arts.push(String(p.artifactPath));
    // 倉の中を指す道は creation の成果物である。engine を指す道だけを咎める。
    const hits = arts.filter(a => !a.includes(SIBLING_NAME) && ENGINE_PATH_RE.test(a));
    if (hits.length) marks.push('artifact');
    if (!marks.length) continue;
    const ds = run.domains || [];
    out.push({
      path: led.path, slug: led.slug, marks,
      why: REFORM_MARKS.filter(m => marks.includes(m.id)).map(m => m.why).join(' / '),
      ratified: ds.length ? ds.filter(d => d.status === 'ratified').length : null,
      total: ds.length || null,
      engineArtifacts: hits.slice(0, 5),
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
  } else if (cmd === 'runs') {
    // 走行帳の住所を印字するだけの口。数えられるものは名指しできる(第22条)。
    for (const l of runLedgers()) console.log(`${l.where.padEnd(10)} ${l.slug.padEnd(28)} ${l.path}`);
  } else if (cmd === 'check') {
    const r = resolve();
    const stray = strayCreations();
    const hard = hardcodedRefs();
    /**
     * **走行帳の裁きだけが条件付きになる** (FR-09 / 第37条)。
     *
     * 欠陥B: `PARADISE_CREATIONS` が仮倉に残っていると、創造物の倉ですらない場所を
     * 裁いて偽の赤 (EXIT=1) を出していた。だが「env なら黙る」は誤った治療である ——
     * 40 箇所以上の門が env で仮倉を立てて `strayRuns()` を**正しく鳴らしている**。
     * 裁きの分岐は **指され方**ではなく **その場所が創造物の倉か** でなければならない。
     *
     * そして **skip は exit に影響しない**。検められなかったことは失敗ではない ——
     * **黙ることが失敗である**。第37条は「絶対に緑にするな」とは言っていない。
     * 「**見なかったことを見たことにするな**」と言っている。
     */
    const judgeRuns = r.vault === true;
    const runs = judgeRuns ? strayRuns() : [];
    if (!judgeRuns) {
      // 記号は ✓ でも ✗ でもない。第三の記号で、緑を騙らず赤も騙らない。
      // **場所を必ず名指しする** — 名指ししない門は、読んだ人が原因を追えない(第21条)。
      if (r.vault === null) {
        console.log(`· 走行帳の流出は検めなかった — 創造物の倉が存在しない: ${r.root}  (source=${r.source})`);
      } else {
        console.log(`· 走行帳の流出は検めなかった — ${r.root} は創造物の倉ではない`);
        console.log(`  (目印 ${VAULT_MARKER} も git remote ${SIBLING_NAME} も無い / source=${r.source})`);
      }
    }
    if (stray.length === 0 && hard.length === 0 && runs.length === 0) {
      console.log('✓ 楽園に創造物の混入なし・住所の直書きなし' +
        (judgeRuns ? '・reform 走行帳の流出なし' : ' (走行帳の流出は上記のとおり未検査)'));
      process.exit(0);
    }
    if (runs.length) {
      console.log(`✗ reform の走行帳が創造物の倉に居る (${runs.length} 件) — 楽園の reform/<slug>/ へ移せ`);
      for (const r of runs) {
        console.log(`  ${r.path}  [${r.marks.join(',')}]  domains ${r.ratified}/${r.total}`);
        console.log(`     ${r.why}`);
      }
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
    console.log('usage: workspace.js root | resolve [--json] | init <slug> | runs | check');
    process.exit(1);
  }
}

module.exports = { resolve, root, defaultRoot, creationDir, init, strayCreations, hardcodedRefs,
  runLedgers, strayRuns, isCreationsVault, REFORM_MARKS, ENGINE_PATH_RE, REPO_ROOT, SIBLING_NAME,
  VAULT_MARKER };
