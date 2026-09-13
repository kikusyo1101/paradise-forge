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
