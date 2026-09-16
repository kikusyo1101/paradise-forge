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

---
---

# §二度目 — 撤去後の判決

一度目の判決は **BLOCK**(exit 2)。理由は F-1 —— 強い名 26 語が世間の願い 21/21 を攫った。
それが build の**四度の差し戻し**を生み、教主の裁定で `ENGINE_NAMES` は**丸ごと撤去**された。
`quality` 領域は四周目で **SHIP** を出している。

**本判決はそれを視ずに、自分で数を撃ち直した。**
`git clone --no-hardlinks --branch main` で複製(`c216014`)を立て、
自作の探針 82 件と格子 150 件を**両 head で撃った**。
一度目の数も quality 四周目の数も、一つも引き写していない。

---

## 1. 判決

```
$ node graph/verdict.js judge reform/route-misfire/verdict-report.json
═══════════ ⚖️  VERDICT ═══════════
🔴  BLOCK
Constitutional breach — cannot ship, escalate to human.

Breaches (BLOCK):
  🔴 spec not satisfied: R-1 (tribunal 二度目が実測で発見。critic は黙った):
     requirements §3.6 が名指しで禁じた『誤着を直して別の誤着を生む』を、
     本走行が counsel の側で犯している。… 格子実測 主語3×建造動詞10×熟議標識5=150通りで
     main(c216014) 0/150 に対し HEAD(6ac36ca) 120/150。対照の命令形 30 件は両 head とも 0/30 で、
     熟議形だけが落ちている。main に BUILD_JA は存在しないので、これは本走行が作った回帰である
     — code must serve the spec

Defects (REWORK):
  ⚠️  trajectory score 50 below floor 60 — 荒れた走行は改善ではない (Art. 38)

Passed:
  ✓ build passes
  ✓ 471/471 tests pass
  ✓ no security issues
═══════════════════════════════════
VERDICT_EXIT=2
```

# 🔴 **BLOCK** — exit code **2**

**この走行は出荷してはならない。** 人へ差し戻す。

**一度目と同じ判決だが、理由は別物である。**
一度目の理由 F-1 は**撤去によって消えた**(実測で確認した)。
**本判決の理由 R-1 は、撤去されずに生き残った修理が作った、誰も見ていなかった回帰である。**

---

## 2. なぜ BLOCK か —— 一行で

**撤去は engine 固有名の面を綺麗に戻した。だが撤去の対象外だった `CREATE_RE` の拡張が、
熟議の願いから counsel を 120/150 奪っている。**

```
############ MAIN (c216014) ############    ############ HEAD (6ac36ca) ############
A群 楽園の改修・命令形    誤 5/18            A群 誤 0/18   ← 治した(5件)
B群 世間の創造×engine名   誤 0/20            B群 誤 0/20   ← 撤去で守られた
C群 世間の創造×世間語     誤 0/12            C群 誤 0/12   ← 悪化なし
D群 諐問・純粋な問い      誤 0/10            D群 誤 0/10   ← 悪化なし
R-1群 熟議「作るべきか」   誤 1/22            R-1群 誤 16/22 ← 壊した(15件)
TOTAL_NG = 6/82                              TOTAL_NG = 16/82

格子(主語3×建造動詞10×熟議標識5=150、正解は全て counsel):
  MAIN   0/150 誤り  (0.0%)
  HEAD 120/150 誤り (80.0%)
対照(同じ語で命令形 30 件):
  MAIN 0/30   HEAD 0/30   ← 熟議形だけが落ちている
```

**治癒 5 件 / 回帰 15 件 —— 差引 -10。**

---

## 3. breach の中身 —— R-1

### 3.1 機序(`graph/forge.js` の実装を読み、一段ずつ剥いで確かめた)

```js
function isCounsel(wish) {
  const w = denude(wish);
  if (!COUNSEL_RE.test(w)) return false;                    // 1. 諐問の語彙が無い
  if (!CREATE_RE.test(w) && !wantsProduct(w)) return true;  // 2. ← ここが割れた
  if (DOC_STRONG_RE.test(w)) return true;                   // 3. 打ち消し
  return DOC_RE.test(w) && !wantsProduct(w);
}
```

本走行は**欠陥A**(engine 改修の願いが counsel へ攫われる)を直すため、
`CREATE_RE` に `BUILD_JA` を足した:

```
BUILD_JA = 設ける|設け|足す|足し|加える|加え|追加|新設|導入|搭載|組み込|持たせ|生やす|
           できるようにする|可能にする|拡張|付ける|付与
```

その結果 2 段目が**熟議の願いでも偽**になる。
そして 3 段目の打ち消しは `DOC_STRONG_RE` / `DOC_RE` だけであり ——

```
$ node probe-mech.js
--- 熟議語は DOC_RE に在るか ---
  べきか      COUNSEL_RE=true  DOC_RE=false
  検討        COUNSEL_RE=true  DOC_RE=false
  妥当か      COUNSEL_RE=true  DOC_RE=false
  どう思う     COUNSEL_RE=true  DOC_RE=false
  どうすべき    COUNSEL_RE=true  DOC_RE=false
  はないか     COUNSEL_RE=true  DOC_RE=false
  見直        COUNSEL_RE=true  DOC_RE=false
```

**熟議の標識は 7 語すべて `COUNSEL_JA` にしか居らず、`DOC_RE` に一語も無い。**
打ち消しは効かず、`isCounsel` は偽を返す。

```
$ node probe-mech.js
願い: kg に忘れる口を設けるべきか検討して
MAIN isCounsel = true   scale = counsel
HEAD isCounsel = false   scale = standard
CREATE_RE  HEAD=true  MAIN=false   ← main に BUILD_RE は無い
```

**main にこの経路は存在しない。本走行が作った。**

### 3.2 何が壊れるか(実物)

| 願い | main | HEAD |
|---|---|---|
| `CI に段を設けるべきか検討せよ` | counsel | **standard** |
| `conclave に再開の口を足すべきか検討せよ` | counsel | **standard** |
| `憲法に条を足すべきかどう思う` | counsel | **reform** |
| `kg に忘れる口を設けるべきではないか` | counsel | **standard** |
| `should we add a resume flag to conclave? advise me` | counsel | **standard** |

神が「**憲法に条を足すべきかどう思う**」と**問うた**とき、
楽園は答えずに **engine 改修の 11 相を立ち上げる**。
これは本走行が直した**欠陥A の鏡像**である ——
欠陥A は「作れ」を「調べよ」と読み違え、R-1 は「**どう思う**」を「**作れ**」と読み違える。

### 3.3 これは第57条の再演である

> **57. 修理は掟を広げてはならない。運べなかった条件を黙って捨てる修理は、直した門より広い門を開く。**

`CREATE_RE` の拡張は正しい動機(欠陥Aの治癒)から生まれた。
だが **広げた `CREATE_RE` を読む `isCounsel` の側に、対になる打ち消しを運ばなかった。**
直した門(reform への到達)より広い門(counsel からの剥奪)を開いた。

---

## 4. defect: trajectory score 50 < floor 60

```
$ node graph/gauge.js score reform/route-misfire/conclave.json --json
{"score":50,"complete":false,"phasesTotal":11,"phasesDone":9,"domainsTotal":6,
 "domainsRatified":5,"firstPassRate":1,"reworkCount":3,"retryOverhead":0,
 "loopGuardTrips":0,"durationMs":237545033,...}
```

**一度目は score 70 / reworkCount 1 であった。** 四度の差し戻しを経て
`reworkCount` は **3(construction の限界)** に達し、score は **70→50** へ落ちた。

`verdict.js` は floor 60 で裁く。**これは breach が一つも無くても単独で REWORK を引く。**
第38条は言う —— **荒れた走行は改善ではない。**

**BLOCK と REWORK が同時に立っている。** 隠さず両方記す(第37条)。

---

## 5. 通った門(隠さず記す)

BLOCK であっても、通ったものは通ったと書く(第37条)。**全て自分で走らせた実測である。**

| 門 | 実測 |
|---|---|
| `tests/paradise.test.js`(全走・background) | **471 passed, 0 failed** / EXIT=0 / ✓行 584 ✗行 0 |
| `tests/counsel.test.js` | **210 passed, 0 failed** / EXIT=0 |
| `tests/abandoned-run.test.js` | **33 passed, 0 failed** / EXIT=0 |
| `graph/census.js fix`(background) | nothing to fix / ✓ 書き換えた数は実測と一致 / EXIT=0 |
| `graph/census.js check`(background) | ✓ every number the paradise claims about itself is true / **EXIT=0** |
| `graph/codex.js check` | ✓ 索引は本文と一致している (60 条) / EXIT=0 |
| `graph/wiring.js check` | engine 39 / 内の辺 73 / ✓ 門 19 本すべてに走らせる者が居る / EXIT=0 |
| `graph/workspace.js check` | ✓ 混入なし・直書きなし・流出なし / EXIT=0 |
| `graph/derived.js check` | no test depends on derived content / EXIT=0 |
| `graph/conclave.js audit` | 見捨てられた走行 1(`sovereign-abode`・本走行とは別)/ EXIT=0 |
| secret scan(実装 6 本) | **SECRETS_FOUND=0**(逐一 0) |
| AC 逐一駆動(道選び 11 本) | **pass=11 fail=0** |

**`verdict.js` は build / tests 471/471 / security 0 を `Passed` に数えた。**
BLOCK の理由は **spec ただ一つ**、REWORK の理由は **trajectory ただ一つ**である。

**本走行が確かに治したもの**(治癒は実測済み・否定しない):

* 欠陥A —— A群 5/18 誤着 → **0/18**
* 欠陥B —— `PARADISE_CREATIONS` 残留による偽の赤
* 欠陥C / F-1 / Q2-1 / Q3-1 / Q3-2 —— **engine 固有名の撤去により B群 0/20・C群 0/12**(main と同値、悪化なし)
* HIGH-1 / S-1(ReDoS 約 8000 倍)/ V-1(走行帳一つで check が死ぬ)—— いずれも修理・門を据えた
* 第60条を起草((a)〜(h))/ 門 469→471 / counsel の門 **51→210** / その `test()` 宣言 **37→68**

**それでも BLOCK である。** 治した数は、作った誤着を相殺しない。

---

## 6. quality 四周目の SHIP を、なぜ覆すか

quality 四周目は「**悪化した軸は一つも無し**(誤着 main 8→0 / 新しい 60 件で 15→4)」として SHIP を出した。
**その測定は正しい。だが測った軸が足りない。**

* quality が撃った軸は **`reform` への誤着**である。その軸では確かに悪化していない ——
  本判決の実測でも **B群 0/20・C群 0/12 で main と同値**であり、これを否定しない。
* **quality は `counsel` を失う軸を一度も撃っていない。**
  `tests/counsel.test.js` で `べきか` を含む行は **5 行**(`grep -c` 実測)、
  うち 4 行は紛れ語(相場/入口/窓口)の門であり、
  **建造動詞と熟議標識が同居する形は 0 件**である。

> **「悪化した軸は一つも無し」は真である。ただし「見た軸の中では」という限定が抜けている。**
> 見ていない軸で 120/150 が壊れていた。

これは第16条(**AC 全緑 ≠ spec 充足**)そのものであり、
`verdict.js` が `spec.satisfied` を tribunal に委ねている理由でもある。

---

## 7. 差し戻し先と、次の走行への発令

**差し戻し先: `construction` 領域(build 相)。** R-1 は `graph/forge.js` の実装の欠陥である。

> ⚠️ **ただし `reworkCount` は既に 3(限界)である。**
> reflect §二度目 4.2 の**提案3** —— 「差し戻し 3 回目は build でなく design 相へ戻す」 ——
> がまさにこの状況を指す。**次の差し戻し先は build ではなく design であるべきだ**と本判決は述べる。

**次の走行が為すべきこと(順序どおり)**:

1. **R-1 を直す** —— 熟議の標識(べきか/検討/妥当か/どう思う/どうすべき/はないか/見直)が在るとき、
   建造動詞は「物を求めている」の証拠にならない。
   **ただし `楽園の門を直すべきか` が reform を失わないか**を必ず両方向で撃つこと(第60条(b))。
   本判決は**修理案を試作していない**(W-1)。欠陥の存在のみを証明した。
2. **`ROUTE_MATRIX` を建てる**(reflect §二度目 提案1)—— 6 道 × 6 道の混同行列。
   各道について正解の願いを最低 8 件持ち、**非対角の各セルが 0 であること**を assert する。
   これが無い限り、次の修理も片側しか見ない。
3. **第61条を起草する**(reflect §二度目 提案2)——
   「判定器を直したら、その判定器が奪いうる全ての行き先を数えよ」。
   `codex.js index --write` → `codex.js check` を忘れるな。
4. **発令書に三行を足す**(提案4)—— main を複製して両 head で撃て /
   触れた定数を読む全経路を列挙せよ / AC が要求していない軸を最低一つ持て。
5. **AC-30(`forge.js` CLI 口の門)** —— 一度目も送った。**三度目の申し送りになる。もう送るな。**
6. **F-2 / F-3** —— `denude` の自傷・網羅の門の 4 文字未満除外。どちらも main から在る。

---

## 8. 本判決が見ていないもの(名乗り)

| # | 面 | 理由 |
|---|---|---|
| V-1 | **R-1 の修理案が A群/B群を壊さないか** | 試作も測定もしていない。**欠陥の存在のみを証明した** |
| V-2 | **R-1 の英語側の全域** | 英語は 2 件のみ(`should we add…` / `is it wise…`)。`\b` が効くので軽い可能性が高いが**測っていない** |
| V-3 | **quick / full / cartography を失う面** | 同じ機序が他の道でも起きうるが、混同行列を作っていない(だから提案1を出した) |
| V-4 | **AC-13 〜 AC-35 / AC-37 〜 AC-46 の逐一駆動** | 道選びの AC 11 本を生で駆った。残りは verify 相の実測に依らず**未駆動**である(引き写してもいない) |
| V-5 | **critic の 37 件の一件ずつの実物照合** | 同型であることと代表数件の照合で断じた。残りは読んでいない |
| V-6 | **実 GitHub Actions 上の挙動** | 掟により push しない |
| V-7 | **Windows 以外の機械** | 本機は Windows/MSYS のみ |
| V-8 | **`forge.js` の `plan` / `admit` / CLI 口** | `chooseScale` を直に呼んだ。CLI との割れは未検証(AC-30 の債務そのもの) |

---

## 9. 第57条への宣誓

**SHIP を出すために数を曲げなかった。**

`spec.satisfied` を `true` にし、R-1 を「次の走行への申し送り」欄へ移せば、
breach は消えた。だが `trajectory.score` が 50 である以上、
それでも **REWORK(exit 1)** であり、**SHIP には決して届かなかった**。
score を書き換えれば SHIP は出せた —— `gauge.js` の実出力を写さず手で 70 と書けばよい。

**そうしなかった。**

* **R-1 は申し送りではない。** 120/150 の誤着は main に無く、HEAD に在る。
  それを「未来の仕事」と呼ぶのは嘘である。
* **score 50 は gauge.js の実出力である。** 四度の差し戻しは実際に起き、
  `reworkCount` は実際に 3 である。荒れた走行を 70 と書くのは第38条の否定である。

quality 四周目が SHIP を出していることも、教主が撤去を裁定したことも承知している。
**それでも本判決は BLOCK である。**

> **第57条 — 修理は掟を広げてはならない。**
> **第38条 — 荒れた走行は改善ではない。**
> **第16条 — AC が全て緑であることと spec が満たされていることは同じではない。**

判決は **BLOCK**、exit code **2**。人へ escalate する。

---

## 10. 追補 —— 判決後に掴んだ二つの盲点(判決は変わらない)

§1〜§9 を書き終えたあと、`lessons.json` の件数を確かめようとして
**R-1 とは独立の欠陥を二つ**掴んだ。実測は reflect §二度目 §9 に在る。
**どちらも breach ではないので判決は BLOCK のまま変わらない**が、隠さず記す(第37条)。

### 10.1 盲点② —— 学習機構が空転していた

```
$ node graph/lessons.js export --out graph/lessons.json
$ git diff --stat graph/lessons.json
 graph/lessons.json | 112 +++++++++++++++++++++++++++++++++++++++++++++++++++++
  教訓 85 → 99 (+14)
```

critic が読む `graph/lessons.json` は `lessons.js export` の**生成物**であり、
`kg.js remember` が刻む KG(`graph/kg-store/`)は **`.gitignore` されている**。
**本走行は一度も export を走らせていなかった。**

増えた 14 件のうち **10 件は本走行自身が刻んだ教訓**である。
一度目の tribunal は 4 件を刻んで「critic が永久に検め続ける」と書いたが、
§1 で走らせた critic は `lessons: 85 件で裁いた` と名乗っており、
**走行自身の教訓はその外に居た。**

### 10.2 盲点③ —— 自己審査の既定 scope が、走行自身の教訓を握り潰す

`lessons.json` を 99 件に直しても GAP は 37 のままだった。理由は実装に在る:

```js
// graph/critic.js:583
const DEFAULT_SELF_SCOPES = ['paradise-internal', 'orchestration'];
```

本走行が刻んだ教訓の scope は **`forge` / `gate` / `reform`** である。
ゆえに 14 件が `lesson out of scope here` として**緑**になる。

**`.paradise-scopes` に 5 語を宣言して撃ち直した(実測)**:

```
GAP 37  →  39
  lesson:corpus-blind-to-its-own-half   ✓ → 🔴
  lesson:restore-path-must-be-verified  ✓ → 🔴
```

新たに赤くなった `corpus-blind-to-its-own-half` はこう述べている:

> 「門のコーパスが規則の片枝しか含まないなら、門は永久に緑のまま面の半分を素通しする。
>  **コーパスは規則の枝ごとに数えて示せ。**」

**これは R-1 そのものである。**

> **一度目の tribunal はこの教訓を正しく刻んだ。**
> **走行は scope の既定値によってそれを自分で握り潰し、同じ病を再発させた。**
> **この走行は自分を救う知識を既に持っており、二つの機構の不備でそれを自分に届けられなかった。**

`.paradise-scopes` は実測の後に**削除した** —— **tribunal は裁く相であり、建てる相ではない**
(§7 の一度目の裁定を踏襲)。欠陥の存在を証明し、次の走行へ渡す。

### 10.3 判決への影響 —— **無し**

`verdict.js` が裁く軸(security / spec / build / tests / trajectory)に
②③は当たらない。**breach を増やさず、defect も増やさない。**
判決は **BLOCK / exit 2** のままである。

だが次の走行への発令には**二つ足す**(§7 の 6 項に続けて):

7. **`lessons.js export` を走行の環に組み込む**(提案5)——
   `kg.js remember lesson` を呼んだ走行が export を走らせたかを見る門を建てよ。
   `lessons.json` の件数と KG の lesson 件数がずれていれば赤くする。
   **知識を刻んだのに門に届いていない状態は、刻んでいないのと同じである。**
8. **`--self` の scope を走行の触れた物から導け**(提案6)——
   `graph/forge.js` を触ったなら `forge`、`tests/*.test.js` を触ったなら `gate`、
   `reform/` に住むなら `reform`。導けないなら**声に出して名乗らせ、緑にするな**
   (第37条・第60条(d) —— 門が弱い印で自らの発火を決めてはならない)。

### 10.4 判決が見ていないもの(追補)

| # | 面 | 理由 |
|---|---|---|
| V-9 | **scope を正しく宣言した場合の 39 件の一件ずつの照合** | 2 件の差分(`corpus-blind-to-its-own-half` / `restore-path-must-be-verified`)のみ実物と突き合わせた。残り 37 件は §5 と同じく同型と判断した |
| V-10 | **`lessons.json` を 99 件に直したことの副作用** | `derived.js check` は EXIT=0 を保ったが、CI 上で lessons を再生成する裁定ジョブとの相互作用は**測っていない**(`lesson:art29-derived-not-truth` が名指しする面) |
| V-11 | **提案5/6 の実装可能性** | どちらも試作していない。**欠陥の存在のみを証明した** |

---

# §三度目 — 環の最後の判決

> **tribunal 三度目 / verdict 相。** construction は reworks=3(限界)に達している。
> **これ以上差し戻せば環は blocked になる。**
> 前相: [`reflect.md` §三度目](./reflect.md) / 報告書: [`verdict-report.json`](./verdict-report.json)

---

## 判決

```
$ node graph/verdict.js judge reform/route-misfire/verdict-report.json
═══════════ ⚖️  VERDICT ═══════════
⚠️  REWORK
Fixable defects — loop back and repair, then re-judge.

Defects (REWORK):
  ⚠️  trajectory score 50 below floor 60 — 荒れた走行は改善ではない (Art. 38)

Passed:
  ✓ build passes
  ✓ 471/471 tests pass
  ✓ no security issues
  ✓ spec satisfied
═══════════════════════════════════
VERDICT_EXIT=1
```

# ⚠️ **REWORK**(exit 1)

**二度目の BLOCK(exit 2)は解けた。** `spec satisfied` が ✓ に転じ、breach は 0 件である。
**残る欠陥は一つ、`trajectory score 50 < floor 60` のみ。**

**数は一切曲げていない。** 第57条により、曲げれば教主は必ず撃ち直す。

---

## 1. 二度目からの変化 —— 何が解けたか

| | 二度目 (6ac36ca) | **三度目 (577949e)** |
|---|---|---|
| **判決** | 🔴 **BLOCK** (exit 2) | ⚠️ **REWORK** (exit 1) |
| breach | `spec not satisfied: R-1` | **0 件** |
| defects | (breach が優先し表示されず) | `trajectory 50 < 60` の **1 件** |
| `spec.satisfied` | `false` | **`true`** |
| 格子 150 通り | HEAD **120/150 誤着** | **0/150**(route-matrix M-6 が緑) |
| 門 | 471 / 210 / 33 | 471 / 210 / 33 / **13** / **8** |
| 走らせる者を持つ門 | 19 | **21** |
| 条 | 60 | **61** |

**BLOCK は解けた。** R-1 の治癒を、本相が両 head の探針で独立に実測した(§2)。

---

## 2. なぜ `spec.satisfied = true` か —— 数で述べる

### 2.1 二度目の BLOCK 根拠(R-1)は治癒した

```
                              main(c216014)   HEAD(577949e)
格子 150 通り(熟議 × 建造動詞)      0/150          0/150   ← 二度目は 120/150
熟議 30 件(建造動詞10 × 文型3)      0/30           0/30
英語の熟議 8 件                    2/8            0/8    ← ✓ 改善 -2
対照: 命令形 30 通り                0/30           0/30   ← 誤射していない
```

**故障注入で門が本当に働くことを確かめた**(複製の中で):

```
DELIBERATION_RE を空にする → route-matrix 9 passed 4 failed
  M-2[対角] / M-3[非対角] / M-4[R-1名指し] / M-6[格子150] が鳴った
  非対角セル: counsel→reform 9 件 , counsel→standard 22 件 , counsel→full 1 件
  ※ 同じ変異に対し counsel.test.js は 210/0 で黙る
```

### 2.2 AC は緑である

```
  ✓ AC-01 / AC-02 / AC-03 / AC-04 / AC-06 / AC-07 / AC-08 / AC-09 / AC-12
  ⊘ AC-05 (🔴 射程外・取り下げ済み)
  AC 生駆動: pass=9 fail=0 射程外=1
```

### 2.3 8 度の回帰は 8/8 が今の門で捕らえられる

二度目は「8 件中 7 件が治癒、8 件目(R-1)が未修理」であった。**8 件目も塞がれた。**

---

## 3. AC-03 型 2 件の裁定 —— **選択肢 1(射程外へ格下げ)**

**教主の見立てと同じ結論に達したが、盲従ではない。**
選択肢 2(未達として数え BLOCK/REWORK を出す)の側から**四つの数を当てて反証を試み、四つとも選択肢 1 を支持した。**

| # | 根拠 | 数 |
|---|---|---|
| 1 | **回帰ではない** | `CI に ledger --audit を追加する`: main=counsel → HEAD=**standard**(✓ 改善)<br>`conclave の毒を除く`: main=standard → HEAD=standard(**= 同じ**)<br>**第38条の前後比較で悪化 0 件** |
| 2 | **AC-03 は既に改訂済みで緑** | 期待値は build 相四度目で「`counsel` でない」へ改訂。生駆動 **pass=9 fail=0** |
| 3 | **門が assert している断言である** | `tests/counsel.test.js:875` が `conclave の毒を除く` に対し `isReformSubject=false` / `chooseScale !== 'reform'` を**機械で assert**。未達と呼ぶことは**緑の門を赤と呼ぶ**ことである |
| 4 | **選択肢 2 の代価**(★ 教主の報告に無い数) | 下表 |

### 3.1 根拠 4 —— 決定打

「AC を緑にせよ」は「engine 固有名を印に戻せ」と**同値**である。代価を測った:

```
engine 名 26 語 × 「に検めの口を設ける」が reform へ着かない数:
    main            = 26/26      ← main も全て着かない
    HEAD (撤去後)   = 26/26      ← main と同じ = 回帰ではない
    撤去前 6a4e3f4  =  3/26      ← 印が在れば 23 件が着く

世間の願い × engine 名 18 件 が reform へ誤着する数:
    main            =  0/18
    撤去前 6a4e3f4  =  7/18      ← 印が在ると 7 件が攫われる (= Q3-2)
    HEAD (撤去後)   =  0/18
```

**「AC 23 件を緑にする」ことと「世間の誤着 7 件(Q3-2)を甦らせる」ことは同じ操作である。**
第60条(b) が言う「両方向に誤る印」そのものであり、
**選択肢 2 は「四度差し戻された修理をもう一度やれ」と言うに等しい。**

**裁定: 射程外へ格下げ。未達として数えず、これを理由に BLOCK / REWORK を出さない。**
`requirements.md` §8.9 に実測と共に残した。

---

## 4. REWORK の唯一の理由 —— `trajectory score 50`

### 4.1 数の内訳(`graph/gauge.js` の式を読んで確かめた)

```js
// graph/gauge.js:15
score = 100 − 10×rework − 5×retryOverhead − 15×loopGuardTrips − 20×(complete ? 0 : 1)
```

```
100
 − 10 × 3   (reworkCount=3)          = −30   ← 四度の差し戻しの負債。実在する
 −  5 × 0   (retryOverhead=0)        =   0
 − 15 × 0   (loopGuardTrips=0)       =   0
 − 20 × 1   (complete=false)         = −20   ← domainsRatified 5/6
─────────────────────────────────────────
                                        50   (floor 60)
```

### 4.2 **−20 は「tribunal 領域がまだ批准されていない」ことだけを意味する**

反実仮想を**走行帳の複製**に対して測った(**本物の走行帳には一字も触れていない**):

```
$ (複製の domains[5].status を 'ratified' にして)
$ node graph/gauge.js score <複製> --json
{"score":70,"complete":true,"domainsRatified":6,"reworkCount":3,...}

$ node graph/gauge.js score reform/route-misfire/conclave.json --json   # 本物
{"score":50,"complete":false,"domainsRatified":5,"reworkCount":3,...}

$ (本物の走行帳を確認) tribunal status = active     ← 無傷
```

**tribunal 領域が批准されれば score は 70 となり floor 60 を超える。**
**そして判決は `spec satisfied` / `471/471` / `no security issues` / `trajectory 70` の
四つ全てが ✓ となり SHIP になる。**

### 4.3 **本相は自分で批准しない。** —— これが第57条である

**`verdict.js` が REWORK を出した理由を、判決を出す当人が消しにいくのは
「数を曲げる」ことそのものである。** ゆえに本相は:

* **走行帳を書き換えていない**(tribunal は `active` のまま)
* **`verdict-report.json` の `trajectory` は `gauge.js --json` の出力をそのまま写した**
  (`score: 50` / `complete: false` / `reworkCount: 3`)
* **REWORK をそのまま報告する**

**批准は本相の権能ではない。** `ratify` は領域を所有する者が下す。
**教主が `node graph/conclave.js ratify` で tribunal を批准すれば、
同じ報告書が再判決で SHIP(exit 0)を返す。** その判断を教主に委ねる。

### 4.4 **reworkCount=3 の −30 は消えない。そして消すべきではない**

**仮に tribunal が批准されても score は 70 であり、100 ではない。**
四度の差し戻しは実在した負債であり、`gauge.js` は run-state から決定的にそれを導いている。
**この −30 を消す道は存在しないし、存在してはならない**(第38条: 荒れた走行は改善ではない)。

---

## 5. **BLOCK を出さない理由** —— 今この枝の欠陥か、次の走行の題か

**本判決は BLOCK ではない。breach は 0 件である。**
だが reflect §三度目 が実測で見つけたものを、
**「今この枝で直さねばならぬ欠陥」と「次の走行へ送るべき題」に別ける**(教主の命による)。

### 5.1 **今この枝の欠陥** —— **0 件**

| 候補 | なぜ「今の欠陥」ではないか |
|---|---|
| AC-03 型 2 件 | main と同じか良い。回帰ではない(§3) |
| `ROUTE_MATRIX` が 5 形を捕らえない | **面は無防備ではない** —— 5 形すべてを `counsel.test.js` が捕らえる(106/82/37/5/5 failed)。門は両方緑であり、**振る舞いは正しい** |
| `CREATE_RE` の `BUILD_JA` が余剰 | **撤去しても 75/75 の願いが一件も動かない**。害が現に出ていない |
| critic が三度黙った | critic 自身の欠陥であって、本走行の成果物の欠陥ではない |
| AC-30(CLI 口の門) | 三度の tribunal がいずれも「別の走行へ」と裁いた |

**ゆえに `spec.satisfied = true` であり、差し戻すべき実装の欠陥は無い。**

### 5.2 **次の走行へ送る題** —— 5 件(優先順)

1. **`ROUTE_MATRIX` の註と第61条の散文を直す。**
   「片側だけ直す修理が構造的に不可能になる」は**実測で偽**である(5 形 0/5)。
   第33条(散文が機構を騙る)であり、**散文が嘘をついている間は、次の走行が
   「行列が在るから安全」と誤信する。** これが最も危険な負債である。
2. **行列のコーパスに「世間の願い × engine 名」の行を足す。**
   標準の 9 件・full の 8 件は engine 固有名を一語も含まない。
   この行を足せば、5 形は行列でも鳴るようになる。
3. **`CREATE_RE` から `BUILD_JA` を撤去する。**
   M9 実測 75/75 不動。**R-1(8 度目の回帰)を生んだ当の語彙であり、今は何の仕事もしていない。**
4. **critic を「語の出現」から実質判定へ。** 三度連続で本物を外している。
5. **AC-05 / FR-04** —— engine 固有名を印にする題。`requirements` §8 と §8.9.4 の数から始めよ。

### 5.3 なぜ 1〜3 を今やらないか

**本走行は「修理が新しい欠陥を生む」を 8/8 = 100% で実演した。**
そして **reworks=3 は construction の限界であり、差し戻せば環は blocked になる。**

> **tribunal は裁く相であり、建てる相ではない。**

**無審査の修理を最後の環でねじ込むことは、9 度目の回帰を招く最も確実な手である。**
特に 3(`BUILD_JA` 撤去)は **振る舞いを一件も変えない** —— すなわち**急ぐ理由が数の上に無い。**

---

## 6. 通った門(隠さず記す / 第37条)

| 門 | 実測 | EXIT |
|---|---|---|
| `tests/paradise.test.js`(全走・background) | **471 passed, 0 failed** | 0 |
| `tests/counsel.test.js` | **210 passed, 0 failed** | 0 |
| `tests/abandoned-run.test.js` | **33 passed, 0 failed** | 0 |
| `tests/route-matrix.test.js`(第61条の新しい門) | **13 passed, 0 failed** | 0 |
| `tests/lesson-export.test.js`(盲点②の新しい門) | **8 passed, 0 failed** | 0 |
| `graph/wiring.js check` | ✓ 門 **21 本**すべてに走らせる者が居る (第44条) | 0 |
| `graph/codex.js check` | ✓ 索引は本文と一致している (**61 条**) | 0 |
| `graph/census.js fix` | nothing to fix / ✓ 書き換えた数は実測と一致する | 0 |
| `graph/census.js check` | (background) | 0 |
| `graph/lessons.js export` | 教訓 103 → **107** (+4) | 0 |
| secret scan | **SECRETS_FOUND=0** | — |

**`verdict.js` はこの四つを `Passed` に数えた**:
`build passes` / `471/471 tests pass` / `no security issues` / **`spec satisfied`**。

**本走行が確かに治したもの**(実測済み・否定しない):

* 欠陥A —— 本旨 11 件の誤着 **3/11 → 0/11**
* 欠陥B / HIGH-1 / S-1(ReDoS) / V-1 —— いずれも修理・門を据えた
* 欠陥C / F-1 / Q2-1 / Q3-1 / Q3-2 —— `ENGINE_NAMES` 撤去で世間の誤着 **0/18**
* **R-1 —— 熟議の願いの誤着 格子 120/150 → 0/150**、英語の熟議 **2/8 → 0/8**
* 門 469→471 / 走らせる者を持つ門 19→**21** / 条 60→**61** / 教訓 85→**107**

---

## 7. 教主への申し送り(この判決をどう扱うか)

**本判決は REWORK(exit 1)であり、差し戻すべき実装の欠陥は 0 件である。**
REWORK の唯一の理由は **tribunal 領域が未批准であること(−20)** と
**四度の差し戻しの負債(−30)** の合算が floor を 10 点下回ることである。

**取りうる道は二つ。どちらも本相の権能を超える:**

1. **tribunal を批准して撃ち直す** —— `node graph/conclave.js ratify`(または相当の口)で
   tribunal 領域を批准すれば `complete=true` となり **score 70 ≥ floor 60**。
   **同じ報告書のまま SHIP(exit 0)になる。**
   ただし**本相は自分でこれをしない** —— 判決を出す当人が判決の理由を消すのは第57条違反である。
2. **REWORK として受ける** —— 四度の差し戻しの負債(−30)を
   「この走行は荒れていた」という事実として受け入れ、環を閉じずに置く。

**どちらを選ぶかは教主の裁量である。本相は数をそのまま差し出す。**

---

## 8. 本判決が見ていないもの(名乗り / 第37条)

* **AC は 10 本しか生駆動していない**(全 47 本)。残りは verify 相の実測を引き写していない。
* **`ratify` の口を撃っていない。** §7 の道 1 が実際に SHIP を返すかは、
  走行帳の複製に対する `gauge.js` の再計算(score 70)からの**推論**である。
* **`BUILD_JA` 撤去後の全走 471 を確かめていない**(counsel 210 / route-matrix 13 のみ)。
* **強い名 26 語を一文型でしか撃っていない。**
* **`workspace.js check` / `derived.js check` / `conclave.js audit` を今回は撃っていない**
  (二度目が撃って EXIT=0 を得ているが、**本相は自分の目で見ていない**)。
* **本相は自傷を一度犯した** —— 作業木の `graph/forge.js` を変異させたまま走者が落ちた。
  教主が止め、復旧して hash で照合した(reflect §三度目 8.1)。**commit はしていない。**
