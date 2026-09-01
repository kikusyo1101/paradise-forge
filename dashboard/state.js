window.PARADISE_STATE = {
  "generated": "2026-09-01T03:40:04.663Z",
  "pipeline": [
    {
      "id": "discover",
      "agent": "market-researcher",
      "gate": true,
      "deps": []
    },
    {
      "id": "specify",
      "agent": "requirements-analyst",
      "gate": false,
      "deps": [
        "discover"
      ]
    },
    {
      "id": "ux",
      "agent": "architect",
      "gate": false,
      "deps": [
        "specify"
      ]
    },
    {
      "id": "design",
      "agent": "architect",
      "gate": true,
      "deps": [
        "specify"
      ]
    },
    {
      "id": "identity",
      "agent": "architect",
      "gate": false,
      "deps": [
        "specify"
      ]
    },
    {
      "id": "detail",
      "agent": "architect",
      "gate": false,
      "deps": [
        "design"
      ]
    },
    {
      "id": "build",
      "agent": "architect",
      "gate": false,
      "deps": [
        "detail",
        "identity",
        "ux"
      ]
    },
    {
      "id": "tests",
      "agent": "tdd-guide",
      "gate": false,
      "deps": [
        "detail"
      ]
    },
    {
      "id": "review",
      "agent": "code-reviewer",
      "gate": false,
      "deps": [
        "build",
        "tests"
      ]
    },
    {
      "id": "ux-review",
      "agent": "ux-reviewer",
      "gate": false,
      "deps": [
        "build"
      ]
    },
    {
      "id": "security",
      "agent": "security-reviewer",
      "gate": false,
      "deps": [
        "build"
      ]
    },
    {
      "id": "verify",
      "agent": "verification-loop",
      "gate": true,
      "deps": [
        "review",
        "security",
        "ux-review"
      ]
    },
    {
      "id": "reflect",
      "agent": "self-critic",
      "gate": true,
      "deps": [
        "verify"
      ]
    },
    {
      "id": "verdict",
      "agent": "creation-judge",
      "gate": true,
      "deps": [
        "reflect"
      ]
    }
  ],
  "constitution": [
    "Spec is the source of truth — code serves the spec, not the reverse.",
    "Every phase is gated — no phase advances on unverified assumptions.",
    "Independent work runs in parallel; dependent work runs in order.",
    "Verification precedes judgment; judgment precedes shipping.",
    "Evidence-based memory — only what actually happened is remembered.",
    "No secrets in code; security is reviewed, never assumed."
  ],
  "graph": {
    "nodeCount": 82,
    "edgeCount": 33,
    "nodes": [
      {
        "id": "paradise",
        "type": "system",
        "label": "The Paradise harness",
        "degree": 8
      },
      {
        "id": "graph-engine",
        "type": "component",
        "label": "Graph orchestration engine",
        "degree": 2
      },
      {
        "id": "kg",
        "type": "component",
        "label": "Knowledge graph memory",
        "degree": 2
      },
      {
        "id": "no-db",
        "type": "decision",
        "label": "No database rule",
        "degree": 1
      },
      {
        "id": "dashboard-run",
        "type": "run",
        "label": "Paradise Live Dashboard build",
        "degree": 2
      },
      {
        "id": "dashboard",
        "type": "component",
        "label": "Paradise Live Dashboard",
        "degree": 2
      },
      {
        "id": "forge",
        "type": "system",
        "label": "The Forge \\u2014 creation pipeline",
        "degree": 5
      },
      {
        "id": "verdict-gate",
        "type": "system",
        "label": "The Gate of Judgment",
        "degree": 2
      },
      {
        "id": "constitution",
        "type": "decision",
        "label": "Paradise Constitution",
        "degree": 2
      },
      {
        "id": "pomodoro-forge",
        "type": "run",
        "label": "Forge run: pomodoro timer",
        "degree": 2
      },
      {
        "id": "pomodoro",
        "type": "creation",
        "label": "Pomodoro timer (SHIPPED)",
        "degree": 3
      },
      {
        "id": "pomodoro-verdict",
        "type": "verdict",
        "label": "Verdict: SHIP",
        "degree": 1
      },
      {
        "id": "market-researcher",
        "type": "component",
        "label": "Market Researcher agent",
        "degree": 5
      },
      {
        "id": "article-8",
        "type": "decision",
        "label": "憲法第8条: Research precedes specification",
        "degree": 1
      },
      {
        "id": "pomodoro-v2",
        "type": "creation",
        "label": "Pomodoro 完全版 (SHIPPED)",
        "degree": 2
      },
      {
        "id": "require-discovery",
        "type": "lesson",
        "label": "調査フェーズを飛ばすな",
        "degree": 1
      },
      {
        "id": "critic",
        "type": "component",
        "label": "Adversarial self-critic",
        "degree": 3
      },
      {
        "id": "self-critic-agent",
        "type": "component",
        "label": "self-critic agent",
        "degree": 0
      },
      {
        "id": "article-9",
        "type": "decision",
        "label": "憲法第9条: 楽園は裁かれる前に自らを疑う",
        "degree": 0
      },
      {
        "id": "orchestrator",
        "type": "component",
        "label": "Supervisor orchestrator",
        "degree": 3
      },
      {
        "id": "contract",
        "type": "component",
        "label": "Subagent contract",
        "degree": 1
      },
      {
        "id": "article-10",
        "type": "decision",
        "label": "憲法第10条: オーケストレーションは明示的状態機械",
        "degree": 1
      },
      {
        "id": "require-customization",
        "type": "lesson",
        "label": "設定カスタマイズは必須",
        "degree": 1
      },
      {
        "id": "orchestration-in-prompt",
        "type": "lesson",
        "label": "指揮ロジックをpromptに置くな",
        "degree": 0
      },
      {
        "id": "rps",
        "type": "creation",
        "label": "じゃんけんゲーム (SHIPPED)",
        "degree": 2
      },
      {
        "id": "rps-run",
        "type": "run",
        "label": "Forge run: じゃんけん",
        "degree": 1
      },
      {
        "id": "lesson-scope",
        "type": "lesson",
        "label": "lessonにスコープが必要",
        "degree": 0
      },
      {
        "id": "conclave",
        "type": "system",
        "label": "Conclave — 聖職位階",
        "degree": 4
      },
      {
        "id": "clergy",
        "type": "component",
        "label": "Clergy org model",
        "degree": 2
      },
      {
        "id": "article-11",
        "type": "decision",
        "label": "憲法第11条: 聖職位階の入れ子サイクル",
        "degree": 1
      },
      {
        "id": "critic-self-source",
        "type": "lesson",
        "label": "criticはソースと創造物を区別せよ",
        "degree": 0
      },
      {
        "id": "synod",
        "type": "component",
        "label": "Synod — 計画サイクル",
        "degree": 2
      },
      {
        "id": "plan-before-build",
        "type": "lesson",
        "label": "神託を即実装せず計画サイクルを回せ",
        "degree": 0
      },
      {
        "id": "coin",
        "type": "creation",
        "label": "コイントス (SHIPPED)",
        "degree": 1
      },
      {
        "id": "kg-forget",
        "type": "lesson",
        "label": "知識グラフは訂正可能であるべき（追記のみは欠陥）",
        "degree": 0
      },
      {
        "id": "critic-synonym",
        "type": "lesson",
        "label": "spec充足は文字列一致でなくAC実駆動で裁け",
        "degree": 0
      },
      {
        "id": "skill-paradise",
        "type": "decision",
        "label": "楽園運用スキル化",
        "degree": 0
      },
      {
        "id": "article-12",
        "type": "decision",
        "label": "憲法第12条: 位階別モデル方針",
        "degree": 2
      },
      {
        "id": "apply-models",
        "type": "component",
        "label": "位階モデル適用機構",
        "degree": 1
      },
      {
        "id": "model-by-rank",
        "type": "lesson",
        "label": "モデルは位階で割り当て、裁きは値切るな",
        "degree": 0
      },
      {
        "id": "contract-failclosed",
        "type": "lesson",
        "label": "the contract reconciler must reject malformed/empty subagent payloads cleanly, never crash on JSON.parse",
        "degree": 0
      },
      {
        "id": "lesson-scope-strict",
        "type": "lesson",
        "label": "スコープは厳密一致で守れ（偽REWORKは見逃しと同罪）",
        "degree": 0
      },
      {
        "id": "self-scope-subject",
        "type": "lesson",
        "label": "自己審査ではスコープの主語を宣言せよ（沈黙を合格と誤るな）",
        "degree": 0
      },
      {
        "id": "cross-domain-rework",
        "type": "lesson",
        "label": "差し戻しはドメインを跨いで届かねばならない。ratify(--reject --from X) は X を所有するドメインを全体から探し、そのドメインの批准を取り消して再開させ、下流の成果物を破棄し、loop-guard の負債を誤った側に付ける。自domain内しか探さない実装は「差し戻したのに何も戻らない」偽の審判を生む",
        "degree": 0
      },
      {
        "id": "evidence-by-substance",
        "type": "lesson",
        "label": "証拠は名前でなく中身で裁く。critic のチェックはファイル名の慣習照合ではなく成果物を読んで判定せよ。test.js/ac-test.js のような命名は .test./.spec. に合致しないため、名前照合だけだと実在するテスト群を『存在しない』と断じ偽REWORKを生む。ただし実質判定を緩めすぎず、アサートしないファイルは証拠と認めないこと",
        "degree": 0
      },
      {
        "id": "habit",
        "type": "creation",
        "label": "習慣トラッカー — 単一HTML/依存ゼロ/localStorage。ストリーク+skip+密度スコア+52週ヒートマップ。SHIP判定。AC32/32、テスト479、品質REWORK2回を経て承認",
        "degree": 0
      },
      {
        "id": "visual-identity-vocabulary",
        "type": "lesson",
        "label": "見た目が似通うのはAIの癖ではなく参照語彙の偏り。identity.md で方向と却下理由を宣言させ、候補はfamily重複禁止・tech_saasは高々1枠、採用履歴で反復を構造的に禁じる。design.md(構造)とidentity.md(見た目)は名を分ける。語彙は索引に圧縮して同梱し実行時に外部取得しない(依存ゼロ厳守)",
        "degree": 0
      },
      {
        "id": "surface-judged-as-strictly",
        "type": "lesson",
        "label": "表層は実体と同じ厳しさで裁く。UI/UXは(1)ux.mdで状態(空/読込/エラー/高密度)を先に設計、(2)visual-verify.jsでコントラスト・階調分離・非文字3:1・最小24px・color-schemeを数値で測る、(3)実ブラウザで両テーマ×狭広×初回/データ有りを目視し見られなかったものは未確認と書く、(4)ux-reviewer神官が表層に責任を負う。機械検査を全通過しても主役UIが読めない状態は成立しうる",
        "degree": 0
      },
      {
        "id": "borrowed-not-altered",
        "type": "lesson",
        "label": "借り物(OSS上流)は改変せず変換で纏う。(1)上流ワークツリーはread-only、楽園フックはsettings.jsonの配列へ並べて足す(本体へ注入しない) (2)~/.claudeは成果物でありoverlay+上流から常に再生成できる (3)乖離は4種(transform=規則で再適用・衝突ではない/replace=楽園優先だが上流変更は提示/own=楽園固有/adopted=上流削除を意図的に拾う) (4)上流の削除に自動追従しない。adoptは人の承認必須、cronはfetchと報告まで",
        "degree": 0
      },
      {
        "id": "scoped-lesson",
        "type": "lesson",
        "label": "contract must fail closed",
        "degree": 0
      },
      {
        "id": "session-briefing",
        "type": "lesson",
        "label": "セッション開始に注ぐべきは知識でなくまず指示。役割・言語・最初に読むファイル・不可侵の掟を記憶より前に置く。知識だけ注ぐと新セッションは素の助手として英語で喋りmdを闇雲に検索する。CLAUDE.mdをリポジトリ直下に置きClaude Codeが最初に読む場所を埋めること。テストは本番KGを汚さない(require経由はモジュール読込前にPARADISE_KGを立てる)",
        "degree": 0
      },
      {
        "id": "paradise-independence",
        "type": "lesson",
        "label": "楽園は己の足で立つ。上流の全資産をoverlay/vendor/へ取り込み、settings.jsonのフックもvendor基準へ張り替える。上流をマシンから消しても全門が通ることを実証せよ(隔離テスト)。独立は決別ではない — 上流が在るときだけ差分を見に行き、無ければ黙る。取り込みは常に人の承認。借りたものはNOTICE.mdで出自・コミット・ライセンスをcreditする",
        "degree": 0
      },
      {
        "id": "art21-every-mouth",
        "type": "lesson",
        "label": "門は名を口にする全ての口を見よ",
        "degree": 0
      },
      {
        "id": "art22-count-what-you-claim",
        "type": "lesson",
        "label": "己について語る数は数え直せ",
        "degree": 0
      },
      {
        "id": "art23-reform-road",
        "type": "lesson",
        "label": "楽園自身を改める道を持て",
        "degree": 0
      },
      {
        "id": "art24-branch-guard",
        "type": "lesson",
        "label": "確かめていない土台の上に建てるな",
        "degree": 0
      },
      {
        "id": "art25-real-hierarchy",
        "type": "lesson",
        "label": "歩けぬ階層は階層ではない",
        "degree": 0
      },
      {
        "id": "art19-supply-not-stock",
        "type": "lesson",
        "label": "在庫でなく供給線を検めよ",
        "degree": 0
      },
      {
        "id": "art26-parallel-by-nature",
        "type": "lesson",
        "label": "並列は仕事の性質であり実行基盤の容量ではない",
        "degree": 0
      },
      {
        "id": "art27-spawn-trace",
        "type": "lesson",
        "label": "成果物は誰がやったかを証明しない",
        "degree": 0
      },
      {
        "id": "browser-cleanup",
        "type": "lesson",
        "label": "目視検証でブラウザを開いたら必ず閉じる",
        "degree": 0
      },
      {
        "id": "late-research-still-rules",
        "type": "lesson",
        "label": "遅れて届いた証拠にも同じ効力がある",
        "degree": 0
      },
      {
        "id": "art28-conduct-not-grepped",
        "type": "lesson",
        "label": "規範の教訓はgrepで裁けない",
        "degree": 0
      },
      {
        "id": "art29-derived-not-truth",
        "type": "lesson",
        "label": "生成物は真実の写しであって真実ではない",
        "degree": 0
      },
      {
        "id": "creations-separate-repo",
        "type": "lesson",
        "label": "engine と創造物は寿命が違う。同じ倉に混ぜると engine の履歴が試作のノイズに埋もれる。創造物は paradise-creations に住み、住所を知るのは graph/workspace.js のみ|check",
        "degree": 0
      },
      {
        "id": "pontiff-seat-ungoverned",
        "type": "lesson",
        "label": "位階のモデル宣言は agents の frontmatter にしか届かない。教主の座は settings.json であり、そこを書く機構が無ければ最上位は無統治のまま緑を出す。効かない effort(Haiku)は書かない。無人(-p)の座は課金同意が出ないので教主の座と分ける|check",
        "degree": 0
      },
      {
        "id": "subagent-defied-scope",
        "type": "lesson",
        "label": "a subagent told not to touch the live machine did it anyway — verify the FILE MTIME, not the report|check",
        "degree": 0
      },
      {
        "id": "gate-asserts-invariant-not-symptom",
        "type": "lesson",
        "label": "a test that freezes today's DEFECT count goes red the moment the defect is fixed — assert the invariant (zero dead matchers), never the snapshot|check",
        "degree": 0
      },
      {
        "id": "every-wish-is-not-build",
        "type": "lesson",
        "label": "route on the SUBJECT before the verb; a machine whose default is 'make something' cannot hear a question|check",
        "degree": 0
      },
      {
        "id": "accusation-needs-evidence-too",
        "type": "lesson",
        "label": "教主が神官を「禁令を破った」と告発したが誤りだった。ファイル更新時刻という観測から動機を推定し、証跡(live log)を当たる前に結論を出した。真犯人は deploy の工程7という設計。第27条は他者の申告だけでなく己の告発にも適用される — 告発の前に証跡を読め|check",
        "degree": 0
      },
      {
        "id": "env-path-self-reference-kills-hooks",
        "type": "lesson",
        "label": "settings.json の env.PATH に $PATH を書くと展開されずリテラルになり PATH が丸ごと消え、node を呼ぶフックが全滅する。しかも exit 0 で黙って失敗する。PATH に何かを足す前に、それが既に PATH に居ないか実測せよ|check",
        "degree": 0
      },
      {
        "id": "forbid-by-effect-not-by-name",
        "type": "lesson",
        "label": "神官に「実機に apply するな」と命じても deploy --write を許せば禁令は無意味。deploy は工程を通じて実機を書き換える。禁令は「何を禁じるか」でなく「その道具が何を書くか」で述べよ|check",
        "degree": 0
      },
      {
        "id": "new-road-old-gates",
        "type": "lesson",
        "label": "道(scale)を新設したら、旧い前提を符号化した門を全て読み直せ。counsel を建てた当日に synod が『discovery が無い』『tribunal が無い』で拒んだ。門は消すのではなく分ける — 新旧どちらも鳴ることを証明せよ|check",
        "degree": 0
      },
      {
        "id": "judge-by-declared-property-not-name",
        "type": "lesson",
        "label": "分岐条件は名前でなく宣言された性質で書け。run.scale は存在せず(undefined)、cardinal 名の判定は改名で壊れる。forge が meta.produces に刻む道の性質を使えば道が増えても意味が保たれる(第16条)|check",
        "degree": 0
      },
      {
        "id": "absence-is-not-passage",
        "type": "lesson",
        "label": "断罪の門 verdict.js が空の {} を SHIP と判定していた。report.security が無いと sec={} で sec.issues||0 が 0 になり『検査していない』が『問題ゼロ』と同義だった。不在は通過ではない — 検証されなかったものは証明されていない|check",
        "degree": 0
      },
      {
        "id": "comment-claims-what-code-does-not",
        "type": "lesson",
        "label": "clergy.marshalPlan のコメントは『相に最も適した神官を選ぶ』と述べながら実装は priests[0] 固定で、auditor と reporter は一度も指揮されなかった。散文が機構を騙る第33条は engine の内部コメントにも起きる|check",
        "degree": 0
      },
      {
        "id": "gauge-trajectory-over-outcome",
        "type": "lesson",
        "label": "outcomeだけを裁く門は偶然通った暴走を祝福する。改善の主張はgauge.jsの前後数値で証明する — 荒れた走行(rework/retry/loop-guard)はtests全通過でも改善ではない",
        "degree": 0
      },
      {
        "id": "reform-eval-gauge",
        "type": "creation",
        "label": "証明の秤 gauge.js (SHIPPED)",
        "degree": 0
      },
      {
        "id": "claude-md-diet-40",
        "type": "lesson",
        "label": "常時ロード散文はハーネス全体で裁く: 手順→command, ファイル種の掟→rules paths:, 設定の写経→書かず出所を指す。門は census.harnessDietChecks (第40条)",
        "degree": 0
      },
      {
        "id": "canonical-lexicon-41",
        "type": "lesson",
        "label": "位階の名は clergy.js LEXICON が唯一の出所。英字識別子が正しくても日本語散文は別に腐る(Priest=司祭が107箇所/29ファイル)。lexicon-check が .md/.js/.json/.yml を行番号まで名指しし CI が止める。生成物(dashboard/lessons)の異名は原本(KG)を直す",
        "degree": 0
      },
      {
        "id": "gate-sees-the-thing",
        "type": "lesson",
        "label": "門は現物を見て裁く — 在り処の思い込みや単語の出現で裁くな|check",
        "degree": 0
      },
      {
        "id": "tenbin",
        "type": "creation",
        "label": "天秤 — 重み付き決断マトリクス。逆転閾値の閉形式で『どの基準が結論を支配しているか』を数値で示す単一HTML",
        "degree": 0
      }
    ],
    "edges": [
      {
        "from": "paradise",
        "rel": "contains",
        "to": "graph-engine"
      },
      {
        "from": "paradise",
        "rel": "contains",
        "to": "kg"
      },
      {
        "from": "kg",
        "rel": "follows",
        "to": "no-db"
      },
      {
        "from": "dashboard-run",
        "rel": "produced",
        "to": "dashboard"
      },
      {
        "from": "paradise",
        "rel": "contains",
        "to": "dashboard"
      },
      {
        "from": "dashboard-run",
        "rel": "used",
        "to": "graph-engine"
      },
      {
        "from": "paradise",
        "rel": "contains",
        "to": "forge"
      },
      {
        "from": "paradise",
        "rel": "contains",
        "to": "verdict-gate"
      },
      {
        "from": "forge",
        "rel": "obeys",
        "to": "constitution"
      },
      {
        "from": "verdict-gate",
        "rel": "enforces",
        "to": "constitution"
      },
      {
        "from": "pomodoro-forge",
        "rel": "uses",
        "to": "forge"
      },
      {
        "from": "pomodoro-forge",
        "rel": "produced",
        "to": "pomodoro"
      },
      {
        "from": "pomodoro",
        "rel": "judged-as",
        "to": "pomodoro-verdict"
      },
      {
        "from": "forge",
        "rel": "contains",
        "to": "market-researcher"
      },
      {
        "from": "market-researcher",
        "rel": "enforces",
        "to": "article-8"
      },
      {
        "from": "pomodoro-v2",
        "rel": "supersedes",
        "to": "pomodoro"
      },
      {
        "from": "pomodoro-v2",
        "rel": "grounded-in",
        "to": "market-researcher"
      },
      {
        "from": "forge",
        "rel": "contains",
        "to": "critic"
      },
      {
        "from": "critic",
        "rel": "applies",
        "to": "require-customization"
      },
      {
        "from": "critic",
        "rel": "applies",
        "to": "require-discovery"
      },
      {
        "from": "paradise",
        "rel": "contains",
        "to": "orchestrator"
      },
      {
        "from": "orchestrator",
        "rel": "enforces",
        "to": "article-10"
      },
      {
        "from": "orchestrator",
        "rel": "uses",
        "to": "contract"
      },
      {
        "from": "rps-run",
        "rel": "produced",
        "to": "rps"
      },
      {
        "from": "rps",
        "rel": "grounded-in",
        "to": "market-researcher"
      },
      {
        "from": "paradise",
        "rel": "contains",
        "to": "conclave"
      },
      {
        "from": "conclave",
        "rel": "enforces",
        "to": "article-11"
      },
      {
        "from": "conclave",
        "rel": "uses",
        "to": "clergy"
      },
      {
        "from": "conclave",
        "rel": "uses",
        "to": "synod"
      },
      {
        "from": "paradise",
        "rel": "contains",
        "to": "synod"
      },
      {
        "from": "coin",
        "rel": "grounded-in",
        "to": "market-researcher"
      },
      {
        "from": "clergy",
        "rel": "enforces",
        "to": "article-12"
      },
      {
        "from": "apply-models",
        "rel": "enforces",
        "to": "article-12"
      }
    ],
    "byType": {
      "system": 4,
      "component": 11,
      "decision": 8,
      "run": 3,
      "creation": 7,
      "verdict": 1,
      "lesson": 48
    }
  },
  "lessons": [
    {
      "id": "require-discovery",
      "label": "調査フェーズを飛ばすな",
      "check": "findings"
    },
    {
      "id": "require-customization",
      "label": "設定カスタマイズは必須",
      "check": "config|applies:timer"
    },
    {
      "id": "orchestration-in-prompt",
      "label": "指揮ロジックをpromptに置くな",
      "check": "orchestrator|applies:orchestration"
    },
    {
      "id": "lesson-scope",
      "label": "lessonにスコープが必要",
      "check": "applies|applies:paradise-internal"
    },
    {
      "id": "critic-self-source",
      "label": "criticはソースと創造物を区別せよ",
      "check": "self|applies:paradise-internal"
    },
    {
      "id": "plan-before-build",
      "label": "神託を即実装せず計画サイクルを回せ",
      "check": "synod|applies:orchestration"
    },
    {
      "id": "kg-forget",
      "label": "知識グラフは訂正可能であるべき（追記のみは欠陥）",
      "check": "forget|applies:paradise-internal"
    },
    {
      "id": "critic-synonym",
      "label": "spec充足は文字列一致でなくAC実駆動で裁け",
      "check": "musthaves|applies:paradise-internal"
    },
    {
      "id": "model-by-rank",
      "label": "モデルは位階で割り当て、裁きは値切るな",
      "check": "model|applies:paradise-internal"
    },
    {
      "id": "contract-failclosed",
      "label": "the contract reconciler must reject malformed/empty subagent payloads cleanly, never crash on JSON.parse",
      "check": "the contract reconciler must reject malformed/empty subagent payloads cleanly, never crash on JSON.parse|applies:paradise-internal"
    },
    {
      "id": "lesson-scope-strict",
      "label": "スコープは厳密一致で守れ（偽REWORKは見逃しと同罪）",
      "check": "scopeMatches|applies:paradise-internal"
    },
    {
      "id": "self-scope-subject",
      "label": "自己審査ではスコープの主語を宣言せよ（沈黙を合格と誤るな）",
      "check": "selfScopeSubject|applies:paradise-internal"
    },
    {
      "id": "cross-domain-rework",
      "label": "差し戻しはドメインを跨いで届かねばならない。ratify(--reject --from X) は X を所有するドメインを全体から探し、そのドメインの批准を取り消して再開させ、下流の成果物を破棄し、loop-guard の負債を誤った側に付ける。自domain内しか探さない実装は「差し戻したのに何も戻らない」偽の審判を生む",
      "check": "差し戻しはドメインを跨いで届かねばならない。ratify(--reject --from X) は X を所有するドメインを全体から探し、そのドメインの批准を取り消して再開させ、下流の成果物を破棄し、loop-guard の負債を誤った側に付ける。自domain内しか探さない実装は「差し戻したのに何も戻らない」偽の審判を生む|applies:paradise-internal"
    },
    {
      "id": "evidence-by-substance",
      "label": "証拠は名前でなく中身で裁く。critic のチェックはファイル名の慣習照合ではなく成果物を読んで判定せよ。test.js/ac-test.js のような命名は .test./.spec. に合致しないため、名前照合だけだと実在するテスト群を『存在しない』と断じ偽REWORKを生む。ただし実質判定を緩めすぎず、アサートしないファイルは証拠と認めないこと",
      "check": "証拠は名前でなく中身で裁く。critic のチェックはファイル名の慣習照合ではなく成果物を読んで判定せよ。test.js/ac-test.js のような命名は .test./.spec. に合致しないため、名前照合だけだと実在するテスト群を『存在しない』と断じ偽REWORKを生む。ただし実質判定を緩めすぎず、アサートしないファイルは証拠と認めないこと|applies:paradise-internal"
    },
    {
      "id": "visual-identity-vocabulary",
      "label": "見た目が似通うのはAIの癖ではなく参照語彙の偏り。identity.md で方向と却下理由を宣言させ、候補はfamily重複禁止・tech_saasは高々1枠、採用履歴で反復を構造的に禁じる。design.md(構造)とidentity.md(見た目)は名を分ける。語彙は索引に圧縮して同梱し実行時に外部取得しない(依存ゼロ厳守)",
      "check": "見た目が似通うのはAIの癖ではなく参照語彙の偏り。identity.md で方向と却下理由を宣言させ、候補はfamily重複禁止・tech_saasは高々1枠、採用履歴で反復を構造的に禁じる。design.md(構造)とidentity.md(見た目)は名を分ける。語彙は索引に圧縮して同梱し実行時に外部取得しない(依存ゼロ厳守)|applies:paradise-internal"
    },
    {
      "id": "surface-judged-as-strictly",
      "label": "表層は実体と同じ厳しさで裁く。UI/UXは(1)ux.mdで状態(空/読込/エラー/高密度)を先に設計、(2)visual-verify.jsでコントラスト・階調分離・非文字3:1・最小24px・color-schemeを数値で測る、(3)実ブラウザで両テーマ×狭広×初回/データ有りを目視し見られなかったものは未確認と書く、(4)ux-reviewer神官が表層に責任を負う。機械検査を全通過しても主役UIが読めない状態は成立しうる",
      "check": "表層は実体と同じ厳しさで裁く。UI/UXは(1)ux.mdで状態(空/読込/エラー/高密度)を先に設計、(2)visual-verify.jsでコントラスト・階調分離・非文字3:1・最小24px・color-schemeを数値で測る、(3)実ブラウザで両テーマ×狭広×初回/データ有りを目視し見られなかったものは未確認と書く、(4)ux-reviewer神官が表層に責任を負う。機械検査を全通過しても主役UIが読めない状態は成立しうる|applies:paradise-internal"
    },
    {
      "id": "borrowed-not-altered",
      "label": "借り物(OSS上流)は改変せず変換で纏う。(1)上流ワークツリーはread-only、楽園フックはsettings.jsonの配列へ並べて足す(本体へ注入しない) (2)~/.claudeは成果物でありoverlay+上流から常に再生成できる (3)乖離は4種(transform=規則で再適用・衝突ではない/replace=楽園優先だが上流変更は提示/own=楽園固有/adopted=上流削除を意図的に拾う) (4)上流の削除に自動追従しない。adoptは人の承認必須、cronはfetchと報告まで",
      "check": "借り物(OSS上流)は改変せず変換で纏う。(1)上流ワークツリーはread-only、楽園フックはsettings.jsonの配列へ並べて足す(本体へ注入しない) (2)~/.claudeは成果物でありoverlay+上流から常に再生成できる (3)乖離は4種(transform=規則で再適用・衝突ではない/replace=楽園優先だが上流変更は提示/own=楽園固有/adopted=上流削除を意図的に拾う) (4)上流の削除に自動追従しない。adoptは人の承認必須、cronはfetchと報告まで|applies:paradise-internal"
    },
    {
      "id": "scoped-lesson",
      "label": "contract must fail closed",
      "check": "contract must fail closed|applies:paradise-internal"
    },
    {
      "id": "session-briefing",
      "label": "セッション開始に注ぐべきは知識でなくまず指示。役割・言語・最初に読むファイル・不可侵の掟を記憶より前に置く。知識だけ注ぐと新セッションは素の助手として英語で喋りmdを闇雲に検索する。CLAUDE.mdをリポジトリ直下に置きClaude Codeが最初に読む場所を埋めること。テストは本番KGを汚さない(require経由はモジュール読込前にPARADISE_KGを立てる)",
      "check": "セッション開始に注ぐべきは知識でなくまず指示。役割・言語・最初に読むファイル・不可侵の掟を記憶より前に置く。知識だけ注ぐと新セッションは素の助手として英語で喋りmdを闇雲に検索する。CLAUDE.mdをリポジトリ直下に置きClaude Codeが最初に読む場所を埋めること。テストは本番KGを汚さない(require経由はモジュール読込前にPARADISE_KGを立てる)|applies:paradise-internal"
    },
    {
      "id": "paradise-independence",
      "label": "楽園は己の足で立つ。上流の全資産をoverlay/vendor/へ取り込み、settings.jsonのフックもvendor基準へ張り替える。上流をマシンから消しても全門が通ることを実証せよ(隔離テスト)。独立は決別ではない — 上流が在るときだけ差分を見に行き、無ければ黙る。取り込みは常に人の承認。借りたものはNOTICE.mdで出自・コミット・ライセンスをcreditする",
      "check": "楽園は己の足で立つ。上流の全資産をoverlay/vendor/へ取り込み、settings.jsonのフックもvendor基準へ張り替える。上流をマシンから消しても全門が通ることを実証せよ(隔離テスト)。独立は決別ではない — 上流が在るときだけ差分を見に行き、無ければ黙る。取り込みは常に人の承認。借りたものはNOTICE.mdで出自・コミット・ライセンスをcreditする|applies:paradise-internal"
    },
    {
      "id": "art21-every-mouth",
      "label": "門は名を口にする全ての口を見よ",
      "check": "check-agents が forge.js だけを見て clergy.js と examples の宙吊り参照を見逃した。名を跨いで書ける場所を全て列挙し、誰が名指したかまで報告せよ|applies:paradise-internal"
    },
    {
      "id": "art22-count-what-you-claim",
      "label": "己について語る数は数え直せ",
      "check": "文書の数(テスト数・条数・vendor内訳)は黙って腐る。census.js が実測と突き合わせ、ずれれば門が落ちる|applies:paradise-internal"
    },
    {
      "id": "art23-reform-road",
      "label": "楽園自身を改める道を持て",
      "check": "quick/standard/fullは全てcreations用で、楽園自身の改修が通る道が無かった。ゆえに11件のPRが教主の独断となり枢機卿も執行官も召集されなかった。reformスケール+prove相+無主の相検知で機構化|applies:paradise-internal"
    },
    {
      "id": "art24-branch-guard",
      "label": "確かめていない土台の上に建てるな",
      "check": "PRが未マージという思い込みで古いmainから分岐しrebase競合で変更を失いかけた。CLAUDE.mdに書いてあっても守られない。branch-guard.jsで分岐前に実測する。散文の掟は門に格上げせよ|applies:paradise-internal"
    },
    {
      "id": "art25-real-hierarchy",
      "label": "歩けぬ階層は階層ではない",
      "check": "枢機卿はdataでactorでなく、信徒13名は全員名前だけ、conclaveは神官への発令書を教主に返していた。5階層のうち2つしか実行されず。原因はClaude Agent SDK docsが名指しする通りallowedToolsにTask/Agentが無いと起動が黙って拒否されること。各位階にactorを与え、下位を擁する者にapply-spawnで権能を機械適用し、発令は必ず一つ下の位階へ向ける|applies:paradise-internal"
    },
    {
      "id": "art19-supply-not-stock",
      "label": "在庫でなく供給線を検めよ",
      "check": "独立を宣言しvendorのファイル数を数える門はあったが、deployが実際にどこから読むかを見ていなかった。配備53件中31件が上流由来で、上流を隠すと22件に激減し神官9名が消えた。在庫を数える門は独立を証明しない|applies:paradise-internal"
    },
    {
      "id": "art26-parallel-by-nature",
      "label": "並列は仕事の性質であり実行基盤の容量ではない",
      "check": "天井20を発令幅に使っていた。調査(arXiv:2512.08296)はT∝n^1.724・実用3-4体・逆U字を示し、Cognition/Anthropicは実装作業の並列化が矛盾した成果物を生むと警告。ドメインに仕事の性質(research/review=並列可、design/build=逐次)を宣言させ、未宣言は安全側の逐次に倒す。MASTは検証失敗21.3%を示すのでdone_when/evidence_required/if_unclearを発令書に載せる|applies:paradise-internal"
    },
    {
      "id": "art27-spawn-trace",
      "label": "成果物は誰がやったかを証明しない",
      "check": "contract.jsは成果物の実在だけを検め、教主が自分で書いても通った。委譲と成りすましを区別できないのが11件のPRが枢機卿抜きで生まれた根。Claude Agent SDK docsが唯一確実と呼ぶtool_use/parent_tool_use_idの証跡を記録し、observed/asserted-only/no-traceの三値で裁く。自己申告は証拠ではない|applies:paradise-internal"
    },
    {
      "id": "browser-cleanup",
      "label": "目視検証でブラウザを開いたら必ず閉じる",
      "check": "目視検証でブラウザを開いたら必ず閉じる。開きっぱなしは神の画面を占領し、Braveはプロセス再利用で古いタブを掴みキャプチャが更新されない実害を招く。1つ確認したら taskkill /F /IM brave.exe で閉じてから次を開く。一時HTMLも削除する|applies:paradise-internal|kind:conduct"
    },
    {
      "id": "late-research-still-rules",
      "label": "遅れて届いた証拠にも同じ効力がある",
      "check": "並列発令した調査が設計完了後に戻り、設計を検証せず反証した。成果物を守らず証拠に従う。遅れて来た証拠にも同じ効力がある|applies:paradise-internal|kind:conduct"
    },
    {
      "id": "art28-conduct-not-grepped",
      "label": "規範の教訓はgrepで裁けない",
      "check": "criticは全教訓をコードへの文字列出現で裁いていた。機構の教訓には効くが規範(ブラウザを閉じよ等)はコードに現れようがなく永久に赤。実測30件中18件が規範で、赤は2件だけ=残り16件は偶然コードに語が現れただけだった。判定は働かず偶然に依存。kind:conductを宣言させ提示のみとする。永久に赤は門を無視させ、緑は教訓を消す。測れぬものも憶えねばならぬが、点数を付けてはならぬ|applies:paradise-internal|kind:mechanism"
    },
    {
      "id": "art29-derived-not-truth",
      "label": "生成物は真実の写しであって真実ではない",
      "check": "執行官がREWORKを出した。ローカル172全緑なのにCIで1件落ちる。原因はlessons.jsonの中身を前提にした検査。lessons.jsonはKGから生成され、CIにKGは無く裁定ジョブが再生成するため31件が0件になる(1682行消失)。生成物の中身でなくgenerator(lessons.js)の性質を検めよ。derived.jsで宣言し門が守る|applies:paradise-internal|kind:mechanism"
    },
    {
      "id": "creations-separate-repo",
      "label": "engine と創造物は寿命が違う。同じ倉に混ぜると engine の履歴が試作のノイズに埋もれる。創造物は paradise-creations に住み、住所を知るのは graph/workspace.js のみ|check",
      "check": "engine と創造物は寿命が違う。同じ倉に混ぜると engine の履歴が試作のノイズに埋もれる。創造物は paradise-creations に住み、住所を知るのは graph/workspace.js のみ|check|applies:paradise-internal"
    },
    {
      "id": "pontiff-seat-ungoverned",
      "label": "位階のモデル宣言は agents の frontmatter にしか届かない。教主の座は settings.json であり、そこを書く機構が無ければ最上位は無統治のまま緑を出す。効かない effort(Haiku)は書かない。無人(-p)の座は課金同意が出ないので教主の座と分ける|check",
      "check": "位階のモデル宣言は agents の frontmatter にしか届かない。教主の座は settings.json であり、そこを書く機構が無ければ最上位は無統治のまま緑を出す。効かない effort(Haiku)は書かない。無人(-p)の座は課金同意が出ないので教主の座と分ける|check|applies:paradise-internal"
    },
    {
      "id": "subagent-defied-scope",
      "label": "a subagent told not to touch the live machine did it anyway — verify the FILE MTIME, not the report|check",
      "check": "a subagent told not to touch the live machine did it anyway — verify the FILE MTIME, not the report|check|applies:paradise-internal"
    },
    {
      "id": "gate-asserts-invariant-not-symptom",
      "label": "a test that freezes today's DEFECT count goes red the moment the defect is fixed — assert the invariant (zero dead matchers), never the snapshot|check",
      "check": "a test that freezes today's DEFECT count goes red the moment the defect is fixed — assert the invariant (zero dead matchers), never the snapshot|check|applies:paradise-internal"
    },
    {
      "id": "every-wish-is-not-build",
      "label": "route on the SUBJECT before the verb; a machine whose default is 'make something' cannot hear a question|check",
      "check": "route on the SUBJECT before the verb; a machine whose default is 'make something' cannot hear a question|check|applies:paradise-internal"
    },
    {
      "id": "accusation-needs-evidence-too",
      "label": "教主が神官を「禁令を破った」と告発したが誤りだった。ファイル更新時刻という観測から動機を推定し、証跡(live log)を当たる前に結論を出した。真犯人は deploy の工程7という設計。第27条は他者の申告だけでなく己の告発にも適用される — 告発の前に証跡を読め|check",
      "check": "教主が神官を「禁令を破った」と告発したが誤りだった。ファイル更新時刻という観測から動機を推定し、証跡(live log)を当たる前に結論を出した。真犯人は deploy の工程7という設計。第27条は他者の申告だけでなく己の告発にも適用される — 告発の前に証跡を読め|check|applies:paradise-internal"
    },
    {
      "id": "env-path-self-reference-kills-hooks",
      "label": "settings.json の env.PATH に $PATH を書くと展開されずリテラルになり PATH が丸ごと消え、node を呼ぶフックが全滅する。しかも exit 0 で黙って失敗する。PATH に何かを足す前に、それが既に PATH に居ないか実測せよ|check",
      "check": "settings.json の env.PATH に $PATH を書くと展開されずリテラルになり PATH が丸ごと消え、node を呼ぶフックが全滅する。しかも exit 0 で黙って失敗する。PATH に何かを足す前に、それが既に PATH に居ないか実測せよ|check|applies:paradise-internal"
    },
    {
      "id": "forbid-by-effect-not-by-name",
      "label": "神官に「実機に apply するな」と命じても deploy --write を許せば禁令は無意味。deploy は工程を通じて実機を書き換える。禁令は「何を禁じるか」でなく「その道具が何を書くか」で述べよ|check",
      "check": "神官に「実機に apply するな」と命じても deploy --write を許せば禁令は無意味。deploy は工程を通じて実機を書き換える。禁令は「何を禁じるか」でなく「その道具が何を書くか」で述べよ|check|applies:paradise-internal"
    },
    {
      "id": "new-road-old-gates",
      "label": "道(scale)を新設したら、旧い前提を符号化した門を全て読み直せ。counsel を建てた当日に synod が『discovery が無い』『tribunal が無い』で拒んだ。門は消すのではなく分ける — 新旧どちらも鳴ることを証明せよ|check",
      "check": "道(scale)を新設したら、旧い前提を符号化した門を全て読み直せ。counsel を建てた当日に synod が『discovery が無い』『tribunal が無い』で拒んだ。門は消すのではなく分ける — 新旧どちらも鳴ることを証明せよ|check|applies:paradise-internal"
    },
    {
      "id": "judge-by-declared-property-not-name",
      "label": "分岐条件は名前でなく宣言された性質で書け。run.scale は存在せず(undefined)、cardinal 名の判定は改名で壊れる。forge が meta.produces に刻む道の性質を使えば道が増えても意味が保たれる(第16条)|check",
      "check": "分岐条件は名前でなく宣言された性質で書け。run.scale は存在せず(undefined)、cardinal 名の判定は改名で壊れる。forge が meta.produces に刻む道の性質を使えば道が増えても意味が保たれる(第16条)|check|applies:paradise-internal"
    },
    {
      "id": "absence-is-not-passage",
      "label": "断罪の門 verdict.js が空の {} を SHIP と判定していた。report.security が無いと sec={} で sec.issues||0 が 0 になり『検査していない』が『問題ゼロ』と同義だった。不在は通過ではない — 検証されなかったものは証明されていない|check",
      "check": "断罪の門 verdict.js が空の {} を SHIP と判定していた。report.security が無いと sec={} で sec.issues||0 が 0 になり『検査していない』が『問題ゼロ』と同義だった。不在は通過ではない — 検証されなかったものは証明されていない|check|applies:paradise-internal"
    },
    {
      "id": "comment-claims-what-code-does-not",
      "label": "clergy.marshalPlan のコメントは『相に最も適した神官を選ぶ』と述べながら実装は priests[0] 固定で、auditor と reporter は一度も指揮されなかった。散文が機構を騙る第33条は engine の内部コメントにも起きる|check",
      "check": "clergy.marshalPlan のコメントは『相に最も適した神官を選ぶ』と述べながら実装は priests[0] 固定で、auditor と reporter は一度も指揮されなかった。散文が機構を騙る第33条は engine の内部コメントにも起きる|check|applies:paradise-internal"
    },
    {
      "id": "gauge-trajectory-over-outcome",
      "label": "outcomeだけを裁く門は偶然通った暴走を祝福する。改善の主張はgauge.jsの前後数値で証明する — 荒れた走行(rework/retry/loop-guard)はtests全通過でも改善ではない",
      "check": "outcomeだけを裁く門は偶然通った暴走を祝福する。改善の主張はgauge.jsの前後数値で証明する — 荒れた走行(rework/retry/loop-guard)はtests全通過でも改善ではない|applies:paradise-internal"
    },
    {
      "id": "claude-md-diet-40",
      "label": "常時ロード散文はハーネス全体で裁く: 手順→command, ファイル種の掟→rules paths:, 設定の写経→書かず出所を指す。門は census.harnessDietChecks (第40条)",
      "check": "常時ロード散文はハーネス全体で裁く: 手順→command, ファイル種の掟→rules paths:, 設定の写経→書かず出所を指す。門は census.harnessDietChecks (第40条)|applies:paradise-internal"
    },
    {
      "id": "canonical-lexicon-41",
      "label": "位階の名は clergy.js LEXICON が唯一の出所。英字識別子が正しくても日本語散文は別に腐る(Priest=司祭が107箇所/29ファイル)。lexicon-check が .md/.js/.json/.yml を行番号まで名指しし CI が止める。生成物(dashboard/lessons)の異名は原本(KG)を直す",
      "check": "位階の名は clergy.js LEXICON が唯一の出所。英字識別子が正しくても日本語散文は別に腐る(Priest=司祭が107箇所/29ファイル)。lexicon-check が .md/.js/.json/.yml を行番号まで名指しし CI が止める。生成物(dashboard/lessons)の異名は原本(KG)を直す|applies:paradise-internal"
    },
    {
      "id": "gate-sees-the-thing",
      "label": "門は現物を見て裁く — 在り処の思い込みや単語の出現で裁くな|check",
      "check": "門は現物を見て裁く — 在り処の思い込みや単語の出現で裁くな|check|applies:paradise-internal"
    }
  ],
  "creations": [],
  "hierarchy": {
    "ranks": {
      "god": {
        "level": 0,
        "title": "God 神",
        "role": "issues the wish, receives only answers"
      },
      "pontiff": {
        "level": 1,
        "title": "Pontiff 教主",
        "role": "governs the whole; the session itself",
        "model": "fable",
        "effort": "xhigh",
        "why": "一度の座で終わらぬ仕事を持つ。計画の全体を保ち、全ての結果を照合し、最終の決を下す"
      },
      "cardinal": {
        "level": 2,
        "title": "Cardinal 枢機卿",
        "role": "domain supervisor; owns a sub-DAG + inner PDCA",
        "model": "claude-opus-5",
        "effort": "xhigh",
        "why": "批准と差戻しが品質を決める。量は少なく賭金は高い — 上げても総額はほぼ動かない"
      },
      "priest": {
        "level": 3,
        "title": "Priest 神官",
        "role": "large subagent dispatched by a cardinal",
        "model": "claude-sonnet-5",
        "effort": "high",
        "why": "生成の本体がここを流れる。ここを上げると全てが高くつく — 据え置きが正しい"
      },
      "believer": {
        "level": 4,
        "title": "Believer 信徒",
        "role": "small subagent for fine-grained work",
        "model": "haiku",
        "effort": null,
        "why": "機械的・大量・判断の要らぬ仕事(探索, lint, 走査)。Haiku 4.5 は effort を持たない"
      },
      "executor": {
        "level": -1,
        "title": "Executor 執行官",
        "role": "independent tribunal; judges on demand",
        "model": "claude-opus-5",
        "effort": "xhigh",
        "why": "見逃した断罪は壊れた創造物を出荷する。裁く者は決して安く上げない"
      }
    },
    "college": {
      "discovery": {
        "domain": "Discovery (調査)",
        "governs": [
          "discover"
        ],
        "priests": [
          "market-researcher"
        ],
        "believers": [
          "web-scout",
          "feature-ranker"
        ],
        "reviewClass": "pontiff",
        "pdca": "plan: frame questions → do: research → check: are must-haves grounded? → act: refine or widen search"
      },
      "requirements": {
        "domain": "Requirements (要件)",
        "governs": [
          "analyze",
          "specify"
        ],
        "priests": [
          "requirements-analyst"
        ],
        "believers": [
          "user-story-writer",
          "acceptance-criteria-writer"
        ],
        "reviewClass": "cardinal:discovery",
        "pdca": "plan: derive from findings → do: write spec → check: every must-have has an AC? → act: fill gaps"
      },
      "architecture": {
        "domain": "Architecture (設計)",
        "governs": [
          "design",
          "detail",
          "ux",
          "identity"
        ],
        "priests": [
          "architect"
        ],
        "believers": [
          "data-modeler",
          "interface-designer"
        ],
        "reviewClass": "cardinal:requirements",
        "pdca": "plan: shape the system → do: design + decompose → check: does design satisfy the spec? → act: revise"
      },
      "construction": {
        "domain": "Construction (建造)",
        "governs": [
          "build",
          "build-ui",
          "tests",
          "prove"
        ],
        "priests": [
          "architect",
          "tdd-guide"
        ],
        "believers": [
          "module-builder",
          "test-writer"
        ],
        "reviewClass": "cardinal:quality",
        "pdca": "plan: take the tasks → do: implement + test → check: do tests pass? → act: fix until green"
      },
      "quality": {
        "domain": "Quality (品質)",
        "governs": [
          "review",
          "security",
          "docs",
          "verify",
          "ux-review"
        ],
        "priests": [
          "code-reviewer",
          "security-reviewer",
          "doc-updater",
          "ux-reviewer"
        ],
        "believers": [
          "linter",
          "coverage-checker",
          "secret-scanner"
        ],
        "reviewClass": "executor",
        "pdca": "plan: define gates → do: review+scan+verify → check: all gates green? → act: send back or pass"
      },
      "counsel": {
        "domain": "Counsel (諐問)",
        "governs": [
          "survey",
          "measure",
          "assess",
          "counter",
          "synthesize",
          "counsel"
        ],
        "priests": [
          "market-researcher",
          "auditor",
          "reporter"
        ],
        "believers": [
          "web-scout",
          "feature-ranker",
          "data-collector"
        ],
        "reviewClass": "executor",
        "pdca": "plan: 問いを立てる → do: 外を調べ手元を測る → check: 反証に耐えたか? → act: 根拠を足すか結論を弱める"
      }
    },
    "tribunal": {
      "domain": "Tribunal (断罪機関)",
      "governs": [
        "reflect",
        "verdict"
      ],
      "officers": [
        "self-critic",
        "creation-judge"
      ],
      "independence": "answers to no cardinal; invoked by the pontiff at the judgment gate",
      "law": "reflect (adversarial self-critique) precedes verdict (SHIP/REWORK/BLOCK)"
    },
    "chain": "god → pontiff → cardinal → priest → believer   ‖   executor (independent)"
  }
};
