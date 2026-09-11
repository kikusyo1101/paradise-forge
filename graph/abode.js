#!/usr/bin/env node
/**
 * PARADISE :: abode — 楽園自身の住処を知る唯一の場所 (憲法 第58条)
 *
 * 第30条は**作られる物**の住所を一箇所に集めた —— `graph/workspace.js` ただ一つが
 * 創造物の倉を知る。だが**作る物自身**の住所は、誰も守っていなかった。
 * 実測(改革前): `os.homedir()` は生産コードの **14 ファイル / 16 箇所**に散らばり、
 * `check-agents.js` と `pulse.js` は env の逃げ道を**一つも持たなかった**。
 *
 *   $ USERPROFILE=<sentinel> CLAUDE_HOME=<別の住処> PARADISE_AGENTS=<別の住処> node <probe>
 *   check-agents.skipped -> true   ok -> true      ← 測らずに緑を返している
 *
 * env を四本立てても engine は本物のホームを見ていた。散らばった住所は、
 * 倉を移した瞬間に嘘になる。ゆえに第30条の形を**作る側へ折り返す**:
 * 住所を作れる場所を一つに絞り、門がソースを走査して**行を名指す**。
 *
 * この器はもう一つの職務を持つ —— **輸出の関門**である。
 * 神託:「グローバルには私が直接追加を依頼したものだけ入れる」。
 * ゆえにグローバルへ書く engine は `globalWrite()` を通り、宛先は
 * `graph/abode.json`(神が名指した台帳)に載っていなければならない。
 * **この engine は台帳へ書く口を持たない** —— 持てば、裁かれる側が裁きの
 * 範囲を決めることになる(第54条(d))。
 *
 * CLI:
 *   node graph/abode.js resolve [--json]     住所を印字 (由来つき)
 *   node graph/abode.js path <key>           単一の住所を印字 (スクリプトから引く口)
 *   node graph/abode.js check [--count] [--ledger] [--exclusion]
 *                            [--silent-green] [--symmetry] [--hermetic] [--all]
 *                                            違反の検出。旗が無ければ --all
 *                                            **知らない旗は exit 2** (黙って捨てない)
 *   node graph/abode.js exports [--external] [--verify <id>]
 *                                            台帳の印字と、照合の道の提示
 *   node graph/abode.js migrate --plan | --verify
 *                                            KG / 日次台帳の移設 (計画と照合のみ)
 *                                            **--write は存在しない** —— 住所を知る器は書かない
 *   node graph/abode.js retreat --plan | --verify     (第6段 / work-6 で実装)
 *
 * exit code は三値。**2 を 0 に混ぜてはならない**(第37条: 不在は通過ではない):
 *   0 = 検めて、違反が無かった
 *   1 = 検めて、違反が在った
 *   2 = 検められなかった (前提が無い / 引数が不正 / この段では未実装)
 *   3 = 想定外の例外 (バグ)
 *
 * ⚠️ **第4段(work-4)で既定を `repo` へ反転した。** env が無ければ楽園は
 *    自分の倉の中に住む。外を向かせるのは `PARADISE_ABODE=global` の明示だけである。
 *    反転は `DEFAULT_MODE` の 1 行である —— 戻すのも 1 行である(design §8 危険2)。
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const workspace = require('./workspace.js');   // 第30条: 創造物の住所を知るのは workspace.js だけ

const REPO_ROOT = path.resolve(__dirname, '..');
const LEDGER = path.join(__dirname, 'abode.json');   // domains.js:29 と同形 — engine の隣にデータが住む

/** @typedef {'repo'|'global'} Mode */

/** 値域はこの 2 値のみ。他の文字列は黙って既定へ落とさず、exit 2 で拒む。 */
const MODES = new Set(['repo', 'global']);

/**
 * 既定の住処。**この一行が段階を表す。**
 * 第0〜3段 = 'global'(神の日常を 1 バイトも変えない) / 第4段以降 = 'repo'。
 * 反転が 1 行の差分であることを PR の可読性の要件とする(design §1.3)。
 */
const DEFAULT_MODE = 'global';

/** 個別 env は `PARADISE_ABODE` より強い。既存の門と CI がこれで隔離しているため。 */
const OVERRIDE_ENV = [
  { env: 'CLAUDE_HOME', key: 'abode', why: 'overlay.json:deploy_target.path_env' },
  { env: 'PARADISE_SETTINGS', key: 'settings', why: 'guards の門が実機を差し替える口' },
  { env: 'PARADISE_AGENTS', key: 'agents', why: 'check-agents / apply-models の隔離' },
  { env: 'PARADISE_KG', key: 'kg', why: 'tests/paradise.test.js:154 が本番 KG を守る口' },
  { env: 'PARADISE_DAILY_LEDGER', key: 'dailyLedger', why: 'daily-guard の台帳の隔離' },
];

/** `pathFor` が答えられる鍵。ここに無い鍵は黙って undefined を返さず throw する(第16条)。 */
const KEYS = [
  'abode', 'settings', 'agents', 'commands', 'rules', 'skills',
  'claudeMd', 'kg', 'dailyLedger', 'creationsAbode', 'home',
];

/** 「検められなかった」を表す誤り。CLI はこれを exit 2 に写す。 */
function unmeasurable(msg) {
  const e = new Error(msg);
  e.exitCode = 2;
  return e;
}

/**
 * ホームを答える。**この関数だけが os.homedir() を呼ぶ。**
 * 順序に意味がある: 試験は USERPROFILE / HOME を差し替えて器を隔離する
 * (実測: check-agents は env を四本立てても os.homedir() を見ていた — その逆をやる)。
 */
function home(env) {
  return (env && (env.USERPROFILE || env.HOME)) || os.homedir();
}

/**
 * 楽園自身の住処を解決する。
 * @param {{env?:object, repoRoot?:string}} [opts]
 * @returns {{mode:Mode, source:'env'|'default', abode:string, settings:string,
 *   agents:string, commands:string, rules:string, skills:string, claudeMd:string,
 *   kg:string, dailyLedger:string, creationsAbode:string, home:string,
 *   overrides:{env:string,key:string,value:string}[],
 *   exists:{abode:boolean, settings:boolean, agents:boolean, kg:boolean}}}
 */
function resolve(opts = {}) {
  const repoRoot = opts.repoRoot || REPO_ROOT;
  const env = opts.env || process.env;
  const raw = String(env.PARADISE_ABODE || '').trim();
  if (raw && !MODES.has(raw)) {
    throw unmeasurable(
      `PARADISE_ABODE の値域は ${[...MODES].join('|')} である: got ${JSON.stringify(raw)} — ` +
      '黙って既定へ落とせば、住所を取り違えたまま緑を出す(第16条)');
  }
  const mode = raw || DEFAULT_MODE;
  const source = raw ? 'env' : 'default';
  const h = home(env);

  // 素の住所。個別 env はこの後に重ねる —— 順序が優先順位である。
  const base = mode === 'repo' ? path.join(repoRoot, '.claude') : path.join(h, '.claude');
  const out = {
    mode, source, home: h,
    abode: base,
    /**
     * KG は mode=repo のとき配備の木の中ではなく `<repo>/graph/kg-store` に住む。
     * 配備物(`.claude/`)は「いつ消えても建て直せる産物」であり(第19条b)、
     * 記憶をそこに置けば、建て直しが記憶を消す。
     */
    kg: mode === 'repo' ? path.join(repoRoot, 'graph', 'kg-store') : path.join(base, 'paradise-kg'),
  };
  const rebase = () => {
    out.settings = path.join(out.abode, 'settings.json');
    out.agents = path.join(out.abode, 'agents');
    out.commands = path.join(out.abode, 'commands');
    out.rules = path.join(out.abode, 'rules');
    out.skills = path.join(out.abode, 'skills');
    out.claudeMd = path.join(out.abode, 'CLAUDE.md');
    out.dailyLedger = path.join(out.abode, 'paradise-daily.json');
  };
  rebase();

  const overrides = [];
  for (const o of OVERRIDE_ENV) {
    const v = String(env[o.env] || '').trim();
    if (!v) continue;
    const value = path.resolve(v);
    if (o.key === 'abode') { out.abode = value; rebase(); }
    else out[o.key] = value;
    overrides.push({ env: o.env, key: o.key, value });
  }
  // CLAUDE_HOME で abode を差し替えた後に個別 env をもう一度重ねる —
  // でなければ rebase() が PARADISE_SETTINGS の指定を上書きしてしまう。
  for (const o of overrides) if (o.key !== 'abode') out[o.key] = o.value;
  out.overrides = overrides;

  // 兄弟倉の住処。住所を知るのは workspace.js だけである(第30条)。
  out.creationsAbode = path.join(workspace.resolve({ repoRoot, env }).root, '.claude');

  out.exists = {
    abode: isDir(out.abode),
    settings: isFile(out.settings),
    agents: isDir(out.agents),
    kg: isDir(out.kg),
  };
  return out;
}

function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch { return false; } }
function isFile(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }
function read(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

/** 単一の住所を引く薄い口。未知の鍵は throw する(黙って undefined を返さない — 第16条)。 */
function pathFor(key, opts) {
  if (!KEYS.includes(key)) {
    throw unmeasurable(`未知の住所の鍵: ${JSON.stringify(key)} — 引ける鍵は ${KEYS.join(' / ')}`);
  }
  return resolve(opts)[key];
}

/** @returns {Mode} */
function mode(opts) { return resolve(opts).mode; }

// ══════════════════════════════════════════════════════════════════════
// 台帳 — 神が名指した輸出だけがグローバルへ出る (第58条(b))
// ══════════════════════════════════════════════════════════════════════

/**
 * 台帳を読む。**読むだけ。書く口は存在しない**(第54条(d) / AC-56)。
 * @param {{file?:string}} [opts] file は試験が偽の台帳を差すための口。
 *   `globalWrite()` はこの口を持たない —— 呼び手が台帳を差し替えられれば関門ではない。
 * @returns {{exports:object[], external:object[], closed:object[], path:string}}
 */
function ledger(opts = {}) {
  const file = opts.file || LEDGER;
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { throw unmeasurable(`台帳を読めない: ${file} — ${e.message}`); }
  return {
    exports: Array.isArray(raw.exports) ? raw.exports : [],
    external: Array.isArray(raw.external) ? raw.external : [],
    closed: Array.isArray(raw.closed) ? raw.closed : [],
    path: file,
  };
}

/**
 * 「書いた」ふりを退ける語。第54条の先例(空のマーカー 1 個で三法が素通り)を
 * 台帳で再演させない —— **在ることは資格ではない**。
 */
const PLACEHOLDER_RE = /^(TODO|TBD|FIXME|XXX|N\/?A|-+|\?+|後で|未定|なし)$/i;
/** 「なぜグローバルでなければならないか」は一文では書けない。 */
const REASON_MIN = 40;

const KINDS = {
  exports: new Set(['settings-key', 'deploy-tree', 'file']),
  external: new Set(['external-asset']),
};
const SCOPES = new Set(['machine', 'sibling-worktree', 'user']);
const REQUIRED = {
  exports: ['id', 'target', 'kind', 'writer', 'reason', 'scope', 'ordainedBy', 'ordainedOn', 'ordainedVia', 'verify'],
  external: ['id', 'target', 'kind', 'reason', 'scope', 'ordainedBy', 'ordainedOn', 'ordainedVia', 'verify'],
};

/**
 * 一つのエントリの実質を検める。
 * @returns {{id:string, field:string, why:string}[]}
 */
function validateEntry(e, i, kind, repoRoot = REPO_ROOT) {
  const F = [];
  const ent = e && typeof e === 'object' ? e : {};
  const say = (field, why) => F.push({ id: ent.id || `<${kind}[${i}] に id が無い>`, field, why });

  // (a) 空 — trim して空、または型が string でない
  for (const k of REQUIRED[kind]) {
    const v = ent[k];
    if (typeof v !== 'string' || !v.trim()) say(k, `${k} が空`);
  }
  // (b) プレースホルダ — 「書いた」ふりを退ける
  for (const k of ['target', 'reason', 'ordainedVia', 'verify']) {
    if (typeof ent[k] === 'string' && PLACEHOLDER_RE.test(ent[k].trim())) {
      say(k, `${k} がプレースホルダ: ${ent[k]}`);
    }
  }
  // (c) 実質 — reason が短すぎるのはプレースホルダの変装である
  if (typeof ent.reason === 'string' && ent.reason.trim() && ent.reason.trim().length < REASON_MIN) {
    say('reason', `reason が ${ent.reason.trim().length} 字 — なぜ楽園内で足りないかを ${REASON_MIN} 字以上で述べよ`);
  }
  // (d) 日付 — 「読める」だけでなく「実在の日付」かつ「未来でない」。
  //     new Date('2026-02-31') は 3/3 に化ける。ゆえに往復で照合する。
  if (typeof ent.ordainedOn === 'string' && ent.ordainedOn.trim()) {
    const s = ent.ordainedOn.trim();
    // `new Date('2026-13-01')` は Invalid Date になり toISOString() が投げる。
    // **門が例外で落ちれば、それは「検めた」ことにならない**(第16条)。
    let ok = false;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const d = new Date(s + 'T00:00:00Z');
      ok = !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
      if (ok && d > new Date()) { say('ordainedOn', `ordainedOn が未来: ${s}`); }
    }
    if (!ok) say('ordainedOn', `ordainedOn が日付として読めない: ${JSON.stringify(s)}`);
  } else if (typeof ent.ordainedOn === 'string') {
    say('ordainedOn', 'ordainedOn が日付として読めない: ""');
  }
  // (e) 列挙値
  if (!KINDS[kind].has(ent.kind)) say('kind', `未知の kind: ${ent.kind}`);
  if (!SCOPES.has(ent.scope)) say('scope', `未知の scope: ${ent.scope}`);
  if (ent.ordainedBy !== 'god') say('ordainedBy', `ordainedBy が god でない: ${ent.ordainedBy}`);
  // (f) id の形
  if (typeof ent.id === 'string' && ent.id.trim()) {
    const re = kind === 'exports' ? /^EX-\d+$/ : /^EXT-\d+$/;
    if (!re.test(ent.id.trim())) say('id', `id の形が ${re} に合わない: ${ent.id}`);
  }
  // (g) writer — 実在しないファイルを writer に書けば、誰も書けない輸出になる
  if (kind === 'exports') {
    if (typeof ent.writer === 'string' && ent.writer.trim() &&
        !fs.existsSync(path.join(repoRoot, ent.writer))) {
      say('writer', `writer が実在しない: ${ent.writer}`);
    }
  } else if ('writer' in ent) {
    say('writer', '外部資産に writer を書いてはならない — 楽園は読むだけである');
  }
  return F;
}

/**
 * 台帳の実質を検める(第二段)。**在ることを資格と認めない**(第54条(b))。
 * @returns {{id:string, field:string, why:string}[]}
 */
function validateLedger(led, repoRoot = REPO_ROOT) {
  const L = led || ledger();
  const F = [];
  for (const kind of ['exports', 'external']) {
    const rows = Array.isArray(L[kind]) ? L[kind] : [];
    const seen = new Map();
    rows.forEach((e, i) => {
      F.push(...validateEntry(e, i, kind, repoRoot));
      const id = e && typeof e.id === 'string' ? e.id.trim() : '';
      if (!id) return;
      if (seen.has(id)) F.push({ id, field: 'id', why: `id が重複している (${kind}[${seen.get(id)}] と ${kind}[${i}])` });
      else seen.set(id, i);
    });
  }
  /**
   * `closed[]` にも根拠を要求する。根拠の無い「閉じた」は自己申告であり、
   * 第54条(b) が退ける —— 次に誰かが同じ問いを持ち出したとき、
   * 機械が「実測の上で不要と裁定した」と答えられなければ台帳の意味が無い。
   */
  (Array.isArray(L.closed) ? L.closed : []).forEach((c, i) => {
    const ent = c && typeof c === 'object' ? c : {};
    const say = (field, why) => F.push({ id: ent.id || `<closed[${i}] に id が無い>`, field, why });
    for (const k of ['id', 'subject', 'question', 'verdict', 'evidence', 'closedOn', 'closedBy', 'closedVia']) {
      if (typeof ent[k] !== 'string' || !ent[k].trim()) say(k, `${k} が空`);
    }
    if (typeof ent.evidence === 'string' && ent.evidence.trim() && PLACEHOLDER_RE.test(ent.evidence.trim())) {
      say('evidence', `evidence がプレースホルダ: ${ent.evidence}`);
    }
  });
  return F;
}

/** id で輸出を引く。無ければ null。 */
function exportFor(id) {
  const L = ledger();
  return L.exports.find(e => e && e.id === id) || L.external.find(e => e && e.id === id) || null;
}

/** 宛先(target 文字列)で輸出を引く。無ければ null。 */
function exportForTarget(target) {
  const t = String(target || '').trim();
  if (!t) return null;
  return ledger().exports.find(e => e && String(e.target || '').trim() === t) || null;
}

/**
 * 呼び手を**実測**する。呼び手が「私は apply-guards です」と名乗る旗は受け付けない
 * (第54条(a): 資格は名乗りではなく住所が決める)。
 *
 * `Error.prepareStackTrace` を**この場で自分の物に差し替える**ので、呼び手が
 * 事前に細工した prepareStackTrace は届かない(試験で撃っている)。
 * @returns {string|null} repo 相対の道。測れなければ null
 */
function callerModule() {
  const prev = Error.prepareStackTrace;
  try {
    Error.prepareStackTrace = (_, frames) => frames;
    const err = new Error();
    Error.captureStackTrace(err, callerModule);
    const frames = err.stack;
    if (!Array.isArray(frames)) return null;
    for (const f of frames) {
      const file = f && f.getFileName && f.getFileName();
      if (!file || !file.endsWith('.js')) continue;
      const abs = path.resolve(file);
      if (abs === __filename) continue;                       // 自分自身は飛ばす
      if (!abs.startsWith(REPO_ROOT + path.sep)) continue;     // node 内部・倉の外を飛ばす
      return path.relative(REPO_ROOT, abs).split(path.sep).join('/');
    }
  } catch { return null; }
  finally { Error.prepareStackTrace = prev; }
  return null;
}

/**
 * **輸出の関門。グローバルへ書く engine は必ずここを通る。**
 *
 * 台帳に無い宛先、実質を欠いたエントリ、呼び手の食い違い —— どれか一つでも
 * 当たれば throw し、`write()` は**一度も呼ばれない**(1 バイトも書かない)。
 * 通した輸出は必ず標準出力へ名乗る(第54条(c): 黙って通した輸出は 0 件)。
 *
 * ⚠️ **この関門は mode を一切見ない。** `PARADISE_ABODE=global` は
 *    「既定の住所が外を向く」だけであって、「台帳を迂回する」意味を持たない(AC-55)。
 *    mode で輸出を分岐させる実装は `check` が静的に禁じる。
 *
 * @param {string} target
 * @param {() => any} write   実際の書き込みを行う関数
 * @throws {Error} 台帳に無い / 実質が無い / writer 不一致 / 呼び手が測れない
 */
function globalWrite(target, write) {
  const e = exportForTarget(target);
  if (!e) {
    throw new Error(`${target} は台帳に無い輸出である — graph/abode.json に神の名指しが要る (AC-23)`);
  }
  const bad = validateEntry(e, 0, 'exports');
  if (bad.length) {
    throw new Error(`${e.id} の台帳エントリに実質が無い — ` +
      bad.map(f => `${f.field}: ${f.why}`).join(' / ') + ' (第54条(b))');
  }
  const caller = callerModule();
  if (caller !== e.writer) {
    // **「測れなかった」を「一致した」と読んではならない**(第37条)。
    throw new Error(`${e.id} の writer は ${e.writer} — 呼び手は ${caller === null ? '(測れず)' : caller} (AC-26)`);
  }
  if (typeof write !== 'function') {
    throw unmeasurable(`${e.id}: 書き込みの関数が渡されていない — 関門は書く者を包んで初めて関門である`);
  }
  const r = write();
  console.log(`[輸出 ${e.id}] ${e.target} ← ${e.writer}`);
  return r;
}

/**
 * 台帳の輸出が指す**実機の道**。`~` はこの器だけが解く(第58条(a))。
 * 門がこれを使わず自分で `os.homedir()` を呼べば、engine と門で住所が割れる。
 * @returns {string|null} `~` 起点でない記法(`<creations-root>` 等)は解けないので null
 */
function exportRealPath(id, opts) {
  const e = exportFor(id);
  if (!e) return null;
  const p = String(e.target).split('#')[0];
  if (!p.startsWith('~')) return null;
  return path.join(home((opts && opts.env) || process.env), p.slice(1).replace(/^[\\/]+/, ''));
}

/**
 * 輸出が実機で**生きているか**を照合する(AC-27 / AC-28)。
 * **輸出は「出したら終わり」ではない。出した先も門が見張る。**
 *
 * ⚠️ 照合の道を持たない id に対して 0 を返してはならない —— それは
 * 「検められなかった」であり exit 2 である(§1.4 / 第37条)。
 * @returns {{id:string, path:string|null, ok:boolean, skipped:string|null, why:string[], counts:object|null}}
 */
function verifyExport(id, opts = {}) {
  const e = exportFor(id);
  if (!e) return { id, path: null, ok: false, skipped: null, why: [`${id} は台帳に無い`], counts: null };
  if (id !== 'EX-1') {
    throw unmeasurable(`${id} の自動照合はこの器が持たない — 照合の道は「${e.verify}」である。自分で走らせよ`);
  }
  const real = exportRealPath(id, opts);
  const why = [];
  if (!real || !isFile(real)) {
    // 実機が無い機(CI)では**名乗って** skip する。黙って緑にしない。
    return { id, path: real, ok: true, skipped: `実機の ${real} が無い — EX-1 は検めない`, why, counts: null };
  }
  // 遅延 require: apply-guards は abode を読む。環になる require は関数の中に置く。
  const G = require('./apply-guards.js');
  let s = null;
  try { s = JSON.parse(fs.readFileSync(real, 'utf8')); }
  catch (err) { throw unmeasurable(`実機の settings.json を読めない: ${real} — ${err.message}`); }
  const perms = (s && s.permissions) || null;
  if (!perms) why.push('実機に permissions が無い — EX-1 の輸出が消えている');
  else if (!G.permissionsMatch(perms, G.POLICY)) {
    for (const kind of ['deny', 'ask', 'allow']) {
      const want = new Set(G.POLICY[kind] || []);
      const got = new Set(perms[kind] || []);
      for (const w of want) if (!got.has(w)) why.push(`${kind} から消えている: ${w}`);
      for (const g of got) if (!want.has(g)) why.push(`${kind} に台帳外の行が在る: ${g}`);
    }
    if (!why.length) why.push('permissions が POLICY と食い違う(並び/重複)');
  }
  const counts = perms
    ? { deny: (perms.deny || []).length, ask: (perms.ask || []).length, allow: (perms.allow || []).length }
    : null;
  return { id, path: real, ok: why.length === 0, skipped: null, why, counts };
}

// ══════════════════════════════════════════════════════════════════════
// 第一段: 住所 — ソースを走査して、住所を作る場所を一つに絞る (第58条(a))
// ══════════════════════════════════════════════════════════════════════

/**
 * 住所を作る行の形。`workspace.js:106-109` の `HARDCODE_PATTERNS` と同じ流儀 ——
 * **形を一本しか持たない門は意味を見逃す**(第19条の再発を防ぐため複数持つ)。
 */
const HOMEDIR_PATTERNS = [
  { re: /\bos\.homedir\s*\(/, why: 'os.homedir() の直接呼び出し' },
  { re: /\bprocess\.env\.(USERPROFILE|HOMEPATH)\b/, why: 'ホームを env から直に読んでいる' },
  { re: /['"`]~\/\.claude/, why: "文字列リテラルの '~/.claude'" },
  { re: /path\.(join|resolve)\s*\([^)]*['"`]\.claude['"`]/, why: "path.join/resolve の引数の '.claude'" },
  { re: /\bCLAUDE_CONFIG_DIR\b/, why: 'CLAUDE_CONFIG_DIR は方式C — 採らないと裁定済み' },
];

/**
 * 除外は **1 ファイルのみ**。理由: 住所を作ることがこのファイルの職務だからである。
 * 除外を広げてはならない —— 広げた瞬間、この門は自分の穴を自分で開ける。
 *
 * `workspace.js:111-117` は除外を**コード内に明示**した(「除外を暗黙にすると、
 * 除外したこと自体が見えなくなる」)。だが第54条は**明示だけでは足りない**ことを
 * 教えている —— 空の `.paradise-source` は「明示された除外の条件」を満たしていた。
 * ゆえに四重の錠を掛ける(`exclusionAudit()` が全て検める)。
 */
const HOMEDIR_EXCLUDE_FILES = new Set(['abode.js']);
/** 錠1 の固定値。増やすなら憲法を改めよ(第58条(a))。 */
const HOMEDIR_EXCLUDE_MAX = 1;
/** 錠3 の上限。住所を作る場所が器の中で分裂したら、それも散らばりである。 */
const ABODE_HOMEDIR_MAX = 1;
/** 錠2 — 除外は名前ではなく**実質**が与える。この輸出を欠けば除外は与えない。 */
const EXCLUSION_EVIDENCE = ['function resolve', 'function pathFor', 'function globalWrite', 'module.exports'];

/** 走査対象のファイル(repo 相対の道)。graph は 1 階層、tools は再帰。 */
function scanTargets(repoRoot = REPO_ROOT) {
  const out = [];
  let names = [];
  try { names = fs.readdirSync(path.join(repoRoot, 'graph')); } catch { names = []; }
  for (const n of names.sort()) if (n.endsWith('.js')) out.push('graph/' + n);
  const walk = (rel, depth) => {
    if (depth > 4) return;
    let ents = [];
    try { ents = fs.readdirSync(path.join(repoRoot, rel), { withFileTypes: true }); } catch { return; }
    for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel + '/' + e.name;
      if (e.isDirectory()) walk(r, depth + 1);
      else if (e.name.endsWith('.js')) out.push(r);
    }
  };
  walk('tools', 0);
  return out;
}

/**
 * ソースから**註釈と文字列の中身**を落として、走るコードだけを残す。
 *
 * この器は「散らばった住所」という病を裁く門であり、裁くために病の名を
 * 註釈にも診断文にも書く(`why: 'os.homedir() の直接呼び出し'` のように)。
 * 素朴に数えれば、**病を説明した文字列そのものが違反として数えられる** ——
 * `workspace.js:136-137` が「註釈は道を説明してよい」と裁いたのと同じ形が、
 * 文字列にも要る。
 *
 * **行ごとに処理する。** ファイル全体を一本の走査で舐めると、正規表現リテラルの
 * 中の引用符(`/['"`]~\/\.claude/` — この engine が実際に持っている)を
 * 文字列の始まりと読み違え、そこから先の全行が同期を失う(実測でそうなった)。
 * 行で切れば、読み違えの被害はその 1 行に閉じる。**門の誤りは局所であれ。**
 */
function codeOnly(src) {
  const out = [];
  let inBlock = false;
  for (const raw of src.split('\n')) {
    let line = raw, keep = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i], d = line[i + 1];
      if (inBlock) { if (c === '*' && d === '/') { inBlock = false; i++; } continue; }
      if (c === '/' && d === '/') break;                       // 行註釈 — 以降は捨てる
      if (c === '/' && d === '*') { inBlock = true; i++; continue; }
      if (c === '"' || c === "'" || c === '`') {                // 文字列 — 中身を捨てて空にする
        i++;
        while (i < line.length && line[i] !== c) { if (line[i] === '\\') i++; i++; }
        keep += c + c;
        continue;
      }
      keep += c;
    }
    out.push(keep);
  }
  return out.join('\n');
}

/**
 * 除外の裏付けを検める(四重の錠)。**除外を適用したなら必ず口で名乗る**(第54条(c))。
 * @returns {{files:string[], size:number, sizeOk:boolean, granted:boolean,
 *   missing:string[], homedirCount:number, countOk:boolean, ok:boolean, why:string[]}}
 */
function exclusionAudit(repoRoot = REPO_ROOT) {
  const files = [...HOMEDIR_EXCLUDE_FILES];
  const why = [];
  // 錠1 — 除外リストの長さを門が固定する
  const sizeOk = files.length <= HOMEDIR_EXCLUDE_MAX && files.length >= 1;
  if (!sizeOk) {
    why.push(`住所の除外リストが ${files.length} 件になっている: ${files.join(', ')} — ` +
      '除外は abode.js ただ一つである。増やすなら憲法を改めよ (第54条(d))');
  }
  // 錠2 — 除外されるファイルの中身を、門が実測で検める
  const src = read(path.join(repoRoot, 'graph', 'abode.js'));
  const missing = EXCLUSION_EVIDENCE.filter(n => !src.includes(n));
  const granted = src.length > 0 && missing.length === 0;
  if (!granted) {
    why.push(`graph/abode.js は住所の器の資格を欠く (${missing.join(' / ') || 'ファイルが読めない'}) — ` +
      '除外は名前ではなく実質が与える (第54条(a))');
  }
  /**
   * 錠3 — 除外の中でも上限を置く。走るコードの中の呼び出しだけを数える
   * (`codeOnly()` が註釈と文字列を落とす)。
   */
  const homedirCount = (codeOnly(src).match(/\bos\.homedir\s*\(/g) || []).length;
  const countOk = !granted || homedirCount === ABODE_HOMEDIR_MAX;
  if (!countOk) {
    why.push(`graph/abode.js の中に os.homedir() が ${homedirCount} 箇所ある — ` +
      `住所を作る場所が器の中で分裂している (上限 ${ABODE_HOMEDIR_MAX})`);
  }
  return { files, size: files.length, sizeOk, granted, missing, homedirCount, countOk, ok: sizeOk && granted && countOk, why };
}

/** 除外を与えてよい道か。名前だけを真似た `tools/abode.js` には与えない。 */
function isExcluded(rel, audit) {
  if (!audit.granted) return false;                       // 錠2: 資格の無い除外は与えない
  if (!audit.sizeOk) return false;                        // 錠1: 水増しされた除外は全て無効
  return [...HOMEDIR_EXCLUDE_FILES].some(f => rel === 'graph/' + f);
}

/**
 * 生産コード中の住所の直書きを走査する(第一段)。**必ず行を名指す** ——
 * 名指ししない門は、赤くなっても直せない。
 * @returns {{file:string, line:number, text:string, why:string}[]}
 */
function homedirRefs(repoRoot = REPO_ROOT) {
  const audit = exclusionAudit(repoRoot);
  const out = [];
  for (const rel of scanTargets(repoRoot)) {
    if (isExcluded(rel, audit)) continue;
    const src = read(path.join(repoRoot, rel));
    if (!src) continue;
    src.split('\n').forEach((line, i) => {
      const t = line.trim();
      // 註釈は道を説明してよい。咎めるのは実際に走るコードの中の住所だけ。
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
      for (const p of HOMEDIR_PATTERNS) {
        if (p.re.test(line)) { out.push({ file: rel, line: i + 1, text: t.slice(0, 100), why: p.why }); return; }
      }
    });
  }
  return out;
}

// ══════════════════════════════════════════════════════════════════════
// 第三段の静的側 — 器が己に課す禁則 (AC-55 / AC-56)
// ══════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════
// 静かな緑 — 黙って早期に return する門を名指す (第58条(e) / AC-43 / AC-44)
// ══════════════════════════════════════════════════════════════════════

/**
 * **黙って早期に return する門は、`N skipped` にすら数えられない。**
 * 門が死んだことに誰も気づけない(第37条)。
 *
 * 実測されたベースライン(design.md §5.2.2 / 本改革の着手時に採り直した):
 *
 *     $ grep -nE "existsSync\([^)]*\)\) return" tests/*.js      → 7 hit (うち 1 は文字列)
 *     $ grep -nE "if \(\w+\.skipped\) return" tests/*.js        → 6 hit
 *
 * どちらも「前提が無いので検めなかった」を**緑として集計に載せる**形である。
 * 処置は `return` を消すことではない —— 検められない走行は実在する。
 * **口で名乗ること**だけが要件である: `skip('<理由>')`。
 *
 * ⚠️ 走査は `codeOnly()` を通す。この門が裁く病の名を、試験は
 * **変異注入の文字列リテラル**として持つ正当な理由がある
 * (`tests/paradise.test.js` の E5 変異が実際にそれである)。
 * 註釈と文字列を落とさなければ、**病を説明した罰**を与えることになる。
 */
const SILENT_GREEN_PATTERNS = [
  { re: /\bexistsSync\s*\(/, why: '住処/派生物の不在で黙って return している' },
  { re: /\.skipped\b/, why: 'engine が skip を返したことを黙って return で受けている' },
];

/** 走査対象。`tests/` 直下の .js —— 門も、門を守る門も、等しく掛かる。 */
function silentGreenTargets(repoRoot = REPO_ROOT) {
  let names = [];
  try { names = fs.readdirSync(path.join(repoRoot, 'tests')); } catch { names = []; }
  return names.sort().filter(n => n.endsWith('.js')).map(n => 'tests/' + n);
}

/**
 * 黙った早期 return を名指す。
 * @returns {{file:string, line:number, text:string, why:string}[]}
 */
function silentGreens(repoRoot = REPO_ROOT) {
  const out = [];
  for (const rel of silentGreenTargets(repoRoot)) {
    const raw = read(path.join(repoRoot, rel));
    if (!raw) continue;
    const code = codeOnly(raw).split('\n');
    const orig = raw.split('\n');
    code.forEach((line, i) => {
      // `return;` / `return out;` — 値を返す return も、門の本体からの離脱なら同じ病。
      if (!/\breturn\b[^;]{0,40};/.test(line)) return;
      if (!/\bif\s*\(/.test(line)) return;                 // 無条件の return は関数の終いである
      for (const p of SILENT_GREEN_PATTERNS) {
        if (!p.re.test(line)) continue;
        out.push({ file: rel, line: i + 1, text: (orig[i] || line).trim().slice(0, 110), why: p.why });
        return;
      }
    });
  }
  return out;
}

// ══════════════════════════════════════════════════════════════════════
// 対称性 — 兄弟の engine が同じ口から住所を得ているか (AC-20)
// ══════════════════════════════════════════════════════════════════════

/**
 * `apply-models` と `apply-spawn` は同じ物(神官の住処)を見る兄弟である。
 * 片方が `PARADISE_AGENTS` を見て他方が `CLAUDE_HOME` だけを見ていた頃、
 * **同じ倉について二つの engine が別の答えを持っていた**(discovery 障害物9)。
 *
 * 住所を作れる場所が一つでも、**引き方が二本なら答えは割れる**
 * (work-1 が check-agents で実測した教訓と同型)。ゆえに式そのものを突き合わせる。
 */
const SYMMETRY_PAIR = [
  { file: 'graph/apply-models.js', re: /\bAGENT_DIR\s*=\s*(.+?);/ },
  { file: 'graph/apply-spawn.js', re: /\bAGENTS_DIR\s*=\s*(.+?);/ },
];

/** 式を正規化する。`() =>` の有無と空白は同一性の本質ではない。 */
function normalizeExpr(s) {
  return String(s).replace(/^\s*\(\s*\)\s*=>\s*/, '').replace(/\s+/g, ' ').trim();
}

/**
 * @returns {{ok:boolean, rows:{file:string, expr:string|null}[], why:string[]}}
 */
function symmetryAudit(repoRoot = REPO_ROOT) {
  const rows = [];
  const why = [];
  for (const s of SYMMETRY_PAIR) {
    const src = codeOnly(read(path.join(repoRoot, s.file)));
    const m = src.match(s.re);
    rows.push({ file: s.file, expr: m ? normalizeExpr(m[1]) : null });
    if (!m) why.push(`${s.file} に神官の住処を決める式が見つからない — 対称性を測れない (第16条)`);
  }
  if (rows.every(r => r.expr) && rows[0].expr !== rows[1].expr) {
    why.push('神官の住処を、兄弟の engine が別の式で引いている (AC-20):\n' +
      rows.map(r => `      ${r.file}  ${r.expr}`).join('\n'));
  }
  return { ok: why.length === 0, rows, why };
}

/**
 * `abode.js` 自身のソースを検める。
 *  (1) 台帳へ**書く**口を持っていないか(第54条(d) / AC-56)
 *  (2) `globalWrite` が mode を見て輸出を分岐していないか(AC-55)
 * @returns {{file:string, line:number, text:string, why:string}[]}
 */
function selfAudit(repoRoot = REPO_ROOT) {
  const rel = 'graph/abode.js';
  const src = read(path.join(repoRoot, rel));
  const out = [];
  if (!src) return out;
  const lines = src.split('\n');

  // (1) 台帳へ書く口。engine が台帳を育てられるなら、それは自己申告である。
  const WRITE_RES = [
    { re: /(writeFileSync|appendFileSync|createWriteStream)\s*\(\s*LEDGER\b/, why: '台帳へ書く口を engine が持ってはならない (第54条(d))' },
    { re: /(writeFileSync|appendFileSync)\s*\([^)]*abode\.json/, why: '台帳へ書く口を engine が持ってはならない (第54条(d))' },
    { re: /['"`]add-export['"`]|function\s+addExport\b/, why: '台帳へ追記する口を engine が持ってはならない (第54条(d))' },
  ];
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
    for (const w of WRITE_RES) {
      if (w.re.test(line)) { out.push({ file: rel, line: i + 1, text: t.slice(0, 100), why: w.why }); return; }
    }
  });

  // (2) globalWrite が mode を参照していないか。関数の本体だけを切り出して見る ——
  //     ファイル全体を見れば resolve() の mode に当たって永久に赤くなる。
  const start = lines.findIndex(l => /^function globalWrite\s*\(/.test(l));
  if (start >= 0) {
    let depth = 0, end = start;
    for (let i = start; i < lines.length; i++) {
      depth += (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length;
      if (i > start && depth <= 0) { end = i; break; }
      end = i;
    }
    for (let i = start; i <= end; i++) {
      const t = lines[i].trim();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
      if (/\bmode\s*\(|\.mode\b|DEFAULT_MODE\b/.test(lines[i])) {
        out.push({ file: rel, line: i + 1, text: t.slice(0, 100),
          why: 'globalWrite が mode を見ている — global は「台帳を迂回する」意味を持たない (AC-55)' });
      }
    }
  }
  return out;
}

// ══════════════════════════════════════════════════════════════════════
// check — 三段構えを束ねる
// ══════════════════════════════════════════════════════════════════════

/**
 * @param {{repoRoot?:string, count?:boolean, ledger?:boolean, exclusion?:boolean,
 *   silentGreen?:boolean, symmetry?:boolean, hermetic?:boolean}} [opts]
 * @returns {{ok:boolean, exclusion:object, homedir:object[], ledger:object[], self:object[],
 *   silentGreen:object[], symmetry:object, hermetic:object|null}}
 */
function check(opts = {}) {
  const repoRoot = opts.repoRoot || REPO_ROOT;
  const all = !(opts.count || opts.ledger || opts.exclusion || opts.silentGreen ||
                opts.symmetry || opts.hermetic);
  const r = { exclusion: exclusionAudit(repoRoot), homedir: [], ledger: [], self: [],
              silentGreen: [], symmetry: { ok: true, rows: [], why: [] }, hermetic: null, ok: true };
  if (all || opts.count || opts.exclusion) r.homedir = homedirRefs(repoRoot);
  if (all || opts.ledger) {
    r.ledger = validateLedger(ledger(opts.ledgerFile ? { file: opts.ledgerFile } : {}), repoRoot);
    r.self = selfAudit(repoRoot);
  }
  if (all || opts.silentGreen) r.silentGreen = silentGreens(repoRoot);
  if (all || opts.symmetry) r.symmetry = symmetryAudit(repoRoot);
  /**
   * 密閉は `graph/hermetic.js` が裁く(work-7 で建った)。**ここで作法を二重に書かない** ——
   * 同じ問いに二つの答えを持てば、いつか食い違う(第29条)。この旗は委譲の口である。
   *
   * ⚠️ `hermetic.js` は**自分の倉**(`ROOT`)しか走査しない。偽の倉(門が作る作り物)に
   * 対する `--hermetic` は「検められなかった」であって緑ではない。
   * **黙って飛ばさず、理由を名乗って skip する**(第58条(e) / §1.4)。
   */
  if (all || opts.hermetic) {
    if (path.resolve(repoRoot) !== REPO_ROOT) {
      r.hermeticSkipped = `--hermetic は楽園の現物の倉でしか測れない (与えられた倉: ${repoRoot}) — ` +
        'hermetic.js は自分の倉を走査する';
    } else {
      r.hermetic = require('./hermetic.js').audit();
    }
  }
  r.ok = r.exclusion.ok && r.homedir.length === 0 && r.ledger.length === 0 && r.self.length === 0 &&
         r.silentGreen.length === 0 && r.symmetry.ok && (r.hermetic === null || r.hermetic.ok);
  return r;
}

// ══════════════════════════════════════════════════════════════════════
// 移設 — KG と日次台帳を「移す」のであって「消す」のではない (AC-9〜AC-12)
// ══════════════════════════════════════════════════════════════════════

/**
 * 移設の対象。**住所はここで作らない** —— `resolve()` が答えた二つの住処から引く。
 *
 * `kind` の別は照合の仕方を決める:
 *  - `jsonl` … 1 行 1 記憶。**行数**と**各行の sha256 の多重集合**で照合する。
 *              行の順序は照合の本質ではない(追記の競合で入れ替わりうる)が、
 *              **重複は数える** —— 同じ記憶が二度在るのは一度在るのと違う。
 *  - `file`  … 1 本のファイル。空でない行数と**全文の sha256** で照合する。
 */
const MIGRATE_TARGETS = [
  { key: 'kg', name: 'nodes.jsonl', kind: 'jsonl', why: '記憶の節点 (kg.js remember)' },
  { key: 'kg', name: 'edges.jsonl', kind: 'jsonl', why: '記憶の辺 (kg.js link)' },
  { key: 'kg', name: 'cochange.jsonl', kind: 'jsonl', why: '共変の観測 (kg.js observe)' },
  { key: 'dailyLedger', name: null, kind: 'file', why: '第43条の走行権を握る日次台帳' },
];

function sha256(buf) { return require('crypto').createHash('sha256').update(buf).digest('hex'); }

/**
 * 一つの現物を測る。**不在は 0 ではない — null である**(第16条 / 第37条)。
 * @returns {{exists:boolean, lines:number|null, shas:string[]|null, sha:string|null}}
 */
function measureFile(p, kind) {
  let raw;
  try { raw = fs.readFileSync(p, 'utf8'); }
  catch { return { exists: false, lines: null, shas: null, sha: null }; }
  const lines = raw.split('\n').filter(l => l.trim() !== '');
  return {
    exists: true,
    lines: lines.length,
    // 行末の CR は改行の方言であって中身ではない(deploy.js が既に同じ裁定を持つ)
    shas: kind === 'jsonl' ? lines.map(l => sha256(l.replace(/\r$/, ''))).sort() : null,
    sha: sha256(raw.replace(/\r\n/g, '\n')),
  };
}

/**
 * 移設元(外を向いた住処)と移設先(リポジトリ内の住処)を一度に解く。
 *
 * ⚠️ **個別 env(`PARADISE_KG` / `PARADISE_DAILY_LEDGER`)は両側に等しく掛かる。**
 * 掛かれば移設元と移設先が同じ住所になり、照合は「自分と自分を比べて緑」になる。
 * **それは検めたことにならない**(第37条)。ゆえに住所が同じなら exit 2 で拒む。
 * @param {{env?:object, repoRoot?:string, from?:object, to?:object}} [opts]
 */
function migrateSides(opts = {}) {
  const env = opts.env || process.env;
  const base = { repoRoot: opts.repoRoot };
  const from = opts.from || resolve({ ...base, env: { ...env, PARADISE_ABODE: 'global' } });
  const to = opts.to || resolve({ ...base, env: { ...env, PARADISE_ABODE: 'repo' } });
  for (const k of ['kg', 'dailyLedger']) {
    if (path.resolve(from[k]) === path.resolve(to[k])) {
      throw unmeasurable(
        `移設元と移設先の ${k} が同じ住所である: ${from[k]} — ` +
        '自分と自分を比べれば必ず緑になる。個別 env が両側に掛かっていないか検めよ');
    }
  }
  return { from, to };
}

/** 移設の一行分の道を組む。 */
function migrateRows(sides) {
  return MIGRATE_TARGETS.map(t => {
    const fromPath = t.name ? path.join(sides.from[t.key], t.name) : sides.from[t.key];
    const toPath = t.name ? path.join(sides.to[t.key], t.name) : sides.to[t.key];
    return { file: t.name || path.basename(toPath), kind: t.kind, why: t.why, fromPath, toPath };
  });
}

/**
 * 移設の計画。**印字するだけ。`--write` は存在しない**(§1.5 / 第58条)。
 * 住所を知る者と、書く者を分ける —— 実際に動かすのは `kg.js` / `daily-guard.js` の
 * 既存の口、あるいは計画が印字する 1 命令である。
 * @returns {{from:object, to:object, rows:object[], pending:number}}
 */
function migratePlan(opts = {}) {
  const sides = migrateSides(opts);
  const rows = migrateRows(sides).map(r => {
    const a = measureFile(r.fromPath, r.kind);
    const b = measureFile(r.toPath, r.kind);
    return {
      ...r,
      from: a.lines, to: b.lines,
      state: !a.exists ? 'no-source' : !b.exists ? 'pending'
        : (a.lines === b.lines && sameContent(a, b, r.kind)) ? 'done' : 'differs',
    };
  });
  return { from: sides.from, to: sides.to, rows, pending: rows.filter(r => r.state !== 'done').length };
}

function sameContent(a, b, kind) {
  if (!a.exists || !b.exists) return false;
  if (kind === 'jsonl') {
    if (a.shas.length !== b.shas.length) return false;
    return a.shas.every((s, i) => s === b.shas[i]);
  }
  return a.sha === b.sha;
}

/**
 * 移設が完全かを検める(AC-9 / AC-10)。
 *
 * **「移した」という自己申告では通らない。** 行数と sha256 の多重集合の両方が
 * 一致して初めて緑である。片方だけの一致は偶然でありうる。
 *
 * @param {{env?:object, repoRoot?:string, from?:object, to?:object}} [opts]
 * @returns {{ok:boolean, rows:{file:string, from:number|null, to:number|null, sha:boolean|null, why:string|null}[],
 *            unmeasurable:string[]}}
 */
function migrateVerify(opts = {}) {
  const sides = migrateSides(opts);
  const unmeasurable = [];
  const rows = migrateRows(sides).map(r => {
    const a = measureFile(r.fromPath, r.kind);
    const b = measureFile(r.toPath, r.kind);
    const row = { file: r.file, from: a.lines, to: b.lines, sha: null, why: null,
                  fromPath: r.fromPath, toPath: r.toPath };
    if (!a.exists) {
      // **移設元が無ければ、何と照合すればよいか判らない。** 0 と比べて緑にしない。
      row.why = `移設元が無い: ${r.fromPath} — 照合の基点が無いことは「違反が無い」ではない (第37条)`;
      unmeasurable.push(`${r.file}: ${row.why}`);
      return row;
    }
    if (!b.exists) {
      // **移設が済んでいない。これは赤である**(AC-10)。
      row.sha = false;
      row.why = `${r.file}: ${a.lines} 期待 / 移設先が無い (${r.toPath})`;
      return row;
    }
    row.sha = sameContent(a, b, r.kind);
    if (a.lines !== b.lines) row.why = `${r.file}: ${a.lines} 期待 / ${b.lines} 実測 — 行数が一致しない`;
    else if (!row.sha) row.why = `${r.file}: 行数は ${a.lines} で一致するが sha256 の集合が違う — 中身が別物である`;
    return row;
  });
  return { ok: unmeasurable.length === 0 && rows.every(r => r.sha === true), rows, unmeasurable };
}

// ── CLI ───────────────────────────────────────────────────────────────

function printResolve(rest) {
  const r = resolve();
  if (rest.includes('--json')) { console.log(JSON.stringify(r, null, 2)); return 0; }
  console.log(`mode=${r.mode} (source=${r.source})`);
  for (const k of KEYS) console.log(`  ${k.padEnd(15)} ${r[k]}`);
  for (const o of r.overrides) console.log(`  · 個別 env が上書き: ${o.env} → ${o.key} = ${o.value}`);
  console.log(`  exists: abode=${r.exists.abode} settings=${r.exists.settings} agents=${r.exists.agents} kg=${r.exists.kg}`);
  return 0;
}

function printExports(rest) {
  const L = ledger();
  const wantExternal = rest.includes('--external');
  const vi = rest.indexOf('--verify');
  if (vi >= 0) {
    const id = rest[vi + 1];
    if (!id) throw unmeasurable('--verify には id が要る: node graph/abode.js exports --verify EX-1');
    const e = exportFor(id);
    if (!e) { console.log(`✗ ${id} は台帳に無い`); return 1; }
    console.log(`${e.id}  ${e.target}`);
    console.log(`  照合の道: ${e.verify}`);
    const v = verifyExport(id);          // 道を持たない id はここで throw → exit 2
    if (v.skipped) { console.log(`  · skip: ${v.skipped}`); return 0; }
    console.log(`  実機: ${v.path}`);
    if (v.counts) console.log(`  permissions deny ${v.counts.deny} / ask ${v.counts.ask} / allow ${v.counts.allow}`);
    if (v.ok) { console.log('  ✓ 輸出は実機で生きている — POLICY と完全一致'); return 0; }
    console.log(`✗ 輸出が腐っている (${v.why.length} 件)`);
    for (const w of v.why) console.log(`  ${w}`);
    console.log('  → node graph/apply-guards.js apply');
    return 1;
  }
  const rows = wantExternal ? L.external : L.exports;
  const kindJa = wantExternal ? '外部資産 (楽園は読むだけ)' : '輸出 (神が名指した宛先)';
  console.log(`═══ 📜 ABODE LEDGER — ${kindJa} ═══`);
  console.log(`  台帳: ${path.relative(REPO_ROOT, L.path).split(path.sep).join('/')}  件数 ${rows.length}`);
  for (const e of rows) {
    console.log('');
    console.log(`  ${e.id}  ${e.target}`);
    console.log(`     kind   : ${e.kind}   scope: ${e.scope}`);
    if (!wantExternal) console.log(`     writer : ${e.writer}`);
    console.log(`     名指し : ${e.ordainedBy} / ${e.ordainedOn} / ${e.ordainedVia}`);
    console.log(`     reason : ${e.reason}`);
    console.log(`     verify : ${e.verify}`);
  }
  if (!wantExternal && L.closed.length) {
    console.log('');
    console.log(`  ── 閉じた問い (${L.closed.length} 件) ── 散文に書けば腐る。台帳に残せば機械が答えを持つ`);
    for (const c of L.closed) {
      console.log(`  ${c.id}  ${c.subject}`);
      console.log(`     裁定 : ${c.verdict} (${c.closedOn} / ${c.closedBy})`);
      console.log(`     根拠 : ${c.evidence}`);
    }
  }
  console.log('═══════════════════════════════════════');
  return 0;
}

/**
 * `check` が知る旗。**知らない旗は黙って捨ててはならない。**
 *
 * 実測された病(本改革の第3段の着手時):`abode.js check --silent-green` は
 * **旗を一つも知らないまま exit 0 を返していた** —— `rest.includes(...)` の三つに
 * 当たらない旗は捨てられ、「旗が無い」ことにされ、`--all` が走り、緑が出た。
 * すなわち**検めていないものを「検めて違反が無かった」と答えていた**。
 * これは第37条の正面違反であり、この器が診断している病そのものである。
 */
const CHECK_FLAGS = {
  '--count': 'count', '--ledger': 'ledger', '--exclusion': 'exclusion',
  '--silent-green': 'silentGreen', '--symmetry': 'symmetry', '--hermetic': 'hermetic',
  '--all': 'all',
};

function printCheck(rest) {
  const opts = {};
  for (const a of rest) {
    const key = CHECK_FLAGS[a];
    // **未知の旗は exit 2。** 「検められなかった」を 0 に混ぜない(§1.4)。
    if (!key) throw unmeasurable(`check の知らない旗: ${a} — 知る旗は ${Object.keys(CHECK_FLAGS).join(' / ')}。` +
      '知らない旗を黙って捨てて緑を返す門は、測らずに答えている(第37条)');
    if (key !== 'all') opts[key] = true;
  }
  const r = check(opts);
  console.log('═══ 🏠 ABODE CHECK (第58条) ═══');
  // **除外を適用したなら必ず口で名乗る**(第54条(c))。この行が出ない check は、
  // 除外を黙って適用している。
  console.log(`  · 除外 ${r.exclusion.size} 件: ${r.exclusion.files.map(f => 'graph/' + f).join(', ')} ` +
    `(住所を作るのが職務 / 資格の裏付け: ${r.exclusion.granted ? EXCLUSION_EVIDENCE.join('+') + ' を輸出している' : '無し'} ` +
    `/ homedir 呼び出し ${r.exclusion.homedirCount} 箇所)`);
  for (const w of r.exclusion.why) console.log(`  ✗ ${w}`);
  if (r.homedir.length) {
    console.log(`✗ 楽園の住所を直に作っている engine (${r.homedir.length} 件) — abode.js を通せ`);
    for (const h of r.homedir) {
      console.log(`  ${h.file}:${h.line}  ${h.text}`);
      console.log(`     ${h.why}`);
    }
  }
  if (r.ledger.length) {
    console.log(`✗ 台帳の実質が無い (${r.ledger.length} 件)`);
    for (const f of r.ledger) console.log(`  ${String(f.id).padEnd(6)} ${String(f.field).padEnd(12)}: ${f.why}`);
    console.log('  → 台帳は在ることが資格ではない (第54条(b))');
  }
  if (r.self.length) {
    console.log(`✗ 器が己に課した禁則を破っている (${r.self.length} 件)`);
    for (const s of r.self) console.log(`  ${s.file}:${s.line}  ${s.text}\n     ${s.why}`);
  }
  if (r.silentGreen.length) {
    console.log(`✗ 黙って早期に return する門 (${r.silentGreen.length} 件) — skip() を使え`);
    for (const s of r.silentGreen) {
      console.log(`  ${s.file}:${s.line}  ${s.text}`);
      console.log(`     ${s.why} — 黙った return は N skipped に数えられない (第37条)`);
    }
  }
  for (const w of r.symmetry.why) console.log(`✗ ${w}`);
  if (r.hermeticSkipped) console.log(`  · skip: ${r.hermeticSkipped}`);
  if (r.hermetic && !r.hermetic.ok) {
    console.log(`✗ 門が己の測る対象を汚している (${r.hermetic.violations.length} 件) — 第58条(c)`);
    for (const h of r.hermetic.violations) console.log(`  ${h.file}:${h.line}  ${h.obj}.${h.fn}(${h.arg})`);
    console.log('  → 詳しくは node graph/hermetic.js check');
  }
  if (r.ok) {
    console.log('  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない');
    console.log('  ✓ 門は黙って緑に落ちず、兄弟の engine は同じ口から住所を得ている');
  }
  console.log('═══════════════════════════════');
  return r.ok ? 0 : 1;
}

/**
 * `migrate` の CLI。**`--write` は存在しない**(§1.5 / 第58条: 住所を知る者と書く者を分ける)。
 * exit code は §1.4 の三値: 0=検めて違反無し / 1=検めて違反在り / 2=検められなかった。
 */
function printMigrate(rest) {
  const wantPlan = rest.includes('--plan');
  const wantVerify = rest.includes('--verify');
  for (const a of rest) {
    if (a !== '--plan' && a !== '--verify') {
      throw unmeasurable(`migrate の知らない旗: ${a} — 知る旗は --plan / --verify。` +
        '**migrate は --write を持たない**: 住所を知る器は書かない(§1.5)。' +
        '実際に動かすのは kg.js / daily-guard.js の既存の口である');
    }
  }
  if (wantPlan === wantVerify) {
    throw unmeasurable('migrate には --plan か --verify のどちらか一方が要る — ' +
      '旗の無い migrate が何をするかは決まっていない(第16条)');
  }

  if (wantPlan) {
    const p = migratePlan();
    console.log('═══ 📦 ABODE MIGRATE — 計画 (印字のみ / --write は存在しない) ═══');
    console.log(`  移設元 (global): kg=${p.from.kg}`);
    console.log(`                   daily=${p.from.dailyLedger}`);
    console.log(`  移設先 (repo)  : kg=${p.to.kg}`);
    console.log(`                   daily=${p.to.dailyLedger}`);
    console.log('');
    const JA = { done: '✓ 移設済み', pending: '→ 未移設', differs: '✗ 中身が食い違う', 'no-source': '· 移設元が無い' };
    for (const r of p.rows) {
      console.log(`  ${JA[r.state].padEnd(14)} ${r.file.padEnd(18)} ` +
        `${r.from === null ? '(元 無し)' : r.from + ' 行'} → ${r.to === null ? '(先 無し)' : r.to + ' 行'}`);
      console.log(`     ${r.why}`);
      console.log(`     ${r.fromPath}`);
      console.log(`     ${r.toPath}`);
    }
    console.log('');
    if (p.pending === 0) {
      console.log('  ✓ 移設は既に済んでいる — node graph/abode.js migrate --verify で照合せよ');
    } else {
      console.log(`  ${p.pending} 件が未了。**この器は書かない。** 実際に動かす命令(写して走らせよ):`);
      console.log('');
      for (const r of p.rows) {
        if (r.state === 'done' || r.state === 'no-source') continue;
        console.log(`    mkdir -p "${path.dirname(r.toPath)}" && cp "${r.fromPath}" "${r.toPath}"`);
      }
      console.log('');
      console.log('  ⚠️ **元は消さない。** 移設は「写して検める」までであり、');
      console.log('     神の ~/.claude から元を引き上げるのは第6段(撤収)の仕事である。');
      console.log('  その後: node graph/abode.js migrate --verify');
    }
    console.log('═══════════════════════════════════════');
    return 0;
  }

  const v = migrateVerify();
  console.log('═══ 📦 ABODE MIGRATE — 照合 (AC-9 / AC-10) ═══');
  for (const r of v.rows) {
    const mark = r.sha === true ? '✓' : r.sha === false ? '✗' : '·';
    console.log(`  ${mark} ${r.file.padEnd(18)} ${r.from === null ? '(元 無し)' : r.from + ' 行'} → ` +
      `${r.to === null ? '(先 無し)' : r.to + ' 行'}  sha256 集合の一致: ${r.sha === null ? '検められず' : r.sha}`);
    if (r.why) console.log(`     ${r.why}`);
  }
  if (v.unmeasurable.length) {
    // **「検められなかった」を 0 にも 1 にも混ぜない**(§1.4 / 第37条)。
    console.log(`✗ 検められなかった (${v.unmeasurable.length} 件) — 移設元が無ければ照合の基点が無い`);
    console.log('═══════════════════════════════════════');
    return 2;
  }
  if (v.ok) console.log('  ✓ 行数と sha256 の集合が一致した — 記憶は移り、失われていない');
  else console.log('✗ 移設が不完全である — 「移した」という自己申告では通らない (AC-10)');
  console.log('═══════════════════════════════════════');
  return v.ok ? 0 : 1;
}

function main(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === 'resolve') return printResolve(rest);
  if (cmd === 'path') {
    const key = rest[0];
    if (!key) throw unmeasurable(`path には鍵が要る: ${KEYS.join(' / ')}`);
    console.log(pathFor(key));
    return 0;
  }
  if (cmd === 'check') return printCheck(rest);
  if (cmd === 'exports') return printExports(rest);
  if (cmd === 'migrate') return printMigrate(rest);
  if (cmd === 'retreat') {
    // **未実装を 0 で返さない。** 「検められなかった」は exit 2 である(第37条)。
    throw unmeasurable('retreat は 第6段 (work-6) で実装する — この段の abode.js は撤収の口を持たない');
  }
  throw unmeasurable('usage: abode.js resolve [--json] | path <key> | ' +
    `check [${Object.keys(CHECK_FLAGS).join('|')}] | ` +
    'exports [--external|--verify <id>] | migrate --plan|--verify | retreat --plan|--verify');
}

/**
 * ⚠️ **`module.exports` は CLI 起動より前に置く。**
 * `verifyExport()` は `apply-guards.js` を遅延 require し、その `apply-guards` は
 * 先頭で `abode.js` を require する。輸出を CLI 起動の後ろに置くと、
 * 自分自身が main のとき **まだ空の exports が兄弟に渡り**、
 * `abode.pathFor is not a function` で落ちる(実測で踏んだ)。
 * 環になる require では、**輸出は入口より先に立てる**。
 */
module.exports = {
  resolve, pathFor, mode, home, ledger, validateLedger, validateEntry,
  exportFor, exportForTarget, globalWrite, callerModule,
  exportRealPath, verifyExport,
  homedirRefs, exclusionAudit, selfAudit, scanTargets, check,
  silentGreens, silentGreenTargets, symmetryAudit, codeOnly,
  migratePlan, migrateVerify, migrateSides, measureFile,
  REPO_ROOT, LEDGER, MODES, DEFAULT_MODE, KEYS, CHECK_FLAGS, MIGRATE_TARGETS,
  HOMEDIR_PATTERNS, HOMEDIR_EXCLUDE_FILES, HOMEDIR_EXCLUDE_MAX,
  SILENT_GREEN_PATTERNS, SYMMETRY_PAIR,
  ABODE_HOMEDIR_MAX, EXCLUSION_EVIDENCE, PLACEHOLDER_RE, REASON_MIN,
};

if (require.main === module) {
  let code = 3;
  try { code = main(process.argv.slice(2)); }
  catch (e) {
    console.error(`✗ ${e.message}`);
    code = typeof e.exitCode === 'number' ? e.exitCode : 3;
  }
  process.exit(code);
}
