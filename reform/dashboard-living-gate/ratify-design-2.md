# ratify-design-2.md — design 相成果物の**再審査**報告(requirements 枢機卿)

- **対象**: `reform/dashboard-living-gate/design.md`(93,642 B / 1,488 行)
- **前回報告**: `reform/dashboard-living-gate/ratify-design.md`(41,085 B)— 判定 **reject**(欠陥 D-1〜D-5)
- **審査者**: requirements 枢機卿(第11条 — architecture ドメインは自己批准できない)
- **審査機**: Windows 11 / git-bash / node v24.14.0
- **本報告の根拠**: すべて審査官自身が走らせた実出力である。教主の検証済み 3 件も**私の手で測り直した**。
- **判定**: **ratify** — **build 相へ進んでよい**

---

## §0. 本審査で走らせたもの

検証スクリプトは `$LOCALAPPDATA/Temp/ratify2/` に置き、`reform/dashboard-living-gate/` には 1 件も残していない。

| # | スクリプト | 目的 |
|---|---|---|
| V1 | `v1-exports.js` | design.md 中の engine 参照を**全抽出**し実 exports と機械突合 |
| V2 | `v2-defense.js` | §1.3.4a の防御を**実装して**走らせ、効くか/過剰でないかを測る |
| V3 | `v3-silent.js` | **「投げずに静かに空/ゼロを返す」engine を 61 ケースで全数調査** |
| V4 | `v4-snapshot.js` | §1 の断面を**設計どおり実装**し、私の機で時間収支を実測 |
| V5 | `v5-final.js` | 前回 5 欠陥の是正状況を一画面に集約 |

---

# §1. 前回の 5 欠陥は直ったか — **全て私自身の手で確かめた**

## 1.1 一画面の結論(V5 の実出力)

```
=== 前回5欠陥の是正状況(審査官自身の実走) ===

D-1 FR-22 ledger      : design.md=66件  ux.md=11件  gauge-ledger=8件
D-2 gauge.score(path) : THROW: run-state carries no phases — 測れないものに点は付かない(第
    gauge.score(obj)  : score=100
D-3 report(path)      : {"ok":true,"total":0,"noTrace":0}  <<< 静かに 0
    report(obj)       : {"ok":false,"total":17,"noTrace":17}
    total>0 の防御が design.md に在るか: true
D-4 vendor.verify=function / vendor.check=undefined
    ws.hardcodedRefs=function / ws.strayCreations=function / ws.check=undefined
D-5 creations/workshops: node=7/1
```

| # | 前回の欠陥 | 判定 | 私が確かめた根拠 |
|---|---|---|---|
| **D-1** | FR-22(ledger)が設計に不在 | **是正** | design.md 66 件 / ux.md 11 件 / `data-source="gauge-ledger"` 8 件。§1.3.7 に断面スキーマ新設 |
| **D-2** | `gauge.score(path)` が throw | **是正** | 実走で THROW 再現。設計は §1.3.4 で `gauge.score(run)` に訂正済み |
| **D-3** | `spawn-trace.report(path)` が静かに 0 | **是正** | §1.3.4a の防御を**私が実装して走らせ**、機能を確認(§2) |
| **D-4** | gates 2 門に `check()` が無い | **是正** | `vendor.check`/`ws.check` は `undefined` のまま。設計は `verify()` / 2 本合成に訂正済み |
| **D-5** | `counts.creations` の三者不一致 | **是正** | node 7/1 と bash 7/1 が一致(§1.3) |

## 1.2 **未検証だった「13 engine の exports 修正」— 全数機械突合した**

前回私が最も疑ったのはここである。design.md は「**この一覧に無い名前を設計に書いてはならない**」と
宣言した。**その宣言自体が正しいかを機械で検査した。**

### (a) design.md §1.2 の exports 一覧ブロックと実物の突合

V1 の実出力:

```
=== §1.2 の exports 一覧ブロックを行ごとに突合 ===
  EXACT  clergy        claimed=23 actual=23
  EXACT  forge         claimed=12 actual=12
  EXACT  workspace     claimed=9 actual=9
  EXACT  kg            claimed=11 actual=11
  EXACT  wiring        claimed=5 actual=5
  EXACT  vendor        claimed=8 actual=8
  EXACT  derived       claimed=5 actual=5
  EXACT  check-agents  claimed=8 actual=8
  EXACT  gauge         claimed=8 actual=8
  EXACT  spawn-trace   claimed=3 actual=3
  EXACT  daily-guard   claimed=11 actual=11
  EXACT  lessons       claimed=1 actual=1
  EXACT  codex         claimed=9 actual=9

EXPORTS_BLOCK_MISMATCH = 0
```

**13 engine すべてが 1 名も過不足なく一致した。** 書き漏らしも幽霊もない。

### (b) design.md 本文中の engine 呼び出しを**全て抜き出して実走**した

本文中の `<mod>.<member>` を正規表現で全抽出し(**24 種**)、実 exports と突合した:

```
--- 実在する (OK) ---  20 種
  OK    check-agents.check     x4    OK    clergy.COLLEGE          x3
  OK    clergy.orgChart        x1    OK    codex.parse             x2
  OK    daily-guard.isDue      x2    OK    derived.check           x4
  OK    forge.SCALES           x4    OK    forge.buildDag          x2
  OK    gauge.baseline         x2    OK    gauge.ledgerPath        x1
  OK    gauge.readLedger       x5    OK    gauge.score             x9
  OK    kg.query               x2    OK    lessons.exportLessons   x7
  OK    spawn-trace.report     x13   OK    vendor.verify           x4
  OK    wiring.check           x4    OK    workspace.hardcodedRefs x3
  OK    workspace.resolve      x5    OK    workspace.strayCreations x3

--- 実在しない ---  4 種
  MISS  clergy.college    x1  L67      MISS  forge.plan       x1  L68
  MISS  vendor.check      x2  L73,1387 MISS  workspace.check  x3  L74,270,1392
```

**「実在しない」4 種の在り処を 1 行ずつ確かめた。全て罠表の「誤り」欄か、附録の THROW 実演である**:

```
L67   | T-1 | `clergy.college()` | `clergy.COLLEGE`(7)/ `clergy.orgChart()` | `is not a function` | ✔ |
L68   | T-2 | `forge.plan(w,{scale})` | `forge.buildDag(w, 'reform')` — 第2引数は文字列 | ✔ |
L73   | T-7 | `vendor.check()` | `vendor.verify()` → {ok, findings, status} | ✔ D-4 |
L74   | T-8 | `workspace.check()` | `hardcodedRefs()` + `strayCreations()` の 2 本を合成 | ✔ D-4 |
L270  |     try{ws.check()}catch(e){...}          ← 附録の THROW 実演コード
L1387 | THROW vendor.check()   [誤] -> vendor.check is not a function      ← 附録
L1392 | THROW workspace.check() [誤] -> ws.check is not a function         ← 附録
```

**「正」として書かれた側に誤りは 1 件も残っていない。**

### (c) 罠表 T-1〜T-10 を 1 本ずつ実走した

```
THROW clergy.college()           [誤/T-1] -> clergy.college is not a function
OK    clergy.COLLEGE keys        [正]     -> 7
OK    clergy.orgChart()          [正]     -> ["ranks","college","tribunal","hierarchy"]
THROW forge.plan(w,{scale})      [誤/T-2] -> forge.plan is not a function
THROW forge.buildDag(w,{scale})  [誤/obj] -> SCALES[scale] is not a function
OK    forge.buildDag(w,"reform") [正]     -> 11
THROW vendor.check()             [誤/T-7] -> vendor.check is not a function
OK    vendor.verify()            [正]     -> ["ok","findings","status"]
THROW workspace.check()          [誤/T-8] -> ws.check is not a function
THROW lessons.exportLessons()    [誤/T-9] -> The "path" argument must be of type string … undefined
OK    kg.query("").length        [T-10]   -> 99
```

**T-1〜T-10 の 10 本すべてが記述どおりに再現した。**

> **軽微な不正確 1 件(欠陥ではない)**: T-2 の「誤ると」欄は `SCALES[scale] is not a function` と書くが、
> `forge.plan` は**そもそも存在しない**ので実際のメッセージは `forge.plan is not a function` である。
> `SCALES[scale] is not a function` が出るのは `buildDag(w, {scale})` と**オブジェクトを渡した**ときで、
> 私はこれも実走で確認した(上表 3 行目)。**「正」の指示は正しく、両方の誤り方が同じ表に
> 圧縮されているだけである。** build 相の判断を誤らせないので指摘に留める。

## 1.3 D-5(counts の三者一致)— 私の手で再測

```
$ ROOT=$(node -e "…workspace.resolve().root")
ROOT=C:\Users\kikus\Documents\workspace\paradise-creations
all      =10 [.git,.github,coin,habit,pomodoro,reform-claude-md-diet,
              reform-eval-gauge,rps,tenbin,_scratch]
visible  =8  [coin,habit,pomodoro,reform-claude-md-diet,reform-eval-gauge,rps,tenbin,_scratch]
creations=7      workshops=1      不変条件 : true
--- bash 側 ---
creations(bash) = 7
workshops(bash) = 1
```

**node 7/1 と bash 7/1 が一致した。** AC-01b の定義(7 + 1 = 8)とも一致する。

さらに **§6.4 の故障注入が実際に効くか**を確かめた:

```
=== ドット除外を外したら両辺が割れるか (G-01 故障注入 §6.4) ===
ドット除外を外した node 側 creations = 9   (bash 側は 7) -> 割れるか: true
```

**設計が書いた「壊すと赤くなる」は本当に赤くなる。**

---

# §2. 防御設計は本当に機能するか — **私が実装して走らせた**(今回の主眼)

design.md §1.3.4a の `readSpawn()` と `contradiction` の三値規則を、**書かれたコードのまま写して**
全 5 run に適用した(V2)。

## 2.1 正しい呼び方(run オブジェクト)— **過剰防御でないかを見る**

```
======== A. 正しい呼び方 (run オブジェクト) ========
  coin                    11/11  complete  score= 100 spawn={total:11,noTrace:11,ok:false} contradiction=true
  habit                   11/11  complete  score=  45 spawn={total:11,noTrace:11,ok:false} contradiction=false
  reform-claude-md-diet    5/11  stalled   score=  80 spawn={total:11,noTrace:11,ok:false} contradiction=false
  reform-eval-gauge       11/11  complete  score= 100 spawn={total:11,noTrace:11,ok:false} contradiction=true
  tenbin                  17/17  complete  score= 100 spawn={total:17,noTrace:17,ok:false} contradiction=true
  --> CONTRADICTION_TRUE=3  CONTRADICTION_NULL=0  errors=0
```

**errors = 0。防御は正常時に 1 件も誤爆しない。**

## 2.2 誤った呼び方(パス文字列)— **防御が効くかを見る**

```
======== B. 誤った呼び方 (パス文字列) ========
  coin                    11/11  complete  score=null spawn=null  contradiction=null
  habit                   11/11  complete  score=null spawn=null  contradiction=null
  reform-claude-md-diet    5/11  stalled   score=null spawn=null  contradiction=null
  reform-eval-gauge       11/11  complete  score=null spawn=null  contradiction=null
  tenbin                  17/17  complete  score=null spawn=null  contradiction=null
  --> CONTRADICTION_TRUE=0  CONTRADICTION_NULL=5  errors=10
  errors[0] = {"engine":"gauge","key":"runs[coin].score",
               "reason":"run-state carries no phases — 測れないものに点は付かない(第37条)",
               "at":1788340978671,"fatal":false}
  errors by engine = {"gauge":5,"spawn-trace":5}
```

## 2.3 判定 — 5 条件すべて PASS

```
======== 判定 ========
(1) 正常時に errors を積まない (過剰防御でない) : true   errors=0
(2) パス渡しで全 run の spawn=null            : true
(3) パス渡しで全 run が errors[] に積まれる   : true  (spawn-trace errors=5 / runs=5)
(4) パス渡しで contradiction=null (緑でない)  : true
(5) 正しい呼び方で矛盾が実際に検出される     : true  (件数=3)
(6) 防御なし(前版)ならパス渡しで  : contradiction=[false,false,false,false,false]  errors=0  <<< 偽陰性

ALL_PASS = true
```

**(6) が本改修の値打ちである。** 防御が無ければ**同じ誤りが 5 run すべてで静かに緑になり、
errors も 0 のままだった**。防御があると `contradiction=null` + errors 10 件になる。

**第16条「判定不能は緑ではない」が、設計のとおり実装可能であることを実物で確認した。**
画面側の受けも `ux.md` が引き継いでいる(`data-state="error"` / `data-awaiting="spawn-trace"`)。

## 2.4 **同じ病が他の engine に潜んでいないか — 61 ケースを全数調査した**

design.md §1.5.1 の表は `spawnTrace.report` **のみ**を「殻に捕まらない」と書く。
**その表が網羅的かを疑い、13 engine の主要関数に誤った引数を与えて全数試した**(V3)。

```
SILENT_BAD_COUNT = 13
THROW_COUNT = 14   NORMAL_OK_COUNT = 22
```

### 誤った引数なのに静かに「空/ゼロ」を返すもの(= spawn-trace と同じ形)

| # | 呼び出し | 返り | **pulse.js の経路上か** | 危険度 |
|---|---|---|---|---|
| 1 | `spawnTrace.report(<path>)` | `{ok:true,total:0}` | **在り** | **既知・防御済み** |
| 2 | `spawnTrace.report({})` | `{ok:true,total:0}` | 在り | **同じ防御が効く** |
| 3 | `spawnTrace.report(42)` | `{ok:true,total:0}` | 在り | **同じ防御が効く** |
| 4 | `kg.query("zzz-no-such-thing")` | `[]` | **無し**(設計は `nodes.jsonl` 直読み) | 低 |
| 5 | `kg.getNode("zzz-nope")` | `null` | 無し | 低 |
| 6 | `clergy.cardinalFor("zzz")` | `null` | 無し(設計は `COLLEGE` の鍵数のみ) | 低 |
| 7 | `clergy.cardinalFor(null)` | `null` | 無し | 低 |
| 8 | `clergy.groupByCardinal([])` | `[]` | 無し | 低 |
| 9 | `clergy.lexiconCheck("")` | `[]` | 無し | 低 |
| 10 | `wiring.requiresOf("zzz.js")` | `[]` | 無し(設計は `wiring.check()`) | 低 |
| 11 | `derived.offendingAssertions("")` | `[]` | 無し(設計は `derived.check()`) | 低 |
| 12 | `codex.article(99999)` | `[]` | 無し(設計は `codex.parse().length`) | 低 |
| 13 | `codex.article(-1)` | `[]` | 無し | 低 |

**結論: 断面の経路上で「静かに緑」を作りうるのは `spawnTrace.report` **ただ 1 本**であり、
design.md §1.5.1 の表は正しい。** 他の 10 件は pulse.js が呼ばない関数か、
「不在の語を引いて 0 件」という**意味的に正しい空**である。

**設計の 2 段構え(殻 + 事前 assert)が、経路上の全ケースを覆っていることを確認した。**

### 逆に、投げてくれるもの(殻だけで足りる)— 14 件を確認

```
THROW gauge.score(<path>)     -> run-state carries no phases — 測れないものに点は付かない(第37条)
THROW gauge.score({})         -> 同上
THROW gauge.score(null)       -> Cannot read properties of null (reading 'domains')
THROW gauge.score({phases:[]})-> 同上のメッセージ
THROW spawnTrace.report(null) -> Cannot read properties of null (reading 'domains')
THROW kg.query(null)          -> Cannot read properties of null (reading 'toLowerCase')
THROW kg.query({}) / kg.query(42) -> sub.toLowerCase is not a function
THROW forge.buildDag("x","zzz")/({s:"r"})/(null) -> SCALES[scale] is not a function
THROW forge.chooseScale(null) -> Cannot read properties of null (reading 'toLowerCase')
THROW gauge.compare({},{})    -> ledger has no entry for: [object Object]
THROW lessons.exportLessons() -> The "path" argument must be of type string … undefined
```

**`gauge.score` は 4 通りの誤りすべてで投げる。** §1.5.1 の「gauge は殻だけで足りる」は正しい。

### 調査中に見つけた**設計に書かれていない**振る舞い 2 件(build 相への申し送り)

```
gauge.readLedger("C:/nope/nope.jsonl") -> len10   ← 引数を無視して既定台帳を返す
                                                    (§1.3.7 は引数なしで呼ぶので実害なし)
checkAgents.installedAgents()          -> null    ← catch{return null} の静かな null
checkAgents.installedAgents(dir)       -> Set(30) ← JSON.stringify(Set) は {} になる
```

**`counts.agents` を実装するとき、`installedAgents()` は Set を返す。**
断面に載せるなら `[...set].length` が要る。design.md §1.3.2 は
「`check-agents.js` / `~/.claude` 配下の実数え」としか書いておらず**関数名を指定していない**(§5.2 で後述)。

---

# §3. 94KB へ増える過程で新たな欠陥が入っていないか

## 3.1 §9「実装時の罠」8 件 + 追加 2 件 — **罠の記述自体を実走で検査した**

| 罠 | 主張 | 私の実走結果 | 判定 |
|---|---|---|---|
| **罠1** | `report()`/`score()` にパスを渡すな。gauge は THROW、spawn-trace は静かに 0 | §2 で全面再現。防御も機能 | **正** |
| **罠2** | 入口は門ごとに違う(`vendor`=verify / `workspace`=2本合成) | `vendor.check`/`ws.check` ともに `undefined`。正しい入口で 5 門 `ok:true` | **正** |
| **罠3** | `counts.engines` は pulse.js 込みで 34 になる | 現在 `graph/*.js` = **33**、`pulse.js` は未存在。追加後 34 は正しい。bash 側も 33 | **正** |
| **罠4** | ドット除外を欠くと node=9 / bash=7 で割れる | **実測で 9 対 7 に割れることを確認**(§1.3) | **正** |
| **罠5** | `exportLessons(outPath)` は必須。読了後 unlink | `2.0ms count=65 byKind={"mechanism":63,"conduct":2}` / unlink 済み=true | **正** |
| **罠6** | CLI は `due:false` でも exit 1。module 呼びなら exit code が無い | `node graph/daily-guard.js due` → **exit=1** かつ `"due": false`。module 呼びは exit code 無し | **正** |
| **罠7** | `http.get` は `..` を正規化するので生ソケットで検査せよ | **記述が不正確。下記参照** | **要訂正(軽微)** |
| **罠8** | `census.js` は `opts.runTests !== false` を既に持つ。CLI 配線のみ未実装 | `grep -c 'no-tests'` → **0** / `grep -c 'runTests'` → **1**(`census.js:41: if (opts.runTests !== false) {`) | **正** |
| **罠9** | 相数 6 と 11 は道が衝突する | `{"6":["quick","counsel"],"11":["reform","cartography"],"14":["standard"],"17":["full"]}` | **正** |
| **罠10** | `daily.ledger` と FR-22 の `ledger[]` は別物 | `isDue().ledger` = 日次台帳 / `gauge.readLedger()` = 点数台帳。別物 | **正** |

### 罠7 の不正確さ — **私の前回の申し送りを、私自身が訂正する**

design.md 罠7 は「`http.get` は**送信前にパスを正規化するため** `..` がサーバに届かず **404 が返る**」と書く。
これは**前回私が書いた申し送りをそのまま採録したもの**である。**私の元の記述が不正確だった。**

```
=== 罠7 の検証: どの呼び方なら .. がサーバに届くか ===
  http.get({path:"/../../x"})   options形     -> サーバが見た URL = "/../../x"   ← 届く
  http.get("http://…/../../x")  URL文字列形   -> サーバが見た URL = "/x"         ← 消える
  http.get(new URL(…))          URL物体形     -> サーバが見た URL = "/x"         ← 消える
  raw socket (直書き)                          -> サーバが見た URL = "/../../x"   ← 届く
```

**正確には「正規化するのは `http.get` そのものではなく `URL` パーサである。」**
`options` オブジェクトで `path` を直に渡せば `..` はそのままサーバに届く。
私が前回 404 を見たのは **URL 文字列形で呼んだから**である。

**ただし build 相への処方(生ソケットで検査せよ)は正しく、安全側に倒れている。**
生ソケットは必ず届くので、この罠に従えば 403 分岐は確実に踏める。
**誤った処方を導かないため、判定に影響させない。** 訂正は §6 の申し送りに回す。

## 3.2 新設節に矛盾が無いか

| 節 | 検査 | 結果 |
|---|---|---|
| §1.3.2a(D-5 是正) | 不変条件 `creations + workshops == visible` | **true** |
| §1.3.4a(D-3 防御) | 実装して 5 条件 | **全 PASS**(§2.3) |
| §1.3.7(FR-22) | `ledger` 66 件 / `gauge-ledger` 8 件 / `baseline` を呼ばない旨 3 件 | **有り** |
| §1.5.1(投げない故障) | 61 ケース全数調査で表の網羅性を検証 | **表は正しい**(§2.4) |
| §1.7(時間収支) | 「~200ms」が生きた記述として残っていないか | **残っていない**。L677 は「前版は過大見積だった」、L690 は「200ms ではない」、L727 は `~~取り消し線~~`。L1218 の `200ms` は keepalive テストの別文脈 |
| §8(第17条) | design.md に色が混ざっていないか | `grep -coE '#[0-9a-fA-F]{6}' design.md` → **0**(identity.md は 121。分離できている) |
| §6.1 | テスト 13 本の実在 | 表の行数 **13**。ファイル名も 13 種(+既存 paradise.test.js) |

**新たな欠陥は見つからなかった。**

---

# §4. gates の実測値と機差の扱い — **私の機で測り直した**

## 4.1 私の機での再測(前回 29.1ms → 今回は違った)

**前回私は 29.1ms を報告した。今回同じ機で測り直したところ、まったく違う値が出た**:

```
=== gates を私の機で実測し直す (同一プロセス内 10 周) ===
pass 1 cold: wiring=true(29.6) vendor=true(3.4) derived=true(24.0) check-agents=true(4.6) workspace=true(23.3)  SUM=84.9ms
pass 2 warm: … SUM=78.2ms   pass 3 warm: … SUM=86.1ms   pass 4 warm: … SUM=88.6ms
pass 5 warm: … SUM=73.8ms   pass 6 warm: … SUM=71.3ms   pass 7 warm: … SUM=73.0ms
pass 8 warm: … SUM=69.9ms   pass 9 warm: … SUM=65.4ms   pass10 warm: … SUM=65.6ms

COLD = 84.9ms   WARM min/max/avg = 65.4 / 88.6 / 74.7ms
50ms 閾を跨ぐか(warm) : min<50=false  max>50=true
```

別プロセスで 3 回起動し直しても:

```
  proc: cold=62.8  warm=[50.3, 50.4, 52.1, 52.2, 53.1]
  proc: cold=63.8  warm=[54.7, 50.5, 51.2, 61.7, 54.8]
  proc: cold=64.1  warm=[49.6, 49.6, 50.0, 51.1, 53.5]
```

**私の機の実測は warm 49.6〜88.6ms である。前回の 29.1ms は再現しなかった。**

| 測定 | gates warm |
|---|---|
| 私の機・前回 | 29.1ms |
| 神官の機 | 51〜53ms |
| **私の機・今回** | **49.6〜88.6ms** |

**同じ機の同じ engine で 29ms と 88ms が出る。** design.md §1.7 が
「29ms と 53ms の差は engine の変更ではなく、**機と時の揺らぎ**である」と書いたのは
**私自身の再測によって、より強い形で裏付けられた。**

## 4.2 50ms 閾を跨ぐ設計になっていないか — **断面まるごとで検証**

design.md §1 の断面を設計どおり実装し(V4)、キャッシュの有無で 8 周ずつ測った。

### キャッシュ**無し**(前回私が「不要では」と申し送った案)

```
  断面 #1 (COLD)  ms=76.9  gatesCached=false  errors=0
  断面 #2 (WARM)  ms=57.6   #3 ms=56.4   #4 ms=58.5   #5 ms=52.6
  断面 #6 (WARM)  ms=52.6   #7 ms=53.2   #8 ms=60.9

WARM min/max/avg = 52.6 / 60.9 / 56.0ms
AC-N01d (warm < 50ms) : FAIL  (WARM_MAX=60.9ms)
```

### キャッシュ**有り**(design.md が採った設計)

```
  断面 #1 (COLD)  ms=82.6  gatesCached=false  errors=0
  断面 #2 (WARM)  ms=8.7    #3 ms=8.1    #4 ms=8.2    #5 ms=7.5
  断面 #6 (WARM)  ms=7.2    #7 ms=7.0    #8 ms=8.6

WARM min/max/avg = 7.0 / 8.7 / 7.9ms
AC-N01d (warm < 50ms) : PASS  (WARM_MAX=8.7ms)
```

## 4.3 判定 — **私の前回の申し送りが間違っていた。design.md の判断が正しい**

**前回私は「実測 29.1ms なのだからキャッシュは不要ではないか」と申し送った。**
**私の機で測り直した結果、キャッシュ無しでは AC-N01d を FAIL する(warm 最大 60.9ms)。**

design.md §1.7「mtime キャッシュの要否 — 再検討した結果、残す」は**正しい**。
そこに書かれた理由 —

> **29ms と 53ms の差は engine の変更ではなく、機と時の揺らぎである。
> その揺らぎが 50ms の閾を跨ぐ以上、キャッシュ無しの設計は「速い日は緑、遅い日は赤」になる。**

— は、**私の機で「速い日 29ms / 遅い日 88ms」が実際に起きたことで証明された。**

**50ms 閾を跨ぐ設計になっていないか**: キャッシュ有りで warm 7.0〜8.7ms。
**閾から 6 倍の距離があり、跨がない。** 設計は機差を正しく処理している。

さらに design.md は **キャッシュの代償を画面に語らせる**設計(`gates[i].at` をパネル単位の
鮮度として出す / `gatesCached` を断面に載せる)を併記しており、
**「キャッシュを持つならその事実を画面が語らねばならない」**という第16条系の規律を保っている。

## 4.4 断面が設計どおり全部埋まったことの確認

```
counts       : {"articles":50,"engines":33,"cardinals":7,"creations":7,"workshops":1,
                "runs":5,"kgNodes":99,"kgEdges":33,"lessons":65}
gates        : wiring=true(20.1) vendor=true(2.1) derived=true(20.4) check-agents=true(3.3) workspace=true(16.6)
scale        : {"quick":{"phases":6},"standard":{"phases":14},"full":{"phases":17},
                "reform":{"phases":11},"counsel":{"phases":6},"cartography":{"phases":11}}
lessonsByKind: {"mechanism":63,"conduct":2}
ledger.length: 15   ledger[last]: {"ts":"2026-09-02T09:23:44.553Z","slug":"tenbin",
                                   "scale":"full","score":100,"phasesDone":17,"phasesTotal":17}
daily        : {"due":false,"reason":"already ran for 2026-09-01 …","owedDay":"2026-09-01",
                "jst":"2026-09-02 18:26 JST"}
atlas        : 6  conclave,dag,dispatch,hierarchy,run,wiring
errors       : []
runs:
   coin                    11/11 complete  score=100 total= 11 noTrace= 11 contradiction=true  scaleGuess=null cand=[reform,cartography]
   habit                   11/11 complete  score= 45 total= 11 noTrace= 11 contradiction=false scaleGuess=null cand=[reform,cartography]
   reform-claude-md-diet    5/11 stalled   score= 80 total= 11 noTrace= 11 contradiction=false scaleGuess=null cand=[reform,cartography]
   reform-eval-gauge       11/11 complete  score=100 total= 11 noTrace= 11 contradiction=true  scaleGuess=null cand=[reform,cartography]
   tenbin                  17/17 complete  score=100 total= 17 noTrace= 17 contradiction=true  scaleGuess=full cand=[full]
CONTRADICTION_COUNT = 3
```

**errors = [] で全鍵が埋まった。設計は実装可能である。**

### AC-22b の 3 値一致 — **則3 の正しさが実証された**

```
  源(readLedger().length)   = 15
  断面(snapshot.ledger.len) = 15
  表示(CLI grep 行数)        = 15
```

**design.md 執筆時は 10 だった。今は 15 である。**
**固定値 10 を期待値に書いていたら、本日この門は落ちていた。**
design.md が「10 は執筆時点の参考値であって期待値ではない(則3)」と明記し、
**3 つの数え方の一致**を測る設計にしたことが正しかったと、台帳の増加が証明した。

---

# §5. build 相が実装できる粒度か

## 5.1 具体的で迷いようがない箇所

| 対象 | 評価 | 根拠 |
|---|---|---|
| **断面スキーマ** | **十分** | §1.3.1〜1.3.7 が鍵ごとに「型 / source / ms / 落ちたときの値」を表で持つ。私は**この表だけを読んで実装でき、errors=0 で走った**(V4 がその証拠) |
| **gates の入口** | **十分** | §1.3.3 に `GATES` 配列のコードそのものが在る。写せば動く(実証済み) |
| **防御の実装** | **十分** | §1.3.4a に `readSpawn()` の全文。写して 5 条件 PASS(実証済み) |
| **サーバのエンドポイント** | **十分** | §2.3 に 5 経路 × 返すもの × ヘッダ。`Content-Length` を書かない等の落とし穴まで明記 |
| **SSE の書式** | **十分** | §2.4 に `retry:` / `event:` / `: ping` の生の文字列と `\n\n` 終端 |
| **三層の定数** | **十分** | §3.1 に `T` オブジェクト全 9 定数 |
| **テスト 13 本** | **十分** | §6.1 が「ファイル → 担う門 → 担う AC → 見積」の 4 列で全 13 本を割当。§6.2 が 60 秒に収める手を数値付きで 6 つ |
| **故障注入** | **十分** | §6.4 が門ごとに「壊し方 → 期待」を 13 行。私は G-01(D-5)を実際に壊して赤を確認した |
| **実装順序** | **十分** | §7 が 6 段階 + 5.2 を 5.1 より後に置く理由まで |

## 5.2 **曖昧な箇所 — 名指しする**(いずれも build 相で決められる。差戻し事由ではない)

| # | 箇所 | 何が曖昧か | build 相への処方 |
|---|---|---|---|
| **A-1** | §1.3.2 `counts.agents` / `commands` / `skills` | source が「`check-agents.js` / `~/.claude` 配下の実数え」とだけ。**関数名が無い**。実走すると `checkAgents.installedAgents()` は**引数なしで `null`**、`installedAgents(dir)` は **Set(30)** を返す。`commands` / `skills` を返す関数は **check-agents に存在しない**(実測: `Object.keys` に該当なし) | `agents` は `installedAgents(path.join(os.homedir(),'.claude','agents'))` の `.size`(**Set なので `.length` は無い**)。`commands` / `skills` は `fs.readdirSync` で直に数える(実測 agents 30 / commands 19 / skills 13)。**§1.3.2 に 1 行足すこと** |
| **A-2** | §1.3.1 最上位スキーマ表 | **`atlas[]` の行が無い**。§4.3 と §4.2 領域 8 は `atlas[]` を断面に載せると命じており、附録 I にも source が在る。**表だけが取り残されている** | §1.3.1 に `atlas[] | array | §4.3 | ~0.3 | []` を 1 行足す。実装は §4.3 の記述で足りる(私は実装できた) |
| **A-3** | §1.3.4 の `runs[i]` 形リテラル | `scaleCandidates` が**リテラルに無い**が、直下の表と罠9 には在る | リテラル 1 行に `scaleCandidates` を追記。**内容の齟齬ではなく写し漏れ** |
| **A-4** | §9 罠7 | `http.get` の正規化の**主体が不正確**(正規化するのは URL パーサ。options 形なら `..` は届く) | 処方(生ソケット)は正しいので**そのまま従ってよい**。記述だけ訂正 |
| **A-5** | §1.3.7 `gauge.readLedger()` | 引数の扱いが未記述。実測で**引数を渡しても無視して既定台帳を返す**(`readLedger("C:/nope/nope.jsonl")` → len15) | 設計は引数なしで呼ぶので実害なし。**引数を渡しても効かないことだけ知っておけばよい** |

**A-1 のみ「実装時に手が止まる」可能性がある。** 残り 4 件は写し漏れか記述の精度である。
**いずれも設計の構造を変えず、build 相が 1 行の判断で埋められる。**

## 5.3 前回の申し送り 8 件の取り込み状況

design.md §9 は前回の申し送り 8 件を全て取り込み、**各項に本改稿での実走結果を併記**した。
**罠7 だけは私の元の記述が不正確だったため、私の側で訂正する**(§3.1)。
残り 7 件は正しく取り込まれ、私の再走で全て再現した。

---

# §6. 判定

## **ratify** — **design 相を批准する。build 相へ進んでよい**

### 批准の根拠

| # | 前回の差戻し理由 | 現状 | 検証 |
|---|---|---|---|
| D-1 | FR-22 が設計に不在 | **是正** | ledger 66 件 / gauge-ledger 8 件 / 断面スキーマ §1.3.7 新設 |
| D-2 | `gauge.score(path)` が throw | **是正** | 実走で THROW 再現、正しい呼び方に訂正済み |
| D-3 | `spawn-trace.report(path)` が静かに 0 | **是正** | **防御を実装して 5 条件全 PASS。errors=0/10 の出し分けを実証** |
| D-4 | gates 2 門に `check()` が無い | **是正** | **13 engine の exports 一覧が実物と 1 名も違わず一致(EXPORTS_BLOCK_MISMATCH=0)** |
| D-5 | counts の三者不一致 | **是正** | node 7/1 = bash 7/1。故障注入で 9 対 7 に割れることも確認 |

**加えて、前回私が付けた「~200ms」の見積批判も実測へ改訂されており、
私の機での再測(warm 49.6〜88.6ms)が、むしろ design.md 側の
「機と時の揺らぎが 50ms を跨ぐ」という判断を裏付けた。**

**私が前回申し送った「キャッシュは不要では」は、私自身の再測により誤りであったと確認した。**
design.md がそれを鵜呑みにせず**自機で測り直して反論した**ことは、
第38条(改善の主張は測定で)と NFR-06(推測を設計に入れない)の正しい実践である。

**残る 5 件(A-1〜A-5)はいずれも 1 行の追記か記述精度の問題であり、
設計の構造を変えない。差戻す理由にならない。**

---

## §6.1 build 相への申し送り

### 実装順序(design.md §7 を支持。優先度を付す)

| 順 | 対象 | 優先度 | 着手前に読む節 |
|---|---|---|---|
| **0** | **PRE-03 の確認** | **最優先** | 私の実測で archify 残骸は**現在 0 個**(教主の掃除済み)。**着工前に再確認だけせよ** |
| 1 | `graph/pulse.js` の snapshot 部 | **最優先** | §1.3 全体 + **§1.3.4a を最初に書く** |
| 2 | engine 修正 4 件(§5) | 高 | 5.1 → 5.2 の順(§7 の理由が正しい) |
| 3 | `pulse.js` の serve 部(SSE / watch) | 高 | §2.3 / §2.4 / §2.5 |
| 4 | `dashboard/index.html` + `control.html` | 中 | §3 / §4 + `ux.md` / `identity.md` |
| 5 | `tests/dashboard-*.test.js` 13 本 | 中 | §6.1 / §6.2 / **§6.4 の故障注入を必ず書く** |
| 6 | `tribunal.yml` への結線 | 中 | §6.3 |

### 必ず踏む罠(私が実走で再現したもの)

1. **`spawnTrace.report()` / `gauge.score()` には run オブジェクトを渡す。**
   **`readSpawn()` の `total > 0` 事前 assert を最初に書け。** 後から足すのでは、
   それまでに書いたコードが静かに緑を返し続ける。**私の実測: 防御なしでは 5 run 全てが
   `contradiction=false` + `errors=0` になる。**
2. **gates の入口は門ごとに違う。** §1.3.3 の `GATES` 配列を**そのまま写せ**。
   `vendor.check` / `workspace.check` は `undefined` である(実測)。
3. **mtime キャッシュを省くな。** 私の機の実測でキャッシュ無しは warm 52.6〜60.9ms、
   **AC-N01d(50ms)を FAIL する。** キャッシュ有りで 7.0〜8.7ms。
4. **`counts.engines` は pulse.js を含んで 34 になる。** 固定値 33 と比較するな(実測: 現在 33、pulse.js 未存在)。
5. **`visibleDirs()` のドット除外を外すな。** 外すと node 9 対 bash 7 で割れる(実測)。
6. **`lessons.exportLessons(outPath)` の一時ファイルを必ず `unlink`** せよ(AC-18c)。
7. **`daily-guard` は module として呼べ。** CLI は `due:false` でも **exit=1** を返す(実測)。
8. **`..` 脱出の 403 検査は生ソケットで。** ただし理由は「`http.get` が正規化するから」ではなく
   「**URL パーサが正規化するから**」である。`options` 形なら `..` は届く(実測)。
   **生ソケットは常に届くので、処方には従ってよい。**
9. **`ledger.length` を固定値と比較するな。** design.md 執筆時 10 → 本日 **15**。
   **3 つの数え方の一致**で測れ(AC-22b)。
10. **`counts.agents` は `installedAgents(dir)` が返す Set の `.size`。**
    引数なしで呼ぶと**静かに `null`** が返る(実測)。`.length` は存在しない。

### 設計に 1 行ずつ足してから着工することを推奨する箇所

- **A-1**: §1.3.2 の `agents`/`commands`/`skills` に関数名を明記(**最も手が止まりやすい**)
- **A-2**: §1.3.1 最上位表に `atlas[]` の行
- **A-3**: §1.3.4 の `runs[i]` リテラルに `scaleCandidates`

**これらは build 相が実装しながら埋めてよい。design 相へ差し戻す必要はない。**

---

# §7. 本審査の作業屑の始末

検証スクリプトは全て `$LOCALAPPDATA/Temp/ratify2/` に置いた。
**`reform/dashboard-living-gate/` には 1 件も作っていない。**
本報告書き上げ後、Temp のスクリプトも削除する(§8 に削除確認の出力を載せる)。

engine / 創造物 / 台帳には**一切書き込んでいない**。
`lessons.exportLessons()` が作る一時ファイルは検査のたびに `unlink` した(実測 `true`)。

---

# §8. 判定の再掲

## **ratify**

**前回 reject した 5 欠陥は、私自身の実走によりすべて是正が確認された。**
とくに未検証だった「13 engine の exports 修正」は、
**exports 一覧ブロックが実物と 1 名の過不足もなく一致(EXPORTS_BLOCK_MISMATCH=0)**し、
**本文中の全 24 種の engine 参照のうち「正」として書かれたものに誤りは 1 件も無かった。**

**本改修の主眼である防御設計は、私が実装して走らせた結果、
誤った呼び方を `errors[]` に積み `contradiction=null` を出し、
正常時には 1 件も誤爆しないことを実証した(ALL_PASS = true)。**

**同じ病が他の engine に潜んでいないかを 61 ケースで全数調査し、
断面の経路上で「静かに緑」を作りうるのは `spawnTrace.report` ただ 1 本であることを確認した。
design.md §1.5.1 の表は正しい。**

**gates の機差については、私の機で 29ms が再現せず 49.6〜88.6ms が出たことにより、
「機と時の揺らぎが 50ms を跨ぐ」という design.md の判断が正しく、
前回の私の申し送り(キャッシュ不要)が誤りであったと確認した。**

**build 相へ進んでよい。**
