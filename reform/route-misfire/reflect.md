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

---
---

# §二度目 — 撤去後の姿を擃つ

一度目の reflect は `ENGINE_NAMES_STRONG` が世間の願い 21/21 を攫う **F-1** を実測で掴み、
verdict は **BLOCK** を出した。それが build の**四度の差し戻し**を生み、最後は
教主の裁定で **`ENGINE_NAMES` を丸ごと撤去**して次の走行へ申し送った。

**§二度目はその後の姿を裁く。** 一度目の数は一つも引き写していない。
`chooseScale` を直に呼ぶ探針を自分で書き、`git clone --branch main` した
複製(`c216014`)と本枝(`6ac36ca`)の**両方で撃った**。

---

## 1. critic.js の生出力 — 37 GAP、そして critic が黙ったもの

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
  🔴 [gap] lesson:orchestration-in-prompt: … "orchestrator" not addressed
  🔴 [gap] lesson:lesson-scope: … "applies" not addressed
  🔴 [gap] lesson:kg-forget: … "forget" not addressed
  🔴 [gap] lesson:critic-synonym: … "musthaves" not addressed
  🔴 [gap] lesson:model-by-rank: … "model" not addressed
  🔴 [gap] lesson:contract-failclosed / lesson-scope-strict / self-scope-subject / cross-domain-rework
  🔴 [gap] lesson:surface-judged-as-strictly / borrowed-not-altered / paradise-independence
  🔴 [gap] lesson:art24-branch-guard / art25-real-hierarchy / art26-parallel-by-nature / art27-spawn-trace
  🔴 [gap] lesson:art28-conduct-not-grepped / pontiff-seat-ungoverned / subagent-defied-scope
  🔴 [gap] lesson:gate-asserts-invariant-not-symptom / every-wish-is-not-build
  🔴 [gap] lesson:absence-is-not-passage / comment-claims-what-code-does-not / claude-md-diet-40
  🔴 [gap] lesson:daily-window-debt / dead-tools-teach / art45-dispatcher-not-runner
  🔴 [gap] lesson:dispatch-target-drift / motion-must-be-declared / upstream-defaults-from-canon
  🔴 [gap] lesson:two-causes-one-symptom / runner-death-not-ring-death / death-can-arrive-async
  🔴 [gap] lesson:borrowed-ctor-leaks / epoch-marker-needs-a-timestamp / selection-must-run
  ✓ [gap] lesson:repair-opens-a-new-surface: CONDUCT — 実行時に守るべき掟(コードでは検証できない)
  ✓ [gap] lesson:rework-four-times-is-a-design-debt: CONDUCT — 実行時に守るべき掟
  ✓ [gap] lesson:mutation-author-is-blind-to-own-net: CONDUCT — 実行時に守るべき掟
  ✓ [gap] lesson:warden-outside-selection / artifact-name-is-machine-contract: lesson satisfied
───────────────────────────────────────────
VERDICT: 37 GAP(S) — the creation is incomplete. REWORK.
═══════════════════════════════════════════
CRITIC_EXIT=1
```

(全 97 行の生出力は tribunal が読んだ。上は赤 37 件を漏れなく名指しで畳んだもの。)

### 1.1 37 件の読み方 — 一度目と同じく**全件が「語の出現で裁く偽の赤」**

critic の教訓判定は `applies:` の scope に当たった教訓について、
**その教訓の check 語が成果物の文中に現れるか**で裁く。
ゆえに `lesson:model-by-rank` は「`model` という語が reflect/verify に無い」
というだけで赤くなる。本走行はモデル方針を一行も触っていないのだから、
**無いのが正しい。** 37 件はいずれもこの形である。

**ただし §二度目は一度目と違い、これを「無害」とは言わない。**
critic は 85 件の教訓を読みながら、**本走行が今まさに犯している回帰を一件も指せなかった**。
下の 2 章で述べる **R-1(15 件 / 格子では 120 件の回帰)** は、critic の 97 行のどこにも現れない。
`lesson:repair-opens-a-new-surface`(修理は次の攻撃面を開く)は `✓ CONDUCT` として
**提示されただけ**で、その教訓が名指す当の面は誰も撃たなかった。

> **critic は「教訓が書かれているか」を見て、「教訓が守られているか」を見ていない。**
> これは第28条が `kind:conduct` で半分だけ認めた病の、残り半分である。

---

## 2. 🔴 R-1 —— critic が黙った盲点(最も重い)

### 2.1 発見

**自分の探針で、main には無い 15 件の誤着を HEAD に見つけた。**

```
$ node probe-net.js
═══ 収支の帳尻 — MAIN(c216014) vs HEAD(6ac36ca) ═══

群                                                    n   MAIN誤  HEAD誤  治癒  回帰
────────────────────────────────────────────────────────────────────────────────────────
A 楽園の改修・命令形 (正解 reform)                              18      5       0     5     0
B 世間の創造・engine 固有名 (reform は誤り)                      20      0       0     0     0
C 世間の創造・世間語 (reform は誤り)                             12      0       0     0     0
D 諐問・純粋な問い (正解 counsel)                              10      0       0     0     0
R-1 熟議 — 「作るべきか」と問う願い (正解 counsel)                   22      1      16     0    15
────────────────────────────────────────────────────────────────────────────────────────
合計                                                   82      6      16     5    15

総誤着:  MAIN 6/82  →  HEAD 16/82
治癒 5 件 / 回帰 15 件  →  差引 -10
```

**格子で当てると規模が見える**(主語 3 × 建造動詞 10 × 熟議標識 5 = 150 通り、
すべて「作れ」ではなく「**作るべきか**」と問うている):

```
$ node probe-grid.js
═══ R-1 格子 — 熟議 × 建造動詞 (正解は全て counsel) ═══
  組合せ数 n = 150  (主語 3 × 動詞 10 × 熟議標識 5)
  MAIN 誤り = 0/150  (0.0%)
  HEAD 誤り = 120/150  (80.0%)
  本走行が壊した = 120/150

  --- 代表 ---
   ✗ CI に段を設けるべきか検討せよ      MAIN=counsel → HEAD=standard
   ✗ CI に段を足すのは妥当か            MAIN=counsel → HEAD=standard
   ✗ CI に段を加えるべきではないか      MAIN=counsel → HEAD=standard

═══ 対照 — 同じ語で命令形 (counsel であってはならない) ═══
  n = 30   MAIN 誤り = 0/30   HEAD 誤り = 0/30
```

**main 0/150 → HEAD 120/150。** 対照群(命令形)は両方 0/30 で、
**熟議形だけが落ちている。** これは偶然の揺れではない。

### 2.2 機序 — 一段ずつ剥いで確かめた

```
$ node probe-mech.js
願い: kg に忘れる口を設けるべきか検討して

MAIN isCounsel = true   scale = counsel
HEAD isCounsel = false   scale = standard

--- 一段ずつ ---
denude        = "kg に忘れる口を設けるべきか検討して"
COUNSEL_RE    HEAD=true  MAIN=true
CREATE_RE     HEAD=true  MAIN=false   ← ここが割れる
  BUILD_RE    HEAD=true   (main に BUILD_RE は無い)
wantsProduct  HEAD=true   (「口」が産物と読まれる)
DOC_RE        HEAD=false  MAIN=false

--- 熟議語は DOC_RE に在るか ---
  べきか      COUNSEL_RE=true  DOC_RE=false
  検討        COUNSEL_RE=true  DOC_RE=false
  妥当か      COUNSEL_RE=true  DOC_RE=false
  どう思う     COUNSEL_RE=true  DOC_RE=false
  どうすべき    COUNSEL_RE=true  DOC_RE=false
  はないか     COUNSEL_RE=true  DOC_RE=false
  見直        COUNSEL_RE=true  DOC_RE=false
```

**因果は一本道である:**

1. 本走行は **欠陥A**(engine 改修の願いが counsel へ攫われる)を直すため
   `CREATE_RE` に **`BUILD_JA`(設ける|足す|加える|追加|新設|導入|搭載|持たせ|拡張|付ける)** を足した。
2. その結果、`isCounsel` の 2 段目 `if (!CREATE_RE.test(w) && !wantsProduct(w)) return true;`
   が **「〜を設けるべきか検討して」でも偽**になる —— 建造動詞が在るので「物を求めている」と読まれる。
3. 3 段目の打ち消しは `DOC_STRONG_RE` / `DOC_RE` だけである。だが
   **熟議の標識(べきか/検討/妥当か/どう思う/どうすべき/はないか/見直)は
   `COUNSEL_JA` にしか居らず、`DOC_RE` に一語も無い。**
4. ゆえに打ち消しが効かず、`isCounsel` は偽を返し、願いは reform/standard へ落ちる。

**main では `CREATE_RE` に `BUILD_JA` が無いので、この経路自体が存在しなかった。**
**これは本走行が作った回帰である。**

### 2.3 なぜ誰も見なかったか — **これが本当の教訓である**

本走行は「**道選び**」を 7 度直し、その度に「**reform へ攫われるか**」を撃った。
一度目の reflect の A群/B群/C群 も、二周目〜四周目の quality も、
**全て `reform` 軸の探針である。**

**`counsel` 軸は一度も撃たれていない。**

- `tests/counsel.test.js` で `べきか` を含む行は **5 行**(実測 `grep -c`)、
  しかもうち 4 行は紛れ語(相場/入口/窓口)の門であって、
  **建造動詞と熟議標識が同居する形は 0 件**。
- 走行の全記録で熟議形を語る行は **0 件**
  (`grep -rn "べきか検討\|熟議" reform/route-misfire/*.md` → 一致なし)。

> **欠陥Aの修理は `CREATE_RE` を広げた。広げた側の面を、誰も一度も測らなかった。**
> 7 度の修理はすべて `isReformSubject` の側に向き、
> `isCounsel` の側は「治した」と宣言されたきり二度と撃たれなかった。

これは `lesson:repair-opens-a-new-surface` が名指しで警告していた病であり、
critic はその教訓を `✓ CONDUCT` として**提示した**が、
**提示は測定ではない。**

---

## 3. 「修理が新しい欠陥を生む」7 度 —— 失敗か、正しい学習か。両論を数で

### 3.1 事実の台帳(実測で数えた)

| # | 修理 | 生んだ欠陥 | 見つけた者 | 出荷前に治ったか |
|---|---|---|---|---|
| 1 | 欠陥A(engine 改修が counsel へ) | **欠陥C** — 世間の願いが reform へ | 教主 | ✅ |
| 2 | 欠陥B(env 残留で偽の赤) | **HIGH-1** — 倉の子を倉と名乗り緑を騙る | security 相 | ✅ |
| 3 | FR-02 `denude` | **S-1** — O(n²) ReDoS | security 相 | ✅ |
| 4 | 欠陥B の修理が経路を増やした | **V-1** — 壊れた走行帳一つで check が死ぬ | verify 相 | ✅ |
| 5 | 欠陥C(弱い名の誤着) | **F-1** — 強い名 21 語が世間を攫う | reflect 相(一度目) | ✅(撤去) |
| 6 | F-1 に `MEND_RE` を課す | **Q2-1** — 改める動詞で 32/32 が攫われる | 教主 | ✅(撤去) |
| 7 | `WORLDLY_VESSEL_RE` で守る | **Q3-1 / Q3-2** — 器 37 語が楽園を落とす・枝2が無防備 | 教主 | ✅(撤去) |
| **8** | **欠陥A の `CREATE_RE` 拡張** | **R-1 — 熟議 120/150 が counsel を失う** | **tribunal 二度目** | **❌ 未修理** |

**7 度ではない。8 度である。**
一度目の reflect は 5 件、走行は 7 件を数えたが、
**8 件目は誰も数えていなかった。** 探針の軸が一つ足りなかったからである。

### 3.2 「正しい学習」の側の論拠(数で)

- **撤去は効いた。** engine 固有名を捨てた結果、本走行が最も恐れた誤着は消えた:
  - B群(世間の創造 × engine 固有名 20 件): HEAD **0/20**、main **0/20** —— 悪化なし。
  - C群(世間の創造 × 世間語 12 件): HEAD **0/12** —— 悪化なし。
  - A群(楽園の改修 18 件): main **5/18 誤着** → HEAD **0/18**。**5 件治癒。**
- **知識は残った。** 四度の回帰の実測は消されず、`forge.js` の `REFORM_RE` 註と
  `requirements.md` §8 に**三案の数ごと**残り、第60条 (h) として**条に格上げ**された。
  `codex.js check` EXIT=0 で索引と本文の一致も機械が保証している。
- **門は増えた。** 469→471、`test()` 宣言 57→94。
  `counsel.test.js` は **210 passed 0 failed**、`abandoned-run.test.js` は **33 passed 0 failed**。
- **副産物は本物である。** HIGH-1 / S-1(ReDoS)/ V-1 はいずれも
  **欠陥C とは無関係に実在した毒**で、この走行が無ければ見つからなかった。
  ReDoS は実測で `"x"*200000 → 22698ms` が `0.62ms` になった(約 8000 倍)。

> **数で言えば: 撤去は「作った誤着 21+32+37 件を 0 に戻し、治癒 5 件を残した」。**
> 第60条 (h)「同じ印を四度強めても回帰が続くならその印は捨てよ」は、
> **この走行が自分の血で書いた条**であり、次の走行はもう四度払わない。

### 3.3 「失敗」の側の論拠(数で)

- **払った代が釣り合わない。** build 差し戻し **4 回** / quality 周回 **4 周** /
  construction reworks **3(限界)**。`gauge.js` の実測 **score 50**(一度目は 70)。
  得たものは **A群 5 件の治癒**である。**1 件の治癒に差し戻し 0.8 回。**
- **撤去は問いを解いていない。** `gauge に fingerprint を確かめる口を設ける` は
  **今も standard に落ちる**(requirements §8 の実測)。AC-05 は
  **射程外として取り下げられた**。走行の主題の一角は未達のまま次へ送られた。
- **そして最大の失敗**: 8 件目 **R-1 を誰も見なかった**。
  7 度の回帰を記録しながら、**探針の軸は最後まで `reform` 一本だった**。
  「修理が面を開く」を 7 度学びながら、**8 度目に同じ形で裏切られた** ——
  学習が**振る舞いを変えていない**。

### 3.4 裁定

> **正しい学習である。ただし学習の対象を取り違えていた。**
>
> 走行が学んだのは「**engine 名は弱い印だ**」であり、これは真で、条に刻まれ、撤去も正しい。
> 走行が学び損ねたのは「**修理が開いた面を、修理と同じ軸でしか測っていない**」である。
> 8 件のうち **7 件は `isReformSubject` の面**で、**1 件は `isCounsel` の面**だった。
> 前者は 7 回撃たれ、後者は **0 回**撃たれた。
>
> **回帰の数(8)は失敗の証ではない。回帰の軸の偏り(7:1、うち 1 は未検出)が失敗の証である。**

---

## 4. 四度の差し戻しは予防できたか —— 見抜けたはずの兵士を名指す

### 4.1 誰が見抜けたか

**design 相(architecture 領域)である。** 名指しで三点:

1. **`design.md` は `ENGINE_NAMES` の危険を一節も持たない。**
   設計は「engine の固有名を印に足す」と決めながら、
   **「`gauge` は車の計器でもある」という一行を書かなかった。**
   これは調べる必要すらない —— **表を書いた瞬間に、表の各語を世間の文で撃てば分かる。**
   `gauge calibration tracker` は設計相が 30 秒で書けた願いである。

2. **`discovery.md` は既に材料を持っていた。** §6.1 で
   `台帳の毒を直す` が quick から reform へ攫われたことを**実測している**。
   `台帳`/`ledger` は禁則として requirements FR-04 に昇格した。
   **一語で起きたことは表全体で起きる** —— この一般化を誰もしなかった。

3. **requirements 相にも責がある。** §3.6 が
   「**誤着を直して別の誤着を生む**」を名指しで禁じた。だが
   **その禁を機械で確かめる AC を書かなかった。**
   AC-31〜35・AC-36〜46 は全て「reform へ攫われないか」であり、
   **「他の道を失わないか」を撃つ AC は一本も無い。**
   R-1 が 150 件規模で出たのは、この空白の直接の帰結である。

**教訓 `rework-four-times-is-a-design-debt` は既に KG に在り、critic はそれを
`✓ CONDUCT` として提示していた。** それでも四度払った ——
**第60条 (f) が言う「読まれて守られない条文は、門の不足である」の実演である。**

### 4.2 提案する門と条

#### 🔴 提案1(門) — `forge.js` の道選びは**全 6 道の混同行列**で裁く

今の門は「reform へ攫われないか」という**片側の帯**しか見ない。
R-1 は「counsel を失う」という**別の帯**で出た。

```
提案: tests/counsel.test.js に ROUTE_MATRIX を置く。
  各道 (reform / counsel / cartography / quick / standard / full) について
  「その道が正解の願い」を最低 8 件ずつ持ち、6×6 の混同行列を作る。
  門が assert するのは個別の対ではなく **対角線の合計** と
  **非対角の各セルが 0 であること**。
  新しい語彙を足したら、行列の全セルが再計算される ——
  片側だけ直して反対側を見ない修理が、構造的に不可能になる。
```

**なぜ効くか**: R-1 は `CREATE_RE`(counsel の判定材料)を広げた結果である。
行列なら `counsel→standard` のセルが 0 から 120 に跳ね、**その場で赤くなる**。
今の門は `reform` 列しか持たないので、永久に緑だった。

#### 🔴 提案2(条) — 第61条を起草する

```
61. **判定器を直したら、その判定器が奪いうる全ての行き先を数えよ。**

    (a) 分類器の修理は「正しい行き先へ着くか」だけでは裁けない。
        ある行き先を増やす修理は、必ず**別の行き先から奪っている**。
        本走行は `CREATE_RE` に建造動詞を足して reform を救い、
        同じ一手で counsel を 120/150 失った —— **誰もそれを測らなかった。**

    (b) **測るべきは対角線ではなく混同行列である。**
        「A へ着くべきものが A へ着いた」を n 件撃っても、
        「B へ着くべきものが A へ攫われた」については一言も述べていない。
        修理の前後で**全セル**を数え、増えたセルと減ったセルを両方名乗れ。

    (c) **修理が触れた定数から、その定数を読む全ての判定経路を辿れ。**
        `CREATE_RE` は `isCounsel` が読む。`isCounsel` は `chooseScale` が
        reform より先に呼ぶ。ゆえに `CREATE_RE` を広げることは
        **counsel の門を狭めること**である。これは読めば分かる ——
        読まなかったのは、探針が `reform` の軸しか持たなかったからである。

    **これを強制する門**: 提案1の `ROUTE_MATRIX`。
```

#### 提案3(手続) — **差し戻し 2 回目で設計へ戻す**

本走行は build を 4 回差し戻した。2 回目の時点で
`rework-four-times-is-a-design-debt` の条件は既に満たされていた。

```
提案: conclave.js に reworkCount >= 2 の閾値を置き、
      3 回目の差し戻しを **build へ返さず design 相へ戻す**。
      「実装の弱さ」と「設計の空白」を機構が区別する。
      gauge.js の score が 70→50 に落ちたのは、まさにこの債務の計測である。
```

---

## 5. 教主と神官の分業は正しかったか —— 神官の撃ち方の何が足りなかったか

### 5.1 誰が何を見つけたか(台帳)

| 欠陥 | 重さ | 発見者 |
|---|---|---|
| 欠陥C(世間の願いが reform へ) | 重 | **教主** |
| main-clone の偽の赤 | 重 | **教主** |
| Q3-1(器 37 語が楽園を落とす) | 重 | **教主** |
| Q3-2(枝2 が無防備・18/24 誤着) | 重 | **教主** |
| Q2-1(MEND_RE で 32/32 攫われる) | 重 | **教主** |
| F-1(強い名 21/21) | 重 | reflect 相(tribunal 一度目) |
| **R-1(熟議 120/150)** | **重** | **tribunal 二度目** |
| HIGH-1 / S-1 / V-1 | 中 | security 相 / verify 相 |

**重い欠陥 7 件のうち 5 件を教主が撃って見つけた。神官は 0 件。**
神官が見つけたのは中位の 3 件(いずれも**自分が書いた差分の直下**にある毒)である。

### 5.2 神官の撃ち方に足りなかったもの — 名指しで三つ

#### (1) **神官は自分の変異しか撃たない**

`lesson:mutation-author-is-blind-to-own-net` が既に名指ししている病である。
build 相の故障注入は AC-35 で **3 変異**、AC-42/46 で追加されたが、
**全変異が「自分が今書いた枝」を狙う**。
教主の探針は違った —— `gauge calibration tracker` のような
**実装者が想像しない世間の文**を持ち込んだ。

> **神官は「自分の実装が壊れたら鳴るか」を撃つ。教主は「世界がどう見えるか」を撃つ。**
> 前者は無限に緑になりうる。

#### (2) **神官は main と突き合わせない**

`lesson:regression-needs-both-heads` は KG に在り、`applies:reform` である。
だが build/verify/review の三相はいずれも **HEAD だけを撃った**。
教主は `git clone --branch main` を自分で立て、**同じ探針を両方で撃った**。
だから「これは本走行が作った」と断定できた。

本 tribunal 二度目が R-1 を「回帰」と断定できたのも、
**main を複製して同じ 82 件を撃ったからである**(HEAD 単独では
「元からそうだったのかもしれない」で終わる)。

#### (3) **神官はコーパスを「AC が要求した形」でしか作らない**

AC-31 は 24 件を要求し、build は 24 件を書いた。AC-37 は 26 語を要求し、26 語を書いた。
**AC が要求しなかった軸は、一件も書かれなかった。**
`counsel` を失う面は、どの AC も要求していない —— ゆえにコーパスが 0 件だった。

> **神官は「AC を満たす」を仕事と解し、「創造物が正しい」を仕事と解さなかった。**
> これは第16条(AC 全緑 ≠ spec 充足)が言う病そのものである。

### 5.3 裁定 — 分業は**正しくなかった**

**教主が撃たなければ、この走行は欠陥C を抱えたまま出荷されていた。**
それは分業が機能していないということである。
執行官(tribunal)が二度とも重い欠陥を掴んだのは救いだが、
**tribunal は最後の一相であり、そこで掴まれた欠陥は全て差し戻しになる** ——
本走行の 4 度の差し戻しのうち 3 度は tribunal/教主の発見が引き金である。

**直すべきは神官の能力ではなく、神官に渡す発令書である:**

```
提案4(発令書の条項) — build/verify/review の発令書に必須の三行を載せる:
  1. 「main を複製し、同じ探針を両方で撃て」(regression-needs-both-heads の機構化)
  2. 「お前が触れた定数を読む**全ての**判定経路を列挙し、それぞれに探針を持て」(第61条(c))
  3. 「お前が書いた変異のほかに、**AC が要求していない軸**を最低一つ持て」
```

---

## 6. §二度目の実測台帳(すべて自分で撃った)

```
$ node tests/paradise.test.js                      → 471 passed, 0 failed  EXIT=0  (✓行 584 / ✗行 0, background)
$ node tests/counsel.test.js                       → 210 passed, 0 failed  EXIT=0
$ node tests/abandoned-run.test.js                 →  33 passed, 0 failed  EXIT=0
$ node graph/wiring.js check                       → engine 39 / 内の辺 73 / 門 19 本すべてに走らせる者  EXIT=0
$ node graph/codex.js check                        → 索引は本文と一致している (60 条)  EXIT=0
$ node graph/workspace.js check                    → 混入なし・直書きなし・流出なし  EXIT=0
$ node graph/derived.js check                      → no test depends on derived content  EXIT=0
$ node graph/conclave.js audit                     → 見捨てられた走行 1 (sovereign-abode / 本走行とは別)  EXIT=0
$ node graph/gauge.js score …/conclave.json --json → score 50 / reworkCount 3 / loopGuardTrips 0
$ secret scan(実装 6 本)                          → SECRETS_FOUND=0
$ AC 逐一駆動(道選び 11 本)                       → pass=11 fail=0
$ 探針 82 件 × 2 head                              → MAIN 6/82 誤着 → HEAD 16/82 誤着
$ 格子 150 件 × 2 head                             → MAIN 0/150 → HEAD 120/150
```

**`gauge.js` の score が一度目の 70 から 50 へ落ちた**のは
`reworkCount` が 1→3 に増えたからである。**floor は 60。**
これは `verdict.js` において**単独で REWORK を引く**。

---

## 7. §二度目が見ていないもの(名乗り)

| # | 面 | 理由 |
|---|---|---|
| W-1 | **R-1 の修理案** | 熟議標識を打ち消し側へ足す案を思いついたが**試作も測定もしていない**。欠陥の存在のみを証明した |
| W-2 | **R-1 の英語側の全域** | 英語は 2 件しか撃っていない(`should we add…` / `is it wise…`)。`\b` 境界が効くので日本語より軽い可能性が高いが**測っていない** |
| W-3 | **quick / full / cartography を失う面** | R-1 は counsel の面で見つけた。同じ機序が他の道でも起きうるが、**混同行列を作っていない**(だから提案1を出した) |
| W-4 | **critic の 37 件の一件ずつの実物照合** | 一度目と同じく、同型であることと代表数件の照合で断じた。残りは読んでいない |
| W-5 | **実 GitHub Actions 上の挙動** | 掟により push しない |
| W-6 | **Windows 以外の機械** | 本機は Windows/MSYS のみ |
| W-7 | **`forge.js` の CLI 口(AC-30 の債務)** | 一度目が「別の走行へ送る」と裁いた。**今も門は 0 本**であり、`chooseScale` を直に呼んだ。CLI との割れは未検証 |

---

## 8. 次の走行への発令(順序どおり)

1. **R-1 を直す** —— 熟議の標識(べきか/検討/妥当か/どう思う/どうすべき/はないか/見直)が
   在るとき、建造動詞は「物を求めている」の証拠にならない。
   `isCounsel` の 2 段目より前に**熟議の関門**を置くのが素直だが、
   **`楽園の門を直すべきか` が reform を失わないか**を必ず両方向で撃つこと(第60条(b))。
2. **提案1の `ROUTE_MATRIX` を建てる** —— これが無い限り、次の修理も片側しか見ない。
3. **第61条を起草する** —— `codex.js index --write` → `codex.js check` を忘れるな。
4. **AC-30(`forge.js` CLI 口の門)** —— 三度目の申し送りになる。もう送るな。
5. **F-2 / F-3** —— `denude` の自傷・網羅の門の 4 文字未満除外。どちらも main から在る。

---

## 9. 追補 —— critic そのものの盲点を二つ実測した

§1〜§8 を書き終えたあと、`lessons.json` の件数を確かめようとして**別の欠陥を二つ掴んだ**。
どちらも **R-1 とは独立**で、**critic 自身の構造の問題**である。

### 9.1 🔴 盲点② —— `lessons.json` が腐っており、critic は 14 件を知らずに裁いていた

`kg.js remember` は KG(`graph/kg-store/`、**`.gitignore` されている**)に刻む。
critic が読むのは `graph/lessons.json` であり、これは `lessons.js export` が**生成する**。
**この走行は一度も export を走らせていなかった。**

```
$ node graph/lessons.js export --out graph/lessons.json     # tribunal 二度目が走らせた
$ git diff --stat graph/lessons.json
 graph/lessons.json | 112 +++++++++++++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 112 insertions(+)

  OLD=85  →  NEW=99   (+14)
```

**増えた 14 件のうち 10 件は、この走行自身が刻んだ教訓である**:

```
  + both-branches-of-a-rule              ← 一度目の tribunal が刻んだ
  + regression-needs-both-heads          ← 〃
  + corpus-blind-to-its-own-half         ← 〃
  + strength-of-evidence-sets-the-gate   ← 〃
  + mutate-the-gate-not-only-the-impl    ← 〃
  + corpus-machine-checked-against-table ← 〃
  + restore-path-must-be-verified        ← 〃
  + filter-in-a-gate-is-a-silent-exemption
  + gate-red-needs-a-mouth-not-a-wider-gate
  + child-stdout-exit-truncation
  + classifier-repair-steals-from-another-road  ← §二度目が刻んだ
  + gate-needs-confusion-matrix-not-a-column    ← 〃
  + conduct-lesson-presented-is-not-enforced    ← 〃
  + removal-is-a-legitimate-outcome             ← 〃
```

> **一度目の tribunal は 4 件の教訓を刻み、「critic が永久に検め続ける」と書いた。**
> **critic は一度もそれを読んでいなかった。**
> §1 で走らせた critic は `lessons: 85 件で裁いた` と名乗っており、
> 走行自身の教訓 7 件は**その 85 件の外に居た**。

これは `lesson:art29-derived-not-truth`(生成物は真実の写しであって真実ではない)の
**裏返しの病**である。あちらは「生成物の中身を前提にするな」と言い、
こちらは「**生成物を再生成しないと、原本に刻んだ知識が門に届かない**」と言う。
`derived.js check` は EXIT=0 —— **生成物への依存は無いが、生成物の鮮度は誰も見ていない。**

**提案5(門)**: `kg.js remember lesson` を呼んだ走行は
`lessons.js export` を走らせたか —— `lessons.json` の件数と KG の lesson 件数を
突き合わせる門を建てよ。ずれていれば赤くする。
**知識を刻んだのに門に届いていない状態は、刻んでいないのと同じである。**

### 9.2 🔴 盲点③ —— reform 走行の自己審査は scope を宣言せず、自分の教訓を自分で握り潰す

`lessons.json` を 99 件に直して critic を撃ち直しても、**GAP は 37 のままだった**。
理由を実装で追った(`graph/critic.js:583`):

```js
const DEFAULT_SELF_SCOPES = ['paradise-internal', 'orchestration'];
function selfScopeSubject(dir) { … `.paradise-scopes` で上書き可 … }
```

`--self` の走行は既定で **`paradise-internal` と `orchestration` しか名乗らない**。
だが本走行が刻んだ教訓の scope は **`forge` / `gate` / `reform`** である。
ゆえに:

```
  ✓ lesson:classifier-repair-steals-from-another-road: lesson out of scope here (applies: forge)
  ✓ lesson:gate-needs-confusion-matrix-not-a-column:   lesson out of scope here (applies: gate)
  ✓ lesson:corpus-blind-to-its-own-half:               lesson out of scope here (applies: gate)
  ✓ lesson:regression-needs-both-heads:                lesson out of scope here (applies: reform)
  ✓ lesson:both-branches-of-a-rule:                    lesson out of scope here (applies: forge)
  …  計 14 件が「射程外」として **緑**になった
```

**`reform/route-misfire` は forge を書き換えた走行であり、門を建てた走行であり、reform の走行である。**
それが `forge` / `gate` / `reform` の教訓を「射程外」と言って素通りさせた。

**実測で確かめた** —— `.paradise-scopes` に 5 語を宣言して撃ち直す:

```
$ printf 'paradise-internal\norchestration\nforge\ngate\nreform\n' > reform/route-misfire/.paradise-scopes
$ node graph/critic.js review reform/route-misfire --lessons graph/lessons.json --self
VERDICT: 39 GAP(S)          ← 37 から 2 件増えた

$ node diff-critic.js
既定: 99 教訓 / scope宣言後: 99 教訓
  lesson:corpus-blind-to-its-own-half   ✓ → 🔴
  lesson:restore-path-must-be-verified   ✓ → 🔴
判定が変わった教訓 = 2 / 新たに赤くなった = 2
赤の総数: 既定 37  →  scope宣言後 39
```

**そして新たに赤くなった一件が `corpus-blind-to-its-own-half` である:**

> 「門のコーパスが規則の片枝しか含まないなら、門は永久に緑のまま面の半分を素通しする。
>  **コーパスは規則の枝ごとに数えて示せ。**」

**これは R-1 そのものである。** AC-31〜46 のコーパスは `reform` の枝しか持たず、
`counsel` の枝を 0 件しか持たなかった —— ゆえに 120/150 が素通りした。

> **一度目の tribunal はこの教訓を正しく刻んだ。**
> **そして走行はそれを、scope の既定値によって自分で握り潰し、同じ病を再発させた。**

`lesson:self-scope-subject`(自己審査ではスコープの主語を宣言せよ・沈黙を合格と誤るな)は
KG に在り、critic は **`🔴` で名指ししていた**(§1 の出力の一行)。
**赤が出ていたのに、誰もそれを scope の宣言に繋げなかった。**

**提案6(門)**: `--self` の走行が `.paradise-scopes` を持たないとき、
`DEFAULT_SELF_SCOPES` へ黙って落とすな。
**その走行が触れたファイルから scope を導け**(`graph/forge.js` を触ったなら `forge`、
`tests/*.test.js` を触ったなら `gate`、`reform/` に住むなら `reform`)。
導けないなら**声に出して名乗らせ、緑にするな**(第37条・第60条(d))。

**本 tribunal は `.paradise-scopes` を置かなかった。**
`git status` に残さず削除した —— **tribunal は裁く相であり、建てる相ではない**(一度目の §4 の裁定を踏襲)。
**欠陥の存在を実測で証明し、次の走行へ渡す。**

### 9.3 三つの盲点の重さの順

| # | 盲点 | 重さ | 影響 | critic は言ったか |
|---|---|---|---|---|
| **R-1** | 熟議の願いが counsel を失う(格子 main 0/150 → HEAD 120/150) | **最重** | **神の願いが誤った道へ着く。出荷を止める breach** | ❌ 一言も |
| **盲点②** | `lessons.json` が腐り、走行自身の教訓 10 件が門に届いていなかった | 重 | **刻んだ知識が一件も検められない。学習機構そのものの空転** | ❌(自分が被害者なので構造的に言えない) |
| **盲点③** | `--self` の既定 scope が走行自身の教訓 14 件を射程外にする | 重 | **R-1 を捕らえたはずの `corpus-blind-to-its-own-half` を握り潰した** | ⚠️ `self-scope-subject` を 🔴 で名指ししていたが、誰も繋げなかった |

**②と③は連鎖している。** ②(export 忘れ)で 14 件が存在せず、
仮に②を直しても③(scope の既定値)で同じ 14 件が射程外になる。
**二重の網で、走行自身の教訓は門に一度も届かなかった。**

**そして③を直せば、R-1 の型は `corpus-blind-to-its-own-half` の赤として鳴った。**
この走行は**自分を救う知識を既に持っており、二つの機構の不備でそれを自分に届けられなかった。**

---

# §三度目 — 環の最後を擃つ

> **tribunal 三度目 / reflect 相。** construction は reworks=3(限界)に達しており、
> **これ以上差し戻せば環は blocked になる。** ゆえに本相は「何を直させるか」ではなく
> **「何が今この枝の欠陥で、何が次の走行の題か」を別ける**ために撃つ。
>
> **測定の場**: 本相は **作業木を一字も変異させていない。**
> `git clone --no-hardlinks --branch reform/route-misfire` で
> `$LOCALAPPDATA/Temp/mutlab` を、`--branch main` で `mainlab`(c216014)を立て、
> **変異は全て複製の中だけで撃った。**
> (経緯は §三度目 8.1 に正直に記す —— 最初の走者は作業木を変異させ、
>  ログ名の `/` で落ちて**変異を作業木に残した**。教主が名指しで止めた。)

---

## 1. `critic.js review` の生出力

```
$ node graph/critic.js review reform/route-misfire --lessons graph/lessons.json --self
═══════ 🔍 ADVERSARIAL SELF-CRITIQUE ═══════
target: reform/route-misfire
lessons: 103 件で裁いた  ← graph/lessons.json
  ✓ [smell] no-hardcoded-assumptions: no code to inspect
  ✓ [gap] no-secrets: no secrets detected
  ✓ [gap] exemption-claim-verified: 免除を適用した (engine): 申告=--self / 楽園の倉の中: reform\route-misfire
  ✓ [gap] no-wall-clock-iso: engine code is exempt (creations-only law)
  ✓ [gap] no-external-deps: engine code is exempt (creations-only law)
  ✓ [smell] domain-markers-present: engine code is exempt (creations-only law)
  🔴 [gap] lesson:require-discovery: LESSON REGRESSION — past miss recurs: "findings" not addressed
  🔴 [gap] lesson:orchestration-in-prompt: LESSON REGRESSION — past miss recurs: "orchestrator" not addressed
  🔴 [gap] lesson:lesson-scope: LESSON REGRESSION — past miss recurs: "applies" not addressed
  🔴 [gap] lesson:kg-forget: LESSON REGRESSION — past miss recurs: "forget" not addressed
  🔴 [gap] lesson:critic-synonym: LESSON REGRESSION — past miss recurs: "musthaves" not addressed
  🔴 [gap] lesson:model-by-rank: LESSON REGRESSION — past miss recurs: "model" not addressed
  🔴 [gap] lesson:contract-failclosed / lesson-scope-strict / self-scope-subject / cross-domain-rework …
  🔴 [gap] lesson:corpus-blind-to-its-own-half: LESSON REGRESSION — past miss recurs: … not addressed
  🔴 [gap] lesson:restore-path-must-be-verified: LESSON REGRESSION — past miss recurs: … not addressed
  (… 全 115 行。✓ 76 件 / 🔴 39 件)
───────────────────────────────────────────
VERDICT: 39 GAP(S) — the creation is incomplete. REWORK.
═══════════════════════════════════════════
CRITIC_EXIT=1
```

**教訓を 4 件刻み `lessons.js export` を走らせた後、撃ち直した:**

```
lessons: 107 件で裁いた  ← graph/lessons.json
  ✓ [gap] lesson:matrix-gate-only-sees-declared-rows: lesson satisfied: …
  ✓ [gap] lesson:scope-withdrawal-needs-both-columns: lesson satisfied: …
  ✓ [gap] lesson:mutation-lab-is-a-clone-not-the-worktree: lesson satisfied: …
  ✓ [gap] lesson:redundant-vocabulary-outlives-its-repair: lesson satisfied: …
VERDICT: 39 GAP(S) — the creation is incomplete. REWORK.
CRITIC_EXIT=1
```

### 1.1 39 件の読み方 —— §一度目・§二度目と同じく**全件が偽の赤**

判定は `lesson.check` の語が成果物の本文に出現するかで下りている。
`"findings" not addressed` / `"applies" not addressed` / `"model" not addressed` は
**語の出現で裁く判定**であり、本走行が `findings.md` を持たない(reform 道は
`discovery.md` を持つ)ことを欠陥と呼んでいるに過ぎない。

**新しく刻んだ 4 件が全て ✓ になったことが、この判定の性質を最もよく示す** ——
4 件は本文に語が現れるので緑になっただけであって、
**critic は本走行が今日実測した内容を一行も検めていない。**

### 1.2 🔴 critic が黙った盲点(三度目)—— **`ROUTE_MATRIX` 門は 5 形の回帰を一つも捕らえない**

critic は **39 件の赤を並べながら、本相が実測で見つけた最重の欠陥を一言も言わなかった。**
§一度目(F-1)・§二度目(R-1)に続き、**三度連続で critic は本走行の実在する欠陥を指せていない。**

---

## 2. 🔴 最重の発見 —— `ROUTE_MATRIX` 門は**過去 5 形の回帰を一つも捕らえない**

### 2.1 問い

教主の実測は「`DELIBERATION_RE` を殺すと route-matrix のみ 4 failed、counsel は 210/0 で黙った」
であり、これは **`ROUTE_MATRIX` が新しい面を守っている証**である。
だが **逆は問われていなかった** —— **過去 8 度の回帰を、この門は捕らえるのか。**

### 2.2 撃ち方(実測の手続)

複製 `mutlab`(577949e)の `isReformSubject` を、**過去の実装そのものへ委譲**させた。
歴史の実装は `git show <commit>:graph/forge.js` で取り出した本物である:

| 形 | commit | 何を試みた実装か |
|---|---|---|
| 欠陥C | `3b726f5` | engine 固有名を**一枚の表**にして `REFORM_RE` へ流し込む |
| F-1 | `f092b17` | 強い名/弱い名に割り、強い名は**限定詞の除外だけ**で無条件通過 |
| Q2-1 | `3311290` | 強い名に **`BUILD_RE` ∪ `MEND_RE`** を課す |
| Q3-1 / Q3-2 | `6a4e3f4` | **`WORLDLY_VESSEL_RE` + `STRONG_BOUND_RE`** で守る |

### 2.3 実測 —— **表**

```
変異        ROUTE_MATRIX         counsel.test              病そのものの実測(探針)
──────────────────────────────────────────────────────────────────────────────
欠陥C       黙った exit 0        🔴 捕らえた exit 1        世間の願い 9/10 が reform へ
            13 passed 0 failed   104 passed 106 failed     (HEAD 無傷では 1/10)
F-1         黙った exit 0        🔴 捕らえた exit 1        engine 名 × 日本語 7/10 が reform へ
            13 passed 0 failed   128 passed  82 failed     (HEAD 無傷では 0/10)
Q2-1        黙った exit 0        🔴 捕らえた exit 1        改める動詞 7/10 が reform へ
            13 passed 0 failed   173 passed  37 failed     (HEAD 無傷では 0/10)
Q3-1        黙った exit 0        🔴 捕らえた exit 1        楽園の願い 1/8 を取りこぼす
            13 passed 0 failed   205 passed   5 failed     (HEAD 無傷では 0/8)
Q3-2        黙った exit 0        🔴 捕らえた exit 1        枝2 の誤着 7/8 が reform へ
            13 passed 0 failed   205 passed   5 failed     (HEAD 無傷では 0/8)
──────────────────────────────────────────────────────────────────────────────
R-1(対照)   🔴 捕らえた exit 1   黙った exit 0            熟議が counsel を失う
            9 passed 4 failed    210 passed 0 failed
            M-2[対角] / M-3[非対角] / M-4[R-1名指し] / M-6[格子150]
            非対角: counsel→reform 9 件 , counsel→standard 22 件 , counsel→full 1 件
```

**`ROUTE_MATRIX` が過去 5 形を捕らえた数: 0/5。**
**捕らえられないものを名指す: 欠陥C / F-1 / Q2-1 / Q3-1 / Q3-2 —— 5 形すべて。**

### 2.4 なぜ黙るのか —— 機序

`ROUTE_MATRIX` の軸は **「正解の道」× 「実際の道」**である。
セルが動くのは **コーパスに載っている願い**が別の道へ着いたときだけである。

コーパス 87 件の内訳を数えた:

```
counsel 42 / cartography 9 / reform 11 / quick 8 / standard 9 / full 8
```

**`standard` の 9 件・`full` の 8 件は、いずれも engine 固有名を一語も含まない**
(`レシピ検索の並び替えを実現して` / `build a habit tracker app` …)。
すなわち **「世間の願い × engine 名」という母集団が行列に 0 件**である。

ゆえに欠陥C の変異が `forge 鍛冶屋の在庫管理アプリを作って` を reform へ攫っても、
**その願いは行列のどのセルにも載っていない** —— 全 36 セルが一つも動かない。

> **教訓**: 混同行列の軸は**道**であって**願いの母集団**ではない。
> 行列は「宣言した行が奪われたか」しか見ず、**宣言しなかった願いには目を持たない。**
> 第61条(a) の「非対角=0」は、**コーパスが面を覆っている限りにおいてのみ**網である。

### 2.5 これは欠陥か —— **否。だが第61条の条文は嘘をついている**

**`ROUTE_MATRIX` を欠陥とは呼ばない。** 理由を数で述べる:

1. **5 形すべてを `counsel.test.js` が捕らえた。** 面は無防備ではない(§2.3 の右列)。
2. **`ROUTE_MATRIX` は counsel.test が黙る面(R-1)を捕らえる**(対照で実証)。
   **二つの門は相補である** —— どちらも単独では網ではない。
3. HEAD 無傷で `route-matrix 13/0` かつ `counsel 210/0` であり、**両方緑である。**

**だが第61条の条文と `tests/route-matrix.test.js` 冒頭の註は、こう名乗っている:**

> *ゆえにこの門は **行列**で撃つ …… 非対角の各セルが 0 …… 片側だけ直す修理が構造的に不可能になる*

**「構造的に不可能」は実測で偽である。** 過去 5 形の片側修理は、この門を**素通りする。**
これは第33条(散文が機構を騙る)の形であり、**次の走行が第一に直すべき散文**である。
**今この枝の欠陥ではない**(振る舞いは正しく、門は両方緑である)。

---

## 3. M9 の裁定 —— 神官の申告「`BUILD_JA` は `CREATE_RE` で余剰」は **真である**

### 3.1 撃ち方

`CREATE_RE` の定義から `${BUILD_JA}|` の一行**だけ**を抜いた
(⚠️ `${BUILD_JA}|` は **`BUILD_RE` と `CREATE_RE` の両方**に現れる。
 非 global の `replace` は先に立つ `BUILD_RE` を撃つ —— 一度それで誤った数を出した)。

```js
// 変異後
const CREATE_RE = new RegExp('欲しい|ほしい|作れ|作って|作る|つくって|実装|実現|開発|構築|' +
  '\\b(?:build|create|make|implement|develop)\\b|' + BUILD_EN, 'i');
```

### 3.2 実測

```
面                              HEAD      M9(BUILD_JA を CREATE_RE から抜く)
──────────────────────────────────────────────────────────────────────
欠陥A の本旨 15 件               0/15      0/15
世間の建造 30 件(10 語 × 3 文型)  0/30      0/30
熟議 20 件(10 語 × 2 文型)       0/20      0/20
楽園の改修 10 件                 0/10      0/10
──────────────────────────────────────────────────────────────────────
門: route-matrix EXIT=0 (13 passed 0 failed) / counsel EXIT=0 (210 passed 0 failed)
```

### 3.3 裁定 —— **真。ただし「無駄だった」ではなく「役目を終えた」**

**75 件の願いが一件も動かず、門も両方緑である。** 神官の申告は正しい。

**だが「欠陥A の修理の一部が無駄だった」とは裁かない。** 数で述べる:

* **当時は必要だった。** `main` の `REFORM_RE` は engine 固有名を持たないが、
  `denude`(フラグ名剥ぎ)も `DELIBERATION_RE` も持たない。§compare の実測で
  **main は欠陥A の本旨 11 件のうち 3 件を落とし**、`楽園の自己診断に…口を設ける` /
  `門に監査の一段を足す` が **counsel へ攫われていた**。
* **今は余剰である。** その仕事は後から建った `DELIBERATION_RE` と
  `isReformSubject` の抽象名枝が引き受けた。

**そして、この余剰こそが R-1 を生んだ当の語彙である。**
`CREATE_RE` の `BUILD_JA` が `isCounsel` の 2 段目を殺し、熟議の願いが counsel を失った。
すなわち **「今や何の仕事もしていない語彙が、8 度目の回帰を生んだ」。**

**裁定: 次の走行で撤去せよ。今この枝では撤去しない。** 理由:
1. **撤去は振る舞いを一件も変えない**(75/75 が不動)。ゆえに**急ぐ理由が数の上に無い。**
2. 本走行は「修理が新しい欠陥を生む」を **8/8 = 100%** で実演した。
   **無審査の撤去を最後の環でねじ込むのは、その 9 度目を招く最も危険な手である。**
3. reworks=3 に達しており、**差し戻せば環は blocked になる。**

---

## 4. 8 度の回帰のうち、今の門の組みで何度目まで防げたか

§二度目 `verdict-report.json` の `repairsThatCreatedNewDefects`(8 件)を、
**今の門の組み(paradise 471 + counsel 210 + route-matrix 13 + lesson-export 8)**で数え直した。

| # | 回帰 | 今の門は捕らえるか | 捕らえた門 | 実測 |
|---|---|---|---|---|
| 1 | 欠陥C(世間の願いが reform へ) | ✅ | `counsel.test.js` | 106 failed |
| 2 | HIGH-1(`isCreationsVault` が緑を騙る) | ✅ | `paradise.test.js` / `workspace` | 修理済・門在り |
| 3 | S-1(`denude` の ReDoS) | ✅ | `counsel.test.js` | 速さの門が在る |
| 4 | V-1(走行帳一つで check が死ぬ) | ✅ | `abandoned-run.test.js` 33/0 | 門在り |
| 5 | F-1(強い名 26 語が無条件通過) | ✅ | `counsel.test.js` | 82 failed |
| 6 | Q2-1(改める動詞が世間にも出る) | ✅ | `counsel.test.js` | 37 failed |
| 7 | Q3-1 / Q3-2(器の表の両面) | ✅ | `counsel.test.js` | 5 failed |
| 8 | **R-1(熟議が counsel を失う)** | ✅ | **`ROUTE_MATRIX` のみ** | 4 failed(counsel は 210/0 で黙る) |

**答: 8/8 —— 八度目まで全て防げる。**

**ただし「一本の門が 8 件を守る」のではない。** 数の内訳がそれを示す:

```
counsel.test.js だけが捕らえる  : 5 件 (欠陥C / F-1 / Q2-1 / Q3-1 / Q3-2)
ROUTE_MATRIX だけが捕らえる     : 1 件 (R-1)
他の門が捕らえる                : 2 件 (HIGH-1 / V-1)
両方が捕らえる                  : 0 件   ← ★
```

**重なりが 0 件である。** これは「二本の門が同じ面を二重に守っている」の対極であり、
**どちらか一本を落とせば、その面は即座に無防備になる**ことを意味する。
`tests/route-matrix.test.js` の註が言う「片側だけ直す修理が構造的に不可能」は、
**この二本が揃っている限りにおいてのみ**真である。

---

## 5. AC-03 型 2 件 —— **選択肢 1(射程外へ格下げ)を採る。根拠は四つの数**

教主の見立ては選択肢 1 である。**盲従せず、選択肢 2 の側から数で反証を試みた。**
反証は成立しなかった。以下がその四つの数である。

### 根拠 1 —— **回帰ではない**(main 対照)

```
                             main        HEAD      判定
CI に ledger --audit を追加する   counsel  →  standard   ✓ 改善(誤着の道が調査から既定へ)
conclave の毒を除く            standard →  standard   = 同じ(回帰ではない)
```

第38条の前後比較で **悪化は 0 件**である。
`verdict.js` が BLOCK を出す `spec.satisfied=false` は
「**本走行が spec に背いた**」を意味する —— main と同じ振る舞いはそれに当たらない。

### 根拠 2 —— **requirements は既にこの期待値を改訂済みであり、AC は緑である**

`requirements.md` §3.1 を読んだ。**AC-03 の期待値は build 相四度目で改訂されている**:

> **AC-03** 『CI に ledger --audit を追加する』は **counsel でない**(フラグ名に道を奪わせない)
> ```
> node -e "… process.exit(g!=='counsel'?0:1)"
> ```
> 期待: stdout が `counsel` **以外** / exit **0**

**生駆動した実測**:

```
  ✓ AC-01  =reform                HEAD=reform      main=counsel     | 楽園の自己診断に絞り込みの口を設ける
  ✓ AC-02  =reform                HEAD=reform      main=counsel     | 門に監査の一段を足す
  ✓ AC-03  ≠counsel (四度目で改訂)   HEAD=standard    main=counsel     | CI に ledger --audit を追加する
  ✓ AC-04  ≠counsel (教主裁定1)     HEAD=full        main=counsel     | 健康診断アプリが欲しい
  ⊘ AC-05  🔴 射程外 (取り下げ済)     HEAD=standard  / main=standard   | gauge に fingerprint を確かめる口を設ける
  ✓ AC-06 / AC-07 / AC-08 / AC-09 / AC-12                        (全て緑)

  AC 生駆動: pass=9 fail=0 射程外=1
```

**AC-03 は未達ではない。緑である。** 本旨(フラグ名 `--audit` に道を奪わせない)は達成された。
`reform` へ着かないのは **AC-05 / FR-04 の題**であり、そちらは `requirements.md` §3.1 で
**`~~取り消し線~~` + 🔴 射程外**と明記のうえ §8 へ申し送り済みである。

### 根拠 3 —— **`conclave の毒を除く` は「未達の AC」ではなく「門が assert している断言」**

`tests/counsel.test.js:875` を読んだ。この願いは **AC-38 の逆向きの門の中に在り、
`isReformSubject === false` と `chooseScale !== 'reform'` を機械が assert している**:

```
  isReformSubject=false  (門は false を assert している)
  chooseScale=standard   (門は !== reform を assert している)
```

**すなわち今の仕様では、この願いが `standard` であることが正しい。**
これを「未達」と数えることは **門が正しいと断言している振る舞いを欠陥と呼ぶ**ことであり、
**第21条(コーパスを緩めて緑にするな)の逆向きの違反** —— 緑の門を赤と呼ぶ —— になる。

### 根拠 4 —— **選択肢 2 を採ると何を失うか**(これが決定打)

「AC を緑にせよ」は「engine 固有名を印に戻せ」と同値である。**その代価を測った**:

```
engine 名 26 語 × 「に検めの口を設ける」が reform へ着かない数:
    main            = 26/26      ← main も全て着かない
    HEAD (撤去後)   = 26/26      ← main と同じ
    撤去前 6a4e3f4  =  3/26      ← 印が在れば 23 件が着く

世間の願い × engine 名 18 件 が reform へ誤着する数:
    main            =  0/18
    撤去前 6a4e3f4  =  7/18      ← 印が在ると 7 件が攫われる
    HEAD (撤去後)   =  0/18
```

**「AC 23 件を緑にする」ことと「世間の誤着 7 件を甦らせる」ことは同じ操作である。**
そして **その 7 件こそが Q3-2** —— 本走行が四度目に生んだ回帰そのものである。

> **第60条(b)**: *一方向にしか誤らない印は閾値がずれているだけである。
> 両方向に誤る印は、印そのものが問いに足りていない。*

**engine 名の印は両方向に誤る。** 四度の実測がそれを示し、教主が撤去を命じた。
**選択肢 2 は「四度差し戻された修理をもう一度やれ」と言うことに等しい。**

### 5.1 裁定

**選択肢 1 を採る。** AC-03 は改訂済みの期待値で**緑**、AC-05 は**射程外(取り下げ済)**。
`requirements.md` §8 に実測と共に残す(本相が §8.9 として実測を追記した)。
**未達として数えず、これを理由に BLOCK / REWORK を出さない。**

**教主の見立てと同じ結論に達したが、盲従ではない。**
選択肢 2 の側から四つの数を当てて反証を試み、**四つとも選択肢 1 を支持した。**
特に根拠 4 は教主の報告に無かった数であり、本相が独立に測った。

---

## 6. 刻んだ教訓(4 件)

既存 103 件と照合し重複を避けた(`node graph/kg.js query`)。

| id | 何を述べるか |
|---|---|
| `matrix-gate-only-sees-declared-rows` | **混同行列の門は宣言した行しか守らない。** 実測 5 形 0/5。行列の軸は道であって願いの母集団ではない |
| `scope-withdrawal-needs-both-columns` | **射程外化は両列の数で裁け。** main と同じか良いこと + 達成すると何件失うか、の二つを示せ |
| `mutation-lab-is-a-clone-not-the-worktree` | **故障注入は複製の中で撃て。** 復旧を検めるより復旧を要らなくする方が強い(本相の自傷から) |
| `redundant-vocabulary-outlives-its-repair` | **修理が足した語彙は、面が消えても残る。** M9 実測 75/75 不動。役目を終えた語彙が R-1 を生んだ |

```
$ node graph/lessons.js export --out graph/lessons.json
EXPORT_EXIT=0
 graph/lessons.json | 32 ++++++++++++++++++++++++++++++++
lessons.json 件数 = 107        (103 → 107, +4)
```

**`export` を必ず走らせた**(§二度目 盲点②の教訓)。撃ち直した critic は
`lessons: 107 件で裁いた` と名乗り、4 件すべてを読んだ。

---

## 7. 実測台帳(すべて本相が自分で撃った)

| 門 | 実測 | EXIT |
|---|---|---|
| `tests/paradise.test.js`(全走・background) | **471 passed, 0 failed** | 0 |
| `tests/counsel.test.js` | **210 passed, 0 failed** | 0 |
| `tests/abandoned-run.test.js` | **33 passed, 0 failed** | 0 |
| `tests/route-matrix.test.js` | **13 passed, 0 failed** | 0 |
| `tests/lesson-export.test.js` | **8 passed, 0 failed** | 0 |
| `graph/wiring.js check` | ✓ 門 **21 本**すべてに走らせる者が居る (第44条) | 0 |
| `graph/codex.js check` | ✓ 索引は本文と一致している (**61 条**) | 0 |
| `graph/gauge.js score --json` | score **50** / reworkCount **3** / loopGuardTrips **0** / phasesDone 11/11 | 0 |
| `graph/lessons.js export` | 103 → **107** (+4) | 0 |
| `graph/critic.js review --self` | 39 GAP(全件偽の赤 / §1.1) | 1 |

---

## 8. **自分が見ていない項目**(名乗り / 第37条)

### 8.1 🔴 本相が作業木を汚した —— 正直に記す

最初の変異走者は **作業木の `graph/forge.js` を直に変異させた**。
ログ名に変異名をそのまま使い、`Q3-1/Q3-2` の `/` で path が壊れて **ENOENT で落ちた**。
`finally` を持たなかったため、**`C:/Users/.../Temp/mut/forge-6a4e3f4.js` を require する
変異が作業木に残った**。commit していれば**他の機械で即死する**。

**教主が名指しで止めた。** 復旧と検証:

```
$ git checkout -- graph/forge.js
$ git status --porcelain            # → graph/forge.js を含まない
 M reform/route-misfire/conclave.json
$ git hash-object graph/forge.js    # → 30eb1316c4309a63305393f9b73f5d9c96c1bd1b (原本)
$ node tests/route-matrix.test.js   # → 13 passed, 0 failed / EXIT=0
$ node tests/counsel.test.js        # → 210 passed, 0 failed / EXIT=0
```

**以降の全測定は複製の中で行った。** これを `mutation-lab-is-a-clone-not-the-worktree` として刻んだ。
**自分が刻んだ `restore-path-must-be-verified` の教訓を、自分で破った** ——
§9.2 の盲点③(走行は自分の教訓を自分に届けられない)の**三度目の実演**である。

### 8.2 測っていないもの

* **強い名 26 語の全網羅を `chooseScale` で撃っていない。** §5 根拠 4 は
  「に検めの口を設ける」の**一文型**のみ。文型を変えれば数は動きうる。
* **`ROUTE_MATRIX` の変異は `isReformSubject` の差し替えのみ。**
  `isCounsel` / `isCartography` / `denude` を壊す変異は打っていない。
* **AC は 10 本しか生駆動していない**(全 47 本)。残りは verify 相の実測を引き写していない。
* **英語の世間の願い × engine 名を新しくは作っていない。** §compare の 20 件は既存コーパス由来。
* **`census fix/check` と全走は background に投げた出力を読んだ**が、走る様を見ていない。
* **`M9` を「次の走行で撤去せよ」と裁いたが、撤去後の姿を全走 471 で確かめていない**
  (counsel 210 / route-matrix 13 のみ確認)。

### 8.3 三度連続で critic が黙ったこと自体が最大の盲点である

| 相 | critic が出した数 | critic が指せなかった実在の欠陥 |
|---|---|---|
| §一度目 | 38 GAP | **F-1**(強い名 26 語が世間の願い 21/21 を攫う) |
| §二度目 | 37 → 39 GAP | **R-1**(熟議が counsel を失う。格子 0/150 → 120/150) |
| §三度目 | 39 GAP | **`ROUTE_MATRIX` が過去 5 形を 0/5 しか捕らえない** |

**critic の赤は三度とも「語の出現」であり、三度とも本物を外した。**
`kind:conduct` の提示が振る舞いを変えなかったこと(`conduct-lesson-presented-is-not-enforced`)と
同じ構造であり、**critic そのものが次の走行の題である。**

---

## 9. 本相の裁き —— verdict 相への送り

**spec を満たさない欠陥は 0 件である。** 数で述べる:

* AC 生駆動 **9 pass / 0 fail / 1 射程外**(§5 根拠 2)
* 第38条の前後比較で**悪化 0 件**、改善は 欠陥A 3 件 / 英語の熟議 2 件(§5 根拠 1・§compare)
* 8 度の回帰は **8/8 が今の門で捕らえられる**(§4)
* 門は **471 / 210 / 33 / 13 / 8 が全て 0 failed**、wiring / codex が EXIT=0(§7)

**ゆえに `spec.satisfied = true` を verdict 相へ送る。**
**§二度目が `false` にした理由(R-1)は修理され、本相が独立に治癒を実測した。**

**次の走行へ送る題**(**今この枝の欠陥ではない**):

1. **`ROUTE_MATRIX` の註と第61条の散文を直す** —— 「構造的に不可能」は実測で偽(§2.5)
2. **行列のコーパスに「世間の願い × engine 名」の行を足す** —— 5 形を捕らえる面を行列に持たせる
3. **`CREATE_RE` から `BUILD_JA` を撤去する** —— M9 実測 75/75 不動(§3.3)
4. **critic を「語の出現」から実質判定へ** —— 三度連続の沈黙(§8.3)
5. **AC-05 / FR-04** —— engine 固有名を印にする題(§5 根拠 4 の数を出発点に)
