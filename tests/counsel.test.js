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

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); pass++; }
  catch (e) { console.log('  \u2717 ' + name + '\n      ' + e.message); fail++; }
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
];

for (const [wish, want] of ROUTES) {
  test(`"${wish}" → ${want.join(' or ')}`, () => {
    const got = forge.chooseScale(wish);
    assert.ok(want.includes(got),
      `expected ${want.join('|')} but got "${got}"`);
  });
}

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
  assert.deepStrictEqual(c.priests, ['market-researcher', 'auditor', 'reporter']);
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

test('counsel の道が名指す司祭は全て clergy に実在する', () => {
  const ca = require(path.join(ROOT, 'graph', 'check-agents.js'));
  const res = ca.check();
  if (res.skipped) return;   // ハーネス未配置の環境では検査しない
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
        `司祭 ${name} は信徒を擁する — 起動の道具 ${clergy.SPAWN_TOOL} が無ければ階層は宣言だけになる(第25条)`);
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
  // 諐問の願いが、諐問でなくなる
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

// --- report ---
console.log(`\nCounsel self-test: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
