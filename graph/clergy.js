#!/usr/bin/env node
/**
 * PARADISE :: Clergy — the Ecclesiastical Hierarchy (聖職位階)
 * ---------------------------------------------------------------------
 * The organization model of the paradise, as a multi-level supervisor
 * hierarchy (hierarchical multi-agent orchestration, LangGraph supervisor-
 * of-supervisors, recursive delegation).
 *
 *   God (神)        — the user. Issues the divine wish. Receives only answers.
 *   Pontiff (教主)  — YOU, the session. Receives the wish, governs the whole.
 *   Cardinal (枢機卿)— a DOMAIN supervisor. Owns one domain's orchestration and
 *                     runs its own inner PDCA loop. (discovery, requirements,
 *                     architecture, construction, quality...)
 *   Priest (神官)   — a LARGE subagent a cardinal dispatches for a big unit of work.
 *   Believer (信徒) — a SMALL subagent a priest would spawn for fine work.
 *   Executor (執行官)— the independent tribunal: judges on demand, answerable to
 *                     no cardinal. (verdict / critic / self-critic)
 *
 * Reviews & approvals are done by the APPROPRIATE CLASS: a cardinal reviews its
 * priests' work; the tribunal judges creations; the pontiff ratifies domains.
 *
 * This file is the declarative org chart + the rules that bind it. conclave.js
 * is the engine that runs it.
 */
'use strict';

/**
 * 効力を持つ effort の段(公式表, 2026-08 実測)。
 *   Fable 5 / Opus 5 / Sonnet 5 / Opus 4.8 / 4.7 : low medium high xhigh max
 *   Opus 4.6 / Sonnet 4.6                       : low medium high max
 *   Haiku 4.5                                   : **effort を持たない**
 * 持たないモデルに effort を書くと黙って捨てられる。捨てられる宣言は
 * 宣言ではない(第10条) — ゆえに信徒の effort は null であり、
 * apply-models はキーそのものを書かない。
 */
const EFFORT_SUPPORT = {
  'fable': ['low', 'medium', 'high', 'xhigh', 'max'],
  'claude-fable-5': ['low', 'medium', 'high', 'xhigh', 'max'],
  'opus': ['low', 'medium', 'high', 'xhigh', 'max'],
  'claude-opus-5': ['low', 'medium', 'high', 'xhigh', 'max'],
  'sonnet': ['low', 'medium', 'high', 'xhigh', 'max'],
  'claude-sonnet-5': ['low', 'medium', 'high', 'xhigh', 'max'],
  'haiku': [],   // Haiku 4.5 は effort を受けない
  'claude-haiku-4-5': [],
};

/** そのモデルはその effort を受けるか。受けないなら書いてはならない。 */
function supportsEffort(model, effort) {
  if (effort == null) return true;
  const levels = EFFORT_SUPPORT[model];
  if (!levels) return true;      // 未知のモデルは咎めない(門は名を知らぬものに吠えない)
  return levels.includes(effort);
}

const RANKS = {
  god:       { level: 0, title: 'God 神',        role: 'issues the wish, receives only answers' },
  pontiff:   { level: 1, title: 'Pontiff 教主',   role: 'governs the whole; the session itself',
               model: 'fable', effort: 'xhigh',
               why: '一度の座で終わらぬ仕事を持つ。計画の全体を保ち、全ての結果を照合し、最終の決を下す' },
  cardinal:  { level: 2, title: 'Cardinal 枢機卿', role: 'domain supervisor; owns a sub-DAG + inner PDCA',
               model: 'claude-opus-5', effort: 'xhigh',
               why: '批准と差戻しが品質を決める。量は少なく賭金は高い — 上げても総額はほぼ動かない' },
  priest:    { level: 3, title: 'Priest 神官',    role: 'large subagent dispatched by a cardinal',
               model: 'claude-sonnet-5', effort: 'high',
               why: '生成の本体がここを流れる。ここを上げると全てが高くつく — 据え置きが正しい' },
  believer:  { level: 4, title: 'Believer 信徒',   role: 'small subagent for fine-grained work',
               model: 'haiku', effort: null,
               why: '機械的・大量・判断の要らぬ仕事(探索, lint, 走査)。Haiku 4.5 は effort を持たない' },
  executor:  { level: -1, title: 'Executor 執行官', role: 'independent tribunal; judges on demand',
               model: 'claude-opus-5', effort: 'xhigh',
               why: '見逃した断罪は壊れた創造物を出荷する。裁く者は決して安く上げない' },
};

/**
 * Model policy (Constitution Art. 12): capability is assigned by RANK.
 * Judgment ranks (pontiff / cardinal / executor) get the strongest model;
 * generative work scales to sonnet; mechanical volume to haiku.
 * EXCEPTIONS override a rank's default where a miss is unrecoverable.
 */
const MODEL_EXCEPTIONS = {
  // A security miss is a constitutional BLOCK-level breach — never run it cheap.
  'security-reviewer': { model: 'claude-opus-5', effort: 'xhigh', why: '秘密の見逃しは回復不能(BLOCK級の違憲)' },
  // A bad plan poisons every downstream phase — planning is judgment, not generation.
  'planner': { model: 'claude-opus-5', effort: 'xhigh', why: '誤った計画は下流の全相を汚染する。計画は生成ではなく判断である' },
  // Tribunal officers inherit the executor rank, not the priest rank.
  'self-critic':    { model: 'claude-opus-5', effort: 'xhigh', why: '執行官 — 敵対的批評は断罪に先立つ' },
  'creation-judge': { model: 'claude-opus-5', effort: 'xhigh', why: '執行官 — 拘束力ある裁定を下す' },
  // 見た目の審査は「判断」であって量産ではない。何が醜いか・何が使いにくいかは
  // 規則の照合では決まらず、人が見て嫌がるかどうかで決まる(憲法 第18条)。
  'ux-reviewer': { model: 'claude-opus-5', effort: 'xhigh', why: '趣味は判断である: 表層の欠陥は全ての利用者に届き、規則だけでは見えない' },
  'cardinal':       { model: 'claude-opus-5', effort: 'xhigh', why: '枢機卿の位階そのもの' },
  'executor':       { model: 'claude-opus-5', effort: 'xhigh', why: '執行官の位階そのもの' },
};

/** Resolve the model+effort for an agent by name, using rank defaults + exceptions. */
function modelFor(agentName, rank) {
  if (MODEL_EXCEPTIONS[agentName]) return { agent: agentName, ...MODEL_EXCEPTIONS[agentName], source: 'exception' };
  const r = RANKS[rank || 'priest'];
  return { agent: agentName, model: r.model, effort: r.effort, why: r.why, source: 'rank:' + (rank || 'priest') };
}

/** Every believer role in the college (they run at the believer rank). */
function allBelievers() {
  const out = new Set();
  for (const c of Object.values(COLLEGE)) (c.believers || []).forEach(b => out.add(b));
  return [...out];
}

/** Every priest role in the college. */
function allPriests() {
  const out = new Set();
  for (const c of Object.values(COLLEGE)) (c.priests || []).forEach(p => out.add(p));
  for (const o of TRIBUNAL.officers) out.add(o);
  return [...out];
}

/**
 * 起動の権能 — 誰が誰を呼べるか (憲法 第25条)
 *
 * 調査で判明した決定的事実 (Claude Agent SDK docs):
 *   「allowedTools に "Agent"(旧 Task) が無いと、サブエージェント起動は
 *     permission callback に落ちるか dontAsk モードで拒否される。
 *     **これが『宣言はあるが起動しない』の第一原因である**」
 *
 * 楽園はまさにこれを踏んでいた。実測すると `Task` を持つのは cardinal 只一人で、
 * 司祭は誰一人持っていなかった。ゆえに信徒13名は名前だけの存在であり続けた。
 * 怠慢ではなく **通れない道** だったのである。
 *
 * よって権能は宣言でなくデータとして持ち、門が検める。
 */
const SPAWN_TOOL = 'Task';          // Claude Code が他エージェントを起動する道具
const MAX_SPAWN_DEPTH = 3;          // CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH の既定値
const RUNTIME_CONCURRENT = 20;      // CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS の既定値（天井）

/**
 * 実用並列度 — 天井ではなく、効く範囲 (憲法 第26条)
 *
 * 天井(20)を並列度として使ってはならない。調査が数で否定している:
 *   - arXiv:2512.08296「ターン数はチーム規模に超線形 T ∝ n^1.724。
 *     実用的な有効チーム規模は 3–4体」「協調複雑度に対し性能は逆U字」
 *   - HumanLayer 12-Factor「1エージェントは3–10、最大20ステップ」
 * 「もっと並べれば速い」は逆U字の右側で嘘になる。
 */
const EFFECTIVE_CONCURRENT = 4;
const MAX_CONCURRENT = EFFECTIVE_CONCURRENT;   // 発令はこちらに従う

/**
 * 並列してよい仕事か — 分割してよい仕事と、してはならない仕事 (憲法 第26条)
 *
 * 調査が名指しで警告している。Cognition「Don't Build Multi-Agents」:
 *   「行動は暗黙の決定を運ぶ。サブエージェント同士が互いの決定を見られない限り、
 *     矛盾した前提に基づく成果物が生まれる」— Flappy Bird の実例では、一方が
 *     Super Mario 風の背景を作り、他方が Flappy Bird らしくない鳥を作った。
 * Anthropic も明言: 「全エージェントが同じ文脈を要するドメイン、依存の多い
 *   ドメインは今日のマルチエージェントに向かない。**コーディングタスクが特にそう**」。
 *
 * 楽園の建造ドメイン(module-builder / test-writer)はまさに実装作業である。
 * 並べれば矛盾した実装が生まれる。**調査は私の設計を検証せず、反証した。**
 * ゆえに仕事の性質で並列可否を分ける — 分けずに一律で並べる方が危険である。
 */
const PARALLEL_SAFE = {
  // 文脈を分離でき、成果が独立している仕事 — 並列が効く
  research: { parallel: true,  why: '独立した問いに分けられ、成果は出典付きの事実で衝突しない' },
  review:   { parallel: true,  why: '同じ成果物を別の観点で見るだけで、互いの決定に依存しない' },
  // 暗黙の決定を運ぶ仕事 — 並べると矛盾した成果物が生まれる
  build:    { parallel: false, why: '実装は暗黙の決定を運ぶ。並べれば互いに矛盾した前提で作る(Cognition/Anthropic)' },
  design:   { parallel: false, why: '設計判断は後続の全てを縛る。分割すると整合しない' },
};

/**
 * The College of Cardinals. Each cardinal owns a DOMAIN of the creation
 * lifecycle. `phases` are the forge phase ids this cardinal governs. `priests`
 * are the agent roles it may dispatch. `reviewClass` is who reviews its output
 * (appropriate-class review). `pdca` names the inner cycle it runs.
 *
 * `agent` は **その枢機卿を演じる実体**である。これが無い間、枢機卿は
 * ただのラベルであり、教主が司祭を直接呼んで階層を素通りしていた。
 */
const COLLEGE = {
  'discovery': {
    agent: 'cardinal',
    domain: 'Discovery (調査)',
    governs: ['discover'],
    priests: ['market-researcher'],
    work: 'research',      // 独立した問い → 信徒を並列に放てる
    believers: ['web-scout', 'feature-ranker'],
    reviewClass: 'pontiff',           // the pontiff ratifies findings before spec
    pdca: 'plan: frame questions → do: research → check: are must-haves grounded? → act: refine or widen search',
  },
  'requirements': {
    agent: 'cardinal',
    domain: 'Requirements (要件)',
    governs: ['analyze', 'specify'],
    priests: ['requirements-analyst'],
    work: 'design',        // 仕様判断は後続を縛る → 逐次
    believers: ['user-story-writer', 'acceptance-criteria-writer'],
    reviewClass: 'cardinal:discovery', // requirements checked against discovery
    pdca: 'plan: derive from findings → do: write spec → check: every must-have has an AC? → act: fill gaps',
  },
  'architecture': {
    agent: 'cardinal',
    domain: 'Architecture (設計)',
    governs: ['design', 'detail', 'ux', 'identity'],
    priests: ['architect'],
    work: 'design',        // 設計は分割すると整合しない → 逐次
    believers: ['data-modeler', 'interface-designer'],
    reviewClass: 'cardinal:requirements',
    pdca: 'plan: shape the system → do: design + decompose → check: does design satisfy the spec? → act: revise',
  },
  'construction': {
    agent: 'cardinal',
    domain: 'Construction (建造)',
    governs: ['build', 'build-ui', 'tests', 'prove'],
    priests: ['architect', 'tdd-guide'],
    work: 'build',         // 実装は暗黙の決定を運ぶ → 逐次(Cognition/Anthropic の警告)
    believers: ['module-builder', 'test-writer'],
    reviewClass: 'cardinal:quality',
    pdca: 'plan: take the tasks → do: implement + test → check: do tests pass? → act: fix until green',
  },
  'quality': {
    agent: 'cardinal',
    domain: 'Quality (品質)',
    governs: ['review', 'security', 'docs', 'verify', 'ux-review'],
    priests: ['code-reviewer', 'security-reviewer', 'doc-updater', 'ux-reviewer'],
    work: 'review',        // 同じ物を別の観点で見る → 並列が効く
    believers: ['linter', 'coverage-checker', 'secret-scanner'],
    reviewClass: 'executor',           // quality feeds the tribunal
    pdca: 'plan: define gates → do: review+scan+verify → check: all gates green? → act: send back or pass',
  },
  /**
   * 諐問 (Counsel) — 何も創らず、問いに答える道を統べる枢機卿。
   *
   * 建造の枢機卿しか居なかったので、「報告・集計」の担い手が一人も居なかった。
   * ゆえに調査の願いは discovery(市場調査)に丸投げされ、**手元を実測する者**も
   * **人が読める形に編む者**も居ないまま standard の build へ流れていた。
   *
   * 相名の衝突に注意: `analyze` は既に requirements 枢機卿が統べている。
   * 同じ名を二人が governs すれば cardinalFor が先勝ちで嘘を返す。ゆえに
   * 諐問の道の分析相は `assess` と名を分けてある(第17条: 名の混同は事故を生む)。
   */
  'counsel': {
    agent: 'cardinal',
    domain: 'Counsel (諐問)',
    governs: ['survey', 'measure', 'assess', 'counter', 'synthesize', 'counsel'],
    priests: ['market-researcher', 'auditor', 'reporter'],
    work: 'research',      // 独立した問い(外の世界 / 手元の実測) → 並列が効く
    believers: ['web-scout', 'feature-ranker', 'data-collector'],
    reviewClass: 'executor',           // 諐問の結論は執行官が検める — 断罪ではなく助言の質を
    pdca: 'plan: 問いを立てる → do: 外を調べ手元を測る → check: 反証に耐えたか? → act: 根拠を足すか結論を弱める',
  },
};

/**
 * The Tribunal (執行官) — independent of the college. It does not report to a
 * cardinal; it judges on demand and its verdict is binding.
 */
const TRIBUNAL = {
  domain: 'Tribunal (断罪機関)',
  governs: ['reflect', 'verdict'],
  officers: ['self-critic', 'creation-judge'],
  independence: 'answers to no cardinal; invoked by the pontiff at the judgment gate',
  law: 'reflect (adversarial self-critique) precedes verdict (SHIP/REWORK/BLOCK)',
};

/** Which cardinal governs a given forge phase id? */
function cardinalFor(phaseId) {
  for (const [name, c] of Object.entries(COLLEGE)) if (c.governs.includes(phaseId)) return name;
  if (TRIBUNAL.governs.includes(phaseId)) return 'tribunal';
  return null;
}

/**
 * 司祭の marshalling plan — その相を、誰がどう分けて働くか。
 *
 * かつてここは `mode: 'single-writer-or-nested'` を返していた。「入れ子が
 * できる環境なら信徒を生む、できなければ司祭が兼務する」という両睨みである。
 * それは敗北宣言であった — **実際には入れ子は可能だった**。
 * Claude Code の MAX_SUBAGENT_SPAWN_DEPTH は既定 3 であり、
 * 教主→枢機卿→司祭→信徒 は物理的に成立する。両睨みでいる限り
 * 信徒は永遠に実体を持たない側に倒れ続け、事実そうなっていた（13名全員が名前だけ）。
 *
 * よって計画は**実在性を伴って**返す: どの信徒が実体を持ち、司祭が起動の権能
 * (Task) を持つか。持たないなら `blocked` と正直に述べる — 黙って兼務に
 * 倒れることはしない。
 */
function marshalPlan(phaseId, opts = {}) {
  const card = cardinalFor(phaseId);
  const c = COLLEGE[card];
  if (!c) return { cardinal: card, priest: null, believers: [], mode: 'unknown' };
  // pick the priest whose skill best fits the phase (first is the default lead)
  const priest = c.priests[0];
  const believers = c.believers || [];
  const canSpawn = opts.priestCanSpawn === undefined ? null : !!opts.priestCanSpawn;
  return {
    cardinal: card,
    domain: c.domain,
    priest,
    believers,
    division: believers.map(b => ({ believer: b, does: believerRole(b) })),
    depth: { pontiff: 0, cardinal: 1, priest: 2, believer: 3, max: MAX_SPAWN_DEPTH },
    // 実体化された階層では司祭が信徒を起動する。権能が無ければ黙らず塞がっていると言う。
    mode: believers.length === 0 ? 'no-believers'
        : canSpawn === false ? 'blocked: priest lacks the spawn tool'
        : 'nested',
    requires: believers.length ? { priestTool: SPAWN_TOOL } : null,
    // 仕事の性質で並列可否が決まる(第26条)。実装を並べれば矛盾した成果物が生まれる。
    execution: (() => {
      const w = PARALLEL_SAFE[c.work] || { parallel: false, why: '性質が宣言されていない — 安全側に倒し逐次' };
      return {
        work: c.work || 'unknown',
        parallel: w.parallel,
        why: w.why,
        limit: w.parallel ? Math.min(believers.length, EFFECTIVE_CONCURRENT) : 1,
      };
    })(),
  };
}

/** A short description of what each believer role does (fine-grained work). */
function believerRole(name) {
  const roles = {
    'web-scout': 'search the web for prior art and cite sources',
    'feature-ranker': 'rank discovered features by adoption into 🔴/🟠/🟡',
    'user-story-writer': 'draft user stories from the intent',
    'acceptance-criteria-writer': 'turn requirements into checkable ACs',
    'data-modeler': 'define the state/data model',
    'interface-designer': 'define function/interface signatures',
    'module-builder': 'implement one module of the build',
    'test-writer': 'write tests for one unit',
    'linter': 'run the linter and report',
    'coverage-checker': 'measure test coverage',
    'secret-scanner': 'scan for secrets and credentials',
    'data-collector': 'collect the data for ONE question and return it raw — never interpret',
  };
  return roles[name] || 'fine-grained work under the priest';
}

/** Group an ordered phase list into cardinal domains, preserving order. */
function groupByCardinal(phaseIds) {
  const groups = [];
  let cur = null;
  for (const id of phaseIds) {
    const card = cardinalFor(id);
    if (!cur || cur.cardinal !== card) { cur = { cardinal: card, phases: [] }; groups.push(cur); }
    cur.phases.push(id);
  }
  return groups;
}

/** The full org chart, for rendering / the dashboard. */
function orgChart() {
  return {
    ranks: RANKS,
    college: COLLEGE,
    tribunal: TRIBUNAL,
    hierarchy: 'god → pontiff → cardinal(domain) → priest(large subagent) → believer(small subagent);  executor ⟂ (independent)',
  };
}

function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'chart') { console.log(JSON.stringify(orgChart(), null, 2)); return; }
  if (cmd === 'cardinal-for') { console.log(cardinalFor(arg) || '(none)'); return; }
  if (cmd === 'marshal') {
    if (!arg) { console.error('usage: clergy.js marshal <phaseId>'); process.exit(2); }
    console.log(JSON.stringify(marshalPlan(arg), null, 2)); return;
  }
  if (cmd === 'models') {
    console.log('MODEL POLICY BY RANK (Constitution Art. 12)');
    console.log('═'.repeat(72));
    for (const [k, r] of Object.entries(RANKS)) {
      if (!r.model) { console.log(`  L${r.level}  ${r.title.padEnd(20)} —        (${r.role})`); continue; }
      console.log(`  L${String(r.level).padEnd(2)} ${r.title.padEnd(20)} ${r.model.padEnd(15)} ${r.effort ? 'effort:' + r.effort : 'effort: —(未対応)'}`);
      console.log(`       ↳ ${r.why}`);
    }
    console.log('\nEXCEPTIONS (a miss here is unrecoverable):');
    for (const [name, e] of Object.entries(MODEL_EXCEPTIONS))
      console.log(`  ${name.padEnd(20)} ${e.model.padEnd(8)} effort:${String(e.effort).padEnd(6)} — ${e.why}`);
    console.log('\nRESOLVED AGENTS:');
    for (const p of allPriests()) { const m = modelFor(p, 'priest'); console.log(`  神官 ${p.padEnd(22)} ${m.model.padEnd(16)} ${m.effort ? 'effort:' + m.effort : 'effort:—'}  [${m.source}]`); }
    for (const b of allBelievers()) { const m = modelFor(b, 'believer'); console.log(`  信徒 ${b.padEnd(22)} ${m.model.padEnd(16)} ${m.effort ? 'effort:' + m.effort : 'effort:—'}  [${m.source}]`); }
    return;
  }
  if (cmd === 'model-for') {
    if (!arg) { console.error('usage: clergy.js model-for <agentName> [rank]'); process.exit(2); }
    console.log(JSON.stringify(modelFor(arg, process.argv[4]), null, 2)); return;
  }
  if (cmd === 'college') {
    for (const [name, c] of Object.entries(COLLEGE))
      console.log(`枢機卿 ${name}: ${c.domain}\n  governs: ${c.governs.join(', ')}\n  priests: ${c.priests.join(', ')}\n  reviewed-by: ${c.reviewClass}\n  PDCA: ${c.pdca}\n`);
    console.log(`執行官 tribunal: ${TRIBUNAL.domain}\n  governs: ${TRIBUNAL.governs.join(', ')}\n  officers: ${TRIBUNAL.officers.join(', ')}`);
    return;
  }
  console.error('commands: chart | college | cardinal-for <phaseId>');
  process.exit(2);
}
if (require.main === module) main();
module.exports = { RANKS, EFFORT_SUPPORT, supportsEffort, COLLEGE, TRIBUNAL, MODEL_EXCEPTIONS, SPAWN_TOOL, MAX_SPAWN_DEPTH, MAX_CONCURRENT, RUNTIME_CONCURRENT, EFFECTIVE_CONCURRENT, PARALLEL_SAFE, cardinalFor, modelFor, allPriests, allBelievers, marshalPlan, believerRole, groupByCardinal, orgChart };
