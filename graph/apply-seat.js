#!/usr/bin/env node
/**
 * PARADISE :: apply-seat — 教主の座を機構にする (憲法 第31条)
 * ---------------------------------------------------------------------
 * clergy.js は「教主 = <model> / <effort>」と宣言していた。しかし配備先の
 * `~/.claude/settings.json` には model も effortLevel も**書かれていなかった**。
 * deploy.js は agents と commands しか運ばない。つまり教主が今どのモデルで
 * 動いているかは、アカウントの既定に委ねられていて、楽園は何も統べていなかった。
 * 宣言は機構ではない(第10条)。この engine が、その宣言を settings.json に書く。
 *
 * 触るのは二つのキーだけ。他の設定(hooks, env, theme, ...)には一切触れない。
 *   model        : 教主の座るモデル
 *   effortLevel  : その座の思考の深さ
 *
 * さらに cron 無人運転の座を別に持つ。非対話(-p)では Fable の課金同意
 * プロンプトが**出ない** — 誰も見ていない深夜に credits を焼く。ゆえに
 * 無人の座は教主の座と分けて固定する。
 *
 *   apply-seat.js plan     何が変わるか (既定・書かない)
 *   apply-seat.js apply    settings.json に書く
 *   apply-seat.js verify   settings.json が宣言と一致するか (exit 1 = 乖離)
 *   apply-seat.js cron     無人運転の座を印字 (cron スクリプトが読む)
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const clergy = require('./clergy.js');

const SETTINGS = process.env.PARADISE_SETTINGS ||
  path.join(process.env.CLAUDE_HOME || path.join(os.homedir(), '.claude'), 'settings.json');

/**
 * 無人運転(cron)の座。教主の座とは別に固定する。
 * Fable は非対話では無確認で usage credits に課金されるため、無人の座には置かない。
 * ここは「神の裁可 2-1: opus-5 / xhigh に固定する」の機構化である。
 */
const UNATTENDED_SEAT = {
  model: 'claude-opus-5',
  effort: 'xhigh',
  why: '非対話(-p)では Fable の課金同意が出ない。無人の座に Fable を置けば、誰も見ていない間に credits を焼く',
};

/** 宣言された教主の座。 */
function pontiffSeat() {
  const r = clergy.RANKS.pontiff;
  return { model: r.model, effort: r.effort, why: r.why };
}

function readSettings(file = SETTINGS) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/**
 * 現状と宣言の差。settings.json が無い環境(CI, clone直後)では
 * 「配備されていない」だけであり、欠陥ではない — 検査は黙って通す。
 */
function diff(file = SETTINGS) {
  const want = pontiffSeat();
  const s = readSettings(file);
  if (s === null) {
    return { skipped: true, ok: true, file, want, note: 'no settings.json on this machine — nothing deployed to verify' };
  }
  const cur = { model: s.model ?? null, effort: s.effortLevel ?? null };
  const ok = cur.model === want.model && cur.effort === want.effort;
  return { skipped: false, ok, file, want, current: cur };
}

/** 宣言を settings.json に書く。二つのキー以外は一切触らない。 */
function apply(file = SETTINGS) {
  const want = pontiffSeat();
  const s = readSettings(file);
  if (s === null) return { ok: false, error: `settings.json not found or unreadable: ${file}` };
  const before = JSON.stringify(s);
  s.model = want.model;
  s.effortLevel = want.effort;
  const after = JSON.stringify(s);
  if (before === after) return { ok: true, changed: false, file, ...want };
  fs.writeFileSync(file, JSON.stringify(s, null, 2) + '\n');
  return { ok: true, changed: true, file, ...want };
}

// --- CLI ---
if (require.main === module) {
  const cmd = process.argv[2] || 'plan';
  if (cmd === 'cron') {
    if (process.argv.includes('--json')) console.log(JSON.stringify(UNATTENDED_SEAT));
    else console.log(`${UNATTENDED_SEAT.model} --effort ${UNATTENDED_SEAT.effort}`);
    process.exit(0);
  }
  if (cmd === 'apply') {
    const r = apply();
    if (!r.ok) { console.error('ERROR: ' + r.error); process.exit(1); }
    console.log(r.changed
      ? `  ✎ 教主の座 → ${r.model} / effort:${r.effort}   (${r.file})`
      : `  ✓ 教主の座は既に ${r.model} / effort:${r.effort}`);
    process.exit(0);
  }
  const d = diff();
  console.log('═══════ 👑 PONTIFF SEAT (Art.31) ═══════');
  if (d.skipped) {
    console.log('  (この機に settings.json 無し — 検査対象が存在しない)');
    console.log(`  宣言: ${d.want.model} / effort:${d.want.effort}`);
  } else if (d.ok) {
    console.log(`  ✓ 教主は宣言どおり座している: ${d.want.model} / effort:${d.want.effort}`);
  } else {
    console.log(`  🔴 宣言と乖離`);
    console.log(`     宣言: ${d.want.model} / effort:${d.want.effort}`);
    console.log(`     現状: ${d.current.model ?? '(無統治)'} / effort:${d.current.effort ?? '(無統治)'}`);
    console.log(`     → node graph/apply-seat.js apply`);
  }
  console.log(`  無人(cron)の座: ${UNATTENDED_SEAT.model} / effort:${UNATTENDED_SEAT.effort}`);
  console.log('════════════════════════════════════════');
  process.exit(cmd === 'verify' && !d.ok ? 1 : 0);
}

module.exports = { pontiffSeat, UNATTENDED_SEAT, diff, apply, readSettings, SETTINGS };
