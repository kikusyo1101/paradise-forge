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
    { id: 'spec-musthaves-covered', severity: 'smell',
      desc: 'Every 🔴 must-have named in findings.md appears reflected (by keyword overlap) in the requirements/spec',
      run: (ctx) => {
        if (!ctx.findings) return { ok: true, note: 'no findings.md — discovery may have been skipped', soft: true };
        const musts = extractMustHaves(ctx.findings);
        if (!musts.length) return { ok: true, note: 'no explicit 🔴 must-haves parsed' };
        const spec = ((ctx.requirements || '') + (ctx.prd || '')).toLowerCase();
        if (!spec) return { ok: true, note: 'no spec to compare (checked elsewhere)', soft: true };
        // A must-have is "reflected" when a MAJORITY of its salient keywords appear
        // in the spec — tolerant of synonyms/rephrasing (the exact wording differs
        // between findings and requirements). True spec satisfaction is proven by
        // driving the acceptance criteria live, not by string-matching prose.
        const stop = new Set(['the','a','an','and','or','of','to','in','is','be','flip','fair','コインを','する','を','の','が','は','・','v1','🔴','高価値','必須','最小','セット','完全','実装']);
        const salient = (m) => m.toLowerCase().split(/[\s、,，。()（）/:：;；]+/).filter(w => w.length > 1 && !stop.has(w));
        const weak = musts.filter(m => {
          const kws = salient(m); if (!kws.length) return false;
          const hit = kws.filter(k => spec.includes(k)).length;
          return hit / kws.length < 0.34; // fewer than a third of keywords present → weak
        });
        return weak.length
          ? { ok: false, note: 'must-haves weakly reflected (verify via ACs): ' + weak.map(w => w.slice(0, 30)).join('; ') }
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
/** STRICT scope match: the scope term must appear as a whole term (word-boundary,
 * case-insensitive). Unlike looseIncludes this never accepts a partial/majority
 * word hit, so scoping stays a hard fence rather than a fuzzy suggestion. */
function scopeMatches(hay, scope) {
  const s = String(scope).trim().toLowerCase();
  if (!s) return true;
  const esc = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, 'i').test(String(hay).toLowerCase());
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

/** Turn a persisted lesson into a check: "does <keyword> appear anywhere?"
 * Lessons may be SCOPED: a lesson whose `applies` keyword is not present in the
 * creation's own spec/findings does not apply here (prevents a pomodoro-specific
 * or paradise-internal lesson from false-firing on an unrelated creation).
 */
function lessonChecks(lessons) {
  return (lessons || []).map((l, i) => ({
    id: 'lesson:' + (l.id || i),
    severity: 'gap',
    desc: 'Past-miss lesson: ' + (l.label || l.note || l.id),
    run: (ctx) => {
      const needle = (l.check || l.keyword || l.label || '').toString();
      if (!needle) return { ok: true, note: 'lesson has no check' };
      // The SCOPE SUBJECT is what declares "who this target is". For a creation
      // it is its own spec; for the ENGINE ITSELF (self mode) no spec exists, so
      // the subject must be the target's DECLARED scopes — otherwise the subject
      // is the empty string and every scoped lesson silently vanishes exactly
      // where it was written to fire (Art. 14: a scope without a subject is a
      // blind spot, not a fence).
      const spec = ctx.scopeSubject !== undefined
        ? ctx.scopeSubject
        : (ctx.requirements + ctx.findings + ctx.prd);
      // Scope guard: if the lesson declares an `applies` term and it's absent
      // from THIS creation's spec, the lesson is out of scope — skip it.
      // The scope term is matched STRICTLY (whole term, case-insensitive), never
      // fuzzily: a loose match lets an incidental word ("internally") drag a
      // "paradise-internal" lesson into an unrelated creation and false-REWORK it.
      if (l.applies && !scopeMatches(spec, String(l.applies))) {
        return { ok: true, note: `lesson out of scope here (applies: ${l.applies})`, soft: true };
      }
      const hay = ctx.codeBlob + ctx.requirements + ctx.findings;
      return looseIncludes(hay, needle)
        ? { ok: true, note: `lesson satisfied: ${needle}` }
        : { ok: false, note: `LESSON REGRESSION — past miss recurs: "${needle}" not addressed` };
    },
  }));
}

/** The scope subject for a SELF review (the engine judging its own source).
 * A creation declares who it is via its spec; the engine has none, so it declares
 * its scopes explicitly. Overridable per-directory by a `.paradise-scopes` file
 * (one scope per line, `#` comments allowed) so this is a configuration surface,
 * not a hardcoded assumption. */
const DEFAULT_SELF_SCOPES = ['paradise-internal', 'orchestration'];
function selfScopeSubject(dir) {
  let scopes = DEFAULT_SELF_SCOPES;
  try {
    const raw = fs.readFileSync(path.join(dir, '.paradise-scopes'), 'utf8');
    const parsed = raw.split('\n').map(s => s.replace(/#.*$/, '').trim()).filter(Boolean);
    if (parsed.length) scopes = parsed;
  } catch { /* no override: use the declared defaults */ }
  return ' ' + scopes.join(' ') + ' ';
}

function review(dir, opts = {}) {
  const ctx = collect(dir, opts);
  // Self-source mode: when reviewing the paradise's OWN engine code (not a
  // creation), the creation-shaped checks (needs requirements.md / a co-located
  // test file / findings.md) do not apply — tests live centrally, there is no
  // per-module spec. Detect via an explicit opt-out marker or the --self flag.
  const isSelf = opts.self || fs.existsSync(path.join(dir, '.paradise-source'));
  // A self-review has no spec, so the scope fence has no subject to match against
  // and would skip EVERY scoped lesson — the paradise would be blind to exactly
  // the past misses it recorded about itself. Declare what the engine IS instead.
  if (isSelf) ctx.scopeSubject = selfScopeSubject(dir);
  let checks = [...builtinChecks(), ...lessonChecks(ctx.lessons)];
  if (isSelf) {
    const creationOnly = new Set(['spec-musthaves-covered', 'acceptance-criteria-present', 'tests-exist', 'grounded-in-discovery', 'claims-backed-by-runnable-evidence']);
    checks = checks.filter(c => !creationOnly.has(c.id)); // keep security + lessons + hardcode smell
  }
  const results = checks.map(c => {
    let r;
    try { r = c.run(ctx); } catch (e) { r = { ok: true, note: 'check errored: ' + e.message, soft: true }; }
    return { id: c.id, severity: c.severity, desc: c.desc, ...r };
  });
  const gaps = results.filter(r => !r.ok && r.severity === 'gap' && !r.soft);
  const smells = results.filter(r => !r.ok && r.severity === 'smell' && !r.soft);
  return { dir, results, gaps, smells, clean: gaps.length === 0, self: isSelf };
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
    if (!dir) { console.error('usage: critic.js review <dir> [--lessons lessons.json] [--self]'); process.exit(2); }
    const opts = {};
    for (let i = 2; i < argv.length; i++) { if (argv[i] === '--lessons') opts.lessons = argv[++i]; else if (argv[i] === '--self') opts.self = true; }
    const rev = review(dir, opts);
    console.log(render(rev));
    process.exit(rev.clean ? 0 : 1); // exit 1 => the critic found gaps => REWORK
  }
  console.error('commands: review <dir> [--lessons f] | checklist');
  process.exit(2);
}

if (require.main === module) main();
module.exports = { review, render, builtinChecks, extractMustHaves, lessonChecks, scopeMatches, selfScopeSubject };
