#!/usr/bin/env node
'use strict';
/**
 * prove 相の変異台本の走者 (reform/gate-fold)
 *
 * **一つの変異を撃って、門が鳴るかを実測し、必ず生バイトで復元する。**
 *
 * ⚠️ **`git checkout -- <file>` を使わない。** 復元は「版管理が持っている姿」ではなく
 * **「撃つ直前の生バイト」**でなければならない —— 未コミットの差分が在る機では
 * git の復元は**別の破壊**である。ゆえに Buffer を握り、`finally` で書き戻し、
 * **sha256 の一致を assert する**。一致しなければ非 0 で倒れる。
 *
 * ⚠️ **注入が当たったことを先に確かめる。** `tests/paradise.test.js` は **CRLF** である。
 * `'\n'` を含む置換は一つも当たらない —— 当たらない注入で「鳴らない」と結論すれば、
 * それは第37条違反(測らなかったものを緑と呼ぶ)である。
 * ゆえに置換後のバイト列が元と違うことを assert してから撃つ。
 *
 *   node reform/gate-fold/prove/mutate.js <変異ID>
 *   node reform/gate-fold/prove/mutate.js --list
 *   node reform/gate-fold/prove/mutate.js --all
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..', '..');
const OUT = path.join(__dirname, 'raw');
fs.mkdirSync(OUT, { recursive: true });

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

/**
 * **退避簿。** 壊す直前に生バイトをディスクへ置く。
 * `finally` は**殺されたら走らない** —— 親の timeout が走者を SIGKILL すると
 * 書き戻しが飛び、現物が壊れたまま残る(本相で実測して踏んだ:
 * `graph/.paradise-source` が「壊れた」の 1 行で残った)。
 *   node mutate.js --rescue   で殺された走行の後始末ができる。
 */
const JOURNAL = path.join(__dirname, 'restore-journal');
function stash(rel, buf) {
  fs.mkdirSync(JOURNAL, { recursive: true });
  const slot = path.join(JOURNAL, rel.replace(/[\\/]/g, '__'));
  fs.writeFileSync(slot, buf);
  fs.writeFileSync(slot + '.meta', JSON.stringify({ file: rel, sha: sha(buf) }));
  return slot;
}
function unstash(slot) {
  try { fs.rmSync(slot, { force: true }); fs.rmSync(slot + '.meta', { force: true }); } catch {}
}
function rescue() {
  let names = [];
  try { names = fs.readdirSync(JOURNAL).filter((n) => n.endsWith('.meta')); } catch {}
  if (!names.length) { console.log('退避簿は空 — 救うものが無い'); return; }
  for (const n of names) {
    const meta = JSON.parse(fs.readFileSync(path.join(JOURNAL, n), 'utf8'));
    const slot = path.join(JOURNAL, n.replace(/\.meta$/, ''));
    const abs = path.join(ROOT, meta.file);
    const cur = (() => { try { return sha(fs.readFileSync(abs)); } catch { return null; } })();
    if (cur === meta.sha) { console.log(`無傷 ${meta.file}`); unstash(slot); continue; }
    fs.writeFileSync(abs, fs.readFileSync(slot));
    const ok = sha(fs.readFileSync(abs)) === meta.sha;
    console.log(`${ok ? '復元した' : '**復元失敗**'} ${meta.file}`);
    if (ok) unstash(slot);
  }
}

/** 門の一束。**各変異はこの全部で撃たれる** —— どの門が鳴るかを名指すため。 */
const SUITES = {
  fold: { argv: ['tests/fold.test.js'], ms: 180000, env: {} },
  resident: { argv: ['tests/paradise.test.js', '--gate', '^fold:'], ms: 180000, env: {} },
  wiring: { argv: ['graph/wiring.js', 'check'], ms: 120000, env: {} },
};

function runSuite(name) {
  const s = SUITES[name];
  const r = spawnSync(process.execPath, s.argv, {
    cwd: ROOT, encoding: 'utf8', timeout: s.ms, env: { ...process.env, ...s.env },
  });
  const out = String(r.stdout || '') + String(r.stderr || '');
  // 鳴った門の名を拾う(✗ で始まる行)
  const red = [...out.matchAll(/^\s*\u2717 (.+)$/gm)].map((m) => m[1].trim());
  return { status: r.status, killed: !!r.killed, red, out };
}

/**
 * 一つの変異を撃つ。
 * @param {{id:string, file:string, why:string, expect:string, edit:(b:Buffer)=>Buffer, suites?:string[]}} m
 */
function fire(m, opts = {}) {
  const abs = path.join(ROOT, m.file);
  const before = fs.readFileSync(abs);          // **生バイト**
  const beforeSha = sha(before);
  const suites = m.suites || ['fold', 'resident'];
  let result = null;
  const slot = stash(m.file, before);           // **壊す前にディスクへ退避する**
  try {
    const after = m.edit(before);
    if (!Buffer.isBuffer(after)) throw new Error(`${m.id}: edit が Buffer を返さない`);
    if (after.equals(before)) {
      throw new Error(`${m.id}: **注入が当たらなかった** — ${m.file} の変異点の形が変わったか、` +
        'CRLF のファイルに LF の綴りを当てている。当たらない注入で「鳴らない」と結論してはならない (第37条)');
    }
    fs.writeFileSync(abs, after);
    const runs = {};
    for (const s of suites) runs[s] = runSuite(s);
    const anyRed = suites.some((s) => runs[s].status !== 0);
    result = {
      id: m.id, file: m.file, why: m.why, expect: m.expect,
      layer: m.layer || '?', invented: !!m.invented,
      rang: anyRed,
      byGate: Object.fromEntries(suites.map((s) => [s, { status: runs[s].status, red: runs[s].red }])),
      rawOut: Object.fromEntries(suites.map((s) => [s, runs[s].out])),
    };
  } finally {
    fs.writeFileSync(abs, before);              // **生バイトで書き戻す**
    const afterSha = sha(fs.readFileSync(abs));
    if (afterSha !== beforeSha) {
      console.error(`FATAL ${m.id}: 復元に失敗した ${beforeSha} -> ${afterSha}`);
      process.exit(9);
    }
    unstash(slot);
  }
  if (!opts.quiet) {
    console.log(`--- ${result.id} [${result.rang ? '鳴った' : '**無音**'}] ${result.file}`);
    console.log(`    壊したもの: ${result.why}`);
    console.log(`    期待       : ${result.expect}`);
    for (const [s, v] of Object.entries(result.byGate)) {
      console.log(`    ${s}: exit=${v.status}${v.red.length ? ' 鳴った門: ' + v.red.join(' | ') : ''}`);
    }
  }
  // 生出力を残す(第37条: 測った証拠を捨てない)
  for (const [s, o] of Object.entries(result.rawOut)) {
    fs.writeFileSync(path.join(OUT, `${result.id}.${s}.txt`), o);
  }
  delete result.rawOut;
  return result;
}

module.exports = { ROOT, fire, runSuite, sha, OUT };

if (require.main === module) {
  const MUTS = require('./mutations.js');
  const args = process.argv.slice(2);
  if (args[0] === '--rescue') { rescue(); process.exit(0); }
  if (args[0] === '--list') {
    for (const m of MUTS) console.log(`${m.id}\t[L${m.layer}]\t${m.invented ? '発明' : '予想'}\t${m.file}\t${m.why}`);
    process.exit(0);
  }
  const pick = args[0] === '--all' ? MUTS
    : args.length ? MUTS.filter((m) => args.includes(m.id))
      : MUTS;
  if (!pick.length) { console.error('該当する変異が無い'); process.exit(2); }
  const results = [];
  for (const m of pick) {
    try { results.push(fire(m)); }
    catch (e) {
      // **当たらなかった注入は「無音」ではない。** 別の値として残す(第37条)。
      console.log(`--- ${m.id} [注入が当たらなかった] ${m.file}\n    ${e.message.slice(0, 160)}`);
      results.push({ id: m.id, file: m.file, why: m.why, expect: m.expect,
        layer: m.layer, invented: !!m.invented, rang: null, notLanded: true });
    }
  }
  const led = path.join(__dirname, 'results.jsonl');
  for (const r of results) fs.appendFileSync(led, JSON.stringify(r) + '\n');
  const silent = results.filter((r) => r.rang === false);
  const notLanded = results.filter((r) => r.notLanded);
  console.log(`\n撃った変異 ${results.length} 件 / 無音 ${silent.length} 件` +
    (silent.length ? ': ' + silent.map((r) => r.id).join(', ') : '') +
    (notLanded.length ? `\n**当たらなかった注入 ${notLanded.length} 件**(無音と数えない): `
      + notLanded.map((r) => r.id).join(', ') : ''));
  process.exit(0);
}
