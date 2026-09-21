#!/usr/bin/env node
'use strict';
/**
 * PARADISE :: FOLD — 同じ入力の走行を二度撃たないための機構 (reform/gate-fold)
 *
 * **この器が答える問いは一つ**: 「いま撃とうとしている走行は、既に撃たれたか」。
 * 答えは**鍵**(入力の内容ハッシュ)と**領収書**(台帳の 1 行)で出す。
 *
 * ══ 二つの機構が同居するが、混ぜてはならない ══
 *
 *   P-1 **台帳の畳み**(`key` / `append` / `find` / `decide`)
 *        —— 自己診断の全走を CI の**段をまたいで**畳む。台帳は `.jsonl` の追記。
 *   P-2 **プロセス内の写像**(`artifactKey` / `Inspected`)
 *        —— Atlas が同じ成果物を二度検めないための写像。**台帳を一切使わない。**
 *        requirements §7-6:「本改修の台帳は 1 回の CI 走行の中でのみ有効」——
 *        P-2 が台帳を使えば、Atlas の裁定が走行をまたいで写され第37条違反になる。
 *
 * ══ なぜ新しい engine なのか(design §3.2)══
 *
 * 三者(`tests/paradise.test.js` / `graph/census.js` / `graph/atlas.js`)が
 * **同じ鍵と同じ台帳**を使う。住処が二つ在れば鍵が二通りに割れる(第48条 / 第58条)。
 * `census.js` に置けば atlas が census を require することになり内の辺が意味を失う。
 * `abode.js` に置けば「住処を知る唯一の器」の職務が二つになる。
 *
 * ══ 住所を自分で組まない(第58条(a))══
 *
 * `path.join(<倉>, '.claude', …)` と綴れば `abode.js` の `HOMEDIR_PATTERNS` 第4項に
 * 当たり、**行を名指されて赤くなる**(design D-8 の実測)。ゆえに `abode.pathFor` を通す。
 * env の逃げ道 `PARADISE_FOLD_LEDGER` は、門が現物を汚さずに台帳を撃つための口である
 * (NFR-03 / AC-24。先例は `daily-guard.js:35` の `PARADISE_DAILY_LEDGER`)。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const abode = require('./abode.js');   // 第58条: 楽園自身の住所を知るのは abode.js だけ

const ROOT = path.join(__dirname, '..');

/** 台帳の住所。**env は門のための口であって、既定ではない。** */
function ledgerPath(opts = {}) {
  if (opts.file) return opts.file;
  const env = opts.env || process.env;
  return env.PARADISE_FOLD_LEDGER || abode.pathFor('foldLedger', opts.abodeOpts);
}
function lockPath(file) { return file + '.lock'; }

/**
 * **この走行の一意識別**(security S-1 / requirements §7-6)。
 *
 * requirements §7-6:「本改修の台帳は **1 回の CI 走行の中でのみ有効**」。
 * だが実装にはその境界が無かった —— **走行を跨いだ領収書を `find()` が採っていた**。
 * security S-1 の実測: 鍵は秘密でない(`fold-key` が名乗る)ので、
 * 形の正しい一行を置くだけで **4 段が「走らせずに緑」**になった。
 *
 * ★ **出所の選び方**(rework の判断。security.md §1.4(b) を実装に落とす):
 *
 *   ① `PARADISE_FOLD_RUN` が在ればそれ。CI では `tribunal.yml` が
 *      `gh-${{ github.run_id }}-${{ github.run_attempt }}` を**同じ job の全段に**渡す ——
 *      **段を跨いで同じ値でなければ畳みが一切効かない**。再実行(`run_attempt`)は
 *      別の走行である(材料が同じでも runner が違う)。
 *   ② 無く、かつ **CI に居る**なら `null` = **畳まない**(fail-closed / 揟7)。
 *      CI で名乗りが無いのは「走行を特定できない」ことであり、疑わしきは畳まない。
 *      ⚠️ ここで推測可能な既定値(hostname 等)を据えれば、S-1 が runner 上で再演する。
 *   ③ 手元では **端末と倉**から定数を作る。手元の台帳は走行を跨いで生き、
 *      それが手元での畳みの値打ちそのものである(AC-08 / 神は自分の倉の主である)。
 *      **手元の偽造を防ぐのはこの欄ではない** —— 防ぐのは S-2(CI の台帳を
 *      `runner.temp` へ移す)である。**両方が揃って初めて塞がる。**
 *
 * 門は自分の走行を自分で宣言する(`tests/fold.test.js` が
 * `PARADISE_FOLD_RUN` を自ら立てる)—— F-1 と同じ作法である。
 */
function runId(opts = {}) {
  const env = opts.env || process.env;
  const named = env.PARADISE_FOLD_RUN;
  if (named) return String(named);
  if (env.CI === 'true' || env.GITHUB_ACTIONS === 'true') return null;
  const seed = [require('os').hostname(), ROOT].join('\0');
  return 'local-' + crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16);
}

// ══════════════════════════════════════════════════════════════════════
// bail — 閉じた語彙 (AC-16 / requirements §4.3)
// ══════════════════════════════════════════════════════════════════════

/**
 * **畳めなかった理由は 7 語しかない。** 語彙を開けば `bail=whatever` が生まれ、
 * 機械は「畳まなかった」と「畳む機構が壊れていた」を区別できなくなる(揟5)。
 * `ledger-unreadable` が `no-receipt` と**別の語である**ことが要である ——
 * 第62条(b)①の実測:「ディレクトリを一つ作るだけで 484 門が全滅した」。
 * **読めないは skip ではなく赤である。**
 */
const BAIL_CODES = Object.freeze([
  'no-receipt',         // 台帳に該当の鍵が無い(台帳が空を含む)
  'key-miss',           // 鍵が一致しない(入力が変わった)
  'not-green',          // 領収書の exit が 0 でない
  'truncated',          // 領収書が打ち切られた走行のもの (exit === null)
  'undeclared-state',   // 宣言外の状態に依る走行 (=global)。**構造的に畳まない**
  'disabled',           // --no-fold / PARADISE_NO_FOLD=1 で明示的に切られた
  'ledger-unreadable',  // 台帳が読めない(不能。**不在と別の値**)
]);

/** 語彙外の bail を組み立てようとしたら、その場で倒れる(黙って通さない)。 */
function bail(code, extra = {}) {
  if (!BAIL_CODES.includes(code)) {
    throw new Error(`fold: 語彙外の bail=${code} — 閉じた語彙は ${BAIL_CODES.join(' / ')} である (AC-16)`);
  }
  return { fold: false, bail: code, ...extra };
}

// ══════════════════════════════════════════════════════════════════════
// 鍵 — 入力の中身から採る (FR-02 / AC-03 / AC-05 / AC-06)
// ══════════════════════════════════════════════════════════════════════

/**
 * 鍵の材料 KF(design §2.1 / **prove 相 M-02 で拡げた**)。**名簿を写経しない** —— 走査で数える。
 *
 *   tests/**.js                門の本体
 *   graph/**.js                engine の本体
 *   graph/*.json               engine の宣言表(**1 階層のみ**)
 *   overlay/**                 **配備の正典**(vendor の借り物を含む。archify だけではない)
 *   dashboard/**               画面。**門が中身を読む**(AC-19e 他)
 *   tools/**                   結線の道具
 *   .github/workflows/*.yml    段が変われば「同じ入力の走行」ではない(design §2.5)
 *   README.md / CLAUDE.md / CONSTITUTION.md / .gitignore   **門が中身を裁く根の文書**
 *   ∖ derived.js が宣言する生成物
 *
 * ⚠️⚠️ **prove 相 M-02 の実測 —— これは仮想の危険ではなかった。**
 * 拡げる前の材料は **137 本**。版管理下の 605 本のうち残りは鍵の外に在った。
 * 「壊すと門が赤くなるが鍵が動かない」現物を全数で探したところ、**7 本見つかった**:
 *
 *     overlay/root/CLAUDE.md      → deploy: the deployed tree matches its declared sources
 *     overlay/overlay.json        → upstream / deploy / independence / seat / diet 系 17 門
 *     README.md                   → census: README が語るテスト数…
 *     CLAUDE.md                   → CLAUDE.md exists and states…
 *     CONSTITUTION.md             → census: the paradise measures itself from the artifacts…
 *     overlay/vendor/hooks/hooks.json → independence: the vendored hooks resolve to files…
 *     dashboard/index.html        → AC-19e / dashboard-count 系 14 門
 *
 * `overlay/root/CLAUDE.md` を潰した走行を実測すると、**鍵は 1 ビットも動かず**
 * `Paradise fold: Executed 0 out of 1 runs (1 reused, …)` と
 * `Census self-test: … ✓ every number the paradise claims about itself is true` が
 * **exit 0 で出た** —— 素の全走なら 2 門が赤い状態である。
 * **findings §4.2 Jest #8702(鍵に manifest が入っておらず CI が失敗を取り逃した)と同型。**
 * 揟7「疑わしきは畳まない」に従い、**門が読む現物はすべて鍵に入れる。**
 *
 * ⚠️ **生成物を機械的に除く理由**(第29条 / design §2.2)。
 * `graph/lessons.json` は素朴な綴り `graph/*.json` に入る。入れれば
 * **CI が export し直した瞬間に鍵が動き、畳みが永久に効かなくなる**
 * —— 偽の緑ではなく、機構が無言で死ぬ。名簿を写経すれば次に生成物が増えた日に黙って壊れる。
 * 拡げた分もこの除外を通る(`dashboard/state.json` / `state.js` / `graph/identity/catalog.json`)。
 *
 * ⚠️ **先頭が `.` の名は材料に採らない。** 門は走行中に自分の写しを
 * `tests/.paradise-f1-probe-<pid>.js` として置き、`finally` で消す
 * (`paradise.test.js:10825`)。それを材料に採れば、**鍵が走行の途中で動く**。
 * `.gitignore` だけは**名指しで**採る —— 門が中身を読むからである。
 */
const DOT = (name) => name.startsWith('.');

/**
 * 走査の深さの上限。**これは打ち切りではなく暴走止めである**(review F-4 / 第37条)。
 *
 * 実測(review F-4 / 本相で再現):材料 278 本の深さ分布は
 * `{0:4, 1:75, 2:69, 3:40, 4:62, 5:28}` ——**最深は 5 であり、底は 28 本が触れていた**。
 * 旧い綴り `if (depth > 6) return;` は**黙って返った**ので、
 * `tools/d0/…/d6/victim.js`(8 slash)を生やして撃つと:
 *
 *     階層+7 (8 slash): 採られた=false  n=278  **鍵が動いた=false**
 *
 * —— 現物が生まれたのに**鍵は 1 ビットも動かない**。畳みは古い領収書を採り続ける。
 * **prove M-02(鍵の覆いが門の読む現物より狭い)と完全に同型**であり、
 * `materials()` の註釈が誇る「次に増えた 1 本も自動で鍵に入る」を**深さ 7 で破る**。
 *
 * ゆえに二つを同時に直す:
 *   ① 上限を**現物の最深(5)から遠い**ところへ置く。12 は暴走(環)を止めるに足り、
 *      現物の木が 2 倍に深くなっても届かない。
 *   ② **届いたら黙って返らず、名乗って倒れる。** 鍵が算べない走行は
 *      **畳まない**(揟7「疑わしきは畳まない」)—— 偽の緑ではなく、赤い名乗りになる。
 */
const WALK_MAX_DEPTH = 12;

/**
 * 材料の木を歩く。
 *
 * ⚠️ **`DOT()` は名で落とすので、ファイルにも「ディレクトリ」にも効く**(review F-4)。
 * 旧い註釈はファイル(走行中の一時的な写し)を落とす理由しか書いておらず、
 * **木ごと落ちることを一言も書いていなかった** —— 実測:
 *
 *     DOT ディレクトリ tools/.hooks/hook.js: 採られた=false  鍵が動いた=false
 *
 * これは**意図された除外である**(`.git` / `.claude` / `node_modules` の類が
 * 鍵に入れば、走行のたびに鍵が動き機構が無言で死ぬ)。
 * だが**意図は書かれて初めて意図である** —— 将来 `overlay/.config/` や
 * `tools/.hooks/` を「門が読む現物」として建てる者は、
 * **それが鍵の外に在ることを知らねばならない**。
 * その時は DOT ではなく `derived.js` の除外表で名指して除くこと(第29条)。
 * この振る舞いは門『fold: 鍵の走査は黙って底を打たない (F-4 回帰)』が凍らせる。
 */
function walkJs(root, rel, out, depth = 0) {
  if (depth > WALK_MAX_DEPTH) {
    // **黙って返らない。** 深さの底に触れた事実は、鍵が語らねば誰も知らない
    throw new Error(
      `鍵の材料の走査が深さの上限 ${WALK_MAX_DEPTH} に触れた: ${rel} — ` +
      'この底より深い現物は鍵の外に落ちる。落ちれば**現物が変わっても鍵が動かず**、' +
      '畳みが古い領収書を採り続ける (review F-4 / prove M-02 と同型)。' +
      'graph/fold.js の WALK_MAX_DEPTH を上げるか、木を浅くせよ');
  }
  let ents = [];
  try { ents = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch { return; }
  for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
    if (DOT(e.name)) continue;   // **名で落とす — ファイルにも木にも効く**(上の註釈)
    const r = rel + '/' + e.name;
    if (e.isDirectory()) walkJs(root, r, out, depth + 1);
    // **`.mjs` も engine の本体である**(prove 相 M-02)。`graph/motion-probe.mjs` は
    // Atlas の動きの裁定を実際に下す実行体であり(`atlas.js:74` の `PROBE`)、
    // `.js` だけを採る綴りはそれを鍵の外に落としていた。
    else if (e.name.endsWith('.js') || e.name.endsWith('.mjs')) out.push(r);
  }
}
/**
 * 木を種類を問わず歩く(`overlay/**` / `dashboard/**` / `tools/**`)。
 * **`walkJs` と同じ底・同じ名乗りである**(review F-4)——
 * 底が二つ在れば、片方だけ直した日に真が二通りに割れる(第58条)。
 */
function walkAll(root, rel, out, depth = 0) {
  if (depth > WALK_MAX_DEPTH) {
    throw new Error(
      `鍵の材料の走査が深さの上限 ${WALK_MAX_DEPTH} に触れた: ${rel} — ` +
      'この底より深い現物は鍵の外に落ちる。落ちれば**現物が変わっても鍵が動かず**、' +
      '畳みが古い領収書を採り続ける (review F-4 / prove M-02 と同型)。' +
      'graph/fold.js の WALK_MAX_DEPTH を上げるか、木を浅くせよ');
  }
  let ents = [];
  try { ents = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch { return; }
  for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
    if (DOT(e.name)) continue;   // **名で落とす — ファイルにも木にも効く**(`walkJs` の註釈)
    const r = rel + '/' + e.name;
    if (e.isDirectory()) walkAll(root, r, out, depth + 1);
    else out.push(r);
  }
}

/** `derived.js` の宣言を正典として読む。**写経しない**(第44条)。 */
function derivedSet() {
  try { return new Set(Object.keys(require('./derived.js').DERIVED)); }
  catch { return new Set(); }
}

/** @returns {string[]} 倉相対の道。**ソート済み**(順序に依らない鍵のため)。 */
function materials(root = ROOT) {
  const out = [];
  walkJs(root, 'tests', out);
  walkJs(root, 'graph', out);
  let names = [];
  try { names = fs.readdirSync(path.join(root, 'graph')); } catch { names = []; }
  for (const n of names.sort()) if (!DOT(n) && n.endsWith('.json')) out.push('graph/' + n);
  /**
   * **prove 相 M-02 で拡げた三つの木。** 以前は `overlay/vendor/archify` だけを採っていた ——
   * だが門が中身を読む現物はそれより遙かに広く、**鍵の外に 7 本の穴が在った**(上の実測)。
   * 木ごと採るので、**次に増えた 1 本も自動で鍵に入る**(名簿の写経を避ける / 第44条)。
   */
  walkAll(root, 'overlay', out);
  walkAll(root, 'dashboard', out);
  walkAll(root, 'tools', out);
  let wf = [];
  try { wf = fs.readdirSync(path.join(root, '.github', 'workflows')); } catch { wf = []; }
  for (const n of wf.sort()) if (!DOT(n) && /\.ya?ml$/.test(n)) out.push('.github/workflows/' + n);
  /**
   * **根の文書。** 走査では拾えない(倉の根に散っている)ので名指しで採る。
   * ここだけは名簿だが、**名簿が腐れば門が鳴る** —— 下の `ROOT_DOCS` は
   * `fold: 鍵は門が読む現物を覆う` が全数で検め直す(prove 相 M-02 の硬化)。
   */
  for (const n of ROOT_DOCS) {
    try { if (fs.statSync(path.join(root, n)).isFile()) out.push(n); } catch { }
  }
  const derived = derivedSet();
  return out.filter(f => !derived.has(f)).sort();
}

/**
 * 倉の根に住み、**門が中身を裁く**文書。走査の綴り(`**.js` 等)では拾えない。
 * **凍結表である**(第44条 c: 許す形をコードに書いて毎回名乗る)。
 */
const ROOT_DOCS = Object.freeze(['README.md', 'CLAUDE.md', 'CONSTITUTION.md', '.gitignore']);

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

/**
 * 鍵に効いた入力を**数え直せる形**で答える (AC-06)。
 * 二つの走行の出力を `diff` すれば、鍵が動いた理由が特定できる(第22条)。
 *
 * ⚠️ **住処は生の env ではなく `abode.resolve().mode` を入れる**(design §2.6 —— 本設計で最も重い決定)。
 * 生の env を入れると **素 ≠ repo** になり、Self-test 段の領収書で Abode(repo) 段を
 * 畳めなくなる(P-1 の取り分 843.0s のうち 420s が丸ごと消える)。
 * `resolve().mode` なら **素 ≡ repo / repo ≠ global** が同時に成り立つ ——
 * findings §1.2 と AC-05 の両方を満たす唯一の形である。
 */
function keyExplain(opts = {}) {
  const root = opts.root || ROOT;
  const env = opts.env || process.env;
  const files = opts.files || materials(root);
  const h = crypto.createHash('sha256');
  const rows = [];
  let bytes = 0;
  for (const f of files) {
    let buf;
    try { buf = fs.readFileSync(path.join(root, f)); } catch { continue; }
    const fh = sha256(buf);
    h.update(f); h.update('\0'); h.update(Buffer.from(fh, 'hex'));
    bytes += buf.length;
    rows.push({ file: f, sha: fh.slice(0, 16), bytes: buf.length });
  }
  // 住処の**正規化された** mode。`abode.resolve()` を通すことが本質である(§2.6)。
  const mode = abode.resolve({ env, repoRoot: root }).mode;
  const archify = String(env.PARADISE_ARCHIFY || '');
  const envs = [
    { name: 'PARADISE_ABODE', value: mode, via: 'abode.resolve().mode', valueSha: sha256(mode).slice(0, 16) },
    { name: 'PARADISE_ARCHIFY', value: archify, via: 'env', valueSha: sha256(archify).slice(0, 16) },
  ];
  h.update('PARADISE_ABODE='); h.update(mode); h.update('\0');
  h.update('PARADISE_ARCHIFY='); h.update(archify); h.update('\0');
  return { key: h.digest('hex').slice(0, 16), fileCount: rows.length, bytes, env: envs, files: rows };
}

/** @returns {string} 鍵の 16 桁。 */
function key(opts) { return keyExplain(opts).key; }

/**
 * 成果物のバイト列から採る鍵 (P-2 / AC-11)。**IR でも主題名でも道名でもない**(第16条)。
 *
 * ⚠️ **成果物の一部から採ってはならない**(prove 相 M-08 の無音)。
 * 実測: 鍵を **HTML の先頭 1KB だけ**から採る変異を撃ったところ、**一本も鳴らなかった** ——
 * 門は `fold.inspected()` に**作り物の鍵**を与えて数を数えており、
 * **鍵がどこから来たかを一度も撃っていなかった**(第62条: 門の形が盲点を決める)。
 * 先頭 1KB は 6 主題すべてで同じ `<!DOCTYPE html>…<style>` であり、
 * **72 検査すべてが 1 つの裁定に畳まれる**。畳まれた 71 件は誰にも検められない。
 * ゆえに**必ずバイト列の全長を食わせ、食った長さを鍵の材料に混ぜる。**
 */
function artifactKey(fileOrBuffer) {
  const buf = Buffer.isBuffer(fileOrBuffer) ? fileOrBuffer : fs.readFileSync(fileOrBuffer);
  const h = crypto.createHash('sha256');
  h.update(buf);
  // **長さを鍵に混ぜる。** 途中で切った鍵は「短い成果物」と区別できなくなる ——
  // 長さが入っていれば、先頭だけを食わせる変異は**必ず別の鍵になる**。
  h.update('\0len='); h.update(String(buf.length));
  return h.digest('hex').slice(0, 16);
}

// ══════════════════════════════════════════════════════════════════════
// 台帳 — JSONL の追記 (FR-01 / NFR-04)
// ══════════════════════════════════════════════════════════════════════

/**
 * 錠。**`appendFileSync` の 1 回呼びは 1 行が PIPE_BUF 以下なら原子的に「近い」。
 * だが「近い」は保証ではない**(design §1.5)—— ゆえに錠を併せて持つ。
 * 第62条の実測:「`record` の TOCTOU は並列度 2/4/8 のすべてで 100% 破れた」。
 * 形は `daily-guard` の作法(`<住所>.lock`)に揃える。
 */
function withLock(file, fn, opts = {}) {
  const lock = lockPath(file);
  /**
   * **輸出の関門(第58条(f) / AC-55)。書く直前に置く。**
   * 先例は `daily-guard.js:82` である。畳みの台帳も住処の中に住む ——
   * `mode=repo`(既定)なら倉の中で黙って通り、門が `PARADISE_FOLD_LEDGER` で
   * 仮倉へ振り替えた道は `caller-named` として通る。
   * `mode=global` では `~/.claude/…` を指すが**台帳にその宛先は無い** ——
   * ゆえに throw する。それは欠陥ではなく、AC-10 が要求する
   * 「畳める経路が物理的に無い」ことの、住所の側からの現れである。
   */
  abode.guardWrite(lock, { why: '畳みの走行台帳の錠を置く' });
  abode.guardWrite(file, { why: '畳みの走行台帳へ領収書を追記する' });
  /**
   * **待ちの上限は「競合の最悪」で決める。**
   *
   * 実測で踏んだ: 5,000ms では**並列度 4 で書き手が 1 本死んだ**
   * (`並列度 4: 書き手が exit 1,0,0,0 で死んだ`)。錠は 1 行の追記しか守らないが、
   * 8 本が 30 回ずつ撃てば 240 回の取り合いになる。
   * **短すぎる上限は「壊れた」ではなく「待てなかった」を赤として報告する** ——
   * それは偽の赤である(第62条 b)。
   */
  const waitMs = opts.waitMs || 60000;
  const t0 = Date.now();
  let fd = null;
  for (;;) {
    try { fd = fs.openSync(lock, 'wx'); break; }
    catch (e) {
      /**
       * ⚠️ **Windows は `EPERM` も返す。**
       *
       * 実測で踏んだ(並列度 2/4/8 のいずれでも再現):
       *
       *     ERR: EPERM: operation not permitted, open '…jsonl.lock'
       *     par=4 codes 1,0,0,1 / lines 71 (期待 120)
       *
       * 別の走行が `rmSync(lock)` を撃っている最中に `openSync(lock,'wx')` が
       * 走ると、削除待ちの入り口を掴んで `EPERM` になる —— POSIX の `EEXIST` しか
       * 見ない錠は、**そこで待たずに投げる**。
       * **待てば済む競合を「壊れた」と報告するのは偽の赤である**(第62条 b)。
       * ゆえに `EEXIST` と同じく**待つべき競合**として扱う。
       */
      if (e.code !== 'EEXIST' && e.code !== 'EPERM' && e.code !== 'EACCES') throw e;
      /**
       * **どの枝を通っても `waitMs` で必ず抜ける**(security S-4 / HIGH)。
       *
       * 実測で踏んだ: `.lock` が**ディレクトリ**のとき `openSync(lock,'wx')` は
       * `EEXIST` を返し(Windows)、`rmSync(lock, {force:true})` は `recursive` が無いので
       * `ERR_FS_EISDIR` で失敗する。`catch {}` がそれを飲んで `continue` —— **stale 枝が
       * 毎周成立して `waitMs` の検めを飛び越え、CPU を焼く無限ループになった**:
       *
       *     $ time timeout 20 node s4-probe.js   # recordRun(..., {waitMs:2000, staleMs:1})
       *     real 0m20.085s  EXIT=124             ← 2000ms の期限を 10 倍超えて戻らなかった
       *
       * **期限の検めを枝より先に置く**ことが本質である。stale 回収は「早く進むための
       * 最適化」であって、**期限より強い権限を持ってはならない**。
       */
      if (Date.now() - t0 > waitMs) {
        throw new Error(`fold: 台帳の錠が ${waitMs}ms 解けない: ${lock}`);
      }
      // 死んだ走行の錠を永久に待たない。**古い錠は腐らせる**(daily-guard の lease と同じ形)。
      let st = null; try { st = fs.statSync(lock); } catch {}
      if (st && Date.now() - st.mtimeMs > (opts.staleMs || 30000)) {
        // **`recursive` を落とすな。** ディレクトリの錠は `ERR_FS_EISDIR` で消せず、
        // 消えない錠を毎周「腐った」と判じ続ける形が S-4 の無限ループであった。
        try { fs.rmSync(lock, { force: true, recursive: true }); } catch {}
        continue;
      }
      /**
       * 待つ。**同期に待たねばならない** —— `append()` は同期の口であり、
       * 呼び手(走行の終わり)は約束を待てない。
       * 刻みを乱数で散らすのは、同時に起きた者が**同時に起き直す**のを避けるためである
       * (全員が同じ刻みで待てば、取り合いが毎回同じ順で再演される)。
       */
      const backoff = 1 + Math.floor(Math.random() * 4);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, backoff);
    }
  }
  try { return fn(); } finally { try { fs.closeSync(fd); } catch {} try { fs.rmSync(lock, { force: true }); } catch {} }
}

/** 領収書の形を検める。**壊れた行を台帳に入れない**(入れれば後続が読めない)。 */
function validateReceipt(r) {
  if (!r || typeof r !== 'object') throw new Error('fold: 領収書が物ではない');
  if (typeof r.key !== 'string' || !/^[0-9a-f]{16}$/.test(r.key)) {
    throw new Error(`fold: 領収書の key が 16 桁の綴りでない: ${JSON.stringify(r.key)}`);
  }
  if (!(r.exit === null || Number.isInteger(r.exit))) {
    throw new Error(`fold: 領収書の exit は整数か null である(打ち切りは null): ${JSON.stringify(r.exit)}`);
  }
  if (typeof r.summary !== 'string') throw new Error('fold: 領収書に summary が無い');
  if (typeof r.at !== 'string' || !r.at) throw new Error('fold: 領収書に at が無い');
  /**
   * **走行の名乗り**(security S-1)。台帳は 1 回の走行の中でのみ有効である
   * (requirements §7-6)。
   *
   * ★ **欠落は「壊れた行」ではない。** 古い台帳の行や、外から足された行は
   * この欄を持たない —— それを `ledger-unreadable`(赤)にすれば、
   * **旧い台帳が 1 本あるだけで CI が倒れる**(第62条 b: 偽の赤)。
   * ゆえに形としては許し、**`selectRows()` が決して採らない**。
   * **疑わしきは畳まない**(揟7)—— 畳まないのは赤ではない。
   * 許さないのは**型の違う run**(数・物・空文字)だけである。
   */
  if (!(r.run === undefined || r.run === null || (typeof r.run === 'string' && r.run.length > 0))) {
    throw new Error(`fold: 領収書の run(走行の識別)が文字列でも null でもない: ${JSON.stringify(r.run)}`);
  }
  return r;
}

/**
 * 領収書を 1 行追記する (AC-01)。**JSON 配列にしない** ——
 * read-modify-write は TOCTOU を構造的に生む(design §1.5)。
 * @param {{key:string, exit:number|null, summary:string, at?:string}} receipt
 */
function append(receipt, opts = {}) {
  const file = ledgerPath(opts);
  // **走行の名乗りは刻む側が付ける**(security S-1)。呼び手が明示すればそれを尊ぶ。
  const run = Object.prototype.hasOwnProperty.call(receipt, 'run') ? receipt.run : runId(opts);
  const r = validateReceipt({ at: new Date().toISOString(), run, ...receipt });
  const line = JSON.stringify(r) + '\n';
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch {}
  withLock(file, () => fs.appendFileSync(file, line), opts);
  return r;
}

/**
 * 走行の終わりに領収書を刻む (FR-01 / AC-01)。
 *
 * **刻めなかったことを、刻んだことと混同しない**(第37条)。台帳が書けないのは
 * 走行の赤ではない —— 走行は既に緑である。だが黙って飲み込めば、次の段は
 * `bail=no-receipt` を名乗りながら**なぜ領収書が無いのかを誰も知らない**。
 * ゆえに理由を返り値で名乗り、呼び手が出力に載せる。
 * @returns {{written:boolean, receipt:object|null, why:string|null}}
 */
function recordRun(receipt, opts = {}) {
  try { return { written: true, receipt: append(receipt, opts), why: null }; }
  catch (e) { return { written: false, receipt: null, why: String(e.message).slice(0, 200) }; }
}

/**
 * 台帳を読む。
 *
 * **不在は空である**(AC-08: 台帳が無ければ初期状態であって欠損ではない)。
 * **読めないは空ではない**(AC-16: `ledger-unreadable` は `no-receipt` と別の値)。
 * この二つを混ぜた瞬間、壊れた台帳が「初期状態」として静かに全走に化ける ——
 * それは第37条の「検めなかったものを通過と呼ぶ」である。
 */
function read(opts = {}) {
  const file = ledgerPath(opts);
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); }
  catch (e) {
    if (e.code === 'ENOENT') return [];
    const err = new Error(`fold: 台帳が読めない (${e.code}): ${file}`);
    err.bailCode = 'ledger-unreadable';
    throw err;
  }
  const out = [];
  let broken = 0;
  for (const line of raw.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    try { out.push(JSON.parse(s)); } catch { broken++; }
  }
  if (broken) {
    const err = new Error(`fold: 台帳に壊れた行が ${broken} 件ある: ${file}`);
    err.bailCode = 'ledger-unreadable';
    throw err;
  }
  return out;
}

/**
 * **読む側の検め**(security S-3 / review F-2)。
 *
 * `validateReceipt` は長らく `append()`(書く側)からしか呼ばれなかった ——
 * **台帳は外から 1 行足せる面**であり、書く側の検めは足された行を一度も見ない。
 * ゆえに読む側でも同じ法で裁く。**形の壊れた行は黙って読み飛ばさない**
 * (prove M-12 の教訓: 落ちた領収書は不在と区別できない)。
 *
 * @returns {{rows:object[], mine:object[], otherRun:number}}
 *   `mine` = **この走行**で刻まれ、鍵の一致する行(exit は問わない)
 */
function selectRows(k, opts = {}) {
  const rows = read(opts);
  for (const r of rows) {
    try { validateReceipt(r); }
    catch (e) {
      // **不能は不在と別の値である**(AC-16 / 第62条 b ①)。skip ではなく赤。
      const err = new Error(`fold: 台帳に形の壊れた領収書がある (${e.message}): ${ledgerPath(opts)}`);
      err.bailCode = 'ledger-unreadable';
      throw err;
    }
  }
  const run = runId(opts);
  const sameKey = rows.filter(r => r.key === k);
  // **走行を跨いだ領収書は採らない**(security S-1 / requirements §7-6)。
  // `run === null`(走行を特定できない)なら一本も採らない —— 疑わしきは畳まない。
  const mine = run === null ? [] : sameKey.filter(r => r.run === run);
  /**
   * **同じ入力が二つの答えを出したなら、それは畳める状態ではない**(security S-3 / 第37条)。
   * `hits[hits.length-1]` は「最後の緑」を採る —— **本物の赤の後ろに偽の緑を 1 行足せば
   * 赤が上書きされる**。同じ走行・同じ鍵で exit が食い違う台帳は、読めない台帳である。
   */
  const exits = new Set(mine.map(r => r.exit));
  if (exits.size > 1) {
    const err = new Error(
      `fold: 同じ走行の同じ鍵で exit が食い違う台帳: ${[...exits].map(String).join(' / ')} — ` +
      `同じ入力が二つの答えを出したなら畳める状態ではない (第37条): ${ledgerPath(opts)}`);
    err.bailCode = 'ledger-unreadable';
    throw err;
  }
  return { rows, mine, otherRun: sameKey.length - mine.length };
}

/**
 * 鍵の一致する**緑の**領収書。無ければ null。
 *
 * ⚠️ **`===` を `==` に緩めてはならない**(prove 相 M-05 の無音)。
 * 緩い等号は `exit: "0"` / `exit: false` / `exit: []` を**緑と読む**。
 * 台帳は JSONL であり、**外から 1 行足せる面**である ——
 * 偽造された領収書が畳みの根拠になれば findings §4.1 Tuist #8570 が再演する。
 *
 * ⚠️ **読めない台帳を `null`(=不在)に潰さない**(review F-2 / AC-16)。
 * 以前はここに `catch { return null; }` が在り、**不能を不在として飲み込んでいた** ——
 * 台帳が壊れて畳みが永久に効かない CI が、誰にも気づかれないまま秒を払い続ける。
 * **呼び手は `err.bailCode === 'ledger-unreadable'` を読んで赤にせよ。**
 */
function find(k, opts = {}) {
  const { mine } = selectRows(k, opts);
  const green = mine.filter(r => r.exit === 0);
  return green.length ? green[green.length - 1] : null;
}

// ══════════════════════════════════════════════════════════════════════
// 裁定 — 畳むか、畳まないか。畳まないなら**なぜか**を名乗る
// ══════════════════════════════════════════════════════════════════════

/**
 * この走行を畳めるかを裁く。**設定ではなく入力を読む**(第16条)。
 *
 * 順序に意味がある:
 *   ① `--no-fold` / `PARADISE_NO_FOLD=1` は何より先(出口は常に開いている / AC-18)
 *   ② `=global` は**鍵を見るまでもなく**畳まない(AC-10 / 揟2)——
 *      「鍵が合えば畳めるが、この場合は合わなかった」という経路を**物理的に作らない**。
 *   ③ 台帳が読めないなら赤(AC-16)。不在とは別である。
 *   ④ 鍵が無い / 合わない / 緑でない / 打ち切り —— それぞれ別の語で名乗る。
 *
 * @returns {{fold:boolean, bail:string|null, key:string|null, receipt:object|null}}
 */
function decide(opts = {}) {
  const env = opts.env || process.env;
  const off = opts.off === true || env.PARADISE_NO_FOLD === '1';
  if (off) return { ...bail('disabled'), key: null, receipt: null };

  const mode = abode.resolve({ env, repoRoot: opts.root || ROOT }).mode;
  if (mode !== 'repo') {
    // **畳める経路がここから先に存在しない。** 鍵も台帳も見ない ——
    // 見れば「条件次第で畳める機構」になり、条件が一つ緩んだ日に global が畳まれる。
    return { ...bail('undeclared-state', { mode }), key: null, receipt: null };
  }

  const k = key({ env, root: opts.root });
  let sel;
  try { sel = selectRows(k, opts); }
  catch (e) { return { ...bail('ledger-unreadable', { error: e.message }), key: k, receipt: null }; }

  const { rows, mine, otherRun } = sel;
  if (!mine.length) {
    /**
     * **走行を跨いだ領収書は畳みの根拠にならない**(security S-1 / requirements §7-6)。
     * 語彙は 7 語のまま増やさない(AC-16 は表を凍らせている / 第57条)——
     * 「この走行の台帳に該当の鍵が無い」は `no-receipt` である。
     * **だが辿れねば直せない**(第21条 b)ので、跨いだ本数を `otherRun` で名乗る。
     */
    if (otherRun) return { ...bail('no-receipt', { otherRun }), key: k, receipt: null };
    return { ...bail(rows.length ? 'key-miss' : 'no-receipt'), key: k, receipt: null };
  }
  const green = mine.filter(r => r.exit === 0);
  if (green.length) return { fold: true, bail: null, key: k, receipt: green[green.length - 1] };
  // **緑しか畳まない**(FR-03 / AC-07)。findings §4.1 Tuist #8570 —
  // 鍵が content hash だけで結果を見なかったため timeout で落ちた試験が passed と報告された。
  if (mine.some(r => r.exit === null)) return { ...bail('truncated'), key: k, receipt: null };
  return { ...bail('not-green'), key: k, receipt: null };
}

/**
 * 名乗りの綴り (requirements §4.2)。**綴りは契約である。**
 * `Paradise fold:` は `passed` / `failed` の語を用いてはならない ——
 * `census.js:57` の保険経路がその語を拾い、**綴りの衝突は偽の数として現れる**。
 */
function say(prefix, unit, d, opts = {}) {
  const total = opts.total === undefined ? 1 : opts.total;
  const executed = d.fold ? total - 1 : total;
  const reused = total - executed;
  const tail = d.fold ? `key=${d.key}` : `bail=${d.bail}`;
  return `${prefix} Executed ${executed} out of ${total} ${unit} (${reused} reused, ${tail})`;
}

/**
 * 機械可読な状態 (AC-17)。**`bails` は構造を持つ** ——
 * 人間向けの文字列だけにすれば、Chromatic の TurboSnap Bail Reason 列
 * (findings §2.5)が果たしている役目を果たせない。
 *
 * ⚠️ **この器が答えるのは「いまこの入力で畳めるか」である。**
 * 過去の走行の再生ではない —— 過去を語るなら領収書そのものを読め(`read()`)。
 */
function status(opts = {}) {
  const subject = opts.subject || 'paradise.test.js';
  const total = opts.total === undefined ? 1 : opts.total;
  const d = decide(opts);
  let receipts = null;
  try { receipts = read(opts).length; } catch { receipts = null; }
  const executed = d.fold ? total - 1 : total;
  return {
    total, executed, reused: total - executed,
    key: d.key,
    bails: d.bail ? [{ code: d.bail, subject }] : [],
    receipts,
    ledger: ledgerPath(opts),
  };
}

// ══════════════════════════════════════════════════════════════════════
// P-2 — プロセス内の写像。**台帳ではない**(design §6.4)
// ══════════════════════════════════════════════════════════════════════

/**
 * 成果物のバイト列で裁定を写す写像。
 * **この写像は走行のプロセス内にしか生きない。** 台帳に載せれば Atlas の裁定が
 * CI 走行を跨いで写され、第37条違反になる(requirements §7-6)。
 */
function inspected() {
  const map = new Map();
  let total = 0, executed = 0, reused = 0;
  return {
    /**
     * @param {string} htmlKey 成果物のバイト列の鍵
     * @param {string} by      `<主題>@<道>` — **写し元を名指すため**(AC-12 / 第21条 b)
     * @param {() => object} run 実際に検める手。初出のときだけ呼ばれる
     * @param {number} weight この呼びが表す検査の本数(Atlas は 1 主題 2 検査)
     */
    take(htmlKey, by, run, weight = 1) {
      total += weight;
      const prior = map.get(htmlKey);
      if (prior) { reused += weight; return { ...prior.value, reusedFrom: htmlKey, reusedBy: prior.by }; }
      executed += weight;
      const value = run();
      map.set(htmlKey, { value, by });
      return { ...value, reusedFrom: null };
    },
    /**
     * **畳まない走行でも数を数える**(review F-3 / AC-14)。
     *
     * `--no-fold` の走行は `take()` を通らないので `total` が 0 のままになり、
     * `atlas.js` の名乗りが**行ごと落ちていた** —— 実測(review F-3):
     * `node graph/atlas.js check --scale quick --static --no-fold` の出力に
     * **`Atlas inspect:` の行が存在しなかった**。
     * **切ったつもりの機構が走り続けることを、出力が否定できない**(第37条)。
     *
     * 畳まない走行では**すべてが実行である** —— `total` と `executed` を共に進める。
     * 写像には**触れない**(`map` に入れれば、切ったはずの畳みが裏で効く)。
     */
    count(weight = 1) { total += weight; executed += weight; },
    /**
     * 数を答える。**ここで恒等式を自ら検める**(prove 相 M-07 の硬化)。
     *
     * ⚠️ **`closed()` を呼び手に委ねてはならなかった。** prove 相の実測 M-07:
     * `closed()` を `return true` に潰しても **20 門も 7 門も一本も鳴らなかった** ——
     * **誰も呼んでいなかったからである**(`grep -rn '\.closed()'` の答えが 0 件)。
     * AC-15 は「錠は畳みの関数の外に立つ」と言うが、**呼ばれない錠は外でも内でもない。**
     * ゆえに数を配る口そのものが倒れる。錠は**数が読まれる経路の上**に置く。
     *
     * ⚠️ **`closed()` は消した**(review R-1 の裁定 / 第48条 c)。
     * `closed() { return true; }` は**入力に依らず必ず通る飾り**であり、
     * しかも註釈が己を「錠」と名乗っていた —— 次の誰かが「錠は二つある」と読み、
     * **`tally()` の本物の錠を外して飾りを残す**道が開いていた。
     * **本物の錠はここに在る。** その形は `fold.test.js` の
     * 『fold: P-2 の恒等式の錠は数を配る口の上に立つ (prove M-07)』が
     * ソースで凍らせ、**錠を抜く変異を撃って鳴らす**。
     */
    tally() {
      if (executed + reused !== total) {
        throw new Error(`fold: P-2 の数が閉じない — executed=${executed} reused=${reused} total=${total}。`
          + '総数と実行数が別の数として閉じない畳みは、測定ではない (AC-15 / 第22条)');
      }
      return { total, executed, reused, distinct: map.size };
    },
  };
}

// ══════════════════════════════════════════════════════════════════════
// P-3 — Chrome の持ち回し。**借り物には一行も触れない**(第20条)
// ══════════════════════════════════════════════════════════════════════

const VISUAL_CHECK = path.join(ROOT, 'overlay', 'vendor', 'archify', 'bin', 'visual-check.mjs');

/**
 * 借り物 `visual-check.mjs` の `browserFactory` 注入口へ渡す持ち回しの器。
 *
 * `overlay/vendor/archify/bin/visual-check.mjs:721-725` は**既に**
 * `browserFactory = async (resolvedChrome) => new ChromeVisualBrowser(resolvedChrome)`
 * を受ける。ゆえに書き換えは要らない —— 外から渡すだけである(requirements §7-7)。
 *
 * ⚠️ **`close()` を無力化する設計は、第50条の裏面の既往症を再発させうる唯一の設計である。**
 * `motion-probe.mjs` の註釈が記録している ——「自前の半端な kill だけを呼んでいた頃は
 * SIGTERM を無視した Chrome が生き残り、一時プロファイルが 483 → 519 → 529 と
 * 単調増加した(検器 1 回で +2)」。
 * ゆえに **`dispose()` を必ず `finally` から呼ぶ**。借り物の `close()` は
 * `failAll` → SIGTERM→SIGKILL → `fs.rmSync(profileRoot)` の 3 つを行う(`:498-521`)。
 * 覆いは**無力化するだけで消しはしない**。最後に一度本物を閉じれば 3 つすべてが走る。
 * 実測(design D-6): 起動 2→1 / **プロファイル残 0 個** / 裁定の本数と ok が完全一致。
 */
function pooledBrowserFactory(opts = {}) {
  let shared = null, real = null, launches = 0;
  const load = opts.load || (() => import(require('url').pathToFileURL(opts.module || VISUAL_CHECK).href));
  return {
    launches: () => launches,
    factory: async (chrome) => {
      if (!shared) {
        const m = await load();
        real = new m.ChromeVisualBrowser(chrome);
        launches++;
        shared = new Proxy(real, {
          get(t, k) {
            // 持ち回すので閉じない。**閉じる責は呼び手が握る**(下の dispose)
            if (k === 'close') return async () => {};
            const v = t[k];
            return typeof v === 'function' ? v.bind(t) : v;
          },
        });
      }
      return shared;
    },
    /** **必ず finally から呼ぶ。** 途中で投げても残骸を残さないため。 */
    dispose: async () => {
      if (real) { try { await real.close(); } catch {} }
      real = shared = null;
    },
  };
}

// ══════════════════════════════════════════════════════════════════════
// CLI
// ══════════════════════════════════════════════════════════════════════

function main(argv) {
  const [cmd, ...rest] = argv;
  const flags = new Set(rest);
  if (cmd === 'fold-key') {
    const e = keyExplain();
    if (flags.has('--explain')) { console.log(JSON.stringify(e, null, 2)); return 0; }
    console.log(e.key);
    return 0;
  }
  if (cmd === 'fold-status') {
    const s = status();
    if (flags.has('--json')) { console.log(JSON.stringify(s, null, 2)); return 0; }
    console.log(`fold: Executed ${s.executed} out of ${s.total} runs (${s.reused} reused` +
      (s.bails.length ? `, bail=${s.bails[0].code}` : `, key=${s.key}`) + ')');
    console.log(`  台帳: ${s.ledger} (領収書 ${s.receipts === null ? '読めない' : s.receipts + ' 行'})`);
    return 0;
  }
  console.error('commands: fold-key [--explain] | fold-status [--json]');
  return 2;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = {
  ROOT, BAIL_CODES, ROOT_DOCS, ledgerPath, lockPath, runId,
  materials, key, keyExplain, artifactKey,
  append, recordRun, read, find, selectRows, withLock, validateReceipt,
  decide, say, status, inspected,
  pooledBrowserFactory, VISUAL_CHECK, main,
};
