#!/usr/bin/env node
'use strict';
/**
 * dashboard-fallback.test.js — 三層フォールバックを**実ブラウザで**測る
 * 担う AC: AC-08c, AC-N03b, AC-N06a, AC-RT-3
 *
 * ■ なぜ実ブラウザが要るのか
 *   Chrome の file:// からの fetch() は **network error** であり(WHATWG#3099 実測)、
 *   origin は null になる。**この挙動は node では再現できない。**
 *   ゆえに本門だけがブラウザを起こす —— 他は静的走査と node 内で足りる(合計 60 秒の掟)。
 *
 * ■ 後始末
 *   借り物の作法は借り物の正典に問う(第50条d)。**必ず browser.close() で閉じる** ——
 *   child.kill() だけでは SIGKILL エスカレーションも profileRoot の掃除も走らない。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { pathToFileURL } = require('url');
const { ROOT, makeHarness } = require('./_pulse-fixture.js');

const H = makeHarness('dashboard-fallback');
const { test } = H;
const INDEX = path.join(ROOT, 'dashboard', 'index.html');

const STATE_EXPR = `(function () {
  var root = document.querySelector('[data-transport]');
  var log = document.querySelector('[data-log="transport"]');
  var awaiting = document.querySelectorAll('[data-awaiting]');
  var age = document.querySelector('[data-field="age"]');
  return JSON.stringify({
    transport: root ? root.getAttribute('data-transport') : null,
    freshness: root ? root.getAttribute('data-freshness') : null,
    logLines: log ? log.children.length : 0,
    logText: log ? (log.textContent || '').slice(0, 400) : '',
    awaiting: [].slice.call(awaiting).map(function (e) { return e.getAttribute('data-awaiting'); }),
    ageText: age ? (age.textContent || '') : '',
    hasGeneratedAt: !!(age && /\\d/.test(age.textContent || ''))
  });
})()`;

async function main() {
  console.log('三層フォールバックの実測 (FR-08 / NFR-06):');
  let browser = null;
  try {
    const vc = await import(pathToFileURL(path.join(ROOT, 'overlay', 'vendor', 'archify', 'bin', 'visual-check.mjs')).href);
    const chrome = vc.findChrome();
    if (!chrome) {
      console.log('  (Chrome が見つからない — 実ブラウザの検査は測れない。測れないことを緑と混同しない)');
      const rep = H.report();
      if (require.main === module) process.exit(rep.fail === 0 ? 0 : 1);
      return rep;
    }
    browser = new vc.ChromeVisualBrowser(chrome);
    const sessionId = await browser.sessionPromise;
    const send = (m, p) => browser.cdp.send(m, p, sessionId);
    const evaluate = async (expr) => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result?.value;
    };

    // **サーバを起動せずに** file:// で開く。第2層の fetch が network error になる
    const loaded = browser.cdp.waitFor('Page.loadEventFired', sessionId);
    await send('Page.navigate', { url: pathToFileURL(INDEX).href });
    await loaded;

    // 降格に必要な時間: 最初のイベント 5000ms + poll の失敗。10 秒以内に frozen になること。
    // ⚠️ **起動直後の markup も frozen である**(断面をまだ受け取っていないので、それが正直な
    // 名乗りである)。ゆえに「属性が frozen か」だけを見ると、降格が起きなくても緑になる。
    // **降格が実際に起きた証拠(ログ行の増加)を待つ。**
    let state = null;
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      state = JSON.parse(await evaluate(STATE_EXPR));
      if (state.transport === 'frozen' && /降格/.test(state.logText)) break;
      await new Promise(r => setTimeout(r, 400));
    }
    const elapsedOk = Date.now() < deadline + 400;

    await test('AC-08c: サーバ不在の file:// で 10 秒以内に data-transport が frozen になる', () => {
      assert.ok(state, '画面の状態が取れない');
      assert.strictEqual(state.transport, 'frozen',
        `10 秒経っても transport=${state.transport} — 凍結を名乗らない画面は嘘をついている`);
      assert.ok(/降格/.test(state.logText),
        '凍結を名乗ってはいるが、降格が起きた形跡が無い — 起動時の名乗りのまま止まっている疑い');
      assert.ok(elapsedOk, '10 秒以内に降格しなかった');
    });

    await test('AC-N06a: 第3層で data-freshness="frozen" と経過表示の両方が在る', () => {
      assert.strictEqual(state.freshness, 'frozen', `鮮度が ${state.freshness}`);
      assert.ok(state.ageText.length > 0, '経過が出ていない');
    });

    await test('AC-RT-3: 降格のログが 1 行以上増え、理由の文字列を含む', () => {
      assert.ok(state.logLines >= 1, `ログが ${state.logLines} 行`);
      assert.ok(/理由: /.test(state.logText), `ログに理由が無い: ${state.logText.slice(0, 160)}`);
      console.log(`      実測ログ: ${state.logText.replace(/\s+/g, ' ').slice(0, 160)}`);
    });

    await test('AC-N03b: 降格の途中で data-awaiting が待つ対象を名指しする(スピナーを出さない)', () => {
      assert.ok(state.awaiting.length >= 1, 'data-awaiting が 1 件も無い');
      for (const a of state.awaiting) assert.ok(a && a.length > 0, '空の data-awaiting が在る');
      console.log(`      実測 awaiting: ${[...new Set(state.awaiting)].join(', ')}`);
    });

    await test('NFR-06: 凍結でも推測で値を埋めない(測れない鍵は ready にしない)', async () => {
      // 断面が来ていないので、どのパネルも ready を名乗ってはならない
      const ready = JSON.parse(await evaluate(
        `JSON.stringify([].slice.call(document.querySelectorAll('[data-panel]')).map(function(e){return e.getAttribute('data-state')}))`));
      assert.ok(!ready.includes('ready'), `断面が無いのに ready のパネルが在る: ${ready.join(',')}`);
      console.log(`      実測 states: ${[...new Set(ready)].join(', ')}`);
    });

  } finally {
    // **必ず正規の後始末を呼ぶ**(第50条d / FR-23)。門が己の残骸を作らない
    if (browser) { try { await browser.close(); } catch { /* 検器の後始末が本体の裁定を汚さない */ } }
  }

  /* ══════════════════════════════════════════════════════════
     非既定ポートでの回帰 — **自動割当した瞬間に凍結する欠陥**の門
     ══════════════════════════════════════════════════════════ */
  {
    let browser2 = null, server = null;
    try {
      const vc = await import(pathToFileURL(path.join(ROOT, 'overlay', 'vendor', 'archify', 'bin', 'visual-check.mjs')).href);
      const chrome = vc.findChrome();
      if (chrome) {
        const pulse = require(path.join(ROOT, 'graph', 'pulse.js'));
        // 既定の 7317 ではない番号で起こす。設計は listen(0) の自動割当を謳っており、
        // 自動割当ならポートは毎回変わる —— 固定ポートを見る画面はその日から凍結する
        server = await pulse.serve({ port: 0, quiet: true });
        assert.notStrictEqual(server.port, pulse.T.DEFAULT_PORT, '自動割当が既定ポートを引いた(引き直す)');
        browser2 = new vc.ChromeVisualBrowser(chrome);
        const sid = await browser2.sessionPromise;
        const send = (m, p) => browser2.cdp.send(m, p, sid);
        const ev = async (e) => {
          const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
          if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
          return r.result?.value;
        };
        const loaded = browser2.cdp.waitFor('Page.loadEventFired', sid);
        await send('Page.navigate', { url: `http://127.0.0.1:${server.port}/` });
        await loaded;
        let tr = null, fr = null, states = [];
        const deadline = Date.now() + 8000;
        while (Date.now() < deadline) {
          tr = await ev(`document.querySelector('[data-transport]').getAttribute('data-transport')`);
          if (tr === 'sse') break;
          await new Promise(r => setTimeout(r, 300));
        }
        fr = await ev(`document.querySelector('[data-transport]').getAttribute('data-freshness')`);
        states = JSON.parse(await ev(
          `JSON.stringify([].slice.call(document.querySelectorAll('[data-panel]')).map(function(e){return e.getAttribute('data-state')}))`));

        await test('FR-10(回帰): 既定でないポートで配信しても transport=sse になる', () => {
          assert.strictEqual(tr, 'sse',
            `port=${server.port} で開いたのに transport=${tr} — 画面が自分の配信元を見ず、既定 7317 へ繋ぎに行っている`);
          assert.strictEqual(fr, 'live', `鮮度が ${fr}`);
          assert.ok(states.includes('ready'), `全パネルが ${[...new Set(states)].join(',')} のまま — 断面が届いていない`);
          console.log(`      実測: port=${server.port} transport=${tr} freshness=${fr} states=${[...new Set(states)].join(',')}`);
        });
      }
    } finally {
      if (browser2) { try { await browser2.close(); } catch { /* 同上 */ } }
      if (server) server.close();
    }
  }

  const rep = H.report();
  if (require.main === module) process.exit(rep.fail === 0 ? 0 : 1);
  return rep;
}

module.exports = main();
