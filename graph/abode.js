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
 *                            [--silent-green] [--symmetry] [--hermetic]
 *                            [--creations] [--backrefs] [--all]
 *                                            違反の検出。旗が無ければ --all
 *                                            **知らない旗は exit 2** (黙って捨てない)
 *                                            ⚠️ `--backrefs` は --all に含まれない
 *                                               (撤収前は必ず赤い。撤収完了後に編入 / 台帳 [41])
 *   node graph/abode.js exports [--external] [--verify <id>]
 *                                            台帳の印字と、照合の道の提示
 *   node graph/abode.js migrate --plan | --verify
 *                                            KG / 日次台帳の移設 (計画と照合のみ)
 *                                            **--write は存在しない** —— 住所を知る器は書かない
 *   node graph/abode.js retreat --plan [--freeze] | --verify
 *                                            撤収の計画と照合。**--write は存在しない**。
 *                                            `--freeze` が書くのは**楽園の倉の中**
 *                                            (reform/sovereign-abode/retreat-baseline.json)
 *                                            であって `~/.claude` ではない。
 *                                            実際の撤収は神が計画を読み、名指した後に行う。
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
const DEFAULT_MODE = 'repo';

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
  /**
   * ⚠️ **照合の基準は `global` の掟に固定する**(L-19 / 第6段)。
   * 掟は住処に依るようになった(`policyFor()`): repo の住処では
   * `Edit(**` + `/.claude/**)` が一行足される。だが EX-1 の輸出先は**神の住処**であり、
   * そこに在るべきは **global の掟**である。走らせた側の `PARADISE_ABODE` で
   * 照合の基準が揺れれば、**同じ実機が日によって赤くも緑にもなる**(第37条)。
   */
  const EX1_POLICY = G.policyFor({ mode: 'global' });
  let s = null;
  try { s = JSON.parse(fs.readFileSync(real, 'utf8')); }
  catch (err) { throw unmeasurable(`実機の settings.json を読めない: ${real} — ${err.message}`); }
  const perms = (s && s.permissions) || null;
  if (!perms) why.push('実機に permissions が無い — EX-1 の輸出が消えている');
  else if (!G.permissionsMatch(perms, EX1_POLICY)) {
    for (const kind of ['deny', 'ask', 'allow']) {
      const want = new Set(EX1_POLICY[kind] || []);
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

/**
 * **AC-16 — engine が神のキーを削除する権能を持っていないか**(R-4)。
 *
 * 要件 §R-4: 「撤収と修理は、**台帳に載っていないキーを削除してはならない**」。
 * **前例が実在する** —— `env.PATH` は engine の判断で消された(障害牲16)。
 * 第6段(撤収)は同じ形を engine 全体へ広げる仕事であるから、先に錠を掛ける。
 *
 * この門は `apply-guards.js` の `repairEnv()` の**本体だけ**をソースから切り出し、
 * `delete` が台帳(`REPAIRABLE_ENV_KEYS` / `mayDeleteEnvKey`)の守りの内側に
 * 居るかを検める。
 *
 * **なぜ静的に見るのか**: 振る舞いの門(「台帳外のキーを渡したら残る」)は既に
 * `tests/guards.test.js` が持っている。だが振る舞いの門は**書かれた道**しか撃てない。
 * 「engine が**権能を持っている**」は構造の問題であり、構造は構造で見る。
 *
 * @returns {{file:string, line:number, text:string, why:string}[]}
 */
function envRepairAudit(repoRoot = REPO_ROOT) {
  const rel = 'graph/apply-guards.js';
  const src = read(path.join(repoRoot, rel));
  const out = [];
  if (!src) {
    return [{ file: rel, line: 0, text: '', why: `${rel} を読めない — AC-16 を検められない` }];
  }
  const lines = src.split('\n');

  // 台帳そのものが在るか。無ければ「権能に錠が無い」である。
  if (!/const\s+REPAIRABLE_ENV_KEYS\s*=/.test(src)) {
    out.push({ file: rel, line: 0, text: '',
      why: '削除してよいキーの台帳 (REPAIRABLE_ENV_KEYS) が無い — ' +
           'engine は「何を消してよいか」を宣言せずに消している (AC-16 / R-4)' });
  }
  if (!/function\s+mayDeleteEnvKey\s*\(/.test(src)) {
    out.push({ file: rel, line: 0, text: '',
      why: '台帳を引く述語 (mayDeleteEnvKey) が無い — 台帳が在っても参照されねば飾りである' });
  }

  // `repairEnv()` の本体を切り出して、`delete` が守りの内側に居るかを見る。
  const start = lines.findIndex(l => /^function\s+repairEnv\s*\(/.test(l));
  if (start < 0) {
    out.push({ file: rel, line: 0, text: '', why: 'repairEnv() が見つからない — AC-16 を検められない' });
    return out;
  }
  let depth = 0, end = start;
  for (let i = start; i < lines.length; i++) {
    depth += (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length;
    end = i;
    if (i > start && depth <= 0) break;
  }
  const body = lines.slice(start, end + 1);
  const guarded = body.some(l => /mayDeleteEnvKey\s*\(/.test(l));
  body.forEach((l, i) => {
    const t = l.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
    if (!/\bdelete\s+\w+\s*[[.]/.test(l)) return;
    if (guarded) return;                       // 台帳の守りが本体に在れば、この delete は錠の内側
    out.push({ file: rel, line: start + i + 1, text: t.slice(0, 100),
      why: 'engine が神のキーを削除する権能を持っている — ' +
           'この delete は台帳 (mayDeleteEnvKey) の守りの外に在る。' +
           '削除が要るならそれは**神への提示**であって engine の判断ではない (AC-16 / R-4 / 障害牲16)' });
  });
  return out;
}

// ══════════════════════════════════════════════════════════════════════
// 兄弟倉の神官 — 環が起動する場所に神官が居るか (AC-46〜AC-50 / EX-2)
// ══════════════════════════════════════════════════════════════════════

/**
 * 兄弟倉へ写す物。**EX-2 の `target` が名指した四つだけ**である ——
 * `<creations-root>/.claude/{agents,commands,rules,CLAUDE.md}`。
 *
 * `settings.json` と `paradise-daily.json` は台帳に載っていない。台帳を越えて
 * 検めれば、台帳を越えて書いてよいことになる(第54条(d) の裏返し)。
 */
const CREATIONS_TREES = ['agents', 'commands', 'rules'];
const CREATIONS_FILES = [{ name: 'CLAUDE.md', key: 'claudeMd' }];

function listMd(dir) {
  try { return fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort(); } catch { return null; }
}

/**
 * 兄弟倉の神官の実在を検める(AC-46〜AC-50)。
 *
 * **判定の物差しは「兄弟倉そのものが在るか」である。**
 *  - 兄弟倉の root が**無い**(CI 等) … `skipped` に理由を載せて ok=true(AC-49)。
 *  - 兄弟倉の root は**在る**のに `.claude` が無い / 神官が 0 体 … **赤**(AC-48)。
 *    ここを skip に落とせば、本改革が退治している病(「測れなかった」を「緑」と読む)
 *    そのものを、この門が再演することになる(第37条)。
 *
 * 比較は二重である。**名前集合の 1:1** と、**内容 sha256 の一致**。
 * 名前だけを数える門は、中身をすり替えられても緑を出す(第5条: そう書かれていることではなく、そう鳴ること)。
 *
 * ⚠️ 住所は自分で組まない。`resolve().creationsAbode`(= `workspace.js` 経由 — 第30条)と
 *    `pathFor('agents'|'commands'|'rules'|'claudeMd')` だけを引く。
 *
 * @param {{env?:object, repoRoot?:string}} [opts]
 * @returns {{ok:boolean, skipped:string|null, reason?:string, root:string, abode:string,
 *   counts:object, missing:string[], extra:string[], differs:string[],
 *   tracked:boolean|null, unmeasurable:string[], why:string[]}}
 */
function creationsAbode(opts = {}) {
  const site = resolve(opts);
  // `creationsAbode` は `<root>/.claude` である。root はその親 —— **一つの解決から採る**。
  // 二度引けば「mode は repo と答えたのに住所は global」と割れる(work-1 の教訓)。
  const abodeDir = site.creationsAbode;
  const root = path.dirname(abodeDir);
  const out = {
    ok: true, skipped: null, root, abode: abodeDir,
    counts: { agents: null, commands: null, rules: null, claudeMd: null },
    missing: [], extra: [], differs: [], tracked: null, unmeasurable: [], why: [],
  };

  // ── AC-49: 兄弟倉そのものが無い機。**名乗って** skip する。黙って緑にしない。
  if (!isDir(root)) {
    out.skipped = `creations abode 不在: ${root} — 兄弟倉そのものがこの機に無い(clone していない機では創造物も無い)`;
    out.reason = out.skipped;
    return out;
  }

  // ── AC-48: 兄弟倉は在る。ここから先の不在は全て赤である。
  if (!isDir(abodeDir)) {
    out.ok = false;
    out.why.push(`creations abode: 兄弟倉は在るのに ${abodeDir} が無い — ` +
      'この倉で起動した環は神官を一体も見ない。**不在は skip ではない**(第37条 / AC-48)。' +
      ' node graph/deploy.js --write --creations で配備せよ');
  }

  for (const kind of CREATIONS_TREES) {
    const srcDir = pathFor(kind, opts);
    const dstDir = path.join(abodeDir, kind);
    const src = listMd(srcDir);
    const dst = listMd(dstDir);
    out.counts[kind] = dst === null ? null : dst.length;
    if (src === null) {
      out.unmeasurable.push(`楽園側の ${kind} を読めない: ${srcDir} — 鏡写しの源が無ければ 1:1 は測れない`);
      continue;
    }
    if (dst === null) {
      if (isDir(abodeDir)) {
        out.ok = false;
        out.why.push(`creations abode: ${kind}/ が兄弟倉に無い — 楽園には ${src.length} 本在る (AC-48)`);
      }
      out.missing.push(...src.map(f => `${kind}/${f}`));
      continue;
    }
    if (dst.length === 0) {
      out.ok = false;
      out.why.push(`creations abode: ${kind}/ が空である — 神官が 0 体の倉を緑と呼んではならない (AC-48)`);
    }
    const have = new Set(dst);
    const want = new Set(src);
    for (const f of src) {
      if (!have.has(f)) {
        out.missing.push(`${kind}/${f}`);
        out.ok = false;
        out.why.push(`creations abode: ${kind === 'agents' ? '神官' : kind} が欠けている — ${f.replace(/\.md$/, '')}`);
        continue;
      }
      // 名が在っても中身が違えば、それは同じ神官ではない。
      const a = sha256(fs.readFileSync(path.join(srcDir, f)));
      const b = sha256(fs.readFileSync(path.join(dstDir, f)));
      if (a !== b) {
        out.differs.push(`${kind}/${f}`);
        out.ok = false;
        out.why.push(`creations abode: ${kind}/${f} の中身が楽園と食い違う — ` +
          '名の一致は同一性ではない。node graph/deploy.js --write --creations で鏡写しをやり直せ');
      }
    }
    for (const f of dst) {
      if (want.has(f)) continue;
      out.extra.push(`${kind}/${f}`);
      out.ok = false;
      out.why.push(`creations abode: 楽園に居ない者が ${kind}/ に居る — ${f} (余剰は 1:1 の破れである)`);
    }
  }

  for (const f of CREATIONS_FILES) {
    const src = pathFor(f.key, opts);
    const dst = path.join(abodeDir, f.name);
    if (!isFile(src)) {
      out.unmeasurable.push(`楽園側の ${f.name} が無い: ${src}`);
      continue;
    }
    if (!isFile(dst)) {
      out.counts.claudeMd = false;
      out.missing.push(f.name);
      out.ok = false;
      out.why.push(`creations abode: ${f.name} が兄弟倉に無い — ` +
        '散文の掟を持たない倉で起動した環は、掟を知らないまま働く (AC-46)');
      continue;
    }
    out.counts.claudeMd = true;
    if (sha256(fs.readFileSync(src)) !== sha256(fs.readFileSync(dst))) {
      out.differs.push(f.name);
      out.ok = false;
      out.why.push(`creations abode: ${f.name} の中身が楽園と食い違う`);
    }
  }

  // ── AC-50: 第30条の逆流。創造物の倉が engine の写しを履歴に抱えてはならない。
  const g = spawnGit(root, ['ls-files', '.claude']);
  if (g === null) {
    // **黙って false にしない。** 「追跡していない」と「検められなかった」は違う(第37条)。
    out.tracked = null;
    out.unmeasurable.push(`${root} で git ls-files を走らせられない — ` +
      '兄弟倉が git 倉でないか git が無い。第30条の逆流は**検められなかった**のであって、無いのではない');
  } else {
    const rows = g.split('\n').map(s => s.trim()).filter(Boolean);
    out.tracked = rows.length > 0;
    if (out.tracked) {
      out.ok = false;
      out.why.push(`創造物の倉が engine の写しを追跡している (第30条) — ${rows.length} 件 ` +
        `(例: ${rows.slice(0, 3).join(', ')})。兄弟倉の .gitignore に .claude/ を足せ (AC-50)`);
    }
  }
  return out;
}

/** git を一度だけ叩く薄い口。走らせられなければ **null**(空文字ではない — 第16条)。 */
function spawnGit(cwd, args) {
  try {
    const r = require('child_process').spawnSync('git',
      ['-C', String(cwd).split(path.sep).join('/'), ...args], { encoding: 'utf8' });
    if (r.error || r.status !== 0) return null;
    return String(r.stdout || '');
  } catch { return null; }
}

// ══════════════════════════════════════════════════════════════════════
// check — 三段構えを束ねる
// ══════════════════════════════════════════════════════════════════════

/**
 * @param {{repoRoot?:string, count?:boolean, ledger?:boolean, exclusion?:boolean,
 *   silentGreen?:boolean, symmetry?:boolean, hermetic?:boolean, creations?:boolean}} [opts]
 * @returns {{ok:boolean, exclusion:object, homedir:object[], ledger:object[], self:object[],
 *   silentGreen:object[], symmetry:object, hermetic:object|null, creations:object|null}}
 */
function check(opts = {}) {
  const repoRoot = opts.repoRoot || REPO_ROOT;
  const all = !(opts.count || opts.ledger || opts.exclusion || opts.silentGreen ||
                opts.symmetry || opts.hermetic || opts.creations);
  const r = { exclusion: exclusionAudit(repoRoot), homedir: [], ledger: [], self: [],
              silentGreen: [], symmetry: { ok: true, rows: [], why: [] }, hermetic: null,
              creations: null, backrefs: null, envRepair: [], ok: true };
  if (all || opts.count || opts.exclusion) r.homedir = homedirRefs(repoRoot);
  if (all || opts.ledger) {
    r.ledger = validateLedger(ledger(opts.ledgerFile ? { file: opts.ledgerFile } : {}), repoRoot);
    r.self = selfAudit(repoRoot);
    /**
     * 設計 §4.2 の表の「(第三段の静的側)」の行: `apply-guards.js` の `repairEnv()` が
     * 台帳に無いキーを削除できる状態 → AC-16。**`--all` に含める**(撤収前でも緑でありうる ——
     * これは実機を見る門ではなく、engine の構造を見る門だからである)。
     */
    r.envRepair = envRepairAudit(repoRoot);
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
  /**
   * 兄弟倉の神官(EX-2 / AC-46〜50)。**`--all` に必ず含める。**
   * 旗を立てたときしか走らない門は、誰も旗を立てなくなった日に死ぬ(第44条)。
   */
  if (all || opts.creations) r.creations = creationsAbode(opts);
  /**
   * **逆向き依存(AC-30 / AC-31)。第7段で `--all` へ編入した。**
   *
   * 第6段までは `--all` に含めなかった。撤収前の実機は楽園の絶対パスを握った
   * hook を **6 本持っており**、それは正しかった —— まだ撤収していないのだから。
   * 含めれば CI も自己診断も赤くなり、赤い門は見られなくなり、見られない門は
   * 第57条の禁じ手(閾値の引き下げ)を招く。ゆえに明示の旗にしていた。
   *
   * **申し送りの条件が満たされた**(第7段 / 裁可 1-A・2-A):
   * 汎用 5 本は `~/.claude/scripts/` へ複製して道を向け直し(輸出 EX-3)、
   * 楽園固有の 1 本は `<repo>/.claude/settings.json` の移送先へ移した(AC-32)。
   * 実測: `check --backrefs` が **0 件 / exit 0**。ゆえに編入する ——
   * **旗を立てたときしか走らない門は、誰も旗を立てなくなった日に死ぬ**(第44条)。
   *
   * 実機が無い機(CI)では `backRefs()` が理由を名乗って skip する(第58条(e))ので、
   * 編入しても CI は緑のままである。
   */
  if (all || opts.backrefs) r.backrefs = backRefs(opts);
  r.ok = r.exclusion.ok && r.homedir.length === 0 && r.ledger.length === 0 && r.self.length === 0 &&
         r.envRepair.length === 0 &&
         r.silentGreen.length === 0 && r.symmetry.ok && (r.hermetic === null || r.hermetic.ok) &&
         (r.creations === null || r.creations.ok) &&
         (r.backrefs === null || r.backrefs.skipped !== null || r.backrefs.rows.length === 0);
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

// ══════════════════════════════════════════════════════════════════════
// 撤収 — 神のホームから楽園の痕跡を引く「計る器」 (AC-16 / AC-29〜AC-38)
// ══════════════════════════════════════════════════════════════════════

/**
 * ⚠️ **この節は 1 バイトも書かない。** `retreat` は `--write` を持たない(§1.5)。
 * 住所を知る器は書かない —— 実際に撤収するのは神が計画を読み、名指した後である。
 *
 * 神の 5 キー。`~/.claude/settings.json` は神のキーと楽園のキーが**混住**しており、
 * engine は `JSON.stringify(next)` の**全書き戻し**方式である(apply-guards:704 /
 * apply-seat:79 / vendor:126,128)。撤収時に必ず全キーを触る。
 * **前例がある** —— `env.PATH` は engine の判断で消された(障害牲16)。ゆえに照合は必須。
 */
const GOD_KEYS = ['theme', 'language', 'enableWorkflows', 'extraKnownMarketplaces', 'agentPushNotifEnabled'];

/** 楽園が実機の settings.json に書いたキー(EX-1 の `permissions` を除く)。 */
const PARADISE_SETTINGS_KEYS = ['model', 'effortLevel'];

/**
 * 凍結の在り処。**数はここが持つ。散文は在り処だけを指す**(第22条)。
 *
 * 起草時、design.md と requirements.md は神 5 キーの sha256 を
 * **散文に書き写していた**。第6段で実測したところ
 * どの正準化の流儀からも再現できず(8 通り試行)、起草時のプローブは倉にも
 * git 履歴にも存在しなかった。**散文に書いた数は正典ではない。**
 * 固定値を門に直書きすれば、外れた瞬間から門は永久に赤く、
 * 次に来る者は必ず閾値を緩めたくなる(第57条の禁じ手への誘惑)。
 */
const RETREAT_BASELINE = path.join(REPO_ROOT, 'reform', 'sovereign-abode', 'retreat-baseline.json');

/**
 * 不可侵名簿(要件 §9.1 の表)。**撤収は絶対にこれらへ触れない。**
 * `kind`: `dir` はディレクトリ(三つ組で照合) / `file` は 1 本のファイル。
 *
 * ディレクトリを毎回ハッシュしない理由: `projects/` は 28M、`plugins/` は 7.3M である。
 * 撤収のたびに全ハッシュを採れば門が実用に耐えない。ゆえに
 * **(ファイル数, 合計バイト, 最新 mtime) の三つ組**で照合する。
 *
 * ⚠️ **`volatile` の意味と、なぜ必要か(実測に基づく裁定)**:
 * 名簿の多くは **Claude Code 自身が常時書いている**。`sessions/` は走行のたびに増え、
 * `.credentials.json` はトークンの更新で書き換わり、`backups/` は自動退避で増える。
 * これらに三つ組の**完全一致**を課せば、凍結の 30 秒後に門が赤くなる ——
 * そして赤い門は見られなくなり、見られない門は第57条の禁じ手(閾値の引き下げ)を招く。
 *
 * ゆえに `volatile` な項目は**「減った/消えた」だけを赤**とする。根拠:
 * **撤収は壊す手であって作る手ではない。** 撤収が起こしうる害は「失われる」ことだけである。
 * 増えたことは神と Claude Code の日常であり、撤収の害ではない。
 * (**ただし黙らない** —— 増減は照合の出力に必ず印字する。第54条(c))
 *
 * `volatile` でない項目(`plugins/` / 原初設定の退避 / `skills/pr-review`)は
 * **三つ組の完全一致**を課す。これらは日常では 1 バイトも動かない。
 */
const SANCTUARY = [
  { rel: '.credentials.json', kind: 'file', volatile: true, why: 'Claude Code の認証。触れば神はログインを失う (トークン更新で書き換わる)' },
  { rel: '.credentials.lock', kind: 'file', volatile: true, why: 'Claude Code の認証ロック', optional: true },
  { rel: 'projects', kind: 'dir', volatile: true, why: 'セッション履歴の本体 (28M) — Claude Code の資産であって楽園の物ではない' },
  { rel: 'plugins', kind: 'dir', why: '神の私物 (marketplace / 7.3M)。日常では 1 バイトも動かない' },
  { rel: 'sessions', kind: 'dir', volatile: true, why: 'Claude Code のセッション記録 (走行のたびに増える)' },
  { rel: 'session-env', kind: 'dir', volatile: true, why: 'Claude Code のセッション環境', optional: true },
  { rel: 'shell-snapshots', kind: 'dir', volatile: true, why: 'Claude Code のシェル断面', optional: true },
  { rel: 'history.jsonl', kind: 'file', volatile: true, why: 'Claude Code の履歴', optional: true },
  { rel: 'skills/learned', kind: 'dir', volatile: true, why: '神の私物 — vendor に複製が無い。消えたら二度と戻らない (SessionEnd の hook が書く)' },
  { rel: 'skills/pr-review', kind: 'dir', why: '神の私物 — vendor に複製が無い' },
  { rel: 'skills', kind: 'dir', volatile: true, why: '残り 11 件は帰属未確定 (障害物17 = OUT)。今回は触れない' },
  { rel: 'policy-limits.json', kind: 'file', volatile: true, why: 'Claude Code の制限 (遠隔から更新される)', optional: true },
  { rel: 'remote-settings.json', kind: 'file', volatile: true, why: 'Claude Code の遠隔設定 (遠隔から更新される)', optional: true },
  { rel: 'backups', kind: 'dir', volatile: true, why: 'Claude Code の退避 (自動で増える)', optional: true },
  { rel: 'cache', kind: 'dir', volatile: true, why: 'Claude Code のキャッシュ', optional: true },
  { rel: 'ide', kind: 'dir', volatile: true, why: 'Claude Code の IDE 連携', optional: true },
  { rel: '.last-cleanup', kind: 'file', volatile: true, why: 'Claude Code の内部印', optional: true },
  { rel: 'settings.json.pre-wire.bak', kind: 'file', why: '**神の原初設定の唯一の証拠**。2026-08-28 の退避 — 1 バイトも動いてはならない' },
  { rel: 'settings.json.bak.1787846094', kind: 'file', why: '**神の原初設定の唯一の証拠** — 1 バイトも動いてはならない' },
];

/**
 * 神へ提示する拒否(`refused`)。**「対象外」を黙って対象外にしない**(第54条(c))。
 * 台帳 EX-1 はここに載る —— 「楽園由来だから引く」という機械的判断を台帳が阻む(AC-29)。
 */
function retreatRefusals() {
  const out = SANCTUARY.map(s => ({ what: `~/.claude/${s.rel}`, why: `不可侵名簿: ${s.why}` }));
  const ex1 = exportFor('EX-1');
  if (ex1) {
    out.push({
      what: ex1.target,
      why: `台帳 ${ex1.id} により**残す**。出所は楽園だが守備範囲はマシン全体である — ` +
           `楽園内へ引けば、神が他所の倉で作業した瞬間に force-push が通る。${ex1.reason}`,
    });
  }
  return out;
}

/** ディレクトリの三つ組 (ファイル数, 合計バイト, 最新 mtime)。不在は null(0 ではない)。 */
function dirTriple(dir) {
  if (!isDir(dir)) return null;
  let files = 0, bytes = 0, mtime = 0;
  const walk = (p, depth) => {
    if (depth > 12) return;
    let ents = [];
    try { ents = fs.readdirSync(p, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const q = path.join(p, e.name);
      if (e.isDirectory()) walk(q, depth + 1);
      else {
        try { const st = fs.statSync(q); files++; bytes += st.size; mtime = Math.max(mtime, Math.floor(st.mtimeMs)); }
        catch { /* 読めない一本は数えない —— 数えられないことは後段の三つ組の差で出る */ }
      }
    }
  };
  walk(dir, 0);
  return { files, bytes, mtime };
}

/** 不可侵名簿の一項目を測る。**不在は null** —— 0 と混ぜれば「消えた」と「空」が同じ顔になる。 */
function measureSanctuary(abodeDir, s) {
  const p = path.join(abodeDir, s.rel);
  if (s.kind === 'dir') {
    const t = dirTriple(p);
    return { rel: s.rel, kind: s.kind, why: s.why, optional: !!s.optional, path: p,
             exists: t !== null, triple: t };
  }
  let st = null;
  try { st = fs.statSync(p); } catch { st = null; }
  return { rel: s.rel, kind: s.kind, why: s.why, optional: !!s.optional, path: p,
           exists: !!st && st.isFile(),
           triple: st && st.isFile() ? { files: 1, bytes: st.size, mtime: Math.floor(st.mtimeMs) } : null };
}

/**
 * 実機の settings.json を読む。**この器は書かない。**
 * @param {{env?:object, settingsFile?:string}} [opts] `settingsFile` は門が複製を差す口。
 */
function godSettingsPath(opts = {}) {
  if (opts.settingsFile) return path.resolve(opts.settingsFile);
  const env = opts.env || process.env;
  // `PARADISE_SETTINGS` は既に在る差し替えの口(OVERRIDE_ENV)。門はこれで複製を差す。
  if (String(env.PARADISE_SETTINGS || '').trim()) return path.resolve(String(env.PARADISE_SETTINGS).trim());
  return resolve({ env: { ...env, PARADISE_ABODE: 'global' } }).settings;
}

/**
 * 神 5 キーを抜き出し、**キー名でソートした正準 JSON** とその sha256 を返す。
 *
 * 正準化の流儀を**ここ一箇所に固定する**。凍結と照合が別々の流儀を持てば、
 * 撤収の前後で必ず食い違い、しかも原因が判らない。
 * 流儀: キー名昇順 + `JSON.stringify` の compact(空白なし・末尾改行なし)。
 * @returns {{present:object, missing:string[], canonical:string, sha:string}}
 */
function godSubset(settings) {
  const present = {};
  const missing = [];
  for (const k of GOD_KEYS.slice().sort()) {
    if (settings && Object.prototype.hasOwnProperty.call(settings, k)) present[k] = settings[k];
    else missing.push(k);
  }
  const canonical = JSON.stringify(present);
  return { present, missing, canonical, sha: sha256(canonical) };
}

/** 凍結を読む。無ければ null —— **null は「検められなかった」であって「違反なし」ではない**。 */
function readBaseline(file = RETREAT_BASELINE) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/**
 * 実機 `settings.json` の hooks のうち、**楽園リポジトリの絶対パスを握っている**もの
 * を数え上げる(AC-30 / AC-31)。
 *
 * ⚠️ **第7段で `--all` へ編入した。** 第6段までは撤収前の実機に 6 件在ったので
 * 明示の旗だけで走らせていた。撤収が完遂し 0 件になったので `check()` の既定に入れた ——
 * 旗を立てたときしか走らない門は、誰も旗を立てなくなった日に死ぬ(第44条)。
 * 実機が無い機(CI)では理由を名乗って skip する(第58条(e))。
 *
 * @param {{env?:object, settingsFile?:string, repoRoot?:string}} [opts]
 * @returns {{skipped:string|null, path:string, rows:object[]}}
 */
function backRefs(opts = {}) {
  const repoRoot = path.resolve(opts.repoRoot || REPO_ROOT);
  const file = godSettingsPath(opts);
  if (!isFile(file)) {
    // 実機が無い機(CI)では**名乗って** skip する。黙って緑にしない(第58条(e))。
    return { skipped: `実機の ${file} が無い — 逆向き依存は検められない`, path: file, rows: [] };
  }
  let s = null;
  try { s = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { throw unmeasurable(`実機の settings.json を読めない: ${file} — ${e.message}`); }
  const needle = repoRoot.split(path.sep).join('/').toLowerCase();
  const rows = [];
  for (const [event, groups] of Object.entries((s && s.hooks) || {})) {
    if (!Array.isArray(groups)) continue;
    groups.forEach((g, index) => {
      for (const h of ((g && g.hooks) || [])) {
        const cmd = String((h && h.command) || '');
        if (!cmd.replace(/\\/g, '/').toLowerCase().includes(needle)) continue;
        rows.push({ event, index, matcher: g && g.matcher != null ? String(g.matcher) : '',
                    command: cmd, description: (g && g.description) || '' });
      }
    });
  }
  return { skipped: null, path: file, rows };
}

/**
 * 一本の hook が**楽園固有か汎用か**を、実測で判じる(R-8)。
 *
 * **推測で書かない。** 判定の根拠は「そのスクリプトが何を読み、何処へ書くか」である。
 * 要件 R-8 は「汎用に見える 5 本(vendor 由来)については、撤収計画が一覧を印字して
 * **神の名指しを求める**」と定める。ゆえにこの関数は**裁かない** —— 事実を並べるだけである。
 */
function classifyHook(row, repoRoot = REPO_ROOT) {
  const m = String(row.command).replace(/\\/g, '/').match(/["']?([^"'\s]*\.(?:js|mjs|cjs))["']?/);
  const scriptAbs = m ? m[1] : null;
  const rel = scriptAbs ? path.relative(repoRoot, scriptAbs).split(path.sep).join('/') : null;
  const src = scriptAbs ? read(scriptAbs) : '';
  const vendor = !!rel && rel.startsWith('overlay/vendor/');
  // **楽園の名を実際に呼んでいるか**をソースから測る(在り処ではなく中身で判ずる)。
  const refsParadise = /PARADISE_ROOT|paradiseRoot|graph\/kg\.js|kg-store|楽園/.test(src);
  const touches = [];
  for (const [re, what] of [
    [/getSessionsDir/, '~/.claude/sessions/ を読み書きする'],
    [/getLearnedSkillsDir/, '~/.claude/skills/learned/ を読み書きする'],
    [/getTempDir/, 'os.tmpdir() に数える'],
    [/getClaudeDir/, '~/.claude/ 配下を見る'],
    [/execFileSync|spawnSync|execSync/, '外部命令を起動する'],
  ]) if (re.test(src)) touches.push(what);
  return {
    script: rel, exists: !!scriptAbs && isFile(scriptAbs), vendor,
    paradiseSpecific: refsParadise,
    verdict: refsParadise ? 'paradise-specific' : vendor ? 'vendor-generic' : 'unknown',
    touches,
    basis: !scriptAbs ? 'command からスクリプトの道を読めない — 判定不能'
      : refsParadise ? `ソースが楽園を名指している (${rel})`
      : vendor ? `vendor 由来 (${rel}) / 楽園を一切参照しない`
      : `楽園の倉に住むが vendor ではない (${rel}) / 楽園を参照しない`,
  };
}

/**
 * 神の住処に**実際に住んでいる**楽園の配備物を数え上げる。
 *
 * ⚠️ **`deploy.js` を require しない。** 一度は deploy の `plan()` を遅延 require で
 * 呼んで計画の 58 件を引いたが、**それは環を作る**:
 * `deploy.js` は `upstream.js` を経て `abode.js` を require しているので、
 * `abode → deploy → upstream → abode` の相互依存が生まれる。
 * 実測でそれが図に出た —— `atlas` の結線図で `abode` が 2 段深くなり、
 * 高さが 800 → 1008px に伸び、実ブラウザで字が **5.18px**(床 6px)まで潰れた。
 * **住所を知る器は、住所を使う者に依ってはならない**(第58条: 土台は上に建つ物を知らない)。
 *
 * ⚠️ **註釈の中にも `require` の綴りを書かない。** `wiring.js` は正規表現でソースを
 * 走査して辺を測る —— 註釈に綴れば、**呼んでいないのに辺が在ることになる**(実測で踏んだ)。
 *
 * ゆえに**実機を直に測る**。撤収が知りたいのは「計画に何が在るか」ではなく
 * 「**実機に何が在るか**」である —— 計画に在るだけで実機に無い物は撤収しようがない(第37条)。
 * 木の形は `CREATIONS_TREES` / `CREATIONS_FILES` が既に知っている(EX-2 が使う同じ知識)。
 *
 * **出所との照合は `deploy.js check` の職務である。** ここでその答えを二つ持たない(第29条)。
 * @returns {{kind:string, file:string, dst:string, onDisk:boolean}[]}
 */
function deployedFiles(abodeDir) {
  const out = [];
  for (const kind of CREATIONS_TREES) {
    const dir = path.join(abodeDir, kind);
    for (const f of (listMd(dir) || [])) {
      out.push({ kind, file: f, dst: path.join(dir, f), onDisk: true });
    }
  }
  for (const f of CREATIONS_FILES) {
    const dst = path.join(abodeDir, f.name);
    out.push({ kind: 'root', file: f.name, dst, onDisk: isFile(dst) });
  }
  return out;
}

/**
 * 撤収計画。**`--write` を持たない。計画を印字するだけ**(AC-29 / R-8)。
 *
 * @param {{env?:object, settingsFile?:string, repoRoot?:string, baselineFile?:string}} [opts]
 * @returns {{files:object[], settingsKeys:object, hooks:object[], refused:object[],
 *            god:object, sanctuary:object[], violations:string[]}}
 */
function retreatPlan(opts = {}) {
  const repoRoot = path.resolve(opts.repoRoot || REPO_ROOT);
  const env = opts.env || process.env;
  const violations = [];

  // ── (2) settings.json のキーの帰属 ──────────────────────────────
  const settingsFile = godSettingsPath({ env, settingsFile: opts.settingsFile });
  /**
   * ⚠️ **住処は settings の道から引く。** かつてここは `resolve({PARADISE_ABODE:'global'})`
   * の住処をそのまま使っていた —— すなわち **`settingsFile` で複製を差しても、
   * 不可侵名簿だけは現物 `~/.claude` を測っていた**。門は複製を撃ったつもりで
   * 現物を読み、凍結と照合が別々の機を見て永久に食い違う。
   * **差し替えの口は、全ての測定に等しく掛からねばならない**(第37条 / migrateSides と同じ裁定)。
   */
  const abodeDir = path.dirname(settingsFile);

  // ── (1) 撤収対象のファイル — **実機を直に測る**(deployedFiles の註を見よ)
  const files = deployedFiles(abodeDir);
  const deployNote = null;

  let raw = null;
  try { raw = JSON.parse(fs.readFileSync(settingsFile, 'utf8')); } catch { raw = null; }
  const god = godSubset(raw);
  const allKeys = raw ? Object.keys(raw) : [];
  const settingsKeys = {
    path: settingsFile,
    exists: raw !== null,
    all: allKeys,
    god: GOD_KEYS.filter(k => allKeys.includes(k)),
    paradise: PARADISE_SETTINGS_KEYS.filter(k => allKeys.includes(k)),
    // **`permissions` は台帳 EX-1 により残る。** 計画に載れば AC-29 違反である。
    retained: allKeys.filter(k => k === 'permissions'),
    unknown: allKeys.filter(k => !GOD_KEYS.includes(k) && !PARADISE_SETTINGS_KEYS.includes(k) &&
                                 k !== 'permissions' && k !== 'hooks'),
  };
  /**
   * **AC-29 — 撤収の暴走**。「楽園由来だから引く」という機械的判断が、
   * 台帳の EX-1 に**必ず阻まれる**ことを証す。計画に `permissions` が載ったら赤。
   */
  if (settingsKeys.paradise.includes('permissions')) {
    violations.push('撤収計画に permissions が載っている — 台帳 EX-1 は「残す」と定めている (AC-29)');
  }

  // ── (3) hooks の逆向き依存 ────────────────────────────────────────
  const br = backRefs({ env, settingsFile: opts.settingsFile, repoRoot });
  const hooks = br.rows.map(r => ({ ...r, ...classifyHook(r, repoRoot) }));

  // ── (4) 拒むもの / 不可侵名簿の現況 ───────────────────────────────
  const refused = retreatRefusals();
  const sanctuary = SANCTUARY.map(s => measureSanctuary(abodeDir, s));

  // ── (5) 凍結 ────────────────────────────────────────────────────
  const baseline = readBaseline(opts.baselineFile || RETREAT_BASELINE);

  return { files, deployNote, abode: abodeDir, settingsKeys, hooks, hooksSkipped: br.skipped,
           refused, sanctuary, god, baseline, baselinePath: opts.baselineFile || RETREAT_BASELINE,
           violations };
}

/**
 * 凍結すべき中身を組む。**器はこれを返すだけ** —— 書くのは CLI の `--plan --freeze` で
 * あり、書き先は**楽園の倉の中**(`reform/sovereign-abode/retreat-baseline.json`)である。
 * `~/.claude` へは 1 バイトも書かない。
 *
 * **値そのものを残す理由**: sha だけでは「何が変わったか」を名指せない。
 * AC-36/37 はキー名**と値**の名指しを要求している。
 */
function retreatBaselineBody(opts = {}) {
  const p = retreatPlan(opts);
  return {
    _note: '神 5 キーの凍結。**数はここが持つ。散文に書き写すな**(第22条 / design §8 危険1 の註)。' +
           'retreat --verify がこの sha と values を実機と照合する(AC-35〜38)。',
    canonicalization: 'キー名昇順 + JSON.stringify の compact(空白なし・末尾改行なし)',
    godKeys: GOD_KEYS.slice().sort(),
    sha256: p.god.sha,
    sha256Short: p.god.sha.slice(0, 16),
    values: p.god.present,
    missing: p.god.missing,
    source: p.settingsKeys.path,
    takenAt: new Date().toISOString(),
    sanctuary: p.sanctuary.map(s => ({ rel: s.rel, kind: s.kind, volatile: !!s.volatile,
                                       exists: s.exists, triple: s.triple })),
  };
}

/**
 * 撤収前後の照合(AC-33〜AC-38)。
 * **baseline が無ければ exit 2** —— skip ではない。照合の基点が無いことは
 * 「違反が無い」ではない(第37条)。
 *
 * @param {{env?:object, settingsFile?:string, baselineFile?:string, repoRoot?:string}} [opts]
 * @returns {{ok:boolean, findings:{kind:string,why:string}[], god:object, sanctuary:object[],
 *            baseline:object, path:string}}
 */
function retreatVerify(opts = {}) {
  const file = opts.baselineFile || RETREAT_BASELINE;
  const baseline = readBaseline(file);
  if (!baseline) {
    throw unmeasurable(
      `凍結が無い: ${file} — 照合の基点が無ければ検められない。` +
      'まず node graph/abode.js retreat --plan --freeze で凍結せよ(第37条: 不在は通過ではない)');
  }
  const settingsFile = godSettingsPath({ env: opts.env, settingsFile: opts.settingsFile });
  if (!isFile(settingsFile)) {
    throw unmeasurable(`実機の settings.json が無い: ${settingsFile} — 撤収の跡を検められない`);
  }
  let raw;
  try { raw = JSON.parse(fs.readFileSync(settingsFile, 'utf8')); }
  catch (e) { throw unmeasurable(`実機の settings.json を読めない: ${settingsFile} — ${e.message}`); }

  const findings = [];
  const god = godSubset(raw);
  const frozen = baseline.values || {};

  // ── AC-36: キーの消失 ────────────────────────────────────────────
  for (const k of Object.keys(frozen)) {
    if (!Object.prototype.hasOwnProperty.call(god.present, k)) {
      findings.push({ kind: 'missing-key', key: k,
        why: `神のキーが消えた: ${k} (${JSON.stringify(frozen[k])})` });
    }
  }
  // ── AC-37: 値の改変 ──────────────────────────────────────────────
  for (const k of Object.keys(frozen)) {
    if (!Object.prototype.hasOwnProperty.call(god.present, k)) continue;
    const a = JSON.stringify(frozen[k]), b = JSON.stringify(god.present[k]);
    if (a !== b) {
      findings.push({ kind: 'changed-value', key: k,
        why: `神のキーの値が変わった: ${k} ${a} → ${b}` });
    }
  }
  // ── AC-38: キーの増殖 ────────────────────────────────────────────
  // **足すのも引くのと同じく無断の改変である。**
  for (const k of Object.keys(god.present)) {
    if (!Object.prototype.hasOwnProperty.call(frozen, k)) {
      findings.push({ kind: 'extra-key', key: k, why: `台帳に無いキーが増えた: ${k}` });
    }
  }
  /**
   * 神 5 キーの外にも「増殖」は起こりうる。だが**そこは GOD_KEYS の管轄ではない** ——
   * 楽園のキー(model/effortLevel)と `permissions` / `hooks` は帰属が別であり、
   * `verifyExport('EX-1')` と `retreat --plan` が別途見張る。
   * ここで全キーを裁けば、神が自分で足した新しい設定まで赤くなる。
   */

  // ── AC-35: 正準 sha256 ───────────────────────────────────────────
  const shaOk = god.sha === baseline.sha256;
  if (!shaOk && !findings.length) {
    findings.push({ kind: 'sha-mismatch', key: '(canonical)',
      why: `神 5 キーの正準 sha256 が凍結値と違う: ${god.sha.slice(0, 16)} ≠ ${String(baseline.sha256).slice(0, 16)} — ` +
           'キーの増減も値の変化も見つからないのに sha が違う = 正準化の流儀が食い違っている' });
  }

  // ── AC-33 / AC-34: 不可侵名簿 ────────────────────────────────────
  const abodeDir = path.dirname(settingsFile);
  const frozenSanctuary = new Map((baseline.sanctuary || []).map(s => [s.rel, s]));
  const sanctuary = SANCTUARY.map(s => {
    const now = measureSanctuary(abodeDir, s);
    const was = frozenSanctuary.get(s.rel) || null;
    const row = { ...now, was: was ? was.triple : null, wasExists: was ? was.exists : null, ok: true, why: null };
    if (!was) {
      row.ok = false;
      row.why = `${s.rel}: 凍結に記録が無い — 名簿が凍結の後で増えた。凍結を取り直せ`;
      findings.push({ kind: 'sanctuary-unfrozen', key: s.rel, why: row.why });
      return row;
    }
    if (was.exists && !now.exists) {
      row.ok = false;
      const n = was.triple ? was.triple.files : '?';
      row.why = `${s.rel}: 撤収前 ${n} ファイル / 撤収後 0 ファイル — **消えている**`;
      findings.push({ kind: 'sanctuary-gone', key: s.rel, why: row.why });
      return row;
    }
    if (!now.exists) {
      // 凍結時も無かった → 名簿に在るが実機に無い。optional ならそれでよい。
      if (!s.optional) {
        row.ok = false;
        row.why = `${s.rel}: 凍結時も撤収後も不在 — 名簿に在る物が実機に無い。名簿を検めよ`;
        findings.push({ kind: 'sanctuary-absent', key: s.rel, why: row.why });
      } else row.why = `${s.rel}: この機には元から無い(optional)`;
      return row;
    }
    /**
     * **「存在する」だけでは通さない**(第37条: 不在は通過ではない。存在も通過ではない)。
     *
     * `volatile` な項目 = Claude Code 自身が常時書く物 → **減ったこと**だけを赤とする
     * (撤収は壊す手であって作る手ではない。増えたのは日常であって撤収の害ではない)。
     * `volatile` でない項目 → **三つ組の完全一致**を課す(日常では 1 バイトも動かない)。
     * **どちらの場合も増減は必ず印字する** —— 黙って通した照合は照合ではない(第54条(c))。
     */
    const moved = [];
    if (now.triple.files !== was.triple.files) moved.push(`ファイル数 ${was.triple.files} → ${now.triple.files}`);
    if (now.triple.bytes !== was.triple.bytes) moved.push(`合計バイト ${was.triple.bytes} → ${now.triple.bytes}`);
    if (now.triple.mtime !== was.triple.mtime) {
      moved.push(`最新 mtime ${new Date(was.triple.mtime).toISOString()} → ${new Date(now.triple.mtime).toISOString()}`);
    }
    row.moved = moved;
    const shrank = now.triple.files < was.triple.files || now.triple.bytes < was.triple.bytes;
    const bad = s.volatile ? shrank : moved.length > 0;
    if (bad) {
      row.ok = false;
      row.why = s.volatile
        ? `${s.rel}: **減っている** — 撤収前 ${was.triple.files} ファイル / ${was.triple.bytes} バイト、` +
          `撤収後 ${now.triple.files} ファイル / ${now.triple.bytes} バイト`
        : `${s.rel}: ${moved.join(' / ')} — この項目は日常では動かない`;
      findings.push({ kind: 'sanctuary-changed', key: s.rel, why: row.why });
    } else if (moved.length) {
      row.why = `${s.rel}: ${moved.join(' / ')} (${s.volatile ? 'volatile — 増えるのは日常であり撤収の害ではない' : ''})`;
    }
    return row;
  });

  return { ok: findings.length === 0 && shaOk, findings, god, sanctuary,
           baseline, path: settingsFile, baselinePath: file, shaOk };
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
  '--creations': 'creations',
  /**
   * ⚠️ **`--backrefs` は第7段で `--all` へ編入された。** この旗は今も残す ——
   * 逆向き依存だけを単独で撃ちたい場面(撤収の作業中)が在るからである。
   * 編入の根拠と条件は `check()` の註を見よ。
   */
  '--backrefs': 'backrefs',
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
  if (r.envRepair.length) {
    console.log(`✗ engine が神のキーを削除する権能を持っている (${r.envRepair.length} 件) — AC-16 / R-4`);
    for (const s of r.envRepair) {
      console.log(`  ${s.file}${s.line ? ':' + s.line : ''}  ${s.text}`);
      console.log(`     ${s.why}`);
    }
    console.log('  → 削除が要るならそれは神への提示である。台帳 REPAIRABLE_ENV_KEYS に載せるか、proposals へ回せ');
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
  if (r.creations) {
    const c = r.creations;
    if (c.skipped) {
      // **skip は口で名乗る**(第58条(e) / §1.4)。黙って通った門は門ではない。
      console.log(`  · skip: ${c.skipped}`);
    } else {
      const n = (v) => (v === null ? '(読めず)' : v);
      console.log(`  · creations abode: ${c.abode}`);
      console.log(`    agents ${n(c.counts.agents)} / commands ${n(c.counts.commands)} / rules ${n(c.counts.rules)} / ` +
        `CLAUDE.md ${c.counts.claudeMd === null ? '(読めず)' : c.counts.claudeMd ? 'あり' : 'なし'} / ` +
        `git 追跡 ${c.tracked === null ? '(検められず)' : c.tracked}`);
      for (const u of c.unmeasurable) console.log(`    · 検められず: ${u}`);
      if (!c.ok) {
        console.log(`✗ 兄弟倉の住処が楽園と一致しない (${c.why.length} 件) — 第30条 / EX-2`);
        for (const w of c.why.slice(0, 12)) console.log(`  ${w}`);
        if (c.why.length > 12) console.log(`  … 他 ${c.why.length - 12} 件`);
        console.log('  → node graph/deploy.js --write --creations');
      }
    }
  }
  if (r.hermetic && !r.hermetic.ok) {
    console.log(`✗ 門が己の測る対象を汚している (${r.hermetic.violations.length} 件) — 第58条(c)`);
    for (const h of r.hermetic.violations) console.log(`  ${h.file}:${h.line}  ${h.obj}.${h.fn}(${h.arg})`);
    console.log('  → 詳しくは node graph/hermetic.js check');
  }
  if (r.backrefs) {
    const b = r.backrefs;
    if (b.skipped) {
      // **実機が無い機(CI)は「検められなかった」を名乗って通す**(第58条(e))。
      console.log(`  · skip: ${b.skipped}`);
    } else if (b.rows.length === 0) {
      console.log(`  ✓ 逆向き依存は 0 件 — 実機の hooks は楽園の木を指していない (AC-30)`);
      console.log(`    実機: ${b.path}`);
    } else {
      console.log(`✗ 実機の hooks が楽園リポジトリの絶対パスを握っている (${b.rows.length} 件) — AC-31 / 第20条の鏡像`);
      console.log(`    実機: ${b.path}`);
      for (const h of b.rows) {
        console.log(`  ${h.event}[${h.index}]  matcher=${JSON.stringify(h.matcher)}`);
        console.log(`     ${h.command}`);
      }
      console.log('  → **撤収前の今は、これが赤いのが正しい。** 計画は node graph/abode.js retreat --plan');
      console.log('  → この旗は --all に含まれない(撤収完了後に編入する / 台帳 [41])');
    }
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

/**
 * `retreat` の CLI。**`--write` は存在しない**(§1.5 / AC-29 / R-8)。
 *
 * 旗:
 *   `--plan`            撤収計画を印字する。**冗長に印字する** —— 神がこれを読んで裁可を下す。
 *   `--plan --freeze`   神 5 キーの凍結を `reform/sovereign-abode/retreat-baseline.json` へ書く。
 *                       **これは楽園の倉の中への書き込みであり、`~/.claude` への書き込みではない。**
 *   `--verify`          凍結と実機を照合する。凍結が無ければ exit 2。
 *
 * exit code は §1.4 の三値: 0=検めて違反無し / 1=検めて違反在り / 2=検められなかった。
 */
function printRetreat(rest) {
  const wantPlan = rest.includes('--plan');
  const wantVerify = rest.includes('--verify');
  const wantFreeze = rest.includes('--freeze');
  for (const a of rest) {
    if (!['--plan', '--verify', '--freeze'].includes(a)) {
      throw unmeasurable(`retreat の知らない旗: ${a} — 知る旗は --plan / --verify / --freeze。` +
        '**retreat は --write を持たない**: 住所を知る器は書かない(§1.5)。' +
        '実際の撤収は神が計画を読み、名指した後に行う');
    }
  }
  if (wantPlan === wantVerify) {
    throw unmeasurable('retreat には --plan か --verify のどちらか一方が要る — ' +
      '旗の無い retreat が何をするかは決まっていない(第16条)');
  }
  if (wantFreeze && !wantPlan) {
    throw unmeasurable('--freeze は --plan と共にしか使えない — 照合が凍結を書き直せば、照合は必ず緑になる');
  }

  if (wantPlan) return printRetreatPlan(wantFreeze);
  return printRetreatVerify();
}

function printRetreatPlan(wantFreeze) {
  const p = retreatPlan();
  const W = (s) => console.log(s);
  W('═══ 🧳 ABODE RETREAT — 撤収計画 (印字のみ / **--write は存在しない**) ═══');
  W('');
  W('  ⚠️ **この器は 1 バイトも書かない。** 実際の撤収は神が本計画を読み、');
  W('     「何を引き、何を残すか」を名指した後に、別の段で行う。');
  W(`  神の住処: ${p.abode}`);
  W(`  settings: ${p.settingsKeys.path}  (実体 ${p.settingsKeys.exists ? 'あり' : 'なし'})`);
  W('');

  // ── (1) ファイル ──────────────────────────────────────────────
  W('── (1) 撤収対象のファイル — 神の住処に**実際に住んでいる**楽園の配備物 ──────────');
  if (p.deployNote) {
    W(`  · 検められず: ${p.deployNote}`);
  } else {
    const onDisk = p.files.filter(f => f.onDisk).length;
    W(`  実測 ${p.files.length} 件 / **実在 ${onDisk} 件**`);
    W('  (計画に在るだけで実機に無い物は撤収しようがない — 実機を直に測る。第37条)');
    W('  ※ 出所(overlay / vendor)との照合は node graph/deploy.js check の職務である(第29条)');
    const byKind = {};
    for (const f of p.files) {
      byKind[f.kind] = byKind[f.kind] || { n: 0, onDisk: 0 };
      byKind[f.kind].n++;
      if (f.onDisk) byKind[f.kind].onDisk++;
    }
    for (const [k, v] of Object.entries(byKind)) W(`    ${k.padEnd(10)} ${String(v.n).padStart(3)} 件 (実在 ${v.onDisk})`);
    W('');
    for (const f of p.files) {
      W(`    ${f.onDisk ? '●' : '○'} ${(f.kind + '/' + f.file).padEnd(46)} ${f.dst}`);
    }
  }
  W('');

  // ── (2) settings.json のキーの帰属 ────────────────────────────
  W('── (2) settings.json のキーの帰属 ─────────────────────────────────────');
  W(`  実機の全キー (${p.settingsKeys.all.length}): ${p.settingsKeys.all.join(', ')}`);
  W('');
  W(`  🚫 **神のキー(触れない)** ${p.settingsKeys.god.length} 件:`);
  for (const k of p.settingsKeys.god) {
    W(`     ${k.padEnd(24)} = ${JSON.stringify(p.god.present[k])}`);
  }
  if (p.god.missing.length) W(`     · 実機に無い神のキー: ${p.god.missing.join(', ')}`);
  W('');
  W(`  🧳 **撤収対象の楽園のキー** ${p.settingsKeys.paradise.length} 件 (神の裁可待ち):`);
  for (const k of p.settingsKeys.paradise) W(`     ${k}`);
  W('');
  W(`  🔒 **残すキー(台帳 EX-1)** ${p.settingsKeys.retained.length} 件:`);
  for (const k of p.settingsKeys.retained) {
    W(`     ${k} — 「楽園由来だから引く」という機械的判断を台帳が阻む (AC-29)`);
  }
  if (p.settingsKeys.unknown.length) {
    W('');
    W(`  ❓ 帰属不明のキー ${p.settingsKeys.unknown.length} 件 — **黙って撤収しない。神の名指しを求める**:`);
    for (const k of p.settingsKeys.unknown) W(`     ${k}`);
  }
  W('');

  // ── (3) hooks ────────────────────────────────────────────────
  W('── (3) hooks の逆向き依存 — 楽園リポジトリの絶対パスを握る hook ────────────');
  if (p.hooksSkipped) {
    W(`  · skip: ${p.hooksSkipped}`);
  } else if (!p.hooks.length) {
    W('  ✓ 0 件 — 撤収済みか、そもそも結線されていない');
  } else {
    W(`  ${p.hooks.length} 件。**判定の根拠は推測ではなく実測**(そのスクリプトが何を読み何処へ書くか)`);
    W('');
    const JA = { 'paradise-specific': '楽園固有', 'vendor-generic': '汎用 (vendor 由来)', unknown: '判定不能' };
    for (const h of p.hooks) {
      W(`  ${h.event}[${h.index}]  matcher=${JSON.stringify(h.matcher)}`);
      W(`     ${h.command}`);
      W(`     判定: ${JA[h.verdict]}  (実体 ${h.exists ? 'あり' : 'なし'})`);
      W(`     根拠: ${h.basis}`);
      if (h.touches.length) W(`     実測: ${h.touches.join(' / ')}`);
      W('');
    }
    const generic = p.hooks.filter(h => h.verdict !== 'paradise-specific');
    const specific = p.hooks.filter(h => h.verdict === 'paradise-specific');
    W(`  ── 裁可を仰ぐ ──────────────────────────────────────────────`);
    W(`  楽園固有 ${specific.length} 件 — 楽園の記憶注入は楽園の中でだけ意味を持つ。`);
    W('     他所の倉のセッション開始に楽園の KG を注ぐのは文脈の汚染である(R-8 の理由3)。');
    for (const h of specific) W(`     · ${h.event}[${h.index}] ${h.script}`);
    W('');
    W(`  汎用 ${generic.length} 件 — **黙って撤収しない**(要件 R-8)。`);
    W('     これらは楽園を一切参照せず、~/.claude/sessions/ や skills/learned/ や temp へ書く。');
    W('     だが**楽園の倉に住んでいる**ので、倉を動かせば神の全プロジェクトが黙って壊れる。');
    W('     **神が「残せ」と名指した物だけが台帳へ載る。** 神の裁可を待つ:');
    for (const h of generic) {
      W(`     · ${h.event}[${h.index}] ${h.script}`);
      W(`         ${h.touches.length ? h.touches.join(' / ') : '(読み書きの実測なし)'}`);
    }
  }
  W('');

  // ── (4) 拒むもの ──────────────────────────────────────────────
  W('── (4) 拒むもの (refused) — 不可侵名簿と台帳 ────────────────────────────');
  W(`  ${p.refused.length} 件。**「対象外」を黙って対象外にしない**(第54条(c))`);
  W('');
  for (const s of p.sanctuary) {
    const t = s.triple;
    const state = !s.exists ? (s.optional ? '(この機には無い)' : '🔴 **名簿に在るが実機に無い**')
      : s.kind === 'dir' ? `files=${t.files} bytes=${t.bytes} mtime=${new Date(t.mtime).toISOString()}`
      : `bytes=${t.bytes} mtime=${new Date(t.mtime).toISOString()}`;
    W(`  🚫 ~/.claude/${s.rel.padEnd(28)} ${state}`);
    W(`       ${s.why}`);
  }
  const ex1 = p.refused.find(r => r.what.includes('#/permissions'));
  if (ex1) {
    W('');
    W(`  🔒 ${ex1.what}`);
    W(`       ${ex1.why}`);
  }
  W('');

  // ── (5) 凍結 ──────────────────────────────────────────────────
  W('── (5) 神 5 キーの凍結 ────────────────────────────────────────────────');
  W(`  凍結の在り処: ${path.relative(REPO_ROOT, p.baselinePath).split(path.sep).join('/')}  (git 追跡)`);
  W('  ⚠️ **数はここが持つ。散文に書き写すな**(第22条)。起草時 design/requirements は');
  W('     sha を散文に書き写していたが、その数は再現不能であった(design §8 危険1 の註)。');
  W(`  正準化: キー名昇順 + JSON.stringify の compact`);
  W(`  実測 sha256: ${p.god.sha}`);
  W(`  短縮 (16): ${p.god.sha.slice(0, 16)}`);
  if (p.baseline) {
    const same = p.baseline.sha256 === p.god.sha;
    W(`  凍結済み: ${String(p.baseline.sha256).slice(0, 16)} (${p.baseline.takenAt})  — 実測と ${same ? '一致' : '**不一致**'}`);
  } else {
    W('  凍結: **まだ無い** — node graph/abode.js retreat --plan --freeze で凍結せよ');
  }

  if (wantFreeze) {
    const body = retreatBaselineBody();
    fs.mkdirSync(path.dirname(RETREAT_BASELINE), { recursive: true });
    fs.writeFileSync(RETREAT_BASELINE, JSON.stringify(body, null, 2) + '\n');
    W('');
    W(`  ✎ 凍結した: ${path.relative(REPO_ROOT, RETREAT_BASELINE).split(path.sep).join('/')}`);
    W('     (**楽園の倉の中への書き込みである。`~/.claude` へは 1 バイトも書いていない**)');
  }
  W('');

  if (p.violations.length) {
    W(`✗ 撤収計画に違反がある (${p.violations.length} 件)`);
    for (const v of p.violations) W(`  ${v}`);
    W('═══════════════════════════════════════');
    return 1;
  }
  W('  ✓ 計画に permissions は含まれない — 台帳 EX-1 が機械的判断を阻んだ (AC-29)');
  W('  → 次: 神が本計画を読み、hooks の去就を名指す。撤収はその後である。');
  W('═══════════════════════════════════════');
  return 0;
}

function printRetreatVerify() {
  const v = retreatVerify();            // 凍結が無ければここで throw → exit 2
  console.log('═══ 🧳 ABODE RETREAT — 照合 (AC-33〜AC-38) ═══');
  console.log(`  実機:   ${v.path}`);
  console.log(`  凍結:   ${path.relative(REPO_ROOT, v.baselinePath).split(path.sep).join('/')}  (${v.baseline.takenAt})`);
  console.log('');
  console.log('  ── 神 5 キー (AC-35〜AC-38) ────────────────────────────────');
  console.log(`  正準 sha256: ${v.god.sha.slice(0, 16)} ${v.shaOk ? '=' : '≠'} ${String(v.baseline.sha256).slice(0, 16)} (凍結)`);
  for (const k of Object.keys(v.baseline.values || {})) {
    const has = Object.prototype.hasOwnProperty.call(v.god.present, k);
    const same = has && JSON.stringify(v.god.present[k]) === JSON.stringify(v.baseline.values[k]);
    console.log(`    ${same ? '✓' : '✗'} ${k.padEnd(24)} ${has ? JSON.stringify(v.god.present[k]) : '(消えている)'}`);
  }
  console.log('');
  console.log('  ── 不可侵名簿 (AC-33 / AC-34) ──────────────────────────────');
  console.log('  **「存在する」だけでは通さない** — (ファイル数, 合計バイト, 最新 mtime) の三つ組で照合する');
  for (const s of v.sanctuary) {
    const t = s.triple;
    const shown = t ? `files=${String(t.files).padStart(4)} bytes=${String(t.bytes).padStart(9)}` : '(不在)';
    console.log(`    ${s.ok ? '✓' : '✗'} ${s.rel.padEnd(30)} ${shown}${s.volatile ? '  [volatile]' : ''}`);
    if (s.why) console.log(`         ${s.why}`);
  }
  console.log('');
  if (v.ok) {
    console.log('  ✓ 神のキーは無傷で、不可侵名簿は存在し、かつ内容が一致する');
    console.log('═══════════════════════════════════════');
    return 0;
  }
  console.log(`✗ 撤収が神の資産を損なった (${v.findings.length} 件)`);
  for (const f of v.findings) console.log(`  ${f.why}`);
  console.log('  → 退路: design.md §8 危険1 のロールバック手順');
  console.log('═══════════════════════════════════════');
  return 1;
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
  if (cmd === 'retreat') return printRetreat(rest);
  throw unmeasurable('usage: abode.js resolve [--json] | path <key> | ' +
    `check [${Object.keys(CHECK_FLAGS).join('|')}] | ` +
    'exports [--external|--verify <id>] | migrate --plan|--verify | ' +
    'retreat --plan [--freeze] | retreat --verify');
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
  homedirRefs, exclusionAudit, selfAudit, envRepairAudit, scanTargets, check,
  silentGreens, silentGreenTargets, symmetryAudit, codeOnly,
  creationsAbode,
  migratePlan, migrateVerify, migrateSides, measureFile,
  retreatPlan, retreatVerify, retreatBaselineBody, retreatRefusals,
  backRefs, classifyHook, godSubset, godSettingsPath, readBaseline,
  dirTriple, measureSanctuary,
  REPO_ROOT, LEDGER, MODES, DEFAULT_MODE, KEYS, CHECK_FLAGS, MIGRATE_TARGETS,
  GOD_KEYS, PARADISE_SETTINGS_KEYS, SANCTUARY, RETREAT_BASELINE,
  HOMEDIR_PATTERNS, HOMEDIR_EXCLUDE_FILES, HOMEDIR_EXCLUDE_MAX,
  SILENT_GREEN_PATTERNS, SYMMETRY_PAIR, CREATIONS_TREES, CREATIONS_FILES,
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
