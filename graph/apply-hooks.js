#!/usr/bin/env node
'use strict';
/**
 * apply-hooks.js — **汎用フック 5 本を神の住処へ移す**(輸出 EX-3 / 裁可 1-A)
 *
 * ══════════════════════════════════════════════════════════════════════
 * なぜこの engine が在るのか
 * ══════════════════════════════════════════════════════════════════════
 *
 * 第6段の `retreat --plan` は、神の `settings.json` が楽園の倉の**絶対パス**で
 * フック 6 本を握っていることを実測した(AC-30 の逆向き依存)。うち 5 本は
 * **楽園を一切参照しない汎用フック**である(vendor 由来 / `~/.claude/sessions/` と
 * `skills/learned/` と `os.tmpdir()` へ書く)。
 *
 * ここに撤収のジレンマが在った:
 *   · 倉から**引くだけ**なら、神の全プロジェクトでセッション記録と学習が黙って止まる
 *   · 倉に**残す**なら、逆向き依存が消えず、倉を動かせば神のホームが壊れる
 *
 * 神の裁可 1-A は第三の道を選んだ —— **向け直す**。
 * 神の住処へ複製し、hook の `command` をそちらへ向ける。
 * これで機能は残り、倉への依存は消える。
 *
 * ⚠️ **この engine は神のホームへ書く。** ゆえに書き込みは 1 バイトも例外なく
 *    `abode.globalWrite('~/.claude/scripts/{hooks,lib}', …)` を通る(第58条(b))。
 *    台帳 `graph/abode.json` の EX-3 に神の名指しが無ければ、関門が throw して
 *    `write()` は一度も呼ばれない。
 *
 * ⚠️ **神5キーにも `permissions` にも触れない。** この engine が触るのは
 *    `hooks` 配列の中の、**楽園の絶対パスを握る 5 本の `command` 文字列だけ**である。
 *    settings.json を書く前には必ず退避を取る(`--redirect`)。
 *
 * ══════════════════════════════════════════════════════════════════════
 * 実測した落とし穴(推測ではない)
 * ══════════════════════════════════════════════════════════════════════
 *
 *  (1) **5 本だけ複製しても動かない。** 5 本すべてが `require('../lib/utils')` を
 *      引き、`session-start.js` は更に `require('../lib/package-manager')` を引く。
 *      `package-manager.js` 自身も `require('./utils')` を引く。
 *      ゆえに `lib/` も複製が要る —— 構造は `scripts/hooks/*.js` + `scripts/lib/*.js`。
 *
 *  (2) `evaluate-session.js` は
 *      `path.join(__dirname,'..','..','skills','continuous-learning','config.json')`
 *      を読む。`~/.claude/scripts/hooks/` に置けば
 *      `~/.claude/skills/continuous-learning/config.json` を指す —— **実機に既在**(409 B)。
 *      この相対参照が正しく解けるのは、複製先が `~/.claude/scripts/hooks/` の
 *      **ちょうど二段**であるときだけである。一段浅くても深くても config を失う。
 *
 *  (3) 偽のホーム(`USERPROFILE` を差し替えた一時 dir)へ複製して 5 本すべてを
 *      撃ち、全て exit 0 を確認した。`os.homedir()` が `USERPROFILE` を読むので、
 *      **神の実機を汚さずに実行を証明できる**。
 *
 * 使い方:
 *   node graph/apply-hooks.js plan        複製の計画を印字 (1 バイトも書かない)
 *   node graph/apply-hooks.js apply       神の住処へ複製する (EX-3 の関門を通る)
 *   node graph/apply-hooks.js redirect    settings.json の 5 本の道を向け直す (退避を取る)
 *   node graph/apply-hooks.js verify      複製が生きているか (EX-3 の照合 / exit 1 = 乖離)
 *
 * 条: 第54条(b) 台帳の実質 / 第58条(a)(b) 住所と関門 / 第37条 測れなかったを緑にしない
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const abode = require('./abode.js');   // 第58条(a): 住所を作るのは abode.js だけ

const REPO_ROOT = path.resolve(__dirname, '..');
const EX_ID = 'EX-3';

/**
 * 移す物。**vendor の 5 本と、それが引く lib の 2 本**である。
 * 一覧を engine の定数に持つ —— 走査で拾えば、vendor に新しいファイルが増えた日に
 * 黙って神のホームへ運んでしまう(台帳の越境)。
 */
const HOOK_FILES = [
  'suggest-compact.js',
  'pre-compact.js',
  'session-start.js',
  'session-end.js',
  'evaluate-session.js',
];
const LIB_FILES = ['utils.js', 'package-manager.js'];

const SRC_HOOKS = path.join(REPO_ROOT, 'overlay', 'vendor', 'scripts', 'hooks');
const SRC_LIB = path.join(REPO_ROOT, 'overlay', 'vendor', 'scripts', 'lib');

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function isFile(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }

/** `~` を解くのは abode.js だけである(第58条(a))。 */
function godScriptsDir(opts = {}) {
  const settings = abode.pathFor('settings', { env: { PARADISE_ABODE: 'global', ...(opts.env || {}) } });
  return path.join(path.dirname(settings), 'scripts');
}

/** 神の settings.json の道(env を見ずに global で固定して問う)。 */
function godSettingsPath(opts = {}) {
  return opts.settingsFile
    || abode.pathFor('settings', { env: { PARADISE_ABODE: 'global', ...(opts.env || {}) } });
}

/**
 * 複製の計画。**1 バイトも書かない。**
 * @returns {{unmeasurable:string|null, exportTarget:string, dest:string,
 *            steps:{group:string,file:string,src:string,dst:string,bytes:number,sha:string}[]}}
 */
function plan(opts = {}) {
  const e = abode.exportFor(EX_ID);
  const dest = opts.dest || godScriptsDir(opts);
  const out = { unmeasurable: null, exportTarget: e ? e.target : `(台帳に ${EX_ID} が無い)`,
                dest, steps: [] };
  if (!e) {
    out.unmeasurable = `graph/abode.json に ${EX_ID} が無い — 台帳に無い宛先へは書けない (第58条(b))`;
    return out;
  }
  for (const [group, dir, files] of [['hooks', SRC_HOOKS, HOOK_FILES], ['lib', SRC_LIB, LIB_FILES]]) {
    for (const f of files) {
      const src = path.join(dir, f);
      if (!isFile(src)) {
        // **源が無いことを黙って 0 件にしない**(第37条)。
        out.unmeasurable = `複製の源が無い: ${path.relative(REPO_ROOT, src)} — 源が欠けたまま移せば、` +
                           '神の住処に半端な複製が残る';
        return out;
      }
      const buf = fs.readFileSync(src);
      out.steps.push({ group, file: f, src, dst: path.join(dest, group, f),
                       bytes: buf.length, sha: sha256(buf) });
    }
  }
  return out;
}

/**
 * 神の住処へ複製する。**書き込みは必ず EX-3 の関門を通る**(第58条(b))。
 *
 * `abode.globalWrite()` は呼び手を stack から実測し、EX-3 の `writer`
 * (= `graph/apply-hooks.js`)と一致することを要求する。ゆえに**ここから直接呼ぶ**。
 */
function apply(opts = {}) {
  const p = plan(opts);
  if (p.unmeasurable) return { ok: false, unmeasurable: p.unmeasurable };
  const e = abode.exportFor(EX_ID);
  const done = abode.globalWrite(e.target, () => {
    const rows = [];
    for (const s of p.steps) {
      fs.mkdirSync(path.dirname(s.dst), { recursive: true });
      fs.copyFileSync(s.src, s.dst);
      rows.push({ group: s.group, file: s.file, bytes: s.bytes, dst: s.dst });
    }
    return rows;
  });
  return { ok: true, exportTarget: e.target, dest: p.dest, copied: done.length, files: done,
           verify: e.verify };
}

/**
 * 複製が実機で**生きているか**(EX-3 の照合)。
 *
 * 「在る」だけでは通さない —— **sha256 が源と一致すること**を見る。
 * 実機が無い機(CI)では**名乗って** skip する(第58条(e): 黙って緑にしない)。
 * @returns {{ok:boolean, skipped:string|null, dest:string, rows:object[], why:string[]}}
 */
function verify(opts = {}) {
  const p = plan(opts);
  if (p.unmeasurable) return { ok: false, skipped: null, dest: p.dest, rows: [], why: [p.unmeasurable] };
  const home = path.dirname(p.dest);
  if (!fs.existsSync(home)) {
    return { ok: true, skipped: `神の住処が無い: ${home} — ${EX_ID} は検められない`,
             dest: p.dest, rows: [], why: [] };
  }
  const rows = [], why = [];
  for (const s of p.steps) {
    if (!isFile(s.dst)) {
      rows.push({ group: s.group, file: s.file, state: 'missing' });
      why.push(`複製が無い: ${s.group}/${s.file} — ${s.dst}`);
      continue;
    }
    const got = fs.readFileSync(s.dst);
    const same = sha256(got) === s.sha;
    rows.push({ group: s.group, file: s.file, state: same ? 'ok' : 'drift',
                bytes: got.length, wantBytes: s.bytes });
    if (!same) why.push(`複製が源と食い違う: ${s.group}/${s.file} — node graph/apply-hooks.js apply`);
  }
  return { ok: why.length === 0, skipped: null, dest: p.dest, rows, why };
}

/**
 * 神の `settings.json` の 5 本の `command` を、複製先へ**向け直す**。
 *
 * ⚠️ **退避を取らずに神の settings.json を触るのは禁じ手である。**
 *    ゆえにこの関数は書く前に必ず `settings.json.pre-retreat-<epoch>.bak` を作る。
 *
 * ⚠️ 触るのは `hooks` の中の `command` 文字列**だけ**である。
 *    神5キー・`permissions`・`model`・`effortLevel` には一指も触れない ——
 *    JSON を読んで書き戻すのではなく、**その 5 本の command だけを差し替えて**
 *    他は `JSON.parse` した構造をそのまま書き戻す。
 *
 * @returns {{ok:boolean, changed:number, backup:string|null, rows:object[], why:string[]}}
 */
function redirect(opts = {}) {
  const file = godSettingsPath(opts);
  const dest = opts.dest || godScriptsDir(opts);
  if (!isFile(file)) {
    return { ok: true, changed: 0, backup: null, rows: [],
             why: [], skipped: `実機の ${file} が無い — 向け直す対象が無い` };
  }
  const raw = fs.readFileSync(file, 'utf8');
  let s;
  try { s = JSON.parse(raw); }
  catch (err) { return { ok: false, changed: 0, backup: null, rows: [],
                         why: [`実機の settings.json を読めない: ${file} — ${err.message}`] }; }

  const repoNeedle = REPO_ROOT.split(path.sep).join('/').toLowerCase();
  const destFwd = dest.split(path.sep).join('/');
  const rows = [], why = [];
  let changed = 0;

  for (const [event, groups] of Object.entries((s && s.hooks) || {})) {
    if (!Array.isArray(groups)) continue;
    groups.forEach((g, index) => {
      const hs = (g && Array.isArray(g.hooks)) ? g.hooks : [];
      for (const h of hs) {
        const cmd = String((h && h.command) || '');
        const fwd = cmd.replace(/\\/g, '/');
        if (!fwd.toLowerCase().includes(repoNeedle)) continue;
        // その command が名指すスクリプトの basename を拾う
        const m = fwd.match(/([\w.-]+\.(?:js|mjs|cjs))/);
        const base = m ? m[1] : null;
        if (!base || !HOOK_FILES.includes(base)) {
          // 楽園固有の 1 本(paradise-session-start.js)はここでは扱わない ——
          // それは移送先が repo 側に在り、`retreat` の別の手で引く。
          rows.push({ event, index, file: base, action: 'skip',
                      why: '汎用 5 本の台帳に無い — この器は向け直さない' });
          continue;
        }
        const next = `node "${destFwd.split(path.sep).join('/')}/hooks/${base}"`;
        if (cmd === next) { rows.push({ event, index, file: base, action: 'already' }); continue; }
        rows.push({ event, index, file: base, action: 'redirect', from: cmd, to: next });
        h.command = next;
        changed++;
      }
    });
  }

  if (!changed) return { ok: true, changed: 0, backup: null, rows, why };

  // ── 退避。**書く前に必ず取る。** 取れなければ書かない。
  const backup = `${file}.pre-retreat-${Math.floor(Date.now() / 1000)}.bak`;
  try { fs.copyFileSync(file, backup); }
  catch (err) {
    return { ok: false, changed: 0, backup: null, rows,
             why: [`退避を取れなかったので書かない: ${backup} — ${err.message}`] };
  }

  fs.writeFileSync(file, JSON.stringify(s, null, 2) + '\n');
  return { ok: true, changed, backup, rows, why };
}

/**
 * 楽園固有の 1 本を神の住処から**引く**(裁可 2-A の後半 / AC-30)。
 *
 * ⚠️ **移送先が生きていることを先に実測してから引く。** 空の移送先へ向けて引けば
 *    楽園の記憶注入が黙って消える(裁可 2-A の順序が正典である理由)。
 *    ゆえにこの関数は `<repo>/.claude/settings.json` に同名のフックが
 *    **現に居ること**を確かめ、居なければ**引かずに拒む**。
 *
 * ⚠️ 退避を取らずに神の settings.json を触るのは禁じ手である。
 *
 * @returns {{ok:boolean, removed:number, backup:string|null, refused:string|null, rows:object[]}}
 */
function withdraw(opts = {}) {
  const file = godSettingsPath(opts);
  if (!isFile(file)) {
    return { ok: true, removed: 0, backup: null, refused: null, rows: [],
             skipped: `実機の ${file} が無い — 引く対象が無い` };
  }

  // ── 前提: 移送先が生きているか。**engine の定数ではなく実物を見る。**
  const repoSettings = opts.repoSettingsFile
    || abode.pathFor('settings', { env: { PARADISE_ABODE: 'repo' } });
  let repoHasHook = false;
  try {
    const rs = JSON.parse(fs.readFileSync(repoSettings, 'utf8'));
    for (const groups of Object.values((rs && rs.hooks) || {})) {
      if (!Array.isArray(groups)) continue;
      for (const g of groups) {
        for (const h of ((g && g.hooks) || [])) {
          if (/paradise-session-start\.js/.test(String((h && h.command) || ''))) repoHasHook = true;
        }
      }
    }
  } catch { repoHasHook = false; }
  if (!repoHasHook) {
    return { ok: false, removed: 0, backup: null, rows: [],
             refused: `移送先に楽園のフックが居ない (${repoSettings}) — ` +
               '空の移送先へ向けて引けば機能が黙って消える。' +
               'PARADISE_ABODE=repo node graph/apply-guards.js apply を先に走らせよ (AC-32)' };
  }

  const raw = fs.readFileSync(file, 'utf8');
  let s;
  try { s = JSON.parse(raw); }
  catch (err) {
    return { ok: false, removed: 0, backup: null, rows: [],
             refused: `実機の settings.json を読めない: ${file} — ${err.message}` };
  }

  const rows = [];
  let removed = 0;
  for (const [event, groups] of Object.entries((s && s.hooks) || {})) {
    if (!Array.isArray(groups)) continue;
    const kept = [];
    groups.forEach((g, index) => {
      const hit = ((g && g.hooks) || []).some(h =>
        /paradise-session-start\.js/.test(String((h && h.command) || '')));
      if (!hit) { kept.push(g); return; }
      rows.push({ event, index, action: 'withdraw',
                  description: (g && g.description) || '',
                  command: String(((g.hooks || [])[0] || {}).command || '') });
      removed++;
    });
    s.hooks[event] = kept;
  }

  if (!removed) return { ok: true, removed: 0, backup: null, refused: null, rows };

  const backup = `${file}.pre-retreat-${Math.floor(Date.now() / 1000)}.bak`;
  try { fs.copyFileSync(file, backup); }
  catch (err) {
    return { ok: false, removed: 0, backup: null, rows,
             refused: `退避を取れなかったので書かない: ${backup} — ${err.message}` };
  }
  fs.writeFileSync(file, JSON.stringify(s, null, 2) + '\n');
  return { ok: true, removed, backup, refused: null, rows, movedTo: repoSettings };
}

function main(argv) {
  const cmd = argv[2];

  if (cmd === 'plan' || !cmd) {
    const p = plan();
    console.log('═══ 🪝 APPLY-HOOKS — 複製の計画 (EX-3 / dry run) ═══');
    console.log(`  輸出: ${p.exportTarget}`);
    console.log(`  複製先: ${p.dest}`);
    if (p.unmeasurable) {
      console.log(`  · 検められず: ${p.unmeasurable}`);
      console.log('════════════════════════════════════════════════');
      return 2;
    }
    for (const s of p.steps) {
      console.log(`    ${s.group.padEnd(6)} ${s.file.padEnd(24)} ${String(s.bytes).padStart(6)} B  → ${s.dst}`);
    }
    console.log(`  計 ${p.steps.length} 本 (hooks ${HOOK_FILES.length} / lib ${LIB_FILES.length})`);
    console.log('  (dry run — apply で実際に複製する)');
    console.log('════════════════════════════════════════════════');
    return 0;
  }

  if (cmd === 'apply') {
    const r = apply();
    if (!r.ok) { console.error(`ERROR: ${r.unmeasurable}`); return 2; }
    console.log('═══ 🪝 APPLY-HOOKS — 複製 (EX-3) ═══');
    console.log(`  複製先: ${r.dest}`);
    for (const f of r.files) console.log(`    ✎ ${f.group}/${f.file}  ${f.bytes} B`);
    console.log(`  ✓ ${r.copied} 本を複製した — 照合: ${r.verify}`);
    console.log('════════════════════════════════════');
    return 0;
  }

  if (cmd === 'redirect') {
    const r = redirect();
    console.log('═══ 🪝 APPLY-HOOKS — hook の道を向け直す (EX-3 / 裁可 1-A) ═══');
    if (r.skipped) { console.log(`  · skipped: ${r.skipped}`); console.log('═════'); return 0; }
    for (const row of r.rows) {
      if (row.action === 'redirect') {
        console.log(`  ✎ ${row.event}[${row.index}] ${row.file}`);
        console.log(`      から: ${row.from}`);
        console.log(`      へ  : ${row.to}`);
      } else {
        console.log(`  · ${row.event}[${row.index}] ${row.file || '(名前を読めず)'} — ${row.action}${row.why ? ' / ' + row.why : ''}`);
      }
    }
    if (r.why.length) { for (const w of r.why) console.error(`  🔴 ${w}`); return 1; }
    if (r.backup) console.log(`  🛟 退避: ${r.backup}`);
    console.log(`  ✓ ${r.changed} 本を向け直した`);
    console.log('══════════════════════════════════════════════════════════');
    return 0;
  }

  if (cmd === 'withdraw') {
    const r = withdraw();
    console.log('═══ 🪝 APPLY-HOOKS — 楽園固有の 1 本を引く (裁可 2-A / AC-30) ═══');
    if (r.skipped) { console.log(`  · skipped: ${r.skipped}`); console.log('═════'); return 0; }
    if (r.refused) {
      // **拒みは緑ではない。** 移送先が無いまま引けば機能が消える(第37条)。
      console.log(`  🔴 拒否: ${r.refused}`);
      console.log('══════════════════════════════════════════════════════════');
      return 1;
    }
    for (const row of r.rows) {
      console.log(`  🧳 ${row.event}[${row.index}] を引いた`);
      console.log(`      ${row.command}`);
      if (row.description) console.log(`      (${row.description})`);
    }
    if (r.movedTo) console.log(`  → 移送先で生きている: ${r.movedTo}`);
    if (r.backup) console.log(`  🛟 退避: ${r.backup}`);
    console.log(`  ✓ ${r.removed} 本を引いた`);
    console.log('══════════════════════════════════════════════════════════');
    return 0;
  }

  if (cmd === 'verify') {
    const r = verify();
    console.log('═══ 🪝 APPLY-HOOKS — 照合 (EX-3) ═══');
    console.log(`  複製先: ${r.dest}`);
    if (r.skipped) {
      // **skip は理由を名乗る**(第58条(e))。
      console.log(`  · skipped: ${r.skipped}`);
      console.log('════════════════════════════════════');
      return 0;
    }
    for (const row of r.rows) {
      const mark = row.state === 'ok' ? '✓' : '🔴';
      console.log(`    ${mark} ${row.group}/${row.file}` +
        (row.state === 'ok' ? `  ${row.bytes} B (sha 一致)` : `  ${row.state}`));
    }
    if (r.ok) console.log(`  ✓ ${r.rows.length} 本すべてが源と sha256 で一致する`);
    else for (const w of r.why) console.log(`  🔴 ${w}`);
    console.log('════════════════════════════════════');
    return r.ok ? 0 : 1;
  }

  console.error(`未知の命令: ${cmd} — plan | apply | redirect | withdraw | verify`);
  return 2;
}

if (require.main === module) {
  try { process.exitCode = main(process.argv); }
  catch (e) { console.error('ERROR: ' + e.message); process.exitCode = 1; }
}

module.exports = { plan, apply, verify, redirect, withdraw, godScriptsDir, godSettingsPath,
                   HOOK_FILES, LIB_FILES, SRC_HOOKS, SRC_LIB };
