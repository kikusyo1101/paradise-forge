# The Paradise Constitution (楽園憲法)

The non-negotiable principles every creation obeys. Read by the forge, enforced
by the gates, judged by the Creation Judge. Amending this document is the only
way to change what "complete" means.

## Articles

1. **Spec is the source of truth.** Code serves the spec, not the reverse. A
   creation that does not satisfy its acceptance criteria does not ship.

2. **Every phase is gated.** No phase advances on unverified assumptions.
   Marked gates (design, verify, verdict) are checkpoints that must pass.

3. **Parallel where independent, sequential where dependent.** The graph
   engine schedules honestly; independent work never waits needlessly.

4. **Verification precedes judgment; judgment precedes shipping.** Evidence is
   gathered before a verdict is rendered. A verdict is rendered before release.

5. **Evidence-based memory.** Only what actually happened is remembered. Claims
   are not evidence. A subagent's "it works" is verified before it is believed.

6. **No secrets in code.** Security is reviewed, never assumed. Fail-closed:
   unknown security status means "not proven safe."

7. **Small voices, full dignity.** A one-line wish deserves the same rigor as a
   grand plan — scaled appropriately (quick / standard / full), never dismissed.

8. **Research precedes specification.** A spec written without studying the world
   is a spec built on assumption. Every creation begins with discovery: what
   exists, what people use, what they expect. The literal wish is the seed, not
   the whole need — table-stakes features are surfaced before they are specified.

9. **The paradise doubts itself before it is judged.** Every creation is
   adversarially self-critiqued before judgment — assumed incomplete until the
   artifacts prove otherwise. A flaw only the user would notice must be noticed
   first. Past misses become permanent lessons: the paradise never depends on the
   user to find the same flaw twice.

10. **Orchestration is an explicit, durable state machine, not a prompt.** One
    conductor holds the run state; workers are stateless and focused. Routing
    remembers what it already tried. Context is handed off compressed — a worker
    receives its dependencies' artifacts, not the whole history. Every worker
    result is reconciled against reality before it is believed (a claim is not
    evidence). Loops are bounded: the loop-guard escalates to a human rather than
    burning on the same phase forever.

11. **The paradise is an ecclesiastical hierarchy of nested cycles.** God issues
    the wish; the pontiff (the session) governs; cardinals supervise domains;
    priests (large subagents) do large work and marshal believers (small
    subagents) for fine work; the tribunal (executor) judges, independent of all.
    Great circles contain small circles: the conclave turns a PDCA ring over
    domains, and each cardinal turns its own PDCA ring over its phases. Review and
    approval are done by the APPROPRIATE CLASS — a domain never ratifies itself;
    the tribunal answers to no cardinal. Every level is bounded by its own
    loop-guard and escalates upward rather than burning.

## The Verdict Law

| Verdict | Condition | Action |
|---------|-----------|--------|
| ✅ **SHIP**   | every gate passes, no breach | creation is complete, release |
| ⚠️ **REWORK** | fixable defects (build/type/lint/test/coverage) | loop back, repair, re-judge |
| 🔴 **BLOCK**  | constitutional breach (security/secret/spec unmet) | never ships, escalate to human |

*Enforced by `graph/verdict.js`. Amend deliberately — this defines completeness.*
