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
 * 職責は二つ:
 *   (a) permissions ブロックを書く          … 掟そのものの機械化
 *   (b) 死んだ matcher を検出して修復する    … 既にある門が本当に鳴るようにする
 *
 *   node graph/apply-guards.js plan      # 何が変わるか (既定・書かない)
 *   node graph/apply-guards.js apply     # settings.json に書く
 *   node graph/apply-guards.js verify    # 宣言と一致するか (乖離で exit 1)
 *   node graph/apply-guards.js diagnose  # 全 matcher を公式仕様で裁く
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
  return { skipped: false, ok: changes.length === 0, file, changes, diagnosis: diagnoseSettings(s) };
}

/** 掟を settings.json に書く。permissions と死んだ matcher 以外は触らない。 */
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
      else console.log(`     🔴 ${c.event}[${c.index}] ${c.note}\n          from: ${c.from}`);
    }
    console.log(`     → node graph/apply-guards.js apply`);
  }
  console.log('════════════════════════════════════════════');
  process.exit(cmd === 'verify' && !d.ok ? 1 : 0);
}

module.exports = {
  POLICY, KNOWN_TOOLS, SETTINGS,
  classify, diagnose, diagnoseSettings,
  extractTools, extractConditions, toolsToMatcher, conditionToIf, repairGroup,
  readSettings, permissionsMatch, buildDesired, diff, apply, verify,
};
