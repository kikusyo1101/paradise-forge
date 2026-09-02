# docs / verify — 環の実走記録と、断罪機関の指摘への応答

## 1. 計画の環 (synod) — 願いは建造へ直行していない (第11条)

`/conclave` の掟どおり、**convene の前に synod を回した**。実出力:

```
$ node graph/synod.js plan "conclave の環が中断で running のまま二度と回らなくなる袋小路を塞ぐ — 再開の道を engine に建てる"
⛪ SYNOD — 計画サイクル（教主↔枢機卿）
wish: conclave の環が中断で running のまま二度と回らなくなる袋小路を塞ぐ — 再開の道を engine に建てる
scale: reform   ratified: ✓

Convocation of cardinals:
  枢機卿 discovery — Discovery (調査)  [discover]  review:pontiff
  枢機卿 requirements — Requirements (要件)  [specify]  review:cardinal:discovery
  枢機卿 architecture — Architecture (設計)  [design]  review:cardinal:requirements
  枢機卿 construction — Construction (建造)  [build, prove]  review:cardinal:quality
  枢機卿 quality — Quality (品質)  [review, security, docs, verify]  review:executor
  枢機卿 tribunal — Tribunal (断罪機関)  [reflect, verdict]  review:god

✓ plan ratified — proceed to conclave.convene()
```

道は `forge.js scale` が答えた（写経していない）:

```
$ node graph/forge.js scale "<願い>"
reform
```

## 2. 統率は disk 上の状態機械で回した — prompt ではない (第10条)

```
$ node graph/forge.js plan "<願い>" --out reform/conclave-resume/forge.dag.json
FORGED  scale=reform  phases=11  gates=[discover, specify, design, prove, verify, reflect, verdict]

$ node graph/conclave.js convene reform/conclave-resume/forge.dag.json --run reform/conclave-resume/conclave.json
domains ratified: 0/6
```

環は `conclave.js next` が返す発令に従って回し、各相の批准は
**適切な階級**が下した（discovery→pontiff、requirements→cardinal:discovery、
architecture→cardinal:requirements、construction→cardinal:quality）。
`orchestrator.js` の平坦な状態機械ではなく、入れ子の環(`conclave.js`)を用いた。

### 神官の召喚と、その失敗の記録 (第27条)

| 相 | 召喚した神官 | 結果 |
|----|--------------|------|
| discover | `market-researcher` (delegate_task) | **420秒 timeout・artifact 無し** → 教主が自ら実測 |
| specify | `requirements-analyst` (delegate_task) | **成功**。28KB / 13 AC。主張を教主が実測で照合し採用 |
| design | `architect` (delegate_task) | **420秒 timeout・artifact 無し** → 教主が自ら設計 |

timeout した2相は `ls` で成果物の不在を確認した上で教主が引き取った。
**「done」を信じず、実物を見た。**

`requirements-analyst` の返した主張は、採用前に全て実測で裏を取った:

```
$ node -e "const c=require('./graph/conclave.js'); ..."
typeof resume: undefined          # 「resume は未実装」→ 真
MAX_PHASE_RESUME: undefined       # 「相単位 loop-guard は不在」→ 真
phase keys: id,agent,goal,deps,gate,artifact,status,attempts,artifactPath
                                  # 「相 schema に時刻欄が無い」→ 真
$ node graph/codex.js index | tail -1
| 50 | ...                        # 「現行は第50条まで」→ 真
```

## 3. 断罪機関(critic)の指摘への応答

```
🔴 tests-exist: no test file found
🟠 claims-backed-by-runnable-evidence: no runnable verification
🔴 lesson:orchestration-in-prompt: "orchestrator" not addressed
🔴 lesson:plan-before-build: "synod" not addressed
```

### 3-a. `tests-exist` — これは **critic 側の射程の問題**である（正直な報告）

critic は創造物(`creations/<slug>/`)を前提に、**その配下**にテストを探す。
だが reform の道では、直す対象は engine であり、
**テストは `tests/paradise.test.js` に住む**（第23条: engine の変更は `graph/` へ直接書く）。
ゆえに reform ディレクトリ配下に test ファイルは存在しない。

これは本改修の欠落ではなく、**critic が reform の道を知らない**という
別個のパイプライン欠陥である。門を騙すためにダミーの test ファイルを
`reform/conclave-resume/` へ置くことはしない（それは緑の買収である・第37条）。
**次の願いの種として正直に記録する。**

実際のテストの所在と本数:

```
$ grep -c "第51条" tests/paradise.test.js
10                                 # 9本の test + 1つの見出しコメント
$ node tests/paradise.test.js | tail -2
Paradise self-test: 277 passed, 0 failed
```

### 3-b. `claims-backed-by-runnable-evidence`

`prove.md` が破壊試験の生出力を持つ（3回の破壊、各々どの門が鳴ったか）。
検証は再現可能である:

```
$ node tests/paradise.test.js                         # 277 passed, 0 failed
$ node graph/conclave.js resume --run <run> --force   # 実物の run が生き返る
$ node graph/codex.js article 51                      # 条が読める
```

### 3-c/d. `orchestration-in-prompt` / `plan-before-build`

いずれも**実際には満たしている**が、その証拠が reform 配下の文書に
書かれていなかった（critic は文書を読んで判ずる）。本文書 §1・§2 がそれである。
**教訓の再発ではなく、記録の欠落だった。**

## 4. 品質の門 — 全て実走 (第23条の終い)

```
=== workspace.js check === PASS      (第30条)
=== apply-seat.js verify === PASS    (第31条)
=== census.js check === PASS         (第22条)
=== check-agents.js === PASS         (第25条)
=== wiring.js check === PASS         (第48条)
=== deploy.js check === PASS
=== apply-guards.js verify === PASS
```

## 5. security — この改修が触る境界

`resume` は**ファイルを読み書きしない**。触るのは run state の JSON のみで、
その経路は既存の `load`/`save` と同一である。外部入力は
`--phase` の相 ID（未知なら例外）、`--force`(真偽)、`--stale-ms`(数値化)。
秘密情報・ネットワーク・シェル起動は増えていない。

```
$ node graph/apply-guards.js verify   # PASS
```

`--force` は**破壊的ではない**: 相を `rework` に戻すだけで、
成果物(`artifactPath`)は保持され、`done` を偽ることはない。
最悪の誤用（生きている走者を `--force` で回収する）でも、
起きるのは二重発令であり、loop-guard(`MAX_PHASE_RESUME=2`)が有限で止める。
