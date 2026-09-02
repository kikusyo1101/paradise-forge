'use strict';
/**
 * _pulse-fixture.js — 新設テストの共有部品
 *
 * **サーバを 1 回だけ起動して共有する。** sse / fallback / perf が各々サーバを
 * 起動すると listen + 初回 require を 3 回払う。1 プロセスで 1 回だけ起動して
 * port を配れば、その代金は 1 回で済む (design.md §6.2 — 合計 60 秒に収める手)。
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');

let shared = null;

/** 常駐サーバを 1 つだけ起こす。2 度目以降は同じものを返す */
async function server() {
  if (shared) return shared;
  const pulse = require(path.join(ROOT, 'graph', 'pulse.js'));
  shared = await pulse.serve({ port: 0, quiet: true });
  return shared;
}
function stop() { if (shared) { shared.close(); shared = null; } }

/** 小さな assert 群。フレームワークを持ち込まない (外部依存ゼロ) */
function makeHarness(label) {
  let pass = 0, fail = 0;
  const failures = [];
  function test(name, fn) {
    try {
      const r = fn();
      if (r && typeof r.then === 'function') return r.then(() => { console.log('  \u2713 ' + name); pass++; },
        (e) => { console.log('  \u2717 ' + name + '\n      ' + e.message); fail++; failures.push(name); });
      console.log('  \u2713 ' + name); pass++;
    } catch (e) {
      console.log('  \u2717 ' + name + '\n      ' + e.message); fail++; failures.push(name);
    }
  }
  function report() {
    console.log(`${label}: ${pass} passed, ${fail} failed`);
    return { pass, fail, failures };
  }
  return { test, report, counts: () => ({ pass, fail }) };
}

/** http GET を約束で包む。子プロセスは産まない */
function get(port, pathname, opts = {}) {
  const http = require('http');
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: pathname, headers: opts.headers || {} }, (res) => {
      let body = '';
      const chunks = [];
      res.on('data', (d) => { body += d; chunks.push({ at: Date.now(), len: d.length }); });
      if (opts.stream) {
        // SSE は終わらない。呼び手が閉じる
        resolve({ res, req, body: () => body, chunks, close: () => req.destroy() });
        return;
      }
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body, chunks }));
    });
    req.on('error', reject);
    if (opts.timeoutMs) req.setTimeout(opts.timeoutMs, () => { req.destroy(new Error('timeout')); });
  });
}

module.exports = { ROOT, server, stop, makeHarness, get };
