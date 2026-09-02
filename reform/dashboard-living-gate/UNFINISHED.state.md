# 達成できなかったこと — 次のセッションへの宿題

> **2026-09-03 更新(引き継いだ教主)**
> 前任が残した 6 件は**すべて片づけた**。本ファイルは現況へ書き換えてある。
> 前任の記録は git 履歴(`git log -- reform/dashboard-living-gate/UNFINISHED.state.md`)に残る。

---

## 0. 現況 — 環は閉じ、CI は緑、PR は神の御手を待っている

```
PR:        https://github.com/kikusyo1101/paradise-forge/pull/34
CI:        検証ゲート pass (17m34s) / 執行官の裁定 pass (6m11s)
           gh pr checks 34 → rc=0
環:        domains ratified 6/6
判定:      node graph/verdict.js judge → SHIP (exit 0)
自己診断:  290 passed, 0 failed
```

**残るのは神がマージを押すことだけである。**

---

## 1. 片づいた宿題(前任が残した 6 件)

| 優先 | 宿題 | 結果 | 門 |
|---|---|---|---|
| 2 | B-1 DoS 耐性 | ✓ 実測 12本/200・連打100回後も 10ms・回復 | `dashboard-sse` |
| 2 | B-2 XSS | ✓ 実測 隔離倉に注入 → 発火せず・文字として描画 | `dashboard-states` |
| 3 | D-1 orchestrator の markDone | ✓ 住所を名乗るなら実在せよ | `paradise.test.js` |
| 4 | F-6 control.html の写経 | ✓ 出所を 1 つに(`window.PARADISE`) | `AC-02d` |
| 5 | F-7 counts=null の「null」 | ✓ 「測れず」と名乗る | `AC-20f` |
| 6 | D-2 critic が reform を束ねない | ✓ 三箇所を束ねる(触れた物に限る) | `paradise.test.js` |

**すべて壊して鳴ることを確かめてある。** 門の無い修正は一件も無い。

---

## 2. 残る負債(3 件)

| # | 内容 | 出荷を止めない理由 |
|---|---|---|
| X-2 | 断面の `runs[].path` が絶対パス5件 | 127.0.0.1 限定 + 画面は `.path` を描かない(消費者0)。**断面を外部へ配る日が来たら落とす鍵** |
| F-5 | `pulse.js:469` の `thresholds` が消費者ゼロ | 死んだ定義。画面は自前の `TH` を持つ |
| — | `spawn-trace` の起動証跡が11相すべて無い | 成果物も門も実測も在るが「誰が作ったか」を台帳が証明できない |

### spawn-trace が最も重い

```
$ node graph/spawn-trace.js report <run>
phases: 11   observed: 0   no-trace: 11
```

この改修は `spawn-trace.record` を一度も呼んでいない。**位階は宣言されたが、
機械の目から見れば歩いた証跡が無い。** 次の走行は相を dispatch するたびに
`record` を呼ぶこと —— でなければ「誰かが自分でやった可能性」を永久に否定できない。

engine 側の宿題でもある: **記録を呼ばなくても走れてしまう**のが構造の穴である。
conclave が dispatch する時点で自動的に証跡を残す形にできないか検討せよ。

---

## 3. この第二幕で学んだこと(教訓は KG に刻んである)

```
$ node graph/kg.js query env-is-not-canon
```

| 教訓 | 要点 |
|---|---|
| `env-is-not-canon` | **この機の環境を期待値にするな** — CI の赤4件のうち3件がこれ |
| `death-can-arrive-async` | 後始末は同期の失敗だけでなく**非同期の死**にも結べ |
| `borrowed-ctor-leaks` | 借り物の constructor が**資源を掴んでから失敗する**道を疑え |
| `reform-lives-in-three-places` | reform を創造物と同じ形と仮定するな |
| `gate-out-of-range-rots` | **門の射程外の写経は、古くなっても鳴らない** |

すべて `applies:paradise-internal` —— critic が永久に検め続ける。

### 最も繰り返し効いた則(前任から引き継ぎ、第二幕でも効いた)

> **則D: 壊れたことを先に証明せよ。門を疑うのはその後である。**

CI が四度落ち、**三度は門が間違っていた**。実装は正しかった。
そして三度とも同じ形 —— この機の環境を掟にしていた(則3)。

四度目だけが本物の欠陥で、それは実測 `BEFORE=0 AFTER=1 差=1` が
CI と同値であることで確定した。**赤を見たら、まず自分の測り方を疑え。**

### 総当たりの射程にも限界がある

CI の素の環境(倉なし・KGなし)を手元で再現し、13 の門と 10 の engine を
総当たりして AC-14g を先回りに捕らえた —— これは効いた。

だが **手元 Windows でどれだけ回しても Linux 固有の赤は出ない**。
watch の 2 発も EPIPE の非同期死も、CI が教えてくれた。
**再現には必ず届かない面がある**ことを忘れるな。

---

## 4. 次に手を付けるなら

1. **spawn-trace の証跡** — 上記の通り。engine 側の構造から直す
2. **X-2** — 断面を外部へ配る設計に進むなら、その前に落とす
3. **F-5** — 死んだ定義。消すか、画面の `TH` と統合するか
