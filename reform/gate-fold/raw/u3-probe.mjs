// U-3 の実測: 一つの Chrome で複数の図を検められるか。
// 借り物(第20条)には一行も触れない。外から browserFactory を注入し、
// 同じ browser インスタンスが2つの成果物を受けられるかを撃つ。
import path from 'node:path';
import fs from 'node:fs';
import { runVisualCheck, ChromeVisualBrowser, findChrome } from '../../../overlay/vendor/archify/bin/visual-check.mjs';

const dir = process.argv[2];
const htmls = JSON.parse(fs.readFileSync(path.join(dir, 'paths.json'), 'utf8'));

const chrome = findChrome();
if (!chrome) { console.log('SKIP: Chrome 不在'); process.exit(2); }

// ── 素の道: 成果物ごとに Chrome を起こす(現状) ──
let launches = 0;
const countingFactory = async (c) => { launches++; return new ChromeVisualBrowser(c); };

const t0 = Date.now();
for (const h of htmls) {
  await runVisualCheck({ artifactPath: h, chromePath: chrome, browserFactory: countingFactory });
}
const perArtifact = Date.now() - t0;
console.log(`A) 成果物ごとに起動: ${htmls.length} 図 / 起動 ${launches} 回 / ${perArtifact}ms`);

// ── 畳んだ道: 一つの browser を持ち回す ──
// close() を無力化した薄い覆いを被せ、同じ実体を二度渡す。
// **検査は一つも減らない** — 減るのは起動だけである。
let launches2 = 0;
let shared = null;
const sharedFactory = async (c) => {
  if (!shared) {
    launches2++;
    const real = new ChromeVisualBrowser(c);
    shared = new Proxy(real, {
      get(t, k) {
        if (k === 'close') return async () => {};       // 持ち回すので閉じない
        const v = t[k];
        return typeof v === 'function' ? v.bind(t) : v;
      },
    });
    shared.__real = real;
  }
  return shared;
};

const t1 = Date.now();
let ok = true, receipts = [];
for (const h of htmls) {
  const r = await runVisualCheck({ artifactPath: h, chromePath: chrome, browserFactory: sharedFactory });
  receipts.push({ artifact: path.basename(h), ok: r.receipt.ok, checks: r.receipt.status, exit: r.exitCode });
  if (!r.receipt.ok) ok = false;
}
const pooled = Date.now() - t1;
try { await shared.__real.close(); } catch {}

console.log(`B) browser を持ち回す: ${htmls.length} 図 / 起動 ${launches2} 回 / ${pooled}ms`);
console.log('B) 各図の裁定:', JSON.stringify(receipts));
console.log(`削減: 起動 ${launches} → ${launches2} 回 / 時間 ${perArtifact} → ${pooled}ms (${((1 - pooled / perArtifact) * 100).toFixed(0)}% 減)`);
console.log(`検査の本数は一つも減っていない: ${htmls.length} 図とも裁定が出ている (ok=${ok})`);
