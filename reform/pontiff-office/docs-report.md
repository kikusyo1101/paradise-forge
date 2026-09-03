# docs 相 — 散文を現況へ (reform の道 第8相)

第52条(教主の手は最後の手段である)を建てた本PRに対し、**散文と生成物だけ**を現況へ合わせた。
engine のコードには一切触れていない。

---

## 1. README.md — engine 表

### 検め: `domains.js` / `ordain.js` は既に在ったか

```
$ git diff main...HEAD -- README.md
+| `graph/domains.js` | **役者は何を担えるか**。`domains.json` の台帳を読み、願いを分野へ写し、
   道が名指しする役者が分野を宣言しているか裁く。`check-agents`(実在)とは**別の問い**である —
   実在するだけでは足りない(第52条) |
+| `graph/ordain.js` | **役者の鍛造器**。`forge --write` が overlay の原本(agent 定義・overlay.json・
   COLLEGE・分野台帳)を1コマンドで揃える。**配備はしない** — 原本を書く器と実機に書く器は別である(第29条)。
   手編集0ファイル / 鍛造→`deploy --write`→`verify` の3工程 |
+| `graph/spawn-trace.js` | **起動の証跡と序列の門**。… `tiers` が数を語り、`tier` が事後に突合し、
   `audit` が全走行を監査する(第27条・第52条) |
-| `graph/forge.js` | … 産物の種別が道を決める(第49条) |
+| `graph/forge.js` | … `admit()` が分野の適合を裁き、担い手の居ない願いを既定の道へ黙って落とさない(第52条) |
```

**在った。** build 相(段12)が既に engine 表・試験数 (290→318) を直していた。
表の書式・条番号は既存に揃っており、`wiring.js` の実測とも一致する:

```
$ node graph/wiring.js | tail -5
  domains                  ←require  2  →require  3  呼ぶ面: 門(CI)/試験/散文/機構
  ordain                   ←require  0  →require  2  呼ぶ面: 試験/散文/機構
  spawn-trace              ←require  4  →require  1  呼ぶ面: 門(CI)/試験/散文/機構
────────────────────────────────
  engine 36 / 内の辺 51 / 孤児 0
```

`呼ぶ面` に **散文** が立っている = README が両 engine を名指ししていることを門が実測している。
孤児 0 — 新 engine 2本とも呼び手が居る。

### 直した箇所 (2つ)

**(a) 「テスト」節の検証内容が新機構を語っていなかった。** 試験数は 318 に直っていたが、
「何を検証しているか」の散文は第51条・第52条の追加を映していなかった。

```diff
-clergy/conclave（聖職位階・入れ子PDCA・ratify・domain rework）・synod（計画サイクル）。
+clergy/conclave（聖職位階・入れ子PDCA・ratify・domain rework・中断からの再開）・synod（計画サイクル）・
+domains/ordain（分野の適合・役者の鍛造）・spawn-trace（起動の証跡と**序列の門**・第52条）。
```

**(b) 「三権分立」節の CI が新しい2門を語っていなかった。** 本PRは `tribunal.yml` の verify job に
2本の門を足している:

```
$ git diff main...HEAD -- .github/workflows/tribunal.yml
+      - name: 👁 Tier audit — 序列の門が実在の走行を見る (第42条 / 第52条)
+        run: node graph/spawn-trace.js audit
+      - name: 🎭 Domains — 役者は担える分野を宣言しているか (第52条)
+        run: node graph/domains.js check
```

散文側は「self-test・憲法条文・位階別モデル方針・秘密スキャン・全エンジン読込」で止まっていた。

```diff
 機械ゲート (CI: verify job)        ← self-test・憲法条文・位階別モデル方針・秘密スキャン・全エンジン読込
+      ↓                              序列の監査・分野の適合も同 job（第52条）
```

**数は一つも写経していない。** 門の**本数**は書かず、門の**名**だけを書いた
(本数を書けば足すたび腐る — 第22条)。

---

## 2. CLAUDE.md — 第52条の序列を載せるか

### 判断: **序列の三段そのものは写経しない。載せるのは門が届かない一行だけ。**

判断基準は指示の通り「機械が強制していることは写経しない / 機械が強制できない判断則だけ載る」。
これを第52条の各項に当てて検めた。

| 第52条の内容 | 機械は強制するか | 出所 | 載せるか |
|---|---|---|---|
| 閾値 (files/churn/bytes) | **する** | `spawn-trace.js tiers` ただ一箇所 | **否** — 数の写経は第22条・第41条違反 |
| 序列3 の量的判定 | **する** | `trace.judge()` を `markDone` が呼び throw | **否** |
| 門相は序列3を名乗れない | **する** | `judge()` の `gate-tier3` (量より先に立つ) | **否** |
| 宣言なき done を拒む | **する** | `markDone` が throw、run は書き換わらない | **否** |
| 全走行の事後監査 | **する** | `spawn-trace.js audit` が CI に立った | **否** |
| **序列1 が既定である**という価値判断 | **しない** | — | **可** |
| **環を通さない手仕事**の扱い | **しない** | 門は `markDone` の中にしか無い | **可** |

最後の2行だけが機械の届かない場所である。門は `conclave.markDone()` の内側に立つ ——
つまり **環に載った相しか裁けない**。教主が環を通さず手を動かせば、門は鳴らずに素通りする。
第52条(e)が「宣言なき手仕事はただの無証跡である」と言うのは、まさにこの穴のことであり、
これは散文でしか塞げない。ゆえに一行だけ足した。

```diff
 4. **改善の主張は gauge の前後数値で** (第38条) — 測らなかった走行は改善を語れない。
+5. **既定は委譲。教主の手は最後の手段** (第52条) — 為す前に「担える役者が居るか」を
+   問う。門は**環の中でしか**序列を裁けない — 環を通さない手仕事は無証跡である。
```

「機械が強制できない判断則」節に置いた —— 節の名がそのまま載せる理由になっている。
条文の三段も閾値も書かない。**条番号を指すだけ**にしてあるので、
`codex.js article 52` を引けば全文に届く(第33条の地図の作法)。

### 肥らなかったことの検め (第39条・第40条)

```
$ wc -c CLAUDE.md
3054 CLAUDE.md          # 2814 → 3054 B (+240)、予算 4096 B

$ node -e "const c=require('./graph/census.js');console.log('budget',c.CLAUDE_MD_BUDGET);console.log(JSON.stringify(c.dietChecks()))"
budget 4096
[]
```

`dietChecks()` は空 — 予算超過も、数値の再侵入も無い。
削る必要は生じなかった (予算に 1042 B の余裕が残る)。数値を1つも足していないため
`VOLATILE_NUMBER_RES` の3本にも触れていない。

---

## 3. CONSTITUTION.INDEX.md — 再生成 (生成物・手編集禁止)

```
$ node graph/codex.js index --write
✍️  CONSTITUTION.INDEX.md を建てた (4218 B)

$ git diff --stat CONSTITUTION.INDEX.md
(差分なし)

$ node graph/codex.js check
═══════ 📖 CODEX CHECK ═══════
  ✓ 索引は本文と一致している (52 条)
══════════════════════════════
exit 0
```

**再生成しても差分ゼロ** = 段11 が条を建てた際に既に正しく生成されていた。
52条が索引に載っていることを確認:

```
| 51 | 走者の死は環の死ではない。走り始めた印は、帰れる印でなければならない。 | 2048 |
| 52 | 教主の手は最後の手段である。その範囲は名乗りではなく実測が決める。 | 2563 |
```

見出しも `全 52 条 / 本文 77,868 B` へ更新済み。手編集は一切していない(第29条)。

---

## 4. dashboard — 新 engine と条を映すか

```
$ node graph/export-state.js
state exported -> …\dashboard\state.json  (+ state.js)  (nodes:106 edges:33 lessons:72 creations:7)
EXIT=0
```

**壊れていない。** 差分は KG ノード 99→106 (本PRで刻まれた教訓7件) と生成時刻のみ。

数の看板は `export-state.js` ではなく `pulse.js` の断面が出所である(第22条・第16条:
突合点は1つ)。断面を直に検めた:

```
$ node graph/pulse.js snapshot --json | (counts を抜粋)
{ "articles": 52, "engines": 36, "cardinals": 7, "creations": 7,
  "runs": 5, "agents": 30, "commands": 19, "skills": 13,
  "kgNodes": 106, "kgEdges": 33, "lessons": 72 }
errors: []
```

- **条 52** — 第52条が映っている(`codex` 由来)。
- **engine 36** — `domains.js` `ordain.js` を含む実測(`fs` 由来、`wiring` の 36 と一致)。

画面側に写経は無いことを確認済み — `dashboard/paradise.js` は `snap.counts[k]` を
そのまま描くだけで、固定値を持たない。ゆえに **散文の修正は不要**だった。

ダッシュボードの門も緑:

```
$ node tests/dashboard-count.test.js
dashboard-count: 15 passed, 0 failed        # 「画面の数 == その場で数えた数」
$ node tests/dashboard-no-hardcode.test.js
dashboard-no-hardcode: 8 passed, 0 failed   # 「数の看板に固定値が 1 つも無い」
```

pulse の門 5本もすべて ok (`wiring` `vendor` `derived` `check-agents` `workspace`)、
`errors: []` — 測れなかった鍵も無い。**報告すべき破損は無い。**

---

## 5. 終わりの検め

```
$ node graph/census.js check
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
exit 0
```

(自己診断を丸ごと回すため約 5 分。`--no-tests` は使わず全数で回した。)

`census` が検める主張は README のテスト数 318 / vendor 各数 / ダッシュボード門数 13 の
10 本 + diet 門 4 本。**すべて緑** — 今回足した散文は数を一つも主張していないので、
新しい claim は生まれていない(それが狙いである)。

```
$ node graph/codex.js check
  ✓ 索引は本文と一致している (52 条)
exit 0
```

```
$ node tests/paradise.test.js
  ✓ 第52条: 序列1/2 は起動の証跡を要求する (AC-A2 / AC-A3)
  ✓ 第52条: 序列1の緑の側 — 起動を観測したら通る (AC-A4)
  ✓ 第52条: 門相は序列3を名乗れない — 量が小さくても許さない (AC-A7 / 第9条)
  ✓ 第52条: 序列3を名乗りながら起動していれば食い違いが鳴る (AC-A8)
  ✓ 第52条: 序列3の緑と赤 — 判定は実測が下し、名乗りが下さない (AC-A5 / AC-A6)
  ✓ 第52条: 環と器は同じ run に同じ判定を下す (第27条)
  ✓ 第52条: 移行 — legacy は黄で通り、verify は黄を緑にしない (AC-A10 / AC-A13)
  ✓ 第52条: 五値の集計 — 序列3と unobservable は別の数である (AC-A12)
  ✓ 第52条: audit は何も見ずに緑を出さない (AC-A11)
  ✓ 第52条: 秤は序列を測り、過去の台帳を書き換えない (AC-H1〜H4)
  ✓ 第52条: 前後比較に教主の手の割合が含まれる (AC-H5)
  ✓ 役者の居ない仕事は道に入れない (第49条)
  ✓ 第52条: 実在だけでは足りない — 二つの門が違う答えを出す (AC-C7)
  ✓ 鍛造器は原本に書き、配備器だけが実機に書く (第29条)
  ✓ 鍛造器は不完全な要求を鍛造の時点で拒む (第52条 / AC-D5)
  ✓ 鍛造器は既存の門を撃つ — 増やせば図が壊れるなら増やせていない (AC-D4 / 第47条)
  ✓ 鍛造器が実際に産んだ役者は既存の発令を乗っ取らない (AC-D4 / AC-D7)
  ✓ 第52条: 序列3の例外は**実測経路**で通る — 合成した数ではなく (AC-A5 / 完了条件⑦)
  ✓ 第52条: 序列3の閾値は「以下」である — 境界ちょうどは通り、1つ超えれば鳴る
  ✓ CI の序列の門は実在の走行を見る (第42条)

Paradise self-test: 318 passed, 0 failed
exit 0
```

**318 passed, 0 failed** — README の `# 318/318 pass` と一致する。
一致は目視ではなく `census check` が突合している(上の節)。

---

## 三門まとめ

| 門 | 結果 |
|---|---|
| `node graph/census.js check` | **exit 0** — ✓ every number the paradise claims about itself is true |
| `node graph/codex.js check` | **exit 0** — ✓ 索引は本文と一致している (52 条) |
| `node tests/paradise.test.js` | **318 passed, 0 failed** |


---

## 触った物 / 触らなかった物

| ファイル | 種別 | 何を |
|---|---|---|
| `README.md` | 散文 | テスト検証内容に domains/ordain/spawn-trace/再開を追記。CI 図に序列・分野の門を追記 |
| `CLAUDE.md` | 散文 | 判断則に第52条の一行(+240 B、予算内) |
| `CONSTITUTION.INDEX.md` | 生成物 | `codex.js index --write` で再生成 → 差分ゼロ(既に正) |
| `dashboard/state.json` `state.js` | 生成物 | `export-state.js` で再生成(KG 99→106) |
| `graph/*.js` | — | **一切触れていない** |

## 写経しなかったもの (第22条の遵守)

- 序列の閾値 (files ≤ 2 / churn ≤ 50 / bytes ≤ 4096) — 出所は `spawn-trace.js tiers` のみ
- CI に足した門の本数 — 名だけ書いた
- engine の総数・条の総数 — `pulse` の断面と `codex index` が語る
- CLAUDE.md への数値は 0 件 (`dietChecks()` が実証)
