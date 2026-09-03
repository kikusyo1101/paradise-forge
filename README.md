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

取り込んだもの（130ファイル / MIT・出自は `NOTICE.md`）は二つの出自を持つ。

上流 `everything-claude-code` の資産:
`agents 9` / `commands 15` / `skills 11` / `rules 8` / `hooks 3` / `scripts 3` / `contexts 3`

**描画器 `archify` v2.16.0**（`overlay/vendor/archify`、tt-a1i、MIT）:
`graph/atlas.js` が JSON IR を渡す先。上流へ電話をかけないよう更新チェッカーを
削いである（第20条: vendored 資産は供給線であってはならない）。

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
node ~/Documents/workspace/paradise/tests/paradise.test.js   # 318/318 pass
```
検証内容: グラフエンジン・知識グラフ（co-change学習・forget）・forge（scale適応・discover/reflectゲート）・
verdict（SHIP/REWORK/BLOCK）・critic（欠陥検出・self-sourceモード・lesson再発検出）・
orchestrator（wave周回・context handoff・REWORK・loop-guard）・contract（reconcile・fail-closed）・
clergy/conclave（聖職位階・入れ子PDCA・ratify・domain rework・中断からの再開）・synod（計画サイクル）・
domains/ordain（分野の適合・役者の鍛造）・spawn-trace（起動の証跡と**序列の門**・第52条）。

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
| `graph/forge.js` | 小さき声を **scale適応SDLC DAG** に昇華。discover/reflect/verdict をゲート化。道は6本 (quick/standard/full/reform/counsel/**cartography**) — 産物の種別が道を決める(第49条)。`admit()` が分野の適合を裁き、担い手の居ない願いを既定の道へ黙って落とさない(第52条) |
| `graph/domains.js` | **役者は何を担えるか**。`domains.json` の台帳を読み、願いを分野へ写し、道が名指しする役者が分野を宣言しているか裁く。`check-agents`(実在)とは**別の問い**である — 実在するだけでは足りない(第52条) |
| `graph/ordain.js` | **役者の鍛造器**。`forge --write` が overlay の原本(agent 定義・overlay.json・COLLEGE・分野台帳)を1コマンドで揃える。**配備はしない** — 原本を書く器と実機に書く器は別である(第29条)。手編集0ファイル / 鍛造→`deploy --write`→`verify` の3工程 |
| `graph/spawn-trace.js` | **起動の証跡と序列の門**。誰が起動されたかを三値(observed/asserted-only/no-trace)で観測し、教主の権能の三段(委譲/編成/教主の手)を実測と突合して裁く。**閾値も判定表もここ一箇所に住む** — `tiers` が数を語り、`tier` が事後に突合し、`audit` が全走行を監査する(第27条・第52条) |
| `graph/critic.js` | **敵対的自己批評**。決定的チェックリスト＋過去の教訓で欠陥を自力発見（exit 0/1） |
| `graph/verdict.js` | **裁きの門**。SHIP / REWORK / BLOCK を憲法に照らし裁定。走行(trajectory)も読む(第38条) |
| `graph/gauge.js` | **証明の秤**。run-state から走行を決定的に採点し台帳に刻む。「改善した」は前後の数値で証明する(第38条) |
| `graph/lessons.js` | **Reflexion記憶**。知識グラフの lesson を critic 用にエクスポート |
| `graph/identity.js` | **視覚語彙の選定**。family重複禁止・採用履歴で反復を構造的に禁止（第17条） |
| `graph/visual-verify.js` | **表層の実測**。コントラスト/階調分離/非文字3:1/最小24px/状態/焦点等を数値で裁く（第18条） |
| `graph/atlas.js` | **楽園の自画像**。位階・道・環・結線を JSON IR に写し、取り込んだ `archify` に描かせる。6主題 (hierarchy/conclave/dispatch/dag/run/wiring)。交差ゼロが不能なら測って standard を名乗る(第47条) |
| `graph/wiring.js` | **機構の結線**。engine が engine を require する内の辺と、門・命令・神官・掟・試験・器物・散文・機構が名を呼ぶ外の辺を実測する。孤児(呼ぶ者の居ない engine)と宙吊り(存在しない engine への参照)を裁く(第44条・第48条) |
| `graph/pulse.js` | **楽園の断面 (snapshot)**。数・門の合否・走行・台帳・記憶を 1 個の JSON に写す唯一の engine。画面はここしか見ない — 突合点が 1 つだから門が 1 式で書ける(第22条・第16条) |
| `graph/export-state.js` | 楽園の生きた状態を dashboard/state.json に出力 |
| `CONSTITUTION.md` | **楽園憲法** (条数は `codex.js index` が語る)（spec is truth・research first・self-doubt・durable orchestration・ecclesiastical hierarchy・cross-domain rework・evidence by substance・declared visual identity・**surface judged as strictly as substance**…） |
| `/forge` コマンド | 小さき声を受ける玉座 |
| agents | market-researcher（調査）・requirements-analyst（仕様）・**ux-reviewer（表層の裁き）**・self-critic（批評）・creation-judge（裁き） |

**自己改善ループ（Self-Refine + Reflexion）:** reflect フェーズが verdict の前に
創造物を敵対的監査し、欠陥があれば REWORK。見逃した欠陥は lesson として知識グラフに
永久記録され、以後の全創造で自動チェックされる — **楽園は同じ欠陥をユーザーに二度指摘させない。**

**可視化:** 楽園の生きた姿は `dashboard/` が見せる — 下の「[ダッシュボード](#ダッシュボード--楽園の門)」を見よ。

---

## ダッシュボード — 楽園の門

楽園が今どうなっているかを、**engine の実測だけで**見せる画面。散文でも記憶でもなく、
`graph/pulse.js` が作る **断面 (snapshot)** が唯一の出所である。

### 起動

```bash
node graph/pulse.js serve            # 既定 127.0.0.1:7317 (--port n で変えられる)
```

→ `pulse listening port=7317` と名乗ったら `http://127.0.0.1:7317/` を開く。
ポートが埋まっていれば **落ちずに別ポートを取る**（二重起動しても両方生きる）。
待ち受けは `127.0.0.1` のみ — 外へは開かない。

常駐させずに断面だけ見たいときは:

```bash
node graph/pulse.js snapshot --json                              # 断面を 1 個 stdout へ
node graph/pulse.js freshness --age-ms 5000 --transport sse      # → live
node graph/pulse.js freshness --age-ms 30000 --transport poll    # → lagging
node graph/pulse.js freshness --age-ms 90000 --transport sse     # → frozen
```

### 何が見えるか

| 画面 | 入口 | 見えるもの |
|---|---|---|
| **楽園の門** | `/`（`dashboard/index.html`） | 走行中の環・点数と起動実績・**門の合否**・数の看板・日次ノルマ・道の形・記憶・全画面への索引・経路の記録 |
| **深掘り** | `/control.html` | 門の内訳・出来事の全件・点数の台帳(全件)・記憶(教訓/KG)・**測れなかった鍵** |

サーバが開ける口は 3 つ:

| 口 | 返すもの |
|---|---|
| `GET /events` | SSE。接続直後に `event: snapshot` を 1 発、以後 `fs.watch` の変化で押し出す |
| `GET /snapshot.json` | 断面 1 個（no-store） |
| `GET /health` | `{ok,port,connections,rescans}` |

`dashboard/` の外を指す静的パスは 403、無いものは 404 で拒む。

**「測れなかった」は緑ではない**（第16条）。engine が答えなかった鍵は `null` のまま
断面に残り、画面は「何を待っているか」を名指しする。ゼロで埋めない。
`census` は断面に**含めない** — 自己診断を丸ごと回すため実測 2 分かかり、同期経路に置けば画面が固まる。

### 三層フォールバック

```
① EventSource (/events)  ──5秒無音 or onerror 2連続──▶  ② fetch ポーリング (/snapshot.json, 2秒間隔)
        ▲                                                          │
        └────────── 30秒ごとに①へ再挑戦 ──────────────┘   ③ file:// 直開き → 埋め込みJS の断面
```

境界の定数（`FIRST_EVENT_TIMEOUT_MS` `POLL_INTERVAL_MS` `FRESH_LIVE_MS` `FRESH_FROZEN_MS` …）は
`pulse.js` の `T` **1 箇所**にだけ住む。画面と engine が別々に数を持てば、同じ断面に対して
違う鮮度を言う — 嘘は齟齬から生まれる。

### どの門が守っているか

ダッシュボードの門 **13 本**（この数は `census.js` が `tests/` を数え直す — 第22条）。

```bash
node tests/dashboard-count.test.js        # 画面の数 == その場で数えた数（固定値を期待値にしない）
node tests/dashboard-no-hardcode.test.js  # ハードコード数値・架空DAGの再発を拒む
node tests/dashboard-no-deps.test.js      # 外部依存/子プロセスが再び生えない
node tests/dashboard-sse.test.js          # SSE の枠組み（終端 \n\n・retry・keepalive）
node tests/dashboard-transport.test.js    # 三層の構造と定数の単一管理
node tests/dashboard-fallback.test.js     # 実ブラウザでの降格・復帰
node tests/dashboard-freshness.test.js    # 鮮度の境界を全数（10000/10001・60000/60001）
node tests/dashboard-watch.test.js        # fs.watch のデバウンスと復帰
node tests/dashboard-states.test.js       # 5状態の設計（スピナー禁止・経過秒は嘘をつけない）
node tests/dashboard-run-panel.test.js    # 走行パネルと故障注入（ok:true を信じない）
node tests/dashboard-links.test.js        # 孤児ページが生まれない（導線が切れない）
node tests/dashboard-perf.test.js         # 同期経路の所要と子プロセス不在
node tests/motion-probe-leak.test.js      # 門が己の残骸で不定に鳴らない（第50条の裏面）
```

全門は `node tests/paradise.test.js` に載っている。個別に走らせるのは、赤の在り処を狭めるとき。

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
      ↓                              序列の監査・分野の適合も同 job（第52条）
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
