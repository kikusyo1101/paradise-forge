# 畳み機構 — rework 相(二度目 / verify の差し戻しを塞ぐ)

対象: `reform/gate-fold` 枝 / 入口 HEAD = `2fdd8fb`
機: Windows 11 / git-bash / node — **本物の倉** `C:/Users/kikus/Documents/workspace/paradise`
塞いだもの: **verify BLOCK-V1**(`PARADISE_NO_FOLD=1` で常駐の畳みの門 4 本が偽の赤を出す)

> **この稿の数はすべて自分で撃った実測である**(第27条)。
> verify の値も教主の値も**写していない** —— 同じ命令を自分で撃ち直し、一致したところは
> 「一致した」と書き、撃てなかったものは §7 に名を与えて残した(第37条)。

---

## 0. 裁定(先に結論を置く)

> ## ✅ **BLOCK-V1 は塞がった。二つの全走が緑である。**

| # | 命令 | **直す前** | **直した後** | 裁定 |
|---|---|---|---|---|
| **A** | `PARADISE_NO_FOLD=1 node tests/paradise.test.js --gate '^fold:'` | `8 of 500 — 4 green, **4 red**` / exit **1** | `9 of 501 — **9 green, 0 red**` / exit **0** | ✅ |
| **B** | `PARADISE_NO_FOLD=1 node tests/paradise.test.js`(全走) | `496 passed, **4 failed**` / exit 1(verify V1) | **`501 passed, 0 failed`** / exit **0** / 508s | ✅ |
| **C** | `PARADISE_FOLD_LEDGER=<空の仮> node tests/paradise.test.js`(全走) | `500 passed, 0 failed`(verify V1b) | **`501 passed, 0 failed`** / exit **0** | ✅ §3.2 |
| **D** | `--gate-list \| tail -1` | `500 gates` | **`501 gates`**(+1 = 建てた回帰の門) | ✅ 減っていない |
| **E** | **壊して鳴らす** — 塞ぎの一行を抜いた変異 | — | `9 of 501 — 4 green, **5 red**` / exit **1** | ✅ 鳴った |

**門は一本も減らしていない。緩めてもいない**(skip も `--gate-not` の除外も使っていない)。
**R-V1(検証の自己畳み)は塞がない**と判断した —— 利害を数で述べた上で、§6 に名を残す。

---

## 1. 直す前の赤 — **自分で撃った生出力**

verify の値を信じず、まず自分で再現した(第27条)。

```
$ cd C:/Users/kikus/Documents/workspace/paradise
$ PARADISE_NO_FOLD=1 node tests/paradise.test.js --gate '^fold:'

畳みの機構 (fold / reform/gate-fold):
  ✗ fold: 宣言外の状態に依る走行は畳まれない (揟2 / 第37条)
      =global の bail が disabled
+ actual - expected

+ 'disabled'
- 'undeclared-state'

  ✗ fold: 総数と実行数は別の数である (第22条 / 揟4)
      前提が崩れた — 畳める状態を作れていない

false !== true

  ✓ fold: 数が閉じる — 錠は畳みの関数の外に立つ
  ✓ fold: 畳みの門番は絞り込みの外に立つ
  ✗ fold: 何もかも畳む機構は測定ではない
      前提が崩れた — 健全な器が key-miss を返さない
+ actual - expected

+ 'disabled'
- 'key-miss'

  ✗ fold: 畳んだ走行は写し元を名乗る — 名乗りは死にコードの後ろへ移らない (prove M-14)
      前提が崩れた — 畳める台帳を作れていない: Paradise fold: Executed 1 out of 1 runs (0 reused, bail=disabled)

  ✓ fold: 改修は門を減らしていない — 本数が基準を下回らない
  ✓ fold: 台帳の番兵は汚した門を名指す
Paradise gate-filter: 8 of 500 gates matched — 4 green, 4 red
EXIT=1
```

生出力: `$LOCALAPPDATA/Temp/rw2/red1.txt`(47,141 バイト)

**落ちた 4 門は verify §3.2 の一覧と完全に一致した** —— 行 10934 / 10988 / 11064 / 11116。
**病の形も一致した**: 三本が `+'disabled'` を名乗り、一本が「畳める台帳を作れていない」と
`bail=disabled` を引用している。**verify の診断は正しかった。**

### 1.1 根因を自分の目で確かめた

`graph/fold.js:608-611`:

```js
function decide(opts = {}) {
  const env = opts.env || process.env;
  const off = opts.off === true || env.PARADISE_NO_FOLD === '1';
  if (off) return { ...bail('disabled'), key: null, receipt: null };   // ← 何より先に効く
```

4 門はいずれも `{ ...process.env, PARADISE_ABODE: … }` を `decide()` へ渡していた ——
**住処は宣言し直すが、`PARADISE_NO_FOLD` は継いでいた。** 旗が立った走行では
`decide()` が鍵も台帳も見ずに `bail='disabled'` を返し、**門は測りたい枝へ一度も到達しない。**

中和の手当ての分布も自分で数えた(verify の数と一致):

```
$ grep -c "PARADISE_NO_FOLD" tests/fold.test.js      → 19 箇所
$ grep -n  "PARADISE_NO_FOLD" tests/paradise.test.js → 2 箇所(:152 の FOLD.off と :10916 の註釈だけ)
```

**一度目の rework は `fold.test.js` にだけ手当てを入れ、`paradise.test.js` を素通しにしていた。**
`:10916` の註釈が「`fold.test.js` に置けば旗の世界で常に緑の飾りになる、
**だから `paradise.test.js` に住まわせる**」と書いているのは皮肉である ——
**住所は正しく選ばれたが、旗を中和する手当てが伴っていなかった。**

---

## 2. どう直したか — **(a) 各門が自分の env を組む**

### 2.1 置いた場所と行番号

**`tests/paradise.test.js:10925-10955`** — 畳みの門束の入口、作り物の台帳の隣に
関数 `foldEnv()` を一本立てた。**旗の中和はこの一関数に集まる。**

```js
const foldEnv = (mode, extra) => {
  const e = { ...process.env, PARADISE_ABODE: mode };
  delete e.PARADISE_NO_FOLD;          // ← この一行が verify BLOCK-V1 の塞ぎである
  return extra ? Object.assign(e, extra) : e;
};
```

**呼び替えた箇所(9 箇所 / すべて `tests/paradise.test.js`)**:

| 元の行 | 門 | 直した形 |
|---|---|---|
| 10952 | AC-10 | `fld.key({ env: foldEnv('global') })` |
| 10957 | AC-10 | `fld.decide({ file, env: foldEnv('global') })` |
| 10966 | AC-10 ② 子プロセス | `env: foldEnv('global', { PARADISE_FOLD_LEDGER: file })` |
| 10980 付近 | AC-10 ③ 変異の子 | `spawnSync(…, { …, env: foldEnv('global') })` を**足した** |
| 11000 | AC-14 | `const asRepo = foldEnv('repo');` |
| 11100 | AC-21 | `const asRepo = foldEnv('repo');` |
| 11104 付近 | AC-21 ② 変異の子 | `spawnSync(…, { …, env: foldEnv('repo') })` を**足した** |
| 11132 | M-14 | `const asRepo = foldEnv('repo');` |
| — | 新しい回帰の門 | `CI_ENV` は**あえて旗を立てる**(測る対象だから) |

⚠️ **④ と ⑦(変異の子プロセス)は verify が名指していない穴である。** この二本は
`spawnSync(… , ['-e', …])` に **env を一つも渡していなかった** —— 親の env を丸ごと継ぐので、
旗が立った世界では**故障注入した写しまで `bail=disabled` を返し、「注入が当たったのに鳴らない」と
読めてしまう**(第37条)。親の側だけ直せば緑にはなるが、**壊して鳴る歯が旗の下で抜けたままになる。**
ゆえに子にも `foldEnv()` を渡した。**自分で撃って見つけた。**

### 2.2 なぜ (a) を採ったか / **(b) と (c) を採らなかった理由**

| 案 | 採否 | 理由 |
|---|---|---|
| **(a) 各門が `decide()` へ渡す env から旗を落とす** | ✅ **採った** | **旗の効力を一切変えない。** 変わるのは「門が自分の測る世界をどう宣言するか」だけである。`fold.test.js:68` が採った手(`delete process.env.PARADISE_NO_FOLD`)と**同じ考え方**を、この走行の性質に合う形に置き換えたものである |
| **(b) 門束の入口で `delete process.env.PARADISE_NO_FOLD`** | ❌ 採らなかった | **この走行は自己診断そのものである。** `tests/paradise.test.js:152` の `FOLD.off` が同じ旗を読み、走行の末尾(`:11330` 付近)で `fold.recordRun()` が領収書を刻む。走行の**途中**で大域を消せば、**神が `PARADISE_NO_FOLD=1` で切ったはずの畳みが、門束を通り過ぎた後に復活して領収書を刻む** —— **AC-18 の出口を門が勝手に閉じる**。加えて以後の 300 余本の門と、それらが生む子プロセスの env が**遠隔で変わる**(第56条 b: 門番の足場を門が動かしてはならない)。`fold.test.js` でこれが安全なのは、あの束が**自己診断ではなく畳みの検査であり、自分の領収書を刻まない**からである —— **同じ手が同じ理由で正しいとは限らない** |
| **(c) `decide()` に「旗を無視する」opts を足す** | ❌ 採らなかった | **修理が掟を広げる**(第57条)。`PARADISE_NO_FOLD=1` は AC-18 が「出口は常に開いている」と保証した旗である。器の側に `ignoreOff: true` の抜け道を作れば、**「旗を立てても畳む経路」が engine に実在してしまう** —— 明日それを門以外の誰かが使ったとき、神の逃げ道は逃げ道でなくなる。門の都合のために器の保証を薄くするのは順序が逆である |
| **(d) 「`NO_FOLD` のときは skip する」** | ❌ **論外** | 第56条(b)の**選び落とし**そのもの。門は旗の下でも自分の測りたい振る舞いを測れなければならない。**本稿は skip を一つも足していない**(§4 の `--gate-not` は子プロセスの再帰止めであり、門の除外ではない — §4.2) |

### 2.3 鍵は動かない — 確かめた

`PARADISE_NO_FOLD` を env から落として**鍵が変われば**、門は別の世界を測ることになる。
`graph/fold.js:297-322`(`keyExplain`)が env から読むのは **`PARADISE_ABODE`(正規化した mode)と
`PARADISE_ARCHIFY` の二つだけ**である。実測:

```
$ node -e "const f=require('./graph/fold.js'); const e=f.keyExplain(); console.log(e.fileCount, e.bytes, e.key)"
278 13180980 ef3688a5e8f38ac8
```

材料は **278 ファイル / 13.2 MB**、env の欄は 2 つ。**`PARADISE_NO_FOLD` は鍵の材料ではない。**
ゆえに落としても鍵は一桁も動かない —— **門が測る世界は変わっていない。**

---

## 3. 直した後の緑 — **同じ命令**で

### 3.1 絞り込み(命令 A / §1 と同じ命令)

```
$ PARADISE_NO_FOLD=1 node tests/paradise.test.js --gate '^fold:'

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

**4 red → 0 red。** 8 門 → 9 門(建てた回帰の門が増えた)。

### 3.2 二つの全走(命令 B / C)— **本物の倉で、背景で撃った**

```
$ PARADISE_NO_FOLD=1 node tests/paradise.test.js
Paradise fold: Executed 1 out of 1 runs (0 reused, bail=disabled)     ← 先頭行
  …(門が 501 本走る)…
Paradise self-test: 501 passed, 0 failed
EXIT=0        SECONDS=508
```

```
$ PARADISE_FOLD_LEDGER=$LOCALAPPDATA/Temp/rw2/empty-ledger.jsonl node tests/paradise.test.js
Paradise fold: Executed 1 out of 1 runs (0 reused, bail=no-receipt)   ← 先頭行
  …
Paradise self-test: 501 passed, 0 failed
EXIT=0        SECONDS=508
```

生出力: `$LOCALAPPDATA/Temp/rw2/{full-nofold.txt,full-ledger.txt}`

⚠️ **この全走が畳まれていないことを、先頭行と所要で二重に確かめた**(verify §1 の事故対策)。
`Executed 1 out of 1 runs (0 reused, …)` は「**実際に走った**」の名乗りであり、
`508 秒`は畳んだ走行(1 秒未満 / 173 バイト)とは桁が違う。**出力は 59,854 バイトある。**

畳みの門束 9 本はすべて `✓` であり、`Paradise fold:` の名乗りは走行中一行のみ ——
**門が現物の台帳に触れていない**(番兵 AC-24 も緑)。

---

## 4. 建てた回帰の門 — **壊して鳴らした証拠つき**

### 4.1 門の名と住所

**`fold: 外の PARADISE_NO_FOLD に常駐の門は黙らされない (verify BLOCK-V1 回帰)`**
**`tests/paradise.test.js:11187-11290`**(畳みの門束の中 = 見張る対象と同じ住所。第56条 b)

**裁くもの**: AC-18 が保証する `PARADISE_NO_FOLD=1` を立てた世界で、
**常駐の畳みの門が赤を一本も出さないこと。**

**設定ではなく走行を読む**(第16条)。自分自身の写しを作り、**CI の `📒 Fold` 段と同じ env**
(`PARADISE_NO_FOLD=1` + 仮台帳)で子プロセスとして撃ち、`N green, M red` の名乗りを**数で**受け取る。
`foldEnv` の綴りを `grep` するだけでは「旗を落とす関数が在るが誰も使っていない」実装を
素通しする(prove M-10 / M-11 の無音がまさにそれだった)。

### 4.2 二つの作法上の判断(いずれも実測で踏んだ)

1. **子から自分だけ外す(`--gate-not '^fold: 外の PARADISE_NO_FOLD'`)。**
   外さねば**子が孫を生んで再帰する** —— 実測で踏んだ(最初の版は `1 of 501 — 0 green, 1 red` で
   自分自身に落ちた)。**これは門の除外ではない**: 子で測る対象は「旗に黙らされる 4 門」であって
   この門自身ではないので、**失う歯は一本も無い**。親の走行ではこの門は常に走る(§3.1/§3.2 が示す)。
2. **変異点の綴りを二つに割って組み立てる**(`'delete e.' + 'PARADISE_NO_FOLD;'`)。
   門の本文が変異点の綴りをそのまま含むので、素朴な `replace` は**自分の文字列リテラルに当たる** ——
   実測で踏んだ(同じ綴りが 2 箇所に出て、変異が意図しない側に当たった)。
   置換先が `foldEnv` の中であることも `assert` で検めている。`fold.test.js` の塊マーカーと同じ作法である。

### 4.3 **壊して鳴らす** — 現物に変異を撃った生出力

**作法**: 生バイトを読み、`finally` で書き戻し、**sha256 の一致を確かめた**
(`git checkout --` は使っていない)。

```
sha256 BEFORE   = 1037f546f23b6a7f491e8259e174fd179ddef0a96c86fd3debd8096d37a7a8ab  (738,177 bytes)
sha256 MUTATED  = bd9817ce8c4ff48dc568af1e3cf13c1c177ced8436165016515684d0fd48eca0
変異: tests/paradise.test.js の `delete e.PARADISE_NO_FOLD;` を
      `/* 旗を落とす宣言を抜いた — 故障注入 */` に潰した(= BLOCK-V1 の再現)

$ PARADISE_NO_FOLD=1 node tests/paradise.test.js --gate '^fold:'
  ✗ fold: 宣言外の状態に依る走行は畳まれない (揟2 / 第37条)          + 'disabled'
  ✗ fold: 総数と実行数は別の数である (第22条 / 揟4)
  ✓ fold: 数が閉じる — 錠は畳みの関数の外に立つ
  ✓ fold: 畳みの門番は絞り込みの外に立つ
  ✗ fold: 何もかも畳む機構は測定ではない                            + 'disabled'
  ✗ fold: 畳んだ走行は写し元を名乗る — 名乗りは死にコードの後ろへ移らない (prove M-14)
  ✗ fold: 外の PARADISE_NO_FOLD に常駐の門は黙らされない (verify BLOCK-V1 回帰)   ← **鳴った**
  ✓ fold: 改修は門を減らしていない — 本数が基準を下回らない
  ✓ fold: 台帳の番兵は汚した門を名指す
Paradise gate-filter: 9 of 501 gates matched — 4 green, 5 red
EXIT=1

sha256 RESTORED = 1037f546f23b6a7f491e8259e174fd179ddef0a96c86fd3debd8096d37a7a8ab   MATCH=True
```

生出力: `$LOCALAPPDATA/Temp/rw2/break-ring.txt`

> **鳴らない門は門ではない。この門は鳴った。**
> しかも**鳴り方が病の形と一致している**: 塞ぎを抜いた瞬間、verify が名指した**まさにその 4 門**が
> `disabled` で落ち、**新しい門がそれを 5 本目として名指した**。
> 門はこれを数でも縛っている(`bad.red >= ok.red + 4`)—— **別の病で偶然鳴ることを許さない。**

### 4.4 この門の盲点(第62条 a — 自分で名指す)

- 子で撃つのは**畳みの門束だけ**(`--gate '^fold:'`)である。「全 501 門が旗の下で緑」は
  **この門ではなく全走そのものが示す**(§3.2)。
- 子の走行は約 **2 分**かかる(実測)。**この門は重い。** だが軽くする道(ソースの `grep`)は
  prove 相 M-10 / M-11 で**無音だと実証済み**なので採らない。

---

## 5. 門の本数 — **減っていない(+1)**

```
$ node tests/paradise.test.js --gate-list | tail -1
Paradise gate list: 501 gates          ← exit 0
```

| 時点 | 本数 |
|---|---|
| 改修前 `6641e3b` | 492 |
| verify 入口 `2fdd8fb` | 500 |
| **本稿の後** | **501**(+1 = §4 の回帰の門) |

**強い制約「500 を下回らない」を満たす。** 一本も減らしておらず、
**skip も門の除外も一つも足していない**(§2.2 (d) / §4.2)。
常駐の門 `fold: 改修は門を減らしていない` がこれを機械可読に握り続けている。

---

## 6. **R-V1(検証の自己畳み)— 塞がない。** 利害を数で述べた上での判断

### 6.1 何が起きたか(verify §1 の事故)

verify の神官の最初の全走が、**一門も走らずに緑を名乗った** —— 出力 **173 バイト**、`EXIT=0`、
写し元は**教主が数時間前に撃った走行の領収書**。手元の `runId()` が
`hostname + ROOT` の定数(`graph/fold.js:72-79`)なので、**走行を跨いで畳む**からである。

現物の台帳にその痕跡が残っていた:

```
$ cat .claude/paradise-fold-ledger.jsonl
{"at":"2026-09-21T06:27:05.532Z",                              "key":"21148fac…","exit":0,"summary":"…500 passed, 0 failed"}
{"at":"2026-09-21T08:36:55.589Z","run":"local-9101cc8e1ffc5732","key":"a276973d…","exit":0,"summary":"…500 passed, 0 failed"}
{"at":"2026-09-21T09:17:30.491Z","run":"local-9101cc8e1ffc5732","key":"a276973d…","exit":1,"summary":"…496 passed, 4 failed"}
```

**同じ `run` で同じ鍵、`exit` が 0 と 1 に割れている** —— これは `selectRows()` が
`ledger-unreadable` を投げる形である(security S-3 の錠が効く)。**今この台帳は畳めない。**
偶然に守られている状態であり、**設計が守っているのではない。**

### 6.2 **塞がない。** 理由を数で述べる

| 塞ぎ方 | 手元の畳みに何が起きるか | 判断 |
|---|---|---|
| **`runId()` に時刻の粒を入れる**(走行ごとに別 ID) | **手元の畳みが完全に死ぬ。** 同じ `run` の領収書が二度と現れないので `mine` が常に空 = `bail=no-receipt`。**手元では畳みの値打ちがゼロになる** | ❌ |
| **`verify` 相だけ台帳を振り替える運用を掟に書く** | 畳みの値打ちは保つ。だが**掟は人を縛らない** —— verify の神官は既に一度踏んだ | 🟡 §6.3 |
| **塞がない(現状維持)** | 手元の畳みは生きる。CI は元から安全(§6.4) | ✅ **採る** |

**数で述べる。** この機の全走は **508 秒**(§3.2 の実測)。材料は **278 ファイル / 13.2 MB**、
鍵は**註釈一行でも動く**(`fold.test.js` の門が実測で縛っている)。つまり:

- **手元で畳みが効く場面は「一字も変えずに二度撃つ」時だけ**であり、そこで**508 秒**が浮く。
  この改修の目的(CI 時間の短縮)の手元版であり、**神が同じ全走を撃ち直す時の唯一の救いである。**
- **`runId()` に時刻を入れれば、この 508 秒の節約が常にゼロになる。**
  手元で畳みが効く場面は**構造的に消える** —— AC-08「手元の台帳は走行を跨いで生きる」を
  実装から抹消するに等しい。`fold.js:64-67` の註釈が「**それが手元での畳みの値打ちそのものである**」と
  明記している設計判断を、**一相の事故を理由に反転させることになる。**
- 対して**塞がないことの害は 508 秒ではなく「検証が省略される」ことである** —— 害の性質が重い。
  だが**その害は手元にしか無い**(§6.4)。

> **判断: 器を変えない。** 第57条「**修理は掟を広げるな**」の裏返しである ——
> **一相が踏んだ事故を理由に、器の設計判断(AC-08)を狭めてはならない。**
> R-V1 は**器の欠陥ではなく相の作法の欠陥**である。作法は §6.3 の形で残す。

### 6.3 ではどう守るか — **本稿が実際に採った作法**(掟ではなく実践で示した)

本稿の全走はすべて**畳まれていない**。それを**先頭行と所要と出力サイズの三つ**で示した(§3.2):

```
Paradise fold: Executed 1 out of 1 runs (0 reused, bail=disabled)    ← 実際に走った名乗り
SECONDS=508                                                          ← 畳んだ走行は 1 秒未満
59,854 bytes                                                         ← 畳んだ走行は 173 バイト
```

> **検証を目的とする全走は、先頭行の `(N reused` を読んでから結果を信じよ。**
> `reused` が 0 でない全走の緑は、**その相の緑ではない。**

⚠️ **この作法は本稿では「実践した」だけであり、門にしていない。**
門にするなら「verify 相の全走は `reused=0` を名乗らねばならない」を裁く必要があるが、
**それは相の外(運用)の話であり、この倉の門が裁ける形を本稿は見つけていない**(§7)。

### 6.4 CI では起きない(静的読解 — **撃っていない**)

`graph/fold.js:72-75` を読む限り、CI では `PARADISE_FOLD_RUN=gh-<run_id>-<run_attempt>` が
走行を隔て、無ければ `CI=true` の枝で **`null` = 畳まない**(fail-closed / 揟7)。
台帳も `runner.temp` に住む(S-2)。**ゆえに R-V1 は手元だけの病である。**
⚠️ **これは `tribunal.yml` と `fold.js` の読解による。本物の CI 走行では撃っていない**(§7)。

---

## 7. 直さなかったもの — **残債として名を与える**

**測らなかったものを緑と呼ばない**(第37条)。

| 名 | 重み | 何が残っているか | なぜ残したか |
|---|---|---|---|
| **R-V1「検証の自己畳み」** | MEDIUM | 手元の `runId()` は走行を跨いで定数。検証目的の全走が過去の領収書で畳まれうる | §6 で**利害を数で述べて塞がないと判断した**。塞げば手元の畳み(508 秒)が構造的に死ぬ。AC-08 の設計判断を一相の事故で反転させない(第57条) |
| **R-V2「畳まれていないことを裁く門が無い」** | LOW | §6.3 の作法(`reused=0` を読んでから信じよ)は**実践しただけで門になっていない** | 裁く対象が「相の作法」であり倉の外に在る。**この倉の門が裁ける形を見つけていない**(見つけていないと書くのが正直である) |
| **`.github/workflows/tribunal.yml` への手当て** | — | `⚖️ Self-test` 段に `PARADISE_NO_FOLD: '1'` を**足していない** | 足す必要が無くなった —— **門が旗の下で緑になった**のだから、CI の配置は自由である。**逆に言えば、本稿が塞いだのは「誰かが足した日に鳴る罠」である**(verify §3.5 の予見がそのまま塞がった) |
| **本物の CI 走行での実証** | — | §6.4 の判断、畳みによる CI 時間の短縮(2,070s → ?)は**手元では一度も測っていない** | 手元に GitHub Actions が無い。verify §7 の残債をそのまま引き継ぐ。**PR を開いて初めて実証される** |
| **素の環境(`CLAUDE_HOME=/nonexistent`)の全走** | — | verify V3 の 69 赤(既往症)は**本稿では撃ち直していない** | verify が条件を揃えた基準線比較で**新病ゼロ**を確定済み(`diff` が IDENTICAL)。本稿の変更は `tests/paradise.test.js` の畳みの門束**のみ**であり、それら 69 門は `fold:` に一つも触れない(verify §4.3 の実測) |
| **命令 C の所要秒** | — | 二つの全走を鎖にして背景で撃ったので、C の `SECONDS` は B の完了後に計った値である | 数そのものは記録されているが、**B と C を同条件で計時した比較ではない**(直列実行の熱の影響を測っていない)。実測は両方 **508 秒**で一致した |
| **R-V3「殺された子が写しを残す」** | LOW | §4.2 の再帰を踏んだとき、孫の写し `tests/.paradise-blockv1-sane-12024.js` が**一本残った**(親の `finally` は回るが、**取り消された孫のそれは回らない**)。手で消した | 再帰を止めた今、孫は生まれないので**原因は消えている**。だが「殺された子の後片付け」は畳みの門束に限らず**倉の全域に在る作法の穴**であり、既存の `.paradise-f1-probe-<pid>.js` 系も同じ性質を持つ。**本稿の範囲で直すのは修理を広げること**である(第57条) |
| **verify V2 / V2b / V3 / VBASE の撃ち直し** | — | worktree 絡みの測定(verify §6 の罠)は**本稿では再現していない** | 本稿の対象は BLOCK-V1 一件である。verify §6 の掟(「比較は両側を同じ種類の場所で撃て」)に従い、**本稿の全走はすべて本物の倉で撃った** |

---

## 8. 触れなかったもの(強い制約の確認)

| 制約 | 守ったか | 証拠 |
|---|---|---|
| 門を一本も減らすな(`--gate-list` ≥ 500) | ✅ | **501 gates**(§5) |
| 門を緩めるな(第57条 / skip で逃げるな) | ✅ | skip ゼロ。`--gate-not` は§4.2 の再帰止めのみで、親では常に走る |
| 借り物 `overlay/vendor/` に触れるな | ✅ | 触れていない |
| `CLAUDE.md` を書き換えるな | ✅ | 触れていない |
| push するな | ✅ | していない |
| 変異は生バイト + `finally` + sha256 | ✅ | §4.3(`MATCH=True`)。`git checkout --` は使っていない |
| 現物の台帳を汚すな | ✅ | 門は仮台帳へ振り替え。番兵 `fold: 台帳の番兵は汚した門を名指す` が両全走で緑 |

変更したファイルは **`tests/paradise.test.js` 一本のみ**である(器 `graph/fold.js` は一行も変えていない)。
BLOCK-V1 は**器の欠陥ではなく門の宣言の欠落**だったので、これが正しい手当ての範囲である。

---

## 9. 裁定

| 問い | 答え |
|---|---|
| **1. 赤を自分で再現したか** | **した。** `4 red` / exit 1(§1)。verify §3.2 の 4 門と完全一致 |
| **2. 同じ命令で緑になったか** | **なった。** `9 green, 0 red` / exit 0(§3.1) |
| **3. 回帰の門を建てたか** | **建てた。** `fold: 外の PARADISE_NO_FOLD に常駐の門は黙らされない`(§4) |
| **4. 壊して鳴ったか** | **鳴った。** 塞ぎの一行を抜くと `5 red` / exit 1、sha256 復元一致(§4.3) |
| **5. 二つの全走は緑か** | **両方緑。** `501 passed, 0 failed` / exit 0 ×2(§3.2) |
| **6. 門は減っていないか** | **501**(500 → +1)(§5) |
| **7. R-V1 を塞いだか** | **塞がない。** 利害を数で述べた上での判断(§6)。残債として名を残した |

### ✅ **BLOCK-V1 は塞がった。**

`PARADISE_NO_FOLD=1` —— **AC-18 が保証する公の逃げ道** —— を立てても、
**畳みを見張る常駐の門 9 本すべてが自分の測りたい振る舞いを測り、緑を名乗る。**
逃げ道はもう罠ではない。
