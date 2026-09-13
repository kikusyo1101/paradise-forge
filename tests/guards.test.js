#!/usr/bin/env node
'use strict';
/**
 * PARADISE :: guards self-test
 * ---------------------------------------------------------------------
 * 「門を作った」と言うだけでは門ではない。**壊して鳴ることを見せて**初めて門である。
 * ここは apply-guards.js だけを裁く。tests/paradise.test.js には一切触れない。
 *
 *   node tests/guards.test.js
 *
 * ~/.claude を持たない裸の環境でも緑になること — 自分のマシンでしか動かない
 * 門は門ではない。実環境依存の断定は skip する。
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DIR = __dirname;
const G = require(path.join(DIR, '..', 'graph', 'apply-guards.js'));

let pass = 0, fail = 0, skipped = 0;
function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); pass++; }
  catch (e) {
    if (e && e.__skip) { console.log('  \u00b7 ' + name + '  (skipped: ' + e.message + ')'); skipped++; return; }
    console.log('  \u2717 ' + name + '\n      ' + (e && e.message)); fail++;
  }
}
function skip(why) { const e = new Error(why); e.__skip = true; throw e; }

/**
 * **不在を skip と呼んでよいのは、外を向いていると名乗ったときだけである**
 * (憲法 第58条(e) / AC-41)。
 *
 * かつてこの走行の 4 門は `if (!fs.existsSync(G.SETTINGS)) skip(…)` と書いていた。
 * 住処が**神のマシンの資産**だった間はそれで正しかった —— 実測でも
 * `PARADISE_SETTINGS=/nonexistent` を立てれば `60 passed, 4 skipped` に落ちた。
 *
 * だが `<repo>/.claude/settings.json` は **git 追跡の派生物**である(AC-14)。
 * clone すれば必ず在る。在るべき物が無いのは「ハーネス不在」ではなく
 * **派生物の欠損**であり、それを skip と呼べば、配備が丸ごと消えても
 * この 4 門は緑を出し続ける(第37条)。
 *
 * ゆえに:
 *   mode=repo   → **赤**。直す命令まで名指す。
 *   mode=global → 理由を名乗って skip(`N skipped` に数えられる)。
 *
 * ⚠️ 住所と mode は**一度の解決から**採る。二度引けば「mode は repo と答えたのに
 * 住所は global」という割れ方をする(work-1 が check-agents で踏んだ罠)。
 * ただし `PARADISE_SETTINGS` を立てた走行では `G.SETTINGS` がそれを指すので、
 * **実際に読む道**(`G.SETTINGS`)で存否を裁く —— 門は engine が見る物を見る。
 */
function requireSettings() {
  // **`if (…) return x;` の形で書かない。** それは `--silent-green` が咎める形そのもの
  // であり、門が己の裁く形を使えば、いつか除外を作る羽目になる(第54条(d))。
  const site = require(path.join(DIR, '..', 'graph', 'abode.js')).resolve();
  if (!fs.existsSync(G.SETTINGS)) {
    assert.notStrictEqual(site.mode, 'repo',
      `リポジトリ内の住処に settings.json が無い: ${G.SETTINGS} — ` +
      '派生物の欠損である(ハーネス不在ではない)。node graph/deploy.js --write で建て直せ (第58条(e))');
    skip(`mode=${site.mode} (source=${site.source}) — 外を向いた住処はこの機の資産である: ${G.SETTINGS}`);
  }
  return G.SETTINGS;
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-guards-'));
function tmpSettings(obj, name = 'settings.json') {
  const p = path.join(TMP, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
  return p;
}

// ─────────────────────────────────────────────────────────────────────
console.log('Matcher diagnosis (公式仕様どおりに裁けるか):');

test('diagnose names `tool == "Bash" && ...` as DEAD', () => {
  const f = tmpSettings({ hooks: { PreToolUse: [{
    matcher: 'tool == "Bash" && tool_input.command matches "git push"',
    hooks: [{ type: 'command', command: 'node -e "0"' }],
  }] } });
  const rows = G.diagnose(f);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].status, 'dead',
    '公式仕様では matcher は完全一致かツール名への正規表現。この式は永遠に発火しない');
  assert.strictEqual(rows[0].matches.length, 0, '一致するツールが在ってはならない');
  assert.strictEqual(rows[0].event, 'PreToolUse');
});

test('diagnose names `tool == "Edit" || tool == "Write"` as OVERFIRE', () => {
  const f = tmpSettings({ hooks: { PreToolUse: [{
    matcher: 'tool == "Edit" || tool == "Write"',
    hooks: [{ type: 'command', command: 'node -e "0"' }],
  }] } });
  const rows = G.diagnose(f);
  assert.strictEqual(rows[0].status, 'overfire',
    '`||` が生む空の選択肢はあらゆる文字列に一致する。2つ止めるつもりで全部止まる');
  assert.strictEqual(rows[0].matches.length, G.KNOWN_TOOLS.length,
    '暴発とは「全ツールに当たる」ことである');
});

test('diagnose names "Bash|PowerShell" as LIVE (exact)', () => {
  const f = tmpSettings({ hooks: { PostToolUse: [{ matcher: 'Bash|PowerShell', hooks: [] }] } });
  const rows = G.diagnose(f);
  assert.strictEqual(rows[0].status, 'live');
  assert.strictEqual(rows[0].kind, 'exact', '英数と | だけなら完全一致の並びとして裁く');
  assert.deepStrictEqual(rows[0].matches, ['Bash', 'PowerShell']);
});

test('diagnose names "*" as LIVE wildcard matching every tool', () => {
  const f = tmpSettings({ hooks: { SessionStart: [{ matcher: '*', hooks: [] }] } });
  const rows = G.diagnose(f);
  assert.strictEqual(rows[0].kind, 'wildcard');
  assert.strictEqual(rows[0].status, 'live');
  assert.strictEqual(rows[0].matches.length, G.KNOWN_TOOLS.length);
});

test('classify treats an invalid regular expression as dead, not as a crash', () => {
  const c = G.classify('Bash(');
  assert.strictEqual(c.status, 'dead');
  assert.strictEqual(c.matches.length, 0);
});

// ─────────────────────────────────────────────────────────────────────
console.log('\nMatcher repair (死んだ門を生き返らせるか):');

test('repair rewrites a dead Bash matcher to "Bash|PowerShell"', () => {
  const r = G.repairGroup({
    matcher: 'tool == "Bash" && tool_input.command matches "git push"',
    hooks: [{ type: 'command', command: 'node -e "0"' }],
  });
  assert.strictEqual(r.changed, true);
  assert.strictEqual(r.next.matcher, 'Bash|PowerShell',
    'Windows では Bash ツールが登録されない場合がある — PowerShell を伴わせる');
  assert.strictEqual(G.classify(r.next.matcher).status, 'live', '直した結果が生きていなければ意味がない');
});

test('repair rewrites the overfiring Edit||Write matcher to "Edit|Write"', () => {
  const r = G.repairGroup({ matcher: 'tool == "Edit" || tool == "Write"', hooks: [] });
  assert.strictEqual(r.changed, true);
  assert.strictEqual(r.next.matcher, 'Edit|Write');
  const c = G.classify(r.next.matcher);
  assert.strictEqual(c.status, 'live');
  assert.deepStrictEqual(c.matches, ['Edit', 'Write'], '止めたかった二つだけを止める');
});

test('repair moves a simple command condition into the handler `if` field', () => {
  const r = G.repairGroup({
    matcher: 'tool == "Bash" && tool_input.command matches "git push"',
    hooks: [{ type: 'command', command: 'node -e "0"' }],
  });
  assert.strictEqual(r.rule, 'Bash(git push:*)', '条件部を捨てず permission rule 構文に移す');
  assert.strictEqual(r.next.hooks[0].if, 'Bash(git push:*)');
});

test('repair never emits an `if` containing && or || (spec: one rule only)', () => {
  const complex = G.repairGroup({
    matcher: 'tool == "Bash" && tool_input.command matches "(npm run dev|yarn dev)"',
    hooks: [{ type: 'command', command: 'node -e "0"' }],
  });
  assert.strictEqual(complex.rule, null, '交替を含む式は1ルールに畳めない — 移さずハンドラに委ねる');
  assert.ok(!('if' in complex.next.hooks[0]), '移せないなら if を書かない');
  assert.ok(/handler script/.test(complex.note), '捨てたのではなく委ねたことを機構自身が語る');
  for (const rule of [complex.rule, G.repairGroup({ matcher: 'tool == "Bash" && tool_input.command matches "git push"', hooks: [{}] }).rule]) {
    if (rule) assert.ok(!/&&|\|\|/.test(rule), '`if` に && や || は書けない');
  }
});

test('repair leaves a live matcher untouched', () => {
  const g = { matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'x' }] };
  const r = G.repairGroup(g);
  assert.strictEqual(r.changed, false);
  assert.strictEqual(r.group, g, '生きている門に手を入れてはならない');
});

test('repair refuses to guess when there is no `tool == "X"` clause', () => {
  const r = G.repairGroup({ matcher: 'ZZZNotATool', hooks: [] });
  assert.strictEqual(r.changed, false, '意図が読めない matcher を推測で書き換えない');
  assert.ok(/cannot infer intent/.test(r.note), '触らなかったことを黙っていてはならない');
});

// ─────────────────────────────────────────────────────────────────────
console.log('\nPOLICY (掟そのものが公式仕様に載っているか):');

test('POLICY denies force push, hard reset and --no-verify', () => {
  for (const rule of ['Bash(git push --force:*)', 'Bash(git push -f:*)',
                      'Bash(git push --force-with-lease:*)', 'Bash(git reset --hard:*)',
                      'Bash(git commit --no-verify:*)']) {
    assert.ok(G.POLICY.deny.includes(rule), 'deny に無い: ' + rule);
  }
});

test('POLICY protects ~/.claude and .env with Edit()/Read(), never Write()/MultiEdit()', () => {
  assert.ok(G.POLICY.deny.includes('Edit(~/.claude/**)'), '第19条: 配備物を手で触らない');
  assert.ok(G.POLICY.deny.includes('Read(**/.env)'), '第6条: 秘密は読むことすら許さない');
  assert.ok(G.POLICY.deny.includes('Read(**/.env.*)'));
  const all = [...G.POLICY.deny, ...G.POLICY.ask, ...G.POLICY.allow];
  for (const r of all) {
    assert.ok(!/^Write\(/.test(r), 'Write(...) は受理されるが参照されず起動時警告を出す: ' + r);
    assert.ok(!/^MultiEdit\(/.test(r), 'MultiEdit(...) も同じく参照されない: ' + r);
  }
});

test('POLICY asks (never allows) for gh pr merge — マージは神の御手', () => {
  assert.ok(G.POLICY.ask.includes('Bash(gh pr merge:*)'));
  assert.ok(!G.POLICY.allow.some(r => /gh pr merge/.test(r)));
  assert.ok(!G.POLICY.deny.some(r => /gh pr merge/.test(r)), 'deny では神ですら通せなくなる');
});

test('POLICY allows the paradise gates and read-only git', () => {
  for (const rule of ['Bash(node graph/*)', 'Bash(node tests/*)',
                      'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)']) {
    assert.ok(G.POLICY.allow.includes(rule), 'allow に無い: ' + rule);
  }
  assert.strictEqual(G.POLICY.defaultMode, 'default');
});

test('no allow rule contradicts a deny rule (deny wins and admits no exception)', () => {
  // deny -> ask -> allow の順で最初の一致が勝つ。allow に書いても deny は覆せない。
  // 覆せると思って書かれた allow は、書いた者を誤解させるだけの死文である。
  for (const a of G.POLICY.allow) {
    assert.ok(!G.POLICY.deny.includes(a), 'allow が deny と衝突: ' + a);
  }
});

// ─────────────────────────────────────────────────────────────────────
console.log('\napply / verify (機構としての振る舞い):');

const FIXTURE = () => ({
  env: { PATH: '$PATH:/c/Program Files/GitHub CLI' },
  enableWorkflows: true,
  extraKnownMarketplaces: { 'claude-plugins-official': { source: { source: 'github', repo: 'anthropics/claude-plugins-official' } } },
  language: 'japanese',
  theme: 'dark',
  model: 'fable',
  effortLevel: 'xhigh',
  hooks: {
    PreToolUse: [
      { matcher: 'tool == "Bash" && tool_input.command matches "git push"',
        hooks: [{ type: 'command', command: 'node -e "0"' }], description: 'push reminder' },
      { matcher: 'tool == "Edit" || tool == "Write"',
        hooks: [{ type: 'command', command: 'node suggest-compact.js' }], description: 'compact' },
    ],
    SessionStart: [{ matcher: '*', hooks: [{ type: 'command', command: 'node session-start.js' }] }],
  },
});

test('apply writes the permissions block that was entirely absent', () => {
  const f = tmpSettings(FIXTURE(), 'apply1.json');
  assert.strictEqual(G.readSettings(f).permissions, undefined, '前提: permissions は存在しない');
  const r = G.apply(f);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.changed, true);
  const s = G.readSettings(f);
  assert.deepStrictEqual(s.permissions.deny, G.POLICY.deny);
  assert.deepStrictEqual(s.permissions.ask, G.POLICY.ask);
  assert.deepStrictEqual(s.permissions.allow, G.POLICY.allow);
  assert.strictEqual(s.permissions.defaultMode, 'default');
});

test('apply revives the dead matchers in the same pass', () => {
  const f = tmpSettings(FIXTURE(), 'apply2.json');
  G.apply(f);
  const rows = G.diagnose(f);
  assert.strictEqual(rows.filter(r => r.status === 'dead').length, 0, '死んだ門が残ってはならない');
  assert.strictEqual(rows.filter(r => r.status === 'overfire').length, 0, '暴発する門も残してはならない');
  const s = G.readSettings(f);
  assert.strictEqual(s.hooks.PreToolUse[0].matcher, 'Bash|PowerShell');
  assert.strictEqual(s.hooks.PreToolUse[1].matcher, 'Edit|Write');
  assert.strictEqual(s.hooks.PreToolUse[0].hooks[0].if, 'Bash(git push:*)');
});

test('apply is idempotent — twice yields byte-identical files', () => {
  const f = tmpSettings(FIXTURE(), 'idem.json');
  const r1 = G.apply(f);
  const after1 = fs.readFileSync(f);
  const r2 = G.apply(f);
  const after2 = fs.readFileSync(f);
  assert.strictEqual(r1.changed, true);
  assert.strictEqual(r2.changed, false, '2度目は書くことが無いはずである');
  assert.ok(after1.equals(after2), '冪等でない機構は、走らせるたびに配備物を揺らす');
});

test('apply preserves every unrelated key', () => {
  const before = FIXTURE();
  const f = tmpSettings(before, 'preserve.json');
  G.apply(f);
  const after = G.readSettings(f);
  // ⚠️ `env` はこの一覧に **無い**。FIXTURE の env.PATH は展開されない `$PATH` を
  // 持つ壊れた値であり、第三の職責がこれを削除する(それが正しい振る舞いである)。
  // env の保存/削除は下の「env health」の節が専任で裁く。
  for (const k of ['model', 'effortLevel', 'theme', 'language', 'extraKnownMarketplaces', 'enableWorkflows']) {
    assert.deepStrictEqual(after[k], before[k], `キー ${k} が保存されていない`);
  }
  // hooks の中身(コマンド・説明・件数)も matcher 以外は保存されねばならない
  assert.strictEqual(after.hooks.PreToolUse.length, 2);
  assert.strictEqual(after.hooks.PreToolUse[0].description, 'push reminder');
  assert.strictEqual(after.hooks.PreToolUse[0].hooks[0].command, 'node -e "0"');
  assert.strictEqual(after.hooks.PreToolUse[1].hooks[0].command, 'node suggest-compact.js');
  assert.strictEqual(after.hooks.SessionStart[0].matcher, '*', '生きている matcher は素通し');
  assert.strictEqual(after.hooks.SessionStart[0].hooks[0].command, 'node session-start.js');
});

test('apply keeps unknown permission sub-keys instead of silently dropping them', () => {
  const base = FIXTURE();
  base.permissions = { additionalDirectories: ['/srv/data'] };
  const f = tmpSettings(base, 'unknown.json');
  G.apply(f);
  assert.deepStrictEqual(G.readSettings(f).permissions.additionalDirectories, ['/srv/data']);
});

test('missing settings.json returns {skipped:true, ok:true} and never crashes', () => {
  const gone = path.join(TMP, 'does-not-exist', 'settings.json');
  for (const r of [G.diff(gone), G.verify(gone), G.apply(gone)]) {
    assert.strictEqual(r.skipped, true);
    assert.strictEqual(r.ok, true);
  }
  assert.deepStrictEqual(G.diagnose(gone), []);
});

test('verify detects drift after permissions are deleted by hand', () => {
  const f = tmpSettings(FIXTURE(), 'drift.json');
  G.apply(f);
  assert.strictEqual(G.verify(f).ok, true, 'apply 直後は一致していなければならない');
  const s = G.readSettings(f);
  delete s.permissions;                                   // 手で門を外す
  fs.writeFileSync(f, JSON.stringify(s, null, 2) + '\n');
  const v = G.verify(f);
  assert.strictEqual(v.ok, false, 'exit 1 相当 — 門が消えたのに緑を出す検査は無いのと同じ');
  assert.strictEqual(v.skipped, false);
  assert.ok(v.changes.some(c => c.kind === 'permissions'), '何が乖離したかを名指すこと');
});

test('verify detects drift when a single deny rule is quietly removed', () => {
  const f = tmpSettings(FIXTURE(), 'drift2.json');
  G.apply(f);
  const s = G.readSettings(f);
  s.permissions.deny = s.permissions.deny.filter(r => !/--force\b/.test(r));
  fs.writeFileSync(f, JSON.stringify(s, null, 2) + '\n');
  assert.strictEqual(G.verify(f).ok, false, '一本抜かれただけでも乖離である');
});

test('verify detects drift when a repaired matcher is reverted to the dead form', () => {
  const f = tmpSettings(FIXTURE(), 'drift3.json');
  G.apply(f);
  const s = G.readSettings(f);
  s.hooks.PreToolUse[0].matcher = 'tool == "Bash" && tool_input.command matches "git push"';
  fs.writeFileSync(f, JSON.stringify(s, null, 2) + '\n');
  const v = G.verify(f);
  assert.strictEqual(v.ok, false);
  assert.ok(v.changes.some(c => c.kind === 'matcher'), '死んだ matcher の復活を検出せよ');
});

test('apply never touches the real ~/.claude when given an explicit path', () => {
  const f = tmpSettings(FIXTURE(), 'isolated.json');
  const real = G.SETTINGS;
  const before = fs.existsSync(real) ? fs.readFileSync(real) : null;
  G.apply(f);
  if (before) assert.ok(before.equals(fs.readFileSync(real)), '明示パスを渡したのに実環境を書き換えた');
});

// ─────────────────────────────────────────────────────────────────────
console.log('\nEnv health (門が鳴っても走れなければ同じこと — 第三の職責):');

/*
 * 門を破って鳴る証明。
 * `env: { "PATH": "$PATH:/x" }` の `$PATH` は **展開されない**。実測:
 *     $ PATH='$PATH:/c/Program Files/GitHub CLI' bash -c 'command -v node'
 *       node: command not found
 * この一行が settings.json の hook 15/15 を殺していた。しかも exit=0 で黙って。
 */
test('envDrift names `$PATH:/x` as a FATAL unexpanded reference', () => {
  const f = tmpSettings({ env: { PATH: '$PATH:/x' } }, 'envfatal.json');
  const rows = G.envDrift(G.readSettings(f));
  assert.strictEqual(rows.length, 1, '壊れた env が一件も名指されないなら門ではない');
  assert.strictEqual(rows[0].key, 'PATH');
  assert.strictEqual(rows[0].kind, 'unexpanded-posix');
  assert.strictEqual(rows[0].severity, 'fatal',
    'PATH に $PATH が入るのは既存 PATH を丸ごと失う — 他の未展開参照と同列にしてはならない');
  assert.ok(/PATH/.test(rows[0].detail), '何が起きるのかを機構自身が語ること');
});

test('envDrift detects the Windows form `%PATH%;C:\\x` too', () => {
  const rows = G.envDrift({ env: { PATH: '%PATH%;C:\\x' } });
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].kind, 'unexpanded-windows');
  assert.strictEqual(rows[0].severity, 'fatal', 'Windows 形式でも失うものは同じである');
});

test('envDrift detects `${VAR}` braces form', () => {
  const rows = G.envDrift({ env: { PATH: '${PATH}:/x' } });
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].kind, 'unexpanded-posix');
  assert.strictEqual(rows[0].severity, 'fatal');
});

test('envDrift reports a non-PATH unexpanded reference as warn, not fatal', () => {
  const rows = G.envDrift({ env: { OTHER: '$HOME/x' } });
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].key, 'OTHER');
  assert.strictEqual(rows[0].severity, 'warn', 'PATH 以外は害が局所的 — 同じ重さで叫べば fatal が埋もれる');
  assert.ok(/report-only/.test(rows[0].repair), '消さないことを黙っていてはならない');
});

test('envDrift stays silent on a clean env — 正常な env で乖離ゼロ', () => {
  assert.deepStrictEqual(G.envDrift({ env: { FOO: 'bar' } }), [],
    '無害な env に赤を出す門は、いずれ誰も見なくなる');
  assert.deepStrictEqual(G.envDrift({ env: { PATH: '/usr/bin:/c/Program Files/nodejs' } }), [],
    '素の絶対パスだけの PATH は健全である');
  assert.deepStrictEqual(G.envDrift({}), [], 'env が無いのは欠陥ではない');
  assert.deepStrictEqual(G.envDrift(null), []);
});

test('apply deletes the broken env.PATH line — 足していないものを消す', () => {
  // 実測: GitHub CLI は素の PATH に既に4回入っていた。あの一行は何も足さず、
  // PATH を破壊してフックを殺すだけの存在だった。ゆえに修復は「削除」である。
  const f = tmpSettings({ env: { PATH: '$PATH:/c/Program Files/GitHub CLI' }, model: 'fable' }, 'envapply.json');
  const r = G.apply(f);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.changed, true);
  const s = G.readSettings(f);
  assert.strictEqual(s.env, undefined, 'env が空になったら器ごと消す');
  assert.strictEqual(s.model, 'fable', '無関係のキーは触らない');
  assert.ok(r.changes.some(c => c.kind === 'env' && c.key === 'PATH'), '何を消したかを名指すこと');
});

test('apply deletes ONLY PATH and keeps every other env key', () => {
  const f = tmpSettings({ env: { PATH: '$PATH', OTHER: '$HOME/x' } }, 'envonly.json');
  G.apply(f);
  const s = G.readSettings(f);
  assert.ok(s.env && typeof s.env === 'object', 'OTHER が残る以上 env も残らねばならない');
  assert.strictEqual(s.env.PATH, undefined, '壊れた PATH は消える');
  assert.strictEqual(s.env.OTHER, '$HOME/x',
    'PATH 以外のキーを勝手に消す機構は、いずれ誰かの設定を黙って壊す');
});

test('apply leaves a healthy env untouched', () => {
  const f = tmpSettings({ env: { FOO: 'bar', PATH: '/usr/bin' } }, 'envhealthy.json');
  G.apply(f);
  assert.deepStrictEqual(G.readSettings(f).env, { FOO: 'bar', PATH: '/usr/bin' });
});

test('env repair is idempotent — twice yields byte-identical files', () => {
  const f = tmpSettings({ env: { PATH: '$PATH:/x', OTHER: 'plain' }, model: 'fable' }, 'envidem.json');
  const r1 = G.apply(f);
  const a1 = fs.readFileSync(f);
  const r2 = G.apply(f);
  const a2 = fs.readFileSync(f);
  assert.strictEqual(r1.changed, true);
  assert.strictEqual(r2.changed, false, '2度目は書くことが無いはずである');
  assert.ok(a1.equals(a2), '冪等でない機構は、走らせるたびに配備物を揺らす');
});

test('apply with a broken env preserves model/effortLevel/hooks/permissions/theme/language', () => {
  const before = FIXTURE();
  const f = tmpSettings(before, 'envpreserve.json');
  G.apply(f);
  const after = G.readSettings(f);
  for (const k of ['model', 'effortLevel', 'theme', 'language']) {
    assert.deepStrictEqual(after[k], before[k], `キー ${k} が env の修復で失われた`);
  }
  assert.strictEqual(after.env, undefined, 'FIXTURE の env は PATH ただ一つ — 器ごと消える');
  assert.strictEqual(Object.keys(after.hooks).length, Object.keys(before.hooks).length, 'hooks の事象が減った');
  assert.strictEqual(after.hooks.PreToolUse.length, 2);
  assert.deepStrictEqual(after.permissions.deny, G.POLICY.deny, 'permissions は同じ pass で書かれる');
});

test('verify goes red on a fatal env drift and green after apply', () => {
  const f = tmpSettings({ env: { PATH: '$PATH:/x' } }, 'envverify.json');
  const v = G.verify(f);
  assert.strictEqual(v.skipped, false);
  assert.strictEqual(v.ok, false, 'exit 1 相当 — PATH が壊れたまま緑を出す検査は無いのと同じ');
  assert.ok(v.changes.some(c => c.kind === 'env'), '何が乖離したかを名指すこと');
  assert.strictEqual(v.envFatal, 1, 'fatal を数えられなければ deploy は判断できない');
  G.apply(f);
  const v2 = G.verify(f);
  assert.strictEqual(v2.ok, true, '直したのに赤のままなら、その門は治癒を認めない');
  assert.strictEqual(v2.envFatal, 0);
});

test('missing settings.json: env inspection skips instead of crashing', () => {
  const gone = path.join(TMP, 'does-not-exist', 'settings.json');
  const d = G.diff(gone);
  assert.strictEqual(d.skipped, true);
  assert.strictEqual(d.ok, true);
  assert.deepStrictEqual(G.hookHealth(G.readSettings(gone)), [],
    '裸の環境では検べるものが無いだけであり、欠陥ではない');
});

// ─────────────────────────────────────────────────────────────────────
console.log('\nhookHealth (フックは本当に走れるのか):');

test('commandExe strips quotes and directories to the bare executable name', () => {
  assert.strictEqual(G.commandExe('node "C:/x/session-end.js"'), 'node');
  assert.strictEqual(G.commandExe('/usr/bin/bash -c "x"'), 'bash');
  assert.strictEqual(G.commandExe('"C:/Program Files/nodejs/node.exe" a.js'), 'node.exe');
  assert.strictEqual(G.commandExe('  python3 x.py '), 'python3');
  assert.strictEqual(G.commandExe(''), '');
});

test('splitPathList does not split on a Windows drive letter colon', () => {
  assert.deepStrictEqual(G.splitPathList('C:/a:/usr/bin'), ['C:/a', '/usr/bin']);
  assert.deepStrictEqual(G.splitPathList('C:\\a;D:\\b'), ['C:\\a', 'D:\\b']);
  assert.deepStrictEqual(G.splitPathList(''), []);
});

test('hookHealth resolves `node` under the CURRENT process PATH', () => {
  const rows = G.hookHealth({ hooks: { SessionStart: [{ matcher: '*',
    hooks: [{ type: 'command', command: 'node "C:/x/paradise-session-start.js"' }] }] } });
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].event, 'SessionStart');
  assert.strictEqual(rows[0].exe, 'node');
  assert.strictEqual(rows[0].resolvable, true,
    'このテストは node で走っている — その node が PATH で見つからないなら検査が壊れている');
  assert.strictEqual(rows[0].resolvableUnderEnv, null,
    'env.PATH が無いなら第二の判定は「判定不能」であって緑ではない');
});

test('hookHealth states its basis — 嘘の安心を与えない', () => {
  const rows = G.hookHealth({ hooks: { SessionEnd: [{ matcher: '*',
    hooks: [{ type: 'command', command: 'node x.js' }] }] } });
  assert.ok(/現プロセスの PATH/.test(rows[0].basis),
    'どの PATH で検べたのかを言わない緑は、嘘の安心である');
  assert.ok(/現プロセスの PATH/.test(G.HOOK_HEALTH_CAVEAT));
});

/*
 * これが本体。実機で起きたことの回帰試験である:
 *   SessionEnd hook [node ".../session-end.js"] failed:
 *     /usr/bin/bash: line 1: node: command not found
 */
test('hookHealth reports `node` as UNRESOLVABLE under env.PATH="$PATH:/x"', () => {
  const settings = {
    env: { PATH: '$PATH:/x' },
    hooks: {
      SessionStart: [{ matcher: '*', hooks: [{ type: 'command', command: 'node "C:/x/paradise-session-start.js"' }] }],
      SessionEnd: [{ matcher: '*', hooks: [{ type: 'command', command: 'node "C:/x/session-end.js"' }] }],
    },
  };
  const rows = G.hookHealth(settings);
  assert.strictEqual(rows.length, 2);
  for (const r of rows) {
    assert.strictEqual(r.exe, 'node');
    assert.strictEqual(r.resolvable, true, '現プロセスの PATH では見える — だからこそ誰も気づかなかった');
    assert.strictEqual(r.resolvableUnderEnv, false,
      '`$PATH` はリテラル文字列であり、そこに node は居ない。実機の `command not found` の正体');
    assert.strictEqual(r.envPath, '$PATH:/x');
  }
});

test('hookHealth goes green under env.PATH once the broken line is removed', () => {
  const settings = {
    env: { PATH: '$PATH:/x' },
    hooks: { SessionEnd: [{ matcher: '*', hooks: [{ type: 'command', command: 'node x.js' }] }] },
  };
  const f = tmpSettings(settings, 'healthfix.json');
  G.apply(f);
  const rows = G.hookHealth(G.readSettings(f));
  assert.strictEqual(rows[0].resolvableUnderEnv, null, 'env.PATH が消えたので第二の判定は判定不能に戻る');
  assert.strictEqual(rows[0].resolvable, true, '現 PATH では走れる — それが素の状態である');
});

test('hookHealth resolves an absolute-path exe name under a real PATH entry', () => {
  const dir = path.join(TMP, 'bin');
  fs.mkdirSync(dir, { recursive: true });
  const exe = process.platform === 'win32' ? 'faketool.cmd' : 'faketool';
  fs.writeFileSync(path.join(dir, exe), '');
  assert.strictEqual(G.resolvesIn('faketool', dir), true, 'Windows では .cmd/.bat/.exe も試すこと');
  assert.strictEqual(G.resolvesIn('faketool', path.join(TMP, 'nope')), false);
});

// ─────────────────────────────────────────────────────────────────────
console.log('\nDeploy integration (工程に組み込まれているか):');

test('deploy.js invokes apply-guards in both check and write', () => {
  const src = fs.readFileSync(path.join(DIR, '..', 'graph', 'deploy.js'), 'utf8');
  assert.ok(/apply-guards/.test(src), 'deploy が掟を運ばなければ、掟は永久に書かれない');
  const [checkPart, writePart] = src.split('function write()');
  assert.ok(/apply-guards/.test(checkPart), 'check がガードのドリフトを数えていない');
  assert.ok(/apply-guards/.test(writePart), 'write がガードを配備していない');
});

test('deploy.check() still runs and counts guards without throwing', () => {
  const dep = require(path.join(DIR, '..', 'graph', 'deploy.js'));
  const r = dep.check();
  assert.ok(r.skipped || typeof r.checked === 'number');
  if (!r.skipped) assert.ok(Array.isArray(r.drift));
});

// ─────────────────────────────────────────────────────────────────────
console.log('\nLive machine (実環境 — 無い環境では skip):');

/*
 * ⚠️ ここには当初「dead が 8 件ある」「permissions がまだ無い」という
 * **今日の病状を凍結した検査**が置かれていた。掟が機構になった瞬間に
 * 3件とも赤くなった — 病が治ったから門が鳴る、という倒錯である。
 *
 * 門は **不変条件** を主張するのであって、スナップショットを主張しない。
 * 「もし神が明日これを正当に変えたとき、私の門は欠陥を報告するか?」
 * 答えが「する」なら、それは門ではなく写真である。
 *
 * 主張すべき不変条件は一つ: **死んだ matcher と暴発する matcher が無いこと。**
 * 数がいくつであれ、治っていればよい。
 */

test('the real settings.json has no dead and no overfiring matcher', () => {
  requireSettings();
  const rows = G.diagnose(G.SETTINGS);
  const broken = rows.filter(r => r.status === 'dead' || r.status === 'overfire');
  assert.strictEqual(broken.length, 0,
    `発火しない/暴発する matcher が残っている: ${broken.map(d => d.status + ' ' + d.event + '[' + d.index + ']').join(', ')}`
    + '  → node graph/apply-guards.js apply');
});

test('every matcher on the real machine is classifiable and hits at least one tool', () => {
  requireSettings();
  const rows = G.diagnose(G.SETTINGS);
  assert.ok(rows.length > 0, 'matcher が一つも読めていないなら診断が壊れている');
  for (const r of rows) {
    assert.ok(['exact', 'regex', 'wildcard'].includes(r.kind), `未分類の matcher: ${r.matcher}`);
    assert.ok(r.matches.length > 0, `一つのツールにも当たらない matcher: ${r.event} ${r.matcher}`);
  }
});

test('the law IS the machinery on the real machine — permissions present, no drift', () => {
  requireSettings();
  const d = G.diff(G.SETTINGS);
  assert.strictEqual(d.skipped, false);
  // ⚠️ `d.drift` は存在しないキーだった — 乖離があっても理由が空欄で出ていた。
  // 何が乖離したのか言えない赤は、直しようがない赤である。
  assert.strictEqual(d.ok, true,
    `掟と機構が乖離している:\n        `
    + (d.changes || []).map(c => `${c.kind}: ${c.note}`).join('\n        ')
    + '\n      → node graph/apply-guards.js apply');
});

// ─────────────────────────────────────────────────────────────────────
console.log('\nUnconditional BLOCK (修理が開いた面 — 第四の職責 / 第57条):');

// 実測された欠陥の再現。この群は `npm run dev` だけを止めるつもりで書かれた。
// 修復前は matcher が死んでいたので何も止めなかった。修復が matcher を生かし、
// 条件は `if` に載らず、ハンドラも tool_input を読まない —— 結果、全 Bash が止まった。
const DEV_SERVER_GROUP = {
  matcher: 'tool == "Bash" && tool_input.command matches "(npm run dev|pnpm( run)? dev|yarn dev|bun run dev)"',
  hooks: [{ type: 'command', command: "node -e \"console.error('[Hook] BLOCKED: Dev server must run in tmux');process.exit(1)\"" }],
  description: 'Block dev servers outside tmux',
};

test('repairGroup refuses to widen a BLOCK whose condition cannot be carried', () => {
  const r = G.repairGroup(DEV_SERVER_GROUP);
  assert.strictEqual(r.changed, false, '条件を運べない BLOCK を修復してはならない');
  assert.ok(/refused/.test(r.note), `拒否の理由が note に残っていない: ${r.note}`);
  assert.ok(/never reads tool_input/.test(r.note), '前提を検めた事実が note に残っていない');
});

test('a repaired-but-widened BLOCK is detected as unconditional', () => {
  // 修復が既に済んでしまった形 — これが実機に配備されていた。
  const widened = { ...DEV_SERVER_GROUP, matcher: 'Bash|PowerShell' };
  assert.strictEqual(G.isUnconditionalBlock(widened), true);
});

test('a handler that reads tool_input is NOT an unconditional block', () => {
  const conditional = {
    matcher: 'Write',
    hooks: [{ type: 'command', command: "node -e \"process.stdin.on('end',()=>{const i=JSON.parse(d);if(/x/.test(i.tool_input.file_path))process.exit(1)})\"" }],
  };
  assert.strictEqual(G.isUnconditionalBlock(conditional), false,
    'スクリプト側で条件を持つ門を無条件と呼んではならない');
});

test('a notify-only handler is never removed', () => {
  const notify = {
    matcher: 'Bash|PowerShell',
    hooks: [{ type: 'command', command: "node -e \"console.error('reminder')\"" }],
  };
  assert.strictEqual(G.isUnconditionalBlock(notify), false, '止めない門を外してはならない');
});

test('a dead matcher is not an unconditional block (a dead gate stops nothing)', () => {
  assert.strictEqual(G.isUnconditionalBlock(DEV_SERVER_GROUP), false);
});

test('buildDesired removes a deployed unconditional BLOCK', () => {
  const settings = { hooks: { PreToolUse: [{ ...DEV_SERVER_GROUP, matcher: 'Bash|PowerShell' }] } };
  const { next, changes } = G.buildDesired(settings);
  assert.strictEqual(next.hooks.PreToolUse.length, 0, '無条件 BLOCK が残っている');
  assert.ok(changes.some(c => c.kind === 'unconditional-block'), '外したことが changes に出ていない');
});

test('buildDesired removes a forbidden hook by declared name', () => {
  const mdBlocker = {
    matcher: 'Write',
    hooks: [{ type: 'command', command: "node -e \"process.stdin.on('end',()=>{const i=JSON.parse(d);console.error('BLOCKED: Unnecessary documentation file creation');process.exit(1)})\"" }],
    description: 'Block creation of random .md files',
  };
  const { next, changes } = G.buildDesired({ hooks: { PreToolUse: [mdBlocker] } });
  assert.strictEqual(next.hooks.PreToolUse.length, 0, '禁じられた強制が残っている');
  const c = changes.find(x => x.kind === 'forbidden-hook');
  assert.ok(c, '外したことが changes に出ていない');
  assert.ok(c.note && c.note.length > 10, '理由が空の除去は、直しようがない除去である');
});

test('every FORBIDDEN_HOOKS entry carries a reason', () => {
  assert.ok(G.FORBIDDEN_HOOKS.length > 0);
  for (const f of G.FORBIDDEN_HOOKS) {
    assert.ok(f.event && f.match && f.reason, `理由なき禁止: ${JSON.stringify(f)}`);
  }
});

// レビューで見つかった、この修正自身が開いた面 (第57条(c) を自分に適用する)。
// 「無条件 BLOCK を外す」機構は、外してはならない門まで外しかけていた。

test('removal is scoped to tool-gating events — a SessionStart hook survives', () => {
  const s = { hooks: { SessionStart: [{ matcher: '*',
    hooks: [{ type: 'command', command: "node -e \"if(!ok){process.exit(1)}\"" }] }] } };
  const { next } = G.buildDesired(s);
  assert.strictEqual(next.hooks.SessionStart.length, 1,
    'tool_input を持ちえない event の門を、条件が無いという理由で消してはならない');
});

test('removal is scoped to tool-gating events — a Stop hook survives', () => {
  const s = { hooks: { Stop: [{ matcher: '*',
    hooks: [{ type: 'command', command: "node -e \"process.exit(1)\"" }] }] } };
  const { next } = G.buildDesired(s);
  assert.strictEqual(next.hooks.Stop.length, 1);
});

test('TOOL_GATE_EVENTS names only events where a non-zero exit stops the tool', () => {
  assert.deepStrictEqual(G.TOOL_GATE_EVENTS, ['PreToolUse']);
});

test('handlerBlocks does not mistake "exit 1" inside a message for a block', () => {
  const notify = "node -e \"console.error('hint: run exit 1 to stop')\"";
  assert.strictEqual(G.handlerBlocks(notify), false,
    '無実の門を BLOCK と誤認すれば、その門は黙って外される');
});

test('handlerBlocks still catches a real shell exit at a statement boundary', () => {
  assert.strictEqual(G.handlerBlocks("grep -q x file || exit 1"), true);
  assert.strictEqual(G.handlerBlocks("node -e \"process.exit(1)\""), true);
});

test('the real machine enforces no unconditional BLOCK', () => {
  requireSettings();
  const s = G.readSettings(G.SETTINGS);
  const bad = [];
  for (const [event, groups] of Object.entries((s && s.hooks) || {})) {
    if (!Array.isArray(groups)) continue;
    groups.forEach(g => { if (G.isUnconditionalBlock(g)) bad.push(`${event}: ${g.matcher}`); });
  }
  assert.deepStrictEqual(bad, [],
    `無条件に止める門が実機に配備されている:\n        ${bad.join('\n        ')}`);
});

/**
 * ══ 台帳 EX-1 は実機で生きているか (AC-42 / 第58条(b)) ══════════════
 *
 * 上の 4 門を**リポジトリ内の住処へ向け直した**結果、誰も実機を見なくなる。
 * だが EX-1(`~/.claude/settings.json#/permissions`)は**意図してグローバルに
 * 残る輸出**である —— その deny 9 件が守るのは神の全プロジェクトであり、
 * 出所が楽園だからと機械的に引けば、神が他所の倉で作業した瞬間に
 * force-push が通る。**出所と守備範囲は別である。**
 *
 * ゆえに向け直した 4 門の**片翼**としてこの門を建てる。
 * **輸出は「出したら終わり」ではない。出した先も門が見張る。**
 */
console.log('\n輸出の腐食 (台帳 EX-1 / 第58条(b)):');

test('台帳 EX-1 は実機で生きている (輸出の腐食を見張る / AC-42)', () => {
  const abode = require(path.join(DIR, '..', 'graph', 'abode.js'));
  const ex1 = abode.exportFor('EX-1');
  assert.ok(ex1, 'EX-1 が台帳から消えた — permissions を守る者が居なくなる');
  assert.strictEqual(ex1.writer, 'graph/apply-guards.js',
    `EX-1 の writer が ${ex1.writer} に変わっている — 書く者が変われば守りの出所も変わる`);
  // **住所は台帳と器が答える。** 門が os.homedir() を組み立てれば住所が二本になる。
  const v = abode.verifyExport('EX-1');
  if (v.skipped) skip(v.skipped);          // ★ 黙って return しない (AC-42 の後段)
  assert.ok(v.ok, `EX-1 の輸出が腐っている(実機 ${v.path}):\n        ` + v.why.join('\n        ')
    + '\n      → node graph/apply-guards.js apply');
  assert.deepStrictEqual(v.counts, { deny: 9, ask: 1, allow: 5 },
    `実機の permissions の数が台帳の記録と違う: ${JSON.stringify(v.counts)}`);
});

test('【逆】実機の deny が 1 行消えれば EX-1 の照合は赤になる (AC-28)', () => {
  // **現物は 1 バイトも触らない。** 複製を作り、そこを実機と偽って撃つ
  // (第58条(c): 門は己の測る対象を汚してはならない)。
  const abode = require(path.join(DIR, '..', 'graph', 'abode.js'));
  const real = abode.exportRealPath('EX-1');
  if (!real || !fs.existsSync(real)) skip(`実機の ${real} が無い — 逆の門は撃てない`);
  const fake = path.join(TMP, 'ex1-home');
  fs.mkdirSync(path.join(fake, '.claude'), { recursive: true });
  const s = JSON.parse(fs.readFileSync(real, 'utf8'));
  const gone = (s.permissions.deny || [])[0];
  assert.ok(gone, '実機の deny が空 — 撃つ材料が無い');
  s.permissions.deny = s.permissions.deny.filter(x => x !== gone);
  fs.writeFileSync(path.join(fake, '.claude', 'settings.json'), JSON.stringify(s, null, 2) + '\n');
  const v = abode.verifyExport('EX-1', { env: { USERPROFILE: fake, HOME: fake } });
  assert.strictEqual(v.ok, false, 'deny を 1 行消しても緑なら、輸出は見張られていない');
  assert.ok(v.why.some(w => w.includes(gone)), `消えた deny 文字列 ${gone} を名指していない: ${v.why.join(' / ')}`);
});

// ─────────────────────────────────────────────────────────────────────
console.log('\n撤収の移送先 (AC-32 / 裁可 2-A) と輸出 EX-3 (裁可 1-A):');

test('【正】AC-32 — repo の住処の settings に楽園のフックが生える (撤収は消すではなく移す)', () => {
  const want = G.repoHooksFor(G.repoSettingsFile());
  assert.ok(want.SessionStart && want.SessionStart.length === 1,
    '移送先の宣言に楽園のフックが無い — 引いた先で機能が消える');
  const cmd = String(want.SessionStart[0].hooks[0].command);
  assert.ok(/paradise-session-start\.js/.test(cmd), `楽園のフックを指していない: ${cmd}`);
  // **絶対パスを書かない。** 倉の絶対パス直書きは AC-30 の逆向き依存そのものである。
  assert.ok(/\$CLAUDE_PROJECT_DIR/.test(cmd), `$CLAUDE_PROJECT_DIR を使っていない: ${cmd}`);
  assert.ok(!/[A-Za-z]:\//.test(cmd), `絶対パスを直書きしている — 倉を動かせば壊れる: ${cmd}`);
});

test('【逆】神の住処へは楽園のフックを 1 本も足さない — env ではなく宛先で決まる', () => {
  /**
   * `PARADISE_ABODE=repo` を名乗った者が神の住処へ楽園のフックを書けてはならない。
   * env で分岐すれば、住処を取り違えた一回の走行が神のホームを汚す。
   */
  const godFile = path.join(TMP, 'god-abode', 'settings.json');
  assert.deepStrictEqual(G.repoHooksFor(godFile), {},
    '神の住処に楽園のフックを生やそうとした (宛先ではなく env で分岐している)');
  const s = { hooks: { SessionStart: [] }, permissions: {} };
  const r = G.buildDesired(s, { file: godFile });
  assert.strictEqual((r.next.hooks.SessionStart || []).length, 0,
    'buildDesired が神の住処へ楽園のフックを足した');
  assert.ok(!r.changes.some(c => c.kind === 'repo-hook'),
    '神の住処に対して repo-hook の変更を立てた');
});

test('【正】移送先の宣言は二度撃っても増えない (冪等)', () => {
  const file = G.repoSettingsFile();
  const once = G.buildDesired({ permissions: {} }, { file });
  const twice = G.buildDesired(once.next, { file });
  assert.strictEqual((twice.next.hooks.SessionStart || []).length, 1,
    '同じフックが二本生えた — apply を二度走らせれば増殖する');
  assert.ok(!twice.changes.some(c => c.kind === 'repo-hook'),
    '既に居るフックを「無い」と診断した');
});

test('【正】EX-3 — 台帳の宛先・writer・照合の道が実在する', () => {
  const abode = require(path.join(DIR, '..', 'graph', 'abode.js'));
  const e = abode.exportFor('EX-3');
  assert.ok(e, 'graph/abode.json に EX-3 が無い — 台帳に無い宛先へは書けない');
  assert.strictEqual(e.writer, 'graph/apply-hooks.js');
  assert.ok(fs.existsSync(path.join(DIR, '..', e.writer)), `writer が実在しない: ${e.writer}`);
  assert.strictEqual(e.ordainedBy, 'god');
  assert.ok(/1-A/.test(e.ordainedVia), `裁可 1-A への言及が無い: ${e.ordainedVia}`);
});

test('【正】EX-3 — 汎用 5 本と、それが引く lib 2 本が台帳の運ぶ物である', () => {
  const H = require(path.join(DIR, '..', 'graph', 'apply-hooks.js'));
  assert.strictEqual(H.HOOK_FILES.length, 5, '汎用フックは 5 本である');
  assert.deepStrictEqual(H.LIB_FILES.slice().sort(), ['package-manager.js', 'utils.js'],
    'lib を運ばなければ require が解けない — 5 本だけ複製しても動かない(実測)');
  // 源が実在すること。源が欠けたまま移せば、神の住処に半端な複製が残る。
  for (const f of H.HOOK_FILES) {
    assert.ok(fs.existsSync(path.join(H.SRC_HOOKS, f)), `源が無い: hooks/${f}`);
  }
  for (const f of H.LIB_FILES) {
    assert.ok(fs.existsSync(path.join(H.SRC_LIB, f)), `源が無い: lib/${f}`);
  }
});

test('【正】EX-3 — 複製先の構造は scripts/{hooks,lib} で、相対 require が解ける', () => {
  /**
   * `evaluate-session.js` は `__dirname/../../skills/continuous-learning/config.json`
   * を読む。`~/.claude/scripts/hooks/` に置いて初めてこれが
   * `~/.claude/skills/continuous-learning/config.json` を指す —— **ちょうど二段**である。
   * 一段浅くても深くても config を失う。
   */
  const H = require(path.join(DIR, '..', 'graph', 'apply-hooks.js'));
  const fake = path.join(TMP, 'ex3-home');
  const dest = path.join(fake, '.claude', 'scripts');
  const p = H.plan({ dest });
  assert.strictEqual(p.unmeasurable, null, `計画が測れない: ${p.unmeasurable}`);
  assert.strictEqual(p.steps.length, 7, `運ぶ物が 7 本でない: ${p.steps.length}`);
  const hookDst = p.steps.find(s => s.file === 'evaluate-session.js').dst;
  const resolved = path.resolve(path.dirname(hookDst), '..', '..', 'skills', 'continuous-learning', 'config.json');
  assert.strictEqual(resolved, path.join(fake, '.claude', 'skills', 'continuous-learning', 'config.json'),
    `相対参照が住処の skills を指さない: ${resolved}`);
});

test('【逆】EX-3 — 複製が無ければ照合は赤(「在る」だけでは通さない)', () => {
  const H = require(path.join(DIR, '..', 'graph', 'apply-hooks.js'));
  const fake = path.join(TMP, 'ex3-verify');
  fs.mkdirSync(path.join(fake, '.claude'), { recursive: true });
  const dest = path.join(fake, '.claude', 'scripts');
  const v1 = H.verify({ dest });
  assert.strictEqual(v1.ok, false, '複製が 1 本も無いのに緑になった');
  assert.ok(v1.why.length >= 7, `欠けた複製を名指していない: ${v1.why.length}`);

  H.apply({ dest });
  const v2 = H.verify({ dest });
  assert.strictEqual(v2.ok, true, `複製直後に赤い: ${v2.why.join(' / ')}`);

  // sha で裁くことを証す —— 中身を書き換えれば「在る」のに赤い
  const one = path.join(dest, 'lib', 'utils.js');
  fs.appendFileSync(one, '\n// 手で足した行\n');
  const v3 = H.verify({ dest });
  assert.strictEqual(v3.ok, false, '中身が源と食い違うのに「在る」だけで通した');
  assert.ok(v3.why.some(w => /utils\.js/.test(w)), `食い違った複製を名指していない: ${v3.why.join(' / ')}`);
});

test('【正】EX-3 — 神の住処が無い機(CI)は理由を名乗って skip する (第58条(e))', () => {
  const H = require(path.join(DIR, '..', 'graph', 'apply-hooks.js'));
  const nowhere = path.join(TMP, 'ex3-nohome', 'not-a-home', '.claude', 'scripts');
  const v = H.verify({ dest: nowhere });
  assert.strictEqual(v.ok, true, '住処が無いことを違反として数えた — CI が赤くなる');
  assert.ok(v.skipped, '黙って緑に落ちた — skip は理由を名乗らねばならない');
});

test('【逆】withdraw — 移送先が空なら楽園のフックを引かない (裁可 2-A の順序)', () => {
  /**
   * **空の移送先へ向けて引けば機能が黙って消える。** ゆえに withdraw は
   * repo 側に同名のフックが現に居ることを実測し、居なければ拒む。
   */
  const H = require(path.join(DIR, '..', 'graph', 'apply-hooks.js'));
  const dir = path.join(TMP, 'withdraw');
  fs.mkdirSync(dir, { recursive: true });
  const god = path.join(dir, 'god.json');
  const emptyRepo = path.join(dir, 'repo-empty.json');
  const liveRepo = path.join(dir, 'repo-live.json');
  const PARADISE_CMD = 'node "C:/somewhere/paradise/tools/hooks/paradise-session-start.js"';
  const godBody = () => ({
    theme: 'dark',
    hooks: { SessionStart: [
      { matcher: '*', hooks: [{ type: 'command', command: 'node "other.js"' }] },
      { matcher: '*', hooks: [{ type: 'command', command: PARADISE_CMD }] },
    ] },
  });
  fs.writeFileSync(god, JSON.stringify(godBody(), null, 2));
  fs.writeFileSync(emptyRepo, JSON.stringify({ permissions: {} }, null, 2));
  fs.writeFileSync(liveRepo, JSON.stringify({ hooks: { SessionStart: [
    { matcher: '*', hooks: [{ type: 'command',
      command: 'node "$CLAUDE_PROJECT_DIR/tools/hooks/paradise-session-start.js"' }] }] } }, null, 2));

  const r1 = H.withdraw({ settingsFile: god, repoSettingsFile: emptyRepo });
  assert.strictEqual(r1.ok, false, '移送先が空なのに引いた — 機能が黙って消える');
  assert.ok(r1.refused && /移送先/.test(r1.refused), `拒みの理由を名乗っていない: ${r1.refused}`);
  const still = JSON.parse(fs.readFileSync(god, 'utf8'));
  assert.strictEqual(still.hooks.SessionStart.length, 2, '拒んだのにフックが消えている');

  const r2 = H.withdraw({ settingsFile: god, repoSettingsFile: liveRepo });
  assert.strictEqual(r2.ok, true, `移送先が生きているのに引けなかった: ${r2.refused}`);
  assert.strictEqual(r2.removed, 1);
  assert.ok(r2.backup && fs.existsSync(r2.backup), '退避を取らずに神の settings を書いた');
  const after = JSON.parse(fs.readFileSync(god, 'utf8'));
  assert.strictEqual(after.hooks.SessionStart.length, 1, '楽園のフックだけを引いていない');
  assert.strictEqual(after.theme, 'dark', '神のキーに触れた');
  assert.ok(!JSON.stringify(after).includes('paradise-session-start'), '引いたはずのフックが残っている');
});

// --- report ---
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
console.log(`\nParadise guards self-test: ${pass} passed, ${fail} failed` + (skipped ? `, ${skipped} skipped` : ''));
process.exit(fail === 0 ? 0 : 1);
