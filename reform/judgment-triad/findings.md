# 楽園 — 道選び・環の裁きの三欠陥 実測記録 (reform/judgment-triad / discover 相)

- 走行日: 2026-09-17
- 枝: `reform/judgment-triad`
- 作業根: `C:/Users/kikus/Documents/workspace/paradise`
- 実行系: node v24.14.0 / bash (git-bash)
- 掟: **憶測を書かない。全ての主張に生の命令出力を添える。** 実装は一行もしない(後続の相の領分)。

対象:

| 札 | 場所 | 主張 |
|----|------|------|
| PARA-6 | `graph/conclave.js` `ratify()` (L691付近) | 相の完了を一切見ずに `d.status='ratified'` を書く |
| PARA-9 | `graph/forge.js` `isCartography()` (L586付近) | `wantsProduct()` による打ち消しが無い |
| PARA-7 | `graph/forge.js` `chooseScale()` (L602付近) | `fullJa` の語彙不足で製品規模の願いが standard へ落ちる |

---

## 0. 基準線 — 現状の門は全て緑である

> 「欠陥が在るのに門が全部緑」— これが本記録の出発点である。門を緩めた形跡ではなく、
> **門がそもそも撃っていない領域**に三つの欠陥が居る。

(第4節に各門の生出力と exit code を貼る)

---

## 1. PARA-6 — 未着手の領域を ratified にできる

### 1.1 該当の実装(生の抜粋)

`graph/conclave.js`:

```js
function ratify(run, cardinal, opts = {}) {
  const d = run.domains.find(x => x.cardinal === cardinal);
  if (!d) throw new Error('no such cardinal: ' + cardinal);
  if (!opts.reject) {
    d.status = 'ratified';
    run.history.push({ ts: now(), event: 'ratify', detail: `${d.domain} ratified by ${d.reviewClass}` });
    return { ok: true, ratified: cardinal };
  }
```

`d.phases` を一度も見ていない。`p.status` も `p.artifactPath` も条件に入らない。
**拒否(`--reject`)の側だけが厳密で、祝福の側は無条件である。**

### 1.2 再現 — 相を一つも done にせず 6 領域すべてを ratified にする

計測器: `reform/judgment-triad/_para6_probe.js`(`forge.buildDag` → `conclave.convene` → `conclave.ratify` を直に呼ぶ)

```
$ node reform/judgment-triad/_para6_probe.js
```

生出力(抜粋):

```
=== 1. convene 直後 — 相は全て pending ===
CONCLAVE — 聖職位階の進行
════════════════════════════════════════════════════
· 枢機卿 discovery — Discovery (調査)   [review: pontiff]
     · ⚖️ discover @market-researcher
· 枢機卿 requirements — Requirements (要件)   [review: cardinal:discovery]
     ·    analyze @requirements-analyst
     · ⚖️ specify @requirements-analyst
· 枢機卿 architecture — Architecture (設計)   [review: cardinal:requirements]
     ·    ux @architect
     ·    identity @architect
     · ⚖️ design @architect
     ·    detail @architect
· 枢機卿 construction — Construction (建造)   [review: cardinal:quality]
     ·    build @architect
     ·    build-ui @architect
     ·    tests @tdd-guide
· 枢機卿 quality — Quality (品質)   [review: executor]
     ·    review @code-reviewer
     ·    ux-review @ux-reviewer
     ·    security @security-reviewer
     ·    docs @doc-updater
     · ⚖️ verify @verification-loop
· 枢機卿 tribunal — Tribunal (断罪機関)   [review: god]
     · ⚖️ reflect @self-critic
     · ⚖️ verdict @creation-judge
════════════════════════════════════════════════════
domains ratified: 0/6

相の状態の内訳(convene 直後): {"pending":17}

=== 2. 一つも done にせず、全ての枢機卿に ratify を撃つ ===
  ratify(discovery) -> {"ok":true,"ratified":"discovery"}   [この領域の相: discover=pending]
  ratify(requirements) -> {"ok":true,"ratified":"requirements"}   [この領域の相: analyze=pending, specify=pending]
  ratify(architecture) -> {"ok":true,"ratified":"architecture"}   [この領域の相: ux=pending, identity=pending, design=pending, detail=pending]
  ratify(construction) -> {"ok":true,"ratified":"construction"}   [この領域の相: build=pending, build-ui=pending, tests=pending]
  ratify(quality) -> {"ok":true,"ratified":"quality"}   [この領域の相: review=pending, ux-review=pending, security=pending, docs=pending, verify=pending]
  ratify(tribunal) -> {"ok":true,"ratified":"tribunal"}   [この領域の相: reflect=pending, verdict=pending]

=== 3. ratify 後の statusBoard ===
CONCLAVE — 聖職位階の進行
════════════════════════════════════════════════════
✓ 枢機卿 discovery — Discovery (調査)   [review: pontiff]
     · ⚖️ discover @market-researcher
✓ 枢機卿 requirements — Requirements (要件)   [review: cardinal:discovery]
     ·    analyze @requirements-analyst
     · ⚖️ specify @requirements-analyst
✓ 枢機卿 architecture — Architecture (設計)   [review: cardinal:requirements]
     ·    ux @architect
     ·    identity @architect
     · ⚖️ design @architect
     ·    detail @architect
✓ 枢機卿 construction — Construction (建造)   [review: cardinal:quality]
     ·    build @architect
     ·    build-ui @architect
     ·    tests @tdd-guide
✓ 枢機卿 quality — Quality (品質)   [review: executor]
     ·    review @code-reviewer
     ·    ux-review @ux-reviewer
     ·    security @security-reviewer
     ·    docs @doc-updater
     · ⚖️ verify @verification-loop
✓ 枢機卿 tribunal — Tribunal (断罪機関)   [review: god]
     · ⚖️ reflect @self-critic
     · ⚖️ verdict @creation-judge
════════════════════════════════════════════════════
domains ratified: 6/6

相の状態の内訳(ratify 後): {"pending":17}
done の相の数: 0 / 17
artifactPath を持つ相の数: 0 / 17
ratified な領域の数: 6 / 6
```

**17 相すべてが pending のまま `domains ratified: 6/6`。** 成果物は一つも無い(`artifactPath` を持つ相 0/17)。
`ratify` は 6 回とも `{"ok":true}` を返した — 一度も拒まない。

### 1.3 CLI の口でも同じ(ライブラリ直呼びの作り事ではない)

```
$ node graph/forge.js plan "ポモドーロタイマーのアプリが欲しい" --out "$LOCALAPPDATA/Temp/para6cli/forge.dag.json"
$ node graph/conclave.js convene "$LOCALAPPDATA/Temp/para6cli/forge.dag.json" --run "$LOCALAPPDATA/Temp/para6cli/run.json" | tail -3
$ for c in discovery requirements architecture construction quality tribunal; do \
    node graph/conclave.js ratify $c --run "$LOCALAPPDATA/Temp/para6cli/run.json" | tail -2; done
```

```
· ⚖️ verdict @creation-judge
════════════════════════════════════════════════════
domains ratified: 0/6
--- ratify 全枢機卿 (CLI) ---
════════════════════════════════════════════════════
domains ratified: 1/6
════════════════════════════════════════════════════
domains ratified: 2/6
════════════════════════════════════════════════════
domains ratified: 3/6
════════════════════════════════════════════════════
domains ratified: 4/6
════════════════════════════════════════════════════
domains ratified: 5/6
════════════════════════════════════════════════════
domains ratified: 6/6
--- 最終 statusBoard 末尾 ---
     · ⚖️ reflect @self-critic
     · ⚖️ verdict @creation-judge
════════════════════════════════════════════════════
domains ratified: 6/6
EXIT=0
--- ledger 内の相の状態 ---
phases: 17 done: 0 pending: 17
domains ratified: 6/6
```

**CLI から 6 回 `ratify` を叩くだけで、仕事を一つもせずに環が閉じる。** exit code は毎回 0。

### 1.4 `conclave.js audit` はこれを捕まえない(実測)

```
=== 4. conclave.js audit がこの走行帳をどう裁くか ===
CONCLAVE AUDIT — 見捨てられた走行 (第53条)
════════════════════════════════════════════════════════
✓ [probe] para6-demo  domains 6/6
════════════════════════════════════════════════════════
見捨てられた走行: 0 / 判定不能: 0 / 全 1

auditRuns の生の判定: {
  "where": "probe",
  "slug": "para6-demo",
  "path": "C:\\Users\\kikus\\AppData\\Local\\Temp\\para6-mnII08\\conclave.json",
  "state": "closed",
  "abandoned": false,
  "idleMs": 1,
  "ratified": 6,
  "total": 6,
  "closed": true,
  "lastBeat": "2026-09-16T15:08:54.086Z",
  "beats": 0,
  "lastProof": null
}

exit code 相当 (abandoned+unknown+unreadable): 0
```

**`state: "closed"` — 空の走行に ✓ を出す。** `beats: 0`(鼓動ゼロ)、`lastProof: null`(証拠ゼロ)
であっても `closed` が先に立ち、`auditBoard` は緑の ✓ を書く。

理由は `runAbandonment()` の構造にある: `closed` の判定は `ratified === total` だけを見ており、
相の `status` も `artifactPath` も見ない。すなわち **PARA-6 で書かれた嘘が、そのまま audit の
「健全」判定の入力になる。** 第53条の第二の目は、第一の目が嘘をついた場合を想定していない。

### 1.5 影響の射程

- `domains ratified: N/M` は **仕事の量ではなく `ratify` を叩いた回数**である。
- `conclave.js audit` は嘘の 6/6 を `closed` として ✓ で通す(上の生出力)。
- 第53条の監査(見捨てられた走行を名指す)は **「見捨てられた」ではなく「空で閉じた」走行に無力**。
  皮肉にも、ratify を全部叩いた偽の完走のほうが、正直に途中で止まった走行より audit 上は「健全」である。


---

## 2. PARA-9 — 「図を作れる産物」が cartography へ攫われる

### 2.1 該当の実装(生の抜粋)

`graph/forge.js`:

```js
function isCartography(wish) {
  if (!DIAGRAM_RE.test(wish)) return false;
  // 「図に」「図を」だけで当たった場合、それが紛れ語の一部でないか確かめる。
  const onlyWeak = !new RegExp(`${DIAGRAM_JA.split('|').filter(w => w !== '図に' && w !== '図を').join('|')}|${DIAGRAM_EN}`, 'i').test(wish);
  if (onlyWeak && DIAGRAM_FALSE_FRIENDS.test(wish)) return false;
  return true;
}
```

打ち消しは `DIAGRAM_FALSE_FRIENDS`(意図/地図/図書…)ただ一つで、しかも
**`onlyWeak`(弱い標識だけで当たった場合)にしか掛からない。**
`wantsProduct()` はここに一度も現れない。

対して `isCounsel()` は同じ構造の問題を `wantsProduct()` で解いている:

```js
  if (DOC_STRONG_RE.test(w)) return true;
  return DOC_RE.test(w) && !wantsProduct(w);
```

**「文書を求めているのか、文書を作る物を求めているのか」を counsel は区別し、cartography は区別しない。**
同じ病に対する守りが、二つの道のうち片方にしか置かれていない。

そして `chooseScale` の第一段が `isCartography` である:

```js
  if (isCartography(d)) return 'cartography';
```

ゆえに作図の語が一つでも当たれば、産物の名(アプリ/ツール/コマンド)は**一度も読まれない**。

### 2.2 再現(既知の実測の裏取り)

```
$ node -e "
const f=require('C:/Users/kikus/Documents/workspace/paradise/graph/forge.js');
const ws=['一門の家系図を作れるアプリが欲しい','ECサイトを作れ','社内ポータルサイトを作れ','タスク管理アプリ','家系図アプリが欲しい','一門の家系図を作れ','ECサイトの決済システムを作れ'];
for(const w of ws) console.log(JSON.stringify(w),'->',f.chooseScale(w),' isCartography='+f.isCartography(f.denude(w)),' wantsProduct='+f.wantsProduct(f.denude(w)));
"
```

```
"一門の家系図を作れるアプリが欲しい" -> cartography  isCartography=true  wantsProduct=true
"ECサイトを作れ" -> standard  isCartography=false  wantsProduct=false
"社内ポータルサイトを作れ" -> standard  isCartography=false  wantsProduct=false
"タスク管理アプリ" -> full  isCartography=false  wantsProduct=true
"家系図アプリが欲しい" -> full  isCartography=false  wantsProduct=true
"一門の家系図を作れ" -> cartography  isCartography=true  wantsProduct=true
"ECサイトの決済システムを作れ" -> full  isCartography=false  wantsProduct=false
```

教主の実測は四件ともそのまま再現した。

**決定的な一組:**

| 願い | 道 |
|------|-----|
| `家系図アプリが欲しい` | **full** |
| `一門の家系図を作れるアプリが欲しい` | **cartography** |

同じ物を求めているのに、「作れる」の四文字(`図を作` が `図を` に当たる)が道を変えた。
`wantsProduct=true` は両方で立っているのに、cartography 側はそれを読まない。

### 2.3 射程 —「作図の産物」は 5 件とも誤着する

第3節の混同行列より(生出力):

```
  [full → cartography] : 3 件
      ・一門の家系図を作れるアプリが欲しい   (new/PARA-9)
      ・家系図を作れるアプリが欲しい   (new/PARA-9)
      ・相関図を描けるアプリを作って   (new/PARA-9)

  [standard → cartography] : 2 件
      ・組織図を編集できるツールを作る   (new/PARA-9)
      ・系統図を出力するコマンドを実装して   (new/PARA-9)
```

**「図を扱う産物」を求める願い 5 件が 5 件とも cartography へ落ちた(5/5)。**
cartography の道は図そのものを納める道であり、build/tests/security を持たない。
すなわちアプリを求めた神に、図が一枚返る。

---

## 3. PARA-7 / 混同行列 — full/standard の境目

### 3.1 該当の実装

```js
  const quickJa = /一行|修正|バグ|直す|直して|直し|タイポ|誤字|微調整/;
  const quickEn = /\b(fix|bug|typo|rename|tweak|adjust|patch|hotfix|small|quick)\b/;
  const fullJa = /製品|システム|アプリ|プラットフォーム|全体/;
  const fullEn = /\b(product|platform|system|app|application|saas|dashboard|end-to-end|mvp|launch)\b/;
  if (quickJa.test(d) || quickEn.test(w)) return 'quick';
  if (fullJa.test(d) || fullEn.test(w)) return 'full';
  return 'standard';
```

`fullJa` は 5 語。**「サイト」「ウェブ」「EC」「通販」「ポータル」を一つも知らない。**
`fullEn` も `site|website|e-commerce|portal|shop|store` を持たない。
ゆえに web の産物を求める願いは既定の `standard` へ黙って落ちる —— 第16条が禁じる「既定への沈黙の落下」。

### 3.2 混同行列(本走行の計測器 `_matrix_probe.js`、コーパス 98 件)

計測器は既存門 `tests/route-matrix.test.js` の作法を踏襲する:
`forge.chooseScale` を直に呼び、`ROUTES[正解][実際]` を数え、第61条に従い**非対角の各セル**を見る。
コーパスは各道 15 件以上(既存門のコーパスを `src=gate` として取り込み、本走行の実測を `src=new` として足した)。

```
$ node reform/judgment-triad/_matrix_probe.js
```

```
forge: C:\Users\kikus\Documents\workspace\paradise\graph\forge.js
コーパス件数: 98  (道ごと: counsel=18, cartography=15, reform=15, quick=15, standard=17, full=18)

═══ 6 道 × 6 道 混同行列 ═══

正解\実際               counse      cartog      reform       quick      standa        full     計
────────────────────────────────────────────────────────────────────────────────────────────
counsel                 18           0           0           0           0           0      18
cartography              0          15           0           0           0           0      15
reform                   0           0          15           0           0           0      15
quick                    0           0           0          15           0           0      15
standard                 0           2           0           0          15           0      17
full                     0           3           0           0           7           8      18

対角の合計: 86 / 98  (誤着 12 件)

═══ 非ゼロの非対角セル ═══

  [standard → cartography] : 2 件
      ・組織図を編集できるツールを作る   (new/PARA-9)
      ・系統図を出力するコマンドを実装して   (new/PARA-9)

  [full → cartography] : 3 件
      ・一門の家系図を作れるアプリが欲しい   (new/PARA-9)
      ・家系図を作れるアプリが欲しい   (new/PARA-9)
      ・相関図を描けるアプリを作って   (new/PARA-9)

  [full → standard] : 7 件
      ・ECサイトを作れ   (new/PARA-7)
      ・社内ポータルサイトを作れ   (new/PARA-7)
      ・予約サイトを作りたい   (new/PARA-7)
      ・コーポレートサイトが欲しい   (new/PARA-7)
      ・通販サイトを構築して   (new/PARA-7)
      ・ニュースポータルのウェブサイトが欲しい   (new/PARA-7)
      ・build an e-commerce site   (new/PARA-7)

非ゼロの非対角セル数: 3 / 30
```

### 3.3 行列が言っていること

| セル | 件数 | 札 | 意味 |
|------|------|-----|------|
| `full → standard` | **7** | PARA-7 | web の産物語彙が `fullJa`/`fullEn` に無い |
| `full → cartography` | **3** | PARA-9 | 図を作る**アプリ**が図そのものと混同される |
| `standard → cartography` | **2** | PARA-9 | 図を作る**ツール/コマンド**も同じく |
| 他 27 セル | 0 | — | counsel/reform/quick の三道は一件も奪われていない |

**誤着 12/98。全てが full と standard の行に集中している。** counsel・reform・quick の行は完全に対角である
—— これは重要で、**三欠陥は既存の修理が守ってきた領域(counsel/reform の綱引き)には触れていない**。
未着手の領域が別にある、ということである。

### 3.4 既存の門がこれを捕まえない理由(実測)

`tests/route-matrix.test.js` は exit 0、13 passed 0 failed(第4節)。
理由はコーパスにある: 既存門の full は 8 件・standard は 9 件で、**その 17 件に「サイト」語族も
「図を作る産物」も一件も入っていない**。門は正しく動いており、撃っていない的に当たらないだけである。
すなわち **PARA-7/PARA-9 はコーパスの穴であって、門の骨抜きではない。**
修理の相は判定器と**同じ commit でコーパスを足す**必要がある(第61条 W-1 の FLOOR も同時に上げる)。


---

## 4. 基準線 — 現状の門はすべて緑(exit 0)

三欠陥は**赤い門として現れていない**。だから残っている。各門の生出力と exit code:

### 4.1 `node tests/paradise.test.js`(451門と伝えられていたが実測 471門)

```
$ node tests/paradise.test.js ; echo "EXIT=$?"
```

末尾:

```
  ✓ gate-filter: census は自己診断を素で呼ぶ
  ✓ gate-filter: マッチ 0 件は緑ではない — exit 2 で鳴る (AC-11 / 第16条)
  ✓ gate-filter: 絞り込んだ走行は Paradise self-test: を名乗らない (AC-13 / 第22条)
  ✓ gate-filter: 絞り込み走行の最終行は census / tribunal の双方に読まれない (AC-14 / 第22条)
  ✓ gate-filter: 名指した門を走らせない走行は測定ではない — 数が閉じる (reflect F-1/F-2)

Paradise self-test: 471 passed, 0 failed
EXIT=0
```

> ⚠️ 申し送り: **471 であって 451 ではない。** 数は `graph/census.js fix` が書く(第22条)ので
> 依頼文の 451 は古い。README に手で書き直してはならない。

### 4.2 `node tests/route-matrix.test.js`

```
$ node tests/route-matrix.test.js ; echo "EXIT=$?"
```

```
═══ 6 道 × 6 道 混同行列 (第61条) ═══

正解\実際           counse  cartog  reform   quick  standa    full     計
────────────────────────────────────────────────────────────────────
counsel             42       0       0       0       0       0      42
cartography          0       9       0       0       0       0       9
reform               0       0      11       0       0       0      11
quick                0       0       0       8       0       0       8
standard             0       0       0       0       9       0       9
full                 0       0       0       0       0       8       8
```

```
  ✓ W-2 [門番]: 格子は 3 × 10 × 5 = 150 通りを保つ — 配列を空にすれば鳴る
  ✓ W-3 [門番]: 非対角 assert が実物の値を撃っている — 定数同士の比較に化けていない
  ✓ W-4 [門番]: 熟議語彙の**各語**につき、その語だけが標識の願いが在る

Route matrix self-test: 13 passed, 0 failed
EXIT=0
```

**既存門の行列は完全に対角である。** 本走行の行列(3.2)が 12 件の誤着を出すのは、
判定器が壊れたからではなく **コーパスに足した的が新しいから**である。

### 4.3 `node tests/counsel.test.js`

```
$ node tests/counsel.test.js ; echo "EXIT=$?"
```

```
  ✓ 相ごとに相応しい神官が指揮される — 実体を作って命令が届かぬ階層は階層でない (第25条)
  ✓ 創造の道の指揮系統は壊れていない
  ✓ 指揮系統を跨いだ発令はしない — 表が他家の神官を指しても自家に落ちる

Counsel self-test: 210 passed, 0 failed
EXIT=0
```

### 4.4 `node graph/wiring.js check`

```
$ node graph/wiring.js check ; echo "EXIT=$?"
```

```
═══ 🔗 WIRING GATE (第44条 / 第48条) ═══
  engine 39 / 内の辺 73
  · 門の除外 1 件: tests/_pulse-fixture.js — 門ではなく、pulse の門が読む作り物の的である(先頭の _ が支援ファイルを表す)
  ✓ 門 21 本すべてに走らせる者が居る (第44条)
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
EXIT=0
```

> ⚠️ 修理の相への申し送り: **門を一本足したら wiring が数える。** 新しい門(例: `tests/ratify-guard.test.js`)は
> CI か `paradise.test.js` のどちらかに結線しないと、この門が第44条で赤くなる。

### 4.5 `node graph/conclave.js audit`

```
$ node graph/conclave.js audit ; echo "EXIT=$?"
```

```
✓ [creations] coin  domains 6/6
✓ [creations] habit  domains 6/6
✓ [creations] tenbin  domains 6/6
════════════════════════════════════════════════════════
見捨てられた走行: 0 / 判定不能: 0 / 全 13
EXIT=0
```

> この緑は第1.4節が示すとおり **`ratified/total` だけを見た緑**である。
> 13 走行のうち何本が「相を done にせずに ratify された」かを、この監査は答えられない。

### 4.6 基準線まとめ

| 門 | exit | 末尾の集計 |
|----|------|-----------|
| `tests/paradise.test.js` | 0 | `Paradise self-test: 471 passed, 0 failed` |
| `tests/route-matrix.test.js` | 0 | `Route matrix self-test: 13 passed, 0 failed` |
| `tests/counsel.test.js` | 0 | `Counsel self-test: 210 passed, 0 failed` |
| `graph/wiring.js check` | 0 | `✓ 門 21 本すべてに走らせる者が居る (第44条)` |
| `graph/conclave.js audit` | 0 | `見捨てられた走行: 0 / 判定不能: 0 / 全 13` |

**5 門すべて緑。修理の相はこの 5 つを緑のまま保ったうえで、新しい的を通さねばならない。**


---

## 5. 修理案の**候補**(実装はしない)— どの道を奪うかを実測で添える

> 第60条: 弱い印は表を足しても強くならない。第61条: 判定器の修理は別の道を奪う(実測 8/8)。
> ゆえに候補は**必ず混同行列で撃ってから**出す。以下はすべて
> `reform/judgment-triad/_candidate_probe.js` が **`$TMP` に写した graph/ だけを曲げて**測った結果である。
> **本物の `graph/forge.js` は一行も変えていない**(第6節で確認)。

```
$ node reform/judgment-triad/_candidate_probe.js
```

### 5.1 候補の一覧(実測の要約)

| 名 | 変更 | 対角 | 誤着 | 非ゼロ非対角セル | 既存門 route-matrix |
|----|------|------|------|-----------------|--------------------|
| (基準線) | 無し | 86/98 | 12 | 3 | exit 0 |
| **C1** | `fullJa` に `サイト/ウェブ/EC/通販/ポータル`、`fullEn` に `site/website/web-app/e-commerce/portal/shop/store` | **93/98** | 5 | 2 | exit 0 |
| C1a | `fullJa` に「サイト」の一語だけ | 92/98 | 6 | 3 | exit 0 |
| C1b | `fullEn` に `site|website` だけ | 87/98 | 11 | 3 | exit 0 |
| C2 | `isCartography` に `if (wantsProduct(wish)) return false;`(素朴版) | 87/98 | 11 | **4 ← 増えた** | **exit 1** |
| **C2a** | `isCartography` に `if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;` | **89/98** | 9 | 3 | exit 0 |
| **C3** | C1 + C2a 併用 | **96/98** | 2 | 2 | exit 0 |

---

### 5.2 C1 — PARA-7 の候補(サイト語彙を full へ)

```
正解\実際               counse      cartog      reform       quick      standa        full     計
────────────────────────────────────────────────────────────────────────────────────────────
counsel                 18           0           0           0           0           0      18
cartography              0          15           0           0           0           0      15
reform                   0           0          15           0           0           0      15
quick                    0           0           0          15           0           0      15
standard                 0           2           0           0          15           0      17
full                     0           3           0           0           0          15      18

対角の合計: 93 / 98  (誤着 5 件)

═══ 非ゼロの非対角セル ═══

  [standard → cartography] : 2 件
      ・組織図を編集できるツールを作る   (new/PARA-9)
      ・系統図を出力するコマンドを実装して   (new/PARA-9)

  [full → cartography] : 3 件
      ・一門の家系図を作れるアプリが欲しい   (new/PARA-9)
      ・家系図を作れるアプリが欲しい   (new/PARA-9)
      ・相関図を描けるアプリを作って   (new/PARA-9)

非ゼロの非対角セル数: 2 / 30
```

**奪った道: 無し(実測)。** `full → standard` の 7 件が 0 になり、他のどのセルも増えていない。
残る 5 件はすべて PARA-9 の族で、C1 が触っていない場所である。

既存の門への当たり:

```
  $ node tests/route-matrix.test.js   →  exit=0
    Route matrix self-test: 13 passed, 0 failed
  $ node tests/counsel.test.js   →  exit=0
    Counsel self-test: 210 passed, 0 failed
```

> ⚠️ **奪う恐れが無いとは言っていない。** 本走行のコーパスは「サイト」を含む **standard** の願いを
> 一件も持たない。ゆえに「レシピサイトの並び替えを実装して」のような**部分機能の依頼**が
> full へ跳ねるかは **測っていない**。修理の相はこの形の的を standard 側に足してから当てること。
> (`quick` は判定の段が先なので「サイトのタイポを直す」は安全 —— これは基準線の quick 行 15/15 が示す。)

### 5.3 C1a / C1b — 最小語彙では足りない(日英の片枝)

```
C1a (fullJa に「サイト」のみ): 対角 92/98
  [full → standard] : 1 件
      ・build an e-commerce site   (new/PARA-7)

C1b (fullEn に site|website のみ): 対角 87/98
  [full → standard] : 6 件
      ・ECサイトを作れ   (new/PARA-7)
      ・社内ポータルサイトを作れ   (new/PARA-7)
      ・予約サイトを作りたい   (new/PARA-7)
      ・コーポレートサイトが欲しい   (new/PARA-7)
      ・通販サイトを構築して   (new/PARA-7)
      ・ニュースポータルのウェブサイトが欲しい   (new/PARA-7)
```

**日英の片方だけを直すと、もう片方が丸ごと残る。** 第60条(b)「規則を足したら両枝を持て」が
語彙の日英にもそのまま当たる、という実測である。

---

### 5.4 C2 — PARA-9 の**素朴な**候補は逆に悪化する(第61条の実演)

`isCartography` の先頭に `if (wantsProduct(wish)) return false;` を置いた版:

```
正解\実際               counse      cartog      reform       quick      standa        full     計
────────────────────────────────────────────────────────────────────────────────────────────
counsel                 18           0           0           0           0           0      18
cartography              0          13           2           0           0           0      15
reform                   0           0          15           0           0           0      15
quick                    0           0           0          15           0           0      15
standard                 0           0           0           0          17           0      17
full                     0           1           1           0           7           9      18

対角の合計: 87 / 98  (誤着 11 件)

═══ 非ゼロの非対角セル ═══

  [cartography → reform] : 2 件
      ・楽園の相の系統図を描いてほしい   (gate)
      ・楽園の相の依存をダイアグラムにして   (new)

  [full → cartography] : 1 件
      ・相関図を描けるアプリを作って   (new/PARA-9)

  [full → reform] : 1 件
      ・一門の家系図を作れるアプリが欲しい   (new/PARA-9)

  [full → standard] : 7 件
      ・ECサイトを作れ   (new/PARA-7)
      ・社内ポータルサイトを作れ   (new/PARA-7)
      ・予約サイトを作りたい   (new/PARA-7)
      ・コーポレートサイトが欲しい   (new/PARA-7)
      ・通販サイトを構築して   (new/PARA-7)
      ・ニュースポータルのウェブサイトが欲しい   (new/PARA-7)
      ・build an e-commerce site   (new/PARA-7)

非ゼロの非対角セル数: 4 / 30
```

**奪った道: `cartography` — 2 件が reform へ攫われた。非ゼロセルは 3 → 4 に増えた。**
そのうち `楽園の相の系統図を描いてほしい` は **既存門 `tests/route-matrix.test.js` のコーパスの願い**である。
ゆえに既存門が即座に赤くなる(実測):

```
  $ node tests/route-matrix.test.js   →  exit=1
    ✗ M-2 [対角]: 対角線の合計がコーパスの件数と等しい — 全件が正しい道へ着く
    ✗ M-3 [非対角]: 非対角の**各セル**が 0 — どの道も他の道を奪っていない
    Route matrix self-test: 11 passed, 2 failed
```

**原因の実測** — `wantsProduct()` は `PRODUCT_RE` の**一字の名**にも当たる:

```
$ node -e "const f=require('.../graph/forge.js'); console.log('PRODUCT_RE source:', f.PRODUCT_RE.source)"
PRODUCT_RE source: アプリ|ツール|コマンド|口|門|画面|機能|フラグ|オプション|エンドポイント|ボタン|一段|相|ページ|タイマー|\b(?:app|tool|command|flag|option|cli|api|endpoint|button|screen|feature|toggle)\b
```

```
"楽園の相の系統図を描いてほしい"
   FALSE_FRIENDS.test = false  match= null
   wantsProduct = true   isReformSubject = true
```

「楽園の**相**の系統図」の「相」が産物の名と読まれ(`PRODUCT_RE` の `相`、しかも
`PRODUCT_FALSE_FRIENDS` の「位相/様相/真相…」のどれにも当たらない)、作図が打ち消され、
次の段 `isReformSubject` が「楽園」を拾って reform へ攫った。

> **これが第60条そのものである。** 「弱い印(一字の名)を打ち消しに使えば、別の道を奪う。」
> 第61条の混同行列がこれを 1 走行で捕らえた —— **列だけの門なら
> `full → cartography` が 3 → 1 に減ったのを見て「改善した」と言ったはずである。**
> C2 は **採ってはならない候補**である。

---

### 5.5 C2a — PARA-9 の候補(強い産物名のみで打ち消す)

`PRODUCT_STRONG_RE`(アプリ/ツール/コマンド/画面/機能… 一字の名を**含まない**)+ 紛れ語の守り:

```
正解\実際               counse      cartog      reform       quick      standa        full     計
────────────────────────────────────────────────────────────────────────────────────────────
counsel                 18           0           0           0           0           0      18
cartography              0          15           0           0           0           0      15
reform                   0           0          15           0           0           0      15
quick                    0           0           0          15           0           0      15
standard                 0           0           0           0          17           0      17
full                     0           1           1           0           7           9      18

対角の合計: 89 / 98  (誤着 9 件)

═══ 非ゼロの非対角セル ═══

  [full → cartography] : 1 件
      ・相関図を描けるアプリを作って   (new/PARA-9)

  [full → reform] : 1 件
      ・一門の家系図を作れるアプリが欲しい   (new/PARA-9)

  [full → standard] : 7 件
      (PARA-7 の族 7 件 — C2a は触っていない)

非ゼロの非対角セル数: 3 / 30
```

```
  $ node tests/route-matrix.test.js   →  exit=0
    Route matrix self-test: 13 passed, 0 failed
  $ node tests/counsel.test.js   →  exit=0
    Counsel self-test: 210 passed, 0 failed
```

**奪った道の実測:**

- `cartography` **は守れた** — 15/15。C2 と違い一件も失っていない(一字の名を使わなかったため)。
- `standard` **も守れた** — 17/17(基準線の 15/17 から改善。PARA-9 の standard 側 2 件が直った)。
- だが **`full → reform` を一件作った。** `一門の家系図を作れるアプリが欲しい`。

新しい誤着の原因(実測):

```
$ node -e "const f=require('.../graph/forge.js');
  console.log('REFORM_RE source:', f.REFORM_RE.source);
  console.log('一門の家系図…の match:', ('一門の家系図を作れるアプリが欲しい'.match(f.REFORM_RE)||[null])[0]);"

REFORM_RE source: (楽園|paradise|ハーネス|harness|憲法|constitution|engine|エンジン|門|gate|パイプライン|pipeline|自己改善|self-improve|オーケストレーション|orchestration|枢機卿|cardinal|神官|priest)
一門の家系図を作れるアプリが欲しい match: "門"
```

**「一**門**の家系図」の「門」が `REFORM_RE` の「門」(楽園の判定の門)に当たった。**
cartography の打ち消しが効いた結果、願いは次の段 `isReformSubject` へ落ち、そこで攫われた。
これは PARA-9 の修理が作った欠陥ではなく、**PARA-9 の修理が初めて露出させた `isReformSubject` の弱い印**である。

もう一件 `相関図を描けるアプリを作って` が**残る**理由(実測):

```
"相関図を描けるアプリを作って"
   FALSE_FRIENDS.test = true  match= "相関"
   wantsProduct = false   isReformSubject = false
```

「**相関**図」が `PRODUCT_FALSE_FRIENDS` の「相関」に当たり、`!PRODUCT_FALSE_FRIENDS.test(wish)` が false になるので、
文中に「アプリ」が在っても打ち消しが**発火しない**。
**紛れ語の守りが強すぎて、同じ文の正しい産物名まで巻き添えにしている。**

> 修理の相への申し送り: 紛れ語の守りは「文に紛れ語が在れば産物名を全否定する」形ではなく、
> **「紛れ語の当たった箇所を取り除いてから強い名を探す」**形でなければ、一つの紛れ語が文全体を無効にする。
> (`wantsProduct()` 自身が同じ形をしているので、そちらにも同じ疑いが在る —— **本走行では未測定**。)

---

### 5.6 C3 — C1 + C2a 併用(最良だが未完)

```
正解\実際               counse      cartog      reform       quick      standa        full     計
────────────────────────────────────────────────────────────────────────────────────────────
counsel                 18           0           0           0           0           0      18
cartography              0          15           0           0           0           0      15
reform                   0           0          15           0           0           0      15
quick                    0           0           0          15           0           0      15
standard                 0           0           0           0          17           0      17
full                     0           1           1           0           0          16      18

対角の合計: 96 / 98  (誤着 2 件)

═══ 非ゼロの非対角セル ═══

  [full → cartography] : 1 件
      ・相関図を描けるアプリを作って   (new/PARA-9)

  [full → reform] : 1 件
      ・一門の家系図を作れるアプリが欲しい   (new/PARA-9)

非ゼロの非対角セル数: 2 / 30
```

```
  $ node tests/route-matrix.test.js   →  exit=0
    Route matrix self-test: 13 passed, 0 failed
  $ node tests/counsel.test.js   →  exit=0
    Counsel self-test: 210 passed, 0 failed
```

**C1 と C2a は互いを壊さない(実測)** — 単独の結果がそのまま重なり、12 件の誤着が 2 件まで減る。
だが **第61条の合格線は「非対角の各セルが 0」である。2 件残る以上、C3 は未完である。**
残る 2 件はどちらも PARA-9 の族で、原因は cartography の打ち消しそのものではなく:

1. `PRODUCT_FALSE_FRIENDS` の当たり方(文全体を無効にする)— `相関図…アプリ`
2. `REFORM_RE` の弱い印「門」—「一**門**の家系図」

修理の相はこの二つに**別々の**答えを用意する必要がある。
特に 2 は第60条が名指しで警告している「弱い印は表を足しても強くならない」の族で、
**答えは語彙の追加ではなく除去/文脈化になる疑いが濃い**(過去の走行では `REFORM_RE` から engine の固有名を
**撃ち捨てた**のが正解だった)。

---

### 5.7 PARA-6 の修理候補(実装しない)

| 候補 | 内容 | 奪う恐れ / 先に測るべきこと |
|------|------|--------------------------|
| **R1** | `ratify()` の祝福の枝に「その領域の相が全て `done` か」の確認を足し、違えば `throw`(CLI は exit 2) | **既存の 13 走行台帳のうち何本が引っかかるかを先に数えよ。** `conclave.js audit` が今 ✓ を出している 13 本(第4.5節)に嘘の帳が在れば即赤になる。**それは正しい赤である**(第21条: 緩めるな) |
| **R2** | `runAbandonment()` の `closed` 判定に「相の done 数 == 相の総数」を加える | audit の裁きが既存台帳に対して変わる。CI が赤になる可能性が高い。**先に 13 本の相の内訳を `--json` で数えてから**当てること |
| **R3** | `ratify` にも証拠を要求する(`beat` が既に sha256・重複・空・ディレクトリを見ている作法を流用) | 運用が重くなる。だが「拒否の側は厳密、祝福の側は無条件」という非対称(第1.1節)は根から消える |
| **R4** | 門を一本足す(例 `tests/ratify-guard.test.js`)— pending を抱えた領域に ratify を撃ち、**exit 非 0 を期待する** | ⚠️ `graph/wiring.js check`(第4.4節)が第44条で門の孤児を数える。**CI か `paradise.test.js` のどちらかに同じ commit で結線せよ** |

**R1 と R4 は対にして入れるのが筋である**(規則と、その規則が本当に鳴ることの証明 = 第21条「壊して鳴らす」)。
R2 は既存台帳への影響が読めないので、当てる前に 13 本の内訳を測ること。

---

### 5.8 修理の相への申し送り(実装の順序と、必ず同じ commit でやること)
1. **本走行は `graph/` を一行も変えていない。** 第6.1節の `git status` がそれを示す。
2. **コーパスと判定器は同じ commit で動かす。** `tests/route-matrix.test.js` の `W-1 [門番]` が
   道ごとの件数の **FLOOR** を凍らせている(`counsel: 42, cartography: 9, reform: 11, quick: 8, standard: 9, full: 8`)。
   的を足したら FLOOR も上げること。減らせば門番が鳴る。
3. **門を足したら `graph/wiring.js check` を走らせる**(第44条)。結線していない門は孤児として赤くなる。
4. **README の数を手で書かない**(第22条)。`node graph/census.js fix` が測定から書く。
   なお実測は **471** であって依頼文の 451 ではない(第4.1節)。
5. **C2 は採るな。** 既存門を赤くする形で cartography を奪う(第5.4節に生の exit 1)。
6. 第61条の合格は「非対角の**各セル**が 0」。C3(誤着 2)でも**未完**である。

---

## 6. 本走行が何も壊していないことの確認

### 6.1 `graph/` を一行も変えていない

```
$ git branch --show-current ; git status --porcelain
reform/judgment-triad
?? reform/judgment-triad/
```

**追跡下のファイルの変更は 0 件。** 新しいのは `reform/judgment-triad/` の一つだけである。
候補の実測はすべて `$LOCALAPPDATA/Temp` に写した複製の上で行った(第5節)。何も commit していない。

### 6.2 C3 を当てた写しで 471 門を通した(候補の裏取り)

第5節の `_candidate_probe.js` は `graph/` だけを写す軽い計測器なので、
`tests/paradise.test.js`(git 作業樹を触る門を含む)には向かない。
ゆえに **リポジトリ丸ごとを写して**もう一度撃った。

まず **対照群**(何も曲げていない写し):

```
$ node -e "fs.cpSync(ROOT, $TMP/ctrlcopy/paradise, {recursive:true, filter: .git を除く})"
$ cd $TMP/ctrlcopy/paradise && node tests/paradise.test.js ; echo "EXIT=$?"

Paradise self-test: 469 passed, 0 failed, 2 skipped
EXIT=0
```

> 写しでは 2 件が `skipped` になる(`.git` を写していないため、版管理下の現物を見る門が
> 自ら skip を名乗る)。469 + 2 = 471 で本体と数が閉じる。**これが写しの基準線である。**

次に **C3(C1 + C2a)を当てた写し**:

```
$ # $TMP/c3clean/paradise/graph/forge.js にだけ C1 と C2a を当てる
$ cd $TMP/c3clean/paradise && node tests/paradise.test.js ; echo "EXIT=$?"

Paradise self-test: 469 passed, 0 failed, 2 skipped
EXIT=0
```

**C3 は 471 門のうち一本も落とさない(✗ 0 件、対照群と完全に同じ数)。**

> ⚠️ 記録として残す — 第5節の一次実測(複数の候補を**同時並行で**走らせた版)では
> `hermetic: …版管理下の現物を汚していない (第58条(c))` など 4 件が ✗ になった。
> **これは候補のせいではない。** 対照群と C3 を**単独で**走らせ直すと ✗ は 0 件である。
> 原因は写し同士が同じ git 作業樹/一時領域を奪い合ったことで、`⚠️ ledger unreadable`
> `fatal: not a git repository` の混入がそれを示している。
> **同時並行の測定は測定ではない**(第58条の趣旨)—— 修理の相は門を**一つずつ**走らせること。

---

## 7. 総括 — 三欠陥の性質の違い

| 札 | 種別 | 現状の門は捕まえるか | 修理の難度(実測に基づく) |
|----|------|--------------------|------------------------|
| **PARA-6** | **機構の欠落**(規則が存在しない) | 捕まえない。`conclave.js audit` は嘘の 6/6 を `closed` として ✓ で通す(1.4節) | 規則を足すだけ。**だが既存 13 台帳が赤くなる可能性を先に測れ** |
| **PARA-7** | **語彙の穴**(既定への沈黙の落下) | 捕まえない。既存コーパスに「サイト」語族が一件も無い(3.4節) | **低い**。C1 は他の道を一つも奪わなかった(5.2節)。日英**両枝**を同時に足すこと(5.3節) |
| **PARA-9** | **非対称な守り**(counsel には在る打ち消しが cartography に無い) | 捕まえない。同上 | **高い**。素朴な修理 C2 は cartography を 2 件奪い既存門を赤くした(5.4節)。C2a でも `REFORM_RE` の「門」と `PRODUCT_FALSE_FRIENDS` の「相関」という**別の二つの弱い印**が露出する(5.5節) |

**共通しているのは「門が緑であること」が健全さの証明になっていない、という一点である。**

- PARA-6 では、**門が数える対象そのもの(`ratified/total`)が偽造可能**だった。
- PARA-7/PARA-9 では、**門は正しく動いているが、撃つ的がまだ存在しなかった**。

前者は第37条(緑の意味を問え)の族、後者は第61条(混同行列で撃て)の族である。
修理の相は、この二つを**別の作法**で直さねばならない。
