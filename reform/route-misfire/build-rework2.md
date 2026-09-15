# build (rework 2) — reform 走行『route-misfire』

道: `reform` / 相: `build`(construction 領域・**二度目の差し戻し**)
前相: [`verdict.md`](./verdict.md)(**BLOCK**)/ [`reflect.md`](./reflect.md)(F-1〜F-4)
要件: [`requirements.md`](./requirements.md) §3.7(AC-36〜42)/ 設計: [`design.md`](./design.md) §1.5.1

> **この相の務め**: 裁判が BLOCK を出した回帰(F-1)を塞ぎ、
> それを素通しさせた門の穴(F-4)を塞ぐこと。
> **本書の全ての数と出力は build 相が自分の手で撃った生出力である**(第27条)。
> **撃てなかったものは「撃てなかった」と名乗る**(第37条)。

---

## 0. 結論(先に述べる)

**回帰は消えた。HEAD の誤着数は main と同じ 0 である。**

| 群 | main c216014 | HEAD ec0694c(修理前) | **HEAD(修理後)** |
|---|---|---|---|
| 強い名 26 語 × 世間の願い | **0/26** | 25/26 | **0/26** |
| 教主の 10 件 | **0/10** | 10/10 | **0/10** |
| tribunal の B群 19 件 | **0/19** | 19/19 | **0/19** |
| **強い名 合計** | **0/55** | **54/55** | **0/55** |
| A群(楽園の改修・reform が正解) | 誤着 **9/9**(＝全て外した) | 誤着 0/9 | 誤着 **0/9** |
| 回帰コーパス(教主の 21 件形) | NG **6/21** | NG 0/21 | NG **0/21** |

**HEAD の誤着(0)は main の誤着(0)以下である。** かつ **A群は main(9/9 誤着)より良いまま**である。
すなわち **欠陥Aの治癒を保ったまま F-1 を塞いだ**。

門の数: `counsel.test.js` **134 → 177**(+43 本)。`paradise.test.js` **471 → 471**(据え置き)。

---

## 1. F-1 の修理 —— `isReformSubject` を三枝にした

### 1.1 病の機序(自分の目で読んで確かめた)

```js
// 修理前(HEAD ec0694c)
const REFORM_RE = new RegExp('(楽園|paradise|…|走行帳)' +
  `|${DETERMINER_LOOKBEHIND}\\b(?:${ENGINE_NAMES_STRONG})\\b`, 'i');

function isReformSubject(d) {
  if (REFORM_RE.test(d)) return true;              // ← 強い名は無条件で真
  return REFORM_WEAK_RE.test(d) && BUILD_RE.test(d);
}
```

抽象名と強い固有名が**一本の正規表現に混ざっており**、`isReformSubject` は
それを丸ごと無条件で受けていた。強い名 26 語の防壁は `DETERMINER_LOOKBEHIND` 一枚だけ。
**日本語に冠詞は無い。ゆえに日本語の願いに対する防壁は事実上ゼロであった。**

これは第60条(b) が名指しした「**弱い印は両方向に誤る**」の実例である ——
`gauge` は車の計器でもあり、楽園の engine でもある。

### 1.2 修理の形

```js
// 修理後
const REFORM_ABSTRACT_RE = new RegExp('(楽園|paradise|…|走行帳)', 'i');
const REFORM_STRONG_RE = new RegExp(
  `${DETERMINER_LOOKBEHIND}\\b(?:${ENGINE_NAMES_STRONG})\\b`, 'i');
const REFORM_RE = new RegExp(`${REFORM_ABSTRACT_RE.source}|${REFORM_STRONG_RE.source}`, 'i'); // 後方互換の束ね・判定には使わない

const MEND_JA = '直す|直し|直せ|直して|修正|修復|改修|改善|改める|改め|除く|除去|取り除|' +
  '塞ぐ|塞い|潰す|削る|削除|外す|替える|置き換え|書き換え|整える|見直';
const MEND_EN = '\\b(?:fix|repair|remove|refactor|rewrite|patch|harden|migrate|drop|deprecate)\\b';
const MEND_RE = new RegExp(`${MEND_JA}|${MEND_EN}`, 'i');

function isReformSubject(d) {
  if (REFORM_ABSTRACT_RE.test(d)) return true;
  if (REFORM_STRONG_RE.test(d) && (BUILD_RE.test(d) || MEND_RE.test(d))) return true;
  return REFORM_WEAK_RE.test(d) && BUILD_RE.test(d);
}
```

**三枝である。どの枝も無条件ではない。**

### 1.3 tribunal が「確定できなかった」問いへの答え

reflect W-1 / verdict V-1 はこう名乗っていた:

> **A群を壊さずに B群を守る形を確定できなかった。**
> `BUILD_RE` を強い名に課すと `conclave の毒を除く` 系が落ちる恐れがある。

**その恐れは正しい。実測した**:

```
$ node -e "… BUILD_RE.test(denude('conclave の毒を除く')) …"
false
```

「除く」は建造ではないので `BUILD_RE` に一語も当たらない。
ゆえに強い名に `BUILD_RE` **だけ**を課せば `conclave の毒を除く` は死ぬ
(`counsel.test.js` が二箇所で撃っている門である)。

**答え**: 強い名に課すのは `BUILD_RE` ではなく **`BUILD_RE` ∪ `MEND_RE`** である。

**なぜ枝 2 と枝 3 が非対称でよいか**(これが設計上の核心):
**証拠の強さが、許す動詞集合の広さを決める。**

* 強い名(`conclave`/`forge`/`gauge`)は楽園固有性の証拠として**強い**。
  ゆえに「改める」動詞まで広く許してよい。
* 弱い名(`vendor`/`census`/`workflow`)は世間の語**そのもの**である。
  `MEND_RE` まで許せば `fix the vendor page` が楽園の改革と誤読される。
  ゆえに `BUILD_RE` に留める。

**これは第57条を破っていない。** 第57条は「運べなかった条件を黙って捨てるな」と命ずる。
本修理は条件を**捨てていない** —— 弱い名の二条件はそのままであり、
強い名には**新たに条件を足した**(限定詞の除外 + 動詞の伴需)。
門は**広がったのではなく狭まった**。

### 1.4 触らなかったもの(命じられた通り)

`git diff` で確かめた。`graph/forge.js` の変更は **`REFORM_RE` の分割 / `MEND_RE` の新設 /
`isReformSubject` の本体 / `module.exports`** の四箇所のみである。

| 触るなと命じられたもの | 実測 |
|---|---|
| 弱い名の扱い(`REFORM_WEAK_RE` / `ENGINE_NAMES_WEAK`) | **一字も変えていない** |
| `isCounsel` | **一字も変えていない** |
| `denude` | **一字も変えていない** |
| `PRODUCT_RE` / `PRODUCT_STRONG_RE` / `PRODUCT_FALSE_FRIENDS` / `wantsProduct` | **一字も変えていない** |
| `DOC_STRONG_RE` / `DOC_RE` | **一字も変えていない** |
| `chooseScale` の判定順 | **一行も変えていない**(3 段目の述語は今も `isReformSubject(d)`) |
| `ENGINE_NAMES_STRONG` の 26 語 | **一語も変えていない** |
| `DETERMINER_LOOKBEHIND` の表 | **一語も変えていない** |
| `conclave.json` / `forge.dag.json` | **触っていない**(untracked のまま) |

---

## 2. F-4 の修理 —— 強い名側のコーパスを門にした

tribunal の測定:

```
$ (AC-31 節から [wish, name] の対を抽出)
抽出件数= 29
--- コーパス中の強い名 = 0 / 29 ---
```

**門は守るべき面の半分を一度も見ていなかった。** ゆえに `tests/counsel.test.js` に節 `1e` を建てた。

| 門 | 何を撃つ | 本数 |
|---|---|---|
| AC-36 | **教主の 10 件そのまま**(main 0/10 / HEAD 10/10 の実測を門にした) | 10 |
| AC-37 照合 | `ENGINE_NAMES_STRONG` の全語 ⇔ コーパスの**機械照合**(過不足の両方向) | 1 |
| AC-37 本体 | **強い名 26 語すべて**に世間の願いを一件ずつ | 26 |
| AC-38 | 逆向き —— 強い名 + `BUILD_RE`(6 件)/ 強い名 + `MEND_RE`(4 件) | 1 |
| AC-39 | 二条件が**それぞれ単独で**効いている(黙る門を作らない) | 1 |
| AC-40 | 抽象名は無条件のまま(修理が広がりすぎていない) | 1 |
| AC-41 | `MEND_RE` に世間の創造の動詞が紛れていない(表を直に撃つ) | 1 |
| AC-41 隣 | **`MEND_RE` と `COUNSEL_JA` の重なり**を固定(判定順の帰結・§5 B-1 の実測から生まれた) | 1 |
| AC-41 隣 | `MEND_RE` の ReDoS(足した者が計る / S-1 と同じ病を持ち込まない) | 1 |
| **計** | | **+43** |

### 2.1 AC-37 の照合の門が最も重い

F-4 の本体は「コーパスが表に追いつかない」ことである。人が忘れれば再演する。
ゆえに**機械が照合する**:

```js
const uncovered = table.filter(n => !corpus.includes(n));
assert.deepStrictEqual(uncovered, [], `強い名が表に在るのにコーパスが撃っていない: …`);
const stale = corpus.filter(n => !table.includes(n));
assert.deepStrictEqual(stale, [], `コーパスが表に無い名を撃っている: …`);
for (const [name, wish] of Object.entries(STRONG_WORLDLY_EVERY_NAME)) {
  assert.ok(wish.toLowerCase().includes(name.toLowerCase()), …);  // 第16条
}
```

三番目の assert は第16条(名指しは呼び出しではない)である ——
「`gauge` を撃った」と称する願いに `gauge` の字が無ければ、その名を撃っていない。

**故障注入 M-10 / M-11 がこの門を実際に赤くした**(§3)。

---

## 3. 故障注入 —— **11 変異すべてが赤くなった。黙った変異は 0 件**

`$LOCALAPPDATA/Temp/fi`(`git clone --branch reform/route-misfire` の複製)で撃った。
**復旧は原本からの再コピー**で行い、最後に `diff` で原状復帰を確かめた。

> ⚠️ **最初の試みは変異が累積して結果が嘘になった。** 復旧を `/tmp/forge.orig.js` へ
> 逃がしたが MSYS のパス解釈で書けておらず、`cp` が黙って失敗し続けた。
> **その回の M-2 以降の数は全て無効である。** 復旧経路を原本コピーに替えて撃ち直した。
> 正直に記す —— 最初の測定は誤りであった(第37条)。

### 3.1 実装側を壊す 8 変異(生出力 / 最終版の門 177 本に対して撃ち直した)

```
=== M-0 基準線(変異なし) ===
  [M-0] Counsel self-test: 177 passed, 0 failed  RAW_EXIT=0

=== M-1: 強い名の枝から動詞の伴需を消す(F-1 の修理そのものを戻す) ===
  [M-1] Counsel self-test: 141 passed, 36 failed  RAW_EXIT=1
        ✗ "gauge calibration tracker" は reform でない — 強い名 gauge が限定詞なしで道を奪わない (AC-36 / 教主の実測)
        ✗ "forge 鍛冶屋の在庫管理アプリを作って" は reform でない — 強い名 forge が…
        ✗ "synod 教会会議の議事録アプリ" は reform でない — 強い名 synod が…
        ✗ "critic 映画批評サイトを作れ" は reform でない — 強い名 critic が…

=== M-2: 強い名の枝から MEND_RE だけを落とす(除去の願いが死ぬはず) ===
  [M-2] Counsel self-test: 173 passed, 4 failed  RAW_EXIT=1

=== M-3: MEND_RE に世間の創造の動詞を足す(F-1 へ戻る道) ===
  [M-3] Counsel self-test: 153 passed, 24 failed  RAW_EXIT=1

=== M-4: 強い名の枝から限定詞の除外を消す(R-4 の守りを戻す) ===
  [M-4] Counsel self-test: 167 passed, 10 failed  RAW_EXIT=1

=== M-5: 抽象名にも動詞を課す(修理が広がりすぎた形) ===
  [M-5] Counsel self-test: 171 passed, 6 failed  RAW_EXIT=1

=== M-6: 強い名の枝を殺す(if (false) / 門を「消して」緑にする道 / 第36条) ===
  [M-6] Counsel self-test: 172 passed, 5 failed  RAW_EXIT=1

=== M-7(既存): 弱い名から BUILD_RE の伴需を消す ===
  [M-7] Counsel self-test: 169 passed, 8 failed  RAW_EXIT=1

=== M-9: MEND_RE から「除く」だけを落とす(conclave の毒を除く が死ぬ) ===
  [M-9] Counsel self-test: 173 passed, 4 failed  RAW_EXIT=1

=== 復旧の確認 ===
  [RESTORED] Counsel self-test: 177 passed, 0 failed  RAW_EXIT=0
  ✓ forge.js は原状に戻った
```

**赤くなった門の名**(門を 177 本に増やす前の走で採取した。名は同じである):

| 変異 | 赤くなった門(先頭 4 本) |
|---|---|
| M-1 | AC-36 の 10 件 / AC-37 の 26 件 —— `gauge calibration tracker` `forge 鍛冶屋の…` `synod 教会会議の…` `critic 映画批評…` |
| M-2 | `弱い名も建造の動詞を伴えば reform に留まる (AC-31 の逆向き)` / `強い名は限定詞を伴わなければ…(R-4 の逆向き)` / `強い名は改変の動詞を伴えば…(AC-38)` |
| M-3 | AC-36/37 —— `forge 鍛冶屋の…` `critic 映画批評…` `clergy 聖職者名簿…` `abode 不動産アプリ…` |
| M-4 | R-4 の 9 件 —— `add a gauge widget to my car dashboard` `add a critic score to my movie app` `add a verdict field…` `add a forge upgrade screen…` |
| M-5 | AC-40 と既存の reform 門 —— `楽園の憲法に条を足せ` `ダッシュボードを生きた門にせよ` `improve the harness engine` `門を強化する` |
| M-6 | `gauge に fingerprint を確かめる口を設ける` / AC-31 逆向き / R-4 逆向き / AC-38 |
| M-7 | AC-31 —— `deploy a static site for my blog` `atlas という名の地図アプリを作れ` `CIに合格するためのアプリが欲しい` `顧客のワークフローを…` |
| M-9 | AC-31 逆向き / R-4 逆向き / AC-38 / **AC-41** |

### 3.2 **門の側**を壊す 3 変異 —— F-4 の構造的理由を狙った(生出力)

> reflect §2.4 が名指しした核心: **「変異を設計した者と門を設計した者が同じなら、
> 変異は門の想像の外を撃たない」**。AC-35 の三変異は**全て実装側**を狙っていた。
> ゆえに本相は **門(コーパス)の側を壊す変異**を建てた。

```
=== M-0 基準線 ===
  [M-0] Counsel self-test: 177 passed, 0 failed  RAW_EXIT=0

=== M-8: 弱い名を強い名の表へ戻す(欠陥C へ戻る道 + コーパス照合の門) ===
  [M-8] Counsel self-test: 175 passed, 2 failed  RAW_EXIT=1
        ✗ ENGINE_NAMES が graph/*.js の名を網羅している — 強い名か弱い名のどちらかに (第22条 / 設計 §1.5)
        ✗ 強い名のコーパスが ENGINE_NAMES_STRONG を過不足なく覆っている (AC-37 / F-4)

=== M-10: 強い名を一語(gauge)コーパスから落とす(F-4 の再演) ===
  [M-10] Counsel self-test: 175 passed, 1 failed  RAW_EXIT=1
        ✗ 強い名のコーパスが ENGINE_NAMES_STRONG を過不足なく覆っている (AC-37 / F-4)

=== M-11: 強い名を表へ足しコーパスへ足さない(実際の増設の形) ===
  [M-11] Counsel self-test: 176 passed, 1 failed  RAW_EXIT=1
        ✗ 強い名のコーパスが ENGINE_NAMES_STRONG を過不足なく覆っている (AC-37 / F-4)

=== 復旧 ===
  [RESTORED] Counsel self-test: 177 passed, 0 failed  RAW_EXIT=0
  ✓ 両方とも原状に戻った
```

### 3.3 まとめ

| # | 変異 | 壊した側 | 結果 | 赤くなった門 |
|---|---|---|---|---|
| M-1 | 強い名の枝から動詞の伴需を消す | 実装 | **赤 36 本** | AC-36 / AC-37 / AC-39 |
| M-2 | 強い名の枝から `MEND_RE` を落とす | 実装 | **赤 4 本** | AC-38 / R-4 逆向き / AC-31 逆向き |
| M-3 | `MEND_RE` に創造の動詞を足す | 実装 | **赤 24 本** | AC-36 / AC-37 / AC-41 |
| M-4 | 強い名の枝から限定詞の除外を消す | 実装 | **赤 10 本** | R-4(9 件)/ AC-39 |
| M-5 | 抽象名にも動詞を課す | 実装 | **赤 6 本** | AC-40 / 既存の reform 門 |
| M-6 | 強い名の枝を殺す(`if (false)`) | 実装 | **赤 5 本** | AC-38 / R-4 逆向き |
| M-7 | 弱い名から `BUILD_RE` を消す | 実装 | **赤 8 本** | AC-31 |
| M-8 | 弱い名を強い名の表へ戻す | 実装+表 | **赤 2 本** | AC-34 / **AC-37 照合** |
| M-9 | `MEND_RE` から「除く」一語を落とす | 実装 | **赤 4 本** | AC-38 / AC-41 |
| M-10 | **コーパスから強い名一語を落とす** | **門** | **赤 1 本** | **AC-37 照合** |
| M-11 | **表へ足しコーパスへ足さない** | **門** | **赤 1 本** | **AC-37 照合** |

**11/11 が赤くなった。黙った変異は 0 件である。**
**壊したコードは全て原状に戻した**(`diff -q` で確かめた。上の生出力に在る)。

---

## 4. 完了の定義 —— 生出力

### A. 強い名 26 語すべてを撃ち、reform への誤着が main 以下

**main 側の複製は `git clone --branch main`** で作った(第38条 / `git archive` は `.git` を持たないので
git を読む門が偽の赤を出す)。

```
$ node probe.js "…/Temp/pmain"                          ← main c216014
##### main #####
B群-26 強い名 26 語 × 世間の願い(reform は誤り): 誤着 0/26
B群-10 教主の 10 件(reform は誤り): 誤着 0/10
B群-T tribunal の 19 件(reform は誤り): 誤着 0/19
---- A群 楽園の改修(reform が正解) ----
  誤着 counsel  | 楽園の自己診断に絞り込みの口を設ける
  誤着 counsel  | 門に監査の一段を足す
  誤着 counsel  | CI に ledger --audit を追加する
  誤着 standard | gauge に fingerprint を確かめる口を設ける
  誤着 standard | workspace に口を足す
  誤着 standard | codex に検めの口を足す
  誤着 standard | synod に警告の一段を足す
  誤着 standard | media workflow に口を足す
  誤着 standard | conclave の毒を除く
A群: 誤着 9/9
回帰: NG 6/21
TOTAL_STRONG_NG=0 (26語=0 教主10=0 tribunal19=0)

$ node probe.js "…/paradise"                            ← HEAD ec0694c(修理前)
TOTAL_STRONG_NG=54 (26語=25 教主10=10 tribunal19=19)
A_NG=0  REG_NG=0

$ node probe.js "…/paradise"                            ← HEAD(修理後)
##### HEAD #####
B群-26 強い名 26 語 × 世間の願い(reform は誤り): 誤着 0/26
B群-10 教主の 10 件(reform は誤り): 誤着 0/10
B群-T tribunal の 19 件(reform は誤り): 誤着 0/19
---- A群 楽園の改修(reform が正解) ----
A群: 誤着 0/9
---- 回帰コーパス ----
回帰: NG 0/21
TOTAL_STRONG_NG=0 (26語=0 教主10=0 tribunal19=0)
A_NG=0  REG_NG=0
```

**HEAD 0/55 ≤ main 0/55。回帰は消えた。** かつ A群は main(誤着 9/9)より良いまま(誤着 0/9)。

> **一件の正直**: 修理前の HEAD が 55/55 でなく **54/55** だったのは、
> `graph-engine 折れ線グラフ描画ライブラリのデモサイト` が **`cartography` に先に捕まった**
> ためである(判定順で作図が reform より先に立つ)。
> **強い名の枝が守ったのではない。別の段が偶々受け止めただけである。**

### B. 回帰コーパス(教主の 24 件形)が全件保たれる

```
回帰: NG 0/21
```

一件ずつ実測で名指す:

| 願い | 期待 | 実測 |
|---|---|---|
| 楽園の自己診断に絞り込みの口を設ける | reform | **reform** ✓ |
| 門に監査の一段を足す | reform | **reform** ✓ |
| CI に ledger --audit を追加する | reform | **reform** ✓ |
| gauge に fingerprint を確かめる口を設ける | reform | **reform** ✓ |
| workspace に口を足す | reform | **reform** ✓ |
| 健康診断アプリが欲しい | counsel **でない** | **full** ✓ |
| 楽園の位階の相関図を作れ | cartography | **cartography** ✓ |
| 楽園のエンジンを監査してほしい | counsel | **counsel** ✓ |
| 台帳の毒を直す | quick | **quick** ✓ |
| build a habit tracker app | full | **full** ✓ |
| 比較表がほしい | counsel | **counsel** ✓ |
| 世間の弱い名 10 件(workflow/identity/vendor/contract/census/pulse/deploy/atlas/ci/ワークフロー) | reform **でない** | **全件 reform でない** ✓ |

### C. `counsel.test.js` / `abandoned-run.test.js`

```
$ node tests/counsel.test.js
Counsel self-test: 177 passed, 0 failed
COUNSEL_EXIT=0

$ node tests/abandoned-run.test.js
abandoned-run: 33 passed, 0 failed
ABANDONED_EXIT=0
```

**門の数の前後: 134 → 177(+43)。0 failed。**

### D. `wiring.js check`

```
$ node graph/wiring.js check
═══ 🔗 WIRING GATE (第44条 / 第48条) ═══
  engine 39 / 内の辺 73
  · 門の除外 1 件: tests/_pulse-fixture.js — 門ではなく、pulse の門が読む作り物の的である
  ✓ 門 19 本すべてに走らせる者が居る (第44条)
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
WIRING_EXIT=0
```

### E. `paradise.test.js` 全走(background)

```
$ node tests/paradise.test.js          ← 修理後
Paradise self-test: 471 passed, 0 failed
PARADISE_EXIT=0
✓行=584  ✗行=0
```

**471 本すべて緑のまま。本数は据え置き**(新しい門は `counsel.test.js` 側に建てたため)。
修理**前**の全走も撃った —— 同じく `471 passed, 0 failed`。
**すなわち `paradise.test.js` は F-1 について修理の前後で一字も変わらない。**
reflect §2.4 が名指した通り、**471 本は F-1 の面を一度も見ていない**。

### F. `census.js fix` → `check`(background)

生出力は §4.1 に記す。

### G. その他の門(自分で撃った)

```
$ node graph/codex.js check      → ✓ 索引は本文と一致している (60 条)   EXIT=0
$ node graph/workspace.js check  → ✓ 混入なし・直書きなし・流出なし      EXIT=0
$ node graph/derived.js check    → no test depends on derived content   EXIT=0
```

---

## 5. **自分が見ていない項目**(名乗り / 第37条)

「撃っていないので安全」とは書かない。以下は本相で**一度も撃っていない**か、**確信を持てない**。

| # | 面 | 残る疑い |
|---|---|---|
| B-1 | **`MEND_RE` の語彙が `COUNSEL_JA` と重なる** | **実測した**: `見直` `改善` は `COUNSEL_JA` にも居る。判定順で counsel が先に立つので `gauge の重みを見直す` → **counsel**、`gauge の重みを直す` → **reform** に割れる。この振る舞いを門で固定した(§2 の表)が、**「見直す」が counsel に着くのが正しいかは裁いていない**。教主に問うべき問いである |
| B-2 | **`MEND_RE` の ReDoS** | **粗く計った**(`直`×200000 = 0.33ms / `fi`×200000 = 0.61ms — 二乗の兆候なし)。門も据えた(100000 で 200ms 未満)。ただし **`REFORM_ABSTRACT_RE` / `REFORM_STRONG_RE` の分割後の計測はしていない**(security 相 U-1 を引き継ぐ) |
| B-3 | **強い名 26 語の願い文は自分が作った** | reflect §3.2(c)「神官は自分が書いたコーパスの外へ出ない」の**三度目の再演の危険**。教主の 10 件と tribunal の 19 件は外から来たが、**残り 16 語分の願いは自分が考えた**。同じ理解の外は撃てていない。**これが本相で最も確信を持てない点である** |
| B-4 | **F-2(`denude` の自傷)を直していない** | **実測**: `forge.js の道選びを直せ` → **standard** / `forge の道選びを直せ` → **reform**。修理後も変わらず。main から在る病であり本相の射程外だが、**`.js` を書いた方が道を失う**不条理は残っている |
| B-5 | **F-3(AC-34 の 4 文字未満除外)を直していない** | **実測**: `kg を直せ` → **standard**。`kg` が表に無いまま AC-34 は永久に緑。main から在る |
| B-6 | **AC-30 の門(`forge.js` の `scale` 口の CLI)を立てていない** | verdict §4 が「最も重い」と裁いたもの。**`chooseScale` を直に呼んだだけで、CLI と割れていないかは撃っていない** |
| B-7 | **実 GitHub Actions 上の挙動** | 掟により push しない |
| B-8 | **Windows 以外の機械** | 本機は Windows/MSYS のみ |
| B-9 | **`REFORM_RE` の後方互換の束ねを残したこと** | `grep` で外部の `.js` から `REFORM_RE` を**判定目的で**呼ぶ者が居ないことは確かめた(名指しは `.md` と註釈のみ)。だが **`module.exports` から消さずに残したので、将来誰かが「無条件で真」の意味で使いうる**。消すべきだったかもしれない —— **註釈で「判定には使わない」と書いたが、註釈は門ではない**(第16条) |
| B-10 | **枝 2 と枝 3 の非対称が「最良」であることの証明** | 「証拠の強さが許す範囲を決める」は**筋の通った説明**だが、**実測ではなく論証**である。`fix the vendor page` → **quick**(reform でない)ことは撃ったが、**非対称が最良であることは証明していない** |
| B-11 | **弱い名に `MEND_RE` を課したらどうなるか** | 撃っていない。`fix my census explorer` → 今は **quick**。弱い名に `MEND_RE` を許せば reform へ攫われると読んだが、**実験していない** |

---

## 6. 刻むべき教訓(kg へ)

| id | 教訓 | applies |
|---|---|---|
| `strength-of-evidence-sets-the-gate` | 判定の枝が複数の証拠を持つとき、**証拠の強さが許す条件の広さを決める**。強い証拠に弱い証拠と同じ条件を機械的に写すと、片方が壊れる(`conclave の毒を除く` が `BUILD_RE` で死ぬ) | `forge` |
| `mutate-the-gate-not-only-the-impl` | 故障注入が**実装側だけ**を狙うなら、門のコーパスの穴は永久に見つからない。**門(コーパス・照合)の側を壊す変異を必ず一つ以上持て** | `gate` |
| `corpus-must-be-machine-checked-against-its-table` | 「表の全語を撃っている」という主張は、**表とコーパスを機械で照合して**初めて真になる。人が足し忘れれば F-4 は再演する | `gate` |
| `restore-path-must-be-verified` | 故障注入の**復旧経路が黙って失敗する**と、以降の全ての測定が嘘になる。復旧の後に `diff` で原状復帰を確かめよ | `gate` |
