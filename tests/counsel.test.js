#!/usr/bin/env node
/**
 * PARADISE :: Counsel self-test — 非開発の道『諐問』を裁く門
 *
 * 実測された欠陥: forge.js の道は quick/standard/full/reform の四本とも
 * build 相と verdict(SHIP/REWORK/BLOCK) を必須とする **創造の道** であった。
 * ゆえに「調査してほしい」「監査してほしい」「報告してほしい」「意見がほしい」
 * という非開発の願いがすべて standard(14相)へ誤着し、存在しない実装物に
 * 向かって build を走らせていた。この門はその再発を裁く。
 *
 *   node tests/counsel.test.js     # exit 0 = 諐問の道は健全
 *
 * tests/paradise.test.js には一行も触れない。門は増やすが、既存の門は壊さない。
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DIR = __dirname;
const ROOT = path.join(DIR, '..');
const forge = require(path.join(ROOT, 'graph', 'forge.js'));
const clergy = require(path.join(ROOT, 'graph', 'clergy.js'));
const engine = require(path.join(ROOT, 'graph', 'graph-engine.js'));

let pass = 0, fail = 0, skipped = 0;
/** 前提を欠く門が**理由を名乗って**退く口（先例: tests/guards.test.js:30 / 第37条）。 */
function skip(why) { const e = new Error(why); e.__skip = true; throw e; }
function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); pass++; }
  catch (e) {
    if (e && e.__skip) { console.log('  \u00b7 ' + name + '  (skipped: ' + e.message + ')'); skipped++; return; }
    console.log('  \u2717 ' + name + '\n      ' + e.message); fail++;
  }
}

// ══════════════════════════════════════════════════════════════════════
// 1. 判定表 — 願いはどの道へ着くか
//    設計時に教主が確定した受入基準そのもの。一行一断定。
// ══════════════════════════════════════════════════════════════════════
console.log('諐問の道 — 願いの行き先 (判定表):');

const ROUTES = [
  ['現状のCIの健全性を監査してほしい', ['counsel']],
  ['Rustの非同期ランタイムの選択肢を調査して比較表がほしい', ['counsel']],
  ['今月のPRの傾向を報告してほしい', ['counsel']],
  ['この設計は妥当か意見がほしい', ['counsel']],
  ['ハーネスの設計を見直す必要はないか', ['counsel']],
  // 主題優先: 楽園の話であっても、求められているのが答えなら諐問である
  ['楽園のエンジンを監査してほしい', ['counsel']],
  ['楽園のエンジンのバグを修正する', ['reform']],
  ['楽園に新しい門を追加してほしい', ['reform']],
  // 創造の願いを諐問へ攫ってはならない
  ['ポモドーロタイマーが欲しい', ['standard']],
  ['タスク管理アプリを作って', ['standard', 'full']],
  ['タイポを直して', ['quick']],

  // ── reform 走行『route-misfire』が塞いだ誤着 (AC-01〜05) ──────────────
  // 「既に在る物に一段足す」願いが、文書の語彙(診断/監査)に道を奪われていた。
  // 死因は三つ: (a) CREATE_RE が建造の動詞を知らない (b)「診断」が COUNSEL と
  // DOC の両方に居て打ち消しが無効化される (c) REFORM_RE が engine の固有名を知らない。
  ['楽園の自己診断に絞り込みの口を設ける', ['reform']],
  ['門に監査の一段を足す', ['reform']],
  // `--audit` はフラグ名であって依頼の動詞ではない。denude が剥ぐ (FR-02)
  ['CI に ledger --audit を追加する', ['reform']],
  // engine の固有名 `gauge` を REFORM_RE が知らず、既定の standard へ落ちていた
  ['gauge に fingerprint を確かめる口を設ける', ['reform']],

  // ── 回帰防止 — 教主が名指しした 4 件 (AC-06〜09) ─────────────────────
  ['楽園の位階の相関図を作れ', ['cartography']],
  // ⚠️ `台帳`/`ledger` を ENGINE_NAMES に入れると、この一行が reform へ攫われる (L-4)
  ['台帳の毒を直す', ['quick']],
  ['build a habit tracker app', ['full']],
  ['比較表がほしい', ['counsel']],

  // ── 既存の門が撃っている断定 — 一つも壊していない証拠 (AC-10) ──────────
  ['ログイン画面のバグを直す', ['quick']],
  ['オーケストレーションの相関図、関連図を作成し連携してほしい', ['cartography']],
  ['位階の図を描いてほしい', ['cartography']],
  ['creations のデータフローを可視化して', ['cartography']],
  ['draw a sequence diagram of the dispatch chain', ['cartography']],
  ['意図を汲んでタイマーを実装してほしい', ['standard']],
  ['地図アプリが欲しい', ['standard', 'full']],
  ['楽園の憲法に条を足せ', ['reform']],
  ['バグを直して', ['quick']],
  ['エンジンを監査してほしい', ['counsel']],
  ['ダッシュボードを生きた門にせよ', ['reform']],
  ['fix login bug', ['quick']],
  ['add a dark mode toggle', ['standard']],
  ['楽園のオーケストレーションを改善する', ['reform']],
  ['憲法に条を足す', ['reform']],
  ['improve the harness engine', ['reform']],
  ['門を強化する', ['reform']],
  ['市場の競合を調査して報告書をくれ', ['counsel']],
];

for (const [wish, want] of ROUTES) {
  test(`"${wish}" → ${want.join(' or ')}`, () => {
    const got = forge.chooseScale(wish);
    assert.ok(want.includes(got),
      `expected ${want.join('|')} but got "${got}"`);
  });
}

/**
 * **AC-04 は「何であるか」ではなく「何でないか」を撃つ**(教主裁定1)。
 *
 * 設計 §1.6 は「`fullJa` から『アプリ』を外して standard へ着けよ」と提案したが、
 * 教主はこれを**却下**した —— 本走行の主題は **counsel への誤着**であって、
 * full/standard の境目ではない。境目の病は別件に起票済み(台帳 PARA-7)。
 * ゆえに `fullJa` は一字も触っていない。撃つべきはただ一点:
 * **「診断」という文書の語彙に、産物(アプリ)を求める願いの道を奪わせない**。
 */
test('"健康診断アプリが欲しい" は counsel でない (AC-04 / 教主裁定1)', () => {
  const got = forge.chooseScale('健康診断アプリが欲しい');
  assert.notStrictEqual(got, 'counsel',
    `「診断」の一語に道を奪われている — 求められているのは文書ではなく物である (got=${got})`);
  // 何であるかも記録する。黙って通すのではなく、現在の落ち先を口に出す(第37条)。
  assert.ok(['standard', 'full'].includes(got), `創造の道のいずれかであるべき (got=${got})`);
});

// ══════════════════════════════════════════════════════════════════════
// 1b. 語彙の単体 — 道選びの部品それぞれが効いているか (AC-11 / FR-02・03・04)
// ══════════════════════════════════════════════════════════════════════
console.log('\n諐問の道 — 剥ぎと語彙の単体:');

test('denude はフラグ語・バッククォート・ファイル名を剥ぐ (FR-02)', () => {
  assert.strictEqual(forge.denude('CI に ledger --audit を追加する'), 'CI に ledger を追加する');
  assert.strictEqual(forge.denude('CI に `ledger --audit` を追加する'), 'CI に を追加する');
  assert.strictEqual(forge.denude('graph/forge.js の道選びを直す'), 'graph/ の道選びを直す');
  // **直前の一字を食ってはならない** (L-6)。素朴な実装は「CI」と「を」を繋げる。
  assert.ok(/CI /.test(forge.denude('CI --audit を足す')), '剥ぎが直前の語を食った');
});

test('denude は冪等である — 二度剥いでも同じ文', () => {
  for (const w of ['CI に `ledger --audit` を追加する', 'fix tests/x.test.js -v', '普通の願い']) {
    assert.strictEqual(forge.denude(forge.denude(w)), forge.denude(w), `冪等でない: ${w}`);
  }
});

/**
 * **`chooseScale` が実際に剥いでいること**を撃つ。
 *
 * ⚠️ `denude` の単体の門だけでは足りない —— 実測で確かめた(故障注入 変異15)。
 * `chooseScale` の中の `denude(wish)` を `String(wish)` に倒しても、
 * 誤着 5 件はどれも別の語(CI / gauge / 口)で reform に着くので **門は黙った**。
 *
 * ゆえに **剥ぎだけが答えを決める願い**で撃つ。フラグ名の中の `fix` / `app` /
 * `patch` が quick や full の語彙に当たり、剥がなければ道が変わる形である。
 */
test('chooseScale は剥いだ文で判定する — フラグ名が道を変えない (FR-02)', () => {
  for (const [wish, want] of [
    ['タスク管理に --fix オプションを足す', 'standard'],   // 剥がねば `fix` で quick
    ['買い物リストに --app 表示を足す', 'standard'],       // 剥がねば `app` で full
    ['献立表に `--patch` の口を足す', 'standard'],         // 剥がねば `patch` で quick
  ]) {
    assert.strictEqual(forge.chooseScale(wish), want,
      `chooseScale が剥いでいない — フラグ名の中の語が道を決めている: ${wish}`);
  }
});

test('denude は元の願い文を汚さない — meta.wish は原文のまま (L-5)', () => {
  const wish = 'CI に `ledger --audit` を追加する';
  assert.strictEqual(forge.buildDag(wish, 'reform').meta.wish, wish,
    '剥いだ文が meta.wish に入った — 判定用の文を記録に混ぜてはならない');
});

test('PRODUCT_RE は産物の主名詞を拾い、「図」を拾わない (FR-03 / L-8)', () => {
  for (const w of ['健康診断アプリが欲しい', '絞り込みの口を設ける', '監査の一段を足す', 'add a dark mode toggle']) {
    assert.ok(forge.PRODUCT_RE.test(w), `産物の名を見落とした: ${w}`);
  }
});

/**
 * **一字の産物名にも紛れ語が在る** — build 相の実測で発見し、設計に足した一件。
 *
 * 設計 §1.3 の L-8 は「図」についてのみこの病を警告していたが、実装して撃つと
 * 「口」「相」が **人口 / 窓口 / 相場 / 相談** の中に埋もれており、
 * **基準線で counsel だった 7 件が standard へ落ちた**(実測)。
 * 同じ病は一字の産物名すべてに在った。`DIAGRAM_FALSE_FRIENDS` と同じ作法で守る。
 *
 * この門は**基準線(変更前の振る舞い)を撃っている** —— 誤着を直すために
 * 別の誤着を作っていないことの証拠である(教主が最大の危険と呼んだもの)。
 */
test('一字の産物名の紛れ語が諐問の道を奪わない (人口/窓口/相場/相談)', () => {
  for (const [wish, want] of [
    ['市場を調査して相場を報告してほしい', 'counsel'],
    ['人口動態を調査して報告してほしい', 'counsel'],
    ['窓口の混雑を分析してほしい', 'counsel'],
    ['入口の導線を分析して所見がほしい', 'counsel'],
    ['業界の相場観を調査して比較表がほしい', 'counsel'],
  ]) {
    assert.strictEqual(forge.chooseScale(wish), want,
      `紛れ語「口/相」が産物と誤読され、諐問の道を失った: ${wish}`);
  }
  /**
   * ⚠️ 上の 5 行だけでは **紛れ語の表を空にしても門は黙る** ——
   * 実測で確かめた(故障注入 変異14)。どれも `DOC_STRONG_RE`(報告/分析/調査/所見/比較表)
   * に当たるので、紛れ語対策が死んでいても 3 段目の手前で諐問が決まるからである。
   *
   * **黙る門は門ではない。** ゆえに `DOC_STRONG_RE` に当たらない形で撃つ ——
   * 諐問の語彙が「診断 / 妥当か / 見直」しか無い願いは、紛れ語対策だけが守っている。
   */
  for (const [wish, want] of [
    ['窓口の混雑を診断してほしい', 'counsel'],
    ['人口の推移を診断してほしい', 'counsel'],
    ['相場の妥当性はどうすべきか', 'counsel'],
    ['入口の設計は妥当か', 'counsel'],
    ['窓口の運用を見直す必要はないか', 'counsel'],
  ]) {
    assert.strictEqual(forge.chooseScale(wish), want,
      `PRODUCT_FALSE_FRIENDS が効いていない — 紛れ語「口/相」が産物と誤読された: ${wish}`);
  }
});

/**
 * **強い文書の名は産物の名に勝つ。** ただし「診断/監査」だけは負ける。
 *
 * 二つの顔を持つ語(文書の名でもあり機構の機能の名でもある)はこの二語だけである。
 * 「各社の画面設計を調査して報告書がほしい」の「画面」に道を奪わせず、
 * かつ「健康診断アプリが欲しい」の「診断」には道を奪わせない —— 両向きを撃つ。
 */
test('報告書を求める願いは、産物の名を含んでも諐問である', () => {
  assert.strictEqual(forge.chooseScale('各社の画面設計を調査して報告書がほしい'), 'counsel',
    '「画面」の一語で文書の依頼が創造の道へ攫われた');
  assert.strictEqual(forge.chooseScale('競合の機能比較を調査して報告してほしい'), 'counsel',
    '「機能」の一語で文書の依頼が創造の道へ攫われた');
  // 逆向き — 二つの顔を持つ「診断」は産物の名に負ける
  assert.notStrictEqual(forge.chooseScale('健康診断アプリが欲しい'), 'counsel');
});

test('BUILD_RE は「既に在る物に一段足す」動詞を知っている (FR-01)', () => {
  for (const w of ['口を設ける', '一段を足す', '機能を追加する', 'add a flag', 'extend the engine']) {
    assert.ok(forge.BUILD_RE.test(w), `建造の動詞を見落とした: ${w}`);
  }
});

test('isCounsel の直接の断定が保存されている (AC-11)', () => {
  assert.strictEqual(forge.isCounsel('検討したツールを実装して'), false,
    '創造動詞を含む願いを諐問へ引き込んではならない');
  assert.strictEqual(forge.isCounsel('現状のCIの健全性を監査してほしい'), true);
});

test('chooseScale の返り値は文字列である (FR-05 / AC-12 / L-1)', () => {
  assert.strictEqual(typeof forge.chooseScale('何でもよい願い'), 'string',
    'object に変えれば admit().scale === chooseScale() を撃つ門が一斉に嘘になる');
});

test('COUNSEL_JA / COUNSEL_EN の定数名が forge.js に残っている (FR-06 / AC-13 / L-2)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'graph', 'forge.js'), 'utf8');
  assert.ok(/const COUNSEL_JA\s*=/.test(src), 'COUNSEL_JA が消えた — 壊れ engine の門が撃てなくなる');
  assert.ok(/const COUNSEL_EN\s*=/.test(src), 'COUNSEL_EN が消えた');
});

test('admit の裁定は chooseScale と一致する (AC-17 / paradise.test.js:8566 の主張)', () => {
  const w = 'ポモドーロタイマーを作れ';
  assert.strictEqual(forge.admit(w, 'nonexistent').scale, forge.chooseScale(w));
});

/**
 * **ENGINE_NAMES は測って作る — ただし測るのは門の側である**(設計 §1.5 / 第22条)。
 *
 * `forge.js` の中で `fs.readdirSync` を走らせてはならない —— `chooseScale` が
 * ディスクを読む副作用を持てば、ファイルが増減するたび道選びが黙って変わる。
 * それは「測る」ではなく「揺れる」である。
 *
 * ゆえに語彙は静的に書き、**この門が照合する**。engine が増えたら赤くなって
 * 人に知らせる —— 語彙に一語足す仕事が生まれるのは、正しい代である。
 *
 * ⚠️ **rework 相で門の形が変わった**(AC-31)。語彙は一枚の表ではなく
 *    **強い名 / 弱い名の二枚**になった。engine が増えたとき、人は
 *    「どちらへ載せるか」を選ばねばならない —— それが選ばせたい問いである。
 *    世間一般の語と衝突する名を強い名へ置けば、世間の願いが reform へ攫われる。
 */
test('ENGINE_NAMES が graph/*.js の名を網羅している — 強い名か弱い名のどちらかに (第22条 / 設計 §1.5)', () => {
  const names = fs.readdirSync(path.join(ROOT, 'graph'))
    .filter(f => f.endsWith('.js'))
    .map(f => f.slice(0, -3))
    .filter(n => n.length >= 4 && /^[a-z][a-z-]*$/.test(n));
  const strong = new Set(forge.ENGINE_NAMES_STRONG.split('|'));
  const weak = new Set(forge.ENGINE_NAMES_WEAK.split('|'));
  const missing = names.filter(n => !strong.has(n) && !weak.has(n));
  assert.deepStrictEqual(missing, [],
    `engine が増えたのに道選びの語彙が知らない: ${missing.join(', ')} — ` +
    'forge.js の ENGINE_NAMES_STRONG か ENGINE_NAMES_WEAK のどちらかに足せ' +
    '(世間一般の語と衝突するなら WEAK へ)');
  // 二分であること — 同じ名が両方に居れば、どちらの規則で裁かれるか読めない
  const both = [...strong].filter(n => weak.has(n));
  assert.deepStrictEqual(both, [], `強い名と弱い名の両方に居る: ${both.join(', ')} — 二分は排他でなければならない`);
  // 束ねた表は二つの和である(`ENGINE_NAMES` を読む他の門・文書のため)
  assert.deepStrictEqual(new Set(forge.ENGINE_NAMES.split('|')), new Set([...strong, ...weak]),
    'ENGINE_NAMES が強弱の和でない — 網羅の照合が嘘になる');
  // 逆向き: 禁則の語が紛れ込んでいないか (L-4)
  for (const forbidden of ['ledger', '台帳']) {
    assert.ok(!strong.has(forbidden) && !weak.has(forbidden),
      `ENGINE_NAMES に ${forbidden} が入った — 「台帳の毒を直す」が quick から reform へ攫われる`);
  }
  /**
   * **世間一般の語を強い名へ置いてはならない** (AC-31 / rework 相の核心)。
   *
   * 実測した 10 件の誤射は全てこの形であった。名指しで禁じる ——
   * engine が増えたとき、人がうっかり `vendor` を強い名へ戻す道を塞ぐ。
   */
  for (const common of ['identity', 'vendor', 'contract', 'census', 'pulse', 'deploy',
    'domains', 'workflow', 'ci', 'atlas', 'upstream', 'derived', 'lessons', 'workspace']) {
    assert.ok(!strong.has(common),
      `世間一般の語 "${common}" が強い名に入った — 「a ${common} management app」が reform へ攫われる`);
  }
});

// ══════════════════════════════════════════════════════════════════════
// 1c. **逆向きの誤着** — 世間の願いを reform へ攫わない (AC-31 / rework 相)
//
// ⚠️ これは build 相が**直したつもりで新しく生んだ病**である。
//    `ENGINE_NAMES` を一枚の表にして `REFORM_RE` に流し込んだ結果、
//    `workflow` `identity` `vendor` `ci` … という**世間一般の語**を踏んだだけの
//    創造の願いが、楽園の engine を改造する 11 相の道へ拉い去られた。
//    誤着を直して別の誤着を生む —— requirements が名指しで禁じた振る舞いそのもの。
//
//    設計 §1.5 はこの穴を見落としていた。「engine の名を網羅せよ」とは言ったが、
//    「engine の名の**半分は世間の語である**」とは言わなかった。
// ══════════════════════════════════════════════════════════════════════
console.log('\n道選び — 世間の願いを reform へ攫わない (AC-31):');

/** 教主が HEAD 3b726f5 で実測した 10 件。当たった弱い名を括弧に記す。 */
const WORLDLY_MEASURED = [
  ['build a workflow automation app for my team', 'workflow'],
  ['an identity verification service for startups', 'identity'],
  ['a vendor management dashboard', 'vendor'],
  ['build a contract review tool', 'contract'],
  ['make a census data explorer', 'census'],
  ['a pulse oximeter tracking app', 'pulse'],
  ['deploy a static site for my blog', 'deploy'],
  ['atlas という名の地図アプリを作れ', 'atlas'],
  ['CIに合格するためのアプリが欲しい', 'ci'],
  ['顧客のワークフローを管理するアプリが欲しい', 'ワークフロー'],
];

/**
 * 本走行の神官が自ら考えた 14 件。実測の 10 件だけでは、
 * **その 10 語だけを特別扱いする実装**でも門が緑になってしまう(第21条)。
 * 弱い名の全てと、冠詞の各形(a/an/the/my/our/your/their)を踏ませる。
 */
const WORLDLY_OWN = [
  ['a domains registrar comparison site', 'domains'],
  ['the upstream supplier tracker we discussed', 'upstream'],
  ['our derived metrics dashboard for sales', 'derived'],
  ['a lessons booking app for tutors', 'lessons'],
  ['your workspace booking tool for the office', 'workspace'],
  ['their identity card printing service', 'identity'],
  ['make a pulse survey app for employees', 'pulse'],
  ['build a vendor invoice scanner', 'vendor'],
  ['create a contract expiry reminder', 'contract'],
  ['a census tract map viewer', 'census'],
  ['build an atlas of local hiking trails', 'atlas'],
  ['ベンダー管理アプリが欲しい', 'vendor(和)'],
  ['社内のワークフローを描く業務アプリを作って', 'ワークフロー'],
  ['deploy キーを配るだけの小さな画面が欲しい', 'deploy'],
];

for (const [wish, why] of [...WORLDLY_MEASURED, ...WORLDLY_OWN]) {
  test(`"${wish}" は reform でない — 弱い名 ${why} に道を奪われない (AC-31)`, () => {
    const got = forge.chooseScale(wish);
    assert.notStrictEqual(got, 'reform',
      `世間の創造の願いが engine 改修の 11 相へ攫われた(当たった弱い名: ${why})`);
    // 何であるかも名乗る — 黙って通さない(第37条)
    assert.ok(['standard', 'full'].includes(got),
      `創造の道のいずれかであるべき (got=${got})`);
  });
}

/**
 * **弱い名も、楽園を名指していれば reform に留まる** —— 逆向きの証明。
 *
 * 門を「弱い名は常に reform でない」に倒せば上の 24 件は緑になるが、
 * それは弱い名を語彙から消したのと同じで、`CI に ledger --audit を追加する` が死ぬ。
 * ゆえに**両向きを撃つ**(第36条: 門は消すのではなく分ける)。
 */
test('弱い名も建造の動詞を伴えば reform に留まる (AC-31 の逆向き)', () => {
  for (const wish of [
    'CI に ledger --audit を追加する',
    'ci に一段の門を足す',
    'workflow に再試行の口を設ける',
    'census に fix の口を足す',
    'add a retry flag to the deploy engine',
  ]) {
    assert.strictEqual(forge.chooseScale(wish), 'reform',
      `弱い名が建造の動詞を伴っているのに reform を名乗らない — 語彙を消したのと同じ: ${wish}`);
  }
  // 強い名は単独で名乗る(建造の動詞が無くても)
  assert.strictEqual(forge.chooseScale('gauge に fingerprint を確かめる口を設ける'), 'reform');
  assert.strictEqual(forge.isReformSubject('conclave の毒を除く'), true,
    '強い名が単独で楽園を名指せなくなった');
});

/**
 * **冠詞の除外そのもの**を撃つ。`isReformSubject` の単体である。
 *
 * `a vendor` は世間の物を一つ指す語法であり、楽園の器官の名指しではない。
 * ただし **冠詞を伴わない `vendor` に建造の動詞**が付けば、それは楽園の話でありうる。
 */
test('冠詞の直後の弱い名は楽園を名指さない (AC-31)', () => {
  for (const art of ['a', 'an', 'the', 'my', 'our', 'your', 'their']) {
    assert.strictEqual(forge.isReformSubject(`add a flag to ${art} vendor page`), false,
      `冠詞 "${art}" の直後の弱い名が楽園と誤読された`);
  }
  // 冠詞が無ければ、建造の動詞を伴って楽園を名指す
  assert.strictEqual(forge.isReformSubject('add a flag to vendor'), true,
    '冠詞なしの弱い名が建造の動詞を伴っても楽園を名指さない — 除外が効きすぎている');
  // ⚠️ 語末の `a` を冠詞と誤読してはならない(後読みの先頭 `\b` が守る)
  assert.strictEqual(forge.isReformSubject('media workflow に口を足す'), true,
    '"media" の末尾の a が冠詞と誤読された — 後読みの \\b が消えている');
});

/**
 * **冠詞の除外だけが守っている 6 件** —— 門を黙らせないための実測 (第21条)。
 *
 * ⚠️ 上の 24 件は **どれも建造の動詞を持たない**。ゆえに冠詞の除外を消しても
 *    `BUILD_RE` の伴需が独りで守り、**門は一本も鳴らない**(故障注入で実測)。
 *    黙る門は門ではない。ゆえに **建造の動詞を持ちながら世間の願いである**形で撃つ ——
 *    「自分のアプリの vendor 画面に一段足す」は楽園の改革ではない。
 *    この 6 件は冠詞の除外が死ねば即座に赤くなる。
 */
test('冠詞の直後の弱い名は、建造の動詞を伴っても reform でない (AC-31 / 冠詞の除外の単独証明)', () => {
  for (const [wish, why] of [
    ['add a dark mode toggle to my vendor dashboard', 'my vendor'],
    ['add CSV export to our census explorer app', 'our census'],
    ['extend the workflow builder in my todo app', 'the workflow'],
    ['add a filter to the vendor list screen', 'the vendor'],
    ['enable dark mode in their identity card app', 'their identity'],
    ['add a search box to my atlas of hiking trails', 'my atlas'],
  ]) {
    // 前提の確認 — 建造の動詞を確かに持っている(持たなければ門は別の理由で緑になる)
    assert.ok(forge.BUILD_RE.test(forge.denude(wish)),
      `この門の前提が崩れた — 建造の動詞を持たない例では冠詞の除外を撃てない: ${wish}`);
    const got = forge.chooseScale(wish);
    assert.notStrictEqual(got, 'reform',
      `冠詞の除外が死んでいる — "${why}" が楽園の器官と誤読された`);
    assert.ok(['standard', 'full'].includes(got), `創造の道のいずれかであるべき (got=${got})`);
  }
});

// ══════════════════════════════════════════════════════════════════════
// 2. 道の形 — 産まない道であること
// ══════════════════════════════════════════════════════════════════════
console.log('\n諐問の道 — 何も創らないことの証明:');

test('counsel という第5の道が存在する', () => {
  assert.ok(forge.SCALES.counsel, '非開発の道が無ければ、非開発の願いは必ず創造の道へ落ちる');
});

test('counsel の道は build / tests / verdict 相を一つも持たない', () => {
  const ids = forge.buildDag('probe', 'counsel').tasks.map(t => t.id);
  for (const forbidden of ['build', 'build-ui', 'tests', 'verdict', 'prove']) {
    assert.ok(!ids.includes(forbidden),
      `counsel は物を産まぬ道である — "${forbidden}" 相があってはならない (現: ${ids.join(', ')})`);
  }
});

test('counsel の道は survey/measure/assess/counter/synthesize/counsel の6相である', () => {
  const ids = forge.buildDag('probe', 'counsel').tasks.map(t => t.id);
  assert.deepStrictEqual(ids, ['survey', 'measure', 'assess', 'counter', 'synthesize', 'counsel']);
});

test('counsel の終端相は推奨を返す(断罪ではない)', () => {
  const tasks = forge.buildDag('probe', 'counsel').tasks;
  const last = tasks[tasks.length - 1];
  assert.strictEqual(last.id, 'counsel');
  assert.strictEqual(last.artifact, 'counsel.md');
  assert.strictEqual(last.agent, 'executor');
  assert.ok(last.gate, '最後の相は門でなければならない');
});

test('他の4本の道には依然として build 相がある(壊していない証拠)', () => {
  for (const scale of ['quick', 'standard', 'full', 'reform']) {
    const ids = forge.buildDag('probe', scale).tasks.map(t => t.id);
    assert.ok(ids.includes('build'), `${scale} の道から build が消えている — 創造の道を壊した`);
    assert.ok(ids.includes('verdict'), `${scale} の道から verdict が消えている`);
  }
});

test('meta.produces が道の性質を宣言する (counsel=document / 他=artifact)', () => {
  assert.strictEqual(forge.buildDag('p', 'counsel').meta.produces, 'document');
  for (const scale of ['quick', 'standard', 'full', 'reform']) {
    assert.strictEqual(forge.buildDag('p', scale).meta.produces, 'artifact',
      `${scale} は創造物を産む道である`);
  }
});

test('meta の既存キーは一つも壊れていない', () => {
  const m = forge.buildDag('願い', 'standard').meta;
  for (const key of ['wish', 'scale', 'created', 'constitution', 'gates']) {
    assert.ok(key in m, `meta.${key} が消えている — 既存の読み手が黙って壊れる`);
  }
  assert.strictEqual(m.wish, '願い');
  assert.ok(Array.isArray(m.gates) && m.gates.length > 0);
});

// ══════════════════════════════════════════════════════════════════════
// 3. 並列 — 外を調べる者と手元を測る者は同時に立つ
// ══════════════════════════════════════════════════════════════════════
console.log('\n諐問の道 — survey と measure は並列に立つ:');

test('survey と measure は同じ波(wave)に入る', () => {
  const dag = forge.buildDag('probe', 'counsel');
  const tmp = path.join(os.tmpdir(), 'paradise-counsel-dag-' + process.pid + '.json');
  fs.writeFileSync(tmp, JSON.stringify(dag));
  try {
    const waves = engine.schedule(engine.loadDag(tmp));
    const waveOf = new Map();
    waves.forEach((w, i) => w.forEach(id => waveOf.set(id, i)));
    assert.strictEqual(waveOf.get('survey'), 0, 'survey は依存を持たない — 第1波にいるべき');
    assert.strictEqual(waveOf.get('measure'), 0, 'measure は依存を持たない — 第1波にいるべき');
    assert.strictEqual(waveOf.get('survey'), waveOf.get('measure'),
      '外の世界を調べる者と手元を測る者は同時に立つ');
    // 波は 4 段: [survey,measure] → assess → counter → synthesize → counsel
    assert.ok(waveOf.get('assess') > 0 && waveOf.get('counsel') === waves.length - 1);
  } finally { try { fs.unlinkSync(tmp); } catch {} }
});

test('counsel の DAG は engine の検証を通る(循環も宙吊り依存も無い)', () => {
  const tmp = path.join(os.tmpdir(), 'paradise-counsel-valid-' + process.pid + '.json');
  fs.writeFileSync(tmp, JSON.stringify(forge.buildDag('probe', 'counsel')));
  try {
    const v = engine.validate(engine.loadDag(tmp));
    assert.strictEqual(v.ok, true, `invalid DAG: ${JSON.stringify(v.errors)}`);
  } finally { try { fs.unlinkSync(tmp); } catch {} }
});

// ══════════════════════════════════════════════════════════════════════
// 4. 統治 — 無主の相を許さない (憲法 第23条)
// ══════════════════════════════════════════════════════════════════════
console.log('\n諐問の道 — 全ての相に主が居る:');

test('枢機卿 counsel が存在し、6相すべてを統べる', () => {
  const c = clergy.COLLEGE.counsel;
  assert.ok(c, '諐問の枢機卿が居なければ、報告・集計の担い手は0体のままである');
  assert.strictEqual(c.domain, 'Counsel (諐問)');
  assert.deepStrictEqual(c.governs, ['survey', 'measure', 'assess', 'counter', 'synthesize', 'counsel']);
  /**
   * **4人目の `requirements-analyst` は後から麾下に加わった**(第25条の是正)。
   *
   * `assess`(事実を突き合わせて筋を立てる)は forge.js:171 で
   * `agent: 'requirements-analyst'` と**道が宣言している**。だが彼は counsel の
   * 麾下に居なかったため、`marshalPlan` は他家の神官への発令を正しく拒み、
   * 筆頭 `market-researcher` へ落としていた — **宣言と発令が静かに食い違って
   * いた**。指揮系統を跨がせるのではなく、麾下に加えて正したのが現在の姿である。
   *
   * この門はその是正より**古かった**。3人を期待したまま CI から呼ばれず、
   * 赤いまま誰にも気付かれずに住み続けていた(第44条)。
   */
  assert.deepStrictEqual(c.priests, ['market-researcher', 'auditor', 'reporter', 'requirements-analyst']);
  assert.deepStrictEqual(c.believers, ['web-scout', 'feature-ranker', 'data-collector']);
  assert.strictEqual(c.reviewClass, 'executor');
});

test('counsel の全相がどれかの枢機卿/執行官に統べられている(無主の相が無い)', () => {
  for (const t of forge.buildDag('probe', 'counsel').tasks) {
    const card = clergy.cardinalFor(t.id);
    assert.ok(card, `相 "${t.id}" に主が居ない — 誰も審査しない相が生まれている`);
  }
});

test('ungovernedPhases() は全5本の道を見て何も返さない', () => {
  const ca = require(path.join(ROOT, 'graph', 'check-agents.js'));
  const un = ca.ungovernedPhases();
  assert.strictEqual(un.length, 0, `無主の相: ${JSON.stringify(un)}`);
});

test('相名の衝突が無い: analyze は requirements のまま、諐問は assess を使う', () => {
  assert.strictEqual(clergy.cardinalFor('analyze'), 'requirements',
    'analyze の主を諐問が奪ってはならない — full の道が壊れる');
  assert.strictEqual(clergy.cardinalFor('assess'), 'counsel');
  const ids = forge.buildDag('p', 'counsel').tasks.map(t => t.id);
  assert.ok(!ids.includes('analyze'), '諐問の道は analyze を名乗らない(名の混同は事故を生む)');
});

test('counsel の道が名指す神官は全て clergy に実在する', () => {
  const ca = require(path.join(ROOT, 'graph', 'check-agents.js'));
  const res = ca.check();
  // engine が述べた理由をそのまま名乗る。黙った return は N skipped に数えられない。
  if (res.skipped) skip(typeof res.skipped === 'string' ? res.skipped : (res.note || 'check-agents が検められない'));
  assert.deepStrictEqual(res.missing, [], `宙吊り参照: ${JSON.stringify(res.dangling)}`);
});

// ══════════════════════════════════════════════════════════════════════
// 5. 実体 — 新エージェントは overlay/agents に住むか (憲法 第19/25条)
// ══════════════════════════════════════════════════════════════════════
console.log('\n諐問の道 — 新しい担い手に実体があるか:');

const OVERLAY_AGENTS = path.join(ROOT, 'overlay', 'agents');

for (const [name, want] of [
  ['auditor', { model: 'claude-sonnet-5', effort: 'high', needsTask: true }],
  ['reporter', { model: 'claude-sonnet-5', effort: 'high', needsTask: true }],
  ['data-collector', { model: 'haiku', effort: null, needsTask: false }],
]) {
  test(`overlay/agents/${name}.md が実在し、位階どおりの宣言を持つ`, () => {
    const file = path.join(OVERLAY_AGENTS, `${name}.md`);
    assert.ok(fs.existsSync(file),
      `${file} が無い — ~/.claude/agents は deploy.js の成果物であり、原本は overlay に住まねばならない(第19条)`);
    const src = fs.readFileSync(file, 'utf8');
    assert.ok(/^---\r?\n/.test(src), 'frontmatter が無い');
    assert.ok(new RegExp(`^name:\\s*${name}\\s*$`, 'm').test(src), 'name が file 名と一致しない');
    assert.ok(/^description:\s*\S/m.test(src), 'description が無い');
    assert.ok(new RegExp(`^model:\\s*${want.model}\\s*$`, 'm').test(src), `model: ${want.model} でない`);
    if (want.effort === null) {
      assert.ok(!/^effort:/m.test(src),
        'haiku は effort を受けない — 捨てられる宣言は宣言ではない(第10条)');
    } else {
      assert.ok(new RegExp(`^effort:\\s*${want.effort}\\s*$`, 'm').test(src), `effort: ${want.effort} でない`);
    }
    const tools = (src.match(/^tools:\s*(.+)$/m) || [])[1];
    assert.ok(tools, 'tools が無い');
    const list = tools.split(',').map(s => s.trim());
    for (const t of ['Read', 'Grep', 'Glob', 'Bash', 'Write']) {
      assert.ok(list.includes(t), `tools に ${t} が無い`);
    }
    if (want.needsTask) {
      assert.ok(list.includes('Task'),
        `神官 ${name} は信徒を擁する — 起動の道具 ${clergy.SPAWN_TOOL} が無ければ階層は宣言だけになる(第25条)`);
    }
    assert.ok(!list.includes('Edit') || name !== 'auditor',
      '監査官は読み取り専用である — 測定が対象を変えたら、それはもう測定ではない');
  });
}

test('新エージェント3体は overlay.json の own に登録されている(配備に乗る)', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'overlay', 'overlay.json'), 'utf8'));
  const own = (cfg.own && cfg.own.agents) || [];
  for (const f of ['auditor.md', 'reporter.md', 'data-collector.md']) {
    assert.ok(own.includes(f), `overlay.json の own.agents に ${f} が無い — 配備されず宙吊りになる`);
  }
});

test('信徒 data-collector に務めの説明がある(名前だけの階層を作らない)', () => {
  const role = clergy.believerRole('data-collector');
  assert.ok(role && !/fine-grained work under the priest/.test(role),
    '既定文言のままなら、その信徒は何をするか誰も決めていない');
});

// ══════════════════════════════════════════════════════════════════════
// 6. 門を、わざと壊して鳴るか試す (憲法 第21条)
//    健全な系しか見たことのない門は、試されたことがない門である。
// ══════════════════════════════════════════════════════════════════════
console.log('\n諐問の道 — 門を壊して鳴ることの証明:');

/** forge.js の写しを作り、諐問の語彙を潰した版を読み込む。 */
function forgeWithBrokenCounselVocabulary() {
  const src = fs.readFileSync(path.join(ROOT, 'graph', 'forge.js'), 'utf8');
  // 日本語語彙・英語語彙の両方を、決して一致しないものに差し替える
  const broken = src
    .replace(/^const COUNSEL_JA = '.*';$/m, "const COUNSEL_JA = '(?!)x_never_matches_x';")
    .replace(/^const COUNSEL_EN = '.*';$/m, "const COUNSEL_EN = 'x_never_matches_x';");
  assert.ok(broken !== src, 'COUNSEL_JA / COUNSEL_EN を差し替えられなかった — 門の壊し方が古い');
  const tmp = path.join(os.tmpdir(), 'paradise-forge-broken-' + process.pid + '.js');
  fs.writeFileSync(tmp, broken);
  try {
    delete require.cache[require.resolve(tmp)];
    return require(tmp);
  } finally { try { fs.unlinkSync(tmp); } catch {} }
}

test('COUNSEL_RE を空にすると判定は崩れる(門が効いている証拠)', () => {
  const broken = forgeWithBrokenCounselVocabulary();
  /**
   * 諐問の願いが、諐問でなくなる。
   *
   * ⚠️ **期待値が二度動いた。両方とも語彙を足し引きした必然の帰結である**
   * (第57条 — 門を緑にするために期待値を実装へ倒したのではない):
   *
   *   1. `standard` → `reform`: reform 走行『route-misfire』の FR-04 が
   *      `REFORM_RE` に engine の固有名を加え、その中に **`CI`** が入った。
   *   2. `reform` → `standard`: 同走行の **rework 相** が engine 名を
   *      強い名と弱い名に割り、**`CI` は弱い名になった**(AC-31)。弱い名は
   *      建造の動詞を伴って初めて楽園を名指す。「現状の CI の健全性を
   *      監査してほしい」に建造の動詞は無いので、諐問の語彙を失えば
   *      **世間の願い**として `standard` へ落ちる —— これが正しい姿である。
   *      1. の落ち先(reform)こそが、世間の願いを engine 改修へ攫う病だった。
   *
   * **門の主張は一字も緩めていない** —— 「語彙を潰せば counsel でなくなる」を撃ち続ける。
   * 落ち先を `notStrictEqual('counsel')` で誤魔化さず、**どこへ落ちるかまで名指しする**。
   */
  assert.strictEqual(broken.chooseScale('現状のCIの健全性を監査してほしい'), 'standard',
    '語彙を潰しても counsel のままなら、COUNSEL_RE は判定に効いていない');
  assert.strictEqual(broken.chooseScale('楽園のエンジンを監査してほしい'), 'reform',
    '語彙を潰せば主題優先は消え、楽園の話は reform へ落ちる');
  // 健全な engine では、同じ願いが諐問に着く
  assert.strictEqual(forge.chooseScale('現状のCIの健全性を監査してほしい'), 'counsel');
  assert.strictEqual(forge.chooseScale('楽園のエンジンを監査してほしい'), 'counsel');
});

test('日本語に \\b を使うと語彙は死ぬ(既存バグの回帰固定)', () => {
  // かつて quick/full の正規表現は日本語語彙まで \b で囲んでいた。単語境界は
  // 日本語文中で事実上決して立たないので、日本語の願いは全て standard に落ちた。
  const withBoundary = /\b(修正|バグ|直す)\b/;
  assert.strictEqual(withBoundary.test('タイポを直して'), false,
    '日本語に \\b を使えば一致しない — これが実際に埋まっていた欠陥である');
  // 現在の engine は同じ願いを正しく quick へ送る
  assert.strictEqual(forge.chooseScale('タイポを直して'), 'quick');
  assert.strictEqual(forge.chooseScale('ログイン画面のバグを直す'), 'quick');
});

test('創造の除外が効いている(除外を外せば創造の願いが攫われる)', () => {
  // 「欲しい」を含む創造の願いは諐問に着いてはならない
  assert.strictEqual(forge.chooseScale('ポモドーロタイマーが欲しい'), 'standard');
  // ただし求められているものが文書なら、諐問でよい
  assert.strictEqual(forge.chooseScale('Rustの非同期ランタイムの選択肢を調査して比較表がほしい'), 'counsel');
  // 除外そのものの証明: 創造動詞ありかつ文書でない願いは isCounsel が false
  assert.strictEqual(forge.isCounsel('検討したツールを実装して'), false,
    '創造動詞を含む願いを諐問へ引き込んではならない');
  assert.strictEqual(forge.isCounsel('現状のCIの健全性を監査してほしい'), true);
});

// ─────────────────────────────────────────────────────────────────────
console.log('\n諐問の道 — 元老院は諐問を批准できるか (第32条の隣人):');

/*
 * ⚠️ 第32条で counsel を建てたとき、**元老院(synod.js)を更新し忘れた**。
 * critiquePlan は「discovery 枢機卿が居ない」「tribunal が居ない」を無条件の
 * 欠陥としており、これは創造の道だけを前提にした検査だった。counsel は調査を
 * 己の survey/measure 相で行い、創造物を産まないので裁く tribunal も持たない。
 * 結果、**建てたその日に、その道は入口で拒まれた**:
 *   ⚠️ Plan still has gaps at max scale — pontiff must intervene
 *
 * 構造を変えたなら、旧い前提を符号化した門を全て読み直さねばならない。
 * だが門は **消すのではなく分ける** — 創造には創造の、諐問には諐問の厳しさを。
 */
const synod = require(path.join(ROOT, 'graph', 'synod.js'));

test('元老院は諐問の計画を批准する — 建てた道が入口で拒まれない', () => {
  const convo = synod.draftConvocation('楽園全体を監査し、残る欠陥を洗い出す');
  assert.strictEqual(convo.scale, 'counsel');
  const r = synod.critiquePlan(convo);
  assert.strictEqual(r.ok, true,
    '諐問の計画が批准されない: ' + r.gaps.join(' / '));
});

test('創造の道は依然として厳しい — 門を緩めていない証拠', () => {
  const fake = { scale: 'standard', cardinals: [
    { cardinal: 'construction', phases: ['build'], priests: ['architect'], reviewClass: 'cardinal:quality' },
  ] };
  const r = synod.critiquePlan(fake);
  assert.strictEqual(r.ok, false, '創造の道から discovery と tribunal を抜いても素通りしてはならない');
  assert.ok(r.gaps.some(g => /discovery/.test(g)), 'discovery の不在を名指すこと');
  assert.ok(r.gaps.some(g => /tribunal/.test(g)), 'tribunal の不在を名指すこと');
});

test('諐問から survey を抜くと鳴る — 外を調べぬ諐問は憶測', () => {
  const c = { scale: 'counsel', cardinals: [
    { cardinal: 'counsel', phases: ['measure', 'assess', 'counter', 'synthesize', 'counsel'],
      priests: ['auditor'], reviewClass: 'executor' },
  ] };
  const r = synod.critiquePlan(c);
  assert.strictEqual(r.ok, false);
  assert.ok(r.gaps.some(g => /survey/.test(g)), 'survey の不在を名指すこと');
});

test('諐問から measure を抜くと鳴る — 手元を測らぬ諐問は伝聞', () => {
  const c = { scale: 'counsel', cardinals: [
    { cardinal: 'counsel', phases: ['survey', 'assess', 'counter', 'synthesize', 'counsel'],
      priests: ['auditor'], reviewClass: 'executor' },
  ] };
  const r = synod.critiquePlan(c);
  assert.ok(r.gaps.some(g => /measure/.test(g)), 'measure の不在を名指すこと');
});

test('諐問から counter を抜くと鳴る — 己を疑わぬ諐問は断定', () => {
  const c = { scale: 'counsel', cardinals: [
    { cardinal: 'counsel', phases: ['survey', 'measure', 'assess', 'synthesize', 'counsel'],
      priests: ['auditor'], reviewClass: 'executor' },
  ] };
  const r = synod.critiquePlan(c);
  assert.ok(r.gaps.some(g => /counter/.test(g)), 'counter の不在を名指すこと');
});

test('諐問に build/tests/verdict が紛れ込めば鳴る (第32条)', () => {
  for (const bad of ['build', 'tests', 'verdict']) {
    const c = { scale: 'counsel', cardinals: [
      { cardinal: 'counsel', phases: ['survey', 'measure', 'assess', 'counter', 'synthesize', 'counsel', bad],
        priests: ['auditor'], reviewClass: 'executor' },
    ] };
    const r = synod.critiquePlan(c);
    assert.ok(r.gaps.some(g => g.includes(`'${bad}'`)),
      `諐問の道に ${bad} が在っても鳴らないなら、諐問はいずれ創造の道に戻る`);
  }
});

test('道の性質によらぬ掟は両方に効く — 神官なき枢機卿は両道で欠陥', () => {
  for (const scale of ['counsel', 'standard']) {
    const c = { scale, cardinals: [
      { cardinal: scale === 'counsel' ? 'counsel' : 'discovery',
        phases: ['survey', 'measure', 'counter'], priests: [], reviewClass: 'executor' },
    ] };
    const r = synod.critiquePlan(c);
    assert.ok(r.gaps.some(g => /no priest/.test(g)), `${scale}: 神官なき枢機卿を見逃した`);
  }
});

// ─────────────────────────────────────────────────────────────────────
console.log('\n断罪の門 — 不在は通過ではない (第37条):');

/*
 * ⚠️ 実測された欠陥: **空のレポート `{}` が SHIP を得ていた。**
 *   $ echo '{}' > r.json && node graph/verdict.js judge r.json  →  exit 0 (SHIP)
 *
 * 全検査が「値が在る」ことを前提にしており、`report.security` が無ければ
 * `sec = {}` で `sec.issues || 0` は 0 — 「検査していない」が「問題ゼロ」と
 * 同義だった。断罪の門が素通しなら、その上の全ての門は意味を失う。
 */
const verdict = require(path.join(ROOT, 'graph', 'verdict.js'));

test('空のレポートは SHIP されない — 何も検証していない報告は通過ではない', () => {
  const r = verdict.judge({});
  assert.notStrictEqual(r.verdict, 'SHIP',
    '空の {} が SHIP を得るなら、断罪の門は素通しである');
  assert.strictEqual(r.verdict, 'BLOCK', '安全性が不明なら BLOCK (第4条)');
});

test('security の不在は BLOCK — 不明な安全性は証明された安全性ではない', () => {
  const r = verdict.judge({ build: 'pass', tests: { total: 9, passed: 9, failed: 0 } });
  assert.strictEqual(r.verdict, 'BLOCK');
  assert.ok(r.breaches.some(b => /security was never assessed/.test(b)),
    'セキュリティ未検査を名指すこと');
});

test('中身の無い security 報告も BLOCK — 名前だけの証拠は証拠でない (第16条)', () => {
  const r = verdict.judge({ build: 'pass', tests: { total: 9, passed: 9, failed: 0 }, security: {} });
  assert.strictEqual(r.verdict, 'BLOCK');
});

test('tests の不在は REWORK — 試験なき実装は未検証', () => {
  const r = verdict.judge({ build: 'pass', security: { issues: 0, secrets: 0 } });
  assert.strictEqual(r.verdict, 'REWORK');
  assert.ok(r.defects.some(d => /tests were never reported/.test(d)));
});

test('試験0件は REWORK — 空の試験は試験ではない', () => {
  const r = verdict.judge({
    build: 'pass', security: { issues: 0, secrets: 0 },
    tests: { total: 0, passed: 0, failed: 0 },
  });
  assert.strictEqual(r.verdict, 'REWORK');
});

test('完全な報告は依然として SHIP — 門を塞いだが緩めていない', () => {
  const r = verdict.judge({
    build: 'pass',
    tests: { total: 9, passed: 9, failed: 0, coverage: 92 },
    security: { issues: 0, secrets: 0 },
    // 第38条: artifact の道では走行も測られて初めて「完全な報告」である
    trajectory: { score: 92, reworkCount: 0, firstPassRate: 1, loopGuardTrips: 0 },
  });
  assert.strictEqual(r.verdict, 'SHIP',
    '正当な報告まで塞ぐなら、それは門ではなく壁である');
});

test('諐問(produces:document)は build/tests を要求されない (第32条・第36条)', () => {
  const r = verdict.judge({ produces: 'document' });
  assert.strictEqual(r.verdict, 'SHIP',
    '諐問は創造物を産まない。実装物の証拠を求めるのは道を取り違えている');
});

test('秘密の混入は今も BLOCK — 既存の裁きを壊していない', () => {
  const r = verdict.judge({
    build: 'pass', tests: { total: 9, passed: 9, failed: 0 },
    security: { issues: 0, secrets: 2 },
  });
  assert.strictEqual(r.verdict, 'BLOCK');
  assert.ok(r.breaches.some(b => /secret/.test(b)));
});

test('相ごとに相応しい神官が指揮される — 実体を作って命令が届かぬ階層は階層でない (第25条)', () => {
  const lead = p => clergy.marshalPlan(p).priest;
  // かつて全6相が priests[0] = market-researcher に落ち、auditor と reporter は
  // 一度も指揮されなかった。コメントは「相に最も適した神官を選ぶ」と述べていた。
  assert.strictEqual(lead('survey'), 'market-researcher', '外を調べるのは市場調査の神官');
  assert.strictEqual(lead('measure'), 'auditor', '手元を測るのは監査の神官');
  /**
   * **`assess` は `requirements-analyst` である。かつてこの門は `auditor` を期待していた。**
   *
   * 裁いた根拠(第57条 — 門を緑にするために期待値を実装へ倒したのではない):
   *   1. 道が宣言している — forge.js:171 `{ id: 'assess', agent: 'requirements-analyst' }`。
   *      誰が相を担うかを決めるのは道であり、PHASE_LEAD はそれに従う側である。
   *   2. clergy.js の註釈が、麾下に加えた理由を第25条として語っている。
   *   3. 決定的 — 複製で `PHASE_LEAD.assess` を `auditor` へ倒すと、**CI に結線済みの**
   *      `node graph/check-agents.js` が exit 1 で鳴る:
   *        🔴 misrouted: assess (scale: counsel) — 宣言 requirements-analyst だが
   *           発令先は auditor (counsel の筆頭に落ちている)
   *
   * 二つの門が正反対を要求し、**呼ばれていた方が正しかった**。この門は孤児
   * だったため、実装が是正された日から更新されず赤いまま住み続けた(第44条)。
   */
  assert.strictEqual(lead('assess'), 'requirements-analyst',
    '事実を突き合わせて筋を立てるのは要件の神官 — forge.js の宣言と check-agents がそう裁く');
  assert.strictEqual(lead('counter'), 'auditor', '反証は実測に忠実な者が担う');
  assert.strictEqual(lead('synthesize'), 'reporter', '編むのは報告の神官');
  assert.strictEqual(lead('counsel'), 'reporter');
  // 四名すべてが実際に指揮される(名ばかりの神官を作らない)
  // requirements-analyst を数に加えるのは**門を厳しくする方向**である。麾下に
  // 居るのに一度も指揮されない神官が生まれれば、それこそ第25条の病だからである。
  const leads = new Set(['survey', 'measure', 'assess', 'counter', 'synthesize', 'counsel'].map(lead));
  for (const p of clergy.COLLEGE.counsel.priests) {
    assert.ok(leads.has(p), `${p} が一度も指揮されない — 実体だけ作って命令が届いていない`);
  }
});

test('創造の道の指揮系統は壊れていない', () => {
  const lead = p => clergy.marshalPlan(p).priest;
  assert.strictEqual(lead('specify'), 'requirements-analyst');
  assert.strictEqual(lead('design'), 'architect');
  assert.strictEqual(lead('build'), 'architect');
  assert.strictEqual(lead('review'), 'code-reviewer');
});

test('指揮系統を跨いだ発令はしない — 表が他家の神官を指しても自家に落ちる', () => {
  // PHASE_LEAD が枢機卿の擁さぬ者を指した場合、筆頭神官へ安全に落ちること。
  const m = clergy.marshalPlan('discover');
  const c = clergy.COLLEGE[m.cardinal];
  assert.ok(c.priests.includes(m.priest),
    `発令先 ${m.priest} が枢機卿 ${m.cardinal} の神官ではない — 指揮系統を跨いでいる`);
  for (const p of ['survey', 'measure', 'assess', 'counter', 'synthesize', 'counsel']) {
    const mm = clergy.marshalPlan(p);
    assert.ok(clergy.COLLEGE[mm.cardinal].priests.includes(mm.priest),
      `${p}: 発令先 ${mm.priest} が ${mm.cardinal} の神官ではない`);
  }
});

// --- report ---
console.log(`\nCounsel self-test: ${pass} passed, ${fail} failed` + (skipped ? `, ${skipped} skipped` : ''));
process.exit(fail === 0 ? 0 : 1);
