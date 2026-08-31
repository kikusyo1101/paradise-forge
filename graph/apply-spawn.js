#!/usr/bin/env node
'use strict';
/**
 * apply-spawn.js — 起動の権能を、位階の規則として機械適用する (憲法 第25条)
 *
 * 外部調査 (Claude Agent SDK docs) が「宣言はあるが起動しない」の第一原因を
 * 名指ししている:
 *
 *   「allowedTools に Agent(旧 Task) が無いと、サブエージェント起動は
 *     permission callback に落ちるか dontAsk モードで拒否される」
 *
 * 楽園はまさにこれだった。実測すると `Task` を持つのは cardinal 只一人で、
 * 信徒を擁する神官は誰一人持っていなかった。ゆえに信徒13名は名前だけの存在で
 * あり続け、教主が階層を素通りして神官を直接呼ぶしかなかった。
 *
 * **なぜ engine にするのか。** 神官8名のうち6名は上流由来であり、
 * 手で書き換えれば第19条(借り物は改変せず、変換で纏う)を破る。よってこれは
 * apply-models.js と同じ **transform** である — 上流が本文を更新しても
 * 権能だけは楽園の規則が勝ち、再適用で常に取り戻せる。
 *
 *   node graph/apply-spawn.js plan     # 何を変えるか（既定・書き込まない）
 *   node graph/apply-spawn.js apply    # 実際に frontmatter へ書き込む
 *   node graph/apply-spawn.js verify   # 規則と実体が一致しているか（乖離で exit 1）
 *
 * 最小権限を守る: **信徒を擁する神官にだけ**与える。全員には与えない。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const clergy = require('./clergy.js');

const AGENTS_DIR = () => process.env.CLAUDE_HOME
  ? path.join(process.env.CLAUDE_HOME, 'agents')
  : path.join(os.homedir(), '.claude', 'agents');

/**
 * 起動の権能を持つべき者 = 下位を擁する者。
 *   枢機卿 … 神官を呼ぶ（既に Task を持つ）
 *   神官   … 信徒を擁するものだけ
 * 信徒は最下層なので誰も呼ばない（深さ3の底）。
 */
function needsSpawn() {
  const out = new Map();   // name -> 理由
  for (const [cid, c] of Object.entries(clergy.COLLEGE || {})) {
    if (c.agent) out.set(c.agent, `枢機卿 ${cid} を演じ、神官を発令する`);
    if ((c.believers || []).length) {
      for (const p of c.priests || []) {
        out.set(p, `${cid} の神官として信徒 ${(c.believers || []).join('/')} を発令する`);
      }
    }
  }
  return out;
}

function readTools(text) {
  const m = text.match(/^tools:\s*(.+)$/m);
  return m ? { raw: m[0], list: m[1].split(',').map(s => s.trim()).filter(Boolean) } : null;
}

/** frontmatter の tools 行にだけ触れる。本文は一切変えない。 */
function addSpawnTool(text, tool) {
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;                       // frontmatter が無ければ推測しない
  const t = readTools(text);
  if (!t) {
    // tools 行そのものが無い = 親から全ツールを継承する指定。触らない方が安全。
    return { text, changed: false, note: 'no tools: line — inherits all tools, left alone' };
  }
  if (t.list.includes(tool)) return { text, changed: false, note: 'already granted' };
  const next = `tools: ${[...t.list, tool].join(', ')}`;
  return { text: text.replace(t.raw, next), changed: true, note: `granted ${tool}` };
}

function resolveAll(dir) {
  const d = dir || AGENTS_DIR();
  const need = needsSpawn();
  const rows = [];
  for (const [name, why] of need) {
    const p = path.join(d, `${name}.md`);
    if (!fs.existsSync(p)) { rows.push({ name, why, status: 'absent', path: p }); continue; }
    const text = fs.readFileSync(p, 'utf8');
    const t = readTools(text);
    const has = t ? t.list.includes(clergy.SPAWN_TOOL) : null;
    rows.push({
      name, why, path: p,
      status: t === null ? 'inherits-all' : (has ? 'granted' : 'missing'),
      tools: t ? t.list : null,
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function verify(dir) {
  const rows = resolveAll(dir);
  const present = rows.filter(r => r.status !== 'absent');
  if (!present.length) {
    // ハーネス未配置(CI等)では検めるものが無い。存在しないものを責めない。
    return { ok: true, skipped: true, rows, note: 'no harness at this path — nothing to verify' };
  }
  const missing = rows.filter(r => r.status === 'missing');
  return {
    ok: missing.length === 0, skipped: false, rows, missing,
    note: missing.length
      ? `${missing.length} agent(s) must dispatch subordinates but lack ${clergy.SPAWN_TOOL}`
      : 'every agent that governs subordinates can actually dispatch them',
  };
}

function apply(dir, opts = {}) {
  const rows = resolveAll(dir);
  const changed = [];
  for (const r of rows) {
    if (r.status !== 'missing') continue;
    const text = fs.readFileSync(r.path, 'utf8');
    const res = addSpawnTool(text, clergy.SPAWN_TOOL);
    if (!res) { changed.push({ ...r, note: 'no frontmatter, skipped' }); continue; }
    if (res.changed && !opts.dryRun) fs.writeFileSync(r.path, res.text);
    changed.push({ ...r, note: res.note, applied: res.changed && !opts.dryRun });
  }
  return { changed, dryRun: !!opts.dryRun };
}

if (require.main === module) {
  const cmd = process.argv[2] || 'plan';
  const dir = process.argv[3];
  if (cmd === 'plan' || cmd === 'apply') {
    const res = apply(dir, { dryRun: cmd === 'plan' });
    console.log('═══════ 🗝  SPAWN AUTHORITY ═══════');
    console.log(`tool: ${clergy.SPAWN_TOOL}   depth: ${clergy.MAX_SPAWN_DEPTH}   concurrent: ${clergy.MAX_CONCURRENT}`);
    if (!res.changed.length) console.log('  ✓ nothing to change — authority already matches the rule');
    for (const c of res.changed) {
      console.log(`  ${res.dryRun ? '·' : '✏️ '} ${c.name.padEnd(22)} ${c.note}`);
      console.log(`       ${c.why}`);
    }
    if (res.dryRun && res.changed.length) console.log('\n  (plan only — run `apply` to write)');
    console.log('═══════════════════════════════════');
    process.exit(0);
  }
  if (cmd === 'verify') {
    const res = verify(dir);
    console.log('═══════ 🗝  SPAWN AUTHORITY ═══════');
    if (res.skipped) { console.log('  (harness not installed here — check skipped)'); console.log(res.note); process.exit(0); }
    for (const r of res.rows) {
      const icon = r.status === 'granted' ? '✓' : r.status === 'missing' ? '🔴' : '·';
      console.log(`  ${icon} ${r.name.padEnd(22)} ${r.status.padEnd(13)} ${r.why}`);
    }
    console.log('───────────────────────────────────');
    console.log(res.note);
    console.log('═══════════════════════════════════');
    process.exit(res.ok ? 0 : 1);
  }
  console.error('usage: apply-spawn.js [plan|apply|verify] [agentsDir]');
  process.exit(2);
}

module.exports = { needsSpawn, resolveAll, verify, apply, addSpawnTool };
