#!/usr/bin/env node
'use strict';
/**
 * upstream.js — 借り物を統べる (憲法 第19条)
 *
 * everything-claude-code は OSS であり、更新が来る。だが取り込みは
 * 「git pull して終わり」ではない。楽園が触れた場所への変更、上流が
 * 消したもの、新しく増えたもの — それぞれ判断が要る。判断を都度の気分に
 * 委ねると、いつか静かに壊れる。だから儀式にする。
 *
 *   upstream.js status              上流と楽園の関係を一覧する
 *   upstream.js fetch               取りに行くだけ。merge はしない
 *   upstream.js diff                未取り込みの変更を四分類で提示する
 *   upstream.js impact              楽園への影響を裁定 (SAFE/REVIEW/BLOCK)
 *   upstream.js adopt [--yes]       承認の上で取り込む。既定は dry-run
 *   upstream.js verify              取り込み後の健全性を確かめる
 *
 * 原則:
 *   - 上流のワークツリーは read-only。改変も merge も自動ではしない
 *   - 上流の削除には自動追従しない。拾うか捨てるかは楽園の判断
 *   - `adopt` は人の承認を要する。機械は判断材料までを用意する
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OVERLAY = path.join(ROOT, 'overlay', 'overlay.json');

function expand(p) {
  if (!p) return p;
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}
function cfg() { return JSON.parse(fs.readFileSync(OVERLAY, 'utf8')); }
function upstreamPath(c) {
  return expand(process.env[c.upstream.path_env] || c.upstream.default_path);
}
function claudeHome(c) {
  return expand(process.env[c.deploy_target.path_env] || c.deploy_target.default_path);
}
function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', timeout: 120000 }).trim();
}
function tryGit(dir, args) { try { return git(dir, args); } catch { return null; } }

/** overlay が宣言する関係を、ファイル単位で引ける形にする。 */
function relations(c) {
  const rel = new Map(); // "kind/file" -> {kind:'transform'|'replace'|'own'|'adopted', detail}
  for (const [kind, spec] of Object.entries(c.transform || {})) {
    rel.set('*' + kind, { kind: 'transform', detail: spec });
  }
  for (const [f, spec] of Object.entries(c.replace || {})) {
    rel.set(f, { kind: 'replace', detail: spec });
  }
  for (const [kind, files] of Object.entries(c.own || {})) {
    if (!Array.isArray(files)) continue;
    for (const f of files) rel.set(`${kind}/${f}`, { kind: 'own', detail: {} });
  }
  for (const f of (c.adopted && c.adopted.files) || []) {
    rel.set(f, { kind: 'adopted', detail: {} });
  }
  return rel;
}

function relationOf(rel, file) {
  if (rel.has(file)) return rel.get(file);
  const kind = file.split('/')[0];
  if (rel.has('*' + kind)) return rel.get('*' + kind);
  return { kind: 'plain', detail: {} };
}

// ─── status ───
function status() {
  const c = cfg();
  const up = upstreamPath(c);
  const exists = fs.existsSync(path.join(up, '.git'));
  const out = { upstream: up, exists, readonly: c.upstream.readonly };
  if (!exists) return { ...out, error: 'upstream repository not found — set ' + c.upstream.path_env };
  out.head = tryGit(up, ['rev-parse', '--short', 'HEAD']);
  out.branch = tryGit(up, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const dirty = tryGit(up, ['status', '--porcelain']);
  out.dirty_files = dirty ? dirty.split('\n').filter(Boolean) : [];
  out.clean = out.dirty_files.length === 0;
  const behind = tryGit(up, ['rev-list', '--count', 'HEAD..@{u}']);
  out.behind = behind === null ? null : Number(behind);
  out.overlay = {
    transform: Object.keys(c.transform || {}),
    replace: Object.keys(c.replace || {}),
    own: Object.values(c.own || {}).filter(Array.isArray).flat().length,
    adopted: ((c.adopted && c.adopted.files) || []).length,
  };
  return out;
}

// ─── fetch ───
function fetch() {
  const c = cfg();
  const up = upstreamPath(c);
  if (!fs.existsSync(path.join(up, '.git'))) return { ok: false, error: 'upstream not found' };
  // 取りに行くだけ。merge も pull もしない — 判断の前に世界を変えない。
  try { git(up, ['fetch', 'origin', '--quiet']); }
  catch (e) { return { ok: false, error: 'fetch failed: ' + e.message }; }
  const behind = Number(tryGit(up, ['rev-list', '--count', 'HEAD..@{u}']) || 0);
  return { ok: true, behind, head: tryGit(up, ['rev-parse', '--short', 'HEAD']),
           remote: tryGit(up, ['rev-parse', '--short', '@{u}']) };
}

// ─── diff ───
/** 未取り込みの変更を、overlay の関係で四分類して返す。 */
function diff() {
  const c = cfg();
  const up = upstreamPath(c);
  if (!fs.existsSync(path.join(up, '.git'))) return { ok: false, error: 'upstream not found' };
  const raw = tryGit(up, ['diff', '--name-status', 'HEAD..@{u}']);
  if (raw === null) return { ok: false, error: 'no upstream tracking branch' };
  const rel = relations(c);
  const changes = [];
  for (const line of raw.split('\n').filter(Boolean)) {
    const [st, ...rest] = line.split(/\s+/);
    const file = rest.join(' ');
    const r = relationOf(rel, file);
    changes.push({
      status: st[0], // A=added D=deleted M=modified R=renamed
      file,
      relation: r.kind,
      // 上流が消したものは自動追従しない。楽園が使っていれば拾う判断が要る。
      needs_decision: (st[0] === 'D' && r.kind !== 'plain') || r.kind === 'replace',
    });
  }
  const commits = tryGit(up, ['log', '--oneline', 'HEAD..@{u}']) || '';
  return {
    ok: true,
    behind: commits ? commits.split('\n').filter(Boolean).length : 0,
    commits: commits ? commits.split('\n').filter(Boolean) : [],
    changes,
    by_relation: changes.reduce((a, x) => { a[x.relation] = (a[x.relation] || 0) + 1; return a; }, {}),
  };
}

// ─── impact ───
/**
 * 影響を裁定する。
 *   SAFE   : 楽園が触れていない場所だけが動いた
 *   REVIEW : 楽園の変換・置換・所有物に関わる変更、または上流の削除がある
 *   BLOCK  : 上流のワークツリーが汚れている / 楽園のフックが本体に注入されている
 */
function impact() {
  const c = cfg();
  const st = status();
  const d = diff();
  const reasons = [];
  let verdict = 'SAFE';

  if (st.error) return { verdict: 'BLOCK', reasons: [st.error], changes: [] };
  if (!st.clean) {
    verdict = 'BLOCK';
    reasons.push(`upstream worktree is dirty (${st.dirty_files.length} file(s)) — the borrowed tree must stay read-only: ` +
                 st.dirty_files.slice(0, 5).join(', '));
  }
  // 上流本体へのフック注入を検出する。かつて実際に起きた汚染。
  const up = upstreamPath(c);
  for (const pat of (c.protected_hooks && c.protected_hooks.never_edit) || []) {
    const dir = path.join(up, path.dirname(pat));
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (!fs.statSync(p).isFile()) continue;
      let src = '';
      try { src = fs.readFileSync(p, 'utf8'); } catch { continue; }
      if (/PARADISE|paradise[\\/]graph|paradise-kg/i.test(src)) {
        verdict = 'BLOCK';
        reasons.push(`paradise code is injected into the borrowed file ${path.join(path.dirname(pat), f)} — move it to tools/hooks/ and wire it alongside`);
      }
    }
  }

  if (!d.ok) return { verdict, reasons: reasons.concat([d.error]), changes: [] };
  const decisions = d.changes.filter(x => x.needs_decision);
  const touched = d.changes.filter(x => x.relation !== 'plain');
  if (verdict !== 'BLOCK') {
    if (decisions.length) { verdict = 'REVIEW'; reasons.push(`${decisions.length} change(s) need a human decision (deletions of files paradise relies on, or files paradise replaces)`); }
    else if (touched.length) { verdict = 'REVIEW'; reasons.push(`${touched.length} change(s) land on files paradise transforms or owns — the transform must be re-applied after adopting`); }
    else if (d.behind === 0) reasons.push('already up to date');
    else reasons.push(`${d.behind} upstream commit(s), none touching paradise's overlay`);
  }
  return { verdict, reasons, behind: d.behind, commits: d.commits.slice(0, 10),
           changes: d.changes, decisions, by_relation: d.by_relation };
}

// ─── adopt ───
/**
 * 取り込む。既定は dry-run — 何が起きるかを見せるだけ。
 * --yes を伴って初めて世界を変える。三権分立: 機械は提案し、人が承認する。
 */
function adopt(opts = {}) {
  const c = cfg();
  const up = upstreamPath(c);
  const imp = impact();
  const plan = [];

  if (imp.verdict === 'BLOCK') {
    return { ok: false, verdict: imp.verdict, reasons: imp.reasons, plan,
             note: 'refusing to adopt while the borrowed tree is unclean — fix the reasons first' };
  }
  if (imp.behind === 0) return { ok: true, verdict: imp.verdict, plan, note: 'nothing to adopt' };

  plan.push({ step: 'pull', detail: 'fast-forward the borrowed tree to origin (no local commits exist there)' });
  const deletions = imp.changes.filter(x => x.status === 'D' && x.relation !== 'plain');
  for (const del of deletions) {
    plan.push({ step: 'quarantine-deletion', file: del.file,
                detail: 'upstream deleted a file paradise relies on — copy it into overlay/adopted/ and record it in overlay.json; paradise never follows a deletion silently' });
  }
  if (Object.keys(c.transform || {}).length) {
    plan.push({ step: 're-apply-transform', detail: 'run graph/apply-models.js so the model policy (Art. 12) is restored over the refreshed files' });
  }
  plan.push({ step: 'redeploy', detail: 'run graph/deploy.js to rebuild ~/.claude from upstream + overlay' });
  plan.push({ step: 'verify', detail: 'check-agents + apply-models verify + the paradise self-test' });

  if (!opts.yes) {
    return { ok: true, dry_run: true, verdict: imp.verdict, reasons: imp.reasons, plan,
             note: 'dry run — re-run with --yes to execute. A REVIEW verdict means a human must look at the decisions first.' };
  }
  if (imp.verdict === 'REVIEW' && !opts.force) {
    return { ok: false, verdict: imp.verdict, reasons: imp.reasons, plan,
             note: 'REVIEW requires an explicit decision: re-run with --yes --force once the deletions/replacements above have been judged' };
  }
  // 実行
  const done = [];
  try { git(up, ['merge', '--ff-only', '@{u}']); done.push('pull'); }
  catch (e) { return { ok: false, verdict: imp.verdict, plan, done, error: 'fast-forward failed: ' + e.message }; }
  return { ok: true, verdict: imp.verdict, plan, done,
           note: 'upstream advanced. Now run: node graph/deploy.js --write && node graph/check-agents.js && node tests/paradise.test.js' };
}

// ─── verify ───
function verify() {
  const results = [];
  const run = (name, args) => {
    try { execFileSync('node', args, { cwd: ROOT, encoding: 'utf8', timeout: 300000 }); results.push({ name, ok: true }); }
    catch (e) { results.push({ name, ok: false, note: (e.stdout || e.message || '').toString().split('\n').slice(-3).join(' ') }); }
  };
  run('agents-present', [path.join('graph', 'check-agents.js')]);
  run('model-policy', [path.join('graph', 'apply-models.js'), 'verify']);
  run('self-test', [path.join('tests', 'paradise.test.js')]);
  const st = status();
  results.push({ name: 'upstream-clean', ok: !!st.clean,
                 note: st.clean ? 'the borrowed tree is untouched' : `dirty: ${(st.dirty_files || []).join(', ')}` });
  return { ok: results.every(r => r.ok), results };
}

// ─── CLI ───
function pretty(obj) { console.log(JSON.stringify(obj, null, 2)); }

if (require.main === module) {
  const cmd = process.argv[2];
  const flags = process.argv.slice(3);
  const json = flags.includes('--json');
  try {
    if (cmd === 'status') { pretty(status()); }
    else if (cmd === 'fetch') { pretty(fetch()); }
    else if (cmd === 'diff') { pretty(diff()); }
    else if (cmd === 'impact') {
      const r = impact();
      if (json) { pretty(r); process.exit(r.verdict === 'BLOCK' ? 2 : (r.verdict === 'REVIEW' ? 1 : 0)); }
      console.log('═══════ 📦 UPSTREAM IMPACT ═══════');
      console.log('verdict:', r.verdict, ' behind:', r.behind ?? 0);
      for (const why of r.reasons) console.log('  ·', why);
      if (r.by_relation) console.log('  by relation:', JSON.stringify(r.by_relation));
      for (const d of (r.decisions || []).slice(0, 8)) console.log('  ⚖️ decide:', d.status, d.file, `(${d.relation})`);
      console.log('══════════════════════════════════');
      process.exit(r.verdict === 'BLOCK' ? 2 : (r.verdict === 'REVIEW' ? 1 : 0));
    }
    else if (cmd === 'adopt') { const r = adopt({ yes: flags.includes('--yes'), force: flags.includes('--force') }); pretty(r); process.exit(r.ok ? 0 : 1); }
    else if (cmd === 'verify') { const r = verify(); pretty(r); process.exit(r.ok ? 0 : 1); }
    else {
      console.error('commands: status | fetch | diff | impact | adopt [--yes --force] | verify');
      process.exit(2);
    }
  } catch (e) { console.error('ERROR: ' + e.message); process.exit(1); }
}

module.exports = { status, fetch, diff, impact, adopt, verify, relations, relationOf, cfg, upstreamPath, claudeHome };
