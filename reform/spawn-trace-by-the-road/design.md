# spawn-trace 証跡強制 — design 相 設計書

- **道**: `reform/spawn-trace-by-the-road`(worktree: `C:/Users/kikus/AppData/Local/Temp/pd-trace`)
- **相**: design / 神官: architect
- **入力**: `requirements.md`(M1〜M9 / AC 22本 / 末尾の訂正2件)、`findings.md`(必要箇所のみ)
- **掟**: 本相は **実装を一切行っていない**。`graph/` `tests/` に 1バイトも触れていない
  (末尾 §10 に `git diff --stat` の実出力を貼る)。
- 本書の「実測」欄はすべて **design 相が本機で走らせた生の出力** である。捏造はない。

---

## 0. design 相が新たに測ったこと(この設計が立つ地面)

requirements が「design 相に委ねる」と書いた点(requirements.md:622-625)は、
測らずには決められない。以下は本相の実測である。

```
$ node -v
v24.14.0

$ node -e 'const s=require("node:sqlite");console.log(Object.keys(s).join(","))'
DatabaseSync,StatementSync,Session,constants,backup
(node:27932) ExperimentalWarning: SQLite is an experimental feature and might change at any time

$ node -e '...DatabaseSync(state.db,{readOnly:true}) で async_delegations を読む...'
rows: 51
cols: delegation_id,origin_session,origin_ui_session_id,parent_session_id,state,
      dispatched_at,completed_at,updated_at,event_json,result_json,delivery_state,
      delivery_attempts,delivered_at,owner_pid,owner_started_at,task_json,
      delivery_claim,delivery_claimed_at,origin_session_id
states: [{"state":"completed","c":49},{"state":"error","c":1},{"state":"running","c":1}]
dispatched_at type: number  1788391419.2262688      ← epoch 秒(float)。ISO 文字列ではない

$ which sqlite3
which: no sqlite3 in (...)                            ← 外部 CLI は無い

$ which jq
which: no jq in (...)                                 ← 訂正1の再確認。不在

$ node -e '<claude jsonl 全走査>'
parentFiles 22  lines 8849  tool_use(Task|Agent) 7  chains 7  childExists 7  parentToolUseId 0
```

**確定**:
1. **`node:sqlite` はこの機体で実際に動く**(v24.14.0 組込み、`readOnly:true` で 51行読めた)。
2. `sqlite3` CLI は無い。`jq` も無い。
3. claude-jsonl 側の鎖は 7/7 成立。`parentToolUseId` は 8,849行中 0件(findings/requirements と一致)。
4. `dispatched_at` は **epoch 秒の float**。ISO 文字列と比較する実装を書けば静かに壊れる。

### 0.1 対応づけについて本相が発見した決定的事実

requirements は「時刻窓での確率的突合をどう扱うか」を design に委ねた。
本相は測った結果、**確率的突合を採らずに済む**と判断した。理由は次の実測である。

```
$ node -e '<async_delegations の event_json.goal を出す>'
deleg_96437b01 | completed | role=leaf | goal= Paradise の spawn-trace 証跡強制について要件定義を書け。
  成果物: C:/Users/kikus/AppData/Local/Temp/pd-trace/reform/spawn-trace-by-the-road/requirements.md
deleg_c2a3e8c6 | completed | role=leaf | goal= Paradise の spawn-trace 証跡強制について調査し、findings.md を書け。
  成果物: C:/Users/kikus/AppData/Local/Temp/pd-trace/reform/spawn-trace-by-the-road/findings.md

$ node -e '<run の各相の artifactPath を出す>'
discover | artifact= findings.md     | artifactPath= reform/spawn-trace-by-the-road/findings.md
specify  | artifact= requirements.md | artifactPath= reform/spawn-trace-by-the-road/requirements.md
design   | artifact= design.md       | artifactPath= null   (status=running)
```

**発令の本文(`event_json.goal`)に成果物の絶対パスが含まれている。**
これは時刻でも役割名でもない、**文字列の一致**である。第16条が求める
「何をするかで裁く」証拠であり、確率ではない。

claude-jsonl 側にも同型の錨がある:

```
$ node -e '<tool_use の input を出す>'
toolu_01XEb8JkVzcjkgCmdRdTM5pP | inputKeys=description,subagent_type,run_in_background,prompt
  | sub=data-collector | desc=Ask subagent for model id
  | promptHead=Reply with ONLY the exact model id you are running as.
```

`input.prompt` / `input.description` が本文であり、ここに成果物パスが載れば同じ規則で突合できる。
なお **本機の 7件は Paradise の発令ではない**(prompt に Paradise の成果物パスが 1件も無い)。
findings.md 3.7 の「Paradise の相を dispatch した記録は `~/.claude` 側に 1件も無い」を
本相も再現した。ゆえに claude-jsonl 系統は「今は 0件マッチ」が **正しい答**であり、
そこで採取器が「壊れている」と誤断ずる設計にしてはならない(§3.6 の exit 3)。

---

## 1. 全体像 — 誰がどこを見るか

```
        ┌── 読むだけ ──────────────────────────────┐
        │  graph/trace-harvest.js          (新設)  │
        │   系統I  ~/.claude/projects/**/*.jsonl   │
        │   系統II ~/AppData/Local/hermes/state.db │
        └──────────────┬───────────────────────────┘
                       │ scan: 何も書かない
                       │ apply: run.spawnTrace に record() で刻む(人が打つ)
                       ▼
        ┌──────────────────────────────────────────┐
        │  run.spawnTrace{}  ← 唯一の真実の置き場   │
        └──────────────┬───────────────────────────┘
          ┌────────────┼─────────────┬──────────────┐
          ▼            ▼             ▼              ▼
  spawn-trace.js  conclave.js   contract.js    pulse.js
   verify/report   markDone      checkPayload   readSpawn
   (四値+legacy)   (done の門)   (--run の口)   (dashboard)
```

**不変条件(この設計の背骨)**:
> **ログを読むのは `trace-harvest.js` **だけ**である。**
> `markDone` も `verify` も `report` も `run.spawnTrace` しか見ない。
> これが AC-2.3(`grep` で 0 を要求)を構造で満たす唯一の形である。

---

## 2. must-have → 実現箇所の対応(既存行番号つき)

| # | 触るファイル | 触る関数(現在の行) | 変更の要点 |
|---|---|---|---|
| M1 | `graph/trace-harvest.js`(新設) | — | §3 全体 |
| M2 | `graph/conclave.js` | `markDone` (282-299) / CLI `done` (392-393) | 第4引数 `opts` 新設 + 証跡検査 |
| M3 | `graph/conclave.js` | `markDone` (282-299) / 定数域 (36-40) | `MAX_TRACE_WAIVER=3` / `run.traceWaivers` |
| M4 | `graph/spawn-trace.js` | `record` (41-58) / `verify` (65-78) / `report` (84-100) / CLI (131-144) | 四値化 + `clean` |
| M5 | `graph/spawn-trace.js` | 冒頭コメント (11-14) / `record` (46-53) | 「唯一確実」を削り、`observed` を3条件の OR に |
| M6 | `graph/contract.js` | CLI `check` (124-132) / `reconcile` (73-83) | `--run` の口 + `traceChecked` |
| M7 | `graph/conclave.js` `convene` (75-79) / `graph/spawn-trace.js` `verify`/`report` | `traceSchema:1` + 第五の値 `legacy` |
| M8 | `tests/paradise.test.js` | 末尾に追加(現在 282本) | 門A / 門B(§7) |
| M9 | `graph/census.js` `census()` (120-156) / `claims()` (163-181)、`graph/pulse.js` `readSpawn` (217-242)、`dashboard/paradise.js` (307-327) | `spawnTraceGates` + 四値表示 |

---

## 3. `graph/trace-harvest.js` の設計(本改修の本体)

### 3.1 依存の判断 — `node:sqlite` を採る

**問い**: sqlite の依存を足すか。Paradise の掟は「外部依存ゼロ」に近い。

**測った**:

```
$ node -e 'const s=require("node:sqlite");console.log(Object.keys(s).join(","))'
DatabaseSync,StatementSync,Session,constants,backup
```

**決定**: **`node:sqlite`(Node 組込み)を使う。`npm` 依存は 1つも足さない。**

理由:
- `require('node:sqlite')` は Node 本体の一部であり、`package.json` に何も増えない。
  「外部依存ゼロ」の掟を **破っていない**。
- 実測で `state.db`(124MB)を `readOnly:true` で開き、51行を読み切れた。
- 却下した道:
  - **`sqlite3` CLI 経由** → `which sqlite3` が不在。打てない道は道ではない。
  - **python 経由**(`python -c "import sqlite3 ..."`) → python は在るが(`python` 3.11.16)、
    engine が別言語のプロセスを跨ぐと失敗の様態が増える(文字コード・パス変換・exit code)。
    組込みで足りるものに process 境界を足す理由がない。
  - **系統II を読まない** → 第45条の病を再生産する。却下。

**ただし** `node:sqlite` は `ExperimentalWarning` を出す(実測で確認)。この扱いを決める:

- 採取器は **警告を握り潰さない**。stderr にそのまま流す(黙らせれば版元の変更に気づけない)。
- `--json` 指定時の **stdout は JSON 単体を保つ**。警告は stderr なので混ざらない。
  (AC-1.1 が `stdout は単一の JSON` を要求するため、これは必須の条件である)
- `require('node:sqlite')` 自体が throw する将来の機体では、系統II を
  `{ id:'hermes-async-delegations', scanned:0, found:0, unavailable:'node:sqlite 不在' }` として
  **名乗る**。黙って 0 にしない(第44条)。この場合も `sources.length===2` は保たれる。

### 3.2 走査対象と鎖(実測に基づく)

**系統 I — `~/.claude/projects/**/*.jsonl`**

```
親ログ行  message.content[] の tool_use { id, name∈{Task,Agent}, input.{subagent_type,description,prompt} }
   ↓ 同じ tool_use_id を持つ tool_result 行
親ログ行  toolUseResult { agentId, status, agentType, resolvedModel, totalDurationMs }
   ↓ agentId がファイル名を決める
子ログ    <projDir>/<sessionId>/subagents/agent-<agentId>.jsonl   ← 実在検査
```

実測(§0): `tool_use(Task|Agent)` 7件 → `chains` 7件 → `childExists` **7/7**。
子ログの位置は実測で `path.dirname(親jsonl)/<親basename>/subagents/agent-<id>.jsonl` と
`path.dirname(親jsonl)/subagents/agent-<id>.jsonl` の両形を試して見つかった方を採る
(本機では前者が当たった。両方見るのは版差への保険であり、当てずっぽうではない)。

**系統 II — `state.db : async_delegations`**

```sql
SELECT delegation_id, state, dispatched_at, completed_at, event_json
  FROM async_delegations
```
- `state ∈ {completed, error, running}`(実測 49/1/1)
- `dispatched_at` は **epoch 秒 float**。ISO 文字列として `Date.parse` してはならない。
  採取器は `new Date(dispatched_at * 1000)` で正規化する。
- `event_json` は JSON 文字列。`{type, delegation_id, session_key, origin_ui_session_id,
  origin_session_id, parent_session_id, goal, goals, context, toolsets, role, model}`。
  **`goal` が対応づけの錨である**(§0.1)。
- `event_json` が空文字/壊れている行が実在する(`deleg_90c48256` の `evKeys=[]` を実測)。
  parse 失敗は **その1件を `unmatched` に落とすだけ**で、走査全体を止めない。

### 3.3 相への対応づけ — **決定的一致のみを `observed` とする**

これを誤れば「嘘の緑」であり no-trace より悪い(第5条)。ゆえに**三段の階梯**を定める。

#### 階梯A — 決定的一致(`confidence: 'exact'`)。自動で刻んでよい

次の **どちらか** が成立したときのみ。

- **A-1 成果物パス一致**: 発令本文(系統I は `input.prompt`+`input.description`、
  系統II は `event_json.goal`)が、その相の `phase.artifactPath` または
  `<runDir>/<phase.artifact>` を **部分文字列として含む**。
  - 比較前に `\\` → `/` に正規化し、大小文字を落とす(Windows のため)。
  - 実測でこの規則は成立する:
    `deleg_96437b01.goal` ⊃ `reform/spawn-trace-by-the-road/requirements.md` = `specify` の artifactPath。
  - **空文字・`null`・`"artifact"` のような抽象名では一致させない。**
    `phase.artifact` が `implementation` / `tests` / `docs` / `verdict` のような
    パスでない語のときは A-1 を**適用しない**(実測: `build`〜`verdict` の 6相がこれに当たる)。
    抽象名で部分一致を取れば、`docs` が無数の発令に当たって総崩れになる。
- **A-2 既存の id 一致**: `run.spawnTrace[phase][].toolUseId` または `parentToolUseId` に
  既に刻まれている id が、採取した `toolUseId` / `delegationId` と一致する。
  これは「人が手で record した申告を、機械が裏取りする」道である。
  実測でこの run の `discover` は `parentToolUseId: "deleg_c2a3e8c6"` を持ち、
  DB に同 id が `state=completed` で実在する(§0 実測)。**この場合、
  既存の `asserted` を `observed` へ昇格させる根拠が決定的に立つ。**

#### 階梯B — 示唆(`confidence: 'suggested'`)。**自動で刻まない。人に見せるだけ**

時刻窓・役割名(`agentType` / `event_json.role` と `phase.agent`)での一致。

- 窓の定義: `phase.dispatchedAt`(`conclave.js:68,210` が刻む)を中心に **±30分**。
  `dispatchedAt` が `null`/`undefined` の相は窓を作れない → **候補にすらしない**。
- 役割: `phase.agent`(例 `requirements-analyst`)と `agentType`/`role` の完全一致。
  実測では系統II の `role` は `leaf` であり **相の役割名ではない**。
  つまり本機では役割一致はほぼ効かない。効かないものを効くふりで書かない。
- **B は `apply` で書き込まれない。** `scan --json` の `suggestions[]` に出るだけである。
  人が `apply --phase <id> --pick <n>` で 1件ずつ選ぶ。

> requirements M7 は「自動昇格を行わない」と決めている(requirements.md:412-415)。
> 本設計はそれを **階梯B の禁止** として具体化する。
> 階梯A は「昇格」ではなく **決定的な同定** であり、パス文字列の一致は確率ではない。
> それでも legacy run への書き戻しは §5.3 の通り `--force` を要する。

#### 階梯C — 不一致(`unmatched`)

どの相にも当たらなかった証跡。捨てずに `unmatched[]` に残す
(§0.1 の通り本機の 7件はすべてここに落ちる。それが**正しい**)。

#### 自動 `observed` を刻んでよい条件 / 人に問う条件(明文)

| 条件 | 自動で `observed` を刻む | 人に問う |
|---|---|---|
| A-1 パス一致(具体的なパスを持つ相) | ✅ `apply` が刻む | — |
| A-2 既存 id の裏取り | ✅ `apply` が刻む | — |
| B 時刻窓のみ | ❌ | ✅ `suggestions[]` → `apply --pick` |
| B 役割名のみ | ❌ | ✅ 同上 |
| 1つの相に階梯A の候補が **2件以上** | ❌ **刻まない** | ✅ 曖昧を自動で解かない(第51条b) |
| legacy run(`traceSchema` 無し) | ❌ | ✅ `--force` 必須(§5.3) |

### 3.4 出力の形(`scan --json`)

```jsonc
{
  "state": "ok",                       // ok | harvest-blind
  "at": "2026-…Z",
  "sources": [
    { "id": "claude-jsonl",             "scanned": 22, "found": 7, "unavailable": null },
    { "id": "hermes-async-delegations", "scanned": 51, "found": 51, "unavailable": null }
  ],
  "entries": [                          // 拾えた証跡そのもの(相への対応づけ前)
    { "source": "claude-jsonl", "toolUseId": "toolu_01XEb…", "agentId": "a47ff19939f65c691",
      "agentType": "data-collector", "childLog": "C:/…/subagents/agent-a47ff19939f65c691.jsonl",
      "at": "2026-08-31T12:48:49.080Z", "text": "Reply with ONLY the exact model id…" },
    { "source": "hermes-async-delegations", "delegationId": "deleg_96437b01",
      "state": "completed", "childLog": null,
      "at": "2026-…Z", "text": "Paradise の … 成果物: C:/…/requirements.md" }
  ],
  "matches":     [ { "phase": "specify", "confidence": "exact", "rule": "A-1", "entry": {…} } ],
  "suggestions": [ { "phase": "design",  "confidence": "suggested", "rule": "B-time", "entry": {…} } ],
  "unmatched":   [ {…} ]
}
```

- `sources.length === 2` は **常に** 保つ(片方が使えなくても要素は残し `unavailable` を書く)。
  これが AC-1.1 の `sources | length == 2` を構造で満たす。
- `scanned` = 走査したファイル数/行数、`found` = 鎖として成立した数。両方必ず数値。
- 系統I の各 `entries` は `childLog != null` を満たす(実在検査に通ったものだけ入れるため)。
  これが AC-1.2 の `entries | all(.childLog != null)` に対応する
  — ただし **`--source claude-jsonl` で絞ったときの話**である。系統II の項は
  `childLog: null` を持つ。AC-1.2 は `--source claude-jsonl` 付きで打つ AC なので整合する。
  この点は AC の読み違えが起きやすいので build 相への申し送りとする(§9)。

### 3.5 `scan` と `apply` の分離

| 口 | 読む | 書く | 用途 |
|---|---|---|---|
| `scan [--source <id>] [--root <dir>] [--db <path>] [--run <run.json>] [--json]` | ログ / DB / (任意で run) | **何も書かない** | 観測 |
| `apply <run.json> [--phase <id>] [--pick <n>] [--force] [--dry-run]` | 同上 | `run.spawnTrace` / `run.history` | 適用 |

- `scan` に `--run` を渡さなければ対応づけを行わず、`entries` だけを返す
  (`matches`/`suggestions` は空配列。キー自体は必ず在る)。
- `apply` は **階梯A の `matches` のみ**を `spawnTrace.record()` 経由で刻む。
  自前で entry を組み立てず、必ず `record()` を通す — 形式の分岐を 2箇所に置かない。
- `apply` は `run.history` に `{ event: 'trace-harvest', detail: '<phase> ← <source>:<id>' }` を積む。
  **後から数えられない適用は適用ではない**(第22条)。
- `--dry-run` は「何を刻むか」を出して終わる(書かない)。
- `--force` は legacy run(`traceSchema` 無し)への書き込みを許す唯一の鍵(§5.3)。

### 3.6 exit code の定義

| exit | 名 | 意味 |
|---|---|---|
| `0` | ok | 走査して **1件以上**拾えた |
| `1` | fail | 引数不正 / run が読めない / `apply` が拒まれた |
| `3` | **harvest-blind** | 走査は完走したが **どの系統からも 1件も拾えなかった** |
| `2` | usage | 使い方の誤り(既存 engine の慣例に揃える) |

- `state: "harvest-blind"`、`reason` に **`走査できたが1件も拾えなかった`** の語を必ず含める
  (AC-1.3 が `test("走査できたが1件も拾えなかった")` を要求するため、この文言は**契約**である)。
- `0` と `3` を同じ値にしない理由は requirements.md:155-156 の通り。
  「採取器が壊れている」と「本当に発令されていない」を分ける唯一の印である。
- 判定は **全系統の `found` の総和が 0 か** で行う。片系統が 0 でも他が拾えば `0` を返す
  (M1 の「片方が空でも打ち切らない」の裏返し)。

### 3.7 性能・安全

- 8,849行 / 22ファイルの全走査は実測で瞬時に終わる。キャッシュは持たない(非目標8)。
- `~/.claude` は **`fs.readFileSync` のみ**。書き込み API を import しない(非目標1)。
- `state.db` は **`{ readOnly: true }` で開く**(実測でこの指定が通ることを確認済み)。
  書き込み経路を持たない。
- 壊れた JSONL 行 / 壊れた `event_json` は 1件単位で読み飛ばし、
  `sources[].skipped` に数を積む。**黙って捨てない**。

---

## 4. `verify()` の四値化 + legacy の第五の値 — 波及の実測列挙

まず **誰が呼んでいるか**を数えた(grep の実出力):

```
$ grep -rn "spawnTrace\|trace\.verify\|trace\.report" --include=*.js . | grep -v node_modules
./graph/contract.js:74,75          ← trace.verify(opts.run, result.phase)
./graph/pulse.js:48,221            ← spawnTrace.report(run)
./graph/spawn-trace.js:42,55,56,66 ← 自身
./dashboard/paradise.js:307-327    ← r.spawn.{observed,assertedOnly,noTrace,total}
./tests/dashboard-run-panel.test.js:102,146,173,182
./tests/paradise.test.js:2255,2281
```

### 4.1 現在のシグネチャ → 変更後

```js
// graph/spawn-trace.js:41  現在
function record(run, phase, evidence = {})
//   entry.kind = (toolUseId || parentToolUseId) ? 'observed' : 'asserted'   (:53)
// 変更後 — 引数の形は不変。kind の決め方だけ変える(呼び手を壊さない)
function record(run, phase, evidence = {})
//   kind = 'waived'   … evidence.kind === 'waived'(reason 必須)
//        = 'observed' … 次の OR(M5):
//            (a) toolUseId && agentId && childLog が実在する文字列
//            (b) delegationId && (state==='completed' || state==='running')
//            (c) parentToolUseId が実在する          ← 十分条件の一つに降格
//        = 'asserted' … それ以外
//   entry に source / agentId / childLog / delegationId / reason / by を追加
```

> **後方互換の要点**: 既存の門 `tests/paradise.test.js:2265` は
> `record(run,'discover',{agent:'…', toolUseId:'toolu_01ABC', rank:'priest'})` で
> `verified:'file+spawn'` を期待している(実測でこの門は現在緑)。
> 上の (a) は `agentId`/`childLog` も要求するため、**この既存の門が赤くなる**。
> ゆえに (a) は次の形にする:
> **`toolUseId` があれば `observed`。`agentId`/`childLog` が併記されていれば
> それらの実在も検める(在ると名乗って無ければ `asserted` へ落とす)。**
> 「名乗らなければ検めない、名乗ったら検める」— これなら既存 4門が緑のまま、
> 採取器が刻む厚い証跡は実在検査を受ける。
> **AC-2.2 / AC-5.2 も `toolUseId` だけ、あるいは `childLog` 併記の両形を要求しており、
> この規則で両方満たせる。**

```js
// graph/spawn-trace.js:65  現在
function verify(run, phase) -> { ok, state:'observed'|'asserted-only'|'no-trace', phase, entries?, reason }
// 変更後
function verify(run, phase, opts = {}) -> { ok, state, phase, entries?, reason }
//   state ∈ 'observed' | 'asserted-only' | 'waived' | 'no-trace' | 'legacy'
//   ok    = state === 'observed' || state === 'waived'      ← waived は「通す」が「緑」ではない
//   legacy: opts.legacy === true(= run.traceSchema が undefined)かつ証跡ゼロ のとき
//           { ok:true, state:'legacy',
//             reason:'この走行は新門の導入以前に建てられたため、証跡について判定していない' }
//   ※ legacy run でも証跡が在れば通常通り四値で裁く(測れるものは測る)
```

```js
// graph/spawn-trace.js:84  現在
function report(run) -> { ok, total, observed, assertedOnly, noTrace, rows, bypassed }
// 変更後
function report(run) -> { ok, clean, total, observed, assertedOnly, waived, noTrace, legacy,
                          rows, bypassed, waivedPhases, traceSchema }
//   legacyRun = (run.traceSchema === undefined)   → 各相を verify(run,id,{legacy:true}) で裁く
//   ok    = bypassed.length === 0                 （bypassed = rows.filter(r => !r.ok)）
//   clean = total > 0 && observed === total       ← 「全相が observed か」
//   waivedPhases = waived の相 id 配列(CLI 出力で名指しするため)
//   **既存キー total/observed/assertedOnly/noTrace/ok/rows/bypassed は 1つも消さない**
```

### 4.2 波及先ごとの対処(実測で数えた 6箇所 + 門5本)

| # | 場所 | 現状 | 波及 | 対処 |
|---|---|---|---|---|
| 1 | `graph/contract.js:73-82` | `t.ok` だけを見る | **無害**。`waived`/`legacy` は `ok:true` なので通る | `verified` の語を細分: `t.state==='observed'` → `'file+spawn'`、`'waived'` → `'file+waived'`、`'legacy'` → `'file+trace-unjudged'`。**`'file+spawn'` の文字列は observed の場合に必ず維持**(門 `paradise.test.js:2271` が `assert.strictEqual(r.verified,'file+spawn')`) |
| 2 | `graph/pulse.js:217-242 readSpawn` | `rep.total<=0` を「測れていない」として `null` を返す | **無害だが不足**。`waived`/`legacy` が返る欄が無い | 戻り値に `waived, legacy, clean` を追加。`total<=0` の防御(230行)は**そのまま残す** — これは D-3 故障注入門の要である |
| 3 | `dashboard/paradise.js:307-327` | `observed / assertedOnly / noTrace` の3行を描く | **不足**。棄権が不可視 = M4 の理由そのもの | 2行追加(`棄権` / `判定していない`)+ `data-spawn-waived` / `data-spawn-legacy` 属性 |
| 4 | `dashboard/paradise.js:325-327` | `data-spawn-*` 属性 | 門 `dashboard-run-panel.test.js:95` が `data-score` と `data-spawn-notrace` が**同一要素内**にあることを正規表現 `[\s\S]{0,400}?` で測る | **属性を追加すると 400文字の窓を越えうる**。追加属性は `data-spawn-notrace` より**手前**に置くか、門の窓を広げる。build 相はこの門を実際に走らせて確かめること |
| 5 | `tests/dashboard-run-panel.test.js:102-107` | `rep.total>0` / `r.spawn.noTrace === rep.noTrace` | **要注意**。倉不在時(実測 `siblingPresent()`→false)は `snap.runs` が空でこのループは回らない。倉が在る機体では回る | `noTrace` の意味が legacy 相で `11 → 0` に変わる。断面と engine が同じ規則なら一致は保たれる。**`readSpawn` と `report` の両方を同時に直す**こと。片方だけ直せばここが割れる |
| 6 | `tests/dashboard-run-panel.test.js:146-152, 173-183` | **パス文字列を渡すと `{ok:true,total:0,noTrace:0}` が返る**ことに依存する故障注入門 | **最も危険**。`report()` の入口に「引数が文字列なら throw」を足すと**この門が赤くなる** | **`report()` に文字列拒否を足してはならない。** 現在の「静かに total:0」という挙動は `pulse.readSpawn` の防御が測る対象であり、意図された設計である(`pulse.js:207-216` のコメントが明言)。四値化は `run.spawnTrace` の読み方だけを変え、引数型の挙動を変えない |
| 7 | 門 `paradise.test.js:2227` (no observed → reject) | 緑 | 無害 | 変更なし |
| 8 | 門 `paradise.test.js:2243` (asserted-only) | 緑 | 無害 | `t.state==='asserted-only'` を維持 |
| 9 | 門 `paradise.test.js:2260` (observed → `file+spawn`) | 緑 | **§4.1 の注記の通り危うい** | `record` の規則を §4.1 の形にすれば緑のまま |
| 10 | 門 `paradise.test.js:2275` (report の三値) | 緑 | `observed:1, assertedOnly:1, noTrace:1` を assert。この run は `traceSchema` 無し = legacy | **legacy 判定を「証跡ゼロの相にのみ適用」にしないとこの門が赤くなる**(`c` が `no-trace`→`legacy` に化ける)。§4.1 の `verify` 仕様(legacy は証跡ゼロのときだけ)はこの門を守るために選んだ |
| 11 | 門 `paradise.test.js:2290` (run 無しの後方互換) | 緑 | `verified:'file'` を assert | M6 で `traceChecked:false` を**足す**だけ。`verified` は変えない |

> **11箇所を数えた。うち赤くなりうるのは #4 / #6 / #9 / #10 の 4箇所である。**
> 数えずに設計すれば、この 4箇所を build 相が踏む。

### 4.3 CLI `report` の出力(M4 / M7)

```
═══════ 👁  SPAWN TRACE ═══════
phases: 11  observed: 1  asserted-only: 0  waived: 1  no-trace: 0  legacy: 9
  ✓  discover  1 件の起動を観測: market-researcher
  ⚑  specify   棄権: Hermes async_delegations deleg_96437b01 で発令済み
  ？ design    この走行は新門の導入以前に建てられたため、証跡について判定していない
  …
───────────────────────────────
棄権 1 相: specify              ← 沈黙で通さない(第44条)
legacy 9 相 — 判定していない
═══════════════════════════════
exit: 0   (ok:true / clean:false)
```

- 棄権があれば **必ず `棄権` の語と相の一覧**を出す(AC-4.2)。
- legacy があれば **必ず `判定していない` の語**を出す(AC-7.2)。
- exit は `ok` に従う(`0`/`1`)。`clean` は exit を変えない(棄権は「止める」理由ではない)。

---

## 5. M2 / M3 / M7 — `conclave.js` の変更

### 5.1 `markDone` のシグネチャ

```js
// graph/conclave.js:282  現在
function markDone(run, id, artifactPath)
// 変更後
function markDone(run, id, artifactPath, opts = {})
//   opts.noTraceReason : string | undefined
```

CLI 側(`conclave.js:392-393`):

```js
// 現在
} else if (cmd === 'done') {
  need(); const run = load(rp); markDone(run, pos[0], f.artifact); save(rp, run); …
// 変更後
  markDone(run, pos[0], f.artifact, { noTraceReason: f['no-trace-reason'] });
```

`parse()`(:377)は `--no-trace-reason "理由"` を `f['no-trace-reason']` に入れる
— **既存の parse で足りる**(値が `--` 始まりでなければ次の語を取る)。新しい解析器は書かない。

### 5.2 `markDone` 内の処理順(第22条の検査と**並べる**)

```
1. 相の存在確認                             (現行 283-284 のまま)
2. 成果物の実在検査                          (現行 285-296 のまま。1バイトも変えない)
3. ★証跡の門(新設)
   3a. run.traceSchema === undefined → legacy。**何も検めずに 4 へ**(AC-7.1)
   3b. opts.noTraceReason が在る:
        - trim 後 20文字未満 → throw「棄権の理由が短すぎる(最小20文字)。…」   (AC-3.2)
        - run.traceWaivers = (run.traceWaivers||0) + 1
        - run.traceWaivers > MAX_TRACE_WAIVER(=3) →
            owner domain.status = 'blocked'
            run.history.push({ event:'trace-waiver-guard', … })
            throw「棄権が上限 3 を超えた。domain <x> を blocked にした。人へ escalate せよ」 (AC-3.3)
        - spawnTrace.record(run, id, { kind:'waived', reason, by: opts.by || 'human' })
   3c. さもなくば verify(run, id) を呼ぶ:
        - state ∈ {observed, waived} → 通す
        - さもなくば throw(§5.4 の文面)                                     (AC-2.1)
4. p.status = 'done' 以降                    (現行 297-298 のまま)
```

**AC-3.3 の検算**: 相 a,b,c,d を順に棄権すると
`traceWaivers` は 1,2,3,4。4 で `4 > 3` が成立して throw → stdout `BLOCKED@d`、exit 1。
**AC が期待する `BLOCKED@d` と一致する。**
なお `throw` する前に `blocked` と `history` を書くこと — 例外で巻き戻せば台帳に残らない。

**AC-3.1 の検算**: 1回目の棄権は `traceWaivers` = 1、`run.spawnTrace.discover[0].kind='waived'`、
`reason` 有り → stdout `waived true 1`。**一致する。**

### 5.3 定数

```js
// graph/conclave.js:36-40 の定数域に並べて置く
const MAX_TRACE_WAIVER = 3;   // 第51条c と同型。MAX_DOMAIN_REWORK=3 に合わせた
const MIN_WAIVER_REASON = 20; // 文字数。中身ではなく長さを裁く(第22条)
```
`module.exports`(:431)に `MAX_TRACE_WAIVER` を足す(門が定数を名指しで測れるように)。

### 5.4 例外文(第15条 — 拒むだけで出口を示さない門は静止を生む)

```
相 "design" を done にできない — 起動の証跡が no-trace である(第27条)。
  この相が本当に発令されたことを機械が辿れない。次のいずれかを打て:
    1) 採取器に拾わせる:
         node graph/trace-harvest.js scan --run <run.json> --json
         node graph/trace-harvest.js apply <run.json> --phase design
    2) 証跡が engine の知らぬ経路にあるなら、理由を添えて棄権せよ(20文字以上):
         node graph/conclave.js done design --run <run.json> \
           --no-trace-reason "<なぜ辿れないのかを一文で>"
       棄権は最大 3 回まで。超えれば domain は blocked になる。
```
AC-2.1 が例外文に **`no-trace` と `--no-trace-reason` の両方**を要求する。上の文面は両方含む。

### 5.5 `convene` に `traceSchema`(M7 / AC-7.3)

```js
// graph/conclave.js:75-79  現在
return { meta: dag.meta || {}, created: now(), domains, history: [...] };
// 変更後
return { meta: dag.meta || {}, created: now(), traceSchema: 1, domains, history: [...] };
```

実測で `convene` の CLI は `--run` である(`conclave.js:385` の usage が正典)ことを確認済み。
**訂正2 の通り `--out` は存在しない。**

```
$ node graph/conclave.js convene reform/spawn-trace-by-the-road/forge.dag.json --run "$LOCALAPPDATA/Temp/ac-probe.json"
convene exit=0
$ node -e '…' → traceSchema= undefined  phases= 11        ← 現状 RED。実際に打って確かめた
```

---

## 6. M6 — `contract.js` の素通りを塞ぐ

```js
// graph/contract.js:124-132  現在
if (cmd === 'check') {
  let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
    const rec = checkPayload(d);
    console.log(JSON.stringify(rec,null,2));
    process.exit(rec.accepted ? 0 : 1); });
  return;
}
// 変更後
if (cmd === 'check') {
  const i = process.argv.indexOf('--run');
  const runPath = i > -1 ? process.argv[i+1] : null;
  let opts = {};
  if (runPath) {
    try { opts.run = JSON.parse(fs.readFileSync(runPath,'utf8')); }
    catch (e) {
      // 読めなかったを「渡されなかった」と同じ扱いにしない(第44条)
      console.log(JSON.stringify({ accepted:false, traceChecked:false,
        reason:'--run を読めなかった: ' + e.message }, null, 2));
      process.exit(1);
    }
  }
  let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{ … checkPayload(d, opts) … });
}
```

`reconcile()` (:73-83) の戻り値に **`traceChecked` を必ず添える**:

```js
// opts.run が無い経路(:83)
return { accepted:true, reason:`artifact verified (${size}b): ${art}`,
         verified:'file', size, traceChecked:false };     // ← 追加
// opts.run が在る経路(:77-82)は traceChecked:true を添える
```

- **`verified:'file'` の値は変えない** — 門 `paradise.test.js:2290` が assert している。
- `no-trace` のときは既存 :77-79 の分岐がそのまま `verified:'file-but-unspawned'` を返す。
  **この分岐は現在まったく実行されていない**(呼び手ゼロ)。M6 はそこに初めて経路を与える。

### AC の書き直し(訂正1 — `jq` 不在)

```
# AC-6.1
$ echo '{"phase":"discover","status":"done","artifact":"CONSTITUTION.md"}' \
  | node graph/contract.js check \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
      const j=JSON.parse(d); process.exit(j.traceChecked===false?0:1);})'
# exit 0 を期待

# 現状(RED) — design 相が実際に打った:
#   traceChecked= undefined  accepted= true  verified= file      → exit 1

# AC-6.2
$ node graph/conclave.js convene reform/spawn-trace-by-the-road/forge.dag.json \
    --run "$LOCALAPPDATA/Temp/ac62.json" >/dev/null      # ← --out ではない(訂正2)
$ echo '{"phase":"discover","status":"done","artifact":"CONSTITUTION.md"}' \
  | node graph/contract.js check --run "$LOCALAPPDATA/Temp/ac62.json" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
      const j=JSON.parse(d);
      process.exit(j.accepted===false && j.verified==="file-but-unspawned"
                   && j.traceChecked===true ? 0 : 1);})'
```
**同じ書き直しを AC-1.1 / AC-1.2 / AC-4.1 / AC-7.2 / AC-7.3 にも適用する**(§9 の申し送り)。

---

## 7. M8 — 破壊試験の設計(第21条)

門は `tests/paradise.test.js` の末尾に足す(現在 `grep -c "^test(" tests/paradise.test.js` → **282**、
実測で確認)。門A/門B を足せば **284**。AC-8.1 の「284 以上」と整合する。

### 門A — 「証跡ゼロのまま complete まで回りきる」を捕らえる

```js
test('spawn trace: 証跡ゼロの走行は complete へ到達できない (第27条/第50条)', () => {
  // ★ この門は record() を一度も呼ばない。呼べば穴の手前しか見なくなる(AC-8.2)
  const c = require('../graph/conclave.js');
  const run = c.convene('reform/spawn-trace-by-the-road/forge.dag.json');
  assert.strictEqual(run.traceSchema, 1, 'convene が版の印を刻んでいない');
  const first = c.next(run);
  c.markRunning(run, first.dispatch.map(d => d.id));
  assert.throws(() => c.markDone(run, first.dispatch[0].id), /no-trace/,
    '証跡ゼロで done が通った — 環は証跡なしで回りきる');
});
```

**何を壊せば何が鳴るか(実際に打てる)**

| # | 壊し方(コマンド) | 鳴る門 | 鳴り方 |
|---|---|---|---|
| A-1 | `node -e 'const f="graph/conclave.js",fs=require("fs");let s=fs.readFileSync(f,"utf8");fs.writeFileSync(f+".bak",s);fs.writeFileSync(f,s.replace("throw new Error(TRACE_MSG","if(false) throw new Error(TRACE_MSG"))'` → `node tests/paradise.test.js` | 門A | `assert.throws` が「例外が飛ばなかった」で失敗。fail=1 |
| A-2 | `node -e '…spawn-trace.js の verify で state:"no-trace" の行の ok:false を ok:true に…'` → `node tests/paradise.test.js` | 門A | 同上(`markDone` が通ってしまう) |
| A-3 | `node -e '…conclave.js の MAX_TRACE_WAIVER = 3 を = Infinity に…'` → `node -e '<AC-3.3 のスクリプト>'` | 門A'(AC-3.3 門) | `BLOCKED@d` が出ず `ALL-WAIVED` / exit 0 になる |
| A-4 | `node -e '…convene の traceSchema: 1 を削る…'` → `node tests/paradise.test.js` | 門A | `assert.strictEqual(run.traceSchema, 1)` が `undefined !== 1` で失敗 |

復旧はいずれも `mv graph/<f>.js.bak graph/<f>.js`。
**破壊試験は必ず `.bak` を取ってから行い、終わったら `git diff --stat graph/` が空であることを確かめる。**

### 門B — 「`contract.js check` の CLI が run 無しで緑を名乗る」を捕らえる

```js
test('spawn trace: contract の CLI は run 無しで証跡を照合したと名乗らない (第37条)', () => {
  const { execFileSync } = require('child_process');   // ★ 実 CLI を子プロセスで起動(AC-8.3)
  const payload = JSON.stringify({ phase:'discover', status:'done', artifact:'CONSTITUTION.md' });
  // (1) run 無し → traceChecked:false
  const a = JSON.parse(execFileSync(process.execPath,
    [path.join(ROOT,'graph','contract.js'),'check'], { input: payload }).toString());
  assert.strictEqual(a.traceChecked, false, 'run 無しの check が照合したと名乗っている');
  // (2) run 付き・証跡ゼロ → accepted:false
  const runPath = <tmp に convene した traceSchema:1 の run>;
  let out, code = 0;
  try { out = execFileSync(process.execPath,
    [path.join(ROOT,'graph','contract.js'),'check','--run',runPath], { input: payload }).toString(); }
  catch (e) { out = e.stdout.toString(); code = e.status; }
  const b = JSON.parse(out);
  assert.strictEqual(b.accepted, false);
  assert.strictEqual(b.verified, 'file-but-unspawned');
  assert.strictEqual(b.traceChecked, true);
  assert.strictEqual(code, 1, 'CLI の exit code が 1 でない');
});
```

**何を壊せば何が鳴るか**

| # | 壊し方(コマンド) | 鳴る門 | 鳴り方 |
|---|---|---|---|
| B-1 | `node -e '…contract.js の CLI から --run の解釈行を消す…'` → `node tests/paradise.test.js` | 門B | (2) で `accepted:true` → `false !== true` で失敗 |
| B-2 | `node -e '…reconcile の戻りから traceChecked を落とす…'` → `node tests/paradise.test.js` | 門B | (1) で `undefined !== false` で失敗 |
| B-3 | `node -e '…exit(rec.accepted?0:1) を exit(0) に…'` → `node tests/paradise.test.js` | 門B | `code !== 1` で失敗 |

### 門A/B に共通の掟

- **どちらの門も `record()` を呼ばない。** これが第50条の直接の門である。
  AC-8.2 の `awk … | grep -c "\.record("` → `0` を構造で満たす。
- 門は `os.tmpdir()` に run を建て、`finally` で消す(既存の門の作法に合わせる)。
- 門A は `convene` を通す — 手で組んだ run を使えば `traceSchema` の欠落に気づけない。

---

## 8. M9 — 数えて語る

### 8.1 `census.js`

```js
// graph/census.js:131 の dashboardGates と**並べて**置く
spawnTraceGates: (() => {
  try {
    const t = fs.readFileSync(path.join(ROOT,'tests','paradise.test.js'),'utf8');
    return (t.match(/^test\('spawn trace: /gm) || []).length;
  } catch { return 0; }
})(),
```
- 実測: 現在 `grep -n "spawn trace" tests/paradise.test.js` → **5本**。門A/B を足せば **7本**。
  AC-9.1 の `>= 7` と整合する。
- `claims()`(:163-181)に README の主張との突合を 1行足す:
  `{ file:'README.md', re:/spawn-trace の門 \*\*(\d+) 本\*\*/, actual:c.spawnTraceGates, label:'README spawn-trace 門数' }`
  → **README にこの一文を書かねば `kind:'missing'` で `check` が赤くなる。**
  build 相は README への追記を忘れてはならない。

**AC-9.1 の書き直し**(census に `--json` は無い — 実測 `node graph/census.js --json` → `usage: census.js [show|check|fix]`):

```
$ node -e 'const c=require("./graph/census.js");
  const x=c.census({noTests:true}); process.exit(x.spawnTraceGates>=7?0:1)'
```
`census` が export されていることは design 相が実測で確認済み:

```
$ grep -n "^module.exports" graph/census.js
339:module.exports = { census, check, fix, claims, dietChecks, harnessDietChecks,
                      summaryOf, CLAUDE_MD_BUDGET, GLOBAL_CLAUDE_MD_BUDGET, ALWAYS_ON_RULES_BUDGET };
```

ゆえに上の `node -e` 版 AC-9.1 はそのまま打てる。CLI に `--json` を足す必要はない。

### 8.2 `pulse.js` / dashboard

- `readSpawn`(:238-241)の戻りに `waived, legacy, clean` を足す。
  **`total<=0` の防御(:230-237)は 1行も変えない**(§4.2 #6)。
- `dashboard/paradise.js:317-319` の 3行に 2行足し、:325-327 の属性に 2つ足す。
  **属性を足す位置は `data-spawn-notrace` より手前**(§4.2 #4 の 400文字窓)。

---

## 9. build 相への申し送り(design が決めていないこと・危ういこと)

1. **AC の `jq` 依存 5本の書き直しは §6 の型を全 AC に機械適用すること。**
   `jq -e '<式>'` → `node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);process.exit(<式>?0:1)})'`。
   ファイルを読む形(`jq -e '.traceSchema==1' f.json`)は
   `node -e 'process.exit(require("f.json").traceSchema===1?0:1)'` で足りる。
2. **AC-1.2 の `entries | all(.childLog != null)` は `--source claude-jsonl` 前提**である(§3.4)。
   系統II の項は `childLog:null` を持つ。build 相は AC を `--source` 付きで打つこと。
3. **`report()` に引数型チェックを足してはならない**(§4.2 #6)。足せば D-3 故障注入門が赤くなる。
4. **`dashboard-run-panel.test.js:95` の 400文字窓**(§4.2 #4)は実際に走らせて確かめること。
5. ~~`census.js` の `module.exports`~~ — **解決済み**(§8.1 で実測)。申し送り不要。
6. **`MAX_TRACE_WAIVER=3` / 理由 20文字に実測の根拠は無い**(requirements.md:617-621 の通り)。
   運用後に §8 の数で改めるべき値である(第38条)。
7. **系統I が Paradise の相に当たる日が来たときの検証を design 相は行えていない。**
   本機の 7件はすべて非 Paradise の発令である(§0.1)。
   規則(§3.3 A-1)は系統II の実データでのみ検証済み。系統I での成立は**未実測**である。
8. **`node:sqlite` の `ExperimentalWarning` が将来 API 変更を伴う可能性**は残る。
   採取器は §3.1 の通り `unavailable` を名乗る道を持つが、その経路は**未実測**である。

---

## 10. やらないこと(この設計が明示的に範囲外とすること)

requirements.md §4 の非目標 8件をすべて引き継ぐ。design 相が**追加で**決めた非目標:

1. **`npm` 依存を 1つも足さない。** sqlite は `node:sqlite`(組込み)のみ。
   `better-sqlite3` 等を入れる道は採らない(§3.1)。
2. **`report()` / `verify()` の引数型検査を足さない。** 現在の「文字列を渡すと静かに total:0」は
   `pulse.readSpawn` が測る対象であり、故障注入門の前提である(§4.2 #6)。
3. **時刻窓・役割名による自動 `observed` を実装しない。** `suggestions[]` に出すだけ(§3.3 階梯B)。
   requirements N2 の通り nice-to-have に留める。
4. **`markRunning` からの採取器自動起動を行わない**(requirements N1)。人が `apply` を打つ。
5. **キャッシュ・増分走査を実装しない**(非目標8)。8,849行の全走査で足りる。
6. **憲法本文(第27条)を書き換えない**(非目標2 / N3)。engine のコメントだけを実測に合わせる。
7. **`~/.claude` へ書かない。** `fs.writeFileSync` を採取器に import しない(非目標1)。
8. **legacy run を遡って緑にしない。** `apply --force` を人が打った時のみ(§3.5 / M7)。
9. **`spawn-ledger.json` を見ない**(非目標7)。
10. **`next`/`complete` 側に門を置かない**(非目標5)。判定は `markDone` 一点に集める。

---

## 11. 現状(RED)の再確認 — design 相が実際に打った

```
$ echo '{"phase":"discover","status":"done","artifact":"CONSTITUTION.md"}' | node graph/contract.js check | node -e '…'
traceChecked= undefined  accepted= true  verified= file            ← AC-6.1 RED

$ node graph/spawn-trace.js report reform/dashboard-living-gate/conclave.json
phases: 11   observed: 0   asserted-only: 0   no-trace: 11         ← AC-7.2 RED(legacy を赤と呼んでいる)

$ node -e '<AC-2.1 のスクリプト>'
ACCEPTED                                                            ← AC-2.1 RED

$ node graph/conclave.js convene …forge.dag.json --run "$LOCALAPPDATA/Temp/ac-probe.json"; echo $?
0
$ node -e '…' → traceSchema= undefined  phases= 11                  ← AC-7.3 RED

$ ls graph/trace-harvest.js
(不在)                                                              ← AC-1.1/1.2/1.3 RED

$ grep -c "^test(" tests/paradise.test.js
282                                                                 ← AC-8.1 RED(284 未満)

$ grep -c "唯一確実" graph/spawn-trace.js
1                                                                   ← AC-5.1 RED
```

**訂正2 に従い `--out` ではなく `--run` で実際に打ち、通ることを確かめた上で RED を宣言している。**

---

## 12. 本相の証跡(第16条 — 実装していないことの証明)

```
$ git diff --stat graph/ tests/
(空)
```
(実出力は報告文に貼る)
