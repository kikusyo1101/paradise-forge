# 楽園 — 道選び・環の裁きの三欠陥 修理の設計 (reform/judgment-triad / design 相)

- 走行日: 2026-09-17
- 枝: `reform/judgment-triad`
- 作業根: `C:/Users/kikus/Documents/workspace/paradise`
- 前相: `findings.md`(909 行 / discover)、`requirements.md`(541 行 / specify — **これが拘束である**)
- 掟: **本書の全ての形は写しの上で実測して確かめた。** 本物の `graph/` と `tests/` は一行も変えていない(第9節)。

---

## 0. 本書が決めたこと(先に結論)

| 札 | 決まった形 | 実測の根拠 |
|----|----------|-----------|
| **PARA-7** | **候補 D5** — `chooseScale` の `full` の段の**後**に、「創造動詞の**目的語**がサイト語である形」だけを `full` にする一段を置く。`fullJa`/`fullEn` には**一語も足さない** | 101 件コーパスで **対角 101/101・非対角 0/30**、耐久 16/16(第2節) |
| **PARA-9** | **C2a** — `isCartography` の先頭に `if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;`(AC-8 の裁定どおり C2 は採らない) | 同上の行列で `cartography` 15/15 を保つ |
| **PARA-6** | **R1** — `ratify()` の祝福の枝の先頭に関門(実行 12 行 + 註 18 行)。**相の `done`** と **領域の `blocked`** の二段。CLI は exit 2 | 四枝すべてを写しで実測(§3.3)。`paradise.test.js` は対照群 471/0 → R1 版 470/1 で**差分 1 本**(§4.3) |
| 残債 | PARA-10/PARA-11 を `debt.md` + `tests/route-debt.test.js` で xfail 凍結 | AC-7 |

**合格線(AC-5)は達成できる。** 到達した形は「語彙を足す」形ではなく、**「サイト語が願いの主題語かを構造で読む」形**である。第60条が名指しした「弱い印は表を足しても強くならない」の、そのままの実例である。

---

## 1. 本相が使った計測器(すべて読むだけ・本物を汚さない)

| 計測器 | 何を測るか | 本物への書き込み |
|--------|-----------|----------------|
| `_design_matrix.js` | **101 件**の受け入れコーパスで 6×6 混同行列。`PROBE_FORGE` で写しの forge を指せる | 無し |
| `_design_gate.js` | 曲げた forge を **`require.cache` に注入**して、既存門を**本物のリポジトリの場所から**走らせる | 無し |
| `_design_para7b.js` | PARA-7 の候補 B0/C1/D1/D2/D3/D4/D5/D5g を一つずつ当てて行列 + 既存門 2 本を撃つ | 無し(`$LOCALAPPDATA/Temp/jt_design/forge.<名>.js`) |
| `_design_stress.js` | コーパス**外**の 16 件で第60条(b) の両枝(全体8 / 部分8)を撃つ | 無し |
| `_design_para6.js` | R1 を当てた写しで ratify の四枝 (a)(b)(c)(c2) と CLI の exit 2 を撃つ | 無し(`$LOCALAPPDATA/Temp/jt_para6/`) |
| `_design_gate_conclave.js` | 曲げた conclave を cache 注入して既存門を本物の場所から走らせる(`_design_fixtures.js` が生成) | 無し |
| `_design_fixtures.js` | `tests/` 全体を静的+動的に走査し、PARA-6 の抜け道に寄りかかった fixture を名指す | 無し |
| `_design_final.js` | **本書 §2.5 のパッチ文そのまま**を当てて 101/101 を再現する(設計書と実測の乖離を許さない門) | 無し |
| `_design_ac6.js` | `tests/route-matrix.test.js` に的 15 件を足し FLOOR を上げた写しを、D5+C2a の forge に撃つ | 無し |

### 1.1 ⚠️ 計測器の作法を一つ直した — 「graph/ だけを写す」形は偽の ✗ を出す

discover 相の `_candidate_probe.js` は `graph/` だけを `$TMP` に写し、門の原文の
`path.join(ROOT, 'graph', 'forge.js')` を文字列置換していた。この形で `tests/counsel.test.js` を撃つと:

```
  ✗ counsel の道が名指す神官は全て clergy に実在する
  ✗ overlay/agents/auditor.md が実在し、位階どおりの宣言を持つ
  ✗ overlay/agents/reporter.md が実在し、位階どおりの宣言を持つ
  ✗ overlay/agents/data-collector.md が実在し、位階どおりの宣言を持つ
  ✗ 新エージェント3体は overlay.json の own に登録されている(配備に乗る)
  Counsel self-test: 205 passed, 5 failed
```

**候補と無関係な 5 本が、対照群(B0)でも同じように ✗ になった。** 原因は
門が `__dirname` から `ROOT` を計算しており、写し先には `overlay/` が無いことである。
ゆえに本相は `_design_gate.js`(cache 注入)に切り替えた。対照群での裏取り:

```
$ node reform/judgment-triad/_design_gate.js none tests/counsel.test.js ; echo EXIT=$?
Counsel self-test: 210 passed, 0 failed
EXIT=0
```

> **教訓(第58条の族):** 判定器だけを写して門を走らせるな。**門を本物の場所から走らせ、
> 判定器だけを差し替えよ。** 写した場所から走らせた門の ✗ は、門の言葉ではなく写しの言葉である。

---

## 2.【最優先】PARA-7 — 「産物全体 vs 部分機能」を分ける形

### 2.0 コーパス(101 件)の内訳

`_design_matrix.js` が持つ。requirements §3.1 の裁定どおり:

| 操作 | 件数 |
|------|------|
| findings 3.2 の 98 件 | 98 |
| **−2** PARA-10(`一門の家系図を作れるアプリが欲しい`)/ PARA-11(`相関図を描けるアプリを作って`)を残債へ | 96 |
| **+5** 「サイト語 × 部分機能」の standard の的 | **101** |

道ごと: `counsel=18, cartography=15, reform=15, quick=15, standard=22, full=16`

### 2.1 基準線(判定器そのまま)— 101 件

```
$ node reform/judgment-triad/_design_matrix.js

正解\実際               counse      cartog      reform       quick      standa        full     計
────────────────────────────────────────────────────────────────────────────────────────────
counsel                 18           0           0           0           0           0      18
cartography              0          15           0           0           0           0      15
reform                   0           0          15           0           0           0      15
quick                    0           0           0          15           0           0      15
standard                 0           2           0           0          20           0      22
full                     0           1           0           0           7           8      16

対角の合計: 91 / 101  (誤着 10 件)
非ゼロの非対角セル数: 3 / 30
判定: 不合格
```

### 2.2 候補の一覧と、それぞれの実測

**すべての候補は C2a(PARA-9 の修理)を含む。** 101 件コーパスは PARA-9 の的を含むので、
C2a なしでは PARA-7 の良否が PARA-9 の誤着に埋もれるからである。

命令: `node reform/judgment-triad/_design_para7b.js`(候補を一つずつ逐次に走らせる / NFR-1)

| 候補 | 形 | 対角 | 非ゼロ非対角セル | route-matrix | counsel | 耐久 16 件 |
|------|----|------|-----------------|--------------|---------|-----------|
| **B0** | C2a のみ(対照) | 94/101 | 1(`full→standard` 7) | exit 0 | exit 0 | 9/16 |
| **C1** | C2a + `fullJa`/`fullEn` に**サイト語を無条件で**足す | 96/101 | 1(**`standard→full` 5**) | exit 0 | exit 0 | 8/16 |
| **D1** | C2a + 「サイト語 + を/が/は + 創造動詞」の形だけ full(語彙は足さない) | **101/101** | **0** | exit 0 | exit 0 | 11/16 |
| **D2** | C2a + サイト語を full の段に足し、**部分機能の印で打ち消す** | **101/101** | **0** | exit 0 | exit 0 | 11/16 |
| **D3** | C1 + **部分機能の段を full より先**に置き standard を返す(段の入れ替え) | 100/101 | 1(`full→standard` 1) | **exit 1** | exit 0 | — |
| **D4** | C2a + D1 ∧ D2(主題語 ∧ 打ち消し) | **101/101** | **0** | exit 0 | exit 0 | 11/16 |
| **★D5** | C2a + **創造動詞の目的語がサイト語である形**だけ full(構造で分ける) | **101/101** | **0** | exit 0 | exit 0 | **16/16** |
| D5g | D5 + 部分機能の打ち消しを重ねる | **101/101** | **0** | exit 0 | exit 0 | 16/16 |

### 2.3 生出力 — 落ちた候補

#### B0(C2a のみ / PARA-7 未修理)— 対照

```
正解\実際               counse      cartog      reform       quick      standa        full     計
────────────────────────────────────────────────────────────────────────────────────────────
counsel                 18           0           0           0           0           0      18
cartography              0          15           0           0           0           0      15
reform                   0           0          15           0           0           0      15
quick                    0           0           0          15           0           0      15
standard                 0           0           0           0          22           0      22
full                     0           0           0           0           7           9      16

対角の合計: 94 / 101  (誤着 7 件)

═══ 非ゼロの非対角セル ═══

  [full → standard] : 7 件
      ・ECサイトを作れ   (new/PARA-7)
      ・社内ポータルサイトを作れ   (new/PARA-7)
      ・予約サイトを作りたい   (new/PARA-7)
      ・コーポレートサイトが欲しい   (new/PARA-7)
      ・通販サイトを構築して   (new/PARA-7)
      ・ニュースポータルのウェブサイトが欲しい   (new/PARA-7)
      ・build an e-commerce site   (new/PARA-7)

非ゼロの非対角セル数: 1 / 30
判定: 不合格

  ── 既存門 tests/route-matrix.test.js ──  exit=0
  Route matrix self-test: 13 passed, 0 failed
  ── 既存門 tests/counsel.test.js ──  exit=0
  Counsel self-test: 210 passed, 0 failed
```

> **C2a 単独で `standard` が 22/22・`cartography` が 15/15 になる。**
> 基準線の `standard→cartography` 2 件と `full→cartography` 1 件は C2a だけで消える。
> **PARA-9 の修理はここで完了しており、残るのは PARA-7 の 7 件だけである。**

#### C1(素の語彙追加)— specify §2.3 が予告した通り 5 件を攫う

```
standard                 0           0           0           0          17           5      22
full                     0           0           0           0           0          16      16

対角の合計: 96 / 101  (誤着 5 件)

  [standard → full] : 5 件
      ・レシピサイトの並び替えを実装して   (new/PARA-7-partial)
      ・サイトの検索機能を実装して   (new/PARA-7-partial)
      ・通販サイトのクーポン計算を作る   (new/PARA-7-partial)
      ・add a sort option to the recipe site   (new/PARA-7-partial)
      ・implement pagination for the site listing   (new/PARA-7-partial)

非ゼロの非対角セル数: 1 / 30
判定: 不合格
```

**第61条の実演である** —— `full` の行は 16/16 になり「良くなった」ように見えるが、
`standard` の行が 5 件を失っている。列だけを見れば緑を名乗れた。

#### D3(段の入れ替え)— **既存門を赤くする。採ってはならない**

```
full                     0           0           0           0           1          15      16
対角の合計: 100 / 101  (誤着 1 件)

  [full → standard] : 1 件
      ・読書記録のプラットフォームが欲しい   (gate)

  ── 既存門 tests/route-matrix.test.js ──  exit=1
  ✗ M-2 [対角]: 対角線の合計がコーパスの件数と等しい — 全件が正しい道へ着く
  ✗ M-3 [非対角]: 非対角の**各セル**が 0 — どの道も他の道を奪っていない
  Route matrix self-test: 11 passed, 2 failed
```

**攫われたのは `(gate)` の願い**、すなわち**既存門のコーパスの的**である。
原因: 「読書記録のプラット**フォーム**が欲しい」の「フォーム」が部分機能の印
`partJa` の `フォーム` に当たり、`full` の段より先に `standard` を返した。

> **これが第21条の赤である。** 「standard を先に裁く」形は、部分機能の印を
> **判定の上流**に置くので、印の紛れ語が `full` の願いを丸ごと落とす。
> **打ち消しの印は、必ず `full` の段の内側か下流に置け。上流に置くな。**

### 2.4 ★ 採用 — D5「創造動詞の**目的語**がサイト語である形」

D1/D2/D4 は三つとも 101/101 に届いた。**だが行列だけでは選べない。**
第60条(b)「規則を足したら両枝を持て」に従い、**コーパスの外**の 16 件で撃った
(枝A = 産物全体の言い換え 8 件 / 枝B = 部分機能の言い換え 8 件)。

```
$ node reform/judgment-triad/_design_stress.js

═══ 耐久まとめ ═══
候補   枝A(全体)  枝B(部分)  合計
B0        1/8        8/8     9/16
C1        8/8        0/8     8/16
D1        4/8        7/8     11/16
D2        8/8        3/8     11/16
D4        4/8        7/8     11/16
D5        8/8        8/8     16/16
D5g       8/8        8/8     16/16
```

**D1/D2/D4 は 11/16 で三すくみである** —— それぞれ別の枝を落とす:

| 候補 | 落ちた的 | 理由 |
|------|---------|------|
| D1 / D4 | `ECサイトの構築をお願いしたい` `ポータルサイトのリニューアルをしたい` `新しいコーポレートサイトの立ち上げ` `ウェブサイトを一から作ってほしい` | 「サイト語 + を/が/は + 創造動詞」の**直後の隣接**しか見ない。「サイト語 **の** 構築」(名詞化)と「サイト語を**一から**作る」(副詞が挟まる)を取りこぼす |
| D2 | `サイトのヘッダーを実装して` `通販サイトの在庫表示を作る` `ポータルサイトのお知らせ欄を実装して` `サイトの画像を圧縮する仕組みを作る` `build a csv export for the shop admin` | 部分機能を**語彙の表**で打ち消しているので、表に無い部分名詞(ヘッダー/在庫表示/お知らせ欄/csv export)を取りこぼす。**第60条そのもの — 表は伸ばしても追いつかない** |

**D5 は語彙の表ではなく構造を読む** ので、両枝とも 8/8 である。

#### D5 の判定の理路

> 「サイトの検索機能を実装して」の創造動詞 `実装` の**目的語は「機能」**であって「サイト」ではない。
> 「ECサイトを作れ」の `作` の**目的語は「サイト」**である。
> **求められているのが産物全体か一部かは、語彙ではなく「創造動詞が何を目的語に取るか」に現れる。**

日本語は三つの形だけを `full` にする:

| 形 | 例 | 当たるか |
|----|----|---------|
| サイト語 + `を/が/は` + (`を の に` を含まぬ 0〜6 字) + 創造動詞 | `ECサイトを作れ` `ウェブサイトを一から作ってほしい` `通販サイトが必要だ` | ✓ |
| サイト語 + `の` + **創造の名詞**(構築/開発/制作/作成/新設/立ち上げ/リニューアル/刷新) | `ECサイトの構築をお願いしたい` `ポータルサイトのリニューアル` | ✓ |
| サイト語 + `の` + **他の名詞** + `を` + 動詞 | `サイトの検索機能を実装して` `通販サイトのクーポン計算を作る` | ✗(当たらない) |
| サイト語 + `に` + … | `ECサイトに決済の導線を追加して` | ✗ |

`[^をのに]{0,6}` が要である —— 助詞 `を/の/に` を跨がせないことで、**別の目的語が挟まった形を自然に落とす**。
`並び替え`/`検索機能`/`クーポン計算` のような部分名詞を一語も列挙せずに済む。

英語は「創造動詞 → (冠詞/形容詞 0〜2 語、**前置詞を挟まない**) → サイト語」:

| 形 | 例 | 当たるか |
|----|----|---------|
| `build an e-commerce site` / `we need a new corporate website` / `launch a company portal` / `i want an online shop` | ✓ |
| `build a csv export **for** the shop admin` / `implement a login form **for** the portal` / `add a share button **to** the website` | ✗(前置詞が挟まる) |
| `add a sort option to the recipe site` / `implement pagination for the site listing` | ✗ |

`(?!\b(?:for|to|of|in|on|with|from|into)\b)` の否定先読みが、**前置詞句の中のサイト語**を落とす。
英語では「前置詞の向こう側にあるものは、動詞の目的語ではない」—— これも語彙ではなく構造である。

#### D5 の行列(合格)

```
$ node reform/judgment-triad/_design_para7b.js D5

候補 D5 — C2a + 創造動詞の目的語がサイト語である形だけを full にする(構造で分ける / 打ち消し無し)
  曲げた forge: C:\Users\kikus\AppData\Local\Temp\jt_design\forge.D5.js  (原文と異なるか: YES)
═══ 6 道 × 6 道 混同行列 (101 件) ═══

正解\実際               counse      cartog      reform       quick      standa        full     計
────────────────────────────────────────────────────────────────────────────────────────────
counsel                 18           0           0           0           0           0      18
cartography              0          15           0           0           0           0      15
reform                   0           0          15           0           0           0      15
quick                    0           0           0          15           0           0      15
standard                 0           0           0           0          22           0      22
full                     0           0           0           0           0          16      16

対角の合計: 101 / 101  (誤着 0 件)

═══ 非ゼロの非対角セル ═══
  (無し — 全セル 0)

非ゼロの非対角セル数: 0 / 30
判定: 合格 (対角 101/101 かつ 非対角 0)

  ── 既存門 tests/route-matrix.test.js ──  exit=0
  Route matrix self-test: 13 passed, 0 failed
  ── 既存門 tests/counsel.test.js ──  exit=0
  Counsel self-test: 210 passed, 0 failed
```

**(1) 対角 101/101 (2) 非ゼロ非対角セル 0/30 (3) 既存門 route-matrix exit 0 / counsel exit 0。AC-5 達成。**

#### D5 の耐久(コーパス外 16 件)

```
候補 D5 — 耐久 16 件(コーパス外)
  ok  [A-全体] "ECサイトの構築をお願いしたい" -> full  (正解 full)
  ok  [A-全体] "ポータルサイトのリニューアルをしたい" -> full  (正解 full)
  ok  [A-全体] "新しいコーポレートサイトの立ち上げ" -> full  (正解 full)
  ok  [A-全体] "ウェブサイトを一から作ってほしい" -> full  (正解 full)
  ok  [A-全体] "通販サイトが必要だ" -> full  (正解 full)
  ok  [A-全体] "we need a new corporate website" -> full  (正解 full)
  ok  [A-全体] "launch a company portal" -> full  (正解 full)
  ok  [A-全体] "i want an online shop" -> full  (正解 full)
  ok  [B-部分] "ECサイトに決済の導線を追加して" -> standard  (正解 standard)
  ok  [B-部分] "サイトのヘッダーを実装して" -> standard  (正解 standard)
  ok  [B-部分] "通販サイトの在庫表示を作る" -> standard  (正解 standard)
  ok  [B-部分] "ポータルサイトのお知らせ欄を実装して" -> standard  (正解 standard)
  ok  [B-部分] "サイトの画像を圧縮する仕組みを作る" -> standard  (正解 standard)
  ok  [B-部分] "add a share button to the website" -> standard  (正解 standard)
  ok  [B-部分] "implement a login form for the portal" -> standard  (正解 standard)
  ok  [B-部分] "build a csv export for the shop admin" -> standard  (正解 standard)
  枝A(全体→full): 8/8   枝B(部分→full にしない): 8/8   合計 16/16
```

#### D5g は採らない — 打ち消しが**一度も発火しない**(死んだ規則)

D5g(D5 + 部分機能の打ち消し)も 101/101・16/16 だが、**D5 と一件も差が出ない**。
すなわち `partJa`/`partEn` の打ち消しは **32 件の的すべてで無効**である。
**発火しない規則を置くな**(第16条の趣旨・門の飾り化)。D5 の構造の判定が既に部分機能を落としているので、
打ち消しは重複であり、将来「打ち消しが守っている」と誤読される種になる。**D5 を採る。**

### 2.5 ★ 確定したパッチの形(`graph/forge.js`)

#### (1) PARA-9 / C2a — `isCartography()` 内、L587 の直後に **1 行**

```js
 function isCartography(wish) {
   if (!DIAGRAM_RE.test(wish)) return false;
+  /**
+   * ★ PARA-9: **図を作る産物**は図そのものではない (reform/judgment-triad)。
+   * counsel は同じ病を `wantsProduct()` で解いているのに、cartography だけが
+   * 打ち消しを持たなかった —— 「家系図を作れるアプリが欲しい」が図一枚で返された。
+   *
+   * ⚠️ **`wantsProduct(wish)` をそのまま呼んではならない**(AC-8 / findings 5.4)。
+   *    `PRODUCT_RE` の一字の名「相」が『楽園の**相**の系統図を描いてほしい』に当たり、
+   *    既存門 tests/route-matrix.test.js のコーパスの願いが reform へ攫われる(実測 exit 1)。
+   *    ゆえに **強い産物名だけ**で打ち消す。第60条: 弱い印を打ち消しに使えば別の道を奪う。
+   */
+  if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;
   // 「図に」「図を」だけで当たった場合、それが紛れ語の一部でないか確かめる。
   const onlyWeak = !new RegExp(...).test(wish);
```

#### (2) PARA-7 / D5 — `chooseScale()` 内、`fullJa`/`fullEn` の段の**後ろ**に一段

`fullJa` と `fullEn` の中身は **一字も変えない**(第60条: 表を足しても強くならない)。

```js
   const fullJa = /製品|システム|アプリ|プラットフォーム|全体/;
   const fullEn = /\b(product|platform|system|app|application|saas|dashboard|end-to-end|mvp|launch)\b/;
+  /**
+   * ★ PARA-7: web の産物語彙(サイト/ウェブ/EC/通販/ポータル)は
+   * `fullJa`/`fullEn` に一語も無く、web の願いは既定の standard へ黙って落ちていた(第16条)。
+   *
+   * ⚠️ **語彙を `fullJa` に足す形(C1)を採ってはならない。** 実測で
+   *    standard の部分機能の願いを **5/5 攫った**(「サイトの検索機能を実装して」→ full)。
+   *    「サイト」は産物全体の名でもあり、その一部が載る場所の名でもある ——
+   *    語彙の表では二つの顔を分けられない(第60条)。
+   *
+   * ⚠️ **部分機能の語彙表で打ち消す形(D2)も採らない。** 表に無い部分名詞
+   *    (ヘッダー / 在庫表示 / csv export…)を取りこぼす。耐久実測で 3/8。
+   *
+   * ⚠️ **部分機能の段を full より先に置く形(D3)は既存門を赤くする。**
+   *    「読書記録のプラット**フォーム**が欲しい」の「フォーム」が部分の印に当たり、
+   *    既存門のコーパスの full の願いが standard へ落ちた(実測 route-matrix exit 1)。
+   *
+   * 採った形は **構造**である ——「創造動詞が何を**目的語**に取っているか」。
+   *   「ECサイト**を**作れ」        → 作の目的語はサイト  → full
+   *   「サイト**の**検索機能**を**実装して」→ 実装の目的語は機能 → full にしない
+   * 日本語は助詞 `を/の/に` を跨がせない(`[^をのに]{0,6}`)ことで別の目的語を退け、
+   * 英語は前置詞(for/to/of…)を跨がせないことで前置詞句の中のサイト語を退ける。
+   * 実測: 101 件コーパスで対角 101/101・非対角 0/30、コーパス外の耐久 16/16(design §2.4)。
+   */
+  const SITE = 'サイト|ウェブ|ウエブ|ホームページ|ポータル|通販|EC';
+  const siteWholeJa = new RegExp(
+    '(?:' + SITE + ')(?:を|が|は)[^をのに]{0,6}(?:作|造|構築|開発|制作|立ち上げ|新設|リニューアル|刷新|欲しい|ほしい|要る|必要)' +
+    '|(?:' + SITE + ')の(?:構築|開発|制作|作成|新設|立ち上げ|リニューアル|刷新)');
+  const siteWholeEn = /\b(?:build|create|launch|develop|make|implement|need|want|set\s+up)\b\s+(?:a|an|the|new|our|my)?\s*(?:(?!\b(?:for|to|of|in|on|with|from|into)\b)[a-z][a-z-]*\s+){0,2}(?:site|website|web[- ]?app|e-?commerce|portal|shop|store)\b/i;
   if (quickJa.test(d) || quickEn.test(w)) return 'quick';
   if (fullJa.test(d) || fullEn.test(w)) return 'full';
+  // ★ この段は `full` の**後**に置く。前に置けば `full` の願いを奪う(D3 の実測)。
+  if (siteWholeJa.test(d) || siteWholeEn.test(w)) return 'full';
   return 'standard';
```

> **段の位置は `full` の直後・`return 'standard'` の直前でなければならない。**
> `quick` より前に置けば「サイトのタイポを直す」が full へ跳ねる(`quick` の段は現状 15/15 で無傷 — requirements §5)。
> `full` より前に置く意味は無い(同じ `full` を返すので結果は同じだが、段を増やす理由が無い)。

---

## 3. 【PARA-6】ratify の関門 — 確定した実装形

### 3.1 パッチの形(`graph/conclave.js` / `ratify()` L691-698)

**現状(原文)**:

```js
function ratify(run, cardinal, opts = {}) {
  const d = run.domains.find(x => x.cardinal === cardinal);
  if (!d) throw new Error('no such cardinal: ' + cardinal);
  if (!opts.reject) {
    d.status = 'ratified';
    run.history.push({ ts: now(), event: 'ratify', detail: `${d.domain} ratified by ${d.reviewClass}` });
    return { ok: true, ratified: cardinal };
  }
```

**当てる形** —— `if (!opts.reject) {` の**内側の先頭**に置く。**`--reject` の枝には一行も触れない**(AC-3(a)):

```js
 function ratify(run, cardinal, opts = {}) {
   const d = run.domains.find(x => x.cardinal === cardinal);
   if (!d) throw new Error('no such cardinal: ' + cardinal);
   if (!opts.reject) {
+    /**
+     * ★ PARA-6 の関門 (第37条 / reform/judgment-triad AC-1〜AC-3)。
+     *
+     * 旧実装は `d.phases` を一度も見ずに `ratified` を書いた —— 実測で
+     * **17 相すべて pending・成果物 0 件のまま `domains ratified: 6/6`** が成立し、
+     * `conclave.js audit` はそれを `closed` として ✓ で通した(findings 1.2/1.4)。
+     * 拒否(`--reject`)の側だけが厳密で、祝福の側が無条件だった。
+     *
+     * ⚠️ **関門は「現在の状態」だけを見る。`run.history` を読まない**(NFR-7 / AC-4)。
+     *    歴史を裁けば過去 4 台帳 6 件が赤くなるが、その 4 本は最終的に仕事が済んでおり
+     *    直すべき嘘が現存しない。歴史の遡及検査は `audit` 側の主題である。
+     * ⚠️ **部分適用しない**(NFR-9)。throw より前に `d.status` を書かない。
+     * ⚠️ **`--reject` の枝には掛けない**(AC-3(a))。着手前の相を上流へ差し戻す
+     *    第14条の大きな環が不可能になる。「仕事が無い」ことは拒否の理由にならない。
+     */
+    if (d.status === 'blocked') {
+      const err = new Error(`cannot ratify ${cardinal}: domain is blocked — 領域が閉塞している。` +
+        `${MAX_DOMAIN_REWORK} 回の差し戻しを使い切った領域は自力で祝福できない。**人を呼べ**(教主の裁可が要る)。`);
+      err.code = 'RATIFY_DOMAIN_BLOCKED';
+      err.cardinal = cardinal;
+      throw err;
+    }
+    const notDone = d.phases.filter(p => p.status !== 'done');
+    if (notDone.length) {
+      const blocked = notDone.filter(p => p.status === 'blocked');
+      const err = new Error(`cannot ratify ${cardinal}: ${notDone.length} phase(s) not done: ` +
+        notDone.map(p => `${p.id}=${p.status}`).join(', ') +
+        (blocked.length ? ` — blocked の相が在る(${blocked.map(p => p.id).join(', ')})。待っても直らない。**人を呼べ**。`
+                        : ` — 済ませてから祝福せよ: node graph/conclave.js done <id> --run <f> --artifact <p>`));
+      err.code = 'RATIFY_PHASES_NOT_DONE';
+      err.cardinal = cardinal;
+      err.phases = notDone.map(p => ({ id: p.id, status: p.status }));
+      throw err;
+    }
     d.status = 'ratified';
     run.history.push({ ts: now(), event: 'ratify', detail: `${d.domain} ratified by ${d.reviewClass}` });
     return { ok: true, ratified: cardinal };
   }
```

**行数: 空行込み 30 行(註 18 行 + 実行 12 行)。挿入位置は L694 `if (!opts.reject) {` の直後。**

### 3.2 CLI の exit 2 と文言(`graph/conclave.js` L822-823)

**現状**:

```js
  } else if (cmd === 'ratify') {
    need(); const run = load(rp); const res = ratify(run, pos[0], { reject: f.reject, from: f.from }); save(rp, run);
```

**当てる形** —— 関門の throw を捕らえ、**台帳を保存せずに** exit 2 で落ちる:

```js
   } else if (cmd === 'ratify') {
-    need(); const run = load(rp); const res = ratify(run, pos[0], { reject: f.reject, from: f.from }); save(rp, run);
+    need(); const run = load(rp);
+    let res;
+    try {
+      res = ratify(run, pos[0], { reject: f.reject, from: f.from });
+    } catch (e) {
+      // ★ 関門が拒んだときは **台帳を保存しない**(NFR-9: 部分適用しない)。
+      //   exit 1 は「engine が壊れた」、exit 2 は「人がすべきことが残っている」。
+      if (e.code === 'RATIFY_PHASES_NOT_DONE' || e.code === 'RATIFY_DOMAIN_BLOCKED') {
+        console.error('✗ ' + e.message);
+        if (e.code === 'RATIFY_DOMAIN_BLOCKED') {
+          console.error('  → 教主を呼べ。閉塞した領域は engine が自分で開けてはならない(第51条c)。');
+        } else {
+          for (const p of e.phases) console.error(`  · ${p.id} = ${p.status}`);
+          console.error('  → 未了の相を済ませてから、もう一度 ratify せよ。');
+        }
+        process.exit(2);
+      }
+      throw e;
+    }
+    save(rp, run);
```

**文言の要点(NFR-6: 拒否の文言は次の一手を含む)**:

| 枝 | 標準エラーの本文 | exit |
|----|----------------|------|
| 相が未了(pending/rework) | `✗ cannot ratify requirements: 2 phase(s) not done: analyze=pending, specify=pending — 済ませてから祝福せよ: node graph/conclave.js done <id> --run <f> --artifact <p>` + 相ごとの一行 | **2** |
| 相が `blocked` | `… — blocked の相が在る(specify)。待っても直らない。**人を呼べ**。` | **2** |
| 領域が `blocked` | `✗ cannot ratify architecture: domain is blocked — 領域が閉塞している。3 回の差し戻しを使い切った領域は自力で祝福できない。**人を呼べ**(教主の裁可が要る)。` + `→ 教主を呼べ。閉塞した領域は engine が自分で開けてはならない(第51条c)。` | **2** |

> **`blocked` は「待てば直る」と読まれてはならない。** ただ `not done` と言えば人は待つ。
> 文言に「**人を呼べ**」を明記することが AC-3(c)/(c2) の要求である。

### 3.3 四つの枝の実測(写しの上)

計測器: `reform/judgment-triad/_design_para6.js`(R1 を当てた conclave.js を cache 注入して四枝を撃つ)

```
$ node reform/judgment-triad/_design_para6.js

錨 "if (!opts.reject) {" の出現回数: 1  (1 でなければ挿入位置が曖昧)

════════════════════════════════════════════════════════════════════
PARA-6 / R1 の四つの枝 — AC-3 の表どおりか
════════════════════════════════════════════════════════════════════

(a) --reject / 相は全て pending  [specify=pending]
  -> 通った  {"ok":true,"reworked":["specify","ux","design","identity","detail","build","tests","review","ux-review","security","verify","reflect","verdict"],"target":"requirements"}
  相の状態: specify=rework
  領域の status: active

(b) rework の相が在る  [specify=rework]  領域 status=pending
  -> 拒まれた  code=RATIFY_PHASES_NOT_DONE
  文言: cannot ratify requirements: 1 phase(s) not done: specify=rework — 済ませてから祝福せよ: node graph/conclave.js done <id> --run <f> --artifact <p>
  領域の status(部分適用していないか): pending

(c) blocked の相が在る  [specify=blocked]  領域 status=pending
  -> 拒まれた  code=RATIFY_PHASES_NOT_DONE
  文言: cannot ratify requirements: 1 phase(s) not done: specify=blocked — blocked の相が在る(specify)。待っても直らない。**人を呼べ**。
  「人を呼べ」を含むか: true
  領域の status: pending

(c2) 領域そのものが blocked / 相は全て done  [specify=done]  領域 status=blocked
  -> 拒まれた  code=RATIFY_DOMAIN_BLOCKED
  文言: cannot ratify requirements: domain is blocked — 領域が閉塞している。3 回の差し戻しを使い切った領域は自力で祝福できない。**人を呼べ**(教主の裁可が要る)。
  「人を呼べ」を含むか: true
  領域の status(化けていないか): blocked

(対) 相が全て done  [specify=done]
  -> 通った  {"ok":true,"ratified":"requirements"}   領域 status -> ratified

════════════════════════════════════════════════════════════════════
CLI の口 — exit 2 と標準エラーの本文
════════════════════════════════════════════════════════════════════

$ node graph/conclave.js ratify requirements --run <f>   (相は全て pending)
EXIT=2
--- stderr ---
✗ cannot ratify requirements: 1 phase(s) not done: specify=pending — 済ませてから祝福せよ: node graph/conclave.js done <id> --run <f> --artifact <p>
  · specify = pending
  → 未了の相を済ませてから、もう一度 ratify せよ。
--- 台帳が汚れていないか: 領域 status=pending  相=[specify=pending]

$ node graph/conclave.js ratify requirements --run <f>   (領域 status=blocked / 相は全て done)
EXIT=2
--- stderr ---
✗ cannot ratify requirements: domain is blocked — 領域が閉塞している。3 回の差し戻しを使い切った領域は自力で祝福できない。**人を呼べ**(教主の裁可が要る)。
  → 教主を呼べ。閉塞した領域は engine が自分で開けてはならない(第51条c)。
--- 台帳が汚れていないか: 領域 status=blocked  (blocked のままなら部分適用なし)

$ node graph/conclave.js ratify requirements --run <f>   (相は全て done / 領域 active)
EXIT=0
--- 領域 status=ratified  (ratified なら通った)

曲げた conclave: C:\Users\kikus\AppData\Local\Temp\jt_para6\graph\conclave.js
```

### 3.4 AC-3 の表との突合(四枝すべて一致)

| 枝 | AC-3 の要求 | 本相の実測 | 一致 |
|----|-----------|-----------|------|
| **(a) `--reject`** | 相が全て pending でも通る。関門に触れない | `-> 通った {"ok":true,"reworked":[...13 相...],"target":"requirements"}`、`specify=rework`、領域 `active` | ✓ |
| **(b) `rework` の相** | 拒む | `code=RATIFY_PHASES_NOT_DONE` / `specify=rework` / 領域 `pending` のまま | ✓ |
| **(c) `blocked` の相** | 拒む。文言が「人を呼べ」と読める | `code=RATIFY_PHASES_NOT_DONE` / `— blocked の相が在る(specify)。待っても直らない。**人を呼べ**。` / 「人を呼べ」を含むか: **true** | ✓ |
| **(c2) 領域そのものが `blocked`** | 拒む(R1 素朴版の穴) | `code=RATIFY_DOMAIN_BLOCKED` / `領域が閉塞している。3 回の差し戻しを…**人を呼べ**(教主の裁可が要る)。` / 領域 status は **`blocked` のまま化けない** | ✓ |
| **(対 / AC-2)** | 全て done なら通る | `-> 通った {"ok":true,"ratified":"requirements"} 領域 status -> ratified` | ✓ |

**CLI の実測**:

| 状況 | exit | 台帳の汚れ |
|------|------|-----------|
| 相が pending | **2** | 領域 `pending` / 相 `specify=pending` のまま(**部分適用なし** / NFR-9) |
| 領域が blocked | **2** | 領域 `blocked` のまま |
| 相が全て done | **0** | 領域 `ratified` |

> ⚠️ **拒んだときは `save(rp, run)` を呼ばない。** 本相の CLI パッチは `try` の中でだけ
> `ratify` を呼び、catch では `process.exit(2)` して保存に届かない形にしてある。
> これが NFR-9(部分適用しない)を CLI の側でも守る唯一の形である。

---

## 4. 【PARA-6 の副作用】既存 fixture の網羅的な走査 — 抜け道に寄りかかっていた門

### 4.1 静的な走査 — `tests/` の中で**祝福の枝の** `ratify` を呼ぶ 6 箇所

命令: `node reform/judgment-triad/_design_fixtures.js`(`--reject` の呼び出しは除外して数える)

```
═══ 1. tests/ の中で ratify を呼ぶ箇所(静的) ═══

  tests/paradise.test.js:747  conclave.ratify(run, 'discovery');
  tests/paradise.test.js:758  conclave.ratify(run, 'discovery');
  tests/paradise.test.js:774  conclave.ratify(run, card);
  tests/paradise.test.js:801  conclave.ratify(run, card);
  tests/paradise.test.js:844  if (r.phase === 'ratify') { conclave.ratify(run, r.cardinal); continue; }
  tests/paradise.test.js:7275  if (r.phase === 'ratify') { conclaveMod.ratify(run, r.cardinal); continue; }

  祝福の枝の ratify 呼び出し: 6 箇所(--reject は除く)
```

**`tests/` の他のファイルには一件も無い。** `ratify` は `tests/paradise.test.js` だけが呼ぶ。

### 4.2 6 箇所を一つずつ裁く — 危ういのは **L801 の一箇所だけ**

| # | 行 | 門の名 | 直前で done にしている相 | R1 の下で | 裁定 |
|---|----|-------|----------------------|----------|------|
| 1 | L747 | `ratify advances the conclave to the next cardinal` | `discover`(discovery の相は `discover` 一つ) | ✓ | 無害 |
| 2 | L758 | `domain-level reject triggers an INNER rework (the small circle)` | `discover` | ✓ | 無害 |
| 3 | L774 | `a review class can send work back ACROSS domains (the great circle)` | `['discover'] / ['specify'] / ['design','detail','identity','ux'] / ['build','tests']` — **architecture の四相が揃っている** | ✓ | 無害 |
| 4 | **L801** | **`cross-domain rework also resets DOWNSTREAM phases in later domains`** | `['discover'] / ['specify'] / ['design','detail','identity'] / ['build','tests']` — **`ux` を欠く** | **✗** | **直す(下記)** |
| 5 | L844 | `conclave: 中断→復帰→complete まで環が回りきる (第51条a)` | `next()` が `ratify` を返すのは相が全て done のときだけ(`conclave.js` L421-423)。ゆえに構造的に安全 | ✓ | 無害 |
| 6 | L7275 | `cartography: 環が最後まで回り、作図の結びに着く (第11条)` | 同上(`next()` 駆動) | ✓ | 無害 |

> **L844 / L7275 が安全な理由(構造):** `conclave.js` の `next()` は
> 「この領域の相が全て done か?→ ratify」という形で ratify 信号を出す(L421-423)。
> `next()` の返す `ratify` を受けて `ratify()` を呼ぶ限り、関門は必ず満たされている。
> **`next()` を経由しない直呼びだけが危うい。** それが 1〜4 である。

### 4.3 動的な走査 — R1 の下で新しく ✗ になる門は **1 本だけ**

`conclave` に触れる全ての `tests/*.test.js` を、対照群(素の conclave)と R1 入りの
両方で **一つずつ逐次に** 走らせた(NFR-1)。

```
═══ 2. R1 の下で ✗ になる門(動的 / 一つずつ逐次に走らせる)═══

  tests/abandoned-run.test.js            対照群 exit=0        R1 exit=0        新しい ✗ 0 本
  tests/counsel.test.js                  対照群 exit=0        R1 exit=0        新しい ✗ 0 本
  tests/dashboard-perf.test.js           対照群 exit=0        R1 exit=0        新しい ✗ 0 本
  tests/dashboard-run-panel.test.js      対照群 exit=0        R1 exit=0        新しい ✗ 0 本
  tests/dashboard-watch.test.js          対照群 exit=0        R1 exit=0        新しい ✗ 0 本
```

`tests/paradise.test.js` は**対照群と R1 版を単独で逐次に**走らせた(巨大で時間が掛かるため / NFR-1):

```
$ node reform/judgment-triad/_design_gate_conclave.js none tests/paradise.test.js          # 対照群

Paradise self-test: 471 passed, 0 failed
EXIT=0
```

```
$ node reform/judgment-triad/_design_gate_conclave.js "$LOCALAPPDATA/Temp/jt_para6/graph/conclave.js" tests/paradise.test.js   # R1 入り

  ✗ cross-domain rework also resets DOWNSTREAM phases in later domains
      cannot ratify architecture: 1 phase(s) not done: ux=pending — 済ませてから祝福せよ: node graph/conclave.js done <id> --run <f> --artifact <p>

Paradise self-test: 470 passed, 1 failed
EXIT=1
```

**対照群 471/0 → R1 版 470/1。差分はちょうど 1 本、L795 の fixture である。**

> ⚠️ **本相の計測器は `require.cache` 注入なので `.git` を写す必要がない。**
> ゆえに specify §2.2 が報告した「対照群でも `hermetic` 2 本 / `AC-12e` / `dashboard-count`
> の計 4 本が ✗」という汚染が**一件も起きていない** —— 対照群が **471 passed / 0 failed**
> という本物のリポジトリと同じ数を出したことがその証明である。
> **修理の相はこの作法を使え。リポジトリを丸ごと写す必要は無い。**

### 4.4 ★ L795 の fixture をどう直すか — **名指しの一箇所**

`tests/paradise.test.js` L795-802:

```js
test('cross-domain rework also resets DOWNSTREAM phases in later domains', () => {
  const run = makeConclave();
  for (const [phases, card] of [[['discover'], 'discovery'], [['specify'], 'requirements'],
                                [['design', 'detail', 'identity'], 'architecture'], [['build', 'tests'], 'construction']]) {
    conclave.markRunning(run, phases);
    for (const p of phases) doneT1(run, p, 'tests/paradise.test.js');
    conclave.ratify(run, card);
  }
```

**直す形 —— L798 の配列に `'ux'` を一語足す(それだけ)**:

```js
   for (const [phases, card] of [[['discover'], 'discovery'], [['specify'], 'requirements'],
-                                [['design', 'detail', 'identity'], 'architecture'], [['build', 'tests'], 'construction']]) {
+                                [['design', 'detail', 'identity', 'ux'], 'architecture'], [['build', 'tests'], 'construction']]) {
```

根拠:

1. **これは門を緩めていない。** この門が撃っているのは「cross-domain rework が下流の相を
   リセットするか」であって、「ux を done にせずに ratify できるか」ではない。
   `ux` を done にしても assert は一字も変わらず、撃つ的も変わらない。
2. **すぐ上の兄弟の門(L767)が既にそう書いている。** L771 は
   `['design', 'detail', 'identity', 'ux']` の四つを done にしており、R1 の下でも ✓ のままである。
   **同じ環を回す二つの門のうち、片方だけが四相を揃えていなかった** —— これが「偶然の寄りかかり」の姿である。
3. **第21条:** 門が偶然 PARA-6 の抜け道を使っていた形跡であって、門を緩めた形跡ではない。
   判定器を緩めるのではなく fixture を直すのが正しい。

> ⚠️ **建造相はこの一行を R1 と同じ commit に含めること。** 分けて commit すると、
> 中間の状態で CI が赤くなる(NFR-3 と同じ理屈)。

### 4.5 他に同型の fixture は無い(網羅の証明)

| 走査 | 対象 | 結果 |
|------|------|------|
| 静的 grep(`\.ratify\s*\(` かつ `reject: true` でない) | `tests/*.js` 全て | 6 箇所。**全て `tests/paradise.test.js`** |
| 6 箇所の個別の裁き(§4.2) | 6 箇所 | 危ういのは L801 の 1 箇所 |
| 動的(対照群 vs R1、`conclave` に触れる全門を逐次) | `tests/*.test.js` 6 本 + `paradise.test.js` | 新しい ✗ は **1 本**(L795 の門) |
| 既存 13 走行台帳 | `conclave.js audit` | **0/13 赤くなる**(requirements AC-4 の実測を踏襲) |

**三つの走査が同じ一箇所を指している。他に同型は無い。**

---

## 5. 新設する門の骨格 — 何を assert するか(一行ずつ)

### 5.1 `tests/ratify-guard.test.js`(R4 / AC-1・AC-2・AC-3)

**門は 9 本。** 各行が一つの `test(...)` に対応する。

| # | 門の名(案) | 何を撃つか | 対応する AC |
|---|-----------|-----------|-----------|
| G-1 | `ratify: 相が pending の領域は祝福できない (AC-1)` | `assert.throws(() => conclave.ratify(run,'requirements'), /not done/)`、`err.code === 'RATIFY_PHASES_NOT_DONE'` | AC-1 |
| G-2 | `ratify: 拒んだとき領域の印は一つも動かない (NFR-9)` | throw の後 `assert.strictEqual(d.status, 'pending')` かつ 相の status が呼び出し前と `deepStrictEqual` | AC-1 / NFR-9 |
| G-3 | `ratify: 相が全て done なら通る — 常に拒む実装では緑にならない (AC-2)` | `assert.strictEqual(conclave.ratify(run,'requirements').ok, true)` かつ `d.status === 'ratified'` | **AC-2(対の片割れ)** |
| G-4 | `ratify: --reject は相が全て pending でも通る (AC-3(a) / 第14条)` | 相を一つも done にせず `ratify(run,'requirements',{reject:true,from:'specify'})` が `ok:true` を返し、`specify` が `rework` に落ちる | AC-3(a) / R-1 |
| G-5 | `ratify: rework の相を握りつぶさない (AC-3(b))` | 一相だけ `rework` にして throw、`err.message` が `specify=rework` を含む | AC-3(b) |
| G-6 | `ratify: blocked の相は「待てば直る」ではない — 人を呼べと言う (AC-3(c))` | 一相を `blocked` にして throw、`assert.match(err.message, /人を呼べ/)` | AC-3(c) / NFR-6 |
| G-7 | `ratify: 閉塞した領域は自力で祝福できない (AC-3(c2) / 第51条c)` | 相を全て done にしたうえで `d.status='blocked'`、`err.code === 'RATIFY_DOMAIN_BLOCKED'`、`assert.match(err.message, /人を呼べ/)`、`d.status` が `blocked` のまま | AC-3(c2) / R-4 |
| G-8 | `ratify: 拒否の文言は次の一手を含む (NFR-6)` | `err.message` が `conclave.js done` と、未了の相の `id=status` を全て含む | NFR-6 |
| G-9 | `ratify: CLI は exit 2 で落ち、台帳を汚さない` | `execFileSync(node, [conclave.js,'ratify',...])` が `status===2`、stderr が `✗ cannot ratify` を含み、**走行帳ファイルの中身が呼び出し前と一致する**(sha256 で比較) | AC-1 / NFR-9 |

> **G-3 と G-1/G-5/G-6/G-7 が「対」である**(AC-2)。片方だけなら
> 「常に throw する」実装でも緑になる —— 第21条「壊して鳴らす」の要求はこの対が満たす。
> **G-4 は逆向きの対**: 関門を `--reject` にも掛けてしまう誤実装をこの門だけが捕らえる。

### 5.2 `tests/route-debt.test.js`(AC-7 / xfail 方式)

**門は 5 本。**

| # | 門の名(案) | 何を撃つか |
|---|-----------|-----------|
| D-1 | `PARA-10 [残債]: 一門の家系図…は今なお reform へ落ちる` | `assert.strictEqual(forge.chooseScale('一門の家系図を作れるアプリが欲しい'), 'reform', 'PARA-10 が直ったなら debt.md から外し、FLOOR を上げて本コーパスへ昇格させよ')` |
| D-2 | `PARA-11 [残債]: 相関図を描けるアプリ…は今なお cartography へ落ちる` | `assert.strictEqual(forge.chooseScale('相関図を描けるアプリを作って'), 'cartography', '同上')` |
| D-3 | `[残債] 原因が消えていないことを名指しで確かめる` | `assert.match(('一門の家系図…'.match(forge.REFORM_RE)||[])[0] || '', /^門$/)` と `assert.strictEqual(forge.PRODUCT_FALSE_FRIENDS.test('相関図を描けるアプリを作って'), true)` —— **症状ではなく原因を凍らせる**(第58条の作法) |
| D-4 | `[門番] debt.md が実在し、2 件を名指しで載せている` | `reform/judgment-triad/debt.md` を読み、`PARA-10` `PARA-11` と 2 件の願い文が**そのまま**在ること。黙って消せない形にする(第16条) |
| D-5 | `[門番] debt.md の願いは、この門が撃っている願いと一字一句同じ` | `debt.md` から抽出した願い文の集合 == この門の `DEBT` 配列。**帳と門がずれたら鳴る**(第22条: 数も文も測定から取る) |

> **これは門を緩めていない。** 誤った振る舞いを「誤りである」と名指しして凍らせている。
> 誰かが PARA-10/PARA-11 を直した瞬間に D-1〜D-3 が赤くなり、
> 「残債が払われたので `debt.md` から外し、`tests/route-matrix.test.js` の
> コーパスへ昇格させ、FLOOR を上げよ」と教える。**赤くなることがこの門の仕事である。**

### 5.3 `tests/route-matrix.test.js` への追記(AC-6 / 新設ではない)

| 操作 | 内容 |
|------|------|
| コーパスに足す(standard) | `レシピサイトの並び替えを実装して` / `サイトの検索機能を実装して` / `通販サイトのクーポン計算を作る` / `add a sort option to the recipe site` / `implement pagination for the site listing` / `組織図を編集できるツールを作る` / `系統図を出力するコマンドを実装して` — **7 件** |
| コーパスに足す(full) | `ECサイトを作れ` / `社内ポータルサイトを作れ` / `予約サイトを作りたい` / `コーポレートサイトが欲しい` / `通販サイトを構築して` / `ニュースポータルのウェブサイトが欲しい` / `build an e-commerce site` / `家系図を作れるアプリが欲しい` — **8 件** |
| **L336 の FLOOR を書き換える** | `standard: 9 → 16`、`full: 8 → 16`。他の四道は据置(`counsel: 42, cartography: 9, reform: 11, quick: 8`) |
| L344 の総数の下限 | `CORPUS.length >= 87` → `>= 102`(87 + 15) |

> ⚠️ **FLOOR は手で書く。** 門番 `W-1` が守るのは「減らさないこと」だけなので、
> 的を足しても FLOOR を上げなければ鳴らない。**書き忘れが AC-6 の不履行である**
> (requirements §4.2 が「レビューが目で確かめる唯一の項目」と名指ししている)。

#### ★ AC-6 を写しで実測した(数は推定ではない)

現コーパスの実測(`tests/route-matrix.test.js` の `w('...')` を数えた):

```
現コーパス: {"counsel":42,"cartography":9,"reform":11,"quick":8,"standard":9,"full":8}
総数: 87
```

的 15 件を足し、FLOOR を上げた写しを、D5+C2a の forge に向けて撃った:

```
$ node reform/judgment-triad/_design_ac6.js

ROOT の定義を固定: const ROOT = path.join(__dirname, '..');  ->  const ROOT = <本物の根>;
曲げた門: C:\Users\kikus\AppData\Local\Temp\jt_design\route-matrix.AC6.test.js
FLOOR: standard 9→16 / full 8→16、総数の下限 87→102

══ 曲げた route-matrix.test.js(的 +15 / FLOOR 上げ)× D5+C2a の forge  exit=0 ══
═══ 6 道 × 6 道 混同行列 (第61条) ═══

正解\実際           counse  cartog  reform   quick  standa    full     計
────────────────────────────────────────────────────────────────────
counsel             42       0       0       0       0       0      42
cartography          0       9       0       0       0       0       9
reform               0       0      11       0       0       0      11
quick                0       0       0       8       0       0       8
standard             0       0       0       0      16       0      16
full                 0       0       0       0       0      16      16

  ✓ M-0: コーパスは 6 道すべてを最低 8 件ずつ持つ — 片枝のコーパスは片枝しか守らない
  ✓ M-1: 願いはすべて 6 道のいずれかへ着く — 未知の道は無い
  ✓ M-2 [対角]: 対角線の合計がコーパスの件数と等しい — 全件が正しい道へ着く
  ✓ M-3 [非対角]: 非対角の**各セル**が 0 — どの道も他の道を奪っていない
  ✓ M-4 [R-1 名指し]: counsel → standard / reform のセルが 0 — 熟議の願いが道を失わない
  ✓ M-5 [欠陥A 名指し]: reform → counsel のセルが 0 — 楽園の改修が諐問へ攫われない
  ✓ M-6 [格子150]: 熟議 × 建造動詞 150 通りがすべて counsel へ着く
  ✓ M-7 [対照30]: 同じ語の命令形 30 通りは counsel へ着かない
  ✓ M-8: 6 道はすべて forge.SCALES に実在する — 行列の軸が架空でない
  ✓ W-1 [門番]: コーパスは宣言された下限を保つ — 一行落とせば鳴る
  ✓ W-2 [門番]: 格子は 3 × 10 × 5 = 150 通りを保つ — 配列を空にすれば鳴る
  ✓ W-3 [門番]: 非対角 assert が実物の値を撃っている — 定数同士の比較に化けていない
  ✓ W-4 [門番]: 熟議語彙の**各語**につき、その語だけが標識の願いが在る

Route matrix self-test: 13 passed, 0 failed
```

**既存門のコーパス 87 → 102 件、`standard` 9 → 16、`full` 8 → 16、13 門すべて ✓。**
`counsel` 42 / `cartography` 9 / `reform` 11 / `quick` 8 は**一件も動いていない** ——
的を足しても他の四道を奪っていないことの実測である(第61条)。

> ⚠️ 建造相への註: 足す 15 件のうち **`家系図を作れるアプリが欲しい` は `full`** である
> (`一門の`が付く方は残債 PARA-10 なので**足さない**)。二つを取り違えると門が赤くなる。

---

## 6. 結線先 — 実ファイルの行番号で示す

### 6.1 `.github/workflows/tribunal.yml`

既存の該当箇所(実ファイルより):

```
   167      - name: 🏛️ Counsel — 諐問の道と階層の実体 (第25条 / 第32条 / 第37条)
   168        run: node tests/counsel.test.js
   169
   170      - name: 🧭 Route matrix — 6 道 × 6 道の混同行列 (第61条)
   ...
   176        run: node tests/route-matrix.test.js
   177
   178      - name: 📤 Lesson export — 刻んだ教訓が門に届いているか (第61条 / 盲点②)
```

**足す位置: L176 と L178 の間(= L177 の空行の後)に二段。** 理由 —— 第154-160 行の註が
「孤児だった門」の区画を宣言しており、道選び/環の裁きの門はこの区画に並べるのが筋である。

```yaml
      - name: 🧭 Route matrix — 6 道 × 6 道の混同行列 (第61条)
        ...
        run: node tests/route-matrix.test.js

+     - name: 💳 Route debt — 未払いの誤着が黙って直っていないか (AC-7 / 第16条)
+       # **これは xfail の門である。** PARA-10/PARA-11 は本走行で直さないと裁定した
+       # (requirements §3.4)。黙って外せば緩めたことになるので、**誤った振る舞いを
+       # 誤りのまま凍らせる**。誰かが直した日にこの門が赤くなり、
+       # 「debt.md から外して本コーパスへ昇格させよ」と教える。
+       run: node tests/route-debt.test.js
+
+     - name: ⚖️ Ratify guard — 仕事をせずに祝福できないか (PARA-6 / 第37条)
+       # 旧実装は 17 相すべて pending・成果物 0 件のまま `domains ratified: 6/6` を
+       # 成立させ、`conclave.js audit` はそれを `closed` として ✓ で通していた。
+       # **数える対象そのものが偽造可能だった。** 四つの枝(reject / rework /
+       # blocked の相 / blocked の領域)を対で撃つ —— 片枝だけなら
+       # 「常に拒む」実装でも緑になる(第21条 壊して鳴らす)。
+       run: node tests/ratify-guard.test.js

      - name: 📤 Lesson export — 刻んだ教訓が門に届いているか (第61条 / 盲点②)
```

### 6.2 `tests/paradise.test.js` からは**呼ばない**

**裁定: CI(`tribunal.yml`)だけに結線する。** 理由:

1. `graph/wiring.js check` は「CI か `paradise.test.js` のどちらか」で足りる(AC-9)。
2. `paradise.test.js` から子プロセスで呼べば、471 門の走行時間に二本分が加算される。
   既存の `counsel.test.js` / `route-matrix.test.js` も **CI だけ**に結線されている
   (L167-176)—— **同じ作法に従う**のが筋である(第44条の区画の註 L154-160)。
3. `paradise.test.js` に `require` で取り込む形は取らない。門はそれぞれ独立に
   exit code を返す単位でなければ、絞り込み走行(gate-filter)が数を閉じられない。

**AC-9 の裏取り**: 結線後に `node graph/wiring.js check` が
`✓ 門 23 本すべてに走らせる者が居る (第44条)` を出すこと(基準線 21 本 + 2 本)。
**21 のままなら結線されていない。**

---

## 7. 建造相への実装手順 — どのファイルをどの順で、何を同じ commit に

### 7.1 commit の分け方(3 つ。これ以上分けない)

NFR-3「判定器とコーパスと FLOOR は同じ commit で動かす」が拘束である。
**中間状態で CI が赤くなる分け方を禁じる。**

#### commit ①「PARA-6: ratify に関門を置く」

| 順 | ファイル | 何を |
|----|---------|------|
| 1 | `graph/conclave.js` | `ratify()` の `if (!opts.reject) {` の直後に関門 30 行(§3.1) |
| 2 | `graph/conclave.js` | CLI の `ratify` 段(L822-823)を try/catch + exit 2 に(§3.2) |
| 3 | `tests/paradise.test.js` | **L798 の配列に `'ux'` を足す**(§4.4)—— ①と分けたら CI が赤くなる |
| 4 | `tests/ratify-guard.test.js` | **新設**。門 9 本(§5.1) |
| 5 | `.github/workflows/tribunal.yml` | `⚖️ Ratify guard` の段を L176 の後に(§6.1) |

**①の後に走らせる(一つずつ / NFR-1)**:
`node tests/ratify-guard.test.js` → `node tests/paradise.test.js`(471 passed, 0 failed)
→ `node graph/wiring.js check`(門 22 本)→ `node graph/conclave.js audit`(0/0/全 13)

#### commit ②「PARA-7/PARA-9: 道選びを直し、的と FLOOR を同時に上げる」

| 順 | ファイル | 何を |
|----|---------|------|
| 1 | `graph/forge.js` | `isCartography()` に C2a の 1 行(§2.5-(1)) |
| 2 | `graph/forge.js` | `chooseScale()` の `full` の段の**後**に D5 の一段(§2.5-(2))。**`fullJa`/`fullEn` は触らない** |
| 3 | `tests/route-matrix.test.js` | コーパスに 15 件(standard 7 / full 8)を足す(§5.3) |
| 4 | `tests/route-matrix.test.js` | **L336 の FLOOR** を `standard: 16, full: 16` に、L344 の総数下限を `102` に |

**この 4 つは必ず同じ commit である。** 判定器だけを入れれば行列が変わって既存門が
赤くなりうるし、コーパスだけを入れれば新しい的が誤着して赤くなる。
`git show --stat` に `graph/forge.js` と `tests/route-matrix.test.js` が**同時に**載ること(NFR-3)。

**②の後に走らせる**: `node tests/route-matrix.test.js`(exit 0)
→ `node tests/counsel.test.js`(210 passed, 0 failed)→ `node tests/paradise.test.js`

#### commit ③「残債を名前付きで凍らせる」

| 順 | ファイル | 何を |
|----|---------|------|
| 1 | `reform/judgment-triad/debt.md` | **新設**。PARA-10 / PARA-11 を requirements §3.4 の表の形で(札・願い・現状の道・正解・原因) |
| 2 | `tests/route-debt.test.js` | **新設**。門 5 本(§5.2) |
| 3 | `.github/workflows/tribunal.yml` | `💳 Route debt` の段を(§6.1) |

**③は②の後でなければならない。** ②を入れる前は `一門の家系図…` が `cartography` に居るので、
D-1 の `reform` の assert が落ちる(C2a が入って初めて `reform` へ移る — findings 5.5)。

### 7.2 最後に(commit を跨がない後片付け)

```
$ node graph/census.js fix          # README の数は測定から書く(AC-11 / 第22条)
$ git diff README.md                # 数の行だけが変わっていることを目で確かめる
```

**手で 471 や 451 を書き込まないこと。** 門が 2 本増えるので総数は変わる。

### 7.3 最終判定 — AC-10 の 5 本を**本物のリポジトリで一つずつ**

| # | 命令 | 要求する末尾 |
|---|------|-------------|
| 1 | `node tests/paradise.test.js` | `Paradise self-test: N passed, 0 failed`(**N ≥ 471**) |
| 2 | `node tests/route-matrix.test.js` | `Route matrix self-test: N passed, 0 failed` |
| 3 | `node tests/counsel.test.js` | `Counsel self-test: 210 passed, 0 failed` |
| 4 | `node graph/wiring.js check` | `✓ 門 23 本すべてに走らせる者が居る (第44条)` |
| 5 | `node graph/conclave.js audit` | `見捨てられた走行: 0 / 判定不能: 0 / 全 13` |

加えて**新設 2 門**: `node tests/ratify-guard.test.js`(exit 0)/ `node tests/route-debt.test.js`(exit 0)。

> **同時並行で走らせるな**(NFR-1 / findings §6.2 / 本書 §1.1)。
> **写しの数を最終判定に使うな**(NFR-2)。

---

## 8. 回帰の守り — requirements §6 の R-1〜R-13 に本相の実測を突き合わせる

| # | 守るもの | 本相の実測 | 状態 |
|---|---------|-----------|------|
| R-1 | `--reject` による上流への差し戻し | §3.3 (a): 相が全て pending でも `ok:true`、`specify=rework` | ✓ 守れた |
| R-2 | 中断からの復帰(第51条 `resume`) | §4.3: `conclave: 中断→復帰→complete まで環が回りきる` は R1 の下で ✓ | ✓ |
| R-3 | 環が `complete` に到達する | §4.3: `conclave completes when all domains are ratified` / L844 の門ともに ✓ | ✓ |
| R-4 | `MAX_DOMAIN_REWORK` の閉塞機構 | §3.3 (c2): `RATIFY_DOMAIN_BLOCKED` で拒み、status が化けない | ✓(R1 素朴版の穴を塞いだ) |
| R-5 | L795 の fixture | §4.4: `'ux'` を一語足す。**R1 の下で ✗ になる唯一の門** | 手当て済み |
| R-6 | cartography の道 15 件 | §2.3 B0: `cartography` 行 15/15。C2 は採らない(AC-8) | ✓ |
| R-7 | standard の部分機能 | §2.4 D5: 5 件すべて standard。耐久の枝B も 8/8 | ✓ |
| R-8 | quick の道 15 件 | §2.4 の全候補で `quick` 行 15/15。D5 の段は `quick` より**後** | ✓ |
| R-9 | counsel の道 42 件 | §2.4 D5: `node tests/counsel.test.js` → `210 passed, 0 failed` | ✓ |
| R-10 | reform の道 15 件 | §2.4 D5: `reform` 行 15/15。PARA-10 に触らない | ✓ |
| R-11 | 門の孤児検査(第44条) | §6.1 で 2 門を CI に結線。`wiring.js check` が 21 → 23 | 建造相で裏取り |
| R-12 | README の門の本数(第22条) | §7.2: `census.js fix` に書かせる | 建造相で裏取り |
| R-13 | `conclave.js audit` の 13 台帳 | R1 は `runAbandonment()` を触らない。requirements AC-4 が 0/13 を実測済み | ✓ |

### 8.1 本相が新たに見つけた危険(requirements に無かったもの)

| 札 | 何 | 誰が捕らえたか |
|----|----|--------------|
| **新-1** | **打ち消しの印を `full` の段より上流に置くと、既存門の `full` の願いを奪う。** 「読書記録のプラット**フォーム**」の「フォーム」が部分機能の印に当たった(D3 / 実測 route-matrix exit 1) | §2.3 の D3 |
| **新-2** | **「graph/ だけを写して門を走らせる」計測は偽の ✗ 5 本を出す。** 門は `__dirname` から `ROOT` を計算し、写し先に `overlay/` が無い | §1.1 |
| **新-3** | **D5g(打ち消しを重ねた形)の打ち消しは 32 件の的すべてで一度も発火しない。** 発火しない規則は将来「これが守っている」と誤読される | §2.4 |

---

### 8.2 ★ 最終の裏取り — design.md に貼ったパッチ文が、そのまま 101/101 を出すか

**本書の §2.5 のパッチの形を一字一句そのまま**写しに当てて撃った。
「設計書に書いた形」と「実測した形」が乖離していないことの門である。

```
$ node reform/judgment-triad/_design_final.js

fullJa を触っていないか: true
fullEn を触っていないか: true
曲げた forge: C:\Users\kikus\AppData\Local\Temp\jt_design\forge.FINAL.js

══ reform/judgment-triad/_design_matrix.js  exit=0 ══
═══ 6 道 × 6 道 混同行列 (101 件) ═══

正解\実際               counse      cartog      reform       quick      standa        full     計
────────────────────────────────────────────────────────────────────────────────────────────
counsel                 18           0           0           0           0           0      18
cartography              0          15           0           0           0           0      15
reform                   0           0          15           0           0           0      15
quick                    0           0           0          15           0           0      15
standard                 0           0           0           0          22           0      22
full                     0           0           0           0           0          16      16

対角の合計: 101 / 101  (誤着 0 件)

═══ 非ゼロの非対角セル ═══
  (無し — 全セル 0)

非ゼロの非対角セル数: 0 / 30
判定: 合格 (対角 101/101 かつ 非対角 0)

══ tests/route-matrix.test.js  exit=0 ══
  Route matrix self-test: 13 passed, 0 failed

══ tests/counsel.test.js  exit=0 ══
  Counsel self-test: 210 passed, 0 failed
```

`fullJa を触っていないか: true` / `fullEn を触っていないか: true` —— **語彙の表を一語も増やしていない。**
第60条「弱い印は表を足しても強くならない。除去が正解でありうる」の、
**表を足さずに解いた**実例である。

---

## 9. 本相が何も壊していないことの確認

```
$ git branch --show-current
reform/judgment-triad

$ git status --porcelain
?? reform/judgment-triad/

$ git diff --stat HEAD -- graph/ tests/
(空)
```

**追跡下のファイルの変更は 0 件。`graph/` と `tests/` は一行も変わっていない。**
本相の全ての実測は `$LOCALAPPDATA/Temp/{jt_design,jt_para6}` に写した複製、
または `require.cache` 注入(本物のファイルは読むだけ)で行った。何も commit していない。

---

## 10. 本相の走らせた命令の一覧(再現の手順)

```
# PARA-7 / PARA-9 の行列
node reform/judgment-triad/_design_matrix.js                      # 基準線 91/101
node reform/judgment-triad/_design_para7b.js                      # B0 / C1 / D1 / D2 / D3 / D4
node reform/judgment-triad/_design_para7b.js D5 D5g               # D5 / D5g
node reform/judgment-triad/_design_stress.js                      # 耐久 16 件(コーパス外)

# 計測器の健全性(対照群)
node reform/judgment-triad/_design_gate.js none tests/counsel.test.js      # 210 passed, 0 failed

# PARA-6 の四枝と CLI
node reform/judgment-triad/_design_para6.js

# 設計書に貼ったパッチ文そのままの裏取り / AC-6 の裏取り
node reform/judgment-triad/_design_final.js
node reform/judgment-triad/_design_ac6.js

# fixture の網羅的な走査
node reform/judgment-triad/_design_fixtures.js
node reform/judgment-triad/_design_gate_conclave.js "$LOCALAPPDATA/Temp/jt_para6/graph/conclave.js" tests/paradise.test.js
node reform/judgment-triad/_design_gate_conclave.js none tests/paradise.test.js
```
