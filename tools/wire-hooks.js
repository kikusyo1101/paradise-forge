#!/usr/bin/env node
// Paradise harness wiring: merge everything-claude-code hooks into ~/.claude/settings.json
// - resolves ${CLAUDE_PLUGIN_ROOT} to the real repo path
// - preserves all existing settings keys
// - idempotent: re-running replaces the hooks block cleanly
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = 'C:/Users/kikus/Documents/workspace/everything-claude-code';
const SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');
const HOOKS_SRC = path.join(REPO, 'hooks', 'hooks.json');

const settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
let hooksRaw = fs.readFileSync(HOOKS_SRC, 'utf8');
// Resolve plugin root placeholder to real path (forward slashes for node on Windows)
hooksRaw = hooksRaw.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, REPO);
const hooksObj = JSON.parse(hooksRaw);

// Backup
fs.writeFileSync(SETTINGS + '.pre-wire.bak', JSON.stringify(settings, null, 2));

settings.hooks = hooksObj.hooks;
fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2));

// Report
const counts = {};
for (const [ev, arr] of Object.entries(hooksObj.hooks)) counts[ev] = arr.length;
console.log('WIRED hooks into', SETTINGS);
console.log(JSON.stringify(counts, null, 2));
console.log('Existing keys preserved:', Object.keys(settings).filter(k => k !== 'hooks').join(', '));
