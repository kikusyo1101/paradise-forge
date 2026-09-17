#!/usr/bin/env node
'use strict';
/**
 * paradise-commit-guard.js — main への直コミットを**機械で**拒む (PreToolUse / Bash(git commit:*))
 *
 * CLAUDE.md は長らくこう自白していた:
 *   「main へのローカル commit を拒む機構は無い(.git/hooks/ は空)。
 *     branch-guard.js を切る前に走らせることだけが散文の掟である」
 * 散文の掟は守られない(第33条)。この器はその一文を機構に変える。
 *
 * 裁くのは branch-guard.js の `ON_MAIN`(main に立って commit しようとしている)だけ。
 * `STALE_BASE` は commit を止める理由にならない — 古い土台の上の commit は後で
 * rebase すれば済み、止めれば「commit + push で退避せよ」(global CLAUDE.md)と衝突する。
 *
 * 出口: exit 2 = 止める(Claude Code は PreToolUse で exit 2 のみを block と読む)。
 *       それ以外は exit 0 — 判定できない(git 不在・fetch 不能)ときは**止めない**。
 *       止めない理由は stderr に名乗る(第16条: 黙って通さない)。
 *
 * 絶対パスを書かない。settings.json の command は `$CLAUDE_PROJECT_DIR` を通してここへ来る。
 */
const path = require('path');
const fs = require('fs');

function main() {
  let guard;
  try {
    const root = path.resolve(__dirname, '..', '..');
    const p = path.join(root, 'graph', 'branch-guard.js');
    if (!fs.existsSync(p)) { console.error('[commit-guard] branch-guard.js が無い — 判定できないので止めない'); return 0; }
    guard = require(p);
  } catch (e) {
    console.error(`[commit-guard] branch-guard を読めない (${e.message}) — 判定できないので止めない`);
    return 0;
  }
  let r;
  try { r = guard.inspect({ fetch: false, gh: false }); }
  catch (e) { console.error(`[commit-guard] 判定できない (${e.message}) — 止めない`); return 0; }
  if (!r || r.skipped) return 0;
  const onMain = (r.findings || []).find(f => f.code === 'ON_MAIN');
  if (!onMain) return 0;
  console.error('[commit-guard] BLOCKED: main に立ったまま commit しようとしている。');
  console.error(`[commit-guard] ${onMain.message}`);
  console.error(`[commit-guard] → ${onMain.fix}`);
  return 2;
}

if (require.main === module) {
  // stdin(tool_input)は読まない — `if: Bash(git commit:*)` が既に絞っている。
  process.exit(main());
}
module.exports = { main };
