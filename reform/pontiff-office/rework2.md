# rework2 — tribunal の reflect が出した BLOCK 2件 + HIGH 2件を engine で塞ぐ

**相**: rework2 (reform の道・quality/tribunal の差し戻しによる再々建造)
**対象**: `reform/pontiff-office` — 第52条(教主の手は最後の手段/三段の序列)の機構化
**入力**: `reform/pontiff-office/critique.md` (49,865B / reflect @self-critic の敵対的自己批評)
**触れた engine**: `spawn-trace.js` `critic.js` `lessons.js` `conclave.js` `gauge.js` `.github/workflows/tribunal.yml`
**触れた門**: `tests/paradise.test.js` (+7 試験)
**触れた散文**: `README.md` (試験数 328 → 335。census が食い違いを鳴らしたため・§7.2)

---

## 0. 本相の裁定 — 一表

| # | 重大度 | 何が壊れていたか | どう塞いだか | 回帰試験 |
|---|---|---|---|---|
| **C-1** | BLOCK | `bytes` の statSync が `catch {}` で、「artifact 不在」と「0 バイト」が同じ `bytes=0` | `bytesState` 三値 + `unmeasured[]` へ積む | 2本(艶実経路) |
| **C-1'** | BLOCK 同型 | `dirBytes` が二重 `catch {}`・サブディレクトリを 0 と数える | `{ok,bytes}` 分離 + 再帰 + 深さ上限 | 同上 |
| **C-2** | BLOCK | `critic --lessons` が壊れ/不在/空を全て緑。CI は実際に 0 件で撃っていた | `lessonSource` 三値 + `INCONCLUSIVE` + 件数印字 | 3本 |
| **C-2'** | BLOCK 同根 | `lessons.js export` が空 KG で版管理下の 72 件を消していた | 0件×非空 なら書かずに exit 1 (`--allow-empty` で意思表示) | 同上 |
| **C-2''** | BLOCK | CI の断罪段 3箇所が `|| true` で自らを無効化 | 全て撤去。理由をコメントに明記 | 1本 |
| **C-3** | HIGH | `epoch` を消すだけで第52条の門を全回避できた | `TIER_EPOCH_AT` + `epochStatus()` 三値 → `no-epoch-after-era`(赤) | 1本 |
| **C-5** | HIGH | 沈黙の門は在るが `status --json` が `dispatchedAt` を捨てていた | `phaseSilence()` 一箇所 + `--json` へ配線 + `SILENT_MS` を実測から導出 | 1本 |

**終わりの検め**: `node tests/paradise.test.js` → **335 passed / 0 failed**(rework 時点は 328)。
全14門 × 2環境で赤ゼロ。詳細は §7。

---

## 1. C-1 [BLOCK] — `bytes` 経路の fail-open

### 1.1 何が壊れていたか(reflect の実測を独立再現)

`graph/spawn-trace.js:321-325` (旧):
```js
try {
  const st = fs.statSync(abs);
  bytes = st.isDirectory() ? dirBytes(abs) : st.size;
} catch {}          // ← 失敗が bytes=0 に潰れ、unmeasured に何も積まれない
```

`measurable` は `unmeasured.length === 0` であり、**`unmeasured` に積むのは `gitOut` の失敗だけ**だった。
`bytes` の失敗は一行も積まれない。しかもコメントは「**三つの** git 問い合わせが全て撃てた」と書いており、
**撃つべき問いは四つ**である。第33条(散文が機構を騙る)が engine の内部コメントで起きていた。

**B-1 で BLOCK と断じた構造と一字一句同じ**である:

| | B-1 (塞いだ) | C-1 (残っていた) |
|---|---|---|
| 失敗の潰し方 | `catch { return null }` | `catch {}` |
| 結果 | `files=0 churn=0` | `bytes=0` |
| `measurable` | `false` を積むよう修正済み | **`true` のまま** |
| `judge()` | 赤 | **緑** |

### 1.2 どう直したか

**三つの状態を分けた**(第16条: 同じ値で二つのことを表現しない)。教主の指示に従い、
**「成果物が指定されていない」と「指定されているのに読めない」を区別する**:

```js
let bytesState = 'none';         // そもそも成果物を持たない相 → 測定不能ではない
// 'file' / 'dir'                 → 測れた。bytes は実測値
// 'unmeasured'                   → 指定されているのに読めない → unmeasured[] へ積み measurable:false
```

`measure()` の戻りに `bytesState` と `artifact` を足した。`judge()` は既に `measurable===false` を
読んで `inconclusive`(赤)を出すので、**judge 側は一行も変えていない** —— 経路が既に正しく、
`bytes` だけが安全弁の外にあった。

さらに **`dirBytes()` を同じ作法へ直した**(reflect が #2 として名指しした同型):
- 二重 `catch {}` → `{ok:true,bytes}` / `{ok:false,reason}` の分離
- **サブディレクトリを 0 として数えていた** → 再帰して数える(深さ上限 8・シンボリックリンクは辿らない)
- 深さ上限に達したら「数え切れなかった」であり 0 ではない

### 1.3 実測 — reflect の再現が今どうなるか

**清潔な git 作業場を掘って撃った**(`reflect` が使ったのと同じ形):

```
A) artifact 不在   bytes=0 bytesState=unmeasured measurable=false
   unmeasured=["成果物の大きさを測れない: …\never-written.md — 成果物が存在しない (ENOENT)"]
   judge => ok=false verdict=red state=inconclusive
B) artifact 欄が空  bytes=0 bytesState=none measurable=true => judge ok=true
C) 実在する 0 バイト bytes=0 bytesState=file measurable=true => judge ok=true
```

**A と C が別の答えを返す。** reflect の実測では両方 `bytes=0 measurable=true => green` だった。
B(成果物を持たない相)は**緑のまま**である —— 統治行為のような相まで赤にすれば門は使い物にならない。

### 1.4 回帰試験 — 注入したら赤・修復後に緑

`tests/paradise.test.js`:
- `C-1 [BLOCK]: 成果物を測れなかったら緑を出さない — artifact 不在の実経路で撃つ`
- `C-1 [BLOCK]: dirBytes は読めない中身とサブディレクトリを 0 に潰さない`

**注入1**(`catch {}` を戻す)の生出力:
```
##### INJECT 1: C-1 bytes fail-open (catch {} を戻す) #####
injected
  ✗ C-1 [BLOCK]: 成果物を測れなかったら緑を出さない — artifact 不在の実経路で撃つ
      artifact 不在で measurable:true — bytes 経路に B-1 と同じ fail-open が残っている
      ({"files":1,"churn":1,"bytes":0,"bytesState":"file",
        "artifact":"…\\c1-bytes-3rPbs4\\never-written.md",
        "measurable":true,"unmeasured":[],"fileList":["seed.txt"]})
      true !== false
```

**注入2**(`dirBytes` がサブディレクトリを 0 と数える)の生出力:
```
##### INJECT 2: C-1 dirBytes サブディレクトリを 0 に数える #####
injected
  ✗ C-1 [BLOCK]: dirBytes は読めない中身とサブディレクトリを 0 に潰さない
      サブディレクトリの中身を 0 として数えている (bytes=0) — 数え落としは fail-open の向きである
```

**修復後**:
```
  ✓ C-1 [BLOCK]: 成果物を測れなかったら緑を出さない — artifact 不在の実経路で撃つ
  ✓ C-1 [BLOCK]: dirBytes は読めない中身とサブディレクトリを 0 に潰さない
```

**両方の試験に「修復後は緑」の側も入れてある** —— 実在する小さな成果物は通り(清潔な作業場で
`markDone` まで通す)、閾値内のディレクトリも通る。**門を強めるのであって壊すのではない。**

---

## 2. C-2 [BLOCK] — 断罪の門が `|| true` で自らを無効化していた

### 2.1 三つの層に分かれた病

reflect が名指ししたのは CI の `|| true` だが、掘ると**三層**あった。
**engine を先に直し、次に CI を直した**(reflect が指示した順序である)。

#### 層1: `critic.js` が「渡した」という事実を捨てていた

`graph/critic.js:423` (旧): `if (opts.lessons) { try { lessons = JSON.parse(...) } catch {} }`

reflect の実測:
```
正常 (graph/lessons.json) => 撃たれた lesson  73 件 / 緑=true / exit=0
壊れた JSON              => 撃たれた lesson   0 件 / 緑=true / exit=0
存在しないパス            => 撃たれた lesson   0 件 / 緑=true / exit=0
空配列 []                => 撃たれた lesson   0 件 / 緑=true / exit=0
```

直し: `lessonSource` を三値で持つ(`asked` / `ok` / `count` / `reason`)。
`--lessons` を渡されて **読めなかった or 0件** なら `lessonVerdict.kind='inconclusive'` を立て、
`clean=false` / `inconclusive=true` にして **exit 1**。`atlas` と `spawn-trace` が既に持つ
**第4の状態**を、三つ目の engine へ移した(reflect の助言そのもの)。

**そして N 件を必ず印字する。0 と 72 が同じ画面に見えてはならない。**

実測(修復後):
```
$ node graph/critic.js review graph --self --lessons <壊れた JSON>
lessons: 🔴 読めなかった — 教訓帳を読めない: Expected property name or '}' in JSON at position 2
VERDICT: INCONCLUSIVE — 教訓帳を読めない: …
  教訓帳を渡されたが読めなかった — 0 件で裁いたのであって、教訓に反していないのではない
  教訓帳を用意して撃ち直せ: node graph/lessons.js export --out graph/lessons.json
壊れた帳 EXIT=1

$ node graph/critic.js review graph --self --lessons graph/lessons.json
lessons: 72 件で裁いた  ← graph/lessons.json
VERDICT: the critic found nothing (72 件の教訓で裁いた). Proceed to judgment.
正常な帳 EXIT=0
```

**`--lessons` を渡さない従来の呼び方は影響を受けない** —— `教訓の門は立てていない` と名乗る。
呼んでいない門で赤にするのは偽陽性である。

#### 層2: `lessons.js export` が証拠そのものを消していた ★ reflect が見落とした層

**これは本相が新たに実測した。** CI は `lessons.js export --out graph/lessons.json` を撃つが
**CI に KG は無い**(`derived.js:43-48` 自身の宣言)。旧実装は **0 件を書き、版管理下の 72 件を消していた**。
その 0 件の帳を critic へ渡す —— **証拠を消す道具が、証拠を読む門の直前に立っていた。**

reflect は「CI では 0 件になる」と正しく述べたが、**なぜ 0 件になるか**(export が上書きするから)は
名指ししていない。engine 側で層1だけ直しても、CI は毎回 export で帳を空にしてから critic を撃つので、
**CI は永久に `INCONCLUSIVE` で赤**になる。それでは門を無視させるだけである。

直し: 出力が 0 件で書き先が既に非空なら **書かずに exit 1**。意図して空にするなら `--allow-empty`。

実測:
```
$ PARADISE_KG=<空ディレクトリ> node graph/lessons.js export --out <72件の帳>
教訓 0 件を書き出そうとした — 書き先には既に 72 件が在る: …\l.json
  この機に KG が無い(PARADISE_KG が空/未設定)のが原因である。
  上書きすれば版管理下の教訓帳が消え、critic は教訓 0 件で「何も見つからなかった」と述べる。
  意図して空にするなら --allow-empty を渡せ。
EXIT=1
残った件数: 72          ← **拒んだのに副作用が残らない**(第22条)
```

#### 層3: CI の `|| true` — 三箇所それぞれを判断した

教主の指示「**それぞれ `|| true` が正当な理由を持つか判断せよ**」に答える:

| 行 | 段 | 判断 | 理由 |
|---|---|---|---|
| `:259` | `lessons.js export … \|\| true` | **正当でない。段ごと撤去** | 層2 の通り、この段は**教訓帳を破壊する**。CI で export する必要が無い —— `graph/lessons.json` は**追跡下のファイル**であり checkout で既に 72 件在る。代わりに `test -s graph/lessons.json` で**非空を検める**(第37条: 不在は通過ではない) |
| `:262` | `critic.js review … \|\| true` | **正当でない。撤去** | 教主自身が `:181` で「付けた瞬間 critic が何を言おうと CI は緑になる」と書いた戒めを、81行下で破っていた。critic は層1の修復で 0件/読めない帳を exit 1 にする。**赤が出る条件が明示された** |
| `:268` | `workspace.js check … \|\| true` | **正当でない。撤去** | 同じ `workspace.js check` が **verify job の「🏛️ Workspace」段でも撃たれており、そこで既に赤になる**。ここで緑に潰せば、**同じ門が二つの job で違う答えを出す**(第27条: 環と器が割れる) |

**無言の `|| true` は一つも残していない。** 現状 `.github/workflows/tribunal.yml` に
非コメント行の `|| true` は **0 件**である(門が数えている)。

#### 「0件を撃って緑」への答え(第37条)

教主が示した二択のうち **「CI で中身を用意して撃つ」** を採った:
- 版管理下の `graph/lessons.json`(72件)をそのまま使う
- 「空でないこと」を CI が自分で検め、空なら `::error::` を出して exit 1

`derived.js` の教訓 `art29-derived-not-truth` が禁じたのは「**中身**(件数・本文)を前提にした検査」である。
本相が足したのは「**存在すること**を前提にする」であり、追跡下のファイルについてこれは正当である。
`derived.js check` は緑のままである(実測: exit 0)。

### 2.2 回帰試験 — 注入したら赤・修復後に緑

- `C-2 [BLOCK]: critic は教訓 0 件/読めない帳で「何も見つからなかった」と述べない`
  — 4通り(壊れた JSON / 空配列 / 不在のパス / 配列でない)を**engine と CLI の両方**で撃つ
- `C-2 [BLOCK]: lessons export は空の KG で既存の教訓帳を消さない`
  — **CI の段を実際に失敗させて撃つ**。`PARADISE_KG` を空ディレクトリへ向ける実経路
- `C-2 [BLOCK]: CI の断罪段は `|| true` で自らを無効化していない`
  — YAML の**非コメント行**だけを見る(コメントは機構ではない・第33条)

生出力は §6 の注入表に在る。

---

## 3. C-3 [HIGH] — `epoch` を消すだけで門を全回避できた

### 3.1 何が壊れていたか

`hasEpoch()` は `run.epoch.tier` の有無しか見ず、**`run.created` を一度も読んでいなかった**。
reflect の合成 run(`created` を紀元導入後・全相 done・`tierTrace` 空・`epoch` 無し)に対し
`tierAudit.ok = true`(全相 `unobservable`)—— **「昨日 convene され、11相すべてを done にし、
序列を一度も宣言しなかった走行」を機構が合格として通した。**

`conclave.js:95` の教主自身のコメント「`epoch` の削除は diff に現れる」は**門ではない**。
誰も見ない diff は第44条の「死んだ道具」と同じである。

### 3.2 どう直したか — 紀元導入時刻を engine の中へ

```js
const TIER_EPOCH_AT = '2026-09-03T04:54:49.000Z';   // = 2026-09-03T13:54:49+09:00
```

**根拠(教主の指示「根拠を書け」への答え)**: 紀元を刻んだコミットのコミット時刻である。
```
$ git log --format='%H %cI %s' -1 8aad635
8aad635474a3a59b6660a56d109b7d612c267838 2026-09-03T13:54:49+09:00 第52条の機構: 序列の閾値・判定表・紀元の印・門 (設計 §14 段2-4)
```
**これ以降に convene された run は、必ず `epoch` を持って生まれる** —— `conclave.convene()` が
自分の手で刻むからである。持たないなら (a)印を消した (b)旧い engine で作った のどちらかで、
**どちらも「対象外」ではない。**

**engine の中に置いた理由(第41条)**: git のコミット時刻は engine の外にある。
history を書き換えれば動くし、shallow clone では読めない。数は一箇所に住まねばならない。
reflect は「C-3b: 紀元導入時刻を engine 内へ」を**後続PRの宿題**としたが、
`TIER_EPOCH` の隣に定数を置くのは十数行であり、**移行方針の再設計を伴わない**ので今やった。

`epochStatus()` が三値を返す:
- `present` … 印が在る → 門が立つ
- `legacy` … 印が無く `created` が紀元より前 → **機構が無かった時代**(🟡)
- `stripped` … 印が無いのに `created` が紀元以後 → **門を回避した走行**(🔴 `no-epoch-after-era`)

配線した箇所: `judge()` の段1 / `tierAudit()` / `audit` CLI / **`gauge.js` の4箇所**。
`gauge` が `trace.hasEpoch(run)` を読んでいたので、**印を消せば秤の式まで全部飛んだ** ——
恩赦は移行のためであって回避のためではない。

`created` が読めない run は `legacy` として扱う(遡って有罪にしない・第16条)。
**これは fail-open ではない**: 印も `created` も消した run は次段の `no-tier`
(done なのに tierTrace が無い)で赤になる。

### 3.3 実測

```
B) created=2026-09-03T11:10:00.057Z (紀元 2026-09-03T04:54:49.000Z より後) / epoch 無し / 全相 done / tierTrace 空
   epochStatus => stripped
   tierAudit   => ok=false epochStatus=stripped
   状態の内訳  => {"序列1":0,"序列2":0,"序列3":0,"unobservable":0}
   gauge score => 40
   理由: 紀元以後に convene されたのに序列の印が無い — 門を回避した走行である (第52条)

A) 真の legacy (created=2026-08-01) => epochStatus=legacy ok=true unobservable=6 score=100
```

**reflect の実測では B が `ok=true` / `unobservable:11` / score 100 だった。**

### 3.4 移行が既存走行を壊していないことの実証

```
$ node graph/spawn-trace.js audit
  🟡 reform/conclave-resume/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 reform/dashboard-living-gate/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 reform/pontiff-office/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 ../paradise-creations/coin/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 ../paradise-creations/habit/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 ../paradise-creations/reform-claude-md-diet/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 ../paradise-creations/reform-eval-gauge/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 ../paradise-creations/tenbin/conclave.json  legacy (印なし・17 相が unobservable)
  走査 8 件 / unobservable: 94 (legacy 8 走行)
  ✓ 紀元以後の違反は無い — 黄は増えていない
audit=0
```

実在する 8 走行(最新 `created` = 2026-09-03T02:30:46Z)はすべて紀元より前である。**一件も有罪にしていない。**

### 3.5 副次的に露見した欠陥 — 試験の fixture 自身が抜け穴の形をしていた

`tests/paradise.test.js:3819` の `legacyRun()` は **`epoch` を消すだけ**で `created` を今のままにしていた。
つまり **試験の fixture 自身が「紀元以後に convene されたのに印が無い走行」= reflect が名指しした
抜け穴そのもの**であり、C-3 を実装した瞬間にその試験が赤になった(実測: `327 passed / 1 failed`)。

**門を弱めて通さなかった。** fixture を「真の legacy」(`created` を紀元前へ)に直し、
抜け穴側は `strippedRun()` として**別の名前**で切り出して赤を撃つ試験へ回した。

---

## 4. C-5 [HIGH] — 沈黙の門は在った。配線されていなかっただけ

### 4.1 教主の観測1 への反証を受け入れる

reflect は正しい。**第51条が `conclave.js:48 STALE_MS=15分` と `:427` の警告を既に建てていた。**
新しい engine は建てていない。**配線のみである。**

三つの穴のうち engine で塞げるもの:
- (a) `status --json` が `dispatchedAt` も stale 判定も運んでいない ← **これを塞いだ**
- (b) 撃つ者が居ない(`pulse` に `stale` が0行、CI が conclave を撃たない) ← 後続PR(§5)
- (c) `status` の exit code が常に 0 ← **意図的に変えていない**(§4.4)

### 4.2 偽陽性を先に考えた(教主の指示) — 実測から閾値を導出

教主の指示「**STALE_MS=15分が妥当かを実測から検証せよ**」に答える。
**実在8走行の `dispatch` → `done` 所要時間 66 件を全て測った**(`history` から):

```
n = 66
p25 =   1.8 min   p50 =  9.9 min   p75 = 32.0 min
p90 =  54.5 min   p95 = 68.0 min   p100 = 103.1 min
15分以上: 27/66 = 40.9%     60分以上: 7件     90分以上: 1件     120分以上: 0件

最長の12件:
   45.8 dashboard-living-gate/docs    64.4 dashboard-living-gate/design
   46.9 dashboard-living-gate/docs    64.7 dashboard-living-gate/specify
   47.2 dashboard-living-gate/docs    68.0 habit/build
   54.5 pontiff-office/verify         74.8 conclave-resume/build
   62.7 pontiff-office/build          86.4 dashboard-living-gate/reflect
                                     103.1 dashboard-living-gate/build
```

**`STALE_MS = 15分` は沈黙の境として妥当でない。** そのまま鳴らせば
**正常に走っている相の 40.9% が鳴る** —— 騒音であり、騒音は門を無視させる(第21条の教訓)。
reflect は「census 12分・atlas 12分・subagent 1時間超」と警告したが、**実測はそれより悪い**。

ゆえに教主の二択のうち **「`running` と `dispatched-but-silent` を区別する」** を採った:

```js
const SILENT_MS = 120 * 60 * 1000;   // p100 (103.1分) を超える最小の切りの良い数
```

**実測した 66 件の正常な相は一件もこの境を越えない = 偽陽性ゼロ。**
越えたなら「これまでのどの相よりも長く黙っている」であり、名指しに値する。

**なぜ `STALE_MS` と分けたか(第36条: 別の問いには別の器)**:
- `STALE_MS`(15分)は **`resume` の回収判定** ——「この running は剥がして良いか」。`--force` の壁がある
- `SILENT_MS`(120分)は **神に見せるべきか** —— 偽陽性の代償は騒音である

**これは「閾値を緩めて門を通した」のではない。** 緩めたのではなく、
**元々存在しなかった門**(`--json` は `dispatchedAt` すら運んでいなかった)を実測分布の上に建てた。

### 4.3 どう直したか — 判定は一箇所

`phaseSilence(p, at)` を新設し、**`statusBoard`(人が読む)と `status --json`(機械が読む)が
同じ関数を読む**。教主自身が `:485` に「別の集計を書けば食い違う」と書いた通りである。

`status --json` に足した鍵(**既存の鍵は一つも消していない** — dashboard がこの形に依る):
- 相ごと: `dispatchedAt` `silence`(三値) `ageMs` `stale` `silent`
- 走行ごと: `staleMs` `silentMs` `at` `stalePhases[]` `silentPhases[]` `noDispatchPhases[]`

**数えるだけでなく名指しする** —— `stalePhases` が相 id を運ぶので、機械はそのまま `resume` を撃てる。

### 4.4 実測

```
1) 発令直後
  相の鍵: id,agent,status,gate,dispatchedAt,silence,ageMs,stale,silent
  dispatchedAt=2026-09-03T11:10:09.557Z silence=ok ageMs=29
  stalePhases=[] silentPhases=[] noDispatchPhases=[]
  staleMs=900000 silentMs=7200000
2) 30分前
  silence=stale ageMs=1800026
  stalePhases=["discover"] silentPhases=[]        ← **30分では沈黙と呼ばない**(実測の 40% がここ)
3) 180分前
  silence=silent ageMs=10800026
  stalePhases=["discover"] silentPhases=["discover"]
  人の画面: ▶ discover @market-researcher  🔴 (running 180分 — 実測のどの相より長い沈黙 [>120分]。神へ知らせよ)
```

reflect の実測では `dispatchedAt を運ぶか: false` / `鍵: domainsRatified,domainsTotal,phasesDone,phasesTotal,domains,historyLength` だった。

### 4.5 exit code を変えなかった理由(第16条: できなかったことを書く)

reflect の推奨「**鳴らすのではなく見せる。exit 1 で落とす門にするのは早い**」に従った。
`status --json` は依然 exit 0 である。**沈黙の継続時間を機構が一度も測っていない**以上、
「何分黙ったら落とすか」を決める根拠が無い(C-5b)。本PRが自ら禁じた作法である。
今できるのは「**機械が読める形で名指しする**」までであり、それを果たした。

---

## 5. C-4 / C-6 / C-7 / C-8 の仕分け — 理由付きで

教主の指示「**今のPRで直すものと後続PRの宿題に仕分けよ。仕分けの理由を書け**」に答える。

### 今のPRで直したもの(reflect が「後」に置いたが、今できたもの)

| # | 件 | なぜ今やったか |
|---|---|---|
| **C-1'** | `dirBytes` の二重 catch + サブディレクトリ 0 | reflect は「運用が無いため優先度低」としたが、**C-1 本体と同じ関数の中**であり、直しは同じ作法の適用で済む。**同じ走行で同型の fail-open を片方だけ直せば第16条違反**である(reflect が C-1 について述べたのと同じ論理) |
| **C-3b** | 紀元導入時刻を engine 内へ(`TIER_EPOCH_AT`) | reflect は「移行方針の再設計を伴う」として後回しにしたが、**実際には定数一つ+比較一行**であり、移行方針(遡及しない)は一切変えていない。実在8走行が全て `legacy` のままであることを実測で確認済み。**C-3a を engine 外の git 時刻に依存させる方が悪い**(第41条) |
| **C-2'** | `lessons.js export` が教訓帳を破壊する | **reflect が見落とした層**。層1(critic)だけ直すと CI が永久に赤になり、門を無視させる。**塞ぐなら根まで塞がねば意味が無い** |

### 後続PRの宿題(先送りの理由)

| # | 件 | 先送りの理由 |
|---|---|---|
| **C-4** | 台帳とディスクの突合門(環外の成果物29件・抽象名4件) | **`artifactPath` の複数化設計が先に要る。** 29件中18件が「一つの相が複数の文書を産んだ」形であり(`dashboard-living-gate` の `findings-*.md`)、これを「環の外の不正」と数える門は**正しい運用を罰する**。設計相の仕事である。**ただし `coin` の抽象名4件は別**:「`artifactPath` がパス形か」は `contract.js` が既に持つ判定であり、同じ問いに二つの engine が違う答えを出している状態は放置すべきでない —— **次PRの最優先**として明記する |
| **C-6** | `rework` 相の新設 | **道の設計変更である。** 本PRの範囲(環の中の序列を機械化する)を超える。**なお本相自身がこの欠陥の二つ目の実例である** —— rework2 も台帳に記録されない。`gauge` の `reworks` は依然 0 であり、**本走行の trajectory を額面通り読んではならない**(§8 の申し送り) |
| **C-7** | 三つの閾値の導出根拠を分けて書く | **要求相の領分**(`requirements.md §2.4` の記述)。ただし engine 側の doc comment は既に三つを分けて書いている(`spawn-trace.js:47-54`)ので、**engine と散文の食い違いは engine 側には無い** |
| **C-5b** | 沈黙の閾値を第51条から分ける(exit code 化) | **沈黙の長さを一度も実測していない。** 本相は「相の所要時間」66件を測ったが、それは「教主が黙っていた時間」ではない。測っていない量に閾値を置くのは本PRが禁じた作法である。**ただし `SILENT_MS` の分離は今やった** —— 測ったもの(相の所要時間)の上には建てられるからである |
| **M-1** | `requirements.md §2.5` の訂正 | 要求相の領分。engine は fail-safe 側(過大評価)に倒れており急がない |
| **M-2** | requirements/design への「範囲外」明記 | 要求相の領分。`CLAUDE.md` には既に一行在る |
| **申送4** | `deploy check` に「検めるものが無かった」を名乗らせる | 軽微。engine の判定は既に正しく、口が正直でないだけ |
| — | 「失敗を潰す箇所は呼び手に見せる経路を持て」の門 | 「測定を名乗る engine」の定義が先に要る。**単純な grep 門にしてはならない**(73件中70件は正当) |
| — | 「条 → 門」の対応を census が数える門 | `kind` の宣言設計が先に要る |

### C-8 — 神託の核心。今のPRの範囲で何ができたか

教主の問い:「**今回のPRの範囲で何かできるか、それとも設計をやり直す話か**」

**答え: 半分できた。半分は設計をやり直す話である。**

reflect の指摘は正しい:
| 神が困った回数(本走行) | 機構が測る量 |
|---|---|
| 教主が書きすぎて困った: **0 回** | files / churn / bytes → **測る** |
| 教主が止まって困った: **3 回** | 沈黙の長さ → **測らない** |

**できたこと(C-5 として実装済み)**: もう片端を測る道具の**配線**。
`status --json` が `dispatchedAt` と滞留を運ぶようになり、**機械が「止まっている」を名指しできる**。
reflect が「もう片端を測る道具は既に楽園に在る」と述べた通りで、無かったのは engine ではなく配線だった。

**できなかったこと(設計をやり直す話)**: 三つある。

1. **測っている量が違う。** `SILENT_MS` が測るのは「相が `running` のまま経った時間」であって
   「**神が教主の応答を待った時間**」ではない。教主が subagent の完了を待っている間も相は `running` である。
   神が困った3回は**教主と神の間**で起きたのであって、**環の中**では起きていない。
   環は神との対話を一度も観測していない —— **測る対象そのものが機構の外にある。**

2. **「3回」という数自体が自己申告である。** reflect も「本相はそれを反証も裏付けもしていない」と認めた。
   閾値の根拠にできる実測が**一件も無い**。第38条に照らせば、この量について改善を語る資格がまだ無い。

3. **第52条は的外れではない。** 願い文(`meta.wish`)は「**自ら制作作業をしない**」と明記しており、
   教主の手仕事を測ることは**願いの直接の要求**である。神の三度の叱責は願いが発せられた後に起きた。
   ゆえに正しい言い方は「第52条は間違った量を測った」ではなく「**測るべき量の片側しか測っていない**」。

**本相の結論**: C-8 は「第52条を作り直す」話ではなく「**第53条(あるいは第51条の拡張)を新しく設計する**」話である。
必要なのは:
- 神との対話の刻を環が記録する経路(現状ゼロ)
- その上での沈黙の実測
- 実測の上での閾値

これは**新しい設計相**を要する。本PRの範囲で為すべきでない。
**ただし C-5 の配線がその第一歩である** —— 測る器が無ければ実測もできない。

---

## 6. 注入表 — 「注入したら赤・修復後に緑」の生出力

**すべて engine を実際に壊し、試験を走らせ、復旧した。作業場は毎回元へ戻している。**

| # | 注入した欠陥 | 撃った試験 | 注入時 |
|---|---|---|---|
| 1 | `bytes` の `catch {}` を戻す | C-1 artifact 不在 | 🔴 |
| 2 | `dirBytes` がサブディレクトリを 0 と数える | C-1 dirBytes | 🔴 |
| 3 | `critic` の `catch {}` を戻す | C-2 critic | 🔴 |
| 4 | `lessons export` が空で上書き | C-2 lessons export | 🔴 |
| 5 | CI の `\|\| true` を戻す | C-2 CI の断罪段 | 🔴 |
| 6 | `epochStatus` を `hasEpoch` の二値へ戻す | C-3 | 🔴 |
| 7 | `status --json` から `dispatchedAt`/滞留を落とす | C-5 | 🔴 |

### 注入1 (C-1 bytes)
```
##### INJECT 1: C-1 bytes fail-open (catch {} を戻す) #####
injected
  ✗ C-1 [BLOCK]: 成果物を測れなかったら緑を出さない — artifact 不在の実経路で撃つ
      artifact 不在で measurable:true — bytes 経路に B-1 と同じ fail-open が残っている
      ({"files":1,"churn":1,"bytes":0,"bytesState":"file","artifact":"…\\never-written.md",
        "measurable":true,"unmeasured":[],"fileList":["seed.txt"]})
      true !== false
```

### 注入2 (C-1 dirBytes)
```
##### INJECT 2: C-1 dirBytes サブディレクトリを 0 に数える #####
injected
  ✗ C-1 [BLOCK]: dirBytes は読めない中身とサブディレクトリを 0 に潰さない
      サブディレクトリの中身を 0 として数えている (bytes=0) — 数え落としは fail-open の向きである
```

### 注入3 (C-2 critic の catch {})
```
##### INJECT 3: C-2 critic の catch {} を戻す
  [注入済み] ->
  ✗ C-2 [BLOCK]: critic は教訓 0 件/読めない帳で「何も見つからなかった」と述べない
      壊れた JSON を clean で通した — 断罪の門が教訓 0 件で緑を出す
      true !== false
Paradise self-test: 334 passed, 1 failed
  [復旧]
```

### 注入4 (C-2 lessons export)
```
##### INJECT 4: C-2 lessons export が空で上書き
  [注入済み] ->
  ✗ C-2 [BLOCK]: lessons export は空の KG で既存の教訓帳を消さない
      空の KG で exit 0 — CI が 0 件の上書きを緑で通す
      0 !== 1
Paradise self-test: 334 passed, 1 failed
  [復旧]
```

### 注入5 (C-2 CI の `|| true`)
```
##### INJECT 5: C-2 CI の || true を戻す
  [注入済み] ->
  ✗ C-2 [BLOCK]: CI の断罪段は `|| true` で自らを無効化していない
      CI の段が `|| true` で自らを無効化している:
  :283  node graph/lessons.js export --out graph/lessons.json || true
  :284  node graph/critic.js review graph --self --lessons graph/lessons.json >> verdict.md 2>&1 || true
      + actual - expected
Paradise self-test: 334 passed, 1 failed
  [復旧]
```
**門は行番号ごと名指しする** —— 鳴るだけで直せない門は罠である。

### 注入6 (C-3 epochStatus を二値へ)
```
##### INJECT 6: C-3 epochStatus を hasEpoch の二値へ戻す
  [注入済み] ->
  ✗ C-3 [HIGH]: epoch を消すだけでは第52条の門を回避できない
      印を消した走行を legacy と読んでいる — 恩赦は移行のためであって回避のためではない
      + actual - expected
      + 'legacy'
Paradise self-test: 334 passed, 1 failed
  [復旧]
```

### 注入7 (C-5 `status --json` から滞留を落とす)
```
##### INJECT 7: C-5 status --json から dispatchedAt/滞留を落とす
  [注入済み] ->
  ✗ C-5 [HIGH]: status --json が dispatchedAt と滞留を運ぶ — 機械が沈黙を名指しできる
      --json が staleMs を運んでいない — 機械が読めない警告は機械が鳴らせない
Paradise self-test: 334 passed, 1 failed
  [復旧]
```

### 作業場の復旧確認(第22条: 注入は必ず戻す)
```
RESTORED. git diff --stat:
 .github/workflows/tribunal.yml |  31 ++++++-
 graph/conclave.js              |  97 +++++++++++++++++++---
 graph/critic.js                |  81 +++++++++++++++++-
 graph/gauge.js                 |  17 +++-
 graph/lessons.js               |  52 ++++++++++--
 graph/spawn-trace.js           | 183 +++++++++++++++++++++++++++++++++++++----
 6 files changed, 419 insertions(+), 42 deletions(-)
```
**注入の痕跡は一つも残っていない** —— 上の差分は本相が意図して入れた修復のみである
(各 engine の全構文検査 `node --check` も通っている)。

### 復旧後(全門)
```
rework2 (reflect の差し戻しを塞ぐ):
  ✓ C-1 [BLOCK]: 成果物を測れなかったら緑を出さない — artifact 不在の実経路で撃つ
  ✓ C-1 [BLOCK]: dirBytes は読めない中身とサブディレクトリを 0 に潰さない
  ✓ C-2 [BLOCK]: critic は教訓 0 件/読めない帳で「何も見つからなかった」と述べない
  ✓ C-2 [BLOCK]: lessons export は空の KG で既存の教訓帳を消さない
  ✓ C-2 [BLOCK]: CI の断罪段は `|| true` で自らを無効化していない
  ✓ C-3 [HIGH]: epoch を消すだけでは第52条の門を回避できない
  ✓ C-5 [HIGH]: status --json が dispatchedAt と滞留を運ぶ — 機械が沈黙を名指しできる

Paradise self-test: 335 passed, 0 failed
```

---

## 7. 終わりの検め — 全門の生出力

### 7.1 教主が命じた終わりの検め — 生出力

```
=== 1) node tests/paradise.test.js ===
Paradise self-test: 335 passed, 0 failed
EXIT=0

=== 2) 素の環境 (PARADISE_UPSTREAM=/nonexistent CLAUDE_HOME=/nonexistent) ===
Paradise self-test: 335 passed, 0 failed
EXIT=0

=== 3) 個別の門 ===
check-agents        EXIT=0
wiring check        EXIT=0
domains check       EXIT=0
census check        EXIT=0      ← §7.2 参照
codex check         EXIT=0
deploy check        EXIT=0
apply-models verify EXIT=0
apply-spawn verify  EXIT=0
derived check       EXIT=0
workspace check     EXIT=0
critic review       EXIT=0
spawn-trace audit   EXIT=0
```

**328 → 335**(+7 試験)。0 failed、2環境。

### 7.2 census が一度赤を出した — 第16条に従い記録する

門を全部撃った最初の走行で `census check` が **exit 1** を返した:
```
═══════ 🔢 CENSUS CHECK ═══════
  🔴 README テスト数: doc says 328, reality is 335  (README.md)
═══════════════════════════════
```

**これは第22条の門が正しく鳴った例である。** 試験を7本足したので README の
`# 328/328 pass` が事実と食い違った。**門を弱めず、散文を事実へ合わせた**
(`README.md:138` → `# 335/335 pass`)。再走行で exit 0。

```
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
census EXIT=0
```

### 7.3 spawn-trace audit — 実在の走行を見た結果

```
  🟡 reform/conclave-resume/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 reform/dashboard-living-gate/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 reform/pontiff-office/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 ../paradise-creations/coin/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 ../paradise-creations/habit/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 ../paradise-creations/reform-claude-md-diet/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 ../paradise-creations/reform-eval-gauge/conclave.json  legacy (印なし・17 相が unobservable)
  🟡 ../paradise-creations/tenbin/conclave.json  legacy (印なし・17 相が unobservable)
  走査 8 件 / unobservable: 94 (legacy 8 走行)
  ✓ 紀元以後の違反は無い — 黄は増えていない
```

**C-3 を入れても黄は増えていない。** 8走行すべてが真の `legacy` である
(最新の `created` = `2026-09-03T02:30:46Z` < 紀元 `04:54:49Z`)。

### 7.4 教訓を KG へ刻んだ(CLAUDE.md の判断則2)

```
OK {"id":"fix-all-siblings-of-the-same-flaw", ...}     同じ関数の中で同じ病を片側だけ直すな
OK {"id":"gate-neutralized-by-or-true", ...}           || true を付けた門は門ではない
OK {"id":"epoch-marker-needs-a-timestamp", ...}        印の有無だけを見る門は印を消せば消える
```
以後 `critic` がこの三つを永久に検め続ける。

---

## 8. verdict への申し送り(第16条)

reflect が verdict へ送った三つの禁則に、本相が二つ足す。

### reflect の禁則(依然有効。ただし一つは状況が変わった)

1. **「第52条の門が本PRを裁いた」と書くな。** 依然有効である。本走行 `reform/pontiff-office` は
   `created=2026-09-03T02:30:46Z` で紀元(`04:54:49Z`)より前であり、`epochStatus='legacy'`、
   11相すべて `unobservable` である。**門は本走行に対して一度も立っていない。**
   書けるのは「門が**他の走行に対して**正しく鳴ることを、故障注入と合成 run で実証した」までである。

2. **「差し戻しゼロの走行だった」と書くな。** 依然有効であり、**さらに悪化した**。
   本走行は BLOCK 1件を含む 9 件(rework)+ BLOCK 2件 HIGH 2件(rework2)を差し戻したが、
   `gauge` の `reworks` は全枢機卿 0 のままである。**記録する場所が無い**(C-6)。

3. **「critic が敵対的自己批評を通した」を証拠に使うな。** ← **状況が変わった。**
   本相が C-2 を塞いだので、critic は**何件の教訓で裁いたかを必ず名乗る**。
   `VERDICT: the critic found nothing (72 件の教訓で裁いた)` と印字される。
   **KG の無い機で撃てば `INCONCLUSIVE` で exit 1 になる。** ゆえにこの禁則は
   「**critic の出力から件数を読み、0 でないことを確かめた上でなら使ってよい**」へ緩められる。

### 本相が足す禁則

4. **「fail-open を全て塞いだ」と書くな。** 本相が塞いだのは reflect が名指しした 3 件
   (`spawn-trace:325` `spawn-trace:340` `critic:423`)である。reflect の走査は
   **73 箇所**を数え、うち 70 件を「正当」と仕分けた。**その仕分けは reflect の判断であって
   機械の判定ではない。** 「失敗を潰す箇所は呼び手に見せる経路を持て」を門にする仕事は未着手である。

5. **「沈黙を測る門を建てた」と書くな。** 建てたのは**配線**である。
   `status --json` が滞留を運ぶようになったが、**それを撃つ者はまだ居ない**
   (`pulse.js` に `stale`/`silent` は 0 行、CI も `conclave` を撃たない)。
   **鳴らない番人は、番人が居ないことより見つかりにくい。** 書けるのは
   「機械が読める形にした」までであり、「神の画面に出るようになった」ではない。

---

## 9. 本相自身の限界(第16条)

- **CI 上での実走は確認していない。** `|| true` の撤去が GitHub Actions で正しく赤/緑を出すことは、
  ローカルの再現と YAML の静的検査までである。特に `test -s graph/lessons.json` は
  checkout 直後の追跡下ファイルを前提にしており、**その前提が CI で成り立つことは実走で確かめていない。**
  ただし `git ls-files graph/lessons.json` が追跡下であることは実測した。

- **`SILENT_MS = 120分` の根拠は「相の所要時間」であって「沈黙の長さ」ではない。**
  §4.2 の 66 件は正常に完了した相の所要時間である。**教主が本当に黙っていた時間は
  依然として誰も測っていない。** ゆえにこの閾値は「正常な相を誤検知しない」ことは保証するが、
  「本当の沈黙を捉える」ことは保証しない。C-5b が残る理由である。

- **`TIER_EPOCH_AT` は一度手で写した数である。** git のコミット時刻から engine の中へ移したが、
  **その転記が正しいことを機械は検めていない**(コミットが rebase されれば時刻は変わる)。
  ただし紀元は既に過去の事実であり、今後動かない性質のものである。

- **C-4 の抽象名4件は測れたのに直さなかった。** reflect が「今すぐ測れる」と述べた通りであり、
  本相もそれを認める。直さなかった理由は「同じ問いに二つの engine(`contract` と `conclave`)が
  違う答えを出している」ことの解消が**どちらを正とするかの設計判断**を要するからである。
  `contract` を正とすれば `coin` の既存台帳4件が遡って赤になる —— 移行方針の議論が要る。
  **次PRの最優先として §5 に明記した。**

- **`gauge` の4箇所を書き換えたが、秤の点の連続性は legacy についてのみ確かめた。**
  `reform/conclave-resume` の score=100 が動かないことは試験が撃っている。
  だが `stripped` な走行の点(実測 40)が「正しい罰の重さ」かは誰も検証していない ——
  重み(`WEIGHTS.tierBreach`)は既存の数をそのまま使った。
