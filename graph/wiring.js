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

// ══════════════════════════════════════════════════════════════════════
// 門の孤児 — 建てられた門が誰にも呼ばれていない (第44条)
//
// 上の孤児は **engine** の孤児である。だが実測されたのは、もっと痛い形だった:
//
//   $ for f in tests/*.test.js; do grep -q "node tests/$f" .github/workflows/*.yml || echo 孤児; done
//   孤児: abandoned-run.test.js   (20 門 / 緑)
//   孤児: counsel.test.js         (49 passed **2 failed** — 赤いまま誰も知らなかった)
//   孤児: guards.test.js          (75 門 / 緑)
//
// `guards.test.js` は **第57条が「これを強制する門」として名指しした試験**である。
// 憲法が名指しした門が、CI から一度も撃たれていなかった。
//
// engine の孤児と病は同じだが、**見える場所が違う**。engine は `require` や散文に
// 名が出れば「呼ばれている」と数えてよい。だが試験は違う —— 試験は**走らされて
// 初めて門である**。散文が名を語っても、CI が走らせなければ何も守らない。
// ゆえに呼び手として数えるのは **実際に走らせる二つの口**だけに絞る:
//
//   門(CI)              .github/workflows/*.yml が `node tests/<名>` を撃つ
//   統べる試験          tests/paradise.test.js がその試験を子として起こす
//
// **この門自身も CI から呼ばれる**(`wiring.js check` は tribunal.yml に結線済み)。
// 見張りを見張る者が居なければ、同じ穴である。
// ══════════════════════════════════════════════════════════════════════

/** 門を探す場所。ここに `*.test.js` を置けば、翌PRから自動で検められる。 */
const GATES_DIR = 'tests';

/**
 * **門ではない支援ファイル。黙って除外しない —— 口で名乗る (第54条(c))。**
 *
 * 先例は `workspace.js` の `HARDCODE_EXCLUDE_FILES` である。免除は例外であり、
 * 例外は記録されて初めて例外である。ここに名を足すときは `why` を必ず書け ——
 * 理由の書けない除外は、除外ではなく**見逃し**である。
 *
 * ⚠️ 判定は `*.test.js` という綴りで閉じてある。支援ファイルが `.test.js` で
 *    終わらない限りここに名を足す必要は無い。**「走らせると遅いから」「今は
 *    赤いから」は除外の理由にならない** —— それは第44条が名指しで禁じた、
 *    門を黙らせる動機そのものである。
 */
const GATE_EXCLUDE = [
  { file: '_pulse-fixture.js', why: '門ではなく、pulse の門が読む作り物の的である(先頭の _ が支援ファイルを表す)' },
];
const GATE_EXCLUDE_FILES = new Set(GATE_EXCLUDE.map(e => e.file));

/** 統べる試験。ここから子として起こされるなら、CI に直接無くとも呼ばれている。 */
const GATE_UMBRELLA = 'paradise.test.js';

/**
 * 門の孤児を測る。
 *
 * 返すのは名指しできる形 —— **名指ししない門は、赤くなっても直せない**
 * (`workspace.js` の hardcodedRefs と同じ作法)。
 */
function gates(repoRoot = ROOT) {
  const dir = path.join(repoRoot, GATES_DIR);
  let names = [];
  try { names = fs.readdirSync(dir).sort(); } catch { return { gates: [], orphans: [], excluded: [] }; }

  /**
   * **呼び手の綴りを一つに固定しない。** CI は `node tests/x.test.js` と書くが、
   * 環境変数を前置する形(`PARADISE_ABODE=repo node tests/x.test.js`)も、
   * 統べる試験が `path.join('tests', 'x.test.js')` と組む形もある。
   * 綴りだけを見る門は、**呼んでいるのに孤児と報告する**(NAME_RES と同じ教訓)。
   */
  const mentions = (text, file) => text.includes(`tests/${file}`)
    || text.includes(`tests\\${file}`)
    || new RegExp(`['"]tests['"]\\s*,\\s*['"]${file.replace(/\./g, '\\.')}['"]`).test(text);

  /**
   * **散文で名を語ることは、走らせることではない (第16条)。**
   *
   * この門を建てた初回の実測で、`guards.test.js` が**呼ばれている**と判定された。
   * 呼び手は paradise.test.js のこの一行だった:
   *
   *     * 先例は `tests/guards.test.js:30` の `skip()` である。同じ形をここへ移した。
   *
   * **註釈である。** 何も走らせない。門は「名が出たか」ではなく
   * 「**何をするか**」で数えねばならない —— 名前で証拠を判ずるなという第16条を、
   * 門自身が破りかけた。ゆえに統べる試験の側は**註釈行を捨ててから**数える。
   * 先例は `workspace.js` の `hardcodedRefs`(「註釈は道を説明してよい。咎めるのは
   * 実際に走るコードの中の住所だけ」)である。
   *
   * ⚠️ CI(yml)側は逆に註釈を捨ててはならない。`#` で始まる行は yml の註釈だが、
   *    `run:` の中身は註釈ではなく**命令そのもの**である。ゆえに CI は全文で見る。
   */
  const codeOnly = (text) => text.split('\n')
    .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*'); })
    .join('\n');

  // 門(CI)の全文。workflow が増えても拾えるよう、ディレクトリを走査する。
  const ciText = filesUnder(path.join(repoRoot, '.github/workflows'))
    .map(f => read(f)).join('\n');
  const umbrellaText = codeOnly(read(path.join(dir, GATE_UMBRELLA)));

  const excluded = [], out = [];
  for (const name of names) {
    if (!name.endsWith('.js')) continue;
    /**
     * **除外はまず名指しで判じ、口で名乗る (第54条(c))。**
     * 綴りの規則(`.test.js`)より先に置くのは、除外された事実を**必ず出力に
     * 残す**ためである。順序を逆にすると `_pulse-fixture.js` は綴りの規則で
     * 黙って落ち、免除が一度も数えられない —— 黙った除外を作らない。
     */
    if (GATE_EXCLUDE_FILES.has(name)) {
      excluded.push(GATE_EXCLUDE.find(e => e.file === name));
      continue;
    }
    if (!name.endsWith('.test.js')) continue;
    const callers = [];
    if (mentions(ciText, name)) callers.push('ci');
    /**
     * 統べる試験は**自分自身の呼び手にはなれない**。paradise.test.js は本文で
     * 幾度も自分の名を成果物として書くので、素朴に数えれば必ず自分を呼び手に
     * 数える。自分で自分を呼んでも呼ばれたことにはならない(第21条 / 上の `self` と同じ)。
     */
    if (name !== GATE_UMBRELLA && mentions(umbrellaText, name)) callers.push('umbrella');
    out.push({ file: name, callers, orphan: callers.length === 0 });
  }
  return { gates: out, orphans: out.filter(g => g.orphan).map(g => g.file), excluded };
}


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
 * 門。三つの病を裁く:
 *   孤児     — 誰も呼ばない engine が住み続けている (第44条)
 *   宙吊り   — 存在しない engine の名を、門や命令や散文が呼んでいる (第21条)
 *   門の孤児 — 建てられた試験を、CI も統べる試験も走らせていない (第44条)
 */
function check() {
  const m = map();
  const orphans = m.engines.filter(e => e.orphan).map(e => e.id);
  const g = gates();
  return {
    ok: orphans.length === 0 && m.dangling.length === 0 && g.orphans.length === 0,
    orphans, dangling: m.dangling, map: m, gates: g,
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
    /**
     * **免除は口で名乗る (第54条(c))。** 黙って素通りさせた除外は、後から誰にも
     * 数えられない。除外は例外であり、例外は記録されて初めて例外である。
     */
    for (const e of r.gates.excluded) {
      console.log(`  · 門の除外 1 件: tests/${e.file} — ${e.why}`);
    }
    if (r.gates.orphans.length) {
      console.log(`  🔴 孤児の門 ${r.gates.orphans.length}:`);
      for (const f of r.gates.orphans) {
        console.log(`      tests/${f} — 建てられているが、CI も ${GATE_UMBRELLA} も走らせない`);
      }
      console.log('      門は走らされて初めて門である。赤いまま誰にも気付かれず住み続ける (第44条)。');
      console.log(`      .github/workflows/*.yml に "node tests/<名>" を足すか、${GATE_UMBRELLA} から起こせ。`);
    } else {
      console.log(`  ✓ 門 ${r.gates.gates.length} 本すべてに走らせる者が居る (第44条)`);
    }
    console.log(r.ok ? '  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い' : '  🔴 結線が破れている');
    process.exit(r.ok ? 0 : 1);
  }

  console.error('commands: map [--json] | check [--json]');
  process.exit(2);
}
if (require.main === module) main();
module.exports = { SURFACES, listEngines, requiresOf, map, check, gates, GATE_EXCLUDE, GATE_UMBRELLA };
