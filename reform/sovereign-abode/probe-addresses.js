#!/usr/bin/env node
'use strict';
/**
 * probe-addresses.js — 16 箇所が解決する住所を、engine の**実際の値**で印字する
 *
 * work-1(付け替え)は**無色透明**でなければならない。既定が `global` である以上、
 * 付け替えの前後で全ての住所は同じ値を返すのが正しい。それを散文で主張せず、
 * **機械で証す**ための探査器である(第10条: 宣言は機構ではない)。
 *
 * この探査器は「ソースがどう書かれているか」を一切見ない。engine を実際に
 * require し、**engine が答えた住所そのもの**を拾う。ゆえに付け替えの前
 * (main の HEAD)と後(作業木)の両方で、一行も変えずに走る。
 *
 * 輸出されていない定数(pulse.claudeDir / vendor.settingsPath /
 * wire-paradise-hooks.SETTINGS / ordain の home / export-state の kgRoot)は
 * **fs を見張って実測する** —— 「こう書いてあるから多分こう」ではなく、
 * engine が実際に触った道を採る(第54条(a): 資格は名乗りではなく住所が決める)。
 *
 * ⚠️ **1 バイトも書かない。** 書き込み経路を持つ道具(wire-paradise-hooks.wire)は、
 *    見張りが読み取りの瞬間に投げるので、書く行まで到達しない。
 *
 *   node reform/sovereign-abode/probe-addresses.js          # 人が読む形
 *   node reform/sovereign-abode/probe-addresses.js --json   # 機械が読む形
 *
 * 条件(env)は呼び手が立てる。束ねて前後を比べるのは compare-addresses.js。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const G = (f) => path.join(ROOT, 'graph', f);
const T = (...p) => path.join(ROOT, 'tools', ...p);

const out = {};
const errs = {};

/** 一つの測定。落ちても他の測定を巻き込まない —— 測れなかったことは値ではない(第37条)。 */
function site(name, fn) {
  try {
    const v = fn();
    out[name] = v === undefined ? '(undefined)' : String(v);
  } catch (e) {
    out[name] = null;
    errs[name] = e.message;
  }
}

/**
 * fs の口を見張って、engine が実際に触った道を拾う。
 * @param {string[]} methods 見張る口
 * @param {(p:string)=>boolean} want 拾う条件
 * @param {(record:(p:string)=>void)=>void} run  走らせる本体
 * @param {{throwOnHit?:boolean}} [o] 真なら最初の一致で投げる(書き込みへ進ませない)
 */
function spy(methods, want, run, o = {}) {
  const hits = [];
  const saved = {};
  for (const m of methods) {
    saved[m] = fs[m];
    fs[m] = function (p, ...rest) {
      const s = typeof p === 'string' ? p : String(p);
      if (want(s)) {
        hits.push(s);
        if (o.throwOnHit) throw new Error('probe: 見張りが読み取りを止めた (書き込みへ進ませないため)');
      }
      return saved[m].call(fs, p, ...rest);
    };
  }
  try { run(); } catch { /* 見張りが止めた / engine が住処不在で落ちた — 道は既に採れている */ }
  finally { for (const m of methods) fs[m] = saved[m]; }
  return hits;
}

const endsWith = (suffix) => (p) => p.replace(/\\/g, '/').toLowerCase().endsWith(suffix);

// ── 1. graph/apply-guards.js:70 — SETTINGS ────────────────────────────
site('apply-guards.SETTINGS', () => require(G('apply-guards.js')).SETTINGS);

// ── 2. graph/apply-models.js:20 — AGENT_DIR ───────────────────────────
site('apply-models.AGENT_DIR', () => require(G('apply-models.js')).AGENT_DIR);

// ── 3. graph/apply-seat.js:31 — SETTINGS ──────────────────────────────
site('apply-seat.SETTINGS', () => require(G('apply-seat.js')).SETTINGS);

// ── 4. graph/apply-spawn.js:34 — AGENTS_DIR() ─────────────────────────
//    輸出されていないので resolveAll() が返す道から逆算する(実際に使われる値)。
site('apply-spawn.AGENTS_DIR', () => {
  const rows = require(G('apply-spawn.js')).resolveAll();
  if (!rows.length) throw new Error('resolveAll が空 — 起動の権能を持つ者が居ない');
  return path.dirname(rows[0].path);
});

// ── 5. graph/check-agents.js:205 — check() の既定 dir ─────────────────
site('check-agents.check.dir', () => require(G('check-agents.js')).check().dir);

// ── 6. graph/check-agents.js:106 — hierarchyIntegrity() の既定 dir ────
//    dir を返さないので、readdirSync を見張って実測する。
site('check-agents.hierarchy.dir', () => {
  const ca = require(G('check-agents.js'));
  const hits = spy(['readdirSync'], endsWith('/agents'), () => ca.hierarchyIntegrity());
  if (!hits.length) throw new Error('hierarchyIntegrity が agents を一度も読まなかった');
  return hits[0];
});

// ── 7. graph/daily-guard.js:36 — LEDGER ───────────────────────────────
site('daily-guard.LEDGER', () => require(G('daily-guard.js')).LEDGER);

// ── 8. graph/export-state.js:23 — kgRoot ──────────────────────────────
site('export-state.kgRoot', () => {
  const es = require(G('export-state.js'));
  const hits = spy(['readFileSync'], endsWith('edges.jsonl'), () => es.readGraph());
  if (!hits.length) throw new Error('readGraph が edges.jsonl を一度も読まなかった');
  return path.dirname(hits[0]);
});

// ── 9. graph/kg.js:31 — ROOT ──────────────────────────────────────────
site('kg.ROOT', () => require(G('kg.js')).stats().root);

// ── 10. graph/ordain.js:74 — 名前衝突検査が読むグローバルの agents ────
site('ordain.globalAgents', () => {
  const or = require(G('ordain.js'));
  const hits = spy(['readdirSync'], endsWith('/agents'), () => or.existingNames());
  // overlay/agents も同じ suffix を持つので、倉の外(あるいは .claude 配下)を採る
  const outside = hits.filter(h => !h.replace(/\\/g, '/').startsWith(ROOT.replace(/\\/g, '/') + '/overlay'));
  if (!outside.length) throw new Error(`グローバルの agents を読まなかった: ${JSON.stringify(hits)}`);
  return outside[0];
});

// ── 11. graph/pulse.js:320 — claudeDir() ──────────────────────────────
//    5 箇所(agents/commands/skills/kg/SSE)が全てここを通る。
//    snapshot() を走らせ、commands を読んだ道の親を claudeDir の基とする。
site('pulse.claudeDir', () => {
  const pulse = require(G('pulse.js'));
  const hits = spy(['readdirSync'], endsWith('/commands'), () => pulse.snapshot());
  if (!hits.length) throw new Error('snapshot が commands を一度も読まなかった');
  return path.dirname(hits[0]);
});
site('pulse.claudeDir(agents)', () => {
  const pulse = require(G('pulse.js'));
  const hits = spy(['readdirSync'], endsWith('/agents'), () => pulse.snapshot());
  if (!hits.length) throw new Error('snapshot が agents を一度も読まなかった');
  return hits[0];
});

// ── 12. graph/upstream.js:33/39 — claudeHome(cfg) ─────────────────────
site('upstream.claudeHome', () => {
  const up = require(G('upstream.js'));
  return up.claudeHome(up.cfg());
});
//    expand() は上流の `~/Documents/...` を展開する正当な用途を持つ。据え置きの証拠。
site('upstream.upstreamPath', () => {
  const up = require(G('upstream.js'));
  return up.upstreamPath(up.cfg());
});

// ── 13. graph/vendor.js:48-50 — settingsPath() ────────────────────────
site('vendor.settingsPath', () => {
  const ve = require(G('vendor.js'));
  const hits = spy(['existsSync', 'readFileSync'], endsWith('settings.json'), () => ve.verify());
  if (!hits.length) throw new Error('vendor が settings.json を一度も触らなかった');
  return hits[0];
});

// ── 14. tools/wire-paradise-hooks.js:17 — SETTINGS ────────────────────
//    wire() は書く道具である。見張りが**読み取りの瞬間に投げる**ので書く行へ届かない。
site('wire-paradise-hooks.SETTINGS', () => {
  const wh = require(T('wire-paradise-hooks.js'));
  const hits = spy(['readFileSync'], endsWith('settings.json'), () => wh.wire(), { throwOnHit: true });
  if (!hits.length) throw new Error('wire が settings.json を一度も読まなかった');
  return hits[0];
});

// ── 15. tools/hooks/paradise-session-start.js:28 — 最後の手段の行 ─────
//    素の paradiseRoot() は自己位置で解決して 28 行目へ届かない。ゆえに
//    「自己位置の解決が失敗した世界」を作って、最後の手段の行を実際に撃つ。
site('session-start.paradiseRoot', () => require(T('hooks', 'paradise-session-start.js')).paradiseRoot());
site('session-start.lastResort', () => {
  const ss = require(T('hooks', 'paradise-session-start.js'));
  const savedEnv = process.env.PARADISE_ROOT;
  delete process.env.PARADISE_ROOT;
  const saved = fs.existsSync;
  fs.existsSync = function (p) {
    if (String(p).replace(/\\/g, '/').endsWith('/graph/kg.js')) return false;   // 自己位置の解決を失敗させる
    return saved.call(fs, p);
  };
  try { return ss.paradiseRoot(); }
  finally { fs.existsSync = saved; if (savedEnv !== undefined) process.env.PARADISE_ROOT = savedEnv; }
});

// ── 出力 ──────────────────────────────────────────────────────────────
const payload = {
  env: {
    PARADISE_ABODE: process.env.PARADISE_ABODE || null,
    CLAUDE_HOME: process.env.CLAUDE_HOME || null,
    CLAUDE_SETTINGS: process.env.CLAUDE_SETTINGS || null,
    PARADISE_SETTINGS: process.env.PARADISE_SETTINGS || null,
    PARADISE_AGENTS: process.env.PARADISE_AGENTS || null,
    PARADISE_KG: process.env.PARADISE_KG || null,
    PARADISE_DAILY_LEDGER: process.env.PARADISE_DAILY_LEDGER || null,
  },
  sites: out,
  errors: errs,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  for (const [k, v] of Object.entries(out)) {
    console.log(`  ${k.padEnd(30)} ${v === null ? '(測れず: ' + errs[k] + ')' : v}`);
  }
}
