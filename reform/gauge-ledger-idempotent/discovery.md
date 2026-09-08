# DISCOVER — gauge 台帳の非冪等性 (gauge-ledger.jsonl)

- 対象: `graph/gauge.js` / 台帳 `C:\Users\kikus\Documents\workspace\paradise-creations\gauge-ledger.jsonl`
- 相: DISCOVER (調査のみ。engine の変更は一行も行っていない)
- 実測環境: `node -v` → **v24.14.0** / `git --version` → **git version 2.55.0.windows.5** / 作業枝 `main`(読み取りのみ)
- 自己診断は調査開始時点で緑: `node tests/paradise.test.js` → **`Paradise self-test: 344 passed, 0 failed`**

本書の記述はすべて **実際に読んだ行番号・実際に走らせたコマンドの出力** に紐づく。
推測に基づく記述は「推測」と明記する。

---

## 1. 現状の正確な把握

### 1.1 欠陥の在処 — 読んだコード

`graph/gauge.js` 実読(行番号は実ファイル):

| 行 | 内容 | 冪等性への含意 |
|----|------|----------------|
| 47 | `const LEDGER_NAME = 'gauge-ledger.jsonl';` | 台帳名は engine が持つ |
| 49-51 | `ledgerPath()` = `path.join(workspace.resolve().root, LEDGER_NAME)` | **住所を知るのは workspace.js だけ**(第30条)は守られている |
| 187-198 | `readLedger()` — 行を split して `JSON.parse`、失敗行は `console.error` して**読み飛ばす** | 破損耐性はある。**重複を畳む機構は無い** |
| 200-211 | `record(runFile, slug)` — `score()` した結果を `{ts, slug, scale, metrics}` にして **209行 `fs.appendFileSync` で無条件追記** | ★ 欠陥の中心。既存行を一切見ない |
| 214-234 | `baseline()` — `workspace.resolve().root` 直下の全ディレクトリを走査し、`conclave.json`(220-226)と `*.run.json`(228-231)ごとに **`record()` を呼ぶ** | ★ baseline は N 回走らせれば N 倍積む |
| 241-244 | `latestFor(slug, entries)` — 該当 slug の**最後の一件**を返す | 重複があると「最後の一件」が実質的に無意味 |
| 246-261 | `compare(a,b)` — `latestFor` 同士の Δ | 下記 1.4 |
| 263-272 | `renderLedger(entries)` — 渡された配列をそのまま列挙 | 重複をそのまま画面に並べる |
| 302-307 | `compare --last N` — `readLedger().filter(...).slice(-n)` = **末尾 N 行** | ★ 重複が窓を食い潰す |

**要点**: 台帳への書き込み経路は `record()` ただ一つであり(`grep -rn "\.record(\|baseline("` で確認、`graph/gauge.js:223 / 229 / 292 / 297` のみ)、
そこに冪等鍵の検査が無い。`baseline()` は `record()` の N 重ループなので、非冪等性が **件数 × 実行回数** に増幅される。

### 1.2 実害 — 実在台帳の実測

```
$ cd paradise-creations && git status --short
 M gauge-ledger.jsonl
$ wc -l gauge-ledger.jsonl
30 gauge-ledger.jsonl
$ git diff --stat gauge-ledger.jsonl
 gauge-ledger.jsonl | 25 +++++++++++++++++++++++++
 1 file changed, 25 insertions(+)
```

コミット済みは 5 行、**未コミットの追記が 25 行**。全 30 行を
`sha1(slug + JSON.stringify(metrics) + scale)` で指紋化した実測:

```
total lines: 30
--- distinct slug|metrics fingerprints: 6
DUP a68dc312 lines 1,6,11,16,21,26      (coin 100)
DUP 63a061e7 lines 2,7,12,17,22,27      (habit 45)
DUP be91ec6b lines 4,9,14,19,24,29      (reform-eval-gauge 100)
DUP 425be92a lines 5,10,15,20,25,30     (tenbin 100)
DUP bf3ddeb6 lines 8,13,18,23,28        (reform-claude-md-diet 80)
```

**30 行のうち意味のある観測は 6 個**。重複率 80%(24/30)。
発生時刻は 5 件ずつの束で、`2026-09-02T07:03:12` / `09:23:44` / `10:26:52` / `10:27:50` / `10:28:48` の
**5 バッチ** (教主の見立ての「3セット」より実際は多く、07:03 以降だけで 5 回 baseline 相当が走っている)。
各バッチ内の ts はミリ秒単位で連番(例 `...52.039Z / .040Z / .041Z / .042Z / .042Z`)であり、
**単一プロセスの一回の走査**、すなわち `baseline()` の一発が 5 行を吐いた形と一致する。

コミット済み 5 行 (`git show HEAD:gauge-ledger.jsonl`) は重複を含まない健全な基線:
```
1 2026-08-31T13:54:12.961Z coin 100
2 2026-08-31T13:54:12.962Z habit 45
3 2026-08-31T13:54:12.963Z reform-eval-gauge 80
4 2026-08-31T14:01:25.440Z reform-eval-gauge 100   ← 80→100 は本物の改善(第38条の証拠)
5 2026-09-01T03:39:58.444Z tenbin 100
```
つまり **汚染は未コミット領域に閉じている**。これは 4 章の判断に効く。

### 1.3 再現 — 故障注入(サンドボックス)

住所を `PARADISE_CREATIONS` で仮の倉に振り替え(第30条に従い workspace 経由)、`baseline` を 3 回:

```
SANDBOX=C:\Users\kikus\AppData\Local\Temp\gauge-sandbox
--- baseline #1 ---   lines after #1: 2
--- baseline #2 ---   lines after #2: 4
--- baseline #3 ---   lines after #3: 6
lines 6 distinct(slug+metrics) 2
```

**行数は実行回数に線形。観測は 2 個のまま。** 非冪等性は完全に再現する。

### 1.4 下流への波及 — 実測で確認した 4 経路

**(a) `compare --last N` の窓が汚染で埋まる** — サンドボックスでの実出力:
```
--- compare --last 3 ---
  2026-09-08T02:06   45/100  habit (standard)
  2026-09-08T02:06  100/100  coin (standard)
  2026-09-08T02:06   45/100  habit (standard)
```
2 創造物しか無いのに「直近3件」が habit を二度並べる。**推移を見る窓が推移を見せない。**

**(b) `latestFor()` が同一 metrics を前後にする(Δ=0 の偽の「変化なし」)** — 実台帳での実測:
```
coin entries= 6 last.ts= 2026-09-02T10:28:48.022Z score= 100 prev.score= 100
habit entries= 6 ... score= 45 prev.score= 45
reform-eval-gauge entries= 7 ... score= 100 prev.score= 100
tenbin entries= 6 ... score= 100 prev.score= 100
reform-claude-md-diet entries= 5 ... score= 80 prev.score= 80
```
サンドボックスで直接検めた: `last==prev metrics? true`。
**第38条(改善は前後の数値で証明する)を支える機構が、自分自身の重複で「改善なし」を量産する。**

**(c) `pulse.js` の断面 → dashboard** — `graph/pulse.js:426-437` は
`gauge.readLedger()` の全行を `ledger` 鍵に載せる(baseline は呼ばない設計 = 正しい)。しかし畳まないので:
```
pulse ledger rows (real) = 30
dashboard coin rows total= 6
  panel row 1 100 点  Δ= 0 2026-09-02T10:28:48.022Z
  panel row 2 100 点  Δ= 0 2026-09-02T10:27:50.031Z
  panel row 3 100 点  Δ= 0 2026-09-02T10:26:52.039Z
```
`dashboard/paradise.js:287-292 ledgerRows()`(slug で絞り ts 降順)→ `344-372 scoreCard()` が
先頭3行を「点数の履歴」として Δ 付きで描く。**画面に「+0」が三段並ぶ。**
これは pulse/dashboard の欠陥ではない — **源が汚れている。**

**(d) `verdict.js` は台帳を読まない** — `grep -n "readLedger\|ledger" graph/verdict.js` の結果は
27 / 68 / 158 / 194 行のコメントと defect 文言のみ。verdict が読むのは
`report.trajectory`(= `gauge.js score --json` の生値)であって台帳ではない。
**よって裁定の点数そのものは重複に汚染されない。** 汚染されるのは「推移・比較・画面」である。
(重複を「裁定が壊れる」と誇張しないため、ここは明示的に否定的所見として記す。)

### 1.5 呼び出し元の洗い出し (`grep -rn gauge`)

- **engine から `record`/`baseline` を呼ぶ者は居ない。** `graph/gauge.js` 内部(223/229/292/297)のみ。
- `graph/pulse.js:47,277,291-294,427-437` — `score()` と `readLedger()` のみ(書かない)。
- `dashboard/paradise.js:344-372` — 断面の `ledger` を描画(書かない)。
- 起動する唯一の主体は **人間/エージェントの手打ち**:
  - `overlay/commands/conclave.md:148` / `~/.claude/commands/conclave.md:148` → `gauge.js record $DIR/conclave.json --slug <slug>`
  - `overlay/commands/forge.md:85` / `~/.claude/commands/forge.md:85` → 同上
  - Hermes cron `jobs.json`(22時ジョブ)は `node graph/gauge.js ledger`(読み)だけを指示。
- `tests/dashboard-run-panel.test.js:191` の AC-22a が「pulse は baseline を呼ばない」を既に門にしている。
- **CI(`.github/workflows/tribunal.yml`)に `gauge` の記述は無い。** 台帳を検める門は現在ゼロ。

> **含意**: 非冪等性は「機械が暴走して積む」のではなく **「人/エージェントが同じ道を二度歩くと積む」**。
> `/conclave` の道は SHIP のたびに `record` を打てと書いてある。同じ run を再ship・再判定すれば必ず重複する。
> 重複は事故ではなく **道の設計どおりの帰結** である。

### 1.6 副次的に判明した事実(本欠陥とは別筋・記録のみ)

- 現在の `baseline()` の到達範囲: `baseline() reach = coin,habit,tenbin` の 3 件のみ。
  だが 09-02 のバッチは 5 slug ある。うち `reform-eval-gauge` は
  `git log -1 e05ece2` → `2026-09-08 02:56:28 +0900 第30条: reform-eval-gauge の走行帳を楽園 reform/eval-gauge/ へ移す` で
  **創造物の倉から楽園へ移された**。当時は倉に居たので baseline が拾えた、で整合する。
  `reform-claude-md-diet` は creations の git 履歴に一度も現れない(`git log --all -- 'reform-claude-md-diet*'` が空)ので、
  未追跡ディレクトリとして一時的に倉に居たと**推測**する(断定しない)。
- 台帳の `reform-claude-md-diet 80` は現在の実測 `score = 100` と食い違う
  (`node -e "gauge.score(reform/claude-md-diet/conclave.json)"` → `100`)。
  baseline がもうそこへ届かないため台帳が古いまま。**これは冪等性とは別の欠陥**(台帳の鮮度)であり、本改修の射程外として記録に留める。
- `node graph/workspace.js check` → `✓ 楽園に創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし` (exit 0)。

---

## 2. 「冪等」の定義候補 — 比較検討

前提として **追記型 JSONL は git マージで行が壊れうる**。これは思弁ではなく実測した:

```
$ (sandbox git repo) 枝A と枝B が末尾に別々の行を追記して merge
CONFLICT (content): Merge conflict in gauge-ledger.jsonl
=== file after conflict ===
{"ts":"T0",...}
<<<<<<< HEAD
{"ts":"T2","slug":"habit",...}
=======
{"ts":"T1","slug":"coin",...}
>>>>>>> A
=== readLedger on conflicted file ===
⚠️ ledger line skipped (corrupt): <<<<<<< HEAD…
⚠️ ledger line skipped (corrupt): =======…
⚠️ ledger line skipped (corrupt): >>>>>>> A…
parsed rows: 3 ["T0","T2","T1"]
```

**確定した性質**: (i) 末尾追記は必ず衝突する、(ii) `readLedger()`(187-198)は衝突マーカーを読み飛ばして
**残りを正しく読む**、(iii) 衝突解決後は **行順が時刻順とは限らない**(T0, T2, T1)。
→ **「行順」や「末尾」に意味を持たせる設計は壊れやすい。** これが以下の採点の主軸である。

### (a) record 時に「同一 slug × 同一 metrics 指紋」なら追記しない

- 長所: 汚染の源で止まる。台帳が小さいままで、下流(compare/pulse/dashboard)は一行も変えずに治る。
- 短所: **書く前に台帳全体を読む**ので、書き込みが読み取りに依存する(現在 `record` は読まない)。
  また「本当に同じ点が二度出た」正当な再測定を落とす — ただし metrics が同一なら情報量はゼロなので実害は小さい。
- 破損耐性: **高い**。破損行は `readLedger` が読み飛ばすので、最悪「重複を見逃して一行余分に書く」だけで、
  壊れ方が保守的(fail-open で増えるだけ、既存行は消えない)。
- 順序依存: 無い。指紋は行位置に依存しない。

### (b) baseline 専用に既存分をスキップ

- 長所: 実装が最小。`baseline()` だけを直せばよい。
- 短所: **欠陥の半分しか塞がない。** 1.5 の実測どおり、実運用で `record` を打つのは
  `/conclave` の道を歩く人間/エージェントであり、`record` 単独の二度打ちは素通りする。
  「baseline が悪い」という診断は原因の局在を誤っている — 悪いのは 209 行の無条件 append である。
- 破損耐性: (a) と同等だが、守備範囲が狭い。

### (c) 読み出し時に畳む(書き込みは自由)

- 長所: 書き込み経路を一切触らない。**既に台帳に入ってしまった重複も同時に治る**(遡及修正が不要)。
  実測: 現台帳 30 行に「同一指紋は先着を残す」を適用すると
  `raw 30 -> keep-first 6`(keep-last も 6)で、6 行の健全な基線に畳まれる:
  ```
  2026-08-31T13:54:12.961Z 100 coin
  2026-08-31T13:54:12.962Z  45 habit
  2026-08-31T13:54:12.963Z  80 reform-eval-gauge
  2026-08-31T14:01:25.440Z 100 reform-eval-gauge   ← 80→100 の本物の改善は残る
  2026-09-01T03:39:58.444Z 100 tenbin
  2026-09-02T07:03:12.473Z  80 reform-claude-md-diet
  ```
  **重要**: 畳んでも「改善を語る 80→100 の二行」は消えない。指紋が違うからである。
- 短所: 台帳ファイル自体は膨らみ続ける(git diff が毎回汚れる)。
  「先着を残すか後着を残すか」の選択が必要 — **先着(keep-first)** を採るべき。
  理由: 2 の冒頭で実測したとおりマージ後の**行順は時刻順ではない**ので「後着=新しい」は嘘になりうる。
  正しくは **ts の最小を残す**(観測が最初に成立した時刻こそ真の記録時刻)。
- 破損耐性: **最高**。書き込みは今までどおり単純 append(衝突しても readLedger が拾う)、
  読み側だけが賢い。壊れた行が混じっても畳み処理は生き残った行にだけ効く。

### (d) ts 以外のハッシュ(冪等鍵)を entry に持たせる

- 長所: (a)(c) の**土台**になる。指紋を各行が自分で名乗れば、読み側の畳みも書き側の検査も
  「その場で ts を除いて再計算する」暗黙知に頼らずに済む。将来 metrics に鍵が増えても
  (実際 `tier1/tier2/tier3/noTier/unobservable/tier3Ratio` は 166 行で後から足された)
  指紋の定義が一箇所に住む。
- 短所: **既存 6 行(コミット済み 5 行含む)には鍵が無い。** 後方互換の欠落値をどう扱うかを決める必要がある
  → 「鍵が無ければその場で計算する」フォールバックを持てば解決する。
- 破損耐性: 高い。行が自己完結する = 順序にも隣接行にも依存しない。これは JSONL の本旨と合う。

### 推奨(DISCOVER としての所見・決定は DESIGN 相の領分)

**(d) を土台に (a) + (c) を二重に敷く** のが最も壊れにくい。根拠:

1. **(c) 読み側の畳みは「治癒」である** — 既に汚れた台帳、他ブランチから流れ込んだ重複、
   マージで順序が乱れた台帳、そのすべてに対して**無条件に効く**。書き込み側の規律に依存しない。
2. **(a) 書き側の検査は「予防」である** — 台帳の物理的肥大とレビュー時の git diff 汚染を止める。
   ただし読み側が既に治癒するので、(a) が競合等で漏れても**壊れない**(defense in depth)。
3. **(b) 単独は不可** — 1.5 の実測(record を呼ぶのは人の手)により原因の局在を誤る。
4. 順序に意味を持たせない設計にすること。`latestFor`(241-244)の
   `hits[hits.length - 1]` と `compare --last N`(305)の `slice(-n)` は
   **どちらも行順を時刻の代理として使っている**が、2 冒頭の実測でその前提は破れている。
   畳むついでに **ts で並べ替える** べきである(これは冪等性と独立した既存の隠れ欠陥)。

---

## 3. 外部の先例 (出典URLつき)

### 3-1. AWS — 追記専用ログは「決定的な event ID を書き、読み手が ID で重複除去する」
> "**Append-only logs.** Write events with a deterministic event ID. Readers deduplicate on ID."
> また "Avoid `INSERT` without a uniqueness constraint" とも述べる。
> — AWS Durable Execution SDK Developer Guide, "Idempotency and retries"
> https://docs.aws.amazon.com/durable-execution/patterns/best-practices/idempotency/

**楽園への適用**: これは上記 (d)+(c) そのものである。「決定的な ID を書く」= 冪等鍵を entry に持たせる、
「読み手が除重する」= `readLedger()` で畳む。**業界の作法は「書き手を信じず読み手で畳む」側にある。**
現在の `gauge.js:209` は「一意制約の無い INSERT」に相当し、名指しで避けよと書かれている型である。

### 3-2. Stripe — 冪等鍵は「同じ鍵の再送は同じ結果を返し、二度目の作成を起こさない」
> "if a connection error occurs, you can safely repeat the request without risk of creating a second object"
> "Stripe's idempotency works by saving the resulting status code and body of the first request made for any given idempotency key"
> "The idempotency layer compares incoming parameters to those of the original request and errors if they're not the same"
> — Stripe API Reference, "Idempotent requests"
> https://docs.stripe.com/api/idempotent_requests

**楽園への適用**: 二点。(i) **先着の結果を正とする**(keep-first)という選択が業界標準であり、
2 節で行順が信用できないと実測した楽園にはとりわけ合う。
(ii) 「同じ鍵で中身が違えば**誤りとして鳴らす**」— 楽園に翻訳すると
**「同一 run を同一 slug で record したのに metrics が違う」は畳むのではなく矛盾として名指すべき**、となる。
これは実際に起こりうる(1.6 の `reform-claude-md-diet 80` vs 現在 `100`)。畳み一辺倒では、この矛盾を黙って隠す。

### 3-3. microservices.io — Idempotent Consumer パターン
> "a consumer must be idempotent: the outcome of processing the same message repeatedly must be the same as processing the message once."
> "Make a consumer idempotent by having it record the IDs of processed messages in the database... Since the `(subscriberId, messageID)` is the `PROCESSED_MESSAGE` table's primary key the `INSERT` will fail if the message has been already processed"
> — Chris Richardson, Pattern: Idempotent Consumer
> https://microservices.io/patterns/communication-style/idempotent-consumer.html

**楽園への適用**: 冪等性の定義そのもの(「一度処理した結果と同じ」)を明文で借りられる。
主キーによる INSERT 拒否は、ファイル台帳では「append 前に指紋の存在を検める」(a) に対応する。

---

## 4. 既に入ってしまった重複をどう扱うか

### 事実の確定
- 汚染 24 行は **すべて未コミット**(`git diff --stat` → `25 insertions`、`git show HEAD:` は健全な 5 行)。
- 台帳は creations 側の**追跡ファイル**であり、履歴の書き換え(rebase/filter-branch)は
  兄弟倉の PR #1/#2 のマージ履歴を巻き込む。実際 `git log` は
  `f826371 Merge pull request #2` を含む — **履歴書き換えは論外**。

### 選択肢の評価

| 案 | 内容 | 評価 |
|----|------|------|
| **A. 遡及削除(履歴書き換え)** | filter-branch 等で過去のコミットから重複行を消す | **却下**。コミット済み 5 行に重複は無く、書き換える対象が存在しない。共有履歴を壊す代償に見合う利得がゼロ |
| **B. 作業ツリーの未コミット分を捨てる** | `git checkout -- gauge-ledger.jsonl` で HEAD の 5 行に戻す | **有力**。24 行の重複はすべてここに居る。ただし `reform-claude-md-diet 80`(bf3ddeb6)は **HEAD に無い唯一の観測** なので、これも一緒に消える |
| **C. 畳んだ結果を1コミットで置く** | keep-first で 6 行に畳んだ内容を書き戻し、「重複を畳んだ」と明記して commit | **推奨**。実測で 30→6 になることを確認済み。HEAD の 5 行 + `reform-claude-md-diet 80` の計 6 行で、**観測は一つも失われない**。履歴は前に進むだけ(revert 可能) |
| **D. 何もせず読み側で畳む** | ファイルは汚いまま、`readLedger` が畳む | **併用すべき**。C を選んでも将来の重複は再び入りうる(他ブランチ・他走者)。読み側の畳みは恒久的な安全網 |

### 所見
**C + D**。すなわち「ファイルは一度きれいに畳んで**普通のコミット**で置く(履歴は書き換えない)。
同時に読み側にも畳みを入れて、以後どこから重複が流れ込んでも下流が誤らないようにする。」
「消す」ではなく「畳んだ版を新たに置く」なので、旧状態は `git show <sha>` でいつでも復元できる —
**台帳の第一の徳である『記録が失われない』を犠牲にしない。**

なお C を実施する PR は **creations 側リポジトリ** に立つ(台帳の住所は
`node graph/workspace.js root` → `C:\Users\kikus\Documents\workspace\paradise-creations`)。
engine の修正(paradise 側)と台帳の掃除(creations 側)は**別の PR になる**ことを、以後の相は前提にせよ。

---

## 5. 機械の門 — 故障注入の形での検査案

現状 CI(`.github/workflows/tribunal.yml`)に gauge 台帳の門は**一つも無い**(`grep -n gauge` が空)。
既存の唯一の関連門は `tests/dashboard-run-panel.test.js:191` の AC-22a(pulse が baseline を呼ばないこと)。
以下はすべて `PARADISE_CREATIONS` で仮の倉に振り替える既存作法
(`tests/paradise.test.js:2906-2932` が既にこの手を使っている)で書ける。

### G-1 【冪等性の核】baseline を二度走らせても台帳の行数が増えない
- 仕込み: 仮倉に conclave.json を 2 つ置き、`baseline()` → 行数 n を記録 → `baseline()` 再実行。
- 期待: 二回目の後も行数 = n。
- **故障注入(門が鳴ることの証明)**: 冪等検査を外した `record` を注入すると行数が 2n になり **exit 1**。
- 現状での挙動: 本調査の実測どおり 2 → 4 → 6 と増えるので、**この門は今書けば即座に赤くなる**(= 本物の門である)。

### G-2 【record 単独】同一 run を同一 slug で二度 record しても一行
- G-1 が baseline 経由なのに対し、こちらは `record()` を直接二度呼ぶ。
- **これが欠かせない理由は 1.5 の実測**: 実運用で record を打つのは `/conclave` の道を歩く人であり、
  baseline だけ守る門(案 b)ではこの道が素通りする。**門は実際に人が歩く道に立てる。**

### G-3 【偽の変化なしを禁ずる】重複台帳でも compare が Δ=0 を捏造しない
- 仕込み: 同一 metrics の行を 6 本積んだ台帳を作り、`latestFor` / `compare --last N` を呼ぶ。
- 期待: `--last 3` が **3 つの異なる観測**を返す(現状は同じ slug が二度出る — 1.4(a) の実測)。
- 故障注入: 畳み処理を外すと窓が重複で埋まり **exit 1**。

### G-4 【破損耐性の維持】衝突マーカー入り台帳でも畳みが働き、生きた行を落とさない
- 仕込み: 2 節で実測したとおりの `<<<<<<< / ======= / >>>>>>>` を含む台帳を書く。
- 期待: `readLedger()` が破損 3 行を読み飛ばし(既存挙動、現に `parsed rows: 3` を実測)、
  かつ**畳みを入れた後も生きた行数が減らない**。
- **狙い**: 冪等化の実装が readLedger の破損耐性を壊していないことの回帰門。
  「治した機能が別の機能を壊す」を機械で捕まえる。

### G-5 【順序に依存しない】行順を入れ替えても畳んだ結果が同一
- 仕込み: 同じ 30 行を shuffle した台帳を 2 通り作り、畳んだ結果(と `latestFor`)を比較。
- 期待: **完全一致**。
- **狙い**: 2 節で実測した「マージ後の行順は時刻順ではない(T0,T2,T1)」という事実に対する門。
  `hits[hits.length-1]`(241-244)や `slice(-n)`(305)のような**位置に依存する実装への回帰を永久に禁じる**。

### G-6 【矛盾を隠さない】同一 slug × 同一 run で metrics が食い違うときは畳まず名指す
- 3-2(Stripe「同じ鍵で中身が違えばエラー」)から借りる。
- 期待: 黙って先着を採るのではなく、矛盾として報告する経路が在ること。
- 1.6 の `reform-claude-md-diet 80` vs 現在 `100` が、これが机上の空論でないことを示す実例。

### G-7 【第30条の維持】台帳の住所を知るのは workspace.js だけ
- 既存 `workspace.js:108` の `hardcodedRefs` と `tests` の B-4
  (`✓ B-4: 走行帳の住所を知るのは workspace.js だけである (第30条)`、自己診断で緑を実測)が既にこれを守っている。
- 冪等化の実装が `gauge.js` に第二の住所解決(例: 指紋キャッシュファイルの置き場所)を持ち込まないことを確認する。
  **キャッシュファイルを別に作る設計は第30条に触れる** — 指紋は entry 自身が持つ(案 d)ほうが憲法と整合する。

---

## 付録: 本書の根拠となったコマンド一覧(すべて実行済み)

```
node -v                                                   → v24.14.0
git --version                                             → 2.55.0.windows.5
node tests/paradise.test.js                               → 344 passed, 0 failed
node graph/workspace.js root                              → ...\paradise-creations
node graph/workspace.js resolve --json                    → source=sibling, exists=true
node graph/workspace.js check                             → ✓ exit 0
node graph/workspace.js runs                              → paradise 6 本 / creations 3 本
node graph/gauge.js compare --last 5                      → 同一時刻 5 行(重複窓)
node graph/gauge.js compare coin habit                    → Δ 表(tier3Ratio が undefined で NaN)
node graph/gauge.js ledger 相当 (readLedger)              → 30 行
(creations) git status --short / wc -l / git diff --stat  → M, 30 行, +25
(creations) git show HEAD:gauge-ledger.jsonl              → 健全な 5 行
(creations) git log --oneline -- gauge-ledger.jsonl       → 7791cdf, f804697
(creations) git log -1 --date=iso e05ece2                 → 2026-09-08 第30条の移送
sandbox: PARADISE_CREATIONS 振替 + baseline ×3            → 2 / 4 / 6 行、distinct 2
sandbox: git 2 枝で末尾追記 → merge                       → CONFLICT、readLedger が 3 行を救出(T0,T2,T1)
node -e 指紋畳み (keep-first)                             → raw 30 -> 6
grep -rn "gauge" (repo 全体 / ~/.claude / hermes cron)    → 呼び出し元は手打ちの record のみ、CI に門なし
grep -n "readLedger|ledger" graph/verdict.js              → 台帳を読まない(コメントのみ)
```

**未確認として正直に残すこと**:
- 09-02 の 5 バッチを**誰が**打ったかは特定できていない。cron の 22 時ジョブは `gauge.js ledger`(読み)しか指示していないので、
  教主または神官の手打ちと**推測**するが、証跡は無い。
- `reform-claude-md-diet` が当時 creations 直下に居たことは、ledger に行が在る事実からの**推測**であり、
  creations の git 履歴には現れない(未追跡だった可能性)。
- `compare coin habit` の出力で `tier3Ratio` が `undefined → NaN` になる件を実測したが、
  これは古い台帳行に序列鍵が無いことに由来する**別の欠陥**であり、本改修の射程外として記録に留める。
