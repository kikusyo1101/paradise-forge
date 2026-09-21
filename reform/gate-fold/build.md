# 楽園の門の肥大を畳む機構 — build 相

**相**: build / **枝**: `reform/gate-fold` / **基点**: `design.md` §9 の段階表(S-1〜S-9)
**測定機**: Windows 11 + git-bash, node v24.14.0
**この相の分**: **design が決めたものを実装し、建てた門を実際に壊して鳴らす。**

この文書の掟: **撃った命令と生出力を持たない断定を書かない。撃てなかったものは「撃てなかった」と書く**(第37条)。

---

## 0. 基準(着手前に撃った)

```
$ git branch --show-current
reform/gate-fold

$ node tests/paradise.test.js --gate-list | tail -1
Paradise gate list: 492 gates

$ node graph/wiring.js check
  engine 38 / 内の辺 72
  ✓ 門 25 本すべてに走らせる者が居る (第44条)
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
exit=0

$ node graph/hermetic.js check
  ✓ 版管理下の現物を走行中に書き換える門は無い — 同時に走っても答えは一つである
exit=0

$ node graph/abode.js check
  · 除外 1 件: graph/abode.js (…)
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
exit=0
```

**門の本数の推移**(各段階の終わりに撃つ。基準 492):

| 段階 | `--gate-list \| tail -1` |
|---|---|
| 基準 | `Paradise gate list: 492 gates` |

---

## S-1 — `abode.js` に `foldLedger` / `.gitignore` に 2 行

### 作ったもの

| ファイル | 変更 |
|---|---|
| `graph/abode.js` | `KEYS` に `'foldLedger'` / `rebase()` 内に `out.foldLedger = path.join(out.abode, 'paradise-fold-ledger.jsonl')`(`dailyLedger` の隣)/ `resolve()` の `@returns` に 1 欄 |
| `.gitignore` | `.claude/paradise-fold-ledger.jsonl` と `.lock` の 2 行(design §1.6 の註釈つき。`paradise-daily.json` の隣) |

### 撃った命令と生出力

```
$ node graph/abode.js check
  · 除外 1 件: graph/abode.js (住所を作るのが職務 / 資格の裏付け: function resolve+function pathFor+function globalWrite+module.exports を輸出している / homedir 呼び出し 1 箇所)
  ✓ 逆向き依存は 0 件 — 実機の hooks は楽園の木を指していない (AC-30)
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
  ✓ 門は黙って緑に落ちず、兄弟の engine は同じ口から住所を得ている
exit=0
```

**`fold` を名指した行は一つも無い。** 除外も **1 件のまま**(R-11 の危険が現実化していないことの実測)。

```
$ node -e "console.log(require('./graph/abode.js').pathFor('foldLedger'))"
C:\Users\kikus\Documents\workspace\paradise\.claude\paradise-fold-ledger.jsonl

$ node graph/hermetic.js check
  ✓ 版管理下の現物を走行中に書き換える門は無い — 同時に走っても答えは一つである
exit=0

$ echo '{"probe":1}' > .claude/paradise-fold-ledger.jsonl && git status --porcelain
 M .gitignore
 M graph/abode.js
?? reform/gate-fold/
```

**台帳は `??` に現れない。** `.gitignore` の 2 行が効いている(design §1.2 の `check-ignore` 実験どおり)。

```
$ node tests/paradise.test.js --gate-list | tail -1
Paradise gate list: 492 gates

$ node tests/abode.test.js | tail -1
Abode self-test: 137 passed, 0 failed
```

### 判定

**緑。次へ進んだ。** 門の本数 492(基準どおり)。

---

## S-2 — `graph/fold.js`(鍵・台帳・bail のみ。誰も呼ばない)

### 作ったもの

**新規 `graph/fold.js`**(513 行)。輸出:

| 群 | 輸出 | 何を |
|---|---|---|
| 鍵 | `materials` / `key` / `keyExplain` / `artifactKey` | KF を**走査で**数える(名簿を写経しない)/ 成果物のバイト鍵 |
| 台帳 | `append` / `recordRun` / `read` / `find` / `withLock` / `validateReceipt` | JSONL 追記・錠・形の検め |
| 裁定 | `decide` / `say` / `status` / `BAIL_CODES` | 7 語の閉じた bail / 名乗りの綴り / 機械可読 |
| P-2 | `inspected` | **プロセス内の写像。台帳ではない** |
| P-3 | `pooledBrowserFactory` | 借り物の `browserFactory` 注入口へ渡す器 |
| CLI | `fold-key [--explain]` / `fold-status [--json]` | |

### 撃った命令と生出力

```
$ node graph/fold.js fold-key
63b45578de3d8785

$ node graph/fold.js fold-key --explain | head -20
{
  "key": "63b45578de3d8785",
  "fileCount": 136,
  "bytes": 4713333,
  "env": [
    { "name": "PARADISE_ABODE",   "value": "repo", "via": "abode.resolve().mode", "valueSha": "071ca22277547058" },
    { "name": "PARADISE_ARCHIFY", "value": "",     "via": "env",                  "valueSha": "e3b0c44298fc1c14" }
  ],
  "files": [ { "file": ".github/workflows/tribunal.yml", "sha": "82d6ec6c614bf7f8", "bytes": 32010 }, …
```

**材料 136 本 / 4.49 MiB。** design §2.3 の実測は 135 本 —— **差 1 は `graph/fold.js` 自身**である
(自分も `graph/**.js` の材料に入る。鍵が自分の中身に依るのは正しい: `fold.js` が変われば畳みの意味が変わる)。

```
$ node -e "…7 回測る…"
鍵の計算 中央 8.6ms (最小 7.7 / 最大 16.7)
```

**design §2.3 の予測 8.5ms と一致**(8.6ms)。P-1 の取り分 843,000ms の 0.001%。

```
$ node graph/fold.js fold-status
fold: Executed 1 out of 1 runs (0 reused, bail=no-receipt)
  台帳: …\.claude\paradise-fold-ledger.jsonl (領収書 0 行)

$ node graph/fold.js fold-status --json
{ "total": 1, "executed": 1, "reused": 0, "key": "63b45578de3d8785",
  "bails": [ { "code": "no-receipt", "subject": "paradise.test.js" } ],
  "receipts": 0, "ledger": "…" }
```

**台帳が空なので `bail=no-receipt`。** これが初期状態である(AC-08)。

台帳の往復(作り物の台帳で撃つ。現物を汚さない):

```
$ PARADISE_FOLD_LEDGER=$LOCALAPPDATA/Temp/fold-probe.jsonl node -e "…"
ledger= C:\Users\kikus\AppData\Local/Temp/fold-probe.jsonl
appended {"at":"2026-09-20T20:33:15.547Z","key":"a4cf0d2d32b44752","exit":0,"summary":"probe"}
read 1 rows
find true
decide {"fold":true,"bail":null,"key":"a4cf0d2d32b44752","receipt":{…}}
```

出口と `=global` の境(AC-10 / AC-18 の**機構側**の実測):

```
$ PARADISE_ABODE=global node -e "console.log(JSON.stringify(require('./graph/fold.js').decide()))"
{"fold":false,"bail":"undeclared-state","mode":"global","key":null,"receipt":null}

$ PARADISE_NO_FOLD=1 node -e "…decide()…"
{"fold":false,"bail":"disabled","key":null,"receipt":null}
```

`=global` では **鍵も台帳も見ずに** `undeclared-state` を返す(`key:null` がその証拠)——
「条件次第で畳める機構」にしないための構造である(AC-10)。

### ★ 設計どおり赤になったもの(S-2 の正しい姿)

```
$ node graph/wiring.js check
  engine 39 / 内の辺 74
  🔴 孤児 1: fold
      誰も require せず、門も命令も試験も散文もその名を呼ばない。
  ✓ 門 25 本すべてに走らせる者が居る (第44条)
  🔴 結線が破れている
exit=1
```

**これは正常である**(design §9 の警告 / D-4 ケース 1)。
緑になっていたら孤児判定が壊れている —— **赤を期待する段階なので、赤いことを記録して進む**(第37条)。

### 設計から外れた箇所 — **1 件あり**

**`abode.js check` が `graph/fold.js` の書き込み 4 行を名指して exit 1 になった。**
design §12 はこれを予見していない(§9 の S-2 の緑の条件にも `abode.js check` は無い)。生出力:

```
$ node graph/abode.js check
✗ 外へ書きうる engine が関門を通っていない (4 行) — AC-55 / 第58条(f)
  graph/fold.js  (4 箇所)
    graph/fold.js:216  try { fs.rmSync(lock, { force: true }); } catch {}
    graph/fold.js:226  try { return fn(); } finally { try { fs.closeSync(fd); } catch {} try { fs.rmSync(lock, …
    graph/fold.js:252  try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch {}
    graph/fold.js:253  withLock(file, () => fs.appendFileSync(file, line), opts);
```

**設計の誤りではなく、設計が触れていなかった掟である。** `abode.js:1032` の `outwardRefs()` は
「`./abode.js` を require し、かつ書く口を持つ engine が `guardWrite(` も `globalWrite(` も
含まないなら書く行を名指す」。design §1.4 は `abode.pathFor` を通すことだけを決め、
**住所を引いた者が関門も通らねばならないこと**(第58条(f) / AC-55)を書いていなかった。

**採った処置**: 先例 `daily-guard.js:82` と同形に `withLock()` の冒頭で
`abode.guardWrite(lock, …)` と `abode.guardWrite(file, …)` を撃つ。処置後:

```
$ node graph/abode.js check
  · 除外 1 件: graph/abode.js (…)
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
exit=0
```

**除外は 1 件のまま**(R-11 が現実化していない)。
副作用として **`mode=global` では台帳への書き込みが throw する** ——
台帳 `abode.json` にその宛先が無いからである。これは欠陥ではなく、
AC-10 の「畳める経路が物理的に無い」ことの住所の側からの現れである(`fold.js` の註釈に記した)。

### 本数と他の門

```
$ node tests/paradise.test.js --gate-list | tail -1
Paradise gate list: 492 gates
$ node graph/hermetic.js check   → exit 0
```

### 判定

**S-2 の緑の条件を満たした**(key が出て exit 0 / wiring は 🔴 孤児 1: fold)。次へ進んだ。

---

## S-3 — `tests/fold.test.js` + `tribunal.yml` の `📒 Fold` 段

### 作ったもの

**新規 `tests/fold.test.js`**。AC-01/02/03/05/06/07/08/09/16/17/18/19/23/25/26/27 の 16 本
(design §8 の表のうち `tests/fold.test.js` 側の全部)。冒頭の docblock に **AC-27 の盲点 3 つ**を名乗る。

`.github/workflows/tribunal.yml` に **`📒 Fold` 段**を新設(`🔢 Census` の直後)。
`PARADISE_NO_FOLD: '1'` と `PARADISE_FOLD_LEDGER: ${{ runner.temp }}/fold-gate-ledger.jsonl`。
併せて **C-1**(Self-test 段の env)と **C-2**(Census 段の env)も置いた。

### ★ 設計どおり赤のままのもの(S-3 の正しい姿)

```
$ node graph/wiring.js check
  engine 39 / 内の辺 74
  🔴 孤児 1: fold
  ✓ 門 25 本すべてに走らせる者が居る (第44条)     ← 門の孤児は CI の段で消えた
  🔴 結線が破れている
exit=1
```

**D-4 のケース 3 と一字一句同じ形である。** CI の段を足しても **engine の孤児は消えない** ——
消すには `require` が要る(S-5 でそうなる)。**赤いことを記録して進む**(第37条)。

### 実装の途中で門が自分を鳴らした(2 件。いずれも門の方を直した)

**① 常駐の門 `hermetic` が `tests/fold.test.js` の 4 行を名指した。**

```
✗ hermetic: 楽園の門は今この瞬間、版管理下の現物を汚していない (第58条(c))
+ [ 'tests/fold.test.js:83 fs.writeFileSync(mut)', 'tests/fold.test.js:84 fs.rmSync(mut)',
+   'tests/fold.test.js:585 fs.writeFileSync(mut)', 'tests/fold.test.js:591 fs.rmSync(mut)' ]
```

故障注入の写しを `graph/.fold-probe-<pid>.js` に置いていた(`paradise.test.js:10825` の
F-1 門と同じ手口を真似た)。だが F-1 門の写しは `tests/` の中でも `hermetic` の
`prefix` 判定を通る形だったのに対し、こちらは通らなかった。
**処置**: 写しを仮倉(`mkdtempSync` 配下)へ移し、写しの中の相対 `require` を
**絶対の道へ書き換えてから**置く(そうしないと読み込みの時点で落ち、
「落ちたこと」を「鳴ったこと」と誤読する —— 第37条)。処置後 `hermetic.audit().violations` は `[]`。

**② AC-19 の門が census / atlas を 6 分待たせた。**
`census.js check --no-fould` を素朴に撃つと、旗を黙殺する実装は **`check` の本体
(自己診断の全走 ≒ 6 分)へ進んでしまう**。門が自分で 6 分払うのは門の形の誤りである。
**処置**: `timeout: 20000` を置き、**`killed === true`(= 打ち切られた)を「黙殺した」と読む**。
速さのためではない —— **進んでしまったこと自体が黙殺の証拠である**(第16条)。

### 判定

**S-3 の緑の条件**(門が緑 / wiring はまだ 🔴 孤児 1: fold)——
門の緑は S-5 まで待つ(領収書の刻みと census の結線が未了のため 6 本が正しく赤い)。
**その赤は「まだ作っていないものを門が正しく名指している」赤である**。次へ進んだ。

---

## S-4 — `paradise.test.js` に FOLD 宣言 / `--no-fold` の受理 / 領収書の刻み / 恒等式の錠

### 作ったもの(**CRLF なので置換が当たったかを毎回数えた**)

| 位置 | 何を |
|---|---|
| `:46` 付近(塊の**中**) | `if (a === '--no-fold') { noFold = true; continue; }` の**受理 1 行**+ 註釈。**`process.env` の綴りを一字も含まない** |
| `:42` / `:64` | `let list = false, noFold = false;` / `return { list, noFold, … }` |
| `:137`(終了マーカーの**直後**) | `const FOLD = { off: … }`。**塊の外**(D-3 の V4) |
| `:139-` | 畳みの判断 + **恒等式の錠**(`E + reused !== N` なら `process.exit(2)`)。`test()` の外 |
| 報告の枝(`!GATE.active` の中) | `fold.recordRun({ key, exit, summary })` |

置換の当たりを数えた生出力:

```
$ node <s4-patch.js>
changed bytes 273
hits noFold 3
$ node <s4-patch2.js>
fold block hits  : 1
recordRun hits   : 1
require fold hits: 1
delta bytes      : 1935
```

**当たったことを確かめてから読んだ**(design §4.2 が踏んだ CRLF の罠を繰り返さないため)。

### 撃った命令と生出力

```
$ node tests/paradise.test.js --gate '^gate-filter:'
  ✓ gate-filter: 絞り込みは環境変数を読まない          ← **これが最重要**
  ✓ gate-filter: census は自己診断を素で呼ぶ
  ✓ gate-filter: マッチ 0 件は緑ではない — exit 2 で鳴る (AC-11 / 第16条)
  ✓ gate-filter: 絞り込んだ走行は Paradise self-test: を名乗らない (AC-13 / 第22条)
  ✓ gate-filter: 絞り込み走行の最終行は census / tribunal の双方に読まれない (AC-14 / 第22条)
  ✓ gate-filter: 名指した門を走らせない走行は測定ではない — 数が閉じる (reflect F-1/F-2)
Paradise gate-filter: 6 of 492 gates matched — 6 green, 0 red
```

**6 本すべて緑。** 塊の中に旗の受理を足しても、環境変数の門は鳴らない(D-3 の V4 の裏づけ)。

```
$ node tests/paradise.test.js --gate-list | tail -1
Paradise gate list: 492 gates

$ PARADISE_FOLD_LEDGER=<仮倉> node tests/paradise.test.js --no-fold --gate-list | tail -1
Paradise gate list: 492 gates          ← exit 0。**塊の die() に落ちていない**

$ node tests/paradise.test.js --no-fould
Paradise gate-filter: unknown flag --no-fould     ← exit 2 (AC-19)
```

**全走(background / 約 6 分)と、刻まれた領収書:**

```
$ PARADISE_FOLD_LEDGER=<仮倉> node tests/paradise.test.js
…
Paradise self-test: 491 passed, 1 failed
EXIT=1
--- ledger ---
{"at":"2026-09-20T21:13:57.320Z","key":"93b26b324288d46c","exit":1,"summary":"Paradise self-test: 491 passed, 1 failed"}
```

**領収書は 4 欄を持ち、`summary` は総括行と一字も違わない。`exit` は 1 を正直に書いた**
—— この領収書では畳まれない(AC-07 / `bail=not-green`)。**それが正しい振る舞いである。**

赤い 1 本は上の S-3 ①(`tests/fold.test.js` の写しの置き場)であり、S-3 で直した。

### 判定

**S-4 の緑の条件のうち「gate-filter 6 本すべて緑」「本数 ≥ 492」は満たした。**
「全走緑」は S-6 の後に撃ち直す(この時点の赤は fold.test.js の置き場であり、直した)。次へ進んだ。

---

## S-5 — `census.js` が `fold.js` を require し台帳を読む(FR-04)

### 作ったもの

| 位置 | 何を |
|---|---|
| `graph/census.js:23` | `const fold = require('./fold.js');` —— **これが engine の孤児を消す辺である** |
| `:123` 付近 | **三項で**領収書を読む。`const receipt = … ? null : fold.find(fold.key());` / `const out = receipt ? receipt.summary : execFileSync(…)` |
| 同 | `Census self-test: Executed …` の名乗り(requirements §4.2) |
| CLI | `--no-fold` の受理 / **未知の旗を exit 2 で拒む**(AC-19) |

**`tests = summaryOf(out)` を通る形を保った** —— `c.tests` が `null` にならないので
`measurable()` は真を返し、**「README テスト数」の主張は裁かれ続ける**(AC-04 の核心)。

### 撃った命令と生出力 — **D-11 が最も危ういと言った門**

```
$ node tests/paradise.test.js --gate '^gate-filter: census'
  ✓ gate-filter: census は自己診断を素で呼ぶ
Paradise gate-filter: 1 of 492 gates matched — 1 green, 0 red
```

**緑。** 三項で包んでも**呼び口 1 箇所 / 引数 1 個**が保たれている(D-11 の案 A)。

```
$ node graph/wiring.js check
  engine 39 / 内の辺 75
  ✓ 門 26 本すべてに走らせる者が居る (第44条)
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
wiring exit=0
```

**wiring が初めて exit 0 になった。** D-4 のケース 4(`census.js` が `./fold.js` を require)と
**内の辺の数まで一致**(72 → 75。fold が census / atlas / paradise.test.js から引かれる)。

### 判定

**S-5 の緑の条件を満たした**(census の呼び口の門が緑 / wiring が初めて exit 0)。次へ進んだ。

---

## S-6 — `paradise.test.js` に常駐の門 7 本(AC-10/14/15/20/21/22/24)

### 建てた門

| AC | 門の名 | 壊し方 |
|---|---|---|
| AC-10 | `fold: 宣言外の状態に依る走行は畳まれない (揟2 / 第37条)` | `fold.js` の `if (mode !== 'repo')` を `if (false)` に潰した写しを子プロセスで撃つ |
| AC-14 | `fold: 総数と実行数は別の数である (第22条 / 揟4)` | 畳んだ走行が `Executed 1 out of 1` と名乗ったら赤 |
| AC-15 | `fold: 数が閉じる — 錠は畳みの関数の外に立つ` | 錠のソース位置(塊の外 / `test()` の外)を静的に読む |
| AC-20 | `fold: 畳みの門番は絞り込みの外に立つ` | `--gate-not '^fold:'` で門番を消した走行を実際に撃つ |
| AC-21 | `fold: 何もかも畳む機構は測定ではない` | 鍵の比較を潰した写しが「領収書が無いのに畳む」ことを撃つ |
| AC-22 | `fold: 改修は門を減らしていない — 本数が基準を下回らない` | 基準 **492** を機械可読に握る。自分がこの一覧に居ることも見る |
| AC-24 | `fold: 台帳の番兵は汚した門を名指す` | 現物の指紋を前後で照合 / 作り物の台帳で歯を撃つ / `CURRENT_GATE.name` を握る |

### 撃った命令と生出力

```
$ node tests/paradise.test.js --gate '^fold:'
畳みの機構 (fold / reform/gate-fold):
  ✓ fold: 宣言外の状態に依る走行は畳まれない (揟2 / 第37条)
  ✓ fold: 総数と実行数は別の数である (第22条 / 揟4)
  ✓ fold: 数が閉じる — 錠は畳みの関数の外に立つ
  ✓ fold: 畳みの門番は絞り込みの外に立つ
  ✓ fold: 何もかも畳む機構は測定ではない
  ✓ fold: 改修は門を減らしていない — 本数が基準を下回らない
  ✓ fold: 台帳の番兵は汚した門を名指す
Paradise gate-filter: 7 of 499 gates matched — 7 green, 0 red

$ node tests/paradise.test.js --gate-list | tail -1
Paradise gate list: 499 gates        ← 492 + 7。**一本も減っていない**
```

### 建てた門が自分を鳴らした(1 件。門の方を直した)

AC-15 の門が最初 **赤** だった:

```
  ✗ fold: 数が閉じる — 錠は畳みの関数の外に立つ
      錠が test() の内側に移った — 門が選び落とされれば錠も黙る (AC-15 / 第56条 b)
```

**判定式の誤りだった。** 錠は `:139`(**どの `test(` よりも前**)に在る。
`beforeLock.lastIndexOf('\ntest(')` が `-1` を返し、`lastClose(-1) > lastTest(-1)` が偽になる。
**門が「最上位に在る」という最も正しい姿を赤と呼んでいた**(偽の赤 / 第62条 b)。
**処置**: `lastTest === -1 || lastClose > lastTest` に直した。門の位置は変えていない。

### 判定

**S-6 の緑の条件を満たした**(7 本緑 / 本数 492 + 7 = 499)。次へ進んだ。

---

## S-7 — `atlas.js` の `--all-scales` と成果物ハッシュの畳み(P-2)

### 作ったもの

| 位置 | 何を |
|---|---|
| `graph/atlas.js:40` | `const fold = require('./fold.js');` |
| `check()` | 成果物の**バイト鍵**で `firstScreen` / `motionAlive` を畳む。呼び手が `inspected` を渡せば**道をまたいで**畳める |
| `checkAllScales()` | **新設**。6 道を 1 プロセスで回し、写像を共有する |
| CLI | `--all-scales` / `--no-fold` / **未知の旗を exit 2 で拒む**(AC-19)/ `Atlas inspect:` の総括行 + **恒等式の錠** |
| `tribunal.yml:137-143` | `for` ループ 6 プロセス → `node graph/atlas.js check --all-scales` の 1 命令 |

### 撃った命令と生出力 — **AC-11 の綴りがそのまま出た**

```
$ node graph/atlas.js check --all-scales
═══ 🗺  ATLAS GATE (第47条) ═══
── scale: quick ──
  ✓ hierarchy   [architecture] 9/9  fits          動 29   734697b
  ✓ conclave    [workflow    ] 9/9  fits          動 22   731008b
  ✓ dispatch    [sequence    ] 9/9  fits          動 14   727484b
  ✓ dag         [architecture] 9/9  scroll(3944px)動 11   722074b
  ✓ run         [lifecycle   ] 9/9  fits          動 13   726618b
  ✓ wiring      [architecture] 9/9  scroll(3211px)動 115  790340b  standard(最小交差 191)
── scale: standard ──
  ✓ hierarchy   [architecture] 9/9  fits          動 29   734697b  (reused: html=d185c1ff4425b032 ← hierarchy@quick)
  ✓ conclave    [workflow    ] 9/9  fits          動 26   734202b
  ✓ dispatch    [sequence    ] 9/9  fits          動 14   727484b  (reused: html=fe4450eb25974fc3 ← dispatch@quick)
  …
────────────────────────────────
Atlas inspect: Executed 32 out of 72 inspections (40 reused)
  ✓ 36 主題すべてが検査に通る（うち 7 件は平面化不能のため standard: wiring, dag）
EXIT=0
```

**`Atlas inspect: Executed 32 out of 72 inspections (40 reused)`** —— AC-11 が要求した綴りである。
D-12 の予測と**一字一句同じ**。恒等式 32 + 40 == 72 も閉じた(AC-15)。

AC-12 の判定基準も撃った:

```
$ grep -c 'reused: html=' <出力>
20
```

**20 行 × 1 主題あたり 2 検査 = 40 = 畳んだ件数。一致する。**

単道が従来どおり緑であること(R-10 の確認):

```
$ node graph/atlas.js check --scale quick
  ✓ hierarchy … ✓ conclave … ✓ dispatch … ✓ dag … ✓ run … ✓ wiring
Atlas inspect: Executed 12 out of 12 inspections (0 reused)
  ✓ 6 主題すべてが検査に通る（うち 1 件は平面化不能のため standard: wiring）
EXIT=0
```

**単道では 1 回も畳めない**(0 reused)—— D-7 の実測「道の中には畳める対が 0 件」の再現である。

```
$ node graph/atlas.js check --no-fould
Atlas: unknown flag --no-fould — 知らない旗を黙って通せば、切ったつもりの機構が走り続ける (AC-19)
exit=2
```

### ★ 実装が自分の誤りを鳴らした(**偽の緑を一歩手前で捕まえた**)

最初の `--all-scales` の生出力:

```
Atlas inspect: Executed 16 out of 72 inspections (56 reused)
  🔴 wiring      [architecture] 9/9  scroll(3211px)静止     790340b  (reused: html=57817253cea0f79c ← wiring@quick)
       — 動きは名乗らねば宿らない。meta.animation:"trace" を宣言せよ (第50条)
EXIT=1
```

**32 ではなく 16。そして全主題の動きが `静止` / `動 0` に化けた。**

**原因**: `firstScreen` と `motionAlive` に**同じ鍵**(`htmlKey`)を渡していた。
1 主題あたりの検査は 2 回であり、**別の問いに別の答えを出す**。
同じ鍵で写せば 2 本目が 1 本目の答えを受け取る —— **畳みが裁定を捏造した**。

> これは requirements R-1/R-4 が警告した「偽の緑」そのものの形である。
> **ただし今回は偽の赤として現れた**(`静止` と誤判定して exit 1)。
> 逆向きであれば `🔴` が `✓` に化けていた。**第37条の危険は両方向に効く。**

**処置**: 鍵に**検査の種別**を混ぜる(`<sha16>#first-screen` / `<sha16>#motion`)。
裁定行に出す写し元は `split('#')[0]` で成果物の鍵だけを見せる(AC-12 の綴りを保つ)。
処置後 **32 / 40 / 72** が出た。

### 判定

**S-7 の緑の条件を三つとも満たした**(`Executed 32 out of 72` / 恒等式 / 単道も従来どおり緑)。次へ進んだ。

---

## S-8 — `fold.js` の `pooledBrowserFactory`(P-3)

### 作ったもの

`graph/fold.js` に `pooledBrowserFactory(opts)` を置いた(design §7.2 の形)。
`close()` だけを無力化する `Proxy` の覆い + **`finally` から呼ぶ `dispose()`**。
`opts.load` を持つのは、門が**借り物の Chrome を起こさずに**持ち回しの形を撃てるようにするためである。

`tests/fold.test.js` に AC-13 の門を建てた(`fold: 持ち回しは検査を減らさない — 裁定の本数が一致する`)。

### ★ **設計 §7.1 / §12 は実装できなかった。誤りの所在を生出力で示す**

design §12 は `graph/atlas.js:1420` で「`firstScreen` に `browserFactory` を通す(P-3)」と命じる。
**通せない。** `firstScreen` は借り物の **CLI を別プロセスとして**起こすからである:

```
$ sed -n '1271,1277p' graph/atlas.js
function firstScreenOnce(htmlPath) {
  const bin = archifyPath();                       // **呼ばれた時に**解決する
  try {
    const raw = execFileSync(process.execPath, [bin, 'visual-check', htmlPath, '--json'], {
      cwd: path.dirname(path.dirname(bin)), encoding: 'utf8',
      env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1' },
    });
```

そして借り物の CLI は `browserFactory` を**受け取らずに**呼ぶ:

```
$ sed -n '1264,1267p' overlay/vendor/archify/bin/archify.mjs
  let result;
  try {
    result = await runVisualCheck({ artifactPath: positional[0] });
  } catch (error) {
```

**`runVisualCheck({ artifactPath })` —— 第 2 の引数は無い。** `browserFactory` の注入口は
`visual-check.mjs:721-725` に確かに在るが、**`archify.mjs` の CLI 経路はそこへ何も渡さない。**
プロセスの境も跨げない(関数は `execFileSync` を越えられない)。

**design §7.1 の「ゆえに書き換えは要らない。外から `browserFactory` を渡すだけである」は、
`runVisualCheck` を JS から直に呼ぶ道(D-6 の実測器 `d6-pool-leak.mjs` がまさにそれ)についてのみ真である。**
`atlas.js` は CLI 経由なので当てはまらない —— **D-6 は借り物を直に import して測っており、
atlas の実際の呼び経路を測っていなかった。**

通すには三つの道しかなく、**どれも採れない**:

| 道 | なぜ採らないか |
|---|---|
| `archify.mjs` に `browserFactory` を渡す行を足す | **借り物に一行も触れるな**(第20条 / requirements §7-7)。**禁則である** |
| `atlas.js` が `visual-check.mjs` を直に import する | 借り物の**CLI が提供する契約**(受領書の綴り・sidecar の掃除・exit の写し方)を楽園側に写経することになる。第29条 / 第48条。**写経した契約は借り物が変わった日に黙って壊れる** |
| `PARADISE_ARCHIFY` で楽園側の包みを指す | 包みは**鍵の材料**(`overlay/vendor/archify/**`)の外に住むので、**描画器が変わっても鍵が動かない**。§2.4 が「入れる」と裁定した理由そのものを壊す |

**採った代替**: **P-3 の器は作り、結線は保留する。**

- `fold.pooledBrowserFactory()` は**在り、門が振る舞いを撃っている**(AC-13 は緑)。
  持ち回しが 1 実体を配ること / `close()` が素通しされないこと / `dispose()` が本物を閉じることを実測。
- `atlas.js` の `firstScreen` 経路には**結線していない**。
- **P-3 の取り分は 17.2s / 0.8% である**(requirements §1.2 / M-4)。
  P-2 が効いた後は検査が 72→32 に減っており、持ち回しの余地はさらに縮む
  (design §7.4 が `motionAlive` について述べたのと同じ論)。
- **これは見逃しではなく、名を持つ残債である**(第62条 c)。
  借り物 `archify` の次の版が CLI に `--browser-pool` 相当の口を持てば、そこで結線できる。

> **第37条により、結線していないものを「P-3 を実装した」と呼ばない。**
> 削減見込みの合計は **P-1+P-2 = 1,022.5s (49.4%) → 残り 1,047.5s** であり、
> requirements §1.2 の「P-1+P-2 で 1,047.5s 以下」(AC-26 の目標値)**そのものである** ——
> **本改修は目標を下げていない。**

### 撃った命令と生出力

```
$ node tests/motion-probe-leak.test.js
  ✓ AC-23a: 作法を使っている — child.kill() が 0 件、browser.close() が 1 件以上
      実測: BEFORE=94 AFTER=94 差=0
  ✓ AC-23b(本命): 検器を 1 回走らせる前後でプロファイル数の差が 0
      実測: chrome BEFORE=0 AFTER=0
  ✓ AC-23c: headless Chrome を残さない(前後の差が 0)
  ✓ AC-23e(壊して鳴る): close() を kill() に戻せばこの門が赤くなる
  ✓ AC-23g: atlas を 1 主題通した前後でも累積 0
  ✓ AC-23h(本命の再発): 検器を起こせない環境でも残骸を残さない
motion-probe-leak: 6 passed, 0 failed
EXIT=0
```

**プロファイル残 0(94 → 94)。** S-7 の `--all-scales` を走らせた後でも漏れていない。

`--all-scales` の裁定が S-7 と一字一句同じであることは、S-7 の生出力
(`Executed 32 out of 72 inspections (40 reused)` / `✓ 36 主題すべてが検査に通る`)が示す ——
**P-3 を結線していないので、裁定が変わる余地が構造的に無い。**

### 判定

**S-8 の緑の条件のうち「プロファイル残 0」は満たした。**
「裁定が S-7 と一字一句同じ」は**結線していないので自明に満たす**が、
**それは P-3 を測ったことにはならない**(第37条)。上の残債として記した。

---

## S-9 — `tribunal.yml` の Abode を 2 段に割る / 全段の env / 四つの命令

### 作ったもの(CI の 5 箇所すべて。design §5 の一覧に対応)

| # | 位置 | 変更 |
|---|---|---|
| **C-1** | `:26-27` | Self-test 段に `PARADISE_FOLD_LEDGER` の env(**名乗りは変えない**。`--no-fold` は書かない) |
| **C-2** | `:122-123` | Census 段に同 env |
| **C-5** | `:125` の直前 | **`📒 Fold` 段を新設**。`PARADISE_NO_FOLD: '1'` / `runner.temp` の作り物の台帳 |
| **C-3** | `:137-143` | Atlas 段を `node graph/atlas.js check --all-scales` の 1 命令に |
| **C-4** | `:274-278` | **Abode(両居)を 2 段に割った**。repo 段は台帳を受け取り、**global 段は受け取らない** |
| **C-6** | `:439` | **触っていない**(requirements §7-5。別 job / 別 runner) |

### 撃った命令と生出力(S-9 の緑の条件: 四つとも exit 0)

```
$ node graph/wiring.js check
  engine 39 / 内の辺 75
  ✓ 門 26 本すべてに走らせる者が居る (第44条)
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
EXIT=0

$ node graph/hermetic.js check
  ✓ 版管理下の現物を走行中に書き換える門は無い — 同時に走っても答えは一つである
EXIT=0

$ node graph/abode.js check
  · 除外 1 件: graph/abode.js (…)          ← R-11: 除外は増えていない
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
EXIT=0

$ PARADISE_FOLD_LEDGER=<仮倉> node tests/paradise.test.js
Paradise self-test: 499 passed, 0 failed
EXIT=0

$ PARADISE_FOLD_LEDGER=<仮倉> node graph/census.js check
Census self-test: Executed 0 out of 1 runs (1 reused, key=6157ddb61a894011)
  ✓ every number the paradise claims about itself is true
EXIT=0

$ PARADISE_FOLD_LEDGER=<仮倉> node tests/paradise.test.js --no-fold
Paradise self-test: 499 passed, 0 failed
EXIT=0

$ PARADISE_FOLD_LEDGER=<仮倉> node tests/fold.test.js
Fold self-test: 20 passed, 0 failed
EXIT=0
```

### **畳みが実際に効いたことの生出力**(P-1 の本体)

一つの台帳で Self-test → Census → Abode(repo) の順に撃った:

```
$ cat <台帳>
{"at":"2026-09-20T21:55:28.991Z","key":"6157ddb61a894011","exit":0,"summary":"Paradise self-test: 499 passed, 0 failed"}

$ PARADISE_FOLD_LEDGER=<同じ台帳> node graph/census.js check
Census self-test: Executed 0 out of 1 runs (1 reused, key=6157ddb61a894011)

$ PARADISE_FOLD_LEDGER=<同じ台帳> PARADISE_ABODE=repo node tests/paradise.test.js
Paradise fold: Executed 0 out of 1 runs (1 reused, key=6157ddb61a894011)
Paradise fold: 写し元の領収書 at=2026-09-20T21:55:28.991Z exit=0 key=6157ddb61a894011
EXIT=0
```

**`=repo` の全走が畳まれ、門の本体が一本も走らずに終わった**(AC-09)。
**素と `=repo` が同じ鍵になっている**(design §2.6 の `resolve().mode` の裁定が実際に効いた)。

`=global` は同じ台帳を渡しても畳まれない(AC-10):

```
$ PARADISE_ABODE=global node tests/paradise.test.js
Paradise fold: Executed 1 out of 1 runs (0 reused, bail=undeclared-state)
…
Paradise self-test: 491 passed, 3 failed, 5 skipped
Paradise fold: 領収書を刻まない — 住処が倉の外を指すので台帳への経路が無い
  (宣言外の状態に依る走行は畳めない / AC-10 / 第58条 f)
```

**`reused` の語は一度も出ない。** `=global` の赤(findings §1.3 の既知の環境差)は畳みで
上書きされていない —— **これが AC-10 の眼目である。**

### ★ AC-04 が本番で自分を証明した(**最も重い実測**)

畳んだ census を撃ったら、**赤くなった**:

```
$ PARADISE_FOLD_LEDGER=<台帳> node graph/census.js check
Census self-test: Executed 0 out of 1 runs (1 reused, key=6157ddb61a894011)
  🔴 README テスト数: doc says 492, reality is 499  (README.md)
EXIT=1
```

**畳んでもなお、第22条の旗艦の数が裁かれている。**
`--no-tests` の罠(M-5: exit 0 / findings 0 を出すが `measurable=false` で無検査)を
構造的に回避できていることの、**本番の証拠**である(AC-04 の核心)。

`node graph/census.js fix` で README を 492 → 499 に直し(門を 7 本足したのだから正しい)、再裁定で緑。

### 実装が自分を鳴らした(2 件。いずれも直した)

**① 錠の待ちが短すぎた(偽の赤)。**

```
  ✗ fold: 台帳は並行追記で壊れない
      並列度 4: 書き手が exit 1,0,0,0 で死んだ
```

`waitMs=5000` では 8 本 × 30 回 = 240 回の取り合いを捌けなかった。
**「壊れた」ではなく「待てなかった」を赤として報告していた**(第62条 b)。
**処置**: 上限を 60,000ms へ、待ちの刻みを乱数で散らす(同時に起きた者が同時に起き直すのを避ける)。

**② 畳みが既存の門の前提を奪った(真の赤)。**

```
  ✗ census: 名乗りが無ければ null — 保険経路は死んでいる (第58条(d) / L-26)
      打ち切られた走行から部分値を拾っている
      + { failed: 0, passed: 499, … }   - null
```

この門は `census.check({ runTests: true, testTimeoutMs: 1 })` で**必ず打ち切らせて**
「部分出力を拾わないこと」を裁いていた。**畳みが効くと子プロセスが起きないので打ち切りが起きない。**
**処置**: 門に `noFold: true` を渡す。**測りたい経路を名指しで開けるのが門の作法である**(第16条)。
門の契約は 1 ミリも緩めていない —— 畳みを切った世界で、従来どおり打ち切りを観測して裁く。

### ★ 門が環境差で偽の赤を出した(2 本。門の方を直した)

`PARADISE_ABODE=global` の全走で、S-6 で建てた常駐の門が 2 本赤くなった:

```
$ PARADISE_ABODE=global node tests/paradise.test.js --gate '^fold: (総数|何もかも)'
  ✗ fold: 総数と実行数は別の数である (第22条 / 揟4)   — 前提が崩れた — 畳める状態を作れていない
  ✗ fold: 何もかも畳む機構は測定ではない            — 'undeclared-state' !== 'key-miss'
```

**門が周囲の `PARADISE_ABODE` を継いでいた。** 裁く対象は「畳めるときの名乗り」であって
「この機の住処」ではない。**環境差が生む偽の赤は、真の赤より有害である**(第62条 b)。
**処置**: 門が `env: { ...process.env, PARADISE_ABODE: 'repo' }` を**宣言して**撃つ(鍵も同じ宣言で採る)。処置後:

```
$ PARADISE_ABODE=global node tests/paradise.test.js --gate '^fold:'
Paradise gate-filter: 7 of 499 gates matched — 7 green, 0 red
```

### 判定

**S-9 の緑の条件(四つとも exit 0)を満たした。**

---

## 建てた門の一覧と、壊して鳴らした証拠

**27 本**(`tests/fold.test.js` 20 本 + `tests/paradise.test.js` 常駐 7 本)。
design §8 の表の名の通りに建てた。**壊し方は全部実際に撃ち、鳴ることを確かめた。**

| AC | 門の名 | 住処 | 壊し方(実際に撃った) | 鳴ったか |
|---|---|---|---|---|
| AC-01 | `fold: 全走は領収書を刻む` | fold.test | `append()` の本体を空にした写しを子で撃つ → `rows=0` | ✅ |
| AC-02 | `fold: 絞り込み走行は領収書を刻まない` | fold.test | 絞り込み走行を**実際に撃って**台帳の行数を前後で数える / 刻みの位置を静的に読む | ✅ |
| AC-03 | `fold: 鍵は中身から採る — 註釈一行で鍵が動く` | fold.test | 内容ハッシュを抜いた写し → `moved=false` / 算法に git が現れないことを静的に読む | ✅ |
| AC-04 | `fold: 畳んだ census は第22条を裁き続ける` | **本番で実証** | 畳んだ census が README の 492→499 の食い違いを **exit 1 で捕まえた**(S-9 の生出力) | ✅ |
| AC-05 | `fold: 住処の宣言は鍵に効く` | fold.test | 住処を鍵から抜いた写し → `same=true` / **素 ≡ repo** も撃つ | ✅ |
| AC-06 | `fold: 鍵の材料は数え直せる` | fold.test | env の欄を消した写し → `hasEnv=false` / 二つの走行を diff して理由を特定 | ✅ |
| AC-07 | `fold: 緑しか畳まない — 赤い領収書は再走を呼ぶ` | fold.test | `exit === 0` の条件を外した写し → `fold=true` | ✅ |
| AC-08 | `fold: 領収書の無い畳みは存在しない` | fold.test | 不在の検めを外した写し → `fold=true receipt=true` | ✅ |
| AC-09 | `fold: =repo は鍵が合えば畳まれる` | fold.test | 入力を変えて `bail=key-miss` に戻ることを撃つ | ✅ |
| AC-10 | `fold: 宣言外の状態に依る走行は畳まれない` | **paradise.test** | `if (mode !== 'repo')` を `if (false)` に潰した写し → `fold=true` | ✅ |
| AC-11 | `fold: 畳みの鍵は成果物のバイト列である` | fold.test | 1 主題だけ道ごとに別バイトに化ける細工 → 実行数 32 → **42** | ✅ |
| AC-12 | `fold: 写した裁定は元を名指す (第21条 b)` | fold.test | 写し元の鍵と**主題@道**を名乗ることを撃つ / atlas の綴りを静的に読む | ✅ |
| AC-13 | `fold: 持ち回しは検査を減らさない` | fold.test | 覆いが `close()` を素通しすれば赤 / `dispose()` が本物を閉じなければ赤 | ✅ |
| AC-14 | `fold: 総数と実行数は別の数である` | **paradise.test** | 畳んだ走行が `Executed 1 out of 1` と名乗れば赤 | ✅ |
| AC-15 | `fold: 数が閉じる — 錠は畳みの関数の外に立つ` | **paradise.test** | 錠の位置(塊の外 / `test()` の外)を静的に読む | ✅(**自分が偽の赤を出し、門を直した**) |
| AC-16 | `fold: bail は閉じた語彙で名乗る (揟5)` | fold.test | **台帳をディレクトリに置き換えて** `ledger-unreadable` / 語彙外の bail を出す写し → `threw:…語彙外` | ✅ |
| AC-17 | `fold: bail は機械可読である` | fold.test | `bails` を文字列だけにした写し → `kind=string` | ✅ |
| AC-18 | `fold: --no-fold は畳みを完全に切る (揟6)` | fold.test | **実際に走行を撃って** `reused` の語が出ないことを見る / 三者の綴りを読む | ✅ |
| AC-19 | `fold: 綴り違いの旗は黙殺されない` | fold.test | `--no-fould` を三者に撃つ。**打ち切られた = 黙殺された**と読む | ✅ |
| AC-20 | `fold: 畳みの門番は絞り込みの外に立つ` | **paradise.test** | `--gate-not '^fold:'` で門番を消した走行を**実際に撃つ** | ✅ |
| AC-21 | `fold: 何もかも畳む機構は測定ではない` | **paradise.test** | 鍵の比較を潰した写し → 領収書が無いのに `fold=true` | ✅ |
| AC-22 | `fold: 改修は門を減らしていない` | **paradise.test** | 基準 **492** を機械可読に握る / 自分が一覧に居ることも見る | ✅ |
| AC-23 | `fold: 全走が一本も走らない CI は測定ではない` | fold.test | CI の段を割って**素の全走**を数える。**註釈を剥いでから読む** | ✅(**註釈を読んで偽の赤を出し、門を直した**) |
| AC-24 | `fold: 台帳の番兵は汚した門を名指す` | **paradise.test** | 現物の指紋を前後で照合 / 作り物の台帳で歯を撃つ / `CURRENT_GATE.name` を握る | ✅ |
| AC-25 | `fold: 台帳は並行追記で壊れない` | fold.test | **並列度 2/4/8 × 30 試行を別プロセスで** / TOCTOU に壊した写しで行が落ちることを撃つ | ✅(**錠の待ちが足りず偽の赤。器を直した**) |
| AC-26 | `fold: 記録なき前後は比較できない` | fold.test | 改善を主張する散文が前後の測り方と基準値を持つことを撃つ | ✅ |
| AC-27 | `fold: 門は己の盲点を名乗る (第62条 a)` | fold.test | 盲点①の記述を空にした写しを撃つ → exit != 0 で「盲点」を名乗る | ✅ |

---

## `--gate-list` の本数の推移

| 段階 | 本数 | 備考 |
|---|---|---|
| 基準(着手前) | **492** | NFR-01 の基準値 |
| S-1 の後 | 492 | |
| S-2 の後 | 492 | |
| S-3 の後 | 492 | `tests/fold.test.js` は別ファイル(この数には入らない) |
| S-4 の後 | 492 | |
| S-5 の後 | 492 | |
| **S-6 の後** | **499** | 常駐の門 7 本を足した(492 + 7) |
| S-7〜S-9 の後 | **499** | |

**一度も 492 を下回っていない**(NFR-01 / AC-22)。
加えて `tests/fold.test.js` の **20 本**が `📒 Fold` 段で走る —— **門は合計 27 本増えた。**

---

## 設計から外れた箇所とその理由

**3 件。** いずれも「設計が誤り」ではなく「設計が触れていなかった掟」または
「設計の前提が実際の呼び経路と違った」ものである。

### ① `graph/fold.js` が `abode.guardWrite` を通る(design §1.4 の補い)

design §1.4 は `abode.pathFor` を通すことだけを決めたが、**住所を引いた者は関門も通らねばならない**
(第58条 f / AC-55 / `abode.js:1032` の `outwardRefs()`)。`abode.js check` が 4 行を名指して exit 1 になった。
先例 `daily-guard.js:82` と同形に `withLock()` の冒頭で `guardWrite` を撃った。**生出力は S-2 の章に貼った。**

**副作用が AC-10 を強めた**: `mode=global` では台帳の住所が倉の外を指すので `guardWrite` が拒む。
**「畳める経路が物理的に無い」ことが、住所の層でも保証された。**

### ② **P-3 は器を作り、結線を保留した**(design §7.1 / §12 が実現不能)

**design §7.1 の「外から `browserFactory` を渡すだけでよい」は、`atlas.js` の実際の呼び経路には当てはまらない。**
`firstScreen` は借り物の**CLI を別プロセスで**起こし、`archify.mjs:1266` は
`runVisualCheck({ artifactPath })` と**第 2 の引数を渡さない**。関数はプロセスの境を越えない。
通す三つの道はいずれも第20条 / 第29条 / §2.4 に触れる。**生ソースは S-8 の章に貼った。**

取り分は 17.2s / 0.8%(M-4)。**残債として名を持たせた**(第62条 c)。
**削減見込みの合計 P-1+P-2 = 1,022.5s (49.4%) は AC-26 の目標値 1,047.5s そのものであり、下げていない。**

### ③ Atlas の畳みの鍵に**検査の種別**を混ぜた(design §6.4 の補い)

design §6.4 の疑似コードは `htmlKey` 一つで `fs2` と `mo` の両方を写す形だった。
**そのまま実装したら裁定が捏造された**(`Executed 16 out of 72` / 全主題が `静止` に化けた)。
1 主題あたりの検査は 2 回であり、**別の問いには別の鍵が要る**。**生出力は S-7 の章に貼った。**
`<sha16>#first-screen` / `<sha16>#motion` とし、名乗りは `split('#')[0]` で成果物の鍵だけを見せる(AC-12 の綴りを保つ)。

---

## 未完のもの(第37条 — 正直に書く)

| # | 未完 | なぜ |
|---|---|---|
| **U-1** | **P-3 の結線**(`atlas.js` の `firstScreen` に持ち回しを通す) | 上の②。借り物の CLI が注入口へ何も渡さない。**器と門は在る**が、**結線していない**。取り分 17.2s / 0.8% |
| **U-2** | **AC-26 の前後比較の「後」** | S-10(CI 実走)は教主の分。**基準 2,070s(push の run `35384344207`)に対する「後」は、まだ測っていない。** 測っていないので**改善を主張しない**(第38条 / この build.md は削減「見込み」としか書いていない) |
| **U-3** | **U-1(CI runner で 素 ≡ repo)** | design §2.6 / R-13 が名指した未測定。**ローカルでは実測した**(S-9 の生出力: 素と `=repo` が同じ鍵 `6157ddb61a894011` で畳まれた)が、**CI runner では未測定**。段を 2 つに割ったので、初回の CI で Self-test 段と Abode(repo) 段の領収書を突き合わせれば判る |
| **U-4** | **PR の 5 本目**(`tribunal.yml:439` の執行官 job) | requirements §7-5 が射程外と裁定済み。**触っていない** |

> **測らなかったものを緑と呼んでいない。**
> この文書が「緑」と書いた箇所は、すべて直上に生出力が貼ってある。

---

## 追補 — AC-25 の門が不定に鳴いた。**器の真の欠陥だった**

S-9 の後、`tests/fold.test.js` を繰り返し撃つと **3 回に 1 回ほど** AC-25 が赤くなった:

```
  ✗ fold: 台帳は並行追記で壊れない
      並列度 8: 書き手が exit 0,0,0,0,1,0,0,0 で死んだ
  ✗ fold: 台帳は並行追記で壊れない
      並列度 2: 書き手が exit 1,0 で死んだ
```

**並列度 2 でも出た。** 錠の待ち時間の問題ではない —— **器の欠陥である。**
使い捨ての測定器を書いて掴んだ(現物の門を疑う前に、現物を撃つ):

```
$ node <probe> 2 / 4 / 8
par=2 codes 1,0
errs ERR: EPERM: operation not permitted, open '…lockprobe-p2.jsonl.lock'
lines 54 (期待 60)

par=4 codes 1,0,0,1
errs ERR: EPERM: operation not permitted, open '…lockprobe-p4.jsonl.lock'  (×2)
lines 71 (期待 120)

par=8 codes 0,0,0,0,0,1,0,0
lines 218 (期待 240)
```

**原因**: `withLock` は `openSync(lock, 'wx')` の失敗を **`EEXIST` だけ**待つべき競合として扱っていた。
**Windows は、別の走行が `rmSync(lock)` を撃っている最中に開こうとすると `EPERM` を返す。**
POSIX の綴りしか見ない錠は**そこで待たずに投げ**、書き手が死んで**領収書が落ちた**
(71/120 行 —— 第62条が実測した TOCTOU の破れと同じ形が、別の原因で起きていた)。

**この門が無ければ、台帳は本番で静かに領収書を落としていた。** 第62条の警告そのものである ——
「単一プロセスで撃つ門は競合を見ない。誰も二つのプロセスを同時に起こさなかった」。

**処置**: `EPERM` / `EACCES` も**待つべき競合**として扱う(`graph/fold.js` の `withLock`)。処置後:

```
$ for p in 2 4 8 8 4 2; do node <probe> $p; done
par=2 codes 0,0     lines 60  (期待 60)
par=4 codes 0,0,0,0 lines 120 (期待 120)
par=8 codes 0,…,0   lines 240 (期待 240)
par=8 codes 0,…,0   lines 240 (期待 240)
par=4 codes 0,0,0,0 lines 120 (期待 120)
par=2 codes 0,0     lines 60  (期待 60)

$ for i in 1 2 3; do node tests/fold.test.js | tail -1; done
Fold self-test: 20 passed, 0 failed
Fold self-test: 20 passed, 0 failed
Fold self-test: 20 passed, 0 failed
```

**6 回すべてが期待どおりの行数。門は 3 回連続で緑。**

> ⚠️ **本相で踏んだ測定の罠を記す。** 最初の測定器は heredoc で書いた `w.js` が
> **実際には作られておらず**、子は `MODULE_NOT_FOUND` で死んでいた。
> それを「競合で死んだ」と読みかけた —— **当たらなかった注入で結論してはならない**
> (design §4.2 が CRLF で踏んだのと同じ形)。`errs` を必ず印字する形に直して初めて `EPERM` が見えた。

### 最終の確認(この追補の後に撃ち直した)

```
$ PARADISE_FOLD_LEDGER=<仮倉> node tests/paradise.test.js   → Paradise self-test: 499 passed, 0 failed / EXIT=0
$ PARADISE_FOLD_LEDGER=<仮倉> node graph/census.js check    → ✓ every number … is true / EXIT=0
$ node graph/wiring.js check                               → EXIT=0
$ node graph/hermetic.js check                             → EXIT=0
$ node graph/abode.js check                                → EXIT=0
$ node tests/paradise.test.js --gate-list | tail -1        → Paradise gate list: 499 gates
$ node tests/fold.test.js                                  → Fold self-test: 20 passed, 0 failed / EXIT=0
```

---

## 最後に撃った命令

```
$ git status --porcelain
(空 — 作業木は綺麗。commit 済み / **push はしていない**。PR は教主が開く)

$ git log --oneline -5
622225f feat(fold): 同じ入力の走行を二度撃たない機構 — 台帳・鍵・畳み (reform/gate-fold / build 相)
6641e3b Merge pull request #61 from kikusyo1101/reform/harness-diet-3
7d8fa79 refactor(harness): 引き算(3) — 教主の座 model/effortLevel を神の住処から引く(第7段の裁可待ち 2 キー、神託「進めたい」)
6184d4c Merge pull request #60 from kikusyo1101/reform/harness-diet-2
69f06d3 fix(test): counsel の強い名コーパスから退役した apply-hooks を除く — 消えた engine の門は嘘をつく (AC-37/F-4、CI が正しく赤にした)

$ git branch --show-current
reform/gate-fold
```

**`CLAUDE.md` は書き換えていない。`overlay/vendor/` は一行も触れていない**(第20条)。
`README.md` の 1 行は `node graph/census.js fix` が直した(門を 7 本足したので 492 → 499)——
**手で書いた数ではない。機械が数え直した数である**(第22条)。

**S-10(CI 実走)は教主の分である。** 本相はここで終わる。
