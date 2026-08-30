#!/usr/bin/env node
/**
 * PARADISE :: Critic — the Adversarial Self-Review (自己批評の門)
 * ---------------------------------------------------------------
 * The paradise's own doubt. Before the judge blesses a creation, the
 * critic attacks it: "this is incomplete — prove me wrong." It runs a
 * DETERMINISTIC checklist over the artifacts so blind spots can't hide
 * behind a confident summary.
 *
 * Synthesized from the OSS/research world:
 *   - Self-Refine (Madaan 2023) : generate -> self-feedback -> refine, in-loop
 *   - Reflexion   (Shinn 2023)  : persist lessons; past misses prime the next review
 *   - DEBATE / Agent-as-Judge   : an adversarial critic surfaces the scorer's blind spots
 *   - LLM-as-Judge practice     : critique must rest on a checklist, or the judge lies
 *
 * The critic is deterministic where it can be (checklists ARE evidence) and
 * leaves open-ended judgment to the self-critic agent that wraps it.
 *
 * A "lesson" is a persisted past-miss: a check that, once we were burned,
 * we now run every time (Reflexion's episodic memory). Lessons live in the
 * knowledge graph as nodes of type 'lesson' and are surfaced here.
 *
 * Usage:
 *   critic.js review <dir> [--spec findings.md,requirements.md] [--lessons lessons.json]
 *       -> runs the checklist over a creation directory, prints findings,
 *          exit 0 if clean, 1 if the critic found gaps.
 *   critic.js checklist            # print the built-in adversarial checklist
 */
'use strict';
const fs = require('fs');
const path = require('path');

/**
 * The adversarial checklist. Each check is a probe with a severity.
 * A check returns { ok, note } given the collected creation context.
 *   severity: 'gap' (must fix -> REWORK) | 'smell' (should look) | 'info'
 * Checks are intentionally SKEPTICAL — they assume incompleteness until
 * the artifacts prove otherwise.
 */
function builtinChecks() {
  return [
    // --- completeness vs the stated must-haves ---
    { id: 'spec-musthaves-covered', severity: 'gap',
      desc: 'Every 🔴 must-have named in findings.md is actually referenced by the requirements/spec',
      run: (ctx) => {
        if (!ctx.findings) return { ok: true, note: 'no findings.md — discovery may have been skipped', soft: true };
        const musts = extractMustHaves(ctx.findings);
        if (!musts.length) return { ok: true, note: 'no explicit 🔴 must-haves parsed' };
        const spec = (ctx.requirements || '') + (ctx.prd || '');
        const missing = musts.filter(m => !looseIncludes(spec, m));
        return missing.length
          ? { ok: false, note: 'must-haves not reflected in spec: ' + missing.join('; ') }
          : { ok: true, note: `${musts.length} must-haves reflected in spec` };
      } },

    // --- the spec's own acceptance criteria must be testable & tested ---
    { id: 'acceptance-criteria-present', severity: 'gap',
      desc: 'The spec defines concrete, checkable acceptance criteria',
      run: (ctx) => {
        const spec = ctx.requirements || ctx.prd || '';
        if (!spec) return { ok: false, note: 'no requirements.md / prd.md found' };
        const hasAC = /accept|AC-\d|criteri/i.test(spec);
        return hasAC ? { ok: true, note: 'acceptance criteria present' }
                     : { ok: false, note: 'no acceptance criteria found in spec' };
      } },

    { id: 'tests-exist', severity: 'gap',
      desc: 'A test artifact exists and is non-trivial',
      run: (ctx) => {
        const tests = ctx.files.filter(f => /\.test\.|_test\.|\.spec\./.test(f));
        if (!tests.length) return { ok: false, note: 'no test file found' };
        const big = tests.some(f => safeSize(path.join(ctx.dir, f)) > 400);
        return big ? { ok: true, note: `tests present: ${tests.join(', ')}` }
                   : { ok: false, note: 'test file exists but looks trivial (<400 bytes)' };
      } },

    // --- the creation should not silently drop features ("looks minimal") ---
    { id: 'no-hardcoded-assumptions', severity: 'smell',
      desc: 'Core values are configurable, not hardcoded (a timer with fixed durations is a smell)',
      run: (ctx) => {
        const code = ctx.codeBlob;
        if (!code) return { ok: true, note: 'no code to inspect' };
        // A real config surface means values FLOW from a config object into the
        // logic — not merely that the word "config" appears. Require both an
        // intake (config/options param or setConfig) AND that it's referenced
        // more than once (defined + used), and that literal magic numbers aren't
        // the sole source of core values.
        const hasIntake = /(function\s+\w+\s*\(\s*(config|options|opts|settings)\b)|setConfig\s*\(|\bconfig\s*=\s*config\b|options\s*\|\|\s*\{\}/i.test(code);
        const usesIntake = (code.match(/\b(config|options|opts|settings)\./gi) || []).length >= 1;
        // hardcoded smell: core durations assigned directly to numeric literals with no config fallback nearby
        const rawLiteralAssign = /=\s*\d{3,}\b/.test(code) && !usesIntake;
        const configurable = hasIntake && usesIntake && !rawLiteralAssign;
        return configurable ? { ok: true, note: 'config flows from an intake into the logic' }
                            : { ok: false, note: 'no real configuration surface — core values look hardcoded' };
      } },

    // --- security / constitution ---
    { id: 'no-secrets', severity: 'gap',
      desc: 'No secrets or hardcoded credentials in the code (Constitution Art. 6)',
      run: (ctx) => {
        const hits = (ctx.codeBlob.match(/\b(sk-[a-z0-9]{8,}|api[_-]?key\s*[:=]\s*['"][^'"]+|password\s*[:=]\s*['"][^'"]+)/gi) || []);
        return hits.length ? { ok: false, note: `${hits.length} possible secret(s) in code` }
                           : { ok: true, note: 'no secrets detected' };
      } },

    // --- discovery grounding (Constitution Art. 8) ---
    { id: 'grounded-in-discovery', severity: 'smell',
      desc: 'A findings.md exists — the spec was grounded in research, not assumption',
      run: (ctx) => ctx.findings
        ? { ok: true, note: 'discovery artifact present' }
        : { ok: false, note: 'no findings.md — did discovery run? (Art. 8: research precedes spec)' } },

    // --- the "did we actually check, or did we assume?" meta-probe ---
    { id: 'claims-backed-by-runnable-evidence', severity: 'smell',
      desc: 'There is a runnable way to verify the creation (a test or a judge-drive script)',
      run: (ctx) => {
        const runnable = ctx.files.some(f => /\.test\.|judge-drive|verify\./.test(f));
        return runnable ? { ok: true, note: 'runnable verification exists' }
                        : { ok: false, note: 'no runnable verification — claims rest on assertion, not evidence' };
      } },
  ];
}

// --- helpers ------------------------------------------------------------
function looseIncludes(hay, needle) {
  const h = hay.toLowerCase();
  // match on the salient words of the feature phrase (>=4 chars), majority must appear
  const words = needle.toLowerCase().match(/[a-z]{4,}/g) || [needle.toLowerCase()];
  const hit = words.filter(w => h.includes(w)).length;
  return hit >= Math.ceil(words.length * 0.5);
}
function extractMustHaves(findings) {
  // pull the labels from lines/rows marked with the red must-have marker
  const out = [];
  for (const line of findings.split('\n')) {
    if (/🔴/.test(line) || /must-have/i.test(line) || /\bmust\b/i.test(line)) {
      // table row: | 🔴 must | **Custom durations** (...) | ... |
      const bold = line.match(/\*\*(.+?)\*\*/);
      if (bold) { out.push(bold[1]); continue; }
      const cell = line.split('|').map(s => s.trim()).filter(Boolean);
      if (cell.length >= 2) out.push(cell[1].replace(/[🔴*]/g, '').trim());
    }
  }
  return [...new Set(out.filter(s => s && s.length > 2 && s.length < 60))];
}
function safeSize(p) { try { return fs.statSync(p).size; } catch { return 0; } }
function readIf(dir, name) { try { return fs.readFileSync(path.join(dir, name), 'utf8'); } catch { return ''; } }

function collect(dir, opts = {}) {
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile()) : [];
  const codeFiles = files.filter(f => /\.(js|ts|jsx|tsx|py|html|css)$/.test(f) && !/\.test\./.test(f));
  const codeBlob = codeFiles.map(f => readIf(dir, f)).join('\n');
  let lessons = [];
  if (opts.lessons) { try { lessons = JSON.parse(fs.readFileSync(opts.lessons, 'utf8')); } catch {} }
  return {
    dir, files, codeBlob,
    findings: readIf(dir, 'findings.md'),
    requirements: readIf(dir, 'requirements.md'),
    prd: readIf(dir, 'prd.md'),
    design: readIf(dir, 'design.md'),
    lessons,
  };
}

/** Turn a persisted lesson into a check: "does <keyword> appear anywhere?" */
function lessonChecks(lessons) {
  return (lessons || []).map((l, i) => ({
    id: 'lesson:' + (l.id || i),
    severity: 'gap',
    desc: 'Past-miss lesson: ' + (l.label || l.note || l.id),
    run: (ctx) => {
      const needle = (l.check || l.keyword || l.label || '').toString();
      if (!needle) return { ok: true, note: 'lesson has no check' };
      const hay = ctx.codeBlob + ctx.requirements + ctx.findings;
      return looseIncludes(hay, needle)
        ? { ok: true, note: `lesson satisfied: ${needle}` }
        : { ok: false, note: `LESSON REGRESSION — past miss recurs: "${needle}" not addressed` };
    },
  }));
}

function review(dir, opts = {}) {
  const ctx = collect(dir, opts);
  const checks = [...builtinChecks(), ...lessonChecks(ctx.lessons)];
  const results = checks.map(c => {
    let r;
    try { r = c.run(ctx); } catch (e) { r = { ok: true, note: 'check errored: ' + e.message, soft: true }; }
    return { id: c.id, severity: c.severity, desc: c.desc, ...r };
  });
  const gaps = results.filter(r => !r.ok && r.severity === 'gap' && !r.soft);
  const smells = results.filter(r => !r.ok && r.severity === 'smell' && !r.soft);
  return { dir, results, gaps, smells, clean: gaps.length === 0 };
}

function render(rev) {
  const lines = [];
  lines.push('═══════ 🔍 ADVERSARIAL SELF-CRITIQUE ═══════');
  lines.push(`target: ${rev.dir}`);
  for (const r of rev.results) {
    const glyph = r.ok ? '✓' : (r.severity === 'gap' ? '🔴' : '🟠');
    lines.push(`  ${glyph} [${r.severity}] ${r.id}: ${r.note}`);
  }
  lines.push('───────────────────────────────────────────');
  if (rev.gaps.length) lines.push(`VERDICT: ${rev.gaps.length} GAP(S) — the creation is incomplete. REWORK.`);
  else if (rev.smells.length) lines.push(`VERDICT: no hard gaps, but ${rev.smells.length} smell(s) worth a look.`);
  else lines.push('VERDICT: the critic found nothing. Proceed to judgment.');
  lines.push('═══════════════════════════════════════════');
  return lines.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  if (cmd === 'checklist') {
    for (const c of builtinChecks()) console.log(`[${c.severity}] ${c.id}: ${c.desc}`);
    return;
  }
  if (cmd === 'review') {
    const dir = argv[1];
    if (!dir) { console.error('usage: critic.js review <dir> [--lessons lessons.json]'); process.exit(2); }
    const opts = {};
    for (let i = 2; i < argv.length; i++) if (argv[i] === '--lessons') opts.lessons = argv[++i];
    const rev = review(dir, opts);
    console.log(render(rev));
    process.exit(rev.clean ? 0 : 1); // exit 1 => the critic found gaps => REWORK
  }
  console.error('commands: review <dir> [--lessons f] | checklist');
  process.exit(2);
}

if (require.main === module) main();
module.exports = { review, render, builtinChecks, extractMustHaves, lessonChecks };
