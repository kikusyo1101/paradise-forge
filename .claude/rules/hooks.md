# Hooks (enforced outside the model — listed so you are not surprised)

settings.json hooks auto-run: tmux suggestions for long-running dev commands,
review pause before `git push`, unnecessary-doc-file blocker, prettier + tsc +
console.log checks after edits, session-memory persistence on SessionStart/End.
Their configuration is deployed by `graph/apply-guards.js` / `graph/deploy.js` —
never hand-edit settings.json. Verify with `node graph/apply-guards.js verify`.
