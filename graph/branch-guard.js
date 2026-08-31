#!/usr/bin/env node
'use strict';
/**
 * branch-guard.js — 古い main の上で働いていないか (憲法 第24条)
 *
 * 神の指摘:「PRが残ったままの状態で main を参照するミスを何度も起こしている。
 * 防げないのか？」— 防げる。ただし**掟としてではなく、門として**。
 *
 * 実際に起きたこと: PR #12 を出した直後、それが未マージだと思い込んで
 * `git checkout main` から新しいブランチを切った。だが神は既にマージしており、
 * ローカルの main は origin より1コミット古かった。結果、二つのファイルで
 * rebase 競合を起こし、書いた変更が消えかけた。
 *
 * 「branch する前に pull せよ」は CLAUDE.md に書いてある。書いてあることは
 * 守られない — 守らせるのは門だけである(第21・22条で己が下した結論そのもの)。
 *
 *   node graph/branch-guard.js          # 今の立ち位置を裁く (危険なら exit 1)
 *   node graph/branch-guard.js --json   # 機械可読
 *
 * 裁くのは三つ:
 *   ① STALE_BASE  … origin/main が自分の祖先でない = 古い main の上に立っている
 *   ② ON_MAIN     … main に直接立って変更を持っている = 直コミットの一歩手前
 *   ③ OPEN_PR     … 自分のブランチに未マージPRがある = 積み増しか新規かを意識せよ
 *
 * ネットワークが無い場所でも黙って落ちない。fetch できなければ「判定できない」と
 * 正直に言う — 判定できないことを緑と偽ってはならない(第16条)。
 */
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const git = (args, opts = {}) => {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
  } catch (e) {
    if (opts.soft) return null;
    throw e;
  }
};

function inspect(opts = {}) {
  const findings = [];
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], { soft: true });
  if (!branch) return { ok: true, skipped: true, note: 'not a git repository — nothing to guard' };

  // 遠隔を見に行く。見に行けないなら、その事実を述べる。
  let fetched = true;
  if (opts.fetch !== false) {
    fetched = git(['fetch', '--quiet', 'origin'], { soft: true }) !== null;
  }

  const upstreamRef = 'origin/main';
  const originMain = git(['rev-parse', upstreamRef], { soft: true });
  const head = git(['rev-parse', 'HEAD'], { soft: true });
  const dirty = (git(['status', '--porcelain'], { soft: true }) || '').trim().length > 0;

  // ② main に直接立っている
  if (branch === 'main') {
    findings.push({
      code: 'ON_MAIN', severity: dirty ? 'block' : 'warn',
      message: dirty
        ? 'main に直接立ち、未コミットの変更を抱えている。ブランチを切れ(第3の掟)'
        : 'main に立っている。作業を始める前にブランチを切ること',
      fix: 'git checkout main && git pull && git checkout -b <type>/<slug>',
    });
  }

  // ① 古い main の上に立っている — 実際に踏んだ罠
  if (originMain && head) {
    const isAncestor = git(['merge-base', '--is-ancestor', originMain, 'HEAD'], { soft: true }) !== null;
    if (!isAncestor) {
      const behind = git(['rev-list', '--count', `HEAD..${upstreamRef}`], { soft: true });
      findings.push({
        code: 'STALE_BASE', severity: 'block',
        message: `分岐元が古い: ${upstreamRef} より ${behind || '?'} コミット遅れている。` +
                 'このまま進めれば rebase 競合を招き、書いた変更を失いかける',
        fix: `git fetch origin && git rebase ${upstreamRef}   # main上なら git pull`,
      });
    }
  } else if (!fetched) {
    findings.push({
      code: 'UNKNOWN_BASE', severity: 'warn',
      message: '遠隔を見に行けなかった。分岐元が最新かどうか**判定できていない** — 緑ではない',
      fix: '接続を確認して再実行する',
    });
  }

  // ③ 未マージのPRが自分のブランチに付いている
  let openPrs = null;
  if (opts.gh !== false) {
    const out = (() => {
      try {
        return execFileSync('gh', ['pr', 'list', '--state', 'open', '--json', 'number,headRefName,title'],
          { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      } catch { return null; }
    })();
    if (out) {
      try { openPrs = JSON.parse(out); } catch { openPrs = null; }
    }
  }
  if (openPrs && openPrs.length) {
    const mine = openPrs.filter(p => p.headRefName === branch);
    if (mine.length) {
      findings.push({
        code: 'OPEN_PR_HERE', severity: 'warn',
        message: `このブランチには未マージPRがある: ${mine.map(p => '#' + p.number).join(', ')}。` +
                 '積み増すなら良い。別件なら新しいブランチを切れ',
        fix: 'git checkout main && git pull && git checkout -b <new>',
      });
    } else {
      findings.push({
        code: 'OPEN_PR_ELSEWHERE', severity: 'info',
        message: `他に未マージPRがある: ${openPrs.map(p => '#' + p.number).join(', ')}。` +
                 'それがマージされた瞬間、このブランチの分岐元は古くなる',
        fix: 'マージ後は git rebase origin/main を忘れない',
      });
    }
  }

  const blocking = findings.filter(f => f.severity === 'block');
  return {
    ok: blocking.length === 0, skipped: false, branch, head, originMain, dirty, fetched,
    findings, blocking: blocking.length,
  };
}

if (require.main === module) {
  const res = inspect({ fetch: !process.argv.includes('--no-fetch') });
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.ok ? 0 : 1);
  }
  console.log('═══════ 🧭 BRANCH GUARD ═══════');
  if (res.skipped) { console.log(res.note); process.exit(0); }
  console.log('  branch :', res.branch, res.dirty ? '(未コミットの変更あり)' : '');
  if (!res.findings.length) console.log('  ✓ 最新の main の上に立っている');
  for (const f of res.findings) {
    const icon = f.severity === 'block' ? '🔴' : f.severity === 'warn' ? '⚠️ ' : '· ';
    console.log(`  ${icon} [${f.code}] ${f.message}`);
    console.log(`       → ${f.fix}`);
  }
  console.log('═══════════════════════════════');
  process.exit(res.ok ? 0 : 1);
}

module.exports = { inspect };
