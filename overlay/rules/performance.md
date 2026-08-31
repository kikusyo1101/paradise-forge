# Performance & Context

- Model assignment is machine-deployed by rank (graph/apply-models.js + apply-seat.js,
  憲法第31条) — do not restate or override model tables in prose.
- Avoid the last 20% of the context window for large refactors or multi-file
  features; single-file edits and docs tolerate low context headroom.
- For complex tasks: ultrathink + Plan Mode, multiple critique rounds, split-role
  subagents. If a build fails, use the **build-error-resolver** agent and fix
  incrementally.
