#!/usr/bin/env node
'use strict';
/**
 * wiring.js — 楽園の結線を測る (憲法 第44条の一般化 / 第48条)
 *
 * 神が問うた:「オーケストレーションの相関図、関連図を作成し連携してほしい」。
 *
 * 楽園には engine が並んでいるが、**どれが誰を呼び、誰に呼ばれているか**を
 * 語る者が居なかった。位階(clergy)・道(forge)・環(conclave)には engine が
 * 在るのに、engine そのものの関係だけが散文の記憶に頼っていた。
 * 散文の記憶は腐る — 第44条が tools/ で証明した通りである。
 *
 * ゆえにこの engine は結線を **実測** する。二種類の辺がある:
 *
 *   内の辺 (requires)  engine が engine を require する。機構どうしの結合。
 *   外の辺 (callers)   engine の名を呼ぶ「面」。門(CI)・命令・神官・掟・
 *                      試験・器物・散文の、どれが呼ぶか。
 *
 * どちらも持たない engine は **孤児** である。孤児は無害ではない —
 * 教主がそれを先例と読む (第44条)。ゆえに門が数える。
 *
 *   node graph/wiring.js               結線の一覧
 *   node graph/wiring.js map --json    機械可読 (atlas が図にする)
 *   node graph/wiring.js check         孤児と宙吊りの参照を裁く (exit 1 = 赤)
 *
 * ⚠️ この engine は事実を持たない。事実はディスクに在る — 走査して数える。
 *    engine の一覧を写経すれば、次に生まれた engine が黙って図から消える。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GRAPH = __dirname;

/**
 * engine の名を呼びうる「面」。ここに無いディレクトリは呼び手として数えない。
 * 順序は図の見た目の順序でもある(門が上、散文が下)。
 */
const SURFACES = [
  { id: 'ci',      ja: '門(CI)',   dir: '.github/workflows' },
  { id: 'command', ja: '命令',     dir: 'overlay/commands' },
  { id: 'agent',   ja: '神官',     dir: 'overlay/agents' },
  { id: 'rule',    ja: '掟',       dir: 'overlay/rules' },
  { id: 'test',    ja: '試験',     dir: 'tests' },
  { id: 'tool',    ja: '器物',     dir: 'tools' },
  { id: 'doc',     ja: '散文',     files: ['CLAUDE.md', 'README.md', 'CONSTITUTION.md', 'NOTICE.md'] },
  /**
   * engine が engine の名を**散文で**呼ぶ形も、呼び手である。
   *
   * 実測: build-identity-catalog.js は graph/identity/catalog.json を作る
   * 現役の engine だが、それを呼ぶのは derived.js の生成物台帳(「この写しは
   * この命令で作り直す」)だけだった。require ではないので内の辺にも現れない。
   * ここを数えなければ、門は「台帳に載っている生きた engine」を孤児と誤審する。
   * 台帳に名が載ることは、立派に「呼ばれている」ことである。
   */
  { id: 'engine',  ja: '機構',     dir: 'graph' },
];

/**
 * 宙吊りの参照(存在しない engine を指す名)を裁くとき、試験は除く。
 * 試験は「壊して鳴るか」を確かめるために、わざと在りえない名を書く
 * (実測: paradise.test.js は架空の engine を一時ディレクトリに作って門を試す)。
 * 門が試験の作り物に鳴けば、門を試すことが不可能になる。
 */
const DANGLING_EXEMPT = new Set(['test']);

const listEngines = () => fs.readdirSync(GRAPH)
  .filter(f => f.endsWith('.js'))
  .map(f => f.slice(0, -3))
  .sort();

const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };

function filesUnder(dir, depth = 0) {
  const out = [];
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (depth < 4) out.push(...filesUnder(p, depth + 1)); }
    else if (/\.(js|md|json|ya?ml|py|sh)$/.test(e.name)) out.push(p);
  }
  return out;
}

/**
 * 文中で名指しされた engine。
 *
 * 素朴に斜線つきの綴りだけを探すと **呼んでいるのに孤児と報告する**。
 * 実測: tools/paradise-catchup.py は 30分ごとに daily-guard を起動する現役の
 * 器物だが、その呼び方は `os.path.join(PARADISE, "graph", "daily-guard.js")`
 * であり、斜線が一つも現れない。門が呼び方の**綴り**しか見なければ、
 * 生きた engine に死亡宣告を下す — 孤児を見逃すより悪い誤審である。
 * ゆえに path 結合の形も同じ「呼んだ」と数える。
 */
const NAME_RES = [
  /graph[/\\]([\w.-]+)\.js/g,                                 // 斜線つきの綴り(両向き)
  /['"]graph['"]\s*,\s*['"]([\w.-]+)\.js['"]/g,               // path 結合の形
];
const namesIn = (text) => {
  const out = new Set();
  for (const re of NAME_RES) for (const m of text.matchAll(re)) out.add(m[1]);
  return out;
};

/** engine どうしの require。相対 require だけが本物の結合である。 */
function requiresOf(engine) {
  const src = read(path.join(GRAPH, engine + '.js'));
  return [...new Set([...src.matchAll(/require\(['"]\.\/([\w.-]+)\.js['"]\)/g)].map(m => m[1]))]
    .filter(n => n !== engine).sort();
}

/**
 * 結線の全体像を測る。
 * 返す形は atlas がそのまま図にできること — 図の側で数え直させない。
 */
function map() {
  const engines = listEngines();
  const known = new Set(engines);
  const requires = {}, requiredBy = {};
  for (const e of engines) { requires[e] = []; requiredBy[e] = []; }
  for (const e of engines) {
    for (const d of requiresOf(e)) {
      if (!known.has(d)) continue;                  // 宙吊りは下で別に裁く
      requires[e].push(d);
      requiredBy[d].push(e);
    }
  }

  const callers = {}, dangling = [];
  for (const e of engines) callers[e] = [];
  for (const s of SURFACES) {
    const files = s.dir ? filesUnder(path.join(ROOT, s.dir))
                        : s.files.map(f => path.join(ROOT, f));
    for (const f of files) {
      /**
       * **自分で自分の名を呼んでも、呼ばれたことにはならない。**
       * どの engine も冒頭の使い方の註に `node graph/<自分>.js …` と書く。
       * 素朴に数えれば全員が自分を呼び手に数え、孤児は永久にゼロになる —
       * 門が常に緑を出すなら、それは門ではない (第21条)。
       */
      const self = s.id === 'engine' ? path.basename(f).replace(/\.js$/, '') : null;
      for (const n of namesIn(read(f))) {
        if (n === self) continue;
        if (known.has(n)) { if (!callers[n].includes(s.id)) callers[n].push(s.id); }
        else if (!DANGLING_EXEMPT.has(s.id)) {
          dangling.push({ name: n, surface: s.id, file: path.relative(ROOT, f).split(path.sep).join('/') });
        }
      }
    }
  }

  const nodes = engines.map(e => ({
    id: e,
    requires: requires[e],
    requiredBy: requiredBy[e],
    callers: callers[e],
    // 孤児 = 機構からも面からも名を呼ばれない。走らせる者が誰も居ない。
    orphan: requiredBy[e].length === 0 && callers[e].length === 0,
    // 根 = 誰も require しないが、面が直に呼ぶ。楽園の入口である。
    entry: requires[e].length === 0 || callers[e].length > 0,
  }));

  const edges = [];
  for (const e of engines) for (const d of requires[e]) edges.push({ from: e, to: d });

  return { engines: nodes, edges, surfaces: SURFACES, dangling };
}

/**
 * 門。二つの病を裁く:
 *   孤児   — 誰も呼ばない engine が住み続けている (第44条)
 *   宙吊り — 存在しない engine の名を、門や命令や散文が呼んでいる (第21条)
 */
function check() {
  const m = map();
  const orphans = m.engines.filter(e => e.orphan).map(e => e.id);
  return {
    ok: orphans.length === 0 && m.dangling.length === 0,
    orphans, dangling: m.dangling, map: m,
  };
}

// ── CLI ───────────────────────────────────────────────────────────────
function main() {
  const cmd = process.argv[2] || 'map';
  const json = process.argv.includes('--json');

  if (cmd === 'map') {
    const m = map();
    if (json) { console.log(JSON.stringify(m, null, 2)); return; }
    console.log('═══ 🔗 WIRING — 楽園の結線 ═══');
    const ja = Object.fromEntries(SURFACES.map(s => [s.id, s.ja]));
    for (const e of m.engines) {
      const tag = e.orphan ? ' 🔴孤児' : '';
      console.log(`  ${e.id.padEnd(24)} ←require ${String(e.requiredBy.length).padStart(2)}  →require ${String(e.requires.length).padStart(2)}  呼ぶ面: ${e.callers.map(c => ja[c]).join('/') || '—'}${tag}`);
    }
    console.log(`────────────────────────────────`);
    console.log(`  engine ${m.engines.length} / 内の辺 ${m.edges.length} / 孤児 ${m.engines.filter(e => e.orphan).length}`);
    return;
  }

  if (cmd === 'check') {
    const r = check();
    if (json) { console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1); }
    console.log('═══ 🔗 WIRING GATE (第44条 / 第48条) ═══');
    console.log(`  engine ${r.map.engines.length} / 内の辺 ${r.map.edges.length}`);
    if (r.orphans.length) {
      console.log(`  🔴 孤児 ${r.orphans.length}: ${r.orphans.join(', ')}`);
      console.log('      誰も require せず、門も命令も試験も散文もその名を呼ばない。');
      console.log('      生きているなら呼ぶ者を作り、死んでいるなら退治せよ (第44条)。');
    }
    for (const d of r.dangling) {
      console.log(`  🔴 宙吊り: ${d.file} が graph/${d.name}.js を呼ぶが、その engine は存在しない (第21条)`);
    }
    console.log(r.ok ? '  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い' : '  🔴 結線が破れている');
    process.exit(r.ok ? 0 : 1);
  }

  console.error('commands: map [--json] | check [--json]');
  process.exit(2);
}
if (require.main === module) main();
module.exports = { SURFACES, listEngines, requiresOf, map, check };
