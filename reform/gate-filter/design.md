# design — 門の絞り込み(フィルタ)の口

**相**: design(設計)／改革 `gate-filter`
**日付**: 2026-09-09
**入力**: `reform/gate-filter/findings.md`(471行・批准済み)、`reform/gate-filter/requirements.md`(572行・批准済み / FR10・NFR9・**AC22**・NG9)
**約束**: 本書は設計のみを定める。**`tests/paradise.test.js` も `graph/` も `README.md` も一行も書き換えていない。**
本書に引く行番号は design 相で自分の目で開いて確かめた。実験は `%LOCALAPPDATA%\Temp\paradise-gate-design\` の使い捨てで行い、実出力を本文に引いた。**全走(6分)は走らせていない**(不要だった)。

`git status --porcelain` → `?? reform/gate-filter/` のみ。ブランチ `feat/gate-filter`。

---

## 0. design 相で自分の目で開いた行(一次資料)

| 場所 | 何を確かめたか |
|---|---|
| `tests/paradise.test.js:7-12` | `assert` / `fs` / `os` / `path` / `child_process` のみ(NFR-03 の前提) |
| `tests/paradise.test.js:19-23` | `let pass = 0, fail = 0;` と 8 行(正確には 4 行)の自作 `test()`。フレームワーク無し |
| `tests/paradise.test.js:25-26, 29` | 節見出しは `console.log('Graph engine:')`、一時 DAG 名は `paradise-test-dag-${process.pid}.json` |
| `tests/paradise.test.js:85, 89, 126` | `kgRoot` / `ccRoot` の `mkdtempSync` と `process.env.PARADISE_KG` 差し替え(トップレベル) |
| `tests/paradise.test.js:2693-2703` | `console.log('\nDashboard gates …')` + 8 要素ループ内の `test(\`dashboard-count 系: ${name} が緑 (G-01/02/04/06)\`, …)` |
| `tests/paradise.test.js:8206-8212` | `console.log('\n第53条 走行の門 (abandoned-run):')` + `abandoned-run` 1 本 |
| `tests/paradise.test.js:8214-8218` | 総括行 `` console.log(`\nParadise self-test: ${pass} passed, ${fail} failed`) ``、`rmSync(kgRoot)` / `rmSync(ccRoot)`、`process.exit(fail === 0 ? 0 : 1)` |
| `graph/census.js:54-61` | `summaryOf()` — 名乗り正規表現と `matchAll` の保険 |
| `graph/census.js:88-102` | `execFileSync(process.execPath, [path.join(ROOT,'tests','paradise.test.js')], {encoding,cwd,timeout})`。**引数配列は 1 要素、`env` 指定なし = 丸ごと継承** |
| `graph/census.js:268-270` | `README.md` の `/paradise\.test\.js\s+#\s*(\d+)\/(\d+) pass/` を `[passed, passed+failed]` と突き合わせる |
| `graph/census.js:456-469` | `census.js fix` の CLI。書いた後に裁き直し、未解決なら exit 1 |
| `.github/workflows/tribunal.yml:27` | `run: node tests/paradise.test.js`(引数なし全走) |
| `.github/workflows/tribunal.yml:306-308` | `TESTS=$(… | tail -1)` / `grep -oE '[0-9]+ passed'` / `grep -oE '[0-9]+ failed'`、`|| echo 0` |
| `README.md:138` | `node ~/Documents/workspace/paradise/tests/paradise.test.js   # 449/449 pass` |

grep で確かめた事実(design 相):

- `tests/paradise.test.js` に `process.argv` の出現は **0 件**(引数空間は無人。specify の主張を再確認した)
- `tests/paradise.test.js` に `process.env` の出現は **58 件**。だが**すべて 85 行以降**、つまり門の本文の中である。**19–23 行の `test()` とその手前(1–18 行)には 1 件も無い** —— ゆえに絞り込み塊を「ファイル冒頭」に置けば、AC-16 の「塊に `process.env` が 0 件」は無理なく成立する
- `graph/census.js` の `execFileSync` は 21 行(require)と **90 行(唯一の呼び口)** の 2 箇所のみ
- 作業ツリー全体で追跡ファイル中の `449` は **`README.md:138` の 1 箇所だけ**(`grep -rn 449 --include=*.js --include=*.md --include=*.json --include=*.yml`)。**この改革が数を動かすとき、手で直す先は世界に一つしか無い。しかもそれは census が書く**

---

## 1. 矛盾の決着 —— 449 か 451 か

### 1.1 矛盾の正体

specify は二つのことを同時に要求している:

- **AC-01**: 引数なし全走の最終行が正確に `Paradise self-test: 449 passed, 0 failed`
- **AC-16 / AC-17**: 新しい門を **2 本、自己診断に常駐させる**(`gate-filter: 絞り込みは環境変数を読まない` / `gate-filter: census は自己診断を素で呼ぶ`)

実装後の実行時本数は **449 + 2 = 451**。ゆえに AC-01 の期待文字列は**そのままでは決して満たせない**。
矛盾は AC-01 だけに留まらない。同じ根から次も破れる:

- **NFR-02**「門の本数・名前・順序・stdout の `✓` 行(541 行)を一切変えない」
- **NFR-08**「引数なし走行の stdout に絞り込み由来の行を 1 行も足さない」
- **AC-02 / 03 / 04 / 05 / 06 / 07 / 10 / 11 / 15 / 22** に埋め込まれた `449`

### 1.2 決着 —— **AC-16/17 を勝たせ、AC-01 側を書き直す**

**決定: 総数は 451 になる。AC-01 ほか「449」を含むすべての期待文字列を 451 系に書き直す。AC-16/17 は一字も動かさない。**

理由は三つ。いずれも掟に根がある。

1. **第22条は「数を固定せよ」とは一言も言っていない。**
   条文は *"every number the paradise publishes about itself is **measured from the artifact** by `census.js`"* である。
   449 は**測られた事実**であって**契約された定数ではない**。門が 2 本増えれば測り直した数は 451 になり、それが真実である。
   449 を守るために門を 2 本削るのは、**数を守るために測定対象を削る**行為 —— 第22条が最も嫌う本末転倒である。
   specify 自身がこれを予見して AC-16 にこう註記している:
   > 「実装後は総数が増えるので `of 450` 等になる。**その総数は census が測り直す** —— 第22条」
   すなわち **specify は AC-16 の側では既に 449 を手放していた**。手放し損ねたのが AC-01 と NFR-02/08 だった。本書はその取りこぼしを閉じる。

2. **AC-16/17 は本改革の安全装置そのものである。**
   FR-02 は「census を汚さない」ことを三重に縛ると宣言し、その 1 と 2 が AC-16/17 である
   (3 は AC-15 = prove 相の手順)。この 2 本を削れば、**環境変数による絞り込みが将来こっそり生えることを機械が止められなくなる**。
   AC-01 は「引数なし走行の契約が動かない」ことの門だが、その本質は**書式と exit code**であって数値ではない。数値は census が測る。**削るべきは数値の方である。**

3. **NG-09 が「README の数を手で書くな」と命じている。**
   449 → 451 は `node graph/census.js fix` が README を書き換える仕事である。
   AC の期待文字列に 449 を焼き込むことは、**AC 自身が NG-09 の禁じる「手で書いた数」になる**という自己矛盾を孕んでいた。本書はここも正す(§1.5)。

### 1.3 AC-01 の書き直し —— 具体の文字列

**旧(requirements.md:310-313)**:

```
**AC-01: 引数なし全走の名乗りと exit が現状と同一(NFR-02 / FR-09)**
入力: `node tests/paradise.test.js; echo "EXIT=$?"`
期待: stdout 最終行が正確に `Paradise self-test: 449 passed, 0 failed`、`EXIT=0`
```

**新(design が定める。build 相はこの文字列を requirements.md に反映せよ)**:

```
**AC-01: 引数なし全走の名乗りと exit が現状と同一(NFR-02 / FR-09)**
入力: `node tests/paradise.test.js; echo "EXIT=$?"`
期待: stdout 最終行が正確に `Paradise self-test: 451 passed, 0 failed`、`EXIT=0`
根拠: 449(前)+ AC-16 の門 1 本 + AC-17 の門 1 本 = 451。
      この 451 は本 AC が主張する数ではなく **census が測った数**である(第22条)。
      検算は `node graph/census.js show` が語る tests.passed と一致すること。
壊し方: `test()` の絞り込み判定の既定を「全部落とす」に反転させれば `0 passed` になり赤くなる。
```

**書式は一字も動いていない** —— `Paradise self-test: ` / ` passed, ` / ` failed` の三つの区切りは不変であり、
`census.js:55` の `/Paradise self-test:\s*([0-9]+) passed, ([0-9]+) failed/` も
`tribunal.yml:307-308` の `grep -oE '[0-9]+ (passed|failed)'` も**これまで通り読める**。
FR-09 が守れと言った契約は書式と exit code であって、数の値ではない。**契約は無傷である。**

### 1.4 449 を含む他の AC の書き直し表

すべて「449 → 451」だが、**分子まで動くものが 1 本ある**(AC-05)。取りこぼすと prove 相が偽の赤を出す。

| AC | 旧の期待文字列 | 新の期待文字列 | 註 |
|---|---|---|---|
| AC-01 | `Paradise self-test: 449 passed, 0 failed` | `Paradise self-test: 451 passed, 0 failed` | §1.3 |
| AC-02 | `Paradise gate-filter: 1 of 449 gates matched — 1 green, 0 red` | `Paradise gate-filter: 1 of 451 gates matched — 1 green, 0 red` | 分子 1 は不変(実測で確認・§2.6) |
| AC-03 | `Paradise gate list: N of 449 gates matched`(N ≥ 5) | `Paradise gate list: N of 451 gates matched`(**N = 11**) | 実測 11 件(§2.6) |
| AC-04 | `of 449 gates matched` | `of 451 gates matched` | 分子は 16(実測) |
| **AC-05** | `Paradise gate-filter: 447 of 449 gates matched — 447 green, 0 red` | **`Paradise gate-filter: 449 of 451 gates matched — 449 green, 0 red`** | **分子も動く**。451 − Atlas 重 2 本 = 449。時間の閾値 40 秒は不変(新門 2 本はソース読みのみで数ミリ秒) |
| AC-06 | `Paradise gate-filter: 2 of 449 gates matched — 2 green, 0 red` | `Paradise gate-filter: 2 of 451 gates matched — 2 green, 0 red` | |
| AC-07 | `Paradise gate list: 449 gates` | `Paradise gate list: 451 gates` | **この AC が静的解析を禁じる門である点は不変。静的な `test(` は 442 のまま + 新門 2 = 444 ≠ 451** |
| AC-08 | `8` | `8`(不変) | 新門はループ外 |
| AC-10 | `1 of 449 … 0 green, 1 red` | `1 of 451 … 0 green, 1 red` | |
| AC-11 | `Paradise gate list: 0 of 449 gates matched — nothing was measured` | `Paradise gate list: 0 of 451 gates matched — nothing was measured` | 語 `gate list` は原文どおり(§5.3 の註) |
| AC-15 | `{"passed":449,"failed":0}` | `{"passed":451,"failed":0}` | |
| AC-16 | `of 450` 等(既に可変と註記済み) | `Paradise gate-filter: 1 of 451 gates matched — 1 green, 0 red` | specify の註記を確定値にするだけ |
| AC-22 | 最終行 `449 passed, 0 failed`、362.4 秒以下 | 最終行 `451 passed, 0 failed`、**362.4 秒以下(不変)** | 新門 2 本の代は測定誤差以下(§6.4) |

**NFR-02 の書き直し**:
> 引数なし走行で **`Paradise self-test: 451 passed, 0 failed`**、exit 0。
> **既存 449 本**の名前・順序・`✓` 行を一切変えない。
> 増えるのは AC-16/17 が命じる 2 本と、その節見出し 1 行の**計 3 行**であり、それ以外に stdout は 1 行も動かない
> (`✓` 行 541 → **543**)。

**NFR-08 の書き直し**:
> 引数なし走行の stdout に、**引数解釈・絞り込み判定・局所名乗りに由来する行を 1 行も足さない**。
> AC-16/17 の門 2 本とその節見出しは**門であって絞り込み由来の出力ではない** —— それらは `✓` として数えられ census が測る。
> 最終行(`tribunal.yml:306` の `tail -1` が読む行)は総括行のままであり、位置も書式も動かない。

### 1.5 README と census の手順(NG-09 / 第22条)

**`README.md:138` の `# 449/449 pass` を手で書き換えてはならない。**
`census.js:268-270` が `/paradise\.test\.js\s+#\s*(\d+)\/(\d+) pass/` で分子・分母の**二つ**を捕捉し、
`[c.tests.passed, c.tests.passed + c.tests.failed]` と突き合わせる。手で片方だけ直せば
`census.js:259` の註釈が語る `336/335` の再来になる。

**build 相が踏む手順(この順で、この通りに)**:

```bash
cd C:/Users/kikus/Documents/workspace/paradise

# 1) 実装が終わってから。census に全走させて測らせ、README を書かせる(第22条)
#    全走 6 分 + 新門の代。background で走らせよ。
node graph/census.js fix

# 期待する出力(実測ではなく設計上の期待):
#   ✏️  README テスト数: 449/449 → 451/451
#   updated: README.md
#   ✓ 書き換えた数は、その主張の目で読み直して実測と一致する

# 2) 書かせた後に裁き直す(census.js:461-467 が既に自分でやるが、独立に確認する)
node graph/census.js check    # exit 0 を要求

# 3) diff が README.md の 138 行 1 行だけであることを目で確かめる
git diff --stat README.md     # 期待: 1 file changed, 1 insertion(+), 1 deletion(-)
git diff README.md
```

註: `census.js fix` は `runTests !== false` のとき自己診断を全走させる(`census.js:88-91`、timeout 600000ms)。
**実装が全走で緑になるまで `fix` を呼ぶな** —— 赤があると `summaryOf` は `451 passed, 1 failed` を読み、
README の分母を 452 に書いてしまう。**手順 1 の前に `node tests/paradise.test.js` の全走緑を一度取ること。**

註 2: `README.md:145` 付近の散文(検証内容の列挙)には数値が無いので触れる必要は無い。
**追跡ファイル中の `449` は `README.md:138` の 1 箇所だけ**であることを design 相の grep で確認済み。

---

## 2. 引数解釈の設計

### 2.1 置き場所

**`tests/paradise.test.js` の 18 行と 19 行の間**(`const engine = require(...)` の直後、`let pass = 0, fail = 0;` の直前)。
理由:

- 1–18 行には `process.env` が 1 件も無い(design 相で grep 確認)。ゆえに絞り込み塊をここに置けば AC-16 の「塊に `process.env` 0 件」が構造的に成り立つ
- `test()` 定義(19–23 行)の直前であり、`GATE` を閉包で参照できる
- 節見出しの最初の `console.log`(26 行)より前 —— `--gate-list` 時に `console.log` を黙らせる必要がある(§4.3)ため、**ここより後ろでは間に合わない**

### 2.2 文法

```
node tests/paradise.test.js [--gate <regexp>]... [--gate-not <regexp>]... [--gate-list]
```

| フラグ | 値 | 複数回 | 意味 |
|---|---|---|---|
| `--gate <regexp>` | 必須 | 可(OR) | 包含。`new RegExp(v).test(name)` |
| `--gate-not <regexp>` | 必須 | 可(OR) | 除外。**包含に勝つ** |
| `--gate-list` | 取らない | 可(冪等) | 名を並べるだけ。`fn` を呼ばない |

- `--gate=x` の等号記法は**受け付けない**(未知フラグ扱い)。specify の AC は空白区切りしか使っておらず、記法を二つ持てば `--gate=` の値欠落という第三の経路が生まれる。**口は一つ**
- 短縮形(`-g` 等)は作らない
- 位置引数(フラグでない裸の語)は**未知フラグと同じ経路で赤**にする(`--` で始まらないので `unknown flag <語>` と鳴る)

### 2.3 判定順序(FR-03)

1. `--gate` が 0 個 → 候補は全件。1 個以上 → **いずれかにマッチした門のみ**(OR)
2. 候補から `--gate-not` の**いずれかにマッチした門を落とす**(OR)
3. **除外が包含に勝つ**

疑似コードではなく実物:

```js
function wants(name) {
  if (INC.length && !INC.some(re => re.test(name))) return false;
  if (EXC.some(re => re.test(name))) return false;
  return true;
}
```

### 2.4 エラー経路 —— メッセージ文字列と exit code

**すべて `process.stderr` へ 1 行、`process.exit(2)`。総括行は吐かない。門を一本も走らせない(引数解釈は 18 行目、最初の `test()` は 31 行目)。**

| # | 条件 | メッセージ(テンプレート) | exit | 検める AC |
|---|---|---|---:|---|
| E1 | 未知のフラグ / 裸の語 | `` `Paradise gate-filter: unknown flag ${a}` `` | 2 | AC-18 |
| E2 | 値欠落(引数列の末尾) | `` `Paradise gate-filter: ${a} requires a pattern` `` | 2 | AC-19 |
| E3 | 値が空文字 `''` | 同上(E2 と同一文字列) | 2 | AC-20 |
| E4 | 値が別のフラグ(`--` 始まり) | 同上(E2 と同一文字列) | 2 | AC-19 の系 |
| E5 | 不正な正規表現 | `` `Paradise gate-filter: invalid pattern ${p}: ${e.message}` `` | 2 | AC-12 |

### 2.5 AC の期待文字列との一字一句の照合(自分で確かめた)

specify の AC 原文(requirements.md の行番号つき)と、本設計が出す文字列を**文字単位で並べる**:

| AC | requirements.md の要求文字列 | 本設計が出す文字列 | 一致 |
|---|---|---|---|
| AC-18 (:437) | `Paradise gate-filter: unknown flag --gates` | `Paradise gate-filter: unknown flag --gates` | **○** |
| AC-19 (:442) | `Paradise gate-filter: --gate requires a pattern` | `Paradise gate-filter: --gate requires a pattern` | **○** |
| AC-20 (:448) | `Paradise gate-filter: --gate requires a pattern` | `Paradise gate-filter: --gate requires a pattern` | **○** |
| AC-12 (:381) | `Paradise gate-filter: invalid pattern [: ` で始まる行 | `Paradise gate-filter: invalid pattern [: Invalid regular expression: /[/: Unterminated character class` | **○**(前方一致) |

**特に見た点**:

- AC-19/20 は `--gate` を**そのまま**含む。ゆえにテンプレートは `${a} requires a pattern` でなければならない
  (`--gate-not` の欠落なら `Paradise gate-filter: --gate-not requires a pattern` になる。これは AC には無いが同じ文法から自然に出る)
- AC-12 は「`Paradise gate-filter: invalid pattern [: ` で始まる行」—— **`[` の後にコロン+空白**。
  ゆえにテンプレートは `` `invalid pattern ${p}: ${e.message}` `` であり、`${p}` を引用符で囲んではならない(`invalid pattern '[': ` は不一致になる)
- AC-18 は `--gates` を**そのまま**含む。ゆえに `${a}` をそのまま埋める。`unknown flag: --gates` のようにコロンを挟めば不一致
- すべて `Paradise gate-filter: ` で始まる —— `Paradise gate list:` ではない。0 件マッチ(§5.3)だけが `gate list` を名乗る

### 2.6 実験 —— 雛形を実際に走らせた

`%LOCALAPPDATA%\Temp\paradise-gate-design\gates.js` に §2.3 の実物をそのまま置いて走らせた実出力:

```
ARGV=[] -> inc=0 exc=0 list=false active=false
ARGV=["--gate","atlas:"] -> inc=1 exc=0 list=false active=true
ARGV=["--gate-list"] -> inc=0 exc=0 list=true active=true
ARGV=["--gate"] -> ERROR "Paradise gate-filter: --gate requires a pattern"
ARGV=["--gate",""] -> ERROR "Paradise gate-filter: --gate requires a pattern"
ARGV=["--gate","--gate-list"] -> ERROR "Paradise gate-filter: --gate requires a pattern"
ARGV=["--gates","atlas"] -> ERROR "Paradise gate-filter: unknown flag --gates"
ARGV=["--gate","["] -> ERROR "Paradise gate-filter: invalid pattern [: Invalid regular expression: /[/: Unterminated character class"
ARGV=["--gate","a","--gate","b","--gate-not","c","--gate-list"] -> inc=2 exc=1 list=true active=true
```

**4 本すべての AC 文字列が雛形の実出力と一致した。**

さらに、実行時に集めた 449 本の実名(§4.4 の実験で得た `names.txt`)に AC の各パターンを当てた実出力:

```
TOTAL=449
AC02 [schedules a simple diamond] =1 :: ["schedules a simple diamond into 3 waves"]
AC03 [^gauge\(故障注入\): ] =11
AC04 [atlas:] =17 minus [描画器が実際に受理する] =16
AC05 not1 [atlas: 全ての道が図になる] =1
AC05 not2 [atlas: 門は己の残骸で落ちない] =1
AC05 remaining=447
AC06 OR =2
AC08 dashboard-count 系 =8
AC11 [zzz-no-such-gate-zzz] =0
AC16 name candidate =0        ← まだ実装していないので当然 0
AC17 name candidate =0        ← 同上
EMPTY new RegExp('') matches=449
INVALID_MSG="Invalid regular expression: /[/: Unterminated character class"
UNDEF_REGEXP=/(?:)/
```

この実測が確定させたこと:

- **AC-02 の分子 1、AC-06 の分子 2、AC-08 の 8 はすべて実測で正しい**(推測ではない)
- **AC-03 の N は 11**(specify は「N ≥ 5」としか書けなかった。design が測って確定させた)
- **AC-05 の 447 は実装前の値。実装後は 449**(451 − 2)
- **`new RegExp('')` は 449 件全部にマッチする** —— AC-20 が空文字を赤にする理由が実測で裏づけられた
- **`new RegExp(undefined)` は `/(?:)/`** —— specify が AC-19 の「壊し方」で予言したとおり全件マッチになる。ゆえに値欠落は `undefined` を `RegExp` に渡す前に止めねばならない

---

## 3. `test()` 関数の改修設計

### 3.1 現行(`tests/paradise.test.js:19-23`)

```js
let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); pass++; }
  catch (e) { console.log('  \u2717 ' + name + '\n      ' + e.message); fail++; }
}
```

### 3.2 改修後(実際に書ける形。**ファイルには適用していない**)

18 行と 19 行の間に挿す塊 + `test()` の書き換え。**これで全部である。**

```js
// >>> gate-filter: 絞り込み塊 ここから  (AC-16 の門がこの対を読む — 対を消すな)
/**
 * 門の絞り込みの口 (reform/gate-filter)。**CLI 引数のみ。環境変数は一つも読まない。**
 * graph/census.js:90 は自己診断を素で呼び env を丸ごと継承する。env で受ければ
 * census が絞り込み後の数を README に持ち込む(第22条 / requirements FR-02)。
 * この塊に process.env を書き足したら AC-16 の門が赤くなる。それは誤検知ではない。
 */
const GATE = (() => {
  const argv = process.argv.slice(2);
  const inc = [], exc = [];
  let list = false;
  const die = (msg) => { process.stderr.write(msg + '\n'); process.exit(2); };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--gate-list') { list = true; continue; }
    if (a === '--gate' || a === '--gate-not') {
      const v = argv[i + 1];
      if (v === undefined || v === '' || /^--/.test(v)) {
        die(`Paradise gate-filter: ${a} requires a pattern`);
      }
      (a === '--gate' ? inc : exc).push(v);
      i++; continue;
    }
    die(`Paradise gate-filter: unknown flag ${a}`);
  }
  // パターンは走行開始時に 1 度だけコンパイルする (AC-22: 449 回のコンパイルは代を払う)
  const comp = (arr) => arr.map((p) => {
    try { return new RegExp(p); }
    catch (e) { die(`Paradise gate-filter: invalid pattern ${p}: ${e.message}`); }
  });
  const INC = comp(inc), EXC = comp(exc);
  return {
    list,
    active: INC.length > 0 || EXC.length > 0 || list,
    total: 0,      // 登録された門の総数 (= 分母)
    matched: 0,    // 絞り込みを通った門の数 (= 分子)
    wants(name) {
      if (INC.length && !INC.some((re) => re.test(name))) return false;
      if (EXC.some((re) => re.test(name))) return false;
      return true;
    },
  };
})();
// --gate-list は名だけを並べる。節見出し(console.log)は構造ではないので黙らせる。
// ここより後の 33 個の console.log を一つも書き換えないための一行である (NFR-04)。
const SAY = process.stdout.write.bind(process.stdout);
if (GATE.list) console.log = () => {};

let pass = 0, fail = 0;
function test(name, fn) {
  GATE.total++;
  if (GATE.active && !GATE.wants(name)) return;
  GATE.matched++;
  if (GATE.list) { SAY(name + '\n'); return; }          // fn を呼ばない
  try { fn(); console.log('  \u2713 ' + name); pass++; }
  catch (e) { console.log('  \u2717 ' + name + '\n      ' + e.message); fail++; }
}
// <<< gate-filter: 絞り込み塊 ここまで  (AC-16 の門がこの対を読む — 対を消すな)
```

### 3.3 この設計が守っているもの

| 要件 | どう守っているか |
|---|---|
| **NFR-04**(局所性) | 触るのは (a) 18/19 行の間に挿す塊、(b) `test()` の 3 行追加、(c) 総括行 8214–8218(§5)。**449 本の門の本文は一行も動かない**。33 個の節見出し `console.log` も一行も動かない |
| **NFR-02**(不変) | `GATE.active` が偽なら `wants()` すら呼ばれず、`console.log('  ✓ ' + name)` の経路は現行と**バイト単位で同一** |
| **NFR-03**(依存ゼロ) | `require` を 1 行も足さない |
| **NFR-05**(決定性) | 乱数・時刻・環境変数を読まない。同じ argv に同じ集合 |
| **AC-22**(全走の代) | 正規表現は塊の中で **1 度だけ**コンパイルされる。全走時の追加コストは `GATE.total++` と `if (GATE.active && …)` の**短絡評価 1 回 × 451**(§6.4 で測った) |
| **FR-09**(引数なし = 現状同一) | `active === false` かつ `list === false` のとき、`test()` は `GATE.total++` を除いて現行と同じ道を通り、総括行も現行のまま(§5.1) |

**`GATE.total++` を `active` の外に置く理由**: 分母 `of 451` は「登録された門の総数」であり、絞り込みの有無に依存してはならない。
`active` の内側に置けば絞り込み時に分母が分子と等しくなり、`449 of 449` という嘘が出る(第38条: 母数を明示せよ)。

**`GATE.matched++` を `list` 分岐より前に置く理由**: `--gate-list` でも分子は数える(AC-03/04 が `N of 451 gates matched` を要求する)。

---

## 4. `--gate-list` の実現方式

### 4.1 「fn を呼ばずに名を集める」矛盾の解き方

矛盾に見えるのは「名前一覧を作るには全部走らせねばならない」と思うからである。実際は違う。

**`test(name, fn)` は `name` を第一引数として受け取る。`fn` は第二引数である。**
`test()` が呼ばれた瞬間、名は既に手の中にある。`fn` を呼ぶかどうかは別問題である。

ゆえに `--gate-list` は**「トップレベルを最後まで実行し、`test()` の中で `fn` を呼ばずに `name` だけ吐く」**走行である。
`test(...)` の呼び出し自体は 449 回すべて起き(ループも展開され)、`fn` は 0 回呼ばれる。
これは静的解析ではない —— **実行時に `test()` が実際に受け取った名**である(FR-06 / 第16条)。

`test()` の中の実装は §3.2 のこの 1 行:

```js
if (GATE.list) { SAY(name + '\n'); return; }          // fn を呼ばない
```

### 4.2 トップレベルは必ず走る —— それは安全か(discover §1.4 の確認)

`--gate-list` でも**トップレベルのコードは 1 行残らず走る**。節見出しの `console.log`、`mkdtempSync`、20 数本の `require` である。
discover §1.4 はこれを「準備コストは事実上ゼロ、子プロセスもブラウザも常駐サーバも起きない」と報告した。
**design 相はこれを机上で信じず、実際に走らせて確かめた。**

実験(`%LOCALAPPDATA%\Temp\paradise-gate-design\collect.js`)は、ディスク上のファイルを一切書き換えず、
メモリ上で `function test(name, fn) {` の直後に `global.__NAMES.push(name); return;` を挿して `Module._compile` した
(discover が使ったのと同じ手口)。実出力:

```
ELAPSED_MS=23
COLLECTED=449
DUPLICATES=0
EXIT_SEEN=0
LOGLINES=34
SECTION_HEADINGS=33
DASHBOARD_COUNT_KEI=8
LAST_LOG="\nParadise self-test: 0 passed, 0 failed"
CHECKMARKS=0

real    0m0.074s
```

**この一回の実行が、以下をすべて実証した**:

| 確かめたこと | 証拠 |
|---|---|
| **危険な副作用が無い** | ブラウザは起きなかった。常駐サーバも上がらなかった。プロセスは自力で終わった。`real 0m0.074s` —— Atlas の 341.5 秒はどこにも現れない |
| **NFR-06(3 秒未満)は余裕で達成可能** | **74 ms**。要求の **1/40**。`node` の起動代込みの実時間である |
| **AC-09(3 秒未満)も同じ** | 同上 |
| **AC-07 の 449** | `COLLECTED=449`。静的な `test(` は 442。**7 本の差が実行時に埋まることを実測した** |
| **AC-08 の 8** | `DASHBOARD_COUNT_KEI=8`。2694 行のループが展開されている |
| **名前の一意性** | `DUPLICATES=0`。FR-01 が「名前だけで一意に狙える」と言った前提が保たれている |
| **`fn` が 0 回呼ばれた** | `CHECKMARKS=0`(`✓` が 1 行も出ていない) |
| **節見出しは 33 行出る** | `SECTION_HEADINGS=33`。**これが §4.3 の問題を生む** |

註: `LAST_LOG` が `Paradise self-test: 0 passed, 0 failed` なのは、この実験が総括行の出し分け(§5)を実装していない
生の計測器だからである。本設計ではここが `Paradise gate list: 451 gates` になる。

### 4.3 節見出しの扱い —— **黙らせる**

実測が示したとおり `--gate-list` でも節見出しが **33 行**出る。これを放置すると:

- **AC-03 が破れる**。AC-03 は「並ぶ名が**すべて** `gauge(故障注入): ` で始まる」ことを要求する。
  節見出し(`Graph engine:` 等)が混ざれば、この AC は赤になる
- 一覧を `--gate` に食わせて使う道具立てが壊れる

**決定: `--gate-list` のとき、`console.log` を no-op に差し替える。名は `process.stdout.write` で直接吐く。**

```js
const SAY = process.stdout.write.bind(process.stdout);
if (GATE.list) console.log = () => {};
```

**この方式を選んだ理由**:

- **NFR-04 を守れる唯一の手**。33 個の `console.log('…:')` を `if (!GATE.list) console.log(…)` に書き換えれば
  33 行の門の本文外コードを触ることになり、局所性の約束が崩れる。**1 行の差し替えで 33 箇所を制する**
- 差し替えは絞り込み塊の中(18/19 行の間)で起きる。最初の節見出しは 26 行 —— **間に合う**。これが塊の置き場所を決めた理由の一つ
- `SAY` を先に束縛するのは、`console.log` の差し替えが `process.stdout.write` に影響しないことを明示するため
- **`--gate-list` のときにしか起きない**。引数なし走行では `console.log` は素のまま(NFR-02)
- `console.error` は触らない。ゆえに真の異常は依然として見える

**副作用として塞がるもの**: 8215 行の総括行 `console.log(...)` も黙る。ゆえに `--gate-list` の名乗りは
`SAY` で出さねばならない(§5.2)。**これは事故ではなく設計である** —— `--gate-list` 走行が
`Paradise self-test:` を口走る可能性が構造的に消える(AC-13 の補強)。

### 4.4 `--gate-list` の出力形

```
<門の名 1>
<門の名 2>
…
Paradise gate list: 451 gates                        ← 絞り込み併用なし
Paradise gate list: 11 of 451 gates matched          ← --gate / --gate-not 併用時
Paradise gate list: 0 of 451 gates matched — nothing was measured   ← 0 件(exit 2)
```

註: `Paradise gate list: 451 gates` の分母無し書式は AC-07(:350)が
「正確に `Paradise gate list: 449 gates`」と定めたものであり、**絞り込みが無いときは分子=分母だから母数の明示が要らない**。
併用時は AC-03(:323)が `N of 449 gates matched` を定める。**二つの書式を使い分けるのは specify の指定どおりである。**

---

## 5. 総括行の出し分けと exit code

### 5.1 分岐の場所

**`tests/paradise.test.js:8214-8218` の「report」ブロック 1 箇所のみ。**現行:

```js
// --- report ---
console.log(`\nParadise self-test: ${pass} passed, ${fail} failed`);
try { fs.rmSync(kgRoot, { recursive: true, force: true }); } catch {}
try { fs.rmSync(ccRoot, { recursive: true, force: true }); } catch {}
process.exit(fail === 0 ? 0 : 1);
```

**改修後(実際に書ける形)**:

```js
// --- report ---
// 名乗りは三者に消費される契約である (census.js:55 / tribunal.yml:306 / 人間)。
// 局所走行は決して `Paradise self-test:` を名乗らない。`passed` / `failed` の語も
// 一切用いない —— census.js:57 の保険経路(matchAll)まで塞ぐため (requirements FR-05)。
if (!GATE.active) {
  console.log(`\nParadise self-test: ${pass} passed, ${fail} failed`);
} else if (GATE.matched === 0) {
  SAY(`Paradise gate list: 0 of ${GATE.total} gates matched — nothing was measured\n`);
} else if (GATE.list) {
  SAY(GATE.matched === GATE.total
    ? `Paradise gate list: ${GATE.total} gates\n`
    : `Paradise gate list: ${GATE.matched} of ${GATE.total} gates matched\n`);
} else {
  SAY(`Paradise gate-filter: ${GATE.matched} of ${GATE.total} gates matched — ${pass} green, ${fail} red\n`);
}
try { fs.rmSync(kgRoot, { recursive: true, force: true }); } catch {}
try { fs.rmSync(ccRoot, { recursive: true, force: true }); } catch {}
process.exit(!GATE.active ? (fail === 0 ? 0 : 1)
  : GATE.matched === 0 ? 2
  : GATE.list ? 0
  : (fail === 0 ? 0 : 1));
```

**引数なし走行(`GATE.active === false`)は最初の枝に入り、現行と一字一句・exit code まで同一である**(FR-09 / AC-01)。
砂場の片付けは**全ての枝の後**に残る —— 局所走行でも `mkdtempSync` した砂場は消える。

**局所名乗りに `SAY`(= `process.stdout.write`)を使う理由**: `--gate-list` 時は `console.log` が no-op なので
`console.log` では何も出ない。`SAY` に統一すればモードによらず出る。改行は自前で付ける。

### 5.2 名乗りの一覧

| モード | 名乗り |
|---|---|
| 引数なし | `\nParadise self-test: ${pass} passed, ${fail} failed`(**現行のまま、先頭の空行込み**) |
| 絞り込み走行 | `Paradise gate-filter: ${matched} of ${total} gates matched — ${pass} green, ${fail} red` |
| `--gate-list`(絞り込み無し) | `Paradise gate list: ${total} gates` |
| `--gate-list`(絞り込み有り) | `Paradise gate list: ${matched} of ${total} gates matched` |
| マッチ 0 件(モード問わず) | `Paradise gate list: 0 of ${total} gates matched — nothing was measured` |
| 引数エラー | 名乗り無し。stderr に 1 行(§2.4) |

**区切り記号は EM ダッシュ `—`(U+2014)** である。AC-05(:338)・AC-11(:374)の原文がこれを使っている。
ハイフンや `--` に置き換えるな。

### 5.3 マッチ 0 件が `gate list` を名乗ることについて

`--gate 'zzz'`(list ではない)でも 0 件のとき `Paradise gate list: 0 of 451 gates matched — nothing was measured` を吐く。
語感としては `gate-filter:` の方が自然だが、**AC-11(requirements.md:374)が `Paradise gate list:` と明記している**。
**契約が語感に勝つ。原文どおりにする。**
意味づけとしても筋は通る —— 0 件マッチの走行は「何も測らなかった」のだから、それは走行ではなく**空の一覧**である。

### 5.4 exit code の決定表(入力の組合せ × マッチ件数 × 赤の有無)

| # | `--gate`/`--gate-not` | `--gate-list` | 引数エラー | matched | red(`fail`) | **exit** | 出力先 | 名乗り |
|--:|---|---|---|---:|---:|---:|---|---|
| 1 | 無 | 無 | 無 | 451(全件) | 0 | **0** | stdout | `Paradise self-test: 451 passed, 0 failed` |
| 2 | 無 | 無 | 無 | 451(全件) | >0 | **1** | stdout | `Paradise self-test: 451 passed, N failed` |
| 3 | 有 | 無 | 無 | >0 | 0 | **0** | stdout | `Paradise gate-filter: M of 451 … M green, 0 red` |
| 4 | 有 | 無 | 無 | >0 | >0 | **1** | stdout | `Paradise gate-filter: M of 451 … G green, R red` |
| 5 | 有 | 無 | 無 | **0** | — | **2** | stdout | `Paradise gate list: 0 of 451 … nothing was measured` |
| 6 | 無 | 有 | 無 | 451 | —(fn 未実行) | **0** | stdout | `Paradise gate list: 451 gates` |
| 7 | 有 | 有 | 無 | >0 | — | **0** | stdout | `Paradise gate list: M of 451 gates matched` |
| 8 | 有 | 有 | 無 | **0** | — | **2** | stdout | `Paradise gate list: 0 of 451 … nothing was measured` |
| 9 | 任意 | 任意 | **有** | —(走らない) | — | **2** | **stderr** | 名乗り無し。§2.4 の 1 行のみ |

**読み方の要点**:

- **exit 1 は「測って落ちた」にのみ与える**(行 2・4)。現行の `:8218` と同じ意味
- **exit 2 は「測らなかった」に与える**(行 5・8・9)。0 件マッチも引数エラーも「一本も assert していない走行」であり、
  第16条が名指す「何も assert しない証拠」である
- **行 6/7 が exit 0 なのは、`--gate-list` が「測る走行」ではなく「一覧を出す走行」だから**。
  一覧が空でないなら、その仕事は完遂されている
- **行 9 は stdout に 1 バイトも書かない** —— AC-12 が要求する「`✓` を含む行が 0 行」、
  AC-18 が要求する「`✓` を含む行が 0 行」を、**引数解釈が 18 行目で `process.exit(2)` することで構造的に保証する**
  (最初の `test()` は 31 行目)
- 行 1–4 の `pass` / `fail` は現行のカウンタそのままである。**局所走行では `pass` を `green`、`fail` を `red` と呼び直すだけ**であり、二重帳簿を作らない

### 5.5 名乗りが三者に読まれないことの再確認(AC-14)

局所名乗り `Paradise gate-filter: 1 of 451 gates matched — 1 green, 0 red` を、四つの消費者の実物と突き合わせる:

| 消費者 | 実物 | 結果 |
|---|---|---|
| `census.js:55` | `/Paradise self-test:\s*([0-9]+) passed, ([0-9]+) failed/` | **不一致**。`Paradise self-test:` を含まない |
| `census.js:57` | `/([0-9]+) passed, ([0-9]+) failed/g` | **不一致**。`passed` / `failed` の語が一つも無い |
| `tribunal.yml:307` | `grep -oE '[0-9]+ passed'` | **不一致** → `|| echo 0` で `PASSED=0` |
| `tribunal.yml:308` | `grep -oE '[0-9]+ failed'` | **不一致** → `FAILED=0` |

`Paradise gate list: …` の三形も同様に `passed` / `failed` を含まない。
**`nothing was measured` に至っては数字が `0 of 451` の 2 個だけで、いずれも `passed`/`failed` を伴わない。**

fail-safe の確認: 万一 CI が絞り込み付きで呼ばれても `tests.total = 0 + 0 = 0` になり、
`verdict.js` は SHIP を主張できない。**騙されないより一段強い。**

---

## 6. AC-16 / AC-17 —— 新しい門 2 本の設計

### 6.1 置き場所

**`tests/paradise.test.js:8213` と `8214`(`// --- report ---`)の間**に、新しい節として置く:

```js
// --- gate-filter: 絞り込みの口が掟を破らないことを、自己診断が自分で見張る (第16条 / 第22条) ---
console.log('\n門の絞り込み (gate-filter / 第22条):');
test('gate-filter: 絞り込みは環境変数を読まない', () => { /* §6.3 */ });
test('gate-filter: census は自己診断を素で呼ぶ', () => { /* §6.4 */ });
```

置き場所の根拠:

- **最後尾に置く**ことで、既存 449 本の**順序が一つも動かない**(NFR-02)
- 節見出し 1 行 + `✓` 2 行 = stdout に **3 行**追加。§1.4 で NFR-02/08 を書き直した範囲に収まる
- **絞り込み塊の外**に置くので、これらの門が自分の本文に `process.env` や `graph/census.js` の文字列を持っていても AC-16 の門は誤爆しない

門の名は AC-16(:418)・AC-17(:427)の原文と**一字一句同一**:
`gate-filter: 絞り込みは環境変数を読まない` / `gate-filter: census は自己診断を素で呼ぶ`。

### 6.2 「絞り込み塊」の範囲を機械にどう教えるか —— マーカーコメントの対

**行頭に置く 1 対のマーカーコメント**で範囲を宣言する(§3.2 に既に書いてある):

```
// >>> gate-filter: 絞り込み塊 ここから  (AC-16 の門がこの対を読む — 対を消すな)
…
// <<< gate-filter: 絞り込み塊 ここまで  (AC-16 の門がこの対を読む — 対を消すな)
```

**この対が脆くならないための四つの縛り**(これが無いと門が門にならない):

1. **行頭アンカーで探す**(`^` + `m` フラグ)。門の本文の中に現れる文字列リテラルは必ずインデントされているので当たらない
2. **門の本文にマーカーの完全形を書かない**。門の中では
   `const MS = '// >>>' + ' gate-filter: 絞り込み塊 ここから';` のように**分割して組み立てる**。
   こうすれば門のソース自体がマーカーの偽物になり得ない(1 の保険の保険)
3. **出現回数を 1 個ずつに固定する**。`ss.length === 1` / `ee.length === 1` を assert。
   マーカーを増やして塊を分割し、`process.env` を対の外に逃がす攻撃を塞ぐ
4. **塊が痩せていないことを assert する**。`start < end`、塊が `function test(name, fn)` を含む、
   塊が `--gate-list` を含む、塊の長さが 400 字超。
   **マーカーを `test()` の直前まで縮めて「塊は空です」と言い張る抜け道を塞ぐ**

### 6.3 AC-16 の門の本文(実際に書ける形)

```js
test('gate-filter: 絞り込みは環境変数を読まない', () => {
  // 第22条: census.js:90 は自己診断を素で呼び env を丸ごと継承する。
  // ゆえに絞り込みが env を読めば、census が絞り込み後の数を README に持ち込む。
  // マーカーの完全形をこの門の本文に書かない — 自分自身が偽のマーカーにならないため。
  const MS = '// >>>' + ' gate-filter: 絞り込み塊 ここから';
  const ME = '// <<<' + ' gate-filter: 絞り込み塊 ここまで';
  const src = fs.readFileSync(__filename, 'utf8');
  const at = (m) => {
    const re = new RegExp('^' + m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gm');
    return [...src.matchAll(re)];
  };
  const ss = at(MS), ee = at(ME);
  assert.strictEqual(ss.length, 1, `開始マーカーが ${ss.length} 個ある — 塊の境が曖昧では門にならない`);
  assert.strictEqual(ee.length, 1, `終了マーカーが ${ee.length} 個ある — 同上`);
  assert.ok(ss[0].index < ee[0].index, '絞り込み塊のマーカーが前後逆になっている');
  const block = src.slice(ss[0].index, ee[0].index);
  // 塊が痩せていないことを確かめる — 空の塊なら env が 0 件なのは当たり前で、門ではない (第16条)
  assert.ok(/function test\(name, fn\)/.test(block), '絞り込み塊が test() を含んでいない — マーカーが縮んだ');
  assert.ok(/--gate-list/.test(block), '絞り込み塊が引数解釈を含んでいない — マーカーが縮んだ');
  assert.ok(block.length > 400, `絞り込み塊が ${block.length} 字しか無い — 実質を持たない塊は門にならない`);
  // 本題
  const hits = block.match(/process\.env/g) || [];
  assert.strictEqual(hits.length, 0,
    `絞り込み塊が process.env を ${hits.length} 箇所読んでいる — census が env を継承する以上これは第22条違反`);
});
```

**実験で確かめた**(`%LOCALAPPDATA%\Temp\paradise-gate-design\gates.js`、模擬ソースに当てた実出力):

```
--- AC-16 gate body against a simulated marked file ---
AC-16 GATE (clean): GREEN, block=658 chars
MUTANT env -> RED: 絞り込み塊が process.env を 1 箇所読んでいる
MUTANT shrink -> RED: 塊が test\(\) を含んでいない
```

**緑になること・二種類の壊し方で赤くなることを、実物のコードで確かめた。**
特に「マーカーを縮めて塊を空にする」攻撃(MUTANT shrink)が塞がれていることを実測した。
また、模擬ソースには**インデントされたマーカー文字列リテラル**をわざと置いたが、行頭アンカーにより誤検出は起きなかった。

### 6.4 AC-17 の門の本文(実際に書ける形)

```js
test('gate-filter: census は自己診断を素で呼ぶ', () => {
  // graph/census.js:90 が自己診断を起こす唯一の呼び口。引数配列はスクリプトパス 1 個のみ。
  // 将来ここに '--gate' が足されたら、census が測る数は「全走の数」でなくなる (第22条)。
  const src = fs.readFileSync(path.join(DIR, '..', 'graph', 'census.js'), 'utf8');
  const calls = [...src.matchAll(/execFileSync\(\s*process\.execPath\s*,\s*\[([\s\S]*?)\]\s*,/g)];
  assert.strictEqual(calls.length, 1,
    `census.js の自己診断呼び口が ${calls.length} 箇所ある — 一箇所を見張っても意味が無い`);
  const argsSrc = calls[0][1];
  assert.ok(/paradise\.test\.js/.test(argsSrc), `census.js の呼び口が paradise.test.js を指していない: ${argsSrc}`);
  // トップレベルのカンマを数える = 引数の個数。入れ子の path.join(...) のカンマを数えないため。
  let depth = 0, arity = argsSrc.trim() ? 1 : 0;
  for (const ch of argsSrc) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) arity++;
  }
  assert.strictEqual(arity, 1,
    `census.js が自己診断に ${arity} 個の引数を渡している — 絞り込みが census に漏れ込んでいる (第22条): ${argsSrc}`);
});
```

**なぜ「トップレベルのカンマを数える」のか**: 実物の引数配列は
`[path.join(ROOT, 'tests', 'paradise.test.js')]` である。素朴に `split(',')` すれば **3** と数えて偽の赤を出す。
`path.join` の内側のカンマは括弧の中にある。**深さ 0 のカンマだけを数えることで、実物に対して正しく 1 を返す。**

**実験で確かめた**(**模擬ではなく実物の `graph/census.js` に当てた**実出力):

```
--- AC-17 gate body against real graph/census.js ---
ARGS_SRC="path.join(ROOT, 'tests', 'paradise.test.js')"
ARITY=1
AC-17 GATE: GREEN
MUTANT ARITY=3 (期待: 3 = 赤)
```

MUTANT は AC-17 の「壊し方」(requirements.md:432)がそのまま指定した変異 ——
`census.js:90` の配列に `'--gate', 'x'` を足す —— をメモリ上で当てたもの。**arity 3 を検出し赤くなる**ことを実測した。
**`graph/census.js` はディスク上で一文字も書き換えていない。**

### 6.5 新門 2 本の代(AC-22 への影響)

両門とも `fs.readFileSync` **2 回**(`paradise.test.js` 513KB + `census.js` 26KB)と正規表現数本のみ。
子プロセスもブラウザも起こさない。**数ミリ秒**であり、AC-22 の閾値 362.4 秒(前値 358.8 秒 +1.0% = 余裕 3.6 秒)に対して
無視できる。ゆえに **AC-22 の閾値は 362.4 秒のまま据え置く**(§1.4 の表)。

---

## 7. prove 相への引き継ぎ —— 実際に壊せる変異点

specify は各 AC に「壊し方」を散文で一行書いた。design はそれを**実装後のソース上の具体の変異**に落とす。
prove 相の神官はこの表の「変異」列を**その通りに一行書き換えて**走らせ、「期待」列の赤を確かめよ。

| AC | 変異する場所 | 変異(この行をこう書き換える) | 期待(赤くなり方) |
|---|---|---|---|
| **AC-01** | `test()` | `if (GATE.active && !GATE.wants(name)) return;` → `if (!GATE.wants(name)) return;` かつ `wants` を `return false` 固定 | `0 passed` になる。**より安い変異**: `wants()` の最終 `return true` を `return false` に |
| **AC-02** | `wants()` | `INC.some(re => re.test(name))` → `INC.some(re => re.source === name)` | 0 件マッチ → `EXIT=2` |
| **AC-03** | 塊のコンパイル部 | `new RegExp(p)` → `{ test: (n) => n.includes(p) }` | `^` が文字通り扱われ 0 件 → `EXIT=2` |
| **AC-04** | `wants()` | 2 行を入れ替え、`if (EXC.some(...)) return false;` を `INC` 判定の前へ移し、かつ `INC` マッチ時に `return true` を先行させる | `描画器が実際に受理する` の行が一覧に現れる |
| **AC-05** | `wants()` | `if (EXC.some(re => re.test(name))) return false;` の行を削除 | Atlas 2 本が走り、所要が 350 秒超に戻る |
| **AC-06** | `wants()` | `INC.some(...)` → `INC.every(...)` | AND になり 0 件 → `EXIT=2` |
| **AC-07** | `test()` | `GATE.total++` を `test()` の外へ出し、代わりに冒頭で `GATE.total = (src.match(/^test\(/gm)||[]).length` の静的解析にする | `Paradise gate list: 442 gates` になる |
| **AC-08** | 同上 | 同上(静的解析) | `grep -c '^dashboard-count 系: '` が `1` を返す |
| **AC-09** | `test()` | `if (GATE.list) { SAY(name + '\n'); return; }` → `if (GATE.list) { try { fn(); } catch {} SAY(name + '\n'); return; }` | 358 秒超になり 3 秒の閾値で赤 |
| **AC-10** | report ブロック | `process.exit(... : (fail === 0 ? 0 : 1))` の最終項を `: 0` に固定 | 赤があっても `EXIT=0` |
| **AC-11** | report ブロック | `GATE.matched === 0 ? 2` → `GATE.matched === 0 ? 0` | 業界既定に堕ちる。`EXIT=0` |
| **AC-12** | 塊の `comp()` | `catch (e) { die(...) }` → `catch (e) { return /(?:)/; }` | 全走に落ち `✓` が 451 行出る |
| **AC-13** | report ブロック | `if (!GATE.active)` → `if (true)` | 局所走行が `Paradise self-test:` を名乗る |
| **AC-14** | report ブロック | 局所名乗りの `green` / `red` を `passed` / `failed` に戻す | `census.js:57` と `tribunal.yml:307/308` が拾い、grep が `1` を返す |
| **AC-15** | 塊 | `const argv = process.argv.slice(2);` → `const argv = (process.env.PARADISE_GATE ? ['--gate', process.env.PARADISE_GATE] : []).concat(process.argv.slice(2));` | census が `{"passed":0,…}` あるいは `null` を返す。**同時に AC-16 も赤くなる**(二重の網が効いている証拠) |
| **AC-16** | 塊 | 塊の中に `const _ = process.env.PARADISE_GATE;` を 1 行足す | `絞り込み塊が process.env を 1 箇所読んでいる`(実験で実測済み・§6.3) |
| **AC-16(第二の壊し方)** | マーカー | 開始マーカーを `test()` の直前まで下げる | `絞り込み塊が引数解釈を含んでいない — マーカーが縮んだ`(実験で実測済み) |
| **AC-17** | `graph/census.js:90` | `[path.join(ROOT, 'tests', 'paradise.test.js')]` → `[path.join(ROOT, 'tests', 'paradise.test.js'), '--gate', 'x']` | `census.js が自己診断に 3 個の引数を渡している`(実験で arity=3 を実測済み・§6.4) |
| **AC-18** | 塊のループ末尾 | `die(\`…unknown flag ${a}\`)` → `continue;` | 449+2 本が 6 分走り `EXIT=0` |
| **AC-19** | 塊の値検査 | `if (v === undefined \|\| v === '' \|\| /^--/.test(v))` → `if (false)` | `new RegExp(undefined)` = `/(?:)/` で全件マッチ。`EXIT=0` かつメッセージが出ない |
| **AC-20** | 同上 | `v === ''` の項だけ削除 | `new RegExp('')` が **449 件全部にマッチ**(§2.6 で実測)し `451 of 451 gates matched` が出る |
| **AC-21** | 塊 or report | `fs.writeFileSync(path.join(DIR,'..','README.md'), …)` を 1 行足す | 2 回目の `git diff --quiet README.md` が落ちる |
| **AC-22** | 塊 | `const INC = comp(inc), EXC = comp(exc);` を消し、`wants()` の中で毎回 `inc.map(p => new RegExp(p))` する | 451 回 × パターン数のコンパイル。閾値 362.4 秒に迫る |

**prove 相への註**:

- **AC-15 と AC-16 が同じ変異で同時に赤くなる**のは冗長ではなく**設計である**。
  AC-16 は静的(一瞬)、AC-15 は実経路(6 分)。**安い門が先に鳴り、高い門が事実で裏を取る**
- **AC-17 だけは `graph/census.js` を変異させる**。他はすべて `tests/paradise.test.js` の中。
  prove 相は変異のたびに `git checkout -- graph/census.js` を忘れるな
- **AC-05 / AC-22 は全走を伴う**(それぞれ 40 秒 / 6 分)。**background で走らせ、最後にまとめて回せ**

---

## 8. 実装の手順(build 相の神官へ)

**全走は 6 分。ゆえに安い検証を先に置く。歩 1〜9 は合計 1 分もかからない。全走は歩 10 で初めて払う。**

| # | 為すこと | 直後に走らせて確かめること |
|---:|---|---|
| **1** | ブランチ `feat/gate-filter` に居ることを確かめ、作業ツリーが `?? reform/gate-filter/` のみであることを確かめる | `git branch --show-current` → `feat/gate-filter`<br>`git status --porcelain` → `?? reform/gate-filter/` の 1 行のみ |
| **2** | **前値を保全する**。`node tests/paradise.test.js --gate-list` 相当の名一覧を実装前に取っておく。取り方は §4.2 の使い捨て計測器(`%LOCALAPPDATA%\Temp\paradise-gate-design\collect.js`)を再利用する | `COLLECTED=449` / `DUPLICATES=0` を確認し、`names.txt` を `%LOCALAPPDATA%\Temp` に保存。**歩 6 の差分照合に使う** |
| **3** | `tests/paradise.test.js` の **18 行と 19 行の間**に §3.2 の絞り込み塊(マーカー対込み)を挿す。`test()` を §3.2 の形に書き換える。**まだ report ブロックは触らない** | `node -c` 相当: `node --check tests/paradise.test.js`(**構文だけ・0.1 秒**)<br>`node tests/paradise.test.js --gates x; echo $?` → stderr に `Paradise gate-filter: unknown flag --gates`、`EXIT=2`(**AC-18 が既に緑になる**) |
| **4** | 引数エラー 4 経路を確かめる(まだ report は未改修だが、エラーは 18 行目で `exit(2)` するので独立に検められる) | `node tests/paradise.test.js --gate 2>&1; echo $?` → AC-19 の文字列 / 2<br>`node tests/paradise.test.js --gate '' 2>&1; echo $?` → AC-20 の文字列 / 2<br>`node tests/paradise.test.js --gate '[' 2>&1; echo $?` → AC-12 の文字列 / 2<br>いずれも `✓` が 0 行(`grep -c '✓'` が 0)。**各 0.1 秒** |
| **5** | **report ブロック(8214–8218)**を §5.1 の形に書き換える | `node --check tests/paradise.test.js`<br>`node tests/paradise.test.js --gate 'schedules a simple diamond'; echo $?` → `Paradise gate-filter: 1 of 449 gates matched — 1 green, 0 red` / `EXIT=0`(**まだ新門 2 本が無いので分母は 449。正しい**)。**1 秒未満** |
| **6** | `--gate-list` を確かめる | `time node tests/paradise.test.js --gate-list \| tail -1` → `Paradise gate list: 449 gates`、**3 秒未満**(AC-07/09)<br>`node tests/paradise.test.js --gate-list \| grep -c '^dashboard-count 系: '` → `8`(AC-08)<br>`node tests/paradise.test.js --gate-list > /tmp/now.txt; diff /tmp/now.txt "$LOCALAPPDATA/Temp/paradise-gate-design/names.txt"` → **差分ゼロ**(歩 2 の前値と一致 = 名を一つも取りこぼしていない)<br>`node tests/paradise.test.js --gate-list \| grep -c ':$'` → **節見出しが混ざっていないこと**(§4.3) |
| **7** | 悪い道と分岐を確かめる | `node tests/paradise.test.js --gate 'zzz-no-such-gate-zzz'; echo $?` → `Paradise gate list: 0 of 449 gates matched — nothing was measured` / `EXIT=2`(AC-11)<br>`node tests/paradise.test.js --gate '^gauge\(故障注入\): ' --gate-list \| tail -1` → `Paradise gate list: 11 of 449 gates matched`(AC-03。**11 は design が実測した数**)<br>`node tests/paradise.test.js --gate 'atlas:' --gate-not '描画器が実際に受理する' --gate-list \| grep -c '描画器が実際に受理する'` → `0`(AC-04)<br>`node tests/paradise.test.js --gate 'schedules a simple diamond' \| grep -c 'Paradise self-test'` → `0`(AC-13)<br>すべて 1 秒未満 |
| **8** | **AC-14 の四連 grep** を走らせる(requirements.md:392-399 の 4 行そのまま) | `0` が 4 行。**書式が三者に対して同時に安全であることの証明**。1 秒未満 |
| **9** | **AC-16 / AC-17 の門 2 本**を 8213/8214 の間に §6.1・§6.3・§6.4 のとおり足す | `node tests/paradise.test.js --gate 'gate-filter: '` → `✓` が 2 行、`Paradise gate-filter: 2 of 451 gates matched — 2 green, 0 red` / `EXIT=0`。**分母がここで 451 になる**(§1 の決着が実物で現れる瞬間)<br>`node tests/paradise.test.js --gate-list \| tail -1` → `Paradise gate list: 451 gates` |
| **10** | **AC-05(最初の顧客)を測る**。第38条の後値である | `time node tests/paradise.test.js --gate-not 'atlas: 全ての道が図になる' --gate-not 'atlas: 門は己の残骸で落ちない'; echo $?`<br>期待: `Paradise gate-filter: 449 of 451 gates matched — 449 green, 0 red` / `EXIT=0` / **40 秒未満**。<br>**語り方**: 「449 本を N 秒で測った(前: 449 本を 358.8 秒)」。「速くなった」と言うな |
| **11** | **引数なし全走**(AC-01 / AC-22)。**background で走らせよ** | `time node tests/paradise.test.js; echo $?` → 最終行 `Paradise self-test: 451 passed, 0 failed` / `EXIT=0` / **362.4 秒以下**。<br>ここで初めて 6 分を払う。歩 1–10 が緑なら、ここで初めて出る赤は既存 449 本への副作用だけである |
| **12** | **README を census に書かせる**(§1.5)。歩 11 が緑になってから | `node graph/census.js fix` → `✏️ README テスト数: 449/449 → 451/451` / `updated: README.md`<br>`node graph/census.js check` → `EXIT=0`<br>`git diff --stat README.md` → 1 行のみ<br>`git status --porcelain` → `M README.md` / `M tests/paradise.test.js` / `?? reform/gate-filter/` の **3 行だけ**(NFR-09: `graph/` は無傷) |

**歩の総数: 12。**

**歩 3–9 の合計実行時間は 10 秒に満たない。** 6 分の全走は歩 11 の一度だけである
(歩 12 の `census fix` が内部でもう一度全走するので、実質 2 回)。

**歩 2 の差分照合(歩 6)が本手順の要である** —— これが「絞り込みの導入が既存の門を一本も落としていない」ことを、
6 分を払わずに 1 秒で証明する。全走(歩 11)はその追認に過ぎない。

### 8.1 build 相が触ってよいファイル

| ファイル | 変更 |
|---|---|
| `tests/paradise.test.js` | 塊挿入(18/19 行の間)+ `test()` 書き換え(19–23)+ 新門 2 本と節見出し(8213/8214 の間)+ report ブロック(8214–8218)。**449 本の門の本文は一行も触らない** |
| `README.md` | **`census.js fix` にのみ書かせる**。手で開くな(NG-09) |
| `reform/gate-filter/requirements.md` | §1.3・§1.4 の表に従って AC-01 ほかの期待文字列と NFR-02/08 を書き直す。**これは矛盾の決着の記録であり、要件の改竄ではない** |
| `graph/` 配下 | **一行も触らない**(NFR-09)。AC-17 の変異は prove 相の一時的なものであり、必ず `git checkout` で戻す |
| `.github/workflows/tribunal.yml` | **触らない**(NG-08。CI は常に全走) |

---

## 9. 設計が満たしていない/持ち越すもの(正直に書く)

1. **AC-15(census を毒しても 451)は自己診断に常駐させない。** requirements.md:405 が既にそう決めている
   (全走 6 分を伴う門を自己診断に足せば本改革が自分の目的を裏切る)。**prove 相の手順として実行し、実出力を prove.md に貼れ。**
2. **`--gate-list` 時に `console.log` を差し替えることの副作用**: 万一トップレベルで例外が起きた場合、
   その手前の `console.log` は消える。`console.error` は無傷であり、例外そのものは stderr に出るので致命的ではない。
   だが**この事実を build 相は知っておくべき**である。
3. **NFR-04 は厳密には三箇所になる。** requirements.md:294 は「`test()` と引数解釈だけ」と書いたが、
   総括行の出し分け(FR-05)は 8214–8218 の改修を必然的に要求する。
   **FR-05 と NFR-04 の間の取りこぼしであり、本設計は「引数解釈塊 / `test()` / report ブロック」の三箇所と読み替える。**
   449 本の門の本文を一行も触らないという約束の核心は無傷である。
4. **委譲先 9 ファイル(子 92 本)には届かない**(FR-10 / NG-01)。設計上も届かせていない。
5. **節を単位にする絞り込みは作らない**(NG-02)。`--gate-list` の出力を人が読んで正規表現を組む道具立てが代わりを務める。

---

## 9.5 既知の限界(実装後・security 相が実測。設計として認める)

§9 は設計時点の持ち越しである。ここは**実装が動いた後に security 相が 451 本を全数掃射して
見つけた**もので、性質が違うので節を分ける。**塗らずに認める**という判断の記録である。

### 9.5.1 絞り込み走行は門の依存を保証しない(HIGH・本設計の最大の限界)

`test()` は絞り込みに外れた門で `return` する。**`fn()` が呼ばれない。**
ゆえに自前で状態を作らず、共有の `kgRoot`(`tests/paradise.test.js:150` の `mkdtempSync`)/
`ccRoot`(同 191 行)に**前段の門が書いた行を読む**門は、単独で撃つと
**全走では緑なのに赤くなる**。security 相の 451/451 掃射で**4 本**が該当した:

| # | 門の名 | 全走 | 単独走行 | 単独時の実エラー |
|---|---|---|---|---|
| 1 | `links nodes and shows neighbors` | ✓ | **✗ exit 1** | `out.includes('causes') && out.includes('rain')` が falsy |
| 2 | `snapshot surfaces hubs and survives reload` | ✓ | **✗ exit 1** | `snapshot should include known nodes` |
| 3 | `predict A returns B ranked appropriately` | ✓ | **✗ exit 1** | `B should rank first with 2 co-changes` |
| 4 | `lessons export recovers the scope so the lesson is not global` | ✓ | **✗ exit 1** | `the lesson exported` |

全走は `Paradise self-test: 451 passed, 0 failed`(exit 0)。この 4 本以外は全走と一致した。

**機序は前段の門を足すと緑に戻ることで確定した**(実測):

```
--gate 'links nodes and shows neighbors'                          → 0 green, 1 red  (exit 1)
--gate 'remembers and queries a node|links nodes and shows neighbors'
                                                                  → 2 green, 0 red  (exit 0)
```

**`--gate` は fn を呼ばないだけで、共有状態の生成順序までは面倒を見ない。**
これは実装の不具合ではなく、**絞り込みという機構が原理的に持つ限界**である。

#### なぜ設計として塗らないか

- **根治は 4 本の門を自己完結にすること**(各々が自分で `remember`/`observe` してから読む)。
  だが**それは gate-filter の仕事ではない** —— 本改革は既存の門の本文を一行も触らない
  という約束(§3.3 / NFR-02)の上に立っている。門を書き換えれば約束が崩れる。
- **機械での検出は代が高すぎる**: 451 本を単独走行させて全走と突き合わせる門は
  451 プロセス・20 分弱を要する(security 相の掃射の実績)。PR ごとに払える代ではない。
- 危険の向きは**偽陽性(緑→赤)**である。「赤いのに緑」ではないので、
  裁定が嘘の SHIP を出す経路にはならない。害は**道具への信頼が壊れること**に限られる。

#### 代わりに置いたもの(二重)

1. **口で名乗る**(実装 —— 総括行の直前に必ず出る。`tail -1` を壊さない位置):
   ```
   Paradise gate-filter: 注意 — 絞り込み走行は門の依存を保証しない。
   共有状態を前段の門に頼る門は単独走行で偽の赤を出しうる (security D-2)
   ```
   **文書より機械の出力の方が読まれる。**
2. **README の「門を絞る」節**に散文で写した(docs 相)。加えて
   **「緑」の根拠になるのは引数無しの全走だけ / CI に絞り込みを持ち込むな**を掟として書いた。

### 9.5.2 「`--gate` は常に速い」は嘘である

`atlas: 全ての道が図になる — 描画器が実際に受理する (第47条)` は
**単独走行でも 236.8 秒**かかる(exit 0 / 1 green, 0 red)。DoS ではなく素の重さである。
§10 の「歩 3–9 は合計 10 秒未満」は実装の歩の話であって、**任意の門に一般化できない**。
ゆえに README は「1 秒で回る」とは書かず、**Atlas 2 本を除いて 20 秒台**という
母数付きの一行だけを示す(第38条 —— 同じ母数で語れ)。

### 9.5.3 ReDoS(LOW・塗らない)

外部パターンを `new RegExp(p)` に渡し 451 本の名に当てる(実装 45–48 行)。
古典的な `(a+)+` 系は当たらない(日本語混じりの名は `a` の長い連続を持たない)が、
**`((.*)*)*zzzz` と `(\w+\s?)*Z` は 45 秒超でハングした**(実測)。
塗らない理由: **攻撃者はすでにローカルで node を実行できる立場にある**。
昇格も漏洩も起きず、影響は自端末が固まるだけで Ctrl-C で戻る。CI は引数なしで呼ぶ。
**「知っている脆さ」としてここに一行残す**のが代に見合う唯一の処置である。

---


## 10. 要約(神と教主のための一枚)

- **矛盾の決着**: 総数は **451** になる。**AC-01 の期待を `Paradise self-test: 451 passed, 0 failed` に書き直す。**
  449 は契約された定数ではなく census が測った事実である(第22条)。門を削って数を守るのは本末転倒。
  `449` を含む他の AC も §1.4 の表で一括して書き直す(**AC-05 だけは分子も 447 → 449 に動く**)。
  README は `node graph/census.js fix` に書かせる(NG-09)。追跡ファイル中の `449` は `README.md:138` の 1 箇所だけであることを確認済み。
- **口**: `--gate` / `--gate-not` / `--gate-list`。**環境変数は一つも作らない**。
  エラー 5 経路すべて exit 2、メッセージは AC-12/18/19/20 の原文と**一字一句一致することを雛形の実出力で確かめた**。
- **`--gate-list`**: `test(name, fn)` は名を第一引数で受け取る。`fn` を呼ばずに `name` を吐くだけ。
  トップレベルは全部走るが、**実測 74 ms**(ブラウザも常駐サーバも起きない)。節見出しは `console.log` の 1 行差し替えで黙らせる。
- **exit**: 引数なしは現行のまま(0/1)。局所走行は 0/1。**マッチ 0 件と引数エラーは 2**(業界 4/4 と袂を分かつ地点)。
- **新門 2 本**: マーカーコメントの対で「絞り込み塊」を機械に教える。
  **塊が痩せる攻撃・マーカーを増やす攻撃・自分自身が偽マーカーになる事故**の三つを塞いだ。**両門とも実物/模擬で緑と赤の両方を実測した。**
- **実装の歩数: 12**。6 分の全走は歩 11 の一度だけ。歩 3–9 は合計 10 秒未満。

---

## 付録 A. design 相の使い捨て実験(git 外)

| ファイル | 何を測ったか |
|---|---|
| `%LOCALAPPDATA%\Temp\paradise-gate-design\collect.js` | `fn` を呼ばない走行の所要と収集本数。ディスクは書き換えずメモリ上で `Module._compile` |
| `…\names.txt` | 実行時に集めた **449 本の実名**(歩 2/6 の差分照合に使える) |
| `…\logs.txt` | 同走行の `console.log` 34 行(節見出し 33 + 総括 1) |
| `…\probe.js` | AC の各パターンを実名 449 本に当てた件数。`new RegExp('')` / `new RegExp(undefined)` の振る舞い |
| `…\gates.js` | 引数解釈の雛形の全経路、AC-16 の門(模擬ソース + 2 変異)、AC-17 の門(**実物の `graph/census.js`** + 1 変異) |

**すべて `%LOCALAPPDATA%\Temp` 内。git 作業ツリーは `?? reform/gate-filter/` のみ。
`tests/paradise.test.js` も `graph/census.js` も `README.md` も一文字も書き換えていない。全走は走らせていない。**
