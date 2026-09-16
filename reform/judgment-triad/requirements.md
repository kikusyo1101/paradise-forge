# 楽園 — 道選び・環の裁きの三欠陥 修理の受け入れ基準 (reform/judgment-triad / specify 相)

- 走行日: 2026-09-17
- 枝: `reform/judgment-triad`
- 作業根: `C:/Users/kikus/Documents/workspace/paradise`
- 前相の記録: `reform/judgment-triad/findings.md`(909 行 / discover 相の実測)
- 掟: **本書の全ての数は findings.md の節番号を添えるか、本相で自ら実測した生出力を添える。**
- 本相は実装しない。`graph/` も `tests/` も一行も変えていない(第8節の `git status` で確認)。

## 0. 本書の読み方 — 「機械が裁ける」とは何か

本書の AC はすべて次の三つを備える:

1. **命令** — 人が目で見るのではなく、`node …` を一本走らせて exit code と行を読む。
2. **門の名** — 既存門の名(ファイル + テスト名)か、新設なら**ファイル名案**。
3. **数** — 閾値か等号。「良くなる」「改善する」のような裁けない語を書かない。

**AC とは、満たさぬとき赤い行を吐く命令のことである。** 満たさぬとき人が首をかしげるだけの文は AC ではない。

---

## 1. 三欠陥と修理の割り当て(裁定の一覧)

| 札 | 病 | 本走行で直すか | 修理候補 |
|----|----|--------------|---------|
| **PARA-6** | `ratify()` が相の `done` を見ずに祝福する(findings 1.1) | **直す** | R1(関門)+ R4(門を一本) |
| **PARA-7** | `fullJa`/`fullEn` にサイト語族が無い(findings 3.1) | **直す** | C1 + **部分機能の守り**(第2.3節の新実測より必須) |
| **PARA-9** | `isCartography()` に産物の打ち消しが無い(findings 2.1) | **直す** | C2a |
| **PARA-10**(新設・残債) | `REFORM_RE` の弱い印「門」が「一門」に当たる(findings 5.5) | **直さない** — 第3.4節で裁定 | 語彙の**除去**/文脈化(別走行) |
| **PARA-11**(新設・残債) | `PRODUCT_FALSE_FRIENDS` が一語で文全体を無効化(findings 5.5) | **直さない** — 第3.4節で裁定 | 当たった箇所を削ってから強い名を探す形へ(別走行) |

---

## 2. 本相が新たに実測したこと(findings.md が「未測定」と申し送った穴)

discover 相は三つの穴を名指しで残した。specify 相は**受け入れ線を数で決める前にその穴を埋めねばならない**ので、
読むだけの計測器を三本足して測った。**本物の `graph/` は一行も変えていない**(写しだけを曲げた)。

### 2.1 計測器の一覧(本相が足したもの)

| 計測器 | 何を測るか | 本物への書き込み |
|--------|-----------|----------------|
| `reform/judgment-triad/_solo_probe.js` | R1 を当てた/当てない写しで `tests/paradise.test.js` を**単独で**走らせる | 無し(`$LOCALAPPDATA/Temp/solo_*` に写す) |
| `reform/judgment-triad/_ac3_probe.js` | R1 入りの写しで `--reject` / `rework` / `blocked` の枝を直に撃つ | 無し |
| `reform/judgment-triad/_spec_probe.js` | C1 の「サイト語 × 部分機能」の巻き添え / PARA-10 素朴修理の巻き添え | 無し(`$LOCALAPPDATA/Temp/spec_probe` に `graph/` を写す) |

### 2.2 【重要】R1 の試作は既存門を「5 本」落としたが、**4 本は測定の汚染である**

findings.md §6.2 が名指しで警告している —— 写し同士が同じ git 作業樹/一時領域を奪い合うと偽の ✗ が出る。
**同時並行の測定は測定ではない。** ゆえに対照群と R1 版を**一つずつ**走らせ直した。

```
$ node reform/judgment-triad/_solo_probe.js ctrl     # 何も曲げていない写し・単独走行
MODE=ctrl  DST=C:/Users/kikus/AppData/Local/Temp/solo_ctrl/paradise
EXIT=1
✗ 4 本:
  ✗ hermetic: 仕込めば赤・外せば緑 — 門が本当に鳴る (第21条 壊して鳴らす)
  ✗ hermetic: 楽園の門は今この瞬間、版管理下の現物を汚していない (第58条(c))
  ✗ AC-12e: git が追跡する overlay / dashboard に外部書体参照が 0 件
  ✗ dashboard-count 系: dashboard-no-deps が緑 (G-01/02/04/06)
```

```
$ node reform/judgment-triad/_solo_probe.js r1       # R1 を当てた写し・単独走行
MODE=r1  DST=C:/Users/kikus/AppData/Local/Temp/solo_r1/paradise
EXIT=1
✗ 5 本:
  ✗ cross-domain rework also resets DOWNSTREAM phases in later domains
  ✗ hermetic: 仕込めば赤・外せば緑 — 門が本当に鳴る (第21条 壊して鳴らす)
  ✗ hermetic: 楽園の門は今この瞬間、版管理下の現物を汚していない (第58条(c))
  ✗ AC-12e: git が追跡する overlay / dashboard に外部書体参照が 0 件
  ✗ dashboard-count 系: dashboard-no-deps が緑 (第58条 G-01/02/04/06)
```

**対照群でも同じ 4 本が ✗。** ゆえに `hermetic` 2 本 / `AC-12e` / `dashboard-count` は
**R1 とは無関係**であり、`.git` を写さない写しの上では常に鳴る(findings 6.2 が予告したとおり)。

> 📌 この 4 本は**本走行の責任ではない**。だが修理の相は **本物のリポジトリで** `node tests/paradise.test.js`
> を走らせて 471/0 を確かめること。写しの数(469 passed + 2 skipped)を最終判定に使ってはならない。

**R1 に帰せられる ✗ は 1 本だけである:** `cross-domain rework also resets DOWNSTREAM phases in later domains`。
真因を `_ac3_probe.js` で単独に追った:

```
  ✗ cross-domain rework also resets DOWNSTREAM phases in later domains
      cannot ratify architecture: 1 phase(s) not done: ux=pending
```

```
$ node reform/judgment-triad/_ac3_probe.js
=== (d) 既存門の ✗ の真因 — architecture の相の一覧 ===
  architecture の相: ux, design, identity, detail
  ✗ になった門の fixture が done にする相: design, detail, identity  (ux を欠く)
  ✓ のままの兄弟の門の fixture: design, detail, identity, ux  (四つ揃う)
  ratify(architecture) — ux を残したまま -> 拒まれた  code=RATIFY_PHASES_NOT_DONE
  ratify(architecture) — ux も done にした後 -> 通った  {"ok":true,"ratified":"architecture"}
```

**これは `--reject` の枝との衝突ではない。** `tests/paradise.test.js` L795 の fixture が
`ux` を done にせずに `ratify(run,'architecture')` を撃っている —— すなわち**門自身が PARA-6 の抜け道を
使って環を回していた**。すぐ上の兄弟の門(L767 `a review class can send work back ACROSS domains`)は
`['design','detail','identity','ux']` の四つを done にしており、R1 の下でも ✓ のままである。

> **これは正しい赤である(第21条)。** 修理の相は `graph/` を緩めるのではなく、
> **L797-799 の fixture の配列に `'ux'` を足す**ことで直せ。門を緩めた形跡ではなく、
> 門が偶然 PARA-6 に寄りかかっていた形跡である。

### 2.3 【重要】C1 単独は「サイト語 × 部分機能」を 5/5 壊す — findings 5.2 の未測定の穴

findings 5.2 は ⚠️ でこう申し送っていた:「『レシピサイトの並び替えを実装して』のような**部分機能の依頼**が
full へ跳ねるかは**測っていない**」。測った。**跳ねる。**

```
$ node reform/judgment-triad/_spec_probe.js

=== A-0. 基準線(判定器そのまま)— サイト語 × 部分機能 ===
  ok  "レシピサイトの並び替えを実装して" -> standard  (正解 standard)
  ok  "サイトの検索機能を実装して" -> standard  (正解 standard)
  ok  "通販サイトのクーポン計算を作る" -> standard  (正解 standard)
  ok  "add a sort option to the recipe site" -> standard  (正解 standard)
  ok  "implement pagination for the site listing" -> standard  (正解 standard)
  ok  "サイトのタイポを直す" -> quick  (正解 quick)
  ok  "fix a typo on the website" -> quick  (正解 quick)
  ✗   "ECサイトを作れ" -> standard  (正解 full)
  ✗   "build an e-commerce site" -> standard  (正解 full)

=== A-1. C1 を当てた版 — サイト語 × 部分機能 ===
  ✗   "レシピサイトの並び替えを実装して" -> full  (正解 standard)
  ✗   "サイトの検索機能を実装して" -> full  (正解 standard)
  ✗   "通販サイトのクーポン計算を作る" -> full  (正解 standard)
  ✗   "add a sort option to the recipe site" -> full  (正解 standard)
  ✗   "implement pagination for the site listing" -> full  (正解 standard)
  ok  "サイトのタイポを直す" -> quick  (正解 quick)
  ok  "fix a typo on the website" -> quick  (正解 quick)
  ok  "ECサイトを作れ" -> full  (正解 full)
  ok  "build an e-commerce site" -> full  (正解 full)
  C1 が壊す件数: 5 / 9
```

**C1 は PARA-7 の 7 件を直す代わりに、standard の部分機能 5 件を full へ攫う。**
findings 5.2 の「奪った道: 無し(実測)」は **コーパスにこの形の的が一件も無かったから**であって、
奪っていないからではない —— **これは PARA-7/PARA-9 とまったく同じ「コーパスの穴」である**(findings 3.4)。

> `quick` は判定の段が先なので「サイトのタイポを直す」は C1 の下でも安全(上の生出力が示す)。
> 危険なのは **standard の部分機能**だけである。

**ゆえに本書は「C1 をそのまま入れる」ことを受け入れ基準にしない。**
C1 + 部分機能の守り(例: `BUILD_RE`/全体性の語の有無で段を分ける)を要求し、
**その 5 件をコーパスに入れて撃つ**ことを AC に書く(AC-5 / AC-6)。第21条: 撃たない的で緑を名乗るな。

### 2.4 PARA-10 の素朴な修理(弱い印「門」の撃ち捨て)の巻き添え

```
=== B. REFORM_RE から「門」「gate」を除いた版 — reform コーパスの生死 ===
  ✗   "門に監査の一段を足す" -> standard
  reform を失う件数: 1 / 14
  「一門の家系図を作れるアプリが欲しい」-> cartography
```

二つのことが分かった:

1. **弱い印を撃ち捨てると既存門のコーパスが 1 件死ぬ** — `門に監査の一段を足す` は
   `tests/route-matrix.test.js` の `src=gate` の願いである。つまり PARA-10 の修理は
   **既存門を赤くする**ので、代わりの強い印(「楽園の門」「監査の門」等の文脈化)を設計せねばならない。
2. **撃ち捨てても的は直らない** — `一門の家系図を作れるアプリが欲しい` は `full` ではなく
   `cartography` へ行く。すなわち PARA-10 の修理は PARA-11(`PRODUCT_FALSE_FRIENDS` の
   文全体無効化)と**噛み合っており、片方だけでは的に当たらない**。

**これが第3.4節の裁定の根拠である。** PARA-10/PARA-11 は「一行足す」では済まず、
**それ自身が discover → design を要する一走行**である。

---

## 3. PARA-9 / PARA-7 の受け入れ線 — 数で定める

### 3.1 コーパスをどう組むか

本走行の混同行列のコーパスは findings 3.2 の **98 件**が出発点である。本書はこれを次のように動かす:

| 操作 | 件数 | 理由 |
|------|------|------|
| findings 3.2 のコーパス | 98 | 出発点(findings 3.2) |
| **−2** PARA-10/PARA-11 の願いを**残債表へ移す** | 96 | 第3.4節の裁定 |
| **+5** 「サイト語 × 部分機能」の standard の的 | **101** | 第2.3節の実測 — C1 の巻き添えを撃つため(第21条) |

**受け入れコーパス = 101 件。**

> ⚠️ 混同行列の計測器のコーパスと、既存門 `tests/route-matrix.test.js` のコーパスは**別物**である
> (前者は後者から 63 件を取り込み、35 件を足したもの — findings 3.2)。
> AC-6 は**既存門のコーパス**に的を足すことを要求し、AC-5 は**受け入れコーパス 101 件**での
> 行列の形を要求する。二つは別の AC である。

### 3.2 受け入れ線

> **対角 101 / 101。非対角の 30 セルすべてが 0。**

「96/98」のような**部分点は受け入れない**。第61条の合格線は「非対角の**各セル**が 0」であって
対角の割合ではない。findings 5.6 が「C3(誤着 2)でも**未完**である」と書いたのはこの意味である。

### 3.3 なぜ 101/101 が到達可能だと言えるか(実測の積み上げ)

| 段 | 出典 | 非ゼロ非対角セル |
|----|------|-----------------|
| 基準線 98 件 | findings 3.2 | 3(`std→carto` 2 / `full→carto` 3 / `full→std` 7) |
| C3(C1+C2a)を当てる | findings 5.6 | 2(残るは PARA-10 と PARA-11 の 2 件のみ) |
| その 2 件を残債へ移す(第3.4節) | 本書の裁定 | **0** |
| 「サイト語 × 部分機能」5 件を足す | 本相の実測(2.3) | **1(`standard→full` 5 件)← ここが未解決** |

**ゆえに修理の相に残された判定器の仕事はただ一つ** —— C1 の「サイト」語を、
**産物全体を求める願い**にだけ当て、**部分機能の依頼**には当てない形にすること。
(`fullJa` に語を足すだけでは足りない。第60条(b)「規則を足したら両枝を持て」がここにも当たる。)

### 3.4 【裁定】PARA-10 / PARA-11 は本走行で直さない — 残債として名を付ける

**裁定: 直さない。二件の願いを受け入れコーパスから外し、残債表に名前付きで記録する。**

根拠(すべて実測):

1. **別の病である。** findings 5.5 が示すとおり、残る 2 件の原因は `isCartography` の打ち消しではなく、
   `REFORM_RE` の弱い印と `PRODUCT_FALSE_FRIENDS` の当たり方である。C2a が**初めて露出させた**だけで、
   C2a が**作った**欠陥ではない。
2. **一行では済まない(本相の実測、第2.4節)。** 弱い印「門」を撃ち捨てると
   既存門のコーパスが 1 件死に(`門に監査の一段を足す` → standard)、**しかも的は直らない**
   (`一門の家系図…` → cartography のまま)。二つの病が噛み合っており、片方だけの修理は無意味である。
3. **第60条が「表を足すな」と名指ししている族である。** 正解は語彙の追加ではなく除去/文脈化の疑いが濃く、
   `REFORM_RE` の再設計は reform の道 15 件すべてを撃ち直す走行になる —— 本走行の三欠陥とは別の主題である。
4. **第21条には触れない。** この 2 件は**本走行の discover 相が自ら発明した的**であって、
   既存門が守ってきた振る舞いではない。外すことは「門を緩めて緑にする」ことではない。
   緩めるとは**既存の的を落とす**ことであり、ここでは既存の的は一件も落ちない
   (既存門の FLOOR は AC-6 で**上げる**ことしか許さない)。

**ただし黙って外すことは許さない。** 第16条(既定への沈黙の落下を禁じる)の精神に従い、
外した的は**忘れられない形**で記録する。それが AC-7 である。

#### 残債の名前と内容

| 札 | 名 | 願い | 現状(C3 適用下・findings 5.6 実測) | 正解 | 原因 |
|----|----|------|--------------------------------|------|------|
| **PARA-10** | `REFORM_RE の弱い印「門」` | `一門の家系図を作れるアプリが欲しい` | `reform` | `full` | `REFORM_RE` の `門` が「一**門**」に当たる |
| **PARA-11** | `PRODUCT_FALSE_FRIENDS の文全体無効化` | `相関図を描けるアプリを作って` | `cartography` | `full` | 「**相関**図」が紛れ語に当たり、同じ文の「アプリ」まで巻き添えで無効化 |

記録先: `reform/judgment-triad/debt.md`(修理の相が作る。AC-7 が実在と内容を撃つ)

---

## 4. 受け入れ基準 (AC)

### 4.1 PARA-6 — ratify の関門

#### AC-1 — 相が全て `done` でない領域は祝福できない

`conclave.ratify(run, cardinal)` を、その領域の相に `done` でないものが一つでも在る状態で呼ぶと、
**例外を投げる**(`err.code === 'RATIFY_PHASES_NOT_DONE'`)。領域の `status` は変化しない(部分適用しない)。
CLI(`node graph/conclave.js ratify <cardinal> --run <f>`)は **exit 2** で終わり、
標準エラーに done でない相の `id=status` を列挙する。

- 撃つ門: **新設 `tests/ratify-guard.test.js`**(R4)
- 裁き方: `assert.throws(() => conclave.ratify(run,'requirements'), /not done/)` と
  `assert.strictEqual(d.status, 'pending')` の二本。
- 実測の裏取り(本相・R1 の写し):
  `ratify(architecture) — ux を残したまま -> 拒まれた code=RATIFY_PHASES_NOT_DONE`

#### AC-2 — 関門が本当に鳴ることを証明する(第21条 壊して鳴らす)

`tests/ratify-guard.test.js` は **関門を外せば赤くなる**形で書く。すなわち
「pending を抱えた領域に ratify を撃って exit 非 0 を期待する」門と、
「全て done にしてから撃って通ることを確かめる」門を**対で**持つ。
片方だけなら「常に拒む」実装でも緑になってしまう。

- 撃つ門: **新設 `tests/ratify-guard.test.js`**
- 裁き方: 上の二本が両方 ✓ であること。
- 実測の裏取り: `ratify(architecture) — ux も done にした後 -> 通った {"ok":true,"ratified":"architecture"}`

#### AC-3 — 四つの枝の振る舞いを凍らせる

以下の表のとおりに振る舞うこと。**すべて本相が R1 の写しで実測済み**(`_ac3_probe.js`)。

| 枝 | 要求 | 実測(R1 の素朴版) | 裁定 |
|----|------|-------------------|------|
| **(a) `--reject`** | **従来どおり通る。** 関門に一切触れない。相が全て `pending` でも reject できる | `-> 通った {"ok":true,"reworked":[...]}`、`specify=rework` に落ちた | **これでよい。** 拒否は「仕事が無い」ことを咎める機構ではない。仕事が無いから差し戻すのが reject である。関門を reject 側に付けると、着手前の差し戻し(第14条の上流への差し戻し)が不可能になる |
| **(b) `rework` の相** | **拒む。** `rework` は `done` ではない | `-> 拒まれた code=RATIFY_PHASES_NOT_DONE "specify=rework"` | **これでよい。** 現状(R1 無し)は無条件に ratified にし、**差し戻した仕事をそのまま握りつぶす**。`rework` を通す関門は PARA-6 を半分残す |
| **(c) `blocked` の相** | **拒む。** `blocked` は `done` ではない | `-> 拒まれた code=RATIFY_PHASES_NOT_DONE "specify=blocked"` | **これでよい。** ただし拒否の文言は「blocked の相が在る — 人を呼べ」と読める形にすること(ただ `not done` と言うだけでは、待てば直ると誤読される) |
| **(c2) 領域そのものが `blocked`** | **拒む。** 現在の R1 素朴版は**見逃す** | `領域 status=blocked 相: specify=done` → `-> 通った`、`status` が `blocked` → `ratified` に化けた | **R1 素朴版の穴。** `MAX_DOMAIN_REWORK` 超過で `blocked` になった領域(conclave.js L707)が、相を done にすれば**教主を呼ばずに自力で祝福される**。修理の相は `d.status === 'blocked'` も拒むこと |

- 撃つ門: **新設 `tests/ratify-guard.test.js`**(四つの枝それぞれに一本ずつ、計 4 本)
- 裁き方: (a) は `assert.ok(res.ok)` と `assert.strictEqual(phase.status,'rework')`。
  (b)(c)(c2) は `assert.throws(..., /not done|blocked/)` と「領域の status が変わっていない」の対。

#### AC-4 — 既存の 13 走行台帳は一本も赤くならない(実測済み)

**実測結果: 赤くなる台帳は 0 / 13。追加の仕事は発生しない。**

```
$ node -e "…各台帳の domains と phases を集計し、ratified なのに done でない相を持つ領域を数える…"
ledgers: 13
ok  paradise/claude-md-diet        ratified 6/6  phases[done=11]
ok  paradise/conclave-resume       ratified 6/6  phases[done=11]
ok  paradise/dashboard-living-gate ratified 6/6  phases[done=11]
ok  paradise/eval-gauge            ratified 6/6  phases[done=11]
ok  paradise/gate-filter           ratified 6/6  phases[done=11]
ok  paradise/gauge-ledger-idempotent ratified 6/6 phases[done=11]
ok  paradise/judgment-triad        ratified 1/6  phases[done=1 pending=10]
ok  paradise/pontiff-office        ratified 6/6  phases[done=11]
ok  paradise/route-misfire         ratified 6/6  phases[done=11]
ok  paradise/sovereign-abode       ratified 6/6  phases[done=11]
ok  creations/coin                 ratified 6/6  phases[done=11]
ok  creations/habit                ratified 6/6  phases[done=11]
ok  creations/tenbin               ratified 6/6  phases[done=17]
---
赤くなる台帳: 0 / 13  赤い領域: 0  未doneの相: 0
```

**なぜ 0 なのか — 関門は「今の状態」を見るのであって「歴史」を見ないからである。**
`ratify` を先に叩いた台帳も、その後に相を done にしていれば、**現在の状態は整合している**。
歴史を裁くと 6 件が赤くなる(参考値):

```
$ node -e "…history を時系列に走査し、ratify 事象の時点で done でなかった相を数える…"
VIOL paradise/gauge-ledger-idempotent discovery -> discover
VIOL paradise/judgment-triad         discovery -> discover
VIOL paradise/route-misfire          discovery -> discover
VIOL paradise/route-misfire          requirements -> specify
VIOL paradise/route-misfire          architecture -> design
VIOL paradise/sovereign-abode        discovery -> discover
--- ratify 事象 83  違反 6  違反を含む台帳 4
```

**本走行自身(`paradise/judgment-triad`)がその一つである** —— 教主が目撃したとおり、
`done` が序列未宣言で拒まれた直後に `ratify discovery` が通った。現在は `discover=done` なので状態は整合している。

> **要求: 関門は「現在の状態」を見よ。歴史の遡及検査は本走行の範囲外である**(第5節)。
> 理由: (1) 歴史を裁くと過去 4 台帳の修復作業が発生するが、その 4 本はいずれも
> **最終的には仕事が済んでいる**ので、直すべき嘘が現存しない。(2) 歴史の検査は
> `conclave.js audit` 側の主題(R2)であり、R2 は findings 5.7 が「当てる前に測れ」とした未裁定の候補である。

- 撃つ門: **既存 `graph/conclave.js audit`**(exit 0 のままであること)
- 裁き方: 修理の相は `node graph/conclave.js audit ; echo EXIT=$?` を走らせ、
  `見捨てられた走行: 0 / 判定不能: 0 / 全 13` と `EXIT=0` を確かめる(findings 4.5 の基準線と同一)。

### 4.2 PARA-7 / PARA-9 — 道選び

#### AC-5 — 受け入れコーパス 101 件で、非対角の 30 セルすべてが 0

修理後の `graph/forge.js` に対し、第3.1節のコーパス(101 件)で 6×6 混同行列を撃つと:

- **対角の合計 = 101**
- **非ゼロの非対角セル数 = 0 / 30**

「対角 96/101」のような部分点は不合格(第61条)。

- 撃つ門: **既存 `tests/route-matrix.test.js`** の `M-3 [非対角]: 非対角の各セルが 0` と
  `M-2 [対角]: 対角線の合計がコーパスの件数と等しい`
- 補助の計測器: `reform/judgment-triad/_matrix_probe.js`(コーパスを 101 件へ更新して再走)
- 裁き方: `node tests/route-matrix.test.js ; echo EXIT=$?` → `EXIT=0`、かつ末尾が
  `Route matrix self-test: N passed, 0 failed`

#### AC-6 — 的は既存門のコーパスに入り、FLOOR も同じ commit で上がる

`tests/route-matrix.test.js` の `W-1 [門番]` が道ごとの件数 FLOOR を凍らせている(findings 5.8-2)。
判定器と**同じ commit で**コーパスと FLOOR を動かすこと。

| 道 | 現 FLOOR | 足す的 | **新 FLOOR(下限)** |
|----|---------|--------|---------------------|
| counsel | 42 | 0 | 42(据置) |
| cartography | 9 | 0 | 9(据置) |
| reform | 11 | 0 | 11(据置) |
| quick | 8 | 0 | 8(据置) |
| standard | 9 | PARA-9 の 2 件 + **サイト語×部分機能 5 件** | **16** |
| full | 8 | PARA-7 の 7 件 + PARA-9 の 1 件(`家系図を作れるアプリが欲しい`) | **16** |

**standard に足す 5 件**(本相の実測 2.3 — C1 単独が 5/5 壊す的):

```
レシピサイトの並び替えを実装して
サイトの検索機能を実装して
通販サイトのクーポン計算を作る
add a sort option to the recipe site
implement pagination for the site listing
```

- 撃つ門: **既存 `tests/route-matrix.test.js`** の `W-1 [門番]: コーパスは宣言された下限を保つ`(L334-342)
- 裁き方: FLOOR を上げずにコーパスだけ足せば門番は鳴らない(下限は下限だから)。
  ゆえに**門番が守っているのは「減らさないこと」だけである** —— 修理の相は
  上表の新 FLOOR を `tests/route-matrix.test.js` L336 の `FLOOR` に**手で書き込む**こと。
  書き込み忘れは AC-6 の不履行であり、レビュー(quality 相)が目で確かめる唯一の項目である。

#### AC-7 — 外した 2 件は「忘れられない形」で残る

第3.4節で受け入れコーパスから外した PARA-10 / PARA-11 の 2 件は、
`reform/judgment-triad/debt.md` に第3.4節の表の形(札・願い・現状の道・正解の道・原因)で記録する。

さらに **門がその存在を撃つ**:

- **新設 `tests/route-debt.test.js`**(あるいは `tests/route-matrix.test.js` 内の `D-1` 節)が、
  2 件の願いを `chooseScale` に通し、**現在の(誤った)道と一致すること**を assert する。
- すなわち **xfail 方式**: 誰かが PARA-10/PARA-11 を直した瞬間にこの門が**赤くなり**、
  「残債が解消されたので `debt.md` から外して本コーパスへ昇格させよ」と教える。

| 願い | この門が期待する道(現状) | 正解 |
|------|------------------------|------|
| `一門の家系図を作れるアプリが欲しい` | `reform` | `full` |
| `相関図を描けるアプリを作って` | `cartography` | `full` |

- 撃つ門: **新設 `tests/route-debt.test.js`**
- 裁き方: `assert.strictEqual(forge.chooseScale('一門の家系図を作れるアプリが欲しい'), 'reform',
  'PARA-10 が直ったなら debt.md から外し、FLOOR を上げて本コーパスへ昇格させよ')`
- **第21条との関係**: これは門を緩めていない。**嘘を「嘘である」と名指しして凍らせている。**
  黙って外せば緩めたことになるが、赤くなる形で凍らせれば、それは未払いの債務の記録である。

#### AC-8 — C2 は採らない(既存門を赤くする候補の明示的な排除)

`isCartography` に `if (wantsProduct(wish)) return false;` を置く素朴版(findings 5.4 の C2)を**採ってはならない**。
実測で `cartography → reform` を 2 件作り、うち 1 件は既存門のコーパスの願い
(`楽園の相の系統図を描いてほしい`)であり、`tests/route-matrix.test.js` が **exit 1** になる。

- 撃つ門: **既存 `tests/route-matrix.test.js`**(C2 を入れれば自動で赤くなる)
- 裁き方: AC-5 が満たされていれば自動的に排除される。本 AC は**設計相への申し送り**として書く。

### 4.3 結線と回帰

#### AC-9 — 新設した門はすべて結線される(第44条)

`tests/ratify-guard.test.js` と `tests/route-debt.test.js` は、CI か `tests/paradise.test.js` の
どちらかから**同じ commit で**呼ばれること。

- 撃つ門: **既存 `node graph/wiring.js check`**
- 裁き方: `node graph/wiring.js check ; echo EXIT=$?` → `EXIT=0`、かつ
  `✓ 門 N 本すべてに走らせる者が居る (第44条)` の N が 21 から**増えている**こと
  (findings 4.4 の基準線 = 21 本)。増えていなければ、足した門が数えられていない。

#### AC-10 — 五つの基準線の門がすべて緑に戻る

修理後、**本物のリポジトリで**(写しではなく)次の 5 本を**一つずつ**走らせ、すべて exit 0:

| 門 | 要求する末尾 |
|----|-------------|
| `node tests/paradise.test.js` | `Paradise self-test: N passed, 0 failed`(**N ≥ 471**、写しの 469+2skipped を使うな) |
| `node tests/route-matrix.test.js` | `Route matrix self-test: N passed, 0 failed` |
| `node tests/counsel.test.js` | `Counsel self-test: 210 passed, 0 failed` |
| `node graph/wiring.js check` | `✓ 門 N 本すべてに走らせる者が居る (第44条)` |
| `node graph/conclave.js audit` | `見捨てられた走行: 0 / 判定不能: 0 / 全 13` |

- **同時並行で走らせるな**(findings 6.2 / 本相 2.2 の実測)。同時並行の測定は測定ではない。
- 本相の実測により、`tests/paradise.test.js` は R1 の下で **L797-799 の fixture に `'ux'` を足す**
  必要がある(第2.2節)。これは門の修正であって門の緩和ではない。

#### AC-11 — README の数を手で書かない(第22条)

門の本数が変われば `tests/paradise.test.js` の総数も変わる。README の数は
`node graph/census.js fix` が測定から書く。**手で書き換えてはならない。**

- 撃つ門: **既存 `tests/paradise.test.js`** の census 系の門(findings 4.1 の末尾に `gate-filter: census は自己診断を素で呼ぶ`)
- 裁き方: `node graph/census.js fix` を走らせた後に `git diff README.md` が
  数の行だけを変えていること。

---

## 5. 範囲外(本走行でやらないこと)

以下は**意図的に**やらない。やらない理由を添える。第16条(沈黙の落下を禁じる)に従い、黙って落とさない。

| やらないこと | 理由 | どうするか |
|------------|------|-----------|
| **PARA-10**(`REFORM_RE` の弱い印「門」)の修理 | 第3.4節の裁定。弱い印の撃ち捨ては既存門のコーパスを 1 件殺し(本相 2.4 実測)、しかも的は直らない。`REFORM_RE` の再設計は reform 15 件を撃ち直す別走行 | `debt.md` に記録 + `tests/route-debt.test.js` で凍結(AC-7) |
| **PARA-11**(`PRODUCT_FALSE_FRIENDS` の文全体無効化)の修理 | 同上。`wantsProduct()` 自身も同じ形をしている疑いが在り(findings 5.5 の申し送り)、**未測定**。測らずに触れば第61条の轍を踏む | `debt.md` に記録 + `tests/route-debt.test.js` で凍結(AC-7) |
| **R2**(`runAbandonment()` の `closed` 判定に相の done を加える) | findings 5.7 が「当てる前に 13 本の内訳を測れ」とした候補。AC-4 の実測で「現在の状態は 13/13 整合」と分かったので R2 を入れても即座には赤くならないが、`closed` の意味を変えることは `conclave.js audit` の契約の変更であり、dashboard 系の門(`dashboard-states` 等)への波及が**未測定**である | 別走行。`debt.md` に `PARA-12` として記録することを推奨 |
| **R3**(ratify にも証拠 `--evidence` を要求する) | 運用が重くなる。AC-1〜AC-3 で「祝福の側が無条件」という非対称(findings 1.1)は消えるので、本走行の目的は達する | 別走行 |
| **走行台帳の歴史の遡及検査** | AC-4 の実測どおり、歴史を裁けば 4 台帳 6 件が赤くなるが、その 4 本は最終的に仕事が済んでおり**直すべき嘘が現存しない**。過去の帳を書き換えるのは版管理下の記録の改竄であり、第22条の趣旨に反する | やらない。本書に記録を残すことで足りる |
| **README の 451 → 471 の手書き修正** | 第22条。`node graph/census.js fix` が測定から書く(findings 5.8-4) | AC-11 |
| **写しの上での最終判定** | `.git` を写さない写しでは `hermetic` 2 本 / `AC-12e` / `dashboard-count` が**対照群でも** ✗ になる(本相 2.2 の実測) | AC-10 は**本物のリポジトリ**での走行を要求する |
| **`quick` の道への手入れ** | 基準線・C1 適用後ともに `quick` 行は 15/15 で無傷(findings 3.2 / 本相 2.3) | 触らない |
| **counsel / cartography / reform の語彙の拡張** | findings 3.3: 誤着 12 件は全て `full` と `standard` の行に集中。三道の行は完全に対角 | 触らない(C2a が cartography を 15/15 で守ることは findings 5.5 で実測済み) |

---

## 6. 回帰の守り — この修理が壊しうる既存の振る舞いと、それを守る門

| # | 壊しうる振る舞い | どう壊れるか(実測または理路) | 守る門 |
|---|-----------------|---------------------------|--------|
| R-1 | **`--reject` による上流への差し戻し**(第14条の大きな環) | 関門を reject 側にも付けると、着手前の相を差し戻せなくなる | **新設 `tests/ratify-guard.test.js`** の AC-3(a) の門(相が全て pending でも reject が通ることを assert)+ **既存 `tests/paradise.test.js`** の `domain-level reject triggers an INNER rework` / `a review class can send work back ACROSS domains` |
| R-2 | **中断からの復帰**(第51条 `resume`) | `resume` は相を `rework` に戻す。R1 が `rework` を拒む(AC-3(b))ので、復帰後に ratify を急ぐ流れが止まる —— **これは正しい停止である**が、`resume` 系の門が ratify に寄りかかっていれば赤くなる | **既存 `tests/paradise.test.js`** の `conclave: 中断→復帰→complete まで環が回りきる (第51条a)`。**実測: R1 の下でも ✓**(本相 2.2 の生出力) |
| R-3 | **環が最後まで回ること**(`complete` に到達する) | 関門が厳しすぎて `next()` が `complete` に届かなくなる | **既存 `tests/paradise.test.js`** の `conclave completes when all domains are ratified` / `conclave: 中断→復帰→complete まで環が回りきる`。**実測: R1 の下でも ✓** |
| R-4 | **`MAX_DOMAIN_REWORK` の閉塞機構**(第51条c) | AC-3(c2) の穴 —— `blocked` になった領域が相を done にすれば自力で ratified に化け、**教主を呼ぶ機構が無効化される** | **新設 `tests/ratify-guard.test.js`** の AC-3(c2) の門。**既存 `tests/paradise.test.js`** の `domain loop-guard blocks a cardinal after MAX_DOMAIN_REWORK` / `conclave: 回復は有限で、尽きたら閉塞して人を呼ぶ (第51条c)` |
| R-5 | **既存門の fixture が PARA-6 の抜け道に寄りかかっていた箇所** | `tests/paradise.test.js` L797-799 が `ux` を done にせず `ratify(architecture)` を撃っている。**実測: R1 の下で ✗ になる**(本相 2.2)。これは**正しい赤**であり、fixture 側を直す | **既存 `tests/paradise.test.js`** の `cross-domain rework also resets DOWNSTREAM phases in later domains`。修理の相は配列に `'ux'` を足す |
| R-6 | **cartography の道 15 件**(図そのものを求める願い) | PARA-9 の素朴な修理 C2 が 2 件を reform へ攫う。うち 1 件は既存門のコーパス | **既存 `tests/route-matrix.test.js`** の `M-3 [非対角]`。**実測: C2 で exit 1、C2a で exit 0**(findings 5.4 / 5.5) |
| R-7 | **standard の部分機能の依頼**(「サイトの◯◯を実装して」) | C1 が「サイト」語を無条件に full へ上げると 5/5 が full へ跳ねる。**本相の新実測**(2.3) | **既存 `tests/route-matrix.test.js`** の `M-3 [非対角]` + **AC-6 で足す 5 件の的**。的を足さねばこの門は撃てない |
| R-8 | **quick の道 15 件**(「サイトのタイポを直す」等) | `quick` の判定段は `full` より先なので理論上は安全 | **既存 `tests/route-matrix.test.js`**。**実測: C1 の下でも `サイトのタイポを直す -> quick`、`fix a typo on the website -> quick`**(本相 2.3) |
| R-9 | **counsel の道 42 件**(熟議の綱引き) | `wantsProduct()` 周辺を触ると `isCounsel()` の `DOC_RE && !wantsProduct()` に波及しうる。**C2a は `wantsProduct` 自体を変えず、`isCartography` 内に新しい述語を置く形なので波及しない** | **既存 `tests/counsel.test.js`**(210 門)+ `tests/route-matrix.test.js` の `W-4 [門番]: 熟議語彙の各語につき、その語だけが標識の願いが在る`。**実測: C3 で 210 passed 0 failed**(findings 5.6) |
| R-10 | **reform の道 15 件** | PARA-10 に手を出せば `門` の撃ち捨てで `門に監査の一段を足す` が死ぬ(本相 2.4 実測)。**本走行は PARA-10 に触らないので無傷** | **既存 `tests/route-matrix.test.js`** の `M-2`/`M-3`。範囲外宣言(第5節)が守る |
| R-11 | **門の孤児検査**(第44条) | 新設 2 門を結線し忘れると `wiring.js check` が赤 | **既存 `node graph/wiring.js check`**(AC-9) |
| R-12 | **README の門の本数**(第22条) | 門を足すと総数が変わる。手書きすれば census 系の門が鳴る | **既存 `tests/paradise.test.js`** の census 系の門(AC-11) |
| R-13 | **`conclave.js audit` の 13 台帳の裁き** | R1 は `ratify` の入口だけを変え、`runAbandonment()` を触らないので audit の出力は不変。**実測: 13/13 が現在の状態で整合**(AC-4) | **既存 `node graph/conclave.js audit`**(AC-4/AC-10) |

---

## 7. 非機能要件 (NFR)

| # | 要件 | 裁き方 |
|---|------|--------|
| **NFR-1** | **測定は一つずつ走らせる。** 門を同時並行で走らせた結果を判定に使わない | findings 6.2 と本相 2.2 の実測が根拠。修理の相は AC-10 の 5 本を逐次に走らせ、各々の exit code を記録する |
| **NFR-2** | **写しの数を最終判定に使わない。** `.git` を写さない写しでは対照群でも 4 本が ✗ になる | AC-10。最終判定は**本物のリポジトリ**で |
| **NFR-3** | **判定器とコーパスと FLOOR は同じ commit で動かす。** 片方だけを動かした中間状態を commit しない | `git show --stat <sha>` に `graph/forge.js` と `tests/route-matrix.test.js` が同時に載ること |
| **NFR-4** | **`graph/` の計測は写しの上で行う。** 本物の `graph/` を曲げて測ってはならない | 本相の全計測器が守った。`git status --porcelain` が `graph/` の変更 0 件を示す |
| **NFR-5** | **判定器の速度を落とさない。** `chooseScale` は正規表現の評価のみで、外部 I/O を持ち込まない | `tests/route-matrix.test.js` が 101 件を撃っても実行時間が体感で変わらないこと(現状 13 門で即時) |
| **NFR-6** | **拒否の文言は次の一手を含む。** 「not done」だけでなく、どの相がどの状態かを列挙し、`conclave.js done <id>` を示唆する | AC-1 の門が標準エラーの本文を正規表現で撃つ |
| **NFR-7** | **関門は「現在の状態」のみを見る。** 歴史(`run.history`)を参照しない | 実装が `d.phases` のみを読むこと。歴史を読めば古い台帳の扱いが不安定になる(AC-4 の裁定) |
| **NFR-8** | **第60条(b): 規則を足したら両枝を持て。** 日本語の語彙を足したら英語も足す | 本相 2.3 / findings 5.3 の実測(C1a は 92/98、C1b は 87/98 — 片枝では足りない)。AC-6 の的が日英の両方を含む |
| **NFR-9** | **部分適用しない。** 関門が拒んだとき、`run` のどの印も変わっていない | AC-1 の門が `assert.strictEqual(d.status, 'pending')` で撃つ |

---

## 8. 本相が何も壊していないことの確認

```
$ git branch --show-current
reform/judgment-triad

$ git status --porcelain
?? reform/judgment-triad/

$ git diff --stat HEAD -- graph/ tests/
(空)
```

**追跡下のファイルの変更は 0 件。`graph/` と `tests/` は一行も変わっていない。**
本相の全ての実測は `$LOCALAPPDATA/Temp/{solo_ctrl,solo_r1,spec_probe}` に写した複製の上で行った。
何も commit していない。

---

## 9. 修理の相への引き継ぎ — 手順の順序

1. **R1 を `graph/conclave.js` の `ratify()` に入れる**(AC-1)。`d.status === 'blocked'` も拒むこと(AC-3(c2))。
2. **`tests/paradise.test.js` L797-799 の fixture に `'ux'` を足す**(R-5 / 本相 2.2 の実測)。
3. **`tests/ratify-guard.test.js` を新設**(AC-2 / AC-3 の 4 枝)し、`paradise.test.js` か CI に結線する(AC-9)。
4. **C1 を「産物全体」にだけ当たる形に設計する**(AC-5 / 本相 2.3 — 素の C1 は standard を 5 件奪う)。
5. **C2a を `isCartography` に入れる**(findings 5.5)。**C2 は採らない**(AC-8)。
6. **`tests/route-matrix.test.js` のコーパスに的を足し、FLOOR を上げる**(AC-6)。
7. **`debt.md` と `tests/route-debt.test.js` で PARA-10/PARA-11 を凍らせる**(AC-7)。
8. **AC-10 の 5 本を本物のリポジトリで一つずつ走らせる**(NFR-1 / NFR-2)。
9. **`node graph/census.js fix` を走らせる**(AC-11)。手で数を書かない。
