#!/usr/bin/env node
'use strict';
/**
 * dashboard-sse.test.js — SSE の形式とサーバ (FR-09 / FR-10 / NFR-03)
 * 担う AC: AC-09a〜e, AC-10c/10d/10e, AC-N03a
 *
 * ■ 罠(実測で確かめた掟)
 *   ・終端 "\n\n" を **シェルの grep で数えてはならない** —— grep は行指向であり、
 *     パターン中の改行は空パターンに退化して全行にマッチする。壊れていても永久に緑になる。
 *   ・`..` 脱出の 403 は **生ソケットで検査する** —— http.get は URL パーサが
 *     パスを正規化するので `..` がサーバに届かず 404 が返り、「塞げている」と誤認する。
 *   ・keepalive を実時間 20 秒待たない —— PULSE_KEEPALIVE_MS で周期そのものを短くし、
 *     検査するのは「周期的にコメント行が出る」という**性質**である。
 */
const net = require('net');
const http = require('http');
const path = require('path');
const assert = require('assert');
const { makeHarness, get } = require('./_pulse-fixture.js');

const H = makeHarness('dashboard-sse');
const { test } = H;
const ROOT = path.join(__dirname, '..');

async function main() {
  console.log('SSE とサーバ (FR-09/10):');
  // keepalive を短くして起こす。値ではなく「周期的に出る」性質を測る
  process.env.PULSE_KEEPALIVE_MS = '200';
  const pulse = require(path.join(ROOT, 'graph', 'pulse.js'));
  const s = await pulse.serve({ port: 0, quiet: true });
  const port = s.port;

  await test('AC-10c/10e: 127.0.0.1 で listen し、番号を告げる', () => {
    const addr = s.server.address();
    assert.strictEqual(addr.address, '127.0.0.1', `0.0.0.0 で listen している: ${addr.address}`);
    assert.ok(Number.isInteger(port) && port > 0, 'ポートが取れない');
  });

  await test('AC-10c: /snapshot.json が 200 を返し JSON.parse できる', async () => {
    const r = await get(port, '/snapshot.json');
    assert.strictEqual(r.status, 200);
    const o = JSON.parse(r.body);
    assert.ok(o.counts && o.gates, '断面の形をしていない');
  });

  await test('AC-09a: SSE の必須ヘッダが揃い、content-length を書かない', async () => {
    const c = await get(port, '/events', { stream: true });
    await new Promise(r => setTimeout(r, 250));
    const h = c.res.headers;
    assert.strictEqual(h['content-type'], 'text/event-stream');
    assert.strictEqual(h['cache-control'], 'no-cache');
    assert.strictEqual(h['connection'], 'keep-alive');
    assert.ok(!('content-length' in h), 'content-length が在る — chunked と衝突する');
    c.close();
  });

  await test('AC-09b: 先頭に retry: <ms> が現れる', async () => {
    const c = await get(port, '/events', { stream: true });
    await new Promise(r => setTimeout(r, 250));
    const head = c.body().slice(0, 512);
    const lines = head.split('\n').filter(l => /^retry: [0-9]+$/.test(l));
    assert.strictEqual(lines.length, 1, `retry: 行が ${lines.length} 本`);
    c.close();
  });

  await test('AC-09c: 逐次配信 — 最初のチャンクが 1000ms 以内、以降の到着時刻が異なる', async () => {
    const t0 = Date.now();
    const c = await get(port, '/events', { stream: true });
    await new Promise(r => setTimeout(r, 900));
    assert.ok(c.chunks.length >= 2, `チャンクが ${c.chunks.length} 個 — バッファされている疑い`);
    assert.ok(c.chunks[0].at - t0 < 1000, '最初のチャンクが 1 秒以内に届かない');
    const times = new Set(c.chunks.map(x => x.at));
    assert.ok(times.size >= 2, '全チャンクが同時刻 — 逐次配信されていない');
    c.close();
  });

  await test('AC-09d: 終端規則 — 全ブロックが空行終端(node で数える。grep で数えない)', async () => {
    const c = await get(port, '/events', { stream: true });
    await new Promise(r => setTimeout(r, 700));
    const raw = c.body();
    c.close();
    const terminators = raw.split('\n\n').length - 1;
    assert.ok(terminators >= 1, `終端 "\\n\\n" が ${terminators} 個`);
    assert.ok(/\n\n$/.test(raw), '最後のブロックが空行で終わっていない');
    const blocks = raw.split('\n\n').slice(0, -1);
    for (const b of blocks) {
      assert.ok(/(^|\n)(data|event|id|retry|:)/.test(b), `SSE の形をしないブロックが在る: ${JSON.stringify(b.slice(0, 60))}`);
    }
  });

  await test('AC-09e: keepalive のコメント行が周期的に出る(実時間 20 秒を待たない)', async () => {
    const c = await get(port, '/events', { stream: true });
    await new Promise(r => setTimeout(r, 900));   // 200ms 周期なら 4 本前後
    const pings = (c.body().match(/^: ping$/gm) || []).length;
    c.close();
    assert.ok(pings >= 1, `: ping が ${pings} 本 — 周期的に出ていない`);
  });

  await test('AC-N03a: サーバが SSE 接続数を数え、/snapshot.json に出す', async () => {
    const conns = [];
    for (let i = 0; i < 7; i++) conns.push(await get(port, '/events', { stream: true }));
    await new Promise(r => setTimeout(r, 400));
    const snap = JSON.parse((await get(port, '/snapshot.json')).body);
    const health = JSON.parse((await get(port, '/health')).body);
    for (const c of conns) c.close();
    assert.strictEqual(snap.connections, 7, `断面の connections が ${snap.connections} — 実際に張った 7 と違う`);
    assert.strictEqual(health.connections, 7);
  });

  await test('切断の後始末 — 閉じた購読者は数から消える', async () => {
    const c = await get(port, '/events', { stream: true });
    await new Promise(r => setTimeout(r, 300));
    const before = JSON.parse((await get(port, '/snapshot.json')).body).connections;
    c.close();
    await new Promise(r => setTimeout(r, 400));
    const after = JSON.parse((await get(port, '/snapshot.json')).body).connections;
    assert.strictEqual(after, before - 1, `後始末が効いていない(${before} → ${after})— 己の残骸を作る`);
  });

  await test('罠7: `..` 脱出は生ソケットで検査する(http.get では届かない)', async () => {
    const status = await new Promise((resolve, reject) => {
      const sock = net.connect(port, '127.0.0.1', () => {
        sock.write('GET /../../graph/pulse.js HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n');
      });
      let buf = '';
      sock.on('data', d => { buf += d; });
      sock.on('end', () => resolve(Number((buf.match(/^HTTP\/1\.1 (\d+)/) || [])[1])));
      sock.on('error', reject);
    });
    assert.ok(status === 403 || status === 404, `脱出が ${status} で通った`);
    assert.strictEqual(status, 403, `403 で拒むべきところ ${status} — 正規化が効いているかを生で確かめた`);
  });

  await test('AC-10d: 二重起動耐性 — 同じ既定ポートでもう 1 つ起こしても両方が生きる', async () => {
    const busy = http.createServer((_, res) => res.end('x'));
    await new Promise(r => busy.listen(0, '127.0.0.1', r));
    const taken = busy.address().port;
    const s2 = await pulse.serve({ port: taken, quiet: true });
    assert.notStrictEqual(s2.port, taken, 'EADDRINUSE を捕らえずに同じ番号を名乗った');
    const r2 = await get(s2.port, '/health');
    assert.strictEqual(r2.status, 200, '2 つ目が応答しない');
    assert.strictEqual(busy.listening, true, '1 つ目が死んだ');
    s2.close();
    busy.close();
  });

  await test('404 は JSON で返る / CORS ヘッダが全応答に付く', async () => {
    const r = await get(port, '/no-such-page');
    assert.strictEqual(r.status, 404);
    JSON.parse(r.body);
    assert.strictEqual(r.headers['access-control-allow-origin'], '*',
      'file:// の origin は null。CORS が無いと第2層の fetch が死ぬ');
  });

  s.close();
  const rep = H.report();
  if (require.main === module) process.exit(rep.fail === 0 ? 0 : 1);
  return rep;
}

module.exports = main();
