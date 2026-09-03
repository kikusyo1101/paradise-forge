# 達成できなかったこと — 次のセッションへの宿題

> **2026-09-03 10:40 更新(第三幕の教主)**
> 神が「セッションが長い。引き継げ」と判じたため、**区切りをつけて渡す**。
> 前二幕の記録は git 履歴に残る(`git log -- reform/dashboard-living-gate/UNFINISHED.state.md`)。

---

## 0. 現況 — 二つの道が神の御手を待ち、一つが道半ばで止まっている

```
PR #35   https://github.com/kikusyo1101/paradise-forge/pull/35
         第51条(走者の死は環の死ではない)の散文9ファイル。engine 差分ゼロ。
         前幕が未commitのまま残していたものを救出した。

ブランチ reform/spawn-trace-by-the-road   push 済み・PR 未提出
         最終コミット a90d3f5
         環: 6ドメイン中 4批准(discovery/requirements/architecture/construction)
         quality 相の途中で神の停止命令により中断
```

**自己診断(単独走行で実測):**
```
$ node tests/paradise.test.js
Paradise self-test: 306 passed, 0 failed      (main は 290 — +16本)
$ node graph/census.js check
✓ every number the paradise claims about itself is true
```

---

## 1. 片づいた宿題(前幕が残した3件のうち1件)

| # | 宿題 | 結果 |
|---|---|---|
| — | **spawn-trace の証跡欠落**(最重・神託の一手) | **engine に実装済み**(§2)。ただし環は未完 |
| X-2 | 断面の `runs[].path` が絶対パス5件 | **未着手** |
| F-5 | `pulse.js:469` の `thresholds` が消費者ゼロ | **未着手** |

---

## 2. spawn-trace — 何を建てたか

神託が名指した穴:**「記録を呼ばなくても環が回りきる構造の穴」**。
実測すると想定より深かった —— production で `record` を呼ぶ箇所は**ゼロ**、
`conclave.js` は `spawn-trace` を **require すらしていなかった**。

| 建てたもの | 実測 |
|---|---|
| **`graph/trace-harvest.js` 新設**(376行) | 2系統を走査。`sources 2 / claude-jsonl 7件 / hermes 51件`。**実際に教主自身の発令 `deleg_90c48256`(design)と `deleg_c7d4a770`(build)を機械が拾った** —— 環が自分の足跡を読めるようになった |
| `markDone` が証跡を検める | `REJECTED: 相 "discover" を done にできない — 起動の証跡が no-trace である` exit 1 |
| 棄権路 `--no-trace-reason` | `""` `n/a` `ok` を全て拒否(最小20文字)。3件超で domain `blocked` |
| 四値化 + legacy 第五値 | `observed / asserted-only / waived / no-trace / legacy`。`ok` と `clean` を分離 |
| `contract.js` の素通りを塞ぐ | CLI が `--run` を受け、`traceChecked` を必ず名乗る |
| 門 282 → 298本 | うち spawn-trace の門 5 → 21本 |

### 実測で判明した重要な事実 — 憲法 第27条が引く鍵は実機に無い

```
$ (8,986行を走査)
parentToolUseId occurrences: 0            ← 憲法が「唯一確実」と呼ぶ名は実在しない
distinct toolUseResult.agentId: 7         ← 別名の鎖は実在する
child logs on disk: 7                     ← 7/7 実在
```

**必須にすれば永久に赤い門になる**(第16条)。ゆえに `observed` の条件は
実測できた鎖(`agentId`→子ログ / `async_delegations`)に置き、
`parentToolUseId` は**十分条件の一つ**に留めた。

> **憲法 第27条の本文は訂正していない。** engine のコメントのみ実測に合わせた。
> 条文の訂正は次幕の判断に委ねる(reform の道を通すべき案件である)。

---

## 3. 残る宿題(優先順)

### 【最優先】D17/D18 — 嘘の緑を刻めるのに門が鳴らない疑い

中断された code-reviewer が 22通りの破壊を回し、**8件が「鳴らず」**と報告した。
詳細と反証は `reform/spawn-trace-by-the-road/review-partial.md`。

**ただしその表をそのまま信じてはならない** —— 基準線が `20p/1f` と汚染されており、
**D12/D16 は教主の台では実際に鳴った**。同じ破壊が台によって結果を変えている。

それでも次の 4 件は**教主が自分の手で検証していない**。憶測で緑と呼ばない:

| # | 疑い |
|---|---|
| **D17** | 階梯B(時刻窓・役割名の示唆)を自動で `observed` に刻んでも鳴らないのでは |
| **D18** | 候補2件以上の曖昧な相でも刻む道が塞がれていないのでは |
| D14 | 子ログ実在検査を外しても鳴らないのでは |
| D20 | 階梯A のパス一致規則を殺しても鳴らないのでは |

**D17/D18 が本物なら、採取器は自分で穴を開けられる。**
`design.md §3.3` が最も強く禁じた境界が、門に守られていないことになる。
**嘘の緑は no-trace より悪い**(第5条)。

打ち方:
```
1. 単独走行を確保(則E)。他の破壊台 pd-brk / pd-probe / pd-bs を先に片づける
2. 破壊が「効いたか」を実物で先に確かめる(grep -c → 振る舞い1コマンド → それから門)
3. D17/D18/D14/D20 を1件ずつ単独で走らせる
```

### 【安全】security.md が書かれていない — **未検査**である

security-reviewer は中断され、成果物を残していない。
**「安全」と偽っていないが、測っていない。** 特に次が未検査:

- 採取器が run に書き込む値に、会話ログ本文や絶対パスが混入しないか
  (混入すれば git にコミットされ PR で公開される。**X-2 と同型の穴**)
- 会話ログは攻撃者が制御しうる文字列である。それが run → dashboard に届いたとき XSS にならないか
- `listJsonl` の symlink 追従

### 【環】quality / tribunal 相が未走 → PR 未提出

環は 4/6 で止まっている。`review` `security` `docs` `verify` `reflect` `verdict` が残る。

### 【積み残し】X-2(絶対パス5件)/ F-5(死んだ thresholds)

前幕からの持ち越し。未着手。

---

## 4. この第三幕で学んだこと

### 則D がまた効いた —— そして今度は逆向きだった

第二幕は「**壊したつもりで壊れていない破壊は緑の買収**」だった。
第三幕で起きたのはその裏面である:

**壊れていない破壊が「門が鳴らない」という偽の赤信号を生んだ。**

教主自身も破壊試験の4度目で的を外し、`contract.js:55` の**保険の行だけ**を消して
「鳴らない」と読みかけた。本体は `:105` にあった。
**同じ値が二箇所に書かれていれば、片方を壊しても振る舞いは変わらない。**

> **破壊試験は「値の出所」ではなく「観測される振る舞い」を狙え。**
> 赤も緑も、まず自分の測り方を疑え。

### 教主は自分の門を自分で騙しかけた

`prove` 相(破壊試験)は教主が自らの手で行ったのに、
`spawn-trace record --agent tdd-guide` と **`observed` で刻んだ**。
自分が建てたばかりの門を、自分で欺いたことになる。

気づいて `waived`(理由付きの棄権)へ書き換えた:

```
BEFORE: kind: "observed", agent: "tdd-guide"
AFTER : kind: "waived", agent: "(教主自身)",
        reason: "破壊試験は教主が自ら4度行った。神官へ委譲していないので観測ではない"
```

**第27条「subagent の done を信じない」は、記録する者自身にも向く。**
これは第二幕が X-1 で学んだことの再演である —— 同じ穴に、違う顔で落ちかけた。

### 赤を見たら並行走行を疑え(則E の実証)

`atlas` 系の門2本が赤くなった。実測で切り分けた:

```
並行走行時: 304 passed, 2 failed
単独走行時: 306 passed, 0 failed      ← 本改修は無罪
base(main): 290 passed, 0 failed
```

**ブラウザを使う門は単独で走らせる。** 前幕が則E として残した通りだった。

---

## 5. 作業場の後始末(次幕への申し送り)

破壊試験で切った worktree が残っている。**次幕は最初にこれを片づけてから測れ**:

```
C:/Users/kikus/AppData/Local/Temp/pd-brk       (detached 6001274)
C:/Users/kikus/AppData/Local/Temp/pd-bs        (detached 5587b76)
C:/Users/kikus/AppData/Local/Temp/pd-probe     (神官の破壊台)
C:/Users/kikus/AppData/Local/Temp/pd-ship      (PR #35 用)
C:/Users/kikus/AppData/Local/Temp/pd-trace     (本体・reform/spawn-trace-by-the-road)
C:/Users/kikus/AppData/Local/Temp/pd-verdict   (前幕の残骸)
```

`git worktree list` で確認し、`git worktree remove` で掃く。
**残骸の上で測れば、また偽の赤を読む。**

中断された神官の生の走行記録:
```
C:\Users\kikus\AppData\Local\hermes\cache\delegation\live\deleg_41253b63\task-0.log
C:\Users\kikus\AppData\Local\hermes\cache\delegation\live\deleg_41253b63\task-1.log
```

---

## 6. 次に手を付けるなら

```
1. 【最優先】作業場を掃く → 単独走行を確保 → D17/D18/D14/D20 を1件ずつ検証
             本物なら engine を直し、門を建てる。偽なら review-partial.md に反証を追記
2. 【安全】  security.md を書く — 特に「採取器が run に何を書くか」
             (会話ログ本文・絶対パスの混入は X-2 と同型の穴)
3. 【環】    quality → tribunal を回し、PR を出す
4. 【積残】  X-2 / F-5
5. 【条文】  憲法 第27条が引く parentToolUseId は実機に無い。
             reform の道で条文を実測に合わせるべきか判断する
```
