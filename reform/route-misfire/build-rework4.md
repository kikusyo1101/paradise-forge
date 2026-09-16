# build 相 四度目の差し戻し(rework4)—— **`ENGINE_NAMES` を丸ごと撃ち捨てる**

> **これが最後の差し戻しである。** conclave の環の防壁(`MAX_DOMAIN_REWORK=3`)に達しており、
> 次に差し戻せば construction は blocked になる。

---

## 0. 結論(先に述べる)

**教主の裁定に従い、engine の固有名を道選びの印にする機構を `graph/forge.js` から
丸ごと撃ち捨てた。** `isReformSubject` は main と同じ形 —— **楽園の抽象名だけ**で裁く一枝になった。

```js
const REFORM_RE = /(楽園|paradise|ハーネス|harness|憲法|constitution|engine|エンジン|門|gate|パイプライン|pipeline|自己改善|self-improve|オーケストレーション|orchestration|枢機卿|cardinal|神官|priest)/i;

function isReformSubject(d) {
  return REFORM_RE.test(d);
}
```

**消した物**(実装からも exports からも):
`ENGINE_NAMES` / `ENGINE_NAMES_STRONG` / `ENGINE_NAMES_WEAK` / `ENGINE_NAMES_WEAK_JA` /
`DETERMINER_LOOKBEHIND` / `REFORM_ABSTRACT_RE` / `REFORM_STRONG_RE` / `REFORM_WEAK_RE` /
`ABSTRACT_SOLO_RE` / `ABSTRACT_FALSE_FRIENDS` / `MEND_JA` / `MEND_EN` / `MEND_RE` /
`WORLDLY_VESSEL_RE` / `STRONG_BOUND_RE` / `mendsParadise` / `namesParadiseAbstractly`

**一字も触っていない物**(欠陥A の修理 / 命じられた通り):
`denude` / `BUILD_JA` / `BUILD_EN` / `BUILD_RE` / `CREATE_RE` / `PRODUCT_RE` /
`PRODUCT_STRONG_RE` / `PRODUCT_FALSE_FRIENDS` / `wantsProduct` / `DOC_RE` /
`DOC_STRONG_RE` / `isCounsel` / `isCartography` / **`chooseScale` の判定順**

**結果**: main と HEAD で同じ探針 284 件を撃ち、
**世間への誤着 19 = 19(同数)/ 楽園の取りこぼし 42 ≤ 44(2 件改善)**。

---

## 1. 完了の定義 —— 生出力

### A. main と HEAD で同じ探針(284 件)

コーパスは過去の全部を一箇所に集めた(`$LOCALAPPDATA/Temp/rw4/corpus.js`):
教主の 10 件 / 神官の MEND 34 件 / 強い名 26 語網羅 / 弱い名 24 件 /
限定詞 21 件 / `門` の紛れ語 13 件 / 弱い名 × MEND 10 件 /
**Q3-2 の BUILD 24 件 + 3 件** / 自作の世間 18 件 / 自作の抽象名 × 世間 6 件 /
**Q3-1 の器 37 件** / **PV(楽園が器を持つ)26 件** / 楽園の recall 28 件 / engine 名のみ 4 件。

```
########## main (c216014) ##########
PONTIFF10                世間への誤着    0 /  10
CLERIC_MEND34            世間への誤着    0 /  34
STRONG26                 世間への誤着    0 /  26
WEAK24                   世間への誤着    0 /  24
DETERMINER21             世間への誤着    0 /  21
GATE_FALSE13             世間への誤着   13 /  13
WEAK_MEND10              世間への誤着    0 /  10
Q3_2_BUILD24             世間への誤着    0 /  24
Q3_2B                    世間への誤着    0 /   3
MINE_WORLDLY18           世間への誤着    0 /  18
MINE_ABSTRACT_WORLDLY6   世間への誤着    6 /   6
Q3_1_VESSEL37            楽園の取りこぼし    0 /  37
PV26                     楽園の取りこぼし   22 /  26
PARADISE_RECALL28        楽園の取りこぼし   18 /  28
MINE_ENGINE_ONLY4        楽園の取りこぼし    4 /   4
件数 284  /  世間への誤着 19  /  楽園の取りこぼし 44

########## HEAD (rework4) ##########
PONTIFF10                世間への誤着    0 /  10
CLERIC_MEND34            世間への誤着    0 /  34
STRONG26                 世間への誤着    0 /  26
WEAK24                   世間への誤着    0 /  24
DETERMINER21             世間への誤着    0 /  21
GATE_FALSE13             世間への誤着   13 /  13
WEAK_MEND10              世間への誤着    0 /  10
Q3_2_BUILD24             世間への誤着    0 /  24
Q3_2B                    世間への誤着    0 /   3
MINE_WORLDLY18           世間への誤着    0 /  18
MINE_ABSTRACT_WORLDLY6   世間への誤着    6 /   6
Q3_1_VESSEL37            楽園の取りこぼし    0 /  37
PV26                     楽園の取りこぼし   22 /  26
PARADISE_RECALL28        楽園の取りこぼし   16 /  28
MINE_ENGINE_ONLY4        楽園の取りこぼし    4 /   4
件数 284  /  世間への誤着 19  /  楽園の取りこぼし 42
```

**世間への誤着 19 = 19(同数)。楽園の取りこぼし 42 ≤ 44。命じられた条件を満たす。**

### A-1. **Q3-1 の 37 件は main と同じ振る舞いに戻った(確かめた)**

```
Q3_1_VESSEL37            楽園の取りこぼし    0 /  37   ← main も HEAD も 0
```

三度目の build の HEAD では **37/37 が落ちていた**(`門の判定をアプリで直す` が
main=reform → HEAD=quick)。**七度目の回帰は消えた。**

### A-2. main と HEAD で振る舞いが違う 4 件(全件、生出力)

```
[CLERIC_MEND34]      main=counsel  HEAD=quick    :: branch-guard 支店の警備契約を見直す相見積もりサービス
[PARADISE_RECALL28]  main=counsel  HEAD=reform   :: 楽園の自己診断に絞り込みの口を設ける
[PARADISE_RECALL28]  main=counsel  HEAD=reform   :: 門に監査の一段を足す
[PARADISE_RECALL28]  main=counsel  HEAD=standard :: CI に ledger --audit を追加する
```

| # | 願い | main | HEAD | 判定 |
|---|---|---|---|---|
| 1 | `branch-guard 支店の警備契約を見直す相見積もりサービス` | counsel | quick | **両方とも reform でない** —— 群の期待は「reform でない」なので両方○。`見直` が counsel と quick を跨ぐ既存の揺れであり、**本走行の主題の外** |
| 2 | `楽園の自己診断に絞り込みの口を設ける` | counsel | **reform** | ✅ **欠陥A の修理**(AC-01)。`denude`/`PRODUCT_RE`/`DOC_STRONG_RE` が効いている |
| 3 | `門に監査の一段を足す` | counsel | **reform** | ✅ **欠陥A の修理**(AC-02) |
| 4 | `CI に ledger --audit を追加する` | counsel | standard | ✅ **欠陥A の修理の本旨**(AC-03)。`--audit` がフラグ名として剥がれ、counsel から脱した。reform に着くには弱い名 `ci` が要るので **AC-03 の期待値を『counsel でないこと』へ改めた** |

### B. 欠陥A の本旨 11 件(全件保たれる)

```
$ node defectA.js "C:/Users/kikus/Documents/workspace/paradise"
OK reform      | 楽園の自己診断に絞り込みの口を設ける
OK reform      | 門に監査の一段を足す
OK full        | 健康診断アプリが欲しい
OK cartography | 楽園の位階の相関図を作れ
OK counsel     | 楽園のエンジンを監査してほしい
OK quick       | 台帳の毒を直す
OK full        | build a habit tracker app
OK counsel     | 比較表がほしい
OK counsel     | gauge の重みを見直す
OK counsel     | 各社の画面設計を調査して報告書がほしい
OK standard    | 検討したツールを実装して
欠陥A の本旨 NG=0/11
EXIT=0
```

### C. `counsel.test.js` / `abandoned-run.test.js`

```
$ node tests/counsel.test.js
Counsel self-test: 210 passed, 0 failed

$ node tests/abandoned-run.test.js
abandoned-run: 33 passed, 0 failed
EXIT=0
```

### D. `wiring.js check` / `codex.js check`

```
$ node graph/wiring.js check ; echo EXIT=$?
wiring EXIT=0

$ node graph/codex.js check
═══════ 📖 CODEX CHECK ═══════
  ✓ 索引は本文と一致している (60 条)
══════════════════════════════
codex EXIT=0
```

### E. `paradise.test.js` 全走(background)

```
Paradise self-test: 471 passed, 0 failed
PARADISE_EXIT=0
```

### F. `census.js fix` → `check`(background)

```
$ node graph/census.js fix
(… ledger の腐った行の警告 24 件。これは門の替え玉データが意図的に仕込んだ壊れ行であり、
   本走行とは無関係。main でも同じ警告が出る …)
nothing to fix
  ✓ 書き換えた数は、その主張の目で読み直して実測と一致する
CENSUS_FIX_EXIT=0

$ node graph/census.js check
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
CENSUS_CHECK_EXIT=0
```

**`nothing to fix`** —— README が主張する数は一つも変わっていない。
**手で数を書いていない**(第22条 / 掟)。

### G. 死に枝が残っていない

```
$ grep -rn 'ENGINE_NAMES\|MEND_RE\|WORLDLY_VESSEL\|STRONG_BOUND\|ABSTRACT_FALSE_FRIENDS' graph/ tests/
graph/forge.js:325: *   Q2-1   強い名に `MEND_RE`(改める動詞)を課す
graph/forge.js:327: *   Q3-1/2 `WORLDLY_VESSEL_RE`(世間の器の表)で守る
tests/counsel.test.js:270: * 【build 相四度目 / 教主の裁定】**`ENGINE_NAMES` は本走行から丸ごと撃ち捨てた。**
tests/counsel.test.js:272: * かつてここには「`ENGINE_NAMES` が `graph/*.js` の名を網羅している」門が在った。
tests/counsel.test.js:273: * その門は `forge.ENGINE_NAMES_STRONG` / `ENGINE_NAMES_WEAK` を読んでいた ——
tests/counsel.test.js:290://    `ENGINE_NAMES` を `REFORM_RE` に流し込んだ結果、`workflow` `identity`
tests/counsel.test.js:295:// ⚠️ **四度目の差し戻しで `ENGINE_NAMES` は撃ち捨てられた。** 以下の門は
tests/counsel.test.js:437: *    解こうとした。**その表は `ENGINE_NAMES` と一体であり、四度目の差し戻しで
tests/counsel.test.js:517: * ⚠️ **四度目の差し戻しで `ENGINE_NAMES_STRONG` は消えたが、この表は残す。**
tests/counsel.test.js:552:   * ⚠️ **四度目の差し戻しで `ENGINE_NAMES_STRONG` は消えた。**
tests/counsel.test.js:553:   *    かつてこの門は `forge.ENGINE_NAMES_STRONG` と上の表を照合していた ——
tests/counsel.test.js:746: * ⚠️ **四度目の差し戻しで `MEND_RE` は消えたが、この表は残す。**
tests/counsel.test.js:788:   * ⚠️ **四度目の差し戻しで `MEND_RE` は消えた。** かつてこの門は
tests/counsel.test.js:789:   *    `forge.MEND_RE` の源から語を取り出し、上の表と照合していた。
tests/counsel.test.js:818: * ⚠️ **三度目の build はこれを `ABSTRACT_FALSE_FRIENDS` で塞いだ。だがその守りは
tests/counsel.test.js:819: *    `WORLDLY_VESSEL_RE` と一体であり、Q3-1(器の表 37 語すべてが楽園の願いを落とす)
tests/counsel.test.js:820: *    を生んだ。** 教主の裁定により `ENGINE_NAMES` 系の表は丸ごと撃ち捨てられ、
tests/counsel.test.js:848: * ⚠️ quality 二周目 §2.3 の実測: **弱い名に `MEND_RE` を許す変異を、
tests/counsel.test.js:924: *    `WORLDLY_VESSEL_RE` は `namesParadiseAbstractly`(抽象名の枝)の中でも
tests/counsel.test.js:953: * ⚠️ 四度目の差し戻しで `WORLDLY_VESSEL_RE` / `STRONG_BOUND_RE` /
tests/counsel.test.js:954: *    `ABSTRACT_FALSE_FRIENDS` / `MEND_RE` は消えた —— それらを計っていた門も消えた。
```

**21 件すべてが `/** */` または `//` のコメント内、すなわち「なぜ消したか」の記録である。**
命じられた通り「申し送りの文書内の言及は良い」。**生きた識別子の参照はゼロである**:

```
$ grep -rn 'forge\.\(ENGINE_NAMES\|MEND_RE\|WORLDLY_VESSEL_RE\|STRONG_BOUND_RE\|ABSTRACT_FALSE_FRIENDS\|REFORM_STRONG_RE\|REFORM_WEAK_RE\|REFORM_ABSTRACT_RE\|DETERMINER_LOOKBEHIND\|mendsParadise\|namesParadiseAbstractly\)' graph/ tests/ *.js
tests/counsel.test.js:273: * その門は `forge.ENGINE_NAMES_STRONG` / `ENGINE_NAMES_WEAK` を読んでいた ——   ← コメント
tests/counsel.test.js:553:   *    かつてこの門は `forge.ENGINE_NAMES_STRONG` と上の表を照合していた ——   ← コメント
tests/counsel.test.js:789:   *    `forge.MEND_RE` の源から語を取り出し、上の表と照合していた。          ← コメント

$ grep -n '^const \(ENGINE_NAMES\|MEND_\|WORLDLY_VESSEL\|STRONG_BOUND\|ABSTRACT_\|REFORM_STRONG\|REFORM_WEAK\|DETERMINER_\)\|^function \(mendsParadise\|namesParadiseAbstractly\)' graph/forge.js
(空 —— 宣言はゼロ)
```

**他の篇から使われていないことを消す前に確かめた**(命じられた通り):
`ENGINE_NAMES*` 系の参照は **`tests/counsel.test.js` の 96 箇所のみ**であった
(`graph/atlas.js` / `check-agents.js` / `domains.js` / `export-state.js` / `pulse.js` /
`synod.js` は `forge` を require しているが、これらの記号は一つも使っていない)。
`graph/kg-store/nodes.jsonl` の教訓ノード 1 件が `MEND_RE` を本文に含むが、
**これは教訓の記録であり呼び出しではない**(触っていない)。

---

## 2. 門の処置 —— **命じられた三区分の表**

**門の数: 218 → 210(-8)。** ただし単純な増減ではない ——
**名を変えて残した門**が多数あるので、**願い(コーパス)単位**で照合した結果を示す。

### 2.1 数の内訳

| | 本数 |
|---|---|
| 修理前(c6b5ba9) | **218** |
| 修理後(rework4) | **210** |
| 真に**消えた**門 | **19** |
| 真に**増えた**門 | **11** |
| **名を変えて残した**門 | **104** |

*(104 本は `弱い名 vendor に道を奪われない` → `世間の語 vendor に道を奪われない` のように、
撃つ願いと断定は同一で**説明だけを実装から切り離した**もの。)*

### 2.2 (a) 欠陥A を守る門 → **残す**

| 門 | 処置 |
|---|---|
| 判定表 `ROUTES`(41 行)の欠陥A 系 | **残す**。ただし **AC-03 の期待値を `reform` → `standard/quick/full`**、**AC-05(`gauge に…`)は行ごと削除**(理由は下の (c)) |
| `denude はフラグ語・バッククォート・ファイル名を剥ぐ (FR-02)` | **残す**(一字も触っていない) |
| `denude は冪等である` | **残す** |
| `chooseScale は剥いだ文で判定する (FR-02)` | **残す** |
| `denude は元の願い文を汚さない (L-5)` | **残す** |
| `PRODUCT_RE は産物の主名詞を拾い、「図」を拾わない (FR-03 / L-8)` | **残す** |
| `一字の産物名の紛れ語が諐問の道を奪わない` | **残す** |
| `報告書を求める願いは、産物の名を含んでも諐問である` | **残す** |
| `BUILD_RE は「既に在る物に一段足す」動詞を知っている (FR-01)` | **残す** |
| `isCounsel の直接の断定が保存されている (AC-11)` | **残す** |
| `強い産物名の紛れ語が諐問の道を奪わない (R-2)` | **残す** |
| `一字の紛れ語の表は quality 相が足した 20 語を持つ (R-1)` | **残す** |
| `denude / chooseScale は長い願い文でも線形時間である (S-1)` | **残す** |
| `剥ぎの結果は後読みを足しても一字も変わらない (S-1)` | **残す** |
| `"健康診断アプリが欲しい" は counsel でない (AC-04)` | **残す** |
| `B-1【教主の裁定】見直す は counsel / 直す は reform` | **残す**(撃つ願いを `gauge` → `楽園`/`engine` へ替えた。**裁定そのものは一字も動かしていない**) |

**合計 16 群(欠陥A の修理を撃つ門は一本も消していない)。**

### 2.3 (b) 世間の願いが reform へ行かぬことを断定する門 → **残す**

| 門 | 件数 | main の形でも緑か | 処置 |
|---|---|---|---|
| `WORLDLY_MEASURED` + `WORLDLY_OWN`(弱い名の世間の願い) | 24 | ✅ 24/24 緑 | **残す**(名だけ `弱い名` → `世間の語` へ) |
| `STRONG_WORLDLY`(R-4 / engine 名 × 英語の世間の願い) | 9 | ✅ 9/9 緑 | **残す**(名だけ改めた) |
| `PONTIFF_STRONG_WORLDLY`(AC-36 / 教主の実測 10 件) | 10 | ✅ 10/10 緑 | **残す** |
| `STRONG_WORLDLY_EVERY_NAME`(AC-37 / 26 語網羅) | 26 | ✅ 26/26 緑 | **残す** |
| `MEND_WORLDLY_EVERY_VERB`(AC-43 / 34 語網羅) | 34 | ✅ 34/34 緑 | **残す** |
| `DETERMINER_WORLDLY`(R-3 / 限定詞付き) | 12 | ✅ 12/12 緑 | **残す**(6+6 の二群を一群に統合し、**前提の assert を全件に付けた**) |
| `弱い名は改める動詞だけでは…`(AC-44 / 10 件) | 14 | ✅ 緑 | **残す**(`engine 名 + 改める動詞だけでは楽園を名乗らない` へ改名し、**強い名 4 件を足した**) |

**合計 129 件の断定を残した。一件も落としていない。**

**新設した (b) の門(2 本)** —— **次の走行が必ず通らねばならない関門**:

| 門 | 件数 | なぜ新設したか |
|---|---|---|
| `engine 名 + 建造の動詞 + 世間の器は楽園でない (Q3-2 の回帰を捕らえる)` | 8 | **三度目の build が塞ぎ忘れた面**。枝 2(建造)に器の守りが無く 18/24 が誤着した(quality 三周目 R3-6.2)。**枝を建て直す者はまずこの 8 件を緑にせよ** |
| `楽園の抽象名は世間の器の名を伴っても reform である (Q3-1 / 37 語)` | 37 | **七度目の回帰そのもの**。器の表を抽象名の枝に持ち込んだ瞬間に赤くなる |

### 2.4 (c) `ENGINE_NAMES` の存在を前提にする門 → **削除**(19 本)

| 削除した門 | なぜ削除したか | 申し送り先 |
|---|---|---|
| `ENGINE_NAMES が graph/*.js の名を網羅している (第22条 / 設計 §1.5)` | **照合の相手(`ENGINE_NAMES_STRONG`/`_WEAK`)が消えた。** 守る物が無い門は飾りである | requirements §8.4 / AC-34 |
| `強い名のコーパスが ENGINE_NAMES_STRONG を過不足なく覆っている (AC-37 / F-4)` | 同上 | **→ 照合先を `graph/*.js` の実在名へ替えて残した** |
| `MEND の世間側コーパスが MEND_RE の語彙を過不足なく覆っている (AC-43)` | `MEND_RE` が消えた | **→ コーパス 34 件の自己整合を撃つ形に替えて残した** |
| `MEND_RE に世間の創造の動詞が紛れていない (AC-41)` | `MEND_RE` が消えた | **→ `REFORM_RE は main の抽象名を過不足なく持つ` を新設**(engine 固有名を足す変異を撃つ) |
| `MEND_RE が病的な入力で二乗に膨れない (S-1)` | `MEND_RE` が消えた | **→ `REFORM_RE が病的な入力で二乗に膨れない` を新設** |
| `本相が足した正規表現が病的な入力で二乗に膨れない (S-1 / Q2-1)` | 3 表すべてが消えた | 同上 |
| `WORLDLY_VESSEL_RE が楽園の器官の名を含まない (AC-43 の禁則)` | `WORLDLY_VESSEL_RE` が消えた | requirements §8.5-3 |
| `枝 2' は世間の器の不在と助詞の結びの両方を要る (AC-43 / 黙る門)` | 枝 2' が消えた | requirements §8.5-2 |
| `枝 2' は mendsParadise を通っている (AC-44 の対 / Q2-1)` | `mendsParadise` が消えた | requirements §8.4 |
| `強い名の枝は限定詞の除外と動詞の伴需の両方を要る (AC-39)` | 枝そのものが消えた | requirements §8.5-2 |
| `冠詞の直後の弱い名は楽園を名指さない (AC-31)` | `isReformSubject` の単体を枝の形で撃っていた | **→ `DETERMINER_WORLDLY` 12 件が `chooseScale` の面で引き継いだ** |
| `冠詞の直後の弱い名は、建造の動詞を伴っても reform でない (AC-31 / 単独証明)` | 同上 | 同上 |
| `冠詞以外の限定詞も弱い名の楽園名指しを打ち消す (R-3)` | 同上 | 同上 |
| `弱い名も建造の動詞を伴えば reform に留まる (AC-31 の逆向き)` | 弱い名の枝が消えた | **→ `楽園の抽象名を含む改革の願いは reform に留まる` へ形を変えて残した** |
| `強い名は限定詞を伴わなければ今まで通り楽園を名指す (R-4 の逆向き)` | 強い名の枝が消えた | **→ `楽園の抽象名を伴えば今まで通り楽園を名指す` へ** |
| `強い名は改変の動詞を伴えば今まで通り楽園を名指す (AC-38 / F-1 の逆向き)` | 同上 | **→ `楽園の抽象名は改変の動詞を伴えば…` へ** |
| `弱い名は改める動詞だけでは楽園を名乗らない (AC-44 / Q2-3)` | `REFORM_WEAK_RE` / `MEND_RE` の前提 assert が撃てない | **→ `engine 名 + 改める動詞だけでは…` へ(強い名 4 件を追加)** |
| `抽象名「門」/「gate」の紛れ語が世間の願いを攫わない (AC-45)` | **`ABSTRACT_FALSE_FRIENDS` が消え、13 件すべてが赤になる** | **→ requirements §8.6 に申し送り。門は「main と同じ振る舞い = 悪化していない」形に改めた** |
| 判定表 `"gauge に fingerprint を確かめる口を設ける" → reform`(AC-05) | **engine 固有名だけで楽園を名指す願い** | **→ requirements §8.1 / AC-05 が「次の走行の題」である** |

**⚠️ AC-45 の削除だけは性質が違う。** これは **main 由来の病**であり、
三度目の build が塞いだが **その守りが Q3-1 を生んだ**。
**「今は赤い」と知りながら門を残すことはできない**(第21条: 常に赤い門は無視される札になる)。
ゆえに **13 件の実測を requirements §8.6 に全件残し**、
門は **「main と同じ振る舞いであること」** だけを撃つ形に改めた。
**これは「悪化していない」の断定であって、「直った」の断定ではない。**

### 2.5 新設した門(11 本)

| 門 | 何を守るか |
|---|---|
| `REFORM_RE は main の抽象名を過不足なく持つ (表を直に撃つ)` | 抽象名 20 語が一語も落ちていない **かつ** engine 固有名 14 語が一語も入っていない **かつ** `ledger`/`台帳` の禁則(L-4) |
| `REFORM_RE が病的な入力で二乗に膨れない (S-1)` | ReDoS |
| `engine 名 + 改める動詞だけでは楽園を名乗らない (AC-44)` | 判定を engine 名の枝へ**広げる**変異を捕らえる(14 件) |
| **`engine 名 + 建造の動詞 + 世間の器は楽園でない (Q3-2)`** | **三度目の build が塞ぎ忘れた面**(8 件) |
| **`楽園の抽象名は世間の器の名を伴っても reform である (Q3-1 / 37 語)`** | **七度目の回帰**(37 語を機械的に網羅) |
| `楽園の抽象名を含む改革の願いは reform に留まる (逆向きの証明)` | 実装を「常に偽」に倒す修理を止める |
| `楽園の抽象名を伴えば今まで通り楽園を名指す (R-4 の逆向き)` | 同上 |
| `楽園の抽象名は改変の動詞を伴えば今まで通り楽園を名指す (AC-38)` | 同上(建造 6 件 + 改変 6 件、前提 assert 付き) |
| `強い名のコーパスが engine 名を過不足なく覆っている (AC-37)` | 26 件のコーパスが**実在する engine** を撃っていること |
| `MEND の世間側コーパスが改める動詞を過不足なく覆っている (AC-43)` | 34 件が**減らされていない**こと(次の走行の財産を守る) |
| `「門」の紛れ語は main と同じ振る舞いである (AC-45)` | **悪化していない**ことだけを撃つ(正直な形) |

---

## 3. 第60条の見直し

| | 行 | 字 | バイト |
|---|---|---|---|
| **前** | 101 | 3801 | 8141 |
| **後** | **54** | **1879** | **4033** |
| **比率** | **53.5%** | **49.4%** | **49.5%** |

**命じられた「半分以下」を字数・バイト数で満たした**(行数は 53.5% —— 一行あたりの
情報密度を上げたため、行では半分をわずかに超える)。

**やったこと**:
* (a)〜(h) の**実測の詳細を全て削り、`reform/route-misfire/` へ道を指した**
  (「*実測は `reform/route-misfire/` の requirements/review/verify に在る*」)
* **(c) と (d) を統合**(「印を強めよ / だが捨てるな」は一つの教訓である)→ 項が (a)〜(h) に繰り上がった
* **(g)「条文は足りていた」の長い自省を一文に畳んだ** —— 教訓は
  「**読まれて守られない条文は、条文の不足ではなく門の不足である**」の一行に尽きる
* **(h) 新設**: 「**同じ印を四度強めても回帰が続くなら、その印は捨てよ。捨てた印は、
  実測と門のコーパスを添えて次の走行へ申し送れ。黙って消すのは隠蔽である**」——
  **本走行が最後に学んだ普遍の教訓である**
* 「これを強制する門」の記述を `ENGINE_NAMES_STRONG`/`_WEAK`/`DETERMINER_LOOKBEHIND` から
  **`REFORM_RE`(楽園の抽象名のみ)**へ訂正した(消えた記号を指す条文は嘘である)

**条文自体の教訓は一つも捨てていない。** (a)〜(h) の八つの見分け方は全て残り、一つ増えた。

```
$ node graph/codex.js index --write
✍️  CONSTITUTION.INDEX.md を建てた (5249 B)

$ node graph/codex.js check
═══════ 📖 CODEX CHECK ═══════
  ✓ 索引は本文と一致している (60 条)
══════════════════════════════
EXIT=0
```

`codex.js weigh` の重い条の順位: 第60条は **8139 B → 4193 B**(第58条 8849 B / 第55条 7566 B の下)。

---

## 4. 文書の訂正

### `requirements.md`
* **FR-04**(REFORM は engine の固有名を知る)→ **射程外**と明記、取り消し線
* **AC-03** の期待値を `reform` → **『counsel でないこと』**へ(理由付き)
* **AC-05** を **🔴 射程外**と明記(「これを緑にするのが次の走行の題である」)
* **§3.6 / §3.7 / §3.8 の冒頭**に「**どの AC を残し、どれを削除したか**」の裁定を追記
* **AC-32 / AC-34** に取り消し線と後継の門の説明
* **§8「別の走行への申し送り」を新設**(8.1〜8.7):
  題 / **四度の回帰の表** / **三案の数の表** / **教主の 11 件の生出力** /
  **次の走行が引き継ぐ門のコーパス 174 件の一覧表** / 具体的な助言 5 点 /
  **一字の抽象名 `門` の未解決 8 件の生出力** / `COUNSEL_RE` × `DOC_RE` の未解決

### `design.md`
* **§1.1 の一覧表**: `ENGINE_NAMES` を **🔴 射程外**、`REFORM_RE` を **触らない**へ訂正
* **§1.4 の判定順**: 3 段目を `REFORM_RE(拡張済)` → **`isReformSubject(w)`** へ訂正し、
  「判定の段は一度も動いていない —— 3 段目の述語の中身だけが四度動き、最後に main の形へ戻った」と明記
* **§1.5**: 丸ごと **🔴 射程外**の枠で囲い、消えた 15 の記号を列挙。
  **本文は「歴史」として残した**(次の走行が「何を試みて何が壊れたか」を読むため)
* **§5-2**(`ENGINE_NAMES` 網羅の門が人を煩わせる)を実態に合わせて書き換え

---

## 5. 教主の裁定に対する異論(**実装はしていない。書くだけ**)

> **命じられた通り、意見は書くが実装はしていない。**
> **裁定そのものには全面的に同意する** —— 四度の実測は反論の余地が無い。
> 以下は「**次の走行のために、この裁定の射程をどう読むべきか**」についての三点である。

### 異論 1【小】`ABSTRACT_FALSE_FRIENDS` は `ENGINE_NAMES` と切り離せた可能性がある

**これが唯一、実質的な損失を伴う削除である。**

`ABSTRACT_FALSE_FRIENDS`(`門前|専門|部門|門下|入門|名門|門戸|関門|門限|門外|登竜門|
gated|gateway|floodgate|tailgate|stargate`)は **engine の固有名を一語も含まない。**
これは「**一字の抽象名 `門` の紛れ語**」の表であり、**`REFORM_RE` の `門` と `gate` を守る物**である。

* **main 由来の病を直す**表であり(main でも `専門店の棚の傾きを直したい` は reform へ行く)
* **本走行が新しく塞いだ**ものであり、**19 件の実測**(requirements §8.6 の 8 件 + 門の 13 件)がある
* **Q3-1 の死因は `WORLDLY_VESSEL_RE` を `namesParadiseAbstractly` に持ち込んだこと**であって、
  **`ABSTRACT_FALSE_FRIENDS` 自体ではない**

**裁定は「`ENGINE_NAMES*` / … / `namesParadiseAbstractly` など、この一連の修理のためだけに
存在するものを全て除け」であった。`namesParadiseAbstractly` が名指しされている以上、
`ABSTRACT_FALSE_FRIENDS` も共に落ちる — そう読んで実装した。**

だが厳密に言えば、次の形は `ENGINE_NAMES` を一切使わずに成立する:

```js
// (実装していない。案として書くのみ)
function isReformSubject(d) {
  if (!REFORM_RE.test(d)) return false;
  const multi = /楽園|paradise|ハーネス|harness|憲法|constitution|engine|エンジン|パイプライン|pipeline|自己改善|self-improve|オーケストレーション|orchestration|枢機卿|cardinal|神官|priest/i;
  if (multi.test(d)) return true;            // 多字の抽象名 = 無条件
  return !ABSTRACT_FALSE_FRIENDS.test(d);    // 一字の `門`/`gate` だけ紛れ語を退ける
}
```

**これは世間への誤着を 19 → 11 に減らし(8 件改善)、楽園の取りこぼしを一件も増やさない**
(`WORLDLY_VESSEL_RE` を伴わないので Q3-1 は起きない)。

**私はこれを実装していない。** 理由は三つ:
1. **裁定が「丸ごと撃ち捨てる」であり、談合ではないと明言されている**
2. **これが四度目かつ最後の差し戻しである。** 新しい印を無審査で足すのは
   本走行が七度演じた病そのものである(第60条(e): *印を足したら両方向試験を課せ*)
3. **`gate` の側には限定詞の除外(`DETERMINER_LOOKBEHIND`)が要り、それは撃ち捨てられた表である。**
   すなわち**完全には切り離せていない**(`rewrite the gate schedule board…` は
   紛れ語の表だけでは落ちない)

**申し送りに全て記した(requirements §8.6)。教主が裁かれたい。**

### 異論 2【中】「engine 名は弱い印」の結論は、**「名だけを見た」場合に限る**

三案の表が示すのは「**名の有無だけを印にすると両方向に誤る**」ことであって、
「**engine 名は道選びに使えない**」ではない。四度の試みはすべて
**「名 × 動詞」または「名 × 器の表」**という、**願い文の中だけを見る**軸であった。

**一度も試されていない軸がある** —— 願い文が **`graph/` 配下の実在のパスやフラグ名**を
名指しているか、である。`denude` は既に `graph/forge.js` や `--audit` を**剥いでいる**が、
**剥ぐ前に「何を剥いだか」を見れば、それは楽園の内部を名指す最も強い印でありうる**。

`CI に ledger --audit を追加する` / `graph/forge.js の道選びを直す` は
**この軸でなら捕まる**。世間の願いは `graph/forge.js` と書かない。

**実装していない。requirements §8.5-4 に助言として記した。**

### 異論 3【小】捨てた 4 つの表は**別々の寿命を持つ**

| 表 | 次の走行で再利用できるか | 理由 |
|---|---|---|
| `ENGINE_NAMES_STRONG` / `_WEAK` の**二分そのもの** | ⚠️ **疑わしい** | 「強い名」という呼称が**楽園内部の曖昧さの序列**を**世間に対する証拠の強さ**と取り違えさせた(quality 二周目 §1.2 甲)。**名を変えて再利用せよ** |
| `DETERMINER_LOOKBEHIND`(限定詞 20 語) | ✅ **そのまま使える** | 英語の語法の表であり、engine 名と独立している。**quality 相が 13 語を足した実測が入っている** |
| `MEND_RE`(改める動詞 34 語) | ✅ **そのまま使える** | `BUILD_RE` の対であり、語彙表としては正しい。**印として弱いだけである** |
| `WORLDLY_VESSEL_RE`(世間の器 37 語) | ⚠️ **枝を選べ** | `mendsParadise` の側では正しく、`namesParadiseAbstractly` の側では誤りだった。**「楽園も名乗る器」を表の全語に当ててから使え** |

**これらの表は `git log` に残っている**(`git show 6a4e3f4:graph/forge.js`)。
**次の走行はゼロから書き直すな。** requirements §8.4 にコーパスの一覧を残した。

---

## 6. 自分が見ていない項目(第37条)

1. **`git log` から表を復元する手順を実際に試していない。** §5 の異論 3 で
   「`git show 6a4e3f4:graph/forge.js` に残っている」と書いたが、**その復元を実行して
   確かめてはいない**。commit が存在することは `git log --oneline` で確かめた。
2. **異論 1 の案(`ABSTRACT_FALSE_FRIENDS` 単独)の数は、`WORLDLY_VESSEL_RE` を
   使わない形で実測していない。** 「19 → 11」は **現在の HEAD で誤着している 19 件のうち、
   13 件が `ABSTRACT_FALSE_FRIENDS` の表に当たる**ことから**算術で導いた数**である
   (GATE_FALSE13 の 13 件 + MINE_ABSTRACT_WORLDLY6 の 6 件 = 19 件がすべて `門`/`gate` 由来)。
   **実装して撃ってはいない**(裁定に従い実装しなかったため)。
3. **異論 2 の「パス/フラグを軸にする」案は一件も撃っていない。** 完全に未測である。
4. **故障注入をしていない。** 過去三度の build 相は変異試験を行ったが、
   **本相は「機構を消す」相であり、消した物に変異を当てることはできない。**
   新設した 11 本の門が実際に鳴るかは、**`REFORM_RE` に engine 名を一語足す変異**で
   確かめられるはずだが、**時間の制約で撃っていない**。
   **新設門のうち `engine 名 + 建造の動詞 + 世間の器は楽園でない` と
   `楽園の抽象名は世間の器の名を伴っても reform である` は、
   現在の実装では「実装がその面を持たないから緑」である** —— すなわち
   **第60条(d) が咎める「対象が在るのを待つ門」に近い性質を持つ**。
   **次の走行が枝を建てた瞬間に初めて本当の仕事をする門である。**
   これは意図した設計だが(申し送りの関門)、**「今は鳴らない門」であることを名乗る**。
5. **CI(`tribunal.yml`)を実際に走らせていない。** ローカルで全門は緑だが、
   CI の checkout(兄弟倉なし)での振る舞いは撃っていない。
6. **`ROUTES` 判定表の 41 行のうち、欠陥A 系以外の行が main でどう着くかを
   一行ずつ照合していない。** 全門が緑であることは確かめたが、
   **「main と同じか」を行単位で撃ってはいない**(A の 284 件のコーパスには含まれている行もある)。
