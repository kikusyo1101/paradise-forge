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
   ② LOOP   ───────▶│  critic → verdict → lesson (Reflexion)    │
   (ループ)          │  gauge (前後の数値) · census (数の真実)    │
                    │  SessionStart hook が前回の状態を注ぐ      │
                    └─────────────────────────────────────────┘
                                     ▲
                    ┌─────────────────────────────────────────┐
   ① HARNESS ──────▶│  vendor + overlay → deploy.js が建てる    │
   (ハーネス)         │  agents · commands · rules · hooks       │
                    │  住処は <repo>/.claude (第58条)           │
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

上流 `everything-claude-code` の資産（各 kind 直下の項目数 — `census.js` が数え直す。全ファイル数は `vendor.js status`）:
`agents 9` / `commands 15` / `skills 11` / `rules 8` / `hooks 3` / `scripts 3` / `contexts 3`

**描画器 `archify` v2.16.0**（`overlay/vendor/archify`、tt-a1i、MIT）:
`graph/atlas.js` が JSON IR を渡す先。上流へ電話をかけないよう更新チェッカーを
削いである（第20条: vendored 資産は供給線であってはならない）。

**配備先は `<repo>/.claude` であり、原本ではなく成果物**である（第58条: 住処を知る器は
`graph/abode.js` 一つ）。vendor + `overlay/` から常に再生成できる。
手で `.claude/` を編集しない — 編集は `overlay/` へ書く。神の住処 `~/.claude` へ出すのは
`graph/abode.json` に神が名指した物だけ（現在は `settings.json` の permissions のみ）。

```bash
node graph/abode.js resolve      # 住処の解決 (mode=repo が既定)
node graph/upstream.js impact    # 上流が在れば差分を裁定、無ければ黙る
node graph/deploy.js --write     # vendor + overlay から <repo>/.claude を建て直す
node graph/deploy.js check       # 配備物が定義と一致しているか (CI用)
node graph/check-agents.js       # forge.js が名指しする神官が実在するか
```

**乖離の五分類**（`overlay/overlay.json` が宣言する）:

| 関係 | 例 | 取り込み時の扱い |
|---|---|---|
| **transform** | agents の `model:` / `tools:` | 上流を常に採用し、**規則を再適用**（apply-models + apply-spawn）。衝突ではない |
| **replace** | `orchestrate.md`、rules 3 本 | 楽園が勝つ。ただし上流の変更は必ず提示 |
| **own** | `/forge` `/conclave` `/graph` `/ship`、神官（overlay/agents） | 楽園固有。`overlay/` が原本 |
| **adopted** | （現在なし） | 上流が削除したが楽園が拾ったもの |
| **drop** | 起動 0 の agents / commands / rules | vendor に素材として残すが**配備しない**。根拠は実測で `overlay.json` に書く |

- **独立は決別ではない。** 上流が在るときだけ見に行き、無ければ黙る
- **取り込みは人の承認を要する。** `vendor.js refresh --yes` は人が撃つ（自動の cron は無い）
- **借りたものは必ず credit する。** 出自・コミット・ライセンスは `NOTICE.md`
- **何が配備されているかは `node graph/deploy.js plan` が語る** — 数を散文に写経しない（第22条）。
  vendor の command 15 本のうち楽園で起動が観測されたものは無く、大半は `drop` である（`reform/harness-diet/findings.md`）
- **hooks は SessionStart と PreToolUse だけ**（`<repo>/.claude/settings.json`）: 前者が前回の状態（branch・未コミット・開いた走行帳）を注ぎ、
  後者が main 上の commit を拒む。上流の hook はこの機で実効 0 と実測され退役した（`apply-guards.js FORBIDDEN_HOOKS`）

### ② ループエンジニアリング — 自己改善の閉ループ
- **critic → verdict → lesson**: reflect 相の敵対的自己批評（第9条）が verdict の前に走り、見逃した欠陥は `kg.js remember lesson` で永久記録され、以後の全創造で `critic.js` が自動チェックする（Reflexion）
- **gauge**: 走行を決定的に採点し台帳に刻む。「改善した」は前後の数値で証明する（第38条）
- **census**: 楽園が己について語る数を数え直す（第22条）— 散文が腐る前に CI が鳴る
- **SessionStart hook**: 前回の状態（branch・未コミット・開いた走行帳・KG snapshot）を注ぐ。役割と掟は `CLAUDE.md` が担い、hook は写経しない（第39条）

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
node ~/Documents/workspace/paradise/tests/paradise.test.js   # 門 504 本
```
> 語るのは**門の総数**であって「通った数」ではない。第3段以降、門は住処や兄弟倉の
> 不在を**名乗って**飛ばす(第58条(e))ので、`passed` は測る機械の資産で変わる ——
> **かつて実測された一つの版**では、神の機械が `469 passed, 0 failed`、CI の裸の機械が
> `459 passed, 0 failed, 10 skipped` を名乗った —— **同じ版に対して二つの数が出た。**
> **どちらも嘘ではない。** ゆえに `passed` は版の性質ではなく、ここには書かない。
> 機械が変わっても動かない数 —— 門の総数 —— だけを散文に書き、それは census が数え直す(第22条)。
検証内容: グラフエンジン・知識グラフ（co-change学習・forget）・forge（scale適応・discover/reflectゲート）・
verdict（SHIP/REWORK/BLOCK）・critic（欠陥検出・self-sourceモード・lesson再発検出）・
orchestrator（wave周回・context handoff・REWORK・loop-guard）・contract（reconcile・fail-closed）・
clergy/conclave（聖職位階・入れ子PDCA・ratify・domain rework・中断からの再開）・synod（計画サイクル）・
domains/ordain（分野の適合・役者の鍛造）・spawn-trace（起動の証跡と**序列の門**・第52条）・
gauge（走行の採点と**台帳の冪等性**・指紋/畳み/監査・故障注入で門が鳴ることまで・
**実台帳の番兵**(全走の各仮倉で実台帳の指紋を照合し、汚した門を名指す)・**競合下の治癒**(二プロセスで同時に刻ませ、畳みが読み手を守ることを凍結)・
**engine の可変大域をソースで読む静的の門**・第38条・第55条・**第62条**）。

### 門を絞る（開発中の一本を撃つとき）
```bash
node tests/paradise.test.js --gate '<正規表現>'      # 当たった門だけ走らせる
node tests/paradise.test.js --gate-not '<正規表現>'  # 当たった門を除く（**除外が勝つ**）
node tests/paradise.test.js --gate-list             # 名を並べるだけ（fn を呼ばない・0.08秒）
```
同じフラグを重ねれば **OR**。`--gate` と `--gate-not` が同じ門に当たれば除外が勝つ。
**環境変数は一つも無い** — census が絞り込み後の数を README に持ち込まないため（第22条）。
撃つ名は `--gate-list` で見てから組む。

**最も実用的な一行**（重い Atlas 2 本だけを除く。6 分が 20 秒台になる）:
```bash
node tests/paradise.test.js \
  --gate-not 'atlas: 全ての道が図になる' --gate-not 'atlas: 門は己の残骸で落ちない'
```

**exit**: `0` 緑 / `1` 赤 / **`2` 測れなかった**。
**マッチ 0 件は 2 である** — 業界の既定（何も走らなければ 0）と袂を分かつ。
打ち間違えた正規表現が「緑」を名乗るくらいなら、測れなかったと叫ぶ方がよい。
不正な正規表現・未知のフラグ・値の欠落も 2。

**限界（隠さない）**: 絞り込み走行は**門の依存を保証しない**。共有状態を前段の門に
頼る門は、単独で撃つと全走では緑なのに赤くなる（実装が走行のたびに警告を名乗る）。
偽の赤を見たら前段の門を `--gate` に足して撃ち直せ。
**「緑」の根拠になるのは引数無しの全走だけである。CI に絞り込みを持ち込むな。**

### 畳み — 同じ入力の走行を二度撃たない（`graph/fold.js`）

**門は一本も減っていない。** 畳みは門を間引く機構ではなく、**同一入力に対する重複した走行**を
一度に畳む機構である。CI の一回の中で、同じ自己診断が段をまたいで繰り返し撃たれ、
同じ成果物が繰り返し検められていた —— どれも入力が一字も違わないのに、である。
**同じ答えを二度買うのは、測定ではなく出費である。**

```bash
node graph/fold.js fold-key [--explain]   # いま撃とうとしている走行の鍵
node graph/fold.js fold-status [--json]   # 畳めるか・なぜ畳めないか
```

**名乗りの読み方**（畳んだことを機械が名乗らない畳みは、測定の放棄である）:

```
Paradise self-test: Executed 0 out of 1 runs (1 reused, key=…)   ← 畳んだ
Census self-test:   Executed 1 out of 1 runs (0 reused, bail=…)  ← 畳まなかった
```

- `Executed E out of N` — 実際に撃った数と、撃つはずだった数。**`E + R = N` は常に閉じる**。
- `key=…` — 入力の内容ハッシュ。**同じ鍵なら同じ入力**であり、違えば畳まない。
- `bail=…` — 畳まなかった**理由**。語彙は閉じている（`no-receipt` / `key-miss` /
  `not-green` / `truncated` / `undeclared-state` / `disabled` / `ledger-unreadable`）。
  語彙を開けば `bail=whatever` が生まれ、機械は「畳まなかった」と
  **「畳む機構が壊れていた」を区別できなくなる**。とりわけ `ledger-unreadable` は
  `no-receipt` と**別の語**である —— **読めないは skip ではなく赤**（第62条・第37条）。

**出口は常に開いている。** 畳みを疑ったら切って撃ち直せ。切った走行は `bail=disabled` を名乗る。

```bash
node tests/paradise.test.js --no-fold     # この走行だけ畳まない
PARADISE_NO_FOLD=1 <任意の命令>            # 環境ごと畳まない
```

**台帳は 1 回の CI 走行の中でのみ有効である。** 走行をまたいで領収書を持ち越せば、
今日の門が**昨日の緑**を名乗る —— それは第37条（不在は通過ではない）の裏口になる。
ゆえに畳みは「速くなった」と主張するためではなく、**同じ測定を重ねて買わない**ためだけに在る。
畳みが何をしたかは、走行の名乗りとして毎回 stdout に出る。出ないなら、それは畳みではない。

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
神(あなた) → 教主(私) → 枢機卿(分野指揮) → 神官(subagent)
                          ↕ 各層PDCA           執行官(独立断罪機関) ⟂
```
> 信徒(小 subagent)の層は位階としては残るが、実体は **2026-09 のハーネス審査で退役**した —
> 追跡 7 走行 / 108 起動に信徒の起動は 0 件。名前だけの階層を置かない（第25条）。

| ツール | 役割 |
|--------|------|
| `graph/clergy.js` | **組織モデル** — 7枢機卿（discovery/requirements/architecture/construction/quality/counsel/cartography）＋独立執行官。各枢機卿に担当フェーズ・神官・レビュークラス・内部PDCA。`lexicon-check` が散文の異名を裁く(第41条) |
| `graph/conclave.js` | **再帰オーケストレーター**（supervisor-of-supervisors）。大きな円=ドメイン間PDCA、小さな円=枢機卿内フェーズPDCA。ratify（適切クラス承認）・ドメイン内rework・各層loop-guard。`audit` が全走行帳を横断して**見捨てられた環**を名指しする(第53条) |
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
| `graph/gauge.js` | **証明の秤**。run-state から走行を決定的に採点し台帳に刻む。「改善した」は前後の数値で証明する(第38条)。**台帳は冪等** — 行は材料(`slug`+`scale`+`metrics`)から導かれる指紋を持ち、同じ観測は二度刻まれない。予防(`record` が追記前に検める)と治癒(`readLedger` が読み時に畳む)の二重。`ledger --audit` が重複・偽の指紋・深すぎて読めない行を名指す — **exit 0 健全 / 1 掃除で消える重複 / 2 人が読むまで消えない事故(偽の指紋・読めない行) / 3 命令の誤り**。**掃除で消える欠陥しか残っていない台帳には `🧹` の一行が出て、`--audit --json` が `healable` を名乗る — exit code は一切動かさない**(第57条: 信号の分離は文面と欄で行う)。生の全行は `readLedger({raw:true})` だけが返す(CLI の `--raw` は無い)(第55条・第62条) |
| `graph/lessons.js` | **Reflexion記憶**。知識グラフの lesson を critic 用にエクスポート |
| `graph/identity.js` | **視覚語彙の選定**。family重複禁止・採用履歴で反復を構造的に禁止（第17条） |
| `graph/visual-verify.js` | **表層の実測**。コントラスト/階調分離/非文字3:1/最小24px/状態/焦点等を数値で裁く（第18条） |
| `graph/atlas.js` | **楽園の自画像**。位階・道・環・結線を JSON IR に写し、取り込んだ `archify` に描かせる。6主題 (hierarchy/conclave/dispatch/dag/run/wiring)。交差ゼロが不能なら測って standard を名乗る(第47条) |
| `graph/wiring.js` | **機構の結線**。engine が engine を require する内の辺と、門・命令・神官・掟・試験・器物・散文・機構が名を呼ぶ外の辺を実測する。孤児(呼ぶ者の居ない engine)と宙吊り(存在しない engine への参照)を裁く(第44条・第48条) |
| `graph/hermetic.js` | **門の密閉性**。`tests/*.js` を走査し、`ROOT`/`DIR`/`__dirname` 起点の**版管理下**ファイルへの `writeFileSync`/`appendFileSync`/`rmSync`/`unlinkSync` を**行番号で名指す**。除外は「複製(mkdtemp/cpSync 配下)に書いていること」だけ —— **`finally` の復元は除外ではない。復元しても窓は開く**。この門は自分自身にも掛かり、除外の名簿は空である(第58条(c)・第54条(d)) |
| `graph/abode.js` | **楽園自身の住処を知る唯一の器**。`os.homedir()` も `~/.claude` も `CLAUDE_CONFIG_DIR` も、この engine の外に現れてはならない — 門がソースを走査し**行を名指す**。加えて**輸出の関門**: グローバルへ書く engine は `globalWrite()` を通り、宛先は `graph/abode.json`(神が名指した台帳)に載っていなければ通らない。呼び手は名乗りではなく stack から**実測**する。**engine は台帳へ書く口を持たない**(第58条・第54条(d)) |
| `graph/pulse.js` | **楽園の断面 (snapshot)**。数・門の合否・走行・台帳・記憶を 1 個の JSON に写す唯一の engine。画面はここしか見ない — 突合点が 1 つだから門が 1 式で書ける(第22条・第16条) |
| `graph/fold.js` | **同じ入力の走行を二度撃たないための機構**。答える問いは一つ —「いま撃とうとしている走行は、既に撃たれたか」。答えは**鍵**(入力の内容ハッシュ)と**領収書**(台帳の1行)だけで出す。**鍵の住処は一つである** — 二つ在れば鍵が二通りに割れる(第48条・第58条)。二つの機構が同居するが**混ぜない**: 台帳の畳み(CI の段をまたぐ)と、プロセス内の写像(Atlas が同じ成果物を二度検めない。**台帳を一切使わない**)。**畳んだことは必ず名乗る** — `Executed E out of N (R reused, key=…)`、畳まなかった走行は `bail=…` を**閉じた語彙**で名指す(`ledger-unreadable` は `no-receipt` と**別の語**である。読めないは skip ではなく赤 / 第62条)。住所は自分で組まず `abode.pathFor` を通る(第58条(a))。`fold-key` / `fold-status` が名乗り、**台帳は 1 回の CI 走行の中でのみ有効**(第37条) |
| `graph/export-state.js` | 楽園の生きた状態を dashboard/state.json に出力 |
| `graph/workspace.js` | **創造物の住所を決める唯一の場所**（第30条）。`PARADISE_CREATIONS` → 兄弟倉 `../paradise-creations` の一本道。`check` が楽園に紛れた創造物と、兄弟倉に迷い込んだ reform 走行帳（`strayRuns`）を名指す |
| `graph/branch-guard.js` | **古い main の上で働いていないか**（第24条）。`ON_MAIN` / 未 fetch / origin より古い main を門として裁く。`tools/hooks/paradise-commit-guard.js` が PreToolUse でこれを機構にする |
| `graph/apply-guards.js` | **掟を機構に落とす**（第3・6・19条）。`settings.json` の permissions（deny/ask/allow）と hooks を建てる唯一の writer（`abode.json` EX-1）。実効 0 の hook は `FORBIDDEN_HOOKS` が除く。神の住処へ書くときは教主の座（model/effortLevel）を引く。`verify` が証拠 — 数は写経しない |
| `graph/apply-models.js` / `apply-spawn.js` | **位階の規則を agent frontmatter に機械適用**。`model:`/`effort:`（第12条）と起動の権能 `Task`（第25条）。`deploy.js` が配備後に必ず再適用する transform |
| `graph/apply-seat.js` | **教主の座を機構にする**（第31条）。`<repo>/.claude/settings.json` の `model` / `effortLevel` を clergy の宣言どおりに書く |
| `graph/derived.js` | **生成物と原本を区別する**（第29条）。`lessons.json` のような derived file の中身を前提にした検査が無いかを CI で裁く |
| `graph/daily-guard.js` | **日次ノルマの番人**。22:00 JST の自律改善を機械が起きていなくても取りこぼさない claim 機構。呼び手の cron 2 本は現在**神の意志で停止中**（2026-09-02〜） |
| `graph/build-identity-catalog.js` | `identity.js` が読む視覚語彙カタログ（`graph/identity/catalog.json`）を一度だけ鍛造する。実行時に外へ取りに行かない（依存ゼロ） |
| `graph/motion-probe.mjs` | **動きが実際に宿っているかを実ブラウザで測る**（第50条）。`animatedEls` / `beatAdvanced` を数で持ち帰る — 「押せる」は「動く」ではない |
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
      ↓                              census・fold・hermetic・derived・wiring・atlas・abode・
      ↓                              序列の監査・分野の適合・ダッシュボードの門 … 全て同 job（第52条）
執行官 (CI: tribunal job)          ← critic の敵対的自己批評 → verdict.js の裁定を PR に掲示
      ↓                              どの枢機卿にも従属しない（憲法第9・11条）。**PR のときだけ走る**
発報 (CI: herald job)              ← 裁定(緑/赤)を Discord へ運ぶ。緑かつ PR でなければ黙る
      ↓
神 (@kikusyo1101) が最終承認        ← CODEOWNERS + Branch Protection。main へのマージは神のみ
```

| 承認者 | 役割 | 機構 |
|--------|------|------|
| **機械ゲート** | 事実を証明する（テスト・方針・秘密） | `.github/workflows/tribunal.yml` verify job。**落ちればマージ不能** |
| **執行官 (Executor)** | 独立した裁定 SHIP / REWORK / BLOCK | 同 tribunal job。裁きが値切られていないか（`self-critic`/`creation-judge`/`security-reviewer`/`planner`/`ux-reviewer` が opus 級以上か）も検問 |
| **神 (God)** | 最終承認 | `.github/CODEOWNERS` + Branch Protection（force push禁止・main直push禁止） |

**教主は自らを承認しない。** すべての変更はPRを経由し、執行官の裁定を受け、神が承認する。

> **CI の前後比較は job 同士で。** `push` 走行は tribunal job を飛ばし、`pull_request` 走行は飛ばさない。
> 全体の所要を比べれば「遅くなった」と読み違える — verify job は verify job と比べよ。

---

## ソース（世界中の天才への敬意）
- [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code) — 土台のハーネス（元 URL は現在 `affaan-m/ECC` へ転送される。楽園が取り込んだのは `WorldFlowAI/everything-claude-code` の版 — commit と出自は `NOTICE.md`）
- [tt-a1i/archify](https://github.com/tt-a1i/archify) — 楽園の自画像を描く描画器（第47条）
- [barkain/claude-code-workflow-orchestration](https://github.com/barkain/claude-code-workflow-orchestration) — wave scheduling
- [open-multi-agent/open-multi-agent](https://github.com/open-multi-agent/open-multi-agent) — runtime DAG思想
- [hilyfux/knowledge-graph](https://github.com/hilyfux/knowledge-graph) — git-native memory
- [LangGraph](https://www.langchain.com/langgraph) — typed state graph

---

*建立: 2026-08-28 — 天命により。*
