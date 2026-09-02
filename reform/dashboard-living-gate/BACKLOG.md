# BACKLOG — dashboard-living-gate 未了課題の実行台帳

> 起票: 2026-09-03 / 起票者: 教主(後任セッション)
> **この台帳は「いつでも再開できる」ことだけを目的とする。**
> 前任の `UNFINISHED.state.md` と `HANDOFF.state.md` を後任が**再測定**し、
> 食い違いを訂正した上で、着手可能な単位に割った。
>
> 神託により **今は実行しない。** 神が「再開」と告げたとき、§0 から始める。

---

## 0. 再開の手順(これだけ読めば始められる)

```bash
# 1. 作業場を得る(既存 worktree が生きていれば cd だけでよい)
cd C:/Users/kikus/Documents/workspace/paradise
git worktree list | grep dashboard-living-gate || \
  git worktree add "$LOCALAPPDATA/Temp/pd-verdict" reform/dashboard-living-gate

cd "$LOCALAPPDATA/Temp/pd-verdict"
export PARADISE_CREATIONS='C:/Users/kikus/Documents/workspace/paradise-creations'

# 2. 立っている場所を確かめる(則E — 測る前に必ず)
git branch --show-current       # 期待: reform/dashboard-living-gate
git status --short              # 期待: 空(隣人の混入が無いこと)

# 3. 単独で自己診断(則E: 他コマンドと並行させない)
cmd //c "taskkill /F /IM chrome.exe /T"
node tests/paradise.test.js     # 期待: 288 passed / 0 failed
```

**成果は既にリモートへ退避済み** — Temp が消えても失われない:

```
origin/reform/dashboard-living-gate = 279a634  (28 commits ahead of main)
```

---

## 1. 前任の記述への訂正(後任が再測定した結果)

**前任の測定は 2 箇所で誤っていた。着手前にこれを読むこと。**

| 前任の主張 | 後任の実測 | 判定 |
|---|---|---|
| F-6: `control.html` が `paradise.js` の**5関数を写経**、`POLL_MS` が **3+3箇所** | 重複関数 **0件**(39関数を突合)。`POLL_MS` は control.html に **2箇所**、paradise.js には **0箇所**(`TH.POLL_INTERVAL_MS`) | **誤り。ただし別の欠陥が実在する** → T-4 参照 |
| B-2: XSS は「コードを読めば分かるが読んだだけ」 | `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`/`eval`/`new Function` = **全て 0件**。描画は `textContent` のみ(10箇所) | **構造上 sink が無い。危険度を「未検査」から「低」へ降格** |

その他(F-5 / F-7 / D-1 / 環の未完相 / X-2)は**前任の記述どおり**であることを再確認した。

```
F-5 thresholds : pulse.js 1 / paradise.js 0 / control.html 0   ← 消費者ゼロ 確認
F-7            : control.html:219 が snap.counts.kgNodes を直に連結  確認
D-1            : grep -c '実在しない' graph/orchestrator.js → 0     確認
環の未完相      : tribunal reflect(running) / verdict(rework)      確認
X-2            : pulse.js の .path 参照 4箇所                      確認
```

---

## 2. タスク一覧

### T-1 【最優先】環を閉じる — verdict → PR → Discord

> 神が明示的に命じた最後の一歩。**これだけは他に先んじる。**

| | |
|---|---|
| 状態 | 未着手(ブランチの push のみ完了) |
| 依存 | 自己診断 288/0 が単独走行で緑であること |
| 完了条件 | PR の URL が神の手に渡り、`conclave.json` の tribunal 両相が `done` |

```bash
# (a) verdict-report.json を作り直す ← 既存のものは worktree 誤測値を含む
#     必ず PARADISE_CREATIONS を設定した状態で。AC を「走らせて」数える
# (b) node graph/verdict.js judge reform/dashboard-living-gate/verdict-report.json
#     exit 0 = SHIP / 1 = REWORK / 2 = BLOCK
# (c) node graph/conclave.js done reflect  --run reform/dashboard-living-gate/conclave.json --artifact <path>
#     node graph/conclave.js done verdict  --run reform/dashboard-living-gate/conclave.json --artifact <path>
#     ※ markDone は実在を検める。偽のパスは throw する
# (d) gh pr create --title "<題>" --body-file reform/dashboard-living-gate/pr-body.md
# (e) hermes send -t 'discord:神籬' "<PR URL を含む報告>"
```

**注意**: `pr-body.md` は F-6 の誤った記述を含む。§1 の訂正を反映してから出すこと。

---

### T-2 【engine】D-1 — `orchestrator.js` の `markDone` に実在検査を据える

> **今日 X-1(台帳が虚偽の done を記した)を生んだ穴と完全に同型。**
> conclave では塞いだが、orchestrator では空いている。次に台帳が嘘をつくならここ。

| | |
|---|---|
| 場所 | `graph/orchestrator.js:105` `function markDone(run, id, artifact, note)` |
| 手本 | `graph/conclave.js` の同名関数(この改修で追加した門) |
| 完了条件 | 実在しないパスで throw / 回帰テストが `tests/paradise.test.js` に在る / 憲法に条を足す |

**これは engine の欠陥なので reform の道(第23条)。教主の独断で書き換えない。**

---

### T-3 【engine】D-2 — `critic.js` が reform の三箇所を束ねられない

| | |
|---|---|
| 症状 | critic は `reform/<slug>/` の散文だけを見て「テストが無い」と言う |
| 実態 | reform の成果は 実装 `graph/` ・門 `tests/` ・散文 `reform/<slug>/` の**三箇所**に散る |
| 完了条件 | reform 種別の run では三箇所を束ねて評価する / 誤検知が消えることを実測 |

---

### T-4 【実装】定数が三つのファイルに散っている(F-6 の真の姿)

> 前任は「関数の写経」と書いたが**誤り**。実在するのは**定数の三重定義**である。

```
$ grep -n 7317 dashboard/paradise.js dashboard/control.html graph/pulse.js
dashboard/paradise.js:28:   DEFAULT_PORT: 7317,      ← TH ブロック
dashboard/control.html:129: var DEFAULT_PORT = 7317, POLL_MS = 2000;
graph/pulse.js:73:          DEFAULT_PORT: 7317,
```

**`paradise.js:20` のコメントは「それぞれ 1 箇所でのみ定義する」と書いてある。**
**この宣言自体が現状では嘘である。** ここが最も痛い。

| | |
|---|---|
| 危険度 | **高** — 片方だけ古くなり、しかも門の射程外で鳴らない(第50条) |
| 完了条件 | 7317 と 2000 が単一の出所を持つ / **定数の重複を機械が咎める門**を足す |

門を足さなければ再発する。**直すより、鳴るようにする方が価値が高い。**

---

### T-5 【実装】F-7 — `counts=null` で画面に文字列 `null` が出る

```
dashboard/control.html:219
  mb.appendChild(el('p', { class:'mono',
    text: 'KG ノード ' + snap.counts.kgNodes + ' / エッジ ' + snap.counts.kgEdges }));
```

| | |
|---|---|
| 危険度 | 低(嘘ではない。同画面の errors 表が理由を名指しする)。ただし**神が見る画面** |
| 完了条件 | `null` のとき「—」または「(測れず)」を出す / 門で固める |

---

### T-6 【安全】B-1 — DoS 耐性が未検査

| | |
|---|---|
| 未測定 | SSE の同時接続を 7 本以上にしたときの挙動 / `fs.watch` 連打時の再入 |
| 根拠 | ブラウザの同時接続上限は 6。7枚目以降のタブで何が起きるか**設計にはあるが実測が無い** |
| 完了条件 | 実測値を `security.md` に載せる(第16条: 測っていないものを緑と呼ばない) |

---

### T-7 【安全】B-2 — XSS ※**危険度を降格した**

後任の実測により、描画経路に HTML sink が**一つも無い**ことを確認済み:

```
innerHTML 0 / outerHTML 0 / insertAdjacentHTML 0 / document.write 0 / eval 0 / new Function 0
textContent 10 (paradise.js 7 + control.html 3)
```

| | |
|---|---|
| 残る作業 | **回帰の門**を足す — 「dashboard/ に HTML sink を書いたら赤くなる」 |
| 理由 | 今は安全だが、それを守る機械が無い。**状態でなく性質にせよ** |
| 実注入試験 | 任意。やるなら `conclave.json` を必ず退避し md5 で復元を確認 |

---

### T-8 【衛生】X-2 — 断面に絶対パスが載る

`runs[].path` に `C:\Users\kikus\...` が出る。127.0.0.1 限定 + 画面は描かないので**今は無害**。
**断面を外部へ配る日が来たら落とす鍵。** 着手は T-1〜T-5 の後でよい。

---

## 3. 作法(前任が踏んだ罠。繰り返さない)

| 則 | 内容 | 効いた回数 |
|---|---|---|
| **則D** | **壊れたことを先に証明せよ。門を疑うのはその後** | 前任で4度 |
| **則E** | **測る前に自分がどこに立っているかを確かめよ。** Chrome を使う検査は単独走行 | 前任で3度 |
| **則F** | **自分が書いた記録を、他人の主張と同じ厳しさで疑え** | **§1 で実際に効いた** |
| **則G** | `git add -A` を使うならコミット前に `git diff --cached` を読め | E-1 の再発防止 |
| 則H(新) | **隣人が同じ倉に居ると分かった時点で worktree を切れ。**四度目の後では遅い | E-2 |

### engine API の罠(パスとオブジェクトの別)

```
clergy.COLLEGE / clergy.orgChart()   ※ college() は無い
forge.buildDag(wish, 'reform')       ※ 第2引数は文字列
gauge.score(<run object>)            ※ パスだと THROW
spawn-trace.report(<run object>)     ※ パスだと静かに {ok:true,total:0} を返す(最悪)
conclave.js status --run <path>      ※ slug ではない
```

### 環境

- `terminal` の長い一行は BLOCKED → `.sh` に書いて `bash <file>`
- MSYS パス(`/c/...`)はネイティブプログラムに通らない → `C:/...` 形式
- `dashboard/atlas/*.html` は gitignore された生成物。worktree に無い →
  導線を測る前に `node graph/atlas.js all`

---

## 4. 触ってはならないもの

- 本体リポジトリ `C:/Users/kikus/Documents/workspace/paradise` は
  現在 `reform/conclave-resume2` で**隣人が占有**。stash も隣人のもの。**触らない**
- `reform/conclave-resume` / `reform/conclave-resume2` は別作業。**我らの PR に混ぜない**
- **main へ直接コミットしない。マージは神の御手のみ**

---

## 5. 着手順の推奨

```
T-1  環を閉じる          ← 神の明示的な命。他に先んじる
T-2  orchestrator の門    ← X-1 と同型の穴。台帳の信頼に関わる
T-4  定数の三重定義       ← 門の射程外。壊れても鳴らない(第50条)
T-5  counts=null          ← 神が見る画面
T-7  XSS 回帰の門         ← 安いのに性質を守る
T-6  DoS 実測             ← 時間がかかる
T-3  critic の reform 対応 ← 効果は大きいが急がない
T-8  絶対パス             ← 外部配布の日まで待てる
```

**T-1 以外は独立している。** 神の都合で任意の順に着手してよい。
