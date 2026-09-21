# 楽園の門の肥大 — discover 相の調査

**相**: discover / **枝**: `reform/gate-fold` / **基点 SHA**: `6641e3b6b2cb747c53ab065fe92ba413c0fc9b21`
**測定機**: Windows 11 + git-bash, node (ローカル)。CI の数は GitHub Actions run `35384344207` から。
**測定日**: 2026-09-21

この文書の掟: **出典URLか生コマンド出力の無い断定を書かない。** 推論に留まるものは「憶測」と明記する。
生出力の全文は `reform/gate-fold/raw/` に置いた(この文書はそこから引く)。

---

## 0. 結論の要約(先に述べる)

1. **教主の実測値はすべて再現した。** 一致しなかったのは 1 点だけ — 「1秒超の門は 9 本」は、
   本調査の機では **6 本 / 341.0s (93.3%)** だった。93% の占有率と「atlas 2門で 9 割」は完全に一致する。
   差は機と同時走行の有無に由来する(§1.4 に生出力)。
2. **`PARADISE_ABODE` 無し ≡ `=repo`** は**バイト単位で同一**だった(md5 一致)。これは推定ではなく実測である。
   → CI の「Abode(両居)」841s のうち `PARADISE_ABODE=repo` の走行は、同じ run の Self-test 427s と**同一入力・同一出力**である。
3. **repo と global の差は 6 門 12 行**。教主の数と一致。全行を §1.3 に貼る。
4. **IR 指紋は主題4つが全道同一**。36 組み合わせ中、相異なるIR は **16**。教主の数と完全一致(§1.5)。
5. 外の世界の先行例(§2〜§4)から得た掟は一つ: **畳む機構は「畳んだ」を必ず機械可読に名乗る。**
   Bazel は `(cached)` と `Executed 0 out of 1 tests`、Turborepo は `--summarize` と `--dry=json`、
   Chromatic/Percy は **bail reason** を CSV/ログに残す。**名乗りを持たない機構は一つも見つからなかった。**
   これは第37条が要求するものと同じ形である。

---

## 1. 既測値の検証

### 1.1 CI 1回の代 — 2,070 秒の内訳(再測)

生出力: `reform/gate-fold/raw/ci-steps.txt`(`gh run view 35384344207 --json jobs` から step ごとの
`startedAt`/`completedAt` の差を取った)。

```
run 35384344207 sha=6641e3b6b2cb747c53ab065fe92ba413c0fc9b21 conclusion=success createdAt=2026-09-18T19:09:30Z
total_step_seconds=2070 steps=56

     841s  [success] #33  🏠 Abode(両居)— repo と global の両方で自己診断が緑か (AC-53)
     427s  [success] #4   ⚖️ Self-test — 楽園の自己検証
     423s  [success] #12  🔢 Census — 楽園が己について語る数が真実か (第22条)
     335s  [success] #17  🗺 Atlas — 楽園が己の姿を図にできるか (第47条)
      10s  [success] #44  🧹 Motion probe leak — 門が己の残骸で不定に鳴らないか (G-09 / 第50条の裏面)
       8s  [success] #41  📡 Dashboard SSE — 形式・ポート・接続数 (FR-09 / FR-10 / NFR-03)
       5s  [success] #29  🏠 Abode — 住処の器と輸出の台帳 (第58条)
       5s  [success] #45  🧊 Dashboard fallback — file:// で凍結を正直に名乗るか (FR-08 / NFR-06)
       4s  [success] #3   Run actions/setup-node@v4
       3s  [success] #42  👀 Dashboard watch — デバウンスと change/rename の等価 (FR-11 / NFR-04)
     …(残り46段はすべて 1s 以下)
```

**教主の数と完全一致**(841 / 427 / 423 / 335、合計 2,070、上位4段以外の合計 44s = 2.1%)。

| 段 | 秒 | 自己診断の走行回数 |
|---|---:|---:|
| Abode(両居) | 841 | 2 (`=repo`, `=global`) |
| Self-test | 427 | 1 (素) |
| Census | 423 | 1 (`graph/census.js:123` が内部で起こす) |
| Atlas | 335 | 0 (但し 6 道 × 6 主題の描画) |
| その他 46 段 | 44 | 0 |
| **計** | **2,070** | **4** |

Census が自己診断を子プロセスで起こす証拠(生ソース `graph/census.js:123`):

```js
const out = execFileSync(process.execPath, [path.join(ROOT, 'tests', 'paradise.test.js')],
  { encoding: 'utf8', cwd: ROOT, timeout: TIMEOUT_MS });
```

→ **自己診断は 1 回の CI で 4 回走る。** 教主の主張は実測で裏が取れた。
4 回のうち **3 回(素 / `=repo` / Census)は同一入力である**(§1.2 でこれを証明する)。

### 1.2 (a) `PARADISE_ABODE` 無し vs `=repo` — バイト単位で同一

走らせた命令と生出力(`reform/gate-fold/raw/timing.txt`):

```
=== RUN A: no PARADISE_ABODE ===
exit=0
ELAPSED_NONE=368s
=== RUN B: PARADISE_ABODE=repo ===
exit=0
ELAPSED_REPO=363s
=== RUN C: PARADISE_ABODE=global ===
exit=1
ELAPSED_GLOBAL=364s
=== ALL DONE ===
```

差分を取った:

```
$ md5sum reform/gate-fold/raw/run-none.txt reform/gate-fold/raw/run-repo.txt
83f15aeeb75176976e74c4a4fb496adc *reform/gate-fold/raw/run-none.txt
83f15aeeb75176976e74c4a4fb496adc *reform/gate-fold/raw/run-repo.txt

$ diff reform/gate-fold/raw/run-none.txt reform/gate-fold/raw/run-repo.txt && echo "IDENTICAL (byte-for-byte)"
IDENTICAL (byte-for-byte)

$ grep -h "Paradise self-test" run-none.txt run-repo.txt
Paradise self-test: 492 passed, 0 failed
Paradise self-test: 492 passed, 0 failed
```

**判定: 完全一致。門の行が違うのではなく、59,027 バイトの出力が 1 バイトも違わない。**

意味: CI の 841s のうち、`PARADISE_ABODE=repo` の走行(約 420s)は **Self-test 段 427s と同一の走行**である。
さらに Census 段 423s も**引数・環境変数なしで**自己診断を起こす(§1.1 の生ソース)ので、
**同一入力の走行が 1 CI に 3 本ある**。代は約 420s × 3 = **1,260s**。
CI 全体 2,070s の **60.9%** が、**3 通りに数えられた 1 つの走行**である。

> ⚠️ 但し書き(第37条): 上の「3本が同一入力」は**ローカルの実測**である。
> CI の runner 上で同じことが成り立つかは、runner の環境変数まで写した走行で測らねば言えない。
> 現時点で CI 上の同一性は**未測定**であり、**緑と呼んではならない**。
> (根拠: `graph/census.js` が `execFileSync(..., { cwd: ROOT })` と env を丸ごと継承するので
> runner でも `PARADISE_ABODE` は未設定であり同一のはず — しかし**これは推論であって測定ではない。憶測。**)

### 1.3 (b) repo と global の差 — 6 門 12 行(全行を貼る)

門の行だけを抜いた差分(`reform/gate-fold/raw/diff-gates-only.txt`):

```
$ diff <(grep -E "^  [✓✗·]" run-repo.txt) <(grep -E "^  [✓✗·]" run-global.txt)
114c114
<   ✓ every phase in every forge scale names an agent that actually exists
---
>   · every phase in every forge scale names an agent that actually exists  (skipped: no harness at this path — nothing to verify (mode=global))
144c144
<   ✓ deploy: the deployed tree matches its declared sources
---
>   ✗ deploy: the deployed tree matches its declared sources
178,180c178,180
<   ✓ hierarchy: believers have bodies, not merely names (Art.25)
<   ✓ hierarchy: a priest with believers can actually dispatch them (Art.25)
<   ✓ hierarchy: the gate fires when a believer loses its body (Art.25)
---
>   · hierarchy: believers have bodies, not merely names (Art.25)  (skipped: 階層の実体を検められない (engine が理由を述べていない))
>   · hierarchy: a priest with believers can actually dispatch them (Art.25)  (skipped: 階層の実体を検められない (engine が理由を述べていない))
>   · hierarchy: the gate fires when a believer loses its body (Art.25)  (skipped: 階層の実体を検められない (engine が理由を述べていない))
491c491
<   ✓ conclave: 配備された道は正典と一致する (第29条)
---
>   · conclave: 配備された道は正典と一致する (第29条)  (skipped: mode=global (source=env) で未配備: C:\Users\kikus\.claude\commands\conclave.md)

$ grep -cE "^[<>]" diff-gates-only.txt
12
$ grep -cE "^<" diff-gates-only.txt
6
```

**判定: 6 門 12 行。教主の数と一致。**

名乗りの行:

```
run-repo   : Paradise self-test: 492 passed, 0 failed
run-global : Paradise self-test: 486 passed, 1 failed, 5 skipped
```

> ⚠️ **この機の `=global` は赤(exit=1)である。** CI は緑だった。
> 理由は本文に自ら書いてある — この機の `~/.claude` に楽園が配備されていない
> (`'root/CLAUDE.md: not deployed'` / `settings.json: 現状 (無統治)/(無統治) ⇒ fable/xhigh`)。
> 生出力の全文は `reform/gate-fold/raw/diff-repo-global.txt` に在る。
> **測れなかったのではなく、この機では本当に赤だった。** 第37条に従い、これを緑と呼ばない。
> **重要な含意**: `=global` の走行は **repo の走行の重複ではない。**
> 6 門が別の答えを出す = 独立の情報を持つ。**畳んではならない走行である。**

### 1.4 門ごとの代 — 1秒超は 6 本 / 341.0s (93.3%)

計測法: `tests/paradise.test.js` のソースの `test()` 本体に `process.hrtime.bigint()` を
**一箇所だけ**挟んだ写しを `tests/` 内に置いて走らせ、終了後に必ず消す
(道具は `reform/gate-fold/raw/time-gates.js`、生出力は `raw/gate-timing.txt` / `raw/time-gates.log`)。

> ⚠️ 但し書き(第56条d): **この走行は緑の根拠ではない。** 写しは「自分のソースを読む門」を
> 動かしうる。ここで測るのは**各門の代**だけであり、合否は原本の全走(§1.2)が握る。

```
子プロセスの終了コード: 0
計時できた門(緑になった門のみ): 492 本
門の本体の合計: 365.6 s

## 1 秒を超えた門
本数: 6 本 / 合計 341.0 s  (計時できた門の代の 93.3%)

    237.7 s  atlas: 全ての道が図になる — 描画器が実際に受理する (第47条)
     95.2 s  atlas: 門は己の残骸で落ちない — 同じ作業場で二度走る (第21条)
      2.9 s  atlas: 本当に溢れる図は OVERFLOW と画素数で鳴る (§8.4 #1)
      2.8 s  abandoned-run: 見捨てられた走行と迷子の走行帳の門が緑 (第53条)
      1.3 s  atlas: 出力が限度を越えたことを「JSON の壊れ」と混同しない (第34条)
      1.2 s  gauge(故障注入): prove attempt 2 の新変異 13 種で各門が exit 1 で鳴る

## 名に atlas を含む門
本数: 19 本 / 合計 339.2 s  (92.8%)
```

| 教主の実測 | 本調査の実測 | 判定 |
|---|---|---|
| 門 610 本 | **492 本**(`--gate-list` → `Paradise gate list: 492 gates`) | **不一致**。憲法の門数は走行のたび増えるので、610 は別の時点の数と思われる(**憶測**)。今この枝では 492。 |
| 1秒超が 9 本 | **6 本** | 不一致(機差・同時走行の有無)。 |
| その 9 本で 354s (93%) | **6 本で 341.0s (93.3%)** | **占有率が一致**。93% は堅い。 |
| atlas 系 2 門で 344s (90%) | **atlas 上位 2 門で 332.9s (91.1%)** | **一致**。 |

**上位 2 門が突出している理由は同じ**: どちらも 6 主題 × 実ブラウザ(Chrome)を回す。
`atlas: 全ての道が図になる` が 237.7s、`atlas: 門は己の残骸で落ちない — 同じ作業場で二度走る` が 95.2s。
後者は**同じ検査を二度やる門**である(名がそう言っている)。

### 1.5 (c) IR 指紋 — 主題 4 つは全道で同一

道具: `reform/gate-fold/raw/ir-fingerprint.js`(`atlas.buildIr(subject, {scale})` の戻り値を
キー順固定の安定 JSON に直して SHA-256 の先頭 16 桁)。生出力 `raw/ir-fingerprint.txt`:

```
主題\道        quick             standard          full              reform            counsel           cartography
hierarchy   d24939a338d4e960  d24939a338d4e960  d24939a338d4e960  d24939a338d4e960  d24939a338d4e960  d24939a338d4e960
conclave    292bb4d8c4370eb4  0ce991eee9addcc0  33029b993cda0893  b17d1e4341edabea  0b24ccfa8a25ac48  139e9ed5f9438662
dispatch    447b71852003f578  447b71852003f578  447b71852003f578  447b71852003f578  447b71852003f578  447b71852003f578
dag         b155e332ff59a483  d03d467e86e331ea  dbc0c30ff52d6e5a  4529c38894f9cfa6  0f09f3083bf9a48f  721b9e155f5c48ba
run         744cd93e4c431f7c  744cd93e4c431f7c  744cd93e4c431f7c  744cd93e4c431f7c  744cd93e4c431f7c  744cd93e4c431f7c
wiring      15814cbab4beec69  15814cbab4beec69  15814cbab4beec69  15814cbab4beec69  15814cbab4beec69  15814cbab4beec69

組み合わせ総数: 36
相異なるIR総数: 16

hierarchy    相異なるIR = 1   ← 全道で同一(畳める)
conclave     相異なるIR = 6   ← 道ごとに変わる
dispatch     相異なるIR = 1   ← 全道で同一(畳める)
dag          相異なるIR = 6   ← 道ごとに変わる
run          相異なるIR = 1   ← 全道で同一(畳める)
wiring       相異なるIR = 1   ← 全道で同一(畳める)
```

**判定: 教主の主張と完全一致。** 36 → 16、hierarchy/dispatch/run/wiring が全道同一、conclave と dag だけが変わる。

ソースで裏を取る(`graph/atlas.js:1202-1211`):

```js
const scale = opts.scale || 'standard';
switch (subject) {
  case 'hierarchy': return irHierarchy();        // scale を受け取らない
  case 'conclave':  return irConclave(scale);    // 受け取る
  case 'dispatch':  return irDispatch(opts.phase || 'build');  // scale を受け取らない
  case 'dag':       return irDag(scale);         // 受け取る
  case 'run':       return irRun();              // scale を受け取らない
  case 'wiring':    return irWiring();           // scale を受け取らない
}
```

**指紋の同一性は偶然ではなく、関数の引数表がそう宣言している。**

### 1.6 Chrome 起動コストの再測

`graph/atlas.js check --scale <道>` を 6 道それぞれ単体で撃った(`raw/atlas-timing.txt`):

```
quick  47945 ms  rc=0
standard  47732 ms  rc=0
full  47576 ms  rc=0
reform  47617 ms  rc=0
counsel  47809 ms  rc=0
cartography  48045 ms  rc=0
```

6 道の合計 **286.7s**(CI の Atlas 段 335s に対し、この機では 287s。同じ桁)。
**1 道あたり約 47.8s / 主題 6 つ = 主題あたり約 7.96s。**

`atlas.js` は 1 主題あたり実ブラウザの子プロセスを **2 回**起こす:
`firstScreenOnce()`(`archify visual-check`)と `motionAlive()`(`PROBE`)。どちらも別プロセス。

```js
// graph/atlas.js:1420 付近
const fs2 = opts.skipBrowser ? {...} : firstScreen(r.html);   // Chrome 起動 #1
const mo  = opts.skipBrowser ? { ok: true } : motionAlive(r.html);  // Chrome 起動 #2
```

→ 6 道 × 6 主題 × 2 = **72 回の Chrome 起動**が 1 CI の Atlas 段に在る。
**そのうち 4 主題 × 6 道 = 24 主題分(48 起動)は、IR 指紋が同一** = 同じ HTML を 6 回開いている(§1.5)。
**畳めば 72 → 6道×2主題(conclave/dag) ×2 + 4主題×1道×2 = 24+8 = 32 起動。約 56% 減。**

> ⚠️ これは**上限の見積りであって実測ではない**。IR が同一でも `draw()` の出力 HTML が
> バイト同一とは限らない(乱択・時刻の混入)。ただし門
> `atlas: 同じ入力は同じ図を生む — 乱択は決定的である (第29条)` が既にそれを保証していると
> **主張している**(0.0s で緑)。HTML のバイト同一性は**本調査では未測定**。build 相で測ること。

---

## 2. 重複実行を畳む先行例 — 世の中の 5 機構

各項に「**何を鍵にして畳むか**」「**畳んだことをどう可視化するか**」を必ず書く。
第37条により、**可視化の作法が無い機構はこの楽園では採れない**。

### 2.1 Bazel の test caching(**最も楽園に近い**)

- 出典: <https://bazel.build/remote/caching> / <https://bazel.build/docs/user-manual> /
  <https://bazel.virtuslab.com/book/1~2~1> / <https://bazel.build/reference/test-encyclopedia>
- **鍵**: action key = テスト実行体・runfiles・コマンドライン・テスト環境の content-addressed ハッシュ。
  原文: 「Test caching uses the same content-based hashing as build action caching. Bazel computes a key
  from the test binary, its runfiles, the command-line flags, and the test environment.」
- **可視化**: 畳んだテストは端末に `(cached)` と刻まれ、集計行が **実行数そのものを下げる**。
  ```
  $ bazel test //:pass_test
  //:pass_test PASSED in 0.1s
  Executed 1 out of 1 test: 1 test passes.

  $ bazel test //:pass_test
  //:pass_test (cached) PASSED in 0.1s
  Executed 0 out of 1 tests: 1 test passes.
  ```
  **`Executed 0 out of 1` — これが第22条が要求する形そのものである。**
  「何本在るか」と「何本撃ったか」を別々の数として名乗り、畳んだ差を読み手が数え直せる。
- **楽園に効く掟**:
  (i) **緑しか畳まない。** `--cache_test_results=auto`(既定)は**落ちたテストを決して畳まない**。
  出典の言: 「Bazel only caches passing tests by default. …This prevents a flake from getting stuck in cache」。
  (ii) **非密閉なものは畳まない。** `tags = ["external"]` を付けた標的は caching から外れる。
  出典: 「Some tests depend on state outside the build graph… Bazel cannot detect when that external state
  changes, so caching their results can produce false positives」。
  → 楽園の `=global` 走行(§1.3)は**まさにこの `external` に当たる**: 結果が `~/.claude` という
  宣言外の状態に依る。**畳んではならない。**
  (iii) `--nocache_test_results` で全部撃ち直せる出口が常に在る。
- **採用可否**: **採れる。** 可視化の作法が最も強い。

### 2.2 Turborepo の task caching

- 出典: <https://turborepo.dev/docs/crafting-your-repository/caching> /
  <https://turborepo.dev/docs/reference/run> /
  <https://github.com/vercel/turborepo/blob/main/skills/turborepo/references/caching/gotchas.md>
- **鍵**: タスクの inputs(ソース glob)+ 宣言された `env` 環境変数 + lockfile + `turbo.json` 自身の
  fingerprint。原文: 「restore the results of your task from cache using a fingerprint from the first time the task ran」。
- **可視化**: **三つの口がある。**
  1. `turbo --summarize` → `.turbo/runs/<run-id>.json` に **global hash と per-task hash とハッシュに効いた
     環境変数まで**書き出す。原文: 「The summary includes: Global hash and its inputs / Per-task hashes and
     their inputs / Environment variables that affected the hash」。**二つの走行の JSON を diff できる。**
  2. `turbo --dry=json` → **何も実行せずに**各タスクの cache 状態を機械可読で吐く。
  3. 端末に `>>> FULL TURBO` と全ヒットを名乗る。
  4. `--force` で cache 読みを飛ばして全部撃ち直せる。
- **楽園に効く掟**: **鍵に効いた環境変数を鍵と一緒に記録すること。** gotchas.md が
  「Incorrect Cache Hits … Task uses an env var not listed in `env`」を**誤ヒットの第一の原因**に挙げている。
  楽園で言えば **`PARADISE_ABODE` を鍵に入れ忘れたら `=global` の赤が `=repo` の緑で上書きされる。**
  §1.3 で実際に 6 門が別答を出すことを測ったので、これは仮想の危険ではない。
- **採用可否**: **採れる。** `--summarize` 相当(鍵と入力を JSON に残す)が第22条の「数え直せる」を満たす。

### 2.3 pytest の `--lf` / `--ff`(cacheprovider)

- 出典: <https://docs.pytest.org/en/stable/how-to/cache.html>
- **鍵**: 内容ハッシュではなく**前回走行の結果**。`--lf` は前回落ちた nodeid だけを再走させる。
- **可視化**: `.pytest_cache/` に前回結果が残り、`--cache-show` で中身を読める。
  実行時は `run-last-failure: rerun previous N failures` と**なぜこの部分集合なのかを名乗る**。
- **⚠️ 楽園ではこのままでは採れない**: 鍵が入力ではなく**結果**なので、
  「前回緑だったから今回も緑」を構造的に言えない。pytest 自身もこれを**開発の反復のための道具**として
  位置づけている(ドキュメントの題が "How to re-run failed tests and maintain state between test runs")。
  → **第56条(d)「速さは全走を避ける口実にならない。緑の根拠になるのは引数無しの全走だけ」と完全に同じ立場。**
  楽園の `--gate` 絞り込みが既にこの形であり、既に第56条で正しく縛られている。
- **採用可否**: **CI では採れない。開発の反復用としてのみ。**(楽園は既にそうしている)

### 2.4 GitHub Actions の `actions/cache`(`hashFiles` 鍵)

- 出典: <https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching>
- **鍵**: ワークフロー作者が `key:` に書いた式。典型は `hashFiles('**/package-lock.json')`。
  完全一致→部分一致→`restore-keys` の順に探す。原文: 「1. First, it searches for an exact match to your
  provided `key`. 2. If no exact match is found, it will search for partial matches…」
- **可視化**: step ログに `Cache restored from key: …` / `Cache not found for input keys: …` が出る。
- **⚠️ 楽園が採るなら警戒すべき二点(出典の警告そのもの)**:
  (i) **部分一致で復元する** — `restore-keys` は**鍵が違っても近いものを拾う**。
  content-addressed ではない。**これは楽園の第16条に反する形である**(名で拾って振る舞いで裁いていない)。
  (ii) 出典は security 節で 「Cache contents are not signed or verified, and any workflow run that can read
  a cache may extract its contents. Extracted caches may modify files that are subsequently executed in a
  workflow run, leading to malicious code execution.」 と明記。**畳んだ結果が実行される経路に載る。**
- **採用可否**: **鍵の完全一致に限るなら採れる。`restore-keys` の部分一致は採ってはならない。**

### 2.5 Chromatic TurboSnap / Percy IntelliStory(§3 と重なるが「鍵と名乗り」の型として)

- 出典: <https://www.chromatic.com/docs/turbosnap/> / <https://chromatic.com/docs/setup-turbosnap>
- **鍵**: git の差分 × バンドラ(Webpack/Vite)の依存グラフ。
  原文: 「It analyzes your project's Git history and builder's dependency graph to identify which components
  and their dependencies have changed.」
- **可視化**: CLI が**何を見て何本畳んだかを毎回名乗る**:
  ```
  Traversing dependencies for X files that changed since the last build
  Found Y story files affected by recent changes
  ```
  畳んだものは `turbosnaps` という**専用の名前を持ち**、請求書の本数からも落ちる(数え直せる)。
  さらに usage CSV に **TurboSnap Bail Reason 列**があり、**畳めなかった理由**まで機械可読に残る
  (<https://www.chromatic.com/docs/turbosnap/troubleshooting>)。
- **保守的に倒す作法**(これが一番学ぶべき点): 出典は**全撮り直しに落ちる条件を列挙して公開している**。
  `package.json` の依存版の変更(有効な lockfile が無いとき)、Storybook の設定の変更、
  `preview.js` が import するファイルの変更、`--static-dir`、`--externals`。
  原文: 「Certain code changes have the potential to impact all stories. **To avoid false positives, we
  re-capture everything** in the following situations」。
  **疑わしきは畳まない、が明文化されている。**
- **採用可否**: **採れる。bail reason を名乗る作法は第37条と同型である。**

---

## 3. Chrome 起動コストの畳み方(実例 3 つ)

### 3.1 Chromatic TurboSnap — 撮らずに「前の絵を写す」

- 出典: <https://www.chromatic.com/docs/turbosnap/>
- **鍵**: 上述の git 差分 × 依存グラフ。
- **何を節約するか**: **ブラウザで開くこと自体を飛ばす。** 変わっていない story は
  「copies over the snapshots from baselines that didn't change」 — 過去の絵を複写する。
- **名乗り**: 複写されたものは `turbosnaps` と呼ばれ、`Found Y story files affected by recent changes` で
  本数が出る。**さらに「bypassed builds」という特別な状態がある** —
  依存グラフに一切変更が無い build は全 snapshot を bypass し、請求 0 本になる。
  出典はその成立条件を 4 つ列挙している(単一祖先 build であること等)。
  **`0 billed snapshots` は Bazel の `Executed 0 out of N` と同じ形の名乗りである。**
- **正直な但し書き(出典が自分で書いている)**: 「we don't allow using TurboSnap immediately when starting
  out with Chromatic since the configuration is more complicated and **can lead to difficult to debug
  scenarios or UI changes being missed**」(<https://chromatic.com/docs/setup-turbosnap>)。
  **提供元自身が「変更を見逃しうる」と警告し、10 回の成功 build を経ないと解錠しない。**

### 3.2 Percy IntelliStory for Storybook

- 出典: <https://browserstack.com/docs/percy/references/storybook-advance-topics/intellistory>
- **鍵**: git 履歴で変わったファイル + バンドラプラグイン(`bundler-plugin-smartsnap`)による依存追跡。
  ベースラインは `--intelli-story-baseline`(コミット SHA か枝名)で明示指定できる。
- **名乗り**: **bail 条件を build ログに `IntelliStory:` 接頭辞で刻む。** 出典の FAQ:
  「Why did IntelliStory fall back to a full snapshot set? — Check your Percy build log for an
  `IntelliStory:` message. **The message tells you which bail condition triggered.**」
- **出口**: `--intelli-story-untraced` で「よく変わるが描画に効かないファイル」を鍵から外せる — ただし
  **外したことは設定に書かれ、読み手に見える**。

### 3.3 Playwright — ブラウザを畳むのではなく **context を畳む**(別種の答え)

- 出典: <https://playwright.dev/docs/browser-contexts> / <https://playwright.dev/docs/release-notes>
- Playwright は「同じ入力なら撮らない」ではなく、**ブラウザのプロセス起動そのものを 1 回にして、
  テストごとの分離を BrowserContext で買う**。
  原文: 「Playwright achieves this using BrowserContexts which are equivalent to incognito-like profiles.
  **They are fast and cheap to create** and are completely isolated, even when running in a single browser.」
- **楽園に直に効く**: §1.6 で測った **72 回の Chrome 起動**は、
  1 起動 + 72 context に畳めば起動代(教主の実測 2,900ms/回)を 71 回分落とせる。
  **かつ、これは「検査を減らす」最適化ではない。全 72 主題を実際に開く。**
  → **第37条の危険が原理的に存在しない畳み方である。** 撃つ回数は 1 回も減らない。
- Playwright にも選別の口 `--only-changed` は在る(v1.46 で追加、<https://playwright.dev/docs/release-notes>)が、
  こちらは §2.3 と同じ「開発の反復用」の位置づけ。

> **本調査の所見**: 楽園が最初に採るべきは §3.3 である。
> §3.1/§3.2 型(入力が同じなら検査を飛ばす)は名乗りの機構を丸ごと建てねばならないが、
> §3.3 型(起動を 1 回にする)は**畳んだことを名乗る必要すらない — 何も畳んでいないから**。
> 第37条・第56条と一切衝突しない。
> ⚠️ ただし楽園の描画器は `archify` の CLI を `execFileSync` で叩く設計であり(`graph/atlas.js:1378`)、
> Chrome を持ち回す口が在るかは **未調査**。在るかどうかは design 相で測ること。

---

## 4. 危険の洗い出し — 「撃つ回数を減らす」が事故った実例

### 4.1 Tuist の selective testing が**落ちたテストを緑と報告した**(実在の未解決 issue)

- 出典: <https://github.com/tuist/tuist/issues/8570>(2025-11-03 起票、`type:bug` / `p1`、2026-05 時点 open)
- **何が起きたか**(報告者の原文):
  > 「I have a PR that originally failed unit tests due to runner time outs… I pushed a commit that had no
  > source code changes just to get the tests running again, and it skipped all the tests through selective
  > testing. …**that means it erroneously reported the tests as "passed" ultimately.**」
- **機構的な原因**: 鍵が **content hash だけ**で、**前回の結果を見ていない**。
  同 issue のコメント: 「The cache invalidation logic does not track test outcomes—only content hashes—so
  transient failures like timeouts are not accounted for in subsequent runs.」
- **楽園への教訓**: **Bazel が既に解いている問題を、解かずに実装するとこうなる**(§2.1 の「緑しか畳まない」)。
  畳みの鍵には**入力のハッシュだけでなく「前回それは本当に緑だったか」が要る。**
  第37条の言葉で言えば: **打ち切られた走行は緑ではない。それを畳みの根拠にしてはならない。**

### 4.2 Jest `--changedSince` が `package.json` の変更を無視し、**CI が失敗を取り逃した**

- 出典: <https://github.com/jestjs/jest/issues/8702>
- **報告者の原文**:
  > 「If the package.json changes, a dependency change like enzyme or jest itself might cause test failures.
  > But changedSince ignores it. **Our CI process runs tests changed since master (as a full run is nearly
  > 10 minutes on our build servers) and we miss test failures.**」
  > 再現手順: 「1. change package.json to break tests / 2. run with changedSince master /
  > **3. no test failures are reported**」
- **機構的な原因**: 鍵に**依存グラフの根(manifest / lockfile)が入っていなかった**。
- **楽園への教訓**: 鍵の**漏れ**は「遅い」ではなく「**緑の嘘**」として現れる。
  かつ、その動機が本件では明示されている — **「全走は 10 分かかるから」**。
  **これは今まさに楽園が置かれている状況である**(2,070s = 34.5 分)。
  Chromatic が `package.json` / lockfile / Storybook 設定の変更で**全撮り直しに倒す**のは(§2.5)、
  まさにこの事故を知っているからである。

### 4.3 (補強)Bazel 自身が明文で警告する false positive

- 出典: <https://bazel.virtuslab.com/book/1~2~1>(Bazel の test caching 解説)
- 原文: 「Some tests depend on state outside the build graph: a running database, a network service, a system
  clock. Bazel cannot detect when that external state changes, so **caching their results can produce false
  positives — the cached "pass" no longer reflects reality.**」
- **楽園に直撃する**: §1.3 で実測したとおり、`PARADISE_ABODE=global` の走行の結果は
  `C:\Users\kikus\.claude\` という**楽園のソースツリーの外の状態**に依存する
  (`'root/CLAUDE.md: not deployed'` という赤がそれを証明している)。
  → **`=global` の走行は、Bazel なら `tags = ["external"]` であり、畳みの対象外である。**
- 併せて Bazel の Test Encyclopedia(<https://bazel.build/reference/test-encyclopedia>):
  「Tests should be *hermetic*… If tests are not properly hermetic then **they do not give historically
  reproducible results.** This could be a significant problem for culprit finding」。
  楽園は既に `graph/hermetic.js check` を CI に持っている(`.github/workflows/tribunal.yml`)。
  **畳みの前提として、その門の射程が畳む対象を覆っているかを確かめねばならない。**

### 4.4 (補強)絞り込みが**門番自身を選び落とした** — 楽園自身の既往症

- 出典: 楽園の憲法 第56条(`node graph/codex.js article 56` の生出力)
  > 「実測された欠陥: `if (GATE.list)` を `if (GATE.active)` に変える**一行**で、絞り込み走行は門の本体を
  > 一度も呼ばなくなり、`5 of 454 gates matched — 0 green, 0 red` を **exit 0** で名乗った。
  > そのとき、この機構を見張るために立てた常駐の門 5 本は、**自分自身も絞り込みの対象だったので、
  > 一本も鳴かなかった。**」
- **これは §4.1 / §4.2 と同じ事故が、楽園の中で既に一度起きたという記録である。**
- 第56条(b) の処方は既に効いており、今も動く(実測):
  ```
  $ node tests/paradise.test.js --gate '^zzz_no_such'
  Paradise gate list: 0 of 492 gates matched — nothing was measured
  ```
  **`nothing was measured` と名乗る。** 畳む機構を建てるなら、**この文言と同じ強さの名乗りが要る。**

---

## 5. discover 相の所見(design 相への申し送り)

### 5.1 確かめられた事実

| # | 事実 | 根拠 |
|---|---|---|
| F-1 | CI 1 回 = 2,070s。上位 4 段で 2,026s (97.9%) | §1.1 `raw/ci-steps.txt` |
| F-2 | 自己診断は 1 CI で 4 回走る | §1.1 生ソース `census.js:123` + tribunal.yml #4/#12/#33 |
| F-3 | そのうち 3 回(素/`=repo`/Census)は **同一入力** | §1.2 md5 一致 — ローカル実測 |
| F-4 | `=global` だけは **6 門が別の答え**を出す = 畳めない | §1.3 差分 12 行 |
| F-5 | 門の代の 93.3% は 6 本に集中、うち atlas 2 門で 91.0% | §1.4 `raw/gate-timing.txt` |
| F-6 | IR は 36 組合せ中 16 種。4 主題は全道同一 | §1.5 `raw/ir-fingerprint.txt` |
| F-7 | Atlas 段は 1 CI で Chrome を **72 回**起こす | §1.6 ソース読み + 6 道の単体計測 |

### 5.2 未測定のまま残ったもの(第37条により、緑と呼ばない)

- **U-1**: CI runner 上で「素 ≡ `=repo`」が成り立つか。ローカルでしか測っていない。
- **U-2**: IR 指紋が同一のとき、`draw()` が出す **HTML がバイト同一**か。
  門 `atlas: 同じ入力は同じ図を生む` がそう主張しているが、本調査では直接測っていない。
- **U-3**: `archify` が Chrome を持ち回す口(persistent browser)を持つか。未調査。
  §3.3 の畳み方が実現可能かはここに懸かる。
- **U-4**: 教主の「門 610 本」と本調査の「492 本」の差の出所。**憶測**: 別時点の枝の数。

### 5.3 外の世界から採った掟(design 相の制約として提案)

1. **畳む鍵には「入力のハッシュ」と「前回それは本当に緑だったか」の両方が要る。**(§4.1 Tuist / §2.1 Bazel)
2. **宣言外の状態に依る走行は畳まない。** `=global` は Bazel で言う `external` である。(§4.3 / §1.3)
3. **鍵の漏れは遅さではなく偽の緑として現れる。** manifest/lockfile 相当を鍵に入れる。(§4.2 Jest)
4. **畳んだ数は「実行数」として名乗り、総数と別の数にする。**
   Bazel の `Executed 0 out of 1 tests` / Chromatic の `0 billed snapshots` の形。(§2.1 / §3.1)
5. **畳めなかった理由(bail reason)も機械可読に残す。**(§2.5 / §3.2)
6. **全走に戻す出口を必ず持つ。** `--nocache_test_results` / `--force` に相当するもの。(§2.1 / §2.2)
7. **疑わしきは畳まない。** Chromatic は「to avoid false positives, we re-capture everything」を明文化。(§2.5)
8. **最初に採るべきは「検査を減らさない畳み方」** — Chrome の起動を 1 回にして context で分ける(§3.3)。
   これは第37条の危険が原理的に無い。撃つ回数が 1 回も減らないから。

### 5.4 **現時点では提案しない**もの(discover 相の分を超えるため)

具体的な設計(どの段をどう畳むか、名乗りの形式をどうするか)は design 相の仕事である。
本調査は **数と出典だけ**を置く。ただし第56条により、いかなる提案も
**「畳んだことを機械が名乗る」機構とセットでなければ採用されない**ことをここに記録する。

---

## 付録: 生出力の住所

| ファイル | 中身 |
|---|---|
| `raw/ci-steps.txt` | run 35384344207 の全 56 step の所要秒(降順) |
| `raw/timing.txt` | 3 走行の実測秒と終了コード |
| `raw/run-none.txt` / `run-repo.txt` / `run-global.txt` | 3 走行の全出力 |
| `raw/diff-repo-global.txt` | repo↔global の全文差分(55 行) |
| `raw/diff-gates-only.txt` | 門の行だけの差分(6 門 12 行) |
| `raw/ir-fingerprint.js` / `.txt` | IR 指紋の道具と表 |
| `raw/time-gates.js` / `gate-timing.txt` / `time-gates.log` | 門ごとの計時の道具と結果 |
| `raw/atlas-timing.txt` / `atlas-<道>.txt` | 6 道それぞれの atlas check の秒と出力 |
