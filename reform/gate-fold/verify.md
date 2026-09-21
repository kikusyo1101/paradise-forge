# 畳み機構 — verify 相(検める者の手による実走)

対象: `reform/gate-fold` 枝 HEAD = `2fdd8fb`
基準: `6641e3b`(main のマージ点 / 改修前)
機: Windows 11 / git-bash / node — 本物の倉 `C:/Users/kikus/Documents/workspace/paradise`

> **この稿は教主の下書きを検め、検める者が自分の実測で書き直したものである。**
> 教主の値を写していない。**数が違ったところは「違った」と書いた**(第27条 / 第38条)。

---

## 0. 裁定(先に結論を置く)

> ## ❌ **verify は赤。quality は批准できない。**

**BLOCK 1 件を実測で掘り当てた** — `PARADISE_NO_FOLD=1` を立てて全走すると、
**畳みを見張る常駐の門のうち 4 本が落ちる**(§3)。これは review 相の F-1 と**同型の病**が
`tests/paradise.test.js` 側に残っていたものである。

門の本数は 500 で減っていない(§5)。V3 の赤は **既往症であり新病ではない**ことを
基準線の実走で裏づけた(§4)。だが **BLOCK が一本立っている以上、緑とは呼べない**(第37条)。

| # | 命令 | 結果 | 所要 | 裁定 |
|---|---|---|---|---|
| **V1** | `PARADISE_NO_FOLD=1` 全走(本物の倉) | `496 passed, **4 failed**` / exit 1 | 514s | 🔴 **BLOCK** |
| **V1b** | `PARADISE_FOLD_LEDGER=<空>` 全走(本物の倉) | `500 passed, 0 failed` / exit 0 | 389s | ✅ |
| **V2** | `PARADISE_ABODE=repo`(**worktree** で撃った) | `435 passed, 63 failed` / exit 1 | 396s | ⚠️ **測定の誤り**(§6) |
| **V2b** | `PARADISE_ABODE=repo`(**本物の倉**で撃ち直し) | `500 passed, 0 failed` / exit 0 | 384s | ✅ |
| **V3** | 素の環境 `PARADISE_UPSTREAM/CLAUDE_HOME=/nonexistent` | `426 passed, 69 failed, 5 skipped` / exit 1 | — | 🟡 **既往症**(§4) |
| **VBASE** | 同上を **6641e3b**(改修前)で | `418 passed, 69 failed, 5 skipped` / exit 1 | — | 対照 |
| **V4** | `PARADISE_NO_FOLD=1` + 仮台帳 の `fold.test.js` | `Fold self-test: 36 passed, 0 failed` / exit 0 | 324s | ✅ |
| **V5** | `--gate-list` | `Paradise gate list: 500 gates` / exit 0 | 数秒 | ✅ |

生出力: `$LOCALAPPDATA/Temp/verify2/{v1,v1b,v2,v2b,v3,vbase,v4,v5}.txt`
および事故の証拠 `v1-FOLDED-accident.txt`(§1)

---

## 1. 🔴 **この相の全走が、先行する走行の領収書で畳まれた** — 実際に踏んだ事故

**検める者の最初の V1 は、一門も走らずに緑を名乗った。**

```
$ cd C:/Users/kikus/Documents/workspace/paradise && node tests/paradise.test.js
Paradise fold: Executed 0 out of 1 runs (1 reused, key=a276973d7090e87a)
Paradise fold: 写し元の領収書 at=2026-09-21T08:36:55.589Z exit=0 key=a276973d7090e87a
EXIT=0
```

**出力はこの 3 行で全部である**(ファイル長 **173 バイト**。本物の全走は約 **104,000 バイト**)。
`EXIT=0` は「走って緑」ではない。**「畳んだ」である。**
写し元の領収書 `at=2026-09-21T08:36:55` は**教主が数時間前に撃った走行のもの**であり、
検める者の走行ではない。

**これは第37条(不在は通過ではない)そのものである。**
`verify` 相 —— **改修が正しいことを独立に確かめるための相** —— が、
**まさにその改修が畳んだ過去の緑によって、確かめる行為そのものを省略された。**

### 1.1 なぜ起きるか — 手元の `runId()` は走行を跨いで定数である

`graph/fold.js:74-81`:

```js
function runId(opts = {}) {
  const named = env.PARADISE_FOLD_RUN;
  if (named) return String(named);
  if (env.CI === 'true' || env.GITHUB_ACTIONS === 'true') return null;
  const seed = [require('os').hostname(), ROOT].join('\0');
  return 'local-' + crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16);
}
```

**同じ機・同じ倉なら永久に同じ値**である。現物の台帳にもそれが残っていた:

```
$ tail -1 .claude/paradise-fold-ledger.jsonl
{"at":"2026-09-21T08:36:55.589Z","run":"local-9101cc8e1ffc5732","key":"a276973d7090e87a",
 "exit":0,"summary":"Paradise self-test: 500 passed, 0 failed"}
```

CI では `PARADISE_FOLD_RUN=gh-${run_id}-${run_attempt}` が走行を隔て、台帳も `runner.temp` に住むので
**この事故は起きない**。起きるのは**手元だけ**である。`rework.md §11.1` はこれを自白しているが、
**「verify 相そのものが畳まれうる」という形での危険は誰も名指していなかった。**

### 1.2 残債に名を与える — **R-V1「検証の自己畳み」**

> **検証を目的とする走行は、畳みの対象にしてはならない。**
> 畳みは「同じ入力なら結果も同じ」という仮定に立つが、**verify 相の目的は
> その仮定を疑うこと自体**である。疑う者が疑われる機構に畳まれれば、検証は成立しない。

手当ての案(**この相では実装しない** — 検める者は直さない):
- `verify` / 独立検証の走行は `PARADISE_FOLD_LEDGER` を毎回別ファイルにする運用を掟に書く、または
- 手元の `runId()` に**時刻の粒**を入れて走行を隔てる(ただし手元の畳みの値打ちは減る — 要判断)

### 1.3 以後この相で撃った全走は畳ませていない(証拠つき)

以後の全走は先頭行で**実際に走ったこと**を名乗っている:

```
V1  : Paradise fold: Executed 1 out of 1 runs (0 reused, bail=disabled)     / 514s
V1b : Paradise fold: Executed 1 out of 1 runs (0 reused, bail=no-receipt)   / 389s
V2b : Paradise fold: Executed 1 out of 1 runs (0 reused, bail=no-receipt)   / 384s
V3  : Paradise fold: Executed 1 out of 1 runs (0 reused, bail=key-miss)     / (worktree)
```

**`reused` が 0 であること**と**所要が 324〜514 秒であること**の二つで裏を取った
(畳まれた走行は 1 秒未満で終わる)。

---

## 2. V5 — 門は一本も減っていない

```
$ node tests/paradise.test.js --gate-list | tail -1
Paradise gate list: 500 gates          ← exit 0
```

改修前 `6641e3b` の素の全走が名乗った総数は **492**(`418 + 69 + 5`)、
改修後 HEAD は **500**(`426 + 69 + 5`)。**+8 本。一本も減っていない。**

---

## 3. 🔴 **BLOCK — `PARADISE_NO_FOLD=1` で畳みの門 4 本が落ちる**

### 3.1 数で示す — **旗の有無だけで結果が割れる**

同じ倉・同じ HEAD・同じ日に撃った二本:

```
V1  : PARADISE_NO_FOLD=1 node tests/paradise.test.js
      → Paradise self-test: 496 passed, 4 failed     exit 1   514s

V1b : PARADISE_FOLD_LEDGER=<空の仮パス> node tests/paradise.test.js
      → Paradise self-test: 500 passed, 0 failed     exit 0   389s
```

**差は `PARADISE_NO_FOLD=1` の一点のみ。** 落ちた 4 門は全て `fold:` の常駐の門である。

### 3.2 落ちた 4 門と行番号(`tests/paradise.test.js`)

| 行 | 門 | 生の診断 |
|---|---|---|
| **10934** | `fold: 宣言外の状態に依る走行は畳まれない (揟2 / 第37条)` | `=global の bail が disabled` / `+ 'disabled' - 'undeclared-state'` |
| **10988** | `fold: 総数と実行数は別の数である (第22条 / 揟4)` | `前提が崩れた — 畳める状態を作れていない` / `false !== true` |
| **11064** | `fold: 何もかも畳む機構は測定ではない` | `前提が崩れた — 健全な器が key-miss を返さない` / `+ 'disabled' - 'key-miss'` |
| **11116** | `fold: 畳んだ走行は写し元を名乗る — 名乗りは死にコードの後ろへ移らない (prove M-14)` | `前提が崩れた — 畳める台帳を作れていない: Paradise fold: Executed 1 out of 1 runs (0 reused, bail=disabled)` |

### 3.3 根本原因 — 4 門とも `{...process.env}` を `decide()` に流している

```js
// 10988 / 11116 の型
const asRepo = { ...process.env, PARADISE_ABODE: 'repo' };
const k = fld.key({ env: asRepo });
fld.append({ key: k, exit: 0, ... }, { file });
const folded = fld.decide({ file, env: asRepo });
assert.strictEqual(folded.fold, true, '前提が崩れた — 畳める状態を作れていない');
```

`PARADISE_ABODE` は**宣言し直している**が `PARADISE_NO_FOLD` は**継いでいる**。
`fold.js:610` の `const off = opts.off === true || env.PARADISE_NO_FOLD === '1';` が
**何より先に効く**(AC-18「出口は常に開いている」)ので、`decide()` は鍵も見ずに
`bail='disabled'` を返し、**門が測りたい振る舞いに到達する前に前提が崩れる。**

### 3.4 これは F-1 と同型 — **手当てが片側にしか施されていない**

rework は `tests/fold.test.js` 側に手当てを入れた(`tests/fold.test.js:45-51` 付近が
仮倉を立て `PARADISE_FOLD_LEDGER` を振り替え、門が自分の測る世界を自分で宣言する)。
**だが `tests/paradise.test.js` の常駐の fold 門 7 本には同じ手当てが無い:**

```
$ grep -n "PARADISE_NO_FOLD" tests/paradise.test.js
152:  off: process.env.PARADISE_NO_FOLD === '1' || (typeof GATE !== 'undefined' && GATE.noFold === true),
10916: *    📒 Fold 段が `PARADISE_NO_FOLD=1` で走るので、**畳みが切られた世界で**
```

**10916 行は皮肉である。** 設計の註はまさにこの盲点を予見して
「`fold.test.js` に置けば `PARADISE_NO_FOLD=1` の世界で常に緑の飾りになるから、
**だから `paradise.test.js` に住まわせる**」と書いている。
**住所は正しく選ばれたが、旗を中和する手当てが伴っていない** —— 外から旗を立てられれば、
場所を移しただけでは守れない。

### 3.5 CI では今のところ鳴らない — だが欠陥は実在する(正直に)

`.github/workflows/tribunal.yml` を読むと `PARADISE_NO_FOLD: '1'` は
**`📒 Fold` 段(`fold.test.js`)に限ってスコープされており**(172-174 行)、
`⚖️ Self-test` 段(`paradise.test.js`、26-44 行)には立っていない。
**ゆえに現行の CI 設定ではこの 4 門は赤くならない。**

それでも **BLOCK と判ずる**:

- `PARADISE_NO_FOLD=1` は **AC-18 が保証する公の逃げ道**である。
  **掟が「いつでも使ってよい」と約束した旗を使っただけで 4 門が偽の赤を出す**のは、
  第62条(b)「**偽の赤は真の赤より有害である**」に正面から触れる。
- CI が今そう書かれているのは**偶然の配置**であって門の性質ではない。
  誰かが Self-test 段に同じ旗を足した瞬間、**畳みを見張る門が黙る**(F-1 の再演)。
- **畳みを見張る門が、畳みを切る旗で黙らされる** —— これは第56条(b)
  「門番は絞り込みの外に立つ」の違反そのものである。

> **実装は直していない。** 検める者は名指すのみである(依頼の掟)。

---

## 4. V3 の赤は **既往症である** — 条件を揃えた対照で裏を取った

### 4.1 教主の値とは**違った**(第27条)

| | 教主の下書き | **検める者の実測** |
|---|---|---|
| V3 | `491 passed, 6 failed, 3 skipped` | **`426 passed, 69 failed, 5 skipped`** |
| 基準線 | `418 passed, 69 failed, 5 skipped` | `418 passed, 69 failed, 5 skipped`(一致) |

**違いの出所は場所である。** 検める者は V3 を **worktree** で撃った(§6 の罠)。
教主は本物の倉で撃ったと見られる。**同じ命令でも場所が違えば別の数が出る。**
教主の 6 門の一覧はそれ自体としては正しいが、**検める者の条件では再現しない**ので写さなかった。

### 4.2 それでも裁定は変わらない — **条件を揃えた比較は完全に一致した**

**両側を同じ種類の場所(worktree)で撃った:**

```
$ git worktree add --detach $TEMP/head3 2fdd8fb     # 改修後
$ git worktree add --detach $TEMP/base2 6641e3b     # 改修前

$ (両方で) PARADISE_UPSTREAM=/nonexistent CLAUDE_HOME=/nonexistent node tests/paradise.test.js

head3 (2fdd8fb) : Paradise self-test: 426 passed, 69 failed, 5 skipped   exit 1
base2 (6641e3b) : Paradise self-test: 418 passed, 69 failed, 5 skipped   exit 1
```

**落ちた門の集合を突き合わせた:**

```
$ comm -23 fail-head.txt fail-base.txt     # 改修後にだけ在る赤(= 新病)
(出力なし)
$ comm -13 fail-head.txt fail-base.txt     # 改修前にだけ在る赤(= 治った門)
(出力なし)
$ diff fail-head.txt fail-base.txt && echo IDENTICAL
IDENTICAL (75 == 75, zero delta)
```

> **新病ゼロ。** 落ちた門の集合は**一本の差もなく同一**である。
> 改修は **+8 本の門を足し、その 8 本は素の環境でも全て緑**であり、**赤を一本も増やしていない。**

### 4.3 落ちた門は `fold` に一つも触れていない

```
$ grep -cE "✗ fold:" fail-head.txt
0
```

**69 の赤のうち `fold:` の常駐の門は一本も無い。** 顔ぶれは
`gauge:` / `gauge(CLI):` / `dashboard-count 系` / `AC-22b` / `D-3(故障注入)` /
`第52条` / `conclave` / `deploy` —— いずれも**実機の `~/.claude` の配備**か
**兄弟倉 `../paradise-creations` の実台帳**を前提にする門であり、
`CLAUDE_HOME=/nonexistent` と worktree はその前提を意図的に外す環境である。

> 補足(正直に): `✗` 行を数えると **75 行**出るが名乗りは **69 failed** である。
> 差の 6 行は子プロセスで撃つ門が**子の出力をそのまま echo している**ためと見られる。
> **両側で同じ 75 行が出ており比較の妥当性は保たれる**が、**この 6 行の出所は特定していない。**

---

## 5. V4 / V5 — 畳みの門束と門の本数

```
$ PARADISE_NO_FOLD=1 PARADISE_FOLD_LEDGER=<仮> node tests/fold.test.js
Fold self-test: 36 passed, 0 failed          ← exit 0 / 324s

$ node tests/paradise.test.js --gate-list | tail -1
Paradise gate list: 500 gates                ← exit 0
```

**V4 は CI と同じ env(`PARADISE_NO_FOLD=1`)で緑である** —— `fold.test.js` は
自分の世界を自分で宣言しているので旗に黙らされない。**§3 の BLOCK が
`paradise.test.js` 側だけの病であることの、もう一つの裏づけである。**

現物の台帳 `.claude/paradise-fold-ledger.jsonl` は全走の前後で汚していない(仮台帳に振り替えた)。

---

## 6. ⚠️ **測定上の罠 — worktree で撃つと兄弟倉が無く、必ず赤くなる**

**検める者と教主の二人がこれに引っかかった。第38条「条件を揃えよ」の実例として記す。**

```
V2  (worktree $TEMP/head2, PARADISE_ABODE=repo) : 435 passed, 63 failed, 2 skipped  exit 1
V2b (本物の倉,             PARADISE_ABODE=repo) : 500 passed,  0 failed             exit 0
```

**同じ HEAD・同じ env・違うのは場所だけで、63 門の差が出た。**
V2 で落ちた 63 門は `gauge:` / `gauge(CLI):` / `dashboard-count 系` / `AC-22b` /
`D-3(故障注入)` 系に集中しており、**これらは兄弟倉 `../paradise-creations` の実台帳を読む門**である。
worktree を `$LOCALAPPDATA/Temp/` に建てれば隣人は居ない —— **測っているのは改修ではなく隣人の有無である。**

**掟として書き留める:**

> **比較は両側を同じ種類の場所で撃て。** worktree 同士、または本物の倉同士。
> 片方だけ worktree にした比較は、**改修ではなく環境を測っている。**
> worktree は**基準線の比較にだけ**使い、**単独の合否判定には使うな。**

§4 の基準線比較はこの掟に従い **worktree 同士**で撃ったので妥当である。
§0 の表で V1/V1b/V2b/V4/V5 は全て**本物の倉**で撃った。

---

## 7. この相で**撃てなかったもの**(第37条)

| 撃てなかったもの | なぜ |
|---|---|
| **本物の CI 走行** | 手元に GitHub Actions が無い。`runner.temp` / `PARADISE_FOLD_RUN` / `github.run_id` は**模した env でしか撃っていない**。CI 上で畳みが実際に効くか(2,070s → 短縮)は **PR を開いて初めて実証される** |
| **改善の数値そのもの(第38条の本丸)** | **この改修の目的は CI 時間の短縮だが、本相はその短縮を一度も測っていない。** 手元の全走は 384〜514s で、畳みが効いたときの短縮幅は**手元では測れない**(手元は単一走行) |
| **`atlas check --all-scales` の実走** | 2 分 20 秒 + Chrome 32 起動。rework 相が一度実走したと報告しているが、**本相では撃ち直していない**(教主の下書きの記載を**検証していない**) |
| **V3 の 69 赤の個別の出所** | 「`~/.claude` と兄弟倉の不在による」と**分類**はしたが、**69 本を一本ずつ追ってはいない** |
| **`✗` 75 行 vs `69 failed` の差 6 行** | §4.3 の但し書き。**出所を特定していない** |
| **教主の V3 値(`491/6/3`)の再現** | 本物の倉で素の env を撃てば再現する見込みだが、**時間の都合で撃っていない**。ゆえに**教主の 6 門の一覧は本稿に採らなかった** |
| **`PARADISE_NO_FOLD=1` を本物の CI 設定に足したときの挙動** | §3.5 は `tribunal.yml` の**静的読解**による。**実際に足して撃ってはいない** |

---

## 8. 裁定(まとめ)

| 問い | 答え |
|---|---|
| **1. V1/V2/V4/V5 は緑か** | **V1 は赤(BLOCK)。** V1b / V2b / V4 / V5 は緑。V2 の赤は**環境由来**で BLOCK に数えない |
| **2. V3 の赤は既往症か新病か** | **既往症。** 条件を揃えた基準線比較で**落ちた門の集合が完全一致**(新病ゼロ) |
| **3. 落ちた門は `fold` に触れるか** | **V3 の 69 門は一本も触れない**(`✗ fold:` が 0 件)。**V1 の 4 門は `fold` そのもの** |
| **4. 門は 500 を下回らないか** | **下回らない。** `500 gates`(改修前 492 → +8) |
| **5. 撃てなかったもの** | §7 に 7 件を列挙 |

### 🔴 **verify は赤。quality は批准できない。**

- **BLOCK-V1**: `PARADISE_NO_FOLD=1`(AC-18 が保証する公の逃げ道)を立てると、
  **畳みを見張る常駐の門 4 本が偽の赤を出す**。`tests/paradise.test.js`
  **10934 / 10988 / 11064 / 11116**。F-1 と同型の病が片側に残っている。
  第56条(b)・第62条(b)に触れる。
- **R-V1(残債)**: **verify 相の全走が、先行する走行の領収書で畳まれうる**。
  検める者が実際に踏んだ(§1)。手元の `runId()` が走行を跨いで定数であることによる。

この改修は**骨格としては健全**である —— 門を減らさず(+8)、素の環境で新病を一本も生まず、
畳みの門束 36 本は CI と同じ env で緑である。**だが上の BLOCK が塞がるまで批准してはならない**(第37条)。

**直すのは build / rework の仕事であり、検める者の仕事ではない。**
