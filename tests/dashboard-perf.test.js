#!/usr/bin/env node
'use strict';
/**
 * dashboard-perf.test.js — G-07 + G-10: **同期経路が遅くならない / engine が子プロセス化しない**
 * 担う AC: AC-N01b/N01c/N01d, AC-N07a/N07c, AC-01i, AC-01c, AC-06a, AC-15c, AC-14g
 *
 * **計測は node の process.hrtime.bigint() で行う** —— `/usr/bin/time` は本機に存在しない(則4)。
 * 子プロセスを産む設計は node 起動代 27ms 以上を毎回払うため、50ms の閾を安定して満たせない。
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { ROOT, makeHarness, get, siblingPresent } = require('./_pulse-fixture.js');

const H = makeHarness('dashboard-perf');
const { test } = H;
const pulse = require(path.join(ROOT, 'graph', 'pulse.js'));
const pulseSrc = fs.readFileSync(path.join(ROOT, 'graph', 'pulse.js'), 'utf8');
const ms = (t0) => Number(process.hrtime.bigint() - t0) / 1e6;

async function main() {
  console.log('速度と常駐 (NFR-01 / NFR-07):');

  await test('AC-N01b: 断面生成の median が 1000ms 未満(3 回計測)', () => {
    const times = [];
    for (let i = 0; i < 3; i++) { const t0 = process.hrtime.bigint(); pulse.snapshot(); times.push(ms(t0)); }
    times.sort((a, b) => a - b);
    const median = times[1];
    assert.ok(median < 1000, `median ${median.toFixed(1)}ms — 1000ms 未満でなければ画面が固まる`);
    console.log(`      実測: [${times.map(t => t.toFixed(1)).join(', ')}] ms  median=${median.toFixed(1)}ms`);
  });

  await test('AC-N01c/G-07: pulse が呼ぶ engine 集合に census / paradise.test が含まれない', () => {
    // 何を require しているかを **実際のソースから** 集める。宣言ではなく実物を見る
    const reqs = [...pulseSrc.matchAll(/require\('\.\/([a-z-]+)\.js'\)/g)].map(m => m[1]);
    assert.ok(reqs.length >= 10, `engine の require が ${reqs.length} 本 — 常駐していない`);
    assert.ok(!reqs.includes('census'), 'census を require している — 実測 120,072ms が同期経路に入る');
    assert.ok(!/paradise\.test/.test(pulseSrc), '自己診断を呼んでいる — 単体 282 秒');
    console.log(`      呼ぶ engine (${reqs.length}): ${reqs.join(', ')}`);
  });

  await test('AC-N07a/G-10: 走るコードに子プロセスの語が 1 件も無い', () => {
    const code = pulseSrc.split('\n').filter(l => {
      const t = l.trim();
      return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*'));
    }).join('\n');
    const hits = code.match(/child_process|execFileSync|spawnSync|execSync|\.fork\(/g) || [];
    assert.deepStrictEqual(hits, [], `子プロセスの語 ${hits.length} 件 — 137 倍遅い設計になる`);
  });

  await test('AC-N07c: engine が module として読まれている(常駐の証拠)', () => {
    const n = (pulseSrc.match(/require\('\.\/(clergy|forge|workspace|kg)/g) || []).length;
    assert.ok(n >= 2, `engine の require が ${n} 件`);
  });

  await test('AC-15c: gates 5 門の合計時間が 1000ms 未満', () => {
    const snap = pulse.snapshot();
    const total = snap.gates.reduce((a, g) => a + g.ms, 0);
    assert.ok(total < 1000, `門の合計 ${total.toFixed(1)}ms`);
    console.log(`      実測: ${snap.gates.map(g => `${g.name}=${g.ms.toFixed(1)}`).join(' ')}  計 ${total.toFixed(1)}ms`);
  });

  await test('AC-15a/15b: 5 門すべてが断面に在り、合否が engine の直呼びと一致する', () => {
    const snap = pulse.snapshot();
    assert.strictEqual(snap.gates.map(g => g.name).sort().join(','), 'check-agents,derived,vendor,wiring,workspace');
    const wiring = require(path.join(ROOT, 'graph', 'wiring.js'));
    const vendor = require(path.join(ROOT, 'graph', 'vendor.js'));
    const derived = require(path.join(ROOT, 'graph', 'derived.js'));
    const checkAgents = require(path.join(ROOT, 'graph', 'check-agents.js'));
    const workspace = require(path.join(ROOT, 'graph', 'workspace.js'));
    const live = {
      wiring: wiring.check().ok,
      vendor: vendor.verify().ok,                    // ← check ではない (罠 T-7)
      derived: derived.check().ok,
      'check-agents': checkAgents.check().ok,
      workspace: workspace.hardcodedRefs().length === 0 && workspace.strayCreations().length === 0,
    };
    for (const g of snap.gates) assert.strictEqual(g.ok, !!live[g.name], `門 ${g.name} の合否が割れた`);
  });

  await test('AC-14g: conclave 全件の直読みが 10ms 未満', () => {
    const workspace = require(path.join(ROOT, 'graph', 'workspace.js'));
    const root = workspace.resolve().root;
    // 倉は別リポジトリ (第30条)。CI の checkout に倉は無い。
    // 速さの主張は**読むものが在るときだけ**立つ (則3)。
    // 倉が無いなら listRuns が黙って空を返さないこと(不在と空を分けること)を測る
    if (!siblingPresent()) {
      assert.throws(() => pulse.listRuns(root),
        '不在の倉に対して listRuns が空配列を返した — 不在と空は別物である');
      console.log('      (兄弟倉 不在 — 不在時の契約を測る)');
      return;
    }
    const runs = pulse.listRuns(root);
    const t0 = process.hrtime.bigint();
    for (const r of runs) JSON.parse(fs.readFileSync(r.path, 'utf8'));
    const took = ms(t0);
    assert.ok(took < 10, `${runs.length} 件の直読みに ${took.toFixed(2)}ms`);
    console.log(`      実測: ${runs.length} 件 ${took.toFixed(2)}ms`);
  });

  await test('AC-01i/AC-N01d: 常駐サーバの 2 回目以降が 50ms 未満(5 回連続)', async () => {
    const s = await pulse.serve({ port: 0, quiet: true });
    const times = [];
    for (let i = 0; i < 5; i++) {
      const t0 = process.hrtime.bigint();
      const r = await get(s.port, '/snapshot.json');
      times.push(ms(t0));
      assert.strictEqual(r.status, 200);
    }
    s.close();
    const warm = times.slice(1);
    console.log(`      実測: [${times.map(t => t.toFixed(1)).join(', ')}] ms  warm max=${Math.max(...warm).toFixed(1)}ms`);
    for (const t of warm) {
      assert.ok(t < 50, `2 回目以降に ${t.toFixed(1)}ms — 子プロセスを産んでいれば node 起動代 27ms を毎回払う`);
    }
  });

  await test('gates の mtime キャッシュが効く(2 回目は gatesCached:true)', () => {
    pulse.snapshot();                                  // 1 回目で鍵を作る
    const s2 = pulse.snapshot();
    assert.strictEqual(s2.gatesCached, true, 'キャッシュが効かない — 断面が 50ms の閾を跨ぐ');
    // キャッシュを持つなら、その事実を画面が語らねばならない
    const html = fs.readFileSync(path.join(ROOT, 'dashboard', 'index.html'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'dashboard', 'paradise.js'), 'utf8');
    assert.ok(/gatesCached/.test(js), '画面がキャッシュの事実を語らない — 古い合否を「いま測った」として出す');
    assert.ok(/gates\[i\]\.at|g\.at/.test(js), '門ごとの測定時刻を出していない');
  });

  const rep = H.report();
  if (require.main === module) process.exit(rep.fail === 0 ? 0 : 1);
  return rep;
}

module.exports = main();
