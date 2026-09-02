# design — 中断からの再開機構 (第51条)

設計者: 教主自身（神官 architect を delegate_task で召喚したが 420 秒で timeout し、
artifact を残さなかった。第27条に従い `ls` で不在を確認した上で教主が自ら設計した。
2度目の timeout であり、これ自体が別途記録されるべき運用上の事実である — §7 参照）。

依拠: `findings.md`（実測された欠陥）・`requirements.md`（13 AC）・
`graph/conclave.js` 全318行の実読・`CONSTITUTION.md:966-1002` の文体実読。

---

## 1. graph/conclave.js への変更設計

### 1-1. `markRunning()` — 発令の刻を記す (AC-06)

現在（197-201行）:

```js
function markRunning(run, ids) {
  const all = allPhases(run);
  for (const id of ids) { const p = all.get(id); if (p) { p.status = 'running'; p.attempts += 1; } }
  run.history.push({ ts: now(), event: 'dispatch', detail: ids.join(', ') });
}
```

変更後 — `dispatchedAt` を刻む。相 schema（61行）は
`id,agent,goal,deps,gate,artifact,status,attempts,artifactPath` であり
**時刻欄が無い**（実測 §0-A）。これが「死んだ running」を時刻で裁けない根因である。

```js
for (const id of ids) {
  const p = all.get(id);
  if (p) { p.status = 'running'; p.attempts += 1; p.dispatchedAt = now(); }
}
```

`convene()`（61行）の初期化にも `dispatchedAt: null` を加える。
**既存の run は `dispatchedAt` が `undefined`** であり、これは「判定不能」を意味する
（`null` = まだ発令されていない、`undefined` = 古い run。どちらも時刻判定に使えない）。

### 1-2. `resume(run, opts)` — 新設 (AC-01/02/03/05/07/08)

**なぜ既存の verb で足りないか**（requirements の決定を実装に落とす）:

| 候補 | 却下理由 |
|------|----------|
| `done <id>` | 成果物が無いのに done を刻む＝**台帳に嘘を永続化**する（第37条: 不在は通過ではない） |
| `ratify --reject` | 粒度が domain。`reworks` を消費して loop-guard を無駄に削る（232行）。台帳上で「品質差し戻し」と「走者の死」が混ざり、後から区別できない |

シグネチャと戻り値:

```js
function resume(run, opts = {}) {
  // opts: { phase?: string, force?: boolean, staleMs?: number }
  // 戻り: { ok, resumed: [ids], skipped: [{id, reason}], blocked?: cardinal, message }
}
```

判定則（**人の意思 > 時刻 > attempts不使用**）:

1. 対象は `status === 'running'` の相のみ。それ以外は `skipped`（理由付き）。
2. `opts.phase` が与えられたらその相**だけ**を見る（人が名指しした＝人の意思。
   `--force` 相当の明示性を持つが、後述の生存猶予は依然として効く）。
3. 生死の判定:
   - `dispatchedAt` が有効な時刻で、経過 < `STALE_MS`(既定 15分) → **生きている**とみなし
     `skipped: {reason:'fresh'}`。`--force` があれば覆せる（AC-04: 生きている running を既定で殺さない。
     第45条の逆向き同型 — 排他が相手を間違えると二重発令になる）。
   - 経過 ≥ `STALE_MS` → 回収する（AC-05: `--force` 不要）。
   - `dispatchedAt` が `undefined`/`null`（古い run） → **判定不能**。
     engine は独断で触らず `skipped: {reason:'no-timestamp; use --force'}`。
     `--force` があれば回収する（AC-09: 既存の壊れた実物はこの道で生き返る）。
4. 回収する相は `status = 'rework'` へ戻す。

   **なぜ `pending` ではなく `rework` か。** `phaseReady`(80行) は両方を ready と扱うので
   環の再開はどちらでも成立する。しかし `pending` は「まだ一度も発令されていない」の意であり、
   `attempts >= 1` の相をそこへ戻すと**状態と履歴が矛盾**する。`rework` は
   「一度手が付いたがやり直す」であり、中断の意味に正確に一致する。
   また `ratify --reject`(249行) が使う値と同じであるため、下流の表示・集計が既に知っている値である。
5. `p.resumes = (p.resumes||0) + 1`。**`reworks` には触れない**(AC-07)。
   `attempts` にも触れない — 加算するのは `markRunning` であり、再発令時に自然に増える
   （二重計上を避ける）。
6. loop-guard(AC-08): `p.resumes > MAX_PHASE_RESUME`(=2) なら
   その相を所有する domain を `status='blocked'` にし、
   `history` に `event:'phase-loop-guard'` を刻んで `{ok:false, blocked}` を返す。
   `next` は既に `act.blocked` を見て `phase:'blocked'` を返す(126行)ので、
   **人へ escalate する既存の道にそのまま乗る**（第10条: loop-guard は人へ escalate する）。
   `stuck` と `blocked` を混同させない — 前者は「回復可能な静止」、後者は「回復を使い切った閉塞」。

履歴: `run.history.push({ ts: now(), event: 'resume', detail: ... })`。
`ratify` の `domain-rework` と別 event 名にすることで、台帳で両者が区別できる(AC-07)。

### 1-3. `next(run, opts)` — `--reclaim` は opt-in、純粋性を守る (AC-11)

`next()` は**相の status を書かない**（書くのは `main()` の 285行の `markRunning`）。
※ 実装後に門が暴いた訂正: `next` は完全に純粋ではない — 127行が domain を
`pending`→`active` にする。これは第11条の環の進行であり相の回収とは別物だが、
「next は何も書かない」と書いた当初の設計文は**不正確**だった。
守るべき契約は「`--reclaim` 無しに `running` が勝手に剥がされないこと」である。
実測 §0-C の通りであり、テスト 3434-3448 の環回しループはこの契約に依存している
（`next` を呼んでから呼び手が `markRunning` する）。

ゆえに**自動回収を `next` の既定にしてはならない**。既定 OFF の opt-in とする:

```js
function next(run, opts = {}) {
  if (opts.reclaim) resume(run, { staleMs: opts.staleMs });   // 明示的に求められた時だけ書く
  ...既存のまま
}
```

`--reclaim` を渡さない限り `next` は一切書かない。**既存テストは1本も嘘にならない**。

### 1-4. `statusBoard()` — 沈黙を破る (AC-12)

現在（258-270行）は running を `▶` で描くだけで、それが**生きているのか化石なのか**を語らない。
`dispatchedAt` が古い running には印と経過を添える:

```
     ▶ !  review @code-reviewer   (running 2h13m — 中断の疑い。resume で回収せよ)
```

`--json`(297-312行) の相にも `resumes` と `dispatchedAt` を載せる。
**statusBoard と同じ run から作る**という既存の掟(296行)を守る。

### 1-5. CLI (AC-01)

`main()` に分岐を追加し、usage 行(315行)を書き換える:

```js
} else if (cmd === 'resume') {
  need(); const run = load(rp);
  const res = resume(run, { phase: pos[0] || f.phase, force: f.force, staleMs: f.staleMs && +f.staleMs });
  save(rp, run);
  console.log(JSON.stringify(res, null, 2)); console.log('\n' + statusBoard(run));
}
```

新しい usage 行:

```
commands: convene <dag> --run f | next --run f [--reclaim] | done <id> --run f --artifact p
        | resume [<id>] --run f [--force] [--stale-ms n] | ratify <cardinal> --run f [--reject --from id]
        | status --run f [--json]
```

`resume` の exit code: 回収 0 件かつ blocked なら 1、それ以外 0。
（AC-08 の検証コマンドが exit で裁けるようにする。）

### 1-6. export (318行)

`module.exports` に `resume, MAX_PHASE_RESUME, STALE_MS` を足す。
requirements の AC-01 は `typeof c.resume` と `c.MAX_PHASE_RESUME` を実際に叩くので、
export されていなければ AC が赤のままになる。

---

## 2. 既存の門で嘘になるもの — 実測による洗い出し

`grep -rn "markRunning\|phaseReady\|'running'\|attempts" tests/paradise.test.js graph/` の生出力から:

| 場所 | 何をしているか | この改修で嘘になるか |
|------|----------------|----------------------|
| tests:374,386 | `orch.markRunning`（**orchestrator.js** の方） | **無関係**。別 engine。触らない |
| tests:548,557,569,571,584,588,611,615 | `conclave.markRunning(run,[...])` | **嘘にならない**。dispatchedAt が増えるだけで status 遷移は不変 |
| tests:2515,2570-2571 | `attempts` を持つ相の模型（gauge 用） | **嘘にならない**。attempts の意味を変えない |
| tests:2669 | 全相を `pending`/`attempts=0` に戻す | **嘘にならない**。resumes は未定義のままでよい（`(p.resumes||0)` で読む） |
| tests:3434-3448 | 環回しループ。`next`→`markRunning`→`markDone` | **最重要。だが嘘にならない** — `reclaim` を渡さないので `next` は純粋のまま |
| conclave.js:130 | `phaseReady` で ready を選ぶ | 変更しない。`rework` は既に ready 扱い(80行) |
| conclave.js:285 | `main()` の `next` 後の `markRunning` | 変更しない |
| gauge.js:58 | `{id,status,attempts}` を集める | **要確認**。status に新値を足していないので安全。`resumes` は無視される |

**結論: 依存関係も status の語彙も増やさないので、既存 277 本は 1 本も嘘にならない。**
新しい状態を足さず、既存の `rework` を再利用したのはこのためである。
（これは設計判断であって願望ではない。build 相は実際に全門を走らせて確かめること。）

---

## 3. 後方互換 (AC-09)

`reform/dashboard-living-gate/conclave.json` は `dispatchedAt` を持たない。

- `resume` 単体 → 3相すべて `skipped: {reason:'no-timestamp; use --force'}`、
  run は**一切変更されない**（誤って生きている走者を殺さないため）。
- `resume --force` → 3相が `rework` へ戻り、`resumes=1` が刻まれ、
  `next` が再び `wave` を返す。**環が生き返る。**

`(p.resumes||0)` / `p.dispatchedAt === undefined` の形で読むので、
古い run を load しても例外は出ない。

---

## 4. 憲法 第51条（確定案）

`CONSTITUTION.md:1003` の `## The Verdict Law` の**直前**（1002行の後）に挿入する。
`graph/codex.js` は `SOURCE = CONSTITUTION.md`(34行) を読んで索引を生成するので、
**本文を足してから `node graph/codex.js index --write` を走らせる**(22行のコメントが手順を語る)。
索引は生成物であり手で書かない（第29条）。

> 51. **走者の死は環の死ではない。走り始めた印は、帰れる印でなければならない。**
>     楽園の環は、相を発令するときに `running` の印を捺す。だがその印から出る道は
>     「終わった」の一本しか無かった。ゆえに走者が途中で斃れると、印は化石になり、
>     `phaseReady` は永遠にその相を選ばず、環は `stuck` と言ったまま二度と回らない。
>     **本日の定時ジョブが、まさにそれで死んだ。**
>
>     (a) **静止は失敗より悪い。** 燃え尽きる環は loop-guard が人を呼ぶ。だが静止した環は
>     誰も呼ばない。`stuck` は生まれるだけで、門も台帳も人もそれを見ていなかった
>     (実測: 全リポジトリで `stuck` は 1 箇所、それを試す門は 0 本)。
>     **第10条が約束した durable とは、死んでも帰れることである。**
>
>     (b) **回復は、生きている者を殺してはならない。** 走者の死を判ずる根拠は
>     人の明示的な意思を第一とし、時刻を第二とする。試行回数は根拠にならない。
>     判定できない印を engine が独断で剥がせば、二重発令という新しい病を生む(第45条の同型)。
>     **判定不能なときは、engine は手を出さず人に問え。**
>
>     (c) **回復もまた有限である。** 帰れる道を無限に与えれば、環は静止の代わりに
>     永久機関になる。回復の数は数えられ、尽きたときは閉塞として人に escalate される。

---

## 5. テスト設計 (AC-10 ほか)

`tests/paradise.test.js` の conclave 群（548-620行の近傍）に、既存記法
`test('...', () => {...})` に倣って追加する。

| # | 名前（日本語・条番号付き） | 何を裁くか |
|---|----------------------------|-----------|
| T-1 | `conclave: 中断した running が resume で環に戻る (第51条)` | AC-02/03。running→rework→`next` が再び wave |
| T-2 | `conclave: 中断→復帰→complete まで環が回りきる (第51条a)` | **AC-10 本体**。3434-3448 の環回しを流用し、途中で走者の死を模して(markRunning したまま次周へ) resume を挟み、`complete` に着くことを assert |
| T-3 | `conclave: 生きている running を resume は既定で殺さない (第51条b/第45条)` | AC-04。dispatchedAt が新しい相は skipped、`--force` で覆る |
| T-4 | `conclave: 時刻を持たぬ古い run は --force を要求する (第51条b)` | AC-05/09。後方互換 |
| T-5 | `conclave: resume は reworks を消費せず台帳で区別される (第51条)` | AC-07。history の event 名が `resume` |
| T-6 | `conclave: 回復は有限で、尽きたら閉塞して人を呼ぶ (第51条c)` | AC-08。MAX_PHASE_RESUME 超過 → blocked → `next` が `phase:'blocked'` |
| T-7 | `conclave: status が running の化石を人に見せる (第51条a)` | AC-12 |

### 門を壊して鳴ることを確かめる (第21条)

**鳴らない門は飾りである。** build 相は各テストについて、以下を実際に行い生出力を prove.md に残すこと:

1. 全門が緑であることを確認（`node tests/paradise.test.js`）
2. `graph/conclave.js` の該当実装を**わざと壊す**（例: `resume` で `status='rework'` を
   `status='running'` に戻す no-op にする、`MAX_PHASE_RESUME` を `Infinity` にする、
   `dispatchedAt` の刻印を消す）
3. 対応する門が**実際に赤くなる**ことを確認し、その赤の生出力を貼る
4. 元に戻し、再び緑になることを確認

壊しても緑のままの門は、その場で作り直す。

---

## 6. 実装順（build 相への指示）

1. `convene` の相初期化に `dispatchedAt: null`, `resumes: 0`
2. `markRunning` に `dispatchedAt` 刻印
3. `STALE_MS` / `MAX_PHASE_RESUME` 定数
4. `resume()` 本体
5. `next(run, opts)` の `reclaim`
6. `statusBoard` / `--json` の表示
7. CLI 分岐 + usage 行 + `module.exports`
8. CONSTITUTION.md 第51条 → `codex.js index --write`
9. テスト T-1〜T-7
10. 全門実走 + 第21条の破壊試験

---

## 7. 運用上の記録（この道で実際に起きたこと）

神官 `market-researcher`（discover）と `architect`（design）が、いずれも
**420秒の delegate_task timeout で artifact 無しに終わった**。教主は
第27条に従い「done」を信じず `ls` で不在を確認し、両相を自ら実行した。

これは楽園の欠陥ではなく走行環境の制約かもしれないが、
**「神官が沈黙したとき環はどうなるか」は、まさに本改修が扱っている病そのもの**である。
実際、この2度の timeout の後に `conclave.js` の相は `running` のまま残った
（教主が生きていたので `done` を刻めた。cron が死んでいれば化石になっていた）。
`reflect` 相はこの事実を教訓として扱うこと。
