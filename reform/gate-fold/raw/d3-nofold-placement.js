#!/usr/bin/env node
'use strict';
/**
 * D-3: `PARADISE_NO_FOLD=1` を読む場所が AC-16 の門(gate-filter: 絞り込みは
 * 環境変数を読まない)と衝突するかを**実測**する。
 *
 * 手口は paradise.test.js 自身の F-1 門(:10825)と同形 ——
 * 自分の写しを `tests/` に置いて子プロセスで撃ち、必ず消す。現物は一行も触らない。
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..', '..');
const TESTS = path.join(ROOT, 'tests');
const SRC = path.join(TESTS, 'paradise.test.js');
const src = fs.readFileSync(SRC, 'utf8');
// **この現物は CRLF である(実測)。** 改行の綴りを合わせないと注入が一つも当たらない。
const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const NL = src.indexOf(CR + LF) >= 0 ? CR + LF : LF;
console.log(`現物の改行: ${NL === CR + LF ? 'CRLF' : 'LF'}`);

const MS = '// >>>' + ' gate-filter: 絞り込み塊 ここから';
const ME = '// <<<' + ' gate-filter: 絞り込み塊 ここまで';
const iS = src.indexOf(MS), iE = src.indexOf(ME);
console.log(`絞り込み塊: 行 ${src.slice(0, iS).split(LF).length} 〜 ${src.slice(0, iE).split(LF).length}`);
console.log('');

const AC16 = '^gate-filter: 絞り込みは環境変数を読まない$';
const ENVREAD = 'process' + ".env.PARADISE_NO_FOLD === '1'";

const CASES = [
  ['V0: 素(何も足さない) — 基準',
   (s) => s],
  ['V1: 塊の内側(GATE の返り値)で env を読む',
   (s) => s.replace('    list,' + NL, '    list,' + NL + '    noFold: ' + ENVREAD + ',' + NL)],
  ['V2: 塊の内側の**註釈**に env の綴りを書くだけ',
   (s) => s.replace('  // パターンは走行開始時に 1 度だけコンパイルする',
                    '  // 註釈の実験: ' + ENVREAD + ' をここで読んではならない' + NL +
                    '  // パターンは走行開始時に 1 度だけコンパイルする')],
  ['V3: 塊の**外・前**(CURRENT_GATE の直後)で env を読む',
   (s) => s.replace('const CURRENT_GATE = { name: null };' + NL,
                    'const CURRENT_GATE = { name: null };' + NL +
                    'const FOLD = { off: ' + ENVREAD + ' };' + NL)],
  ['V4: 塊の**外・後**(終了マーカーの直後)で env を読む',
   (s) => s.replace(ME + '  (AC-16 の門がこの対を読む — 対を消すな)' + NL,
                    ME + '  (AC-16 の門がこの対を読む — 対を消すな)' + NL +
                    'const FOLD = { off: ' + ENVREAD + ' };' + NL)],
];

for (const [name, mutate] of CASES) {
  const out = mutate(src);
  const changed = out !== src;
  const mut = path.join(TESTS, `.d3-probe-${process.pid}.js`);
  try {
    fs.writeFileSync(mut, out);
    const r = spawnSync(process.execPath, [mut, '--gate', AC16], { encoding: 'utf8', timeout: 120000 });
    const lines = String(r.stdout).split(LF).map((l) => l.replace(/\r$/, ''));
    const vi = lines.findIndex((l) => /絞り込みは環境変数を読まない/.test(l));
    const verdict = vi >= 0 ? lines[vi].trim() : '(門の行なし)';
    const why = vi >= 0 ? String(lines[vi + 1] || '').trim() : '';
    const last = lines.filter((l) => l.trim()).slice(-1)[0];
    console.log(`${name}\n    注入=${changed ? 'あり' : '★当たらなかった'}  exit=${r.status}`);
    console.log(`    ${verdict}`);
    if (/✗/.test(verdict) && why) console.log(`      ${why}`);
    console.log(`    ${String(last).trim()}`);
  } finally { try { fs.rmSync(mut, { force: true }); } catch {} }
}
