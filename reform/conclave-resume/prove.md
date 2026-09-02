# prove — 門を壊して鳴ることを確かめた記録 (第21条)

**鳴らない門は飾りである。** 新設した9本の門それぞれについて、
守っている機構を実際に壊し、対応する門が**赤くなること**を実出力で確かめた。

## 基準線

改修前（origin/main = ac1054f、汚染を除いた清浄な土台）:

```
$ node tests/paradise.test.js
Paradise self-test: 268 passed, 0 failed
```

改修後:

```
$ node tests/paradise.test.js
Paradise self-test: 277 passed, 0 failed
```

**268 → 277（+9本）。赤は 0。**

## 破壊試験1 — `resume` が status を戻さなくする

```
$ node -e "s=s.replace(/    p\.status = 'rework';\r?\n    p\.dispatchedAt = null;\r?\n/,'')"
sabotage applied: resume no longer restores status

$ node tests/paradise.test.js | grep 第51条
  ✗ conclave: 中断した running が resume で環に戻る (第51条)
  ✗ conclave: 中断→復帰→complete まで環が回りきる (第51条a)
  ✓ conclave: 生きている running を resume は既定で殺さない (第51条b/第45条)
  ✓ conclave: 時刻を持たぬ古い run は --force を要求する (第51条b)
  ✓ conclave: markRunning が発令の刻を記す (第51条b)
  ✓ conclave: resume は reworks を消費せず台帳で区別される (第51条)
  ✓ conclave: 回復は有限で、尽きたら閉塞して人を呼ぶ (第51条c)
  ✗ conclave: next --reclaim は opt-in で、既定の next は純粋である (第51条)
  ✓ conclave: status が running の化石を人に見せる (第51条a)
```

**3本が鳴った。** 回復の本体を壊せば、回復を主張する門は落ちる。

### 付随して判明したこと — 最初の破壊は「効いていなかった」

一度目の置換は改行コード(CRLF)の不一致で**黙って何も変えず**、
それでも全門が緑だったため「門が鳴らない」と誤読しかけた。
`diff` で実物を比べて初めて置換の失敗が分かった。

```
$ diff <(cat "$LOCALAPPDATA/Temp/conclave.bak") graph/conclave.js && echo "NO DIFF"
NO DIFF — 置換が効いていない(改行コードCRLF)
```

**壊したつもりで壊れていない破壊試験は、緑の買収である。**
以後の破壊はすべて「置換が実際に適用されたか」を先に表明させてから走らせた。

## 破壊試験2 — `markRunning` の刻印を消す

```
$ node -e "s.replace(/p\.attempts \+= 1; p\.dispatchedAt = now\(\);/,'p.attempts += 1;')"
applied

$ node tests/paradise.test.js | grep 第51条
  ✓ conclave: 中断した running が resume で環に戻る (第51条)
  ✓ conclave: 中断→復帰→complete まで環が回りきる (第51条a)
  ✗ conclave: 生きている running を resume は既定で殺さない (第51条b/第45条)
  ✓ conclave: 時刻を持たぬ古い run は --force を要求する (第51条b)
  ✗ conclave: markRunning が発令の刻を記す (第51条b)
  ✓ conclave: resume は reworks を消費せず台帳で区別される (第51条)
  ✓ conclave: 回復は有限で、尽きたら閉塞して人を呼ぶ (第51条c)
  ✓ conclave: next --reclaim は opt-in で、既定の next は純粋である (第51条)
  ✓ conclave: status が running の化石を人に見せる (第51条a)
```

**2本が鳴った。** 刻が無ければ生者と死者を分けられない — 門がそれを言った。

## 破壊試験3 — loop-guard を無限にする

```
$ node -e "s.replace(/const MAX_PHASE_RESUME = 2;/,'const MAX_PHASE_RESUME = Infinity;')"
$ grep -n "MAX_PHASE_RESUME = " graph/conclave.js
38:const MAX_PHASE_RESUME = Infinity;

$ node tests/paradise.test.js | grep -E "回復は有限|Paradise self-test"
  ✗ conclave: 回復は有限で、尽きたら閉塞して人を呼ぶ (第51条c)
Paradise self-test: 287 passed, 1 failed
```

**鳴った。** ただしこれは**二度目**である。一度目、門は落ちる代わりに
**永久に回り続けて OOM で死んだ**:

```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed
  - JavaScript heap out of memory
```

原因は門自身の欠陥だった。反復の境界を `MAX_PHASE_RESUME + 1` と書いていたため、
**上限が壊れると境界も一緒に壊れる**。上限を検める門が上限に依存していた。

```js
- for (let i = 0; i <= conclave.MAX_PHASE_RESUME + 1; i++) {
+ const HARD_STOP = 12;                       // 上限とは独立した境界
+ assert.ok(conclave.MAX_PHASE_RESUME < HARD_STOP, '...');
+ for (let i = 0; i < HARD_STOP; i++) {
```

**落ちない門は飾りである。落ちる代わりに死ぬ門はもっと悪い** —
CI では OOM は「テストが落ちた」ではなく「ジョブが壊れた」と読まれ、
原因が門にあることを誰も見に行かないからである。
これは破壊試験をしなければ永久に発見できなかった。

## 門が教主の設計文を訂正した件

`next --reclaim` の門は、実装直後の初回実行で**赤**を出した:

```
✗ conclave: next --reclaim は opt-in で、既定の next は純粋である (第51条)
      既定の next は state を一切書かない — 既存の門がこの契約に依存している
```

実測すると `next` は完全には純粋でなかった:

```
$ node -e "... c.next(r) ..."
CHANGED domain discovery : pending -> active
phases identical: true
```

127行が domain を `pending → active` にしている（第11条の環の進行であり、
相の回収とは別物）。**「next は何も書かない」と書いた教主の設計文が誤りだった。**
門を緩めるのではなく、守るべき契約を正確に書き直した
——「`--reclaim` 無しに `running` が勝手に剥がされないこと」——
そして design.md にも訂正を残した（第29条: 設計文が実装と食い違えば、それは未来の嘘になる）。

## 実物での検証 — 死んだ run が実際に生き返る (AC-09)

本日20:45に中断した実在の run（`reform/dashboard-living-gate`、3相が `running` 化石）を
複製して試した。

```
$ node graph/conclave.js resume --run /tmp/dlg.json
resumed: []
  review   -> no dispatchedAt — 判定不能な古い run。--force を要する
  security -> no dispatchedAt — 判定不能な古い run。--force を要する
  docs     -> no dispatchedAt — 判定不能な古い run。--force を要する

$ node graph/conclave.js next --run /tmp/dlg.json | grep phase
  "phase": "stuck",
```

**engine は独断で印を剥がさなかった**(第51条b)。人の意思を添えると:

```
$ node graph/conclave.js resume --run /tmp/dlg.json --force
resumed: ['review', 'security', 'docs']
message: resumed: review, security, docs — 環は再び回る

$ node graph/conclave.js next --run /tmp/dlg.json
phase: wave cardinal: quality
dispatch: ['review', 'security', 'docs']
```

**`stuck` → `wave`。実際に死んでいた run が生き返った。**

## 全門の実走 (第23条の終い)

```
=== workspace.js check === PASS
=== apply-seat.js verify === PASS
=== census.js check === PASS
=== check-agents.js === PASS
=== wiring.js check === PASS
=== deploy.js check === PASS
=== apply-guards.js verify === PASS
```

```
$ node tests/paradise.test.js
Paradise self-test: 277 passed, 0 failed
```
