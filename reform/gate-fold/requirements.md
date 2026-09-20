# 楽園の門の肥大 — specify 相の要件

**相**: specify / **枝**: `reform/gate-fold` / **基点**: discover 相の `findings.md`(36KB)
**測定機**: Windows 11 + git-bash, node v24.14.0(ローカル)
**この相の分**: **何を直すかを選び、直ったと言える条件を機械が裁ける形で書く。**
設計(どう実装するか)は design 相の分であり、ここには書かない。

この文書の掟(discover 相から継ぐ): **生コマンド出力か `findings.md` の節番号の無い断定を書かない。**
本相で新たに測った分の生出力は `reform/gate-fold/raw/u2-html-hash.txt` / `u5-atlas-split.txt` /
`u6-census-split.txt` / `u7-savings.txt` / `u8-notests-trap.txt` に置いた。

---

## 0. 本相で新たに測ったもの(先に述べる)

discover 相が残した未測定と、選定に必要だが誰も測っていなかった数を、本相で自分で測った。

| # | 測ったこと | 結果 | 生出力 |
|---|---|---|---|
| **M-1** | U-2 の独立再現。IR が同一なら HTML もバイト同一か | **YES**。36 組合せ / 相異なるIR=16 / **相異なるHTML=16**。種数が一致 | `raw/u2-html-hash.txt` |
| **M-2** | Atlas 段の代の内訳(図の作成 vs ブラウザ検査) | 1 道の図の作成は **1,983ms**。6 道で **11.9s**。Atlas 335s の残り **323.1s がブラウザ検査** | `raw/u5-atlas-split.txt` |
| **M-3** | Census 段 423s のうち census 自身の仕事 | **3ms**(`census({runTests:false})`)。**423s のほぼ全部が自己診断の子プロセス** | `raw/u6-census-split.txt` |
| **M-4** | 削減見込みの算術 | P-1=843.0s / P-2=179.5s / P-3=17.2s | `raw/u7-savings.txt` |
| **M-5** | **既存の `--no-tests` は罠である** | `census check --no-tests` は **exit 0 / findings=0** を出すが、「README テスト数」の主張は `measurable=false` で**裁かれない** | `raw/u8-notests-trap.txt` |
| **M-6** | 実測 2,070s の run の種別 | `event=push` / `JOB: ⚖️ 執行官の裁定 = skipped`。**PR ではこの job が走り、`tribunal.yml:439` に 5 本目の全走が在る** | 下記 §0.2 |

### 0.1 M-1(U-2 の独立再現)— 畳みの鍵は「成果物のバイトハッシュ」でよい

```
$ node reform/gate-fold/raw/u2-html-hash.js
hierarchy   相異なるIR=1  相異なるHTML=1  [一致]
conclave    相異なるIR=6  相異なるHTML=6  [一致]
dispatch    相異なるIR=1  相異なるHTML=1  [一致]
dag         相異なるIR=6  相異なるHTML=6  [一致]
run         相異なるIR=1  相異なるHTML=1  [一致]
wiring      相異なるIR=1  相異なるHTML=1  [一致]

組み合わせ総数: 36
相異なるIR総数:   16
相異なるHTML総数: 16
U-2 判定: IR種数 == HTML種数 — IR が同一なら HTML もバイト同一(畳みの鍵に使える)
```

> ⚠️ **但し書き(第16条)**: ここで鍵にするのは **IR ではなく HTML のバイト列**である。
> IR 種数と HTML 種数が一致したことは「IR を鍵にしてよい」ことの**証拠ではあるが保証ではない**
> —— 次に `draw()` が変われば含意は壊れうる。**鍵は常に成果物の中身から採る。**
> 名(主題名・道名)でも、中間表現でもない。**第16条: 証拠は名ではなく振る舞いで裁く。**

### 0.2 M-6 — 2,070s は **下限**である(PR ではもう 1 本走る)

```
$ gh run view 35384344207 --json event,headBranch,jobs
event= push branch= main
JOB: 検証ゲート (self-test / policy / secrets) success steps= 53
JOB: 📣 発報 — 裁定を神へ運ぶ success steps= 3
JOB: ⚖️ 執行官の裁定 (independent judgment) skipped steps= 0
```

`tribunal.yml:385` は `if: github.event_name == 'pull_request'`。この run は push だったので
執行官の job は **skipped**。だがその job の中に **5 本目の全走**が在る:

```
$ awk 'NR>=381 && NR<=489 && /paradise\.test\.js/' .github/workflows/tribunal.yml
439:           TESTS=$(node tests/paradise.test.js 2>&1 | tail -1)
```

→ **findings.md の「1 CI で 4 回」は push の数である。PR では 5 回走る。**
本要件は **PR の 5 回目も射程に入れる**(FR-01 が数える対象に含める)。
但しその 5 回目は**別 job / 別 runner** なので、job 内の台帳では畳めない
(design 相の制約として §8 に申し送る)。

---

## 1. 直すものの選定と優先順

### 1.1 2,070s の解剖(実測)

```
$ node reform/gate-fold/raw/u7-savings.js
CI 1回 = 2070s
Abode(両居) 841s の内訳(363:364 で按分): repo=420s / global=421s
同一入力の自己診断 3 本: Self-test 427s + Census 423s + Abode-repo 420s = 1270s
Atlas 335s の内訳: 図の作成 11.9s / ブラウザ検査 323.1s (u5 実測 1道2.0s より)
検査回数 72 回 / うち余剰 40 回 / 残す 32 回  (u2: 4主題はHTMLがバイト同一)
```

按分の根拠: findings §1.2 の実測 `ELAPSED_REPO=363s` / `ELAPSED_GLOBAL=364s`。
**これは按分であって直接測定ではない**(CI の段は 2 走行を 1 段にまとめており、段の中の境が測れない)。
`420s` / `421s` は**推定値**として扱う。削減見込みの精度はここに懸かる。

### 1.2 採るものと順序

| 優先 | 名 | 何を直すか | 削減見込み | 偽の緑の危険度 | 根拠 |
|---|---|---|---:|---|---|
| **P-1** | 自己診断の走行台帳 | **同一入力の全走 3 本を 1 本にする**。Census と Abode(repo) は撃たずに台帳の領収書を読む | **843.0s (40.7%)** | **中** — 鍵の漏れが直に偽の緑になる(§4.2 Jest) | findings §1.2(md5 一致)/ M-3 |
| **P-2** | 成果物ハッシュによる検査の畳み | **同じ HTML を 6 回ブラウザで開くのをやめる**。72 検査 → 32 検査 | **179.5s (8.7%)** | **中** — 検査そのものを減らす。鍵が成果物のバイト列なので漏れにくいが、ゼロではない | M-1 / M-2 / findings §1.6 |
| **P-3** | Chrome の持ち回し | 起動だけを畳む。**検査は 1 つも減らない** | **17.2s (0.8%)** | **無** — 撃つ回数が減らないので原理的に偽の緑が出ない | findings §5.2 U-3(実測 12% 減)/ M-2 |

**合計 P-1+P-2 = 1,022.5s (49.4%) → 残り 1,047.5s**
**合計 P-1+P-2+P-3 = 1,039.7s (50.2%) → 残り 1,030.3s**

> ⚠️ **1,047.5 を「1,047」とも「1,048」とも書かない。** `toFixed(0)` が境界で揺れる値であり、
> 丸めた数を二箇所に書けば**同じ量が二つの数として散文に残る**(第22条が禁じる形)。
> **目標値は丸めずに 1,047.5s と書く**(AC-26 もこの数で裁く)。

### 1.3 なぜこの順序か

揟8 は「最初に採るべきは検査を減らさない畳み方」と言う。**本相はこれに部分的に従わない。**
理由は数である:

- **P-3(検査を減らさない畳み方)の取り分は 17.2s / 0.8% しかない。**
  findings §5.2 U-3 の実測が既にそう言っている ——「12% 減にとどまる」「代の大半は起動ではなく検査そのもの」。
  M-2 がその裏を取った: Atlas 335s のうち**図の作成は 11.9s、ブラウザ検査が 323.1s**。
  **起動代を全部消しても 2,070s は 2,053s にしかならない。**
- **P-1 は「検査を減らす」のではなく「同じ検査を 3 回するのをやめる」である。**
  findings §1.2 が **59,027 バイトの出力が 1 バイトも違わない**ことを md5 で実測した。
  畳んだ後も **492 門すべてが 1 回は撃たれる**。門の被覆は 1 本も減らない。
  → **揟8 の精神(検査を減らすな)を、取り分の大きい側で満たしている。**
- P-2 だけが本当に「検査を減らす」。ゆえに**最後から 2 番目**に置き、鍵を成果物のバイト列に限り(M-1)、
  疑わしきは畳まない(揟7)を AC で縛る。

> ⚠️ **P-3 を最後に置いたのは「効かないから」ではない。**
> P-2 を先にやると検査が 72→32 に減るので、P-3 の取り分も 323.1s ベースから減る(17.2s はその後の値)。
> **P-3 を単独で先にやれば取り分は 38.8s。** だが順序を入れ替えても合計は変わらないので、
> **危険度の低い順に倒す価値より、取り分の大きい順に倒す価値を採った。**

### 1.4 採らないと決めたもの(理由つき)

| 採らないもの | 秒 | 理由 |
|---|---:|---|
| **`PARADISE_ABODE=global` の走行を畳む** | 421s | **揟2 に反する。** findings §1.3 の実測で **6 門が別の答え**を出す(差分 12 行)。結果が `~/.claude` という**宣言外の状態**に依る。Bazel なら `tags=["external"]`(§4.3)。**畳んではならない。** |
| **門を減らす / 統合する** | — | discover 相が正規化して突き合わせた結果、**完全重複する門は 0 件**。消せる門は無い。第44条(b): 呼ばれない門は腐って嘘を語り始める。**減らすのは重複走行であって門ではない。** |
| **`--gate` 絞り込みを CI に持ち込む** | — | **第56条(d) が明文で禁じる**:「速さは全走を避ける口実にならない…CI は絞り込みを持ち込まない」。pytest `--lf` も提供元自身が開発の反復用と位置づける(findings §2.3)。 |
| **`census check --no-tests` を CI に置く** | 423s | **M-5 で罠であることを実証した。** exit 0 / findings=0 を出すが「README テスト数」の主張は `measurable=false` で**裁かれない**。これは第37条「不在は通過ではない」の教科書的違反であり、第22条の旗艦の数が黙って無検査になる。**P-1 はこの道を通ってはならない**(AC-04 が禁じる)。 |
| **`restore-keys` 型の部分一致で鍵を拾う** | — | **第16条に反する**(名で拾って振る舞いで裁いていない)。findings §2.4 が GitHub Actions の当該仕様を警告として引いている。 |
| **PR の 5 本目(執行官 job)を畳む** | 約 427s | **別 job / 別 runner** なので job 内の台帳が届かない。artifact 越しの受け渡しは新しい信頼境界を作る(findings §2.4 の security 警告)。**本改修の射程外**(§8 に申し送り)。 |
| **上位 4 段以外の 46 段(計 44s)** | 44s | CI 全体の **2.1%**。畳みの機構を建てる代のほうが高い。 |

---

## 2. 機能要件 (FR)

| FR | 要件 | 対応 AC |
|---|---|---|
| **FR-01** | **走行台帳を持つ。** 自己診断の全走は、走り終えたときに *領収書* を台帳へ追記する。領収書は少なくとも ①入力の鍵 ②終了コード ③名乗った総括行 ④走った刻 を含む。 | AC-01, AC-02 |
| **FR-02** | **鍵は入力の中身から採る。** 鍵は `tests/` と `graph/` と `overlay/` の対象ファイル群の**内容ハッシュ**、および**鍵に効く環境変数の値**(少なくとも `PARADISE_ABODE`)を含む。ファイル名や git の SHA だけを鍵にしてはならない。 | AC-03, AC-05, AC-06 |
| **FR-03** | **緑しか畳まない。** 領収書の終了コードが 0 でない走行、および打ち切られた走行は、畳みの根拠にしてはならない。 | AC-07 |
| **FR-04** | **Census は台帳を読む。** `graph/census.js check` は、鍵の一致する緑の領収書が台帳に在れば自己診断の子プロセスを起こさず、その領収書の数で第22条の主張を裁く。**在らなければ従来どおり撃つ。** | AC-04, AC-08 |
| **FR-05** | **Abode(repo) は台帳を読む。** `PARADISE_ABODE=repo` の全走は、鍵の一致する緑の領収書が在れば畳む。**`PARADISE_ABODE=global` は決して畳まない。** | AC-09, AC-10 |
| **FR-06** | **成果物ハッシュで図の検査を畳む。** `graph/atlas.js check` は、同じ CI 走行の中で既に検査済みの HTML と**バイト同一**の HTML については、ブラウザ検査を再実行せず前の裁定を写す。 | AC-11, AC-12 |
| **FR-07** | **Chrome を持ち回す。** 畳んだ後に残った検査は、成果物ごとにブラウザを起こし直さず、1 つのブラウザ実体を持ち回して撃つ。**検査の本数は 1 つも減らさない。** | AC-13 |
| **FR-08** | **畳んだことを機械が名乗る。** すべての畳みは、総数と実行数を**別の数として** stdout に名乗る(§4 の綴りに従う)。 | AC-14, AC-15 |
| **FR-09** | **畳めなかった理由を機械可読に残す。** 畳めなかったとき、その理由を閉じた語彙の `bail` として名乗る。 | AC-16, AC-17 |
| **FR-10** | **全走に戻す出口を持つ。** 旗一本で台帳を一切読まない走行に戻せる。 | AC-18, AC-19 |
| **FR-11** | **畳みの機構を見張る門を建てる。** 畳みを司る機構自身が、常駐の門で見張られる。**その門は絞り込みで選び落とせてはならない**(第56条 b)。 | AC-20, AC-21 |

---

## 3. 受入条件 (AC)

各 AC は「**この門が、この入力で、こう鳴る**」の形で書く。
各 AC に **壊して鳴らす**(第21条 c / 第56条)を併記する —— **鳴らせない AC は AC ではない。**

記号: `<L>` = 台帳の住所、`<K>` = 鍵の 16 桁、`N` = 総数、`E` = 実行数。

### 3.1 台帳と鍵 (FR-01 / FR-02 / FR-03)

**AC-01 — 全走は領収書を刻む**
`node tests/paradise.test.js` を引数無しで撃つ。走行後、台帳 `<L>` に 1 行追記されており、
その行は `key` / `exit` / `summary` / `at` の 4 欄を持つ JSON である。`summary` は
`Paradise self-test: 492 passed, 0 failed` と**一字も違わない**。exit 0。
> **壊して鳴らす**: 台帳への追記を消す(`append()` の本体を空にする)と、常駐の門
> 「fold: 全走は領収書を刻む」が **exit 1** で鳴る。

**AC-02 — 絞り込み走行は領収書を刻まない**
`node tests/paradise.test.js --gate 'gate-filter:'` を撃つ。台帳の行数が**撃つ前と同じ**。
(第56条 c: 部分は全体を騙らない。絞り込みの結果を全走の根拠にしてはならない。)
> **壊して鳴らす**: 領収書の記録を `GATE.active` の分岐の外へ移すと、門
> 「fold: 絞り込み走行は領収書を刻まない」が **exit 1** で鳴る。
> 実測済みの現状値: `--gate 'gate-filter:'` は `Paradise gate-filter: 6 of 492 gates matched — 6 green, 0 red` を名乗る。

**AC-03 — 鍵は入力の中身から採る**
`tests/paradise.test.js` の**註釈を一行だけ**書き換えて撃つと、鍵 `<K>` が変わる。
`git commit --allow-empty` で SHA だけを変えて撃つと、鍵 `<K>` は**変わらない**。
> **壊して鳴らす**: 鍵の材料から `tests/paradise.test.js` の中身を抜く(git SHA だけにする)と、
> 門「fold: 鍵は中身から採る — 註釈一行で鍵が動く」が **exit 1** で鳴る。
> (根拠: 第16条 / findings §4.2 Jest #8702 — 鍵の漏れは遅さではなく偽の緑として現れる)

**AC-05 — `PARADISE_ABODE` は鍵に入る**
同一のソースで `PARADISE_ABODE=repo` と `PARADISE_ABODE=global` の鍵を出すと、**2 つは異なる**。
> **壊して鳴らす**: 鍵の材料から `PARADISE_ABODE` を抜くと、門
> 「fold: 住処の宣言は鍵に効く」が **exit 1** で鳴る。
> (根拠: findings §1.3 の実測 —— 6 門 12 行が別の答えを出す。鍵が同じなら global の赤が repo の緑で上書きされる)

**AC-06 — 鍵に効いた入力の一覧が読める**
`node graph/<engine>.js fold-key --explain` は、鍵に効いたファイル数・環境変数名とその値のハッシュを
機械可読(JSON)で吐き、exit 0。**二つの走行の出力を `diff` して鍵が動いた理由を特定できる。**
> **壊して鳴らす**: `--explain` の出力から環境変数の欄を消すと、門
> 「fold: 鍵の材料は数え直せる」が **exit 1** で鳴る。
> (根拠: 第22条「数え直せるものでなければならない」/ findings §2.2 Turborepo `--summarize`)

**AC-07 — 赤い走行と打ち切られた走行は畳みの根拠にならない**
(a) 台帳に `exit != 0` の領収書しか無い鍵で畳みを試みると、**畳まれず全走する**。
(b) 台帳に `exit: null`(打ち切り)の領収書しか無い鍵でも、**畳まれず全走する**。
どちらも `bail=not-green` / `bail=truncated` を名乗る(§4.3)。
> **壊して鳴らす**: 領収書の採用条件から `exit === 0` を外すと、門
> 「fold: 緑しか畳まない — 赤い領収書は再走を呼ぶ」が **exit 1** で鳴る。
> (根拠: findings §4.1 Tuist #8570 —— 鍵が content hash だけで結果を見なかったため、
> timeout で落ちたテストが "passed" と報告された実在の事故)

### 3.2 Census (FR-04)

**AC-04 — Census は畳んでも第22条の主張を裁く**
鍵の一致する緑の領収書が台帳に在る状態で `node graph/census.js check` を撃つと:
- 自己診断の子プロセスは **起こらない**(プロセス数で測る)
- 出力は `Census self-test: Executed 0 out of 1 runs (1 reused, key=<K>)` を名乗る
- **「README テスト数」の主張は裁かれる** —— `measurable=true` であり、README の数が食い違えば **exit 1**
- exit 0

> **壊して鳴らす**(**これが本 AC の核心である**): README のテスト数を 1 だけ書き換えて同じ畳み走行を撃つと、
> **exit 1** で `README テスト数` の finding が出る。
> さらに、`census check --no-tests` と同じ経路(=`c.tests === null` にして主張を `measurable=false` に落とす)
> で実装した場合、門「fold: 畳んだ census は第22条を裁き続ける」が **exit 1** で鳴る。
>
> **なぜこの壊し方か —— M-5 で実証した罠だからである:**
> ```
> $ node -e "const c=require('./graph/census.js'); const a=c.check({runTests:false});
>            console.log(a.ok, a.findings.length)"
> true 0
> $ ... measurable(「README テスト数」) → false
> ```
> **`--no-tests` は exit 0 / findings 0 を出すが、第22条の旗艦の数を裁いていない。**
> 畳みは**「撃たない」であって「裁かない」ではない。** この区別が崩れた瞬間、
> 本改修は第37条違反に化ける。

**AC-08 — 台帳が空なら Census は従来どおり撃つ**
台帳を空にして `node graph/census.js check` を撃つと、自己診断の子プロセスが起こり、
`Census self-test: Executed 1 out of 1 runs (0 reused, bail=no-receipt)` を名乗る。exit 0。
> **壊して鳴らす**: 台帳が空のときに畳んだふりをする(`Executed 0 out of 1` を名乗る)と、
> 門「fold: 領収書の無い畳みは存在しない」が **exit 1** で鳴る。
> (根拠: 第37条 —— 検めなかったものを通過と呼ばない)

### 3.3 Abode / `=global` の境界 (FR-05)

**AC-09 — `=repo` は畳める**
鍵の一致する緑の領収書が在る状態で `PARADISE_ABODE=repo node tests/paradise.test.js` を撃つと、
`Paradise self-test: Executed 0 out of 1 runs (1 reused, key=<K>)` を名乗り exit 0。
門の本体は 1 本も走らない。
> **壊して鳴らす**: `tests/` の任意の 1 ファイルを 1 バイト書き換えて再度撃つと、
> `Executed 1 out of 1 runs (0 reused, bail=key-miss)` に戻り、全走する。

**AC-10 — `=global` は決して畳まない(本要件で最も重い AC)**
台帳に **`PARADISE_ABODE=global` の緑の領収書が在る状態でも**、
`PARADISE_ABODE=global node tests/paradise.test.js` は**必ず全走する**。
名乗りは `Executed 1 out of 1 runs (0 reused, bail=undeclared-state)`。

**AC-10 が区別する二つの事柄(§強い制約の明示)**:

| | 畳むか | 理由 |
|---|---|---|
| **(i) `=global` の走行そのもの**(6 門が別答を出す走行) | **畳まない** | 結果が `~/.claude` という**宣言外の状態**に依る(findings §1.3 / §4.3)。揟2。Bazel の `tags=["external"]`。 |
| **(ii) 486 門を global でもう一度撃つこと**(repo と一字も変わらない 486 門) | **畳まない — 本改修では** | 486 門の結果が repo と同じであることは**実測されている**(findings §1.3)が、それは**測定であって保証ではない**。6 門と 486 門を分ける機構は、「どの門が宣言外の状態に触るか」を**門の側が名乗る**ことを要する。それが無いまま 486 門を畳めば、**新しい門が宣言外の状態に触った日に黙る**(第21条: 名を語る全ての口を門が見張る)。揟7「疑わしきは畳まない」。 |

> **壊して鳴らす**: `=global` を畳める経路を 1 本でも通すと、門
> 「fold: 宣言外の状態に依る走行は畳まれない (揟2 / 第37条)」が **exit 1** で鳴る。
> この門は **`PARADISE_ABODE=global` を子プロセスで実際に撃って**、
> 出力に `reused` の語が現れないことを確かめる —— **設定を読むのではなく走行を読む**(第16条)。
>
> ⚠️ 併せて記す: **この機の `=global` は赤(exit=1)である**(findings §1.3)。
> AC-10 の門は「緑であること」を求めてはならない —— 求めるのは
> **「畳まれないこと」**だけである。緑を求めれば、CI では緑・この機では赤という
> 環境差が門を偽の赤にする(第62条 b: 偽の赤は真の赤より有害である)。

### 3.4 Atlas の畳み (FR-06 / FR-07)

**AC-11 — 同じ HTML は二度検めない**
`node graph/atlas.js check --scale quick` を 6 道すべてについて 1 回の走行で撃つと、
**72 回でなく 32 回**のブラウザ検査が走り、名乗りは
`Atlas inspect: Executed 32 out of 72 inspections (40 reused)`。exit 0。
畳まれた 40 件はそれぞれ `(reused: html=<sha16>)` を伴う。

内訳の根拠(M-1 / findings §1.6):
- `conclave` / `dag` は道ごとに HTML が変わる → 6 道 × 2 主題 × 2 起動 = **24 検査は畳めない**
- `hierarchy` / `dispatch` / `run` / `wiring` は全道で HTML バイト同一 → 4 主題 × **1 道** × 2 起動 = **8 検査のみ**
- 32 = 24 + 8 / 余剰 40 = 4 主題 × 5 道 × 2 起動

> **壊して鳴らす**: `hierarchy` の HTML を 1 バイトだけ道ごとに変える細工を入れると、
> 実行数が `Executed 32` から増え、**畳んだ件数がその分減る**。
> 門「fold: 畳みの鍵は成果物のバイト列である」が、
> 細工した成果物が畳まれた場合に **exit 1** で鳴る。

**AC-12 — 畳んだ裁定は写した元を名指す**
畳まれた検査の裁定行は、**どの成果物の裁定を写したか**を `<sha16>` で名乗る。
`grep -c 'reused: html=' <出力>` が畳んだ件数と**一致する**。
> **壊して鳴らす**: 写し元を名乗らずに `ok` だけを書くと、門
> 「fold: 写した裁定は元を名指す (第21条 b)」が **exit 1** で鳴る。
> (根拠: 第21条 b「報告せよ **誰が名付けたか** を —— 辿れない発見は直せない発見である」)

**AC-13 — Chrome の持ち回しは検査を 1 本も減らさない**
`browserFactory` を持ち回す経路で撃った走行と、成果物ごとに起こす経路で撃った走行で、
**裁定の出た図の本数が同一**であり、**各図の `ok` が一致する**。
起動回数のみが減る(実測: 2 図で 2 回 → 1 回 / 5741ms → 5046ms / 12% 減、`raw/u3-probe.mjs`)。
> **壊して鳴らす**: 持ち回し経路で 2 図目の検査を飛ばすと、裁定の本数が 2→1 になり、
> 門「fold: 持ち回しは検査を減らさない — 裁定の本数が一致する」が **exit 1** で鳴る。
> (根拠: 揟8 / 第37条 —— この畳みは撃つ回数を減らさないので、原理的に偽の緑が出ない)

### 3.5 名乗りと出口 (FR-08 / FR-09 / FR-10)

**AC-14 — 総数と実行数は別の数として名乗る**
すべての畳み走行の stdout に、**`Executed <E> out of <N>`** の綴りが現れる。
`E` と `N` は別の数であり、`E + reused = N` が成り立つ。
> **壊して鳴らす**: `E` と `N` を同じ変数から出すと、門
> 「fold: 総数と実行数は別の数である (第22条 / 揟4)」が **exit 1** で鳴る。
> 具体的には、畳んだ走行で `Executed 1 out of 1` と名乗ったら赤。

**AC-15 — 数が閉じる**
畳み走行は終わる前に **`E + reused == N`** を自分自身に対して検め、
破れていれば **exit 1** で倒れる。この錠は**畳みを司る関数の外側**に置かれる。
> **壊して鳴らす**: `reused` の加算を 1 箇所削ると、恒等式が破れて走行自身が **exit 1** で倒れる。
> **門ではなく走行が倒れる**ことが要件である —— 門の内側に置いた錠は、その門が
> 選び落とされた瞬間に一緒に黙る(第56条 b / findings §4.4)。

**AC-16 — bail は閉じた語彙で名乗る**
畳めなかったとき、`bail=<code>` が出力に現れ、`<code>` は以下の**閉じた集合**に属する:

| code | 意味 |
|---|---|
| `no-receipt` | 台帳に該当の鍵が無い |
| `key-miss` | 鍵が一致しない(入力が変わった) |
| `not-green` | 領収書の exit が 0 でない |
| `truncated` | 領収書が打ち切られた走行のもの |
| `undeclared-state` | 宣言外の状態に依る走行(`=global`)。**構造的に畳まない** |
| `disabled` | `--no-fold` で明示的に切られた |
| `ledger-unreadable` | 台帳が読めない(不能。**不在と別の値**。第62条 b ①) |

> **壊して鳴らす**: 語彙外の `bail=whatever` を出すと、門
> 「fold: bail は閉じた語彙で名乗る (揟5)」が **exit 1** で鳴る。
> **さらに**: 台帳のファイルを**ディレクトリに置き換えて**撃つと、
> `bail=ledger-unreadable` が出て **exit 1** で倒れる(`bail=no-receipt` で静かに全走してはならない)。
> 根拠は第62条 b ①の実測 ——「ディレクトリを一つ作るだけで 484 門が全滅した」
> **読めないは skip ではなく赤である。**

**AC-17 — bail は機械可読に取れる**
`node graph/<engine>.js fold-status --json` は、直近の走行について
`{ total, executed, reused, bails: [{code, subject}] }` を吐き、exit 0。
> **壊して鳴らす**: `bails` を人間向けの文字列だけにする(構造を持たせない)と、門
> 「fold: bail は機械可読である」が **exit 1** で鳴る。
> (根拠: findings §2.5 Chromatic の **TurboSnap Bail Reason 列** / §3.2 Percy の `IntelliStory:` 接頭辞)

**AC-18 — `--no-fold` で全走に戻る**
`node tests/paradise.test.js --no-fold` は、**鍵の一致する緑の領収書が在っても**全走し、
`Executed 1 out of 1 runs (0 reused, bail=disabled)` を名乗る。exit 0。
同じ旗が `graph/census.js` / `graph/atlas.js` でも同じ意味を持つ。
環境変数 `PARADISE_NO_FOLD=1` も同義。
> **壊して鳴らす**: `--no-fold` を付けた走行が `reused` を 1 件でも出すと、門
> 「fold: --no-fold は畳みを完全に切る (揟6)」が **exit 1** で鳴る。
> (根拠: Bazel `--nocache_test_results` / Turborepo `--force`。findings §2.1 / §2.2)
> **旗名の衝突は確認済み**: 既存の旗は `--gate` / `--gate-list` / `--gate-not` / `--scale` /
> `--json` / `--quality` / `--no-tests` 等であり、`--no-fold` は未使用。

**AC-19 — 未知の旗は黙って通さない**
`node tests/paradise.test.js --no-fould`(綴り違い)は **exit != 0** で
`unknown flag` を名乗る。**畳みが有効なまま静かに走ってはならない。**
> **壊して鳴らす**: 未知の旗を無視する実装にすると、門
> 「fold: 綴り違いの旗は黙殺されない」が **exit 1** で鳴る。
> (根拠: 現状の `die('Paradise gate-filter: unknown flag ...')` と同じ強さを要求する)

### 3.6 機構を見張る門 (FR-11)

**AC-20 — 畳みの門番は絞り込みの外に立つ**
`node tests/paradise.test.js --gate '^fold:'` で畳みの門だけを撃てるが、
**`--gate-not '^fold:'` で畳みの門番を消しても、畳みの恒等式(AC-15)の錠は依然として効く。**
恒等式を壊した走行は、`--gate-not '^fold:'` を付けていても **exit 1** で倒れる。
> **壊して鳴らす**: 恒等式の錠を `test()` の内側へ移すと、
> `--gate-not '^fold:'` で恒等式を壊した走行が **exit 0** になる —— それが赤である。
> 検出は「自分のソースの写しに故障注入を施して子プロセスで撃つ」形(第56条の処方と同形)。
> **根拠は楽園自身の既往症**(findings §4.4 / 第56条):
> `if (GATE.list)` を `if (GATE.active)` に変える**一行**で
> `5 of 454 gates matched — 0 green, 0 red` を **exit 0** で名乗り、
> 見張るために立てた常駐の門 5 本は**自分自身も絞り込みの対象だったので一本も鳴かなかった。**

**AC-21 — 畳みが黙って全部を畳む変異を捕まえる**
畳みの判定を常に真に倒す**一行の故障注入**(鍵の比較を `true` に潰す)を施した写しを
子プロセスで撃つと、門「fold: 何もかも畳む機構は測定ではない」が **exit 1** で鳴る。
判定基準は **`Executed 0 out of N` を名乗りながら台帳に対応する領収書が無いこと**。
> **壊して鳴らす**: この門自身を消すと、`--gate-list` の本数が 1 減り、NFR-01 の門が **exit 1** で鳴る。
> (根拠: 第56条 b / 第62条 c —— 振る舞いの門が届かない層はソースを静的に読む門で補え)

---

## 4. 名乗りの規約(出力の文字列まで決める)

揟4「畳んだ数は実行数として名乗り、総数と別の数にする」/ 揟5「bail も機械可読に残す」。
**綴りは契約である。** 現状の `Paradise self-test:` / `Paradise gate list:` / `Paradise gate-filter:` が
既に三者(`census.js:55` / `tribunal.yml:306` / 人間)に消費されている契約であり(`tests/paradise.test.js:10843` の註釈)、
**新しい名乗りも同じ厳しさで綴りを固定する。**

### 4.1 接頭辞

| 接頭辞 | 誰が出すか |
|---|---|
| `Paradise self-test:` | 自己診断の**全走**の総括(**既存。変えない**) |
| `Paradise gate list:` / `Paradise gate-filter:` | 絞り込み走行(**既存。変えない**) |
| `Paradise fold:` | 自己診断の畳み |
| `Census self-test:` | Census が自己診断を畳んだ/撃った |
| `Atlas inspect:` | Atlas の検査の畳み |

> ⚠️ **`Paradise fold:` は `passed` / `failed` の語を用いてはならない。**
> 現状の註釈(`tests/paradise.test.js:10843`)が明記するとおり、
> `census.js:57` の保険経路(`matchAll`)がその語を拾う。
> **綴りの衝突は偽の数として現れる。**

### 4.2 畳みの名乗り(必須の綴り)

畳んだとき:
```
Paradise fold: Executed 0 out of 1 runs (1 reused, key=<sha16>)
```
畳まなかったとき:
```
Paradise fold: Executed 1 out of 1 runs (0 reused, bail=<code>)
```
Atlas:
```
Atlas inspect: Executed 32 out of 72 inspections (40 reused)
  ✓ hierarchy  [architecture] (reused: html=d185c1ff4425b032)
```
Census:
```
Census self-test: Executed 0 out of 1 runs (1 reused, key=<sha16>)
```

**不変式(AC-14 / AC-15 が裁く)**: `Executed <E> out of <N>` において
**`E` と `N` は別の数であり、`E + reused == N`。**
形は Bazel の `Executed 0 out of 1 tests` と同じ(findings §2.1)。

### 4.3 bail の形

```
bail=<code>
```
`<code>` は AC-16 の表の 7 語に限る。機械可読な形は `fold-status --json`:
```json
{ "total": 72, "executed": 32, "reused": 40,
  "bails": [ { "code": "key-miss", "subject": "conclave@quick" } ] }
```

---

## 5. 全走に戻す出口

| 旗 | 振る舞い |
|---|---|
| `--no-fold` | 台帳を**一切読まない**。すべて撃つ。`bail=disabled` を名乗る。exit は全走と同じ。 |
| `PARADISE_NO_FOLD=1` | `--no-fold` と同義(CI の段で env として置けるため) |

**対象**: `tests/paradise.test.js` / `graph/census.js` / `graph/atlas.js` の三者で**同じ綴り・同じ意味**。
裁くのは AC-18。綴り違いは AC-19 が捕まえる。
出典: Bazel `--nocache_test_results`(findings §2.1)/ Turborepo `--force`(§2.2)。

---

## 6. 非機能要件 (NFR)

**NFR-01 — この改修は門を一本も減らさない(最重要)**
- **AC-22**: 改修の前後で `node tests/paradise.test.js --gate-list | tail -1` が名乗る本数が
  **改修前の 492 を下回らない**。畳みの門番(AC-20 / AC-21 等)を足した分だけ**増える**。
  ```
  $ node tests/paradise.test.js --gate-list | tail -1
  Paradise gate list: 492 gates     ← 改修前の実測値(本相で確認済み)
  ```
  > **壊して鳴らす**: 門を 1 本消して `--gate-list` を撃つと 491 になり、
  > 門「fold: 改修は門を減らしていない — 本数が基準を下回らない」が **exit 1** で鳴る。
  > **基準値 492 は機械可読な形で台帳に刻む**(散文に書いた数は腐る —— 第22条)。

**NFR-02 — 畳んだ走行も 492 門すべてを 1 回は撃つ**
- **AC-23**: 1 回の CI で、**少なくとも 1 本の素の全走**が `Paradise self-test: 492 passed, 0 failed` を名乗る。
  畳んだ走行しか存在しない CI は赤。
  ```
  $ grep -c 'Paradise self-test: [0-9]* passed' <CI log>   # >= 1 でなければならない
  ```
  > **壊して鳴らす**: Self-test 段まで畳むと(3 本すべてを畳む)、
  > 門「fold: 全走が一本も走らない CI は測定ではない (第56条 d)」が **exit 1** で鳴る。
  > (根拠: 第56条 d「緑の根拠になるのは引数無しの全走だけである」)

**NFR-03 — 畳みの機構は現物を汚さない**
- **AC-24**: 台帳は**走行のたびに指紋を前後で照合**され、畳みの機構以外が書き換えていれば
  **どの門が汚したかを名指して**倒れる。現物が無い機では `skip` を名乗り、**作り物の台帳で門の歯を撃つ**。
  > **壊して鳴らす**: 門の中から台帳へ 1 行書くと、番兵が**その門の名を挙げて** exit 1 で鳴る。
  > (根拠: 第62条 b —— 「不可侵を主張ではなく測定にせよ」「汚した門を名で呼べ」
  > 「現物が無い機では skip を名乗り、そこでは作り物の現物で門の歯を撃て」)

**NFR-04 — 台帳の並行書き込みが壊れない**
- **AC-25**: 台帳への追記を**並列度 2 / 4 / 8** で同時に撃ち、各 30 試行。
  **全試行で行数が期待どおりであり、壊れた JSON 行が 0 件**。
  > **壊して鳴らす**: 追記を read-modify-write に変えると(TOCTOU)、並列度 2 で行が落ち、
  > 門「fold: 台帳は並行追記で壊れない」が **exit 1** で鳴る。
  > (根拠: **第62条の実測** ——「`record` の TOCTOU は並列度 2/4/8 のすべてで 100% 破れたが、
  > 114 本の門は一本も鳴らなかった —— 誰も二つのプロセスを同時に起こさなかったからである」。
  > **単一プロセスで撃つ門は競合を見ない。この門は複数プロセスで撃たねばならない。**)

**NFR-05 — 改善は数値で証明する**
- **AC-26**: 改修の前後で CI 1 回の総秒数を同じ方法(`gh run view <id> --json jobs` から
  step ごとの `startedAt`/`completedAt` の差)で測り、台帳に記録する。
  **前後の数が比較できない改修は、改善を主張してはならない。**
  基準値: **2,070s**(run `35384344207` / push / findings §1.1)。
  目標: **P-1+P-2 で 1,047.5s 以下**(削減見込み 1,022.5s)。
  > **壊して鳴らす**: 前後の記録が片方しか無い状態で「改善した」と名乗る文書を置くと、
  > 門「fold: 記録なき前後は比較できない」が **exit 1** で鳴る。
  > (根拠: 第38条「改善は数値で証明する」「**記録なき前後は比較できない**」)
  > ⚠️ 測定の但し書き: 基準 2,070s は **push の run** である(M-6)。
  > **前後は必ず同じ event 種別で比べること。** PR の run と比べれば 5 本目の全走の分だけ差が出て、
  > 改善を過大に見積もる。

**NFR-06 — 門の形が隠す盲点を言う**
- **AC-27**: 畳みの門を建てるとき、その門の**作法が何を見えなくするか**を門の側に書き、
  それを静的に読む門が**空欄を赤にする**。
  最低限、次の 3 つについて言う: ①単一プロセスか(→ 並行の盲点。NFR-04 が補う)
  ②`require.cache` を捨てるか(→ モジュール大域の盲点)③環境変数で住所を振り替えるか(→ 住所の盲点)。
  > **壊して鳴らす**: 盲点の記述を空にして門を足すと、
  > 門「fold: 門は己の盲点を名乗る (第62条 a)」が **exit 1** で鳴る。
  > (根拠: 第62条 a「門を建てるとき、その門の形が何を見えなくするかを言え。
  > 言えない盲点は、存在しない盲点ではなく、**まだ誰も落ちていない穴**である」)

---

## 7. やらないこと (out of scope)

1. **門を減らす・統合する・消す。** 完全重複する門は 0 件(discover 相)。本改修の射程外。
2. **`PARADISE_ABODE=global` の走行を畳む。** 揟2 / AC-10。**構造的に禁止**であり、将来の課題でもない。
3. **486 門を global で畳む。** 実測では repo と同じだが、「どの門が宣言外の状態に触るか」を
   門の側が名乗る機構が要る。**本改修では作らない**(揟7)。§8 に申し送り。
4. **CI に `--gate` 絞り込みを持ち込む。** 第56条 d が明文で禁じる。
5. **PR の 5 本目(執行官 job / `tribunal.yml:439`)を畳む。** 別 job / 別 runner。§8 に申し送り。
6. **リモートキャッシュ / CI をまたぐ台帳。** 本改修の台帳は **1 回の CI 走行の中**でのみ有効。
   走行をまたいで畳むには findings §2.4 の security 警告
   (「Cache contents are not signed or verified…leading to malicious code execution」)への答えが要る。
7. **`archify`(借り物)の書き換え。** 第20条。注入口 `browserFactory` は**既に在る**ことが
   実測済み(findings §5.2 U-3)なので、外から注入するだけでよい。
8. **門ごとの並列実行。** 別種の改修であり、本改修の畳みとは鍵も危険も違う。
9. **図の検査そのものを軽くする**(viewport を減らす等)。**検査を減らす提案であり、
   本改修は「同じ検査を二度しない」までしかやらない。**

---

## 8. design 相への申し送り

1. **U-1 は依然として未測定**: CI runner 上で「素 ≡ `=repo`」が成り立つか。
   ローカルでは md5 一致を実測したが(findings §1.2)、runner では測っていない。
   **AC-09 を CI で初めて撃つときに、畳む前に 1 度だけ両方を撃って突き合わせる**段を
   置くかどうかは design 相の判断。**第37条により、測っていないものを緑と呼んではならない。**
2. **Abode(両居)841s の内訳 420s/421s は按分であり直接測定ではない。**
   design 相は段を 2 つに割って直接測ることを検討せよ(そうすれば P-1 の見積りの精度が上がる)。
3. **PR の 5 本目**(§7-5)。artifact 越しに台帳を渡す設計は新しい信頼境界を作る。
4. **`fold-key` / `fold-status` をどの engine に置くか**は design 相の分。
   本要件は**綴りと振る舞いだけ**を決めており、住所を決めていない。
5. **第44条(b) の警戒**: 本改修で建てる門は、CI から**実際に撃たれる**ことを同じ変更で確かめよ。
   「建てられた門が誰にも呼ばれていなかった」が楽園の既往症である。

---

## 付録: 本相で撃った命令と生出力の住所

| 命令 | 生出力 |
|---|---|
| `node tests/paradise.test.js --gate-list \| tail -1` | `Paradise gate list: 492 gates`(exit 0) |
| `node tests/paradise.test.js --gate '^zzz_no_such_gate'` | `Paradise gate list: 0 of 492 gates matched — nothing was measured`(**exit 2**) |
| `node tests/paradise.test.js --gate 'gate-filter:'` | `Paradise gate-filter: 6 of 492 gates matched — 6 green, 0 red` |
| `node reform/gate-fold/raw/u2-html-hash.js` | `raw/u2-html-hash.txt` — U-2 の独立再現(IR16 / HTML16) |
| `node reform/gate-fold/raw/u5-atlas-split.js` | `raw/u5-atlas-split.txt` — 図の作成 1,983ms / ブラウザ検査 45.8s |
| `node reform/gate-fold/raw/u6-census-split.js` | `raw/u6-census-split.txt` — `census(runTests:false)` = 3ms |
| `node reform/gate-fold/raw/u7-savings.js` | `raw/u7-savings.txt` — 削減見込みの算術 |
| `node reform/gate-fold/raw/u8-notests-trap.js` | `raw/u8-notests-trap.txt` — `--no-tests` の罠の実証 |
| `node graph/census.js check --no-tests` | `✓ every number the paradise claims about itself is true`(0.08s / exit 0) |
| `gh run view 35384344207 --json event,headBranch,jobs` | `event=push` / 執行官 job = `skipped` |
| `node graph/codex.js article 16/21/22/34/37/38/44/56/62` | 掟の全文(§3 の根拠) |
