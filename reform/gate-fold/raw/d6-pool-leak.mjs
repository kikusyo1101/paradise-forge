/**
 * D-6: P-3(Chrome 持ち回し)が**残骸を漏らさない**ことを実測する。
 * u3-probe は起動回数と時間を測った。こちらは第50条の裏面 ——
 * `close()` を無力化した覆いが、一時プロファイルを漏らさないかを数える。
 * 借り物には一行も触れない(第20条)。`browserFactory` は既存の注入口である。
 */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { runVisualCheck, ChromeVisualBrowser, findChrome }
  from '../../../overlay/vendor/archify/bin/visual-check.mjs';

const MARK = 'archify-visual-check-profile';
const count = () => { try { return fs.readdirSync(os.tmpdir()).filter(f => f.includes(MARK)).length; } catch { return 0; } };

const dir = path.join(os.tmpdir(), 'd6-fold-pool');
const htmls = JSON.parse(fs.readFileSync(path.join(dir, 'paths.json'), 'utf8'));
const chrome = findChrome();
if (!chrome) { console.log('SKIP: Chrome 不在 — 測れないことを緑と混同しない (第37条)'); process.exit(2); }

// ── A) 素の道: 成果物ごとに起こし、毎回 close() させる(現状) ──
let la = 0; const beforeA = count();
const tA0 = Date.now();
const recA = [];
for (const h of htmls) {
  const r = await runVisualCheck({ artifactPath: h, chromePath: chrome,
    browserFactory: async (c) => { la++; return new ChromeVisualBrowser(c); } });
  recA.push({ 図: path.basename(h), ok: r.receipt.ok, status: r.receipt.status, exit: r.exitCode });
}
const msA = Date.now() - tA0; const afterA = count();
console.log(`A) 成果物ごとに起動: 図 ${htmls.length} / 起動 ${la} 回 / ${msA}ms / プロファイル残 ${afterA - beforeA}`);
console.log('   裁定:', JSON.stringify(recA));

// ── B) 持ち回し: close() を無力化した覆い。**最後に一度だけ本物を閉じる** ──
let lb = 0, shared = null, real = null;
const beforeB = count();
const tB0 = Date.now();
const recB = [];
try {
  for (const h of htmls) {
    const r = await runVisualCheck({ artifactPath: h, chromePath: chrome,
      browserFactory: async (c) => {
        if (!shared) {
          lb++; real = new ChromeVisualBrowser(c);
          shared = new Proxy(real, { get(t, k) {
            if (k === 'close') return async () => {};    // 持ち回すので閉じない
            const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; } });
        }
        return shared;
      } });
    recB.push({ 図: path.basename(h), ok: r.receipt.ok, status: r.receipt.status, exit: r.exitCode });
  }
} finally {
  // **必ず閉じる。** finally に置くのが要 —— 途中で投げても残骸を残さない。
  if (real) { try { await real.close(); } catch (e) { console.log('   close 失敗:', e.message); } }
}
const msB = Date.now() - tB0;
// close() は Windows で一瞬プロファイルを掴むことがある(借り物の註釈)。少し待って数える。
await new Promise((r) => setTimeout(r, 1500));
const afterB = count();
console.log(`B) browser を持ち回す:  図 ${htmls.length} / 起動 ${lb} 回 / ${msB}ms / プロファイル残 ${afterB - beforeB}`);
console.log('   裁定:', JSON.stringify(recB));

const same = JSON.stringify(recA.map(r => [r.図, r.ok, r.status])) === JSON.stringify(recB.map(r => [r.図, r.ok, r.status]));
console.log(`\n判定: 裁定の本数 ${recA.length} == ${recB.length} / 各図の ok と status が一致: ${same}`);
console.log(`削減: 起動 ${la} → ${lb} / 時間 ${msA} → ${msB}ms (${((1 - msB / msA) * 100).toFixed(0)}% 減)`);
console.log(`残骸: A=${afterA - beforeA} 個 / B=${afterB - beforeB} 個 (どちらも 0 でなければ P-3 は採れない)`);
