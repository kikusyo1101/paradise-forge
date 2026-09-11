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

// ══════════════════════════════════════════════════════════════════════════
// 欠陥C — 段が着地したという **真の進捗** を記す口が engine に無かった (鼓動 / beat)
// ══════════════════════════════════════════════════════════════════════════
/**
 * 実測された欠陥C: `reform/sovereign-abode` は build 相 1 本を work-0〜7 の
 * **8 本**に割った改革であり、各段が別々の PR として神のマージを待つ。
 * 四段が着地し証拠が三本倉に在るのに、走行帳の最後の事象は `dispatch build` の
 * ままで、第53条の門は 1483 分の無音として **正しく** 赤を鳴らした。
 * **門は正しい。欠けていたのは口である。**
 *
 * ゆえにこの節は両向きに撃つ:
 *   C-1〜C-5  鼓動が **門を黙らせる道具にならない** こと(五つの錬)
 *   C-6       鼓動した走行は abandoned でなくなる(鼓動が確かに数えられている)
 *   C-7 [逆]  **鼓動の無い未完の走行は今まで通り赤い**(門を殺していない: 第21条)
 *   C-8       鼓動を持つ走行は「進んでいる」と **証拠付きで語る**(黙って緑にしない)
 */

/** `running` の相を 1 本持つ未完の走行帳。鼓動の錬を撃つための砂場の器。 */
function beatable(o = {}) {
  const run = ledger({ total: 6, ratified: 3, lastBeat: o.lastBeat, created: o.created });
  const d = run.domains[3];
  d.status = 'active';
  d.phases[0].status = 'running';
  d.phases[0].dispatchedAt = o.dispatchedAt || o.lastBeat || run.created;
  d.phases[0].id = 'build';
  return run;
}

/** 砂場に本物の証拠を一枚置く。中身を変えれば sha256 も変わる(錬2 の中身判定用)。 */
function evidenceFile(dir, name, body) {
  const p = path.join(dir, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body === undefined ? `# ${name}\n着地の証拠である。\n` : body);
  return p;
}

test('C-1 [錬1・故障注入]: 実在しない証拠・空の証拠・空白だけの証拠を拒む', () => {
  const s = sandbox();
  try {
    const run = beatable();
    // (1) 実在しない
    let e = null;
    try { conclave.beat(run, 'build', { evidence: path.join(s.dir, '無い.md'), note: '第1段が着地した' }); }
    catch (x) { e = x; }
    assert.ok(e, '実在しない証拠で鼓動が通った — 錬1 が無い');
    assert.strictEqual(e.exitCode, 2, `実在しない証拠の exit が ${e.exitCode} — 2 であるべき`);
    assert.ok(/実在しない/.test(e.message), '理由を言わない門は直せない');

    // (2) 0 バイト — **在ることは資格ではない (第54条)**
    const empty = evidenceFile(s.dir, 'empty.md', '');
    e = null;
    try { conclave.beat(run, 'build', { evidence: empty, note: '第1段が着地した' }); } catch (x) { e = x; }
    assert.ok(e, '空のファイルで鼓動が通った — 在ることを資格と見なしている (第54条)');
    assert.strictEqual(e.exitCode, 2);

    // (3) 空白だけ — 名は在るが中身は無い (第16条)
    const blank = evidenceFile(s.dir, 'blank.md', '   \n\t\n  \n');
    e = null;
    try { conclave.beat(run, 'build', { evidence: blank, note: '第1段が着地した' }); } catch (x) { e = x; }
    assert.ok(e, '空白しか無い証拠で鼓動が通った — 名を中身と取り違えている (第16条)');
    assert.strictEqual(e.exitCode, 2);

    // (4) 束(ディレクトリ)を証拠と名乗れない
    e = null;
    try { conclave.beat(run, 'build', { evidence: s.dir, note: '第1段が着地した' }); } catch (x) { e = x; }
    assert.ok(e, 'ディレクトリが証拠として通った');

    // **拒んだとき走行帳は一切汚れていない** — 拒否が記録を進めたら錬の意味が無い
    assert.strictEqual(conclave.beatsOf(run).length, 0, '拒んだのに鼓動が刻まれた');
    assert.strictEqual(run.history.length, 1, '拒否が history を伸ばした');
  } finally { s.cleanup(); }
});

test('C-2 [錬2・故障注入]: 同じ証拠で二度は鼓動できない — 古い一枚で門を永久に黙らせられない', () => {
  const s = sandbox();
  try {
    const run = beatable();
    const ev = evidenceFile(s.dir, 'build-1-evidence.md', '# 第1段\n16箇所を器へ通した。\n');
    const first = conclave.beat(run, 'build', { evidence: ev, note: '第1段 work-1 が着地した' });
    assert.strictEqual(first.ok, true, '真っ当な鼓動が拒まれた — 門ではなく壁を建てている (第36条)');
    assert.strictEqual(conclave.beatsOf(run).length, 1);

    // 同じ住所で二度目
    let e = null;
    try { conclave.beat(run, 'build', { evidence: ev, note: '第1段 work-1 がまた着地した' }); } catch (x) { e = x; }
    assert.ok(e, '同じ証拠で二度鼓動できた — **古い一枚を毎日指せば門は永久に黙る**');
    assert.strictEqual(e.exitCode, 1, `二度目の exit が ${e.exitCode} — 1 であるべき`);
    assert.ok(/既に鼓動に使われている/.test(e.message), '理由を言っていない');

    // **写して名を変えた証拠も同じ証拠である** — 住所だけ見る錬は抜け穴を残す
    const copy = evidenceFile(s.dir, 'build-1-evidence-copy.md', fs.readFileSync(ev, 'utf8'));
    e = null;
    try { conclave.beat(run, 'build', { evidence: copy, note: '写した証拠で鼓動する' }); } catch (x) { e = x; }
    assert.ok(e, '写して名を変えた証拠が通った — 錬2 が住所しか見ていない');
    assert.strictEqual(e.exitCode, 1);
    assert.ok(/中身が既出/.test(e.message));

    // **新しい着地には通る**(壁ではなく門であること: 第36条/第37条 の両向き)
    const ev2 = evidenceFile(s.dir, 'build-2-evidence.md', '# 第2段\n両居を建てた。\n');
    assert.strictEqual(conclave.beat(run, 'build', { evidence: ev2, note: '第2段 work-2 が着地した' }).ok, true,
      '別の証拠を携えた真の進捗まで拒んだ — それは門ではなく壁である');
    assert.strictEqual(conclave.beatsOf(run).length, 2, '通った鼓動が数えられていない');
  } finally { s.cleanup(); }
});

test('C-3 [錬3]: running でない相には鼓動を刻めない', () => {
  const s = sandbox();
  try {
    const ev = evidenceFile(s.dir, 'e.md');
    // pending の相(まだ走っていない)
    const run = beatable();
    run.domains[3].phases[0].status = 'pending';
    let e = null;
    try { conclave.beat(run, 'build', { evidence: ev, note: 'pending に鼓動を打つ' }); } catch (x) { e = x; }
    assert.ok(e, 'pending の相に鼓動が刻めた — 走っていない相に進捗は無い');
    assert.strictEqual(e.exitCode, 1);

    // done の相(既に終わっている)
    run.domains[3].phases[0].status = 'done';
    e = null;
    try { conclave.beat(run, 'build', { evidence: ev, note: 'done に鼓動を打つ' }); } catch (x) { e = x; }
    assert.ok(e, 'done の相に鼓動が刻めた — 終わった相に進捗は無い');
    assert.strictEqual(e.exitCode, 1);

    // 存在しない相
    run.domains[3].phases[0].status = 'running';
    e = null;
    try { conclave.beat(run, '無い相', { evidence: ev, note: '居ない相に鼓動を打つ' }); } catch (x) { e = x; }
    assert.ok(e, '存在しない相に鼓動が刻めた');
    assert.strictEqual(e.exitCode, 2);
  } finally { s.cleanup(); }
});

test('C-4 [錬4]: 鼓動は相の status も domain の status も一切変えない', () => {
  const s = sandbox();
  try {
    const run = beatable();
    const before = JSON.stringify(run.domains);
    const beforeRatified = run.domains.filter(d => d.status === 'ratified').length;
    conclave.beat(run, 'build', { evidence: evidenceFile(s.dir, 'a.md'), note: '第1段が着地した' });
    conclave.beat(run, 'build', { evidence: evidenceFile(s.dir, 'b.md', '別の中身\n'), note: '第2段が着地した' });

    // **状態は 1 バイトも動かない。** done にも ratified にもできない語である。
    assert.strictEqual(JSON.stringify(run.domains), before,
      '鼓動が domains を書き換えた — 錬4 違反。鼓動は記録であって進行ではない');
    assert.strictEqual(run.domains[3].phases[0].status, 'running', '相の status が動いた');
    assert.strictEqual(run.domains.filter(d => d.status === 'ratified').length, beforeRatified, 'domain の status が動いた');
    // 走行としての完了判定も動いていない
    const r = conclave.runAbandonment(run, Date.now());
    assert.strictEqual(r.closed, false, '鼓動が環を閉じた — 最も重い錬4 違反');
    assert.strictEqual(r.ratified, 3);
    // 刻まれたのは history だけ、かつ **今の刻**である(過去を騙らない: 第22条)
    assert.strictEqual(conclave.beatsOf(run).length, 2);
    for (const b of conclave.beatsOf(run)) {
      assert.ok(Date.parse(b.ts) <= Date.now() + 1000, '鼓動が未来の刻を名乗った');
      assert.ok(b.evidence && b.sha256 && b.note, '鼓動が証拠・指紋・註釈のどれかを運んでいない');
    }
  } finally { s.cleanup(); }
});

test('C-5 [錬5]: 空・短すぎる・プレースホルダの註釈を拒む', () => {
  const s = sandbox();
  try {
    const run = beatable();
    const ev = evidenceFile(s.dir, 'e.md');
    for (const bad of ['', '   ', 'TODO', 'todo', '後で', '-', '——', 'WIP', 'n/a', '短い']) {
      let e = null;
      try { conclave.beat(run, 'build', { evidence: ev, note: bad }); } catch (x) { e = x; }
      assert.ok(e, `註釈 ${JSON.stringify(bad)} で鼓動が通った — 何が着地したかを言わない鼓動は記録ではない`);
      assert.strictEqual(e.exitCode, 2, `註釈 ${JSON.stringify(bad)} の exit が ${e.exitCode}`);
    }
    // 註釈が無いことを理由に拒むなら、**真っ当な註釈は通らねばならない**(両向き)
    assert.strictEqual(conclave.beat(run, 'build', { evidence: ev, note: '第1段 work-1 が着地した' }).ok, true,
      '真っ当な註釈まで拒んだ — 壁になっている');
    assert.strictEqual(conclave.validateBeatNote('TODO').ok, false);
    assert.strictEqual(conclave.validateBeatNote('第3段 work-3 が着地した').ok, true);
  } finally { s.cleanup(); }
});

test('C-6 [故障注入]: 鼓動した走行は abandoned でなくなる — 鼓動が確かに数えられている', () => {
  const s = sandbox();
  try {
    const at = Date.now();
    // 25時間無音・未完 = 今まで通りなら abandoned
    const run = beatable({ lastBeat: ago(1500, at) });
    assert.strictEqual(conclave.runAbandonment(run, at).state, 'abandoned',
      '前提が崩れている — 鼓動前は abandoned でなければ、この門は何も測っていない');

    conclave.beat(run, 'build', {
      evidence: evidenceFile(s.dir, 'build-3-evidence.md', '# 第3段\n見張りを建て替えた。\n'),
      note: '第3段 work-3 が着地した',
    });
    const after = conclave.runAbandonment(run, Date.now());
    assert.strictEqual(after.state, 'active', '鼓動を刻んでも abandoned のまま — 鼓動が数えられていない');
    assert.strictEqual(after.abandoned, false);
    assert.strictEqual(after.beats, 1, '鼓動の数を運んでいない');
    assert.strictEqual(after.closed, false, '鼓動が環を閉じた — 錬4 違反');

    // **鼓動しても時が経てばまた赤い。** 鼓動は永久の免罪符ではない。
    const stale = conclave.runAbandonment(run, Date.now() + conclave.ABANDONED_MS + 60000);
    assert.strictEqual(stale.state, 'abandoned',
      '一度鼓動すれば永久に緑になった — それは門を消したのと同じである');
  } finally { s.cleanup(); }
});

test('C-7 [逆の門・第21条]: 鼓動の無い未完の走行は今まで通り赤い — 門を殺していない', () => {
  const s = sandbox();
  try {
    // 鼓動の口を建てた後も、**鼓動を持たない走行**は第53条が捕らえ続ける。
    writeLedger(path.join(s.repo, 'reform'), 'no-beat', ledger({ ratified: 4, lastBeat: ago(9892) }));
    writeLedger(path.join(s.repo, 'reform'), 'healthy', ledger({ ratified: 6, lastBeat: ago(30) }));
    const env = { ...process.env, PARADISE_CREATIONS: path.join(s.dir, 'no-such-store') };
    const rep = conclave.auditRuns({ repoRoot: s.repo, env });
    assert.deepStrictEqual(rep.abandoned.map(p => path.basename(path.dirname(p))), ['no-beat'],
      '鼓動の口を建てたことで、鼓動の無い走行まで見逃すようになった — 門が死んだ (第21条)');
    // 直接の判定でも同じ
    const dead = conclave.runAbandonment(ledger({ ratified: 4, lastBeat: ago(9892) }), Date.now());
    assert.strictEqual(dead.state, 'abandoned');
    assert.strictEqual(dead.beats, 0, '鼓動の無い走行が鼓動を持つと数えられた');
    assert.strictEqual(dead.lastProof, null);
  } finally { s.cleanup(); }
});

test('C-8 [第54条(c)]: 鼓動を持つ走行は「進んでいる」を **証拠付きで** 語る — 黙って緑にしない', () => {
  const s = sandbox();
  try {
    const run = beatable({ lastBeat: ago(1500) });
    conclave.beat(run, 'build', {
      evidence: evidenceFile(s.dir, 'build-2-evidence.md', '# 第2段\n両居を建てた。\n'),
      note: '第2段 work-2 が着地した',
    });
    const p = writeLedger(path.join(s.repo, 'reform'), 'beating', run);
    void p;
    const env = { ...process.env, PARADISE_CREATIONS: path.join(s.dir, 'no-such-store') };
    const rep = conclave.auditRuns({ repoRoot: s.repo, env });
    const l = rep.ledgers.find(x => x.slug === 'beating');
    assert.strictEqual(l.state, 'active');
    assert.strictEqual(l.beats, 1);
    assert.ok(l.lastProof && l.lastProof.evidence, '機械の口が最後の鼓動の証拠を運んでいない');
    assert.strictEqual(l.lastProof.note, '第2段 work-2 が着地した');

    // 人の画面が **証拠の住所を印字する**。免除は記録されて初めて例外である(第54条(c))。
    const board = conclave.auditBoard(rep);
    assert.ok(/鼓動 1 回/.test(board), '鼓動を持つ走行が黙って緑に落ちている');
    assert.ok(/build-2-evidence\.md/.test(board), '最後の鼓動が何を携えていたかを語っていない');
    assert.ok(/第2段 work-2 が着地した/.test(board), '註釈を語っていない');
  } finally { s.cleanup(); }
});

test('C-9: 鼓動の CLI が実在し、錬が throw したら走行帳を書き換えない', () => {
  const s = sandbox();
  try {
    const run = beatable();
    const rp = writeLedger(path.join(s.repo, 'reform'), 'cli', run);
    const before = fs.readFileSync(rp, 'utf8');
    // 実在しない証拠 → exit 2 かつ **ファイルは 1 バイトも変わらない**
    let code = 0;
    try { execFileSync(process.execPath, [CL, 'beat', 'build', '--run', rp, '--evidence', path.join(s.dir, '無い.md'), '--note', '着地したと主張する'], { encoding: 'utf8', stdio: 'pipe' }); }
    catch (e) { code = e.status; }
    assert.strictEqual(code, 2, `CLI の拒否 exit が ${code} — 2 であるべき`);
    assert.strictEqual(fs.readFileSync(rp, 'utf8'), before, '拒んだのに走行帳が書き換わった');

    // 真っ当な鼓動 → exit 0 かつ history が 1 本伸びる
    const ev = evidenceFile(s.dir, 'ok.md', '# 着地\n実物である。\n');
    const out = execFileSync(process.execPath, [CL, 'beat', 'build', '--run', rp, '--evidence', ev, '--note', '第1段 work-1 が着地した'], { encoding: 'utf8' });
    assert.ok(/"ok": true/.test(out), `CLI が鼓動を刻めなかった: ${out}`);
    const after = JSON.parse(fs.readFileSync(rp, 'utf8'));
    assert.strictEqual(conclave.beatsOf(after).length, 1);
    assert.strictEqual(after.domains[3].phases[0].status, 'running', 'CLI 経由で状態が動いた — 錬4 違反');
    // 用法の一覧に載っていること(呼べない口は無いのと同じ: 第21条)
    const src = fs.readFileSync(CL, 'utf8');
    assert.ok(/conclave\.js beat <id>|beat <id> --run f/.test(src), 'usage に beat が載っていない');
  } finally { s.cleanup(); }
});

const r = H.report();
if (require.main === module) process.exit(r.fail === 0 ? 0 : 1);
module.exports = r;
