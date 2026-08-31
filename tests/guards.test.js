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
  if (!fs.existsSync(G.SETTINGS)) skip('no ~/.claude/settings.json on this machine');
  const rows = G.diagnose(G.SETTINGS);
  const broken = rows.filter(r => r.status === 'dead' || r.status === 'overfire');
  assert.strictEqual(broken.length, 0,
    `発火しない/暴発する matcher が残っている: ${broken.map(d => d.status + ' ' + d.event + '[' + d.index + ']').join(', ')}`
    + '  → node graph/apply-guards.js apply');
});

test('every matcher on the real machine is classifiable and hits at least one tool', () => {
  if (!fs.existsSync(G.SETTINGS)) skip('no ~/.claude/settings.json on this machine');
  const rows = G.diagnose(G.SETTINGS);
  assert.ok(rows.length > 0, 'matcher が一つも読めていないなら診断が壊れている');
  for (const r of rows) {
    assert.ok(['exact', 'regex', 'wildcard'].includes(r.kind), `未分類の matcher: ${r.matcher}`);
    assert.ok(r.matches.length > 0, `一つのツールにも当たらない matcher: ${r.event} ${r.matcher}`);
  }
});

test('the law IS the machinery on the real machine — permissions present, no drift', () => {
  if (!fs.existsSync(G.SETTINGS)) skip('no ~/.claude/settings.json on this machine');
  const d = G.diff(G.SETTINGS);
  assert.strictEqual(d.skipped, false);
  // ⚠️ `d.drift` は存在しないキーだった — 乖離があっても理由が空欄で出ていた。
  // 何が乖離したのか言えない赤は、直しようがない赤である。
  assert.strictEqual(d.ok, true,
    `掟と機構が乖離している:\n        `
    + (d.changes || []).map(c => `${c.kind}: ${c.note}`).join('\n        ')
    + '\n      → node graph/apply-guards.js apply');
});

// --- report ---
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
console.log(`\nParadise guards self-test: ${pass} passed, ${fail} failed` + (skipped ? `, ${skipped} skipped` : ''));
process.exit(fail === 0 ? 0 : 1);
