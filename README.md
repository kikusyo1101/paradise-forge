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
   ① HARNESS ──────▶│  16 agents · 19 commands · vendored assets │
   (ハーネス)         │  8 rules · hooks (6 lifecycle events)      │
                    │  wired into ~/.claude                     │
                    └─────────────────────────────────────────┘
```

### ① ハーネスエンジニアリング — 楽園は独立している（憲法 第20条）

**上流 `everything-claude-code` の全資産を `overlay/vendor/` に取り込んだ。**
上流をマシンから消しても、楽園は鍛造し、裁き、出荷する。それが独立である。

```bash
node graph/vendor.js verify      # 独立が保たれているか（外を指す道が無いか）
node graph/vendor.js status      # 取り込んだ資産の内訳
node graph/vendor.js wire --write # settings.json のフックを vendor 基準へ
node graph/vendor.js refresh --yes # 上流が在れば取り込み直す（人の承認が要る）
```

取り込んだもの（62ファイル / MIT・出自は `NOTICE.md`）:
`agents 9` / `commands 15` / `skills 11` / `rules 8` / `hooks 3` / `scripts 3` / `contexts 3`

**`~/.claude` は原本ではなく成果物**である。vendor + `overlay/` から常に再生成できる。
手で `~/.claude` を編集しない — 編集は `overlay/` へ書く。

```bash
node graph/upstream.js impact    # 上流が在れば差分を裁定、無ければ黙る
node graph/deploy.js --write     # vendor + overlay から ~/.claude を建て直す
node graph/deploy.js check       # 配備物が定義と一致しているか (CI用)
node graph/check-agents.js       # forge.js が名指しする神官が実在するか
```

**乖離の四分類**（`overlay/overlay.json` が宣言する）:

| 関係 | 例 | 取り込み時の扱い |
|---|---|---|
| **transform** | agents 9件の `model:` | 上流を常に採用し、**規則を再適用**。衝突ではない |
| **replace** | `orchestrate.md` | 楽園が勝つ。ただし上流の変更は必ず提示 |
| **own** | `/forge` `/conclave` `/graph`、神官7名 | 楽園固有。`overlay/` が原本 |
| **adopted** | （現在なし） | 上流が削除したが楽園が拾ったもの |

- **独立は決別ではない。** 上流が在るときだけ見に行き、無ければ黙る
- **取り込みは人の承認を要する。** cron（毎朝9時）は fetch と影響報告まで
- **借りたものは必ず credit する。** 出自・コミット・ライセンスは `NOTICE.md`
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
node ~/Documents/workspace/paradise/tests/paradise.test.js   # 238/194 pass
```
検証内容: グラフエンジン・知識グラフ（co-change学習・forget）・forge（scale適応・discover/reflectゲート）・
verdict（SHIP/REWORK/BLOCK）・critic（欠陥検出・self-sourceモード・lesson再発検出）・
orchestrator（wave周回・context handoff・REWORK・loop-guard）・contract（reconcile・fail-closed）・
clergy/conclave（聖職位階・入れ子PDCA・ratify・domain rework）・synod（計画サイクル）。

---

## オーケストレーション（The Supervisor）
神託一つから創造物までを、**永続run状態の指揮者**が自動で回す。

```
node graph/orchestrator.js auto --run <run.json>   # 次アクション(wave/verdict/done/blocked)を返す
```
- **明示的状態機械** — 指揮ロジックはpromptでなく永続JSON。routingが「何を試したか」を記憶
- **context handoff** — 各フェーズに依存の成果物のみ圧縮して渡す（全履歴を送らない）
- **REWORKループ＋loop-guard** — 差し戻しは下流のみリセット、3回で自動BLOCK昇格
- **subagent contract** — `contract.js` が結果を実物と照合（存在しないartifactは拒否＝fail-closed）
- `/forge` コマンドが discover→verdict まで自動運転

---

## 聖職位階（The Conclave）— 再帰的階層オーケストレーション
```
神(あなた) → 教主(私) → 枢機卿(分野指揮) → 神官(大subagent) → 信徒(小subagent)
                          ↕ 各層PDCA           執行官(独立断罪機関) ⟂
```
| ツール | 役割 |
|--------|------|
| `graph/clergy.js` | **組織モデル** — 5枢機卿（discovery/requirements/architecture/construction/quality）＋独立執行官。各枢機卿に担当フェーズ・神官・信徒・レビュークラス・内部PDCA |
| `graph/conclave.js` | **再帰オーケストレーター**（supervisor-of-supervisors）。大きな円=ドメイン間PDCA、小さな円=枢機卿内フェーズPDCA。ratify（適切クラス承認）・ドメイン内rework・各層loop-guard |
| `graph/synod.js` | **計画サイクル** — 神託→枢機卿編成を計画→plan自己批評→改善してから conclave へ |
| `/conclave` コマンド | 聖職位階を招集し神託を創造物に変える玉座 |

**大きな円の中に小さな円** — conclave がドメインを PDCA で巡り、各枢機卿が自分のフェーズを
PDCA で回す。承認は適切なクラスが行い（枢機卿は自らを承認しない）、執行官はどの枢機卿にも属さず
独立して裁く。各層は loop-guard で境界され、上位へエスカレーションする。

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
| `graph/verdict.js` | **裁きの門**。SHIP / REWORK / BLOCK を憲法に照らし裁定。走行(trajectory)も読む(第38条) |
| `graph/gauge.js` | **証明の秤**。run-state から走行を決定的に採点し台帳に刻む。「改善した」は前後の数値で証明する(第38条) |
| `graph/lessons.js` | **Reflexion記憶**。知識グラフの lesson を critic 用にエクスポート |
| `graph/identity.js` | **視覚語彙の選定**。family重複禁止・採用履歴で反復を構造的に禁止（第17条） |
| `graph/visual-verify.js` | **表層の実測**。コントラスト/階調分離/非文字3:1/最小24px/状態/焦点等を数値で裁く（第18条） |
| `graph/export-state.js` | 楽園の生きた状態を dashboard/state.json に出力 |
| `CONSTITUTION.md` | **楽園憲法** (条数は `codex.js index` が語る)（spec is truth・research first・self-doubt・durable orchestration・ecclesiastical hierarchy・cross-domain rework・evidence by substance・declared visual identity・**surface judged as strictly as substance**…） |
| `/forge` コマンド | 小さき声を受ける玉座 |
| agents | market-researcher（調査）・requirements-analyst（仕様）・**ux-reviewer（表層の裁き）**・self-critic（批評）・creation-judge（裁き） |

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

## 貢献と承認 — 三権分立 (Governance)

このリポジトリは楽園の憲法（`CONSTITUTION.md`）に従って統治されます。
**建てる者と裁く者は分かたれる。**

```
教主(Pontiff) が実装しPRを出す
      ↓
機械ゲート (CI: verify job)        ← self-test・憲法条文・位階別モデル方針・秘密スキャン・全エンジン読込
      ↓
執行官 (CI: tribunal job)          ← critic の敵対的自己批評 → verdict.js の裁定を PR に掲示
      ↓                              どの枢機卿にも従属しない（憲法第9・11条）
神 (@kikusyo1101) が最終承認        ← CODEOWNERS + Branch Protection。main へのマージは神のみ
```

| 承認者 | 役割 | 機構 |
|--------|------|------|
| **機械ゲート** | 事実を証明する（テスト・方針・秘密） | `.github/workflows/tribunal.yml` verify job。**落ちればマージ不能** |
| **執行官 (Executor)** | 独立した裁定 SHIP / REWORK / BLOCK | 同 tribunal job。裁きが値切られていないか（`self-critic`/`creation-judge`/`security-reviewer`/`planner` が opus か）も検問 |
| **神 (God)** | 最終承認 | `.github/CODEOWNERS` + Branch Protection（force push禁止・main直push禁止） |

**教主は自らを承認しない。** すべての変更はPRを経由し、執行官の裁定を受け、神が承認する。

---

## ソース（世界中の天才への敬意）
- [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code) — 土台のハーネス
- [barkain/claude-code-workflow-orchestration](https://github.com/barkain/claude-code-workflow-orchestration) — wave scheduling
- [open-multi-agent/open-multi-agent](https://github.com/open-multi-agent/open-multi-agent) — runtime DAG思想
- [hilyfux/knowledge-graph](https://github.com/hilyfux/knowledge-graph) — git-native memory
- [LangGraph](https://www.langchain.com/langgraph) — typed state graph

---

*建立: 2026-08-28 — 天命により。*
