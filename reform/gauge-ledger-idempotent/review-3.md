# review-3 — gauge-ledger-idempotent の第三次差し戻し審査

> **相**: REVIEW / attempt 3(この環は既に**三度**差し戻されている)
> **対象**: `fix/gauge-ledger-idempotent` @ `0f3fe12`
> **入力時の主張**: 433 passed / 0 failed、census / workspace / codex / conclave audit すべて緑
> **裁定**: **【なお直すべき】** — ただし差し戻しの理由は前三回とは質が違う。§8 に述べる。

---

## 0. この報告が根拠にしている実出力(これ以外を根拠にしていない)

### 0.1 実台帳の不可侵(規律の第一証拠)

前任(prove attempt 3)は自分の変異注入器で**実台帳を 19 行汚した**(prove-report-3 §5.1)。
同じ轍を踏まないため、本相の注入器は **変異ごとに実台帳の sha256 を検算し、
一バイトでも動いたら `process.exit(3)` で即停止する**錠を先に付けた
(`harness.js` / 各 `mutate-*.js` の `if (H.sha(H.REAL_LEDGER) !== before)`)。
一度も発火しなかった。

```
作業前  387d9e0ea5a4fde30249897ebba3d53150e39a32cbf1e4299d922674bcb9982b  30 行
作業後  387d9e0ea5a4fde30249897ebba3d53150e39a32cbf1e4299d922674bcb9982b  30 行
```

`graph/gauge.js` と `tests/paradise.test.js` の sha256 も作業前後で不変
(`c8acd18a…` / `3b4e20bb…`)—— **変異は一つも実物に残っていない**。

> **訂正(第16条)**: 上の `graph/gauge.js` の不変は**私の 35 変異の走行中**についての主張である。
> 本相の終盤、**並走する security attempt 3 が同ファイルに注釈のみの変更を加えた**
> (非注釈行の差分はゼロ)。詳細と、それが D-3 を重くしたことは §10.1 / §6 D-3 に書く。
最終 `git status --short` は `M reform/gauge-ledger-idempotent/conclave.json` の一行のみ
(本相の入力時点で既に M だった走行帳)+ 本報告 `review-3.md`。§10.1 に終了時の全景を記す。

### 0.2 走行器

`tests/paradise.test.js` の gauge 節を**マーカーで**切り出す独立走行器を組んだ
(`// --- Gauge: the scale of proof` 〜 `// --- Diet gate`。行番号で切らない ——
門を足した瞬間に黙って別の場所を切るため)。**基線 105 門 / 5.9 秒**、
全体 433 門(約 6 分)× 35 変異は現実的でないためである。

```
GAUGE-RUNNER: 105 passed, 0 failed        exit 0        5893ms
real ledger: 387d9e0e… (走行の前後で不変)
```

> **走行器自身の欠陥を正直に書く(第16条)。** 走行器は gauge 節の外の門を撃たない。
> §7.1 に「私が測っていないもの」として名指す。

---

## 1. P-1 の治癒検証 —— **四つの面すべてを自分で再現した。治癒している。**

review-2 P-1 は「S-2 の修理が too-deep の読み飛ばしを `opts.raw` の**前**に置いたせいで
生じた三つの穴」だった。修理は `graph/gauge.js:439` に `if (opts.raw) return out;` を
**深さの検査より前**へ移すことである。四面を独立に撃った(`verify-p1.js`)。

### ① `raw:true` は本当に生の全行を返すか → **治癒**

```
ファイル行数 = 2 / raw:true の返り = 2
raw の slug: ["coin","deepy"]
判定: OK 生は生
既定(畳み)の返り = 1  (⚠️ ledger line skipped (too deep, > 64): {"ts":"2026-01-02…)
```

健全 1 行 + 200 段の深い 1 行の台帳で、`raw:true` は 2 行、既定は 1 行。
**生の道と畳みの道が正しく分岐している**(`gauge.js:439` / `gauge.js:441-449`)。

### ② 全行 too-deep の台帳を `--audit` が「健全」と答えないか → **治癒**

review-2 が最も重く咎めた穴。**実測(CLI を子プロセスで撃った)**:

```
exit=2
📒 rows=2 distinct=2 duplicates=0 conflicts=2 too-deep=2
  ⚠️ 読めない行: a — 入れ子が深すぎて鍵を導けない(> 64。畳みでも掃除でも消してはならない)@ 2026-01-02T00:00:00.000Z
  ⚠️ 読めない行: b — 入れ子が深すぎて鍵を導けない(> 64。畳みでも掃除でも消してはならない)@ 2026-01-03T00:00:00.000Z
  🔴 人が読むべき行が 2 件ある — 掃除では消えない
```

旧実装は `rows=0 … exit 0`「健全」と答えていた。いまは **数えて・名指して・exit 2**。
`auditLedger` が `tooDeep` を返り値に載せ(`gauge.js:603`)、CLI がそれを読む(`gauge.js:692`)。

### ③ FR-8 の掃除が深い行を永久に消さないか → **治癒**

```
raw 2 行 / うち深すぎ 1 行 → 掃除の材料に深い行が居る: OK
```

掃除は `readLedger({raw:true})` を材料にする(`design.md:551`)。生が痩せていないので
深い行は掃除の入力に残る。門も在る(`tests/paradise.test.js:4259`)。

### ④ 画面が深い行を「重複」に混ぜないか → **治癒**

```
═══════ 📒 GAUGE LEDGER ═══════
  2026-01-01T00:00  100/100  coin (standard)
═══════════════════════════════
  (raw 3 行 / 重複 1 行を畳んだ / 深すぎて読めない 1 行を読み飛ばした — `gauge.js ledger --audit` で内訳)
```

**重複 1 と読み飛ばし 1 を別々に名乗っている**(`gauge.js:711-729`)。第16条の要求どおり。

### P-1 の門は壊して鳴るか(治癒が偶然でないことの証明)

私の変異 **X6 / X7 / X9 / X10** がそれぞれ P-1 の面を狙い、**すべて鳴った**:

| 変異 | 狙い | 結果 |
|---|---|---|
| X6 | `trueKey` が too-deep に固定の番兵鍵を返す(深い行が全部一つに畳まれる) | 🔔 **10 門** |
| X7 | 警告の名指しに元テキストでなく `JSON.stringify(row)` を使う(S-2 の穴を名指し側から開け直す) | 🔔 2 門 |
| X9 | CLI の too-deep 集計を畳んだ列から採る(読み飛ばしを常に 0 と告げる) | 🔔 1 門 |
| X10 | audit の exit 2 判定を forged-fp のみに狭める(読めない行を exit 1 に降格) | 🔔 2 門 |

---

## 2. P-2 の治癒検証 —— **治癒している。むしろ review-2 の測定値より速い。**

review-2 P-2 は「`trueKey` の常時再導出が `foldLedger` を x24〜29、`record` を x7〜8 遅くした」。
修理は (a) `foldLedger` 内の memo(`gauge.js:360-366`)、(b) `baseline` の `keyIndex` 一度組み
(`gauge.js:513`)である。自分で測った(`verify-p2.js`)。

```
foldLedger N=5000 : 23.8ms → 5000 行
foldLedger N=20000: 93.7ms → 20000 行
baseline (N=4000 行 / M=20 創造物) 一度目: 34ms  二度目: 27ms
台帳行数: 4000 → 4020 (baseline ×2 後)。skipped を名乗った数: 20/20
```

**review-2 が実測した「N=4000 / 20 創造物で 602ms」が 34ms になっている(約 x18 の回復)。**
二度目の baseline は 20 件すべてが `skipped` を名乗り、台帳は一行も増えない ——
**高速化が冪等性を壊していない**。

> **正直に書く**: 上の `4000 → 4020` は「20 個の別創造物が**それぞれ別の slug** を持つので
> 20 行が新規に刻まれた」結果であり、重複ではない。私の検証スクリプトの初回判定文言
> (`⚠ +20 行`)は誤りだったので、ここで訂正する。二度目が +0 行であることが冪等性の証拠である。

### P-2 の門は壊して鳴るか

| 変異 | 狙い | 結果 |
|---|---|---|
| X3 | `keyIndex` の「材料の無い行」除外を緩める | 🔔 1 門(P-2 の門) |
| X4 | `record` が刻んだ行を索引に載せない(baseline 一回で二度刻む) | 🔔 1 門 |
| X1 | memo の鍵を行オブジェクトから `e.ts` に変える | 🔔 2 門 |

---

## 3. P-3 の治癒検証 —— **ヘルパーを実際に壊した。門は鳴る。治癒している。**

review-2 の最も重い所見は「**門ヘルパーを守る門が一本も無い**」だった。
build attempt 3 は `tests/paradise.test.js:4098-4198` に 5 本、prove attempt 3 が
`:4829` に 1 本を立てたと主張する。**主張を信じず、ヘルパーを実際に改変して撃った**
(`mutate-helpers.js` / `mutate-helpers-b.js`)。

| # | ヘルパーへの変異(ファイル:行) | 結果 | 鳴った門 |
|---|---|---|---|
| H1 | `injectGauge` の「注入が空振りした」assert を外す (`:3030`) | 🔔 1 門 | 門ヘルパー P-3/T1 |
| H2 | `runGaugeGate` が失敗時の exit code を 1 に捏造 (`:3045`) | 🔔 2 門 | P-3/T2 ほか |
| H4b | `withGaugeSandbox` の仮倉掃除を外す (`:2961`) | 🔔 2 門 | 門自身の衛生 / P-3/T4 |
| H7 | `writeGaugeLedger` が投入行を黙って重複除去 (`:2966`) | 🔔 2 門 | P-3/T7 ほか |
| H8b | `withGaugeSandbox` が外の env を尊重(`prev \|\| tmp`)(`:2951`) | 🔔 **21 門** | AC-2a/3a/3b/5a/5b/6a… |
| H9 | `gauge30Rows` の重複を 5 部 → 1 部に痩せさせる (`:2996`) | 🔔 10 門 | AC-3a / AC-7b ほか |
| H10 | `gaugeRow` の metrics を全 slug 同一に (`:2982`) | 🔔 17 門 | AC-3a/3b/5b/7a/7b |
| **H11b** | **【新規】** `GAUGE_OBSERVATIONS` の distinct 6 を 4 に痩せさせる (`:2972`) | 🔔 **14 門** | AC-3a / AC-5b / AC-7b |
| **H13** | **【新規】** `runGaugeGate` が子プロセスの stderr を捨てる (`:3045`) | 🔔 2 門 | S-2 注入門 / P-3/T2 |
| **H14** | **【新規】** `withGaugeSandbox` の finally から env の復元を落とす (`:2957`) | 🔔 3 門 | 門自身の衛生 / P3/T1 |
| H12b | **【新規】** `withGaugeSandbox` が**入口で** gauge.js の cache を捨てない (`:2953`) | ❌ 無音 | — (§5.11 で triage) |

**10 中 9 が鳴った。P-3 は治癒している。**

> **私自身の測り間違いを正直に記す(第16条)。** 一巡目、H4 と H8 を「無音」と記録した。
> 原因は私の注入器で、`process.env.PARADISE_CREATIONS = tmp;` は
> `tests/paradise.test.js` に **2 箇所**(`:2910` の別ヘルパーと `:2951` の `withGaugeSandbox`)
> あり、素の `String.replace` が**先頭の別ヘルパーを撃っていた**。
> n 番目の出現を狙う `nth()` で撃ち直したところ、H4b は 2 門、H8b は **21 門**鳴った。
> **「無音だった」と報告する前に、注入が本当に狙った場所に当たったかを検めねばならない。**
> これは review-2 の T1(`injectGauge` の空振り assert)がまさに戒めていた病であり、
> 私は自分の道具でそれを再演した。

---

## 4. 修理が新たな病を生んでいないか —— **最優先で見た。四つの面を撃った。**

この環には「**S-2 の修理が P-1 を生んだ**」前例がある。build attempt 3 の修理
(raw の位置・memo・keyIndex・tie-break 第二段・exit code の分割)が新たに増やした面を
`probe-new.js` で 13 通り撃った。実台帳は前後で不変。

### 4.1 memo / keyIndex は古い鍵を保持するか → **保持しない**

```
D-2 memo の寿命 — 同じオブジェクトを内容を変えて二度畳む
  1度目 1 行 / 中身変更後 2 行 (期待 2 = memo が跨いでいない)
  判定: OK memo は呼び出し内で死ぬ
```

memo は `foldLedger` の**呼び出しの内側で生成され返らない**(`gauge.js:360`)。
`WeakMap` ではなく `Map` だが、関数スコープなので呼び出し終了で丸ごと GC 対象になる。
**リークは無い。** これを反証するため X19(memo をモジュール大域へ持ち上げる)を撃った ——
§5.6 のとおり **無音**であり、これは門の穴である(実装は正しいが、正しさを守る門が無い)。

### 4.2 索引を組んだ後に台帳が変わったら → **予防は漏れるが治癒が拾う(設計どおり)**

```
D-1 索引経由 2 度目: skipped=true / 台帳行数=2
    索引なし  3 度目: skipped=true / 台帳行数=2
    畳んだ後: 1 行 (治癒が拾えば実害なし)

D-12 並行 record: ファイル行数=2 (予防は漏れる) / 畳んだ後=1 (治癒が拾う)
     判定: OK 二重防御が設計どおり働く
```

`design.md` が宣言する「予防(record)と治癒(foldLedger)の二重防御」が**実測で成立している**。
索引が古くても台帳のファイルに重複が一行増えるだけで、**記録は決して失われない**
(`record` は append しかしない: `gauge.js:495`)。

### 4.3 exit 2 と exit 1 の意味の衝突 → **【重大】衝突している(D-3)**

P-8 の修理は audit の信号を分けた:`0`=健全 / `1`=掃除で消える重複 / `2`=人が読むべき事故
(`gauge.js:687-702`)。**しかし `main()` 全体を包む catch も exit 2 を使う**(`gauge.js:735-738`)。
実測:

```
audit(健全な台帳)            exit=0
compare 記録なき slug         exit=2  🔴 ledger has no entry for: nonexistent-slug — 記録なき前後は比較できない
score 存在しないファイル      exit=2  🔴 ENOENT: no such file or directory, open '…'
record 壊れた run             exit=2  🔴 ENOENT: no such file or directory, open '…'
```

**「台帳に人が読むべき事故がある」と「引数が間違っている / ファイルが無い」が同じ exit 2 である。**
CI が `gauge.js ledger --audit` の exit 2 を「台帳の汚染」と解釈する設計なのに、
`compare` のタイプミスも exit 2 を返す。→ **§6 D-3 に【重大】として立てる。**

### 4.4 too-deep 行があるときの compare / latestFor → **【重大】(D-4)**

```
compare coin deepy: exit=2  ⚠️ ledger line skipped (too deep, > 64): …
latestFor(生の配列)  : too-deep 行を「最新」として返した
latestFor(畳んだ配列): null = 落ちている
```

`latestFor` は `e.metrics` の有無しか見ない(`gauge.js:545-548`)ので、
**生の配列を渡されると読めない行を「最新」として返す**。
`compare` は畳んだ列を読む(`gauge.js:606`)ので今日は無事だが、
**`latestFor` は export されている公開関数**(`gauge.js:745`)であり、
生の配列を渡す呼び手が現れた瞬間に壊れる。X18b(`compare` を生の列に変える)で実証した:

```
実物   score  100 → 45   -55 ⬇ 悪化
変異版 score  100 →  1   -99 ⬇ 悪化      ← 読めない行が「最新」として比較に入った
```

**しかもこの変異は無音だった。** → §6 D-4 に【重大】として立てる。

---

## 5. 私が発明した新規 35 変異 —— **24 が鳴り、11 が無音(31%)**

**過去約 123 変異(review-1 の M1〜M20 / prove-2 の N1〜N25 / review-2 の 39 /
build-3 の 12 / prove-3 の 27)と一つも重ならない**変異のみを選んだ。
狙ったのは、前任たちが撃っていない層である ——
**索引・memo(build-3 が新設した面)/ 再入・同一プロセスでの住所振替 / 番兵鍵 /
Unicode 正規化 / 数の精度境界 / 改行コード / 画面の信号**。

### 5.1 一覧(🔔 = 鳴った / ❌ = 無音)

| # | 層 | 変異 | 結果 | 鳴った門(抜粋) |
|---|---|---|---|---|
| X1 | 索引 | memo の鍵を行オブジェクト → `e.ts`(同時刻の別行が互いの鍵を掴む) | 🔔 2門 | R-1/M6 / M2-M11 注入門 |
| **X2** | 索引 | `keyIndex` を keep-first → keep-last | ❌ **無音** | — |
| X3 | 索引 | `keyIndex` の「材料の無い行」除外を緩める | 🔔 1門 | P-2 / S-1 再発防止門 |
| X4 | 索引 | `record` が刻んだ行を索引に載せない | 🔔 1門 | P-2 が冪等性を壊していない |
| **X5** | 索引 | `record` の索引不在時の読みを raw → 畳み済みに | ❌ **無音** | — |
| X6 | 深さ | `trueKey` が too-deep に**固定の番兵鍵**を返す | 🔔 **10門** | S-2 ×2 / N11 / P-1① / P-1② |
| X7 | 深さ | 警告の名指しに `JSON.stringify(row)` を使う | 🔔 2門 | S-2 ×2 |
| **X8** | 深さ | `readLedger` が元の行テキストを控えない | ❌ **無音** | — |
| X9 | 深さ | CLI の too-deep 集計を畳んだ列から採る | 🔔 1門 | P-1 / NFR-1 |
| X10 | 信号 | audit の exit 2 判定を forged-fp のみに狭める | 🔔 2門 | P-1② / P-8 |
| **X11** | 信号 | 偽の鍵の検出を `!= null` → 真値判定(`fp:""` が無罪) | ❌ **無音** | — |
| X12 | 正規化 | 丸めを `toFixed(6)` → `Math.round(v*1e6)/1e6` | 🔔 1門 | R-1(M2/M3/M4/M6/M11) |
| X13 | 正規化 | 文字列を **NFC 正規化**してから鍵にする | 🔔 1門 | prove-2 の 13 変異門 |
| **X14** | 正規化 | 深さの警告文だけ 64 → 32 と嘘をつく(検査は 64 のまま) | ❌ **無音** | — |
| X15 | 畳み | keep-first の比較から `String()` を外す | 🔔 1門 | prove-2 の 13 変異門 |
| X16 | 畳み | `latestFor` の絞りを `metrics` → `ts` に | 🔔 2門 | N16 ほか |
| X17 | 採点 | `complete` の判定に `active` を混ぜる | 🔔 1門 | 未完走は減点 |
| **X18b** | 下流 | `compare` が畳んだ列でなく**生の列**を読む | ❌ **無音** | — |
| **X19** | 再入 | **memo を関数外(モジュール大域)に持ち上げる** | ❌ **無音** | — |
| **X20** | 再入 | **`ledgerPath` を読み込み時に一度だけ固定する** | ❌ **無音** | — |
| X21 | 書き | 指紋の材料に `ts` を混ぜる(冪等鍵が時刻依存に退行) | 🔔 **27門** | AC-1a/1b/2a/2b/2c/2d… |
| X22 | 下流 | `readLedger` の fail-open catch が `kept` → `[]` | 🔔 1門 | P-3/W3 |
| X23 | 境界 | JSONL の分割を `\n` → `os.EOL`(LF 台帳が Windows で一行に) | 🔔 **35門** | AC-2a/3a/3b/3c… |
| **X24** | 画面 | **`renderLedger` の error 行の枝を落とす** | ❌ **無音** | — |
| **X25** | 画面 | **`renderScore` の score の色分けを固定 🟢 に** | ❌ **無音** | — |
| H1 | 門 | `injectGauge` の空振り assert を外す | 🔔 1門 | P-3/T1 |
| H2 | 門 | `runGaugeGate` が exit code を捏造 | 🔔 2門 | P-3/T2 |
| H4b | 門 | `withGaugeSandbox` の仮倉掃除を外す | 🔔 2門 | 門自身の衛生 / P-3/T4 |
| H7 | 門 | `writeGaugeLedger` が黙って重複除去 | 🔔 2門 | P-3/T7 |
| H8b | 門 | `withGaugeSandbox` が外の env を尊重(`prev \|\| tmp`) | 🔔 **21門** | AC-2a/3a/3b/5a/5b/6a… |
| H9 | 門 | `gauge30Rows` の重複を 5 部 → 1 部に | 🔔 10門 | AC-3a / AC-7b |
| H10 | 門 | `gaugeRow` の metrics を全 slug 同一に | 🔔 17門 | AC-3a/3b/5b/7a/7b |
| **H11b** | 門 | **`GAUGE_OBSERVATIONS` の distinct 6 を 4 に痩せさせる** | 🔔 **14門** | AC-3a / AC-5b / AC-7b |
| **H12b** | 門 | **`withGaugeSandbox` が入口で cache を捨てない** | ❌ **無音** | — |
| H13 | 門 | **`runGaugeGate` が子プロセスの stderr を捨てる** | 🔔 2門 | S-2 注入門 / P-3/T2 |
| H14 | 門 | **`withGaugeSandbox` の finally から env の復元を落とす** | 🔔 3門 | 門自身の衛生 / P3/T1 |

**35 種中 24 が鳴り、11 が無音(31%)。**

> 過去の無音率: review-1 が 20 変異で 8 の穴(40%)、prove-2 が 25 で 13(52%)、
> review-2 が 39 で 14(36%)、prove-3 が 27 で 11(41%)。
> **今回 31%。下がってはいるが、ゼロにはほど遠い。**

### 5.2〜5.11 無音 11 種の triage —— 「無音だが無害」を逃げ道にしない

一件ずつ実挙動を測った(`silent-triage.js` / `silent-triage2.js` / `silent-triage3.js`)。

| # | もし本番でこの変異が起きたら | 実害 | 分類 |
|---|---|---|---|
| **X24** | `baseline` は失敗した創造物に `{slug,error}` を積む(**実在する形**)。error 枝を失うと `renderLedger` が `e.ts.slice` で倒れる。**実測: 実物 exit 0 / 変異版 exit 2 `🔴 Cannot read properties of undefined (reading 'slice')`** —— 一つの壊れた `conclave.json` で `baseline` の画面が丸ごと沈黙する。第55条(e)への裏切り | **あり(実測)** | 【重大】 |
| **X18b** | `compare` が生の列を読むと、**読めない too-deep 行が「最新」として比較に入り答えが変わる**。実測: 実物 `100 → 45 (-55)` / 変異版 `100 → 1 (-99)`。第38条の「前後の数値」が別物にすり替わる | **あり(実測)** | 【重大】 |
| **X19** | memo を大域に持ち上げると、**中身の変わった観測が古い鍵で畳まれ記録が黙って消える**(実測: 正しくは 2 行のところ 1 行)。加えて長寿命プロセス(`pulse serve`)で Map が単調増加し解放されない = リーク。今日の実装は正しいが、**正しさを守る門が一本も無い** | **あり(実測)** | 【重大】 |
| **X20** | `ledgerPath` を一度だけ固定すると、同一プロセスで住所を振り替えても古い倉を読む(実測: 倉2 に振り替えた後も `["A"]`)。`withGaugeSandbox` は毎回 `require.cache` を捨てるので**門は原理的に気づけない** | あり | 【重大】 |
| **X11** | `fp:""` / `fp:0` / `fp:false` を名乗る行が監査を素通りする(実測: 実物 conflicts=1 / 変異版 conflicts=0)。**手編集で fp を空にすれば S-1 の門を回避できる** | あり | 【軽微】 |
| **X8** | 「読めない行が在る」ことは stderr に出るが**どの行かが分からない**(実測: `⚠️ ledger line skipped (too deep, > 64): …`)。台帳を掃除する人が対象行を特定できない | あり | 【軽微】 |
| **X2** | `keyIndex` が keep-last になると、`record` の「既記録」報告が最古でなく**最新の ts を名乗る**(実測: keep-first なら `2026-09-08T13:17:29` のところ `2099-01-01T00:00:00`)。台帳ファイルには一字も書かないので**記録は失われない** | 報告のみ | 【軽微】 |
| **X25** | 荒れた走行(実測 `35/100`)が人の目に **🟢** と映る。機械の判断は数値でなされるので変わらない = 画面だけの嘘 | 画面のみ | 【軽微】 |
| **X14** | 警告文の 64 を 32 と偽っても挙動は変わらない。実害は「台帳を掃除する人が 32 段まで縮めれば通ると信じ、通らない行を作る」。**文言を検める門は存在しない** | 文言のみ | 【好み】 |
| **X5** | `record` が索引不在時に畳んだ台帳から索引を組んでも、**metrics を持つ健全な行は全部残る**ので冪等性は破れない(実測: 二度目も三度目も `skipped=true`)。ただし畳みの O(n log n) を record ごとに払う = **P-2 の再発方向** | 性能のみ | 【軽微】 |
| **H12b** | `finally` が**出口で** cache を捨てるので、次の呼び出しは必ず新鮮な require になる。入口の delete は二重の保険であり、外すだけでは挙動が変わらない = **冗長な一行**。ただし「門の外で誰かが gauge.js を require 済み」の状態(実際 `:2828` で require されている)で最初の門が走ると、その一回だけ古い実装を掴む | 限定的 | 【好み】 |

**11 件中 4 件が【重大】、5 件が【軽微】、2 件が【好み】。「今日は無害」は一件も無かった。**

---

## 6. 私が見つけた欠陥(【致命/重大/軽微/好み】分類・再現手順つき)

### 【重大】D-3 `exit 2` が二つの異なる意味を運んでいる

- **場所**: `graph/gauge.js:700`(audit の exit 2)と `graph/gauge.js:735-738`(`main()` の catch)
- **症状**: P-8 の修理は audit の信号を `0/1/2` に分けた。だが `main()` 全体を包む catch も
  同じ 2 を返す。**「台帳に人が読むべき事故がある」と「引数を間違えた / ファイルが無い」が区別できない。**
- **再現**:
  ```bash
  node graph/gauge.js ledger --audit          # 健全な台帳 → exit 0
  node graph/gauge.js compare coin nosuchslug # → exit 2  「記録なき前後は比較できない」
  node graph/gauge.js score /no/such/file     # → exit 2  ENOENT
  node graph/gauge.js badcommand              # → exit 3  (未知の命令)
  node graph/gauge.js compare --last abc      # → exit 3  (整数でない N)
  ```

> **【この所見は本相の途中で一段重くなった】**
> 本相の作業中、並走する security attempt 3 が `graph/gauge.js` の冒頭に
> **exit code の規約を散文で明文化した**(`git diff graph/gauge.js` は**注釈のみ**・
> 非注釈行の変更はゼロ)。その新しい散文はこう述べる:
>
> ```
> *   3 = 命令・引数の誤り(未知の命令・usage 不足・`--last` が整数でない)。
> ```
>
> **だが機械はそう振る舞っていない。** `score /no/such/file`(引数の誤り)は上のとおり **exit 2** を返す。
> すなわち **散文が約束した規約を、コードが今まさに破っている**。
> D-3 は「信号が曖昧である」から「**明文化された規約に実装が違反している**」に格上げされる。
> 明文化は正しい方向だが、**明文化と同時に門を立てなければ、散文が嘘をつく速度が上がるだけである**
> (第16条 / この環が review-1 の R-1 で学んだはずのこと)。
> **exit code の規約を撃つ門は一本も無い**(私の X10 が鳴らせたのは audit 内部の分岐だけである)。
- **なぜ重いか**: P-8 の修理の**目的そのもの**が「掃除で消せるものと消せないものを
  同じ信号に載せない」ことだった。その分離が `main()` の一段外で崩れている。
  CI が exit 2 を「台帳の汚染」と読む設計なら、タイプミスが汚染として報告される。
- **処置案**: 実行時の誤り(usage / ENOENT / パース失敗)を **exit 3**(既に usage で使われている)
  か新しい **4** に寄せ、**2 を「台帳の事故」に予約する**。門は「`compare` の存在しない slug が
  audit の exit 2 と違う code を返す」を撃てばよい。

### 【重大】D-4 `latestFor` は生の配列を渡されると読めない行を「最新」として返す

- **場所**: `graph/gauge.js:545-548`
- **症状**: 絞りが `e && e.slug === slug && e.metrics` のみ。**too-deep で鍵を導けない行にも
  `metrics` は在る**ので、生の配列を渡すと読めない行が「最新」になる。
- **再現**:
  ```
  latestFor(生の配列)  : too-deep 行を「最新」として返した
  latestFor(畳んだ配列): null
  ```
  X18b(`compare` を生の列に変える)で下流の実害を実証: `100 → 45 (-55)` が `100 → 1 (-99)` になる。
- **なぜ重いか**: `latestFor` は **export された公開関数**(`gauge.js:745`)であり、
  ドキュメント(`gauge.js:538-543`)自身が「`entries` は引数で受ける —— 畳みを通っていない
  配列を渡されうる。ゆえに順序非依存を**関数自身の性質**として持たせる」と宣言している。
  **順序非依存は自前で持ったのに、読めない行の排除は呼び手任せになっている。**
  今日 `compare` が畳んだ列を渡しているのは幸運であって設計ではない。
- **処置案**: `latestFor` の絞りに `trueKey(e) !== null` を足す(関数自身の性質にする)。
  門: 生の配列を `latestFor` に渡して too-deep 行が選ばれないことを撃つ。**この変異は無音だった。**

### 【重大】D-5 `renderLedger` の error 枝を守る門が無い(X24 無音)

- **場所**: `graph/gauge.js:626`
- **症状**: `baseline` は壊れた `conclave.json` を持つ創造物に `{slug, error}` を積む
  (`gauge.js:521` / `:527`)—— **実在する形**である。この枝を落とすと `e.ts.slice` で倒れる。
- **再現**:
  ```bash
  mkdir $SAND/broken && echo '{not json' > $SAND/broken/conclave.json
  PARADISE_CREATIONS=$SAND node graph/gauge.js baseline
  # 実物  : exit 0  「✗ broken: Expected property name or '}' in JSON at position 1」
  # 枝を落とすと: exit 2  「🔴 Cannot read properties of undefined (reading 'slice')」
  ```
- **なぜ重いか**: prove-3 の D2 が「pulse の断面は metrics なし行で倒れない」を立てたが、
  **`gauge.js` 自身の画面には同じ門が無い**。第55条(e)「一行の破損で秤全体を倒さない」が
  下流(pulse)では守られ、源(gauge の画面)では守られていない。
- **処置案**: `baseline` の出力に error 行を混ぜた `renderLedger` を撃つ門を一本。

### 【重大】D-6 memo / `ledgerPath` の「呼び出しを跨いで状態を持たない」性質に門が無い(X19 / X20 無音)

- **場所**: `graph/gauge.js:360`(memo)/ `graph/gauge.js:70`(`ledgerPath`)
- **症状**: 今日の実装は正しい(§4.1 / D-11 で実測)。だが **正しさを守る門が一本も無い。**
  memo を大域に上げても(X19)、`ledgerPath` を固定しても(X20)、105 門は全部緑である。
- **再現(X19)**:
  ```
  1度目 foldLedger([row]) → 1 行
  中身を変えた後 → 1 行  (正しい実装は 2 行 = 別観測)
  ```
- **再現(X20)**:
  ```
  1度目(倉1): ["A"]
  住所を倉2 に振り替えた後: ["A"]   (正しくは ["B"])
  ```
- **なぜ重いか**: `gauge.js:355-358` のコメントは memo について
  「**呼び出しの内側だけで生き、返らない —— 台帳の第二の住所にはならない**」と明言する。
  **散文が約束し、機械が守っていない。** これは review-1 の R-1 が
  「実装コメントが述べる不変量に門が無い」と咎めた病と同型である。
  加えて `withGaugeSandbox` が毎回 `require.cache` を捨てるため、
  **門の作法そのものが X20 を原理的に観測不能にしている** —— これは門の構造的な盲点である。
- **処置案**: (a) 同一オブジェクトの中身を変えて二度畳み、2 行返ることを撃つ門。
  (b) `require.cache` を捨てずに `PARADISE_CREATIONS` を振り替え、`ledgerPath()` が
  追随することを撃つ門(`withGaugeSandbox` の外で書く必要がある)。

### 【軽微】D-7 `fp:""` を名乗る行が監査を素通りする道が守られていない(X11 無音)

- **場所**: `graph/gauge.js:589`。今日の `e.fp != null` は正しい。`e.fp &&` に緩めても無音。
- **再現**: `auditLedger([{...honest, fp: ''}])` → 実物 conflicts=1 / 変異版 conflicts=0。
- **処置案**: `fp:""` の行が `forged-fp` として数えられることを撃つ門を一本。

### 【軽微】D-8 読めない行の**名指し**を守る門が無い(X8 無音)

- **場所**: `graph/gauge.js:435`(`src.set(row, line)`)/ `:445`(警告の本文)
- **症状**: 行テキストを控える一行を消すと、警告が `⚠️ ledger line skipped (too deep, > 64): …`
  になり**どの行か分からなくなる**。P-1 の修理が「名指す」ために足した一行が守られていない。
- **処置案**: 警告文に台帳の行の一部が含まれることを撃つ門(stderr を捕まえる。既存の N14 門の隣)。

### 【軽微】D-9 `keyIndex` の keep-first に門が無い(X2 無音)

- **場所**: `graph/gauge.js:336`。keep-last にすると `record` の「既記録」報告が最新 ts を名乗る。
- **実害の上限**: 台帳ファイルには一字も書かないので**記録は失われない**。報告の ts が最古でないだけ。

### 【軽微】D-10 `record` の索引不在時に生を読む理由に門が無い(X5 無音)

- **場所**: `graph/gauge.js:485`。畳み済みに変えても冪等性は破れない(実測)が、
  **畳みの O(n log n) を record ごとに払う = P-2 の再発方向**。性能の門は無い。

### 【好み】D-11 警告文の数字に門が無い(X14 無音)/ 入口の cache 削除は冗長(H12b 無音)

- 前者は文言のみ、後者は二重の保険。どちらも実挙動を変えない。**門を足す価値は低い。**

### 【好み】D-12 `renderScore` の信号色に門が無い(X25 無音)

- 荒れた走行(35/100)が 🟢 と映るが、機械の判断は数値でなされる。画面だけの嘘。

---

## 7. 私が見たが穴が無かったもの(緑で埋めない — 見た上で健全だったもの)

`probe-new.js` で撃ち、**実際に健全だった**もの。「見ていない」と区別して書く。

| # | 撃った筋 | 実測結果 |
|---|---|---|
| D-6 | 同一 ts の 500 行を 5 回 shuffle | **列は不変**(tie-break 第二段が効いている) |
| D-7 | Unicode: NFC/NFD の slug、ゼロ幅入り slug | **別鍵**として残る(黙って畳まない側に倒れている) |
| D-8 | 数の境界: `2^53` / `1e21` / `MAX_SAFE_INTEGER` | `1e21` と `MAX_SAFE_INTEGER±1` は**別鍵**。`2^53` と `2^53+1` は同一鍵だが**これは IEEE754 の性質**であり実装の欠陥ではない。`1e-7` 台は `toFixed(6)` で 0 に丸まる —— **原理的な限界**であり `gauge.js:216` が明示している |
| D-9 | BigInt / Symbol / 関数 | BigInt は `null` に潰れる(`canonical` の最終行)。**`JSON.parse` は BigInt を生まないので台帳には現れない**。Symbol 鍵は `Object.keys` に現れず指紋に影響しない |
| D-10 | `__proto__` を持つ行(台帳に平文で書ける) | **汚染なし**。`JSON.parse` は `__proto__` を無害な自前鍵にする。`Object.prototype.polluted === undefined` |
| D-11 | 同一プロセスでの住所振替 | `readLedger` は**新しい倉を見る**(`workspace.resolve()` が毎回 env を読む) |
| D-13 | BOM / CRLF / 空ファイル | BOM 行は破損として**名指して**読み飛ばす。CRLF 行は読める。空ファイルは 0 行 / exit 0 |

### 7.1 発見: 台帳の読みは truncate 中に「空」に見える(実測・**欠陥ではないが記録する**)

実台帳の複製で 300 回試した:

```
300 回中 空に見えた: 100  途中に見えた: 0
```

**`gauge.js` 自身に truncate 経路は無い**(`record` は append のみ: `gauge.js:495`)。
唯一の truncate→write は **FR-8 の掃除**(`design.md:559` の `fs.writeFileSync(p, …)`)である。
掃除の最中に誰かが `ledger` を読めば「空」と表示されうる。
掃除は人が一度だけ手で走らせる creations 側の別 PR(AC-8d)なので**今日の実害は無い**が、
**掃除スクリプトは一時ファイルへ書いて `rename` で置き換えるべきである**(原子的置換)。
→ **【軽微】D-13** として立てる。処置は本相の射程外(creations 側)。

---

## 8. 裁定 —— この環を閉じてよいか

### 【なお直すべき】

ただし、**差し戻しの理由は前三回とは質が違う**。正直に区別して書く。

#### 8.1 治っているもの(私が自分で再現して確かめた)

- **P-1 は四面すべて治癒**(§1)。`raw` は生を返し、audit は too-deep を数えて名指し exit 2 で鳴り、
  掃除の材料から深い行は消えず、画面は読み飛ばしを重複に混ぜない。**壊すと 10 門が鳴る。**
- **P-2 は治癒**(§2)。review-2 実測の 602ms が 34ms(約 x18 の回復)。
  **かつ高速化が冪等性を壊していない**(baseline 二度目は +0 行 / 20 件すべて skipped)。
- **P-3 は治癒**(§3)。ヘルパーを実際に 10 通り壊し、**9 で門が鳴った**。
  最も重かった「`prev || tmp` で門が実台帳を見る」は **21 門**が鳴る。
- **「修理が新たな病を生んだか」という最重要の問い**については、**核心部分では生んでいない**(§4)。
  memo は呼び出しを跨がず、索引の staleness は二重防御が拾い、住所はキャッシュされていない。
  **この環で三度繰り返された「修理が次の病を生む」連鎖は、今回は起きていない。**

#### 8.2 なお直すべきもの

**致命は無い。** 記録が失われる道も、冪等性が破れる道も、実台帳が汚れる道も見つからなかった。
だが **【重大】が 4 件**あり、うち **2 件は実測で挙動の壊れを示した**:

| # | 欠陥 | 実測の証拠 |
|---|---|---|
| D-3 | **明文化された exit code の規約に実装が違反している** | 散文が「3 = 引数の誤り」と書いた直後に `score /no/such/file` が **exit 2** |
| D-4 | `latestFor` が生の配列で読めない行を「最新」に選ぶ | 比較の答えが `-55` から `-99` に変わる |
| D-5 | `renderLedger` の error 枝に門が無い | 枝を落とすと `baseline` が exit 2 で倒れる |
| D-6 | memo / `ledgerPath` の「状態を持たない」性質に門が無い | 大域化しても固定しても 105 門が全部緑 |

**D-3 と D-4 は実装の欠陥**(門を足すだけでは消えない)。
**D-5 と D-6 は門の欠陥**(実装は正しいが、正しさが機械に守られていない)。

#### 8.3 なぜ「閉じてよい」と言わないのか —— この環の履歴が根拠である

無音率の推移: **40% → 52% → 36% → 41% → 31%(本相)**。
五回連続で、**新しい目が新しい穴を見つけている**。下がってはいるが収束していない。
「私の 36 番目の変異が素通りしない」と主張する根拠は無い。

とくに **D-6 は構造的である**。`withGaugeSandbox` が毎回 `require.cache` を捨てる作法は
門の独立性のために正しいが、**その作法自体が「モジュール大域の状態」を観測不能にしている**。
prove-3 が「T2 は走行器の緑/赤では原理的に観測できない」と書いた盲点と同じ種類のものが、
**門の作法の側にもう一つ在る**ということである。これは変異を足して埋まる穴ではなく、
**門の書き方を一段変えないと見えない層**である。

#### 8.4 それでも、この環は前三回とは違う

前三回の差し戻しは **「修理が次の病を生んだ」**(S-2 → P-1)か
**「約束した機能が達成不能だった」**(R-2 の鳴りっぱなしの門)だった。
今回私が見つけたのは **その連鎖ではない**。核心(冪等性・記録の不滅・実台帳の不可侵)は
私が撃った範囲では健全であり、残るのは**周縁の信号と門の網目**である。

ゆえに私の裁定は「**神に差し出す前に、あと一巡**」であって
「**設計からやり直せ**」ではない。**D-3 / D-4 の実装二点を直し、
D-5 / D-6 の門四本を足せば、私はこの環を閉じてよいと考える。**

#### 8.5 次に打つべき手(優先順)

1. **D-4**: `latestFor` の絞りに `trueKey(e) !== null` を足す + 生の配列での門(実装 + 門)
2. **D-3**: `main()` の catch を exit 2 から分離し、2 を「台帳の事故」に予約する(実装 + 門)
3. **D-5**: `renderLedger` に error 行を混ぜて撃つ門(門のみ)
4. **D-6**: memo の呼び出し間独立性 / `ledgerPath` の env 追随を撃つ門
   (**`withGaugeSandbox` の外で書く必要がある** —— ここが技巧を要する)
5. **D-7 / D-8 / D-9 / D-10**: 【軽微】4 件の門(`fp:""` / 名指し / keep-first / 索引の生読み)
6. **D-13**: FR-8 の掃除スクリプトを一時ファイル + `rename` に(creations 側・本相の射程外)

---

## 9. 私が測っていないもの(第16条 — 緑で埋めない)

1. **走行器は gauge 節 105 門だけを撃つ。** 全体 433 門は約 6 分で、35 変異 × 走行は現実的でない。
   **gauge 節の外の門が今回の 35 変異で鳴る可能性は測っていない。**
   (ただし基線としての全体走行は別途走らせた —— §10)
2. **私が思いつかなかった変異については何も言えない。** 31% が漏れたという事実が残余の大きさを示す。
3. **AC-8c(creations の git 履歴不変)/ AC-8d(paradise 側 PR に台帳が現れない)/ NFR-3(指紋の CLI 確認)**
   —— prove-3 §3.2 が「門が無い」と名指したものを、私は**追加で確かめていない**。無いままである。
4. **並行性は同一プロセス内の擬似的な重なりでしか撃っていない。**
   本物の複数プロセスが同時に `record` する道(ファイルロック無し)は測っていない。
   `appendFileSync` は POSIX では原子的だが **Windows での保証は確かめていない**。
5. **性能は私の一台での実測**であり、CI の機や creations が 10^5 行に育った場合は測っていない。
6. **`pulse serve` を長時間走らせてのメモリ実測はしていない。** X19 のリーク論は
   「大域化すれば単調増加する」という構造の指摘であって、**今日の実装での実測ではない**
   (今日の実装は関数スコープなのでリークしない、と §4.1 で確かめた)。

---

## 10. 規律の証明(木の清潔)

```
$ git status --short          # 本相の**開始時**
 M reform/gauge-ledger-idempotent/conclave.json     ← 本相の入力時点で既に M(走行帳)

$ git status --short          # 本相の**終了時**
 M README.md                                        ← ★ 私ではない(§10.1)
 M graph/gauge.js                                   ← ★ 私ではない(§10.1)
 M reform/gauge-ledger-idempotent/README.md         ← ★ 私ではない(§10.1)
 M reform/gauge-ledger-idempotent/conclave.json     ← 開始時から M
?? reform/gauge-ledger-idempotent/review-3.md       ← 本報告(私が置いた唯一のファイル)
?? reform/gauge-ledger-idempotent/security-report-3.md  ← ★ 私ではない(§10.1)

$ sha256sum tests/paradise.test.js
3b4e20bb939f0414ed4f48f52b06b01082d3e4a02b1f39f304a04f4596850560 *tests/paradise.test.js
   ↑ 作業開始時に採った値と完全一致 = 私の門への変異は一つも実物に残っていない

$ sha256sum ../paradise-creations/gauge-ledger.jsonl
387d9e0ea5a4fde30249897ebba3d53150e39a32cbf1e4299d922674bcb9982b   30 行
   ↑ 作業前と一致。前任が汚した 19 行の再発は無い

$ node tests/paradise.test.js
Paradise self-test: 433 passed, 0 failed        EXIT=0
PRE =387d9e0ea5a4fde30249897ebba3d53150e39a32cbf1e4299d922674bcb9982b
POST=387d9e0ea5a4fde30249897ebba3d53150e39a32cbf1e4299d922674bcb9982b
   ↑ 全体走行の前後でも実台帳は一バイトも動かない(AC-9c の門が効いている)
```

### 10.1 私の作業木ではない変更が在る —— 正直に書く(第16条)

本相の**開始時**、`git status` は `M conclave.json` の一行だけだった。
**終了時には 4 つの M と 2 つの ?? がある。** そのうち **私が置いたのは `review-3.md` ただ一つ**である。

`graph/gauge.js` は開始時 `c8acd18a…`、終了時 `33a3d130…` に変わっている。
**私が変えたのではない**(私の変異はすべて `$LOCALAPPDATA/Temp/gr3/` の複製に対して行い、
各注入器が sha256 の一致を検算している)。差分を検めた:

```
$ git diff -U0 graph/gauge.js | grep -E "^[+-]" | grep -v "^[+-][+-]" | grep -vE "^[+-]\s*\*|^[+-]\s*//|^[+-]\s*$"
(出力なし)
```

**非注釈行の変更はゼロ = 注釈のみの変更である。** `security-report-3.md` が同時に現れたことから、
**並走している security attempt 3 の作業**と判断する。
すなわち **本相の測定対象(実装の挙動)は私の走行中に変わっていない** ——
私が撃った 35 変異と 13 の筋の実測値は、いずれも今日の実装の挙動を正しく写している。

**ただし正直に述べる**: 私の走行器の基線(105 門)と 35 変異の走行は、
この注釈変更が入る**前**の `c8acd18a…` に対して実施した。
最後の全体走行(433 passed / 0 failed)は**後**の `33a3d130…` に対してである。
注釈のみの変更なので挙動は同一のはずだが、**私は変更後の実装に対して 35 変異を撃ち直していない。**

そしてこの並走が、**D-3 を一段重い所見に変えた**(§6 D-3 の囲み)。
新しく書かれた exit code の規約を、実装が既に破っているからである。

- **main に commit していない**(作業はすべて `fix/gauge-ledger-idempotent` の作業木の読み取りと、
  `$LOCALAPPDATA/Temp/gr3/` の使い捨て複製に対する変異である)。
- **push / PR していない。**
- **`../paradise-creations` を触っていない**(読み取りと sha256 のみ)。
- 補助具(`harness.js` / `mutate-*.js` / `verify-p*.js` / `silent-triage*.js` / `probe-new.js` /
  `runner-*.js`)は `$LOCALAPPDATA/Temp/gr3/` に置き、**リポジトリに一つも持ち込んでいない**。
- **実装を自分で直していない**(レビュー相の掟)。処置案は書いたが、コードは一行も変えていない。

---

## 11. 本相で走らせた命令の全一覧(再現用)

```bash
# 0. 基線と規律の錠
sha256sum ../paradise-creations/gauge-ledger.jsonl        # 387d9e0e… / 30 行
sha256sum graph/gauge.js tests/paradise.test.js           # 作業前の値を控える
node tests/paradise.test.js                               # 全体走行(基線)

# 1. P-1 / P-2 の治癒を自分で再現
node $TMP/verify-p1.js        # raw / audit / 掃除の材料 / 画面 の四面
node $TMP/verify-p2.js        # foldLedger N=5000,20000 / baseline N=4000 × M=20

# 2. 走行器の基線
node $TMP/harness.js          # マーカーで gauge 節を切り出す → 105 passed, 0 failed (5.9s)

# 3. 修理が生んだ新たな病を探す(13 の筋)
node $TMP/probe-new.js        # 索引 staleness / memo 寿命 / exit code / too-deep の compare /
                              # 時刻逆行 / 同一 ts 500 行 / Unicode / 数の境界 / BigInt /
                              # __proto__ / 住所振替 / 並行 record / BOM・CRLF

# 4. 新規 35 変異
node $TMP/mutate-x.js         # X2-X17 (18 種、うち 2 空振り)
node $TMP/mutate-y.js         # X1, X19-X23 (再入・書き・境界)
node $TMP/mutate-z.js         # X18b, X24, X25 (下流・画面)
node $TMP/mutate-helpers.js   # H1-H13 (門ヘルパー)
node $TMP/mutate-helpers-b.js # H4b, H8b, H11b, H12b, H14 (撃ち直し + 新規)

# 5. 無音 11 種の triage(実挙動で実害を測る)
node $TMP/silent-triage.js    # X2 / X5 / X8 / X11 / X14
node $TMP/silent-triage2.js   # X19 / X20 / H4 / H8
node $TMP/silent-triage3.js   # X18b / X24 / X25 / H12b

# 6. 実台帳に対する読み取り専用の道(書かないことの確認)
node graph/gauge.js ledger                    # raw 30 行 / 重複 24 行を畳んだ
node graph/gauge.js ledger --audit            # rows=30 distinct=6 duplicates=24 conflicts=0 too-deep=0 → exit 1
sha256sum ../paradise-creations/gauge-ledger.jsonl   # 387d9e0e… 不変

# 7. 後始末の証明
git status --short && sha256sum graph/gauge.js tests/paradise.test.js
```
