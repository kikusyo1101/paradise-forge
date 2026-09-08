# REVIEW attempt 2 — gauge 台帳の冪等化 (gauge-ledger-idempotent)

- 相: **REVIEW(コードレビュー / attempt 2)**。仕事は二つ ——
  **① 前任(review attempt 1)と監査役(security)の指摘が本当に治ったかを自分で再現して検める**、
  **② 修理が新たに持ち込んだ欠陥と、門の残る盲点を自分の変異で暴く**。
- 起点: 枝 `fix/gauge-ledger-idempotent` / HEAD **`67b1064`** / `git diff main...HEAD` = 13 files, +4956 / −14
  (中核: `graph/gauge.js` +316 / `tests/paradise.test.js` +1181 / `CONSTITUTION.md` +59)。
- 実測環境: `node -v` → **v24.14.0** / Windows(git-bash)。
- **注**: 本相の走行中に他の相が枝を `b57f190`(「文書を実態に合わせる」)まで進めた。
  `git diff --stat 67b1064..HEAD -- graph/ tests/` は**空**であり、
  **私がレビューした実装と門は一バイトも変わっていない**(変わったのは README / conclave.json のみ)。
  本書の全判定は `b57f190` にもそのまま当てはまる。
- **本相では `graph/gauge.js` / `tests/paradise.test.js` を恒久的に一行も変更していない。**
  変異は 39 種すべて注入 → 走行 → `git checkout --` → **バイト一致を注入器が毎回検算**(不一致なら `exit 2`)。
  最終の `git status --short` を §9 に貼る。
- **見ていないものを緑で埋めない(第16条)。** 測っていない項目は §8 に名指しで残す。

---

## 0. 総評

**前任の R-1〜R-3、監査役の S-1〜S-3 は、私が自分で再現を試みた範囲で**
**すべて実際に治っている。半分だけの治癒は一件も見つからなかった。**
S-1 は読み側(`foldLedger` / `auditLedger`)だけでなく書き側(`record`)も塞がっており、
前例(「S-1 の書き側 N9 が残っていた」)の再発は無い —— これは私が偽の `fp` を実際に書いて確かめた(§1.4)。

しかし **治癒は代償を払っている**。`trueKey` の常時再導出は正しい判断だが、
**`foldLedger` を 24〜29 倍、`record` を 7〜8 倍遅くしている**(実測 §2.1)。
前任が R-3 として名指した「`record` の O(n) 全走査」は**治っておらず、係数が一桁悪化した**。
これは新しい欠陥ではなく、**前任の指摘のうち唯一手つかずのもの**である。

そして **S-2 の修理は新しい欠陥を二つ産んだ**:
`readLedger` の too-deep 読み飛ばしが `opts.raw` の**前**に置かれたため(`gauge.js:362-370`)、
① **`readLedger({raw:true})` はもはや「生の全行」ではない**(security-report:87 の「`raw:true` で回収できる」が
今日は成立しない)、② **`auditLedger` の `too-deep` 枝は CLI 経路から構造的に到達不能**であり、
台帳の全行が深すぎて捨てられていても `--audit` は `rows=0 … exit 0` = 「健全」と答える(§3.1)。
どちらも**門は緑のまま**である。門が `foldLedger` / `auditLedger` を直接呼んで撃っているためで、
**人が歩く道(CLI)を撃った門がここに無い**。

門の質は前回・前々回より明確に上がった。私が発明した **39 変異のうち 25 が鳴り、14 が無音**である。
prove attempt 2 は「自分が打った 25 変異の範囲で無音ゼロ」と主張したが、
**その主張は私の 39 変異では保たれなかった**(prove が謙虚に「26 番目が素通りする可能性は残る」と
書いたとおりである)。無音 14 のうち **11 は実害のある本物の欠陥**で、3 は今日は無害だが将来の罠である。

| 重大度 | 件数 | 概要 |
|---|---:|---|
| **致命** | **0** | — |
| **重大** | **3** | **P-1** `raw:true` が生でなくなり FR-8 の掃除が深い行を永久に消す + audit の too-deep 枝が到達不能 / **P-2** `trueKey` 常時再導出の性能代償(fold 24〜29x・record 7〜8x。R-3 は未治癒) / **P-3** 門の無音 14 種(うち実害 11)—— 特に**門ヘルパー自身を守る門が一本も無い** |
| 軽微 | 5 | P-4 `metrics` なし行が複数あると `foldLedger` は順序依存(AC-4a の主張の外) / P-5 R-7 の死んだコードが残存 / P-6 R-8 の二度読みが残存(警告が 6 回出る) / P-7 R-4 の fail-open は依然として成立しない / P-8 audit の exit code が「掃除できる欠陥」と「人が読むべき事故」を同じ 1 で返す |
| 好み | 3 | P-9 R-10(CI に `--audit` の口が無い)が未着手 / P-10 `MAX_CANONICAL_DEPTH=64` の根拠は実測と一致するが門が「64」という値を固定していない / P-11 `renderLedger` の `e.ts.slice` は依然として `ts` 欠落で倒れる(main 由来・射程外) |

**自明な誤植・壊れた参照は一件も見つからなかったので、微修正も行っていない。**

---

## 0.1 私が走らせた命令と実出力(これ以外を根拠にしていない)

```
$ node -v                                    → v24.14.0
$ git log --oneline -1                       → 67b1064
$ node tests/paradise.test.js | tail -1
Paradise self-test: 394 passed, 0 failed     ← 二度走らせて二度とも同じ

$ node <gauge 節 2826-4170 を切り出した独立走行器>
GAUGE-RUNNER passed=66 failed=0               ← 変異の基線(gauge + verdict 契約の 66 門)

$ node tests/dashboard-count.test.js          → dashboard-count: 15 passed, 0 failed
$ node tests/dashboard-run-panel.test.js      → dashboard-run-panel: 16 passed, 0 failed
$ node graph/codex.js article 55              → exit 0(第55条 (a)〜(g) を全文確認)
$ node graph/gauge.js ledger --audit          (実台帳)
📒 rows=30 distinct=6 duplicates=24 conflicts=0
exit=1                                        ★ 前回の「conflicts=1」が 0 になった = R-5/R-2 の治癒
```

**実台帳は一字も書いていない。** 全実験は `%LOCALAPPDATA%/Temp/` 配下のネイティブ `C:/` 形式の仮倉で行った。
`sha256(../paradise-creations/gauge-ledger.jsonl)` は本相の前後で不変:
`387d9e0ea5a4fde30249897ebba3d53150e39a32cbf1e4299d922674bcb9982b` / 30 行。
兄弟倉の `git status` は ` M gauge-ledger.jsonl`(**本相の開始前から在る他者の未コミット汚染**。私は触っていない)、
HEAD は `f826371` のまま。

### 0.1.1 走行環境の落とし穴(第16条 — 自分の測り間違いを正直に記す)

私の shell に前任の相が残した **`PARADISE_CREATIONS=C:/Users/kikus/AppData/Local/Temp/sec2/f1`** が
生きており、最初に撃った `dashboard-run-panel` が **14 passed, 2 failed** と出た。
`main` の worktree でも同じ 14/2 が出たため「main から赤」と一度は判定しかけたが、
**原因は改修ではなく私の環境変数だった**。`unset PARADISE_CREATIONS` の後に再測して **16 passed, 0 failed**。
落ちていた 2 門は `D-3(故障注入)` で、**兄弟倉が見えないと素材が無い**という構造(`SIBLING` 分岐)による。
- **この改修の欠陥ではない。** 誤った赤を報告しかけたことをここに残す。
- ただしこれ自体が **P-3 の一例**でもある: 門の一部は `PARADISE_CREATIONS` の値に振る舞いを変えるのに、
  **「環境変数が汚れていたら鳴る」門は無い**。私が偶然気づいただけである。

---

## 1. 前任の指摘の治癒 —— 一件ずつ自分で再現を試みた

### 1.1 R-1(門の穴 8 件: M2/M3/M4/M6/M7/M11/M15/M17)→ **治癒。実測で確認**

門の名前だけを数えるのは第16条違反なので、**変異を撃ち直して鳴ることを確かめた**。

| 前任の変異 | 立った門(`tests/paradise.test.js`) | 私の再検定 |
|---|---|---|
| M2(非有限を `'0'` に) | `非有限は null であって 0 ではない (R-1/M2 / 第16条)` :3626 | 🔔 |
| M3/M4(`-0` / 丸め) | `-0 は 0 に畳まれ、丸めが浮動小数の揺れを吸う (R-1/M3・M4)` :3639 | 🔔 **K4 で実証**(§4) |
| M6(tie-break) | `同時刻の 2 行でも畳みの列が決定的 (R-1/M6 / FR-4)` :3650 | 🔔 |
| M7(行落ち) | `metrics を持たない行は畳みで落ちない (R-1/M7)` :3745 | 🔔 |
| M11(`fp` を材料に) | `fp は指紋の材料に入らない (R-1/M11 / AC-5c の成立条件)` :3665 | 🔔 |
| M15/M17 | `読めない台帳で record は…(N10)` :3879 / `矛盾は判別可能な信号で(AC-7b)` :3433 | 🔔 |

さらに `gauge(故障注入): M2/M3/M4/M6/M11 の各変異で門が exit 1 で鳴る (R-1)` :3686 が
**5 変異を子プロセスで撃って exit code を実測**している。私の複合変異 K4 が
この注入門を「注入箇所が見つからない」で鳴らしたことは、**注入門が実装の形の変化を検知する装置として生きている**証拠である。

**判定: 治癒。半分だけの治癒ではない。**

### 1.2 R-2(`--audit` が掃除後も鳴り続ける)→ **治癒。実測で確認**

矛盾の定義が「同一 slug で metrics が食い違う」→「**行が名乗る鍵と中身から導かれる鍵の食い違い**」に
正された(`gauge.js:479-505`)。第55条(d) にもその文が入っている(`codex.js article 55` で全文確認)。

**再現手順と実出力**(実台帳を畳んだ 6 行を仮倉に置いて撃った):
```
掃除後(畳んだ 6 行)  exit=0  📒 rows=6 distinct=6 duplicates=0 conflicts=0   ★ 前回は exit 1
掃除前(生 30 行)     exit=1  📒 rows=30 distinct=6 duplicates=24 conflicts=0
```
`requirements.md:318`(「現実台帳に対し非ゼロ、畳んだ6行に対し exit 0」)と `design.md:565` の約束が
**両方とも実際に満たされた**。門 `掃除後の台帳(改善 80→100 を含む)は exit 0 (R-2 / NFR-2)` :3475 が守る。

**判定: 治癒。** ただし exit code の**意味**にはまだ問題がある → P-8。

### 1.3 R-3(`record` が O(n) 全走査)→ **治っていない。むしろ悪化した**

`record` は依然として `readLedger({raw:true})` で台帳を全部読む(`gauge.js:399`)。
前任が提案した「`baseline` が fp 集合を一度だけ作る」は**採られていない**。
そして `e.fp || fingerprint(e)` → `trueKey(e)`(常時 sha256)の変更により、**一行あたりの係数が悪化した**。

詳細は §2.1(P-2)。**判定: 未治癒。前任の 5 件の重大/軽微指摘のうち、唯一手つかずのもの。**

### 1.4 S-1(`fp` は検証されない自己申告)→ **読み側・書き側とも治癒。実測で確認**

**読み側**(前任の監査役が実測した「score:99 が黙って消える」を私が撃ち直した):
```
$ node -e "偽の fp を載せた別観測 (score 10 と 99) を foldLedger / auditLedger に通す"
投入2行 -> 畳み後 2 行                     ★ 前回は 1 行(99 が消えた)
残った scores: [10,99]
audit: {"rows":2,"distinct":2,"duplicates":0,"conflicts":1}
conflict kinds: ["forged-fp"]              ★ 前回は「重複」と誤分類して沈黙
```

**書き側**(前例で残っていた N9 の口。ここを重点的に検めた):
`gauge.js:402` が `if (trueKey(e) === entry.fp)` と**再導出して突き合わせている**。
`e.fp` を読む箇所は `gauge.js` 全体で **`ledger --audit` の名指し表示(:498)と `record` の印字だけ**であり、
**判断に使う経路は一つも残っていない**。門 `record は行の自己申告 fp を信じない (N9 / S-1 の書き側)` :3859 が守る。

**私の複合変異 K2**(`trueKey` を `e.fp || fingerprint(e)` に戻す + `record` が `fp` を書かない)は
**10 門を鳴らした** —— S-1 の再発は構造的に不可能になっている。

**判定: 治癒。半分ではない。** 第55条(g) に「格納された鍵を判断に用いてはならない」が明文で入った点も確認した。

### 1.5 S-2(`canonical` の無制限再帰)→ **治癒。ただし代償あり(→ P-1)**

深さ 50000・300KB の一行を仮倉に置いて撃った実出力:
```
readLedger OK rows= 1 ["coin"]          ← 前回は RangeError で倒れた
raw OK rows= 1
pulse.snapshot OK ledger rows= 1        ← ダッシュボードも巻き添えにならない
```
`MAX_CANONICAL_DEPTH = 64`(`gauge.js:223`)と `GAUGE_TOO_DEEP` の判別可能な標識で、
「握り潰さず名指して読み飛ばす」という設計どおりに動く。**判定: 治癒。**

**底 64 は実在の metrics を巻き込まないか —— 実測した**(タスクの明示的な指示):
```
実台帳 30 行:  entry 全体の最大深度 = 2   metrics 部分の最大深度 = 1
score() が返す metrics: 深さ 1 / 鍵 17 個 / 値の型は number と boolean のみ
実在の 9 走行を採点しても undefined を取る鍵は 一つも無し
64 に対する余裕: entry で 62 段
```
**巻き込まない。** 現実の 32 倍の余裕がある。門 `深さの底は現実の入れ子を巻き込まない (N3)` :3769 が
**底を絞る方向**を守っており、私の V13(底を 3 に)/ K5(底を 2 に)は両方とも鳴った。

### 1.6 S-3(「指紋は真正性の証明ではない」の明文化)→ **治癒**

第55条に **(g)** が新設され、`codex.js article 55` の出力に
「**指紋は同一性の鍵であって、真正性の証明ではない**」「`sha256` を用いるのは鍵の衝突を避けるためであって、
改竄を検知するためではない」が実在する。**S-1 の実装修正とセットで入っている。判定: 治癒。**

### 1.7 前任の軽微 R-4〜R-8 の現況(自分で撃った)

| 前任 | 現況 | 実出力 |
|---|---|---|
| **R-4** fail-open が実際には成立しない | **未治癒**(害は無い) | 台帳の位置をディレクトリにして `record`: `⚠️ ledger unreadable, recording anyway: EISDIR` の直後に `🔴 EISDIR … write` で **exit 2**。catch は「重複検査を諦める」効果しか無い。→ **P-7** |
| **R-5** audit が正当な改善を矛盾と呼ぶ | **治癒** | 正当な改善 2 行 → `exit 0 conflicts=0`(§1.2) |
| **R-6** `raw:` 名前空間の衝突 | **治癒** | `foldLedger([{slug,error},{fp:"raw:0"}]).length = 2`(正しい)。`keep` の鍵空間から `passthrough` 配列へ分離された(`gauge.js:322,328`) |
| **R-7** `auditLedger` の死んだコード | **未治癒** | `gauge.js:493-494` が `byFp.get(fp).push(e)` するが、**読む箇所は 0 件**。使うのは `byFp.size`(:504)だけ。→ **P-5** |
| **R-8** `ledger` が台帳を二度読む | **未治癒** | `gauge.js:592-593`。破損 3 行の台帳で `⚠️ line skipped (corrupt)` が **`ledger` で 6 回 / `--audit` で 3 回**。→ **P-6** |

---

## 2. 修理が持ち込んだ欠陥 —— 性能

### 【重大】P-2 `trueKey` の常時再導出が畳みを 24〜29 倍、`record` を 7〜8 倍遅くした

**ファイル**: `graph/gauge.js:295-301`(`trueKey`)、`:323`(`foldLedger`)、`:332`(tie-break)、
`:399-402`(`record`)、`:485`(`auditLedger`)。

**S-1 を閉じるために `e.fp || fingerprint(e)` を捨てたのは正しい。** 私はこの判断を支持する。
だが**代償が測られていない**。`design.md` にも `prove-report.md` にもこの数字は無い。

**再現手順**(旧実装 `5278887:graph/gauge.js` を仮倉に取り出し、同一素材で A/B):
```
=== foldLedger: 全行が fp を持つ台帳(実運用が向かう姿)===
  N=  2000  旧(短絡あり)=   1ms   新(常時再導出)=  10ms   倍率 x10.0
  N=  8000  旧(短絡あり)=   1ms   新(常時再導出)=  29ms   倍率 x29.0
  N= 20000  旧(短絡あり)=   3ms   新(常時再導出)=  72ms   倍率 x24.0
=== record: 台帳 N 行(全行 fp あり)に 10 件 record ===
  N=  1000 旧 =  22ms   新 =  99ms
  N=  4000 旧 =  53ms   新 = 347ms
  N= 10000 旧 = 110ms   新 = 819ms
```

**そして R-3 は治っていない。** `record` は台帳の行数に比例し、`baseline` はそれを創造物の数だけ繰り返す:
```
  ledger N=  500 / record x20 =   85ms  (1件  4.3ms)
  ledger N= 1000 / record x20 =  147ms  (1件  7.3ms)
  ledger N= 2000 / record x20 =  277ms  (1件 13.8ms)
  ledger N= 4000 / record x20 =  534ms  (1件 26.7ms)   ← N に正比例
```

**なぜ重大か**:
- `requirements.md:175` が想定する **10^3〜10^4 行**の領域で、`baseline`(M 創造物 × N 行)は
  **O(M·N·sha256)** になる。10^4 行 × 10 創造物で数秒〜十数秒。
- **設計が「性能: `fingerprint` は sha256 一回。実台帳規模(10^4 行)で無視できる」と
  コメントに書いている(`gauge.js:292`)が、その主張を裏づける測定がどこにも無い。**
  私の実測では 10^4 行の `record` 10 回で 819ms —— 「無視できる」とは言い切れない。
- **`fp` を entry に書く意味が実質的に消えた。** 判断に使わないなら、それは人が目で読む注記であり、
  第55条(a)「鍵は entry 自身の中に住む」の実利(読み時の短絡)は失われている。これは設計の再検討に値する。

**緩和(実装しない。BUILD の裁量)**:
- `foldLedger` / `auditLedger` 内に `WeakMap<entry, key>` のメモを持つ(同一 entry を tie-break で二度導出しない)。
  現状 `:323` と `:332` で**同じ行の鍵を二度計算している**。sort の比較子は O(n log n) 回呼ばれる。
- `record` は既存 fp の **`Set`** しか要らない。`baseline` が一度だけ組んで使い回せば O(M+N)。第30条にも NG-8 にも触れない(メモリ上の集合であってファイルではない)。
- **どちらも S-1 を再発させない** —— 集合の中身は「再導出した鍵」であって自己申告ではない。

---

## 3. 修理が持ち込んだ欠陥 —— S-2 の底が産んだ二つの穴

### 【重大】P-1 `readLedger({raw:true})` はもはや「生の全行」ではない / audit の `too-deep` 枝は CLI から到達不能

**ファイル**: `graph/gauge.js:362-370`。

```js
    if (row && typeof row === 'object' && row.metrics && trueKey(row) === null) {
      console.error(`⚠️ ledger line skipped (too deep, > ${MAX_CANONICAL_DEPTH}): …`);
      continue;                                  // ★ ここで捨てる
    }
    out.push(row);
  }
  if (opts.raw) return out;                      // ★ 捨てた「後」に raw が分岐する
```

**too-deep の読み飛ばしが `opts.raw` の前に置かれている。** 帰結が三つある。

**① `raw:true` の契約が破れた。** `gauge.js:346` は「生の全行が要る者には `readLedger({ raw: true })` を残す
(**監査・掃除・後方互換**)」と宣言する。security-report:87 も
「ファイル上の生の行は残っており、`readLedger({raw:true})` で回収できる」と S-1 を致命に上げない理由にしている。
**今日はどちらも成立しない。**

再現(ファイル 2 行、うち 1 行が深さ 200):
```
ファイル行数 = 2 / readLedger({raw:true}).length = 1    ← 生を名乗る道が行を落としている
```

**② `auditLedger` の `too-deep` 枝(`gauge.js:487-491`)は CLI 経路から到達不能である。**
`ledger --audit` は `auditLedger(readLedger({ raw: true }))`(`:581`)で呼ぶが、
`readLedger` が既に深い行を捨てているので `trueKey(e) === null` は**決して起きない**。

再現(ファイル 3 行、全部 too-deep):
```
$ gauge.js ledger --audit
📒 rows=0 distinct=0 duplicates=0 conflicts=0
exit=0                        ★ 台帳の全行が捨てられているのに「健全」
「深すぎて」の語が出たか: false
```
一方、`auditLedger` に**直接**深い行を渡せば `kinds: ["too-deep"]` が返る ——
つまり **門(`audit は深すぎる行を「重複」と数えない (N11)` :3897)は緑だが、人が歩く道では死んでいる。**
門が `gauge.auditLedger([...])` を直接呼んでいるためである。

**③ FR-8 の掃除が深い行を永久に消す。** `design.md:565,585` が定める掃除は
「畳んだ版で台帳を置き換える」である。畳んだ版に深い行は入らないので、
**掃除を実行した瞬間に、読み飛ばされていただけの行がファイルからも消える**。
再現(3 行のうち 1 行が深い):
```
掃除前のファイル行数 = 3
readLedger({raw:true}).length = 2     ← 掃除の素材
readLedger().length          = 2
→ 掃除後の台帳は 2 行。深い行は永久に消える
```
第55条(e)「**削除・切り詰めの経路を台帳に一つも足さない**」「台帳の第一の徳は記録が失われないこと」に
正面から触れる。engine が消すのではなく**人が掃除の手順に従うと消える**という形なので致命ではないが、
`gauge.js` に `writeFileSync` が無いことを門(`AC-1c` :3107)が誇っているのと同じ倉の中で、
**手順書が同じ結果を招く**のは筋が通らない。

**なぜ重大か**: ①②③ は同じ一行(`:370` の位置)から生えており、**修理が独力で持ち込んだもの**である
(main の `readLedger` にこの枝は無い)。そして **3 件とも門が全緑のまま素通りする**。

**提案**(実装しない):
- `opts.raw` の分岐を too-deep 検査の**前**に出す。生は生のまま返し、
  深すぎる行の扱いは `foldLedger`(既に passthrough を持つ・`:324`)と `auditLedger`(既に too-deep 枝を持つ)に任せる。
  **両者とも既にその備えを持っているのに、上流が先に捨てているせいで使われていない。**
- あわせて **CLI を子プロセスで撃つ門**を `--audit` の too-deep に一本立てる
  (現状の N11 門は engine を直接呼ぶので、この不整合を構造的に見られない)。

### 【軽微】P-4 `metrics` を持たない行が複数あると `foldLedger` は順序依存になる

**ファイル**: `graph/gauge.js:322`(passthrough)、`:329-334`(sort 比較子)。

passthrough の行は `metrics` を持たないので、tie-break の `fa`/`fb` が**両方 `''`** になり
比較子は `0` を返す。`ts` も無い(`String(undefined)` ではなく `String(a.ts || '')` = `''`)ため、
**metrics なし行どうしは完全に比較不能** = `Array.prototype.sort` の安定性任せ = **入力順のまま**。

**再現**:
```
入力 [0,1,2] → 出力 ["e1","e2","e3"]
入力 [2,1,0] → 出力 ["e3","e2","e1"]     ★ 入れ替えたら列が変わった
入力 [1,0,2] → 出力 ["e2","e1","e3"]
```
`gauge.js:331` のコメントは「同時刻の tie-break も決定的に —— **shuffle しても同じ列を返すための必須条件**」と
宣言している。**metrics なし行についてはその宣言が守られていない。**

- **門が見ていない理由**: AC-4a の門(`:3271`)の素材 `gauge30Rows()` は
  **metrics なし行を一件も含まない**。門の主張の範囲が実装の宣言より狭い。
- **軽微に留める理由**: `record` は必ず `metrics` 付きで書き、`baseline` の `{slug,error}` は
  返り値にしか載らない(`gauge.js:414-415` を読んで確認)。台帳にこの行が生まれる経路は
  手編集・git マージ・破損のみ = S-1 と同じ発火条件で、かつ**行が消えるのではなく順番が動くだけ**である。
- 塞ぐなら tie-break の第二段に `slug`(あるいは行の JSON)を足す一行で済む。

---

## 4. 門の再検定 —— 私が発明した 39 変異

**方法**: `tests/paradise.test.js` の gauge 節(行 2826〜4170)を切り出した独立走行器を作り
(基線 **66 門**、1〜3 秒)、変異ごとに撃った。全体走行(約 7 分)× 39 は現実的でないためである。
**prove の N1〜N25 とも review attempt 1 の M1〜M20 とも重ならない変異のみを選んだ。**
実装側だけでなく **門ヘルパー側 (T)**・**複合注入 (K)**・**時刻/環境依存 (W7/W8/V11/V12)** を明示的に狙った。

> **「門は完全です」とは書かない。** 以下は私が打った 39 変異の範囲での実測である。
> 40 番目が素通りする可能性は残る —— 前任 20 変異で 8 の穴、prove 25 変異で 13 の穴、
> そして今回 39 変異で 14 の無音。**毎回新しい穴が出ている。**

### 4.1 一覧(🔔 = 鳴った / ❌ = 無音)

| # | 変異 | 結果 | 鳴った門(抜粋) |
|---|---|---|---|
| **V1** | `fingerprint` の `??` を `\|\|` に(falsy な slug/scale が null に潰れる) | ❌ **無音** | — |
| **V2** | `canonical` の `undefined` 鍵を落とさず `"null"` として出す | ❌ **無音** | — |
| **V3** | `toFixed(6)` を `toPrecision(6)` に | ❌ **無音** | — |
| V4 | `trueKey` の catch が `GAUGE_TOO_DEEP` 以外も握り潰す | 🔔 1門 | S-2 注入門 |
| V5 | too-deep 読み飛ばしを外す | 🔔 2門 | S-2 ×2 |
| V6 | `record` の既記録探索から `break` を外す | 🔔 1門 | N9 注入門(形の変化を検知) |
| V7 | `latestFor` の `>` を `>=` に | 🔔 1門 | AC-4c 注入門 |
| **V8** | `foldLedger` の tie-break を `trueKey` → `slug` に | ❌ **無音** | — |
| **V9** | `compare --last` の `metrics` 絞りを外す | ❌ **無音** | — |
| **V10** | `auditLedger` の入口 filter から `metrics` を外す | ❌ **無音** | — |
| **V11** | **環境変数の裏口**: `GAUGE_NO_FOLD=1` で畳みを止める | ❌ **無音** | — |
| **V12** | **時刻**: `record` の `ts` を `toISOString` → `toString` | ❌ **無音** | — |
| V13 | 深さの底を 64 → 3 | 🔔 2門 | N3 / N3 注入門 |
| V14 | `forged-fp` の判定を反転 | 🔔 1門 | S-1 |
| **T1** | **門ヘルパー**: `injectGauge` の「注入箇所が見つからない」assert を外す | ❌ **無音** | — |
| **T2** | **門ヘルパー**: `runGaugeGate` が失敗時の exit code を 1 に捏造 | ❌ **無音** | — |
| T3 | **門ヘルパー**: `gauge30Rows` の重複を 5 部 → 1 部に痩せさせる | 🔔 3門 | AC-3a / AC-7b / NFR-1 |
| **T4** | **門ヘルパー**: `withGaugeSandbox` の仮倉掃除を外す | ❌ **無音** | — |
| T5 | **門ヘルパー**: `gaugeWindowRows` の窓を最初から清潔に | 🔔 2門 | AC-3c / AC-3d |
| K1 | **複合**: keep-last + 整列降順(見かけのつじつま) | 🔔 4門 | AC-3b / AC-5c / S-1 注入 / N7 注入 |
| K2 | **複合**: `trueKey` を自己申告に戻す + `record` が `fp` を書かない | 🔔 **10門** | AC-1a/2a/2b/2c … |
| K3 | **複合**: 版を `g2:` に + `forged-fp` 検出を殺す | 🔔 5門 | AC-1a / AC-7b / S-1 / N18 |
| W1 | audit の `duplicates` を常に 0 | 🔔 3門 | AC-3a / AC-7b / N11 注入 |
| W2 | NFR-1 の告知条件を潰す | 🔔 1門 | NFR-1 |
| **W3** | `readLedger` の fold 失敗 catch を `[]` 返しに(記録が消える) | ❌ **無音** | — |
| W4 | `record` の `appendFileSync` → `writeFileSync`(台帳を毎回上書き) | 🔔 **6門** | AC-1c(破壊的経路の門が効いた)ほか |
| **W5** | `foldLedger` の passthrough を keep の前に置く | ❌ **無音** | — |
| W6 | 材料から `scale` を落とし `slug` を二重に | 🔔 3門 | AC-1b / N18 / N18 注入 |
| W7 | **時刻依存**: `canonical` が `Date.now()` を材料に混ぜる | 🔔 6門 | AC-1a / AC-2c / AC-2d 注入 |
| W8 | **環境依存**: `PARADISE_GAUGE_STRICT` が無ければ audit を常に exit 0 | 🔔 1門 | AC-7b |
| T6 | **門ヘルパー**: `seedGaugeCreations` が創造物を 1 個しか作らない | 🔔 2門 | AC-2a / AC-2d |
| **T7** | **門ヘルパー**: `writeGaugeLedger` が投入行を黙って重複除去 | ❌ **無音** | — |
| K4 | **複合**: 丸めを消す + `record` が書く前に `toFixed(6)` する | 🔔 2門 | R-1/M3・M4 / R-1 注入門 |
| K5 | **複合**: 底を 2 に絞る + 深い行の扱いを変える | 🔔 3門 | N3 / N5 / N3 注入 |

**39 種中 25 が鳴り、14 が無音(36%)。**

### 4.2 【重大】P-3 無音の 14 種 —— うち 11 は実害のある本物の欠陥

「無音だが実は無害」を逃げ道にしないため、一件ずつ実測で潰した。

| # | もし本番でこの変異が起きたら | 実害 |
|---|---|---|
| **V2** | `JSON.stringify` は `undefined` 鍵を落とすので、**書く前(`undefined` あり)と読み戻し後(鍵なし)で鍵が割れる** → 同じ観測が二度刻まれる。冪等性の核が壊れる | **あり** |
| **V3** | `toPrecision(6)` は 7 桁目以降を丸める。実測: `durationMs` 1800000 と 1800000.4 が**同一鍵**、123456789 と 123456790 も**同一鍵**。`durationMs` は実台帳に実在する鍵 → **別走行が畳まれて片方が消える** | **あり** |
| **V8** | 同一 slug・同時刻の 2 行が比較不能になり `Array.sort` の安定性任せ = 入力順依存。**AC-4a(shuffle 不変)の核が破れる** | **あり** |
| **V9** | `metrics` なし行が `compare --last` の窓に載り、`renderLedger` の `e.metrics.score` で**秤全体が倒れる**(実測: `e.ts` が `undefined` で `.slice` が TypeError) | **あり** |
| **V10** | `metrics` を持たない別々の失敗行が**すべて同一鍵**になる(実測: `fingerprint({slug:'a'})` と `fingerprint({slug:'a',error:'別'})` が同一)→ 掃除しようのない偽の重複を audit が報じ続ける | **あり** |
| **V11** | FR-3 のすべて(dashboard の三段重なりの治癒)が**環境変数一つで無効化**される。門は env を設定しないので永久に気づかない。**設定で無効化できる門は門の不在に等しい** | **あり** |
| **V12** | 畳みの keep-first は「**文字列の辞書順 = 時刻順**」を前提にする(`gauge.js:314-316` のコメント)。local 文字列では辞書順が時刻順にならない(実測: `"Tue Sep 08 2026" < "Wed Jan 01 2020"` が **true** = 逆転)。**keep-first が壊れ**、画面にも `Tue Sep 08 2026 ` が出る | **あり** |
| **W3** | 畳みが倒れたときに**生の行まで捨てる**。`gauge.js:374` の `return out` は「fail-open: 畳めなくとも記録は返す」という第55条(e)の実体。実測: `metrics` に例外を投げる getter があれば `foldLedger` は実際に throw するので catch の出番はある | **あり** |
| **T1** | `injectGauge` の assert(`tests:3033`)を外すと、実装の形が変わって置換が空振りしても「注入版 = 実物」で故障注入門が回り、**注入門が永久に無意味な緑を返す**。前任が「優れた作法」と褒めたこの装置**自身を守る門が無い** | **あり** |
| **T2** | `runGaugeGate`(`tests:3062`)が失敗時に常に `code:1` を返すと、注入版が**どんな理由で落ちても**(構文誤り・require 失敗)門が「鳴った」と読む。**第16条: 別の理由の赤を緑の根拠にしている** | **あり** |
| **T4** | `withGaugeSandbox` の `finally` から `rmSync` を外しても(`tests:2960`)、衛生門は自分が作った tmp しか見ないので鳴らない → `%TEMP%` に残骸が溜まる | あり(軽微) |
| V1 | `??` → `\|\|`。実測では `record` が `scale` を `\|\| null` で既に潰しており(`gauge.js:385`)、`slug` は dir 名なので空にならない → **今日は無害**。だが `?? ` を書いた意図(`''`/`0`/`false` を `null` と区別する)は機械に守られていない | 将来の罠 |
| W5 | passthrough の連結順を変える。実測では sort が…**変えられなかった**(P-4 のとおり比較不能なので入力順が残る)。**これは W5 が無害なのではなく、P-4 という別の欠陥の裏返しである** | P-4 に計上 |
| T7 | `writeGaugeLedger` が `Set` で行を潰す。現在の素材は全行が相異なるので**今日は無害**。だが「完全同一行の重複」を素材にする門が将来書かれた瞬間、**素材が黙って痩せて門が偽の緑を返す** | 将来の罠 |

### 4.3 とくに重い所見: **門ヘルパーを守る門が一本も無い**

T1 / T2 / T4 / T7 は**すべて `tests/paradise.test.js` の補助関数への改変**であり、**全部無音**である。
T3 / T5 / T6(素材を痩せさせる変異)は鳴ったが、それは
**門自身が「素材が期待どおり汚れていること」を検算しているから**である
(例 `AC-3c`: 「門の前提が崩れた — 生の窓が汚れていない」、`AC-3a`: 「生の行が 6 行 — 投入した30行が読めていない」)。
**この検算は素材にはあるが、装置(`injectGauge` / `runGaugeGate` / `withGaugeSandbox`)には無い。**

- **`injectGauge` の assert が外れても誰も気づかない**のに、この assert こそが
  全 6 本の故障注入門の**唯一の失効検知**である。
- **`runGaugeGate` が exit code を捏造しても誰も気づかない**のに、
  「門が exit 1 で鳴る」を文字どおり実測する装置はこれだけである。
- 私の V6 / V7 / V13 / K1 / K4 が鳴った理由の一部は、まさに `injectGauge` の assert が発火したからである
  —— **つまり装置は今日は生きている。だがそれを保証しているのは偶然であって門ではない。**

**提案**(実装しない): 門ヘルパーを自己検証する門を一本足す。
`injectGauge` に同一文字列を返す replacer を渡して `assert.throws` すること、
`runGaugeGate` が **exit 0 の子プロセスに対して `code:0` を返す**ことを撃つだけで、T1/T2 は塞がる。

---

## 5. audit の exit code は一貫しているか(タスクの明示的な問い)

**実測(仮倉で 8 通りの台帳を撃った)**:

| 台帳の状態 | exit | 出力 |
|---|---:|---|
| 健全 1 行 | 0 | `rows=1 distinct=1 duplicates=0 conflicts=0` |
| 重複 2 行 | **1** | `rows=2 distinct=1 duplicates=1 conflicts=0` |
| 正当な改善(同一 slug・別 metrics) | 0 | `rows=2 distinct=2 duplicates=0 conflicts=0` |
| 偽の鍵(forged-fp) | **1** | `conflicts=1` + `⚠️ 矛盾: coin — 名乗る指紋 … が中身から導かれる … と食い違う` |
| `fp` 無しの旧行 | 0 | 後方互換どおり |
| 破損行のみ | 0 | `rows=0 …`(stderr に名指しあり) |
| **深すぎる行のみ** | **0** | `rows=0 …` ← **P-1。全行が捨てられているのに「健全」** |
| 台帳が空 | 0 | `rows=0 …` |

### 【軽微】P-8 exit 1 が二つの異なる意味を運んでいる

`gauge.js:590` は `duplicates > 0 || conflicts.length > 0 ? 1 : 0`。だが両者の性質は違う:

- **重複** = 機械が畳めば消える欠陥。掃除(FR-8)で必ずゼロにできる。**赤が意味を持つ。**
- **forged-fp** = 人の手編集・git の衝突解決でできた**事故**。掃除では消えず、
  **人が中身を見て直すまで永久に赤**。第55条(g) の精神ではこれは「名指す」べきもので、
  「掃除できる欠陥」と同じ信号に載せると、前任が R-2 で戒めた「鳴りっぱなしの門」に**再びなりうる**。

前任の R-2 の教訓(信号を分ける)が、**矛盾の定義を変えることで回避されただけで、
exit code の設計自体は一つのままである**。今日は forged-fp が実台帳に無いので鳴らないが、
一度生まれれば `--audit` は直すまで赤のままで、CI に繋げば(R-10 / P-9)恒久的な赤になる。

**提案**: `--strict` を設けるか、`duplicates` → exit 1 / `conflicts` → exit 2(あるいは 0 + 名指し)と
**信号を分ける**。`design.md:505` の表も更新が要る。

---

## 6. 前任・監査役が触れなかった読み筋(私が見て、穴が無かったもの)

**緑で埋めないため、「実際に撃った」ものだけを挙げる。**

- **forged-fp が正当な行を偽陣しないか**(タスクの明示的な問い) —— **偽陣しない。**
  7 通りの境界値で「書いた鍵」と「JSONL に落として読み戻した鍵」を突き合わせた:
  `NaN` / `-0` / `1/3`(7 桁以上) / `Infinity` / `undefined` 値の鍵 / `1e21` / 通常。
  **7 件すべてで鍵が一致し `conflicts=0`。** `canonical` の正規化が
  JSON のラウンドトリップに対して安定であることが効いている(`NaN`/`Infinity` は `null` に落ちるが、
  **書く側も読む側も同じ `'null'` に落ちる**ので鍵は割れない)。
- **`g1:` の値の固定** —— 門 `指紋の版は黙って動かない (N18)` :3820 が**値そのもの**を固定しており、
  私の W6(材料の入れ替え)/ K3(版を `g2:` に)が両方ともここで鳴った。**穴なし。**
- **`record` に破壊的書き込みを足せるか** —— W4(`appendFileSync` → `writeFileSync`)は
  **6 門が鳴った**。うち AC-1c が「record に破壊的書き込みの経路が足された — 台帳の第一の徳は
  『記録が失われない』こと」と名指す。**経路の不在を主張する門が実際に効いている。良い門である。**
- **時刻依存** —— W7(`Date.now()` を材料に混ぜる)は 6 門が鳴った。**冪等性の核は時刻に対して守られている。**
  ただし V12(`ts` の形式)は無音(P-3)。
- **下流(pulse / dashboard)** —— `PARADISE_CREATIONS` を清潔にした上で
  `dashboard-count: 15 passed, 0 failed` / `dashboard-run-panel: 16 passed, 0 failed`。
  深さ 50000 の台帳でも `pulse.snapshot()` は落ちない(§1.5)。**穴なし。**
- **第30条 / NG-8** —— `gauge.js` に住所の直書きも索引ファイルもゼロ(門 :3110-3111 と私の grep で二重確認)。
- **憲法の整合** —— `codex.js article 55` が (a)〜(g) を引ける。(d) に R-2/R-5 の教訓、(g) に S-1/S-3 の教訓が
  実際に文として入っている。**文書と実装が食い違う箇所は見つからなかった。**

---

## 7. AC との突き合わせ(前相の主張の検算)

`prove-report.md` §3 の対応表を**鵜呑みにせず**、私が独立に撃った結果だけを書く。

| AC | 前相の主張 | 私の判定 | 根拠 |
|---|---|---|---|
| AC-1a/1b/1c | ✅ | ✅ | W6/K3/W7/K2 で鳴る。第30条は grep + 門で二重確認 |
| AC-2a〜2d | ✅ | ✅ | K2 が 10 門を鳴らす。W4 で AC-1c の破壊経路門も鳴る |
| AC-3a〜3d | ✅ | ✅ | T3/T5/W1 で鳴る。**素材の汚染を門が自ら検算している** |
| AC-4a | ✅ | ⚠️ | 30 行の素材では守られる。**`metrics` なし行では順序依存(P-4)** |
| AC-4b/4c | ✅ | ✅ | V7 で AC-4c 注入門が鳴る |
| AC-5a〜5c | ✅ | ✅ | K2 / N19 系で鳴る。`fp` を材料に入れない門は :3665 |
| AC-5d | ✅ | ✅ | **394 passed, 0 failed**(> 344)。二度走らせて再現 |
| AC-6a〜6c | ✅ | ✅ | W3 は無音だが**実装は正しい**(catch は `return out`)。門が無いだけ |
| AC-7a/7b | ✅ | ⚠️ | W1/W8/K3 で鳴る。だが **P-1(too-deep の CLI 経路)と P-8(exit code)** が残る |
| **AC-8a〜8d** | ⛔ 擃てていない | ⛔ **同意** | 兄弟倉の掃除。**私も実行も検証もしていない**。P-1 ③ により、掃除の手順自体に危険がある |
| AC-9a | ✅ | ✅ | 394 |
| AC-9b | ✅ | ✅ | `dashboard-run-panel: 16 passed, 0 failed`(**env を清潔にした上で**。§0.1.1) |
| AC-9c | ✅ | ✅ | 実台帳の sha256 が本相の前後で不変 |
| NFR-1 | ✅ | ⚠️ | W2 で鳴る。だが **too-deep 行が消えても告知が出ない**(実測: ファイル 3 行 → 画面 1 行、「畳んだ」の告知なし)。P-1 の系 |
| NFR-2 | ✅ | ⚠️ | R-2 は治癒。だが P-1 ② / P-8 |
| NFR-3 | ✅ | ✅ | `fingerprint` は export され続けている |

**NG-1〜NG-10 の違反 —— 私が撃った範囲では一件も無かった。**
とくに NG-8(索引ファイル)は門と grep の二重、NG-10(なぞるだけのテスト)は
39 変異中 25 が鳴ったことで**骨格の健全性は実証されている**。

---

## 8. 見ていないもの(第16条 — 緑で埋めない)

- **AC-8a / 8b / 8c** —— 実台帳の 30 行 → 6 行の掃除。規律により兄弟倉に触れていない。**未検証。**
- **全体走行 × 39 変異** —— 変異は gauge 節(66 門)だけで撃った。
  **gauge 節の外の門が私の 39 変異で鳴る可能性は測っていない。**
  ただし変異なしの全体走行が 394/0 であることは実測済み。
- **並行書き込み** —— 複数プロセスが同時に `record` する状況は起こしていない。
  この差分は書き込み方式(append)を変えていない。
- **Windows 以外の OS** —— 見ていない。全実測は Windows / Node v24.14.0。
- **`pulse.js` / `dashboard/` の実コード** —— 深い台帳で `snapshot()` が倒れないことは実測したが、
  ソースを読んでの逐条検証はしていない。
- **10^5 行以上の台帳** —— `record` の性能は 10^4 行までしか測っていない。
- **`e.fp` が `g1:` 以外の版(`g2:` 等)を名乗る実データ** —— 現存しないため机上のみ。

---

## 9. 木の清潔(規律の証明)

```
$ git status --short          (39 変異すべてを戻した後)
?? reform/gauge-ledger-idempotent/security-report-2.md      ← 他者(別相)の未追跡ファイル
$ git diff --stat HEAD -- graph/ tests/
(差分なし)                    ★ graph/ と tests/ は一行も汚れていない
```
- 変異注入器は**毎回 `git checkout -- graph/gauge.js tests/paradise.test.js` の後に
  注入前とのバイト一致を検算**し、不一致なら `process.exit(2)` する装置にした。39 回すべて一致。
- 走行中に `README.md` / `reform/gauge-ledger-idempotent/README.md` / `security-report-2.md` が
  他プロセスによって書かれた(タイムスタンプ 17:03/17:04、私の作業と無関係)。**私は触っていない。**
- **main に commit していない。push も PR もしていない。**
- **`../paradise-creations` に一字も書いていない**(sha256 と行数が前後で不変 —— §0.1)。
- 仮倉はすべて `%LOCALAPPDATA%/Temp/` 配下の**ネイティブ `C:/` 形式**。各スクリプトが `rmSync` で撤収し、
  `sandbox removed: true` を実出力で確認した。
- **実装を自分で直していない**(レビュー相の規律)。自明な誤植も見つからなかったため微修正もゼロ。

---

## 10. 次に打つべき手(優先順)

1. **P-1** —— `opts.raw` の分岐を too-deep 検査の前に出す。`raw:true` の契約と
   `auditLedger` の too-deep 枝と FR-8 の掃除、**三つが一行で同時に直る**。
   あわせて **CLI を子プロセスで撃つ門**を一本(engine 直呼びの門では見えない)。
2. **P-3(門ヘルパーの自己検証)** —— `injectGauge` / `runGaugeGate` を守る門を一本。
   **これが無いかぎり、6 本の故障注入門の緑は信用に足りない。**
   あわせて無音 11 件のうち V2 / V3 / V9 / V10 / V11 / V12 / W3 に門を(いずれも数行)。
3. **P-2 / R-3** —— `foldLedger` に鍵のメモ化(同一行を二度導出しない)、
   `baseline` が fp 集合を一度だけ組む。**S-1 を再発させずに O(M+N) に戻せる。**
   同時に `gauge.js:292` の「無視できる」というコメントを実測値に置き換える。
4. **P-8** —— audit の信号を「掃除できる欠陥」と「人が読むべき事故」で分ける。
   これを済ませてから P-9(CI に `--audit` を繋ぐ)。
5. P-4 / P-5 / P-6 / P-7 —— 軽微。tie-break の第二段・死んだコード・二度読み・fail-open のコメント整合。
6. P-10 / P-11 —— 好み。

---

## 11. この相で走らせた命令の全一覧(再現用)

```bash
cd C:/Users/kikus/Documents/workspace/paradise
git log --oneline -8 ; git diff main...HEAD --stat
node -v                                              # v24.14.0
node tests/paradise.test.js                          # 394 passed, 0 failed (×2)
node tests/dashboard-count.test.js                   # 15/0
unset PARADISE_CREATIONS; node tests/dashboard-run-panel.test.js   # 16/0 (§0.1.1)
node graph/codex.js article 55                       # (a)〜(g) 全文
node graph/gauge.js ledger --audit                   # rows=30 distinct=6 duplicates=24 conflicts=0 exit=1

# 独立走行器(gauge 節 2826-4170 を切り出す)
node %LOCALAPPDATA%/Temp/gauge-rev2/mkrunner.js && node .../runner.js   # 66 passed, 0 failed

# 治癒確認
node -e "偽 fp を載せた別観測を foldLedger / auditLedger に通す"        # S-1 読み側
node .../x2.js       # R-2 治癒 / 正当な改善 exit 0 / too-deep の audit 沈黙 / NFR-1 の告知
node .../newdefects.js  # X-1〜X-5(forged-fp の偽陣 7 通り・exit code 8 通り)
node -e "実台帳の最大深度を数える(読むだけ)"                            # entry=2 metrics=1
node -e "深さ 50000 の一行で readLedger / pulse.snapshot"               # 倒れない
node .../minor.js    # R-4/R-6/R-7/R-8 の現況 + audit exit code 表

# 性能(旧実装 5278887 を仮倉に取り出して A/B)
node .../perf.js ; node .../ab.js                    # fold x24-29 / record x7-8

# 変異(39 種。毎回 git checkout + バイト一致検算)
node .../mutate.js   # V1-V14 / T1-T5 / K1-K3   (22 種)
node .../mutate2.js  # W1-W8 / T6-T7 / K4-K5    (17 種)
node .../harm.js     # 無音 14 種が本物の欠陥かを一件ずつ実測

git status --short ; git diff --stat HEAD -- graph/ tests/   # 木は清潔
sha256sum ../paradise-creations/gauge-ledger.jsonl           # 前後で不変
```
