#!/usr/bin/env node
'use strict';
/**
 * dashboard-no-deps.test.js — G-02: **外部依存が再び生えない**
 *
 * 担う AC: AC-10a/b, AC-12a/c/e, AC-17d, AC-N02a〜c, AC-N07a/c, AC-06a
 *
 * 検査は **node で書く**(則2)。`grep -E` に否定先読みは無く、リテラル扱いになって
 * **npm 依存を 100% 見逃す**。方言をまたぐ門は、壊れていても緑を返す。
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');
const { ROOT, makeHarness, skip } = require('./_pulse-fixture.js');

const H = makeHarness('dashboard-no-deps');
const { test } = H;
const PULSE = path.join(ROOT, 'graph', 'pulse.js');
const pulseSrc = fs.readFileSync(PULSE, 'utf8');

console.log('G-02 外部依存ゼロ (NFR-02):');

const STD = new Set(['http', 'https', 'fs', 'path', 'url', 'os', 'events', 'crypto', 'zlib', 'net', 'stream', 'util']);

test('AC-10a: pulse.js の require は node 標準か ./ の engine のみ', () => {
  const reqs = [...pulseSrc.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
  const bad = reqs.filter(r => !r.startsWith('./') && !r.startsWith('node:') && !STD.has(r));
  assert.deepStrictEqual(bad, [], `標準外の require が ${bad.length} 件`);
});

test('AC-N07a: pulse.js に子プロセスの語が 1 件も無い(G-10)', () => {
  // **註釈で語ることと、実際に呼ぶことは違う** — 第28条の同型。
  // 咎めるのは走るコードだけである。散文が「子プロセスを産まない」と述べる行を
  // 咎めれば、欠陥を語る散文と欠陥そのものを取り違える。
  const code = pulseSrc.split('\n').filter(l => {
    const t = l.trim();
    return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*'));
  }).join('\n');
  const hits = code.match(/child_process|execFileSync|spawnSync|execSync/g) || [];
  assert.strictEqual(hits.length, 0, `子プロセスの語が ${hits.length} 件 — node 起動代を毎回払う設計になる`);
});

test('AC-N07c: engine が module として読まれている', () => {
  const n = (pulseSrc.match(/require\('\.\/(clergy|forge|workspace|kg)/g) || []).length;
  assert.ok(n >= 2, `engine の require が ${n} 件 — 2 件以上でなければ常駐していない`);
});

test('AC-06a: pulse.js は census を一切呼ばない(G-07)', () => {
  const hits = pulseSrc.split('\n').filter(l => /census/.test(l));
  // 「census を呼ばない」と述べる註釈と、キャッシュを読む鍵名は許す。
  // 咎めるのは **実際に census.js を読み込む行**である。
  const calls = hits.filter(l => /require\(['"]\.\/census/.test(l) || /census\.js['"]\s*\]/.test(l));
  assert.deepStrictEqual(calls, [], 'census.js を require している — 実測 120,072ms が同期経路に入る');
});

test('AC-17d: pulse.js は住処の配下へ書かない(読むだけ)', () => {
  /**
   * **かつてこの門は文字列 `.claude` を探していた**(設計 L-18)。
   * 住所が `abode.js` へ集まった結果、`claudeDir()` から `.claude` の literal が
   * 消え、**門は構文上は通り続けるが何も見ていない**状態になった ——
   * 静かな緑の最悪形である(門が死んでも誰も気づかない)。
   *
   * ゆえに主張を**住所ベース**に改める: 書き込みの行が、住処へ至る式
   * (`claudeDir(` / `abode.` / `.claude`)を含まないことを検める。
   * **綴りではなく、どこへ書くかを裁く。**
   */
  const WRITERS = /writeFile|appendFile|mkdirSync|rmSync|unlinkSync|createWriteStream/;
  const ABODE_EXPR = /claudeDir\s*\(|\babode\s*\.|\.claude/;
  const lines = pulseSrc.split('\n');
  const offenders = [];
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;  // 註釈は道を説明してよい
    if (!WRITERS.test(line)) return;
    if (ABODE_EXPR.test(line)) offenders.push(`${i + 1}: ${t}`);
  });
  assert.deepStrictEqual(offenders, [],
    '住処の配下へ書く行が在る(pulse は読む器である):\n  ' + offenders.join('\n  '));
  // **門が痩せていないことを検める。** 書き込みの行が 1 本も無いなら、この門は
  // 何も見ていないのと同じである(第16条: 0 件の主張は門ではない)。
  const writes = lines.filter(l => WRITERS.test(l) && !/^\s*(\/\/|\*)/.test(l));
  assert.ok(writes.length > 0,
    'pulse.js に書き込みの行が一つも無い — 門が空振りしている。走査の形が腐った可能性が高い');
});

test('AC-10b: package.json が無いか、dependencies が 0 件', () => {
  const p = path.join(ROOT, 'package.json');
  // 楽園に package.json は無い(外部依存ゼロ)。不在は**名乗って** skip する ——
  // 黙って通れば、将来 package.json が生えた日にこの門が生きているか誰も知らない。
  if (!fs.existsSync(p)) skip(`package.json が無い: ${p} — 依存ゼロの証は他の門が握る`);
  const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.strictEqual(Object.keys(pkg.dependencies || {}).length, 0, 'npm 依存が在る');
});

test('AC-12a/12c: 生成器 template.html が外部書体を取りに行かない(退避は残す)', () => {
  const tpl = path.join(ROOT, 'overlay', 'vendor', 'archify', 'assets', 'template.html');
  const src = fs.readFileSync(tpl, 'utf8');
  assert.strictEqual((src.match(/fonts\.googleapis|fonts\.gstatic/g) || []).length, 0,
    '生成器がまだ外部書体を取りに行く — 生成物 6 枚 × 3 = 18 箇所に配られる');
  assert.ok(/@font-face|local\('JetBrains Mono'\)/.test(src), '退避まで消した(白紙化)');
});

test('AC-12e: git が追跡する overlay / dashboard に外部書体参照が 0 件', () => {
  const out = execFileSync('git', ['ls-files', '--', 'overlay', 'dashboard/index.html', 'dashboard/control.html', 'dashboard/paradise.js'],
    { cwd: ROOT, encoding: 'utf8' });
  const files = out.split('\n').filter(Boolean);
  assert.ok(files.length > 0, '走査対象が 0 件 — 対象不在を「違反 0」と取り違えない');
  const hit = files.filter(f => {
    try { return /https?:\/\/(fonts\.googleapis|fonts\.gstatic)/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')); }
    catch { return false; }
  });
  assert.deepStrictEqual(hit, [], '外部書体の供給線が残っている');
});

test('画面 2 枚が外部 http(s) を一切参照しない(w3.org の名前空間は除く)', () => {
  for (const f of ['index.html', 'control.html', 'paradise.js']) {
    const src = fs.readFileSync(path.join(ROOT, 'dashboard', f), 'utf8');
    const urls = (src.match(/https?:\/\/[^"'\s)]+/g) || [])
      .filter(u => !/^http:\/\/www\.w3\.org/.test(u))
      .filter(u => !/^http:\/\/127\.0\.0\.1/.test(u));    // 自分のサーバは外部ではない
    assert.deepStrictEqual(urls, [], `${f} が外部を参照している`);
  }
});

test('AC-N02c: vendor.verify が緑 — 楽園は己の足で立つ', () => {
  const vendor = require(path.join(ROOT, 'graph', 'vendor.js'));
  const r = vendor.verify();
  assert.strictEqual(r.ok, true, '版元の取り込みが崩れている');
});

const r = H.report();
if (require.main === module) process.exit(r.fail === 0 ? 0 : 1);
module.exports = r;
