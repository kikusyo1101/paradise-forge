#!/usr/bin/env node
'use strict';
/**
 * census.js — 楽園が己について語る「数」を、実測と突き合わせる (憲法 第22条)
 *
 * 文書には数が埋まる: 「自己診断 127件」「憲法 19条」「agents 9 / skills 14」。
 * 数は散文の中で **黙って腐る**。テストを1件足しても、条を1つ足しても、
 * 何も落ちない。誰も気づかない。気づくのは神だけである — それでは遅い。
 *
 * この engine は楽園の真の数を **実測** し、文書中の主張と突き合わせる。
 * 主張が実測とずれていれば落ちる。落ちる場所は、腐った行そのものである。
 *
 *   node graph/census.js            # 実測を表示
 *   node graph/census.js check      # 文書の主張と突き合わせ（ずれれば exit 1）
 *   node graph/census.js fix        # 文書中の数を実測へ書き換える
 *
 * 「数えられるものだけを主張せよ。主張したなら、数え直せ。」
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

const countFiles = (dir, ext) => {
  try {
    return fs.readdirSync(path.join(ROOT, dir)).filter(f => !ext || f.endsWith(ext)).length;
  } catch { return 0; }
};

const readRoot = f => {
  try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { return ''; }
};

/** 楽園の真の数を測る。推測は一つも無い — 全て実ファイル/実行結果から。 */
function census(opts = {}) {
  const constitution = readRoot('CONSTITUTION.md');
  const articles = (constitution.match(/^[0-9]+\. \*\*/gm) || []).length;

  let tests = null;
  if (opts.runTests !== false) {
    try {
      const out = execFileSync(process.execPath, [path.join(ROOT, 'tests', 'paradise.test.js')],
        { encoding: 'utf8', cwd: ROOT, timeout: 120000 });
      const m = out.match(/([0-9]+) passed, ([0-9]+) failed/);
      if (m) tests = { passed: +m[1], failed: +m[2] };
    } catch (e) {
      const out = String((e && (e.stdout || e.message)) || '');
      const m = out.match(/([0-9]+) passed, ([0-9]+) failed/);
      if (m) tests = { passed: +m[1], failed: +m[2] };
    }
  }

  const vendor = {};
  for (const k of ['agents', 'commands', 'skills', 'rules', 'hooks', 'scripts', 'contexts']) {
    vendor[k] = countFiles(path.join('overlay', 'vendor', k));
  }
  let vendorFiles = 0;
  const walk = d => {
    let ents = [];
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.isDirectory()) walk(path.join(d, e.name));
      else vendorFiles++;
    }
  };
  walk(path.join(ROOT, 'overlay', 'vendor'));

  return {
    articles,
    tests,
    engines: countFiles('graph', '.js'),
    creations: (() => {
      try {
        return fs.readdirSync(path.join(ROOT, 'creations'), { withFileTypes: true })
          .filter(e => e.isDirectory()).length;
      } catch { return 0; }
    })(),
    overlayAgents: countFiles(path.join('overlay', 'agents'), '.md'),
    overlayCommands: countFiles(path.join('overlay', 'commands'), '.md'),
    vendor,
    vendorFiles,
  };
}

/**
 * 文書中の「数の主張」。それぞれ実測値を返す resolver を持つ。
 * 主張を増やすときは、必ず実測できる形にすること — 数えられない主張は書かない。
 */
function claims(c) {
  const list = [
    { file: 'CLAUDE.md', re: /自己診断 \((\d+)件\)/,            actual: c.tests && c.tests.passed, label: 'CLAUDE.md 自己診断件数' },
    { file: 'CLAUDE.md', re: /自己診断: \*\*(\d+) tests\*\*/,    actual: c.tests && c.tests.passed, label: 'CLAUDE.md 現状-テスト数' },
    { file: 'CLAUDE.md', re: /憲法: \*\*(\d+)条\*\*/,            actual: c.articles,                label: 'CLAUDE.md 憲法条数' },
    { file: 'README.md', re: /paradise\.test\.js\s+#\s*(\d+)\/\d+ pass/, actual: c.tests && c.tests.passed, label: 'README テスト数' },
    { file: 'README.md', re: /取り込んだもの（(\d+)ファイル/,     actual: c.vendorFiles,             label: 'README vendor 総ファイル数' },
    { file: 'README.md', re: /`agents (\d+)`/,                   actual: c.vendor.agents,           label: 'README vendor agents' },
    { file: 'README.md', re: /`commands (\d+)`/,                 actual: c.vendor.commands,         label: 'README vendor commands' },
    { file: 'README.md', re: /`skills (\d+)`/,                   actual: c.vendor.skills,           label: 'README vendor skills' },
    { file: 'README.md', re: /`rules (\d+)`/,                    actual: c.vendor.rules,            label: 'README vendor rules' },
    { file: 'README.md', re: /`hooks (\d+)`/,                    actual: c.vendor.hooks,            label: 'README vendor hooks' },
    { file: 'README.md', re: /`scripts (\d+)`/,                  actual: c.vendor.scripts,          label: 'README vendor scripts' },
    { file: 'README.md', re: /`contexts (\d+)`/,                 actual: c.vendor.contexts,         label: 'README vendor contexts' },
  ];
  return list;
}

function check(opts = {}) {
  const c = census(opts);
  const findings = [];
  for (const cl of claims(c)) {
    if (cl.actual == null) continue;               // 測れなかった主張は裁かない
    const text = readRoot(cl.file);
    const m = text.match(cl.re);
    if (!m) { findings.push({ ...cl, kind: 'missing', claimed: null }); continue; }
    const claimed = Number(m[1]);
    if (claimed !== cl.actual) findings.push({ ...cl, kind: 'stale', claimed });
  }
  return { ok: findings.length === 0, census: c, findings };
}

function fix(opts = {}) {
  const res = check(opts);
  const edited = new Set();
  for (const f of res.findings) {
    if (f.kind !== 'stale') continue;
    const p = path.join(ROOT, f.file);
    const text = fs.readFileSync(p, 'utf8');
    const m = text.match(f.re);
    if (!m) continue;
    // 捕捉群だけを置換する — 周りの散文には触れない
    const replaced = m[0].replace(String(m[1]), String(f.actual));
    fs.writeFileSync(p, text.replace(m[0], replaced));
    edited.add(f.file);
  }
  return { edited: [...edited], fixed: res.findings.filter(f => f.kind === 'stale') };
}

if (require.main === module) {
  const cmd = process.argv[2] || 'show';
  if (cmd === 'show') {
    const c = census();
    console.log('═══════ 🔢 PARADISE CENSUS ═══════');
    console.log('  constitution articles :', c.articles);
    console.log('  self-test             :', c.tests ? `${c.tests.passed} passed, ${c.tests.failed} failed` : '(not run)');
    console.log('  engines (graph/*.js)  :', c.engines);
    console.log('  creations             :', c.creations);
    console.log('  overlay agents/cmds   :', c.overlayAgents, '/', c.overlayCommands);
    console.log('  vendored files        :', c.vendorFiles, JSON.stringify(c.vendor));
    console.log('══════════════════════════════════');
    process.exit(0);
  }
  if (cmd === 'check') {
    const res = check();
    console.log('═══════ 🔢 CENSUS CHECK ═══════');
    if (res.ok) console.log('  ✓ every number the paradise claims about itself is true');
    for (const f of res.findings) {
      if (f.kind === 'missing') console.log(`  ⚠️  ${f.label}: claim not found in ${f.file} (実測 ${f.actual})`);
      else console.log(`  🔴 ${f.label}: doc says ${f.claimed}, reality is ${f.actual}  (${f.file})`);
    }
    console.log('═══════════════════════════════');
    process.exit(res.ok ? 0 : 1);
  }
  if (cmd === 'fix') {
    const r = fix();
    for (const f of r.fixed) console.log(`  ✏️  ${f.label}: ${f.claimed} → ${f.actual}`);
    console.log(r.edited.length ? `updated: ${r.edited.join(', ')}` : 'nothing to fix');
    process.exit(0);
  }
  console.error('usage: census.js [show|check|fix]');
  process.exit(2);
}

module.exports = { census, check, fix, claims };
