#!/usr/bin/env node
'use strict';
/**
 * D-1: 台帳の住所の候補を hermetic.js が何と裁くかを実測する。
 * 現物は一行も触らない —— hermetic の輸出 scanFile() を、使い捨ての写しに向けて撃つ。
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const H = require('../../../graph/hermetic.js');

const TESTS = path.join(__dirname, '..', '..', '..', 'tests');

const CASES = [
  ['A: ROOT 直下の未追跡 (.paradise-fold-ledger.jsonl)',
   `fs.appendFileSync(path.join(ROOT, '.paradise-fold-ledger.jsonl'), line);`],
  ['B: 版管理下の現物 (README.md)',
   `fs.appendFileSync(path.join(ROOT, 'README.md'), line);`],
  ['C: .claude/ の下 (追跡されている住処)',
   `fs.appendFileSync(path.join(ROOT, '.claude', 'paradise-fold.jsonl'), line);`],
  ['D: .claude/paradise-fold-ledger.jsonl (gitignore 候補)',
   `fs.appendFileSync(path.join(ROOT, '.claude', 'paradise-fold-ledger.jsonl'), line);`],
  ['E: engine の住所定数 経由 (fold.LEDGER)',
   `fs.appendFileSync(fold.LEDGER, line);`],
  ['F: 仮倉 (os.tmpdir)',
   `const box = fs.mkdtempSync(path.join(os.tmpdir(), 'fold-'));\n  fs.appendFileSync(path.join(box, 'ledger.jsonl'), line);`],
  ['G: graph/kg-store/ の下 (gitignore 済みの既存の倉)',
   `fs.appendFileSync(path.join(ROOT, 'graph', 'kg-store', 'fold.jsonl'), line);`],
  ['H: engine を呼ぶだけ (MUTATOR を書かない)',
   `fold.append({ key: k, exit: 0 });`],
];

const HEAD = `'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const DIR = __dirname;
const ROOT = path.join(DIR, '..');
const fold = require(path.join(ROOT, 'graph', 'fold.js'));
const line = 'x';
function probe() {
`;

for (const [name, body] of CASES) {
  const p = path.join(TESTS, `.d1-probe-${process.pid}.js`);
  try {
    fs.writeFileSync(p, HEAD + '  ' + body + '\n}\nprobe();\n');
    const r = H.scanFile(p);
    const tracked = H.trackedSet();
    const verdicts = r.hits.map((h) => {
      if (h.origin === 'sandbox') return `○ sandbox (${h.fn})`;
      if (h.origin === 'unknown') return `⚠️ unknown (${h.fn})`;
      if (h.rel === null) {
        if (h.prefix && [...tracked].every((t) => t !== h.prefix && !t.startsWith(h.prefix)))
          return `⚠️ untracked-by-prefix ${h.prefix} (${h.fn})`;
        return `🔴 VIOLATION 綴りが組めない${h.ledger ? ` / engine の住所定数 ${h.ledger}` : ''} (${h.fn})`;
      }
      if (tracked.has(h.rel)) return `🔴 VIOLATION ${h.rel} は版管理下 (${h.fn})`;
      return `⚠️ untracked ${h.rel} (${h.fn})`;
    });
    console.log(`${name}\n    hits=${r.hits.length}  ${verdicts.join(' | ') || '(書き込み呼び出しとして見えない)'}`);
  } finally { try { fs.rmSync(p, { force: true }); } catch {} }
}
