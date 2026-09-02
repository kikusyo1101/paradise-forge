# findings.md — ダッシュボード刷新 (dashboard-living-gate) / discover 相

- **道**: reform (楽園自身の改修 — 憲法第23条b)
- **本分**: 市場ではなく **楽園自身を実測** する。以下すべて実出力または出典URLを添える。
- **測定機**: Windows 11 / node v24.14.0 / git-bash / `C:/Users/kikus/Documents/workspace/paradise`
- **実測日時**: 2026-09-02 (JST)
- **計測方法**: `_bench.js` で各 engine を子プロセスで3回ずつ実行し median を取った。ベンチ script は本書に結果を統合後に削除した(作業屑を成果物ディレクトリに残さない)。

---

## 0. 結論の要約(先に結論)

1. 楽園は **「生きた事実」を既に大量に持っている**。ただしダッシュボードはその一つも読んでいない。
   `dashboard/index.html` の数値は `dashboard/paradise.js` の **ハードコード配列** から来ており、engine を一度も呼んでいない。
2. **engine のほぼ全てが 27〜53ms** で答える(node 起動のベースライン 27ms 込み)。
   → 実質「node 起動代」しかかかっておらず、**毎秒ポーリングしても余裕**。
3. **例外は census.js のみで 120,072ms**。これは自己診断 `tests/paradise.test.js` を子プロセスで丸ごと回し timeout:120000 に達して打ち切られているため。
   → **census.js はダッシュボードの同期経路に置いてはならない**。
4. `state.json` を経由する現行方式は **creations を 0 と報告する**(実在8件)。原因は住所の直書き。
5. リアルタイム化は **node標準ライブラリのみで完全に可能**(実証済み・後述 B-1)。ただし `file://` 直開きでは EventSource も fetch も死ぬので **二層フォールバックが必須**。

---

# A. 楽園自身の実測 — 「ダッシュボードが映せる生きた事実」の在庫

## A-1. 在庫表(実測)

`--json` 欄: ✅=専用の機械可読出力あり / △=フラグは受け付けるが**無視され人間向け出力のまま** / ❌=フラグ無し・人間向けのみ / (既定JSON)=フラグ無しで既にJSON

| # | コマンド | 取れる事実 | `--json` | median | exit | 出力量 | 毎秒呼べるか |
|---|---|---|---|---|---|---|---|
| 1 | `node graph/census.js show` | 条数50/engine数33/creations数/overlay数/vendor内訳 | ❌ | **120,072ms** | 0 | 442B | **絶対不可** |
| 2 | `node graph/clergy.js college` | 枢機卿7+執行官1の位階・governs・priests・reviewed-by・PDCA | △(無視) | 33ms | 0 | 1,054B | 可 |
| 3 | `node graph/forge.js plan "x" --scale reform` | 道(DAG)・gates・meta.produces・各相のagent/artifact | (既定JSON) | 33ms | 0 | 3,706B | 可 |
| 4 | `node graph/forge.js scale "<願い>"` | 願いがどの道に落ちるか | ❌(1語) | ~33ms | 0 | 6B | 可 |
| 5 | `node graph/conclave.js status --run <f>` | 6ドメインの批准状況・17相の done/⚖gate・`domains ratified: 6/6` | △(無視) | 33ms | 0 | 1,441B | 可 |
| 6 | `node graph/conclave.js next --run <f>` | 次に走る wave / `complete` | (既定JSON) | ~33ms | 0 | 96B | 可 |
| 7 | `node graph/daily-guard.js status` | 日次ノルマ・窓・owed(債務)・ledger位置・直近履歴 | △(無視) | 38ms | 0 | 565B | 可 |
| 8 | `node graph/daily-guard.js due` | **債務の機械判定** `{due,catchUp,owedDay,reason,jst}` | (既定JSON) | 39ms | **1** | 174B | 可 |
| 9 | `node graph/gauge.js ledger` | 創造物の点数履歴(5件) | ❌ | 35ms | 0 | 560B | 可 |
| 10 | `node graph/gauge.js score <run> --json` | `{score,complete,phasesTotal/Done,domainsRatified,firstPassRate,reworkCount,retryOverhead,loopGuardTrips,durationMs}` | ✅ | 32ms | 0 | 193B | 可 |
| 11 | `node graph/wiring.js check --json` | 門の合否 `{ok,orphans[],dangling[],map{engines,edges,surfaces}}` | ✅ | 42ms | 0 | 11,974B | 可 |
| 12 | `node graph/vendor.js verify` | 独立性 `vendored files: 130 = harness 62 + tools 68` | ❌ | 34ms | 0 | 290B | 可 |
| 13 | `node graph/derived.js check` | 生成物依存の有無 | ❌ | 53ms | 0 | 188B | 可 |
| 14 | `node graph/check-agents.js` | 神官14名の実在・全相に主あり・発令到達 | ❌ | 34ms | 0 | 454B | 可 |
| 15 | `node graph/workspace.js resolve --json` | 創造物の住所 `{root,source,legacy,exists}` | ✅ | 27ms | 0 | 135B | 可 |
| 16 | `node graph/kg.js stats` | KG統計 `{nodes:99,edges:33,byType{...}}` | (既定JSON) | 31ms | 0 | 229B | 可 |
| 17 | `node graph/kg.js query ''` | 全99ノード(type/id/label/desc) | ❌(行形式) | 34ms | 0 | 19,089B | 可 |
| 18 | `node graph/lessons.js list` | 教訓65件 | ❌ | 32ms | 0 | 16,079B | 可 |
| 19 | `node graph/lessons.js export --out <f>` | 教訓65件 **完全JSON**(id/label/check/applies/kind/ts) | (--out先がJSON) | 33ms | 0 | ファイル | 可 |
| 20 | `node graph/spawn-trace.js report <run>` | 起動実績 observed/asserted-only/no-trace の三値 | ❌ | 30ms | **1** | 1,200B | 可 |
| 21 | `node graph/export-state.js` | state.json + state.js を書き出す(副作用あり) | — | 34ms | 0 | 0B | 可(要注意) |
| — | `node -e 0` (ベースライン) | — | — | **27ms** | 0 | 0B | — |

> **読み方**: ベースライン(node の起動そのもの)が 27ms。engine の実処理は **どれも 0〜26ms しか足していない**。
> 唯一 census.js だけが桁違いに外れている。

### 教主による独立実測(別走行・照合用)

同じ engine を教主が別途実測した値。本書のベンチ(median, 3回)と**独立に取られたもの**で、傾向は完全に一致する。

| コマンド | 本書のベンチ (median) | 教主実測 | 一致 |
|---|---|---|---|
| `census.js` (自己診断込み) | 120,072ms | **120,072ms** | ✅ 完全一致 |
| `tests/paradise.test.js` 単体 | (未計測) | **282,000ms (282秒)** | — |
| `clergy.js college` | 33ms | 58ms | ✅ 同オーダー |
| `daily-guard.js status` | 38ms | 73ms | ✅ 同オーダー |
| `gauge.js ledger` | 35ms | 56ms | ✅ 同オーダー |
| `vendor.js verify` | 34ms | 56ms | ✅ 同オーダー |
| `derived.js check` | 53ms | 73ms | ✅ 同オーダー |
| `check-agents.js` | 34ms | 71ms | ✅ 同オーダー |
| `kg.js query` | 34ms | 54ms | ✅ 同オーダー |

**二重実測から言えること**: engine の実行時間は走行ごとに 30〜70ms の帯に収まり、**最悪でも 73ms**。
census.js だけが **1,600〜3,600倍** 外れている。この結論は2つの独立した走行で再現された。
`tests/paradise.test.js` が単体 282秒である以上、census.js の timeout:120000 は**構造的に必ず打ち切られる** — 偶発的な遅さではない。

## A-2. 実出力(引用)

### census.js — 120秒かかる上に creations を 0 と言う
```
$ node graph/census.js show            # ms=120082 (教主実測 120,072ms と一致)
═══════ 🔢 PARADISE CENSUS ═══════
  constitution articles : 50
  self-test             : (not run)
  engines (graph/*.js)  : 33
  creations             : 0
  overlay agents/cmds   : 21 / 5
  vendored files        : 130 {"agents":9,"commands":15,"skills":11,"rules":8,"hooks":3,"scripts":3,"contexts":3}
══════════════════════════════════
```
原因は `graph/census.js:43-44`:
```js
const out = execFileSync(process.execPath, [path.join(ROOT, 'tests', 'paradise.test.js')],
  { encoding: 'utf8', cwd: ROOT, timeout: 120000 });
```
自己診断 `tests/paradise.test.js` (単体 **282秒**、教主実測) を子プロセスで丸ごと回し、**timeout:120000 に達して打ち切られる**。だから `self-test : (not run)` と出る。
2回目の実行では打ち切られた子プロセスのスタックトレースまで漏れた:
```
file:///C:/.../overlay/vendor/archify/bin/visual-check.mjs:476
    this.cdp.failAll(new Error('visual-check finished'));
Error: visual-check finished
```
→ **census は自己診断ごとブラウザまで起動している**。ダッシュボードの同期経路に置けば画面が2分固まる。

### creations の住所欠陥 — 8件あるのに 0
```
$ ls -d ../paradise-creations/*/
../paradise-creations/_scratch/   coin/   habit/   pomodoro/
reform-claude-md-diet/   reform-eval-gauge/   rps/   tenbin/
count: 8

$ node graph/workspace.js resolve --json      # 27ms — 正しい住所を知っている
{ "root": "C:\\Users\\kikus\\Documents\\workspace\\paradise-creations",
  "source": "sibling", "legacy": false, "exists": true }

$ ls creations
ls: cannot access 'creations': No such file or directory     ← 旧住所は存在しない
```
`graph/census.js:75` と `graph/export-state.js:32` が **旧住所 `ROOT/creations` を直に見ている**:
```js
// census.js:75
return fs.readdirSync(path.join(ROOT, 'creations'), { withFileTypes: true })
// export-state.js:32
const dir = path.join(ROOT, 'creations');
```
結果:
```
$ node graph/export-state.js
state exported -> dashboard/state.json  (+ state.js)  (nodes:99 edges:33 lessons:65 creations:0)
$ node -e "console.log(require('./dashboard/state.json').creations.length)"
0
```
**実在8 / 表示0 — 乖離は∞(0除算)。** `workspace.js` は正解を知っているのに、この2つだけが独自に住所を持っている(第30条違反)。

### 位階(clergy.js college)— 33ms・7枢機卿+1執行官
```
枢機卿 discovery: Discovery (調査)
  governs: discover / priests: market-researcher / reviewed-by: pontiff
  PDCA: plan: frame questions → do: research → check: are must-haves grounded? → act: refine or widen search
... (requirements / architecture / construction / quality / counsel / cartography)
執行官 tribunal: Tribunal (断罪機関)
  governs: reflect, verdict / officers: self-critic, creation-judge
```
`--json` を付けても **出力は1バイトも変わらない**(実測: 両方とも同一の人間向けテキスト)。

### 道(forge.js)— 33ms・既定でJSON
```
$ node graph/forge.js plan "x" --scale standard
{"meta":{"wish":"x","scale":"standard","gates":["discover","design","verify","reflect","verdict"],"produces":"artifact"},...}
$ node graph/forge.js plan "x" --scale reform
{"meta":{"wish":"x","scale":"reform","gates":["discover","specify","design","prove","verify","reflect","verdict"],"produces":"artifact"},...}
$ node graph/forge.js scale "ダッシュボードを生きた門にせよ"
reform
```
reform は standard より2相多い(`specify` と **`prove`**)。**道の形そのものがダッシュボードに映せる事実**。

### 環(conclave.js status)— 33ms・conclave.json 5件実在
```
$ ls ../paradise-creations/*/conclave.json
coin/ habit/ reform-claude-md-diet/ reform-eval-gauge/ tenbin/     (5件、命題どおり実在)

$ node graph/conclave.js status --run ../paradise-creations/tenbin/conclave.json
✓ 枢機卿 discovery — Discovery (調査)   [review: pontiff]
     ✓ ⚖️ discover @market-researcher
... (17相)
domains ratified: 6/6
```
`--json` は**無視**される。ただし生の `conclave.json` は最初から構造化されている:
```
keys: [ 'meta', 'created', 'domains', 'history' ]   domains: 6
domains[0] = {seq,cardinal,domain,status:"ratified",reworks:0,phases:[{id,agent,goal,deps,gate,artifact,status,attempts,artifactPath}],reviewClass,pdca}
```
→ **ダッシュボードは conclave.js を呼ばずに conclave.json を直読みできる**(最速・0プロセス)。

### 日次ノルマの債務(daily-guard.js)— 38ms
```
$ node graph/daily-guard.js status
  now (JST)   : 2026-09-02 16:03 JST
  window      : every day at 22:00 JST (missed days stay owed)
  newest open : 2026-09-01
  last run    : 2026-09-01 @ 2026-09-01 22:08 JST
  owed now    : no — already ran for 2026-09-01
  ledger      : C:\Users\kikus\.claude\paradise-daily.json
    2026-09-01 22:08 JST  PR #27 第45条・発令者リースの死角を塞ぐ
    2026-08-31 07:24 JST  PR #4 自己審査のスコープ盲点を修復・憲法第14条

$ node graph/daily-guard.js due          # ← こちらは既定でJSON、exit code が判定
{"due":false,"catchUp":false,"owedDay":"2026-09-01","reason":"already ran for 2026-09-01","jst":"2026-09-02 16:03 JST"}
exit=1
```
**重要**: `due` は exit **1** を「債務なし」に使っている。exit code を成否と誤読すると赤く光る。
**リースについて — 測れなかった**: `claim/release` は排他リースを実際に取得してしまう副作用があるため、他プロセスを締め出す危険を避けて実行しなかった。`status` の出力にリース保持者の欄が現れないため、**現在のリース保持者がダッシュボードから読めるかは未確認**。第45条(発令者リース)の状態表示は specify 相で要調査。

### 点数(gauge.js)— 32〜35ms・唯一の完全な `--json`
```
$ node graph/gauge.js ledger
  2026-08-31T13:54  100/100  coin (standard)
  2026-08-31T13:54   45/100  habit (standard)
  2026-08-31T13:54   80/100  reform-eval-gauge (reform)
  2026-08-31T14:01  100/100  reform-eval-gauge (reform)
  2026-09-01T03:39  100/100  tenbin (full)

$ node graph/gauge.js score ../paradise-creations/tenbin/conclave.json --json
{"score":100,"complete":true,"phasesTotal":17,"phasesDone":17,"domainsTotal":6,
 "domainsRatified":6,"firstPassRate":1,"reworkCount":0,"retryOverhead":0,
 "loopGuardTrips":0,"durationMs":13520919}
```
`baseline` は ledger と同じ表示だが **タイムスタンプが再計算される**(`2026-09-02T07:03` になった) — 表示上ほぼ同一なので取り違えに注意。

### 門の合否 — 全て緑・42〜53ms
```
$ node graph/wiring.js check --json
{"ok":true,"orphans":[],"dangling":[],"map":{"engines":[33件...],"edges":[26件],"surfaces":[8面]}}

$ node graph/vendor.js verify
vendored files: 130 = harness 62 + tools 68 {"archify v2.16.0":68}
  ✓ paradise stands on its own — no path leads back to the borrowed tree

$ node graph/derived.js check
  ✓ no test asserts on derived content

$ node graph/check-agents.js
agents dir: C:\Users\kikus\.claude\agents
named by the paradise: 14 (forge.js + clergy.js + examples)
  ✓ all present / ✓ every phase has a master / ✓ every dispatch reaches the declared priest
  ✓ the hierarchy is real, not declared
```
`wiring.js check --json` は **engine 33件の依存グラフ全体(11,974B)を42msで吐く** — ダッシュボードの結線図の原料そのもの。

### 知識グラフ(kg.js)— 31〜34ms
```
$ node graph/kg.js stats
{"root":"C:\\Users\\kikus\\.claude\\paradise-kg","nodes":99,"edges":33,
 "byType":{"system":4,"component":11,"decision":8,"run":3,"creation":7,"verdict":1,"lesson":65}}

$ node graph/kg.js query '' | head
[system] paradise: The Paradise harness — harness+loop+graph engineering system on this PC
[component] graph-engine: Graph orchestration engine — topological wave scheduler for agent DAGs
[decision] no-db: No database rule — memory stays git-native JSONL, zero external services
[run] dashboard-run: Paradise Live Dashboard build — 4-task DAG, 3 waves...
[creation] pomodoro: Pomodoro timer (SHIPPED) — 小さき声から生まれSHIP裁定を受けた最初の創造物
[verdict] pomodoro-verdict: Verdict: SHIP — AC-1..7 live-verified, 10/10 tests, no secrets
```
**実体(監視すべきファイル)**:
```
$ ls -la ~/.claude/paradise-kg/ && wc -l ~/.claude/paradise-kg/*.jsonl
-rw-r--r--   442  8月 31 00:12 cochange.jsonl        5 行
-rw-r--r--  2884  9月  1 22:49 edges.jsonl          33 行
-rw-r--r-- 41769  9月  2 14:08 nodes.jsonl          99 行
-rw-r--r-- 31365  9月  1 08:09 nodes.jsonl.bak.lexicon   (バックアップ)
```
→ **JSONL は追記型。`nodes.jsonl` を fs.watch すれば「記憶が増えた瞬間」を捉えられる。**
`kg.js query ''` は行形式で `--json` なし。**構造化が要る場合は JSONL を直読みするのが正しい**(engine 経由より速く、かつ完全)。

### 教訓(lessons.js)— 32ms・export だけが完全JSON
```
$ node graph/lessons.js export --out $LOCALAPPDATA/Temp/pd-lessons.json
exported 65 lesson(s) -> C:\Users\kikus\AppData\Local/Temp/pd-lessons.json
[ { "id":"require-discovery","label":"調査フェーズを飛ばすな","check":"findings",
    "applies":null,"kind":"mechanism","ts":"2026-08-30T13:42:29.309Z" }, ... 65件 ]
```
`kind` は `mechanism` / `conduct` の2値(第28条: 規範の教訓は grep で裁けない)。
**`list` は人間向け、`export --out` だけが構造化**。ダッシュボードは export を使うべき。

### 起動実績(spawn-trace.js)— 30ms・**楽園の最大の赤**
使い方を engine 冒頭のコメントで確認した(`graph/spawn-trace.js:19-21`):
```
node graph/spawn-trace.js record <run.json> <phase> --agent <name> --tool-use-id <id>
node graph/spawn-trace.js verify <run.json> <phase>     # 起動されたか（無ければ exit 1）
node graph/spawn-trace.js report <run.json>             # 全相の起動状況
```
実行:
```
$ node graph/spawn-trace.js report ../paradise-creations/tenbin/conclave.json
═══════ 👁  SPAWN TRACE ═══════
phases: 17   observed: 0   asserted-only: 0   no-trace: 17
  🔴 discover     この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない
  ... (17相すべて 🔴)
17 phase(s) bypassed the hierarchy — the ladder was declared but not walked
exit=1
```
→ **gauge は 100/100 と言うが spawn-trace は 17/17 赤**。この二つを並べて出すのがダッシュボードの本分。

**発見した engine 側の欠陥**: `run.json` 形式(旧 orchestrator)を渡すとクラッシュする。
```
$ node graph/spawn-trace.js report ../paradise-creations/rps/run.json
TypeError: (list || []) is not iterable
    at collect (graph/spawn-trace.js:86:52)
```
`spawn-trace.js:86` は `run.domains[].phases` (conclave形式) しか想定しておらず、`run.json` の形を見ていない。**ダッシュボードが全 run を舐めるなら必ず踏む**。

## A-3. 現行ダッシュボードの実測 — 何が死んでいるか

### index.html の数値は engine ではなく `paradise.js` のハードコード
```js
// dashboard/paradise.js:14-39
metrics: [ {k:'agents',v:9}, {k:'commands',v:16}, {k:'skills',v:13}, {k:'rules',v:8}, {k:'hooks',v:14} ]
metrics: [ {k:'lifecycle events',v:6}, {k:'verification phases',v:6} ]
metrics: [ {k:'engines',v:2}, {k:'self-tests',v:10} ]
```
**実測との乖離**:
| 看板の主張 | 実測 | 出所 | 乖離 |
|---|---|---|---|
| engines **2** | **33** | `ls graph/*.js` | **16.5倍** |
| self-tests **10** | **210** (宣言) / 268 (test()呼出数) | `tests/paradise.test.js` | **21〜27倍** |
| agents **9** | **30** | `ls ~/.claude/agents/*.md` | 3.3倍 |
| commands **16** | **19** | `ls ~/.claude/commands/*.md` | — |
| skills **13** | **13** | `ls -d ~/.claude/skills/*/` | 一致(偶然) |
| creations (表示なし) | **8** | `../paradise-creations/*/` | state.json は **0** |

さらに `index.html` が描く「Live Graph Execution」は engine の DAG ではなく、`paradise.js:107` の **架空の4タスクDAG**:
```js
const SELF_DAG = { meta:{goal:'Build the Paradise Live Dashboard'},
  tasks:[{id:'scaffold',...},{id:'ui',...},{id:'kg-learn',...}, ...] };
```
実際の道は forge.js が吐く **reform=13相 / standard=9相**。**画面の "Live" は一度も live だったことがない。**

### control.html は state.js を1回読むだけ・リアルタイム機構ゼロ
```
$ grep -n "state.js|fetch|EventSource|setInterval" dashboard/control.html
426:  <script src="state.js"></script>
754:    if (typeof fetch === "function") { fetch("state.json") ... }
```
`EventSource` **0箇所**、`setInterval` **0箇所**。生成時刻 `"generated":"2026-09-02T07:03:56.028Z"` で凍結している。
ただし **file:// フォールバックの思想は既に実装されている**(743-744行) — これは活かせる資産:
> `The companion state.js (which sets window.PARADISE_STATE) was not found, and fetch('state.json') is blocked over file:// in this browser.`

### 外部依存 — atlas 6枚に Google Fonts 18箇所(掟違反)
```
$ grep -c "fonts.googleapis|fonts.gstatic" dashboard/atlas/*.html
conclave.html:3   dag.html:3   dispatch.html:3
hierarchy.html:3  run.html:3   wiring.html:3      → 6枚 × 3 = 18箇所
```
(`*.visual-check.html` は 0 — 生成器が別経路)

### 相互リンク 0
```
$ grep -noE 'href="[^"]*"' dashboard/index.html
(出力なし)
```
index.html には **リンクが1本も無い**。control.html にも atlas にも辿り着けない。

---

# B. 外部調査 — 依存ゼロでリアルタイムを実現する手法

## B-1. node標準ライブラリのみの HTTP + SSE(**実証済み**)

### 出典
- MDN *Using server-sent events* — https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- WHATWG HTML (data行の連結仕様) — https://html.spec.whatwg.org/multipage/#dispatchMessage

### 仕様(MDNより引用)
- **MIME**: 「The server-side script that sends events needs to respond using the MIME type `text/event-stream`.」
- **メッセージ区切り**: 「Each notification is sent as a block of text terminated by a **pair of newlines**」(`\n\n`)
- **`retry:` フィールド**: 「The reconnection time. If the connection to the server is lost, **the browser will wait for the specified time before attempting to reconnect**. This must be an integer, specifying the reconnection time in milliseconds. If a non-integer value is specified, the field is ignored.」
- **自動再接続は既定動作**: 「By default, **if the connection between the client and server closes, the connection is restarted**. The connection is terminated with the `.close()` method.」 → **EventSource は切断を自力で埋める。楽園側に再接続ロジックは要らない。**
- **`id:`** — 「The event ID to set the EventSource object's last event ID value.」(再接続時に `Last-Event-ID` ヘッダで送り返される → 差分再送が可能)
- **コメント行によるキープアライブ**: 「A colon as the first character of a line is in essence a comment, and is ignored. … can be used to prevent connections from timing out」
- **接続数上限(重要な落とし穴)**: 「When **not used over HTTP/2**, SSE suffers from a limitation to the maximum number of open connections … the limit is **per browser** and is set to a very low number (**6**)」 → **タブを7枚開くと7枚目が沈黙する。** 単一HTML主義の楽園でもタブ複数開きは起きうる。
- **命名イベント**: `event: <name>` を付けると `addEventListener('<name>')` で受ける。無指定は `onmessage`。

### 楽園環境での実測(`_probe-sse.js` を書いて実行)
```json
{ "node": "v24.14.0", "status": 200,
  "headers": { "content-type": "text/event-stream", "cache-control": "no-cache",
               "connection": "keep-alive", "x-accel-buffering": "no",
               "transfer-encoding": "chunked" },
  "chunk_arrival_ms": [6, 6, 105, 205, 305],
  "chunk_count": 5, "streamed_incrementally": true,
  "raw_stream": "retry: 1000\n\n: keep-alive comment\n\nevent: state\nid: 1\ndata: {\"n\":1,...}\n\n..." }
```
**判明したこと**:
- `require('http')` **だけ**で SSE サーバが立つ。npm 依存ゼロで掟に完全適合。
- Node が **自動で `Transfer-Encoding: chunked` を付ける** — `Content-Length` を書いてはいけない。
- チャンクは **6ms / 105ms / 205ms / 305ms と逐次到着**(バッファリングされていない)。`res.write()` がそのまま流れる。
- 必須ヘッダ実測: `Content-Type: text/event-stream` + `Cache-Control: no-cache` + `Connection: keep-alive`。
  `X-Accel-Buffering: no` はリバースプロキシ対策(ローカル直結では不要だが害はない)。
- `server.listen(0)` でポート自動割当が効く(固定ポート衝突を避けられる)。

## B-2. fs.watch / fs.watchFile の Windows 挙動(**実証済み**)

### 出典
- The Node Book *Watching Files and Atomic Writes in Node.js* — https://thenodebook.com/file-system/watching-atomic-writes
- StackOverflow *fs.watch fired twice when I change the watched file* — https://stackoverflow.com/questions/12978924/fs-watch-fired-twice-when-i-change-the-watched-file/32794392
- fixdevs *Fix: Node.js fs.watch Not Working* — https://fixdevs.com/blog/nodejs-fs-watch-not-working

### 文献の主張
- Windows は **ReadDirectoryChangesW** を使う。「The API is **buffer-based and asynchronous**. If events arrive faster than you drain them, **the buffer can overflow**. Windows reports this as `ERROR_NOTIFY_ENUM_DIR`; by then, the specific change records are gone and **the safe recovery path is a directory rescan**.」(The Node Book)
- 「the windows case being a result of windows design, where **a single file modification can be multiple calls to the windows API**」(StackOverflow, 48票)
- 「There's **no way to tell from the event alone whether the file was deleted versus renamed** - it's all 'rename'.」(The Node Book)
- 「**Sometimes filename is null**, depending on the platform.」(同上)
- 語彙は `change` と `rename` の **2種類だけ**。「Two event types for every possible filesystem operation. That's the entire vocabulary Node gives you.」
- 推奨対処: 「Combine events with **stat/readdir and debounce logic**」(Quora/Node挙動要約)、mtime 比較による重複排除(StackOverflow回答)。

### 楽園環境での実測(`_probe-watch.js`)
```json
{ "platform": "win32", "node": "v24.14.0",
  "counts": { "file_watch_total": 6, "file_watch_change": 4, "file_watch_rename": 2, "dir_watch_total": 9 },
  "filename_null_count": 0 }
```
| 操作 | ファイル監視の発火 | ディレクトリ監視の発火 |
|---|---|---|
| `writeFileSync` ×1 (200ms時) | `change` ×**2** (201ms, 202ms) | `change` ×2 |
| `writeFileSync` ×1 (500ms時) | `change` ×**2** (502ms, 502ms) | `change` ×2 |
| atomic write (`tmp`書込→`rename`) | **`rename` ×2** (901ms, 901ms) | 5イベント (`.tmp` の rename/change/rename + 本体 rename×2) |

**結論(実測に基づく)**:
1. **Windows では 1回の書き込みが必ず 2イベントになる。** 例外なく2倍。デバウンス無しは実装不可。
2. **atomic write (rename) は `change` ではなく `rename` を出す。** `export-state.js` が安全書き込みに切り替えた瞬間、`change` だけ見るウォッチャは沈黙する。→ **両方を等しく扱え**。
3. **同一ms内に2発**(901ms, 901ms)。時刻差での抑制は効かない → **タイマー式デバウンス(50〜100ms)が必須**。
4. `filename` は本環境では **null にならなかった**(6/6で `state.json`)が、文献はnullを警告 → **null耐性は入れておく**。
5. ディレクトリ監視は `.tmp` の中間状態まで見える(9イベント)。**監視対象は「見たいファイルそのもの」に絞る**べき。
6. ファイル自体を rename で置換されると **inode が変わり監視ハンドルが古いファイルに残る**(Node Book の rename 曖昧性) → **rename を受けたら watcher を張り直す**。

## B-3. `file://` の制約とフォールバック設計

### 出典
- WHATWG HTML issue #3099 *Define behavior for `file://` documents' origin* — https://github.com/whatwg/html/issues/3099
- CORS Handbook *CORS and file://* — https://cors-handbook.com/posts/cors-for-file-protocol/
- MDN CORS — https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS

### 判明した制約(WHATWG issue #3099 のブラウザ別実測記録より引用)
| ブラウザ | `window.origin` | `fetch()` を file:// に | localStorage |
|---|---|---|---|
| **Chrome** (=Brave の基盤) | `null` | 「**returns a network error** when calling `fetch()` on `file:///...`」 | file:// 間で共有 |
| Firefox | `null` | 同ディレクトリ配下のみ許可、親は network error | 同/下位ディレクトリにスコープ |
| Safari | `null` | 全て network error | **全 file:// でブロック** |
| Edge | `file://` | 「**times out** for reasons I can't figure out」 | 全 file:// で共有 |

- CORS Handbook: 「A page loaded from `file:///...` **does not behave like a normal web app**. Browsers treat `file://` as a special origin, and in many cases as an **opaque origin** … That `origin 'null'` is the giveaway.」
- 同: 「**Static HTML demo with no network calls? `file://` is fine.** Anything using fetch, auth, cookies, or APIs? Serve it over HTTP.」

### EventSource の可否 — 論理的帰結(直接の実測はしていない = **測れなかった**)
`EventSource` は Fetch 仕様の上に定義され、`http://127.0.0.1:PORT` への接続は file:// (origin `null`) から見て **クロスオリジン**になる。
→ サーバ側で `Access-Control-Allow-Origin: *`(または `null`)を返さない限りブロックされる。
→ ただし CORS Handbook は「reject `null` unless there's a very specific, reviewed reason」と警告しており、**ローカル専用サーバなら `*` で足りる**(認証情報を載せないため `credentials` 制約に触れない)。
**本 discover 相では実ブラウザで file:// → localhost SSE を試していない。これは prove 相で必ず実測すべき未確認事項。**

### ゆえに要求される三層フォールバック設計
```
第1層: EventSource('http://127.0.0.1:PORT/events')  ← サーバ在: 真のリアルタイム
   ↓ onerror が連続 / EventSource 未定義
第2層: fetch('http://127.0.0.1:PORT/state.json') を setInterval  ← SSEだけ落ちた場合
   ↓ fetch が TypeError (file:// でブロック)
第3層: window.PARADISE_STATE (state.js を <script> で読む)  ← サーバ無し・file://直開き
        「凍結された写し」と明示し、generated 時刻と経過を表示する
```
第3層が成立する根拠: `<script src>` は CORS を経由しない(MDN: `<script>` タグはクロスオリジン送信が許可される古い例外)。**control.html:426 が既にこの手を使っている** — 設計は再発明ではなく既存資産の格上げ。

## B-4. 2025-2026年のエージェント監視ダッシュボード UXパターン

### 例1: Zylos Research *Agentic UX: Frontend Design Patterns for AI Agents in 2026* (2026-05-28)
https://zylos.ai/en/research/2026-05-28-agentic-ux-frontend-design-patterns-ai-agents

- **数字の裏付け**: 「Research from the Augment Code team found that agent sessions with **no mid-run visibility produced 3× the user abandonment rate** of sessions with live progress panels — **even when the final output quality was identical**.」
  → 「見えないこと」自体が実害。出力品質が同じでも3倍捨てられる。
- **2026年の最低ライン(引用)**:
  - 「**Live tool execution visibility**: Each tool call shown with **inputs, outputs, and elapsed time**」
  - 「**Progress and confidence signals**: Clear indicators of **what the agent has done, what remains**, and how confident it is」
  - 「**Step-level intervention**」「**Graceful approval gates**」
- **Activity Panel の分離**: 「agent interfaces require a **dedicated activity panel, separate from the conversation thread**. … Conflating the two creates cognitive overload and makes it **impossible to audit** what the agent did」
- **「更新中」の示し方への直接の批判**: 「**displaying 'Agent is working...' is not transparency**」
  → **スピナーは禁じ手。何を待っているかを名指しせよ。**
- 旧来チャットUIの失敗として名指しされたもの: 「**No state visibility** … just a **spinning indicator and hope**」

### 例2: Braintrust *Agent observability: The complete guide for 2026*
https://www.braintrust.dev/articles/agent-observability-complete-guide-2026

- **エージェント監視は APM とは別物**: 「Datadog and New Relic capture infrastructure signals like request rate, latency percentiles… Agent observability captures the agent's **semantic behavior**: which tool it picked, what arguments it passed, what came back, and **how the next reasoning step changed in response**.」
- **トレースの四本柱** — トップに置くべき情報の類型:
  1. **Tool calls**: 「Name, arguments, return values, latency, **retries**」
  2. **Reasoning steps**: 「plan-act-observe transitions, **branches**」
  3. **State transitions**: 「Working memory before and after each step」
  4. **Memory operations**: 「Reads, writes, semantic search hits, retrieval scores, and **freshness**」
- **生死の示し方**: 「Each tool span should record the tool name, arguments, raw output, duration, **retry count, and error state**. Without that data, **hallucinated arguments and silent retry loops blend into normal traffic**.」
  → **沈黙した失敗が正常に紛れる**のが最大の敵。楽園でいえば「gauge 100点 / spawn-trace 全赤」がまさにこれ。
- **鮮度(freshness)を一級市民として扱う**: メモリ操作の記録項目に `freshness` が明示され、「**stale reads**」を検出対象に挙げている。

### 例3: OpenTelemetry *AI Agent Observability — Evolving Standards and Best Practices* (2025)
https://opentelemetry.io/blog/2025/ai-agent-observability/
- エージェント可観測性の標準化が2025年に業界課題として立ち上がったこと自体が出典。信頼性・効率・**trustworthiness** を目的に置いている。

### 3例から抽出した設計則(楽園への翻訳)
| 業界のパターン | 楽園での対応物 |
|---|---|
| トップは「今何が起きているか」= 実行中スパン | 現在走行中の conclave run と、その wave |
| 生死は「retry count + error state」で示す | `spawn-trace` の 🔴/observed、`gauge` の reworkCount/loopGuardTrips |
| 「Agent is working...」は透明性ではない | 「census を待っている(120秒)」と**名指し**する |
| freshness を記録項目に持つ | `generated` 時刻と**今からの経過秒**を常時表示 |
| Activity Panel を会話から分離 | 「数の看板」と「走行中の環」を別領域に分ける |

---

# C. 要求候補リスト(優先度付き)

## 🔴 must-have(これが無ければ「生きた門」ではない)

| ID | 要求 | 根拠(実測 / 出典) |
|---|---|---|
| 🔴 R-01 | **index.html の全数値をハードコードから engine 実出力へ置換する** | `paradise.js:14-39` が engines=2/self-tests=10 と主張。実測 33 / 210。**16.5〜21倍の虚偽** |
| 🔴 R-02 | **`census.js` をダッシュボードの同期経路に置かない** | 実測 **120,072ms**(`census.js:43-44` が tests を timeout:120000 で回し打ち切られる)。単体テストは282秒。画面が2分固まる |
| 🔴 R-03 | **creations の住所を `workspace.js` に一本化する**(census.js:75 / export-state.js:32 の `ROOT/creations` 直書きを撤廃) | 実在8件 / 表示0件。`workspace.js resolve --json` は27msで正解を返している。第30条 |
| 🔴 R-04 | **鮮度(freshness)を常時表示する** — `generated` 時刻と**今からの経過**、および「生 / 凍結」の別 | 現 state.json は `2026-09-02T07:03:56` で凍結。Braintrust が `freshness` を記録項目に明示 |
| 🔴 R-05 | **file:// で開いても壊れない三層フォールバック**(EventSource → fetch → `window.PARADISE_STATE`) | WHATWG#3099: Chrome は file:// からの fetch を **network error**、origin は `null`。control.html:743 に思想は既在 |
| 🔴 R-06 | **node標準ライブラリのみでサーバを実装する**(`require('http')`。npm依存ゼロ) | `_probe-sse.js` で実証: http のみで SSE が 6/105/205/305ms と逐次配信された |
| 🔴 R-07 | **SSE の必須ヘッダを正しく出す**: `Content-Type: text/event-stream` / `Cache-Control: no-cache` / `Connection: keep-alive`。`Content-Length` を書かない | MDN + 実測(Node が自動で `Transfer-Encoding: chunked` を付与) |
| 🔴 R-08 | **fs.watch のデバウンス(50〜100ms)を必ず入れ、`change` と `rename` を等価に扱う** | 実測: Windows は1書込につき**必ず2イベント**(同一ms内に2発あり)。atomic write は `rename` のみを出す |
| 🔴 R-09 | **Google Fonts 18箇所を除去する**(atlas 6枚 × 3) | `grep -c` 実測。外部依存ゼロの掟に違反 |
| 🔴 R-10 | **`gauge` の点数と `spawn-trace` の起動実績を同じ画面に並べる** | tenbin は gauge **100/100** かつ spawn-trace **17/17 赤**。Braintrust:「silent retry loops blend into normal traffic」 |

## 🟠 should(あるべき)

| ID | 要求 | 根拠 |
|---|---|---|
| 🟠 R-11 | **相互リンクを張る**(index ⇄ control ⇄ atlas 6枚) | `grep href` で index.html のリンク **0本** |
| 🟠 R-12 | **「更新中」をスピナーで誤魔化さず、待っている対象を名指しする** | Zylos:「displaying 'Agent is working...' **is not transparency**」「just a spinning indicator and hope」 |
| 🟠 R-13 | **走行中の環(conclave)をトップに置く** — 6ドメイン批准・17相の done/gate | `conclave.js status` 33ms。`conclave.json` は `{meta,created,domains,history}` で既に構造化済み(engine を呼ばず直読み可) |
| 🟠 R-14 | **日次ノルマの債務を出す**(`daily-guard.js due` の JSON)。ただし **exit 1 = 債務なし** を誤読しない | 実測 `{"due":false,...}` かつ **exit=1** |
| 🟠 R-15 | **門の合否を一列に並べる**(wiring / vendor / derived / check-agents / workspace) | 全て 27〜53ms、合計でも 200ms 以下。現在は全緑 |
| 🟠 R-16 | **KG の JSONL を直接監視する**(`~/.claude/paradise-kg/nodes.jsonl` 99行) | 追記型JSONL。engine 経由(`kg.js query`)は行形式で `--json` なし。直読みの方が速く完全 |
| 🟠 R-17 | **教訓は `lessons.js export --out` を使う**(`list` ではなく) | `export` のみが `{id,label,check,applies,kind,ts}` の完全JSON。65件 |
| 🟠 R-18 | **SSE の同時接続 6 の上限を設計に織り込む**(タブ多重時の挙動) | MDN:「the limit is **per browser** and is set to a very low number (**6**)」 |
| 🟠 R-19 | **`retry:` を明示して再接続間隔を制御する**。再接続そのものは EventSource 任せにする | MDN:「By default, if the connection … closes, the connection is restarted」 |
| 🟠 R-20 | ~~`spawn-trace.js report` が `run.json` 形式でクラッシュする欠陥を修理する~~ **【教主により棄却 — 再現せず】** | 第27条により教主が照合。`spawn-trace.js:86` は `for (const p of list \|\| [])` で既にガード済み。実在する run.json 6件(creations 5 + 本reform 1)すべてで `TypeError` の発生は **0件**。代わりに判明した真の事実は「tenbin は gauge 100/100 でありながら **17相すべてが起動証跡なし**」— これは engine の欠陥ではなく **観測されるべき赤そのもの**であり、R-10 が扱う |
| 🟠 R-21 | **`--json` が無視される engine に真の JSON 出力を足す**(clergy college / conclave status / daily-guard status) | 実測: フラグを付けても出力が **1バイトも変わらない**。パースに正規表現を強いる |

## 🟡 nice(あれば良い)

| ID | 要求 | 根拠 |
|---|---|---|
| 🟡 R-22 | **`id:` と `Last-Event-ID` による差分再送** | MDN: 再接続時にサーバへ返される。全量再送を避けられる |
| 🟡 R-23 | **キープアライブのコメント行**(`: ping\n\n`)を定期送出 | MDN:「can be used to prevent connections from timing out」 |
| 🟡 R-24 | **`server.listen(0)` によるポート自動割当**(固定ポート衝突の回避) | `_probe-sse.js` で動作確認済み |
| 🟡 R-25 | **道(scale)の形を可視化する** — reform は standard より2相多い(`specify`, `prove`) | `forge.js plan` 実測: standard 5門 / reform 7門 |
| 🟡 R-26 | **`gauge score --json` の軌跡指標を出す**(firstPassRate / reworkCount / retryOverhead / loopGuardTrips) | 既に完全JSON。第38条「改善は前後数値で語れ」 |
| 🟡 R-27 | **ReadDirectoryChangesW のバッファ溢れからの復帰**(全面再走査) | The Node Book:「Windows reports this as `ERROR_NOTIFY_ENUM_DIR` … the safe recovery path is a **directory rescan**」 |
| 🟡 R-28 | **`filename` が null になる場合への耐性** | 本環境では 6/6 で非null だったが、文献はnullを警告 |
| 🟡 R-29 | **`gauge baseline` と `ledger` の表示がほぼ同一で紛らわしい点の区別** | 実測: baseline はタイムスタンプが再計算され `2026-09-02T07:03` になる。取り違えの罠 |

---

# D. 測れなかったもの(正直な申告)

| 項目 | なぜ測れなかったか |
|---|---|
| **file:// → localhost への EventSource の実可否** | 実ブラウザ(Brave)で file:// のHTMLから localhost SSE に繋ぐ検証をしていない。B-3 の記述は仕様と文献からの**論理的帰結**であって実測ではない。**prove 相で必ず実機検証すること** |
| **daily-guard のリース(claim/release)の状態** | `claim` は排他リースを実際に取得する副作用があり、走行中の他プロセスを締め出す危険があるため実行を見送った。第45条(発令者リース)の保持者がダッシュボードから読めるかは**未確認** |
| **`tests/paradise.test.js` の完走時間** | 教主実測値 **282秒** を引用。本 discover では完走させていない(census 経由で 120秒打ち切りを2回確認したのみ) |
| **atlas 6枚の visual-verify の 5 gap + 1 smell の内訳** | context として与えられた既知欠陥。本相では visual-verify を実行していない |
| **SSE 同時接続 6 上限の実挙動** | MDN の記述を引用したのみ。7タブ同時に開いての実測はしていない |
| **`orchestrator.js` / `synod.js` / `critic.js` / `verdict.js` の実行時間** | 指定された最低限リストに含まれず、副作用(run状態の書き換え)を伴うため見送った |
| **census.js を3回計測した中央値** | 1回120秒かかるため打ち切った。2回の実行がいずれも 120,072〜120,088ms で一致したため、この値を採用 |

---

# E. specify 相への引き継ぎ

**この discover が渡す確定事実は3つ:**

1. **engine は既に十分速い(27〜53ms)。ボトルネックは engine ではなく「誰も呼んでいないこと」。**
   毎秒ポーリングでも実質 node 起動代しかかからない。唯一 census.js(120秒)だけを非同期側に隔離すればよい。
2. **依存ゼロのリアルタイムは実現可能で、実証済み。** `require('http')` のみで SSE が逐次配信された。
   ただし file:// を捨ててはならない — **三層フォールバックが仕様の中心**になる。
3. **最大の欠陥は速度でも技術でもなく「嘘」。** engines 2(実33)、self-tests 10(実210)、creations 0(実8)。
   刷新の第一の acceptance criterion は「**画面に出る全ての数が、その場で走った engine の出力と一致すること**」であるべき。

**未確認事項として prove 相に必ず渡すもの**: file:// からの EventSource 実可否(実ブラウザ検証)、daily-guard のリース可視性。
