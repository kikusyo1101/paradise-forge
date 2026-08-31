#!/usr/bin/env node
'use strict';
/**
 * wire-paradise-hooks.js — 楽園のフックを settings.json へ「並べて」足す
 *
 * 上流のフックを書き換えるのではなく、同じイベントの配列に楽園のフックを
 * 追加する。上流は read-only（憲法 第19条）。
 *
 *   node tools/wire-paradise-hooks.js          # 登録（冪等）
 *   node tools/wire-paradise-hooks.js --check  # 登録されているかだけ見る
 *   node tools/wire-paradise-hooks.js --remove # 取り外す
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const SETTINGS = process.env.CLAUDE_SETTINGS || path.join(os.homedir(), '.claude', 'settings.json');
const ROOT = path.resolve(__dirname, '..');
const HOOK = path.join(ROOT, 'tools', 'hooks', 'paradise-session-start.js').replace(/\\/g, '/');
const MARK = 'paradise-session-start.js';

function load(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function save(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2)); }

function entry() {
  return {
    matcher: '*',
    hooks: [{ type: 'command', command: `node "${HOOK}"` }],
    description: 'Paradise: inject the knowledge-graph snapshot (added alongside upstream, never into it)',
  };
}

function isWired(s) {
  const arr = (s.hooks && s.hooks.SessionStart) || [];
  return arr.some(e => JSON.stringify(e).includes(MARK));
}

function wire(settingsPath = SETTINGS) {
  const s = load(settingsPath);
  s.hooks = s.hooks || {};
  s.hooks.SessionStart = s.hooks.SessionStart || [];
  // 冪等: 既に居るなら command だけ更新する（パスが変わった場合に備える）
  const idx = s.hooks.SessionStart.findIndex(e => JSON.stringify(e).includes(MARK));
  if (idx >= 0) s.hooks.SessionStart[idx] = entry();
  else s.hooks.SessionStart.push(entry());
  save(settingsPath, s);
  return { ok: true, wired: true, count: s.hooks.SessionStart.length, hook: HOOK };
}

function unwire(settingsPath = SETTINGS) {
  const s = load(settingsPath);
  const arr = (s.hooks && s.hooks.SessionStart) || [];
  const before = arr.length;
  s.hooks.SessionStart = arr.filter(e => !JSON.stringify(e).includes(MARK));
  save(settingsPath, s);
  return { ok: true, removed: before - s.hooks.SessionStart.length };
}

if (require.main === module) {
  const p = SETTINGS;
  try {
    if (process.argv.includes('--check')) {
      const s = load(p);
      const w = isWired(s);
      console.log(w ? '✓ paradise session hook is wired' : '🔴 paradise session hook is NOT wired');
      process.exit(w ? 0 : 1);
    }
    if (process.argv.includes('--remove')) { console.log(JSON.stringify(unwire(p), null, 2)); process.exit(0); }
    console.log(JSON.stringify(wire(p), null, 2));
  } catch (e) { console.error('ERROR: ' + e.message); process.exit(1); }
}

module.exports = { wire, unwire, isWired, entry, HOOK, MARK };
