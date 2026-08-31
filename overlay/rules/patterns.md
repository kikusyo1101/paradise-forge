---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# Common Patterns (TypeScript/React)

- **API response**: `{ success: boolean, data?, error?, meta?: {total,page,limit} }`
- **Repository pattern**: `findAll/findById/create/update/delete` interface over raw queries.
- **Custom hooks**: extract reusable stateful logic (e.g. useDebounce) instead of inlining effects.
- **New functionality**: search for battle-tested skeleton/reference projects first;
  clone the best match as foundation and iterate within a proven structure.
