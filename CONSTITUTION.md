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

## The Verdict Law

| Verdict | Condition | Action |
|---------|-----------|--------|
| ✅ **SHIP**   | every gate passes, no breach | creation is complete, release |
| ⚠️ **REWORK** | fixable defects (build/type/lint/test/coverage) | loop back, repair, re-judge |
| 🔴 **BLOCK**  | constitutional breach (security/secret/spec unmet) | never ships, escalate to human |

*Enforced by `graph/verdict.js`. Amend deliberately — this defines completeness.*
