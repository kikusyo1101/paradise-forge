# dashboard-living-gate — 移管用 状態ファイル

更新: 2026-09-03 / 第二の教主(引き継ぎ後)
神託: 「ダッシュボードを一新したい。1から作り直すレベルの見直し」

---

## 0. 現況 — **やることは残っていない。神の御手を待つのみ**

```
PR:       https://github.com/kikusyo1101/paradise-forge/pull/34
CI:       検証ゲート pass (17m34s) / 執行官の裁定 pass (6m11s)
          $ gh pr checks 34  → rc=0
環:       domains ratified 6/6(tribunal も批准済み)
判定:     node graph/verdict.js judge → SHIP (exit 0)
自己診断: 290 passed, 0 failed
Discord:  神籬へ報告済み
```

**マージは神の御手のみ。** 教主は PR を開くが自ら承認しない。

---

## 1. 作業場

本体リポジトリは別のエージェントが `reform/conclave-resume2` で占有している。
**worktree で作業すること:**

```
C:/Users/kikus/AppData/Local/Temp/pd-verdict     branch: reform/dashboard-living-gate
```

### 落とし穴(実測済み)

1. **兄弟倉が隣に無い。** `export PARADISE_CREATIONS='C:/Users/kikus/Documents/workspace/paradise-creations'`
   MSYS 形式(`/c/Users/...`)は通らない。`C:/` 形式で渡すこと。
2. **`dashboard/atlas/*.html` は gitignore された生成物。** 導線を測る前に `node graph/atlas.js all`。
3. **Chrome を使う検査を並行で走らせない**(不定に赤くなる)。
4. **`terminal` の長い一行は BLOCKED になる。** `.sh` に書いて `bash <file>` で実行。

---

## 2. 最初に読むもの

```
reform/dashboard-living-gate/verdict.md         判定(SHIP)。第二幕の記録も含む
reform/dashboard-living-gate/UNFINISHED.state.md 残る負債3件と次の一手
reform/dashboard-living-gate/pr-body.md         PR 本文(495行。全経緯)
reform/dashboard-living-gate/security.md        DoS/XSS の実測(§5)
```

---

## 3. 成果

```
コミット: 43本 (main比) / 変更 70ファイル
自己診断: 268 → 290 passed
CI の門:  ダッシュボードに触れるのは1行 → 13本 + visual-verify + critic
```

### 神託の6つの不満 — すべて実測で回答

| 神の不満 | 改修前 | 改修後 |
|---|---|---|
| 見た目が憲法どおりでない | visual-verify 5 gap + 1 smell | **all visual checks pass** |
| 遷移できない・リンクがない | `a[href]` **0本** | **6本**(断面から生成) |
| トップページがない | 無し | **「楽園の門」** |
| 最新化されていない | engines 2(実33)/self-tests 10(実268)/創造物 0(実7) | **すべて engine 実出力** |
| 静的でリアルタイムでない | `EventSource` 0件 | **SSE。91ms で追随** |
| 何が流れているか分からない | 一切映らず | **停止1件/矛盾3件が第一画面** |

### engine に返した欠陥(第一幕5件 + 第二幕2件)

1. 台帳が虚偽の `done` を記せた(X-1) — `conclave.markDone` が実在を検める
2. census が総括でなく先頭を読んでいた
3. `close()` が正常終了時にも例外
4. 検器が Chrome プロファイルを漏らす
5. `--json` が出力を変えない engine 3つ
6. **借り物の constructor が資源を掴んでから失敗する道**(第二幕)
7. **`orchestrator.markDone` に実在検査が無い**(D-1、第二幕)

---

## 4. 立てた則(これが最も価値がある)

| 則 | 内容 |
|---|---|
| 則1〜4 | AC は走らせて赤を見る / 正規表現の方言をまたぐな / **固定値を期待値にするな** / この機に在るコマンドだけ |
| 則A〜C | 不定に鳴る門は症状でなく原因を数える / 入力の決定性を先に証明せよ / 一つの根が複数の赤を生んでいないか疑え |
| **則D** | **壊れたことを先に証明せよ。門を疑うのはその後である** |
| 則E | 並行作業中の測定値を単独走行の値と比べるな |
| 則F | 自分が書いた記録を、他人の主張と同じ厳しさで疑え |
| 則G | `git add -A` を使うならコミット前に `git diff --cached` を読め |

**則D は第一幕で四度、第二幕でさらに三度効いた。**
CI が四度落ちて、三度は門が間違っていた。実装は正しかった。

則3(固定値を期待値にするな)は**環境にも及ぶ**ことを第二幕が示した ——
倉が在ること・KG が在ること・fs.watch が 2 発出すことは、
どれも「この機ではそうだった」に過ぎない。

---

## 5. engine API の罠(確定済み)

```
clergy.COLLEGE / clergy.orgChart()   ※ college() は無い
forge.buildDag(wish, 'reform')       ※ 第2引数は文字列
gauge.score(<run object>)            ※ パスだと THROW
spawn-trace.report(<run object>)     ※ パスだと静かに {ok:true,total:0} を返す
conclave.js status --run <path>      ※ slug ではない
orchestrator.init(<path>)            ※ こちらは逆にパスを取る
runs[].state === 'stalled'           ※ r.stalled ではない
```

---

## 6. 次に手を付けるなら

`UNFINISHED.state.md` の §4 を見よ。最も重いのは **spawn-trace の証跡欠落** ——
記録を呼ばなくても走れてしまう構造の穴である。
