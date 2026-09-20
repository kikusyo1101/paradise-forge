#!/usr/bin/env node
'use strict';
/**
 * D-11: P-1 は census.js の自己診断の呼び口を **条件つき**にする。
 * だが門「gate-filter: census は自己診断を素で呼ぶ」(:10704) は census.js の
 * ソースを静的に読み、`execFileSync(process.execPath, [...])` が **1 箇所**で
 * **引数 1 個**であることを要求する。条件で包んだだけなら通るのか —— 実測する。
 */
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..', '..');
const CEN = fs.readFileSync(path.join(ROOT, 'graph', 'census.js'), 'utf8');
const NL = CEN.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
const box = fs.mkdtempSync(path.join(os.tmpdir(), 'd11-'));
fs.cpSync(path.join(ROOT, 'tests'), path.join(box, 'tests'), { recursive: true });
fs.cpSync(path.join(ROOT, 'graph'), path.join(box, 'graph'), { recursive: true });
for (const d of ['overlay', '.github', 'tools', '.claude']) {
  try { fs.cpSync(path.join(ROOT, d), path.join(box, d), { recursive: true }); } catch {}
}
for (const f of ['README.md', 'CONSTITUTION.md', 'CLAUDE.md', 'NOTICE.md', 'CONSTITUTION.INDEX.md']) {
  try { fs.cpSync(path.join(ROOT, f), path.join(box, f)); } catch {}
}
const GATE = '^gate-filter: census は自己診断を素で呼ぶ$';
const shoot = (label) => {
  const r = spawnSync(process.execPath, [path.join(box, 'tests', 'paradise.test.js'), '--gate', GATE],
    { encoding: 'utf8', cwd: box });
  const l = String(r.stdout).split('\n').map(s => s.replace(/\r$/, ''))
    .filter(s => /census は自己診断を素で呼ぶ|gates matched/.test(s));
  console.log(`${label}\n    exit=${r.status}\n${l.map(s => '    ' + s.trim()).join('\n')}`);
  // 直後の説明行も拾う
  const all = String(r.stdout).split('\n').map(s => s.replace(/\r$/, ''));
  const i = all.findIndex(s => /✗.*census は自己診断を素で呼ぶ/.test(s));
  if (i >= 0) console.log('      ' + String(all[i + 1] || '').trim());
};

shoot('── 0: 素の census.js(基準)──');

// 案 A: 呼び口を `if (!reused)` で包むだけ。引数は 1 個のまま。
let a = CEN.replace(
  "      const out = execFileSync(process.execPath, [path.join(ROOT, 'tests', 'paradise.test.js')],",
  "      const receipt = null;" + NL +
  "      const out = receipt ? receipt.stdout : execFileSync(process.execPath, [path.join(ROOT, 'tests', 'paradise.test.js')],");
fs.writeFileSync(path.join(box, 'graph', 'census.js'), a);
shoot('── A: 呼び口を三項で条件づける(引数 1 個のまま)──');

// 案 B: 畳みの旗を引数で渡す(引数 2 個になる)
let b = CEN.replace(
  "[path.join(ROOT, 'tests', 'paradise.test.js')]",
  "[path.join(ROOT, 'tests', 'paradise.test.js'), '--no-fold']");
fs.writeFileSync(path.join(box, 'graph', 'census.js'), b);
shoot('── B: 自己診断に `--no-fold` を引数で渡す(引数 2 個)──');

// 案 C: 呼び口を 2 箇所に増やす(畳む道と撃つ道を別に書く)
let c = CEN.replace(
  "      const out = execFileSync(process.execPath, [path.join(ROOT, 'tests', 'paradise.test.js')],",
  "      if (0) execFileSync(process.execPath, [path.join(ROOT, 'tests', 'paradise.test.js')], {});" + NL +
  "      const out = execFileSync(process.execPath, [path.join(ROOT, 'tests', 'paradise.test.js')],");
fs.writeFileSync(path.join(box, 'graph', 'census.js'), c);
shoot('── C: 呼び口を 2 箇所に増やす ──');

fs.rmSync(box, { recursive: true, force: true });
