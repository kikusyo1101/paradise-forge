# 畳みの機構 — review 相(敵対的コードレビュー)

**相**: review / **枝**: `reform/gate-fold` / **基点**: prove 相の `56bad0b`
**対象**: `git diff 6641e3b..HEAD -- graph/ tests/ .github/ .gitignore`(2,425 挿入 / 32 削除 / 8 現物)
**測定機**: Windows 11 + git-bash, node v24.14.0(ローカル)
**審査官の職**: **実装を直さない。** 欠陥を名指し、重みを付け、根拠を掟の条番号か実測で示す。

> **この文書の掟**: 生コマンド出力か行番号の無い断定を書かない。
> **撃てなかったものは「撃てなかった」と書く**(第37条)。

---

## 0. 結論(先に述べる)

| 重み | 件数 | 表題 |
|---|---:|---|
| **BLOCK** | **1** | **CI の `📒 Fold` 段は、いま撃てば 7 門が赤い**(F-1) |
| **HIGH** | **3** | census の畳みが `ledger-unreadable` を黙殺(F-2)/ `--no-fold` の atlas が名乗らない(F-3)/ 鍵の走査が深さ 6 で黙って切れる(F-4) |
| **MEDIUM** | **8** | F-5 〜 F-11 / **F-15**(`--all-scales` の総括が第22条に反する) |
| **LOW** | **4** | F-12 / F-13 / F-14 / F-16 |

**AC-11 の中核(72 → 32 検査)は、本相の実走で初めて確かめた** —— prove 相の残債 R-4 の解消:

```
$ node graph/atlas.js check --all-scales
Atlas inspect: Executed 32 out of 72 inspections (40 reused)
EXIT=0    real 2m20.104s
```

**requirements AC-11 が要求した `Executed 32 out of 72 inspections (40 reused)` と一字一句一致した。**

**残債 R-1(`closed()`)の裁定: 消せ。**(§1。重み **MEDIUM**)
**第57条違反(既存の門の緩和)は、一件も見つからなかった。**(§2。何を見てそう言ったかを §2.3 に列挙する)

> **最重の欠陥 F-1 は、prove 相が自分で「未測定」と名を付けた残債 R-3 の中に在った。**
> prove.md §4 R-3:「①拡げた鍵が CI で畳みを殺さないか ②`📒 Fold` 段が新しい 6 門を実際に走らせるか
> は**未測定である。緑と呼ばない**」。**本相はその②をローカルで再現して撃ち、赤を出した。**

---

## 1. 残債 R-1 の裁定 — **`closed()` は消せ**(MEDIUM)

### 1.1 呼び手を実際に数えた

```
$ grep -rn "\.closed()" --include=*.js . | grep -v node_modules | grep -v "^./reform/"
./graph/fold.js:537:     * **誰も呼んでいなかったからである**(`grep -rn '\.closed()'` の答えが 0 件)。
./tests/fold.test.js:407:     * 実測: `inspected().closed()` を `return true` に潰しても**一本も鳴らなかった**。
./tests/fold.test.js:409:     * (`grep -rn '.closed()'` の答えが 0 件)。
./tests/fold.test.js:421:    assert.strictEqual(seen.closed(), true, 'closed() が健全な写像で偽を返した');
```

**註釈を除いた実の呼び手は 1 件である** —— `tests/fold.test.js:421`。
**prove.md §4 の「呼び手が 0 件のまま残っている」という自白は、硬化後の現物と食い違う**
(硬化のときに自分で 1 件足した)。記録の側の小さな腐りであり、これ自体が第38条の対象である。

### 1.2 その 1 件は「常に緑」である

`graph/fold.js:549`:

```js
closed() { return true; },
```

`tests/fold.test.js:421` はその `true` を `true` と照合している。
**入力に依らず必ず通る。** 第48条 c が名指す形そのものである:

> **常に緑の門は門ではない。**

prove.md §2.3 の観測「M-07(`closed()` を `return true` に潰す変異)は硬化後も無音である」は、
**この構造から論理的に必然である** —— 既に `return true` なのだから、`return true` に潰しても何も変わらない。
無音は「門が見落とした」のではなく、**「見るべきものが存在しない」**。

### 1.3 裁定: **消せ**(`graph/fold.js:548-549` と `tests/fold.test.js:421`)

三つの道(残す / 呼ぶ門を建てる / 消す)を掟に照らす:

| 道 | 掟による裁き |
|---|---|
| **残債のまま残す** | **不可。** 第48条 c に真正面から当たる。加えてより危険なのは、**この口が「錠」と名乗っていること**(`fold.js:548` の註釈:「**恒等式の錠は畳みの関数の外に立つ**(AC-15)」)。次の走行の誰かが「錠は二つある」と読み、`tally()` の**本物の錠**を外して `closed()` を残しうる。**飾りが本物を殺す**形が既に仕込まれている。 |
| **`closed()` を呼ぶ門を建てる** | **不可。** 呼ぶ門を建てても、`closed()` が `return true` である限り門は常に緑である。意味のある門にするには `closed()` の中身を `executed + reused === total` にせねばならない —— **それは `tally()` の錠と同じ式の二重化**であり、第48条 /第58条の「住処が二つ在れば真が二通りに割れる」に当たる。**二つの錠は、片方が緩んだ日に嘘をつく。** |
| **消す** | **可。** AC-15 の要求「錠は畳みの関数の外に立つ」は **`tally()` が既に満たしている**。しかもそれは**測定されている**: `tests/fold.test.js:423-425` が `tally()` の中の恒等式をソースで凍らせ、`fold.test.js:428-436` が錠を抜く変異を撃って鳴らす(prove M-07b)。**文面と実体を合わせるべきは、実体ではなく文面の側である。** |

**具体的にこう直せ:**

1. `graph/fold.js:548-549` の 2 行(註釈行 + `closed() { return true; },`)を削る。
2. `tests/fold.test.js:421` の `assert.strictEqual(seen.closed(), true, …)` を削る
   (常に緑の assert であり、消しても門の歯は一本も欠けない)。
3. `reform/gate-fold/requirements.md` AC-15 の文面「この錠は**畳みを司る関数の外側**に置かれる」を
   **「この錠は数が読まれる口(`tally()`)の上に置かれ、畳みの判断関数を通らない」**へ寄せる。
   —— **第57条に注意せよ**: これは要件の文面を実装に合わせる修正であって、
   **裁く強さを一切下げてはならない**。`tally()` の錠を撃つ門(prove M-07b)は残す。

> ⚠️ **`inspected()` そのものは消してはならない。** `graph/atlas.js:1421` / `1522` /
> `graph/fold.js` 内部 / `tests/fold.test.js` の 4 箇所が現に呼んでいる
> (`grep -rn "fold\.[a-zA-Z]*(" graph/ tests/` の実測: `inspected` → 7 件)。
> 消すのは `closed()` の 1 メソッドだけである。

---

## 2. 第57条の検査 — **既存の門は一本も緩んでいない**

> **第57条: 修理は掟を広げるな。**

### 2.1 `tests/paradise.test.js` の削除行を**全数**で数えた

```
$ git diff 6641e3b..HEAD -- tests/paradise.test.js | grep -c "^-"
(ヘッダを除いて 4 行)
```

削除された 4 行と、その置換先:

| # | 削除行 | 置換先 | 裁定 |
|---|---|---|---|
| 1 | `let list = false;` | `let list = false, noFold = false;` | **追加のみ。**旗の受理が 1 個増えた |
| 2 | `list,` | `list, noFold,` | **追加のみ** |
| 3 | `const res = census.check({ runTests: true, testTimeoutMs: 1 });` | `… testTimeoutMs: 1, noFold: true });` | **§2.2 で個別に裁く** |
| 4 | `console.log(\`\nParadise self-test: …\`)` | `const summary = …; console.log(\`\n${summary}\`)` | **綴りは一字も変わらない**(変数に括り出しただけ)。実測で確認:`Paradise self-test: 500 passed, 0 failed` |

**条件の転ばし(`===`→`==`、`&&`→`||`、`!`の脱落)は 0 件。**
**assert の削除は 0 件。** **除外(`--gate-not` / skip / early-return)の追加は 0 件。**

### 2.2 唯一の「除外を足した」箇所 — `tests/paradise.test.js:2983`(**MEDIUM / F-5**)

```js
const res = census.check({ runTests: true, testTimeoutMs: 1, noFold: true });   // 必ず打ち切られる
```

**門の掟は広がっていない。** `noFold: true` は門を緩めるのではなく、
**門が測りたい経路(打ち切り)を名指しで開けている** —— 註釈がその理由を正しく書いている:

> 畳みが効けば子プロセスは起きず、領収書の総括行が返るので**打ち切りが起きない**。

**だが第57条ではなく第37条の側に、名指すべき影が一つ残る。**

**CI の Census 段は畳む。**(`tribunal.yml:131-137` に `PARADISE_FOLD_LEDGER` が在り `--no-fold` は無い)
ゆえに **CI では `census.js:154-163` の打ち切り処理(`catch` で `tests = summaryOf(部分出力)` → `null`)を
一度も通らない。** 改修前はここが CI で毎回通っていた。

- これは**掟の緩和ではない**(門は `noFold: true` でその経路を今も撃つ)。
- だが**射程の縮小である**: 「本物の CI で本物の打ち切りが起きたとき、census が正しく `null` を返すか」は
  改修後の CI では**永久に測られない**。第37条の言う「まだ誰も落ちていない穴」である。

**こう直せ**(重み MEDIUM、BLOCK ではない):
`reform/gate-fold/` の申し送りに **R-5「畳んだ Census は打ち切り経路を CI で通らない」**として名を与えよ。
門を足すなら `tests/fold.test.js` に **「畳んだ census も、領収書が `exit: null` なら `truncated` で全走する」**
を撃つ門が要る(`fold.js:463` が既にその枝を持つが、**census 経路は `decide()` を通らない** —— §3.2 F-2 参照)。

### 2.3 **「指摘が無い」と言うために何を見たか**(第37条)

本節で「緩和は 0 件」と断じた根拠は以下の全数走査である。見なかったものは緑と呼ばない:

1. `git diff 6641e3b..HEAD -- tests/paradise.test.js`(439 行)の**削除行を 1 行ずつ**目視(上表)。
2. `graph/census.js` / `graph/atlas.js` / `graph/abode.js` / `.gitignore` の diff を**全文**目視
   (それぞれ 60 / 133 / 12 / 10 行)。既存 assert・既存 `if` の条件式に変更は無い。
3. **門の本数を実測**: `Paradise gate list: 500 gates`(改修前 492 / NFR-01 の基準を上回る)。
4. **門の名を実測**: `node tests/paradise.test.js --gate '^fold:'` → `8 of 500 gates matched — 8 green, 0 red`(1.2s)。
5. **見ていないもの(第37条により緑と呼ばない)**:
   - `tests/paradise.test.js` の**非 diff 部 10,856 行**。改修が触っていない門の中身は読んでいない。
   - `overlay/vendor/` 配下(第20条により触らない約束であり、diff にも現れない)。
   - **CI runner 上の挙動**(§5 で述べるとおり、本相の測定はすべてローカルである)。

---

## 3. 欠陥の一覧(重み順)

### F-1 **BLOCK — CI の `📒 Fold` 段は、いま撃てば 7 門が赤い**

**根拠: 実測(CI の段の env を忠実に再現)。**

`.github/workflows/tribunal.yml:143-158` が建てた段:

```yaml
      - name: 📒 Fold — 畳みの機構が己の掟を守るか (FR-11 / 第56条 b)
        env:
          PARADISE_NO_FOLD: '1'
          PARADISE_FOLD_LEDGER: ${{ runner.temp }}/fold-gate-ledger.jsonl
        run: node tests/fold.test.js
```

同じ env をローカルで再現した:

```
$ env PARADISE_NO_FOLD=1 PARADISE_FOLD_LEDGER=$LOCALAPPDATA/Temp/ci-fold.jsonl node tests/fold.test.js
Fold self-test: 19 passed, 7 failed
EXIT=1
```

**赤くなった 7 門と、その言い分**(生出力):

```
  ✗ fold: 領収書の緑は型で裁く — 偽装された exit は畳めない (prove M-05)
      0.0(これは本当に 0 である) は本当に 0 である — 畳めねばならない   false !== true
  ✗ fold: 緑しか畳まない — 赤い領収書は再走を呼ぶ
      赤い領収書の bail が disabled      + 'disabled'  - 'not-green'
  ✗ fold: 領収書の無い畳みは存在しない
      不在の bail が disabled            + 'disabled'  - 'no-receipt'
  ✗ fold: =repo は鍵が合えば畳まれる
      鍵が合う緑の領収書が在るのに畳まなかった: bail=disabled
  ✗ fold: bail は閉じた語彙で名乗る (揟5)
      読めない台帳の bail が disabled — no-receipt で静かに全走してはならない (AC-16)
  ✗ fold: bail は機械可読である
      + 'disabled'  - 'no-receipt'
  ✗ fold: --no-fold は畳みを完全に切る (揟6)
      前提が崩れた — 畳める状態を作れていない
```

**切り分け(どの env が効いたかを個別に撃った):**

```
$ node tests/fold.test.js                                          → Fold self-test: 26 passed, 0 failed
$ PARADISE_FOLD_LEDGER=<仮の台帳> node tests/fold.test.js           → 26 門すべて緑(§7.1 の生出力)
$ PARADISE_NO_FOLD=1 node tests/fold.test.js                       → Fold self-test: 19 passed, 7 failed  EXIT=1
```

**犯人は `PARADISE_NO_FOLD: '1'` ただ一つである。**
(`PARADISE_FOLD_LEDGER` は無害 —— `tests/fold.test.js:51` が自分で
`process.env.PARADISE_FOLD_LEDGER = path.join(SAND, 'ledger.jsonl')` と上書きするからである。
**門は台帳の住所を自分で振り替えるが、`PARADISE_NO_FOLD` は振り替えない。**)

**なぜこうなるか。** `graph/fold.js:440`:

```js
const off = opts.off === true || env.PARADISE_NO_FOLD === '1';
if (off) return { ...bail('disabled'), key: null, receipt: null };
```

門が `fold.decide({ file: <作り物の台帳> })` と呼ぶと、`opts.env` を渡していないので
`process.env`(= CI が立てた `PARADISE_NO_FOLD=1`)が読まれ、**畳みの判断が何より先に `disabled` へ落ちる**。
門が測ろうとした `not-green` / `no-receipt` / `ledger-unreadable` / `key-miss` の**枝に一度も到達しない**。

**これは第56条 b の既往症の、畳みの側での再演である** ——
CI が置いた env が、**畳みを見張る門そのものを黙らせている**。
`tribunal.yml:150-152` の註釈は「**この段は畳まない。**畳みを見張る門が畳まれれば、
第56条(b) の『門番は絞り込みの外に立つ』と同じ穴が畳みの側に開く」と書いている。
**意図は正しい。だが手段が門を殺した。**

**なぜ prove 相が見つけられなかったか**(第62条: 門の形が盲点を決める):
prove の 33 変異は**すべてローカルで `node tests/fold.test.js` を素で撃つ**形だった。
**CI が立てる env を再現した変異が一つも無かった。** W-01〜W-04 は yml の**綴り**を壊す変異であり、
**yml が正しいまま実行環境として効く**経路を誰も撃っていない。
prove.md は自分で R-3 として「CI 上では一度も撃っていない」と名を付けていた —— **その穴に落ちている。**

**こう直せ(三つの選択肢。①を推す):**

1. **`tests/fold.test.js:51` の隣で `PARADISE_NO_FOLD` も自分で消す。**
   ```js
   // tests/fold.test.js:51 の直後
   delete process.env.PARADISE_NO_FOLD;   // 門は畳みの全ての枝を撃つ。外から切られては測れない
   ```
   —— 門は**自分の測る世界を自分で宣言する**。CI の env に依らなくなる(第58条の作法と同形)。
   **ただし `fold.test.js:804` の AC-18 の門は `PARADISE_NO_FOLD=1` の経路を撃つので、
   その門は `fold.decide({ file, env: { ...process.env, PARADISE_NO_FOLD: '1' } })` と
   既に明示で env を渡している**(`:810`)—— **消しても AC-18 の歯は欠けない。実測で確認済み。**
2. `tribunal.yml:156` の `PARADISE_NO_FOLD: '1'` を消す。
   —— だが段の註釈が説明する意図(この段自体を畳ませない)が消える。**推さない。**
3. `fold.decide()` の全呼び口に `env` を明示で渡す。
   —— `fold.test.js` の 12 箇所を書き換える。写経が増える。**推さない。**

**①を採った場合に建てるべき門**(第21条: 壊して鳴らす):
`tests/fold.test.js` に **「この門束は外の env に畳みを切られない」**を建て、
`spawnSync(process.execPath, [__filename], { env: { ...process.env, PARADISE_NO_FOLD: '1' } })` を
**実際に撃って `Fold self-test: N passed, 0 failed` を読む**。
—— **設定を読むのではなく走行を読む**(第16条)。この門が在れば、F-1 は二度と再演しない。

**①が効くことを、審査官が実際に撃って確かめた。**
`tests/fold.test.js:51` の直後に `delete process.env.PARADISE_NO_FOLD;` の 1 行を足した写しを作り、
**CI の段と同じ env** で撃った:

```
$ env PARADISE_NO_FOLD=1 PARADISE_FOLD_LEDGER=<仮の台帳> node tests/fold.test.js
  ✓ fold: この門は現物の台帳を汚していない
Fold self-test: 26 passed, 0 failed          ← 19 passed, 7 failed から回復
```

**7 門すべてが緑に戻り、AC-18 の門(`fold: --no-fold は畳みを完全に切る`)も緑のままである**
—— その門は `:810` で `env` を明示に渡しているので、process.env の削除に影響されない。
**審査官は実装を直さない。** 確認後ただちに現物を書き戻し、無傷であることを検めた:

```
$ git diff --stat tests/fold.test.js
(空 — 現物は一行も変わっていない)
```

---

### F-2 **HIGH — census の畳みは `ledger-unreadable` を黙って `no-receipt` に落とす**

**根拠: 実測 + AC-16 の明文。**

```
$ node -e "const f=require('./graph/fold.js'); …(台帳の道にディレクトリを置く)…"
find(読めない台帳) = null
decide(読めない台帳).bail = ledger-unreadable
```

`graph/census.js:142-143` は **`decide()` を通らず `find()` を直に呼ぶ**:

```js
const receipt = opts.noFold || process.env.PARADISE_NO_FOLD === '1'
  ? null : fold.find(fold.key());
```

そして `graph/fold.js:415-417`:

```js
function find(k, opts = {}) {
  let rows;
  try { rows = read(opts); } catch { return null; }      // ← ここ
```

**`read()` が投げる `ledger-unreadable` を、`find()` が `null`(= 領収書が無い)に潰している。**

AC-16 の明文(requirements §3.5):

> 台帳のファイルを**ディレクトリに置き換えて**撃つと、`bail=ledger-unreadable` が出て **exit 1** で倒れる
> (`bail=no-receipt` で静かに全走してはならない)。
> 根拠は第62条 b ①の実測 ——「ディレクトリを一つ作るだけで 484 門が全滅した」
> **読めないは skip ではなく赤である。**

**緩和要因**(だから BLOCK ではない): 畳まれずに全走するので**偽の緑にはならない**。
`census.js:146-149` が別途 `fold.decide()` を呼び直すので、**出力には `bail=ledger-unreadable` と名乗る**。
**悪化要因**: だが **exit は 0 のまま緑**である。ゆえに
「台帳が壊れていて畳みが永久に効いていない CI」が、**誰にも気づかれないまま 2,070s を払い続ける**。
第62条 b ①が名指す「不能を不在として飲み込む」形そのものである。

**なぜ prove が見つけなかったか。** prove の M-12(「壊れた JSON 行を黙って読み飛ばす」)は
**`decide()` 経路**を撃って鳴った。**`find()` 経路を撃つ変異が一つも無かった。**
第62条の再演 —— 門の形(decide を撃つ)が、盲点(find)を決めた。

**こう直せ:**

- `graph/fold.js:415-420` の `find()` から `catch { return null; }` を外し、**`read()` の誤りを素通しにする**
  (`err.bailCode === 'ledger-unreadable'` は既に付いている / `fold.js:389`)。
- `graph/census.js:142-143` を `fold.decide()` 経由に寄せる。
  **ただし `census.js:130-133` の註釈が警告する「呼び口は 1 箇所 / 引数は 1 個」の制約
  (門『gate-filter: census は自己診断を素で呼ぶ』がソースを静的に読む)を壊すな** ——
  三項の中で `fold.decide({}).receipt` を読む形なら制約を保てる。
- 門を建てよ: `tests/fold.test.js` に **「畳んだ census は読めない台帳で倒れる」** ——
  台帳の道にディレクトリを置いて `census.check({ runTests: true })` を撃ち、**exit が 0 でないこと**を読む。

---

### F-3 **HIGH — `--no-fold` を付けた atlas は、畳みについて一言も名乗らない**

**根拠: 実測(同じ道を二度撃って出力を突き合わせた)。**

```
$ node graph/atlas.js check --scale quick --static           (畳み有り)
────────────────────────────────
Atlas inspect: Executed 12 out of 12 inspections (0 reused)      ← 名乗る

$ node graph/atlas.js check --scale quick --static --no-fold (畳み切り)
────────────────────────────────
  🔴 図が壊れている — 楽園は己の姿を語れない                     ← **Atlas inspect: の行が無い**
```

**なぜか。** `graph/atlas.js:1422` で `folding` が偽になると、
`:1451` / `:1461` の三項が `seen.take(...)` を**通らない** → `total` が 0 のまま →
`:1613` の `if (t && t.total)` が偽 → **名乗りの行が丸ごと落ちる。**

**何が壊れるか(掟の側):**

- **requirements §5 の表**は `--no-fold` について「`bail=disabled` を名乗る」と定め、
  **「三者(`paradise.test.js` / `census.js` / `atlas.js`)で同じ綴り・同じ意味」**と明記する。
  実測で確かめた — **paradise.test.js と census.js は名乗る。atlas.js だけが黙る。**
  ```
  $ (paradise) Paradise fold: Executed 1 out of 1 runs (0 reused, bail=disabled)
  $ (census)   Census self-test: Executed 1 out of 1 runs (0 reused, bail=disabled)
  $ (atlas)    （行が存在しない）
  ```
- **第37条**: 「切ったつもりの機構が走り続ける」ことを出力が否定できない。
  `atlas.js:1539-1545` が `--no-fould` の綴り違いを exit 2 で殺す努力をしているのに、
  **正しく `--no-fold` を綴った走行が「切れた」ことを一言も言わない。**
- **AC-14** は「すべての畳み走行の stdout に `Executed <E> out of <N>` の綴りが現れる」と要求する。
  `--no-fold` の走行は畳んでいないが、**72 検査すべてを撃ったという事実を名乗る口が無い**。

**なぜ prove が見つけなかったか。** prove の M-10 硬化で建てた検めは
`fold.test.js:852` の **`reused: html=` が一件も出ないこと**である ——
**「出てはならないもの」だけを撃ち、「出なければならないもの」を撃たなかった。**
第62条 c の「無罪と宣言した形」の典型:`--no-fold` が**何も言わない**ことが素通りする。

**こう直せ:**

- `graph/atlas.js:1613` の条件から `t.total` の守りを外し、`folding` が偽のときは
  `Atlas inspect: Executed <N> out of <N> inspections (0 reused, bail=disabled)` を名乗らせる。
  **そのためには `folding === false` の枝でも `total` を数えねばならない** ——
  `:1452` / `:1462` の非畳み枝(`{ ...firstScreen(...), reusedFrom: null }`)は数を一切数えていない。
  `seen.take()` を通さず `total` だけ進める口(例: `seen.count(weight)`)を `fold.inspected()` に足すのが最小の直しである。
- 門を建てよ: `fold.test.js:849` の既存の撃ちに **`assert.match(ar.stdout, /Atlas inspect: .*bail=disabled/)` を足す**。
  —— 既存の門を**強くする**方向であり、第57条に触れない。

---

### F-4 **HIGH — 鍵の材料の走査は深さ 6 で黙って切れる。既にその底に触れている**

**根拠: 実測。**

`graph/fold.js:126` / `:140`:

```js
function walkJs(root, rel, out, depth = 0) {
  if (depth > 6) return;          // ← 黙って返る。名乗らない
```

材料の深さ分布を実測した:

```
$ node -e "…fold.materials() の深さを数える…"
materials= 278  walk_ms= 10
key= ce3c51087f916a57  fileCount= 278  bytes= 13107209  key_ms= 83
材料の深さ分布= { '1': 4, '2': 75, '3': 69, '4': 40, '5': 62, '6': 28 }
```

**深さ 6 の材料が 28 本ある。打ち切りの底に既に触れている。**
`overlay/vendor/archify/…` の下に**もう 1 階層**生まれた日、
その現物は**鍵の外へ黙って落ちる**。誰も鳴らない。

**これは prove M-02(実在の偽の緑)と完全に同型である。**
M-02 の教訓は「鍵の覆いが門の読む現物より狭い」であり、
本相が名指すのは「**覆いの綴りが、次に増えた 1 本を自動で採るとは限らない**」。
`fold.js:168` の註釈は誇らしくこう書いている:

> 木ごと採るので、**次に増えた 1 本も自動で鍵に入る**(名簿の写経を避ける / 第44条)。

**その約束は深さ 7 で破れる。註釈が事実より強い約束をしている。**

**同型の二番目の穴 — ドット始まりの「ディレクトリ」**(`fold.js:123` / `:130` / `:144`):

```js
const DOT = (name) => name.startsWith('.');
…
if (DOT(e.name)) continue;      // ファイルにもディレクトリにも効く
```

註釈(`fold.js:118-121`)は**ファイル**を落とす理由(走行中の一時的な写し)しか説明していない。
**ディレクトリごと落とすことは一言も書いていない。**
将来 `overlay/.config/` や `tools/.hooks/` が生まれれば、**木ごと鍵の外へ落ちる。**

**実測で確かめた「今の穴」**(対象木の中で鍵の外に在るもの):

```
対象木の中で鍵の外= 8
  ドット始まり= 1 [ 'graph/.paradise-source' ]
  深さ>7= 0 []
  その他= 7 [ 'dashboard/state.js', 'dashboard/state.json',
             'graph/examples/calculator.dag.json', 'graph/examples/dashboard.dag.json',
             'graph/identity/catalog.json', 'graph/identity/history.json', 'graph/lessons.json' ]
```

**「その他」7 本はすべて `derived.js` が宣言する生成物であり、除外は正しい**(第29条)。
**`graph/.paradise-source` は prove R-2 が「潰しても門が赤くならない」と実測している** ——
今は穴ではない。**深さの底と DOT のディレクトリだけが未測定の穴である。**

**こう直せ:**

1. `graph/fold.js:126` / `:140` の打ち切りを**黙らせない**。深さ超過に当たったら投げるか、
   `keyExplain()` の返り値に `truncatedAt: [<道>]` を載せて `--explain` で見えるようにせよ。
   **「見えない打ち切り」が M-02 を生んだ機序そのものである。**
2. `fold.js:118-121` の註釈に**ディレクトリも落ちること**を明記し、
   その判断が意図であることを述べよ(でなければ次の誰かが事故と読む)。
3. 門を建てよ: `tests/fold.test.js` の
   **`fold: 鍵は門が読む現物を覆う (prove M-02)`** に**深さの検め**を足す ——
   走査の底より 1 階層深い一時ファイルを作り、**鍵が動くこと**を撃つ。
   (第57条に触れない。既存の門を**強くする**方向である。)

---

### F-5 **MEDIUM — 畳んだ Census は打ち切り経路を CI で一度も通らない**

§2.2 に詳述。申し送り **R-5** として名を与えよ。

---

### F-6 **MEDIUM — 領収書の `summary` と `exit` の整合を誰も検めていない**

**根拠: 実測。**

```
$ node -e "…台帳に {exit:0, summary:'Paradise self-test: 400 passed, 5 failed'} を足す…"
find → {"at":"…","key":"ce3c5108…","exit":0,"summary":"Paradise self-test: 400 passed, 5 failed"}
summaryOf → {"passed":400,"failed":5,"skipped":0}
```

`graph/fold.js:333-344` の `validateReceipt` は `key` / `exit` / `summary` / `at` の**型**だけを裁く。
**`exit: 0` と「`failed: 5` と名乗る `summary`」が同居できる。**
`find()` は `exit === 0` だけを見るので採用し、census はその `summary` を `summaryOf` に通して数を作る。

**本物の走行はこの形を作らない**(`paradise.test.js:11221` が `exit: fail === 0 ? 0 : 1` と刻む)。
だが `fold.js:410-413` の註釈が自ら警告するとおり:

> 台帳は JSONL であり、**外から 1 行足せる面**である

**偽造の危険度の実測**(だから HIGH ではない):

```
$ node -e "…{exit:0, summary:'Paradise self-test: 9999 passed, 0 failed'} を台帳に足して census.check…"
Census self-test: Executed 0 out of 1 runs (1 reused, key=ce3c51087f916a57)
ms= 36  ok= false
  finding: stale  README テスト数  500 -> 9999
```

**偽造された数は census が捕まえた**(第22条の主張が裁かれているから)。
**だが README 側も同時に偽造されれば、両者は矛盾せず緑になる。**
台帳は `.gitignore` され CI 内で生成されるので、外部から書く面は今は無い —— **今は**。

**こう直せ:**
`graph/fold.js:341` の `summary` の検めを型から**整合**へ上げよ:

```js
// exit === 0 を名乗る領収書が failed > 0 を名乗るのは、機構の矛盾である
const m = r.summary.match(/(\d+) passed, (\d+) failed/);
if (r.exit === 0 && m && Number(m[2]) !== 0) throw new Error('fold: 緑の領収書が failed を名乗った');
```

門は `fold.test.js:622` の **`fold: 領収書の形は台帳へ入る前に裁かれる (prove M-13)`** に
**8 つ目の負の fixture**として足せる(既存の門を強くする方向 / 第57条に触れない)。

---

### F-7 **MEDIUM — 錠の stale 判定に二重入室の窓がある**

**根拠: ソース読み(`graph/fold.js:310-315`)。**

```js
let st = null; try { st = fs.statSync(lock); } catch {}
if (st && Date.now() - st.mtimeMs > (opts.staleMs || 30000)) {
  try { fs.rmSync(lock, { force: true }); } catch {}
  continue;
}
```

二つの窓:

1. **錠の保持中に mtime が更新されない。** `openSync(lock,'wx')` は作成時に mtime を刻むが、
   その後 `fn()` が 30s を超えて走れば、**錠を持ったまま stale と判定される**。
   `withLock` は `module.exports` に載っている(`fold.js:634`)—— **呼び手は `append` だけではない。**
   `daily-guard` の lease は同じ形だが、`fold.js` は lease の更新を持たない。
2. **stale 削除そのものが競合する。** A が `rmSync` した直後に B が `openSync` で錠を取り、
   同時に C も stale と判定して **B の錠を消す**。C も入れる。**二重入室。**

**なぜ prove が見つけなかったか。** AC-25 の並行の門(`fold.test.js:965`)は
**並列度 2/4/8 × 30 試行**を撃つが、**各試行は `append` であり一瞬で終わる** ——
**30 秒を超える臨界区間を誰も作らなかった。** 第62条:門の形が盲点を決める。

**緩和要因**: 現在の唯一の呼び手 `append()`(`fold.js:356`)は `appendFileSync` 一発であり、
30s を超える可能性は実質無い。**ゆえに MEDIUM であり HIGH ではない。**

**こう直せ:**

- `graph/fold.js:267` の `withLock` の docblock に
  **「`fn` は `staleMs` より必ず短く終わること。長い臨界区間を渡してはならない」**を明記せよ。
  註釈は約束をしてよい —— **守れない約束を黙って抱えるより遥かに良い**(第21条 b)。
- より強い直し: `fn()` の実行中に `fs.utimesSync(lock, …)` で mtime を更新する lease にするか、
  `withLock` を `module.exports` から外して `append` 専用の内部関数にせよ(第48条: 使われない口は嘘をつく)。
- 門を建てるなら: `staleMs: 50` を渡して **50ms より長い `fn`** を並列で撃ち、
  **二重入室が起きること**を先に赤で観測してから直せ(第21条 c)。

---

### F-8 **MEDIUM — Windows の錠の綴りは正しい。Linux では `EPERM` 待ちが**余分**に効く**

**根拠: ソース読み + prove の実測記録。**

`graph/fold.js:309`:

```js
if (e.code !== 'EEXIST' && e.code !== 'EPERM' && e.code !== 'EACCES') throw e;
```

**Windows の側は正しい。** prove 相が実際に踏んだ生出力が `fold.js:298-307` に刻まれている
(`ERR: EPERM: operation not permitted, open '…jsonl.lock'` / `par=4 codes 1,0,0,1 / lines 71 (期待 120)`)。
削除待ちの入り口を掴む現象は Windows 固有であり、**待つ**扱いは正しい(偽の赤を避ける / 第62条 b)。

**Linux の側に、名指すべき影が一つある。**
Linux で `open(…, O_CREAT|O_EXCL)` が `EACCES` を返すのは
**親ディレクトリに書き込み権が無い場合**である —— それは**競合ではなく構成の誤りであり、待っても解けない**。
現在の綴りはそれを **60,000ms 待ってから**
`fold: 台帳の錠が 60000ms 解けない` という**誤った診断**で倒れる(`fold.js:317`)。
真の原因(権限)が診断から消える —— 第21条 b「辿れない発見は直せない発見である」。

**こう直せ:**
`fold.js:309` を **OS で分けよ**。

```js
// EPERM/EACCES を「待つべき競合」と読んでよいのは Windows だけである。
// POSIX の EACCES は親ディレクトリの権限であり、待っても永久に解けない。
const RETRYABLE = process.platform === 'win32'
  ? ['EEXIST', 'EPERM', 'EACCES'] : ['EEXIST'];
if (!RETRYABLE.includes(e.code)) throw e;
```

**門は建てにくい**(この機は Windows であり、Linux の `EACCES` をローカルで撃てない)。
第37条に従い、**「撃てなかった」と書いて申し送れ** —— CI(ubuntu)で
台帳の親ディレクトリを `chmod 500` にして撃つ門なら、CI 上でだけ測れる。

---

### F-9 **MEDIUM — `keyExplain` は「読めないファイル」を「不在」と同じ鍵にする**

**根拠: ソース読み(`graph/fold.js:213-220`)。**

```js
for (const f of files) {
  let buf;
  try { buf = fs.readFileSync(path.join(root, f)); } catch { continue; }   // ← 黙って飛ばす
```

`materials()` が名簿に載せた現物が**読めない**とき、その 1 本は鍵から黙って落ちる。
結果として**「ファイルを消した状態」と「ファイルが読めない状態」が同じ鍵になる。**

第62条 b ①が名指した形そのものである:

> 「ディレクトリを一つ作るだけで 484 門が全滅した」——**不能は不在と別の値である。**

`fold.js:377-380` の `read()` は**この区別を正しく守っている**(`ENOENT` は空 / それ以外は `ledger-unreadable`)。
**同じ器の中で、鍵の側だけが区別を捨てている。**

**こう直せ:** `fold.js:215` を `read()` と同じ作法に揃えよ ——
`ENOENT` なら `continue`、それ以外は投げる(または `keyExplain().unreadable` に載せて `--explain` で見せる)。
門は `fold: 鍵の材料は数え直せる`(`fold.test.js:234`)に
**「読めない材料が 1 本あれば `--explain` がそれを名乗る」**を足せば撃てる。

---

### F-10 **MEDIUM — `atlas.check()` が `opts` を `firstScreen` へ丸投げしている**

**根拠: diff の 1 行。**

```diff
-      const fs2 = opts.skipBrowser ? {…} : firstScreen(r.html);
+      … : folding ? seen.take(`${htmlKey}#first-screen`, by, () => firstScreen(r.html, opts), 1)
```

`firstScreen(htmlPath, opts)` は `opts.retry !== false` で**間欠故障の再試行**を制御する(`atlas.js:1326-1334`)。
改修前、`check()` は `opts` を渡していなかったので**再試行は必ず効いていた**。
改修後、`check({ retry: false })` と呼べば**再試行が黙って切れる**。

**今は誰もそう呼んでいない**(実測: `atlas.check(` の呼び手は `paradise.test.js:8612` / `:8724` /
`atlas.js:1524` / `:1595` の 4 箇所で、いずれも `retry` を渡さない)。**ゆえに MEDIUM。**

**だが `atlas.js:1321-1325` の註釈が明言している:**

> 間欠故障を一発で赤にすれば CI は不定に落ち、やがて誰も見なくなる(第34条)。

**その守りを、外から一語で外せる口が新しく開いた。**

**こう直せ:** `firstScreen(r.html, opts)` を `firstScreen(r.html, { retry: opts.retry })` に絞るか、
`{ }` に戻して「畳みは再試行の方針を変えない」ことを註釈で凍らせよ。

---

### F-11 **MEDIUM — `--static` は「ブラウザを起こさない」ではない。門の註釈が事実と違う**

**根拠: 実測。**

`tests/fold.test.js:847-851` の註釈:

```js
// atlas を**実際に撃つ**: `--no-fold` を付けた走行は畳んだ件数 0 を名乗らねばならない
//   (ブラウザを起こさない `--static` の道で、畳みの算法だけを見る)
```

実測すると、`--static` の走行は**ブラウザを起こしている**:

```
$ node graph/atlas.js check --scale quick --static --no-fold
  🔴 run  [lifecycle] 9/9  fits  静止  726114b
      motionGovernor が capable でない … 動く要素が 0 個 — 描画器は静止画を作っている
```

`motionGovernor` / `動く要素が 0 個` は **`motion-probe.mjs` が実 Chrome で測った結果**である。
`--static` が制御するのは `atlas.js:1217` の `ir.meta.animation = opts.static ? 'none' : MOTION` だけで、
**ブラウザを起こさないのは `opts.skipBrowser` であり、CLI からは立たない**(`grep -n skipBrowser graph/atlas.js` の実測: 定義 0 / 使用 2)。

**何が壊れるか。** 註釈は「軽い道で撃っている」と読ませるが、**実際は 6 主題 × 2 検査の実ブラウザ走行である**。
`fold.test.js:851` は `timeout: 120000` を置いているが、**実測 49s(quick / 12 検査)**であり、
負荷の高い CI では 120s を超えうる。超えたとき `spawnSync` は `null` の stdout を返し、
`:852` の `(String(ar.stdout).match(/reused: html=/g) || []).length === 0` は **真で通る** ——
**測れなかった走行が緑として数えられる。** 第37条「不在は通過ではない」の違反である。

**こう直せ:**

- `fold.test.js:848` の註釈から「ブラウザを起こさない」を削れ(事実でない)。
- `:851` の直後に **`assert.strictEqual(ar.status, 0, …)` と `assert.ok(ar.stdout, '走行が出力を出さなかった')`**
  を足せ —— **打ち切りを緑と読ませない**。これは門を**強くする**方向であり第57条に触れない。

---

### F-12 **LOW — `say()` の `executed` の式は総数 1 にしか意味がない**

`graph/fold.js:474`:

```js
const executed = d.fold ? total - 1 : total;
```

`total=72` で畳むと `Executed 71 out of 72` になる(実測):

```
$ node -e "…fold.say('Atlas:','inspections',{fold:true,key:'x'},{total:72})…"
Atlas: Executed 71 out of 72 inspections (1 reused, key=x)
```

**汎用に見える口が、P-1(総数 1)専用の算術を抱えている。**
今の呼び手は 3 箇所ですべて `total: 1` であり(`paradise.test.js:183` / `:189` / `census.js:148`)、
**Atlas は `say()` を使わず自前で名乗る**(`atlas.js:1614`)—— ゆえに実害は無い。

**こう直せ:** `say()` の docblock に **「この口は総数 1 の走行専用である。Atlas の 72 検査は `tally()` を使え」**と明記するか、
`total !== 1` のとき投げよ。**ただし `fold.test.js:813` の門が `say()` の綴りを凍らせているので、
その門を壊さない形で直せ**(第57条)。

---

### F-13 **LOW — `fold-status` CLI は第四の接頭辞を名乗る**

`graph/fold.js:620`:

```js
console.log(`fold: Executed ${s.executed} out of ${s.total} runs (…)`);
```

requirements §4.1 の接頭辞表は `Paradise self-test:` / `Paradise gate list:` / `Paradise gate-filter:` /
`Paradise fold:` / `Census self-test:` / `Atlas inspect:` の 6 語を契約として定める。
**`fold:` は表に無い。** prove.md §7.3 の生出力もこの綴りで記録されている。

**実害は小さい**(人間向けの CLI であり、誰も機械で読んでいない)。
**だが「綴りは契約である」と繰り返し宣言した改修が、自分の CLI で契約外の綴りを増やしている。**

**こう直せ:** `Paradise fold:` に揃えるか、requirements §4.1 の表に `fold:`(CLI 専用)を明記して凍らせよ。

---

### F-14 **LOW — census の未知旗の検めは `slice(3)` なので、命令の無い走行を素通しする**

**根拠: 実測。**

```
$ node graph/census.js --no-fould
usage: census.js [show|check|fix]
exit=0
```

`graph/census.js:537` は `process.argv.slice(3)` を見る —— `argv[2]` が命令だからである。
命令を省いた走行では `slice(3)` が空になり、**綴り違いの旗は一つも検められない。**

**緩和要因**: 命令が無ければ `usage` を出して終わるので、畳みは走らない。
AC-19 の狙い(「切ったつもりの機構が走り続ける」)は起きない。**ゆえに LOW。**

**こう直せ:** `slice(3)` を `slice(2).filter(a => a.startsWith('--'))` に寄せよ。
`atlas.js:1546` は既にこの形である(旗を `parse()` の結果から拾う)。**三者で綴りを揃えるべきである。**

---

### F-15 **MEDIUM — `--all-scales` の総括行が、同じ量を二つの数として語る(第22条)**

**根拠: 実走の生出力。**

```
$ node graph/atlas.js check --all-scales
Atlas inspect: Executed 32 out of 72 inspections (40 reused)
  ✓ 36 主題すべてが検査に通る（うち 7 件は平面化不能のため standard: wiring, dag）
```

**二つの嘘が同じ一行に同居している。**

1. **「36 主題」は主題ではない。** 主題は 6 つである(`SUBJECTS` の鍵数)。36 は **6 主題 × 6 道の行数**。
   `atlas.js:1623` が `res.rows.length` をそのまま「主題」と呼んでいる。
   単道では `rows.length === 6` だったので**従来は正しかった** —— `--all-scales` が語を嘘にした。
2. **「7 件」と「`wiring, dag`(2 個)」が食い違う。** `atlas.js:1621` の `dg` は**行**を数え(7 行)、
   `:1624` の名は**この改修が新たに `[...new Set(...)]` で畳んだ**(2 個)。
   **数を畳まず、名だけ畳んだ。**

requirements §1.2 がこの形を名指しで禁じている:

> **同じ量が二つの数として散文に残る**(第22条が禁じる形)。

**なぜ prove が見つけなかったか。** prove.md §4 の残債 **R-4** が自分で告白している ——
「**6 道 72 検査の実走(数分・ブラウザ 32 起動)は本相では撃っていない**」。
**本相がその実走を撃って、総括行を初めて読んだ。**

**こう直せ**(`graph/atlas.js:1621-1625`):

```js
const dgSubjects = [...new Set(res.rows.filter(r => r.profile === 'standard').map(r => r.subject))];
const subjects = new Set(res.rows.map(r => r.subject)).size;
console.log(res.ok
  ? `  ✓ ${subjects} 主題 × ${res.scales ? res.scales.length : 1} 道 = ${res.rows.length} 件すべてが検査に通る` +
    (dgSubjects.length ? `（うち ${dgSubjects.length} 主題は平面化不能のため standard: ${dgSubjects.join(', ')}）` : …)
```

**門を建てよ**: `tests/fold.test.js` に
**「`--all-scales` の総括は、数えた数と名指した名の個数が一致する」**を撃つ門。
`--static` で軽く撃ち、`/(\d+) 件すべて/` と `rows` の数、`/うち (\d+) 主題.*standard: (.+)）/` の数と名の個数を突き合わせよ。

---

### F-16 **LOW — `Atlas inspect:` の恒等式の錠は `t.total === 0` のとき飛ぶ**

`graph/atlas.js:1613`:

```js
if (t && t.total) {
  console.log(`Atlas inspect: Executed …`);
  if (t.executed + t.reused !== t.total) { … process.exit(2); }
}
```

**`total` が 0 のとき、錠ごと飛ぶ。** AC-15 は「畳み走行は終わる前に恒等式を自分自身に対して検め、
破れていれば exit 1 で倒れる」と求めるが、**`total === 0` は「検めなかった」であって「閉じた」ではない**(第37条)。

**緩和要因**: `total === 0` になるのは全主題が `catch` に落ちた場合であり、
そのとき `rows` は全て `ok: false` なので `process.exit(1)` に落ちる。**ゆえに LOW。**
また `fold.js:541-545` の `tally()` 側の錠は `total === 0` でも通る(`0+0===0`)。

**こう直せ:** `if (t)` に緩め、`total === 0` のときは
`Atlas inspect: 検査を一件も撃たなかった — 測れなかった(第37条)` を名乗って exit 2 にせよ。
これは**掟を広げるのではなく、第37条の要求を満たす**方向である。

---

## 4. `graph/census.js` / `graph/atlas.js` — 既存の振る舞いは変わったか

### 4.1 census: **呼び口と引数の制約は守られている**

`census.js:130-133` の註釈が警告する門「gate-filter: census は自己診断を素で呼ぶ」の制約
(**呼び口 1 箇所 / 引数 1 個**)を、diff が守っているかを確かめた:

```
$ grep -n "execFileSync(process.execPath" graph/census.js
  (1 箇所のみ。引数は [path.join(ROOT,'tests','paradise.test.js')] の 1 個)
```

**三項で包む形になっており、子プロセスへ `--no-fold` を渡していない。** 註釈の指示どおりである。

**`tests = summaryOf(out)` を必ず通る形も守られている**(`census.js:153`)——
AC-04 の核心(`c.tests` が `null` にならないので `measurable()` が真を返し、
第22条の旗艦「README テスト数」の主張が裁かれ続ける)は実測で確認した:

```
$ node -e "…畳める台帳を作って census.check({runTests:true})…"
Census self-test: Executed 0 out of 1 runs (1 reused, key=ce3c51087f916a57)
ms= 36  ok= false
  finding: stale  README テスト数  500 -> 9999
```

**畳んだ census が第22条を裁いている。M-5 の `--no-tests` の罠は構造的に回避されている。**

### 4.2 atlas: **単道 `--scale quick` は従来どおり動く(実走で確かめた)**

```
$ time node graph/atlas.js check --scale quick
═══ 🗺  ATLAS GATE (第47条) ═══
  ✓ hierarchy   [architecture] 9/9  fits          動 29   734697b
  ✓ conclave    [workflow    ] 9/9  fits          動 22   731008b
  ✓ dispatch    [sequence    ] 9/9  fits          動 14   727484b
  ✓ dag         [architecture] 9/9  scroll(3944px)動 11   722074b
  ✓ run         [lifecycle   ] 9/9  fits          動 13   726618b
  ✓ wiring      [architecture] 9/9  scroll(3211px)動 115  790340b  standard(最小交差 191)
────────────────────────────────
Atlas inspect: Executed 12 out of 12 inspections (0 reused)
  ✓ 6 主題すべてが検査に通る（うち 1 件は平面化不能のため standard: wiring）
════════════════════════════════
real    0m49.465s
EXIT=0
```

**6 主題すべて緑 / 12 検査すべて実行(`0 reused`)/ exit 0。**
`0 reused` は正しい —— design D-7 の実測どおり、**道の中に畳める対は 1 つも無い**。
**単道の走行は、畳みが入っても一件も畳まず、従来と同じ本数の検査を撃っている。**

その他の atlas の変更点を diff で個別に裁いた:

| 変更 | 既存の振る舞いへの影響 |
|---|---|
| `rows` に `scale` / `htmlKey` / `reusedFrom` / `reusedBy` を追加 | **無害**。既存の呼び手(`paradise.test.js:8612` / `:8724`)は `ok` と `rows.length` しか読まない |
| `check()` の戻り値に `tally` / `inspected` を追加 | **無害**(同上) |
| `dg.map(...)` → `[...new Set(dg.map(...))]` | `--all-scales` で同じ主題が 6 回並ぶのを畳む。**単道では出力が一字も変わらない**(上の実測で確認) |
| 主題ごとの `catch` に `scale` を追加 | **無害**。`rows.push` の形が 1 欄増えただけ |
| `KNOWN_FLAGS` による未知旗の拒否 | **既存の旗 7 語すべてが表に在る**(`scale/phase/out/outdir/static/json/quality`)。既存の呼び方は壊れない |
| `checkAllScales` が道ごとに別 `outdir` を使う | **正しい**。`check()` 冒頭の `rmSync(outdir)` が道を跨いで消し合わない |
| `firstScreen(r.html)` → `firstScreen(r.html, opts)` | **F-10 で名指した**(MEDIUM) |

---

## 5. 読み手への親切さ — **この改修の最も強い所である**

**註釈は「なぜそうしたか」をよく語っている。** 単なる説明ではなく、**実測の生出力を抱えている**:

| 住所 | 何を語っているか |
|---|---|
| `fold.js:93-121` | M-02 の 7 本の穴を**門の名つきで**列挙し、生成物を除く理由を「偽の緑ではなく機構が無言で死ぬ」と述べる |
| `fold.js:295-308` | Windows の `EPERM` を**生出力ごと**刻む(`par=4 codes 1,0,0,1 / lines 71 (期待 120)`)——**次の誰かが「POSIX にそんなコードは無い」と消すのを止める** |
| `fold.js:280-288` | 待ちの上限 60,000ms の由来を「5,000ms では並列度 4 で書き手が 1 本死んだ」と実測で示す |
| `fold.js:200-204` | **本設計で最も重い決定**(生 env ではなく `abode.resolve().mode`)を、失う秒数(420s)まで添えて説明 |
| `atlas.js:1441-1449` | 検査の種別を鍵に混ぜる理由を、**踏んだ事故**で語る(`Executed 16 out of 72` / 全主題の動きが `firstScreen` の裁定に化けた) |
| `paradise.test.js:138-147` | `--no-fold` の宣言を絞り込み塊の外に置く理由を、**註釈にも禁則が及ぶ**という実測(design D-3)で語る |
| `tribunal.yml:145-149` | `📒 Fold` 段を消すと孤児の門が鳴ることを、**孤児の名乗りごと**刻む |
| `.gitignore:44-50` | 台帳を追跡しない理由を「並行 PR では必ず衝突し、手で解決する術が無い」と述べ、直上の先例に揃える |

**将来の誰かが壊しそうな箇所に、警告が実際に置かれている**(`⚠️` は `fold.js` だけで 12 箇所)。

**弱い所を三つ名指す:**

1. **`fold.js:168` の約束が強すぎる** —— 「次に増えた 1 本も自動で鍵に入る」は
   **深さ 7 と DOT ディレクトリで破れる**(F-4)。**守れない約束は、守られていると信じられる分だけ危険である。**
2. **`fold.test.js:848` の註釈が事実と違う** —— 「ブラウザを起こさない `--static`」は実測で偽(F-11)。
3. **`fold.js:548` が飾りを「錠」と名乗っている** —— `closed()` の註釈が
   「**恒等式の錠は畳みの関数の外に立つ**(AC-15)」と書く。**呼ばれない `return true` は錠ではない**(§1)。

---

## 6. 撃った命令と生出力(本相の測定台帳)

| # | 命令 | 結果 |
|---|---|---|
| 1 | `git diff --stat 6641e3b..HEAD -- graph/ tests/ .github/ .gitignore` | 8 現物 / **2,425 挿入 / 32 削除** |
| 2 | `grep -rn "\.closed()" --include=*.js .`(reform 除く) | 実の呼び手 **1 件**(`fold.test.js:421`、常に緑) |
| 3 | `node tests/paradise.test.js --gate '^fold:'` | `8 of 500 gates matched — 8 green, 0 red`(**1.2s**) |
| 4 | `node tests/fold.test.js`(素) | `Fold self-test: 26 passed, 0 failed` |
| 5 | `PARADISE_FOLD_LEDGER=<仮> node tests/fold.test.js` | **26 門すべて緑** |
| 6 | **`PARADISE_NO_FOLD=1 node tests/fold.test.js`** | **`Fold self-test: 19 passed, 7 failed` / EXIT=1**(**F-1**) |
| 7 | **`env PARADISE_NO_FOLD=1 PARADISE_FOLD_LEDGER=<仮> node tests/fold.test.js`**(CI の段の再現) | **`19 passed, 7 failed` / EXIT=1**(**F-1**) |
| 8 | **`node graph/atlas.js check --scale quick`** | **6 主題緑 / `Executed 12 out of 12 inspections (0 reused)` / EXIT=0 / 49.465s** |
| 9 | `node graph/atlas.js check --scale quick --static` | `Atlas inspect: Executed 12 out of 12 inspections (0 reused)` **を名乗る** |
| 10 | `node graph/atlas.js check --scale quick --static --no-fold` | **`Atlas inspect:` の行が存在しない**(**F-3**) |
| 11 | `node -e "…fold.materials() の深さ分布…"` | **278 本 / 深さ 6 に 28 本(打ち切りの底)**(**F-4**) |
| 12 | `node -e "…読めない台帳で find / decide…"` | `find → null` / `decide.bail → ledger-unreadable`(**F-2**) |
| 13 | `node -e "…偽造 summary を台帳に足して census.check…"` | `Executed 0 out of 1 runs (1 reused)` / `README テスト数 500 -> 9999`(**F-6**) |
| 14 | `node graph/census.js --no-fould`(命令なし) | `usage: …` / **exit 0**(綴り違いが素通り / **F-14**) |
| 15 | **`node graph/atlas.js check --all-scales`** | **`Atlas inspect: Executed 32 out of 72 inspections (40 reused)` / EXIT=0 / 2m20.104s**(**残債 R-4 の解消**) |
| 16 | 同上・総括行 | `✓ 36 主題すべてが検査に通る（うち 7 件は … standard: wiring, dag）`(**F-15**) |

---

## 7. 撃てなかったもの(第37条 — 緑と呼ばない)

1. **CI runner 上の一切**。本相の測定はすべて Windows のローカルである。
   **F-1 の再現は CI の env を模したのであって、CI で撃ったのではない。**
   ただし犯人(`PARADISE_NO_FOLD`)は env 一つに切り分けてあるので、**runner でも同じになると強く見込む**
   —— それでもこれは推論であり、測定ではない。
2. **引数無しの全走(`node tests/paradise.test.js`)**。所要 6〜7 分で本相の測定機の制限を超える。
   **教主の測定を借りた**:`Paradise self-test: 500 passed, 0 failed` / `Paradise gate list: 500 gates`。
   第27条に従えば信じずに撃ち直すべきであり、**本相はそれをできなかった。**
3. **Linux の `EACCES`**(F-8)。この機は Windows であり、POSIX の権限誤りを撃てない。
4. **錠の二重入室(F-7)を実際に再現していない。** ソース読みだけの指摘である。
   30s を超える臨界区間を作る呼び手が現在存在しないため、**再現には `withLock` を直に叩く台本が要る。**
5. **本相は `--all-scales` の実走を撃った**(prove 残債 R-4 の解消)。§8 に結果を綴じる。
   **ただし撃ったのは 1 回である。** design D-7 が言う「道の中に畳める対は 0 件」の同値関係は
   1 走行の実測で再現したが、**次に `draw()` が変われば 32/40 は動く**(requirements §0.1 の但し書き)。
   **数を門で縛ってはならない** —— 現に `fold.test.js` はそうしていない(正しい判断である)。

---

## 8. `--all-scales` の実走 — **残債 R-4 を本相が解消した**

prove.md §4 の残債 R-4:

> **6 道 72 検査の実走(数分・ブラウザ 32 起動)は本相では撃っていない。**
> `Executed 32 out of 72 inspections (40 reused)` が硬化後も成り立つかは**未測定である**
> (…同値関係は変わらないため 32/40 は保たれるはず —— **だがこれは推論であって測定ではない**)。

**本相が撃った。推論は当たっていた。**

```
$ time node graph/atlas.js check --all-scales
═══ 🗺  ATLAS GATE (第47条) ═══
── scale: quick ──
  ✓ hierarchy   [architecture] 9/9  fits          動 29   734697b
  ✓ conclave    [workflow    ] 9/9  fits          動 22   731008b
  ✓ dispatch    [sequence    ] 9/9  fits          動 14   727484b
  ✓ dag         [architecture] 9/9  scroll(3944px)動 11   722074b
  ✓ run         [lifecycle   ] 9/9  fits          動 13   726618b
  ✓ wiring      [architecture] 9/9  scroll(3211px)動 115  790340b  standard(最小交差 191)
…
── scale: cartography ──
  ✓ hierarchy   [architecture] 9/9  fits          動 29   734697b  (reused: html=4e0854b638e17492 ← hierarchy@quick)
  ✓ conclave    [workflow    ] 9/9  fits          動 18   727900b
  ✓ dispatch    [sequence    ] 9/9  fits          動 14   727484b  (reused: html=0bbae45008917f15 ← dispatch@quick)
  ✓ dag         [architecture] 9/9  scroll(2648px)動 24   731237b
  ✓ run         [lifecycle   ] 9/9  fits          動 13   726618b  (reused: html=84643971459205bd ← run@quick)
  ✓ wiring      [architecture] 9/9  scroll(3211px)動 115  790340b  standard(最小交差 191)  (reused: html=568b26202b8ec40f ← wiring@quick)
────────────────────────────────
Atlas inspect: Executed 32 out of 72 inspections (40 reused)
  ✓ 36 主題すべてが検査に通る（うち 7 件は平面化不能のため standard: wiring, dag）
════════════════════════════════
real    2m20.104s
EXIT=0
```

### 8.1 AC の照合 — **4 つ中 3 つが実走で満たされた**

| AC | 要求 | 実走 | 裁定 |
|---|---|---|---|
| **AC-11** | `Atlas inspect: Executed 32 out of 72 inspections (40 reused)` / exit 0 | **一字一句一致 / exit 0** | **✓ 満たす** |
| AC-11 内訳 | 畳めない 24 = `conclave`/`dag` の 6 道 × 2 検査 / 畳める 40 = 4 主題 × 5 道 × 2 | 実出力で `conclave` / `dag` だけが全道で `reused` を伴わない | **✓ 満たす**(design D-7 の同値関係が再現) |
| **AC-12** | 畳んだ裁定は写し元を `<sha16>` で名乗る。`grep -c 'reused: html='` が畳んだ件数と一致 | `(reused: html=4e0854b638e17492 ← hierarchy@quick)` が**写し元の主題と道まで**名乗る | **✓ 満たす。要求より強い**(AC-12 は sha16 しか求めていないが、実装は `← <主題>@<道>` を添える / 第21条 b) |
| **総括行** | requirements §1.2:「同じ量が二つの数として散文に残る」ことの禁 | `36 主題` / `7 件` vs `wiring, dag`(2 個) | **✗ 破れる**(**F-15** / MEDIUM) |

### 8.2 秒の側 — **測ったが、比較してはならない**

`real 2m20.104s`(140.1s)。**これを改修前の Atlas 段 335s と比べてはならない。**
理由は第38条と requirements NFR-05 の但し書きである:

- **機械が違う。** 335s は CI runner の実測(findings §1.1)、140.1s は本審査官の Windows 機である。
- **同時走行が違う。** 本相は他の測定と並行して撃っている。
- **NFR-05 が求めるのは「同じ方法で前後を測る」**こと ——
  `gh run view <id> --json jobs` の step ごとの `startedAt`/`completedAt` の差。**本相はそれを撃っていない。**

**ゆえに本相は削減幅について何も主張しない。** 残債 **R-3**(CI 上の測定)は**依然として未解消である。**
主張できるのは一つだけ: **72 検査のうち 32 だけが実際にブラウザを起こし、40 は畳まれ、36 行すべてが緑であった。**

### 8.3 この実走が新たに生んだ問い(次の走行への申し送り)

1. **`--all-scales` は 1 プロセスである。** 6 プロセスに分かれていた頃、
   1 道の異常終了は他の 5 道を巻き込まなかった。`atlas.js:1497-1503` の主題ごとの `catch` は
   **主題の例外**を閉じるが、**`checkAllScales` の道のループに `catch` は無い**(`atlas.js:1522-1531`)——
   `draw()` の外で投げる誤り(例: `outdir` の作成失敗)は**6 道分を一度に倒す。**
   **MEDIUM 相当だが、実際に投げさせて確かめていないので重みを付けない**(第37条)。
2. **CI で `--all-scales` が 140s で済む保証は無い。** `tribunal.yml:184` は timeout を持たない。
   runner の Chrome 起動が遅ければ job 全体の 360 分に食い込む ——
   **6 プロセスなら 1 道ずつ落ちたが、1 プロセスなら全部が落ちる。**


---

## 9. 総括 — この改修を通してよいか

**通してよい。ただし F-1 を直すまでは CI が赤である。**

### 9.1 この改修が正しくやったこと

1. **門を一本も減らしていない。** 492 → **500**(実測 `Paradise gate list: 500 gates`)。
   第57条の違反は**一件も見つからなかった**(§2、見たものの全数は §2.3)。
2. **`--no-tests` の罠(M-5)を構造的に回避した。** 畳んだ census が第22条の旗艦を裁き続けることを
   実測で確かめた(§4.1: 偽造した数 `9999` を census が捕まえた)。
3. **`=global` を畳める経路が物理的に無い。** `decide()` が鍵も台帳も見ずに落とし(`fold.js:444-448`)、
   `abode.guardWrite` が住所の側からも拒む(`fold.js:278-279`)—— **二重の否認**であり、AC-10 の要求を超える。
4. **AC-11 / AC-12 が実走で満たされた**(§8)。`Executed 32 out of 72 inspections (40 reused)` が
   要求の綴りと一字一句一致し、畳んだ件は写し元の**主題と道まで**名乗る。
5. **註釈が実測を抱えている。** 「なぜそうしたか」だけでなく「**何を踏んだか**」を生出力ごと刻む(§5)。
   これは楽園のどの器より良い水準である。

### 9.2 通す前に必ず直すもの

| 順 | 欠陥 | 住所 | 直し |
|---|---|---|---|
| **1** | **F-1 (BLOCK)** | `tests/fold.test.js:51` | `delete process.env.PARADISE_NO_FOLD;` を足す。**審査官が実測で効くことを確認済み**(19 passed,7 failed → 26 passed,0 failed) |
| 2 | F-2 (HIGH) | `graph/fold.js:417` / `graph/census.js:142` | `find()` の `catch { return null; }` を外し、census を `decide()` 経由に寄せる |
| 3 | F-3 (HIGH) | `graph/atlas.js:1613` | `--no-fold` の走行にも `Atlas inspect: … bail=disabled` を名乗らせる |
| 4 | F-4 (HIGH) | `graph/fold.js:126` / `:140` / `:118-121` | 深さの打ち切りを黙らせない。DOT がディレクトリにも効くことを註釈に明記 |

**F-1 を直したら、F-1 が二度と再演しないための門を同じ変更で建てよ**(§3 F-1 の末尾)——
**「建てられた門が誰にも呼ばれていなかった」が楽園の既往症である**(第44条 b)。
今回はその変種、**「呼ばれた門が、呼び手の env に黙らされていた」**であった。

### 9.3 この相が第62条に加えた一行

prove 相は第62条を「門の形が盲点を決める」と読んだ。**本相はその一段外を見た:**

> **門を走らせる環境の形も、門の盲点を決める。**
> prove の 33 変異はすべて**ローカルで素の env**で撃たれた。
> **CI が立てる env を再現した変異が一つも無かった** —— その一点が BLOCK を通した。

**次の走行への申し送り**: 変異の走者(`reform/gate-fold/prove/mutate.js`)に
**「CI の段の env を再現して撃つ」層(L5)**を足せ。
`tribunal.yml` の各段の `env:` を読み、その env で門束を撃つ —— **yml は既に鍵の材料に入っている**(`fold.js:175`)。
