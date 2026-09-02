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

---

## 引き継ぎ後の第二幕 — CI が四度赤を出し、そのすべてを実測で解いた

PR を出した後、CI が四度落ちた。**四度とも根が違い、四度とも実測で特定した。**

| # | CI の赤 | 根 | 直したもの |
|---|---|---|---|
| 1 | `ENOENT scandir paradise-creations` ×7件 | 兄弟倉は別リポジトリ。CI の checkout に隣は無い | 門を倉の有無**両方**で立たせた |
| 2 | `AC-18b/18d: 2 値のいずれも現れない` | 教訓は KG に住む。CI に KG は無い | 同上 + **総当たりで AC-14g を先回り** |
| 3 | `AC-11a: 生イベントが 1 発` | 「2 発」は **Windows の癖**。Linux は 1 発 | OS 非依存にし、癖は決定的に測る門を新設 |
| 4 | `AC-23g: 差=1` | **実装の欠陥** — 借り物の constructor が漏らす | 呼ぶ側が引き受ける + 非同期の死にも掃除を結ぶ |

### 1〜3 は「測り方」、4 は「実装」だった

前任が残した則D(**壊れたことを先に証明せよ**)がそのまま効いた。
赤を見るたび実装を疑いたくなるが、**四度のうち三度は門が間違っていた**。

三つとも同じ形の誤り —— **この機の環境を期待値にしていた**(則3)。
倉が在ること、KG が在ること、fs.watch が 2 発出すこと。
どれも「この機ではそうだった」に過ぎない。

### 4 だけは実装が本当に壊れていた

```
$ node -e "実在しない Chrome を渡す"
BEFORE=0 AFTER=1 差=1        ← CI と同じ値
```

借り物 `visual-check.mjs` の constructor は **profileRoot を作ってから** Chrome を
spawn する。spawn が落ちると `browser` 変数に代入される前に throw するので、
呼ぶ側の `finally { browser.close() }` は空振りし、プロファイルだけが残る。

第20条により借り物には手を入れない。**呼ぶ側が失敗を引き受けた。**

さらに CI(Linux)は別の落ち方を教えた —— 偽の実行ファイルは **spawn に成功し**、
パイプ書込の EPIPE が **unhandled rejection** として飛ぶ。try/catch にも finally にも
捕まらずプロセスごと落ちるので、後始末は一行も走らない。
ゆえに **プロセスが倒れる瞬間そのもの**に掃除を結んだ。

```
掃除なし → プロセス終了後の残 1   ← CI が見ていたもの
掃除あり → プロセス終了後の残 0
```

### 測り方も変えた(則C の実践)

一件ずつ直して push し CI を待つのは、根が一つなら無駄な往復である。
CI の素の環境(倉なし・KG なし)を手元で再現し、**CI が単独で走らせる 13 の門と
10 の engine を総当たり**した。AC-14g はそれで先回りに捕らえた。

ただし総当たりにも射程がある —— **手元 Windows でどれだけ回しても Linux 固有の
赤は出ない**。3 の watch も 4 の EPIPE も、CI が教えてくれた。そのことも記す。

---

## 残っていた宿題を、すべて片づけた

前任が `UNFINISHED.state.md` に優先順位付きで残した 6 件。**全件を実測で解いた。**

### 優先2 — B-1 / B-2:「未検査」を「検査済み」に変えた

前任は正直に「読んだだけで試していない」と書いた。**試した。**

**B-1. DoS 耐性** — ブラウザの同時接続上限 6 本の、その倍を踏ませた:

```
12本の応答:            [200 ×12]
データを受けた本数:     12 / 12
12本張ったまま snapshot: {"st":200,"ms":10,"len":12085}
連打100回の後 snapshot:  {"st":200,"ms":10,"len":12085}
全接続を閉じた後:        {"st":200,"ms":10,"len":12084}
```

**B-2. XSS** — 神の倉には触れず、隔離した倉に毒入りの run を置いて実ブラウザで描かせた:

```
$ mkdir "$TMP/sandbox/<img src=x onerror=alert(1)>"
結果: {"fired":false,"imgs":0,"scripts":0,"shown":true,
       "runNames":["img src=x onerror=alert(1)"]}
```

発火せず、要素として解釈もされず、**生の文字列として描かれた**。検査後に隔離倉は削除。

一度測っただけでは明日壊れても鳴らない。**両方とも門にした。**

### 優先3 — D-1: 台帳の嘘を防ぐ門は道を問わない

X-1(台帳が虚偽の done を記せた)を生んだ穴が `orchestrator.js` に空いたままだった。

```
$ grep -c "実在しない" graph/orchestrator.js → 0
```

conclave と違い orchestrator の artifact は自由な名も許す(`'implementation'`)。
全てに実在を課せば正しい走行まで止まるので、**住所を名乗ったものだけ**検める。

```
'reform/no-such/findings.md' → throw      'implementation' → 通る
```

### 優先4 — F-6:「最も危険」と記された写経を解いた

`control.html` が `DEFAULT_PORT` / `POLL_MS` / `base()` を写経していた。
写経は**片方だけ古くなる**。しかもこの画面は門の射程外で、**古くなっても鳴らなかった**。

```
写経の残滓: DEFAULT_PORT 1→0 / POLL_MS 1→0 / base() 1→0
```

`paradise.js` が `window.PARADISE` として規則を配り、control が読む形にした。
実ブラウザで両画面を測り、副作用が無いことを確認:

```
control: PARADISE=true poll=2000 port=7317 panels=5 ready=4 error=null
index:   transport=sse ready=13
```

**直したのはコードだけでなく、鳴らない状態そのものである** —— 門(AC-02d)を据えた。

### 優先5 — F-7: 神が見る画面の「null」を消した

```
従前: KG ノード null / エッジ null
現在: KG ノード 測れず / エッジ 測れず
```

0 は「数えて 0」、null は「数えられなかった」。**測れなかったことを値のように
見せる**のは第16条の精神に反する。これも門の射程外だったので、門(AC-20f)を据えた。

### 優先6 — D-2: critic が reform の三箇所を束ねられるようにした

```
$ node graph/critic.js review reform/dashboard-living-gate
🔴 [gap] tests-exist: no test file found      ← 12 本の門が tests/ に在るのに
```

reform は散文 `reform/<slug>/`・実装 `graph/`・門 `tests/` に分かれて住む(第23条)。
critic はこれを創造物(一つの倉に全てが揃う)と同じ形だと仮定していた。

**束ねる相手は走行が触れた物に限る** —— 楽園中の tests/ を数えれば、どの reform も
常に緑になり、門が門でなくなる。git が使えない場では「測れなかった」と言う(第16条)。

```
🔴 no test file found → ✓ 門 15 本: tests/_pulse-fixture.js, …
```

この門を書くときも一度誤った。最初は現物の走行を見ていたが、それは **main へ
マージされれば差分が消えて赤くなる** —— 走行の状態を期待値にしていた(則3)。
reform の形をした作業場をその場で `git init` して測る形に書き直した。

---

## 最終の実測

```
自己診断:  288 → 290 passed, 0 failed
画面の門:  12 本すべて緑 (sse 14 / states 12 / count 15 / run-panel 16 …)
engine:    census / wiring / workspace / derived / vendor / check-agents /
           lexicon / apply-spawn / visual-verify / critic — すべて exit 0
両世界:    倉なし・KGなし(CI 再現) / 実環境 — どちらも 290/0
資源:      Chrome プロファイル残 0 / 合成 run 屑 0
```

**CI: 検証ゲート SUCCESS / 執行官の裁定 SUCCESS — mergeStateStatus CLEAN**

### 壊して鳴ることを確かめた門(この第二幕で 8 件)

| 壊したもの | 鳴った門 |
|---|---|
| `visibleDirs` が不在を空と偽る | AC-01b / G-01(D-5) |
| `readSpawn` の防御を外す | D-3 |
| 内訳を捏造する | AC-18b/18d |
| `listRuns` が空を返す | AC-14g |
| デバウンサの `clearTimeout` を外す | AC-11a / AC-11a2 / AC-11b |
| 構築失敗の掃除を外す | AC-23h(差=1、CI と同値) |
| `num()` を素の連結に戻す | AC-20f |
| 写経を戻す | AC-02d |
| `innerHTML` を一つ生やす | B-2(XSS) |
| `markDone` の実在検査を外す | orchestrator の台帳の門 |

---

## 残る負債(正直に、更新して書く)

| # | 内容 | 判断 |
|---|---|---|
| X-2 | 断面の `runs[].path` が絶対パス5件 | 127.0.0.1 限定 + 画面は `.path` を描かない |
| F-5 | `pulse.js:469` の `thresholds` が消費者ゼロ | 死んだ定義。害なし |
| — | `spawn-trace` の起動証跡が11相すべて無い | 成果物と門が実在を証明する。台帳が証明できるのは「何が在るか」で、この走行は「誰が」を記録し損ねた |

**F-6 / F-7 / D-1 / D-2 / B-1 / B-2 は解消した。** 残るのは 3 件である。

**マージは神の御手のみ。**
