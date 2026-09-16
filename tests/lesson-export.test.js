#!/usr/bin/env node
/**
 * PARADISE :: LESSON EXPORT — 刻んだ教訓が門に届いているか (第61条 / 盲点②)
 *
 * ── 実測された欠陥 ────────────────────────────────────────────────────
 * `kg.js remember lesson` は KG(`graph/kg-store/`、**`.gitignore` 済**)に刻む。
 * critic が読むのは `graph/lessons.json` であり、これは `lessons.js export` が
 * **生成する**。両者を結ぶ工程は誰も走らせていなかった。
 *
 *   reform 走行『route-misfire』は 10 件の教訓を刻み、
 *   「critic が永久に検め続ける」と書いた。
 *   **critic は一度もそれを読んでいなかった** —— `lessons: 85 件で裁いた`。
 *   tribunal が export を走らせると **85 → 99(+14)**。
 *
 * これは `art29-derived-not-truth`(生成物は真実の写しであって真実ではない)の
 * **裏返しの病**である。あちらは「生成物の中身を前提にするな」と言い、
 * こちらは「**生成物を再生成しないと、原本に刻んだ知識が門に届かない**」と言う。
 * `derived.js check` は生成物への**依存**を見るが、生成物の**鮮度**は誰も見ていない。
 *
 *   node tests/lesson-export.test.js     # exit 0 = 教訓帳は原本と揃っている
 *
 * ── 二段で撃つ(第37条: 不在は通過ではない)────────────────────────────
 *   (a) **門自体の健全性** — `PARADISE_KG` で作り物の KG を差し、
 *       原本にあって帳に無い教訓を門が**本当に名指すか**を撃つ。
 *       CI に KG は無いので、これが無ければ門は永久に skip しか出さず、
 *       門が審であることすら証されない。
 *   (b) **実物の突合** — この機に KG が在るなら、実際に突き合わせる。
 *       無ければ **skip() で声に出して名乗る**。黙って緑にしない。
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = __dirname;
const ROOT = path.join(DIR, '..');
const LESSONS_JSON = path.join(ROOT, 'graph', 'lessons.json');
const LESSONS_JS = path.join(ROOT, 'graph', 'lessons.js');

let pass = 0, fail = 0, skipped = 0;
/** 前提を欠く門が**理由を名乗って**退く口(先例: tests/counsel.test.js / 第37条)。 */
function skip(why) { const e = new Error(why); e.__skip = true; throw e; }
function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); pass++; }
  catch (e) {
    if (e && e.__skip) { console.log('  \u00b7 ' + name + '  (skipped: ' + e.message + ')'); skipped++; return; }
    console.log('  \u2717 ' + name + '\n      ' + String(e.message).split('\n').join('\n      ')); fail++;
  }
}

function mktmp(tag) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-lesson-' + tag + '-'));
}

/** 作り物の KG を建て、そこに教訓を刻む。実 KG には一切触れない。 */
function seedKg(dir, lessons) {
  fs.mkdirSync(dir, { recursive: true });
  const nodes = lessons.map(l => JSON.stringify({
    type: 'lesson', id: l.id, label: l.label || l.id,
    body: (l.check || l.id) + (l.applies ? '|applies:' + l.applies : ''),
    ts: l.ts || '2026-01-01T00:00:00.000Z',
  })).join('\n') + (lessons.length ? '\n' : '');
  fs.writeFileSync(path.join(dir, 'nodes.jsonl'), nodes);
  fs.writeFileSync(path.join(dir, 'edges.jsonl'), '');
  return dir;
}

/** 隔離した KG で `lessons.js export` を走らせ、書き出された帳を返す。 */
function exportWith(kgDir, outPath, extraArgs = []) {
  const env = { ...process.env, PARADISE_KG: kgDir };
  const r = { status: 0, stderr: '' };
  try {
    execFileSync(process.execPath, [LESSONS_JS, 'export', '--out', outPath, ...extraArgs],
      { env, cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { r.status = e.status == null ? 1 : e.status; r.stderr = String(e.stderr || ''); }
  let out = null;
  try { out = JSON.parse(fs.readFileSync(outPath, 'utf8')); } catch { out = null; }
  return { ...r, out };
}

/**
 * 門の芯 —— 原本(KG)と帳(lessons.json)の差を数える。
 * **件数ではなく id の集合**で比べる。件数が偶然揃うだけの一致は一致ではない。
 */
function drift(kgLessons, bookLessons) {
  const a = new Set(kgLessons.map(x => x.id));
  const b = new Set(bookLessons.map(x => x.id));
  return {
    missingFromBook: [...a].filter(x => !b.has(x)),  // 刻んだのに門へ届いていない
    staleInBook: [...b].filter(x => !a.has(x)),       // 原本から消えたのに帳に残る
  };
}

console.log('\n═══ 📤 LESSON EXPORT GATE (第61条 / 盲点②) ═══\n');

// ══════════════════════════════════════════════════════════════════════
// (a) 門自体の健全性 — 作り物の KG で、門が**本当に鳴る**ことを撃つ
// ══════════════════════════════════════════════════════════════════════

test('L-1 [門の健全性]: 原本に在って帳に無い教訓を、門が名指しで数える', () => {
  const kg = seedKg(mktmp('kg1'), [
    { id: 'alpha', check: 'a' }, { id: 'beta', check: 'b' }, { id: 'gamma', check: 'c' },
  ]);
  const book = [{ id: 'alpha', check: 'a' }];      // beta / gamma が届いていない
  const kgOut = exportWith(kg, path.join(mktmp('out1'), 'l.json'));
  assert.ok(Array.isArray(kgOut.out), 'export が帳を書けていない: ' + kgOut.stderr);
  assert.strictEqual(kgOut.out.length, 3, '作り物の KG から 3 件出るはず');
  const d = drift(kgOut.out, book);
  assert.deepStrictEqual(d.missingFromBook.sort(), ['beta', 'gamma'],
    '門が「届いていない教訓」を名指せていない');
});

test('L-2 [門の健全性]: 原本と帳が揃っていれば門は黙る — 常に赤い門は門ではない', () => {
  const kg = seedKg(mktmp('kg2'), [{ id: 'alpha', check: 'a' }, { id: 'beta', check: 'b' }]);
  const kgOut = exportWith(kg, path.join(mktmp('out2'), 'l.json'));
  const d = drift(kgOut.out, kgOut.out);
  assert.deepStrictEqual(d.missingFromBook, []);
  assert.deepStrictEqual(d.staleInBook, []);
});

test('L-3 [門の健全性]: 件数が同じでも中身が違えば門は鳴る — 数の一致は一致ではない', () => {
  const kg = seedKg(mktmp('kg3'), [{ id: 'alpha', check: 'a' }, { id: 'beta', check: 'b' }]);
  const kgOut = exportWith(kg, path.join(mktmp('out3'), 'l.json'));
  const book = [{ id: 'alpha', check: 'a' }, { id: 'ZETA', check: 'z' }];  // 件数は 2 で同じ
  const d = drift(kgOut.out, book);
  assert.strictEqual(kgOut.out.length, book.length, '件数は揃っている(これが罠である)');
  assert.deepStrictEqual(d.missingFromBook, ['beta']);
  assert.deepStrictEqual(d.staleInBook, ['ZETA']);
});

test('L-4 [第29条の逆を壊さない]: KG が空でも既存の帳を消さない(exit 1)', () => {
  // `art29-derived-not-truth` が既に守っている性質。R-1 の門がこれを壊していないか。
  const kg = seedKg(mktmp('kg4'), []);
  const outDir = mktmp('out4');
  const outPath = path.join(outDir, 'l.json');
  fs.writeFileSync(outPath, JSON.stringify([{ id: 'existing', check: 'x' }], null, 2));
  const r = exportWith(kg, outPath);
  assert.notStrictEqual(r.status, 0, 'KG が空なのに exit 0 を返した — 帳が消される');
  assert.ok(Array.isArray(r.out) && r.out.length === 1, '既存の帳が消えている');
});

// ══════════════════════════════════════════════════════════════════════
// (b) 実物の突合 — この機に KG が在るときだけ。無ければ声に出して skip。
// ══════════════════════════════════════════════════════════════════════

/** 実 KG の在り処。`lessons.js` と同じ解決を使う(写経しない)。 */
function realKgDir() {
  if (process.env.PARADISE_KG) return process.env.PARADISE_KG;
  try { return require(path.join(ROOT, 'graph', 'abode.js')).pathFor('kg'); }
  catch { return null; }
}

test('L-5 [実物]: 版管理下の lessons.json が実在し、非空の配列である', () => {
  assert.ok(fs.existsSync(LESSONS_JSON), 'graph/lessons.json が無い');
  const book = JSON.parse(fs.readFileSync(LESSONS_JSON, 'utf8'));
  assert.ok(Array.isArray(book) && book.length > 0, '教訓帳が空である — critic は何も裁けない');
  for (const l of book) {
    assert.ok(l && typeof l.id === 'string' && l.id, 'id を持たない教訓が在る: ' + JSON.stringify(l));
    assert.ok(typeof l.check === 'string' && l.check, `教訓 ${l.id} が check を持たない`);
  }
});

test('L-6 [実物]: 刻んだ教訓は全て帳に届いている — remember した走行は export したか', () => {
  const kgDir = realKgDir();
  if (!kgDir || !fs.existsSync(path.join(kgDir, 'nodes.jsonl'))) {
    skip(`この機に KG が無い(${kgDir || 'PARADISE_KG 未設定'}) —— ` +
      'CI には KG が無いのが正しい。門自体の健全性は L-1〜L-4 が撃っている(第37条)');
  }
  const tmpOut = path.join(mktmp('real'), 'l.json');
  const r = exportWith(kgDir, tmpOut);
  assert.ok(Array.isArray(r.out), 'KG からの export が失敗した: ' + r.stderr);
  const book = JSON.parse(fs.readFileSync(LESSONS_JSON, 'utf8'));
  const d = drift(r.out, book);
  console.log(`      原本(KG) ${r.out.length} 件 / 帳(lessons.json) ${book.length} 件`);
  assert.deepStrictEqual(d.missingFromBook, [],
    `刻んだのに門へ届いていない教訓が ${d.missingFromBook.length} 件在る —\n` +
    d.missingFromBook.map(x => `    ・${x}`).join('\n') +
    `\n  → node graph/lessons.js export --out graph/lessons.json を走らせて commit せよ。\n` +
    '    刻んだのに門へ届いていない状態は、刻んでいないのと同じである。');
});

test('L-7 [実物]: 帳に在って原本に無い教訓は無い — 帳が原本より先へ行っていない', () => {
  const kgDir = realKgDir();
  if (!kgDir || !fs.existsSync(path.join(kgDir, 'nodes.jsonl'))) {
    skip('この機に KG が無い —— L-3 が「件数の一致は一致ではない」を作り物で撃っている');
  }
  const tmpOut = path.join(mktmp('real2'), 'l.json');
  const r = exportWith(kgDir, tmpOut);
  const book = JSON.parse(fs.readFileSync(LESSONS_JSON, 'utf8'));
  const d = drift(r.out, book);
  assert.deepStrictEqual(d.staleInBook, [],
    `原本から消えたのに帳に残る教訓が ${d.staleInBook.length} 件在る:\n` +
    d.staleInBook.map(x => `    ・${x}`).join('\n') +
    '\n  → kg.js forget した教訓は export し直して帳からも落とせ。');
});

/**
 * ★ 本走行の教訓が実際に届いているかを**名指しで**撃つ。
 *   一般の突合(L-6)は KG の無い機で skip するが、これは**帳だけで**判ずるので
 *   CI でも走る。第61条を生んだ 4 件がいつか黙って落ちた日に鳴る。
 */
test('L-8: reform『route-misfire』の教訓 4 件が帳に実在する(CI でも走る)', () => {
  const book = JSON.parse(fs.readFileSync(LESSONS_JSON, 'utf8'));
  const ids = new Set(book.map(l => l.id));
  const must = ['classifier-repair-steals-from-another-road',
    'gate-needs-confusion-matrix-not-a-column',
    'corpus-blind-to-its-own-half',
    'regression-needs-both-heads'];
  const missing = must.filter(m => !ids.has(m));
  assert.strictEqual(missing.length, 0,
    `第61条を生んだ教訓が帳から消えている:\n` + missing.map(x => `    ・${x}`).join('\n'));
});

console.log(`\nLesson export self-test: ${pass} passed, ${fail} failed` + (skipped ? `, ${skipped} skipped` : ''));
process.exit(fail === 0 ? 0 : 1);
