# 楽園 — 弱い印の二病(PARA-10 / PARA-11)修理の受け入れ基準 (reform/weak-signs / specify 相)

- 走行日: 2026-09-17
- 枝: `reform/weak-signs`
- 作業根: `C:/Users/kikus/Documents/workspace/paradise`
- 前相の記録: `reform/weak-signs/findings.md`(729 行 / discover 相の実測)
- 残債の正本: `reform/judgment-triad/debt.md`(PARA-10 / PARA-11 を凍らせた帳)
- 掟: **本書の全ての数は findings.md の節番号を添えるか、本相で自ら実測した生出力を添える。**
- 本相は実装しない。`graph/` も `tests/` も一行も変えていない(第9節の `git status` で確認)。

## 0. 本書の読み方 — 「機械が裁ける」とは何か

本書の AC はすべて次の三つを備える(前走行 `reform/judgment-triad/requirements.md` §0 の作法を継ぐ):

1. **命令** — 人が目で見るのではなく、`node …` を一本走らせて exit code と行を読む。
2. **門の名** — 既存門の名(ファイル + テスト名)か、新設なら**ファイル名案**。
3. **数** — 閾値か等号。「良くなる」「改善する」のような裁けない語を書かない。

**AC とは、満たさぬとき赤い行を吐く命令のことである。**

---

## 1. 本相が新たに実測したこと(裁定の土台)

discover 相は「合格線をどう引くかは design 相の裁定事項」と申し送った(findings §4.6-1)。
**受け入れ線を数で決める前に、割り方が正当であることを測らねばならない。** ゆえに読むだけの計測器を六本足した。
**本物の `graph/` `tests/` は一行も書き換えていない**(全て `require.cache` 注入 + `$LOCALAPPDATA/Temp` の写し)。

### 1.1 本相が足した計測器

| 計測器 | 何を測るか | 出力 |
|--------|-----------|------|
| `_spec_x4resid.js` | 最有力 X4 の残余 20 件を**一件ずつ名指しで**取り出す | `_spec_x4resid_out.txt` |
| `_spec_x4prime.js` | **X4′**(X4 から種H の逐語暗記を抜いた形)の種M / 行列 / 既存門 | `_spec_x4prime_out.txt` |
| `_spec_split.js` | 誤着を**機械的な規則**で種M / 種H に割り、X4′ の残余と集合照合 | `_spec_split_out.txt` |
| `_spec_x4pp.js` | **X4″**(X4′ + 「門人」)の耐久 / AC-45 の的 / counsel:652 の 20 語 | `_spec_x4pp_out.txt` |
| `_spec_ledger.js` | **受け入れ帳 / 射程帳**の割り方を件数で確定する | `_spec_ledger_out.txt` |
| `_spec_noR2.js` | 英語の `\b` を**当てない**形で種M が 0 になるか(§3.3 の裁定の根拠) | `_spec_noR2_out.txt` |

補助: `_spec_classify.js` / `_spec_m13.js` / `_spec_ac45.js` / `_spec_ledger_probe.js` / `_spec_dumpcorpus.js`(いずれも読むだけの的)。

### 1.2 【最重要の新実測】X4 の紛れ語表は**三種の語を混ぜている**。うち一種は第60条違反である

findings §4.6 が最有力とした **X4** の `REFORM_FALSE_FRIENDS` を語ごとに分けると:

| 群 | 語の例 | 正体 | 掟の評価 |
|----|--------|------|---------|
| (a) | `一門` `専門` `部門` `名門` `入門` `門限` `登竜門` … 20 語 | **日本語には `\b` が無い**ことの代用 | **正当。** 語境界の機械的な実装である |
| (b) | `engineering` `gateway` `delegate` `aggregate` `navigate` `priesthood` `self-improvement` | R2 の `\b` と**完全に冗長** | 不要。`\b` が同じ仕事をする |
| (c) | `常夏の楽園` `検索エンジン` `カトリック枢機卿` `神社の神官` `音楽のオーケストレーション` … | **種H の的そのものの逐語暗記** | **第60条違反。** 「弱い印は表を足しても強くならない」が名指しで禁じた形 |

**群 (c) は「本走行のコーパスに載っている種H の的だけ」を名指しで消している。**
これは判定器の修理ではなく**答案の暗記**であり、コーパスの外の種H(`熱帯の楽園` `自動車エンジン` `northern cardinal`)には
一切効かない —— findings §4.5 の X4 耐久 枝B 6/10 がその証拠である。

> ⚠️ **X4 の行列 152/172 という数字は、群 (c) が暗記した分だけ水増しされている。**
> 教主が「別帳に分けることが門を緩める言い訳になってはならない」と命じた第21条の危険は、
> **帳を分けることではなく、X4 をそのまま採ることの側に在った。**

ゆえに本相は群 (b)(c) を剥がした形を定義して測った:

- **X4′** = R2(英語 10 印に `\b`) + R3′(群 (a) だけの表 20 語) + P3
- **X4″** = X4′ + `門人`(耐久 枝B が名指しした唯一の穴 / §1.5)

### 1.3 【実測】X4′ は種M を **13/13 全件** 塞ぐ

```bash
$ node reform/weak-signs/_spec_x4prime.js
```

```
═══ Q1. 種M 13 件 — 語境界だけで塞げるか ═══
  ok [種M] "build a civil engineering estimate app"  isReformSubject=false  ->full
  ok [種M] "一門の家系図を作れるアプリが欲しい"  isReformSubject=false  ->full
  ok [種M] "専門店の在庫を管理するシステムを作って"  isReformSubject=false  ->full
  ok [種M] "部門別の売上を集計するコマンドを実装して"  isReformSubject=false  ->standard
  ok [種M] "名門校の受験対策アプリが欲しい"  isReformSubject=false  ->full
  ok [種M] "入門講座の進捗を記録する機能を実装して"  isReformSubject=false  ->standard
  ok [種M] "implement a gateway timeout retry helper"  isReformSubject=false  ->standard
  ok [種M] "build an app to investigate delegate voting records"  isReformSubject=false  ->full
  ok [種M] "create a script to aggregate the daily sales rows"  isReformSubject=false  ->standard
  ok [種M] "implement a navigate-back button for the wizard"  isReformSubject=false  ->standard
  ok [種M] "implement a self-improvement streak counter"  isReformSubject=false  ->standard
  ok [種M] "build a self-improvement journal app"  isReformSubject=false  ->full
  ok [種M] "build a priesthood directory app for the diocese"  isReformSubject=false  ->full

種M で今なお reform を名乗る件数: 0 / 13
```

**種M は語境界で全件塞げる。** これが「種M は 0 件」という受け入れ線を要求できる根拠である(AC-1)。

### 1.4 【実測】X4′ の残余 32 件は**全件が種H**。第三の病は無い

種の判定を**機械的な規則**で書いた(目で割っていない / `_spec_classify.js`):

- **種M** := 日本語なら「門」の複合語に当たる / 英語なら素の印が真かつ `\b` 版の印が偽(= 語中埋没)
- **種H** := 上記でない誤着(= 印が独立した語として当たっている)

```bash
$ node reform/weak-signs/_spec_split.js
```

```
【base】誤着 52 件  (種M 16 / 種H 36)
【x4p】誤着 32 件  (種M 0 / 種H 32)

═══ ③ 照合: 「X4′ の残余」==「基準線の種H」か ═══
  基準線の種H: 36 件   X4′ の残余: 32 件
  種H なのに X4′ で直った(= 表以外の力で直った): 4
    ・相関図を描けるアプリを作って
    ・人口分布の構成図を出力するツールを作る
    ・窓口の導線を図示するコマンドを実装して
    ・相場の推移を可視化するツールを作る
  X4′ の残余なのに種H でない(= 第三の病 / 新規の誤着): 0
```

読み方は三つある:

1. **「X4′ の残余なのに種H でない」が 0 件** —— X4′ は**新しい病を一件も作っていない**。
   残るのは全て、修理前から在った同音異義だけである。
2. **種H 36 件のうち 4 件は X4′ で直った。** これらは PARA-11 の族(`相関` `人口` `窓口` `相場` が
   `PRODUCT_FALSE_FRIENDS` に当たる形)であり、**表ではなく P3(削ってから探す)の力で直っている**。
   すなわち「種H は塞げない」は `REFORM_RE` の種H についての断定であって、
   **PARA-11 の種H は構造の修理で塞げる**。この非対称が帳を分ける線そのものである。
3. 基準線の種M は 16 件(findings §2(a)-2 の 13 件 + PARA-11 コーパス側の「門」3 件 + P11c の `専門` 1 件)。
   findings の 13 件は `_probe_para10.js` の 46 件の中だけを数えた値であり、**172 件コーパス全体では 16 件**である。
   食い違いではなく、母集団が違う。

### 1.5 【実測】「門」の複合語表もまた閉じていない —— だが**穴は名指しで一つ**だった

findings §4.5 は X4 の耐久 枝B に残る欠落 4 件を名指しした。X4′ で走らせ直すと:

```bash
$ node reform/weak-signs/_cand_stress.js X4P
```

```
  ✗   [B-世間] "武道の流派の門人名簿アプリが欲しい" -> reform    ← 表に「門人」が無い(種M / 塞げる)
  ✗   [B-世間] "自動車エンジンの整備記録アプリが欲しい" -> reform  ← 種H(塞げない)
  ✗   [B-世間] "build a birdwatching app for the northern cardinal" -> reform ← 種H
  ✗   [B-世間] "熱帯の楽園を紹介する旅行サイトを作れ" -> reform    ← 種H
  枝B(世間を攫わない): 6/10
```

`門人` を足した **X4″** で測り直すと:

```bash
$ node reform/weak-signs/_spec_x4pp.js
```

```
  ok  [B-世間] "武道の流派の門人名簿アプリが欲しい" -> full  (reform でなければ良)
  枝A(楽園を失わない): 9/10   枝B(世間を攫わない): 7/10   枝C: 10/10   枝D: 10/10   枝E: 8/8   合計 44/48
```

**耐久 44/48 は X4(43/48)を上回る。** しかも X4″ の表は X4 より**短い**(20+1 語 対 41 語)。
残る枝B の ✗ 3 件は**全件が種H**であり、枝A の ✗ 1 件(`wire the orchestration pipeline to the audit ledger`)は
findings §4.5 が「全候補で ✗ / `audit` が `COUNSEL_EN` に当たる**既知の設計**」と裁定済みで、本走行の病ではない。

> **第60条への服従の証拠**: 表に足した語は `門人` **一語だけ**であり、それは
> 「日本語の語境界」という**一つの規則**の実装であって、的の暗記ではない。
> 表が閉じないことは消えない —— だからこそ AC-3 の新設門が「表が語境界の代用に留まっているか」を撃つ。

### 1.6 【実測】受け入れ帳と射程帳に割ったときの数

```bash
$ node reform/weak-signs/_spec_ledger.js
```

```
射程帳の候補(X4′ の残余): 32 件  (種H 32 / 種M 0)

═══ ② 基準線(main そのもの)での受け入れ帳 ═══
  受け入れ帳 140 件 + 射程帳 32 件 = 172 (コーパス 172)
  受け入れ帳の対角: 120 / 140   非ゼロ非対角セル: 4 / 30
  受け入れ帳の道ごとの件数: counsel=19, cartography=15, reform=15, quick=15, standard=42, full=34
  射程帳の道ごとの件数:   counsel=0, cartography=0, reform=0, quick=0, standard=17, full=15
  射程帳で今なお誤着: 32 / 32 (xfail の門はこれを凍らせる)

═══ ③ X4″ を当てたときの受け入れ帳 ═══
  受け入れ帳の対角: 140 / 140   非ゼロ非対角セル: 0 / 30
```

**受け入れ帳 140 件は、基準線では 120/140(非対角 4 セル)であり、X4″ で 140/140(非対角 0 セル)になる。**
すなわち **第61条の合格線「非対角の各セルが 0」は、帳を分けた上で到達可能である。**

---

## 2. 【裁定】受け入れコーパスと「病の射程を測る的」を別の帳に分ける

**裁定: 分ける。172 件を受け入れ帳 140 件と射程帳 32 件に割る。**

### 2.1 割る線は「件数の都合」ではなく「原理」である

射程帳に入れる的は、次の**二条件の両方**を満たすものに限る:

- **(i) 種H である** —— 印が**独立した語**として当たっている。
  語境界でも複合語表でも文脈でも触れない(findings §5-2 / 本相 §1.4 の機械的な照合)。
- **(ii) 語境界の修理を全部当てた形(X4′)でも**なお誤着する。

**「表を足せば直るが、足していないから直っていない」的は射程帳に入れない。**
これが第21条の担保である —— 第60条が禁じた「表を足す」修理を拒んだ結果として残る的だけが、
「原理的に塞げない」と名乗る資格を持つ。

条件 (ii) を機械で確かめた結果が §1.4 の照合である: **X4′ の残余 32 件は全件が種H、種M は 0 件。**
逆向きも確かめた —— 「種H なのに X4′ で直った」4 件は射程帳に**入れない**(受け入れ帳に残す)。
直るものを射程帳に逃がすことこそが門を緩めることだからである。

### 2.2 割った結果(件数で定める / 第2.1節の条件で機械的に選別)

| 帳 | 件数 | 中身 | 合格線 |
|----|------|------|--------|
| **受け入れ帳** | **140** | 前走行 101 件 + 残債 2 件 + 種M の的 + PARA-11 の族 + 種H のうち構造の修理で直るもの | **対角 140/140 / 非対角の 30 セルすべて 0**(第61条) |
| **射程帳** | **32** | 「`REFORM_RE` の種H」= 独立語として当たる同音異義。**全件 `→reform` の誤着** | **32/32 が誤着のまま凍る**(xfail) |
| 合計 | **172** | | 数が閉じる(第37条) |

射程帳 32 件の道ごとの内訳: `standard=17, full=15`(`counsel`/`cartography`/`reform`/`quick` は 0)。
すなわち **射程帳は `standard→reform` と `full→reform` の二セルにしか触れない。**

射程帳 32 件の印ごとの内訳(いずれも `REFORM_RE` の印が独立語として当たる):

| 印 | 件数 | 代表 |
|----|------|------|
| 楽園 / paradise | 4 | `常夏の楽園を巡るリゾート予約アプリが欲しい` / `build a fan wiki for paradise lost` |
| ハーネス / harness | 4 | `登山用ハーネスの通販サイトを作れ` |
| 憲法 / constitution | 3 | `日本国憲法の条文を検索できるアプリが欲しい` |
| engine / エンジン | 4 | `検索エンジンの順位を追うアプリが欲しい` |
| パイプライン / pipeline | 4 | `石油パイプラインの保守記録システムを作って` |
| 自己改善 | 2 | `自己改善の習慣を記録するアプリが欲しい` |
| オーケストレーション / orchestration | 4 | `音楽のオーケストレーション譜面を印刷する機能を実装して` |
| 枢機卿 / cardinal | 4 | `implement a cardinal direction compass widget` |
| 神官 / priest | 3 | `神社の神官の当番表を管理するアプリが欲しい` |

**20 印のうち 17 印に射程帳の的が在る。** 的を持たない 3 印は `門` / `gate`(**全件が種M** なので受け入れ帳に残る)と
`self-improve`(英語の的が無く、`自己改善` の 2 件が日本語側で先に当たる)である。
実測: `node -e "…射程帳 32 件を印ごとに数える…"` → `的を持つ印の数: 17 / 20  的が無い印: 門, gate, self-improve`

### 2.3 分けることが第21条に触れない理由(前走行 §3.4-4 の論法を継ぐ)

1. **既存の的は一件も落ちない。** 射程帳の 32 件は**全て本走行の discover 相が自ら発明した的**である
   (`_matrix.js` の tag が全件 `P10`)。既存門 `tests/route-matrix.test.js` のコーパス 102 件にも、
   `tests/counsel.test.js` の 210 門にも、一件も含まれない。
2. **既存門の FLOOR は上げることしかしない。** AC-6 が `standard 16→26` / `full 16→26` / 総数 `102→122` を要求する。
3. **受け入れ帳は緩まず、むしろ厳しくなる。** 基準線 120/140 は **20 件の穴が実在する**ことを示しており、
   合格線 140/140 はその 20 件を**全件直せ**という要求である。前走行の 101/101 より 39 件重い。
4. **射程帳は「無い」ことにしない。** AC-4 が xfail 門でその 32 件を凍らせ、
   誰かが直した瞬間に**赤くなる**。緩めるとは黙って外すことであり、赤くなる形で凍らせることは債務の記録である。

> ⚠️ **これは「第61条の合格線を 172 件から 140 件に下げた」のではない。**
> 172 件のコーパスは**そもそも受け入れ線ではなかった** —— findings §3 が明記するとおり、
> これは「病の射程を測る的」として意図的に病の的を大量に積んだ計測器である。
> 本書はその計測器から**受け入れ線として使える部分を切り出した**のであって、線を下げてはいない。

### 2.4 種M と種H で受け入れ線を分ける(数で)

| 病の種 | 件数(172 件コーパス中 / 基準線の誤着) | 受け入れ線 | 撃つ門 |
|--------|--------------------------------------|-----------|--------|
| **種M(語中埋没)** | 16 | **0 件。全件直せ** | AC-1(新設 `tests/reform-sign.test.js`) |
| **種H のうち PARA-11 の族**(`PRODUCT_FALSE_FRIENDS` の文全体無効化が原因) | 4 | **0 件。全件直せ** | AC-2(既存 `tests/route-matrix.test.js` M-3) |
| **種H のうち `REFORM_RE` の族**(独立語の同音異義) | 32 | **32 件が誤着のまま凍る。別帳で xfail** | AC-4(新設 `tests/reform-reach.test.js`) |
| 合計 | 52 | | |

---

## 3. その他の裁定

### 3.1 【裁定】英語の印の `\b` 欠落は**本走行で直す**(別件に割らない)

findings §5-3 が新たに見つけた病(残債表に無い)。**本走行の範囲に入れる。** 根拠は三つ、いずれも実測。

**根拠 1: `\b` 無しでは AC-1(種M は 0 件)が原理的に達成できない。**

```bash
$ node reform/weak-signs/_spec_noR2.js      # X4″ から R2(英語の \b)だけを剥がした形 Y
```

```
種M で今なお reform を名乗る件数: 8 / 13
  ✗ [種M] "build a civil engineering estimate app"        -> reform
  ✗ [種M] "implement a gateway timeout retry helper"      -> reform
  ✗ [種M] "build an app to investigate delegate voting records" -> reform
  ✗ [種M] "create a script to aggregate the daily sales rows"   -> reform
  ✗ [種M] "implement a navigate-back button for the wizard"     -> reform
  ✗ [種M] "implement a self-improvement streak counter"   -> reform
  ✗ [種M] "build a self-improvement journal app"          -> reform
  ✗ [種M] "build a priesthood directory app for the diocese"    -> reform

  受け入れ帳の対角: 132 / 140   非ゼロ非対角セル: 2 / 30
```

**`\b` を当てなければ受け入れ帳は 132/140 で止まり、非対角セルが 2 つ残る。** 第61条の合格線に届かない。
`\b` を別件に割るなら本走行の合格線も 132/140 に下げねばならず、それは第21条が禁じた「緩め」である。

**根拠 2: 同じ一つの病である。** 種M の定義は「印がより長い語の一部として当たっている」であり、
日本語の `一門⊃門` と英語の `gateway⊃gate` は**同一の欠陥の二つの現れ**にすぎない。
片方だけ直して「直した」と名乗れば、findings §5-3 が名指しした発見を黙って落とすことになる(第16条)。

**根拠 3: `\b` は表ではない。** 第60条が警告するのは「表を足す」修理である。`\b` は語彙を一語も足さず、
**印の当たり方の規則**を直す。表が閉じない問題を一切持ち込まない。

> 註: `\b` は日本語の文字には効かない(`門` に `\b` を付けても意味を成さない)。
> ゆえに日本語側は複合語表 (§1.2 群 (a)) が語境界の代用を務める。**これが二枝の実装である**(第60条(b))。

### 3.2 【裁定】AC-45 の書き換え —— 「main と同じ」を「紛れ語は reform でない」へ

`tests/counsel.test.js:828` の AC-45 は現在こう書かれている:

```js
test('「門」の紛れ語は main と同じ振る舞いである (AC-45 / 本走行は悪化させていない)', () => {
  for (const wish of ['専門店の棚の傾きを直したい', '部門別の売上の誤りを直したい']) {
    assert.strictEqual(forge.chooseScale(wish), 'reform',
      `「門」の紛れ語の振る舞いが main から変わった — 良くなったなら門を書き換え、`
      + `悪くなったなら直せ: ${wish}`);
  }
  for (const wish of ['門に監査の一段を足す', '門の判定を書き換える', '門を強化する']) {
    assert.strictEqual(forge.chooseScale(wish), 'reform', `本物の門が reform を失った — ${wish}`);
  }
});
```

**この門は「誤りを誤りのまま凍らせた xfail」である。** assert 自身が「良くなったなら門を書き換えよ」と命じている。
X4″ で二件がどう動くかを実測した:

```bash
$ node reform/weak-signs/_spec_x4pp.js
```

```
── AC-45 の的(紛れ語 / 門が現在 reform を期待している 2 件)──
  "専門店の棚の傾きを直したい"  -> quick
  "部門別の売上の誤りを直したい"  -> quick
── AC-45 の逆向き(本物の門 / reform を失ってはならない 3 件)──
  "門に監査の一段を足す"  -> reform
  "門の判定を書き換える"  -> reform
  "門を強化する"  -> reform
```

**二件とも `reform` → `quick` に改善した。** 正解は `quick`(「棚の傾きを直したい」「売上の誤りを直したい」は
一点の修繕であり、楽園の改修ではない)。逆向きの 3 件は無傷である。

**要求する書き換え(AC-9):**

```js
test('「門」の紛れ語は楽園を名乗らない (AC-45 / PARA-10 を払った)', () => {
  // ⚠️ この門は reform/weak-signs で xfail から**正の門へ昇格**した。
  //    以前は「main と同じく reform へ落ちる」ことを凍らせていた(= 誤りの記録)。
  //    `REFORM_FALSE_FRIENDS` が「門」の複合語を語境界として扱うようになったので、
  //    **世間の「門」は reform を名乗らない**ことを直に撃つ形に書き換えた。
  for (const wish of ['専門店の棚の傾きを直したい', '部門別の売上の誤りを直したい']) {
    assert.strictEqual(forge.chooseScale(wish), 'quick',
      `「門」の紛れ語が楽園の改修の道へ攫われた — PARA-10 の回帰: ${wish}`);
  }
  // 逆向き: 本物の門は今まで通り無条件で楽園を名指す(第60条(b): 規則を足したら両枝を持て)
  for (const wish of ['門に監査の一段を足す', '門の判定を書き換える', '門を強化する']) {
    assert.strictEqual(forge.chooseScale(wish), 'reform', `本物の門が reform を失った — ${wish}`);
  }
});
```

**禁止事項(第21条):**
- `|| true` で黙らせること
- `assert.notStrictEqual(…, 'reform')` のような**緩い形**にすること
  (`quick` と等号で撃て。`reform` でなければ何でもよいなら、`counsel` へ落ちても緑になる)
- テスト名から `AC-45` の札を消すこと(追跡が切れる)
- 門ごと削除すること(削れば `門` の族を撃つ門が一本も無くなる)

### 3.3 【裁定】`full→standard` の新規誤着 1 件 —— **X4″ では生まれない。ゆえに承知の代価として帳に載せない**

findings §4.6-2 は「`full→standard` の 1 件は X3/X4 で**新たに生まれた**誤着であり、
実装の相は必ず名指しで潰すか、承知の代価として帳に載せよ」と申し送った。**名指しで潰す。**

**その 1 件の正体**(`_spec_x4resid.js` の生の写し):

```
  [full → standard] : 1 件
      ・コンテナオーケストレーションの監視ダッシュボードを作って   (new/P10)
```

**真因は X4 の紛れ語表の群 (c) である。** 表に `コンテナオーケストレーション` が入っているため、
`isReformSubject` がそれを削って印を探す。ところが削った後の文字列は
「の監視ダッシュボードを作って」となり、`full` を名乗らせる語(`アプリ`/`サイト`/`システム`)を失う。
すなわち **種H を逐語暗記したことの副作用**であり、修理そのものの代価ではない。

**X4″(群 (c) を持たない)で測り直すと消える:**

```bash
$ node reform/weak-signs/_spec_x4pp.js
```

```
正解\実際               counse      cartog      reform       quick      standa        full     計
standard                 0           0          17           0          42           0      59
full                     0           0          15           0           0          34      49

非ゼロの非対角セル数: 2 / 30   誤着の総数: 32
```

**`full→standard` セルは 0 件である。** 非対角セルは 3 → **2** に減り、その 2 セルは
**射程帳 32 件が占める二セルと完全に一致する**(§1.6 ③: 受け入れ帳では 0/30)。

> **裁定: 承知の代価として帳に載せる必要は無い。原因ごと消える。**
> ただし**消えたことを撃つ門が要る** —— AC-7 が `full→standard` セルが 0 であることを名指しで撃つ。
> 原因(群 (c) の逐語暗記)を再び持ち込めば、この門が鳴る。

### 3.4 【裁定】PARA-11 の修理形 —— `DIAGRAM_FALSE_FRIENDS` の「onlyWeak に絞る」形をどう移すか

findings §2(c)-1 が名指しした健全な作法:

```js
const onlyWeak = !<強い作図語>.test(wish);
if (onlyWeak && DIAGRAM_FALSE_FRIENDS.test(wish)) return false;   // 打ち消しを弱い印に限定
```

**これを `wantsProduct` / `isCartography` に移す形は「onlyWeak の条件式」ではなく「削ってから探す」である。**
理由は構造の違いにある:

- `DIAGRAM_RE` は弱い印(`図に`/`図を`)と強い印(`相関図`/`系統図`…)が**別の正規表現に切り出せる**。
  ゆえに `onlyWeak` という**述語**が書ける。
- `PRODUCT_RE` / `PRODUCT_STRONG_RE` は**同じ文に強弱が同居する**
  (「専**門**店のサイト」= 弱い印 `門` と強い印 `サイト` が別の箇所に在る)。
  ゆえに文全体を見る述語では分けられず、**紛れ語の一致箇所を削る**ことでしか強弱を分離できない。

**すなわち「削ってから探す」は onlyWeak の一般形である** —— 紛れ語の一致箇所を消した後に
強い印が残るなら、それは「弱い印だけで当たったのではない」。findings §2(b) の実測
(`現在 false → 削れば true になる願い: 23/24`)がこれを裏付ける。

要求する形(AC-2 / AC-8):

```js
function wantsProduct(w) {
  // ★ PARA-11: 紛れ語の**一致箇所ごと全体**を削ってから強い名を探す。
  //    文全体を無効化してはならない —— 同じ文の「アプリ」まで巻き添えで死ぬ。
  //    削る単位は「一致箇所ごと全体」である(findings §2(d): 窓口 から 窓 だけ削ると 口 が残る)。
  const stripped = String(w).replace(new RegExp(PRODUCT_FALSE_FRIENDS.source, 'gi'), ' ');
  if (PRODUCT_STRONG_RE.test(stripped)) return true;
  return PRODUCT_RE.test(stripped);
}

function isCartography(wish) {
  if (!DIAGRAM_RE.test(wish)) return false;
  // ★ PARA-11: 作図の打ち消しも**同じ形**に揃える。
  //    旧: if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;
  //        ← 紛れ語が在るだけで打ち消しが丸ごと死に、図一枚で返る(findings §2(c)-2 で 6/6 誤着)
  {
    const _s = String(wish).replace(new RegExp(PRODUCT_FALSE_FRIENDS.source, 'gi'), ' ');
    if (PRODUCT_STRONG_RE.test(_s)) return false;
  }
  const onlyWeak = /* 既存のまま */;
  if (onlyWeak && DIAGRAM_FALSE_FRIENDS.test(wish)) return false;   // ← 既に健全。触るな
  …
}
```

**二箇所を同じ commit で直すこと。** findings §4.4-3 の実測: `wantsProduct` だけ直しても
`isCartography` は別の行で `PRODUCT_FALSE_FRIENDS` を見ているので無傷(耐久 枝E で P1/P2 = 0/8)。

**`isCartography` の `onlyWeak` の行(`DIAGRAM_FALSE_FRIENDS` 側)は触ってはならない** —— findings §2(c)-1 が
8/8 で健全と実測した。触れば作図の道 15 件が危うい。

### 3.5 【裁定】新設すべき門 —— `REFORM_RE` を直に撃つ門は**二本**要る

findings §4.6-5 が「`REFORM_RE` を直に撃つ門が無い」と申し送った。正確には
`tests/counsel.test.js:652`(`REFORM_RE は main の抽象名を過不足なく持つ`)が**表の中身**を撃っているが、
**当たり方(語境界)を撃つ門は一本も無い**。新設するのは次の二本である:

| 新設門 | 何を撃つか | AC |
|--------|-----------|-----|
| **`tests/reform-sign.test.js`** | 種M が 0 件であること / `REFORM_FALSE_FRIENDS` が**語境界の代用に留まっている**こと / 楽園の願いが reform を失わないこと | AC-1 / AC-3 / AC-5 |
| **`tests/reform-reach.test.js`** | 射程帳 32 件を **xfail で凍らせる**こと / 帳(`reach.md`)と門の一致 | AC-4 |

**なぜ一本にまとめないか**: 性質が正反対だからである。`reform-sign` は**緑であるべき門**、
`reform-reach` は**誤りを誤りのまま凍らせる門**(赤くなることが仕事)。同じファイルに置けば、
前走行 `route-debt.test.js` と `route-matrix.test.js` を分けた理由(debt.md §1)と同じ混乱が起きる。

---

## 4. 受け入れ基準 (AC)

### 4.1 病の種ごとの受け入れ線

#### AC-1 — 種M は 0 件(語中埋没は全件塞ぐ)

`REFORM_RE` の印が**より長い語の一部**として当たることで `reform` へ攫われる願いは、**一件も残ってはならない**。

- **数**: 種M の的 16 件すべてについて `isReformSubject(denude(wish)) === false` かつ `chooseScale(wish) !== 'reform'`。
  **16/16。部分点は無い。**
- **撃つ門**: **新設 `tests/reform-sign.test.js`**(`S-1 [種M]: 語中に埋没した印は楽園を名乗らない`)
- **裁き方**: 願いごとに二本の assert を対で持つ(述語と道の両方 —— findings §4.5 の註「枝C は `chooseScale` では撃てない」)。

```js
assert.strictEqual(forge.isReformSubject(forge.denude(wish)), false,
  `印が語中に埋没したまま楽園を名乗った(PARA-10 の回帰): ${wish}`);
assert.notStrictEqual(forge.chooseScale(wish), 'reform', `…その願いが改革の道へ攫われた: ${wish}`);
```

- **的(16 件 / 一字一句)**: 日本語 8 件 = `一門の家系図を作れるアプリが欲しい` / `専門店のサイトが欲しい` /
  `部門別の集計コマンドを実装して` / `名門校の受験対策アプリが欲しい` / `入門講座の進捗を記録する機能を実装して` /
  `門限を知らせるタイマーを実装して` / `登竜門コンテストの投票アプリが欲しい` / `専門分野の系統図を編集できるアプリが欲しい`。
  英語 8 件 = `build a civil engineering estimate app` / `implement a gateway timeout retry helper` /
  `build an app to investigate delegate voting records` / `create a script to aggregate the daily sales rows` /
  `implement a navigate-back button for the wizard` / `implement a self-improvement streak counter` /
  `build a self-improvement journal app` / `build a priesthood directory app for the diocese`。
- **実測の裏取り**(本相 §1.3 / §1.6 ③): X4″ で 13/13(findings の種M)+ 受け入れ帳 140/140。

#### AC-2 — PARA-11 の族(種H のうち構造で直る 4 件)も 0 件

`PRODUCT_FALSE_FRIENDS` の文全体無効化に起因する誤着は**一件も残ってはならない**。
これは種H だが、**表ではなく構造の修理で直る**ので射程帳に入れない(§2.1 条件 (ii))。

- **数**: 4/4。`相関図を描けるアプリを作って`→`full` / `人口分布の構成図を出力するツールを作る`→`standard` /
  `窓口の導線を図示するコマンドを実装して`→`standard` / `相場の推移を可視化するツールを作る`→`standard`。
- **撃つ門**: **既存 `tests/route-matrix.test.js`** の `M-2 [対角]` / `M-3 [非対角]`(AC-6 で的を足す)
  + **新設 `tests/reform-sign.test.js`** の `S-2 [PARA-11]: 紛れ語は同じ文の強い産物名を巻き添えにしない`
- **裁き方**: `assert.strictEqual(forge.wantsProduct(forge.denude(wish)), true)` を**述語に直に**撃つ
  (`chooseScale` では下流の段が拾い直すので病が見えない —— findings §2(b) / §4.5 の註)。
- **実測の裏取り**: findings §2(c)-2(基準線 6/6 誤着)/ 本相 §1.4 ③(X4′ で 4 件が直る)。

#### AC-3 — `REFORM_FALSE_FRIENDS` は**語境界の代用に留まる**(第60条の門番)

新設する `REFORM_FALSE_FRIENDS` に入れてよいのは、**「門」を含む日本語の複合語だけ**である。
種H の的(`常夏の楽園` `検索エンジン` `カトリック枢機卿` `音楽のオーケストレーション` …)を
**一語でも入れてはならない** —— それは判定器の修理ではなく答案の暗記であり、第60条が名指しで禁じた形である。

- **数**: 表の全ての項が `門` の字を含むこと。**例外 0 件。**
- **撃つ門**: **新設 `tests/reform-sign.test.js`**(`S-3 [門番 / 第60条]: 紛れ語表は「門」の複合語だけを持つ`)
- **裁き方**:

```js
const entries = forge.REFORM_FALSE_FRIENDS.source.split('|');
for (const e of entries) {
  assert.ok(e.includes('門'),
    `REFORM_FALSE_FRIENDS に「門」を含まない語 "${e}" が入った —— ` +
    'この表は日本語に \\b が無いことの代用であって、同音異義の的を暗記する場所ではない(第60条)。' +
    '種H を表で塞ごうとするな。塞げないものは reform/weak-signs/reach.md へ載せよ');
}
// 英語の印は表ではなく \b で守る(表に英語が混ざっていない)
for (const e of entries) assert.ok(!/[a-z]/i.test(e), `英語の語 "${e}" は \\b で守れ — 表に入れるな`);
```

- **根拠**: 本相 §1.2(X4 の表は三種を混ぜており、群 (c) が第60条違反)/ §3.3(群 (c) が `full→standard` の新規誤着を生んでいた)。
- **これは「表を足せば緑になる」道を機械的に塞ぐ門である。** AC-4 の xfail を迂回して
  射程帳の的を表で暗記しようとすれば、この門が鳴る。

#### AC-4 — 射程帳 32 件は「忘れられない形」で凍る(xfail)

§2.2 で受け入れ帳から外した 32 件は、`reform/weak-signs/reach.md` に**表の形**で記録し、
**門がその誤着を assert する**。前走行 `debt.md` + `tests/route-debt.test.js` の作法(AC-7 / 第16条)を継ぐ。

- **数**: 32 件すべてが `chooseScale(wish) === 'reform'`(= 現在の誤った道)であること。**32/32。**
- **撃つ門**: **新設 `tests/reform-reach.test.js`**
- **裁き方**:

```js
assert.strictEqual(forge.chooseScale(d.wish), 'reform',
  `種H の的が reform を離れた。弱い印の射程が変わったので reach.md を書き換え、` +
  `直ったならこの願いを tests/route-matrix.test.js の本コーパスへ ${d.correct} として昇格させ、` +
  `同じ commit で W-1 の FLOOR と総数の下限を上げ、reach.md と本門の REACH 配列から消せ: ${d.wish}`);
```

- **門番の二本**(`route-debt.test.js` の D-4 / D-5 と同じ形 —— 帳と門がずれることを許さない):
  - `R-4 [門番]: reach.md が実在し、32 件を名指しで載せている`(表の行数が `REACH.length` と等しい)
  - `R-5 [門番]: reach.md の願いは、この門が撃っている願いと一字一句同じ`(`assert.deepStrictEqual` で集合照合)
- **原因を撃つ一本**(`route-debt.test.js` の D-3 と同じ形):
  - `R-3 [射程]: 原因が消えていないことを名指しで確かめる` —— 32 件すべてについて、
    `REFORM_RE` に当たった語が**独立した語**であること(= 種H であること)を assert する。
    種M が紛れ込んだら鳴る(射程帳に「塞げるもの」を逃がす道を塞ぐ)。
- **第21条との関係**: これは門を緩めていない。**塞げない病を「塞げない」と名指しして凍らせている。**
  黙って外せば緩めたことになるが、赤くなる形で凍らせれば、それは未払いの債務の記録である。

#### AC-5 — 逆向き: 楽園の願いは `reform` を一件も失わない(第60条(b) の両枝)

紛れ語表と `\b` を足したことで、**本物の楽園の願い**が改革の道を失ってはならない。

- **数**: 耐久 枝A 10 件のうち **9/10**。唯一の ✗ は
  `wire the orchestration pipeline to the audit ledger` → `counsel` であり、
  **これは全候補(基準線 B0 を含む)で ✗ になる既知の設計**である
  (`audit` が `COUNSEL_EN` に当たり counsel が reform より先に立つ / findings §4.5)。
  **本走行の病ではないので、この 1 件を直すことは要求しない。**
  ただし **9/10 を下回れば不合格**(= 新たに楽園の願いを失った)。
- **撃つ門**: **新設 `tests/reform-sign.test.js`**(`S-4 [逆向き]: 楽園の願いは reform を失わない`)
  + **既存 `tests/counsel.test.js`** の `抽象名は今まで通り無条件で楽園を名指す (AC-40)` / `AC-38` / `Q3-1 の 37 語`
- **裁き方**: 枝A の 9 件(既知の 1 件を除く)を `assert.strictEqual(forge.chooseScale(wish), 'reform')` で撃つ。
  既知の 1 件は**除外するのではなく、`counsel` を期待する形で撃ち、註に理由を書く**
  (黙って落とせば第16条違反。`|| true` は厳禁)。
- **実測の裏取り**: 本相 §1.5(X4″ の枝A 9/10)。

### 4.2 行列と既存門

#### AC-6 — 受け入れ帳 140 件で、非対角の 30 セルすべてが 0

修理後の `graph/forge.js` に対し、§2.2 の受け入れ帳(140 件)で 6×6 混同行列を撃つと:

- **対角の合計 = 140**
- **非ゼロの非対角セル数 = 0 / 30**

「対角 132/140」のような部分点は不合格(第61条の合格線は「非対角の**各セル**が 0」であって対角の割合ではない)。

- **撃つ門**: **既存 `tests/route-matrix.test.js`** の `M-2 [対角]` / `M-3 [非対角]`
- **補助の計測器**: `reform/weak-signs/_matrix.js`(射程帳 32 件を分離する形へ更新)
- **裁き方**: `node tests/route-matrix.test.js ; echo EXIT=$?` → `EXIT=0`、末尾が `Route matrix self-test: N passed, 0 failed`
- **実測の裏取り**: 本相 §1.6 ③(X4″ で 140/140、非対角 0/30)。基準線は 120/140(非対角 4 セル)なので、**20 件の穴を実際に埋める要求である**。

#### AC-7 — 既存門のコーパスに的を足し、FLOOR も同じ commit で上げる

`tests/route-matrix.test.js` の `W-1 [門番]`(L367-380)が道ごとの件数 FLOOR を凍らせている。
**判定器と同じ commit で**コーパスと FLOOR を動かすこと。

| 道 | 現 FLOOR | 足す的 | **新 FLOOR(下限)** |
|----|---------|--------|---------------------|
| counsel | 42 | 0 | 42(据置) |
| cartography | 9 | 0 | 9(据置) |
| reform | 11 | 0 | 11(据置) |
| quick | 8 | 0 | 8(据置) |
| **standard** | 16 | **受け入れ帳の standard 側の誤着 10 件** | **26** |
| **full** | 16 | **受け入れ帳の full 側の誤着 10 件** | **26** |
| **総数** | 102 | **20** | **122** |

足す 20 件は §1.6 ② の生の写しに列挙された、**基準線で誤着している受け入れ帳の全件**である
(種M 16 件 + PARA-11 の族 4 件)。**うち 2 件は残債 PARA-10 / PARA-11 の本体**であり、
debt.md §4-2「直った 2 件を本コーパスへ `full` として昇格させる」を果たす。

> ⚠️ **`full→standard` セルが 0 件であることを名指しで撃つこと**(§3.3 の裁定)。
> `tests/route-matrix.test.js` に一本足す:
> ```js
> test('M-9 [名指し]: full の願いが standard へ落ちていない (weak-signs §3.3)', () => {
>   assert.strictEqual(forge.chooseScale('コンテナオーケストレーションの監視ダッシュボードを作って'), 'full',
>     '紛れ語表が文の骨を削り落とした —— 表に「産物の語を含む長い紛れ語」を入れた疑い。' +
>     'reform/weak-signs/requirements.md §3.3 を読め');
> });
> ```
> ⚠️ ただしこの願いは**射程帳 32 件の一つ**である(基準線で `full→reform` に誤着)。
> ゆえに `M-9` は AC-4 の xfail と衝突する。**M-9 は足さず、AC-4 の `reform-reach.test.js` の中で
> 「`standard` へは落ちていない」ことを併せて撃つ形にすること**:
> ```js
> assert.notStrictEqual(forge.chooseScale(d.wish), 'standard',
>   `射程帳の的が standard へ落ちた — 紛れ語表が文の骨を削っている(weak-signs §3.3)`);
> ```

- **撃つ門**: **既存 `tests/route-matrix.test.js`** の `W-1 [門番]: コーパスは宣言された下限を保つ`(L367)
- **裁き方**: FLOOR を上げずに的だけ足しても門番は鳴らない(下限は下限だから)。
  ゆえに修理の相は上表の新 FLOOR を **L372 の `FLOOR` と L380 の総数下限に手で書き込む**こと。
  書き込み忘れは AC-7 の不履行であり、quality 相が目で確かめる項目である。

#### AC-8 — `wantsProduct` / `isCartography` は §3.4 の形であること

- **数**: 耐久 枝C(`wantsProduct` を直に撃つ)**10/10**、枝E(紛れ語×作図×産物)**8/8**、枝D(諐問)**10/10**。
- **撃つ門**: **新設 `tests/reform-sign.test.js`** の `S-2` / `S-5 [作図]: 図を作る産物は図そのものではない`
  + **既存 `tests/counsel.test.js`**(210 門 / 枝D を守る)
- **裁き方**: 枝C は述語を直に(`forge.wantsProduct(forge.denude(wish)) === true`)。
  枝E は `chooseScale` で(`full`/`standard` の等号)。
- **実測の裏取り**: 本相 §1.5(X4″ で枝C 10/10・枝D 10/10・枝E 8/8)。
- **採ってはならない形(明示的な排除)**:
  - `if (wantsProduct(wish)) return false;` を `isCartography` に素で置く形(前走行 AC-8 が排除済み)
  - `PRODUCT_FALSE_FRIENDS` の一行目(`if (PRODUCT_FALSE_FRIENDS.test(w)) return false;`)を**残したまま**
    下に「削ってから探す」を足す形 —— 一行目が先に `false` を返すので無意味である。
  - 紛れ語の**部分**を削る形(`窓口` から `窓` だけ削れば `口` が `PRODUCT_RE` に当たり counsel を失う /
    findings §2(d))。**削る単位は「一致箇所ごと全体」**。

#### AC-9 — AC-45 を書き換える(§3.2 の形)

`tests/counsel.test.js:828` を §3.2 に示した形へ書き換える。

- **数**: `専門店の棚の傾きを直したい` → `quick`、`部門別の売上の誤りを直したい` → `quick`(**等号で 2/2**)。
  逆向きの 3 件(`門に監査の一段を足す` / `門の判定を書き換える` / `門を強化する`)→ `reform`(**3/3**)。
- **撃つ門**: **既存 `tests/counsel.test.js`**(書き換えた AC-45 自身)
- **裁き方**: `node tests/counsel.test.js ; echo EXIT=$?` → `EXIT=0`、`Counsel self-test: 210 passed, 0 failed`
- **禁止**: `|| true` / `notStrictEqual` への緩和 / 札の削除 / 門ごとの削除(§3.2)。
- **実測の裏取り**: 本相 §1.5(X4″ で `quick` / `quick` / `reform` ×3)。

#### AC-10 — `counsel.test.js:652` は書き換えない(表に一語も触れないことの証明)

`REFORM_RE は main の抽象名を過不足なく持つ (表を直に撃つ)` は 20 語を直に撃つ門である。
**修理はこの表から一語も落とさず、engine の固有名を一語も足さない。**

- **数**: 落ちた語 **0 語** / 入り込んだ固有名 **0 語**。
- **撃つ門**: **既存 `tests/counsel.test.js:652`**(**無改変で**通ること)
- **裁き方**: `git diff` で `tests/counsel.test.js` の L652-671 が**一行も変わっていない**こと。
- **実測の裏取り**(本相 §1.5 / X4″):
  ```
  ── counsel.test.js:652 の 20 語を REFORM_RE に直に撃つ ──
    REFORM_RE から落ちた語: 0 語 — 過不足なし
    engine の固有名が入り込んだ: 0 語
  ```
- **意味**: R1(除去)/ R4・R5(文脈化)を採れば**この門が必ず鳴る**(findings §4.3)。
  この AC は、それらの候補を機械的に排除する。

#### AC-11 — 残債 PARA-10 / PARA-11 を払い、`route-debt.test.js` から消す

`tests/route-debt.test.js` は xfail の門であり、**PARA-10/PARA-11 を直した瞬間に赤くなる**。
**赤くなることがこの門の仕事である**(debt.md §4)。払い方は debt.md §4 の四段:

1. `REFORM_RE` / `PRODUCT_FALSE_FRIENDS` を直す(AC-1 / AC-2 / AC-8)
2. 直った 2 件を `tests/route-matrix.test.js` の本コーパスへ **`full` として昇格**(AC-7)
3. 同じ commit で `W-1` の `FLOOR` を `full: 16 → 26`、総数の下限を `102 → 122` に上げる(AC-7 / **debt.md §4-3 が
   `full: 16→18` / `102→104` と書いているが、本走行は 20 件を足すので上表の数が優先する**)
4. `reform/judgment-triad/debt.md` から当該 2 行を消し、`tests/route-debt.test.js` の `DEBT` 配列からも消す

- **数**: `DEBT` 配列が **2 件 → 0 件**。debt.md の残債表も **2 行 → 0 行**。
- **撃つ門**: **既存 `tests/route-debt.test.js`** の `D-4 [門番]` / `D-5 [門番]`(帳と門の一致を撃っている)
- **裁き方**: `node tests/route-debt.test.js ; echo EXIT=$?` → `EXIT=0`。
  **片方だけ消せば D-5 が鳴る。**
- **⚠️ `DEBT` が空になったときの扱い**: 門を**削除してはならない**(第44条の結線が切れる)。
  `route-debt.test.js` は `PARA-12`(前走行 §5 が推奨した `runAbandonment` の残債)以降の
  受け皿として残す。`DEBT` が空のとき D-1〜D-3 は skip、D-4/D-5 は「debt.md に残債表が 0 行である」ことを撃つ形にする。
  **`|| true` で黙らせるな。**

### 4.3 結線と回帰

#### AC-12 — 新設した門はすべて結線される(第44条)

`tests/reform-sign.test.js` と `tests/reform-reach.test.js` は、CI(`.github/workflows/tribunal.yml`)か
`tests/paradise.test.js` のどちらかから**同じ commit で**呼ばれること。

- **数**: `node graph/wiring.js check` の `✓ 門 N 本すべてに走らせる者が居る` の N が **23 → 25**。
- **撃つ門**: **既存 `node graph/wiring.js check`**
- **裁き方**: `node graph/wiring.js check ; echo EXIT=$?` → `EXIT=0`、かつ N ≥ 25。
  増えていなければ、足した門が数えられていない(= 誰も走らせていない)。
- **基準線**: findings §1 の 23 本。

#### AC-13 — 七つの基準線の門がすべて緑に戻る

修理後、**本物のリポジトリで**(写しではなく)次の 7 本を**一つずつ**走らせ、すべて exit 0:

| # | 門 | 要求する末尾 |
|---|----|-------------|
| 1 | `node tests/paradise.test.js` | `Paradise self-test: N passed, 0 failed`(**N ≥ 471**) |
| 2 | `node tests/route-matrix.test.js` | `Route matrix self-test: N passed, 0 failed` |
| 3 | `node tests/counsel.test.js` | `Counsel self-test: 210 passed, 0 failed` |
| 4 | `node tests/route-debt.test.js` | `Route debt self-test: N passed, 0 failed` |
| 5 | `node tests/ratify-guard.test.js` | `Ratify guard self-test: 9 passed, 0 failed` |
| 6 | `node graph/wiring.js check` | `✓ 門 N 本すべてに走らせる者が居る (第44条)`(N ≥ 25 / AC-12) |
| 7 | `node graph/conclave.js audit` | `見捨てられた走行: 0 / 判定不能: 0 / 全 14` |

加えて新設 2 門:

| 8 | `node tests/reform-sign.test.js` | `… N passed, 0 failed` |
| 9 | `node tests/reform-reach.test.js` | `… N passed, 0 failed`(**32 件が凍っている状態が緑**) |

- **同時並行で走らせるな**(NFR-1)。`paradise.test.js` は約 6 分掛かる。
- **基準線**: findings §1 の 7/7 緑。

#### AC-14 — README の数を手で書かない(第22条)

門を 2 本足せば `tests/paradise.test.js` の総数も変わる。README の数は `node graph/census.js fix` が測定から書く。

- **撃つ門**: **既存 `tests/paradise.test.js`** の census 系の門
- **裁き方**: `node graph/census.js fix` を走らせた後に `git diff README.md` が数の行だけを変えていること。

---

## 5. 範囲外(本走行でやらないこと)

以下は**意図的に**やらない。第16条(沈黙の落下を禁じる)に従い、黙って落とさない。

| やらないこと | 理由 | どうするか |
|------------|------|-----------|
| **種H(`REFORM_RE` の同音異義)32 件を直すこと** | 弱い印では**原理的に**塞げない(findings §5-2 / 本相 §1.4)。表を足せば第60条の罠(`門番/門弟/山門…`)に落ち、文脈化すれば `counsel.test.js` 6 本が赤くなる(findings §4.3) | `reform/weak-signs/reach.md` に記録 + `tests/reform-reach.test.js` で凍結(AC-4) |
| **`REFORM_RE` から語を除去すること(R1)** | 既存門 13 本が赤くなり、非対角セルが 4→5 に**増える**(findings §4.3)。`門に監査の一段を足す` 等の楽園の願いを失う | AC-10 が機械的に排除する |
| **「門」を文脈化すること(R4 / R5)** | 表から語を抜くので `counsel.test.js:652` が鳴り、共起の表に無い楽園の願い(`門の閾値を上げよ`)を落とす(findings §4.3 / 耐久 枝A 8/10)。**共起の表もまた表であり、第60条の同じ罠に落ちる** | AC-10 / AC-5 が排除する |
| **`DIAGRAM_FALSE_FRIENDS` と `isCartography` の `onlyWeak` の行に手を入れること** | findings §2(c)-1 の実測で **8/8 健全**。正しい修理の形を示している側である | 触らない。§3.4 が「触るな」と名指し |
| **`isCounsel` に手を入れること** | findings §2(d) / 耐久 枝D で **12/12・10/10 × 全候補**が不変。counsel の願いはそもそも産物の名を含まない | 触らない。AC-8 の枝D 10/10 が守る |
| **`wire the orchestration pipeline to the audit ledger` を reform へ直すこと** | 基準線 B0 を含む**全候補で ✗**。`audit` が `COUNSEL_EN` に当たり counsel が reform より先に立つ **既知の設計**であり、本走行の病ではない(findings §4.5) | AC-5 が `counsel` を期待する形で撃ち、註に理由を書く。直すなら別走行 |
| **`PRODUCT_STRONG_RE` / `DIAGRAM_FALSE_FRIENDS` を `module.exports` に足すこと** | findings §4.6-5 の申し送り。本書の AC はどれも両者を門から直に撃つことを要求していない(AC-3 は `REFORM_FALSE_FRIENDS` を撃つので、**それだけを export に足せばよい**) | `REFORM_FALSE_FRIENDS` のみ export に足す。他二つは触らない(export を広げれば門が増え、AC-12 の N が狂う) |
| **`REFORM_RE` に engine の固有名(`gauge`/`forge`/`conclave`…)を足すこと** | `counsel.test.js:652` が四度の回帰の末に禁じた(`forge 鍛冶屋の在庫管理アプリを作って` が reform へ戻る) | AC-10 |
| **`quick` / `counsel` / `cartography` / `reform` の語彙の拡張** | 172 件コーパスで 4 行すべて対角 100%(findings §3)。病は「世間の願いが楽園の道へ攫われる」**一方向にしか出ていない** | 触らない |
| **`PARA-12`(`runAbandonment` の `closed` 判定)** | 前走行 §5 が別走行と裁定済み。本走行の主題ではない | 触らない |
| **写しの上での最終判定** | `.git` を写さない写しでは対照群でも 4 本が ✗ になる(前走行 §2.2 の実測) | AC-13 は**本物のリポジトリ**での走行を要求する |

---

## 6. 回帰の守り — この修理が壊しうる既存の振る舞いと、それを守る門

| # | 壊しうる振る舞い | どう壊れるか(実測または理路) | 守る門 |
|---|-----------------|---------------------------|--------|
| **R-1** | **`counsel.test.js:652`「`REFORM_RE` は main の抽象名を過不足なく持つ」**(20 語を直に撃つ) | `REFORM_RE` から一語でも落とせば鳴る。R1/R4/R5 は必ずここで鳴る(findings §4.3)。**R2(`\b` を課す)は語を落とさないので鳴らない** —— `\b` 付きでも `forge.REFORM_RE.test('門')` は真 | **既存 `tests/counsel.test.js:652`**(AC-10 / **無改変で**通ること)。**実測: X4″ で「落ちた語 0 語 / 入り込んだ固有名 0 語」**(本相 §1.5) |
| **R-2** | **AC-45「「門」の紛れ語は main と同じ振る舞いである」**(`counsel.test.js:828`) | R3 系を採れば `専門店の棚の傾きを直したい` が `reform`→`quick` に**改善**し、xfail が赤くなる。**これは正しい赤である** | **既存 `tests/counsel.test.js`**(AC-9 で **`quick` を等号で期待する形へ書き換え**)。`|| true` / `notStrictEqual` は厳禁。**実測: X4″ で `quick` / `quick`**(本相 §1.5) |
| **R-3** | **AC-45 の逆向き 3 件**(`門に監査の一段を足す` / `門の判定を書き換える` / `門を強化する`) | 紛れ語表に `門` だけの項や広すぎる項(例 `の門`)を入れると、本物の門まで削られて `reform` を失う | **既存 `tests/counsel.test.js`** の書き換え後 AC-45 の後半 3 件 + **既存 `AC-40`**(`chooseScale('門に監査の一段を足す') === 'reform'`)。**実測: X4″ で 3/3 reform**(本相 §1.5) |
| **R-4** | **`counsel.test.js` の 210 門全体** | `wantsProduct` を触ると `isCounsel` の `!wantsProduct` 二箇所(`forge.js:550, 558`)に波及しうる | **既存 `tests/counsel.test.js`**(210/0 であること / AC-13)。**実測: X4′/X4″ で 209/1(唯一の ✗ が AC-45 = 改善の報せ)**(本相 §1.3 / §1.5) |
| **R-5** | **諐問の道(枝D 10 件 / 紛れ語を含む counsel の願い)** | 紛れ語を**部分的に**削ると一字の名(`口`/`相`)が残って `PRODUCT_RE` に当たり、counsel を失う(findings §2(d) の警告) | **新設 `tests/reform-sign.test.js`** の枝D 相当 + **既存 `tests/counsel.test.js`**。**実測: X4″ で枝D 10/10**(本相 §1.5)。AC-8 が「削る単位は一致箇所ごと全体」を要求 |
| **R-6** | **cartography の道 15 件**(図そのものを求める願い) | `isCartography` の打ち消しを強くしすぎると、本物の作図の願いが `standard`/`full` へ落ちる | **既存 `tests/route-matrix.test.js`** の `M-3 [非対角]`。**実測: X4″ で cartography 行 15/15 対角**(本相 §1.5 Q7b) |
| **R-7** | **`isCartography` の `onlyWeak` の行**(`DIAGRAM_FALSE_FRIENDS` 側 / `forge.js:601`) | 「同じ形の病だから揃えよう」と**健全な行まで**書き換えると、`意図を汲んで実装せよ` が作図へ落ちる | **既存 `tests/route-matrix.test.js`**(cartography 行)+ §5 の範囲外宣言(触るな)。**実測: 基準線で 8/8 健全**(findings §2(c)-1) |
| **R-8** | **reform の道 15 件**(本物の楽園の改修の願い) | 紛れ語表 / `\b` が広すぎると楽園の願いが reform を失う | **既存 `tests/route-matrix.test.js`** の `M-2`/`M-3` + **新設 `tests/reform-sign.test.js`** の `S-4`(AC-5)。**実測: X4″ で reform 行 15/15 対角・耐久 枝A 9/10**(本相 §1.5) |
| **R-9** | **`full` の願いが `standard` へ落ちること**(§3.3 の新規誤着) | 紛れ語表に「産物の語を含む長い紛れ語」(`コンテナオーケストレーション`)を入れると、削った跡に `full` を名乗らせる語が残らない | **新設 `tests/reform-reach.test.js`**(`assert.notStrictEqual(…, 'standard')` / AC-7 の註)+ **AC-3 の表の門番**(そもそも表に入れさせない)。**実測: X4″ で `full→standard` セル 0 件**(本相 §3.3) |
| **R-10** | **残債の門 `tests/route-debt.test.js`** | PARA-10/11 を直せば D-1〜D-3 が赤くなる。**これが正しい赤である**(debt.md §4) | **既存 `tests/route-debt.test.js`**(AC-11 で `DEBT` を空にし、debt.md の 2 行も同じ commit で消す。D-4/D-5 が帳と門の一致を撃つ) |
| **R-11** | **`tests/route-matrix.test.js` の `W-1 [門番]`**(FLOOR) | 的を 20 件足して FLOOR を据え置けば、その 20 件は明日黙って消せる | **既存 `W-1 [門番]`**(AC-7 で `standard 16→26` / `full 16→26` / 総数 `102→122` を手で書き込む) |
| **R-12** | **門の孤児検査**(第44条) | 新設 2 門を結線し忘れると `wiring.js check` が赤 | **既存 `node graph/wiring.js check`**(AC-12 / N が 23→25) |
| **R-13** | **README の門の本数**(第22条) | 門を足すと総数が変わる。手書きすれば census 系の門が鳴る | **既存 `tests/paradise.test.js`** の census 系(AC-14) |
| **R-14** | **`graph/conclave.js audit` の 14 台帳の裁き** | 本走行は `forge.js` の判定だけを触り、`conclave.js` に触れないので audit は不変 | **既存 `node graph/conclave.js audit`**(AC-13 の 7 番 / `全 14` のまま) |
| **R-15** | **前走行 101 件コーパス** | 本走行の修理が前走行の合格線を壊しうる | **`_matrix.js` の「前走行 101 件コーパスのみ」の行**。**実測: X4′/X4″ ともに 101/101(回帰なし)**(本相 §1.3 / §1.5) |

---

## 7. 非機能要件 (NFR)

| # | 要件 | 裁き方 |
|---|------|--------|
| **NFR-1** | **門は一つずつ逐次に走らせる。** 同時並行で走らせた結果を判定に使わない | findings §6.2(前走行)と本相の全計測器が守った。AC-13 の 9 本を逐次に走らせ、各々の exit code を記録する。`paradise.test.js` は約 6 分 |
| **NFR-2** | **写しの数を最終判定に使わない。** `.git` を写さない写しでは対照群でも 4 本が ✗ になる | AC-13。最終判定は**本物のリポジトリ**で |
| **NFR-3** | **判定器とコーパスと FLOOR と帳は同じ commit で動かす。** 片方だけを動かした中間状態を commit しない | `git show --stat <sha>` に `graph/forge.js` / `tests/route-matrix.test.js` / `tests/counsel.test.js` / `reform/weak-signs/reach.md` / `reform/judgment-triad/debt.md` が**同時に**載ること |
| **NFR-4** | **第60条(b): 規則を足したら両枝を持て。** 日本語に複合語表を課したら英語に `\b` を課す | §3.3 の実測(`\b` 無しでは 132/140 で止まる)。AC-1 の的が日英の両方を含む(日 8 件 / 英 8 件) |
| **NFR-5** | **表を足して緑にするな(第60条)。** `REFORM_FALSE_FRIENDS` は語境界の代用に限る | **AC-3 が機械で撃つ**(全項が `門` を含むこと / 英語が混ざっていないこと)。人の目に頼らない |
| **NFR-6** | **`|| true` / 閾値の緩め / assert の弱化を一度も使わない(第21条)** | `git diff tests/` に `|| true` が 0 件。既存門の期待値を**緩める方向に**変えた箇所が 0 件(AC-9 の書き換えは `notStrictEqual`→`strictEqual` の**強化**である) |
| **NFR-7** | **削る単位は「紛れ語の一致箇所ごと全体」である** | findings §2(d): `窓口` から `窓` だけ削れば `口` が `PRODUCT_RE` に当たり counsel を失う。実装は `replace(new RegExp(SRC,'gi'), ' ')` の形(部分削除をしない)。AC-8 の枝D 10/10 が撃つ |
| **NFR-8** | **判定器の速度を落とさない。** `chooseScale` は正規表現の評価のみで外部 I/O を持ち込まない | 紛れ語の削除は文字列 1 回の `replace`。`tests/route-matrix.test.js` が 122 件を撃っても実行時間が体感で変わらないこと |
| **NFR-9** | **新設門の assert メッセージは次の一手を含む。** 「赤い」だけでなく、何をすればよいかを書く | AC-4 の xfail メッセージが `reach.md` と `route-matrix` の FLOOR を名指している(前走行 `route-debt.test.js` の `PAID` 文言が見本) |
| **NFR-10** | **`graph/` の計測は写しの上で行う。** 本物の `graph/` を曲げて測ってはならない | 本相の全計測器が守った(第9節の `git status`)。修理の相は本物を書き換えるが、**候補の比較は写しで**行う |

---

## 8. 修理の相への引き継ぎ — 手順の順序

1. **`REFORM_FALSE_FRIENDS` を新設**(「門」の複合語 21 語 = §1.2 群 (a) + `門人`)。`isReformSubject` を
   「削ってから印を探す」形にする。**`REFORM_RE` の 20 語には一語も触らない**(AC-10)。
2. **`REFORM_RE` の英語 10 印に `\b` を課す**(日本語は不変 / §3.3)。
3. **`wantsProduct` を「削ってから探す」形にする**(§3.4)。`isCartography` の
   `PRODUCT_FALSE_FRIENDS` を見ている行も**同じ形に揃える**。`onlyWeak` の行は触らない。
4. **`REFORM_FALSE_FRIENDS` を `module.exports` に足す**(AC-3 が門から撃つため。他は足さない)。
5. **`tests/reform-sign.test.js` を新設**(AC-1 / AC-3 / AC-5 / AC-8)。
6. **`reform/weak-signs/reach.md` を書き、`tests/reform-reach.test.js` を新設**(AC-4)。的は 32 件。
7. **`tests/counsel.test.js` の AC-45 を書き換える**(AC-9 / §3.2)。**652 行目の門は触らない**(AC-10)。
8. **`tests/route-matrix.test.js` に 20 件を足し、FLOOR を上げる**(AC-7: standard 26 / full 26 / 総数 122)。
9. **`debt.md` の 2 行と `route-debt.test.js` の `DEBT` 2 件を同じ commit で消す**(AC-11)。
10. **新設 2 門を CI か `paradise.test.js` に結線する**(AC-12 / 第44条)。
11. **AC-13 の 9 本を本物のリポジトリで一つずつ走らせる**(NFR-1 / NFR-2)。
12. **`node graph/census.js fix` を走らせる**(AC-14)。手で数を書かない。

---

## 9. 本相が何も壊していないことの確認

```
$ git branch --show-current
reform/weak-signs

$ git status --porcelain
?? reform/weak-signs/

$ git diff --stat HEAD -- graph/ tests/
(空)
```

**追跡下のファイルの変更は 0 件。`graph/` と `tests/` は一行も変わっていない。**
本相の全ての実測は `require.cache` 注入(`_cand_gate.js`)と
`$LOCALAPPDATA/Temp/ws_cand/` に置いた写しの上で行った。何も commit / push していない。
