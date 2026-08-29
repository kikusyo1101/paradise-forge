#!/usr/bin/env node
/**
 * PARADISE :: Forge — the Creation Pipeline
 * ---------------------------------------------------------------
 * Turns a small human wish into a complete, gated SDLC DAG:
 *
 *   wish -> specify -> design -> detail -> build -> verify -> VERDICT -> creation
 *
 * Synthesized from the convergent wisdom of the OSS world:
 *   - GitHub Spec Kit : spec is the source of truth; gated phases;
 *                       a Constitution of non-negotiable principles
 *   - BMAD-METHOD     : role-specialized agents (analyst/pm/architect/dev/qa/ux)
 *   - Kiro / OpenSpec : requirements.md -> design.md -> tasks -> implement
 *   - Scale-adaptive  : quick (bug fix) | standard (feature) | full (product)
 *
 * Output is a DAG consumable by graph-engine.js (topological waves).
 *
 * Usage:
 *   forge.js plan   "<wish>" [--scale quick|standard|full] [--out file.json]
 *   forge.js scale  "<wish>"          # heuristically pick a scale
 *   forge.js phases [--scale ...]     # list the phase template
 */
'use strict';
const fs = require('fs');
const path = require('path');

// ---- The Constitution: non-negotiable principles every creation obeys ----
const CONSTITUTION = [
  'Spec is the source of truth — code serves the spec, not the reverse.',
  'Every phase is gated — no phase advances on unverified assumptions.',
  'Independent work runs in parallel; dependent work runs in order.',
  'Verification precedes judgment; judgment precedes shipping.',
  'Evidence-based memory — only what actually happened is remembered.',
  'No secrets in code; security is reviewed, never assumed.',
];

/**
 * Phase templates per scale. Each phase:
 *   { id, agent, goal, deps:[ids], gate?:true, artifact?:'name' }
 * `gate:true` marks a checkpoint the verdict engine will judge.
 */
const SCALES = {
  // Quick Flow — bug fixes / tiny clearly-scoped changes (BMAD "quick flow")
  quick: (wish) => [
    { id: 'specify', agent: 'requirements-analyst', goal: `Capture the intent of: ${wish}`, artifact: 'requirements.md' },
    { id: 'build',   agent: 'architect',   goal: `Implement the change for: ${wish}`, deps: ['specify'], artifact: 'implementation' },
    { id: 'verify',  agent: 'verification-loop', goal: 'Run build/type/lint/test/security gates', deps: ['build'], gate: true, artifact: 'verification-report' },
    { id: 'verdict', agent: 'creation-judge', goal: 'Judge: SHIP / REWORK / BLOCK', deps: ['verify'], gate: true, artifact: 'verdict' },
  ],

  // Standard — a normal feature: full four-phase SDD + review + judgment
  standard: (wish) => [
    { id: 'specify',  agent: 'requirements-analyst', goal: `Write requirements (what & why) for: ${wish}`, artifact: 'requirements.md' },
    { id: 'design',   agent: 'architect', goal: 'Basic design: architecture, data model, interfaces', deps: ['specify'], gate: true, artifact: 'design.md' },
    { id: 'detail',   agent: 'architect', goal: 'Detailed design: decompose into ordered testable tasks', deps: ['design'], artifact: 'tasks.md' },
    { id: 'build',    agent: 'architect', goal: 'Implement the tasks', deps: ['detail'], artifact: 'implementation' },
    { id: 'tests',    agent: 'tdd-guide', goal: 'Write & run the test suite against requirements', deps: ['detail'], artifact: 'tests' },
    { id: 'review',   agent: 'code-reviewer', goal: 'Quality review of the implementation', deps: ['build', 'tests'], artifact: 'review' },
    { id: 'security', agent: 'security-reviewer', goal: 'Security scan of the change', deps: ['build'], artifact: 'security-report' },
    { id: 'verify',   agent: 'verification-loop', goal: 'Run all verification gates + coverage', deps: ['review', 'security'], gate: true, artifact: 'verification-report' },
    { id: 'verdict',  agent: 'creation-judge', goal: 'Judge against spec & constitution: SHIP / REWORK / BLOCK', deps: ['verify'], gate: true, artifact: 'verdict' },
  ],

  // Full — a product: adds analysis, UX, and docs (BMAD full track)
  full: (wish) => [
    { id: 'analyze',  agent: 'requirements-analyst', goal: `Analyze the problem space & constraints behind: ${wish}`, artifact: 'analysis.md' },
    { id: 'specify',  agent: 'requirements-analyst', goal: 'Write the PRD: requirements, user stories, acceptance criteria', deps: ['analyze'], gate: true, artifact: 'prd.md' },
    { id: 'ux',       agent: 'frontend', goal: 'UX design: flows, screens, interaction rules', deps: ['specify'], artifact: 'ux.md' },
    { id: 'design',   agent: 'architect', goal: 'Basic design: system architecture & data model', deps: ['specify'], gate: true, artifact: 'design.md' },
    { id: 'detail',   agent: 'architect', goal: 'Detailed design: interfaces + ordered testable tasks', deps: ['design', 'ux'], artifact: 'tasks.md' },
    { id: 'build',    agent: 'architect', goal: 'Implement backend & core logic', deps: ['detail'], artifact: 'implementation' },
    { id: 'build-ui', agent: 'frontend', goal: 'Implement the UI against the UX design', deps: ['detail'], artifact: 'ui' },
    { id: 'tests',    agent: 'tdd-guide', goal: 'Test suite covering acceptance criteria', deps: ['detail'], artifact: 'tests' },
    { id: 'review',   agent: 'code-reviewer', goal: 'Quality review across backend & UI', deps: ['build', 'build-ui', 'tests'], artifact: 'review' },
    { id: 'security', agent: 'security-reviewer', goal: 'Security & privacy review', deps: ['build', 'build-ui'], artifact: 'security-report' },
    { id: 'docs',     agent: 'doc-updater', goal: 'Write user & developer documentation', deps: ['build', 'build-ui'], artifact: 'docs' },
    { id: 'verify',   agent: 'verification-loop', goal: 'Full verification: build/type/lint/test/coverage/security', deps: ['review', 'security'], gate: true, artifact: 'verification-report' },
    { id: 'verdict',  agent: 'creation-judge', goal: 'Final judgment against PRD & constitution: SHIP / REWORK / BLOCK', deps: ['verify', 'docs'], gate: true, artifact: 'verdict' },
  ],
};

/** Heuristically choose a scale from the wish text. */
function chooseScale(wish) {
  const w = wish.toLowerCase();
  const quick = /\b(fix|bug|typo|rename|tweak|adjust|patch|hotfix|small|quick|一行|修正|バグ|直す)\b/;
  const full = /\b(product|platform, |system|app|application|saas|dashboard|end-to-end|mvp|launch|製品|システム|アプリ|プラットフォーム|全体)\b/;
  if (quick.test(w)) return 'quick';
  if (full.test(w)) return 'full';
  return 'standard';
}

function buildDag(wish, scale) {
  const tasks = SCALES[scale](wish);
  return {
    meta: {
      wish,
      scale,
      created: new Date().toISOString(),
      constitution: CONSTITUTION,
      gates: tasks.filter(t => t.gate).map(t => t.id),
    },
    tasks,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const flags = {};
  const positional = [];
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--scale') flags.scale = argv[++i];
    else if (argv[i] === '--out') flags.out = argv[++i];
    else positional.push(argv[i]);
  }
  const wish = positional.join(' ').trim();

  if (cmd === 'scale') {
    if (!wish) { console.error('usage: forge.js scale "<wish>"'); process.exit(2); }
    console.log(chooseScale(wish));
    return;
  }
  if (cmd === 'phases') {
    const scale = flags.scale || 'standard';
    if (!SCALES[scale]) { console.error(`unknown scale: ${scale}`); process.exit(2); }
    const dag = buildDag('<wish>', scale);
    console.log(`FORGE PHASES  [scale: ${scale}]  (${dag.tasks.length} phases, gates: ${dag.meta.gates.join(', ')})`);
    for (const t of dag.tasks) {
      const g = t.gate ? '  ⚖️GATE' : '';
      const d = t.deps ? `  (after: ${t.deps.join(', ')})` : '';
      console.log(`  ${t.id} @${t.agent}${g}: ${t.goal}${d}`);
    }
    return;
  }
  if (cmd === 'plan') {
    if (!wish) { console.error('usage: forge.js plan "<wish>" [--scale ...] [--out file]'); process.exit(2); }
    const scale = flags.scale || chooseScale(wish);
    if (!SCALES[scale]) { console.error(`unknown scale: ${scale}`); process.exit(2); }
    const dag = buildDag(wish, scale);
    const json = JSON.stringify(dag, null, 2);
    if (flags.out) {
      fs.mkdirSync(path.dirname(flags.out), { recursive: true });
      fs.writeFileSync(flags.out, json);
      console.error(`FORGED  scale=${scale}  phases=${dag.tasks.length}  gates=[${dag.meta.gates.join(', ')}]  -> ${flags.out}`);
    } else {
      console.log(json);
    }
    return;
  }
  console.error('commands: plan "<wish>" [--scale quick|standard|full] [--out f] | scale "<wish>" | phases [--scale ...]');
  process.exit(2);
}

if (require.main === module) main();
module.exports = { CONSTITUTION, SCALES, chooseScale, buildDag };
