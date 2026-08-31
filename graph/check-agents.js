#!/usr/bin/env node
'use strict';
/**
 * check-agents.js — 楽園が名指しする神官が実在するか確かめる
 *
 * 楽園は agent 名を **複数の場所** で名指しする:
 *   - graph/forge.js       … 各スケールの DAG の phase.agent
 *   - graph/clergy.js      … 各枢機卿が率いる priests[]
 *   - graph/examples/*.json … 出荷している見本 DAG の agent
 * しかし実体は `~/.claude/agents/*.md` にしかない。**名指しする場所が増えるたび
 * 宙吊り参照の入口が増える**。かつて forge.js だけを見ていたため、`frontend`
 * という実在しない神官が clergy.js と examples に生き残り、検査は緑のままだった
 * （憲法 第21条）。よって検査は「名指しする全ての口」を走査する。
 *
 *   node graph/check-agents.js          # 検査（不足があれば exit 1）
 *   node graph/check-agents.js --list   # 必要な神官の一覧（出所つき）
 *
 * ハーネス未配置の環境（CI など）では検査せず素通りする。存在しないものを
 * 責めるのではなく、存在すべきものが欠けていないかだけを見る。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const forge = require('./forge.js');
const clergy = require('./clergy.js');

/** engine 側の疑似エージェント（~/.claude に実体を持たない） */
const PSEUDO = new Set(['verification-loop']);

/**
 * 名指しする全ての口を走査し、agent名 -> それを名指した出所[] を返す。
 * 出所を持つことが要点 — 「誰が宙吊りを作ったか」まで言えねば直せない。
 */
function referenceMap(opts = {}) {
  const examplesDir = opts.examplesDir || path.join(__dirname, 'examples');
  const map = new Map();
  const add = (agent, source) => {
    if (!agent || PSEUDO.has(agent)) return;
    if (!map.has(agent)) map.set(agent, new Set());
    map.get(agent).add(source);
  };

  // ① forge.js — 全スケールの DAG
  for (const scale of Object.keys(forge.SCALES)) {
    for (const t of forge.buildDag('probe', scale).tasks) add(t.agent, `forge.js:${scale}`);
  }

  // ② clergy.js — 枢機卿団が率いる神官
  for (const [id, c] of Object.entries(clergy.COLLEGE || {})) {
    for (const p of c.priests || []) add(p, `clergy.js:${id}`);
  }

  // ③ graph/examples/*.dag.json — 出荷している見本
  let files = [];
  try { files = fs.readdirSync(examplesDir).filter(f => f.endsWith('.json')); } catch { files = []; }
  for (const f of files) {
    let dag;
    try { dag = JSON.parse(fs.readFileSync(path.join(examplesDir, f), 'utf8')); } catch { continue; }
    for (const t of dag.tasks || []) add(t.agent, `examples/${f}`);
  }

  return map;
}

function requiredAgents(opts) {
  return [...referenceMap(opts).keys()].sort();
}

/**
 * 無主の相 — どの枢機卿にも執行官にも属さないフェーズ (憲法 第23条)
 *
 * DAG に相を足すのは forge.js、統べる者を決めるのは clergy.js。二箇所ある以上、
 * 片方だけ更新すれば **誰も審査しない相** が生まれる。実際 `prove` を新設した
 * 直後がその状態だった。宙吊り参照と同じ病である — 名は在るが担い手が居ない。
 */
function ungovernedPhases() {
  const governed = new Set();
  for (const c of Object.values(clergy.COLLEGE || {})) for (const g of c.governs || []) governed.add(g);
  for (const g of (clergy.TRIBUNAL && clergy.TRIBUNAL.governs) || []) governed.add(g);
  const out = [];
  for (const scale of Object.keys(forge.SCALES)) {
    for (const t of forge.buildDag('probe', scale).tasks) {
      if (!governed.has(t.id) && !out.some(o => o.phase === t.id)) out.push({ phase: t.id, scale });
    }
  }
  return out;
}

/**
 * 階層が実体を持っているか (憲法 第25条)
 *
 * 第21条は「名を口にする全ての口を見よ」と定めたが、その適用は**神官に限られて
 * いた**。ゆえに信徒13名が全員名前だけのまま、門は緑を出し続けた。同じ病が、
 * 検査の視野の外で生きていたのである。
 *
 * 外部調査 (Claude Agent SDK docs) が第一原因を名指ししている:
 *   「allowedTools に Agent(旧 Task) が無いと起動は拒否される。
 *     これが『宣言はあるが起動しない』の第一原因である」
 *
 * よって三つを検める:
 *   ① 信徒に実体があるか          — 名前だけの階層を許さない
 *   ② 信徒を持つ神官が起動の権能を持つか — 権能なき親は黙って兼務に倒れる
 *   ③ 宣言した深さが実行基盤の上限内か   — 越えれば黙って実行に落ちる
 */
function hierarchyIntegrity(agentsDir) {
  const dir = agentsDir || path.join(os.homedir(), '.claude', 'agents');
  let files;
  try { files = fs.readdirSync(dir).filter(f => f.endsWith('.md')); } catch {
    return { skipped: true, findings: [] };
  }
  if (!files.length) return { skipped: true, findings: [] };
  const have = new Set(files.map(f => f.replace(/\.md$/, '')));
  /**
   * `tools:` 行の**不在**は「道具を持たない」ではなく「親から全て継承する」である。
   * 空配列を返すと全継承の神官を権能なしと誤断し、偽の警報になる。
   * 判定できない状態と、判定して欠けている状態を混同してはならない(第16条)。
   */
  const toolsOf = (name) => {
    try {
      const src = fs.readFileSync(path.join(dir, `${name}.md`), 'utf8');
      const m = src.match(/^tools:\s*(.+)$/m);
      return m ? m[1].split(',').map(s => s.trim()) : null;   // null = inherits all
    } catch { return null; }
  };

  const findings = [];
  for (const [cid, c] of Object.entries(clergy.COLLEGE || {})) {
    const believers = c.believers || [];
    if (!believers.length) continue;

    // ① 信徒の実体
    for (const b of believers) {
      if (!have.has(b)) {
        findings.push({ code: 'BELIEVER_MISSING', cardinal: cid, believer: b,
          message: `信徒 ${b} に実体がない — ${cid} の組織図にいるが出勤しない` });
      }
    }
    // ② 神官の起動権能
    for (const p of c.priests || []) {
      if (!have.has(p)) continue;   // 神官不在は別途 dangling で捕らえる
      const tools = toolsOf(p);
      if (tools === null) continue;   // 全継承 = 起動の権能も継承している
      if (!tools.includes(clergy.SPAWN_TOOL)) {
        findings.push({ code: 'PRIEST_CANNOT_SPAWN', cardinal: cid, priest: p,
          message: `神官 ${p} は信徒を擁するが起動の道具 ${clergy.SPAWN_TOOL} を持たない — ` +
                   '起動は黙って拒否され、階層は宣言だけになる' });
      }
    }
  }
  // ③ 深さ
  const declared = 3;   // pontiff(0) → cardinal(1) → priest(2) → believer(3)
  if (declared > clergy.MAX_SPAWN_DEPTH) {
    findings.push({ code: 'DEPTH_EXCEEDS_RUNTIME',
      message: `宣言した深さ ${declared} が実行基盤の上限 ${clergy.MAX_SPAWN_DEPTH} を超える` });
  }
  return { skipped: false, findings };
}

function installedAgents(dir) {
  try {
    return new Set(fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')));
  } catch { return null; }
}

function check(agentsDir, opts) {
  const dir = agentsDir || path.join(os.homedir(), '.claude', 'agents');
  const map = referenceMap(opts);
  const need = [...map.keys()].sort();
  const sources = {};
  for (const [a, s] of map) sources[a] = [...s].sort();
  const have = installedAgents(dir);
  if (!have || have.size === 0) {
    return { ok: true, skipped: true, dir, need, sources, missing: [], dangling: [],
             note: 'no harness at this path — nothing to verify' };
  }
  const missing = need.filter(a => !have.has(a));
  // 宙吊り参照 = 欠けている神官 × それを名指した出所
  const dangling = missing.map(a => ({ agent: a, namedBy: sources[a] }));
  const ungoverned = ungovernedPhases();
  const hier = hierarchyIntegrity(dir);
  const hierFindings = hier.findings || [];
  return {
    ok: missing.length === 0 && ungoverned.length === 0 && hierFindings.length === 0,
    skipped: false,
    dir, need, sources, missing, dangling, ungoverned, hierarchy: hierFindings,
    note: missing.length
      ? `${missing.length} agent(s) named by the paradise do not exist`
      : (ungoverned.length
          ? `${ungoverned.length} phase(s) belong to no cardinal and no tribunal`
          : (hierFindings.length
              ? `${hierFindings.length} hierarchy defect(s): the ladder is declared but cannot be walked`
              : 'every named priest exists, every phase has a master, the hierarchy is real')),
  };
}

if (require.main === module) {
  if (process.argv.includes('--list')) {
    const map = referenceMap();
    for (const a of [...map.keys()].sort()) console.log(a, '←', [...map.get(a)].sort().join(', '));
    process.exit(0);
  }
  const res = check(process.argv[2]);
  console.log('═══════ ⛪ AGENT PRESENCE ═══════');
  console.log('agents dir:', res.dir);
  console.log('named by the paradise:', res.need.length, '(forge.js + clergy.js + examples)');
  if (res.skipped) console.log('  (harness not installed here — check skipped)');
  else if (res.dangling.length) {
    for (const d of res.dangling) console.log(`  🔴 missing: ${d.agent}  ← named by ${d.namedBy.join(', ')}`);
  } else console.log('  ✓ all present');
  if (!res.skipped) {
    if (res.ungoverned && res.ungoverned.length) {
      for (const u of res.ungoverned) console.log(`  🔴 ungoverned phase: ${u.phase}  (scale: ${u.scale}) — no cardinal, no tribunal`);
    } else console.log('  ✓ every phase has a master');
    if (res.hierarchy && res.hierarchy.length) {
      for (const h of res.hierarchy) console.log(`  🔴 [${h.code}] ${h.message}`);
    } else console.log('  ✓ the hierarchy is real, not declared');
  }
  console.log('─────────────────────────────────');
  console.log(res.note);
  console.log('═════════════════════════════════');
  process.exit(res.ok ? 0 : 1);
}

module.exports = { check, requiredAgents, referenceMap, installedAgents, ungovernedPhases, hierarchyIntegrity, PSEUDO };
