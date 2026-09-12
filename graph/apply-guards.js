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
const path = require('path');
const abode = require('./abode.js');   // 第58条: 楽園自身の住所を知るのは abode.js だけ

// `PARADISE_SETTINGS` は abode より強い(既存の門と CI がこれで実機を差し替える)。
// 生の値をそのまま採るのは、相対の道を渡されたときの従来の解釈を保つためである。
const SETTINGS = process.env.PARADISE_SETTINGS || abode.pathFor('settings');

/**
 * 既知のツール名群。matcher は tool_name に照合されるので、
 * 「何にも当たらない」を機械的に言うにはこの一覧が要る。
 */
const KNOWN_TOOLS = [
  'Bash', 'PowerShell', 'Edit', 'Write', 'Read', 'Glob', 'Grep',
  'Task', 'WebFetch', 'WebSearch', 'NotebookEdit', 'TodoWrite',
];
// ─────────────────────────────────────────────────────────────────────
// 無条件 BLOCK の抑止 (第四の職責 / 憲法 第57条)
// ─────────────────────────────────────────────────────────────────────

/** ハンドラが「止める」側か — 非ゼロ終了を書いているか。 */
function handlerBlocks(command) {
  const c = command == null ? '' : String(command);
  // `\bexit\s+[1-9]` では足りなかった: 通知だけの門が
  // `console.error('hint: run exit 1 to stop')` と書いていると BLOCK と誤認する。
  // 誤認した門は黙って外される —— **無実の門を消す修理**は、直した門より重い。
  // ゆえにシェルの `exit` は **文の境**(行頭 / `;` / `&&` / `||`)で始まるものだけを見る。
  return /process\.exit\(\s*[1-9]/.test(c) || /(^|[;&|\n{])\s*exit\s+[1-9]/.test(c);
}

/**
 * ハンドラが自分で条件を持っているか。
 *
 * PreToolUse のハンドラは stdin から tool_input を読んで初めて「どの呼び出しか」
 * を知りうる。その両方を欠く命令は、matcher に当たった **全て** を止める。
 * ゆえにこの述語は「条件はスクリプト側に残る」という前提を **検める** ためにある。
 * 前提を宣言して検めない engine は、宣言した通りに壊れる。
 */
function handlerCarriesCondition(command) {
  const c = command == null ? '' : String(command);
  return /process\.stdin/.test(c) && /tool_input/.test(c);
}

/**
 * その hook group は「当たった全てを無条件に止める」か。
 * 生きた matcher × 止めるハンドラ × `if` 無し × スクリプト側の条件も無し。
 */
/**
 * 非ゼロ終了が **ツール呼び出しそのものを止める** event。
 *
 * `tool_input` はツール事象にしか存在しない。ゆえに SessionStart / Stop /
 * SessionEnd のハンドラは `handlerCarriesCondition` を **原理的に満たせない**。
 * 除去をこの一覧に閉じなければ、非ツール系の門は「条件を持てない」という
 * ただそれだけの理由で全て無条件 BLOCK と裁かれ、黙って消える。
 * 実測: SessionStart / Stop の門が除去対象になっていた。
 */
const TOOL_GATE_EVENTS = ['PreToolUse'];

function isUnconditionalBlock(group) {
  if (!group || typeof group !== 'object') return false;
  if (classify(group.matcher).status !== 'live') return false;  // 死んだ門は何も止めない
  const hs = Array.isArray(group.hooks) ? group.hooks : [];
  if (!hs.length) return false;
  return hs.some(h => h && typeof h === 'object' && !h.if
    && handlerBlocks(h.command) && !handlerCarriesCondition(h.command));
}

/**
 * グローバルに置いてはならない強制。
 *
 * 実測: `~/.claude/settings.json` の Write フックは README/CLAUDE/AGENTS/
 * CONTRIBUTING 以外の `.md` `.txt` 生成を **全プロジェクトで** 止めていた。
 * これは「仕事の規約」であって「人の既定」ではない。グローバルの強制は
 * プロジェクト側から外せないので、`docs/adr/*.md` を持つ他所のリポジトリを
 * 開いた瞬間、そのリポジトリは何も悪くないのにこの機でだけ動かなくなる。
 * 規約はリポジトリと共に配られるべきであり、機に貼り付けてはならない。
 *
 * `match` はハンドラ命令に含まれる印。名指しで消すためだけに使う。
 */
const FORBIDDEN_HOOKS = [
  {
    event: 'PreToolUse',
    match: 'Unnecessary documentation file creation',
    reason: '仕事の規約をグローバルで強制していた。他所の OSS を開くとそのリポジトリが壊れる。規約はプロジェクトへ。',
  },
];

/** その group が禁じられた強制か。該当すれば理由を返す。 */
function forbiddenReason(event, group) {
  const hs = (group && Array.isArray(group.hooks)) ? group.hooks : [];
  for (const f of FORBIDDEN_HOOKS) {
    if (f.event !== event) continue;
    if (hs.some(h => h && typeof h === 'object' && String(h.command || '').includes(f.match))) return f.reason;
  }
  return null;
}


/**
 * 掟。ここが唯一の出典であり、settings.json はその写しにすぎない。
 *
 * deny は例外を作れない。ゆえに deny に置くのは「いかなる文脈でも神の御手を
 * 経ずに起きてはならないもの」だけに限る。迷うものは ask に置く。
 *
 * ⚠️ **掟は静的定数ではなくなった**(L-19 / 第29条 / 第58条)。第4段で楽園の配備物は
 * `<repo>/.claude` へ移った。`Edit(~/.claude/**)` は**もう楽園の配備物を守っていない** ——
 * 守っているのは神の住処(EX-1 の守備範囲)だけである。ゆえに掟は**住処に依る**:
 * `policyFor()` が abode の mode を見て、repo の住処に一本足す。
 *
 * **なぜ二つの掟を持つのか(片方に寄せない理由)**:
 *  - 一本に寄せて `Edit(**` + `/.claude/**)` を EX-1 にも出せば、**実機の輸出が即座に腐る** ——
 *    そして直す唯一の道は `~/.claude` へ書くことである。第6段はそれを禁じられている。
 *  - `<repo>/.claude` の守りは**楽園自身の配備物の守り**であり、守備範囲は楽園の倉に閉じる。
 *    神のマシン全体を守る EX-1 とは**帰属が違う**。帰属の違う守りを一つの束に混ぜれば、
 *    撤収のときに何が誰の物か判らなくなる(それが本改革の主題である)。
 */
const BASE_DENY = [
  // 歴史を壊す手 — 取り返しがつかないものだけを deny に置く
  'Bash(git push --force:*)',
  'Bash(git push -f:*)',
  'Bash(git push --force-with-lease:*)',
  'Bash(git reset --hard:*)',
  'Bash(git commit --no-verify:*)',
  // 第19条: 配備物は成果物である。手で触らず deploy.js で建て直す。
  // deploy.js は Node の fs で書くので Edit ツールを通らない → 配備は妨げない。
  // ⚠️ この一行は **神の住処** を守る(EX-1 の守備範囲)。第4段以降、楽園の配備物は
  //    ここに居ない —— 楽園の配備物を守るのは下の `REPO_ABODE_DENY` である。
  'Edit(~/.claude/**)',
  // 第6条: 秘密は読むことすら許さない。読めた瞬間に文脈へ漏れる。
  'Edit(**/.env)',
  'Read(**/.env)',
  'Read(**/.env.*)',
];

/**
 * リポジトリ内の住処を守る一行(L-19)。**repo の住処のときだけ掟に加わる。**
 *
 * 形の裁定(実測に基づく): permissions の Read/Edit は gitignore 構文であり、
 * **相対の形を解する**(公式文書 "Configure permissions" の pattern 表):
 *   `//path` = ファイルシステム根からの絶対 / `~/path` = ホーム起点 /
 *   `/path` = **settings の出所**からの相対 / `path` や `<星星>/path` = 現在地からの相対。
 * 絶対の道(`//c/Users/.../paradise/.claude/` 配下)を書けば、**その文字列は機械固有**になる。
 * `<repo>/.claude/settings.json` は **git 追跡された派生物**であるから(AC-14)、
 * 機械固有の絶対パスを焼き込めば **clone した先で必ず食い違い、derived.js が永久に赤くなる**
 * (第29条: 派生は真実の写しである)。ゆえに**可搬な相対の形**を採る。
 * `Edit(**` + `/.claude/**)` は deny 規則として任意の深さの `.claude` に当たるので、
 * 楽園の倉でも兄弟倉でも同じ一行が効く。
 */
const REPO_ABODE_DENY = 'Edit(**/.claude/**)';

const POLICY_ASK = [
  // マージは神の御手 (CLAUDE.md 絶対に守ること 1)。教主は自ら承認しない。
  'Bash(gh pr merge:*)',
];
const POLICY_ALLOW = [
  // 楽園の門。これらは何度でも走らせてよい — 走らせない方が危険である。
  'Bash(node graph/*)',
  'Bash(node tests/*)',
  // 読み取り系の git。壊さない手にいちいち許可を求めさせない。
  'Bash(git status:*)',
  'Bash(git diff:*)',
  'Bash(git log:*)',
];

/**
 * 住処に応じた掟を組む(L-19 / 第29条)。
 *
 * @param {{env?:object, repoRoot?:string, mode?:'repo'|'global'}} [opts]
 *   `mode` を明示すれば abode を引かない(輸出 EX-1 の照合はこれを使う —— 実機の
 *   permissions は **global の掟**と照合されねばならない。走らせた側の env で
 *   照合の基準が揺れれば、同じ実機が日によって赤くも緑にもなる)。
 * @returns {{deny:string[], ask:string[], allow:string[], defaultMode:string}}
 */
function policyFor(opts = {}) {
  const mode = opts.mode || abode.resolve({ env: opts.env, repoRoot: opts.repoRoot }).mode;
  const deny = BASE_DENY.slice();
  if (mode === 'repo') deny.push(REPO_ABODE_DENY);
  return { deny, ask: POLICY_ASK.slice(), allow: POLICY_ALLOW.slice(), defaultMode: 'default' };
}

/**
 * 既定の住処の掟。**この束を読む者は「今の住処の掟」を読んでいる。**
 * 実機(global)の輸出を照合する者は `policyFor({ mode: 'global' })` を明示して引く。
 */
const POLICY = policyFor();


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

  // 条件を `if` に運べず、ハンドラも tool_input を読まず、しかも止めるハンドラ —
  // このとき matcher を生かす修復は「条件付きの死んだ門」を
  // 「無条件の生きた BLOCK」に変える。**修理が新しい攻撃面を開く**の実例であり、
  // 実測された: dev-server 門は `npm run dev` だけを止めるつもりで書かれ、
  // 修復後は全ての Bash/PowerShell を止める形になっていた。
  // 死んだ門は何も止めない(安全側)。生きた無条件 BLOCK は全案件を壊す(危険側)。
  // ゆえに、運べないと分かったときは **修復しない**。
  if (conds.length && !rule) {
    const hs = Array.isArray(group.hooks) ? group.hooks : [];
    const widens = hs.some(h => h && typeof h === 'object'
      && handlerBlocks(h.command) && !handlerCarriesCondition(h.command));
    if (widens) {
      const fields = conds.map(x => x.field).join(', ');
      return { group, changed: false,
        note: c.status + ': refused — condition (' + fields + ') cannot be carried to `if` '
            + 'and the handler never reads tool_input; repairing would widen a BLOCK to every '
            + toolsToMatcher(tools) + ' call' };
    }
  }

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
 * **engine が神の設定から削除してよいキーの台帳**(AC-16 / R-4)。
 *
 * かつて `repairEnv()` は「壊れた `PATH`」を**自分の判断で消していた**。
 * その判断は正しかったが、**権能としては大きすぎた** —— 障害牲16 の実例がそれである
 * (`env.PATH` は engine の判断で消され、神は結果しか知らされなかった)。
 *
 * 第6段(撤収)は同じ形を engine 全体へ広げる仕事である。ゆえに先に錠を掛ける:
 * **撤収と修理は、この台帳に載っていないキーを削除してはならない。**
 * 削除が要るなら、それは**神への提示**であって engine の判断ではない。
 *
 * `abode.js check` の静的検査(`envRepairAudit()`)がこの錠を見張る ——
 * `repairEnv()` の本体に、この台帳を参照しない `delete` が現れたら exit 1 で名指す。
 */
const REPAIRABLE_ENV_KEYS = Object.freeze({
  PATH: '実測: `$PATH:/c/Program Files/GitHub CLI` は展開されずリテラルとして PATH を丸ごと' +
        '置き換え、node を呼ぶ hook 15/15 を殺していた。この行は何も足しておらず、' +
        '削除は「元に戻す」であって「神の設定を変える」ではない(障害牲16 の裁定)',
});

/** そのキーを engine が削除してよいか。台帳に無ければ **false** ——「知らないキーは残す」。 */
function mayDeleteEnvKey(key) {
  return Object.prototype.hasOwnProperty.call(REPAIRABLE_ENV_KEYS, key);
}

/**
 * env を修復する。**純関数** — 与えられた env は変更しない。
 *
 * ⚠️ **削除は `REPAIRABLE_ENV_KEYS` に載ったキーに限る**(AC-16)。
 * 台帳外のキーが壊れていても**消さない** —— `proposals` に載せて**神へ提示する**。
 * 提示は削除ではない。神が名指した物だけが台帳へ載る(許可制の正しい使い方)。
 *
 * `env` が空になったら `env` キーごと消す(空の器を残さない)。
 * @returns {{env:object|undefined, changes:object[], proposals:object[]}}
 */
function repairEnv(env) {
  const changes = [];
  const proposals = [];
  if (!env || typeof env !== 'object' || Array.isArray(env)) return { env, changes, proposals };
  const next = { ...env };

  for (const [key, value] of Object.entries(env)) {
    if (typeof value !== 'string' || !isPathPrefixedValue(value)) continue;
    if (!mayDeleteEnvKey(key)) {
      /**
       * **台帳に無いキーは engine が消さない。** 神へ提示するだけである。
       * ここを `delete next[key]` に変えれば AC-16 が赤くなる —— それが錠である。
       */
      proposals.push({
        kind: 'env-proposal', key, from: value, severity: 'warn',
        note: `env.${key} = ${JSON.stringify(value)} は展開されない参照を含むが、` +
              `**${key} は削除の台帳(REPAIRABLE_ENV_KEYS)に無い** — ` +
              'engine は消さない。消すべきなら神が名指せ(AC-16 / R-4)',
      });
      continue;
    }
    delete next[key];                         // ⚠️ 台帳に載ったキーだけがここへ来る
    const emptied = !Object.keys(next).length;
    changes.push({
      kind: 'env', key, from: value, severity: 'fatal', emptied,
      ledger: REPAIRABLE_ENV_KEYS[key],
      note: `env.${key} = "${value}" は展開されない — 削除する`
          + (emptied ? ` (env はこれ一つだったのでキーごと消える)` : '')
          + ` (台帳の根拠: ${REPAIRABLE_ENV_KEYS[key]})`,
    });
  }

  // 一つの欠陥は一つの乖離として数える — 空になったことを別行で叫べば、
  // drift の件数が実際の欠陥数より膨らんで検査の意味が薄れる。
  if (!Object.keys(next).length) return { env: undefined, changes, proposals };
  return { env: next, changes, proposals };
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

/**
 * 掟どおりの permissions か。余分なキーは楽園の管轄外なので見ない。
 * @param {object} cur 検める permissions
 * @param {object} [policy] 照合の基準。**省略すれば「今の住処の掟」**。
 *   実機(global)の輸出を照合する者は `policyFor({ mode: 'global' })` を明示して渡す ——
 *   走らせた側の env で基準が揺れれば、同じ実機が日によって赤くも緑にもなる。
 */
function permissionsMatch(cur, policy = POLICY) {
  if (!cur || typeof cur !== 'object') return false;
  for (const k of POLICY_KEYS) {
    const a = cur[k], b = policy[k];
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
  // (b2) 既に配備されてしまった無条件 BLOCK と、禁じられた強制を外す。
  //      修復を拒むだけでは、**既に広げられた門**は settings.json に残り続ける。
  //      塞いだ穴でなく、開いてしまった面を撃つ。
  if (hooks && typeof hooks === 'object') {
    for (const [event, groups] of Object.entries(hooks)) {
      if (!Array.isArray(groups)) continue;
      const kept = [];
      groups.forEach((g, i) => {
        const why = forbiddenReason(event, g);
        if (why) {
          changes.push({ kind: 'forbidden-hook', event, index: i,
            matcher: String(g && g.matcher), description: (g && g.description) || '', note: why });
          return;
        }
        if (TOOL_GATE_EVENTS.includes(event) && isUnconditionalBlock(g)) {
          changes.push({ kind: 'unconditional-block', event, index: i,
            matcher: String(g && g.matcher), description: (g && g.description) || '',
            note: 'removed — blocks every ' + String(g && g.matcher)
                + ' call unconditionally (no `if`, handler never reads tool_input)' });
          return;
        }
        kept.push(g);
      });
      hooks[event] = kept;
    }
  }

  // (c) env の健全性 — 門が鳴っても走れなければ同じこと
  //     ⚠️ **削除は台帳(REPAIRABLE_ENV_KEYS)に載ったキーだけ**(AC-16)。
  //     台帳外のキーは `proposals` に載って神へ提示される —— 提示は削除ではない。
  const proposals = [];
  if (next.env && typeof next.env === 'object' && !Array.isArray(next.env)) {
    const r = repairEnv(next.env);
    if (r.env === undefined) delete next.env; else next.env = r.env;
    for (const c of r.changes) changes.push(c);
    for (const p of r.proposals) proposals.push(p);
  }

  return { next, changes, proposals };
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
  const { changes, proposals } = buildDesired(s);
  const env = envDrift(s);
  return { skipped: false, ok: changes.length === 0, file, changes, proposals,
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
      else if (c.kind === 'unconditional-block' || c.kind === 'forbidden-hook') {
        const tag = c.kind === 'forbidden-hook' ? '禁じられた強制' : '無条件 BLOCK';
        console.log(`     🔴 ${c.event}[${c.index}] ${tag} を外す — matcher: ${c.matcher}`);
        if (c.description) console.log(`          「${c.description}」`);
        console.log(`          理由: ${c.note}`);
      }
      else console.log(`     🔴 ${c.event}[${c.index}] ${c.note}\n          from: ${c.from}`);
    }
    console.log(`     → node graph/apply-guards.js apply`);
  }
  // env は「修復対象でなくとも報告する」— 台帳外のキーは消さないが黙らない。
  if (!d.skipped) {
    const ed = d.envDrift || [];
    if (!ed.length) console.log('  ✓ env に展開されないシェル変数参照は無い');
    for (const e of ed) {
      console.log(`  ${e.severity === 'fatal' ? '🔴' : '⚠️ '} env.${e.key} [${e.kind}] ${e.value}`);
      console.log(`      ${e.detail}`);
    }
    /**
     * **提示は削除ではない**(AC-16 / R-4)。台帳に無いキーを engine が消せば、
     * それは神の設定への無断の改変である。ゆえに口で名指して、神の裁可を待つ。
     */
    for (const p of (d.proposals || [])) {
      console.log(`  📋 神への提示 (engine は消さない): env.${p.key}`);
      console.log(`      ${p.note}`);
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
  POLICY, policyFor, BASE_DENY, REPO_ABODE_DENY, POLICY_ASK, POLICY_ALLOW,
  KNOWN_TOOLS, SETTINGS, HOOK_HEALTH_CAVEAT,
  classify, diagnose, diagnoseSettings,
  extractTools, extractConditions, toolsToMatcher, conditionToIf, repairGroup,
  handlerBlocks, handlerCarriesCondition, isUnconditionalBlock,
  FORBIDDEN_HOOKS, forbiddenReason, TOOL_GATE_EVENTS,
  envDrift, repairEnv, REPAIRABLE_ENV_KEYS, mayDeleteEnvKey,
  hookHealth, commandExe, splitPathList, resolvesIn,
  readSettings, permissionsMatch, buildDesired, diff, apply, verify,
};
