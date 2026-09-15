# reflect — reform 走行『route-misfire』

道: `reform` / 相: `reflect`(tribunal 領域の第一相)
前相: [`verify.md`](./verify.md) / [`review.md`](./review.md) / [`security-report.md`](./security-report.md) / [`docs.md`](./docs.md)
次相: [`verdict.md`](./verdict.md)

> **この相の務め**: 成果物を守ることではない。**自分たちを撃つ**ことである。
> 本書の全ての数と出力は、reflect 相が**自分の手で撃った生出力**である。
> 前相の報告を写経した数は一つも無い(第27条)。
> **撃てなかったものは「撃てなかった」と名乗る**(第37条)。

---

## 0. 結論(先に述べる)

この相は **critic が黙った盲点を 4 件**見つけた。うち **F-1 は本走行が main に対して作った回帰であり、
出荷を止めるに足る重さ**と裁いた。

| # | 重篤 | 名 | 本走行の産物か | 裁定 |
|---|---|---|---|---|
| **F-1** | **BLOCK 相当** | **強い名 21 語が、限定詞を伴わない世間の願いを reform へ攫う**(main では 0 件・HEAD で 21/21) | **本走行が作った回帰** | **verdict で BLOCK の根拠とする** |
| **F-2** | HIGH | `denude` が判定の材料を消す自傷 —— `forge.js の道選びを直せ` が standard へ落ちる | main から在る(本走行の産物ではない) | 申し送り |
| **F-3** | MED | AC-34「網羅の門」が **4 文字未満を黙って除外**し、`kg` が表に無いまま緑 | main から在る | 申し送り |
| **F-4** | MED | AC-31 のコーパス 24 件に**強い名が一件も無い**(29 件抽出中 STRONG=0)。F-1 が門をすり抜けた構造的理由 | **本走行の産物** | F-1 と同時に直す |

**「門が無い」7 件の裁定**: AC-30 を含む 7 件は**次の走行へ送る**。
理由は §4 に述べる —— ただし F-1 が在る以上、SHIP の可否はそもそも 7 件の話ではない。

---

## 1. critic.js の生出力(全文)

```
$ node graph/critic.js review reform/route-misfire --lessons graph/lessons.json --self
═══════ 🔍 ADVERSARIAL SELF-CRITIQUE ═══════
target: reform/route-misfire
lessons: 85 件で裁いた  ← graph/lessons.json
  ✓ [smell] no-hardcoded-assumptions: no code to inspect
  ✓ [gap] no-secrets: no secrets detected
  ✓ [gap] exemption-claim-verified: 免除を適用した (engine): 申告=--self / 楽園の倉の中: reform\route-misfire
  ✓ [gap] no-wall-clock-iso: engine code is exempt (creations-only law)
  ✓ [gap] no-external-deps: engine code is exempt (creations-only law)
  ✓ [smell] domain-markers-present: engine code is exempt (creations-only law)
  🔴 [gap] lesson:require-discovery: LESSON REGRESSION — past miss recurs: "findings" not addressed
  🔴 [gap] lesson:orchestration-in-prompt: LESSON REGRESSION — "orchestrator" not addressed
  🔴 [gap] lesson:lesson-scope: LESSON REGRESSION — "applies" not addressed
  🔴 [gap] lesson:kg-forget: LESSON REGRESSION — "forget" not addressed
  🔴 [gap] lesson:critic-synonym: LESSON REGRESSION — "musthaves" not addressed
  🔴 [gap] lesson:model-by-rank: LESSON REGRESSION — "model" not addressed
  … (計 38 件の 🔴)
───────────────────────────────────────────
VERDICT: 38 GAP(S) — the creation is incomplete. REWORK.
═══════════════════════════════════════════
CRITIC_EXIT=1
```

### 1.1 critic の 38 件をどう読んだか —— **偽の赤である**

38 件すべてが `lesson:<id>: LESSON REGRESSION — past miss recurs: "<語>" not addressed` の形である。
実装は**成果物の散文に語が現れるか**で裁いている。ゆえに:

* `lesson:kg-forget` は `"forget"` という語が `reform/route-misfire/*.md` に無いから赤い。
  本走行は KG の忘却機構に一指も触れていない。**触れていないものを「後退した」と呼ぶのは誤りである。**
* `lesson:model-by-rank` は `"model"`、`lesson:orchestration-in-prompt` は `"orchestrator"` —— 同じ形。
* 緑の側も同じ理由で空虚である。`lesson:plan-before-build` は `"synod"` の語が
  discovery に一度現れるだけで緑になっている。**偶然の出現が判定している。**

これは `reform/gate-filter` の reflect が **F-4** として既に名指した穴と同じものである
(「critic.js は reform/* に scope 主語が無いため教訓がほぼ全て素通りする」)。
**本走行の産物ではなく、reform という道そのものの穴である。**

> ⚠️ **だが critic の緑を安心の根拠にしてはならない**、というのが本相の主たる教訓である。
> critic は 38 件の偽の赤を鳴らしながら、**本当に在る回帰(F-1)を一件も指していない**。
> 赤の量と赤の質は別物である。**critic の出力を読む時間の全ては、F-1 を見つける役に立たなかった。**

---

## 2. critic が黙った盲点 —— **自分の頭で撃った**

critic を信じず、`chooseScale` を**自分で作った探針**で撃った。
探針は 42 件を三群に割る: A群=楽園の改修(reform が正解)/ B群=世間の創造・**強い名**を含む /
C群=世間の創造・**弱い名**を含む。**main と HEAD の両方**で同じ探針を撃った(第38条)。

### 2.1 F-1 —— **強い名が世間の願いを攫う(本走行が作った回帰)** 🔴

```
############ MAIN (c216014) ############
A群 楽園の改修(reform が正解): 誤着 6/10
B群 世間の創造・強い名(reform は誤り): 誤着 0/21
C群 世間の創造・弱い名(reform は誤り): 誤着 0/11
TOTAL_NG=6/42

############ HEAD (reform/route-misfire e60677b) ############
A群 楽園の改修(reform が正解): 誤着 0/10
B群 世間の創造・強い名(reform は誤り): 誤着 21/21
C群 世間の創造・弱い名(reform は誤り): 誤着 0/11
TOTAL_NG=21/42
```

**B群 21 件の生出力(全件 reform へ攫われた)**:

```
誤 synod 会議の日程調整アプリを作れ            -> reform
誤 社内の verdict 管理ツールを作れ              -> reform
誤 gauge 圧力計のIoTダッシュボード              -> reform
誤 critic レビューサイトを作りたい              -> reform
誤 conclave という会議室予約アプリが欲しい      -> reform
誤 forge 鍛冶屋の在庫管理アプリを作って         -> reform
誤 codex という名の写本閲覧サイト               -> reform
誤 clergy 聖職者名簿アプリ                      -> reform
誤 ordain 式典の招待状ジェネレータ              -> reform
誤 hermetic 密閉容器の通販サイト                -> reform
誤 abode 不動産検索サイトを作れ                 -> reform
誤 orchestrator 楽団の演奏会管理アプリ          -> reform
誤 forge inventory management app for blacksmiths -> reform
誤 gauge calibration tracker                    -> reform
誤 critic review aggregator site                -> reform
誤 abode rental listings platform               -> reform
誤 clergy directory for parishes                -> reform
誤 ordain ceremony planner                      -> reform
誤 hermetic seal QA tracker                     -> reform
誤 orchestrator concert scheduling tool         -> reform
誤 codex manuscript viewer                      -> reform
```

**同じ 21 件を main で撃つと 0 件が reform である。** ゆえに**これは本走行が作った回帰**である。

**機序**: `REFORM_RE` は強い名を `DETERMINER_LOOKBEHIND + \b(?:ENGINE_NAMES_STRONG)\b` で流し込み、
`isReformSubject` は `if (REFORM_RE.test(d)) return true;` で**無条件に真**を返す(`graph/forge.js`)。
すなわち **強い名 26 語は「限定詞の直後でない」だけで reform を名乗る**。
弱い名に課した二条件のうち **`BUILD_RE` の伴需が強い名には課されていない**。

* `a gauge dashboard` → 冠詞が在るので除外され `full`(**守られている**)
* `gauge calibration tracker` → 冠詞が無いので **reform**(**素通り**)
* `gauge 圧力計のIoTダッシュボード` → **日本語には冠詞が無い。限定詞の除外は原理的に効かない** → **reform**

**日本語の願いに対しては、強い名の防壁が一枚も無い。** 13/13 が攫われた(§2.1 の B群前半)。

> **これは欠陥C とまったく同じ病である。** requirements §3.6 は
> 「**誤着を直して別の誤着を生む**」ことを名指しで禁じ、build 相はそれで差し戻された。
> 本走行は**弱い名についてのみ**その禁を守り、**強い名については同じ穴を開けたまま出荷しようとしている**。
> `forge.js` のコメント自身が「実測が覆した —— 強い名も普通名詞として使われうる」と認めながら、
> 手当ては**限定詞の除外一枚だけ**であり、それは英語にしか効かない。

**なぜ AC-31 の門が鳴らなかったか(F-4)**: 門のコーパスを抽出して数えた。

```
$ (AC-31 節から [wish, name] の対を抽出)
抽出件数= 29
--- コーパス中の強い名 = 0 / 29 ---
```

**24 件(抽出では 29 件)のコーパスに強い名が一件も無い。** 全て弱い名で作られている。
ゆえに強い名の側がどれだけ攫っても `counsel.test.js` は緑のままである。
**門は、それが守るはずの面の半分を一度も撃っていない。**

### 2.2 F-2 —— `denude` が判定の材料そのものを消す(自傷)

FR-02 は「`名前.js` のファイル名を剥いでから判定せよ」と命じる。だが剥いだ結果、
**engine の名そのものが消え、楽園を名指す手がかりが失われる**:

```
"forge.js の道選びを直せ"      -> standard     denude="の道選びを直せ"
"forge の道選びを直せ"         -> reform       denude="forge の道選びを直せ"
"verdict.js の判定を直せ"      -> standard     denude="の判定を直せ"
"verdict の判定を直せ"         -> reform       denude="verdict の判定を直せ"
"kg.js のバグを修正せよ"       -> quick        denude="のバグを修正せよ"
"graph/kg.js のバグを修正せよ" -> cartography  denude="graph/ のバグを修正せよ"
"census.js を修正する"         -> quick        denude="を修正する"
```

**`.js` を書いた方が道を失う。** 神が `forge.js を直せ` と最も自然に書く形が、
まさに reform を外す形である。本走行が直した欠陥A(engine 改修が counsel/standard へ攫われる)の
**生き残りである** —— 走行はこの経路を一度も撃っていない。

**main でも同じ**(`forge.js の道選びを直せ` → standard)。ゆえに**本走行の産物ではない**が、
**本走行の主題そのもの**であり、見逃したことは神官の落ち度である。

加えて `graph/` の接頭辞が残ると `cartography`(図の道)へ攫われる:

```
"graph/ を直せ"                -> cartography
"graph/workspace.js を改修する" -> cartography
```

### 2.3 F-3 —— 網羅の門が 4 文字未満を黙って除外する

AC-34 は「`graph/*.js` の名が強い名か弱い名のどちらかに載っている」を撃つと称する。実測:

```
graph/*.js の実数 = 39
表に無い engine 名: ["kg"]
  kg を直せ -> standard      ← reform ではない
```

門の実装は `.filter(n => n.length >= 4 && /^[a-z][a-z-]*$/.test(n))` で **`kg` を黙って落としている**。
ゆえに `kg` が表に無いまま門は永久に緑である。
**「網羅している」という主張と、門が測っている対象がずれている**(第16条)。
`kg.js` は KG の本体であり、その改修の願いが reform へ着かないのは欠陥Aの生き残りである。

### 2.4 F-4 —— 門のコーパスが守る面の半分を撃っていない

§2.1 に述べた。AC-31/32/33 の全てのコーパスが**弱い名だけ**で作られている。
故障注入(AC-35)の三つの変異も**全て弱い名側の機構**を狙っている
((a) 弱い名を強い名の表に戻す /(b) 限定詞の除外を消す /(c) `BUILD_RE` の伴需を消す)。
**強い名の枝(`REFORM_RE` の `return true`)を壊す変異が一つも無い。**
ゆえに AC-35 が「三つとも赤くなった」と報告しても、**F-1 の面については何も証明していない**。

> これは `mutation-author-is-blind-to-own-net`(既存の教訓)の三度目の再演である。
> 変異を設計した者と門を設計した者が同じなら、変異は門の想像の外を撃たない。

---

## 3. 問われた三つの問い

### 3.1 この走行は何回「直して別の誤着を生んだ」か

**実測で 5 回である**(本相の F-1 を含む)。

| # | 修理 | それが生んだ欠陥 | 発見者 |
|---|---|---|---|
| 1 | 欠陥A(engine 改修が counsel/standard へ攫われる)を直した | **欠陥C** —— 世間の願いが reform へ拉い去られる(逆向きの誤着) | **教主** |
| 2 | 欠陥B(env 残留で偽の赤)を直した | **HIGH-1** —— `isCreationsVault` が倉の子を倉と名乗り毒を見逃し**緑を騙った** | security 相 |
| 3 | FR-02 の `denude`(ファイル名剥ぎ) | **S-1** —— O(n²) ReDoS | security 相 |
| 4 | 欠陥B の修理が `workspace.js check` の経路を増やした | **V-1** —— 壊れた走行帳一つで check が uncaught TypeError で死に、**engine を守る三つの検めが全て沈黙した** | verify 相 |
| 5 | 欠陥C(弱い名の誤着)を直した | **F-1** —— **強い名 21 語が世間の願いを攫う**(本相で発見) | **reflect 相(本書)** |

**修理 5 件中 5 件が新しい欠陥を生んだ。率は 100% である。**

#### 両論

**(甲)これは走行の罪である。**
1. **同じ病が四度反復している。** 1・5 はどちらも「名の表を判定に流し込んだら逆向きに誤った」であり、
   **5 は 1 の教訓を一語も学んでいない**。requirements §3.6 が名指しで禁じた病を、
   同じ走行が**同じ相の同じ関数で**繰り返した。
2. **設計が「この修理が新しく開く面」を一節も持たなかった。** 既存の教訓
   `rework-four-times-is-a-design-debt` が「design.md は(1)新しく可能にすること(2)網を誰が撃つか
   (3)自作の変異では届かない層 を書け」と命じている。design.md 400 行にその節は無い。
   **教訓は在ったのに読まれなかった。**
3. **対称性の検査を一度もしていない。** 弱い名に二条件を課すと決めた瞬間、
   「では強い名には何を課すのか」は**設計上必ず問われるべき問い**だった。
   `fix-all-siblings-of-the-same-flaw` の教訓がまさにこれを命じている。
   同じ関数の中で片側だけ直した —— 教訓が名指しした構造そのものである。

**(乙)これは撃ち方が良かった証である。**
1. **5 件すべてが出荷前に捕まった。** どれも main へ入っていない。
   門が黙っていれば、これらは「無い」のではなく「見えない」まま出荷されていた。
2. **発見の相が後段へ移動している。** 1 は教主、2・3 は security、4 は verify、5 は reflect ——
   **最後の相まで新しい欠陥が出続けたことは、最後の相まで撃ち続けた証**でもある。
   reflect が何も見つけない走行の方が、はるかに疑わしい。
3. **走行の点数は落ちていない**(`gauge` score 70、rework 1 回、loop-guard 0)。
   構造的な暴走は起きていない。

**本相の裁定 —— 甲が重い。**
乙の 1・2 は正しいが、**F-1 は reflect が偶然見つけたのであって、門が捕らえたのではない**。
AC-31 の 24 件も、AC-35 の三変異も、`counsel.test.js` 134 件も、`paradise.test.js` 471 件も、
**F-1 の前を素通りして全て緑だった**。すなわち **F-1 が捕まったのは機構の手柄ではない**。
もし reflect が探針を自作しなければ、**21 件の誤着が main へ入っていた**。
「撃ち方が良かった」と言えるのは**門が捕らえたとき**だけである。

### 3.2 教主が見つけた欠陥を、なぜ神官が見逃したか

教主が独りで見つけたもの: **欠陥C**(逆向きの誤着)/ **main-clone の偽の赤**(git を持たない複製)。
本相が見つけた **F-1** も同じ形である。神官の撃ち方に名指しできる欠落が三つある。

**(a) 神官は「直した面」だけを撃ち、「直した結果どう変わったか」を撃たない。**
build 相は「engine 改修が reform に着くか」を撃った。**逆向き(世間の願いが reform に着かないか)を撃たなかった。**
rework 相は逆向きを撃つ門を建てた。だが**そのコーパスを弱い名だけで作り、強い名の側を撃たなかった**。
共通するのは **「自分が触った規則」を撃って「規則が支配する全体」を撃たない**ことである。
教主は規則を知らずに願いを投げるので、**触った面の外に落ちる**。

**(b) 神官は main と較べない。** 本相が F-1 を確信できたのは、
**同じ探針を main と HEAD の両方で撃った**からである。
HEAD だけを見れば `gauge calibration tracker -> reform` は「そういう仕様かもしれない」で流せる。
main で 0/21 と出て初めて**回帰**と断定できる。
verify 相は main-clone を作ったが、**用途は `paradise.test.js` の本数比較(469→471)だけ**であり、
**道選びの振る舞いを main と較べていない**。第38条の前後比較を**成果物の数にしか使わなかった**。

**(c) 神官は自分が書いたコーパスの外へ出ない。**
AC-31 の 24 件は rework 相の神官が「自ら考えた 14 件」を含む。
だが**同じ人が同じ理解で作った 24 件**は、その理解の外を撃たない。
本相の探針が 21 件を捕らえたのは、**「表の二分割」という設計を知った上で、
分割の反対側を狙って作った**からである。
教主が捕らえるのは、**教主が実装を知らないので実装の想像の外から撃つ**からである。

> **名指し**: 欠落は「網羅性の欠如」ではなく **「対称性の検査の不在」**である。
> 判定規則が A と B の二枝を持つとき、A について証明したことは B について何も語らない。
> 本走行は三度この形で裏切られた(欠陥C・F-1・AC-34 の 4 文字除外)。

### 3.3 「門が無い」7 件を放置して SHIP と言えるか

**F-1 が在る以上、この問いは SHIP の可否を決めない**(BLOCK の理由は F-1 である)。
だが問い自体には答える。**7 件を放置しても、それだけでは SHIP を妨げない。** 理由:

* 7 件は**どれも今この瞬間は緑**であり、**未達の AC は 0 件**である。
* 「門が無い」は**将来の回帰を捕らえられない**という債務であって、**今の欠陥ではない**。
  verdict.js が BLOCK/REWORK を出す根拠(security issue / spec unsatisfied / test failure)に当たらない。
* 門を立てる仕事は AC の外である(verify 相の W-9 の判断は正しい)。

**ただし F-1 は、この判断が危ういことを示している。** AC-30 に門が無いこと自体より、
**AC-31 に門が在るのに面の半分しか撃っていなかったこと**の方が重かった。
**「門が無い」より「門が在ると思っていたら守っていなかった」の方が危険である。**

---

## 4. AC-30 の裁定 —— **別の走行へ送る**

**裁定: 今は直さない。次の走行へ送る。**

**理由(送る側)**:

1. **本相は裁く相であり、建てる相ではない。** reflect で門を建てれば、
   その門は**誰にも review されず・誰にも verify されず**に出荷される。
   本走行が五度「修理が新しい欠陥を生む」を実演した直後に、
   **無審査の修理を足すのは最も危険な選択**である(§3.1 の実測がそれを言っている)。
2. **F-1 により本走行は BLOCK である。** BLOCK の走行に新しい門を足しても出荷されない。
   **直すべきは F-1 であって AC-30 ではない。** 順序を誤れば、
   「門を足したから SHIP だ」という数の曲げ(第57条違反)に最も近い場所に立つ。
3. **AC-30 の穴は「今の欠陥」ではない。** `forge.js` の CLI と `module.exports` は
   **今この瞬間は割れていない**(verify 相が `AC-30 → reform` を実測している)。
   守る門が無いのは回帰の債務であり、**回帰は未来に属する**。

**ただし「重い」という verify 相の裁きは支持する。**
本走行は `forge.js` を大きく書き換えた(`ENGINE_NAMES` の二分割・限定詞の表・`denude`・`isReformSubject`)。
**書き換えた当の器の CLI を撃つ門が一本も無い**のは、確かに不均衡である。実測で裏付けた:

```
$ grep -rn "execFileSync\|spawnSync" tests/*.test.js | grep -i forge
tests/paradise.test.js:8551:  execFileSync(process.execPath, [path.join(DIR,'..','graph','forge.js'), 'plan', wish, '--scale','full'], …)
```

`plan` 口が一箇所だけ。**`scale` 口を子プロセスで撃つ門は 0 本**である。

**送り先の走行への申し送り(F-1 と束ねて一つの走行にせよ)**:

1. **F-1 を直す** —— 強い名にも「楽園を名指す文脈」の伴需を課す。
   ただし `conclave の毒を除く`(限定詞なし・BUILD_RE なし)は今まで通り reform でなければならない。
   **単純に `BUILD_RE` を課すと A群が壊れる** —— 本相は候補の実装を試したが、
   **A群を壊さずに B群を守る形を確定できなかった**ため、**実装は次の走行に委ねる**(§6 W-3)。
2. **AC-31 のコーパスに強い名を入れる** —— 本相の B群 21 件をそのまま門の材料にできる。
3. **AC-35 の変異に「強い名の枝を壊す」を足す** —— 今の三変異は全て弱い名側である。
4. **AC-30 の門を立てる** —— `forge.js` の `scale` 口を子プロセスで起動し、
   `chooseScale()` の返り値と `console.log` の出力の一致を撃つ。
5. **F-2(`denude` の自傷)と F-3(4 文字未満の除外)** —— どちらも欠陥Aの生き残りである。

---

## 5. 刻んだ教訓(`kg.js remember lesson`)

生出力は §7 に在る。scope は**誤発火を避けるため慎重に選んだ** ——
どれも道選び/門の設計という**楽園内部の話**であり、創造物には効いてはならない。

| id | 教訓 | applies |
|---|---|---|
| `both-branches-of-a-rule` | 判定規則が二枝を持つなら、片枝の証明は他枝について何も語らない。片側を直したら**必ず反対側を同じ探針で撃つ** | `forge` |
| `regression-needs-both-heads` | 「回帰か否か」は HEAD だけでは判じられない。**同じ探針を main と HEAD の両方で撃って**初めて本走行の産物と断定できる(第38条は成果物の数だけでなく**振る舞い**にも課す) | `reform` |
| `corpus-blind-to-its-own-half` | 門のコーパスが守るべき面の半分しか含まないとき、門は永久に緑のまま面の半分を素通しする。**コーパスは規則の枝ごとに数えて示せ** | `gate` |
| `filter-in-a-gate-is-a-silent-exemption` | 網羅を主張する門の中の `filter` は**沈黙の免除**である。`n.length >= 4` の一語で `kg` が表から消え、門は永久に緑だった | `gate` |

---

## 6. **自分が見ていない項目**(名乗り)

「撃っていないので安全」とは書かない。以下は**本相で一度も撃っていない**。

| # | 面 | なぜ撃たなかったか / 残る疑い |
|---|---|---|
| W-1 | **F-1 の修理案が A群を壊さないか** | 候補を scratch で試したが**確定できなかった**。`BUILD_RE` を強い名に課すと `conclave の毒を除く` 系が落ちる恐れがある。**修理は次の走行の仕事であり、本相は欠陥の存在だけを証明した** |
| W-2 | **F-1 が実際に神の願いで踏まれる頻度** | 「`gauge calibration tracker` と神が言うか」は測っていない。**誤着の存在は証明したが、到達可能性は測っていない**(欠陥C も同じ性質で差し戻された前例が在る) |
| W-3 | **強い名 26 語のうち B群で撃ったのは 12 語** | `apply-guards` `branch-guard` `build-identity-catalog` `check-agents` `daily-guard` `export-state` `graph-engine` `spawn-trace` `visual-verify` 等は**一度も撃っていない**。誤着の件数は 21 件より**増える可能性がある** |
| W-4 | **`cartography` への誤着の全体像** | `graph/` 接頭辞が図の道へ攫うことは見たが、**何語がそうなるかは数えていない** |
| W-5 | **実 GitHub Actions 上の挙動** | 掟により push しない。verify の W-1 を引き継ぐ |
| W-6 | **Windows 以外の機械** | 本機は Windows/MSYS のみ。verify の W-2 を引き継ぐ |
| W-7 | **critic の 38 件を一件ずつ実物照合していない** | 形(`"<語>" not addressed`)が全件同型であることと、代表 3 件(`kg-forget`/`model-by-rank`/`orchestration-in-prompt`)の実物確認で「偽の赤」と断じた。**残り 35 件を一件ずつは読んでいない** |
| W-8 | **`forge.js` の `plan` / `admit` 口** | `chooseScale` を直に呼んだ。CLI の口と割れていないかは verify の W-6 を引き継ぐ |
| W-9 | **F-2 / F-3 が main から在ることの網羅確認** | 代表例(`forge.js の道選びを直せ` / `kg`)を main で撃って確かめた。**全件は較べていない** |

---

## 7. 完了の定義 —— 生出力

### 7.1 `critic.js review` の生出力
§1 に全文。`CRITIC_EXIT=1` / 38 GAP。**§1.1 で偽の赤と裁いた根拠を述べた。**

### 7.2 critic が黙った盲点
§2 に 4 件(F-1 🔴 / F-2 / F-3 / F-4)。**critic はこの 4 件を一件も指していない。**

### 7.3 `counsel.test.js` / `abandoned-run.test.js`

```
$ node tests/counsel.test.js
Counsel self-test: 134 passed, 0 failed
COUNSEL_EXIT=0

$ node tests/abandoned-run.test.js
abandoned-run: 33 passed, 0 failed
ABANDONED_EXIT=0
```

### 7.4 `paradise.test.js` 全走(background)

```
Paradise self-test: 471 passed, 0 failed
PARADISE_EXIT=0
✓行=584  ✗行=0
```

### 7.5 `census.js check`(background)

```
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
CENSUS_EXIT=0
```

### 7.6 その他の門(本相が自分で撃った)

```
$ node graph/codex.js check      → ✓ 索引は本文と一致している (60 条)   EXIT=0
$ node graph/wiring.js check     → ✓ 門 19 本すべてに走らせる者が居る    EXIT=0
$ node graph/workspace.js check  → ✓ 混入なし・直書きなし・流出なし      EXIT=0
$ node graph/derived.js check    → no test depends on derived content   EXIT=0
$ node graph/gauge.js score reform/route-misfire/conclave.json --json
  {"score":70,"complete":false,"phasesTotal":11,"phasesDone":9,"domainsTotal":6,
   "domainsRatified":5,"firstPassRate":1,"reworkCount":1,"retryOverhead":0,
   "loopGuardTrips":0,"durationMs":179276658,…}
```

---

## 8. 本相の裁き —— verdict 相への送り

**全ての門が緑である。そして本走行は出荷してはならない。**

471 passed 0 failed / 134 passed 0 failed / 33 passed 0 failed / census ✓ / codex ✓ / wiring ✓ ——
**これら全てが緑のまま、21 件の誤着が HEAD に在る。**
main では 0 件である。**本走行が作った。**

これは第57条(修理は掟を広げてはならない)と同じ構造である ——
**正しい動機から生まれた修理が、直した門より広い門を開いた。**
弱い名の誤着を塞ぐために建てた `isReformSubject` が、
**強い名 26 語を無条件で reform に通す口**をそのまま残した。

verdict 相は `spec.satisfied = false` を宣言し、**BLOCK** を受け取るべきである。
**SHIP を出すために F-1 を「別走行の申し送り」に書き換えてはならない** ——
それは第57条違反であり、教主は必ず撃ち直す。
