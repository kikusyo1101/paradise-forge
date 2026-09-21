#!/usr/bin/env node
'use strict';
/**
 * D-8: 台帳の住所を `graph/fold.js` にどう書くと `abode.js check`(第58条 a)が
 * 咎めるかを、**複製の倉**で実測する。現物は一行も触らない(第58条 c)。
 */
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..', '..');

const box = fs.mkdtempSync(path.join(os.tmpdir(), 'd8-abode-'));
for (const d of ['graph', 'tests', '.github', 'overlay', 'tools']) {
  try { fs.cpSync(path.join(ROOT, d), path.join(box, d), { recursive: true }); } catch {}
}
for (const f of ['README.md', 'CONSTITUTION.md', 'CLAUDE.md', 'NOTICE.md', '.gitignore']) {
  try { fs.cpSync(path.join(ROOT, f), path.join(box, f)); } catch {}
}
try { fs.cpSync(path.join(ROOT, '.claude'), path.join(box, '.claude'), { recursive: true }); } catch {}
try { fs.cpSync(path.join(ROOT, '.git'), path.join(box, '.git'), { recursive: true }); } catch {}

const HEAD = "'use strict';\nconst fs = require('fs');\nconst path = require('path');\nconst ROOT = path.join(__dirname, '..');\n";
const CASES = [
  ['A: path.join(ROOT, ".claude", "…") — .claude を綴る',
   HEAD + "const LEDGER = path.join(ROOT, '.claude', 'paradise-fold-ledger.jsonl');\nmodule.exports = { LEDGER };\n"],
  ['B: abode.resolve() を通して住処を得る',
   HEAD + "const abode = require('./abode.js');\nconst LEDGER = path.join(abode.resolve().box, 'paradise-fold-ledger.jsonl');\nmodule.exports = { LEDGER };\n"],
  ['C: ROOT 直下の隠しファイル(.claude を綴らない)',
   HEAD + "const LEDGER = path.join(ROOT, '.paradise-fold-ledger.jsonl');\nmodule.exports = { LEDGER };\n"],
  ['D: os.homedir() を直に呼ぶ(禁じ手の対照)',
   HEAD + "const os = require('os');\nconst LEDGER = path.join(os.homedir(), '.paradise-fold-ledger.jsonl');\nmodule.exports = { LEDGER };\n"],
  ['E: graph/kg-store/ の下(既に gitignore 済みの倉)',
   HEAD + "const LEDGER = path.join(ROOT, 'graph', 'kg-store', 'fold-ledger.jsonl');\nmodule.exports = { LEDGER };\n"],
];

for (const [name, src] of CASES) {
  fs.writeFileSync(path.join(box, 'graph', 'fold.js'), src);
  const r = spawnSync(process.execPath, [path.join(box, 'graph', 'abode.js'), 'check'],
    { encoding: 'utf8', cwd: box });
  const bad = String(r.stdout).split('\n').filter(l => /fold\.js/.test(l)).map(l => l.trim());
  console.log(`${name}\n    exit=${r.status}  fold.js を名指した行: ${bad.length ? JSON.stringify(bad) : '(なし)'}`);
}
fs.rmSync(path.join(box, 'graph', 'fold.js'), { force: true });
fs.rmSync(box, { recursive: true, force: true });
