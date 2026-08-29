#!/usr/bin/env node
/**
 * PARADISE :: Verdict — the Gate of Judgment (裁きの門)
 * ---------------------------------------------------------------
 * Reads a verification report and renders judgment against the
 * constitution: SHIP / REWORK / BLOCK. This is the completeness
 * gate — no creation ships without passing judgment.
 *
 * Judgment law (deterministic, evidence-based):
 *   BLOCK   if any security issue, or any hard constitutional breach
 *           (secrets in code, spec not satisfied). Never ships.
 *   REWORK  if build/type/lint/tests fail, or coverage below floor.
 *           Fixable — loop back, do not ship yet.
 *   SHIP    only if every gate passes and no breach remains.
 *
 * Report shape (JSON; every field optional, absence = unknown = fail-closed
 * for security, fail-open for style):
 *   {
 *     build:   "pass"|"fail",
 *     types:   { status:"pass"|"fail", errors: N },
 *     lint:    { status:"pass"|"fail", warnings: N },
 *     tests:   { passed: N, failed: N, total: N, coverage: 0-100 },
 *     security:{ issues: N, secrets: N },
 *     spec:    { satisfied: true|false, unmet: ["..."] },
 *     diff:    { files: N }
 *   }
 *
 * Usage:
 *   verdict.js judge <report.json> [--floor 80]
 *   verdict.js judge -            # read report JSON from stdin
 *   verdict.js explain            # print the judgment law
 */
'use strict';
const fs = require('fs');

const DEFAULT_COVERAGE_FLOOR = 80;

function judge(report, opts = {}) {
  const floor = opts.floor != null ? opts.floor : DEFAULT_COVERAGE_FLOOR;
  const reasons = [];   // human-readable findings
  const breaches = [];  // hard constitutional breaches -> BLOCK
  const defects = [];   // fixable failures -> REWORK

  // --- BLOCK conditions (constitutional breaches) ---
  const sec = report.security || {};
  if ((sec.secrets || 0) > 0) breaches.push(`${sec.secrets} secret(s) found in code — constitution forbids secrets`);
  if ((sec.issues || 0) > 0) breaches.push(`${sec.issues} security issue(s) — must be resolved before shipping`);
  if (report.spec && report.spec.satisfied === false) {
    const unmet = (report.spec.unmet || []);
    breaches.push(`spec not satisfied${unmet.length ? ': ' + unmet.join('; ') : ''} — code must serve the spec`);
  }

  // --- REWORK conditions (fixable defects) ---
  if (report.build === 'fail') defects.push('build fails');
  if (report.types && report.types.status === 'fail') defects.push(`type errors: ${report.types.errors ?? '?'}`);
  if (report.lint && report.lint.status === 'fail') defects.push(`lint fails: ${report.lint.warnings ?? '?'} warning(s)`);
  if (report.tests) {
    const t = report.tests;
    if ((t.failed || 0) > 0) defects.push(`${t.failed}/${t.total ?? '?'} test(s) failing`);
    if (t.coverage != null && t.coverage < floor) defects.push(`coverage ${t.coverage}% below floor ${floor}%`);
  }

  // --- positive evidence (for the report) ---
  if (report.build === 'pass') reasons.push('build passes');
  if (report.types && report.types.status === 'pass') reasons.push('types clean');
  if (report.lint && report.lint.status === 'pass') reasons.push('lint clean');
  if (report.tests) {
    const t = report.tests;
    if ((t.failed || 0) === 0 && (t.total || 0) > 0) reasons.push(`${t.passed ?? t.total}/${t.total} tests pass`);
    if (t.coverage != null && t.coverage >= floor) reasons.push(`coverage ${t.coverage}% ≥ ${floor}%`);
  }
  if ((sec.issues || 0) === 0 && (sec.secrets || 0) === 0 && report.security) reasons.push('no security issues');
  if (report.spec && report.spec.satisfied === true) reasons.push('spec satisfied');

  let verdict, headline;
  if (breaches.length) {
    verdict = 'BLOCK';
    headline = 'Constitutional breach — cannot ship, escalate to human.';
  } else if (defects.length) {
    verdict = 'REWORK';
    headline = 'Fixable defects — loop back and repair, then re-judge.';
  } else {
    verdict = 'SHIP';
    headline = 'All gates pass, no breach — creation is complete.';
  }

  return { verdict, headline, breaches, defects, reasons, floor };
}

function render(v) {
  const glyph = { SHIP: '✅', REWORK: '⚠️', BLOCK: '🔴' }[v.verdict];
  const lines = [];
  lines.push('═══════════ ⚖️  VERDICT ═══════════');
  lines.push(`${glyph}  ${v.verdict}`);
  lines.push(v.headline);
  if (v.breaches.length) { lines.push('\nBreaches (BLOCK):'); v.breaches.forEach(b => lines.push('  🔴 ' + b)); }
  if (v.defects.length) { lines.push('\nDefects (REWORK):'); v.defects.forEach(d => lines.push('  ⚠️  ' + d)); }
  if (v.reasons.length) { lines.push('\nPassed:'); v.reasons.forEach(r => lines.push('  ✓ ' + r)); }
  lines.push('═══════════════════════════════════');
  return lines.join('\n');
}

const LAW = `⚖️  THE JUDGMENT LAW
BLOCK   — any security issue/secret, or spec unsatisfied. Never ships; escalate.
REWORK  — build/type/lint/test failure, or coverage below floor. Loop back & repair.
SHIP    — every gate passes and no breach remains. Creation is complete.
Fail-closed on security (unknown security => not proven safe).`;

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  if (cmd === 'explain') { console.log(LAW); return; }
  if (cmd === 'judge') {
    let floor;
    const rest = [];
    for (let i = 1; i < argv.length; i++) {
      if (argv[i] === '--floor') floor = Number(argv[++i]);
      else rest.push(argv[i]);
    }
    const src = rest[0];
    if (!src) { console.error('usage: verdict.js judge <report.json|-> [--floor N]'); process.exit(2); }
    const raw = src === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(src, 'utf8');
    const report = JSON.parse(raw);
    const v = judge(report, { floor });
    console.log(render(v));
    // exit code encodes the verdict: 0 SHIP, 1 REWORK, 2 BLOCK
    process.exit(v.verdict === 'SHIP' ? 0 : v.verdict === 'REWORK' ? 1 : 2);
  }
  console.error('commands: judge <report.json|-> [--floor N] | explain');
  process.exit(3);
}

if (require.main === module) main();
module.exports = { judge, render, DEFAULT_COVERAGE_FLOOR };
