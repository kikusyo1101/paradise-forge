# VERIFY — 受け入れ検査 (gauge-ledger-idempotent)

- 相: **VERIFY(受け入れ検査)**。この環で一度も走っていなかった最後の門である。
- 枝: `fix/gauge-ledger-idempotent` / 入力 HEAD: `bb8b631`(449 passed / 0 failed)
- 走行環境: `node -v` → v24.14.0 / Windows / 作業言語 日本語
- **本相で `graph/` も `tests/` も一行も変更していない。**加えたのは本書 1 枚だけである。
- **実台帳(`../paradise-creations/gauge-ledger.jsonl`)は一行も書き換えていない** —
  検査は全て `PARADISE_CREATIONS` を `C:/Users/kikus/AppData/Local/Temp/gv-sb`(ネイティブ形式)へ
  振り替えた仮倉で行った。前後の sha256 を §5 に示す。
- **道具はリポジトリ内に一つも残していない**(注入器・切り出し門は `%LOCALAPPDATA%/Temp` に置いた)。

---

## 0. この相の立て付け — 何を根拠と認めたか

**人の主張を根拠にしない。** prove-report-3.md も attempt 4 の報告も「入力」として読んだが、
判定は**私が自分で打った命令の生の出力**だけに置いた。
「門があるから達成しているはず」は判定に使っていない —— 門そのものを走らせ、
故障を注入して鳴ることを確かめ、CLI を直に叩いた。

**第16条に従い、緑で埋めない。** 未達は未達と書く。原理的に検められないものは
「検められない」と書き、達成の側に丸めない。

---

## 1. 結論 — **33 件中 28 件 達成 / 4 件 未達 / 1 件 検められない**

| 判定 | 件数 | AC |
|---|---|---|
| ✅ 達成 | **28** | AC-1a/1b/1c, 2a/2b/2c/2d, 3a/3b/3c/3d, 4a/4b/4c, 5a/5b/5c/5d, 6a/6b/6c, 7a/7b, 9a/9b/9c, NFR-1, NFR-2 |
| ❌ 未達 | **4** | **AC-8a**(実台帳は 30 行のまま)/ **AC-8b**(同上)/ **AC-8d**(creations 側 PR 未着手)/ **NFR-3**(指紋の CLI 確認経路が無い) |
| ⚪ 検められない | **1** | **AC-8c**(履歴不変 — 処置コミット自体が存在しないので「前後」が取れない) |

**未達 4 件のうち 3 件(8a/8b/8d)は同一の原因**である ——
**FR-8 の「実台帳を 6 行に畳んで creations 側の別 PR で置く」処置が、まだ一度も実行されていない。**
prove-report-3 §3.1 が正直に書いたとおり、立っているのは**掃除の手順の門**であって**掃除そのもの**ではない。
私はこれを緑で埋めなかった。

---

## 2. AC 一覧表 — 一件ずつ駆動した

> 仮倉 = `PARADISE_CREATIONS=C:/Users/kikus/AppData/Local/Temp/gv-sb`(`/c/...` 形式は失敗する)
> 切り出し門 = `tests/paradise.test.js` の gauge 節(`// --- Gauge: the scale of proof` 〜 `// --- Diet gate`)を
> 単独走行させたもの。**121 passed / 0 failed** が実物での基線。

### FR-1 冪等鍵

| AC | 判定 | 打った命令 | 生の出力の要点 |
|---|---|---|---|
| **AC-1a** 二度の record の鍵が一致 | ✅ | 仮倉で `g.record(run,'coin')` を二度 | `a.fp=g1:431fee7a43d0c578` / `b.fp=g1:431fee7a43d0c578` / **equal=true** |
| **AC-1b** 鍵は `ts` に依存しない | ✅ | `fingerprint({ts:'T0',…})` vs `{ts:'T999',…}` | 両方 `g1:431fee7a43d0c578` / **equal=true** |
| **AC-1c** 第30条の維持 | ✅ | `unset PARADISE_CREATIONS; node graph/workspace.js check` | `✓ 楽園に創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし` / **exit 0** |

### FR-2 予防・書き側

| AC | 判定 | 打った命令 | 生の出力の要点 |
|---|---|---|---|
| **AC-2a** baseline 二度で行数不変 | ✅ | 仮倉で `node graph/gauge.js baseline` を **5 回** | `baseline #1 lines=2` `#2 2` `#3 2` `#4 2` `#5 2` — **一行も増えない** |
| **AC-2b** record 二度打ちも一行 | ✅ | 同じ run を `gauge.js record … --slug coin` で **10 回** | `record #1〜#10` すべて `exit=0 lines=2` |
| **AC-2c** 二度目は沈黙せず名乗る | ✅ | 上記の二度目の標準出力 | `📒 already recorded: coin → 100/100 @ 2026-09-08T16:25:42.187Z (同一指紋 g1:431fee7a43d0c578) — 追記しない` / **exit 0** |
| **AC-2d** 【故障注入】冪等検査を外すと鳴る | ✅ | `existing = idx.get(entry.fp) \|\| null;` → `existing = null;` を注入し gauge 節を走行 | **exit 1 / 106 passed, 15 failed**。鳴った門に `AC-2a 冪等性の核` `AC-2b` `AC-2c` `AC-1a` を含む |

### FR-3 治癒・読み側

| AC | 判定 | 打った命令 | 生の出力の要点 |
|---|---|---|---|
| **AC-3a** 30 行 → 6 行 | ✅ | 仮倉に実台帳同型 30 行を置き `foldLedger(readLedger({raw:true}))` | `raw=30 folded=6` |
| **AC-3b** 80→100 の改善 2 行が残る | ✅ | 畳んだ 6 行を検分 | `80row(13:54:12.963Z)=true 100row(14:01:25.440Z)=true`。内訳 `coin:100 / habit:45 / reform-eval-gauge:80 / reform-eval-gauge:100 / tenbin:100 / reform-claude-md-diet:80` |
| **AC-3c** 偽の「変化なし」を禁ずる | ✅ | 10 行(distinct 2)の重複台帳に `gauge.js compare --last 3` | 出力 2 行 `coin 100 / habit 45` — **同一 slug×score の重複ゼロ**。V-6 の `habit / coin / habit` は再現しない |
| **AC-3d** 【故障注入】畳みを外すと鳴る | ✅ | `try { return foldLedger(kept); }` → `return kept;` を注入 | **exit 1 / 113 passed, 8 failed**。`AC-3a` `AC-3b` `AC-3c` `AC-3d` が鳴った |

### FR-4 順序非依存

| AC | 判定 | 打った命令 | 生の出力の要点 |
|---|---|---|---|
| **AC-4a** shuffle 不変 | ✅ | 同じ 30 行を種 7 と種 99 で shuffle し畳んで比較 | `foldA(sorted)===foldB(sorted) : true n=6`。`latestFor` も `A.ts=B.ts=2026-08-31T14:01:25.440Z same=true` |
| **AC-4b** 「最新」は ts 最大 | ✅ | 台帳を `T0, T2, T1` の順で書き `latestFor('x', raw)` | `latest.ts=2026-03-01T00:00:00.000Z score=3` = **T2**。末尾行 T1 を返さない |
| **AC-4c** 【故障注入】位置依存に戻すと鳴る | ✅ | `hits.reduce(…ts 最大…)` → `hits[hits.length-1]` を注入 | **exit 1 / 119 passed, 2 failed**。`AC-4b` と `AC-4c` が鳴った |

### FR-5 後方互換

| AC | 判定 | 打った命令 | 生の出力の要点 |
|---|---|---|---|
| **AC-5a** 旧形式のみで行落ちなし | ✅ | 鍵無し 10 行を書き `readLedger({raw:true}).length` | `wrote=10 → 10`(0 でも undefined でもない) |
| **AC-5b** 旧形式 30 行が 6 行に畳まれる | ✅ | 鍵無し 30 行で `foldLedger` | `folded=6` — 鍵が無くても再計算で畳める |
| **AC-5c** 新旧混在が同一指紋で 1 行 | ✅ | `{ts,slug,scale,metrics}` と同観測 `+fp` の 2 行 | `folded=1` |
| **AC-5d** 既存自己試験が緑 | ✅ | `unset PARADISE_CREATIONS && node tests/paradise.test.js` | `Paradise self-test: **449 passed, 0 failed**`。✗ は **0 件**。既存門 `gauge: 台帳は追記型で record→compare が前後を語る` も緑(ログ 357 行目) |

### FR-6 破損耐性

| AC | 判定 | 打った命令 | 生の出力の要点 |
|---|---|---|---|
| **AC-6a** 衝突マーカーで生きた 3 行が読める | ✅ | `<<<<<<< HEAD` / `=======` / `>>>>>>> A` 入り台帳に `readLedger` | `⚠️ ledger line skipped (corrupt)` ×3、`live rows read=3`。**例外を投げない・exit 0** |
| **AC-6b** 畳んでも生きた行数が減らない | ✅ | 同じ破損台帳に `foldLedger` | `folded live rows=3` |
| **AC-6c** 破損中の record で既存行が失われない | ✅ | 破損台帳に `record(run,'coin')` | `before=3 after=4 nonDecreasing=true`(fail-open で一行足す側に倒れた) |

### FR-7 矛盾を隠さない

| AC | 判定 | 打った命令 | 生の出力の要点 |
|---|---|---|---|
| **AC-7a** 同 slug・別 metrics は 2 行残る | ✅ | `q:80` と `q:100` を置いて `foldLedger` | `folded=2` |
| **AC-7b** 判別可能な信号 | ✅ | 偽指紋行を混ぜて `gauge.js ledger --audit` | `⚠️ 矛盾: coin — 名乗る指紋 g1:deadbeefdeadbeef が中身から導かれる g1:431fee7a43d0c578 と食い違う` / `🔴 人が読むべき行が 1 件` / **exit 2**。健全時は **exit 0** |

### FR-8 既存の汚染 24 行の処置 — **ここが未達である**

| AC | 判定 | 打った命令 | 生の出力の要点 |
|---|---|---|---|
| **AC-8a** 掃除後 6 行 | ❌ **未達** | `wc -l < ../paradise-creations/gauge-ledger.jsonl` | **`30`**。期待は `6`。**実台帳は掃除されていない** |
| **AC-8a**(手順の模擬) | ✅ 模擬として | 仮倉の 30 行に `readLedger({raw:true})→foldLedger→書き戻し` | `30 -> 6; coin 100 / habit 45 / reform-eval-gauge 80 / reform-eval-gauge 100 / tenbin 100 / reform-claude-md-diet 80` — **V-9 の内訳と一致** |
| **AC-8b** 指紋集合が前後で完全一致 | ❌ **未達** | 実台帳に対しては掃除自体が無い | 前後が存在しないので主張が成立しない |
| **AC-8b**(手順の模擬) | ✅ 模擬として | 上記の前後で指紋集合を比較 | `fingerprint sets identical=true (pre distinct=6, post distinct=6)` — **観測を一つも失わない** |
| **AC-8c** 履歴を書き換えない | ⚪ **検められない** | `cd ../paradise-creations && git log --oneline -- gauge-ledger.jsonl` | `7791cdf` / `f804697` が**現在も同じ SHA で存在する**(`git cat-file -t` → `commit` / `commit`)。ただし**処置コミットが存在しない**ので「処置の前後で不変」という主張は**測る対象が無い**。現時点で言えるのは「まだ何も壊れていない」までである |
| **AC-8d** PR の分離 | ❌ **未達** | `git diff --name-only main...HEAD \| grep -c gauge-ledger.jsonl` | **`0`** — paradise 側の枝に台帳は**現れない**(この半分は満たしている)。しかし creations 側は `git branch` → `creation/tenbin` / `main` のみ、`git diff --stat` → ` gauge-ledger.jsonl \| 25 +++++`(未コミットのまま)。**掃除の PR は立っていない** |

### FR-9 門を CI に繋ぐ

| AC | 判定 | 打った命令 | 生の出力の要点 |
|---|---|---|---|
| **AC-9a** 全緑かつ N > 344 | ✅ | `node tests/paradise.test.js` | `Paradise self-test: **449 passed, 0 failed**`(344 → 449) |
| **AC-9b** AC-22a が緑のまま | ✅ | `node tests/dashboard-run-panel.test.js` | `dashboard-run-panel: **16 passed, 0 failed**` / exit 0。`AC-22a: gauge.baseline を呼ばない` は `tests/dashboard-run-panel.test.js:191` に健在 |
| **AC-9c** 門は実台帳を一行も書き換えない | ✅ | 自己診断の**前後**で実台帳の sha256 を採取 | 前 `387d9e0e…` / 30 行 → 後 `387d9e0e…` / 30 行。**一バイトも動かない**。`git status --short` も ` M gauge-ledger.jsonl` のまま不変 |

### NFR(nice-to-have)

| AC | 判定 | 打った命令 | 生の出力の要点 |
|---|---|---|---|
| **NFR-1** 畳んだ件数を画面が明示 | ✅ | 仮倉 30 行で `node graph/gauge.js ledger` | 末尾に `(raw 30 行 / 重複 24 行を畳んだ — \`gauge.js ledger --audit\` で内訳)` — **30 と 24 と 6 行の表示がすべて現れる** |
| **NFR-2** `ledger --audit` | ✅ | 汚れ台帳 → 掃除後の 2 回 | 汚れ: `rows=30 distinct=6 duplicates=24 …` / **exit 1**。掃除後: `rows=6 distinct=6 duplicates=0 …` / **exit 0**。要件どおり |
| **NFR-3** 指紋を CLI から確認できる | ❌ **未達** | `node graph/gauge.js score <run.json> --json` | `{"score":100,…,"tier3Ratio":0}` — **`fp` も指紋も含まれない**。`score()` の 17 鍵に指紋系はゼロ。`trueKey` は未 export(`fingerprint` は export 済み)。同等の確認経路は `record` の出力文中の `(同一指紋 g1:…)` にあるが、`score --json` が要件の指す経路であり、そこには無い |

---

## 3. 本旨の回帰 — **元の欠陥は消えている**

この改革の原因は「**baseline を走らせるたびに既存の全走行が丸ごと再追記される**」であった。
正面から測った。

```
$ export PARADISE_CREATIONS='C:/Users/kikus/AppData/Local/Temp/gv-sb'   # 創造物 2 件を置いた仮倉
$ rm -f "$PARADISE_CREATIONS/gauge-ledger.jsonl"
$ for i in 1 2 3 4 5; do node graph/gauge.js baseline >/dev/null; echo "baseline #$i lines=$(wc -l < …)"; done
baseline #1 lines=2
baseline #2 lines=2
baseline #3 lines=2
baseline #4 lines=2
baseline #5 lines=2

$ for i in $(seq 1 10); do node graph/gauge.js record …/coin/conclave.json --slug coin; …; done
record #1 exit=0 lines=2
record #2 exit=0 lines=2
…
record #10 exit=0 lines=2
```

| 測点 | 改修前(requirements.md V-5 / V-7 の実測) | **本相の実測** |
|---|---|---|
| baseline ×3 | `2 / 4 / 6` 行(実行回数に線形) | **baseline ×5 で `2 / 2 / 2 / 2 / 2`** |
| record 二度打ち | 6 行 → **8 行**(素通り) | **record ×10 で 2 行のまま** |
| 二度目の応答 | 無音で追記 | `📒 already recorded: … — 追記しない` / exit 0 |

**行は一本も増えなかった。本旨は達している。**
15 回の書き込み命令に対して台帳は 2 行。改修前の同じ命令列なら 2 + 2×5 + 10 = 22 行になるはずだった。

---

## 4. 文書の主張と実装の一致 — **exit code 四値をすべて再現した**

README.md:197 と `graph/gauge.js:42-51` が言う **「exit 0 健全 / 1 掃除で消える重複 / 2 人が読むまで消えない事故 / 3 命令の誤り」** を、四つとも実際に出させた。**文書と実装は一致している。名指すべき乖離は無い。**

| 主張 | 打った命令 | 生の出力 | exit |
|---|---|---|---|
| **0 = 健全** | `gauge.js ledger --audit`(重複ゼロの仮倉) | `📒 rows=2 distinct=2 duplicates=0 conflicts=0 too-deep=0 corrupt=0 suspect=0` | **0** ✅ |
| **1 = 掃除で消える重複** | 同じ行を一本足して `ledger --audit` | `📒 rows=3 distinct=2 duplicates=1 …` | **1** ✅ |
| **2 = 人が読むまで消えない事故** | 偽の `fp` を名乗る行を足して `ledger --audit` | `⚠️ 矛盾: coin — 名乗る指紋 g1:deadbeefdeadbeef が中身から導かれる g1:431fee7a43d0c578 と食い違う` / `🔴 人が読むべき行が 1 件ある — 掃除では消えない` | **2** ✅ |
| **3 = 命令・引数の誤り** | `gauge.js recrod`(誤字) | `commands: score … \| record … \| baseline \| compare … \| ledger [--audit]` | **3** ✅ |
| 〃 | `gauge.js compare --last abc` | `usage: gauge.js compare --last <N≥1>` | **3** ✅ |
| 〃 | `gauge.js record <run.json>`(slug 無し) | `usage: gauge.js record <run.json> --slug <slug>` | **3** ✅ |

もう一つ、README が言う **「生の全行は `readLedger({raw:true})` だけが返す(CLI の `--raw` は無い)」** も
実装と一致している —— `main()` に `--raw` の枝は無く、AC-3a の駆動で `{raw:true}` だけが 30 行を返した。

---

## 5. 既知の未擃 AC の再確認 — **緑で埋めなかった(第16条)**

prove-report-3 §3.2 と attempt 4 が名指した未擃を、私自身の手で改めて確かめた。

### 5.1 AC-8a / AC-8b は「模擬」であって「実行」ではない —— 確認した

門 `gauge: FR-8 の掃除は 30 行を 6 行にし、観測を一つも失わない (AC-8a / AC-8b — 仮倉で模擬)`
は自己診断ログ 462 行目に緑で在る。**門の名前自体が「仮倉で模擬」と名乗っている。**
そして実台帳は:

```
$ wc -l < ../paradise-creations/gauge-ledger.jsonl
30
$ git diff --stat        # in paradise-creations
 gauge-ledger.jsonl | 25 +++++++++++++++++++++++++
 1 file changed, 25 insertions(+)
```

**30 行のまま、24 行の重複を抱えたまま、未コミットのままである。**
AC-8a の期待出力は `6` である。**未達。**
requirements.md §5「完了の定義」5 項(`wc -l` が `6`)と 6 項(30/distinct 6 → 6/distinct 6 を**前後の実測で示す**)も、
したがって**満たされていない**。手順が正しいことは示された。**処置は実行されていない。**

### 5.2 AC-8c — 検められない

`7791cdf` と `f804697` は現在も同じ SHA で存在する。だが AC が問うているのは
「**処置コミットの前後で**それ以前の SHA が変わらない」ことである。
処置コミットが存在しない以上、「前後」が定義できない。
**達成とも未達とも言えない。「まだ処置していないから、まだ壊していない」だけである。**
これを ✅ に丸めるのは第16条が禁じた「測れなかったものをゼロで埋める」に当たる。

### 5.3 AC-8d — 未達(半分は満たしている)

- paradise 側: `git diff --name-only main...HEAD` の 19 ファイルに `gauge-ledger.jsonl` は**無い**(grep -c → `0`)。**この半分は満たしている。**
- creations 側: 枝は `main` と `creation/tenbin` のみ。**掃除の PR は存在しない。**
- 「engine の修正と台帳の掃除は別の PR」という要件は、片方の PR が無いので**まだ成立していない**。

### 5.4 NFR-3 — 未達(実装が無い)

`score --json` の 17 鍵に指紋は無い。実装が無いのだから門も無い。
requirements.md 自身が「must-have を危うくするなら捨てて良い」と定めた nice-to-have であり、
**捨てるという判断は妥当**である。ただし**捨てたなら「捨てた」と書かれるべき**であって、
黙って未実装のまま完了と呼ぶべきではない。ここに名指す。

---

## 6. 後始末の証拠 — 実台帳は一バイトも動いていない

```
作業前:  387d9e0ea5a4fde30249897ebba3d53150e39a32cbf1e4299d922674bcb9982b  30 行
（AC 全件の駆動 + 故障注入 3 種 + 自己診断 449 門 + dashboard 16 門）
作業後:  387d9e0ea5a4fde30249897ebba3d53150e39a32cbf1e4299d922674bcb9982b  30 行
git status --short (creations) →  M gauge-ledger.jsonl   ← 本相の前と同じ既定の状態
```

**入力時点の値と完全に一致する。**
prove attempt 3 §5.1 が「注入器が実台帳を 19 行汚した」と告白した事故を踏まえ、本相の注入器には
**変異ごとに `graph/gauge.js` の sha256 を検算し、実台帳の sha256 も前後で比較する錠**を先に付けた。

```
gauge.js 復元検算 sha256 一致 = true
実台帳 sha256 不変 = true 387d9e0ea5a4fde30249897ebba3d53150e39a32cbf1e4299d922674bcb9982b
```

さらに変異は `PARADISE_CREATIONS` を仮倉に固定した**子プロセスの中でだけ**走らせた
(prove attempt 3 の学びをそのまま適用した)。今回は汚染ゼロである。

**道具はリポジトリ内に一つも残していない。**
注入器 `inject.js` / 切り出し門 `gauge-only-verify.js` / AC 駆動器 `ac-drive2.js` は
すべて `%LOCALAPPDATA%/Temp` に置いた。作業後の paradise 側 `git status --short` は
` M reform/gauge-ledger-idempotent/conclave.json` のみ(本相の入力時点で既に M)。

---

## 7. 私が測っていないこと(正直な限界)

1. **新しい欠陥は探していない。** 本相の指示どおり、AC の駆動に絞った。
   28 件が達成であることは「requirements.md の AC が要求する範囲で」であって、
   「gauge が完全である」ことではない。prove attempt 3 の一巡目に 41% の変異が漏れたという事実は、
   AC の網の外にまだ空間があることを示唆している。
2. **故障注入は 3 種のみ。** AC-2d / AC-3d / AC-4c が名指す 3 つの回帰だけを打った
   (それが AC の要求だからである)。過去の環が打った約 123 変異の再走行はしていない。
3. **切り出し門は gauge 節のみ。** 全 449 門は 1 回 5 分超で、変異 3 種の往復には現実的でない。
   ただし**変異を戻した後の全 449 門の全緑は実測した**(§AC-5d / AC-9a)。
4. **AC-8c は原理的に検められなかった。** 処置が実行されて初めて測れる。

---

## 8. この相の判定

**gauge.js の冪等化そのもの(FR-1〜FR-7, FR-9)は、AC が要求する全件が実出力で達成されている。**
故障注入 3 門も確かに鳴った。本旨の回帰も消えた。文書と実装も一致していた。

**残っているのは FR-8 —— 実台帳そのものの掃除である。**
engine は治った。**汚れた台帳はまだ汚れたままである。**
これは creations 側の別 PR で行うと requirements.md が定めた作業であり、
paradise 側のこの枝の射程外である。だが**改革の完了の定義には入っている**(§5 の 5 項・6 項)。

**ゆえに: この枝は受け入れ可能だが、改革全体はまだ閉じていない。**
閉じるには creations 側で 30 行 → 6 行の掃除コミットが要る。
それを終えて初めて AC-8a / AC-8b / AC-8c / AC-8d が測れる。

---

## 9. 本相で走らせた命令の一覧(すべて実行済み)

```
unset PARADISE_CREATIONS; sha256sum ../paradise-creations/gauge-ledger.jsonl   → 387d9e0e… / 30 行
node graph/workspace.js check                                    → exit 0 (AC-1c)
export PARADISE_CREATIONS='C:/Users/kikus/AppData/Local/Temp/gv-sb'
node graph/gauge.js baseline ×5                                  → 2/2/2/2/2 行 (AC-2a・本旨)
node graph/gauge.js record <同一 run> --slug coin ×10            → 2 行のまま・exit 0 (AC-2b/2c)
node graph/gauge.js ledger --audit(健全/重複/偽指紋の三態)      → exit 0 / 1 / 2
node graph/gauge.js recrod                                       → exit 3
node graph/gauge.js compare --last abc                           → exit 3
node graph/gauge.js record <run> (slug 無し)                     → exit 3
node graph/gauge.js compare --last 3(重複台帳)                  → 重複なき 2 行 (AC-3c)
node graph/gauge.js ledger(30 行)                               → raw 30 / 重複 24 を告知 (NFR-1)
node graph/gauge.js score <run> --json                           → 指紋なし (NFR-3 未達)
node <AC 駆動器>  (1a/1b/3a/3b/4a/4b/5a/5b/5c/6a/6b/6c/7a/8a-sim/8b-sim)
node <注入器> — AC-2d / AC-3d / AC-4c の三変異                   → それぞれ exit 1 で鳴る
unset PARADISE_CREATIONS; node tests/paradise.test.js            → 449 passed, 0 failed (AC-5d/9a)
node tests/dashboard-run-panel.test.js                           → 16 passed, 0 failed (AC-9b)
cd ../paradise-creations; git log --oneline -- gauge-ledger.jsonl → 7791cdf / f804697 健在 (AC-8c)
git diff --name-only main...HEAD | grep -c gauge-ledger.jsonl    → 0 (AC-8d 半分)
sha256sum ../paradise-creations/gauge-ledger.jsonl               → 387d9e0e… / 30 行(不変)
```
