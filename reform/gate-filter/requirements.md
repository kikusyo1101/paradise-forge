# requirements — 門の絞り込み(フィルタ)の口

**相**: specify(要件定義)／改革 `gate-filter`
**日付**: 2026-09-09
**入力**: `reform/gate-filter/discover.md`(471行・批准済み)
**約束**: 本書は要件のみを定める。**engine もテストも一行も書き換えていない。**
本書に引く行番号は、すべて specify 相で自分の目で開いて確かめたものである。
数値は discover の実測をそのまま引く(再測はしていない。捏造もしていない)。

---

## 1. 問題の定義

楽園の自己診断 `tests/paradise.test.js` は 449 本の門を持ち、素の全走に **358.8 秒(5分59秒)** を要する。ところが discover の実測が示すのは「449 本が重い」のではなく「**2 本が重い**」という事実である —— `Atlas (自画像)` 節の 2 本(実ブラウザで第一画面と動きを測る門)だけで 341.5 秒、全体の **93.7%** を占め、Atlas 節 14 本を除いた**残り 435 本は合計 21.9 秒**で終わる(discover §2.1・§2.2)。つまり教主が engine を一行変えるたび、22 秒で答が出るはずの検証に 6 分を払っている。しかも `test()` は 20 行目の自作 8 行関数であってフレームワークは無く(`tests/paradise.test.js:19-23`)、走らせる門を選ぶ口が**どこにも無い**。この改革は「一部だけ走らせる口」を設ける。だが同時に、その口は三つの禁忌に触れる —— 局所走行が全走を騙ること(第22条)、打ち間違えた絞り込みが緑を返すこと(第16条)、そして `census.js` が汚れて README の数が壊れること(第22条)。**速さは、この三つを機械が塞いだ後にしか許されない。**

---

## 2. FR(機能要件)

### FR-01 — 絞り込みの単位は「テスト名に対する JavaScript 正規表現」とする

`--gate <regexp>` は **`test(name, fn)` の `name` 文字列**に対して、`new RegExp(pattern)` で
コンパイルした正規表現を **`.test()`(部分一致・アンカー無し)**で照合する。
節名は照合対象に**含めない**。

**なぜそうするか(事実による根拠)**:

- **節を単位に採れない理由(a)**: 節見出しは `console.log('…:')` であって構造ではない。
  節と test の間にデータの繋がりは無く、「実行順に前後する」だけである
  (discover §5-2 / `tests/paradise.test.js:25-26` の `console.log('Graph engine:')` が典型)。
  節を単位にするには**節の宣言を機械が読める形に作り替える**必要があり、それは
  「絞り込みの口を足す」を超えて自己診断の構造改変になる。
- **節を単位に採れない理由(b)**: 節は主題ではない。`Daily guard (quota + catch-up):` 節は
  1081–2573 行の 1500 行に **110 本**が住み、その中に identity / visual-verify / upstream /
  deploy / vendor / branch-guard という**明らかに別主題の門が混在する**
  (discover §1.2 註、1297・1402・1618・1793 行の require が証拠)。
  節を単位にすると、この 110 本が「一つの門」になり、絞り込みの粒度として粗すぎる。
- **文字列部分一致では足りない理由**: 最初の顧客は「Atlas の重い 2 本を外して残りを走らせる」
  であり(discover §2.3)、これは**複数条件の指定**を要する。正規表現なら
  `--gate 'atlas: (全ての道|門は己)'` の一行で足りる。
- **正規表現が業界の総意である事実**: node:test `--test-name-pattern`、Jest `-t`、
  Mocha `--grep`、Vitest `-t` の **4 者すべてが「名前 × 正規表現・部分一致」**を採る
  (discover §3.5 の表)。楽園がここで独自の記法を発明する理由は無い。
  楽園が 4 者と袂を分かつのは**意味論ではなく「0 件マッチの扱い」だけ**である(FR-04)。
- **フルネーム連結を採らない理由**: 楽園の `test()` は入れ子を持たない平坦な 449 本であり、
  名前の重複は **0 件**(449 個すべて一意 / discover §1.1)。Jest / Mocha が
  「describe を連ねたフルネーム」を必要とするのは階層があるからで、楽園には階層が無い。
  **名前だけで一意に狙える。**

**縛る条**: 第16条(名ではなく実質で裁く)。ゆえに FR-06 の `--gate-list` は
静的解析(名前の grep)ではなく**実行時に集めた名**を出す義務を負う(制約10)。

### FR-02 — 口の形は **CLI 引数**とする。環境変数は用いない

**結論: CLI 引数(`--gate` / `--gate-not` / `--gate-list`)。環境変数による絞り込みの口を、
この改革は一つも作らない。**

**根拠(discover §4.3(A) を自分の目で確かめた)**:

- `graph/census.js:90` は自己診断をこう呼ぶ:
  `execFileSync(process.execPath, [path.join(ROOT,'tests','paradise.test.js')], { encoding:'utf8', cwd: ROOT, timeout: TIMEOUT_MS })`。
  **引数は渡さない。しかし `env` を指定していないので環境変数は丸ごと継承する。**
- ゆえに `PARADISE_GATE` のような環境変数を実装すれば、census を走らせるシェルに
  その変数が残っているだけで census は**絞り込まれた走行の数**を「楽園のテスト総数」として読み、
  `README.md:138` の `# 449/449 pass` と突き合わせて偽の赤を出す。
  もっと悪い場合、`fix` が **README の 449 を絞り込み後の数に書き換える**。
  これは第22条が禁じる「測定条件の違う数を楽園が自分について語る」ことに他ならない。
- CLI 引数なら `census.js:90` が引数を渡さない以上、**構造的に届かない**。
- 補強事実: `tests/paradise.test.js` に `process.argv` の出現は **0 件**(specify 相で grep 確認)。
  引数空間は無人であり、衝突は起きない。

**機械が「census を汚さない」ことをどう保証するか** —— 三重に縛る(AC-13/14/15):

1. **構造の門**: 絞り込みを司るコード塊が `process.env` を一切読まないことを、
   自己診断自身が自分のソースを読んで裁く(第16条: 散文ではなく実物を読む)。
2. **呼び口の門**: `graph/census.js` のソースを読み、自己診断を起こす `execFileSync` の
   引数配列がスクリプトパス **1 要素のみ**であることを裁く。将来 census 側に
   引数が足されたらここが赤くなる。
3. **実経路の門**: 環境を毒(`PARADISE_GATE=zzz` 等)で汚した状態で
   `census.summaryOf` の経路が 451 を返すことを確かめる(AC-15。全走を伴うため
   自己診断本体ではなく prove 相の手順として置く —— 6 分の門を自己診断に足せば
   本改革は自分の目的を裏切る)。

**縛る条**: 第22条。

### FR-03 — 除外の口 `--gate-not` を設ける。**除外が包含に勝つ**

`--gate-not <regexp>` を設ける。両者とも**複数回指定可**。

判定順序(この順で確定させる):

1. `--gate` が一つも無ければ、包含は「全件」。
   一つ以上あれば、**いずれかにマッチした門だけ**が候補(OR)。
2. 候補のうち `--gate-not` の**いずれかにマッチした門を落とす**(OR)。
3. **除外が包含に勝つ。**同じ門が両方にマッチしたら、その門は走らない。

**除外の口が要る理由(事実)**: 最初の顧客は「Atlas の重い 2 本を外して**残り 447 本**を走らせる」である。
discover §2.1 が名指した 2 本 ——
`atlas: 全ての道が図になる — 描画器が実際に受理する (第47条)`(243.80 秒)と
`atlas: 門は己の残骸で落ちない — 同じ作業場で二度走る (第21条)`(97.66 秒)。
包含だけでこれを表そうとすると **447 本を書き並べる正規表現**が要る。除外の口なら一行で済む。

**除外が勝つ理由**: 「危険なものを外す」は安全側の操作であり、包含の書き間違いで
危険が復活してはならない。加えて **決定性**(第38条: 秤が揺れるなら秤ではない)——
順序依存の解決規則は同じ入力に同じ答を返さないことがある。

**縛る条**: 第38条(決定性)。加えて FR-05 の名乗りにより、除外した走行が全走を騙らない(第22条)。

### FR-04 — マッチ 0 件は **赤**とする。業界既定に従わない

**結論: マッチ 0 件のとき、exit code は `2`。標準出力に**
`Paradise gate list: 0 of 451 gates matched — nothing was measured` **を吐き、
総括行(FR-05)は一切吐かない。**

**根拠 —— 条を引く**:

- **第16条(全文を `node graph/codex.js article 16` で読んだ)**:
  > "the converse binds equally: substance-based recognition must never become a
  > rubber stamp, so **a file that asserts nothing is no evidence however it is named.**"

  系として `CONSTITUTION.md` 第55条(h) がこう述べる(discover §4.1 経由):
  > **読めなかった行を 0 件と数えるのは、測れなかったものをゼロで埋める行為である(第16条)**

  一本も走らなかった走行は「何も assert していない走行」であり、**証拠ではない**。
  それに exit 0 を与えることは、第16条が名指して禁じるゴム印そのものである。
- **業界既定は 4/4 が緑**(discover §3.5 の実測表)。node:test に至っては
  マッチ 0 件で `pass 1` と名乗る。**打ち間違えた pattern が緑を返す。**
  楽園はこれを踏襲しない。
- **先例は在る**: Mocha `--fail-zero`(v9.1.0 以降)だけが
  "Fail test run if no tests are encountered with exit-code: 1" を選べる(discover §3.3)。
  楽園はこれを**既定**にする。緩める口(`--pass-with-no-gates` 相当)は**作らない**(非目標 NG-04)。
- **exit 1 ではなく 2 を選ぶ理由**: exit 1 は既に「門が落ちた(赤)」の意味を持つ
  (`tests/paradise.test.js:8218` `process.exit(fail === 0 ? 0 : 1)`)。
  「一本も測っていない」は「測って落ちた」とは別の事態であり、
  同じ数で表すのは**測れなかったものを測った値で埋める**行為である(第16条)。
  シェル・CI にとってはどちらも非零 = 失敗であり、安全側は保たれる。

**exit code の全体像(この改革が定める規約)**:

| 状況 | exit | 名乗り |
|---|---:|---|
| 引数なしの全走・全緑 | 0 | `Paradise self-test: 451 passed, 0 failed`(**書式**は現状のまま・不変。数は census が測り直す) |
| 引数なしの全走・赤あり | 1 | 同上(`M failed` が非零) |
| 絞り込み走行・全緑 | 0 | FR-05 の局所名乗り |
| 絞り込み走行・赤あり | 1 | FR-05 の局所名乗り |
| **マッチ 0 件** | **2** | `nothing was measured`(総括行を吐かない) |
| 不正な正規表現 | 2 | FR-07 |

**縛る条**: 第16条。

### FR-05 — 総括行の書式。局所走行は `Paradise self-test:` を**名乗ってはならない**

**結論: 名乗ってよくない。局所走行はこの一行を吐く**:

```
Paradise gate-filter: 449 of 451 gates matched — 449 green, 0 red
```

書式(BNF 相当):
`Paradise gate-filter: <matched> of <total> gates matched — <green> green, <red> red`

**「名乗ってよくない」理由 —— 総括行は三者に消費される契約である**:

specify 相で三者すべてを自分の目で確かめた:

1. **`graph/census.js:55`**:
   `String(out).match(/Paradise self-test:\s*([0-9]+) passed, ([0-9]+) failed/)`
   → README の数になる(`graph/census.js:268-270` / `README.md:138` の `# 451/451 pass`(census が書き換えた後))。
2. **`.github/workflows/tribunal.yml:306-308`**:
   ```
   TESTS=$(node tests/paradise.test.js 2>&1 | tail -1)
   PASSED=$(echo "$TESTS" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo 0)
   FAILED=$(echo "$TESTS" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || echo 0)
   ```
   → `verdict-report.json` の `tests.passed/failed/total` → `verdict.js` の SHIP / REWORK 判定。
3. **人間**(教主・神)が「楽園は健全だ」と読む。

**局所走行が同じ書式を吐けば、三者すべてが騙される。**

**新書式が二つの消費者に対して安全であることの証明(文字列で照合)**:

| 消費者 | 照合するもの | 新書式に対する結果 |
|---|---|---|
| `census.js:55`(名乗り) | `/Paradise self-test:\s*(\d+) passed, (\d+) failed/` | **不一致**。`Paradise self-test:` という部分文字列が存在しない |
| `census.js:57`(保険の落ち先) | `/(\d+) passed, (\d+) failed/g` | **不一致**。`passed` / `failed` の語を一切含まない(`green` / `red` を用いる) |
| `tribunal.yml:307` | `grep -oE '[0-9]+ passed'` | **不一致** → `|| echo 0` により `PASSED=0` |
| `tribunal.yml:308` | `grep -oE '[0-9]+ failed'` | **不一致** → `FAILED=0` |
| `tribunal.yml:306` | `tail -1` | 最終行を読むが、上記により数を拾えず 0/0 になる |

**この設計は「騙されない」より一段強い —— 万一 CI が絞り込み付きで呼ばれても、
`tests.total = 0` になって SHIP を主張できない(fail-safe)。**
`passed` / `failed` という語を新書式から**完全に追放する**ことが、
census の保険経路(`census.js:57` の `matchAll` 落ち先)まで塞ぐ鍵である。
`green` / `red` を選んだのはこのためであって、語感の問題ではない。

**分母 `of 451` を必ず刻む理由**: 第38条は「N 本を M 秒で測った」と語れと要求する
(discover §4.3(D))。`449 of 451` は**母数を明示する**。
`449 green` だけでは、読んだ人間が 451 と取り違える余地がある。

**縛る条**: 第22条(楽園が自分について語る数)、第38条(同じ母数で比べよ)。

### FR-06 — 一覧を見る口 `--gate-list` を設ける。名は**実行時に集める**

`--gate-list` は、**すべての門を「登録するが実行しない」**走行を行い、
集まった名を 1 行 1 件で出力し、最後にこう名乗って **exit 0** で終わる:

```
Paradise gate list: 451 gates
```

`--gate` / `--gate-not` と併用したときは**絞り込み後の名だけ**を並べ、
`Paradise gate list: 449 of 451 gates matched` と名乗る(絞り込みの下見に使える)。

**静的解析を禁じる理由(discover 制約10 の実測)**: ソース上の行頭 `test(` は **442** だが、
実行時に走る実数は **449**。差の 7 は `tests/paradise.test.js:2694` の
`for (const name of ['dashboard-count', …8個…]) { test(...) }` である
(specify 相で 2690–2703 行を開いて確認した)。静的には `test(` 1 個、実行時には 8 個。
**442 − 1 + 8 = 449。**
ゆえに grep / AST で名前一覧を作る実装は**この 1 箇所だけ 7 本嘘をつく**。
一覧は必ず実行時に `test()` が受け取った `name` から作らねばならない —— これは第16条の
「名で裁くな、実物を読め」の直接の適用である。

**これが安く済む事実**: discover §1.4 が測ったとおり、トップレベル(節の外・`test()` の外)で
子プロセスを起こす箇所は無く、ブラウザも常駐サーバも起きない。準備コストは事実上ゼロ
(数百ミリ秒 —— 砂場の `mkdtempSync` が `tests/paradise.test.js:85, 126`、
engine の同期 require が 20 数本)。ゆえに「fn を呼ばずに最後まで通す」走行は
ほぼ即座に終わる。**重いのは `test()` の中身であって、その外ではない。**

**縛る条**: 第16条。

### FR-07 — 不正な正規表現は**即座に赤**。走行を始めない

`new RegExp(pattern)` が `SyntaxError` を投げたら、門を一本も走らせずに
標準エラーへ `Paradise gate-filter: invalid pattern <pattern>: <e.message>` を吐き、
**exit 2** で終わる。総括行は吐かない。

**理由**: 壊れたパターンを「0 件マッチ」に落として緑を返すのは、
FR-04 と同じ罪(測れなかったものを緑で埋める / 第16条)。
かつ **exit 2 に揃える**ことで「測れなかった」の意味が一つに定まる。

**縛る条**: 第16条。

### FR-08 — `--gate` の引数欠落は赤

`--gate` / `--gate-not` の後に値が無い(次が別のフラグ、または引数列の末尾)場合、
`Paradise gate-filter: --gate requires a pattern` を標準エラーへ吐き **exit 2**。
未知のフラグ(`--gates` 等の打ち間違い)も同様に **exit 2**。
**黙って無視して全走に落ちてはならない** —— 打ち間違いが 6 分の全走を「絞り込んだつもり」で
返すのは、第38条の「秤が揺れる」事態である。

**縛る条**: 第16条・第38条。

### FR-09 — 引数が一つも無いときの振る舞いは**現状と完全に同一**

`node tests/paradise.test.js`(引数なし)は、
451 本すべてを走らせ、`tests/paradise.test.js:8215` の
`Paradise self-test: ${pass} passed, ${fail} failed` をこれまでと**一字一句同じ書式**で吐き、
`:8218` の `process.exit(fail === 0 ? 0 : 1)` と同じ exit code を返す。
`--gate-list` も含め、**引数が無ければ絞り込み機構は一切作動しない。**

**縛る条**: 第22条(README・census・tribunal・人間の四者の契約を動かさない)。

### FR-10 — 委譲先 9 ファイル(子の 92 本)にフィルタは**届かない**(明示の非目標)

`--gate` / `--gate-not` は `tests/paradise.test.js` が自ら呼ぶ 451 本にのみ作用し、
`require` 経由で呼ばれる子 9 ファイルの内部 92 本には**届かない**。
子を畳んでいる親の門(`tests/paradise.test.js:2697` の
`` test(`dashboard-count 系: ${name} が緑 (G-01/02/04/06)`, …) `` 8 本と、
`:8207` の `abandoned-run` 1 本)は、**親の名前で普通に絞り込める**。

**届かせない理由(事実)**:

- 子の 92 本は `Paradise self-test: 451` の **451 に含まれていない**。親は子の
  `rep.pass / rep.fail` を読んで **1 本の test に畳んでいる**
  (`tests/paradise.test.js:2698-2701`、`:8208-8212`)。
  ゆえに子を絞り込んでも **census が見る数は 1 ミリも変わらない** —— 得るものが無い。
- 子に届かせるには **9 ファイルそれぞれの `test()` を書き換える**必要があり、
  これは「自己診断に絞り込みの口を足す」という本改革の範囲を超える。
- 子 9 本の合計は `Dashboard gates` 節 0.90 秒 + `abandoned-run` 0.13 秒 = **約 1.03 秒**
  (discover §2.2)。**全走 358.8 秒の 0.29%。**速さの動機がゼロである。
- 加えて `require` はキャッシュされるため、子の再入は元より起きない(discover §5-4)。

**縛る条**: 第38条(測って動機の無いものに手を出さない)。

---

## 3. NFR(非機能要件)

| # | 要件 | 数値・判定 |
|---|---|---|
| **NFR-01** | 全走への上乗せ(**verify 相が改訂 — 談判 1 の裁定**) | **1 門あたり所要 = 全走秒 ÷ 実行時の門数**が、改革前の基準 **358.8 ÷ 449 = 0.7991 秒/門**の **+10% 以内 = 0.8790 秒/門 以下**。測定は**連続 3 回の中央値**を採る(単発の外れ値では裁かない)。設計上の目標は据え置き(`test()` に条件分岐 1 個を足すのみ) |
| **NFR-02** | 既存 449 本の振る舞い不変 | 引数なし走行で **`Paradise self-test: 451 passed, 0 failed`**、exit 0。**既存 449 本の名前・順序・`✓` を一つも変えない**(AC-16/17 の新門 2 本のぶんだけ増え、`✓` 行は 541 → **543** になる。**増分は新門 2 本ちょうどであることを歩 6 の差分照合が証明する**) |
| **NFR-03** | 依存追加ゼロ | `package.json` に一行も足さない。`require` するのは Node 組込みのみ。自己診断は現在 `assert` / `fs` / `os` / `path` / `child_process` のみを使う(`tests/paradise.test.js:8-12`) |
| **NFR-04** | 実装の局所性 | 絞り込みの本体は `test()` 関数(19–23 行)とその直前の引数解釈だけに収める。**449 本の門の本文を一行も書き換えない** |
| **NFR-05** | 決定性 | 同じ引数・同じ木に対して、走る門の集合と exit code は常に同一。乱数・時刻・環境変数に依存しない(第38条: 秤が揺れるなら秤ではない) |
| **NFR-06** | `--gate-list` の速さ | `--gate-list` は **3 秒以内**に終わる。discover §1.4 が測ったとおり準備コストは事実上ゼロだから、これは達成可能な数である |
| **NFR-07** | 絞り込み走行の速さ(この改革の gauge) | `--gate-not 'atlas: (全ての道が図になる|門は己の残骸で落ちない)'` による 447 本走行が **40 秒以内**に終わる。理論下限は discover 実測の 21.9 秒 + Atlas 残り 12 本 |
| **NFR-08** | 標準出力の汚染ゼロ | 引数なし走行の stdout に、絞り込み由来の行を **1 行も足さない**(`tribunal.yml:306` の `tail -1` が読む最終行を動かさない) |
| **NFR-09** | git 作業ツリー | 変更するファイルは `tests/paradise.test.js` **1 本のみ**(+ reform 配下の文書)。`graph/` 配下の engine を書き換えない |

### 3.1 NFR-01 改訂の理由(verify 相・談判 1 の裁定)

**採った案: review §2.3 の「秒/門」案。閾値を広げる案は退けた。**

旧 NFR-01(**362.4 秒以下**)は門ではなく**賽**であった。同じコードに対する実測が

**350.0 / 350.6 / 358.8 / 360.2 / 364.5 / 364.8 秒**(揺れ幅 **15 秒**)

と散らばり、**閾値 362.4 はその中を横切っている**。同じコードが日によって緑にも赤にもなる
判定は判定ではない。**第38条は「同じ走行には常に同じ点。秤が揺れるなら、それは秤ではない」**と
明文で言う(`node graph/codex.js article 38`)。旧 NFR-01 はこの条に正面から反していた。

加えて**母数が動いている**。旧閾値は **449 本**で定めた 358.8 秒に由来するが、改革によって
母数は 451 本になり、verify 相の常駐門昇格でさらに **454 本**になった。第38条が要求する
「前後を数値で示す」は、**同じ母数で語ること**を前提とする。449 本の絶対秒で 454 本を裁くのは、
測る対象が増えたぶんの増加を「劣化」として計上する誤りである。

**秒/門に変えると両方が同時に解ける**:

- **母数の問題が消える** — 門を足しても割り算が吸収する。閾値の意味が門数と独立になる。
- **揺れに対して余裕がある** — 観測された秒/門は 0.7761〜0.8093、揺れ幅 **0.0332 秒/門**。
  許容幅は 0.7991→0.8790 の **0.0799 秒/門**で、**揺れの約 2.4 倍**。旧基準は揺れ 15 秒に対し
  余裕が実質ゼロだった。
- **有意な劣化は依然として捕まる** — `test()` に重い処理を足して 1 門あたり +10% 劣化すれば必ず鳴る。
  緩めたのではなく、**測る量を正しいものに替えた**。
- **連続 3 回の中央値**は第38条の「決定的に測る」に寄せる工夫。単発の外れ値で赤くしない。

**退けた案**:

1. **閾値を 370 秒などに広げる** — 母数の問題が残る。門を足すたびに閾値を書き直す羽目になり、
   その書き直しは常に「後追いの追認」であって門ではない。
2. **NFR-01 を削る** — 性能の劣化を誰も見なくなる。第38条は測ることを要求しており、退却は答えでない。

**この NFR-01 は自己診断の常駐門にはしない**(review M-1)。全走 6 分を自己診断の中で撃てば
**自己診断が自分を全走で呼ぶ再帰**になる。正しい置き場は `census` / CI である。


---

## 4. AC(受入条件)

前提: すべて `cwd = C:/Users/kikus/Documents/workspace/paradise`、`node v24.14.0`、git-bash。
各 AC に **「壊し方」**(prove 相で故意に壊して赤くなることを確かめる手順)を一行添える。

### 4.1 良い道

**AC-01: 引数なし全走の名乗りと exit が現状と同一(NFR-02 / FR-09)**
入力: `node tests/paradise.test.js; echo "EXIT=$?"`
期待: stdout 最終行が正確に `Paradise self-test: 451 passed, 0 failed`、`EXIT=0`
壊し方: `test()` の絞り込み判定の既定を「全部落とす」に反転させれば `0 passed` になり赤くなる。

**AC-02: 単一の門を名前で狙える(FR-01)**
入力: `node tests/paradise.test.js --gate 'schedules a simple diamond' ; echo "EXIT=$?"`
期待: stdout に `  ✓ schedules a simple diamond into 3 waves` が 1 行、
最終行が `Paradise gate-filter: 1 of 451 gates matched — 1 green, 0 red`、`EXIT=0`
壊し方: 照合を `===`(完全一致)に変えれば 0 件になり AC-04 の道へ落ちて `EXIT=2` で赤くなる。

**AC-03: 正規表現として解釈される(部分一致・アンカー無し)(FR-01)**
入力: `node tests/paradise.test.js --gate '^gauge\(故障注入\): ' --gate-list`
期待: 並ぶ名がすべて `gauge(故障注入): ` で始まる。最終行 `Paradise gate list: 11 of 451 gates matched`(**11** は design が実測した数)、`EXIT=0`
壊し方: `new RegExp` を `String.includes` に差し替えれば `^` が文字通り扱われ 0 件になり `EXIT=2`。

**AC-04: 除外が包含に勝つ(FR-03)**
入力: `node tests/paradise.test.js --gate 'atlas:' --gate-not '描画器が実際に受理する' --gate-list`
期待: 出力の名の中に `描画器が実際に受理する` を含む行が **0 行**。最終行に `of 451 gates matched`、`EXIT=0`
壊し方: 判定順を「包含が勝つ」に入れ替えれば当該行が現れて赤くなる。

**AC-05: 最初の顧客 —— Atlas の重い 2 本を外した走行(FR-03 / NFR-07)**
入力:
```
time node tests/paradise.test.js \
  --gate-not 'atlas: 全ての道が図になる' \
  --gate-not 'atlas: 門は己の残骸で落ちない' ; echo "EXIT=$?"
```
期待: 最終行 `Paradise gate-filter: 449 of 451 gates matched — 449 green, 0 red`、`EXIT=0`、
実時間 **40 秒未満**(discover 前値 358.8 秒に対して測る。第38条は「速くなった」ではなく
**「449 本を N 秒で測った / 前: 449 本を 358.8 秒で測った」**と語ることを要求する)
壊し方: 除外を無視する実装にすれば所要が 350 秒超に戻り、時間の閾値で赤くなる。

**AC-06: `--gate` 複数指定は OR(FR-03)**
入力: `node tests/paradise.test.js --gate 'schedules a simple diamond' --gate 'abandoned-run:' ; echo "EXIT=$?"`
期待: 最終行 `Paradise gate-filter: 2 of 451 gates matched — 2 green, 0 red`、`EXIT=0`
壊し方: OR を AND にすれば 0 件になり `EXIT=2` で赤くなる。

**AC-07: `--gate-list` が実行時の名を出す —— 451 であって静的解析の数ではない(FR-06 / 制約10)**
入力: `node tests/paradise.test.js --gate-list | tail -1`
期待: 正確に `Paradise gate list: 451 gates`、`EXIT=0`
壊し方: 一覧を `grep -c '^test('` 相当の静的解析で作れば **442** を名乗り、この AC が赤くなる。
**この AC は静的解析実装を機械的に禁じる門である。**

**AC-08: `--gate-list` が 2694 行のループの 8 本を含む(FR-06 / 制約10)**
入力: `node tests/paradise.test.js --gate-list | grep -c '^dashboard-count 系: '`
期待: `8`、`EXIT=0`
壊し方: 静的解析なら `1` になる。ループ変数を展開しない実装はここで死ぬ。

**AC-09: `--gate-list` は門を実行しない(FR-06 / NFR-06)**
入力: `time node tests/paradise.test.js --gate-list > /dev/null; echo "EXIT=$?"`
期待: `EXIT=0`、実時間 **3 秒未満**(Atlas の 341.5 秒が走っていない証拠)
壊し方: `fn` を呼んでから名を集める実装にすれば 358 秒超になり赤くなる。

**AC-10: 絞り込んだ走行の中の赤は exit 1 で鳴る(FR-04 の exit 規約)**
入力(prove 相で故意に一本壊した状態): `node tests/paradise.test.js --gate '<壊した門の名>' ; echo "EXIT=$?"`
期待: 最終行 `Paradise gate-filter: 1 of 451 gates matched — 0 green, 1 red`、`EXIT=1`
壊し方: 絞り込み走行の exit を常に 0 に固定すれば赤くならない —— この AC がそれを塞ぐ。

### 4.2 悪い道(必須)

**AC-11: マッチ 0 件は緑ではない(FR-04 / 第16条)**
入力: `node tests/paradise.test.js --gate 'zzz-no-such-gate-zzz' ; echo "EXIT=$?"`
期待: stdout に
`Paradise gate list: 0 of 451 gates matched — nothing was measured`、
**`EXIT=2`**、かつ stdout に `passed` の語を含む行が **0 行**
壊し方: 業界既定(node:test / Jest / Mocha 既定 / Vitest の 4/4 が exit 0)に倣って
`EXIT=0` を返す実装にすれば、この AC が赤くなる。**楽園が業界と袂を分かつ地点の門である。**

**AC-12: 不正な正規表現は走行を始めずに赤(FR-07)**
入力: `node tests/paradise.test.js --gate '[' 2>&1 ; echo "EXIT=$?"`
期待: `Paradise gate-filter: invalid pattern [: ` で始まる行、**`EXIT=2`**、
かつ `✓` を含む行が **0 行**(一本も走っていない証拠)
壊し方: `try { new RegExp(p) } catch { /* ignore */ }` で全走に落とせば `✓` が 451 行出て赤くなる。

**AC-13: 絞り込んだ走行は `Paradise self-test:` を名乗らない(FR-05 / 第22条)**
入力: `node tests/paradise.test.js --gate 'schedules a simple diamond' | grep -c 'Paradise self-test'`
期待: `0`
壊し方: 局所走行に `:8215` の書式を吐かせれば `1` になり赤くなる。
**これが「局所走行が全走を騙る」を塞ぐ主門である。**

**AC-14: 絞り込んだ走行の最終行は census / tribunal の双方に読まれない(FR-05 / 第22条)**
入力:
```
L=$(node tests/paradise.test.js --gate 'schedules a simple diamond' 2>&1 | tail -1)
echo "$L" | grep -cE 'Paradise self-test:[[:space:]]*[0-9]+ passed, [0-9]+ failed'   # census.js:55
echo "$L" | grep -cE '[0-9]+ passed, [0-9]+ failed'                                  # census.js:57 保険
echo "$L" | grep -coE '[0-9]+ passed'                                                # tribunal.yml:307
echo "$L" | grep -coE '[0-9]+ failed'                                                # tribunal.yml:308
```
期待: **`0` が 4 行**、`EXIT` は各行 1(grep の no-match)
壊し方: 書式に `passed` / `failed` の語を戻せば 3 行目・4 行目が `1` になり赤くなる。
**この AC は書式を「三者に対して同時に安全」と証明する唯一の門である。**

**AC-15: census が絞り込みで汚れない —— 環境を毒しても 451(FR-02 / 第22条)**
入力(prove 相の手順。全走 6 分を伴うため自己診断本体には置かない。background で走らせよ):
```
PARADISE_GATE=zzz PARADISE_GATE_NOT=atlas GATE=zzz \
  node -e "console.log(JSON.stringify(require('./graph/census.js').census().tests))"
```
期待: `{"passed":451,"failed":0}`
壊し方: 絞り込みを環境変数(`PARADISE_GATE` 等)でも受ける実装にすれば
`{"passed":0,...}` あるいは `null` になり赤くなる。
**`census.js:90` が引数を渡さず環境変数だけを継承するという事実(discover §4.3(A))を
実経路で撃つ門である。**

**AC-16: 絞り込みのコードは `process.env` を読まない(FR-02 / 構造の門)**
入力(自己診断に常駐させる門として実装する。実行は一瞬):
`node tests/paradise.test.js --gate 'gate-filter: 絞り込みは環境変数を読まない'`
期待: `  ✓ gate-filter: 絞り込みは環境変数を読まない`、
`Paradise gate-filter: 1 of 451 gates matched — 1 green, 0 red`(この門自身が総数に入るので
`of 450` 等になる。**その総数は census が測り直す** —— 第22条)、`EXIT=0`
門の中身: 自分のソース(`tests/paradise.test.js`)を読み、絞り込み塊
(引数解釈から `test()` 定義の末尾まで)に `process.env` の出現が **0 件**であることを assert する。
壊し方: 絞り込み塊に `process.env.PARADISE_GATE` を一行足せば赤くなる。

**AC-17: `census.js` の呼び口が引数を渡さないことを門が見張る(FR-02 / 第22条)**
入力: `node tests/paradise.test.js --gate 'gate-filter: census は自己診断を素で呼ぶ'`
期待: `  ✓ gate-filter: census は自己診断を素で呼ぶ`、`EXIT=0`
門の中身: `graph/census.js` のソースを読み、自己診断を起こす `execFileSync` の
引数配列の要素が **スクリプトパス 1 個のみ**であることを assert する
(現状 `graph/census.js:90-91`)。
壊し方: `census.js:90` の配列に `'--gate', 'x'` を足せば赤くなる。
**将来 census 側から絞り込みが漏れ込むのを塞ぐ、時を超えた門である。**

**AC-18: 打ち間違えたフラグは黙って全走に落ちない(FR-08)**
入力: `node tests/paradise.test.js --gates 'atlas' 2>&1 | tail -2 ; echo "EXIT=$?"`
期待: `Paradise gate-filter: unknown flag --gates`、**`EXIT=2`**、`✓` を含む行が 0 行
壊し方: 未知フラグを無視する実装にすれば 451 本が 6 分走り、`EXIT=0` になって赤くなる。

**AC-19: 値の無い `--gate` は赤(FR-08)**
入力: `node tests/paradise.test.js --gate 2>&1 ; echo "EXIT=$?"`
期待: `Paradise gate-filter: --gate requires a pattern`、**`EXIT=2`**
壊し方: `undefined` を `new RegExp(undefined)`(= `/undefined/`)に落とす実装は
0 件マッチになり `EXIT=2` は返すが**メッセージが違う**ため、文字列一致でこの AC が赤くなる。

**AC-20: 空文字パターンは「全件」ではなく赤(FR-08)**
入力: `node tests/paradise.test.js --gate '' 2>&1 ; echo "EXIT=$?"`
期待: `Paradise gate-filter: --gate requires a pattern`、**`EXIT=2`**
理由: `new RegExp('')` は全件にマッチする。**空の絞り込みが 6 分の全走を
「絞り込んだ」書式で名乗るのは、AC-13 と裏表の欺きである。**
壊し方: 空文字を許せば `451 of 451 gates matched` が出て赤くなる。

**AC-21: 絞り込み走行では README の数を触らない(FR-09 / 第22条)**
入力:
```
git diff --quiet README.md && echo CLEAN
node tests/paradise.test.js --gate 'schedules a simple diamond' > /dev/null
git diff --quiet README.md && echo CLEAN
```
期待: `CLEAN` が 2 回
壊し方: 走行中に README を書き換える副作用を足せば 2 回目が出ず赤くなる
(現状の自己診断に README への書き込みは無い。この AC は将来の退行を塞ぐ)。

**AC-22: 全走の所要が悪化していない(NFR-01 / 第38条)**
入力: `time node tests/paradise.test.js > /dev/null` を **background** で **連続 3 回**
期待: **秒/門 = 実時間 ÷ 実行時の門数** の**中央値**が **0.8790 秒/門 以下**
(改革前の基準 358.8 ÷ 449 = 0.7991 秒/門 の +10%)、最終行 `454 passed, 0 failed`、`EXIT=0`
壊し方: `test()` ごとに正規表現をコンパイルし直す実装(454 回)は
上乗せが閾値を超えうる —— パターンは走行開始時に 1 度だけコンパイルすること。
**verify 相が改訂**(旧: 362.4 秒以下)。理由は §3.1 —— 旧閾値は揺れ 15 秒の中を横切っており、
かつ 449 本で定めた絶対秒で 454 本を裁いていた(第38条違反)。

**AC の総数: 22 本**(良い道 10 / 悪い道 12)。

---

## 5. 非目標(今回やらないこと)

| # | やらないこと | 理由 |
|---|---|---|
| **NG-01** | 委譲先 9 ファイル(子 92 本)へフィルタを届かせる | FR-10 参照。子は 451 に含まれず、絞り込んでも census が見る数は変わらない。合計 1.03 秒 = 全走の 0.29% で速さの動機もゼロ。9 ファイルの書き換えは本改革の範囲外 |
| **NG-02** | 節(セクション)を絞り込みの単位にする | 節は `console.log` であって構造ではなく(制約2)、主題とも一致しない(制約3 —— `Daily guard` 節に別主題 110 本が同居)。単位にするには自己診断の構造改変が要る。**将来やるなら独立の改革として** |
| **NG-03** | Atlas の 2 本に `skipBrowser: true` を使わせる | `graph/atlas.js:1367, 1375` に逃げ道は既に在るが、この 2 本は**意図的に使っていない** —— 実ブラウザで測ることがこの門の主張そのものだから(第47条 / 第50条)。engine の意味論を変えるのは reform の別の道 |
| **NG-04** | `--pass-with-no-gates` 相当の「0 件を緑にする」逃げ口 | Jest / Vitest の `--passWithNoTests` に相当する口を作れば、FR-04 が塞いだ穴が再び開く。**第16条が禁じる「測れなかったものを緑で埋める」への公式な扉を、楽園は作らない** |
| **NG-05** | 環境変数による絞り込み | FR-02 参照。`census.js:90` が env を継承する以上、第22条に触れる。**好みではなく掟の分岐点** |
| **NG-06** | 並列実行・ファイル分割・テストランナーの導入 | 本改革は「走らせる門を選ぶ口」だけを作る。並列化は依存追加(NFR-03 違反)か大工事を招く。速さの 93.7% は 2 本に集中しており(discover §2.3)、**選ぶ口だけで目的は達する** |
| **NG-07** | `tests/` にあって自己診断から呼ばれていない 3 本以上のファイル(`counsel.test.js` 39 本、`guards.test.js` 50 本ほか)を取り込む | 「全走」の定義を変える行為であり、451 という数を動かす。第22条の契約に触れるため独立の改革として扱う |
| **NG-08** | CI(`tribunal.yml`)に絞り込みを持ち込む | `tribunal.yml:27` と `:306` は引数なしで全走している。CI は**常に全走**であるべきで、絞り込みは教主の手元の道具である。CI を触らないことが AC-14 の fail-safe を意味あるものにする |
| **NG-09** | `README.md` の数を手で書く | census が測って書く(第22条 / 制約7)。門が増えれば 451 は変わるが、それは census の仕事 |

---

## 6. 掟との整合

### 6.1 条文と FR の対応(`node graph/codex.js article <n>` で自分の目で読んだ)

**第16条 — Evidence is judged by what it DOES, never by what it is named.**
> "substance-based recognition must never become a rubber stamp, so **a file that
> asserts nothing is no evidence however it is named.** Every check in `critic.js`
> that decides whether a duty was discharged must read the artifact, not merely
> match its filename."

縛られる FR: **FR-04**(0 件マッチ = 何も assert していない走行 = 証拠ではない → 赤)、
**FR-06**(名前一覧は静的解析ではなく実物=実行時の名から作る)、
**FR-07**(壊れたパターンを 0 件に落として緑にしない)、
**FR-08**(打ち間違いを黙って全走に落とさない)。
関連 AC: AC-07, AC-08, AC-11, AC-12, AC-18, AC-19, AC-20。

**第22条 — A number the paradise states about itself must be countable, and counted.**
> "every number the paradise publishes about itself is **measured from the artifact**
> by `census.js` and compared against the documents; a stale number is a failing
> gate, not a typo. If a thing cannot be counted, it must not be claimed."

縛られる FR: **FR-02**(env を採れば census が絞り込み後の数を README に持ち込む)、
**FR-05**(局所走行が全走の名乗りを騙れば census・tribunal・人間の三者が偽の数を語る)、
**FR-09**(引数なし走行の契約不変)、**FR-03**(除外した走行が全走を騙らない)。
関連 AC: AC-13, AC-14, AC-15, AC-16, AC-17, AC-21。

**第38条 — Improvement must be proven in numbers.**
> 「改善した」と語る者は、前後を数値で示さねばならない。…
> **測らなかった走行は改善を主張できない。**
> …同じ走行には常に同じ点(LLM に尋ねない —— **秤が揺れるなら、それは秤ではない**)。

縛られる FR: **FR-03**(除外優先の決定性 —— 順序依存の規則は秤を揺らす)、
**FR-10**(1.03 秒 / 0.29% を測った上で「手を出さない」と決めた)、
**NFR-05 / NFR-07**、および gauge そのもの。
**前値は discover が実測した 358.8 秒 / 449 本**である(discover §4.3(D))。
本改革の後値は AC-05 が測る。**語り方は「速くなった」ではなく
「449 本を N 秒で測った(前: 449 本を 358.8 秒)」**でなければならない ——
22 秒の走行と 359 秒の走行は別のものを測っているからである。
関連 AC: AC-05, AC-22。

### 6.2 新しい条は要るか —— 所見(起草はしない)

**所見: 一条あってよい。ただし本改革を合法に為すための必須条件ではない。**

理由(賛):

- 本改革が発見した禁忌は、既存のどの条にも**正面からは**書かれていない ——
  「**部分の走行は、全体の走行の名を名乗ってはならない**」。
  第22条は「楽園が自分について語る数は測られていなければならない」と言うが、
  「**同じ書式が二つの母数で使われうる**」という危険は名指していない。
  今回はたまたま総括行が三者に消費されている(census.js:55 / tribunal.yml:306 / 人間)
  ことを discover が実測したから塞げたが、**次に誰かが局所出力の口を作るとき、
  同じ罠を discover し直さねばならない。**
- 第16条は「名で裁くな」と言い、この条は「名を騙るな」と言う。**裏返しの対**であり、
  条として並ぶ形が自然である。

理由(否):

- 本改革の範囲では、AC-13 / AC-14 / AC-16 / AC-17 が**機械としてこれを強制する**。
  第16条が「散文ではなく実物を読め」と言う以上、**門が在るなら条は後で足りる**。
  条を先に足して門が無ければ、それこそ第22条が嫌う「何も再検証しない散文」になる。
- 条は 55 本ある。増やすことそれ自体に代がある(第33条: 全文を常時読むな)。

**結論の形**: この改革は **AC で塞ぐことを先とし、条の起草は ratify 相以降に持ち越す**。
起草するなら本文は「総括の名乗りは母数を伴う契約であり、部分の走行は
別の名乗りを用いねばならない。名乗りの消費者は engine が列挙できること」の線。
**本 specify では起草しない。**

---

## 7. 前値(第38条のための記録)

| 指標 | 前(discover 実測 2026-09-09) |
|---|---|
| 引数なし全走 | **358.8 秒**(`ELAPSED_MS=358808`) |
| 門の本数 | **449**(+ 委譲先 92 = 実質 541 の assert 群) |
| 全走の名乗り | `Paradise self-test: 449 passed, 0 failed` / exit 0 |
| 上位 2 本の占有 | **341.5 秒 = 93.7%** |
| Atlas 抜きの理論下限 | **21.9 秒**(435 本) |
| `--gate-list` 相当の口 | **存在しない** |
| 0 件マッチ時の振る舞い | **存在しない**(業界 4/4 は exit 0) |

**後値は prove / gauge 相が AC-05 と AC-22 で測る。同じ母数で語ること。**
