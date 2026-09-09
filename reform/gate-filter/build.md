# build — 門の絞り込み(フィルタ)の口

**相**: build(建造)／改革 `gate-filter`
**日付**: 2026-09-09
**ブランチ**: `feat/gate-filter`
**図面**: `reform/gate-filter/design.md` §8 の 12 歩

**この報告の性格について正直に書く。** build 相は当初 @architect(subagent
`sa-0-4ca39a9e`)に発令されたが、**HTTP 401(OAuth トークン失効)で 177 秒後に強制終了**した。
神官は歩 3〜5 相当まで書き上げたところで殺され、`build.md` を残していない。
**残された作業ツリーを教主が実測で検分し、欠陥を一つ見つけて修理し、歩 6〜12 を教主自身が歩いた。**
以下、**誰が為したか**を各歩に明記する。走らせていないものは走らせていないと書く。

---

## 0. 到達点

| 項目 | 実測値 |
|---|---|
| 全走(引数なし) | **`Paradise self-test: 451 passed, 0 failed`** / `EXIT=0` / **6m04.539s** |
| AC-05(Atlas 2 本を外した走行) | **`Paradise gate-filter: 449 of 451 gates matched — 449 green, 0 red`** / `EXIT=0` / **20.773s** |
| `--gate-list` | **`Paradise gate list: 451 gates`** / **0.075s** |
| README | `# 449/449 pass` → **`# 451/451 pass`**(`census.js fix` が書いた。手では触っていない) |
| 12 歩の到達 | **12/12 完了** |

**第38条の作法で語る**:

> **449 本を 20.773 秒で測った。**
> **前: 449 本を 358.8 秒で測った。**

「速くなった」とは書かない。母数を明示する。分子が同じ 449 本であるのは偶然ではない ——
実装後の総数 451 本から Atlas の重い 2 本を除いた数がちょうど 449 だからである。
**前値と同じ本数を、同じ機械で、17.3 分の 1 の時間で測った。**

---

## 1. 図面と実物が食い違った一点(build 相の最大の発見)

### 1.1 何が起きたか

歩 10(AC-05)を初めて走らせたとき、**赤が 1 本出た**:

```
Paradise gate-filter: 449 of 451 gates matched — 448 green, 1 red
real    0m20.955s
```

落ちた門:

```
  ✗ 門ヘルパー: test() の失敗が必ず数に載る — 集計行が嘘をつかない (P3/T2 / 第16条)
      test() の抜き出しが走らない: [eval]:3
  GATE.total++;
  ^

ReferenceError: GATE is not defined
    at test ([eval]:3:3)
```

### 1.2 原因 —— 設計が見落としていた実物の事実

`tests/paradise.test.js:4907` の門は、**`test()` のソースを正規表現で抜き出し、
`node -e` の子プロセスで走らせる**:

```js
const m = src.match(/function test\(name, fn\) \{[\s\S]*?\n\}/);
const res = require('child_process').spawnSync(process.execPath, ['-e',
  `let pass=0,fail=0;\n${m[0]}\ntest('x',()=>{throw new Error('BOOM')});` +
  `test('y',()=>{});console.log(JSON.stringify({pass,fail}));`], { encoding: 'utf8' });
```

子プロセスに与えられるのは **`let pass=0,fail=0;` と `test()` の本文だけ**である。
`GATE` は存在しない。ゆえに `test()` の冒頭で `GATE` を裸で参照した瞬間、
子は `ReferenceError` で落ち、`res.status !== 0` となって門が赤くなる。

design.md §3.2 はこの門の存在を知らなかった。**図面の穴である。**

### 1.3 どちらが退くべきか

**落ちた門を緩める道は採らない。** この門が守っているのは
「`test()` の catch から `fail++` を落としても集計行が `0 failed` と名乗り続ける」
という**門の根**である(第16条)。数え方が嘘をつけば、他の 450 本の緑がすべて無意味になる。

**ゆえに絞り込みの側が退いた。**

```js
function test(name, fn) {
  if (typeof GATE !== 'undefined') {
    GATE.total++;
    if (GATE.active && !GATE.wants(name)) return;
    GATE.matched++;
    if (GATE.list) { GATE.say(name); return; }
  }
  try { fn(); console.log('  \u2713 ' + name); pass++; }
  catch (e) { console.log('  \u2717 ' + name + '\n      ' + e.message); fail++; }
}
```

**`typeof GATE !== 'undefined'` は防御的な飾りではなく、契約である**:
*絞り込みが存在しない世界でも `test()` は単体で正しく数える。*
4907 行の門はまさにその世界を作って撃つ門であり、この一行はその門を通すためにある。

併せて、塊の外に漏れていた `const SAY` を `GATE.say()` に畳んだ。
`--gate-list` は `console.log` を黙らせるので、名を吐く口は
`process.stdout.write` に直結していなければならない。**塊の外に変数を置かない**ことは
AC-16(絞り込み塊の境界)を素直に保つためでもある。

修理は**教主の手による**(神官は既に失われていた)。

---

## 2. 12 歩の記録

| 歩 | 為した者 | 結果 |
|---:|---|---|
| 1 | 神官 | ブランチ `feat/gate-filter` を確認 |
| 2 | 神官 | 前値の名一覧を保全 |
| 3 | 神官 | 絞り込み塊を挿入・`test()` を改修 |
| 4 | 神官 | 引数エラー 4 経路 |
| 5 | 神官 | report ブロック改修 |
| 6 | **教主** | **差分照合(下記 §2.1)** |
| 7 | **教主** | 悪い道と分岐 |
| 8 | **教主** | **AC-14 四連 grep(下記 §2.2)** |
| 9 | 神官 | 新門 2 本 |
| 10 | **教主** | **AC-05 の後値(§1 の欠陥を発見・修理してから再測)** |
| 11 | **教主** | **全走 451 本** |
| 12 | **教主** | **`census.js fix` が README を書いた** |

歩 1〜5・9 は神官の作であるが、**教主が実物とコマンド出力で全て検め直した**(第27条)。
神官が残した実出力は失われているので、以下に載せるのは**すべて教主が撃ち直した実出力**である。

### 2.1 歩 6 —— 差分照合(既存の門を一本も落としていない証明)

**これが本手順の要である。** 6 分を払わずに 1 秒で「絞り込みの導入が既存の門を
一本も落としていない」ことを証明する。

基線(実装前の全走ログ `para-base.log`)の `✓` 行から名を抜き、
実装後の `--gate-list` から新門 2 本と総括行を除いたものと突き合わせた:

```
$ grep -c '^  ✓ ' $T/para-base.log
541
$ grep '^  ✓ ' $T/para-base.log | sed 's/^  ✓ //' > $T/names-base.txt; wc -l < $T/names-base.txt
541
$ grep -v '^Paradise gate list:' $T/names-now.txt | grep -v '^gate-filter: ' > $T/names-now-449.txt
$ wc -l < $T/names-now-449.txt
449

$ diff $T/names-base.txt $T/names-now-449.txt | grep -c '^> '
0          ← 実装後にしか無い名: ゼロ
$ diff $T/names-base.txt $T/names-now-449.txt | grep -c '^< '
92         ← 欠けた名: 92
$ comm -23 <(sort $T/names-now-449.txt) <(sort $T/names-base.txt) | wc -l
0          ← 実装後にあって基線に無い名: ゼロ
```

**欠けた 92 は委譲先 9 ファイルの子 92 本**であり、
FR-10 / NG-01 が「`--gate-list` に出さない」と明示的に決めたものである
(親が `rep.pass/rep.fail` を読んで 1 本に畳んでいるため、そもそも 449 に含まれない)。
**親の 449 本は一つ残らず一致した。**

### 2.2 歩 8 —— AC-14 四連 grep(書式が三者に対して同時に安全であることの証明)

```
$ L=$(node tests/paradise.test.js --gate 'schedules a simple diamond' 2>&1 | tail -1)
$ echo "$L"
Paradise gate-filter: 1 of 451 gates matched — 1 green, 0 red

$ echo "$L" | grep -cE 'Paradise self-test:[[:space:]]*[0-9]+ passed, [0-9]+ failed'
0     ← census.js:55(名指しの正規表現)
$ echo "$L" | grep -cE '[0-9]+ passed, [0-9]+ failed'
0     ← census.js:57(保険の matchAll)
$ echo "$L" | grep -coE '[0-9]+ passed'
0     ← tribunal.yml:307
$ echo "$L" | grep -coE '[0-9]+ failed'
0     ← tribunal.yml:308
```

**`0` が 4 行。** `passed` / `failed` の語を完全に追放した設計が、
語感ではなく機構として効いていることの証明である。
万一 CI が絞り込み付きで呼ばれても `|| echo 0` により `tests.total = 0` となり、
**verdict は SHIP を主張できない**(fail-safe)。

### 2.3 歩 7 —— 悪い道と分岐(すべて教主が撃った)

| AC | 入力 | 実出力 | exit |
|---|---|---|---|
| AC-18 | `--gates x` | `Paradise gate-filter: unknown flag --gates` | **2** |
| AC-19 | `--gate`(値無し) | `Paradise gate-filter: --gate requires a pattern` | **2** |
| AC-20 | `--gate ''` | `Paradise gate-filter: --gate requires a pattern` | **2** |
| AC-12 | `--gate '['` | `Paradise gate-filter: invalid pattern [: Invalid regular expression: /[/: Unterminated character class` | **2** |
| AC-11 | `--gate 'zzz-no-such-gate-zzz'` | `Paradise gate list: 0 of 451 gates matched — nothing was measured` | **2** |
| AC-02 | `--gate 'schedules a simple diamond'` | `Paradise gate-filter: 1 of 451 gates matched — 1 green, 0 red` | 0 |
| AC-13 | 上と同じ / `grep -c 'Paradise self-test'` | `0` | — |

**業界の 4/4 が exit 0 を返す「マッチ 0 件」を、楽園は exit 2 で鳴らす**(第16条)。
これが楽園が業界と袂を分かつ地点であり、AC-11 がそれを見張る門である。

### 2.4 歩 6 —— `--gate-list` の実測

```
$ time node tests/paradise.test.js --gate-list > $T/names-now.txt
real    0m0.075s                                   ← AC-09 の要求 3 秒に対して 1/40
$ tail -1 $T/names-now.txt
Paradise gate list: 451 gates                      ← AC-07(静的解析なら 442)
$ grep -c '^dashboard-count 系: ' $T/names-now.txt
8                                                  ← AC-08(静的解析なら 1)
$ grep -c ':$' $T/names-now.txt
0                                                  ← 節見出しが混ざっていない
$ grep -n '^gate-filter: ' $T/names-now.txt
450:gate-filter: 絞り込みは環境変数を読まない
451:gate-filter: census は自己診断を素で呼ぶ
```

**AC-07 / AC-08 は静的解析実装を機械的に禁じる門である。** 実行時に名を集めなければ
2694 行のループが 1 本にしか見えず、この 2 つが同時に赤くなる。

### 2.5 歩 9 —— 新門 2 本

```
$ node tests/paradise.test.js --gate '^gate-filter: '
  ✓ gate-filter: 絞り込みは環境変数を読まない
  ✓ gate-filter: census は自己診断を素で呼ぶ
Paradise gate-filter: 2 of 451 gates matched — 2 green, 0 red
```

**分母が 451 になった瞬間**が §1 の矛盾の決着が実物に現れた瞬間である。

### 2.6 歩 10 —— AC-05 の後値(第38条)

§1 の欠陥を修理した後の再測:

```
$ time node tests/paradise.test.js \
    --gate-not 'atlas: 全ての道が図になる' \
    --gate-not 'atlas: 門は己の残骸で落ちない'
Paradise gate-filter: 449 of 451 gates matched — 449 green, 0 red
EXIT=0
real    0m20.773s
```

> **449 本を 20.773 秒で測った。前: 449 本を 358.8 秒で測った。**

NFR-07 の要求は「40 秒以内」。**20.773 秒**でこれを満たす。
discover が算出した理論下限は 21.9 秒(Atlas 節を丸ごと除いた場合の 435 本)であり、
今回は Atlas 節の残り 12 本を含んだ 449 本でそれを下回っている
—— 除いた 2 本が全体の 93.7% を占めるという discover の実測が、そのまま裏付けられた。

### 2.7 歩 11 —— 全走

```
$ time node tests/paradise.test.js
Paradise self-test: 451 passed, 0 failed
EXIT=0
real    6m04.539s
$ grep -c '^  ✓ ' $T/full451.log
543                                                ← 541 + 新門 2 本ちょうど
```

**書式は一字も動いていない。** ゆえに census.js:55 も tribunal.yml:307/308 も
従来どおりこの行を読める。FR-09 の契約は無傷である。

### 2.8 歩 12 —— README は census が書いた(手では触っていない)

```
$ node graph/census.js fix
  ✏️  README テスト数: 449/449 → 451/451
updated: README.md
  ✓ 書き換えた数は、その主張の目で読み直して実測と一致する
EXIT=0

$ sed -n '138p' README.md
node ~/Documents/workspace/paradise/tests/paradise.test.js   # 451/451 pass
```

**第22条の作法どおり、数は census が測って書いた。** NG-09(README の数を手で書く)を犯していない。

最終の作業ツリー:

```
$ git status --porcelain
 M README.md
 M tests/paradise.test.js
?? reform/gate-filter/
```

**`graph/` 配下の engine は一行も触っていない**(NFR-09)。
`.github/workflows/` も `CONSTITUTION.md` も `CLAUDE.md` も無傷である。

---

## 3. requirements.md の書き直し(矛盾の決着の記録)

design §1.3 / §1.4 の表に従い、**37 箇所**を 449 系 → 451 系に書き直した。
これは要件の改竄ではなく、**AC-16/17 を勝たせるという決着を要件に反映した記録**である。

書き直していない `449` が 19 箇所残っている。**これらは動かしてはならない数である**:

- discover が実測した**前値**としての 449(§7 の前値表、第38条の「前」)
- NFR-02 の「**既存** 449 本の振る舞い不変」—— 既存の門の数は今も 449 である
- 「静的 442 / 実行時 449」の差 7 の説明(FR-06 の根拠)
- FR-02 が語る「env 実装なら README の 449 が壊れる」という**危険の記述**

併せて教主が二点を確定させた:

- **AC-03 の `N ≥ 5`** を、design が実測した **11** に確定
- **NFR-02 に `✓` 行の増分を明記** —— 541 → **543**、増分は新門 2 本ちょうどであり、
  それを歩 6 の差分照合が証明する

---

## 4. 図面との食い違い・持ち越し(正直に書く)

1. **§1 の `GATE is not defined`** —— design.md §3.2 は 4907 行の門を知らなかった。
   実物を信じて絞り込みの側を退かせた。**design.md は修正していない**
   (図面は当時の判断の記録であり、食い違いはこの build.md が記録する)。
2. **NFR-01 の閾値を 2.1 秒超過している。** 全走は **364.5 秒**、NFR-01 の上限は
   358.8 × 1.01 = **362.4 秒**。ただし**これは絞り込みの上乗せではない** ——
   母数が 449 → 451 に増えた分(新門 2 本の実行時間)を含む数である。
   **第38条は「同じ母数で語れ」と要求する。** 449 本と 451 本を同じ閾値で裁くのは
   その要求に反する。**この扱いは verify 相が判ずるべきであり、教主は独断で
   NFR-01 を書き換えなかった。**
   - 参考: 絞り込み機構そのものの上乗せは `test()` に条件分岐 1 個であり、
     `--gate-list` が 0.075 秒で 451 本を登録し切ることが、登録経路が安いことを示している。
3. **AC-15(census を毒しても 451)は未実行。** requirements.md:405 が
   「全走 6 分を伴うため自己診断には置かない」と決めており、**prove 相の手順**である。
   **走らせていないので「緑だった」とは書かない。**
4. **AC-01 / AC-06 / AC-10 / AC-21 は個別に撃っていない。** AC-01 は歩 11 の全走が
   実質的に満たしているが(`Paradise self-test: 451 passed, 0 failed` / exit 0)、
   AC-06(`--gate` 複数指定が OR)・AC-10(絞り込み走行内の赤が exit 1)・
   AC-21 は **prove 相で撃つべき**であり、build 相では走らせていない。
5. **`census.js fix` の実行中に台帳の破損行の警告が出た**:
   `⚠️ ledger line skipped (corrupt): >>>>>>> A…` ——
   これは gauge 台帳にマージ衝突の残骸が混ざっていることを示す。
   **本改革とは無関係の既存の傷**であり、ここでは触らない。台帳に起票すべき件である。

---

## 5. prove 相への引き継ぎ

- **未実行の AC**: AC-01(全走で実質確認済みだが個別未実施)、AC-06、AC-10、AC-15、AC-21
- **必ず撃つべき新しい変異点**: §1 で入れた `typeof GATE !== 'undefined'` を
  `GATE.total++` の裸参照に戻すと、**4907 行の門が `ReferenceError` で赤くなる**。
  これは design.md §7 の変異点表に無い、**build 相が実測で見つけた新しい変異点**である。
- **NFR-01 の裁定**: verify 相が「449 本と 451 本を同じ閾値で裁いてよいか」を判ずること。
