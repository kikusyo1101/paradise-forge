# Git Workflow

The full delivery procedure (branch → commit → PR → review → merge) lives in the
`/ship` command — invoke it instead of improvising.

- Conventional Commits: `<type>(<scope>): <説明>` (feat/fix/refactor/docs/test/chore/perf/ci/security).
- PRs: analyze the full range with `git diff <base>...HEAD`, not just the last commit.
- Attribution is disabled globally via ~/.claude/settings.json.
