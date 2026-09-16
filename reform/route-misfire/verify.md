# verify — reform 走行『route-misfire』

道: `reform` / 相: `verify`(quality 領域の**最後の門**)
前相: [`security-report.md`](./security-report.md) / [`review.md`](./review.md) / [`requirements.md`](./requirements.md)

> **この相の務め**: 新しい機能を足すことではない。
> **「直したと名乗ったものが本当に直っているか」を AC 一件ずつ実機で撃って裁く**ことである。
> 本書に載る全ての数と出力は、この相で**自分の手で撃った生出力**である。
> 撃てなかったものは「撃てなかった」と名乗る(第37条)。

---

## 0. 裁きの要約

### 0.1 AC の四区分(全 35 件)

| 格付け | 件数 | 意味 |
|---|---|---|
| **達成** | **28** | 撃って期待どおりだった |
| **未達** | **0** | 撃って期待と違った |
| **検められない** | **0** | この環境では原理的に撃てない |
| **門が無い** | **7** | AC は満たされているが、**守る門が存在せず回帰を捕まえられない** |
| 合計 | **35** | |

> ⚠️ **「門が無い」7 件がこの相の産物である。**
> どれも**今この瞬間は緑**である。だが「これを壊したらどの門が鳴くか」を名指せない ——
> すなわち**明日 engine を触った者が、壊したことに気づけない**。
> 一覧は §2 に、名指しの根拠は §1 の各行に在る。

### 0.2 新たに発見した危険

| # | 重篤 | 名 | 状態 |
|---|---|---|---|
| **V-1** | **MED** | 壊れた形の走行帳一つで `workspace.js check` が**走り切らずに死ぬ** | **この相で修理・門 B-16 を据えた** |
| V-2 | LOW | `GIT_DIR` 細工で `isCreationsVault` の判定を両向きに曲げられる | **許容**(脅威模型の外)— §4 で名乗る |
| V-3 | INFO | TOCTOU は成立するが、同じ権限で倉を直接消す方が早い | **許容** — §4 で名乗る |

---

## 1. 仕事1 — AC を一件ずつ撃つ(全 35 件)

前提: `cd C:/Users/kikus/Documents/workspace/paradise` / ブランチ `reform/route-misfire`。

### 1.1 欠陥A — 誤着を直す(AC-01〜05)

一件ずつ `chooseScale` を撃った生出力:

```
AC-01  wish=楽園の自己診断に絞り込みの口を設ける  want=reform  got=reform  EXIT=0
AC-02  wish=門に監査の一段を足す                  want=reform  got=reform  EXIT=0
AC-03  wish=CI に ledger --audit を追加する       want=reform  got=reform  EXIT=0
AC-05  wish=gauge に fingerprint を確かめる口を設ける want=reform got=reform EXIT=0
=== AC-04 / AC-06 (NOT counsel) ===
full
EXIT=0
```

| AC | 格付け | これを壊したらどの門が鳴くか |
|---|---|---|
| AC-01 | **達成** | `tests/counsel.test.js` の判定表 51 行目付近(`['楽園の自己診断に絞り込みの口を設ける', ['reform']]`)。CI が呼ぶ。 |
| AC-02 | **達成** | 同 判定表 `['門に監査の一段を足す', ['reform']]` |
| AC-03 | **達成** | 同 判定表 `['CI に ledger --audit を追加する', ['reform']]` |
| AC-04 | **達成** | `counsel.test.js` の `✓ "健康診断アプリが欲しい" は counsel でない (AC-04 / 教主裁定1)` |
| AC-05 | **達成** | 同 判定表 `['gauge に fingerprint を確かめる口を設ける', ['reform']]` |

### 1.2 欠陥A — 回帰を防ぐ(AC-06〜09)

```
AC-07  wish=楽園の位階の相関図を作れ      want=cartography  got=cartography  EXIT=0
AC-08  wish=楽園のエンジンを監査してほしい  want=counsel      got=counsel      EXIT=0
AC-09  wish=台帳の毒を直す               want=quick        got=quick        EXIT=0
```

| AC | 格付け | 門 |
|---|---|---|
| AC-06 | **達成** | AC-04 と同一命令。同じ門が守る。 |
| AC-07 | **達成** | 判定表 `['楽園の位階の相関図を作れ', ['cartography']]` |
| AC-08 | **達成** | 判定表 51 行目 `['楽園のエンジンを監査してほしい', ['counsel']]` + 881 行目の「壊れ engine」門 |
| AC-09 | **達成** | 判定表 `['台帳の毒を直す', ['quick']]`(L-4 の禁則を守る唯一の門) |

### 1.3 既存の門を一つも壊していない(AC-10〜17)

```
=== AC-10 ===
NG=0 / 37
EXIT=0
=== AC-11 ===
a=false b=true
EXIT=0
=== AC-12 ===
string
EXIT=0
=== AC-13 ===
true
EXIT=0
=== AC-17 ===
true
EXIT=0
```

```
=== AC-14 counsel.test.js ===
  ✓ 創造の道の指揮系統は壊れていない
  ✓ 指揮系統を跨いだ発令はしない — 表が他家の神官を指しても自家に落ちる

Counsel self-test: 134 passed, 0 failed
EXIT=0
=== AC-15 abandoned-run.test.js ===
  ✓ C-9: 鼓動の CLI が実在し、錬が throw したら走行帳を書き換えない
abandoned-run: 33 passed, 0 failed
EXIT=0
```

**AC-16(全走 / 6 分)** — background で撃った実数:

```
Paradise self-test: 471 passed, 0 failed
EXIT=0
```

| AC | 格付け | 門 |
|---|---|---|
| AC-10 | **達成** | `counsel.test.js` の判定表そのもの(37 行)。CI が呼ぶ。 |
| AC-11 | **達成** | `counsel.test.js:239` `✓ isCounsel の直接の断定が保存されている (AC-11)` |
| AC-12 | **達成** | `counsel.test.js:245` `✓ chooseScale の返り値は文字列である (FR-05 / AC-12 / L-1)` |
| AC-13 | **達成** | `counsel.test.js:250` `✓ COUNSEL_JA / COUNSEL_EN の定数名が forge.js に残っている` |
| AC-14 | **達成** | `counsel.test.js` 自身(CI が `node tests/counsel.test.js` を呼ぶ) |
| AC-15 | **達成** | `abandoned-run.test.js` 自身(CI が呼ぶ) |
| AC-16 | **達成** | `paradise.test.js` 自身(CI が呼ぶ) |
| AC-17 | **達成** | `counsel.test.js:256` `✓ admit の裁定は chooseScale と一致する` |

### 1.4 欠陥B — 偽の赤を止め、かつ黙らない(AC-18〜26)

```
=== AC-18 ===
· 走行帳の流出は検めなかった — C:\Users\kikus\AppData\Local\Temp\ac18-550 は創造物の倉ではない
  (目印 .paradise-creations も git remote paradise-creations も無い / source=env)
✓ 楽園に創造物の混入なし・住所の直書きなし (走行帳の流出は上記のとおり未検査)
EXIT=0
=== AC-19 ===
· 走行帳の流出は検めなかった — C:\Users\kikus\AppData\Local\Temp\ac19-550 は創造物の倉ではない
  (目印 .paradise-creations も git remote paradise-creations も無い / source=env)
✓ 楽園に創造物の混入なし・住所の直書きなし (走行帳の流出は上記のとおり未検査)
AC19-PASS
=== AC-20 ===
✓ 楽園に創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし (検めた倉: C:\Users\kikus\Documents\workspace\paradise-creations)
EXIT=0
```

```
=== AC-21 ===
["by-scale"]
EXIT=0
=== AC-22 ===
real=true fake=false
EXIT=0
=== AC-23 ===
decoy=false
EXIT=0
=== AC-24 ===
marked=true
EXIT=0
=== AC-25 ===
{"root":"C:\\Users\\kikus\\AppData\\Local\\Temp","source":"env","legacy":false,"exists":true,"vault":false}
missing=[]
EXIT=0
=== AC-26 ===
threw=false v=true
EXIT=0
```

| AC | 格付け | 門 |
|---|---|---|
| AC-18 | **達成** | `abandoned-run.test.js:396` `B-8 [故障注入]: 仮倉を指した check は緑だが、**黙らない**` |
| AC-19 | **達成** | 同 `B-8`(skip 文言と場所の名指しを断定する) |
| AC-20 | **達成** | 同 `B-8` の逆向き + `B-15`(検めた倉の道を印字する) |
| AC-21 | **達成** | `abandoned-run.test.js` の `B-1 [故障注入]` |
| AC-22 | **達成** | `B-12b [HIGH-1・実物]`(本物の倉が在る機械でのみ撃つ)。**本機では撃てた** —— `real=true`。 |
| AC-23 | **達成** | `B-5: isCreationsVault は場所そのものを見る — 名でも指され方でも裁かない (FR-08)` |
| AC-24 | **達成** | `B-5` / `B-11`(目印を置く口) |
| AC-25 | **達成** | `paradise.test.js:3085` の `resolve()` 断定 |
| AC-26 | **達成** | `B-14 [MED-1]`(投げないことを断定) |

**AC-22 の註**: requirements は「本物の倉が無い機械では skip を声に出せ」と命じている。
**本機には本物の倉が在り、撃てた**。CI(checkout)では `B-12b` が skip され、
代わりに **替え玉の倉を自分で組む `B-12`** が同じ病を撃つ(security 相の修理)。

### 1.5 engine の健全性(AC-27〜30)

```
=== AC-27 wiring check ===
═══ 🔗 WIRING GATE (第44条 / 第48条) ═══
  engine 39 / 内の辺 73
  · 門の除外 1 件: tests/_pulse-fixture.js — 門ではなく、pulse の門が読む作り物の的である(先頭の _ が支援ファイルを表す)
  ✓ 門 19 本すべてに走らせる者が居る (第44条)
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
EXIT=0
=== AC-28 ===
[]
EXIT=0
=== AC-30 ===
reform
EXIT=0
```

**AC-29(census / background)**:

```
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
CENSUS_EXIT=0
```

| AC | 格付け | 門 |
|---|---|---|
| AC-27 | **達成** | CI が `node graph/wiring.js check` を呼ぶ(実測で確認) |
| AC-28 | **達成** | `paradise.test.js:3143` `hardcodedRefs` の断定群 + `abandoned-run.test.js:309` |
| AC-29 | **達成** | CI が `node graph/census.js check` を呼ぶ(実測で確認) |
| AC-30 | **門が無い** | ⚠️ **`forge.js` の CLI(`scale` 口)を子プロセスとして撃つ門が一本も無い。** §2 参照 |

### 1.6 欠陥C — 逆向きの誤着(AC-31〜35)

**AC-31** — 24 件が reform へ攫われないことを門が名指しで断定する。生出力(抜粋):

```
  ✓ "build a workflow automation app for my team" は reform でない — 弱い名 workflow に道を奪われない (AC-31)
  ✓ "an identity verification service for startups" は reform でない — 弱い名 identity に道を奪われない (AC-31)
  ✓ "a vendor management dashboard" は reform でない — 弱い名 vendor に道を奪われない (AC-31)
  ✓ "build a contract review tool" は reform でない — 弱い名 contract に道を奪われない (AC-31)
  ✓ "make a census data explorer" は reform でない — 弱い名 census に道を奪われない (AC-31)
  ✓ "a pulse oximeter tracking app" は reform でない — 弱い名 pulse に道を奪われない (AC-31)
  ✓ "deploy a static site for my blog" は reform でない — 弱い名 deploy に道を奪われない (AC-31)
  ✓ "atlas という名の地図アプリを作れ" は reform でない — 弱い名 atlas に道を奪われない (AC-31)
  ✓ "CIに合格するためのアプリが欲しい" は reform でない — 弱い名 ci に道を奪われない (AC-31)
  ✓ "顧客のワークフローを管理するアプリが欲しい" は reform でない — 弱い名 ワークフロー に道を奪われない (AC-31)
  … (計 24 件。実測で数えた)
```

**AC-32 / AC-33 / AC-34** の生出力:

```
  ✓ 弱い名も建造の動詞を伴えば reform に留まる (AC-31 の逆向き)
  ✓ 冠詞の直後の弱い名は楽園を名指さない (AC-31)
  ✓ 冠詞の直後の弱い名は、建造の動詞を伴っても reform でない (AC-31 / 冠詞の除外の単独証明)
  ✓ 強い名は限定詞を伴わなければ今まで通り楽園を名指す (R-4 の逆向き)
  ✓ 冠詞以外の限定詞も弱い名の楽園名指しを打ち消す (R-3)
  ✓ ENGINE_NAMES が graph/*.js の名を網羅している — 強い名か弱い名のどちらかに (第22条 / 設計 §1.5)
```

**AC-35 — 故障注入(三つの変異)。自分で複製に変異を当てて撃った実数:**

| 変異 | 結果 | 赤くなった門の数 |
|---|---|---|
| (a) 弱い名を強い名の表に戻す | **赤くなる** `RAW EXIT=1` | `Counsel self-test: 129 passed, 5 failed` |
| (b) 限定詞の除外(後読み)を消す | **赤くなる** `RAW EXIT=1` | `Counsel self-test: 121 passed, 13 failed` |
| (c) `isReformSubject` から `BUILD_RE` の伴需を消す | **赤くなる** `RAW EXIT=1` | `Counsel self-test: 127 passed, 7 failed` |

```
変異(a): RAW EXIT=1  Counsel self-test: 129 passed, 5 failed  (✗ 5 本)
変異(b): RAW EXIT=1  Counsel self-test: 121 passed, 13 failed  (✗ 13 本)
変異(c): RAW EXIT=1  Counsel self-test: 127 passed, 7 failed  (✗ 7 本)
```

> ⚠️ **最初の試みで (b) と (c) は「緑」と出た。** それは門が黙ったのではなく、
> **変異を当てる python が途中で落ちて複製が素のままだった**からである。
> 気づかずに書けば「門が鳴らない」という**嘘の赤**を報告していた。
> 変異が確かに当たったことを diff で確かめてから撃ち直した。

| AC | 格付け | 門 |
|---|---|---|
| AC-31 | **達成** | `counsel.test.js` の 24 件の名指し断定(CI が呼ぶ) |
| AC-32 | **達成** | `✓ 弱い名も建造の動詞を伴えば reform に留まる` |
| AC-33 | **達成** | `✓ 冠詞の直後の弱い名は、建造の動詞を伴っても reform でない` |
| AC-34 | **達成** | `✓ ENGINE_NAMES が graph/*.js の名を網羅している` |
| AC-35 | **達成** | 変異試験そのもの。ただし**変異試験を自動で回す門は無い**(手で撃った) |

---

## 2. 「門が無い」と裁いた AC の一覧 —— **この相の主たる産物**

各 AC について「これを壊したらどの門が鳴くか」を名指せるか調べた。
**名指せない 7 件**を以下に挙げる。どれも**今は緑**である。

| AC | 主張 | なぜ門が無いのか | 壊れたとき誰が気づくか |
|---|---|---|---|
| **AC-16** | 全走が緑 | 門はある(`paradise.test.js`)。だが**「6 分を払って全走せよ」を強いる門が無い** —— 絞り込み(`--gate`)だけ撃って緑と称しても誰も咎めない | **誰も**。人の規律だけが守っている |
| **AC-19** | 緑が黙らない | `B-8` が skip 文言を撃つ。だが**文言の一致は `grep -q "創造物の倉ではない"` 相当の緩さ**で、「場所を名指しする」側は**この走行の仮倉の名でしか撃っていない** | 文言を変えれば `B-8` は鳴る。だが**名指しをやめても** `B-15` の別経路で拾うのみ |
| **AC-22** | 本物の倉に真 | `B-12b` が撃つが **CI では永久に skip** される(兄弟倉が無い)。替え玉の `B-12` は**子/根の取り違え**を撃つのであって「本物の倉が true」は撃たない | **CI では誰も**。本物の倉を持つ機械でのみ鳴る |
| **AC-26** | git 無しで投げない | `B-14` は**細工した値**で投げないことを撃つ。だが **PATH から git を消した状態**は一度も再現していない —— `B-14` の 12 件はどれも `isDir()` で先に落ちる | **誰も**。`execFileSync` の `ENOENT` 経路は門に守られていない |
| **AC-29** | README の数が正しい | CI が `census.js check` を呼ぶので門はある。だが**この AC が壊れる形**(数を手で書く)は `census.js` 自身が測り直すので、**門が測る対象と AC の主張がずれている** | CI が鳴る。ただし**遅れて**(3 分以上) |
| **AC-30** | CLI が同じ答えを返す | ⚠️ **`forge.js` を子プロセスとして `scale` 口で撃つ門が一本も無い。** 実測: `grep -rn "forge.js" tests/*.test.js` の全ての当たりは `require()` であり、CLI を起動するのは `paradise.test.js:8551` の `plan --scale full` 一箇所だけ | **誰も**。`module.exports` と CLI の環が割れても緑のまま |
| **AC-35** | 故障注入で鳴る | 変異試験は**この相と rework 相が手で撃った**。**変異を自動で当てる門は存在しない** | **誰も**。門が黙るようになっても、次に人が手で撃つまで判らない |

> **AC-30 が最も重い。** requirements FR-05 は「返り値の型を変えるな」と命じ、
> AC-12 は `typeof === 'string'` を撃つ。だが**それは `require()` 経由の話**である。
> `forge.js` の CLI が `console.log(chooseScale(w))` をやめて JSON を吐くようになっても、
> **どの門も鳴らない**。「環と器が割れていない」という AC-30 の主張そのものが無防備である。

---

## 3. 仕事2 — 「見ていない」と名乗られた 8 件を潰す

`security-report.md §6` の U-1〜U-8 を、撃てるものは撃った。

### 3.1 U-1 — `denude` 以外の正規表現の ReDoS → **撃った。全て線形。危険なし**

`PRODUCT_RE` / `REFORM_WEAK_RE` / `REFORM_RE` / `COUNSEL_RE` / `DOC_RE` / `DIAGRAM_RE` /
`BUILD_RE` / `CREATE_RE` の **8 本**に、**6 種の悪意ある標本**(ASCII 連続 / 限定詞の連打 /
弱い名の惜しい失敗 `vendorx` / 後読み直前の空白 / 日本語 / `my workflowx` 混合)を
**10KB・100KB・200KB** で投げた。N=200000 の生出力(全 48 通り):

```
RE              KIND    N       ms      match
PRODUCT_RE      ascii   200000  0.20    false
PRODUCT_RE      det     200000  0.22    false
PRODUCT_RE      near    200000  0.16    false
PRODUCT_RE      space   200000  0.12    false
PRODUCT_RE      ja      200000  0.32    false
PRODUCT_RE      mix     200000  0.17    false
REFORM_WEAK_RE  ascii   200000  0.40    false
REFORM_WEAK_RE  det     200000  0.48    false
REFORM_WEAK_RE  near    200000  0.50    false
REFORM_WEAK_RE  space   200000  0.06    false
REFORM_WEAK_RE  ja      200000  0.28    false
REFORM_WEAK_RE  mix     200000  0.21    false
REFORM_RE       ascii   200000  0.60    false
REFORM_RE       det     200000  0.12    false
REFORM_RE       near    200000  0.63    false
REFORM_RE       space   200000  0.13    false
REFORM_RE       ja      200000  0.42    false
REFORM_RE       mix     200000  0.51    false
COUNSEL_RE      ascii   200000  0.06    false
COUNSEL_RE      det     200000  0.26    false
COUNSEL_RE      near    200000  0.49    false
COUNSEL_RE      space   200000  0.06    false
COUNSEL_RE      ja      200000  0.39    false
COUNSEL_RE      mix     200000  0.24    false
DOC_RE          ascii   200000  0.17    false
DOC_RE          det     200000  0.23    false
DOC_RE          near    200000  0.31    false
DOC_RE          space   200000  0.11    false
DOC_RE          ja      200000  0.44    false
DOC_RE          mix     200000  0.13    false
DIAGRAM_RE      ascii   200000  0.18    false
DIAGRAM_RE      det     200000  0.11    false
DIAGRAM_RE      near    200000  0.24    false
DIAGRAM_RE      space   200000  0.13    false
DIAGRAM_RE      ja      200000  0.29    false
DIAGRAM_RE      mix     200000  0.25    false
BUILD_RE        ascii   200000  0.16    false
BUILD_RE        det     200000  0.11    false
BUILD_RE        near    200000  0.16    false
BUILD_RE        space   200000  0.13    false
BUILD_RE        ja      200000  0.36    false
BUILD_RE        mix     200000  0.15    false
CREATE_RE       ascii   200000  0.26    false
CREATE_RE       det     200000  0.25    false
CREATE_RE       near    200000  0.19    false
CREATE_RE       space   200000  0.13    false
CREATE_RE       ja      200000  0.36    false
CREATE_RE       mix     200000  0.22    false
--- done ---
```

**倍化して線形を確かめた**(S-1 のときは ×4.0 で二乗と判った):

```
=== 倍化で線形か(mix 標本 / 全 RE の最悪値) ===
N=25000         worst=0.126ms (REFORM_RE)
N=50000         worst=0.074ms (REFORM_RE)
N=100000        worst=0.141ms (REFORM_RE)
N=200000        worst=0.299ms (REFORM_RE)
N=400000        worst=0.568ms (REFORM_RE)
```

倍化ごとの伸びは **×0.6 / ×1.9 / ×2.1 / ×1.9** —— **線形**である。

**判定経路の実体も撃った**:

```
=== chooseScale 実体(denude 込み)===
N=10000         1.50ms  -> reform
N=100000        2.22ms  -> reform
N=200000        3.00ms  -> reform
=== 部品ごと (N=200000) ===
denude          1.44ms
wantsProduct    0.31ms
isCounsel       1.82ms
isCartography   0.04ms
isReformSubject 0.41ms
```

> **`REFORM_WEAK_RE` が特に怀しい**という疑いは**外れた**。
> 後読み `(?<!\b(?:a|an|the|…)\s)` は**固定長の選択肢しか持たない**ので、
> V8 は各位置で有界な回数しか戻らない。0.06〜0.50ms、**denude の R3 のような二乗は無い**。
> **U-1 は閉じてよい。**

### 3.2 U-3 — `strayRuns()` の走査そのもの → **撃った。危険 V-1 を発見し、修理した**

#### (a) 巨大 JSON / 深い入れ子 / 壊れた JSON

```
巨大 JSON の実寸: 7.71 MB
(1) 10MB の走行帳                           41.0ms  件数=1 slugs=["reform-huge"]
(2) 深さ 50000 の入れ子                       22.1ms  THREW RangeError: Maximum call stack size exceeded
(3) 壊れた JSON                            32.8ms  件数=1
(4) 空ファイル                               37.9ms  件数=1
(5) 二進のごみ                               33.8ms  件数=1
(6) JSON の null                         35.8ms  THREW TypeError: Cannot read properties of null (reading 'domains')
(7) 配列(object でない)                      32.3ms  THREW TypeError
(8) __proto__ 汚染の試み                     38.0ms  THREW TypeError
   プロトタイプ汚染したか: undefined
```

7.71MB の走行帳は **41ms** で捌けた —— **大きさは危険ではない**。
プロトタイプ汚染も**成立しない**(`JSON.parse` は `__proto__` を素の鍵として扱う)。
深さ 50000 の `RangeError` は `JSON.parse` 内で起き、**`catch { continue; }` が正しく握り潰す**
(単独で撃ち直すと `OK 件数=1`)。

#### (b) ★ **新発見 V-1** — 一件ずつ隔離して撃つと 4 つの形が落ちた

```
深さ50000の入れ子          OK 件数=1
壊れたJSON              OK 件数=0
空ファイル                OK 件数=0
二進のごみ                OK 件数=0
JSONのnull            ★THREW TypeError: Cannot read properties of null (reading 'domains')
配列                   OK 件数=1
数値                   OK 件数=1
文字列                  OK 件数=1
true                 OK 件数=1
domainsがnull         OK 件数=1
domainsが文字列          ★THREW TypeError: ds.filter is not a function
phasesがnull          OK 件数=1
domains要素がnull       ★THREW TypeError: Cannot read properties of null (reading 'phases')
phases要素がnull        ★THREW TypeError: Cannot read properties of null (reading 'artifactPath')
__proto__汚染          OK 件数=1
```

**害は「壊れた走行帳を見逃す」ではない。CLI 層で `check` が走り切らずに死ぬ:**

```
════ U-3 新発見: 壊れた走行帳で check が死ぬか(CLI 層) ════
--- 走行帳= null
C:\Users\kikus\Documents\workspace\paradise\graph\workspace.js:297
    for (const d of (run.domains || [])) for (const p of (d.phases || [])) if (p.artifactPath) arts.push(String(p.artifactPath));
                         ^
EXIT=1
--- 走行帳= {"meta":{"scale":"reform"},"domains":"x"}
C:\Users\kikus\Documents\workspace\paradise\graph\workspace.js:306
      ratified: ds.length ? ds.filter(d => d.status === 'ratified').length : null,
                               ^
EXIT=1
--- 走行帳= {"meta":{"scale":"reform"},"domains":[null]}
C:\Users\kikus\Documents\workspace\paradise\graph\workspace.js:297
EXIT=1
--- 走行帳= {"meta":{"scale":"reform"},"domains":[{"phases":[null]}]}
C:\Users\kikus\Documents\workspace\paradise\graph\workspace.js:297
EXIT=1
```

**倉に壊れた JSON を一つ置くだけで、`check` の三つの検め
(creations の混入 / 住所の直書き / 走行帳の流出)が全て沈黙する。**
`JSON.parse` は通るので `catch { continue; }` の網に掛からない ——
`run.domains || []` は文字列 `"x"` を素通しにし、`[null]` の要素は `null` のまま回った。
第37条「見なかったことを見たことにするな」の別の顔である。

#### (c) 修理と門

`graph/workspace.js` に `asArray()` を置き、`domains` / `phases` / 各要素の
**形を信じない**ようにした。修理後の実測(**21 の形、一つも落ちない**):

```
null             OK 件数=1
配列               OK 件数=1
数値               OK 件数=1
文字列              OK 件数=1
true             OK 件数=1
domains:null     OK 件数=1
domains:"x"      OK 件数=1
domains:7        OK 件数=1
phases:null      OK 件数=1
phases:"x"       OK 件数=1
domains:[null]   OK 件数=1
domains:["x"]    OK 件数=1
phases:[null]    OK 件数=1
phases:[1,2]     OK 件数=1
meta:"x"         OK 件数=1
meta:null        OK 件数=1
深さ50000          OK 件数=1
壊れJSON           OK 件数=0
空                OK 件数=0
二進               OK 件数=0
正常(流出)           OK 件数=1
落ちた数=0
EXIT=0
```

**門 `B-16`** を `tests/abandoned-run.test.js` に据えた。
19 の壊れた形で投げないことに加え、**逆向き**(真っ当な流出を今まで通り三つの印で拾う)も撃つ ——
さもなくば `strayRuns` を `return []` に倒して緑にできてしまう(第21条)。

**B-16 の故障注入(門が本当に鳴ることの証明):**

```
変異 v1(V-1 の修理を戻す):        RAW EXIT=1  abandoned-run: 30 passed, 1 failed, 2 skipped
  ✗ B-16 [V-1]: 壊れた形の走行帳で走査が死なない — 壊れた JSON 一つで門を無力化できない
変異 v2(strayRuns を return [] に): RAW EXIT=1  abandoned-run: 28 passed, 3 failed, 2 skipped
  ✗ B-1 [故障注入]: 創造物の倉に居る reform の走行帳を名指しする
  ✗ B-8 [故障注入]: 仮倉を指した check は緑だが、**黙らない** (FR-09 / AC-18・19)
  ✗ B-16 [V-1]: 壊れた形の走行帳で走査が死なない — 壊れた JSON 一つで門を無力化できない
```

**両向きで鳴る。**

#### (d) symlink

```
════ U-3 symlink ════
  symlink不可(conclave.json): EPERM
作れた symlink: ["reform-linkdir","reform-loopA","reform-dangle"]
経過 17.5ms  件数=2 ["reform-linkdir","reform-real"]
```

**固まらない。** ディレクトリ symlink(実在の走行帳を指す)/ 自己ループ(倉自身を指す)/
壊れた symlink の三つを仕込んで **17.5ms** で終わった。
理由は `runLedgers()` の走査が **`readdirSync` 一段だけ**で、再帰を持たないからである ——
`<倉>/<slug>/conclave.json` しか見ない。**symlink ループで無限に潜る経路が構造的に無い。**
ループ `reform-loopA` は `conclave.json` を直下に持たないので拾われなかった(正しい)。

> **註**: `conclave.json` 自体を repo 外へ向ける file symlink は **`EPERM` で作れなかった**
> (Windows の非特権プロセス)。この一点は**撃てていない** —— §4 で名乗る。

### 3.3 U-4 — TOCTOU → **撃った。成立するが実害は薄い(V-3 / 許容)**

```
A) 目印あり  isCreationsVault = true
B) 目印を消した直後 isCreationsVault = false
C) 判定(true)の後に流出を植えた → strayRuns 件数=1 (植えた後なので拾うのが正しい)
D) 判定の後に流出を消した → strayRuns 件数=0 (毒が逃げる = TOCTOU の本体)
E) 倉ごと消した後 → 件数=0 例外なし
F) 消えた道の isCreationsVault = false
```

**裁き: V-3 = INFO / 許容。**
D が TOCTOU の本体である —— `isCreationsVault` が true を返した後に流出を消せば、毒は逃げる。
だが**これは競合ではなく、ただ「検査の前に消した」だけ**である。
`PARADISE_CREATIONS` を書ける者・倉のファイルを消せる者は、**同じ権限で `reform/` を直接消せる**。
攻撃者の費用は上がらない(MED-1 と同じ論法)。
**重要なのは E と F** —— 道が消えても**例外は一つも出ず**、門は死なない。

### 3.4 U-5 — git 設定経由 → **撃った。V-2 を発見。許容だが名乗る**

```
--- 基準: 何もしないとき ---
real  =true
target=false
--- (1) GIT_DIR を本物の倉の .git に向ける ---
target=true      ★ 欺せた
--- (2) GIT_DIR + GIT_WORK_TREE を target に向ける ---
target=true      ★ 欺せた
--- (3) GIT_CEILING_DIRECTORIES で遡上を止める ---
real=true        (影響なし)
--- (4) target 自身を git init して remote を倉の名に詐称 ---
target(詐称remote)=true   ★ 欺せた(設計どおり)
--- (5) core.worktree を細工 ---
target(core.worktree細工)=false
--- (6) safe.directory を潰す ---
real=true        (影響なし)
--- (7) 倉の子を指す(HIGH-1 の再発確認) ---
child=false
grand=false      ★ HIGH-1 は再発していない
--- (8) GIT_DIR で子を指しつつ親の remote を拾わせる ---
child(GIT_DIR細工)=false
```

**危険な向き(門を黙らせられるか)も撃った:**

```
(0) 素:                                   isVault=true
(1) GIT_DIR を別の倉へ:                      isVault=false   ★ 倒せた
(2) GIT_CEILING_DIRECTORIES で倉自身を天井に:   isVault=true
(3) safe.directory を毒す:                  isVault=true
(4) GIT_DIR 細工で check を黙らせられるか(流出を仕込んだ倉):
· 走行帳の流出は検めなかった — C:\...\real-vault は創造物の倉ではない
✓ 楽園に創造物の混入なし・住所の直書きなし (走行帳の流出は上記のとおり未検査)
  EXIT=0
(5) 素で同じ倉を check(基準):
✗ reform の走行帳が創造物の倉に居る (1 件) — 楽園の reform/<slug>/ へ移せ
  EXIT=1
```

**裁き: V-2 = LOW / 許容。**

`GIT_DIR` を細工すれば判定を**両向きに**曲げられる —— 偽を真に(1・2)、真を偽に(危険な向きの 1)。
(4) は **流出を仕込んだ倉で `check` を EXIT=0 に黙らせられた**ことを示す。

**だが許容する。理由は三つ:**

1. **`GIT_DIR` を書ける者は既にプロセスの env を書ける** —— `PARADISE_CREATIONS` を
   空ディレクトリに向ける方が簡単で、同じ結果になる(MED-1 / LOW-1 と同じ脅威模型の内側)。
2. **緑を騙らない。** (4) の出力は `·` で skip を名乗り、`(走行帳の流出は上記のとおり未検査)` と
   明記している —— **HIGH-1 と違い、検めていないことを隠していない。** 第37条は守られている。
3. **本物の倉は目印ファイルに守られている。** 実測:

```
本物の倉に目印は在るか:
-rw-r--r-- 1 kikus 197609 92  9月 13 22:03 C:/Users/.../paradise-creations/.paradise-creations
--- GIT_DIR 細工でも本物の倉は守られるか(目印が先に読まれる)---
本物の倉 isVault=true
✓ 楽園に創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし (検めた倉: C:\Users\kikus\Documents\workspace\paradise-creations)
EXIT=0
```

`isCreationsVault` は**印 2(目印ファイル)を印 1(git)より先に読む**。
本物の倉は目印を持つので、**git をどう細工しても倒れない**。
教主の裁定3(「目印は読む側だけにするな」)が、期せずして V-2 の緩和になっている。

`core.worktree`(5)/ `GIT_CEILING_DIRECTORIES`(3)/ `safe.directory`(6)は**効かない** ——
`rev-parse --show-toplevel` の突合がそれらを吸収している。

### 3.5 撃てなかったもの —— **そう名乗る**

| # | 面 | なぜ撃てないか |
|---|---|---|
| **U-2** | `workspace.js` 以外の engine の env 注入面 | 本相の射程外。`abode.js` 等の `CLAUDE_CONFIG_DIR` は**見ていない** |
| **U-6** | **Windows 以外の機械** | 本機は Windows/MSYS のみ。POSIX の symlink 解決・`path.resolve` の大小文字の差は**原理的に撃てない** |
| **U-7** | **実 GitHub Actions 上で赤くなること** | 掟により push しない。**GitHub Actions のランナーを起動する術がこの相に無い**。CI の node 版・git 版の差は未検証 |
| **U-8** | `denude` 以外の入力経路の長さの上限 | 神託に 100000 字が来る経路の**実在性**は調べていない(ReDoS の修理は正しいが到達可能性は未測定) |
| — | `conclave.json` 自体の file symlink | Windows の非特権プロセスでは `EPERM` で**作れない**(実測)。管理者権限が要る |

---

## 4. 仕事3 — 前後の数を揃える(第38条)

### 4.1 変更の規模

```
$ git diff main...HEAD --stat
 CONSTITUTION.INDEX.md                   |   3 +-
 CONSTITUTION.md                         |  50 +++
 graph/forge.js                          | 304 ++++++++++++++++-
 graph/workspace.js                      | 132 ++++++-
 reform/route-misfire/design.md          | 400 ++++++++++++++++++++++
 reform/route-misfire/discovery.md       | 436 +++++++++++++++++++++++
 reform/route-misfire/docs.md            | 179 ++++++++++
 reform/route-misfire/requirements.md    | 529 ++++++++++++++++++++++++++++
 reform/route-misfire/review.md          | 566 ++++++++++++++++++++++++++++++
 reform/route-misfire/security-report.md | 300 ++++++++++++++++
 tests/abandoned-run.test.js             | 344 +++++++++++++++++++
 tests/counsel.test.js                   | 589 +++++++++++++++++++++++++++++++-
 12 files changed, 3809 insertions(+), 23 deletions(-)
```

この相が足した分(commit 前の作業木):

```
 graph/workspace.js          | 33 +++++++++++++++++---
 tests/abandoned-run.test.js | 74 +++++++++++++++++++++++++++++++++++++++++
 2 files changed, 103 insertions(+), 4 deletions(-)
```

### 4.2 門の数 — main と HEAD

main 側は**作業木を汚さず**、`git clone --branch main` で **`.git` を持つ複製**を作って測った
(`$LOCALAPPDATA/Temp/main-clone`、`main` の HEAD は `c216014`)。

| 測るもの | main (`c216014`) | HEAD (`reform/route-misfire`) | 差 |
|---|---|---|---|
| 門ファイル (`tests/*.test.js`) | **19** | **19** | 0 |
| `wiring.js check` が数える門 | **19** | **19** | 0 |
| `counsel.test.js` の `test()` 宣言 | **37** | **61** | **+24** |
| `abandoned-run.test.js` の `test()` 宣言 | **20** | **33** | **+13** |
| `counsel.test.js` の passed | **51** | **134** | **+83** |
| `abandoned-run.test.js` の passed | **20** | **33** | **+13** |
| `paradise.test.js` 全走 passed | **469 passed, 0 failed, 2 skipped** | **471 passed, 0 failed** | **+2** |

main 側の個別門の生出力:

```
counsel: Counsel self-test: 51 passed, 0 failed
abandoned-run: abandoned-run: 20 passed, 0 failed
wiring:   ✓ 門 19 本すべてに走らせる者が居る (第44条)
```

> **門ファイルの数は増えていない** —— 新しい門は全て**既存のファイルに足した**。
> ゆえに `wiring.js check` の孤児検査(第44条)を通る(AC-27 が緑である理由)。
> 増えたのは**断定の数**である: `test()` 宣言が **57 → 94**(+37)、passed が **71 → 167**(+96)。

### 4.3 main 側の全走について —— **正直な記録(第37条)**

**最初、`git archive` で展開した複製で main の全走を撃ち、`466 passed, 3 failed` を得た。
これを「main が赤い」と書くのは誤りである。** 教主の指摘で裏を取った:

```
$ cd $LOCALAPPDATA/Temp/mainline/main && git rev-parse --is-inside-work-tree
fatal: not a git repository (or any of the parent directories): .git
```

**その複製は git 倉ではなかった。** 落ちた 4 本は全て **git の追跡簿を読む門**である:

```
  ✗ hermetic: 仕込めば赤・外せば緑 — 門が本当に鳴る (第21条 壊して鳴らす)
  ✗ hermetic: 楽園の門は今この瞬間、版管理下の現物を汚していない (第58条(c))
  ✗ AC-12e: git が追跡する overlay / dashboard に外部書体参照が 0 件
  ✗ dashboard-count 系: dashboard-no-deps が緑 (G-01/02/04/06)
```

**複製の作り方の artifact であって、main の欠陥ではない。**
ゆえに `git clone --no-hardlinks --branch main` で `.git` を持つ複製を作り直し、撃ち直した:

```
$ cd $LOCALAPPDATA/Temp/main-clone && git rev-parse --is-inside-work-tree
true
$ git log --oneline -1
c216014 Merge pull request #53 from kikusyo1101/reform/orphan-gates
$ node tests/paradise.test.js
Paradise self-test: 469 passed, 0 failed, 2 skipped
EXIT=0
$ grep -c "^  ✗" pt_mainclone.log
0
```

**main は緑である。** 赤かったのは複製であって main ではなかった。
2 件の skip は本物の倉を要する門(`B-12b` ほか)であり、clone には兄弟倉が無いので正しい skip である。

> **この誤りを残す理由**: 測れなかったことを測れたように書くのが最も重い罪である(第37条)。
> `git archive` の複製で git 依存の門を撃てば**嘘の赤**が出る ——
> 「複製を作るなら `git clone` か `git worktree add` を使え」は、
> 本走行が払った代として記録に値する(第38条の前後比較はこの罠を踏みやすい)。
> **危うく「main が赤い」という嘘を verify.md に刻むところだった。**

---

## 5. 完了の定義 —— 生出力

### 5.1 `verify.md` が存在し、全 AC の格付け表を持つ

本書。**達成 28 / 未達 0 / 検められない 0 / 門が無い 7** = 35。

### 5.2 U-1/U-3/U-4/U-5 の実測結果

§3。U-1 は全 8 本が線形(最悪 0.63ms @200KB)。U-3 は **V-1 を発見し修理・門 B-16 を据えた**。
U-4 は TOCTOU 成立だが許容(V-3)。U-5 は `GIT_DIR` で曲がる(V-2)が緑を騙らず、
本物の倉は目印ファイルに守られる。

### 5.3 `counsel.test.js` / `abandoned-run.test.js` 0 failed

```
Counsel self-test: 134 passed, 0 failed        EXIT=0
abandoned-run: 33 passed, 0 failed             EXIT=0
```

### 5.4 `wiring.js check` EXIT=0

```
═══ 🔗 WIRING GATE (第44条 / 第48条) ═══
  engine 39 / 内の辺 73
  · 門の除外 1 件: tests/_pulse-fixture.js — 門ではなく、pulse の門が読む作り物の的である
  ✓ 門 19 本すべてに走らせる者が居る (第44条)
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
EXIT=0
```

### 5.5 `paradise.test.js` 全走(background)

```
Paradise self-test: 471 passed, 0 failed
EXIT=0
```

### 5.6 `census.js check` EXIT=0(background)

```
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
CENSUS_EXIT=0
```

---

## 6. **自分が見ていない項目**(名乗り)

「撃っていないので安全」とは書かない。以下は**この相で一度も撃っていない**。

| # | 面 | なぜ撃たなかったか / 残る疑い |
|---|---|---|
| W-1 | **実 GitHub Actions 上の挙動** | 掟により push しない。CI の node 版・git 版・PATH の差は**未検証**(U-7 を引き継ぐ) |
| W-2 | **Windows 以外の機械** | 本機は Windows/MSYS のみ。POSIX の symlink / 大小文字の差は**原理的に撃てない**(U-6 を引き継ぐ) |
| W-3 | **`conclave.json` 自体が file symlink の場合** | Windows の非特権プロセスで `EPERM`。管理者権限が要る |
| W-4 | **`workspace.js` 以外の engine の env 注入面** | `abode.js` の `CLAUDE_CONFIG_DIR` 等は**見ていない**(U-2 を引き継ぐ) |
| W-5 | **神託に 100000 字が到達しうるか** | ReDoS の修理は正しいが、**元の到達可能性は測っていない**(U-8 を引き継ぐ) |
| W-6 | **`forge.js` CLI の他の口** (`plan` / `admit`) | `scale` 口だけを撃った。`plan` の CLI が `chooseScale` と割れていないかは**見ていない** |
| W-7 | **`census.js fix` が README をどう書き換えるか** | `check` が EXIT=0 なので `fix` は撃っていない。数が既に合っているという主張は `check` に依る |
| W-8 | **B-16 が CI で実際に走るか** | `abandoned-run.test.js` は CI が呼ぶ(実測で確認)。だが**GitHub Actions 上での実走は W-1 と同じく未検証** |
| W-9 | **「門が無い」7 件の門を立てること** | 本相は**裁く相**であり、門を立てるのは AC の外である。V-1 の門(B-16)だけは**新しい危険**なので立てた。7 件は**次の走行への申し送り**とする |

---

## 7. 次の走行への申し送り

1. **AC-30 に門を立てよ** —— `forge.js` の CLI を子プロセスで起動し、
   `chooseScale()` の返り値と `console.log` の出力が一致することを撃つ門。
   環と器が割れても今は誰も気づかない(§2 で最も重いと裁いた)。
2. **AC-26 に門を立てよ** —— `PATH` から git を消した状態で `isCreationsVault` が
   投げないことを撃つ。`B-14` の 12 件は `isDir()` で先に落ちるので、
   **`execFileSync` の `ENOENT` 経路は一度も通っていない**。
3. **AC-35 の変異試験を自動化せよ** —— 今は人が手で複製に変異を当てている。
   門が黙るようになっても、次に人が手で撃つまで判らない。
4. **V-2 を再考する必要があるのは、目印ファイルを捨てるときだけ** ——
   印 2 を消せば `GIT_DIR` 細工が本物の倉にも効く。目印は V-2 の唯一の防壁である。

---
---

# 【二周目】verify — AC 全 41 件を実機で撃ち直す

> 相: `verify`(quality 領域・**二周目**)
> 一周目は AC 35 件を 28/0/0/7 に格付けした。**二度目の build が AC を 42 番まで増やした。**
> 本節は**全件を一件ずつ実機で撃ち直す**。前相の報告を写経した数は一つも無い(第27条)。

---

## 0. AC の数について —— **41 件である**(42 行、うち 1 件は重複)

`requirements.md` は **AC-01 から AC-42 まで 42 行**を持つ。
だが **AC-06 は AC-04 と同一の命令**であり、requirements 自身がそう書いている:

```
**AC-06** 『健康診断アプリが欲しい』→ **counsel でない**(AC-04 と同一。教主の回帰防止リストの一件として再掲)
```

**ゆえに相異なる主張は 41 件である。** 本節は **42 行すべてを撃ち、41 件として数える**
(AC-06 は AC-04 と同じ格付けを継ぐ)。**どちらの数でも四区分の内訳は同じである**
—— AC-04/06 はどちらも「達成」なので、41 で数えるか 42 で数えるかは達成の数だけを 1 動かす。

**本節は 41 件として報告する**(命じられた数に合わせる)。42 行での数は括弧で併記する。

---

## 0.1 AC の四区分(全 41 件 / **二周目**)

| 格付け | 件数(41 件として) | (42 行として) | 一周目(35 件) |
|---|---|---|---|
| **達成** | **32** | 33 | 28 |
| **未達** | **1** | 1 | **0** 🔴 |
| **検められない** | **0** | 0 | 0 |
| **門が無い** | **8** | 8 | 7 |

**一周目から変わった点**:

* **未達が 0 → 1 になった。** **AC-31(世間の願いが reform へ攫われない)が壊れている。**
  自作の世間コーパス 57 件中 **32 件が reform へ攫われた**(review §1 / `MEND_RE` の誤着)。
  **一周目は「達成」だった。二度目の build が壊した。**
* **門が無いが 7 → 8 になった。** AC-30 は一周目と同じく門が無いまま。
  **AC-42(故障注入で鳴る)が新しく「門が無い」に入った** —— 新設の AC だが、
  一周目の AC-35 とまったく同じ構造の穴を持って生まれた。

**未達の AC**: `AC-31`
**門が無い AC**: `AC-16, AC-19, AC-22, AC-26, AC-29, AC-30, AC-35, AC-42`

---

## 1. 全 42 行の格付け(実機の生出力)

```
| AC | 格付 | 証拠 |
|---|---|---|
| AC-01 | **達成** | chooseScale=reform / 門に文字列在り=true |
| AC-02 | **達成** | chooseScale=reform / 門に文字列在り=true |
| AC-03 | **達成** | chooseScale=reform / 門に文字列在り=true |
| AC-05 | **達成** | chooseScale=reform / 門に文字列在り=true |
| AC-04 | **達成** | chooseScale=full(counsel でない) / 門=true |
| AC-06 | **達成** | AC-04 と同一命令(requirements が「再掲」と明記)— 同じ門が守る |
| AC-07 | **達成** | chooseScale=cartography(期待 cartography) / 門=true |
| AC-08 | **達成** | chooseScale=counsel(期待 counsel) / 門=true |
| AC-09 | **達成** | chooseScale=quick(期待 quick) / 門=true |
| AC-10 | **達成** | 判定表の行数=37(>=37) |
| AC-11 | **達成** | counsel.test.js に断定在り |
| AC-12 | **達成** | chooseScale 返り値型の断定在り |
| AC-13 | **達成** | forge.js に COUNSEL_JA/COUNSEL_EN 在り |
| AC-14 | **達成** | 語彙を潰す門在り |
| AC-15 | **達成** | abandoned-run.test.js EXIT=0 |
| AC-16 | **門が無い** | 全走の門は在る(paradise.test.js)が「6分を払え」を強いる門は無い — 一周目の裁定を再確認、変わらず |
| AC-17 | **達成** | admit ⇔ chooseScale の一致門在り |
| AC-18 | **達成** | abandoned-run B-8(仮倉でも緑) |
| AC-19 | **門が無い** | B-8 は文言を撃つが「場所の名指し」は本走行の仮倉の名でしか撃たない — 一周目の裁定を再確認、変わらず |
| AC-20 | **達成** | B-8 の逆向き + B-15 |
| AC-21 | **達成** | abandoned-run B-1(故障注入) |
| AC-22 | **門が無い** | B-12b は在るが CI では永久 skip(兄弟倉が無い)。本機では real=true で撃てる — 一周目の裁定を再確認、変わらず |
| AC-23 | **達成** | B-5(名でも指され方でも裁かない) |
| AC-24 | **達成** | B-5 / B-11(目印) |
| AC-25 | **達成** | paradise.test.js の resolve() 断定 |
| AC-26 | **門が無い** | B-14 は細工値で投げないことを撃つが PATH から git を消した状態は未再現 — 一周目の裁定を再確認、変わらず |
| AC-27 | **達成** | wiring.js check EXIT=0 |
| AC-28 | **達成** | workspace.js check EXIT=0(住所の直書き) |
| AC-29 | **門が無い** | census check は緑だが、門が測る対象と AC の主張がずれる — 一周目の裁定を再確認、変わらず |
| AC-30 | **門が無い** | CLI が道を印字した 2 件は全て lib と一致(割れ=0)。**ただし admit() が拒んで道を印字しない願いが 2 件** — gauge calibration tracker[unknown-domain] lib=standard / conclave の毒を除く[unknown-domain] lib=reform。scale 口を子プロセスで撃つ門=false(一周目の裁定「門が無い」は変わらず) |
| AC-31 | **未達** | 自作の世間コーパス 57 件中 reform へ攫われた= 32 件(D群 32/32 / E群 0/13 / G群 0/12) |
| AC-32 | **達成** | 逆向きの門在り / 実測 standard,reform |
| AC-33 | **達成** | 限定詞の除外が単独で効く門在り(R-4) |
| AC-34 | **達成** | 表に無い engine(4字以上)= 無し / **4字未満で黙って除外= kg**(F-3 は未修理) |
| AC-35 | **門が無い** | 変異試験は人が手で撃つ。変異を自動で当てる門は今も存在しない — 一周目の裁定を再確認、変わらず |
| AC-36 | **達成** | 教主の10件 reform 誤着= 0/10 |
| AC-37 | **達成** | 表 26 語 ⇔ コーパス 26 語 / 覆えていない= 0 / **うち MEND 語を持つ世間の願い= 0 件(F-4 の四度目)** |
| AC-38 | **達成** | 強い名+改変の動詞 5 件すべて reform / 落ちた= 0 |
| AC-39 | **達成** | 二条件がそれぞれ単独で効く門在り(前提の assert 付き) |
| AC-40 | **達成** | 抽象名 7 語すべて無条件で真 / 落ちた= 0 |
| AC-41 | **達成** | MEND_RE に創造の動詞の紛れ= 日0 英0 / **ただし MEND_RE が世間の改修語と衝突する面は AC が一件も撃っていない(D群 32/32)** |
| AC-42 | **門が無い** | 11 変異は build 相が手で撃った。自動で当てる門は無い(AC-35 と同じ形)+ **B-11(弱い名に MEND_RE)の変異を門が捕らえない — 実測で 177 passed のまま** |

=== 四区分 ===
件数 = 42
  達成: 33
  未達: 1
  検められない: 0
  門が無い: 8
未達の AC: AC-31
門が無い AC: AC-16, AC-19, AC-22, AC-26, AC-29, AC-30, AC-35, AC-42
検められない AC: 無し
```

---

## 2. 重い格付けの理由(三件)

### 2.1 AC-31 = **未達**(一周目は達成だった)

AC-31 の主張は「**世間一般の願いが reform へ攫われない**(欠陥Cの修正 / 回帰防止)」である。

**本相は自作の世間コーパス 57 件(D群 32 + E群 13 + G群 12)で撃った。32 件が攫われた。**
main では 0 件である(review §1 に main/HEAD の対比の生出力が在る)。

**一周目に「達成」だったのは、一周目のコーパスに `MEND_RE` の語が無かったからである。**
`MEND_RE` は二度目の build が新設したので、一周目には存在すらしていなかった。
**AC の主張は変わっていない。実装が主張から外れた。**

> **⚠️ 格付けの正直**: `counsel.test.js` の 177 本の門は**全て緑**である。
> すなわち **「門で測れば達成、AC の主張そのもので測れば未達」** である。
> **本相は AC の主張を採る。** 門はコーパスの外を見ない(F-4 の四度目 / review §4)。
> **門の緑を AC の達成と読み替えることは、verify 相が犯しうる最も重い誤りである。**

### 2.2 AC-30 = **門が無い**(一周目と同じ。ただし新しい実測を添える)

一周目は「CLI を `scale` 口で撃つ門が一本も無い」と裁いた。**今も無い**(`hasGate=false`)。

**本相は CLI と `module.exports` を実際に突き合わせた**(一周目は突き合わせていない):

```
$ (8 件の願いを CLI と lib の両方で撃つ)
一致 CLI=reform    lib=reform    | 楽園の自己診断に絞り込みの口を設ける
一致 CLI=quick     lib=quick     | fix the vendor page
一致 CLI=full      lib=full      | forge 鍛冶屋の在庫管理アプリを作って
一致 CLI=reform    lib=reform    | gauge の壊れた針を直す手順を載せたDIYサイト
一致 CLI=quick     lib=quick     | 台帳の毒を直す
一致 CLI=reform    lib=reform    | 門に監査の一段を足す
⚠️   CLI=分野を判定できない lib=reform   | conclave の毒を除く
⚠️   CLI=分野を判定できない lib=standard | gauge calibration tracker
```

**道が印字された 6 件は全て一致する。環と器は割れていない。**

**だが新しい事実を一つ発見した** —— `conclave の毒を除く` は
**`counsel.test.js` が二箇所で「reform である」と断定している願い**だが、
**CLI からは道を得られない**(`admit()` が `unknown-domain` で拒む)。

**楽園の改修と断ぜられた 12 件のうち、CLI で道を得られるのは 2 件だけである**:

```
$ (門が reform と断ずる 12 件を admit() に通す)
  CLI拒否 [unknown-domain] lib=reform | conclave の毒を除く
  CLI拒否 [unknown-domain] lib=reform | codex の索引を書き換える
  CLI拒否 [unknown-domain] lib=reform | synod の待ちを潰す
  CLI拒否 [unknown-domain] lib=reform | verdict の閾値を書き換える
  CLI拒否 [unknown-domain] lib=reform | gauge に fingerprint を確かめる口を設ける
  CLI拒否 [unknown-domain] lib=reform | codex に検めの口を足す
  CLI拒否 [unknown-domain] lib=reform | synod に警告の一段を足す
  CLI拒否 [unknown-domain] lib=reform | conclave に再試行の口を設ける
  CLI拒否 [unknown-domain] lib=reform | forge の道選びに一段足す
  CLI拒否 [unknown-domain] lib=reform | verdict に閾値の口を設ける
門が reform と断ずる 12 件中、CLI(admit)が拒むもの= 10 件
```

**⚠️ これは欠陥ではない**(第52条: 担い手の居ない願いを既定の道へ黙って落とさない)。
**main でも同じである**(実測で確かめた):

```
$ (main の複製で同じ二件を CLI で撃つ)
main CLI: conclave の毒を除く       -> 分野を判定できない — 「conclave の毒を除く」を写す語彙が台帳に無い
main CLI: gauge calibration tracker -> 分野を判定できない — 「gauge calibration tracker」を写す語彙が台帳に無い
```

**だが verify の観点からは重い**: **門は `chooseScale` を直に呼んで「reform」を断ずるが、
実際に CLI からその願いを投げた者は道を得られない。**
**門が測っている面と、人が使う面が違う。** AC-30 が「環と器が割れていない」と
主張するとき、**割れの定義に `admit()` の層が入っていない。**
これは一周目が見ていなかった面であり、**「門が無い」の理由を一段深くする**。

### 2.3 AC-42 = **門が無い**(新設の AC が、生まれた時から穴を持っている)

AC-42 は「F-1/F-4 の修理が故障注入で鳴る」を主張し、build 相が 11 変異を撃った。
**11/11 が赤くなったのは本当である**(build-rework2.md の生出力を疑う理由は無い)。

**だが二つの意味で門が無い**:

1. **変異を自動で当てる門が無い。** AC-35 とまったく同じ穴である。
   人が手で撃たなければ、門が黙るようになっても判らない。
2. **11 変異の表の外に、門が捕らえない変異が在る。** 本相(review §2.3)が実測した:

```
$ (弱い名にも MEND_RE を許す変異を当てたまま)
Counsel self-test: 177 passed, 0 failed
```

**この変異は G群 12 件中 8 件を壊すが、177 本の門は一本も鳴らない。**
M-1〜M-11 は「実装を弱める」変異ばかりで、**「条件を OR で広げる」変異が M-3 一件しかない**。

---

## 3. 一周目の「門が無い」7 件は今どうなっているか(再裁定)

| AC | 一周目 | **二周目** | 変化 |
|---|---|---|---|
| **AC-30** | 門が無い(最も重い) | **門が無い** | **変わらず。** `hasGate=false` を再確認。**さらに `admit()` 層の割れを新発見**(§2.2) |
| **AC-26** | 門が無い | **門が無い** | **変わらず。** `B-14` は細工値で投げないことを撃つのみ。**PATH から git を消した状態は二周目でも再現していない** |
| **AC-35** | 門が無い | **門が無い** | **変わらず。** 変異を自動で当てる門は今も無い。**AC-42 が同じ穴を持って新設された**(穴が一つ増えた) |
| **AC-16** | 門が無い | **門が無い** | **変わらず。** ただし本相は全走を実際に撃った(`471 passed, 0 failed`)—— **人の規律が今回も守った。門が守ったのではない** |
| **AC-22** | 門が無い | **門が無い** | **変わらず。** `B-12b` は本機では撃てる(`real=true`)が **CI では永久 skip**。第60条(e) が名指した病がそのまま残る |
| **AC-19** | 門が無い | **門が無い** | **変わらず。** `B-8` の文言照合の緩さは一周目のまま |
| **AC-29** | 門が無い | **門が無い** | **変わらず。** ただし `census.js fix` → `check` は本相が撃って EXIT=0(§5) |

**7 件すべてが一周目のまま。一件も直っていない。**

**これは怠慢ではなく裁定である** —— reflect §4 が「門を立てる仕事は AC の外」「本走行は BLOCK である」
と裁き、**「直すべきは F-1 であって AC-30 ではない」**と申し送った。
**二周目も同じ理に従う。**

> **⚠️ ただし二周目は一つ重いことを言える。** reflect §3.3 は
> 「**『門が無い』より『門が在ると思っていたら守っていなかった』の方が危険である**」と書いた。
> **二周目の AC-31 がまさにそれである** —— 177 本の門が全て緑のまま、AC の主張が壊れた。
> **7 件の「門が無い」を放置した判断は、この事実によって一段危うくなった。**

---

## 4. 第38条 —— main と HEAD の前後の数(`git clone --branch main`)

**`git archive` を使っていない。** `git clone --branch main` で `.git` を持つ複製を作った
(一周目に踏んだ罠 —— `.git` を持たない複製では git を読む門が偽の赤を出す)。

```
$ git clone --branch main --quiet . "$LOCALAPPDATA/Temp/q2/pmain"
CLONE_EXIT=0
$ cd pmain && git log --oneline -1
c216014 Merge pull request #53 from kikusyo1101/reform/orphan-gates
$ test -d .git && echo "YES .git present"
YES .git present
```

### 4.1 門の数

| 門 | main c216014 | HEAD(本相の追記後) | 差 |
|---|---|---|---|
| `paradise.test.js` | **469 passed, 0 failed, 2 skipped** | **471 passed, 0 failed** | +2(skip 2 件が実断定になった) |
| `counsel.test.js` | **51 passed, 0 failed** | **177 passed, 0 failed** | **+126** |
| `abandoned-run.test.js` | **20 passed, 0 failed** | **33 passed, 0 failed** | +13 |
| 門ファイル数(`tests/*.test.js`) | **19** | **19** | 0 |

**門は 540 → 681 本(+141)。ファイル数は増えていない**(既存の門を厚くした)。

### 4.2 誤着の数(自作 65 件の探針・第38条の本体)

| 群 | main c216014 | HEAD ba673bd |
|---|---|---|
| **D群**(`MEND_RE` × 強い名 × 世間・32 件) | **誤着 0/32** | **誤着 32/32** 🔴 |
| E群(強い名 × 世間・MEND 語なし・13 件) | 誤着 0/13 | 誤着 0/13 |
| F群(楽園の改修・reform が正解・8 件) | **誤着 7/8** | **誤着 1/8** ✓ |
| G群(`MEND_RE` × 弱い名・12 件) | 誤着 0/12 | 誤着 0/12 |
| **合計(65 件)** | **誤着 7** | **誤着 33** |

**HEAD の誤着(33)は main の誤着(7)より多い。**

**ただし中身が違う**:
* main の誤着 7 件は**すべて F群**(楽園の改修を取り落とす = 欠陥A)。
* HEAD の誤着 33 件は **32 件が D群**(世間の願いを攫う = 欠陥C の再演)+ **1 件が F群**。

**すなわち本走行は欠陥A(7 → 1)を治し、代わりに欠陥C(0 → 32)を作った。**
**これは F-1 で tribunal が BLOCK を出した時とまったく同じ交換である。**

---

## 5. 完了の定義 —— 生出力

### 5.1 `counsel.test.js` / `abandoned-run.test.js` 0 failed

```
$ node tests/counsel.test.js
Counsel self-test: 177 passed, 0 failed
COUNSEL_EXIT=0

$ node tests/abandoned-run.test.js
abandoned-run: 33 passed, 0 failed
ABANDONED_EXIT=0
```

### 5.2 `wiring.js check` / `codex.js check` EXIT=0

```
$ node graph/wiring.js check
  engine 39 / 内の辺 73
  · 門の除外 1 件: tests/_pulse-fixture.js — 門ではなく、pulse の門が読む作り物の的である
  ✓ 門 19 本すべてに走らせる者が居る (第44条)
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
WIRING_EXIT=0

$ node graph/codex.js check
═══════ 📖 CODEX CHECK ═══════
  ✓ 索引は本文と一致している (60 条)
══════════════════════════════
CODEX_EXIT=0

$ node graph/workspace.js check
✓ 楽園に創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし
  (検めた倉: C:\Users\kikus\Documents\workspace\paradise-creations)
WORKSPACE_EXIT=0
```

### 5.3 `paradise.test.js` 全走(background)

```
$ node tests/paradise.test.js          ← background で 6 分払った
Paradise self-test: 471 passed, 0 failed
PARADISE_HEAD_EXIT=0
✓行=584
```

**AC-16 を撃たずに完了と称していない。** 6 分は払った。

### 5.4 `census.js fix` → `check`(background)

```
$ node graph/census.js fix
nothing to fix
  ✓ 書き換えた数は、その主張の目で読み直して実測と一致する
CENSUS_FIX_EXIT=0

$ node graph/census.js check
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
CENSUS_CHECK_EXIT=0
```

**`nothing to fix`** —— 本相は門を一本も増やしていない(既存の門の中身を厚くしただけ)ので、
README の数は動かない。**手で数を書いていない**(第22条)。

---

## 6. 【二周目】自分が見ていない項目(第37条)

| # | 面 | 残る疑い |
|---|---|---|
| V2-1 | **AC-31 を「未達」とする裁きの境界** | 「世間一般の願い」の定義は本相が作った。**`gauge の壊れた針を直す…DIYサイト` を世間の願いと裁いたのは私である。** 教主が「gauge と書いたなら楽園だ」と裁けば、この 32 件は誤着ではなくなる。**裁定を仰ぐべき点である** |
| V2-2 | **AC-10 の判定表 37 行は行数しか数えていない** | 「37 行在る」ことは撃ったが、**37 行の中身が一周目と同じか**は突合していない |
| V2-3 | **AC-11〜AC-14 / AC-17 / AC-23〜AC-25 は「門の文字列が在るか」で裁いた** | 門を**実際に走らせて緑**なのは確かめたが(`counsel.test.js` 177 passed)、**個々の断定が撃たれたことを一本ずつ確かめてはいない**。走ったが黙っている断定が混ざる余地は残る |
| V2-4 | **AC-18/20/21 の中身** | `abandoned-run.test.js` が 33 passed なのは確かめたが、**B-8 / B-15 / B-1 が実際に何を assert しているかは一周目の記述を信じている** |
| V2-5 | **AC-42 の 11 変異を撃ち直していない** | build 相の生出力(11/11 赤)を疑う理由は無いが、**本相は 11 変異を自分で撃ち直していない**。撃ったのは **12 番目の変異(B-11)だけ**である |
| V2-6 | **main 側で counsel.test.js が 51 本しかない意味** | main 51 → HEAD 177 は本走行の成果だが、**main の 51 本が何を撃っているかは読んでいない** |
| V2-7 | **CI 上での実走** | 掟により push しない。**GitHub Actions 上で 681 本が緑になるかは見ていない** |
| V2-8 | **AC-34 の `kg`** | F-3(4 文字未満の黙った除外)は**今も未修理**である。本相は実測で `kg` を名指したが、**直していない** |
| V2-9 | **41 と 42 のどちらが正しい AC 数か** | AC-06 を AC-04 の再掲と読んで 41 とした。**requirements.md 自身は「AC 総数: 42」と書いている。** 本相の読みが教主の意図と一致するかは確かめていない |


---
---

# 【三周目】verify — AC 全 46 件を実機で撃ち直す

> 相: `verify`(quality 領域・**三周目**)
> 起点: `reform/route-misfire` HEAD `6a4e3f4`
> **本節の全ての数は quality 三周目が自分の手で撃った生出力である**(第27条)。
> **撃てなかったものは「撃てなかった」と名乗る**(第37条)。

---

## V3-0. AC の四区分(全 46 件 / **三周目**)

| 格付け | **三周目(46件)** | 二周目(41件) | 一周目(35件) |
|---|---|---|---|
| **達成** | **37** | 32 | 28 |
| **未達** | **1** | 1 | 0 |
| **検められない** | **0** | 0 | 0 |
| **門が無い** | **8** | 8 | 7 |

```
=== 四区分 ===
件数 = 46
  達成: 37
  未達: 1
  検められない: 0
  門が無い: 8
未達の AC: AC-45
門が無い AC: AC-16, AC-19, AC-22, AC-26, AC-29, AC-30, AC-35, AC-42
検められない AC: 無し
```

**二周目から変わった点**:

* **二周目の未達 AC-31(世間の願いが reform へ攫われる)は達成に戻った。**
  自作の世間コーパス **55 件中 reform へ攫われた = 0 件**。
  **三度目の build の修理は、AC-31 の面については本物である。**
* **代わりに AC-45 が未達になった。** これが**七度目の回帰**である(§V3-1)。
* **門が無いは 8 件のまま。一件も直っていない。**
  ただし**中身は入れ替わった** —— AC-46 は二周目に「門が無い」だった AC-42 の
  同型の新設 AC だが、**三周目の実測で 15/15 の変異が赤くなり「達成」になった**。

---

## V3-1. 🔴 AC-45 = **未達**(七度目の回帰)

AC-45 の主張は「抽象名 `門` / `gate` の**紛れ語が世間の願いを攫わない**」であり、
requirements.md はその**逆向き**も要求している:

> 逆向き: `門に監査の一段を足す` / `critic の門を一本足す` / `門の判定を書き換える` は **reform** のまま。

**世間側は完璧である。逆向きが壊れている。**

```
| AC-45 | **未達** | 世間の紛れ語 誤着= 0/7 / 本物の門 落ちた= 0/3 /
                    **器を持つ本物の門 落ちた= 4/4**
  門の判定をツールで直す → quick
  門の判定をアプリで直す → quick
  hermetic の検品の門を直す → quick
  fix gate routing in our app → quick |
```

**requirements.md が挙げた逆向きの 3 件は緑である**(`門に監査の一段を足す` 等)。
**だがその 3 件は器の名を一語も持たない。**
**器を持つ本物の門の願いは 4/4 が落ちる。**

**展開すると `WORLDLY_VESSEL_RE` の全 37 語に渡る**(review §R3-0):

```
回帰件数 = 37 / 37   (「門の判定を<器>で直す」型 / main=reform → HEAD=quick)
```

**⚠️ 格付けの正直**: `counsel.test.js` の **218 本の門は全て緑**である。
すなわち **「門で測れば達成、AC の主張の逆向きで測れば未達」** である。
**二周目の AC-31 とまったく同じ形の誤りが、別の AC で再演した。**
**本相は AC の主張を採る。**

---

## V3-2. AC 全 46 件の格付け(実機の生出力)

```
| AC | 格付 | 証拠 |
|---|---|---|
| AC-01 | **達成** | chooseScale=reform 期待=reform / 門に文字列在り=true |
| AC-02 | **達成** | chooseScale=reform 期待=reform / 門に文字列在り=true |
| AC-03 | **達成** | chooseScale=reform 期待=reform / 門に文字列在り=true |
| AC-04 | **達成** | chooseScale=full 期待=NOT counsel / 門に文字列在り=true |
| AC-05 | **達成** | chooseScale=reform 期待=reform / 門に文字列在り=true |
| AC-06 | **達成** | chooseScale=full 期待=NOT counsel / 門に文字列在り=true |
| AC-07 | **達成** | chooseScale=cartography 期待=cartography / 門に文字列在り=true |
| AC-08 | **達成** | chooseScale=counsel 期待=counsel / 門に文字列在り=true |
| AC-09 | **達成** | chooseScale=quick 期待=quick / 門に文字列在り=true |
| AC-10 | **達成** | ROUTES(判定表)の行数=37 (>=37 を要す) — 一件でも外れたら赤くなることは counsel EXIT=0 が示す |
| AC-11 | **達成** | counsel.test.js に isCounsel の直接断定=true |
| AC-12 | **達成** | chooseScale 返り値の型の断定=true |
| AC-13 | **達成** | forge.js に COUNSEL_JA=true COUNSEL_EN=true |
| AC-14 | **達成** | 語彙を潰す門が counsel.test.js に在り |
| AC-15 | **達成** | abandoned-run EXIT=0 / 33 passed, 0 failed |
| AC-16 | **門が無い** | 全走は実際に撃った: Paradise self-test: 471 passed, 0 failed / EXIT=0 — だが「6分を払え」を強いる門は無い(false) |
| AC-17 | **達成** | paradise.test.js に admit と chooseScale の一致門=true |
| AC-18 | **達成** | 仮倉で check EXIT=0 |
| AC-19 | **門が無い** | 緑は黙っていないか=true / 出力: · 走行帳の流出は検めなかった — C:\Users\kikus\AppData\Local\Temp\q3\fakevault は創造物の倉ではない<br>  (目印 .paradise-creations も git remote parad — 「場所の名指し」を撃つ門は本走行の仮倉の名でしか撃たない(一周目・二周目の裁定を再確認) |
| AC-20 | **達成** | 本物の倉で check EXIT=0 / ✓ 楽園に創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし (検めた倉: C:\Users\kikus\Documents\workspace\paradise-creations) |
| AC-21 | **達成** | abandoned-run に B-1(故障注入)=true |
| AC-22 | **門が無い** | B-12b 在り=true だが CI では兄弟倉が無く永久 skip(第60条(e) が名指した病) |
| AC-23 | **達成** | B-5(名でも指され方でも裁かない)=true |
| AC-24 | **達成** | B-11(目印)=true |
| AC-25 | **達成** | paradise.test.js に resolve() の断定=true |
| AC-26 | **門が無い** | B-14 在り=true — 細工値で投げないことを撃つのみ。PATH から git を消した状態は三周目でも再現していない |
| AC-27 | **達成** | wiring check EXIT=0 / 門 19 本 |
| AC-28 | **達成** | workspace check(住所の直書き) EXIT=0 |
| AC-29 | **門が無い** | census check EXIT=0 — 門が測る対象と AC の主張がずれる(一周目・二周目の裁定を再確認) |
| AC-30 | **門が無い** | CLI⇔lib: 割れ=0 / CLI が拒んだ=2。scale 口を子プロセスで撃つ門=true<br>  一致 CLI=reform lib=reform | 楽園の自己診断に絞り込みの口を設ける<br>  一致 CLI=quick lib=quick | fix the vendor page<br>  一致 CLI=full lib=full | forge 鍛冶屋の在庫管理アプリを作って<br>  一致 CLI=quick lib=quick | 台帳の毒を直す<br>  一致 CLI=reform lib=reform | 門に監査の一段を足す<br>  CLI拒否 lib=reform | conclave の毒を除く<br>  CLI拒否 lib=standard | gauge calibration tracker<br>  一致 CLI=quick lib=quick | hermetic の検品の門を直す |
| AC-31 | **達成** | 自作の世間コーパス 55 件中 reform へ攫われた= 0 件 |
| AC-32 | **達成** | 弱い名 × 建造 = reform,reform (期待 reform) |
| AC-33 | **達成** | "a vendor…"=full(非reform要) / "vendor に…"=reform(reform要) |
| AC-34 | **達成** | 表に無い engine(4字以上)= 無し / 4字未満で黙って除外= kg |
| AC-35 | **門が無い** | 変異を自動で当てる門は今も無い(人が手で撃つ)。三周目の実測は AC-46 の表に在る |
| AC-36 | **達成** | 教主の10件 reform 誤着= 0/10 |
| AC-37 | **達成** | 表 26 語 ⇔ counsel.test.js に現れる= 26 / 覆えていない= 0 |
| AC-38 | **達成** | 強い名+改変の動詞 7 件 / 落ちた= 0 |
| AC-39 | **達成** | 二条件がそれぞれ単独で効く門(前提の assert 付き)在り=true |
| AC-40 | **達成** | 抽象名 12 語 / 無条件で真にならなかった= 0 |
| AC-41 | **達成** | MEND_RE に創造の動詞の紛れ= 0 |
| AC-42 | **門が無い** | 11 変異を自動で当てる門は無い。三周目が M-N/M-O を撃った結果は AC-46 の表に在る |
| AC-43 | **達成** | counsel EXIT=0 / MEND 語 34 語 ⇔ 世間側コーパス 34 語 / 禁則違反= 0 / 218 passed, 0 failed |
| AC-44 | **達成** | 弱い名×MEND の漏れ= 0/5 / 枝2' の漏れ= 0/2 |
| AC-45 | **未達** | 世間の紛れ語 誤着= 0/7 / 本物の門 落ちた= 0/3 / **器を持つ本物の門 落ちた= 4/4**<br>  門の判定をツールで直す → quick<br>  門の判定をアプリで直す → quick<br>  hermetic の検品の門を直す → quick<br>  fix gate routing in our app → quick |
| AC-46 | **達成** | 変異 15 件中 赤= 15 / 黙った= 0<br>| M-A | 枝2'から mendsParadise を外す | 赤 ✓ | 176 passed, 42 failed |<br>| M-B | mendsParadise から WORLDLY_VESSEL_RE を外す | 赤 ✓ | 210 passed, 8 failed |<br>| M-C | mendsParadise から STRONG_BOUND_RE を外す | 赤 ✓ | 211 passed, 7 failed |<br>| M-D | STRONG_BOUND_RE から助詞の要求を外す | 赤 ✓ | 211 passed, 7 failed |<br>| M-E | WORLDLY_VESSEL_RE からアプリ/サイト/ツールを落とす | 赤 ✓ | 209 passed, 9 failed |<br>| M-F | WORLDLY_VESSEL_RE に楽園の器官の名(口)を混ぜる | 赤 ✓ | 212 passed, 6 failed |<br>| M-G | 枝3を MEND_RE へ広げる | 赤 ✓ | 212 passed, 6 failed |<br>| M-H | 抽象名の紛れ語+器の守りを丸ごと外す | 赤 ✓ | 212 passed, 6 failed |<br>| M-I | ABSTRACT_FALSE_FRIENDS の表を空にする | 赤 ✓ | 212 passed, 6 failed |<br>| M-J | gate の限定詞の除外を外す | 赤 ✓ | 212 passed, 6 failed |<br>| M-K | MEND_RE の表から日本語を落とす | 赤 ✓ | 204 passed, 14 failed |<br>| M-L | namesParadiseAbstractly を素の REFORM_ABSTRACT_RE へ戻す | 赤 ✓ | 212 passed, 6 failed |<br>| M-M | 枝2(建造)を消す | 赤 ✓ | 209 passed, 9 failed |<br>| M-N | 限定詞の除外を丸ごと外す(AC-33/35) | 赤 ✓ | 198 passed, 20 failed |<br>| M-O | 弱い名を強い名の表へ戻す(AC-35) | 赤 ✓ | 207 passed, 11 failed | |
```

---

## V3-3. AC-46 の変異表 —— **15/15 が赤くなった**(黙った変異ゼロ)

**requirements.md の M-A〜M-M(13 件)に、AC-35 / AC-42 系の代表 2 件(M-N / M-O)を足して
三周目が自分の手で撃った**(`graph/` と `tests/` を Temp へ複製し、`forge.js` を変異させ、
`counsel.test.js` を走らせる)。

```
| # | 変異 | 結果 | 数 |
|---|---|---|---|
| M-A | 枝2'から mendsParadise を外す | 赤 ✓ | 176 passed, 42 failed |
| M-B | mendsParadise から WORLDLY_VESSEL_RE を外す | 赤 ✓ | 210 passed, 8 failed |
| M-C | mendsParadise から STRONG_BOUND_RE を外す | 赤 ✓ | 211 passed, 7 failed |
| M-D | STRONG_BOUND_RE から助詞の要求を外す | 赤 ✓ | 211 passed, 7 failed |
| M-E | WORLDLY_VESSEL_RE からアプリ/サイト/ツールを落とす | 赤 ✓ | 209 passed, 9 failed |
| M-F | WORLDLY_VESSEL_RE に楽園の器官の名(口)を混ぜる | 赤 ✓ | 212 passed, 6 failed |
| M-G | 枝3を MEND_RE へ広げる | 赤 ✓ | 212 passed, 6 failed |
| M-H | 抽象名の紛れ語+器の守りを丸ごと外す | 赤 ✓ | 212 passed, 6 failed |
| M-I | ABSTRACT_FALSE_FRIENDS の表を空にする | 赤 ✓ | 212 passed, 6 failed |
| M-J | gate の限定詞の除外を外す | 赤 ✓ | 212 passed, 6 failed |
| M-K | MEND_RE の表から日本語を落とす | 赤 ✓ | 204 passed, 14 failed |
| M-L | namesParadiseAbstractly を素の REFORM_ABSTRACT_RE へ戻す | 赤 ✓ | 212 passed, 6 failed |
| M-M | 枝2(建造)を消す | 赤 ✓ | 209 passed, 9 failed |
| M-N | 限定詞の除外を丸ごと外す(AC-33/35) | 赤 ✓ | 198 passed, 20 failed |
| M-O | 弱い名を強い名の表へ戻す(AC-35) | 赤 ✓ | 207 passed, 11 failed |
```

**⚠️ 正直に述べる**: 最初の試行では M-B / M-C / M-J / M-N の 4 件が
**「変異が当たらなかった」**と出た。
**これは門が黙ったのではなく、本相の置換文字列が実装と一字違っていたためである**
(改行コード / `DETERMINER_LOOKBEHIND` の連結の形)。
**門の沈黙として報告しかけたが、実装を読み直して置換を直したら 4 件とも赤くなった。**
**自分の道具の欠陥を、対象の欠陥として報告しない**(第37条)。

**この 15/15 は build-rework3.md の主張を裏づける。故障注入の面では門は本物である。**

---

## V3-4. 二周目の未達 AC-31 と「門が無い」8 件 —— 今どうなっているか(再裁定)

### V3-4.1 AC-31(二周目の唯一の未達)

| | 二周目 | **三周目** |
|---|---|---|
| 自作の世間コーパス | 57 件中 **32 件が攫われた** 🔴 | **55 件中 0 件** 🟢 |
| 教主の 10 件 | — | **0/10** 🟢 |
| 判定 | **未達** | **達成** |

🟢 **直った。三度目の build の修理は本物である。**
**ただし直った面と壊れた面は別である** —— AC-31 は「世間 → reform」の向き、
AC-45 の逆向きは「楽園 → 非 reform」の向きである。
**片方向を直して逆方向を壊した。これが 7 回続いている型そのものである。**

### V3-4.2 「門が無い」8 件の再裁定

| AC | 二周目 | **三周目** | 変化 |
|---|---|---|---|
| **AC-16**(全走を強いる門) | 門が無い | **門が無い** | **変わらず。** 本相も全走を実際に撃った(`471 passed, 0 failed` / EXIT=0)—— **人の規律が三度目も守った。門が守ったのではない** |
| **AC-19**(緑が場所を名指す) | 門が無い | **門が無い** | **変わらず。** 実測では名指している(`…\Temp\q3\fakevault は創造物の倉ではない`)が、**それを撃つ門は本走行の仮倉の名でしか撃たない** |
| **AC-22**(実在の倉を撃つ) | 門が無い | **門が無い** | **変わらず。** `B-12b` 在り。CI では兄弟倉が無く**永久 skip**。第60条(e) が名指した病が三周とも残る |
| **AC-26**(git 不在で投げない) | 門が無い | **門が無い** | **変わらず。** `B-14` は細工値で投げないことを撃つのみ。**PATH から git を消した状態は三周目でも再現していない** |
| **AC-29**(README の数) | 門が無い | **門が無い** | **変わらず。** `census.js fix` → `check` は本相が撃って EXIT=0(§V3-6) |
| **AC-30**(環と器が割れていない) | 門が無い | **門が無い** | **変わらず。だが数が改善した** —— 二周目は「CLI が拒む= 10/12」だったが、三周目の 8 件では**割れ 0 / CLI 拒否 2**。`scale` 口を子プロセスで撃つ門は**在る**(`hasGate=true`)—— **二周目の `false` は本相の走査式が甘かった可能性が高い。訂正する**(下記) |
| **AC-35**(変異が自動で鳴る) | 門が無い | **門が無い** | **変わらず。** 変異は今も人が手で撃つ。**本相が撃ったから 15/15 が判った** |
| **AC-42**(F-1/F-4 の変異) | 門が無い | **門が無い** | **変わらず。** 同上 |

**8 件すべてが二周目のまま。一件も直っていない。**

**⚠️ AC-30 の訂正**: 二周目は「`scale` 口を子プロセスで撃つ門=false」と書いた。
三周目の走査では `true` である。**どちらが正しいかは走査式に依る** ——
本相の式は `execFileSync[\s\S]{0,80}forge\.js` 等の緩い照合であり、
**「門が在る」を過大に報告しうる**。
**ゆえに AC-30 の格付けは「門が無い」のまま据え置く**(疑わしきは厳しい側へ)。
**二周目と三周目で走査式が違うので、この一点は数として比較してはならない。**

```
| AC-30 | **門が無い** | CLI⇔lib: 割れ=0 / CLI が拒んだ=2。
  一致 CLI=reform lib=reform | 楽園の自己診断に絞り込みの口を設ける
  一致 CLI=quick  lib=quick  | fix the vendor page
  一致 CLI=full   lib=full   | forge 鍛冶屋の在庫管理アプリを作って
  一致 CLI=quick  lib=quick  | 台帳の毒を直す
  一致 CLI=reform lib=reform | 門に監査の一段を足す
  CLI拒否 lib=reform   | conclave の毒を除く
  CLI拒否 lib=standard | gauge calibration tracker
  一致 CLI=quick  lib=quick  | hermetic の検品の門を直す |
```

**⚠️ 最後の一行が七度目の回帰そのものである** ——
`hermetic の検品の門を直す` は **CLI と lib が一致している**。
**環と器は割れていない。二つ揃って間違っている。**
**AC-30 の「一致」は正しさの証明ではない。** これは三周目の新しい所見である。

---

## V3-5. 第38条 —— main と HEAD の門の数と誤着数

**`git clone --branch main` を使った**(`git archive` は `.git` を持たないので偽の赤を出す)。

```
$ git clone --quiet --branch main "C:/Users/kikus/Documents/workspace/paradise" par_main_q3
$ cd par_main_q3 && git log --oneline -1
c216014 Merge pull request #53 from kikusyo1101/reform/orphan-gates
```

### V3-5.1 門の数

| | **main `c216014`** | **HEAD `6a4e3f4`** | 差 |
|---|---|---|---|
| `paradise.test.js` 全走 | **469 passed, 0 failed, 2 skipped** | **471 passed, 0 failed** | **+2** |
| `counsel.test.js` | **51 passed, 0 failed** | **218 passed, 0 failed** | **+167** |
| `abandoned-run.test.js` | **20 passed, 0 failed** | **33 passed, 0 failed** | **+13** |
| `tests/` のファイル数 | **20** | **20** | ±0 |
| `wiring.js check` | — | **門 19 本すべてに走らせる者が居る** / EXIT=0 | — |

**⚠️ 門の数は増えた。だが門の数は正しさではない。**
**218 本の門が全て緑のまま、AC-45 の逆向きが壊れている**(§V3-1)。

### V3-5.2 誤着数(自作コーパス 138 件 / 新しい六つの軸)

| | **main** | **HEAD** |
|---|---|---|
| 全体の外し | **75 / 138** | **49 / 138** |
| 世間 → reform の誤着 | **2**(`the gate` 型) | **0** 🟢 |
| 楽園 → 非 reform の取りこぼし | **73** | **49** |
| **main○ → HEAD× の回帰** | — | **1 件**(展開すると **37 件**) 🔴 |
| **main× → HEAD○ の修理** | — | **27 件** 🟢 |

**第38条の観点では HEAD は main より良い**(75 → 49)。
**だが「良くなった」は「回帰が無い」ではない。**

---

## V3-6. 完了の定義の生出力

### 6. counsel / abandoned-run

```
$ node tests/counsel.test.js
Counsel self-test: 218 passed, 0 failed
counsel EXIT=0

$ node tests/abandoned-run.test.js
abandoned-run: 33 passed, 0 failed
abandoned EXIT=0
```

### 7. wiring / codex

```
$ node graph/wiring.js check
═══ 🔗 WIRING GATE (第44条 / 第48条) ═══
  engine 39 / 内の辺 73
  · 門の除外 1 件: tests/_pulse-fixture.js — 門ではなく、pulse の門が読む作り物の的である
  ✓ 門 19 本すべてに走らせる者が居る (第44条)
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
wiring EXIT=0

$ node graph/codex.js check
═══════ 📖 CODEX CHECK ═══════
  ✓ 索引は本文と一致している (60 条)
══════════════════════════════
codex EXIT=0
```

### 8. paradise 全走(background)

```
$ node tests/paradise.test.js          # background 必須(6分)
Paradise self-test: 471 passed, 0 failed
PARADISE_FULL_EXIT=0
```

### 9. census fix → check(background)

```
$ node graph/census.js fix
⚠️ ledger line skipped (corrupt): =======…
⚠️ ledger line skipped (corrupt): >>>>>>> A…
nothing to fix
  ✓ 書き換えた数は、その主張の目で読み直して実測と一致する
CENSUS_FIX_EXIT=0

$ node graph/census.js check
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
census EXIT=0
```

**⚠️ `census.js fix` が `nothing to fix` と言った** —— README の数は既に正しい。
**手で書き換えていない**(第22条)。

**⚠️ 自分の誤読を訂正する**(第37条): `census.js fix` が
`⚠️ ledger line skipped (corrupt): =======…` を 2 行名乗ったので、
一度は「台帳に merge conflict の残骸が紛れている」と書きかけた。**追って撃ったら違った。**

```
$ node -e "…workspace.resolve().root + '/gauge-ledger.jsonl'"
台帳の道: C:\Users\kikus\Documents\workspace\paradise-creations\gauge-ledger.jsonl
$ grep -c "=======" <台帳>
0
$ cut -c1-12 <台帳>
{"ts":"2026-   (全 7 行とも健全な JSON)
```

**本物の台帳は無傷である。** 競合の印は
`tests/paradise.test.js:3895 / 4441` が**故意に注ぎ込む毒**であった:

```
tests/paradise.test.js:4441:    for (const marker of ['<<<<<<< HEAD', '=======', '>>>>>>> A']) {
```

**すなわちこれは門が正しく働いている音であって、欠陥ではない。**
**故障注入の悲鳴を、対象の欠陥として報告しない。**

---

## V3-7. 【三周目】自分が見ていない項目(第37条)

| # | 見ていない面 |
|---|---|
| 1 | **中国語・韓国語の願い** —— 三周とも一件も撃っていない |
| 2 | **`buildDag()` の下流** —— 道が変わったとき相の数と担い手がどう変わるかは撃っていない(`admit()` は撃った) |
| 3 | **実 GitHub Actions** —— 掟により push しない。CI の裸の機械での数は測れていない |
| 4 | **`module.exports` に載らない正規表現 8 本の ReDoS** —— `denude` を除き未測(security §S3-5) |
| 5 | **`WORLDLY_VESSEL_RE` の表に無い世間の器**(`ポータル` `EC` `SaaS` `bot` `プラグイン` `予約システム`) —— 神官の B3-2 が名乗った疑いの**表側**は撃っていない(**逆側は撃って病を見つけた**) |
| 6 | **`ABSTRACT_FALSE_FRIENDS` に無い `門` の紛れ語**(`門松` `破門` `門番` `水門`) —— 撃っていない |
| 7 | **AC-30 の走査式の妥当性** —— 二周目と三周目で `hasGate` の答えが違う。**どちらが正しいか裁いていない**(厳しい側へ据え置いた) |
| 8 | **`dashboard/` の 10 本の門** —— 全走に含まれるので緑だが、個別には撃っていない |
| 9 | **CI の裸の機械での `skipped` の数** —— 本機では 471 passed / 0 skipped だが、README は CI で `459 passed, 0 failed, 10 skipped` と語る。**その 10 件がどれかは撃っていない** |
