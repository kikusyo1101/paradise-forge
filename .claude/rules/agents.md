# Agent Orchestration

- Agents live in `~/.claude/agents/`; each one's frontmatter description says when
  to use it. Delegate proactively — planner for complex features, code-reviewer
  right after writing code, security-reviewer before commits, tdd-guide for new
  features/bugfixes — without waiting for a user prompt.
- ALWAYS run independent Task/agent work in parallel, never sequentially.
- For complex problems, use split-role subagents (factual, senior-engineer,
  security, consistency, redundancy perspectives).
