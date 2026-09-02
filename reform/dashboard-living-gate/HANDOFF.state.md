# dashboard-living-gate — 移管用 状態ファイル

生成: 2026-09-03 / 前任: 教主(Pontiff)セッション
神託: 「ダッシュボードを一新したい。1から作り直すレベルの見直し」

---

## 0. 最初に読むもの(順に)

```
reform/dashboard-living-gate/verdict.md        ← 判定の草稿(SHIP)。全体像はここ
reform/dashboard-living-gate/pr-body.md        ← PR 本文(完成済み)
reform/dashboard-living-gate/requirements.md   ← 118KB。FR-01..23 / NFR-01..07 / G-01..10 / AC
reform/dashboard-living-gate/design.md         ← 94KB。断面スキーマ・サーバ・三層フォールバック
```

## 1. 作業場 — **ここが最重要**

**本体リポジトリは別のエージェントに占有されている。**

```
$ cd C:/Users/kikus/Documents/workspace/paradise && git branch --show-current
reform/conclave-resume2          ← 隣人が立てたブランチ。我らの成果は無い
```

**必ず worktree で作業すること:**

```
C:/Users/kikus/AppData/Local/Temp/pd-verdict     ← 独立した作業場(既存)
  branch: reform/dashboard-living-gate
  HEAD:   993d489 fix(conclave): 第51条c を回復 — 教主が git add -A で兄弟の違反を巻き込んでいた
```

worktree が壊れていたら作り直す:
```bash
cd C:/Users/kikus/Documents/workspace/paradise
git worktree add "$LOCALAPPDATA/Temp/pd-verdict" reform/dashboard-living-gate
```

### worktree の落とし穴(実測済み)

1. **兄弟倉 `../paradise-creations` が隣に無い。** 必ず環境変数で教える:
   ```bash
   export PARADISE_CREATIONS='C:/Users/kikus/Documents/workspace/paradise-creations'
   ```
   MSYS 形式(`/c/Users/...`)は**通らない**。`C:/` 形式で渡すこと。
2. **`dashboard/atlas/*.html` は gitignore された生成物。** worktree には無い。
   導線(6本)を測る前に `node graph/atlas.js all` を走らせる。

## 2. 環の状態

```
domains ratified: 5/6
  discovery / requirements / architecture / construction / quality  → 批准済み
  tribunal  → reflect(running) / verdict(rework)
```

台帳: `reform/dashboard-living-gate/conclave.json`

**注意**: `markDone` は成果物の実在を検める(この改修で追加)。
存在しないパスを `--artifact` に渡すと **throw する**。

## 3. 残っている作業

| # | 作業 | 状態 |
|---|---|---|
| 1 | 自己診断を**単独で**完走させ緑を確認 | 未完(下記の手順) |
| 2 | `verdict.md` を確定し `conclave.js done verdict` | verdict.md は草稿済み |
| 3 | `verdict-report.json` を正しい環境で作り直す | 既存のものは worktree の誤測値を含む |
| 4 | **PR を作成** | 未着手 |
| 5 | **Discord(神籬)へ連絡** ← 神の明示的な依頼 | 未着手 |

### 1 の手順(則E: 並行実行するな)

```bash
# 掃除してから単独で走らせる
cmd //c "taskkill /F /IM chrome.exe /T"
rm -rf "$LOCALAPPDATA/Temp"/archify-visual-check-profile-*
rm -rf "$LOCALAPPDATA/Temp"/paradise-test-atlas*

cd "$LOCALAPPDATA/Temp/pd-verdict"
export PARADISE_CREATIONS='C:/Users/kikus/Documents/workspace/paradise-creations'
node tests/paradise.test.js        # 期待: 288 passed, 0 failed / exit=0
```

**他のコマンドと同時に走らせないこと。** 並行すると atlas 系が不定に赤くなる(則E)。

### 4 の手順

```bash
cd "$LOCALAPPDATA/Temp/pd-verdict"
git push -u origin reform/dashboard-living-gate
gh pr create --title "<題>" --body-file reform/dashboard-living-gate/pr-body.md
```

**main へ直接コミットするな。マージは神の御手のみ。**

### 5 の手順(神の明示的な依頼)

```bash
hermes send -t 'discord:神籬' "<PR の URL を含む報告>"
```

## 4. 成果の要約(すべて実測済み)

```
コミット: 26本 (main比)
変更:     63ファイル
自己診断: 268 → 288 passed
CI の門:  ダッシュボードに触れるのは1行 → 13本 + visual-verify + critic
```

### 神託への回答

| 神の不満 | 改修前 | 改修後 |
|---|---|---|
| 見た目が憲法どおりでない | visual-verify 5 gap + 1 smell | **all visual checks pass** |
| 遷移できない・リンクがない | `a[href]` **0本** | **6本**(断面から生成) |
| トップページがない | 無し | **「楽園の門」** |
| 最新化されていない | engines 2(実33)/self-tests 10(実268)/創造物 0(実7) | **すべて engine 実出力** |
| 静的でリアルタイムでない | `EventSource` 0件 | **SSE。conclave.json 書換に 91ms で追随** |
| 何が流れているか分からない | 一切映らず | **停止1件/矛盾3件が第一画面** |

### 作ったもの

```
graph/pulse.js              断面(snapshot)を作る唯一の engine。CLI: snapshot/serve/freshness
dashboard/index.html        「楽園の門」トップ
dashboard/control.html      深掘り画面
dashboard/paradise.js       三層フォールバック(EventSource → fetch → 埋め込みJS)
tests/dashboard-*.test.js   門12本
tests/motion-probe-leak.test.js  資源漏れの門
```

### engine に返した欠陥5件

1. **台帳が虚偽の `done` を記せた**(X-1) — `markDone` が実在を検めるようにした
2. **census が総括でなく先頭を読んでいた** — `summaryOf()` で名乗りを狙う
3. **`close()` が正常終了時にも例外** — `failAll` に `graceful` の別
4. **検器が Chrome プロファイルを漏らす** — 483→683 が検器1回で差0へ
5. **`--json` が出力を変えない engine 3つ**

## 5. 立てた則(繰り返し効いた)

| 則 | 内容 |
|---|---|
| 則1〜4 | AC は走らせて赤を見る / 正規表現の方言をまたぐな / 固定値を期待値にするな / この機に在るコマンドだけ |
| 則A〜C | 不定に鳴る門は症状でなく原因を数える / 入力の決定性を先に証明せよ / 一つの根が複数の赤を生んでいないか疑え(実測で確かめよ) |
| **則D** | **壊れたことを先に証明せよ。門を疑うのはその後である** |
| **則E** | 並行作業中の測定値を単独走行の値と比べるな。**測る前に自分がどこに立っているかを確かめよ** |
| **則F** | **自分が書いた記録を、他人の主張と同じ厳しさで疑え** |
| **則G** | **`git add -A` を使うならコミット前に `git diff --cached` を読め** |

**則D は四度、則E は三度効いた。** 赤が出たとき、答えは
「実装が満たしていない」と「**測り方が的を外している**」の二つある。
この改修では**後者が圧倒的に多かった** — 実装は正しく、教主が間違っていた。

## 6. 引っかかった罠(再発しやすい)

### engine API

```
clergy.COLLEGE / clergy.orgChart()   ※ college() は無い
forge.buildDag(wish, 'reform')       ※ 第2引数は文字列
gauge.score(<run object>)            ※ パスだと THROW
spawn-trace.report(<run object>)     ※ パスだと静かに {ok:true,total:0} を返す(最悪)
conclave.js status --run <path>      ※ slug ではない
```

### 断面の鍵

```
runs[].state === 'stalled'      ※ r.stalled ではない
runs[].contradiction            ※ 満点かつ起動証跡なし
```

### 環境

- `terminal` の長い一行は BLOCKED になる → `.sh` に書いて `bash <file>` で実行
- MSYS パス(`/c/...`)はネイティブプログラムに通らない → `C:/...` 形式
- Chrome を使う検査を**並行で走らせない**(不定に赤くなる)

## 7. 未確定・注意

- **`verdict-report.json` は誤測値を含む**。worktree に兄弟倉が無い状態で作ったため
  errors 3件・runs 0・atlas 0本と出ている。**作り直すこと**
- 自己診断の最終確認が**未完**。単独で走らせて 288/0 を確かめてから verdict を確定する
- 本体リポジトリには `stash@{0} other-runner-inflight` 等、隣人の作業がある。**触らない**
- `reform/conclave-resume` `reform/conclave-resume2` は別作業。**我らの PR に混ぜない**

## 8. 残る負債(PR に正直に書いてある)

| # | 内容 | 出荷を止めない理由 |
|---|---|---|
| X-2 | 断面の `runs[].path` が絶対パス5件 | 127.0.0.1 限定 + 画面は `.path` を描かない |
| F-5 | `pulse.js:469` の `thresholds` が消費者ゼロ | 死んだ定義 |
| F-6 | `control.html` が5関数を写経 | 門の射程外 |
| F-7 | `counts=null` で画面に文字列 `null` | errors 表が理由を名指しする(醜いが嘘ではない) |
| — | `orchestrator.js` の `markDone` に同じ検査なし | 別の道 |
| — | `critic.js` が reform の三箇所を束ねられない | 同上 |
| — | DoS 耐性・XSS が**未検査** | 「安全」と偽らず「未検査」と明記済み |
