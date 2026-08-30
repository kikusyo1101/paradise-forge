#!/usr/bin/env node
/**
 * PARADISE :: Clergy — the Ecclesiastical Hierarchy (聖職位階)
 * ---------------------------------------------------------------------
 * The organization model of the paradise, as a multi-level supervisor
 * hierarchy (hierarchical multi-agent orchestration, LangGraph supervisor-
 * of-supervisors, recursive delegation).
 *
 *   God (神)        — the user. Issues the divine wish. Receives only answers.
 *   Pontiff (教主)  — YOU, the session. Receives the wish, governs the whole.
 *   Cardinal (枢機卿)— a DOMAIN supervisor. Owns one domain's orchestration and
 *                     runs its own inner PDCA loop. (discovery, requirements,
 *                     architecture, construction, quality...)
 *   Priest (神官)   — a LARGE subagent a cardinal dispatches for a big unit of work.
 *   Believer (信徒) — a SMALL subagent a priest would spawn for fine work.
 *   Executor (執行官)— the independent tribunal: judges on demand, answerable to
 *                     no cardinal. (verdict / critic / self-critic)
 *
 * Reviews & approvals are done by the APPROPRIATE CLASS: a cardinal reviews its
 * priests' work; the tribunal judges creations; the pontiff ratifies domains.
 *
 * This file is the declarative org chart + the rules that bind it. conclave.js
 * is the engine that runs it.
 */
'use strict';

const RANKS = {
  god:       { level: 0, title: 'God 神',        role: 'issues the wish, receives only answers' },
  pontiff:   { level: 1, title: 'Pontiff 教主',   role: 'governs the whole; the session itself' },
  cardinal:  { level: 2, title: 'Cardinal 枢機卿', role: 'domain supervisor; owns a sub-DAG + inner PDCA' },
  priest:    { level: 3, title: 'Priest 神官',    role: 'large subagent dispatched by a cardinal' },
  believer:  { level: 4, title: 'Believer 信徒',   role: 'small subagent for fine-grained work' },
  executor:  { level: -1, title: 'Executor 執行官', role: 'independent tribunal; judges on demand' },
};

/**
 * The College of Cardinals. Each cardinal owns a DOMAIN of the creation
 * lifecycle. `phases` are the forge phase ids this cardinal governs. `priests`
 * are the agent roles it may dispatch. `reviewClass` is who reviews its output
 * (appropriate-class review). `pdca` names the inner cycle it runs.
 */
const COLLEGE = {
  'discovery': {
    domain: 'Discovery (調査)',
    governs: ['discover'],
    priests: ['market-researcher'],
    believers: ['web-scout', 'feature-ranker'],
    reviewClass: 'pontiff',           // the pontiff ratifies findings before spec
    pdca: 'plan: frame questions → do: research → check: are must-haves grounded? → act: refine or widen search',
  },
  'requirements': {
    domain: 'Requirements (要件)',
    governs: ['analyze', 'specify'],
    priests: ['requirements-analyst'],
    believers: ['user-story-writer', 'acceptance-criteria-writer'],
    reviewClass: 'cardinal:discovery', // requirements checked against discovery
    pdca: 'plan: derive from findings → do: write spec → check: every must-have has an AC? → act: fill gaps',
  },
  'architecture': {
    domain: 'Architecture (設計)',
    governs: ['design', 'detail', 'ux'],
    priests: ['architect', 'frontend'],
    believers: ['data-modeler', 'interface-designer'],
    reviewClass: 'cardinal:requirements',
    pdca: 'plan: shape the system → do: design + decompose → check: does design satisfy the spec? → act: revise',
  },
  'construction': {
    domain: 'Construction (建造)',
    governs: ['build', 'build-ui', 'tests'],
    priests: ['architect', 'frontend', 'tdd-guide'],
    believers: ['module-builder', 'test-writer'],
    reviewClass: 'cardinal:quality',
    pdca: 'plan: take the tasks → do: implement + test → check: do tests pass? → act: fix until green',
  },
  'quality': {
    domain: 'Quality (品質)',
    governs: ['review', 'security', 'docs', 'verify'],
    priests: ['code-reviewer', 'security-reviewer', 'doc-updater'],
    believers: ['linter', 'coverage-checker', 'secret-scanner'],
    reviewClass: 'executor',           // quality feeds the tribunal
    pdca: 'plan: define gates → do: review+scan+verify → check: all gates green? → act: send back or pass',
  },
};

/**
 * The Tribunal (執行官) — independent of the college. It does not report to a
 * cardinal; it judges on demand and its verdict is binding.
 */
const TRIBUNAL = {
  domain: 'Tribunal (断罪機関)',
  governs: ['reflect', 'verdict'],
  officers: ['self-critic', 'creation-judge'],
  independence: 'answers to no cardinal; invoked by the pontiff at the judgment gate',
  law: 'reflect (adversarial self-critique) precedes verdict (SHIP/REWORK/BLOCK)',
};

/** Which cardinal governs a given forge phase id? */
function cardinalFor(phaseId) {
  for (const [name, c] of Object.entries(COLLEGE)) if (c.governs.includes(phaseId)) return name;
  if (TRIBUNAL.governs.includes(phaseId)) return 'tribunal';
  return null;
}

/** Group an ordered phase list into cardinal domains, preserving order. */
function groupByCardinal(phaseIds) {
  const groups = [];
  let cur = null;
  for (const id of phaseIds) {
    const card = cardinalFor(id);
    if (!cur || cur.cardinal !== card) { cur = { cardinal: card, phases: [] }; groups.push(cur); }
    cur.phases.push(id);
  }
  return groups;
}

/** The full org chart, for rendering / the dashboard. */
function orgChart() {
  return {
    ranks: RANKS,
    college: COLLEGE,
    tribunal: TRIBUNAL,
    hierarchy: 'god → pontiff → cardinal(domain) → priest(large subagent) → believer(small subagent);  executor ⟂ (independent)',
  };
}

function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'chart') { console.log(JSON.stringify(orgChart(), null, 2)); return; }
  if (cmd === 'cardinal-for') { console.log(cardinalFor(arg) || '(none)'); return; }
  if (cmd === 'college') {
    for (const [name, c] of Object.entries(COLLEGE))
      console.log(`枢機卿 ${name}: ${c.domain}\n  governs: ${c.governs.join(', ')}\n  priests: ${c.priests.join(', ')}\n  reviewed-by: ${c.reviewClass}\n  PDCA: ${c.pdca}\n`);
    console.log(`執行官 tribunal: ${TRIBUNAL.domain}\n  governs: ${TRIBUNAL.governs.join(', ')}\n  officers: ${TRIBUNAL.officers.join(', ')}`);
    return;
  }
  console.error('commands: chart | college | cardinal-for <phaseId>');
  process.exit(2);
}
if (require.main === module) main();
module.exports = { RANKS, COLLEGE, TRIBUNAL, cardinalFor, groupByCardinal, orgChart };
