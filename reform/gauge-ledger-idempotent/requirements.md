# SPECIFY — gauge 台帳の冪等化 (gauge-ledger-idempotent)

- 相: **SPECIFY(要件定義のみ)**。本相では `graph/*.js` を一行も変更していない(実装は DESIGN/BUILD の領分)。
- 先行文書: `reform/gauge-ledger-idempotent/discovery.md`(394行・全文既読)
- 実測環境: `node -v` → **v24.14.0** / 枝 `main`(読み取りのみ) / `node graph/workspace.js root` → `C:\Users\kikus\Documents\workspace\paradise-creations`
- 本書の全要件は **discovery.md の実測事実** または **本相で私が再実測した出力** のみに根拠を持つ。
  推測は「推測」と明記し、要件の根拠には使わない。

---

## 0. 背景と問題の一行定義

> **問題(一行)**: `graph/gauge.js:209` の `fs.appendFileSync` が唯一の書き込み経路でありながら冪等鍵を一切持たないため、
> **同じ観測を二度記録すると台帳に二行積まれ、推移・比較・画面が「変化なし」を捏造する。**

### 0.1 本相で私自身が再実測した事実(discovery の追認)

| # | 走らせたコマンド | 実出力 | discovery との一致 |
|---|---|---|---|
| V-1 | `node -v` / `git rev-parse --abbrev-ref HEAD` | `v24.14.0` / `main` | 一致 |
| V-2 | `node graph/workspace.js root` | `C:\Users\kikus\Documents\workspace\paradise-creations` | 一致(第30条は守られている) |
| V-3 | 実台帳を `sha1(slug+metrics+scale)` で指紋化 | `total lines: 30` / `distinct: 6`、重複群 `1,6,11,16,21,26` 他 | **一致**(重複率 80% = 24/30) |
| V-4 | 台帳全行の鍵を検査 | `sample keys: ['ts','slug','scale','metrics']` / `has fingerprint key on any row? false` | **既存行に冪等鍵は無い**(後方互換要件の根拠) |
| V-5 | サンドボックス(`PARADISE_CREATIONS` 振替)で `baseline` ×3 | `after baseline #1: 2` / `#2: 4` / `#3: 6` lines、`distinct(slug+metrics+scale) 2` | **一致**。行数は実行回数に線形 |
| V-6 | 同サンドボックスで `gauge.js compare --last 3` | `habit / coin / habit` — 2創造物しか無いのに窓に habit が二度 | **一致**(1.4(a)) |
| V-7 | `gauge.js record <同じ run> --slug coin` を二度 | 6行 → **8行**(二度打ちが素通り) | **一致**。案(b) baseline 限定では塞がらない |
| V-8 | 衝突マーカー入り台帳に `readLedger()` | `⚠️ ledger line skipped (corrupt)` ×3、`parsed rows: 3 ["T0","T2","T1"]` | **一致**。破損耐性は在り、かつ**行順は時刻順でない** |
| V-9 | 実台帳 30行に keep-first 畳みを適用 | `raw 30 -> keep-first 6`、`80→100` の本物の改善2行は残存 | **一致**(discovery 4章 C 案の前提) |
| V-10 | 同じ30行を2通り shuffle して畳み比較 | `shuffle-invariant: true` | 指紋畳みは**位置に依存しない**ことを実測 |
| V-11 | `node -e "Object.keys(require('./graph/gauge.js'))"` | `score,normalize,record,baseline,compare,readLedger,ledgerPath,WEIGHTS` — **`latestFor` は未 export** | 門から `latestFor` を直接叩けない(FR-4 の設計制約) |
| V-12 | `grep -n gauge .github/workflows/tribunal.yml` | `(no gauge in CI)` | **一致**。台帳を検める門は現在ゼロ |
| V-13 | `grep -c PARADISE_CREATIONS tests/paradise.test.js` | `7`(既存作法 `tests/paradise.test.js:2906-2932`) | 新しい門はこの作法に接続できる |

**根拠にできない事項**(discovery が「推測」と明記したもの。要件に使わない):
09-02 の5バッチを**誰が**打ったか / `reform-claude-md-diet` が当時 creations 直下に居たか。

---

## 1. 機能要件 (must-have)

各 FR は **由来(discovery.md の節・行)** を持ち、**AC は機械が裁ける形**(コマンドと期待出力)で書く。

> AC 共通の前提: 検査は既存作法どおり `PARADISE_CREATIONS` で**仮の倉に振り替えて**行う(第30条を破らない)。
> 実台帳を書き換える AC は一つも無い。

---

### FR-1 【冪等鍵】台帳の各行は自分の指紋を名乗る

`record()` が書く entry は、`ts` を除いた観測内容から**決定的に**算出される冪等鍵を自身に持つこと。
鍵は entry の中に住む(**別ファイルのキャッシュを作ってはならない** — 第30条に触れる。由来 5章 G-7)。

- **由来**: discovery 2章(d) / 3-1 AWS「決定的な event ID を書く」/ V-4(既存行に鍵が無いことを実測)
- **鍵の材質**: 少なくとも `slug` と `scale` と `metrics` から決まり、`ts` に依存しないこと。
  (V-3/V-9 でこの材質による畳みが 30→6 に効くことを実測済み)

**AC-1a** 同一 run・同一 slug を二度 record した2つの entry の冪等鍵が一致する:
```
node -e "
process.env.PARADISE_CREATIONS='<仮倉>';
const g=require('./graph/gauge.js');
const a=g.record('<run.json>','coin'), b=g.record('<run.json>','coin');
console.log(a.<鍵> === b.<鍵> ? 'PASS' : 'FAIL');"
```
期待出力: `PASS`(かつ `a.ts !== b.ts` でも一致すること)

**AC-1b** 鍵は `ts` に依存しない — 同じ観測で ts だけ違う2行の鍵が同一:
期待: 上記が `ts` を差し替えても `PASS` のまま。

**AC-1c** 第30条の維持 — 実装が第二の住所を持ち込まない:
```
node graph/workspace.js check
```
期待出力: `✓ 楽園に創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし`、**exit 0**
(併せて既存の自己試験 `✓ B-4: 走行帳の住所を知るのは workspace.js だけである (第30条)` が緑のままであること)

---

### FR-2 【予防・書き側】同一指紋の観測は台帳に二度追記されない

`record()` は追記前に既存台帳を検め、**同一冪等鍵の行が既に在れば追記しない**(第一の記録を正とする = keep-first)。
`baseline()` は `record()` の N 重ループなので、`record()` を直せば baseline も自動的に冪等になる。

- **由来**: discovery 1.1(行209 の無条件 append が欠陥の中心)/ 2章(a) / 3-3 Idempotent Consumer / V-5, V-7
- **fail-open の原則**: 台帳が読めない・破損している場合は「重複を見逃して一行余分に書く」側に倒れること。
  **既存行を消す方向に倒れてはならない**(由来 2章(a) 破損耐性)。

**AC-2a** baseline を二度走らせて行数が変わらない(**冪等性の核**):
```
export PARADISE_CREATIONS=<仮倉>   # conclave.json を2つ置く
node graph/gauge.js baseline >/dev/null; n1=$(wc -l < <仮倉>/gauge-ledger.jsonl)
node graph/gauge.js baseline >/dev/null; n2=$(wc -l < <仮倉>/gauge-ledger.jsonl)
[ "$n1" = "$n2" ] && echo PASS || echo FAIL
```
期待出力: `PASS`(かつ `n1 = 2`)
**現状での挙動(実測 V-5)**: `2 / 4 / 6` と増える → **この門は今書けば即座に赤くなる = 本物の門である。**

**AC-2b** record 単独の二度打ちも一行(**人が実際に歩く道**):
```
node graph/gauge.js record <run.json> --slug coin
node graph/gauge.js record <run.json> --slug coin
wc -l < <仮倉>/gauge-ledger.jsonl
```
期待出力: `1`
**現状での挙動(実測 V-7)**: 6行 → 8行。
**この AC が欠かせない理由**: discovery 1.5 の実測どおり、実運用で `record` を打つのは `/conclave` の道を歩く人間/エージェント
(`overlay/commands/conclave.md:148` / `forge.md:85`)であり、baseline だけ守る案(b)ではこの道が素通りする。

**AC-2c** 二度目の record は**沈黙せず**「既記録」を名乗る(exit 0 のまま、標準出力に skip の旨):
期待: 二度目の出力が一度目と区別可能な文言を含む(例 `already recorded` 相当)。exit code は 0。

**AC-2d 【故障注入 — 門が鳴ることの証明】** 冪等検査を外した `record` を注入すると AC-2a が赤くなる:
期待: 注入版で行数が `n1*2` になり、門が **exit 1** で落ちる。
(実装をなぞるだけのテストは門ではない — 故障を注入して鳴ることを示す)

---

### FR-3 【治癒・読み側】`readLedger` 系の下流は重複を畳んだ観測を見る

既に台帳に入ってしまった重複・他ブランチから流れ込んだ重複に対して、**書き込み側の規律に依存せず**下流が正しく振る舞うこと。
畳みは **keep-first(同一指紋のうち `ts` が最小の行を残す)**。

- **由来**: discovery 2章(c)(「行順は時刻順でない」ので「後着=新しい」は嘘になりうる)/ 3-1 AWS「読み手が ID で除重する」/ 3-2 Stripe(先着を正とする) / V-9, V-10
- **重要**: 畳んでも `reform-eval-gauge 80 → 100` の**本物の改善2行は消えない**(指紋が違う)。V-9 で実測済み。
- **破壊的変更の禁止**: `readLedger()` 自体の戻り値(生の全行)を変えるか、畳み済みを返す別経路を設けるかは DESIGN の裁量。
  ただしどちらを選んでも AC-3・AC-6・FR-7 を同時に満たすこと。

**AC-3a** 実台帳と同型の30行(distinct 6)を仮倉に置くと、畳んだ結果が **6行**:
```
node -e "... 30行を仮倉に書く ...; console.log(fold(readLedger()).length)"
```
期待出力: `6`(V-9 で `raw 30 -> keep-first 6` を実測済み)

**AC-3b** 畳んだ6行に `2026-08-31T13:54:12.963Z 80 reform-eval-gauge` と `2026-08-31T14:01:25.440Z 100 reform-eval-gauge` が**両方**残る:
期待出力: `true`(第38条の「改善を語る二行」を畳みが殺さないことの門)

**AC-3c 【偽の変化なしを禁ずる】** 重複台帳でも `compare --last 3` が **3つの異なる観測**を返す:
```
node graph/gauge.js compare --last 3
```
期待: 出力の3行に**同一 slug × 同一 score の重複が無い**。
**現状での挙動(実測 V-6)**: `habit / coin / habit` — 2創造物しか無いのに habit が二度並ぶ。

**AC-3d 【故障注入】** 畳み処理を外すと AC-3c が窓の重複で **exit 1**。

---

### FR-4 【順序非依存】行順に意味を持たせない

`latestFor()`(`gauge.js:241-244` の `hits[hits.length-1]`)と `compare --last N`(305 の `slice(-n)`)は
**どちらも行順を時刻の代理として使っている**。この前提は破れている。
「最新」は **`ts` の最大**で決め、「直近N件」は **`ts` で並べ替えてから**採ること。

- **由来**: discovery 2章冒頭の git マージ実測(`parsed rows: 3 ["T0","T2","T1"]`)/ 5章 G-5 / V-8, V-10
- **設計制約(V-11)**: `latestFor` は現在 **module.exports に無い**。門から直接検めるには export を足すか、
  `compare` 経由で観測可能にすること(どちらを採るかは DESIGN の裁量)。

**AC-4a** 同じ行集合を shuffle した2つの台帳で、畳んだ結果と「最新」が**完全一致**:
```
node -e "... shuffle A / shuffle B ...; console.log(JSON.stringify(foldA)===JSON.stringify(foldB))"
```
期待出力: `true`(V-10 で指紋畳みが shuffle-invariant であることは実測済み)

**AC-4b** 行順が時刻順でない台帳(`T0, T2, T1` の順で並ぶ)で、「最新」が **`T2` の行**(ts 最大)を返し、
末尾行 `T1` を返さない:
期待出力: `T2`
**現状での挙動**: `hits[hits.length-1]` は `T1` を返す(= 位置依存の誤り)。

**AC-4c 【故障注入】** 実装を `hits[hits.length-1]` に戻すと AC-4b が **exit 1**。
**狙い**: 位置に依存する実装への回帰を永久に禁じる。

---

### FR-5 【後方互換】冪等鍵を持たない既存行を読めなくなってはならない

台帳の既存30行(コミット済み5行を含む)は `{ts, slug, scale, metrics}` のみで**冪等鍵を持たない**(V-4 で実測)。
鍵が無い行は **その場で指紋を再計算する**フォールバックで扱い、
**読み飛ばし・エラー・行落ちのいずれも起こしてはならない。**

- **由来**: discovery 2章(d) 短所「既存6行(コミット済み5行含む)には鍵が無い」/ V-4

**AC-5a** 鍵を一つも持たない旧形式のみの台帳を読んで、行が一つも落ちない:
```
node -e "... 旧形式(ts/slug/scale/metrics のみ)を N 行書く ...; console.log(readLedger().length)"
```
期待出力: `N`(投入行数と一致。0 でも `undefined` でもない)

**AC-5b** 旧形式のみの実台帳同型30行で畳みが働き **6行**になる(= 鍵が無くても再計算で畳める):
期待出力: `6`

**AC-5c** 新旧混在(鍵あり行 と 鍵なし行 が同一観測)で**同一指紋と判定され1行に畳まれる**:
期待出力: `1`

**AC-5d** 既存の自己試験が緑のまま — とりわけ台帳の既存門:
```
node tests/paradise.test.js
```
期待出力: `Paradise self-test: <N> passed, 0 failed`(N ≥ 344)。
とくに `gauge: 台帳は追記型で record→compare が前後を語る`(`tests/paradise.test.js:2906`)は
**`record` を2回呼んで `entries.length === 2` を主張している** — この2回は
`demo-before` / `demo-after` の**異なる slug・異なる metrics** なので冪等化後も 2 行であるべきである。
**この試験が赤くなる実装は FR-2 の解釈を誤っている。**

---

### FR-6 【破損耐性の維持】衝突マーカーを読み飛ばす既存挙動を壊さない

`readLedger()`(`gauge.js:187-198`)は破損行を `console.error` して読み飛ばし、残りを正しく読む。
**冪等化の実装がこの挙動を壊してはならない。**

- **由来**: discovery 2章冒頭の実測 / 5章 G-4 / V-8(私も `parsed rows: 3` を再実測)

**AC-6a** `<<<<<<< HEAD` / `=======` / `>>>>>>> A` を含む台帳で、生きた3行が全て読める:
```
printf '{"ts":"T0",...}\n<<<<<<< HEAD\n{"ts":"T2",...}\n=======\n{"ts":"T1",...}\n>>>>>>> A\n' > <仮倉>/gauge-ledger.jsonl
node -e "console.log(require('./graph/gauge.js').readLedger().length)"
```
期待出力: `3`(標準エラーに `⚠️ ledger line skipped (corrupt)` が3回。**exit は 0、例外を投げない**)

**AC-6b** 同じ破損台帳に畳みを掛けても**生きた行数が減らない**:
期待出力: 畳み後の行数 `3`(3行の指紋は互いに異なるため)

**AC-6c** 破損行が在る状態で `record` しても既存行が失われない(FR-2 の fail-open):
期待: record 後の生存行数 ≥ record 前の生存行数。

---

### FR-7 【矛盾を隠さない】同一鍵で中身が食い違うときは黙って畳まない

同一の観測対象(同一 slug・同一 run)に対して **metrics が食い違う**記録が現れたとき、
黙って先着を採るのではなく、**矛盾として名指す経路が在ること**(第16条: 測れなかったものをゼロで埋めず名指す、の精神)。

- **由来**: discovery 3-2 Stripe「同じ鍵で中身が違えばエラーにする」/ 5章 G-6 /
  1.6 の実例(台帳の `reform-claude-md-diet 80` vs 現在の実測 `score = 100`)
- **注意**: FR-1 の指紋は metrics を材質に含むため、metrics が違えば**指紋も違い、畳まれずに両方残る**(これは正しい)。
  本 FR が要求するのは「両方残る」に加えて、**それを人が見つけられる出力経路**である。

**AC-7a** 同一 slug で metrics だけ異なる2行が**畳まれずに2行とも残る**:
期待出力: `2`

**AC-7b** 矛盾を検出する経路が exit code か標準出力で**判別可能**な信号を出す:
期待: 矛盾ありのとき非ゼロ exit、または出力に矛盾を名指す行が現れる。矛盾なしのとき exit 0。
(信号の形 — 新サブコマンドか既存出力への追記か — は DESIGN の裁量)

---

### FR-8 【既存の汚染24行の処置】畳んだ版を普通のコミットで置く

実台帳の 30行中 24行(80%)が重複であり、**汚染はすべて未コミット領域に閉じている**
(`git status --short` → ` M gauge-ledger.jsonl`、`git diff --stat` → `25 insertions`、
`git show HEAD:` は重複の無い健全な5行)。

- **由来**: discovery 1.2 / 4章(A却下・B有力・**C推奨**・D併用)/ V-3, V-9

**決定(要件として定める)**: **C + D**。
- **C**: keep-first で畳んだ **6行**を書き戻し、「重複を畳んだ」と明記して**普通のコミット**で置く。
- **D**: 同時に FR-3 の読み側畳みを恒久の安全網として持つ。
- **A(履歴書き換え)は禁ずる** — コミット済み5行に重複は無く書き換える対象が存在しない。
  かつ `git log` は `f826371 Merge pull request #2` を含み、共有履歴を壊す代償に見合う利得がゼロ。
- **B(`git checkout --` で捨てる)を採らない理由**: `reform-claude-md-diet 80` は **HEAD に無い唯一の観測**であり、
  B ではこれが失われる。C なら **観測は一つも失われない**。

**AC-8a** 畳んだ結果が **6行**で、その内訳が V-9 の実測と一致する:
```
wc -l gauge-ledger.jsonl
```
期待出力: `6`、内容は
`coin 100 / habit 45 / reform-eval-gauge 80 / reform-eval-gauge 100 / tenbin 100 / reform-claude-md-diet 80`

**AC-8b 【観測を一つも失わない】** 畳む前の30行の distinct 指紋集合と、畳んだ後の6行の指紋集合が**完全一致**:
期待出力: `true`(集合として一致。差分ゼロ)

**AC-8c 【履歴を書き換えない】** 台帳の処置コミットの前後で、それ以前のコミット SHA が変わらない:
```
git log --oneline -- gauge-ledger.jsonl
```
期待: 処置前に存在した `7791cdf` / `f804697` が処置後も同じ SHA で存在する。

**AC-8d 【PR の分離】** この処置の PR は **creations 側リポジトリ**に立つ
(台帳の住所は `node graph/workspace.js root` → `...\paradise-creations`)。
engine の修正(paradise 側)と台帳の掃除(creations 側)は **別の PR** であること。
期待: paradise 側 PR の `git diff --name-only` に `gauge-ledger.jsonl` が**現れない**。

---

### FR-9 【門を CI に繋ぐ】台帳を検める門が存在する状態にする

現在 CI(`.github/workflows/tribunal.yml`)に gauge 台帳の門は**一つも無い**(V-12 で `grep` が空を再実測)。
FR-2〜FR-7 の AC は `tests/paradise.test.js` に接続し、CI が走らせる状態にすること。

- **由来**: discovery 1.5(CI に門なし)/ 5章冒頭 / V-12, V-13

**AC-9a** 新しい門が自己診断に載り、総数が増えて全緑:
```
node tests/paradise.test.js
```
期待出力: `Paradise self-test: <N> passed, 0 failed` かつ **N > 344**(調査開始時点の実測値)

**AC-9b** 既存の関連門 `tests/dashboard-run-panel.test.js:191` の AC-22a(pulse は baseline を呼ばない)が緑のまま。

**AC-9c** 新しい門はすべて `PARADISE_CREATIONS` で仮倉に振り替える既存作法
(`tests/paradise.test.js:2906-2932`)に従い、**実台帳を一行も書き換えない**:
期待: 門を走らせた後に `cd ../paradise-creations && git status --short` の
`gauge-ledger.jsonl` の状態が門の実行前と変わらない。

---

## 2. 機能要件 (nice-to-have)

これらは無くても本改修は成立する。**must-have の AC を一つでも危うくするなら捨てる。**

### NFR-1 `renderLedger` が畳みの結果を明示する
畳まれた行数を「N 行(重複 M 行を畳んだ)」の形で画面に出す。
**AC**: 30行同型の台帳で `node graph/gauge.js ledger` の出力に `24` と `6` に相当する数が現れる。

### NFR-2 `gauge.js` に台帳の健全性を検める読み取り専用サブコマンド
例 `gauge.js ledger --audit`: 重複数・矛盾数を報告し、重複ゼロなら exit 0。
**AC**: 現実台帳に対し非ゼロ(重複24)、畳んだ6行に対し exit 0。

### NFR-3 冪等鍵をコマンドラインから確認できる
**AC**: `gauge.js score <run.json> --json` の出力に指紋が含まれる、または同等の確認経路がある。

---

## 3. 遠ざけるもの (non-goals)

本改修は以下を**やらない**。着手しそうになったら、それは射程を超えている。

| # | 遠ざけるもの | 理由(実測に基づく) |
|---|---|---|
| NG-1 | **台帳の履歴書き換え**(rebase / filter-branch / force-push) | discovery 4章 A: コミット済み5行に重複は無く、書き換える対象が存在しない。`git log` は `f826371 Merge pull request #2` を含み共有履歴を壊す。force-push は permissions が拒む |
| NG-2 | **entry スキーマの大規模変更** | 既存9鍵の名も値も変えない。**足すだけ**(冪等鍵1つ)。既存30行が読めなくなる変更は FR-5 違反 |
| NG-3 | **`verdict.js` への波及** | discovery 1.4(d) の実測: verdict は `report.trajectory`(score の生値)を読み、台帳を読まない(`grep` の結果は27/68/158/194行のコメントのみ)。**裁定の点数は重複に汚染されていない** — 触る理由が無い |
| NG-4 | **`pulse.js` / `dashboard/paradise.js` の改修** | 1.4(c) の実測どおり「+0 が三段」は源が汚れているだけで、pulse/dashboard 自体は正しい。源(FR-2/FR-3)を治せば直る。dashboard を触るのは誤った局在 |
| NG-5 | **台帳の鮮度問題**(`reform-claude-md-diet 80` vs 現在 `100`) | 1.6 の記録どおり、baseline の到達範囲(`coin,habit,tenbin` の3件)の問題であり**冪等性とは別の欠陥**。FR-7 で「矛盾を名指す」ところまでで止める |
| NG-6 | **`tier3Ratio` の `undefined → NaN`** | 付録の実測どおり、古い行に序列鍵が無いことに由来する**別の欠陥**。射程外 |
| NG-7 | **`baseline()` の到達範囲を広げる** | 1.6 の別筋。冪等化と混ぜると「行数が変わらない」AC の意味が壊れる |
| NG-8 | **キャッシュファイル・インデックスファイルの新設** | 5章 G-7: 第二の住所解決を持ち込むのは第30条に触れる。指紋は entry 自身が持つ |
| NG-9 | **`/conclave` `/forge` コマンド文書の書き換え** | 道の側を直すのは engine の欠陥から目を逸らす。209行の無条件 append を直すのが本筋 |
| NG-10 | **実装をなぞるだけのテストを門と称すること** | 門は故障注入で鳴ることを示せ(AC-2d / AC-3d / AC-4c) |

---

## 4. 追跡可能性 — FR → 実測事実

| FR | 由来する実測事実(discovery.md の節 / 本相の再実測) |
|----|----|
| FR-1 冪等鍵 | 1.1(行209 無条件 append)/ 2章(d) / 3-1 AWS / **V-4**(既存行に鍵が無い) |
| FR-2 書き側の予防 | 1.1 / 1.5(record を打つのは人の手)/ 2章(a) / 3-3 / **V-5**(2→4→6)/ **V-7**(6→8) |
| FR-3 読み側の治癒 | 1.2(30行 distinct 6)/ 1.4(a)(c)/ 2章(c)/ 3-1 / **V-3, V-6, V-9** |
| FR-4 順序非依存 | 2章冒頭(T0,T2,T1)/ 5章 G-5 / **V-8, V-10, V-11** |
| FR-5 後方互換 | 2章(d) 短所(既存6行に鍵が無い)/ **V-4** / `tests/paradise.test.js:2906` |
| FR-6 破損耐性 | 1.1(187-198 の読み飛ばし)/ 2章(ii)/ 5章 G-4 / **V-8** |
| FR-7 矛盾を隠さない | 3-2 Stripe / 5章 G-6 / 1.6(80 vs 100 の実例) |
| FR-8 汚染24行の処置 | 1.2(未コミットに閉じる)/ 4章 A〜D の評価 / **V-3, V-9** |
| FR-9 門を CI に繋ぐ | 1.5(CI に門なし)/ 5章 / **V-12**(grep 空)/ **V-13**(既存作法7箇所) |

### 4.1 discovery の門案 G-1〜G-7 との対応
| 門案 | 本書の AC |
|---|---|
| G-1 baseline 二度で行数不変 | **AC-2a**(+ 故障注入 AC-2d) |
| G-2 record 単独の二度打ち | **AC-2b** |
| G-3 偽の Δ=0 を禁ずる | **AC-3c**(+ AC-3d) |
| G-4 破損耐性の維持 | **AC-6a / AC-6b / AC-6c** |
| G-5 順序非依存 | **AC-4a / AC-4b**(+ AC-4c) |
| G-6 矛盾を隠さない | **AC-7a / AC-7b** |
| G-7 第30条の維持 | **AC-1c**(+ AC-9c) |

**G-1〜G-7 は一つも落としていない。**

---

## 5. 完了の定義 (Definition of Done)

本改修が終わったと言えるのは、以下が**すべて実出力で示された**ときに限る。

1. must-have の FR-1〜FR-9 の全 AC が期待出力どおり。
2. `node tests/paradise.test.js` → `0 failed` かつ試験数 **> 344**。
3. 故障注入の3門(AC-2d / AC-3d / AC-4c)が、注入時に**確かに exit 1 で鳴る**ことを実出力で示した。
4. `node graph/workspace.js check` → exit 0(第30条)。
5. 台帳の処置(FR-8)が **creations 側の別 PR** で行われ、`wc -l` が `6`、履歴の書き換えが無い。
6. 第38条の証明: 改修の前後を gauge の数値で語れること — 具体的には
   **台帳 30行 / distinct 6(重複率 80%)→ 6行 / distinct 6(重複率 0%)** を前後の実測で示す。

---

## 6. 本相で走らせたコマンド一覧(すべて実行済み)

```
node -v                                              → v24.14.0
git rev-parse --abbrev-ref HEAD                      → main
node graph/workspace.js root                         → ...\paradise-creations
node graph/workspace.js resolve --json               → source=env で仮倉に振替可能を確認
node -e "指紋化 30行"                                → total 30 / distinct 6 / 重複群を列挙
node -e "entry の鍵を検査"                           → ['ts','slug','scale','metrics'] / 冪等鍵なし
node -e "Object.keys(require('./graph/gauge.js'))"   → latestFor は未 export
sandbox: PARADISE_CREATIONS 振替 + baseline ×3       → 2 / 4 / 6 行、distinct 2
sandbox: gauge.js compare --last 3                   → habit / coin / habit(窓の汚染)
sandbox: gauge.js record 同一 run ×2                 → 6行 → 8行(二度打ちが素通り)
sandbox: 衝突マーカー入り台帳 + readLedger()         → skipped ×3、parsed rows 3 ["T0","T2","T1"]
node -e "実台帳 keep-first 畳み"                     → raw 30 -> keep-first 6(80→100 は残存)
node -e "shuffle ×2 で畳み比較"                      → shuffle-invariant: true
grep -n gauge .github/workflows/tribunal.yml         → (no gauge in CI)
grep -c PARADISE_CREATIONS tests/paradise.test.js    → 7(既存作法)
sed -n '2900,2935p' tests/paradise.test.js           → 既存 gauge 門は record ×2 で entries.length===2 を主張
node tests/paradise.test.js                          → 実行(所要 >6分。既存門の緑を確認)
```

**本相で engine コードは一行も変更していない**(`graph/` への書き込みゼロ)。
実台帳(`../paradise-creations/gauge-ledger.jsonl`)も**一行も書き換えていない** — 検査はすべて仮倉と読み取りのみ。
