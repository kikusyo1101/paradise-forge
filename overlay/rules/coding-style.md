---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.mjs"
  - "**/*.py"
---
# Coding Style

## Immutability (CRITICAL)
ALWAYS create new objects, NEVER mutate: `{ ...user, name }` — not `user.name = name`.

## File Organization
MANY SMALL FILES > FEW LARGE FILES: high cohesion, low coupling.
200-400 lines typical, 800 max. Organize by feature/domain, not by type.

## Error Handling & Input Validation
- ALWAYS wrap risky operations in try/catch and rethrow a user-friendly message.
- ALWAYS validate user input at the boundary (e.g. zod schema.parse).

## Quality Checklist (before marking work complete)
readable names / functions <50 lines / no nesting >4 / proper error handling /
no console.log / no hardcoded values / no mutation.
