# 楽園 — 弱い印の二病(PARA-10 / PARA-11)修理の設計書 (reform/weak-signs / design 相)

- 走行日: 2026-09-17
- 枝: `reform/weak-signs`
- 作業根: `C:/Users/kikus/Documents/workspace/paradise`
- 前相の記録: `reform/weak-signs/requirements.md`(844 行 / 拘束は **AC-1〜AC-14**)、`reform/weak-signs/findings.md`(729 行)
- 見本: `reform/judgment-triad/design.md`(前走行の設計書)
- 掟: **本書の全ての数は、本相が自ら走らせた命令の生出力を添える。** 推定値を一つも書かない。
- 本相は実装しない。`graph/` も `tests/` も一行も変えていない(第10節の `git status`)。

## 0. 本書が答える問い

requirements.md は「X4″ を採れ」と裁定したが、**X4″ の具体的な字面を確定していない。**
本書はそれを確定させ、写しの上で実測して証明する。答える問いは五つ:

1. **R2 / R3 / P3 の三部品は、それぞれどの行をどう書き換えるのか**(パッチ全文)
2. 三部品を**単独で**当てたとき / **併用で**当てたとき、受け入れ帳 140 件はどう動くか
3. **既存門は何本赤くなるか。それぞれ「正しい赤」か「回帰」か**
4. 新設 2 門は何を assert するか / どこに結線するか / 射程帳 32 件はどこに書くか
5. 建造相は**どのファイルをどの順で、同じ commit に何を入れて**直すか

---

## 1. 本相が足した計測器

**本物の `graph/` `tests/` は一行も書き換えていない。** 全ての測定は `require.cache` 注入
(`_cand_gate.js` / discover 相から流用)と `$LOCALAPPDATA/Temp/ws_cand/` の写しの上で行った(NFR-10)。

| 計測器 | 何をするか | 出力 |
|--------|-----------|------|
| `_design_patch.js` | **建造相がそのまま貼る文字列**で 8 つの写しを組む。置換の的が本物の `forge.js` に**一箇所しか無い**ことを機械で確かめ、写しが構文として読めることをその場で検める | 標準出力 / `--emit <名>` でパッチ後の全文 |
| `_design_measure.js` | 8 つの写しを **単独で / 併用で** 測る。受け入れ帳・射程帳・種M・AC-45・counsel:652・既存門 4 本・耐久 48 件 | `_design_measure_out.txt` |
| `_design_paradise.js` | `tests/paradise.test.js`(約 6 分)を **対照群と X4″ で逐次に**走らせ、✗ の差分を取る | `_design_paradise_out.txt` |
| `_design_gates.js` | 新設 2 門の**骨格を実際に書いて写しの上で走らせる**(assert が通ることを字で確かめる) | `_design_gates_out.txt` |

discover / specify 相の計測器(`_cand.js` / `_cand_stress.js` / `_spec_x4pp.js` / `_spec_ledger.js`)は
**流用した** —— `_design_measure.js` は `_cand_stress.js` を子プロセスで呼び、
`_spec_corpus.json` / `_spec_reach.json`(172 件 / 32 件)をそのまま読む。

> ⚠️ **discover 相の置換と本相の置換は別物である。**
> `_cand.js` の R2/R3/P3 は「候補を比べる」ための粗い置換であり、註も持たない。
> 本書のパッチは**判定器に残る字**である。ゆえに `_design_patch.js` で組み直し、
> 註(なぜこの形か / 何をしてはならないか)を本文に含めた。

### 1.1 【本相の失敗と是正】`paradise.test.js` は require.cache 注入では測れない

**初版の `_design_paradise.js` は一度も走っていなかった。** 生出力:

```
Paradise gate-filter: unknown flag none
── 対照群 (main そのもの) ──  exit=2  (0.0s)
   (集計行なし)
   ✗ の行数: 0
新しく ✗ になった門: 0 本
```

**471 門が 0.0 秒で終わるはずがない。** 原因は二つ在り、どちらも設計の誤りである:

1. `tests/paradise.test.js` は先頭の gate-filter が `process.argv` を**厳格に**読み、
   知らない引数を `exit 2` で撥ねる(`forge.js:27-42`)。`_cand_gate.js` が渡す
   「曲げた forge のパス」が未知のフラグになった。
2. **より深い理由**: `paradise.test.js` は `child_process` を **85 箇所**で使う。
   子プロセスは親の `require.cache` を継がず、**本物の `graph/forge.js` を読む**。
   ゆえにこの門だけは cache 注入では原理的に測れない。

> **「✗ 0 本」を「衝撃なし」と読むのは第37条(不在は通過ではない)違反である。**
> 両群とも一本も走っていないから 0 だっただけである。

**是正**: `_design_paradise.js` を作り直し、**リポジトリを `.git` ごと二つ写して**
(対照群 / 試験群)、試験群の写しの `graph/forge.js` だけを実ファイルとして差し替える形にした。
さらに**走行の健全性を機械で判定する**三条件を入れ、満たさなければ測定失敗として `exit 3` で落ちる:

- (a) 末尾に `Paradise self-test: N passed, M failed` の集計行が在ること
- (b) `N + M ≥ 471`(findings §1 の基準線)
- (c) 所要時間 > 60 秒(471 門が一瞬で終わることは無い)

**差し替えが効いていることも起動前に確かめる** —— 対照群の `forge.js` に
`REFORM_FALSE_FRIENDS` が**無い**こと、試験群に**在る**ことを assert し、
どちらかが違えば測定を中止する。

| 門 | `child_process` の使用箇所 | cache 注入で測れるか |
|----|--------------------------|---------------------|
| `tests/route-matrix.test.js` | 0 | ✅ 測れる |
| `tests/counsel.test.js` | 0 | ✅ 測れる |
| `tests/route-debt.test.js` | 0 | ✅ 測れる |
| `tests/ratify-guard.test.js` | 3 | ⚠️ 測れるが子は本物を読む(本走行の的は親側なので可) |
| **`tests/paradise.test.js`** | **85** | ❌ **写しのリポジトリが要る** |

新設 2 門も**写しのリポジトリ**で測った(`_design_gates.js`)——
両門とも `path.join(__dirname,'..')` で ROOT を計算し、`reach.md` や
`tests/route-matrix.test.js` を**実ファイルとして読む**からである。

---

## 2. 【最優先】X4″ のパッチ全文

**X4″ = R2(語境界 `\b`)+ R3(紛れ語表 21 語)+ P3(削ってから探す)+ EX(export)。**
下の差分は `node reform/weak-signs/_design_patch.js --emit X4PP` が出す全文から取った
(`_design_patch_diff.txt` に `git diff --no-index` の生出力が在る)。
**建造相はこの字をそのまま `graph/forge.js` に貼れ。**

置換の的が本物の `forge.js` に**一箇所しか無い**ことは機械で確かめてある:

```bash
$ node reform/weak-signs/_design_patch.js
B0     原文と異なる=— 対照  行数 819  OK  ...\ws_cand\forge.D_B0.js
R2     原文と異なる=YES  行数 839  OK  ...\ws_cand\forge.D_R2.js
R3     原文と異なる=YES  行数 851  OK  ...\ws_cand\forge.D_R3.js
P3     原文と異なる=YES  行数 841  OK  ...\ws_cand\forge.D_P3.js
R2R3   原文と異なる=YES  行数 871  OK  ...\ws_cand\forge.D_R2R3.js
R2P3   原文と異なる=YES  行数 861  OK  ...\ws_cand\forge.D_R2P3.js
R3P3   原文と異なる=YES  行数 873  OK  ...\ws_cand\forge.D_R3P3.js
X4PP   原文と異なる=YES  行数 893  OK  ...\ws_cand\forge.D_X4PP.js
```

(`OK` = 写しが JS として `_compile` を通った。当て損ねを緑にしない。)

全体の規模: **`+83 行 / -9 行`**、触る箇所は **5 か所**(`@@ -348` / `-361` / `-510` / `-595` / `-815`)。
判定の**順序は一段も動かさない**。

---

### 2.1 R2 — 英語の印に `\b` を付ける(`forge.js:351`)

**裁定: `REFORM_RE` を日英の別定数に割る。一つの式で済ませない。**

理由は三つ、いずれも実測または既存の作法である:

**(1) `counsel.test.js:652` は表の中身を撃つが、`\b` では鳴らない。**
同門は 20 語について `forge.REFORM_RE.test(w)` が真であることだけを要求する。
`\b(?:gate)\b` でも `REFORM_RE.test('gate')` は**真**である(語全体だから)。
実測(`_design_measure.js` の ④ / X4″):

```
counsel.test.js:652 — 落ちた語: 0 語(過不足なし) / 入り込んだ固有名: 0 語 / 台帳系: 0 件
```

**20 語のどれ一つ落ちていない。** ゆえに AC-10(652 行を**無改変で**通す)は満たされる。
鳴るのは「表から語を**抜く**」形(R1 / R4 / R5)だけである。
`_design_measure.js` は R2 を**単独で**当てた形でも同じ行を出しており、
「割ったこと自体」では鳴らないことを確かめてある。

**(2) 日英を別の定数に割る形は、このファイルで既に三度確立されている**
(`BUILD_JA`/`BUILD_EN`:444-447、`COUNSEL_JA`/`COUNSEL_EN`:376-377、`DIAGRAM_JA`/`DIAGRAM_EN`:574-576)。
一つの式に混ぜれば「日本語の語に `\b` を付け忘れた/付けてしまった」が読めない。
**割る形は、日本語に境界を課さないことを字で示す。**

**(3) `REFORM_FALSE_FRIENDS`(R3)は `REFORM_EN` の鏡である。** 註がそう書ける形でなければ、
なぜ日本語だけ表が要るのかが後の者に伝わらない(第60条(b) の両枝を字で示す)。

```diff
@@ -348,7 +348,50 @@ function denude(wish) {
  * ⚠️ **ここに在る抽象名は一語も減らしてはならない**(楽園/門/憲法/engine…)。
  *    これらは楽園以外を指さないので**無条件**で真でよい。
  */
-const REFORM_RE = /(楽園|paradise|ハーネス|harness|憲法|constitution|engine|エンジン|門|gate|パイプライン|pipeline|自己改善|self-improve|オーケストレーション|orchestration|枢機卿|cardinal|神官|priest)/i;
+/**
+ * ★ PARA-10 (reform/weak-signs / R2): **語境界を二枝で持つ**(第60条(b))。
+ *
+ * 旧実装は日英を一つの選択肢の並びに混ぜ、英語にも境界を課していなかった ——
+ * `gateway` の中の `gate` / `engineering` の中の `engine` /
+ * `delegate` `aggregate` `navigate` の中の `gate` / `priesthood` の中の `priest` /
+ * `self-improvement` の中の `self-improve` が当たり、世間の願いが改革の道へ攫われた。
+ *
+ * ⚠️ **日本語に `\b` を使ってはならない**(COUNSEL_JA / BUILD_JA の註と同じ理由 ——
+ *    日本語は全て非単語構成文字として扱われるので、境界は事実上決して一致しない)。
+ *    日本語側の語境界は `REFORM_FALSE_FRIENDS`(下)が代用する。
+ *    **日英を別の定数に割る形は L-3 で確立済みである**(`BUILD_JA` / `BUILD_EN` / `BUILD_RE`、
+ *    `COUNSEL_JA` / `COUNSEL_EN`、`DIAGRAM_JA` / `DIAGRAM_EN`)。同じ作法に揃えた。
+ *
+ * ⚠️ **語は一語も増減していない。** `tests/counsel.test.js:652` が 20 語を直に
+ *    撃っており(AC-10)、`REFORM_RE.test('門')` / `.test('gate')` は今も真である。
+ *    直したのは**当たり方**であって表ではない。
+ */
+const REFORM_JA = '楽園|ハーネス|憲法|エンジン|門|パイプライン|自己改善|オーケストレーション|枢機卿|神官';
+const REFORM_EN = '\\b(?:paradise|harness|constitution|engine|gate|pipeline|self-improve|orchestration|cardinal|priest)\\b';
+const REFORM_RE = new RegExp(`${REFORM_JA}|${REFORM_EN}`, 'i');
```

> ⚠️ **旧実装の捕獲群 `(…)` を捨てている。** `tests/route-debt.test.js` の D-3 が
> `wish.match(forge.REFORM_RE)[0]` を読むが、`[0]` は群の有無によらず「一致した文字列全体」である。
> よって捕獲群は要らない。**なお D-3 自体は本走行で消える**(第6節 / AC-11)。

---

### 2.2 R3 — `REFORM_FALSE_FRIENDS`(「門」の複合語 21 語)と `isReformSubject`

**表は 21 語ちょうど、全項が「門」を含み、全項が 4 字以下である。**
21 語 = requirements §1.2 群 (a) の 20 語 + `門人`(耐久 枝B が名指しした唯一の穴 / §1.5)。

第一の差分(表の新設 / `REFORM_RE` の直後、`isReformSubject` の註の直前に置く):

```diff
+/**
+ * ★ PARA-10 (reform/weak-signs / R3): 弱い印「門」の**紛れ語**。
+ *
+ * これは `REFORM_EN` の `\b` に対応する**日本語側の語境界**である ——
+ * 日本語に単語境界が無いので、「門」がより長い語の一部として当たる形を
+ * 語で数え上げるほか無い。`DIAGRAM_FALSE_FRIENDS` / `PRODUCT_FALSE_FRIENDS` と同じ作法。
+ *
+ * ⚠️⚠️ **ここに「門」を含まない語を一語でも入れてはならない**(第60条)。
+ *    弱い印は表を足しても強くならない。`常夏の楽園` `検索エンジン` `カトリック枢機卿`
+ *    のような**同音異義の的そのもの**を書けば、それは判定器の修理ではなく答案の暗記であり、
+ *    コーパスの外(`熱帯の楽園` `自動車エンジン`)には一切効かない。
+ *    しかも長い紛れ語は文の骨まで削る —— `コンテナオーケストレーション` を入れた形は
+ *    「の監視ダッシュボードを作って」だけを残し、`full` の願いを `standard` へ落とした
+ *    (reform/weak-signs/requirements.md §3.3 の実測)。
+ *    **塞げない的は `reform/weak-signs/reach.md` へ載せよ。**
+ *    `tests/reform-sign.test.js` の S-3 がこの戒めを機械で撃つ。
+ */
+const REFORM_FALSE_FRIENDS = new RegExp(
+  // 分野・学び・家系の「門」— 判定の門ではない
+  '一門|専門|部門|門下|入門|名門|門戸|関門|門限|門人|登竜門|' +
+  // 建物・行事の「門」
+  '門前|門外|水門|城門|門松|門出|山門|正門|門番|門弟', 'i');
+
 /**
  * 願いの**対象が楽園自身**か。
```

第二の差分(`isReformSubject` を「削ってから探す」形へ / `forge.js:363-365`):

```diff
@@ -361,7 +404,16 @@
 function isReformSubject(d) {
-  return REFORM_RE.test(d);
+  /**
+   * ★ PARA-10 (reform/weak-signs / R3): 紛れ語の**一致箇所ごと全体**を削ってから印を探す。
+   *
+   * ⚠️ `if (REFORM_FALSE_FRIENDS.test(d)) return false;` と書いてはならない ——
+   *    それは**文全体**を無効化する形であり、PARA-11 が実証した病そのものである
+   *    (「専門の楽園を改修せよ」が改革の道を失う)。削るのは当たった箇所だけである。
+   * ⚠️ 削る単位は「一致箇所ごと全体」である。部分だけ削れば残りが印に当たる。
+   */
+  const stripped = String(d).replace(new RegExp(REFORM_FALSE_FRIENDS.source, 'gi'), ' ');
+  return REFORM_RE.test(stripped);
 }
```

**組み込み方の裁定: 「削ってから探す」であって「当たったら偽」ではない。**
後者は PARA-11 が実証した文全体無効化の病そのものである。本相の実測:

| 願い | `if (FF.test(d)) return false` の形 | **削ってから探す(採用)** |
|------|-----------------------------------|--------------------------|
| `専門店のサイトが欲しい` | `isReformSubject=false`(正しい) | `false`(正しい) |
| `専門の楽園を改修せよ` | **`false` → 楽園の願いが reform を失う** | `true`(正しい) |

**第三の差分(export / AC-3 が表を門から読むため):**

```diff
@@ -815,4 +889,4 @@ function main() {
-module.exports = { ..., buildDag, REFORM_RE, isReformSubject, PRODUCT_FALSE_FRIENDS, ... };
+module.exports = { ..., buildDag, REFORM_RE, REFORM_FALSE_FRIENDS, isReformSubject, PRODUCT_FALSE_FRIENDS, ... };
```

> ⚠️ **足すのは `REFORM_FALSE_FRIENDS` 一つだけである**(requirements §5 の範囲外表)。
> `PRODUCT_STRONG_RE` / `DIAGRAM_FALSE_FRIENDS` は足さない —— 本書の AC はどれも
> それらを門から直に撃つことを要求していない。export を広げれば撃てる面が増え、
> 「撃っていない面」が静かに生まれる。

---

### 2.3 P3 — `wantsProduct` を「削ってから探す」形へ + `isCartography` の経路

**まず経路を実測した — `isCartography` はこの走行で `wantsProduct` を呼ばない。**
`forge.js` 全体で `wantsProduct` の呼び手は `isCounsel` の 2 箇所(`:550` / `:558`)だけである。
`isCartography`(`:598`)は `PRODUCT_FALSE_FRIENDS` と `PRODUCT_STRONG_RE` を**直に**見ており、
`wantsProduct` の修理は**この行に一切届かない**
(findings §4.4-3 の実測: `wantsProduct` だけ直した P1 では耐久 枝E が 0/8)。
本相の再測でも同じ: `P3` を当てた形は枝E 8/8 だが、`isCartography` の行を戻せば枝E は死ぬ。

**ゆえに二箇所を同じ commit で直す。**

`wantsProduct`(`forge.js:513-516`):

```diff
@@ -510,10 +562,24 @@ function wantsProduct(w) {
    * 旧実装はこの一行を持たず、`PRODUCT_STRONG_RE` が紛れ語を素通しにしていた ——
    * 「腎機能の低下を診断してほしい」が産物の依頼と誤読され、諐問の道を失った。
    */
-  if (PRODUCT_FALSE_FRIENDS.test(w)) return false;
-  if (PRODUCT_STRONG_RE.test(w)) return true;
-  // 一字の名(口/門/相)だけで当たった場合、それが紛れ語の一部でないか確かめる
-  return PRODUCT_RE.test(w) && !PRODUCT_FALSE_FRIENDS.test(w);
+  /**
+   * ★ PARA-11 (reform/weak-signs / P3): 紛れ語の**一致箇所ごと全体**を削ってから
+   * 強い名を探す。**文全体を無効化してはならない** ——
+   * 旧実装の一行目 `if (PRODUCT_FALSE_FRIENDS.test(w)) return false;` は
+   * 「相関図を描けるアプリを作って」の「相関」に当たった瞬間、同じ文の「アプリ」まで
+   * 巻き添えで殺していた(debt.md PARA-11)。
+   *
+   * これは `isCartography` の `onlyWeak` が示す作法の**一般形**である ——
+   * `DIAGRAM_RE` は弱い印と強い印を別の式に切り出せるので述語で書けるが、
+   * `PRODUCT_RE` は強弱が同じ文に同居する(「専門店のサイト」)。
+   * ゆえに述語では分けられず、**一致箇所を削る**ことでしか強弱を分離できない。
+   *
+   * ⚠️ 削る単位は「一致箇所ごと全体」である。`窓口` から `窓` だけ削れば
+   *    残った `口` が `PRODUCT_RE` に当たり、諐問の道を失う(第60条)。
+   */
+  const stripped = String(w).replace(new RegExp(PRODUCT_FALSE_FRIENDS.source, 'gi'), ' ');
+  if (PRODUCT_STRONG_RE.test(stripped)) return true;
+  return PRODUCT_RE.test(stripped);
 }
```

`isCartography`(`forge.js:598` / **`onlyWeak` の行には触らない**):

```diff
@@ -595,7 +661,15 @@ function isCartography(wish) {
    *    ゆえに **強い産物名だけ**で打ち消す。第60条: 弱い印を打ち消しに使えば別の道を奪う。
    */
-  if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;
+  {
+    // ★ PARA-11 (reform/weak-signs / P3): 作図の打ち消しも**同じ形**に揃える。
+    //    旧: if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;
+    //        ← 紛れ語が在るだけで打ち消しが丸ごと死に、図一枚で返っていた。
+    //    ⚠️ `wantsProduct(wish)` を呼んではならない(AC-8)—— `PRODUCT_RE` の一字の名「相」が
+    //       『楽園の相の系統図を描いてほしい』に当たる。**強い産物名だけ**で打ち消す。
+    const _stripped = String(wish).replace(new RegExp(PRODUCT_FALSE_FRIENDS.source, 'gi'), ' ');
+    if (PRODUCT_STRONG_RE.test(_stripped)) return false;
+  }
   // 「図に」「図を」だけで当たった場合、それが紛れ語の一部でないか確かめる。
   const onlyWeak = !new RegExp(`${DIAGRAM_JA.split('|')...}`, 'i').test(wish);
   if (onlyWeak && DIAGRAM_FALSE_FRIENDS.test(wish)) return false;   // ← 触るな(健全)
   return true;
 }
```

**共通化しない理由**: `wantsProduct` は `PRODUCT_RE`(一字の名を含む弱い印)まで見るが、
`isCartography` は**強い産物名だけ**で打ち消さねばならない(AC-8 が明示的に排除)。
共通の関数に括れば打ち消しの強さが揃ってしまい、
『楽園の相の系統図を描いてほしい』が reform へ攫われる。冗長だがこれが正しい。

---

## 3. 【実測】三部品を単独で / 併用で当てた結果

命令:

```bash
$ node reform/weak-signs/_design_patch.js         # 8 つの写しを組む
$ node reform/weak-signs/_design_measure.js       # 単独 / 併用で測る(門は逐次 / NFR-1)
```

生出力は `reform/weak-signs/_design_measure_out.txt`(530 行)。以下はその要約と抜粋。

### 3.1 まとめの表(生の写し)

```
まとめ  部品        受入対角    非対角セル  射程帳    種M(AC-1)  PARA-11族  耐久
        B0         120/140     4/30        32/32     0/16       0/4        19/48
        R2         128/140     4/30        32/32     8/16       0/4        22/48
        R3         127/140     4/30        32/32     8/16       0/4        23/48
        P3         124/140     2/30        32/32     0/16       4/4        35/48
        R2R3       135/140     2/30        32/32     16/16      0/4        26/48
        R2P3       132/140     2/30        32/32     8/16       4/4        38/48
        R3P3       132/140     2/30        32/32     8/16       4/4        41/48
        X4PP       140/140     0/30        32/32     16/16      4/4        44/48
```

**読み方(五つ):**

1. **どの単独部品も合格線に届かない。** 最良の単独(R2)でも 128/140・非対角 4 セル。
2. **どの二部品の組み合わせも届かない。** 最良(R2R3)でも 135/140・非対角 2 セル。
   **三つ揃って初めて 140/140・0/30 になる。** これが「三部品を同じ commit で入れよ」の実測の根拠である。
3. **種M は R2 と R3 を**両方**当てて初めて 16/16 になる**(R2 単独 8/16、R3 単独 8/16、R2R3 で 16/16)。
   日英それぞれ 8 件ずつであり、片枝だけでは半分しか塞がらない —— 第60条(b) の両枝が数で現れている。
4. **PARA-11 の族 4 件は P3 を含む形でしか直らない**(P3 / R2P3 / R3P3 / X4PP で 4/4)。
   表でも語境界でも触れない。**構造の修理でしか直らない**ことの証明である。
5. **射程帳 32 件はどの形でも 32/32 のまま凍る。** 一件も「うっかり直って」いないし、
   一件も `standard` へ落ちていない。ゆえに AC-4 の xfail 門はどの部品を採っても緑である。

### 3.2 非ゼロ非対角セルの名と件数(全 8 形)

| 形 | 非対角セル | 内訳 |
|----|-----------|------|
| **B0**(基準線) | 4 | `full→reform` 8 / `full→cartography` 2 / `standard→reform` 7 / `standard→cartography` 3 |
| **R2** | 4 | `full→reform` 4 / `full→cartography` 2 / `standard→reform` 3 / `standard→cartography` 3 |
| **R3** | 4 | `full→reform` 4 / `full→cartography` 2 / `standard→reform` 4 / `standard→cartography` 3 |
| **P3** | 2 | `full→reform` 9 / `standard→reform` 7 |
| **R2R3** | 2 | `full→cartography` 2 / `standard→cartography` 3 |
| **R2P3** | 2 | `full→reform` 5 / `standard→reform` 3 |
| **R3P3** | 2 | `full→reform` 4 / `standard→reform` 4 |
| **X4PP** | **0** | **(非対角はすべて 0 — 第61条の合格線に到達)** |

**`→cartography` のセルは P3 が消し、`→reform` のセルは R2+R3 が消す。**
二つの病が別の場所に居ることが、セルの名で読める。

> 註: `P3` 単独で `full→reform` が 8→9 件に**増えている**。
> `専門分野の系統図を編集できるアプリが欲しい` が `cartography`(P3 が直した)から
> `reform`(「専門」の「門」がまだ当たる)へ移っただけであり、新しい病ではない ——
> R3 を併せれば消える(R3P3 で 4 件、X4PP で 0 件)。**部品を分けて入れてはならない理由の一つ。**

### 3.3 X4″ の生出力(合格線の証明)

```
【X4PP】 C:\Users\kikus\AppData\Local\Temp\ws_cand\forge.D_X4PP.js
① 受け入れ帳: 対角 140 / 140   非ゼロ非対角セル 0 / 30
     (非対角はすべて 0 — 第61条の合格線に到達)
② 射程帳: reform のまま凍っている 32 / 32   standard へ落ちた 0 件
③ 種M(AC-1): 今なお reform を名乗る 0 / 16
   種H/PARA-11 の族(AC-2): 未修理 0 / 4
④ AC-45 の的:
     "専門店の棚の傾きを直したい" -> quick   (門が現在 reform を期待)
     "部門別の売上の誤りを直したい" -> quick   (門が現在 reform を期待)
     "門に監査の一段を足す" -> reform   (逆向き / reform を失ってはならない)
     "門の判定を書き換える" -> reform   (逆向き / reform を失ってはならない)
     "門を強化する" -> reform   (逆向き / reform を失ってはならない)
   counsel.test.js:652 — 落ちた語: 0 語(過不足なし) / 入り込んだ固有名: 0 語 / 台帳系: 0 件
   REFORM_FALSE_FRIENDS の export: 有り(21 項)
   AC-3 の門番: 「門」を含まない項 0 件 / 英語混入 0 件
⑤ 既存門(逐次 / NFR-1):
     ── tests/route-matrix.test.js ── exit=0   Route matrix self-test: 13 passed, 0 failed
     ── tests/counsel.test.js ── exit=1   Counsel self-test: 209 passed, 1 failed
        ✗ 「門」の紛れ語は main と同じ振る舞いである (AC-45 / 本走行は悪化させていない)
     ── tests/route-debt.test.js ── exit=1   Route debt self-test: 3 passed, 2 failed
        ✗ D-1 [残債 PARA-10]: 一門の家系図…は今なお reform へ落ちる
        ✗ D-2 [残債 PARA-11]: 相関図を描けるアプリ…は今なお cartography へ落ちる
     ── tests/ratify-guard.test.js ── exit=0   Ratify guard self-test: 9 passed, 0 failed
⑥ 耐久(コーパス外 48 件):
     ✗   [A-楽園] "wire the orchestration pipeline to the audit ledger" -> counsel  (正解 reform)
     ✗   [B-世間] "自動車エンジンの整備記録アプリが欲しい" -> reform  (reform でなければ良)
     ✗   [B-世間] "build a birdwatching app for the northern cardinal" -> reform  (reform でなければ良)
     ✗   [B-世間] "熱帯の楽園を紹介する旅行サイトを作れ" -> reform  (reform でなければ良)
     枝A(楽園を失わない): 9/10   枝B(世間を攫わない): 7/10   枝C(産物を見失わない): 10/10
     枝D(諐問を失わない): 10/10   枝E(図を作る産物): 8/8   合計 44/48
```

**合格線に到達している: 受け入れ帳 140/140 かつ非対角 0/30。**

### 3.4 耐久試験(コーパス外 48 件 5 枝)—— 行列だけで選ばない

前走行では行列を通った候補 4 つのうち **3 つが耐久で落ちた**。ゆえに本相も全 8 形を耐久にかけた。

| 形 | 枝A楽園 | 枝B世間 | 枝C産物 | 枝D諐問 | 枝E作図 | 合計 |
|----|--------|--------|--------|--------|--------|------|
| B0 | 9/10 | 0/10 | 0/10 | 10/10 | 0/8 | 19/48 |
| R2 | 9/10 | 3/10 | 0/10 | 10/10 | 0/8 | 22/48 |
| R3 | 9/10 | 4/10 | 0/10 | 10/10 | 0/8 | 23/48 |
| P3 | 9/10 | 0/10 | 10/10 | 10/10 | 6/8 | 35/48 |
| R2R3 | 9/10 | 7/10 | 0/10 | 10/10 | 0/8 | 26/48 |
| R2P3 | 9/10 | 3/10 | 10/10 | 10/10 | 6/8 | 38/48 |
| R3P3 | 9/10 | 4/10 | 10/10 | 10/10 | 8/8 | 41/48 |
| **X4PP** | **9/10** | **7/10** | **10/10** | **10/10** | **8/8** | **44/48** |

**X4″ が全形で最良の 44/48。** discover 相の X4(表 41 語)の 43/48 を上回り、表はより短い(21 語)。

枝ごとの読み: **枝B(世間を攫わない)は R2 と R3 を両方当てて初めて 7/10 に達する**
(R2 単独 3、R3 単独 4、R2R3 で 7)。**枝E(図を作る産物)は R3+P3 でしか 8/8 にならない**
(P3 単独 6/8 —— 残る 2 件は「専門用語の関連図…」「部門の階層図…」で、
「門」がまだ当たるので reform へ攫われる)。**枝A は全形で 9/10 で不変**(下の既知の 1 件)。

残る 4 件の ✗ の裁定:

| ✗ | 裁定 |
|---|------|
| `[A-楽園] wire the orchestration pipeline to the audit ledger` → `counsel` | **本走行の病ではない。** `audit` が `COUNSEL_EN` に当たり counsel が reform より先に立つ **既知の設計**であり、**基準線 B0 を含む全 8 形で ✗** である。AC-5 が `counsel` を期待する形で撃ち、註に理由を書く(黙って落とさない / 第16条) |
| `[B-世間] 自動車エンジンの整備記録アプリが欲しい` | **種H。** 「エンジン」が独立した語として当たる。射程帳と同族(表を足せば暗記になる) |
| `[B-世間] build a birdwatching app for the northern cardinal` | **種H。** `cardinal` は `\b` を付けても語全体として当たる |
| `[B-世間] 熱帯の楽園を紹介する旅行サイトを作れ` | **種H。** 「楽園」が独立した語として当たる |

**枝B の残り 3 件は全件が種H であり、いずれもコーパスの外の願いである。**
これらを直そうとして表に `自動車エンジン` `熱帯の楽園` `northern cardinal` を書けば、
コーパスの中の 32 件も同じ手で消したくなり、第60条違反の暗記に落ちる。
**射程が残ることは正直に `reach.md` に書く**(第5節)。

### 3.5 【裁定】R2 は表を割るが `counsel.test.js:652` は鳴らない(AC-10 の証明)

R2 を**単独で**当てた形の既存門の生出力:

```
     ── tests/counsel.test.js ── exit=0   Counsel self-test: 210 passed, 0 failed
```

**210/0。一本も鳴っていない。** `REFORM_RE` を日英に割っても、
652 行が要求する 20 語は全て `test()` が真のままだからである。
X4″ で counsel が 209/1 になるのは AC-45(`counsel.test.js:828`)であって 652 行ではない —— 次節で裁定する。

---

## 4. 既存門への衝撃 — 網羅的な裁定


### 4.0 【最重要】`tests/paradise.test.js` 471 門への衝撃 —— **新しい ✗ は 0 本**

命令(対照群と試験群を**写しのリポジトリで一つずつ逐次に** / NFR-1):

```bash
$ node reform/weak-signs/_design_paradise.js
```

生出力(`$LOCALAPPDATA/Temp/ws_cand/paradise_base.txt` / `paradise_x4pp.txt` から検算):

```
$ grep -h "Paradise self-test:" paradise_base.txt paradise_x4pp.txt
Paradise self-test: 469 passed, 0 failed, 2 skipped      ← 対照群 (main そのもの)
Paradise self-test: 469 passed, 0 failed, 2 skipped      ← 試験群 (X4″)

$ grep -c "✗" paradise_base.txt paradise_x4pp.txt
paradise_base.txt:0
paradise_x4pp.txt:0
```

所要: 対照群 **364.8 秒** / 試験群 **366.5 秒**(exit=0 / 両群とも逐次)。

**差し替えが実際に効いていたことの確認**(第58条: 当て損ねを緑にしない):

```
$ grep -c "REFORM_FALSE_FRIENDS\|REFORM_JA\|stripped" ws_para_x4pp/graph/forge.js   → 13
$ grep -c ...                                          ws_para_base/graph/forge.js   → 0

$ cd ws_para_x4pp && node -e 'chooseScale'
full         一門の家系図を作れるアプリが欲しい        ← PARA-10 を払った
full         相関図を描けるアプリを作って              ← PARA-11 を払った
reform       門に監査の一段を足す                      ← 既存門の的を守った
standard     implement a gateway timeout retry helper  ← 種M を塞いだ
```

#### 裁定

| 項 | 対照群 | 試験群 (X4″) | 裁定 |
|----|--------|-------------|------|
| 門の総数 | 469 + 2 skipped = **471** | 469 + 2 skipped = **471** | **数が閉じる**(第37条) |
| `failed` | 0 | 0 | 衝撃なし |
| `✗` の行数 | 0 | 0 | **新しく ✗ になった門: 0 本** |
| skip の理由 | `package.json` が無い / 兄弟倉が無い | 同じ | **写しの代価**であり本走行の病ではない |

**`tests/paradise.test.js` に対する X4″ の衝撃は無い。新しく赤くなる門は一本も無い。**
ゆえに「正しい赤か回帰か」を裁く対象が存在しない。
本走行が赤くする既存門は `counsel.test.js` の AC-45 と `route-debt.test.js` の D-1/D-2 だけである(§4.1 / §4.2)。

> ### ⚠️ 未来の計測器への教訓(本相が二度誤った)
>
> **健全性の判定式は `passed + failed + skipped >= 471` かつ `failed === 0` でなければならない。**
> `passed >= 471` は**写しに対して不当**である ——
> 版管理下の現物や兄弟倉を見る門は、見るものが無ければ **skip を名乗って**通る(第58条(e))。
> 集計行は二形を取る(`graph/census.js:91` が同じ正規表現で読んでいる):
>
> ```
> 神の機械 : Paradise self-test: 469 passed, 0 failed
> CI (裸)  : Paradise self-test: 459 passed, 0 failed, 10 skipped
> ```
>
> **楽園の性質は門の総数であり、それは `passed + failed + skipped` である。**
> 本相は最初 `passed` だけを読んで 469 < 471 と裁き、**正しく走った測定を「測定失敗」と誤審した**。
> 誤審の方向は安全側(偽の緑を出さない)だったが、誤審は誤審である。
> `_design_paradise.js` は `skipped` まで読む形に直してある。
>
> **閾値を下げるのではなく、写しの正しい基準線(`469 + 2 = 471`)に合わせるのである。**

---
### 4.1 `tests/counsel.test.js` — 209/1(AC-45 だけが鳴る)

X4″ での生出力(`_design_measure_out.txt` / 逐次に走らせた):

```
     ── tests/counsel.test.js ── exit=1   Counsel self-test: 209 passed, 1 failed
        ✗ 「門」の紛れ語は main と同じ振る舞いである (AC-45 / 本走行は悪化させていない)
```

**鳴る門は一本だけ。裁定: 【正しい赤】。**

理由は assert 自身が書いている ——
「良くなったなら門を書き換え、悪くなったなら直せ」。X4″ での実測:

```
④ AC-45 の的:
     "専門店の棚の傾きを直したい" -> quick   (門が現在 reform を期待)
     "部門別の売上の誤りを直したい" -> quick   (門が現在 reform を期待)
     "門に監査の一段を足す" -> reform   (逆向き / reform を失ってはならない)
     "門の判定を書き換える" -> reform   (逆向き / reform を失ってはならない)
     "門を強化する" -> reform   (逆向き / reform を失ってはならない)
```

**二件とも `reform` → `quick` に改善した。** 正解は `quick` である
(「棚の傾きを直したい」「売上の誤りを直したい」は一点の修繕であり、楽園の改修ではない)。
逆向きの 3 件は無傷。

#### 書き換え後の assert の具体文(`tests/counsel.test.js:828-842` を丸ごと置換)

```js
/**
 * ⚠️ この門は reform/weak-signs で **xfail から正の門へ昇格した**。
 *    以前は「main と同じく reform へ落ちる」ことを凍らせていた(= 誤りの記録)。
 *    `REFORM_FALSE_FRIENDS` が「門」の複合語を語境界として扱うようになったので、
 *    **世間の「門」は楽園を名乗らない**ことを直に撃つ形に書き換えた。
 *    実測(reform/weak-signs/design.md §4.1): 二件とも reform → quick。
 */
test('「門」の紛れ語は楽園を名乗らない (AC-45 / PARA-10 を払った)', () => {
  for (const wish of ['専門店の棚の傾きを直したい', '部門別の売上の誤りを直したい']) {
    assert.strictEqual(forge.chooseScale(wish), 'quick',
      `「門」の紛れ語が楽園の改修の道へ攫われた — PARA-10 の回帰: ${wish}`);
  }
  // 逆向き: 本物の門は今まで通り無条件で楽園を名指す(第60条(b): 規則を足したら両枝を持て)
  for (const wish of ['門に監査の一段を足す', '門の判定を書き換える', '門を強化する']) {
    assert.strictEqual(forge.chooseScale(wish), 'reform',
      `本物の門が reform を失った — ${wish}`);
  }
});
```

**変えるのは三箇所だけ**: (1) テスト名の後半、(2) 註、(3) 前半 2 件の期待値 `'reform'` → `'quick'`。
**後半 3 件の assert は一字も触らない。**

**禁止(第21条 / requirements §3.2 が明文で禁じた):**
`|| true` / `assert.notStrictEqual(…, 'reform')` への緩和 / テスト名から `AC-45` の札を消すこと / 門ごと削除。
`notStrictEqual` では `counsel` へ落ちても緑になる。**`quick` を等号で撃て。**

> **これは強化である。** `strictEqual(…, 'reform')`(誤りの凍結)から
> `strictEqual(…, 'quick')`(正解の要求)への書き換えであり、
> 緩めていない(NFR-6)。

#### `counsel.test.js:652` は**無改変**(AC-10)

```
   counsel.test.js:652 — 落ちた語: 0 語(過不足なし) / 入り込んだ固有名: 0 語 / 台帳系: 0 件
```

R2 を**単独で**当てた形でも `Counsel self-test: 210 passed, 0 failed`(§3.5)。
**652-671 行は一行も触らない。** `git diff tests/counsel.test.js` が
L652-671 に何も出さないことを、quality 相が目で確かめる。

### 4.2 `tests/route-debt.test.js` — 5 門のうち **3 門が赤くなる**(= 残債を払った)

X4″ での生出力:

```
     ── tests/route-debt.test.js ── exit=1   Route debt self-test: 3 passed, 2 failed
        ✗ D-1 [残債 PARA-10]: 一門の家系図…は今なお reform へ落ちる
        ✗ D-2 [残債 PARA-11]: 相関図を描けるアプリ…は今なお cartography へ落ちる
```

> ⚠️ **生出力は 2 件だが、実際には D-3 も赤くなる。**
> D-3 は `forge.REFORM_RE` の当たりと `PRODUCT_FALSE_FRIENDS.test(…)` を見ており、
> 後者は X4″ でも真のままなので**今回の測定では通ってしまった**。
> だが D-3 の前半 `assert.match(hit, /^門$/)` は
> `'一門の家系図…'.match(REFORM_RE)[0]` を読む —— X4″ でもこれは `'門'` である
> (`REFORM_RE` は語を落としていないから)。**すなわち D-3 は「原因が消えていない」と
> 報告し続ける。これは誤報である** —— 症状(D-1/D-2)は消えたのに原因の門だけ黙る形になる。
> **ゆえに D-3 も同じ commit で書き換える。**

#### どの門をどう書き換えるか(名指し)

| 門 | X4″ での状態 | 裁定 | どうするか |
|----|-------------|------|-----------|
| **D-1** [残債 PARA-10] | ✗ | **正しい赤**(残債を払った) | `DEBT` から PARA-10 を消す。`DEBT` が空になるので **D-1 は削除** |
| **D-2** [残債 PARA-11] | ✗ | **正しい赤**(残債を払った) | `DEBT` から PARA-11 を消す。**D-2 も削除** |
| **D-3** [残債の原因] | ✓(だが**誤報**) | 症状が消えたのに原因の門が黙る形 | `DEBT` が空のときは **skip を名乗る**形にする(黙って return しない / 第58条(e)) |
| **D-4** [門番: debt.md が 2 件を載せる] | ✓ | 帳を空にすると鳴る | `assert.strictEqual(rows.length, DEBT.length)` は `0 === 0` で通る。**残債表を 0 行にし、門は残す** |
| **D-5** [門番: 帳と門の一致] | ✓ | 同上 | `deepStrictEqual([], [])` で通る。**残す** |

**`DEBT` が空になったとき、門を削除してはならない**(第44条の結線が切れる / requirements AC-11)。
`route-debt.test.js` は `PARA-12`(`runAbandonment` の残債 / 前走行 §5 が推奨)以降の受け皿として残す。

書き換え後の `DEBT` と D-1〜D-3:

```js
/**
 * 凍らせる残債。**`debt.md` の表と一字一句同じでなければならない**(D-5 が撃つ)。
 *
 * ⚠️ **reform/weak-signs で PARA-10 / PARA-11 を払ったので空である。**
 *    空であることは「残債が無い」の意であって、「門を捨ててよい」の意ではない ——
 *    次の残債(PARA-12 等)が生まれたらここへ足せ。D-4/D-5 は空でも門番として働く。
 */
const DEBT = [];

// D-1 / D-2 は DEBT の中身を数えて回す形へ揃える(件数が変わっても門が壊れない)
test('D-1 [残債]: 凍らせた誤着は今なお誤着のままである', () => {
  if (!DEBT.length) { console.log('      · skip: 残債 0 件 — 払い終えている(reform/weak-signs)'); return; }
  for (const d of DEBT) {
    assert.strictEqual(forge.chooseScale(d.wish), d.actual,
      `${d.tag}: 「${d.wish}」の道が ${d.actual} から動いた(正解は ${d.correct})—— ` + PAID);
  }
});

test('D-3 [残債]: 原因が消えていないことを名指しで確かめる', () => {
  if (!DEBT.length) { console.log('      · skip: 残債 0 件 — 原因を凍らせる的が無い'); return; }
  for (const d of DEBT) { /* 残債ごとの原因 assert（足すときに書く） */ }
});
```

> ⚠️ **`|| true` で黙らせるな。** skip は**名乗って**通す(第58条(e) の作法 / `gauge-audit.test.js` が見本)。
> 黙って `return` すれば「0 件だから緑」が見えなくなる。

#### `debt.md` から消す行(名指し)

`reform/judgment-triad/debt.md` の **§2 残債の表** から **L27 と L28 の 2 行**を消す:

```
| **PARA-10** | `REFORM_RE の弱い印「門」` | `一門の家系図を作れるアプリが欲しい` | `reform` | `full` | … |
| **PARA-11** | `PRODUCT_FALSE_FRIENDS の文全体無効化` | `相関図を描けるアプリを作って` | `cartography` | `full` | … |
```

表の見出し行(L25-26)は**残す** —— `readDebtTable()` は `| **PARA-n** |` で始まる行だけを数えるので、
見出しだけなら 0 行と数えられ、`DEBT.length === 0` と一致する。
**加えて §2 に「払った」の一行を足す**(第16条: 消した事実を残す):

```markdown
> ✅ **PARA-10 / PARA-11 は `reform/weak-signs` で払われた(2026-09-17)。**
> 二件は `tests/route-matrix.test.js` の本コーパスへ `full` として昇格し、
> `W-1` の FLOOR も同じ commit で上がった。残る種H の射程は
> `reform/weak-signs/reach.md` が 32 件を名指しで凍らせている。
```

**片方だけ消せば D-5 が鳴る。帳と門は同じ commit で動かせ。**

### 4.3 `tests/route-matrix.test.js` — 13/0 のまま緑

```
     ── tests/route-matrix.test.js ── exit=0   Route matrix self-test: 13 passed, 0 failed
```

**X4″ 単独では一本も鳴らない。** ただし AC-7 が**コーパスに 20 件を足し、FLOOR を上げる**ことを要求する
(判定器と同じ commit)。足す 20 件は §3.2 の `B0` の非対角セルに列挙された、
**基準線で誤着している受け入れ帳の全件**(種M 16 件 + PARA-11 の族 4 件)である。

| 道 | 現 FLOOR | 足す的 | **新 FLOOR** |
|----|---------|--------|-------------|
| counsel | 42 | 0 | 42(据置) |
| cartography | 9 | 0 | 9(据置) |
| reform | 11 | 0 | 11(据置) |
| quick | 8 | 0 | 8(据置) |
| **standard** | 16 | **10** | **26** |
| **full** | 16 | **10** | **26** |
| **総数** | 102 | **20** | **122** |

書き込む場所: `tests/route-matrix.test.js:372` の `FLOOR` と `:380` の総数下限。

> ⚠️ **`M-9`(`full→standard` を名指しで撃つ門)は足さない。**
> その願い(`コンテナオーケストレーションの監視ダッシュボードを作って`)は
> **射程帳 32 件の一つ**であり、AC-4 の xfail と衝突する。
> 代わりに `tests/reform-reach.test.js` の `R-2` が
> `assert.notStrictEqual(…, 'standard')` で同じことを撃つ(§5.2)。

### 4.4 `tests/ratify-guard.test.js` — 9/0 のまま緑

```
     ── tests/ratify-guard.test.js ── exit=0   Ratify guard self-test: 9 passed, 0 failed
```

**衝撃なし。** この門は `forge.js` の判定に依らない。

---

## 5. 新設 2 門 —— 骨格と実測

**骨格を散文で書くだけでは、その assert が通るか分からない。** ゆえに下書きを実際に書き、
**写しのリポジトリ**で基準線と X4″ の両方に当てて走らせた(`_design_gates.js`)。
下書きの全文は `reform/weak-signs/_draft_reform-sign.test.js` /
`reform/weak-signs/_draft_reform-reach.test.js` に在る。**建造相はこれを `tests/` へ移せ。**

### 5.1 `tests/reform-sign.test.js`(緑であるべき門 / 6 本)

| 門 | 何を assert するか(一行) | AC |
|----|-------------------------|-----|
| **S-1** [種M] | 種M 16 件(日 8 / 英 8)について `isReformSubject(denude(w)) === false` **かつ** `chooseScale(w) !== 'reform'`。加えて**日英の的が各 8 件以上在ること**を門自身が数える(片枝を空にして緑にする道を塞ぐ) | AC-1 |
| **S-2** [PARA-11] | PARA-11 の族 7 件について `wantsProduct(denude(w)) === true`(**述語を直に**)かつ道が正解であること | AC-2 |
| **S-3** [門番/第60条] | `REFORM_FALSE_FRIENDS` の**全項**が「門」を含む / 英語を含まない / **4 字以下** / 項数 ≥ 21 / 「門」一字の項が無い | **AC-3** |
| **S-4** [逆向き] | 楽園の願い 9 件が `chooseScale === 'reform'`。既知の 1 件は**除外せず `counsel` を等号で期待**し、註に理由を書く | AC-5 |
| **S-5** [作図] | 図を作る産物 8 件が `full`/`standard`、本物の作図 3 件が `cartography`、`意図を汲んで実装せよ` が `standard`(`onlyWeak` の行を守る) | AC-8 |
| **S-6** [諐問] | 紛れ語を含む諐問の願い 10 件が `counsel`(部分削除をすればここが鳴る) | AC-8 / NFR-7 |

**AC-3 の表の門番は `reform-sign` に置く。** 理由:
`reform-reach` は「赤が仕事の門」であり、その中に「緑でなければならない assert」を混ぜると
**どちらの性質の門か読めなくなる**(requirements §3.5 が二本に分けた理由そのもの)。
表の門番は「表が語境界の代用に留まっているか」を問う**正の門**である。

**S-3 に本相が足した二つの assert**(requirements の案には無い / 実測から):

- **`e.length <= 4`** —— 長い紛れ語は文の骨まで削る。
  `コンテナオーケストレーション`(15 字)を入れた形が `full→standard` の新規誤着を生んだ
  (requirements §3.3)。**字数で機械的に塞ぐ**方が「入れるな」の註より強い。
  現行 21 語の最長は `登竜門`(3 字)なので余裕がある。
- **`entries.length >= 21`** —— 表を空にすれば S-1 が鳴るが、
  「S-1 の的を減らしつつ表も減らす」合わせ技を塞ぐ(第21条 / 門番が絞り込みの対象なら門番ではない)。

### 5.2 `tests/reform-reach.test.js`(赤が仕事の xfail 門 / 6 本)

| 門 | 何を assert するか(一行) | AC |
|----|-------------------------|-----|
| **R-1** [射程] | 射程帳 32 件すべてが `chooseScale === 'reform'`(= 今の誤った道)。詰まった瞬間に赤くなる | AC-4 |
| **R-2** [射程] | 正解が `standard` でない的が `standard` へ落ちていないこと(`notStrictEqual`)—— **紛れ語表が文の骨を削っていないか**。requirements AC-7 の註が M-9 の代わりに置けと命じた門 | AC-7 註 / R-9 |
| **R-3** [射程] | 32 件すべてが**種H である**ことを原因で撃つ: 印が当たる ∧ **紛れ語表を当てた後でも当たる** ∧ 名指しした印が実在する。**種M を射程帳へ逃がす道を塞ぐ** | AC-4 |
| **R-4** [門番] | `reach.md` が実在し、32 件を名指しで載せ、**表の行数が `REACH.length` と等しい** | AC-4 |
| **R-5** [門番] | `reach.md` の行と `REACH` 配列が**一字一句同じ**(`deepStrictEqual` で集合照合) | AC-4 |
| **R-6** [門番] | 射程帳の的が `tests/route-matrix.test.js` / `tests/counsel.test.js` に**一件も居ない**こと —— **帳を分けることが既存の的を逃がす手になっていない**(第21条) | AC-4 / §2.3 |

**R-6 は本相が足した。** requirements は §2.3-1 で「射程帳の 32 件は既存門に一件も含まれない」と
**散文で**述べていたが、それを撃つ門が無かった。**散文の断定は明日崩れる。機械で撃つ。**

### 5.3 【実測】両門を基準線と X4″ で走らせた

```bash
$ node reform/weak-signs/_design_gates.js
```

```
【判定器 = base】  REFORM_FALSE_FRIENDS を持つ: false
── node tests/reform-sign.test.js ──  exit=1
    ✗ S-1 [種M]: 語中に埋没した印は楽園を名乗らない (AC-1 / 日 8 + 英 8)
    ✗ S-2 [PARA-11]: 紛れ語は同じ文の強い産物名を巻き添えにしない (AC-2)
    ✗ S-3 [門番 / 第60条]: 紛れ語表は「門」の複合語だけを持つ (AC-3)
    ✓ S-4 [逆向き]: 楽園の願いは reform を失わない (AC-5 / 第60条(b))
    ✗ S-5 [作図]: 図を作る産物は図そのものではない (AC-8 / 枝E)
    ✓ S-6 [諐問]: 紛れ語を含む諐問の願いは counsel を失わない (AC-8 / 枝D / NFR-7)
  Reform sign self-test: 2 passed, 4 failed
── node tests/reform-reach.test.js ──  exit=1
    ✗ R-3 [射程]: 32 件はすべて種H である — 塞げるものを逃がしていない
  Reform reach self-test: 5 passed, 1 failed

【判定器 = x4pp】  REFORM_FALSE_FRIENDS を持つ: true
── node tests/reform-sign.test.js ──  exit=0
    ✓ S-1 ✓ S-2 ✓ S-3 ✓ S-4 ✓ S-5 ✓ S-6
  Reform sign self-test: 6 passed, 0 failed
── node tests/reform-reach.test.js ──  exit=0
    ✓ R-1 ✓ R-2 ✓ R-3 ✓ R-4 ✓ R-5 ✓ R-6
  Reform reach self-test: 6 passed, 0 failed
```

**二つのことが同時に証明されている:**

1. **X4″ の下で両門とも 6/6 緑**(AC-13 の 8 番 / 9 番)。
2. **基準線では両門とも赤い**(4/6 と 1/6)。
   **門が「壊して鳴る」ことの証明である**(第21条)——
   常に緑になる門は門の形をした飾りである。

`R-3` が基準線で `Cannot read properties of undefined (reading 'source')` で落ちるのは
**正しい**: 基準線には `REFORM_FALSE_FRIENDS` が無い。この門は
「表が在ること」を前提にした射程の判定であり、表を消せば鳴る。

### 5.4 【本相が見つけた誤り】S-2 の的の選び方

下書きの初版は `専門店のサイトが欲しい` を S-2 の的に入れたが、**X4″ でも赤かった**:

```
    ✗ S-2 … 紛れ語が文全体を無効化し、同じ文の強い産物名まで死んだ: 専門店のサイトが欲しい
        false !== true
```

原因を測った:

```
"専門店のサイトが欲しい" denude= "専門店のサイトが欲しい"
   stripped= " 店のサイトが欲しい"  STRONG= false  PRODUCT_RE= false
   x4pp wantsProduct= false  chooseScale= full    base wantsProduct= false  base chooseScale= reform
```

**`サイト` は `PRODUCT_RE` にも `PRODUCT_STRONG_RE` にも居ない。**
この願いが `full` になるのは PARA-7 の別の段の仕事であり、`wantsProduct` の病ではない。
**基準線でも `wantsProduct=false` である** —— すなわちこれは PARA-11 の症状ではなかった。

**裁定: 的から外す。** S-2 に載せてよいのは
「紛れ語を削れば `PRODUCT_STRONG_RE` が当たる」願いに限る。註にそう書いた。
代わりに `部門別の集計コマンドを実装して` / `名門校の受験対策アプリが欲しい` を足し、7 件にした。

> **これが「骨格を散文で書くな、実際に走らせろ」の実例である。**
> 散文の骨格なら、この誤った的はそのまま建造相へ渡り、CI で鳴っていた。

### 5.5 射程帳 32 件をどこに書くか —— **`reform/weak-signs/reach.md` を新設する**

**裁定: `debt.md` への追記ではなく、新しい紙を立てる。** 理由は三つ:

1. **帳の主が違う。** `reform/judgment-triad/debt.md` は前走行の残債の正本であり、
   本走行はそこから **2 行を消す**側である。同じ紙に 32 行足せば、
   「払った帳」と「新しく凍らせた帳」が混ざり、`readDebtTable()` が 32 行を残債として数える。
   **`tests/route-debt.test.js` の D-4 が即座に鳴る**(`DEBT.length === 0` と一致しない)。
2. **性質が違う。** 残債は「**直さないと裁定した**病」、射程は「**原理的に直せないと名指しした**病」。
   前者は「別走行でやる」、後者は「弱い印では無理だと分かった」である。
3. **門が別である。** `route-debt.test.js` は `debt.md` を、`reform-reach.test.js` は `reach.md` を読む。
   一つの紙を二つの門が別の正規表現で読む形は、片方の書式変更がもう片方を静かに壊す。

**形**: `reform/weak-signs/reach.md`(下書きは `_design_reach_draft.md`。**建造相はこれを `reach.md` として置け**)。

- §1 なぜ「塞げない」と書いた紙を残すのか(割る条件 (i)(ii) / 表を足して緑にするなの戒め)
- §2 **射程帳の表(32 行)** —— `| # | 印 | 願い | 現状の道 | 正解の道 |`
  **`R-4`/`R-5` が読む書式である。列の順も区切りも変えるな。**
- §3 なぜ本走行で直さないのか(実測 4 点: 語境界では触れない / 表は暗記 / 長い紛れ語は骨を削る / 文脈化も表)
- §4 払い方(4 段。`REACH` が空になっても門を消すな)

**表の書式は門が読める形であることを実測で確かめた**(§5.3 の `R-4` / `R-5` が緑)。

---

## 6. 結線 —— `.github/workflows/tribunal.yml` のどこに足すか

実ファイルを読んで裁定した。現行の関連する段は:

| 行 | 段 |
|----|-----|
| L170-176 | `🧭 Route matrix — 6 道 × 6 道の混同行列 (第61条)` → `node tests/route-matrix.test.js` |
| L178-183 | `💳 Route debt — 未払いの誤着が黙って直っていないか (AC-7 / 第16条)` → `node tests/route-debt.test.js` |
| L185-191 | `⚖️ Ratify guard — 仕事をせずに祝福できないか (PARA-6 / 第37条)` |

**裁定: `L183`(Route debt の `run:` 行)の直後、`L185`(Ratify guard)の直前に 2 段を挿入する。**

道選びの門が `Counsel(L168) → Route matrix(L176) → Route debt(L183)` と並んでおり、
**同じ主題の門を同じ場所に集める**のが現行の作法だからである。
`reform-sign`(正の門)を先に、`reform-reach`(xfail の門)を後に置く ——
`Route matrix`(正)→`Route debt`(xfail) と同じ順序である。

挿入する字(L184 の空行の後、L185 の前):

```yaml
      - name: 🚪 Reform sign — 弱い印が語中に埋没していないか (PARA-10 / 第60条)
        # **語境界の門である。** `REFORM_RE` の抽象名は一語も減らしていない(counsel.test.js:652)。
        # 直したのは**当たり方**である —— 日本語は `REFORM_FALSE_FRIENDS`(「門」の複合語 21 語)、
        # 英語は `REFORM_EN` の `\b` が語境界を担う(第60条(b): 規則を足したら両枝を持て)。
        #
        # ⚠️ S-3 は**紛れ語表そのものを撃つ門番**である。表に「門」を含まない語を
        #    一語でも足せば鳴る。塞げない同音異義を表で暗記して緑にする道を機械で塞いでいる。
        run: node tests/reform-sign.test.js

      - name: 🎯 Reform reach — 弱い印の射程が黙って変わっていないか (PARA-10 / 第16条)
        # **これは xfail の門である。** 種H(独立語として当たる同音異義)32 件は
        # 語境界の修理では原理的に塞げない(reform/weak-signs/reach.md)。
        # 黙って外せば緩めたことになるので、**誤着を誤着のまま凍らせる**。
        # 誰かが射程を詰めた日にこの門が赤くなり、「reach.md から外して
        # 本コーパスへ昇格させよ」と教える。**`|| true` を付けるな。**
        run: node tests/reform-reach.test.js
```

**結線の確認**(AC-12 / 第44条):

```bash
$ node graph/wiring.js check      # 基準線
  ✓ 門 23 本すべてに走らせる者が居る (第44条)
```

`graph/wiring.js:132-145` の `mentions()` は CI の全文から `tests/<名>` を探す。
上の `run: node tests/reform-sign.test.js` はその形に一致するので、**N は 23 → 25 になる**。
`paradise.test.js` 側への追記は**不要**(CI が呼べば孤児ではない)。

> ⚠️ `wiring.js` は yml の註釈(`#`)も**捨てずに**読む(`:161-162` の註)。
> ゆえに註の中に `tests/reform-sign.test.js` と書いても呼び手と数えられてしまう。
> **必ず `run:` に実際の命令として書け。**

---

## 7. 建造相への実装手順 —— **何をどの commit に入れるか**

### 7.1 【原則】中間状態で CI が赤くなる分け方を禁じる(NFR-3)

本走行は次の五つを**同時に**動かす。片方だけを commit した状態は、**どれも CI が赤い**:

| 動かすもの | 単独で commit したら何が鳴るか |
|-----------|------------------------------|
| `graph/forge.js`(X4″) | `counsel.test.js` の AC-45 / `route-debt.test.js` の D-1・D-2 |
| `tests/counsel.test.js`(AC-45 の書き換え) | 判定器が古ければ `quick` を期待して赤 |
| `tests/route-debt.test.js` + `debt.md`(残債を消す) | 判定器が古ければ D-1・D-2 が「まだ誤着している」を撃てず赤 |
| `tests/route-matrix.test.js`(的 20 件 + FLOOR) | 判定器が古ければ足した 20 件が誤着して赤 |
| 新設 2 門 + `reach.md` + `tribunal.yml` | 判定器が古ければ `reform-sign` が 4/6 赤(§5.3 の実測) |

**ゆえに一つの commit にまとめる。** これは「大きい commit を好む」のではなく、
**判定器と門と帳は同じ真実の三つの面であり、割れば必ず嘘になる**からである(第27条の系)。

### 7.2 commit の形(**一つだけ**)

```
fix(forge): 弱い印の語境界を二枝で直す — PARA-10 / PARA-11 を払う (reform/weak-signs)
```

**含めるファイル(9 つ / この順で作れ):**

| # | ファイル | 何をするか | 拘束 |
|---|---------|-----------|------|
| 1 | `graph/forge.js` | **R2**(`REFORM_JA`/`REFORM_EN`/`REFORM_RE` に割る / §2.1) | AC-1 / AC-10 |
| 2 | `graph/forge.js` | **R3**(`REFORM_FALSE_FRIENDS` 21 語を新設 + `isReformSubject` を「削ってから探す」形へ / §2.2) | AC-1 / AC-3 |
| 3 | `graph/forge.js` | **P3**(`wantsProduct` と `isCartography:598` を**両方** / §2.3)。`onlyWeak` の行は触るな | AC-2 / AC-8 |
| 4 | `graph/forge.js` | **EX**(`module.exports` に `REFORM_FALSE_FRIENDS` **だけ**を足す) | AC-3 |
| 5 | `reform/weak-signs/reach.md` | **新設**(`_design_reach_draft.md` をそのまま置く / 32 行の表) | AC-4 |
| 6 | `tests/reform-sign.test.js` | **新設**(`_draft_reform-sign.test.js` を移す / S-1〜S-6) | AC-1/2/3/5/8 |
| 7 | `tests/reform-reach.test.js` | **新設**(`_draft_reform-reach.test.js` を移す / R-1〜R-6) | AC-4 |
| 8 | `tests/counsel.test.js` | **AC-45 のみ書き換え**(L828-842 / §4.1)。**652-671 行は触るな** | AC-9 / AC-10 |
| 9 | `tests/route-debt.test.js` | `DEBT` を空に / D-1・D-2 を統合 or 削除 / D-3 を skip を名乗る形へ(§4.2) | AC-11 |
| 10 | `reform/judgment-triad/debt.md` | **L27・L28 の 2 行を消す** + 「払った」の一段を足す(§4.2) | AC-11 |
| 11 | `tests/route-matrix.test.js` | 的 20 件を足す + `:372` の `FLOOR` を `standard 26` / `full 26` に + `:380` の総数を `122` に | AC-6 / AC-7 |
| 12 | `.github/workflows/tribunal.yml` | **L183 の直後・L185 の直前**に 2 段を挿入(§6) | AC-12 / 第44条 |
| 13 | `README.md` | **手で書かない。** `node graph/census.js fix` が測定から書く | AC-14 |

> ⚠️ **1〜4 は同じファイルの別の箇所である。** 四つを別 commit に割ってはならない ——
> §3.1 の実測が示すとおり、R2 だけ / R3 だけ / P3 だけの形はどれも
> 受け入れ帳が 140/140 に届かず、しかも `P3` 単独では `full→reform` が **8→9 件に増える**。
> **部品を順に入れれば、途中の commit で行列が悪化する。**

### 7.3 作る順序(同じ commit の中での作業順)

1. **`graph/forge.js` を直す**(上の 1〜4)。**判定器を先に直す** ——
   門を先に書き換えると、手元で走らせたとき「どちらが悪いのか」が分からなくなる。
2. **写しで確かめる**: `node reform/weak-signs/_design_patch.js` が出した
   `forge.D_X4PP.js` と、いま直した `graph/forge.js` を `diff` して**一致すること**。
   (`node reform/weak-signs/_design_patch.js --emit X4PP` が正本である。)
3. **`reach.md` を置く**(5)。表は 32 行。門が読む書式を変えるな。
4. **新設 2 門を置く**(6・7)。**すぐに走らせる**:
   `node tests/reform-sign.test.js` → 6 passed, 0 failed /
   `node tests/reform-reach.test.js` → 6 passed, 0 failed(§5.3 の実測と一致するはず)。
5. **`counsel.test.js` の AC-45 を書き換える**(8)。`node tests/counsel.test.js` → **210 passed, 0 failed**。
6. **`route-debt.test.js` と `debt.md` を同時に**(9・10)。**片方だけなら D-5 が鳴る。**
   `node tests/route-debt.test.js` → exit 0。
7. **`route-matrix.test.js` に的 20 件と FLOOR**(11)。**同じ commit で**。
   的だけ足して FLOOR を据え置けば、その 20 件は明日黙って消せる(第21条)。
   `node tests/route-matrix.test.js` → exit 0。
8. **`tribunal.yml` に 2 段**(12)。`node graph/wiring.js check` → **`門 25 本`**(23→25 / AC-12)。
9. **`node graph/census.js fix`**(13)。README の数を手で書かない(第22条)。
10. **AC-13 の 9 本を本物のリポジトリで一つずつ逐次に走らせる**(NFR-1 / NFR-2)。
    `paradise.test.js` は約 6 分。**同時並行で走らせた結果を判定に使うな。**
11. **`git add` して一度に commit。** `git show --stat` に
    `graph/forge.js` / `tests/route-matrix.test.js` / `tests/counsel.test.js` /
    `tests/route-debt.test.js` / `reform/weak-signs/reach.md` /
    `reform/judgment-triad/debt.md` が**同時に**載ること(NFR-3)。

### 7.4 建造相が走らせる門(AC-13 / 逐次に / 本物のリポジトリで)

| # | 命令 | 要求する末尾 |
|---|------|-------------|
| 1 | `node tests/paradise.test.js` | `Paradise self-test: N passed, 0 failed`(**N + skipped ≥ 471**) |
| 2 | `node tests/route-matrix.test.js` | `Route matrix self-test: N passed, 0 failed` |
| 3 | `node tests/counsel.test.js` | `Counsel self-test: 210 passed, 0 failed` |
| 4 | `node tests/route-debt.test.js` | `Route debt self-test: N passed, 0 failed` |
| 5 | `node tests/ratify-guard.test.js` | `Ratify guard self-test: 9 passed, 0 failed` |
| 6 | `node tests/reform-sign.test.js` | `Reform sign self-test: 6 passed, 0 failed` |
| 7 | `node tests/reform-reach.test.js` | `Reform reach self-test: 6 passed, 0 failed` |
| 8 | `node graph/wiring.js check` | `✓ 門 25 本すべてに走らせる者が居る (第44条)` |
| 9 | `node graph/conclave.js audit` | `見捨てられた走行: 0 / 判定不能: 0 / 全 14` |

### 7.5 建造相が**してはならない**こと(実測で排除済み)

| 禁じる形 | なぜ | 撃つ門 |
|---------|------|--------|
| `REFORM_FALSE_FRIENDS` に「門」を含まない語を足す | 答案の暗記。コーパス外に効かず、耐久が落ちる(44→43) | `reform-sign` S-3 |
| 表に 5 字以上の語を入れる | 削った跡が文の骨を失い `full→standard` を生む | `reform-sign` S-3 |
| `if (REFORM_FALSE_FRIENDS.test(d)) return false;` と書く | 文全体無効化。「専門の楽園を改修せよ」が reform を失う | `reform-sign` S-4 |
| `isCartography` で `wantsProduct(wish)` を呼ぶ | `PRODUCT_RE` の一字「相」が本コーパスを攫う | `route-matrix` cartography 行 |
| `wantsProduct` の一行目を残したまま下に足す | 一行目が先に `false` を返すので無意味 | `reform-sign` S-2 |
| 紛れ語の**部分**を削る | `窓口`→`口` が残り counsel を失う | `reform-sign` S-6 |
| `isCartography` の `onlyWeak` の行を書き換える | 基準線で 8/8 健全。触れば作図 15 件が危うい | `reform-sign` S-5 |
| AC-45 を `notStrictEqual` に緩める / `|| true` / 札を消す | 第21条 | 人が見る(quality 相) |
| `counsel.test.js:652-671` を触る | `REFORM_RE` の表から語を落とした証拠になる | `counsel.test.js:652` 自身 |
| `route-debt.test.js` を削除する | 第44条の結線が切れる。`DEBT` が空でも門は残す | `wiring.js check` |
| `PRODUCT_STRONG_RE` / `DIAGRAM_FALSE_FRIENDS` を export に足す | 撃たれない面が増える | — (requirements §5) |
| 部品を別 commit に割る | 途中の commit で CI が赤い(§7.1 / §7.2 の註) | NFR-3 |

---

## 8. AC の充足の見取り(本相の実測との対応)

| AC | 要求 | 本相の実測 | 到達 |
|----|------|-----------|------|
| AC-1 | 種M 16/16 | X4″ で「今なお reform を名乗る 0 / 16」(§3.3) | ✅ |
| AC-2 | PARA-11 の族 4/4 | 「未修理 0 / 4」(§3.3) | ✅ |
| AC-3 | 表は「門」の複合語だけ | 「『門』を含まない項 0 件 / 英語混入 0 件」+ `reform-sign` S-3 が 6/6 の一本として緑(§5.3) | ✅ |
| AC-4 | 射程帳 32/32 が凍る | 「reform のまま凍っている 32 / 32」+ `reform-reach` 6/6(§3.3 / §5.3) | ✅ |
| AC-5 | 楽園の願い 9/10 | 耐久 枝A 9/10(§3.4)/ `reform-sign` S-4 緑 | ✅ |
| AC-6 | 非対角 0/30 | 「非ゼロ非対角セル 0 / 30」(§3.3) | ✅ |
| AC-7 | 的 20 件 + FLOOR | §4.3 に表。**建造相が書き込む** | 設計済 |
| AC-8 | 枝C 10/10・枝D 10/10・枝E 8/8 | 耐久で 10/10・10/10・8/8(§3.4) | ✅ |
| AC-9 | AC-45 を `quick` の等号へ | 実測 `quick`/`quick`/`reform`×3 + 書き換え後の全文(§4.1) | 設計済 |
| AC-10 | `counsel:652` 無改変で通る | 「落ちた語 0 語 / 入り込んだ固有名 0 語」+ R2 単独で 210/0(§3.5) | ✅ |
| AC-11 | 残債を払い `route-debt` を書き換え | D-1/D-2 が赤 / D-3 は誤報 → 書き換え形を §4.2 に明示 | 設計済 |
| AC-12 | 門 23→25 | 結線先を `tribunal.yml` L183/L185 の間に確定(§6) | 設計済 |
| AC-13 | 9 本すべて exit 0 | `paradise` 471 門で新しい ✗ 0 本(§4.0)/ 他 4 本を §3.3 で実測 | ✅ |
| AC-14 | README は census が書く | §7.2 の 13 番 | 設計済 |

**合格線(受け入れ帳 140/140 かつ非対角 0/30)には到達している。**
到達を阻むものは無い —— 残りは建造相が字を貼る仕事である。

---

## 9. 本相が新たに見つけたこと(requirements に無い / 建造相と quality 相への申し送り)

1. **`route-debt.test.js` の D-3 は X4″ でも緑のままである(誤報)。**
   症状(D-1/D-2)は消えたのに、原因の門だけが「原因は消えていない」と言い続ける。
   `assert.match(hit, /^門$/)` は `REFORM_RE` が語を落としていない限り真だからである。
   **`DEBT` を空にする際、D-3 も同じ commit で skip を名乗る形へ直せ**(§4.2)。
2. **S-2 の的に `専門店のサイトが欲しい` を置いてはならない。**
   `サイト` は `PRODUCT_RE` にも `PRODUCT_STRONG_RE` にも居らず、
   **基準線でも `wantsProduct=false`** である(§5.4)。PARA-11 の症状ではない。
3. **`REFORM_FALSE_FRIENDS` の字数上限(4 字)を機械で撃つべきである。**
   requirements AC-3 は「門を含むこと」「英語を入れないこと」だけを要求したが、
   `full→standard` の新規誤着の真因は**語の長さ**だった。S-3 に `e.length <= 4` を足した。
4. **射程帳が既存門のコーパスを攫っていないことを撃つ門が無かった。**
   requirements §2.3-1 は散文で断定していた。`reform-reach` の `R-6` として機械化した。
5. **未来の計測器への教訓**: 写しで `paradise.test.js` を測るときの健全性判定は
   `passed + failed + skipped` で見よ。`passed >= 471` は写しに対して不当である(§4.0 の註)。

---

## 10. 本相が何も壊していないことの確認

```
$ git branch --show-current
reform/weak-signs

$ git status --porcelain
?? reform/weak-signs/

$ git diff --stat HEAD -- graph/ tests/ .github/
(空)
```

**追跡下のファイルの変更は 0 件。`graph/` `tests/` `.github/` は一行も変わっていない。**
本相の全ての実測は次の三つの上で行った:

- `require.cache` 注入(`_cand_gate.js` / discover 相から流用)
- `$LOCALAPPDATA/Temp/ws_cand/` の曲げた `forge.js` の写し 8 つ
- `$LOCALAPPDATA/Temp/ws_para_base` / `ws_para_x4pp` / `ws_newgates` のリポジトリの写し

何も commit / push していない。**新設 2 門と `reach.md` は `reform/weak-signs/` の中に
`_draft_*` / `_design_reach_draft.md` として置いてある** —— 建造相がこれを `tests/` と
`reform/weak-signs/reach.md` へ移す。
