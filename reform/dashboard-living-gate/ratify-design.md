# ratify-design.md — design 相成果物の審査報告(requirements 枢機卿)

- **審査対象**: `reform/dashboard-living-gate/design.md`(47206 B) / `identity.md`(24395 B) / `ux.md`(28820 B)
- **照合基準**: `requirements.md`(批准済み・125817 B)FR-01〜23 / NFR-01〜07 / PRE-01〜03 / G-01〜10 / AC 110 個
- **審査者**: requirements 枢機卿(憲法第11条 — architecture ドメインは自己批准できない)
- **機**: Windows 11 / git-bash / node v24.14.0
- **判定**: **reject** — **design 相へ差戻し**

> 本報告は走らせた実出力のみを根拠とする。教主が検証済みと明記した事項(identity.md の全28ペア
> コントラスト / 却下根拠 / `identity.js record` / atlas の git 実態 / R-2 の phasesTotal=17)は再測していない。
> **それ以外はすべて自分で叩いた。**

---

## §0. 判定の要旨

設計の**骨格は健全である**。常駐 require の速度、SSE の線材、三層フォールバックの判定条件、
G-04 の導線設計、第17条の分離 —— これらはこの機で実際に走らせて成立を確認した。

しかし **design.md が書いた engine 呼出コードを抜き出して実走させた結果、4 件が動かない**。
うち **1 件は例外を投げずに静かにゼロを返し、本改修の本分(FR-13 の「矛盾」)を構造的に殺す**。
加えて **FR-22 が 3 文書のどこにも現れない**(取りこぼし)。

**「設計に書いてある」ことと「設計が動く」ことは別である。** 後者を確かめた結果が本判定である。

| # | 欠陥 | 深刻度 | 根拠 |
|---|---|---|---|
| **D-1** | **FR-22 が設計に存在しない** | **差戻し** | `ledger` が design/ux/identity に **0 件** |
| **D-2** | `gauge.score(runPath)` は **throw する** | **差戻し** | 実走で例外。正は `score(JSON.parse(...))` |
| **D-3** | `spawn-trace.report(path)` は **静かに 0 を返す** | **差戻し(最重要)** | throw せず `noTrace:0`。矛盾が永久に false |
| **D-4** | gates 5 門のうち **2 門に `check()` が無い** | **差戻し** | `vendor.check` / `workspace.check` = undefined |
| **D-5** | `counts.creations` の**突合両辺が一致しない** | **差戻し** | node=9 / bash=8 / design の記載=7 |

---

## §1. 要件の網羅性(最重要)

### 1.1 機械的な ID 照合

3 文書に対し FR/NFR/PRE/G の ID 出現数を数えた:

```
$ for id in $(grep -oE "\b(FR|NFR|PRE|G)-[0-9]+" requirements.md | sort -u -V); do
    printf "%-8s %s %s %s\n" "$id" $(grep -c "$id" design.md) $(grep -c "$id" ux.md) $(grep -c "$id" identity.md)
  done
```

ID 名が 3 文書のどこにも現れなかったもの: **FR-17 / FR-18 / PRE-01 / PRE-02 / PRE-03**

### 1.2 ID ではなく**中身**で再照合(ID 不在 ≠ 未設計)

ID 名の不在だけでは取りこぼしと断じられない。実体の語で数え直した:

```
requirement                       | substance markers found
--------------------------------------------------------------------------------
FR-17 KG jsonl直読み              | nodes.jsonl=3  edges.jsonl=3  kgNodes=2
FR-18 lessons export --out        | lessons.js export --out=2  lessonsByKind=2
FR-22 ledger のみを源             | ledger=0   <<< NOTHING
PRE-02 検器の資源漏れ             | browser.close()=2  profileRoot=1
PRE-03 残骸の掃除                 | 掃除=0  529=2  残骸=1
NFR-04 バッファ溢れ復帰           | on('error'=1  ERROR_NOTIFY_ENUM_DIR=1  全面再走査=2
NFR-03 6上限                      | 同時接続=3  connections=3
```

**判定**:

- **FR-17 / FR-18 は実体として設計されている**(design.md §1.3.2 の `kgNodes`/`kgEdges`/`lessons` 行、
  §2.5 の監視対象表に `nodes.jsonl` / `edges.jsonl`)。ID 名が無いだけであり、**取りこぼしではない**。
- **PRE-01 は達成済み**(要件自身が「教主により達成済み」と記す)。**PRE-02 は FR-23 / §5.4 が担う**。
- **FR-22 は真の取りこぼしである。** → D-1

### 1.3 【D-1】FR-22 が設計に存在しない ★差戻し理由

```
$ grep -ci 'ledger' design.md ux.md identity.md
design.md:0   ux.md:0   identity.md:0
```

FR-22 が課すもの:

- 点数履歴の源を `gauge.js ledger` **のみ**とし `baseline` を呼ばない
- **AC-22b**: 断面の **`ledger.length`** が `readLedger().length` と CLI 行数の **3 値一致**
- **AC-22c**: `grep -c 'data-source="gauge-ledger"' dashboard/index.html` が `1` 以上

対して design.md §1.3.1 の最上位スキーマに **`ledger` 鍵が無い**。§4.2 の 8 領域にも点数履歴の面が無い
(領域 4 `runs-score` は FR-13 の「点数と起動実績の並置」であって、FR-22 の**履歴**ではない)。
`data-source` 属性も 3 文書に 0 件。

**AC-22b が要求する 3 値のうち 1 値(断面の `ledger.length`)を設計が持たない。**
源そのものは生きている:

```
$ node -e "console.log(require('./graph/gauge.js').readLedger().length)"   → 10
$ node graph/gauge.js ledger | grep -cE '^[[:space:]]+[0-9]{4}-'           → 10
```

engine 側は 2 値一致しており、**断面に鍵を 1 本足すだけで満たせる。設計の穴であって engine の穴ではない。**

### 1.4 スコープ膨張の検査

要件に無いものを設計が足していないかを見た。**膨張は見つからなかった。**

- ページ数は 2 枚(既存 `index.html` / `control.html` の改稿)。**新規増設 0**。§4.1 が増設しない理由を
  FR-19 の維持費で説明しており、要件の意図に沿う。
- テスト 13 本はすべて G-01〜G-10 と FR の AC に紐付く(§6.1 の割当表)。
- G-03 / G-05 / G-08 に新規ファイルを作らない判断(§6.3)は、要件が既存ファイルへの追記を
  指定していること(AC-04c / AC-G05a / AC-G08a)と整合する。**要件の読みが正しい。**
- `PULSE_FAULT` 故障注入と `PULSE_KEEPALIVE_MS` は AC-01e / AC-20d / AC-09e が要求する検査手段であり、
  **要件由来である**(勝手な追加ではない)。

---

## §2. 設計が AC を満たせるか(設計次第で落ちる AC を 14 個検証)

### 2.1 NFR-01(同期経路)— **満たす。gates キャッシュは無くても足りる**

design.md §1.7 は「gates ~200ms が最大の費目。mtime キャッシュで 2 回目以降 50ms 未満」と書く。
**その 200ms という前提から疑い、実際に engine を叩いて測った。**

design.md の設計どおり pulse.js の snapshot を組み、この機で走らせた実測:

```
--- GATES 第1回(cold) ---
     9.7 ms  wiring.check()
     2.3 ms  vendor.verify()
    18.2 ms  derived.check()
     3.1 ms  check-agents.check()
    17.1 ms  workspace(hardcodedRefs + strayCreations)
--- 第2回(warm) ---
     8.3 / 1.7 / 14.6 / 1.4 / 3.1  →  GATES_SUM_MS(warm) = 29.1
```

**design.md の「gates ~200ms」は過大見積である。実測 warm 29.1ms。**
ゆえに `AC-N01d`(2 回目以降 50ms 未満)は **mtime キャッシュが無くても満たされる**。

断面全体を 6 回連続生成した実測:

```
=== COLD (1st) === ms=65   gatesCached=false
=== WARM x5 ===    ms=3.5 / 3.1 / 3.0 / 2.8 / 2.9   (gatesCached=true)
WARM_MAX=3.5   NFR-01(常駐 50ms 未満) PASS
```

CLI 経路(node 起動代込み、AC-N01a の形式で 3 回):

```
$ node -e '...execFileSync(process.execPath,[<snapshot>])...'
125.1ms / 119.2ms / 125.3ms      → 3 回すべて 1000ms 未満  PASS
```

| AC | 判定 | 根拠 |
|---|---|---|
| AC-N01a(CLI 1000ms 未満) | **PASS** | 125.1 / 119.2 / 125.3 ms |
| AC-N01d(常駐 2 回目以降 50ms 未満) | **PASS** | warm 最大 3.5ms(キャッシュ無しでも 29.1ms で足りる) |

**申し送り**: キャッシュ設計自体は害ではない(`at` が測定時刻を正直に語る NFR-06 の実装でもある)が、
**「200ms だからキャッシュが要る」という設計の動機付けは実測と合わない。**
キャッシュを入れると gates の鮮度が断面全体と乖離するため、`ux.md` §2.1 が要求する
「パネル単位の最終更新」を必ず実装すること(さもなくば古い門の合否を生として出す = NFR-06 違反)。

### 2.2 NFR-07(子プロセス禁止)— **満たす**

design.md §1.2 の require 集合を実走。**13 engine すべてが module として読める**:

```
require:clergy/forge/workspace/kg/wiring   すべて ok (0.4ms 前後)
wiring vendor derived check-agents workspace gauge spawn-trace daily-guard lessons codex
  → loaded: true (10/10)
```

罠表(§1.2)も実測で正しい:

```
Object.keys(clergy.COLLEGE).length        → 7
clergy.orgChart()                          → object
forge.SCALES keys → [quick,standard,full,reform,counsel,cartography]
forge.buildDag('x','quick').tasks.length   → 6
  standard→14  full→17  reform→11  counsel→6  cartography→11
kg.query('')                               → 99
workspace.resolve()                        → {root:...paradise-creations, source:'sibling', exists:true}
```

**§1.3.6 の「ハードコードせず `Object.keys(forge.SCALES)` を舐める」は成立する**(6 本を動的に取得できた)。
断面生成経路に `child_process` は 1 箇所も要らない。**AC-N07a / AC-N07c を構造的に満たす。**

### 2.3 FR-06(census 隔離)— **満たす**

```
$ grep -n 'census' design.md
93:  | census | object|null | 非同期キャッシュ | 0(同期経路で呼ばない) |
246: **pulse.js は census を一切 require しない**
252: graph/pulse-census.js  ← 別ファイル。ここだけが子プロセスを許される
```

**同期経路に census 呼出は紛れていない。** §1.6 の隔離設計は AC-06a を構造的に満たす。
`--no-tests` フラグの実装可能性も確認した —— **census.js は既に受け皿を持っている**:

```
$ sed -n '40,44p' graph/census.js
  let tests = null;
  if (opts.runTests !== false) {          ← 内部 API は既に分岐を持つ
    try { const out = execFileSync(... 'tests/paradise.test.js' ... timeout:120000)
$ grep -c 'no-tests' graph/census.js  → 0    (CLI 配線のみが未実装)
```

**AC-06b は CLI フラグを `opts.runTests` に繋ぐだけで満たせる。** 設計の判断は正しい。

### 2.4 G-04(孤児ページが生まれない)— **満たす。両環境で実証した**

atlas が CI に無い状況で導線の門が成立するかを、**CI 相当と手元の両方で実際に数えた**:

```
LOCAL atlas[] (design §4.3 の source) = 6
   conclave.html, dag.html, dispatch.html, hierarchy.html, run.html, wiring.html
LOCAL RHS (画面が一致すべき数) = 7  (control.html + atlas 6)
LOCAL: 画面 control(1) + atlas(6) = 7  vs RHS=7  -> MATCH

CI tracked: dashboard/{control.html,index.html,paradise.js,state.js,state.json}
CI atlas[] = 0   CI RHS = 1  (control.html)
CI: 画面 control(1) + atlas(0) = 1  vs RHS=1  -> MATCH

AC-19c 死リンク: LOCAL=0  /  CI=0(atlas を描かないので構造的に発生しない)
```

**design.md §4.3 の「索引を静的に書かず、断面に載せた実在情報から描く」は両環境で成立する。**
固定値を持たずに環境ごとに両辺が同時に動くため、**則3(固定値を期待値にしない)にも適合する**。
第29条にも触れない —— 検査対象は生成物の**中身**ではなく**実在と一致**である。

**AC-19a / AC-19b / AC-19c すべて PASS 見込み。**

### 2.5 その他の AC(設計次第で落ちるもの)

| AC | 内容 | 判定 | 根拠(実走) |
|---|---|---|---|
| **AC-13b** | 断面 `spawn.noTrace` が CLI と一致 | **FAIL 危険** | **D-3**。パス渡しで 0 になる |
| **AC-13e** | 矛盾に `data-contradiction="true"` | **FAIL 危険** | **D-3**。noTrace=0 なら印が 1 個も出ない |
| **AC-15c** | gates 合計 1000ms 未満 | **PASS** | 実測 warm 29.1ms / cold 50.9ms |
| **AC-14c** | 旧 run 混在でも断面が exit 0 | **PASS** | 5 run すべて `domains` あり。skip 経路も errors 個別殻で担保 |
| **AC-16a** | `daily.due` を exit code で読まない | **PASS** | `dg.isDue()` を module で実走 → `{due:false, reason:'already ran for 2026-09-01'}` を 8.7ms で取得。exit code は存在しない |
| **AC-18b/18d** | `lessons` 件数 / `kind` 2 値 | **PASS(要修正)** | `exportLessons(tmp)` → count=65, byKind={mechanism:63, conduct:2}, keys=id,label,check,applies,kind,ts。**ただし §3.3 の引数注意** |
| **AC-17a** | `counts.kgNodes` が `wc -l` と一致 | **PASS** | 直読み実装で kgNodes=99 / kgEdges=33 |
| **AC-01e** | 1 engine が落ちても他の鍵が揃う | **PASS** | 個別 try/catch 殻 + `fatal:false` の設計。実走で `errors:[]`、故障時も他鍵が残る構造 |
| **AC-N02c** | `vendor.js verify` が exit 0 | **PASS** | `✓ paradise stands on its own` / exit=0 |
| **AC-N05a** | `derived.js check` が exit 0 | **PASS** | `✓ no test asserts on derived content` / exit=0 |
| **AC-N05b** | 新設テストが生成物を読まない(R-1 是正形) | **PASS(正しく赤)** | design §0 の主張どおり `NG: 対象テストが 0 件` / exit=1。**則1 に適合** |
| **AC-22b** | ledger 3 値一致 | **FAIL** | **D-1**。断面に鍵が無い |
| **AC-01a/b** | 断面の数 == その場で数えた数 | **FAIL 危険** | **D-5**。creations の両辺が割れる |
| **AC-15a/b** | 門 5 列の合否 | **FAIL** | **D-4**。2 門が例外になる |

---

## §3. 実装可能性 — design.md の設計をこの機で実走した

### 3.1 サーバ・SSE — **design.md の具体設計はこの機で成立する**

`require('http')` だけで SSE が出せることは実証済みだが、**design.md が書いた具体的な設計**
(§2.3 のエンドポイント表、§2.4 のヘッダと wire 形式、§2.5 の fs.watch とデバウンス)を
そのまま組んで走らせた:

```
pulse listening port=7317
address: {"address":"127.0.0.1","family":"IPv4","port":7317}

SSE status=200  ct=text/event-stream  cache=no-cache
                cl=ABSENT(correct)    cors=*
--- raw SSE bytes ---
"retry: 1000\n\nevent: snapshot\ndata: {\"schemaVersion\":1,...}\n\nevent: snapshot\ndata: {...}"
frames(split on \n\n)=4   has retry=true   has event:snapshot=true

watch: raw events=10  debounced fires=1     (design §2.5 が期待する 1)
atomic rename: raw delta=2  fires now=2     (rename も等価に拾えた)

/health -> {"ok":true,"port":7317,"connections":1}
/nope   -> 404
```

| 設計項目 | 実走結果 |
|---|---|
| `Content-Length` を書かない(§2.3) | **ABSENT を確認** |
| `retry: 1000` を接続時に送る(§2.4) | **出た** |
| `event: snapshot\ndata: <JSON>\n\n`(§2.4) | **出た。`\n\n` 終端を node の `split` で 4 フレームと数えた** |
| `Access-Control-Allow-Origin: *`(§2.3) | **`*` を確認**(file:// の origin=null 対策として必要) |
| デバウンス 80ms タイマー式(§2.5) | **raw 10 イベント → 発火 1 回**。design の「Windows は 1 書込に 2 イベント」も再現(10 raw / 5 write = 2 倍) |
| `change` と `rename` を等価に扱う(§2.5) | **atomic rename で raw delta=2 を検知**。`change` のみを見る実装なら沈黙していた |
| `connections` を数える(§2.4 / AC-N03a) | **`/health` が `connections:1` を返した** |
| ファイル単位の監視(§2.5) | **成立**(ディレクトリではなくファイルを watch できた) |

**AC-09a〜09d / AC-10c/10e / AC-N03a / AC-11a〜11e は設計どおりで通る。**

**⚠ 1 点だけ build 相への注意**: `..` 脱出の検査。私が `http.get('/../../CONSTITUTION.md')` を投げたところ
**404 が返った(403 ではない)** —— node の http クライアントが送信前にパスを正規化し、
`..` がサーバに到達しなかったためである。**§2.3 の 403 分岐は今回の検査では踏めていない。**
build ではパス正規化を行わない生ソケット(`net.Socket` に生の `GET /../../x HTTP/1.1` を書く)で
検査すること。**http.get で試すと「塞げている」と誤認する。**

### 3.2 【D-2】`gauge.score(runPath)` は throw する ★差戻し理由

design.md §1.3.4 の `runs[]` 表:

> \| `score` \| `gauge.js` を **module として** `score(runPath)` \| 〜10ms \| `null` + errors \|

**実走した結果**:

```
=== design.md 1.3.4 literally: gauge.score(runPath) ===
THROWS -> run-state carries no phases — 測れないものに点は付かない(第37条)

=== correct form: gauge.score(JSON.parse(read(path))) ===
OK score=100 keys=score,complete,phasesTotal,phasesDone,domainsTotal,
                  domainsRatified,firstPassRate,reworkCount,retryOverhead,
                  loopGuardTrips,durationMs
```

源を読むと `function score(run)` は `normalize(run)` に**パース済みオブジェクト**を渡す前提である
(`graph/gauge.js:71`)。文字列パスを渡すと `phases` が空になり、第37条の番人が例外を投げる。

**設計どおりに実装すると全 run の `score` が `null` になり `errors[]` が gauge で埋まる。**
AC-13b(score の一致)/ AC-14 系 / FR-13 の並置が成立しない。

**是正**: 表の `source` を `score(JSON.parse(fs.readFileSync(path)))` と書くこと。
§1.3.4 は既に「源は `conclave.json` の直読み」と書いているので、**読んだオブジェクトをそのまま渡せばよい**。
1 行の訂正で済むが、**訂正しなければ動かない**。

### 3.3 【D-3】`spawn-trace.report(path)` は例外を投げず静かにゼロを返す ★最重要

design.md §1.3.4:

> \| `spawn.*` \| `spawn-trace.js` を module として。三値 \| 〜20ms \| `null` + errors \|

**引数の型が固定されていない。** パスを渡した場合を実走した:

```
=== spawn-trace.report(<string path>) returns WHAT? ===
{"ok":true,"total":0,"observed":0,"assertedOnly":0,"noTrace":0}
correct  : {"ok":false,"total":17,"observed":0,"assertedOnly":0,"noTrace":17}
>>> silent zero, NO throw: true
```

源(`graph/spawn-trace.js:84`)は `if (run.domains) ... else collect(run.phases)` であり、
文字列には `domains` も `phases` も無いので **phases が空配列のまま `ok:true, total:0` を返す**。

**これが D-2 より深刻である理由**:

1. **例外を投げない。** ゆえに §1.5 の try/catch 殻に捕まらず、**`errors[]` にも積まれない**。
2. `noTrace:0` になるので、§1.3.4 の矛盾規則 `score >= 90 && spawn.noTrace > 0` が
   **構造的に永久 false** になる。
3. **FR-13 は「点数が高く起動実績が赤い矛盾こそが本改修の本分」と書いている。**
   AC-13e は `data-contradiction="true"` が 1 個以上あることを求める。
   パス渡しの実装は **矛盾を 1 個も検出せず、しかも緑を出して黙る。**

**これは第50条(門が見ていない機能は壊れても鳴らない)の型そのものであり、
本改修が是正しようとしている当の病を、本改修自身が再生産する。**

**是正**: §1.3.4 に「`report()` / `score()` は**パース済みオブジェクトを取る**。
パスを渡すと例外を投げずに 0 を返すため、**引数の型を間違えても門が鳴らない**」と明記すること。
さらに **AC-13e の検査は固定値 0 との比較ではなく、`total > 0` を先に assert すること**を
テスト設計(§6.1 `dashboard-run-panel.test.js`)に加えるべきである。

### 3.4 【D-4】gates 5 門のうち 2 門に `check()` が無い ★差戻し理由

design.md §1.3.3:

> \| `ok` \| 各 engine の `check()` を **module として**呼び、例外なし・`ok:true` \|
> \| `name` \| 5 門固定: `wiring` `vendor` `derived` `check-agents` `workspace` \|

**5 門すべてに `check()` があるかを実走で確かめた**:

```
     9.7 ms  wiring.check()             {"ok":true,"keys":["ok","orphans","dangling","map"]}
       0 ms  vendor.check()   [design]  ERR: vendor.check is not a function
     2.3 ms  vendor.verify()  [real]    {"ok":true,"keys":["ok","findings","status"]}
    18.2 ms  derived.check()            {"ok":true,"keys":["ok","findings","undeclared","note"]}
     3.1 ms  check-agents.check()       {"ok":true,"keys":["ok","skipped","dir",...]}
       0 ms  workspace.check() [design] ERR: ws.check is not a function
     3.4 ms  ws.hardcodedRefs()         len=0
    14.2 ms  ws.strayCreations()        len=0
```

export を直接確認:

```
graph/vendor.js:209    module.exports = { status, resolveHooks, wire, refresh, verify, VENDOR, KINDS, TOOLS }
graph/workspace.js:161 module.exports = { resolve, root, defaultRoot, creationDir, init,
                                          strayCreations, hardcodedRefs, REPO_ROOT, SIBLING_NAME }
```

**`vendor.check` も `workspace.check` も存在しない。**

- `vendor` の正しい入口は **`verify()`**(`{ok, findings, status}` を返す。2.3ms)
- `workspace` には単一の門関数が無い。**`hardcodedRefs()`(len 0)と `strayCreations()`(len 0)の
  2 つを組み合わせて `ok` を作る**必要がある(design.md §5.2 が直そうとしている当の関数である)

設計どおり `check()` を呼ぶと **2 門が毎回例外**になり、§1.3.3 の規定により `ok:false` + errors。
**5 列の門のうち 2 列が常時赤**になり、AC-15a/15b が落ちる。

**§1.2 が「API の罠を設計時に固定する」表を持ちながら、gates の 2 件を表に載せ損ねている。**
罠表に 2 行を足すこと。

### 3.5 【D-5】`counts.creations` の突合両辺が一致しない ★差戻し理由

design.md §1.3.2:

> \| `creations` \| `workspace.resolve()` の root 直下、`_` 始まりでない dir \| 突合相手: `ls -d <root>/*/` \|

**門は「断面の数 == その場で数えた数」で裁く(AC-01a/b)。両辺を実際に走らせた**:

```
=== node readdirSync isDirectory && !_ (design.md の source) ===
9   .git, .github, coin, habit, pomodoro, reform-claude-md-diet, reform-eval-gauge, rps, tenbin

=== bash count (design.md の突合相手: ls -d <root>/*/) ===
8

=== design.md §1.3.2 が「執筆時点の実測」と記す値 ===
creations 7
```

**3 つの数え方が 3 つとも違う。**

- node 側は **`.git` と `.github` を拾う**(`_` 始まりではないため除外規則に掛からない)
- bash の `ls -d */` は**ドットディレクトリを出さない**が `_scratch` は拾う
- design.md 自身が記す「7」は実データと合わない(実測 9 / 8)

**AC-01a/b は着工初日に赤くなる。** しかも赤の原因が「画面が嘘をついた」ではなく
「**数え方の定義が両辺で違う**」であり、これは第22条の門としては偽陽性である。

**是正**: 除外規則を `_` 始まりに加えて **`.` 始まりも除く**と明記し、
突合相手も同じ規則になる形(`ls -d <root>/*/` は既にドットを除くので、node 側を合わせる)へ揃えること。
「7」という記載は削除するか、参考値であることを明記すること(則3)。

### 3.6 断面スキーマの各鍵は engine から取れるか — **D-1〜D-5 を除き取れる**

設計どおりの断面を組んで実走した全出力:

```
counts : {"articles":50,"engines":33,"cardinals":7,"creations":9,"runs":5,
          "lessons":65,"kgNodes":99,"kgEdges":33}
gates  : wiring=true(9.8ms) vendor=true(2.4ms) derived=true(18.4ms)
         check-agents=true(3.1ms) workspace=true(17.1ms)
scale  : {"quick":6,"standard":14,"full":17,"reform":11,"counsel":6,"cartography":11}
byKind : {"mechanism":63,"conduct":2}
runs   :
  coin                  11/11 complete score=100 noTrace=11 contradiction=true  hist=22
  habit                 11/11 complete score= 45 noTrace=11 contradiction=false hist=40
  reform-claude-md-diet  5/11 stalled  score= 80 noTrace=11 contradiction=false hist=15
  reform-eval-gauge     11/11 complete score=100 noTrace=11 contradiction=true  hist=26
  tenbin                17/17 complete score=100 noTrace=17 contradiction=true  hist=27
errors : []
```

**`errors[]` が空である** —— D-2/D-4 を正しい形に直せば、設計した鍵はすべて実際に埋まる。
`scaleGuess`(phasesTotal を相数表に照合)も、上の `scale` と `phasesTotal` から引ける
(11→reform/cartography の 2 値衝突があるため、**一意に定まらないことを設計に書くべき** — §5 の申し送りへ)。

---

## §4. 第17/18条の充足

### 4.1 identity.md — **充足する**

| 条文の要求 | 判定 | 根拠 |
|---|---|---|
| 却下理由が書かれているか | **PASS** | §3.2 nvidia(主色が本文コントラスト不足)/ §3.3 shopify(面の段差が測れない)/ §3.4 現行 Primer 肌(第17条が名指しで禁じたもの)の **3 件を数値付きで却下** |
| 両テーマがあるか | **PASS** | §4.2 明(light)15 役割 / §4.3 暗(dark)。§7 に「visual-verify が両方を検査する」 |
| 外部フォントを使っていないか | **PASS** | §5「外部フォント禁止。system font stack のみ」。`fonts.googleapis` / `fonts.gstatic` / `@import` / `preconnect` の**参照は 0 件**(現れる 2 箇所はいずれも「書かない」と禁じる文脈) |

コントラストは教主が全28ペア PASS / FAIL 0 を独立検証済みのため再測していない。

### 4.2 ux.md — **充足する**

**4 状態(+1)がすべて設計されているか**:

```
$ grep -nE '^## ' ux.md
99:  ## 2.1 通常(ready)
107: ## 2.2 空(empty)— 0 と空を区別する
126: ## 2.3 読み込み中(loading)— スピナーは禁じ手
145: ## 2.4 エラー(error)— そのパネルだけ
160: ## 2.5 接続断(disconnected)
173: ## 2.6 状態の遷移(パネル単位)
462: # §8. 密度(dense)— 第18条(a) が挙げる 4 番目の状態
```

**5 状態すべてが節を持ち、§2.6 が遷移図まで持つ。** 各状態が「何を出すか」を表で持ち、
`loading` は `data-awaiting="<engine名>"` を必須とし(AC-20b)、
**名は実在する engine に限る**(AC-20c)と縛っている。**スピナー禁止の理由も述べられている。**

**focus-visible と 24px が具体的に設計されているか**:

```
focus-visible : ux=6 件   design=0   identity=0
24px          : ux=4 件   design=0   identity=0
```

§6.2 は実際の CSS 断片(`outline: 3px solid var(--focus)` + `box-shadow` の二重環)を持ち、
§7.2 は **WCAG 2.2 / 2.5.8 Target Size (Minimum) の 24×24 CSS px** を規則として明記する。
`prefers-reduced-motion` / `aria-` も各 1 件ある。

**ux.md が主張するコントラストを独立に計算して検証した**(教主の検証範囲外だったため):

```
fg       bg        surfaces tested        worst  ux.md claims  verdict
#7a4a00  light     [7.48, 6.86, 6.01]     6.01   7.48/6.86/6.01  全一致 PASS
#e8c46a  dark      [11.33, 10.36, 9.34]   9.34   11.33/10.36/9.34 全一致 PASS
#b3251e  light     [6.56, 6.02, 5.27]     5.27   5.27  → 最悪面基準で正確  PASS
#ef6f62  dark      [6.44, 5.89, 5.31]     5.31   5.31  → 最悪面基準で正確  PASS
#6b21a8  light     [8.72, 8.00, 7.00]     7.00   7.00  → 最悪面基準で正確  PASS
#c08ad8  dark      [7.11, 6.51, 5.86]     5.86   5.86  → 最悪面基準で正確  PASS
```

**ux.md は最悪面(`--paper`)基準で数値を引いている —— これは正しい作法である。**
焦点環の 3 面すべてが非テキスト基準 3.0 を上回り、`--bad` / `--contradiction` は
両テーマ・全 3 面で AA 4.5 を上回る。**焦点環が `--primary`(明では `#000000`)の上で
2.81:1 しか出ないことも ux.md が自ら指摘し、二重環で回避している**(私の計算では 2.81、
ux.md の記載は 2.34 で **0.47 の差があるが、いずれも 3.0 未満であり結論は変わらない**)。

### 4.3 design.md(構造)と identity.md(見た目)が混ざっていないか — **混ざっていない**

```
                       design   ux   identity
#RRGGBB (色)              0      20     243
パレット                    0       0       3
require(                  9       0       0
snapshot.json             4       0       0
fs.watch                  2       0       1
```

- **design.md に色は 1 件も無い。** §8 が「本書が構造だけを述べたことの確認」表を持ち、
  「それらをどの色で出すか → identity.md」「印をどう見せるか → identity.md / ux.md §5」と明示的に委譲している。
- **identity.md に構造はほぼ無い**(`fs.watch` 1 件・`SSE` 2 件はいずれも「その状態をどう塗るか」の文脈)。
- **ux.md の hex 20 件は違反ではない。** ux.md が参照するトークンを全部数えたところ:

```
ux.md が参照   : --bad --body --canvas --contradiction --focus --hairline --ok --primary  (8 種)
identity.md が定義: --bad --body --canvas --canvas-soft --contradiction --focus --font-display
                   --font-mono --font-ui --hairline --ink --link --ok --on-primary --paper
                   --primary --slug --warn                                              (18 種)
→ ux.md が参照する 8 種すべてが identity.md に定義されている。ux.md は色を新規に定義していない。
```

**ux.md は identity.md が定めた色の「実測値を引用して、その状態に使う理由」を述べているだけであり、
第17条の混同にはあたらない。**

---

## §5. 矛盾の検査

### 5.1 design.md 内部の矛盾 — 1 件

**§1.3.4 の worked example が矛盾 run を 1 件と書くが、設計の規則を実データに当てると 3 件になる。**

design.md §1.3.4 の実測例:

```
tenbin  17/17  6/6  27 events  complete + contradiction(score 100 / noTrace 17)
                                          ← contradiction が付くのは tenbin のみ
```

同じ §1.3.4 が定める規則 `score >= 90 && spawn.noTrace > 0` を全 run に適用した実走:

```
coin                     score=100  noTrace=11  contradiction=true
habit                    score= 45  noTrace=11  contradiction=false
reform-claude-md-diet    score= 80  noTrace=11  contradiction=false
reform-eval-gauge        score=100  noTrace=11  contradiction=true
tenbin                   score=100  noTrace=17  contradiction=true
CONTRADICTION_COUNT = 3
```

AC-13e は「1 個以上」を求めるので**門は落ちない**が、
**実装者が「1 件しか出ないはず」と読んで 3 件出た画面を不具合と誤認する危険がある。**
requirements.md も同じ箇所で tenbin のみを挙げているが、
要件は「執筆時点の参考値」と断っている(則3)。**design.md 側にも同じ断りを入れること。**

### 5.2 design.md ↔ requirements.md の矛盾 — 2 件

| # | design.md | requirements.md / 実測 | 判定 |
|---|---|---|---|
| 1 | §1.7「gates ~200ms が最大の費目」 | 実測 warm **29.1ms** / cold 50.9ms | **過大見積**。結論(キャッシュ)は害でないが動機が誤り |
| 2 | §1.3.2「執筆時点の実測 … creations 7」 | 実測 node=9 / bash=8 | **D-5**。数が合わない |

### 5.3 3 文書間の矛盾 — **無し**

定数(`FRESH_LIVE_MS` 10000 / `FRESH_FROZEN_MS` 60000 / `WATCH_DEBOUNCE_MS` 80 /
`RETRY_HINT_MS` 1000)は design.md §3.1 が 1 箇所に定義し、ux.md §3 はその値を参照するのみ。
**二重定義は見つからなかった**(AC-07b / AC-RT-2 の一致検査に適合)。
8 領域(design §4.2)と並び順(ux §9)、5 状態(ux §2)と `data-state` の発生源(design §1.5)も整合する。

### 5.4 engine 修正設計(§5)の診断は**すべて実源と一致した**

design.md が「実測された現状」として引用するコードを、実ファイルで照合した:

```
graph/census.js:75-78     } catch { return 0; }                      ← §5.1 の引用と一致
graph/export-state.js:31  if (!fs.existsSync(dir)) return [];        ← §5.1 の引用と一致
graph/workspace.js:112    if (/['"`][^'"`]*creations\//.test(line))  ← §5.2 の引用と一致
graph/motion-probe.mjs:85 try { browser.child.kill(); } catch        ← §5.4 の引用と一致

$ for c in "clergy.js college" "daily-guard.js status" "conclave.js status"; do ...
clergy.js college     : plain=2139 json=2139  IDENTICAL(欠陥確認)
daily-guard.js status : plain=843  json=843   IDENTICAL(欠陥確認)
conclave.js status    : plain=0    json=0     IDENTICAL(欠陥確認)

$ grep -n 'async close' overlay/vendor/archify/bin/visual-check.mjs
475: async close() {  → SIGTERM → 1500ms → SIGKILL、その後 fs.rmSync(this.profileRoot)
                        ← §5.4 が「描画器は正しい後始末を close() として公開していた」と
                          書いたとおりの実装であることを確認

$ grep -n 'fonts' overlay/vendor/archify/assets/template.html
36: <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
37: <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono...">
40: <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono...">
→ 3 行。§4.3 が「FR-12 と同じファイルの同じ改修」と述べたとおり、
  atlas の戻りリンク(AC-19d)と外部フォント除去(FR-12)は 1 ファイルで両立する
```

**§5 の 4 件の engine 修正設計は、実源に照らして正確である。** 是正の方向も正しい。

---

## §6. 判定

# **reject** — **design 相へ差戻し**

**specify 相へは戻さない。** requirements.md に欠陥は見つからなかった ——
FR/NFR/PRE/G/AC の定義、則1〜4、D-6/D-12/D-13 の罠の明文化はいずれも実走で妥当性を確認した。
**欠陥はすべて design.md 側にある。**

### 6.1 差戻しの理由(この 5 件が直れば ratify できる)

| # | 欠陥 | 直し方 | 分量 |
|---|---|---|---|
| **D-1** | **FR-22 が設計に存在しない**(`ledger` 0 件) | §1.3.1 に `ledger` 鍵を追加。§4.2 に点数履歴の出所を割当。`data-source="gauge-ledger"`(AC-22c)を設計に明記 | 表 2 行 + 節 1 つ |
| **D-2** | `gauge.score(runPath)` が throw する | §1.3.4 の source を `score(JSON.parse(read(path)))` へ訂正。§1.2 の罠表に追加 | 2 行 |
| **D-3** | `spawn-trace.report(path)` が**静かに 0 を返す** | §1.3.4 に引数型を明記。§1.2 の罠表に「**例外を投げないので errors に積まれない**」と警告。§6.1 のテスト設計に `total > 0` の事前 assert を追加 | 3 行 + AC 1 本 |
| **D-4** | gates 2 門に `check()` が無い | §1.3.3 の `ok` 欄を engine ごとに正しい入口へ(`vendor.verify()` / `workspace` は `hardcodedRefs()` + `strayCreations()`)。§1.2 の罠表に 2 行追加 | 表 1 つ |
| **D-5** | `counts.creations` の両辺が割れる | 除外規則に `.` 始まりを追加し、突合相手と定義を揃える。「実測 7」の記載を訂正 | 2 行 |

**いずれも設計文書の局所修正で済む。骨格の作り直しは要らない。**
**D-3 だけは AC の追加を伴う** —— 例外を投げない誤りは門が鳴らないため、
「引数型を間違えたら赤くなる」検査を設計に持たせる必要がある(第50条)。

### 6.2 差戻しに**含めない**もの(build 相への申し送りで足りる)

- **§1.7 の「gates ~200ms」の過大見積** — 実測 29.1ms。キャッシュ設計自体は無害。
  ただし**キャッシュを入れるなら `ux.md` §2.1 のパネル単位の最終更新を必ず実装**すること
  (古い門の合否を生として出せば NFR-06 違反になる)。
- **§1.3.4 の worked example の矛盾 1 件 vs 実測 3 件** — 参考値である旨を添えれば足りる。
- **`scaleGuess` が一意に定まらない** — `reform` と `cartography` がともに 11 相。
  `phasesTotal` だけでは道を一意に引けない。**`null` を返すか両論併記にすることを設計に書くこと。**
- **PRE-03(既存残骸の掃除)** — design.md に `掃除` 0 件。ただし PRE-03 は
  「掃除前後の数を **PR 本文に記録する**」作業であり、設計文書ではなく build/PR の責務。
  **現況は悪化している**:

```
$ ls "$LOCALAPPDATA/Temp" | grep -c "archify-visual-check-profile"
683          ← design.md が引用する 529 から更に +154
```

  PRE-03 は掃除後 **10 未満**を求める。**着工の門としてこの数を先に落とすこと。**
- **`..` 脱出の 403 分岐が未検証** — `http.get` はパスを正規化するため 404 になり 403 を踏めない。
  **生ソケットで検査すること**(§3.1 末尾)。

### 6.3 build 相への申し送り(design 修正後に効く。優先順位順)

1. **`spawn-trace.report()` / `gauge.score()` には必ずパース済みオブジェクトを渡す。**
   パスを渡しても `spawn-trace` は**例外を投げず 0 を返す**。ここが本改修で最も踏みやすい罠であり、
   踏んでも門が鳴らない。**`total > 0` を先に確かめること。**
2. **gates の入口は engine ごとに違う。** `wiring.check()` / `derived.check()` / `check-agents.check()` は
   `check()` だが、`vendor` は `verify()`、`workspace` は `hardcodedRefs()` + `strayCreations()`。
3. **`counts.engines` は pulse.js 自身を含んで 34 になる**(現在 33)。固定値と比較しないこと(AC-E3)。
4. **`counts.creations` はドットディレクトリを除く。** 除かないと `.git` / `.github` を数えて両辺が割れる。
5. **`lessons.exportLessons(outPath)` は outPath 必須。** `undefined` を渡すと
   `The "path" argument must be of type string` で落ちる。**一時ファイルは自分で消すこと**(AC-18c)。
   実測 0.8ms / count=65 / byKind={mechanism:63, conduct:2}。
   なお **私の検証で `$LOCALAPPDATA/Temp/pd-lessons.json` が 1 個残った** ——
   `exportLessons` は必ずファイルを書くので、**読了後の unlink を忘れると AC-18c が落ちる**(実演済み)。
6. **`daily-guard.isDue()` は module 呼びなら exit code が存在しない。** 罠は構造的に消える(AC-16a)。
7. **SSE の `..` 脱出検査は生ソケットで**(http.get は正規化する)。
8. **`census.js --no-tests` は `opts.runTests` に繋ぐだけ。** 内部分岐は既にある。

---

## §7. 走らせたコマンドと出力の索引

| # | 目的 | 結果 |
|---|---|---|
| 1 | ID 網羅照合(FR/NFR/PRE/G × 3 文書) | FR-17/18・PRE-01〜03 が ID 不在 → 中身照合で FR-17/18 は充足、**FR-22 が真の欠落** |
| 2 | design §1.2 の require 集合を実走 | 13 engine すべて loaded。`COLLEGE`=7 / `orgChart()` ok / `buildDag` 6 道 / `kg.query('')`=99 |
| 3 | gates 5 門を module で実走 | **`vendor.check` / `workspace.check` が undefined**。warm 合計 29.1ms |
| 4 | `gauge.score(path)` vs `score(obj)` | **path は throw**。obj は score=100 |
| 5 | `spawn-trace.report(path)` vs `report(obj)` | **path は静かに `{total:0,noTrace:0}`**。obj は `{total:17,noTrace:17}` |
| 6 | 断面を設計どおり組んで 6 回生成 | cold 65ms / warm 2.8〜3.5ms / `errors:[]` |
| 7 | CLI 経路 3 回(AC-N01a の形式) | 125.1 / 119.2 / 125.3 ms(< 1000ms) |
| 8 | SSE サーバを設計どおり実装し実走 | ヘッダ・retry・4 フレーム・デバウンス(raw10→fire1)・rename 検知・connections すべて成立 |
| 9 | G-04 導線を CI 相当と手元で照合 | 両環境で LHS==RHS(CI 1==1 / 手元 7==7)、死リンク 0 |
| 10 | `counts.creations` の両辺 | **node=9 / bash=8 / design 記載=7 の三者不一致** |
| 11 | ux.md のコントラスト主張 11 件を自前計算 | 全件 PASS。最悪面基準の引用で正確 |
| 12 | 第17条の分離を語彙数で測定 | design 色 0 / identity 構造ほぼ 0 / ux は既定義トークンのみ参照 |
| 13 | §5 の engine 診断を実源照合 | census:75 / export-state:31 / workspace:112 / motion-probe:85 / `--json` 3 件 すべて一致 |
| 14 | `derived.js check` / `vendor.js verify` | ともに exit=0(AC-N05a / AC-N02c PASS) |
| 15 | AC-N05b の R-1 是正形 | `NG: 対象テストが 0 件` / exit=1(**則1 に適合。正しく赤**) |
| 16 | ledger 2 値一致 | `readLedger().length`=10 / CLI 行数=10(engine 側は健全。**断面に鍵が無い**) |
| 17 | PRE-03 の現況 | `archify-visual-check-profile` = **683 個**(design 引用の 529 から悪化) |

**作業屑**: 検証スクリプトはすべて `$LOCALAPPDATA/Temp` に置き、
`reform/dashboard-living-gate/` には 1 件も残していない。
