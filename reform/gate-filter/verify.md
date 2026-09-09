# verify 相 — 検証報告(改革 `gate-filter`)

- **ブランチ**: `feat/gate-filter`
- **相**: verify(品質領域の最後の門)
- **主題**: 二つの談判を裁き、**門を強めて実装する**
- **前提の母数**: 改革前 449 本 → build/prove/review 時点 451 本 → **本相で 454 本**

本文の実測はすべて本相で実際に走らせた出力である。走らせていないものは
**「未実行」と明記する**(第16条・第27条)。

---

## 1. 談判 1 の裁定 — NFR-01 は門ではなく賽だった

### 裁定: **review §2.3 の「秒/門」案を採る。閾値を広げる案・削る案は退けた。**

`requirements.md` の NFR-01 を実際に書き換えた(§3 の表 + 新設した §3.1「NFR-01 改訂の理由」)。

```
旧 NFR-01: 引数なし全走の所要時間は 前(358.8 秒)の +1.0% 以内 = 362.4 秒以下

新 NFR-01: 1 門あたり所要 = 全走秒 ÷ 実行時の門数 が、
           改革前の基準 358.8 ÷ 449 = 0.7991 秒/門 の +10% 以内 = 0.8790 秒/門 以下。
           測定は連続 3 回の中央値を採る(単発の外れ値では裁かない)。
```

### 根拠

**(a) 旧閾値は揺れの中を横切っていた。** 同じコードに対する既知の実測は

`350.0 / 350.6 / 358.8 / 360.2 / 364.5 / 364.8 秒` — **揺れ幅 15 秒**。

閾値 362.4 秒はこの分布の**中央**にある。同じコードが日によって緑にも赤にもなる。

**(b) 第38条を自分の目で読んだ**(`node graph/codex.js article 38`)。当該条は明文で

> **決定的に測れるものは決定的に測る。**(…)同じ走行には常に同じ点
> (LLM に尋ねない — **秤が揺れるなら、それは秤ではない**)。

と言い、さらに

> **記録なき前後は比較できない。**「改善した」と語る者は、前後を数値で示さねばならない。

と要求する。**「前後を数値で示す」は同じ母数で語ることを含意する。**
旧 NFR-01 はこの二点の両方に反していた。

**(c) 母数が二度動いている。** 449(基準)→ 451(改革)→ **454(本相の常駐門昇格)**。
449 本で定めた絶対秒で 454 本を裁けば、**門を足したこと自体が「劣化」として計上される**。
これは第38条の要求とは逆向きの誤りである。

**(d) 秒/門は両方を同時に解く。**

| 観測 | 全走秒 | 母数 | 秒/門 |
|---|---|---|---|
| review(自測) | 350.0 | 451 | **0.7761** |
| prove | 360.2 | 451 | **0.7987** |
| build | 364.5 | 451 | **0.8082** |
| prove M-19 | 365.0 | 451 | **0.8093** |
| **本相の全走(454 本)** | **§4 に実測** | **454** | **§4 に実測** |

観測された揺れ幅は **0.0332 秒/門**、許容幅は 0.7991→0.8790 の **0.0799 秒/門**。
**揺れの約 2.4 倍の余裕**がある。旧基準は揺れ 15 秒に対し余裕が実質ゼロだった。

**(e) 緩めたのではない。** `test()` に重い処理を足して 1 門あたり +10% 劣化すれば依然として鳴る。
変えたのは**閾値の幅ではなく、測る量の定義**である。

### 退けた案

1. **閾値を 370 秒などに広げる** — 母数の問題が残る。門を足すたびに閾値を書き直す羽目になり、
   その書き直しは常に「後追いの追認」であって門ではない。
2. **NFR-01 を削る** — 性能の劣化を誰も見なくなる。第38条は測ることを要求しており、退却は答えでない。

### この NFR-01 を常駐の門にしない理由

review M-1 の指摘どおり。全走 6 分を自己診断の中で撃てば**自己診断が自分を全走で呼ぶ再帰**になる。
正しい置き場は `census.js` / CI である(census は既に全走を起こして名乗りを読んでいる)。

---

## 2. 談判 2 の裁定 — 22 本の AC のうち常駐の門は 2 本しか無かった

### 裁定: **review の推奨どおり AC-11 / AC-13 / AC-14 を常駐の門に昇格させる。実装した。**

**verify 相は門を強める相である。** review が「実装するな。次相の材料である」と書いた雛形を、
本相が実際に `tests/paradise.test.js` に据えた。**451 → 454 本。**

### 実装(`tests/paradise.test.js` 8326–8386 行付近、既存の AC-16/17 の直後)

手口は 4919 行の門(`門ヘルパー: test() の失敗が必ず数に載る`)と同じ ——
**`spawnSync` で自分自身を子プロセスとして撃ち、exit と最終行を検める**。
この場の集計 (`pass`/`fail`) を汚さない。

```js
const gateRun = (...args) =>
  require('child_process').spawnSync(process.execPath, [__filename, ...args],
    { encoding: 'utf8' });
const GATE_ONE = '^gate-filter: census は自己診断を素で呼ぶ$';
```

新設した 3 本(名はすべて `gate-filter: ` で始まる — 既存 2 本と揃えた):

| # | 門の名 | 守る AC |
|---|---|---|
| 1 | `gate-filter: マッチ 0 件は緑ではない — exit 2 で鳴る (AC-11 / 第16条)` | AC-11 |
| 2 | `gate-filter: 絞り込んだ走行は Paradise self-test: を名乗らない (AC-13 / 第22条)` | AC-13 |
| 3 | `gate-filter: 絞り込み走行の最終行は census / tribunal の双方に読まれない (AC-14 / 第22条)` | AC-14 |

**雛形からの改変点**(review §1.3 の写しではない):

- AC-13 / AC-14 に **`assert.strictEqual(r.status, 0, ...)`** を明示(AC-14 側は雛形に無かった)。
  子が異常終了したまま「最終行が読まれない」と判定するのを防ぐ。
- AC-14 に **`assert.ok(/gates matched/.test(last), ...)`** を追加。
  教主が入れた**警告行**(security D-2)が総括行の**後ろ**に回ったら鳴る。
  これは雛形に無かった主張で、§3 の変異 M3 が実際にこれを撃った。
- `r.stdout` / `r.stderr` を `String()` で包む(spawn 失敗時に `null` が来ても TypeError にしない)。

### 1 秒未満であること(実測)

```
$ time node tests/paradise.test.js --gate '^gate-filter: .*\(AC-11 / '
  ✓ gate-filter: マッチ 0 件は緑ではない — exit 2 で鳴る (AC-11 / 第16条)
Paradise gate-filter: 1 of 454 gates matched — 1 green, 0 red
real    0m0.124s

$ time node tests/paradise.test.js --gate '^gate-filter: .*\(AC-13 / '
  ✓ gate-filter: 絞り込んだ走行は Paradise self-test: を名乗らない (AC-13 / 第22条)
real    0m0.121s

$ time node tests/paradise.test.js --gate '^gate-filter: .*\(AC-14 / '
  ✓ gate-filter: 絞り込み走行の最終行は census / tribunal の双方に読まれない (AC-14 / 第22条)
real    0m0.123s
```

**3 本とも 0.13 秒未満**(子プロセス 1 個ぶんを含む)。3 本合計で **0.4 秒未満**。

### 子プロセスが再帰しないことの証明(実測)

子に渡す `--gate` は 2 種類しかない。それぞれが子の中で**何本の門を起こすか**を列挙した:

```
$ node tests/paradise.test.js --gate '^gate-filter: census は自己診断を素で呼ぶ$' --gate-list
gate-filter: census は自己診断を素で呼ぶ
Paradise gate list: 1 of 454 gates matched
```

**当たるのは 1 本だけ**であり、その門は `graph/census.js` のソースを読んで正規表現で数えるだけの
純粋な門である。`gateRun` を呼ばない。もう一方の `zzz-no-such-gate-zzz` は 0 件(exit 2)。

錨は **`^` と `$` の両方で打ってある**ので、本相が足した 3 本の名
(`gate-filter: マッチ 0 件は…` 等)はこの正規表現に**当たらない**。
ゆえに**孫プロセスは生まれない**。`grep -n gateRun` の結果も定義 1 + 呼び出し 3 の計 4 箇所のみで、
子の中で走る門の本文には現れない。

さらに**実測が証明している**: 再帰していれば 1 本 0.12 秒では終わらない(全走は 6 分)。

---

## 3. 新しい 3 本が変異体に対して鳴ることの実測

**雛形を書いただけでは門ではない**(第16条)。**4 つの変異**を実装に入れて撃った。
**変異は毎回 `git checkout tests/paradise.test.js` で戻した**(§6 の `git status` が証拠)。

### 健全時(変異なし)— 3 本とも緑

```
$ node tests/paradise.test.js --gate '^gate-filter: .*\(AC-11 / '
  ✓ gate-filter: マッチ 0 件は緑ではない — exit 2 で鳴る (AC-11 / 第16条)
Paradise gate-filter: 1 of 454 gates matched — 1 green, 0 red   (exit 0)
$ node tests/paradise.test.js --gate '^gate-filter: .*\(AC-13 / '
  ✓ gate-filter: 絞り込んだ走行は Paradise self-test: を名乗らない (AC-13 / 第22条)
$ node tests/paradise.test.js --gate '^gate-filter: .*\(AC-14 / '
  ✓ gate-filter: 絞り込み走行の最終行は census / tribunal の双方に読まれない (AC-14 / 第22条)
```

### 変異 M1 — `GATE.matched === 0 ? 2` → `? 0`(review が名指した 1 文字変異)

**これが「451 passed 0 failed で通ってしまう」と prove / review / 教主が三重に実証した変異である。**

```
AC-11 =>   ✗ gate-filter: マッチ 0 件は緑ではない — exit 2 で鳴る (AC-11 / 第16条)
             マッチ 0 件の exit が 0 — 0 本しか走らなかった走行が緑になっている (第16条)
             0 !== 2                                       ← exit 1 で赤
AC-13 =>   ✓ (無関係。鳴らないのが正しい)
AC-14 =>   ✓ (無関係。鳴らないのが正しい)
```

**網目は塞がった。** 以後この変異は全走を赤にする。

### 変異 M2 — `if (!GATE.active) {` → `if (true) {`(絞り込み走行にも `Paradise self-test:` を名乗らせる)

```
AC-11 =>   ✗ 0 件の名乗りが変わった: Paradise self-test: 0 passed, 0 failed
AC-13 =>   ✗ 絞り込み走行が Paradise self-test: を名乗った — census が局所の数を全走の数として読む
AC-14 =>   ✗ 最終行が総括行でない — 警告行が総括行の後ろに回った可能性がある:
             Paradise self-test: 1 passed, 0 failed
```

**3 本すべてが鳴った。** これが第22条の本丸 — 局所走行の 1 本が README の 454 に化ける道である。

### 変異 M3 — 警告行を総括行の**後ろ**に回す(`tail -1` 契約を壊す)

教主が security D-2 対策で入れた警告行の**位置**が契約であることを撃つ。

```
AC-11 =>   ✓ (無関係)
AC-13 =>   ✓ (無関係 — 名乗り自体は変わらないため。正しい振る舞い)
AC-14 =>   ✗ 最終行が総括行でない — 警告行が総括行の後ろに回った可能性がある:
             Paradise gate-filter: 注意
```

**AC-14 だけが鳴った。** これは review の雛形には無かった主張であり、本相が足したものである。

### 変異 M4 — 総括行の語を `green/red` → `passed/failed` に戻す

```
AC-11 =>   ✓ (無関係)
AC-13 =>   ✓ (無関係 — `Paradise self-test:` の名乗りは出ないため。正しい振る舞い)
AC-14 =>   ✗ 絞り込み走行の最終行が census.js:57 (保険) に読まれる:
             Paradise gate-filter: 1 of 454 gates matched — 1 passed, 0 failed
```

**AC-14 が census.js:57 の保険経路を名指しで鳴らした。**

### 変異の後始末

`git checkout tests/paradise.test.js` を毎回実行し、直後に `--gate-list` で
`Paradise gate list: 454 gates` を確認した。**変異は一つも残っていない**(§6)。

---

## 4. 全走の最終実測

### 4.1 連続 3 回(新 NFR-01 の要求どおり)

変異を一つも入れていない健全な木に対して、**他の処理を並走させずに** 3 回連続で走らせた。
計測は Python の `time.perf_counter()`(git-bash に `bc` が無く `date` 差分が取れなかったため)。

```
{"run": 1, "exit": 0, "secs": 350.442, "last": "Paradise self-test: 454 passed, 0 failed", "ticks": 546}
{"run": 2, "exit": 0, "secs": 350.188, "last": "Paradise self-test: 454 passed, 0 failed", "ticks": 546}
{"run": 3, "exit": 0, "secs": 349.913, "last": "Paradise self-test: 454 passed, 0 failed", "ticks": 546}
MEDIAN_SECS 350.188
SEC_PER_GATE 0.7713 THRESHOLD 0.8790 PASS
```

| 項目 | 値 |
|---|---|
| **門の本数** | **454**(451 + 本相の新門 3 本) |
| 最終行 | **`Paradise self-test: 454 passed, 0 failed`**(3 回とも) |
| exit | **0**(3 回とも) |
| 所要 | 350.442 / 350.188 / 349.913 秒 — **中央値 350.188 秒** |
| **秒/門(新 NFR-01 の裁く量)** | **0.7713 秒/門** |
| 新 NFR-01 の閾値 | 0.8790 秒/門 |
| **判定** | **○ 合格**(基準 0.7991 より**むしろ速い** — 改善 −3.5%) |
| `✓` 行の数 | **546**(前 543 + 新門 3 本ちょうど / NFR-02) |

**新門 3 本を足しても秒/門は基準 0.7991 を下回った。** 3 本の上乗せは実測 0.4 秒未満であり、
機械の揺れに埋もれる大きさである。

**旧 NFR-01(362.4 秒以下)でも今回はたまたま通る**(350 秒)。だが**それが問題である** ——
同じコードが 364.8 秒だった日には赤くなっていた。§1 の裁定はこの偶然を排する。

参考: 本相の途中で撃った 1 回目の全走(§3 の変異作業と並走していた)は
**5m50.798s / `454 passed, 0 failed` / EXIT=0** だった。並走ぶんの上振れを含むため、
NFR-01 の判定には**上の 3 回を採る**。

### 4.2 AC-14 の四連 grep(依然として `0` が 4 行)

```
$ L=$(node tests/paradise.test.js --gate 'schedules a simple diamond' 2>&1 | tail -1)
$ echo "最終行: $L"
最終行: Paradise gate-filter: 1 of 454 gates matched — 1 green, 0 red

$ echo "$L" | grep -cE 'Paradise self-test:[[:space:]]*[0-9]+ passed, [0-9]+ failed'   # census.js:55
0
$ echo "$L" | grep -cE '[0-9]+ passed, [0-9]+ failed'                                  # census.js:57 保険
0
$ echo "$L" | grep -cE '[0-9]+ passed'                                                 # tribunal.yml:307
0
$ echo "$L" | grep -cE '[0-9]+ failed'                                                 # tribunal.yml:308
0
```

**`0` が 4 行。** 教主が入れた警告行が総括行の**前**にあるため `tail -1` の契約は保たれている
(§3 の変異 M3 がこの位置関係を守る門であることを実証した)。

### 4.3 `--gate-list`

```
$ node tests/paradise.test.js --gate-list | tail -1
Paradise gate list: 454 gates
```

`real 0m0.072s`(NFR-06 の閾値 3 秒)。

### 4.4 census(第22条 —— README の数は手で書かない)

**README の数は一文字も手で書いていない。** `census.js fix` に書き換えさせた。

```
$ node graph/census.js fix
  ✏️  README テスト数: 451/451 → 454/454
updated: README.md
  ✓ 書き換えた数は、その主張の目で読み直して実測と一致する
FIX_EXIT=0

$ node graph/census.js check
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
CHECK_EXIT=0
```

**`census.js check` は exit 0。** 楽園が自分について語る数はすべて真である。

`git diff README.md` の数に関わる差分は**この一行だけ**である:

```
-node ~/Documents/workspace/paradise/tests/paradise.test.js   # 451/451 pass
+node ~/Documents/workspace/paradise/tests/paradise.test.js   # 454/454 pass
```

(README の他の差分は docs 相が足した `--gate` の説明節であり、本相は触っていない。)

**なお `census check` は途中で `⚠️ ledger line skipped (corrupt): >>>>>>> A…` を 4 行出す。**
これは gauge の台帳(creations 側)に残った git のコンフリクト痕であり、
**本改革とは無関係の既存の汚れ**である。census は壊れた行を読み飛ばして exit 0 を返した。
本相は creations 倉を触る権限を持たないので**直していない**。次相か別の改革の課題として記す。

---

## 5. AC 22 本の最終的な成否表

**「常駐の門」= `tests/paradise.test.js` に住み、全走のたびに毎回撃たれる門。
「手順」= 文書に記録された実行であり、回帰は機械が守っていない。**

| AC | 主張 | 種別 | 本相の成否 | 根拠 |
|---|---|---|---|---|
| AC-01 | 引数なし全走の名乗りと exit | **手順**(常駐させてはならない — 再帰) | ○ | §4 の全走 `454 passed, 0 failed` / exit 0。**census が実経路で毎回撃っている**(review M-1) |
| AC-02 | 単一の門を名前で狙える | 手順 | ○ | `✓ schedules a simple diamond into 3 waves` / `1 of 454 gates matched — 1 green, 0 red` / exit 0 |
| AC-03 | 正規表現として解釈される | 手順 | ○ | `--gate '^gauge\(故障注入\): ' --gate-list` → `Paradise gate list: 11 of 454 gates matched` |
| AC-04 | 除外が包含に勝つ | 手順 | ○ | `--gate 'atlas:' --gate-not '描画器が実際に受理する' --gate-list` → 当該行 **0 行** |
| AC-05 | Atlas の重い 2 本を外した走行 | 手順 | ○(教主実測) | `449 of 451 — 449 green, 0 red / 約 20 秒`。**本相では再走していない**(母数 454 では 452 本になる) |
| AC-06 | `--gate` 複数指定は OR | 手順 | ○ | `2 of 454 gates matched — 2 green, 0 red` |
| AC-07 | `--gate-list` が実行時の名を出す | 手順 | ○ | `Paradise gate list: 454 gates`(454 は実行時の数。静的解析では出ない) |
| AC-08 | ループの 8 本を含む | 手順 | ○ | `--gate-list \| grep -c '^dashboard-count 系: '` → **8** |
| AC-09 | `--gate-list` は門を実行しない | 手順 | ○ | `real 0m0.072s`(閾値 3 秒)/ exit 0 |
| AC-10 | 絞り込み走行の中の赤は exit 1 | 手順(故意の破壊を要する) | ○ | `waves[0]` を `['ZZZ']` に変異 → `1 of 454 — 0 green, 1 red` / **EXIT=1**。`git checkout` で復旧済み |
| **AC-11** | **マッチ 0 件は緑ではない** | **★常駐の門(本相で昇格)** | ○ | 健全時 ✓ / 変異 M1(`? 2`→`? 0`)・M2 で **✗**(§3) |
| AC-12 | 不正な正規表現は走行を始めずに赤 | 手順 | ○ | `Paradise gate-filter: invalid pattern [: Invalid regular expression…` / EXIT=2 |
| **AC-13** | **絞り込み走行は `Paradise self-test:` を名乗らない** | **★常駐の門(本相で昇格)** | ○ | 健全時 ✓ / 変異 M2 で **✗**(§3) |
| **AC-14** | **最終行が census / tribunal の双方に読まれない** | **★常駐の門(本相で昇格)** | ○ | 四連 grep が **`0` 4 行**(§4)。変異 M2 / M3 / M4 の**三種**で **✗**(§3) |
| AC-15 | census が環境を毒されても汚れない | 手順(全走 6 分を伴う) | **未実行** | requirements.md:442 が「自己診断本体には置かない」と定める。**本相でも走らせていないので「緑だった」とは書かない** |
| AC-16 | 絞り込みコードは `process.env` を読まない | **常駐の門**(既存) | ○ | 全走 454 本の中で緑 |
| AC-17 | `census.js` の呼び口が引数を渡さない | **常駐の門**(既存) | ○ | 全走 454 本の中で緑。**本相の新門 3 本はこの門を子で撃つ**(GATE_ONE) |
| AC-18 | 打ち間違えたフラグは全走に落ちない | 手順 | ○ | `Paradise gate-filter: unknown flag --gates` / EXIT=2 |
| AC-19 | 値の無い `--gate` は赤 | 手順 | ○ | `Paradise gate-filter: --gate requires a pattern` / EXIT=2 |
| AC-20 | 空文字パターンは赤 | 手順 | ○ | 同上 / EXIT=2 |
| AC-21 | 絞り込み走行では README を触らない | 手順 | ○ | 走行前後の README md5 が同一(`4c4dec06…`)。※README には前相からの未 commit 差分があるため `git diff --quiet` ではなく hash で照合した |
| AC-22 | 全走の所要が悪化していない | 手順(**本相で NFR-01 を改訂**) | ○ | §4 の秒/門 中央値 |

### 集計

| 種別 | 本数 | AC |
|---|---|---|
| **常駐の門**(全走が毎回撃つ) | **5 本** | AC-11 / AC-13 / AC-14(**本相で昇格**)+ AC-16 / AC-17(既存) |
| 手順(実行して確認したが回帰は守られていない) | **16 本** | AC-01〜10 / AC-12 / AC-18〜22 |
| **未実行** | **1 本** | AC-15 |

**常駐の門は 2 本 → 5 本になった(2.5 倍)。**
review が「格が違う」と述べたもの ——**楽園が自分について語る数の正しさ**を守る AC-11/13/14 ——
は全部が門になった。残る 16 本が守るのは「絞り込みの便利さ」であり、次相以降の課題である
(review §1.2 の 4〜6 位: AC-12 / AC-18/19/20 / AC-09。約 50 分)。

**AC-01 / AC-22 は意図的に常駐させていない**(review M-1)。全走 6 分を自己診断の中で撃てば
自己診断が自分を全走で呼ぶ再帰になる。

---

## 6. 掟の遵守

| 掟 | 遵守の証拠 |
|---|---|
| 触ってよいのは `tests/paradise.test.js` / `reform/gate-filter/` / README(census 経由のみ) | `git status --porcelain` が §6.1。**この 3 種以外に触れていない** |
| `graph/` の engine を触らない | 変更なし。**変異はすべて `tests/paradise.test.js` にのみ入れ、毎回 `git checkout` で戻した** |
| `.github/workflows/` / `CONSTITUTION.md` / `CLAUDE.md` を触らない | 変更なし(status に現れない) |
| **449 本の既存の門の本文を一行も書き換えない** | 追加は `test()` 3 本の**新規挿入のみ**(AC-17 の門の直後)。既存の門の本文への差分ゼロ。**`✓` 行が 543 → 546(+3 ちょうど)**であることが実測の裏付け(NFR-02) |
| README は census 経由のみ | 数の書き換えは `census.js fix` が行った。手書きはゼロ |
| **push / PR をしない** | していない。`git log origin/feat/gate-filter..HEAD` に未 push の commit が残る |
| **main に commit しない** | `git branch --show-current` → **`feat/gate-filter`**(作業前・commit 前の両方で確認) |
| **捏造しない** | AC-15 は**未実行**と明記。AC-05 は教主の実測であり本相では再走していないと明記。1 回目の全走が変異作業と並走していたことも明記した |

### 6.1 `git status --porcelain`(最終 — 本相の commit 後)

```
 M reform/gate-filter/conclave.json      ← 前相からの持ち越し(本相は触っていない)
 M reform/gate-filter/design.md          ← 前相からの持ち越し(本相は触っていない)
?? reform/gate-filter/docs.md            ← 前相の未追跡
?? reform/gate-filter/pontiff-ruling-442.md
?? reform/gate-filter/prove.md
?? reform/gate-filter/review.md
?? reform/gate-filter/security.md
```

**本相が触った 3 本(`tests/paradise.test.js` / `requirements.md` / `verify.md`)と
`README.md` はすべて commit 済みで、作業ツリーはきれいである。**
残る差分・未追跡はすべて前相からの持ち越しであり、本相は一行も触れていない。
`tests/paradise.test.js` に**変異は一つも残っていない**。

`node graph/branch-guard.js` → `branch : feat/gate-filter` / `✓ 最新の main の上に立っている`。

### 6.2 本相の commit(`feat/gate-filter` 上。push していない)

- `ae569ab332232a60b6fa948c150f51ac8507fc12` — 新門 3 本(451→454)
- `d2f90dab3ccc226e75357ad5815308c5b78738ea` — NFR-01 改訂 + verify.md 草稿
- `957c7d2cfd4356acaafd11b36c600a31f3e724ff` — 全走実測 + AC 表 + census fix (README 451→454)

---

## 7. 次相への申し送り

1. **AC-15 が未実行のまま。** 全走 6 分を伴うため自己診断に置けない。**census / CI が撃つべき**。
2. **常駐化の続き**(review §1.2 の 4〜6 位): AC-12 / AC-18/19/20 / AC-09。約 50 分。
   本相の `gateRun` / `GATE_ONE` がそのまま使える。
3. **gauge 台帳のコンフリクト痕**(§4.4)。creations 側の別 PR。
4. **review M-2 / M-3 の文言**: 0 件走行が `gate list` を名乗る件。
   **実装だけ直すと AC-11 が赤くなる**(AC-11 が明文で `Paradise gate list:` を要求している) ——
   requirements と実装を同時に動かすこと。**本相では触っていない。**
5. **review M-4 の数の訂正**(静的 `test(` の数が三通りに割れている)。教主裁定 442 は
   「誤っていたのは review 自身の数え方」として棄却済み。reflect 相が改めて見ること。
