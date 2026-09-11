# Security Guidelines

Before ANY commit: no hardcoded secrets / inputs validated / parameterized queries /
sanitized HTML / authn+authz verified / error messages don't leak internals.

Secrets live in environment variables only — fail fast when missing:
`const apiKey = process.env.X; if (!apiKey) throw new Error('X not configured')`.

If a security issue is found: STOP → **security-reviewer** agent → fix CRITICAL
before continuing → rotate exposed secrets → sweep the codebase for the same class.
