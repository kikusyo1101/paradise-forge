# 楽園 — 弱い印の二病(PARA-10 / PARA-11)の実測 (reform/weak-signs / discover 相)

- 走行: `reform/weak-signs`(枝 `reform/weak-signs` / 2026-09-17)
- 主題: `reform/judgment-triad/debt.md` が凍らせた残債 **PARA-10 / PARA-11** の**射程**を測る
- **本相は実装しない。** 計測と候補の提示のみ。修理は後続の相の領分である。
- **本物の `graph/` `tests/` は一行も書き換えていない。** 実験は `require.cache` 注入と
  `$LOCALAPPDATA/Temp` の写しで行った(前走行 `_design_gate.js` の作法を踏襲)。

計測器(本走行が書いたもの、いずれも判定器を改変しない):

| 計測器 | 何を測るか | 出力 |
|--------|-----------|------|
| `_baseline.sh` | 7 門の基準線(逐次) | `_baseline_out.txt` |
| `_probe_para10.js` | `REFORM_RE` の全 20 印 × 世間の願い 46 件 | `_probe_para10_out.txt` |
| `_probe_para10b.js` | 誤着 45 件を種M(語中埋没)/種H(同音異義)に割る | `_probe_para10b_out.txt` |
| `_probe_para11.js` | 紛れ語×産物名 24 件 / `DIAGRAM_FALSE_FRIENDS` / `isCounsel` の経路 | `_probe_para11_out.txt` |
| `_matrix.js` | 前走行 101 件 + 残債 2 件 + 本走行 69 件 = **172 件**の 6×6 混同行列 | `_matrix_out.txt` |
| `_cand.js` | 修理候補を `require.cache` 注入で撃つ(行列 + 既存門) | `_cand_out.txt` |
| `_cand_stress.js` | 候補の**耐久試験**(コーパス外の両枝) | `_cand_stress_out.txt` |

---

## 1. 基準線 — 7 門を一つずつ逐次に走らせた(NFR: 並行させるな)

```bash
$ bash reform/weak-signs/_baseline.sh     # 7 門を逐次に走らせ _baseline_out.txt へ
```

| # | 命令 | exit | 末尾の集計行 |
|---|------|------|-------------|
| 1 | `node tests/paradise.test.js` | **0** | `Paradise self-test: 471 passed, 0 failed` |
| 2 | `node tests/route-matrix.test.js` | **0** | `Route matrix self-test: 13 passed, 0 failed` |
| 3 | `node tests/counsel.test.js` | **0** | `Counsel self-test: 210 passed, 0 failed` |
| 4 | `node tests/route-debt.test.js` | **0** | `Route debt self-test: 5 passed, 0 failed` |
| 5 | `node tests/ratify-guard.test.js` | **0** | `Ratify guard self-test: 9 passed, 0 failed` |
| 6 | `node graph/wiring.js check` | **0** | `✓ 門 23 本すべてに走らせる者が居る (第44条)` / `engine 39 / 内の辺 73` |
| 7 | `node graph/conclave.js audit` | **0** | `見捨てられた走行: 0 / 判定不能: 0 / 全 14` |

生の写し(`_baseline_out.txt` より):

```
Paradise self-test: 471 passed, 0 failed
--- exit=0 ---
Route matrix self-test: 13 passed, 0 failed
--- exit=0 ---
Counsel self-test: 210 passed, 0 failed
--- exit=0 ---
  ✓ D-1 [残債 PARA-10]: 一門の家系図…は今なお reform へ落ちる
  ✓ D-2 [残債 PARA-11]: 相関図を描けるアプリ…は今なお cartography へ落ちる
  ✓ D-3 [残債]: 原因が消えていないことを名指しで確かめる
  ✓ D-4 [門番]: debt.md が実在し、2 件を名指しで載せている
  ✓ D-5 [門番]: debt.md の願いは、この門が撃っている願いと一字一句同じ
Route debt self-test: 5 passed, 0 failed
--- exit=0 ---
Ratify guard self-test: 9 passed, 0 failed
--- exit=0 ---
═══ 🔗 WIRING GATE (第44条 / 第48条) ═══
  engine 39 / 内の辺 73
  ✓ 門 23 本すべてに走らせる者が居る (第44条)
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
--- exit=0 ---
▶ [paradise] weak-signs  domains 0/6
見捨てられた走行: 0 / 判定不能: 0 / 全 14
--- exit=0 ---
```

**基準線は 7/7 緑。** 与えられた基準線(471/0、13/0、210/0、5/0、9/0、門 23 本、
audit 0/0/全 13)と一致する —— ただし audit の総数は **全 13 → 全 14** に増えている。
本走行 `weak-signs` の走行帳(`▶ [paradise] weak-signs domains 0/6`)が加わったからであり、
見捨てられた走行は 0 のままである。

---

## 2. 二つの病の射程

### 2(a) PARA-10 — `REFORM_RE` の **20 印すべて**が世間の語に埋もれる

```bash
$ node reform/weak-signs/_probe_para10.js      # -> _probe_para10_out.txt
```

```
REFORM_RE: /(楽園|paradise|ハーネス|harness|憲法|constitution|engine|エンジン|門|gate|パイプライン|pipeline|自己改善|self-improve|オーケストレーション|orchestration|枢機卿|cardinal|神官|priest)/i
```

各印につき「楽園の改修ではない世間の願い」を作り、`chooseScale` が `reform` へ攫うかを撃った:

```
印                       誤着/試行   危うさ
楽園                          2/2     ★ 危うい
paradise                    2/2     ★ 危うい
ハーネス                      2/2     ★ 危うい
harness                     2/2     ★ 危うい
憲法                          1/2     ★ 危うい
constitution                2/2     ★ 危うい
engine                      3/3     ★ 危うい
エンジン                      2/2     ★ 危うい
門                           5/5     ★ 危うい
gate                        4/4     ★ 危うい
パイプライン                   2/2     ★ 危うい
pipeline                    2/2     ★ 危うい
自己改善                      2/2     ★ 危うい
self-improve                2/2     ★ 危うい
オーケストレーション             2/2     ★ 危うい
orchestration               2/2     ★ 危うい
枢機卿                        2/2     ★ 危うい
cardinal                    2/2     ★ 危うい
神官                          2/2     ★ 危うい
priest                      2/2     ★ 危うい

合計: 45/46 件が reform へ誤着
危うい印: 楽園, paradise, ハーネス, harness, 憲法, constitution, engine, エンジン, 門, gate, パイプライン, pipeline, 自己改善, self-improve, オーケストレーション, orchestration, 枢機卿, cardinal, 神官, priest
安全な印:
```

> **⚠️ 教主の見立てを実測が覆した。** 課題文は「『神官』『枢機卿』は安全そうだが」と
> 述べたが、**安全な印は一つも無かった**。`forge.js:348` の註
> 「ここに在る抽象名は一語も減らしてはならない … これらは楽園以外を指さないので**無条件**で真でよい」
> は **事実に反する**。20 印すべてに実在の紛れ語がある。

唯一 `ok` になった 1 件は「各国の憲法の前文を比較表がほしい」で、
これは `REFORM_RE` に当たっている(`"憲法"@3`)にもかかわらず **`isCounsel` が先に立つ**ため
救われただけである —— `REFORM_RE` が守ったのではない。

#### 2(a)-2 誤着 45 件の**原因は二種に割れる**

```bash
$ node reform/weak-signs/_probe_para10b.js     # -> _probe_para10b_out.txt
```

| 種 | 意味 | 件数 | 機械的に消せるか |
|----|------|------|-----------------|
| **種M** | 印が**より長い語の一部**として当たっている(語中埋没) | **13** | ○ 語境界 / 紛れ語表で消せる |
| **種H** | 印は**独立した語**だが、意味が世間のもの(同音異義) | **32** | ✗ **消せない** |

種M の全 13 件(生の写し):

```
  [種M] "engine"@14  "build a civil engineering estimate app"        \bengine\b が偽 = 語中に埋没
  [種M] "門"@1  "一門の家系図を作れるアプリが欲しい"                    「一門の」= 複合語の一部 / ⚠ PRODUCT_FALSE_FRIENDS には無い
  [種M] "門"@1  "専門店の在庫を管理するシステムを作って"                「専門店」/ 既存 PRODUCT_FALSE_FRIENDS にも一致 "専門"
  [種M] "門"@1  "部門別の売上を集計するコマンドを実装して"              「部門別」/ 既存 PRODUCT_FALSE_FRIENDS にも一致 "部門"
  [種M] "門"@1  "名門校の受験対策アプリが欲しい"                        「名門校」/ 既存 PRODUCT_FALSE_FRIENDS にも一致 "名門"
  [種M] "門"@1  "入門講座の進捗を記録する機能を実装して"                「入門講」/ 既存 PRODUCT_FALSE_FRIENDS にも一致 "入門"
  [種M] "gate"@12  "implement a gateway timeout retry helper"        \bgate\b が偽 = 語中に埋没
  [種M] "gate"@23  "build an app to investigate delegate voting records"  \bgate\b が偽
  [種M] "gate"@24  "create a script to aggregate the daily sales rows"    \bgate\b が偽
  [種M] "gate"@16  "implement a navigate-back button for the wizard"      \bgate\b が偽
  [種M] "self-improve"@12  "implement a self-improvement streak counter"  \bself-improve\b が偽
  [種M] "self-improve"@8   "build a self-improvement journal app"         \bself-improve\b が偽
  [種M] "priest"@8  "build a priesthood directory app for the diocese"    \bpriest\b が偽
```

**英語の印は `\b` を一つも持っていない。** `gate` は `gateway` / `delegate` / `aggregate` /
`navigate` の 4 語すべてに埋もれ、実測で 4/4 誤着した。`engine ⊂ engineering`、
`priest ⊂ priesthood`、`self-improve ⊂ self-improvement` も同じである。
これは **PARA-10 の「門」と全く同じ形の病が英語側にも在る**という、教主が名指ししていなかった発見である。

種H の代表(消せない側):

```
  [種H] "楽園"@3      "常夏の楽園を巡るリゾート予約アプリが欲しい"      -> reform (正解 full)
  [種H] "paradise"@21 "build a fan wiki for paradise lost"            \bparadise\b が真 = 独立語
  [種H] "ハーネス"@3   "登山用ハーネスの通販サイトを作れ"                -> reform (正解 full)
  [種H] "枢機卿"@5    "カトリック枢機卿の一覧を引けるアプリが欲しい"     -> reform (正解 full)
  [種H] "神官"@3      "神社の神官の当番表を管理するアプリが欲しい"       -> reform (正解 full)
  [種H] "cardinal"@12 "implement a cardinal direction compass widget"  \bcardinal\b が真 = 独立語
  [種H] "エンジン"@2   "検索エンジンの順位を追うアプリが欲しい"           -> reform (正解 full)
  [種H] "pipeline"@18 "implement a sales pipeline stage filter"        \bpipeline\b が真 = 独立語
```

#### 2(a)-3 `REFORM_RE` には**紛れ語の表が一つも無い**

```
  grep -c "REFORM_FALSE_FRIENDS" graph/forge.js = 0
  isReformSubject の本体 = function isReformSubject(d) { return REFORM_RE.test(d); }
```

`PRODUCT_RE` / `PRODUCT_STRONG_RE` は `PRODUCT_FALSE_FRIENDS` に守られ、
`DIAGRAM_RE` は `DIAGRAM_FALSE_FRIENDS` に守られている。
**`REFORM_RE` だけが素手である。** これが PARA-10 の構造的な正体である。

さらに「門」の複合語は、**既存の `PRODUCT_FALSE_FRIENDS` が半分しか知らない**:

```
    一門: PRODUCT_FALSE_FRIENDS=false  REFORM_RE=true     ← 残債 PARA-10 そのもの
    専門: PRODUCT_FALSE_FRIENDS=true   REFORM_RE=true
    部門: PRODUCT_FALSE_FRIENDS=true   REFORM_RE=true
    名門: PRODUCT_FALSE_FRIENDS=true   REFORM_RE=true
    入門: PRODUCT_FALSE_FRIENDS=true   REFORM_RE=true
    門下: PRODUCT_FALSE_FRIENDS=true   REFORM_RE=true
    関門: PRODUCT_FALSE_FRIENDS=true   REFORM_RE=true
    水門: PRODUCT_FALSE_FRIENDS=false  REFORM_RE=true
    城門: PRODUCT_FALSE_FRIENDS=false  REFORM_RE=true
    門松: PRODUCT_FALSE_FRIENDS=false  REFORM_RE=true
    門出: PRODUCT_FALSE_FRIENDS=false  REFORM_RE=true
```

> **第60条の予言が当たっている。** 「一門/水門/城門/門松/門出」を表へ足せば次は
> 「門番/門弟/山門/寺門/門地…」が出る。**表では閉じない。**

---

### 2(b) PARA-11 — `PRODUCT_FALSE_FRIENDS` の文全体無効化は何件を殺すか

```bash
$ node reform/weak-signs/_probe_para11.js      # -> _probe_para11_out.txt
```

```
wantsProduct = function wantsProduct(w) {
  if (PRODUCT_FALSE_FRIENDS.test(w)) return false;      ← ★ 文全体を無効化する一行
  if (PRODUCT_STRONG_RE.test(w)) return true;
  return PRODUCT_RE.test(w) && !PRODUCT_FALSE_FRIENDS.test(w);
}
```

紛れ語 × 強い産物名 を **24 件**作って撃った(最低 20 件の要求を満たす)。
正解の道は既存門の前例に従う(アプリ/サイト/システム → `full`、ツール/コマンド/機能/画面/ボタン → `standard`)。

| # | 願い | 紛れ語 | 強い産物名 | `wantsProduct` | 実際の道 | 正解 | |
|---|------|--------|-----------|---------------|---------|------|---|
| 1 | 人口動態のアプリが欲しい | `人口` | `アプリ` | **false** | full | full | ok |
| 2 | 相談窓口のツールを作る | `相談` | `ツール` | **false** | standard | standard | ok |
| 3 | 入口の混雑を表示する画面を実装して | `入口` | `画面` | **false** | standard | standard | ok |
| 4 | 口コミ投稿のアプリが欲しい | `口コミ` | `アプリ` | **false** | full | full | ok |
| 5 | 口座残高を取り込むコマンドを実装して | `口座` | `コマンド` | **false** | standard | standard | ok |
| 6 | 非常口の点検を記録する機能を実装して | `非常口` | `機能` | **false** | standard | standard | ok |
| 7 | 相場を追うアプリが欲しい | `相場` | `アプリ` | **false** | full | full | ok |
| 8 | 相談予約のボタンを実装して | `相談` | `ボタン` | **false** | standard | standard | ok |
| 9 | 相続の手続きを進めるアプリが欲しい | `相続` | `アプリ` | **false** | full | full | ok |
| 10 | 相互リンクを集めるツールを作る | `相互` | `ツール` | **false** | standard | standard | ok |
| 11 | 真相究明メモの画面を実装して | `真相` | `画面` | **false** | standard | standard | ok |
| 12 | 首相の発言を集めるアプリが欲しい | `首相` | `アプリ` | **false** | full | full | ok |
| 13 | **専門店のサイトが欲しい** | `専門` | — | **false** | **reform** | full | ✗ |
| 14 | **部門別の集計コマンドを実装して** | `部門` | `コマンド` | **false** | **reform** | standard | ✗ |
| 15 | **名門校の受験対策アプリが欲しい** | `名門` | `アプリ` | **false** | **reform** | full | ✗ |
| 16 | **入門講座の進捗を記録する機能を実装して** | `入門` | `機能` | **false** | **reform** | standard | ✗ |
| 17 | **門限を知らせるタイマーを実装して** | `門限` | `タイマー` | **false** | **reform** | standard | ✗ |
| 18 | **登竜門コンテストの投票アプリが欲しい** | `登竜門` | `アプリ` | **false** | **reform** | full | ✗ |
| 19 | 腎機能の数値を記録するアプリが欲しい | `腎機能` | `アプリ` | **false** | full | full | ok |
| 20 | 認知機能テストの画面を実装して | `知機能` | `画面` | **false** | standard | standard | ok |
| 21 | 一段落したタスクを片付けるアプリが欲しい | `一段落` | `アプリ` | **false** | full | full | ok |
| 22 | 画面越しの通話を録画するツールを作る | `画面越` | `ツール` | **false** | standard | standard | ok |
| 23 | タイマー競技の記録アプリが欲しい | `タイマー競技` | `アプリ` | **false** | full | full | ok |
| 24 | 機能性表示食品の一覧を出すコマンドを実装して | `機能性` | `機能` | **false** | standard | standard | ok |

```
  誤着: 6/24 件
```

**これが本走行の最も重要な発見である。**

- **24 件すべてで `wantsProduct` が `false` に潰れている**(強い産物名が文中に在るのに、である)。
  文全体無効化は **24/24 = 100% 発火**している。
- しかし **`chooseScale` の誤着はわずか 6/24**。残る 18 件は、`wantsProduct` が死んでいても
  `chooseScale` の末尾の `fullJa`/`fullEn`/`siteWholeJa` の段が同じ産物語を**もう一度**拾い直して
  正しい道へ着けているにすぎない。
- 誤着した 6 件は**すべて「門」の紛れ語**である —— つまり **PARA-11 単独では道を曲げておらず、
  曲げているのは PARA-10(`REFORM_RE` の「門」)の方**である。

> ⚠️ **`wantsProduct` の壊れ方は「潜在的」である。** 道が曲がって見えるのは
> `isCounsel` / `isCartography` を経由するときだけであり、`chooseScale` の直下では
> 下流の段が偶然に埋め合わせている。**行列の対角だけを見ると病が見えない。**
> これが debt.md §3-2 の「二つの病は噛み合っている」の正確な内訳である。

「削ってから探す」形にしたときの見込み:

```
  ── 参考: 紛れ語を削ってから強い名を探した場合の wantsProduct ──
     現在 false → 削れば true になる願い: 23/24
```

---

### 2(c) 同じ形の病は `DIAGRAM_FALSE_FRIENDS` に**在るが、別の場所に在る**

`isCartography` の当該二行:

```js
if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;   // ← ★ ここが病んでいる
const onlyWeak = !<強い作図語>.test(wish);
if (onlyWeak && DIAGRAM_FALSE_FRIENDS.test(wish)) return false;                        // ← ここは健全
```

**(c)-1 `DIAGRAM_FALSE_FRIENDS` 自身は文全体無効化をしていない。** 打ち消しが
`onlyWeak`(弱い印「図に/図を」だけで当たった場合)に**限定**されているからである。実測:

```
  ok  "意図を汲んで相関図を描いてほしい"     紛れ語="意図"  isCartography=true   -> cartography  (正解 cartography)
  ok  "地図データの構成図を作れ"             紛れ語="地図"  isCartography=true   -> cartography  (正解 cartography)
  ok  "図書館の蔵書の関連図を可視化して"      紛れ語="図書"  isCartography=true   -> cartography  (正解 cartography)
  ok  "構図の良し悪しを系統図にして"          紛れ語="構図"  isCartography=true   -> cartography  (正解 cartography)
  ok  "合図の流れをフロー図にして"            紛れ語="合図"  isCartography=true   -> cartography  (正解 cartography)
  ok  "意図を汲んで実装せよ"                 紛れ語="意図"  isCartography=false  -> standard     (正解 standard)
  ok  "地図の縮尺を切り替える機能を実装して"   紛れ語="地図"  isCartography=false  -> standard     (正解 standard)
  ok  "図書の貸出を記録するツールを作る"       紛れ語="図書"  isCartography=false  -> standard     (正解 standard)

  誤着: 0/8 件
```

**`DIAGRAM_FALSE_FRIENDS` は健全である。** `PRODUCT_FALSE_FRIENDS` との違いは
**打ち消しの適用範囲を「弱い印だけで当たったとき」に絞っている**点だけであり、
これは PARA-11 の正しい修理の形を**リポジトリ内が既に示している**ということである。

**(c)-2 だが `isCartography` は `PRODUCT_FALSE_FRIENDS` を「打ち消しの条件」に使っており、
そこで PARA-11 が発火する。** 紛れ語が在ると「産物を求めている」打ち消しが効かず、図一枚で返る:

```
  ✗   "一門の家系図を作れるアプリが欲しい"        PRODUCT紛れ語=なし     isCartography=false  -> reform       (正解 full)
  ✗   "相関図を描けるアプリを作って"              PRODUCT紛れ語="相関"   isCartography=true   -> cartography  (正解 full)
  ✗   "専門分野の系統図を編集できるアプリが欲しい"  PRODUCT紛れ語="専門"   isCartography=true   -> cartography  (正解 full)
  ✗   "人口分布の構成図を出力するツールを作る"      PRODUCT紛れ語="人口"   isCartography=true   -> cartography  (正解 standard)
  ✗   "窓口の導線を図示するコマンドを実装して"      PRODUCT紛れ語="窓口"   isCartography=true   -> cartography  (正解 standard)
  ✗   "相場の推移を可視化するツールを作る"          PRODUCT紛れ語="相場"   isCartography=true   -> cartography  (正解 standard)

  誤着: 6/6 件
```

**PARA-11 が実際に道を曲げるのは、この `isCartography` の経路である。** 残債 PARA-11
「相関図を描けるアプリを作って」はその一例にすぎず、**同族が少なくとも 6/6 誤着する**。

> 註: `PRODUCT_STRONG_RE` と `DIAGRAM_FALSE_FRIENDS` は `module.exports` に**無い**。
> 計測器は `graph/forge.js` の原文から正規表現リテラルを読み取って評価した(改変はしない)。
> 修理の相では両者の export を足すかどうかも判断が要る。

---

### 2(d) `isCounsel` の経路 — 文全体無効化を直すと counsel は動くか

`isCounsel` は `wantsProduct` を **2 箇所**で呼ぶ(`graph/forge.js:550, 558`)。いずれも
**`!wantsProduct(w)` の否定形**であり、`wantsProduct` が `false` に潰れることに命を預けている:

```js
function isCounsel(wish) {
  const w = denude(wish);
  if (!COUNSEL_RE.test(w)) return false;
  if (!CREATE_RE.test(w) && !wantsProduct(w)) return true;   // 2段目
  if (isDeliberation(w)) return true;
  if (DOC_STRONG_RE.test(w)) return true;
  return DOC_RE.test(w) && !wantsProduct(w);                 // 3段目
}
```

既存門 `tests/counsel.test.js:212-217` が「**紛れ語対策だけが守っている**」と明記した
5 件(`DOC_STRONG_RE` に当たらない形)を含め、12 件を撃った:

```
  ok  "人口動態を調査して報告してほしい"       -> counsel   wantsProduct 現在=false  削ってから探すと=false  変わらない
  ok  "腎機能の低下を診断してほしい"           -> counsel   wantsProduct 現在=false  削ってから探すと=false  変わらない
  ok  "相場を分析して所見をくれ"               -> counsel   wantsProduct 現在=false  削ってから探すと=false  変わらない
  ok  "楽園の構造を調査して報告してほしい"      -> counsel   wantsProduct 現在=false  削ってから探すと=false  変わらない
  ok  "二つの案の比較表がほしい"               -> counsel   wantsProduct 現在=false  削ってから探すと=false  変わらない
  ok  "楽園のエンジンを監査してほしい"          -> counsel   wantsProduct 現在=false  削ってから探すと=false  変わらない
  ok  "窓口の対応品質を調査して報告してほしい"   -> counsel   … 変わらない
  ok  "専門店の客足を分析して所見をくれ"         -> counsel   … 変わらない
  ok  "部門別の残業を集計して報告してほしい"      -> counsel   … 変わらない
  ok  "認知機能の検査結果を診断してほしい"       -> counsel   … 変わらない
  ok  "相談件数の推移を分析してほしい"           -> counsel   … 変わらない
  ok  "入門講座の効果を検討して"                -> counsel   … 変わらない

  wantsProduct の値が変わる願い: 0/12 件
```

**counsel の道は 12/12 で動かない。** 理由は構造的である —— counsel の願いは
**そもそも産物の名を含んでいない**(「調査して報告してほしい」に `アプリ/ツール/画面` は無い)ので、
紛れ語を削っても `PRODUCT_STRONG_RE` に当たる語が現れないからである。

ただし **「紛れ語を削る」と「一字の名を残す」の組み合わせは危うい** —— 例えば
「窓**口**の対応品質を調査して」から `窓口` を削れば「の対応品質を…」となり `口` も消えるが、
削り方を誤って `窓` だけ削れば `口` が `PRODUCT_RE` に当たって counsel を失う。
**削る単位は「紛れ語の一致箇所ごと全体」でなければならない。** 候補の実測は §4 に置く。

---

## 3. 混同行列の基準線 — 172 件コーパス

```bash
$ node reform/weak-signs/_matrix.js            # -> _matrix_out.txt
```

コーパス = 前走行 `_design_matrix.js` の **101 件**(一字一句そのまま)
 + **残債 2 件を戻す**(PARA-10「一門の家系図を作れるアプリが欲しい」= full /
   PARA-11「相関図を描けるアプリを作って」= full)
 + 本走行 2(a) の的 **41 件**(P10)+ 2(b) の的 **24 件**(P11)+ 2(c) の的 **4 件**(P11c)
 = **172 件**

```
コーパス件数: 172  (道ごと: counsel=19, cartography=15, reform=15, quick=15, standard=59, full=49)
  内訳: 前走行 gate/new = 101 / 残債 debt = 2 / 本走行 P10 = 41 / 本走行 P11 = 24 / 本走行 P11c = 4

═══ 6 道 × 6 道 混同行列 ═══

正解\実際               counse      cartog      reform       quick      standa        full     計
────────────────────────────────────────────────────────────────────────────────────────────
counsel                 19           0           0           0           0           0      19
cartography              0          15           0           0           0           0      15
reform                   0           0          15           0           0           0      15
quick                    0           0           0          15           0           0      15
standard                 0           3          24           0          32           0      59
full                     0           2          23           0           0          24      49

対角の合計: 120 / 172  (誤着 52 件)

非ゼロの非対角セル数: 4 / 30   誤着の総数: 52
前走行 101 件コーパスのみ: 対角 101/101  (回帰なし)
ユニークな願い: 172 / 総行数 172
OLD(前走行分) 行数=101  ユニーク=101
```

**非ゼロの非対角セルは 4 つ**、すべて `standard`/`full` の行から出ている:

| セル | 件数 | 何が起きているか |
|------|------|-----------------|
| `standard → reform` | **24** | PARA-10。世間の願いが `REFORM_RE` の印を踏んで改革の道へ攫われる |
| `full → reform` | **23** | 同上 |
| `standard → cartography` | **3** | PARA-11。`isCartography` の産物打ち消しが紛れ語で死ぬ |
| `full → cartography` | **2** | 同上(残債 PARA-11 本体を含む) |

`counsel` / `cartography` / `reform` / `quick` の 4 行は **すべて対角 100%**。
すなわち **病は「世間の願いが楽園の道へ攫われる」一方向にしか出ていない** ——
逆向き(楽園の願いが世間へ落ちる)の誤着は 0 である。これは修理の向きを決める重要な事実である
(第61条の「列だけを見るな」に従い、両向きを撃った結果である)。

前走行 101 件コーパスだけで見れば **対角 101/101** —— 本走行の追加は既存の合格線を一件も壊していない。
コーパスに重複は無い(`ユニークな願い: 172 / 総行数 172`)。

---

## 4. 修理候補 — **実装はしない**。各候補が「どの道を奪うか」を写しで実測した

```bash
$ node reform/weak-signs/_cand.js          # 13 候補 × (172件行列 + 既存門 3 本) -> _cand_out.txt
$ node reform/weak-signs/_cand_stress.js   # 13 候補 × 耐久 48 件(コーパス外)  -> _cand_stress_out.txt
```

実験はすべて **`require.cache` 注入**(`_cand_gate.js`)で行った。曲げた `forge.js` の原文を
`$LOCALAPPDATA/Temp/ws_cand/` に置き、**本物のパスの module** として評価して差し替える形である
(リポジトリを丸写しすると `overlay/` 等の相対参照が壊れ、偽の ✗ が出る —— 前走行 findings §6.2)。
門は**一つずつ逐次**に走らせた(NFR-1)。

### 4.1 候補の一覧

| 札 | 何をするか | 病 |
|----|-----------|-----|
| **B0** | 素の main(対照) | — |
| **R1** | **除去**: 弱い印「門」を `REFORM_RE` から撃ち捨てる | PARA-10 |
| **R2** | **語境界**: 英語の印 10 語に `\b` を課す(日本語は不変) | PARA-10 |
| **R3** | **紛れ語表**: `REFORM_FALSE_FRIENDS` を新設し、当たった箇所を**削ってから**印を探す | PARA-10 |
| **R4** | **文脈化**: 「門」を表から抜き、`GATE_CONTEXT_RE`(楽園/憲法/監査/判定/走行/一段… と共起)でのみ真 | PARA-10 |
| **R5** | R2 ∧ R4 | PARA-10 |
| **P1** | **削ってから探す**(debt.md §4 の提案そのもの) | PARA-11 |
| **P2** | **打ち消しを弱い印に限定**(= `isCartography` の健全な作法を `wantsProduct` に移す) | PARA-11 |
| **P3** | P1 + `isCartography` の打ち消しも同じ形に揃える | PARA-11 |
| **X1** | R4 + P3 | 両方 |
| **X2** | R5 + P3 | 両方 |
| **X3** | R3 + P3(**抽象名の表を一語も消さない**形) | 両方 |
| **X4** | R3 + R2 + P3 | 両方 |

### 4.2 行列と既存門(`_cand_out.txt` の生の写し)

| 札 | 対角/172 | 非対角セル | 前走行101件 | route-matrix | counsel | route-debt |
|----|---------|-----------|------------|-------------|---------|-----------|
| B0 | 120 | 4 | 101/101 | 13/0 ✓ | 210/0 ✓ | 5/0 ✓ |
| **R1** | 126 | **5(悪化)** | **100/101 ✗ 回帰** | **11/2 ✗** | **199/11 ✗** | 3/2 |
| R2 | 128 | 4 | 101/101 | 13/0 ✓ | 210/0 ✓ | 5/0 ✓(残債は未払い) |
| **R3** | **146** | 5 | 101/101 | 13/0 ✓ | **209/1 ✗** | 4/1(PARA-10 を払う) |
| R4 | 127 | 4 | 101/101 | 13/0 ✓ | **204/6 ✗** | 3/2 |
| R5 | 135 | 4 | 101/101 | 13/0 ✓ | **204/6 ✗** | 3/2 |
| P1 | 120 | 4 | 101/101 | 13/0 ✓ | 210/0 ✓ | 5/0 ✓(**残債を一件も払わない**) |
| P2 | 120 | 4 | 101/101 | 13/0 ✓ | 210/0 ✓ | 5/0 ✓(**同上**) |
| P3 | 124 | **2** | 101/101 | 13/0 ✓ | 210/0 ✓ | 4/1(PARA-11 を払う) |
| X1 | 132 | **2** | 101/101 | 13/0 ✓ | **204/6 ✗** | 2/3 |
| X2 | 140 | **2** | 101/101 | 13/0 ✓ | **204/6 ✗** | 2/3 |
| **X3** | **151** | **3** | 101/101 | 13/0 ✓ | **209/1 ✗** | 3/2(両方払う) |
| **X4** | **152** | **3** | 101/101 | 13/0 ✓ | **209/1 ✗** | 3/2(両方払う) |

> ⚠️ `route-debt.test.js` の赤は **正しい赤**である(xfail の門 / debt.md §4)。
> `counsel.test.js` と `route-matrix.test.js` の赤だけが「道を奪った」印である。

### 4.3 **PARA-10 は「除去」か「文脈化」か** — 両方試した

#### R1(除去)は**壊す**。前走行の実測を本走行が再現した

```
前走行 101 件コーパスのみ: 対角 100/101  ✗ 回帰: "門に監査の一段を足す"->standard(正解 reform)

  ── 既存門 tests/route-matrix.test.js ──  exit=1
  ✗ M-2 [対角]: 対角線の合計がコーパスの件数と等しい — 全件が正しい道へ着く
  ✗ M-3 [非対角]: 非対角の**各セル**が 0 — どの道も他の道を奪っていない
  Route matrix self-test: 11 passed, 2 failed

  ── 既存門 tests/counsel.test.js ──  exit=1
  ✗ "門に監査の一段を足す" → reform
  ✗ "ダッシュボードを生きた門にせよ" → reform
  ✗ "門を強化する" → reform
  ✗ 楽園の抽象名を含む改革の願いは reform に留まる (逆向きの証明)
  ✗ 楽園の抽象名を伴えば今まで通り楽園を名指す (R-4 の逆向き)
  ✗ 楽園の抽象名は改変の動詞を伴えば今まで通り楽園を名指す (AC-38 / F-1 の逆向き)
  ✗ 抽象名は今まで通り無条件で楽園を名指す (AC-40 / 修理が広がりすぎていない)
  ✗ REFORM_RE は main の抽象名を過不足なく持つ (表を直に撃つ)
  ✗ 「門」の紛れ語は main と同じ振る舞いである (AC-45 / 本走行は悪化させていない)
  ✗ 楽園の抽象名は世間の器の名を伴っても reform である (Q3-1 の回帰を捕らえる / 37 語)
  ✗ 強い産物名の紛れ語が諐問の道を奪わない (R-2 / 機能・一段・画面)
  Counsel self-test: 199 passed, 11 failed
```

**R1 が奪う道(名指し)**: 「門に監査の一段を足す」「門を強化する」「ダッシュボードを生きた門にせよ」
「門に fingerprint を確かめる口を設ける」「門の判定を{37 語の器}で直す」—— **既存門 13 本が赤くなり、
非対角セルは 4 → 5 に増える**(誤着の総数は減るが**セルは増える**、すなわち第61条の合格線から遠ざかる)。
**除去は誤りである。**

#### R4(文脈化)は「門」を表から抜くので、`REFORM_RE` の表を直に撃つ門が鳴る

```
  ── 既存門 tests/counsel.test.js ──  exit=1
  ✗ "ダッシュボードを生きた門にせよ" → reform
      expected reform but got "standard"
  ✗ 楽園の抽象名を伴えば今まで通り楽園を名指す (R-4 の逆向き)
  ✗ 楽園の抽象名は改変の動詞を伴えば今まで通り楽園を名指す (AC-38 / F-1 の逆向き)
      楽園の抽象名が建造の動詞を伴っているのに reform を名乗らない — 語彙を消したのと同じ:
      門に fingerprint を確かめる口を設ける
  ✗ REFORM_RE は main の抽象名を過不足なく持つ (表を直に撃つ)
      REFORM_RE から抽象名 "門" が落ちた — その願いは黙って創造の道へ行く
  ✗ 「門」の紛れ語は main と同じ振る舞いである (AC-45)
  ✗ 楽園の抽象名は世間の器の名を伴っても reform である (Q3-1 の回帰を捕らえる / 37 語)
  Counsel self-test: 204 passed, 6 failed
```

**R4 が奪う道(名指し)**: 「ダッシュボードを生きた門にせよ」「門に fingerprint を確かめる口を設ける」
「門の閾値を上げよ」(耐久 枝A で ✗)—— 共起の表に載っていない語(`ダッシュボード` / `fingerprint` /
`閾値`)を伴う本物の楽園の願いを落とす。**共起の表もまた表であり、第60条の同じ罠に落ちる。**

耐久の生の写し(R4 / 枝A):
```
  ✗   [A-楽園] "門の閾値を上げよ" -> standard  (正解 reform)
```

#### R3(紛れ語表 + 削ってから探す)は**表を一語も消さない**ので、抽象名の門が全部生き残る

```
  ── 既存門 tests/route-matrix.test.js ──  exit=0
  Route matrix self-test: 13 passed, 0 failed
  ── 既存門 tests/counsel.test.js ──  exit=1
  ✗ 「門」の紛れ語は main と同じ振る舞いである (AC-45 / 本走行は悪化させていない)
      「門」の紛れ語の振る舞いが main から変わった — 良くなったなら門を書き換え、悪くなったなら直せ:
      専門店の棚の傾きを直したい
  Counsel self-test: 209 passed, 1 failed
```

**R3 が奪う道はゼロである。** 唯一赤くなった門 `AC-45` は、その assert メッセージ自身が
**「良くなったなら門を書き換えよ」と明記している** —— 「専門店の棚の傾きを直したい」は
`reform` → `quick` に**改善した**のであって、奪われたのではない。
**これは道を奪わない唯一の PARA-10 候補である**(R1/R2/R4/R5 はいずれも何かを奪うか、残債を払わない)。

> ⚠️ ただし R3 も**表**である。第60条の警告は消えない ——
> 表に無い紛れ語(`武道の流派の門人`/`自動車エンジン`/`northern cardinal`/`熱帯の楽園`)は
> 耐久の枝B で今も `reform` へ攫われる(下記 4.5)。**R3 は「射程を狭める」修理であって「治す」修理ではない。**

### 4.4 **PARA-11 の「削ってから探す」形は、削ることで逆に何を壊すか**

**答え: `chooseScale` の道は何も壊さない。だが単独では残債を一件も払わない。**

```
候補 P1 — PARA-11 削ってから探す (debt.md §4)
対角の合計: 120 / 172  (誤着 52 件)          ← B0 と**同じ**
非ゼロの非対角セル数: 4 / 30   誤着の総数: 52  ← B0 と**同じ**
  ── 既存門 tests/route-matrix.test.js ──  exit=0   Route matrix self-test: 13 passed, 0 failed
  ── 既存門 tests/counsel.test.js ──      exit=0   Counsel self-test: 210 passed, 0 failed
  ── 既存門 tests/route-debt.test.js ──   exit=0   Route debt self-test: 5 passed, 0 failed
```

**P1 は既存門を一本も赤くしない。同時に、混同行列を一マスも動かさない。**
理由は §2(b) で測った通り —— `wantsProduct` が死んでも `chooseScale` の下流の段が拾い直すからである。
`P2`(打ち消しを弱い印に限定)も**数値が完全に同一**であった。

**削ることで壊れるもの(実測で名指し)**:

1. **`isCounsel` の道は壊れない** —— 耐久 枝D で **10/10**(全候補)。§2(d) の予測通り。
2. **産物の判定は「削る」ことでのみ直る** —— 耐久 枝C(`wantsProduct` を直に撃つ):
   `B0/R1〜R5 = 0/10` に対し `P1/P2/P3/X1〜X4 = 10/10`。
   **`REFORM_RE` 側だけを直す候補は、`wantsProduct` を一件も救えない。**
3. **`isCartography` も同じ形に揃えないと図の道が残る** —— 耐久 枝E(紛れ語×作図×産物 8 件):
   `P1/P2 = 0/8`(`wantsProduct` を直しても `isCartography` は別の行で `PRODUCT_FALSE_FRIENDS` を見ているので無傷)
   に対し `P3 = 6/8`、`X1〜X4 = 8/8`。
4. **P3 単独は「門」の紛れ語を `cartography` から `reform` へ移すだけ** ——
   耐久 枝E の残り 2 件:
   ```
   P3 |   ✗   [E-作図] "専門用語の関連図を描けるアプリが欲しい" -> reform  (正解 full)
   P3 |   ✗   [E-作図] "部門の階層図を編集できるアプリが欲しい" -> reform  (正解 full)
   ```
   **これが debt.md §3-2「二つの病は噛み合っている」の実測による再確認である。**
   PARA-11 だけを直すと、誤着先が `cartography` から `reform` に変わるだけで的は直らない。

### 4.5 耐久試験 — 48 件(コーパス外 / 5 枝)

> **前走行の教訓**: 行列を通った候補 4 つのうち **3 つが耐久で落ちた**。行列だけで選ぶな。

```bash
$ node reform/weak-signs/_cand_stress.js   # -> _cand_stress_out.txt
耐久の的: 48 件 (枝A=10 枝B=10 枝C=10 枝D=10 枝E=8)
コーパス(_matrix.js)との重複: 0 件  (= コーパス外であることを確認)
```

| 枝 | 何を問うか | 撃ち方 | 件数 |
|----|-----------|--------|------|
| **A-楽園** | 楽園の願いが `reform` を**失わない**か | `chooseScale` | 10 |
| **B-世間** | 世間の願いが `reform` へ**攫われない**か | `chooseScale` | 10 |
| **C-産物** | 紛れ語を含む産物の願いで `wantsProduct` が**真**か | **述語を直に撃つ** | 10 |
| **D-諐問** | 紛れ語を含む諐問の願いが `counsel` を**失わない**か | `chooseScale` | 10 |
| **E-作図** | 紛れ語×作図×産物で図一枚に落ちないか | `chooseScale` | 8 |

> ⚠️ **枝C は `chooseScale` では撃てない**(本走行の発見)。`wantsProduct=false` のままでも
> `chooseScale` の末尾の段が拾い直すので道は正しく出る —— 最初に書いた枝C は全候補 10/10 の
> **盲目の門**であった。第58条(症状ではなく原因を撃て)に従い、**述語を直に撃つ形へ書き直した**。

```
═══ 耐久まとめ(48 件 / コーパス外) ═══
候補   枝A楽園  枝B世間  枝C産物  枝D諐問  枝E作図   合計
B0        9/10     0/10     0/10    10/10     0/8   19/48
R1        8/10     4/10     0/10    10/10     0/8   22/48
R2        9/10     3/10     0/10    10/10     0/8   22/48
R3        9/10     6/10     0/10    10/10     0/8   25/48
R4        8/10     4/10     0/10    10/10     0/8   22/48
R5        8/10     7/10     0/10    10/10     0/8   25/48
P1        9/10     0/10    10/10    10/10     0/8   29/48
P2        9/10     0/10    10/10    10/10     0/8   29/48
P3        9/10     0/10    10/10    10/10     6/8   35/48
X1        8/10     4/10    10/10    10/10     8/8   40/48
X2        8/10     7/10    10/10    10/10     8/8   43/48
X3        9/10     6/10    10/10    10/10     8/8   43/48
X4        9/10     6/10    10/10    10/10     8/8   43/48
```

**耐久で落ちた候補(名指し)**:

- **R1 / R4 / R5 / X1 / X2 は枝A で 8/10** —— 楽園の願いを 2 件失う。実測:
  ```
  ✗   [A-楽園] "門の閾値を上げよ" -> standard  (正解 reform)
  ✗   [A-楽園] "wire the orchestration pipeline to the audit ledger" -> counsel  (正解 reform)
  ```
  (後者は全候補で ✗。`audit` が `COUNSEL_EN` に当たり counsel が reform より先に立つ —— **既知の設計であり、
  本走行の病ではない**。R1/R4/R5/X1/X2 だけが持つ固有の損失は「門の閾値を上げよ」の 1 件である。)
- **P1 / P2 は枝E で 0/8** —— `wantsProduct` を直しても `isCartography` は無傷。
- **P3 は枝B で 0/10** —— PARA-10 を触らないので世間の願いは今も全件攫われる。
- **X3 / X4 が最良(43/48)**。X2 も 43/48 だが、X2 は `counsel.test.js` を **6 本**赤くする
  (X3/X4 は 1 本、しかもその 1 本は改善を報せる門)。**行列と耐久が同点なら、既存門の赤が少ない方を採れ。**

**X4 に残る欠落(名指し / 耐久の生の写し)**:
```
  ✗   [A-楽園] "wire the orchestration pipeline to the audit ledger" -> counsel  (正解 reform)   ← 既知の設計
  ✗   [B-世間] "武道の流派の門人名簿アプリが欲しい" -> reform          ← 表に「門人」が無い
  ✗   [B-世間] "自動車エンジンの整備記録アプリが欲しい" -> reform       ← 表に「自動車エンジン」が無い
  ✗   [B-世間] "build a birdwatching app for the northern cardinal" -> reform   ← 種H(独立語)
  ✗   [B-世間] "熱帯の楽園を紹介する旅行サイトを作れ" -> reform         ← 種H(独立語)
```
**種H は表では塞げない。** これが第60条の「弱い印は表を足しても強くならない」の、本走行による実証である。

### 4.6 候補の裁定(**提案であって実装ではない**)

| 候補 | 裁定 | 根拠(実測) |
|------|------|-----------|
| R1(除去) | **却下** | 既存門 13 本を赤くし、非対角セルを 4→5 に増やす。前走行の実測を再現 |
| R2(語境界) | **単独では不可** | 道を奪わないが残債を一件も払わない(route-debt 5/0 のまま)。**X4 の部品としては有効** |
| R4 / R5(文脈化) | **却下** | 「門」を表から抜くため `counsel.test.js` 6 本が赤。耐久 枝A で「門の閾値を上げよ」を失う |
| R3(紛れ語表+削る) | **採用候補** | 道を奪わない唯一の PARA-10 候補。行列 146/172。ただし**表の限界は残る** |
| P1 / P2 | **単独では不可** | 行列を一マスも動かさない(B0 と同一)。残債を払わない |
| P3 | **採用候補(部品)** | PARA-11 を払い、非対角セルを 4→2 に減らす。単独では枝B 0/10 |
| X1 / X2 | **却下** | R4/R5 を含むため `counsel.test.js` 6 本が赤 |
| **X3 / X4** | **最有力** | 行列 151〜152/172、非対角 3 セル、耐久 43/48、既存門の赤は AC-45 の 1 本(=改善の報せ)と route-debt(=正しい赤)のみ |

**後続の相への申し送り(実装の相が必ず確かめるべきこと)**:

1. **X4 でも非対角セルは 3 つ残る**(`standard→reform` 12 / `full→reform` 7 / `full→standard` 1)。
   第61条の合格線「非対角の各セルが 0」には**届かない**。
   → 合格線をどう引くかは design 相の裁定事項である。**閾値を緩めて緑を名乗るな(第21条)。**
   本走行のコーパスは**意図的に病の的を大量に含む**ので、
   受け入れコーパスと「病の射程を測る的」を**別の帳**に分けるのが筋である。
2. **`full→standard` の 1 件**は X3/X4 で**新たに生まれた**誤着である(B0 には無い)。
   実装の相は必ずこの 1 件を名指しで潰すか、承知の代価として帳に載せること。
3. `tests/counsel.test.js` の **AC-45**(`「門」の紛れ語は main と同じ振る舞いである`)は
   その assert メッセージ自身が「良くなったなら門を書き換えよ」と命じている。
   R3 系を採るなら**この門を書き換える**のが正しい払い方であり、`|| true` で黙らせてはならない。
4. `tests/counsel.test.js:652` の **「REFORM_RE は main の抽象名を過不足なく持つ」** は
   20 語を直に撃つ門である。**表から一語でも抜く修理(R1/R4/R5)はここで必ず鳴る。**
   R3 系が通るのは**表に一語も触らない**からである。
5. `PRODUCT_STRONG_RE` と `DIAGRAM_FALSE_FRIENDS` は `module.exports` に無い。
   門から撃ちたいなら export を足す必要がある(本走行の計測器は原文から読み取って迂回した)。

---

## 5. 結論(すべて実測に裏付けられた断定)

1. **`REFORM_RE` の 20 印すべてに実在の紛れ語がある**(45/46 誤着)。
   `forge.js:348` の「これらは楽園以外を指さないので無条件で真でよい」は**事実に反する**。
   安全な印は**一つも無い**。
2. **誤着の原因は二種に割れる** —— 種M(語中埋没)13 件 / 種H(同音異義)32 件。
   **種H は表でも語境界でも文脈でも塞げない。** 弱い印の限界がここにある。
3. **英語の印は `\b` を一つも持たない。** `gate` は `gateway`/`delegate`/`aggregate`/`navigate` に
   4/4 埋もれる。**PARA-10 と同じ形の病が英語側にも在る**(課題文が名指ししていなかった発見)。
4. **`REFORM_RE` だけが紛れ語の表を持たない。** `PRODUCT_RE` は `PRODUCT_FALSE_FRIENDS` に、
   `DIAGRAM_RE` は `DIAGRAM_FALSE_FRIENDS` に守られている。これが PARA-10 の構造的な正体。
5. **PARA-11 の文全体無効化は 24/24 で発火するが、`chooseScale` の道を曲げるのは 6/24 だけ。**
   下流の段が偶然に埋め合わせているからであり、**行列の対角だけを見ると病が見えない**。
6. **PARA-11 が実際に道を曲げる経路は `isCartography`** である(6/6 誤着)。
   `wantsProduct` の修理だけでは図の道は直らない —— 枝E で P1/P2 = 0/8。
7. **`DIAGRAM_FALSE_FRIENDS` 自身は健全**(8/8)。打ち消しを「弱い印だけで当たったとき」に
   絞っているからである。**PARA-11 の正しい修理の形をリポジトリ内が既に示している。**
8. **`isCounsel` の道は動かない**(12/12 / 耐久 枝D 10/10 × 全候補)。counsel の願いは
   そもそも産物の名を含まないので、紛れ語を削っても `PRODUCT_STRONG_RE` に当たる語が現れない。
9. **除去(R1)は誤り** —— 既存門 13 本を赤くし、非対角セルを増やす。
   **文脈化(R4)も誤り** —— 表から語を抜くので `REFORM_RE` を直に撃つ門が鳴り、
   共起の表に無い楽園の願いを落とす。**正解は「表を一語も消さず、紛れ語を削ってから探す」形(R3+P3)。**
10. **二つの病は噛み合っている**(debt.md §3-2 の再確認)。片方だけでは:
    - PARA-11 単独(P3)→ 誤着先が `cartography` から `reform` に変わるだけ(枝E 6/8、枝B 0/10)
    - PARA-10 単独(R3)→ `wantsProduct` は死んだまま(枝C 0/10、枝E 0/8)
11. **X4(R3+R2+P3)が最有力**: 行列 152/172・非対角 3 セル・耐久 43/48・
    既存門の赤は AC-45 の 1 本(改善の報せ)と route-debt の 2 本(正しい赤)のみ。
    **だが第61条の合格線(非対角の各セルが 0)には届かない。** 実装の相はここから始めよ。

---

## 6. 本走行が守ったこと(第21条 / 禁止事項)

- **`graph/` と `tests/` を一行も書き換えていない。**(`git status --short graph tests` が空であることを確認)
- commit / push をしていない。枝 `reform/weak-signs` に留まっている。
- すべての実験は `require.cache` 注入(`_cand_gate.js`)と `$LOCALAPPDATA/Temp/ws_cand/` の写しで行った。
- 門は**一つずつ逐次**に走らせた(NFR-1)。`|| true` も閾値の緩めも一度も使っていない。
- **本相は実装しない。** 候補は提案であり、`graph/forge.js` は基準線のままである。
