#!/usr/bin/env node
'use strict';
/**
 * deploy.js — 借り物 + 楽園の意志 から配備物を建て直す (憲法 第19条)
 *
 *   upstream (read-only)  ──┐
 *                           ├─▶  ~/.claude   ← 成果物。手で触らない
 *   overlay/  (楽園の意志) ──┘
 *
 * 配備物を「原本」だと思っている限り、乖離は永遠に消えない。ここから常に
 * 再生成できると決めた瞬間、乖離という概念そのものが消える。
 *
 *   deploy.js plan     何が起きるかだけ見せる (既定)
 *   deploy.js --write  実際に配備する
 *   deploy.js check    配備物が定義と一致しているか調べる (CI 用, exit 1 で乖離)
 *
 * 配備の順序は overlay.json の四分類そのもの:
 *   1. 上流を素通しで写す
 *   2. replace を楽園版で上書き
 *   3. own を足す
 *   4. adopted (上流が消したが楽園が使う) を足す
 *   5. transform を再適用する (apply-models + apply-spawn)
 *   6. 教主の座を settings.json に書く (apply-seat, 第31条)
 *   7. 掟を settings.json の permissions に落とす (apply-guards)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const up = require('./upstream.js');
const abode = require('./abode.js');   // 第58条: 楽園自身の住所を知るのは abode.js だけ

function md5(p) { try { return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex'); } catch { return null; } }
/**
 * 中身の同一性は改行コードで判定しない。Windows と Linux を跨ぐと git の
 * autocrlf で CRLF/LF が入れ替わり、内容が同じでも md5 は必ず食い違う。
 * 「改行が違う」を乖離と呼ぶと、検査が環境差で誤警報を出し続け、やがて
 * 誰も検査を見なくなる。見られない検査は無いのと同じである。
 */
function contentHash(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
    return crypto.createHash('md5').update(raw).digest('hex');
  } catch { return null; }
}
function listMd(dir) {
  try { return fs.readdirSync(dir).filter(f => f.endsWith('.md')); } catch { return []; }
}
function read(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

/**
 * 変換 engine が**どの frontmatter キーを統べるか**。
 *
 * かつて `check()` は「transform 対象の kind なら差は乖離ではない」として
 * **ファイルまるごと**を照合から外していた。実測(AC-7): 配備された
 * `agents/cardinal.md` の末尾に 1 バイト足しても `checked: 60` で緑のままだった。
 * **58 ファイルのうち 30 ファイル(agents 全部)が、実質一度も検められていなかった。**
 *
 * 変換が触るのは frontmatter の数キーだけである(第12条のモデルと第25条の権能)。
 * ゆえに**そのキーだけを落として**比べる。本文の 1 バイトも、変換の管轄外の
 * frontmatter キーも、これで捕まる。
 *
 * ⚠️ **知らない engine は「差を許す」側に倒さない。** 未知の engine が transform に
 * 加われば、その kind は**免除なしで**照合される(在るべきでない差は赤く出る)。
 * 免除は名簿に載った変換だけが受ける —— 裁かれる側が裁きの範囲を決めてはならない(第54条(d))。
 */
const TRANSFORM_KEYS = {
  'graph/apply-models.js': ['model', 'effort'],   // 第12条: 位階に応じたモデル
  'graph/apply-spawn.js': ['tools'],              // 第25条: 下位を擁する者に起動の権能
};

/** その kind の変換が統べる frontmatter キー。未知の engine が一つでも居れば null(= 免除しない)。 */
function governedKeys(kind, cfg) {
  const spec = (cfg.transform || {})[kind];
  if (!spec) return [];
  const engines = spec.engines || (spec.engine ? [spec.engine] : []);
  const keys = [];
  for (const e of engines) {
    const k = TRANSFORM_KEYS[e];
    if (!k) return null;                          // 知らない変換に免除は与えない
    keys.push(...k);
  }
  return keys;
}

/** frontmatter から指定のキー行だけを落とす。frontmatter が無ければそのまま返す。 */
function stripFrontmatterKeys(text, keys) {
  if (!keys.length) return text;
  const s = String(text).replace(/\r\n/g, '\n');
  const m = s.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return s;
  const re = new RegExp('^(' + keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\s*:');
  const fm = m[1].split('\n').filter(l => !re.test(l)).join('\n');
  return '---\n' + fm + '\n---\n' + s.slice(m[0].length);
}

/**
 * 配備計画を組む。何をどこから持ってくるかを、実行前に全て言語化する。
 * 「気づいたら上書きされていた」を無くすのが目的。
 */
function plan() {
  const c = up.cfg();
  const UP = up.upstreamPath(c);
  const HOME = up.claudeHome(c);
  const OV = path.join(ROOT, 'overlay');
  const steps = [];

  for (const kind of c.kinds) {
    const vnDir = path.join(OV, 'vendor', kind);   // 取り込んだ資産（楽園の所有物）
    const upDir = path.join(UP, kind);             // 上流（在れば見るだけ）
    const ovDir = path.join(OV, kind);
    const dstDir = path.join(HOME, kind);

    // 1. 素の資産は **vendor から** 取る (憲法 第20条)
    //
    // かつてここは上流ツリーから直接読んでいた。第20条で「全てを取り込んだ」と
    // 宣言した後もである。実測すると配備53件のうち31件が上流由来で、
    // 上流を隠した瞬間に配備物は22件へ激減し、神官9名(architect/code-reviewer/
    // tdd-guide/security-reviewer ほか)が消えた。**vendor に複製は在るのに、
    // deploy は一度もそれを見ていなかった。** 在庫を数える門はあったが、
    // 供給線を見る門が無かったので、独立は宣言のまま緑を出し続けた。
    //
    // 楽園は取り込んだ資産で建つ。上流はもはや供給元ではない。
    const primaryDir = fs.existsSync(vnDir) && listMd(vnDir).length ? vnDir : upDir;
    const fromLabel = primaryDir === vnDir ? 'vendor' : 'upstream';
    for (const f of listMd(primaryDir)) {
      const relKey = `${kind}/${f}`;
      if (c.replace && c.replace[relKey]) continue; // replace が勝つので後段で入れる
      if ((c.own && c.own[kind] || []).includes(f)) continue; // own が勝つ
      steps.push({ kind, file: f, from: fromLabel, src: path.join(primaryDir, f), dst: path.join(dstDir, f), relation: 'plain' });
    }
    // 2. replace
    for (const [relKey, spec] of Object.entries(c.replace || {})) {
      if (!relKey.startsWith(kind + '/')) continue;
      const f = relKey.slice(kind.length + 1);
      const src = path.join(ROOT, spec.source || path.join('overlay', relKey));
      steps.push({ kind, file: f, from: 'overlay(replace)', src, dst: path.join(dstDir, f), relation: 'replace', reason: spec.reason });
    }
    // 3. own
    for (const f of ((c.own && c.own[kind]) || [])) {
      steps.push({ kind, file: f, from: 'overlay(own)', src: path.join(ovDir, f), dst: path.join(dstDir, f), relation: 'own' });
    }
  }
  // 5. root — `~/.claude` 直下に住む楽園所有のファイル (第21条の宙吊り退治)
  //
  // 実測: 毎セッション読まれる散文のうち `rules/*.md` 8本は全て楽園が所有して
  // いたが、`~/.claude/CLAUDE.md` 5,693B だけが**どこにも出所が無かった**。
  // Git の追跡外、レビュー外、門の外。ハーネスが毎回読む部品が作者のマシンに
  // しか無い — 第21条が裁いた宙吊り参照と同じ病である。ゆえに overlay/root/ に
  // 取り込み、他の配備物と同じく再生成される成果物にする。
  for (const f of ((c.own && c.own.root) || [])) {
    steps.push({ kind: 'root', file: f, from: 'overlay(own)',
                 src: path.join(OV, 'root', f), dst: path.join(HOME, f), relation: 'own' });
  }

  // 4. adopted — 上流が捨てたが楽園が拾ったもの
  for (const relKey of ((c.adopted && c.adopted.files) || [])) {
    const kind = relKey.split('/')[0];
    const f = relKey.slice(kind.length + 1);
    steps.push({ kind, file: f, from: 'overlay(adopted)', src: path.join(OV, 'adopted', relKey),
                 dst: path.join(up.claudeHome(c), kind, f), relation: 'adopted' });
  }

  const missing = steps.filter(s => !fs.existsSync(s.src));
  return { home: HOME, upstream: UP, steps, missing,
           transforms: Object.keys(c.transform || {}),
           counts: steps.reduce((a, s) => { a[s.relation] = (a[s.relation] || 0) + 1; return a; }, {}) };
}

/** 配備物が計画と一致しているか。CI はこれで「手で触られた」を検出する。 */
function check() {
  const c = up.cfg();
  // **上流はここでは引かない。** 照合に要るのは「計画」と「配備先」だけである
  // (設計 L-25 — 上流を引いていた頃、CI では deploy 系 5 門が常に空回りしていた)。
  const HOME = up.claudeHome(c);
  const where = abode.resolve();

  /**
   * **不在を skip と呼んでよいのは、外を向いていると名乗ったときだけである**
   * (第58条(e) / AC-8)。
   *
   * かつてここは mode を見ずに「配備先が無ければ黙って緑」を返していた。
   * それで良かったのは、住処が**神のマシンの資産**だった間だけである。
   * `<repo>/.claude` は git 追跡の**派生物**であり(AC-14)、clone すれば必ず在る。
   * 在るべき物が無いのは「ハーネス不在」ではなく「**派生物の欠損**」——
   * それを skip と呼べば、配備が丸ごと消えても門は緑を出し続ける(第37条)。
   *
   * ゆえに skip は mode=global のときだけ。しかも**理由を名乗る** ——
   * `skipped` は真偽値ではなく理由の文字列である。黙って早期に return する門は
   * `N skipped` にすら数えられず、門が死んだことに誰も気づけない。
   *
   * ⚠️ **上流の不在は skip の理由にならない**(設計 L-25 / 第19条(d))。
   * かつてこの条件には `!fs.existsSync(UP)` が含まれており、**配備先が実在するのに
   * 上流が無いだけで skip していた**。実測(設計 §5.4 / 改革前):
   *
   *     $ PARADISE_UPSTREAM=/nonexistent node -e "…deploy.check()…"
   *     {"skipped":true,"ok":true,"checked":0}   ← 配備先 ~/.claude は実在する
   *     $ PARADISE_UPSTREAM=/nonexistent node tests/paradise.test.js --gate 'deploy:'
   *     5 of 455 gates matched — 5 green, 0 red   ← 5 門とも空回りで緑
   *
   * **CI(clone 直後)には上流が無い。** ゆえに deploy 系の門は CI で常に空回り
   * していた。配備は `overlay/` から建つ —— **上流はもはや供給元ではない**(第20条)。
   * 照合に要るのは「計画」と「配備先」だけであり、`plan()` は上流無しでも
   * 58 steps を返す(実測)。ゆえに上流を見る必要が無い。
   */
  if (where.mode === 'global' && !fs.existsSync(HOME)) {
    return { ok: true, skipped: `mode=global (source=${where.source}) かつ 配備先 ${HOME} が無い — 外を向いた住処はこの機の資産であり、無いことは欠陥ではない`,
             mode: where.mode, home: HOME, checked: 0, drift: [], transforms: [],
             note: 'no harness on this machine — nothing deployed to verify' };
  }
  const p = plan();
  const drift = [];
  /**
   * mode=repo で住処そのものが無いなら、**それ自体が乖離である**。
   * 一つずつ「not deployed」を 58 回並べても真因は伝わらないので、先に名指す。
   * (上流の不在では止めない —— 配備は vendor から建つ。上流はもはや供給元ではない(第20条)。)
   */
  if (!fs.existsSync(HOME)) {
    drift.push({ kind: 'abode', file: '.claude', from: 'deploy(--write)',
                 why: `リポジトリ内の住処 ${HOME} が存在しない — 派生物の欠損である。` +
                      `node graph/deploy.js --write で建て直せ (第58条(e))` });
  }
  for (const s of p.steps) {
    const a = contentHash(s.src), b = contentHash(s.dst);
    if (a === null) { drift.push({ ...s, why: 'source missing' }); continue; }
    if (b === null) { drift.push({ ...s, why: 'not deployed' }); continue; }
    if (a === b) continue;
    /**
     * 差が出た。**変換が統べるキーだけを落として比べ直す。**
     * ファイルまるごと免除すれば、本文の書き換えは永久に見えない(AC-7)。
     */
    if (p.transforms.includes(s.kind)) {
      const keys = governedKeys(s.kind, c);
      if (keys === null) {
        drift.push({ ...s, why: `変換 engine の名簿に無い engine が ${s.kind} を統べている — ` +
                                 'どのキーが変換の管轄かを deploy.js の TRANSFORM_KEYS に宣言せよ' });
        continue;
      }
      const sa = stripFrontmatterKeys(read(s.src), keys);
      const sb = stripFrontmatterKeys(read(s.dst), keys);
      if (sa === sb) continue;                       // 変換の管轄内の差 — 乖離ではない
      drift.push({ ...s, why: `変換の管轄外(frontmatter の ${keys.join('/')} 以外)で` +
                               '配備物が出所と食い違う — 手で触られた疑い' });
      continue;
    }
    drift.push({ ...s, why: 'deployed copy differs from its source' });
  }
  // 教主の座も配備物である (第31条)。agents だけを見る検査は、最上位を見逃す。
  const seat = require('./apply-seat.js').diff();
  if (!seat.skipped && !seat.ok) {
    drift.push({ kind: 'settings', file: 'settings.json', from: 'clergy(pontiff)',
                 why: `教主の座が宣言と違う: 現状 ${seat.current.model ?? '(無統治)'}/${seat.current.effort ?? '(無統治)'} ⇒ ${seat.want.model}/${seat.want.effort}` });
  }
  // 掟もまた配備物である。permissions が書かれていない配備は、門を一つも
  // 持たない配備であり、agents だけを数える検査はそれを緑と呼んでしまう。
  // さらに env が壊れていれば、門が鳴っても hook は走らない(第三の職責)。
  const guards = require('./apply-guards.js').diff();
  if (!guards.skipped && !guards.ok) {
    for (const c of guards.changes) {
      drift.push({ kind: 'settings', file: 'settings.json', from: 'apply-guards(POLICY)',
                   why: c.kind === 'permissions' ? `掟が機構になっていない: ${c.note}`
                      : c.kind === 'env' ? `env が壊れている: ${c.note}`
                      : `死んだ matcher ${c.event}[${c.index}]: ${c.note}` });
    }
  }
  // 修復対象ではない fatal な env 乖離も配備の欠陥である — 黙らせない。
  if (!guards.skipped && guards.ok && guards.envFatal > 0) {
    for (const e of (guards.envDrift || []).filter(x => x.severity === 'fatal')) {
      drift.push({ kind: 'settings', file: 'settings.json', from: 'apply-guards(env)',
                   why: `env.${e.key} が展開されない参照を含む: ${e.detail}` });
    }
  }
  return { ok: drift.length === 0, skipped: false, mode: where.mode, home: HOME,
           drift, checked: p.steps.length + 2, transforms: p.transforms };
}

function write() {
  const p = plan();
  if (p.missing.length) {
    return { ok: false, error: `${p.missing.length} source file(s) missing`, missing: p.missing.map(m => m.src) };
  }
  /**
   * **リポジトリ内の住処では、器そのものも配備物である**(第19条(b) / 第58条)。
   *
   * `apply-seat` も `apply-guards` も「settings.json が無ければ何もしない」と
   * 決めている —— それで正しかったのは、住処が**神のマシンの資産**だった間だけである。
   * `<repo>/.claude/` は `deploy --write` でいつでも建て直せる産物でなければならず、
   * 「丸ごと消してから建て直す」が通らない配備は、建て直せる配備ではない。
   *
   * ⚠️ **種を撒くのは mode=repo のときだけ。** グローバルの settings.json は神の物であり、
   * そこに楽園が新しいファイルを作る権能は無い(神託: グローバルには神が名指した物だけ)。
   * 既に在るものは決して上書きしない —— 空の器を置くのは、器が無いときに限る。
   */
  const where = abode.resolve();
  let seeded = null;
  if (where.mode === 'repo') {
    const sf = path.join(p.home, 'settings.json');
    if (!fs.existsSync(sf)) {
      fs.mkdirSync(p.home, { recursive: true });
      fs.writeFileSync(sf, '{}\n');
      seeded = sf;
    }
  }
  const done = [];
  for (const s of p.steps) {
    fs.mkdirSync(path.dirname(s.dst), { recursive: true });
    fs.copyFileSync(s.src, s.dst);
    done.push(`${s.relation}: ${s.kind}/${s.file}`);
  }
  // 5. transform を再適用 — 上流の本文更新の上に、楽園の規則を重ねる
  //
  // 一つの kind に **複数の変換** が要る。agents には位階モデル(第12条)と
  // 起動の権能(第25条)の二つが乗る。かつてここは engine を1つしか読まず、
  // 建て直すたびに権能が7名分**黙って消えていた**（実測で捕らえた）。
  // 変換が一つだけという前提は、規則が増えた瞬間に嘘になる。
  const applied = [];
  for (const kind of p.transforms) {
    const c = up.cfg();
    const spec = c.transform[kind] || {};
    // `engine`(単数・旧形式) と `engines`(複数) の両方を受ける。順に全て適用する。
    const engines = spec.engines || (spec.engine ? [spec.engine] : []);
    for (const engine of engines) {
      try {
        execFileSync('node', [path.join(ROOT, engine), 'apply'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
        applied.push(`${kind} ← ${engine}`);
      } catch (e) { return { ok: false, deployed: done.length, error: `transform failed for ${kind} via ${engine}: ${e.message}` }; }
    }
  }
  // 6. 教主の座を配備する (第31条)
  //
  // agents だけを運んでいた頃、位階の宣言は L2〜L-1 にしか届いていなかった。
  // 教主(L1)の座は settings.json にあり、deploy はそこを一度も見ていなかったので、
  // 「教主 = <model>」という宣言は**どこにも書かれないまま**緑を出し続けた。
  // 第25条(歩けぬ階層は階層ではない)と同じ形の欠陥である — 最上位だけが機構の外にいた。
  let seat = null;
  try {
    const s = require('./apply-seat.js').apply();
    seat = s.ok ? `${s.model}/${s.effort}${s.changed ? ' (更新)' : ''}` : `失敗: ${s.error}`;
    if (!s.ok) return { ok: false, deployed: done.length, error: `pontiff seat: ${s.error}` };
  } catch (e) { return { ok: false, deployed: done.length, error: `pontiff seat: ${e.message}` }; }

  // 7. 掟を機構にする
  //
  // 配備物は agents と commands と座だけではない。**掟そのもの**が配備物である。
  // permissions を書かない配備は、force push も .env の読み出しも素通しにする
  // 配備であり、CLAUDE.md の「Hooks で自動強制されている」という一文を嘘にする。
  // さらに死んだ matcher を直す — 建て直すたびに門が黙って無効化されていた。
  // そして env の健全性(第三の職責)。`env: {"PATH": "$PATH:..."}` の `$PATH` は
  // 展開されずリテラル文字列として PATH になり、node を呼ぶ hook 15/15 が
  // `command not found` で **exit=0 のまま黙って** 死んでいた。工程は増やさない —
  // apply-guards の職責が増えただけであり、ここが env も一緒に運ぶ。
  let guards = null;
  try {
    const g = require('./apply-guards.js').apply();
    if (!g.ok) return { ok: false, deployed: done.length, error: `guards: ${g.error}` };
    guards = g.skipped ? '(settings.json 無し)'
           : `deny ${require('./apply-guards.js').POLICY.deny.length} / ask ${require('./apply-guards.js').POLICY.ask.length} / allow ${require('./apply-guards.js').POLICY.allow.length}${g.changed ? ` (更新 ${g.changes.length})` : ''}`;
  } catch (e) { return { ok: false, deployed: done.length, error: `guards: ${e.message}` }; }

  return { ok: true, deployed: done.length, seeded, mode: where.mode,
           transforms: applied, pontiff_seat: seat, guards, home: p.home };
}

/**
 * CLI 本体。**`process.exit()` を使わず `process.exitCode` を返す。**
 *
 * POSIX(CI は Ubuntu である)では stdout がパイプのとき `console.log` は
 * 非同期に掃き出される。`process.exit()` はその掃き出しを待たずにプロセスを
 * 畳むので、**手元の Windows では絶対に再現しない形で CI だけが出力を失う**。
 * 値を返して自然に終わらせれば、node が掃き出しを待つ。
 */
function main(argv) {
  const cmd = argv[2];
  if (cmd === 'check') {
    const r = check();
    console.log('═══════ 🏛  DEPLOYMENT CHECK ═══════');
    // 住処と mode を必ず名乗る。どこを検めたか言わない門は、緑でも証拠にならない。
    console.log(`mode: ${r.mode || '(不明)'}   target: ${r.home || '(不明)'}`);
    if (r.skipped) {
      // **skip は理由を名乗る**(第58条(e))。真偽値の skip は「黙って通った」と同義である。
      console.log(`  · skipped: ${r.skipped}`);
      console.log('════════════════════════════════════');
      return 0;
    }
    console.log('checked:', r.checked, ' transforms (diff expected):', r.transforms.join(', ') || 'none');
    if (r.ok) console.log('  ✓ every deployed file matches its declared source');
    else for (const d of r.drift.slice(0, 12)) console.log(`  🔴 ${d.kind}/${d.file} — ${d.why} (${d.from})`);
    console.log('════════════════════════════════════');
    return r.ok ? 0 : 1;
  }
  if (argv.includes('--write')) { console.log(JSON.stringify(write(), null, 2)); return 0; }
  const p = plan();
  console.log('═══════ 🏛  DEPLOYMENT PLAN ═══════');
  console.log('upstream:', p.upstream);
  console.log('target  :', p.home);
  console.log('files   :', JSON.stringify(p.counts));
  console.log('transform after copy:', p.transforms.join(', ') || 'none');
  if (p.missing.length) for (const m of p.missing) console.log('  🔴 missing source:', m.src);
  else console.log('  ✓ every source exists');
  console.log('  (dry run — pass --write to deploy)');
  console.log('═══════════════════════════════════');
  return p.missing.length ? 1 : 0;
}

if (require.main === module) {
  try { process.exitCode = main(process.argv); }
  catch (e) { console.error('ERROR: ' + e.message); process.exitCode = 1; }
}

module.exports = { plan, check, write, governedKeys, stripFrontmatterKeys, TRANSFORM_KEYS };
