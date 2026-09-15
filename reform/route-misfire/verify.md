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
