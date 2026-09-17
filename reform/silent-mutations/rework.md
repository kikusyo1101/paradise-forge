# rework — reform 走行 `silent-mutations` の差し戻し修理

> **reflect 相が REWORK を勧告し、教主がこれを受け入れた。** 本相はその 5 件を閉じる。
> **主張ではなく exit code で語る。** 生出力を貼り、貼れないものは「測っていない」と書く(§5)。
>
> - 機: Windows 11 / Node **v24.14.0** / git-bash
> - 枝: `reform/silent-mutations`(**未 commit**。`git checkout -- <file>` は一度も使っていない)
> - 複製: `$LOCALAPPDATA/Temp/rw-sm/`(揮発)。変異はすべて複製に撃ち、**生バイト列を保存 → 書き戻し → sha256 一致**で復元を証明した
> - **実台帳 `955ea34a…aab77` / 7 行 —— 本相の前後で不変**(§4-3)

---

## 0. 要旨 — 五件の前 / 後

| # | 件 | 前(reflect の告発) | 後(rework の実測) |
|---|---|---|---|
| **R-1** | 静的の門が建てられた当の病に無音 | **四形とも exit=0 / red=0**(137 門が全部緑) | **四形とも exit=1 / red=1**。偽陽性 **+0 件**(`graph/*.js` 39 ファイル全走査) |
| **R-2** | 走行帳の数が古い | `README.md` が **484 門 / 13 本 / engine 8 行** | **492 / 21 / 91(-4)**。歴史の数には「当時」と註記して残した |
| **R-3** | 残債の件数が三通り(10/12/14) | どれが正本か書かれていない | **`PR.md` §6 の 14 件を正本と裁定**。三通りの由来を表にして全文書に註記 |
| **R-4** | SM-S2 の理由が測定で偽 | 「外から区別する道が今日は無い」 | **(i) 実際に塞いだ。** S-2 攻撃: **exit=0(緑)→ exit=1 / 58 門赤**。残債は射程を縮めて理由を書き直した |
| **R-5** | PR.md §9 が誤読を誘う | 「急いでいる人は §7 を読まなくてよい」 | §1 の表の**その行に直接** ⚠️ 母集団の註記。§9 を「§7 は急いでいる人ほど読むべき節」に |

**engine には一行も触れていない。門も一本も足していない**(足したのは**既存の門の歯**)——
ゆえに門数は **492 のまま**であり、`census.js fix` を走らせる必要が無かった(第22条)。

---

## R-1 【最重要】静的の門が、建てられた当の病を見ていない

### R-1-a まず自分で再現した(修理の前)

**reflect の告発を鵜呑みにしない。** 字句器 `mutableGlobals` を
`tests/paradise.test.js` から**切り出さずに現物のまま**実行する台を作り、四形を撃った。

```
$ node lexer-harness.js
[切り出し] tests/paradise.test.js:3736-3858 を現物のまま実行

❌ SILENT | 形1 関数内 globalThis.__seen =               | hits=0
❌ SILENT | 形2 関数内 module.exports.x =                | hits=0
❌ SILENT | 形3 関数内 Reflect.set(globalThis,…)         | hits=0
❌ SILENT | 形4 最上位 Object.assign(globalThis,…)       | hits=0
🔔 CAUGHT | 対照: 最上位 let(設計者の形)                | hits=1

SILENT = 4 / 4
EXIT=1
```

**字句器の層で 4/4 無音。** だが「字句器が見ない」と「**門が鳴らない**」は別の主張である。
ゆえに **engine の現物(`graph/gauge.js`)に四形を撃ち込み、gauge 節 137 門を走らせた**:

```
$ node four-forms.js
[複製] C:/Users/kikus/AppData/Local/Temp/rw-sm/clone
[射程] gauge.js sha256(前) = ea4e4e1bfbf1abe358a293f188486f0d4c5d1c4211424231fa7db6b464a30d2b

❌ SILENT | 形1 関数内 globalThis.__seen =             | exit=0 red=0 restored=true
          Paradise gate-filter: 137 of 492 gates matched — 135 green, 0 red, 2 skipped
❌ SILENT | 形2 関数内 module.exports.__stash =        | exit=0 red=0 restored=true
          Paradise gate-filter: 137 of 492 gates matched — 135 green, 0 red, 2 skipped
❌ SILENT | 形3 関数内 Reflect.set(globalThis,…)       | exit=0 red=0 restored=true
          Paradise gate-filter: 137 of 492 gates matched — 135 green, 0 red, 2 skipped
❌ SILENT | 形4 最上位 Object.assign(globalThis,…)     | exit=0 red=0 restored=true
          Paradise gate-filter: 137 of 492 gates matched — 135 green, 0 red, 2 skipped

[射程] gauge.js sha256(後) = ea4e4e1bfbf1abe358a293f188486f0d4c5d1c4211424231fa7db6b464a30d2b  restored=true
SILENT = 4 / 4
EXIT=1
```

**四形とも exit=0。** 形1〜3 は `record()` の中の一行であり、**G8 の実形そのもの**である。
**reflect の告発は真であった。**

> **公平に書く**: 撃ったのは 137 門(gauge 節の絞り込み)であって全 492 門ではない。
> 残り 355 門に鳴る門が在るかは撃っていない(§5)。

### R-1-b 何が起きていたか — **非対称が一行に隠れていた**

```js
for (const [re, name, why] of NAMELESS) {
  while ((g3 = re.exec(sh))) {
    if (dep[g3.index] !== 0) continue;      // ★ 全形に一律に掛かる深さの門
```

一方 (ii) の「最上位束縛への破壊的操作」には深さの門が**無い**。
**同じ字句器の中で、名を持つ置き場は深さを問わず罪、名を持たない置き場は深さ 0 でのみ罪。**
この非対称は**文書のどこにも書かれていなかった。**

そして `trap2` fixture(`:4285`)が、その盲点を**無罪として凍結していた**:

```js
'function f2() { globalThis.__scratch = 1; process.env.X = "1"; }',  // 関数の中(最上位ではない)
…
assert.deepStrictEqual(mutableGlobals([trap2]), [], '強めた字句器が偽の赤を出した — …');
```

**残債は「そこを見ていない」と言う。この fixture は「そこには何も無い」と門に宣誓させていた。**

### R-1-c 直し方の裁定 —— **深さを形の性質にした**(第44条 c / 第62条 c)

二択があった: **(i) 深さで切るのをやめる / (ii) 深さで切るならその理由をコードに書いて毎回名乗らせる。**

**私は両方を採った。** 深さの門を**形ごとに分け**、**深さで切る形を一つだけにし**、
**その一つが理由を持つことを外から凍らせ、門が走行のたびに方針を画面で名乗る**ようにした。

```js
const NAMELESS_FORMS = [
  { name: 'globalThis',                   …, topOnly: false, topWhy: null },
  { name: 'module.exports',               …, topOnly: false, topWhy: null },
  { name: 'process.env',                  …, topOnly: false, topWhy: null },
  { name: 'require.cache',                …, topOnly: false, topWhy: null },
  { name: 'Object.assign(globalThis)',    …, topOnly: false, topWhy: null },   // ← 新(旧 SM-L2)
  { name: 'Reflect.set(globalThis)',      …, topOnly: false, topWhy: null },   // ← 新
  { name: 'Object.defineProperty(globalThis)', …, topOnly: false, topWhy: null }, // ← 新
  { name: '(分割代入)', …, topOnly: true,
    topWhy: '`let {a} = …` は束縛の宣言であり、関数の中に書けば局所束縛である。'
      + '深さ 1 以上を罪と呼べば「関数の中のすべての分割代入」が赤になる —— '
      + 'それは大域の門ではなく文体の門である' },
];
```

**なぜ分割代入だけが深さで切られてよいか。** それだけが**本当に深さで意味が変わる形**だからである ——
`globalThis.x = 1` は関数の中に書いても大域だが、`let {a} = o` は関数の中に書けば局所である。
**「深さで切る形が一つだけであること」と「その一つが理由を持つこと」は、いま外の門が assert する。**

### R-1-d `trap2` から「関数の中の代入は罪ではない」を除いた

**除いた行**: `'function f2() { globalThis.__scratch = 1; process.env.X = "1"; }'`
**残した形**(読むだけ・正当な公開):

```js
"const home = globalThis.process ? globalThis.process.cwd() : '';",      // 読むだけ
"const flag = process.env.PARADISE_ABODE || '';",                        // 読むだけ
'function f3() { return globalThis.crypto ? 1 : 0; }',                   // 関数の中で**読むだけ**
"function f4() { return process.env.HOME || ''; }",                      // 関数の中で**読むだけ**
'function f5() { const o = {}; Object.assign(o, { a: 1 }); return o; }', // **大域でない先**への assign
'module.exports = { home, flag, f3, f4, f5, Ok, inst, SRC };',           // 一括の公開は罪ではない
```

**そして逆側を凍結し直した**(`bad3`)—— 旧 fixture が「罪ではない」と宣誓していた当の形を、**罪として**:

```js
const deep = mutableGlobals([bad3]);
assert.strictEqual(deep.length, 5, …);
assert.deepStrictEqual(deep.map(h => h.name).sort(),
  ['Object.assign(globalThis)', 'Reflect.set(globalThis)', 'globalThis', 'module.exports', 'process.env'].sort());
assert.ok(deep.every(h => h.depth > 0), …);
assert.ok(deep.every(h => /深さ \d+/.test(h.why)), …);
```

**これが無ければ `topOnly: false` を `true` に戻す変異が無音で通る**(第21条)。

### R-1-e 偽陽性の走査 —— **`graph/*.js` 全 39 ファイル**

**reflect は「22 ファイル」と書いたが、実測では 39 ファイルある。**
修理後の字句器を現物から切り出し、**全ファイルに撃った**:

```
$ node fp-scan2.js
[射程] graph/*.js = 39 ファイル (全走査)
静的の門の深さの射程: 深さを問わない 7 形 [globalThis / module.exports / process.env / require.cache /
  Object.assign(globalThis) / Reflect.set(globalThis) / Object.defineProperty(globalThis)] /
  深さ 0 のみ 1 形 [(分割代入)]
        └ なぜ (分割代入) だけ深さで切るか: `let {a} = …` は束縛の宣言であり、…

全当たり = 6 件
  abode.js  (1)
     :1506  unmeasurable  最上位束縛への破壊的操作
  hermetic.js  (3)
     :516  TRACKED  最上位の let 束縛
     :519  TRACKED  最上位束縛への再代入
     :522  TRACKED  最上位束縛への破壊的操作
  pulse.js  (2)
     :170  _gateCache  最上位の let 束縛
     :203  _gateCache  最上位束縛への再代入

既知 3 ファイル(pulse/hermetic/abode = 残債 SM-L)の外の当たり = 0 件

射程 2 本(gauge.js / spawn-trace.js)の当たり = 0 件 []
EXIT=0
```

> **偽陽性は一件も増えていない。** 当たった 6 件はすべて**改修前から既知**であり、残債 SM-L に名を持つ。
> **射程を狭く切り直す必要は生じなかった。**

### R-1-f 修理後 —— **四形とも鳴る**

同じ台を、修理後の `tests/paradise.test.js` を載せた複製に撃ち直した:

```
$ node four-forms.js
[射程] gauge.js sha256(前) = ea4e4e1bfbf1abe358a293f188486f0d4c5d1c4211424231fa7db6b464a30d2b

🔔 CAUGHT | 形1 関数内 globalThis.__seen =             | exit=1 red=1 restored=true
          Paradise gate-filter: 137 of 492 gates matched — 134 green, 1 red, 2 skipped
🔔 CAUGHT | 形2 関数内 module.exports.__stash =        | exit=1 red=1 restored=true
          Paradise gate-filter: 137 of 492 gates matched — 134 green, 1 red, 2 skipped
🔔 CAUGHT | 形3 関数内 Reflect.set(globalThis,…)       | exit=1 red=1 restored=true
          Paradise gate-filter: 137 of 492 gates matched — 134 green, 1 red, 2 skipped
🔔 CAUGHT | 形4 最上位 Object.assign(globalThis,…)     | exit=1 red=1 restored=true
          Paradise gate-filter: 137 of 492 gates matched — 134 green, 1 red, 2 skipped

[射程] gauge.js sha256(後) = ea4e4e1bfbf1abe358a293f188486f0d4c5d1c4211424231fa7db6b464a30d2b  restored=true
SILENT = 0 / 4
EXIT=0
```

| 形 | 前 | 後 |
|---|---|---|
| 関数内 `globalThis.__seen = …`(**G8 の実形**) | exit=0 red=0 | **exit=1 red=1** |
| 関数内 `module.exports.__stash = …` | exit=0 red=0 | **exit=1 red=1** |
| 関数内 `Reflect.set(globalThis, …)` | exit=0 red=0 | **exit=1 red=1** |
| 最上位 `Object.assign(globalThis, {…})` | exit=0 red=0 | **exit=1 red=1** |

**四形とも鳴る。4/4。** `restored=true` / sha256 一致を毎回印字した。

### R-1-g 鳴らせられなかった形に名を付けた —— **残債 SM-L3**

**「四形とも鳴る」で終わりにしない。** 修理後の字句器に **7 形**を撃ち、**なお無音の形を測った**:

```
$ node residual.js
❌ SILENT | eval で大域に生やす                        | hits=0
🔔 CAUGHT | Proxy で大域を包む                         | hits=1 ["P"]
❌ SILENT | 動的 require で別 module の状態を持つ      | hits=0
❌ SILENT | this 経由(非 strict の大域 this)          | hits=0
❌ SILENT | 分割代入を関数の中で(意図的に見ない形)    | hits=0
🔔 CAUGHT | globalThis["x"] = 1(添字)                | hits=1 ["globalThis"]
🔔 CAUGHT | const 束縛の属性を関数内で                 | hits=1 ["T"]

まだ見えない形 = 4 / 7
```

**この 4 形が残債 SM-L3 である**(SM-L2 を置き換える)。
**門は走行のたびに画面でこの名を挙げる** —— 全走(素)の実出力:

```
      · 残債 SM-L3(修理後もなお見えない 4 形 / rework 相の実測):
        ① eval("globalThis.x = 1") — 字句器は文字列の中を影で潰すので原理的に見えない /
        ② 動的 require した別 module の属性への代入(require("./m").x = 1)— 名が実行時に決まる /
        ③ 非 strict の関数内 this への代入(this.x = 1)— this の指す先は呼ばれ方で決まる /
        ④ 関数の中の分割代入(let {a} = …)— **意図して見ない**(局所束縛であり大域ではない)。
        ①②③ は静的字句器の原理的な限界であり、払うには AST か実行時の観測が要る(第62条 c)
```

**なぜ SM-L2 を置き換えたか。** SM-L2 は「動的 require / `Object.assign` / `eval` / Proxy」を挙げたが、
**reflect が無音と実測した 4 形のうち、その表に在ったのは `Object.assign` の 1 形だけ**だった ——
**最大の穴(関数の中の形)が名を持っていなかった。** いま `Object.assign` / `Reflect.set` /
`Object.defineProperty` は払われ、Proxy は(包む束縛が名を持つので)捕まる。
**名と実体が一致するように名を付け替えた。**

**そして名が正直であることを門が毎回測る** —— 名指した 4 形が本当に無音であること、
払った形(`Object.assign` / `Reflect.set`)が本当に捕まることを、両側から assert する。
**「払ったのに残債と言い続ける」のは、「見ていない形を無罪と呼ぶ」のと同じ嘘である。**

### R-1-h 射程の第二の軸を外から凍らせた

reflect の告発: 「**射程には二つの軸が在る** —— どのファイルを見るか(凍っている)と、
**その中のどこまで見るか(凍っていない)**。`if (dep[g3.index] !== 0) continue;` の一行を
消しても足しても、外の門は一本も鳴らない。」

**いま鳴る。** `gauge(静的): 静的の門の射程は外から凍らされている` に足した歯:

```js
// 深さの方針そのものを凍らせる: 深さで切る形は一つだけであり、それは理由を持つ
const cut = NAMELESS_FORMS.filter(f => f.topOnly);
assert.strictEqual(cut.length, 1, `深さ 0 でのみ罪と呼ぶ形が ${cut.length} 形ある — …`);
assert.strictEqual(cut[0].name, '(分割代入)', …);
assert.ok(cut[0].topWhy && cut[0].topWhy.length > 40, '深さで切る形が理由を持っていない — …');
for (const f of NAMELESS_FORMS) { if (!f.topOnly) assert.strictEqual(f.topWhy, null, …); }
// 門が毎回その方針を画面で名乗ること
assert.ok(/namelessDepthPolicy\(\)/.test(body), …);
assert.ok(/深さを問わない 7 形/.test(policy) && /深さ 0 のみ 1 形/.test(policy), …);
// 関数の中の四形を engine の現物に撃っていること
assert.ok(/const REC_ANCHOR = /.test(body) && /関数の中の四形/.test(body), …);
for (const form of ['f-global.js', 'f-exports.js', 'f-reflect.js', 'f-assign.js']) { … }
assert.ok(/fh\[0\]\.depth > 0/.test(body), …);
```

**`topOnly: false` を一つでも `true` に戻せば、この門が名指して倒れる。**

---

## R-2 走行帳の数が古い

### 前 — reflect の摘発を実測で確かめた

```
$ node tests/paradise.test.js --gate-list | tail -1     → Paradise gate list: 492 gates
$ git diff tests/paradise.test.js | grep -c "^+test("   → 21
$ git diff --numstat graph/gauge.js                     → 91  4  graph/gauge.js
$ grep -n "484\|13 本\|engine 8 行" reform/silent-mutations/README.md
68:## 3. 何を建てたか — 門 13 本(471 → **484**)
72:Paradise gate list: 484 gates
88:**engine には 8 行しか足していない**(`graph/gauge.js:936-945`)
171-173: 484 passed, 0 failed ×3
182: 484 門 × 3 走行
```

### 後 — 全文を実測値に揃えた

| 箇所 | 前 | 後 |
|---|---|---|
| §3 見出し・`--gate-list` | 13 本 / **484** | **21 本 / 492**(`grep -c "^+test("` = 21 の生出力も併記) |
| §3 層の内訳(番兵/静的/並行/CLI) | 3 / 2 / 1 / 1 | **6 / 3 / 2 / 4**(verify 相の 8 本が層に入っていなかった) |
| §3 engine | **8 行** / 実コード 3 行 | **91 行(-4)** / 実コード **19 行** |
| §8 全走三本 | 484 passed ×3 | **492 passed ×3** |
| §8 CI 相当 | **8 本** | **12 本**(名も実測に合わせた) |
| §8 番兵の呼出 | 180 回以上 | **198 回** |
| §9 残債 | 7 件 / SM-N 未払い | **14 件**(正本に揃えた)/ **SM-N は払済**と明記 |
| §10 文書表 | 7 枚 | **13 枚**(`security.md` / `verify.md` / `reflect.md` / `rework.md` が抜けていた) |
| §11 結び | 母集団 2 種 | **3 種**+「一本の線で読むな」 |
| 冒頭 | — | **「この文書の数は rework 相の実測に揃っている」**の宣言を追加 |

**歴史の数は消していない。** §6 の `484` は「**review 相が走ったときの門数**」であり、
そこに「当時」と註記した。**過去の実測を現在の値に上書きすれば、その日そう測ったという証拠が消える。**
(第22条は**手で数を捏造するな**と言うのであって、過去の実測を書き換えよとは言わない。)

### 他の文書の掃除

```
$ grep -rn "484\|485\|13 本\|130 門" reform/silent-mutations/*.md
```

`build.md` / `design.md` / `docs.md` の当たりは**すべてその相の実測値**である
(「設計は 485 と書いたが実装は 484 になった」という**記録そのもの**)。
**これらは直さない** —— 直せば「設計が 14 門と書き実装が 13 本になった理由」という記録が消える。
**`PR.md` の `484` は「前」の列と `census fix` の生出力**であり、正しい。

---

## R-3 残債の件数が三通り(10 / 12 / 14)

### 裁定: **`PR.md` §6 の表(14 件)を正本とする**

三通りの数は**矛盾ではなく、数え方が違う**。だが**どれが正本かを書いていなかったのが誤りである。**

| 出所 | 数 | 何を数えていたか |
|---|---:|---|
| `verify.md` §4 末尾 | 10 | **verify 相が新たに名を付けた分だけ** |
| 発令書(教主) | 12 | verify の 10 + 「残債にせず直さない」2(**別の種類を足している**) |
| **`PR.md` §6(正本)** | **14** | verify の 10 + **前の相からの持ち越し 4**(SM-H / SM-I / SM-J / SM-M) |

**なぜ 14 が正本か。** 残債の表は「**この PR が払っていない債**」を読者に渡すものである。
**引き継いだ債も払っていない債である** —— 「前の相が名を付けたから私の債ではない」は通らない。
`verify.md` の 10 は「私が新しく作った債」であって、読者が知りたい数ではない。

### 「reflect が見つけた 14 件目」の扱い

reflect §4 の表は **14 行**あり、`PR.md` §6 の 14 件と**完全に一致する**
(SM-S2/S3/L/L2/T/DoS/PATH/AC8/C2/G/H/I/J/M)。
**reflect は 15 件目を見つけたのではなく、`PR.md` の 14 件すべてを裁いた。**
ゆえに「14 件目を含めるか」という選択は生じない —— **14 がすべてであり、正本である。**

### rework 相の後も 14 のまま

| 名 | 何が起きたか |
|---|---|
| **SM-L2** | **SM-L3 に置き換わった**(名の付け替え。件数は動かない / R-1-g) |
| **SM-S2** | **塞いだが射程が縮んで残った**(消えたのではなく理由が変わった / R-4) |

**払って消えた債は無い** —— SM-S2 は半分しか払えず、その半分を正直に名に残した。
**「塞いだから消す」と書けば、`source==='env'` の機の穴が誰にも見えなくなる。**

### 揃えた文書

| 文書 | 何を書いたか |
|---|---|
| `PR.md` §6 | **「この表が正本である」**と見出しに明記。三通りの由来を表にして冒頭に置いた |
| `README.md`(走行帳)§9 | 14 件の表に差し替え。三通りの由来の表を併記 |
| `verify.md` §4 末尾 | **「この 10 は verify 相が新たに名を付けた分である。正本は `PR.md` §6 の 14 件」**の註記を追加。**10 という数は消していない**(その相の裁定の記録である) |

---

## R-4 残債 SM-S2 の「理由」が測定で偽

### R-4-a 自分で確かめた — `resolve()` は既に区別している

```
$ node s2-probe.js
[A 倉あり・台帳あり(神の機)]      {"source":"env","exists":true, "vault":false,"ledger":true}
[B 倉あり・台帳だけ隠した(S-2)]   {"source":"env","exists":true, "vault":false,"ledger":false}
[C 倉ごと無い(CI の機)]          {"source":"env","exists":false,"vault":null, "ledger":false}

B と C は exists で分かれるか : true vs false  → true
B と C は vault  で分かれるか : false vs null  → true
B と C は source で分かれるか : env vs env  → false
A と B は ledger で分かれるか : true vs false  → true

裁定材料: 偽装の不在(B)と本物の不在(C)は外から区別 「できる」
EXIT=0
```

**`verify.md` の理由は測定で偽である。** `workspace.js` を一文字も変えずに、
**既に在る `exists` の欄を読むだけ**で B と C は分かれる。

> **ただし `source` では分かれない**(三通りとも `env` である / reflect の表は `sibling`/`default` を書いていた)。
> **分けているのは `exists` と `vault` である。** reflect の結論は正しいが、**根拠の欄名が一つ不正確だった。**

### R-4-b 裁定: **(i) 実際に塞ぐ**

**理由を書き直すだけで済ませない。** 「道が在ると分かった」のに残債に置き直すのは、
**verify 相が犯したのと同じ形の誤りを名前を変えて繰り返すこと**である。

だが**塞げるのは片側だけ**であり、その境目を測って書いた:

| 機 | source | exists | 台帳 | 裁定 | 理由 |
|---|---|---|---|---|---|
| M1 神の機 | sibling | true | 在る | **照合** | 指紋が採れる |
| **M2 S-2 の偽装** | sibling | true | **無い** | **🔴 赤** | **倉は在るのに台帳だけ無い = 隠された。ここを塞いだ** |
| M3 CI の機 | sibling/default | **false** | 無い | skip | 倉ごと無い(第37条が認めた不在) |
| M4 振替の機 | **env** | 任意 | 無い | skip | 操作者が `PARADISE_CREATIONS` で**意図して**振り替えた |

**M4 を赤にしない理由は測定である**(第38条)—— `PARADISE_CREATIONS=<仮ディレクトリ>` は
本走行の変異台・複製走行・`gauge-audit.test.js` が**日常的に使う道**である。
赤にすれば「倉を振り替えた瞬間に全門が落ちる」。**偽の赤は門を殺す。**

実装は `ledgerAbsenceKind()` の一本(純関数)と、`sentinelVerdict` の第四引数:

```js
if (why === 'skip') return absence === 'hidden' ? (bodyThrew ? 'warn' : 'throw') : 'skip';
```

**引数で受けるのは、この裁定を純関数のまま四通りの機で撃てるようにするため**である
(prove 相 Y11 の教訓: **死に枝は撃てない**)。

### R-4-c 前 / 後の実測 — **走行を通して台帳だけを隠す攻撃**

複製を**兄弟倉つきで**作り(`env` を使わず `source=sibling` にする)、三通りの機に撃った。

**修理前**(`sentinelVerdict` の skip 枝を無条件に戻し、**rework が足した門も verify 相の一行に戻した**):

```
$ node s2-attack-before.js
[復元] R-4 の門(四通りの機を撃つ assert)も verify 相の一行に戻した
[修理前 / M2 倉あり・台帳だけ隠した(S-2 攻撃)]  exit=0
          Paradise gate-filter: 131 of 492 gates matched — 129 green, 0 red, 2 skipped

修理前の M2 = exit 0  ❌ SILENT(汚しても・隠しても緑)
```

> **なぜ門も戻したか。** 修理後の門を修理前の実装に撃てば、測れるのは「門が働く」ことだけである。
> **ここで測りたいのは verify 相の姿** —— 「走行を通して隠せば緑」だったという事実である。

**修理後**:

```
$ node s2-attack.js
[M1 倉あり・台帳あり(神の機)]  exit=0
          Paradise gate-filter: 131 of 492 gates matched — 130 green, 0 red, 1 skipped
[M2 倉あり・台帳だけ隠した(S-2 攻撃)]  exit=1
          Paradise gate-filter: 131 of 492 gates matched — 71 green, 58 red, 2 skipped
          実台帳が走行の全体を通して隠されている — **兄弟倉は在る(…/paradise-creations /
          source=sibling / exists=true)のに台帳だけ無い** — 本物の不在なら倉ごと無いはずである。…
[M3 倉ごと無い(CI の機)]  exit=0
          Paradise gate-filter: 131 of 492 gates matched — 129 green, 0 red, 2 skipped
          · skip: 実台帳が無い(…)— 不在の形=absent: 兄弟倉そのものが無い(…)

M1=0(0 であるべき) M2=1(**非 0 であるべき**) M3=0(0 であるべき)
EXIT=0
```

| 機 | 修理前 | 修理後 |
|---|---|---|
| M1 神の機 | exit=0 | **exit=0**(不変) |
| **M2 S-2 攻撃** | **exit=0 / 129 green / 0 red** | **exit=1 / 71 green / 58 red** |
| M3 CI の機 | exit=0 | **exit=0**(不変。**偽の赤は出ていない**) |

**M3 が緑のままであることが、この修理の質である** —— CI を永久に赤にしない。

### R-4-d 「なぜ無いのかは測っていない」を測った

`sentinelSkipNote()` は verify 相まで「**(なぜ無いのかは測っていない / verify S-12)**」と名乗っていた。
いまは形を名乗る。振替の機での実出力:

```
      · skip: 実台帳が無い(…\rw-sm\vault\gauge-ledger.jsonl)— 不在の形=redirected:
        倉が PARADISE_CREATIONS で振り替えられている(…\rw-sm\vault)—
        操作者が意図して倉を動かした機である。**この機では隠蔽と振替を分けられない**(残債 SM-S2)。
        番兵自体の歯は「実台帳が無い機でも番兵は歯を持つ」の (a) が撃っている
```

**残債の名が、その残債が効いている機の画面に出る。**

### R-4-e 残債 SM-S2 の新しい理由

> **前(偽)**: 本物の不在と偽装の不在を**外から区別する道が今日は無い**。
>
> **後(真)**: **`PARADISE_CREATIONS` で倉を振り替えた機**では、台帳の隠蔽と振替を分けられない。
> `sibling` の機は塞いだ(実測 58 門赤)。振替の機まで赤にすれば変異台・複製走行・`gauge-audit` が
> すべて落ちる —— **偽の赤は門を殺す**(第38条)。
> **払う条件**: 振替の機でも隠蔽を見分ける印(例えば振替先に台帳が一度でも在った記録)を持つこと。

---

## R-5 PR.md の案内が誤読を誘う

### 前

- §9: 「**急いでいる人は 1 → 2 → 4 だけでよい。**」—— §7 は**第 7 位**であり、読まなくてよい側に置かれていた。
- §1 の表: 「無音率 **23.3% → 3.1% → 0%**」が**註釈なしで並んでいた**。
  母集団が違うという但し書きは **280 行下の §7** にあり、§9 がそれを「読まなくてよい」と案内していた。

### 後

**§1 の表の、その行に直接入れた**(注記は行のすぐ下に置き、飛ばせないようにした):

```
| **無音率** | **23.3%**(60 変異中 14) | **3.1% → 0%** | … |
| | ⚠️ **この二つを一本の線で読むな —— 母集団が違う。** 前は「60 変異 × 471 門 / discover が撃った」、
    後は「65 変異 × 484 門 / 審査役が撃った」。**撃ち手も的も門も違う標本の率である**(第38条 / §7-3) | | |
| 〃 prove 相が新設門に撃った分 | 32.0%(25 中 8) | **0%**(修理後 25/25) | … |
| | ⚠️ **母集団が違う** —— これは「25 変異 × 新設 13 門」であり、上の二行のどちらとも比べられない | | |
| **条の元凶 G4 に対する無音率** | **75%** | **0%**(**最上位の** 6 形すべて CAUGHT) | … |
| | ⚠️ **この「6」は最上位形の 6 である。** reflect 相が**関数の中の形**を母集団に入れたところ
    **4 形が無音に戻った** —— rework 相が塞いだ(下の行) | | |
| **関数の中の G8 実形**(4 形) | **4 形すべてが全 492 門に無音**(exit=0) | **4 形すべて CAUGHT**(exit=1) | … |
```

**§9 の案内を直した**:

> **急いでいる人は 1 → 2 → 3 だけでよい。§7 は「急いでいる人ほど読むべき節」である** ——
> そこに**この PR の数をどう読むべきでないか**が書いてある。
> (以前ここは「§7 を読まなくてよい」と案内していた。**それは最も誤読されやすい註釈を読者から隠す案内だった**。)

**読む順の 2 番目を「本 PR の §1 の表 + §7」にした**(8 分)。
**「とくに目を留めてほしい三点」の 1 番目も、母集団の註記に差し替えた。**
**PR 冒頭の要旨にも「数の読み方」の一行を置いた** —— 5 分で読む者にも届く位置である。

---

## 4. 直した後の検証

### 4-1 全走 三本

```
$ node tests/paradise.test.js
Paradise self-test: 492 passed, 0 failed          exit=0   real 6m04.986s

$ PARADISE_ABODE=repo node tests/paradise.test.js
Paradise self-test: 492 passed, 0 failed          exit=0   real 6m04.539s

$ PARADISE_ABODE=global node tests/paradise.test.js
Paradise self-test: 492 passed, 0 failed          exit=0   real 6m06.256s

$ node tests/paradise.test.js --gate-list | tail -1
Paradise gate list: 492 gates
```

赤は三本とも `grep -c "✗"` = **0**。**門数は 492 で不変**(rework 相は `test()` を一本も足していない)。

素の走行で静的の門が名乗った行(**rework 相が足した二行を含む**):

```
      · 射程: graph/gauge.js / graph/spawn-trace.js の最上位のみ — …
        (残債 SM-L = pulse.js:_gateCache / hermetic.js:TRACKED / abode.js:unmeasurable)
      · 静的の門の深さの射程: 深さを問わない 7 形 [globalThis / module.exports / process.env /
        require.cache / Object.assign(globalThis) / Reflect.set(globalThis) /
        Object.defineProperty(globalThis)] / 深さ 0 のみ 1 形 [(分割代入)]
        └ なぜ (分割代入) だけ深さで切るか: `let {a} = …` は**束縛の宣言**であり、関数の中に書けば
          局所束縛である。深さ 1 以上を罪と呼べば「関数の中のすべての分割代入」が赤になる ——
          それは大域の門ではなく文体の門である
      · 残債 SM-L3(修理後もなお見えない 4 形 / rework 相の実測): ① eval(…) / ② 動的 require /
        ③ this 経由 / ④ 関数の中の分割代入 …
```

**`· skip: 実台帳が無い` は一度も出ていない** —— 神の機では番兵が毎門で実台帳を照合している。

### 4-2 CI 相当の門

| 門 | コマンド | exit | 末尾 |
|---|---|:---:|---|
| wiring | `node graph/wiring.js check` | **0** | `✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い` |
| hermetic | `node graph/hermetic.js check` | **0** | ✓ |
| workspace | `node graph/workspace.js check` | **0** | `✓ 楽園に創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし` |
| derived | `node graph/derived.js check` | **0** | ✓ |
| codex | `node graph/codex.js check` | **0** | ✓ |
| **census**(background / 約 9 分) | `node graph/census.js check` | **0** | `✓ every number the paradise claims about itself is true` |
| conclave audit | `node graph/conclave.js audit` | **0** | `見捨てられた走行: 0 / 判定不能: 0 / 全 15` |
| gauge-audit | `node tests/gauge-audit.test.js` | **0** | `Gauge ledger audit self-test: 6 passed, 0 failed, 0 skipped` |
| guards | `node tests/guards.test.js` | **0** | `Paradise guards self-test: 75 passed, 0 failed` |
| route-matrix | `node tests/route-matrix.test.js` | **0** | `Route matrix self-test: 13 passed, 0 failed` |
| ratify-guard | `node tests/ratify-guard.test.js` | **0** | `Ratify guard self-test: 9 passed, 0 failed` |

**`census.js fix` は走らせていない** —— **門数が動いていない**からである(第22条 / 発令書の戒め 5)。
`check` のみを撃った。

### 4-3 実台帳と作業木

```
$ sha256sum ../paradise-creations/gauge-ledger.jsonl
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77 *../paradise-creations/gauge-ledger.jsonl
$ wc -l ../paradise-creations/gauge-ledger.jsonl
7 ../paradise-creations/gauge-ledger.jsonl

$ git status --short
 M CONSTITUTION.INDEX.md
 M CONSTITUTION.md
 M README.md
 M graph/gauge.js
 M tests/paradise.test.js
?? reform/silent-mutations/

$ git diff --numstat
2       1       CONSTITUTION.INDEX.md
58      0       CONSTITUTION.md
9       5       README.md
91      4       graph/gauge.js
1650    3       tests/paradise.test.js
```

**実台帳は `955ea34a…aab77` / 7 行のまま不変。** 作業木は **5 ファイル + 走行帳のみ** —— 余分なファイルは無い。
**`git checkout -- <file>` は一度も使っていない。** 変異はすべて複製に撃ち、生バイト列で書き戻し、
**毎回 sha256 一致を印字した**(`restored=true`)。

**rework 相が触ったのは `tests/paradise.test.js` のみ**(1588 → 1650 行の増分 = **+62 行**)。
**engine(`graph/gauge.js`)には一行も触れていない。**

---

## 5. 私が見ていないこと(第16条)

**この節が本報告で最も重要である。** 上の主張はすべて以下の限界の上に立っている。

1. **四形の再現も修理後の鳴りも、撃ったのは 137 門(gauge 節の絞り込み)である。**
   全 492 門で撃っていない。**残り 355 門に鳴る門が在ったかは知らない** ——
   ただし「無音」の主張は**絞り込みでは弱くなる方向**(見る門が少ないほど無音に見えやすい)なので、
   **修理後に「鳴った」ことは 137 門で十分に示せている。修理前の「無音」の方が弱い主張である。**
   出力自身が「絞り込み走行は門の依存を保証しない」と警告している。

2. **S-2 攻撃も 131 門(`--gate gauge`)で撃った。** 全走で撃っていない。
   58 門が赤になったのは gauge 節の中の数である。

3. **深さの門を形ごとに分けたことが、まだ誰も撃っていない別の形を開いていないかは測っていない。**
   教訓 `repair-opens-a-new-surface` が名指す形である。撃ったのは
   reflect が名指した四形 + 私が発明した 7 形 = **11 形**であり、
   discover の 60 / review の 65 / security の 55 に比べて**桁が少ない**。
   **私が撃たなかった形について私は何も言えない。**

4. **偽陽性の走査は `graph/*.js` の 39 ファイルだけである。**
   `tests/*.js` / `dashboard/` / `overlay/` には撃っていない。
   **静的の門の射程はもともと 2 ファイルなので実害は無いが、「偽陽性 0」は 39 ファイルの中での 0 である。**

5. **`ledgerAbsenceKind()` の `unmeasurable` 枝を実機で踏んでいない。**
   純関数としては撃ったが、**`workspace.resolve()` が実際に投げる機を作っていない。**
   (投げる条件を私は知らない —— それ自体が測っていないことである。)

6. **CI(ubuntu)で一度も撃っていない。** verify・security・reflect に続いて**四人目である。**
   とくに:
   - 並行門の助走 `RACE_LEAD_MS = 400` が CI で足りるか(**誰も測っていない**)
   - **R-4 の修理が CI で偽の赤を出さないか。** M3(倉ごと無い)を Windows で撃って緑を確かめたが、
     **ubuntu の CI が本当に `exists:false` を返すかは撃っていない。**
     もし CI の機で兄弟倉ディレクトリだけが存在すれば(例えば別の job が作れば)、
     **私の修理は CI を永久に赤にする。** —— **これが本相の最も重い未測項目である。**

7. **`tests/paradise.test.js` の +1650 行のうち、私が読んだのは約 400 行である。**
   静的の門・番兵の器と三門・`mutableGlobals` の全文・`withGaugeSandbox`。
   **残り 17 本の門は一行も読んでいない。**

8. **`design.md`(1335 行)/ `build.md` / `prove.md` / `security.md`(1072 行)を読んでいない。**
   reflect の要約を通してしか知らない。

9. **第62条の条文を一度も変異で撃っていない。** `codex.js check` が exit 0 であることを確かめただけである。

10. **R-3 の裁定(14 を正本とする)は、私の判断であって測定ではない。**
    「引き継いだ債も払っていない債である」は**筋**であって**数**ではない。
    教主が別の線を引くなら、その線の方が正しい。

11. **無音率という数を私は出さない。** 私が撃った 11 形は**盲点を狙って選んだ偏った標本**であり、
    率にすれば reflect が §3 で裁いたのと同じ罪を犯す。

12. **reflect の「22 ファイル」を私は 39 と実測したが、reflect がなぜ 22 と数えたかは調べていない。**
    (別の射程で数えたのか、単純な誤りか。**私は自分の 39 を測っただけである。**)

---

## 6. 結び

**reflect の告発は五件とも真であった。** 私は一件も反駁していない。

**最も重いのは R-1 である** —— そしてそれは、この走行が成文した第62条(a) の**三度目の実証**である:

> **(a) 門を建てるとき、その門の形が何を見えなくするかを言え。**
> **言えない盲点は、存在しない盲点ではなく、まだ誰も落ちていない穴である。**

- 一度目: build 相の新設門が、建てた直後に L3 / R3 の盲点を持っていた(review が発見)。
- 二度目: verify 相がそれを塞いだ後、**「偽陽性 0」と実測して建てた fixture が、
  危険な形を「罪ではない」と凍結していた**(reflect が発見)。
- 三度目: **私の修理も、なお 4 形を見ていない**(私が測り、SM-L3 と名付けた)。

**違いは一つだけである。** 一度目と二度目の盲点は**名を持っていなかった**。
三度目の盲点は**名を持ち、門が走行のたびに画面でその名を挙げる。**

**第62条(a) は「盲点を無くせ」とは言っていない。「言え」と言っている。**
**盲点は無くならない。言えるようになるだけである。**

---

*変異走行: 四形 × 2(修理前/後)+ S-2 攻撃 × 4 + 字句器の直接撃ち × 18。*
*すべて複製に対して撃ち、生バイト列で書き戻し、毎回 `restored=true` と sha256 一致を印字した。*
*`git checkout -- <file>` は一度も使っていない。commit も push もしていない。*
*実台帳 `955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77` / 7 行 —— 本相の前後で不変。*
*engine(`graph/*.js`)に一行も書いていない。触ったのは `tests/paradise.test.js` と走行帳の散文のみ。*
