#!/usr/bin/env node
'use strict';
/**
 * ordain.js — 役者を鍛造する (憲法 第52条 / 第29条 / 第35条)
 *
 * 実測: 新しい役者を建てる engine は **0本** だった。教主が手で触る箇所は
 * **4ファイルの手編集 + 4コマンド = 全8工程**であり、その手順は README にも
 * CLAUDE.md にも書かれていなかった。
 *
 * 8工程の手作業は序列3の閾値(`spawn-trace.js tiers` が語る)を確実に超える。
 * すなわち **現況の楽園では「役者を増やす」という行為そのものが、
 * 序列3で処理できない仕事を教主に強いていた。** 鍛造器は序列の実効性の前提である。
 *
 *   1. node graph/ordain.js forge --name <n> --domain <d> --cardinal <c> --rank <r> --write
 *   2. node graph/deploy.js --write
 *   3. node graph/ordain.js verify --name <n>
 *
 * **手編集 0ファイル / コマンド 3本。**
 *
 * ── 配備を飲み込ませない理由 (第29条 / 第35条) ─────────────────────
 * `overlay/overlay.json` は「手で `~/.claude` を編集してはならない — 編集は
 * 必ずここへ書く」と述べ、`deploy_target.$note` は「配備先は成果物であって
 * 原本ではない」と述べる。**鍛造器が配備までやれば、鍛造器は配備器になる。**
 * 原本を書く器と実機に書く器を分けることが第29条の要求である。
 * ゆえに `ordain forge --write` の直後、`~/.claude/agents/<新名>.md` は**存在しない**。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OVERLAY = path.join(ROOT, 'overlay');
const AGENTS_DIR = path.join(OVERLAY, 'agents');
const OVERLAY_JSON = path.join(OVERLAY, 'overlay.json');
const CLERGY_JS = path.join(__dirname, 'clergy.js');
const DOMAINS_JSON = path.join(__dirname, 'domains.json');

const clergy = require('./clergy.js');
const domains = require('./domains.js');

/** 既存の全ての名。**鍛造の時点で衝突を裁く** — 後の門に叱られるのは8工程時代と同じ体験である。 */
function existingNames() {
  const out = new Set();
  try { for (const f of fs.readdirSync(AGENTS_DIR)) if (f.endsWith('.md')) out.add(f.replace(/\.md$/, '')); } catch {}
  try {
    const home = process.env.CLAUDE_HOME || path.join(os.homedir(), '.claude');
    for (const f of fs.readdirSync(path.join(home, 'agents'))) if (f.endsWith('.md')) out.add(f.replace(/\.md$/, ''));
  } catch {}
  for (const p of clergy.allPriests()) out.add(p);
  for (const b of clergy.allBelievers()) out.add(b);
  return out;
}

/**
 * 鍛造要求を検める。**4つの欠けを、鍛造の時点で名指しする** (fail fast)。
 * どれも `deploy` の前に判る欠けである。
 */
function validate(req) {
  const errors = [];
  if (!req.name) errors.push('--name が無い — 名の無い役者は鍛造できない');
  else if (!/^[a-z][a-z0-9-]*$/.test(req.name)) errors.push(`名は小文字と連字符のみ: "${req.name}"`);

  // 1. 分野宣言
  const led = domains.load();
  if (!req.domain) errors.push('--domain が無い — 担える分野を宣言されない役者は道に載せられない (第52条)');
  else if (!led.domains[req.domain]) {
    errors.push(`分野 "${req.domain}" が台帳に無い — 既知: ${Object.keys(led.domains).join(', ')}`);
  }

  // 2. 位階が apply-models の方針に反しないか
  const rank = req.rank || 'priest';
  if (!clergy.RANKS[rank]) errors.push(`位階 "${rank}" は clergy.RANKS に無い — 既知: ${Object.keys(clergy.RANKS).join(', ')}`);
  else if (req.model) {
    const want = clergy.modelFor(req.name, rank);
    if (req.model !== want.model) {
      errors.push(`model "${req.model}" は位階 ${rank} の方針(${want.model})に反する — apply-models verify が後で鳴る`);
    }
    if (req.effort && !clergy.supportsEffort(req.model, req.effort)) {
      errors.push(`model "${req.model}" は effort "${req.effort}" を受けない`);
    }
  }

  // 3. 所属枢機卿
  if (!req.cardinal) errors.push('--cardinal が無い — 無主の役者は誰の麾下でもない (第25条)');
  else if (!clergy.COLLEGE[req.cardinal]) {
    errors.push(`枢機卿 "${req.cardinal}" が COLLEGE に無い — 既知: ${Object.keys(clergy.COLLEGE).join(', ')}`);
  }

  // 4. 名の衝突
  if (req.name && !req.enlist && existingNames().has(req.name)) {
    errors.push(`名 "${req.name}" は既存の agent と衝突する — 名の混同は事故を生む (第17条)`);
  }
  if (req.name && req.enlist && !existingNames().has(req.name)) {
    errors.push(`enlist は既存の役者に分野を与える経路である — "${req.name}" は overlay/agents/ にも位階にも居ない`);
  }
  return { ok: errors.length === 0, errors, rank };
}

/**
 * agent 定義の本文。**model / effort は `clergy.modelFor` から生成する** —
 * 方針から生成された値が方針に反することはない(AC-D4 #2 の保証)。
 *
 * ⚠️ **起動の権能は枢機卿の編成が決める**(prove 相の実鍛造が名指しした欠陥):
 * `apply-spawn.needsSpawn()` は「**信徒を擁する枢機卿の神官**」全員に
 * `Task` を要求する —— `--believers` を渡したかではない。ゆえに旧実装は
 * 信徒を持つ枢機卿へ鍛造したとき `Task` を欠いた定義を産み、
 * `apply-spawn` の transform が配備時に黙って足す形になっていた。
 * **原本と実機が食い違う定義を産むのは、原本主義(第29条)の反対である。**
 * 所属先が信徒を擁するなら、鍛造の時点で権能を持たせる。
 */
function renderAgent(req, rank) {
  const m = clergy.modelFor(req.name, rank);
  const led = domains.load();
  const dom = led.domains[req.domain];
  const col = clergy.COLLEGE[req.cardinal];
  // 信徒を擁する枢機卿の神官は、信徒を発令する。権能は編成から導く。
  const spawns = (req.believers && req.believers.length) || (col && (col.believers || []).length);
  const tools = spawns
    ? `Read, Grep, Glob, Write, Edit, Bash, ${clergy.SPAWN_TOOL}`
    : 'Read, Grep, Glob, Write, Edit, Bash';
  const desc = req.description ||
    `${dom.ja} を担う${clergy.RANKS[rank].title.split(' ')[1] || rank}。枢機卿 ${col.domain} の麾下で ${dom.ja} の仕事を受け持つ。`;
  return [
    '---',
    `name: ${req.name}`,
    `description: ${desc}`,
    `tools: ${tools}`,
    `model: ${m.model}`,
    ...(m.effort ? [`effort: ${m.effort}`] : []),
    '---',
    '',
    `あなたは楽園の **${req.name}** — ${dom.ja} を担う者である。`,
    '',
    '## なぜ存在するか',
    `楽園は ${dom.ja} の仕事を受けたとき、担い手が居なければ既定の道へ黙って落としていた。`,
    '名前だけ埋まった道は門を鳴らさない。**実在するだけでは足りない — 適合が要る**(第52条)。',
    `あなたは ${dom.ja} の適合を宣言された役者である。`,
    '',
    '## 掟',
    '- **主張は証拠ではない**(第5条)。走らせた命令とその生の出力を添えよ。',
    '- **見なかったものを「通った」と言わない**(第16条)。判定不能は緑ではない。',
    `- 枢機卿 **${col.domain}** に返す。教主へ直に返さない(第25条)。`,
    '- 返す形は `{phase, status, artifact, evidence, summary}` である。',
    '',
    `*鍛造: node graph/ordain.js forge --name ${req.name} --domain ${req.domain} --cardinal ${req.cardinal} --rank ${rank}*`,
    '',
  ].join('\n');
}

/**
 * 鍛造の計画。**何をどこに書くかを実行前に全て言語化する** (第29条の流儀)。
 * `--write` が無ければこの一覧を出すだけで、`overlay/` は1バイトも変わらない。
 */
function plan(req) {
  const v = validate(req);
  if (!v.ok) return { ok: false, errors: v.errors };
  const rank = v.rank;
  const steps = [];

  if (!req.enlist) {
    steps.push({ kind: 'agent-md', file: path.relative(ROOT, path.join(AGENTS_DIR, req.name + '.md')),
      why: '役者の定義そのもの。原本は overlay に住む (第29条)', content: renderAgent(req, rank) });
    steps.push({ kind: 'overlay-own', file: 'overlay/overlay.json',
      why: `own.agents に "${req.name}.md" を足す — deploy の plan に載せるため` });
    steps.push({ kind: 'clergy-college', file: 'graph/clergy.js',
      why: `COLLEGE["${req.cardinal}"].priests に "${req.name}" を足す — 無主にしない (第25条)` });
  } else {
    steps.push({ kind: 'note', file: '(enlist)',
      why: `"${req.name}" は既に overlay/agents/ か位階に在る。分野の配線だけを行う` });
    if (req.cardinal && !(clergy.COLLEGE[req.cardinal].priests || []).includes(req.name)) {
      steps.push({ kind: 'clergy-college', file: 'graph/clergy.js',
        why: `COLLEGE["${req.cardinal}"].priests に "${req.name}" を足す` });
    }
  }
  steps.push({ kind: 'domains', file: 'graph/domains.json',
    why: `agents["${req.name}"] に分野 "${req.domain}" を宣言する (第52条)` });

  return { ok: true, steps, rank, name: req.name, domain: req.domain, cardinal: req.cardinal };
}

function writeAgentMd(step) {
  fs.mkdirSync(AGENTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(ROOT, step.file), step.content);
}

function writeOverlayOwn(name) {
  const raw = fs.readFileSync(OVERLAY_JSON, 'utf8');
  const crlf = raw.includes('\r\n');
  const cfg = JSON.parse(raw);
  cfg.own = cfg.own || {};
  cfg.own.agents = cfg.own.agents || [];
  const f = name + '.md';
  if (!cfg.own.agents.includes(f)) { cfg.own.agents.push(f); cfg.own.agents.sort(); }
  let out = JSON.stringify(cfg, null, 1) + '\n';
  if (crlf) out = out.replace(/\n/g, '\r\n');
  fs.writeFileSync(OVERLAY_JSON, out);
}

/**
 * `COLLEGE` はリテラル定数である。動的登録の口は無い。
 *
 * **安全策**: 挿入は `priests: [...]` の**末尾**という一点のみ。整形も並べ替えもしない。
 * 書いた後に再読込して構文が壊れていないことを確かめ、壊れていれば書き戻す。
 *
 * ⚠️ **末尾でなければならない理由**(prove 相が実鍛造して発見した欠陥):
 * `clergy.marshalPlan()` は `PHASE_LEAD[phaseId]` に宣言の無い相を
 * **`c.priests[0]` すなわち筆頭神官**へ落とす。ゆえに名を配列の**先頭**へ
 * 挿すと、産まれたばかりの役者がその枢機卿の筆頭に立ち、
 * `PHASE_LEAD` を持たない全ての相の発令を横取りする。
 *
 * 実測(prove 相): `construction` へ 1名鍛造しただけで
 *   🔴 misrouted: build    (quick) 宣言 architect → 発令 <新役者>
 *   🔴 misrouted: build-ui (full)  宣言 architect → 発令 <新役者>
 * が鳴った。**鍛造器が門を壊していた。** 経路だけを撃つ試験では見えない。
 *
 * 末席に加えれば筆頭は動かず、指揮系統は組み替わらない。
 * **鍛造は役者を増やす行為であって、序列を入れ替える行為ではない。**
 *
 * ⚠️ **正直な注記**: JS のリテラルを engine が書き換えるのは脆い。より堅いのは
 * `COLLEGE` を JSON へ外出しすることだが、それは `clergy.js` を読む全ての門
 * (`check-agents` / `atlas` / `conclave` / `apply-*` / `lexicon-check`)の前提を
 * 動かす大改修であり、本PRの範囲を超える。本PRは経路が在ることを作る。
 */
function writeCollege(cardinal, name) {
  const before = fs.readFileSync(CLERGY_JS, 'utf8');
  // priests 配列を丸ごと捕らえる — 先頭ではなく**末尾**に加えるため中身が要る。
  const key = new RegExp(`(['"]?${cardinal}['"]?\\s*:\\s*\\{[\\s\\S]*?priests:\\s*\\[)([^\\]]*)(\\])`);
  const m = before.match(key);
  if (!m) throw new Error(`clergy.js の COLLEGE["${cardinal}"].priests を見つけられない — 手で足せ`);
  if (new RegExp(`['"]${name}['"]`).test(m[2])) return false;
  const body = m[2].trim();
  // 末席に加える。既存の並びには一切触れない —— 筆頭が動けば発令先が変わる。
  const next = body ? `${m[2].replace(/\s*$/, '')}, '${name}'` : `'${name}'`;
  const after = before.replace(key, `$1${next}$3`);
  fs.writeFileSync(CLERGY_JS, after);
  try {
    delete require.cache[require.resolve(CLERGY_JS)];
    const reloaded = require(CLERGY_JS);
    const ps = (reloaded.COLLEGE[cardinal] || {}).priests || [];
    if (!ps.includes(name)) throw new Error('再読込しても名が載っていない');
    if (ps[ps.length - 1] !== name) throw new Error('末席に加わっていない — 筆頭が入れ替われば発令が変わる');
  } catch (e) {
    fs.writeFileSync(CLERGY_JS, before);          // 壊したなら書き戻す
    throw new Error(`clergy.js の書き換えが壊れた — 書き戻した: ${e.message}`);
  }
  return true;
}

function writeDomains(name, domain) {
  const raw = fs.readFileSync(DOMAINS_JSON, 'utf8');
  const crlf = raw.includes('\r\n');
  const led = JSON.parse(raw);
  led.agents = led.agents || {};
  const list = led.agents[name] || [];
  if (!list.includes(domain)) list.push(domain);
  led.agents[name] = list;
  let out = JSON.stringify(led, null, 2) + '\n';
  if (crlf) out = out.replace(/\n/g, '\r\n');
  fs.writeFileSync(DOMAINS_JSON, out);
}

function forge(req) {
  const p = plan(req);
  if (!p.ok) return p;
  if (!req.write) return { ...p, dry: true };
  for (const s of p.steps) {
    if (s.kind === 'agent-md') writeAgentMd(s);
    else if (s.kind === 'overlay-own') writeOverlayOwn(req.name);
    else if (s.kind === 'clergy-college') writeCollege(req.cardinal, req.name);
    else if (s.kind === 'domains') writeDomains(req.name, req.domain);
  }
  return { ...p, dry: false, written: true };
}

/**
 * 鍛造した役者が既存の全門を通ることを確かめる (AC-D4)。
 * **新しい判定を書かない — 既存の門を呼ぶだけである**(重複禁止・第41条)。
 */
const GATES = [
  { name: '実在',         cmd: ['graph/check-agents.js'] },
  { name: '位階モデル方針', cmd: ['graph/apply-models.js', 'verify'] },
  { name: '起動権能',      cmd: ['graph/apply-spawn.js', 'verify'] },
  { name: '配備の一致',    cmd: ['graph/deploy.js', 'check'] },
  { name: '分野の適合',    cmd: ['graph/domains.js', 'check'] },
  { name: '結線',          cmd: ['graph/wiring.js', 'check'] },
  { name: '自画像',        cmd: ['graph/atlas.js', 'check'] },
];

function verify(name, opts = {}) {
  const rows = [];
  const led = domains.load();
  rows.push({ name: '分野宣言', ok: Array.isArray(led.agents[name]) && led.agents[name].length > 0,
    note: (led.agents[name] || []).join(', ') || '宣言なし' });
  const gates = opts.only ? GATES.filter(g => opts.only.includes(g.name)) : GATES;
  for (const g of gates) {
    let ok = false, note = '';
    try {
      execFileSync(process.execPath, [path.join(ROOT, ...g.cmd[0].split('/')), ...g.cmd.slice(1)],
        { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      ok = true;
    } catch (e) {
      note = String((e.stdout || '') + (e.stderr || '')).split('\n').filter(l => /🔴/.test(l)).slice(0, 2).join(' / ')
             || String(e.message).slice(0, 120);
    }
    rows.push({ name: g.name, ok, note, cmd: 'node ' + g.cmd.join(' ') });
  }
  return { ok: rows.every(r => r.ok), rows };
}

// ── CLI ───────────────────────────────────────────────────────────────
function parse(argv) {
  const f = {}; const pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) f[argv[i].slice(2)] = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
    else pos.push(argv[i]);
  }
  return { f, pos };
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { f } = parse(rest);

  if (cmd === 'forge' || cmd === 'enlist') {
    const req = {
      name: typeof f.name === 'string' ? f.name : null,
      domain: typeof f.domain === 'string' ? f.domain : null,
      cardinal: typeof f.cardinal === 'string' ? f.cardinal : null,
      rank: typeof f.rank === 'string' ? f.rank : 'priest',
      model: typeof f.model === 'string' ? f.model : null,
      effort: typeof f.effort === 'string' ? f.effort : null,
      description: typeof f.description === 'string' ? f.description : null,
      write: !!f.write,
      enlist: cmd === 'enlist',
    };
    // enlist は既存の役者に分野を与える経路なので、枢機卿は任意である。
    if (req.enlist && !req.cardinal) {
      for (const [c, col] of Object.entries(clergy.COLLEGE)) if ((col.priests || []).includes(req.name)) { req.cardinal = c; break; }
      if (!req.cardinal) req.cardinal = 'construction';
    }
    const r = forge(req);
    if (!r.ok) {
      console.error(`🔴 鍛造できない — ${r.errors.length} 件の欠け (第52条: 後の門が鳴るのではなく、鍛造の時点で鳴る)`);
      for (const e of r.errors) console.error(`   - ${e}`);
      process.exit(1);
    }
    console.log(`═══ ⚒  ORDAIN — ${req.enlist ? '配線' : '鍛造'} ${req.name} ═══`);
    console.log(`  分野: ${req.domain}   枢機卿: ${req.cardinal}   位階: ${r.rank}`);
    for (const s of r.steps) console.log(`  ${r.dry ? '·' : '✓'} ${s.file.padEnd(28)} ${s.why}`);
    console.log('────────────────────────────────────────────');
    if (r.dry) {
      console.log('  (既定は dry-run — overlay は1バイトも変わっていない)');
      console.log('  実際に書くなら --write を足せ');
    } else {
      console.log('  原本を書いた。**実機にはまだ何も無い** — 配備器だけが実機に書く (第29条)');
      console.log(`  1. node graph/deploy.js --write`);
      console.log(`  2. node graph/ordain.js verify --name ${req.name}`);
    }
    console.log('════════════════════════════════════════════');
    process.exit(0);
  }

  if (cmd === 'verify') {
    const name = typeof f.name === 'string' ? f.name : null;
    if (!name) { console.error('usage: ordain.js verify --name <n>'); process.exit(2); }
    const only = typeof f.only === 'string' ? f.only.split(',') : null;
    const r = verify(name, { only });
    console.log(`═══ ⚒  ORDAIN VERIFY — ${name} が既存の全門を通るか ═══`);
    for (const row of r.rows) console.log(`  ${row.ok ? '✓' : '🔴'} ${row.name.padEnd(16)} ${row.note || (row.cmd || '')}`);
    console.log(r.ok ? '  ✓ 鍛造した役者は既存の門を一つも壊していない' : '  🔴 増やせば門が壊れるなら、それは増やせていない (第47条)');
    console.log('══════════════════════════════════════════════');
    process.exit(r.ok ? 0 : 1);
  }

  console.error('commands:');
  console.error('  forge  --name <n> --domain <d> --cardinal <c> [--rank priest] [--write]   新しい役者を鍛造する');
  console.error('  enlist --name <既存> --domain <d> [--cardinal <c>] [--write]              孤立した役者を道へ配線する');
  console.error('  verify --name <n> [--only <門名,...>]                                      既存の全門を撃つ');
  console.error('');
  console.error('  既定は dry-run である (第29条: 原本を書く器と実機に書く器は別)。');
  console.error('  鍛造 → node graph/deploy.js --write → verify の3工程で終わる。');
  process.exit(2);
}
if (require.main === module) main();
module.exports = { validate, plan, forge, verify, renderAgent, existingNames, GATES };
