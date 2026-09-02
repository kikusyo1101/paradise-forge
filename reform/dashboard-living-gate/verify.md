# verify 相 — 神託の5つの不満に、実測で答える

> 神官も枢機卿も検めた。だが第27条により、**教主は自分の手で確かめる**。
> 「実装した」ではなく「走らせたらこう出た」だけが根拠である(第22条)。

## 神託への回答(教主の実測)

| # | 神の不満 | 実測 | 判定 |
|---|---|---|---|
| (c) | 最新化されていない | 断面 engines=34 / 実地=34 | ✓ |
| (c) | 〃 | 断面 articles=50 / 実地=50 | ✓ |
| (c) | 〃 | 断面 cardinals=7 / 実地=7 | ✓ |
| (c) | 〃 | `errors=[]` — 断面が例外で落ちない | ✓ |
| (c) | **焼き付けていない証明** | engine を1本足すと **34 → 35 → 34** | ✓ |
| (e) | 何が流れているか分からない | `runs=5` が断面に載る | ✓ |
| (e) | **止まった環を名指しする** | `state='stalled'` → **reform-claude-md-diet (5/11)** | ✓ |
| (e) | 矛盾を印す | **3件** (coin / reform-eval-gauge / tenbin) | ✓ |
| (b) | 遷移できない | 導線が断面から生まれる **6本** | ✓ |
| (b) | **写経していない証明** | index.html の静的 atlas リンク **0本** | ✓ |
| — | 速度 (NFR-01) | warm **10.8ms** (要求 1000ms) | ✓ |

**11/11 が実測で成立。**

## 矛盾の中身 — これが神託(e)の核心

```
coin                  state=complete 11/11 [矛盾]
habit                 state=complete 11/11
reform-claude-md-diet state=stalled  5/11
reform-eval-gauge     state=complete 11/11 [矛盾]
tenbin                state=complete 17/17 [矛盾]
```

`tenbin` は **gauge 100/100 の満点**でありながら、spawn-trace では **17相すべてに起動証跡が無い**。
点数だけ見れば完璧、階層の記録を見れば誰も歩いていない。**緑でも赤でもない第3の色**が要る。

旧ダッシュボードはこの矛盾を一度も映さなかった。`reform-claude-md-diet` が
5/11 で止まっていることも、画面のどこにも出ていなかった。

## 教主が三度目に測り方を誤った記録

第1版は「止まった環 = 0件」と出した。だが**門ではなく教主が誤っていた**。

```
私が読んだ鍵:   r.stalled          ← 存在しない
実際の鍵:       r.state === 'stalled'
```

断面の鍵は `name, path, phasesDone, phasesTotal, domainsRatified, domainsTotal,
domains, state, score, spawn, contradiction, metrics, historyLength, lastEvent,
scaleGuess, scaleCandidates` である。**推測で鍵名を書いた。**

### 則D(再確認)は測る側にも向く

prove 相で立てた則D — **「壊れたことを先に証明せよ。門を疑うのはその後である」** —
は、故障注入だけの話ではなかった。

**測って赤が出たとき、答えは二つある:**
1. 実装が満たしていない
2. **測り方が的を外している**

この改修で教主は三度、2 に嵌った:

| # | 場面 | 誤り |
|---|---|---|
| 1 | prove: G-01 | `articles:` を出所の行(:476)で置換。数を作る :368 ではなかった |
| 2 | prove: 第30条 | 門は `path.join` を見るのに `require('path').join` と書いた |
| 3 | verify: (e) | 断面の鍵を `stalled` と推測。実際は `state === 'stalled'` |

いずれも**実装は正しく、教主が間違っていた**。
第9条「楽園は裁かれる前に自らを疑う」は、裁く側にも等しく向く。

## 測定条件の汚染について(第21条の応用)

verify の途中、自己診断が 278/0 → 276/2 → 277/1 と揺れた。
原因を測ると:

```
$ tasklist | grep -c chrome.exe        → 28
$ ls $TEMP | grep -c archify-profile   → 82
```

**quality 相の神官3人が並行で視覚検査を回している最中だった。**
第21条は「門は己の残骸で落ちない」と述べるが、これは**隣人の作業で落ちていた**。

`atlas.check` は Chrome を起動する。同時に3人が Chrome を起こせば、
資源が競合して `Command failed` が出る。**症状は同じでも原因が違う。**

ゆえに: **並行作業中の測定値を、単独走行の値と比べてはならない。**
土台の緑は、神官が全員退いてから測り直す。
