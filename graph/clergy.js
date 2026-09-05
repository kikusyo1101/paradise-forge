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

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const RANKS = {
  god:       { level: 0, title: 'God 神',        role: 'issues the wish, receives only answers' },
  pontiff:   { level: 1, title: 'Pontiff 教主',   role: 'governs the whole; the session itself',
               model: 'fable', effort: 'xhigh',
               why: '一度の座で終わらぬ仕事を持つ。計画の全体を保ち、全ての結果を照合し、最終の決を下す',
               /**
                * 教主の権能は三段の序列である (第52条)。
                *
                * かつてここは `role` の一文だけだった。ゆえに「教主が何をしてよいか」は
                * 散文の解釈に委ねられ、実測すると非merge 113件すべてが教主の名義であった。
                * 神託の訂正が定めた三段を **配列** で持つ —— **順序そのものが法だからである。**
                * 序列は下るほど例外であり、序列3は最後の手段である。
                * 閾値は写経しない。数は `graph/spawn-trace.js tiers` が語る (第41条)。
                */
               tiers: [
                 { n: 1, ja: '委譲',     what: '担える役者に為させる',           when: '既定' },
                 { n: 2, ja: '編成',     what: 'オーケストレーションを組む',     when: '複雑かつ長大なとき' },
                 { n: 3, ja: '教主の手', what: '教主が自ら行う',                 when: '単純かつ文脈の小さいときに限る。例外' },
               ],
               /**
                * 神託が数えた教主の役割。順序が法であるのは `tiers` だけなので、
                * ここは鍵で引ける object にする。
                */
               duties: {
                 manage:      '神と作業者の間に立ち、進行を管理する',
                 dispatch:    '発令書を書き、指示を出す',
                 reconcile:   '結果を実物とコマンド出力で確認する',
                 orchestrate: '必要なら新しいオーケストレーションを組む',
                 ordain:      'Agent 定義を鍛造し、サブエージェントを使う',
                 commune:     '神と会話する',
               } },
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
 * 神官は誰一人持っていなかった。ゆえに信徒13名は名前だけの存在であり続けた。
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
 * ただのラベルであり、教主が神官を直接呼んで階層を素通りしていた。
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
    // `assess`(事実を突き合わせて筋を立てる)は forge で requirements-analyst と
    // 宣言されているのに、この麾下に居なかった。marshalPlan は他家の神官への
    // 発令を正しく拒み、筆頭へ落としていた — **宣言と発令が静かに食い違って
    // いた**(第25条)。指揮系統を跨がせるのではなく、麾下に加えて正す。
    priests: ['market-researcher', 'auditor', 'reporter', 'requirements-analyst'],
    work: 'research',      // 独立した問い(外の世界 / 手元の実測) → 並列が効く
    believers: ['web-scout', 'feature-ranker', 'data-collector'],
    reviewClass: 'executor',           // 諐問の結論は執行官が検める — 断罪ではなく助言の質を
    pdca: 'plan: 問いを立てる → do: 外を調べ手元を測る → check: 反証に耐えたか? → act: 根拠を足すか結論を弱める',
  },
  /**
   * 作図 (Cartography) — 楽園が己の姿を図にする道を統べる枢機卿 (第47条・第48条)。
   *
   * この枢機卿が居ない間、作図の相は governs の穴に落ちていた。
   * `cardinalFor('draft')` は null を返し、**主の居ない相**になる —
   * 第25条が名指しで禁じた状態である。
   *
   * 相名の衝突に注意 (第17条): `survey` と `measure` は counsel 枢機卿が既に
   * 統べている。同じ名を二人が governs すれば cardinalFor が先勝ちで嘘を返す。
   * ゆえに作図の道は `chart-survey` `chart-measure` と名を分ける。
   */
  'cartography': {
    agent: 'cardinal',
    domain: 'Cartography (作図)',
    governs: ['chart-survey', 'frame', 'draft', 'render', 'chart-measure', 'behold'],
    // frame(何を語り何を語らぬか)は要件の仕事である。描き手に決めさせれば
    // 「描けるもの」が主題になる。ゆえに requirements-analyst をこの枢機卿の
    // 麾下にも置く — **神官は一人の枢機卿の私物ではない**(architect は既に
    // architecture と construction の二人に仕えている)。
    priests: ['auditor', 'requirements-analyst', 'architect', 'ux-reviewer'],
    // 図は一つの絵に収束せねばならない。主題を分けて並列に描けば、
    // 同じ事実を別の流儀で語る二枚が生まれる — 設計と同じ性質である。
    work: 'design',
    believers: ['data-collector', 'interface-designer'],
    // 図が事実を写経していないかは、事実を持つ engine を知る者にしか裁けない。
    // ゆえに審査は執行官 — 図は楽園自身を語るので、どの枢機卿も自分の領分に
    // ついて自分に都合よく描きうる(自らを批准しない)。
    reviewClass: 'executor',
    pdca: 'plan: 何を語り何を語らぬか決める → do: engine から IR を組み描く → check: 実ブラウザで測り目で見る → act: 文言を削るか主題を分ける',
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
 * 神官の marshalling plan — その相を、誰がどう分けて働くか。
 *
 * かつてここは `mode: 'single-writer-or-nested'` を返していた。「入れ子が
 * できる環境なら信徒を生む、できなければ神官が兼務する」という両睨みである。
 * それは敗北宣言であった — **実際には入れ子は可能だった**。
 * Claude Code の MAX_SUBAGENT_SPAWN_DEPTH は既定 3 であり、
 * 教主→枢機卿→神官→信徒 は物理的に成立する。両睨みでいる限り
 * 信徒は永遠に実体を持たない側に倒れ続け、事実そうなっていた（13名全員が名前だけ）。
 *
 * よって計画は**実在性を伴って**返す: どの信徒が実体を持ち、神官が起動の権能
 * (Task) を持つか。持たないなら `blocked` と正直に述べる — 黙って兼務に
 * 倒れることはしない。
 */
/**
 * 相 → その相を率いる神官。
 *
 * ⚠️ かつてここは `c.priests[0]` を無条件に返していた。コメントは「相に最も適した
 * 神官を選ぶ」と述べていたのに、実装は先頭固定 — 散文が機構を騙っていた(第33条)。
 * 実害: 諐問の道の6相すべてが `market-researcher` に発令され、**auditor と
 * reporter は一度も指揮されなかった**。実体を作りながら命令が届かないのは
 * 第25条「歩けぬ階層は階層ではない」そのものである。
 *
 * ここに無い相は従来どおり枢機卿の筆頭神官に落ちる(既存の道を壊さないため)。
 */
const PHASE_LEAD = {
  // 諐問の道 — 外を調べる者、手元を測る者、編む者は別人である
  survey:     'market-researcher',  // 外の世界の先行事例を調べる
  measure:    'auditor',            // 手元の系を実測する(Edit を持たぬ読み取り専用)
  assess:     'auditor',            // 集めた事実を突き合わせる
  synthesize: 'reporter',           // 人が読める報告書に編む
  counsel:    'reporter',           // 推奨と根拠を献じる
  // counter(反証)は counsel 枢機卿が統べる。理想は self-critic だが彼は tribunal の
  // 執行官であり counsel の神官ではない — 指揮系統を跨いだ発令はしない。ゆえに
  // 実測に忠実な auditor が反証を担う。「己の結論を疑う」のは測る者の役目に近い。
  counter:    'auditor',
  /**
   * 作図の道 — 測る者、決める者、描く者、見る者は別人である (第47条・第48条)。
   *
   * ここを書かなければ、作図の6相すべてが筆頭神官 auditor に発令される。
   * auditor は読み取り専用(Edit を持たない)なので、**描く相が永久に描けない**。
   * 諐問の道で同じ病が既に一度起きている(6相全てが market-researcher へ発令され、
   * auditor と reporter は一度も指揮されなかった)。同じ穴に二度落ちない。
   *
   * frame(主題を定める)は requirements-analyst — 何を語らないかを決めるのは
   * 要件の仕事であり、描き手に決めさせれば「描けるもの」が主題になってしまう。
   */
  'chart-survey':  'auditor',        // 事実がどの engine に住むかを実測する
  frame:           'requirements-analyst', // 何を語り何を語らぬかを定める
  draft:           'architect',      // engine から IR を組む
  render:          'architect',      // 描画器の診断が消えるまで直す
  'chart-measure': 'ux-reviewer',    // 実ブラウザで溢れと字の大きさを測る
  behold:          'ux-reviewer',    // 人の目で意味の破れを見る
  /**
   * 既存の道の穴 — 作図の道を作る過程で露見した (第25条)。
   *
   * `prove`(門を壊して鳴らす)と `docs`(文書を更新する)は construction/quality
   * 枢機卿の governs に在るが、PHASE_LEAD に無かったので**筆頭神官**に落ちていた。
   * 実測: prove は tdd-guide と宣言されているのに architect へ発令され、
   * docs は doc-updater と宣言されているのに code-reviewer へ発令されていた。
   * reform の道は毎PRこれを踏んでいた — 試験を書く者に実装者が、
   * 文書を書く者に審査官が化けていたのである。
   */
  prove:  'tdd-guide',      // 門をわざと壊して鳴らすのは試験の神官の仕事
  docs:   'doc-updater',    // 文書は文書の神官が書く
  tests:  'tdd-guide',      // 同じ理由。construction の筆頭は architect である
  /**
   * 品質枢機卿は4人の神官を擁するが、PHASE_LEAD が無いので全相が筆頭
   * (code-reviewer)へ落ちていた。**security が最も重い** — 秘密の見逃しは
   * BLOCK級の違憲であり(第4条)、そのために security-reviewer だけが
   * opus/xhigh に格上げされている(第31条 MODEL_EXCEPTIONS)。宛先が違えば
   * **その格上げは一度も効いていなかった**ことになる。
   */
  security:    'security-reviewer',
  'ux-review': 'ux-reviewer',      // 表層を裁く目は、ロジックを裁く目と別人である(第18条)
  review:      'code-reviewer',    // 筆頭と同じだが、明示して筆頭依存を断つ
  /**
   * 諐問の道の残り。`assess` は requirements-analyst と宣言されているが
   * counsel 枢機卿の麾下に居なかったため、筆頭 auditor へ落ちていた。
   * `counsel` は executor(執行官)と宣言されている — 執行官は枢機卿の
   * 麾下ではないので、この相の宛先は forge の宣言を正とし、
   * PHASE_LEAD では触れない(触れれば指揮系統を跨ぐ)。
   */
  assess:  'requirements-analyst',
};

/**
 * LEXICON — 正典の名 (憲法 第41条)
 *
 * 神が名を定めた。位階と枢機卿団の名は**一つの出所**を持ち、散文はそれに従う。
 * 名が揺れる階層は歩けない — 「神官」と「神官」が同じ者を指すなら、読む者は
 * 二つの階層があると学ぶ。第25条(歩けぬ階層は階層ではない)の言語版である。
 *
 * `forbidden` は「その名で呼んではならぬ異名」— lexiconCheck が散文を裁く。
 */
const LEXICON = {
  ranks: {
    god:      { en: 'God',      ja: '神',     forbidden: [] },
    pontiff:  { en: 'Pontiff',  ja: '教主',   forbidden: ['教皇', '法王'] },
    cardinal: { en: 'Cardinal', ja: '枢機卿', forbidden: ['大司教'] },
    priest:   { en: 'Priest',   ja: '神官',   forbidden: ['司祭'] },
    believer: { en: 'Believer', ja: '信徒',   forbidden: ['信者'] },
    executor: { en: 'Executor', ja: '執行官', forbidden: ['執行者'] },
  },
  college: {
    discovery:    { en: 'Discovery',    ja: '調査',     forbidden: ['探索部'] },
    requirements: { en: 'Requirements', ja: '要件',     forbidden: [] },
    architecture: { en: 'Architecture', ja: '設計',     forbidden: [] },
    construction: { en: 'Construction', ja: '建造',     forbidden: ['建設'] },
    quality:      { en: 'Quality',      ja: '品質',     forbidden: [] },
    counsel:      { en: 'Counsel',      ja: '諐問',     forbidden: ['諮問', '審問'] },
    cartography:  { en: 'Cartography',  ja: '作図',     forbidden: ['製図', '図画'] },
    tribunal:     { en: 'Tribunal',     ja: '断罪機関', forbidden: ['裁判所', '法廷'] },
  },
};

/** 正典の呼び名 — `Priest 神官` の形。表示は必ずここを通す。 */
function title(key) {
  const e = LEXICON.ranks[key] || LEXICON.college[key];
  return e ? `${e.en} ${e.ja}` : key;
}

/**
 * 異名の門 — 散文に禁じられた名が住んでいないか裁く (第41条)。
 * 引数はテキストの配列 [{file, text}]。返すのは違反の一覧。
 * 「なぜ禁じたか」を必ず添える — 名指ししない門は直し方を教えない。
 */
function lexiconCheck(docs) {
  const findings = [];
  const entries = [
    ...Object.entries(LEXICON.ranks).map(([k, v]) => [k, v, 'rank']),
    ...Object.entries(LEXICON.college).map(([k, v]) => [k, v, 'college']),
  ];
  for (const { file, text } of docs) {
    const lines = text.split(/\r?\n/);
    for (const [key, spec, kind] of entries) {
      for (const bad of spec.forbidden) {
        // 行番号まで名指しする — 「どこかに在る」は直せない指摘である
        lines.forEach((line, i) => {
          // 辞書そのものと、異名を語るために異名を書く行は裁かない。
          // 門に名前付きの脱出口を与える — 逃げ道の無い門は、いずれ黙って外される。
          if (line.includes('forbidden:') || line.includes('LEXICON-EXEMPT')) return;
          if (line.includes(bad)) findings.push({
            file, line: i + 1, kind, key, found: bad, want: spec.ja,
            why: `${kind === 'rank' ? '位階' : '枢機卿団'} ${key} の正典の名は「${spec.ja}」(${spec.en}) — 「${bad}」は異名 (第41条)`,
          });
        });
      }
    }
  }
  return findings;
}

function marshalPlan(phaseId, opts = {}) {
  const card = cardinalFor(phaseId);
  const c = COLLEGE[card];
  if (!c) return { cardinal: card, priest: null, believers: [], mode: 'unknown' };
  // 相に相応しい神官を選ぶ。ただし **その枢機卿が実際に擁する者に限る** —
  // 表が古びて他家の神官を指しても、指揮系統を跨いだ発令はしない。
  const wanted = PHASE_LEAD[phaseId];
  const priest = (wanted && (c.priests || []).includes(wanted)) ? wanted : c.priests[0];
  const believers = c.believers || [];
  const canSpawn = opts.priestCanSpawn === undefined ? null : !!opts.priestCanSpawn;
  return {
    cardinal: card,
    domain: c.domain,
    priest,
    believers,
    division: believers.map(b => ({ believer: b, does: believerRole(b) })),
    depth: { pontiff: 0, cardinal: 1, priest: 2, believer: 3, max: MAX_SPAWN_DEPTH },
    // 実体化された階層では神官が信徒を起動する。権能が無ければ黙らず塞がっていると言う。
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

/**
 * 門が己の走行中に産む一時報告書か。
 *
 * **教訓 gate-own-debris の再発である** — 「門は己の作業場の残骸で不定に鳴っては
 * ならぬ。ただし掃除してよいのは門自身の作業場だけで、成果物の住処に触れてはならない」。
 * atlas で一度直した同じ病が、今度は lexicon 門で起きた。実測した経路:
 *   1. tribunal.yml が `critic.js review --lessons` の出力を倉のルートの verdict.md へ流す
 *   2. その出力には教訓 canonical-lexicon-41 の本文がそのまま載る。教訓文それ自体が
 *      異名を引用している (教訓 canonical-lexicon-41 の一文がまさに異名を論じている)
 *   3. 同じジョブが続けて paradise.test.js を回し、lexicon-check が倉を歩いて
 *      **さっき自分の隣人が書いた verdict.md を拾い**、行番号つきで赤を出す
 *
 * なぜ除外してよいか。第41条が裁く対象は**版管理下の散文**である — 神と教主が
 * 読み、腐れば名の揺れが人に伝染する現物のことだ。verdict.md / verdict-report.json は
 * .gitignore にも載らぬ走行中の残骸であり、誰も読まず、次の走行で上書きされ、
 * 掃除されれば消える。散文ではない。門の出力を門の入力に混ぜれば、判定は
 * ファイルの残り方という**走行順序**に依存し、門は不定に鳴る。不定に鳴る門は
 * 門ではない (第21条)。
 *
 * ゆえに触れるのは「門自身が産んだ残骸」だけである。版管理下の .md には一切
 * 手心を加えない — そちらは今まで通り、異名が一つでも住めば赤くなる。
 */
const GATE_DEBRIS = /^verdict\.md$|^verdict-report\.json$/;
function isGateDebris(p) {
  // ルート直下の残骸のみ。倉の奥に同名の版管理下の散文が在れば、それは成果物である。
  return path.dirname(path.resolve(p)) === ROOT && GATE_DEBRIS.test(path.basename(p));
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
    // FR-05: --json 指定時は人間向けテキストを 1 行も混ぜない (先頭の飾り罫も出さない)。
    // 混ざれば JSON.parse が落ちる。**人間向け描画と同じ源から作る** —
    // JSON 用に別の集計を書けば、両者が食い違う日が必ず来る。
    const data = {
      cardinals: Object.entries(COLLEGE).map(([name, c]) => ({
        name, domain: c.domain, governs: c.governs, priests: c.priests,
        reviewClass: c.reviewClass, pdca: c.pdca,
      })),
      tribunal: { name: 'tribunal', domain: TRIBUNAL.domain, governs: TRIBUNAL.governs, officers: TRIBUNAL.officers },
      cardinalCount: Object.keys(COLLEGE).length,
      tribunalCount: 1,
    };
    if (process.argv.includes('--json')) { process.stdout.write(JSON.stringify(data) + '\n'); return; }
    for (const c of data.cardinals)
      console.log(`枢機卿 ${c.name}: ${c.domain}\n  governs: ${c.governs.join(', ')}\n  priests: ${c.priests.join(', ')}\n  reviewed-by: ${c.reviewClass}\n  PDCA: ${c.pdca}\n`);
    console.log(`執行官 tribunal: ${data.tribunal.domain}\n  governs: ${data.tribunal.governs.join(', ')}\n  officers: ${data.tribunal.officers.join(', ')}`);
    return;
  }
  if (cmd === 'lexicon') {
    // 正典の名を語る (第41条)。散文はここに従う — ここが唯一の出所である。
    console.log('═══ LEXICON — 正典の名 (第41条) ═══\n');
    console.log('位階 (Ecclesiastical Hierarchy):');
    for (const [k, v] of Object.entries(LEXICON.ranks))
      console.log(`  ${v.en.padEnd(10)} ${v.ja.padEnd(5)}  ${k.padEnd(9)}${v.forbidden.length ? '  ✗ 異名: ' + v.forbidden.join(', ') : ''}`);
    console.log('\n枢機卿団 (College of Cardinals):');
    for (const [k, v] of Object.entries(LEXICON.college))
      console.log(`  ${v.en.padEnd(14)} ${v.ja.padEnd(6)}  ${k.padEnd(13)}${v.forbidden.length ? '  ✗ 異名: ' + v.forbidden.join(', ') : ''}`);
    return;
  }
  if (cmd === 'lexicon-check') {
    // 散文に異名が住んでいないか裁く。CI はこれで名の揺れを止める。
    // .yml も散文である — CI の段名に異名が住めば、神は毎回それを読む。
    // 門が見ない拡張子は、門が無いのと同じ (第21条)。
    const exts = ['.md', '.js', '.json', '.yml', '.yaml'];
    const skip = /node_modules|[\\/]\.git[\\/]|dashboard[\\/]state\.|graph[\\/]lessons\.json|[\\/]reform[\\/]|paradise-kg/;
    const docs = [];
    (function walk(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (skip.test(p)) continue;
        if (isGateDebris(p)) continue;
        if (e.isDirectory()) { if (e.name !== '.git' && e.name !== 'node_modules') walk(p); continue; }
        if (!exts.includes(path.extname(e.name))) continue;
        docs.push({ file: path.relative(ROOT, p), text: fs.readFileSync(p, 'utf8') });
      }
    })(ROOT);
    const findings = lexiconCheck(docs);
    console.log('═══ 🕮  LEXICON CHECK (第41条) ═══');
    if (!findings.length) console.log(`  ✓ ${docs.length} 文書に異名なし — 名は一つの出所に従っている`);
    for (const f of findings) console.log(`  🔴 ${f.file}:${f.line}  「${f.found}」→「${f.want}」  ${f.why}`);
    console.log('═══════════════════════════════════');
    process.exit(findings.length ? 1 : 0);
  }
  console.error('commands: chart | college | cardinal-for <phaseId> | lexicon | lexicon-check');
  process.exit(2);
}
if (require.main === module) main();
module.exports = { RANKS, EFFORT_SUPPORT, supportsEffort, COLLEGE, TRIBUNAL, MODEL_EXCEPTIONS, SPAWN_TOOL, MAX_SPAWN_DEPTH, MAX_CONCURRENT, RUNTIME_CONCURRENT, EFFECTIVE_CONCURRENT, PARALLEL_SAFE, cardinalFor, modelFor, allPriests, allBelievers, marshalPlan, believerRole, groupByCardinal, orgChart, LEXICON, title, lexiconCheck, isGateDebris };
