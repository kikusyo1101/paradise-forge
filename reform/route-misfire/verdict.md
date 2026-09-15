# verdict — reform 走行『route-misfire』

道: `reform` / 相: `verdict`(tribunal 領域の最終相・環の最後の一相)
前相: [`reflect.md`](./reflect.md) / [`verify.md`](./verify.md)
報告書: [`verdict-report.json`](./verdict-report.json)

---

## 判決

```
$ node graph/verdict.js judge reform/route-misfire/verdict-report.json
═══════════ ⚖️  VERDICT ═══════════
🔴  BLOCK
Constitutional breach — cannot ship, escalate to human.

Breaches (BLOCK):
  🔴 spec not satisfied: F-1 … F-4 … — code must serve the spec

Passed:
  ✓ trajectory 70/100
  ✓ build passes
  ✓ 471/471 tests pass
  ✓ no security issues
═══════════════════════════════════
VERDICT_EXIT=2
```

# 🔴 **BLOCK**

**この走行は出荷してはならない。** 人へ差し戻す。

---

## 1. なぜ BLOCK か —— 一行で

**全ての門が緑のまま、本走行が 21 件の新しい誤着を作った。**

```
############ MAIN (c216014) ############        ############ HEAD (e60677b) ############
A群 楽園の改修(reform が正解): 誤着 6/10          A群: 誤着 0/10   ← 治した
B群 世間の創造・強い名        : 誤着 0/21          B群: 誤着 21/21  ← 壊した
C群 世間の創造・弱い名        : 誤着 0/11          C群: 誤着 0/11
TOTAL_NG=6/42                                    TOTAL_NG=21/42
```

本走行は **A群 6 件を治し、B群 0 件を 21 件に悪化させた**。
総数は **6 → 21 で悪化**している。

---

## 2. 判決の根拠(一件ずつ)

### 2.1 breach: `spec.satisfied = false` —— F-1

`requirements.md` §3.6 は、本走行の差し戻し(rework)の理由をこう記している:

> 本 requirements が §2 で名指しで禁じた「**誤着を直して別の誤着を生む**」そのものであり、
> ゆえに build 相は差し戻された(rework)。

**本走行は、その禁を強い名の側で再び破った。**

**機序**(`graph/forge.js` の実装を読んで確かめた):

```js
const REFORM_RE = new RegExp('(楽園|paradise|…|走行帳)' +
  `|${DETERMINER_LOOKBEHIND}\\b(?:${ENGINE_NAMES_STRONG})\\b`, 'i');

function isReformSubject(d) {
  if (REFORM_RE.test(d)) return true;              // ← 強い名は無条件で真
  return REFORM_WEAK_RE.test(d) && BUILD_RE.test(d); // ← 弱い名にだけ二条件
}
```

弱い名 14 語には **(1) `BUILD_RE` の伴需 (2) 限定詞の除外** の二条件が課された。
強い名 26 語には **限定詞の除外しか課されていない**。

* `a gauge dashboard` → 冠詞が在るので除外 → `full`(守られている)
* `gauge calibration tracker` → 冠詞が無い → **`reform`**(素通り)
* `gauge 圧力計のIoTダッシュボード` → **日本語に冠詞は無い** → **`reform`**

**日本語の願いに対しては、強い名の防壁が一枚も存在しない。13/13 が攫われた。**

神が「**forge 鍛冶屋の在庫管理アプリを作って**」と命じれば、
楽園は engine 改修の 11 相を立ち上げる。これは本走行が直した欠陥C と**同じ病**である。

### 2.2 breach: F-4 —— 門が守る面の半分を一度も撃っていない

```
$ (AC-31 節から [wish, name] の対を抽出)
抽出件数= 29
--- コーパス中の強い名 = 0 / 29 ---
```

AC-31 / AC-32 / AC-33 のコーパス **29 件すべてが弱い名**である。
AC-35 の故障注入 **三変異すべてが弱い名側の機構**を狙っている。

ゆえに:
* `counsel.test.js` **134 passed 0 failed**
* `paradise.test.js` **471 passed 0 failed**
* `census.js check` **EXIT=0** / `codex.js check` **EXIT=0** / `wiring.js check` **EXIT=0**

—— **これら全てが緑のまま、21 件の誤着が HEAD に在る。**
門は鳴らなかったのではない。**門はその面を一度も見ていない。**

### 2.3 これは第57条と同じ構造である

> **57. 修理は掟を広げてはならない。運べなかった条件を黙って捨てる修理は、直した門より広い門を開く。**

本走行の `isReformSubject` は、正しい動機(欠陥Aの治癒)から生まれた。
だが**弱い名に課した条件を強い名には運ばず**、
**直した門(弱い名)より広い門(強い名 26 語の無条件通過)を開いた。**

---

## 3. 通った門(隠さず記す)

BLOCK であっても、通ったものは通ったと書く(第37条)。

| 門 | 実測 |
|---|---|
| `tests/paradise.test.js`(全走・background) | **471 passed, 0 failed** / EXIT=0 / ✓行 584 ✗行 0 |
| `tests/counsel.test.js` | **134 passed, 0 failed** / EXIT=0 |
| `tests/abandoned-run.test.js` | **33 passed, 0 failed** / EXIT=0 |
| `graph/census.js check`(background) | ✓ every number the paradise claims about itself is true / **EXIT=0** |
| `graph/codex.js check` | ✓ 索引は本文と一致している (60 条) / EXIT=0 |
| `graph/wiring.js check` | ✓ 門 19 本すべてに走らせる者が居る / EXIT=0 |
| `graph/workspace.js check` | ✓ 混入なし・直書きなし・流出なし / EXIT=0 |
| `graph/derived.js check` | no test depends on derived content / EXIT=0 |
| secret scan(実装 6 本) | **SECRETS_FOUND=0** |
| `graph/gauge.js score` | **score 70**(floor 60 超)/ rework 1 / loop-guard 0 |

**security issues 0 / secrets 0 / tests 471/471 / trajectory 70 —— verdict.js はこの四つを `Passed` に数えた。**
BLOCK の理由は **spec ただ一つ**である。

**本走行が確かに治したもの**(治癒は実測済み・否定しない):

* 欠陥A —— A群 6/10 誤着 → **0/10**
* 欠陥B —— `PARADISE_CREATIONS` 残留による偽の赤
* 欠陥C —— C群(弱い名)**0/11**
* HIGH-1 / S-1(ReDoS)/ V-1(走行帳一つで check が死ぬ)—— いずれも修理・門を据えた
* 第60条を起草 / 門 469→471 / `test()` 宣言 57→94

**それでも BLOCK である。** 治した数は、作った誤着を相殺しない。

---

## 4. 「門が無い」7 件の裁定 —— **別の走行へ送る**

**AC-30 / AC-26 / AC-35 / AC-16 / AC-22 / AC-19 / AC-29 の 7 件は、今は直さない。**

**理由**:

1. **7 件は今の欠陥ではない。** どれも今この瞬間は緑であり、未達の AC は 0 件である。
   「門が無い」は**将来の回帰を捕らえられない債務**であって、`verdict.js` が
   BLOCK/REWORK を出す根拠(security / spec / test failure)に当たらない。
2. **BLOCK の走行に門を足しても出荷されない。** 直すべきは **F-1** である。
   順序を誤れば「門を足したから SHIP だ」という**数の曲げ(第57条違反)**に最も近い場所に立つ。
3. **tribunal は裁く相であり、建てる相ではない。** 本走行が五度
   「修理が新しい欠陥を生む」を実演した直後に、**無審査の修理を足すのは最も危険な選択**である。

**AC-30 が最も重いという verify 相の裁きは支持する。** 実測で裏付けた:

```
$ grep -rn "execFileSync\|spawnSync" tests/*.test.js | grep -i forge
tests/paradise.test.js:8551:  execFileSync(…, ['graph/forge.js', 'plan', wish, '--scale', 'full'], …)
```

`plan` 口が一箇所だけ。**`scale` 口を子プロセスで撃つ門は 0 本**である。
本走行は `forge.js` を大きく書き換えた(`ENGINE_NAMES` の二分割・限定詞の表・`denude`・`isReformSubject`)。
**書き換えた当の器の CLI を撃つ門が無い**のは確かに不均衡である。

> ただし本判決は、**AC-30 より重いことが在った**と述べる。
> 「**門が無い**」より「**門が在ると思っていたら守っていなかった**」の方が危険である。
> AC-31 は門を持ち、24 件のコーパスを持ち、故障注入まで持ちながら、
> **守るべき面の半分を一度も撃っていなかった。**

---

## 5. 差し戻し先と、次の走行への発令

**差し戻し先: `construction` 領域(build 相)。** F-1 は `graph/forge.js` の実装の欠陥である。

**次の走行が為すべきこと(順序どおり)**:

1. **F-1 を直す** —— 強い名にも「楽園を名指す文脈」の伴需を課す。
   **ただし `conclave の毒を除く`(限定詞なし・`BUILD_RE` なし)は今まで通り reform でなければならない。**
   tribunal は候補の実装を scratch で試したが、**A群を壊さずに B群を守る形を確定できなかった**。
   実装は次の走行に委ねる(reflect W-1)。
2. **AC-31 のコーパスに強い名を入れる** —— reflect §2.1 の B群 21 件をそのまま門の材料にできる。
3. **AC-35 の変異に「強い名の枝を壊す」を足す** —— 今の三変異は全て弱い名側である。
4. **AC-30 の門を立てる** —— `forge.js` の `scale` 口を子プロセスで起動し、
   `chooseScale()` の返り値と `console.log` の出力の一致を撃つ。
5. **F-2 / F-3** —— `denude` の自傷(`forge.js を直せ` が standard へ落ちる)と
   網羅の門の 4 文字未満除外(`kg` が表に無い)。どちらも **main から在り、欠陥Aの生き残り**である。
6. **強い名 26 語のうち 14 語を tribunal は一度も撃っていない**(reflect W-3)。
   **誤着は 21 件より増える可能性がある。** 次の走行は全 26 語を撃て。

---

## 6. 本判決が見ていないもの(名乗り)

| # | 面 | 理由 |
|---|---|---|
| V-1 | **F-1 の修理案が A群を壊さないか** | 候補を scratch で試したが確定できなかった。**欠陥の存在のみを証明した** |
| V-2 | **F-1 が神の願いで実際に踏まれる頻度** | 誤着の存在は証明したが到達可能性は測っていない |
| V-3 | **強い名 26 語中 14 語** | B群で撃ったのは 12 語。誤着は 21 件より増えうる |
| V-4 | **実 GitHub Actions 上の挙動** | 掟により push しない |
| V-5 | **Windows 以外の機械** | 本機は Windows/MSYS のみ |
| V-6 | **critic の 38 件の一件ずつの実物照合** | 全件同型であることと代表 3 件の照合で「偽の赤」と断じた。残り 35 件は読んでいない |
| V-7 | **`forge.js` の `plan` / `admit` 口** | `chooseScale` を直に呼んだ。CLI との割れは未検証 |

---

## 7. 第57条への宣誓

**SHIP を出すために数を曲げなかった。**

`spec.satisfied` を `true` にし、F-1 を「次の走行への申し送り」欄へ移せば、
この報告書は **SHIP(exit 0)** を返した。471 passed / security 0 / trajectory 70 は全て真であり、
`verdict.js` は spec 以外の全ての門で緑を出している。

そうしなかった。**F-1 は申し送りではなく、本走行が作った回帰である。**
21 件の誤着は main に無く、HEAD に在る。それを「未来の仕事」と呼ぶのは嘘である。

> **第57条 — 修理は掟を広げてはならない。**

判決は **BLOCK**、exit code **2**。人へ escalate する。
