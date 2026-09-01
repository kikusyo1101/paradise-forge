#!/usr/bin/env node
'use strict';
/**
 * vendor.js — 取り込んだ資産を統べる (憲法 第20条)
 *
 * 楽園は借り物の上に立つのをやめ、己の足で立つ。上流 everything-claude-code の
 * 資産は `overlay/vendor/` に取り込まれ、楽園リポジトリの一部として運ばれる。
 * 上流が手元に無くても、消えても、楽園は完全に動く — それが独立である。
 *
 * ただし独立は決別ではない。上流が在るときはその進歩を見に行き、
 * 人の判断を経て取り込む (`refresh`)。
 *
 *   vendor.js status            取り込んだ資産の状態
 *   vendor.js hooks             hooks.json を「楽園基準」に解決して出す
 *   vendor.js wire              settings.json のフックを vendor 基準へ書き換える
 *   vendor.js refresh [--yes]   上流が在れば vendor/ を更新する (既定 dry-run)
 *   vendor.js verify            独立が保たれているか (上流への依存が残っていないか)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const VENDOR = path.join(ROOT, 'overlay', 'vendor');
const KINDS = ['agents', 'commands', 'skills', 'rules', 'hooks', 'scripts', 'contexts'];

/**
 * 上流のハーネス資産以外に取り込んだ**道具**。
 *
 * archify を入れたとき、`status` は 62 のままだった — KINDS しか数えないので、
 * 68ファイルの道具がまるごと見えていなかった。**在庫に載らない資産は
 * 独立の検査も受けない**（第20条が咎めたのと同じ盲点の別形である)。
 * ゆえに道具も宣言し、数え、電話をかけないことを門が検める。
 */
const TOOLS = {
  archify: {
    version: 'v2.16.0',
    origin: 'https://github.com/tt-a1i/archify',
    license: 'MIT',
    used_by: 'graph/atlas.js — 楽園の自画像を描く (第47条)',
    // 取り込み時に削いだファイル。戻ってくれば供給線が復活したということ。
    forbidden: ['scripts/check-update.mjs', 'scripts/update-contract.mjs'],
    entry: 'bin/archify.mjs',
  },
};

function expand(p) { return p && p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p; }
function claudeHome() { return expand(process.env.CLAUDE_HOME || path.join(os.homedir(), '.claude')); }
function settingsPath() { return process.env.CLAUDE_SETTINGS || path.join(claudeHome(), 'settings.json'); }

function countFiles(dir) {
  let n = 0;
  const walk = (d) => {
    let entries = [];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else n++;
    }
  };
  walk(dir);
  return n;
}

function status() {
  const kinds = {};
  for (const k of KINDS) kinds[k] = countFiles(path.join(VENDOR, k));
  const harness = Object.values(kinds).reduce((a, b) => a + b, 0);
  const tools = {};
  for (const [name, t] of Object.entries(TOOLS))
    tools[name] = { files: countFiles(path.join(VENDOR, name)), version: t.version, license: t.license, used_by: t.used_by };
  const toolTotal = Object.values(tools).reduce((a, t) => a + t.files, 0);
  return {
    vendor: VENDOR,
    present: fs.existsSync(VENDOR),
    total: harness + toolTotal,          // 在庫は**全て**を数える。数えぬ資産は検査もされない
    harness, kinds,
    tools, toolTotal,
    // 独立の核心: これが true なら上流が消えても楽園は動く
    self_sufficient: harness > 0 && fs.existsSync(path.join(VENDOR, 'scripts', 'hooks')),
  };
}

/**
 * hooks.json は上流のパスを前提に書かれている。楽園はそれを
 * 「取り込んだ scripts/」を指すように解決してから使う。
 * 原本(vendor/hooks/hooks.json)は書き換えない — 解決は読み出し時に行う。
 */
function resolveHooks() {
  const src = path.join(VENDOR, 'hooks', 'hooks.json');
  if (!fs.existsSync(src)) return null;
  let raw = fs.readFileSync(src, 'utf8');
  // ${CLAUDE_PLUGIN_ROOT} と、かつて直書きされた上流の絶対パスの両方を、
  // 取り込んだ vendor ディレクトリへ向け直す。
  const vendorFwd = VENDOR.replace(/\\/g, '/');
  raw = raw.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, vendorFwd);
  raw = raw.replace(/[A-Za-z]:[\\/](?:[^"\\]*[\\/])?everything-claude-code/g, vendorFwd);
  return JSON.parse(raw);
}

/** settings.json のフックを vendor 基準に張り替える。楽園自身のフックは温存する。 */
function wire(opts = {}) {
  const sp = settingsPath();
  if (!fs.existsSync(sp)) return { ok: false, error: 'settings.json not found: ' + sp };
  const hooks = resolveHooks();
  if (!hooks) return { ok: false, error: 'vendored hooks.json not found — run vendor.js refresh first' };

  const s = JSON.parse(fs.readFileSync(sp, 'utf8'));
  const before = JSON.stringify(s.hooks || {});
  // 楽園自身のフック(別ファイル)は、上流のフック群と並存させる。奪わない。
  const ownEntries = {};
  for (const [ev, arr] of Object.entries(s.hooks || {})) {
    const mine = (arr || []).filter(e => JSON.stringify(e).includes('paradise-'));
    if (mine.length) ownEntries[ev] = mine;
  }
  const next = JSON.parse(JSON.stringify(hooks.hooks || hooks));
  for (const [ev, mine] of Object.entries(ownEntries)) {
    next[ev] = (next[ev] || []).concat(mine);
  }
  if (!opts.write) {
    return { ok: true, dry_run: true, events: Object.keys(next),
             preserved_paradise_hooks: Object.keys(ownEntries),
             note: 'dry run — pass --write to apply' };
  }
  fs.copyFileSync(sp, sp + '.pre-vendor.bak');
  s.hooks = next;
  fs.writeFileSync(sp, JSON.stringify(s, null, 2));
  return { ok: true, written: sp, backup: sp + '.pre-vendor.bak',
           events: Object.keys(next), preserved_paradise_hooks: Object.keys(ownEntries),
           changed: before !== JSON.stringify(next) };
}

/** 上流が手元に在れば vendor/ を更新する。無ければ静かに何もしない。 */
function refresh(opts = {}) {
  let up;
  try { up = require('./upstream.js'); } catch { return { ok: false, error: 'upstream module unavailable' }; }
  const c = up.cfg();
  const UP = up.upstreamPath(c);
  if (!fs.existsSync(UP)) {
    return { ok: true, skipped: true, note: 'upstream is not on this machine — paradise runs without it' };
  }
  const plan = [];
  for (const k of KINDS) {
    const src = path.join(UP, k);
    if (!fs.existsSync(src)) continue;
    plan.push({ kind: k, from: src, to: path.join(VENDOR, k), files: countFiles(src) });
  }
  if (!opts.yes) return { ok: true, dry_run: true, plan, note: 'dry run — pass --yes to copy. Adoption is a human judgment (Art. 19(d)).' };
  for (const p of plan) {
    fs.rmSync(p.to, { recursive: true, force: true });
    fs.cpSync(p.from, p.to, { recursive: true });
  }
  return { ok: true, refreshed: plan.map(p => `${p.kind} (${p.files})`), vendor: VENDOR };
}

/**
 * 独立が保たれているか。配備物や設定が上流の絶対パスを指していれば、
 * それはまだ borrowed tree に紐付いているということ。
 */
function verify() {
  const findings = [];
  const sp = settingsPath();
  if (fs.existsSync(sp)) {
    const raw = fs.readFileSync(sp, 'utf8');
    const hits = (raw.match(/everything-claude-code/g) || []).length;
    if (hits) findings.push(`settings.json still points at the upstream tree in ${hits} place(s) — run: node graph/vendor.js wire --write`);
  }
  const st = status();
  if (!st.present) findings.push('overlay/vendor is missing — paradise cannot stand without the assets it adopted');
  else if (!st.self_sufficient) findings.push('vendored assets are incomplete (scripts/hooks missing)');
  // 取り込んだ道具が上流へ電話をかけていないか。**在庫を数えるだけの門は
  // 供給線を証明しない**(第19条が既に一度教えた過ち)。
  for (const [name, t] of Object.entries(TOOLS)) {
    const dir = path.join(VENDOR, name);
    if (!fs.existsSync(dir)) { findings.push(`vendored tool missing: ${name} — ${t.used_by} は動かない`); continue; }
    if (t.entry && !fs.existsSync(path.join(dir, t.entry)))
      findings.push(`vendored tool ${name} has no entry point (${t.entry})`);
    for (const f of (t.forbidden || [])) if (fs.existsSync(path.join(dir, f)))
      findings.push(`vendored tool ${name} phones home again: ${f} — 取り込んだ写しは供給線であってはならない (第20条)`);
  }
  return { ok: findings.length === 0, findings, status: st };
}

if (require.main === module) {
  const cmd = process.argv[2];
  const flags = process.argv.slice(3);
  const out = (o) => console.log(JSON.stringify(o, null, 2));
  try {
    if (cmd === 'status') out(status());
    else if (cmd === 'hooks') out(resolveHooks());
    else if (cmd === 'wire') { const r = wire({ write: flags.includes('--write') }); out(r); process.exit(r.ok ? 0 : 1); }
    else if (cmd === 'refresh') { const r = refresh({ yes: flags.includes('--yes') }); out(r); process.exit(r.ok ? 0 : 1); }
    else if (cmd === 'verify') {
      const r = verify();
      console.log('═══════ 🕊  INDEPENDENCE ═══════');
      console.log('vendored files:', r.status.total,
        `= harness ${r.status.harness} ${JSON.stringify(r.status.kinds)}` +
        ` + tools ${r.status.toolTotal} ${JSON.stringify(Object.fromEntries(Object.entries(r.status.tools).map(([k, v]) => [k + ' ' + v.version, v.files])))}`);
      if (r.ok) console.log('  ✓ paradise stands on its own — no path leads back to the borrowed tree');
      else for (const f of r.findings) console.log('  🔴', f);
      console.log('════════════════════════════════');
      process.exit(r.ok ? 0 : 1);
    }
    else { console.error('commands: status | hooks | wire [--write] | refresh [--yes] | verify'); process.exit(2); }
  } catch (e) { console.error('ERROR: ' + e.message); process.exit(1); }
}

module.exports = { status, resolveHooks, wire, refresh, verify, VENDOR, KINDS, TOOLS };
