#!/usr/bin/env node
/**
 * specify 相の計測器 ⑥: **英語の `\b` を本走行で直すか別件に割るか**の裁定の根拠。
 *
 * 問い: R3′(「門」の複合語表だけ)を当て、**R2(英語の \b)を当てない**形 Y で、
 *       種M は 0 件になるか。ならないなら「\b は本走行の範囲内」である
 *       —— AC「種M は 0 件」が R2 無しでは**原理的に達成できない**からである。
 *
 * ⚠️ 本物の graph/ tests/ は一行も書き換えない。
 * 使い方: node reform/weak-signs/_spec_noR2.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const GATE = path.join(__dirname, '_cand_gate.js');
const WORK = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'ws_cand');

// X4″ から R2 を剥がす(= \b 付きの REFORM_RE を main の素の形へ戻す)
const src = fs.readFileSync(path.join(WORK, 'forge.X4PP.js'), 'utf8');
const R2_RE = "const REFORM_RE = /(楽園|ハーネス|憲法|エンジン|門|パイプライン|自己改善|オーケストレーション|枢機卿|神官|" +
  "\\b(?:paradise|harness|constitution|engine|gate|pipeline|self-improve|orchestration|cardinal|priest)\\b)/i;";
const PLAIN = "const REFORM_RE = /(楽園|paradise|ハーネス|harness|憲法|constitution|engine|エンジン|門|gate|パイプライン|pipeline|自己改善|self-improve|オーケストレーション|orchestration|枢機卿|cardinal|神官|priest)/i;";
if (!src.includes(R2_RE)) { console.error('R2 の的が見つからない'); process.exit(2); }
const bentPath = path.join(WORK, 'forge.noR2.js');
fs.writeFileSync(bentPath, src.replace(R2_RE, PLAIN));
console.log('Y = X4″ − R2(英語の \\b 無し): ' + bentPath + '\n');

const run = (b, rel, env) => {
  try { return execFileSync(process.execPath, [GATE, b, rel], { encoding: 'utf8', cwd: ROOT, env: { ...process.env, ...env } }); }
  catch (e) { return (e.stdout || '') + (e.stderr || ''); }
};
console.log('═══ Y(\\b 無し)の種M ═══');
console.log(run(bentPath, 'reform/weak-signs/_spec_m13.js'));
console.log('═══ Y の受け入れ帳 140 件 ═══');
console.log(run(bentPath, 'reform/weak-signs/_spec_ledger_probe.js'));
console.log('═══ 対照: X4″(\\b 有り)の受け入れ帳 140 件 ═══');
console.log(run(path.join(WORK, 'forge.X4PP.js'), 'reform/weak-signs/_spec_ledger_probe.js'));
