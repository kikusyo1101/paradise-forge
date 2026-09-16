# review.md — reform 走行『route-misfire』quality 相 / 審査

**審査者**: quality 領域(review / security / docs)の神官
**対象**: `git diff main...HEAD` (HEAD = f092b17, ブランチ `reform/route-misfire`)
**変更量**: 7 ファイル / +2256 -22 行
**審査の作法**: 「既に緑になったものを疑う」。教主の基準線(24 件コーパス NG=0、counsel 118 passed、
paradise 471 passed)は**信じたうえで、自分で新しい弾を作って撃ち直した**。

---

## 0. 結論(先に言う)

**build/prove 相は「直った」と宣言したが、直っていない。**

quality 相が自ら考えた **52 件の新しい願い**を撃った結果、**50 件が誤着した**。
そのうち **44 件は main では正しく着いていた** —— すなわち **本走行が新しく生んだ病**である。

```
NG合計=50  うち本走行が新たに壊した=44  既存=6
```

これは requirements が名指しで禁じた振る舞い ——「誤着を直して別の誤着を生む」——
そのものである。rework 相が **逆向きの誤着を 10 件見つけて直した**のは正しかったが、
**同じ探し方を最後までやらなかった**。弱い名 14 語だけを調べ、強い名 24 語を調べなかった。
冠詞 7 語だけを調べ、指示詞・所有格・数量詞を調べなかった。

以下、**重い順**に列挙する。生出力は各項に付す。

---

## 1. 【重大・本走行が新生】強い名にも限定詞の除外が要る — 12 件が reform へ攫われた

### 症状

`ENGINE_NAMES_STRONG` は「楽園固有で、世間の願い文に現れない」という前提で作られた
(`forge.js` の註釈がそう明言している)。**この前提は事実に反する。**

`gauge` `critic` `verdict` `codex` `clergy` `synod` `forge` `abode` `hermetic` `wiring`
は**どれも普通の英単語**である。楽園に無関係の創造の願いが、この語を踏んだだけで
engine 改修の 11 相へ攫われた。

### 生出力(quality 相の実測 / HEAD f092b17)

```
★新regression	[C gauge]	main=full     head=reform	:: add a gauge widget to my car dashboard
★新regression	[C critic]	main=full     head=reform	:: add a critic score to my movie app
★新regression	[C verdict]	main=standard head=reform	:: add a verdict field to my court case tracker
★新regression	[C forge]	main=standard head=reform	:: add a forge upgrade screen to my RPG game
★新regression	[C abode]	main=full     head=reform	:: add an abode listing page to my rental app
★新regression	[C wiring]	main=full     head=reform	:: add wiring diagrams to my home renovation app
★新regression	[C hermetic]	main=full     head=reform	:: add a hermetic seal check to my lab app
★新regression	[C codex]	main=standard head=reform	:: add a codex viewer to my fantasy game
★新regression	[C clergy]	main=full     head=reform	:: add a clergy directory to my parish app
★新regression	[C synod]	main=standard head=reform	:: add a synod calendar to our church site
★新regression	[C forge(和)]	main=standard head=reform	:: ゲームに forge の画面を足す
★新regression	[C gauge(和)]	main=full     head=reform	:: 車のアプリに gauge の表示を追加する
```

さらに、**強い名 12 語すべて**が同じ形で落ちることを確かめた:

```
  abode:    "add a abode feature to my mobile app" -> reform
  clergy:   "add a clergy feature to my mobile app" -> reform
  codex:    "add a codex feature to my mobile app" -> reform
  conclave: "add a conclave feature to my mobile app" -> reform
  critic:   "add a critic feature to my mobile app" -> reform
  forge:    "add a forge feature to my mobile app" -> reform
  gauge:    "add a gauge feature to my mobile app" -> reform
  ordain:   "add a ordain feature to my mobile app" -> reform
  synod:    "add a synod feature to my mobile app" -> reform
  verdict:  "add a verdict feature to my mobile app" -> reform
  wiring:   "add a wiring feature to my mobile app" -> reform
  hermetic: "add a hermetic feature to my mobile app" -> reform
```

### 病理

rework 相は「世間一般の語と衝突する名は弱い名へ」と正しく裁いた。だが
**衝突の有無を「教主が実測した 10 件」だけで判定した**。`identity` `vendor` は
弱い名へ移したが、`gauge` `critic` `codex` は「楽園固有」と決めつけた ——
**辞書を引いていない**。`gauge`(計器)も `critic`(批評家)も `abode`(住居)も
`codex`(写本)も、英語の普通名詞である。

### 修理(施した)

強弱の別に関わらず、**限定詞の直後の engine 名は世間の物である**。
`DETERMINER_LOOKBEHIND` を一箇所に置き、`REFORM_RE`(強い名)と `REFORM_WEAK_RE`
(弱い名)の**両方**に掛けた。

**逆向きも撃った** —— 限定詞を伴わない `conclave の毒を除く` /
`gauge に fingerprint を確かめる口を設ける` は今まで通り reform に留まる。
「強い名を語彙から消す」のではなく**分ける**(第36条)。

### 門

`tests/counsel.test.js` §1d: `"…" は reform でない — 強い名 {名} も限定詞の直後なら
世間の物 (R-4)` を **9 本**、加えて逆向きの門 1 本。
各門は**前提の確認**(`BUILD_RE` を確かに持つ)を先に撃つ —— 前提が崩れれば門は
別の理由で緑になり、黙るからである。

---

## 2. 【重大・本走行が新生】限定詞の表が冠詞 7 語しかない — 6 件以上が reform へ攫われた

### 症状

rework 相の後読みは `(?<!\b(?:a|an|the|my|our|your|their)\s)` であった。
**指示詞(this/that/these/those)・三人称所有格(its/his/her)・数量詞(each/every/some/any/another/no)
が一語も入っていない。** どれも冠詞と**同じ仕事**(世間の物を一つ指す)をしている。

### 生出力

```
=== R-7: 冠詞リストの外の限定詞 ===
  this vendor:    isReformSubject=true
  that vendor:    isReformSubject=true
  its vendor:     isReformSubject=true
  his vendor:     isReformSubject=true
  her vendor:     isReformSubject=true
  each vendor:    isReformSubject=true
  some vendor:    isReformSubject=true
  another vendor: isReformSubject=true
  one vendor:     isReformSubject=true
  every vendor:   isReformSubject=true
  such vendor:    isReformSubject=true
```

道まるごとで撃った結果:

```
★新regression	[D this]	main=standard head=reform	:: add a filter to this vendor screen
★新regression	[D new]	 main=full     head=reform	:: add a new vendor onboarding screen to my shop app
★新regression	[D his/extra] main=standard head=reform	:: add an extra identity check to his login page
★新regression	[D its]	 main=standard head=reform	:: add a toggle to its workflow builder
★新regression	[D each] main=standard head=reform	:: add a note field to each vendor record in my CRM
★新regression	[D some] main=standard head=reform	:: add a badge to some vendor cards on my store page
```

### 修理(施した)

`DETERMINER_LOOKBEHIND` に 13 語を追加:
`this|that|these|those|its|his|her|each|every|some|any|another|no`。

**直せなかった 2 件**:
- `add a new vendor onboarding screen …` —— `new` は限定詞ではなく形容詞である。
  限定詞と名詞の間に形容詞が挟まる形(`a new vendor` / `an extra identity`)は
  後読みでは捕らえられない(後読みは**直前の一語**しか見ない)。
  表を広げれば済む問題ではなく、**形態素解析が要る**。§7 で「直さない」と裁いた。
- `add an extra identity check to his login page` —— 同じ形。

### 門

`tests/counsel.test.js` §1d:
- `冠詞以外の限定詞も弱い名の楽園名指しを打ち消す (R-3)` —— 新 13 語 + 旧 7 語の**両方**を撃つ
  (表を書き換えて古い語を落とす誤りを塞ぐ)。効きすぎの検めも同居させた
  (`media workflow` の語末 `a` を限定詞と誤読しないこと / 限定詞なしの `vendor` は今まで通り楽園を名指すこと)。
- `限定詞付きの世間の願い(道まるごと)が reform へ落ちない (R-3)` —— 6 件。

---

## 3. 【重大・本走行が新生】一字の紛れ語の表が実測範囲でしかない — 20 件が counsel を失った

### 症状

`PRODUCT_FALSE_FRIENDS` は教主が実測で見つけた 20 語
(`人口|窓口|入口|出口|河口|口調|口座|相場|相談|相手|位相|真相|様相|手相|首相|外相|門前|専門|部門|門下`)
のみである。**網羅の証明は無い。**

quality 相が日本語の常用語から自ら拾った紛れ語で撃つと、**20 件すべてが壊れた**。

### 生出力

```
★新regression	[A 口コミ]	main=counsel head=standard	:: 口コミの傾向を診断してほしい
★新regression	[A 蛇口]	main=counsel head=standard	:: 蛇口の水漏れ件数を診断してほしい
★新regression	[A 傷口]	main=counsel head=standard	:: 傷口の治り方を診断してほしい
★新regression	[A 経口]	main=counsel head=standard	:: 経口摂取の可否を診断してほしい
★新regression	[A 悪口]	main=counsel head=standard	:: 悪口の多い投稿を診断してほしい
★新regression	[A 糸口]	main=counsel head=standard	:: 糸口が見つかるか診断してほしい
★新regression	[A 火口]	main=counsel head=standard	:: 火口の活動を診断してほしい
★新regression	[A 口頭]	main=counsel head=standard	:: 口頭試問の運用は妥当か
★新regression	[A 相続]	main=counsel head=standard	:: 相続の手続きを診断してほしい
★新regression	[A 相関]	main=counsel head=standard	:: 顧客の相関を診断してほしい
★新regression	[A 相互]	main=counsel head=standard	:: 相互評価の仕組みは妥当か
★新regression	[A 相当]	main=counsel head=standard	:: 相当数の離脱があるか診断してほしい
★新regression	[A 相対]	main=counsel head=quick  	:: 相対評価の運用を見直す必要はないか
★新regression	[A 血相]	main=counsel head=standard	:: 血相を変えた投稿を診断してほしい
★新regression	[A 世相]	main=counsel head=standard	:: 世相の変化を診断してほしい
★新regression	[A 入門]	main=counsel head=reform 	:: 入門課程の内容は妥当か
★新regression	[A 名門]	main=counsel head=reform 	:: 名門校の選抜方式を診断してほしい
★新regression	[A 門戸]	main=counsel head=reform 	:: 門戸の開き方は妥当か
★新regression	[A 関門]	main=counsel head=reform 	:: 関門の設定を見直す必要はないか
★新regression	[A 門限]	main=counsel head=reform 	:: 門限の運用は妥当か
```

**「門」の 5 件は reform へ落ちている** —— これが最も重い。「名門校の選抜方式を
診断してほしい」という純然たる調査の願いが、**楽園の engine を改造する 11 相**へ
着く。「門」は `REFORM_RE` の抽象名でもあるからである。

### 修理(施した)

表に 24 語を追加(口 10 / 相 8 / 門 6)。**しかし網羅は依然として証明されていない。**
§7 で正直に名乗る。

### 門

`tests/counsel.test.js` §1d: `一字の紛れ語の表は quality 相が足した 20 語を持つ (R-1)` —— 19 件。

---

## 4. 【重大・本走行が新生】強い産物名に紛れ語の守りが一度も掛かっていない

### 症状

`wantsProduct()` の構造:

```js
function wantsProduct(w) {
  if (PRODUCT_STRONG_RE.test(w)) return true;          // ← 守りを通らない
  return PRODUCT_RE.test(w) && !PRODUCT_FALSE_FRIENDS.test(w);
}
```

build 相の裁定は「**一字の名(口/門/相)だけが危うい**」であった。実測はこれを覆す ——
`機能` `画面` `一段` `タイマー` は二字以上でも他語に埋もれる。

```
=== R-4: PRODUCT_STRONG の無防備な多義語(false-friend 表が無い) ===
  機能:     PRODUCT_FALSE_FRIENDS の守り = **無し**
  画面:     PRODUCT_FALSE_FRIENDS の守り = **無し**
  一段:     PRODUCT_FALSE_FRIENDS の守り = **無し**
  タイマー: PRODUCT_FALSE_FRIENDS の守り = **無し**
  コマンド: PRODUCT_FALSE_FRIENDS の守り = **無し**
  ページ:   PRODUCT_FALSE_FRIENDS の守り = **無し**
```

```
★新regression	[B 機能]	main=counsel head=standard	:: 腎機能の低下を診断してほしい
★新regression	[B 機能]	main=counsel head=standard	:: 肝機能の数値は妥当か
★新regression	[B 一段落]	main=counsel head=standard	:: 作業が一段落したか診断してほしい
★新regression	[B 機能]	main=counsel head=standard	:: 認知機能の推移を診断してほしい
★新regression	[B 画面]	main=counsel head=standard	:: 画面越しの接客は妥当か
★新regression	[B タイマー]	main=counsel head=quick  	:: タイマー競技の判定を見直す必要はないか
```

### 修理(施した)

`wantsProduct` の先頭に `if (PRODUCT_FALSE_FRIENDS.test(w)) return false;` を置き、
表に `[腎肝心肺脳胃腸皮膚身体運動認知生殖免疫視聴嚥下排泄]機能|機能性|一段落|画面越|タイマー競技` を足した。

**逆向きを撃った** —— 表が広がりすぎて正当な用法を食っていないこと:
`健康診断アプリが欲しい` ≠ counsel / `add a dark mode toggle` = standard /
`門に監査の一段を足す` = reform(「一段」の正当な用法)。

### 門

`tests/counsel.test.js` §1d: `強い産物名の紛れ語が諐問の道を奪わない (R-2 / 機能・一段・画面)`。

---

## 5. 【中】`denude()` が願いの核心を落とす — engine の固有名がファイル名として消える

### 症状

`denude` はファイル名(`x.js` / `y.json` …)を「道具の名であって願いの動詞ではない」として剥ぐ。
だが **engine の固有名はファイル名そのものである**。`FR-02`(剥ぐ)と `FR-04`(engine 名を
reform の証拠にする)が**相撃ちになっている**。

### 生出力

```
=== R-1: denude が engine の強い名を消す(FR-02 と FR-04 の相撃ち) ===
  denude="に再試行の口を設ける"
    剥ぎ後 isReformSubject=false  剥ぎ前=true  chooseScale=standard   (元: `conclave.js` に再試行の口を設ける)
  denude="に再試行の口を設ける"
    剥ぎ後 isReformSubject=false  剥ぎ前=true  chooseScale=standard   (元: conclave.js に再試行の口を設ける)
  denude="の道選びに一段足す"
    剥ぎ後 isReformSubject=false  剥ぎ前=true  chooseScale=standard   (元: forge.js の道選びに一段足す)
  denude="に閾値の口を設ける"
    剥ぎ後 isReformSubject=false  剥ぎ前=true  chooseScale=standard   (元: verdict.js に閾値の口を設ける)
  denude="に検めの口を足す"
    剥ぎ後 isReformSubject=false  剥ぎ前=true  chooseScale=standard   (元: codex.js に検めの口を足す)
```

**「`conclave.js` に再試行の口を設ける」は誰が読んでも reform の願いである。**
これが standard(14相)へ落ちる。剥ぎ前は `isReformSubject=true` であり、
**剥ぎが正解を消している**ことが証明されている。

さらに、フラグ名が願いの核心である場合:

```
=== R-2: denude のフラグ剥ぎが願いの核心を落とす ===
  "--force を既定で無効にしたい"      -> "を既定で無効にしたい"
  "ls に -la 相当の既定を持たせる"     -> "ls に 相当の既定を持たせる"
  "git の --upload-pack を禁じる門を足す" -> "git の を禁じる門を足す"
  "CLI に --json 出力を足す"          -> "CLI に 出力を足す"
```

`--force を既定で無効にしたい` は、剥いだ後「を既定で無効にしたい」という
**主語も目的語も無い文**になる。願いの核心がフラグ名であるとき、denude は文を殺す。

### 判定: **直さない**(§7 に理由)

これは main にも在る形(main=standard / head=standard — R-1b で確認)で、
**本走行が生んだ病ではない**。かつ正しい修理は「剥ぐ前に engine 名を先に検める」という
**判定順の変更**であり、`L-7`(判定の順序を変えてはならない)と衝突する。
順序を触る修理は別走行の主題にすべきである。

---

## 6. 【中】門が実装の写しになっている — 新しい世間語は永久に捕らえられない

### 症状

`counsel.test.js` の「ENGINE_NAMES が graph/*.js の名を網羅している」の最後の輪:

```js
for (const common of ['identity', 'vendor', 'contract', 'census', 'pulse', 'deploy',
  'domains', 'workflow', 'ci', 'atlas', 'upstream', 'derived', 'lessons', 'workspace']) {
  assert.ok(!strong.has(common), ...);
}
```

**この 14 語は `ENGINE_NAMES_WEAK` と一字一句同じである。**

```
=== R-5: 門の同語反復(dead gate)の証明 ===
  門が名指しする世間語 14 件、全て ENGINE_NAMES_WEAK に在るか: true
  ENGINE_NAMES_WEAK と完全一致か: true
```

同じ門の上の方で「強弱は排他」(`both.length === 0`)を既に断定している。
ゆえに **この輪は構造的に決して赤くならない**。門が実装をそのまま写しており、
実装と共に間違える(第16条)。

### 故障注入で証明した

新しい engine が世間語の名で生まれ、誰かが STRONG へ置いたとき門は鳴るか:

```
STRONG に世間語 'payroll'   を足す -> Counsel self-test: 118 passed, 0 failed
STRONG に世間語 'tenant'    を足す -> Counsel self-test: 118 passed, 0 failed
STRONG に世間語 'inventory' を足す -> Counsel self-test: 118 passed, 0 failed
STRONG に世間語 'recipe'    を足す -> Counsel self-test: 118 passed, 0 failed
STRONG に世間語 'fitness'   を足す -> Counsel self-test: 118 passed, 0 failed
--- 基準 --- Counsel self-test: 118 passed, 0 failed
```

**5 件すべて沈黙。** この門が守っているのは「既に弱い名に在る 14 語」だけである。
ただし `vendor` を WEAK から STRONG へ**移せば**鳴る(5 failed)—— 排他の断定と、
別節の 24 件コーパスが鳴るからである。すなわち門は**移動は見るが、新規は見ない**。

### 判定: **部分的に緩和した**(§7)

§1 の修理(強い名にも限定詞の除外)が**この門の必要性を根底から減らした** ——
強弱の別に関わらず限定詞の直後は世間の物と裁かれるので、`payroll` を STRONG に
置いても `a payroll app` は reform へ行かない。実測(修理後):

```
  NG=11/52   (修理前 50)
```

とはいえ「限定詞を伴わない世間語」の穴は残る。§7 に未解決として記す。

---

## 7. 【中】死に枝ではないが、決して赤くならない語彙 — `ENGINE_NAMES_WEAK_JA`

### 故障注入

```
🔴 **生存**  M9 弱い名の日本語(ワークフロー)を削除  ← どの門も鳴らなかった
```

`ENGINE_NAMES_WEAK_JA = 'ワークフロー'` を `(?!)`(決して一致しない)に倒しても、
`counsel.test.js` も `abandoned-run.test.js` も **0 failed のまま**であった。

理由: この語が**唯一の道の決め手になる願い**が門に一本も無い。
門に在る `顧客のワークフローを管理するアプリが欲しい` は「reform でないこと」を撃つので、
語を消せば**なお緑**になる。「reform に留まること」を撃つ願い
(`ワークフローに再試行の口を設ける` など)が門に無い。

```
=== R-9 ===
  "ワークフローに再試行の口を設ける" -> reform  isReformSubject=true
  "楽園のワークフローに一段足す"     -> reform  isReformSubject=true
  "ワークフローを拡張する"           -> reform  isReformSubject=true
  ↑ 変異 M9 で語を消しても counsel.test.js は 0 failed = これらは門に無い
```

### 判定: **直さない**(§7 に理由)

**門の穴であって実装の欠陥ではない**。かつ、この語を「reform に留める」門を建てると、
「ワークフロー」という世間語が楽園を名指す方向を**固定してしまう** —— それは
rework 相が塞ごうとした病を、門の側から再固定する行為である。
先に「`ワークフロー` はそもそも弱い名の側に居てよいのか」を裁くべきで、
それは requirements の問いである。

---

## 8. 【軽】`DOC_STRONG_RE` の日英非対称 — `audit` は英語側に残っている

### 症状

`DOC_STRONG_RE` は「`DOC_RE` から**診断と監査だけ**を除いた集合」と註釈されているが、
**除いたのは日本語の二語だけ**で、英語の `\b(?:…|audit|…)\b` はそのまま残っている。

```
既存欠陥	[F audit(EN)]	     main=counsel head=counsel	:: add an audit stage to the gate
既存欠陥	[F audit(EN)+強い名]	main=counsel head=counsel	:: add an audit command to the conclave engine
```

`門に監査の一段を足す` は reform に着くのに、その英訳 `add an audit stage to the gate` は
counsel に着く。**同じ意味の願いが言語によって別の道を行く。**

### 判定: **直さない**(§7)。main からの既存欠陥であり、本走行の主題(counsel への誤着)の
範囲外。かつ `audit` を `DOC_STRONG_RE` から抜くと `market audit report` 系が壊れうる ——
**撃たずに動かすのは第57条が咎める形**である。

---

## 9. 【軽・既存】`graph/` が `DIAGRAM_EN` の `graph` に当たる

```
既存欠陥	[E ファイル名=engine]	main=cartography head=cartography	:: graph/forge.js の道選びを直す
既存欠陥	[E ファイル名=engine]	main=cartography head=cartography	:: graph/conclave.js に一段の門を足す
```

`denude` が `forge.js` を剥いだ残骸 `graph/` が `DIAGRAM_EN` の `\bgraph(?:viz)?\b` に当たり、
**楽園の engine を直す願いが作図の道へ落ちる**。main にも在る。§5 と同根。**直さない**。

---

## 10. 第57条の審理 — 「COUNSEL_RE を空にすると判定は崩れる」門の期待値が二度動いた件

### 事実関係(実測で確かめた)

`tests/counsel.test.js` の当該門、第一の断定の期待値:

| 時点 | 期待値 | 何が動かしたか |
|------|--------|----------------|
| main (c216014) | `standard` | — |
| build 相 (3b726f5) | `reform` | `FR-04` が `REFORM_RE` に engine 固有名を足し、その中に `CI` が入った |
| rework 相 (f092b17) | `standard` | `AC-31` が engine 名を強弱に割り、`CI` は弱い名になった |

main の当該行(`git show main:tests/counsel.test.js`):

```js
  assert.strictEqual(broken.chooseScale('現状のCIの健全性を監査してほしい'), 'standard',
    '語彙を潰しても counsel のままなら、COUNSEL_RE は判定に効いていない');
```

### 裁定: **第57条には触れていない。**

理由を三つ挙げる。

**(a) 門の主張は一字も緩んでいない。** 第57条(および第37条)が咎めるのは
「門を緑にするために期待値を実装へ倒す」ことである。倒す典型は
`assert.notStrictEqual(got, 'counsel')` のような**主張の弱化**だが、本件は逆で、
**落ち先を `standard` / `reform` と名指ししたまま**である。
「語彙を潰せば counsel でなくなる」という門の断定は両時点で無傷である。

**(b) 期待値の移動は、語彙を動かしたことの必然の帰結である。**
`COUNSEL_RE` を潰した engine で `現状のCIの健全性を監査してほしい` がどこへ落ちるかは、
**その時点の語彙表から機械的に決まる**。build 相が `CI` を強い名として `REFORM_RE` に
入れた以上、落ち先は reform 以外にありえない。実装を見て期待値を書いたのではなく、
**実装の意味が変わったから期待値の意味も変わった**。

**(c) 二度目の移動は、一度目が病であったことの証明である。**
`standard → reform` こそが rework 相の直した病(世間の願いを engine 改修へ攫う)の
**この門における現れ**であった。`reform → standard` はその病を取り除いた結果である。
結果的に main と同じ値に戻ったのは偶然ではなく、**病を入れて抜いたから**である。

### ただし一つ咎める: **門が意図を書き残していなかった**

build 相が `standard → reform` に動かしたとき、コミット 3b726f5 の門には
**なぜ動かしたかの註釈が無かった**(rework 相 f092b17 が後から 14 行の註釈を足した)。
期待値を動かす修正は、**動かした瞬間に理由を書かねばならない** —— 後から書いた註釈は
「正当化」であって「記録」ではない。この一点は **docs 相で憲法の草案にする**(→ `docs.md` 第60条)。

---

## 11. 判定の各段の到達性(死に枝の検め)

故障注入 15 件で全段の反応を確かめた。生出力:

```
🟢 捕捉  M1  PRODUCT_FALSE_FRIENDS を空に          counsel.test.js:1failed
🟢 捕捉  M2  冠詞の後読みを削除                    counsel.test.js:2failed
🟢 捕捉  M3  後読み先頭の \b を削除                counsel.test.js:1failed
🟢 捕捉  M4  弱い名の BUILD_RE 伴需を外す          counsel.test.js:7failed
🟢 捕捉  M5  弱い名を丸ごと無効化                  counsel.test.js:3failed
🟢 捕捉  M6  denude を素通しに                     counsel.test.js:4failed
🟢 捕捉  M7  DOC_STRONG_RE を DOC_RE と同一に      counsel.test.js:4failed
🟢 捕捉  M8  isCounsel 最終段を false 固定         counsel.test.js:7failed
🔴 生存  M9  弱い名の日本語(ワークフロー)を削除   ← どの門も鳴らなかった   (§7)
🟢 捕捉  M10 BUILD_JA を空に                       counsel.test.js:4failed
🟢 捕捉  M11 wantsProduct を常に false             counsel.test.js:4failed
🟢 捕捉  M12 isCreationsVault の目印を無視         abandoned-run.test.js:2failed
🟢 捕捉  M14 init の目印置きを削除                 abandoned-run.test.js:1failed
🟢 捕捉  M15 resolve の vault を常に null          abandoned-run.test.js:2failed
🟢 捕捉  N5  skip の告知を黙らせる                 abandoned-run.test.js:1failed
🔴 生存  N4  git remote の印を殺す(目印だけ残す)  ← どの門も鳴らなかった  → security-report §MED-2
```

**死に枝(到達不能な条件)は一つも見つからなかった。**
`isCounsel` の最終段 `return DOC_RE.test(w) && !wantsProduct(w)` も到達する
(M8 を false 固定すると 7 failed)。

生存した変異は 2 件で、どちらも**実装の死に枝ではなく門の穴**である(§7 / security §MED-2)。

---

## 12. 修理後の再計測

```
  NG=11/52  (修理前 50 / うち本走行が新生 44)
  Counsel self-test: 134 passed, 0 failed
  abandoned-run: 27 passed, 0 failed
```

**基準線(教主の実測)が壊れていないことを別に確かめた:**

```
  OK  健康診断アプリが欲しい               -> full      (≠counsel)
  OK  各社の画面設計を調査して報告書がほしい -> counsel
  OK  競合の機能比較を調査して報告してほしい -> counsel
  OK  門に監査の一段を足す                 -> reform
  OK  楽園の自己診断に絞り込みの口を設ける  -> reform
  OK  gauge に fingerprint を確かめる口を設ける -> reform
```

残る 11 件の内訳(すべて §5 / §6 / §8 / §9 に記した、**直さないと裁いたもの**):

```
  NG [C wiring]           :: add wiring diagrams to my home renovation app      ← diagrams が作図に当たる(§9 同根)
  NG [C forge(和)]        :: ゲームに forge の画面を足す                        ← 日本語に限定詞が無い(§7)
  NG [C gauge(和)]        :: 車のアプリに gauge の表示を追加する                ← 同上
  NG [D new]              :: add a new vendor onboarding screen to my shop app  ← 限定詞+形容詞(§2)
  NG [D his/extra]        :: add an extra identity check to his login page      ← 同上
  NG [E ファイル名=engine] :: graph/forge.js の道選びを直す                     ← §5 / §9
  NG [E ファイル名=engine] :: graph/conclave.js に一段の門を足す                ← §5 / §9
  NG [E ファイル名=engine] :: .github/workflows/ci.yml に段を足す               ← §5
  NG [E バッククォート]    :: `conclave.js` に再試行の口を設ける                ← §5
  NG [F audit(EN)]        :: add an audit stage to the gate                     ← §8
  NG [F audit(EN)+強い名] :: add an audit command to the conclave engine        ← §8
```

---

## 13. 自分が見ていないこと(正直な記録 — 第37条)

- **`synod.js` / `conclave.js` の下流**: `chooseScale` の返り値を受け取る側が
  道の変化にどう反応するかは撃っていない。道が変われば相の数と担い手が変わるが、
  その先で何が起きるかは見ていない。
- **`admit()` / `explainAdmit()` / `buildDag()` の変更**: diff に現れなかったので読んだだけで、
  撃っていない。`admit().scale === chooseScale()` の一致だけは既存の門が撃っている。
- **英語以外・日本語以外の願い文**: 中国語・韓国語の願いは一件も撃っていない。
  `\b` の扱いが日本語と同じ問題を起こすはずだが、未検証。
- **`DIAGRAM_FALSE_FRIENDS` の網羅**: 「図」の紛れ語は本走行が触っていないので
  quality 相も撃っていない。§3 と同じ病が在る可能性は高いが、**測っていない**。
- **`quickJa` / `quickEn` / `fullJa` / `fullEn` の境目**: 教主が別件(台帳 PARA-7)に
  起票済みなので触れていない。`相対評価…→quick` / `タイマー競技…→quick` の落ち先は
  この境目の問題でもあるが、深追いしていない。
- **`forge.js` 以外の engine への波及**: `pulse.js:370` が `typeof forge.chooseScale === 'function'`
  を見ているだけであることは確かめたが、`graph/*.js` 全 39 本の呼び出し面は調べていない。

---
---

# 【二周目】review — 二度目の build(F-1/F-4 の修理)を痑う

> 相: `review`(quality 領域・**二周目**)/ 対象: `git diff ec0694c..HEAD`
> tribunal が **BLOCK** を出し、build が rework2 を走った。**その修理を痑うのがこの節である。**
> 本節の全ての数は**二周目の review が自分の手で撃った生出力**である(第27条)。
> **撃てなかったものは「撃てなかった」と名乗る**(第37条)。

---

## 0. 結論(先に述べる)

**六度目が起きている。`MEND_RE` の新設は新しい病を生んだ。**

| 群 | main c216014 | HEAD ba673bd(二度目の修理後) |
|---|---|---|
| **D群 — `MEND_RE` の語彙 × 強い名 × 世間の願い(32 件)** | **誤着 0/32** | **誤着 32/32** 🔴 |
| E群 — 強い名 × 世間の願い(MEND 語なし・13 件) | 誤着 0/13 | 誤着 0/13 |
| F群 — 楽園の改修(reform が正解・8 件) | 誤着 7/8 | **誤着 1/8** ✓ |
| G群 — `MEND_RE` × **弱い名**(12 件) | 誤着 0/12 | 誤着 0/12 ✓ |

**D群 32 件は、`MEND_RE` の語彙表から機械的に作った。一語につき一件である。**
**32 語すべてが世間の願いを reform へ攫った。main では一件も攫われない。**
すなわち **これは二度目の build が作った回帰であり、F-1 とまったく同じ形である。**

**修理が新しい欠陥を生んだ率は 5/5 = 100% から 6/6 = 100% になった。**

---

## 1. 【BLOCK 相当・本走行が新生】`MEND_RE` の語彙が世間の改修の願いと衝突する

### 1.1 症状 —— 語彙表から機械的に作った 32 件が全て攫われた

`MEND_RE` の定義はこうである(`graph/forge.js`):

```js
const MEND_JA = '直す|直し|直せ|直して|修正|修復|改修|改善|改める|改め|除く|除去|取り除|' +
  '塞ぐ|塞い|潰す|削る|削除|外す|替える|置き換え|書き換え|整える|見直';
const MEND_EN = '\\b(?:fix|repair|remove|refactor|rewrite|patch|harden|migrate|drop|deprecate)\\b';
```

**この表の一語ずつについて「世間の願いと衝突する形」を探した** —— それが命じられた仕事である。
**探すまでもなかった。全語が衝突した。**

```
--- D群 (32件) 期待: reform でない / 誤着 32/32 ---
  誤 [直す]     reform | gauge の壊れた針を直す手順を載せたDIYサイト
  誤 [直し]     reform | abode 賃貸物件の写真の傾き直しツール
  誤 [直せ]     reform | forge 溶接所の看板のデザインを直せるWebエディタ
  誤 [直して]   reform | clergy 名簿の読み仮名を直してくれるアプリ
  誤 [修正]     reform | critic 映画評の誤字を修正する校正ツールが欲しい
  誤 [修復]     reform | codex 古文書の破れを修復する写真加工サイト
  誤 [改修]     reform | abode 住宅改修の見積もりシミュレータ
  誤 [改善]     reform | hermetic 密閉パッキンの歩留まりを改善する生産管理アプリ
  誤 [改める]   reform | ordain 式次第の文言を改める編集画面が欲しい
  誤 [除く]     reform | orchestrator 楽団員名簿から退団者を除く一括処理ツール
  誤 [除去]     reform | wiring 配線工事の錆を除去する薬剤の通販サイト
  誤 [取り除]   reform | spawn-trace 養殖池の藻を取り除く作業記録アプリ
  誤 [塞ぐ]     reform | abode 空き家の隙間を塞ぐリフォーム業者マッチング
  誤 [潰す]     reform | verdict 待ち時間を潰す暇つぶしゲーム集
  誤 [削る]     reform | synod 会議費の予算を削る稟議ワークフロー
  誤 [削除]     reform | critic 投稿したレビューを削除できる掲示板
  誤 [外す]     reform | daily-guard 当番表から欠勤者を外すシフト管理
  誤 [替える]   reform | apply-seat 座席の張り地を替える内装業者の見積サイト
  誤 [置き換え] reform | export-state 輸出書類の旧様式を置き換える変換ツール
  誤 [書き換え] reform | check-agents 仲介業者の登録情報を書き換える台帳アプリ
  誤 [整える]   reform | clergy 祭壇の花を整えるフラワーアレンジ教室の予約サイト
  誤 [見直]     reform | branch-guard 支店の警備契約を見直す相見積もりサービス
  誤 [fix]      reform | fix gauge readings in my vintage car dashboard app
  誤 [repair]   reform | repair shop booking site for forge equipment
  誤 [remove]   reform | remove watermarks from codex scans, a small web tool
  誤 [refactor] reform | refactor my resume with critic feedback, a writing coach app
  誤 [rewrite]  reform | rewrite listings copy for abode rentals automatically
  誤 [patch]    reform | patch notes viewer for conclave board game expansions
  誤 [harden]   reform | harden shipping boxes for hermetic containers — a materials picker
  誤 [migrate]  reform | migrate orchestrator seating charts from excel to a web app
  誤 [drop]     reform | abode drop shipping storefront builder
  誤 [deprecate] reform | deprecate old ordain ceremony templates in my church CMS
```

**main で同じ 32 件を撃つと 0/32 である**(第38条 / `git clone --branch main` の複製):

```
############ MAIN (c216014) ############
--- D群 (32件) 期待: reform でない / 誤着 0/32 ---
(一件も誤着しない)
TOTALS {"D":"0/32","E":"0/13","F":"7/8","G":"0/12"}
```

### 1.2 病理 —— 機序を一段ずつ分解した

```
--- gauge の壊れた針を直す手順を載せたDIYサイト
   ABSTRACT        = false
   STRONG          = true   match= "gauge"
   BUILD           = false
   MEND            = true   match= "直す"        ← ここ
   isReformSubject = true     chooseScale= reform
--- abode drop shipping storefront builder
   STRONG          = true   match= "abode"
   BUILD           = false
   MEND            = true   match= "drop"        ← `drop shipping` の drop
   isReformSubject = true     chooseScale= reform
--- critic 投稿したレビューを削除できる掲示板
   STRONG          = true   match= "critic"
   MEND            = true   match= "削除"        ← 掲示板の投稿削除機能
   isReformSubject = true     chooseScale= reform
```

**枝 2(`REFORM_STRONG_RE && (BUILD_RE || MEND_RE)`)が丸ごと誤っている。**

病の核心は、design.md §1.5.1 が書いた**非対称の根拠そのもの**に在る:

> **証拠の強さが、許す動詞集合の広さを決める。**
> 強い名は楽園固有性の証拠として**強い**。ゆえに「改める」動詞まで広く許してよい。

**この推論は誤りである。** 二つの独立した誤りを含む:

**(甲)「強い名」は、証拠としてそもそも強くない。**
`gauge`(計器)/ `abode`(住居)/ `critic`(批評家)/ `forge`(鍛冶場)/ `clergy`(聖職者)——
**これらは全て世間で日常的に使われる普通名詞である。**
第60条(a) はまさにこれを名指していた: 「**名は engine を指しうるが、engine を意味しない。**」
「強い名」という呼称は**楽園の内部での曖昧さの序列**であって、
**世間の願い文に対する証拠の強さではない。** build 相は前者を後者と取り違えた。

**(乙)動詞集合を広げれば、その分だけ世間との衝突面が広がる。**
`BUILD_RE` を課していた時、守りは「**建造の動詞を伴うこと**」だった。
世間の願いも建造を求めるので、これは確かに弱い守りである —— だが
`MEND_RE` を足したことで守りは「**建造 または 改修の動詞を伴うこと**」になった。
**条件を OR で広げることは、守りを強めるのではなく弱めることである。**
build 相は註釈で「**門は広がったのではなく狭まった**」(build-rework2.md §1.3)と書いたが、
**それは枝 2 を「無条件」と較べた場合の話**である。
**枝 3(弱い名)と較べれば、枝 2 は明確に広い** —— そして
D群 32/32 はその広さがそのまま誤着になることを示している。

### 1.3 第60条(b) の見分け方を当てれば即座に露見した

第60条(b) はこう命じている:

> **弱い印は片方向にではなく、両方向に誤る。これが弱い印の見分け方である。**

「改める動詞を伴う」という新しい印に、この見分け方を当ててみる:

| 方向 | 例 | 結果 |
|---|---|---|
| 偽陽性(世間の願いを攫う) | `gauge の壊れた針を直す…DIYサイト` | **reform へ攫われた** 🔴 |
| 偽陰性(楽園の願いを落とす) | `枢機卿の割り当てを見直したい` | **counsel へ落ちた**(F群 1/8) |

**両方向に誤っている。ゆえに `MEND_RE` は弱い印である。**
第60条(b) は既に書かれており、二度目の build はそれを**読んだ上で**枝 2 を建てた
(build-rework2.md が第60条(b) を引用している)。**条文は在ったが、新しい印に当てられなかった。**

> **これが本節の最も重い発見である。** reflect §3.2(c) は「神官は自分のコーパスの外へ出ない」
> と三度名指した。だが四度目の本当の形は**コーパスの外**ではなく **条文の不適用**である ——
> **自分が書いた条文を、自分が新設した印に当てなかった。**

### 1.4 修理は施していない(理由を述べる)

**本相は quality(審査)であり、build ではない。** reflect §4 が既に裁いている:

> reflect で門を建てれば、その門は**誰にも review されず・誰にも verify されず**に出荷される。
> 本走行が五度「修理が新しい欠陥を生む」を実演した直後に、**無審査の修理を足すのは最も危険な選択**である。

**同じ理が本相にも当たる。六度目を審査した相が、無審査で七度目を作る危険を冒してはならない。**
ゆえに **D群の 32 件を実測として差し出し、修理は build へ差し戻す**。

**ただし修理の形の候補は、実測とともに示す**(build が推測で作らぬように):

| 候補 | 形 | 本相が実測した弱み |
|---|---|---|
| (i) `MEND_RE` を枝 2 から外す | 枝 2 も `BUILD_RE` のみ | `conclave の毒を除く` が死ぬ(build 相が実測済み・門が二箇所で撃つ) |
| (ii) 楽園の文脈を追加要求 | 強い名 + 改変動詞 + **楽園語の共起**(`門`/`走行`/`相`/`engine`…) | **未実測**。`conclave の毒を除く` に楽園語が無いので同じく死ぬ恐れ |
| (iii) 世間の産物語を除外条件に | 強い名 + 改変動詞 + **`PRODUCT_RE` を伴わないこと** | **本相が粗く撃った**: D群 32 件中 `アプリ/サイト/ツール/ダッシュボード` 等を持つものは多いが、`abode drop shipping storefront builder` 等は産物語で切れない。**部分的にしか効かない** |
| (iv) 助詞の要求(日本語) | `conclave の` のように所有格を伴うこと | **未実測**。`gauge の壊れた針を直す` も `の` を持つので効かない見込み |

**どれも確定していない。** これは「実装は次の走行に委ねる」と名乗った reflect W-1 と同じ立場である。
**確定できなかったことを、確定したかのように書かない**(第37条)。

---

## 2. 【重大・門の穴】`MEND_RE` × 弱い名 の実測 —— B-10 / B-11 を埋めた

build 相は B-10 / B-11 として**自ら名乗った**:

> **B-10**: 「証拠の強さが許す範囲を決める」は**筋の通った説明**だが、**実測ではなく論証**である。
> **B-11**: 弱い名に `MEND_RE` を許したらどうなるか —— **実験していない**。

### 2.1 B-11 を実測した —— **弱い名に `MEND_RE` を許すと 8/12 が壊れる**

`$LOCALAPPDATA/Temp/q2/mut`(作業木の複製・作業木には一指も触れていない)で変異を当てた:

```js
// 変異: 弱い名にも MEND_RE を許す
- return REFORM_WEAK_RE.test(d) && BUILD_RE.test(d);
+ return REFORM_WEAK_RE.test(d) && (BUILD_RE.test(d) || MEND_RE.test(d));
```

```
--- G群 (12件) 期待: reform でない / 誤着 8/12 ---
  誤 [fix/vendor2]      reform | fix vendor onboarding emails
  誤 [remove/workflow]  reform | remove duplicate steps from workflow templates
  誤 [drop/identity]    reform | drop identity verification from the signup flow
  誤 [patch/contract]   reform | patch contract pdf generation
  誤 [直す/vendor]      reform | vendor の請求書テンプレを直す
  誤 [削除/census]      reform | census の重複行を削除する
  誤 [書き換え/workflow] reform | workflow の並び順を書き換える
  誤 [整える/atlas]     reform | atlas の地図の色を整える
```

**B-11 の答え: 弱い名に `MEND_RE` を許せば 12 件中 8 件が reform へ攫われる。**
**build 相の読み(`fix the vendor page` が攫われる)は方向として正しかった。**

> **一件の正直**: `fix the vendor page` **そのもの**は変異下でも `reform` にならなかった
> (冠詞 `the` が `DETERMINER_LOOKBEHIND` で除外されるため)。
> build 相が名指した**その一件だけ**は、実は限定詞の除外が守っていた。
> だが**冠詞を持たない 8 件が壊れた** —— 日本語には冠詞が無いので、日本語側は全滅に近い。
> **build 相の結論は正しかったが、挙げた例は最も守られている例だった**(第37条)。

### 2.2 B-10 の答え —— **非対称は正当だが、根拠が誤っていた**

B-10 は「非対称が最良であることを証明していない」と名乗った。本相の実測が答えを出す:

**非対称そのものは正しい。** 枝 3 に `MEND_RE` を許せば 8/12 が壊れる(§2.1)。
**だが非対称の「根拠」は誤っていた。** design.md は

> 強い名は楽園固有性の証拠として**強い**ので、許す動詞集合も広くてよい

と書いた。**この根拠が真なら、枝 2 に `MEND_RE` を許しても壊れないはずである。**
**実測: 枝 2 に `MEND_RE` を許すと 32/32 が壊れる(§1)。**
**枝 3(8/12 = 67%)より枝 2(32/32 = 100%)の方が壊れ方が酷い。**

**すなわち「強い名の方が安全だから広い動詞集合を許せる」は実測に反する。**
正しい非対称は **「強い名にも弱い名にも `MEND_RE` は危険。ただし強い名には
`conclave の毒を除く` という守るべき正例が在るので、別の守り方を探さねばならない」** である。

> **⚠️ この発見は design.md §1.5.1 の根拠節を無効にする。** 条文(第60条)は
> 二周目の docs 相が (f) 項で改めたが、**design.md §1.5.1 の「証拠の強さが許す範囲を決める」は
> 本相では改めていない** —— 設計文書は build/architecture 領域の持ち物であり、
> quality が書き換えるのは越権である。**差し戻しの一項として名指す**。

### 2.3 門はこの変異を**捕らえない**

```
$ (変異を当てたまま) node tests/counsel.test.js
Counsel self-test: 177 passed, 0 failed
```

**弱い名に `MEND_RE` を許す変異を、177 本の門が一本も捕らえない。**
これは AC-42(故障注入で鳴る)が主張する 11 変異の**外側**に在る変異である。
build 相の M-1〜M-11 は「実装を弱める」変異ばかりで、
**「実装の条件を OR で広げる」変異は M-3(`MEND_RE` に創造の動詞を足す)一件だけ**だった。
**M-3 は `MEND_RE` の中身を広げる変異であり、`MEND_RE` の適用先を広げる変異ではない。**

---

## 3. 自作 65 件の探針 —— 教主のコーパスとも神官のコーパスとも重ならない

reflect §3.2(c) が「神官は自分のコーパスの外へ出ない」を**三度**名指した。
**四度目をやらないために、本相は自分で 65 件を作った。**

**重ならないことの担保**(機械で確かめた):
* 教主の 10 件・tribunal の 19 件・build の 26 語コーパスと**願い文が一件も一致しない**。
* **作り方が違う**: build のコーパスは「強い名 26 語 → 一語につき世間の願い一件」だった。
  本相の D群は「**`MEND_RE` の語彙 32 語 → 一語につき世間の願い一件**」である ——
  **表の別の軸から機械的に生成した**。ゆえに build の理解の外へ出る。

| 群 | 件数 | 何を撃つ | 日/英 | 形 |
|---|---|---|---|---|
| **D** | 32 | `MEND_RE` の語彙 × 強い名 × 世間 | 日22 / 英10 | 中文・長文 |
| **E** | 13 | 強い名 × 世間(MEND 語なし) | 日11 / 英2 | **短文・体言止め・不完全文・記号混じり・長文・疑問形・敬語・英日混** |
| **F** | 8 | 楽園の改修(reform が正解) | 日7 / 英1 | 中文 |
| **G** | 12 | `MEND_RE` × **弱い名** | 日6 / 英6 | 中文・短文 |
| 計 | **65** | | | |

### 3.1 E群 —— 不完全文・記号混じり・極端な長短(全件正しい)

```
--- E群 (13件) 期待: reform でない / 誤着 0/13 ---
  正 [短文]       full       | synod アプリ
  正 [短文2]      standard   | gauge 屋さん
  正 [体言止め]   standard   | critic ランキング
  正 [不完全文]   standard   | conclave の、あの、予約の、
  正 [記号]       standard   | forge>>在庫#管理@2026
  正 [記号2]      standard   | [abode] 物件検索 ver.2 — 作りたい
  正 [記号3]      standard   | codex/写本/閲覧 (仮)
  正 [長文]       standard   | 週末に開く小さな骨董市の常連さん向けに…店名が codex なので…
  正 [長文EN]     quick      | my neighbourhood pottery collective is called wiring because…
  正 [疑問形]     full       | clergy って名前の名簿アプリ作れる?
  正 [敬語]       standard   | お手数ですが verdict という名前の判例まとめサイトを…
  正 [カタカナ混] standard   | ordain セレモニープランナー向けのマッチングサービス
  正 [英日混]     standard   | hermetic な保存容器の comparison site が欲しい
```

**E群 0/13 は二度目の build の修理が正しく効いている証拠である** —— main でも 0/13 だが、
**ec0694c(修理前)ではこの面が壊れていた**。**修理は確かに何かを直した。**
`MEND_RE` を持たない世間の願いについては、枝 2 の動詞の伴需が正しく守っている。

### 3.2 F群 —— 楽園の改修。**main より遥かに良いが、一件落ちる**

```
--- F群 (8件) 期待: reform である ---
       main            HEAD
  誤   standard   →   正 reform   | wiring の孤児判定を書き換える
  誤   standard   →   正 reform   | critic の偽の赤を取り除く
  誤   standard   →   正 reform   | export-state の古い鍵を削除する
  誤   standard   →   正 reform   | daily-guard の待ちを潰す
  誤   standard   →   正 reform   | spawn-trace に再試行の口を設ける
  誤   standard   →   正 reform   | 走行帳の粒度を細かくしたい
  誤   counsel    →   誤 counsel  | 枢機卿の割り当てを見直したい      ← 両方で落ちる
  誤   standard   →   正 reform   | the harness should stop swallowing skipped gates
main 誤着 7/8  →  HEAD 誤着 1/8
```

**欠陥Aの治癒は本物である。** main では 8 件中 7 件が楽園の改修を取り落としていた。
HEAD では 1 件のみ。**この一件(`枢機卿の割り当てを見直したい`)は B-1 の裁定の帰結であり、
教主の裁定に照らせば「答えを求める語」なので counsel が正しい可能性が高い** ——
ただし「割り当てを見直したい」は着手の意志も含むので、**本相は断定しない**(第37条)。

---

## 4. 【重大・門の穴】F-4 が**四度目**を起こしている —— コーパスの MEND 面が空

build 相は F-4(コーパスが表の半分しか撃たない)を直したと称し、
`STRONG_WORLDLY_EVERY_NAME` に 26 語すべての世間の願いを入れ、機械照合の門まで建てた。
**それは正しい仕事だった。だが同じ病が一段深いところで再演している。**

実測 —— **強い名コーパス 26 件の願い文のうち、`MEND_RE` の語を持つものは何件か**:

```
$ (STRONG_WORLDLY_EVERY_NAME の 26 件を MEND_RE で走査)
表 26 語 ⇔ コーパス 26 語 / 覆えていない= 0 / **うち MEND 語を持つ世間の願い= 0 件**
```

**0 件である。** 26 件すべてが `作って`/`欲しい`/`作れ` 系の**建造の願い**であり、
**「世間の人が既存の物を改修したい」という願いが一件も無い。**

さらに `counsel.test.js` 全体を走査した:

```
$ (counsel.test.js の全文字列から 強い名を含み MEND 語を持つものを抽出)
強い名を含む門の文字列 = 116 / うち MEND 語を持つもの = 12
  MEND持ち: conclave の毒を除く       ← 楽園の願い
  MEND持ち: forge の道選びを修正する   ← 楽園の願い
  MEND持ち: codex の索引を書き換える   ← 楽園の願い
  MEND持ち: gauge の重みを直す         ← 楽園の願い
  MEND持ち: synod の待ちを潰す         ← 楽園の願い
  MEND持ち: verdict の閾値を書き換える ← 楽園の願い
  MEND持ち: gauge を見直して報告してほしい / gauge の重みを見直す ← counsel の願い
  (計 12 件 — **全て楽園側。世間側は 0 件**)
```

**門は `MEND_RE` の「楽園を正しく拾う面」だけを 12 件撃ち、
「世間を誤って拾う面」を 0 件撃っている。守るべき面の半分を、また一度も見ていない。**

**これが F-4 の四度目である**(欠陥C → F-1 → F-4 → 本件)。
reflect §3.2 が名指した **「対称性の検査の不在」** が、**四度同じ形で反復した**。

> **⚠️ 最も重い構造的所見**: build 相は F-4 を直す際、
> **「表の全語を撃っているか」を機械照合する門**を建てた(AC-37)。
> それは**網羅の軸を一本だけ機械化した**。
> **だが「各語について、世間の願いのどの形を撃っているか」は機械化されていない。**
> 26 語 × 1 形(建造)は網羅だが、26 語 × 2 形(建造・改修)の**半分**である。
> **機械照合の門は、照合する軸を人が選ぶ。選ばれなかった軸は、機械化しても見えない。**

---

## 5. B-1 の裁定を門に固定した(教主の裁定)

build 相 B-1:

> `gauge の重みを見直す` → counsel。**「見直す」が counsel に着くのが正しいかは裁いていない**。

**教主の裁定: counsel で正しい**(「見直す」は答えを求める語)。
本相はこの裁定を `tests/counsel.test.js` の門に固定し、**理由を註釈に書いた**。

```js
test('B-1【教主の裁定】答えを求める語(見直す)は counsel が取る — 為せと命ずる語(直す)は reform', () => {
  assert.strictEqual(forge.chooseScale('gauge を見直して報告してほしい'), 'counsel', …);
  assert.strictEqual(forge.chooseScale('gauge の重みを見直す'), 'counsel', …);   // B-1 の本体
  assert.strictEqual(forge.chooseScale('gauge の重みを直す'), 'reform', …);      // 裁定の逆側
  assert.strictEqual(forge.chooseScale('conclave の待ちを見直す'), 'counsel', …); // 名を替えても成り立つ
  assert.strictEqual(forge.chooseScale('conclave の待ちを直す'), 'reform', …);
});
```

**註釈に書いた理由**(要旨):

> 「**見直す**」は**答えを求める語**である。「重みを**直す**」は**為せ**と命じている ——
> 何をすべきかは既に決まっており、願う者は手を動かせと言っている。ゆえに reform でよい。
> 「重みを**見直す**」は「**今の重みは妥当か**」と問うている —— 何をすべきかは**まだ決まっていない**。
> 願う者が求めているのは**診断と答申**であって、改変の着手ではない。
> **答えを求める願いに 11 相の改革を走らせるのは、問いに為で応えることである。**
>
> ゆえに **この門は「未裁定の振る舞いを凍結する門」ではなく「裁定された正しさを守る門」である。**

**足した断定 2 本**(`conclave` の対)は、**裁定が `gauge` 一語にしか効いていない事態を捕らえる** ——
語ではなく名で裁いていれば赤くなる。

```
$ node tests/counsel.test.js
Counsel self-test: 177 passed, 0 failed
```

**門の本数は 177 のまま**(既存の門の中身を厚くしたので本数は増えない)。

---

## 6. 差し戻しの一覧(重い順)

| # | 重篤 | 事項 | 差し戻し先 |
|---|---|---|---|
| **Q2-1** | **BLOCK 相当** | `MEND_RE` × 強い名 で**世間の願い 32/32 が reform へ攫われる**(main 0/32)。**六度目の回帰** | **build** |
| **Q2-2** | **HIGH** | 門が `MEND_RE` の**世間側の面を 0 件**しか撃っていない(F-4 の四度目)。26 語 × 建造の形のみ | **build**(門) |
| **Q2-3** | **HIGH** | 弱い名に `MEND_RE` を許す変異を **177 本の門が一本も捕らえない**(AC-42 の変異表の外) | **build**(門) |
| **Q2-4** | MED | design.md §1.5.1 の非対称の根拠(「証拠の強さが許す範囲を決める」)が**実測に反する** | **architecture** |
| Q2-5 | LOW | `枢機卿の割り当てを見直したい` が counsel へ落ちる(B-1 の裁定の境界。教主の裁定待ち) | 申し送り |

---

## 7. 【二周目】自分が見ていないこと(第37条)

| # | 面 | 残る疑い |
|---|---|---|
| R2-1 | **修理の形を確定していない** | §1.4 の候補 (i)〜(iv) はどれも**確定していない**。(iii) だけ粗く撃ったが部分的にしか効かない。**「直せる」とは言っていない** |
| R2-2 | **D群 32 件の願い文は自分が作った** | 語彙表からの機械生成なので build の理解の外へは出たが、**「私の理解」の外へは出ていない**。教主が撃てば 33 件目が出る可能性は残る |
| R2-3 | **`BUILD_RE` の語彙について同じ検査をしていない** | `MEND_RE` の一語ずつを撃ったが、**`BUILD_RE` の語彙一語ずつ × 弱い名**は撃っていない。同じ病が在る見込みは高いが**測っていない** |
| R2-4 | **`COUNSEL_RE` / `PRODUCT_RE` / `DOC_RE` の語彙表** | `MEND_RE` にだけ「一語ずつ世間と衝突するか」を当てた。**他の表には当てていない** |
| R2-5 | **判定順を動かす修理の影響** | §1.4 の候補はどれも判定順を動かさない前提で書いた。**判定順を動かす修理の影響は一度も測っていない** |
| R2-6 | **中国語・韓国語** | 一周目と同じく一件も撃っていない |
| R2-7 | **`admit()` / `buildDag()` の下流** | 道が変わった時に相の数と担い手がどう変わるかは撃っていない(一周目から変わらず) |
| R2-8 | **実 GitHub Actions** | 掟により push しない |


---
---

# 【三周目】review — 七度目の回帰を実測で発見した

> 相: `review`(quality 領域・**三周目**)
> 起点: `reform/route-misfire` HEAD `6a4e3f4` / 差分の基点 `cbf4ed2..HEAD`
> **本節の全ての数は quality 三周目が自分の手で撃った生出力である**(第27条)。
> **撃てなかったものは「撃てなかった」と名乗る**(第37条)。

---

## R3-0. 結論(先に述べる)

**七度目の回帰は起きている。判定は 7/7 = 100% の継続である。**

三度目の build が足した `WORLDLY_VESSEL_RE` は、**`mendsParadise` の中だけでなく
`namesParadiseAbstractly` の中でも使われている**。後者は**抽象名の枝**である。
その結果、**抽象名 `門` / `gate` を名指す楽園の願いが、器の名を一語でも持つと
reform から落ちる**。main では落ちなかった。

```
$ (「門の判定を<器>で直す」型を WORLDLY_VESSEL_RE の全 37 語で撃つ / main 対 HEAD)
<<REG アプリ          main=reform      HEAD=quick       :: 門の判定をアプリで直す
<<REG サイト          main=reform      HEAD=quick       :: 門の判定をサイトで直す
<<REG ツール          main=reform      HEAD=quick       :: 門の判定をツールで直す
<<REG 掲示板          main=reform      HEAD=quick       :: 門の判定を掲示板で直す
  … (以下 37 語すべて同じ) …
<<REG booking      main=reform      HEAD=quick       :: fix the gate check with a booking
回帰件数 = 37 / 37
```

**`WORLDLY_VESSEL_RE` の表に在る 37 語すべてが、この向きに回帰を生む。**
第60条(f) が命じた「**印を足したら足した印そのものに両方向試験を課せ**」が、
**`mendsParadise` の枝には課され、`namesParadiseAbstractly` の枝には課されなかった。**

これは build-rework3.md §10 の **B3-2** が自ら名乗った疑い
(「`WORLDLY_VESSEL_RE` の表は自分が選んだ」)の**逆側**である。
神官は「表に**無い**器が漏れる」ことを疑った。実際に起きたのは
「表に**在る**器が、楽園の願いを**落とす**」ことだった。

---

## R3-1. 自作コーパス 138 件 —— 新しい六つの軸(main 対 HEAD)

**過去に使われた軸(MEND 語彙表 / 強い名26語 / 一字の器官名の紛れ語 / 英語の冠詞)とは
重ならない軸から作った**。命じられた 60 件を超えて **138 件**。

| 軸 | 何を変えたか | 件数 |
|---|---|---|
| **A** | 願いが**二文以上** | 12 |
| **B** | **箇条書き**(`-` / `・` / `*` / `1.`) | 10 |
| **C** | **会話体・口語・敬語**(「ねえ」「すみません」「おい」) | 10 |
| **D** | **数字・型番・版番号・パス**が混じる(`v2.3` / `GX-3000` / `A-102` / `302`) | 10 |
| **E** | **楽園の語と世間の語が同じ文に同居** | 12 |
| **F** | **疑問・条件・否定**の形(「〜ないだろうか」「〜ないと駄目だ」) | 10 |
| **PV** | **楽園自身が器を持つ願い**(命じられた 20 件以上) | 26 |
| **EN-P** | **英語の楽園の願い**(命じられた 20 件以上) | 24 |
| **EN-W** | **英語の世間の願い** | 24 |
| | **合計** | **138** |

### R3-1.1 群ごとの誤り(生出力)

```
########## HEAD (6a4e3f4) ##########
MINE_N_A_multisentence       miss   0 /  12
MINE_N_B_bullets             miss   0 /  10
MINE_N_C_conversational      miss   2 /  10
MINE_N_D_numbers             miss   2 /  10
MINE_N_E_mixed               miss   3 /  12
MINE_N_F_polite_question     miss   3 /  10
PV_paradise_with_vessel      miss  17 /  26
EN_paradise                  miss  22 /  24
EN_worldly                   miss   0 /  24
TOTAL                        miss 49 / 138

########## main (c216014) ##########
MINE_N_A_multisentence       miss   4 /  12
MINE_N_B_bullets             miss   3 /  10
MINE_N_C_conversational      miss   4 /  10
MINE_N_D_numbers             miss   5 /  10
MINE_N_E_mixed               miss   4 /  12
MINE_N_F_polite_question     miss   6 /  10
PV_paradise_with_vessel      miss  24 /  26
EN_paradise                  miss  23 /  24
EN_worldly                   miss   2 /  24
TOTAL                        miss 75 / 138
```

### R3-1.2 main と HEAD の差分(回帰 / 修理 / 両方の病)

```
$ node delta.js corpus.json
件数 138  /  回帰(main○ HEAD×) 1  /  修理(main× HEAD○) 27  /  両方× 48

### 回帰 = 七度目の候補 ###
  [PV_paradise_with_vessel] main=reform → HEAD=quick :: hermetic の検品の門を直す

### HEAD が直した(27 件) ###
  [MINE_N_A] conclave の毒を除いてくれ。走行帳が壊れたままなんだ。
  [MINE_N_A] forge の道選びがおかしい。gauge の願いが standard へ落ちる。直せ。
  [MINE_N_A] codex の索引がずれている。書き換えて index を作り直してほしい。
  [MINE_N_A] gauge 専門店の棚が傾いている。直す在庫アプリが欲しい。
  [MINE_N_B] やりたいこと:\n- conclave の毒を除く\n- 走行帳の重複行を削る
  [MINE_N_B] 直してほしい点:\n・forge の scale 判定\n・codex の索引の順番
  [MINE_N_B] * gauge の fingerprint の検めを直す\n* 走行帳の欠けを塞ぐ
  [MINE_N_C] すみません、forge の道選びを直していただけますか。
  [MINE_N_C] あのさ、走行帳がまた壊れてるんだよね。塞いでくれない?
  [MINE_N_D] codex の第60条(g)の文言を直す
  [MINE_N_D] gauge の fingerprint SHA-256 の検めを直す
  [MINE_N_D] 走行帳 run-2026-09-16 の壊れた行を塞ぐ
  [MINE_N_E] 走行帳を塞いでから、社外向けのサービスに展開する
  [MINE_N_F] もし可能なら codex の索引を書き換えてほしい
  [MINE_N_F] 走行帳が壊れないように塞いでおいてほしい
  [MINE_N_F] gauge 専門学校の時間割の誤りが直せないだろうか
  [PV] conclave のダッシュボードを直す
  [PV] critic のレビュー画面のバグを直す
  [PV] orchestrator の状態機械を直す
  [PV] spawn-trace の走行帳アプリを直す
  [PV] gauge のダッシュボードのゲージを直す
  [PV] conclave の ratify コマンドを直す
  [PV] codex の index コマンドの誤りを直す
  [PV] export-state のダッシュボード出力を書き換える
  [EN_paradise] add a fingerprint check to gauge
  [EN_worldly] rewrite the gate schedule board at forge airport terminal
  [EN_worldly] deprecate the old scoring gate in my conclave tournament site
```

**⚠️ 読み方を誤ってはならない。**
自作 138 件の **単純な差し引きは HEAD の勝ち**(75 → 49)であり、
**世間側の誤着(`EN_worldly` / 各軸の NOT_reform 行)は HEAD で 0 件**である。
`AC-31` は**達成**に戻った(二周目の未達から回復)。

**だが「回帰 1 件」という数は、コーパスの偏りが作った数である。**
この 1 件を**軸として展開すると 37 件になる**(§R3-0)。
**コーパスの件数で回帰の重さを測ってはならない** —— 一件の回帰が
**表の全語に渡る面**を表すのか、**一語だけの面**を表すのかを見よ。

---

## R3-2. 七度目の回帰の解剖(最も重い発見)

### R3-2.1 死因 —— `WORLDLY_VESSEL_RE` が二つの枝で使われている

`graph/forge.js` の該当箇所:

```js
function namesParadiseAbstractly(d) {
  if (!REFORM_ABSTRACT_RE.test(d)) return false;
  const multi = new RegExp(REFORM_ABSTRACT_RE.source.replace('門|gate|', ''), 'i');
  if (multi.test(d)) return true;
  if (!ABSTRACT_SOLO_RE.test(d)) return false;
  return !ABSTRACT_FALSE_FRIENDS.test(d) && !WORLDLY_VESSEL_RE.test(d);   // ← ここ
}

function mendsParadise(d) {
  if (WORLDLY_VESSEL_RE.test(d)) return false;                            // ← と、ここ
  return STRONG_BOUND_RE.test(d);
}
```

**`mendsParadise` の側は正しい。**「世間の器を作る願いは楽園の改修ではない」は妥当である。

**`namesParadiseAbstractly` の側が誤っている。**
この枝は「**願いが抽象名 `門` / `gate` で楽園を名指しているか**」だけを裁くべきである。
そこへ `WORLDLY_VESSEL_RE` を持ち込むと、主張が
「**楽園の門を名指していて、かつ世間の器を一語も含まない**」に化ける。

**楽園は器を持つ。** `dashboard/index.html` が在り、`pulse.js` は `serve` を持ち、
`forge.js` は DAG を作る**ツール**である。
build 相自身が `WORLDLY_VESSEL_RE` の註に
「**`ダッシュボード`/`dashboard` を入れてはならない —— 楽園も名乗る器は、世間の器ではない**」
と書いた。**その理を、表の残り 37 語に当てなかった。**

### R3-2.2 実測 —— 「器を持つ楽園の願い」26 件

| # | 願い | main | HEAD | 判定 |
|---|---|---|---|---|
| 1 | 楽園のダッシュボードの画面を直す | reform | **reform** | ○(多字の抽象名 `楽園` が救った) |
| 2 | conclave のダッシュボードを直す | quick | **reform** | ○ HEAD が直した |
| 3 | pulse の serve するアプリを直す | quick | **quick** | ✗ 両方の病(`pulse` は弱い名) |
| 4 | forge の DAG 生成ツールを直す | quick | **quick** | ✗ 両方の病 |
| 5 | gauge の検品の口を直す | quick | **quick** | ✗ 両方の病(`検品` が器の表に在る) |
| 6 | codex の索引ツールを書き換える | standard | **standard** | ✗ 両方の病 |
| 7 | critic のレビュー画面のバグを直す | quick | **reform** | ○ HEAD が直した |
| 8 | synod の予約された相を除く | standard | **standard** | ✗ 両方の病(`予約` が器の表に在る) |
| 9 | clergy の名簿エディタを直す | quick | **quick** | ✗ 両方の病 |
| 10 | wiring のチェックツールを直す | quick | **quick** | ✗ 両方の病 |
| 11 | **hermetic の検品の門を直す** | **reform** | **quick** | 🔴 **七度目の回帰** |
| 12 | orchestrator の状態機械を直す | quick | **reform** | ○ HEAD が直した |
| 13 | spawn-trace の走行帳アプリを直す | quick | **reform** | ○ HEAD が直した |
| 14 | verdict の判定サイトを直す | quick | **quick** | ✗ 両方の病 |
| 15 | abode のテンプレ配布サイトを直す | quick | **quick** | ✗ 両方の病 |
| 16 | daily-guard の当番アプリを直す | quick | **quick** | ✗ 両方の病 |
| 17 | gauge のダッシュボードのゲージを直す | quick | **reform** | ○ HEAD が直した |
| 18 | forge の scale 判定のツールチェーンを直す | quick | **quick** | ✗ 両方の病 |
| 19 | conclave の ratify コマンドを直す | quick | **reform** | ○ HEAD が直した |
| 20 | codex の index コマンドの誤りを直す | quick | **reform** | ○ HEAD が直した |
| 21 | graph-engine のビューアを直す | cartography | **cartography** | ✗ 両方の病(`ビューア` ではなく `図` 系の別因) |
| 22 | ordain の教材ページの誤りを直す | quick | **quick** | ✗ 両方の病(`教材` が器の表に在る) |
| 23 | visual-verify の画面撮りツールを直す | quick | **quick** | ✗ 両方の病 |
| 24 | branch-guard の保護サービスの判定を直す | quick | **quick** | ✗ 両方の病(`サービス` が器の表に在る) |
| 25 | export-state のダッシュボード出力を書き換える | standard | **reform** | ○ HEAD が直した |
| 26 | check-agents の一覧ツールの漏れを塞ぐ | standard | **standard** | ✗ 両方の病 |

**26 件中 HEAD で reform に着いたのは 9 件。回帰 1 件。両方の病 17 件。**

**17 件の「両方の病」は本走行が作ったものではない**が、
**`WORLDLY_VESSEL_RE` がそれを塞ぐどころか一段固くした**面が在る:
表に `検品` `予約` `教材` `サービス` `校正` `貸出` が在るので、
**`gauge の検品の口を直す`** のような**純然たる楽園の器官の願い**が
`mendsParadise` で永久に落ちるようになった(main では `MEND_RE` が無かったので
別の理由で落ちていた —— **落ち先は同じだが、落ちる理由が一つ増えた**)。

### R3-2.3 `ABSTRACT_FALSE_FRIENDS` は退けすぎていないか —— 実測

**日本語側は退けすぎていない。** 多字の抽象名が救うので、
`楽園の専門の門の判定を直す` は HEAD でも reform である(11/11 が緑)。

**英語側は退けすぎている。**

```
$ (ABSTRACT_FALSE_FRIENDS の英語 5 語 × 真の楽園の願い)
<<REG gated       main=reform     HEAD=quick      :: fix the gated behaviour of our gate checks
<<REG gateway     main=reform     HEAD=quick      :: fix the gateway behaviour of our gate checks
<<REG floodgate   main=reform     HEAD=quick      :: fix the floodgate behaviour of our gate checks
<<REG tailgate    main=reform     HEAD=quick      :: fix the tailgate behaviour of our gate checks
<<REG stargate    main=reform     HEAD=quick      :: fix the stargate behaviour of our gate checks
回帰 5/16
```

`ABSTRACT_FALSE_FRIENDS` は**文のどこかに紛れ語が在れば枝全体を殺す**。
`gateway` という語が一度でも出れば、**同じ文に在る本物の `gate` も道連れになる**。
`PRODUCT_FALSE_FRIENDS` / `DIAGRAM_FALSE_FRIENDS` は**同じ構造を持つ**が、
それらは「紛れ語が在る=その語は器官名ではない」で済む面だった。
**抽象名の枝では、一文に紛れ語と本物が同居しうる。**

**日本語側も同じ形で壊れる:**

```
<<REG main=reform     HEAD=quick      :: 入門者向けに門の判定を直す
<<REG main=reform     HEAD=quick      :: 専門家が門の一段を直す
<<REG main=reform     HEAD=quick      :: 部門をまたぐ門の判定を直す
<<REG main=reform     HEAD=quick      :: 名門扱いの門の除外を直す
<<REG main=reform     HEAD=standard   :: 関門となる門の順を書き換える
<<REG main=reform     HEAD=quick      :: 門下の相の門を直す
<<REG main=reform     HEAD=quick      :: fix gateway checks in the gate router
<<REG main=reform     HEAD=quick      :: fix the gated rollout gate logic
```

**8/8 が回帰。** §R3-2.2 の表の日本語 11 件が緑だったのは、
**それらが多字の抽象名 `楽園` を持っていたから**である ——
**`楽園` を抜いた瞬間、紛れ語の守りが本物の門を殺す。**
これは第60条(h) が名指した病(「二つの守りが同じ例を守っているなら変異試験は黙る」)の
**逆側**である: **二つの守りが同じ例を救っていると、片方の過剰が見えない。**

---

## R3-3. `STRONG_BOUND_RE` —— 英語で枝 2' は**構造的に到達不能**である

神官は B3-1 で「英語では漏れる見込みが高い」と名乗った。
**実測は「漏れる」より重い。英語では枝 2' が一度も成立しない。**

```
$ (MEND_EN の全 10 語 × 強い名 `conclave` × 助詞なし)
 fix         HEAD=quick      STRONG=true MEND=true BOUND=false mendsPar=false
 repair      HEAD=standard   STRONG=true MEND=true BOUND=false mendsPar=false
 remove      HEAD=standard   STRONG=true MEND=true BOUND=false mendsPar=false
 refactor    HEAD=standard   STRONG=true MEND=true BOUND=false mendsPar=false
 rewrite     HEAD=standard   STRONG=true MEND=true BOUND=false mendsPar=false
 patch       HEAD=quick      STRONG=true MEND=true BOUND=false mendsPar=false
 harden      HEAD=standard   STRONG=true MEND=true BOUND=false mendsPar=false
 migrate     HEAD=standard   STRONG=true MEND=true BOUND=false mendsPar=false
 drop        HEAD=standard   STRONG=true MEND=true BOUND=false mendsPar=false
 deprecate   HEAD=standard   STRONG=true MEND=true BOUND=false mendsPar=false
英語で枝2' に到達した件数 = 0/10
```

**英語の楽園の願い 24 件のうち、HEAD で reform に着いたのは 2 件だけである。**

```
EN_paradise  miss 22 / 24   (main は 23/24 — HEAD が直したのは `add a fingerprint check to gauge` 1 件)
```

落ちた 22 件は `fix forge scale routing` / `remove poison entries from conclave ledgers` /
`harden gauge fingerprint checks` / `rewrite orchestrator state transitions` …
**どれも紛う方なき楽園の改修の願いである。**

**⚠️ これは本走行の回帰ではない**(main も 23/24 落としていた)。
**だが本走行は「直した」と名乗れる面でもない。**
`STRONG_BOUND_RE` は**設計上、英語の枝 2' を永久に閉じた**。
design.md §1.5.1 は「**この非対称は測って選んだ**」と書くが、
**選んだ結果が「英語の楽園の改修は一件も reform に着かない」であることは書いていない。**
これは第37条の「撃てなかったものは名乗れ」ではなく、
**「撃った結果の意味を述べていない」**である。

**助詞の表も 6 語に限られている:**

```
  の : reform  bound=true      と : standard  bound=false  <- 表に無い助詞
  に : reform  bound=true      で : standard  bound=false  <- 表に無い助詞
  へ : reform  bound=true      から : standard  bound=false <- 表に無い助詞
  を : reform  bound=true      より : standard  bound=false <- 表に無い助詞
  は : reform  bound=true      も : standard  bound=false  <- 表に無い助詞
  が : reform  bound=true      や : standard  bound=false  <- 表に無い助詞
```

`conclave も毒を除く` / `conclave から毒を除く` は落ちる。
**日本語の助詞は 6 語では尽きない。**

---

## R3-4. §10 の「確信を持てない」10 件 —— 撃てるものを全て撃った

| # | 神官の疑い | 三周目の裁定 | 証拠 |
|---|---|---|---|
| **B3-1** | `STRONG_BOUND_RE` は日本語にしか立たない | 🔴 **疑い以上に重い** | 英語で枝 2' に到達 **0/10**。英語の楽園の願い **22/24 が落ちる**(§R3-3) |
| **B3-2** | `WORLDLY_VESSEL_RE` の表は自分が選んだ / 網羅の機械照合が無い | 🔴 **疑いの逆側が病だった** | 表に**在る**37 語すべてが抽象名の枝で回帰を生む(§R3-0)。機械照合の門は**建てられる**(§R3-5) |
| **B3-3** | `ABSTRACT_FALSE_FRIENDS` の表も自分が選んだ / 撃っていない | 🟡 **半分当たり** | 未収録の紛れ語(`門松`/`破門`/`門番`/`水門`)は**今も漏れる**が、それより**収録済みの語が本物を殺す**方が重い(§R3-2.3) |
| **B3-4** | 枝 3 を塞がなかった判断 / G群 12 件が正しいコーパスか | 🟢 **妥当** | 枝 3 を `MEND_RE` へ広げる変異 M-G は**赤くなる**(212 passed, 6 failed)。判断は門で守られている |
| **B3-5** | `BUILD_RE` の語彙表に同じ検査をしていない | 🔴 **当てた。出た**(§R3-6) | `BUILD_RE` 23 語 × 弱い名 の世間の願いを撃った結果を §R3-6 に示す |
| **B3-6** | `COUNSEL_RE` / `PRODUCT_RE` / `DOC_RE` の表 | 🔴 **当てた。出た**(§R3-6) | 同上 |
| **B3-7** | 中国語・韓国語 | ⬜ **三周目も撃っていない** | 正直に申し送る |
| **B3-8** | `admit()` / `buildDag()` の下流 | 🟡 **一部撃った** | verify §V3-2 に CLI⇔lib の突合(割れ 0 / CLI 拒否 2)。相の数と担い手の変化は**撃っていない** |
| **B3-9** | 実 GitHub Actions | ⬜ **掟により撃たない** | push しない |
| **B3-10** | 「修理が新しい欠陥を生んだ率」が今回 0 である保証は無い | 🔴 **保証が無いどころか、0 ではない** | **七度目は起きた**(§R3-0 / §R3-2) |

---

## R3-5. `WORLDLY_VESSEL_RE` / `ABSTRACT_FALSE_FRIENDS` に網羅の機械照合は建てられるか

**建てられる。そして建てるべきである。** 第60条(g) が既にそう命じている。

**現状の実測 —— `.source` を読む門は `MEND_RE` の一本だけである:**

```
$ grep -n "\.source" tests/counsel.test.js
868:  const src = forge.MEND_RE.source;

  WORLDLY_VESSEL_RE      : source を読む門 = なし
  STRONG_BOUND_RE        : source を読む門 = なし
  ABSTRACT_FALSE_FRIENDS : source を読む門 = なし
  ENGINE_NAMES_STRONG    : source を読む門 = なし(※ split('|') で読む別形の門は在る)
```

**建て方(具体案 —— `MEND_WORLDLY_EVERY_VERB` と同じ作法)**

* `WORLDLY_VESSEL_RE` の源を `|` で割り、**37 語すべてについて二つの願いを要求する**:
  1. **世間側** —— その器の名を持つ世間の願いが reform でないこと(既に守られている面)
  2. **楽園側** —— **その器の名を持つ楽園の願いが reform であること**(⚠️ **今まさに壊れている面**)
  楽園側のコーパスを機械照合すれば、**`門の判定をアプリで直す` が緑でないことが
  表の全 37 語について自動で赤くなる。** 七度目はこの門で捕まった。
* `ABSTRACT_FALSE_FRIENDS` の源を割り、**16 語すべてについて**:
  1. その紛れ語だけを持つ世間の願いが reform でないこと
  2. **その紛れ語と本物の `門`/`gate` が同居する願いが reform であること**(⚠️ **今壊れている面**)
* `STRONG_BOUND_RE` の助詞の表(6 語)についても同じ ——
  **表に無い助詞(`と`/`で`/`から`/`より`/`も`/`や`)を名指しで「撃っていない」と記録する門**を置ける。

**⚠️ ただし、第60条(g) の「機械照合」だけでは七度目は捕まらなかった。**
(g) は「**表の全語について楽園側と世間側の両方のコーパスを持て**」と書く。
`MEND_RE` にはそれが建てられた —— **だがそれは `MEND_RE` を `mendsParadise` の
軸で照合しただけ**であり、`WORLDLY_VESSEL_RE` が**もう一つの枝でも使われている**
事実は照合の外に在った。
**表は「どの述語で使われているか」の軸でも照合されねばならない。**
一つの表が n 個の述語で使われるなら、**n 通りの両方向試験が要る**(§R3-8 に条文案)。

---

## R3-6. `BUILD_RE` / `COUNSEL_RE` / `PRODUCT_RE` / `DOC_RE` に同じ一語ずつ検査を当てた

**B3-5 / B3-6 が「当てていない」と名乗った面。三周目が当てた。当てたら出た。**

### R3-6.1 集計(main 対 HEAD / 生出力)

| 表 | 語数 | 世間への誤着 main | **世間への誤着 HEAD** | 楽園の取りこぼし main | 楽園の取りこぼし HEAD |
|---|---|---|---|---|---|
| `BUILD_RE` × **弱い名**(枝 3) | 24 | 0/24 | **0/24** ✓ | 18/24 | **0/24** ✓ |
| `BUILD_RE` × **強い名**(枝 2) | 24 | 0/24 | 🔴 **18/24** | 24/24 | **0/24** ✓ |
| `PRODUCT_RE` × 強い名 | 27 | 1/27 | **0/27** ✓ | 26/27 | **0/27** ✓ |
| `COUNSEL_RE` × 楽園 | 36 | 0/36 | **0/36** ✓ | 36/36 | 36/36 |
| `DOC_RE` × 楽園 | 21 | 0/21 | **0/21** ✓ | 21/21 | 18/21 |

### R3-6.2 🔴 **重い発見: 枝 2(建造)には器の守りが無い**

```
$ (BUILD_RE の全 24 語 × 強い名 conclave × 世間の器「予約サイト」)
  誤着 設ける            main=standard    HEAD=reform :: conclave ホテルの予約サイトに機能を設ける
  誤着 足す             main=standard    HEAD=reform :: conclave ホテルの予約サイトに機能を足す
  誤着 追加             main=standard    HEAD=reform :: conclave ホテルの予約サイトに機能を追加
  誤着 新設             main=standard    HEAD=reform :: conclave ホテルの予約サイトに機能を新設
  誤着 導入             main=standard    HEAD=reform :: conclave ホテルの予約サイトに機能を導入
  誤着 搭載             main=standard    HEAD=reform :: conclave ホテルの予約サイトに機能を搭載
  … (日本語 18 語すべて) …
  世間への誤着  main=0/24  HEAD=18/24
```

**`isReformSubject` の枝 2 は今もこうである:**

```js
if (REFORM_STRONG_RE.test(d) && BUILD_RE.test(d)) return true;       // ← 枝 2: 無条件
if (REFORM_STRONG_RE.test(d) && MEND_RE.test(d) && mendsParadise(d)) return true;  // ← 枝 2': 守りあり
```

**Q2-1 の病(「強い枝に許した動詞集合がそのまま新しい弱い印になった」)は、
`MEND_RE` にだけ在ったのではない。`BUILD_RE` にも同じ形で在る。**
三度目の build は `mendsParadise` を**枝 2' にだけ**掛け、**枝 2 には掛けなかった**。

**責任の帰属を実測で分けた**(`git clone --branch reform/route-misfire` → `checkout cbf4ed2`):

```
願い                                       main      cbf4ed2(build2)  HEAD(build3)
conclave ホテルの予約サイトに機能を足す            standard  reform           reform
gauge 計器店の通販アプリに絞り込みを足す            full      reform           reform
forge 鍛冶体験の予約サイトにカレンダーを追加         standard  reform           reform
abode 不動産サイトに地図表示を足す                standard  reform           reform
add a filter to the conclave hotel booking site  standard  standard  standard
```

**これは三度目の build が作った回帰ではない —— 二度目の build(`cbf4ed2`)が作った。**
**だが三度目の build は「`MEND_RE` × 強い名」だけを修理し、
隣に立つ同型の病(`BUILD_RE` × 強い名)を修理も報告もしなかった。**
build-rework3.md §10 の **B3-5**(「`BUILD_RE` の語彙表に同じ検査をしていない」)は
**この病そのものを指していたが、神官は「未測」と書いて済ませた。測れば出た。**

**⚠️ 英語側は無傷である**(`add a filter to the conclave hotel booking site` は
限定詞 `the conclave` の除外が救う)。**病は日本語 18 語に限られる。**

### R3-6.3 `COUNSEL_RE` / `DOC_RE` の取りこぼしは**設計通り**(誤報しない)

`COUNSEL_RE` 36/36 と `DOC_RE` 18/21 の「取りこぼし」は
**`chooseScale` が `isCounsel` を `isReformSubject` より先に判定する**からである。
`conclave を監査して直す` が counsel に着くのは第23条の主題優先の逆 ——
**「求められている答えの種類が道を決める」**(forge.js の註が明記)。
**main と HEAD で一件も変わっていない。回帰ではない。**
ただし `DOC_RE` の 3 件(`一覧表`/`資料`/`レポート`)は HEAD で reform に着いており、
**`COUNSEL_RE` に在って `DOC_RE` に無い語 / 逆の語の境目が不揃い**である。
**これは本走行の主題の外なので申し送りに留める。**

---

## R3-7. ReDoS —— 新しい 3 表(security-report.md §三周目へ委譲)

本節は `security-report.md` の **§三周目 S3-1** に生出力が在る。要旨のみ:
**3 表 × 11 の悪意の形 × 10KB/100KB/200KB の最悪が 0.485 ms。二乗の兆候は無い。**

---

## R3-8. 憲法への申し送り(条文案)

第60条に **(i)** を継ぐことを提案する。**ただし §docs で述べる通り、
第60条は既に 113 行(中央値 24 行の 4.7 倍)であり、継ぐより畳むべきである。**

> **(i) 一つの表が二つの述語で使われるなら、両方向試験は二通り要る。**
> `WORLDLY_VESSEL_RE` は `mendsParadise`(強い名の枝)と
> `namesParadiseAbstractly`(抽象名の枝)の**両方**で使われた。
> (f)(g) の両方向試験は**前者にだけ**課され、後者には課されなかった。
> 結果、**表に在る 37 語すべてが、抽象名の枝で楽園の願いを落とした**。
> **表の網羅を照合する門は「表の語」を軸にする。だが病は「表の使い所」を軸に出る。**
> ゆえに: **表を二箇所目で使う者は、その箇所についての両方向試験を新たに建てよ。**
> 機械で強制する形は「`grep` で表の識別子の出現箇所を数え、
> 各箇所に対応する両方向の門が在ることを照合する」である。

