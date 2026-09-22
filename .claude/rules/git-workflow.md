# Git Workflow

The full delivery procedure (branch → commit → PR → review → merge) lives in the
`/ship` command — invoke it instead of improvising.

- Conventional Commits: `<type>(<scope>): <説明>` (feat/fix/refactor/docs/test/chore/perf/ci/security).
- PRs: analyze the full range with `git diff <base>...HEAD`, not just the last commit.
- No AI attribution trailers in commits (verify: `git log --format=%B | grep -i co-authored` is empty).
