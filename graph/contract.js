#!/usr/bin/env node
/**
 * PARADISE :: Subagent Contract — Result Reconciliation
 * ---------------------------------------------------------------------
 * The paradise once trusted "it works" from a subagent. That is a claim,
 * not evidence (Constitution Art. 5). This module defines and ENFORCES the
 * structured result every worker must return, and reconciles it against
 * reality before the orchestrator marks a phase done.
 *
 * Synthesized from orchestration practice:
 *   - Parallel Subagents with Result Reconciliation
 *   - "require a verifiable handle (URL, id, absolute path) and verify it
 *      yourself before believing the operation succeeded"
 *
 * A worker result MUST be:
 *   {
 *     phase:   "<phase id>",
 *     status:  "done" | "failed" | "blocked",
 *     artifact:"<absolute path or handle>",   // required when status=done
 *     evidence:{ tests?: {passed,total}, ran?: "<cmd>", ... }, // optional but valued
 *     summary: "<one-line what happened>"
 *   }
 *
 * validate()   — is the result well-formed per the contract?
 * reconcile()  — does the claimed artifact ACTUALLY exist / is it non-trivial?
 *                (fail-closed: an unverifiable claim is not accepted)
 */
'use strict';
const fs = require('fs');

const REQUIRED = ['phase', 'status'];
const STATUSES = ['done', 'failed', 'blocked'];

/** Structural validation of a worker's returned contract. */
function validate(result) {
  const errors = [];
  if (!result || typeof result !== 'object') return { ok: false, errors: ['result is not an object'] };
  for (const k of REQUIRED) if (!result[k]) errors.push(`missing required field: ${k}`);
  if (result.status && !STATUSES.includes(result.status)) errors.push(`invalid status: ${result.status}`);
  if (result.status === 'done' && !result.artifact) errors.push('status=done requires an artifact (a verifiable handle)');
  return { ok: errors.length === 0, errors };
}

/**
 * Reconcile a done result against reality. The artifact must resolve to a real,
 * non-trivial file (or be an explicit non-file handle the caller marks external).
 * Fail-closed: if we cannot verify, we do NOT accept the claim.
 */
function reconcile(result, opts = {}) {
  const v = validate(result);
  if (!v.ok) return { accepted: false, reason: 'contract invalid: ' + v.errors.join('; ') };
  if (result.status !== 'done') return { accepted: false, reason: `status is ${result.status}, not done` };

  const art = result.artifact;
  // External handle (URL / id) — caller must opt in; we can't stat it here.
  if (/^https?:\/\//.test(art) || result.external) {
    return opts.allowExternal
      ? { accepted: true, reason: 'external handle accepted by caller', verified: 'external' }
      : { accepted: false, reason: 'external handle not verifiable here (pass allowExternal to accept)' };
  }
  // Artifact might be an abstract name (e.g. "implementation") rather than a path.
  // Accept only if a real path is given AND exists & is non-trivial.
  const minBytes = opts.minBytes != null ? opts.minBytes : 1;
  let exists = false, size = 0;
  try { const st = fs.statSync(art); exists = true; size = st.isDirectory() ? dirSize(art) : st.size; } catch {}
  if (!exists) return { accepted: false, reason: `artifact does not exist on disk: ${art}` };
  if (size < minBytes) return { accepted: false, reason: `artifact too small (${size}b < ${minBytes}b): ${art}` };

  // ── 成果物が在ることは「委譲された」ことを意味しない (憲法 第27条) ──
  // 教主が己の手で書いても、同じ成果物がそこに在る。ゆえに成果物だけを見る
  // 照合は階層の素通りを見抜けない。走行状態を渡された時は起動の証跡も検める。
  // MAST の FM-2.6「推論と実行の不一致」13.98% が正にこの穴である。
  if (opts.run) {
    const trace = require('./spawn-trace.js');
    const t = trace.verify(opts.run, result.phase);
    if (!t.ok) {
      return { accepted: false, verified: 'file-but-unspawned', size,
        reason: `artifact exists but the phase was never dispatched — ${t.reason}` };
    }
    return { accepted: true, verified: 'file+spawn', size,
      reason: `artifact verified (${size}b) and dispatch observed: ${t.reason}` };
  }
  return { accepted: true, reason: `artifact verified (${size}b): ${art}`, verified: 'file', size };
}

function dirSize(dir) {
  let total = 0;
  try { for (const f of fs.readdirSync(dir)) { try { const st = fs.statSync(require('path').join(dir, f)); total += st.isDirectory() ? 0 : st.size; } catch {} } } catch {}
  return total;
}

/** Reconcile a whole wave's results; returns which phases are accepted. */
function reconcileWave(results, opts = {}) {
  return results.map(r => ({ phase: r.phase, ...reconcile(r, opts) }));
}

/**
 * Parse an untrusted raw payload (a subagent's returned string) and reconcile it.
 * This is the WHOLE POINT of the contract: the input is untrusted, so malformed
 * JSON must be REJECTED cleanly (fail-closed, Art. 5) — never crash the reconciler
 * with an unhandled exception. A subagent that returns garbage does not get a pass.
 */
function checkPayload(raw, opts = {}) {
  if (raw == null || String(raw).trim() === '') {
    return { accepted: false, reason: 'empty payload: no result to reconcile' };
  }
  let result;
  try { result = JSON.parse(raw); }
  catch (e) { return { accepted: false, reason: 'malformed result JSON: ' + e.message }; }
  return reconcile(result, opts);
}

function main() {
  const [cmd] = process.argv.slice(2);
  if (cmd === 'schema') {
    console.log(JSON.stringify({
      phase: '<phase id>', status: 'done|failed|blocked',
      artifact: '<absolute path or handle (required when done)>',
      evidence: { tests: { passed: 0, total: 0 }, ran: '<command>' },
      summary: '<one-line>',
    }, null, 2));
    return;
  }
  if (cmd === 'check') {
    // read a JSON result from stdin, validate + reconcile (fail-closed on garbage)
    let d = ''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => {
      const rec = checkPayload(d);
      console.log(JSON.stringify(rec, null, 2));
      process.exit(rec.accepted ? 0 : 1);
    });
    return;
  }
  console.error('commands: schema | check (result JSON on stdin)');
  process.exit(2);
}
if (require.main === module) main();
module.exports = { validate, reconcile, reconcileWave, checkPayload };
