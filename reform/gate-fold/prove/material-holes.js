#!/usr/bin/env node
'use strict';
/**
 * M-02 の台本 — **鍵の材料の穴を、全数で測る**(reform/gate-fold / prove 相)
 *
 * 問い: **「門が赤くなる破壊」のうち、鍵が動かないものはどれだけ在るか。**
 * 鍵が動かないまま門が赤くなる破壊が在れば、その破壊は**畳みで消える** ——
 * findings §4.2 Jest #8702 と同型の「鍵の漏れ」である。
 *
 * 作法:
 *   ① 版管理下の現物を 1 本ずつ壊す(**生バイトを握り、finally で書き戻し、sha256 を検める**)
 *   ② `fold.key()` が動いたかを見る
 *   ③ 動かなかったものだけ、門の束を実際に撃って赤が出るかを見る
 *      —— 鍵が動くものは畳みで消えないので、撃つ必要が無い(代の節約であって手抜きではない)
 *
 * ⚠️ **`git checkout` で戻さない。** 生バイトを握って書き戻し、sha256 の一致を assert する。
 *
 * ⚠️⚠️ **`finally` は殺されたら走らない**(本相で実測して踏んだ)。
 * 親の timeout が走者を SIGKILL すると `finally` の書き戻しが飛び、
 * **現物が壊れたまま残る**(実測: `graph/.paradise-source` が「壊れた」の 1 行で残った)。
 * 生バイトをプロセスの記憶だけに置く復元は、**プロセスが死ねば一緒に死ぬ**。
 * ゆえに **壊す前にディスクへ退避簿(`restore-journal/`)を書く** ——
 * 次の走行は `--rescue` でそれを読み、殺された走行の後始末ができる。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..', '..');
process.chdir(ROOT);
const fold = require(path.join(ROOT, 'graph', 'fold.js'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

/** 壊し方: **長さを変えず中身だけを変える**版と、内容を潰す版の二つを持つ。 */
function corrupt(buf, mode) {
  if (mode === 'same-length') {
    // **バイト数検査に逃げる実装を捕まえるための壊し方**(教訓: 長さを変えずに中身を変える)
    const b = Buffer.from(buf);
    for (let i = 0; i < b.length; i++) {
      if (b[i] >= 0x41 && b[i] <= 0x59) { b[i] += 1; return b; }   // A..Y -> 次の字
      if (b[i] >= 0x61 && b[i] <= 0x79) { b[i] += 1; return b; }
    }
    return null;
  }
  return Buffer.from('壊れた\n');
}

const SUITE = ['tests/paradise.test.js', '--gate-not', '^atlas'];

/**
 * **退避簿。** 壊す直前に生バイトをディスクへ置く —— `finally` は殺されたら走らないので、
 * プロセスの記憶だけに置いた復元は、プロセスと一緒に死ぬ(本相で実測して踏んだ)。
 */
const JOURNAL = path.join(__dirname, 'restore-journal');

function stash(rel, buf) {
  fs.mkdirSync(JOURNAL, { recursive: true });
  const slot = path.join(JOURNAL, rel.replace(/[\\/]/g, '__'));
  fs.writeFileSync(slot, buf);
  fs.writeFileSync(slot + '.meta', JSON.stringify({ file: rel, sha: sha(buf) }));
  return slot;
}
function unstash(slot) {
  try { fs.rmSync(slot, { force: true }); fs.rmSync(slot + '.meta', { force: true }); } catch {}
}

/** 殺された走行の後始末。`node material-holes.js --rescue` で撃つ。 */
function rescue() {
  let names = [];
  try { names = fs.readdirSync(JOURNAL).filter((n) => n.endsWith('.meta')); } catch { }
  if (!names.length) { console.log('退避簿は空 — 救うものが無い'); return; }
  for (const n of names) {
    const meta = JSON.parse(fs.readFileSync(path.join(JOURNAL, n), 'utf8'));
    const slot = path.join(JOURNAL, n.replace(/\.meta$/, ''));
    const abs = path.join(ROOT, meta.file);
    const cur = (() => { try { return sha(fs.readFileSync(abs)); } catch { return null; } })();
    if (cur === meta.sha) { console.log(`無傷 ${meta.file}`); unstash(slot); continue; }
    fs.writeFileSync(abs, fs.readFileSync(slot));
    const ok = sha(fs.readFileSync(abs)) === meta.sha;
    console.log(`${ok ? '復元した' : '**復元失敗**'} ${meta.file}`);
    if (ok) unstash(slot);
  }
}

function gateRun() {
  const r = spawnSync(process.execPath, SUITE, { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
  const out = String(r.stdout || '') + String(r.stderr || '');
  return { status: r.status, red: [...out.matchAll(/^\s*\u2717 (.+)$/gm)].map((m) => m[1].trim()) };
}

function main() {
  const targets = process.argv.slice(2);
  if (targets[0] === '--rescue') { rescue(); return; }
  const K0 = fold.key();
  const rows = [];
  for (const rel of targets) {
    const abs = path.join(ROOT, rel);
    let before;
    try { before = fs.readFileSync(abs); } catch { console.log(`SKIP ${rel} (読めない)`); continue; }
    const s0 = sha(before);
    let row = { file: rel, keyMoved: null, gateRed: null, redGates: [] };
    const slot = stash(rel, before);       // **壊す前にディスクへ退避する**
    try {
      const broken = corrupt(before, process.env.PROBE_MODE || 'wipe');
      if (!broken || broken.equals(before)) { console.log(`SKIP ${rel} (壊せない)`); continue; }
      fs.writeFileSync(abs, broken);
      row.keyMoved = fold.key() !== K0;
      if (!row.keyMoved) {
        const g = gateRun();
        row.gateRed = g.status !== 0;
        row.redGates = g.red;
      }
    } finally {
      fs.writeFileSync(abs, before);
      if (sha(fs.readFileSync(abs)) !== s0) { console.error(`FATAL 復元失敗: ${rel}`); process.exit(9); }
      unstash(slot);
    }
    rows.push(row);
    console.log(`${row.keyMoved ? '鍵動く ' : '鍵不動 '} ${row.gateRed === null ? '(撃たず)' : row.gateRed ? '**門赤** ' : '門緑   '} ${rel}` +
      (row.redGates.length ? '\n      鳴った門: ' + row.redGates.join(' | ') : ''));
  }
  const holes = rows.filter((r) => r.keyMoved === false && r.gateRed === true);
  console.log(`\n撃った現物 ${rows.length} 本 / **偽の緑の穴 ${holes.length} 本**` +
    (holes.length ? ':\n' + holes.map((h) => '  ' + h.file + ' → ' + h.redGates.join(' | ')).join('\n') : ''));
  fs.writeFileSync(path.join(__dirname, 'raw', 'M-02-material-holes.json'), JSON.stringify(rows, null, 2));
}

main();
