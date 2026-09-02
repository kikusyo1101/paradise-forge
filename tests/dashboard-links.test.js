#!/usr/bin/env node
'use strict';
/**
 * dashboard-links.test.js — G-04: **孤児ページが生まれない**(導線が切れない)
 *
 * 担う AC: AC-19a〜e
 *
 * atlas は gitignore された生成物であり、**CI には 1 枚も存在しない**。
 * ゆえに「index から atlas 6 枚へ静的リンクを張る」設計は CI で 6 本すべてが
 * 死リンクになる。本門は**両辺とも実在を数える**ので、手元では 7、CI では 1 で
 * 同時に成立する —— 固定値を持たずに一致する(則3)。
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { ROOT, makeHarness } = require('./_pulse-fixture.js');

const H = makeHarness('dashboard-links');
const { test } = H;
const DASH = path.join(ROOT, 'dashboard');
const pulse = require(path.join(ROOT, 'graph', 'pulse.js'));

console.log('G-04 導線 (FR-19):');

/** 実在する画面。visual-check の副産物は画面ではない */
function realPages() {
  const out = [];
  for (const f of fs.readdirSync(DASH)) {
    if (f.endsWith('.html') && !f.includes('.visual-check.')) out.push(f);
  }
  const atlasDir = path.join(DASH, 'atlas');
  if (fs.existsSync(atlasDir)) {
    for (const f of fs.readdirSync(atlasDir)) {
      if (f.endsWith('.html') && !f.includes('.visual-check.')) out.push('atlas/' + f);
    }
  }
  return out;
}
const indexSrc = fs.readFileSync(path.join(DASH, 'index.html'), 'utf8');
const clientSrc = fs.readFileSync(path.join(DASH, 'paradise.js'), 'utf8');
const snap = pulse.snapshot();

/** index が実際に描く href の集合。静的な href と、断面 atlas[] から描く分 */
function renderedHrefs() {
  const set = new Set();
  for (const m of indexSrc.matchAll(/href="([^"]+\.html)"/g)) set.add(m[1]);
  for (const m of clientSrc.matchAll(/href: '([^']+\.html)'/g)) set.add(m[1]);
  // atlas[] は断面から描かれる。exists:true のものだけが描かれる (死リンクを作らない)
  for (const a of snap.atlas || []) if (a.exists) set.add(a.href);
  return set;
}

test('AC-19a: 孤児 0 — 実在する全ページが index から 1 ホップで到達できる', () => {
  const pages = realPages().filter(p => p !== 'index.html');
  const hrefs = renderedHrefs();
  const orphans = pages.filter(p => !hrefs.has(p));
  assert.deepStrictEqual(orphans, [], `到達できないページが ${orphans.length} 件`);
});

test('AC-19b: リンクの実数 == 実在する画面の数(index を除く)', () => {
  const pages = realPages().filter(p => p !== 'index.html');
  const hrefs = [...renderedHrefs()];
  assert.strictEqual(hrefs.length, pages.length,
    `画面が描く ${hrefs.length} 本 != 実在 ${pages.length} 枚 — 両辺とも実在を数えているか`);
});

test('AC-19c: 死リンク 0 — 描く href はすべて実ファイルを指す', () => {
  const dead = [...renderedHrefs()].filter(h => !fs.existsSync(path.join(DASH, h)));
  assert.deepStrictEqual(dead, [], `死リンクが ${dead.length} 本`);
});

test('AC-19c(構造): atlas が 1 枚も無いとき、画面は空リンクを描かない', () => {
  // 断面の atlas[] が空なら、索引は「まだ生成されていません」を出す。
  // **空リンクを描かない = 死リンクが構造的に生まれない**(CI がこの状態である)
  assert.ok(/atlas-empty|図はまだ生成されていません/.test(clientSrc),
    '空の atlas に対する分岐が画面に無い — CI で死リンクか無言になる');
  assert.ok(/if \(!a\.exists\) return/.test(clientSrc),
    'exists:false を描かない分岐が無い');
});

test('AC-19d: control.html と atlas 各枚に index への戻りリンクが在る', () => {
  const ctl = fs.readFileSync(path.join(DASH, 'control.html'), 'utf8');
  assert.ok(/href="index\.html"|href="\.\/index\.html"/.test(ctl), 'control.html に戻りリンクが無い');
  // atlas は生成物。**手で書き換えない** — 生成器 template.html が持つことを測る
  const tpl = fs.readFileSync(path.join(ROOT, 'overlay', 'vendor', 'archify', 'assets', 'template.html'), 'utf8');
  assert.ok(/href="\.\.\/index\.html"/.test(tpl),
    '生成器に戻りリンクが無い — 生成物を手で直せば次の再生成で消える(第29条)');
  const atlasDir = path.join(DASH, 'atlas');
  if (!fs.existsSync(atlasDir)) return;    // CI には生成物が無い。不在は違反ではない
  for (const f of fs.readdirSync(atlasDir)) {
    if (!f.endsWith('.html') || f.includes('.visual-check.')) continue;
    const src = fs.readFileSync(path.join(atlasDir, f), 'utf8');
    assert.ok(/href="\.\.\/index\.html"/.test(src), `${f} に戻りリンクが無い(atlas を作り直せ)`);
  }
});

test('AC-19e: 8 領域すべてが index に存在する', () => {
  const panels = new Set([...indexSrc.matchAll(/data-panel="([a-z-]+)"/g)].map(m => m[1]));
  assert.ok(panels.size >= 8, `領域が ${panels.size} 個 — 8 以上でなければ導線が欠けている`);
});

const r = H.report();
if (require.main === module) process.exit(r.fail === 0 ? 0 : 1);
module.exports = r;
