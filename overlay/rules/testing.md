---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/tests/**"
  - "**/src/**"
---
# Testing Requirements

- Minimum coverage 80%. Unit + integration + E2E (Playwright) for critical flows.
- TDD workflow: test first (RED) → minimal implementation (GREEN) → refactor.
  Use the **tdd-guide** agent proactively for new features and bug fixes.
- Fix the implementation, not the tests (unless the test itself is wrong).
