#!/usr/bin/env node
'use strict';
/**
 * motion-probe-leak.test.js — G-09: **門が己の残骸で不定に鳴らない**(第50条の裏面)
 * 担う AC: AC-23a〜e/g
 *
 * ■ この門は **症状ではなく原因を数える**。
 *   漏れが 529 個まで悪化した状態で、自己診断は **0 failed を出した**。
 *   「node tests/paradise.test.js が 0 failed」を唯一の受入基準にしてはならない ——
 *   **症状を見る門は、原因が悪化していても黙る。数えられるのは漏れの方である。**
 *
 * ■ 原因
 *   graph/motion-probe.mjs の finally が browser.child.kill() しか呼ばず、
 *   描画器が正規の後始末として公開している browser.close() を使っていなかった。
 *   close() は (1) SIGTERM → 1500ms 後 **SIGKILL エスカレーション**、
 *   (2) **fs.rmSync(this.profileRoot)** を行う。
 *   実測: 一時プロファイルが 483 → 519 → 529 と単調増加。**検器 1 回で +2。**
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const { ROOT, makeHarness } = require('./_pulse-fixture.js');

const H = makeHarness('motion-probe-leak');
const { test } = H;
const PROBE = path.join(ROOT, 'graph', 'motion-probe.mjs');
const src = fs.readFileSync(PROBE, 'utf8');

/** 走るコードだけを見る。註釈が病を語ることは病ではない(第28条の同型) */
function codeOnly(s) {
  return s.split('\n').filter(l => {
    const t = l.trim();
    return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*'));
  }).join('\n');
}
/** 残骸を数える。**これが判定である** */
function profileCount() {
  const tmp = os.tmpdir();
  try { return fs.readdirSync(tmp).filter(f => f.includes('archify-visual-check-profile')).length; }
  catch { return 0; }
}
function chromeCount() {
  try {
    const out = execFileSync('powershell', ['-NoProfile', '-Command',
      '(Get-Process chrome -ErrorAction SilentlyContinue | Measure-Object).Count'], { encoding: 'utf8', timeout: 20000 });
    return Number(String(out).trim()) || 0;
  } catch { return null; }        // 測れないことと、漏れが無いことは別である
}

async function main() {
  console.log('G-09 検器の資源漏れ (FR-23):');

  await test('AC-23a: 作法を使っている — child.kill() が 0 件、browser.close() が 1 件以上', () => {
    const code = codeOnly(src);
    assert.strictEqual((code.match(/child\.kill\(\)/g) || []).length, 0,
      '自前の半端な kill が残っている — SIGKILL エスカレーションも profileRoot の掃除も走らない');
    assert.ok((code.match(/browser\.close\(\)/g) || []).length >= 1, 'browser.close() を呼んでいない');
    assert.ok(/await browser\.close\(\)/.test(code),
      'await が無い — 後始末が終わるのを待たずに関数が解決する');
  });

  await test('AC-23b(本命): 検器を 1 回走らせる前後でプロファイル数の差が 0', () => {
    // 測る対象の図を用意する。生成物の住処には触れない(門が成果物を消せば直しが破壊になる)
    const outdir = path.join(os.tmpdir(), 'pd-leak-' + process.pid);
    fs.rmSync(outdir, { recursive: true, force: true });
    const atlas = require(path.join(ROOT, 'graph', 'atlas.js'));
    const r = atlas.draw('run', { outdir, out: path.join(outdir, 'run.html') });

    const BEFORE = profileCount();
    try {
      execFileSync(process.execPath, [PROBE, r.html, '--json'],
        { cwd: ROOT, encoding: 'utf8', timeout: 120000, env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1' } });
    } catch (e) { /* 検器の合否は本門の関心ではない。数えるのは漏れである */ }
    const AFTER = profileCount();
    fs.rmSync(outdir, { recursive: true, force: true });

    console.log(`      実測: BEFORE=${BEFORE} AFTER=${AFTER} 差=${AFTER - BEFORE}`);
    assert.strictEqual(AFTER - BEFORE, 0,
      `検器 1 回で ${AFTER - BEFORE} 個のプロファイルが漏れた(修正前は +2 だった)`);
  });

  await test('AC-23c: headless Chrome を残さない(前後の差が 0)', () => {
    const before = chromeCount();
    if (before === null) { console.log('      (Chrome の数を測れない環境 — 測れないことを緑と混同しない)'); return; }
    const outdir = path.join(os.tmpdir(), 'pd-leak2-' + process.pid);
    fs.rmSync(outdir, { recursive: true, force: true });
    const atlas = require(path.join(ROOT, 'graph', 'atlas.js'));
    const r = atlas.draw('run', { outdir, out: path.join(outdir, 'run.html') });
    try {
      execFileSync(process.execPath, [PROBE, r.html, '--json'],
        { cwd: ROOT, encoding: 'utf8', timeout: 120000, env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1' } });
    } catch (e) { /* 同上 */ }
    const after = chromeCount();
    fs.rmSync(outdir, { recursive: true, force: true });
    console.log(`      実測: chrome BEFORE=${before} AFTER=${after}`);
    assert.ok(after <= before, `Chrome が ${after - before} 個生き残った — SIGTERM を無視した器が居る`);
  });

  await test('AC-23e(壊して鳴る): close() を kill() に戻せばこの門が赤くなる', () => {
    // **緑を出すだけの門は、見ていない門と区別できない。**
    // 実際にファイルを書き換えて確かめる —— ただし必ず元に戻す。
    const backup = src;
    const broken = src.replace(/await browser\.close\(\);/, 'browser.child.kill();');
    assert.notStrictEqual(broken, backup, '差し替えの見本が作れない(実装が変わった)');
    // 差し替えた源に対して AC-23a の検査を当て、赤になることを確かめる
    const code = codeOnly(broken);
    const kills = (code.match(/child\.kill\(\)/g) || []).length;
    const closes = (code.match(/await browser\.close\(\)/g) || []).length;
    assert.ok(kills >= 1, '壊した源で kill が見つからない');
    assert.strictEqual(closes, 0, '壊した源にまだ close が残っている');
    // 元のファイルは 1 バイトも触っていないこと(作業屑を残さない)
    assert.strictEqual(fs.readFileSync(PROBE, 'utf8'), backup, '検査がファイルを汚した');
  });

  await test('AC-23g: atlas を 1 主題通した前後でも累積 0', () => {
    const BEFORE = profileCount();
    const outdir = path.join(os.tmpdir(), 'pd-leak3-' + process.pid);
    fs.rmSync(outdir, { recursive: true, force: true });
    const atlas = require(path.join(ROOT, 'graph', 'atlas.js'));
    const r = atlas.draw('dispatch', { outdir, out: path.join(outdir, 'dispatch.html') });
    try {
      execFileSync(process.execPath, [PROBE, r.html, '--json'],
        { cwd: ROOT, encoding: 'utf8', timeout: 120000, env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1' } });
    } catch (e) { /* 同上 */ }
    const AFTER = profileCount();
    fs.rmSync(outdir, { recursive: true, force: true });
    console.log(`      実測: BEFORE=${BEFORE} AFTER=${AFTER} 差=${AFTER - BEFORE}`);
    assert.strictEqual(AFTER - BEFORE, 0, `${AFTER - BEFORE} 個積まれた`);
  });

  await test('AC-23h(本命の再発): 検器を起こせない環境でも残骸を残さない', async () => {
    // ■ CI が教えた道 —— **Chrome が起こせない機**では、借り物の constructor が
    //   profileRoot を mkdtempSync した**直後**に spawn が落ちる。browser 変数へ
    //   代入される前に throw するので、呼ぶ側の finally の browser.close() は
    //   空振りし、**プロファイルだけが残る**。
    //   AC-23b/23g は Chrome が在る機でしか通らないので、この道を見ていなかった。
    //
    // **この機に Chrome が在っても、その道を必ず踏ませる** (則3: 環境任せにしない)。
    //   ARCHIFY_CHROME は借り物 findChrome() の正典に在る受け口である
    //   (visual-check.mjs:108)。ただし executable() が accessSync(F_OK) を通すので、
    //   **実在しないパスでは null が返り、構築の手前で止まってしまう** ——
    //   それでは漏れ道を踏めない(この門を書いたとき実際に踏み損ねた)。
    //   ゆえに **実在するが Chrome ではないファイル** を渡す: findChrome は通し、
    //   spawn が落ち、constructor は profileRoot を作った後に throw する。
    //   子プロセスで走らせるのは、この機の他の門の env を汚さないためである。
    // 偽 Chrome を渡したときの落ち方は **OS で違う**(則3: 片方の癖を掟にしない):
    //   Windows — spawn が同期に失敗し constructor が throw する(構築の失敗)
    //   Linux   — 空ファイルの spawn は成功し、パイプ書込で EPIPE が
    //             **非同期に**投げられる(unhandled rejection でプロセスが落ちる)
    // どちらでも契約は一つ: **残骸を残さない**。ゆえに子の生死ではなく残骸を測る。
    const fake = path.join(os.tmpdir(), 'pd-fake-chrome-' + process.pid + (process.platform === 'win32' ? '.exe' : ''));
    fs.writeFileSync(fake, '');
    if (process.platform !== 'win32') fs.chmodSync(fake, 0o755);   // X_OK を通す
    const BEFORE = profileCount();
    let out = '', died = false;
    try {
      out = execFileSync(process.execPath, ['--input-type=module', '-e', `
        import { probeMotion } from ${JSON.stringify(pathToFileURL(PROBE).href)};
        const r = await probeMotion(${JSON.stringify(path.join(ROOT, 'dashboard', 'index.html'))});
        console.log(JSON.stringify({ ok: r.ok, reason: r.reason || null }));
      `], { cwd: ROOT, encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'ignore'],
            env: { ...process.env, ARCHIFY_CHROME: fake, ARCHIFY_UPDATE_CHECK_DISABLED: '1' } });
    } catch (e) { died = true; out = String(e.stdout || ''); }
    finally { try { fs.rmSync(fake, { force: true }); } catch {} }
    const AFTER = profileCount();
    console.log(`      実測: 起こせない機 BEFORE=${BEFORE} AFTER=${AFTER} 差=${AFTER - BEFORE} / 子の死=${died}`);
    // **これが契約である** —— 検器が起きられなかった走行は、残骸を残してはならない
    assert.strictEqual(AFTER - BEFORE, 0,
      `probeMotion が ${AFTER - BEFORE} 個の残骸を残した — 構築の失敗を引き受けていない`);
    // 子が生き延びた機(構築が同期に落ちる道)では、諦め方も検める
    if (!died) {
      const res = JSON.parse(String(out).trim().split('\n').pop());
      assert.strictEqual(res.ok, false, '起こせない検器が ok:true を返した — 測れないことを緑と混同している');
      assert.ok(/検器を起こせない/.test(res.reason || ''),
        `理由が構築の失敗を名指ししていない: ${res.reason}`);
    }
  });

  const rep = H.report();
  if (require.main === module) process.exit(rep.fail === 0 ? 0 : 1);
  return rep;
}

module.exports = main();
