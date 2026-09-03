# 走者の死は環の死ではない — 中断からの再開の道を建てる (第51条)

## 🔍 発見した欠陥

**本日22時の定時ジョブ自身が、この欠陥で死んでいた。**

`graph/conclave.js` の `phaseReady()` は `pending`/`rework` の相しか ready にしない。
だが発令時に `markRunning()` が相を `running` にする。走者(cron/セッション)が
途中で斃れると、`running` の印は disk に**化石として残り、二度と ready にならない**。
`next` は永遠に `{phase:'stuck'}` を返し、環は再開不能になる。

実物（20:45に中断した `reform/dashboard-living-gate`、4/6批准・PR無しで静止）:

```
$ node graph/conclave.js next --run reform/dashboard-living-gate/conclave.json
{ "phase": "stuck",
  "message": "No ready phases, not all done — ..." }

== quality
    review   status=running   ← 化石
    security status=running   ← 化石
    docs     status=running   ← 化石
```

そして最悪なのは、**門が一本も鳴らなかった**ことである:

```
$ grep -rn "stuck" tests/ graph/
graph/conclave.js:192:  return { level: 'domain', phase: 'stuck', ... }   ← 生む行のみ
```

`stuck` は全リポジトリで **1箇所**（それを生成する行）。
**それを試す門は 0本。** 268本の門が全部緑のまま、環は現実に死んでいた。
`running` を回復させる engine の verb も **0本**だった。

## 🔧 修復（artifact ではなく pipeline を直す・第9条）

| 変更 | 内容 |
|------|------|
| `resume` verb 新設 | `running` の化石を `rework` へ戻す。`done` を偽らず、`reworks` も消費しない |
| `dispatchedAt` | `markRunning` が発令の刻を記す。これが無ければ生者と死者を分けられない |
| `next --reclaim` | opt-in（既定OFF）。既定の `next` は相の status を書かない |
| `MAX_PHASE_RESUME=2` | 相単位 loop-guard。尽きたら `blocked` として人へ escalate |
| `status` の警告 | 中断の疑いがある `running` を人に見せ、沈黙を破る |
| **憲法 第51条** | 「走者の死は環の死ではない。走り始めた印は、帰れる印でなければならない」 |

**生死の判定は「人の意思 > 時刻 > (試行回数は使わない)」。**
判定不能な古い run を engine が独断で剥がせば二重発令という新しい病を生む(第45条の同型)
ため、そのときは engine は手を出さず `--force` を要求する。

### 実物が生き返ることを確かめた (AC-09)

```
$ node graph/conclave.js resume --run <中断した実物>
resumed: []
  review/security/docs -> no dispatchedAt — 判定不能な古い run。--force を要する
$ node graph/conclave.js next --run <同>
  "phase": "stuck"          ← engine は勝手に触らなかった

$ node graph/conclave.js resume --run <同> --force
resumed: ['review', 'security', 'docs'] — 環は再び回る
$ node graph/conclave.js next --run <同>
phase: wave  cardinal: quality  dispatch: ['review','security','docs']
```

**`stuck` → `wave`。実際に死んでいた run が生き返った。**

## 🧪 門を壊して鳴ることを確かめた (第21条)

**鳴らない門は飾りである。** 3回の破壊試験を行い、生出力を `prove.md` に残した。

| 破壊 | 鳴った門 |
|------|----------|
| `resume` が status を戻さない | 3本が赤 |
| `markRunning` の刻印を消す | 2本が赤 |
| `MAX_PHASE_RESUME = Infinity` | 1本が赤 |

この過程で**門自身の欠陥を2つ暴いた**:

1. **OOM で死ぬ門**: loop-guard の門が反復境界を `MAX_PHASE_RESUME + 1` と書いていたため、
   上限を `Infinity` に壊すと門は**落ちる代わりに永久に回って heap out of memory で死んだ**。
   上限を検める門が上限に依存していた。独立した `HARD_STOP` を導入して修正。
   （CI では OOM は「テストが落ちた」ではなく「ジョブが壊れた」と読まれ、原因を誰も見に行かない。）
2. **効いていない破壊**: 一度目の破壊は CRLF 不一致で黙って何も変えず、
   それでも緑だったため「門が鳴らない」と誤読しかけた。`diff` で実物を比べて発覚。
   **壊したつもりで壊れていない破壊試験は、緑の買収である。**

さらに `next --reclaim` の門は、**教主の設計文の誤りを訂正させた** —
「`next` は純粋」と書いていたが実際は domain を `pending→active` にしていた。
門を緩めず、契約を正確に書き直し design.md にも訂正を残した。

## 📊 数

```
$ node tests/paradise.test.js
Paradise self-test: 277 passed, 0 failed     (改修前: 268 passed, 0 failed / +9本)
```

```
workspace ✓  apply-seat ✓  census ✓  check-agents ✓  wiring ✓  deploy ✓  apply-guards ✓
```

```
$ node graph/verdict.js judge reform/conclave-resume/verdict-report.json
✅ SHIP — trajectory 80/100, build passes, no security issues
```

## 👥 位階（正直な記録）

synod で計画を批准 → forge → conclave の環を6ドメイン回した（run state は disk）。

| 相 | 神官 | 結果 |
|----|------|------|
| discover | `market-researcher` | **420秒 timeout・成果物なし** → 教主が自ら実測 |
| specify | `requirements-analyst` | **成功**（13 AC / 28KB）。主張は全て教主が実測で照合してから採用 |
| design | `architect` | **420秒 timeout・成果物なし** → 教主が自ら設計 |

timeout した2相は `ls` で不在を確認した上で引き取った（第27条: 「done」を信じない）。
**神官の沈黙そのものが、本 PR が扱う病の実例である。**

## 📝 残した欠陥（緑を買わずに正直に記す）

`critic.js` の `tests-exist` は `creations/<slug>/` 配下にしかテストを探さず、
**reform の道**（engine を直すのでテストは `tests/paradise.test.js` に住む）を知らない。
ダミーの test ファイルを置けば緑にできるが、それは緑の買収(第37条)なのでしない。
**次の願いの種として `verdict-report.json` の `openGaps` に記録した。**

---

**教主は自らを承認しない。マージは神の御手のみ。**
