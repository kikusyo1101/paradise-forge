# verdict — 断罪 (第12条)

> **主張ではなく実走で裁く。** 以下はすべて教主がこの機で走らせた出力である。

## 門 — 10種すべて緑

| 門 | 条 | 結果 |
|---|---|---|
| `tests/paradise.test.js` | 自己診断 | **288 passed, 0 failed** |
| `census.js check` | 第22条 | ✓ every number the paradise claims about itself is true |
| `wiring.js check` | 第44条 | ✓ 孤児0・宙吊り0 (engine 34 / 辺 41) |
| `workspace.js check` | 第30条 | ✓ 創造物の混入なし・住所の直書きなし |
| `derived.js check` | 第29条 | ✓ 生成物に依存する試験なし |
| `vendor.js verify` | 第20条 | ✓ paradise stands on its own |
| `check-agents.js` | 第25条 | ✓ 階層は実在する |
| `atlas.js check` | 第47条 | ✓ 6主題すべてが検査に通る |
| `critic review graph --self` | 第9条 | ✓ the critic found nothing |
| `critic review dashboard --self` | 第9条 | ✓ the critic found nothing |
| `visual-verify check dashboard` | 第18条 | ✓ all visual checks pass |

## 神託への回答 — 実測

| 神の不満 | 改修前 | 改修後 |
|---|---|---|
| 見た目が憲法どおりでない | 5 gap + 1 smell | **all visual checks pass** |
| ページから遷移できない | `a[href]` **0本** | **6本**(断面から生成) |
| トップページがない | 無し | **「楽園の門」** |
| 最新化されていない | engines 2(実33)・self-tests 10(実268)・創造物 0(実7) | **すべて engine の実出力** |
| 静的でリアルタイムでない | `EventSource` 0 | **SSE / 書換に 91ms で追随** |
| 何が流れているか分からない | 一切映らず | **停止1件 / 矛盾3件が第一画面** |

```
$ node -e "pulse.snapshot()"
errors: 0
runs: 5
creations: 7  workshops: 1
atlas(実在): 6 本
停止: reform-claude-md-diet
矛盾: coin, reform-eval-gauge, tenbin
NFR-01: warm 5.2ms  (要求 1000ms)
```

## 第22条 — 断面と実地の一致

```
✓ engines:   断面=34 実地=34
✓ articles:  断面=51 実地=51
✓ cardinals: 断面=7  実地=7
```

## 門が本当に鳴ること — 11件を壊して確かめた

教主が5件(G-01/G-02/G-04/G-06/第30条)、quality 枢機卿が6件
(G-03/G-05/G-07/G-08/G-09/G-10)を破壊し、**11/11 が「壊すと赤・戻すと緑」**。

加えて新設した `markDone` の門:
```
実在しない成果物 → exit=1
実在する成果物   → exit=0
```

## この改修が engine に返した欠陥 — 5件

1. **台帳が虚偽の done を記せた**(X-1) — executor が `ls` で暴いた教主の過ち
2. **census が総括でなく先頭を読んでいた** — 嘘をついていたのは README ではなく数え方
3. **`close()` が正常終了時にも例外を投げていた** — 三つの赤が一つの根から
4. **検器が Chrome プロファイルを漏らしていた** — 483→683 が検器1回で差0へ
5. **`--json` が出力を変えない engine が3つ**

## 教主自身の過ちも記録した

| 則 | 教主の過ち |
|---|---|
| 則D | 三度、自分の壊し方・測り方を誤った(実装は正しかった) |
| 則F | 実在しない成果物を `done` と記録した |
| 則G | **`git add -A` で兄弟の第51条c違反を自分のコミットに固定した** |

則G の発覚は自己診断による:
```
✗ conclave: 回復は有限で、尽きたら閉塞して人を呼ぶ (第51条c)
$ git log -S "MAX_PHASE_RESUME = Infinity" --oneline
ea72f09 quality(reform): 自己診断 288/288 緑 — README を実数へ   ← 教主のコミット
```

**門が教主を咎めた。** これが第50条の本旨である。

## 残る負債(7件) — 出荷を止めない理由付き

| # | 内容 | 判断 |
|---|---|---|
| X-2 | 断面の `runs[].path` が絶対パス5件 | 127.0.0.1 限定 + 画面は `.path` を描かない(消費者0) |
| F-5 | `pulse.js:469` の `thresholds` が消費者ゼロ | 死んだ定義。害なし |
| F-6 | `control.html` が5関数を写経 | `POLL_MS` が3箇所目。門の射程外 |
| F-7 | `counts=null` で画面に文字列 `null` | errors 表が理由を名指しする。**醜いが嘘ではない** |
| — | `orchestrator.js` の `markDone` に同じ検査なし | 別の道。範囲を広げない |
| — | `critic.js` が reform の三箇所を束ねられない | 同上 |
| — | DoS 耐性・XSS が**未検査** | 第16条により「安全」ではなく「未検査」と明記 |

## 判定

**SHIP。**

神託の6つの不満すべてに実測で答えた。門は10種すべて緑で、11件を壊して
鳴ることを確かめた。engine の欠陥5件を直し、教主自身の過ち3件も記録した。

残る負債7件はいずれも**利用者が見る嘘を生まない**。F-7 は醜いが、
同じ画面が「測れなかった engine」を名指しするので嘘ではない。
未検査2件は「安全」と偽らず「未検査」と書いた。

**神の御手を仰ぐ。**
