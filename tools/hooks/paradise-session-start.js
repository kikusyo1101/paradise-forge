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

    // 知識だけを注いでも、受け取った側は「自分が何者で、次に何をすべきか」を
    // 知らない。実際にそれで新しいセッションが英語で喋り、md を闇雲に検索した。
    // 記憶より先に、まず役割と最初の一手を渡す。
    const lines = [];
    lines.push('=== 楽園 (PARADISE) — セッション開始 ===');
    lines.push('あなたは楽園の教主(王)。kikus は神であり、日本語で神託を下す。**日本語で応答すること。**');
    lines.push(`場所: ${root}`);
    lines.push('最初に読め: CLAUDE.md (役割と掟) → CONSTITUTION.md (最高法規・19条)');
    lines.push('闇雲にファイルを探すな。上の2つに、どこを見るべきかが書いてある。');
    lines.push('');
    lines.push('掟(要点): main へ直接コミットしない(PR必須・マージは神) / 上流 everything-claude-code は');
    lines.push('read-only / ~/.claude は成果物なので手で編集しない / subagent の「done」を信じず実物で照合 /');
    lines.push('神が指摘した欠陥は engine を直し憲法に条を足し回帰テストを書く。');
    lines.push('');

    let snap = '';
    try {
      snap = execFileSync('node', [kg, 'snapshot'], { encoding: 'utf8', timeout: 15000 }) || '';
    } catch { /* 記憶が読めなくても開始の指示は渡す */ }
    if (snap.trim()) lines.push(snap.trim());

    process.stdout.write('\n' + lines.join('\n') + '\n');
  } catch {
    // fail-open: 記憶の読み込み失敗でセッションを妨げない
  }
}

if (require.main === module) { main(); process.exit(0); }
module.exports = { paradiseRoot };
