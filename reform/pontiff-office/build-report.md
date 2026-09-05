# build — 第52条の機構を積む

**相**: build @architect (reform の道 第4相)
**入力**: `reform/pontiff-office/design.md` (§13 コマンド面表 / §14 実装順序) / `requirements.md` (52本の AC) / `findings.md`
**ブランチ**: `reform/pontiff-office` (checkout / branch / push は行っていない。commit のみ)
**測定機**: Windows 11, git-bash, node v24.14.0 (`C:/Users/kikus/Documents/workspace/paradise`)

本文書の全ての「緑」には、**実際に走らせたコマンドと生の出力**が付いている。
「実装した」は主張であって証拠ではない(第5条)。

---

## 0. 要旨

| | |
|---|---|
| 積んだ段 | **設計 §14 の12段すべて**(その順序で) |
| 新しい engine | **2本** — `graph/domains.js` / `graph/ordain.js` |
| 太らせた engine | `spawn-trace.js`(閾値・判定表・監査) / `conclave.js`(紀元・門) / `gauge.js`(序列指標) / `forge.js`(admit) / `atlas.js`(kind 分類) / `contract.js`(--run) / `clergy.js`(RANKS.pontiff) |
| 憲法 | **第52条**を追記。索引を `codex.js index --write` で再生成(全52条) |
| 自己診断 | **290 passed, 0 failed → 312 passed, 0 failed**(試験 +22本) |
| commit | 6件(段ごとに小さく積んだ。main には触れていない) |
| **`chooseScale`** | **一行も触っていない**(11箇所の assert が緑のまま) |
| **`~/.claude`** | **手で編集していない**(鍛造器は overlay に書き、配備は `deploy.js` のまま) |
| **`scroll:true`** | **宣言していない**(図は溢れていない。転んでいたのは門である) |

### 0.1 commit の並び

```
$ git log --oneline -6
bf048a1 第52条の門を CI と散文に配線し、22本の回帰試験を建てる (設計 §14 段12)
4172ecf 憲法 第52条 — 教主の手は最後の手段である (設計 §14 段11)
35de8f4 分野の台帳・forge の admit・役者の鍛造器 (設計 §14 段8-10)
b873306 contract に run を渡す口を開け、秤に序列の指標を足す (設計 §14 段6-7)
8aad635 第52条の機構: 序列の閾値・判定表・紀元の印・門 (設計 §14 段2-4)
e9cc2ac atlas: 測定できなかったことを「溢れた」と呼ばない (第16条 / 第42条)
```

**#9(forge の admit)と #10(鍛造器)を同じ commit に入れた**理由は設計 §14 が指定した通りである —
`forge.js` が `graph/ordain.js` を名指しした瞬間、`wiring.js` の宙吊り検査が
「存在しない engine を呼んでいる」と鳴るからである(第21条c)。

---

## 1. 段ごとの記録

### 段0(基線) — 積む前の実測

**第24条**(検証していない土台の上に建てるな)。まず現況を測った。

```
$ node tests/paradise.test.js 2>&1 | tail -3

Paradise self-test: 290 passed, 0 failed
```

設計 §0.1 の F-1 と一致した。**findings §1.1 が記録した atlas の赤は再現しない。**
これが「間欠である」という設計の主張を裏づける。

---

### 段1 — atlas の門を直す(論点F)

**直したのは図ではなく門である。** `SUBJECTS` に `scroll:true` は宣言していない。

`firstScreen()` を `firstScreenOnce()` + 再試行つきの `firstScreen()` に分け、
返り値に **`kind`** を持たせた:

| 診断 / 終了状態 | `kind` | `scroll:true` で免除 | 行の語 | 合否 |
|---|---|---|---|---|
| exit 0 | `fits` | — | `fits` | 🟢 |
| `viewer/viewport-overflow` | `overflow` | **される** | `scroll(Npx)` / `OVERFLOW` | 宣言次第 |
| `viewer/projected-text-readability` | `unreadable` | **されない**(第48条e) | `字 N.Npx` | 🔴 |
| `viewer/chrome-unavailable`(exit 2) | `skipped` | — | `skipped` | 🟢 |
| `viewer/visual-check-runtime` / JSON 不可解 / 診断ゼロの非ゼロ終了 | **`inconclusive`** | **されない** | **`測定不能`** | 🔴(再試行後) |

**核心**: 溢れの文言(`図は第一画面に収まってこそ図である。巻物でよいなら…`)は
`kind === 'overflow'` のときだけ出す。旧実装は `reason` が receipt の `status`
(文字列 `"fail"`)に落ちたものにこの文言を接ぎ木しており、**門が嘘をつくだけでなく、
嘘の直し方(巻物の宣言)まで教えていた。**

巻物の免除も `overflow` にだけ効くよう狭めた —— 測らなかったものに巻物の許しを与えれば、
門は「見なかった」を「収まっていた」と言い換えることになる(第16条)。

#### 終わりの検め

```
$ node graph/atlas.js check
═══ 🗺  ATLAS GATE (第47条) ═══
  ✓ hierarchy   [architecture] 9/9  fits          動 29   734701b
  ✓ conclave    [workflow    ] 9/9  fits          動 26   734202b
  ✓ dispatch    [sequence    ] 9/9  fits          動 16   729702b
  ✓ dag         [architecture] 9/9  scroll(3312px)動 32   736885b
  ✓ run         [lifecycle   ] 9/9  fits          動 13   726618b
  ✓ wiring      [architecture] 9/9  scroll…       動 75   764256b  standard(最小交差 22)
────────────────────────────────
  ✓ 6 主題すべてが検査に通る（うち 1 件は平面化不能のため standard: wiring）
════════════════════════════════
EXIT=0
```

**AC-F1 合格**: exit 0 であり、標準出力に `OVERFLOW` を含まない。
`standard/conclave` `standard/dispatch` はともに **`fits`** —— 設計 §8.2 の実測 #2 と一致する。
**図は溢れていない。ゆえに巻物を宣言しなかった。**

---

### 段2 — 閾値と判定表(論点G)

`spawn-trace.js` に `TIERS` / `TIER_EPOCH` / `hasEpoch()` / `measure()` / `judge()` / `tierAudit()` /
`findRuns()` と subcommand `tiers` / `tier` / `audit` を足した。**この段では誰も呼ばない。**

閾値は `Object.freeze` で凍らせてある。走行中に書き換わる閾値は、
**黙って別の数で裁く門**を作るからである。

同じ commit で `clergy.RANKS.pontiff` に `tiers`(配列)と `duties`(object)を足した。
**`tiers` を配列にしたのは、順序そのものが法だからである。**
既存の `level`/`title`/`role`/`model`/`effort`/`why` は一つも変えていない。

#### 終わりの検め

```
$ node graph/spawn-trace.js tiers --json
{"epoch":"v1","TIERS":{"t3":{"files":2,"churn":50,"bytes":4096},"t2":{"files":10,"churn":880,"artifacts":2,"domains":2}}}
EXIT=0
```

**AC-G2 合格**: 7つの数(2 / 50 / 4096 / 10 / 880 / 2 / 2)がすべて現れる。

```
$ node -e "const r=require('./graph/clergy.js').RANKS.pontiff;console.log(JSON.stringify({tiers:r.tiers.map(t=>t.n+':'+t.ja),duties:Object.keys(r.duties)}))"
{"tiers":["1:委譲","2:編成","3:教主の手"],"duties":["manage","dispatch","reconcile","orchestrate","ordain","commune"]}
```

**AC-G3 / AC-G4 合格**: 三段がその順序で在り、序列3が最後に来る。神託が数えた役割が鍵として在る。

---

### 段3 — 紀元(epoch)の印

`conclave.convene()` の返り値の**最上位**に `epoch: { tier: 'v1', at: <iso> }` を刻んだ。

**`meta` の中に置かなかった理由**は設計 §2.4 の通りである。`meta` は forge が作る DAG から
丸ごと転記される(`meta: dag.meta || {}`)ので、そこに置けば**古い DAG を読み直して
convene し直した run が印を持たない**という抜け穴が開く。
印は「この run を作った engine が新しかったか」の証であり、**DAG の性質ではなく run の出自**である。

#### 終わりの検め — 既存 run が legacy と判定されること

```
$ node graph/spawn-trace.js audit
═══════ 👁  TIER AUDIT — 序列の門は実在の走行を見る (第52条) ═══════
  🟡 reform/conclave-resume/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 reform/dashboard-living-gate/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 reform/pontiff-office/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 ../paradise-creations/coin/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 ../paradise-creations/habit/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 ../paradise-creations/reform-claude-md-diet/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 ../paradise-creations/reform-eval-gauge/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 ../paradise-creations/tenbin/conclave.json  legacy (印なし・17 相が unobservable)
────────────────────────────────────────────────────────────────
  走査 8 件 / unobservable: 94 (legacy 8 走行)
  ✓ 紀元以後の違反は無い — 黄は増えていない
════════════════════════════════════════════════════════════════
EXIT=0
```

**findings §2.1 が数えた「既存8走行94相」と一致した。**
**本走行(`reform/pontiff-office`)自身が移行対象である** —— 設計 §2.4 が予告した通り。

---

### 段4 — 門を立てる(論点A/B)

`conclave.js` が `require('./spawn-trace.js')` するようにし、`markDone(run, id, art, opts)` が
`trace.judge()` を呼ぶようにした。

**門は throw する。** 戻り値で可否を返す形にすれば `markDone` を直に呼ぶ既存試験がすべて意味を変える。
throw なら CLI が `save` に到達せず、**run ファイルは書き換わらない**(既存の実在検査が既にこの形である)。

`next()` の発令書に `tier_hint` を足した(助言であって強制ではない。第34条)。

#### 終わりの検め — AC-A1〜A8 を実 CLI で撃った

**AC-A1(宣言なしの done は通らず、台帳も書き換わらない)**:

```
$ node graph/conclave.js done discover --run <印つき run> --artifact tests/paradise.test.js
序列が宣言されていない — 相 "discover" をどの序列で処理したか述べよ (第52条)
  --tier 1 (委譲) / --tier 2 (編成) / --tier 3 (教主の手・例外)
  (判定: no-tier / 相 discover)
EXIT=1

$ node -e "…run を読む…"
discover status = running / tierTrace = undefined
```

**exit 1、stderr に `序列が宣言されていない`、run ファイルは1バイトも動いていない。**

**AC-A2(序列1/2 は起動証跡を要求する)**:

```
$ node graph/conclave.js done discover --run <run> --artifact … --tier 1
起動の証跡が一つも無い — 序列1を名乗る相 "discover" は誰も起動していない (第27条)
  委ねるべき agent: market-researcher
  node graph/spawn-trace.js record <run> discover --agent market-researcher --tool-use-id <id>
  (判定: no-trace / 相 discover)
EXIT=1
```

`起動の証跡` と `第27条` を含む。**しかも次に何をすべきかを言っている**(第34条)。

**AC-A4(序列1の緑の側)**:

```
$ node graph/spawn-trace.js record <run> discover --agent market-researcher --tool-use-id toolu_demo
✓ observed discover ← market-researcher
$ node graph/conclave.js done discover --run <run> --artifact … --tier 1
序列1: 1 件の起動を観測: market-researcher
CONCLAVE — 聖職位階の進行
════════════════════════════════════════════════════
▶ 枢機卿 discovery — Discovery (調査)   [review: pontiff]
EXIT=0
```

**AC-A7(門相は序列3を名乗れない — 量が小さくても)**:

```
$ node -e "…quick の gate 相に、閾値の内側の実測で序列3を宣言する…"
gate 相 = verify
ok=false  (実測は閾値の内側であることに注意 — 量に関わらず赤である)
門相は序列3を名乗れない — 相 "verify" は gate である (第9条: 自己批評は独立でなければならない)
  教主が自分の仕事を自分で裁けば、独立は宣言のまま失われる
  委ねるべき agent: verification-loop
markDone throw:
門相は序列3を名乗れない — 相 "verify" は gate である (第9条: 自己批評は独立でなければならない)
```

**判定順3(量を測る前に立つ)が実際にそう振る舞っている。**

**AC-A5 / AC-A6(序列3の緑と赤)**:

```
$ node -e "…judge を閾値内と超過で撃つ…"
ok=true
序列3: 教主の手 (files=1/2 churn=12/50 bytes=980/4096)
--- AC-A6 赤の側: ok=false
序列3の枠を超えた — files=7 > 2 / churn=1420 > 50 / bytes=58000 > 4096
  本来の序列: 序列2 (編成 — 道の形をとるべき仕事である)
  委ねるべきだった agent: requirements-analyst
```

赤のときに門が言う3つ(**超えた量と閾値 / 本来の序列 / 委ねるべき agent 名**)がすべて出ている。

**`measure()` が実際の git を測っていることの証拠** — 上の実験の途中、実測値をこちらで
与えずに `done … --tier 3` を撃ったところ、門は本走行の実際の作業量を測って赤を出した:

```
序列3の枠を超えた — files=4 > 2 / churn=2838 > 50 / bytes=251627 > 4096
  本来の序列: 序列2 (編成 — 道の形をとるべき仕事である)
  委ねるべきだった agent: requirements-analyst
```

**この build 相の作業そのものが、序列3では処理できない量であることを機構が実測した。**
(本相は序列2 = 編成の対象であり、実際に道の形で回されている。)

**AC-B1(結線が門に見える)**:

```
$ node graph/wiring.js map | grep -E "conclave|spawn-trace|contract"
  conclave                 ←require  1  →require  3  呼ぶ面: 命令/試験/散文
  contract                 ←require  0  →require  1  呼ぶ面: 門(CI)/命令/試験
  spawn-trace              ←require  3  →require  1  呼ぶ面: 門(CI)/試験/機構
```

`conclave` の `→require` が 2 → **3** に増え、`spawn-trace` の `←require` が 2 → **3** になった。
設計 §4.1 の現況(`conclave ←require 1 →require 2` / `spawn-trace ←require 2 →require 0`)から動いている。

#### §10.1 の #7 #8 への処置 — 設計が指定した (A) を採った

`makeConclave()` は `convene()` を通すので、**8本すべてが印を持つ**(設計は6本が無傷と見積もったが、
実測ではヘルパー経由で8本とも印を持つ)。ゆえに設計 §10.1 が指定した **(A)** を全体に適用した:

```js
// tests/paradise.test.js に足したヘルパー
function doneT1(run, id, artifact) {
  const st = require(path.join(DIR, '..', 'graph', 'spawn-trace.js'));
  st.record(run, id, { toolUseId: 'toolu_test_' + id, agent: 'test' });
  return conclave.markDone(run, id, artifact, { tier: 1 });
}
```

**(B)(印を削って legacy を騙らせる)は採らなかった** —— 騙りを試験が教えることになるからである。
**序列の機構を入れた後の楽園では、環が回るとは序列を宣言して回ることである。**

---

### 段5 — 事後の突合と監査

`spawn-trace.js` に `tier <run>` / `audit` / `report` の五値を足した。

**`report()` の既存4鍵(`total`/`observed`/`assertedOnly`/`noTrace`)は名も意味も変えていない。**
`tests/dashboard-run-panel.test.js` がこの形に依存している。序列の二値(`tier3`/`unobservable`)は**足すだけ**。
**パス文字列を渡したときに `{ok:true,total:0}` を返す挙動も変えていない** ——
変えれば故障注入(罠 T-6)が意味を失う。

**`verify()` の三値には `unobservable` を混ぜていない**(設計 §10.2 の拘束)。
四値は `tierTrace[phase].state` に住み、三値は `verify()` に住む。

#### 終わりの検め

```
$ node graph/spawn-trace.js report reform/pontiff-office/conclave.json | sed -n '2p'
phases: 11   observed: 0   asserted-only: 0   no-trace: 11   序列3: 0   unobservable: 0
```

**AC-A12 合格**: 五値がすべて現れる。

```
$ node graph/spawn-trace.js tier <印つき run> | tail -3
  ✓ discover       序列1        observed
───────────────────────────────────────────────────
序列1: 1 / 序列2: 0 / 序列3: 0 / unobservable: 0
EXIT=0
```

**AC-A9 合格**。`audit` は段3の出力(走査8件 / unobservable 94 / exit 0)を参照。

**AC-A11(0件走査で exit 1)** は試験で撃っている(§3 の試験一覧)。
これが `audit` 自身の見張りである —— **何も見ずに緑を出す門を、門自身が禁じる。**

```
$ node graph/conclave.js status --run reform/pontiff-office/conclave.json --json | head -c 200
{"domainsRatified":3,"domainsTotal":6,"phasesDone":3,"phasesTotal":11,"domains":[{"cardinal":"discovery",…
EXIT=0
```

**AC-A13 合格**: 本走行は exit 0 を返し、`discover` は `done` のままである。
**移行が既存走行を壊していないことを、この走行自身が示した。**

---

### 段6 — contract の口

`contract.js check --run <run.json>` を開けた。**器は既に正しく、CLI に口が無かっただけである。**
`reconcile` の中身は一行も変えていない(CI の「👁 Spawn trace」段が撃つ3本の assertion を守るため)。

```
$ echo '{"phase":"discover","status":"done","artifact":"tests/paradise.test.js"}' | node graph/contract.js check
{ "accepted": true, "reason": "artifact verified (220702b): tests/paradise.test.js", "verified": "file", "size": 220702 }
NO_RUN_EXIT=0

$ echo '{"phase":"discover","status":"done","artifact":"tests/paradise.test.js"}' | node graph/contract.js check --run reform/pontiff-office/conclave.json
{
  "accepted": false,
  "verified": "file-but-unspawned",
  "size": 220702,
  "reason": "artifact exists but the phase was never dispatched — この相には起動の証跡が一つも無い — …"
}
RUN_EXIT=1
```

**AC-B3 合格**: `--run` 有りで exit 1 + `file-but-unspawned`、`--run` 無しの exit code は変化しない。

---

### 段7 — 秤(論点H)

`gauge.js` が `spawn-trace.js` を require し、6鍵(`tier1`/`tier2`/`tier3`/`noTier`/`unobservable`/`tier3Ratio`)を足した。
**集計は自前で書かず spawn-trace の四値を読む** —— 定義が二箇所に住めば必ず食い違う(第41条)。

```
$ node graph/gauge.js score reform/conclave-resume/conclave.json --json
{"score":100,"complete":true,"phasesTotal":11,"phasesDone":11,"domainsTotal":6,"domainsRatified":6,
 "firstPassRate":1,"reworkCount":0,"retryOverhead":0,"loopGuardTrips":0,"durationMs":6706706,
 "tier1":0,"tier2":0,"tier3":0,"noTier":0,"unobservable":11,"tier3Ratio":0}
```

**AC-H1 合格**: 序列ごとの相数が独立した鍵として在り、**`unobservable` は `tier1` とは別の鍵**である。
**AC-H2 合格**: `tier3Ratio` が在る。
**AC-H3 合格**: **legacy の `score` は 100 のまま**。既存9鍵の名も値も一つも動いていない。
式は `run.epoch` を持つ run にしか掛からない —— **過去の台帳の点を書き換えれば、
比較の基準線そのものが動き、以後どの reform も改善を証明できなくなる。**

**AC-H4 の2つは試験で分けて撃った**(印つき・宣言なし → 100未満 / 印つき・序列3で閾値内 → 100 のまま)。
**神託の訂正が明示的に許した例外を、秤が罰してはならない。**

`COMPARE_KEYS` に `tier3Ratio` を足し、`HIGHER_BETTER.tier3Ratio = false` とした
(**教主の手の割合は下がるほど良い**)。

#### `pulse.js` と dashboard への影響(設計 §16-5 の「要調査」への回答)

`pulse.readSpawn()` は `report()` の返り値から **`{total, observed, assertedOnly, noTrace, ok}` の5鍵だけを
明示的に取り出して**断面に載せる(`graph/pulse.js:238-241` を本相で実読)。
ゆえに `report()` に鍵が増えても**断面の形は一切変わらない**。
実測でも `dashboard-count: 15 passed` `dashboard-run-panel: 16 passed` とすべて緑である。

---

### 段8 — 分野の台帳(論点C)

`graph/domains.json`(14分野 / 14役者の宣言)と `graph/domains.js` を建てた。**この段では forge に触っていない。**

台帳を選んだ理由は設計 §5.1 の通り —— forge が名指しする14名のうち `overlay/agents/` に在るのは8名だけで、
残りは vendor 由来である。frontmatter に宣言を持たせれば `deploy.js` の transform 一覧を触ることになり、
AC-D4 の「配備の一致」が揺れる。`clergy.COLLEGE` が既に中央で所属を宣言しているのと同じ流儀を採った。

語彙は**日本語(境界なし)と英語(境界あり)に分けた** —— `\b` は日本語文中で事実上決して一致しない
(forge に残る実測済みの教訓)。

```
$ node graph/domains.js check
═══ 🎭 DOMAINS — 役者は何を担えるか (第52条) ═══
  分野 14 / 宣言を持つ役者 14 / 道が名指しする役者 13
  ✓ 道が名指しする役者は全員、担える分野を宣言している
════════════════════════════════════════════════
EXIT=0
```

**AC-C1 合格**(道が名指しする13名 + PSEUDO 免除の `verification-loop`)。

```
$ node graph/domains.js classify "音楽を作れ"            → music  (音楽・音声)          EXIT=0
$ node graph/domains.js classify "ポモドーロタイマーを作れ" → software  (実装・ソフトウェア)  EXIT=0
$ node graph/domains.js classify "動画を作れ"            → video  (映像・動画)          EXIT=0
$ node graph/domains.js classify "ぬるぬるぷりぷり"
分野を判定できない — 台帳の語彙にこの願いを写す言葉が無い
  語彙を育てるか、鍛造器で担い手を建てよ: node graph/ordain.js forge --help
EXIT=1
```

---

### 段9 + 段10 — forge の admit と鍛造器(同一 commit)

**`chooseScale` は一行も触っていない。** 判定は `admit()` に足した。

```
$ node graph/forge.js scale "音楽を作れ"
担い手が居ない — 分野: 音楽・音声 (music)
  道 standard が名指しする役者のうち、この分野を担うと宣言していない者:
    requirements-analyst, architect, tdd-guide, code-reviewer, ux-reviewer, security-reviewer
  実在するだけでは足りない。適合を宣言していない者に仕事は渡せない (第52条)
  node graph/ordain.js forge --name <役者名> --domain music --cardinal <枢機卿> --rank priest --write
EXIT=1
```

**AC-C2 合格**: 3つ(担い手が居ない語 / 分野名 / 鍛造器の呼び出し行)がすべて出る。

```
$ node graph/forge.js scale "ポモドーロタイマーを作れ"
standard
EXIT=0
```

**AC-C4 合格**: 従来と一字も変わらない。

```
$ node graph/forge.js scale "ぬるぬるぷりぷり"
分野を判定できない — 「ぬるぬるぷりぷり」を写す語彙が台帳に無い
  既定の道へ黙って落とさない。判定不能は緑ではない (第16条)
  …
EXIT=1
```

**AC-C6 合格**: 既定 `standard` へ落とさない。

```
$ node graph/forge.js plan "音楽を作れ" --out $TMP/pt-XXXX/f.json
担い手が居ない — 分野: 音楽・音声 (music)
  …
EXIT=1
$ ls $TMP/pt-XXXX
ls: cannot access '…/pt-XXXX': No such file or directory
```

**AC-C3 合格**: 拒んだとき `<path>` を作らない。判定を `mkdirSync` の**前**に置いたからである。

#### 鍛造器 `graph/ordain.js`

```
$ node graph/ordain.js forge --name composer --domain music --cardinal construction --rank priest
═══ ⚒  ORDAIN — 鍛造 composer ═══
  分野: music   枢機卿: construction   位階: priest
  · overlay\agents\composer.md   役者の定義そのもの。原本は overlay に住む (第29条)
  · overlay/overlay.json         own.agents に "composer.md" を足す — deploy の plan に載せるため
  · graph/clergy.js              COLLEGE["construction"].priests に "composer" を足す — 無主にしない (第25条)
  · graph/domains.json           agents["composer"] に分野 "music" を宣言する (第52条)
────────────────────────────────────────────
  (既定は dry-run — overlay は1バイトも変わっていない)
  実際に書くなら --write を足せ
EXIT=0

$ git status --porcelain overlay/
(空 — dry-run は何も書いていない)
```

**AC-D3 合格**(既定は dry-run)。**AC-D2 合格**: 計画に `~/.claude` は一つも現れない —— **鍛造器は配備器ではない。**

**AC-D5(fail fast)の4つ**:

```
$ node graph/ordain.js forge --name composer
🔴 鍛造できない — 2 件の欠け (第52条: 後の門が鳴るのではなく、鍛造の時点で鳴る)
   - --domain が無い — 担える分野を宣言されない役者は道に載せられない (第52条)
   - --cardinal が無い — 無主の役者は誰の麾下でもない (第25条)
EXIT=1

$ node graph/ordain.js forge --name architect --domain music --cardinal construction
🔴 鍛造できない — 1 件の欠け …
   - 名 "architect" は既存の agent と衝突する — 名の混同は事故を生む (第17条)
EXIT=1

$ node graph/ordain.js forge --name x1 --domain nosuch --cardinal nosuch
🔴 鍛造できない — 2 件の欠け …
   - 分野 "nosuch" が台帳に無い — 既知: software, research, diagram, music, …
   - 枢機卿 "nosuch" が COLLEGE に無い — 既知: discovery, requirements, architecture, …
EXIT=1
```

位階違反も同様に拒む(試験で撃っている)。**4つとも `deploy` の前に判る。**

#### 宙吊りが解けたこと(AC-D6)

```
$ node graph/wiring.js check
═══ 🔗 WIRING GATE (第44条 / 第48条) ═══
  engine 36 / 内の辺 51
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
EXIT=0
```

engine が 34 → **36** に増え、孤児も宙吊りもゼロ。
**`forge.js` が出す呼び出し行がそのまま結線になった** —— 第34条を満たす一行が第48条をも満たす。

---

### 段11 — 憲法 第52条

`CONSTITUTION.md` に第52条を追記し、`node graph/codex.js index --write` で索引を建て直した。

```
$ node graph/codex.js index --write
✍️  CONSTITUTION.INDEX.md を建てた (4218 B)
$ node graph/codex.js check
═══════ 📖 CODEX CHECK ═══════
  ✓ 索引は本文と一致している (52 条)
══════════════════════════════
EXIT=0
```

**AC-E1 合格**(全52条)。

#### 設計 §7.2 の地雷5つをどう避けたか

| # | 地雷 | 実測での確認 |
|---|---|---|
| 1 | 道名を書かない(AC-E6) | `node graph/codex.js article 52 \| grep -E "quick\|standard\|full\|reform\|counsel\|cartography"` → **`NO_SCALE_NAMES`** |
| 2 | 閾値の数を書かない(AC-E7) | 条番号(`第N条`)を除いた上で `2\|50\|4096\|10\|880` を探した → **`NO_THRESHOLD_NUMBERS`** |
| 3 | 条番号への参照が `50` `10` を含む誤爆 | **上の grep は `第[0-9]*条` を先に除去してから撃っている** |
| 4 | 位階の名は正典に従う | `node graph/clergy.js lexicon-check` → `✓ 205 文書に異名なし` **EXIT=0** |
| 5 | 委譲/編成/教主の手 が LEXICON と衝突しないこと | 同上(lexicon-check 緑) |

```
$ node graph/codex.js article 52 | sed 's/第[0-9]*条//g' | grep -nE "\b(2|50|4096|10|880)\b" || echo "NO_THRESHOLD_NUMBERS"
NO_THRESHOLD_NUMBERS

$ node graph/codex.js article 52 | grep -E "quick|standard|full|reform|counsel|cartography" || echo "NO_SCALE_NAMES"
NO_SCALE_NAMES

$ node graph/clergy.js lexicon-check
═══ 🕮  LEXICON CHECK (第41条) ═══
  ✓ 205 文書に異名なし — 名は一つの出所に従っている
═══════════════════════════════════
LEX=0
```

**AC-E3 合格**: 条が `graph/conclave.js` / `graph/spawn-trace.js` / `tests/paradise.test.js` を名指しする。
**AC-E4 合格**: 三段が委譲 → 編成 → 教主の手 の順で現れ、序列3が例外であることを述べ、
**「教主は作業してはならない」という絶対禁止の表現を含まない**(神託の訂正に従った)。

---

### 段12 — CI と散文

`.github/workflows/tribunal.yml` に2段を足した(**既存の故障注入の段は消していない** ——
健全な系しか見ない門への対抗である):

```yaml
      - name: 👁 Tier audit — 序列の門が実在の走行を見る (第42条 / 第52条)
        # 走査対象は実在する conclave.json（合成した run ではない）。
        # 合成 run しか見ない門は健全な系しか見ない — 故障注入の段(上)と対になる。
        # 既存の走行は紀元の印を持たないので黄に落ち、CI は落ちない。
        # 落ちるのは紀元以後の違反だけである。
        run: node graph/spawn-trace.js audit

      - name: 🎭 Domains — 役者は担える分野を宣言しているか (第52条)
        # 実在(check-agents)と適合(domains)は別の問いである。
        run: node graph/domains.js check
```

**AC-B4 合格**: `grep -c "conclave.json" .github/workflows/tribunal.yml` が現況 0 → **1以上**になり、
その段が `node graph/spawn-trace.js audit` を呼ぶ。

README:
- engine 表に `graph/domains.js` / `graph/ordain.js` / `graph/spawn-trace.js` の行(**AC-D8**)
- `graph/forge.js` の行に `admit()` を追記
- 試験数 `290/290 pass` → `312/312 pass`(**AC-E2**)

---

## 2. 終わりの検め(全門)

**すべて実際に走らせた生の出力である。**

```
$ node tests/paradise.test.js
Paradise self-test: 312 passed, 0 failed
EXIT=0
```

**AC-F2 合格**: `0 failed`、passed は 289 以上(290 → **312**、+22本)。

```
$ node graph/check-agents.js
EXIT=0
every named priest exists, every phase has a master, every dispatch reaches the declared priest, the hierarchy is real

$ node graph/census.js check
CENSUS_EXIT=0
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════

$ node graph/apply-models.js verify
EXIT=0
all agents match the rank policy

$ node graph/apply-spawn.js verify
EXIT=0
every agent that governs subordinates can actually dispatch them

$ node graph/deploy.js check
EXIT=0
checked: 60  transforms (diff expected): agents
  ✓ every deployed file matches its declared source

$ node graph/wiring.js check
EXIT=0
  engine 36 / 内の辺 51
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い

$ node graph/domains.js check
EXIT=0
  分野 14 / 宣言を持つ役者 14 / 道が名指しする役者 13
  ✓ 道が名指しする役者は全員、担える分野を宣言している

$ node graph/codex.js check
EXIT=0
  ✓ 索引は本文と一致している (52 条)

$ node graph/atlas.js check
EXIT=0
  ✓ 6 主題すべてが検査に通る（うち 1 件は平面化不能のため standard: wiring）
```

### 素の環境(第20条)

```
$ PARADISE_UPSTREAM=/nonexistent CLAUDE_HOME=/nonexistent node tests/paradise.test.js
BARE_EXIT=0

Paradise self-test: 312 passed, 0 failed
```

**上流もハーネスも無い環境で同じ 312/312。** 楽園は取り込んだ資産だけで立つ。

---

## 3. 建てた試験(22本)

**健全な系で緑になるだけの門は証明されていない**(第21条)。ゆえに各所で故障を注入した。

| 試験名 | 撃つ AC | 注入した故障 |
|---|---|---|
| `第52条: 教主の職務は一文の文字列ではなく三段の序列である` | G3 / G4 | 順序が入れ替われば fail する assert |
| `第52条: 閾値は一箇所に住み、機械が読める (第41条)` | G2 | `TIERS` への書き込みが throw することを撃つ |
| `第52条: 環を回すことは仕事ではない — 統治は序列の外にある` | G1 | 5コマンド(status/next/status --json/contract check/check-agents)の exit code |
| `第52条: 序列の宣言なき done は通らず、台帳も書き換わらない` | A1 | 拒んだ後 status と tierTrace が汚れていないこと |
| `第52条: 序列1/2 は起動の証跡を要求する` | A2 / A3 | no-trace と asserted-only の2通り |
| `第52条: 序列1の緑の側 — 起動を観測したら通る` | A4 | — |
| `第52条: 門相は序列3を名乗れない — 量が小さくても許さない` | A7 | 閾値の内側でも赤になること |
| `第52条: 序列3を名乗りながら起動していれば食い違いが鳴る` | A8 | — |
| `第52条: 序列3の緑と赤 — 判定は実測が下し、名乗りが下さない` | A5 / A6 | 閾値内 / T2超過 / T2内の3通り |
| `第52条: 環と器は同じ run に同じ判定を下す (第27条)` | B2 | **4つの組で片側だけ緑になる組合せが無いこと** |
| `第52条: 移行 — legacy は黄で通り、verify は黄を緑にしない` | A10 / A13 | 実ファイル(本走行)で移行を確かめる |
| `第52条: 五値の集計 — 序列3と unobservable は別の数である` | A12 | パス渡しの挙動が変わっていないこと(罠 T-6) |
| `第52条: audit は何も見ずに緑を出さない` | A11 | 0件走査 → exit 1 の経路が在ること |
| `第52条: 秤は序列を測り、過去の台帳を書き換えない` | H1〜H4 | legacy の score が動けば赤 / 序列3を罰すれば赤 |
| `第52条: 前後比較に教主の手の割合が含まれる` | H5 | 向きが逆なら赤 |
| `役者の居ない仕事は道に入れない (第49条)` | C5 | **15願いを固定入力に、件数でなく不変条件を撃つ** |
| `第52条: 実在だけでは足りない — 二つの門が違う答えを出す` | C7 | **台帳から1名の宣言を消し、domains が赤・check-agents が緑のままを確かめる** |
| `鍛造器は原本に書き、配備器だけが実機に書く (第29条)` | D2 / D3 | 計画に `.claude` が現れれば赤 |
| `鍛造器は不完全な要求を鍛造の時点で拒む` | D5 | 分野なし/位階違反/枢機卿不在/名前衝突の4通り |
| `鍛造器は既存の門を撃つ — 増やせば図が壊れるなら増やせていない` | D4 | 7門を撃つことと、実際に2門を走らせる |
| `atlas: 測定できなかったことを「溢れた」と呼ばない` | **F(本PRの回帰の本体)** | 溢れの文言が `kind === 'overflow'` の守りの内側にしか無いこと / `scroll:true` が宣言されていないこと |
| `CI の序列の門は実在の走行を見る (第42条)` | B4 | 段を消せば赤 |

`第52条` を名に含む試験は **13件**、すべて passed(**AC-E5 合格**。設計は3件を見込んだが、
AC を1本ずつ分けて撃つ方が壊したときに何が壊れたか分かるので増やした)。

---

## 4. 正直な注記 — 設計と食い違った点、および限界

1. **設計 §10.1 の見積もりは半分外れた。** 設計は「markDone を呼ぶ8本のうち6本は印を持たない
   手書き run なので無傷」と述べたが、**実測では `makeConclave()` が `convene()` を通しているため
   8本すべてが印を持つ**。ゆえに設計が #7 #8 のために指定した処置 (A) を**8本すべてに適用**した。
   `doneT1()` ヘルパー1本と呼び出し側の書き換えで済み、**試験の主張は一つも変えていない**
   (どの assert も元のまま)。設計が (A) を選んでいたおかげで、対処は機械的だった。

2. **`measure()` の未コミット差分の帰属は近似である**(設計 §2.5 が既に認めた通り)。
   時刻で切れないので現在の相に帰属させた。前の相の残骸が加算されうるが、
   **過大評価の方向にしか働かない**(赤は出るが緑は出ない)ので fail-safe である。
   実測でそれが起きているのを確認した(段4 の `files=4 churn=2838` は本相の累積を含む)。

3. **`clergy.js` の `COLLEGE` をリテラルのまま engine に書き換えさせる判断は脆い**(設計 §16-4)。
   `writeCollege()` は挿入を `priests: [` の直後一点に限り、書いた後に再読込して構文を確かめ、
   壊れていれば**書き戻す**。だが台帳へ外出しする方が堅い。
   **verdict 相への申し送りとして残す** —— `clergy.js` を読む全ての門の前提を動かす改修になる。

4. **`ordain forge --write` の実走行は行っていない。** dry-run と `validate()` の4経路、
   `renderAgent()` の生成物、`plan()` の中身は撃ったが、**実際に新しい役者を鍛造して
   `deploy --write` まで回してはいない**。理由は、鍛造した役者を消す手順(`COLLEGE` から
   リテラルを削る)が本相の範囲を超えて既存 engine を汚す危険があるためである。
   **AC-D4 の7門は `ordain verify` が呼ぶ engine の一覧として撃ち、うち2門は実際に走らせた。**
   **AC-D7(`enlist`)も同様に経路の実装のみで、実走行はしていない。**
   これは正直に「経路が在ることを作り、実走行は次に残した」と記録する。

5. **atlas の `kind` 分類は「分類の正しさ」を証明し、「Chrome の挙動」は証明していない**
   (設計 §8.4 の申し送りを守った)。`inconclusive` の故障注入は receipt を模す形ではなく、
   **実装の構造そのもの**(溢れの文言が `kind === 'overflow'` の守りの内側にしか無いこと)を撃った。
   実際の CDP タイムアウトは再現していない。

6. **本相そのものが序列2(編成)の対象である。** 段4 で `measure()` に実測させたところ、
   本相の作業量は `files=4 churn=2838 bytes=251627` であり、序列3の閾値を大きく超えた。
   **機構が自分を作った相を正しく「序列3では処理できない」と判定した。**
   本走行は印を持たないので実際には `unobservable` に落ちるが、**測る器は正しく働いている。**

---

## 5. AC の充足(本相が実際に撃てたもの)

| 群 | AC | 状態 | 証拠 |
|---|---|---|---|
| G | G1 / G2 / G3 / G4 | ✅ | §1 段2、試験3本 |
| A | A1〜A13 | ✅ | §1 段4・段5、実 CLI 出力、試験9本 |
| B | B1 / B2 / B3 / B4 | ✅ | `wiring map`、試験、`contract check --run`、tribunal.yml |
| C | C1〜C7 | ✅ | §1 段8・段9、実 CLI 出力、試験2本 |
| D | D1 / D2 / D3 / D5 / D6 / D8 / D9 | ✅ | §1 段10、試験3本 |
| D | **D4 / D7** | ⚠️ **経路のみ** | 7門を呼ぶ実装と2門の実走行。**新役者の実鍛造は未実施**(§4-4) |
| E | E1 / E2 / E3 / E4 / E5 / E6 / E7 | ✅ | §1 段11、地雷5つの実測 |
| F | F1 / F2 / F3 | ✅ | §1 段1。**`scroll:true` を宣言せずに両方を満たした** |
| H | H1〜H5 | ✅ | §1 段7、試験2本 |

**49 / 52 を実測で充足。残り3(D4 の実鍛造・D7 の実走行、およびそれに紐づく確認)は
「経路は在るが実走行していない」と正直に記録する。**

---

## 6. 変更したファイル

| ファイル | 種別 | 何を |
|---|---|---|
| `graph/atlas.js` | 改 | `firstScreen()` の `kind` 分類 + 再試行、`check()` の文言を kind で分ける |
| `graph/spawn-trace.js` | 改(大) | `TIERS` / `measure()` / `judge()` / `tierAudit()` / `findRuns()` / `tiers` / `tier` / `audit` / report の五値 |
| `graph/conclave.js` | 改 | `require(spawn-trace)`、`convene` の `epoch`、`markDone` の門(throw)、`tier_hint`、CLI の `--tier` |
| `graph/clergy.js` | 改 | `RANKS.pontiff.tiers`(配列)と `.duties`(object) |
| `graph/contract.js` | 改 | `check --run <run.json>` の口 |
| `graph/gauge.js` | 改 | 序列6鍵、`WEIGHTS.tierBreach`、`COMPARE_KEYS`/`HIGHER_BETTER` |
| `graph/forge.js` | 改 | `admit()` / `explainAdmit()` / `forgeCallLine()`、CLI の `scale`/`plan`。**`chooseScale` は不変** |
| `graph/domains.json` | **新** | 14分野 + 14役者の分野宣言 |
| `graph/domains.js` | **新** | `check` / `classify` / `list` |
| `graph/ordain.js` | **新** | `forge` / `enlist` / `verify` |
| `CONSTITUTION.md` | 改 | 第52条 |
| `CONSTITUTION.INDEX.md` | 生成 | `codex.js index --write` |
| `.github/workflows/tribunal.yml` | 改 | Tier audit 段 + Domains 段 |
| `README.md` | 改 | engine 表3行 + forge 行の追記 + 試験数 |
| `tests/paradise.test.js` | 改 | `doneT1()` ヘルパー、環回し試験の序列宣言、**新試験22本** |

**触っていないもの**: `~/.claude`(手編集していない) / `forge.chooseScale` / `contract.reconcile` /
`spawn-trace.verify` の三値 / `gauge` の既存9鍵 / `atlas.SUBJECTS`(`scroll` の宣言) /
`pulse.js` / dashboard の門 / `deploy.js` の transform 一覧。
