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
// 欠陥B(続) — 仮倉の偽の赤 (reform 走行『route-misfire』 / AC-18〜26)
//
// 実測された欠陥: `PARADISE_CREATIONS` が仮倉を指したまま `workspace.js check` を
// 呼ぶと、**創造物の倉ですらない場所**を裁いて EXIT=1 を出した。CI の 30 行目は
// `|| true` を持たないので、この偽の赤は門を落とす力を持っていた。
//
// だが「env なら黙る」は誤った治療である —— この同じファイルの `B-1 [故障注入]` が
// **env で仮倉を立てて strayRuns() が鳴ることを撃っている**。env を一律に無視すれば
// 欠陥B 対策が欠陥B 対策を殺す。ゆえに分岐は **指され方**ではなく **場所そのもの**を見る。
//
// この節も両向きに撃つ(第37条 — 片側だけ示した修理は壁であって門ではない):
//   B-5〜B-7  仮倉では裁かず、しかし**黙らない**
//   B-8 [逆]  本物の倉では今まで通り裁く / strayRuns は今まで通り鳴る
// ══════════════════════════════════════════════════════════════════════════

/** 本物の倉。無い機械(CI の checkout)では撃てない — その時は声に出して退く。 */
const REAL_VAULT = path.resolve(ROOT, '..', 'paradise-creations');

test('B-5: isCreationsVault は場所そのものを見る — 名でも指され方でも裁かない (FR-08)', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-probe-'));
  try {
    // ただの仮ディレクトリは倉ではない
    assert.strictEqual(workspace.isCreationsVault(d), false, '印の無い場所を倉と認めた');
    /**
     * **名前だけの偽物を認めない** (L-11 / AC-23)。
     * このファイルの `sandbox()` は `paradise-creations` という名の仮倉を作る。
     * 名で裁けば、**B-1 が撃つ仮倉が本物になり、skip が発動して B-1 が死ぬ**。
     */
    const decoy = path.join(d, 'paradise-creations');
    fs.mkdirSync(decoy);
    assert.strictEqual(workspace.isCreationsVault(decoy), false,
      'ディレクトリ名で裁いている — B-1 の砂場が本物と誤認され、故障注入が死ぬ');
    // 目印ファイルだけでも本物と認める(印 2 / AC-24)
    fs.writeFileSync(path.join(decoy, workspace.VAULT_MARKER), '');
    assert.strictEqual(workspace.isCreationsVault(decoy), true,
      `目印 ${workspace.VAULT_MARKER} を置いても倉と認めない — 印 2 が死んでいる`);
    // 在らない道は偽(例外を投げない)
    assert.strictEqual(workspace.isCreationsVault(path.join(d, 'no-such')), false);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('B-6: isCreationsVault は例外を一つも外へ出さない (NFR-02 / AC-26)', () => {
  // git が使えない場所・ファイル・空文字・null —— どれも false を返して黙る
  for (const bad of [null, undefined, '', path.join(os.tmpdir(), 'absolutely-no-such-dir-' + process.pid)]) {
    let threw = false, v = null;
    try { v = workspace.isCreationsVault(bad); } catch { threw = true; }
    assert.strictEqual(threw, false, `isCreationsVault(${JSON.stringify(bad)}) が投げた — check が死ぬ`);
    assert.strictEqual(v, false);
  }
  // ファイル(ディレクトリでない)も false
  const f = path.join(os.tmpdir(), 'vault-file-' + process.pid);
  fs.writeFileSync(f, 'x');
  try { assert.strictEqual(workspace.isCreationsVault(f), false); }
  finally { try { fs.unlinkSync(f); } catch {} }
});

test('B-7: resolve() は vault を足すだけ — 既存の 4 キーを一つも変えない (FR-07 / AC-25)', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-resolve-'));
  try {
    const r = workspace.resolve({ env: { PARADISE_CREATIONS: d } });
    for (const k of ['root', 'source', 'legacy', 'exists', 'vault']) {
      assert.ok(k in r, `resolve().${k} が無い`);
    }
    // 既存の意味は不変(paradise.test.js:3085 が撃っている)
    assert.strictEqual(r.source, 'env');
    assert.strictEqual(r.legacy, false);
    assert.strictEqual(r.exists, true);
    assert.strictEqual(r.root, path.resolve(d));
    assert.strictEqual(r.vault, false, '印の無い仮倉を倉と言った');
    /**
     * **`null` は「偽」ではなく「見に行けなかった」** (第16条 / 第37条)。
     * `conclave.js runAbandonment` が測れなかった走行を null のまま名指しする先例に倣う。
     * ここを false にすれば、CI の checkout(倉が無い)と
     * 「倉ではない場所を指している」が同じ言葉になり、人が原因を追えなくなる。
     */
    const gone = workspace.resolve({ env: { PARADISE_CREATIONS: path.join(d, 'no-such') } });
    assert.strictEqual(gone.exists, false);
    assert.strictEqual(gone.vault, null,
      '倉が無いのに vault=false と断じた — 「無い」と「見ていない」を同じ値にしてはならない');
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('B-8 [故障注入]: 仮倉を指した check は緑だが、**黙らない** (FR-09 / AC-18・19)', () => {
  const s = sandbox();
  try {
    // 仮倉に reform の走行帳を仕込む —— 修正前はこれが EXIT=1 の偽の赤を生んだ
    writeLedger(s.store, 'reform-probe', ledger({ scale: 'reform', ratified: 6, artifacts: ['graph/forge.js'] }));
    let out = '', code = 0;
    try {
      out = execFileSync(process.execPath, [WS, 'check'], {
        encoding: 'utf8', env: { ...process.env, PARADISE_CREATIONS: s.store },
      });
    } catch (e) { code = e.status; out = (e.stdout || '') + (e.stderr || ''); }
    assert.strictEqual(code, 0, `仮倉を指しただけで偽の赤が出た — 欠陥B が塞がっていない:\n${out}`);
    // **黙って緑にしてはならない**(第37条)。検めなかったことと、その場所を名乗る。
    assert.ok(/検めなかった/.test(out), `skip を声に出していない:\n${out}`);
    assert.ok(/創造物の倉ではない/.test(out), `なぜ検めなかったかを言っていない:\n${out}`);
    assert.ok(out.includes(path.basename(s.store)) || out.includes(s.store),
      `skip した場所を名指ししていない — 名指ししない門は読んだ人が原因を追えない:\n${out}`);
    // 記号は ✓ でも ✗ でもない第三の記号であること(緑を騙らず、赤も騙らない)
    assert.ok(/·/.test(out), `第三の記号で語っていない:\n${out}`);

    /**
     * **逆向き — `strayRuns()` 自体は今まで通り鳴る** (FR-10 / L-9 / AC-21)。
     * skip は CLI の層だけの話であり、関数を黙らせてはいない。
     * ここを落とせば B-1 [故障注入] が死ぬ。
     */
    const stray = workspace.strayRuns(s.repo, { env: { ...process.env, PARADISE_CREATIONS: s.store } });
    assert.deepStrictEqual(stray.map(r => r.slug), ['reform-probe'],
      'CLI の skip が strayRuns() 自体を黙らせた — 欠陥B 対策が既存の門を殺している');
  } finally { s.cleanup(); }
});

test('B-9: 倉が「無い」と「倉ではない」を別の言葉で言う (第21条 / CI の checkout)', () => {
  const s = sandbox();
  try {
    const gone = path.join(s.dir, 'no-such-store');
    const out = execFileSync(process.execPath, [WS, 'check'], {
      encoding: 'utf8', env: { ...process.env, PARADISE_CREATIONS: gone },
    });
    assert.ok(/検めなかった/.test(out), `倉が無い場合も skip を声に出すこと:\n${out}`);
    assert.ok(/倉が存在しない/.test(out),
      `「倉が無い」と「倉ではない」を同じ文言で言っている — 人が原因を追えない:\n${out}`);
  } finally { s.cleanup(); }
});

test('B-10 [逆]: 本物の倉では今まで通り裁く — 片側だけの修理は壁である (第37条 / AC-20・22)', () => {
  /**
   * 本物の倉が無い機械(CI の checkout)では**撃てない**。
   * その時は緑と数えず、**理由を名乗って退く**(第37条)。
   */
  if (!fs.existsSync(REAL_VAULT)) H.skip(`本物の創造物の倉が無い: ${REAL_VAULT}`);
  assert.strictEqual(workspace.isCreationsVault(REAL_VAULT), true,
    `本物の倉を倉と認めない — 印 1(git remote)も印 2(${workspace.VAULT_MARKER})も効いていない`);

  // 本物の倉を指した check は skip の文言を出さず、実際に裁く
  const out = execFileSync(process.execPath, [WS, 'check'], { encoding: 'utf8' });
  assert.ok(!/検めなかった/.test(out),
    `本物の倉なのに走行帳の裁きを skip した — 門を殺している:\n${out}`);
  assert.ok(/✓|✗/.test(out), `裁きの記号が出ていない:\n${out}`);
});

test('B-11: init は倉の根に目印を置く — 読む側だけを作らない (FR-11 / 第57条)', () => {
  const s = sandbox();
  try {
    const env = { ...process.env, PARADISE_CREATIONS: s.store };
    const marker = path.join(s.store, workspace.VAULT_MARKER);
    assert.ok(!fs.existsSync(marker), '砂場に目印が既に在る — 前提が崩れている');
    workspace.init('probe-creation', { env });
    assert.ok(fs.existsSync(marker),
      `init が目印を置かなかった — 印 2 は永久に発火しない枝になる(第57条)`);
    // 中身は何の目印かを語ること(名前だけの印は印ではない)
    const body = fs.readFileSync(marker, 'utf8').trim();
    assert.ok(body.length > 8, `目印が何であるかを語っていない: ${JSON.stringify(body)}`);
    // 置いた結果、その場所は本物の倉として認められる(置く側と読む側が繋がっている)
    assert.strictEqual(workspace.isCreationsVault(s.store), true,
      'init が置いた目印を isCreationsVault が読めない — 置く側と読む側が割れている');
    // 冪等: 二度目は書き換えない
    fs.writeFileSync(marker, '人の手で書いた註釈\n');
    workspace.init('probe-2', { env });
    assert.strictEqual(fs.readFileSync(marker, 'utf8'), '人の手で書いた註釈\n',
      'init が既存の目印を上書きした — 冪等でない');
  } finally { s.cleanup(); }
});

// ══════════════════════════════════════════════════════════════════════════
// **quality 相(security)が実測で見つけた穴** — 既に緑になったものを疑った結果
//
// 欠陥B の修理は「倉か否か」で裁きを分ける。だが **「倉か」の判定そのもの**が
// 甘ければ、攻撃者(あるいは不注意な env)は裁きを黙らせられる。撃って確かめた。
// ══════════════════════════════════════════════════════════════════════════

/**
 * **倉の替え玉を自分で組む**(CI の盲点を塞ぐ土台)。
 *
 * ⚠️ この関数が在る理由そのものが教訓である。
 *    かつて B-12 は「本物の兄弟倉が在れば撃つ、無ければ skip」だった。
 *    GitHub Actions の checkout に兄弟倉は**無い**。ゆえに CI では B-12 は
 *    **永久に黙り**、HIGH-1(toplevel 突合の消失)の再発を誰も捕まえなかった ——
 *    実測の変異試験で `toplevel 突合を消す` 変異だけが 8 件中ただ一つ生存した。
 *    「実在するものに依存する門」は「実在しない場所で死ぬ門」である(第37条)。
 *
 * ゆえに倉の印(git remote が paradise-creations で終わる)を持つ本物の git 倉を
 * Temp に建て、その中に子・孫を掘る。**本物の倉が一切無くてもこの門は鳴る。**
 * @returns {{dir,vault,kid,grand,cleanup}|null} git が無い機械では null
 */
function vaultFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-nest-'));
  // ⚠️ 名では裁かない(L-11)。本物と違う名を与えて、印だけで認めさせる
  const vault = path.join(dir, 'some-vault-name');
  const kid = path.join(vault, 'pomodoro');
  const grand = path.join(kid, 'src');
  const cleanup = () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} };
  fs.mkdirSync(grand, { recursive: true });
  try {
    execFileSync('git', ['-C', vault, 'init', '-q'], { stdio: 'pipe' });
    execFileSync('git', ['-C', vault, 'remote', 'add', 'origin',
      'https://github.com/kikusyo1101/paradise-creations.git'], { stdio: 'pipe' });
  } catch { cleanup(); return null; }
  return { dir, vault, kid, grand, cleanup };
}

test('B-12 [HIGH-1]: 倉の**子**を指しても倉と名乗らない — git は .git を親へ遡る', () => {
  /**
   * ⚠️ 実測された穴: `git -C <倉>/pomodoro config --get remote.origin.url` は
   *    **倉の remote をそのまま返す**。ゆえに倉の子・孫・`.git` の中まで、
   *    9 件のサブディレクトリ全てが `isCreationsVault=true` を名乗った。
   *
   *    結果 `PARADISE_CREATIONS=<倉>/pomodoro` を指した `check` は、
   *    倉の根を一度も走査しないまま **「✓ … reform 走行帳の流出なし」** を印字した ——
   *    skip の第三の記号(·)ではなく **緑を騙った**(第37条)。
   *    実測: 倉の根に流出を仕込むと EXIT=1 で鳴り、子を指すと EXIT=0 で「流出なし」。
   *
   * 修理: `rev-parse --show-toplevel` が返す**最上位**と、渡された道が一致すること。
   *
   * ⚠️ **この門は本物の倉に依存しない。** 替え玉を自分で組む(vaultFixture)。
   *    本物を見る断定は下の B-12b に分けた —— 在れば撃ち、無ければそこだけ退く。
   */
  const fx = vaultFixture();
  if (!fx) H.skip('git が使えない機械 — 替え玉の倉を建てられない');
  try {
    // 根は倉である(印 1 が生きている)
    assert.strictEqual(workspace.isCreationsVault(fx.vault), true,
      '替え玉の倉の**根**を倉と認めない — 印 1(git remote)が死んでいる');
    // 子・孫・.git はいずれも倉ではない(git が .git を親へ遡っても騙されない)
    for (const inner of [fx.kid, fx.grand, path.join(fx.vault, '.git')]) {
      assert.strictEqual(workspace.isCreationsVault(inner), false,
        `倉の内側 ${path.relative(fx.vault, inner)} が倉と名乗った — git が .git を親へ遡っている。` +
        'isCreationsVault から rev-parse --show-toplevel での突合が消えていないか見よ');
    }
    // そして `check` は、子を指されたら **skip を声に出す**(緑を騙らない)
    let out = '', code = 0;
    try {
      out = execFileSync(process.execPath, [WS, 'check'], {
        encoding: 'utf8', env: { ...process.env, PARADISE_CREATIONS: fx.kid },
      });
    } catch (e) { code = e.status; out = (e.stdout || '') + (e.stderr || ''); }
    assert.strictEqual(code, 0, `倉の子を指しただけで赤が出た:\n${out}`);
    assert.ok(/検めなかった/.test(out),
      `倉の子を倉と誤認し、走査しないまま「流出なし」と断じた — 緑を騙っている(第37条):\n${out}`);
  } finally { fx.cleanup(); }
});

test('B-12b [HIGH-1・実物]: 本物の倉でも根と子を取り違えない', () => {
  /**
   * B-12 は替え玉で CI でも鳴る。ここは**本物**に対する追認である ——
   * 在れば撃ち、無ければ**この断定だけ**を声に出して退く(第37条)。
   * 片方が skip しても HIGH-1 の門そのものは B-12 が守り続ける。
   */
  if (!fs.existsSync(REAL_VAULT)) H.skip(`本物の創造物の倉が無い: ${REAL_VAULT}`);
  assert.strictEqual(workspace.isCreationsVault(REAL_VAULT), true, '倉の根を倉と認めない');

  const kids = fs.readdirSync(REAL_VAULT)
    .map(n => path.join(REAL_VAULT, n))
    .filter(p => { try { return fs.statSync(p).isDirectory(); } catch { return false; } })
    .filter(p => !fs.existsSync(path.join(p, workspace.VAULT_MARKER)));
  if (!kids.length) H.skip('目印を持たない子ディレクトリが倉に無い');
  for (const kid of kids) {
    assert.strictEqual(workspace.isCreationsVault(kid), false,
      `倉の子 ${path.basename(kid)} が倉と名乗った — git が .git を親へ遡っている。` +
      'rev-parse --show-toplevel での突合が消えていないか見よ');
  }
});

test('B-15 [LOW-1]: 緑は「どの倉を検めたか」を名乗る — 別の場所の緑を本物と誤読させない', () => {
  /**
   * 残っていた問いを撃った結果 (security 相):
   *   **攻撃者が Temp に目印 `.paradise-creations` を置けば流出の門を黙らせられるか?**
   *   → **黙らせられない**。実測で偽倉に走行帳を仕込むと EXIT=1 で鳴った。
   *     env が指した場所を素直に走査するだけであり、走査は正しく働く。
   *
   * だが**緑の文言が場所を言わなかった**。
   *   「✓ … reform 走行帳の流出なし」だけでは、読んだ人は**本物の倉を検めた**と読む。
   *   実際には Temp の空の偽倉を検めただけということが在りうる。
   *   これは黙る (skip) でも騙る (false green) でもないが、**曖昧な緑**である。
   *   第37条の精神 —— 見なかったことを見たことにするな —— に従い、緑は場所を名乗る。
   */
  const fx = vaultFixture();
  if (!fx) H.skip('git が使えない機械 — 替え玉の倉を建てられない');
  try {
    const out = execFileSync(process.execPath, [WS, 'check'], {
      encoding: 'utf8', env: { ...process.env, PARADISE_CREATIONS: fx.vault },
    });
    assert.ok(/流出なし/.test(out), `替え玉の倉は綺麗なのに緑が出ない:\n${out}`);
    assert.ok(out.includes(fx.vault),
      `緑が「どの倉を検めたか」を名乗っていない — 別の場所の緑を本物と誤読させる:\n${out}`);
  } finally { fx.cleanup(); }
});

test('B-13 [MED-2]: git remote の印だけでも倉と認める — 目印を消して黙らせられない', () => {
  /**
   * ⚠️ 故障注入で生存した変異(N4): `git remote` の印を `return false` に倒しても、
   *    どの門も鳴らなかった。B-10 は本物の倉を撃つが、本物の倉は**目印を持っている**ので
   *    印 1(git remote)が死んでも印 2 が拾い、門は黙る。
   *    すなわち **印 1 は門に守られていなかった**。
   *
   * ここでは **目印を持たない本物の clone** を模して印 1 単独を撃つ。
   */
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-remote-'));
  const repo = path.join(d, 'some-other-name');   // ⚠️ 名では裁かない(L-11)
  fs.mkdirSync(repo);
  try {
    try {
      execFileSync('git', ['-C', repo, 'init', '-q'], { stdio: 'pipe' });
      execFileSync('git', ['-C', repo, 'remote', 'add', 'origin',
        'https://github.com/kikusyo1101/paradise-creations.git'], { stdio: 'pipe' });
    } catch { H.skip('git が使えない機械'); }
    assert.ok(!fs.existsSync(path.join(repo, workspace.VAULT_MARKER)),
      '前提が崩れた — 目印を置いていないこと');
    assert.strictEqual(workspace.isCreationsVault(repo), true,
      '目印が無く git remote だけの倉を認めない — 印 1 が死んでいる');
    // 逆向き: remote が別物なら倉ではない
    execFileSync('git', ['-C', repo, 'remote', 'set-url', 'origin',
      'https://github.com/kikusyo1101/paradise-forge.git'], { stdio: 'pipe' });
    assert.strictEqual(workspace.isCreationsVault(repo), false,
      '楽園本体の remote を持つ倉を創造物の倉と認めた — 印 1 が緩すぎる');
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('B-14 [MED-1]: PARADISE_CREATIONS の細工した値で例外を出さない (注入面)', () => {
  /**
   * `isCreationsVault` は `execFileSync('git', [...])` を呼ぶ。配列渡しなので
   * シェルは介在しないが、**道そのものが git のオプションに見える**場合や、
   * 改行・NUL・UNC が混じる場合に **投げずに false を返す**ことを撃つ。
   * 投げれば `check` が死に、門は「走らなかった」のに誰も気づかない。
   */
  const evil = [
    'C:/tmp\nrm -rf /', 'C:/tmp; calc.exe', 'C:/tmp & calc.exe', 'C:/tmp/`calc`',
    'C:/tmp/$(calc)', 'C:/tmp|calc', '--upload-pack=calc.exe', '-c protocol.ext.allow=always',
    '--exec-path=C:/evil', '\\\\no-such-host-xyz\\share', 'C:/tmp/\0evil', '../../../../',
  ];
  for (const v of evil) {
    let threw = false, r = null;
    try { r = workspace.isCreationsVault(v); } catch { threw = true; }
    assert.strictEqual(threw, false, `isCreationsVault(${JSON.stringify(v)}) が投げた — check が死ぬ`);
    assert.strictEqual(typeof r, 'boolean', `真偽以外を返した: ${JSON.stringify(v)}`);
    // resolve() 経由でも投げない
    let threw2 = false;
    try { workspace.resolve({ env: { PARADISE_CREATIONS: v } }); } catch { threw2 = true; }
    assert.strictEqual(threw2, false, `resolve(PARADISE_CREATIONS=${JSON.stringify(v)}) が投げた`);
  }
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
