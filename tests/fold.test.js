#!/usr/bin/env node
'use strict';
/**
 * fold.test.js — 畳みの機構が己の掟を守るか (reform/gate-fold / FR-11 / 第56条 b)
 *
 * 担う AC: AC-01 / 02 / 03 / 04 / 05 / 06 / 07 / 08 / 09 / 11 / 12 / 13 / 16 / 17 / 18 / 19 / 23 / 25 / 26 / 27
 * (AC-10 / 14 / 15 / 20 / 21 / 22 / 24 は **`tests/paradise.test.js` に常駐する** ——
 *  第56条(b):「門番は絞り込みの外に立つ」。畳みが切られた世界で「畳まれないこと」を
 *  確かめる門は常に緑であり、常に緑の門は門ではない(第48条 c)。)
 *
 * ══ この門の作法が何を見えなくするか(AC-27 / 第62条 a)══
 *
 * 第62条(a):「門を建てるとき、その門の形が何を見えなくするかを言え。
 *   言えない盲点は、存在しない盲点ではなく、**まだ誰も落ちていない穴**である」。
 *
 *   ① **単一プロセスか** —— YES。AC-01〜AC-24 は単一プロセスで撃つので
 *      **競合を見ない**。補うのは AC-25 のみ(並列度 2/4/8 × 30 試行を
 *      **実際に別プロセスで**起こす)。第62条の実測:「`record` の TOCTOU は
 *      並列度 2/4/8 のすべてで 100% 破れたが、114 本の門は一本も鳴らなかった ——
 *      誰も二つのプロセスを同時に起こさなかったからである」。
 *   ② **`require.cache` を捨てるか** —— YES。故障注入は**写しを子プロセスで撃つ**形を採る。
 *      ゆえに**モジュール大域を見ない**。`fold.js` の最上位に可変の大域
 *      (`let LEDGER_CACHE` 等)が生えても、振る舞いに現れない日がある。
 *      補うのは `paradise.test.js` の AC-21(ソースを静的に読む門)である(第62条 c)。
 *   ③ **環境変数で住所を振り替えるか** —— YES。この門は `PARADISE_FOLD_LEDGER` で
 *      台帳を仮倉へ振り替える。ゆえに**振替を壊す変異を見ない**。第62条の実測 W1:
 *      「住所解決を壊した変異は門の防御を素通りして現物の台帳に 14 行を書いた」。
 *      補うのは `paradise.test.js` の AC-24 の番兵(現物の指紋を毎門で照合し、
 *      汚した門を名で呼ぶ)である。
 *
 * ⚠️ **この門は現物の台帳を一度も触らない。** CI の `📒 Fold` 段は
 *    `PARADISE_FOLD_LEDGER=${{ runner.temp }}/fold-gate-ledger.jsonl` を置く(design §5.5)。
 *    門は台帳を**壊して鳴らす**(AC-16 の `ledger-unreadable`、AC-25 の並行追記)——
 *    現物を壊せば後続の段が偽の赤を出す(第58条 c / 第62条 b)。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const { ROOT, makeHarness, skip } = require('./_pulse-fixture.js');

const H = makeHarness('Fold self-test');
const { test } = H;
const FOLD_JS = path.join(ROOT, 'graph', 'fold.js');
const GRAPH = path.join(ROOT, 'graph');
const PARADISE = path.join(ROOT, 'tests', 'paradise.test.js');

/** 門だけの作業場。**現物の台帳の住所を、この走行の間だけ振り替える**(NFR-03)。 */
const SAND = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-fold-gate-'));
process.env.PARADISE_FOLD_LEDGER = path.join(SAND, 'ledger.jsonl');
/**
 * ⚠️ **門は自分の測る世界を自分で宣言する**(review F-1 / 第48条 c)。
 *
 * CI の `📒 Fold` 段は `PARADISE_NO_FOLD: '1'` を立てる —— その段自身を畳ませない
 * ための正しい意図である。だが `fold.decide()` は `opts.env` が無ければ
 * `process.env` を読むので、**畳みを見張る門そのものが `bail=disabled` に落ちる**。
 * 実測(review F-1): CI と同じ env で `Fold self-test: 19 passed, 7 failed`。
 * 門は `not-green` / `no-receipt` / `ledger-unreadable` / `key-miss` の枝に
 * **一度も到達しなかった**。
 *
 * ゆえに台帳の住所と同じく、**この旗も門が自分で振り替える**。
 * AC-18(`--no-fold` は畳みを完全に切る)の門は `env` を明示で渡すので
 * (`fold.decide({ file, env: { ...process.env, PARADISE_NO_FOLD: '1' } })`)、
 * ここで消しても AC-18 の歯は一本も欠けない。
 * この宣言が消えたことは門『fold: この門束は外の env に畳みを切られない (F-1 回帰)』が鳴らす。
 */
delete process.env.PARADISE_NO_FOLD;
/**
 * **門は自分の走行も自分で名乗る**(security S-1)。領収書は一走行の中でのみ有効
 * であり(requirements §7-6)、`runId()` は CI で名乗りが無ければ `null`(=畳まない)を返す。
 * 門は畳みの**全ての枝**を撃たねばならないので、走行の名を自分で立てる ——
 * 台帳の住所(`:51`)と `PARADISE_NO_FOLD`(直上)と同じ作法である。
 */
process.env.PARADISE_FOLD_RUN = 'fold-gate-' + process.pid;
const fold = require(FOLD_JS);

/** 現物の台帳の指紋。**門が現物を汚していないこと**を最後に自分で検める(AC-24 の同型)。 */
function realLedgerFingerprint() {
  // 住所は abode に訊く。`.claude` の綴りをここに書けば第58条(a)で名指される。
  const abode = require(path.join(GRAPH, 'abode.js'));
  const p = abode.pathFor('foldLedger');
  try { return require('crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
  catch (e) { return e.code === 'ENOENT' ? 'absent' : 'unreadable:' + e.code; }
}
const REAL_BEFORE = realLedgerFingerprint();

/** 使い捨ての台帳。門ごとに別の道を使う —— 門が門の答えを汚さないため。 */
let seq = 0;
function tmpLedger(tag) { return path.join(SAND, `${tag}-${++seq}.jsonl`); }

/**
 * **故障注入した `fold.js` の写しを作って子プロセスで撃つ**(第56条の処方と同形)。
 *
 * ⚠️ **写しは仮倉に置く。倉の中には一行も書かない**(第58条(c) / hermetic)。
 * `fold.js` は `require('./abode.js')` と `require('./derived.js')` を相対で引くので、
 * 素朴に仮倉へ置けば読み込みの時点で落ちる —— **落ちたことを「鳴った」と読めば、
 * それは注入が当たったことの証拠にならない**(第37条)。
 * ゆえに写しの中の相対 require を**絶対の道へ書き換えてから**置く。
 *
 * 実測で踏んだ罠: 最初は `graph/.fold-probe-<pid>.js` へ置いた。動きはしたが、
 * 常駐の門「hermetic: 楽園の門は今この瞬間、版管理下の現物を汚していない」が
 * **4 行を名指して赤くなった** —— 復元は除外ではない。窓は開く。
 */
function withMutant(mutate, fn) {
  const src = fs.readFileSync(FOLD_JS, 'utf8');
  const broken = mutate(src);
  assert.notStrictEqual(broken, src,
    '故障注入が当たらなかった — 変異点の形が変わった。当たらない注入で「鳴らない」と結論してはならない (第37条)');
  const abs = broken
    .replace(/require\('\.\/([\w.-]+)'\)/g, (_, n) => `require(${JSON.stringify(path.join(GRAPH, n))})`)
    // **倉の根を固定する。** 写しは仮倉に住むので `path.join(__dirname, '..')` は
    // 楽園ではなく仮倉の親を指す —— **鍵の材料が空になり、どの注入も `key-miss` に化ける**。
    // 実測で踏んだ: AC-07 の注入が「当たったのに鳴らない」と見えたのはこれが原因だった。
    .replace("const ROOT = path.join(__dirname, '..');", `const ROOT = ${JSON.stringify(ROOT)};`);
  assert.ok(abs.includes(JSON.stringify(ROOT)), '写しの倉の根を固定できなかった — 鍵が別物になる');
  const mut = path.join(SAND, `fold-probe-${++seq}.js`);
  fs.writeFileSync(mut, abs);
  const rm = () => { try { fs.rmSync(mut, { force: true }); } catch {} };
  let r;
  // **写しは呼び手が終わるまで生かす。** 子プロセスが読み込む前に消せば、
  // 落ちた理由が「注入」なのか「写しが無い」なのか判らなくなる(第37条)。
  try { r = fn(mut); } catch (e) { rm(); throw e; }
  if (r && typeof r.then === 'function') return r.then((v) => { rm(); return v; }, (e) => { rm(); throw e; });
  rm();
  return r;
}

/** 子プロセスで一片の script を撃つ。`--eval` ではなく道を渡す(写しの相対 require のため)。 */
function runNode(script, env = {}) {
  const f = path.join(SAND, `run-${++seq}.js`);
  fs.writeFileSync(f, script);
  return spawnSync(process.execPath, [f], { encoding: 'utf8', cwd: ROOT, env: { ...process.env, ...env } });
}

/**
 * **atlas の単道走行を一度だけ撃ち、写しを配る**(review F-3 / F-15 が同じ走行を読む)。
 *
 * ⚠️ **`--static` を付けてはならない**(実測)。`--static` は `ir.meta.animation` を
 * 止めるので `motionGovernor` が赤になり、**総括行の内訳が出ない** ——
 * F-15 が測りたい算法に到達できなくなる(第37条: 測れなかったものを緑と呼ばない)。
 * 実 Chrome は `--static` でも起きるので**速くもならない**(review F-11 の訂正)。
 *
 * ⚠️ **門の依存にはならない。** 呼ばれた門が最初なら自分で撃つ(memo が空なら走る)——
 * `--gate` で 1 本だけ撃っても正しく測れる。
 */
const ATLAS_MEMO = new Map();
function atlasQuick(extra = []) {
  const k = extra.join(' ');
  if (!ATLAS_MEMO.has(k)) {
    const fl = path.join(SAND, `atlas-quick-${ATLAS_MEMO.size}.jsonl`);
    ATLAS_MEMO.set(k, spawnSync(process.execPath,
      [path.join(GRAPH, 'atlas.js'), 'check', '--scale', 'quick', ...extra],
      { encoding: 'utf8', cwd: ROOT, timeout: 300000,
        env: { ...process.env, PARADISE_FOLD_LEDGER: fl } }));
  }
  return ATLAS_MEMO.get(k);
}

// ══════════════════════════════════════════════════════════════════════

async function main() {
  console.log('畳みの機構 (fold / reform/gate-fold):');

  // ── 台帳と鍵 (FR-01 / FR-02 / FR-03) ────────────────────────────────

  await test('fold: 全走は領収書を刻む', () => {
    // ① 器の側: 領収書は 4 欄を持ち、`summary` は渡した綴りと**一字も違わない**
    const file = tmpLedger('ac01');
    const summary = 'Paradise self-test: 492 passed, 0 failed';
    const r = fold.append({ key: fold.key(), exit: 0, summary }, { file });
    const rows = fold.read({ file });
    assert.strictEqual(rows.length, 1, `台帳が ${rows.length} 行 — 全走は 1 行刻む`);
    for (const f of ['key', 'exit', 'summary', 'at']) {
      assert.ok(Object.prototype.hasOwnProperty.call(rows[0], f), `領収書に ${f} 欄が無い`);
    }
    assert.strictEqual(rows[0].summary, summary, '総括行が書き換えられた — 綴りは契約である');
    assert.strictEqual(rows[0].exit, 0);
    assert.strictEqual(rows[0].key, r.key);

    // ② 走行の側: `paradise.test.js` が**全走の枝で**領収書を刻む呼びを持つ
    //    (全走そのものは約 6 分。門の中で撃てば 📒 Fold 段が自己診断になる ——
    //     ゆえにここはソースを読む。**振る舞いの実測は build.md の S-4 が持つ**。)
    const src = fs.readFileSync(PARADISE, 'utf8');
    assert.ok(/fold\.recordRun\(/.test(src),
      'paradise.test.js が領収書を刻む呼びを持っていない — 台帳は永久に空になる (FR-01)');

    // ③ **壊して鳴らす**: `append()` の本体を空にすると台帳が増えない
    withMutant(
      s => s.replace('  withLock(file, () => fs.appendFileSync(file, line), opts);', '  void line;'),
      (mut) => {
        const f2 = tmpLedger('ac01-broken');
        const r2 = runNode(`const f=require(${JSON.stringify(mut)});
          f.append({key:f.key(),exit:0,summary:'x'},{file:${JSON.stringify(f2)}});
          console.log('rows=' + f.read({file:${JSON.stringify(f2)}}).length);`);
        assert.match(String(r2.stdout), /rows=0/,
          `追記を消した写しが台帳に書いた: ${r2.stdout}${r2.stderr}`);
      });
  });

  await test('fold: 絞り込み走行は領収書を刻まない', () => {
    // **実際に絞り込み走行を撃つ**(設定ではなく走行を読む — 第16条)。
    const file = tmpLedger('ac02');
    fs.writeFileSync(file, '');
    const before = fold.read({ file }).length;
    const r = spawnSync(process.execPath,
      [PARADISE, '--gate', '^gate-filter: census は自己診断を素で呼ぶ$'],
      { encoding: 'utf8', cwd: ROOT, env: { ...process.env, PARADISE_FOLD_LEDGER: file } });
    assert.strictEqual(r.status, 0, `絞り込み走行が exit ${r.status}: ${String(r.stderr).slice(0, 300)}`);
    const after = fold.read({ file }).length;
    assert.strictEqual(after, before,
      `絞り込み走行が台帳を ${before} → ${after} にした — 部分は全体を騙らない (第56条 c)`);
    // 綴りの契約も同時に見る: 絞り込み走行は `Paradise self-test:` を名乗らない
    assert.strictEqual((String(r.stdout).match(/Paradise self-test/g) || []).length, 0,
      '絞り込み走行が全走の名乗りを出した');
    // **壊して鳴らす**: 刻みが `GATE.active` の分岐の外に在れば、この門が鳴る
    const src = fs.readFileSync(PARADISE, 'utf8');
    const call = src.indexOf('fold.recordRun(');
    const guard = src.indexOf('if (!GATE.active) {');
    assert.ok(call > 0 && guard > 0 && call > guard,
      '領収書の刻みが全走の枝の外に在る — 絞り込みの結果が全走の根拠になる (第56条 c)');
  });

  await test('fold: 鍵は中身から採る — 註釈一行で鍵が動く', () => {
    // ① 註釈一行で鍵が動く。**現物は触らない** —— 複製の倉で撃つ(第58条 c)
    const repo = path.join(SAND, 'copy-repo');
    fs.rmSync(repo, { recursive: true, force: true });
    for (const d of ['tests', 'graph', '.github/workflows']) fs.mkdirSync(path.join(repo, d), { recursive: true });
    fs.writeFileSync(path.join(repo, 'tests', 'paradise.test.js'), '// 註釈 A\nmodule.exports={};\n');
    fs.writeFileSync(path.join(repo, 'graph', 'x.js'), 'module.exports={};\n');
    fs.writeFileSync(path.join(repo, '.github', 'workflows', 'tribunal.yml'), 'name: t\n');
    const k1 = fold.key({ root: repo });
    fs.writeFileSync(path.join(repo, 'tests', 'paradise.test.js'), '// 註釈 B\nmodule.exports={};\n');
    const k2 = fold.key({ root: repo });
    assert.notStrictEqual(k1, k2,
      `註釈一行を書き換えても鍵が動かない (${k1}) — 鍵が中身を見ていない (findings §4.2 Jest #8702)`);

    // ② git SHA だけが変わっても鍵は動かない = 鍵の算法に SHA が現れない
    const src = fs.readFileSync(FOLD_JS, 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.ok(!/rev-parse|git\s+log|\bHEAD\b/.test(code),
      '鍵の算法が git を引いている — SHA だけが変われば偽の miss、未コミットの変更は偽の hit (AC-03)');

    // ③ **壊して鳴らす**: 材料から内容ハッシュを抜いて名前だけにすると、鍵が動かなくなる
    withMutant(
      s => s.replace('    h.update(f); h.update(\'\\0\'); h.update(Buffer.from(fh, \'hex\'));',
                     '    h.update(f); h.update(\'\\0\');'),
      (mut) => {
        const r = runNode(`const f=require(${JSON.stringify(mut)});
          const repo=${JSON.stringify(repo)}, fs2=require('fs'), p=require('path');
          const a=f.key({root:repo});
          fs2.writeFileSync(p.join(repo,'tests','paradise.test.js'), '// 註釈 C\\nmodule.exports={};\\n');
          console.log('moved=' + (a !== f.key({root:repo})));`);
        assert.match(String(r.stdout), /moved=false/,
          `中身を抜いた写しで鍵が動いた — 注入が当たっていない: ${r.stdout}${r.stderr}`);
      });
  });

  await test('fold: 住処の宣言は鍵に効く', () => {
    const base = { root: ROOT };
    const repo = fold.key({ ...base, env: { ...process.env, PARADISE_ABODE: 'repo' } });
    const glob = fold.key({ ...base, env: { ...process.env, PARADISE_ABODE: 'global' } });
    assert.notStrictEqual(repo, glob,
      `=repo と =global の鍵が同じ (${repo}) — global の赤が repo の緑で上書きされる (findings §1.3)`);
    // **素 ≡ repo** でなければ P-1 の取り分 843.0s のうち 420s が消える(design §2.6)。
    const bare = { ...process.env }; delete bare.PARADISE_ABODE;
    assert.strictEqual(fold.key({ ...base, env: bare }), repo,
      '素と =repo の鍵が違う — 生の env を鍵にしている。abode.resolve().mode を通せ (design §2.6 / D-10)');
    // **壊して鳴らす**: 住処を鍵から抜くと repo と global が同じ鍵になる
    withMutant(
      s => s.replace("  h.update('PARADISE_ABODE='); h.update(mode); h.update('\\0');", '  void mode;'),
      (mut) => {
        const r = runNode(`const f=require(${JSON.stringify(mut)});
          const e=k=>({...process.env,PARADISE_ABODE:k});
          console.log('same=' + (f.key({root:${JSON.stringify(ROOT)},env:e('repo')})
                              === f.key({root:${JSON.stringify(ROOT)},env:e('global')})));`);
        assert.match(String(r.stdout), /same=true/,
          `住処を抜いた写しで鍵が分かれたままだった: ${r.stdout}${r.stderr}`);
      });
  });

  await test('fold: 鍵の材料は数え直せる', () => {
    const r = spawnSync(process.execPath, [FOLD_JS, 'fold-key', '--explain'],
      { encoding: 'utf8', cwd: ROOT });
    assert.strictEqual(r.status, 0, `fold-key --explain が exit ${r.status}: ${r.stderr}`);
    let j;
    try { j = JSON.parse(r.stdout); }
    catch (e) { assert.fail(`--explain が JSON を吐かない (${e.message}): ${String(r.stdout).slice(0, 200)}`); }
    assert.ok(j.fileCount > 100, `材料が ${j.fileCount} 本しか無い — 鍵が痩せている`);
    assert.strictEqual(j.files.length, j.fileCount, '材料の一覧と本数が食い違う (第22条: 数え直せること)');
    // **環境変数の欄**(AC-06 の壊しどころ)
    assert.ok(Array.isArray(j.env) && j.env.length >= 2,
      '--explain に環境変数の欄が無い — 鍵が動いた理由を diff で特定できない');
    const names = j.env.map(e => e.name);
    assert.ok(names.includes('PARADISE_ABODE'), `環境変数の欄に PARADISE_ABODE が無い: ${names}`);
    for (const e of j.env) {
      assert.ok(typeof e.valueSha === 'string' && e.valueSha.length >= 8,
        `${e.name} の値のハッシュが無い — 値そのものを晒さずに diff できねばならない`);
    }
    // **二つの走行を diff して理由が特定できる**ことを実際に撃つ
    const g = spawnSync(process.execPath, [FOLD_JS, 'fold-key', '--explain'],
      { encoding: 'utf8', cwd: ROOT, env: { ...process.env, PARADISE_ABODE: 'global' } });
    const jg = JSON.parse(g.stdout);
    assert.notStrictEqual(jg.key, j.key, '住処を変えても鍵が動かない');
    const diff = j.env.filter((e, i) => e.valueSha !== jg.env[i].valueSha).map(e => e.name);
    assert.deepStrictEqual(diff, ['PARADISE_ABODE'],
      `鍵が動いた理由が env の diff で特定できない: ${JSON.stringify(diff)}`);
    // **壊して鳴らす**: env の欄を消す
    withMutant(
      s => s.replace('  return { key: h.digest(\'hex\').slice(0, 16), fileCount: rows.length, bytes, env: envs, files: rows };',
                     '  return { key: h.digest(\'hex\').slice(0, 16), fileCount: rows.length, bytes, files: rows };'),
      (mut) => {
        const rr = runNode(`const f=require(${JSON.stringify(mut)});
          console.log('hasEnv=' + Array.isArray(f.keyExplain().env));`);
        assert.match(String(rr.stdout), /hasEnv=false/,
          `env の欄を消した写しがまだ欄を持っている: ${rr.stdout}${rr.stderr}`);
      });
  });

  await test('fold: 鍵は門が読む現物を覆う (prove M-02)', () => {
    /**
     * **prove 相で見つけた最大の穴を、二度と開かないように凍らせる門。**
     *
     * 実測(prove M-02): 鍵の材料は **137 本**しか無く、版管理下の 605 本のうち
     * 残りは鍵の外に在った。「壊すと門が赤くなるが鍵が動かない」現物を全数で探すと
     * **7 本**見つかった —— `overlay/root/CLAUDE.md` を潰した走行は
     * **鍵が 1 ビットも動かず** `Paradise fold: Executed 0 out of 1 runs (1 reused, …)` と
     * `Census … ✓ every number the paradise claims about itself is true` を
     * **exit 0** で出した(素の全走なら 2 門が赤い状態である)。
     * **findings §4.2 Jest #8702 と同型の「鍵の漏れ」である。**
     *
     * ⚠️ **この門は「本数」で裁かない。** 数は改修のたびに動くので、
     * 数で縛れば偽の赤になる(第62条 b)。裁くのは**覆いの形**である ——
     * 門が中身を読む木と根の文書が、材料の綴りに**在ること**。
     */
    const fold2 = require(FOLD_JS);
    const mat = new Set(fold2.materials());
    // ① **門が中身を読む木は、すべて覆われていること**(名指しで狭く切る / 第44条 c)
    const TREES = ['tests/', 'graph/', 'overlay/', 'dashboard/', 'tools/', '.github/workflows/'];
    for (const t of TREES) {
      assert.ok([...mat].some(f => f.startsWith(t)),
        `鍵の材料が ${t} を一本も覆っていない — そこを壊した日、畳みは偽の緑を出す (prove M-02)`);
    }
    // ② **根の文書**。走査では拾えないので名簿だが、名簿が腐ればここで鳴る
    for (const doc of fold2.ROOT_DOCS) {
      if (!fs.existsSync(path.join(ROOT, doc))) continue;   // 不在は穴ではない
      assert.ok(mat.has(doc),
        `${doc} が鍵の材料に無い — 門がその中身を裁くのに、壊しても鍵が動かない (prove M-02)`);
    }
    // ③ **`overlay/vendor/archify` だけを覆う綴りへ戻っていないこと**(退行の形を名指す)
    const outsideArchify = [...mat]
      .filter(f => f.startsWith('overlay/') && !f.startsWith('overlay/vendor/archify/'));
    assert.ok(outsideArchify.length > 10,
      `overlay/ のうち archify 以外が ${outsideArchify.length} 本しか材料に無い — ` +
      '**配備の正典が鍵の外に落ちている**。`overlay/root/CLAUDE.md` を壊しても畳みが効く (prove M-02)');
    // ④ Atlas の裁定を下す実行体(`.mjs`)が落ちていないこと
    assert.ok(mat.has('graph/motion-probe.mjs'),
      'graph/motion-probe.mjs が材料に無い — 動きの裁定を下す実行体が鍵の外に在る (atlas.js:74 の PROBE)');

    // ⑤ **振る舞いで撃つ**(第16条: 設定ではなく走行を読む)。
    //    **現物は触らない** —— 複製の倉を作り、そこで壊して鍵が動くかを測る。
    const repo = path.join(SAND, 'cover-repo');
    fs.rmSync(repo, { recursive: true, force: true });
    for (const d of ['tests', 'graph', 'overlay/root', 'dashboard', '.github/workflows']) {
      fs.mkdirSync(path.join(repo, d), { recursive: true });
    }
    fs.writeFileSync(path.join(repo, 'tests', 'paradise.test.js'), 'module.exports={};\n');
    fs.writeFileSync(path.join(repo, 'graph', 'x.js'), 'module.exports={};\n');
    fs.writeFileSync(path.join(repo, '.github', 'workflows', 'tribunal.yml'), 'name: t\n');
    const victims = ['overlay/root/CLAUDE.md', 'dashboard/index.html', 'README.md'];
    for (const v of victims) fs.writeFileSync(path.join(repo, v), '正典 A\n');
    for (const v of victims) {
      const k1 = fold2.key({ root: repo });
      fs.writeFileSync(path.join(repo, v), '正典 B(壊した)\n');
      const k2 = fold2.key({ root: repo });
      assert.notStrictEqual(k1, k2,
        `${v} を壊しても鍵が動かない (${k1}) — **その破壊は畳みで消える**。` +
        'findings §4.2 Jest #8702 と同型の鍵の漏れである (prove M-02)');
    }

    // ⑥ **壊して鳴らす**: 覆いを `overlay/vendor/archify` だけへ戻すと、この門が鳴る
    withMutant(
      s => s.replace("  walkAll(root, 'overlay', out);", "  walkAll(root, 'overlay/vendor/archify', out);"),
      (mut) => {
        const r = runNode(`const f=require(${JSON.stringify(mut)});
          const m=f.materials();
          console.log('outside=' + m.filter(x=>x.startsWith('overlay/')&&!x.startsWith('overlay/vendor/archify/')).length);`);
        assert.match(String(r.stdout), /outside=0/,
          `覆いを狭めた写しがまだ overlay を覆っている — 注入が当たっていない: ${r.stdout}${r.stderr}`);
      });
  });

  await test('fold: 領収書の緑は型で裁く — 偽装された exit は畳めない (prove M-05)', () => {
    /**
     * **prove 相 M-05 の無音を塞ぐ門。**
     *
     * 実測: `find()` の `r.exit === 0` を `r.exit == 0`(緩い等号)へ緩めても、
     * **20 門も 7 門も一本も鳴らなかった**。台帳は JSONL であり **外から 1 行足せる面**
     * である —— `{"exit":"0"}` / `{"exit":false}` / `{"exit":[]}` はすべて
     * 緩い等号の下で**緑と読まれる**。それは findings §4.1 Tuist #8570
     * (落ちた試験が passed と報告された)の型を、台帳の側から再現する道である。
     *
     * ⚠️ **ソースを読むだけでは足りない**(第16条)。緩い等号は綴りで探せるが、
     * `Number(r.exit) === 0` のような**別の緩め方**は綴りが違う。ゆえに
     * **偽装された領収書を実際に置いて、畳まれないことを走行で撃つ。**
     */
    const fold2 = require(FOLD_JS);
    const k = fold2.key();
    /** 緩い等号なら緑と読まれるが、**厳密には緑でない** exit の値。 */
    const IMPOSTORS = [
      { v: '0', name: '文字列の "0"' },
      { v: false, name: '真偽値の false' },
      { v: [], name: '空の配列' },
      { v: '', name: '空文字' },
      { v: '0x0', name: '16 進の綴り' },
      { v: 0.0, name: '0.0(これは本当に 0 である)', green: true },
    ];
    for (const imp of IMPOSTORS) {
      const file = tmpLedger('m05');
      // `append` は形を検めるので、**生の行を直に書く**(外から足された行の模倣)。
      // **`run` はこの走行の名を載せる** —— 載せねば security S-1 の絞りが先に働き、
      // **この門が測りたい `exit` の型の枝に到達しない**(第37条: 測れなかったものを緑と呼ばない)。
      fs.writeFileSync(file, JSON.stringify({
        at: new Date().toISOString(), run: fold2.runId(), key: k, exit: imp.v,
        summary: 'Paradise self-test: 499 passed, 0 failed',
      }) + '\n');
      const d = fold2.decide({ file, env: { ...process.env, PARADISE_ABODE: 'repo' } });
      if (imp.green) {
        assert.strictEqual(d.fold, true, `${imp.name} は本当に 0 である — 畳めねばならない`);
        continue;
      }
      assert.strictEqual(d.fold, false,
        `**${imp.name} を緑と読んで畳んだ** — 緩い等号は偽造された領収書を畳みの根拠にする ` +
        '(findings §4.1 Tuist #8570 / prove M-05)');
      /**
       * `find()` は**領収書を返さない**。二つの正しい答えが在る(rework S-3):
       *   ① `null` —— 鍵は合うが緑でない
       *   ② `ledger-unreadable` を投げる —— 形が壊れている(`exit` が整数でない)
       * **読めないを不在に潰さない**(AC-16 / review F-2)。どちらであれ、
       * **偽装された領収書が畳みの根拠になる道は無い。**
       */
      let got = 'threw';
      try { got = fold2.find(k, { file }); }
      catch (e) {
        assert.strictEqual(e.bailCode, 'ledger-unreadable',
          `find() が語彙外の理由で倒れた: ${e.message}`);
      }
      assert.ok(got === null || got === 'threw',
        `find() が ${imp.name} の領収書を返した — 緑しか畳まない (FR-03)`);
    }
    /**
     * **壊して鳴らす — 二層あることを、層ごとに撃つ**(rework S-3 の後)。
     *
     * 読む側の検め(`selectRows` の `validateReceipt`)が入ったので、
     * `exit: "0"` の行は**厳密等号に届く前に** `ledger-unreadable` で倒れる。
     * ゆえに緩い等号だけを注入しても `find()` は倒れたままであり、
     * **「鳴った」の理由が注入だと言えない**(第37条)。
     * そこで**層を一つずつ抜いて、それぞれが載っていることを撃つ**:
     *
     *   層① 形の検め(読む側)を抜く → **厳密等号がまだ拒む**(find は null)
     *   層② ①に加えて等号を緩める   → **通る**(= `===` が確かに効いていた)
     *
     * 片方でも常に同じ答えなら、その層は載っていない。
     */
    const NO_TYPE_CHECK = [
      '  if (!(r.exit === null || Number.isInteger(r.exit))) {',
      '  if (false) {',
    ];
    const probeFound = (mut, file) => {
      const r = runNode(`const f=require(${JSON.stringify(mut)});
        let out='threw';
        try { out = (f.find(f.key(), {file:${JSON.stringify(file)}}) !== null); } catch (e) { out='threw:'+e.message; }
        console.log('found=' + out);`);
      return String(r.stdout) + String(r.stderr);
    };
    const impostorLedger = () => {
      const file = tmpLedger('m05-broken');
      fs.writeFileSync(file, JSON.stringify({
        at: new Date().toISOString(), key: k, exit: '0', run: fold2.runId(), summary: 'x' }) + '\n');
      return file;
    };
    // 層①: 形の検めだけ抜く —— **厳密等号が単独で拒まねばならない**
    withMutant(
      s => s.replace(NO_TYPE_CHECK[0], NO_TYPE_CHECK[1]),
      (mut) => {
        assert.match(probeFound(mut, impostorLedger()), /found=false/,
          '**形の検めを抜いただけで `exit:"0"` が畳みの根拠になった** — ' +
          '厳密等号が載っていない(prove M-05 / 第58条: 守りは一層であってはならない)');
      });
    // 層②: ①に加えて等号を緩める —— **通ることで `===` が効いていたと判る**
    withMutant(
      s => s.replace(NO_TYPE_CHECK[0], NO_TYPE_CHECK[1])
            .replace('  const green = mine.filter(r => r.exit === 0);',
                     '  const green = mine.filter(r => r.exit == 0);'),
      (mut) => {
        assert.match(probeFound(mut, impostorLedger()), /found=true/,
          `緩い等号に戻した写しがまだ拒んだ — 注入が当たっていない (第37条)`);
      });
  });

  await test('fold: P-2 の恒等式の錠は数を配る口の上に立つ (prove M-07)', () => {
    /**
     * **prove 相 M-07 の無音を塞ぐ門。**
     *
     * 実測: `inspected().closed()` を `return true` に潰しても**一本も鳴らなかった**。
     * 理由は単純である —— **誰も `closed()` を呼んでいなかった**
     * (`grep -rn '.closed()'` の答えが 0 件)。
     * AC-15 は「錠は畳みの関数の外に立つ」と言うが、**呼ばれない錠は外でも内でもない。**
     * ゆえに `tally()`(数が読まれる唯一の口)が自ら恒等式を検める形へ移した。
     */
    const fold2 = require(FOLD_JS);
    // ① 健全な写像は数を配る
    const seen = fold2.inspected();
    seen.take('a#first-screen', 's@quick', () => ({ ok: true }), 1);
    seen.take('a#first-screen', 's@full', () => ({ ok: true }), 1);
    const t = seen.tally();
    assert.strictEqual(t.total, 2);
    assert.strictEqual(t.executed + t.reused, t.total, '健全な写像で恒等式が閉じない');
    assert.strictEqual(seen.closed, undefined,
      '**飾りの錠 `closed()` が戻ってきた** — rework 相で消した (review R-1 / 第48条 c)。' +
      '本物の錠は `tally()` にただ一つ在る');
    // ② **錠が数を配る口の上に在ること。** そこで倒れねば誰も気づかない
    const src = fs.readFileSync(FOLD_JS, 'utf8');
    assert.ok(/tally\(\) \{[\s\S]{0,80}if \(executed \+ reused !== total\) \{[\s\S]{0,200}throw new Error/.test(src),
      '`tally()` が恒等式を検めていない — **呼ばれない `closed()` は錠ではない** (prove M-07)');
    // ③ **壊して鳴らす**: 錠を `tally()` から抜く
    withMutant(
      s => s.replace('      if (executed + reused !== total) {', '      if (false) {'),
      (mut) => {
        const r = runNode(`const f=require(${JSON.stringify(mut)});
          const s=require('fs').readFileSync(${JSON.stringify(mut)},'utf8');
          console.log('locked=' + /tally\\(\\) \\{[\\s\\S]{0,80}if \\(executed \\+ reused !== total\\)/.test(s));`);
        assert.match(String(r.stdout), /locked=false/,
          `錠を抜く注入が当たっていない: ${r.stdout}${r.stderr}`);
      });
  });


  await test('fold: 緑しか畳まない — 赤い領収書は再走を呼ぶ', () => {
    const k = fold.key();
    // (a) exit != 0 の領収書しか無い
    const red = tmpLedger('ac07-red');
    fold.append({ key: k, exit: 1, summary: 'Paradise self-test: 491 passed, 1 failed' }, { file: red });
    const dRed = fold.decide({ file: red });
    assert.strictEqual(dRed.fold, false, '赤い領収書で畳んだ — findings §4.1 Tuist #8570 の事故そのもの');
    assert.strictEqual(dRed.bail, 'not-green', `赤い領収書の bail が ${dRed.bail}`);
    assert.strictEqual(fold.find(k, { file: red }), null, 'find() が赤い領収書を返した');
    // (b) exit === null(打ち切り)の領収書しか無い
    const cut = tmpLedger('ac07-cut');
    fold.append({ key: k, exit: null, summary: '' }, { file: cut });
    const dCut = fold.decide({ file: cut });
    assert.strictEqual(dCut.fold, false, '打ち切られた走行で畳んだ');
    assert.strictEqual(dCut.bail, 'truncated', `打ち切りの bail が ${dCut.bail} — not-green と混ぜてはならない`);
    // **壊して鳴らす**: 採用条件から exit === 0 を外す
    withMutant(
      s => s.replace('  const green = mine.filter(r => r.exit === 0);\n  if (green.length) return { fold: true, bail: null, key: k, receipt: green[green.length - 1] };',
                     '  const green = mine;\n  if (green.length) return { fold: true, bail: null, key: k, receipt: green[green.length - 1] };'),
      (mut) => {
        const r = runNode(`const f=require(${JSON.stringify(mut)});
          console.log('fold=' + f.decide({file:${JSON.stringify(red)}}).fold);`);
        assert.match(String(r.stdout), /fold=true/,
          `緑の条件を外した写しがまだ畳まなかった — 注入が当たっていない: ${r.stdout}${r.stderr}`);
      });
  });

  await test('fold: 領収書の無い畳みは存在しない', () => {
    // 台帳が**無い**
    const none = path.join(SAND, 'no-such-dir', 'ledger.jsonl');
    const dNone = fold.decide({ file: none });
    assert.strictEqual(dNone.fold, false, '台帳が無いのに畳んだ');
    assert.strictEqual(dNone.bail, 'no-receipt', `不在の bail が ${dNone.bail}`);
    assert.deepStrictEqual(fold.read({ file: none }), [],
      '不在の台帳が空以外を答えた — 不在は初期状態である (AC-08)');
    // 台帳が**空**
    const empty = tmpLedger('ac08-empty');
    fs.writeFileSync(empty, '');
    assert.strictEqual(fold.decide({ file: empty }).bail, 'no-receipt', '空の台帳の bail が no-receipt でない');
    // 鍵が**合わない**は別の語である(第37条: 二つの不在を一つの語にしない)
    const other = tmpLedger('ac08-other');
    fold.append({ key: '0'.repeat(16), exit: 0, summary: 's' }, { file: other });
    assert.strictEqual(fold.decide({ file: other }).bail, 'key-miss',
      '鍵違いを no-receipt と呼んだ — 入力が変わったのか台帳が無いのか区別できない');
    // **壊して鳴らす**: 台帳が空でも畳んだふりをする(`Executed 0 out of 1` を名乗る)
    withMutant(
      s => s.replace("    return { ...bail(rows.length ? 'key-miss' : 'no-receipt'), key: k, receipt: null };",
                     '    return { fold: true, bail: null, key: k, receipt: null };'),
      (mut) => {
        const r = runNode(`const f=require(${JSON.stringify(mut)});
          const d=f.decide({file:${JSON.stringify(empty)}});
          console.log('fold=' + d.fold + ' receipt=' + (d.receipt === null));`);
        // 写しは「領収書が無いのに畳む」と言う。**それがこの門の赤の条件そのものである**
        // (上の `assert.strictEqual(dNone.fold, false, …)` が実物に対して撃っている判定)。
        assert.match(String(r.stdout), /fold=true receipt=true/,
          `畳んだふりをする注入が当たっていない: ${r.stdout}${r.stderr}`);
      });
  });

  await test('fold: =repo は鍵が合えば畳まれる', () => {
    const k = fold.key();
    const file = tmpLedger('ac09');
    fold.append({ key: k, exit: 0, summary: 'Paradise self-test: 492 passed, 0 failed' }, { file });
    const d = fold.decide({ file, env: { ...process.env, PARADISE_ABODE: 'repo' } });
    assert.strictEqual(d.fold, true, `鍵が合う緑の領収書が在るのに畳まなかった: bail=${d.bail}`);
    assert.strictEqual(d.key, k);
    assert.strictEqual(fold.say('Paradise fold:', 'runs', d),
      `Paradise fold: Executed 0 out of 1 runs (1 reused, key=${k})`,
      '畳んだときの名乗りの綴りが契約と違う (requirements §4.2)');
    // **壊して鳴らす**: 材料の 1 本を書き換えれば鍵が動き、bail=key-miss に戻る
    const d2 = fold.decide({ file, env: { ...process.env, PARADISE_ARCHIFY: '/some/other/archify.mjs' } });
    assert.strictEqual(d2.fold, false, '入力が変わったのに畳んだ');
    assert.strictEqual(d2.bail, 'key-miss', `入力が変わったときの bail が ${d2.bail}`);
    assert.strictEqual(fold.say('Paradise fold:', 'runs', d2),
      'Paradise fold: Executed 1 out of 1 runs (0 reused, bail=key-miss)',
      '畳まなかったときの名乗りの綴りが契約と違う');
  });

  // ── Atlas の畳み (FR-06 / FR-07) ────────────────────────────────────

  await test('fold: 畳みの鍵は成果物のバイト列である', () => {
    /**
     * **AC-11。** 名(主題名・道名)でも中間表現でもなく、**HTML のバイト列**で畳む。
     * ブラウザ検査は 1 主題 2 回 × 6 主題 × 6 道 = 72 回。実測(M-1 / D-7)では
     * 相異なる HTML は 16 種なので、走らせるべきは 32 回・畳めるのは 40 回である。
     *
     * ⚠️ **ここでブラウザを 72 回起こさない。** この門が裁くのは**畳みの算法**であって
     * 描画器ではない(それは `🗺 Atlas` 段が撃つ)。ゆえに `fold.inspected()` に
     * **実測された成果物の形**を与えて数を数える。
     * **測っていないものを緑と呼ばないために**、「1 主題 2 検査」「4 主題は全道で同一」
     * という前提そのものを atlas のソースから確かめる。
     */
    const atlasSrc = fs.readFileSync(path.join(GRAPH, 'atlas.js'), 'utf8');
    assert.ok(/fold\.artifactKey\(r\.html\)/.test(atlasSrc),
      'atlas が成果物のバイト列で鍵を採っていない — 名や IR で畳めば第16条違反');
    assert.ok(/#first-screen/.test(atlasSrc) && /#motion/.test(atlasSrc),
      '二つの検査が同じ鍵を共有している — 2 本目が 1 本目の答えを受け取る(実測で踏んだ)');
    assert.ok(/checkAllScales/.test(atlasSrc),
      '--all-scales が無い — 道の中には畳める対が 1 つも無いので、AC-11 は実現不能になる (D-7)');

    // 実測の形(findings §1.6 / M-1): 4 主題は全道でバイト同一、2 主題は道ごとに変わる
    const SAME = ['hierarchy', 'dispatch', 'run', 'wiring'];
    const VARY = ['conclave', 'dag'];
    const SCALES = ['quick', 'standard', 'full', 'reform', 'counsel', 'cartography'];
    const seen = fold.inspected();
    for (const scale of SCALES) {
      for (const s of [...SAME, ...VARY]) {
        const htmlKey = SAME.includes(s) ? `same-${s}` : `vary-${s}-${scale}`;
        for (const kind of ['first-screen', 'motion']) {
          seen.take(`${htmlKey}#${kind}`, `${s}@${scale}`, () => ({ ok: true }), 1);
        }
      }
    }
    const t = seen.tally();
    assert.strictEqual(t.total, 72, `総検査が ${t.total} 回 — 72 でなければ前提が違う`);
    assert.strictEqual(t.executed, 32,
      `走らせた検査が ${t.executed} 回(期待 32)— 畳みの鍵が成果物のバイト列になっていない`);
    assert.strictEqual(t.reused, 40, `畳んだ検査が ${t.reused} 件(期待 40)`);
    assert.strictEqual(t.executed + t.reused, t.total, '恒等式が閉じない (AC-15)');

    // **壊して鳴らす**: 1 道だけ HTML を 1 バイト変える細工を入れると、実行数が増える
    const rigged = fold.inspected();
    for (const scale of SCALES) {
      for (const s of [...SAME, ...VARY]) {
        // hierarchy だけ道ごとに別のバイト列に化ける細工
        const htmlKey = s === 'hierarchy' ? `rigged-${s}-${scale}`
          : SAME.includes(s) ? `same-${s}` : `vary-${s}-${scale}`;
        for (const kind of ['first-screen', 'motion']) {
          rigged.take(`${htmlKey}#${kind}`, `${s}@${scale}`, () => ({ ok: true }), 1);
        }
      }
    }
    const t2 = rigged.tally();
    assert.ok(t2.executed > t.executed,
      `細工した成果物が畳まれた(実行数 ${t2.executed} が ${t.executed} のまま)— ` +
      '中身が違う成果物を同一と見なしている (AC-11)');
    assert.strictEqual(t2.executed, 42, `細工後の実行数が ${t2.executed}(期待 42 = 32 + 5 道 × 2 検査)`);
  });

  await test('fold: 成果物の鍵は成果物の全長から採る (prove M-08)', () => {
    /**
     * **prove 相 M-08 の無音を塞ぐ門。**
     *
     * 実測: `artifactKey` を **HTML の先頭 1KB だけ**から採る変異を撃ったところ、
     * **20 門も 7 門も一本も鳴らなかった**。理由は第62条そのものである ——
     * 上の AC-11 の門は `fold.inspected()` に**作り物の鍵**(`same-hierarchy` 等)を
     * 与えて数を数えており、**鍵がどこから来たかを一度も撃っていなかった。**
     * 門の作法(写像に数を入れて数える)が、鍵の由来の層を丸ごと隠していた。
     *
     * 先頭 1KB は 6 主題すべてで同じ `<!DOCTYPE html>…` である。
     * その変異の下では **72 検査すべてが 1 つの裁定に畳まれ**、71 件が誰にも検められない。
     * **`Executed 1 out of 72` を名乗る畳みは、測定ではない。**
     */
    const fold2 = require(FOLD_JS);
    // ① **後ろだけが違う二つの成果物は、別の鍵を持たねばならない**
    const head = Buffer.from('<!DOCTYPE html><html><head><style>' + 'x'.repeat(4000) + '</style></head><body>');
    const a = Buffer.concat([head, Buffer.from('<svg id="hierarchy"></svg></body></html>')]);
    const b = Buffer.concat([head, Buffer.from('<svg id="conclave"!></svg></body></html>')]);
    assert.strictEqual(a.slice(0, 1024).equals(b.slice(0, 1024)), true,
      '前提が崩れた — 先頭 1KB が同じ二つの成果物を作れていない');
    assert.notStrictEqual(fold2.artifactKey(a), fold2.artifactKey(b),
      '**先頭が同じで後ろが違う成果物が同じ鍵を持った** — 後ろの差を見逃す鍵は ' +
      '72 検査を 1 つの裁定に畳む (prove M-08 / AC-11)');
    // ② **長さだけが違う成果物**も別の鍵(長さ検査に逃げていないことの裏面)
    assert.notStrictEqual(fold2.artifactKey(a), fold2.artifactKey(Buffer.concat([a, Buffer.from('\n')])),
      '末尾に 1 バイト足しても鍵が動かない');
    // ③ バイト同一なら同じ鍵(畳みが成立する条件そのもの)
    assert.strictEqual(fold2.artifactKey(a), fold2.artifactKey(Buffer.from(a)),
      'バイト同一の成果物が別の鍵を持った — 畳みが一度も効かなくなる');
    // ④ **壊して鳴らす**: 先頭 1KB だけから採る変異を入れる
    withMutant(
      s => s.replace('  const buf = Buffer.isBuffer(fileOrBuffer) ? fileOrBuffer : fs.readFileSync(fileOrBuffer);\n  const h = crypto.createHash(\'sha256\');\n  h.update(buf);',
                     '  const buf0 = Buffer.isBuffer(fileOrBuffer) ? fileOrBuffer : fs.readFileSync(fileOrBuffer);\n  const buf = buf0.slice(0, 1024);\n  const h = crypto.createHash(\'sha256\');\n  h.update(buf);'),
      (mut) => {
        const r = runNode(`const f=require(${JSON.stringify(mut)});
          const head=Buffer.from('<!DOCTYPE html><head><style>'+'x'.repeat(4000)+'</style>');
          const a=Buffer.concat([head,Buffer.from('<svg id="hierarchy"></svg>')]);
          const b=Buffer.concat([head,Buffer.from('<svg id="conclave"!></svg>')]);
          console.log('same=' + (f.artifactKey(a) === f.artifactKey(b)));`);
        assert.match(String(r.stdout), /same=true/,
          `先頭だけを食わせる注入が当たっていない: ${r.stdout}${r.stderr}`);
      });
  });

  await test('fold: 領収書の形は台帳へ入る前に裁かれる (prove M-13)', () => {
    /**
     * **prove 相 M-13 の無音を塞ぐ門。**
     *
     * 実測: `validateReceipt` の本体を素通しにする変異(`return r;` を先頭に置く)を
     * 撃っても、**一本も鳴らなかった**。門は `append()` の**成功**しか撃っておらず、
     * **拒むべきものを拒むか**を一度も撃っていなかった —— 第62条 c の言う
     * 「無罪と宣言した形」の裏返しであり、**法に書かれた盲点**である。
     *
     * 形の検めが死ぬと、`key` が 4 桁の行や `exit` が文字列の行が台帳へ入る。
     * その台帳は次の走行で `ledger-unreadable` にもならず、**静かに畳みの根拠になる。**
     */
    const fold2 = require(FOLD_JS);
    /** **拒まれねばならない形**(負の fixture。一行ずつ理由を持つ)。 */
    const MALFORMED = [
      { r: { key: 'abcd', exit: 0, summary: 's', at: 'x' }, why: 'key が 16 桁でない' },
      { r: { key: 'Z'.repeat(16), exit: 0, summary: 's', at: 'x' }, why: 'key が 16 進でない' },
      { r: { key: 'a'.repeat(16), exit: '0', summary: 's', at: 'x' }, why: 'exit が整数でも null でもない' },
      { r: { key: 'a'.repeat(16), exit: 1.5, summary: 's', at: 'x' }, why: 'exit が整数でない' },
      { r: { key: 'a'.repeat(16), exit: 0, at: 'x' }, why: 'summary が無い' },
      { r: { key: 'a'.repeat(16), exit: 0, summary: 's', at: '' }, why: 'at が空' },
      { r: null, why: '領収書が物ですらない' },
    ];
    for (const m of MALFORMED) {
      const file = tmpLedger('m13');
      assert.throws(() => fold2.append(m.r, { file }),
        `**${m.why} 形の領収書が台帳へ入った** — 形の検めが死ねば、壊れた行が静かに畳みの根拠になる (prove M-13)`);
      // 拒まれた行が**台帳に残っていない**こと(投げた後に半分書けていないか)
      const rows = (() => { try { return fold2.read({ file }); } catch { return ['読めない']; } })();
      assert.strictEqual(rows.length, 0,
        `拒んだはずの領収書が台帳に ${rows.length} 行残った (${m.why})`);
    }
    // **正しい形は通る**(負の fixture だけでは「何も通さない実装」が緑になる)
    const ok = tmpLedger('m13-ok');
    assert.doesNotThrow(() => fold2.append({ key: 'a'.repeat(16), exit: 0, summary: 's' }, { file: ok }));
    assert.doesNotThrow(() => fold2.append({ key: 'b'.repeat(16), exit: null, summary: '' }, { file: ok }),
      '打ち切り (exit: null) の領収書が拒まれた — truncated を刻めなくなる (AC-07 b)');
    assert.strictEqual(fold2.read({ file: ok }).length, 2);
    // **壊して鳴らす**: 検めを素通しにする
    withMutant(
      s => s.replace("function validateReceipt(r) {\n  if (!r || typeof r !== 'object') throw new Error('fold: 領収書が物ではない');",
                     "function validateReceipt(r) {\n  return r;\n  if (!r || typeof r !== 'object') throw new Error('fold: 領収書が物ではない');"),
      (mut) => {
        const file = tmpLedger('m13-broken');
        const r = runNode(`const f=require(${JSON.stringify(mut)});
          let threw=false;
          try { f.append({key:'abcd',exit:0,summary:'s'},{file:${JSON.stringify(file)}}); } catch { threw=true; }
          console.log('threw=' + threw);`);
        assert.match(String(r.stdout), /threw=false/,
          `検めを素通しにする注入が当たっていない: ${r.stdout}${r.stderr}`);
      });
  });

  await test('fold: 写した裁定は元を名指す (第21条 b)', () => {
    /**
     * **AC-12。** `hierarchy@counsel` が赤いとき、その裁定が `hierarchy@quick` の
     * 写しだと判らなければ、直せない。**辿れない発見は直せない発見である。**
     */
    const seen = fold.inspected();
    const a = seen.take('k1#first-screen', 'hierarchy@quick', () => ({ ok: true, kind: 'fits' }), 1);
    const b = seen.take('k1#first-screen', 'hierarchy@counsel', () => ({ ok: false }), 1);
    assert.strictEqual(a.reusedFrom, null, '初出の検査が写し元を名乗った');
    assert.strictEqual(b.reusedFrom, 'k1#first-screen', '写した裁定が写し元の鍵を名乗らない');
    assert.strictEqual(b.reusedBy, 'hierarchy@quick',
      `写した裁定が**誰の**裁定かを名乗らない (${b.reusedBy}) — 第21条 b`);
    assert.strictEqual(b.ok, true, '写した裁定の中身が写し元と違う — 写しになっていない');
    // 出力の綴り: `grep -c 'reused: html=' <出力>` が畳んだ件数と一致する(AC-12 の判定基準)
    const atlasSrc = fs.readFileSync(path.join(GRAPH, 'atlas.js'), 'utf8');
    assert.ok(/\(reused: html=\$\{r\.reusedFrom\}/.test(atlasSrc),
      'atlas の裁定行が `(reused: html=<sha16>)` を出していない — 畳んだ件数を grep で数えられない');
    // **壊して鳴らす**: 写し元を名乗らず ok だけを書く
    assert.ok(/reusedBy/.test(atlasSrc),
      '写し元の**主題と道**を名乗っていない — 鍵だけでは「どの図の裁定か」が辿れない');
  });

  await test('fold: 持ち回しは検査を減らさない — 裁定の本数が一致する', () => {
    /**
     * **AC-13 / P-3。** この畳みは**撃つ回数を減らさない**ので、原理的に偽の緑が出ない。
     * 裁定の本数が一致し、各図の `ok` が一致することだけを求める。
     *
     * ⚠️ **借り物には一行も触れない**(第20条)。`browserFactory` は
     * `overlay/vendor/archify/bin/visual-check.mjs:721-725` に**既に在る**注入口である。
     *
     * ⚠️ **Chrome が居ない機では skip を名乗る。** 測れないことを緑と混同しない(第37条)。
     */
    const pool = fold.pooledBrowserFactory();
    assert.strictEqual(typeof pool.factory, 'function', '持ち回しの器が factory を持たない');
    assert.strictEqual(typeof pool.dispose, 'function',
      'dispose が無い — close() を無力化したまま誰も閉じなければ、プロファイルが漏れる (第50条の裏面)');
    assert.strictEqual(pool.launches(), 0, '起動していないのに起動回数が 0 でない');
    // 覆いの形: close() だけを無力化し、他は本物へ委ねる
    const src = fs.readFileSync(FOLD_JS, 'utf8');
    assert.ok(/if \(k === 'close'\) return async \(\) => \{\};/.test(src),
      'close() を無力化する覆いが無い — 持ち回しにならない');
    assert.ok(/try \{ await real\.close\(\) \} catch \{\}|try \{ await real\.close\(\); \} catch \{\}/.test(src),
      'dispose が本物の close() を呼んでいない — SIGKILL への昇格も profileRoot の掃除も走らない');
    // **持ち回しが実際に 1 つの実体を配ることを撃つ**(借り物を起こさずに形だけ測る)
    const fake = { closed: 0, close: async function () { this.closed++; }, mark: 'real' };
    const p2 = fold.pooledBrowserFactory({ load: async () => ({ ChromeVisualBrowser: function () { return fake; } }) });
    return (async () => {
      const b1 = await p2.factory('/fake/chrome');
      const b2 = await p2.factory('/fake/chrome');
      assert.strictEqual(p2.launches(), 1, `起動が ${p2.launches()} 回 — 持ち回していない`);
      assert.strictEqual(b1, b2, '二度目の呼びが別の実体を返した — 持ち回していない');
      await b1.close();
      assert.strictEqual(fake.closed, 0, '覆いが close() を素通しした — 持ち回している最中に閉じられる');
      await p2.dispose();
      assert.strictEqual(fake.closed, 1,
        'dispose が本物を閉じなかった — **残骸が漏れる**(実測の既往症: 検器 1 回で +2 / 483→529)');
    })();
  });

  // ── 名乗りと出口 (FR-09 / FR-10) ────────────────────────────────────

  await test('fold: bail は閉じた語彙で名乗る (揟5)', () => {
    assert.deepStrictEqual([...fold.BAIL_CODES].sort(),
      ['disabled', 'key-miss', 'ledger-unreadable', 'no-receipt', 'not-green', 'truncated', 'undeclared-state'],
      'bail の語彙が AC-16 の 7 語と一致しない');
    // 語彙外を組み立てようとしたら、その場で倒れる
    let threw = false;
    try { fold.decide({ file: tmpLedger('ac16'), forceBail: 'whatever' }); } catch { threw = true; }
    assert.ok(!threw, '健全な decide が倒れた');
    // **台帳をディレクトリに置き換える** —— 読めないは skip ではなく赤である
    //   (第62条 b ①の実測:「ディレクトリを一つ作るだけで 484 門が全滅した」)
    const dir = tmpLedger('ac16-dir');
    fs.mkdirSync(dir, { recursive: true });
    const d = fold.decide({ file: dir });
    assert.strictEqual(d.fold, false, '読めない台帳で畳んだ');
    assert.strictEqual(d.bail, 'ledger-unreadable',
      `読めない台帳の bail が ${d.bail} — no-receipt で静かに全走してはならない (AC-16)`);
    // 壊れた JSON 行も「読めない」である(空ではない)
    const bad = tmpLedger('ac16-bad');
    fs.writeFileSync(bad, '{"key":"aaaa"\nnot json at all\n');
    assert.strictEqual(fold.decide({ file: bad }).bail, 'ledger-unreadable',
      '壊れた行を黙って読み飛ばした — 落ちた領収書は不在と区別できない');
    // **壊して鳴らす**: 語彙外の bail を作ろうとすると engine が倒れる
    let vocabGuard = false;
    try { require(FOLD_JS).decide({ file: dir, env: { PARADISE_NO_FOLD: '2' } }); } catch { vocabGuard = true; }
    assert.ok(!vocabGuard, '健全な経路が倒れた');
    withMutant(
      s => s.replace("    return { ...bail(rows.length ? 'key-miss' : 'no-receipt'), key: k, receipt: null };",
                     "    return { ...bail('whatever'), key: k, receipt: null };"),
      (mut) => {
        const empty = tmpLedger('ac16-vocab');
        fs.writeFileSync(empty, '');
        const r = runNode(`const f=require(${JSON.stringify(mut)});
          try { f.decide({file:${JSON.stringify(empty)}}); console.log('passed'); }
          catch (e) { console.log('threw:' + e.message); }`);
        assert.match(String(r.stdout), /threw:.*語彙外/,
          `語彙外の bail が黙って通った: ${r.stdout}${r.stderr}`);
      });
  });

  await test('fold: bail は機械可読である', () => {
    const file = tmpLedger('ac17');
    fs.writeFileSync(file, '');
    const r = spawnSync(process.execPath, [FOLD_JS, 'fold-status', '--json'],
      { encoding: 'utf8', cwd: ROOT, env: { ...process.env, PARADISE_FOLD_LEDGER: file } });
    assert.strictEqual(r.status, 0, `fold-status --json が exit ${r.status}: ${r.stderr}`);
    const j = JSON.parse(r.stdout);
    for (const f of ['total', 'executed', 'reused', 'bails']) {
      assert.ok(Object.prototype.hasOwnProperty.call(j, f), `fold-status --json に ${f} が無い`);
    }
    assert.ok(Array.isArray(j.bails), 'bails が配列でない');
    assert.strictEqual(typeof j.bails[0], 'object',
      'bails が人間向けの文字列だけである — 構造を持たねば機械は読めない (findings §2.5 Chromatic)');
    assert.strictEqual(j.bails[0].code, 'no-receipt');
    assert.ok(typeof j.bails[0].subject === 'string' && j.bails[0].subject,
      'bail が subject を名乗らない — どの走行が畳めなかったか判らない');
    assert.strictEqual(j.executed + j.reused, j.total, `恒等式が閉じない: ${JSON.stringify(j)}`);
    // **壊して鳴らす**: bails を文字列だけにする
    withMutant(
      s => s.replace('    bails: d.bail ? [{ code: d.bail, subject }] : [],',
                     '    bails: d.bail ? [`${d.bail} (${subject})`] : [],'),
      (mut) => {
        const rr = runNode(`const f=require(${JSON.stringify(mut)});
          console.log('kind=' + typeof f.status({file:${JSON.stringify(file)}}).bails[0]);`);
        assert.match(String(rr.stdout), /kind=string/,
          `構造を潰した写しがまだ物を返している: ${rr.stdout}${rr.stderr}`);
      });
  });

  await test('fold: --no-fold は畳みを完全に切る (揟6)', () => {
    const k = fold.key();
    const file = tmpLedger('ac18');
    fold.append({ key: k, exit: 0, summary: 'Paradise self-test: 492 passed, 0 failed' }, { file });
    assert.strictEqual(fold.decide({ file }).fold, true, '前提が崩れた — 畳める状態を作れていない');
    // ① env の口
    const dEnv = fold.decide({ file, env: { ...process.env, PARADISE_NO_FOLD: '1' } });
    assert.strictEqual(dEnv.fold, false, 'PARADISE_NO_FOLD=1 でも畳んだ');
    assert.strictEqual(dEnv.bail, 'disabled', `切ったときの bail が ${dEnv.bail}`);
    assert.strictEqual(fold.say('Paradise fold:', 'runs', dEnv),
      'Paradise fold: Executed 1 out of 1 runs (0 reused, bail=disabled)', '出口の名乗りの綴りが契約と違う');
    // ② 旗の口。**実際に走行を撃って `reused` の語が出ないことを確かめる**(第16条)
    const r = spawnSync(process.execPath, [PARADISE, '--no-fold', '--gate-list'],
      { encoding: 'utf8', cwd: ROOT, env: { ...process.env, PARADISE_FOLD_LEDGER: file } });
    assert.strictEqual(r.status, 0,
      `--no-fold が exit ${r.status} で死んだ — 塊の die() に落ちている (design §4.4): ${String(r.stderr).slice(0, 200)}`);
    assert.strictEqual((String(r.stdout).match(/reused/g) || []).length, 0,
      `--no-fold の走行が reused を名乗った: ${String(r.stdout).split('\n').slice(-3).join(' / ')}`);
    // ③ 三者で同じ綴り・同じ意味(requirements §5)
    for (const f of [PARADISE, path.join(GRAPH, 'census.js'), path.join(GRAPH, 'atlas.js')]) {
      assert.ok(/--no-fold/.test(fs.readFileSync(f, 'utf8')),
        `${path.basename(f)} が --no-fold を知らない — 三者で同じ綴りでなければ出口ではない (requirements §5)`);
    }
    /**
     * ④ **綴りが在ることは、効くことではない**(prove 相 M-10 / M-11 の無音)。
     *
     * 実測: `atlas.js` の `const folding = !(opts.noFold || …)` を `= true` に潰す変異
     * (M-10)と、`census.js` の畳みを `--no-fold` でも切らない変異(M-11)は、
     * **どちらも一本も鳴らなかった** —— ③ の検めが**ソースの綴り**しか見ておらず、
     * 「旗を受け取るが何もしない」実装を素通ししていたからである(第16条)。
     *
     * ゆえに**三者すべてを実際に撃ち、畳みが切れたことを出力で読む。**
     * census / atlas は本体が重いので、**畳みの判断だけを露わにする口**
     * (`fold-status`)ではなく、engine を require して `noFold` の経路を直に撃つ。
     */
    const fld = require(FOLD_JS);
    const kk = fld.key();
    const fl = tmpLedger('ac18-behaviour');
    fld.append({ key: kk, exit: 0, summary: 'Paradise self-test: 499 passed, 0 failed' }, { file: fl });
    // atlas: `--no-fold` の下で `folding` が偽になる = 写像を一度も使わない
    const atlasSrc = fs.readFileSync(path.join(GRAPH, 'atlas.js'), 'utf8');
    assert.ok(/const folding = !\(opts\.noFold \|\| process\.env\.PARADISE_NO_FOLD === '1'\);/.test(atlasSrc),
      'atlas の `folding` が旗を読んでいない — **旗を受け取るが何もしない**実装である (prove M-10)');
    // atlas を**実際に撃つ**: `--no-fold` を付けた走行は畳んだ件数 0 を名乗らねばならない
    //   (ブラウザを起こさない `--static` の道で、畳みの算法だけを見る)
    const ar = spawnSync(process.execPath, [path.join(GRAPH, 'atlas.js'), 'check',
      '--scale', 'quick', '--static', '--no-fold'],
      { encoding: 'utf8', cwd: ROOT, timeout: 120000, env: { ...process.env, PARADISE_FOLD_LEDGER: fl } });
    assert.strictEqual((String(ar.stdout).match(/reused: html=/g) || []).length, 0,
      `atlas --no-fold の走行が reused を名乗った — 旗を黙殺している (prove M-10): ` +
      `${String(ar.stdout).split('\n').slice(-4).join(' / ')}`);
    // census: `noFold` を渡すと**領収書を読まない**(畳まない)
    const census = require(path.join(GRAPH, 'census.js'));
    const censusSrc = fs.readFileSync(path.join(GRAPH, 'census.js'), 'utf8');
    assert.ok(/opts\.noFold \|\| process\.env\.PARADISE_NO_FOLD === '1'\s*\n?\s*\?\s*\{[^}]*bail: 'disabled'[^}]*\}\s*:\s*fold\.decide\(/.test(censusSrc),
      'census の畳みが旗を読んでいない — **旗を受け取るが何もしない**実装である (prove M-11)');
    assert.strictEqual(typeof census.census, 'function', 'census の口が消えた');
    /**
     * **綴りが在ることは、効くことではない**(prove M-11 の教訓)。ゆえに**実際に撃つ**。
     * 畳める台帳を置き、`--no-fold` の有無で名乗りが変わることを出力で読む。
     * `--no-fold` は子プロセスを起こすので `--no-tests` を併せる ——
     * **測りたいのは「台帳を読むか」であって census の本体ではない**(第62条 a)。
     */
    const cf = tmpLedger('m11-behaviour');
    fold.append({ key: fold.key(), exit: 0, summary: 'Paradise self-test: 500 passed, 0 failed' }, { file: cf });
    const cOn = spawnSync(process.execPath, [path.join(GRAPH, 'census.js'), 'check'],
      { encoding: 'utf8', cwd: ROOT, timeout: 120000, env: { ...process.env, PARADISE_FOLD_LEDGER: cf } });
    assert.match(String(cOn.stdout), /Census self-test: Executed 0 out of 1 runs \(1 reused/,
      `前提が崩れた — 畳める台帳で census が畳まない: ${String(cOn.stdout).slice(-300)}`);
    const cOff = spawnSync(process.execPath,
      [path.join(GRAPH, 'census.js'), 'check', '--no-fold', '--no-tests'],
      { encoding: 'utf8', cwd: ROOT, timeout: 120000, env: { ...process.env, PARADISE_FOLD_LEDGER: cf } });
    assert.ok(!/1 reused/.test(String(cOff.stdout)),
      `**census が --no-fold でも領収書を読んだ** — 旗を黙殺している (prove M-11): ` +
      `${String(cOff.stdout).slice(-300)}`);
    // **壊して鳴らす**: 旗を黙殺する形にすると、上の二つの検めが鳴る
    for (const [file, from, to, who] of [
      [path.join(GRAPH, 'atlas.js'),
        "  const folding = !(opts.noFold || process.env.PARADISE_NO_FOLD === '1');",
        '  const folding = true;', 'atlas'],
    ]) {
      const raw = fs.readFileSync(file);
      const before = require('crypto').createHash('sha256').update(raw).digest('hex');
      try {
        const s = raw.toString('utf8');
        // **CRLF の現物に LF の綴りは当たらない**(prove 相で踏んだ)
        const needle = s.includes(from) ? from : from.replace(/\n/g, '\r\n');
        assert.ok(s.includes(needle), `${who} の変異点が見つからない — 形が変わった (第37条)`);
        fs.writeFileSync(file, s.replace(needle, to));
        const broken = fs.readFileSync(file, 'utf8');
        assert.ok(!/const folding = !\(opts\.noFold/.test(broken),
          `${who} の注入が当たっていない — 当たらない注入で「鳴らない」と結論してはならない`);
      } finally {
        fs.writeFileSync(file, raw);
        assert.strictEqual(require('crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
          before, `${who} の復元に失敗した — 現物を壊したまま残してはならない (第58条 c)`);
      }
    }
  });


  await test('fold: 綴り違いの旗は黙殺されない', () => {
    const r = spawnSync(process.execPath, [PARADISE, '--no-fould'], { encoding: 'utf8', cwd: ROOT });
    assert.notStrictEqual(r.status, 0,
      `綴り違いの旗が exit ${r.status} で通った — 畳みが有効なまま静かに走った (AC-19)`);
    assert.match(String(r.stderr) + String(r.stdout), /unknown flag/,
      '未知の旗を名乗らずに死んだ — 理由の無い赤は直せない');
    /**
     * census / atlas も同じ強さで拒む。
     *
     * ⚠️ **短い timeout を置く理由は速さではない。** 旗を黙殺する実装は
     * `check` の本体(census なら自己診断の全走 ≒ 6 分)へ進んでしまう ——
     * **進んでしまったこと自体が「黙殺した」証拠である**。ゆえに
     * 「素早く exit != 0」を要求し、**打ち切られた = 黙殺された**と読む(第16条)。
     */
    for (const f of [path.join(GRAPH, 'census.js'), path.join(GRAPH, 'atlas.js')]) {
      const rr = spawnSync(process.execPath, [f, 'check', '--no-fould'],
        { encoding: 'utf8', cwd: ROOT, timeout: 20000 });
      assert.ok(rr.status !== 0 && !rr.killed,
        `${path.basename(f)} が綴り違いの旗を黙殺した ` +
        `(exit ${rr.status} / killed=${rr.killed}) — 黙殺した実装は check の本体へ進み、` +
        '打ち切られるまで走り続ける (AC-19)');
      assert.match(String(rr.stderr) + String(rr.stdout), /unknown flag|未知の旗/,
        `${path.basename(f)} が未知の旗を名乗らずに死んだ`);
    }
  });

  // ── CI の形 (NFR-02 / NFR-05) ───────────────────────────────────────

  await test('fold: 全走が一本も走らない CI は測定ではない (第56条 d)', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'tribunal.yml'), 'utf8');
    // 段に分ける。**素の全走**(引数も PARADISE_NO_FOLD も無い `node tests/paradise.test.js`)を数える
    const steps = yml.split(/\n      - name: /).slice(1);
    let bare = 0;
    for (const s of steps) {
      const runs = [...s.matchAll(/node tests\/paradise\.test\.js(.*)/g)].map(m => m[1].trim());
      for (const tail of runs) {
        if (tail && !/^\|\|/.test(tail)) continue;             // 旗つきは素ではない
        if (/PARADISE_NO_FOLD/.test(s)) continue;              // 畳みを切った段は素の全走だが
        if (/PARADISE_ABODE=global/.test(s)) continue;         // global は別の入力である
        bare++;
      }
    }
    assert.ok(bare >= 1,
      `素の全走が CI に ${bare} 本しか無い — 畳んだ走行しか存在しない CI は測定ではない (第56条 d)`);
    // Self-test 段が畳みの根拠を作る段であること: `--no-fold` を書いていない。
    // ⚠️ **註釈を剥いでから読む。** 段の註釈は「この段に `--no-fold` を書かない」と
    //    **禁則そのものを綴る** —— 病を説明した文字列を違反として数えてはならない
    //    (`abode.js` の `codeOnly()` / `census.js` の註釈が同じ裁定を持つ)。
    const runOnly = (step) => step.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
    const selfTest = steps.find(s => /⚖️ Self-test/.test(s));
    assert.ok(selfTest, 'Self-test 段が消えた — 畳みの根拠を作る段である (NFR-02)');
    assert.ok(!/--no-fold/.test(runOnly(selfTest)),
      'Self-test 段に --no-fold が書かれている — 畳まなかったのか機構が壊れていたのか出力から区別できない');
    /**
     * ⚠️ **綴りの部分一致で読んではならない**(prove 相 W-04 の無音)。
     *
     * 実測: Self-test 段の `PARADISE_FOLD_LEDGER:` を `PARADISE_FOLD_LEDGER_DISABLED:` へ
     * **改名**する変異を撃ったところ、**一本も鳴らなかった** ——
     * この検めが `/PARADISE_FOLD_LEDGER/` の部分一致だったので、
     * **接尾辞の影に隠れて素通りした**。変数は死んでいるのに綴りは残る。
     * 領収書が刻まれない CI が緑で通る。
     *
     * ゆえに**環境変数の名を、行頭から `:` までで正確に読む。**
     */
    const envName = (step, name) =>
      new RegExp(`^\\s*${name}:\\s`, 'm').test(step);
    assert.ok(envName(selfTest, 'PARADISE_FOLD_LEDGER'),
      'Self-test 段が台帳の住所を渡していない — 領収書が刻まれない (AC-23 / prove W-04)。' +
      '**接尾辞つきの名(…_DISABLED 等)は別の変数である**');
    // 📒 Fold 段は**畳まれない**(畳みを見張る門が畳まれれば第56条 b の穴が開く)
    const foldStep = steps.find(s => /📒 Fold/.test(s));
    assert.ok(foldStep, '📒 Fold 段が無い — 建てた門を誰も走らせない (第44条 b)');
    assert.ok(/^\s*PARADISE_NO_FOLD:\s*'1'/m.test(foldStep),
      "📒 Fold 段が畳みを切っていない — 名は行頭から `:` まで正確に読む (prove W-04)");
    assert.ok(!/github\.workspace/.test(runOnly(foldStep)),
      '📒 Fold 段が現物の台帳を掴んでいる — 門が台帳を壊せば後続の段が偽の赤を出す (第58条 c)');
  });

  await test('fold: 台帳は並行追記で壊れない', async () => {
    // **単一プロセスの門は競合を見ない**(第62条の実測)。ゆえに子を実際に起こす。
    const writer = path.join(SAND, 'writer.js');
    fs.writeFileSync(writer, `const f=require(${JSON.stringify(FOLD_JS)});
      const file=process.argv[2], tag=process.argv[3], n=Number(process.argv[4]);
      for (let i=0;i<n;i++) f.append({key:'a'.repeat(16),exit:0,summary:tag+':'+i},{file});`);
    /**
     * 子の終了を**約束で**待つ。
     *
     * ⚠️ **`Atomics.wait` で回して待ってはならない。** 実測で踏んだ:
     * 同期のループは event loop を止めるので `child.exitCode` が永久に更新されず、
     * **門が固まった**(60 行書けた時点で止まった)。
     * **待ち方を間違えた門は、測る前に死ぬ。**
     */
    const spawnAll = (n, args) => {
      const kids = [];
      for (let i = 0; i < n; i++) {
        kids.push(require('child_process').spawn(process.execPath, args(i),
          { cwd: ROOT, stdio: 'ignore' }));
      }
      return Promise.all(kids.map(k => new Promise((res, rej) => {
        k.on('exit', (code) => res(code));
        k.on('error', rej);
      })));
    };
    const TRIALS = 30;
    for (const par of [2, 4, 8]) {
      const file = tmpLedger(`ac25-p${par}`);
      const codes = await spawnAll(par, (i) => [writer, file, 'w' + i, String(TRIALS)]);
      assert.ok(codes.every(c => c === 0), `並列度 ${par}: 書き手が exit ${codes} で死んだ`);
      const raw = fs.readFileSync(file, 'utf8');
      const lines = raw.split('\n').filter(l => l.trim() !== '');
      let broken = 0;
      for (const l of lines) { try { JSON.parse(l); } catch { broken++; } }
      assert.strictEqual(broken, 0,
        `並列度 ${par}: 壊れた JSON 行が ${broken} 件 — 追記が原子的でない`);
      assert.strictEqual(lines.length, par * TRIALS,
        `並列度 ${par}: 行が ${lines.length} 本(期待 ${par * TRIALS}) — 領収書が落ちた (第62条の TOCTOU)`);
    }
    // **壊して鳴らす**: 追記を read-modify-write に変えると行が落ちる
    await withMutant(
      s => s.replace('  withLock(file, () => fs.appendFileSync(file, line), opts);',
                     '  const cur = (() => { try { return fs.readFileSync(file, \'utf8\'); } catch { return \'\'; } })();\n' +
                     '  fs.writeFileSync(file, cur + line);'),
      async (mut) => {
        const w2 = path.join(SAND, 'writer-toctou.js');
        fs.writeFileSync(w2, `const f=require(${JSON.stringify(mut)});
          const file=process.argv[2], n=Number(process.argv[3]);
          for (let i=0;i<n;i++) f.append({key:'a'.repeat(16),exit:0,summary:'x'+i},{file});`);
        const file = tmpLedger('ac25-toctou');
        await spawnAll(4, () => [w2, file, '30']);
        const lines = fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim() !== '');
        assert.ok(lines.length < 120,
          `TOCTOU に壊した写しが ${lines.length} 行すべてを残した — この機では競合が再現しなかった。` +
          '**再現しなかったことを「壊れない」と読んではならない**(第37条)');
      });
  });

  await test('fold: 記録なき前後は比較できない', () => {
    // 第38条「改善は数値で証明する」「記録なき前後は比較できない」。
    // **改善を主張する散文が、前後の両方の記録を持つことを門が検める。**
    const md = path.join(ROOT, 'reform', 'gate-fold', 'build.md');
    if (!fs.existsSync(md)) skip('build.md がまだ無い — 記録する相の前である');
    const src = fs.readFileSync(md, 'utf8');
    const claims = /改善した|削減した|速くなった/.test(src);
    if (!claims) {
      // 主張していないなら裁くものが無い。**これは緑ではなく、主張の不在である。**
      assert.ok(true);
      return;
    }
    assert.ok(/2,?070s/.test(src) && /gh run view/.test(src),
      '改善を主張しながら前後の測り方と基準値(2,070s / gh run view)を記していない (第38条 / AC-26)');
  });

  await test('fold: 門は己の盲点を名乗る (第62条 a)', () => {
    const src = fs.readFileSync(__filename, 'utf8');
    // 三つの盲点(requirements NFR-06)が**空欄でなく**書かれているか
    const marks = [
      { mark: '① **単一プロセスか**', why: '並行の盲点 (NFR-04 が補う)' },
      { mark: '② **`require.cache` を捨てるか**', why: 'モジュール大域の盲点' },
      { mark: '③ **環境変数で住所を振り替えるか**', why: '住所の盲点' },
    ];
    for (const m of marks) {
      const at = src.indexOf(m.mark);
      assert.ok(at > 0, `盲点の名乗りが無い: ${m.mark} (${m.why})`);
      // 名乗りの実質を測る。見出しだけ置いて中身が空なら、それは名乗りではない。
      const body = src.slice(at + m.mark.length, at + m.mark.length + 400);
      const text = body.split('\n').map(l => l.replace(/^\s*\*\s?/, '').trim()).join(' ').trim();
      assert.ok(text.length > 80,
        `盲点 ${m.mark} の記述が ${text.length} 字しか無い — 空欄の名乗りは名乗りではない (第62条 a)`);
      assert.ok(/補う|AC-\d\d/.test(text),
        `盲点 ${m.mark} が「何が補うか」を言っていない — 落ちる穴を名指すだけでは処方にならない`);
    }
    // **壊して鳴らす**: 盲点の記述を空にした写しでこの門を撃つと赤くなる。
    // **写しは仮倉に置く**(第58条 c)。この門は自分のソースを読むので、
    // `__filename` が写しを指せば足りる —— 倉の中に置く理由は無い。
    const mut = path.join(SAND, `fold-blind-probe-${++seq}.js`);
    const broken = src
      .replace(/require\('\.\/_pulse-fixture\.js'\)/,
        `require(${JSON.stringify(path.join(ROOT, 'tests', '_pulse-fixture.js'))})`)
      .replace(/ \* {3}① \*\*単一プロセスか\*\*[\s\S]*?第62条 c\)。\n/, ' *   ① **単一プロセスか** ——\n');
    assert.ok(/① \*\*単一プロセスか\*\* ——\n/.test(broken) && broken !== src,
      '盲点を空にする注入が当たらなかった — 変異点の形が変わった (第37条)');
    fs.writeFileSync(mut, broken);
    const r = spawnSync(process.execPath, [mut], { encoding: 'utf8', cwd: ROOT,
      env: { ...process.env, PARADISE_FOLD_LEDGER: path.join(SAND, 'blind.jsonl') } });
    assert.notStrictEqual(r.status, 0,
      `盲点を空にした写しが exit ${r.status} で通った — AC-27 の門が鳴っていない`);
    assert.match(String(r.stdout), /盲点/, `鳴った理由が盲点でない: ${String(r.stdout).slice(-300)}`);
  });

  // ── 現物を汚していないことを、門が自分で検める(NFR-03 の同型)──────
  await test('fold: この門は己の故障注入の骨を持っている (prove B-02 / B-03)', () => {
    /**
     * **prove 相 B-02 / B-03 の無音を塞ぐ門**(第62条 c: 振る舞いの門が届かない層は
     * ソースを静的に読む門で補え)。
     *
     * 実測した二つの無音は、**どちらも「門を空転させる変異」だった**:
     *
     *   B-02 `withMutant` の `assert.notStrictEqual(broken, src)` を殺す
     *        → **当たらなかった注入を「鳴った」と読む**道が開く。
     *          `tests/paradise.test.js` は CRLF であり、LF の綴りは**一つも当たらない** ——
     *          この検めが死ねば、19 本の「壊して鳴らす」が**全部空振りのまま緑**になる。
     *   B-03 AC-16 の「健全な decide が倒れない」assert を消す
     *        → **負の fixture(無罪と宣言した形)が黙って消える**。
     *
     * どちらも `fold.test.js` 自身の中の変異なので、**この門が自分のソースを読む**。
     * 盲点: **この門自身を消す変異は、この門では捕まらない** ——
     * それを捕まえるのは `paradise.test.js` の AC-22(門の本数)である(第62条 c)。
     */
    const src = fs.readFileSync(__filename, 'utf8');
    // ① **注入が当たったことの検め**が `withMutant` の中に在る(B-02)
    assert.ok(/const broken = mutate\(src\);\s*\n\s*assert\.notStrictEqual\(broken, src,/.test(src),
      '`withMutant` が「注入が当たったか」を検めていない — ' +
      '**当たらない注入で「鳴らない」と結論する道が開く**。この現物は CRLF を含む一族であり、' +
      'LF の綴りは一つも当たらない (第37条 / prove B-02)');
    // ② その検めが**実際に投げる**こと(綴りだけ残して無力化されていないか)
    let landed = false;
    try {
      withMutant(s => s, () => { landed = true; });
    } catch (e) {
      assert.match(String(e.message), /故障注入が当たらなかった/,
        `注入が当たらないときの理由が違う: ${e.message}`);
      landed = false;
    }
    assert.strictEqual(landed, false,
      '**当たらない注入(恒等な mutate)が素通りした** — `withMutant` の検めが無力化されている (prove B-02)');
    // ③ **負の fixture が生きていること**(B-03)。
    //    「健全な経路が倒れない」を凍らせる assert は、**病そのものではなく法である** ——
    //    だが法が黙って消えれば、倒れる実装が緑で通る。ゆえに形を凍らせる。
    assert.ok(/assert\.ok\(!threw, '健全な decide が倒れた'\);/.test(src),
      'AC-16 の「健全な decide が倒れない」負の fixture が消えた — ' +
      '**無罪と宣言した形が黙って消えれば、倒れる実装が緑で通る** (prove B-03 / 第62条 c)');
    assert.ok(/assert\.ok\(!vocabGuard, '健全な経路が倒れた'\);/.test(src),
      'AC-16 の「健全な経路が倒れない」負の fixture が消えた (prove B-03)');
    // ④ **撃ちのループが空でないこと**(B-01 は鳴ったが、形を凍らせておく)
    assert.ok(/const SCALES = \['quick', 'standard', 'full', 'reform', 'counsel', 'cartography'\];/.test(src),
      'AC-11 の道の一覧が痩せた — **空のループは空転であって測定ではない** (第37条)');
  });

  await test('fold: この門束は外の env に畳みを切られない (F-1 回帰)', () => {
    /**
     * **review F-1 (BLOCK) の回帰の門。**
     *
     * CI の `📒 Fold` 段は `PARADISE_NO_FOLD: '1'` を立てる。その旗が
     * `process.env` に残ったままだと `fold.decide()` は何より先に
     * `bail=disabled` へ落ち、**畳みを見張る 7 門が畳みの枝に一度も到達しない**
     * (実測: `Fold self-test: 19 passed, 7 failed`)。
     *
     * **設定を読むのではなく走行を読む**(第16条)。この門は
     * **自分自身の写しを CI と同じ env で子プロセスとして撃ち**、
     * 「畳める状態を作れば実際に畳めること」を出力で読む。
     *
     * 盲点(第62条 a): この門は `fold.decide` の畳みの枝一つしか撃たない ——
     * 「7 門すべてが緑に戻ったこと」は門束全体の走行が示す(CI の段そのもの)。
     */
    const src = fs.readFileSync(__filename, 'utf8');
    const PROBE = [
      'const __f = tmpLedger("f1-probe");',
      'fold.append({ key: fold.key(), exit: 0, summary: "Paradise self-test: 1 passed, 0 failed" }, { file: __f });',
      'const __d = fold.decide({ file: __f });',
      'console.log("PROBE NO_FOLD=" + JSON.stringify(process.env.PARADISE_NO_FOLD) +',
      '  " fold=" + __d.fold + " bail=" + __d.bail);',
      'try { fs.rmSync(SAND, { recursive: true, force: true }); } catch {}',
      'process.exit(__d.fold === true ? 0 : 3);',
    ].join('\n');
    /** 写しを作る。門束は走らせない(`main()` の呼びを probe に差し替える)。 */
    const mkProbe = (tag, extra) => {
      let s = src
        .replace(/require\('\.\/_pulse-fixture\.js'\)/,
          `require(${JSON.stringify(path.join(ROOT, 'tests', '_pulse-fixture.js'))})`)
        .replace(/module\.exports = main\(\);\s*$/, PROBE + '\n');
      // **注入が当たったことを検める。** `src` 自身が PROBE の綴りを含むので
      // `includes` では常に真になる —— **常に緑の検めは検めではない**(第48条 c)。
      assert.ok(!/module\.exports = main\(\);/.test(s),
        `main() の差し替えが当たらなかった (${tag}) — 変異点の形が変わった (第37条)`);
      if (extra) s = extra(s);
      const p = path.join(SAND, `fold-f1-${tag}-${++seq}.js`);
      fs.writeFileSync(p, s);
      return p;
    };
    const CI_ENV = { ...process.env, PARADISE_NO_FOLD: '1',
      PARADISE_FOLD_LEDGER: path.join(SAND, 'f1-ci-ledger.jsonl') };

    // ① 健全な写しは、CI と同じ env でも畳める
    const ok = spawnSync(process.execPath, [mkProbe('sane')],
      { encoding: 'utf8', cwd: ROOT, env: CI_ENV });
    assert.strictEqual(ok.status, 0,
      `CI と同じ env(PARADISE_NO_FOLD=1)で門が畳めなかった — 外の旗が門を黙らせている (review F-1): ` +
      `${String(ok.stdout).slice(-300)}${String(ok.stderr).slice(-300)}`);
    assert.match(String(ok.stdout), /PROBE NO_FOLD=undefined fold=true bail=null/,
      `門が己の世界を宣言していない: ${String(ok.stdout).slice(-300)}`);

    // ② **壊して鳴らす**: 宣言(`delete process.env.PARADISE_NO_FOLD;`)を抜くと赤になる
    const brokenPath = mkProbe('broken', (s) => {
      const b = s.replace('delete process.env.PARADISE_NO_FOLD;', '/* 抜いた */');
      assert.notStrictEqual(b, s, '宣言を抜く注入が当たらなかった — 綴りが変わった (第37条)');
      return b;
    });
    const bad = spawnSync(process.execPath, [brokenPath],
      { encoding: 'utf8', cwd: ROOT, env: CI_ENV });
    assert.notStrictEqual(bad.status, 0,
      `宣言を抜いた写しが CI の env で通った — **この門は鳴っていない**(第48条 c): ${String(bad.stdout).slice(-300)}`);
    assert.match(String(bad.stdout), /PROBE NO_FOLD="1" fold=false bail=disabled/,
      `鳴った理由が F-1 でない: ${String(bad.stdout).slice(-300)}${String(bad.stderr).slice(-300)}`);
  });

  // ══ rework 相が塞いだ穴の回帰の門(security S-1 / S-2 / S-3 / S-4)══

  await test('fold: 走らせていない走行の領収書は畳みの根拠にならない (S-1 回帰)', () => {
    /**
     * **security S-1 (BLOCK) の回帰の門。**
     *
     * 鍵は秘密ではない(`node graph/fold.js fold-key` が名乗る)。ゆえに攻撃者は
     * **形の完全に正しい領収書を 1 行書ける**。security 相の実測:
     * それだけで Self-test / Census / Abode(repo) / Atlas の**4 段が 0 秒で緑**になった。
     *
     * 塞ぎは requirements §7-6 の明文に実体を与えること ——
     * **領収書は刻まれた走行の中でしか効かない**(`run` 欄)。
     *
     * 盲点(第62条 a): **同じ走行の中での偽造は、この門では捕まらない**。
     * runner の中で走る悪意ある step は正しい `run` を書ける ——
     * それを塞ぐのは S-2(台帳を checkout の外へ)であり、**二つで一組である**。
     */
    const k = fold.key();
    const RUN = process.env.PARADISE_FOLD_RUN;
    const forge = (extra) => {
      const f = tmpLedger('s1');
      fs.writeFileSync(f, JSON.stringify(Object.assign({
        at: '2026-09-21T00:00:00.000Z', key: k, exit: 0,
        summary: 'Paradise self-test: 500 passed, 0 failed' }, extra)) + '\n');
      return f;
    };
    // ① **run を名乗らない行**(外から足された行 / 旧い台帳の行)は採られない
    const d1 = fold.decide({ file: forge({}) });
    assert.strictEqual(d1.fold, false,
      '**走行を名乗らない領収書で畳んだ** — 一行の偽の領収書で「走らせずに緑」が出る (security S-1)');
    assert.strictEqual(d1.bail, 'no-receipt', `走行を名乗らない領収書の bail が ${d1.bail}`);
    assert.strictEqual(d1.otherRun, 1,
      '**跨いだ領収書の本数を名乗っていない** — 辿れない発見は直せない発見である (第21条 b)');
    // ② **別の走行の行**も採られない(形は完全に正しい)
    const d2 = fold.decide({ file: forge({ run: RUN + '-別の走行' }) });
    assert.strictEqual(d2.fold, false, '**別の走行の領収書で畳んだ** (security S-1 / requirements §7-6)');
    assert.strictEqual(d2.bail, 'no-receipt', `別走行の領収書の bail が ${d2.bail}`);
    // ③ **同じ走行の行は畳める**(負の fixture だけでは「何も畳まない実装」が緑になる)
    const d3 = fold.decide({ file: forge({ run: RUN }) });
    assert.strictEqual(d3.fold, true,
      `同じ走行の緑の領収書で畳めなかった — **畳みが死んでいる**: bail=${d3.bail}`);
    // ④ **CI で走行を名乗れなければ畳まない**(fail-closed / 揟7)
    assert.strictEqual(fold.runId({ env: { CI: 'true' } }), null,
      'CI で走行の名が無いのに識別を作った — **推測可能な既定値は S-1 を runner 上で再演させる**');
    const d4 = fold.decide({ file: forge({ run: RUN }),
      env: { ...process.env, CI: 'true', PARADISE_FOLD_RUN: '' } });
    assert.strictEqual(d4.fold, false, 'CI で走行を特定できないのに畳んだ — 疑わしきは畳まない (揟7)');
    // ⑤ **壊して鳴らす**: 走行の絞りを外すと ① が畳めてしまう
    withMutant(
      s => s.replace('  const mine = run === null ? [] : sameKey.filter(r => r.run === run);',
                     '  const mine = sameKey;'),
      (mut) => {
        const f = forge({});
        const r = runNode(`const f=require(${JSON.stringify(mut)});
          console.log('fold=' + f.decide({file:${JSON.stringify(f)}}).fold);`);
        assert.match(String(r.stdout), /fold=true/,
          `走行の絞りを外す注入が当たっていない: ${r.stdout}${r.stderr}`);
      });
  });

  await test('fold: CI の台帳は checkout の外に住む (S-2 回帰)', () => {
    /**
     * **security S-2 (BLOCK) の回帰の門。**
     *
     * 台帳が `${{ github.workspace }}` に在れば、PR は `git add -f` で
     * **台帳そのものを持ち込める** —— `.gitignore` は checkout を縛らない(実測):
     *
     *     $ git check-ignore -v .claude/paradise-fold-ledger.jsonl
     *     .gitignore:51:.claude/paradise-fold-ledger.jsonl
     *     $ git add -f .claude/paradise-fold-ledger.jsonl ; git diff --cached --name-only
     *     .claude/paradise-fold-ledger.jsonl          ← **版管理下に入った**
     *
     * **コードではなくデータ 1 本で CI を黙らせられる。** 鍵は `.claude/` を見ない。
     *
     * ⚠️ **綴りは行頭から `:` まで正確に読む**(prove W-04 の教訓)。
     */
    const yml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'tribunal.yml'), 'utf8');
    const steps = yml.split(/\n      - name: /).slice(1);
    const runOnly = (step) => step.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
    let checked = 0;
    for (const s of steps) {
      const m = runOnly(s).match(/^\s*PARADISE_FOLD_LEDGER:\s*(.+)$/m);
      if (!m) continue;
      checked++;
      assert.ok(!/github\.workspace/.test(m[1]),
        `**台帳が checkout の中に住んでいる**: ${m[1].trim()} — ` +
        'PR が `git add -f` で台帳を持ち込めば、走らせずに緑が出る (security S-2)');
      assert.ok(/runner\.temp/.test(m[1]),
        `台帳の住所が runner.temp でない: ${m[1].trim()} — checkout の外でなければ PR が触れる`);
    }
    assert.ok(checked >= 4,
      `台帳を渡す段が ${checked} 本しか無い — **段が消えれば畳みが効かない**(NFR-02)`);
    // **現物の台帳が版管理下に居ないこと**(`.gitignore` は既に追跡された物を止めない)
    const tracked = spawnSync('git', ['ls-files', '--', '.claude/paradise-fold-ledger.jsonl'],
      { encoding: 'utf8', cwd: ROOT });
    assert.strictEqual(String(tracked.stdout).trim(), '',
      '**台帳が版管理下に在る** — CI の checkout で攻撃者の台帳が現れる (security S-2)');
    // **壊して鳴らす**: 一段でも `github.workspace` に戻せば、この門が鳴る
    const broken = yml.replace('PARADISE_FOLD_LEDGER: ${{ runner.temp }}/paradise-fold-ledger.jsonl',
      'PARADISE_FOLD_LEDGER: ${{ github.workspace }}/.claude/paradise-fold-ledger.jsonl');
    assert.notStrictEqual(broken, yml, '注入が当たらなかった — 綴りが変わった (第37条)');
    let rang = false;
    for (const s of broken.split(/\n      - name: /).slice(1)) {
      const m = runOnly(s).match(/^\s*PARADISE_FOLD_LEDGER:\s*(.+)$/m);
      if (m && /github\.workspace/.test(m[1])) rang = true;
    }
    assert.ok(rang, '**検めが `github.workspace` へ戻した段を見落とした** — この門は鳴らない (第48条 c)');
  });

  await test('fold: 同じ走行で答えが食い違う台帳は畳みの根拠にならない (S-3 回帰)', () => {
    /**
     * **security S-3 (HIGH) の回帰の門。**
     *
     * `find()` は「最後の緑」を採っていた —— **本物の赤の後ろに偽の緑を 1 行足せば
     * 赤が上書きされる**(security 相の実測)。台帳が追記専用であることは
     * 「古い記録を消せない」ことを意味するだけで、**新しい嘘を防がない。**
     *
     * 同じ入力が二つの答えを出したなら、それは畳める状態ではない(第37条)。
     */
    const k = fold.key();
    const RUN = process.env.PARADISE_FOLD_RUN;
    // ① 赤の後ろに緑を足す
    const f = tmpLedger('s3-overwrite');
    fold.append({ key: k, exit: 1, summary: 'Paradise self-test: 480 passed, 20 failed' }, { file: f });
    fs.appendFileSync(f, JSON.stringify({ at: new Date().toISOString(), run: RUN, key: k,
      exit: 0, summary: 'Paradise self-test: 500 passed, 0 failed' }) + '\n');
    const d = fold.decide({ file: f });
    assert.strictEqual(d.fold, false,
      '**赤の後ろに足した 1 行の緑で畳んだ** — 赤い走行の記録が追記 1 行で無効化できる (security S-3)');
    assert.strictEqual(d.bail, 'ledger-unreadable',
      `食い違う台帳の bail が ${d.bail} — **不能は不在と別の値である**(AC-16)`);
    // ② **読む側の検め**: 形の壊れた行は黙って読み飛ばされない
    const f2 = tmpLedger('s3-malformed');
    fs.writeFileSync(f2, JSON.stringify({ at: 'x', key: 'abcd', exit: 0, summary: 's', run: RUN }) + '\n');
    assert.strictEqual(fold.decide({ file: f2 }).bail, 'ledger-unreadable',
      '**形の壊れた領収書を読む側が検めていない** — `validateReceipt` が書く側にしか立っていない (security S-3)');
    assert.throws(() => fold.find(k, { file: f2 }),
      (e) => e.bailCode === 'ledger-unreadable',
      'find() が形の壊れた台帳を黙って null に潰した (review F-2 / AC-16)');
    // ③ **健全な台帳は倒れない**(負の fixture だけでは「何でも赤にする実装」が緑になる)
    const ok = tmpLedger('s3-ok');
    fold.append({ key: k, exit: 0, summary: 'Paradise self-test: 500 passed, 0 failed' }, { file: ok });
    fold.append({ key: k, exit: 0, summary: 'Paradise self-test: 500 passed, 0 failed' }, { file: ok });
    assert.strictEqual(fold.decide({ file: ok }).fold, true,
      '同じ答えを二度刻んだ健全な台帳で倒れた — **食い違いと重複を混ぜてはならない**');
    // ④ **壊して鳴らす**: 食い違いの検めを抜く
    withMutant(
      s => s.replace('  if (exits.size > 1) {', '  if (false) {'),
      (mut) => {
        const r = runNode(`const f=require(${JSON.stringify(mut)});
          const d=f.decide({file:${JSON.stringify(f)}});
          console.log('fold=' + d.fold + ' exit=' + (d.receipt && d.receipt.exit));`);
        assert.match(String(r.stdout), /fold=true exit=0/,
          `食い違いの検めを抜く注入が当たっていない: ${r.stdout}${r.stderr}`);
      });
    // ⑤ **壊して鳴らす**: 読む側の検めを抜く
    withMutant(
      s => s.replace('    try { validateReceipt(r); }', '    try { true; }'),
      (mut) => {
        const r = runNode(`const f=require(${JSON.stringify(mut)});
          console.log('bail=' + f.decide({file:${JSON.stringify(f2)}}).bail);`);
        assert.ok(!/bail=ledger-unreadable/.test(String(r.stdout)),
          `読む側の検めを抜く注入が当たっていない: ${r.stdout}${r.stderr}`);
      });
  });

  await test('fold: 錠は必ず期限で抜ける — どの競合の形でも無限に回らない (S-4 回帰)', () => {
    /**
     * **security S-4 (HIGH) の回帰の門。**
     *
     * `.lock` が**ディレクトリ**のとき `openSync(lock,'wx')` は `EEXIST` を返し、
     * `rmSync(lock,{force:true})` は `recursive` が無いので `ERR_FS_EISDIR` で失敗する。
     * `catch {}` がそれを飲んで `continue` —— **stale 枝が毎周成立して `waitMs` を飛び越える**。
     * 実測(rework):`waitMs:2000` を指定した走行が **20 秒で戻らず** `timeout` に殺された。
     *
     * **攻撃者(あるいは事故)がディレクトリを一つ置くだけで、CI の段が job timeout まで回る。**
     */
    const file = tmpLedger('s4');
    fs.mkdirSync(file + '.lock', { recursive: true });
    const t0 = Date.now();
    const r = fold.recordRun({ key: 'a'.repeat(16), exit: 0, summary: 'x' },
      { file, waitMs: 1000, staleMs: 1 });
    const ms = Date.now() - t0;
    // **期限の 3 倍以内に戻ること。** 戻り方(書けた / 書けなかった)は問わない ——
    // 問うのは**必ず戻ること**である。
    assert.ok(ms < 3000,
      `**錠が ${ms}ms 戻らなかった**(期限 1000ms)— どの枝を通っても waitMs で抜けねばならない (security S-4)`);
    assert.ok(typeof r.written === 'boolean', `recordRun が返り値の形を壊した: ${JSON.stringify(r)}`);
    // ディレクトリの錠は **recursive で回収され、走行は書けねばならない**
    assert.strictEqual(r.written, true,
      `ディレクトリの錠を回収できなかった — rmSync に recursive が無い (security S-4): ${r.why}`);
    // **壊して鳴らす**: `recursive` を落とすと、期限で抜けるが**書けなくなる**
    withMutant(
      s => s.replace('        try { fs.rmSync(lock, { force: true, recursive: true }); } catch {}',
                     '        try { fs.rmSync(lock, { force: true }); } catch {}'),
      (mut) => {
        const f2 = tmpLedger('s4-broken');
        fs.mkdirSync(f2 + '.lock', { recursive: true });
        const rr = runNode(`const f=require(${JSON.stringify(mut)});
          const t=Date.now();
          const r=f.recordRun({key:'a'.repeat(16),exit:0,summary:'x'},{file:${JSON.stringify(f2)},waitMs:600,staleMs:1});
          console.log('ms=' + (Date.now()-t) + ' written=' + r.written);`);
        assert.match(String(rr.stdout), /written=false/,
          `recursive を落とした写しがまだ書けた — 注入が当たっていない: ${rr.stdout}${rr.stderr}`);
      });
    // **壊して鳴らす**: 期限の検めを stale 枝の後ろへ戻すと、**無限に回る**
    withMutant(
      s => {
        const deadline = '      if (Date.now() - t0 > waitMs) {\n' +
          '        throw new Error(`fold: 台帳の錠が ${waitMs}ms 解けない: ${lock}`);\n      }\n';
        const without = s.replace(deadline, '');
        assert.notStrictEqual(without, s, '期限の検めを抜く注入が当たらなかった (第37条)');
        return without.replace('        try { fs.rmSync(lock, { force: true, recursive: true }); } catch {}',
          '        try { fs.rmSync(lock, { force: true }); } catch {}');
      },
      (mut) => {
        const f3 = tmpLedger('s4-loop');
        fs.mkdirSync(f3 + '.lock', { recursive: true });
        const rr = spawnSync(process.execPath, ['-e',
          `const f=require(${JSON.stringify(mut)});` +
          `f.recordRun({key:'a'.repeat(16),exit:0,summary:'x'},{file:${JSON.stringify(f3)},waitMs:500,staleMs:1});` +
          `console.log('戻った');`],
          { encoding: 'utf8', cwd: ROOT, timeout: 5000 });
        assert.ok(rr.signal || rr.error || !/戻った/.test(String(rr.stdout)),
          `期限を stale 枝の後ろへ戻した写しが 5 秒以内に戻った — ` +
          `**無限ループの注入が当たっていない**: ${rr.stdout}${rr.stderr}`);
      });
  });

  await test('fold: 畳んだ census は読めない台帳で倒れる (F-2 回帰)', () => {
    /**
     * **review F-2 (HIGH) の回帰の門。**
     *
     * `census.js` は `fold.find()` を直に呼び、`find()` の中の `catch { return null; }` が
     * **`ledger-unreadable` を `null`(=不在)に潰していた** —— 出力は `bail` を名乗るが
     * **exit は 0 のまま緑**であり、「台帳が壊れて畳みが永久に効かない CI」が
     * **誰にも気づかれないまま秒を払い続ける**。
     * AC-16:「読めないは skip ではなく赤である」/ 第62条 b ①:「不能を不在として飲み込むな」。
     */
    // ① 台帳の道にディレクトリを置く(第62条 b ① の実測と同じ壊し方)
    //    ⚠️ **`--no-tests` を付けてはならない** —— 畳みの枝は `runTests` の中に在り、
    //       付ければ台帳を一度も読まずに緑で終わる(= 測れていない / 第37条)。
    //       読めない台帳では `decide()` が子プロセスを起こす前に倒れるので、速い。
    const dir = tmpLedger('f2-dir');
    fs.mkdirSync(dir, { recursive: true });
    const r = spawnSync(process.execPath, [path.join(GRAPH, 'census.js'), 'check'],
      { encoding: 'utf8', cwd: ROOT, timeout: 120000,
        env: { ...process.env, PARADISE_FOLD_LEDGER: dir } });
    assert.notStrictEqual(r.status, 0,
      `**読めない台帳で census が exit ${r.status} の緑を出した** — ` +
      `不能を不在として飲み込んでいる (review F-2 / AC-16): ${String(r.stdout).slice(-300)}`);
    assert.match(String(r.stdout) + String(r.stderr), /ledger-unreadable/,
      `倒れた理由が ledger-unreadable と名乗られていない — 辿れない発見は直せない (第21条 b): ` +
      `${String(r.stdout).slice(-300)}`);
    // ② **畳める台帳では倒れない**(負の fixture だけでは「何でも赤にする実装」が緑になる)。
    //    畳めるので子プロセスは起きない —— この門は census の本体を測らない(第62条 a の盲点)。
    const ok = tmpLedger('f2-ok');
    fold.append({ key: fold.key(), exit: 0, summary: 'Paradise self-test: 500 passed, 0 failed' },
      { file: ok });
    const r2 = spawnSync(process.execPath, [path.join(GRAPH, 'census.js'), 'check'],
      { encoding: 'utf8', cwd: ROOT, timeout: 120000,
        env: { ...process.env, PARADISE_FOLD_LEDGER: ok } });
    assert.ok(!/ledger-unreadable/.test(String(r2.stdout) + String(r2.stderr)),
      `畳める台帳を読めないと呼んだ — **不在・不能・健全を混ぜた**: ${String(r2.stdout).slice(-300)}`);
    assert.match(String(r2.stdout), /Census self-test: Executed 0 out of 1 runs \(1 reused/,
      `畳める台帳で畳まなかった — **F-2 の直しが畳みを殺した**: ${String(r2.stdout).slice(-300)}`);
    // ③ **壊して鳴らす**: engine の側で読めないを不在に潰すと、① が緑に戻る
    withMutant(
      s => s.replace('function selectRows(k, opts = {}) {\n  const rows = read(opts);',
                     'function selectRows(k, opts = {}) {\n  let rows; try { rows = read(opts); } catch { rows = []; }'),
      (mut) => {
        const rr = runNode(`const f=require(${JSON.stringify(mut)});
          console.log('bail=' + f.decide({file:${JSON.stringify(dir)}}).bail);`);
        assert.match(String(rr.stdout), /bail=no-receipt/,
          `読めないを不在に潰す注入が当たっていない: ${rr.stdout}${rr.stderr}`);
      });
  });

  await test('fold: 畳みを切った atlas も名乗る (F-3 回帰)', () => {
    /**
     * **review F-3 (HIGH) の回帰の門。**
     *
     * `--no-fold` の走行は `seen.take()` を通らず `total` が 0 のままになり、
     * **`Atlas inspect:` の行が丸ごと落ちていた**(review F-3 の実測)。
     * requirements §5 は三者(`paradise.test.js` / `census.js` / `atlas.js`)で
     * **同じ綴り・同じ意味**を求め、AC-14 は「すべての畳み走行の stdout に
     * `Executed <E> out of <N>` が現れる」と要求する。
     * **切ったことを一言も言わない走行は、切れたことを証明できない**(第37条)。
     *
     * ⚠️ 註釈の訂正(review F-11): **`--static` はブラウザを起こさない旗ではない。**
     * 制御するのは `ir.meta.animation` だけであり、実 Chrome は起きる(実測 49s)。
     * さらに `--static` は `motionGovernor` を赤に落とすので**この門では使わない**。
     * `timeout` と `status` を**自分で検める** —— 打ち切りを緑と読まない。
     */
    const off = atlasQuick(['--no-fold']);
    assert.ok(String(off.stdout),
      '**走行が出力を出さなかった** — 打ち切りを緑と読んではならない (第37条 / review F-11)');
    assert.match(String(off.stdout), /Atlas inspect: Executed (\d+) out of (\d+) inspections \(0 reused, bail=disabled\)/,
      `**--no-fold の atlas が畳みについて一言も名乗らない** — ` +
      `requirements §5 は三者で同じ綴りを求める (review F-3): ${String(off.stdout).split('\n').slice(-5).join(' / ')}`);
    const m = String(off.stdout).match(/Executed (\d+) out of (\d+) inspections/);
    assert.strictEqual(m[1], m[2],
      `畳みを切った走行で executed(${m[1]})と total(${m[2]})が違う — 切ったなら全て実行である`);
    // 畳んだ走行は `bail=disabled` を名乗らない(**負の fixture**。
    // 「常に disabled と書く実装」は切れたことの証明にならない)
    assert.ok(!/Atlas inspect:.*bail=disabled/.test(String(atlasQuick([]).stdout)),
      '畳んだ走行が bail=disabled を名乗った — **切っていないのに切ったと言う**のは第37条違反である');
    /**
     * **壊して鳴らす — 二つの層を別々に撃つ**(第21条)。現物の `atlas.js` は触らない
     * (在庫の門「hermetic: 楽園の門は今この瞬間、版管理下の現物を汚していない」が
     *  復元しても窓の開いた瞬間を名指す / 第58条 c)。
     *
     *   層① **engine**: 数えの口を抜けば `total` が 0 になる ——
     *        F-3 の病の根である(`take()` を通らない走行は数を持たなかった)。
     *   層② **atlas の綴り**: `folding` が偽の二つの枝が**どちらも**数えを呼ぶ。
     *        片方だけなら `Executed 6 out of 12` のような**半分の名乗り**になる。
     */
    withMutant(
      s => s.replace('    count(weight = 1) { total += weight; executed += weight; },',
                     '    count(weight = 1) { void weight; },'),
      (mut) => {
        const rr = runNode(`const f=require(${JSON.stringify(mut)});
          const s=f.inspected(); s.count(1); s.count(1);
          console.log('total=' + s.tally().total);`);
        assert.match(String(rr.stdout), /total=0/,
          `数えの口を抜く注入が当たっていない: ${rr.stdout}${rr.stderr}`);
      });
    const atlasSrc2 = fs.readFileSync(path.join(GRAPH, 'atlas.js'), 'utf8');
    const counts = (atlasSrc2.match(/\(seen\.count\(1\), \{ \.\.\./g) || []).length;
    assert.strictEqual(counts, 2,
      `**畳まない枝のうち ${counts} 本しか数えていない** — ` +
      '1 主題 2 検査のうち片方だけ数えれば、名乗りは半分の嘘になる (review F-3 / 第22条)');
    assert.match(atlasSrc2, /if \(!t\.total\) \{[\s\S]{0,200}process\.exit\(2\)/,
      '**`total === 0` で黙って飛ぶ道が戻った** — 「検めなかった」を「閉じた」と呼んではならない (review F-16 / 第37条)');
  });

  await test('fold: 総括は数えた数と名指した名を食い違わせない (F-15 回帰)', () => {
    /**
     * **review F-15 (MEDIUM) の回帰の門**(第22条 / requirements §1.2:
     * 「同じ量が二つの数として散文に残る」ことの禁)。
     *
     * `--all-scales` の実走で読まれた総括行(review §8):
     *   `✓ 36 主題すべてが検査に通る（うち 7 件は平面化不能のため standard: wiring, dag）`
     * **二つの嘘が同居していた**: ①主題は 6 であって 36 ではない(36 は 6 主題 × 6 道の行数)、
     * ②`7 件`(行)と `wiring, dag`(2 個 / 主題)が食い違う ——
     * **数を畳まず、名だけ畳んでいた。**
     *
     * ⚠️ **6 道 72 検査の実走はこの門では撃たない**(数分・ブラウザ 32 起動)。
     * 撃つのは `--scale quick --static` の単道である。**総括行の算法**を裁くのであって
     * 実走の数ではない —— 数を門で縛れば `draw()` が変わった日に偽の赤が出る(第62条 a の盲点)。
     */
    const out = String(atlasQuick([]).stdout);
    assert.ok(out, '**走行が出力を出さなかった** — 打ち切りを緑と読まない (第37条)');
    /**
     * **壊して鳴らす — 検めそのものを先に撃つ**(第21条)。
     * 生きた走行が緑とは限らない(atlas は今日赤いかもしれない)ので、
     * **病んだ総括の文字列を fixture として直に食わせ、検めが鳴ることを毎回測る**。
     * これは atlas の色に依らない —— **門が門であることの証明が、外の色に人質を取られない。**
     */
    const check = (line) => {
      const cm = line.match(/(\d+) 主題 × (\d+) 道 = (\d+) 件/);
      if (!cm) return '主題・道・件を別々の語で名乗っていない';
      if (Number(cm[1]) * Number(cm[2]) !== Number(cm[3])) return '掛け算が総括と合わない';
      const dm = line.match(/うち (\d+) 主題は平面化不能のため standard: ([^）]+)）/);
      if (dm) {
        const names = dm[2].split(',').map(s => s.trim()).filter(Boolean);
        if (Number(dm[1]) !== names.length) return `数 ${dm[1]} と名 ${names.length} 個が食い違う`;
        if (new Set(names).size !== names.length) return '名が重複している';
      }
      return null;
    };
    // review §8 が読んだ**現物の病んだ行**。これを素通しする検めは検めではない
    assert.ok(check('  ✓ 36 主題すべてが検査に通る（うち 7 件は平面化不能のため standard: wiring, dag）'),
      '**review §8 の病んだ総括を検めが素通しした** — この門は鳴らない (第48条 c)');
    assert.strictEqual(check('  ✓ 6 主題 × 6 道 = 36 件すべてが検査に通る（うち 2 主題は平面化不能のため standard: wiring, dag）'), null,
      '**健やかな総括を検めが赤と言った** — 偽の赤を出す門は門を殺す (第62条 a)');
    assert.ok(check('  ✓ 6 主題 × 6 道 = 36 件すべてが検査に通る（うち 7 主題は平面化不能のため standard: wiring, dag）'),
      '数と名の食い違いを見逃した');
    assert.ok(check('  ✓ 6 主題 × 2 道 = 36 件すべてが検査に通る'), '掛け算の破れを見逃した');
    // 主題の行を数える(`✓`/`🔴` で始まる主題行)
    const subjectLines = out.split('\n').filter(l => /^\s+[✓🔴]\s+\w+\s+\[/.test(l));
    assert.ok(subjectLines.length >= 6, `主題の行が ${subjectLines.length} 本しか無い: ${out.slice(-400)}`);
    const summary = out.split('\n').find(l => /件すべてが検査に通る|図が壊れている/.test(l));
    assert.ok(summary, `総括行が無い: ${out.split('\n').slice(-5).join(' / ')}`);
    if (/図が壊れている/.test(summary)) {
      // 赤い走行では総括の内訳が出ない。**測れなかったと名乗る**(第37条)——
      // 検めの鳴動は上で測り終えているので、この門は飾りにはなっていない
      console.error(`      ⚠ 生きた atlas は今赤い — 総括行の**実走**は測れなかった: ${summary.trim()}`);
      return;
    }
    // 生きた走行の総括を同じ検めで裁く
    assert.strictEqual(check(summary), null,
      `**生きた atlas の総括が病んでいる** (review F-15 / 第22条): ${summary}`);
    const cm = summary.match(/(\d+) 主題 × (\d+) 道 = (\d+) 件/);
    assert.strictEqual(Number(cm[3]), subjectLines.length,
      `総括の件数 ${cm[3]} が主題の行数 ${subjectLines.length} と違う — **同じ量を二つの数で語っている**`);
  });

  await test('fold: 恒等式の錠は一つしか無い — 飾りの錠は住まない (R-1 回帰)', () => {
    /**
     * **review R-1 (MEDIUM) の裁定「`closed()` を消せ」の回帰の門。**
     *
     * `closed() { return true; }` は**入力に依らず必ず通る飾り**であり(第48条 c)、
     * しかも註釈が己を「**恒等式の錠**」と名乗っていた ——
     * 次の誰かが「錠は二つある」と読み、**`tally()` の本物の錠を外して飾りを残す**道が
     * 開いていた(第58条:「住処が二つ在れば真が二通りに割れる」)。
     *
     * AC-15 が求める「錠は畳みの関数の外に立つ」は **`tally()` が満たしている** ——
     * 数が読まれる唯一の口であり、**そこで倒れる**。
     */
    const src = fs.readFileSync(FOLD_JS, 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.ok(!/closed\s*\(\s*\)\s*\{/.test(code),
      '**飾りの錠 `closed()` が戻ってきた** — 常に緑の門は門ではなく、' +
      '飾りが「錠」を名乗れば次の誰かが本物を外す (review R-1 / 第48条 c)');
    assert.ok(!/\.closed\(\)/.test(code), '`closed()` の呼び手が生えた — 常に緑の検めである');
    // **錠が `tally()` に在ることを、実際に倒して示す**(文面ではなく走行で / 第16条)
    const seen = fold.inspected();
    seen.count(3);                       // 畳まない走行の数えでも錠は効く
    assert.deepStrictEqual(seen.tally(), { total: 3, executed: 3, reused: 0, distinct: 0 },
      '畳まない走行の数えが恒等式を閉じない');
    // 錠が**倒す**ことの実測: `total` だけを進める壊れた写像を作って撃つ
    withMutant(
      s => s.replace('    count(weight = 1) { total += weight; executed += weight; },',
                     '    count(weight = 1) { total += weight; },'),
      (mut) => {
        const r = runNode(`const f=require(${JSON.stringify(mut)});
          const s=f.inspected(); s.count(2);
          try { s.tally(); console.log('通った'); } catch (e) { console.log('倒れた:' + e.message.slice(0, 60)); }`);
        assert.match(String(r.stdout), /倒れた:.*数が閉じない/,
          `**数が閉じないのに tally() が通った** — 錠が tally() に立っていない (AC-15): ${r.stdout}${r.stderr}`);
      });
  });

  await test('fold: 鍵の走査は黙って底を打たない (F-4 回帰)', () => {
    /**
     * **review F-4 (HIGH) の回帰の門。**
     *
     * 旧い綴り `if (depth > 6) return;` は**黙って返った**。本相で再現した実測:
     *
     *     階層+7 (8 slash): 採られた=false  n=278  **鍵が動いた=false**
     *
     * —— 現物が生まれたのに**鍵は 1 ビットも動かない**。畳みは古い領収書を採り続ける
     * (**prove M-02 と同型**)。`materials()` の註釈が誇る
     * 「次に増えた 1 本も自動で鍵に入る」が**深さ 7 で破れていた**。
     *
     * 門は二つを測る:
     *   ① **現物の最深から底までに余裕が在る**(底に触れていない)
     *   ② **深い現物を生やすと鍵が動く**(実際に生やして撃つ)
     *   ③ **底に触れたら黙らず倒れる**(壊して鳴らす)
     */
    // ① 現物の深さ分布を測り、底との距離を名乗る
    const mats = fold.materials();
    const deepest = Math.max(...mats.map(r => r.split('/').length - 1));
    const cap = Number(fs.readFileSync(FOLD_JS, 'utf8').match(/const WALK_MAX_DEPTH = (\d+);/)[1]);
    assert.ok(deepest + 3 <= cap,
      `**現物の最深 ${deepest} が底 ${cap} に近すぎる** — ` +
      'あと 3 階層で鍵が現物を取りこぼす。底を上げるか木を浅くせよ (review F-4)');

    // ② **深い現物を生やすと鍵が動く。**
    //    ⚠️ **現物の木には書かない**(第58条 c / 門『hermetic: 楽園の門は今この瞬間、
    //    版管理下の現物を汚していない』が実測で名指す —— **復元は除外ではない**)。
    //    `materials(root)` は根を受け取るので、**砂場に合成の木を建てて撃つ**。
    const fake = fs.mkdtempSync(path.join(SAND, 'f4-tree-'));
    const segs = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6'];   // tools/ から 7 階層 = 8 slash
    fs.mkdirSync(path.join(fake, 'tools'), { recursive: true });
    fs.writeFileSync(path.join(fake, 'tools', 'shallow.js'), '// 浅い現物\n');
    const before = fold.materials(fake);
    assert.deepStrictEqual(before, ['tools/shallow.js'], `合成の木の素が違う: ${JSON.stringify(before)}`);
    fs.mkdirSync(path.join(fake, 'tools', ...segs), { recursive: true });
    fs.writeFileSync(path.join(fake, 'tools', ...segs, 'victim.js'), '// 深さ 7 の現物\n');
    const after = fold.materials(fake);
    assert.ok(after.includes(`tools/${segs.join('/')}/victim.js`),
      `**深さ 7 の現物が鍵の材料に入らない** — 走査が底を打っている (review F-4): ${JSON.stringify(after)}`);
    // **鍵が動くことまで測る。** 材料に入っても鍵が動かねば畳みは古い領収書を採り続ける
    const kBefore = require('crypto').createHash('sha256')
      .update(before.join('\n')).digest('hex');
    const kAfter = require('crypto').createHash('sha256')
      .update(after.join('\n')).digest('hex');
    assert.notStrictEqual(kAfter, kBefore,
      '**深い現物を生やしたのに材料の指紋が動かない** (AC-05 / prove M-02 と同型)');

    // ③ **壊して鳴らす**: 底を 1 に潰すと、黙らずに倒れる
    withMutant(
      s => s.replace('const WALK_MAX_DEPTH = 12;', 'const WALK_MAX_DEPTH = 1;'),
      (mut) => {
        const r = runNode(`const f=require(${JSON.stringify(mut)});
          try { f.materials(); console.log('黙って通った'); }
          catch (e) { console.log('倒れた:' + e.message.slice(0, 80)); }`);
        assert.match(String(r.stdout), /倒れた:.*深さの上限/,
          `**底に触れたのに黙って通った** — 黙る打ち切りは prove M-02 の偽の緑を生む: ${r.stdout}${r.stderr}`);
      });
    // ④ **底が二つ在ってはならない**(第58条)。`walkJs` と `walkAll` が同じ定数を使う
    const code = fs.readFileSync(FOLD_JS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.strictEqual((code.match(/depth > WALK_MAX_DEPTH/g) || []).length, 2,
      '**走査の底が二つの綴りに割れている** — 片方だけ直した日に真が二通りに割れる (第58条)');
    assert.ok(!/depth > \d/.test(code),
      '**生の数字の底が戻ってきた** — 底は名を持たねば次の者が片方だけ直す (review F-4)');
  });

  await test('fold: この門は現物の台帳を汚していない', () => {
    const after = realLedgerFingerprint();
    assert.strictEqual(after, REAL_BEFORE,
      `現物の台帳の指紋が ${REAL_BEFORE} → ${after} に動いた — 門が己の測る対象を汚した (第58条 c)`);
  });

  const rep = H.report();
  try { fs.rmSync(SAND, { recursive: true, force: true }); } catch {}
  if (require.main === module) process.exit(rep.fail === 0 ? 0 : 1);
  return rep;
}

module.exports = main();
