#!/usr/bin/env node
'use strict';
/**
 * PARADISE :: gauge ledger audit self-test  (第55条 / 第37条 / 第44条)
 * ---------------------------------------------------------------------
 * `node graph/gauge.js ledger --audit` は台帳の corrupt / conflict / duplicate を
 * 数え、信号を三段に分けて返す門である:
 *
 *   exit 0 = 健全
 *   exit 1 = 機械が畳めば消える欠陥(重複)
 *   exit 2 = 人が中身を見るまで消えない事故(破損行 / 偽の指紋 / 深すぎる行)
 *
 * **その exit を読む口が、CI にも cron にもどこにも無かった。**
 *
 *     $ grep -rn "gauge" .github/
 *     (空)
 *
 * 建てられた門が誰にも呼ばれていない —— 第44条そのものである。ここがその口になる。
 *
 *   node tests/gauge-audit.test.js
 *
 * ─── なぜ「実台帳を見るだけ」では門にならないか (第37条) ───────────────
 *
 * 実台帳は **兄弟倉**に住む(`workspace.resolve().root/gauge-ledger.jsonl`)。
 * そして **CI に兄弟倉は無い**。ゆえに素朴に書けば、CI では毎回
 * 「台帳が無い → 何も起きない → 緑」になる。これは第37条(不在は通過ではない)
 * が名指しで禁じた形である —— **何も見ていないことと、見て何も無かったことは
 * 違う文である。**
 *
 * ゆえにこの門は**二段で撃つ**:
 *
 *   (a) 門自体の健全性 — 仮倉に**毒を仕込んだ台帳**を建て、exit 1 / 2 が
 *       本当に出ることを確かめる。CI に兄弟倉が無くともこれは必ず走る。
 *       これが無ければ CI では永遠に skip しか出ず、**門が審であることすら
 *       証されない**。
 *   (b) 実台帳 — 在る環境(神の機)では本物を監査する。無ければ
 *       **skip を名乗って**通す(第58条(e) の作法。黙って return しない)。
 *
 * ⚠️ **版管理下の現物を書き換えない (第58条(c) / hermetic)。**
 *    故障注入は必ず `os.tmpdir()` の複製に対して行う。実台帳(兄弟倉の
 *    `gauge-ledger.jsonl`)は **1バイトも触らない** —— 読むだけである。
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const GAUGE = path.join(ROOT, 'graph', 'gauge.js');
const workspace = require(path.join(ROOT, 'graph', 'workspace.js'));

let pass = 0, fail = 0, skipped = 0;
function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); pass++; }
  catch (e) {
    if (e && e.__skip) { console.log('  \u00b7 ' + name + '  (skipped: ' + e.message + ')'); skipped++; return; }
    console.log('  \u2717 ' + name + '\n      ' + (e && e.message)); fail++;
  }
}
function skip(why) { const e = new Error(why); e.__skip = true; throw e; }

/**
 * 監査を走らせる。`PARADISE_CREATIONS` で倉を振り替えるのが肝である ——
 * これが `workspace.resolve()` の第一の口であり(workspace.js:43)、
 * **住所を答えるのは workspace ただ一箇所**という第30条を破らずに
 * 仮倉へ向けられる唯一の作法である。
 */
function audit(creationsRoot) {
  const r = spawnSync(process.execPath, [GAUGE, 'ledger', '--audit'], {
    encoding: 'utf8',
    env: { ...process.env, PARADISE_CREATIONS: creationsRoot },
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

/** 仮倉を建てて台帳を置く。**複製であって現物ではない** (第58条(c))。 */
function fakeVault(lines) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-gauge-audit-'));
  fs.writeFileSync(path.join(dir, 'gauge-ledger.jsonl'), lines.join('\n') + (lines.length ? '\n' : ''));
  return dir;
}

/**
 * 台帳の 1 行を作る。**指紋は gauge に導かせる** —— ここで写経すれば、
 * 指紋の規則が変わった日にこの門が黙って嘘をつく(第29条)。
 */
function row(slug, score) {
  const gauge = require(GAUGE);
  const e = {
    ts: '2026-09-13T00:00:00.000Z', slug, scale: 'standard',
    metrics: { score, complete: true, phasesTotal: 11, phasesDone: 11,
               domainsTotal: 6, domainsRatified: 6, firstPassRate: 1,
               reworkCount: 0, retryOverhead: 0, loopGuardTrips: 0, durationMs: 1000 },
  };
  return JSON.stringify({ ...e, fp: gauge.fingerprint ? gauge.fingerprint(e) : undefined });
}

// ══════════════════════════════════════════════════════════════════════
// (a) 門自体の健全性 — 毒を仕込んで、門が本当に鳴ることを撃つ
//
// **健全な系で緑になるだけの門は、証明されていない。** この倉の一貫した作法で
// ある。逆の側を撃たなければ、「台帳が清いから緑」なのか「門が死んでいるから
// 緑」なのかを誰も区別できない。
// ══════════════════════════════════════════════════════════════════════
console.log('\n台帳の監査 — 門自体の健全性 (CI に兄弟倉が無くとも必ず走る):');

test('【正】清い台帳は exit 0 — 門は正当な台帳を通す(壁ではなく門である)', () => {
  const v = fakeVault([row('alpha', 100), row('beta', 80)]);
  try {
    const r = audit(v);
    assert.strictEqual(r.code, 0, `清い台帳が exit ${r.code} で拒まれた:\n${r.out}`);
    assert.ok(/rows=2 distinct=2 duplicates=0/.test(r.out), `行を数えていない:\n${r.out}`);
  } finally { fs.rmSync(v, { recursive: true, force: true }); }
});

test('【逆】重複を仕込むと exit 1 — 機械が畳めば消える欠陥 (第55条)', () => {
  const dup = row('alpha', 100);
  const v = fakeVault([dup, row('beta', 80), dup]);
  try {
    const r = audit(v);
    assert.strictEqual(r.code, 1, `重複した台帳が exit ${r.code} で通った:\n${r.out}`);
    assert.ok(/duplicates=1/.test(r.out), `重複を名指ししていない:\n${r.out}`);
  } finally { fs.rmSync(v, { recursive: true, force: true }); }
});

test('【逆】破損行を仕込むと exit 2 — 人が読むまで消えない事故 (第37条)', () => {
  const v = fakeVault([row('alpha', 100), 'this-is-not-json{{{']);
  try {
    const r = audit(v);
    assert.strictEqual(r.code, 2, `破損行のある台帳が exit ${r.code} で通った:\n${r.out}`);
    assert.ok(/corrupt=1/.test(r.out), `破損を数えていない:\n${r.out}`);
    // **名指しすること。** 名指ししない門は、赤くなっても直せない。
    assert.ok(/破損行/.test(r.out), `破損行を名指ししていない:\n${r.out}`);
  } finally { fs.rmSync(v, { recursive: true, force: true }); }
});

test('【逆】偽の指紋を仕込むと exit 2 — 名乗る鍵と中身が食い違う (第16条)', () => {
  const forged = JSON.parse(row('alpha', 100));
  forged.fp = 'deadbeefdeadbeef';        // 中身から導かれない鍵を名乗らせる
  const v = fakeVault([JSON.stringify(forged)]);
  try {
    const r = audit(v);
    assert.strictEqual(r.code, 2, `偽の指紋が exit ${r.code} で通った:\n${r.out}`);
    assert.ok(/conflicts=1/.test(r.out), `矛盾を数えていない:\n${r.out}`);
  } finally { fs.rmSync(v, { recursive: true, force: true }); }
});

test('【逆】台帳が無い倉は「読めない」— 空と健全を同じ文にしない (第37条)', () => {
  /**
   * 台帳の**不在**そのものは gauge にとって「0 行の台帳」である。それは事故では
   * ないので exit 0 でよい —— だが **rows=0 と名乗ること**が条件である。
   * 黙って緑を返すなら、それは第37条が禁じた「見ていないのに通す」門になる。
   */
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-gauge-empty-'));
  try {
    const r = audit(dir);
    assert.strictEqual(r.code, 0, `空の倉で exit ${r.code}:\n${r.out}`);
    assert.ok(/rows=0/.test(r.out), `台帳が無いことを口で名乗っていない — 沈黙は通過ではない:\n${r.out}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ══════════════════════════════════════════════════════════════════════
// (b) 実台帳 — 在るなら監査する。無いなら skip を**名乗る** (第58条(e))
// ══════════════════════════════════════════════════════════════════════
console.log('\n台帳の監査 — 実台帳 (神の機にのみ在る):');

test('実台帳が健全である — 在る環境では本物を監査する', () => {
  const root = workspace.resolve().root;
  const ledger = path.join(root, 'gauge-ledger.jsonl');
  /**
   * **不在を skip と呼んでよいのは、外を向いていると名乗ったときだけである**
   * (第58条(e) / guards.test.js の先例)。実台帳は**兄弟倉の資産**であり、
   * 楽園の倉が clone されても付いてこない。CI に無いのは欠損ではなく不在である。
   * ゆえにここは skip してよい —— ただし**黙って return しない**。
   */
  if (!fs.existsSync(ledger)) skip(`実台帳が無い(${ledger})— 兄弟倉は楽園の倉に付いてこない。門自体の健全性は上の (a) が撃っている`);

  // ⚠️ 読むだけ。実台帳は**1バイトも書き換えない**(未コミットの正当な行が住んでいる)。
  const r = audit(root);
  assert.strictEqual(r.code, 0,
    `実台帳の監査が exit ${r.code} — 台帳に人が読むべき行がある。node graph/gauge.js ledger --audit を読め:\n${r.out}`);
});

// ══════════════════════════════════════════════════════════════════════
console.log(`\nGauge ledger audit self-test: ${pass} passed, ${fail} failed, ${skipped} skipped`);
process.exit(fail > 0 ? 1 : 0);
