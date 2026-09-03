# spawn-trace 証跡強制 — discovery 相 findings

- **道**: `reform/spawn-trace-by-the-road` (worktree: `C:/Users/kikus/AppData/Local/Temp/pd-trace`)
- **神託**: 「spawn-trace の証跡欠落 — 記録を呼ばなくても環が回りきる構造の穴」
- **相**: discover / 神官: market-researcher
- **掟**: 主張は証拠ではない。以下すべての節に生のコマンド出力を貼る。実装は一切していない。

---

## 0. 結論(先に述べる)

| # | 問い | 実測の答え |
|---|---|---|
| 1 | production で `record` を呼ぶ箇所は? | **ゼロ**。呼び手は自分自身の CLI と門だけ |
| 1b | conclave は trace を見るか? | **見ない**。`conclave.js` は `spawn-trace` を一度も require しない(実測 0箇所) |
| 1c | `contract.js` に `opts.run` を渡す呼び手は? | **門(テスト)の中にしか実在しない**。production ゼロ |
| 1d | `contract.js` の CLI `check` は run を受け取れるか? | **受け取れない**。CLI 経由の照合は必ず trace を素通りする |
| 2 | spawn-trace を試す門は何本か | **5本**。だが「record を呼ばずに complete まで回れる」を試す門は **0本**(第50条の実例) |
| 3 | 機械が観測できる証跡は実在するか | **実在する。ただし憲法が名指しした `parent_tool_use_id` は実測 0件** — 別名の鎖が実在する |
| 4 | 塞ぐ道 | 4案を列挙。**engine の独断は第45条/第51条bの同型の病**を生むため、明示的棄権路が必須 |

**最重要の訂正**: 憲法 第27条と `spawn-trace.js:48-49` は
`parent_tool_use_id` を「唯一確実な手段」と名指すが、**実機のログにその名の
フィールドは1件も存在しない**(8,986行走査して 0件)。
代わりに `toolUseResult.agentId` → `subagents/agent-<id>.jsonl` の鎖が
**7/7 で成立する**。証跡は在るが、**憲法が書いた名では在らない**。

---

## 1. 穴の実測 — 誰も record を呼ばない

### 1.1 production に呼び手はゼロ

```
$ grep -rn "record(" graph/ dashboard/ tools/ | grep -i "trace\|spawn"
graph/spawn-trace.js:41:function record(run, phase, evidence = {}) {
graph/spawn-trace.js:116:    const e = record(run, phase, {
```

出た2行は **定義そのもの(41行)と自分自身の CLI 分岐(116行)** である。
`graph/` `dashboard/` `tools/` のどこからも `record` は呼ばれていない。

リポジトリ全体では:

```
$ grep -rn "\.record(" --include=*.js . | grep -v node_modules
./tests/paradise.test.js:1298:    identity.record('run' + i, top.id, { history: hf });   ← 別 engine(identity)
./tests/paradise.test.js:2252:    trace.record(run, 'discover', { agent: 'market-researcher' });
./tests/paradise.test.js:2268:    trace.record(run, 'discover', { agent: 'market-researcher', toolUseId: 'toolu_01ABC', rank: 'priest' });
./tests/paradise.test.js:2278:  trace.record(run, 'a', { agent: 'x', toolUseId: 'toolu_1' });
./tests/paradise.test.js:2279:  trace.record(run, 'b', { agent: 'y' });
./tests/paradise.test.js:2807:    g2.record(before, 'demo-before');                      ← 別 engine(gauge)
```

**`trace.record` の呼び手は門の中にしか居ない。** 実際の走行では一度も呼ばれない。

### 1.2 conclave は trace を見ない

```
$ grep -c "spawn-trace" graph/conclave.js
0
```

```
$ grep -rn "require.*spawn-trace" --include=*.js . | grep -v node_modules
./graph/contract.js:74:    const trace = require('./spawn-trace.js');
./graph/pulse.js:48:const spawnTrace = require('./spawn-trace.js');
./tests/dashboard-run-panel.test.js:21:const spawnTrace = require(path.join(ROOT, 'graph', 'spawn-trace.js'));
./tests/paradise.test.js:2246,2262,2276
```

`spawn-trace` を require するのは **`contract.js`(条件付き)と `pulse.js`(表示専用)だけ**。
環を回す `conclave.js` は名前すら知らない。ゆえに `markRunning` / `markDone` /
`next` / `ratify` の**どれ一つとして trace を見ない**。

`markDone` は第22条により成果物の実在は検める(`conclave.js:282-299`)が、
起動証跡は検めない:

```js
function markDone(run, id, artifactPath) {
  const p = allPhases(run).get(id);
  if (!p) throw new Error('unknown phase: ' + id);
  if (artifactPath) {
    ...
    if (!fs.existsSync(abs)) { throw new Error(`成果物が実在しない: ...`); }
  }
  p.status = 'done'; ...          // ← trace への言及は一行も無い
}
```

### 1.3 環は record を呼ばずに complete まで回りきる(再現実測)

`reform/spawn-trace-by-the-road/probe5.js` を書いて実測した
(**engine は一切変更していない。読むだけの再現である**):

```
$ node reform/spawn-trace-by-the-road/probe5.js
STEP 1: markRunning+markDone discover  (record 未呼出)
STEP 2: ratify discovery
STEP 3: markRunning+markDone verdict  (record 未呼出)
STEP 4: ratify tribunal
STEP 5: complete → "All domains ratified — counsel delivered (諮問は創造物を産まない。根拠と共に献じよ)。"

--- 走行終了後の spawnTrace ---
run.spawnTrace = undefined
report: {"ok":false,"total":2,"observed":0,"noTrace":2}

結論: markDone も next も ratify も trace を一切見ない。
      環は 5 ステップで complete に到達し、証跡は 2 / 2 が no-trace のまま。
```

**`run.spawnTrace` は `undefined` のまま complete に到達する。**
第27条(d)「観測できないものを done と呼ばない」が、環の側から一度も参照されていない。

### 1.4 実走行の傷跡

```
$ node graph/spawn-trace.js report reform/dashboard-living-gate/conclave.json
═══════ 👁  SPAWN TRACE ═══════
phases: 11   observed: 0   asserted-only: 0   no-trace: 11
  🔴 discover     この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない
  🔴 specify      この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない
  🔴 design       この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない
  🔴 build        この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない
  🔴 prove        この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない
  🔴 review       この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない
  🔴 security     この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない
  🔴 docs         この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない
  🔴 verify       この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない
  🔴 reflect      この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない
  🔴 verdict      この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない
───────────────────────────────
11 phase(s) bypassed the hierarchy — the ladder was declared but not walked
═══════════════════════════════
exit=1
```

神託の数字(phases: 11 / observed: 0 / no-trace: 11)を**実物で確認した**。

本 reform の走行は 1相だけ証跡を持つ:

```
$ node graph/spawn-trace.js report reform/spawn-trace-by-the-road/conclave.json
phases: 11   observed: 1   asserted-only: 0   no-trace: 10
  ✓ discover     1 件の起動を観測: market-researcher
  🔴 specify      この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない
  （以下 9相 同文）
10 phase(s) bypassed the hierarchy — the ladder was declared but not walked
exit=1
```

discover に印が在るのは、**この走行で人が手で `record` を打ったから**であり、
engine が刻んだのではない。1.1 の grep が示す通り engine に呼び手は無い。

### 1.5 contract.js の `opts.run` — 渡す呼び手は production に実在しない

`contract.js:73-82` が trace を見るのは `opts.run` が渡された時**だけ**:

```js
  if (opts.run) {
    const trace = require('./spawn-trace.js');
    const t = trace.verify(opts.run, result.phase);
    if (!t.ok) {
      return { accepted: false, verified: 'file-but-unspawned', size, ... };
    }
    ...
  }
  return { accepted: true, reason: `artifact verified (${size}b): ${art}`, verified: 'file', size };
```

`{ run }` を渡す呼び手の全数:

```
$ grep -rn "reconcile\|checkPayload" --include=*.js . | grep -v node_modules | grep "{ run }"
./tests/paradise.test.js:2237:    const r = contract.reconcile(result, { run });
./tests/paradise.test.js:2253:    const r = contract.reconcile({ phase: 'discover', status: 'done', artifact: art }, { run });
./tests/paradise.test.js:2269:    const r = contract.reconcile({ phase: 'discover', status: 'done', artifact: art }, { run });
```

**3箇所すべて門の中**。production コードから `opts.run` を渡す者は一人も居ない。
第27条(c)「reconciliation of a phase consults the trace」は、**条文としては実装されているが、
その分岐に入る実行経路が現実に存在しない**。

### 1.6 CLI `check` は run を受け取れない — 素通りが構造的に確定している

`contract.js:124-132` の CLI:

```js
  if (cmd === 'check') {
    let d = ''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => {
      const rec = checkPayload(d);          // ← opts を渡す口が無い
      ...
```

`checkPayload(d)` は第2引数 `opts` を**渡していない**。ゆえに `opts.run` は常に undefined。
実測:

```
$ echo '{"phase":"discover","status":"done","artifact":"CONSTITUTION.md"}' | node graph/contract.js check
{
  "accepted": true,
  "reason": "artifact verified (77506b): CONSTITUTION.md",
  "verified": "file",
  "size": 77506
}
exit=0
```

**`discover` 相の証跡を一切持たない状態で `accepted: true` が返る。**
`verified` は `"file"` であり `"file+spawn"` ではない。
CLI に run を渡す引数が無い以上、**CLI 経由の照合は 100% trace を素通りする**。

---

## 2. 門の射程 — 5本在るが、穴そのものを試す門は 0本

### 2.1 spawn-trace を試す門の全数

```
$ grep -c "^test(" tests/paradise.test.js
282

$ grep -n "^test('spawn trace" tests/paradise.test.js
2227:test('spawn trace: an artifact with no observed dispatch is rejected (Art.27)', () => {
2243:test('spawn trace: a bare claim of dispatch is not evidence (Art.27/Art.5)', () => {
2260:test('spawn trace: an observed dispatch is accepted (Art.27)', () => {
2275:test('spawn trace: the report names which phases bypassed the hierarchy (Art.27)', () => {
2290:test('spawn trace: reconciliation without a run keeps working (backward compatible)', () => {
```

**282本中5本**が spawn-trace を試す。

### 2.2 5本すべてが「record を呼んだ後」しか見ていない

5本の共通構造(`tests/paradise.test.js:2227-2302`)。
run は**その場で手作りしたリテラル**であり、conclave が回した実物ではない:

```js
2236:    const run = { domains: [{ phases: [{ id: 'discover' }] }] };
2237:    const r = contract.reconcile(result, { run });          // ← 門が自分で opts.run を渡している
...
2251:    const run = { domains: [{ phases: [{ id: 'discover' }] }] };
2252:    trace.record(run, 'discover', { agent: 'market-researcher' });   // ← 門が自分で record を呼ぶ
...
2277:  const run = { domains: [{ phases: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }] };
2278:  trace.record(run, 'a', { agent: 'x', toolUseId: 'toolu_1' });
2279:  trace.record(run, 'b', { agent: 'y' });                    // 自己申告のみ
```

**門は `record` と `opts.run` を自分の手で供給している。**
すなわち門が試しているのは「record を呼んだなら verify が正しく三値を返すか」であり、
「**record が呼ばれないまま環が回りきってしまうこと**」は一本も試していない。

### 2.3 結合を試す門はゼロ

```
$ grep -n "conclave" tests/paradise.test.js | grep -i "trace"
(空)
```

`conclave` と `trace` を同時に登場させる門は **1本も無い**。
1.3 で再現した「complete まで回っても `run.spawnTrace === undefined`」という事象を
捕らえる門は存在しない。

### 2.4 壊して鳴らす検査(第21条)— 何が鳴り、何が鳴らないか

`record` を無効化(`return { phase, kind:'observed', SABOTAGED:true }` を関数冒頭に挿入)して
門を走らせた。**検査後に `cp` で復元し、`git diff --stat` が空であることを確認済み**:

```
$ node -e "...(spawn-trace の中核2本を抽出して実行)..."
  FAIL asserted-only は通ってはならない — Expected values to be strictly equal:
+ actual - expected
+ 'no-trace'
- 'asserted-only'

  FAIL report が bypass を名指す — Expected values to be strictly equal:
0 !== 1

pass=0 fail=2
```

```
$ git diff --stat graph/spawn-trace.js
(空 = 復元完了)
```

**判定**: `record` 本体を壊せば 5本の門は鳴る。engine の内部仕様は守られている。
**しかし** 1.3 が示す「誰も record を呼ばない」という欠陥は、
**5本すべてが門自身の手で record を呼ぶ設計になっているため、絶対に鳴らない**。

> これが**第50条の実例**である。
> 「門が見ない機能は壊れても鳴らない」。門の視野は `record` の**内部**に限られ、
> `record` が**呼ばれるか否か**という配線そのものが視野の外にある。
> 第50条(a)「黙秘は放棄と同じ意味を持つ」— 呼ばれない関数は、無い関数と同じ結果を生む。

---

## 3. 証跡の出所は実在するか(最重要)

**憲法 第27条が名指した `parent_tool_use_id` は実在しない。別名の鎖が実在する。**

### 3.1 走査対象

```
$ find ~/.claude/projects -name '*.jsonl' | wc -l
29
$ ls ~/.claude/projects/
C--Users-kikus
C--Users-kikus-Documents-ClaudeWorkspace
C--Users-kikus-Documents-workspace-majingai
```

### 3.2 実測1 — `parentToolUseId` は 0件、`Task`/`Agent` の tool_use は 7件

`probe.js`(node で走査。MSYS パスは使わず `C:/Users/...` を渡した):

```
$ node reform/spawn-trace-by-the-road/probe.js
files scanned          : 29
jsonl lines            : 8986
tool_use Task/Agent    : 7
lines w/ parentToolUseID: 0

--- top-level keys present in jsonl records ---
agentId, aiTitle, atis, attachment, attributionAgent, attributionMcpServer,
attributionMcpTool, attributionSkill, bridgeSessionId, classifierMetaLines,
compactMetadata, content, customTitle, cwd, durationMs, effort, entrypoint,
gitBranch, hasOutput, hasUnknownModelCost, hookAdditionalContext, hookCount,
hookErrors, hookInfos, interruptedByShutdown, isApiErrorMessage, isCompactSummary,
isMeta, isSidechain, isSnapshotUpdate, isVisibleInTranscriptOnly, lastPrompt,
lastSequenceNum, leafUuid, level, logicalParentUuid, message, messageCount,
messageId, mode, modelUsage, operation, origin, ownerAccountUuid,
ownerOrganizationUuid, parentUuid, permissionMode, prNumber, prRepository, prUrl,
preventedContinuation, promptId, promptSource, queueSkipAttachments, reason,
requestId, sessionId, session_id, slug, snapshot, sourceToolAssistantUUID,
sourceToolUseID, startTime, stopReason, subtype, timestamp, toolDenialKind,
toolUseID, toolUseResult, totalAPIDuration, totalAPIDurationWithoutRetries,
totalCostUSD, totalDuration, totalLinesAdded, totalLinesRemoved, totalToolDuration,
turnCompanion, type, userType, uuid, version

--- Task tool_use samples (max 5) ---
[
  { "file": "2e6f77a5-....jsonl", "name": "Agent",
    "id": "toolu_01KGZvkNFAC8cT9zEomQ9XoY", "subagent_type": "cardinal",
    "desc": "Query cardinal agent for model ID" },
  { "file": "9a31809e-....jsonl", "name": "Agent",
    "id": "toolu_01XEb8JkVzcjkgCmdRdTM5pP", "subagent_type": "data-collector",
    "desc": "Ask subagent for model id" },
  { "file": "f4fe2270-....jsonl", "name": "Agent",
    "id": "toolu_012QiTNbwXaLCzvvSsHauXrf", "subagent_type": "Plan",
    "desc": "Design Tokai Kisen monitor architecture" },
  ...
]

--- parentToolUseID samples (max 3) ---
[]
```

**確定した事実:**
- `tool_use.name in ("Task","Agent")` は **実在する(7件)**。すべて `name: "Agent"`。
  `subagent_type` も入っている(`cardinal`, `data-collector`, `Plan`, `local-llm`)。
- **`parentToolUseId` / `parentToolUseID` を持つ行は 8,986行中 0件**。
  キー一覧にもその名は無い。**憲法 第27条が「唯一確実」と呼んだ鍵は、実機に存在しない。**
- ただしキー一覧には `sourceToolUseID` / `agentId` / `isSidechain` / `toolUseResult` が在る。

### 3.3 実測2 — 子ログは実在するが `sourceToolUseID` では繋がらない

```
$ node reform/spawn-trace-by-the-road/probe2.js
親ログ: 22  子ログ(subagents/): 7

=== 子ログ先頭レコードの連結フィールド ===
agent-ab95212a8c0244d28.jsonl → {"type":"user","agentId":"ab95212a8c0244d28","isSidechain":true,"sessionId":"2e6f77a5-913c...","parentUuid":null}
   行数 2  sourceToolUseID を持つ行: 0
agent-a47ff19939f65c691.jsonl → {"type":"user","agentId":"a47ff19939f65c691","isSidechain":true,"sessionId":"9a31809e-...","parentUuid":null}
   行数 3  sourceToolUseID を持つ行: 0
agent-a2f27d75ddc3e2013.jsonl → {"type":"user","agentId":"a2f27d75ddc3e2013","isSidechain":true,...}
   行数 50  sourceToolUseID を持つ行: 0
（以下 4件 同様）

=== 親の Agent tool_use id ↔ 子ログの sourceToolUseID 突合 ===
親側 tool_use id 総数: 7
突合成立: 0 件

=== 親ログ中の agentId 出現 ===
(空 — トップレベルの agentId フィールドとしては親に無い)
```

**子ログは `~/.claude/projects/<proj>/<sessionId>/subagents/agent-<agentId>.jsonl` に実在する。**
`isSidechain: true` を名乗る。しかし `sourceToolUseID` は子側に 0件で、この経路では繋がらない。

### 3.4 実測3 — 鎖は `toolUseResult.agentId` に在った

親側の `tool_result` に付随する `toolUseResult` を開いた:

```
$ node reform/spawn-trace-by-the-road/probe3.js
=== A) 子の agentId が親ログの生テキストに出現するか ===
agentId=ab95212a8c0244d28  親=2e6f77a5-3b40-4319-8af5-ab312d231434.jsonl  生テキスト内に出現: YES ✓
agentId=a47ff19939f65c691  親=9a31809e-b761-4195-a277-c5f63be394fa.jsonl  生テキスト内に出現: YES ✓
agentId=a2f27d75ddc3e2013  親=f4fe2270-31a2-4136-a3bf-e57a9917ba1a.jsonl  生テキスト内に出現: YES ✓
agentId=a3da278625a119fdc  親=f4fe2270-31a2-4136-a3bf-e57a9917ba1a.jsonl  生テキスト内に出現: YES ✓
agentId=a5658ace5fe4ae433  親=f4fe2270-31a2-4136-a3bf-e57a9917ba1a.jsonl  生テキスト内に出現: YES ✓
agentId=a8cc9e27ac8de2b3b  親=5dd8da76-ef81-41f2-bb6e-1793698bdc5a.jsonl  生テキスト内に出現: YES ✓
agentId=adb44e0bf18b0ad9b  親=5dd8da76-ef81-41f2-bb6e-1793698bdc5a.jsonl  生テキスト内に出現: YES ✓

=== B) Agent tool_use と、その tool_result の実体 ===
  tool_use toolu_01KGZvkNFAC8cT9zEomQ9XoY (subagent_type=cardinal) @ 2026-08-31T12:49:11.020Z
    result キー: tool_use_id,type,content
    toolUseResult キー: isAsync,status,agentId,description,resolvedModel,prompt,outputFile,canReadOutputFile
    content 先頭120: [{"type":"text","text":"Async agent launched successfully. (This tool result is internal metadata — never quote or paste

  tool_use toolu_01XEb8JkVzcjkgCmdRdTM5pP (subagent_type=data-collector) @ 2026-08-31T12:48:47.107Z
    result キー: tool_use_id,type,content
    toolUseResult キー: status,prompt,agentId,agentType,harnessNoteCount,harnessTailCount,harnessSectionHash,content,resolvedModel,totalDurationMs,totalTokens,totalToolUseCount,usage
    content 先頭120: [{"type":"text","text":"claude-haiku-4-5-20251001"},{"type":"text","text":"agentId: a47ff19939f65c691 (use SendMessage w
```

### 3.5 実測4 — 完全鎖が 7/7 で成立する(決定的証拠)

```
$ node reform/spawn-trace-by-the-road/probe4.js
=== 親 tool_use.id → toolUseResult.agentId → 子ログ実体 の完全鎖 ===
┌─────────┬──────────────────────────────────┬─────────────────────┬──────────────────┬──────────────────┬─────────┬──────────┬────────────┬────────────────────────────┐
│ (index) │ toolUseId                        │ agentId             │ subagent_type    │ status           │ isAsync │ childLog │ childBytes │ at                         │
├─────────┼──────────────────────────────────┼─────────────────────┼──────────────────┼──────────────────┼─────────┼──────────┼────────────┼────────────────────────────┤
│ 0       │ 'toolu_01KGZvkNFAC8cT9zEomQ9XoY' │ 'ab95212a8c0244d28' │ 'cardinal'       │ 'async_launched' │ true    │ '実在 ✓' │ 1766       │ '2026-08-31T12:49:11.020Z' │
│ 1       │ 'toolu_01XEb8JkVzcjkgCmdRdTM5pP' │ 'a47ff19939f65c691' │ 'data-collector' │ 'completed'      │ false   │ '実在 ✓' │ 3923       │ '2026-08-31T12:48:47.107Z' │
│ 2       │ 'toolu_012QiTNbwXaLCzvvSsHauXrf' │ 'a3da278625a119fdc' │ 'Plan'           │ 'completed'      │ false   │ '実在 ✓' │ 103314     │ '2026-07-21T12:01:37.471Z' │
│ 3       │ 'toolu_014EcXDU7NH4kbrSBAUELvRb' │ 'a5658ace5fe4ae433' │ 'Plan'           │ 'completed'      │ false   │ '実在 ✓' │ 241960     │ '2026-07-22T14:38:47.232Z' │
│ 4       │ 'toolu_011vUYjXHubbiJ3SBZVnRrAY' │ 'a2f27d75ddc3e2013' │ 'Plan'           │ 'async_launched' │ true    │ '実在 ✓' │ 285058     │ '2026-07-28T23:25:49.190Z' │
│ 5       │ 'toolu_0141ttVVq5SUYAg94nBfpMv7' │ 'adb44e0bf18b0ad9b' │ 'local-llm'      │ 'completed'      │ false   │ '実在 ✓' │ 13169      │ '2026-08-26T14:46:28.609Z' │
│ 6       │ 'toolu_013e2mVABfhhHSju54hWwr59' │ 'a8cc9e27ac8de2b3b' │ 'local-llm'      │ 'completed'      │ false   │ '実在 ✓' │ 28329      │ '2026-08-26T14:48:23.327Z' │
└─────────┴──────────────────────────────────┴─────────────────────┴──────────────────┴──────────────────┴─────────┴──────────┴────────────┴────────────────────────────┘
鎖の総数: 7  子ログが実在: 7
```

**機械が観測できる証跡は実在する。** 鎖は次の形である:

```
親ログ  message.content[].tool_use  { name:"Agent", id:"toolu_...", input.subagent_type }
   ↓  同じ tool_use_id の tool_result 行に付く
親ログ  toolUseResult { agentId, status, agentType, resolvedModel, totalDurationMs, totalTokens }
   ↓  agentId でファイル名が決まる
子ログ  <proj>/<sessionId>/subagents/agent-<agentId>.jsonl   ( isSidechain:true )
```

7件すべてで子ログのファイルが実在し、バイト数も非ゼロ。
**`status` が `completed` / `async_launched` で観測でき、`totalDurationMs` `totalTokens` まで残る。**

### 3.6 Hermes 側 — delegate_task も証跡になりうる

`~/AppData/Local/hermes/state.db` に `async_delegations` テーブルが実在する:

```
$ python -c "..." (sqlite3 で state.db を開く)
=== async_delegations schema ===
CREATE TABLE async_delegations (
    delegation_id TEXT PRIMARY KEY,
    origin_session TEXT NOT NULL,
    origin_ui_session_id TEXT NOT NULL DEFAULT '',
    parent_session_id TEXT,
    state TEXT NOT NULL,
    dispatched_at REAL NOT NULL,
    completed_at REAL,
    updated_at REAL NOT NULL,
    event_json TEXT,
    result_json TEXT,
    delivery_state TEXT NOT NULL DEFAULT 'pending',
    delivery_attempts INTEGER NOT NULL DEFAULT 0,
    delivered_at REAL,
    owner_pid INTEGER,
    owner_started_at INTEGER,
    task_json TEXT,
    delivery_claim TEXT,
    delivery_claimed_at REAL
, origin_session_id TEXT)

=== async_delegations row count ===
51

=== state 別集計 ===
('completed', 49)
('error', 1)
('running', 1)

=== sessions で parent_session_id が非NULLな行数 ===
83 / 111
```

実例(Paradise の discover 相の発令が現に残っている):

```
{
 "delegation_id": "deleg_aecff7bf",
 "origin_session": "agent:main:discord:thread:1543748898131022026:...",
 "parent_session_id": "20260831_072700_3165f70b",
 "state": "completed",
 "dispatched_at": "1788128881.4920151",
 "completed_at": "1788129109.2633896",
 "task_json": "{\"goal\": \"Paradiseの創造物「習慣トラッカー」の discover フェ...",
 "result_json": "{\"results\": [{\"task_index\": 0, \"status\": \"completed\", \"summary\": \"Discover フェーズ完了。..."
}
```

`event_json` のキー:

```
event_json keys: ['type', 'delegation_id', 'session_key', 'origin_ui_session_id',
 'origin_session_id', 'parent_session_id', 'goal', 'goals', 'context', 'toolsets',
 'role', 'model', 'status', 'is_batch', 'results', 'live_transcripts', 'error',
 'total_duration_seconds', 'dispatched_at', 'completed_at']
```

**`role` と `model` と `total_duration_seconds` まで残る。** これは十分な証跡である。

なお `~/AppData/Local/hermes/spawn-ledger.json` は**無関係**であった
(gateway プロセスの台帳であり、subagent とは関係しない):

```
$ head -c 3000 ~/AppData/Local/hermes/spawn-ledger.json
[
  { "pid": 28316, "create_time": 1788361666.9259715, "purpose": "serve",
    "install": "46c87e694ab7", "spawner_pid": 33064, ...
    "argv": "...\\hermes_cli\\main.py serve --host 127.0.0.1 --port 0" }
]
```

### 3.7 証跡の実在について — 正直な総括

| 主張 | 実測 | 判定 |
|---|---|---|
| `tool_use.name in ("Task","Agent")` が記録される | 7件検出、`name:"Agent"` | **実在する ✓** |
| 子メッセージが `parent_tool_use_id` を持つ | **8,986行中 0件** | **実在しない ✗** |
| 子の走行ログが実在する | `subagents/agent-<id>.jsonl` が 7/7 実在 | **実在する ✓** |
| 親→子を機械で辿れる | `toolUseResult.agentId` 経由で 7/7 成立 | **実在する ✓(別名)** |
| Hermes の delegate が証跡を残す | `async_delegations` 51行、`parent_session_id` 83/111 | **実在する ✓** |

**憲法 第27条と `spawn-trace.js:12-14` のコメントは、実機に存在しないフィールド名を
「唯一確実な手段」として引用している。** 引用元(Claude Agent SDK docs)が正しくとも、
**この機体のログ形式はその名を使っていない**。第16条「測っていないものを緑と呼ばない」に
従うなら、**`parentToolUseId` を必須とする門を建ててはならない** — 永久に赤になるからである。

同時に、**「証跡が無いから観測不能」ではない。** 別名の鎖が 7/7 で実測できた以上、
**観測は可能である**。ただし engine が見るべき鍵は `parentToolUseId` ではなく
**`toolUseResult.agentId` + 子ログの実在**である。

**限界の明記(捏造を避けるため)**:
- 走査できたのは **この機体の 29ファイル / 8,986行のみ**。
  他機・他バージョンで `parentToolUseId` が出る可能性は否定していない。
- 検出できた Agent 起動は **7件のみ**で、すべて Paradise の 11相走行**ではない**
  (`cardinal`, `data-collector`, `Plan`, `local-llm`)。
  **Paradise の相を dispatch した記録は、`~/.claude` 側には 1件も見つからなかった。**
  Paradise の相の発令は Hermes 側(`async_delegations`)に残っている(3.6 の `deleg_aecff7bf`)。
- ゆえに **証跡の出所は2系統に分かれている**。engine が片方だけを見れば、
  もう片方で走った相は永久に no-trace になる。

---

## 4. 設計の選択肢 — 「記録を呼ばなくても回りきる」を塞ぐ道

前提として第45条・第51条(b)の戒めを置く:

> 第45条: **発令する者は走る者ではない。同じ鍵を渡すな。**
>   「締め出す相手が、自分が呼んだ者であることに、機構は気づかない。」
> 第51条(b): **判定できない印を engine が独断で剥がせば、二重発令という新しい病を生む。
>   判定不能なときは、engine は手を出さず人に問え(`--force` を要求せよ)。**

すなわち **「証跡が無い ⇒ 即 done を拒む」を無条件に実装すると、
3.7 で示した「証跡の出所が2系統に分かれている」現実に engine が気づけず、
正しく発令された相まで締め出す**。これは第45条の同型の病である。

### (a) `markDone` が trace を要求する(第22条 markDone の実在検査と同型)

`conclave.js:282` の `markDone` に、成果物実在検査(第22条)と並べて証跡検査を置く。

- **長所**
  - 第22条の実装と**完全に同型**であり、条文・engine・門の対応が読み手に自明。
    「成果物が実在せねば done にできない」の隣に「証跡が実在せねば done にできない」が並ぶ。
  - `markDone` は done への**唯一の門**(`conclave.js:393` の CLI `done` も同じ関数を通る)。
    ここを塞げば **CLI 経由も module 経由も同時に塞がる**。1.6 で暴いた
    「CLI が opts を渡せないから素通りする」欠陥を構造的に回避できる。
  - 1.3 の再現(`run.spawnTrace === undefined` のまま complete)が**その場で例外になる**。
- **短所**
  - **既存の全走行が即座に壊れる。** 1.4 の実測通り既存 run は 11/11 が no-trace。
    移行措置なしに入れれば、`resume` も `ratify` も動かなくなる。
  - 第45条の病を最も踏みやすい。教主が正しく発令しても、
    その発令が Hermes 側に残り engine が `~/.claude` 側しか見なければ、
    **engine は自分が呼んだ者を締め出す**。
  - `markDone` は純粋関数に近く保たれている。ここに I/O(ログ走査)を持ち込むと
    テスト容易性が落ちる。→ **証跡は `run.spawnTrace` から読むに留め、
    ログ走査は別 engine(採取器)に分離すべき**。

### (b) `next` / `complete` の結びが no-trace を許さない

`conclave.js:121-134` の `complete` 分岐で `trace.report(run)` を呼び、
`noTrace > 0` なら `complete` を名乗らせない(`level:'conclave', phase:'incomplete-trace'` 等)。

- **長所**
  - **相単位ではなく走行単位**で裁くので、途中の相を止めない。
    走者は最後まで走れ、結びの言葉だけが変わる。移行の衝撃が (a) より遥かに小さい。
  - 「11相回りきって complete」という**神託が名指した事象そのもの**を直接塞ぐ。
  - `next` は既に「道の性質で結びの言を変える」責務を持つ(`conclave.js:114-128`)。
    結びの条件を増やすのは**既存の設計思想に沿う**。
  - 第16条を守りやすい。`report` の三値をそのまま結びに出せば
    「測れなかった」と「赤だった」を区別して名乗れる。
- **短所**
  - **遅い。** 11相すべて走り終えてから「証跡が無い」と言われる。
    第44条「沈黙する番人は壊れた番人より見つかりにくい」の裏返しで、
    **早期に鳴らない門は、鳴った時には手遅れ**である。
  - `next` は現在**純粋(state を書かない)**であることを明示的な契約としている
    (`conclave.js:109-112`「既定の next は state を一切書かない(純粋である)。
    書くのは呼び手の markRunning だけ — この契約に既存の門が依存している」)。
    ここに判定を足すのは純粋性は壊さないが、**呼ぶたびに report が走る**ため
    `next` の計算量が相数に比例する。
  - complete を拒んだ後の**出口が無い**と環が静止する。第51条(a)
    「静止は失敗より悪い」に直行する。**(c) の棄権路が必須の前提条件**になる。

### (c) 判定不能な場合の明示的棄権(`--no-trace-reason`)

`markDone` / `ratify` に `--no-trace-reason "<理由>"` を受け、
`run.spawnTrace[phase]` に `kind: 'waived'` の項を刻む。

- **長所**
  - **第51条(b)の直接の実装**。「判定不能なときは engine は手を出さず人に問え」。
    `--force` を要求する `resume` と**同型**であり、楽園に既に前例がある。
  - 3.7 で示した「証跡の出所が2系統」という**現実の不確実性を engine が認める**形。
    engine が知らない経路で発令された相を、人が理由付きで通せる。
  - **棄権が台帳に残る**ので、後から数えられる(第22条)。
    「何相が棄権で通ったか」が `report` の第四の値になり、
    棄権の多さそのものが次の改善対象として可視化される。
  - 第45条の病を回避する唯一の弁。engine が独断で締め出さない。
- **短所**
  - **棄権が既定になれば門は死ぬ。** 理由文字列は機械が中身を裁けない(第16条の
    「substance-based recognition が rubber stamp になってはならない」)。
    `--no-trace-reason "n/a"` を全相に書けば、穴は元通り開く。
  - ゆえに**棄権には上限が要る**。第51条(c)「回復もまた有限である」と同型に、
    `waivers` を数え、閾値超過で `blocked` として人へ escalate する設計が要る。
  - 棄権の三値目(`waived`)を足すと `verify` の戻り値が四値になり、
    `report` / `pulse.js` / dashboard の表示が連動して変わる。影響範囲が広い。

### (d) 採取器を建てる — engine が自分で証跡を拾う(本調査から浮上した第四の道)

(a)(b)(c) はいずれも「**誰かが `record` を呼ぶ**」ことを前提にしている。
だが 1.1 の実測が示す通り、**呼び手が居ないことこそが欠陥の本体**である。
3.5 / 3.6 で鎖が実測できた以上、**engine が自ら拾いに行ける**。

新 engine(仮 `graph/trace-harvest.js`)が
`~/.claude/projects/**/subagents/` と `state.db:async_delegations` を走査し、
時刻窓と `subagent_type` / `role` で相に対応づけて `record` を呼ぶ。

- **長所**
  - **人の規律に依存しない**。第50条「押せない釦は壊れた釦ではなく、名乗らなかった代償」
    の教訓に従い、**名乗り忘れが起きえない**構造にする。
  - 2系統(Claude Code / Hermes)の両方を1箇所で吸収でき、
    (a)(b) が踏む第45条の病(片方しか見ない engine が自分の子を締め出す)を**根から断つ**。
  - 証跡は `toolUseResult.agentId` + 子ログ実在 + `totalDurationMs` まで取れるので、
    `kind:'observed'` を**正当に名乗れる**(自己申告ではない)。
- **短所**
  - **対応づけが確率的**。3.7 の限界に書いた通り、Paradise の相を dispatch した記録は
    `~/.claude` 側に 1件も無かった。時刻窓と役割名での突合は**誤対応を生みうる**。
    誤って `observed` を刻めば、それは第5条違反の**嘘の緑**であり、no-trace より悪い。
  - ログの形式は**版元の都合で変わる**(現に `parent_tool_use_id` は既に存在しない)。
    第50条(d)「借り物の作法は借り物の正典に問う」— 形式が変われば採取器は黙って壊れる。
    **採取器自身が「拾えなかった」を名乗る門**が併せて要る。
  - `~/.claude` の読み取りは、CLAUDE.md が「`~/.claude` 手編集は禁止」と定める領域に近い。
    **読むだけなら抵触しない**が、境界を条文で明示すべきである。

### 4.x 推奨の組み合わせ(discovery 相としての所見。決定は specify/design 相に委ねる)

単独で足る道は無い。**(d) で拾い、(a) で結び、(c) で逃がす**の三重が最も筋が良いと見る:

1. **(d) 採取器**が走行中に証跡を拾って `record` を呼ぶ — 規律ではなく機械が刻む。
2. **(a) `markDone`** が `run.spawnTrace` を検める — `markDone` は done への唯一の門なので
   CLI/module の両経路が同時に塞がる(1.6 の欠陥を構造的に回避)。
   **ただし読むのは `run.spawnTrace` のみ**とし、ログ走査は (d) に閉じ込める。
3. **(c) 棄権路**が第45条/第51条(b)の弁になる — `waived` を数え、上限で escalate。

そして**第21条(壊して鳴らす)を満たす門**を必ず併設する。
2.4 で暴いた通り、現在の 5本は「門自身が record を呼ぶ」ため穴を捕らえられない。
新設すべき門は最低2本:

- 「**`record` を一度も呼ばずに conclave を complete まで回そうとすると失敗する**」
  — 1.3 の `probe5.js` がそのまま門の骨になる。
- 「**`contract.js check` の CLI が run 無しで `accepted:true` を返さない**」
  — 1.6 の実測がそのまま門の骨になる。

---

## 5. 本調査で作った探査スクリプト(実装ではない。読むだけの計測器)

engine には一切手を入れていない。以下は計測のために書いた使い捨ての探査器である。

| ファイル | 役目 |
|---|---|
| `reform/spawn-trace-by-the-road/probe.js` | jsonl 全走査。`Task/Agent` の tool_use と `parentToolUseId` の有無を数える |
| `reform/spawn-trace-by-the-road/probe2.js` | 子ログ(`subagents/`)と親の突合を `sourceToolUseID` で試す(→ 0件) |
| `reform/spawn-trace-by-the-road/probe3.js` | `toolUseResult` を開いて連結フィールドを探す(→ `agentId` を発見) |
| `reform/spawn-trace-by-the-road/probe4.js` | 親 tool_use → agentId → 子ログ実体 の完全鎖を検証(→ 7/7 成立) |
| `reform/spawn-trace-by-the-road/probe5.js` | record 未呼出で conclave が complete まで回ることの再現 |

2.4 の破壊検査で `graph/spawn-trace.js` を一時的に改変したが、**復元済み**:

```
$ git diff --stat graph/spawn-trace.js
(空)
```

---

## 6. 見つからなかったもの(正直な記録)

- **`parentToolUseId` / `parent_tool_use_id`**: 8,986行を走査して **0件**。
  この機体のログ形式には存在しない。
- **Paradise の 11相を dispatch した `~/.claude` 側の記録**: **0件**。
  検出できた Agent 起動 7件はいずれも Paradise の相ではない。
  Paradise の相の発令は Hermes 側(`async_delegations`)にのみ残っていた。
- **`conclave.js` から `spawn-trace` への参照**: **0件**(`grep -c` → 0)。
- **conclave と trace を結合して試す門**: **0本**。
- **production コードから `contract.reconcile(..., { run })` を呼ぶ箇所**: **0件**。
- **`~/AppData/Local/hermes/logs/` 配下の subagent 個別走行ログ**: 単独ファイルとしては
  見つからず。証跡は `state.db` の `async_delegations` テーブルに集約されていた。
