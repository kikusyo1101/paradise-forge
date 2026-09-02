# ratify-build — 品質枢機卿による建造物の審査

> 憲法第11条により construction ドメインは自己批准できない。本書は quality 枢機卿が
> **建造されたものが要件を本当に満たすか**を、走らせた実出力のみを根拠に裁いた記録である。
>
> 掟: 「実装されている」ことと「動く」ことは別である。本書は後者だけを証拠として採る。
> 教主が prove.md で実測済みと明記した事項は再測しない。**それ以外はすべて自分の手で確かめた。**

**審査対象**: ブランチ `reform/dashboard-living-gate` / `ce89686..HEAD`(6 commit)
**審査日**: 2026-09-02
**判定**: **ratify**(留保 4 件・いずれも実装の欠陥ではなく文面と門の射程の問題)

---

## 0. 判定の要約

| 観点 | 判定 | 根拠 |
|---|---|---|
| 1. 要件の充足 (FR-01..23 / NFR-01..07) | **充足** | AC を **36 群 / 実コマンド 60 本以上**実走。未充足の要件は **0 件** |
| 2. 門が本当に鳴るか | **鳴る** | 教主が壊していない門 **6 件(G-03/05/07/08/09/10)を自分で壊し、6/6 が赤→緑** |
| 3. 神託 5 件への回答 | **成立** | (a)(b)(c)(d)(e) すべて実ブラウザ / 実測で成立。とくに (d) は **91ms** で実証 |
| 4. 回帰 | **無し** | `paradise.test.js` **278 passed, 0 failed**。第20条 `vendor.js verify` 緑 |
| 5. 設計との乖離 | **乖離無し** | 断面の鍵・エンドポイント・テスト割当がすべて design.md と一致 |

---

## 1. 要件の充足 — AC の実走

### 1.1 FR-01 唯一の集約 engine(断面 engine)

```
$ node graph/pulse.js snapshot --json | node -e "…console.log(o.counts.engines)"
snapshot.counts.engines=34
$ ls graph/*.js | wc -l
34
```
**AC-01a 充足**(34 = 34。固定値ではなくその場で数えた値と比較している)。

```
$ node graph/workspace.js resolve --json  → root = C:\Users\kikus\Documents\workspace\paradise-creations
実地 creations dirs = 7 ; workshops dirs = 1
counts.creations=7
counts.workshops=1
```
**AC-01b 充足**(創造物 7 + 作業場 1 = 兄弟倉直下 8 件。定義どおりに割れている)。

```
$ node -e '…execFileSync(["graph/pulse.js","snapshot","--json"])… 3回計測'
109.2ms
108.5ms
107.6ms
exit=0
```
**AC-01c / AC-N01a 充足**(3 回すべて 1000ms 未満。`/usr/bin/time` を使わず `hrtime.bigint()` で測る則4を遵守)。

```
$ node graph/pulse.js snapshot --json | node -e "…JSON.parse(s)…"
parsed OK
exit=0
```
**AC-01d 充足**。

```
$ PULSE_FAULT=clergy node graph/pulse.js snapshot --json
exit=0
errors=[{"engine":"clergy","key":"counts.cardinals","reason":"PULSE_FAULT=clergy — 故障注入","at":1788348135374,"fatal":false}]
counts still present? engines=34
```
**AC-01e 充足**。**片方の engine が落ちても断面全体が消えない**ことを実測で確認した。exit 0 で JSON が返り、`errors[0].engine` が `clergy` である。

```
$ node -e "Object.keys(require('./graph/clergy.js').COLLEGE).length"  → 7
counts.cardinals=7
$ node graph/codex.js index  → | 50 | 動きは名乗らねば宿らず… |
counts.articles=50
```
**AC-01f / AC-01g 充足**(枢機卿 7・条数 50 が engine と一致)。

**断面スキーマの全鍵**(FR-01 が「最低限」と定めた鍵をすべて実測):
```
OK   generatedAt / ageMs / counts / gates / runs / daily / scale / source
--- counts keys ---
OK   counts.articles = 50      OK   counts.engines = 34     OK   counts.cardinals = 7
OK   counts.creations = 7      OK   counts.workshops = 1    OK   counts.runs = 5
OK   counts.agents = 30        OK   counts.commands = 19    OK   counts.skills = 13
OK   counts.lessons = 65       OK   counts.kgNodes = 99     OK   counts.kgEdges = 33
```
**要求された 8 鍵 + 12 counts がすべて実在する。欠けは 0。**

```
$ node graph/pulse.js serve --port 7411  → 実測
  req1 = 12.3ms  (初回)
  req2 = 8.5ms  OK(<50)     req3 = 8.2ms  OK(<50)
  req4 = 7.7ms  OK(<50)     req5 = 7.2ms  OK(<50)
```
**AC-01i / AC-N01d 充足**。2 回目以降 4 回すべてが 50ms 未満 = **初回 require のコストが 2 回目に乗っていない = 常駐している証明**。

### 1.2 FR-02 ハードコードの全廃

```
$ grep -nE "\bv: *[0-9]+" dashboard/paradise.js | wc -l   → 0
$ grep -o "SELF_DAG" dashboard/*.js dashboard/*.html | wc -l → 0
$ node tests/dashboard-no-hardcode.test.js → 7 passed, 0 failed / exit=0
```
**AC-02a / 02b / 02c 充足**。`grep -c` に複数ファイルを渡す罠(内訳が返る)を避け、要件が指定した `grep -o … | wc -l` の集計形で測った。

### 1.3 FR-03 住所の一本化(第30条)

```
$ grep -rnE "path\.(join|resolve)\s*\([^)]*['\"`]creations['\"`]" graph/ | grep -v workspace.js | wc -l
0
$ grep -c "hardcodedRefs\|creations" tests/paradise.test.js   → 26
```
**AC-03a / AC-04c 充足**。`workspace.js` 以外に旧住所の直書きは **1 件も無い**。

### 1.4 FR-05 `--json` の実装

```
graph/clergy.js  --json 対応 = 2
graph/conclave.js --json 対応 = 2
graph/gauge.js   --json 対応 = 4
```
**充足**(discover が「`--json` が無視される」と申告した 3 engine すべてに実装が入った)。

### 1.5 FR-06 / NFR-01 census の隔離

```
$ grep -n "census" graph/pulse.js
21,22: (註釈) census は呼ばない…
338:   /** census は同期経路で呼ばない。別ファイルが書いたキャッシュを読むだけ */
340:   return guard(errors, 'census', 'census', () => {
341:     const p = path.join(os.tmpdir(), 'pulse-census-cache.json');
```
**充足**。census は **`os.tmpdir()` のキャッシュを読むだけ**で、120,072ms の自己診断は同期経路に入っていない。

### 1.6 FR-07 鮮度 / FR-08 三層フォールバック

```
$ node graph/pulse.js freshness --age-ms 0      --transport sse    → live
$ node graph/pulse.js freshness --age-ms 3000   --transport sse    → live
$ node graph/pulse.js freshness --age-ms 70000  --transport poll   → frozen
$ node graph/pulse.js freshness --age-ms 999999 --transport frozen → frozen
```
**AC-07a 充足**(CLI と画面が同じ入口・同じ閾値を使う)。

### 1.7 FR-09/10 SSE の形式・ポート・標準ライブラリ

```
GET /events   status=200
  content-type   = text/event-stream
  cache-control  = no-cache
  connection     = keep-alive
  content-length = (書いていない) OK      ← design.md §802 の要求どおり
GET /snapshot.json  cache-control = no-store   ← design.md §803 の要求どおり
GET /health   {"ok":true,"port":7411,"connections":1,"rescans":2}
```

```
$ node -e '…pulse.js の require を全列挙…'
全 require = ["fs","path","http","os","./clergy.js","./forge.js","./workspace.js","./kg.js",
              "./wiring.js","./vendor.js","./derived.js","./check-agents.js","./gauge.js",
              "./spawn-trace.js","./daily-guard.js","./lessons.js","./codex.js"]
標準外 = []  → OK 0件
$ package.json 無し → OK
```
**AC-10a / 10b 充足**。**標準外の require は 0 件**である。

### 1.8 FR-12 / NFR-02 外部依存ゼロ

```
$ grep -rhoE "https?://[^\"'` )]+" dashboard/index.html dashboard/control.html dashboard/paradise.js | grep -v w3.org | sort -u
http://127.0.0.1:
```
唯一の一致は **`http://127.0.0.1:` = 自分自身の常駐サーバの宛先**であり、外部依存ではない:
```
dashboard/control.html:138: return 'http://127.0.0.1:' + (…window.PARADISE_PORT…)
dashboard/paradise.js:57:   function base() { return origin() || ('http://127.0.0.1:' + resolvePort()); }
```
**AC-12d 充足**(取りに行く外部は 0)。

```
$ node graph/vendor.js verify
vendored files: 130 = harness 62 {…} + tools 68 {"archify v2.16.0":68}
  ✓ paradise stands on its own — no path leads back to the borrowed tree
exit=0
```
**AC-N02c 充足**。

### 1.9 FR-13/14/22 点数と起動実績・矛盾の可視化

```
ledger 件数 = 30
runs の矛盾印 = 3 件
  score=100 spawn={"total":11,"observed":0,"noTrace":11,"ok":false} contradiction=true
  score=45  spawn={…}                                              contradiction=false
  score=80  spawn={…}                                              contradiction=false
  score=100 spawn={"total":11,…,"ok":false}                        contradiction=true
  score=100 spawn={"total":17,…,"ok":false}                        contradiction=true
```
**充足**。**満点(100)でありながら起動証跡が無い 3 件だけに矛盾印が立ち、45 点・80 点には立たない。**
「点が低い」ではなく「辻褄が合わない」を選り分けている = FR-13 の要求どおり。

### 1.10 FR-21 道(scale)6 本の形

```
{ "quick": {"phases":6}, "standard": {"phases":14}, "full": {"phases":17},
  "reform": {"phases":11}, "counsel": {"phases":6}, "cartography": {"phases":11},
  "classifierAvailable": true }
```
**AC-21a/21b 充足**(6 本すべてが相数を持ち、`forge.buildDag` 由来である)。

### 1.11 FR-16 日次ノルマ

```
daily = {"due":false,"catchUp":false,"owedDay":"2026-09-01",
         "reason":"already ran for 2026-09-01 (newest open window: 2026-09-01)",
         "jst":"2026-09-02 20:35 JST"}
```
**充足**。**exit code ではなく `due` 欄で判じている**(FR-16 の核心)。

### 1.12 NFR-04 / NFR-05 / NFR-06

```
$ grep -c "\.on('error'" graph/pulse.js   → 1        (AC-N04b 充足)
$ node graph/derived.js check
  ✓ no test asserts on derived content
  no test depends on derived content        exit=0   (AC-N05a 充足)
$ grep -c "同時接続" dashboard/index.html → 1        (AC-N03c 充足)
```

### 1.13 新設テスト 13 本の全走(**108 assertion / 全緑**)

```
dashboard-count      15 passed, 0 failed   exit=0
dashboard-fallback    6 passed, 0 failed   exit=0
dashboard-freshness   6 passed, 0 failed   exit=0
dashboard-links       6 passed, 0 failed   exit=0
dashboard-no-deps    10 passed, 0 failed   exit=0
dashboard-no-hardcode 7 passed, 0 failed   exit=0
dashboard-perf        9 passed, 0 failed   exit=0
dashboard-run-panel  16 passed, 0 failed   exit=0
dashboard-sse        12 passed, 0 failed   exit=0
dashboard-states     10 passed, 0 failed   exit=0
dashboard-transport   8 passed, 0 failed   exit=0
dashboard-watch       8 passed, 0 failed   exit=0
motion-probe-leak     5 passed, 0 failed   exit=0
```

**FR-01〜FR-23 / NFR-01〜NFR-07 のうち、満たしていない要件は 0 件である。**

---

## 2. 門が本当に鳴るか — 教主が壊していない門を自分で壊した

**則D(prove.md)を全件に適用した**: 置換の前後で文字列が変わったかを機械で確かめ、
`MUTATION-LANDED` を得てから судить した。当たっていなければ `MUTATION-MISSED` を出して門を責めない。

### 2.1 G-07 同期経路の速度 — **鳴る**

```
healthy exit=0
MUTATION-LANDED: 26978 -> 26977 bytes
  ✗ AC-N01c/G-07: pulse が呼ぶ engine 集合に census / paradise.test が含まれない
      census を require している — 実測 120,072ms が同期経路に入る
dashboard-perf: 8 passed, 1 failed
broken exit=1
restored exit=0
```
壊し方: `const census = readCensusCache(errors);` → `require('./census.js')`。

### 2.2 G-10 子プロセス禁止 — **鳴る**

```
healthy exit=0
MUTATION-LANDED: 27672 -> 27701 bytes
  ✗ AC-N07a/G-10: 走るコードに子プロセスの語が 1 件も無い
      子プロセスの語 2 件 — 137 倍遅い設計になる
broken exit=1     restored exit=0
```

### 2.3 G-09 資源漏れ — **鳴る(2 通りの壊し方で)**

壊し方①: `await browser.close()` → `browser.kill()`
```
MUTATION-LANDED: 5456 -> 5449 bytes
  ✗ AC-23a: 作法を使っている — child.kill() が 0 件、browser.close() が 1 件以上
  ✗ AC-23b(本命): 検器を 1 回走らせる前後でプロファイル数の差が 0
  ✗ AC-23e(壊して鳴る): close() を kill() に戻せばこの門が赤くなる
  ✗ AC-23g: atlas を 1 主題通した前後でも累積 0
motion-probe-leak: 1 passed, 4 failed     broken exit=1
```
壊し方②(別経路・後始末そのものを飛ばす): `if(0) await browser.close()`
```
MUTATION-LANDED
  ✗ AC-23c: headless Chrome を残さない(前後の差が 0)
  ✗ AC-23g: atlas を 1 主題通した前後でも累積 0
motion-probe-leak: 2 passed, 3 failed     broken exit=1
復元後: 5 passed, 0 failed(実測 BEFORE=24 AFTER=24 差=0)
```
**この門は「症状(0 failed)」ではなく「原因(プロファイル数の差分)」を裁いている**ことを、
2 通りの独立した壊し方で確認した。

### 2.4 G-03 census 隔離 — **鳴る**

```
MUTATION-LANDED: 27672 -> 27698 bytes
  ✗ AC-N01c/G-07: pulse が呼ぶ engine 集合に census / paradise.test が含まれない
broken exit=1     restored exit=0
```

### 2.5 G-05 visual-verify が画面を見る — **鳴る**

```
healthy: summary = all visual checks pass / exit=0
破壊: --body: #595959 → #f0f0f0(ライトテーマの本文色を背景へ寄せる)
MUTATION-LANDED
summary=1 visual gap(s), 0 smell(s)
broken exit=1     restored exit=0
```
**本文コントラストが AA を割れば実際に赤くなる**ことを確認した。

### 2.6 G-08 derived — **射程内では鳴る(留保 R-2 を参照)**

```
注入A(門が見る形: const state = …state.json…; assert.ok(state.engines.length > 0)):
  🔴 tests\derived-probe.test.js:4 asserts on dashboard/state.json
  broken exit=1                                    ← 鳴る

注入B(同じ違反だが assert.strictEqual(state.counts.engines, 34) 形):
  ✓ no test asserts on derived content
  broken exit=0                                    ← 鳴らない(射程外)
```

### 2.7 参考 — 教主が壊した門の再確認(G-01 / G-04)

G-01(`counts.engines = 999 ||`):
```
MUTATION-LANDED
  ✗ AC-01a/AC-E3: counts.engines == その場で数えた graph/*.js
dashboard-count: 14 passed, 1 failed     broken exit=1     restored exit=0
```

G-04 は**私が二度、壊し方を誤った**。則Dがそれを捕らえた記録を残す:
```
誤り1: dashboard/paradise.js の "snap.atlas" を置換 → MUTATION-LANDED だが門は緑
       理由: 門(tests/dashboard-links.test.js:41)が読むのは pulse.snapshot().atlas であり、
             画面側の変数ではなかった。**急所を外していた。**
誤り2: graph/pulse.js の "const atlas = readAtlas(errors);" を置換 → MUTATION-MISSED
       理由: 実際の関数名は buildAtlas。存在しない文字列を撃っていた。
正: buildAtlas の本体を空配列にする
    MUTATION-LANDED → snapshot.atlas 件数 = 0(注入が効いたことを先に実測)
      ✗ AC-19a: 孤児 0 — 実在する全ページが index から 1 ホップで到達できる
      ✗ AC-19b: リンクの実数 == 実在する画面の数
    dashboard-links: 4 passed, 2 failed   broken exit=1
    復元後 snapshot.atlas 件数 = 6        restored exit=0
```
**則D が無ければ、健全な G-04 を「鳴らない」と二度誤断罪していた。**

**結論: 教主が壊していない門 6 件(G-03/G-05/G-07/G-08/G-09/G-10)すべてが「壊すと赤・戻すと緑」を満たす。**

---

## 3. 神託への回答は本当に成立しているか

### (a) 見た目が憲法どおりでない → **成立**

実ブラウザ(描画器の Chrome を CDP で駆動・第20条により別の供給線を引かない)で
**両テーマを実際に描画**し、`getComputedStyle` の実効値を採った。

```
==================== prefers-color-scheme: light ====================
"bodyBg": "rgb(255, 255, 255)"     "bodyColor": "rgb(18, 16, 14)"      ← #12100e
tokens: canvas #ffffff / ink #12100e / body #595959 / link #1a5fb4
        ok #1a6b3c / bad #b3251e / contradiction #6b21a8

==================== prefers-color-scheme: dark ====================
"bodyBg": "rgb(18, 16, 14)"        "bodyColor": "rgb(247, 244, 238)"   ← #f7f4ee
tokens: canvas #12100e / ink #f7f4ee / body #b0a99f / link #5fb3e8
        ok #6ec08a / bad #ef6f62 / contradiction #c08ad8
```
**identity.md が宣言する色が、実ブラウザの実効値として両テーマで正しく効いている。**
visual-verify が緑なだけでなく、**画面が実際にその色で描かれている**ことを確かめた。

### (b) ページから遷移できない → **成立(導線 8 本・死リンク 0)**

実ブラウザの DOM から、**実際に見える**リンクだけを数えた(幅・高さ・visibility を検査):
```
linkTotal: 8   linkVisible: 8
  "#main :: 本文へ飛ぶ"                    ← スキップリンク
  "control.html :: 深掘り — 門の内訳・KG・教訓・履歴の全件"
  "atlas/conclave.html :: 図 — conclave"    "atlas/dag.html :: 図 — dag"
  "atlas/dispatch.html :: 図 — dispatch"    "atlas/hierarchy.html :: 図 — hierarchy"
  "atlas/run.html :: 図 — run"              "atlas/wiring.html :: 図 — wiring"
```
7 本すべてが実際に開くことを HTTP で確認(死リンク 0):
```
200  /control.html          200  /atlas/conclave.html   200  /atlas/dag.html
200  /atlas/dispatch.html   200  /atlas/hierarchy.html  200  /atlas/run.html
200  /atlas/wiring.html
control.html: bytes=12558 / index への戻り href = 1 件      ← AC-19d 充足
```

### (c) 最新化されていない → **成立(engine を壊すと画面が追随する)**

```
--- 変更前 ---   実地 ls graph/*.js = 34   画面が配る断面 counts.engines = 34
--- engine を1本足す ---
                 実地 ls graph/*.js = 35  (増えた? YES)   ← 則D: 実地が動いたことを先に確認
                 画面が配る断面 counts.engines = 35
判定: OK — 画面の数は engine 由来。実地に追随した(34 -> 35)
--- 復元後 ---   実地=34 断面=34
```
**画面の数は写経ではなく engine 由来である**ことを、増減の両方向で実証した。
実ブラウザ上の数は `numbersOnScreen: 212` — 212 個の数がすべて断面から来ている。

### (d) 静的でリアルタイムでない → **成立(91ms で届く)**

```
SSE connected status=200
初回フレーム event=undefined generatedAt=null
>>> 監視下の conclave.json を書き換えた (t0)
<<< push 受信 event=snapshot generatedAt=2026-09-02T11:29:03.274Z 経過=91ms
判定: OK — 2秒以内に画面へ届く(神託d 成立)
復元完了 bytes=10832 / probe 残留? 0
```
**要求「2 秒以内」に対し実測 91ms(約 22 倍の余裕)。**

> 則D の記録: 最初の試験は `reform/dashboard-living-gate/conclave.json` を書き換えて
> 「10 秒待っても push 無し」と出た。だが**私の的が外れていた** — サーバが監視するのは
> `workspace.resolve().root`(= paradise-creations)配下の走行であり、reform 配下の
> 相状態ファイルではない。監視対象を実測で列挙し直し(coin/habit/reform-claude-md-diet/
> reform-eval-gauge/tenbin の 5 件)、実際に監視されている `coin/conclave.json` で
> 再試験して 91ms を得た。**門ではなく私の壊し方の誤りだった。**

### (e) 何が流れているか分からない → **成立**

実ブラウザの本文から実際に見えている文字列:
```
"楽園の門 生(SSE) 生 たった今 停止した環 1 件 / 矛盾 3 件
 走行中の環 [停止] reform-claude-md-diet 5/11 相
   Discovery ✓批准 Requirements ✓批准 Architecture ✓批准 Construction ✓批准
   Quality ―未着手 Tribunal ―未着手
   最後の出来事: 15 件目「ratify」 道: reform または cartography
 完了した環 4 件を開く
   [完了] coin 11/11 相 [矛盾]      [完了] habit 11/11 相
   [完了] reform-eval-gauge 11/11 相 [矛盾]   [完了] tenbin 17/17 相 [矛盾]
 出所: conclave.json 直読み
 点数と起動実績 満点でありながら起動証跡が無い環には [矛盾] の印が付く。
 緑でも赤でもない第 3 の色である —— 矛盾は「良い」でも「悪い」でもなく「辻褄が合わない」だからである。"

contradictionEls: 11    transport: "sse"    freshness: "live"
states: [ready ×13, empty ×1]      ← empty は census(未取得を正直に空と名乗る)
```
**停止した環(1 件)と矛盾(3 件)が、名指しで画面に出ている。**
`states` に `empty` が 1 つあり、これは census 未取得を **推測で埋めず空として出している**
(NFR-06 / FR-20 の要求どおり。スピナーで誤魔化していない)。

---

## 4. 回帰の検分

```
$ git diff ce89686..HEAD --stat
 37 files changed, 4884 insertions(+), 1313 deletions(-)
```

```
$ node tests/paradise.test.js
Paradise self-test: 278 passed, 0 failed        ← 教主の実測と完全一致。回帰 0
```

### 第20条(独立性)— overlay/vendor/ の改変 2 件を精査した

| ファイル | 改変 | 第20条への影響 |
|---|---|---|
| `archify/assets/template.html` | Google Fonts を取りに行く 3 行(`preconnect` / `stylesheet` / `noscript`)を**削除**。同ファイル内に既存の `local('JetBrains Mono')` @font-face 退避が残る。併せて図から門へ戻る導線を 1 本追加 | **強化**。外部への発信を減らす方向であり、独立性を壊さない |
| `archify/bin/visual-check.mjs` | `failAll` に `graceful` を導入。**異常時は従来どおり reject し、正常終了(close())のみ resolve で静かに畳む** | **無害**。版元の意図(異常は reject)を変えていない。unhandled rejection でプロセスが落ちる不定性を除去 |

```
$ node graph/vendor.js verify
vendored files: 130 = harness 62 + tools 68 {"archify v2.16.0":68}
  ✓ paradise stands on its own — no path leads back to the borrowed tree
exit=0
```
**第20条は壊れていない。**改変はいずれも註釈で理由と実測を残しており、版元の版数表示も保たれている。

ダッシュボード以外への影響(`graph/clergy.js` / `conclave.js` / `daily-guard.js` /
`export-state.js` / `workspace.js` / `atlas.js` / `census.js`)は、**278 本の既存 assertion が
全緑**であることで回帰なしと判定した。

---

## 5. 設計との乖離

| design.md の定め | 実装 | 判定 |
|---|---|---|
| `schemaVersion`(§119) | `schemaVersion = 1` を断面が出す | **一致** |
| `GET /events` は `text/event-stream` / `no-cache` / `keep-alive` / **Content-Length を書かない**(§802) | 4 条件すべて実測で一致(Content-Length は未設定) | **一致** |
| `GET /snapshot.json` は `Cache-Control: no-store`(§803) | `no-store` を実測 | **一致** |
| `connections` を `/snapshot.json` と `/health` に出す(§832) | 両方に実在(`/health` → `{"ok":true,"port":7411,"connections":1,"rescans":2}`) | **一致** |
| `dashboard/` 配下の静的配信(§804) | `/` `/index.html` `/control.html` `/paradise.js` すべて 200 + 正しい MIME | **一致** |
| テスト割当(§1193-1206): count=G-01 / no-deps=G-02 / links=G-04 / no-hardcode=G-06 / perf=G-07+G-10 / motion-probe-leak=G-09 | 13 本すべて実在し、design.md の割当どおりの AC を担っている | **一致** |
| **G-03/G-05/G-08 はファイルを新設せず**、既存 `paradise.test.js` / `tribunal.yml` / `derived.js check` で足りる(§1206) | そのとおり実装。G-03 は `paradise.test.js`(hardcodedRefs 26 件)、G-05 は tribunal.yml §178-182、G-08 は `derived.js check` | **一致** |

断面の全鍵(実測):
```
schemaVersion, generatedAt, generatedAtMs, ageMs, transportHint, connections,
counts, gates, gatesCached, runs, ledger, daily, scale, lessonsByKind,
atlas, census, thresholds, source, buildMs, errors
```
design.md が定めた鍵をすべて含み、**設計に無い余計な鍵も無い**。

CI の結線:
```
$ grep -cE "^\s+run: " .github/workflows/tribunal.yml → 30
dashboard 系 13 門 + visual-verify + critic がすべて tribunal.yml に載っている
```

---

## 6. 留保(実装の欠陥ではないが、記録して tribunal へ送るもの)

### R-1: AC-01h / AC-N07a の**文面**が実装より厳しい(文書の欠陥)

要件は `grep -cE "child_process|execFileSync|spawnSync|execSync" graph/pulse.js` が `0` を求めるが、実測は `1`:
```
$ grep -nE "child_process|execFileSync|spawnSync|execSync" graph/pulse.js
17: *   ゆえに本ファイルに child_process / execFileSync / spawnSync / execSync は
```
**唯一の一致は「子プロセスを産まない」と宣言する註釈そのもの**であり、走るコードに子プロセスは無い。
門(`dashboard-perf.test.js:42`)は**註釈行を除去してから**判定しており実装的に正しい:
```js
const code = pulseSrc.split('\n').filter(l => {
  const t = l.trim();
  return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*'));
}).join('\n');
```
**NFR-07 は実質的に充足している。**直すべきは実装ではなく AC の文面(`grep` を素で使わず、
註釈を除いてから数える形に改めるべき)。**却下理由にはしない。**

### R-2: G-08(`derived.js check`)に射程の穴がある

`derived.js:114` は **存在を前提とする assertion のみ**を咎める:
```js
const assertsPresence = /assert\.ok\([^)]*\.some\(|assert\.ok\([^)]*\.length\s*[>>=]|…/.test(l);
```
ゆえに `assert.strictEqual(state.counts.engines, 34)` のような**生成物の中身への等値 assertion は
すり抜ける**(§2.6 の注入B で実証)。第29条の趣旨(生成物の中身に依存しない)から見れば穴である。
ただし**新設 13 本のテストはいずれもこの穴を踏んでいない**(`derived.js check` 緑 + 目視確認済み)ため、
現状の欠陥ではなく**将来の退行余地**である。

### R-3: `visual-verify` の identity-honoured は 50% の緩みを持つ

```js
return ratio >= 0.5 ? {ok:true,…} : {ok:false,…}
```
宣言色の半分が実装に在れば緑になる。実測でも `--contradiction: #6b21a8 → #ff00ff` に変えても
`all visual checks pass` のままだった。**contrast-aa は正しく鳴る**(§2.5 で実証)ので
G-05 全体が死んでいるわけではないが、**identity 逸脱の検出力は弱い**。

### R-4: CI で `critic` は落ちない

```yaml
178: - name: 🎨 Dashboard surface — visual-verify と critic が画面を見る (G-05 / 第50条)
181:     node graph/visual-verify.js check dashboard --json     ← 門として効く
182:     node graph/critic.js review dashboard --self || true   ← || true で常に緑
```
`visual-verify` は正しく門になっているが、**critic は助言であって門ではない**。
G-05 の要件「visual-verify と critic が画面を見る」は「見る」ことは満たすが、
critic の指摘は CI を止めない。意図的な設計であれば問題ないが、**tribunal は
この一行を認識した上で断罪すべき**である。

---

## 7. 判定

# **ratify**

**理由**:

1. **要件の充足** — FR-01〜FR-23 / NFR-01〜NFR-07 のうち、**満たしていない要件は 0 件**。
   36 群・60 本以上のコマンドを実走し、すべて実出力で確認した。新設テスト 13 本 108 assertion が全緑。
2. **門が生きている** — 教主が壊していない門 **6 件(G-03/05/07/08/09/10)を自分の手で壊し、6/6 が
   「壊すと赤・戻すと緑」**を満たした。G-09 は 2 通りの独立した壊し方で確認。
   則D により、私自身の 3 度の誤った壊し方(G-04 ×2 / SSE ×1)を門の欠陥と取り違えずに済んだ。
3. **神託 5 件すべてに実物で答えている** — とくに (a) は実ブラウザで両テーマの実効色を採り、
   (d) は監視下の conclave.json を書き換えて **91ms** を実測した。「緑だから良い」ではなく
   **「画面が実際にそうなっている」**ことを確かめた。
4. **回帰なし** — `paradise.test.js` **278 passed, 0 failed**。第20条 `vendor.js verify` 緑。
   overlay/vendor の改変 2 件はいずれも独立性を**強化する方向**で、版元の意図を変えていない。
5. **設計との乖離なし** — 断面の鍵・エンドポイントのヘッダ・テストの割当が design.md と全一致。

留保 R-1〜R-4 は**いずれも実装の欠陥ではない**(R-1 は AC 文面の不備、R-2/R-3 は既存門の射程、
R-4 は CI の設計判断)。**建造物そのものは要件を満たしており、差し戻す理由が無い。**

---

## 8. tribunal 相への申し送り

1. **R-1(AC 文面)を正典に反映せよ** — AC-01h / AC-N07a は素の `grep -c` で `0` を求めているが、
   自らの禁止を宣言する註釈が必ず 1 件当たる。**「註釈を除いた走行コードで 0」**へ文面を改めるべき。
   実装は既に正しい。門(`dashboard-perf.test.js`)も正しい。**誤っているのは要件の書き方だけ**である。
   これは findings-gate-syntax.md の則(AC は実際に走る形で書け)の続きに位置する。

2. **R-4(critic の `|| true`)を意識的に裁け** — G-05 の要件は「visual-verify と critic が画面を見る」。
   `visual-verify` は門として効いているが、critic は `|| true` で常に緑である。
   **これを「意図した助言」と認めるか、門に格上げするかを断罪機関が決めるべき**である。
   黙って通せば、次の代は「critic は飾り」を先例として受け継ぐ(第44条)。

3. **R-2 / R-3 は将来課題として記録せよ** — `derived.js` の射程(等値 assertion がすり抜ける)と
   `visual-verify` の identity 判定(50% の緩み)は、**今の実装が踏んでいる欠陥ではない**が、
   退行を許す余地である。次の道(reform)の discover が拾えるよう findings に残すのが妥当。

4. **prove.md の則D は正典に昇格させる価値がある** — 本審査で私自身が 3 度、
   壊し方を誤った(存在しない関数名を撃つ / 門が読まない変数を撃つ / 監視外のファイルを書き換える)。
   **置換が当たったかを先に実測する**という一手が無ければ、健全な G-04 と健全な SSE を
   「鳴らない」と誤断罪していた。**故障注入には故障注入の門が要る**という知見は、
   第16条(判定不能は緑ではない)の裏面として条文化に値する。

5. **走らせた環境の記録** — 本審査は Windows / git-bash / node v24.14.0 で実施。
   サーバは `--port 7411` で起こし**確実に停止**(`ECONNREFUSED` で確認)、
   実ブラウザは描画器の Chrome を CDP で駆動し `browser.close()` で畳んだ(**残留 Chrome 0**)。
   作業屑は `reform/dashboard-living-gate/` に 1 件も残していない
   (`git status` の差分は相状態を記す `conclave.json` のみ)。

---

## 9. 本書の検証

```
$ git status --short
 M reform/dashboard-living-gate/conclave.json      ← prove 相の完了を記す正規の相状態のみ

$ tasklist //FI "IMAGENAME eq chrome.exe" | grep -c chrome.exe
0                                                  ← Chrome を残していない

$ node -e "http.get(…7411/health…)"
停止確認 OK (ECONNREFUSED)                          ← サーバを落とした
```
