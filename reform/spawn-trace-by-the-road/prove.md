# 壊して鳴ることを確かめた — 破壊試験の生出力 (第21条)

> 鳴らない門は飾りである。教主が己の手で 4 度壊し、**何が鳴るか**を実出力で残す。
> 5 度目は**壊したつもりで壊れていなかった** —— それも隠さず記す(第37条)。

自己診断の基準値:

```
$ node tests/paradise.test.js
Paradise self-test: 306 passed, 0 failed
$ grep -c "^test(" tests/paradise.test.js
298                                   (改修前 282 → +16)
```

---

## 破壊1 — `markDone` の証跡検査を無効化する

**穴を元通り開ける**改変。`graph/conclave.js`:

```diff
-      if (!(v.state === 'observed' || v.state === 'waived')) throw new Error(traceGateMessage(id));
+      if (false) throw new Error(traceGateMessage(id));
```

```
$ git diff --stat graph/conclave.js
 graph/conclave.js | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)     ← 改変が実際に効いている

$ node tests/paradise.test.js
Paradise self-test: 305 passed, 1 failed
  ✗ spawn trace: 証跡ゼロの走行は complete へ到達できない (第27条/第50条)
```

**鳴った。** これが神託が名指した穴そのものを見張る門である。
この門は**証跡を一つも刻まない**ように書いてある —— 刻めば穴の手前しか見なくなる。

---

## 破壊2 — 採取器が系統IIを名乗らなくする

「片方の系統しか見ない engine」に退行させる改変。`graph/trace-harvest.js`:

```diff
-    const r = scanDelegations(dbPath); sources.push(r.src); entries.push(...r.entries);
+    const r = scanDelegations(dbPath); entries.push(...r.entries);
```

```
$ node tests/paradise.test.js
Paradise self-test: 304 passed, 2 failed
  ✗ spawn trace: 採取器は二系統を必ず名乗る — 片方が使えなくても要素を消さない (M1/第44条)
  ✗ spawn trace: 拾えなかったときに黙って壊れない — harvest-blind は 0 でも 1 でもない (第50条d)
```

**2本鳴った。** 第45条の病(engine が片方しか見ず、自分が呼んだ者を締め出す)を
門が構造で拒んでいる。

---

## 破壊3 — 棄権を緑に数える

`waived` を `observed` と同じ色にする改変。`graph/spawn-trace.js`:

```diff
-    clean: rows.length > 0 && of('observed').length === rows.length,
+    clean: bypassed.length === 0,
```

```
$ node tests/paradise.test.js
Paradise self-test: 304 passed, 2 failed
  ✗ spawn trace: 棄権のみの走行は ok:true だが clean:false であり、沈黙で通らない (M4/AC-4.2)
  ✗ spawn trace: legacy run は壊れず、緑とも赤とも名乗らない (M7/AC-7.1,7.2)
```

**2本鳴った。** 「通した」と「観測した」を同じ色にすれば、
**棄権の多さという次の改善対象そのものが不可視になる**。門がそれを拒む。

---

## 破壊4 — **効かなかった破壊**(隠さず記す)

一度目、`graph/contract.js:55` の**保険の行だけ**を消した:

```diff
-  if (rec && rec.traceChecked === undefined) rec.traceChecked = !!(opts && opts.run);
+  // sabotage: traceChecked を名乗らない
```

```
$ node tests/paradise.test.js
Paradise self-test: 306 passed, 0 failed        ← 一本も鳴らない
```

ここで「門が鳴らない」と読むのが**則D の罠**である。実物を測った:

```
$ grep -c "rec.traceChecked = " graph/contract.js
0                                                ← 改変は効いている

$ echo '{"phase":"discover","status":"done","artifact":"CONSTITUTION.md"}' | node graph/contract.js check
{
  "accepted": true,
  ...
  "traceChecked": false                          ← まだ名乗っている
}
```

**壊れていなかったのは engine ではなく、私の破壊の狙いである。**
`traceChecked` は二重に書かれており、`:55` は保険、本体は `:105` の return 文だった。
保険だけ外しても振る舞いは 1 ミリも変わらない。

### 破壊4' — 本体も壊す

```diff
-    verified: 'file', size, traceChecked: false };
+    verified: 'file', size };
```

(`:55` の保険と併せて両方を外した)

```
$ echo '{...}' | node graph/contract.js check | grep -c traceChecked
0                                                ← 今度こそ名乗らない

$ node tests/paradise.test.js
Paradise self-test: 305 passed, 1 failed
  ✗ spawn trace: contract の CLI は run 無しで証跡を照合したと名乗らない (第37条)
```

**鳴った。** そしてこの門は**実 CLI を子プロセスで起動している** ——
module を直に呼べば「CLI に口が無い」という欠陥そのものを跨いでしまうからである。

---

## 復元の確認

4 度の破壊すべてから戻したことを実測で示す:

```
$ git diff --stat
(空)
```

---

## この破壊試験が残した教訓

| # | 教訓 |
|---|---|
| 1 | **緑を見ても「門が鳴らない」と即断しない。** まず破壊が効いたかを実物で測る(則D の裏面) |
| 2 | **同じ値を二箇所に書けば、片方を壊しても振る舞いは変わらない。** 破壊試験は「値の出所」ではなく「観測される振る舞い」を狙え |
| 3 | **CLI の欠陥は CLI を起動しなければ捕らえられない。** module を直に呼ぶ門は「口が無い」を跨ぐ |
| 4 | **穴を見張る門は、穴の手前で証跡を刻んではならない。** 刻めば門自身が穴を埋めてしまい、二度と鳴らない(現行の旧5本がまさにこれだった) |
