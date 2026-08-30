#!/usr/bin/env node
/**
 * PARADISE :: apply-models — write the rank model policy into the agent files
 * ---------------------------------------------------------------------
 * The policy in clergy.js is only real once it is written into the frontmatter
 * of ~/.claude/agents/*.md (Constitution Art. 10: a declaration is not a
 * mechanism). This tool resolves each agent's rank and rewrites its `model:`
 * and `effort:` frontmatter fields — idempotently, touching nothing else.
 *
 *   apply-models.js plan    # show what WOULD change (default, no writes)
 *   apply-models.js apply   # actually write the frontmatter
 *   apply-models.js verify  # confirm every agent file matches the policy
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const clergy = require('./clergy.js');

const AGENT_DIR = process.env.PARADISE_AGENTS || path.join(os.homedir(), '.claude', 'agents');

/** Which rank does this agent hold? */
function rankOf(name) {
  if (name === 'cardinal') return 'cardinal';
  if (name === 'executor') return 'executor';
  if (clergy.TRIBUNAL.officers.includes(name)) return 'executor';
  if (clergy.allBelievers().includes(name)) return 'believer';
  return 'priest'; // every other worker agent is a priest
}

function listAgents() {
  if (!fs.existsSync(AGENT_DIR)) return [];
  return fs.readdirSync(AGENT_DIR).filter(f => f.endsWith('.md'))
    .map(f => ({ name: path.basename(f, '.md'), file: path.join(AGENT_DIR, f) }));
}

/** Set (or insert) a frontmatter key in an agent markdown file. */
function setFrontmatterKey(text, key, value) {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null; // no frontmatter — refuse to guess
  let body = fm[1];
  const re = new RegExp(`^${key}:.*$`, 'm');
  if (re.test(body)) body = body.replace(re, `${key}: ${value}`);
  else body = body + `\n${key}: ${value}`;
  return text.replace(fm[0], `---\n${body}\n---`);
}

function readFrontmatterKey(text, key) {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const m = fm[1].match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

function resolveAll() {
  return listAgents().map(a => {
    const rank = rankOf(a.name);
    const policy = clergy.modelFor(a.name, rank);
    const text = fs.readFileSync(a.file, 'utf8');
    return {
      ...a, rank, ...policy,
      currentModel: readFrontmatterKey(text, 'model'),
      currentEffort: readFrontmatterKey(text, 'effort'),
    };
  });
}

function main() {
  const cmd = process.argv[2] || 'plan';
  const rows = resolveAll();
  if (!rows.length) { console.error(`no agent files in ${AGENT_DIR}`); process.exit(2); }

  if (cmd === 'plan' || cmd === 'verify') {
    let drift = 0;
    console.log(`AGENT MODEL POLICY  (${AGENT_DIR})`);
    console.log('═'.repeat(78));
    for (const r of rows) {
      const ok = r.currentModel === r.model && r.currentEffort === String(r.effort);
      if (!ok) drift++;
      const mark = ok ? '✓' : '→';
      const cur = `${r.currentModel || '-'}/${r.currentEffort || '-'}`;
      console.log(`  ${mark} ${r.name.padEnd(24)} ${r.rank.padEnd(9)} ${cur.padEnd(16)} ${ok ? '' : '⇒ ' + r.model + '/' + r.effort}`);
    }
    console.log('═'.repeat(78));
    console.log(drift ? `${drift} agent(s) drift from policy` : 'all agents match the rank policy');
    if (cmd === 'verify') process.exit(drift ? 1 : 0);
    return;
  }

  if (cmd === 'apply') {
    let changed = 0;
    for (const r of rows) {
      let text = fs.readFileSync(r.file, 'utf8');
      const before = text;
      const t1 = setFrontmatterKey(text, 'model', r.model);
      if (t1 === null) { console.error(`  ! ${r.name}: no frontmatter, skipped`); continue; }
      const t2 = setFrontmatterKey(t1, 'effort', r.effort);
      if (t2 !== before) { fs.writeFileSync(r.file, t2); changed++; console.log(`  ✎ ${r.name.padEnd(24)} ${r.rank.padEnd(9)} → ${r.model}/${r.effort}`); }
    }
    console.log(`\napplied to ${changed} agent file(s) in ${AGENT_DIR}`);
    return;
  }

  console.error('commands: plan | apply | verify');
  process.exit(2);
}
if (require.main === module) main();
module.exports = { rankOf, resolveAll, setFrontmatterKey, readFrontmatterKey, AGENT_DIR };
