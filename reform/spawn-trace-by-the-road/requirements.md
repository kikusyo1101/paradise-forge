# spawn-trace 証跡強制 — requirements 相 要件定義

- **道**: `reform/spawn-trace-by-the-road` (worktree: `C:/Users/kikus/AppData/Local/Temp/pd-trace`)
- **神託**: 「spawn-trace の証跡欠落 — 記録を呼ばなくても環が回りきる構造の穴」
- **相**: requirements / 神官: requirements-analyst
- **唯一の入力**: `reform/spawn-trace-by-the-road/findings.md`(723行)
- **掟**: 実装は一切していない。engine ファイルには一行も触れていない。
  以下の「現状(RED)」欄はすべて本相で**再実行して確かめた生の出力**である。

---

## 0. この要件が立つ地面(再実測)

requirements 相は discovery の主張を鵜呑みにしない。以下は本相で走らせ直した結果である。

```
$ cd C:/Users/kikus/AppData/Local/Temp/pd-trace

$ grep -c "spawn-trace" graph/conclave.js
0                                           ← 環は trace の名すら知らない

$ grep -rn "\.record(" --include=*.js graph/ dashboard/ tools/ | grep -v node_modules
(出力なし / exit 1)                          ← production に record の呼び手はゼロ

$ echo '{"phase":"discover","status":"done","artifact":"CONSTITUTION.md"}' | node graph/contract.js check
{ "accepted": true, "reason": "artifact verified (77506b): CONSTITUTION.md",
  "verified": "file", "size": 77506 }
exit=0                                       ← 証跡ゼロで accepted:true

$ node graph/spawn-trace.js report reform/dashboard-living-gate/conclave.json
phases: 11   observed: 0   asserted-only: 0   no-trace: 11
exit=1                                       ← 既存走行は 11/11 が no-trace

$ grep -c "^test(" tests/paradise.test.js
282
$ grep -n "^test('spawn trace" tests/paradise.test.js | wc -l
5                                            ← 282本中5本。すべて門自身が record を呼ぶ
$ grep -n "conclave" tests/paradise.test.js | grep -ci "trace"
0                                            ← 結合を試す門は 0本

$ ls ~/.claude/projects/*/*/subagents/*.jsonl | wc -l
7                                            ← 子ログは実在(findings 3.5 の 7/7 と一致)
$ ls -la ~/AppData/Local/hermes/state.db
-rw-r--r-- 124706816 ... state.db            ← Hermes 側の台帳も実在

$ grep -c "schemaVersion" graph/conclave.js
0                                            ← run に版の印が無い(移行要件の前提)
```

**確定事項**: findings.md の主張は 8/8 再現した。requirements はこの地面の上に立つ。

### 0.1 この要件が**書いてはならない**こと(第16条)

findings.md 3.2 / 6 の実測:

> `parentToolUseId` / `parent_tool_use_id` を持つ行は **8,986行中 0件**(findings.md:363, 714)

憲法 第27条は SDK docs を引いて `parent_tool_use_id` を「唯一確実な手段」と呼び、
`graph/spawn-trace.js:48-49` のコメントもそれを写している。だが**この機体のログ形式に
その名は存在しない**。

> 第16条: *Evidence is judged by what it DOES, never by what it is named.*

ゆえに本要件は **`parentToolUseId` の存在を必須条件とする門を一切定義しない**。
必須にすれば永久に赤であり、それは「測っていないものを赤と呼ぶ」— 第16条の裏面の違反である。
代わりに実測で 7/7 成立した鎖(findings.md:420-437)を唯一の根拠とする:

```
親ログ  message.content[].tool_use { name:"Agent", id:"toolu_…", input.subagent_type }
   ↓ 同じ tool_use_id の tool_result 行に付く
親ログ  toolUseResult { agentId, status, agentType, resolvedModel, totalDurationMs }
   ↓ agentId がファイル名を決める
子ログ  <proj>/<sessionId>/subagents/agent-<agentId>.jsonl  (isSidechain:true)
```

および Hermes 側(findings.md:452-516):

```
~/AppData/Local/hermes/state.db : async_delegations
  (delegation_id, parent_session_id, state, dispatched_at, completed_at,
   event_json{role, model, total_duration_seconds})  — 51行実在
```

**証跡の出所は2系統に分かれている**(findings.md:556)。片方しか見ない engine は、
もう片方で走った相を永久に no-trace と誤断ずる。これは第45条の同型の病である。

---

## 1. 用語(この文書内で固定する)

| 語 | 定義 |
|---|---|
| **採取器** | 新 engine `graph/trace-harvest.js`。2系統のログ/台帳を**読むだけ**で走査し `record` を呼ぶ |
| **証跡の四値** | `observed`(機械が鎖を辿れた) / `asserted-only`(自己申告のみ) / `waived`(人が理由付きで棄権) / `no-trace`(何も無い) |
| **legacy run** | `run.traceSchema` を持たない run。新門の導入以前に建てられたもの |
| **棄権(waiver)** | 人が明示的理由を添えて証跡要求を免除する行為。engine の独断ではない |
| **2系統** | (I) `~/.claude/projects/**` の親子 jsonl、(II) `state.db:async_delegations` |

---

## 2. must-have(必須要件)

各要件には**必ず1本以上の AC** を結ぶ。AC は「誰が打っても同じ結果が出るコマンド」で書く。
形容詞で書かれた AC は AC ではない。

---

### M1. 採取器が2系統の**両方**から証跡を拾う

**理由**: findings.md 1.1 の実測通り `record` の呼び手は production にゼロ。
人の規律に依存する設計は第50条(a)「黙秘は放棄と同じ意味を持つ」で必ず腐る。
機械が自分で拾いに行く。

**要件**:
- `graph/trace-harvest.js` を新設し、`scan` / `apply` の2口を持つ。
- `scan` は**読むだけ**で、run を書き換えない(第29条の精神:採取と適用を分ける)。
- 系統(I)(II)の**両方**を走査する。片方が空でも他方だけで打ち切らない。
- 各証跡には `source: 'claude-jsonl' | 'hermes-async-delegations'` を刻む。

#### AC-1.1 — 採取器が走り、両系統を走査したことを機械可読に名乗る

```
$ node graph/trace-harvest.js scan --json
```
- exit code = `0`
- stdout は単一の JSON。`jq -e '.sources | length == 2'` が exit 0
- `jq -e '[.sources[].id] | sort == ["claude-jsonl","hermes-async-delegations"]'` が exit 0
- 各 source は `scanned`(走査件数)と `found`(拾えた証跡数)を数値で持つ:
  `jq -e '.sources | all(has("scanned") and has("found"))'` が exit 0

**現状(RED)**: `$ ls graph/trace-harvest.js` → `No such file` (exit 2)。

#### AC-1.2 — 実機の 7件の鎖を実際に拾える(捏造ではないことの証明)

```
$ node graph/trace-harvest.js scan --source claude-jsonl --json | jq '.sources[0].found'
```
- 出力は `7` 以上(findings.md:436「鎖の総数: 7 子ログが実在: 7」と整合)
- 拾った各項に `agentId` と `childLog` が入り、`childLog` は実在ファイルである:
  `node graph/trace-harvest.js scan --source claude-jsonl --json | jq -e '.entries | all(.childLog != null)'` が exit 0

**現状(RED)**: engine 不在。

#### AC-1.3 — 拾えなかったときに**黙って壊れない**(第50条(d)/第44条)

版元がログ形式を変えれば採取器は静かに 0件を返す。それを「証跡が無い」と誤訳させない。

```
$ node graph/trace-harvest.js scan --root /tmp/definitely-empty-dir --json
```
- exit code = `3`(= `harvest-blind`。0 でも 1 でもない専用の値)
- `jq -e '.state == "harvest-blind"'` が exit 0
- `jq -e '.reason | test("走査できたが1件も拾えなかった")'` が exit 0

> `0`(拾えた)と `3`(拾いに行ったが何も無い)を**同じ値にしてはならない**。
> 同じにすれば「採取器が壊れている」と「本当に発令されていない」が区別できなくなる。

---

### M2. `markDone` が `run.spawnTrace` を検める(done への唯一の門)

**理由**: findings.md 1.6 の実測通り、`contract.js` の CLI は `opts` を渡す口が無く
**構造的に 100% 素通りする**。対して `markDone` は module 経路も CLI `done` 経路も
同じ関数を通る(`graph/conclave.js:392-393`)。ここを塞げば両方が同時に塞がる。

**要件**:
- `markDone(run, id, artifactPath, opts)` が、第22条の成果物実在検査
  (`conclave.js:285-296`)と**並べて**証跡検査を行う。
- **`markDone` はログを一切読まない。** 読むのは `run.spawnTrace` のみ。
  ログ走査は M1 の採取器に閉じ込める(findings.md:591-593 の指摘に従う)。
- 拒否時の例外文は、どの相が何値だったか・次に打つべきコマンドを名指しする(第15条)。

#### AC-2.1 — 証跡ゼロの相を done にできない

```
$ node -e '
  const c=require("./graph/conclave.js");
  const run={domains:[{cardinal:"x",domain:"d",reviewClass:"r",status:"active",reworks:0,
    phases:[{id:"discover",status:"running",deps:[]}]}],history:[],traceSchema:1};
  try{ c.markDone(run,"discover"); console.log("ACCEPTED"); process.exit(0); }
  catch(e){ console.log("REJECTED:"+e.message); process.exit(1); }'
```
- exit code = `1`
- stdout が `REJECTED:` で始まる
- 例外文に `no-trace` と `--no-trace-reason` の両方が含まれる
  (拒むだけで出口を示さない門は第51条(a)「静止は失敗より悪い」に直行する)

**現状(RED)**: 同じスクリプトで `ACCEPTED` / exit 0。
findings.md 1.3(`probe5.js`)が示す通り、`markDone` は trace を一行も見ない。

#### AC-2.2 — `observed` があれば通る(門が仕事を止めないことの確認)

同じスクリプトで `markDone` の前に
`require("./graph/spawn-trace.js").record(run,"discover",{agent:"market-researcher",toolUseId:"toolu_01ABC"})`
を挿入した版:
- exit code = `0`、stdout = `ACCEPTED`

#### AC-2.3 — `markDone` はファイルシステムのログを読まない(純粋性の維持)

```
$ grep -nE "\.claude|state\.db|subagents|trace-harvest" graph/conclave.js | wc -l
```
- 出力は `0`

> `markDone` に I/O を持ち込めばテスト容易性が落ちる(findings.md:591)。
> 採取器と判定器の境界は grep で機械が守る。

---

### M3. 明示的棄権路(`waived`)と、その**濫用の上限**

**理由**: 第45条「締め出す相手が、自分が呼んだ者であることに、機構は気づかない」。
findings.md 3.7 が示す通り、**Paradise の相を dispatch した記録は `~/.claude` 側に 1件も無く**、
Hermes 側にのみ在った。engine が片系統しか見なければ、正しく発令された相を締め出す。
第51条(b)「判定不能なときは、engine は手を出さず人に問え」に従い、人が理由付きで通す弁を置く。

**要件**:
- `markDone` / CLI `done` が `--no-trace-reason "<理由>"` を受ける。
  受けたとき `run.spawnTrace[phase]` に `kind:'waived'` の項を刻む
  (`reason`, `at`, `by` を伴う)。
- **理由は機械が中身を裁けない**(第16条「rubber stamp になってはならない」)。
  ゆえに engine は**中身ではなく量**を裁く。
- 走行全体の棄権数 `run.traceWaivers` を数え、`MAX_TRACE_WAIVER` を超えたら
  その相を持つ domain を `blocked` にして人へ escalate する
  (第51条(c)「回復もまた有限である」と同型。`MAX_PHASE_RESUME=2` /
  `MAX_DOMAIN_REWORK=3` が既に前例である — `graph/conclave.js:36,38`)。
- `MAX_TRACE_WAIVER` の既定値は **3**(11相中3相まで。過半を棄権できる値にしない)。
- 棄権は**台帳に残る**(第22条)。後から数えられない棄権は棄権ではない。

#### AC-3.1 — 理由付き棄権は通り、`waived` として刻まれる

```
$ node -e '
  const c=require("./graph/conclave.js");
  const run={domains:[{cardinal:"x",domain:"d",reviewClass:"r",status:"active",reworks:0,
    phases:[{id:"discover",status:"running",deps:[]}]}],history:[],traceSchema:1};
  c.markDone(run,"discover",null,{noTraceReason:"Hermes async_delegations deleg_aecff7bf で発令済み"});
  const e=run.spawnTrace.discover[0];
  console.log(e.kind, !!e.reason, run.traceWaivers);'
```
- exit code = `0`
- stdout = `waived true 1`

#### AC-3.2 — 空/無意味に短い理由は棄権として受け付けない

```
$ node -e '...同上だが noTraceReason:"n/a" ...'
```
- exit code = `1`(throw)
- 例外文に「理由が短すぎる」旨と最小文字数が含まれる
- 最小長は **20文字**(全角換算で一文になる長さ)。`""` `"n/a"` `"ok"` はすべて拒否される。

> これは中身の審査ではない。**長さは機械が数えられる**(第22条)。
> `--no-trace-reason "n/a"` を全相に貼れば穴は元通り開く(findings.md:637)— それを塞ぐ最小の門。

#### AC-3.3 — 棄権が上限を超えたら `blocked` になる

```
$ node -e '
  const c=require("./graph/conclave.js");
  const ph=["a","b","c","d"].map(id=>({id,status:"running",deps:[]}));
  const run={domains:[{cardinal:"x",domain:"d",reviewClass:"r",status:"active",reworks:0,phases:ph}],
    history:[],traceSchema:1};
  const R="engine が知らぬ経路で発令したため証跡を辿れない";
  for(const p of ph){ try{ c.markDone(run,p.id,null,{noTraceReason:R}); }catch(e){ console.log("BLOCKED@"+p.id); process.exit(1);} }
  console.log("ALL-WAIVED"); '
```
- exit code = `1`
- stdout = `BLOCKED@d`(4本目、すなわち `MAX_TRACE_WAIVER=3` の次で止まる)
- `run.domains[0].status === 'blocked'` になる
- `run.history` に `event: 'trace-waiver-guard'` の行が積まれる

---

### M4. 証跡の値は**四値**であり、`waived` は緑ではない

**理由**: 第16条(d)「観測できないものを done と呼ばない」。
棄権は「通した」であって「観測した」ではない。両者を同じ色で表示すれば、
棄権の多さという**次の改善対象そのものが不可視**になる(findings.md:630-632)。

**要件**:
- `spawn-trace.js` の `verify()` は `observed` / `asserted-only` / `waived` / `no-trace` を返す。
- `report()` は `waived` を**独立した数**として持つ。`observed` に足し込まない。
- `report().ok` は「進行を許してよいか」であり、
  `report().clean` を新設して「全相が `observed` か」を別に名乗る。
  **`ok:true` かつ `clean:false` が棄権を含む走行の正しい姿である。**

#### AC-4.1 — `report` が四値を別々に数える

```
$ node -e '
  const t=require("./graph/spawn-trace.js");
  const run={domains:[{phases:[{id:"a"},{id:"b"},{id:"c"},{id:"d"}]}]};
  t.record(run,"a",{agent:"x",toolUseId:"toolu_1"});
  t.record(run,"b",{agent:"y"});
  t.record(run,"c",{kind:"waived",reason:"engine が知らぬ経路で発令したため証跡を辿れない"});
  const r=t.report(run);
  console.log(JSON.stringify({observed:r.observed,assertedOnly:r.assertedOnly,waived:r.waived,noTrace:r.noTrace,ok:r.ok,clean:r.clean}));'
```
- exit code = `0`
- stdout = `{"observed":1,"assertedOnly":1,"waived":1,"noTrace":1,"ok":false,"clean":false}`

#### AC-4.2 — 棄権のみの走行は `ok:true` だが `clean:false`

上のスクリプトから `b`(asserted)と `d`(no-trace)を除いた版:
- stdout の `ok` が `true`、`clean` が `false`、`waived` が `1`
- CLI `node graph/spawn-trace.js report <run>` の exit code = `0`、
  ただし stdout に `棄権` の語と棄権相の一覧が現れる(沈黙で通さない — 第44条)

---

### M5. `parentToolUseId` を必須にしない(第16条の明文化)

**理由**: 0節に書いた通り、8,986行走査して 0件(findings.md:363)。
必須化した門は永久に赤であり、赤い門は「無視してよい門」として扱われ始める(第34条の同型)。

**要件**:
- `observed` を名乗る条件は次の**いずれか**であり、`parentToolUseId` は**十分条件の一つ**に
  留める。必要条件にしてはならない。
  1. `toolUseId` が実在し、かつ `agentId` が実在し、かつ子ログ
     `subagents/agent-<agentId>.jsonl` が**実在する**
  2. `delegationId` が実在し、`state.db:async_delegations` に同 id の行が実在し、
     その `state` が `completed` か `running` である
  3. `parentToolUseId` が実在する(将来この機体の形式が変わった場合の受け皿)
- `spawn-trace.js:11-14` / `48-49` のコメントは**実測に合わせて訂正**する
  (「唯一確実」の語を残さない)。憲法 第27条の訂正提案は nice-to-have(N3)に置く。

#### AC-5.1 — `parentToolUseId` を必須にする分岐がコード上に存在しない

```
$ grep -nE "parentToolUseId[^)]*\)\s*\{?\s*throw|!.*parentToolUseId.*throw|require.*parentToolUseId" graph/*.js | wc -l
```
- 出力は `0`

```
$ grep -c "唯一確実" graph/spawn-trace.js
```
- 出力は `0`(実測に反する断定が engine のコメントから消えている)

**現状(RED)**: 後者は現在 `1`(`graph/spawn-trace.js:14`「これが『実体があるか』を検証する唯一確実な手段である」)。

#### AC-5.2 — `parentToolUseId` 無しでも実測の鎖で `observed` を名乗れる

```
$ node -e '
  const t=require("./graph/spawn-trace.js");
  const run={domains:[{phases:[{id:"a"}]}]};
  t.record(run,"a",{agent:"market-researcher",toolUseId:"toolu_01XEb8JkVzcjkgCmdRdTM5pP",
    agentId:"a47ff19939f65c691",childLog:"…/subagents/agent-a47ff19939f65c691.jsonl",
    source:"claude-jsonl",parentToolUseId:null});
  const v=t.verify(run,"a"); console.log(v.state); process.exit(v.ok?0:1);'
```
- exit code = `0`、stdout = `observed`

---

### M6. `contract.js` の**素通り**を塞ぐ

**理由**: findings.md 1.5/1.6。`opts.run` を渡す呼び手は production にゼロ、
CLI は渡す口が無く **100% 素通りが構造的に確定している**。
第37条「Absence is not passage」— 渡し忘れが緑を生む設計は緑の意味を壊す。

**要件**:
- CLI `check` が `--run <run.json>` を受け、`checkPayload(raw, { run })` へ渡す。
- **`--run` を渡さなかったとき、`verified` は `"file"` のままで良い。だが
  `traceChecked:false` を必ず添える。** 素通りしたことを結果自身に名乗らせる。
- `--run` を渡し、その相が `no-trace` なら `accepted:false` /
  `verified:"file-but-unspawned"` を返す(既存の `contract.js:73-82` の分岐に実行経路を与える)。

#### AC-6.1 — run 無しの `check` は「照合していない」と自ら名乗る

```
$ echo '{"phase":"discover","status":"done","artifact":"CONSTITUTION.md"}' | node graph/contract.js check | jq -e '.traceChecked == false'
```
- exit code = `0`(jq が真を返す)

**現状(RED)**: 0節の実測通り、返る JSON に `traceChecked` キーは無い(`jq` は `null` で exit 1)。

#### AC-6.2 — run 付きの `check` は証跡ゼロを拒む

```
$ node graph/conclave.js convene reform/spawn-trace-by-the-road/forge.dag.json --out /tmp/ac62.json >/dev/null
$ echo '{"phase":"discover","status":"done","artifact":"CONSTITUTION.md"}' \
  | node graph/contract.js check --run /tmp/ac62.json
```
- exit code = `1`
- `jq -e '.accepted == false and .verified == "file-but-unspawned" and .traceChecked == true'` が exit 0

**現状(RED)**: `check` は `--run` を解さず、`accepted:true` / exit 0 を返す。

---

### M7. 移行 — 既存 run の扱いを**明示的に決める**

**現実**: 既存 run は **11/11 が no-trace**(0節で再実測)。
何も決めなければ、新門の投入と同時に `reform/dashboard-living-gate/conclave.json` は
`done` も `ratify` も打てなくなり、環が静止する(第51条(a)「静止は失敗より悪い」)。

**決定(この要件が定めること)**:

> **壊さない。猶予もしない。「判定不能」と名乗らせる。**

- run に `traceSchema: 1` を導入する(現在 run に版の印は無い — 0節 `grep -c schemaVersion` → 0)。
- `traceSchema` を**持たない** run = **legacy run**。
  - legacy run に対し `markDone` は**証跡検査を行わない**(既存走行を壊さない)。
  - ただし `report()` は legacy を `observed` にも `waived` にも数えず、
    `legacy: <n>` として**第五の数**で名乗る。**legacy は緑ではない**(第16条)。
  - `report()` の CLI 出力に
    「この走行は新門の導入以前に建てられたため、証跡について**判定していない**」
    と明記する。「証跡が無い」と「測っていない」を混同しない。
- `convene` が建てる新しい run は必ず `traceSchema: 1` を持ち、以後の相はすべて新門を通る。
- **legacy から新体系への自動昇格を行わない。** 採取器が事後に拾えたとしても、
  それを既存 run へ遡って書き戻すのは「誤対応を生みうる」(findings.md:661-663)。
  誤って `observed` を刻めば第5条違反の**嘘の緑**であり、no-trace より悪い。
  昇格は `node graph/trace-harvest.js apply <run> --force` を人が打った時のみ。

#### AC-7.1 — legacy run は壊れない(done が通る)

```
$ cp reform/dashboard-living-gate/conclave.json /tmp/ac71.json
$ node -e '
  const c=require("./graph/conclave.js"),fs=require("fs");
  const run=JSON.parse(fs.readFileSync("/tmp/ac71.json","utf8"));
  console.log("traceSchema:",run.traceSchema===undefined?"absent":run.traceSchema);
  const p=[...c.allPhases(run).values()][0];
  c.markDone(run,p.id); console.log("OK",p.status);'
```
- exit code = `0`、stdout に `traceSchema: absent` と `OK done`

#### AC-7.2 — legacy run は緑とも赤とも名乗らない(第五の値)

```
$ node graph/spawn-trace.js report /tmp/ac71.json --json | jq -e '.legacy == 11 and .noTrace == 0 and .clean == false'
```
- exit code = `0`
- CLI の人向け出力に `判定していない` の語が含まれる:
  `node graph/spawn-trace.js report /tmp/ac71.json | grep -c "判定していない"` → `1` 以上

**現状(RED)**: 現在は `noTrace: 11` と断ずる(0節の実測)。
これは「測っていないもの」を赤と呼んでいる状態であり、第16条の裏面に触れている。

#### AC-7.3 — 新しく建てた run は必ず版の印を持つ

```
$ node graph/conclave.js convene reform/spawn-trace-by-the-road/forge.dag.json --out /tmp/ac73.json >/dev/null
$ jq -e '.traceSchema == 1' /tmp/ac73.json
```
- exit code = `0`

---

### M8. 壊して鳴る門を最低2本 新設する(第21条 / 第50条)

**理由**: findings.md 2.4 の破壊検査が確定させた事実 —
「`record` 本体を壊せば 5本の門は鳴る。**しかし『誰も record を呼ばない』という欠陥は、
5本すべてが門自身の手で record を呼ぶ設計になっているため、絶対に鳴らない**」(findings.md:288-290)。

> 第50条: **門が見ない機能は壊れても鳴らない。**
> 現在の門の視野は `record` の**内部**に限られ、`record` が**呼ばれるか否か**という
> 配線そのものが視野の外にある。

**要件**: 以下2本を `tests/paradise.test.js` に新設する。いずれも
**門自身が `record` を呼んではならない**(呼んだ瞬間に穴を跨いでしまう)。

#### 門A: 「証跡ゼロのまま complete まで回りきる」を捕らえる

- 骨は findings.md 5節の `probe5.js` をそのまま使う(`markRunning` → `markDone` → `ratify` → `complete`)。
- 門は `record` を**一度も呼ばない**。`traceSchema:1` の run を `convene` から建てる。
- 期待: `markDone` が throw する。complete に到達しない。

**何を壊せば鳴るか(第21条)**:

| 壊す箇所 | 鳴る門 | 鳴り方 |
|---|---|---|
| `conclave.js` の `markDone` から証跡検査の行を削る | 門A | 例外が飛ばず環が complete へ到達 → `assert.throws` が失敗 |
| `spawn-trace.js` の `verify` が `no-trace` でも `ok:true` を返すよう改竄 | 門A | 同上 |
| `MAX_TRACE_WAIVER` を `Infinity` にする | 門A' (AC-3.3 の門) | `BLOCKED@d` が出ず `ALL-WAIVED` になる |

#### AC-8.1 — 門A が存在し、単独で走り、緑である

```
$ grep -c "test('spawn trace: 証跡ゼロの走行は complete へ到達できない" tests/paradise.test.js
```
- 出力は `1`
```
$ node tests/paradise.test.js 2>&1 | tail -3
```
- 全体が緑(`fail=0`)、`^test(` の総数が **282 → 284 以上**に増えている:
  `grep -c "^test(" tests/paradise.test.js` が `284` 以上

#### AC-8.2 — 門A が「門自身で record を呼ぶ」形になっていない

```
$ awk '/test\('"'"'spawn trace: 証跡ゼロの走行/,/^\}\);/' tests/paradise.test.js | grep -c "\.record("
```
- 出力は `0`

> これが第50条の直接の門である。門が自分で `record` を呼んだ瞬間、
> その門は穴の**手前側**しか見なくなる。それを機械が禁じる。

#### 門B: 「`contract.js check` の CLI が run 無しで緑を名乗る」を捕らえる

- 骨は findings.md 1.6 の実測(`echo … | node graph/contract.js check`)をそのまま使う。
- 門は子プロセスで実 CLI を起動する(module を直接呼ばない — CLI の口が塞がれたことを試すため)。
- 期待: run 無しなら `traceChecked:false`、run 付きで no-trace なら `accepted:false`。

**何を壊せば鳴るか**:

| 壊す箇所 | 鳴る門 | 鳴り方 |
|---|---|---|
| `contract.js` の CLI から `--run` の解釈を削る | 門B | run 付きでも `accepted:true` → `assert.strictEqual(accepted,false)` が失敗 |
| `checkPayload` から `traceChecked` を落とす | 門B | `undefined !== false` で失敗 |

#### AC-8.3 — 門B が存在し、実 CLI を子プロセスで起動している

```
$ grep -c "test('spawn trace: contract の CLI は run 無しで証跡を照合したと名乗らない" tests/paradise.test.js
```
- 出力は `1`
```
$ awk '/test\('"'"'spawn trace: contract の CLI/,/^\}\);/' tests/paradise.test.js | grep -cE "execFileSync|spawnSync"
```
- 出力は `1` 以上

---

### M9. 楽園は自分の証跡の数を**数えて**語る(第22条)

**理由**: 第22条「A number the paradise states about itself must be countable, and counted.」
棄権数・legacy 数を誰も数えなければ、「棄権が既定になり門が死ぬ」(findings.md:635)が
静かに起きる。静かに起きたことは第44条により先例として読まれる。

**要件**:
- `graph/census.js` が「spawn-trace を試す門の本数」を成果物から数え、
  文書中の主張と突き合わせる。
- `graph/pulse.js` のダッシュボードが四値+legacy を表示する
  (`pulse.js:221` で既に `spawnTrace.report(run)` を呼んでいる — 表示の追随のみ)。

#### AC-9.1 — census が spawn-trace 門の本数を数え、主張と突き合わせる

```
$ node graph/census.js --json | jq -e '.spawnTraceGates >= 7'
```
- exit code = `0`(既存5本 + 新設2本以上)
- 数が文書の記述とずれていれば `node graph/census.js` が exit != 0 で落ちる

---

## 3. nice-to-have(あれば良いが、無くても本改修は成立する)

| # | 要件 | なぜ must ではないか |
|---|---|---|
| N1 | 採取器を走行中に自動起動する(`markRunning` の後で `harvest apply`) | 誤対応の危険(findings.md:661)。まず人が `apply` を打つ形で運用実績を積む |
| N2 | 相と証跡の対応づけを時刻窓+`subagent_type`/`role` で自動推定 | 確率的。誤って `observed` を刻めば嘘の緑(第5条違反)。手動対応づけで足りる |
| N3 | 憲法 第27条の条文訂正(`parent_tool_use_id` の記述を実測に合わせる) | 条文改正は別の道(第23条)。本改修は engine を実測に合わせるに留める |
| N4 | dashboard に棄権理由の一覧画面 | `report --json` で読める。画面は後追いで良い |
| N5 | `state.db` 読み取りの Node 実装(現在は python 経由で実測した) | 採取器は外部コマンド経由でも AC を満たせる |
| N6 | 棄権の**期限**(N日経過で自動的に再検査) | 上限(M3)が先。期限は上限が効いてから足す |
| N7 | 他機・他バージョンで `parentToolUseId` が出る場合の受け皿の実測 | 本機では 0件。測れないものを要件にしない(第16条) |

---

## 4. 非目標(この改修で**やらないこと**)

1. **`~/.claude` への書き込みを一切行わない。** 読むだけである。
   CLAUDE.md は `~/.claude` 手編集を禁じており、hooks が機械強制している。
   採取器は読み取り専用で開く。書き込み口を持たせない。
2. **憲法本文を書き換えない。** 第27条の `parent_tool_use_id` 記述が実測と食い違うことは
   0.1 節で記録したが、条文の改正は第23条の別の道で行う(N3)。
3. **`parentToolUseId` を実装で「作り出さない」。** ログに無いものを engine が合成して
   刻めば、それは証跡ではなく捏造である。
4. **既存 run(legacy)を遡って緑にしない。** M7 の通り「判定していない」と名乗らせるだけ。
5. **`next` / `complete` の側に証跡判定を置かない。**
   findings.md 4(b) の短所が決定的である — 11相走り終えてから鳴る門は、
   鳴った時には手遅れ(第44条の裏返し)。判定は `markDone` に置く(M2)。
   `complete` の結び文で**要約を述べる**のは可(表示であって門ではない)。
6. **`record` の呼び出しを人の規律に委ねない。** 手打ちの `record` は引き続き可能だが、
   それを前提にした要件は一つも書かない(第50条(a))。
7. **`spawn-ledger.json` を証跡として扱わない。** findings.md:518-527 の実測通り、
   gateway プロセスの台帳であり subagent とは無関係である。
8. **性能最適化を目標にしない。** 採取器が 8,986行を毎回走査しても実用上問題ない
   (findings.md の probe 群は実測で完走している)。キャッシュは本改修の範囲外。

---

## 5. 要件と AC の対応表

| # | 要件(must-have) | AC | 憲法 |
|---|---|---|---|
| M1 | 採取器が2系統の両方から拾い、拾えなかったを名乗る | AC-1.1 / AC-1.2 / AC-1.3 | 第50条 / 第45条 |
| M2 | `markDone` が `run.spawnTrace` を検める(ログは読まない) | AC-2.1 / AC-2.2 / AC-2.3 | 第22条 / 第27条 |
| M3 | 明示的棄権路と濫用の上限 | AC-3.1 / AC-3.2 / AC-3.3 | 第45条 / 第51条(b)(c) |
| M4 | 四値。`waived` は緑ではない | AC-4.1 / AC-4.2 | 第16条 |
| M5 | `parentToolUseId` を必須にしない | AC-5.1 / AC-5.2 | 第16条 |
| M6 | `contract.js` の素通りを塞ぐ | AC-6.1 / AC-6.2 | 第37条 |
| M7 | 移行:legacy は壊さず「判定不能」と名乗る | AC-7.1 / AC-7.2 / AC-7.3 | 第16条 / 第51条(a) |
| M8 | 壊して鳴る門を2本新設 | AC-8.1 / AC-8.2 / AC-8.3 | 第21条 / 第50条 |
| M9 | 数えて語る(census / dashboard) | AC-9.1 | 第22条 |

**must-have: 9件 / AC: 22本 / nice-to-have: 7件 / 非目標: 8件**

この数自体が第22条の対象である。機械で数え直せる:

```
$ grep -cE '^### M[0-9]+\.' requirements.md      # → 9
$ grep -cE '^#### AC-' requirements.md           # → 22
$ grep -cE '^\| N[0-9]+ \|' requirements.md      # → 7
```

---

## 6. この相が確かめられなかったこと(正直な記録)

- **AC はすべて現時点で RED である。** 当然である — 実装は一相も行っていない。
  各 AC の「現状(RED)」欄に記した出力は、**要件が実在の穴を指していること**の証拠であって、
  実装が済んだ証拠ではない。
- **`MAX_TRACE_WAIVER=3` に実測の根拠は無い。** 既存の `MAX_PHASE_RESUME=2` /
  `MAX_DOMAIN_REWORK=3`(`graph/conclave.js:36,38`)との整合で置いた値である。
  運用後に棄権数を数えて(M9)改めるべき数である — 第38条は「改善は前後の数値で語れ」と言う。
- **理由文の最小長 20文字にも実測の根拠は無い。** `"n/a"` を弾く最小の機械的検査として置いた。
  これは中身の審査ではなく長さの審査である旨を AC-3.2 に明記した。
- **採取器の相への対応づけ方式は本相では決めていない。** findings.md 4(d) が
  「対応づけは確率的」と警告した通り、誤対応は嘘の緑を生む。
  **具体的な突合アルゴリズムの決定は design 相に委ねる。**
  本要件が縛るのは「両系統を見よ」「拾えなかったを名乗れ」「誤りうるなら人に問え」の三点のみ。

---

## 付記 — 適切な階級による査読の指摘 (第11条)

requirements 相の成果物を discovery 枢機卿の階級で検めた際、**AC の実行可能性に
2件の欠陥**を実測で見つけた。要件の中身は採るが、AC の書き方を次相へ訂正して渡す。

### 訂正1 — `jq` はこの機体に存在しない

```
$ which jq
which: no jq in (...)     ← 不在
```

AC-1.1 / AC-6.1 / AC-6.2 / AC-7.2 / AC-7.3 が `jq -e` を前提にしている。
**打てない AC は AC ではない**(第16条: 測れない基準は緑を名乗れない)。
**design/build 相は `jq` を使わず `node -e` の JSON 判定で書き直すこと。**

### 訂正2 — `convene` に `--out` は無い

```
$ grep -n "usage: conclave.js convene" graph/conclave.js
385:    if (!pos[0] || !rp) { console.error('usage: conclave.js convene <dag.json> --run <run.json>'); ... }
```

AC-6.2 / AC-7.3 が `convene ... --out /tmp/x.json` と書いているが、正しくは `--run`。
**書いた者が一度も打っていない AC** であり、則D(壊れたことを先に証明せよ)の裏面である
—— 通ることも確かめていない。次相は AC を**実際に打ってから** RED を宣言すること。

以上2件を除き、M1〜M9 の要件と決定(特に M7「壊さない・猶予もしない・判定不能と名乗らせる」)を
**批准する**。
