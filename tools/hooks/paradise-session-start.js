#!/usr/bin/env node
'use strict';
/**
 * paradise-session-start.js — 楽園の記憶を新しいセッションへ注ぐ
 *
 * かつてこの処理は everything-claude-code/scripts/hooks/session-start.js へ
 * 直接14行を書き足して実現していた。借り物の本体を改変する行為であり、
 * `git pull` 一発で消え、上流が同じ箇所を触れば必ず衝突する — 実際に
 * 未コミットのまま放置されていた（憲法 第19条が禁じる状態）。
 *
 * 借り物は改変せず、自分のフックを **並べて** 足す。settings.json の
 * SessionStart は配列であり、上流のフックと楽園のフックは共存できる。
 *
 * 失敗しても決してセッションを止めない（fail-open）。記憶が無い方が、
 * 記憶のために起動できないより遥かに良い。
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

/**
 * 楽園の場所は環境変数で上書きできる。絶対パス直書きは他環境を殺す。
 *
 * 二段で解決する: ① `PARADISE_ROOT` ② 自己位置(このファイルは
 * `<paradise>/tools/hooks/` に置かれる)。**三段目は持たない。**
 *
 * かつて三段目は `path.join(os.homedir(), 'Documents', 'workspace', 'paradise')`
 * だった —— 一台の機械の都合を全ての機械へ当てはめる推測である。
 * 判定できないものを推測で埋めれば、**別の倉のフックが楽園の記憶を注ぐ**。
 * 解決できなければ `null` を返し、呼び手は黙って手を引く(第16条 / 第58条(a))。
 *
 * ⚠️ ここは `~/.claude` ではなく**楽園リポジトリ自身**の住所であり、
 *    `abode.js` の職掌(配備の木)とは性質が違う。ゆえに abode へは繋がない
 *    —— 繋げば循環である(`abode.js` は倉の中に住み、倉の場所を前提にする)。
 * @returns {string|null}
 */
function paradiseRoot() {
  if (process.env.PARADISE_ROOT) return process.env.PARADISE_ROOT;
  // このファイルは <paradise>/tools/hooks/ に置かれる
  const fromHere = path.resolve(__dirname, '..', '..');
  if (fs.existsSync(path.join(fromHere, 'graph', 'kg.js'))) return fromHere;
  return null;
}

function main() {
  try {
    const root = paradiseRoot();
    if (!root) return;                     // 判定不能 — 推測で埋めない (第16条)
    const kg = path.join(root, 'graph', 'kg.js');
    if (!fs.existsSync(kg)) return;

    /**
     * 2026-09 ハーネス審査 3-d: SessionStart の stdout は**モデルが読める唯一の動的文脈**である
     * (PostToolUse/Stop の stdout は読まれない — 公式 hooks reference)。ゆえにここは
     * 「前回何をしたか」を機械の出力で渡す場所であり、掟の写経を置く場所ではない。
     * 静的な役割・掟は CLAUDE.md が担う(同じ文を二度載せれば予算を二度払う / 第39条)。
     * 文体は事実の陳述にする — 命令形の system 文はモデルの注入防御に引っかかる(同 reference)。
     */
    const run = (args, ms = 15000) => {
      try { return (execFileSync('node', args, { cwd: root, encoding: 'utf8', timeout: ms }) || '').trim(); }
      catch (e) { return ((e && (e.stdout || '')) + '').trim(); }   // exit≠0 でも stdout は使う(audit は赤で 1 を返す)
    };
    const git = (args) => {
      try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
      catch { return null; }
    };

    const lines = [];
    lines.push('=== 楽園 (PARADISE) — セッション開始 ===');
    lines.push(`場所: ${root} / 役割と掟は CLAUDE.md に在る(この文脈は前回の状態だけを運ぶ)`);

    // (1) 作業木の状態 — 前回が commit せずに終わっていれば、それが最初の事実である
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
    const dirty = git(['status', '--porcelain']);
    if (branch) lines.push(`git: branch=${branch}` + (dirty ? ` / 未コミット ${dirty.split('\n').length} 件:` : ' / 作業木は clean'));
    if (dirty) for (const l of dirty.split('\n').slice(0, 15)) lines.push('  ' + l);

    // (2) 走行帳 — 閉じていない環(第53条)。全走行を並べず、開いている物だけを名指す
    const audit = run([path.join(root, 'graph', 'conclave.js'), 'audit', '--json'], 20000);
    try {
      const rep = JSON.parse(audit);
      const open = (rep.ledgers || []).filter(l => l.state !== 'closed');
      lines.push(`走行帳: 全 ${(rep.ledgers || []).length} / 開いている ${open.length}` +
                 (rep.abandoned.length ? ` / 見捨てられた ${rep.abandoned.length}` : ''));
      for (const l of open.slice(0, 8)) lines.push(`  ${l.state === 'abandoned' ? '🔴' : '▶'} ${l.slug} ${l.ratified}/${l.total} domains — ${l.path}`);
    } catch { if (audit) lines.push('走行帳: (audit --json を読めなかった)'); }

    // (3) 神の課題台帳(任意) — 楽園の外に住むので env で名指されたときだけ読む(第58条(a))
    if (process.env.PARADISE_TASKS && fs.existsSync(process.env.PARADISE_TASKS)) {
      const t = run([process.env.PARADISE_TASKS, 'resume']);
      if (t) { lines.push(''); lines.push(t); }
    }

    // (4) 記憶
    const snap = run([kg, 'snapshot']);
    if (snap) { lines.push(''); lines.push(snap); }

    process.stdout.write('\n' + lines.join('\n') + '\n');
  } catch {
    // fail-open: 記憶の読み込み失敗でセッションを妨げない
  }
}

if (require.main === module) { main(); process.exit(0); }
module.exports = { paradiseRoot };
