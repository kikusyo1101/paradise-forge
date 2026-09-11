#!/usr/bin/env node
'use strict';
/**
 * hermetic.js — 門が己の測る対象を汚していないかを裁く (憲法 第58条(c))
 *
 * **実測された事故**(design.md §5.4):教主と子が同じ倉で同時に門を撃ったところ、
 * `census.js check` が三通りの答えを返した:
 *
 *     教主の走行:  🔴 README テスト数: doc says 455/455, reality is 16/16
 *     子の走行:    🔴 README テスト数: doc says 455/455, reality is 451/455
 *     単独の走行:  ✓ every number the paradise claims about itself is true
 *
 * 真因は「門が走行中に**版管理下の現物**(`README.md` / `graph/domains.json`)を
 * 書き換えて元に戻す」ことだった。15ms 間隔の標本で窓を捕らえた:
 *
 *     [tick 8]  DIRTY(TRACKED):  M README.md
 *     [tick 12] DIRTY(TRACKED):  M graph/domains.json
 *
 * **動機は正しい**(「作り物ではなく現物を歩いていること」まで測るため)。
 * **だが密閉されていない。** その窓の間に別のプロセスが同じ現物を読めば、
 * 汚染された散文を見て**偽の赤**を出す。同じ命令が、同時に走ると別の答えを返す。
 * **測定が測定を壊すなら、その数は測定ではない。**
 *
 * ゆえにこの engine は `tests/*.js` を走査し、
 * **`ROOT` / `DIR` / `__dirname` 起点の版管理下ファイルへの
 * `writeFileSync` / `appendFileSync` / `rmSync` / `unlinkSync` を行番号で名指す。**
 *
 * ⚠️ **除外は「`finally` で復元していること」ではない。復元しても窓は開く。**
 * 除外は「**複製**(`mkdtempSync` / `os.tmpdir()` 配下)に対して書いていること」だけである。
 *
 * ⚠️ **この門は自分自身にも掛かる。** `tests/` を走査する以上、この門の回帰試験も
 * 走査対象である。**裁かれる側が裁きの範囲を決めてはならない**(第54条(d))。
 * 除外の名簿(`EXEMPT`)は空であり、空であることをこの engine 自身が主張する。
 *
 *   node graph/hermetic.js check    版管理下を汚す行を名指す (exit 1 = 赤)
 *   node graph/hermetic.js list     全ての書き込み呼び出しを分類して並べる
 *   node graph/hermetic.js --json   機械可読
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

/** 現物を書き換えうる呼び出し。**復元の有無は問わない** — 窓が開くこと自体が病である。 */
const MUTATORS = ['writeFileSync', 'appendFileSync', 'rmSync', 'unlinkSync'];

/**
 * 走査する場所。`tests/` の全ての .js —— 門も、門を守る門も、等しく掛かる。
 * **除外の名簿は存在しない。** 一つでも足せば、それは条の改正である(第54条(d))。
 */
const SCAN_DIRS = ['tests'];
const EXEMPT = Object.freeze([]);

// ── 字句の道具 (構文解析器は持ち込まない — 外部依存ゼロが楽園の掟) ──────

/** `src[i]` の開き括弧に対応する閉じ括弧の位置。文字列の中は数えない。 */
function matchParen(src, i) {
  let depth = 0, quote = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/** 引数並びを最上位のカンマで割る。 */
function splitArgs(inner) {
  const out = [];
  let depth = 0, quote = null, start = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ',' && depth === 0) { out.push(inner.slice(start, i)); start = i + 1; }
  }
  out.push(inner.slice(start));
  return out;
}

/**
 * 註釈と文字列を空白に潰した影を作る。束縛の走査はこの影の上で行う。
 *
 * ⚠️ **`Array.from` を使ってはならない** —— 実測した罠(build 相):
 * `Array.from` は**コードポイント**で割るので、絵文字(サロゲート対)を 1 要素にする。
 * 一方 `src[i]` は **UTF-16 符号単位**で読む。試験の散文には 🔴 が住んでいるので、
 * その先で影と原本の添字が 1 ずつずれ、**引数の切り出しが 3 文字ずれた**
 * (`fs.rmSync(d` が `fs.rmSync(ync(d` と読まれた)。`split('')` は符号単位で割る。
 *
 * ⚠️ **正規表現リテラルを飛ばさねばならない** —— これも実測した罠。
 * 試験には `/['\"]/` のような正規表現が住んでいる。字句器が正規表現を知らないと、
 * その中の `'` を**文字列の開始**と読み、そこから次の `'` までを丸ごと空白に潰す。
 * 実測: `tests/paradise.test.js:7079` の `fs.writeFileSync(domainsT.LEDGER, …)` が
 * **影の上から消え、門が見落とした**。見落とす門は門ではない(第21条)。
 */
function shadow(src, spans) {
  const out = src.split('');
  // 直前の意味のある文字。これで `/` が除算か正規表現かを分ける(古典的な手)。
  let prev = '';
  const REGEX_OK_BEFORE = /[([{;,:=!&|?+\-*%~^<>]$/;
  const REGEX_OK_WORDS = /\b(?:return|typeof|instanceof|in|of|new|delete|void|case|do|else|yield|await)$/;
  let recent = '';
  const mark = (kind, from, to) => { if (spans) spans.push({ kind, from, to }); };
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      const from = i;
      while (i < src.length && src[i] !== '\n') { out[i] = ' '; i++; }
      mark('line-comment', from, i);
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const from = i;
      const end = src.indexOf('*/', i + 2);
      const stop = end < 0 ? src.length : end + 2;
      for (; i < stop; i++) if (src[i] !== '\n') out[i] = ' ';
      mark('block-comment', from, stop);
      continue;
    }
    if (c === '/' && (prev === '' || REGEX_OK_BEFORE.test(prev) || REGEX_OK_WORDS.test(recent))) {
      // 正規表現リテラル。文字クラス [...] の中の `/` は区切りではない。
      let j = i + 1, cls = false, closed = false;
      for (; j < src.length; j++) {
        const d = src[j];
        if (d === '\\') { j++; continue; }
        if (d === '\n') break;              // 行を跨ぐ正規表現は無い = 除算だった
        if (cls) { if (d === ']') cls = false; continue; }
        if (d === '[') { cls = true; continue; }
        if (d === '/') { closed = true; break; }
      }
      if (closed) {
        mark('regex', i, j + 1);
        for (; i <= j; i++) out[i] = ' ';
        prev = '/'; recent = '';
        continue;
      }
      // 閉じなかった = 除算。素通りさせる
    }
    if (c === '"' || c === "'" || c === '`') {
      const q = c, from = i;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { out[i] = ' '; if (i + 1 < src.length && src[i + 1] !== '\n') out[i + 1] = ' '; i += 2; continue; }
        if (src[i] === q) break;
        if (src[i] !== '\n') out[i] = ' ';
        i++;
      }
      mark(q === '`' ? 'template' : 'string', from, i + 1);
      i++;
      prev = q; recent = '';
      continue;
    }
    if (!/\s/.test(c)) { prev = c; recent = /[\w$]/.test(c) ? (recent + c).slice(-12) : ''; }
    i++;
  }
  return out.join('');
}

// ── 住所の出自を判ずる ──────────────────────────────────────────────

/** 仮倉の印。**これだけが除外を与える** — `finally` の復元は除外ではない。 */
const SANDBOX_RE = /\bmkdtempSync\s*\(|\bos\.tmpdir\s*\(|\btmpdir\s*\(|\bmkdtemp\s*\(/;
/**
 * 倉の根の印。**それぞれが倉のどこを指すかは、そのファイル自身の宣言で決まる。**
 * `tests/paradise.test.js` の `DIR` は `tests/`、`ROOT` は `path.join(DIR, '..')` = 倉の根。
 * 両方を「倉の根」と一緒くたにすれば、`path.join(DIR, 'x.js')` を `x.js` と読み違え、
 * **版管理下の別物と取り違える**(実測: `path.join(md の親, …)` を `agents…` と読んだ)。
 * ゆえに **anchorsOf() がファイルごとに実測する**。
 */
const REPO_ROOT_IDENT = /^(?:ROOT|DIR|GRAPH|OVERLAY|PARADISE_ROOT|__dirname|__filename)$/;
/** engine が輸出する住所の定数。**engine の定数であっても倉の中である。** */
const LEDGER_MEMBER_RE = /^[A-Za-z_$][\w$]*\.[A-Z][A-Z0-9_]*\b/;

/**
 * **既知の未修** —— 同じ病だが、直しが**この engine の外**に住む箇所。
 *
 * これは免除ではない。**赤の台帳である**:
 *   - 台帳に載った箇所は「未修」として毎回名指され、口で数えられる
 *   - 台帳に**無い**新しい違反は即座に赤(病を新たに埋める道は塞がれている)
 *   - 台帳の行が**鳴らなくなったら赤**(直ったのに台帳が残るのを許さない。
 *     残せば、次に同じ場所へ病を埋め戻したとき台帳が黙って庇う)
 *
 * ゆえに台帳は**縮むことしかできない**。増やすには PR が要り、神の御手が要る
 * (第54条(d): 裁かれる側が裁きの範囲を決めてはならない)。
 *
 * ── **台帳は今、空である。** ───────────────────────────────────────
 * 建てられた時、この台帳は一件を載せていた: `tests/paradise.test.js` の
 * `ARCHIFY`(5箇所)—— 版管理下の描画器 `overlay/vendor/archify/bin/archify.mjs`
 * を stub で上書きして分類を撃つ故障注入である。直しは `atlas.js` の領分だった。
 * その一件は `PARADISE_ARCHIFY` の口が建ったことで塞がれ、台帳から外された。
 * 15ms 標本が見ていた窓は閉じた:
 *
 *     修復前: [tick 17571] DIRTY(TRACKED):  M overlay/vendor/archify/bin/archify.mjs
 *     修復後: DIRTY(TRACKED) 0 回 (全走行を通して)
 *
 * **空の台帳に足すことは、条の改正である。**
 */
const KNOWN_OPEN = Object.freeze([]);

/**
 * `path.join(...)` / `path.resolve(...)` を剥いで、**根の式**と**続く綴り**を返す。
 * 根が仮倉なら、その先に何を継いでも仮倉である。根が倉なら、継いだ先は版管理下でありうる。
 */
function peel(expr) {
  let e = String(expr).trim();
  const tail = [];
  for (let guard = 0; guard < 12; guard++) {
    const m = e.match(/^(?:path\s*\.\s*)?(?:join|resolve|normalize)\s*\(/);
    if (!m) break;
    const end = matchParen(e, m[0].length - 1);
    if (end < 0) break;
    const args = splitArgs(e.slice(m[0].length, end));
    tail.unshift(...args.slice(1).map(s => s.trim()));
    e = args[0].trim();
  }
  return { root: e, tail };
}

/** `a/b/../c` → `a/c`。倉の外へ出たら null(倉の相対路として語れない)。 */
function normalizeRel(rel) {
  if (rel === null || rel === undefined) return null;
  const out = [];
  for (const p of String(rel).split('/')) {
    if (!p || p === '.') continue;
    if (p === '..') { if (!out.length) return null; out.pop(); continue; }
    out.push(p);
  }
  return out.join('/');
}

/** 綴りが全て文字列リテラルなら、それを `/` で繋いで返す。組めなければ null。 */
function literalPath(tail) {
  const parts = [];
  for (const t of tail) {
    const m = t.match(/^'([^'\\]*)'$|^"([^"\\]*)"$|^`([^`$\\]*)`$/);
    if (!m) return null;
    parts.push(m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3]);
  }
  return parts.join('/');
}

/**
 * 綴りが**途中まで**しかリテラルでないとき、確実に決まっている**前置**を返す。
 *
 * `path.join(DIR, \`.paradise-f1-probe-${process.pid}.js\`)` は綴りが組めない。
 * だが `tests/.paradise-f1-probe-` までは決まっている。**版管理下の何一つ
 * この前置で始まらないなら、その書き込みは版管理下を汚しえない。**
 * ここで止めなければ、門は「判らない」を全部赤にして狼少年になる(第21条)。
 * 逆に前置すら取れないなら null —— **判定不能は緑ではない**(第16条)。
 */
function literalPrefix(tail) {
  const parts = [];
  for (const t of tail) {
    const full = t.match(/^'([^'\\]*)'$|^"([^"\\]*)"$|^`([^`$\\]*)`$/);
    if (full) {
      parts.push(full[1] !== undefined ? full[1] : full[2] !== undefined ? full[2] : full[3]);
      continue;
    }
    // 途中までリテラルなテンプレート / 連結: 先頭の綴りだけを採って打ち切る
    const head = t.match(/^`([^`$\\]*)\$\{/) || t.match(/^'([^'\\]*)'\s*\+/) || t.match(/^"([^"\\]*)"\s*\+/);
    if (head && head[1]) parts.push(head[1]);
    return parts.length ? parts.join('/') : null;
  }
  return parts.join('/');
}

// ── 束縛の解決 (直前の宣言を採る — 位置で決める) ────────────────────

/**
 * ファイル中の全ての束縛を位置つきで集める。
 * `const/let/var NAME = <式>` と `for (const NAME of <式>)` を見る。
 * 分割代入は見ない —— 見えないものは `unknown` として正直に返す(第37条)。
 */
function bindingsOf(src, sh) {
  const list = [];
  /**
   * `const src = …, dst = …;` の**二番目以降**も束縛である。
   * 実測: これを落とすと `dst` が「出自不明」に落ち、複製への書き込みが
   * 門の警告欄を埋めて本当の赤が霞んだ。ゆえに宣言子をカンマで辿る。
   */
  const declRe = /\b(?:const|let|var)\s+/g;
  let m;
  while ((m = declRe.exec(sh))) {
    let i = m.index + m[0].length;
    for (let n = 0; n < 8; n++) {                       // 一つの宣言に宣言子は高々数個
      const nm = sh.slice(i).match(/^([A-Za-z_$][\w$]*)\s*=\s*/);
      if (!nm) break;
      const start = i + nm[0].length;
      let depth = 0, j = start;
      for (; j < sh.length; j++) {
        const c = sh[j];
        if ('([{'.includes(c)) depth++;
        else if (')]}'.includes(c)) { if (depth === 0) break; depth--; }
        else if ((c === ';' || c === '\n') && depth === 0) break;
        else if (c === ',' && depth === 0) break;       // 次の宣言子
      }
      list.push({ name: nm[1], at: i, expr: src.slice(start, j) });
      if (sh[j] !== ',') break;
      i = j + 1;
      while (/\s/.test(sh[i] || '')) i++;
    }
  }
  const forRe = /\bfor\s*\(\s*(?:const|let|var)\s+(?:\[[^\]]*?\b([A-Za-z_$][\w$]*)\s*\]|([A-Za-z_$][\w$]*))\s+of\s+/g;
  while ((m = forRe.exec(sh))) {
    const start = m.index + m[0].length;
    const close = matchParen(sh, sh.indexOf('(', m.index));
    list.push({ name: m[1] || m[2], at: m.index, expr: src.slice(start, close > start ? close : start + 300) });
  }
  list.sort((a, b) => a.at - b.at);
  return list;
}

/**
 * 位置 `at` から見える `name` の束縛 = **直前の宣言**。
 * 完全なスコープ解析ではない。だが試験の書き方(一つの `test()` の中で
 * `const d = fs.mkdtempSync(...)` と書き、その下で使う)に対しては位置が答である。
 */
function bindingFor(bindings, name, at) {
  let best = null;
  for (const b of bindings) {
    if (b.name !== name) continue;
    if (b.at >= at) break;
    best = b;
  }
  return best;
}

/**
 * 試験は**工場**を持つ。`const d = makeCreation(spec, code)` の `d` は、
 * 工場の中の `fs.mkdtempSync(...)` から生まれた複製である。
 * 工場を辿らなければ、複製への書き込みが軒並み「出自不明」に落ちて門が霞む。
 *
 * ゆえに関数の宣言を集め、その本体の `return <式>` の出自を測る。
 * 本体が複数の `return` を持ち出自が割れたら **repo に倒す**(安全側)。
 */
function functionsOf(src, sh) {
  const out = new Map();
  const decls = [
    /\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\s*)?\([^)]*\)\s*(?:=>)?\s*\{/g,
  ];
  for (const re of decls) {
    let m;
    while ((m = re.exec(sh))) {
      const brace = sh.indexOf('{', m.index + m[0].length - 1);
      const end = matchParen(sh, brace);
      if (end < 0) continue;
      if (!out.has(m[1])) out.set(m[1], { at: m.index, start: brace, end, name: m[1] });
    }
  }
  return out;
}

/** 関数本体の `return` 式(影の上で探す)。 */
function returnsOf(src, sh, fn) {
  const body = sh.slice(fn.start, fn.end);
  const out = [];
  const re = /\breturn\s+/g;
  let m;
  while ((m = re.exec(body))) {
    const start = fn.start + m.index + m[0].length;
    let depth = 0, i = start;
    for (; i < sh.length && i < fn.end; i++) {
      const c = sh[i];
      if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) { if (depth === 0) break; depth--; }
      else if ((c === ';' || c === '\n') && depth === 0) break;
    }
    out.push({ at: start, expr: src.slice(start, i) });
  }
  return out;
}

/**
 * 式の出自を判ずる。返すのは `{ origin, rel, prefix }`。
 *   origin: 'sandbox' | 'repo' | 'unknown'
 *   rel:    **倉の根からの**相対路 (綴りが全て組めたときだけ)
 *   prefix: 綴りが途中までしか組めないときの、確実に決まっている前置
 *
 * `ctx` は `{ bindings, functions, anchors, src, sh }`。
 * `anchors` は「そのファイルの `DIR` / `ROOT` が倉のどこか」の実測地図である。
 */
function originOf(expr, ctx, at, seen) {
  const guard = seen || new Set();
  const bindings = ctx.bindings || [];
  const anchors = ctx.anchors || {};
  const { root, tail } = peel(expr);

  const fromAnchor = (base) => {
    const lit = literalPath(tail);
    const pre = literalPrefix(tail);
    const j = (a, b) => (b === null ? null : normalizeRel(a ? a + '/' + b : b));
    return { origin: 'repo', rel: j(base, lit), prefix: j(base, pre) };
  };

  if (SANDBOX_RE.test(root)) return { origin: 'sandbox', rel: null, prefix: null };
  if (/^__dirname$|^__filename$/.test(root)) return fromAnchor(anchors.__dirname || '');
  if (LEDGER_MEMBER_RE.test(root)) return { origin: 'repo', rel: null, prefix: null, ledger: root };

  const id = root.match(/^([A-Za-z_$][\w$]*)\s*$/);
  if (id) {
    const name = id[1];
    /**
     * **束縛を先に見る。地図(anchors)は最後の手段である。**
     * `DIR` / `ROOT` は宣言を辿れば `__dirname` に着き、`__dirname` は地図で
     * 実測される。位置で辿った答えの方が常に正しい —— 同じ名前が別の場所で
     * 別の物を指す形(実測: `test()` の中の局所 `const ROOT`)に耐える。
     */
    if (guard.has('v:' + name + '@' + at)) return { origin: 'unknown', rel: null, prefix: null };
    guard.add('v:' + name + '@' + at);
    const b = bindingFor(bindings, name, at);
    if (b) {
      const up = originOf(b.expr, ctx, b.at, guard);
      if (up.origin === 'repo') {
        // 束縛が指す道に、こちらの綴りを継ぐ
        const lit = literalPath(tail), pre = literalPrefix(tail);
        const join = (base, add) => (add === null || base === null ? null
          : normalizeRel(base ? (add ? base + '/' + add : base) : add));
        return {
          origin: 'repo',
          rel: tail.length === 0 ? up.rel : join(up.rel, lit),
          prefix: tail.length === 0 ? (up.prefix !== undefined ? up.prefix : up.rel)
                                    : join(up.rel !== null ? up.rel : up.prefix, pre),
          ledger: up.ledger,
        };
      }
      return up;
    }
    // 宣言が見えない。地図に載っていれば採る(別ファイルから持ち込まれた定数など)
    if (Object.prototype.hasOwnProperty.call(anchors, name)) return fromAnchor(anchors[name]);
    if (REPO_ROOT_IDENT.test(name)) return { origin: 'repo', rel: null, prefix: null };
    return { origin: 'unknown', rel: null, prefix: null };
  }

  // 工場の呼び出し —— `makeCreation(...)` の中身が仮倉なら、返り値も仮倉である
  const call = root.match(/^([A-Za-z_$][\w$]*)\s*\(/);
  if (call && ctx.functions && ctx.functions.has(call[1])) {
    const key = 'f:' + call[1];
    if (guard.has(key)) return { origin: 'unknown', rel: null, prefix: null };
    guard.add(key);
    const fn = ctx.functions.get(call[1]);
    const rets = returnsOf(ctx.src, ctx.sh, fn);
    const kinds = new Set();
    for (const r of rets) kinds.add(originOf(r.expr, ctx, r.at, guard).origin);
    kinds.delete('unknown');
    if (kinds.size === 1 && [...kinds][0] === 'sandbox') return { origin: 'sandbox', rel: null, prefix: null };
    if (kinds.has('repo')) return { origin: 'repo', rel: null, prefix: null };   // 割れたら安全側 = 倉
    return { origin: 'unknown', rel: null, prefix: null };
  }

  // 根が式のまま (三項・メンバ参照)。印だけで判ずる。
  if (SANDBOX_RE.test(expr)) return { origin: 'sandbox', rel: null, prefix: null };
  if (/\b(?:ROOT|DIR|__dirname|__filename)\b/.test(expr)) return { origin: 'repo', rel: null, prefix: null };
  return { origin: 'unknown', rel: null, prefix: null };
}

/**
 * そのファイルの「倉の根の印」が、**倉のどこを指すか**を実測する。
 * `__dirname` は自明(そのファイルの住むディレクトリ)。
 * `const DIR = __dirname` / `const ROOT = path.join(DIR, '..')` を辿って地図を建てる。
 * **推測しない** —— 辿れなかった名前は地図に載せず、`rel` を null に落とす(第37条)。
 */
function anchorsOf(file, src, sh, bindings, root) {
  const base = root || ROOT;
  const selfDir = normalizeRel(path.relative(base, path.dirname(file)).split(path.sep).join('/'));
  // 走査の起点の**外**に住むファイルは、起点からの相対路で語れない。推測しない(第37条)。
  if (selfDir === null) return {};
  const map = { __dirname: selfDir, __filename: selfDir };
  const resolve = (expr, depth) => {
    if (depth > 6) return null;
    const { root, tail } = peel(expr);
    if (SANDBOX_RE.test(root)) return null;
    let base = null;
    if (/^__dirname$|^__filename$/.test(root)) base = selfDir;
    else {
      const id = root.match(/^([A-Za-z_$][\w$]*)\s*$/);
      if (!id) return null;
      if (Object.prototype.hasOwnProperty.call(map, id[1])) base = map[id[1]];
      else {
        const b = bindings.find(x => x.name === id[1]);
        if (!b) return null;
        base = resolve(b.expr, depth + 1);
      }
    }
    if (base === null) return null;
    const lit = literalPath(tail);
    if (lit === null) return null;
    return normalizeRel(base ? (lit ? base + '/' + lit : base) : lit);
  };
  // 冒頭の宣言(先に現れたものが定数の宣言である)を採る
  for (const b of bindings) {
    if (!REPO_ROOT_IDENT.test(b.name)) continue;
    if (Object.prototype.hasOwnProperty.call(map, b.name)) continue;
    const r = resolve(b.expr, 0);
    if (r !== null) map[b.name] = r;
  }
  return map;
}

// ── 版管理下かどうかは git に訊く (推測しない) ───────────────────────

let TRACKED = null;
function trackedSet() {
  if (TRACKED) return TRACKED;
  TRACKED = new Set();
  try {
    const out = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
    for (const l of out.split('\n')) if (l.trim()) TRACKED.add(l.trim());
  } catch { /* git が無い機では空集合 — 下の fail-closed が効く */ }
  return TRACKED;
}
/** git が答えられたか。答えられないなら「版管理下でない」と**言い切らない**(第37条)。 */
function gitAnswered() { return trackedSet().size > 0; }

// ── 走査 ────────────────────────────────────────────────────────────

/**
 * 一つのファイルを走査する。
 *
 * `opts.root` は**走査の起点**を差し替える (`clergy.js lexicon-check --root` と同型)。
 * **判定則は一行も変わらない** —— 変わるのは「倉の根が何処か」だけである。
 * これが在るので、この門の回帰試験は**複製の中に**作り物の試験を建てて撃てる
 * (門が己を裁く以上、試験が版管理下に書けば門自身が赤にする — 第54条(d))。
 */
function scanFile(file, opts = {}) {
  const root = opts.root ? path.resolve(opts.root) : ROOT;
  const src = fs.readFileSync(file, 'utf8');
  const spans = [];
  const sh = shadow(src, spans);
  const bindings = bindingsOf(src, sh);
  const ctx = { src, sh, bindings, functions: functionsOf(src, sh),
                anchors: anchorsOf(file, src, sh, bindings, root) };
  const rel = path.relative(root, file).split(path.sep).join('/');

  // 行番号は影の上の改行で数える (CRLF でもずれない)
  const lineStarts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') lineStarts.push(i + 1);
  const lineOf = (idx) => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };

  const out = [];
  const callRe = new RegExp(`\\b([A-Za-z_$][\\w$]*)\\s*\\.\\s*(${MUTATORS.join('|')})\\s*\\(`, 'g');
  let m;
  while ((m = callRe.exec(sh))) {
    const open = m.index + m[0].length - 1;
    const close = matchParen(sh, open);
    if (close < 0) continue;
    const arg = splitArgs(src.slice(open + 1, close))[0];
    const o = originOf(arg, ctx, m.index);
    out.push({
      file: rel, line: lineOf(m.index), obj: m[1], fn: m[2],
      arg: String(arg).trim().replace(/\s+/g, ' ').slice(0, 100),
      origin: o.origin, rel: o.rel, prefix: o.prefix === undefined ? null : o.prefix,
      ledger: o.ledger || null,
    });
  }

  /**
   * **字句器の正直さを、門が己で測る。**
   *
   * 実測した事故が二度起きた(サロゲート対のずれ / 正規表現リテラルの読み違え)。
   * どちらも「影の上から書き込みが消え、門が静かに見落とす」形で現れた。
   * **静かに見落とす門は、緑を出す門より悪い**(第21条)。
   *
   * ゆえに**原本を素朴に走査**し、影が潰した位置を `masked` として全て記録する。
   * 正当な masked は「註釈か文字列リテラルの中」だけであり、その判定は
   * 呼び手(回帰試験)が現物の行で検める —— **字句器が自分の正しさを主張しない。**
   */
  const masked = [];
  const rawRe = new RegExp(callRe.source, 'g');
  while ((m = rawRe.exec(src))) {
    if (sh[m.index] === src[m.index]) continue;      // 影にも在る = 見えている
    const ln = lineOf(m.index);
    const span = spans.find(s => s.from <= m.index && m.index < s.to);
    masked.push({
      file: rel, line: ln, at: m.index,
      // **潰した理由を名乗る**。呼び手はこの主張を原本の生の文字で検める(第27条)。
      by: span ? span.kind : null,
      spanFrom: span ? span.from : null,
      opener: span ? src[span.from] : null,
      text: (src.split('\n')[ln - 1] || '').trim().slice(0, 120),
    });
  }
  return { hits: out, masked };
}

function listFiles() {
  const out = [];
  for (const d of SCAN_DIRS) {
    const dir = path.join(ROOT, d);
    let ents = [];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      if (e.isDirectory()) continue;
      if (!e.name.endsWith('.js')) continue;
      out.push(path.join(dir, e.name));
    }
  }
  return out.sort();
}

/**
 * 裁定。
 *
 *  🔴 **violation** — 倉の根から伸びた道への書き込みで、
 *     (a) 綴りが組めて **git が版管理下だと言った**、または
 *     (b) 綴りが組めない = 何処へ書くか静的に判らない(**判定不能は緑ではない** — 第16条)
 *  ⚠️ **untracked** — 倉の中だが版管理下ではない道 (門の残骸など)。赤にはしない。
 *  ○ **sandbox**   — 複製の中。これだけが除外である。
 *  ⚠️ **unknown**  — 根が辿れない。名指すが赤にはしない(印を持たないので倉とは言えない)。
 */
function audit() {
  const hits = [], masked = [];
  for (const f of listFiles()) {
    const r = scanFile(f);
    hits.push(...r.hits);
    masked.push(...r.masked);
  }
  const tracked = trackedSet();
  const answered = gitAnswered();

  const violations = [], untracked = [], sandbox = [], unknown = [], knownOpen = [];
  /** 台帳の行が一度でも鳴ったか。鳴らなくなった行は下で赤にする。 */
  const openSeen = new Map(KNOWN_OPEN.map(k => [k.file + '|' + k.arg, 0]));
  const isKnownOpen = (h) => {
    const k = KNOWN_OPEN.find(x => x.file === h.file && x.arg === h.arg);
    if (!k) return null;
    openSeen.set(k.file + '|' + k.arg, openSeen.get(k.file + '|' + k.arg) + 1);
    return k;
  };

  for (const h of hits) {
    if (h.origin === 'sandbox') { sandbox.push(h); continue; }
    if (h.origin === 'unknown') { unknown.push(h); continue; }
    // origin === 'repo'
    let why = null;
    if (h.rel === null) {
      /**
       * 綴りが完全には組めない。だが**前置**が取れて、版管理下の何一つ
       * その前置で始まらないなら、この書き込みは版管理下を汚しえない。
       * (例: `path.join(DIR, `.paradise-f1-probe-${pid}.js`)` の前置は
       *  `tests/.paradise-f1-probe-` —— 版管理下に該当は無い)
       */
      if (h.prefix && answered) {
        const pre = h.prefix;
        const could = [...tracked].some(t => t === pre || t.startsWith(pre));
        if (!could) { untracked.push({ ...h, why: `前置 ${pre}… で始まる版管理下の現物は無い` }); continue; }
      }
      // 何処へ書くか静的に判らない。倉の根から伸びている以上、版管理下を指しうる。
      why = h.ledger
        ? `engine の住所定数 (${h.ledger}) — 版管理下の現物である。env で仮倉へ振り替えよ`
        : '倉の根から伸びる道だが、綴りが静的に組めない — 何処へ書くか判らない (第16条: 判定不能は緑ではない)';
    } else if (!answered) {
      why = 'git が版管理の一覧を答えない — 版管理下でないと言い切れない (第37条)';
    } else if (tracked.has(h.rel)) {
      why = `${h.rel} は版管理下の現物である — 走行中に書き換えれば、同時に走る別の門が汚染を読む (第58条(c))`;
    } else {
      untracked.push({ ...h, why: `${h.rel} は倉の中だが版管理下ではない` });
      continue;
    }
    const known = isKnownOpen(h);
    if (known) knownOpen.push({ ...h, why, owner: known.owner, note: known.why });
    else violations.push({ ...h, why });
  }

  /**
   * **直ったのに台帳に残っている行は赤である。**
   * 残せば、次に同じ場所へ同じ病を埋め戻したとき、台帳が黙って庇う。
   * 台帳は縮むことしかできない —— 使われなくなったら、その場で外させる。
   */
  const staleOpen = KNOWN_OPEN
    .filter(k => openSeen.get(k.file + '|' + k.arg) === 0)
    .map(k => ({ file: k.file, line: 0, obj: 'KNOWN_OPEN', fn: '(台帳)', arg: k.arg,
      why: `既知の未修 ${k.file} の ${k.arg} が鳴らなくなった — 直ったなら台帳から外せ。` +
           '残った台帳は、次に同じ病を埋め戻したとき黙って庇う (第54条(d))' }));
  violations.push(...staleOpen);

  return {
    ok: violations.length === 0,
    scanned: listFiles().map(f => path.relative(ROOT, f).split(path.sep).join('/')),
    exempt: [...EXEMPT],
    knownOpenLedger: KNOWN_OPEN.map(k => `${k.file}:${k.arg} (owner ${k.owner})`),
    gitAnswered: answered,
    total: hits.length,
    violations, untracked, sandbox, unknown, masked, knownOpen,
  };
}

// ── CLI ─────────────────────────────────────────────────────────────
function main() {
  const cmd = process.argv[2] || 'check';
  const json = process.argv.includes('--json');
  if (cmd === '--help' || cmd === '-h') {
    console.log('commands: check [--json] | list [--json]');
    console.log('  check  版管理下の現物を走行中に汚す行を名指す (exit 1 = 赤)');
    console.log('  list   全ての書き込み呼び出しを出自つきで並べる');
    process.exit(0);
  }
  const r = audit();
  if (json) { console.log(JSON.stringify(r, null, 2)); process.exit(cmd === 'list' ? 0 : (r.ok ? 0 : 1)); }

  if (cmd === 'list') {
    console.log('═══ 🔒 HERMETIC — 門の書き込み一覧 ═══');
    for (const bucket of ['violations', 'untracked', 'unknown', 'sandbox']) {
      console.log(`── ${bucket} (${r[bucket].length}) ──`);
      for (const h of r[bucket]) console.log(`  ${h.file}:${h.line}  ${h.obj}.${h.fn}(${h.arg})`);
    }
    console.log('════════════════════════════════════');
    process.exit(0);
  }

  if (cmd !== 'check') { console.error('commands: check [--json] | list [--json]'); process.exit(2); }

  console.log('═══ 🔒 HERMETIC CHECK — 門は己の測る対象を汚さない (第58条(c)) ═══');
  console.log(`  走査 ${r.scanned.length} ファイル / 書き込み ${r.total} 箇所 ` +
    `(複製 ${r.sandbox.length} / 倉の未追跡 ${r.untracked.length} / 出自不明 ${r.unknown.length})`);
  if (!r.gitAnswered) console.log('  ⚠️  git が版管理の一覧を答えなかった — 倉起点の書き込みは全て赤として扱う (第37条)');
  if (r.exempt.length) console.log(`  ⚠️  除外 ${r.exempt.length} 件: ${r.exempt.join(', ')} — 除外は条の改正である (第54条(d))`);
  for (const v of r.violations) {
    console.log(`  🔴 ${v.file}:${v.line}  ${v.obj}.${v.fn}(${v.arg})`);
    console.log(`       ${v.why}`);
  }
  // **既知の未修は必ず口で名乗る**(第54条(c))。黙って通せば免除と変わらない。
  for (const k of r.knownOpen) {
    console.log(`  🟠 既知の未修 ${k.file}:${k.line}  ${k.obj}.${k.fn}(${k.arg})  → 直しの持ち主: ${k.owner}`);
    console.log(`       ${k.note}`);
  }
  for (const u of r.unknown) console.log(`  ⚠️  ${u.file}:${u.line}  ${u.obj}.${u.fn}(${u.arg}) — 出自を辿れない`);
  if (r.ok) {
    console.log('  ✓ 版管理下の現物を走行中に書き換える門は無い — 同時に走っても答えは一つである');
    if (r.knownOpen.length) console.log(`     (既知の未修 ${r.knownOpen.length} 箇所は台帳に載っている — 台帳は縮むことしかできない)`);
  } else {
    console.log(`  🔴 ${r.violations.length} 箇所が版管理下を汚す。**復元は除外ではない — 復元しても窓は開く。**`);
    console.log('     故障注入は複製 (mkdtempSync / cpSync 配下) に対して行え (第58条(c))');
  }
  console.log('══════════════════════════════════════════════════════════════');
  process.exit(r.ok ? 0 : 1);
}
if (require.main === module) main();

module.exports = {
  MUTATORS, SCAN_DIRS, EXEMPT, KNOWN_OPEN, ROOT,
  matchParen, splitArgs, shadow, peel, literalPath, literalPrefix, bindingsOf, bindingFor,
  functionsOf, returnsOf, originOf, anchorsOf, normalizeRel,
  scanFile, listFiles, audit, trackedSet,
};
