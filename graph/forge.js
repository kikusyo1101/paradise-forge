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

  // Cartography — 作図の道: 楽園が己の姿を図にする (憲法 第47条・第48条)
  //
  // 実測された欠陥: 神が「オーケストレーションの相関図を作れ」と命じたとき、
  // `chooseScale` はそれを **reform(11相・engine改修の道)** へ送った。
  // 「オーケストレーション」が REFORM_RE に当たるからである。だが作図は
  // engine の改修ではない。逆に「位階の図を描いてほしい」は standard(14相)へ
  // 落ち、**存在しない実装物に向かって build/security/tests を走らせた**。
  //
  // 作図が他の道と決定的に違うのは、**判定が主観でなく機械にある**ことである:
  //   - IR を作る engine が在り(atlas)、描くのは取り込んだ描画器(archify)
  //   - 静的検査 9/9 と、**実ブラウザでの実測**(溢れ・字の大きさ)が門になる
  //   - 「事実を写経したか」は engine と突き合わせれば判る(第29条)
  // ゆえに creations の道の review/security/docs は要らず、代わりに
  // **measure(実ブラウザで測る)と behold(人の目で見る)** が要る。
  // 静的な 9/9 は「図として正しい」しか言わない。**意味の破れは開いて見るまで
  // 分からない** — それを人手の判断に委ねず相として機構に埋める(第18条)。
  cartography: (wish) => [
    { id: 'chart-survey', agent: 'auditor',
      goal: `何を図にするのかを実測せよ: ${wish}。まず \`node graph/atlas.js subjects\` で既存の主題を見、`
          + '描くべき事実がどの engine に住んでいるかを突き止める(位階=clergy, 道=forge, 環=conclave, 結線=wiring)。'
          + '**事実を持つ engine が無いなら、まずそれを作るのが先である** — 図に数を写経してはならない(第29条)。'
          + '既存主題との重複、対象の形(深さ×幅)、想定される読み手を数で出す',
      gate: true, artifact: 'findings.md' },
    { id: 'frame', agent: 'requirements-analyst',
      goal: '図の主題を定める: 何を語り、何を語らないか。主題ごとに種別(architecture/workflow/sequence/lifecycle/dataflow)を選び、'
          + '理由を書く。**「全部入り」は主題ではない** — 語らないと決めたものを明記せよ。'
          + '受入条件は機械が裁ける形にする: 静的検査 9/9、実ブラウザで第一画面に収まるか(巻物なら宣言)、字が床(6px)を割らないか',
      deps: ['chart-survey'], gate: true, artifact: 'requirements.md' },
    { id: 'draft', agent: 'architect',
      goal: 'atlas に主題を実装する: engine から事実を読み、JSON IR を組む。'
          + '**数も名も写経しない**(第29条)。配置が要るなら既存の `layered()` を使い、'
          + '新しい配置器を書かない — 写経の複製は片方だけが直った日に図が食い違う',
      deps: ['frame'], artifact: 'implementation' },
    { id: 'render', agent: 'architect',
      goal: '`node graph/atlas.js draw <subject>` を実際に走らせ、描画器の診断が消えるまで直す。'
          + '**描画器の鳴きは幾何の助言ではなく仕様である** — 交差・廊下の奪い合い・箱を貫く辺は、'
          + '小細工でなく配置で解く。己の思いつきが三度退けられたなら、解法そのものが誤っている',
      deps: ['draft'], artifact: 'diagram' },
    { id: 'chart-measure', agent: 'ux-reviewer',
      goal: '**実ブラウザで測る**: `node graph/atlas.js check --scale <各道>` を全ての道で走らせる。'
          + '静的な 9/9 は「図として正しい」しか言わない — 溢れ・字の大きさ・縮小率は開いてみるまで分からない。'
          + '溢れるなら SUBJECTS に scroll:true と宣言し、**字が読めないなら宣言では逃げられない**(第48条e)。'
          + '交差ゼロが不能なら最小交差数を厳密に数え、standard を名乗って理由を図の札に書く(第47条c)',
      deps: ['render'], gate: true, artifact: 'measurements.md' },
    { id: 'behold', agent: 'ux-reviewer',
      goal: '**人の目で見る**: visual-check の PNG を実際に開いて読め。静的検査も実測も通った図が、'
          + '意味を裏切っていることがある(実測: 「独立」を主張する箱が枠に触れて独立に見えなかった/'
          + '孤児の枠が独立群の枠と重なって題が潰れた)。幾何は正しいので機械は咎めない。'
          + '一目で読めるか、強調すべきものが強調されているか、線が追えるかを述べよ',
      deps: ['chart-measure'], gate: true, artifact: 'review.md' },
    { id: 'prove', agent: 'tdd-guide',
      goal: '回帰テストで固定する: (1)図が engine から生まれ写経していないこと(engine の数と図の箱が一致)、'
          + '(2)同じ入力から同じ図が出ること(決定的)、(3)**門をわざと壊して鳴るか**。'
          + '健全な系で緑になるだけの門は証明されていない(第21条)',
      deps: ['render'], gate: true, artifact: 'tests' },
    { id: 'docs', agent: 'doc-updater',
      goal: 'README の engine 表と主題一覧を更新し、`node graph/census.js check` を通す(第22条)。'
          + '新しい門を建てたなら CI(tribunal.yml)に配線する — **配線されぬ門は飾りである**',
      deps: ['render'], artifact: 'docs' },
    { id: 'verify', agent: 'verification-loop',
      goal: '全門を走らせる: tests/paradise.test.js, atlas check(全ての道), wiring check, census check, derived check。'
          + '一つでも赤なら未完',
      deps: ['chart-measure', 'behold', 'prove', 'docs'], gate: true, artifact: 'verification-report' },
    { id: 'reflect', agent: 'self-critic',
      goal: '敵対的自己批評: この図が**語らなかったこと**は何か。図を足したことで嘘になった既存の門は無いか。'
          + '`node graph/critic.js review graph --self --lessons graph/lessons.json`',
      deps: ['verify'], gate: true, artifact: 'critique.md' },
    { id: 'verdict', agent: 'creation-judge',
      goal: '作図を裁く: SHIP / REWORK / BLOCK。裁いた上で PR を出す — マージは神のみ',
      deps: ['reflect'], gate: true, artifact: 'verdict' },
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
  // 図は実装物ではない。build も security も無いので `artifact` を名乗れば
  // verdict が「build が語られていない」と永久に REWORK を出す。かといって
  // `document` でもない — 文書は読めばよいが、図は**実ブラウザで測れる**。
  // ゆえに第三の産物を宣言する(第36条: 門は消すのではなく分ける)。
  cartography: 'diagram',
};

/**
 * 願い文から**判定を惑わす記号**を剥ぐ (FR-02)。
 *
 * 実測された欠陥: 「CI に `ledger --audit` を追加する」の `--audit` が
 * `COUNSEL_EN` の `\baudit\b` に当たり、engine 改修の願いが諐問へ攫われた。
 * **フラグ名は産物の名であって、依頼の動詞ではない。**
 *
 * 剥ぐ順序は入れ替えてはならない:
 *   1. バッククォート区間 — 先に剥がねば、中の `--flag` を剥いだ跡が対応を壊す
 *   2. フラグ語 — **直前の一字を捕獲群で保存して置換する**。素朴に食うと直前の語が繋がる
 *   3. ファイル名 — `x.js` `y.json` … は道具の名であって願いの動詞ではない
 *   4. 空白を畳む
 *
 * 冪等である (`denude(denude(w)) === denude(w)`)。副作用は無い。
 * **剥いだ文は判定にのみ使う。** `buildDag` の `meta.wish` には元の願い文が入る
 * (`tests/counsel.test.js` が `meta.wish === '願い'` を撃っている / L-5)。
 */
function denude(wish) {
  let s = String(wish == null ? '' : wish);
  s = s.replace(/`[^`]*`/g, ' ');
  s = s.replace(/(^|[\s(（「『【])--?[A-Za-z][A-Za-z0-9_-]*/g, '$1 ');
  s = s.replace(/[A-Za-z0-9_.-]+\.(?:js|json|jsonl|md|yml|yaml|ts|tsx|sh)\b/gi, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * engine の固有名 (FR-04)。**`graph/*.js` のファイル名から測って作る** (第22条)。
 *
 * ここは静的な文字列である。`fs.readdirSync` で動的に作ってはならない ——
 * `chooseScale` は純粋な関数であるべきで、ファイルが増減するたび道選びが
 * 黙って変わるのは「測る」ではなく「揺れる」である。
 * **測るのは門の側**: `tests/counsel.test.js` が `graph/*.js` の名を読み、
 * ここに載っていない engine が生まれたら赤くなって人に知らせる。
 *
 * ⚠️ **`台帳` / `ledger` を入れてはならない** (L-4)。discovery §6.1 の実測で
 *    `台帳の毒を直す` が quick から reform へ攫われた(回帰防止の一件)。
 *    「CI に ledger --audit を追加する」は **`CI`** の方で reform に着けばよい。
 *
 * `COUNSEL_JA` と同じく **string** で持つ。`REFORM_RE` の源に埋め込むためである。
 */
const ENGINE_NAMES = 'abode|apply-guards|apply-hooks|apply-models|apply-seat|apply-spawn|atlas|' +
  'branch-guard|build-identity-catalog|census|check-agents|clergy|codex|conclave|contract|critic|' +
  'daily-guard|deploy|derived|domains|export-state|forge|gauge|graph-engine|hermetic|identity|' +
  'lessons|orchestrator|ordain|pulse|spawn-trace|synod|upstream|vendor|verdict|visual-verify|' +
  'wiring|workspace|ci|workflow';

/**
 * 神託が「楽園そのもの」を指しているか。
 *
 * これが最初に判定される理由: 楽園自身への改革を quick/standard と誤ると、
 * 市場調査の神官が世間を調べに行き、己を測らない。対象を取り違えた道は、
 * どれだけ丁寧に回しても正しい場所に着かない。
 *
 * 抽象名(楽園/エンジン/門)だけでは足りない —— 実測で
 * `gauge に fingerprint を確かめる口を設ける` が standard へ落ちた。
 * ゆえに **engine の固有名**(`ENGINE_NAMES`)と、engine の器官を指す
 * 日本語(ワークフロー/自己診断/走行帳)を源に足す。
 */
const REFORM_RE = new RegExp('(楽園|paradise|ハーネス|harness|憲法|constitution|engine|エンジン|' +
  '門|gate|パイプライン|pipeline|自己改善|self-improve|オーケストレーション|orchestration|' +
  '枢機卿|cardinal|神官|priest|ワークフロー|自己診断|走行帳)' +
  `|\\b(?:${ENGINE_NAMES})\\b`, 'i');

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
 *
 * ⚠️ 旧実装は「**物を新しく作る**」動詞しか知らず、「**既に在る物に一段足す**」
 * 動詞(設ける/足す/加える/追加…)を一語も持たなかった。ゆえに engine 改修の
 * 願いは「創造動詞なし」と判定され、`isCounsel` の打ち消しが効かず諐問へ攫われた。
 * `BUILD_JA` / `BUILD_EN` がその穴である (FR-01)。
 *
 * **日本語と英語を別の定数に割る**(L-3)。日本語に `\b` を使えば単語境界は
 * 事実上決して立たず、日本語の願いは全て素通りする。
 */
const BUILD_JA = '設ける|設け|足す|足し|加える|加え|追加|新設|導入|搭載|組み込|持たせ|生やす|' +
  'できるようにする|可能にする|拡張|付ける|付与';
const BUILD_EN = '\\b(?:add|introduce|extend|enable|support|wire)\\b';
const BUILD_RE = new RegExp(`${BUILD_JA}|${BUILD_EN}`, 'i');

const CREATE_RE = new RegExp('欲しい|ほしい|作れ|作って|作る|つくって|実装|実現|開発|構築|' +
  `${BUILD_JA}|` +
  '\\b(?:build|create|make|implement|develop)\\b|' + BUILD_EN, 'i');

/**
 * ただし **求められている物が文書である**なら、創造の動詞があっても諐問である。
 * 「比較表がほしい」「報告書がほしい」は建造ではない。
 */
const DOC_RE = new RegExp('報告書|比較表|レポート|一覧表|資料|所見|報告|調査|監査|意見|助言|分析|診断|考察|論評|' +
  '\\b(?:report|comparison|analysis|audit|assessment|findings)\\b', 'i');

/**
 * **産物の主名詞** (FR-03) — 願いが名指ししている「寄越せと言われている物」。
 *
 * 「健康診断アプリが欲しい」の「診断」に道を奪わせないための語彙である。
 *
 * ⚠️ **「図」を入れてはならない** (L-8)。`isCartography` は「意図/地図」の
 *    紛れ語を退ける仕掛けを持っており、作図は 1 段目で既に決着している。
 */
const PRODUCT_RE = new RegExp('アプリ|ツール|コマンド|口|門|画面|機能|フラグ|オプション|' +
  'エンドポイント|ボタン|一段|相|ページ|タイマー|' +
  '\\b(?:app|tool|command|flag|option|cli|api|endpoint|button|screen|feature|toggle)\\b', 'i');

/**
 * 産物の名にも**紛れ語**が在る。`DIAGRAM_FALSE_FRIENDS` と同じ病である。
 *
 * 実測(本走行の build 相で発見): 一字の産物名「口」「相」は
 * **人口 / 窓口 / 入口 / 出口 / 相場 / 相談 / 相手** の中に埋もれている。
 * 素朴に一字で判定すれば「人口動態を調査して報告してほしい」が
 * 「産物を求めている」と誤読され、諐問の道を失う —— **実測で 7 件が壊れた**。
 *
 * 設計 §1.3 は L-8 で「図」についてのみこの病を警告していたが、
 * **同じ病は一字の産物名すべてに在った**。ゆえに同じ作法で守る。
 */
const PRODUCT_FALSE_FRIENDS = /人口|窓口|入口|出口|河口|口調|口座|相場|相談|相手|位相|真相|様相|手相|首相|外相|門前|専門|部門|門下/;
/** 紛れ語を除いても残る、強い産物の名(これが在れば疑いなく物を求めている)。 */
const PRODUCT_STRONG_RE = new RegExp('アプリ|ツール|コマンド|画面|機能|フラグ|オプション|' +
  'エンドポイント|ボタン|一段|ページ|タイマー|' +
  '\\b(?:app|tool|command|flag|option|cli|api|endpoint|button|screen|feature|toggle)\\b', 'i');

/** その願いは**産物**を名指ししているか(紛れ語を退けたうえで)。 */
function wantsProduct(w) {
  if (PRODUCT_STRONG_RE.test(w)) return true;
  // 一字の名(口/門/相)だけで当たった場合、それが紛れ語の一部でないか確かめる
  return PRODUCT_RE.test(w) && !PRODUCT_FALSE_FRIENDS.test(w);
}

/**
 * **文書そのものを寄越せ**と言っている語彙 —— 産物の名より強い。
 *
 * `DOC_RE` から **「診断」と「監査」だけ**を除いた集合である。
 * この二語は *文書の名でもあり、機構の機能の名でもある*:
 *   「健康**診断**アプリが欲しい」 「門に**監査**の一段を足す」
 * 二つの顔を持つのはこの二語だけで、他の語(報告書/比較表/調査/分析/所見…)は
 * **文書を求める顔しか持たない**。ゆえにそれらは産物の名に勝つ。
 *
 * これが欠陥Aの核心である —— discovery §2.1 が名指しした
 * 「『診断』が COUNSEL_JA と DOC_RE の同一語である」という事実の、正確な一般化。
 */
const DOC_STRONG_RE = new RegExp('報告書|比較表|レポート|一覧表|資料|所見|報告|調査|意見|助言|分析|考察|論評|' +
  '\\b(?:report|comparison|analysis|audit|assessment|findings)\\b', 'i');

/**
 * その願いは諐問(答えを求める)か、創造(物を求める)か。
 *
 * ⚠️ 旧実装は `CREATE_RE(w) && !DOC_RE(w)` の一行だった。「診断」が
 * `COUNSEL_JA` と `DOC_RE` の**両方に居る**ため、「健康診断アプリが欲しい」で
 * 打ち消しが `!DOC_RE` によって無効化された —— 形を見て意味を見逃した(第19条)。
 *
 * 新しい問いは「DOC に当たったか」ではなく
 * **「求められている物が文書そのものか」**である。
 *
 * 自ら `denude` を呼ぶ。`chooseScale` から剥いだ文を渡されても冪等なので害は無く、
 * 単体で呼ばれても(`counsel.test.js` がそうする)正しく振る舞う。
 */
function isCounsel(wish) {
  const w = denude(wish);
  if (!COUNSEL_RE.test(w)) return false;                    // 1. 諐問の語彙が無い
  if (!CREATE_RE.test(w) && !wantsProduct(w)) return true;  // 2. 答えだけを求めている
  // 3. 物を求めている疑い。だが求めている物が**文書そのもの**なら、やはり諐問である。
  //    強い文書の名は産物の名に勝つ(「画面設計を調査して報告書がほしい」)。
  //    二つの顔を持つ「診断/監査」だけは、産物の名に負ける(「健康診断アプリが欲しい」)。
  if (DOC_STRONG_RE.test(w)) return true;
  return DOC_RE.test(w) && !wantsProduct(w);
}

/**
 * 作図の語彙 — 「図にせよ」と言っている願い。
 *
 * **この判定は reform より先に立たねばならない。** 実測: 神が
 * 「オーケストレーションの相関図を作れ」と命じたとき、「オーケストレーション」が
 * REFORM_RE に当たり、願いは engine 改修の道(11相)へ攫われた。教主はそれを
 * 手で歩き直したので着いたが、**機構としては誤着していた**。
 * 逆に「位階の図を描いてほしい」は standard(14相)へ落ち、存在しない実装物に
 * 向かって build/security を走らせる道が選ばれていた。
 *
 * 対象(楽園か否か)ではなく **求められている産物の種類** が道を決める。
 * これは counsel が reform より先に立つのと同じ理屈である。
 */
const DIAGRAM_JA = '図解|図示|相関図|関連図|構成図|系統図|階層図|フロー図|ダイアグラム|チャート|図に|図を|作図|可視化';
const DIAGRAM_EN = '\\b(?:diagram|chart|graph(?:viz)?|visualize|visualise|architecture[- ]?map|flowchart|sequence[- ]?diagram)\\b';
const DIAGRAM_RE = new RegExp(`${DIAGRAM_JA}|${DIAGRAM_EN}`, 'i');

/**
 * ただし「図」の一字は他語に紛れる(意図/地図/図書/合図/構図…)。
 * 素朴に一字で判定すれば「意図を汲んで実装せよ」が作図の道へ落ちる。
 * ゆえに上の語彙は二字以上の複合語か、送り仮名を伴う形だけを拾う。
 */
const DIAGRAM_FALSE_FRIENDS = /意図|地図|図書|合図|構図|図々|壮図|企図/;

/** その願いは作図(図を求める)か。 */
function isCartography(wish) {
  if (!DIAGRAM_RE.test(wish)) return false;
  // 「図に」「図を」だけで当たった場合、それが紛れ語の一部でないか確かめる。
  const onlyWeak = !new RegExp(`${DIAGRAM_JA.split('|').filter(w => w !== '図に' && w !== '図を').join('|')}|${DIAGRAM_EN}`, 'i').test(wish);
  if (onlyWeak && DIAGRAM_FALSE_FRIENDS.test(wish)) return false;
  return true;
}

/**
 * Heuristically choose a scale from the wish text.
 *
 * ⚠️ **判定の順序は変えてはならない** (L-7)。`counsel.test.js:292` の
 * 「壊れ engine」門が、語彙を潰すと『楽園のエンジンを監査してほしい』が
 * **reform** へ落ちること —— すなわち counsel が reform より先に立つこと —— を
 * 撃っている。本走行が変えたのは **何を渡すか**(剥いだ文)と **各段の語彙**だけである。
 */
function chooseScale(wish) {
  // ★ 一度だけ剥ぎ、以降は剥いだ文で判定する (FR-02)。
  //   フラグ名やコード片は「依頼の動詞」ではない。
  const d = denude(wish);
  const w = d.toLowerCase();
  // 産物の種類が道を決める。対象(楽園か否か)ではない — 作図も諐問も
  // 「楽園について」語りうるが、engine を書き換える道ではない。
  if (isCartography(d)) return 'cartography';
  // 主題優先: 「楽園のエンジンを監査してほしい」は楽園の話だが改変ではない。
  // 諐問は reform より先に判定する — 対象ではなく **求められている答えの種類**が道を決める。
  // ★ 元の願い文を渡す。`isCounsel` は単体でも正しく振る舞わねばならず、
  //   中で自ら剥ぐ(`denude` は冪等なので二重に剥いでも害は無い)。
  if (isCounsel(wish)) return 'counsel';
  // 対象が楽園自身なら、創造物の道ではなく改革の道を行く(第23条)。
  if (REFORM_RE.test(d)) return 'reform';
  const quickJa = /一行|修正|バグ|直す|直して|直し|タイポ|誤字|微調整/;
  const quickEn = /\b(fix|bug|typo|rename|tweak|adjust|patch|hotfix|small|quick)\b/;
  const fullJa = /製品|システム|アプリ|プラットフォーム|全体/;
  const fullEn = /\b(product|platform|system|app|application|saas|dashboard|end-to-end|mvp|launch)\b/;
  if (quickJa.test(d) || quickEn.test(w)) return 'quick';
  if (fullJa.test(d) || fullEn.test(w)) return 'full';
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

/**
 * 道に入れてよい願いか (第52条 / 第49条の一般化)。
 *
 * ⚠️ **`chooseScale` は一行も変えない。判定はここに足す。**
 * `tests/paradise.test.js` は `chooseScale(...)` を **11箇所**で直に呼び、
 * 返り値が**文字列**であることを assert している。返り値を object に変えれば
 * その11本が一斉に嘘になる —— 直す口実に既存の門を壊してはならない。
 *
 * 実測が名指しした穴: 15の願いのうち 14件が既定の `standard` へ黙って落ちた。
 * 落ちた先の10名は全員実在するので `check-agents` は緑を出す。
 * **「音楽を作れ」は standard へ落ち、実在する architect が build 相を担う。**
 * 楽園には「その仕事をやれる役者が居ない」ことを表現する型が無かった。
 *
 * ── `scale` を受ける理由 (M-3) ────────────────────────────────────
 * 旧実装は引数を取らず、中で `chooseScale(wish)` を呼び直して**その道の名簿だけ**を
 * 裁いた。だが CLI は `admit()` を先に通してから `--scale` を適用する ——
 * すなわち **`--scale full` を渡すと、full にだけ載る5名
 * (tdd-guide / code-reviewer / ux-reviewer / security-reviewer / doc-updater) の
 * 分野適合が一度も検められないまま道に載った。** 逆向きの偽陽性も在った。
 * `forge.js` のコメントは「分野の適合だけを裁く」と述べていたが、
 * **裁いていた名簿は `--scale` で選んだ道のものではなかった。**
 * ゆえに **実際に走る道の名簿を裁く。** `chooseScale` は一行も変えない。
 */
function admit(wish, wantScale) {
  const domains = require('./domains.js');
  const { PSEUDO } = require('./check-agents.js');
  const chosen = chooseScale(wish);
  // 明示された道が実在すればそれを裁く。実在しなければ選定へ委ねる
  // (未知の道名は CLI 側が `unknown scale` で拒む — ここで裁定を騙らない)。
  const scale = (wantScale && Object.prototype.hasOwnProperty.call(SCALES, wantScale)) ? wantScale : chosen;
  const led = domains.load();
  const dom = domains.classify(wish, led);
  if (!dom) return { ok: false, code: 'unknown-domain', scale };
  const agents = new Set(SCALES[scale](wish).map(t => t.agent).filter(Boolean));
  const unfit = [...agents].filter(a => !PSEUDO.has(a) && !domains.serves(a, dom.id, led));
  if (unfit.length) return { ok: false, code: 'no-actor', scale, domain: dom, unfit };
  return { ok: true, scale, domain: dom };
}

/**
 * 門が鳴ったとき、次に何をすべきかを言う (第34条)。
 * **この行がそのまま結線でもある** — `wiring.js` の NAME_RES が
 * `graph/ordain.js` の綴りを拾うので、第34条を満たす一行が第48条をも満たす。
 */
function forgeCallLine(domain) {
  return `node graph/ordain.js forge --name <役者名> --domain ${domain} --cardinal <枢機卿> --rank priest --write`;
}

/** 拒否の理由を人へ。stdout に出す(教主が読む面である)。 */
function explainAdmit(r, wish) {
  const out = [];
  if (r.code === 'unknown-domain') {
    out.push(`分野を判定できない — 「${wish}」を写す語彙が台帳に無い`);
    out.push('  既定の道へ黙って落とさない。判定不能は緑ではない (第16条)');
    out.push('  node graph/domains.js list        # 台帳の語彙を見る');
    out.push(`  ${forgeCallLine('<分野>')}`);
  } else if (r.code === 'no-actor') {
    out.push(`担い手が居ない — 分野: ${r.domain.ja} (${r.domain.id})`);
    out.push(`  道 ${r.scale} が名指しする役者のうち、この分野を担うと宣言していない者: ${r.unfit.join(', ')}`);
    out.push('  実在するだけでは足りない。適合を宣言していない者に仕事は渡せない (第52条)');
    out.push(`  ${forgeCallLine(r.domain.id)}`);
  }
  return out.join('\n');
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
    const a = admit(wish);
    if (!a.ok) { console.log(explainAdmit(a, wish)); process.exit(1); }
    // 担える願いの出力は **従来と一字も変えない** (AC-C4 の回帰)。
    console.log(a.scale);
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
    /**
     * **判定を `mkdirSync` より前に置く** (AC-C3)。さもなくば拒んだのに
     * ディレクトリだけ残り、後の相がそれを正当な計画として読む(第44条:
     * 死んだ道具を教主が先例と読む)。担えない道の痕跡を一つも残さない。
     *
     * `--scale` を明示した呼び方は道の選定を人が引き受けたということなので、
     * 分野の適合だけを裁く。
     *
     * ⚠️ **裁く名簿は「実際に走る道」のものでなければならない** (M-3)。
     * 未知の道名を先に拒むのは、`admit` が選定へ黙って落ちた名簿で裁定を
     * 騙らないためである —— 綴り違いは exit 2 で鳴らす(第37条)。
     */
    if (flags.scale && !SCALES[flags.scale]) { console.error(`unknown scale: ${flags.scale}`); process.exit(2); }
    const a = admit(wish, flags.scale);
    if (!a.ok) { console.log(explainAdmit(a, wish)); process.exit(1); }
    const scale = flags.scale || a.scale;
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
module.exports = { CONSTITUTION, SCALES, SCALE_PRODUCES, chooseScale, admit, explainAdmit, forgeCallLine, buildDag, REFORM_RE, COUNSEL_RE, CREATE_RE, DOC_RE, DIAGRAM_RE, isCounsel, isCartography, denude, PRODUCT_RE, BUILD_RE, ENGINE_NAMES };
