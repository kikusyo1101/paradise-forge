#!/usr/bin/env node
'use strict';
/**
 * abandoned-run.test.js — 第53条の門: **環は閉じるまで走行である**
 *
 * ── なぜこの門が要るか (実測された二つの欠陥) ────────────────────────
 *
 * **欠陥A: 見捨てられた走行を機構が名指ししなかった。**
 * `reform-claude-md-diet` の走行は domains 4/6・相 5/11 のまま放置され、しかし
 * 実装は PR #23 として 2026-08-31 に main へマージ済だった。以後 95 コミット進んだが
 * **環が閉じていないことを何も鳴らさなかった。**
 * `phaseSilence`(第51条 / reflect C-5)は既に在ったが、あれは **相** を見る目である ——
 * `running` の相の `dispatchedAt` を読む。相が `pending` のまま忘れられた走行は
 * `running` を一つも持たないので、あの目には**構造的に一切映らない**。
 * ゆえに `runAbandonment` / `auditRuns` は **走行そのもの**を見る別の目である。
 *
 * **欠陥B: reform の走行帳が創造物の倉に迷い込んでも鳴らなかった。**
 * `reform-claude-md-diet/` は `paradise-creations/`(創造物の兄弟倉)に置かれ、
 * しかも untracked だった。`strayCreations()` は「創造物が楽園に紛れ込む」を見たが、
 * **その逆向き**を見る目が無かった。害はこちらが重い —— 混入は履歴を汚すだけだが、
 * **流出は審査そのものを迂回する**。
 *
 * ── この門の作法 ──────────────────────────────────────────────
 * **健全な系で緑になるだけの門は証明されていない。** ゆえにこのファイルは、
 * 宙吊りの走行帳と迷子の走行帳を**実際に仕込み**、門が名指しで捕らえることを撃つ。
 * 撃った後は必ず片付け、実在の系には触れない(砂場は tmpdir に立てる)。
 *
 * 単独でも走り、`tests/paradise.test.js` からも require で呼ばれる。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');
const { ROOT, makeHarness } = require('./_pulse-fixture.js');

const H = makeHarness('abandoned-run');
const { test } = H;
const CL = path.join(ROOT, 'graph', 'conclave.js');
const WS = path.join(ROOT, 'graph', 'workspace.js');
const conclave = require(CL);
const workspace = require(WS);

console.log('\n第53条 見捨てられた走行の門 (欠陥A/B):');

// --- 砂場の道具 -----------------------------------------------------------
/** 実在の系に一切触れない偽の楽園を建てる。呼び手が cleanup() を呼ぶ。 */
function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'abandoned-run-'));
  const repo = path.join(dir, 'paradise');
  const store = path.join(dir, 'paradise-creations');
  fs.mkdirSync(path.join(repo, 'reform'), { recursive: true });
  fs.mkdirSync(store, { recursive: true });
  return { dir, repo, store, cleanup: () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} } };
}

/**
 * 走行帳を一本組む。`ratified` を domains 総数より小さくすれば未完の環になる。
 * @param {object} o {slug, scale, total, ratified, lastBeat(ISO|null), artifacts[]}
 */
function ledger(o = {}) {
  const total = o.total === undefined ? 6 : o.total;
  const ratified = o.ratified === undefined ? total : o.ratified;
  const domains = [];
  for (let i = 0; i < total; i++) {
    domains.push({
      seq: i, cardinal: 'c' + i, domain: 'D' + i,
      status: i < ratified ? 'ratified' : 'pending', reworks: 0, reviewClass: 'pontiff',
      phases: [{
        id: 'p' + i, agent: 'a', goal: 'g', deps: [], gate: false,
        artifact: 'x.md', status: i < ratified ? 'done' : 'pending', attempts: 0,
        artifactPath: (o.artifacts || [])[i] || null, dispatchedAt: null, resumes: 0,
      }],
    });
  }
  const created = o.created || '2026-08-01T00:00:00.000Z';
  const history = o.lastBeat === null ? [] : [{ ts: o.lastBeat || created, event: 'convene', detail: 'x' }];
  return { meta: { slug: o.slug || 's', scale: o.scale || 'standard' }, created, domains, history };
}

function writeLedger(base, slug, run) {
  const d = path.join(base, slug);
  fs.mkdirSync(d, { recursive: true });
  const p = path.join(d, 'conclave.json');
  fs.writeFileSync(p, JSON.stringify(run, null, 2));
  return p;
}

/**
 * 「いま」から `min` 分だけ遡った刻。
 *
 * ⚠️ **基準の刻を渡せる形にしてある。** かつてここは常に `Date.now()` を読んで
 * いた。門は先に `const at = Date.now()` を採り、その後に `ago(1500)` が**もう一度**
 * `Date.now()` を読む。二度の読みの間に 1ms でも進めば、
 * `idleMs = at - (now₂ - 1500分)` は 1500 分を **わずかに下回る**。
 * ゆえに `assert.ok(dead.idleMs >= 1500分)` が間欠的に破れた —— 実測(別の走者が
 * 本枝の変更を一切含まない main で撃った): **30 万回中 10 回** 再現。
 *
 * 時計を二度読む門は、門ではなく賽である。基準を一度だけ読み、それを配る。
 */
const ago = (min, base) => new Date((base === undefined ? Date.now() : base) - min * 60 * 1000).toISOString();

// ══════════════════════════════════════════════════════════════════════════
// 欠陥A — 見捨てられた走行を名指しする
// ══════════════════════════════════════════════════════════════════════════

test('A-1: 閾値は 1 箇所にだけ住み、他の二つの境と別物である', () => {
  // 三つの数はそれぞれ別の問いを持つ(第36条: 別の問いには別の器)。
  assert.strictEqual(conclave.ABANDONED_MS, 24 * 60 * 60 * 1000, '第53条の境が動いた');
  assert.ok(conclave.ABANDONED_MS > conclave.SILENT_MS, '走行の境が相の境と同じか小さい — 相が鳴るなら走行は鳴らせない');
  assert.ok(conclave.SILENT_MS > conclave.STALE_MS, '既存の二つの境の関係が壊れた');
  // **一箇所にだけ置く。** 二つ書けば必ず食い違う(第41条)。
  const src = fs.readFileSync(CL, 'utf8');
  const decls = (src.match(/^const ABANDONED_MS/gm) || []).length;
  assert.strictEqual(decls, 1, `ABANDONED_MS の宣言が ${decls} 箇所ある — 閾値は 1 箇所にだけ置く`);
  // 判定関数もただ一つ
  assert.strictEqual((src.match(/function runAbandonment/g) || []).length, 1, '判定が二箇所に住んでいる');
  // 人の画面も機械の口も同じ関数を読む
  assert.ok(/const rep = auditRuns\(\)/.test(src), 'CLI が auditRuns を読んでいない — 別集計は必ず食い違う');
});

test('A-2: 閾値は実測に基づく — 閉じた走行の最長間隔を超えている', () => {
  // 実測(この改修時): 閉じた走行 5 本の全事象間隔 173 件で max=110.4分、
  // 1440分を超えた間隔は 0 件。境がそれ以下なら正常な走行が鳴る = 騒音。
  assert.ok(conclave.ABANDONED_MS >= 111 * 60 * 1000,
    `境 (${conclave.ABANDONED_MS / 60000}分) が実測の最長間隔 110.4分 を下回る — 正常な走行が鳴る`);
  // 註釈に実測が残っていること。数だけ在って由来が無ければ、次の者が理由なく動かす。
  const src = fs.readFileSync(CL, 'utf8');
  assert.ok(/110\.4/.test(src) && /173/.test(src), 'ABANDONED_MS の由来(実測)が註釈に無い — 第38条');
});

test('A-3 [故障注入]: 未完のまま無音の走行を名指しする', () => {
  const at = Date.now();
  // 25時間(1500分)無音・domains 4/6 — 実在した reform-claude-md-diet と同じ形
  const dead = conclave.runAbandonment(ledger({ total: 6, ratified: 4, lastBeat: ago(1500, at) }), at);
  assert.strictEqual(dead.state, 'abandoned', '25時間無音の未完走行を見逃した — これが実際に起きた欠陥である');
  assert.strictEqual(dead.abandoned, true);
  assert.strictEqual(dead.ratified, 4);
  assert.strictEqual(dead.total, 6);
  assert.ok(dead.idleMs >= 1500 * 60 * 1000, '無音の長さを名指ししていない');

  // **偽陽性を出さない**: 同じ 4/6 でも 10 分前に動いていれば active
  const alive = conclave.runAbandonment(ledger({ total: 6, ratified: 4, lastBeat: ago(10, at) }), at);
  assert.strictEqual(alive.state, 'active', '10分前に動いた走行を見捨てられたと呼んだ — 偽陽性である');
  assert.strictEqual(alive.abandoned, false);

  // **閉じた環は何日経とうと鳴らない** — 鳴りやまない門は無視される
  const closed = conclave.runAbandonment(ledger({ total: 6, ratified: 6, lastBeat: ago(99999, at) }), at);
  assert.strictEqual(closed.state, 'closed', '閉じた環を鳴らし続けている');
  assert.strictEqual(closed.abandoned, false);
});

test('A-4: 境の直前/直後で振る舞いが変わる(境が実在する)', () => {
  const at = Date.now();
  const m = conclave.ABANDONED_MS / 60000;
  assert.strictEqual(conclave.runAbandonment(ledger({ ratified: 1, lastBeat: ago(m - 1, at) }), at).state, 'active',
    '境の 1 分手前で既に鳴っている');
  assert.strictEqual(conclave.runAbandonment(ledger({ ratified: 1, lastBeat: ago(m + 1, at) }), at).state, 'abandoned',
    '境を 1 分越えても鳴らない — 境が実装されていない');
});

test('A-5 [第16条]: 測れなかった走行はゼロで埋めず null のまま名指しする', () => {
  // 時刻を一つも読めない走行帳。**0 分無音**として active に落とすのが最悪の答え。
  const blind = { meta: {}, created: 'これは日付ではない', domains: ledger({ ratified: 1 }).domains, history: [{ event: 'x' }] };
  const r = conclave.runAbandonment(blind, Date.now());
  assert.strictEqual(r.state, 'unknown', '判定不能な走行を判定した — 測れなかったものを埋めている');
  assert.strictEqual(r.idleMs, null, '測れなかった無音時間が null でない (第16条)');
  assert.strictEqual(r.lastBeat, null);
  assert.strictEqual(r.abandoned, false, '判定不能を「見捨てられた」と断じてはならない — 名指しはするが断罪はしない');
});

test('A-6 [故障注入]: auditRuns が二つの倉を横断して名指しし、CLI が exit 1 で鳴る', () => {
  const s = sandbox();
  try {
    // 健全 2 本 + 宙吊り 1 本(paradise 側) + 宙吊り 1 本(creations 側) + 壊れた帳 1 本
    writeLedger(path.join(s.repo, 'reform'), 'healthy', ledger({ ratified: 6, lastBeat: ago(30) }));
    writeLedger(s.store, 'ok-creation', ledger({ ratified: 6, lastBeat: ago(5000) }));
    writeLedger(path.join(s.repo, 'reform'), 'ghost', ledger({ ratified: 4, lastBeat: ago(9892) })); // 実測 6.9日
    writeLedger(s.store, 'lost-creation', ledger({ ratified: 2, lastBeat: ago(3000) }));
    const brokenDir = path.join(s.store, 'broken');
    fs.mkdirSync(brokenDir, { recursive: true });
    fs.writeFileSync(path.join(brokenDir, 'conclave.json'), '{ これは JSON ではない');

    const env = { ...process.env, PARADISE_CREATIONS: s.store };
    const rep = conclave.auditRuns({ repoRoot: s.repo, env });

    assert.strictEqual(rep.ledgers.length, 5, `走行帳を数え落とした: ${rep.ledgers.length}/5`);
    // **名指しであること。** 数えるだけの門は赤くなっても直せない。
    const names = rep.abandoned.map(p => path.basename(path.dirname(p))).sort();
    assert.deepStrictEqual(names, ['ghost', 'lost-creation'],
      `見捨てられた走行の名指しが違う: ${JSON.stringify(names)}`);
    assert.deepStrictEqual(rep.unreadable.map(p => path.basename(path.dirname(p))), ['broken'],
      '読めない走行帳を黙って除いた — 壊れた帳ほど門をすり抜ける');
    // 健全な 2 本は鳴らない
    const st = new Map(rep.ledgers.map(l => [l.slug, l.state]));
    assert.strictEqual(st.get('healthy'), 'closed');
    assert.strictEqual(st.get('ok-creation'), 'closed');
    // 出所(paradise / creations)が判る — どちらの倉かを言わない名指しは直せない
    const where = new Map(rep.ledgers.map(l => [l.slug, l.where]));
    assert.strictEqual(where.get('ghost'), 'paradise');
    assert.strictEqual(where.get('lost-creation'), 'creations');

    // 人の画面が同じことを言う(二重集計を書いていない)
    const board = conclave.auditBoard(rep);
    assert.ok(/ghost/.test(board) && /lost-creation/.test(board), '人の画面が名指ししていない');
    assert.ok(/環が閉じぬまま/.test(board), '人の画面が理由を言わない');

    // ── CLI が実際に赤で鳴ること ────────────────────────────────
    let code = 0, out = '';
    try { out = execFileSync(process.execPath, [CL, 'audit'], { encoding: 'utf8', env, cwd: s.repo }); }
    catch (e) { code = e.status; out = String(e.stdout || '') + String(e.stderr || ''); }
    // NOTE: CLI は自分の repoRoot (= ROOT) を見る。ここで測るのは「口が在り JSON を吐く」こと。
    let jcode = 0, jout = '';
    try { jout = execFileSync(process.execPath, [CL, 'audit', '--json'], { encoding: 'utf8' }); }
    catch (e) { jcode = e.status; jout = String(e.stdout || ''); }
    const j = JSON.parse(jout.trim().split('\n').pop());
    for (const k of ['at', 'abandonedMs', 'ledgers', 'abandoned', 'unknown', 'unreadable']) {
      assert.ok(k in j, `audit --json が ${k} を運んでいない — 機械が読めない警告は機械が鳴らせない`);
    }
    assert.strictEqual(j.abandonedMs, conclave.ABANDONED_MS, '機械の口が別の閾値を持っている (第41条)');
    void code; void out; void jcode;
  } finally { s.cleanup(); }
});

test('A-7: 相の目 (phaseSilence) では欠陥A を捉えられない — だから別の目が要る', () => {
  // これが「新しい判定を足した理由」の証明である。写経ではなく必要性を撃つ。
  const run = ledger({ total: 6, ratified: 4, lastBeat: ago(9892) });
  const phases = [].concat(...run.domains.map(d => d.phases));
  for (const p of phases) {
    const s = conclave.phaseSilence(p, Date.now());
    assert.strictEqual(s.state, 'ok', 'pending の相が相の目に映った — 前提が変わった');
    assert.strictEqual(s.running, false);
  }
  // 同じ走行を、走行の目は捉える
  assert.strictEqual(conclave.runAbandonment(run, Date.now()).state, 'abandoned',
    '相の目にも走行の目にも映らない — 欠陥A が塞がっていない');
});

// ══════════════════════════════════════════════════════════════════════════
// 欠陥B — reform の走行帳が創造物の倉に迷い込む
// ══════════════════════════════════════════════════════════════════════════

test('B-1 [故障注入]: 創造物の倉に居る reform の走行帳を名指しする', () => {
  const s = sandbox();
  try {
    // 迷子 3 種 — 宣言 / 名前 / 実際に触った物 のそれぞれで捕らえる
    writeLedger(s.store, 'by-scale', ledger({ scale: 'reform', ratified: 6 }));
    writeLedger(s.store, 'reform-by-slug', ledger({ scale: 'standard', ratified: 6 }));
    writeLedger(s.store, 'by-artifact', ledger({
      scale: 'standard', ratified: 6,
      artifacts: ['graph/conclave.js', 'creations/x/app.html'],
    }));
    // **正しく住んでいる創造物は鳴らさない** — 偽陽性は門を無視させる(第21条)
    writeLedger(s.store, 'honest', ledger({ scale: 'standard', ratified: 6, artifacts: ['../paradise-creations/honest/app.html'] }));
    // paradise 側に正しく住む reform は当然鳴らない
    writeLedger(path.join(s.repo, 'reform'), 'proper', ledger({ scale: 'reform', ratified: 6, artifacts: ['graph/pulse.js'] }));

    const env = { ...process.env, PARADISE_CREATIONS: s.store };
    const stray = workspace.strayRuns(s.repo, { env });
    const names = stray.map(r => r.slug).sort();
    assert.deepStrictEqual(names, ['by-artifact', 'by-scale', 'reform-by-slug'],
      `迷子の名指しが違う: ${JSON.stringify(names)}`);
    // 三つの目がそれぞれ独立に効いている
    const by = new Map(stray.map(r => [r.slug, r.marks]));
    assert.deepStrictEqual(by.get('by-scale'), ['scale']);
    assert.deepStrictEqual(by.get('reform-by-slug'), ['slug']);
    assert.deepStrictEqual(by.get('by-artifact'), ['artifact']);
    // 理由を言うこと。名指ししない/理由を言わない門は、赤くなっても直せない
    for (const r of stray) assert.ok(r.why && r.why.length > 8, `${r.slug} の理由が空`);
    // domains の進み具合も運ぶ(欠陥A と欠陥B が同時に起きた実測に対応する)
    assert.strictEqual(by.get('by-scale') && stray.find(r => r.slug === 'by-scale').total, 6);
  } finally { s.cleanup(); }
});

test('B-2: strayRuns は strayCreations の逆向きであり、両方が生きている', () => {
  // 片方を消して緑にしていないことを構造で撃つ。
  assert.strictEqual(typeof workspace.strayCreations, 'function', 'strayCreations が消えた');
  assert.strictEqual(typeof workspace.strayRuns, 'function', 'strayRuns が無い — 欠陥B が塞がっていない');
  assert.strictEqual(typeof workspace.runLedgers, 'function', '走行帳の住所を知る口が無い');
  const src = fs.readFileSync(WS, 'utf8');
  // check がどちらも撃つこと(片方だけ撃つ門は片目である)
  const cli = src.slice(src.indexOf("cmd === 'check'"));
  assert.ok(/strayCreations\(\)/.test(cli) && /strayRuns\(\)/.test(cli) && /hardcodedRefs\(\)/.test(cli),
    'workspace.js check が三つの門を全て撃っていない');
});

test('B-3: 倉が無い環境でも壊れない — 見に行けなかったを 0 件と偽らない', () => {
  const s = sandbox();
  try {
    const gone = path.join(s.dir, 'no-such-store');
    const env = { ...process.env, PARADISE_CREATIONS: gone };
    // 倉が実在しないので creations 側は数えない(例外を投げない)
    const leds = workspace.runLedgers(s.repo, { env });
    assert.ok(Array.isArray(leds), '倉が無いと例外を投げた — CI の checkout で門が死ぬ');
    assert.strictEqual(leds.filter(l => l.where === 'creations').length, 0);
    assert.deepStrictEqual(workspace.strayRuns(s.repo, { env }), [],
      '倉が無いのに迷子を捏造した');
    // **出所は必ず判る** — where が無ければ「見に行った」のか「見に行けなかった」のか読めない
    for (const l of leds) assert.ok(l.where === 'paradise' || l.where === 'creations', 'where が無い');
  } finally { s.cleanup(); }
});

test('B-4: 走行帳の住所を知るのは workspace.js だけである (第30条)', () => {
  const src = fs.readFileSync(CL, 'utf8');
  // conclave は住所を自分で組まない。workspace を通す。
  assert.ok(/require\('\.\/workspace\.js'\)/.test(src), 'conclave.js が workspace を通していない');
  assert.ok(/workspace\.runLedgers/.test(src), 'conclave.js が走行帳の住所を自前で組んでいる疑い');
  // 直書きの門は既に在る。新しい engine が直書きを持ち込んでいないことを撃つ
  const refs = workspace.hardcodedRefs(ROOT);
  assert.deepStrictEqual(refs, [], `住所の直書きが再発した: ${JSON.stringify(refs)}`);
});

const r = H.report();
if (require.main === module) process.exit(r.fail === 0 ? 0 : 1);
module.exports = r;
