#!/usr/bin/env node
'use strict';
/**
 * watch-dirty.js — 走行中に**版管理下の現物が汚れる窓**を標本で捕らえる (第58条(c))
 *
 * work-7 の同名の器と同型。`git status --porcelain` を 15ms 間隔で覗き、
 * 版管理下 (` M ` / ` D ` / `MM` …) の汚れが見えた瞬間を tick 番号つきで叫ぶ。
 *
 *   node watch-dirty.js --repo <倉> [--interval 15] [--out <log>]
 *
 * **復元は除外ではない。** `finally` で書き戻す門も、書いてから戻すまでの間は
 * 窓を開けている。この器はその窓を実測する —— 主張ではなく証拠である(第5条)。
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};
const REPO = path.resolve(arg('--repo', process.cwd()));
const INTERVAL = Number(arg('--interval', '15'));
const OUT = arg('--out', null);

const lines = [];
const say = (s) => { console.log(s); lines.push(s); if (OUT) { try { fs.appendFileSync(OUT, s + '\n'); } catch {} } };

let tick = 0;
let dirtyTracked = 0, dirtyUntracked = 0;
let stop = false;

/** 版管理下の汚れか。`??` は未追跡なので**別に数える**(赤にはしない)。 */
function sample() {
  let out;
  try {
    out = execFileSync('git', ['status', '--porcelain'], {
      cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch { return; }                                  // git が忙しい瞬間は落とさず次へ
  for (const l of out.split('\n')) {
    if (!l.trim()) continue;
    const code = l.slice(0, 2);
    if (code === '??') { dirtyUntracked++; continue; }
    dirtyTracked++;
    say(`[tick ${tick}] DIRTY(TRACKED): ${l}`);
  }
}

/**
 * 標本の間隔は**測る側の都合で伸びる**。伸びたことを隠さない(第37条)。
 *
 * ⚠️ **黙って死んだ監視は「汚れなかった」と区別がつかない。**
 * 汚れが一度も無ければ log は空のまま終わるので、「見張っていた」ことの証拠が
 * 残らない —— 途中で落ちた監視と見分けられない(第16条: 測れないは緑ではない)。
 * ゆえに一定間隔で**鼓動**を刻む。鼓動が最後まで続いていることが、
 * 「全走行を通して見ていた」ことの証拠である。
 */
async function loop() {
  const t0 = Date.now();
  let nextBeat = 0;
  while (!stop) {
    tick++;
    sample();
    const el = Date.now() - t0;
    if (el >= nextBeat) {
      // 鼓動の文言に `DIRTY(TRACKED)` を含めない —— 含めると
      // `grep -c DIRTY(TRACKED)` が鼓動まで数え、**汚れの件数を水増しする**。
      // 証拠の行と、生きている印の行は、混ざらない語で書く(第5条)。
      say(`[tick ${tick}] 鼓動 ${(el / 1000).toFixed(1)}s — 版管理下の汚れ ここまで ${dirtyTracked} 件`);
      nextBeat = el + 10000;                           // 10秒ごと
    }
    await new Promise(r => setTimeout(r, INTERVAL));
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  say('──────────────────────────────────────────────');
  say(`標本 ${tick} 回 / ${secs}s (間隔 ${INTERVAL}ms) — 倉: ${REPO}`);
  say(`DIRTY(TRACKED) ${dirtyTracked} 回 / 未追跡の観測 ${dirtyUntracked} 回`);
  say(dirtyTracked === 0
    ? '✓ 版管理下の現物は一度も汚れなかった — 門は己の測る対象を汚していない (第58条(c))'
    : `🔴 版管理下の現物が ${dirtyTracked} 回汚れた — 復元しても窓は開く`);
  process.exit(dirtyTracked === 0 ? 0 : 1);
}

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stop = true; });
loop();
