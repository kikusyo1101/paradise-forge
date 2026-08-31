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
const os = require('os');
const { execFileSync } = require('child_process');

/** 楽園の場所は環境変数で上書きできる。絶対パス直書きは他環境を殺す。 */
function paradiseRoot() {
  if (process.env.PARADISE_ROOT) return process.env.PARADISE_ROOT;
  // このファイルは <paradise>/tools/hooks/ に置かれる
  const fromHere = path.resolve(__dirname, '..', '..');
  if (fs.existsSync(path.join(fromHere, 'graph', 'kg.js'))) return fromHere;
  return path.join(os.homedir(), 'Documents', 'workspace', 'paradise');
}

function main() {
  try {
    const root = paradiseRoot();
    const kg = path.join(root, 'graph', 'kg.js');
    if (!fs.existsSync(kg)) return;
    const snap = execFileSync('node', [kg, 'snapshot'], { encoding: 'utf8', timeout: 15000 });
    if (snap && snap.trim()) process.stdout.write('\n' + snap.trim() + '\n');
  } catch {
    // fail-open: 記憶の読み込み失敗でセッションを妨げない
  }
}

if (require.main === module) { main(); process.exit(0); }
module.exports = { paradiseRoot };
