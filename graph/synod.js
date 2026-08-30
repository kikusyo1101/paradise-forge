#!/usr/bin/env node
/**
 * PARADISE :: Synod — the Planning Cycle between Pontiff and Cardinals
 * ---------------------------------------------------------------------
 * God's wish does not go straight to construction. First the pontiff convenes a
 * SYNOD: a PDCA cycle over the PLAN itself — which scale, which cardinals, how
 * they are arranged — reviewed and refined BEFORE a single phase runs.
 *
 * This closes the gap the wish demanded: "run a cycle even in the block from the
 * wish to the cardinals you summon, and improve there too." The great ring has a
 * planning ante-chamber.
 *
 *   Plan  : read the wish → choose scale → forge the DAG → group into cardinals.
 *   Do    : draft the convocation (which cardinals, which priests, the order).
 *   Check : critique the PLAN — are the right domains present? is the scale right?
 *           does every must-have domain have an owner? (a plan-level self-critique)
 *   Act   : refine the plan (bump scale, add a domain concern) or ratify it.
 *
 * Only a ratified plan proceeds to conclave.convene(). Bounded by its own guard.
 *
 * Usage:
 *   synod.js plan  "<wish>" [--scale ...]     # draft + self-critique the convocation
 *   synod.js check "<wish>" --scale ...       # just the plan critique
 */
'use strict';
const forge = require('./forge.js');
const clergy = require('./clergy.js');

/** Draft the convocation: the plan of cardinals for this wish. */
function draftConvocation(wish, scale) {
  scale = scale || forge.chooseScale(wish);
  const dag = forge.buildDag(wish, scale);
  const groups = clergy.groupByCardinal(dag.tasks.map(t => t.id));
  const cardinals = groups.map(g => {
    const c = clergy.COLLEGE[g.cardinal];
    return {
      cardinal: g.cardinal,
      domain: c ? c.domain : (g.cardinal === 'tribunal' ? clergy.TRIBUNAL.domain : g.cardinal),
      phases: g.phases,
      priests: c ? c.priests : (g.cardinal === 'tribunal' ? clergy.TRIBUNAL.officers : []),
      reviewClass: c ? c.reviewClass : 'god',
    };
  });
  return { wish, scale, gates: dag.meta.gates, cardinals };
}

/**
 * Critique the PLAN itself (plan-level self-critique, Constitution Art. 9 applied
 * to the plan, not the creation). Returns gaps that should refine the plan.
 */
function critiquePlan(convo) {
  const gaps = [];
  const names = convo.cardinals.map(c => c.cardinal);
  // Every credible creation must be grounded (discovery) and judged (tribunal).
  if (!names.includes('discovery')) gaps.push('no discovery cardinal — the plan would build on assumption (Art. 8)');
  if (!names.includes('tribunal')) gaps.push('no tribunal — nothing would judge the creation (Art. 9)');
  // A build must be reviewed for quality before judgment.
  if (names.includes('construction') && !names.includes('quality'))
    gaps.push('construction without a quality cardinal — no review/security gate before judgment');
  // Every cardinal must actually own phases and have a priest to do the work.
  for (const c of convo.cardinals) {
    if (!c.phases.length) gaps.push(`cardinal ${c.cardinal} owns no phases`);
    if (!c.priests.length) gaps.push(`cardinal ${c.cardinal} has no priest to dispatch`);
  }
  // A domain should not review itself (appropriate-class review, Art. 11).
  for (const c of convo.cardinals) {
    if (c.reviewClass === 'cardinal:' + c.cardinal) gaps.push(`cardinal ${c.cardinal} would review itself`);
  }
  return { ok: gaps.length === 0, gaps };
}

/**
 * Run the synod PDCA: draft → critique → (act) → ratify. If the plan is thin for
 * the wish, the ACT step suggests a scale bump. Returns the ratified plan or the
 * refinement needed.
 */
function convene(wish, scale, opts = {}) {
  const maxRefine = opts.maxRefine != null ? opts.maxRefine : 2;
  let s = scale || forge.chooseScale(wish);
  const trail = [];
  for (let i = 0; i <= maxRefine; i++) {
    const convo = draftConvocation(wish, s);
    const crit = critiquePlan(convo);
    trail.push({ scale: s, gaps: crit.gaps });
    if (crit.ok) return { ratified: true, plan: convo, refinements: trail };
    // ACT: try to refine. The only auto-refinement we can make is scale.
    const bump = { quick: 'standard', standard: 'full', full: 'full' }[s];
    if (bump === s) return { ratified: false, plan: convo, gaps: crit.gaps, refinements: trail,
      message: 'Plan still has gaps at max scale — pontiff must intervene.' };
    s = bump;
  }
  const convo = draftConvocation(wish, s);
  return { ratified: false, plan: convo, refinements: trail, message: 'Synod exhausted refinements.' };
}

function render(res) {
  const lines = ['⛪ SYNOD — 計画サイクル（教主↔枢機卿）', '═'.repeat(50)];
  lines.push(`wish: ${res.plan.wish}`);
  lines.push(`scale: ${res.plan.scale}   ratified: ${res.ratified ? '✓' : '✗'}`);
  lines.push('\nConvocation of cardinals:');
  for (const c of res.plan.cardinals)
    lines.push(`  枢機卿 ${c.cardinal} — ${c.domain}  [${c.phases.join(', ')}]  review:${c.reviewClass}`);
  if (res.refinements && res.refinements.length > 1) {
    lines.push('\nRefinement trail (the plan-level cycle turned):');
    res.refinements.forEach((r, i) => lines.push(`  ${i + 1}. scale=${r.scale}${r.gaps.length ? ' → gaps: ' + r.gaps.join('; ') : ' → clean'}`));
  }
  if (!res.ratified) lines.push('\n⚠️ ' + (res.message || 'plan not ratified'));
  else lines.push('\n✓ plan ratified — proceed to conclave.convene()');
  lines.push('═'.repeat(50));
  return lines.join('\n');
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const flags = {}; const pos = [];
  for (let i = 0; i < rest.length; i++) { if (rest[i] === '--scale') flags.scale = rest[++i]; else pos.push(rest[i]); }
  const wish = pos.join(' ').trim();
  if (cmd === 'plan') {
    if (!wish) { console.error('usage: synod.js plan "<wish>" [--scale ...]'); process.exit(2); }
    console.log(render(convene(wish, flags.scale)));
  } else if (cmd === 'check') {
    if (!wish) { console.error('usage: synod.js check "<wish>" [--scale ...]'); process.exit(2); }
    const convo = draftConvocation(wish, flags.scale);
    const crit = critiquePlan(convo);
    console.log(JSON.stringify(crit, null, 2));
    process.exit(crit.ok ? 0 : 1);
  } else {
    console.error('commands: plan "<wish>" [--scale ...] | check "<wish>" [--scale ...]');
    process.exit(2);
  }
}
if (require.main === module) main();
module.exports = { draftConvocation, critiquePlan, convene };
