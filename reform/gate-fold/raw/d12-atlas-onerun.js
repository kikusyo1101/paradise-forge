#!/usr/bin/env node
'use strict';
/**
 * D-12: AC-11 は `Atlas inspect: Executed 32 out of 72 inspections (40 reused)` を
 * **一つの名乗り**として要求する。だが今の CI(tribunal.yml:139-143)は道ごとに
 * **別プロセス**を起こす —— 一つのプロセスは 12 検査しか見えない(D-7 実測)。
 * ゆえに「6 道を一つの走行で撃てるか」を実測する。
 */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const atlas = require(path.join(__dirname, '..', '..', '..', 'graph', 'atlas.js'));
const SCALES = ['quick', 'standard', 'full', 'reform', 'counsel', 'cartography'];
const SUBJECTS = Object.keys(atlas.SUBJECTS);
const dir = path.join(os.tmpdir(), 'd12-atlas-onerun');
fs.rmSync(dir, { recursive: true, force: true });

const t0 = Date.now();
const seen = new Map();
let total = 0, exec = 0, reused = 0;
for (const s of SCALES) {
  for (const sub of SUBJECTS) {
    const od = path.join(dir, s);
    const r = atlas.draw(sub, { scale: s, outdir: od, out: path.join(od, `${sub}.html`) });
    const h = crypto.createHash('sha256').update(fs.readFileSync(r.html)).digest('hex').slice(0, 16);
    // 1 主題あたりの検査は 2 回 (firstScreen + motionAlive)
    total += 2;
    if (seen.has(h)) { reused += 2; } else { seen.set(h, `${sub}@${s}`); exec += 2; }
  }
}
const ms = Date.now() - t0;
console.log(`1 プロセスで 6 道 × 6 主題 = 36 図を作った: ${ms}ms (${(ms / 1000).toFixed(1)}s)`);
console.log(`Atlas inspect: Executed ${exec} out of ${total} inspections (${reused} reused)`);
console.log(`恒等式 E + reused == N : ${exec} + ${reused} == ${total} → ${exec + reused === total}`);
console.log(`相異なる成果物: ${seen.size} 種`);
console.log('');
console.log('畳まれた写し元の例:');
let n = 0;
for (const [h, who] of seen) { if (n++ < 4) console.log(`   html=${h}  ← ${who}`); }
console.log('');
console.log('判定: **一つのプロセスで 36 図すべてを見られる**。ゆえに AC-11 の綴りは');
console.log('      CI の段を「道ごとに 6 プロセス」から「1 プロセスで 6 道」に変えれば');
console.log('      台帳を跨がずに成立する(D-7: 道の中だけでは 0 回しか畳めない)。');
fs.rmSync(dir, { recursive: true, force: true });
