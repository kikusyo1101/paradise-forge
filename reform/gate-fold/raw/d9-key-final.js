#!/usr/bin/env node
'use strict';
/**
 * D-9: 鍵の材料を確定し、その計算の代を測る。
 * **生成物(第29条)は鍵に入れない** —— derived.js の宣言を正典として除く。
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..', '..');
const DERIVED = Object.keys(require(path.join(ROOT, 'graph', 'derived.js')).DERIVED);
console.log('derived.js が宣言する生成物(= 鍵に入れてはならない):');
for (const d of DERIVED) console.log('   ' + d);

const ALL = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\n').map(s => s.trim()).filter(Boolean);
const isDerived = (f) => DERIVED.includes(f);

// ── 確定案 KF ──
//   tests/**.js      門の本体            (変われば裁定が変わりうる)
//   graph/**.js      engine の本体       (同上)
//   graph/*.json     engine の宣言表     (abode.json / domains.json。lessons.json は生成物ゆえ除く)
//   overlay/vendor/archify/**  借り物の描画器 (Atlas の裁定を左右する)
//   .github/workflows/*.yml    走行の定義 (段が変われば同じ入力ではない)
const KF = (f) =>
  (/^tests\/.*\.js$/.test(f) || /^graph\/.*\.js$/.test(f) || /^graph\/[^/]+\.json$/.test(f)
   || /^overlay\/vendor\/archify\//.test(f) || /^\.github\/workflows\/.*\.ya?ml$/.test(f))
  && !isDerived(f);

const VARIANTS = {
  'KF (確定案): tests+graph(js/json)+archify+workflows − 生成物': KF,
  'KF−archify (借り物を鍵から外した場合)': (f) => KF(f) && !/^overlay\//.test(f),
  'KF+overlay 全部': (f) => (KF(f) || /^overlay\//.test(f)) && !isDerived(f),
};

const measure = (files) => {
  const runs = [];
  let digest = null, bytes = 0;
  for (let i = 0; i < 5; i++) {
    const t = process.hrtime.bigint();
    const h = crypto.createHash('sha256');
    let b = 0;
    for (const f of files) {
      h.update(f); h.update('\0');
      const buf = fs.readFileSync(path.join(ROOT, f));
      b += buf.length;
      h.update(crypto.createHash('sha256').update(buf).digest());
    }
    // 鍵に効く環境変数(AC-05)。値そのものではなくハッシュを混ぜる。
    for (const k of ['PARADISE_ABODE', 'PARADISE_ARCHIFY']) {
      h.update(k); h.update('='); h.update(String(process.env[k] || '')); h.update('\0');
    }
    digest = h.digest('hex').slice(0, 16); bytes = b;
    runs.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  runs.sort((a, b) => a - b);
  return { n: files.length, bytes, digest, med: runs[2], min: runs[0], max: runs[4] };
};

console.log('');
for (const [name, pick] of Object.entries(VARIANTS)) {
  const files = ALL.filter(pick).sort();
  const r = measure(files);
  console.log(`${name}\n    材料 ${r.n} 本 / ${(r.bytes / 1048576).toFixed(2)} MiB / 鍵 ${r.digest}`);
  console.log(`    計算 中央 ${r.med.toFixed(1)}ms (最小 ${r.min.toFixed(1)} / 最大 ${r.max.toFixed(1)})`);
}

// ── AC-05: PARADISE_ABODE が鍵を動かすことを実測 ──
const files = ALL.filter(KF).sort();
const keyWith = (abode) => {
  const h = crypto.createHash('sha256');
  for (const f of files) { h.update(f); h.update('\0'); h.update(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest()); }
  h.update('PARADISE_ABODE='); h.update(abode); h.update('\0');
  h.update('PARADISE_ARCHIFY='); h.update(''); h.update('\0');
  return h.digest('hex').slice(0, 16);
};
console.log('');
console.log(`AC-05 の実測: 素="${keyWith('')}" / repo="${keyWith('repo')}" / global="${keyWith('global')}"`);
console.log(`   repo == global ? ${keyWith('repo') === keyWith('global')}  (false でなければ AC-05 は満たせない)`);

// ── AC-03: 註釈一行で鍵が動くか / git SHA では動かないか ──
console.log('');
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
console.log(`AC-03 の材料: 鍵は git SHA (${sha.slice(0, 12)}…) を一切含まない — 上の算法に SHA は現れない`);
console.log(`   註釈一行の書き換えは tests/paradise.test.js の内容ハッシュを変える ⇒ 鍵が動く(構造的に自明)`);

// ── 畳みの取り分との比 ──
console.log('');
console.log(`鍵の計算の代 ≒ ${measure(files).med.toFixed(0)}ms。P-1 の取り分 843,000ms に対し ${(measure(files).med / 843000 * 100).toFixed(4)}%`);
