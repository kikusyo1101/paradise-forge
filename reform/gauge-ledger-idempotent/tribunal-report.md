# TRIBUNAL — 断罪機関 (gauge-ledger-idempotent)

- 相: **TRIBUNAL(reflect + verdict)**。この環の最後の相である。
- 枝: `fix/gauge-ledger-idempotent` / 入力 HEAD: `c86cbc9`(449 passed / 0 failed)
- 走行環境: Node v24.14.0 / Windows / 作業言語 日本語
- **本相で `graph/` も `tests/` も一行も変更していない。**加えたのは本書と KG の教訓 4 件だけである。
- **実台帳は一バイトも動いていない**(§5)。道具はリポジトリ内に一つも残していない
  (`%LOCALAPPDATA%/Temp` に置いた)。
- **判決: 🔴 BLOCK**(`verdict.js judge` exit 2)。§4 に全文と、なぜ曲げなかったかを述べる。

---

## 1. reflect ①: critic.js による自己批判 — exit 1 / 46 指摘

```
$ node graph/critic.js review .../reform/gauge-ledger-idempotent --lessons graph/lessons.json --self
lessons: 76 件で裁いた
VERDICT: 46 GAP(S) — the creation is incomplete. REWORK.
exit 1
```

**この 46 件をそのまま「46 の欠陥」と読むのは誤りである。** 内訳を自分で数えた:

| 種別 | 件数 | 実体 |
|---|---|---|
| 実質検査(構造・秘密・免除・第30条) | 6 | **全て緑**。うち `exemption-claim-verified` は「申告 `--self` × 実在地 `reform\gauge-ledger-idempotent`」の二段照合を通っている |
| `lesson:*` のうち **緑 or 対象外** | 24 | 教訓が満たされている / `applies` が合わない(timer 等) |
| `lesson:*` のうち **🔴 LESSON REGRESSION** | **46** | 本文の語が `codeBlob + requirements + findings` に出現しないというだけの判定 |

**🔴 46 件の正体を裁く。** 例えば `lesson:visual-identity-vocabulary`(見た目の語彙)、
`lesson:borrowed-not-altered`(上流の借り物)、`lesson:art19-supply-not-stock`(配備の在庫)は、
**台帳の冪等化という主題と一片も関係がない**。それでも赤いのは、この 46 件が
`kind:mechanism`(既定)のまま `applies:paradise-internal` を名乗り、
**scope が「楽園内部」でさえあれば主題を問わず全て発火する**からである。

つまり **critic の 46 赤は、この環の欠陥ではなく critic の解像度の限界を測っている。**
第28条(規範は文字列照合で裁くな)が `kind:conduct` を導入したのと**同じ病が、
`kind:mechanism` かつ `applies:paradise-internal` の帯に残っている** ——
楽園内部の改革は、無関係な過去の教訓を常に 40 件以上赤く点けたまま走ることになる。
**永久に赤い門は無視される門である**(第21条の教訓そのもの)。

> **本相はこれを直さない。**指示は「実装を直すな」であり、critic.js は engine である。
> だが**名指す**。これは次の改革の候補として §6 に置く。

**ただし免罪はしない。** 46 件の中に、この環が実際に踏むべきだったのに踏まなかったものが
**一件ある**: `lesson:gauge-trajectory-over-outcome`(「outcome だけを裁く門は偶然通った暴走を
祝福する」)。これは `applies` が gauge に届く教訓であり、**この環の主題そのものである**。
そして §4 が示すとおり、**この環の trajectory は 0/100 である。**
教訓は「荒れた走行は tests 全通過でも改善ではない」と述べていた。**そのとおりになった。**

---

## 2. reflect ②: この環そのものを裁く — 成果物ではなく過程を

### 2.1 なぜ四度も差し戻したのか

| # | 差し戻した者 | 何を見つけたか | **設計段階で予見できたか** |
|---|---|---|---|
| 1 | review / security | 24 門のうち **8 件の無音**、S-1(自己申告の指紋が検証されない)、S-2(無制限再帰) | **予見できた。** design.md は「網をどう張るか」を一節も書かず、S-1 は「指紋を誰が検証するか」という設計上の問いに答えていなかった |
| 2 | review-2 | 別の 39 変異で **14 件の無音**、P-1(S-2 の修理が生んだ新しい病 — 読めなかった行を 0 件と偽る) | **半分は予見できた。** 無音は 1 回目と同型ゆえ予見可能。P-1 は「修理が開く面」を問う節が無かったことに帰する |
| 3 | prove-3 自身 | 27 変異で 11 件の無音を自分で発見し埋めた | **これは健全な差し戻しである。**自ら見つけて自ら埋めた |
| 4 | security-3 | **F-1 先回り毒** — 指紋の材料に `ts` が無いため未来の観測の鍵を先取りされ、正当な観測が永遠に刻まれない。**main には無く、冪等化そのものが開いた穴** | **予見できた、そしてこれが最大の失点である。**「鍵から `ts` を外す」は design.md が明示的に選んだ決定であり、その決定の直後に「では鍵を先に計算されたら?」を問うべきだった。**冪等性を設計した者が、冪等性の対偶を問わなかった** |

**四件のうち三件(1・2・4)は設計相で予見できた。** 実装が弱かったのではない ——
**design.md に、あるべき三つの節が存在しなかった**:
(a) この設計が新しく可能にすること、(b) 網を誰がどの軸で撃つか、(c) 自作の変異では届かない層。

**設計に一時間を払わなかった代償を、差し戻しで十時間払った。**

### 2.2 「自分で打った変異が全部鳴った」が二度裏切られた

これがこの環の最も重い教訓である。事実の系列は明快である:

```
prove1: 24 門 / 「無音ゼロ」   → review が別の 8 件の無音を発見
prove2: 39 変異 / 「無音ゼロ」 → review-2 が別の 39 変異で 14 件の無音を発見
prove3: 27 変異 / 自ら 11 件の無音を発見して埋めた
```

**二度連続で、同じ形で裏切られている。** 偶然ではなく構造である ——
**変異を設計した者と門を設計した者が同じなら、変異は門の想像の外を撃たない。**
prove が撃てるのは「自分が門を書くときに考えた失敗の形」だけであり、
それは定義により門が既に捕らえる形である。「全部鳴った」は
**網の広さではなく、想像の狭さの一致**を測っている。

正しい言い方は **「無音ゼロ」ではなく「私が打った N 種の範囲で無音ゼロ」**である。
そして prove3 が 11 件を自分で見つけられたのは、**打つ軸を変えた**(CLI・下流・環境・境界・門自体)からであって、
数を増やしたからではない。**軸が同じなら 100 変異打っても新しい無音は出ない。**

### 2.3 修理が次の病を生む連鎖をどう早く捕らえるか

この環では **二度** 連鎖した:

```
S-2 (無制限再帰)  →  修理  →  P-1 (raw が痩せ、全滅した台帳を「健全」と答える)
冪等化そのもの     →         →  F-1 (先回り毒 — main には存在しない穴)
```

**どちらも修理の直後の相では見つからず、次の差し戻しで初めて出た。**
security-2 は「新規の重大なし」と書き、同じ時刻に走っていた review-2 が P-1 を見つけている。
security-3 が方針を変え、**「値の形」ではなく「経路」を撃った**とき初めて F-1 が出た。

**捕らえ方は分かっている。security-3 が実際にやった二つを機構にすればよい:**

1. **差分が塞いだ穴ではなく、差分が新しく可能にしたことを撃つ。**
   build の後の security/review に「この差分は何を新しく可能にしたか」という節を必須にする。
2. **main と HEAD を切り分けて毎回名指す。**
   security-3 は F-4 について `main gauge.js ledger → exit=2` / `HEAD → exit=2` を並べ、
   「本改革が作った穴ではない」と証明した。同じ手続きで F-1 は
   「**main には無い**」と証明され、それが F-1 を最優先に押し上げた。
   **この一手が無ければ F-1 は「既知の弱さ」に紛れて出荷されていた。**

### 2.4 12 時間(875.6 分)は妥当だったか

`gauge.js score` の実測は **duration 875.6 分 / firstPassRate 33.3% / reworkCount 3 / retryOverhead 15**。

**妥当ではない。だが浪費でもない。** 内訳を分けて裁く:

| | 時間 | 裁定 |
|---|---|---|
| discover / specify / design | 約 2.5h | **短すぎた。** §2.1 のとおり、ここの空白が差し戻し 3 件を生んだ |
| build×4 + prove×4 | 約 7h | **うち約 4h は設計の空白の利息である。** 1 回目の build/prove が最終形に届かなかったのは実装の失敗ではなく仕様の失敗 |
| review×3 + security×3 | 約 3h | **これは正当な支出である。**この 3h が無ければ F-1 を抱えたまま出荷していた |
| verify | 約 0.3h | 妥当 |

**結論: 12 時間のうち約 4 時間は、設計相で 1 時間払わなかったことの利息である。**
残り 8 時間は、この規模の改革(門 344→449、変異 186 種、憲法一条の成文)に対して過大ではない。
**削るべきは総時間ではなく、差し戻しの回数である。**

### 2.5 道具自身の欠陥 — 変異注入器が実台帳を 19 行汚した

prove-3 §5.1 が自ら告白し、commit `0f3fe12` として台帳に記された。
**これを正直に記録したことは正しい。** そして後続(review-3 / verify)は
**変異ごとに実台帳の sha256 を検算し、一バイトでも動いたら即停止する錠**を先に付け、
一度も発火させなかった。**事故が機構になった** —— これはこの環の最良の一手である。

### 2.6 この環が正しくやったこと(公平のために名指す)

- **緑で埋めなかった。** verify は 33 件中 28達成 / 4未達 / 1 検められないと書き、
  AC-8c を「達成」に丸めず「検められない」と書いた(第16条)。
- **門の名前が自分の限界を名乗っている。** `(AC-8a / AC-8b — 仮倉で模擬)` という門名は、
  読む者に「これは模擬である」と告げ続ける。**門が自分の射程を自白している。**
- **憲法第55条を (a)〜(g) まで成文した。** この環の学びは散文でなく最高法規に載った。
- **F-1 の修理案を三つ比べ、棄却理由を commit に書いた**(α ts を混ぜる / β 上書き / γ 採用)。

---

## 3. reflect ③: 刻んだ教訓 — KG に 4 件

`node graph/kg.js remember lesson …` を実際に走らせ、`lessons.js export` で 82 件に増えたことを確認した。

| id | applies / kind | 要旨 |
|---|---|---|
| `mutation-author-is-blind-to-own-net` | paradise-internal / conduct | 自分で打った変異が全部鳴っても網は証明されない。prove の主張は「私が打った N 種の範囲で」と述べ、網の証明は別の者が別の軸で撃つまで保留せよ(§2.2) |
| `repair-opens-a-new-surface` | paradise-internal / conduct | 修理は次の攻撃面を開く。差分が塞いだ穴でなく差分が開いた面を撃ち、main と HEAD を切り分けて「本改革が作った穴か」を毎回名指せ(§2.3) |
| `idempotent-key-can-be-preempted` | **gauge** / mechanism | 決定的な冪等鍵は先取りできる。鍵から `ts` を外した瞬間「同じ観測は二度刻まない」が「先に名乗った者が勝つ」に化ける。攻撃者は要らない — 狂った時計で同じ形が出る(§2.1 #4) |
| `rework-four-times-is-a-design-debt` | paradise-internal / conduct | 四度の差し戻しは実装の弱さでなく設計の空白。設計相は FR ごとに (a)新しく可能になること (b)網の軸と担い手 (c)自作変異では届かない層 を書け(§2.1) |

```
$ node graph/lessons.js export --out …/less.json
exported 82 lesson(s)
mutation-author-is-blind-to-own-net | applies=paradise-internal | kind=conduct
repair-opens-a-new-surface          | applies=paradise-internal | kind=conduct
idempotent-key-can-be-preempted     | applies=gauge            | kind=mechanism
rework-four-times-is-a-design-debt  | applies=paradise-internal | kind=conduct
```

### 3.1 刻んだ先は KG である — `graph/lessons.json` は**あえて再生成しなかった**

教訓の出所は `~/.claude/paradise-kg`(`kg.js` の `ROOT`)であり、`graph/lessons.json` は
そこから生成される派生物である(第29条: 生成物でなく生成器の性質を検めよ)。
本相は KG に刻み、export で 82 件になることを確かめた。**だが `graph/lessons.json` は更新していない。**

理由を正直に書く。倉の `lessons.json` は **76 件**、KG の実体は **82 件**である。差分は 6 件:

```
live-only: critic-exemption-self-declaration, ring-not-closed-by-merge,   ← 本相より前から在る乖離
           mutation-author-is-blind-to-own-net, repair-opens-a-new-surface,
           idempotent-key-can-be-preempted, rework-four-times-is-a-design-debt  ← 本相が刻んだ 4 件
repo-only: (なし)
```

**本相より前から 2 件の乖離が在った。**再生成すれば私の 4 件と同時に、
**この環と無関係な 2 件を私の commit で持ち込む**ことになる。
断罪機関が自分の判決の commit に他所の差分を紛れ込ませるべきではない。
ゆえに**触らなかった**。次の環が `lessons.js export` を走らせれば 6 件まとめて追いつく。
**§6 の申し送りに置く。**

---

`idempotent-key-can-be-preempted` だけ `kind:mechanism` にしたのは意図である ——
これは**コードに現れうる**教訓(先回り検査の実装が在るか)であり、
critic に機械で裁かせてよい。残る 3 件は規範であり、`kind:conduct` にしなければ
§1 で名指した「永久に赤い帯」を私自身が三本太らせることになる。

---

## 4. verdict — 🔴 BLOCK(曲げなかった)

### 4.1 自分で駆動した数値(verify の判定は参照したが、数は自分で採った)

| 測点 | 打った命令 | 生の出力 |
|---|---|---|
| 自己試験 | `unset PARADISE_CREATIONS && node tests/paradise.test.js` | **449 passed, 0 failed** / exit 0 |
| ダッシュボード門 | `node tests/dashboard-run-panel.test.js` | **16 passed, 0 failed** / exit 0 |
| 数の真偽 | `node graph/census.js check` | `✓ every number the paradise claims about itself is true` / **exit 0** |
| 倉の分離 | `node graph/workspace.js check` | `✓ 創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし` / exit 0 |
| 条文索引 | `node graph/codex.js check` | `✓ 索引は本文と一致している (55 条)` / exit 0 |
| 見捨てられた走行 | `node graph/conclave.js audit` | `見捨てられた走行: 0 / 判定不能: 0 / 全 9` / exit 0 |
| **走行の秤(第38条)** | `node graph/gauge.js score reform/gauge-ledger-idempotent/conclave.json --json` | `{"score":0,"complete":false,"phasesDone":9/11,"domainsRatified":5/6,"firstPassRate":0.333,"reworkCount":3,"retryOverhead":15,"loopGuardTrips":0,"durationMs":52533612}` |
| **F-3 の実駆動**(未解決の軽微を自分で確かめた) | 仮倉に `ts:""` の毒行を置いて `foldLedger` + `ledger --audit` | `fp_equal=true / raw=2 folded=1 / kept={"ts":"",…,"note":"ATTACKER"}` — **掃除が正当な行を攻撃者の行で置換する**。ただし `audit` は `suspect=1` / `🔴 人が読むべき行が 1 件` / **exit 2** で鳴る |
| **F-5 の実測** | `grep -c PARADISE_CREATIONS tests/dashboard-*.test.js` | 両方 **0** — 2 門は仮倉を持たず実台帳を読んで裁く(security-3 の指摘は現在も真) |

### 4.2 判決

```
$ node graph/verdict.js judge <report.json>
═══════════ ⚖️  VERDICT ═══════════
🔴  BLOCK
Constitutional breach — cannot ship, escalate to human.

Breaches (BLOCK):
  🔴 spec not satisfied: AC-8a 実台帳が 6 行になっていない(本相実測 wc -l = 30);
     AC-8b 掃除の前後の指紋集合が一致することを実台帳で示せていない;
     AC-8d creations 側の掃除 PR が立っていない;
     AC-8c 検められない; NFR-3 score --json に指紋が無い
     — code must serve the spec

Defects (REWORK):
  ⚠️  trajectory score 0 below floor 60 — 荒れた走行は改善ではない (Art. 38)

Passed:
  ✓ build passes   ✓ lint clean   ✓ 449/449 tests pass   ✓ no security issues
═══════════════════════════════════
exit 2
```

### 4.3 なぜ緑に見せなかったか — 二つの誘惑を名指す

**誘惑 1: `spec.satisfied` を `true` にする。**
「未達 4 件は creations 側の別 PR の話であり、この枝の射程外だ」と書けば通った。
**しかし requirements.md §5「完了の定義」の 5 項・6 項は、実台帳が 6 行になることを完了条件に挙げている。**
射程外なのは**作業**であって**完了条件**ではない。
verify が正直に「改革全体はまだ閉じていない」と書いたものを、断罪機関が「閉じた」と書き換えるなら、
断罪機関は要らない。**BLOCK は正しい。**

**誘惑 2: `trajectory` を伏せるか、別の run を指す。**
第38条は `trajectory` を必須とし、`gauge.js score --json` の出力をそのまま入れよと定める。
そのまま入れた結果が **score 0** である。内訳を計算すると
`100 − 10×3(rework) − 5×15(retryOverhead) − 20(未完走) = −25 → 0`。
**この環が完走扱いになっても `100 − 30 − 75 = −5 → 0` で、点は動かない。**
支配項は `retryOverhead 15` —— **四度の差し戻しそのもの**である。

> **正直に留保する。** `complete:false`(phases 9/11・domains 5/6)は、
> **reflect / verdict がまさに今走っているから**である。この二相が done になれば 11/11 になる。
> つまり未完走の −20 は「今この瞬間の写真」であって欠陥ではない。
> **だが上に示したとおり、それを外しても score は 0 のままである。**
> ゆえにこの留保は判決を一ミリも動かさない。数値は曲げていない。

**§1 で名指した `lesson:gauge-trajectory-over-outcome` が、まさにここで発火している。**
449/449 の全緑と、score 0 の走行が、同じ環に同居している。
**成果物は治った。走行は荒れていた。** 第38条はこの二つを別々に裁けと言い、実際に別々に裁かれた。

---

## 5. 規律の証拠

```
実台帳(../paradise-creations/gauge-ledger.jsonl)
  387d9e0ea5a4fde30249897ebba3d53150e39a32cbf1e4299d922674bcb9982b   30 行   ← 本相の前後で不変
```

- 全ての計測は `unset PARADISE_CREATIONS` の上で行い、F-3 の実駆動だけ
  `PARADISE_CREATIONS=%LOCALAPPDATA%/Temp/trib-f3` の仮倉に振り替えた。
- **`../paradise-creations` には一切書いていない。** commit も PR も push もしていない。
- **main に commit していない**(枝は `fix/gauge-ledger-idempotent` のまま)。
- 道具(`f3.js` / `verdict-report.json` / `less.json`)は全て `%LOCALAPPDATA%/Temp` に置いた。
  **リポジトリ内に一つも残していない。**
- **`graph/` と `tests/` は一行も変更していない。**私は裁く側である。

---

## 6. 断罪機関から次の環への申し送り

1. **【最優先】FR-8 を閉じよ。** creations 側で 30 行 → 6 行の掃除コミットを立て、
   前後の指紋集合の一致を実測せよ。これが済むまで AC-8a/8b/8c/8d は測れない。
   **BLOCK はこれ一件で解ける。**
2. **critic の永久に赤い帯を直せ(新しい改革の候補)。**
   `applies:paradise-internal` かつ `kind:mechanism` の教訓 40 件超が、
   主題を問わず全ての楽園内部の改革で赤を出す。第28条が `conduct` に施した処置と
   同じ思想で、**主題(subject/topic)による絞り込み**が要る。
   永久に赤い門は無視され、無視される門は無い門より悪い。
3. **未解決の軽微 3 件を台帳に残す。** F-3(`ts:""` の keep-first 武器化 — 本相で再現。
   ただし audit が exit 2 で鳴る)、F-4(main 由来・射程外)、
   F-5(dashboard 系 2 門が実台帳を読む — grep 実測 0 件)。
   **いずれも隠していない。** F-5 は実台帳を 6 行に畳んだ瞬間に結論が変わりうるので、
   **申し送り 1 を実行する者は F-5 を同時に見よ。**
4. **設計相に三節を義務づけよ**(§2.1・教訓 `rework-four-times-is-a-design-debt`)。
   これが四度の差し戻しの根である。
5. **`node graph/lessons.js export --out graph/lessons.json` を走らせよ。**
   倉 76 件に対し KG は 82 件で、本相が刻んだ 4 件を含む 6 件が未反映である(§3.1)。
   **本相の critic 走行はこの 4 件を一度も見ていない** —— 新しい教訓が次の環で
   実際に発火することは、export を走らせるまで証明されない。

---

## 7. 私が測っていないこと(正直な限界)

1. **新しい欠陥を探していない。**本相の指示どおり reflect と verdict に絞った。
   F-3 の実駆動は「既知の指摘が今も真か」の再確認であって、新規探索ではない。
2. **変異を一つも打っていない。**故障注入は verify / prove が済ませており、
   本相は `graph/` を一行も触らないという規律を優先した。
   ゆえに「門が今も鳴るか」は**前相の報告を信じている** —— これは私の判定の弱い部分である。
   ただし門の**存在と全緑**は自分で走らせて確かめた(449/449)。
3. **critic の 46 赤を一件ずつ人手で検証していない。**内訳の分類は判定文の文面から数えた。
   「無関係」と断じた具体例(visual-identity / borrowed-not-altered / supply-not-stock)は
   本文を読んで確かめたが、46 件全部は読んでいない。
4. **12 時間の内訳(§2.4)は `conclave.json` の history の時刻差から導いた推計である。**
   各相の中で何に時間が溶けたかは走行帳に記録されていない。
