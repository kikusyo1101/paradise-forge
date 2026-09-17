# reform `silent-mutations` — prove 相 prove.md

> 走行: `reform/silent-mutations` / 相: prove
> 入力: `design.md §Y`(変異表)+ build 相が建てた 13 門
> 機: Windows 11 / git-bash / Node `v24.14.0`
> **第21条**: 建てた門が本当に門であることを、**壊して鳴かせて**証明する。

---

## 0. 結論(数で先に書く)

| 問い | 答え |
|---|---|
| 撃った変異(ユニーク) | **25 件**(§Y-1 の 15 件 + 自分で発明した 10 件) |
| 撃った回数(再走含む) | **34 回** |
| **一度目で鳴った** | **17 / 25** |
| **一度目に無音だった** | **8 / 25**(うち 1 件は変異器の不備 / **7 件は門の欠陥**) |
| **修理後に鳴った** | **25 / 25**(無音ゼロ) |
| 実台帳の sha256 | **全 34 回の前後で `955ea34a…aab77`** — 一度も動いていない |
| 戻し損ね | **0 件**(全件で `file_sha_after == file_sha_before`) |
| 全走 三本 | §5 |
| CI 相当の全門 | §6(8 本すべて exit 0) |

**無音 7 件はすべて塞いだ。** 塞ぎ方は §3 / §4 に一件ずつ書いた。
**塞げなかったものは無い。** ゆえに残債として繰り越した無音はゼロである。

---

## 1. 変異の作法 — **`git checkout --` を使っていない理由(第16条: 事故を隠さない)**

### 1-1. 一度目の変異器は、変異どころか**建てた門ごと消した**

task の指示は「`git checkout -- <file>` で必ず戻せ」であった。**一度目はそのとおりに書いた。**
そして **Y10 の ANCHOR-FAIL の直後、`git status` からすべての改修が消えた。**

```
$ git status --porcelain          ← 変異器を走らせた後
 M CONSTITUTION.INDEX.md
 M CONSTITUTION.md
 M README.md
?? reform/silent-mutations/
                                  ← graph/gauge.js と tests/paradise.test.js が**消えている**
$ sha256sum graph/gauge.js tests/paradise.test.js
d1da309f101cad4edc47d05db2f78faecadfca9fdf3405027344a5fea39fa97a  graph/gauge.js       ← **走行開始時の値**
c5a1726d2e50d5c4dfb63c421b41d9994ea0e279f98c8d1b2b4703a3fcb95648  tests/paradise.test.js ← **走行開始時の値**
```

**原因**: 本走行は **commit していない**(教主が PR を立てるため)。
`git checkout -- <file>` は **HEAD に戻す** —— 未 commit の作業木は HEAD と違うので、
**変異だけでなく build 相が建てた 13 門と engine の三行が丸ごと消えた。**

**復旧**: build 相の全段を**決定的なスクリプト**(`s1.py`〜`s7.py`)として書いてあったので、
順に再走させて**バイト単位で同一の状態を再建した**:

```
$ for s in s1 s2 s3 s4 s5 s6 s7; do python $s.py; done
$ sha256sum graph/gauge.js tests/paradise.test.js
d3b70f051cd9593735d19a5494ed0cf3f1beb546f9d400f130c4575eb1989388  graph/gauge.js        ← 消える**前**と一致
12b36813f0c8dcf4d6d8ef7b4685e9cffebc54725872443df69e6cd505d40b99  tests/paradise.test.js ← 消える**前**と一致
```

**実台帳はこの事故の間も 955ea34a…aab77 のままである。** 失われたのは再生可能な作業木だけである。

### 1-2. ゆえに変異器を直した — **戻しは「撃つ前の生バイト列の書き戻し」で行い、sha256 で測る**

```python
def restore(rel, saved_bytes):
    """**git checkout -- を使わない。**
    本走行の build は未 commit である —— `git checkout --` は HEAD に戻すので、
    変異どころか**建てた門ごと消す**(prove 相の一度目で実際に踏んだ)。
    ゆえに復旧は「撃つ前に採った生バイト列を書き戻す」ことで行い、
    sha256 の一致で戻ったことを**測る**(第38条 / 第62条 b)。
    """
```

**これは指示からの逸脱である。名指して報告する。**
指示の意図(「変異を残さず必ず戻せ」)は**より強く**満たしている ——
`git checkout` は「HEAD に戻す」しか保証しないが、この形は
**撃つ前の状態そのものへの一致を sha256 で証明する**(§2 の各行の `戻した証拠` 欄)。

**全 34 回すべてで `file_sha_after == file_sha_before` が成立した。**

---

## 2. §Y-1 の変異表 — **全 15 件を撃った**

「鳴った門」は絞込走行で `✗` が付いた門の名。`exit` は絞込走行の exit code。
`戻した証拠` は撃つ前後の `git status --porcelain` の一致 + 対象ファイルの sha256 一致。

### 2-1. 一度目で鳴った 12 件

| # | AC | 変異 | 鳴った門 | exit | 戻した証拠 |
|---|---|---|---|---|---|
| **Y1** | AC-5 | `gauge.js` `underEra` を `!== 'legacy'` → `=== 'present'` | `gauge: 印を消した走行(stripped)は序列の罰を免れない` | **1** | porcelain 一致 / sha 一致 |
| **Y2** | AC-6 | `spawn-trace.js` `TIER_EPOCH_AT` を `2099-01-01` へ | `gauge: 紀元の日付は黙って動かない — TIER_EPOCH_AT の値を固定する` | **1** | 同上 |
| **Y3** | AC-7 前提 | `gauge.js:627` を `record.__seen` の memo に | **4 門が同時に鳴った**: `AC-1a 同一 run の二度の record` / `AC-2b record の二度打ちも一行` / `record は台帳を信じ、プロセスの記憶を信じない` / `先回りの三つの物差しは独立に効く` | **1** | 同上 |
| **Y4** | AC-8 | `gauge.js:584` の `ts` 検査を `if (false)` に | `ts が読めない既存行は正当な先着ではない` + `先回りの三つの物差しは独立に効く` | **1** | 同上 |
| **Y5** | AC-9 | `gauge.js:596` の「秤が書かない鍵」だけを `if (false)` に | **`先回りの三つの物差しは独立に効く` 一本のみ**(0 green, 1 red) | **1** | 同上 |
| **Y6** | AC-10 / AC-11 | `composite` の直前に `WEIGHTS.rework = 0;` | `gauge: 決定性`(既存)/ `静的: 最上位に可変の大域を持たない` / `同一プロセスで N 回採点しても点は動かない` = **3 門** | **1** | 同上 |
| **Y7** | AC-11 | `LEDGER_NAME` の直後に `let __recCount = 0;` | `gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない` | **1** | 同上 |
| **Y7b** | AC-11 | `gauge.js:627` を `record.__seen` の memo に(静的側から撃つ) | 同上 | **1** | 同上 |
| **Y8** | AC-12 | 門側の `DESTRUCTIVE` から `add` を落とす | `gauge(静的): 大域の門は定数を罪と呼ばない` | **1** | 同上 |
| **Y9** | AC-13 | `gauge.js` `if (opts.raw) return out;` → `return out;` | `gauge(並行): 競合で重複が生まれても畳みが読み手を守る` | **1** | 同上 |
| **Y10** | AC-15 | `const healable = human === 0;` → `= true;` | `gauge(CLI): audit は競合の跡と人の手を要する事故を文面で分ける` | **1** | 同上 |
| **Y13** | AC-4 / AC-3(a) | `ledgerUntouched` を `return true;` に | `番兵は歯を持つ` + `故障注入: 住所解決を壊す変異(W1)を番兵が名指す` = **2 門** | **1** | 同上 |

> **Y5 が一本だけを鳴らしたことが、第21条 a の実証である。**
> 物差しを一本だけ殺したとき、**その一本を撃つ門だけが落ちる** ——
> 毒を一行に積んでいれば他の三本が鳴って隠し、「どの物差しが死んだか」は分からなかった。

### 2-2. 一度目に無音だった 3 件(§Y-1 の中)

| # | AC | 変異 | 一度目 | 診断 | 二度目 |
|---|---|---|---|---|---|
| **Y3b** | AC-7 本題 | `const __WROTE = new Set();` を**宣言だけ**足す | **exit 0 / 無音** | **変異器の不備。** design §Y の Y3b は「宣言 + `record` の中で実際に使う」二段の変異である。私は宣言だけを足した —— **使われない大域は振る舞いを変えない**(まさに G4 の層)。なお AC-11 が鳴らなかったのは、変異点を `LEDGER_NAME` の直後に置いた Y7 と違い `const` 宣言のみで破壊的操作が無かったため | **完全な形**(`record.__wrote` の Set を実際に引く)で撃ち直し → **exit 1 / 2 門**(`静的: 可変の大域` + `record は台帳を信じ、プロセスの記憶を信じない`) |
| **Y11** | AC-2 | 番兵の `if (bodyThrew) … else throw` を無条件 `throw` に | **exit 0 / 無音** | **門の欠陥(§3-1)** | 修理後 **exit 1** |
| **Y12** | AC-3 | `sentinelSkipNote()` から `· skip:` の名乗りを落とす | **exit 0 / 無音** | **門の欠陥(§3-2)** | 修理後 **exit 1** |

### 2-3. §Y-2 の高い変異(全走を要するもの)

| # | 扱い |
|---|---|
| **Y14**(W1 を実物に撃つ) | **撃っていない。** design §Y-2 が「**実物に対して撃つことを禁じる**」と明記している。AC-4 が `FAKE-REAL` を使う安全な同型を撃ち、**Y13 がその AC-4 の歯を守る**(§2-1 で実測: exit 1)。**禁を破らないことが正しい遵守である。** |
| **Y15**(門が現物に書く形へ) | `node graph/hermetic.js check` が撃つ層。§6 で実走し **exit 0 / 出自不明 33 件(基線と同数)**。新設門の書き込みはすべて `mkdtempSync` 配下である |
| **Y16**(README を手で 471 に戻す) | `census.js check` が撃つ層。§6 で実走し **exit 0**(`✓ every number the paradise claims about itself is true`) |
| **Y17**(第62条を足して索引を建てない) | **build 相で実測済**: `node graph/codex.js check` が **exit 1「🔴 第62条が索引に無い」**。index --write の後 **exit 0「62 条」**(build.md §⑧) |
| **Y18**(全走 三本) | §5 |

---

## 3. **無音の名指し** — §Y-1 で門の欠陥だった 2 件

**隠さずに名指す。両方ともその場で直した。**

### 3-1. 【無音 1】Y11 — **番兵の裁定は「到達不能な死に枝」に住んでいた**

```
$ python fire_y.py Y11
  -> Y11   rang=False exit=0 restored=True ledger=True
     Paradise gate-filter: 3 of 484 gates matched — 3 green, 0 red
```

**診断。** 番兵の裁定(`if (bodyThrew) console.error(...) else throw`)は
`withGaugeSandbox` の `finally` の **`if (!ledgerUntouched(REAL_DIGEST, after))` の内側**に住んでいた。
実台帳が汚れない機 —— **つまり門が正しく働いている限りすべての機** —— では、
**この三行は一度も実行されない。**

**死に枝を撃つ変異は、死に枝のままでは捕まらない。**
design §1-3 の AC-2 の門は `assert.throws(() => withGaugeSandbox(() => { throw new Error('BODY-BOOM'); }))` を
撃つが、**この道も番兵の裁定を通らない**(台帳が無傷なので `if` に入らない)。
**AC-2 は「番兵が例外を飲まないこと」を一度も観測していなかった。**

**修理**(`tests/paradise.test.js`): 裁定を**純関数に持ち上げた**。

```js
function sentinelVerdict(bodyThrew, before, after) {
  if (ledgerUntouched(before, after)) return 'ok';
  return bodyThrew ? 'warn' : 'throw';   // 本体の例外を差し替えない(AC-2)
}
```

`finally` はこれを呼ぶだけにし(判定は一箇所に住む / 第48条)、AC-2 の門に**どの機でも必ず走る三行**を足した:

```js
assert.strictEqual(sentinelVerdict(false, 'aaa', 'aaa'), 'ok',  '無傷の台帳を汚れたと呼んだ …');
assert.strictEqual(sentinelVerdict(false, 'aaa', 'bbb'), 'throw', '汚れた台帳に番兵が黙った …');
assert.strictEqual(sentinelVerdict(true,  'aaa', 'bbb'), 'warn',  '本体が既に投げているのに番兵が throw を選んだ …');
```

```
$ python fire_y.py Y11            ← 修理後
  -> Y11   rang=True exit=1 restored=True ledger=True
     ✗ gauge(番兵): 実台帳の番兵は本体の例外を飲み込まない (D-A / 第16条)
```

### 3-2. 【無音 2】Y12 — **不在の名乗りを、不在の機でしか検めていなかった**

```
$ python fire_y.py Y12
  -> Y12   rang=False exit=0 restored=True ledger=True
     Paradise gate-filter: 3 of 484 gates matched — 3 green, 0 red
```

**診断。** AC-3 の名乗りの assert は `if (REAL_DIGEST === null)` の**内側**に住んでいた ——
**実台帳が在る機(神の機)では走らない。**

design §1-4 は「**名乗りの文字列そのものを assert するので、CI(不在)と神の機(在る)の
どちらでも歯が立つ**」と書いている。**書かれた形はそうなっていなかった。**
純関数にしたことは正しかったが、**その純関数を呼ぶ位置が枝の中だった。**

**これは第37条の自傷の変種である** —— 「不在は通過ではない」と言いながら、
**在るときには検めない**門を建てていた。

**修理**: 名乗りの形の assert を**枝の外**に出した。

```js
/** 不在の名乗りの**形**は、どの機でも撃つ。文字列の形は純粋である。 */
assert.ok(/\u00b7 skip: 実台帳が無い/.test(sentinelSkipNote()), `不在の名乗りが形を失った …`);
assert.ok(sentinelSkipNote().includes(REAL_LEDGER), '不在の名乗りが**どの住所**を見に行ったかを言っていない');
```

```
$ python fire_y.py Y12            ← 修理後
  -> Y12   rang=True exit=1 restored=True ledger=True
     ✗ gauge(番兵): 実台帳が無い機でも番兵は歯を持つ — 不在は通過ではない (D-A / 第37条)
```

---

## 4. **自分で発明した変異 10 件** — 新設門自身の網目を探る

狙いは **「門を壊す変異 = 門が自分を守っているか」**。
**10 件中 5 件が無音だった** —— すべて門の欠陥であり、すべてその場で塞いだ。

### 4-1. 一度目で鳴った 5 件

| # | 変異 | 狙い | 鳴った門 | exit |
|---|---|---|---|---|
| **Z3** | 門側の `H.shadow(src)` を `src` に(字句器の影を外す) | 註釈の中の `let` を罪と呼ぶ**偽の赤**を AC-12 が捕まえるか | `静的: 可変の大域` + `静的: 定数を罪と呼ばない` = **2 門** | **1** |
| **Z4** | `topLevelDepths` の `depth++` を落とす(全てを最上位と呼ぶ) | 関数の中の `let` まで罪になる偽の赤 | 同上 **2 門** | **1** |
| **Z6** | `--json` の出力から `healable` の欄を落とす | 機械可読の契約の破壊 | `gauge(CLI): audit は競合の跡と…文面で分ける` | **1** |
| **Z7** | `🧹` の行を `process.exit` の**後ろ**へ(死に枝にする) | 文面が永久に出なくなる形 | `audit は…文面で分ける` + `gauge(並行): 競合で重複が…` = **2 門** | **1** |
| **Z8** | `WEIGHTS.tierBreach` を 10 → **0**(罰の重みだけを殺す) | AC-5 は `score` だけでなく `noTier` も見ているか | `印を消した走行(stripped)は序列の罰を免れない` | **1** |

### 4-2. 【無音 3】Z1 — **番兵が器から外されても、123 門が緑のまま通った**

```
$ python fire_z.py Z1
  -> Z1   rang=False exit=0 | 番兵の裁定を finally で無条件 ok に潰す
     Paradise gate-filter: 123 of 484 gates matched — 123 green, 0 red
```

**これが本 prove 相で最も重い発見である。**

`withGaugeSandbox` の `finally` で `const verdict9 = 'ok';` と潰す —— つまり
**番兵を器から実質的に取り外す** —— 変異に対し、**gauge 節の 123 門が一本も鳴らなかった。**

**なぜか。** §3-1 の修理で裁定を純関数にしたので、AC-2 は**その純関数**を撃つようになった。
純関数は正しいままなので緑である。**だがその関数が器から呼ばれなくなったことは、誰も見ていない。**

**「裁定が正しいこと」と「裁定が呼ばれていること」は別の問いである**(第44条: 誰も呼ばない物は腐る)。
**修理 §3-1 が、新しい無音を一つ作っていた。** 正直に記録する。

**修理**: AC-2 の門が `withGaugeSandbox` の本文を**読み**、配線そのものを凍らせる。

```js
const selfSrc = fs.readFileSync(__filename, 'utf8');
const box9 = selfSrc.slice(selfSrc.indexOf('function withGaugeSandbox'),
                           selfSrc.indexOf('function writeGaugeLedger'));
assert.ok(/sentinelVerdict\(bodyThrew, REAL_DIGEST, after\)/.test(box9),
  '番兵の裁定が withGaugeSandbox の finally から外された — '
  + '裁定が正しくても、呼ばれなければ台帳は守られない (D-A / 第44条)');
assert.ok(/ledgerDigest\(REAL_LEDGER\)/.test(box9), '器が実台帳の指紋を採り直していない (第62条 b)');
assert.ok(/throw new Error\(msg\)/.test(box9), '番兵が倒れる道が器から消えた (第16条)');
```

```
$ python fire_z_re.py Z1          ← 修理後
  -> Z1    rang=True exit=1 | ✗ gauge(番兵): 実台帳の番兵は本体の例外を飲み込まない (D-A / 第16条)
```

### 4-3. 【無音 4】Z2 — **「何も検めなかった」が「検めて何も無かった」と同じ緑だった**

```
$ python fire_z.py Z2
  -> Z2   rang=False exit=0 | AC-11 の射程を空配列に潰す — 何も検めずに緑
```

`mutableGlobals([GAUGE_JS, SPAWN_TRACE_JS])` を `mutableGlobals([])` に潰すと、
`found` は空になり `assert.deepStrictEqual(found, [])` が**通る**。
**射程をゼロにすれば、この門はいつでも緑になる。**

**第37条(不在は通過ではない)そのものの違反である。**

**修理**: 検査関数が空の射程を**拒む**。

```js
if (!Array.isArray(files) || files.length === 0) {
  throw new Error('静的の門が空の射程で呼ばれた — 何も検めずに緑を出す道である (D-L / 第37条)');
}
```

```
$ python fire_z.py Z2             ← 修理後
  -> Z2   rang=True exit=1 | ✗ gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない
```

### 4-4. 【無音 5】Z5 — **助走を殺すと、門は `skip` を名乗って緑のまま歯を失う**

```
$ python fire_z.py Z5
  -> Z5   rang=False exit=0 | AC-13: spin barrier を無効化 — 競合窓に入らない
     Paradise gate-filter: 1 of 484 gates matched — 1 green, 0 red
```

駆動子の `T0 = Date.now() + 400` を `Date.now() - 100000` に倒すと、子は barrier を素通りし、
競合は起きず、門は design §3-4 の skip 枝に落ちて **`· skip: 競合窓に入らなかった` を名乗って緑**になる。

**skip の名乗り自体は正しい設計である**(機の速さに依存する前提を赤の理由にしない)。
**だが「助走を一行殺すだけで門の歯が永久に消える」のは別の話である** ——
これは design §Z-2 が「CI で lead が足りなければ門が緑のまま歯を失う」と予告した危険の、
**変異として実体化した形**である。

**修理**: 助走を定数 `RACE_LEAD_MS` に括り出し、**門が自分でその値を凍らせる**(N18 の `g1:` と同じ作法)。

```js
const RACE_LEAD_MS = 400;
…
assert.ok(RACE_LEAD_MS >= 150,
  `競合の助走が ${RACE_LEAD_MS}ms に縮んだ — 子が barrier を素通りし、`
  + '門は skip を名乗って緑のまま歯を失う (D-B / 第38条)。'
  + '正当に縮めるなら、縮めた値で競合が起きることを実測してからこの門を動かせ');
```

**閾値 150 の根拠**: design §3-3 の実測(lead=150ms で 316ms / 全件競合)。

```
$ python fire_z_re.py             ← 修理後
  -> Z5    rang=True exit=1 | ✗ gauge(並行): 競合で重複が生まれても畳みが読み手を守る
  -> Z5b   rang=True exit=1 | 助走を 20ms に縮める — 閾値 150 を下回る
```

**Z5b は追加で撃った変異である** —— 「-100000 のような露骨な値」だけでなく
**「20ms という一見もっともらしい値」でも鳴る**ことを確かめた。

### 4-5. 【無音 6】Z9 — **境界の一文字(`>=` → `>`)を誰も見ていなかった**

```
$ python fire_z.py Z9
  -> Z9   rang=False exit=0 | AC-6: 紀元の境界を一文字ずらす
```

`spawn-trace.js` の `t >= Date.parse(TIER_EPOCH_AT) ? 'stripped' : 'legacy'` を
`t > …` に変えると、**紀元ちょうどに convene された走行が恩赦される。**

AC-6 は三つの `epochStatus` を撃っていたが、**すべて紀元から遠い日付**
(`2026-09-10` / `2026-08-01` / 不在)だった。**境界を跨がない入力は境界を検めない。**

**修理**: 境界**ちょうど**と**その 1ms 前**を撃つ。

```js
assert.strictEqual(trace.epochStatus({ created: trace.TIER_EPOCH_AT }), 'stripped',
  '紀元ちょうどに convene された走行が恩赦された — 境界の一文字(>= と >)が動いている (D-C)');
assert.strictEqual(trace.epochStatus({ created: '2026-09-03T04:54:48.999Z' }), 'legacy',
  '紀元の 1ms 前が stripped になった — 境界が過去へずれ、旧い走行が遡って有罪になる (AC-H3)');
```

```
$ python fire_z.py Z9             ← 修理後
  -> Z9   rang=True exit=1 | ✗ gauge: 紀元の日付は黙って動かない — TIER_EPOCH_AT の値を固定する
```

### 4-6. 【無音 7】Z10 — **番兵の指紋を「長さ」に弱めても、14 門が緑だった**

```
$ python fire_z.py Z10
  -> Z10  rang=False exit=0 | 番兵の指紋を「長さ」に弱める — 同じ長さの書き換えを見逃す
     Paradise gate-filter: 14 of 484 gates matched — 14 green, 0 red
```

`ledgerDigest` を `sha256` から `String(fs.readFileSync(p).length)` に弱める変異。
**AC-3(a) は「一行追記してから照合する」形だった** —— 追記は長さを変えるので、
**長さでも「違う」と言えてしまう。**

**実台帳の改竄で最も恐ろしいのは追記ではなく、点を一つ書き換える形である**(長さが変わらない)。

**修理**: 長さの変わらない書き換えを撃つ。

```js
const same = path.join(box, 'same-length.jsonl');
fs.writeFileSync(same, '{"ts":"2026-09-01T00:00:00.000Z","slug":"a","scale":"standard"}\n');
const d0 = ledgerDigest(same);
fs.writeFileSync(same, '{"ts":"2026-09-01T00:00:00.000Z","slug":"b","scale":"standard"}\n');
assert.strictEqual(ledgerUntouched(d0, ledgerDigest(same)), false,
  '長さの変わらない書き換えを「無傷」と呼んだ — 指紋が中身ではなく大きさしか見ていない (D-A / 第62条 b)');
```

```
$ python fire_z.py Z10            ← 修理後
  -> Z10  rang=True exit=1 | ✗ gauge(番兵): 実台帳が無い機でも番兵は歯を持つ
```

### 4-7. 無音率(第38条: 数で示す)

| 層 | 撃った | 一度目に無音 | 無音率 | 修理後 |
|---|---|---|---|---|
| **§Y-1 の変異(design が予告した壊し方)** | 15 | **3**(Y3b は変異器の不備) | 20.0%(門の欠陥だけなら **13.3%**) | **0%** |
| **自分で発明した変異(門自身の網目)** | 10 | **5** | **50.0%** | **0%** |
| **合計** | **25** | **8** | 32.0% | **0%** |

> **発明した変異の無音率 50% が、第62条(a) の正しさの実証である。**
> 「design が予告した壊し方」だけを撃てば無音率は 13% に見える ——
> **門の形が何を見えなくするかは、設計者自身には見えにくい。**
> `discover` 相が測った既存 471 門の無音率 23.3% と同じ桁である。
> **新設の門も、建てた直後は同じ病を持っていた。**

---

## 5. 全走 三本 — 生出力

修理をすべて入れた後の状態で撃った。**門数は 484 本**(471 + 新設 13。§build.md §0-1 参照)。

```
=== 素 ===
$ node tests/paradise.test.js
Paradise self-test: 484 passed, 0 failed
exit=0

=== repo ===
$ PARADISE_ABODE=repo node tests/paradise.test.js
Paradise self-test: 484 passed, 0 failed
exit=0

=== global ===
$ PARADISE_ABODE=global node tests/paradise.test.js
Paradise self-test: 484 passed, 0 failed
exit=0

=== 走行後の実台帳 ===
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77 *gauge-ledger.jsonl

=== 門数(実測) ===
$ node tests/paradise.test.js --gate-list | wc -l
485                                  ← 総括行 1 を含む
$ node tests/paradise.test.js --gate-list | tail -1
Paradise gate list: 484 gates        ← **門は 484 本**

=== 走行終了時の作業木 ===
$ git -C paradise status --short
 M CONSTITUTION.INDEX.md      ← codex.js index --write が書いた
 M CONSTITUTION.md            ← 第62条
 M README.md                  ← census.js fix が書いた(471 → 484)
 M graph/gauge.js             ← §4-1 の三行(+ 註釈)
 M tests/paradise.test.js     ← 新設 13 門 + 番兵の器 + prove の修理 7 件
?? reform/silent-mutations/   ← 走行帳(design/requirements/findings/build/prove)
$ git -C paradise-creations status --short
 M gauge-ledger.jsonl         ← **開始時から立っている既知の状態。sha256 は不変**
```

**三本とも 484 passed / 0 failed / exit 0。**
task は「485 を目指せ」と指示したが、**実測は 484 である** —— design §6-1 の合計欄の
誤り(門を持つ AC は 13 個)が 485 の出所であり、門が一本足りないのではない(build.md §0-1)。
**数は census が機械で書き、README も 484 を語っている。**

> **番兵が全走三本で沈黙したことの意味**: 484 門 × 3 走行のあいだ `withGaugeSandbox` は
> 180 回以上呼ばれ、**その全ての finally で実台帳の指紋が照合された。**
> **一度も鳴らなかった。** これは「汚していないつもり」ではなく **「汚していないことの測定」**である(第62条 b)。

---

## 6. CI が撃つ門 — exit の一覧

```
wiring      exit=0      ✓ 門 25 本すべてに走らせる者が居る (第44条)
hermetic    exit=0      走査 26 ファイル / 書き込み 429 箇所 (複製 392 / 倉の未追跡 4 / 出自不明 33)
                        ✓ 版管理下の現物を走行中に書き換える門は無い
workspace   exit=0      ✓ 楽園に創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし
census      exit=0      ✓ every number the paradise claims about itself is true
derived     exit=0      ✓ .claude/settings.json は生成元の写しである
codex       exit=0      ✓ 索引は本文と一致している (62 条)
conclave    exit=0      見捨てられた走行: 0 / 判定不能: 0 / 全 15
gauge-audit exit=0      Gauge ledger audit self-test: 6 passed, 0 failed, 0 skipped
```

**8 本すべて exit 0。**

- **hermetic の「出自不明」は 33 件** —— design §X-5 が測った基線と**同数**である。
  新設門が `path.join(tmp, 'gauge-ledger.jsonl')` とリテラルで綴った裁定が効いている
  (`g.ledgerPath()` と綴っていれば 35 件に増え、本当の赤を霞ませていた)。**Y15 の層は緑。**
- **`tribunal.yml` は一行も変えていない。** 新ファイルを作らなかったので `wiring` の孤児は 0 のまま。
- **gauge-audit が 6 passed**(神の機では実台帳の枝も走る。CI では 5 passed / 1 skipped)。

---

## 7. この相が証明したこと / 証明していないこと

### 証明したこと

- **25 の変異すべてに対し、少なくとも一本の門が exit 1 で鳴る。** 無音はゼロである。
- **実台帳は 34 回の変異走行と 4 回の全走を通じて 1 byte も動いていない**(sha256 で毎回照合)。
- **新設の門は、建てた直後に 7 件の無音を抱えていた。** そのすべてを prove 相が見つけ、塞いだ。
- **第62条(b) の「不可侵を測定にする」は成立している** —— 主張ではなく、走行のたびに採る指紋である。

### 証明していないこと(名指し)

- **CI(ubuntu)で一度も撃っていない。** 特に **AC-13 の `RACE_LEAD_MS = 400` が CI で足りるか**は未測
  (design §Z-2)。**本走行の最初の CI 走行のログで `· skip: 競合窓に入らなかった` が
  出ていないことを確かめよ。** 出ていれば 800ms に上げる PR を出せ ——
  **今は Z5/Z5b の門が「助走を勝手に縮めること」だけを禁じている。**
- **無音率が下がったとは主張しない。** 本相が測ったのは**新設 13 門に対する 25 変異**であり、
  discover が測った **60 変異 × 471 門**とは母集団が違う。
  **第38条の要求どおり、無音率の改善は次の変異走行が測り直すまで主張してはならない。**
- **`healable` を読む者は今日ひとりも居ない**(design §Z-3)。掟に従い、半年後に読み手が無ければ落とす。
- **残債 `SM-L`**(`let SENTINEL_SAID` / AC-11 の射程を `tests/*.js` に広げる)、
  **`SM-J`**(`gauge-audit.test.js` に番兵を持たせるか)、**`SM-M`**(`:6060` の門の改名)は
  本走行では払っていない。**名を付けて残す。**

### 7-1. prove 相が門に足した修理の一覧(build 相の設計からの差分)

| 修理 | 対象 | 何を足したか | どの無音を塞ぐか |
|---|---|---|---|
| **A** | AC-2 / 器 | 裁定を純関数 `sentinelVerdict` に持ち上げ、門が直接撃つ | Y11 |
| **B** | AC-3 | 不在の名乗りの形の assert を枝の外へ | Y12 |
| **C** | AC-11 の器 | `mutableGlobals` が空の射程を拒む | Z2 |
| **D** | AC-3 | 長さの変わらない書き換えを撃つ | Z10 |
| **E** | AC-2 | `withGaugeSandbox` の本文を読み、**番兵の配線**を凍らせる | Z1 |
| **F** | AC-6 | 紀元の**境界ちょうど**と 1ms 前を撃つ | Z9 |
| **G** | AC-13 | 助走を定数 `RACE_LEAD_MS` にし、門が値を凍らせる | Z5 / Z5b |

**七つの修理はいずれも門を強めるだけであり、engine(`graph/gauge.js` / `graph/spawn-trace.js`)には
一行も触れていない。** exit code の規約も、既存 471 門の期待値も、一つも動いていない。
