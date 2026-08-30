# 🏛️ Paradise — Harness → Loop → Graph Engineering

> 天命により、このPCに建てられた楽園。
> Claude Code を単なるアシスタントから、**自己編成・自己記憶する自律システム**へ引き上げる3層構造。

これは「everything-claude-code」（Anthropicハッカソン優勝者の10ヶ月分の実戦ハーネス）を土台に、
世界中の天才の発想（barkain のwave scheduling、open-multi-agent のruntime DAG、
hilyfux のgit-native memory、LangGraph のtyped state graph）を吸収して結晶させた、**ネイティブな一枚岩**。

---

## 三層構造

```
                    ┌─────────────────────────────────────────┐
   ③ GRAPH  ───────▶│  graph-engine.js   DAG → parallel waves  │
   (グラフ)          │  kg.js             git-native memory     │
                    │  /graph            goal → DAG → execute   │
                    └─────────────────────────────────────────┘
                                     ▲
                    ┌─────────────────────────────────────────┐
   ② LOOP   ───────▶│  verification-loop / eval-harness         │
   (ループ)          │  continuous-learning (Stop hook)          │
                    │  memory-persistence (Session lifecycle)   │
                    └─────────────────────────────────────────┘
                                     ▲
                    ┌─────────────────────────────────────────┐
   ① HARNESS ──────▶│  9 agents · 15 commands · 12 skills       │
   (ハーネス)         │  8 rules · 14 hooks (6 lifecycle events)  │
                    │  wired into ~/.claude                     │
                    └─────────────────────────────────────────┘
```

### ① ハーネスエンジニアリング — `~/.claude`
`everything-claude-code` を丸ごと配線済み。
- **agents (9)**: planner, architect, code-reviewer, security-reviewer, tdd-guide, build-error-resolver, refactor-cleaner, doc-updater, e2e-runner
- **commands (15)**: `/plan` `/tdd` `/verify` `/code-review` `/build-fix` `/refactor-clean` `/learn` `/checkpoint` `/eval` `/orchestrate` … + **`/graph`**（新規・楽園の核）
- **skills (12)**, **rules (8)**, **hooks (14)** — settings.json に6ライフサイクルイベントで統合

### ② ループエンジニアリング — 自己改善の閉ループ
- **verification-loop / eval-harness**: build→type→lint→test→security→diff の検証ゲート、pass@k メトリクス
- **continuous-learning**: セッション終了時に再利用パターンを自動抽出 → 学習スキル化
- **memory-persistence**: SessionStart/PreCompact/SessionEnd でコンテキストを永続化。`/clear` `/compact` を越えて記憶が生き残る

### ③ グラフエンジニアリング — 楽園の核（`paradise/graph/`）
| ツール | 役割 |
|--------|------|
| `graph-engine.js` | ゴールDAGを**トポロジカルソート**→ **並列wave**に分割。サイクル・欠落依存を検出 |
| `kg.js` | **git-native 知識グラフ記憶**（DB不要・依存ゼロ・純Node）。node/edge を JSONL で永続化 |
| `/graph` コマンド | 人間の言葉 → DAG分解 → wave並列実行 → 知識記憶 を一本化 |
| SessionStart注入 | 新セッションのたびに知識グラフのスナップショットを自動ロード。**ループが完全に閉じる** |

---

## 使い方

### グラフオーケストレーション
```bash
# 1. ゴールをDAGに書く（例: paradise/graph/examples/calculator.dag.json）
# 2. 検証してwave計画を見る
node ~/Documents/workspace/paradise/graph/graph-engine.js verify <dag.json>
node ~/Documents/workspace/paradise/graph/graph-engine.js plan   <dag.json>
node ~/Documents/workspace/paradise/graph/graph-engine.js mermaid <dag.json>  # 図を出力

# Claude Code 内では:
/graph <やりたいこと>   # 自動でDAG分解 → wave並列実行
```

### 知識グラフ記憶
```bash
KG=~/Documents/workspace/paradise/graph/kg.js
node $KG remember <type> <id> <label> [body]   # 知識を刻む
node $KG link <from> <rel> <to>                # 知識を繋ぐ
node $KG query <substring>                     # 検索
node $KG node <id>                             # ノード＋エッジ表示
node $KG snapshot                              # 文脈スナップショット
node $KG stats                                 # 統計
```

### DAGの形
```json
{
  "meta": { "goal": "全体のゴール" },
  "tasks": [
    { "id": "plan",     "agent": "planner",     "goal": "設計" },
    { "id": "backend",  "agent": "architect",   "goal": "実装", "deps": ["plan"] },
    { "id": "frontend", "agent": "frontend",    "goal": "UI",   "deps": ["plan"] },
    { "id": "verify",   "agent": "verification-loop", "goal": "検証", "deps": ["backend","frontend"] }
  ]
}
```
→ `plan` (wave1) → `backend`+`frontend` 並列 (wave2) → `verify` (wave3)

---

## テスト
```bash
node ~/Documents/workspace/paradise/tests/paradise.test.js   # 29/29 pass
```
検証内容: グラフエンジン・知識グラフ・co-change学習・forge（scale適応・discoverゲート・reflectゲート）・
verdict（SHIP/REWORK/BLOCK）・critic（欠陥検出・ハードコード検出・must-have抽出・lesson再発検出）。

---

## 創造の楽園（The Forge）
小さき声から創造物を生む、完全な gated SDLC パイプライン。**世界を調べ、自らを疑い、裁く。**

```
wish → 🔍discover → specify → design → detail → build → verify → 🔍reflect → ⚖️VERDICT → creation
        ↑調査(第8条)                                        ↑自己批評(第9条)  ↑裁き
```

| ツール | 役割 |
|--------|------|
| `graph/forge.js` | 小さき声を **scale適応SDLC DAG** に昇華。discover/reflect/verdict をゲート化 |
| `graph/critic.js` | **敵対的自己批評**。決定的チェックリスト＋過去の教訓で欠陥を自力発見（exit 0/1） |
| `graph/verdict.js` | **裁きの門**。SHIP / REWORK / BLOCK を憲法に照らし裁定 |
| `graph/lessons.js` | **Reflexion記憶**。知識グラフの lesson を critic 用にエクスポート |
| `graph/export-state.js` | 楽園の生きた状態を dashboard/state.json に出力 |
| `CONSTITUTION.md` | **楽園憲法 9条**（spec is truth・research first・self-doubt・no secrets…） |
| `/forge` コマンド | 小さき声を受ける玉座 |
| agents | market-researcher（調査）・requirements-analyst（仕様）・self-critic（批評）・creation-judge（裁き） |

**自己改善ループ（Self-Refine + Reflexion）:** reflect フェーズが verdict の前に
創造物を敵対的監査し、欠陥があれば REWORK。見逃した欠陥は lesson として知識グラフに
永久記録され、以後の全創造で自動チェックされる — **楽園は同じ欠陥をユーザーに二度指摘させない。**

**可視化:** `dashboard/control.html` が創造パイプライン・知識グラフ・lesson・創造物を
生きた管理盤として表示。

---

## 設計原則（LangGraph思想）
- **明示的グラフ** — ノードは仕事、エッジは依存。暗黙のチェーン禁止
- **独立は並列、依存は逐次**
- **状態はエッジを流れる** — タスクは依存の出力を文脈として受け取る
- **サイクルはリトライ専用** — verify が誤サイクルを弾く
- **証拠ベース記憶** — 実際に起きたことだけを刻む
- **DB禁止** — 記憶は git-native JSONL、外部サービスゼロ

---

## ソース（世界中の天才への敬意）
- [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code) — 土台のハーネス
- [barkain/claude-code-workflow-orchestration](https://github.com/barkain/claude-code-workflow-orchestration) — wave scheduling
- [open-multi-agent/open-multi-agent](https://github.com/open-multi-agent/open-multi-agent) — runtime DAG思想
- [hilyfux/knowledge-graph](https://github.com/hilyfux/knowledge-graph) — git-native memory
- [LangGraph](https://www.langchain.com/langgraph) — typed state graph

---

*建立: 2026-08-28 — 天命により。*
