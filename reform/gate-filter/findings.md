# discover — 門の絞り込み(フィルタ)の口

**相**: discover(調査)／改革 `gate-filter`
**日付**: 2026-09-09
**対象**: `C:/Users/kikus/Documents/workspace/paradise/tests/paradise.test.js`
**約束**: 本書に書いた数はすべて**この機械で実際に走らせて得た**。推測は一つも無い。
実装はしていない。git 作業ツリーは汚していない(計測器は `%LOCALAPPDATA%\Temp` に置いた)。

---

## 0. 測定環境

| 項目 | 値 |
|---|---|
| node | `v24.14.0` |
| OS | Windows 11 / git-bash (MSYS) |
| ブランチ | `feat/gate-filter` |
| 素の全走 | `EXIT=0 ELAPSED_MS=358808` (= **358.8 秒 / 5分59秒**) |
| 素の全走の名乗り | `Paradise self-test: 449 passed, 0 failed` |
| 計測付き走行 | 総 **364.7 秒**、`449 passed, 0 failed`(計測の上乗せは約 5.9 秒 = 1.6%) |

計測器: `C:\Users\kikus\AppData\Local\Temp\paradise-gate-timing\run-timing.js`
(元ファイルを読み、`function test(name, fn) {` を包む一行を挿してメモリ上で
`Module._compile` する。`filename` を元の場所に固定しているので `__dirname` 依存は壊れない。
**ディスク上の `tests/paradise.test.js` は一切書き換えていない。**)
生データ: `timings.jsonl`(449 行 + 総計 1 行)、集計: `agg2.json`。

---

## 1. 構造の実測

### 1.1 test の総数

| 数え方 | 値 |
|---|---|
| ファイル行数 | **8218 行** |
| ソース上の `test(` 呼び出し(静的、行頭) | **442** |
| 実行時に走った test の実数 | **449** |
| 名前の重複 | **0**(449 個すべて一意) |

**442 と 449 の差 7 の正体**: 2694 行の `for (const name of [...8 個...]) { test(...) }`。
静的には `test(` は 1 個だが、実行時には 8 個に増える。**442 − 1 + 8 = 449。**
→ 絞り込みの口が「静的に名前を数える」実装(grep/AST)を採ると、
**この 1 箇所だけ 7 本ずれる**。名は実行時にしか確定しない。

### 1.2 節(セクション)見出しと各節の test 数

`console.log('…:')` で刻まれた節は **33 個**(ソース上)。
実行時にはこれに委譲先の子ファイルが自前で刻む見出しが 9 個混ざるので、
**stdout 上の見出しは 42 行**になる(下の「委譲」を参照 — これがフィルタ設計の罠になる)。

| # | 行 | 節 | 静的 test 数 | 実測合計秒 |
|---:|---:|---|---:|---:|
| 1 | 26 | `Graph engine:` | 5 | 0.04 |
| 2 | 84 | `Knowledge graph:` | 5 | 0.43 |
| 3 | 125 | `Co-change learning:` | 4 | 0.35 |
| 4 | 170 | `Forge (creation pipeline):` | 4 | 0.00 |
| 5 | 213 | `Verdict (judgment):` | 5 | 0.00 |
| 6 | 254 | `Critic (self-critique):` | 8 | 0.06 |
| 7 | 356 | `Orchestrator (supervisor):` | 9 | 0.01 |
| 8 | 478 | `Subagent contract:` | 8 | 0.00 |
| 9 | 532 | `Clergy (hierarchy):` | 2 | 0.00 |
| 10 | 576 | `Conclave (recursive orchestration):` | 20 | 0.03 |
| 11 | 873 | `Model policy (rank → model):` | 6 | 0.01 |
| 12 | 934 | `Synod (planning cycle):` | 5 | 0.01 |
| 13 | 981 | `Lesson scoping (the fence around a past-miss):` | 5 | 0.01 |
| 14 | 1029 | `Self-review scope subject (the engine judging itself):` | 5 | 0.20 |
| 15 | 1081 | `Daily guard (quota + catch-up):` | **110** | 2.02 |
| 16 | 2574 | `Workspace (Art.30):` | 9 | 0.06 |
| 17 | 2693 | `Dashboard gates (Art.22 / G-01..G-10):` | 1(実行時 **8**) | 0.90 |
| 18 | 2706 | `Pontiff seat (Art.31):` | 10 | 0.07 |
| 19 | 2827 | `Gauge (証明の秤, 第38条):` | 9 | 0.01 |
| 20 | 2943 | `Gauge 台帳の冪等性 (第55条):` | **87** | 5.96 |
| 21 | 5003 | `Gauge 先回りと破損の門 (build attempt 4):` | 25 | 1.86 |
| 22 | 5620 | `Diet gate (第39条):` | 13 | 0.62 |
| 23 | 5917 | `Harness diet gate (第40条):` | 4 | 0.01 |
| 24 | 5980 | `Lexicon gate (第41条):` | 5 | 0.49 |
| 25 | 6088 | `日次の営み (第43条):` | 3 | 0.10 |
| 26 | 6161 | `日次の営みは道を歩く (第46条):` | 4 | 0.00 |
| 27 | 6254 | `Atlas (自画像):` | 14 | **342.51** |
| 28 | 6458 | `結線 (第48条):` | 5 | 0.56 |
| 29 | 6524 | `作図の道 (第49条):` | 7 | 0.01 |
| 30 | 6657 | `序列 (第52条):` | 27 | 4.73 |
| 31 | 7384 | `rework (審査の差し戻しを塞ぐ):` | 10 | 1.51 |
| 32 | 7812 | `rework2 (reflect の差し戻しを塞ぐ):` | 7 | 1.74 |
| 33 | 8206 | `第53条 走行の門 (abandoned-run):` | 1 | 0.13 |
| | | **合計** | **442 (実行時 449)** | **364.46** |

註: `Daily guard` 節は 1081〜2573 行の 1500 行に 110 本が住み、
その中に identity / visual-verify / upstream / deploy / vendor / branch-guard など
**明らかに別主題の門が混ざっている**(1297・1402・1618・1793 行の require が証拠)。
節見出しは実行順の目印であって、主題の分類ではない。**フィルタの単位を節に取るなら、
この 110 本の塊は「一つの門」として扱われ、絞り込みの粒度が粗すぎる。**

### 1.3 別ファイルへ委譲している門

自己診断が `require()` で呼ぶ子の試験ファイルは **9 本**、
呼び口は **2 箇所**(2698 行のループと 8208 行)。

| 呼び口 | 子ファイル | 子の test 数 | 子が刻む見出し |
|---|---|---:|---|
| 2694–2703 (ループ) | `dashboard-count.test.js` | 15 | `G-01 数の一致 (第22条):` |
| 〃 | `dashboard-no-deps.test.js` | 10 | `G-02 外部依存ゼロ (NFR-02):` |
| 〃 | `dashboard-links.test.js` | 6 | `G-04 導線 (FR-19):` |
| 〃 | `dashboard-no-hardcode.test.js` | 8 | `G-06 ハードコードの根絶 (FR-02 / FR-21):` |
| 〃 | `dashboard-transport.test.js` | 8 | `三層フォールバック (FR-08):` |
| 〃 | `dashboard-freshness.test.js` | 6 | `鮮度 (FR-07):` |
| 〃 | `dashboard-states.test.js` | 12 | `5 状態 (FR-20):` |
| 〃 | `dashboard-run-panel.test.js` | 16 | `走行中の環・点数・起動実績 (FR-13/14/22):` |
| 8208 | `abandoned-run.test.js` | 11 | `第53条 見捨てられた走行の門 (欠陥A/B):` |
| | **計** | **92** | 9 見出し |

**重要な事実**: この 92 本は `Paradise self-test: 449` の 449 に**含まれていない**。
親は子の `rep.pass / rep.fail` を読んで **1 本の test に畳んで**いる
(`assert.strictEqual(rep.fail, 0)` + `assert.ok(rep.pass >= N)`)。
子は自前で見出しと `✓` を stdout に吐くので、**画面には 42 見出し・541 行の ✓ が出るが、
census が数える数は 449 である**。

同一プロセスで `require` する(子プロセスを起こさない)方式は意図的で、
8203 行にその理由が註釈されている(「node 起動代を本数分払わない」)。
なお `require` はキャッシュされるので、**同じ子を二度呼んでも二度は走らない**。

さらに、`tests/` には自己診断から**呼ばれていない**試験ファイルが 3 本ある:
`counsel.test.js`(39 本)、`guards.test.js`(50 本)、`dashboard-perf.test.js` /
`dashboard-sse.test.js` / `dashboard-watch.test.js` / `dashboard-fallback.test.js` /
`motion-probe-leak.test.js`(いずれも `test(` 0 本 = 別の書き方)。
**「全走」と言っても、それは `paradise.test.js` から届く範囲の全走である。**

### 1.4 トップレベルで走る準備コスト

トップレベル(節の外、`test()` の外)で実行されるものを行番号で名指しする:

| 種類 | 行 | 中身 | 代 |
|---|---:|---|---|
| 砂場作成 | 85 | `fs.mkdtempSync(os.tmpdir(), 'paradise-kg-')` + `process.env.PARADISE_KG` 差し替え | 小 (mkdir 1回) |
| 砂場作成 | 126 | `fs.mkdtempSync(os.tmpdir(), 'paradise-cc-')` | 小 |
| 一時ファイル名 | 29 | `paradise-test-dag-<pid>.json`(第21条c: プロセス固有) | 無 |
| engine の require | 17, 171–172, 214, 255, 357–358, 479, 533–534, 935, 1297, 1402, 1618–1619, 1793, 2828, 6255, 6459, 6525, 6659–6665 | graph 配下 20 数本を同期 require | 小 |
| 砂場片付け | 8215–8216 | `rmSync(kgRoot)` / `rmSync(ccRoot)` | 小 |

**トップレベルで子プロセスを起こす箇所は無い。**
`execFileSync` はすべて `test()` の中にある(91・128 行は関数定義であって呼び出しではない)。
**ブラウザも常駐サーバもトップレベルでは起きない。**
`createServer` / `listen(` / `puppeteer` / `playwright` の文字列は自己診断本体に無い
(7263 行の `chrome-unavailable` は文字列リテラルの中の診断コード名であって起動ではない)。

→ **準備コストは事実上ゼロ(数百ミリ秒)。**
これは絞り込みにとって**極めて良い性質**である: 「1 本だけ走らせる」ときに
共通の重い前処理を払わされることが無い。ただし後述の「実ブラウザ」は
`test()` の内側 — `Atlas` 節 — で起きる。

---

## 2. 時間はどこに食われているか(実測)

計測付き走行の総計 **364.46 秒**、449 本。

### 2.1 遅い順トップ20

| # | 秒 | 累積% | 節 | 門 |
|---:|---:|---:|---|---|
| 1 | **243.80** | 66.89% | Atlas (自画像) | `atlas: 全ての道が図になる — 描画器が実際に受理する (第47条)` |
| 2 | **97.66** | 93.69% | Atlas (自画像) | `atlas: 門は己の残骸で落ちない — 同じ作業場で二度走る (第21条)` |
| 3 | 3.03 | 94.52% | 序列 (第52条) | `atlas: 本当に溢れる図は OVERFLOW と画素数で鳴る (§8.4 #1)` |
| 4 | 1.26 | 94.87% | Gauge 台帳の冪等性 (第55条) | `gauge(故障注入): prove attempt 2 の新変異 13 種で各門が exit 1 で鳴る` |
| 5 | 0.81 | 95.09% | Gauge 先回りと破損の門 (build attempt 4) | `gauge(故障注入): build attempt 4 の新規 8 変異で各門が鳴る (第21条 壊して鳴らす)` |
| 6 | 0.72 | 95.29% | Daily guard | `branch guard: a stale base is caught, not merely written down (Art.24)` |
| 7 | 0.64 | 95.46% | rework | `S-4 [MEDIUM]: 巨大な未追跡ファイルで measure が死なない — 上限で足切りする` |
| 8 | 0.62 | 95.64% | rework2 | `C-1 [BLOCK]: 成果物を測れなかったら緑を出さない — artifact 不在の実経路で撃つ` |
| 9 | 0.62 | 95.80% | 序列 (第52条) | `atlas: 描画器の実行時故障を「溢れた」と呼ばない — 実経路で撃つ (§8.4 #2)` |
| 10 | 0.55 | 95.95% | Gauge 台帳の冪等性 | `gauge(故障注入): prove attempt 3 の無音 11 種のうち engine 側 6 種で各門が鳴る` |
| 11 | 0.54 | 96.10% | Diet gate (第39条) | `critic: reform は三箇所を束ねて裁く — 散文だけを見て「門が無い」と言わない (D-2)` |
| 12 | 0.48 | 96.23% | Gauge 台帳の冪等性 | `gauge(故障注入): 私が新たに発明した 5 変異で門が exit 1 で鳴る (build attempt 3)` |
| 13 | 0.45 | 96.36% | 結線 (第48条) | `wiring: 結線の図は engine から生まれ、写経しない (第29条 / 第47条)` |
| 14 | 0.44 | 96.48% | Atlas (自画像) | `atlas: 全ての主題が動きを名乗る — 黙秘は静止画への同意である (第50条a)` |
| 15 | 0.44 | 96.60% | Atlas (自画像) | `atlas: 5つの主題すべてに IR が在り、種別が宣言と一致する` |
| 16 | 0.43 | 96.72% | rework2 | `C-2 [BLOCK]: critic は教訓 0 件/読めない帳で「何も見つからなかった」と述べない` |
| 17 | 0.42 | 96.83% | Gauge 台帳の冪等性 | `gauge(故障注入): M2/M3/M4/M6/M11 の各変異で門が exit 1 で鳴る (R-1)` |
| 18 | 0.41 | 96.95% | rework | `B-1: 序列3の門は git の失敗で fail-open しない — 非gitディレクトリの実経路で撃つ` |
| 19 | 0.36 | 97.05% | Gauge 先回りと破損の門 | `gauge(故障注入): prove attempt 4 で足した 3 門も壊せば鳴る (G9〜G11 / 第21条)` |
| 20 | 0.34 | 97.14% | 序列 (第52条) | `第52条: 序列3の例外は実測経路で通る — 合成した数ではなく (AC-A5)` |

### 2.2 節ごとの合計

| 節 | test 数 | 秒 | 割合 |
|---|---:|---:|---:|
| Atlas (自画像) | 14 | **342.51** | **93.98%** |
| Gauge 台帳の冪等性 (第55条) | 87 | 5.96 | 1.63% |
| 序列 (第52条) | 27 | 4.73 | 1.30% |
| Daily guard (quota + catch-up) | 110 | 2.02 | 0.55% |
| Gauge 先回りと破損の門 (attempt 4) | 25 | 1.86 | 0.51% |
| rework2 | 7 | 1.74 | 0.48% |
| rework | 10 | 1.51 | 0.42% |
| Dashboard gates (子 8 本を畳む) | 8 | 0.90 | 0.25% |
| Diet gate (第39条) | 13 | 0.62 | 0.17% |
| 結線 (第48条) | 5 | 0.56 | 0.15% |
| Lexicon gate (第41条) | 5 | 0.49 | 0.14% |
| Knowledge graph | 5 | 0.43 | 0.12% |
| Co-change learning | 4 | 0.35 | 0.10% |
| Self-review scope subject | 5 | 0.20 | 0.06% |
| 第53条 走行の門 (abandoned-run) | 1 | 0.13 | 0.03% |
| 日次の営み (第43条) | 3 | 0.10 | 0.03% |
| Pontiff seat (Art.31) | 10 | 0.07 | 0.02% |
| Critic / Workspace / Graph engine / Conclave / その他 18 節 | 231 | 0.28 | 0.08% |

### 2.3 この測定が名指しする事実

**六分は「449 本が重い」のではない。二本が重いのである。**

- 上位 **2 本で 341.5 秒 = 全体の 93.7%**。
- `Atlas` 節 14 本を除いた **残り 435 本は合計 21.9 秒**。
- つまり **Atlas 以外の全門を走らせても 22 秒で終わる。**

原因は `graph/atlas.js` の `check()` である(1337 行〜):

- `check()` は 6 主題を描き、各主題について
  `firstScreen()`(1221 行 `execFileSync(archify visual-check)` — **実ブラウザを起こす**)と
  `motionAlive()`(1325 行 `execFileSync(motion-probe.mjs)` — **もう一度ブラウザ**)を撃つ。
- トップ1の門は **5 つの道 × 6 主題 = 30 回** これを回す(6310 行のループ)。
- トップ2の門は **2 周 × 6 主題 = 12 回**。
- `check({ skipBrowser: true })` という**既に存在する逃げ道**が 1367・1376 行にあるが、
  この 2 本は使っていない(実ブラウザで測ることがこの門の主張そのものだから)。

**制約として記す**: したがって「速い自己診断」を求めるなら、
絞り込みの口の**最初の顧客は Atlas 節を外すこと**である。だがそれは
「一部しか走らせていないのに緑と名乗る」危険の**ど真ん中**でもある(第4節)。

---

## 3. 先行実装の意味論(一次資料 + 手元での実測)

各行の「実測」は本機で実際に走らせた結果である(node v24.14.0 / jest 30系 / mocha 12.0.0 / vitest 5.0.0)。

### 3.1 Node.js 組込み `node:test`

出典: <https://nodejs.org/api/test.html#filtering-tests-by-name>
(原文: <https://github.com/nodejs/node/blob/main/doc/api/test.md>)

- `--test-name-pattern` は **JavaScript 正規表現として解釈される**
  ("Test name patterns are interpreted as JavaScript regular expressions")。
  つまり既定は**部分一致**(アンカー無し)。`"/test [4-5]/i"` のように
  正規表現リテラル記法でフラグも渡せる。
- **階層**: 親がマッチしなければ**子は走らない**
  ("If `test 1` did not match the test name pattern, then its subtests would not
  execute, despite matching the pattern")。
  単一の test を狙うには**祖先の名前を空白で連ねる**
  (`--test-name-pattern="test 1 some test"`)。
- 複数回指定でき、`--test-skip-pattern` と併用すると **AND**。
- **走らせるファイルの集合は変えない**
  ("Test name patterns do not change the set of files that the test runner executes")。
- **マッチ0件のとき**: 実測 —
  `node --test --test-name-pattern="zzz" a.test.js` → **exit 0**。
  出力は `tests 1 / pass 1 / fail 0`(**ファイル自体が 1 件の pass として数えられる**)。
  つまり **node:test は「0 件マッチ」を緑で返し、しかも pass 数を 1 と名乗る。**
  → **これが楽園にとって最も危険な既定である。** 打ち間違えた pattern が緑を返す。
- `--test-only`: 実測 — `only` を一つも付けていないファイルに対して
  `node --test --test-only a.test.js` は **exit 0 / pass 1** で通る。何も走らなくても緑。
  (仕様: <https://nodejs.org/api/test.html#only-tests>)

### 3.2 Jest `-t` / `--testNamePattern`

出典: <https://jestjs.io/docs/cli> (`--testNamePattern=<regex>`, `--passWithNoTests`)

- `-t` は `describe` / `test` の**名前**に対する**正規表現**(部分一致)。
  ドキュメント: "Run tests that match this spec name (match against the name in
  `describe` or `test`, basically)."
- **階層**: フルネーム(describe を連ねた名)に対して照合される。
- 除外されたテストは `pending` に分類される
  (`--collectTests` の記述: "tests … excluded by `--testNamePattern` are reported as `pending`")。
- **マッチ0件のとき**: 実測 — `jest -t zzz` → **exit 0**、
  `Test Suites: 2 skipped, 0 of 2 total / Tests: 4 skipped, 4 total`。
  **名前が 0 件マッチでも緑。**
  ただし**ファイル**が 0 件マッチのときは別で、実測 `jest nosuchfile` → **exit 1**
  (`Pattern: nosuchfile - 0 matches`)。これを緩めるのが `--passWithNoTests`
  ("Allows the test suite to pass when no files are found")。
  → **Jest は「ファイル 0 件」は赤、「名前 0 件」は緑**という非対称を持つ。

### 3.3 Mocha `--grep` / `-g`

出典: <https://legacy.mochajs.org/#-grep-regexp-g-regexp> と
<https://mochajs.org/api/mocha#grep> と <https://legacy.mochajs.org/#-fail-zero>

- `--grep <regexp>` は内部で `RegExp` にコンパイルされ、
  **test の「フルタイトル」(祖先 suite 名 + test 名)に対して照合**される。
  API 文書が明示的に警告する: 「テスト名そのものに完全一致の固定パターンを当てても
  何もマッチしない — それをやりたいなら `.only()` を使え」。
- `--fgrep <string>, -f` は**文字列の部分一致**版。`--grep` と**排他**(v6.0.0 以降)。
- **マッチ0件のとき**: 実測 — `mocha m.spec.js --grep zzz` → **exit 0**(`0 passing`)。
  **`--fail-zero`(v9.1.0 以降)を付けて初めて exit 1** になる:
  "Fail test run if no tests are encountered with `exit-code: 1`"。実測でも
  `--grep zzz --fail-zero` → **exit 1**。
  → **4 者の中で唯一、「0 件は赤」を明示的に選べる口を持つ。**

### 3.4 Vitest `-t` / `--testNamePattern`

出典: <https://vitest.dev/guide/cli.html#testnamepattern> と
<https://vitest.dev/guide/cli.html#passwithnotests>

- `-t, --testNamePattern <pattern>`: "Run tests with **full names** matching the
  specified **regexp** pattern"。**フルネーム × 正規表現**。
- ファイル名フィルタ(`vitest foobar`)は別物で、**包含判定のみ・正規表現もグロブも非対応**
  ("This filter only checks inclusion and doesn't support regexp or glob patterns")。
- **マッチ0件のとき**: 実測 — `vitest run v.test.ts -t zzz` → **exit 0**
  (`Test Files 1 skipped / Tests 2 skipped`)。**名前 0 件は緑。**
  ファイルが 0 件のときは実測 `vitest run nosuchfile` → **exit 1**
  (`No test files found`)。これを緩めるのが `--passWithNoTests`("Pass when no tests are found")。

### 3.5 まとめ — 「マッチ0件」の一覧

| 道具 | 名前フィルタの意味論 | 階層の扱い | **名前 0 件マッチの exit** | ファイル 0 件の exit |
|---|---|---|---|---|
| `node:test` `--test-name-pattern` | JS 正規表現・部分一致 | 親が落ちれば子も走らない。祖先名を空白連結で一意化 | **0(緑)**。しかも `pass 1` と名乗る | — |
| `node:test` `--test-only` | `only` 印のみ実行 | 印の付いた test の子は全部走る | **0(緑)**。印ゼロでも通る | — |
| Jest `-t` | 正規表現・フルネーム部分一致 | describe を連ねたフルネーム。除外は `pending` | **0(緑)** | **1(赤)**。`--passWithNoTests` で緑 |
| Mocha `--grep` / `-f` | `--grep` 正規表現 / `--fgrep` 文字列。排他 | **フルタイトル**(祖先 suite 名込み) | 既定 **0(緑)**。**`--fail-zero` で 1(赤)** | 同上 |
| Vitest `-t` | 正規表現・フルネーム | フルネーム | **0(緑)** | **1(赤)**。`--passWithNoTests` で緑 |

**四者すべてが既定で「名前 0 件マッチ = 緑」を返す。**
これは業界の既定であって、楽園の掟に照らすと**そのまま真似してはならない既定**である(第4節)。

---

## 4. 楽園の掟との整合

### 4.1 引いた条文(`node graph/codex.js article <n>` で読んだ)

**第16条 — Evidence is judged by what it DOES, never by what it is named.**
> "a file that asserts nothing is no evidence however it is named."
> "Every check in `critic.js` that decides whether a duty was discharged must
> read the artifact, not merely match its filename."

系として本文中(CONSTITUTION.md 1174 行、第55条(h))にこう書かれている:
> **読めなかった行を 0 件と数えるのは、測れなかったものをゼロで埋める行為である(第16条)**

**第22条 — A number the paradise states about itself must be countable, and counted.**
> "every number the paradise publishes about itself is **measured from the artifact**
> by `census.js` and compared against the documents; a stale number is a failing
> gate, not a typo. If a thing cannot be counted, it must not be claimed."

**第38条 — Improvement must be proven in numbers.**
> 「改善した」と語る者は、前後を数値で示さねばならない。
> **測らなかった走行は改善を主張できない。**

### 4.2 `census.js` は test 数をどう数えているか(実際にコードを読んだ)

`graph/census.js`:

- **68–103 行 `census()`**:
  `execFileSync(node, ['tests/paradise.test.js'], { timeout: TIMEOUT_MS })` で
  **自己診断を子プロセスとして全走させ、その stdout を読む**。
  既定 timeout は **600000ms(10分)**、`CENSUS_TEST_TIMEOUT_MS` で上書き可。
- **54–61 行 `summaryOf()`**:
  正規表現 `/Paradise self-test:\s*([0-9]+) passed, ([0-9]+) failed/` で
  **名乗り行を名前で狙う**。見つからなければ「最後の `N passed, M failed`」に落ちる。
  (41–50 行の註釈が経緯を語る: 昔は `String.match` の最初の一致を採ったため、
  子テストの `dashboard-count: 15 passed` を「楽園のテスト総数」と信じて
  README の 256 と突き合わせ、**嘘をついていたのは README ではなく数え方だった**。)
- **93–102 行**: 打ち切り(`killed`/`signal`/`ETIMEDOUT`)なら **`tests = null`**。
  部分出力を真実として採らない。走り切って exit≠0 なら、その数は事実として読む。
- **268–270 行 `claims()`**:
  `README.md` の `/paradise\.test\.js\s+#\s*(\d+)\/(\d+) pass/` を
  `[passed, passed+failed]` と突き合わせる。`measurable()` が偽(= `tests === null`)なら
  **裁かない**(黙って 0 で埋めない)。
- 現在の README 138 行は `# 449/449 pass`。**実測 449 と一致している。**

つまり **census は「自己診断が最後に名乗った総括行」だけを見ている。**
節も、個々の test 名も、子ファイルの内訳も見ていない。

### 4.3 絞り込みの口が掟に触れる箇所 — 名指し

**(A) 第22条に真正面から触れる — `census.js` の 90 行は引数を渡さない。**

`census()` は `execFileSync(node, [paradise.test.js])` を**素で**呼ぶ。
環境変数は継承する。したがって:

- **`GATE_FILTER`(仮)を環境変数で実装した場合、`census.js` を走らせるシェルに
  その変数が残っていると、census は絞り込まれた走行の `N passed` を
  「楽園のテスト総数」として読み、README の 449 と突き合わせて赤を出す。**
  あるいは(もっと悪いことに)`fix` が **README の 449 を絞り込み後の数に書き換える**。
  これは第22条が禁じる「stale number」の逆版 — **測定条件が違う数で README を汚す**。
- CLI 引数で実装した場合は `census.js` が引数を渡さないので影響を受けない。
  **→ これが discover が突き止めた最大の設計制約である。**
  「環境変数か引数か」は好みの問題ではなく、**第22条に触れるか触れないかの分岐点**である。

**(B) 第16条に触れる — 「マッチ0件で緑」は、測らなかったものを緑で埋める行為。**

第3節で測ったとおり、node:test / Jest / Mocha(既定) / Vitest は
**名前 0 件マッチを exit 0 で返す**。node:test に至っては `pass 1` と名乗る。
楽園の掟(第16条 / 第55条(h))は逆を要求する:
「読めなかった行を 0 件と数えるのは、測れなかったものをゼロで埋める行為である」。
**マッチ0件は「全部通った」ではなく「一本も測っていない」である。**
先行実装で唯一この立場に立てるのは Mocha の `--fail-zero`(exit 1)。

**(C) 第22条・第38条に触れる — 「一部しか走らせていないのに緑と名乗る」。**

現在、緑の名乗りは **たった一行** `Paradise self-test: 449 passed, 0 failed` である。
この一行を:

1. `census.js` が読んで README の数にする(第22条)
2. `.github/workflows/tribunal.yml` **306 行**が読んで `verdict-report.json` の
   `tests.passed / tests.failed / tests.total` にする → `verdict.js` の SHIP/REWORK 判定になる
3. 人間(教主・神)が「楽園は健全だ」と読む

の三者が消費している。
**絞り込んだ走行がこの一行を同じ書式で吐けば、三者すべてが騙される。**
特に (2) は、`tribunal.yml` 27 行の `node tests/paradise.test.js` が
**引数も環境変数も付けずに全走している**ので CI は今のところ安全だが、
**同じ書式の名乗りが局所走行から出ること自体が事故の種**である。

**(D) 第38条 — gauge の前後数値。**

第38条は「改善は前後の数値で証明せよ」と要求する。
本改革の gauge は所要時間である。discover は**前**を測った:

| 指標 | 前(現状) |
|---|---|
| 全走 | **358.8 秒** |
| 全走の門数 | 449(+ 委譲先 92 = 実質 541 の assert 群) |
| Atlas 抜きの理論下限 | **21.9 秒**(実測合計より) |

**specify / design 相はこの数を「後」と比較すること。**
ただし比較は**同じ母数**でなければならない — 22 秒の走行と 359 秒の走行は
別のものを測っている。**「速くなった」ではなく「N 本を M 秒で測った」と語れ。**

---

## 5. 制約(design 相への引き継ぎ。設計案ではなく、事実としての枷)

1. **`test()` は 20 行目の 8 行の自作関数**である。フレームワークは無い。
   `pass` / `fail` のカウンタと `console.log('  ✓ ' + name)` だけ。
   絞り込みは**この関数一箇所で完結できる**(挿す場所は 20–23 行)。
2. **節見出しは `console.log` であって構造ではない。** 節と test の関係は
   「実行順に前後する」だけで、データとして繋がっていない。
   節単位で絞るなら、**節の宣言を機械が読める形にする必要がある**(現状は grep 相当)。
3. **節は主題ではない。** `Daily guard` 節に 110 本(1081–2573 行)が住み、
   identity / visual-verify / upstream / deploy / vendor / branch-guard が混在している。
   節を絞り込み単位にすると粒度が粗すぎる箇所がある。
4. **委譲先 9 本は `require` キャッシュ経由。** 親が 1 本の test に畳んでおり、
   子の 92 本は 449 に入らない。フィルタが子の内部まで届くかは別問題。
   `require` はキャッシュされるので、二度呼んでも二度走らない。
5. **`census.js` 90 行は自己診断を素で呼ぶ。** 環境変数は継承する、CLI 引数は渡さない。
   → 環境変数による絞り込みは census を汚染しうる(4.2 A)。
6. **`tribunal.yml` 27 行と 306 行が全走に依存している。** 306 行は
   `tail -1` で総括行を読んで verdict の数にする。**総括行の書式は契約である。**
7. **`README.md` 138 行の `# 449/449 pass` は census が書き換える。**
   手で触るな(第22条)。
8. **時間の 93.7% は 2 本(Atlas)。** 速度を欲するなら外す先はここ一択。
   だが Atlas 2 本は **実ブラウザで第一画面と動きを測る門**(第47条 / 第50条)であり、
   外すことは「見なかったものを緑と呼ぶ」誘惑と隣り合わせ。
   `atlas.check({ skipBrowser: true })` という逃げ道が engine 側に既に在る
   (`graph/atlas.js` 1367・1376 行)が、この 2 本は**意図的に使っていない**。
9. **業界の既定(4/4 が 0 件マッチで緑)は楽園の掟と衝突する。**
   踏襲すれば第16条に触れる。Mocha の `--fail-zero` だけが先例になる。
10. **名前は実行時にしか確定しない箇所が 1 つある**(2694 行のループ、7 本ぶんずれる)。
    静的解析でテスト名の一覧を作る実装はここで嘘をつく。

---

## 6. 生成物・生データの在り処(git 外)

| ファイル | 中身 |
|---|---|
| `C:\Users\kikus\AppData\Local\Temp\paradise-gate-timing\run-timing.js` | 使い捨ての計測器 |
| `…\paradise-gate-timing\timings.jsonl` | 449 行の `{section,name,ms}` + 総計 |
| `…\paradise-gate-timing\stdout.log` | 計測付き走行の全出力(556 行) |
| `…\paradise-gate-timing\baseline.log` / `baseline.time` | 素の全走の出力と `ELAPSED_MS=358808` |
| `…\paradise-gate-timing\agg2.json` | 節ごとの集計 |
| `…\paradise-filter-probe\` | node:test / jest / mocha / vitest の 0 件マッチ実測 |

`git status --porcelain` は `?? reform/gate-filter/` のみ(本書の置き場)。
**engine もテストも一行も書き換えていない。**
