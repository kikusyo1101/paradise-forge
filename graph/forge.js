#!/usr/bin/env node
/**
 * PARADISE :: Forge — the Creation Pipeline
 * ---------------------------------------------------------------
 * Turns a small human wish into a complete, gated SDLC DAG:
 *
 *   wish -> specify -> design -> detail -> build -> verify -> VERDICT -> creation
 *
 * Synthesized from the convergent wisdom of the OSS world:
 *   - GitHub Spec Kit : spec is the source of truth; gated phases;
 *                       a Constitution of non-negotiable principles
 *   - BMAD-METHOD     : role-specialized agents (analyst/pm/architect/dev/qa/ux)
 *   - Kiro / OpenSpec : requirements.md -> design.md -> tasks -> implement
 *   - Scale-adaptive  : quick (bug fix) | standard (feature) | full (product)
 *
 * Output is a DAG consumable by graph-engine.js (topological waves).
 *
 * Usage:
 *   forge.js plan   "<wish>" [--scale quick|standard|full] [--out file.json]
 *   forge.js scale  "<wish>"          # heuristically pick a scale
 *   forge.js phases [--scale ...]     # list the phase template
 */
'use strict';
const fs = require('fs');
const path = require('path');

// ---- The Constitution: non-negotiable principles every creation obeys ----
const CONSTITUTION = [
  'Spec is the source of truth — code serves the spec, not the reverse.',
  'Every phase is gated — no phase advances on unverified assumptions.',
  'Independent work runs in parallel; dependent work runs in order.',
  'Verification precedes judgment; judgment precedes shipping.',
  'Evidence-based memory — only what actually happened is remembered.',
  'No secrets in code; security is reviewed, never assumed.',
];

/**
 * Phase templates per scale. Each phase:
 *   { id, agent, goal, deps:[ids], gate?:true, artifact?:'name' }
 * `gate:true` marks a checkpoint the verdict engine will judge.
 */
const SCALES = {
  // Quick Flow — bug fixes / tiny clearly-scoped changes (BMAD "quick flow")
  // Even quick changes get a light-touch discovery: check how it's normally done.
  quick: (wish) => [
    { id: 'discover', agent: 'market-researcher', goal: `Quick scan: how is this normally done, any obvious prior art for: ${wish}`, artifact: 'findings.md' },
    { id: 'specify', agent: 'requirements-analyst', goal: `Capture the intent of: ${wish}`, deps: ['discover'], artifact: 'requirements.md' },
    { id: 'build',   agent: 'architect',   goal: `Implement the change for: ${wish}`, deps: ['specify'], artifact: 'implementation' },
    { id: 'verify',  agent: 'verification-loop', goal: 'Run build/type/lint/test/security gates', deps: ['build'], gate: true, artifact: 'verification-report' },
    { id: 'reflect', agent: 'self-critic', goal: 'Adversarially self-critique the creation: run the critic checklist + past-miss lessons, surface gaps', deps: ['verify'], gate: true, artifact: 'critique.md' },
    { id: 'verdict', agent: 'creation-judge', goal: 'Judge: SHIP / REWORK / BLOCK', deps: ['reflect'], gate: true, artifact: 'verdict' },
  ],

  // Standard — a normal feature: discover -> full four-phase SDD + review + judgment
  standard: (wish) => [
    { id: 'discover', agent: 'market-researcher', goal: `Research prior art, popular solutions, and expected/standard features for: ${wish}. Surface user needs, not just the literal ask.`, gate: true, artifact: 'findings.md' },
    { id: 'specify',  agent: 'requirements-analyst', goal: 'Write requirements (what & why) grounded in the findings — include the table-stakes features users expect. Acceptance criteria MUST cover the UI/UX surface too (empty/loading/error states, contrast, keyboard, small screens), not only data and logic.', deps: ['discover'], artifact: 'requirements.md' },
    // UX を standard にも置く。ここが無いと最上流で要求が機能側へ偏り、
    // 下流が何をしても取り返せない(憲法 第18条)。
    { id: 'ux',       agent: 'architect', goal: 'UX design: primary flows, screen states (empty / loading / error / dense), interaction & keyboard rules, small-screen behaviour. Name what the user sees FIRST and what they do on day 30.', deps: ['specify'], artifact: 'ux.md' },
    { id: 'design',   agent: 'architect', goal: 'Basic design: architecture, data model, interfaces', deps: ['specify'], gate: true, artifact: 'design.md' },
    // 視覚アイデンティティ。design.md(構造)とは別物なので identity.md と名を分ける
    // — 名の衝突は事故を生む(憲法 第17条)。`node graph/identity.js suggest` が
    // 出す候補から一つを選び、その理由と却下理由まで書き残させる。
    { id: 'identity', agent: 'architect', goal: 'Visual identity: pick ONE direction from `node graph/identity.js suggest "<wish>" --slug <slug>` and write identity.md (palette, type, texture, motion, do/don\'t). Justify the choice AND why the others were rejected. Never default to the generic dev-tool look.', deps: ['specify'], artifact: 'identity.md' },
    { id: 'detail',   agent: 'architect', goal: 'Detailed design: decompose into ordered testable tasks', deps: ['design'], artifact: 'tasks.md' },
    { id: 'build',    agent: 'architect', goal: 'Implement the tasks against design.md (structure), ux.md (behaviour & states) and identity.md (look)', deps: ['detail', 'identity', 'ux'], artifact: 'implementation' },
    { id: 'tests',    agent: 'tdd-guide', goal: 'Write & run the test suite against requirements', deps: ['detail'], artifact: 'tests' },
    { id: 'review',   agent: 'code-reviewer', goal: 'Quality review of the implementation', deps: ['build', 'tests'], artifact: 'review' },
    // 見た目を裁く神官。ロジックの審査官とは別の目でなければ、UI は
    // 「動くから良い」で通ってしまう(憲法 第18条)。
    { id: 'ux-review', agent: 'ux-reviewer', goal: 'Judge the SURFACE: run `node graph/visual-verify.js check <dir>`, confirm identity.md and ux.md were actually honoured, drive the real browser at narrow and wide widths in BOTH themes, and report what a first-time user sees. Evidence must be measured or seen, never assumed.', deps: ['build'], artifact: 'ux-review.md' },
    { id: 'security', agent: 'security-reviewer', goal: 'Security scan of the change', deps: ['build'], artifact: 'security-report' },
    { id: 'verify',   agent: 'verification-loop', goal: 'Run all verification gates + coverage + visual verification', deps: ['review', 'security', 'ux-review'], gate: true, artifact: 'verification-report' },
    { id: 'reflect',  agent: 'self-critic', goal: 'Adversarially self-critique against findings & spec: run critic checklist + lessons. Any gap => demand REWORK before judgment', deps: ['verify'], gate: true, artifact: 'critique.md' },
    { id: 'verdict',  agent: 'creation-judge', goal: 'Judge against spec, findings, critique & constitution: SHIP / REWORK / BLOCK', deps: ['reflect'], gate: true, artifact: 'verdict' },
  ],

  // Full — a product: deep discovery + analysis, UX, and docs (BMAD full track)
  full: (wish) => [
    { id: 'discover', agent: 'market-researcher', goal: `Deep market research for: ${wish}. Study popular products, rank features by adoption, identify differentiators and unmet needs.`, gate: true, artifact: 'findings.md' },
    { id: 'analyze',  agent: 'requirements-analyst', goal: `Analyze the problem space & constraints behind: ${wish}, grounded in the findings`, deps: ['discover'], artifact: 'analysis.md' },
    { id: 'specify',  agent: 'requirements-analyst', goal: 'Write the PRD: requirements, user stories, acceptance criteria — covering expected features from the research', deps: ['analyze'], gate: true, artifact: 'prd.md' },
    // `frontend` というエージェントは存在しなかった(宙吊り参照)。UX と UI は
    // architect が担い、視覚の根拠は identity.md が与える。
    { id: 'ux',       agent: 'architect', goal: 'UX design: flows, screens, interaction rules', deps: ['specify'], artifact: 'ux.md' },
    { id: 'identity', agent: 'architect', goal: 'Visual identity: pick ONE direction from `node graph/identity.js suggest "<wish>" --slug <slug>` and write identity.md (palette, type, texture, motion, do/don\'t). Justify the choice AND the rejections. Never default to the generic dev-tool look.', deps: ['specify'], artifact: 'identity.md' },
    { id: 'design',   agent: 'architect', goal: 'Basic design: system architecture & data model', deps: ['specify'], gate: true, artifact: 'design.md' },
    { id: 'detail',   agent: 'architect', goal: 'Detailed design: interfaces + ordered testable tasks', deps: ['design', 'ux'], artifact: 'tasks.md' },
    { id: 'build',    agent: 'architect', goal: 'Implement backend & core logic', deps: ['detail'], artifact: 'implementation' },
    { id: 'build-ui', agent: 'architect', goal: 'Implement the UI against the UX design and identity.md', deps: ['detail', 'identity'], artifact: 'ui' },
    { id: 'tests',    agent: 'tdd-guide', goal: 'Test suite covering acceptance criteria', deps: ['detail'], artifact: 'tests' },
    { id: 'review',   agent: 'code-reviewer', goal: 'Quality review across backend & UI', deps: ['build', 'build-ui', 'tests'], artifact: 'review' },
    { id: 'ux-review', agent: 'ux-reviewer', goal: 'Judge the SURFACE: run `node graph/visual-verify.js check <dir>`, confirm ux.md and identity.md were honoured, drive the real browser at narrow and wide widths in BOTH themes. Evidence must be measured or seen.', deps: ['build-ui'], artifact: 'ux-review.md' },
    { id: 'security', agent: 'security-reviewer', goal: 'Security & privacy review', deps: ['build', 'build-ui'], artifact: 'security-report' },
    { id: 'docs',     agent: 'doc-updater', goal: 'Write user & developer documentation', deps: ['build', 'build-ui'], artifact: 'docs' },
    { id: 'verify',   agent: 'verification-loop', goal: 'Full verification: build/type/lint/test/coverage/security/visual', deps: ['review', 'security', 'ux-review'], gate: true, artifact: 'verification-report' },
    { id: 'reflect',  agent: 'self-critic', goal: 'Adversarial self-critique against PRD, findings & UX: run critic checklist + lessons. Any gap => REWORK before judgment', deps: ['verify', 'docs'], gate: true, artifact: 'critique.md' },
    { id: 'verdict',  agent: 'creation-judge', goal: 'Final judgment against PRD, findings, critique & constitution: SHIP / REWORK / BLOCK', deps: ['reflect'], gate: true, artifact: 'verdict' },
  ],

  // Reform — 楽園そのものを改める道 (憲法 第23条)
  //
  // quick/standard/full はいずれも `creations/<slug>` を産むための道であり、
  // **楽園自身の改修が通る道は存在しなかった**。ゆえにエンジンへの変更は
  // 11件のPRすべてで教主の独断となり、枢機卿も執行官も一度も召集されなかった。
  // 三権分立は宣言されていて、機構化されていなかった。
  //
  // creations の道と違うのは三点:
  //   - discover は「市場」ではなく **己の実測**（門を走らせ、数を数える）
  //   - build の対象は engine + 憲法 + 回帰テストであり、成果物ではない
  //   - **門を、わざと壊して鳴るか試す `prove` 相**が独立して存在する。
  //     健全な系しか見たことのない門は、試されたことがない門である（第21条）
  reform: (wish) => [
    { id: 'discover', agent: 'market-researcher',
      goal: `楽園自身を実測せよ: ${wish}。憶測を書くな。全ての門(tests/paradise.test.js, check-agents, census, apply-models verify, deploy check, upstream impact)を実際に走らせ、critic.js review graph --self をかけ、欠陥を**数**にして出す。「〜のはず」は証拠ではない`,
      gate: true, artifact: 'findings.md' },
    { id: 'specify', agent: 'requirements-analyst',
      goal: '実測された欠陥から、直すべきものを選び受入条件を書く。artifact でなく pipeline を直すこと(第9条)。「この門が、この入力で、こう鳴る」まで具体化する',
      deps: ['discover'], gate: true, artifact: 'requirements.md' },
    { id: 'design', agent: 'architect',
      goal: '機構を設計する: どの engine を、どう変えるか。憲法に条を足すべきか。既存の門との重複・矛盾はないか。**この変更で嘘になる既存の門**を洗い出す(依存関係を変えたら、古い前提を符号化した門を全て読み直す)',
      deps: ['specify'], gate: true, artifact: 'design.md' },
    { id: 'build', agent: 'architect',
      goal: 'engine を実装し、憲法条を追記し、CLAUDE.md/README の該当箇所を更新する',
      deps: ['design'], artifact: 'implementation' },
    { id: 'prove', agent: 'tdd-guide',
      goal: '**門を、わざと壊して鳴るか試す。** 実在しない名を仕込む/腐った数を仕込む/上流を隠すなど、欠陥を意図的に注入し、門がそれを名指しで捕らえることを回帰テストで固定する。健全な系で緑になるだけの門は証明されていない',
      deps: ['build'], gate: true, artifact: 'tests' },
    { id: 'review', agent: 'code-reviewer',
      goal: '機構の質を審査する。教主の実装を、教主でない者が読む(第11条)。設計意図と実装の乖離、命名、既存 engine との一貫性',
      deps: ['build', 'prove'], artifact: 'review.md' },
    { id: 'security', agent: 'security-reviewer',
      goal: '秘密の混入、任意コード実行、パス走査、CI 権限の過剰付与を検める。楽園の engine は開発者の環境で走る — 危害の射程は creations より広い',
      deps: ['build'], artifact: 'security-report.md' },
    { id: 'docs', agent: 'doc-updater',
      goal: 'CLAUDE.md の門一覧・憲法表、README の該当節を更新し、`node graph/census.js check` が通ることを確認する(第22条)',
      deps: ['build'], artifact: 'docs' },
    { id: 'verify', agent: 'verification-loop',
      goal: '全門を通常環境と**素の環境**(PARADISE_UPSTREAM=/nonexistent CLAUDE_HOME=/nonexistent)の両方で走らせる。片方でも赤なら未完(第20条)',
      deps: ['review', 'security', 'prove'], gate: true, artifact: 'verification-report' },
    { id: 'reflect', agent: 'self-critic',
      goal: '敵対的自己批評: node graph/critic.js review graph --self --lessons graph/lessons.json。この改修が生んだ**新しい盲点**を探す。門を足したなら、その門自身は誰が見張るのか',
      deps: ['verify', 'docs'], gate: true, artifact: 'critique.md' },
    { id: 'verdict', agent: 'creation-judge',
      goal: '楽園の改革を裁く: SHIP / REWORK / BLOCK。裁いた上で PR を出す — マージは神のみ',
      deps: ['reflect'], gate: true, artifact: 'verdict' },
  ],

  // Counsel — 諐問の道: 何も創らず、問いに答える (非開発の道)
  //
  // 実測された欠陥: quick/standard/full/reform はすべて build 相と
  // verdict(SHIP/REWORK/BLOCK) を必須とする **創造の道** であった。ゆえに
  // 「調査してほしい」「監査してほしい」「報告してほしい」「意見がほしい」という
  // **創造物を求めない願い**がことごとく standard(14相)へ誤着し、存在しない
  // 実装物に向かって build を走らせていた。道が四本とも同じ形をしていたので、
  // 「産まない」という選択肢そのものが機構に存在しなかったのである。
  //
  // 創造の道と違うのは三点:
  //   - **build / tests / verdict 相を一つも持たない**。この道は物を産まない
  //   - survey(外の世界を調べる)と measure(手元を実測する)が **並列**に立つ。
  //     市場だけを見る道は己を測らず、己だけを見る道は世間を知らない
  //   - 終端は断罪ではなく **counsel(推奨と根拠)**。答えるのが仕事である
  counsel: (wish) => [
    { id: 'survey', agent: 'market-researcher',
      goal: `外の世界を調べよ: ${wish}。先行事例・比較対象・一般に何が標準とされるかを、出典URL付きで集める。憶測を事実として書かない`,
      gate: true, artifact: 'findings.md' },
    { id: 'measure', agent: 'auditor',
      goal: `手元の系を実測せよ: ${wish}。コマンドを実際に走らせ、生の出力を根拠に数を出す。「〜のはず」は証拠ではない`,
      gate: true, artifact: 'measurements.md' },
    { id: 'assess', agent: 'requirements-analyst',
      goal: '外の調査(findings)と手元の実測(measurements)を突き合わせ、問いに対する筋を立てる。両者が食い違う点こそ本題である',
      deps: ['survey', 'measure'], artifact: 'analysis.md' },
    { id: 'counter', agent: 'self-critic',
      goal: '敵対的に反証せよ。その分析が**間違っているとしたら何が原因か**を列挙し、根拠の弱い断定を名指しで潰す。反証に耐えなかった主張は結論に載せない',
      deps: ['assess'], gate: true, artifact: 'counter.md' },
    { id: 'synthesize', agent: 'reporter',
      goal: '集められた根拠を人が読める報告書に編む。数値には必ず出典(コマンドかURL)を付ける。推測は「推測」と明記する',
      deps: ['assess', 'counter'], artifact: 'report.md' },
    { id: 'counsel', agent: 'executor',
      goal: '諐問に答える: 推奨と、その根拠と、採らなかった選択肢とその理由。断罪(SHIP/REWORK/BLOCK)ではない — 神が決めるための材料を渡す',
      deps: ['synthesize'], gate: true, artifact: 'counsel.md' },
  ],
};

/**
 * その道は何を産むのか (第9条の系)
 *
 * 道が「何を産むか」を宣言していなかったので、産まない道を作る余地が
 * 機構に無かった。産物の種別は道の性質そのものであり、meta に載る。
 */
const SCALE_PRODUCES = {
  quick: 'artifact',
  standard: 'artifact',
  full: 'artifact',
  reform: 'artifact',
  counsel: 'document',
};

/**
 * 神託が「楽園そのもの」を指しているか。
 *
 * これが最初に判定される理由: 楽園自身への改革を quick/standard と誤ると、
 * 市場調査の神官が世間を調べに行き、己を測らない。対象を取り違えた道は、
 * どれだけ丁寧に回しても正しい場所に着かない。
 */
const REFORM_RE = /(楽園|paradise|ハーネス|harness|憲法|constitution|engine|エンジン|門|gate|パイプライン|pipeline|自己改善|self-improve|オーケストレーション|orchestration|枢機卿|cardinal|神官|priest)/i;

/**
 * 諐問の語彙 — 「創れ」ではなく「答えよ」と言っている願い。
 *
 * **日本語に `\b` を使ってはならない。** 単語境界は「単語構成文字と非構成文字の
 * 境目」であり、日本語は全て非構成文字として扱われる。ゆえに `\b(修正)\b` は
 * 日本語文中で事実上決して一致しない。この誤りが既存の quick/full 判定に
 * 埋まっており、**日本語の願いは全て standard に落ちていた**。よって語彙は
 * 日本語(境界なし)と英語(境界あり)に分けて持つ。
 */
const COUNSEL_JA = '調査|監査|報告|意見|比較|分析|診断|推奨|助言|論評|検討|考察|集計|整理|見直|妥当か|どう思う|どうすべき|はないか|べきか|所見';
const COUNSEL_EN = '\\b(?:research|investigate|audit|report|advise|recommend|compare|analyze|analyse|diagnose|review-only|assess|evaluate|survey|opinion)\\b';
const COUNSEL_RE = new RegExp(`${COUNSEL_JA}|${COUNSEL_EN}`, 'i');

/**
 * 創造の動詞 — 「物を寄越せ」と言っている願い。諐問の語彙と混ざると
 * 「タイマーが欲しい」が調査の道へ攫われる。
 */
const CREATE_RE = new RegExp('欲しい|ほしい|作れ|作って|作る|つくって|実装|実現|開発|構築|' +
  '\\b(?:build|create|make|implement|develop)\\b', 'i');

/**
 * ただし **求められている物が文書である**なら、創造の動詞があっても諐問である。
 * 「比較表がほしい」「報告書がほしい」は建造ではない。
 */
const DOC_RE = new RegExp('報告書|比較表|レポート|一覧表|資料|所見|報告|調査|監査|意見|助言|分析|診断|考察|論評|' +
  '\\b(?:report|comparison|analysis|audit|assessment|findings)\\b', 'i');

/** その願いは諐問(答えを求める)か、創造(物を求める)か。 */
function isCounsel(wish) {
  if (!COUNSEL_RE.test(wish)) return false;
  if (CREATE_RE.test(wish) && !DOC_RE.test(wish)) return false;   // 物を求めている
  return true;
}

/** Heuristically choose a scale from the wish text. */
function chooseScale(wish) {
  const w = wish.toLowerCase();
  // 主題優先: 「楽園のエンジンを監査してほしい」は楽園の話だが改変ではない。
  // 諐問は reform より先に判定する — 対象ではなく **求められている答えの種類**が道を決める。
  if (isCounsel(wish)) return 'counsel';
  // 対象が楽園自身なら、創造物の道ではなく改革の道を行く(第23条)。
  if (REFORM_RE.test(wish)) return 'reform';
  const quickJa = /一行|修正|バグ|直す|直して|直し|タイポ|誤字|微調整/;
  const quickEn = /\b(fix|bug|typo|rename|tweak|adjust|patch|hotfix|small|quick)\b/;
  const fullJa = /製品|システム|アプリ|プラットフォーム|全体/;
  const fullEn = /\b(product|platform|system|app|application|saas|dashboard|end-to-end|mvp|launch)\b/;
  if (quickJa.test(wish) || quickEn.test(w)) return 'quick';
  if (fullJa.test(wish) || fullEn.test(w)) return 'full';
  return 'standard';
}

function buildDag(wish, scale) {
  const tasks = SCALES[scale](wish);
  return {
    meta: {
      wish,
      scale,
      created: new Date().toISOString(),
      constitution: CONSTITUTION,
      gates: tasks.filter(t => t.gate).map(t => t.id),
      // 何を産む道なのか。産まない道(counsel)を持てるようにするための宣言。
      produces: SCALE_PRODUCES[scale] || 'artifact',
    },
    tasks,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const flags = {};
  const positional = [];
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--scale') flags.scale = argv[++i];
    else if (argv[i] === '--out') flags.out = argv[++i];
    else positional.push(argv[i]);
  }
  const wish = positional.join(' ').trim();

  if (cmd === 'scale') {
    if (!wish) { console.error('usage: forge.js scale "<wish>"'); process.exit(2); }
    console.log(chooseScale(wish));
    return;
  }
  if (cmd === 'phases') {
    const scale = flags.scale || 'standard';
    if (!SCALES[scale]) { console.error(`unknown scale: ${scale}`); process.exit(2); }
    const dag = buildDag('<wish>', scale);
    console.log(`FORGE PHASES  [scale: ${scale}]  (${dag.tasks.length} phases, gates: ${dag.meta.gates.join(', ')})`);
    for (const t of dag.tasks) {
      const g = t.gate ? '  ⚖️GATE' : '';
      const d = t.deps ? `  (after: ${t.deps.join(', ')})` : '';
      console.log(`  ${t.id} @${t.agent}${g}: ${t.goal}${d}`);
    }
    return;
  }
  if (cmd === 'plan') {
    if (!wish) { console.error('usage: forge.js plan "<wish>" [--scale ...] [--out file]'); process.exit(2); }
    const scale = flags.scale || chooseScale(wish);
    if (!SCALES[scale]) { console.error(`unknown scale: ${scale}`); process.exit(2); }
    const dag = buildDag(wish, scale);
    const json = JSON.stringify(dag, null, 2);
    if (flags.out) {
      fs.mkdirSync(path.dirname(flags.out), { recursive: true });
      fs.writeFileSync(flags.out, json);
      console.error(`FORGED  scale=${scale}  phases=${dag.tasks.length}  gates=[${dag.meta.gates.join(', ')}]  -> ${flags.out}`);
    } else {
      console.log(json);
    }
    return;
  }
  console.error('commands: plan "<wish>" [--scale quick|standard|full] [--out f] | scale "<wish>" | phases [--scale ...]');
  process.exit(2);
}

if (require.main === module) main();
module.exports = { CONSTITUTION, SCALES, SCALE_PRODUCES, chooseScale, buildDag, REFORM_RE, COUNSEL_RE, CREATE_RE, DOC_RE, isCounsel };
