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
 * 鍵の材料 KF(design §2.1)。**名簿を写経しない** —— 走査で数える。
 *
 *   tests/**.js                門の本体
 *   graph/**.js                engine の本体
 *   graph/*.json               engine の宣言表(**1 階層のみ**)
 *   overlay/vendor/archify/**  借り物の描画器(Atlas の裁定を左右する。design §2.4)
 *   .github/workflows/*.yml    段が変われば「同じ入力の走行」ではない(design §2.5)
 *   ∖ derived.js が宣言する生成物
 *
 * ⚠️ **生成物を機械的に除く理由**(第29条 / design §2.2)。
 * `graph/lessons.json` は素朴な綴り `graph/*.json` に入る。入れれば
 * **CI が export し直した瞬間に鍵が動き、畳みが永久に効かなくなる**
 * —— 偽の緑ではなく、機構が無言で死ぬ。名簿を写経すれば次に生成物が増えた日に黙って壊れる。
 *
 * ⚠️ **先頭が `.` の名は材料に採らない。** 門は走行中に自分の写しを
 * `tests/.paradise-f1-probe-<pid>.js` として置き、`finally` で消す
 * (`paradise.test.js:10825`)。それを材料に採れば、**鍵が走行の途中で動く**。
 */
const DOT = (name) => name.startsWith('.');

function walkJs(root, rel, out, depth = 0) {
  if (depth > 6) return;
  let ents = [];
  try { ents = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch { return; }
  for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
    if (DOT(e.name)) continue;
    const r = rel + '/' + e.name;
    if (e.isDirectory()) walkJs(root, r, out, depth + 1);
    else if (e.name.endsWith('.js')) out.push(r);
  }
}
function walkAll(root, rel, out, depth = 0) {
  if (depth > 6) return;
  let ents = [];
  try { ents = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch { return; }
  for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
    if (DOT(e.name)) continue;
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
  walkAll(root, 'overlay/vendor/archify', out);
  let wf = [];
  try { wf = fs.readdirSync(path.join(root, '.github', 'workflows')); } catch { wf = []; }
  for (const n of wf.sort()) if (!DOT(n) && /\.ya?ml$/.test(n)) out.push('.github/workflows/' + n);
  const derived = derivedSet();
  return out.filter(f => !derived.has(f)).sort();
}

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

/** 成果物のバイト列から採る鍵 (P-2 / AC-11)。**IR でも主題名でも道名でもない**(第16条)。 */
function artifactKey(fileOrBuffer) {
  const buf = Buffer.isBuffer(fileOrBuffer) ? fileOrBuffer : fs.readFileSync(fileOrBuffer);
  return sha256(buf).slice(0, 16);
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
      // 死んだ走行の錠を永久に待たない。**古い錠は腐らせる**(daily-guard の lease と同じ形)。
      let st = null; try { st = fs.statSync(lock); } catch {}
      if (st && Date.now() - st.mtimeMs > (opts.staleMs || 30000)) {
        try { fs.rmSync(lock, { force: true }); } catch {}
        continue;
      }
      if (Date.now() - t0 > waitMs) {
        throw new Error(`fold: 台帳の錠が ${waitMs}ms 解けない: ${lock}`);
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
  return r;
}

/**
 * 領収書を 1 行追記する (AC-01)。**JSON 配列にしない** ——
 * read-modify-write は TOCTOU を構造的に生む(design §1.5)。
 * @param {{key:string, exit:number|null, summary:string, at?:string}} receipt
 */
function append(receipt, opts = {}) {
  const file = ledgerPath(opts);
  const r = validateReceipt({ at: new Date().toISOString(), ...receipt });
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

/** 鍵の一致する**緑の**領収書。無ければ null。 */
function find(k, opts = {}) {
  let rows;
  try { rows = read(opts); } catch { return null; }
  const hits = rows.filter(r => r.key === k && r.exit === 0);
  return hits.length ? hits[hits.length - 1] : null;
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
  let rows;
  try { rows = read(opts); }
  catch (e) { return { ...bail('ledger-unreadable', { error: e.message }), key: k, receipt: null }; }

  const hits = rows.filter(r => r.key === k);
  if (!hits.length) {
    return { ...bail(rows.length ? 'key-miss' : 'no-receipt'), key: k, receipt: null };
  }
  const green = hits.filter(r => r.exit === 0);
  if (green.length) return { fold: true, bail: null, key: k, receipt: green[green.length - 1] };
  // **緑しか畳まない**(FR-03 / AC-07)。findings §4.1 Tuist #8570 —
  // 鍵が content hash だけで結果を見なかったため timeout で落ちた試験が passed と報告された。
  if (hits.some(r => r.exit === null)) return { ...bail('truncated'), key: k, receipt: null };
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
    tally() { return { total, executed, reused, distinct: map.size }; },
    /** **恒等式の錠は畳みの関数の外に立つ**(AC-15)。破れたら呼び手が倒れる。 */
    closed() { return executed + reused === total; },
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
  ROOT, BAIL_CODES, ledgerPath, lockPath,
  materials, key, keyExplain, artifactKey,
  append, recordRun, read, find, withLock, validateReceipt,
  decide, say, status, inspected,
  pooledBrowserFactory, VISUAL_CHECK, main,
};
