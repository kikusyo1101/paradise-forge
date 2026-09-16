#!/usr/bin/env node
/**
 * 修理案の**候補**を仮の写しに当てて、どの道を奪うかを実測する。
 * ⚠️ 本物の graph/forge.js は一行も変えない。$TMP に写して、そこだけを曲げる。
 * 実装ではない — 「この候補はどこを壊すか」を数で言うための計測である。
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'graph', 'forge.js');
const PROBE = path.join(__dirname, '_matrix_probe.js');
const orig = fs.readFileSync(SRC, 'utf8');

const CART_HEAD = 'function isCartography(wish) {\r\n  if (!DIAGRAM_RE.test(wish)) return false;';
/** 候補: [名, 説明, 変換関数(src)->src] */
const CANDIDATES = [
  ['C1-サイト語彙',
   "fullJa に「サイト|ウェブ|ec|通販|ポータル」を足す (+ fullEn に site|website|ecommerce|e-commerce|portal|shop|store)",
   s => s
     .replace("const fullJa = /製品|システム|アプリ|プラットフォーム|全体/;",
              "const fullJa = /製品|システム|アプリ|プラットフォーム|全体|サイト|ウェブ|ウェブサイト|EC|通販|ポータル/i;")
     .replace("const fullEn = /\\b(product|platform|system|app|application|saas|dashboard|end-to-end|mvp|launch)\\b/;",
              "const fullEn = /\\b(product|platform|system|app|application|saas|dashboard|end-to-end|mvp|launch|site|website|web[- ]?app|e-?commerce|portal|shop|store)\\b/;")],

  ['C1a-サイトのみ(最小)',
   "fullJa に「サイト」の一語だけを足す",
   s => s.replace("const fullJa = /製品|システム|アプリ|プラットフォーム|全体/;",
                  "const fullJa = /製品|システム|アプリ|プラットフォーム|全体|サイト/;")],

  ['C1b-siteのみ(英語最小)',
   "fullEn に site|website だけを足す",
   s => s.replace("const fullEn = /\\b(product|platform|system|app|application|saas|dashboard|end-to-end|mvp|launch)\\b/;",
                  "const fullEn = /\\b(product|platform|system|app|application|saas|dashboard|end-to-end|mvp|launch|site|website)\\b/;")],

  ['C2-作図を産物で打ち消す',
   "isCartography に `if (wantsProduct(wish)) return false;` を足す(素朴版)",
   s => s.replace(CART_HEAD, CART_HEAD + '\r\n  if (wantsProduct(wish)) return false;')],

  ['C2a-作図を産物で打ち消す(強い産物名のみ)',
   "isCartography に PRODUCT_STRONG_RE による打ち消しだけを足す(紛れ語の守り付き)",
   s => s.replace(CART_HEAD, CART_HEAD + '\r\n  if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;')],

  ['C3-C1+C2a 併用', "C1 と C2a を同時に当てる", s => {
     let t = CANDIDATES[0][2](s);
     return CANDIDATES[4][2](t);
   }],
];

const results = [];
for (const [name, desc, fn] of CANDIDATES) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cand-'));
  // graph/ ごと写す(forge.js は同階層の module を require する)
  fs.cpSync(path.join(ROOT, 'graph'), path.join(tmp, 'graph'), { recursive: true });
  const bent = fn(orig);
  const changed = bent !== orig;
  fs.writeFileSync(path.join(tmp, 'graph', 'forge.js'), bent);
  let out = '', gateOut = '', gateExit = 0;
  try {
    out = execFileSync(process.execPath, [PROBE], {
      env: { ...process.env, PROBE_FORGE: path.join(tmp, 'graph', 'forge.js').replace(/\\/g, '/') },
      encoding: 'utf8', cwd: ROOT,
    });
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  // 既存の門 tests/route-matrix.test.js を、曲げた forge に対して撃つ
  const bentForge = path.join(tmp, 'graph', 'forge.js').replace(/\\/g, '/');
  const gateSrc = fs.readFileSync(path.join(ROOT, 'tests', 'route-matrix.test.js'), 'utf8')
    .split("path.join(ROOT, 'graph', 'forge.js')").join(JSON.stringify(bentForge));
  const gatePath = path.join(tmp, 'route-matrix.bent.test.js');
  fs.writeFileSync(gatePath, gateSrc);
  try {
    gateOut = execFileSync(process.execPath, [gatePath], { encoding: 'utf8', cwd: ROOT });
  } catch (e) { gateOut = (e.stdout || '') + (e.stderr || ''); gateExit = e.status; }
  // counsel.test.js も同様に曲げた forge へ向ける
  let cOut = '', cExit = 0;
  try {
    const cSrc = fs.readFileSync(path.join(ROOT, 'tests', 'counsel.test.js'), 'utf8')
      .split("path.join(ROOT, 'graph', 'forge.js')").join(JSON.stringify(bentForge));
    const cPath = path.join(tmp, 'counsel.bent.test.js');
    fs.writeFileSync(cPath, cSrc);
    cOut = execFileSync(process.execPath, [cPath], { encoding: 'utf8', cwd: ROOT });
  } catch (e) { cOut = (e.stdout || '') + (e.stderr || ''); cExit = e.status; }
  results.push({ name, desc, changed, out, gateOut, gateExit, cOut, cExit, tmp });
}

for (const r of results) {
  console.log('\n' + '═'.repeat(78));
  console.log(`候補 ${r.name}`);
  console.log(`  ${r.desc}`);
  console.log(`  差分が当たったか: ${r.changed ? 'YES' : '⚠ NO — 置換に失敗(実測が無効)'}`);
  console.log('═'.repeat(78));
  // 行列と非対角だけを抜く
  const lines = r.out.split('\n');
  const i = lines.findIndex(l => l.includes('混同行列'));
  console.log(lines.slice(i >= 0 ? i : 0).join('\n').trim());
  console.log('\n  ── 既存の門 tests/route-matrix.test.js を曲げた forge に撃つ ──');
  const gl = r.gateOut.split('\n').filter(l => l.includes('✗') || l.includes('Route matrix self-test'));
  console.log('  exit=' + r.gateExit);
  console.log(gl.map(l => '  ' + l.trim()).join('\n') || '  (出力なし)');
  console.log('\n  ── 既存の門 tests/counsel.test.js を曲げた forge に撃つ ──');
  const cl = r.cOut.split('\n').filter(l => l.includes('✗') || l.includes('Counsel self-test'));
  console.log('  exit=' + r.cExit);
  console.log(cl.map(l => '  ' + l.trim()).join('\n') || '  (出力なし)');
}
