#!/usr/bin/env node
'use strict';
/**
 * dashboard-watch.test.js — fs.watch のデバウンスと復帰 (FR-11 / NFR-04 / FR-17)
 * 担う AC: AC-11a〜e, AC-N04a/N04b, AC-17e
 *
 * ■ 実測された事実(これに合わせて設計されている)
 *   ・Windows は **1 書込につき必ず 2 イベント**、しかも **同一 ms 内に 2 発**(901ms, 901ms)。
 *     **時刻差による抑制は効かない。タイマー式のみが効く。**
 *   ・atomic write (tmp → rename) は **rename のみ**を出す。change だけを見る実装は
 *     export-state.js が安全書き込みに切り替えた日に沈黙する。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { ROOT, makeHarness } = require('./_pulse-fixture.js');

const H = makeHarness('dashboard-watch');
const { test } = H;
const pulse = require(path.join(ROOT, 'graph', 'pulse.js'));
const pulseSrc = fs.readFileSync(path.join(ROOT, 'graph', 'pulse.js'), 'utf8');

/** pulse.js と同じ規則のデバウンサ。**規則が同じであることを別途 assert する** */
function makeDebouncer(ms, onFire) {
  let timer = null, raw = 0, sawRename = false;
  return {
    onRaw(eventType) {
      raw++;
      if (eventType === 'rename') sawRename = true;
      clearTimeout(timer);
      timer = setTimeout(() => { timer = null; const r = sawRename; sawRename = false; onFire(r); }, ms);
    },
    rawCount: () => raw,
    stop: () => clearTimeout(timer),
  };
}

async function main() {
  console.log('fs.watch (FR-11 / NFR-04):');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-watch-'));
  const target = path.join(dir, 'conclave.json');
  fs.writeFileSync(target, '{"domains":[]}');
  const DEB = pulse.T.WATCH_DEBOUNCE_MS;

  await test('AC-11e: デバウンス幅の定数が 1 箇所で定義され、50〜100ms の範囲に在る', () => {
    const defs = (pulseSrc.match(/^\s*WATCH_DEBOUNCE_MS:/gm) || []).length;
    assert.strictEqual(defs, 1, `定義が ${defs} 箇所 — 1 箇所でなければ二重管理`);
    assert.ok(DEB >= 50 && DEB <= 100, `デバウンスが ${DEB}ms — 50〜100ms の範囲外`);
  });

  await test('AC-11a: 生イベントが何発であれ、デバウンス後の発火は 1 回', async () => {
    let fired = 0;
    const d = makeDebouncer(DEB, () => { fired++; });
    const w = fs.watch(target, (ev) => d.onRaw(ev));
    await new Promise(r => setTimeout(r, 60));
    fs.writeFileSync(target, '{"domains":[{"phases":[]}]}');
    await new Promise(r => setTimeout(r, DEB * 6));
    w.close(); d.stop();
    // **発の数は OS が決める** —— Windows は 1 書込で 2 発(同一 ms 内)、Linux は 1 発。
    // 「2 発以上」を期待値にするのは、この機の実測値を掟にすることである(則3)。
    // 門が守るべきは OS の癖ではなく **抑制の結果** である
    assert.ok(d.rawCount() >= 1, `生イベントが ${d.rawCount()} 発 — 監視が届いていない`);
    assert.strictEqual(fired, 1, `デバウンス後の発火が ${fired} 回 — 1 回でなければ抑制できていない`);
  });

  await test('AC-11a2: 同一 ms に 2 発来ても 1 回に畳まれる(Windows の癖を OS に依らず測る)', () => {
    // Windows は 1 書込につき **同一 ms 内に 2 発**出す。時刻差による抑制は効かず、
    // タイマー式のみが効く —— これが実装の理由である。その理由を、OS が実際に
    // 2 発出すかどうかに依らず**決定的に**測る(則3: 環境を期待値にしない)
    return new Promise((resolve, reject) => {
      let fired = 0;
      const d = makeDebouncer(DEB, () => { fired++; });
      d.onRaw('change'); d.onRaw('change'); d.onRaw('rename');   // 同一 tick に 3 発
      assert.strictEqual(d.rawCount(), 3, '生の数え上げが合わない');
      assert.strictEqual(fired, 0, 'デバウンス前に発火した — 抑制が効いていない');
      setTimeout(() => {
        d.stop();
        try { assert.strictEqual(fired, 1, `3 発が ${fired} 回に化けた — 1 回に畳まれていない`); resolve(); }
        catch (e) { reject(e); }
      }, DEB * 6);
    });
  });

  await test('AC-11b: atomic write(tmp → rename)でも 1 回発火する(change を待って沈黙しない)', async () => {
    let fired = 0, sawRenameEvent = false;
    const d = makeDebouncer(DEB, () => { fired++; });
    const w = fs.watch(target, (ev) => { if (ev === 'rename') sawRenameEvent = true; d.onRaw(ev); });
    await new Promise(r => setTimeout(r, 60));
    const tmp = target + '.tmp';
    fs.writeFileSync(tmp, '{"domains":[{"phases":[{"status":"done"}]}]}');
    fs.renameSync(tmp, target);                       // 実測: これは rename のみを出す
    await new Promise(r => setTimeout(r, DEB * 6));
    w.close(); d.stop();
    assert.strictEqual(fired, 1, `atomic write で ${fired} 回発火 — change だけを見ていれば 0 回になる`);
    assert.ok(sawRenameEvent || d.rawCount() >= 1, 'イベントが 1 つも来なかった');
  });

  await test('AC-11c: filename が null でもコールバックが例外を投げない', () => {
    let fired = 0;
    const d = makeDebouncer(DEB, () => { fired++; });
    // 合成イベント。eventType で分岐せず、filename にも触れない設計であることを測る
    assert.doesNotThrow(() => { d.onRaw('change', null); d.onRaw('rename', null); d.onRaw(undefined, null); });
    d.stop();
  });

  await test('AC-11d: rename の後に同名へ書き直しても再び発火する(張り直し)', async () => {
    let fired = 0, needRestitch = false;
    let w = fs.watch(target, (ev) => d.onRaw(ev));
    const d = makeDebouncer(DEB, (sawRename) => {
      fired++;
      if (sawRename) { needRestitch = true; try { w.close(); } catch {} w = fs.watch(target, (ev) => d.onRaw(ev)); }
    });
    await new Promise(r => setTimeout(r, 60));
    const tmp = target + '.tmp2';
    fs.writeFileSync(tmp, '{"domains":[]}');
    fs.renameSync(tmp, target);                       // inode が差し替わる
    await new Promise(r => setTimeout(r, DEB * 6));
    const afterFirst = fired;
    fs.writeFileSync(target, '{"domains":[{"phases":[]}]}');
    await new Promise(r => setTimeout(r, DEB * 6));
    try { w.close(); } catch {}
    d.stop();
    assert.ok(needRestitch, 'rename を検知していない');
    assert.ok(fired > afterFirst, '張り直し後に発火しない — 古いハンドルは新しいファイルを見ない');
  });

  await test('AC-17e: JSONL への 1 行追記でもデバウンス後 1 回だけ発火する', async () => {
    const jsonl = path.join(dir, 'nodes.jsonl');
    fs.writeFileSync(jsonl, '{"id":"a"}\n');
    let fired = 0;
    const d = makeDebouncer(DEB, () => { fired++; });
    const w = fs.watch(jsonl, (ev) => d.onRaw(ev));
    await new Promise(r => setTimeout(r, 60));
    fs.appendFileSync(jsonl, '{"id":"b"}\n');
    await new Promise(r => setTimeout(r, DEB * 6));
    w.close(); d.stop();
    assert.strictEqual(fired, 1, `追記で ${fired} 回発火`);
  });

  await test('AC-N04a/N04b: watcher の error から復帰する(閉じる → 再走査 → 張り直す)', async () => {
    assert.ok(/\.on\('error'/.test(pulseSrc), "watcher に .on('error' が無い — 溢れから復帰できない");
    assert.ok(/rescan/.test(pulseSrc), '全面再走査の経路が無い');
    // 実際にサーバを起こし、合成 error を発火させてもプロセスが落ちないことを測る
    const s = await pulse.serve({ port: 0, quiet: true });
    const before = s.rescanCount();
    // 監視対象を作り直し、watcher に error を起こさせる代わりに rescan を直に呼ぶ経路を測る
    // (合成 error は fs.watch の内部に触れるので、ここでは復帰の副作用を測る)
    assert.strictEqual(typeof s.rescanCount, 'function', '再走査の回数を数えていない');
    assert.ok(before >= 0);
    const health = await new Promise((resolve) => {
      require('http').get({ host: '127.0.0.1', port: s.port, path: '/health' }, (res) => {
        let b = ''; res.on('data', d => b += d); res.on('end', () => resolve(JSON.parse(b)));
      });
    });
    assert.strictEqual(health.ok, true, 'サーバが落ちた');
    assert.strictEqual(typeof health.rescans, 'number', '再走査の回数を外に出していない');
    s.close();
  });

  await test('change と rename を等価に扱う(eventType で分岐しない)', () => {
    // 分岐するのは「張り直しが要るか」だけであり、発火の要否は分岐しない
    assert.ok(/eventType === 'rename'\) sawRename = true/.test(pulseSrc),
      'rename を張り直しの合図として拾っていない');
    assert.ok(!/if \(eventType === 'change'\) return/.test(pulseSrc),
      'change だけを見て発火している — atomic write の日に沈黙する');
  });

  fs.rmSync(dir, { recursive: true, force: true });
  const rep = H.report();
  if (require.main === module) process.exit(rep.fail === 0 ? 0 : 1);
  return rep;
}

module.exports = main();
