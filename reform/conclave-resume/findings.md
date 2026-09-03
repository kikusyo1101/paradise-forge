# findings — conclave の環が中断で死ぬ袋小路 (第10条/第43条)

調査者: 教主自身（神官 market-researcher を delegate_task で召喚したが 420 秒で
timeout し、artifact を一切残さなかった。第27条に従い「done」を信じず、成果物の
不在を `ls` で確認した上で、教主が自ら実測した）。

```
$ ls -la reform/conclave-resume/
-rw-r--r-- 1 kikus 197609 8867  9月  2 22:02 conclave.json
-rw-r--r-- 1 kikus 197609 5112  9月  2 22:01 forge.dag.json
$ head -40 reform/conclave-resume/findings.md
head: cannot open ... No such file or directory
```

## 1. 実物が壊れている — 今日の22時ジョブが実際に詰まった run

本日 20:45 の走行 `reform/dashboard-living-gate` は PR を出さぬまま中断した。
その run state は disk に残っており、**再開できない**:

```
$ node graph/conclave.js next --run reform/dashboard-living-gate/conclave.json
{
  "level": "domain",
  "phase": "stuck",
  "cardinal": "quality",
  "message": "No ready phases, not all done — a dependency may be in another unratified domain or reworking."
}
```

`status` が語る中身（4/6 批准で凍結）:

```
▶ 枢機卿 quality — Quality (品質)   [review: executor]
     ▶    review @code-reviewer
     ▶    security @security-reviewer
     ▶    docs @doc-updater
     ↻ ⚖️ verify @verification-loop
domains ratified: 4/6
```

生の state を読むと、3相が `running` のまま化石化している:

```
== quality ratified=undefined rework=0
    review   status=running deps=["build","prove"]
    security status=running deps=["build"]
    docs     status=running deps=["build"]
    verify   status=rework  deps=["review","security","prove"]
```

## 2. 根因 — `phaseReady` は running を永久に締め出す

```
$ grep -n "function phaseReady" -A 12 graph/conclave.js
79:function phaseReady(run, phase) {
80-  if (phase.status !== 'pending' && phase.status !== 'rework') return false;
81-  const all = allPhases(run);
82-  return phase.deps.every(d => all.get(d) && all.get(d).status === 'done');
83-}
```

相が ready になれるのは `pending` か `rework` のときだけ。ところが発令の瞬間に
`markRunning()` が `running` へ落とす:

```
$ grep -n "running" graph/conclave.js
196:/** Mark a phase running (attempts++). Called on dispatch. */
199:  for (const id of ids) { const p = all.get(id); if (p) { p.status = 'running'; p.attempts += 1; } }
```

`running` から出る道は `markDone()` （= 走者が最後まで生きていた場合）しかない。
**走者が途中で死ぬと `running` は永久欠番になる。** `phaseReady` は false を返し続け、
`next` は `stuck` を返し続け、環は二度と回らない。

これは仮説ではない。上の §1 が実物である。

## 3. engine に再開の道が存在しない

```
$ node graph/conclave.js
commands: convene <dag> --run f | next --run f | done <id> --run f --artifact p |
          ratify <cardinal> --run f [--reject --from id] | status --run f [--json]
```

**running を回復させる verb は 0 本。** `done` は嘘をつくことになる（成果物が無いのに
done を刻む）。`ratify --reject` は domain 単位の rework であり、しかも
`reworks` を消費するため loop-guard を無駄に削る。中断からの復帰は engine の
語彙に存在しない。

## 4. 門が沈黙している — `stuck` は生まれるだけで誰も試さない

```
$ grep -rn "stuck" tests/ graph/
graph/conclave.js:192:  return { level: 'domain', phase: 'stuck', cardinal: d.cardinal,
```

**全リポジトリで 1 箇所。** それは `stuck` を *生む* 行である。
`stuck` を *試す* テストは **0 本**。ゆえに 266 本の門が全部緑でも、
環は本日実際に死んだ。これは第45条が刻んだ教訓
「門が緑のまま沈黙している経路」の、まさに同型の再発である。

## 5. 憲法はこれを既に禁じている（新条は不要か？→ 必要である）

`node graph/codex.js article 10`:

> 10. **Orchestration is an explicit, durable state machine, not a prompt.** One
>     conductor holds the run state; workers are stateless and focused. (...)
>     Loops are bounded: the loop-guard escalates to a human rather than
>     burning on the same phase forever.

第10条は「durable(永続)」と「loop-guard は人へ escalate する」を要求している。
だが今の実装は **burn もしなければ escalate もしない** — 第三の死に方、
すなわち**静止**をする。`stuck` は誰にも通知されず、loop-guard も数えず、
ledger にも残らない。第10条の精神には反するが、条文の文字は
「中断した走者の残骸をどうするか」を一言も定めていない。

関連条の実測（`codex.js index` より）:

| 条 | 題 | この欠陥との関係 |
|----|-----|------------------|
| 10 | Orchestration is an explicit, durable state machine | durable を要求するが再開を定義しない |
| 34 | A gate that cannot run is worse than a gate that fails | `stuck` は「走れない門」の状態そのもの |
| 37 | Absence is not passage | stuck の沈黙が「通過」に見える |
| 43 | 逃した窓は借金であって赦しではない | 詰まった run はノルマ未達の借金として残った |
| 45 | 発令する者は走る者ではない | 走者の死が state を汚す経路が未定義 |

→ **`running` の残骸を回収し、環を再開する道**を engine に建て、
それを条として明文化する必要がある。

## 6. 数（実測）

| 測るもの | 値 | 出所 |
|----------|-----|------|
| 自己診断テスト総数 | 266 passed / 2 failed | `node tests/paradise.test.js` |
| `stuck` を試すテスト | **0 本** | `grep -rn "stuck" tests/` |
| running を回復させる engine の道 | **0 本** | `node graph/conclave.js` usage |
| 実際に詰まっている run | **1 本** (`reform/dashboard-living-gate`, 3相が running 化石) | `conclave.js next` |

### 付随して見つかった赤 2 本（別件・残骸由来）

```
✗ atlas: 全ての道が図になる — 描画器が実際に受理する (第47条)
✗ atlas: 門は己の残骸で落ちない — 同じ作業場で二度走る (第21条)
```

原因は temp の残骸。`$LOCALAPPDATA/Temp` に **paradise-* が 9896 個**堆積していた。
`paradise-test-atlas-twice` と `paradise-atlas-check` を消すと赤は消えた
（= 門自身が「己の残骸で落ちない」と名乗りながら落ちていた）。これも同じ病
——**中断が残した残骸を誰も回収しない**——の別の顔である。

## 7. 結論

願い「conclave の環が中断で running のまま二度と回らなくなる袋小路を塞ぐ」は
実在の欠陥に基づく。直すべきは artifact（詰まった run 1本）ではなく
**pipeline**（回復の道が engine に無いこと・stuck を門が見ていないこと）である。

## 8. この調査に至るまでの環（synod / orchestration の記録）

この願いは建造へ直行していない。**synod（計画の環）を先に回した**:

```
$ node graph/synod.js plan "<願い>"
scale: reform   ratified: ✓
✓ plan ratified — proceed to conclave.convene()
```

道は写経せず `forge.js scale` に問うた → `reform`。
統率は prompt ではなく **disk 上の状態機械**(`conclave.js` の入れ子の環)で回し、
run state は `reform/conclave-resume/conclave.json` に永続する
（`orchestrator.js` の平坦な環ではなく、階層の環を用いた）。
各相の批准は適切な階級が下した。詳細と実出力は `verify.md` §1・§2 にある。
