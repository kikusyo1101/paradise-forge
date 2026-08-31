#!/usr/bin/env node
'use strict';
/**
 * PARADISE :: apply-guards — 掟を機構に落とす (憲法 第3条/第6条/第19条)
 * ---------------------------------------------------------------------
 * 楽園は掟を **文書** に持っていた。CLAUDE.md には「force push 禁止」「main へ
 * 直接コミットしない」「.env を読まない」と書いてあり、しかも
 *   「> 安全ルール（force push 禁止・main への直接コミット禁止）は
 *     `.claude/settings.json` の Hooks で自動強制されている。」
 * とまで書いてあった。**それは嘘だった。** 実測すると:
 *
 *   1. `~/.claude/settings.json` に `permissions` キーが **存在しない**。
 *      機械強制しうる掟のうち **0件** しか強制されていなかった。
 *   2. さらに悪い。15ある hook group のうち **8本が死んでいる**。matcher に
 *      `tool == "Bash" && tool_input.command matches "..."` という
 *      **公式に存在しない式言語** が書かれていた。公式仕様の matcher は
 *        (a) ツール名の完全一致文字列、または
 *        (b) tool_name に test される JS 正規表現
 *      の二択しかない。`tool == "Bash" && ...` は文字列 "Bash" ではないので
 *      完全一致せず、正規表現として見ても既知のツール名に一致しない。
 *      よって **永遠に発火しない**。
 *   3. 逆に `tool == "Edit" || tool == "Write"` は正規表現の `|` が交替として
 *      働き、`||` が生む **空の選択肢が全ツールに一致して暴発する**。
 *      止めたかったのは2つなのに、12全部を止めていた。
 *
 * 宣言は機構ではない。この engine が、掟を settings.json の機構に落とす。
 *
 * 職責は三つ:
 *   (a) permissions ブロックを書く          … 掟そのものの機械化
 *   (b) 死んだ matcher を検出して修復する    … 既にある門が本当に鳴るようにする
 *   (c) env の健全性を検める                … 門が鳴っても **走れなければ** 同じこと
 *
 *   node graph/apply-guards.js plan      # 何が変わるか (既定・書かない)
 *   node graph/apply-guards.js apply     # settings.json に書く
 *   node graph/apply-guards.js verify    # 宣言と一致するか (乖離で exit 1)
 *   node graph/apply-guards.js diagnose  # 全 matcher を公式仕様で裁く + フックの実行可能性
 *
 * ── 第三の職責はなぜ要るか (実測) ────────────────────────────────────
 * `~/.claude/settings.json` にこの一行があった:
 *     "env": { "PATH": "$PATH:/c/Program Files/GitHub CLI" }
 * **`$PATH` は展開されない。** リテラル文字列として PATH に入る。実測:
 *     $ PATH='$PATH:/c/Program Files/GitHub CLI' bash -c 'command -v node'
 *       node: command not found
 * settings.json のフックは **15/15 すべてが `node` を呼ぶ**。つまりフック層が
 * 丸ごと死んでいた。とりわけ SessionStart の記憶注入(役割・日本語指示・知識
 * グラフ)が新セッションに一切届いておらず、しかも **exit=0 で黙って失敗**する。
 * matcher が生きていることは、フックが走ることを意味しない。
 *
 * そしてこの env.PATH は **何も足していなかった**。素の PATH に GitHub CLI は
 * 既に4回入っている。あの一行は PATH を破壊してフックを殺すだけの存在だった。
 * ゆえに修復は「足す」ではなく **その一行を消す** である。
 *
 * ── 公式仕様(調査済み。この engine の前提) ──────────────────────────
 *   評価順 deny -> ask -> allow。最初の一致が勝ち、具体性は順位を変えない。
 *   deny に例外は作れず、bypassPermissions モードでも効く。
 *   `Bash(git push:*)` は `Bash(git push *)` と等価(`:*` は末尾ワイルドカード)。
 *   `&&` `||` `;` `|` で分解され各サブコマンドが独立照合される。
 *   ファイル保護は `Edit(path)` と `Read(path)`。`Write(...)`/`MultiEdit(...)` は
 *   受理されるが **参照されず起動時警告が出る** ので使わない。
 *   ハンドラ単位の絞り込みは `if` フィールド (permission rule 構文)。
 *   **`if` は1ルールのみ。`&&`/`||` は書けない。**
 *   Windows では Bash ツールが登録されない場合があるため matcher は
 *   `Bash|PowerShell` にする。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const SETTINGS = process.env.PARADISE_SETTINGS ||
  path.join(process.env.CLAUDE_HOME || path.join(os.homedir(), '.claude'), 'settings.json');

/**
 * 既知のツール名群。matcher は tool_name に照合されるので、
 * 「何にも当たらない」を機械的に言うにはこの一覧が要る。
 */
const KNOWN_TOOLS = [
  'Bash', 'PowerShell', 'Edit', 'Write', 'Read', 'Glob', 'Grep',
  'Task', 'WebFetch', 'WebSearch', 'NotebookEdit', 'TodoWrite',
];

/**
 * 掟。ここが唯一の出典であり、settings.json はその写しにすぎない。
 *
 * deny は例外を作れない。ゆえに deny に置くのは「いかなる文脈でも神の御手を
 * 経ずに起きてはならないもの」だけに限る。迷うものは ask に置く。
 */
const POLICY = {
  deny: [
    // 歴史を壊す手 — 取り返しがつかないものだけを deny に置く
    'Bash(git push --force:*)',
    'Bash(git push -f:*)',
    'Bash(git push --force-with-lease:*)',
    'Bash(git reset --hard:*)',
    'Bash(git commit --no-verify:*)',
    // 第19条: 配備物は成果物である。手で触らず deploy.js で建て直す。
    // deploy.js は Node の fs で書くので Edit ツールを通らない → 配備は妨げない。
    'Edit(~/.claude/**)',
    // 第6条: 秘密は読むことすら許さない。読めた瞬間に文脈へ漏れる。
    'Edit(**/.env)',
    'Read(**/.env)',
    'Read(**/.env.*)',
  ],
  ask: [
    // マージは神の御手 (CLAUDE.md 絶対に守ること 1)。教主は自ら承認しない。
    'Bash(gh pr merge:*)',
  ],
  allow: [
    // 楽園の門。これらは何度でも走らせてよい — 走らせない方が危険である。
    'Bash(node graph/*)',
    'Bash(node tests/*)',
    // 読み取り系の git。壊さない手にいちいち許可を求めさせない。
    'Bash(git status:*)',
    'Bash(git diff:*)',
    'Bash(git log:*)',
  ],
  defaultMode: 'default',
};

const POLICY_KEYS = ['deny', 'ask', 'allow', 'defaultMode'];

// ─────────────────────────────────────────────────────────────────────
// matcher の診断 — 公式仕様どおりに評価する
// ─────────────────────────────────────────────────────────────────────

/** matcher 文字列が exact 判定に載せられる形か (英数/_/-/空白/,/| のみ)。 */
function isPlainList(m) { return /^[A-Za-z0-9_\-\s,|]+$/.test(m); }

/**
 * 一つの matcher を公式仕様で裁く。
 *   wildcard : `*` または空 — 全ツールに当たる (これは意図どおり)
 *   exact    : 区切りで割って完全一致
 *   regex    : JS 正規表現として tool_name に test
 * 一致ゼロなら dead。regex が全ツールに当たったなら、書き手は限定したかった
 * はずなので overfire (暴発) と名指す。
 */
function classify(matcher) {
  const m = matcher == null ? '' : String(matcher);
  if (m === '' || m === '*') {
    return { kind: 'wildcard', matches: KNOWN_TOOLS.slice(), status: 'live' };
  }
  if (isPlainList(m)) {
    const parts = m.split(/[|,]/).map(s => s.trim()).filter(Boolean);
    const matches = KNOWN_TOOLS.filter(t => parts.includes(t));
    return { kind: 'exact', matches, status: matches.length ? 'live' : 'dead' };
  }
  let re;
  try { re = new RegExp(m); }
  catch { return { kind: 'regex', matches: [], status: 'dead', note: 'invalid regular expression' }; }
  const matches = KNOWN_TOOLS.filter(t => re.test(t));
  if (!matches.length) return { kind: 'regex', matches, status: 'dead' };
  // 限定するつもりで書かれた式が全ツールに当たった = 暴発。
  // `tool == "Edit" || tool == "Write"` の `||` は空の選択肢を生み、
  // 空の選択肢はあらゆる文字列に一致する。2つ止めるつもりで12全部を止める。
  if (matches.length === KNOWN_TOOLS.length) {
    return { kind: 'regex', matches, status: 'overfire', note: 'narrow-looking expression matches every tool' };
  }
  return { kind: 'regex', matches, status: 'live' };
}

/** settings 全体の hook matcher を裁いて一覧にする。 */
function diagnoseSettings(settings) {
  const out = [];
  const hooks = (settings && settings.hooks) || {};
  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) continue;
    groups.forEach((g, i) => {
      const c = classify(g && g.matcher);
      out.push({
        event, index: i, matcher: g && g.matcher != null ? String(g.matcher) : '',
        kind: c.kind, matches: c.matches, status: c.status,
        ...(c.note ? { note: c.note } : {}),
        ...(g && g.description ? { description: g.description } : {}),
      });
    });
  }
  return out;
}

/** ファイルから読んで裁く。無ければ空配列 (存在しないものを責めない)。 */
function diagnose(file = SETTINGS) {
  const s = readSettings(file);
  if (s === null) return [];
  return diagnoseSettings(s);
}

// ─────────────────────────────────────────────────────────────────────
// matcher の修復
// ─────────────────────────────────────────────────────────────────────

/** `tool == "X"` からツール名を全て拾う (出現順・重複除去)。 */
function extractTools(matcher) {
  const out = [];
  const re = /tool\s*==\s*["']([A-Za-z][A-Za-z0-9_]*)["']/g;
  let m;
  while ((m = re.exec(matcher))) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

/** `tool_input.xxx matches "..."` の条件部を拾う。捨てないための収穫。 */
function extractConditions(matcher) {
  const out = [];
  const re = /tool_input\.([A-Za-z_][A-Za-z0-9_]*)\s+matches\s+"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(matcher))) out.push({ field: m[1], pattern: m[2] });
  return out;
}

/**
 * ツール名の並びを、公式仕様で本当に当たる matcher にする。
 * Bash は Windows で登録されないことがあるので PowerShell を必ず伴わせる。
 */
function toolsToMatcher(tools) {
  const expanded = [];
  for (const t of tools) {
    if (t === 'Bash') { for (const x of ['Bash', 'PowerShell']) if (!expanded.includes(x)) expanded.push(x); }
    else if (!expanded.includes(t)) expanded.push(t);
  }
  return expanded.join('|');
}

/**
 * 条件部を `if` (permission rule 構文) に移せるか試みる。
 * `if` は **1ルールのみ**で `&&`/`||` を書けない。ゆえに移せるのは
 * 「単一ツール・単一の literal な command 前置」だけである。
 * 移せないものは黙って捨てず、ハンドラのスクリプト側で判定する前提にして
 * 理由を note に残す — 捨てたことを誰も知らない状態を作らない。
 */
function conditionToIf(tools, conditions, matcher) {
  if (conditions.length !== 1) return null;
  if (/[!]/.test(matcher)) return null;              // 否定は permission rule で表現できない
  if (tools.length !== 1 || tools[0] !== 'Bash') return null;
  const { field, pattern } = conditions[0];
  if (field !== 'command') return null;              // file_path は Bash rule に載らない
  if (!/^[A-Za-z0-9 _.\/-]+$/.test(pattern)) return null;  // 交替や量化子があれば移せない
  return `Bash(${pattern.trim()}:*)`;
}

/**
 * 一つの hook group を修復する。純関数 — 与えられた group は変更しない。
 * 返り値 { group, changed, note }。
 */
function repairGroup(group) {
  if (!group || typeof group !== 'object') return { group, changed: false, note: 'not a group' };
  const matcher = group.matcher == null ? '' : String(group.matcher);
  const c = classify(matcher);
  if (c.status === 'live') return { group, changed: false, note: 'already live' };

  const tools = extractTools(matcher);
  if (!tools.length) {
    // `tool == "X"` 形式ですらない。推測で書き換えれば、意図の分からない
    // matcher を勝手に作ることになる。触らずに名指しだけする。
    return { group, changed: false, note: `${c.status}: no \`tool == "X"\` clause — cannot infer intent, left alone` };
  }
  const next = toolsToMatcher(tools);
  if (next === matcher) return { group, changed: false, note: 'already canonical' };

  const conds = extractConditions(matcher);
  const rule = conditionToIf(tools, conds, matcher);
  const out = { ...group, matcher: next };
  if (rule) {
    out.hooks = (Array.isArray(group.hooks) ? group.hooks : []).map(h =>
      (h && typeof h === 'object') ? { ...h, if: rule } : h);
  }
  const note = c.status === 'overfire'
    ? `overfire → "${next}" (the empty \`||\` alternative matched every tool)`
    : `dead → "${next}"` + (rule ? ` + if:${rule}`
        : conds.length ? ` (${conds.length} condition(s) stay in the handler script: ${conds.map(x => x.field).join(', ')})` : '');
  return { group, next: out, changed: true, note, from: matcher, to: next, rule: rule || null };
}

// ─────────────────────────────────────────────────────────────────────
// env の健全性 (第三の職責)
// ─────────────────────────────────────────────────────────────────────

/** POSIX の未展開参照 `$VAR` / `${VAR}`。`$$` や `\$` のような逃げは見ない。 */
const RE_POSIX_VAR = /\$(\{[A-Za-z_][A-Za-z0-9_]*\}|[A-Za-z_][A-Za-z0-9_]*)/g;
/** Windows の未展開参照 `%VAR%`。 */
const RE_WINDOWS_VAR = /%([A-Za-z_][A-Za-z0-9_()]*)%/g;

function matchAll(re, s) {
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(s))) out.push(m);
  return out;
}

/** 値が **自分自身の PATH を参照している** か (`$PATH` `${PATH}` `%PATH%`)。 */
function referencesPath(value) {
  return /\$\{?PATH\}?|%PATH%/.test(value);
}

/**
 * その値が「PATH を継ぎ足すつもりで書かれ、実際には PATH を破壊する」形か。
 * 修復(削除)の対象を決めるのはこの述語だけである。
 */
function isPathPrefixedValue(value) {
  return /^\s*(\$PATH|\$\{PATH\}|%PATH%)/.test(value);
}

/**
 * `settings.env` の各値を検査し、**展開されない**シェル変数参照を名指す。
 *
 * settings.json の env はシェルを通らずそのまま子プロセスの環境になる。
 * ゆえに `$PATH` は「今の PATH」ではなく **4文字の文字列** である。
 *
 * `PATH` に `$PATH` が入っている場合だけを `severity:'fatal'` とする —
 * 既存の PATH を丸ごと失い、`node` を呼ぶ全フックが道連れになるからである。
 * 他のキーの未展開参照は害が局所的なので `warn` に留め、**報告のみ**する。
 *
 * @returns {{key:string,value:string,kind:string,detail:string,severity:string}[]}
 */
function envDrift(settings) {
  const env = settings && settings.env;
  const out = [];
  if (!env || typeof env !== 'object' || Array.isArray(env)) return out;
  for (const [key, raw] of Object.entries(env)) {
    if (typeof raw !== 'string') continue;
    const value = raw;
    const posix = matchAll(RE_POSIX_VAR, value).map(m => m[0]);
    const win = matchAll(RE_WINDOWS_VAR, value).map(m => m[0]);
    if (!posix.length && !win.length) continue;
    const kind = posix.length ? 'unexpanded-posix' : 'unexpanded-windows';
    const fatal = key === 'PATH' && referencesPath(value);
    const refs = [...posix, ...win].join(', ');
    const detail = fatal
      ? `PATH は ${refs} を含むが settings.env はシェルを通らない — ${refs} はリテラル文字列として PATH になり、既存の PATH が丸ごと失われる (node を呼ぶ全フックが死ぬ)`
      : `${refs} は展開されずリテラル文字列としてそのまま環境に入る`;
    out.push({
      key, value, kind, detail,
      severity: fatal ? 'fatal' : 'warn',
      ...(posix.length ? { posix } : {}),
      ...(win.length ? { windows: win } : {}),
      ...(fatal ? {} : { repair: 'report-only — PATH 以外のキーは楽園が勝手に消さない' }),
    });
  }
  return out;
}

/**
 * env を修復する。**純関数** — 与えられた env は変更しない。
 * 消すのは「展開されない PATH 参照で始まる `PATH`」ただ一つ。
 * 実測で、その行は何も足しておらず PATH を破壊するだけだった。
 * `env` が空になったら `env` キーごと消す(空の器を残さない)。
 * @returns {{env:object|undefined, changes:object[]}}
 */
function repairEnv(env) {
  const changes = [];
  if (!env || typeof env !== 'object' || Array.isArray(env)) return { env, changes };
  const next = { ...env };
  if (typeof next.PATH === 'string' && isPathPrefixedValue(next.PATH)) {
    const from = next.PATH;
    delete next.PATH;                         // ⚠️ PATH 以外のキーには決して触れない
    const emptied = !Object.keys(next).length;
    changes.push({
      kind: 'env', key: 'PATH', from, severity: 'fatal', emptied,
      note: `env.PATH = "${from}" は展開されない — 削除する`
          + (emptied ? ' (env はこれ一つだったのでキーごと消える)' : '')
          + ' (実測: この行は何も足さず PATH を破壊してフック 15/15 を殺していた)',
    });
  }
  // 一つの欠陥は一つの乖離として数える — 空になったことを別行で叫べば、
  // drift の件数が実際の欠陥数より膨らんで検査の意味が薄れる。
  if (!Object.keys(next).length) return { env: undefined, changes };
  return { env: next, changes };
}

// ─────────────────────────────────────────────────────────────────────
// hookHealth — 門が鳴ったとき、本当に走れるのか
// ─────────────────────────────────────────────────────────────────────

/**
 * ⚠️ この検査は **この Node プロセスの PATH** で行う。フックが実際に走る環境
 * (Claude Code が bash に渡す環境) とは異なりうる。緑であることは「今ここで
 * 解決できた」以上を意味しない。嘘の安心を与えないため必ず併記すること。
 */
const HOOK_HEALTH_CAVEAT =
  'この判定は現プロセスの PATH による。フックが実際に走る環境とは異なりうる';

/** Windows で試すべき実行可能拡張子。PATHEXT があればそれに従う。 */
function execExtensions() {
  if (process.platform !== 'win32') return [''];
  const pathext = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD')
    .split(';').map(s => s.trim()).filter(Boolean).map(s => s.toLowerCase());
  const want = ['.exe', '.cmd', '.bat'];
  for (const w of want) if (!pathext.includes(w)) pathext.push(w);
  return ['', ...pathext];
}

/**
 * PATH 文字列をディレクトリに割る。
 * settings.json の PATH は git-bash 由来の `:` 区切りのことも、Windows 由来の
 * `;` 区切りのこともある。`C:/x` のドライブレターのコロンで割らないよう繋ぎ直す。
 */
function splitPathList(value) {
  if (typeof value !== 'string' || !value) return [];
  const raw = value.split(/[;:]/);
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    if (/^[A-Za-z]$/.test(raw[i]) && i + 1 < raw.length && /^[\\/]/.test(raw[i + 1])) {
      out.push(raw[i] + ':' + raw[i + 1]);    // `C:` + `/x` を戻す
      i++;
    } else if (raw[i] !== '') {
      out.push(raw[i]);
    }
  }
  return out;
}

/** hook の command 文字列から先頭の実行ファイル名を取り出す(引用符とパスを剥がす)。 */
function commandExe(command) {
  const s = String(command == null ? '' : command).trim();
  if (!s) return '';
  let token;
  const q = s.match(/^"((?:[^"\\]|\\.)*)"|^'([^']*)'/);
  if (q) token = q[1] !== undefined ? q[1] : q[2];
  else token = s.split(/\s+/)[0];
  token = token.replace(/^["']|["']$/g, '');
  const base = token.split(/[\\/]/).pop();     // ディレクトリを剥がす
  return base || token;
}

/** 与えられた PATH 文字列で exe が解決できるか。 */
function resolvesIn(exe, pathValue) {
  if (!exe) return false;
  const dirs = splitPathList(pathValue);
  if (!dirs.length) return false;
  const exts = /\.[A-Za-z0-9]+$/.test(exe) ? [''] : execExtensions();
  for (const d of dirs) {
    for (const ext of exts) {
      try {
        const p = path.join(d, exe + ext);
        if (fs.existsSync(p) && fs.statSync(p).isFile()) return true;
      } catch { /* 壊れたパス片は「解決できない」でしかない */ }
    }
  }
  return false;
}

/**
 * settings.json の全 hook の command を走査し、その実行ファイルが本当に
 * 解決できるかを検める。matcher の診断は「門が鳴るか」しか見ておらず、
 * 鳴った門の先で `node: command not found` が起きても何も言わなかった。
 *
 * 判定は二つ:
 *   resolvable            … 現プロセスの PATH (HOOK_HEALTH_CAVEAT を参照)
 *   resolvableUnderEnv    … settings.env.PATH が設定されている場合、その PATH。
 *                           **今回の欠陥を捕らえるのはこちらである。**
 *                           env.PATH が無ければ null (判定不能であって緑ではない)。
 *
 * @returns {{event:string,index:number,exe:string,resolvable:boolean,command:string}[]}
 */
function hookHealth(settings) {
  const s = settings === undefined ? readSettings() : settings;
  const out = [];
  const hooks = (s && s.hooks) || {};
  const envPath = s && s.env && typeof s.env.PATH === 'string' ? s.env.PATH : null;
  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) continue;
    groups.forEach((g, gi) => {
      const handlers = (g && Array.isArray(g.hooks)) ? g.hooks : [];
      handlers.forEach((h, hi) => {
        if (!h || typeof h !== 'object' || typeof h.command !== 'string') return;
        const exe = commandExe(h.command);
        out.push({
          event,
          index: gi,
          handler: hi,
          exe,
          command: h.command,
          resolvable: resolvesIn(exe, process.env.PATH || ''),
          basis: HOOK_HEALTH_CAVEAT,
          envPath,
          resolvableUnderEnv: envPath === null ? null : resolvesIn(exe, envPath),
        });
      });
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// 計画 / 適用 / 検査
// ─────────────────────────────────────────────────────────────────────

function readSettings(file = SETTINGS) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/** 掟どおりの permissions か。余分なキーは楽園の管轄外なので見ない。 */
function permissionsMatch(cur) {
  if (!cur || typeof cur !== 'object') return false;
  for (const k of POLICY_KEYS) {
    const a = cur[k], b = POLICY[k];
    if (Array.isArray(b)) {
      if (!Array.isArray(a) || a.length !== b.length) return false;
      for (let i = 0; i < b.length; i++) if (a[i] !== b[i]) return false;
    } else if (a !== b) return false;
  }
  return true;
}

/**
 * 望ましい settings を組む。**純関数**。
 * permissions の既存の余分なキー(additionalDirectories 等)は保存する —
 * 楽園が知らない設定を黙って消す機構は、いずれ誰かの手を焼く。
 */
function buildDesired(settings) {
  const next = JSON.parse(JSON.stringify(settings));
  const changes = [];

  // (a) permissions を書く
  const cur = next.permissions;
  if (!permissionsMatch(cur)) {
    changes.push({
      kind: 'permissions',
      note: (cur && typeof cur === 'object')
        ? 'permissions drifted from POLICY'
        : 'no `permissions` key at all — every machine-enforceable law was unenforced',
      counts: { deny: POLICY.deny.length, ask: POLICY.ask.length, allow: POLICY.allow.length },
    });
  }
  next.permissions = { ...(cur && typeof cur === 'object' ? cur : {}) };
  for (const k of POLICY_KEYS) next.permissions[k] = Array.isArray(POLICY[k]) ? POLICY[k].slice() : POLICY[k];

  // (b) 死んだ matcher を直す
  const hooks = next.hooks;
  if (hooks && typeof hooks === 'object') {
    for (const [event, groups] of Object.entries(hooks)) {
      if (!Array.isArray(groups)) continue;
      groups.forEach((g, i) => {
        const r = repairGroup(g);
        if (!r.changed) return;
        groups[i] = r.next;
        changes.push({ kind: 'matcher', event, index: i, from: r.from, to: r.to, rule: r.rule, note: r.note });
      });
    }
  }
  // (c) env の健全性 — 門が鳴っても走れなければ同じこと
  if (next.env && typeof next.env === 'object' && !Array.isArray(next.env)) {
    const r = repairEnv(next.env);
    if (r.env === undefined) delete next.env; else next.env = r.env;
    for (const c of r.changes) changes.push(c);
  }

  return { next, changes };
}

/**
 * 現状と掟の差。settings.json が無い環境(CI, clone直後)では
 * 「配備されていない」だけであり欠陥ではない — 黙って通す。
 */
function diff(file = SETTINGS) {
  const s = readSettings(file);
  if (s === null) {
    return { skipped: true, ok: true, file, changes: [],
             note: 'no settings.json on this machine — nothing deployed to verify' };
  }
  const { changes } = buildDesired(s);
  const env = envDrift(s);
  return { skipped: false, ok: changes.length === 0, file, changes,
           diagnosis: diagnoseSettings(s), envDrift: env,
           envFatal: env.filter(e => e.severity === 'fatal').length };
}

/** 掟を settings.json に書く。permissions / 死んだ matcher / 壊れた env 以外は触らない。 */
function apply(file = SETTINGS) {
  const s = readSettings(file);
  if (s === null) return { skipped: true, ok: true, file, changed: false,
                           note: 'no settings.json on this machine — nothing to apply' };
  const { next, changes } = buildDesired(s);
  const before = fs.readFileSync(file, 'utf8');
  const after = JSON.stringify(next, null, 2) + '\n';
  if (before === after) return { ok: true, changed: false, file, changes: [] };
  fs.writeFileSync(file, after);
  return { ok: true, changed: true, file, changes };
}

function verify(file = SETTINGS) { return diff(file); }

// --- CLI ---
if (require.main === module) {
  const cmd = process.argv[2] || 'plan';
  const file = process.argv[3] || SETTINGS;

  if (cmd === 'diagnose') {
    const rows = diagnose(file);
    console.log('═══════ 🔎 HOOK MATCHER DIAGNOSIS ═══════');
    console.log(`file: ${file}`);
    if (!rows.length) console.log('  (no settings.json / no hooks here — nothing to judge)');
    for (const r of rows) {
      const icon = r.status === 'live' ? '✓' : r.status === 'overfire' ? '⚠️ ' : '🔴';
      const m = r.matcher.length > 58 ? r.matcher.slice(0, 55) + '...' : r.matcher;
      console.log(`  ${icon} ${r.event.padEnd(13)} ${r.kind.padEnd(8)} ${String(r.matches.length).padStart(2)} tool(s)  ${m}`);
    }
    const dead = rows.filter(r => r.status === 'dead').length;
    const over = rows.filter(r => r.status === 'overfire').length;
    console.log('─────────────────────────────────────────');
    console.log(`  ${rows.length} matcher(s): ${rows.length - dead - over} live, ${dead} dead, ${over} overfiring`);

    // ── env の健全性 ──────────────────────────────────────────────
    const s = readSettings(file);
    console.log('');
    console.log('═══════ 🧪 ENV HEALTH ═══════════════════');
    const ed = s ? envDrift(s) : [];
    if (!s) console.log('  (settings.json 無し — 検査対象が存在しない)');
    else if (!ed.length) console.log('  ✓ env に展開されないシェル変数参照は無い');
    for (const e of ed) {
      console.log(`  ${e.severity === 'fatal' ? '🔴' : '⚠️ '} env.${e.key} [${e.kind}${e.severity === 'fatal' ? '/FATAL' : ''}]`);
      console.log(`      value : ${e.value}`);
      console.log(`      why   : ${e.detail}`);
      if (e.repair) console.log(`      repair: ${e.repair}`);
    }

    // ── フックが実際に走れるか ────────────────────────────────────
    const health = s ? hookHealth(s) : [];
    console.log('');
    console.log('═══════ 🩺 HOOK EXECUTABILITY ═══════════');
    console.log(`  ⚠️  ${HOOK_HEALTH_CAVEAT}。`);
    console.log('     ここが緑でも、フックが走る環境で緑とは限らない。');
    if (!health.length) console.log('  (hook が一つも無い — 検べるものが無い)');
    const envPath = s && s.env && typeof s.env.PATH === 'string' ? s.env.PATH : null;
    const byExe = new Map();
    for (const h of health) {
      const k = h.exe;
      const v = byExe.get(k) || { exe: k, n: 0, resolvable: h.resolvable, underEnv: h.resolvableUnderEnv };
      v.n++;
      byExe.set(k, v);
    }
    for (const v of byExe.values()) {
      const a = v.resolvable ? '✓' : '🔴';
      const b = v.underEnv === null ? '—' : (v.underEnv ? '✓' : '🔴');
      console.log(`  ${a} ${String(v.exe).padEnd(12)} ×${String(v.n).padStart(2)}   現PATH:${a}   settings.env.PATH:${b}`);
    }
    if (envPath !== null) {
      console.log(`  settings.env.PATH = ${envPath}`);
      const dead2 = health.filter(h => h.resolvableUnderEnv === false);
      if (dead2.length) {
        console.log(`  🔴 settings.env.PATH の下では ${dead2.length}/${health.length} 本の hook が実行ファイルを解決できない`);
        console.log('     → フックは exit=0 のまま黙って失敗する (`command not found`)');
        console.log('     → node graph/apply-guards.js apply');
      } else {
        console.log(`  ✓ settings.env.PATH の下でも ${health.length} 本すべてが解決できる`);
      }
    } else {
      console.log('  · settings.env.PATH は設定されていない — 第二の判定は行えない(緑ではなく判定不能)');
    }
    console.log('═════════════════════════════════════════');
    process.exit(0);
  }

  if (cmd === 'apply') {
    const r = apply(file);
    if (!r.ok) { console.error('ERROR: ' + r.error); process.exit(1); }
    if (r.skipped) { console.log('  (この機に settings.json 無し — 書く先が無い)'); process.exit(0); }
    console.log(r.changed ? `  ✎ 掟を機構にした (${r.changes.length} change(s))   ${r.file}`
                          : `  ✓ 掟は既に機構である`);
    for (const c of r.changes) console.log(`     · ${c.kind}: ${c.note}`);
    process.exit(0);
  }

  const d = diff(file);
  console.log('═══════ 🛡  GUARDS (law → machinery) ═══════');
  if (d.skipped) {
    console.log('  (この機に settings.json 無し — 検査対象が存在しない)');
    console.log(`  掟: deny ${POLICY.deny.length} / ask ${POLICY.ask.length} / allow ${POLICY.allow.length}`);
  } else if (d.ok) {
    console.log(`  ✓ 掟は機構である: deny ${POLICY.deny.length} / ask ${POLICY.ask.length} / allow ${POLICY.allow.length}`);
    const rows = d.diagnosis || [];
    console.log(`  ✓ hook matcher ${rows.length} 件すべて生きている`);
  } else {
    console.log(`  🔴 掟と機構が乖離 (${d.changes.length})`);
    for (const c of d.changes) {
      if (c.kind === 'permissions') console.log(`     🔴 permissions — ${c.note}  ⇒ deny ${c.counts.deny} / ask ${c.counts.ask} / allow ${c.counts.allow}`);
      else if (c.kind === 'env') console.log(`     🔴 env.${c.key} — ${c.note}`);
      else console.log(`     🔴 ${c.event}[${c.index}] ${c.note}\n          from: ${c.from}`);
    }
    console.log(`     → node graph/apply-guards.js apply`);
  }
  // env は「修復対象でなくとも報告する」— PATH 以外のキーは消さないが黙らない。
  if (!d.skipped) {
    const ed = d.envDrift || [];
    if (!ed.length) console.log('  ✓ env に展開されないシェル変数参照は無い');
    for (const e of ed) {
      console.log(`  ${e.severity === 'fatal' ? '🔴' : '⚠️ '} env.${e.key} [${e.kind}] ${e.value}`);
      console.log(`      ${e.detail}`);
    }
    const health = hookHealth(readSettings(file));
    const bad = health.filter(h => h.resolvableUnderEnv === false);
    const badNow = health.filter(h => !h.resolvable);
    console.log(`  🩺 hook ${health.length} 本 — ${HOOK_HEALTH_CAVEAT}`);
    if (badNow.length) console.log(`     🔴 現 PATH で解決できない: ${[...new Set(badNow.map(h => h.exe))].join(', ')}`);
    if (bad.length) console.log(`     🔴 settings.env.PATH の下で解決できない: ${bad.length}/${health.length} 本 (${[...new Set(bad.map(h => h.exe))].join(', ')})`);
  }
  console.log('════════════════════════════════════════════');
  // verify は env の fatal な乖離を単独で赤にする — 修復対象でない fatal
  // (例: PATH の途中に $PATH がある形) を緑と呼べば、検査が嘘をつく。
  process.exit(cmd === 'verify' && (!d.ok || d.envFatal > 0) ? 1 : 0);
}

module.exports = {
  POLICY, KNOWN_TOOLS, SETTINGS, HOOK_HEALTH_CAVEAT,
  classify, diagnose, diagnoseSettings,
  extractTools, extractConditions, toolsToMatcher, conditionToIf, repairGroup,
  envDrift, repairEnv, hookHealth, commandExe, splitPathList, resolvesIn,
  readSettings, permissionsMatch, buildDesired, diff, apply, verify,
};
