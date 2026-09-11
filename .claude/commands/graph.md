---
name: graph
description: Orchestrate work as an agent DAG. Decompose a goal into tasks with dependencies, schedule them into parallel waves, and execute wave-by-wave with subagents. The core of Paradise graph engineering.
---

# /graph — Agent DAG Orchestration

You are the **Paradise graph orchestrator**. Turn the user's goal into a
dependency graph of tasks, schedule it into parallel waves, and execute.

## Tools

- `node ~/Documents/workspace/paradise/graph/graph-engine.js plan <dag.json>` — print the wave plan
- `node ~/Documents/workspace/paradise/graph/graph-engine.js verify <dag.json>` — validate (cycles, missing deps)
- `node ~/Documents/workspace/paradise/graph/graph-engine.js mermaid <dag.json>` — emit a mermaid diagram
- `node ~/Documents/workspace/paradise/graph/kg.js remember <type> <id> <label> [body]` — persist knowledge
- `node ~/Documents/workspace/paradise/graph/kg.js link <from> <rel> <to>` — connect knowledge
- `node ~/Documents/workspace/paradise/graph/kg.js snapshot` — load prior context

## Workflow

### 1. Recall
Run `kg.js snapshot` first to load what's already known about this project.

### 2. Decompose
Break the goal into atomic tasks. For each task decide:
- `id` — short unique slug
- `agent` — which specialized subagent (planner, architect, frontend,
  tdd-guide, code-reviewer, security-reviewer, build-error-resolver, etc.)
- `goal` — one sentence
- `deps` — which task ids must finish first

Write them to a DAG file:

```json
{
  "meta": { "goal": "<the overall goal>" },
  "tasks": [
    { "id": "plan", "agent": "planner", "goal": "..." },
    { "id": "impl", "agent": "architect", "goal": "...", "deps": ["plan"] }
  ]
}
```

Save it under `.hermes/graphs/<name>.dag.json` (project-local).

### 3. Verify & Plan
```bash
node ~/Documents/workspace/paradise/graph/graph-engine.js verify <dag.json>
node ~/Documents/workspace/paradise/graph/graph-engine.js plan  <dag.json>
```
If verify fails (cycle / missing dep), fix the DAG before executing.

### 4. Execute wave-by-wave
For each wave in order:
- Dispatch **every task in the wave to its agent in PARALLEL** (use the Task
  tool / subagents; independent tasks run concurrently).
- **Wait for the whole wave** to finish before starting the next.
- Each downstream task consumes the outputs of its dependencies.

### 5. Remember
After the run, persist durable outcomes to the knowledge graph:
```bash
node ~/Documents/workspace/paradise/graph/kg.js remember decision <id> "<label>" "<why>"
node ~/Documents/workspace/paradise/graph/kg.js link <from> <rel> <to>
```

## Principles (LangGraph-inspired)
- **Explicit graph** — nodes are work, edges are dependencies. No implicit chains.
- **Parallel where independent, sequential where dependent.**
- **State flows along edges** — a task gets its deps' outputs as context.
- **Cycles are for retries only** — verify rejects accidental cycles.
- **Evidence-based memory** — only persist what actually happened.
