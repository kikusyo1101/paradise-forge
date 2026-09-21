# 畳み機構 — rework 相(三度目 / CI 実走の BLOCK-V2 を塞ぐ)

対象: `reform/gate-fold` 枝 / 入口 HEAD = `b40efa1` / PR #62
機: Windows 11 / git-bash / node — **本物の倉** `C:/Users/kikus/Documents/workspace/paradise`
塞いだもの: **BLOCK-V2**(CI の `🏠 Abode(global 自己診断)` 段で常駐の畳みの門 3 本が偽の赤を出す)

> **この稿の数はすべて自分で撃った実測である**(第27条)。
> CI の値も教主の値も**写していない** —— 同じ病を手元で再現し、生出力を貼った。

---

## 0. 裁定(先に結論を置く)

> ## ✅ **BLOCK-V2 は塞がった。三つの全走がすべて基準を満たす。**

| # | 命令 | **直す前** | **直した後** | 裁定 |
|---|---|---|---|---|
| **A** | CI の env を写した絞り込み(§2.2 / §5) | `✗ fold:` **3 本** / exit 1 | **`9 green, 0 red`** / exit 0 | ✅ |
| **B** | `PARADISE_ABODE=global node tests/paradise.test.js`(全走) | — | **`grep -c '✗ fold:'` = 0** / 10 門すべて `✓` / 610s / 61,430 B | ✅ |
| **C** | `PARADISE_NO_FOLD=1 node tests/paradise.test.js`(全走) | — | **`502 passed, 0 failed`** / exit **0** / 609s / 58,901 B | ✅ |
| **D** | `PARADISE_FOLD_LEDGER=<空の仮> node tests/paradise.test.js`(全走) | — | **`502 passed, 0 failed`** / exit **0** / 609s / 59,932 B | ✅ |
| **E** | `--gate-list \| tail -1` | `501 gates` | **`502 gates`**(+1 = 建てた回帰の門) | ✅ 減っていない |
| **F** | **壊して鳴らす** — 走行を宣言する一行を抜いた変異 | — | `no-receipt` で 3 門が落ち、回帰の門が鳴る | ✅ 鳴った |

**三つの全走はいずれも `0 reused` / 約 610 秒 / 約 60KB** —— **畳まれていない本物の走行である**
(rework2 §6.3 の作法。先頭行・所要・バイト数の三つで検めた)。

> ⚠️ **B の全走は `Paradise self-test: 496 passed, 1 failed, 5 skipped` である。**
> 落ちた 1 本は **`✗ deploy: the deployed tree matches its declared sources`** ——
> **fold の門ではない**。実機 `~/.claude` の状態に依る既往症であり、
> **私の変更を入れる前の基準線の全走でも同じ 1 本が落ちていた**(§2.1)。
> **裁定の基準は `grep -c '✗ fold:'` = 0 である**(教主の指示)—— **満たしている。**

| 面 | 塞いだ相 | 門が宣言し損ねた世界 | 返っていた bail |
|---|---|---|---|
| BLOCK-V1 | rework2 | 畳みの入切 `PARADISE_NO_FOLD` | `disabled` |
| **BLOCK-V2** | **本稿** | **走行の名乗り `PARADISE_FOLD_RUN`** | **`no-receipt`** |

**器 `graph/fold.js` は一行も変えていない。** AC-10 も S-1 も S-2 も緩めていない。
**門を一本も減らしていない**(501 → 502)。**skip も門の除外も一つも足していない。**

---

## 1. 最初の事故 — **撃ったつもりで撃っていなかった**(第37条の自戒)

本稿の最初の全走は `mkdir` を先に撃たなかったため、リダイレクト先が無く**即死していた**:

```
bash: C:\Users\kikus\AppData\Local/Temp/rw3/g1.txt: No such file or directory
EXIT=1
```

**出力ファイルが不在なのに「撃った」と思い込めば、測っていないものを緑と呼ぶことになる。**
rework2 §6.1 の事故(畳まれた全走が **173 バイト・0 秒**で `500 passed` を名乗った)と**同型**である。
ゆえに本稿は**全走のたびに `wc -c` と `tail` を撃ってから読む**ことを作法として固定した。
本物の全走は **約 60,000 バイト / 約 490 秒**である。

---

## 2. 直す前の赤 — **自分で撃った生出力**

### 2.1 素の `=global` 全走では**再現しない**(教主の実測と一致)

```
$ PARADISE_ABODE=global node tests/paradise.test.js
  ✓ fold: 宣言外の状態に依る走行は畳まれない (揟2 / 第37条)
  ✓ fold: 総数と実行数は別の数である (第22条 / 揟4)
  ✓ fold: 数が閉じる — 錠は畳みの関数の外に立つ
  ✓ fold: 畳みの門番は絞り込みの外に立つ
  ✓ fold: 何もかも畳む機構は測定ではない
  ✓ fold: 畳んだ走行は写し元を名乗る — 名乗りは死にコードの後ろへ移らない (prove M-14)
  ✓ fold: 外の PARADISE_NO_FOLD に常駐の門は黙らされない (verify BLOCK-V1 回帰)
  ✓ fold: 改修は門を減らしていない — 本数が基準を下回らない
  ✓ fold: 台帳の番兵は汚した門を名指す
Paradise self-test: 495 passed, 1 failed, 5 skipped
Paradise fold: 領収書を刻まない — 住処が倉の外を指すので台帳への経路が無い
                (宣言外の状態に依る走行は畳めない / AC-10 / 第58条 f)
EXIT=1        SECONDS=489        60,656 bytes
```

**`grep -c '✗ fold:'` = 0。** 落ちた 1 本は fold の門ではない(実機 `~/.claude` に依る既往症)。
**住処だけでは病は出ない。** ここが教主の絞り込みの実測と一致した出発点である。

### 2.2 **CI の段の env を写したら出た** — `CI=true` が引き金である

`.github/workflows/tribunal.yml:363-369` の `🏠 Abode(global 自己診断)` 段は
`PARADISE_FOLD_LEDGER` も **`PARADISE_FOLD_RUN` も渡さない**。GitHub Actions は
`CI=true` / `GITHUB_ACTIONS=true` を常に立てる。**それを写した:**

```
$ env -u PARADISE_FOLD_LEDGER -u PARADISE_FOLD_RUN \
      HOME=<空の仮> USERPROFILE=<空の仮> CI=true GITHUB_ACTIONS=true \
      PARADISE_ABODE=global node tests/paradise.test.js --gate '^fold:'

畳みの機構 (fold / reform/gate-fold):
  ✗ fold: 宣言外の状態に依る走行は畳まれない (揟2 / 第37条)
      global の禁を外した写しがまだ畳まなかった — 注入が当たっていない: fold=false bail=no-receipt

  ✗ fold: 総数と実行数は別の数である (第22条 / 揟4)
      前提が崩れた — 畳める状態を作れていない

false !== true

  ✓ fold: 数が閉じる — 錠は畳みの関数の外に立つ
  ✓ fold: 畳みの門番は絞り込みの外に立つ
  ✓ fold: 何もかも畳む機構は測定ではない
  ✗ fold: 畳んだ走行は写し元を名乗る — 名乗りは死にコードの後ろへ移らない (prove M-14)
      前提が崩れた — 畳める台帳を作れていない: Paradise fold: Executed 1 out of 1 runs (0 reused, bail=no-receipt)
```

**`✗ fold:` が 3 件。** CI の BLOCK-V1 回帰の門が名乗った
「`PARADISE_NO_FOLD=1` で常駐の門が **3 本**赤くなった」と**本数が一致する**。

> ⚠️ **教主の候補の根因は外れていた。** 病は `PARADISE_ABODE=global` でも
> `abode.pathFor('foldLedger')` でもない。**`CI=true` である。**
> 門の作り物の台帳は `foldSand`(`os.tmpdir()`)に住み、`guardWrite` は
> それを `caller-named` として**通している**(次節の実測)。

---

## 3. 根因 — `graph/fold.js:72-79` の `runId()`

### 3.1 台帳の住所は**拒まれていない**(候補の根因を実測で棄却した)

```
$ PARADISE_ABODE=global node -e "…ab.guardWrite(<foldSand の台帳>)…"
tmpdir=    C:\Users\kikus\AppData\Local\Temp
guardWrite= {"inside":false,"scope":"caller-named","export":null,
             "real":"C:\\Users\\…\\Temp\\probe-2IhnRJ\\t.jsonl"}
key=        005bc98e93e33ff4
append OK   {"at":"…","run":"local-9101cc8e1ffc5732","key":"005bc98e93e33ff4","exit":0,"summary":"x"}
```

`abode.js:570-583` の `abodeRoots()` は **mode で分岐しない**(AC-55)。
`guardWrite` の註 (4) が命じるとおり、**門が名指した倉の外の道は `caller-named` として通る** ——
第58条(c) の密閉(複製への故障注入)がそれ無しには成り立たないからである。
**住処の裁きは門の作り物の台帳を一度も拒んでいない。**

### 3.2 **拒んでいるのは走行の名乗りである**

`graph/fold.js:72-79`:

```js
function runId(opts = {}) {
  const env = opts.env || process.env;
  const named = env.PARADISE_FOLD_RUN;
  if (named) return String(named);
  if (env.CI === 'true' || env.GITHUB_ACTIONS === 'true') return null;   // ← ここ
  const seed = [require('os').hostname(), ROOT].join('\0');
  return 'local-' + crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16);
}
```

`graph/fold.js:552-556`(`selectRows`):

```js
  const run = runId(opts);
  const sameKey = rows.filter(r => r.key === k);
  // run === null(走行を特定できない)なら一本も採らない —— 疑わしきは畳まない
  const mine = run === null ? [] : sameKey.filter(r => r.run === run);
```

**一行で切り分けた実測**(同じ台帳・同じ鍵・住処は `repo` に宣言済み):

```
=== PARADISE_ABODE=global ===                     runId= "local-9101cc8e1ffc5732"  fold= true   bail= null
=== PARADISE_ABODE=global CI=true ===             runId= null                      fold= false  bail= no-receipt
=== PARADISE_ABODE=global GITHUB_ACTIONS=true === runId= null                      fold= false  bail= no-receipt
```

> **`PARADISE_ABODE` は可否を 1 ミリも動かさない。`CI=true` が動かす。**

これは器の**正しい**振る舞いである(security S-1 / fail-closed / 揟7)——
CI で走行を特定できないまま畳めば、別の走行の領収書を拾う。
**器は正しい。門が自分の走行を宣言していなかっただけである。**

### 3.3 **同型の病の第三の面**である — 先例が既に隣に在った

`tests/fold.test.js:75` は**最初からこう書いていた**:

```js
process.env.PARADISE_FOLD_RUN = 'fold-gate-' + process.pid;   // 門は自分の走行を自分で宣言する
```

`graph/fold.js:69-70` の註釈もそれを明記している ——
「**門は自分の走行を自分で宣言する**(`tests/fold.test.js` が `PARADISE_FOLD_RUN` を自ら立てる)—— F-1 と同じ作法である」。

**`tests/paradise.test.js` の常駐の門だけが、この宣言を持っていなかった。**
rework2 が `PARADISE_NO_FOLD` について見つけたのと**寸分違わぬ穴**である:

| 面 | 門が宣言し損ねた世界 | 器の該当行 | 返る bail |
|---|---|---|---|
| **BLOCK-V1**(rework2) | 畳みの入切 `PARADISE_NO_FOLD` | `fold.js:610` | `disabled` |
| **BLOCK-V2**(本稿) | **走行の名乗り** `PARADISE_FOLD_RUN` | `fold.js:76` + `:556` | **`no-receipt`** |
| (既に宣言済み) | 住処 `PARADISE_ABODE` | `fold.js:613` | `undeclared-state` |

**`foldEnv()` は住処と旗を宣言していたが、走行を宣言していなかった。**

---

## 4. どう直したか — **門が自分の走行を自分で宣言する**

### 4.1 塞ぎの本体(`tests/paradise.test.js` / `foldEnv` の中)

```js
const FOLD_RESIDENT_RUN = 'fold-resident-' + process.pid;
const foldEnv = (mode, extra) => {
  const e = { ...process.env, PARADISE_ABODE: mode };
  delete e.PARADISE_NO_FOLD;              // ← BLOCK-V1 の塞ぎ(rework2)
  e.PARADISE_FOLD_RUN = FOLD_RESIDENT_RUN; // ← **この一行が BLOCK-V2 の塞ぎである**
  return extra ? Object.assign(e, extra) : e;
};
```

`tests/fold.test.js:75` の `'fold-gate-' + process.pid` と**同じ作法**である。
**器 `graph/fold.js` は一行も変えていない。**

### 4.2 **刻む側にも同じ宣言を渡した**(これを落として一度失敗した)

`foldEnv` を直しただけでは**まだ赤かった**。実測:

```
$ (CI の env で) node tests/paradise.test.js --gate '^fold:'
  ✗ fold: 宣言外の状態に依る走行は畳まれない …: fold=false bail=no-receipt
  ✗ fold: 総数と実行数は別の数である …
  ✗ fold: 畳んだ走行は写し元を名乗る …: bail=no-receipt
```

`fld.append(…, { file })` は **`env` を渡していなかった** —— `append()` は
`runId(opts)` を呼び、`opts.env` が無ければ `process.env` を読む。
CI では `process.env.CI==='true'` なので **`run: null` の領収書が刻まれ**、
宣言した走行を読む側と**永久に食い違う**。**読む側だけ直すのは半分である。**

**直した 4 箇所**(すべて `tests/paradise.test.js`):

| 門 | 直した形 |
|---|---|
| AC-10 | `fld.append(…, { file, env: foldEnv('global') })` |
| AC-14 | `fld.append(…, { file, env: asRepo })` |
| AC-21 | `fld.append(…, { file, env: asRepo })`(`asRepo` の宣言を append より前へ繰り上げた) |
| M-14 | `fld.append(…, { file, env: asRepo })` |

> **これ自体が所見である**(第62条 a): 走行の名乗りは**書く側と読む側の両方**に要る。
> 片側だけの宣言は「宣言した」ことにならない。

### 4.3 採らなかった道

| 案 | 採否 | 理由 |
|---|---|---|
| **(a) 門が `PARADISE_FOLD_RUN` を宣言する** | ✅ **採った** | 器の振る舞いを一切変えない。`fold.test.js:75` と `fold.js:69-70` の註釈が**既に定めていた作法**に、常駐の門を揃えただけである |
| **(b) `runId()` の `CI` の枝を外す** | ❌ | **security S-1 が runner 上で再演する。** CI で走行を特定できないまま畳めば、別の走行の領収書を拾う。`fold.js:63` が「推測可能な既定値を据えれば S-1 が再演する」と明記している |
| **(c) `tribunal.yml` の段に `PARADISE_FOLD_RUN` を足す** | ❌ | **S-2 の塞ぎを崩す。** あの段が台帳への env を渡さないのは「畳める経路が物理的に無い」ことを段が名乗るためである(`tribunal.yml:364-368`)。**門の都合で CI の名乗りを変えるのは順序が逆**である |
| **(d) `=global` / CI のとき skip** | ❌ **論外** | 第56条(b) の選び落とし。**本稿は skip を一つも足していない** |

---

## 5. 直した後の緑 — **同じ命令**で

```
$ env -u PARADISE_FOLD_LEDGER -u PARADISE_FOLD_RUN \
      HOME=<空の仮> USERPROFILE=<空の仮> CI=true GITHUB_ACTIONS=true \
      PARADISE_ABODE=global node tests/paradise.test.js --gate '^fold:'

畳みの機構 (fold / reform/gate-fold):
  ✓ fold: 宣言外の状態に依る走行は畳まれない (揟2 / 第37条)
  ✓ fold: 総数と実行数は別の数である (第22条 / 揟4)
  ✓ fold: 数が閉じる — 錠は畳みの関数の外に立つ
  ✓ fold: 畳みの門番は絞り込みの外に立つ
  ✓ fold: 何もかも畳む機構は測定ではない
  ✓ fold: 畳んだ走行は写し元を名乗る — 名乗りは死にコードの後ろへ移らない (prove M-14)
  ✓ fold: 外の PARADISE_NO_FOLD に常駐の門は黙らされない (verify BLOCK-V1 回帰)
  ✓ fold: 改修は門を減らしていない — 本数が基準を下回らない
  ✓ fold: 台帳の番兵は汚した門を名指す
Paradise gate-filter: 9 of 501 gates matched — 9 green, 0 red
EXIT=0
```

**`✗` 3 本 → 0 本。**(この時点では回帰の門を建てる前なので 501 / 9 門である)

---

## 6. 建てた回帰の門

### 6.1 門の名と住所

**`fold: CI の走行の絞りに常駐の門は黙らされない (BLOCK-V2 回帰)`**
`tests/paradise.test.js`(畳みの門束の中 = 見張る対象と同じ住所。第56条 b)

**裁くもの**: CI の `🏠 Abode(global 自己診断)` 段と同じ env
(`CI=true` / `GITHUB_ACTIONS=true` / `PARADISE_ABODE=global` / **`PARADISE_FOLD_RUN` も
`PARADISE_FOLD_LEDGER` も渡さない**)で、**常駐の畳みの門が赤を一本も出さないこと。**

**設定ではなく走行を読む**(第16条)。`FOLD_RESIDENT_RUN` を `grep` するだけでは
「宣言する定数が在るが誰も使っていない」実装を素通しする(prove M-10 / M-11 の無音)。
ゆえに自分自身の写しを子として撃ち、`N green, M red` を**数で**受け取る。

### 6.2 **壊して鳴らす**(門が自分で毎回撃つ)

門は健全な写しと、**走行を宣言する一行を抜いた写し**の二つを撃ち、数で縛る:

- `ok.red === 0`(健全な写しは CI の env でも全部通る)
- `bad.red > 0` かつ `bad.r.status !== 0`(壊した写しは鳴る)
- `bad.out` が **`no-receipt` を含む**(鳴った理由が BLOCK-V2 であって別の病ではない)
- `bad.red >= ok.red + 3`(CI と手元の実測が 3 門である)

### 6.3 **実測で踏んだ罠 — 二つの門が互いを入れ子にする**

新しい門を単独で撃つと**赤くなった**:

```
$ node tests/paradise.test.js --gate '^fold: CI の走行の絞り'
  ✗ fold: CI の走行の絞りに常駐の門は黙らされない (BLOCK-V2 回帰)
      CI の env(CI=true / PARADISE_FOLD_RUN 無し)で常駐の門が 1 本赤くなった …:
        ✗ fold: 外の PARADISE_NO_FOLD に常駐の門は黙らされない (verify BLOCK-V1 回帰)
Paradise gate-filter: 1 of 502 gates matched — 0 green, 1 red
EXIT=1
```

**この門の子が BLOCK-V1 の門を走らせ、その孫がさらに走る** —— 入れ子が二段重なった。
ゆえに**両方の門が、自分自身と相手の両方を子から外す**ようにした
(`--gate-not` は複数取れる)。**どちらも「畳みの門が外の env に黙らされないか」を
測る門であり、互いに互いの測る対象ではない** —— **失う歯は一本も無い。**
親の走行では両方とも常に走る(§6.4 が示す)。

### 6.4 門束が全部緑(回帰の門を建てた後)

```
$ node tests/paradise.test.js --gate '^fold:'
  ✓ fold: 宣言外の状態に依る走行は畳まれない (揟2 / 第37条)
  ✓ fold: 総数と実行数は別の数である (第22条 / 揟4)
  ✓ fold: 数が閉じる — 錠は畳みの関数の外に立つ
  ✓ fold: 畳みの門番は絞り込みの外に立つ
  ✓ fold: 何もかも畳む機構は測定ではない
  ✓ fold: 畳んだ走行は写し元を名乗る — 名乗りは死にコードの後ろへ移らない (prove M-14)
  ✓ fold: 外の PARADISE_NO_FOLD に常駐の門は黙らされない (verify BLOCK-V1 回帰)
  ✓ fold: CI の走行の絞りに常駐の門は黙らされない (BLOCK-V2 回帰)
  ✓ fold: 改修は門を減らしていない — 本数が基準を下回らない
  ✓ fold: 台帳の番兵は汚した門を名指す
Paradise gate-filter: 10 of 502 gates matched — 10 green, 0 red
EXIT=0
```

**この緑そのものが「壊して鳴った」証拠を含む** —— 門は走行のたびに
変異した写しを撃ち、それが `no-receipt` で 3 本以上落ちることを確かめてから緑を名乗る。

---

## 7. 門の本数 — **減っていない(+1)**

```
$ node tests/paradise.test.js --gate-list | tail -1
Paradise gate list: 502 gates          ← exit 0
```

| 時点 | 本数 |
|---|---|
| 改修前 `6641e3b` | 492 |
| rework2 の後 | 501 |
| **本稿の後** | **502**(+1 = §6 の回帰の門) |

**強い制約「501 を下回らない」を満たす。skip も門の除外も一つも足していない。**

---

## 8. 三つの全走 — **本物の倉で、背景で撃った生出力**

### 8.1 ① `PARADISE_ABODE=global`(fold の門だけを見る)

```
$ PARADISE_ABODE=global node tests/paradise.test.js
Paradise fold: Executed 1 out of 1 runs (0 reused, bail=undeclared-state)   ← 先頭行
  …
  ✓ fold: 宣言外の状態に依る走行は畳まれない (揟2 / 第37条)
  ✓ fold: 総数と実行数は別の数である (第22条 / 揟4)
  ✓ fold: 数が閉じる — 錠は畳みの関数の外に立つ
  ✓ fold: 畳みの門番は絞り込みの外に立つ
  ✓ fold: 何もかも畳む機構は測定ではない
  ✓ fold: 畳んだ走行は写し元を名乗る — 名乗りは死にコードの後ろへ移らない (prove M-14)
  ✓ fold: 外の PARADISE_NO_FOLD に常駐の門は黙らされない (verify BLOCK-V1 回帰)
  ✓ fold: CI の走行の絞りに常駐の門は黙らされない (BLOCK-V2 回帰)
  ✓ fold: 改修は門を減らしていない — 本数が基準を下回らない
  ✓ fold: 台帳の番兵は汚した門を名指す
Paradise self-test: 496 passed, 1 failed, 5 skipped
Paradise fold: 領収書を刻まない — 住処が倉の外を指すので台帳への経路が無い
                (宣言外の状態に依る走行は畳めない / AC-10 / 第58条 f)
EXIT=1        SECONDS=610        61,430 bytes

$ grep -c '✗ fold:' f1.txt
0                                         ← **裁定の基準**
$ grep '^  ✗' f1.txt | grep -v 'fold:'
  ✗ deploy: the deployed tree matches its declared sources   ← 既往症(§2.1 の基準線と同じ)
```

**末尾の名乗りは変わっていない**(AC-10 は生きている)——
`=global` の走行は依然として**領収書を刻まない**。畳みの禁は緩んでいない。

### 8.2 ② `PARADISE_NO_FOLD=1`

```
$ PARADISE_NO_FOLD=1 node tests/paradise.test.js
Paradise fold: Executed 1 out of 1 runs (0 reused, bail=disabled)          ← 先頭行
  …
Paradise self-test: 502 passed, 0 failed
EXIT=0        SECONDS=609        58,901 bytes
```

**赤ゼロ。** BLOCK-V1 の塞ぎは壊していない。

### 8.3 ③ `PARADISE_FOLD_LEDGER=<空の仮>`

```
$ PARADISE_FOLD_LEDGER=$LOCALAPPDATA/Temp/rw3/emptyled/led.jsonl node tests/paradise.test.js
Paradise fold: Executed 1 out of 1 runs (0 reused, bail=no-receipt)        ← 先頭行
  …
Paradise self-test: 502 passed, 0 failed
EXIT=0        SECONDS=609        59,932 bytes
```

生出力: `$LOCALAPPDATA/Temp/rw3/{f1,f2,f3}.txt`

⚠️ **三つとも畳まれていないことを三重に検めた**(rework2 §6.3 の作法):
`0 reused` の名乗り / **約 610 秒** / **約 60,000 バイト**。
(畳んだ走行は 1 秒未満・173 バイトである。)

### 8.4 門は現物を汚していない

```
$ git status --short
 M reform/gate-fold/conclave.json      ← 私の変更ではない(入口から汚れていた)
 M tests/paradise.test.js              ← 本稿の唯一の変更
?? reform/gate-fold/rework3.md         ← 本稿
$ ls tests/.paradise-blockv* graph/.fold-*probe*
残骸なし
```

番兵の門 `fold: 台帳の番兵は汚した門を名指す` は**三つの全走すべてで緑**である。

---

## 9. 直さなかったもの — **残債として名を与える**(第37条)

| 名 | 重み | 何が残っているか | なぜ残したか |
|---|---|---|---|
| **`✗ deploy: the deployed tree matches its declared sources`** | — | `=global` の全走で 1 本落ちる | **実機 `~/.claude` の状態に依る既往症**であり、**私の変更前の基準線でも同じく落ちていた**(§2.1 と §8.1 は同じ 1 本)。fold に一切触れない門であり、本稿の射程外である(第57条: 修理は射程を広げるな) |
| **本物の CI 走行での実証** | — | 本稿の塞ぎが CI の `🏠 Abode(global 自己診断)` 段を緑にすることは**手元では撃っていない** | 手元に GitHub Actions が無い。**CI の段の env を写して再現・再検証した**(§2.2 / §5)のが手元で可能な最大である。**PR #62 の次の走行で初めて実証される** |
| **`--gate-not` の入れ子の一般形** | LOW | 「自分の写しを子として撃つ門」が今 2 本在り、互いを外し合っている。**3 本目を建てる者は 3 本すべてを外さねばならない** | 今は 2 本なので手で足りる。**N 本になったら束を一箇所で持つべきである** —— だがそれを今作るのは**使われていない機構を建てる**ことになる(第57条) |
| **BLOCK-V3 の可能性** | MEDIUM | 本稿と rework2 で、門は `PARADISE_ABODE` / `PARADISE_NO_FOLD` / `PARADISE_FOLD_RUN` の三つを宣言するようになった。**`PARADISE_FOLD_LEDGER` と `PARADISE_ARCHIFY` は宣言していない** | 台帳は各門が `foldLedger(tag)` で明示的に渡しており(`opts.file` が env より優先)、`PARADISE_ARCHIFY` は鍵の材料だが**門は鍵を自分で採って自分で刻む**ので食い違いようがない。**だが「宣言し損ねた env が病になる」という形は三度繰り返した** —— 第四の面が無いと証明したわけではない(第37条) |
| **`recordRun()` の側** | LOW | 走行の末尾(`:152` の `FOLD` / 全走の領収書)は `foldEnv` を通らず `process.env` を読む | **それが正しい。** 走行そのものの領収書は**走行の env で刻まれるべき**であり、門が宣言した作り物の走行名で刻めば、本物の CI の畳みが壊れる。**門の宣言は門の測る世界の中に閉じている** |

---

## 10. 触れなかったもの(強い制約の確認)

| 制約 | 守ったか | 証拠 |
|---|---|---|
| **AC-10 を緩めるな** | ✅ | `graph/fold.js` **一行も変えていない**。`=global` の全走は今も `bail=undeclared-state` を名乗り、**領収書を刻まない**(§8.1 の末尾行) |
| **security S-1 / S-2 を崩すな** | ✅ | `runId()` の `CI` の枝も `tribunal.yml` も**触れていない**(§4.3 (b)(c)) |
| 門を一本も減らすな(≥ 501) | ✅ | **502 gates**(§7) |
| skip で逃げるな | ✅ | skip ゼロ。`--gate-not` は §6.3 の入れ子止めのみで、**親では両門とも常に走る**(§8.1 が示す) |
| 借り物 `overlay/vendor/` に触れるな | ✅ | 触れていない |
| `CLAUDE.md` を書き換えるな | ✅ | 触れていない |
| push するな | ✅ | していない |
| 変異は生バイト + `finally` で復元 | ✅ | 回帰の門は**写しを作って変異させ**、現物には一度も触れない。`finally` で写しを消す(§6.2)。`git checkout --` は使っていない |
| 現物の台帳を汚すな | ✅ | 門は `foldSand` の作り物へ振り替え。番兵が三つの全走で緑 |

**変更したファイルは `tests/paradise.test.js` 一本のみである。**
BLOCK-V2 は**器の欠陥ではなく門の宣言の欠落**だったので、これが正しい手当ての範囲である。

---

## 11. 裁定

| 問い | 答え |
|---|---|
| **1. 赤を自分で再現したか** | **した。** CI の段の env を `tribunal.yml` から写して `✗ fold:` **3 本**(§2.2)。CI の門が名乗った本数と一致 |
| **2. 根因をソースで特定したか** | **した。** `graph/fold.js` の `runId()`(`CI=true` → `null`)と `selectRows()`(`run===null` → 一本も採らない)。**住処ではないことを実測で棄却した**(§3.1) |
| **3. 同じ命令で緑になったか** | **なった。** `9 green, 0 red` / exit 0(§5) |
| **4. 回帰の門を建てたか** | **建てた。** `fold: CI の走行の絞りに常駐の門は黙らされない (BLOCK-V2 回帰)`(§6) |
| **5. 壊して鳴ったか** | **鳴った。** 走行の宣言を抜くと `no-receipt` で 3 門が落ちる —— **門が走行のたびに自分で撃って確かめる**(§6.2) |
| **6. 三つの全走を満たしたか** | **満たした。** ① `✗ fold:` **0 件** / ② **502 passed, 0 failed** / ③ **502 passed, 0 failed**(§8) |
| **7. 門は減っていないか** | **502**(501 → +1)(§7) |

### ✅ **BLOCK-V2 は塞がった。**

CI が立てる `CI=true` —— **走行を特定できない世界で畳みを止める正しい fail-closed** ——
の下でも、**畳みを見張る常駐の門 10 本すべてが自分の測りたい振る舞いを測り、緑を名乗る。**

> **門は自分の測る世界を自分で宣言する。**
> 住処を。旗を。**そして走行を。**


