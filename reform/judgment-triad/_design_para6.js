#!/usr/bin/env node
/**
 * design 相: PARA-6 の関門 R1 を **確定した形で** 写しに当て、四つの枝を実測する。
 *   (a) --reject は従来どおり通る(相が全て pending でも)
 *   (b) rework の相が在れば拒む
 *   (c) blocked の相が在れば拒む(文言に「人を呼べ」)
 *   (c2) 領域そのものが blocked なら拒む
 * さらに CLI の exit 2 と標準エラーの本文を実測する。
 * ⚠️ 本物の graph/conclave.js は一行も変えない。$LOCALAPPDATA/Temp に写して、そこだけを曲げる。
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'graph', 'conclave.js');
const orig = fs.readFileSync(SRC, 'utf8');
const EOL = orig.includes('\r\n') ? '\r\n' : '\n';
const WORK = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'jt_para6');
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });

// ── R1 本体(design.md §3.1 と一字一句同じ形) ──────────────────────
const ANCHOR = "  if (!opts.reject) {" + EOL;
const R1 = ANCHOR +
"    if (d.status === 'blocked') {" + EOL +
"      const err = new Error(`cannot ratify ${cardinal}: domain is blocked — 領域が閉塞している。` +" + EOL +
"        `${MAX_DOMAIN_REWORK} 回の差し戻しを使い切った領域は自力で祝福できない。**人を呼べ**(教主の裁可が要る)。`);" + EOL +
"      err.code = 'RATIFY_DOMAIN_BLOCKED';" + EOL +
"      err.cardinal = cardinal;" + EOL +
"      throw err;" + EOL +
"    }" + EOL +
"    const notDone = d.phases.filter(p => p.status !== 'done');" + EOL +
"    if (notDone.length) {" + EOL +
"      const blocked = notDone.filter(p => p.status === 'blocked');" + EOL +
"      const err = new Error(`cannot ratify ${cardinal}: ${notDone.length} phase(s) not done: ` +" + EOL +
"        notDone.map(p => `${p.id}=${p.status}`).join(', ') +" + EOL +
"        (blocked.length ? ` — blocked の相が在る(${blocked.map(p => p.id).join(', ')})。待っても直らない。**人を呼べ**。`" + EOL +
"                        : ` — 済ませてから祝福せよ: node graph/conclave.js done <id> --run <f> --artifact <p>`));" + EOL +
"      err.code = 'RATIFY_PHASES_NOT_DONE';" + EOL +
"      err.cardinal = cardinal;" + EOL +
"      err.phases = notDone.map(p => ({ id: p.id, status: p.status }));" + EOL +
"      throw err;" + EOL +
"    }" + EOL;

// ── CLI の exit 2 ────────────────────────────────────────────────────
const CLI_OLD = "    need(); const run = load(rp); const res = ratify(run, pos[0], { reject: f.reject, from: f.from }); save(rp, run);";
const CLI_NEW =
"    need(); const run = load(rp);" + EOL +
"    let res;" + EOL +
"    try {" + EOL +
"      res = ratify(run, pos[0], { reject: f.reject, from: f.from });" + EOL +
"    } catch (e) {" + EOL +
"      if (e.code === 'RATIFY_PHASES_NOT_DONE' || e.code === 'RATIFY_DOMAIN_BLOCKED') {" + EOL +
"        console.error('✗ ' + e.message);" + EOL +
"        if (e.code === 'RATIFY_DOMAIN_BLOCKED') {" + EOL +
"          console.error('  → 教主を呼べ。閉塞した領域は engine が自分で開けてはならない(第51条c)。');" + EOL +
"        } else {" + EOL +
"          for (const p of e.phases) console.error(`  · ${p.id} = ${p.status}`);" + EOL +
"          console.error('  → 未了の相を済ませてから、もう一度 ratify せよ。');" + EOL +
"        }" + EOL +
"        process.exit(2);" + EOL +
"      }" + EOL +
"      throw e;" + EOL +
"    }" + EOL +
"    save(rp, run);";

if (!orig.includes(ANCHOR)) throw new Error('R1: ratify の錨が見つからない');
if (!orig.includes(CLI_OLD)) throw new Error('R1: CLI の錨が見つからない');
// ratify() 内の `if (!opts.reject) {` は一つだけであることを確かめる
const n = orig.split(ANCHOR).length - 1;
console.log(`錨 "if (!opts.reject) {" の出現回数: ${n}  (1 でなければ挿入位置が曖昧)`);

const bent = orig.replace(ANCHOR, R1).replace(CLI_OLD, CLI_NEW);
// 写しは graph/ 全体(conclave.js は同階層を require する)
fs.cpSync(path.join(ROOT, 'graph'), path.join(WORK, 'graph'), { recursive: true });
fs.writeFileSync(path.join(WORK, 'graph', 'conclave.js'), bent);
const forge = require(path.join(WORK, 'graph', 'forge.js'));
const conclave = require(path.join(WORK, 'graph', 'conclave.js'));

const mk = () => {
  const dag = forge.buildDag('ratify guard probe', 'standard');
  const p = path.join(WORK, 'dag-' + Math.random().toString(36).slice(2) + '.json');
  fs.writeFileSync(p, JSON.stringify(dag));
  return conclave.convene(p);
};
const dom = (run, c) => run.domains.find(x => x.cardinal === c);
const phases = d => d.phases.map(p => `${p.id}=${p.status}`).join(', ');

const line = s => console.log(s);
line('\n════════════════════════════════════════════════════════════════════');
line('PARA-6 / R1 の四つの枝 — AC-3 の表どおりか');
line('════════════════════════════════════════════════════════════════════');

// ── (a) --reject は従来どおり通る(相が全て pending でも) ──
{
  const run = mk();
  const d = dom(run, 'requirements');
  line(`\n(a) --reject / 相は全て pending  [${phases(d)}]`);
  try {
    const res = conclave.ratify(run, 'requirements', { reject: true, from: 'specify' });
    line(`  -> 通った  ${JSON.stringify({ ok: res.ok, reworked: res.reworked, target: res.target })}`);
    line(`  相の状態: ${phases(dom(run, 'requirements'))}`);
    line(`  領域の status: ${dom(run, 'requirements').status}`);
  } catch (e) { line(`  -> ✗ 拒まれた(AC-3(a) 違反)  code=${e.code}  ${e.message}`); }
}

// ── (b) rework の相が在れば拒む ──
{
  const run = mk();
  const d = dom(run, 'requirements');
  for (const p of d.phases) p.status = 'done';
  d.phases.find(p => p.id === 'specify').status = 'rework';
  line(`\n(b) rework の相が在る  [${phases(d)}]  領域 status=${d.status}`);
  try {
    const res = conclave.ratify(run, 'requirements');
    line(`  -> ✗ 通ってしまった(AC-3(b) 違反)  ${JSON.stringify(res)}`);
  } catch (e) {
    line(`  -> 拒まれた  code=${e.code}`);
    line(`  文言: ${e.message}`);
    line(`  領域の status(部分適用していないか): ${dom(run, 'requirements').status}`);
  }
}

// ── (c) blocked の相が在れば拒む ──
{
  const run = mk();
  const d = dom(run, 'requirements');
  for (const p of d.phases) p.status = 'done';
  d.phases.find(p => p.id === 'specify').status = 'blocked';
  line(`\n(c) blocked の相が在る  [${phases(d)}]  領域 status=${d.status}`);
  try {
    const res = conclave.ratify(run, 'requirements');
    line(`  -> ✗ 通ってしまった(AC-3(c) 違反)  ${JSON.stringify(res)}`);
  } catch (e) {
    line(`  -> 拒まれた  code=${e.code}`);
    line(`  文言: ${e.message}`);
    line(`  「人を呼べ」を含むか: ${/人を呼べ/.test(e.message)}`);
    line(`  領域の status: ${dom(run, 'requirements').status}`);
  }
}

// ── (c2) 領域そのものが blocked(相は全て done)──
{
  const run = mk();
  const d = dom(run, 'requirements');
  for (const p of d.phases) p.status = 'done';
  d.status = 'blocked';
  line(`\n(c2) 領域そのものが blocked / 相は全て done  [${phases(d)}]  領域 status=${d.status}`);
  try {
    const res = conclave.ratify(run, 'requirements');
    line(`  -> ✗ 通ってしまった(AC-3(c2) 違反)  ${JSON.stringify(res)}  status -> ${dom(run, 'requirements').status}`);
  } catch (e) {
    line(`  -> 拒まれた  code=${e.code}`);
    line(`  文言: ${e.message}`);
    line(`  「人を呼べ」を含むか: ${/人を呼べ/.test(e.message)}`);
    line(`  領域の status(化けていないか): ${dom(run, 'requirements').status}`);
  }
}

// ── 対 (AC-2: 壊して鳴らす) 全て done なら通る ──
{
  const run = mk();
  const d = dom(run, 'requirements');
  for (const p of d.phases) p.status = 'done';
  line(`\n(対) 相が全て done  [${phases(d)}]`);
  try {
    const res = conclave.ratify(run, 'requirements');
    line(`  -> 通った  ${JSON.stringify(res)}   領域 status -> ${dom(run, 'requirements').status}`);
  } catch (e) { line(`  -> ✗ 拒まれた(AC-2 違反 — 常に拒む実装になっている)  ${e.message}`); }
}

// ── CLI の exit 2 ──────────────────────────────────────────────────
line('\n════════════════════════════════════════════════════════════════════');
line('CLI の口 — exit 2 と標準エラーの本文');
line('════════════════════════════════════════════════════════════════════');
const CONC = path.join(WORK, 'graph', 'conclave.js');
const dagPath = path.join(WORK, 'cli.dag.json');
fs.writeFileSync(dagPath, JSON.stringify(forge.buildDag('cli probe', 'standard')));
const runPath = path.join(WORK, 'cli.run.json');
execFileSync(process.execPath, [CONC, 'convene', dagPath, '--run', runPath], { encoding: 'utf8' });

const cli = (args) => {
  try { return { exit: 0, out: execFileSync(process.execPath, [CONC, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), err: '' }; }
  catch (e) { return { exit: e.status, out: e.stdout || '', err: e.stderr || '' }; }
};
{
  line('\n$ node graph/conclave.js ratify requirements --run <f>   (相は全て pending)');
  const r = cli(['ratify', 'requirements', '--run', runPath]);
  line(`EXIT=${r.exit}`);
  line('--- stderr ---');
  line(r.err.trimEnd());
  const after = JSON.parse(fs.readFileSync(runPath, 'utf8'));
  const dd = after.domains.find(x => x.cardinal === 'requirements');
  line(`--- 台帳が汚れていないか: 領域 status=${dd.status}  相=[${dd.phases.map(p => p.id + '=' + p.status).join(', ')}]`);
}
{
  // 領域そのものを blocked にして撃つ
  const r0 = JSON.parse(fs.readFileSync(runPath, 'utf8'));
  const dd = r0.domains.find(x => x.cardinal === 'requirements');
  for (const p of dd.phases) p.status = 'done';
  dd.status = 'blocked';
  fs.writeFileSync(runPath, JSON.stringify(r0));
  line('\n$ node graph/conclave.js ratify requirements --run <f>   (領域 status=blocked / 相は全て done)');
  const r = cli(['ratify', 'requirements', '--run', runPath]);
  line(`EXIT=${r.exit}`);
  line('--- stderr ---');
  line(r.err.trimEnd());
  const after = JSON.parse(fs.readFileSync(runPath, 'utf8'));
  const d2 = after.domains.find(x => x.cardinal === 'requirements');
  line(`--- 台帳が汚れていないか: 領域 status=${d2.status}  (blocked のままなら部分適用なし)`);
}
{
  // 全て done・領域 active に戻して通ることを確かめる(AC-2 の対)
  const r0 = JSON.parse(fs.readFileSync(runPath, 'utf8'));
  const dd = r0.domains.find(x => x.cardinal === 'requirements');
  dd.status = 'active';
  fs.writeFileSync(runPath, JSON.stringify(r0));
  line('\n$ node graph/conclave.js ratify requirements --run <f>   (相は全て done / 領域 active)');
  const r = cli(['ratify', 'requirements', '--run', runPath]);
  line(`EXIT=${r.exit}`);
  const after = JSON.parse(fs.readFileSync(runPath, 'utf8'));
  const d2 = after.domains.find(x => x.cardinal === 'requirements');
  line(`--- 領域 status=${d2.status}  (ratified なら通った)`);
}
line(`\n曲げた conclave: ${CONC}`);
