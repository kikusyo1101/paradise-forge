# ダッシュボードを建て直す — 門が見ていなかった画面に、門を据える

神託:

> ダッシュボードを一新したい。1から作り直すレベルの見直し、実際に作り直してもいい
> - 見た目が最新の憲法で作られていない
> - 機能が複数あるのに各ページから遷移できない、リンクがない。トップページもない
> - 最新化されていない
> - ダッシュボードなのに静的でリアルタイムに反映されない
> - エージェントが起動しているのか、いまどのオーケストレーションが流れているのか分からない

第23条の reform の道を、6ドメイン11相の環で回した。

---

## 神託への回答

| 神の指摘 | 改修前(実測) | 改修後(実測) |
|---|---|---|
| 見た目が憲法どおりでない | `visual-verify` 5 gap + 1 smell | **all visual checks pass** |
| ページから遷移できない | `a[href]` **0本** | **7本**(control + atlas 6枚) |
| トップページがない | 無し | **「楽園の門」** |
| 最新化されていない | engines **2**(実33)、self-tests **10**(実268)、創造物 **0**(実7) | すべて engine の実出力 |
| 静的でリアルタイムでない | `setInterval`/`EventSource` **0**、3秒後の再描画なし | **SSE で 2秒前**を実測 |
| 何が流れているか分からない | 一切映らず | **停止した環 1件 / 矛盾 3件** が第一画面 |

改修前の `control.html` は 390px 幅で縦 **21,925px** の巻物だった。今は **844px**(26分の1)。

---

## 何を建てたか

### `graph/pulse.js` — 生きた断面を作る唯一の engine

```json
{"counts":{"articles":50,"engines":34,"cardinals":7,"creations":7,"workshops":1,
           "runs":5,"agents":30,"kgNodes":99,"lessons":65},
 "gates":[{"name":"wiring","ok":true,"ms":10.9}, ...], "errors":[]}
```

- engine は `require` で常駐。**子プロセスを産まない**(実測: cold 73ms / warm 7-8ms)
- `census.js`(120,072ms)は同期経路から隔離
- 片方の engine が落ちても断面を落とさず `errors[]` に積む

### 2つの画面 + node標準 http の SSE サーバ

三層フォールバック(EventSource → fetch → 埋め込みJS)。`location.origin` を使うので
ポート自動割当でも繋がる。**降格の理由を文字列で名指しする** —
「2秒ごと(ポーリング)へ降格(理由: 最初のイベントが 5 秒来ませんでした)」。

### engine 側の欠陥 5件

| 欠陥 | 実測(修正前 → 後) |
|---|---|
| 創造物の住所直書き(第30条) | `path.join(ROOT,'creations')` 2件 → **0件** |
| `workspace.js` の門の穴 | スラッシュ無しを見逃す → 塞いだ(壊すと exit=1) |
| `--json` が無視される engine 3つ | 出力バイト数が不変 → clergy 2139→2378 / conclave 1424→2051 |
| 検器の資源漏れ | プロファイル 483→683 単調増加 → **検器1回の前後で差 0** |
| `census` が総括でなく先頭を読む | `dashboard-count: 15 passed` を総数と誤認 → 名乗りで狙う |

---

## 門を据えた — 第50条の是正

改修前、CI 全207行のうちダッシュボードに触れるのは **1行**だけだった。
`index.html` / `control.html` は **visual-verify も critic も一度も通っていなかった**。

今は **13本の門**が CI に据わっている(count / no-deps / links / no-hardcode /
transport / freshness / states / run-panel / sse / watch / perf / fallback / leak)
= **118検査**。加えて `visual-verify` と `critic` が画面を見る。

### 故障注入 11件すべてで「壊すと赤・戻すと緑」を実証

```
G-01 / D-5 / D-3 / FR-22 / G-02 / G-03 / G-04 / G-06 / G-07+G-10 / G-08 / FR-10
✓ 全ての故障注入が正しく赤を出し、戻して緑になった
```

**緑を出すだけの門は、見ていない門と区別できない。**

---

## この改修が掘り当てたもの — 第50条の四重の形

| 形 | 内容 | 実例 |
|---|---|---|
| 表 | 門が**見ていない** | ダッシュボードが CI に無かった |
| 裏 | 門が**己の残骸で不定に鳴る** | Chrome プロファイル漏れ 483→683 |
| 三 | 門の**書き方が誤っていて鳴らない** | `grep -E` の方言違いほか 9件 |
| 四 | 門が**不定に鳴り、症状を追うと真因に届かない** | `failAll` の unhandled rejection |

### 三が最も静かで、四が最も質が悪い

**三の実例**: 要件書自身が全ての門に「壊すと赤くなること」を課しながら、
その AC の書き方が壊れていた。

```
$ grep -E "require\('(?!node:)" bad.js  → exit=1 (lodash を見逃す)
$ grep -c $'\n\n' sse.txt               → 4 (全行数。壊れた入力でも同じ値)
$ grep -cE "a\|b"                       → 0 (ERE では \| はリテラル)
```
npm依存を禁じる門も、SSE終端を検める門も、**永久に緑**だった。

**四の実例**: `close()` が正常終了の合図として `failAll` を呼び、
待ち手の居ない Promise を reject して Node がプロセスを落としていた。
三つの別々の欠陥に見えたものが**一つの根**から生えていた。

```
直す前: 落ちる主題が回ごとに変わる(dag → hierarchy → conclave)
直した後: 5つの道 × 複数周、すべて緑。unhandled rejection ゼロ
```

**一手で三つ消えた。** 一つずつ潰していたら三倍の時間がかかった上に、
「なぜか他のも直った」という理解の無い成功が残っていた。

---

## 階層が働いた記録

- **requirements を1度 reject**: 審査官が24コマンドを実走し、AC の構文欠陥4件を発見。
  差戻し後、神官が自力で5件目を発見(`grep -cE "a\|b"` のリテラル化)
- **design を1度 reject**: 設計中の engine 呼び出しコードを抽出して実走したところ、
  `spawn-trace.report(path)` が **例外も投げず `{ok:true, total:0}` を返す**ことが判明。
  本改修が暴こうとした欠陥(tenbin は満点かつ17相すべて起動証跡なし)を、
  **設計自身の呼び方が握り潰していた**
- **審査官が自らの前言を撤回**: 「gates 29.1ms だからキャッシュ不要」→ 再測で 49.6-88.6ms、
  キャッシュ無しは AC を FAIL すると実測し、design の反論が正しかったと認めた
- **教主も一度誤った**: 「自己診断が15本目でクラッシュしている」と伝えたが、
  実測すると完走しており、15 は census の正規表現の別欠陥だった。
  症状が似ているだけで同根と決めつけた記録を `findings-flaky-gates.md` に残す

---

## 実測で証明した数(第22条)

```
$ node graph/pulse.js snapshot --json | 断面 vs 実地
✓ engines:   断面=34 実地=34
✓ articles:  断面=50 実地=50
✓ cardinals: 断面=7  実地=7

$ node tests/paradise.test.js
Paradise self-test: 288 passed, 0 failed   ← 監査時 268 → 288

$ node graph/census.js check
✓ every number the paradise claims about itself is true
```

**画面の数と実地の数が一致することを、機械が確かめられる。**
そして `gauge ledger` は執筆時10 → 現在15 と増えた —
固定値を書いていたらこの門は落ちていた。「数え方が二つあって一致する」形が生き延びさせた。

---

## この改修が engine に返したもの

ダッシュボードを直す過程で、**楽園自身の欠陥を5つ見つけて直した**。

### 1. 台帳が虚偽の `done` を記せた (X-1)

executor が `ls` 一発で暴いた**教主の過ち**である。

```
$ ls reform/dashboard-living-gate/security.md
No such file or directory
$ 台帳: {"id":"security","status":"done","artifactPath":".../security.md"}
$ git log --all -- security.md | wc -l
0                                    ← 一度も存在しなかった
```

`markDone()` が成果物の実在を検めるようにした。**この門が既存テストの架空成果物名を9件暴いた** —
`'findings.md'` `'r.md'` `'rv.md'` `'sec.md'` および動的生成の `p + '.md'`。
門が本物である何よりの証拠である。

> 第27条「subagent の done を信じない」は、**記録する者自身にも向く**。
> 教主は神官の主張を何度も実物で照合したが、自分が書いた台帳を一度も疑わなかった。

### 2. `census` が総括ではなく先頭を読んでいた

門13本を新設した結果、自己診断の出力に子テストの集計行が8本現れた。
`String.match` は最初の一致しか返さないので、census は
`dashboard-count: 15 passed` を「楽園のテスト総数」と信じた。

**嘘をついていたのは README ではなく数え方だった。**
`summaryOf()` を新設し、位置ではなく `Paradise self-test:` の名乗りで狙う形にした。

### 3. `close()` が正常終了時にも例外を投げていた

```
Error: visual-check finished
  at ChromeVisualBrowser.close (visual-check.mjs:476)
```

`failAll` が待ち手の居ない Promise を reject し、Node がプロセスを落としていた。
**三つの別々の欠陥に見えたものが一つの根から生えていた** ——
atlas の不定な赤・自己診断のクラッシュ・`EPERM: rename`。一手で三つ消えた。

### 4. 検器が Chrome の一時プロファイルを漏らしていた

483 → 519 → 529 → 683 と単調に増えていた。`browser.child.kill()` を
版元が用意した `browser.close()`(SIGKILL エスカレーション + `rmSync`)に改めた。
**検器1回の前後で差 0** を門が数える。

### 5. `--json` が1バイトも出力を変えない engine が3つ

```
clergy college   2139 / 2139  →  2139 / 2378  parse=ok
conclave status  1424 / 1424  →  1424 / 2051  parse=ok
daily-guard      843  /  843  →   843 /  503  parse=ok
```

---

## 立てた則(この改修の副産物)

| 則 | 内容 | 出典 |
|---|---|---|
| 則1〜4 | AC は走らせて赤を見る / 正規表現の方言をまたぐな / 固定値を期待値にするな / この機に在るコマンドだけ | `findings-gate-syntax.md` |
| 則A〜C | 不定に鳴る門は症状でなく原因を数える / 入力の決定性を先に証明せよ / 一つの根が複数の赤を生んでいないか疑え(ただし実測で確かめよ) | `findings-flaky-gates.md` |
| 則D | **壊れたことを先に証明せよ。門を疑うのはその後である** | `prove.md` |
| 則E | 並行作業中の測定値を単独走行の値と比べるな。**測る前に自分がどこに立っているかを確かめよ** | `verify.md` |
| 則F | **自分が書いた記録を、他人の主張と同じ厳しさで疑え** | `findings-ledger-lie.md` |

則D は教主自身が三度、自分の壊し方・測り方を誤ったことから生まれた。
**実装は正しく、教主が間違っていた** —— 第9条は裁く側にも等しく向く。

---

## 残る負債(正直に書く)

| # | 内容 | なぜ今直さないか |
|---|---|---|
| X-2 | 断面の `runs[].path` が絶対パスを5件露出 | 127.0.0.1 限定 + 画面は `.path` を描かない(消費者0) |
| F-5 | `pulse.js:469` の `thresholds` が消費者ゼロ | 死んだ定義。害は無い |
| F-6 | `control.html` が `paradise.js` の5関数を写経 | `POLL_MS=2000` が3箇所目。門の射程外 |
| F-7 | `counts=null` のとき画面に文字列 `null` が出る | 同画面の errors 表が理由を名指しするので**醜いが嘘ではない** |
| — | `orchestrator.js:105` の `markDone` に同じ検査が無い | conclave と別の道。範囲を広げない |
| — | `critic.js` が reform の三箇所(散文/実装/門)を束ねられない | 同上 |
| — | DoS 耐性・XSS が**未検査** | 第16条により「安全」ではなく「未検査」と明記した |


---

## 最終判定 — 引継ぎ後、単独走行(則E)で測り直した

前任の教主が残した `verdict-report.json` は、兄弟倉 `../paradise-creations` が
見えない worktree で測られており **errors 3 / runs 0 / atlas 0** と誤っていた。
`PARADISE_CREATIONS` を与え `atlas.js all` を走らせた上で測り直した実値:

```
$ node tests/paradise.test.js
Paradise self-test: 288 passed, 0 failed          (exit 0)

$ node graph/census.js check          ✓ every number the paradise claims about itself is true
$ node graph/wiring.js check          ✓ engine 34 / 辺 41、孤児0・宙吊り0
$ node graph/workspace.js check       ✓ 創造物の混入なし・住所の直書きなし
$ node graph/derived.js check         ✓ 生成物に依存する試験なし
$ node graph/vendor.js verify         ✓ paradise stands on its own (vendored 130)
$ node graph/check-agents.js          ✓ the hierarchy is real, not declared
$ node graph/atlas.js check           ✓ 6主題すべて通過(wiring のみ平面化不能で standard)
$ node graph/critic.js review graph --self       ✓ the critic found nothing
$ node graph/critic.js review dashboard --self   ✓ the critic found nothing
$ node graph/visual-verify.js check dashboard    ✓ all visual checks pass (9項目)

$ node graph/pulse.js snapshot --json
errors 0 / runs 5 / atlas 6 / creations 7
停止: reform-claude-md-diet    矛盾: coin, reform-eval-gauge, tenbin
```

### 環は閉じた

```
$ node graph/conclave.js status --run reform/dashboard-living-gate/conclave.json
✓ 枢機卿 tribunal — Tribunal (断罪機関)   [review: god]
     ✓ ⚖️ reflect @self-critic
     ✓ ⚖️ verdict @creation-judge
domains ratified: 6/6

$ node graph/gauge.js score <run> --json
{"score":70,"complete":true,"phasesTotal":11,"phasesDone":11,
 "domainsTotal":6,"domainsRatified":6,"firstPassRate":1,
 "reworkCount":3,"retryOverhead":0,"loopGuardTrips":0}

$ node graph/verdict.js judge reform/dashboard-living-gate/verdict-report.json
✅  SHIP   (exit 0)
```

### 負債をもう一件、正直に足す

```
$ node graph/spawn-trace.js report <run>
phases: 11   observed: 0   asserted-only: 0   no-trace: 11
11 phase(s) bypassed the hierarchy — the ladder was declared but not walked
```

この改修では `spawn-trace.record` を一度も呼んでいない。成果物・門・実測はすべて
実在するが、**「誰が作ったか」を台帳が証明できない**。第16条により「緑」と偽らず、
未達として記す。次の走行で塞ぐべき engine 側の宿題である。

**マージは神の御手のみ。**
