#!/usr/bin/env node
'use strict';
/**
 * D-7: AC-11 が求める「1 回の走行で 72 → 32」は、**今の CI の走行の単位**では
 * 成立しうるか。tribunal.yml:139-143 は道ごとに**別プロセス**を起こす。
 * ゆえに「一つの走行(=プロセス)の中」で畳めるのは、同じ道の中の重複だけである。
 * 同じ道の中に、バイト同一の HTML の対は在るのか —— 数えて確かめる。
 */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const atlas = require(path.join(__dirname, '..', '..', '..', 'graph', 'atlas.js'));
const SCALES = ['quick', 'standard', 'full', 'reform', 'counsel', 'cartography'];
const SUBJECTS = Object.keys(atlas.SUBJECTS);
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16);

const dir = path.join(os.tmpdir(), 'd7-atlas-scope');
fs.rmSync(dir, { recursive: true, force: true });
const grid = {};
for (const s of SCALES) {
  grid[s] = {};
  for (const sub of SUBJECTS) {
    const od = path.join(dir, s);
    const r = atlas.draw(sub, { scale: s, outdir: od, out: path.join(od, `${sub}.html`) });
    grid[s][sub] = sha(r.html);
  }
}

let inProcSaved = 0, totalPairs = 0;
console.log('道ごと(= 今の CI の 1 プロセス)の中でバイト同一の対:');
for (const s of SCALES) {
  const seen = new Map(); let dup = 0;
  for (const sub of SUBJECTS) {
    const h = grid[s][sub]; totalPairs++;
    if (seen.has(h)) dup++; else seen.set(h, sub);
  }
  inProcSaved += dup;
  console.log(`  ${s.padEnd(12)} 主題 ${SUBJECTS.length} / 相異なる HTML ${seen.size} / 畳める対 ${dup}`);
}
const all = new Map();
for (const s of SCALES) for (const sub of SUBJECTS) {
  const h = grid[s][sub]; if (!all.has(h)) all.set(h, []); all.get(h).push(`${sub}@${s}`);
}
console.log(`\n全 36 組: 相異なる HTML ${all.size} 種 / 畳める組 ${36 - all.size}`);
console.log(`検査は 1 組あたり 2 回(firstScreen + motionAlive)ゆえ:`);
console.log(`  総検査 ${36 * 2} 回 / 走らせるべき ${all.size * 2} 回 / 畳める ${(36 - all.size) * 2} 回`);
console.log(`\n★ 今の CI の走行単位(道ごとに別プロセス)で in-process に畳める検査: ${inProcSaved * 2} 回`);
console.log(`★ 道を跨ぐ台帳が要る畳み: ${(36 - all.size - inProcSaved) * 2} 回`);
fs.rmSync(dir, { recursive: true, force: true });
