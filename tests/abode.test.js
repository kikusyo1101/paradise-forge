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

test('反転の差分は 1 行である — 段階は定数一つが表す (AC-52 / design §1.3)', () => {
  /**
   * **AC-52 の意味はここで変わらない。** 第0段では「反転してはならない」を、
   * 第4段では「反転は 1 行で表されねばならない」を守る —— どちらも同じ要件、
   * すなわち**段階が一箇所にだけ住むこと**の両面である。
   *
   * ソースを実際に走査して数える。`DEFAULT_MODE` に値を代入する行が 2 本在れば、
   * 反転は 1 行の差分ではなくなり、design §1.3 が PR の可読性の要件として
   * 置いた形が壊れる。かつ二箇所が食い違えば、住所は静かに割れる。
   */
  const src = fs.readFileSync(ABODE_JS, 'utf8').split('\n');
  const assigns = src
    .map((l, i) => ({ i: i + 1, t: l.trim() }))
    .filter(x => /^const\s+DEFAULT_MODE\s*=/.test(x.t));
  assert.strictEqual(assigns.length, 1,
    '既定を決める行が 1 本でない — 段階は一箇所にだけ住まねばならない: ' + JSON.stringify(assigns));
  assert.ok(/'repo'|"repo"/.test(assigns[0].t),
    `第4段の既定は repo である: ${assigns[0].t}`);
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

test('第4段の既定は repo である — 素の走行が楽園の内を向く (AC-54)', () => {
  /**
   * **この一行が段階を表す。**(design §1.3)
   * 第0〜3段は `'global'`(神の日常を 1 バイトも変えない)。第4段でここが `'repo'` に
   * 反転した —— **差分は 1 行**であり、戻すのも 1 行である(design §8 危険2 の退路)。
   *
   * ⚠️ この門は「定数が repo であること」だけでは足りない。定数を見て `resolve()` が
   * 別の答えを返すなら、宣言と実測が割れている(第10条)。ゆえに**両方**を見る。
   */
  assert.strictEqual(abode.DEFAULT_MODE, 'repo',
    '既定が反転していない — 第4段は既定を repo にする段である');
  const r = abode.resolve({ env: {} });
  assert.strictEqual(r.mode, 'repo', '定数は repo なのに resolve が別の答えを返した');
  assert.strictEqual(r.source, 'default', 'env 無しで source が default でない');
});

test('反転は実測でも効いている — 素の resolve の全住所が <repo> 配下 (AC-54 / work-4 完了条件)', () => {
  /**
   * **子プロセスで、env を一つも立てずに撃つ。** 親の process.env を継いだ
   * `resolve()` は、試験走行が立てた `PARADISE_*` を吸ってしまいうる ——
   * それでは「素の走行」を測ったことにならない(第58条(c) の同型)。
   */
  const clean = { ...process.env };
  for (const k of Object.keys(clean)) if (/^PARADISE_|^CLAUDE_HOME$/.test(k)) delete clean[k];
  const r = spawnSync(process.execPath, [ABODE_JS, 'resolve', '--json'],
    { encoding: 'utf8', cwd: ROOT, env: clean });
  assert.strictEqual(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.strictEqual(j.mode, 'repo');
  assert.strictEqual(j.source, 'default');
  for (const k of ['abode', 'settings', 'agents', 'commands', 'rules', 'skills', 'claudeMd', 'kg', 'dailyLedger']) {
    assert.ok(j[k].startsWith(ROOT),
      `素の走行で ${k} が楽園の外を指している: ${j[k]} — 反転が効いていない (AC-54)`);
  }
  // `home` は診断専用であり住所ではない。ここだけは外を指してよい(むしろ指すべき)。
  assert.ok(!j.home.startsWith(path.join(ROOT, '.claude')), 'home が住所に化けている');
});

test('外を向かせるのは global の明示だけである — 逆向き (AC-54)', () => {
  const g = abode.resolve({ env: { PARADISE_ABODE: 'global', USERPROFILE: 'C:\\sentinel-home' } });
  assert.strictEqual(g.mode, 'global');
  assert.strictEqual(g.source, 'env', '明示したのに source が env でない');
  assert.ok(!g.abode.startsWith(ROOT), 'global を名乗ったのに楽園の内を向いている');
  assert.ok(g.kg.includes('paradise-kg'), 'global の KG が配備の木の外の名を持たない');
});

test('retreat --plan は実装された(第6段 / work-6)—— 計画を印字して exit 0', () => {
  /**
   * **第5段までは「未実装は exit 2」が正しかった。** 第6段で撤収を計る器が建った以上、
   * 同じ門は「**計画が印字され、permissions が計画に含まれない**」を守る側へ回る
   * (AC-29)。門を消すのではなく、**同じ問いの答えが変わったことを門に書く**。
   */
  const r = cli(['retreat', '--plan']);
  assert.strictEqual(r.code, 0, `retreat --plan が ${r.code} を返した:\n${r.out.slice(0, 800)}`);
  assert.ok(/--write は存在しない/.test(r.out), '器が書かないことを口で名乗っていない');
  assert.ok(/台帳 EX-1 が機械的判断を阻んだ/.test(r.out), 'AC-29 の裁定を印字していない');
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
 * **住所走査はゼロを要求する。**
 *
 * 改革前の実測(work-1 の出発点):
 *   $ node graph/abode.js check --count
 *   ✗ 楽園の住所を直に作っている engine (16 件) — abode.js を通せ   ← exit 1
 *     14 ファイル / 16 箇所 (design.md §3 の付け替え地図と一致)
 *
 * work-1 が 16 箇所を全て `abode` 経由に付け替えた。ゆえにこの門は
 * **基準値を捨ててゼロを要求する**。基準値を残したまま work-1 を「完了」と
 * 呼べば、この門は残骸を守る門になる —— 緩んだ門は、いつか残骸を守る門になる。
 * `abode.js` 自身の 1 箇所は除外の内側にあるので、この数には現れない
 * (除外の裏付けは `exclusionAudit` の四重の錠が別に検めている)。
 */
test('住所の直書きは生産コードに一つも無い (第58条(a))', () => {
  const refs = abode.homedirRefs();
  assert.deepStrictEqual(refs.map(r => `${r.file}:${r.line}  ${r.text}`), [],
    `住所の直書きが ${refs.length} 件残っている — abode.js を通していない engine が在る`);
});

test('check --count は残存ゼロを exit 0 で答える (work-1 の完了条件)', () => {
  const r = cli(['check', '--count']);
  assert.strictEqual(r.code, 0,
    `check --count が exit ${r.code} — 住所の直書きが残っている:\n${r.out}`);
  // **門を緩めて緑にしていないこと**を、除外の名乗りで確かめる(第54条(c))。
  assert.ok(/除外 1 件: graph\/abode\.js/.test(r.out),
    `除外を黙って適用している(名乗りの行が無い): ${r.out}`);
});

test('【逆】新しい engine が住所を直に作れば check --count は赤に戻る', () => {
  // 門がゼロを要求するようになった以上、**1 件でも鳴ること**を実際に撃つ。
  // 在ることを資格と認めない(第54条(b))—— 緑は「撃っても鳴らない」ではなく
  // 「撃てば鳴る門が、今は鳴っていない」でなければならない。
  const root = fakeRepo('residue', {
    files: {
      'graph/newcomer.js':
        "const os = require('os');\nconst path = require('path');\n" +
        "const AGENTS = path.join(os.homedir(), '.claude', 'agents');\n",
    },
  });
  const refs = abode.homedirRefs(root).filter(r => r.file === 'graph/newcomer.js');
  assert.strictEqual(refs.length, 1, `新しい直書きを名指せていない: ${JSON.stringify(refs)}`);
  assert.strictEqual(refs[0].why, 'os.homedir() の直接呼び出し');
});

/**
 * **住所走査は `check` の既定経路に入っている。**
 *
 * work-1 の問い:「基準値をゼロへ締め直したなら、`--count` を旗なしの `check` に
 * 入れられるか」。答えは**入っている**(`check()` の `all` 分岐が住所走査を
 * 常に走らせる)。だが「入っている」を散文で述べれば腐る(第10条)。
 * ゆえに**旗を立てずに撃って赤になること**を門が握る —— 誰かが将来
 * `--count` を旗つきの特別扱いに戻せば、ここが鳴る。
 */
test('旗を立てない check も住所走査を走らせる (--count は既定経路に在る)', () => {
  const root = fakeRepo('default-path', {
    files: {
      'graph/rogue.js':
        "const os = require('os');\nconst path = require('path');\n" +
        "const D = path.join(os.homedir(), '.claude');\n",
    },
  });
  const bare = abode.check({ repoRoot: root });             // 旗を一つも立てない
  assert.strictEqual(bare.ok, false, '旗なしの check が住所の直書きを見逃した');
  assert.ok(bare.homedir.some(h => h.file === 'graph/rogue.js'),
    `旗なしの check が行を名指していない: ${JSON.stringify(bare.homedir)}`);
  // 台帳の段も同時に走ること(既定は --all である)を、旗つきとの差で確かめる。
  const onlyCount = abode.check({ repoRoot: root, count: true });
  assert.deepStrictEqual(onlyCount.ledger, [], '--count だけで台帳の段まで走っている');
});

// ══════════════════════════════════════════════════════════════════════
// 6.5 静かな緑 / 旗の作法 (AC-43 / AC-44 / 第37条)
// ══════════════════════════════════════════════════════════════════════
console.log('\n静かな緑の根絶 (第58条(e)):');

/**
 * **改革前、この器は知らない旗を黙って捨てて緑を返していた。**
 * 第3段の着手時に実測した(build-3-evidence.md §0.1):
 *
 *     $ node graph/abode.js check --silent-green
 *       ✓ 住所は abode.js に集まり…
 *     EXIT=0                 ← --silent-green という旗を一つも知らないまま緑
 *
 * `printCheck` は三つの旗しか読まず、当たらない旗は捨て、「旗が無い」ことにして
 * `--all` を走らせていた。すなわち**検めていないものを「検めて違反が無かった」と
 * 答えていた** —— 第37条の正面違反であり、この器が診断している病そのものである。
 */
test('知らない旗は exit 2 — 黙って捨てて緑を返さない (第37条)', () => {
  const r = cli(['check', '--no-such-flag']);
  assert.strictEqual(r.code, 2,
    `知らない旗が exit ${r.code} — 2(検められなかった)でなければ 0 と混ざる:
${r.out}`);
  assert.ok(/知らない旗/.test(r.out), `何が知られなかったかを名乗っていない: ${r.out}`);
  // 知る旗は**全て**受け取れること(綴りを変えた日に片方だけ落ちるのを防ぐ)
  for (const flag of Object.keys(abode.CHECK_FLAGS)) {
    const ok = cli(['check', flag]);
    assert.notStrictEqual(ok.code, 2, `知る旗 ${flag} が exit 2 で拒まれた:
${ok.out}`);
  }
});

test('check --silent-green は黙った早期 return ゼロを exit 0 で答える (AC-43)', () => {
  const r = cli(['check', '--silent-green']);
  assert.strictEqual(r.code, 0,
    `--silent-green が exit ${r.code} — 黙って緑に落ちる門が残っている:
${r.out}`);
  assert.deepStrictEqual(abode.silentGreens(), [],
    '黙った早期 return が残っている — skip() を使え');
});

test('【逆】黙った return を 1 行戻せば行を名指して鳴る (AC-44)', () => {
  // 緑は「撃っても鳴らない」ではなく「撃てば鳴る門が、今は鳴っていない」である。
  const root = fakeRepo('silent-green', { files: {
    'tests/rogue.test.js':
      "const fs = require('fs');\n" +
      "test('x', () => {\n  if (!fs.existsSync(p)) return;\n  assert.ok(1);\n});\n",
  } });
  const hits = abode.silentGreens(root).filter(h => h.file === 'tests/rogue.test.js');
  assert.strictEqual(hits.length, 1, `黙った return を名指せていない: ${JSON.stringify(hits)}`);
  assert.strictEqual(hits[0].line, 3, `名指した行がずれている: ${hits[0].line}`);
  assert.ok(/黙って return/.test(hits[0].why), `理由を述べていない: ${hits[0].why}`);
});

test('註釈と文字列の中の早期 return は数えない — 病を説明した罰を与えない', () => {
  // `tests/paradise.test.js` は変異注入のために違反コードを**文字列として**持つ
  // (E5 変異)。これを咎めれば、門は自分の病名を書けなくなる。
  const root = fakeRepo('silent-green-quoted', { files: {
    'tests/doc.test.js':
      "// if (!fs.existsSync(p)) return;  ← これは註釈である\n" +
      "const mutate = s => s.replace('  if (!fs.existsSync(root)) return out;\\n', '');\n",
  } });
  assert.deepStrictEqual(abode.silentGreens(root).filter(h => h.file === 'tests/doc.test.js'), [],
    '註釈と文字列の中の疑似コードを咎めている — 病を説明した罰を与えてはならない');
});

test('check --symmetry は兄弟の engine が同じ口から住所を得ていることを握る (AC-20)', () => {
  const a = abode.symmetryAudit();
  assert.strictEqual(a.ok, true, `対称性が破れている:\n${a.why.join('\n')}`);
  assert.strictEqual(a.rows.length, 2, '突き合わせる兄弟が 2 本でない');
  for (const row of a.rows) assert.ok(row.expr, `${row.file} の式を読めていない`);
  assert.strictEqual(a.rows[0].expr, a.rows[1].expr,
    `apply-models と apply-spawn の式が違う: ${JSON.stringify(a.rows)}`);
});

test('【逆】兄弟の片方が別の口を使えば --symmetry は鳴る', () => {
  const root = fakeRepo('asymmetry', { files: {
    'graph/apply-models.js': "const AGENT_DIR = abode.pathFor('agents');\n",
    'graph/apply-spawn.js': "const AGENTS_DIR = () => process.env.CLAUDE_HOME + '/agents';\n",
  } });
  const a = abode.symmetryAudit(root);
  assert.strictEqual(a.ok, false, '非対称を見逃した — 同じ倉に二つの答えが在る状態である');
  assert.ok(a.why.join('\n').includes('AC-20'), `AC を名乗っていない: ${a.why.join(' / ')}`);
});

test('check --hermetic は hermetic.js へ委譲し、偽の倉では名乗って skip する', () => {
  const r = cli(['check', '--hermetic']);
  assert.strictEqual(r.code, 0, `--hermetic が exit ${r.code}:
${r.out}`);
  // **作法を二重に書いていないこと**(第29条: 同じ問いに二つの答えを持たない)
  const src = fs.readFileSync(ABODE_JS, 'utf8');
  assert.ok(/require\(['"]\.\/hermetic\.js['"]\)/.test(src),
    'hermetic の判定を abode.js が自前で持っている — 同じ問いの答えが二つになる');
  // 偽の倉は「検められなかった」。黙って緑にしない(第37条)
  const root = fakeRepo('hermetic-foreign', {});
  const far = abode.check({ repoRoot: root, hermetic: true });
  assert.strictEqual(far.hermetic, null, '偽の倉を自分の倉として走査した');
  assert.ok(far.hermeticSkipped && /現物の倉/.test(far.hermeticSkipped),
    `skip を名乗っていない: ${far.hermeticSkipped}`);
});

// ══════════════════════════════════════════════════════════════════════
// 6.6 輸出の腐食 — 出した先も門が見張る (AC-27 / AC-28)
// ══════════════════════════════════════════════════════════════════════
console.log('\n輸出の照合 (第58条(b)):');

test('exports --verify EX-1 は実機の permissions を照合する (AC-27)', () => {
  const v = abode.verifyExport('EX-1');
  if (v.skipped) {
    // 実機が無い機(CI)。**名乗って** skip する —— 黙って緑にしない。
    assert.ok(/EX-1 は検めない/.test(v.skipped), `skip の理由が形を成していない: ${v.skipped}`);
    return;
  }
  assert.strictEqual(v.ok, true, `EX-1 の輸出が腐っている:\n${v.why.join('\n')}`);
  assert.deepStrictEqual(v.counts, { deny: 9, ask: 1, allow: 5 },
    `permissions の数が台帳の記録と違う: ${JSON.stringify(v.counts)}`);
});

test('照合の道を持たない輸出に 0 を返さない — exit 2 である (第37条)', () => {
  // 「この器では検められない」を緑にすれば、第5段で --creations を作り忘れても
  // 誰も気づかない。**未実装は緑ではない。**
  const r = cli(['exports', '--verify', 'EX-2']);
  assert.strictEqual(r.code, 2, `EX-2 の照合が exit ${r.code} — 未実装を 0 で答えている:
${r.out}`);
  assert.ok(/check --creations/.test(r.out), '照合の道を示していない — 赤くなっても進めない');
});

test('exportRealPath は台帳の ~ を器だけが解く (住所が二本にならない)', () => {
  const fake = mktmp('ex1-home');
  const p = abode.exportRealPath('EX-1', { env: { USERPROFILE: fake, HOME: fake } });
  assert.strictEqual(p, path.join(fake, '.claude', 'settings.json'),
    `台帳の住所を解けていない: ${p}`);
  // `<creations-root>` のような解けない記法には null を返す(推測で埋めない — 第16条)
  assert.strictEqual(abode.exportRealPath('EX-2'), null,
    '解けない記法を推測で解いている — 住所は推測してはならない');
});

// ══════════════════════════════════════════════════════════════════════
// 6.5 移設 — 記憶は「移す」のであって「消す」のではない (AC-9 / AC-10 / 第4段)
// ══════════════════════════════════════════════════════════════════════
console.log('\n移設の照合 (第58条 / AC-9・AC-10):');

/**
 * 偽の移設元と移設先を建てる。**現物の KG には一行も触らない**(第58条(c))。
 * `migrateVerify({from,to})` は住処の写しを直に受け取れるので、
 * env を弄って本物の解決器を騙す必要が無い —— 騙せる門は門ではない。
 */
function fakeSides(tag, opts = {}) {
  const fromKg = mktmp(tag + '-from-kg');
  const toKg = mktmp(tag + '-to-kg');
  const fromDaily = path.join(mktmp(tag + '-from-d'), 'paradise-daily.json');
  const toDaily = path.join(mktmp(tag + '-to-d'), 'paradise-daily.json');
  const lines = (n, seed) => Array.from({ length: n }, (_, i) => JSON.stringify({ id: seed + i })).join('\n') + '\n';
  for (const [dir, mult] of [[fromKg, 1], [toKg, opts.toMult === undefined ? 1 : opts.toMult]]) {
    if (mult === null) continue;                       // null = そのファイルを作らない(未移設)
    fs.writeFileSync(path.join(dir, 'nodes.jsonl'), lines(opts.nodes === undefined ? 5 : opts.nodes, 'n'));
    fs.writeFileSync(path.join(dir, 'edges.jsonl'), lines(3, 'e'));
    fs.writeFileSync(path.join(dir, 'cochange.jsonl'), lines(2, 'c'));
  }
  fs.writeFileSync(fromDaily, '{"lastDate":"2026-09-01"}\n');
  if (opts.toMult !== null) fs.writeFileSync(toDaily, '{"lastDate":"2026-09-01"}\n');
  return { from: { kg: fromKg, dailyLedger: fromDaily }, to: { kg: toKg, dailyLedger: toDaily },
           fromKg, toKg, fromDaily, toDaily };
}

test('移設が完全なら緑 — 行数と sha256 の集合が一致する (AC-9 の正)', () => {
  const s = fakeSides('mig-ok');
  const v = abode.migrateVerify({ from: s.from, to: s.to });
  assert.strictEqual(v.ok, true, '完全な移設が赤になった: ' + JSON.stringify(v.rows));
  assert.deepStrictEqual(v.unmeasurable, []);
  assert.strictEqual(v.rows.length, abode.MIGRATE_TARGETS.length, '対象の数が合わない');
  for (const r of v.rows) assert.strictEqual(r.sha, true, `${r.file} の sha が立っていない`);
});

test('【逆】移設先の nodes.jsonl から 1 行削ると赤くなり、数を名指す (AC-10)', () => {
  // **実際に削る。** 「削ったつもり」の門は、削られたことを検出できない。
  const s = fakeSides('mig-short');
  const p = path.join(s.toKg, 'nodes.jsonl');
  const kept = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).slice(0, -1);
  fs.writeFileSync(p, kept.join('\n') + '\n');

  const v = abode.migrateVerify({ from: s.from, to: s.to });
  assert.strictEqual(v.ok, false, '移設先が 1 行欠けているのに緑を出した — 記憶が静かに失われる');
  const row = v.rows.find(r => r.file === 'nodes.jsonl');
  assert.strictEqual(row.sha, false);
  assert.strictEqual(row.from, 5);
  assert.strictEqual(row.to, 4);
  // **数を名指せ。**「一致しない」だけでは、どちらが欠けたか判らず直せない。
  assert.ok(/5 期待 \/ 4 実測/.test(row.why), `数を名指していない: ${row.why}`);
});

test('【逆】移設先が丸ごと無ければ赤 — 「移した」の自己申告では通らない (AC-10)', () => {
  const s = fakeSides('mig-none', { toMult: null });
  const v = abode.migrateVerify({ from: s.from, to: s.to });
  assert.strictEqual(v.ok, false, '移設が一件も済んでいないのに緑を出した');
  for (const r of v.rows) {
    assert.strictEqual(r.sha, false, `${r.file} が不在なのに緑`);
    assert.ok(/移設先が無い/.test(r.why), `不在を名乗っていない: ${r.why}`);
  }
});

test('【逆】行数が同じでも中身が違えば赤 — 数の一致は偶然でありうる (AC-9)', () => {
  const s = fakeSides('mig-swap');
  const p = path.join(s.toKg, 'edges.jsonl');
  const n = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).length;
  fs.writeFileSync(p, Array.from({ length: n }, (_, i) => JSON.stringify({ id: 'BOGUS' + i })).join('\n') + '\n');

  const v = abode.migrateVerify({ from: s.from, to: s.to });
  assert.strictEqual(v.ok, false, '行数だけ合わせた偽物が通った — 行数は中身の保証ではない');
  const row = v.rows.find(r => r.file === 'edges.jsonl');
  assert.strictEqual(row.from, row.to, '前提が崩れている(行数は等しいはず)');
  assert.strictEqual(row.sha, false);
  assert.ok(/sha256 の集合が違う/.test(row.why), `中身の違いを名指していない: ${row.why}`);
});

test('移設元が無いのは「検められなかった」= exit 2 — 0 にも 1 にも混ぜない (第37条 / §1.4)', () => {
  const s = fakeSides('mig-nosrc');
  fs.rmSync(path.join(s.fromKg, 'nodes.jsonl'));
  const v = abode.migrateVerify({ from: s.from, to: s.to });
  assert.strictEqual(v.ok, false, '基点が無いのに緑');
  assert.ok(v.unmeasurable.some(u => /nodes\.jsonl/.test(u)),
    '検められなかった物を名指していない: ' + JSON.stringify(v.unmeasurable));
  const row = v.rows.find(r => r.file === 'nodes.jsonl');
  assert.strictEqual(row.sha, null, '検められなかった行に真偽を付けている(0 と 2 を混ぜている)');
});

test('【脱法】移設元と移設先が同じ住所なら exit 2 — 自分と自分は比べさせない', () => {
  // 個別 env が両側に掛かれば、照合は必ず緑になる。**それは検めたことにならない。**
  const same = mktmp('mig-same');
  assert.throws(
    () => abode.migrateVerify({ from: { kg: same, dailyLedger: path.join(same, 'd.json') },
                                to: { kg: same, dailyLedger: path.join(same, 'd.json') } }),
    /同じ住所である/,
    '移設元と移設先が同じでも照合を通した — 自己比較は永久に緑である');
});

test('migrate は --write を持たない — 住所を知る器は書かない (§1.5 / 第58条)', () => {
  const r = cli(['migrate', '--write']);
  assert.strictEqual(r.code, 2, `--write が exit ${r.code} を返した — 存在しない旗を受けている`);
  assert.ok(/--write を持たない/.test(r.out), '境界を口で語っていない');
  // ソースにも書く口が無いことを実測で示す(註釈だけの宣言は機構ではない — 第10条)
  const src = fs.readFileSync(ABODE_JS, 'utf8').split('\n');
  const start = src.findIndex(l => /^function migratePlan\s*\(/.test(l));
  const end = src.findIndex(l => /^function migrateVerify\s*\(/.test(l));
  assert.ok(start >= 0 && end > start);
  for (let i = start; i <= end; i++) {
    assert.ok(!/(writeFileSync|appendFileSync|copyFileSync|mkdirSync|rmSync)\s*\(/.test(src[i]),
      `migrate が書いている: ${i + 1}: ${src[i].trim()}`);
  }
});

test('現物の移設は済んでいる — CLI が exit 0 で行数と sha を語る (AC-9 / work-4 完了条件)', () => {
  /**
   * **現物を撃つ。** 作り物だけで緑を出す門は、現実が壊れても鳴らない。
   * ⚠️ ただし移設元(神の `~/.claude/paradise-kg`)が無い機(CI)では
   * `migrate --verify` は exit 2 を返す —— それが正しい(第37条: 検められなかった)。
   * ゆえに 0 か 2 のどちらかを要求し、**1(違反在り)だけを赤とする**。
   * 0 のときは中身まで検め、2 のときは理由を名乗っていることを検める。
   */
  const r = cli(['migrate', '--verify']);
  assert.notStrictEqual(r.code, 1, `現物の移設が不完全である:\n${r.out}`);
  if (r.code === 0) {
    assert.ok(/nodes\.jsonl/.test(r.out) && /sha256 集合の一致: true/.test(r.out),
      `照合の中身を語っていない:\n${r.out}`);
    const v = abode.migrateVerify();
    const nodes = v.rows.find(x => x.file === 'nodes.jsonl');
    assert.strictEqual(nodes.from, nodes.to, '現物の行数が食い違っている');
    assert.ok(nodes.to > 0, '移設先が空である — 0 行の一致を移設と呼んではならない');
  } else {
    assert.strictEqual(r.code, 2, `想定外の exit ${r.code}:\n${r.out}`);
    assert.ok(/検められなかった/.test(r.out) && /移設元が無い/.test(r.out),
      `測れなかった理由を名乗っていない:\n${r.out}`);
  }
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
// 7.5 兄弟倉の神官 — 環が起動する場所に神官が居るか (AC-46〜AC-51 / EX-2)
// ══════════════════════════════════════════════════════════════════════
console.log('\n兄弟倉の住処 (第30条 / EX-2 / AC-46〜51):');

/**
 * 偽の「楽園の住処」と偽の「兄弟倉」を `os.tmpdir()` に建てる。
 * **現物の倉にも現物の兄弟倉にも一行も書かない**(第58条(c))。
 *
 * 住所は env で差す —— `CLAUDE_HOME` が楽園側の `.claude`、
 * `PARADISE_CREATIONS` が兄弟倉の根。`creationsAbode()` は
 * `resolve()` 一本からこの二つを採るので、これだけで丸ごと隔離できる。
 */
function fakeCreations(tag, opts = {}) {
  const srcAbode = path.join(mktmp(tag + '-src'), '.claude');
  const dstRoot = mktmp(tag + '-creations');
  const dstAbode = path.join(dstRoot, '.claude');
  const agents = opts.agents || ['cardinal', 'architect', 'code-reviewer'];
  const commands = opts.commands || ['ship', 'forge'];
  const rules = opts.rules || ['AGENTS'];
  const trees = { agents, commands, rules };
  for (const [kind, names] of Object.entries(trees)) {
    fs.mkdirSync(path.join(srcAbode, kind), { recursive: true });
    for (const n of names) fs.writeFileSync(path.join(srcAbode, kind, n + '.md'), `# ${kind}/${n}\n`);
  }
  fs.writeFileSync(path.join(srcAbode, 'CLAUDE.md'), '# 掟\n');
  // 楽園側にしか無い物 —— 台帳を越えて写していないことを裁くための囮。
  fs.writeFileSync(path.join(srcAbode, 'settings.json'), '{"bait":true}\n');
  fs.writeFileSync(path.join(srcAbode, 'paradise-daily.json'), '{"bait":true}\n');

  if (opts.deploy !== false) {
    for (const [kind, names] of Object.entries(trees)) {
      fs.mkdirSync(path.join(dstAbode, kind), { recursive: true });
      for (const n of names) fs.copyFileSync(path.join(srcAbode, kind, n + '.md'), path.join(dstAbode, kind, n + '.md'));
    }
    fs.copyFileSync(path.join(srcAbode, 'CLAUDE.md'), path.join(dstAbode, 'CLAUDE.md'));
  }
  const env = { CLAUDE_HOME: srcAbode, PARADISE_CREATIONS: dstRoot };
  return { srcAbode, dstRoot, dstAbode, env, trees };
}

/** 偽の兄弟倉を git 倉にして `.claude` を追跡させる。git が無ければ null。 */
function trackInGit(dir) {
  const run = (...a) => spawnSync('git', ['-C', dir.split(path.sep).join('/'), ...a],
    { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t',
      GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } });
  if (run('init', '-q', '.').status !== 0) return null;
  if (run('add', '.claude').status !== 0) return null;
  if (run('commit', '-qm', 'track').status !== 0) return null;
  return run('ls-files', '.claude').stdout;
}

test('【正】兄弟倉に神官が 1:1 で居れば緑 — 名も中身も一致する (AC-46)', () => {
  const f = fakeCreations('cre-ok');
  const r = abode.creationsAbode({ env: f.env });
  assert.strictEqual(r.skipped, null, `在る倉を skip した: ${r.skipped}`);
  assert.strictEqual(r.ok, true, '1:1 なのに赤: ' + JSON.stringify(r.why));
  assert.deepStrictEqual(r.missing, []);
  assert.deepStrictEqual(r.extra, []);
  assert.deepStrictEqual(r.differs, []);
  assert.strictEqual(r.counts.agents, f.trees.agents.length);
  assert.strictEqual(r.counts.commands, f.trees.commands.length);
  assert.strictEqual(r.counts.rules, f.trees.rules.length);
  assert.strictEqual(r.counts.claudeMd, true);
});

test('【正】現物の兄弟倉が 30 / 19 / 8 で緑 — 作り物だけの門は現実が壊れても鳴らない (§7.2)', () => {
  /**
   * **現物を撃つ。** ただし兄弟倉が無い機(CI)では skip が正しい(AC-49)。
   * ゆえに 0 か「skip を名乗った 0」のどちらかを要求し、**1 だけを赤とする**。
   */
  const r = cli(['check', '--creations']);
  assert.notStrictEqual(r.code, 1, `現物の兄弟倉に神官が居ない:\n${r.out}`);
  assert.strictEqual(r.code, 0, `想定外の exit ${r.code}:\n${r.out}`);
  if (/· skip: creations abode 不在/.test(r.out)) {
    console.log('      (この機に兄弟倉が無い — 門は名乗って skip した。AC-49)');
    return;
  }
  assert.ok(/agents 30 \/ commands 19 \/ rules 8/.test(r.out),
    `完了条件の数を語っていない (§7.2 は agents 30 / commands 19 / rules 8 を求める):\n${r.out}`);
  assert.ok(/CLAUDE\.md あり/.test(r.out), `CLAUDE.md が配備されていない:\n${r.out}`);
});

test('【逆】神官を 1 本消すと、その名を名指して赤 (AC-47)', () => {
  const f = fakeCreations('cre-missing');
  fs.rmSync(path.join(f.dstAbode, 'agents', 'cardinal.md'));
  const r = abode.creationsAbode({ env: f.env });
  assert.strictEqual(r.ok, false, '神官が欠けたのに緑');
  assert.ok(r.missing.includes('agents/cardinal.md'), '欠落を名指していない: ' + JSON.stringify(r.missing));
  assert.ok(r.why.some(w => /神官 が欠けている — cardinal/.test(w)),
    '要件が求めた名指しの形になっていない: ' + JSON.stringify(r.why));
});

test('【逆】名が揃っていても中身が違えば赤 — 名の一致は同一性ではない (AC-46)', () => {
  const f = fakeCreations('cre-differs');
  fs.writeFileSync(path.join(f.dstAbode, 'agents', 'architect.md'), '# 偽物\n');
  const r = abode.creationsAbode({ env: f.env });
  assert.strictEqual(r.ok, false, '中身をすり替えても緑 — 数える門は騙される');
  assert.ok(r.differs.includes('agents/architect.md'), '差を名指していない: ' + JSON.stringify(r.differs));
  assert.deepStrictEqual(r.missing, [], '欠落でないものを欠落と呼んでいる');
});

test('【逆】楽園に居ない者が兄弟倉に居れば赤 — 1:1 は余剰も許さない (AC-46)', () => {
  const f = fakeCreations('cre-extra');
  fs.writeFileSync(path.join(f.dstAbode, 'agents', 'impostor.md'), '# 誰?\n');
  const r = abode.creationsAbode({ env: f.env });
  assert.strictEqual(r.ok, false, '余剰が通った');
  assert.ok(r.extra.includes('agents/impostor.md'), '余剰を名指していない: ' + JSON.stringify(r.extra));
});

test('【逆】agents が空なら赤 — skip に落ちてはならない (AC-48)', () => {
  const f = fakeCreations('cre-empty');
  for (const n of f.trees.agents) fs.rmSync(path.join(f.dstAbode, 'agents', n + '.md'));
  const r = abode.creationsAbode({ env: f.env });
  assert.strictEqual(r.skipped, null,
    '神官ゼロを skip と呼んだ — これがこの改革の退治している病そのものである (第37条)');
  assert.strictEqual(r.ok, false, '神官が 0 体の倉を緑と呼んだ');
  assert.strictEqual(r.counts.agents, 0);
  assert.ok(r.why.some(w => /AC-48/.test(w)), '空を空として名指していない: ' + JSON.stringify(r.why));
});

test('【逆】兄弟倉は在るのに .claude ごと無ければ赤 — 不在は skip ではない (AC-48)', () => {
  const f = fakeCreations('cre-noabode', { deploy: false });
  assert.ok(!fs.existsSync(f.dstAbode), '前提が崩れている(配備してはならない)');
  const r = abode.creationsAbode({ env: f.env });
  assert.strictEqual(r.skipped, null, '倉が在るのに skip した — 物差しは「兄弟倉そのものが在るか」である');
  assert.strictEqual(r.ok, false, '神官が一体も居ない倉を緑と呼んだ');
  assert.ok(r.why.some(w => /第37条/.test(w) && /AC-48/.test(w)),
    '不在を skip でなく赤として名指していない: ' + JSON.stringify(r.why));
});

test('【正】兄弟倉そのものが無い機は、名乗って skip し exit 0 (AC-49)', () => {
  const gone = path.join(mktmp('cre-gone'), 'no-such-creations');
  const r = abode.creationsAbode({ env: { PARADISE_CREATIONS: gone } });
  assert.ok(r.skipped, '兄弟倉が無い機で skip しなかった');
  assert.ok(/creations abode 不在: /.test(r.skipped),
    `設計 §1.4 が定めた skip の文言になっていない: ${r.skipped}`);
  assert.strictEqual(r.ok, true, '倉が無いこと自体は違反ではない');
});

test('【正】CLI の skip は口で名乗る — 黙った緑を許さない (AC-49 / 第58条(e))', () => {
  const gone = path.join(mktmp('cre-gone-cli'), 'no-such-creations');
  const r = cli(['check', '--creations'], { PARADISE_CREATIONS: gone });
  assert.strictEqual(r.code, 0, `倉が無い機で exit ${r.code}:\n${r.out}`);
  assert.ok(/· skip: creations abode 不在: /.test(r.out),
    `skip を印字していない — 黙って通った門は N skipped にも数えられない:\n${r.out}`);
});

test('【逆】兄弟倉が .claude を git 追跡していれば赤 — 第30条の逆流 (AC-50)', () => {
  const f = fakeCreations('cre-tracked');
  const tracked = trackInGit(f.dstRoot);
  if (tracked === null) {
    console.log('      (git が使えない環境 — 門は黙る。第21条)');
    return;
  }
  assert.ok(tracked.trim().length, '前提が崩れている(追跡させられていない)');
  const r = abode.creationsAbode({ env: f.env });
  assert.strictEqual(r.tracked, true, 'git 追跡を見落とした');
  assert.strictEqual(r.ok, false, 'engine の写しが創造物の履歴に入っても緑');
  assert.ok(r.why.some(w => /第30条/.test(w)),
    '第30条の逆流として名指していない: ' + JSON.stringify(r.why));
});

test('【正】現物の兄弟倉は .claude を追跡していない (AC-50 の正)', () => {
  const r = abode.creationsAbode();
  // 兄弟倉が無い機では測れない —— **黙って抜けず、名乗ってから抜ける**(第58条(e))。
  const measurable = !r.skipped;
  if (!measurable) console.log('      (この機に兄弟倉が無い — AC-49 の skip)');
  else {
    assert.notStrictEqual(r.tracked, null,
      '第30条の逆流を検められなかった: ' + JSON.stringify(r.unmeasurable));
    assert.strictEqual(r.tracked, false,
      '創造物の倉が engine の写しを追跡している — 兄弟倉の .gitignore に .claude/ を足せ');
  }
});

test('git を走らせられなければ tracked は null — 黙って false にしない (第37条)', () => {
  // git 倉でない場所に対して `ls-files` は失敗する。**「追跡していない」と混同しない。**
  const f = fakeCreations('cre-nogit');
  const r = abode.creationsAbode({ env: f.env });
  assert.strictEqual(r.tracked, null,
    '検められなかったものを false(= 追跡していない)と答えた — 第37条の正面違反');
  assert.ok(r.unmeasurable.some(u => /ls-files/.test(u)),
    '検められなかった理由を持っていない: ' + JSON.stringify(r.unmeasurable));
});

test('台帳を越えて写さない — settings.json / paradise-daily.json は EX-2 の target に無い', () => {
  const f = fakeCreations('cre-scope');
  const r = abode.creationsAbode({ env: f.env });
  assert.strictEqual(r.ok, true, '前提が崩れている: ' + JSON.stringify(r.why));
  for (const bait of ['settings.json', 'paradise-daily.json']) {
    assert.ok(!fs.existsSync(path.join(f.dstAbode, bait)),
      `${bait} を兄弟倉へ写している — EX-2 の target が名指すのは四つだけである`);
    assert.ok(!r.missing.includes(bait) && !r.why.some(w => w.includes(bait)),
      `${bait} の不在を門が咎めている — 台帳を越えて検めれば、台帳を越えて書いてよいことになる`);
  }
  const e = abode.exportFor('EX-2');
  assert.strictEqual(e.target, '<creations-root>/.claude/{agents,commands,rules,CLAUDE.md}',
    '台帳の target が変わった — 門と台帳のどちらが正しいかを決めてから直せ');
  assert.strictEqual(e.writer, 'graph/deploy.js', 'EX-2 の書き手が変わった');
});

test('--creations は check の知る旗であり、--all にも含まれる (第44条)', () => {
  assert.strictEqual(abode.CHECK_FLAGS['--creations'], 'creations', '旗が登録されていない');
  // 旗を立てたときしか走らない門は、誰も旗を立てなくなった日に死ぬ。
  const all = abode.check({ repoRoot: ROOT });
  assert.notStrictEqual(all.creations, null, '--all(旗なし)で creations を走らせていない');
  // 知らない旗は依然として exit 2 —— 第3段の掟を壊していない。
  const bad = cli(['check', '--creationz']);
  assert.strictEqual(bad.code, 2, `知らない旗が exit ${bad.code} を返した`);
  assert.ok(/--creations/.test(bad.out), '知る旗の一覧に --creations が出ていない');
});

test('creationsAbode は住所を自分で組まない — workspace.js の答えの下に住む (第30条)', () => {
  const ws = require(path.join(ROOT, 'graph', 'workspace.js'));
  const box = mktmp('cre-addr');
  const r = abode.creationsAbode({ env: { PARADISE_CREATIONS: box } });
  assert.strictEqual(r.root, ws.resolve({ env: { PARADISE_CREATIONS: box } }).root,
    '兄弟倉の根を workspace.js 以外の口から作っている');
  assert.strictEqual(r.abode, path.join(r.root, '.claude'));
  // ソースにも二重の住所組みが無いことを実測で示す(註釈だけの宣言は機構ではない — 第10条)
  const src = fs.readFileSync(ABODE_JS, 'utf8').split('\n');
  const start = src.findIndex(l => /^function creationsAbode\s*\(/.test(l));
  const end = src.findIndex((l, i) => i > start && /^function spawnGit\s*\(/.test(l));
  assert.ok(start >= 0 && end > start, 'creationsAbode を切り出せない');
  for (let i = start; i <= end; i++) {
    assert.ok(!/\b(os\.homedir|paradise-creations)\b/.test(src[i]),
      `creationsAbode が住所を直に組んでいる: ${i + 1}: ${src[i].trim()}`);
  }
});

test('【逆】AC-51 — 住処解決が神官ゼロを指したとき check-agents は skipped=false で赤', () => {
  /**
   * **`skipped=true` で `ok=true` を返した瞬間に不合格**という掟を、門で固定する。
   * 実測された病(改革の着手時): env を四本立てても `check-agents` は本物のホームを見て
   * `skipped=true ok=true` を返していた —— **測らずに緑**である。
   */
  const box = path.join(mktmp('ac51-empty'), '.claude');
  fs.mkdirSync(path.join(box, 'agents'), { recursive: true });
  const ca = require(path.join(ROOT, 'graph', 'check-agents.js'));
  const r = ca.check(undefined, { env: { CLAUDE_HOME: box } });
  assert.strictEqual(r.skipped, false,
    '神官ゼロを skip と呼んだ — skipped=true かつ ok=true はこの改革が退治している病そのものである');
  assert.strictEqual(r.ok, false, '神官が一体も居ないのに緑');
  assert.ok(/一体も居ない/.test(r.note), '理由を名乗っていない: ' + r.note);
});

test('【正】AC-51 — 住処解決が神官の揃った兄弟倉を指せば skipped=false かつ ok=true', () => {
  const ca = require(path.join(ROOT, 'graph', 'check-agents.js'));
  const need = ca.requiredAgents();
  const box = path.join(mktmp('ac51-full'), '.claude');
  fs.mkdirSync(path.join(box, 'agents'), { recursive: true });
  // 名指された神官を全員、実体つきで置く。`tools:` 行を持たない = 全継承(起動の権能も継承)。
  for (const a of need) fs.writeFileSync(path.join(box, 'agents', a + '.md'), `---\nname: ${a}\n---\n# ${a}\n`);
  const clergy = require(path.join(ROOT, 'graph', 'clergy.js'));
  for (const c of Object.values(clergy.COLLEGE || {})) {
    for (const b of c.believers || []) {
      const p = path.join(box, 'agents', b + '.md');
      if (!fs.existsSync(p)) fs.writeFileSync(p, `---\nname: ${b}\n---\n# ${b}\n`);
    }
  }
  const r = ca.check(undefined, { env: { CLAUDE_HOME: box } });
  assert.strictEqual(r.skipped, false, '実物が在るのに skip した');
  assert.strictEqual(r.ok, true, '揃っているのに赤: ' + r.note);
  assert.strictEqual(r.dir, path.join(box, 'agents'), '住処解決が指した先を見ていない');
});

// ══════════════════════════════════════════════════════════════════════
// 9. 撤収 — 神のホームから楽園の痕跡を引く「計る器」 (第6段 / work-6)
//
// **掟: この節はリポジトリにも実機にも一行も書かない。**
// 仕掛けは全て `os.tmpdir()` の中の複製に対して行う(第58条(c))。
// 実機 `~/.claude` は**読むことすら最小限**に留める —— 実機を差す門は
// `settingsFile` / `baselineFile` の口で必ず複製へ向け直す。
// ══════════════════════════════════════════════════════════════════════

/**
 * **偽の神の住処**を建てる。現物 `~/.claude` は 1 バイトも触らない。
 * 神 5 キーと楽園のキーと permissions と hooks を持った settings.json を置き、
 * 不可侵名簿の項目も実体つきで作る。
 */
function fakeAbode(tag, opts = {}) {
  const home = mktmp('retreat-' + tag);
  const box = path.join(home, '.claude');
  fs.mkdirSync(box, { recursive: true });
  const settings = Object.assign({
    enableWorkflows: true,
    extraKnownMarketplaces: { 'claude-plugins-official': { source: { source: 'github', repo: 'anthropics/claude-plugins-official' } } },
    language: 'japanese',
    theme: 'dark',
    agentPushNotifEnabled: true,
    hooks: opts.hooks || {},
    model: 'fable',
    effortLevel: 'xhigh',
    permissions: { deny: ['Bash(git push --force:*)'], ask: [], allow: [], defaultMode: 'default' },
  }, opts.settings || {});
  const sFile = path.join(box, 'settings.json');
  fs.writeFileSync(sFile, JSON.stringify(settings, null, 2) + '\n');
  // 不可侵名簿の実体。**現物ではない** —— 全て複製の中である。
  for (const d of ['projects', 'plugins', 'sessions', 'skills/learned', 'skills/pr-review', 'backups']) {
    fs.mkdirSync(path.join(box, d), { recursive: true });
    fs.writeFileSync(path.join(box, d, 'a.txt'), 'x'.repeat(8));
  }
  for (const f of ['.credentials.json', 'settings.json.pre-wire.bak', 'settings.json.bak.1787846094']) {
    fs.writeFileSync(path.join(box, f), '{}');
  }
  return { home, box, settingsFile: sFile, settings };
}

/** 複製に対して凍結を採り、その道を返す。**楽園の倉へは書かない。** */
function freezeBaseline(a) {
  const file = path.join(a.home, 'retreat-baseline.json');
  fs.writeFileSync(file, JSON.stringify(abode.retreatBaselineBody({ settingsFile: a.settingsFile }), null, 2) + '\n');
  return file;
}

/** 複製の settings.json を書き換える(複製である。現物ではない)。 */
function mutateAbode(a, fn) {
  const s = JSON.parse(fs.readFileSync(a.settingsFile, 'utf8'));
  fn(s);
  fs.writeFileSync(a.settingsFile, JSON.stringify(s, null, 2) + '\n');
}

const ROOT_FWD = ROOT.split(path.sep).join('/');
const PARADISE_HOOK = {
  SessionStart: [{ matcher: '*', hooks: [{ type: 'command',
    command: `node "${ROOT_FWD}/tools/hooks/paradise-session-start.js"` }] }],
};

console.log('\n撤収 (1) engine の権能 (AC-16 / R-4 / 障害牲16):');

test('【正】AC-16 — repairEnv の delete は台帳 (mayDeleteEnvKey) の守りの内側に在る', () => {
  const f = abode.envRepairAudit();
  assert.deepStrictEqual(f, [],
    'engine が神のキーを削除する権能を持っている:\n        ' +
    f.map(x => `${x.file}:${x.line} ${x.why}`).join('\n        '));
});

test('【逆】AC-16 — 台帳を外した apply-guards.js を偽の倉に置けば、門は赤くなる', () => {
  /**
   * **現物は 1 バイトも触らない。** 偽の倉に、守りを外した写しを置いて撃つ。
   * 「そう書かれている」ではなく「**そう鳴る**」を確かめる(第5条 / 第21条)。
   */
  const root = mktmp('ac16-bad');
  fs.mkdirSync(path.join(root, 'graph'), { recursive: true });
  const src = fs.readFileSync(path.join(ROOT, 'graph', 'apply-guards.js'), 'utf8');
  // 守りの述語呼び出しと台帳の宣言を消す(障害牲16 の再演)。
  const bad = src
    .replace(/if \(!mayDeleteEnvKey\(key\)\) \{/, 'if (false) {')
    .replace(/const REPAIRABLE_ENV_KEYS = Object\.freeze\(\{/, 'const _WAS_LEDGER = Object.freeze({');
  fs.writeFileSync(path.join(root, 'graph', 'apply-guards.js'), bad);
  const found = abode.envRepairAudit(root);
  assert.ok(found.length > 0, '守りを外しても緑なら、AC-16 の門は権能を見ていない');
  assert.ok(found.some(x => /台帳/.test(x.why)), `台帳の欠落を名指していない: ${JSON.stringify(found)}`);
});

test('【逆】AC-16 — 台帳に無い env キーは engine が消さず、神へ提示する(振る舞い)', () => {
  /**
   * `OTHER` に **PATH と同じ壊れ方**(`$PATH` 前置)を仕込む。engine が「形で判ずる」なら
   * ここで消してしまう —— それが障害牲16 の再演である。**台帳が名前で止める**。
   */
  const G = require(path.join(ROOT, 'graph', 'apply-guards.js'));
  const r = G.repairEnv({ PATH: '$PATH:/x', OTHER: '$PATH:/y', PLAIN: 'ok' });
  assert.strictEqual(r.env.PATH, undefined, '台帳に載った PATH は消える');
  assert.strictEqual(r.env.OTHER, '$PATH:/y',
    '台帳に無い OTHER を engine が消した — これが障害牲16 の再演である (AC-16)');
  assert.strictEqual(r.env.PLAIN, 'ok', '壊れていないキーに触れてはならない');
  const p = r.proposals.find(x => x.key === 'OTHER');
  assert.ok(p, '消さないなら黙るのでもなく、**神へ提示**せねばならない (第54条(c))');
  assert.ok(/台帳/.test(p.note), '提示が理由を名乗っていない');
});

test('【正】AC-16 — 台帳 REPAIRABLE_ENV_KEYS は根拠つきで、PATH ただ一つである', () => {
  const G = require(path.join(ROOT, 'graph', 'apply-guards.js'));
  const keys = Object.keys(G.REPAIRABLE_ENV_KEYS);
  assert.deepStrictEqual(keys, ['PATH'],
    `削除の台帳が広がっている: ${keys.join(', ')} — 広げるなら神が名指せ`);
  assert.ok(G.REPAIRABLE_ENV_KEYS.PATH.length > 40,
    '台帳に根拠(なぜ消してよいか)が無い — 在ることは資格ではない (第54条(b))');
  assert.strictEqual(G.mayDeleteEnvKey('THEME'), false);
  assert.strictEqual(G.mayDeleteEnvKey('PATH'), true);
});

console.log('\n撤収 (2) 掟は住処に依る (L-19 / 第29条):');

test('【正】L-19 — repo の住処では <repo>/.claude を守る deny が一行増える', () => {
  const G = require(path.join(ROOT, 'graph', 'apply-guards.js'));
  const repo = G.policyFor({ mode: 'repo' });
  const glob = G.policyFor({ mode: 'global' });
  assert.strictEqual(repo.deny.length, glob.deny.length + 1,
    'repo の掟が global と同じ件数である — <repo>/.claude を誰も守っていない');
  assert.ok(repo.deny.includes(G.REPO_ABODE_DENY), `repo の掟に ${G.REPO_ABODE_DENY} が無い`);
  assert.ok(!glob.deny.includes(G.REPO_ABODE_DENY),
    'global の掟に repo の守りを混ぜてはならない — 実機の輸出が即座に腐る');
  assert.ok(glob.deny.includes('Edit(~/.claude/**)'),
    '神の住処の守り (EX-1 の守備範囲) を落としてはならない');
});

test('【正】L-19 — repo の守りは可搬な相対の形である(絶対パスを焼き込まない / 第29条)', () => {
  /**
   * `<repo>/.claude/settings.json` は **git 追跡された派生物**である(AC-14)。
   * 機械固有の絶対パスを焼き込めば、clone した先で必ず食い違い derived.js が永久に赤くなる。
   */
  const G = require(path.join(ROOT, 'graph', 'apply-guards.js'));
  assert.ok(!/[A-Za-z]:[\\/]/.test(G.REPO_ABODE_DENY),
    `掟に機械固有の絶対パスが焼き込まれている: ${G.REPO_ABODE_DENY}`);
  assert.ok(!/Users|kikus|paradise/i.test(G.REPO_ABODE_DENY),
    `掟に特定の機の名が焼き込まれている: ${G.REPO_ABODE_DENY}`);
});

test('【正】L-19 — EX-1 の照合は走らせた側の PARADISE_ABODE で揺れない', () => {
  /**
   * 掟が住処に依る以上、**照合の基準を固定しなければ**同じ実機が
   * 日によって赤くも緑にもなる(第37条)。
   */
  const src = fs.readFileSync(ABODE_JS, 'utf8');
  const start = src.indexOf('function verifyExport');
  assert.ok(start > 0, 'verifyExport が見つからない');
  const body = src.slice(start, start + 3000);
  assert.ok(/policyFor\(\s*\{\s*mode:\s*'global'\s*\}\s*\)/.test(body),
    'EX-1 の照合が global の掟を明示していない — 走らせた側の env で基準が揺れる');
});

console.log('\n撤収 (3) 計画 (AC-29 / R-8):');

test('【正】AC-29 — 撤収計画に permissions は含まれず、残すキーとして名指される', () => {
  const a = fakeAbode('ac29');
  const p = abode.retreatPlan({ settingsFile: a.settingsFile });
  assert.ok(!p.settingsKeys.paradise.includes('permissions'),
    '撤収対象に permissions が載っている — 台帳 EX-1 は「残す」と定めている (AC-29)');
  assert.deepStrictEqual(p.settingsKeys.retained, ['permissions'],
    'permissions が「残すキー」として名指されていない — 黙って対象外にしてはならない');
  assert.deepStrictEqual(p.violations, [], `計画に違反がある: ${p.violations.join(' / ')}`);
  assert.ok(p.refused.some(r => /#\/permissions/.test(r.what)),
    'refused に EX-1 が載っていない — なぜ触らないかの理由が印字されない');
});

test('【正】AC-29 — 撤収対象の楽園のキーは model / effortLevel の二つだけである', () => {
  const a = fakeAbode('ac29b');
  const p = abode.retreatPlan({ settingsFile: a.settingsFile });
  assert.deepStrictEqual(p.settingsKeys.paradise.slice().sort(), ['effortLevel', 'model']);
});

test('【正】AC-29 — 帰属不明のキーは黙って撤収せず、神の名指しを求める', () => {
  const a = fakeAbode('ac29c', { settings: { someNewThing: 1 } });
  const p = abode.retreatPlan({ settingsFile: a.settingsFile });
  assert.ok(p.settingsKeys.unknown.includes('someNewThing'),
    '知らないキーを黙って無視した — 「対象外」を黙って対象外にしてはならない (第54条(c))');
  assert.ok(!p.settingsKeys.paradise.includes('someNewThing'),
    '知らないキーを撤収対象に入れた — 知らない物は引かない');
});

test('【正】AC-29 — 撤収対象のファイルは実在を測る(計画に在るだけでは撤収できない)', () => {
  const p = abode.retreatPlan();
  assert.ok(p.files.length > 0, '配備計画が引けていない');
  for (const f of p.files) {
    assert.strictEqual(typeof f.onDisk, 'boolean',
      `${f.kind}/${f.file} の実在を測っていない — 計画に在るだけの物は撤収しようがない (第37条)`);
  }
});

test('【正】R-8 — hooks の判定は推測ではなく実測(ソースが何を読み何処へ書くか)で書かれる', () => {
  const a = fakeAbode('r8', { hooks: PARADISE_HOOK });
  const p = abode.retreatPlan({ settingsFile: a.settingsFile });
  assert.strictEqual(p.hooks.length, 1, `楽園を指す hook を数えられていない: ${p.hooks.length}`);
  const h = p.hooks[0];
  assert.strictEqual(h.verdict, 'paradise-specific',
    `paradise-session-start.js を楽園固有と判じていない: ${h.verdict}`);
  assert.ok(/ソースが楽園を名指している/.test(h.basis), `根拠が実測でない: ${h.basis}`);
  assert.strictEqual(h.exists, true, 'スクリプトの実在を測っていない');
});

test('【正】R-8 — vendor 由来の汎用 hook は「汎用」と判じ、何処へ書くかを実測する', () => {
  const vendorHook = {
    SessionEnd: [{ matcher: '*', hooks: [{ type: 'command',
      command: `node "${ROOT_FWD}/overlay/vendor/scripts/hooks/evaluate-session.js"` }] }],
  };
  const a = fakeAbode('r8b', { hooks: vendorHook });
  const p = abode.retreatPlan({ settingsFile: a.settingsFile });
  const h = p.hooks[0];
  assert.strictEqual(h.verdict, 'vendor-generic', `vendor 由来を汎用と判じていない: ${h.verdict}`);
  assert.ok(h.touches.some(t => /learned/.test(t)),
    `何処へ書くかを実測していない: ${JSON.stringify(h.touches)} — 推測で「汎用」と呼んではならない`);
});

test('【正】retreat は --write を持たない — 住所を知る器は書かない (§1.5)', () => {
  const r = cli(['retreat', '--plan', '--write']);
  assert.strictEqual(r.code, 2, `--write を受理した (exit ${r.code}) — 器が書く口を持ってはならない`);
  assert.ok(/--write を持たない/.test(r.out), `理由を名乗っていない: ${r.out}`);
});

test('【逆】retreat は旗が無ければ exit 2(何をするか決まっていない / 第16条)', () => {
  const r = cli(['retreat']);
  assert.strictEqual(r.code, 2, `旗の無い retreat が exit ${r.code} を返した`);
});

test('【逆】--freeze は --verify と共に使えない — 照合が凍結を書き直せば必ず緑になる', () => {
  const r = cli(['retreat', '--verify', '--freeze']);
  assert.strictEqual(r.code, 2, `照合が凍結を書き直せる状態である (exit ${r.code})`);
});

console.log('\n撤収 (4) 逆向き依存 (AC-30 / AC-31 / 第20条の鏡像):');

test('【正】AC-30 — 楽園の絶対パスを握る hook が 0 件なら check --backrefs は緑', () => {
  const a = fakeAbode('ac30');                       // hooks を持たない複製
  const r = abode.check({ backrefs: true, settingsFile: a.settingsFile });
  assert.strictEqual(r.backrefs.skipped, null, '複製が在るのに skip した');
  assert.deepStrictEqual(r.backrefs.rows, [], '楽園を指さない settings で赤くなった');
  assert.strictEqual(r.ok, true, '逆向き依存 0 件で赤い — AC-30 が満たせない');
});

test('【逆】AC-31 — 1 本戻せば赤くなり、event / matcher / 絶対パスを名指す', () => {
  const a = fakeAbode('ac31', { hooks: PARADISE_HOOK });
  const r = abode.check({ backrefs: true, settingsFile: a.settingsFile });
  assert.strictEqual(r.ok, false, '楽園の絶対パスを握る hook が在るのに緑');
  assert.strictEqual(r.backrefs.rows.length, 1);
  const h = r.backrefs.rows[0];
  assert.strictEqual(h.event, 'SessionStart', `event を名指していない: ${h.event}`);
  assert.strictEqual(h.matcher, '*', `matcher を名指していない: ${h.matcher}`);
  assert.ok(/paradise-session-start\.js/.test(h.command), `絶対パスを名指していない: ${h.command}`);
});

test('【正】AC-30 — 実機が無い機(CI)は skip を名乗って exit 0(黙って緑にしない)', () => {
  const nowhere = path.join(mktmp('ac30-none'), 'settings.json');
  const r = abode.check({ backrefs: true, settingsFile: nowhere });
  assert.ok(r.backrefs.skipped, '実機が無いのに skip を名乗らなかった — 黙って通った門は門ではない');
  assert.strictEqual(r.ok, true, '実機が無いことを違反として数えた');
});

test('【正】--backrefs は --all に含まれない — 撤収前の赤で CI を殺さない (台帳 [41])', () => {
  /**
   * 撤収前の今、実機には 6 件在る。`--all` に含めれば CI も自己診断も今日から赤い。
   * **裁定は撤収完了後の編入である**(コードの註が申し送りを持つ)。
   */
  const r = abode.check({});                          // 無旗 = --all
  assert.strictEqual(r.backrefs, null,
    '--all が逆向き依存を走らせた — 撤収前の今、CI と自己診断が赤くなる');
  const src = fs.readFileSync(ABODE_JS, 'utf8');
  assert.ok(/撤収(が)?完了(した日|後)に\s*`?--all`?\s*へ編入/.test(src),
    '「撤収完了後に --all へ編入する」という申し送りがコードの註に無い');
});

test('【正】--backrefs は check の知る旗である(知らない旗は exit 2)', () => {
  assert.strictEqual(abode.CHECK_FLAGS['--backrefs'], 'backrefs');
  const r = cli(['check', '--backref']);              // 一文字違い
  assert.strictEqual(r.code, 2, '知らない旗を黙って捨てて緑を返した (第37条)');
});

console.log('\n撤収 (5) 照合 (AC-33〜AC-38):');

test('【正】AC-35 — 凍結直後の照合は緑で、正準 sha256 が一致する', () => {
  const a = fakeAbode('ac35');
  const b = freezeBaseline(a);
  const v = abode.retreatVerify({ settingsFile: a.settingsFile, baselineFile: b });
  assert.strictEqual(v.ok, true, `凍結直後に赤い: ${v.findings.map(f => f.why).join(' / ')}`);
  assert.strictEqual(v.shaOk, true);
  assert.strictEqual(v.god.sha, v.baseline.sha256);
});

test('【逆】AC-36 — 複製から language を消せば `神のキーが消えた: language ("japanese")`', () => {
  const a = fakeAbode('ac36');
  const b = freezeBaseline(a);
  mutateAbode(a, s => { delete s.language; });
  const v = abode.retreatVerify({ settingsFile: a.settingsFile, baselineFile: b });
  assert.strictEqual(v.ok, false, '神のキーが消えても緑 — 撤収は必ず全キーを触る (design §8 危険1)');
  const f = v.findings.find(x => x.kind === 'missing-key');
  assert.ok(f, `消失を名指していない: ${JSON.stringify(v.findings)}`);
  assert.ok(/神のキーが消えた: language \("japanese"\)/.test(f.why),
    `キー名と値の両方を名指していない: ${f.why}`);
});

test('【逆】AC-37 — theme を dark→light に変えれば `神のキーの値が変わった: theme "dark" → "light"`', () => {
  const a = fakeAbode('ac37');
  const b = freezeBaseline(a);
  mutateAbode(a, s => { s.theme = 'light'; });
  const v = abode.retreatVerify({ settingsFile: a.settingsFile, baselineFile: b });
  assert.strictEqual(v.ok, false, '値の改変を見逃した — 存在だけを見る門は改変を見逃す');
  const f = v.findings.find(x => x.kind === 'changed-value');
  assert.ok(f, `改変を名指していない: ${JSON.stringify(v.findings)}`);
  assert.ok(/神のキーの値が変わった: theme "dark" → "light"/.test(f.why),
    `前後の値を名指していない: ${f.why}`);
});

test('【逆】AC-38 — 台帳に無いキーが増えれば `台帳に無いキーが増えた: <名>`', () => {
  /**
   * **足すのも引くのと同じく無断の改変である。**
   * 凍結側から 1 キー落とすことで「実機に無断で増えた」形を作る
   * (凍結は「あるべき姿」であり、そこに無いキーは増殖である)。
   */
  const a = fakeAbode('ac38');
  const b = freezeBaseline(a);
  const raw = JSON.parse(fs.readFileSync(b, 'utf8'));
  delete raw.values.theme;
  raw.sha256 = 'deadbeef';
  fs.writeFileSync(b, JSON.stringify(raw, null, 2) + '\n');
  const v = abode.retreatVerify({ settingsFile: a.settingsFile, baselineFile: b });
  assert.strictEqual(v.ok, false);
  const f = v.findings.find(x => x.kind === 'extra-key');
  assert.ok(f, `増殖を名指していない: ${JSON.stringify(v.findings)}`);
  assert.ok(/台帳に無いキーが増えた: theme/.test(f.why), `増えたキーを名指していない: ${f.why}`);
});

test('【正】AC-33 — 不可侵名簿は「存在し、かつ内容が一致する」ことを印字する', () => {
  const a = fakeAbode('ac33');
  const b = freezeBaseline(a);
  const v = abode.retreatVerify({ settingsFile: a.settingsFile, baselineFile: b });
  assert.strictEqual(v.ok, true, `凍結直後に名簿が赤い: ${v.findings.map(f => f.why).join(' / ')}`);
  const learned = v.sanctuary.find(s => s.rel === 'skills/learned');
  assert.ok(learned, '名簿に skills/learned が無い');
  assert.ok(learned.triple && learned.triple.files >= 1,
    '三つ組を測っていない — 「存在する」だけでは通さない (第37条)');
  assert.strictEqual(learned.ok, true);
});

test('【逆】AC-34 — skills/learned を消せば `撤収前 N ファイル / 撤収後 0 ファイル`', () => {
  const a = fakeAbode('ac34');
  const b = freezeBaseline(a);
  fs.rmSync(path.join(a.box, 'skills', 'learned'), { recursive: true, force: true });
  const v = abode.retreatVerify({ settingsFile: a.settingsFile, baselineFile: b });
  assert.strictEqual(v.ok, false, '不可侵名簿が消えても緑 — vendor に複製が無い物である');
  const f = v.findings.find(x => x.key === 'skills/learned');
  assert.ok(f, `消失を名指していない: ${JSON.stringify(v.findings)}`);
  assert.ok(/撤収前 1 ファイル \/ 撤収後 0 ファイル/.test(f.why), `前後を名指していない: ${f.why}`);
});

test('【逆】AC-33 — volatile でない項目は 1 バイトでも動けば赤くなる(原初設定の退避)', () => {
  /**
   * `volatile` は「増えても赤くしない」であって「見ない」ではない。
   * **神の原初設定の退避は日常では 1 バイトも動かない** —— ゆえに完全一致を課す。
   */
  const a = fakeAbode('ac33b');
  const b = freezeBaseline(a);
  fs.writeFileSync(path.join(a.box, 'settings.json.pre-wire.bak'), '{"x":1}');
  const v = abode.retreatVerify({ settingsFile: a.settingsFile, baselineFile: b });
  assert.strictEqual(v.ok, false, '原初設定の証拠が書き換わっても緑 — 復元の基点が失われる');
  assert.ok(v.findings.some(f => f.key === 'settings.json.pre-wire.bak'),
    `どの項目が動いたかを名指していない: ${JSON.stringify(v.findings)}`);
});

test('【正】AC-33 — volatile な項目は「増えた」だけでは赤くしない(が黙らない)', () => {
  /**
   * `sessions/` は走行のたびに増える。増えるたびに赤くなる門は見られなくなり、
   * 見られない門は第57条の禁じ手(閾値の引き下げ)を招く。
   * **撤収は壊す手であって作る手ではない** —— 害は「失われる」ことだけである。
   */
  const a = fakeAbode('ac33c');
  const b = freezeBaseline(a);
  fs.writeFileSync(path.join(a.box, 'sessions', 'new.txt'), 'yyyy');
  const v = abode.retreatVerify({ settingsFile: a.settingsFile, baselineFile: b });
  assert.strictEqual(v.ok, true, `volatile な項目が増えただけで赤い: ${v.findings.map(f => f.why).join(' / ')}`);
  const row = v.sanctuary.find(s => s.rel === 'sessions');
  assert.ok(row.moved && row.moved.length, '増減を測っていない');
  assert.ok(row.why && /ファイル数 1 → 2/.test(row.why),
    `増えたことを黙って通した — 増減は必ず印字せよ (第54条(c)): ${row.why}`);
});

test('【逆】AC-33 — volatile な項目でも「減った」なら赤くなる', () => {
  const a = fakeAbode('ac33d');
  const b = freezeBaseline(a);
  fs.rmSync(path.join(a.box, 'sessions', 'a.txt'), { force: true });
  const v = abode.retreatVerify({ settingsFile: a.settingsFile, baselineFile: b });
  assert.strictEqual(v.ok, false, 'volatile な項目が減っても緑 — 撤収の害は「失われる」ことである');
  assert.ok(v.findings.some(f => /減っている/.test(f.why)), '減ったことを名指していない');
});

test('【逆】凍結が無ければ exit 2 — skip ではない(第37条)', () => {
  const nowhere = path.join(mktmp('nobaseline'), 'retreat-baseline.json');
  let code = 0;
  try { abode.retreatVerify({ baselineFile: nowhere }); }
  catch (e) { code = e.exitCode; }
  assert.strictEqual(code, 2,
    '凍結が無いのに 0 か 1 を返した — 照合の基点が無いことは「違反が無い」ではない');
});

test('【正】凍結は値そのものを持つ — sha だけでは何が変わったかを名指せない (AC-36/37)', () => {
  const a = fakeAbode('body');
  const body = abode.retreatBaselineBody({ settingsFile: a.settingsFile });
  assert.ok(body.sha256 && body.sha256.length === 64, 'sha256 が全長で無い');
  for (const k of abode.GOD_KEYS) {
    assert.ok(Object.prototype.hasOwnProperty.call(body.values, k),
      `凍結に ${k} の値が無い — sha だけでは「何が変わったか」を名指せない`);
  }
  assert.ok(body.canonicalization, '正準化の流儀を宣言していない — 流儀が割れれば必ず食い違う');
  assert.ok(body.takenAt && body.source, '採取時刻と採取元の道が無い');
});

test('【正】正準化の流儀は一つだけ — 宣言順を変えても sha は動かない', () => {
  const a = fakeAbode('canon');
  const s = JSON.parse(fs.readFileSync(a.settingsFile, 'utf8'));
  const g1 = abode.godSubset(s);
  const shuffled = {};
  for (const k of Object.keys(s).reverse()) shuffled[k] = s[k];
  const g2 = abode.godSubset(shuffled);
  assert.strictEqual(g1.sha, g2.sha, '宣言順で sha が変わる — 正準化がキー名ソートになっていない');
  assert.ok(!/\n|  /.test(g1.canonical), `正準 JSON に空白が混ざっている: ${g1.canonical.slice(0, 60)}`);
});

test('【正】凍結の数は散文ではなく retreat-baseline.json が持つ (第22条)', () => {
  /**
   * 起草時、design.md と requirements.md は神 5 キーの sha を散文に書き写していた。
   * 第6段で実測したところ**再現不能**であった(8 通りの正準化を試行)。
   * **固定値を門に直書きすれば、外れた瞬間から門は永久に赤い** ——
   * 次に来る者は必ず閾値を緩めたくなる(第57条の禁じ手への誘惑)。
   *
   * ⚠️ 探す文字列を**この門の中で組み立てる**。素の文字列を書けば、この門自身が
   * 「直書きされた sha」になって己を赤くする(門は己の裁く形を使ってはならない)。
   */
  const src = fs.readFileSync(path.join(DIR, 'abode.test.js'), 'utf8');
  const drafted = 'cbca' + '9224ec5e6cac';       // 起草時の(再現不能な)値
  const measured = 'b66c' + '5008319d71c6';      // 第6段で実測した現行値
  assert.ok(!src.includes(drafted),
    '再現不能な凍結値が門に直書きされている — 数は実測が生む (第22条)');
  assert.ok(!src.includes(measured),
    '凍結値が門に直書きされている — 神が theme を変えた日にこの門は永久に赤くなる');
  const engine = fs.readFileSync(ABODE_JS, 'utf8');
  assert.ok(!engine.includes(drafted) && !engine.includes(measured),
    '器が凍結値を定数として持っている — 凍結は retreat-baseline.json が持つ');
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
