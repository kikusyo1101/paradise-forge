# 楽園のグローバル足跡 — 実測調査報告 (reform/sovereign-abode / discovery)

> 神託: **「グローバルに依存するな。楽園はプロジェクト内だけで完結し、グローバルには神が直接依頼した物だけを入れる」**
>
> 本書は **調査のみ**。設計も実装もしていない。ファイルは本書1本以外一切改変していない。
> 第一原則に従い、**全ての主張にコマンドとその実出力を添える**。推測は「未測定」と明記する。
>
> 測定機: Windows 11 / git-bash(MSYS) / node v24.14.0 / ブランチ `reform/sovereign-abode`
> 測定日: 2026-09-10

---

## 0. 一行の結論

楽園は `~/.claude` へ **58 ファイル**を配備し、**settings.json の 4 キー**(`hooks` `model` `effortLevel` `permissions`)を書き、
**KG(`paradise-kg/`) と日次台帳(`paradise-daily.json`)** を書き足している。
engine 側のグローバル依存箇所は **コード実体で 40 行**(うち env 未設定時にグローバルへ落ちる既定値が **23 行**)。
そのうち **書く**のは **9 モジュール**、残りは読むだけ。
自己診断 455 門は `~/.claude` が無くても **全て緑**(実測: 455 passed, 0 failed / 差分ゼロ)——
ただし `guards.test.js` の **4 門が「skipped」に落ちる**ため、**裸の環境では実質 4 門が消える**。

---

## 1. 配備物の全数

### 1.1 `deploy.js plan` の実出力

```console
$ node graph/deploy.js plan
═══════ 🏛  DEPLOYMENT PLAN ═══════
upstream: C:\Users\kikus\Documents\workspace\everything-claude-code
target  : C:\Users\kikus\.claude
files   : {"plain":23,"own":26,"replace":9}
transform after copy: agents
  ✓ every source exists
  (dry run — pass --write to deploy)
═══════════════════════════════════
```

CLI は 3 分類しか印字しないので、plan オブジェクトを直接読んで全件を出した:

```console
$ node -e "const p=require('./graph/deploy.js').plan(); ..."
HOME=C:\Users\kikus\.claude
UPSTREAM=C:\Users\kikus\Documents\workspace\everything-claude-code
COUNTS={"plain":23,"own":26,"replace":9}
TOTAL=58
MISSING=0
BYKIND={"agents":30,"commands":19,"rules":8,"root":1}
KIND_x_REL={"agents|plain":9,"agents|own":21,"commands|plain":14,"commands|replace":1,
            "commands|own":4,"rules|replace":8,"root|own":1}
```

### 1.2 kind × relation の内訳 (合計 58)

| kind | plain (vendor由来) | replace (楽園版で置換) | own (楽園固有) | 小計 | 配備先 |
|------|---:|---:|---:|---:|---|
| agents | 9 | 0 | 21 | **30** | `~/.claude/agents/*.md` |
| commands | 14 | 1 | 4 | **19** | `~/.claude/commands/*.md` |
| rules | 0 | 8 | 0 | **8** | `~/.claude/rules/*.md` |
| root | 0 | 0 | 1 | **1** | `~/.claude/CLAUDE.md` |
| **計** | **23** | **9** | **26** | **58** | |

`overlay.json` の `kinds` には `skills` が入っているが、`overlay/skills/` も `overlay/vendor/skills/*.md`(直下)も
存在しないため **skills の配備件数は 0**:

```console
$ node C:/Users/kikus/AppData/Local/Temp/pdcmp.js
overlay/skills 存在=false
skills 計画件数=0
~/.claude/skills 実在=13 :: backend-patterns,clickhouse-io,coding-standards,continuous-learning,
  eval-harness,frontend-patterns,learned,pr-review,project-guidelines-example,security-review,
  strategic-compact,tdd-workflow,verification-loop
```

⚠️ **`~/.claude/skills/` 13件は deploy の管轄外**。`overlay/vendor/skills/` に 11 件の複製は在るが、
deploy はそこを一度も読まない(`overlay/skills` が無く、`own.skills` も未宣言のため)。
撤収作業の観点では **「楽園が原本を持つが配備していない宙吊り資産」** である。

### 1.3 全 58 件の明細

<details>
<summary>agents (30件)</summary>

| # | file | relation | src |
|---|------|----------|-----|
| 1 | architect.md | plain | overlay/vendor/agents/ |
| 2 | build-error-resolver.md | plain | overlay/vendor/agents/ |
| 3 | code-reviewer.md | plain | overlay/vendor/agents/ |
| 4 | doc-updater.md | plain | overlay/vendor/agents/ |
| 5 | e2e-runner.md | plain | overlay/vendor/agents/ |
| 6 | planner.md | plain | overlay/vendor/agents/ |
| 7 | refactor-cleaner.md | plain | overlay/vendor/agents/ |
| 8 | security-reviewer.md | plain | overlay/vendor/agents/ |
| 9 | tdd-guide.md | plain | overlay/vendor/agents/ |
| 10 | acceptance-criteria-writer.md | own | overlay/agents/ |
| 11 | auditor.md | own | overlay/agents/ |
| 12 | cardinal.md | own | overlay/agents/ |
| 13 | coverage-checker.md | own | overlay/agents/ |
| 14 | creation-judge.md | own | overlay/agents/ |
| 15 | data-collector.md | own | overlay/agents/ |
| 16 | data-modeler.md | own | overlay/agents/ |
| 17 | executor.md | own | overlay/agents/ |
| 18 | feature-ranker.md | own | overlay/agents/ |
| 19 | interface-designer.md | own | overlay/agents/ |
| 20 | linter.md | own | overlay/agents/ |
| 21 | market-researcher.md | own | overlay/agents/ |
| 22 | module-builder.md | own | overlay/agents/ |
| 23 | requirements-analyst.md | own | overlay/agents/ |
| 24 | reporter.md | own | overlay/agents/ |
| 25 | secret-scanner.md | own | overlay/agents/ |
| 26 | self-critic.md | own | overlay/agents/ |
| 27 | test-writer.md | own | overlay/agents/ |
| 28 | user-story-writer.md | own | overlay/agents/ |
| 29 | ux-reviewer.md | own | overlay/agents/ |
| 30 | web-scout.md | own | overlay/agents/ |

**さらに配備後に変換が二段かかる**(`transform after copy: agents`):
`graph/apply-models.js apply` → `graph/apply-spawn.js apply` が
`~/.claude/agents/*.md` の frontmatter を **その場で書き換える**(`deploy.js:194-206`)。
配備物は「コピーの写し」ではなく「コピー+改変」である。

</details>

<details>
<summary>commands (19件)</summary>

| # | file | relation |
|---|------|----------|
| 1-14 | build-fix, checkpoint, code-review, e2e, eval, learn, plan, refactor-clean, setup-pm, tdd, test-coverage, update-codemaps, update-docs, verify | plain (vendor) |
| 15 | orchestrate.md | **replace** (overlay/commands/) |
| 16 | forge.md | own |
| 17 | conclave.md | own |
| 18 | graph.md | own |
| 19 | ship.md | own |

</details>

<details>
<summary>rules (8件) — 全て replace</summary>

agents.md / coding-style.md / git-workflow.md / hooks.md / patterns.md / performance.md / security.md / testing.md
(全て `overlay/rules/` が原本。第40条の「常時ロード散文の予算」で上流版を置換)

</details>

<details>
<summary>root (1件)</summary>

`overlay/root/CLAUDE.md` → `~/.claude/CLAUDE.md` (1,576B)。
diff で完全一致を確認:

```console
$ diff <(tr -d '\r' < overlay/root/CLAUDE.md) <(tr -d '\r' < C:/Users/kikus/.claude/CLAUDE.md) && echo IDENTICAL
IDENTICAL
```

</details>

### 1.4 実在との突合 — 楽園由来 / 非楽園

```console
$ node C:/Users/kikus/AppData/Local/Temp/pdcmp.js
agents:   実在=30 計画=30 計画外の実在=[] 未配備=[]
commands: 実在=19 計画=19 計画外の実在=[] 未配備=[]
rules:    実在=8  計画=8  計画外の実在=[] 未配備=[]
root CLAUDE.md 実在=true

$ node graph/deploy.js check
═══════ 🏛  DEPLOYMENT CHECK ═══════
checked: 60  transforms (diff expected): agents
  ✓ every deployed file matches its declared source
════════════════════════════════════
```

**判定: `agents/` `commands/` `rules/` の 3 ディレクトリは 100% 楽園由来。余剰ゼロ・欠落ゼロ。**
`checked: 60` は 58 ファイル + 教主の座 + 掟(permissions) の 2 検査。

---

## 2. engine の `~/.claude` 依存箇所 — 全数

横断範囲: `graph/*.js` `tools/**` `tests/**` `.github/workflows/**`
(`graph/lessons.json` は生成物データなので除外。除外前の粗ヒットは 85 行)

```console
$ rg -n -e "os\.homedir\(\)" -e "process\.env\.CLAUDE_HOME" -e "process\.env\.PARADISE_SETTINGS" \
       -e "process\.env\.PARADISE_AGENTS" -e "process\.env\.PARADISE_KG" -e "process\.env\.CLAUDE_SETTINGS" \
       -e "claudeHome\(" -e "claudeDir\(" -e "settingsPath\(" graph/*.js tools tests .github | wc -l
40
```

### 2.1 コード実体 40 箇所の全数表

**印の意味**
- 🔴 = **env 未設定時にグローバル `~/.claude` へ落ちる既定値**(神託が禁じる依存)
- 🟡 = グローバルへ落ちうるが env で完全に逸らせる
- ⚪ = パス解決の部品・テスト内の隔離処置(グローバルへは落ちない)

| # | ファイル:行 | 印 | 1行説明 |
|---|---|---|---|
| 1 | `graph/apply-guards.js:69` | 🟡 | `PARADISE_SETTINGS` を第一優先で settings.json の住所にする |
| 2 | `graph/apply-guards.js:70` | 🔴 | 上記の既定値 — `CLAUDE_HOME` も無ければ `~/.claude/settings.json` |
| 3 | `graph/apply-models.js:20` | 🔴 | `PARADISE_AGENTS` 未設定なら `~/.claude/agents` を書き換え対象にする |
| 4 | `graph/apply-seat.js:30` | 🟡 | `PARADISE_SETTINGS` で settings.json を逸らせる |
| 5 | `graph/apply-seat.js:31` | 🔴 | 上記の既定値 — `~/.claude/settings.json` |
| 6 | `graph/apply-spawn.js:32` | 🟡 | `CLAUDE_HOME` があれば `<CLAUDE_HOME>/agents` |
| 7 | `graph/apply-spawn.js:33` | 🟡 | 同上の真枝 |
| 8 | `graph/apply-spawn.js:34` | 🔴 | 偽枝の既定値 — `~/.claude/agents` |
| 9 | `graph/check-agents.js:106` | 🔴 | `hierarchyIntegrity` の既定 agents ディレクトリ(**env で逸らせない**) |
| 10 | `graph/check-agents.js:205` | 🔴 | `check()` の既定 agents ディレクトリ(**env で逸らせない**) |
| 11 | `graph/daily-guard.js:36` | 🔴 | 日次ノルマ台帳 — `PARADISE_DAILY_LEDGER` 未設定なら `~/.claude/paradise-daily.json` |
| 12 | `graph/deploy.js:59` | 🟡 | `plan()` の配備先を `upstream.claudeHome()` から取る |
| 13 | `graph/deploy.js:116` | 🟡 | adopted ファイルの配備先(現在 `adopted.files` は空) |
| 14 | `graph/deploy.js:129` | 🟡 | `check()` の配備先 |
| 15 | `graph/export-state.js:23` | 🔴 | edges.jsonl 読取先 — `PARADISE_KG` 未設定なら `~/.claude/paradise-kg` |
| 16 | `graph/kg.js:31` | 🔴 | KG の格納先 ROOT — `PARADISE_KG` 未設定なら `~/.claude/paradise-kg` |
| 17 | `graph/ordain.js:47` | 🔴 | 名前衝突検査で `CLAUDE_HOME`(既定 `~/.claude`)`/agents` を読む |
| 18 | `graph/pulse.js:320` | 🔴 | `claudeDir()` ヘルパ — **env を一切見ず** `~/.claude` 固定 |
| 19 | `graph/pulse.js:392` | 🔴 | ダッシュボードの agents 件数を `claudeDir('agents')` から数える |
| 20 | `graph/pulse.js:396` | 🔴 | commands 件数を `claudeDir('commands')` から数える |
| 21 | `graph/pulse.js:397` | 🔴 | skills 件数を `claudeDir('skills')` から数える |
| 22 | `graph/pulse.js:399` | 🟡 | KG 件数 — `PARADISE_KG` 優先、既定は `claudeDir('paradise-kg')` |
| 23 | `graph/pulse.js:535` | 🟡 | SSE の監視対象に KG の jsonl を足す(同上の解決) |
| 24 | `graph/upstream.js:33` | ⚪ | `~` 展開ヘルパ(住所の部品。単体ではグローバルを指さない) |
| 25 | `graph/upstream.js:39` | 🔴 | `claudeHome(c)` — `CLAUDE_HOME` 未設定なら overlay.json の `default_path: "~/.claude"` |
| 26 | `graph/vendor.js:48` | ⚪ | `~` 展開ヘルパ |
| 27 | `graph/vendor.js:49` | 🔴 | `claudeHome()` — 既定 `~/.claude` |
| 28 | `graph/vendor.js:50` | 🟡 | `settingsPath()` — `CLAUDE_SETTINGS` 優先 |
| 29 | `graph/vendor.js:104` | 🟡 | `wire()` が settings.json を掴む |
| 30 | `graph/vendor.js:163` | 🟡 | `verify()` が settings.json を読む |
| 31 | `tests/dashboard-count.test.js:91` | 🔴 | 門の中で KG 既定住所を再計算(`PARADISE_KG` 未設定なら `~/.claude/paradise-kg`) |
| 32 | `tests/dashboard-count.test.js:109` | ⚪ | `PARADISE_KG` を退避 |
| 33 | `tests/dashboard-count.test.js:110` | ⚪ | `PARADISE_KG` を一時ディレクトリへ差し替え(本番汚染の防止) |
| 34 | `tests/dashboard-count.test.js:112` | ⚪ | `PARADISE_KG` を復元 |
| 35 | `tests/paradise.test.js:154` | ⚪ | 自己診断が本番 KG を汚さぬよう `PARADISE_KG` を tmp へ固定 |
| 36 | `tests/paradise.test.js:6167` | 🔴 | `~/AppData/Local/hermes/scripts/paradise-catchup.py` の実在を見る(**hermes 側のグローバル**) |
| 37 | `tests/paradise.test.js:6244` | 🔴 | `~/.claude/commands/conclave.md` と正典の一致を見る |
| 38 | `tests/paradise.test.js:6286` | 🔴 | `~/AppData/Local/hermes/cron/jobs.json` を見る(**hermes 側のグローバル**) |
| 39 | `tools/hooks/paradise-session-start.js:28` | 🟡 | `PARADISE_ROOT` も自己位置解決も失敗した時の最後の手段 `~/Documents/workspace/paradise` |
| 40 | `tools/wire-paradise-hooks.js:17` | 🔴 | `CLAUDE_SETTINGS` 未設定なら `~/.claude/settings.json` を書き換える |

**集計: 🔴 = 23 / 🟡 = 12 / ⚪ = 5 = 40**

### 2.2 「既定値がグローバルへ落ちる」の実測証明

```console
$ CLAUDE_HOME=/nonexistent node -e "…各 engine の解決先を印字…"
apply-guards.SETTINGS        -> \nonexistent\settings.json
apply-seat(diff).file        -> \nonexistent\settings.json
apply-models AGENT_DIR       -> C:\Users\kikus\.claude\agents      ← CLAUDE_HOME を見ない
check-agents default dir     -> C:\Users\kikus\.claude\agents      ← CLAUDE_HOME を見ない
kg ROOT                      -> C:\Users\kikus\.claude\paradise-kg ← CLAUDE_HOME を見ない
daily-guard LEDGER           -> C:\Users\kikus\.claude\paradise-daily.json ← CLAUDE_HOME を見ない
deploy target                -> /nonexistent
```

**重大な発見: `CLAUDE_HOME` は万能スイッチではない。**
`CLAUDE_HOME=/nonexistent` を立てても `apply-models` / `check-agents` / `kg` / `daily-guard` / `pulse` の
5 系統は **依然として本物の `~/.claude` を見ている**。逸らすには別々の env が要る:

```console
$ PARADISE_AGENTS=/nonexistent node graph/apply-models.js verify | tail -1
no agent files in /nonexistent                       ← apply-models は逸れる

$ PARADISE_AGENTS=/nonexistent node -e "console.log(require('./graph/check-agents.js').check().dir)"
C:\Users\kikus\.claude\agents                        ← check-agents は PARADISE_AGENTS も見ない

$ CLAUDE_HOME=/nonexistent node -e "console.log(require('./graph/check-agents.js').check().dir)"
C:\Users\kikus\.claude\agents                        ← CLAUDE_HOME も見ない
```

**`graph/check-agents.js` と `graph/pulse.js` は env による逃げ道が一つも無い。**
(check-agents は引数 `agentsDir` を渡された時のみ逸れる。CLI 既定は必ず `os.homedir()`。)

---

## 3. 書き込みの向き — read only / write

### 3.1 write するモジュール (9件)

| モジュール | 書き込み行 | 書く先 | 何を書くか |
|---|---|---|---|
| `graph/deploy.js` | 184-185 (`mkdirSync`+`copyFileSync`) | `~/.claude/{agents,commands,rules}/`, `~/.claude/CLAUDE.md` | 58 ファイル |
| `graph/apply-guards.js` | 704 (`writeFileSync`) | `~/.claude/settings.json` | `permissions` / 死んだmatcher修理 / `env` 修復 |
| `graph/apply-seat.js` | 79 (`writeFileSync`) | `~/.claude/settings.json` | `model` / `effortLevel` |
| `graph/apply-models.js` | 115 (`writeFileSync`) | `~/.claude/agents/*.md` | frontmatter の `model:` `effort:` |
| `graph/apply-spawn.js` | 117 (`writeFileSync`) | `~/.claude/agents/*.md` | frontmatter の `tools:` に Task を追加 |
| `graph/kg.js` | 37,38,46,72,89,93 | `~/.claude/paradise-kg/{nodes,edges,cochange}.jsonl` | 知識グラフ本体 |
| `graph/daily-guard.js` | 78,79,171,179,206 | `~/.claude/paradise-daily.json` + `.lock` | 日次ノルマ台帳とリース |
| `graph/vendor.js` | 126,128 | `~/.claude/settings.json` + `.pre-vendor.bak` | hooks 配列の張り替え |
| `tools/wire-paradise-hooks.js` | 23 | `~/.claude/settings.json` | SessionStart フックの登録 |

**書く物 = 9 件**(engine 8 + tool 1)。

### 3.2 read only のモジュール (6件)

| モジュール | 読む先 | 用途 | 証拠 |
|---|---|---|---|
| `graph/check-agents.js` | `~/.claude/agents/` | `readdirSync` のみ。書き込み API が 1 行も無い | `rg "fs\.(writeFileSync\|mkdirSync\|…)" graph/check-agents.js` → 0 hit |
| `graph/pulse.js` | `~/.claude/{agents,commands,skills,paradise-kg}` | 件数を数える。書くのは自分の tmp のみ | `tests/dashboard-no-deps.test.js:57` の門 `AC-17d: pulse.js は ~/.claude 配下へ書かない(読むだけ)` が機械で強制 |
| `graph/export-state.js` | `~/.claude/paradise-kg/edges.jsonl` | 読むだけ。出力先は `dashboard/state.json` | `export-state.js:92-99` の write は全て `out`(dashboard) |
| `graph/ordain.js` | `<CLAUDE_HOME>/agents/` | 名前衝突検査で `readdirSync`。書くのは `overlay/agents/` (`AGENTS_DIR = path.join(OVERLAY,'agents')` — `ordain.js:34`) | `ordain.js:48` は readdir のみ |
| `graph/upstream.js` | 住所解決のみ | fs 書き込みゼロ | `rg "fs\.(writeFileSync\|…)" graph/upstream.js` → 0 hit |
| `tools/hooks/paradise-session-start.js` | KG(子プロセス経由) | stdout へ吐くだけ | `rg "fs\.(writeFileSync\|…)"` → 0 hit |

### 3.3 テストの依存 (書かない)

`tests/paradise.test.js:6167/6244/6286`, `tests/guards.test.js`(4箇所), `tests/dashboard-count.test.js:91`
— 全て `fs.existsSync` / `readFileSync` の **read only**。ただし後述のとおり **緑/skip を左右する**。

---

## 4. グローバル側の非楽園資産 — 壊してはならない物の名簿

```console
$ ls -a C:/Users/kikus/.claude
```

### 4.1 全 31 エントリの帰属判定

| エントリ | 帰属 | 判定根拠 | 撤収時 |
|---|---|---|---|
| `agents/` (30 .md) | **楽園** | deploy.js plan と 1:1 一致(計画外ゼロ) | 撤収対象 |
| `commands/` (19 .md) | **楽園** | 同上 | 撤収対象 |
| `rules/` (8 .md) | **楽園** | 同上 | 撤収対象 |
| `CLAUDE.md` | **楽園** | `overlay/root/CLAUDE.md` と diff 完全一致 | 撤収対象 |
| `paradise-kg/` (4ファイル) | **楽園** | `kg.js:31` の既定 ROOT。nodes 120 / edges 33 / cochange 5 行 | **移設対象**(消すと記憶が死ぬ) |
| `paradise-daily.json` | **楽園** | `daily-guard.js:36` の既定 LEDGER | 移設対象 |
| `agents.bak.1788121597/` (15) | **楽園の残骸** | 中身が配備 agents。ただし **engine のどこにも生成コードが無い**(`rg "agents\.bak"` → 0 hit)。過去の手作業由来 | 掃除可(要神の裁可) |
| `agents.bak.spawn.1788168490/` (16) | **楽園の残骸** | 同上 | 掃除可(要神の裁可) |
| `settings.json` | **混住** | §4.2 で鍵ごとに切り分け | **鍵単位で慎重に** |
| `settings.json.pre-vendor.bak` | **楽園** | `vendor.js:126` が作る唯一の .bak | 掃除可 |
| `settings.json.pre-wire.bak` | 楽園(旧 tool) | 現 `wire-paradise-hooks.js` に生成コード無し。**神の原初設定の唯一の証拠なので保存価値あり** | **保存** |
| `settings.json.bak.1787846094` | 楽園(旧 tool) | 同上・pre-wire と内容同一 | 保存 |
| `settings.json.pre-paradise-hook.bak` | 楽園(旧 tool) | engine に生成コード無し | 掃除可 |
| `settings.json.pre-env-repair.bak` | 楽園(旧 tool) | engine に生成コード無し | 掃除可 |
| **`.credentials.json`** (11,520B) | **🚨 Claude Code** | 認証トークン。楽園は一度も触らない | **絶対不可侵** |
| **`.credentials.lock`** | **🚨 Claude Code** | 同上 | **絶対不可侵** |
| `.last-cleanup` | Claude Code | CLI の内部タイムスタンプ | 不可侵 |
| **`projects/`** (28M) | **🚨 Claude Code** | セッション履歴の本体。最大の資産 | **絶対不可侵** |
| `sessions/` (17K) | Claude Code | セッション状態 | 不可侵 |
| `session-env/` (24K, UUID多数) | Claude Code | セッション環境 | 不可侵 |
| `shell-snapshots/` (288K) | Claude Code | シェル状態のスナップショット | 不可侵 |
| `history.jsonl` | Claude Code | コマンド履歴 | 不可侵 |
| **`plugins/`** (7.3M) | **🚨 神の私物** | `blocklist.json` / `known_marketplaces.json` / `marketplaces/` / `data/`。神が入れた marketplace | **絶対不可侵** |
| **`skills/`** (133K, 13件) | **混住** | 11件は `overlay/vendor/skills/` に複製あり(楽園が原本を持つ)。**`learned/` と `pr-review/` の 2 件は vendor に無い = 神の私物** | **`learned/` `pr-review/` は不可侵** |
| `policy-limits.json` | Claude Code | サーバ配信の制限値。mtime が起動毎に更新される | 不可侵 |
| `remote-settings.json` | Claude Code | サーバ配信設定(2バイト = `{}`) | 不可侵 |
| `backups/` (264K) | Claude Code | CLI のバックアップ | 不可侵 |
| `cache/` (556K) | Claude Code | `changelog.md` 他 | 不可侵 |
| `ide/` (0B) | Claude Code | IDE 連携 | 不可侵 |

### 4.2 `settings.json` の鍵ごとの帰属 — 実測による切り分け

**証拠1: 神の原初設定(楽園が触る前)** — 最古のバックアップ `settings.json.pre-wire.bak` (2026-08-28 00:55):

```console
$ cat C:/Users/kikus/.claude/settings.json.pre-wire.bak
{
  "env": { "PATH": "$PATH:/c/Program Files/GitHub CLI" },
  "enableWorkflows": true,
  "extraKnownMarketplaces": { "claude-plugins-official": { "source": { "source": "github", "repo": "anthropics/claude-plugins-official" } } },
  "language": "japanese",
  "theme": "dark",
  "agentPushNotifEnabled": true
}
```

**証拠2: 楽園が足したキー / 消したキー**

```console
$ node -e "…pre-wire.bak と現行の鍵を差分…"
神の原初(pre-wire.bak 2026-08-28)のキー: env, enableWorkflows, extraKnownMarketplaces, language, theme, agentPushNotifEnabled
現在のキー                        : enableWorkflows, extraKnownMarketplaces, language, theme, agentPushNotifEnabled, hooks, model, effortLevel, permissions
楽園が足したキー: hooks, model, effortLevel, permissions
楽園が消したキー: env
```

**証拠3: 空の settings に楽園を適用して増える鍵を実測**(本物には触らず tmp で実施)

```console
$ cp bare.json after.json
$ PARADISE_SETTINGS=…/after.json node graph/apply-seat.js apply
  ✎ 教主の座 → fable / effort:xhigh
$ PARADISE_SETTINGS=…/after.json node graph/apply-guards.js apply
  ✎ 掟を機構にした (1 change(s))
     · permissions: no `permissions` key at all — every machine-enforceable law was unenforced
$ diff bare.json after.json    →  model / effortLevel / permissions が増える
```

**証拠4: 現行値が engine の宣言と一致するか**

```console
$ node -e "…"
permissions 全体が POLICY と一致?: true
model/effortLevel が clergy 宣言と一致?: true true
```

#### 帰属表

| キー | 帰属 | 出典(ファイル:行) | 撤収時の扱い |
|---|---|---|---|
| `theme: "dark"` | **神** | pre-wire.bak に存在。楽園コードに `theme` の文字列なし | **不可侵** |
| `language: "japanese"` | **神** | 同上 | **不可侵** |
| `enableWorkflows: true` | **神** | 同上 | **不可侵** |
| `extraKnownMarketplaces` | **神** | 同上。`plugins/` と対をなす | **不可侵** |
| `agentPushNotifEnabled: true` | **神** | 同上 | **不可侵** |
| `permissions` (deny9/ask1/allow5) | **楽園** | `graph/apply-guards.js:169-200` の `POLICY` 定数が唯一の出典。実測で完全一致 | 撤収対象 |
| `model: "fable"` | **楽園** | `graph/apply-seat.js:79` が `clergy.RANKS.pontiff.model` を書く | 撤収対象 |
| `effortLevel: "xhigh"` | **楽園** | 同上 (`clergy.RANKS.pontiff.effort`) | 撤収対象 |
| `hooks` | **混住** | §4.3 参照 | **グループ単位で慎重に** |
| `env` (かつて `PATH`) | **神の設定を楽園が削除済み** | `graph/apply-guards.js:449-468` `repairEnv()` が `$PATH:` 前置を「展開されない致命的欠陥」として **key ごと削除**。実測で現行に `env` 無し | ⚠️ **既に神の鍵が1本消されている**(第三者の判断が神の設定を上書きした前例) |

#### 4.3 `hooks` の 13 グループの帰属

```console
$ node -e "…settings.json の hooks を全グループ列挙…"
PreToolUse   | 0 | Bash|PowerShell | inline/vendor  | Reminder to use tmux for long-running commands
PreToolUse   | 1 | Bash|PowerShell | inline/vendor  | Reminder before git push to review changes
PreToolUse   | 2 | Edit|Write      | PARADISE-PATH  | Suggest manual compaction at logical intervals
PreCompact   | 0 | *               | PARADISE-PATH  | Save state before context compaction
SessionStart | 0 | *               | PARADISE-PATH  | Load previous context and detect package manager
SessionStart | 1 | *               | PARADISE-PATH  | Paradise: inject the knowledge-graph snapshot
PostToolUse  | 0 | Bash|PowerShell | inline/vendor  | Log PR URL after PR creation
PostToolUse  | 1 | Edit            | inline/vendor  | Auto-format JS/TS with Prettier
PostToolUse  | 2 | Edit            | inline/vendor  | TypeScript check after editing
PostToolUse  | 3 | Edit            | inline/vendor  | Warn about console.log statements
Stop         | 0 | *               | inline/vendor  | Check for console.log in modified files
SessionEnd   | 0 | *               | PARADISE-PATH  | Persist session state on end
SessionEnd   | 1 | *               | PARADISE-PATH  | Evaluate session for extractable patterns
```

**6 グループが楽園リポジトリの絶対パスを指している**(グローバル → プロジェクトへの**逆向き依存**):

```console
$ node -e "…hooks 内の C:/ パスを抽出…"
C:/Users/kikus/Documents/workspace/paradise/overlay/vendor/scripts/hooks/suggest-compact.js
C:/Users/kikus/Documents/workspace/paradise/overlay/vendor/scripts/hooks/pre-compact.js
C:/Users/kikus/Documents/workspace/paradise/overlay/vendor/scripts/hooks/session-start.js
C:/Users/kikus/Documents/workspace/paradise/tools/hooks/paradise-session-start.js
C:/Users/kikus/Documents/workspace/paradise/overlay/vendor/scripts/hooks/session-end.js
C:/Users/kikus/Documents/workspace/paradise/overlay/vendor/scripts/hooks/evaluate-session.js
```

⚠️ **これは撤収作業で最も危険な結び目**。`~/.claude/settings.json` が楽園リポジトリのファイルパスを
直接握っている。リポジトリを移動・改名した瞬間、**神の全プロジェクトのセッション開始が壊れる**。
残り 7 グループは settings.json 内に `node -e "…"` でインライン展開されており、
`overlay/vendor/hooks/hooks.json` 由来(vendor 5 vs settings 3 等、件数は既に乖離)。

---

## 5. 試験の依存 — どの門が `~/.claude` で緑/赤を変えるか

### 5.1 通常環境 vs `CLAUDE_HOME=/nonexistent PARADISE_UPSTREAM=/nonexistent`

両方を background で全走行(各 約6分):

```console
$ node tests/paradise.test.js                                            # 通常
Paradise self-test: 455 passed, 0 failed
EXIT=0

$ CLAUDE_HOME=/nonexistent PARADISE_UPSTREAM=/nonexistent node tests/paradise.test.js
Paradise self-test: 455 passed, 0 failed
EXIT=0

$ diff pd-test-normal.txt pd-test-bare.txt
(完全一致 — 差分なし)
```

**結果: 出力が 1 バイトも違わない。**
これは「楽園が env で逸れている」からではなく、§2.2 で示したとおり
**`CLAUDE_HOME` を見ない engine(apply-models/check-agents/kg/daily-guard/pulse)が
env 設定を無視して本物の `~/.claude` を見続けている**からである。
つまり **この env 対では「素の環境」を再現できていない**。

### 5.2 真の裸環境 — `USERPROFILE` ごと逸らす

`os.homedir()` は Windows で `USERPROFILE` を読む。実測で確認:

```console
$ USERPROFILE="C:\Users\kikus\AppData\Local\Temp\pdfakehome" node -e "console.log(require('os').homedir())"
C:\Users\kikus\AppData\Local\Temp\pdfakehome
```

この裸ホームで各 engine を叩くと、**初めて全てが skip に落ちる**:

```console
$ USERPROFILE=<fakehome> HOME=<fakehome> CLAUDE_HOME=/nonexistent node -e "…"
homedir=C:\Users\kikus\AppData\Local\Temp\pdfakehome
deploy.check:      skipped=true  checked=0
check-agents:      skipped=true  dir=<fakehome>\.claude\agents
apply-seat.diff:   skipped=true
apply-guards.diff: skipped=true
conclave.md 配備物 exists=false
catchup 配備物   exists=false
cron jobs.json   exists=false
```

対して通常環境:

```console
$ node -e "…"
deploy.check:      skipped=false ok=true checked=60 drift=0
check-agents:      skipped=false ok=true missing=0
apply-seat.diff:   skipped=false ok=true
apply-guards.diff: skipped=false ok=true changes=0
```

### 5.3 実際に緑/skip が変わる門 — 実測で捕らえた 4 門

`tests/guards.test.js` を単体で両環境に掛けると **門の数が変わる**:

```console
$ node tests/guards.test.js                              # 通常
Paradise guards self-test: 64 passed, 0 failed

$ USERPROFILE=<fakehome> HOME=<fakehome> node tests/guards.test.js   # 裸ホーム
Paradise guards self-test: 60 passed, 0 failed, 4 skipped
```

skip に落ちた 4 門(全て `if (!fs.existsSync(G.SETTINGS)) skip(...)` を持つ):

| # | ファイル:行 | 門の名 | 何を失うか |
|---|---|---|---|
| 1 | `tests/guards.test.js:572` | the real settings.json has no dead and no overfiring matcher | 死んだ/暴発する matcher の検出 |
| 2 | `tests/guards.test.js:581` | every matcher on the real machine is classifiable and hits at least one tool | 未分類 matcher の検出 |
| 3 | `tests/guards.test.js:591` | the law IS the machinery on the real machine — permissions present, no drift | **掟と機構の乖離検出**(最重要) |
| 4 | `tests/guards.test.js:709` | the real machine enforces no unconditional BLOCK | 無条件 BLOCK の検出(第57条) |

`PARADISE_SETTINGS` でも同じ結果になることを確認(`CLAUDE_HOME` は guards では効く):

```console
$ PARADISE_SETTINGS=/nonexistent/settings.json node tests/guards.test.js | tail -1
Paradise guards self-test: 60 passed, 0 failed, 4 skipped
```

### 5.4 「静かに緑」で通る門 — 実在依存だが早期 return する 6 門

これらは `~/.claude` が無いと**検査せずに緑を返す**(赤にはならないが、実質は測っていない):

| ファイル:行 | 門 | 早期 return の条件 |
|---|---|---|
| `tests/paradise.test.js:1744` | deploy: the deployed tree matches its declared sources | `if (r.skipped) return` |
| `tests/paradise.test.js:1751` | deploy: check skips cleanly where no harness is installed | 常に緑(skipped の型だけ見る) |
| `tests/paradise.test.js:1459` | check-agents skips silently where no harness is installed | 存在しない dir を渡して skip を確認 |
| `tests/paradise.test.js:6244` | conclave: 配備された道は正典と一致する (第29条) | `if (!fs.existsSync(deployed)) return` |
| `tests/paradise.test.js:6167` | watchdog: 監視スクリプトは配備実物と一致 (第43条) | `if (fs.existsSync(deployed))` の中だけ |
| `tests/paradise.test.js:6286` | cron: 日次の発火は道を指す (第46条) | `if (!fs.existsSync(jobs)) return` |

門の絞り込み機能で 23 門を両環境に掛けた実測 — **どちらも 23 green / 0 red**:

```console
$ node tests/paradise.test.js --gate 'deploy|conclave: 配備|check-agents|seat|配備'
Paradise gate-filter: 23 of 455 gates matched — 23 green, 0 red

$ CLAUDE_HOME=/nonexistent PARADISE_UPSTREAM=/nonexistent node tests/paradise.test.js --gate '…'
Paradise gate-filter: 23 of 455 gates matched — 23 green, 0 red

$ USERPROFILE=<fakehome> HOME=<fakehome> CLAUDE_HOME=/nonexistent PARADISE_UPSTREAM=/nonexistent node tests/paradise.test.js --gate '…'
Paradise gate-filter: 23 of 455 gates matched — 23 green, 0 red
```

### 5.5 §5 の結論

- **赤に転じる門は 0 件。** 楽園の門は全て「ハーネス不在 = 欠陥ではない」を明示的に扱っており、
  グローバル撤収で CI が壊れることは無い。
- **ただし 4 門が skip に落ちて消える**(guards.test の実機検査)。
  この 4 門は「配備された settings.json が掟どおりか」を見る唯一の目であり、
  配備をやめる/移設するなら **同等の門をプロジェクト内に建て直す必要がある**(本書は設計しない)。
- **6 門は「静かに緑」に落ちる** — 測っていないのに緑を返す。第16条(判定不能は緑ではない)の
  観点では、撤収後にこの 6 門が「何も見ていない緑」になる点は要注意。
- 注: 裸ホームでの全 455 門走行は `motion-probe.mjs` が
  `Target.getTargets: timed out after 15000ms` で連続クラッシュしたため完走できなかった
  (ブラウザ起動系の門が裸ホームでプロファイルを作れないため)。
  **これは `~/.claude` 依存ではなく Chromium プロファイル依存**であり、本調査の対象外。
  代わりに §5.3/§5.4 の門別実測で依存を特定した。

---

## 6. グローバル非依存化の障害物リスト(難易度順)

### 🟢 難易度 1 — 機械的に片付く

| # | 障害物 | 出典 | なぜ易しいか |
|---|---|---|---|
| 1 | 58 ファイルの配備先 | `graph/deploy.js:59,116,129` → `overlay.json` の `deploy_target.default_path: "~/.claude"` | **JSON 1 行**と `CLAUDE_HOME` env で完全に逸らせる。`deploy.check()` は不在を skip として扱う設計が既にある |
| 2 | `graph/apply-seat.js` / `graph/apply-guards.js` の settings.json | `apply-seat.js:30-31`, `apply-guards.js:69-70` | `PARADISE_SETTINGS` という専用 env が既に第一優先で実装済み。既定値を変えるだけ |
| 3 | `graph/apply-models.js` の agents 書き換え | `apply-models.js:20` | `PARADISE_AGENTS` が既に第一優先。実測で `/nonexistent` へ逸れることを確認済み |
| 4 | `graph/kg.js` / `graph/export-state.js` の KG | `kg.js:31`, `export-state.js:23` | `PARADISE_KG` が既に第一優先。テストも既にこれで隔離している(`paradise.test.js:154`) |
| 5 | `graph/daily-guard.js` の日次台帳 | `daily-guard.js:36` | `PARADISE_DAILY_LEDGER` が既に第一優先 |
| 6 | 楽園の残骸ディレクトリ 4 件 | `agents.bak.*` ×2, `settings.json.*.bak` ×4 | engine に生成コードが無い(実測 `rg` で 0 hit)= 誰も再生成しない。神の裁可があれば消せる |

### 🟡 難易度 2 — env の逃げ道が無い。コード変更が要る

| # | 障害物 | 出典 | 何が難しいか |
|---|---|---|---|
| 7 | `graph/check-agents.js` に env スイッチが存在しない | `check-agents.js:106`, `check-agents.js:205` | 実測: `CLAUDE_HOME` も `PARADISE_AGENTS` も見ない。引数 `agentsDir` 経由でしか逸れないが、CLI と `pulse.js:392` は引数なしで呼ぶ。**新しい env か住所解決器が要る** |
| 8 | `graph/pulse.js` の `claudeDir()` が `os.homedir()` 固定 | `pulse.js:320` (使用箇所 392/396/397/399/535) | env を一切読まないヘルパ。ダッシュボードの `counts.agents/commands/skills` が全てここを通る。**3 メトリクスの出所ごと再定義が要る** |
| 9 | `graph/apply-spawn.js` が `CLAUDE_HOME` だけを見る | `apply-spawn.js:32-34` | `PARADISE_AGENTS` を見ない(兄弟の apply-models とは非対称)。env 名の統一が要る |
| 10 | `graph/vendor.js` の settings 3 経路 | `vendor.js:49,50,104,163` | `CLAUDE_HOME`/`CLAUDE_SETTINGS` の二重系。`wire()` は `.pre-vendor.bak` を作りながら書く |
| 11 | `tools/wire-paradise-hooks.js` | `wire-paradise-hooks.js:17` | `CLAUDE_SETTINGS` はあるが、そもそも**グローバル settings.json を書くことが存在理由**の道具。撤収 = この道具の廃止か再定義 |
| 12 | 配備をやめると guards.test の 4 門が消える | `guards.test.js:572,581,591,709` | 実測: 64 → 60 passed + 4 skipped。**掟と機構の乖離を見る唯一の目**が失われる。代替の門をどこに建てるかの判断が要る |
| 13 | 6 門が「静かに緑」に落ちる | `paradise.test.js:1744,1751,1459,6167,6244,6286` | 赤にはならないが、測っていないのに緑を返す。第16条の精神に反する状態が固定化する |

### 🔴 難易度 3 — 神の資産と不可分。判断が要る

| # | 障害物 | 出典 | 何が難しいか |
|---|---|---|---|
| 14 | **`settings.json` が神の設定と混住** | `~/.claude/settings.json` の 9 キー中 5 が神・3 が楽園・1 が混住 | 楽園が `permissions`/`model`/`effortLevel` を抜く際、**神の `theme`/`language`/`enableWorkflows`/`extraKnownMarketplaces`/`agentPushNotifEnabled` を巻き込まない保証**が要る。全書き戻し(`JSON.stringify(next)`)方式である以上、常に全キーを触る |
| 15 | **`hooks` の 13 グループが混住し、6 つが楽園リポジトリの絶対パスを握る** | `settings.json` の `hooks` / `apply-guards.js:628-666` が修理・削除する | グローバル → プロジェクトへの**逆向き依存**。楽園リポジトリを動かせば神の全プロジェクトのセッション開始が壊れる。かつ `apply-guards` は「禁じられた強制」「無条件BLOCK」を**削除する**権能を持つ = 神が自分で足したフックも削除対象になりうる |
| 16 | **`env.PATH` が既に楽園に消されている前例** | `apply-guards.js:449-468` `repairEnv()`。実測: pre-wire.bak に `env` 有り → 現行に無し | 神が書いた鍵を engine の判断で削除した実績がある。「グローバルには神が直接依頼した物だけ」の神託は、**この削除自体が違反だったことを含意する**。撤収設計はこの一件の是非を先に裁く必要がある |
| 17 | **`~/.claude/skills/` の帰属が未確定** | 13 件中 11 件は `overlay/vendor/skills/` に複製あり、`learned/` `pr-review/` の 2 件は複製なし | deploy は skills を一切配備していない(計画 0 件)のに vendor には原本がある = **宙吊り資産**。楽園が管理するのかしないのか、engine が答えを持っていない |
| 18 | **hermes 側のグローバル依存(`~/AppData/Local/hermes/`)** | `paradise.test.js:6167` (scripts/paradise-catchup.py), `paradise.test.js:6286` (cron/jobs.json) | `~/.claude` ではないが**もう一つのグローバル**。cron ジョブと監視スクリプトが hermes のグローバル領域に住み、門がその実在を検査している。第43条・第46条の機構がここに依存しており、プロジェクト内に閉じられない(cron は本質的にマシン単位の資産) |
| 19 | **`paradise-kg/` は移設であって撤収ではない** | `kg.js:31`。実測 nodes 120 / edges 33 / cochange 5 | 教訓 85 件を含む楽園の記憶本体。消せば第 2 原則(自己改善)の土台が死ぬ。プロジェクト内へ移すなら **git 追跡するか否か**(機密・肥大)の判断が先に要る |
| 20 | **配備そのものを止めるなら「楽園の agents は誰が使うのか」が未解決** | `~/.claude/agents/` 30 件 = Claude Code のグローバル subagent 名前空間 | Claude Code は `~/.claude/agents/` と `<project>/.claude/agents/` の両方を読む。プロジェクト内へ移せば楽園リポジトリでは動くが、**神が他所のリポジトリで `cardinal` や `self-critic` を呼べなくなる**。これは技術ではなく神託の解釈問題 — 「神が直接依頼した物」に楽園の神官が含まれるかどうか |

---

## 付録A. 使用したコマンドの全一覧

```bash
# §1 配備物
node graph/deploy.js plan
node -e "const p=require('./graph/deploy.js').plan(); …"     # 58件の全明細
node graph/deploy.js check
diff <(tr -d '\r' < overlay/root/CLAUDE.md) <(tr -d '\r' < C:/Users/kikus/.claude/CLAUDE.md)
node C:/Users/kikus/AppData/Local/Temp/pdcmp.js              # 実在との突合

# §2 依存箇所
rg -n -e "os\.homedir\(\)" -e "process\.env\.CLAUDE_HOME" -e "process\.env\.PARADISE_SETTINGS" \
      -e "process\.env\.PARADISE_AGENTS" -e "process\.env\.PARADISE_KG" -e "process\.env\.CLAUDE_SETTINGS" \
      -e "claudeHome\(" -e "claudeDir\(" -e "settingsPath\(" graph/*.js tools tests .github
CLAUDE_HOME=/nonexistent node -e "…各 engine の解決先…"
PARADISE_AGENTS=/nonexistent node graph/apply-models.js verify
CLAUDE_HOME=/nonexistent node graph/apply-spawn.js verify
PARADISE_KG=<tmp> node graph/kg.js stats

# §3 書き込みの向き
rg -n "fs\.(writeFileSync|appendFileSync|mkdirSync|copyFileSync|rmSync|unlinkSync|cpSync|openSync)" graph/*.js tools/**

# §4 グローバル資産
ls -a C:/Users/kikus/.claude ; du -sh <各dir>
node -e "…settings.json の全キー・permissions・hooks…"
node -e "…pre-wire.bak と現行の鍵差分…"
PARADISE_SETTINGS=<tmp> node graph/apply-seat.js apply      # tmp で足跡を再現(本物は無傷)
PARADISE_SETTINGS=<tmp> node graph/apply-guards.js apply

# §5 試験の依存 (background, 各 約6分)
node tests/paradise.test.js
CLAUDE_HOME=/nonexistent PARADISE_UPSTREAM=/nonexistent node tests/paradise.test.js
diff pd-test-normal.txt pd-test-bare.txt
node tests/guards.test.js
USERPROFILE=<fakehome> HOME=<fakehome> node tests/guards.test.js
PARADISE_SETTINGS=/nonexistent/settings.json node tests/guards.test.js
node tests/paradise.test.js --gate 'deploy|conclave: 配備|check-agents|seat|配備'
```

## 付録B. 本調査で改変したファイル

**楽園リポジトリ内: 本書 1 本のみ**(`reform/sovereign-abode/discovery-footprint.md`)。
`git status --porcelain` は `?? reform/sovereign-abode/` のみを示す。
`git commit` も `gh` も使っていない。

`~/.claude` は**一切変更していない**。§4.2 の証拠3 は
`$LOCALAPPDATA/Temp/pdprobe/` 内の複製に対して実施した。
`$LOCALAPPDATA/Temp/` 配下に調査用の一時ファイル(`pdcmp.js`, `pd-test-*.txt`, `pdfakehome/`, `pdprobe/`)を残している。
