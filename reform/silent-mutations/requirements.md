# reform `silent-mutations` — specify 相 requirements

> 走行: `reform/silent-mutations` / 相: specify
> 入力: `reform/silent-mutations/findings.md` (730行 / discover 相の実測)
> 機: Windows 11 / git-bash / Node `v24.14.0`
> 基線(本相の開始時に実測): `git status --short` = `?? reform/silent-mutations/` のみ /
> 実台帳 `paradise-creations/gauge-ledger.jsonl` = 7 行 / sha256 `955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77`
>
> **本相は一行も実装していない。** `graph/*.js` と `tests/*.js` の sha256 は discover 相の終了時と同一である。
> 本文書が作る唯一のファイルはこの一枚である。

---

## 1. 入力の要約 — discover が何を測ったか(数で)

| 主題 | 撃った数 | 結果 |
|---|---|---|
| **A: TOCTOU(同一 run を N プロセス同時 `record`)** | 並列度 2 で 50 試行 / 4 で 20 / 8 で 20 = **90 試行** | **90/90 (100%) 破れた。** 行数は常に丁度 N。`skipped` の誤報は **0 回**(期待 250 回) |
| **A: `baseline` の二重走行** | 2 プロセス 20 試行 / 4 プロセス 20 試行 | **40/40 破れた。** 行数 = 創造物数 × プロセス数 |
| **A: 競合窓の幅** | 9 水準 × 10 = 90 試行 | d≤5ms で 10/10、d=10ms で 9/10、**d≥20ms で 0/10** → 窓は **10〜20ms**(台帳 7 行での値) |
| **A: `appendFileSync` の原子性** | 4 水準 × 8 proc × 25 = 800 行 + 2 水準 × 4 proc × 3 = 24 行 | **切れ 0 / 混線 0 / 欠損 0 byte**(64MB の一行まで) |
| **A: 治癒(`foldLedger`)** | 重複 1〜7 行の台帳 | `readLedger()` = **常に 1 行**。`--audit` は `duplicates=N-1 conflicts=0 corrupt=0` / **exit 1** |
| **B: 変異を撃って門を走らせる** | **60 変異** | **鳴った 46 / 無音 14 = 無音率 23.3%** |
| **B: 無音 14 件の triage** | 14 件を実測で分類 | **【致命】4 /【重大】5 /【軽微】3 /【好み】1 / 神官自身の欠陥 1** |
| **層別の無音率** | 9 層 | **門の書き方 40% (4/10) が最悪** / baseline 走査 38% / 時刻 36% / spawn-trace 33% / 並行性 0% / exit 0% |
| **基線** | 無変異の全走 1 回 | `471 passed, 0 failed` / 約 6 分 |
| **規律違反(隠さず記録)** | 1 件 | 変異 W1 が住所の振替を無効化し、**実台帳に 14 行が書き込まれた**(復旧済 / sha256 一致確認) |

**本相が受け取った欠陥は D-A 〜 D-L の 12 件。**

**discover が最も重要と名指した一文**(findings §6-1):
> `withGaugeSandbox` が `require.cache` を捨てる作法は門の独立性のために正しいが、
> その作法は「モジュール大域の状態」と「住所解決の破壊」の二つを同時に**観測不能**にしている。

---

## 2. 本走行の射程 — 今直す / 次に回す / 意図して残す

**この走行は一つの PR で閉じる。** 12 件を三つに割る。残すものには「なぜ今やらないか」を書く(第16条: 見落としと意図した残債は別物である)。

**射程を切る物差しは二つ**:
1. **無音率が最悪の二層を閉じる**(門の書き方 40% / 時刻 36%)。この二層は「変異を足して埋まる穴ではない」と discover が名指した層である。
2. **実装を変える件は最小に絞る。** 今日正しい振る舞いを凍らせるだけの門は安いが、`graph/gauge.js` の振る舞いを動かす修理は既存 114 門の前提を揺らす(§6)。

### 2-1. 今直す(7 件)

| # | 欠陥 | 分類 | なぜ今か |
|---|---|---|---|
| **D-A** | 門が `PARADISE_CREATIONS` の振替**だけ**に頼り、住所解決を壊す変異が実台帳を汚せる | 【致命】 | **実害が実際に起きた**(W1 が実台帳に 14 行)。これは仮定ではなく本走行の事故である。教主の裁定により交渉不可 |
| **D-C** | 序列の一行(`underEra` / `TIER_EPOCH_AT`)を動かすと点が 60→100 に跳ぶのに門が一本も無い | 【致命】 | gauge の点は `verdict` の SHIP/REWORK を分ける。engine の一行で全歴史の点が動く。交渉不可 |
| **D-D** | `record` が「台帳」でなく「プロセスの記憶」を信じる形に退行しても無音 | 【致命】 | 台帳の第一の徳「記録が失われない」(第55条 e)が破れる。門は同一プロセス内で書ける = 最も安い致命。交渉不可 |
| **D-E** | `ts` が壊れた既存行が「正当な先着」に昇格する退行に門が無い | 【致命】 | F-1 が塞いだ窓が再び開く。**正当な観測が刻まれなくなる**方向の破れ。交渉不可 |
| **D-B** | `record` の TOCTOU が並列度 100% で破れる | 【重大】 | 教主が裁定を命じた件。**裁定 = β + γ の複合、α は却下**(§2-4 に根拠)。治癒が競合下で成立することを門で凍結し、`--audit` の信号を分ける |
| **D-F** | 同一プロセスで `score` を二度呼ぶと点が変わる退行に門が無い | 【重大】 | **決定性は gauge の第一の約束**(第38条の条文が明記)。今は CLI 一回撃ちでしか検められていない。`withGaugeSandbox` の内側に 5 行で書ける = 致命 4 件と同じ節に同じ形で入る |
| **D-L** | 「モジュール大域を足す」こと自体を検める門が無い | 【軽微】 | 分類は軽微だが**層の根**である。G4(未使用の大域・無音)と G5(使う・5門が鳴る)は**一行差**であり、G6 / G8 も同じ層に住む。教主が名指した件。静的な門は楽園に先例が多数ある(§3-3) |

### 2-2. 次に回す(3 件) — 名前を付けた残債

| # | 欠陥 | 分類 | **なぜ今やらないか** |
|---|---|---|---|
| **D-G** | 監査と `record` で時刻の物差しが割れても無音(T7 / 2 日先の毒だけ素通り) | 【重大】 | 正しい修理は「物差しを一箇所に住まわせる」= `graph/gauge.js` の **`preemptionReasons`(:579)と `audit` の入口(:770-775)に散っている判定を一つの関数に畳む**リファクタである。本走行は 21 本の門を足す PR であり、同じ PR で gauge.js の構造を動かせば、赤が出たときに**門の欠陥か構造の欠陥か切り分けられない**(第57条: 修理は掟を広げてはならない)。**残債の名**: `SM-G`。**払う条件**: 物差しの一本化を単独の PR で行い、その PR に「`record` が先回りと呼ぶ行は `--audit` も必ず suspect と呼ぶ」門を同梱する |
| **D-H** | `baseline` が junction を辿らないのは `Dirent.isDirectory()` の性質頼みで門が無い(B7) | 【重大】 | **CI は ubuntu であり `mklink /J` が存在しない。** 素直に書けば CI で常に skip する門になり、第37条の意味で「不在は通過ではない」を自分で破る。跨プラットフォームで同じ性質を撃つには `fs.symlinkSync(target, link, 'junction' \| 'dir')` の分岐設計が要り、それは design 相の仕事である。**残債の名**: `SM-H`。**払う条件**: 「倉の外の run-state は刻まれない」を win32 と posix の**両方**で撃てる形を設計してから建てる |
| **D-I** | `conclave.json` 以外の `.json` も run-state として拾う退行に門が無い(B8) | 【重大】 | 門自体は安い(仮倉に `package.json` / `forge.dag.json` を置いて 1 行を期待するだけ)。だが**拾ってよいファイル名の集合**(`conclave.json` + `*.run.json`)が今は `baseline()` の本体に埋まっており、門を書けばその集合が**二箇所に住む**(第29条/第48条: 同じ問いに二つの答えを持てばいつか食い違う)。集合を定数に括り出すのは実装変更であり、本走行の「実装は最小」方針を破る。**残債の名**: `SM-I`。**払う条件**: `RUN_STATE_NAMES` を `gauge.js` の最上位定数に括り出す PR と同時に建てる |

### 2-3. 意図して残す(2 件) — 直さないと決めた

| # | 欠陥 | 分類 | **残す理由** |
|---|---|---|---|
| **D-J** | `CLOCK_SKEW_TOLERANCE_MS` を 0 にしても鳴らない(T2) | 【重大】 | **破れ方が「沈黙」ではなく「騒音」である。** 実測: 変異版は正常な台帳に対し `audit exit 2 suspect=1` を返す —— **恒常的に赤くなる**。記録は失われない(record は双方 exit 0 / 行数 2)。楽園の門は CI に繋がっており、恒常赤は **人が必ず気づく**。門が見ていない層ではなく、**門の下流の人間が見る層**である。ゆえに「無音のまま本番で壊れる」形の危険には該当しない。**ただし D-G(SM-G)を払うとき、同じ定数を読む経路として一緒に門を建てよ**(第61条 b: 触れた定数を読む全ての経路を辿れ) |
| **D-K** | `alienKeys` の名指しの列が入力順依存になっても鳴らない(A2) | 【軽微】 | 実測で **exit code は双方 2 で不変**、行の増減も無く、記録も判定も一切変わらない。壊れるのは**人が読む一行の語順**だけである(`apple, zebra` か `zebra, apple` か)。実害は「grep での照合が崩れる」ことに限られ、その照合を誰かが実際に行っている証拠は discover に無い。**証拠の無い害のために門を一本足せば、全走 6 分 × CI 2 回の代を全員が永久に払う。** 直さないと決める |

**合計: 今直す 7 / 次に回す 3 / 意図して残す 2 = 12。一件も落としていない。**

### 2-4. D-B の裁定 — **β + γ を採り、α を却下する**

**実測(findings §A-2 / §A-3):**
- 並列度 2/4/8 のすべてで **100% 破れる**(90 試行中 90)。
- しかし**破れ方は一種類だけ**である —— 「全員が書く」。`skipped` の誤報は **0 回 / 250 回の機会**。
- `readLedger()`(既定 = 畳む)は**常に 1 行**を返す。`compare` / `pulse` / dashboard は正しい答えを見る。
- `--audit` は `duplicates=N-1 conflicts=0 corrupt=0` と**正しく分類**し exit 1。
- **記録が失われる方向には一度も倒れていない。**

**(α) ロックの導入 — 却下する。** 理由は三つ、いずれも実測または条文に基づく。
1. **fail-open と正面から衝突する。** 第55条(e) は「冪等化は fail-open に倒す。台帳が読めないときは重複を見逃して書く側に倒し、既存の行は決して消さない」と命じる。ロックは「書けない」側の故障を新設する —— 異常終了で lock が残れば**以後すべての `record` が詰まる**。これは「記録が失われない」という台帳の第一の徳を、**今日実測されていない害を防ぐために**壊す取引である。
2. **Node 標準に `flock` が無い。** findings §A-8 が API の不在を確認済。`proper-lockfile` 等は外部依存であり、楽園は外部依存ゼロを掟としている。自前のロックファイル(`openSync(lock,'wx')` + retry)は待ち時間も stale 検出の閾値も**一つも測られていない**(§A-8「未実測」)。**測っていない代償を、測った実害(ゼロ)のために払うことはできない**(第38条)。
3. **治癒が既に成立している。** 予防が漏れても治癒が拾うという design の主張は、**この形の競合については実測で成立している**(§A-3)。予防を二重にするより、**治癒が競合下でも成立し続けることを凍結する**方が安い。

**(β) 治癒が競合下でも成立することを門で凍結する — 採る。** これが本裁定の本体である。
今日の実測(重複 N-1 行 → 畳んで 1 行)は**誰も門にしていない**。`foldLedger` を弱める変異(例: `readLedger` が常に生を返す)を撃てば、`compare` の窓が競合のたびに汚れる。**治癒に寄りかかると決めたなら、治癒が支柱であることを門にせねばならない。** → AC-13。

**(γ) `--audit` が競合由来の duplicates を「人の手を要する事故」と区別する — 採る。ただし exit code は一切動かさない。**
実測が示した運用上の噛み合わせの悪さ: **同時 `record` が起きる運用で `--audit` を CI に繋ぐと恒常赤になる。** だが exit の規約(0 = 健全 / 1 = 機械が畳める欠陥 / 2 = 人が読むべき事故)は**既存 5 門が符号化している**(§6)。ゆえに信号の分離は**文面と `--json` の欄**で行う。 → AC-15。

**(α への戻り道を残す。)** β/γ を採るのは「今日の実測に基づく裁定」であって「永久にロックは要らない」ではない。**AC-14 の測定 M1〜M4 のいずれかが破れた日に、α の代償を測る価値が生まれる。** その条件を数で書いてある。

---

## 3. FR(機能要件) — 実装をどう変えるか

### FR-1. `graph/gauge.js` の**判定の振る舞いは一切変えない**

D-C / D-D / D-E / D-F / D-I の門はすべて **「今日正しい振る舞いを凍らせる」** 門である。discover の実測はこれらの変異が**実装を壊す**ことを示したのであって、実装が壊れていることを示したのではない。

**`score` / `record` / `preemptionReasons` / `foldLedger` / `readLedger` / `baseline` / `fingerprint` の返り値と exit code を一切変えてはならない。** 変更してよいのは `--audit` の**出力の文面**と `--json` の**欄の追加**のみ(FR-5)。

### FR-2. `tests/paradise.test.js` に実台帳の番兵を足す(D-A)

**捕捉点の裁定: `withGaugeSandbox` の finally(第一段)+ 独立した門(第二段)。`hermetic.js` の拡張は却下する。**

- **`hermetic.js` を却下する理由**: `hermetic.js` は `tests/*.js` を**静的に**走査し、`ROOT` / `DIR` / `__dirname` 起点の**版管理下**ファイルへの書き込みを名指す engine である。実台帳は**兄弟倉**(`paradise-creations`)に住み、**paradise の git の追跡下に無い**。`trackedSet()` は paradise の `git ls-files` を読むので、兄弟倉の台帳は**構造的に見えない**。さらに W1 の害は**動的**である —— ソースは無変更で、engine が走行時に別の住所を解決した。**静的な走査器は W1 を原理的に見られない。** そして hermetic.js に兄弟倉を教えれば、兄弟倉への第二の住所が生まれる(第30条: engine が兄弟倉へ持つ道は `graph/workspace.js` ただ一本)。
- **第一段(`withGaugeSandbox` の finally)**: 門ごとに撃つ。**どの門が汚したかを名指せる**(第21条 b: 誰が名指したかを報告せよ)。W1 のとき discover は「60 変異のうちどれが汚したか」を事後に時刻から推理する羽目になった —— 番兵が門ごとに立てば、その推理は要らない。
- **第二段(独立した門)**: `withGaugeSandbox` を通らない経路(`runGaugeGate` の子プロセス / `tests/gauge-audit.test.js` の `audit()`)を覆う。gauge 節の**末尾**に立ち、節の開始時に取った digest と照合する。

### FR-3. 最上位の可変大域を静的に検める検査を足す(D-L)

**射程: `graph/gauge.js` と `graph/spawn-trace.js` の最上位スコープのみ。**

- **拒む**: (i) 最上位の `let` / `var` 宣言、(ii) 最上位 `const` に束ねた値への破壊的操作(`X = `、`X.prop = `、`X[k] = `、`X.push/set/add/delete/clear/pop/shift/unshift/splice/sort/reverse(`)。
- **許す**: 数値・文字列・正規表現の `const`、`Object.freeze(...)` の表、`require(...)` の束縛、最上位の関数宣言と矢印関数の束縛。
- **偽の赤を出さないことを本相で実測した** —— 今日の計測値:

| ファイル | 最上位 `let`/`var` | 最上位 `new Map`/`Set` | 最上位束縛への破壊的操作 |
|---|---|---|---|
| `graph/gauge.js` | **0** | **0** | **0** |
| `graph/spawn-trace.js` | **0** | **0** | **0** |
| (参考) `graph/hermetic.js` | 1 (`:516 let TRACKED = null`) | 0 | 2 (`:519` `:522`) |
| (参考) `graph/workspace.js` | 0 | 1 (`:195`・不変の表) | 0 |

- **なぜ `graph/` 全体に掛けないか**: `hermetic.js` が git の一覧の memo(`TRACKED`)を最上位に持つため、全体に掛ければ**即座に偽の赤**になる。射程を広げるのは別の走行の仕事である(第57条)。**射程をコードに書き、CLI が毎回名乗れ**(第44条 c: 理由の書けない除外は見逃しである)。

### FR-4. 競合下の治癒を凍結する門を足す(D-B β)

**住所の裁定: `tests/paradise.test.js` の gauge 節。新しい `tests/*.test.js` は一枚も作らない。**

- **理由**: (i) 子プロセス 2 本 + spin barrier の実測見積は **< 500ms** であり、全走 6 分に対し 0.15% 未満。(ii) 新ファイルは `graph/wiring.js check` の孤児検査(第44条)+ `tribunal.yml` の一段 + `graph/census.js fix` の手当てを要し、**CI の段が一つ増える代**が門の代より高い。(iii) `runGaugeGate`(`tests/paradise.test.js:3556`)が既に「門を子プロセスとして撃つ」作法の先例を持つ。
- **ゆえに `.github/workflows/tribunal.yml` は本走行で一行も変わらない。** `node graph/wiring.js check` の孤児は 0 のままである。
- **もし design 相がこれを覆して新ファイルを作るなら**(第44条の要求): `tests/gauge-concurrency.test.js` を作り、`tribunal.yml` の `📒 Gauge ledger — 台帳の監査が働くか (第55条 / 第37条)` 段(`run: node tests/gauge-audit.test.js`)の**直後**に

  ```yaml
      - name: 🔀 Gauge concurrency — 競合下でも治癒が成立するか (D-B / 第55条 b)
        run: node tests/gauge-concurrency.test.js
  ```

  を足し、`node graph/wiring.js check` が孤児 0 を答えることと `node graph/census.js fix` で README の門数が測り直されることを**同じ PR で**確かめよ。

### FR-5. `--audit` の信号を分ける(D-B γ)— **exit code は凍結する**

- `--audit` の人が読む出力に、`duplicates > 0 && conflicts === 0 && corrupt === 0 && suspect === 0` のとき **「機械が畳めば消える(競合の跡)」** と明示する一行を足す。
- `--json` に `healable: true|false` の欄を足す(`true` = 掃除で消える / `false` = 人が読むまで消えない)。
- **exit code の規約(0/1/2)を一切変えてはならない。** 既存 5 門がこの規約を符号化している(§6)。

### FR-6. 憲法に**第62条**を足す(§7 に文案)

足したら同じ PR で `node graph/codex.js index --write` → `node graph/codex.js check` を走らせる(手で索引を書くな)。

### FR-7. 数を測り直す

門を足すので `node graph/census.js fix` を走らせる。**README の「門 471 本」を手で書き換えてはならない**(第22条)。

---

## 4. AC(受入条件)

各 AC は **門の住所 / 入力 / 期待(exit code と文面)/ 壊し方(第21条)/ 測定可能性(第38条)** を持つ。
「壊し方」に書いた一行は、prove 相の神官が**そのとおりに書き換えて赤を確かめる**ためのものである。
故障注入は必ず **`mkdtempSync` の複製**に対して行え(第58条(c) / `graph/hermetic.js check` が現物への書き込みを名指しで赤にする)。

---

### AC-1 — 番兵が `withGaugeSandbox` の finally に立つ(D-A / 第一段)

- **門の住所**: `tests/paradise.test.js` の gauge 節、`withGaugeSandbox`(`:3459`)の `finally`。**これ自体は門ではなく門の器**である(門は AC-2/3/4)。
- **入力**: gauge 節の開始時(`GAUGE_JS` の宣言の直後)に実台帳の digest を一度だけ採る。
  ```js
  const REAL_LEDGER = path.join(require(WORKSPACE_JS).resolve().root, 'gauge-ledger.jsonl');
  const REAL_DIGEST = fs.existsSync(REAL_LEDGER)
    ? require('crypto').createHash('sha256').update(fs.readFileSync(REAL_LEDGER)).digest('hex') : null;
  ```
  `withGaugeSandbox` の `finally` は **env を戻し `require.cache` を捨て仮倉を消した後**に digest を採り直し、`REAL_DIGEST` と照合する。
- **期待**: 一致すれば無言。食い違えば `Error('実台帳が書き換えられた — 門は仮倉としか話してはならない (D-A / 第30条): <gate名> / before=<sha> after=<sha>')` を投げる。
- **順序の掟**: **番兵は本体の例外を飲み込んではならない。** `finally` の中で先に env 復元と cache 破棄を済ませ、番兵の判定はその**後**に置く。本体が既に投げているときは番兵の Error で上書きしない(本体の例外を優先し、番兵の所見は `console.error` で名乗る)。
- **測定可能性**: 本相で実台帳に書き込まれた行数 **14 → 0**。番兵が覆う門の数 **0 → 114**(`--gate gauge --gate 門ヘルパー` の実測本数 116 のうち `withGaugeSandbox` を通る本数)。

---

### AC-2 — 番兵は本体の例外を飲み込まない(D-A)

- **門の住所**: `tests/paradise.test.js` の gauge 節。門名 `gauge(番兵): 実台帳の番兵は本体の例外を飲み込まない (D-A / 第16条)`。
- **入力**: 実台帳を**汚さない**まま、`withGaugeSandbox` の本体で `throw new Error('BODY-BOOM')` を投げる。
- **期待**: `assert.throws(() => withGaugeSandbox(() => { throw new Error('BODY-BOOM'); }), /BODY-BOOM/)` が通る。門は exit 0(緑)。文面に `BODY-BOOM` が現れ、`実台帳が書き換えられた` は現れない。
- **壊し方(第21条)**: `withGaugeSandbox` の `finally` の中で番兵を**無条件に**投げる形にする。すなわち
  `if (after !== REAL_DIGEST) throw new Error(...)` を `throw new Error('実台帳が書き換えられた — ' + after)` の一行に書き換える。
  → この門が `BODY-BOOM` を受け取れず exit 1 で鳴る。
- **測定可能性**: 本体の例外が呼び手に届く率 **1/1**。番兵が例外を差し替えた回数 **0**。

---

### AC-3 — 番兵は実台帳が不在の機で **skip を名乗る**。そして不在でも門は歯を持つ(D-A / 第37条)

- **門の住所**: `tests/paradise.test.js` の gauge 節。門名 `gauge(番兵): 実台帳が無い機でも番兵は歯を持つ — 不在は通過ではない (D-A / 第37条)`。
- **入力**: 二段で撃つ(`tests/gauge-audit.test.js` の (a)/(b) 二段作法の踏襲)。
  - **(a) 偽の実台帳**: `mkdtempSync` で作った倉に `gauge-ledger.jsonl` を一行置く。
    ```
    {"ts":"2026-09-01T00:00:00.000Z","slug":"sentinel-fixture","scale":"standard","metrics":{"score":100,"complete":true,"phasesTotal":1,"phasesDone":1,"domainsTotal":1,"domainsRatified":1,"firstPassRate":1,"reworkCount":0,"retryOverhead":0,"loopGuardTrips":0,"durationMs":1000}}
    ```
    番兵の判定関数(digest 採取と照合を担う純関数)に、この偽の実台帳の前後 digest を渡す。**一行追記した後**で撃つ。
  - **(b) 本物**: 実台帳が在る機では digest を照合。無ければ
    `· skip: 実台帳が無い(<path>)— 兄弟倉は楽園の倉に付いてこない。番兵自体の歯は上の (a) が撃っている`
    を **`console.log` で名乗って** 通す(第58条(e) / `tests/route-debt.test.js:69` の先例)。
- **期待**: (a) は照合が `false` を返し文面に `実台帳が書き換えられた` を含む。(b) は神の機で exit 0 かつ digest が `955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77`、CI では `· skip:` を名乗って exit 0。**黙った緑は禁じる。**
- **壊し方(第21条)**: 番兵の不在枝 `if (!fs.existsSync(REAL_LEDGER)) { console.log('      · skip: ...'); return true; }` を
  `if (!fs.existsSync(REAL_LEDGER)) return true;` に書き換える(`console.log` を落とす)。
  → この門が「skip を名乗っていない」で exit 1 で鳴る(`assert.ok(/· skip: 実台帳が無い/.test(out))`)。
- **測定可能性**: CI(兄弟倉なし)で番兵の歯を撃つ門の本数 **0 → 1**。skip を名乗らずに通る経路 **1 → 0**。

---

### AC-4 — W1 の変異を複製に注入すると番兵が名指しで鳴る(D-A / 実害の再現)

- **門の住所**: `tests/paradise.test.js` の gauge 節。門名 `gauge(故障注入): 住所解決を壊す変異(W1)を番兵が名指す — 本走行の実害の再現 (D-A)`。
- **入力**: `injectGauge`(`:3541`)で `graph/gauge.js` の複製を作り、`ledgerPath` を振替から外す。
  注入する変異(ソースの一行):
  ```js
  // 元: return path.join(workspace.resolve().root, LEDGER_NAME);
  // 後: return path.join(__dirname, '..', '..', 'paradise-creations', LEDGER_NAME);
  ```
  ただし **実台帳を実際に汚してはならない** —— `injectGauge` の複製は `mkdtempSync` 配下に住むので `__dirname` は仮倉を指し、**偽の「実台帳」を仮倉の中に立てて**撃つ。すなわち注入は
  ```js
  // 後: return path.join(__dirname, 'FAKE-REAL', LEDGER_NAME);
  ```
  とし、`<sandbox>/FAKE-REAL/gauge-ledger.jsonl` を偽の実台帳として digest を採る。
- **期待**: `runGaugeGate` で注入版を撃つと偽の実台帳の digest が変わり、番兵の判定関数が `false` を返す。実物の `graph/gauge.js` で同じ手順を撃つと digest は不変(`true`)。**片側だけでは門ではない**(第21条)。文面に `実台帳が書き換えられた` と**注入版のファイル名**が現れる。
- **壊し方(第21条)**: 番兵の照合を `return true;` の一行に潰す(`return after === before;` → `return true;`)。
  → この門が exit 1 で鳴る(注入版でも `true` が返るため)。
- **測定可能性**: 住所解決を壊す変異が番兵を素通りする率 **1/1 → 0/1**。

---

### AC-5 — `stripped` の走行は罰される(D-C / S1・S4 の封鎖)

- **門の住所**: `tests/paradise.test.js` の gauge 節。門名 `gauge: 印を消した走行(stripped)は序列の罰を免れない (D-C / 第52条)`。
- **入力**: `withGaugeSandbox` の内側で、**紀元以後に convene され、`epoch` の印を持たず、4 相すべてが `done` で `tierTrace` を持たない** run-state を組む。
  ```js
  const run = { created: '2026-09-10T00:00:00.000Z',      // TIER_EPOCH_AT (2026-09-03T04:54:49.000Z) より後
    domains: [{ status: 'ratified', phases: [
      { id: 'a', status: 'done', attempts: 1 }, { id: 'b', status: 'done', attempts: 1 },
      { id: 'c', status: 'done', attempts: 1 }, { id: 'd', status: 'done', attempts: 1 }] }],
    history: [{ ts: '2026-09-10T00:00:00.000Z', event: 'convene' },
              { ts: '2026-09-10T00:30:00.000Z', event: 'complete' }] };
  ```
  (`epoch` 鍵を持たない = 印を消した走行)
- **期待**: `g.score(run).score === 60` かつ `g.score(run).noTier === 4` かつ `g.score(run).unobservable === 0`。
  `assert` の文面: `印を消した走行が満点を得た — 第52条の門を回避できる (D-C)`。門は exit 0。
- **壊し方(第21条)**: `graph/gauge.js:149` の
  `  const underEra = (r) => trace.epochStatus(r) !== 'legacy';`
  を
  `  const underEra = (r) => trace.epochStatus(r) === 'present';`
  に書き換える(= 変異 S1)。→ `score` が **100**、`noTier` が **0**、`unobservable` が **4** になり、この門が exit 1 で鳴る。
- **測定可能性**: 印を消した走行の点 **100(変異版)vs 60(実物)** の差 40 点を門が凍結する。S1 が鳴らす門の本数 **0 → 1**。

---

### AC-6 — `TIER_EPOCH_AT` の値を門が固定する(D-C / S4 の封鎖)

- **門の住所**: `tests/paradise.test.js` の gauge 節。門名 `gauge: 紀元の日付は黙って動かない — TIER_EPOCH_AT の値を固定する (D-C / N18 と同じ作法)`。
- **入力**: `const trace = require(path.join(DIR, '..', 'graph', 'spawn-trace.js'));`(cache を捨てる必要は無い — 定数の照合である)。
- **期待**:
  ```js
  assert.strictEqual(trace.TIER_EPOCH_AT, '2026-09-03T04:54:49.000Z',
    '紀元が黙って動いた — engine の一行で全歴史の点が動く (D-C / 第52条)。' +
    '正当に動かすなら、この門も同じ PR で動かせ(N18 の g1: と同じ掟)');
  assert.strictEqual(trace.epochStatus({ created: '2026-09-10T00:00:00.000Z' }), 'stripped');
  assert.strictEqual(trace.epochStatus({ created: '2026-08-01T00:00:00.000Z' }), 'legacy');
  ```
  門は exit 0。
- **壊し方(第21条)**: `graph/spawn-trace.js:100` の
  `const TIER_EPOCH_AT = '2026-09-03T04:54:49.000Z';   // = 2026-09-03T13:54:49+09:00`
  を
  `const TIER_EPOCH_AT = '2099-01-01T00:00:00.000Z';`
  に書き換える(= 変異 S4)。→ この門が exit 1 で鳴り、`epochStatus` の二本目の assert も `legacy` に倒れて鳴る。
- **測定可能性**: 紀元を未来へ動かす変異が鳴らす門の本数 **0 → 1**。全走行が `legacy` に倒れたときの点の跳ね **60 → 100** を門が禁じる。

---

### AC-7 — 台帳を外から空にすれば `record` は記録を復活させる(D-D / G8 の封鎖)

- **門の住所**: `tests/paradise.test.js` の gauge 節。門名 `gauge: record は台帳を信じ、プロセスの記憶を信じない (D-D / 第55条 e)`。
- **入力**: `withGaugeSandbox` の内側。**同一プロセスで完結する**(プロセスを跨がない = 最も安い致命の門)。
  ```js
  const run = path.join(tmp, 'run.json');
  fs.writeFileSync(run, JSON.stringify(makeGaugeRun()));
  const a = g.record(run, 'revive');                 // 1 行目
  const b = g.record(run, 'revive');                 // 冪等 → skipped
  fs.writeFileSync(g.ledgerPath(), '');              // ★ 台帳を外から空にする(仮倉なので hermetic は緑)
  const c = g.record(run, 'revive');                 // ★ 記録が復活せねばならない
  ```
- **期待**:
  ```js
  assert.strictEqual(b.skipped, true, '二度目が既記録を名乗っていない(前提)');
  assert.ok(!c.skipped, '台帳を空にしても「既記録」を名乗った — record がプロセスの記憶を信じている (D-D)');
  assert.strictEqual(g.readLedger({ raw: true }).length, 1, '記録が復活していない — 台帳の第一の徳が破れた');
  assert.strictEqual(c.fp, a.fp, '復活した行が別の鍵を名乗った');
  ```
  門は exit 0。
- **壊し方(第21条)**: `graph/gauge.js:627` の
  `    const idx = index instanceof Map ? index : keyIndex(readLedger({ raw: true }));`
  を
  `    const idx = index instanceof Map ? index : (record.__seen || (record.__seen = keyIndex(readLedger({ raw: true }))));`
  に書き換える(= 変異 G8 と同型)。→ 三度目が `skipped` を名乗り台帳が **0 行**のままになり、この門が exit 1 で鳴る。
- **測定可能性**: 台帳を空にした後の行数 **0(変異版)vs 1(実物)**。G8 が鳴らす門の本数 **0 → 1**。

---

### AC-8 — 読めない `ts` の既存行は「正当な先着」に昇格しない(D-E / T9 の封鎖)

- **門の住所**: `tests/paradise.test.js` の gauge 節。門名 `gauge: ts が読めない既存行は正当な先着ではない (D-E / F-1 の回帰)`。
- **入力**: `withGaugeSandbox` の内側。`record` が刻む行と**同じ指紋**を持ちながら `ts` が壊れている行を、先に台帳へ置く。
  ```js
  const run = path.join(tmp, 'run.json');
  fs.writeFileSync(run, JSON.stringify(makeGaugeRun()));
  const probe = g.record(run, 'poison');                    // 正規の行を一度刻んで fp を得る
  const fp = probe.fp;
  fs.writeFileSync(g.ledgerPath(), JSON.stringify({ ...probe, ts: 'not-a-time' }) + '\n');  // 台帳を毒行だけにする
  const r = g.record(run, 'poison');
  ```
- **期待**:
  ```js
  assert.ok(!r.skipped, '読めない ts の行を正当な先着として黙って skip した (D-E / T9)');
  assert.strictEqual(r.preempted, true, '先回りを名乗っていない');
  assert.ok(r.reasons.some(w => /ts が時刻として読めない/.test(w)),
    `理由が「読めない ts」を名指していない: ${JSON.stringify(r.reasons)}`);
  assert.strictEqual(g.readLedger({ raw: true }).length, 2, '正当な観測が刻まれていない — F-1 の窓が再び開いた');
  ```
  CLI 経路(`runGaugeGate`)では **exit 2** で名乗ること(既存の `先回りは exit 2 で名乗る (F-1)` の規約に従う)。
- **壊し方(第21条)**: `graph/gauge.js:584` の
  `  if (ets === null || isNaN(Date.parse(ets))) {`
  を
  `  if (false) {`
  に書き換える(= 変異 T9)。→ 毒行が正当な先着に昇格し `r.skipped === true` / 行数 1 になり、この門が exit 1 で鳴る。
- **測定可能性**: 毒行に対する台帳の行数 **1(変異版)vs 2(実物)**、exit **0(変異版)vs 2(実物)**。T9 が鳴らす門の本数 **0 → 1**。

---

### AC-9 — `preemptionReasons` の三つの物差しを**一つずつ**撃つ(D-E)

- **門の住所**: `tests/paradise.test.js` の gauge 節。門名 `gauge: 先回りの三つの物差しは独立に効く — 一本でも死ねば鳴る (D-E / 第21条 a)`。
- **入力**: `withGaugeSandbox` の内側。同じ正規の行から三種の毒行を作り、**一つずつ**別々の仮倉で撃つ。
  1. **読めない ts**: `{ ...probe, ts: 'not-a-time' }` → 理由に `/ts が時刻として読めない/`
  2. **走行の開始より前**: `{ ...probe, ts: '2000-01-01T00:00:00.000Z' }`(run の `history[0].ts` より前)→ 理由に `/走行の開始 .* より前に住む/`
  3. **秤が書かない鍵**: `{ ...probe, note: 'hand-edited' }` → 理由に `/秤が書かない鍵を持つ: note/`
  未来の行(`ts` が今 + 48h)も四本目として撃つ → 理由に `/より未来に住む/`
- **期待**: 四つとも `preempted === true` / `reasons.length >= 1` / 正規の観測が刻まれ raw 行数 2。
  `assert` の文面: `物差し「<名>」が死んでいる — 先回りが素通りする (D-E)`。門は exit 0。
- **壊し方(第21条)**: `graph/gauge.js:594-595` の
  `  const alien = alienKeys(existing);`
  `  if (alien.length) why.push(\`秤が書かない鍵を持つ: ${alien.join(', ')}\`);`
  の二行目を
  `  if (false) why.push(\`秤が書かない鍵を持つ: ${alien.join(', ')}\`);`
  に書き換える。→ 三本目だけが落ちてこの門が exit 1 で鳴る(**一本ずつ撃っているから一本だけ落ちても分かる** —— これが第21条 a「一つの口に絞った門は覆いではない」の適用である)。
- **測定可能性**: 物差しを一本殺したときに鳴る門の本数 **0 → 1**(物差し 4 本それぞれについて)。

---

### AC-10 — 同一プロセスで N 回採点しても点が変わらない(D-F / G6 の封鎖)

- **門の住所**: `tests/paradise.test.js` の gauge 節。門名 `gauge: 同一プロセスで N 回採点しても点は動かない — 決定性は秤の第一の約束 (D-F / 第38条)`。
- **入力**: `withGaugeSandbox` の内側。**荒れた走行**(点が 100 未満でなければ「上限で偶然一致した」を排除できない)を組み、同じ run オブジェクトを 5 回採点する。
  ```js
  const run = makeGaugeRun({ reworks: 2 });   // 実測の基準点: 70 点台
  const seen = [];
  for (let i = 0; i < 5; i++) seen.push(g.score(run).score);
  ```
- **期待**:
  ```js
  assert.strictEqual(new Set(seen).size, 1,
    `同じ走行に違う点が付いた — 秤が揺れている (D-F / 第38条): ${JSON.stringify(seen)}`);
  assert.ok(seen[0] < 100, '満点の走行では「上限で潰れた一致」と区別できない — 荒れた走行で撃て');
  ```
  門は exit 0。
- **壊し方(第21条)**: `graph/gauge.js:170` の
  `  const raw = 100`
  を
  `  WEIGHTS.rework = 0; const raw = 100`
  に書き換える(= 変異 G6 と同型: 最上位 `const` の表を破壊的に書き換える)。→ 二回目以降の点が上がり `seen = [70,100,100,100,100]` になって、この門が exit 1 で鳴る。
- **測定可能性**: 5 回の採点の相異なる点の数 **4(変異版)vs 1(実物)**。G6 が鳴らす門の本数 **0 → 1**。

---

### AC-11 — 最上位の可変大域が 0 件であること(D-L / G4・G6・G8 の層の根)

- **門の住所**: `tests/paradise.test.js` の gauge 節。門名 `gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない (D-L / review-3 §8.3)`。
  **検査関数はファイルパスの配列を受け取る純関数として書け**(故障注入が複製に対して撃てるため)。字句器は `graph/hermetic.js` が既に `matchParen` / `splitArgs` / `bindingsOf` / `functionsOf` を輸出しているので**再利用を第一候補とする**(第29条/第48条: 同じ問いに二つの答えを持てばいつか食い違う)。
- **入力**: `[ 'graph/gauge.js', 'graph/spawn-trace.js' ]` の実物(読むだけ)。
- **期待**:
  ```js
  const found = mutableGlobals([GAUGE_JS, SPAWN_TRACE_JS]);
  assert.deepStrictEqual(found, [],
    '最上位に可変の大域が生えた — 呼び出しを跨いで状態を持つ道である (D-L):\n' +
    found.map(f => `  ${f.file}:${f.line}  ${f.name}  (${f.why})`).join('\n'));
  ```
  門は exit 0。**射程をコードに書き、走るたび名乗れ**(第44条 c):
  `console.log('      · 射程: graph/gauge.js / graph/spawn-trace.js の最上位のみ — hermetic.js は git の一覧の memo を正当に持つため射程外(第57条: 射程を広げるのは別の走行)')`
- **壊し方(第21条)**: **複製に対して**撃つ。`graph/gauge.js:72` の
  `const LEDGER_NAME = 'gauge-ledger.jsonl';`
  の直後に
  `let __recCount = 0;`
  の一行を足した複製を `mkdtempSync` 配下に置き、`mutableGlobals([<複製>])` が
  `[{ file: '<複製>', line: 73, name: '__recCount', why: '最上位の let 束縛' }]` を返すことを assert する。
  → 実物に同じ一行を足せばこの門が exit 1 で鳴る。
- **測定可能性**: `graph/gauge.js` / `graph/spawn-trace.js` の最上位可変束縛の数 **0 → 0(緑)**、G4 の一行を足すと **0 → 1(赤)**。層「門の書き方」の無音 4 件のうち **G4 / G6 / G8 の 3 件がこの門で鳴る**(G2 は無効な変異なので数えない)。→ **層の無音率 40%(4/10) → 10%(1/10)。**

---

### AC-12 — この門は偽の赤を出さない — 定数と凍結表は許す(D-L の境界)

- **門の住所**: `tests/paradise.test.js` の gauge 節。門名 `gauge(静的): 大域の門は定数を罪と呼ばない — 偽の赤を出さない境界 (D-L / 第16条)`。
- **入力**: `mkdtempSync` 配下に**許されるべき形だけ**を並べた作り物のソースを置く。
  ```js
  const fs = require('fs');
  const WEIGHTS = { rework: 10, retryOverhead: 5 };
  const FROZEN = Object.freeze({ a: 1 });
  const RE = /^g1:[0-9a-f]{16}$/;
  const NAME = 'gauge-ledger.jsonl';
  const MAXD = 64;
  const isT3 = (s) => s === 'tier3';
  function f() { let local = 0; local++; const m = new Map(); m.set('k', 1); return local + m.size; }
  module.exports = { WEIGHTS, FROZEN, RE, NAME, MAXD, isT3, f };
  ```
  そして**拒まれるべき形だけ**を並べた第二の作り物を置く。
  ```js
  let counter = 0;
  const SEEN = new Set();
  const TBL = { n: 0 };
  function g() { counter++; SEEN.add(counter); TBL.n = counter; return counter; }
  module.exports = { g };
  ```
- **期待**: 一枚目は `mutableGlobals([...]) === []`(**偽の赤ゼロ**)。二枚目は **3 件**を名指す(`counter` = 最上位 `let` / `SEEN` = 最上位コレクションへの破壊的操作 / `TBL` = 最上位束縛の属性への代入)。
  `assert` の文面: `定数を罪と呼んだ — この門は偽の赤を出す (D-L)` / `可変の大域を見逃した — 門になっていない (D-L)`。門は exit 0。
- **壊し方(第21条)**: 検査の破壊的操作の一覧から `add` を落とす。すなわち検査関数の
  `const DESTRUCTIVE = ['push','set','add','delete','clear','pop','shift','unshift','splice','sort','reverse'];`
  を
  `const DESTRUCTIVE = ['push','set','delete','clear','pop','shift','unshift','splice','sort','reverse'];`
  に書き換える。→ 二枚目が 2 件しか鳴らず、この門が exit 1 で鳴る。
- **測定可能性**: 許される形に対する誤検出 **0/7**。拒まれる形に対する検出 **3/3**。

---

### AC-13 — 競合下でも治癒が成立する(D-B β / 本裁定の本体)

- **門の住所**: `tests/paradise.test.js` の gauge 節。門名 `gauge(並行): 競合で重複が生まれても畳みが読み手を守る — 治癒に寄りかかると決めた以上、治癒を門にする (D-B / 第55条 b)`。
  **新しい `tests/*.test.js` は作らない。** `tribunal.yml` は一行も変わらない(FR-4 の裁定)。
- **入力**: `mkdtempSync` の仮倉一つ。**並列度 2 で固定する**(discover は 2/4/8 のすべてで 100% を実測済 —— 門は「破れること」ではなく「治癒が成立すること」を凍結するので、最小の並列度で足りる)。
  子プロセス 2 本を `spawnSync` ではなく `spawn` で同時に起こし、両方に同じ `PARADISE_CREATIONS` と同じ run-state ファイルを渡す。**同期は spin barrier**(`setTimeout` では粒度が粗すぎて競合窓 10〜20ms に入らない —— discover が実測した)。
  ```js
  // 子: require を済ませてから T0 まで spin し、同一 epoch ms に record を撃つ
  const g = require(<GAUGE_JS>);
  const T0 = Number(process.argv[2]);
  while (Date.now() < T0) {}
  const r = g.record(<run.json>, 'race');
  console.log(JSON.stringify({ skipped: !!r.skipped }));
  ```
- **期待**(四つすべて):
  ```js
  assert.strictEqual(raw.length, 2, `競合の前提が崩れた(重複が生まれなかった): ${raw.length}`);   // 前提の確認
  assert.strictEqual(g.readLedger().length, 1, '畳みが競合下の重複を拾えなかった — 治癒が成立していない (D-B β)');
  assert.strictEqual(skippedCount, 0, `子が「既記録」を誤報した — 記録が失われる方向の破れ: ${skippedCount}`);
  // --audit は exit 1、文面は duplicates=1 / conflicts=0 / corrupt=0 / suspect=0
  assert.strictEqual(audit.code, 1, `audit の exit が規約から外れた: ${audit.code}`);
  assert.ok(/duplicates=1 conflicts=0 too-deep=0 corrupt=0 suspect=0/.test(audit.out), audit.out);
  ```
  **前提(重複が 2 行生まれること)が崩れた場合は赤にせず `· skip: 競合窓に入らなかった(raw=<n>)— 治癒の門は前提が立ったときだけ判定する` を名乗って通す**(第58条 e)。機の速さに依存する前提を**赤の理由にしない** —— ただし黙って通さない。
- **壊し方(第21条)**: `graph/gauge.js` の `readLedger` の生返しの枝、すなわち
  `  if (opts && opts.raw) return rows;`
  を
  `  return rows;`
  に書き換える(畳みを常に外す)。→ `g.readLedger().length` が 2 になり、この門が exit 1 で鳴る。
- **測定可能性**: 競合 2 プロセス下で `readLedger()` が返す行数 **1(実物)vs 2(変異版)**。`skipped` の誤報 **0 回**。治癒を凍結する門の本数 **0 → 1**。

---

### AC-14 — D-B の採否を決める測定(design / build 相が実行する)

**これは門ではなく測定である。** design/build 相はこの四つを実測し、結果を `design.md` に数で書け。
**M1〜M4 がすべて通れば β + γ で確定する。一つでも破れたら α(ロック)の代償を測る段に進め。**

| # | 測る対象 | 手順 | 判定 |
|---|---|---|---|
| **M1** | AC-13 の門の実時間 | `node tests/paradise.test.js --gate '並行'` を 3 回撃ち中央値を取る | **≤ 1500ms** なら `paradise.test.js` に置いてよい。超えたら並列度を 2 に固定し試行を 1 回に削れ。それでも超えるなら FR-4 の「新ファイル + `tribunal.yml` 一段」へ倒せ(全走 6 分に載せない) |
| **M2** | 治癒の N 非依存性 | 並列度 2 と 4 で `readLedger()` の行数を測る | **両方 1** なら β 成立。**1 でない N が一つでもあれば β は不成立** —— 畳みが競合下で万能でないことになり、α の検討へ進め |
| **M3** | `skipped` の誤報 | 並列度 2 / 4 で子が返した `skipped:true` の総数 | **0** なら「記録が失われる方向には倒れない」が保たれている。**1 以上なら即座に α へ進め** —— これが起きた瞬間、TOCTOU は「台帳が膨らむ」問題から「観測が消える」問題に変わる |
| **M4** | 掃除の安全性 | 競合直後の台帳に FR-8 の掃除を掛け、distinct な指紋の数を前後で比べる | **不変**なら γ の文面が「機械が畳めば消える」と言ってよい。**減ったら γ の文面は嘘である** —— 掃除が観測を消すので、そのときは掃除の側を先に直せ(SM-G/SM-I より優先) |

**全走時間の上限(第4の裁定への回答)**: 新設 21 門(build 相 13 + verify 相 8)の合計増分を **20 秒以下**とする。基準は本相で実測した `node tests/paradise.test.js --gate gauge --gate 門ヘルパー` = **116 門 / 10.7 秒**。改修後、同じ絞り込みが **137 門 / 16 秒以下**であること(CI は `PARADISE_ABODE=repo/global` の 2 回なので実費は ×2 = 40 秒)。**6 分の全走を要求する新しい門は一本も建てない。**

---

### AC-15 — `--audit` が競合由来の重複を「機械が畳める」と名乗る。**exit は動かさない**(D-B γ)

- **門の住所**: `tests/paradise.test.js` の gauge 節。門名 `gauge(CLI): audit は競合の跡と人の手を要する事故を文面で分ける — exit の規約は動かさない (D-B γ / 第57条)`。
- **入力**: `mkdtempSync` の仮倉に三種の台帳を順に置いて `runGaugeGate` で `--audit` を撃つ。
  1. **競合の跡だけ**: 同一の正規行を二回(指紋も `ts` も同一)。
  2. **人の手を要する事故**: 一行目を JSON の途中で切った行 + 正規行一行。
  3. **健全**: 正規行一行だけ。
- **期待**:
  | 入力 | exit | 人が読む文面 | `--json` の欄 |
  |---|---|---|---|
  | 1. 競合の跡 | **1**(既存の規約のまま) | `duplicates=1 conflicts=0` に加え **`機械が畳めば消える(競合の跡)`** を含む。`人が読むべき行` を**含まない** | `healable: true` |
  | 2. 事故 | **2**(既存の規約のまま) | `人が読むべき行が 1 件ある` を含み、`機械が畳めば消える` を**含まない** | `healable: false` |
  | 3. 健全 | **0** | `rows=1 distinct=1 duplicates=0 ... suspect=0` | `healable: true`(掃除すべき欠陥が無い) |
  `assert` の文面: `audit の exit が動いた — 既存 5 門が符号化した規約を破った (第57条)` / `競合の跡と事故が同じ文面になった (D-B γ)`。
- **壊し方(第21条)**: `graph/gauge.js` の audit 出力で `healable` を決める行、
  `  const healable = conflicts.length === 0 && corrupt === 0 && suspect === 0;`
  を
  `  const healable = true;`
  に書き換える。→ 入力 2 でも `機械が畳めば消える` が出て `healable: true` になり、この門が exit 1 で鳴る。
- **測定可能性**: exit code の分布 **{健全:0, 重複:1, 事故:2}** が改修の前後で**不変**(3/3)。競合の跡と事故を文面で区別できる率 **0/2 → 2/2**。

---

### AC-16 — 走行の衛生(既存の CI 段がすべて緑)

- **門の住所**: 既存の `tribunal.yml` の段。新設しない。
- **入力/期待**:
  ```
  node graph/hermetic.js check    → exit 0。新しい門の書き込みは全て mkdtempSync 配下である
  node graph/wiring.js check      → exit 0。孤児 0(新ファイルを作らないので増えない)
  node graph/census.js check      → exit 0。**先に `node graph/census.js fix` を走らせること**
  node graph/codex.js check       → exit 0。第62条を足したら `codex.js index --write` を先に走らせる
  node tests/paradise.test.js     → `492 passed, 0 failed`(471 + 新設 21)
  PARADISE_ABODE=repo   node tests/paradise.test.js → 同上
  PARADISE_ABODE=global node tests/paradise.test.js → 同上
  ```
- **壊し方(第21条)**: 新設の門のどれか一本で、仮倉ではなく `graph/gauge.js` に直接 `fs.writeFileSync` する形に書き換える。→ `node graph/hermetic.js check` が `🔴 tests/paradise.test.js:<行>` と名指して exit 1 で鳴る。
- **測定可能性**: 門の総数 **471 → 492**。README が語る数と実測の差 **0**。孤児の門 **0**。hermetic の違反 **0**。

---

## 5. NFR(非機能要件)

| # | 要件 | 数 | 検め方 |
|---|---|---|---|
| **NFR-1** | **全走時間の上限** | 現状 約 6 分 / 471 門。**新設 21 門の合計増分 ≤ 20 秒**。CI は ×2 なので実費 ≤ 40 秒 | 本相の基準: `--gate gauge --gate 門ヘルパー` = **116 門 / 10.7 秒**。改修後 **137 門 / ≤ 16 秒**(実測 13.2〜13.5 秒 / AC-14 / M1) |
| **NFR-2** | **既存 471 門を一本も赤くしない** | 赤 **0 本** | `node tests/paradise.test.js` が `492 passed, 0 failed`。差分は**足した 21 本だけ**であり、既存門の期待値を一行も書き換えないこと(書き換えるなら §6 の手続きを踏め) |
| **NFR-3** | **実台帳の不可侵** | sha256 `955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77` / **7 行**が走行の前後で不変 | `sha256sum C:/Users/kikus/Documents/workspace/paradise-creations/gauge-ledger.jsonl` を PR の前後で撃つ。**AC-1 の番兵がこれを主張でなく測定にする**(第38条)。`git -C paradise-creations status --short` が ` M gauge-ledger.jsonl` のみ(開始時から立っている既知の状態) |
| **NFR-4** | **第30条 — 台帳の住所は `workspace.js` 一本** | ハードコード **0 件** | 新しい門は `PARADISE_CREATIONS` 以外の道で兄弟倉を指さない。`node graph/workspace.js check` が exit 0。`hermetic.js` に兄弟倉を教えない(FR-2 の裁定) |
| **NFR-5** | **外部依存ゼロ** | `package.json` の依存 **0 件のまま** | spin barrier も digest も Node 標準(`child_process` / `crypto`)で書く |
| **NFR-6** | **第44条 — 孤児の門を作らない** | 孤児 **0** | 新ファイルを作らないので `node graph/wiring.js check` は不変。作るなら FR-4 の配線を同じ PR で行う |
| **NFR-7** | **第22条 — 数を手で書かない** | README の差 **0** | `node graph/census.js fix` を走らせてから `check`。**手で 471 を 492 に書き換えるな** |
| **NFR-8** | **第58条(c) — 門が己の測る対象を汚さない** | hermetic の違反 **0** | 故障注入はすべて `mkdtempSync` 配下の複製に対して行う。`node graph/hermetic.js check` が exit 0 |
| **NFR-9** | **一つの PR で閉じる** | PR **1 本** | ブランチ `reform/silent-mutations` のまま。`CLAUDE.md` と `.env` に触れない。`graph/conclave.js audit` が本走行を未完のまま残さない(第53条 —— 走行帳を相ごとに `done` で刻め) |

---

## 6. この変更で嘘になる既存の門

依存を変えるなら、古い前提を符号化した門を洗い出さねばならない(第61条 b: **触れた定数を読む全ての経路を辿れ**)。

### 6-1. 🔴 **γ が exit code を動かせば嘘になる門(5 本)** → **ゆえに exit を凍結する(FR-5)**

| 門 | 住所 | 符号化している前提 |
|---|---|---|
| `gauge: 矛盾は判別可能な信号で名指される (AC-7b / NFR-2)` | `tests/paradise.test.js` gauge 節 | duplicates と conflicts が**別の信号**で出ること |
| `gauge(CLI): audit の信号は「掃除できる欠陥」と「人が読むべき事故」を分ける (P-8)` | 同上 | exit 1 / 2 の分離そのもの |
| `gauge(CLI): exit code の規約に実装が従う — 2 は台帳の事故に予約する (D-3)` | 同上 | **exit 2 は事故に予約** |
| `【逆】重複を仕込むと exit 1 — 機械が畳めば消える欠陥 (第55条)` | `tests/gauge-audit.test.js:117` | **重複 → exit 1** |
| `実台帳が健全である — 在る環境では本物を監査する` | `tests/gauge-audit.test.js:168` | 健全 → **exit 0** |

**裁定**: γ は **exit を一切動かさない**。信号の分離は**文面と `--json` の欄**で行う。この五本は一行も書き換えない(第57条: 修理は掟を広げてはならない)。**AC-15 がこの凍結自体を門にする。**

### 6-2. 🟠 **D-A の番兵が建つと「覆いを主張しすぎる」ことになる門(1 本)**

| 門 | 住所 | 問題 |
|---|---|---|
| `gauge: 門は実台帳を一行も書き換えない (AC-9c / 第30条)` | `tests/paradise.test.js:6060` | 名前は「門は」と**全称**で語るが、実際に digest を照合しているのは**自分の中の一回の `withGaugeSandbox` だけ**である。114 門のうち 1 門しか覆っていない。W1 の事故はまさにこの門の外で起きた |

**裁定**: **消さず、名を実態に合わせる。** `gauge: この門は実台帳を一行も書き換えない (AC-9c / 第30条)` に改名し、本文のコメントに「全称の保証は AC-1 の番兵が担う」と書き足す。**消せば第44条(死骸)ではなく第16条(見落とし)になる** —— この門は「振替の後始末(env を戻せば住所が実台帳に戻る)」も撃っており、番兵はそれを撃たない。

### 6-3. 🟡 **D-L と相互作用する門(1 本)**

| 門 | 住所 | 相互作用 |
|---|---|---|
| `gauge: 呼び出しを跨いで状態を持たない — 別プロセスで撃つ (D-6)` | `tests/paradise.test.js` gauge 節 | **振る舞い**で cross-call state の不在を撃つ。D-L は**ソース**で撃つ。二本は重複ではなく**別の層**である(D-6 は `ledgerPath` と `foldLedger` の memo という**具体**、D-L は「大域を足すこと」という**一般**) |

**裁定**: 両方残す。ただし D-L が将来**正当な** `Object.freeze` の表で赤くならないよう、AC-12 の境界を守ること。

### 6-4. 🟡 **門を足すこと自体で嘘になるもの(2 箇所)**

| 対象 | 嘘になる内容 | 手当て |
|---|---|---|
| `README.md:138` の `# 門 471 本` | 492 になる | `node graph/census.js fix`(**手で書くな**・第22条) |
| `tribunal.yml` の `裁定を下す` 段が組む `verdict-report.json` の `tests.passed` | 実測から組んでいるので嘘にならない | 手当て不要(数を写経していない設計が効いている) |

### 6-5. ⚪ **嘘にならないが確かめるべきもの**

- `graph/hermetic.js check`: AC-7 が **仮倉の台帳に `fs.writeFileSync(g.ledgerPath(), '')`** を撃つ。`g.ledgerPath()` は `mkdtempSync` 配下を返すが、**hermetic は静的走査器であり `g.ledgerPath()` の中身を追えない**可能性がある(`peel()` は `path.join` の根を辿るが、関数呼び出しの返り値は辿らない)。→ **design 相が実測で確かめよ**(§8 の問い 6)。出自不明(`unknown`)に落ちるなら、`path.join(tmp, 'gauge-ledger.jsonl')` と**リテラルで綴って**撃て。
- `gauge: 門は仮倉の残骸も住所の振替も残さない (門自身の衛生)`: 番兵を `finally` に足すと**順序**が効く。AC-1 の順序の掟(env 復元 → cache 破棄 → 仮倉削除 → **その後に**番兵)を守れば、この門は不変。

---

## 7. 憲法条の裁定 — **足す。第62条を一条。**

### 7-1. 足すと裁定する理由

discover の実測は、三つの無音が**同じ一つの原因**から出ていることを示した —— **門の形が、門の盲点を決めている。**

- `withGaugeSandbox` が `require.cache` を捨てる作法 → **モジュール大域の層が見えない**(実測: 無音率 40% で全層最悪)。
- 門が単一プロセスで走る作法 → **競合の層が見えない**(実測: TOCTOU が並列度 100% で破れるのに既存 114 門は一本も鳴らない)。
- 門が `PARADISE_CREATIONS` の振替に頼る作法 → **振替を壊す変異が見えない**(実測: W1 が実台帳に 14 行)。

既存のどの条もこれを言っていない。第21条は「**どの口が名を語るか**」を数えよと命じ、第58条(c)は「門が測る対象を汚すな」と命じるが、**どちらも「門の形そのものが観測の範囲を決める」とは言っていない**。第38条は「改善を数で示せ」と命じるが、**測っていない層の存在は数に現れない**。

**変異を足して埋まる穴ではない**(findings §6-1)。条を足す価値はここにある —— 次の走行の神官が門を書くとき、**「この門の形は何を見えなくするか」を問うことを掟にする。**

### 7-2. 文案(既存条の文体に合わせる — `article 55` / `article 61` を見本にした)

```
62. **門の形が、門の盲点を決める。振る舞いだけを撃つ門は、己の作法が隠した層を永久に見ない。**
    実測(reform『silent-mutations』): `graph/gauge.js` に 60 の変異を撃ち、471 門が
    **14 件(23.3%)に対して一言も鳴らなかった**。無音は層に偏っていた ——
    「門の書き方」の層が **40%(4/10)** で最悪であり、「並行性」と「exit」の層は **0%** だった。
    腕の差ではない。**門の書き方の差である。**

        並行性:      単一プロセスで撃つ門は、競合を見ない。
                     `record` の TOCTOU は並列度 2/4/8 のすべてで 100% 破れたが(90 試行中 90)、
                     114 本の門は一本も鳴らなかった —— **誰も二つのプロセスを同時に起こさなかった**からである。
        大域:        `require.cache` を捨てる門は、モジュール大域を見ない。
                     未使用の大域を足す変異(G4)は無音で、同じ大域を**使う**変異(G5)は 5 門が鳴った。
                     **一行差で致命に化ける段差**が、門の作法の内側では観測できない。
        住所:        環境変数で住所を振り替える門は、振替を壊す変異を見ない。
                     住所解決を壊した変異(W1)は**門の防御を素通りして現物の台帳に 14 行を書いた**。
                     門は仮倉としか話さないつもりで、現物と話していた。

    ゆえに門は三つを守る。

    (a) **門を建てるとき、その門の形が何を見えなくするかを言え。** 単一プロセスか、
    cache を捨てるか、住所を振り替えるか —— **作法はすべて盲点と対になっている。**
    言えない盲点は、存在しない盲点ではなく、**まだ誰も落ちていない穴**である。

    (b) **不可侵を主張ではなく測定にせよ。** 「この門は現物を汚さない」は設計の意図であって
    証拠ではない。**汚していないことを、走行のたびに数で示せ** —— 現物の指紋を前後で照合し、
    食い違えば**どの門が汚したかを名指して**倒れよ。第38条が「改善を数で示せ」と命じたのと
    同じ物差しが、規律にも掛かる。**現物が無い機では skip を名乗り、そこでは作り物の現物で
    門の歯を撃て**(第37条: 不在は通過ではない)。

    (c) **振る舞いの門が届かない層は、ソースを静的に読む門で補え。** 「大域を足したこと」は
    振る舞いに現れない日がある —— 現れた日には既に致命である。**射程は名指しで狭く切り、
    許す形(定数・凍結表・`require` の束縛)と拒む形(可変の束縛・破壊的操作)を
    コードに書いて毎回名乗れ**(第44条(c))。射程の外は見逃しではなく、**次の走行の残債**として名を持て。

    **これを強制する門**: `tests/paradise.test.js` の gauge 節 —— 実台帳の指紋を毎門で照合する
    番兵((b))、競合下でも治癒が成立することを二プロセスで凍結する門((a))、
    台帳を書く engine の最上位に可変の大域が生えていないかをソースで読む門((c))。
    三本とも**壊して鳴ることを別の門が撃つ**(第21条)。**そして無音率は次の走行で測り直される** ——
    条を足したという主張も、次の変異走行の数が前より良くなって初めて証明される(第38条)。
```

### 7-3. 足すときの手続き

1. `CONSTITUTION.md` の末尾に第62条を追記する(**二つのブランチが末尾に追記すると衝突する** —— 本走行は単独なので衝突しないが、main を取り込んだ後に番号を確かめよ)。
2. `node graph/codex.js index --write` → `node graph/codex.js check`(**索引を手で書くな**)。
3. `tribunal.yml` の `📜 Constitution` 段は `count >= 12` を検めるだけなので変更不要。
4. `node graph/census.js fix` → `check`。

---

## 8. design 相への問い(決めきらなかったこと)

1. **D-L の字句器を `graph/hermetic.js` から借りるか、gauge 節に自前で書くか。**
   hermetic は `matchParen` / `splitArgs` / `bindingsOf` / `functionsOf` / `shadow` を輸出している。
   借りれば第48条(同じ問いに二つの答えを持たない)に適うが、`tests/paradise.test.js` が engine を
   一本多く抱えることになる。借りるなら **hermetic の輸出に何を足すか**まで決めよ。
   **自前で書くなら、hermetic の字句器と挙動が食い違わないことを門で撃て。**

2. **AC-1 の番兵を 114 門すべての `finally` で撃つ代は幾らか。**
   実台帳は 7 行(数百 bytes)なので sha256 は無視できるはずだが、**`fs.existsSync` + `readFileSync` × 114 回**の
   実費を measure せよ。**1 秒を超えるなら**、digest ではなく `statSync().mtimeMs + size` の二値で予備判定し、
   食い違ったときだけ digest を採る二段構えに倒せ。

3. **`runGaugeGate` の子プロセス経路と `tests/gauge-audit.test.js` を番兵がどう覆うか。**
   子プロセスの中では `withGaugeSandbox` の `finally` が走らない。AC-1 の第二段(節末の独立した門)で
   足りるか、それとも `runGaugeGate` の中でも撃つべきか。**足りるなら、なぜ足りるかを数で書け**
   (節末の一回で、節の全門が通った後の digest を照合するなら、汚した門を名指せないという代償が在る)。

4. **AC-13 の並行性門を `tests/paradise.test.js` に置くという FR-4 の裁定を、M1 の実測で確かめよ。**
   ≤ 1500ms を超えたら新ファイルへ倒す。**倒す場合の `tribunal.yml` の配線は FR-4 に書いてある。**

5. **γ の信号分離を `--json` の欄で行うか、文面だけで行うか。**
   `--json` に `healable` を足すと、**`graph/pulse.js` の断面がこの欄を拾うか**を確かめねばならない
   (第29条: 生成物の中身を前提にした検査を作らない)。**pulse が拾わないなら文面だけで足りるか**を裁定せよ。

6. **AC-7 の `fs.writeFileSync(g.ledgerPath(), '')` が `graph/hermetic.js check` を通るか。**
   hermetic の `peel()` は `path.join` の根を辿るが、**関数呼び出し(`g.ledgerPath()`)の返り値は辿らない**。
   `unknown`(出自不明)に落ちれば hermetic が警告を出す。**実測して確かめ、落ちるなら
   `path.join(tmp, 'gauge-ledger.jsonl')` とリテラルで綴れ。**

7. **AC-6 の `TIER_EPOCH_AT` を固定する門は、将来紀元を正当に動かす道をどう残すか。**
   N18(`g1:` の固定)と同じく「動かすなら門も同じ PR で動かす」作法でよいか。
   **よいなら、その掟を門の assert の文面に書け**(門が自分で作法を教える)。

8. **残債 `SM-G` / `SM-H` / `SM-I` をどこに刻むか。**
   `tests/route-debt.test.js` の先例(xfail の門として誤った振る舞いを凍らせ、
   誰かが直した日に赤くなって昇格を促す)を D-G/D-H/D-I にも適用するか、
   それとも `reform/silent-mutations/debt.md` の散文に留めるか。
   **散文に留めるなら、誰がいつ読むのかを書け**(第44条: 誰も呼ばない物は腐って嘘を語り始める)。

---

## 9. 結び — この文書が約束していないこと

- **無音率が下がることを約束していない。** 本走行が閉じるのは無音 14 件のうち **8 件**
  (S1 / S4 / G8 / T9 / G6 / G4 / G2b 相当 / D-B の治癒)である。
  **残り 6 件(T2 / T7 / T10 / B5 / B7 / B8 / A2 のうち残るもの)は次の走行か、意図して残す側に居る。**
  無音率は次の変異走行で測り直されるまで**主張してはならない**(第38条)。
- **discover が §5 に列挙した 15 項目のうち、本相が閉じたのは 0 項目である。**
  ロックの待ち時間も、台帳の大きさと競合窓の関係も、SMB / ReFS / exFAT も、
  `uv_fs_write` の部分書きも、CI での挙動も、**依然として誰も測っていない。**
- **「安全になる」とは書いていない。** 書いたのは —— **この門が、この入力で、この exit code と
  この文面で鳴る**、そして**この一行を書き換えれば赤くなる**、それだけである。
