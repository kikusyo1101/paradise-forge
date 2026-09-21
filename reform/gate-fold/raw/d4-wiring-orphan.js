#!/usr/bin/env node
'use strict';
/**
 * D-4: 新 engine `graph/fold.js` / 新門 `tests/fold.test.js` が
 * `wiring.js check` の孤児判定に掛かるかを**複製の倉**で実測する(第58条 c)。
 *
 * ⚠️ `wiring.map(root)` は使えない —— 実測で判った: `GRAPH = __dirname` を握るので
 * 引数の倉を無視して**現物の graph/** を読む。ゆえに毎段 **複製の倉で CLI を撃つ**。
 * (第16条: 振る舞いで裁く。輸出の形ではなく、実際に走る命令の答えを読む)
 */
const fs = require('fs'); const path = require('path'); const os = require('os');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..', '..');

const box = fs.mkdtempSync(path.join(os.tmpdir(), 'd4-wiring-'));
for (const d of ['graph', 'tests', '.github', 'overlay', 'tools']) {
  try { fs.cpSync(path.join(ROOT, d), path.join(box, d), { recursive: true }); } catch {}
}
for (const f of ['README.md', 'CONSTITUTION.md', 'CLAUDE.md', 'NOTICE.md']) {
  try { fs.cpSync(path.join(ROOT, f), path.join(box, f)); } catch {}
}

const shoot = (label) => {
  const r = spawnSync(process.execPath, [path.join(box, 'graph', 'wiring.js'), 'check'],
    { encoding: 'utf8', cwd: box });
  const keep = String(r.stdout).split('\n')
    .filter(l => /engine |孤児|✓|🔴|fold/.test(l) && !/門の除外/.test(l));
  console.log(`${label}\n${keep.map(l => '    ' + l.trim()).join('\n')}\n    exit=${r.status}`);
};

shoot('── 0: 複製したまま(基準)──');

fs.writeFileSync(path.join(box, 'graph', 'fold.js'),
  "'use strict';\nmodule.exports = { key: () => 'x', append: () => {}, read: () => [] };\n");
shoot('── 1: graph/fold.js を足す。require する者ゼロ / どの面も名を呼ばない ──');

fs.writeFileSync(path.join(box, 'tests', 'fold.test.js'), "'use strict';\nconsole.log('fold gate');\n");
shoot('── 2: tests/fold.test.js も足す。CI にも統べる試験にも無い ──');

const wf = path.join(box, '.github', 'workflows', 'tribunal.yml');
fs.writeFileSync(wf, fs.readFileSync(wf, 'utf8').replace('      - name: 🔒 Hermetic',
  '      - name: 📒 Fold\n        run: node tests/fold.test.js\n\n      - name: 🔒 Hermetic'));
shoot('── 3: CI に `node tests/fold.test.js` の段を足す(門の結線のみ)──');

const cen = path.join(box, 'graph', 'census.js');
fs.writeFileSync(cen, fs.readFileSync(cen, 'utf8').replace(
  "const path = require('path');", "const path = require('path');\nconst fold = require('./fold.js');"));
shoot('── 4: census.js が ./fold.js を require する(engine の結線)──');

fs.rmSync(box, { recursive: true, force: true });
