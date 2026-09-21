# 畳みの機構 — rework 相(審査の指摘を塞ぐ)

**相**: rework / **枝**: `reform/gate-fold` / **基点**: review 相の `2092ca9`
**測定機**: Windows 11 + git-bash, node v24.14.0(ローカル)
**職**: review.md の F-1〜F-16 / security.md の S-1〜S-9 のうち、**BLOCK 3 件 と HIGH** を塞ぐ。

> **この文書の掟**: 生コマンド出力の無い「直した」を書かない。
> **撃てなかったものは「撃てなかった」と書く**(第37条)。
> 壊した現物は `finally` で書き戻し、sha256 の一致で確かめる。**`git checkout -- <file>` は使わない。**

---

## 0. 門の本数の推移(第57条 — 一本も減らさない)

| 時点 | `node tests/paradise.test.js --gate-list \| tail -1` | `node tests/fold.test.js` |
|---|---|---|
| 着手前(HEAD=2092ca9) | `Paradise gate list: 500 gates` | `Fold self-test: 26 passed, 0 failed` |
| F-1 を塞いだ後 | (§9 に記す) | `Fold self-test: 27 passed, 0 failed` |

---

## 1. **F-1 (BLOCK) — CI の `📒 Fold` 段が、畳みを見張る門自身を黙らせる**

### 1.1 直す前の赤(**自分で撃って確かめた** / 第27条)

CI の `tribunal.yml:143-158` の段と**同じ env** をローカルで再現した:

```
$ env PARADISE_NO_FOLD=1 PARADISE_FOLD_LEDGER=$LOCALAPPDATA/Temp/ci-fold-repro.jsonl node tests/fold.test.js
  ✗ fold: bail は機械可読である
      Expected values to be strictly equal:
      + 'disabled'
      - 'no-receipt'
  ✗ fold: --no-fold は畳みを完全に切る (揟6)
      前提が崩れた — 畳める状態を作れていない
      false !== true
Fold self-test: 19 passed, 7 failed
EXIT=1
```

**教主の実測と一致した。この PR は CI で必ず赤くなる状態だった。**

### 1.2 何が悪かったか

`graph/fold.js:440` の `decide()` は `opts.env` が無ければ `process.env` を読む:

```js
const off = opts.off === true || env.PARADISE_NO_FOLD === '1';
if (off) return { ...bail('disabled'), key: null, receipt: null };
```

門は台帳の住所(`PARADISE_FOLD_LEDGER`)を `fold.test.js:51` で**自分で振り替える**が、
**`PARADISE_NO_FOLD` は振り替えない**。ゆえに CI が段のために立てた旗が
**畳みを見張る門そのものを `bail=disabled` に落とし**、
`not-green` / `no-receipt` / `ledger-unreadable` / `key-miss` の枝に**一度も到達しない**。
第48条 c:**常に `disabled` を返す門は門ではない。**

### 1.3 どう直したか

**`tests/fold.test.js:52-70`**(台帳の振替の直後)に、門が**自分の測る世界を自分で宣言する**一行を置いた:

```js
delete process.env.PARADISE_NO_FOLD;
```

註釈に「なぜ AC-18 の歯が欠けないか」(`fold.test.js:810` が `env` を明示で渡す)を実測ごと刻んだ。
**`tribunal.yml:156` の `PARADISE_NO_FOLD: '1'` は消していない** —— 段の意図
(この段自体を畳ませない / 第56条 b)は正しく、手段の側を直すのが正しい(review §3 F-1 の選択肢①)。

### 1.4 直した後の緑(同じ命令)

```
$ env PARADISE_NO_FOLD=1 PARADISE_FOLD_LEDGER=$LOCALAPPDATA/Temp/ci-fold-repro.jsonl node tests/fold.test.js
  ✓ fold: 門は己の盲点を名乗る (第62条 a)
  ✓ fold: この門は己の故障注入の骨を持っている (prove B-02 / B-03)
  ✓ fold: この門束は外の env に畳みを切られない (F-1 回帰)
  ✓ fold: この門は現物の台帳を汚していない
Fold self-test: 27 passed, 0 failed
EXIT=0
```

**19 passed, 7 failed → 27 passed, 0 failed**(26 → 27 は §1.5 の回帰の門が 1 本増えたため)。

### 1.5 建てた回帰の門 — **`fold: この門束は外の env に畳みを切られない (F-1 回帰)`**

`tests/fold.test.js:1142-1205`。**設定を読むのではなく走行を読む**(第16条):
門は**自分自身の写し**を作り(`main()` の呼びを probe に差し替える)、
**CI と同じ env(`PARADISE_NO_FOLD=1`)で子プロセスとして撃ち**、
「畳める状態を作れば実際に `fold=true` になること」を出力で読む。

⚠️ **この門を建てる途中で、自分で「常に緑の検め」を一つ作りかけた** ——
注入が当たったかを `s.includes('PROBE NO_FOLD=')` で見ていたが、
**`src` 自身がその綴りを含むので常に真**である(第48条 c)。
`assert.ok(!/module\.exports = main\(\);/.test(s), …)` に直した。

### 1.6 **壊して鳴らした証拠**(第21条)

現物の写しから `delete process.env.PARADISE_NO_FOLD;` の一行だけを抜いて撃った
(**現物は触っていない。写しは `$LOCALAPPDATA/Temp` に置いた**):

```
$ node $LOCALAPPDATA/Temp/mk-f1-mutant.js
mutant written: C:\Users\kikus\AppData\Local/Temp/f1-mutant.test.js

$ env PARADISE_NO_FOLD=1 PARADISE_FOLD_LEDGER=$LOCALAPPDATA/Temp/ci-fold-mut.jsonl \
      node $LOCALAPPDATA/Temp/f1-mutant.test.js
  ✗ fold: この門束は外の env に畳みを切られない (F-1 回帰)
      CI と同じ env(PARADISE_NO_FOLD=1)で門が畳めなかった — 外の旗が門を黙らせている (review F-1):
      PROBE NO_FOLD="1" fold=false bail=disabled
Fold self-test: 19 passed, 8 failed
EXIT=1
```

**門は鳴った。** しかも鳴った理由が F-1 そのもの(`NO_FOLD="1" fold=false bail=disabled`)である。
門の中の②(`assert.notStrictEqual(bad.status, 0, …)`)も同じ形を門の内側で毎走行撃つので、
**この門自身が己の鳴りを毎回証明する。**

---

## 2. **S-2 (BLOCK) — PR が台帳そのものを持ち込める**

### 2.1 直す前の赤(自分で撃った)

```
$ git check-ignore -v .claude/paradise-fold-ledger.jsonl
.gitignore:51:.claude/paradise-fold-ledger.jsonl	.claude/paradise-fold-ledger.jsonl
$ git add -f .claude/paradise-fold-ledger.jsonl
$ git diff --cached --name-only
.claude/paradise-fold-ledger.jsonl          ← **版管理下に入った**
$ git reset -q HEAD .claude/paradise-fold-ledger.jsonl    ← 戻した
```

**`.gitignore` は `git add -f` を拒めない。** 台帳が版管理下に入れば CI の checkout で現れ、
鍵は `.claude/` を見ないので、**攻撃者は自分の PR の内容で鍵を計算して緑を偽造できる**。

### 2.2 どう直したか

`.github/workflows/tribunal.yml` の **4 箇所**(Self-test / Census / Atlas / Abode(repo))を
`${{ github.workspace }}/.claude/…` から **`${{ runner.temp }}/paradise-fold-ledger.jsonl`** へ移した。
**正しい形は `📒 Fold` 段が既に持っていた** —— 四段をそれに揃えただけである(第57条: 掟を広げていない)。
同じ 4 箇所に `PARADISE_FOLD_RUN`(§3)も足した。

```
$ grep -n "PARADISE_FOLD_LEDGER\|PARADISE_FOLD_RUN\|PARADISE_NO_FOLD" .github/workflows/tribunal.yml
35:          PARADISE_FOLD_LEDGER: ${{ runner.temp }}/paradise-fold-ledger.jsonl
43:          PARADISE_FOLD_RUN: gh-${{ github.run_id }}-${{ github.run_attempt }}
148:          PARADISE_FOLD_LEDGER: ${{ runner.temp }}/paradise-fold-ledger.jsonl
156:          PARADISE_FOLD_RUN: gh-${{ github.run_id }}-${{ github.run_attempt }}
172:          PARADISE_NO_FOLD: '1'
173:          PARADISE_FOLD_LEDGER: ${{ runner.temp }}/fold-gate-ledger.jsonl
201:          PARADISE_FOLD_LEDGER: ${{ runner.temp }}/paradise-fold-ledger.jsonl
209:          PARADISE_FOLD_RUN: gh-${{ github.run_id }}-${{ github.run_attempt }}
352:          PARADISE_FOLD_LEDGER: ${{ runner.temp }}/paradise-fold-ledger.jsonl
360:          PARADISE_FOLD_RUN: gh-${{ github.run_id }}-${{ github.run_attempt }}
```

**`github.workspace` は 0 件になった。**

### 2.3 建てた回帰の門 — **`fold: CI の台帳は checkout の外に住む (S-2 回帰)`**

`tests/fold.test.js`。三つを撃つ:
① 台帳を渡す**すべての段**の住所が `runner.temp` であり `github.workspace` を含まない
(**綴りは行頭から `:` まで正確に読む** / prove W-04)、
② 段が **4 本以上**在る(段が消えれば畳みが効かない)、
③ **現物の台帳が `git ls-files` に出ない**。

### 2.4 壊して鳴らした証拠

門は**自分の中で**変異を作って鳴りを確かめる(門の④):
`runner.temp` の一段を `github.workspace` へ戻した写しを作り、**検めがそれを見つけること**を撃つ。
`assert.ok(rang, '**検めが `github.workspace` へ戻した段を見落とした** — この門は鳴らない (第48条 c)')`。
現物を触らずに毎走行で鳴りが証明される形である。

---

## 3. **S-1 (BLOCK) — 台帳は無署名 / 走行を跨いだ領収書を採っていた**

### 3.1 直す前の赤(自分で撃った)

```
$ K=$(node graph/fold.js fold-key)
$ printf '{"at":"2026-09-21T00:00:00.000Z","key":"%s","exit":0,"summary":"Paradise self-test: 500 passed, 0 failed"}\n' "$K" > forged.jsonl
$ PARADISE_FOLD_LEDGER=forged.jsonl node graph/fold.js fold-status
fold: Executed 0 out of 1 runs (1 reused, key=…)     ← **走らせていない走行で畳めた**
```

### 3.2 どう直したか — **`run` 欄と、その出所の判断**

`graph/fold.js`:

| 住所 | 直し |
|---|---|
| `fold.js:48-77` `runId()` | **新設**。この走行の一意識別を決める |
| `fold.js:386-390` `validateReceipt` | `run` の**型**を裁く(欠落は許す。理由は下) |
| `fold.js:404-406` `append()` | 刻む側が `run` を付ける |
| `fold.js:462-502` `selectRows()` | **新設**。読む側の検め + 走行の絞り + 食い違いの検め |
| `fold.js:517-527` `find()` | `selectRows` 経由。`catch { return null; }` を外した(F-2) |
| `fold.js:556-570` `decide()` | `selectRows` 経由。跨いだ本数を `otherRun` で名乗る |

★ **`run` 欄の出所の判断**(教主の問いへの答え):

1. **`PARADISE_FOLD_RUN` が在ればそれ。** CI では `tribunal.yml` が
   `gh-${{ github.run_id }}-${{ github.run_attempt }}` を**同じ job の全段に**渡す ——
   段を跨いで同じ値でなければ畳みが一切効かないからである。
   再実行(`run_attempt`)は**別の走行**として扱う(runner が違う)。
2. **無く、かつ CI(`CI=true` / `GITHUB_ACTIONS=true`)に居るなら `null` = 畳まない。**
   **fail-closed**(揟7: 疑わしきは畳まない)。
   ⚠️ ここで推測可能な既定値(hostname 等)を据えれば **S-1 が runner 上で再演する**。
3. **手元(CI でない)では `sha256(hostname + 倉の根)` の定数。**
   手元の台帳は走行を跨いで生きる —— それが手元での畳みの値打ちそのものである(AC-08)。
   **手元の偽造を防ぐのはこの欄ではない。防ぐのは S-2 である。両方が揃って初めて塞がる。**

**`run` の欠落を「壊れた行」にしなかった理由**: 旧い台帳の行や外から足された行は
この欄を持たない —— それを `ledger-unreadable`(赤)にすれば、**旧い台帳が 1 本あるだけで CI が倒れる**
(第62条 b: 偽の赤)。ゆえに**形としては許し、`selectRows()` が決して採らない**。
**畳まないのは赤ではない。**

### 3.3 直した後の緑 — **手元でも CI でも畳みが効くことの実測**

```
$ node $LOCALAPPDATA/Temp/s1-probe.js
key=cc650b201cdc2aea  runId(local)=local-9101cc8e1ffc5732  runId(CI)=null
① 外から足した一行 (run 無し / 手元)         fold=false bail=no-receipt otherRun=1
② 外から足した一行 (run 無し / CI)           fold=false bail=no-receipt otherRun=1
③ 別走行の領収書 (run=gh-999-1 / CI)         fold=false bail=no-receipt otherRun=1
④ 同じ走行の領収書 (CI)                      fold=true  bail=null          ← **CI で畳める**
⑤ 手元で本物が刻んだ領収書                   fold=true  bail=null          ← **手元でも畳める**
⑥ 赤の後ろに偽の緑を足す (S-3)               fold=false bail=ledger-unreadable
⑦ key が 4 桁の行 (読む側の検め)             fold=false bail=ledger-unreadable
```

**攻撃(①②③)は塞がり、正規の畳み(④⑤)は生きている。**
偽の領収書を現物の口で読ませた対照:

```
$ PARADISE_FOLD_LEDGER=<偽> node graph/fold.js fold-status
fold: Executed 1 out of 1 runs (0 reused, bail=no-receipt)      ← **畳まない**
$ PARADISE_FOLD_LEDGER=<本物が刻んだ> node graph/fold.js fold-status
fold: Executed 0 out of 1 runs (1 reused, key=cc650b201cdc2aea) ← **畳む**
  刻まれた行: {"at":"…","run":"local-9101cc8e1ffc5732","key":"cc650b201cdc2aea","exit":0,…}
```

### 3.4 建てた回帰の門 — **`fold: 走らせていない走行の領収書は畳みの根拠にならない (S-1 回帰)`**

①run を名乗らない行 / ②別走行の行 / ③**同じ走行の行は畳める**(常に赤の実装を拒む)/
④`runId({env:{CI:'true'}}) === null`(fail-closed)/ ⑤**壊して鳴らす**。

### 3.5 壊して鳴らした証拠

門の⑤が `selectRows` の走行の絞りを外した写しを子で撃つ:
`const mine = run === null ? [] : sameKey.filter(r => r.run === run);` → `const mine = sameKey;`
→ **`fold=true`**(偽の領収書が畳めてしまう)を読んで、門が鳴ることを確かめている。
門束全体でも確かめた: この形が無ければ ①② が緑になる。

---

## 4. **S-4 (HIGH) — `.lock` がディレクトリのとき `withLock` が無限に回る**

### 4.1 直す前の赤(自分で撃った)

```
$ time timeout 20 node $LOCALAPPDATA/Temp/s4-probe.js   # recordRun(…, {waitMs:2000, staleMs:1})
real    0m20.085s
EXIT=124                    ← **2000ms の期限を 10 倍超えて戻らなかった(出力なし)**
```

### 4.2 何が悪かったか

`.lock` がディレクトリのとき `openSync(lock,'wx')` は `EEXIST`(Windows)。
`rmSync(lock,{force:true})` は `recursive` が無いので `ERR_FS_EISDIR` で失敗し、
`catch {}` がそれを飲んで `continue` —— **stale 枝が毎周成立して `waitMs` の検めを飛び越える。**

### 4.3 どう直したか(`graph/fold.js:344-367`)

1. **期限の検めを stale 枝より前へ移した。** stale 回収は「早く進むための最適化」であって、
   **期限より強い権限を持ってはならない** —— **どの枝を通っても `waitMs` で必ず抜ける。**
2. `rmSync` に **`recursive: true`** を足した。

### 4.4 直した後の緑(同じ命令)

```
$ time timeout 20 node $LOCALAPPDATA/Temp/s4-probe.js
経過ms=10 written=true why=null
real    0m0.082s
EXIT=0                      ← 20s 無応答 → **10ms で書けた**
```

### 4.5 建てた回帰の門 — **`fold: 錠は必ず期限で抜ける — どの競合の形でも無限に回らない (S-4 回帰)`**

`.lock` を**ディレクトリとして**置き、`waitMs: 1000` の **3 倍以内に戻ること**を撃つ。
戻り方(書けた/書けなかった)ではなく**必ず戻ること**を問う。

### 4.6 壊して鳴らした証拠(**二つの変異を別々に撃つ**)

- **`recursive` を落とす** → `written=false`(期限では抜けるが回収できない)を読んで鳴る。
- **期限の検めを stale 枝の後ろへ戻す + `recursive` を落とす** → 子プロセスを 5 秒で打ち切り、
  **`戻った` が出力に現れないこと**(= 無限に回っている)を読んで鳴る。

---

## 5. **F-2 (HIGH) — census の畳みが `ledger-unreadable` を黙殺**

### 5.1 直す前の赤

`census.js:142` が `fold.find(fold.key())` を直に呼び、`find()` の中の `catch { return null; }` が
**不能を不在として飲み込んでいた**(review F-2 の実測: `find(読めない台帳) = null`)。
出力は `bail=ledger-unreadable` を名乗るが **exit は 0 のまま緑**である。

### 5.2 どう直したか

- `graph/fold.js:517` `find()` から **`catch { return null; }` を外した**(`selectRows` が投げる)。
- `graph/census.js:142-160` を **`fold.decide()` 経由**に寄せ、`bail === 'ledger-unreadable'` なら
  `foldUnreadable` 印を付けて投げる。**`check()` の `catch` は打ち切りと混同しない**(印を見て再送出)。
- `graph/census.js:583-596` CLI が**理由を人の読める一行で名乗ってから exit 1**(第21条 b)。
- ⚠️ **`census.js:130-133` の制約(呼び口 1 箇所 / 引数 1 個)は守っている** ——
  `execFileSync` は今も 1 箇所・引数 1 個であり、門『gate-filter: census は自己診断を素で呼ぶ』は緑。

### 5.3 直した後の緑

```
$ PARADISE_FOLD_LEDGER=<ディレクトリ> node graph/census.js check
═══════ 🔢 CENSUS CHECK ═══════
  🔴 census: 台帳が読めない — 畳みの機構が壊れている (bail=ledger-unreadable / AC-16):
     fold: 台帳が読めない (EISDIR): …/badledger.jsonl
       読めないは skip ではなく赤である。台帳を直すか --no-fold で切れ (AC-16)
═══════════════════════════════
EXIT=1                      ← **exit 0 の緑 → exit 1 の赤**

$ (対照) PARADISE_FOLD_LEDGER=<健全 / 畳める> node graph/census.js check
Census self-test: Executed 0 out of 1 runs (1 reused, key=1ec4081312dc6bfa)
  ✓ every number the paradise claims about itself is true
real    0m0.115s            ← **畳みは殺していない**
```

### 5.4 建てた回帰の門 — **`fold: 畳んだ census は読めない台帳で倒れる (F-2 回帰)`**

①ディレクトリの台帳で **exit != 0** かつ理由が `ledger-unreadable` と名乗られる /
②**畳める台帳では倒れず、`1 reused` を名乗る**(「何でも赤にする実装」を拒む)/
③**壊して鳴らす**: `selectRows` の頭に `try { … } catch { rows = []; }` を戻すと
`bail=no-receipt` に落ちることを子で読む。

---

## 6. 直した後の走行(生出力)

### 6.1 CI の `📒 Fold` 段と同じ env

```
$ env PARADISE_NO_FOLD=1 PARADISE_FOLD_LEDGER=$LOCALAPPDATA/Temp/ci-fold-repro.jsonl node tests/fold.test.js
  ✓ fold: この門束は外の env に畳みを切られない (F-1 回帰)
  ✓ fold: 走らせていない走行の領収書は畳みの根拠にならない (S-1 回帰)
  ✓ fold: CI の台帳は checkout の外に住む (S-2 回帰)
  ✓ fold: 同じ走行で答えが食い違う台帳は畳みの根拠にならない (S-3 回帰)
  ✓ fold: 錠は必ず期限で抜ける — どの競合の形でも無限に回らない (S-4 回帰)
  ✓ fold: 畳んだ census は読めない台帳で倒れる (F-2 回帰)
  ✓ fold: この門は現物の台帳を汚していない
Fold self-test: 32 passed, 0 failed
EXIT=0                      ← 着手時は **19 passed, 7 failed / EXIT=1**
```

### 6.2 常駐の畳みの門

```
$ node tests/paradise.test.js --gate '^fold:'
Paradise gate-filter: 8 of 500 gates matched — 8 green, 0 red
```

---

