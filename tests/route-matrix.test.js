#!/usr/bin/env node
/**
 * PARADISE :: ROUTE MATRIX — 6 道 × 6 道の混同行列を撃つ門 (第61条)
 *
 * ── なぜ列ではなく行列か ──────────────────────────────────────────────
 * 本走行(reform『route-misfire』)は道選びの判定器を **8 度**直し、
 * **8 度とも「別の行き先を奪う」形の回帰を生んだ**。そのうち 7 度は
 * `reform` の側を撃って捕らえたが、**8 度目 (R-1) は `counsel` の側だったので
 * 誰も見なかった** —— 格子実測で `counsel → standard/reform` が
 * **main 0/150 → HEAD 120/150(80%)** に落ちていた。
 *
 * 従来の門は「この願いは reform へ着くか」という **一本の列**しか撃っていない。
 * 列は「自分が守る道を奪われたか」しか見ず、**自分が他の道を奪ったか**を見ない。
 *
 *   ゆえにこの門は **行列**で撃つ:
 *     ROUTE_MATRIX[正解の道][実際の道] を数え、
 *       (a) 対角線の合計 = コーパスの件数         ← 全件が正しい道へ着く
 *       (b) **非対角の各セルが 0**                ← 誰も他の道を奪っていない
 *     の**両方**を assert する。
 *
 * R-1 が生きていれば `counsel → standard` のセルが 0 から 120 超へ跳ね、
 * この門は **セルの名を挙げて**即座に赤くなる(故障注入で実測済み)。
 *
 *   node tests/route-matrix.test.js     # exit 0 = 6 道の行列は対角のみ
 *
 * ⚠️ この門は `chooseScale` を直に呼ぶ。CLI を経由しない(AC-30 の債務は別件)。
 * ⚠️ コーパスを緩めて緑にしてはならない(第21条)。願いが誤着するなら判定器を直せ。
 */
'use strict';
const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const forge = require(path.join(ROOT, 'graph', 'forge.js'));

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); pass++; }
  catch (e) { console.log('  \u2717 ' + name + '\n      ' + String(e.message).split('\n').join('\n      ')); fail++; }
}

/** 楽園の 6 道。行列の軸である。 */
const ROUTES = ['counsel', 'cartography', 'reform', 'quick', 'standard', 'full'];

/**
 * ── コーパス ─────────────────────────────────────────────────────────
 * 各道につき最低 8 件。正解の道を**明示して**持つ。
 * 「reform へ着くか」ではなく「**どの道へ着くか**」を一件ずつ宣言する。
 *
 * ⚠️ 第60条(b): 規則を足したら**両枝**を持て。
 *    建造動詞 × 熟議標識は counsel の枝と reform の枝を**対にして**持つこと。
 */
const CORPUS = [];
const w = (route, wish) => CORPUS.push({ route, wish });

// ── counsel: 答えを求める願い ───────────────────────────────────────
//    (a) 純粋な問い
w('counsel', '楽園の構造を調査して報告してほしい');
w('counsel', '楽園のエンジンを監査してほしい');
w('counsel', '二つの案の比較表がほしい');
w('counsel', '人口動態を調査して報告してほしい');
w('counsel', '腎機能の低下を診断してほしい');
w('counsel', '相場を分析して所見をくれ');
//    (b) **熟議** (R-1) —— 建造動詞を伴いながら「作るべきか」と問う願い。
//        ★ main 0/150 → HEAD 120/150 の回帰はこの枝だけを落とした。
w('counsel', '憲法に条を足すべきかどう思う');
w('counsel', 'gauge に口を設けるのは妥当か');
w('counsel', '楽園に相を足すべきかどうすべきか');
w('counsel', '楽園の門を直すべきか検討して');
w('counsel', 'kg に忘れる口を設けるべきか検討して');
w('counsel', 'ダッシュボードに一段を加えるべきではないか');
w('counsel', 'forge に段を設けるべきだろうか');
w('counsel', 'CI に段を追加するのはどうすべきか');
w('counsel', 'ポモドーロアプリに休憩の機能を足すべきか検討して');
w('counsel', '家計簿に為替の口を設けるのは妥当か');
//    (c) 英語の熟議
w('counsel', 'should we add a flag to the gate? please advise');
w('counsel', 'is it worth adding an endpoint here? give your assessment');
w('counsel', 'do you think we should extend the cli? recommend an option');
w('counsel', 'compare the two approaches and advise whether to add a command');
w('counsel', 'review whether introducing a new tool is a good idea');
w('counsel', 'should we add a dark mode to the habit tracker? advise');
//    (d) 節を跨ぐ熟議 — 熟議が前節、求めも後節
w('counsel', '楽園の門に一段を足すべきか。意見をくれ');
w('counsel', 'gauge に口を設けるべきか。所見がほしい');
/**
 * ★ (e) **単独標識** —— 熟議の語が**その一語しか無い**願い。
 *
 * ⚠️ 故障注入 M3 が名指しで教えた穴である。上の格子 150 件は
 * 「設けるべきか**検討せよ**」「足すべきか**どう思う**」のように
 * **標識を必ず二つ**持っており、`DELIBERATION_JA` から `べきか` を一語抜いても
 * もう一語が拾うので**門は黙った**(ROUTE_MATRIX exit 0)。
 * 冗長なコーパスは「語彙の一語が死んだ」ことを検知できない。
 *
 * ゆえに `DELIBERATION_JA` の**各語につき、その語だけが標識である願い**を持つ。
 * これで語彙の一語を抜けば必ずどれか一件が落ちる。
 */
w('counsel', 'forge に段を設けるべきか');                    // べきか
w('counsel', 'gauge に段を加えるべきだろうか');              // べきだろうか
w('counsel', 'kg に口を追加すべきではないか');               // べきではないか
w('counsel', '楽園に段を足すのをどう思う');                  // どう思う
w('counsel', 'CI に口を足すのはどうすべき');                 // どうすべき
w('counsel', 'CI に印を足すのは妥当か');                     // 妥当か
w('counsel', '門に一段を持たせるのはいかがか');              // いかがか
w('counsel', '段を設けるのと口を足すのはどちらがよい');      // どちらがよい
w('counsel', 'kg に口を設けるのを検討して');                 // 検討して
w('counsel', 'forge に段を設けるべきでしょうか');            // べきでしょうか
w('counsel', 'CI と門のどちらが良い');                       // どちらが良い
w('counsel', '楽園に口を足す是非を聞きたい');                // 是非を
w('counsel', 'gauge に印は要るか');                          // 要るか
w('counsel', 'kg に口は必要か');                             // 必要か
w('counsel', '段を足す件で所見がほしい');                    // 所見がほしい
w('counsel', '段を足す件で所見が欲しい');                    // 所見が欲しい
w('counsel', 'kg に口を設けるのを検討せよ');                 // 検討せよ
w('counsel', '門に段を足すのを検討したい');                  // 検討したい

// ── cartography: 図を求める願い ─────────────────────────────────────
w('cartography', '楽園の位階の相関図を作れ');
w('cartography', 'オーケストレーションの相関図を作れ');
w('cartography', '家計の流れをフロー図にして');
w('cartography', '楽園の相の系統図を描いてほしい');
w('cartography', '依存の関連図を可視化して');
w('cartography', 'draw an architecture diagram of the engine');
w('cartography', 'visualize the phase flowchart');
//    ★ 作図は 1 段目。熟議より先に立つ(奪われていないことを撃つ)。
w('cartography', '楽園の位階の相関図を作るべきか検討して');
w('cartography', '構成図を描くのは妥当か');

// ── reform: 楽園そのものを改める命令 ────────────────────────────────
w('reform', '楽園の自己診断に fingerprint を確かめる口を設ける');
w('reform', '門に監査の一段を足す');
w('reform', '楽園の憲法に条を足せ');
w('reform', '楽園の門に一段を設けよ');
w('reform', '楽園の判定器を書き換えろ');
w('reform', '楽園の走行台帳に印を付与せよ');
w('reform', '楽園の相を新設する');
//    ★ 断定の「べきだ」は命令である。疑問の「べきか」と対にして持つ(第60条(b))。
w('reform', '楽園の門を見直すべきだ');
w('reform', '楽園に監査の口を足すべきである');
//    ★ 節跨ぎ: 熟議は前節の前置き、後節が命令
w('reform', '足すべきか迷ったが決めた。楽園の門に一段を足せ');
w('reform', '妥当か検討済み:楽園に監査の口を実装せよ');

// ── quick: 小さな直し ───────────────────────────────────────────────
w('quick', '台帳の毒を直す');
w('quick', 'タイポを直して');
w('quick', '誤字を修正して');
w('quick', '一行のバグを直す');
w('quick', 'fix the typo in the readme');
w('quick', 'quick tweak to the parser');
w('quick', 'hotfix the broken import');
w('quick', 'rename the variable');

// ── standard: 既定の創造 ────────────────────────────────────────────
w('standard', 'レシピ検索の並び替えを実現して');
w('standard', '写真の整頓を実装して');
w('standard', '読書記録の栞を作る');
w('standard', '通知の仕組みを構築して');
w('standard', 'implement a markdown renderer');
w('standard', 'create a csv importer');
w('standard', 'develop a caching layer');
w('standard', 'make a url shortener service');
/**
 * ⚠️ `cli tool` は **standard** である(main / HEAD の両方で実測)。
 * `fullEn` は product|platform|system|app|saas|dashboard|mvp|launch を持つが
 * `tool` を持たない —— 道具は製品規模ではない、というのが main から在る裁きである。
 * この門を書いたとき筆者は誤って full と記し、**門が誤りを名指しで赤くした**。
 * 掟どおり **門ではなくコーパスの札を直した**(判定器は一行も触れていない)。
 */
w('standard', 'build a calorie tracker cli tool');

// ── full: 製品規模 ──────────────────────────────────────────────────
w('full', '健康診断アプリが欲しい');
w('full', 'build a habit tracker app');
w('full', 'ポモドーロタイマーのアプリが欲しい');
w('full', '家計簿のシステムを作って');
w('full', '読書記録のプラットフォームが欲しい');
w('full', 'build a calorie tracker application');
w('full', 'launch an mvp dashboard product');
w('full', 'build an end-to-end saas platform');

// ══════════════════════════════════════════════════════════════════════
// 行列を組む
// ══════════════════════════════════════════════════════════════════════
function buildMatrix(corpus) {
  const m = {};
  for (const a of ROUTES) { m[a] = {}; for (const b of ROUTES) m[a][b] = []; }
  const unknown = [];
  for (const row of corpus) {
    const got = forge.chooseScale(row.wish);
    if (!ROUTES.includes(row.route)) throw new Error(`未知の正解道: ${row.route}`);
    if (!ROUTES.includes(got)) { unknown.push({ ...row, got }); continue; }
    m[row.route][got].push(row.wish);
  }
  return { m, unknown };
}

const { m: MATRIX, unknown: UNKNOWN } = buildMatrix(CORPUS);

function render(m) {
  const head = '正解\\実際'.padEnd(14) + ROUTES.map(r => r.slice(0, 6).padStart(8)).join('') + '     計';
  const lines = [head, '─'.repeat(head.length)];
  for (const a of ROUTES) {
    let n = 0;
    const cells = ROUTES.map(b => { n += m[a][b].length; return String(m[a][b].length).padStart(8); }).join('');
    lines.push(a.padEnd(14) + cells + String(n).padStart(8));
  }
  return lines.join('\n');
}

console.log('\n═══ 6 道 × 6 道 混同行列 (第61条) ═══\n');
console.log(render(MATRIX));
console.log('');

// ══════════════════════════════════════════════════════════════════════
// 門 — 対角の合計 と 非対角の各セル、**両方**を撃つ
// ══════════════════════════════════════════════════════════════════════

test('M-0: コーパスは 6 道すべてを最低 8 件ずつ持つ — 片枝のコーパスは片枝しか守らない', () => {
  const short = ROUTES.filter(r => CORPUS.filter(c => c.route === r).length < 8)
    .map(r => `${r}=${CORPUS.filter(c => c.route === r).length}`);
  assert.strictEqual(short.length, 0, `8 件に満たない道: ${short.join(', ')}`);
});

test('M-1: 願いはすべて 6 道のいずれかへ着く — 未知の道は無い', () => {
  assert.strictEqual(UNKNOWN.length, 0,
    `6 道の外へ落ちた願い:\n` + UNKNOWN.map(u => `  ${u.got} ← ${u.wish}`).join('\n'));
});

test('M-2 [対角]: 対角線の合計がコーパスの件数と等しい — 全件が正しい道へ着く', () => {
  const diag = ROUTES.reduce((s, r) => s + MATRIX[r][r].length, 0);
  assert.strictEqual(diag, CORPUS.length,
    `対角=${diag} / コーパス=${CORPUS.length} — ${CORPUS.length - diag} 件が別の道へ着いている`);
});

test('M-3 [非対角]: 非対角の**各セル**が 0 — どの道も他の道を奪っていない', () => {
  const bad = [];
  for (const a of ROUTES) for (const b of ROUTES) {
    if (a === b) continue;
    const cell = MATRIX[a][b];
    if (cell.length) bad.push(`  ${a} → ${b} : ${cell.length} 件\n` + cell.map(x => `      ・${x}`).join('\n'));
  }
  assert.strictEqual(bad.length, 0,
    `非対角のセルが 0 でない —— 判定器が他の道を奪っている:\n` + bad.join('\n'));
});

/**
 * ★ R-1 の名指しの門。M-3 が全体を守るのに対し、これは**回帰そのものに名を与える**。
 *   門が赤くなったとき「どの回帰か」が一行で分かるようにするためである(第44条の趣旨)。
 */
test('M-4 [R-1 名指し]: counsel → standard / reform のセルが 0 — 熟議の願いが道を失わない', () => {
  for (const to of ['standard', 'reform', 'quick', 'full']) {
    const cell = MATRIX.counsel[to];
    assert.strictEqual(cell.length, 0,
      `R-1 の回帰: 熟議の願い ${cell.length} 件が counsel を失って ${to} へ落ちた:\n` +
      cell.map(x => `    ・${x}`).join('\n'));
  }
});

/**
 * ★ 逆向き。欠陥A の本旨(楽園の改修が counsel へ攫われない)を守る。
 *   R-1 の修理がこちらを壊していないことを、**同じ門の中で**撃つ(第60条(b))。
 */
test('M-5 [欠陥A 名指し]: reform → counsel のセルが 0 — 楽園の改修が諐問へ攫われない', () => {
  const cell = MATRIX.reform.counsel;
  assert.strictEqual(cell.length, 0,
    `欠陥A の回帰: 楽園の改修 ${cell.length} 件が counsel へ攫われた:\n` +
    cell.map(x => `    ・${x}`).join('\n'));
});

/**
 * ★ 格子 — 主語 3 × 建造動詞 10 × 熟議標識 5 = 150 通り。
 *   個々の願いを列挙するのではなく **積**で撃つ。R-1 はここで 120/150 落ちた。
 */
test('M-6 [格子150]: 熟議 × 建造動詞 150 通りがすべて counsel へ着く', () => {
  const SUBJ = ['CI に段を', 'kg に口を', 'gauge に印を'];
  const VERB = ['設ける', '足す', '加える', '追加する', '新設する',
    '導入する', '搭載する', '持たせる', '拡張する', '付ける'];
  const DELIB = [v => `${v}べきか検討せよ`, v => `${v}のは妥当か`, v => `${v}べきではないか`,
    v => `${v}べきかどう思う`, v => `${v}のはどうすべきか`];
  const missed = [];
  for (const s of SUBJ) for (const v of VERB) for (const d of DELIB) {
    const wish = s + d(v);
    const got = forge.chooseScale(wish);
    if (got !== 'counsel') missed.push(`${got} ← ${wish}`);
  }
  assert.strictEqual(missed.length, 0,
    `格子 ${missed.length}/150 が counsel を失った(R-1):\n` +
    missed.slice(0, 10).map(x => `    ・${x}`).join('\n') +
    (missed.length > 10 ? `\n    …他 ${missed.length - 10} 件` : ''));
});

/**
 * ★ 対照群。同じ語の**命令形** 30 通りは counsel であってはならない。
 *   「熟議を拾う」規則が「命令まで拾う」に化けていないことを撃つ(第60条(b))。
 */
test('M-7 [対照30]: 同じ語の命令形 30 通りは counsel へ着かない', () => {
  const SUBJ = ['楽園の CI に段を', '楽園の kg に口を', '楽園の gauge に印を'];
  const VERB = ['設けよ', '足せ', '加えよ', '追加せよ', '新設せよ',
    '導入せよ', '搭載せよ', '持たせよ', '拡張せよ', '付けよ'];
  const stolen = [];
  for (const s of SUBJ) for (const v of VERB) {
    const wish = s + v;
    if (forge.chooseScale(wish) === 'counsel') stolen.push(wish);
  }
  assert.strictEqual(stolen.length, 0,
    `命令形 ${stolen.length}/30 が counsel へ誤射された:\n` + stolen.map(x => `    ・${x}`).join('\n'));
});

test('M-8: 6 道はすべて forge.SCALES に実在する — 行列の軸が架空でない', () => {
  for (const r of ROUTES) {
    assert.ok(Object.prototype.hasOwnProperty.call(forge.SCALES, r),
      `道 ${r} が forge.SCALES に無い — 行列の軸が実装とずれている`);
  }
  const extra = Object.keys(forge.SCALES).filter(k => !ROUTES.includes(k));
  assert.strictEqual(extra.length, 0,
    `forge.SCALES に行列が知らない道が在る: ${extra.join(', ')} — 道を足したら行列にも足せ(第61条)`);
});

// ══════════════════════════════════════════════════════════════════════
// 門番 —— **門そのものを見張る** (lesson:warden-outside-selection / 第44条)
//
// ⚠️ 故障注入 M10 / M11 / M12 が名指しで教えた穴である。
//    実装を壊す変異 8 件は全て鳴ったが、**門の側を壊す変異 3 件は全て黙った**:
//      M10 非対角 assert を `assert.strictEqual(0, 0, …)` に殺す  → exit 0
//      M11 熟議のコーパスを一行落とす                             → exit 0
//      M12 格子の主語配列を空にする                               → exit 0
//    門は自分が骨抜きにされたことを見られない。ゆえに**門の外形を数える門**を置く。
//    「門番が絞り込みの対象なら門番ではない」——
//    これらは行列を使わず、**この試験ファイルの本文と定数を直に読む**。
// ══════════════════════════════════════════════════════════════════════
const SELF_SRC = require('fs').readFileSync(__filename, 'utf8');

test('W-1 [門番]: コーパスは宣言された下限を保つ — 一行落とせば鳴る', () => {
  // M11 対策。件数の**下限を凍らせる**(上限は凍らせない — 足すのは常に善である)。
  const FLOOR = { counsel: 42, cartography: 9, reform: 11, quick: 8, standard: 9, full: 8 };
  for (const [r, n] of Object.entries(FLOOR)) {
    const have = CORPUS.filter(c => c.route === r).length;
    assert.ok(have >= n,
      `道 ${r} のコーパスが ${have} 件に減っている(下限 ${n})—— ` +
      'コーパスを削って緑にするのは門の骨抜きである(第21条)。' +
      '意図して減らすなら FLOOR も同じ commit で下げ、理由を書け。');
  }
  assert.ok(CORPUS.length >= 87, `コーパス総数が ${CORPUS.length} 件に減っている(下限 87)`);
});

test('W-2 [門番]: 格子は 3 × 10 × 5 = 150 通りを保つ — 配列を空にすれば鳴る', () => {
  // M12 対策。M-6 の中の配列は M-6 自身からは検められない(空なら空で緑になる)。
  const m = SELF_SRC.match(/const SUBJ = \[([^\]]*)\];[\s\S]{0,400}?const VERB = \[([\s\S]*?)\];[\s\S]{0,400}?const DELIB = \[([\s\S]*?)\];/);
  assert.ok(m, 'M-6 の格子の定義を読めない — 門番が門を見失っている');
  const count = s => s.split(',').map(x => x.trim()).filter(Boolean).length;
  const [ns, nv, nd] = [count(m[1]), count(m[2]), count(m[3])];
  assert.strictEqual(ns * nv * nd, 150,
    `格子が ${ns} × ${nv} × ${nd} = ${ns * nv * nd} 通りに縮んでいる —— 150 通りを保て`);
});

test('W-3 [門番]: 非対角 assert が実物の値を撃っている — 定数同士の比較に化けていない', () => {
  // M10 対策。`assert.strictEqual(0, 0, …)` のような恒真は門ではない。
  // ⚠️ 註釈を先に剥ぐ(第16条)—— 註釈に書かれた恒真は恒真ではない。
  //    実際、この門の最初の実装は**自分の註釈 2 行**を恒真として名指した。
  const code = SELF_SRC.split('\n')
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');
  const bodies = code.match(/assert\.strictEqual\(\s*([^,]+),\s*([^,]+),/g) || [];
  const tautologies = bodies.filter(b => {
    const m = b.match(/assert\.strictEqual\(\s*([^,]+),\s*([^,]+),/);
    const a = m[1].trim(), c = m[2].trim();
    return /^-?\d+$/.test(a) && /^-?\d+$/.test(c);   // 両辺が数値リテラル = 恒真/恒偽
  });
  assert.strictEqual(tautologies.length, 0,
    `両辺が数値リテラルの assert が ${tautologies.length} 件在る —— 恒真の assert は門ではない:\n` +
    tautologies.map(x => `    ・${x}`).join('\n'));
});

test('W-4 [門番]: 熟議語彙の**各語**につき、その語だけが標識の願いが在る', () => {
  // M3 対策。冗長なコーパス(標識が二つ以上)は語彙の一語が死んでも黙る。
  const src = require('fs').readFileSync(path.join(ROOT, 'graph', 'forge.js'), 'utf8');
  const m = src.match(/const DELIBERATION_JA = '([^']*)'\s*\+\s*\n\s*'([^']*)'/);
  assert.ok(m, 'DELIBERATION_JA を読めない');
  const words = (m[1] + m[2]).split('|').filter(Boolean);
  const counselWishes = CORPUS.filter(c => c.route === 'counsel').map(c => c.wish);
  const uncovered = words.filter(word => {
    // その語を含み、かつ他の熟議語を含まない counsel の願いが在るか
    return !counselWishes.some(wish =>
      wish.includes(word) && words.filter(o => o !== word && wish.includes(o)).length === 0);
  });
  assert.strictEqual(uncovered.length, 0,
    `熟議語彙 ${uncovered.length} 語が「その語だけが標識の願い」を持たない —— ` +
    'その語を抜いても門は黙る(故障注入 M3 の教訓):\n' +
    uncovered.map(x => `    ・${x}`).join('\n'));
});


console.log(`\nRoute matrix self-test: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
