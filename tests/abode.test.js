#!/usr/bin/env node
'use strict';
/**
 * abode.test.js — 住処の器と輸出の台帳を、**活きた脱法で**撃つ (憲法 第58条)
 *
 * この門は「abode.js がそう書かれていること」を確かめない。**そう鳴ること**を
 * 確かめる(第5条 / 第21条)。ゆえにここでは実際に脱法を仕込む:
 *
 *   ① 台帳に無いグローバル宛先へ書こうとする
 *   ② writer を詐称して関門を通ろうとする(旗・偽の stack・倉の外の写し)
 *   ③ 空のエントリ / プレースホルダの reason / 不正な日付を台帳に混ぜる
 *   ④ 除外を水増しする(除外リストを増やす / 名前だけ abode.js を騙る)
 *   ⑤ 新しいファイルに os.homedir() を仕込む
 *   ⑥ engine に台帳へ書く口を生やす / globalWrite を mode で分岐させる
 *
 * **この門はリポジトリに一行も書かない。** 仕掛けは全て `os.tmpdir()` の中の
 * 複製に対して行う —— 門が己の測る対象を測りながら汚してはならない(第58条(c))。
 * 実測された事故がその理由である: 版管理下の README.md を汚す門の窓に別の
 * プロセスが飛び込み、汚れた現物を読んで偽の赤を出した。
 *
 *   node tests/abode.test.js     # exit 0 = 住処の器は健全
 *
 * tests/paradise.test.js には一行も触れない。門は増やすが、既存の門は壊さない。
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DIR = __dirname;
const ROOT = path.join(DIR, '..');
const ABODE_JS = path.join(ROOT, 'graph', 'abode.js');
const abode = require(ABODE_JS);

/**
 * 走行開始時点の作業木の汚れ。**差分で裁くために先に撮る。**
 *
 * 「走行後に汚れが 0 件」では裁けない —— 他の者(並行する reform の仕事)が
 * 同じ倉で作業していれば、その汚れを自分の罪として数えてしまう。
 * 第58条(c) が問うのは「**この門が**測る対象を汚したか」であり、
 * 倉が汚れているかではない。ゆえに前後の差を採る。
 */
function worktreeDirty() {
  const r = spawnSync('git', ['-C', ROOT.split(path.sep).join('/'), 'status', '--porcelain'],
    { encoding: 'utf8' });
  if (r.status !== 0) return null;                    // git が使えない環境では黙る (第21条)
  return String(r.stdout || '').split('\n').filter(Boolean).map(s => s.trim()).sort();
}
const DIRTY_AT_START = worktreeDirty();

let pass = 0, fail = 0;
const failures = [];
function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); pass++; }
  catch (e) { console.log('  \u2717 ' + name + '\n      ' + e.message); fail++; failures.push(name); }
}

/** 子プロセスで CLI を撃つ。exit code は契約であり、出力と同じ重さを持つ。 */
function cli(args, env) {
  const r = spawnSync(process.execPath, [ABODE_JS, ...args],
    { encoding: 'utf8', cwd: ROOT, env: { ...process.env, ...(env || {}) } });
  return { code: r.status, out: String(r.stdout || '') + String(r.stderr || '') };
}

const tmps = [];
function mktmp(tag) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-abode-' + tag + '-'));
  tmps.push(d);
  return d;
}
/**
 * 偽の楽園を建てる。**現物は決して触らない。**
 * `graph/abode.js` は既定で本物の写しを置く(除外の資格を満たす形)。
 */
function fakeRepo(tag, opts = {}) {
  const root = mktmp(tag);
  fs.mkdirSync(path.join(root, 'graph'), { recursive: true });
  fs.mkdirSync(path.join(root, 'tools'), { recursive: true });
  if (opts.abodeSrc !== null) {
    fs.writeFileSync(path.join(root, 'graph', 'abode.js'),
      opts.abodeSrc || fs.readFileSync(ABODE_JS, 'utf8'));
  }
  for (const [rel, src] of Object.entries(opts.files || {})) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), src);
  }
  return root;
}

// ══════════════════════════════════════════════════════════════════════
// 1. 住所を答える器 — 由来を名乗り、何も作らない (AC-1)
// ══════════════════════════════════════════════════════════════════════
console.log('住処の解決 (第58条(a)):');

test('resolve は全住所と由来を返し、mode は repo|global の 2 値である', () => {
  const r = abode.resolve();
  for (const k of abode.KEYS) assert.ok(typeof r[k] === 'string' && r[k], `${k} の住所が空`);
  assert.ok(abode.MODES.has(r.mode), `mode が値域の外: ${r.mode}`);
  assert.ok(['env', 'default'].includes(r.source), `source が由来を名乗らない: ${r.source}`);
});

test('この段の既定は global である — 既定の反転は第4段の仕事 (AC-52)', () => {
  // **神の日常が 1 バイトも変わっていないこと**を、この一行で固定する。
  // work-4 がここを 'repo' に変える。その差分が 1 行であることが PR の可読性の要件。
  assert.strictEqual(abode.DEFAULT_MODE, 'global',
    '第0段で既定を反転させてはならない — 器を建てるのと住所を移すのは別の仕事である');
  const r = abode.resolve({ env: {} });
  assert.strictEqual(r.mode, 'global');
  assert.strictEqual(r.source, 'default');
});

test('PARADISE_ABODE=repo なら全住所が <repo> 配下で、sentinel は 0 件 (AC-1)', () => {
  const sentinel = path.join(mktmp('sentinel'), 'nowhere');
  const r = abode.resolve({ env: { PARADISE_ABODE: 'repo', HOME: sentinel, USERPROFILE: sentinel } });
  for (const k of ['abode', 'settings', 'agents', 'commands', 'rules', 'skills', 'claudeMd', 'kg', 'dailyLedger']) {
    assert.ok(r[k].startsWith(ROOT), `${k} が楽園の外を指している: ${r[k]}`);
    assert.ok(!r[k].includes('nowhere'), `${k} に sentinel が混ざっている: ${r[k]}`);
  }
  // 器は住所を答えるだけで、何も作らない(第58条: 住所を知る者と書く者を分ける)
  assert.ok(!fs.existsSync(sentinel), 'resolve が sentinel を作った — 住所を知る器が書いている');
  assert.ok(!fs.existsSync(r.abode) || fs.existsSync(path.join(ROOT, '.claude')),
    'resolve が配備の木を作った');
});

test('KG は mode=repo で配備の木の外に住む — 建て直しが記憶を消さない (第19条b)', () => {
  const r = abode.resolve({ env: { PARADISE_ABODE: 'repo' } });
  assert.ok(!r.kg.startsWith(r.abode),
    `KG が配備物の中に住んでいる: ${r.kg} — .claude はいつ消えても建て直せる産物である`);
  assert.strictEqual(r.kg, path.join(ROOT, 'graph', 'kg-store'));
});

test('個別 env は PARADISE_ABODE より強い — 既存の門の隔離を壊さない', () => {
  const box = mktmp('kgbox');
  const r = abode.resolve({ env: { PARADISE_ABODE: 'repo', PARADISE_KG: box } });
  assert.strictEqual(r.kg, path.resolve(box),
    'PARADISE_KG が効かない — tests/paradise.test.js:154 の隔離が壊れ、自己診断が本番 KG を汚す');
  assert.ok(r.overrides.some(o => o.env === 'PARADISE_KG'), '上書きを口で名乗っていない (第54条(c))');
  const r2 = abode.resolve({ env: { PARADISE_ABODE: 'repo', CLAUDE_HOME: box } });
  assert.strictEqual(r2.abode, path.resolve(box), 'CLAUDE_HOME が abode を上書きしない');
  assert.strictEqual(r2.settings, path.join(path.resolve(box), 'settings.json'),
    'CLAUDE_HOME の上書きが配下の住所に伝わっていない');
});

test('creationsAbode は workspace.js を通る — 倉の住所を二重に知らない (第30条)', () => {
  const ws = require(path.join(ROOT, 'graph', 'workspace.js'));
  assert.strictEqual(abode.resolve().creationsAbode, path.join(ws.resolve().root, '.claude'));
});

// ══════════════════════════════════════════════════════════════════════
// 2. exit code — 「検められなかった」を 0 に混ぜない (第37条)
// ══════════════════════════════════════════════════════════════════════
console.log('\nexit code の三値 (第37条: 不在は通過ではない):');

test('未知の PARADISE_ABODE は exit 2 — 黙って既定へ落とさない', () => {
  const r = cli(['resolve'], { PARADISE_ABODE: 'nonsense' });
  assert.strictEqual(r.code, 2, `検められなかったのに ${r.code} を返した: ${r.out}`);
  assert.ok(/nonsense/.test(r.out), '拒んだ値を名指ししていない');
});

test('未知の path の鍵は exit 2 で、引ける鍵を名乗る (第16条)', () => {
  const r = cli(['path', 'bogus']);
  assert.strictEqual(r.code, 2, `未知の鍵に ${r.code} を返した`);
  assert.ok(/bogus/.test(r.out) && /settings/.test(r.out), '引ける鍵を示していない');
  assert.strictEqual(cli(['path', 'agents']).code, 0, '既知の鍵が引けない');
});

test('pathFor は未知の鍵に undefined を返さず throw する', () => {
  assert.throws(() => abode.pathFor('agentz'), /未知の住所の鍵/);
});

test('未実装の migrate / retreat は exit 2 — 0 で「済んだ」ふりをしない', () => {
  for (const cmd of ['migrate', 'retreat']) {
    const r = cli([cmd, '--plan']);
    assert.strictEqual(r.code, 2, `${cmd} が ${r.code} を返した — 未実装を通過と読ませてはならない`);
  }
});

test('引数を持たない呼び出しは exit 2 で使い方を語る', () => {
  const r = cli([]);
  assert.strictEqual(r.code, 2);
  assert.ok(/usage/.test(r.out), '使い方を語らない拒絶は直せない');
});

// ══════════════════════════════════════════════════════════════════════
// 3. 台帳 — 在ることは資格ではない (第54条(b) / AC-22 / AC-24 / AC-25)
// ══════════════════════════════════════════════════════════════════════
console.log('\n台帳の実質 (第58条(b)):');

test('exports は EX-1 / EX-2 を名指しで印字し exit 0 (AC-22)', () => {
  const r = cli(['exports']);
  assert.strictEqual(r.code, 0, r.out);
  for (const s of ['EX-1', '#/permissions', 'graph/apply-guards.js', '2026-09-10',
    'EX-2', 'graph/deploy.js']) {
    assert.ok(r.out.includes(s), `印字に ${s} が無い — 黙って通した輸出は 0 件である (第54条(c))`);
  }
});

test('exports --external は hermes の 2 件を対象外にせず名乗る (AC-24)', () => {
  const r = cli(['exports', '--external']);
  assert.strictEqual(r.code, 0, r.out);
  for (const s of ['EXT-1', 'cron/jobs.json', 'EXT-2', 'paradise-catchup.py', 'external-asset', 'machine']) {
    assert.ok(r.out.includes(s), `外部資産の印字に ${s} が無い — 「対象外」を黙って対象外にしない`);
  }
  assert.ok(!/writer/.test(r.out.split('EXT-1')[1] || ''),
    '外部資産に writer を印字している — 楽園は外部資産に書かない');
});

test('CL-1 (env.PATH の裁定) が根拠つきで台帳に残っている', () => {
  const L = abode.ledger();
  const cl = L.closed.find(c => c.id === 'CL-1');
  assert.ok(cl, '閉じた問いが台帳から消えた — 散文にだけ書けば腐る (第10条)');
  assert.ok(/which gh/.test(cl.evidence) && /GitHub CLI/.test(cl.evidence),
    '裁定の根拠が実測でない — 根拠の無い「閉じた」は自己申告である (第54条(b))');
});

test('現物の台帳は実質を持つ — check --ledger が緑 (AC-25 の正)', () => {
  const f = abode.validateLedger();
  assert.deepStrictEqual(f, [], '台帳に実質の欠けたエントリが在る: ' +
    f.map(x => `${x.id}.${x.field}: ${x.why}`).join(' / '));
});

test('【脱法】空のエントリを混ぜると、field ごとに名指しで鳴る (AC-25)', () => {
  const F = abode.validateLedger({
    exports: [{ id: 'EX-9', target: '', reason: '', ordainedOn: '' }],
    external: [], closed: [],
  });
  const by = f => F.filter(x => x.id === 'EX-9' && x.field === f);
  assert.ok(by('target').length, 'target が空でも通した');
  assert.ok(by('reason').length, 'reason が空でも通した');
  assert.ok(by('ordainedOn').some(x => /日付として読めない/.test(x.why)),
    'ordainedOn が空でも「日付として読めない」と鳴らない');
  assert.ok(by('writer').length && by('kind').length && by('scope').length && by('ordainedBy').length,
    '欠けた必須 field を数え落としている — 一つ鳴れば足りるとしてはならない');
});

test('【脱法】プレースホルダの reason は「書いた」ふりとして退けられる', () => {
  const mk = reason => abode.validateLedger({
    exports: [{ id: 'EX-9', target: '~/x', kind: 'file', writer: 'graph/abode.js',
      reason, scope: 'machine', ordainedBy: 'god', ordainedOn: '2026-09-10',
      ordainedVia: 'test', verify: 'node -e 0' }], external: [], closed: [] });
  for (const p of ['TODO', 'TBD', '後で', '未定', '-', '???']) {
    assert.ok(mk(p).some(x => x.field === 'reason'), `プレースホルダ ${p} を通した`);
  }
  // 短すぎる理由はプレースホルダの変装である
  const short = 'グローバルが要る';
  assert.ok(mk(short).some(x => x.field === 'reason' && /字/.test(x.why)),
    `${short.length} 字の reason を通した — なぜ楽園内で足りないかは一文では書けない`);
  assert.strictEqual(mk('あ'.repeat(abode.REASON_MIN)).filter(x => x.field === 'reason').length, 0,
    '十分な長さの reason まで咎めた — 狼少年の門は無い門より悪い (第21条)');
});

test('【脱法】不正な日付 — 2026-02-31 は 3/3 に化けるので往復で照合する', () => {
  const mk = ordainedOn => abode.validateLedger({
    exports: [{ id: 'EX-9', target: '~/x', kind: 'file', writer: 'graph/abode.js',
      reason: 'あ'.repeat(abode.REASON_MIN), scope: 'machine', ordainedBy: 'god',
      ordainedOn, ordainedVia: 'test', verify: 'node -e 0' }], external: [], closed: [] });
  for (const bad of ['2026-02-31', '2026-13-01', '26-09-10', 'いつか', '2026/09/10']) {
    assert.ok(mk(bad).some(x => x.field === 'ordainedOn'), `不正な日付 ${bad} を通した`);
  }
  const future = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);
  assert.ok(mk(future).some(x => x.field === 'ordainedOn' && /未来/.test(x.why)),
    '未来の名指しを通した — 神はまだそれを言っていない');
  assert.strictEqual(mk('2026-09-10').filter(x => x.field === 'ordainedOn').length, 0);
});

test('【脱法】id の重複 / 形の逸脱 / 外部資産の writer を退ける', () => {
  const base = { target: '~/x', kind: 'file', writer: 'graph/abode.js',
    reason: 'あ'.repeat(abode.REASON_MIN), scope: 'machine', ordainedBy: 'god',
    ordainedOn: '2026-09-10', ordainedVia: 'test', verify: 'node -e 0' };
  const dup = abode.validateLedger({ exports: [{ ...base, id: 'EX-1' }, { ...base, id: 'EX-1' }], external: [], closed: [] });
  assert.ok(dup.some(x => /重複/.test(x.why)), '同じ id の輸出を 2 件通した');
  const shape = abode.validateLedger({ exports: [{ ...base, id: 'ex1' }], external: [], closed: [] });
  assert.ok(shape.some(x => x.field === 'id'), 'id の形を検めていない');
  const ext = abode.validateLedger({ exports: [], closed: [],
    external: [{ ...base, id: 'EXT-9', kind: 'external-asset' }] });
  assert.ok(ext.some(x => x.field === 'writer' && /読むだけ/.test(x.why)),
    '外部資産に writer を書けてしまう — 「読むだけ」の宣言が嘘になる');
});

test('【脱法】根拠の無い「閉じた」を closed に置くと鳴る (第54条(b))', () => {
  const F = abode.validateLedger({ exports: [], external: [],
    closed: [{ id: 'CL-9', subject: 'x', question: 'y', verdict: '不要',
      evidence: 'TODO', closedOn: '2026-09-10', closedBy: 'pontiff', closedVia: 'test' }] });
  assert.ok(F.some(x => x.id === 'CL-9' && x.field === 'evidence'),
    'プレースホルダの根拠で問いを閉じられる — 次の者が答えを持てない');
});

// ══════════════════════════════════════════════════════════════════════
// 4. 輸出の関門 — 呼び手は名乗りではなく実測 (第54条(a) / AC-23 / AC-26)
// ══════════════════════════════════════════════════════════════════════
console.log('\n輸出の関門 (第58条(b) / 第54条(a)):');

test('【脱法】台帳に無いグローバル宛先へ書こうとすると、1 バイトも書かせない (AC-23)', () => {
  const victim = path.join(mktmp('unlisted'), 'settings.json');
  let called = false;
  assert.throws(
    () => abode.globalWrite('~/.claude/settings.json#/statusLine',
      () => { called = true; fs.writeFileSync(victim, '{}'); }),
    /台帳に無い輸出/, '台帳に無い宛先を通した');
  assert.strictEqual(called, false, '関門が throw する前に write() を呼んだ');
  assert.ok(!fs.existsSync(victim), '拒んだのにファイルが生まれている — 1 バイトも書かない契約が破れた');
});

test('【脱法】writer を詐称した呼び出しは、実測された呼び手を名指して拒む (AC-26)', () => {
  // この試験ファイルは graph/apply-guards.js ではない。旗も名乗りも通用しない。
  let threw = null;
  try { abode.globalWrite('~/.claude/settings.json#/permissions', () => 'written'); }
  catch (e) { threw = e; }
  assert.ok(threw, '台帳の writer でない者の輸出を通した');
  assert.ok(/EX-1 の writer は graph\/apply-guards\.js/.test(threw.message), threw.message);
  assert.ok(/tests\/abode\.test\.js/.test(threw.message),
    `実測された呼び手を名指ししていない: ${threw.message}`);
});

test('【脱法】globalWrite は writer を名乗る引数を受け付けない (第54条(a))', () => {
  // 「私は apply-guards です」と旗で言う道が在れば、関門は名乗りを裁くだけになる。
  assert.strictEqual(abode.globalWrite.length, 2,
    'globalWrite が 3 つ目の引数を持っている — 自己申告の口を疑え');
  const src = fs.readFileSync(ABODE_JS, 'utf8');
  const body = src.slice(src.indexOf('function globalWrite'));
  assert.ok(!/opts\.(writer|as|caller)|arguments\[2\]/.test(body.slice(0, 1200)),
    'globalWrite が呼び手の申告を読んでいる');
});

test('【脱法】偽の Error.prepareStackTrace を仕込んでも呼び手は測られる', () => {
  const prev = Error.prepareStackTrace;
  try {
    // 攻撃: stack を細工して apply-guards を名乗らせようとする
    Error.prepareStackTrace = () => [{
      getFileName: () => path.join(ROOT, 'graph', 'apply-guards.js'),
    }];
    let threw = null;
    try { abode.globalWrite('~/.claude/settings.json#/permissions', () => 'written'); }
    catch (e) { threw = e; }
    assert.ok(threw && /呼び手は tests\/abode\.test\.js/.test(threw.message),
      `細工した stack で関門を通した: ${threw && threw.message}`);
  } finally { Error.prepareStackTrace = prev; }
  assert.strictEqual(Error.prepareStackTrace, prev, '関門が prepareStackTrace を戻していない');
});

test('【脱法】倉の外に置いた writer の写しは、writer を名乗れない', () => {
  // 攻撃: <tmp>/graph/apply-guards.js を作り、そこから関門を呼ぶ。
  // 道の末尾は一致するが、**住所が楽園の中でない**。第54条(a): 資格は住所が決める。
  const box = mktmp('outsider');
  fs.mkdirSync(path.join(box, 'graph'), { recursive: true });
  const impostor = path.join(box, 'graph', 'apply-guards.js');
  fs.writeFileSync(impostor,
    `const abode = require(${JSON.stringify(ABODE_JS.split(path.sep).join('/'))});\n` +
    `module.exports = () => abode.globalWrite('~/.claude/settings.json#/permissions', () => 'written');\n`);
  let threw = null;
  try { require(impostor)(); } catch (e) { threw = e; }
  assert.ok(threw, '倉の外の写しが writer を名乗れてしまった');
  assert.ok(/呼び手は tests\/abode\.test\.js/.test(threw.message), threw.message);
});

test('【脱法】台帳エントリの実質が欠けていれば、関門は通さない', () => {
  const led = abode.ledger();
  const orig = led.exports[0].reason;
  // 現物の台帳を書き換えず、読み込み済みの写しだけを壊す(第58条(c): 測る対象を汚さない)
  assert.ok(orig && orig.length >= abode.REASON_MIN);
  const f = abode.validateEntry({ ...led.exports[0], reason: 'TODO' }, 0, 'exports');
  assert.ok(f.some(x => x.field === 'reason'),
    '実質の欠けたエントリを関門が受け入れる — 台帳に載せただけで通ってしまう');
});

test('関門は mode を見ない — global は「台帳を迂回する」意味を持たない (AC-55)', () => {
  const self = abode.selfAudit();
  assert.deepStrictEqual(self.filter(s => /AC-55/.test(s.why)), [],
    'globalWrite が mode を見ている: ' + JSON.stringify(self));
  // 実際に global を立てても、台帳に無い宛先は通らない
  const before = process.env.PARADISE_ABODE;
  process.env.PARADISE_ABODE = 'global';
  try {
    assert.throws(() => abode.globalWrite('~/.claude/settings.json#/statusLine', () => 1),
      /台帳に無い輸出/, 'PARADISE_ABODE=global で許可制が外れた');
  } finally {
    if (before === undefined) delete process.env.PARADISE_ABODE; else process.env.PARADISE_ABODE = before;
  }
});

// ══════════════════════════════════════════════════════════════════════
// 5. 除外の四重の錠 — 除外は名前ではなく実質が与える (第54条(a)(c))
// ══════════════════════════════════════════════════════════════════════
console.log('\n除外の裏付け (第58条(a)):');

test('check は除外を口で名乗る — 黙って適用された除外は 0 件 (第54条(c))', () => {
  const r = cli(['check', '--ledger']);
  assert.ok(/除外 1 件: graph\/abode\.js/.test(r.out),
    `除外を名乗る行が出力に無い: ${r.out}`);
  assert.ok(/資格の裏付け/.test(r.out) && /homedir 呼び出し 1 箇所/.test(r.out),
    '除外の裏付けを語っていない — 名乗りだけの除外は自己申告である');
});

test('【脱法】除外リストを 2 件に水増しすると、門が自分の穴を咎める (錠1)', () => {
  // 実際に増やして撃つ。増やしたまま帰らないよう finally で戻す。
  abode.HOMEDIR_EXCLUDE_FILES.add('pulse.js');
  try {
    const a = abode.exclusionAudit();
    assert.strictEqual(a.sizeOk, false, '除外が 2 件でも門が黙っている');
    assert.ok(a.why.some(w => /除外リストが 2 件/.test(w) && /pulse\.js/.test(w)),
      '水増しされた除外を名指ししていない: ' + JSON.stringify(a.why));
    assert.strictEqual(a.ok, false);
    // 水増し中は**どのファイルにも除外を与えない** — 穴を開けたまま緑を出さない
    const refs = abode.homedirRefs();
    assert.ok(refs.some(r => r.file === 'graph/abode.js'),
      '除外が壊れているのに abode.js を除外し続けた');
  } finally { abode.HOMEDIR_EXCLUDE_FILES.delete('pulse.js'); }
  assert.strictEqual(abode.exclusionAudit().sizeOk, true, '試験が除外リストを汚したまま帰った');
});

test('【脱法】名前だけ abode.js を騙る器には、除外を与えない (錠2)', () => {
  // 実質を伴わない graph/abode.js —— os.homedir() は呼ぶが、住所の器を輸出しない
  const root = fakeRepo('hollow', {
    abodeSrc: "'use strict';\nconst os = require('os');\nconst h = os.homedir();\nmodule.exports = { h };\n",
  });
  const a = abode.exclusionAudit(root);
  assert.strictEqual(a.granted, false, '中身を検めずに名前で除外を与えた');
  assert.ok(a.missing.includes('function resolve') && a.missing.includes('function globalWrite'),
    '欠けている資格を名指ししていない: ' + JSON.stringify(a.missing));
  const refs = abode.homedirRefs(root);
  assert.ok(refs.some(r => r.file === 'graph/abode.js' && /os\.homedir/.test(r.why)),
    '資格の無い abode.js が除外を受け取り、住所の直書きが素通りした');
});

test('【脱法】倉の別の場所に abode.js を置いても除外されない (tools/abode.js)', () => {
  const root = fakeRepo('twin', {
    files: { 'tools/abode.js': "const os = require('os');\nconst p = os.homedir();\n" },
  });
  const refs = abode.homedirRefs(root);
  assert.ok(refs.some(r => r.file === 'tools/abode.js'),
    '名が同じというだけで除外された — 除外は住所で与える (第54条(a))');
});

test('【脱法】器の中で os.homedir() が 2 箇所に分裂したら鳴る (錠3)', () => {
  const src = fs.readFileSync(ABODE_JS, 'utf8') + '\nfunction second() { return os.homedir(); }\n';
  const root = fakeRepo('split', { abodeSrc: src });
  const a = abode.exclusionAudit(root);
  assert.strictEqual(a.homedirCount, 2, `器の中の呼び出しを ${a.homedirCount} と数えた`);
  assert.strictEqual(a.countOk, false, '住所を作る場所が器の中で分裂しても黙っている');
  assert.ok(a.why.some(w => /分裂/.test(w)), '分裂を名指ししていない');
});

test('註釈と文字列の中の os.homedir() は数えない — 病を説明した罰を与えない', () => {
  // 現物の abode.js は docblock と診断文で os.homedir() を何度も書く。
  // それを数えれば、門は「病を語ったこと」を咎める狼少年になる(第21条)。
  const a = abode.exclusionAudit();
  assert.strictEqual(a.homedirCount, 1,
    `走るコードの中の呼び出しを ${a.homedirCount} と数えた — 註釈・文字列を数えている`);
  assert.strictEqual(a.granted, true);
  assert.strictEqual(a.ok, true);
});

// ══════════════════════════════════════════════════════════════════════
// 6. 住所の走査 — 行を名指す。名指ししない門は直せない (AC-2 / AC-3)
// ══════════════════════════════════════════════════════════════════════
console.log('\n住所の走査 (第58条(a)):');

test('【脱法】新しいファイルに os.homedir() を仕込むと、行を名指して鳴る (AC-2)', () => {
  const root = fakeRepo('newcomer', {
    files: {
      'graph/newcomer.js': "'use strict';\nconst os = require('os');\n\n" +
        "function где() { return path.join(os.homedir(), '.claude', 'agents'); }\nmodule.exports = { где };\n",
    },
  });
  const refs = abode.homedirRefs(root);
  const hit = refs.find(r => r.file === 'graph/newcomer.js');
  assert.ok(hit, '新入りの住所の直書きを見逃した');
  assert.strictEqual(hit.line, 4, `行を取り違えた: ${hit.line}`);
  assert.ok(/os\.homedir/.test(hit.text) && hit.why, '名指しに行の中身と理由が無い');
});

test('【脱法】~/.claude リテラル / CLAUDE_CONFIG_DIR / env のホームも咎める (AC-4)', () => {
  const cases = {
    'graph/a1.js': "const p = '~/.claude/paradise-kg';\n",
    'graph/a2.js': "const p = process.env.USERPROFILE;\n",
    'graph/a3.js': "const p = process.env.CLAUDE_CONFIG_DIR;\n",
    'graph/a4.js': "const p = path.join(base, '.claude', 'agents');\n",
  };
  const root = fakeRepo('literals', { files: cases });
  const refs = abode.homedirRefs(root);
  for (const f of Object.keys(cases)) {
    assert.ok(refs.some(r => r.file === f), `${f} の住所の作り方を見逃した`);
  }
});

test('註釈は道を説明してよい — 走るコードの中の住所だけを咎める', () => {
  const root = fakeRepo('comment', {
    files: { 'graph/doc.js': "// os.homedir() は abode.js だけが呼ぶ\n/* path.join(x, '.claude') は旧い形 */\n" },
  });
  assert.deepStrictEqual(abode.homedirRefs(root).filter(r => r.file === 'graph/doc.js'), [],
    '註釈で吠える門は無視される (第21条)');
});

/**
 * **住所走査の基準値** —— この段では「増えたら赤」で守る。
 *
 * 出所は実測である(改革前 / 本走行時に再測):
 *   $ rg -o "os\.homedir\(\)" graph/*.js tools -g '!**\/node_modules\/**' | wc -l
 *   16          ← 14 ファイル / 16 箇所 (design.md §3 の付け替え地図と一致)
 * `abode.js` 自身の 1 箇所は除外の内側にあるので、この数には現れない。
 *
 * work-1 が 16 箇所を全て `abode` 経由に付け替える。**その時この門を締め直す**:
 * TODO(work-1 完了後): 下の 2 行を
 *     assert.strictEqual(refs.length, 0, ...);
 * に置き換え、KNOWN_HOMEDIR_RESIDUE ごと消すこと。
 * 基準値を残したまま work-1 を「完了」と呼べば、この門は残骸を守る門になる。
 */
const KNOWN_HOMEDIR_RESIDUE = 16;

test(`住所の直書きは基準値 ${KNOWN_HOMEDIR_RESIDUE} 件から増えていない (work-1 で 0 にする)`, () => {
  const refs = abode.homedirRefs();
  assert.ok(refs.length <= KNOWN_HOMEDIR_RESIDUE,
    `住所の直書きが ${refs.length} 件に増えた (基準 ${KNOWN_HOMEDIR_RESIDUE}) — ` +
    '新しい engine が abode.js を通さずに住所を作っている:\n' +
    refs.map(r => `  ${r.file}:${r.line}  ${r.text}`).join('\n'));
  // 減ったなら基準値を下げよ。緩んだ門は、いつか残骸を守る門になる。
  assert.ok(refs.length === KNOWN_HOMEDIR_RESIDUE || refs.length === 0,
    `住所の直書きが ${refs.length} 件に減った — この試験の KNOWN_HOMEDIR_RESIDUE を下げよ (第22条)`);
});

test(`check --count は残存を隠さず exit 1 で名指す (この段では赤が正しい)`, () => {
  const r = cli(['check', '--count']);
  assert.strictEqual(r.code, 1,
    '生産コードに住所の直書きが残っているのに緑を出した — 門を緩めて通してはならない');
  assert.ok(/graph\/pulse\.js:\d+/.test(r.out), `行を名指ししていない: ${r.out}`);
});

// ══════════════════════════════════════════════════════════════════════
// 7. 器が己に課す禁則 (AC-56)
// ══════════════════════════════════════════════════════════════════════
console.log('\n器の自制 (第54条(d)):');

test('engine は台帳へ書く口を持たない — 現物が緑 (AC-56 の正)', () => {
  assert.deepStrictEqual(abode.selfAudit(), [], '器が己の禁則を破っている');
  for (const k of Object.keys(abode)) {
    assert.ok(!/^add|^write|^append|^set/.test(k) || typeof abode[k] !== 'function',
      `台帳を育てる口らしき輸出が在る: ${k}`);
  }
});

test('【脱法】台帳へ書く関数を生やすと鳴る (AC-56 の逆)', () => {
  const base = fs.readFileSync(ABODE_JS, 'utf8');
  const variants = {
    write: base + "\nfunction later() { fs.writeFileSync(LEDGER, '{}'); }\n",
    add: base + "\nfunction addExport(e) { return e; }\n",
  };
  for (const [tag, src] of Object.entries(variants)) {
    const root = fakeRepo('selfaudit-' + tag, { abodeSrc: src });
    const f = abode.selfAudit(root);
    assert.ok(f.some(x => /第54条\(d\)/.test(x.why)),
      `${tag}: 台帳へ書く口を engine が持てた — 裁かれる側が裁きの範囲を決めている`);
  }
});

test('【脱法】globalWrite を mode で分岐させると鳴る (AC-55 の逆)', () => {
  const base = fs.readFileSync(ABODE_JS, 'utf8');
  const src = base.replace('function globalWrite(target, write) {',
    'function globalWrite(target, write) {\n  if (mode() === \'global\') return write();');
  assert.notStrictEqual(src, base, '注入に失敗した — 門を試せていない');
  const root = fakeRepo('mode-branch', { abodeSrc: src });
  const f = abode.selfAudit(root);
  assert.ok(f.some(x => /AC-55/.test(x.why)),
    'globalWrite が mode を見ても門が黙っている — global が台帳の抜け道になる');
});

// ══════════════════════════════════════════════════════════════════════
// 8. 門そのものの密閉性 (第58条(c))
// ══════════════════════════════════════════════════════════════════════
console.log('\n門の密閉性 (第58条(c)):');

test('この門は版管理下のファイルへ一行も書かない — 仕掛けは全て複製に対して行う', () => {
  const src = fs.readFileSync(path.join(DIR, 'abode.test.js'), 'utf8');
  const offenders = [];
  src.split('\n').forEach((line, i) => {
    if (!/(writeFileSync|appendFileSync|rmSync|unlinkSync|mkdirSync)\s*\(/.test(line)) return;
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*')) return;
    // 許すのは複製(mktmp / fakeRepo が返す道)配下だけ。ROOT / DIR 起点は咎める。
    if (/path\.join\(\s*(ROOT|DIR|__dirname)/.test(line)) offenders.push(`${i + 1}: ${t}`);
  });
  assert.deepStrictEqual(offenders, [],
    '門が己の測る対象を汚している — 復元しても窓は開く (第58条(c)):\n' + offenders.join('\n'));
});

test('この門を走らせても、楽園の作業木は汚れない(前後の差で裁く)', () => {
  const now = worktreeDirty();
  if (DIRTY_AT_START === null || now === null) {
    console.log('      (git が使えない環境 — 門は黙る。第21条)');
    return;
  }
  const before = new Set(DIRTY_AT_START);
  const added = now.filter(l => !before.has(l));
  assert.deepStrictEqual(added, [],
    'この門の走行が作業木を汚した — 復元しても窓は開く (第58条(c)):\n  ' + added.join('\n  '));
});

// --- report ---
for (const d of tmps) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }
console.log(`\nAbode self-test: ${pass} passed, ${fail} failed`);
if (require.main === module) process.exit(fail === 0 ? 0 : 1);
module.exports = { pass, fail, failures };
