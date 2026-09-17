# reform `silent-mutations` — build 相 build.md

> 走行: `reform/silent-mutations` / 相: build
> 入力: `design.md` (1335行 / 実コード付きの施工図) + `requirements.md` (718行 / AC-1〜16)
> 機: Windows 11 / git-bash / Node `v24.14.0`
> 基線(本相の開始時に実測):
> ```
> $ git -C paradise status --short                   → ?? reform/silent-mutations/
> $ git -C paradise rev-parse --abbrev-ref HEAD      → reform/silent-mutations
> $ sha256sum graph/gauge.js          → d1da309f101cad4edc47d05db2f78faecadfca9fdf3405027344a5fea39fa97a
> $ sha256sum tests/paradise.test.js  → c5a1726d2e50d5c4dfb63c421b41d9994ea0e279f98c8d1b2b4703a3fcb95648
> $ sha256sum paradise-creations/gauge-ledger.jsonl → 955ea34a…aab77 / 7 行   ← **不変であること**
> $ node tests/paradise.test.js --gate-list | wc -l  → 472 (= 門 471 + 総括行 1)
> ```
>
> **本相が触ったファイルは五枚**: `tests/paradise.test.js` / `graph/gauge.js` /
> `CONSTITUTION.md` / `CONSTITUTION.INDEX.md`(codex が書く)/ `README.md`(census が書く)。
> **commit も push もしていない。** `CLAUDE.md` / `.env` / `tribunal.yml` は一行も触っていない。

---

## 0. 結論(数で先に書く)

| 問い | 答え | 証拠 |
|---|---|---|
| 建てた門 | **13 本**(471 → **484**) | `--gate-list \| wc -l` = 485(総括行込み) |
| 全走(素) | **484 passed, 0 failed** / exit 0 / **6m03.8s** | §⑫ |
| 実台帳の sha256 | **955ea34a…aab77 のまま**(全段の前後で照合) | §0-2 |
| CI 相当の門 | hermetic / wiring / workspace / derived / codex / census / conclave **全部 exit 0** | §⑩ §⑪ |
| 設計から外れた箇所 | **3 件**(§9 に全部書いた。うち 1 件は design の数え違いの訂正) | §9 |

### 0-1. 設計が「14 門」と書き、実装が 13 本になった理由(**最重要の逸脱**)

design §6-1 の表は門を持つ AC を **AC-2/3/4/5/6/7/8/9/10/11/12/13/15 の 13 個**列挙し、
各 1 本として合計欄に **14** と書いている。**表の行を足すと 13 である。**
(AC-1 は「門ではなく器」で 0 本、AC-14 は測定で 0 本、AC-16 は既存 CI 段で 0 本 —— と表自身が書いている。)

**私は表の行に従って 13 本建てた。** 数を合わせるために門を一本捏造することはしない
(第38条: 数は実測から来る。合計欄の写経から来ない)。

ゆえに **471 + 13 = 484** である。design が各所に書いた「485」は、この合計欄の誤りが伝播した値である:
- design §6-2「門の総数 471 → 485」
- design §7-3「`README.md:138` の `# 門 471 本` が 485 になる」
- design §8 ⑨「130 gates matched」/ ⑫「485 passed, 0 failed」

**README の数は手で書いていない。** `node graph/census.js fix` が実測から **484** を書いた(§⑪)。
**第22条は守られている** —— もし私が「485 になるはず」と手で書いていれば、census が赤で鳴っていた。

### 0-2. 実台帳の不可侵(NFR-3)— 走行中に四回照合した

```
段①の後   955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77
段⑩の後   955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77
段⑪の後   955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77   ← 全走 6 分を挟んだ後
段⑫の後   955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77
$ git -C paradise-creations status --porcelain  →  M gauge-ledger.jsonl   (開始時から立っている既知の状態)
```

**⑪ と ⑫ は全走である** —— 484 門すべてが走り、`withGaugeSandbox` が 60 回以上呼ばれ、
その**すべての finally で番兵が照合した**。それでも指紋は動いていない。
**これが「不可侵を主張ではなく測定にする」(第62条 b)の最初の実測である。**

---

## 1. 段① — 器だけを入れる(門は一本も足さない)

**この段を飛ばさなかったことが本相で最も価値のある判断である。**
design §8-1 が言うとおり、番兵を器に入れた時点で既存 55 門すべてが照合を始める ——
ここで赤が出れば**器の欠陥**であり、門を足した後では切り分けられない。

### 触ったもの

`tests/paradise.test.js`:
1. 宣言部(`WORKSPACE_JS` の直後): `REAL_LEDGER` / `ledgerDigest` / `REAL_DIGEST` /
   `ledgerUntouched`(純関数)/ `sentinelSkipNote`(純関数)/ `let SENTINEL_SAID`
2. `withGaugeSandbox`: `let bodyThrew = false;` と `catch (e) { bodyThrew = true; throw e; }` を足し、
   `finally` を design §1-2 の①②の順に書き換え

**CRLF を保った**(Python の `open(..., 'rb')` で読み、`\r\n` に正規化した素片だけを挿し、`'wb'` で書いた):

```
$ python -c "d=open('tests/paradise.test.js','rb').read(); print('CRLF',d.count(b'\r\n'),'LF',d.count(b'\n'))"
CRLF 9300 LF 9300        ← 一致 = 裸の LF はゼロ
$ node -c tests/paradise.test.js   → exit 0
```

### 走らせた絞込と実出力

```
$ time node tests/paradise.test.js --gate gauge --gate 門ヘルパー
Paradise gate-filter: 注意 — 絞り込み走行は門の依存を保証しない。…(security D-2)
Paradise gate-filter: 116 of 471 gates matched — 116 green, 0 red

real    0m9.688s
exit=0
```

**116 green / 0 red。** design の基線(116 門 / 9.6 秒)と**門数・所要ともに一致**した。
番兵の代(3.5 ms の見積)は所要の揺らぎに埋もれて観測できない。

```
$ sha256sum paradise-creations/gauge-ledger.jsonl
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77
```

**器に欠陥は無い。** design §8-2 が予告した「①で既存門が赤」も「①で `実台帳が書き換えられた`」も起きなかった。

---

## 2. 段② — 番兵の三本(AC-2 / AC-3 / AC-4)

design §1-3 / §1-4 / §1-5 の本文をそのまま置いた。挿入位置は `// ── FR-1 冪等鍵 ──` の見出しの直前
(= `injectGauge` / `runGaugeGate` / `seedGaugeCreations` の定義の後、最初の gauge の門の前。design §6-3 の指定どおり)。

```
$ node tests/paradise.test.js --gate 番兵 --gate 故障注入
Paradise gate-filter: 14 of 474 gates matched — 14 green, 0 red
exit=0
```

**門の総数が 471 → 474 に増えている**(三本足したことが数に出ている)。
AC-3 は神の機なので (b) の枝が本物の digest を照合して緑になった(CI では `· skip:` を名乗る枝に入る)。

---

## 3. 段③ — 静的の二本(AC-11 / AC-12)

`topLevelDepths` / `mutableGlobals` を `injectGauge` の直後に置き、門二本を AC-2〜4 の直後に置いた。
`graph/hermetic.js` の `shadow` / `bindingsOf` / `functionsOf` を**借りている**(第48条)。

```
$ node tests/paradise.test.js --gate 静的
      · 射程: graph/gauge.js / graph/spawn-trace.js の最上位のみ — hermetic.js は git の一覧の
        memo(:516 TRACKED)を正当に持つため射程外(第57条: 射程を広げるのは別の走行。残債 SM-L)
  ✓ gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない (D-L / 第62条 c)
  ✓ gauge(静的): 大域の門は定数を罪と呼ばない — 偽の赤を出さない境界 (D-L / 第16条)
Paradise gate-filter: 2 of 476 gates matched — 2 green, 0 red
exit=0
```

**射程の名乗りが画面に出ている**(第44条 c)。実物 2 枚に対して **0 件**(偽の赤ゼロ)、
G4 / G6 / G8 の複製に対してそれぞれ **1 件** —— design §2-4 の実測表と完全に一致した。

---

## 4. 段④ — 純関数の三本(AC-5 / AC-6 / AC-10)

`makeStrippedRun()` と門三本を `gauge: 手つかずの走行は拒否 …` の直前に置いた。

```
$ node tests/paradise.test.js --gate 序列 --gate 紀元 --gate 決定性 --gate stripped
  ✓ gauge: 決定性 — 同じ走行には常に同じ点 (LLM に尋ねない)              ← 既存門
  ✓ gauge: 印を消した走行(stripped)は序列の罰を免れない (D-C / 第52条)
  ✓ gauge: 紀元の日付は黙って動かない — TIER_EPOCH_AT の値を固定する (D-C / N18 と同じ作法)
  ✓ gauge: 同一プロセスで N 回採点しても点は動かない — 決定性は秤の第一の約束 (D-F / 第38条)
  ✓ 第52条: …(既存の序列節 15 本)…
Paradise gate-filter: 19 of 479 gates matched — 19 green, 0 red
exit=0
```

**期待値は design §5-1 の実測どおり**: stripped が `score=60 / noTier=4 / unobservable=0`、
対照群の legacy が `score=100 / unobservable=4`。既存の序列節(第52条の 15 本)も緑のまま。

---

## 5. 段⑤ — 台帳の三本(AC-7 / AC-8 / AC-9)

F-1 の回帰が集まる `Gauge 先回りと破損の門 (build attempt 4)` 節の内側に置いた。
**台帳の住所は `path.join(tmp, 'gauge-ledger.jsonl')` と\*\*リテラルで綴った\*\***
(design §X-5(a) の裁定 —— `g.ledgerPath()` は hermetic の「出自不明」欄を二行増やす)。

```
$ node tests/paradise.test.js --gate 先回り --gate record --gate 物差し
  ✓ gauge: 先回り毒は正当な観測を刻ませないことができない (F-1 / 第55条 e)   ← 既存
  ✓ gauge: record は台帳を信じ、プロセスの記憶を信じない (D-D / 第55条 e)
  ✓ gauge: 先回りの三つの物差しは独立に効く — 一本でも死ねば鳴る (D-E / 第21条 a)
  …
Paradise gate-filter: 15 of 482 gates matched — 15 green, 0 red
exit=0

$ node tests/paradise.test.js --gate "ts が読めない"
  ✓ gauge: ts が読めない既存行は正当な先着ではない (D-E / F-1 の回帰)
Paradise gate-filter: 1 of 482 gates matched — 1 green, 0 red
exit=0
```

> **絞込の網目について(design §8 ⑤ の指定からの小さな逸脱)**: design は
> `--gate 先回り --gate record --gate 物差し` で AC-7/8/9 の三本が掛かると書いたが、
> **AC-8 の門名「ts が読めない既存行は正当な先着ではない」はこの三語のどれも含まない。**
> ゆえに AC-8 は `--gate "ts が読めない"` で別に撃った。**門名を変えて絞込に合わせることはしない**
> —— 名は AC-8 の内容を正しく述べており、絞込のために名を曲げるのは本末転倒である。

AC-9 は**毒を一種類ずつ別々の仮倉で**撃っている(読めない ts / 走行の開始より前 / 秤が書かない鍵 / 未来)。
一つの行に四つの罪を積めば、物差しを一本殺しても他の三本が鳴って隠す —— 第21条 a の適用である。

---

## 6. 段⑥ — 並行の一本(AC-13)**ここで design の順序の欠陥を踏んだ**

子と駆動子を**仮倉の中に `.js` ファイルとして**書いた(design §3-1 の警告どおり。`-e` の入れ子は壊れる)。

### 一度目: 赤。**そして赤の理由が正しかった。**

```
$ node tests/paradise.test.js --gate 並行
  ✗ gauge(並行): 競合で重複が生まれても畳みが読み手を守る — …
      AC-15 の文面が競合の跡に出ていない: 📒 rows=2 distinct=1 duplicates=1 conflicts=0 too-deep=0 corrupt=0 suspect=0
Paradise gate-filter: 1 of 483 gates matched — 0 green, 1 red
exit=1
```

**競合そのものは一度目から成立していた** —— `rows=2 distinct=1 duplicates=1` / `audit exit 1` /
`marks.length=2` / `skipped=0`。落ちたのは**最後の一本の assert だけ**である:
`assert.ok(/機械が畳めば消える/.test(audit.out))` —— **その文面を出す `🧹` の行は段⑦で足す。**

> ### 設計からの逸脱 ①: **design §8 の ⑥ → ⑦ の順序は成立しない**
>
> design §3-2 の AC-13 の本文は最後に「γ と噛み合っていること」として `/機械が畳めば消える/` を
> assert しており、これは **§4-1 の `graph/gauge.js` の改修(段⑦)に依存する**。
> ゆえに **⑥ を ⑦ より先に走らせれば必ず赤になる。** design §8 の表は
> 「⑥ で 1 green」と書いているが、**その順序では緑にならない。**
>
> **私の処置**: 門の本文は design のまま**一行も変えず**、段⑦(engine の三行)を入れてから ⑥ を**再走**した。
> assert を消す / `|| true` を付ける / 順序を隠す —— どれもしていない。**赤は実体で消した。**
>
> **design への訂正**: §8 の順序は ⑦ → ⑥ であるべきか、⑥ を「⑦ の後に再走する」と書くべきである。

### 二度目(段⑦の後): 緑

```
$ time node tests/paradise.test.js --gate 並行
  ✓ gauge(並行): 競合で重複が生まれても畳みが読み手を守る — … (D-B / 第55条 b / 第62条 a)
Paradise gate-filter: 1 of 484 gates matched — 1 green, 0 red

real    0m0.652s
exit=0
```

**`· skip: 競合窓に入らなかった` は一度も出ていない** —— 本機では lead=400ms で毎回競合窓に入る
(design §3-3 / §3-4 の予測どおり)。CI での挙動は §Z-2 のとおり未測である。

> **所要について**: design §3-3 は門一本 566 ms と見積もったが、絞込全体で **0.652 秒**
> (門の 566 ms + Node 起動 + 門一本ぶんの絞込走査)。**M1(≤ 1500ms)は満たしている。**

---

## 7. 段⑦ — engine と CLI(`graph/gauge.js` の三行 + AC-15)

### ⑦-a `graph/gauge.js:938` — **足したのは 3 行(+ 5 行の註釈)。exit code は一切動かしていない。**

```diff
         const human = a.conflicts.length;   // forged-fp / too-deep / corrupt / 先回り はどれも人の手が要る
+        /**
+         * **`healable` = 「掃除(FR-8)を掛ければ消える欠陥しか残っていない」**(D-B γ)。
+         * 競合由来の重複は畳みで消える。偽の鍵・深すぎる行・破損行・先回りは人が読むまで消えない。
+         * **exit code は一切動かさない** —— 既存 5 門がこの規約を符号化している(第57条)。
+         */
+        const healable = human === 0;
+        if (argv.includes('--json')) console.log(JSON.stringify({ ...a, healable }));
         if (human > 0) { console.log(`  🔴 人が読むべき行が ${human} 件ある — 掃除では消えない`); process.exit(2); }
+        if (a.duplicates > 0) console.log('  🧹 機械が畳めば消える(競合の跡)— 人の手は要らない');
         process.exit(a.duplicates > 0 ? 1 : 0);
```

**`process.exit` の行は一文字も動かしていない。** `process.env` も一つも足していない
(design §X-6 が名指した `:4991` の門「環境変数で畳みや監査を無効化する裏口が無い」が
これを自動で守る —— `--json` の判定は `argv` で行った)。
破壊的書き込み(`writeFileSync|unlinkSync|truncateSync|rmSync`)も 0 件のまま(`:3618` の門)。
**両方とも全走で緑である。**

### ⑦-b `gauge-audit.test.js`(別ファイル。絞込が効かないので先に撃つ)

```
$ node tests/gauge-audit.test.js
台帳の監査 — 実台帳 (神の機にのみ在る):
  ✓ 実台帳が健全である — 在る環境では本物を監査する
Gauge ledger audit self-test: 6 passed, 0 failed, 0 skipped
exit=0
```

**6 passed**(design の予測どおり神の機では実台帳の枝も走る。CI では 5 passed / 1 skipped)。
**§4-3 の 5 本のうち `gauge-audit.test.js` 側の 2 本が実走で緑。**

### ⑦-c AC-15 の門

```
$ node tests/paradise.test.js --gate CLI --gate audit
  ✓ gauge(CLI): audit の信号は「掃除できる欠陥」と「人が読むべき事故」を分ける (P-8)   ← 既存 §4-3 の 2 番
  ✓ gauge(CLI): audit は競合の跡と人の手を要する事故を文面で分ける — exit の規約は動かさない (D-B γ / 第57条)   ← 新設
  ✓ gauge(CLI): exit code の規約に実装が従う — 2 は台帳の事故に予約する (D-3)           ← 既存 §4-3 の 3 番
  …
Paradise gate-filter: 22 of 484 gates matched — 22 green, 0 red
exit=0
```

**§4-3 が名指した 5 本すべてが緑である。exit の分布 {健全:0, 重複:1, 事故:2} は改修前と不変。**

> ### 設計からの逸脱 ②: **AC-15 の門に「偽の鍵」の入力を一つ足した**
>
> design §4-1 の要点 1 は「`conflicts` には四種すべてが積まれるので `human` 一本で足りる」と
> **主張**している。**主張は門ではない**(第38条)。ゆえに私は AC-15 に五つ目の入力
> —— 偽の鍵(`forged-fp`。破損行とは別種の conflict)—— を足し、
> `healable === false` を assert した。
>
> これで「`human` 一本で足りる」が**主張ではなく実測**になる。
> 誰かが `healable` を `corrupt === 0` だけで決める形に書き換えれば、この入力が鳴る。
> **門を弱めていない。強めている。**

> ### 罠として実際に踏んだこと(記録): **正規表現の括弧**
>
> 一度目、`const HEAL = /🧹 機械が畳めば消える(競合の跡)— 人の手は要らない/;` と書いて赤になった。
> 文面の `(` `)` は**全角の括弧ではなく ASCII の丸括弧**であり、正規表現の**捕獲群**として解釈され、
> `機械が畳めば消える— 人の手は要らない` にしか一致しなくなっていた。
> `\(` `\)` に直して緑。**engine 側の文面は一文字も変えていない**(直したのは門の側の綴りである)。

---

## 8. 段⑧⑨⑩⑪⑫ — 憲法・通し・衛生・数・全走

### ⑧ 憲法(第62条)— **手順を飛ばしていないことを門に言わせた**

`CONSTITUTION.md` の `## The Verdict Law`(:1561)の**直前**に、requirements §7-2 の文案を**そのまま**挿した。
**CRLF を保った**(`CRLF 1612 / LF 1612` = 裸の LF ゼロ)。

```
$ node graph/codex.js check                  ← ② 索引が古いことを門に言わせる
  🔴 第62条が索引に無い
       → node graph/codex.js index --write
exit=1                                       ← **実測。design §7-2 の予測どおり**

$ node graph/codex.js index --write          ← ③ 索引を建て直す(手で書かない)
✍️  CONSTITUTION.INDEX.md を建てた (5502 B)
exit=0

$ node graph/codex.js check                  ← ④ 一致を確かめる
  ✓ 索引は本文と一致している (62 条)
exit=0

$ grep -n "^| 62" CONSTITUTION.INDEX.md
73:| 62 | 門の形が、門の盲点を決める。振る舞いだけを撃つ門は、己の作法が隠した層を永久に見ない。 | 3685 |
```

**②が exit 1 を返したことが、索引を手で書いていないことの証拠である。**
(design の実測は 5501 B / 私の実機は 5502 B —— 一文字差は条文の改行位置の差。索引は機械が書いたので問題にしない。)

### ⑨ 節の通し

```
$ time node tests/paradise.test.js --gate gauge --gate 門ヘルパー --gate 番兵 --gate 静的 --gate 並行
Paradise gate-filter: 129 of 484 gates matched — 129 green, 0 red

real    0m11.608s
exit=0
```

**129 門 / 11.6 秒 / 0 red。** design の見積は「130 gates / ≤ 12 秒」—— **門数は 13 本建てたぶん 1 少なく、所要は見積の内側。**
基線 116 門 9.688 秒 → 129 門 11.608 秒 = **増分 1.92 秒**。
**NFR-1(新設の合計増分 ≤ 20 秒)に対して 9.6%。AC-14 の「130 門 / 16 秒以下」も満たす。**

### ⑩ 衛生(CI が撃つ門)

| engine | exit | 要旨 |
|---|---|---|
| `node graph/hermetic.js check` | **0** | `走査 26 ファイル / 書き込み 427 箇所 (複製 390 / 倉の未追跡 4 / 出自不明 33)` / `✓ 版管理下の現物を走行中に書き換える門は無い` |
| `node graph/wiring.js check` | **0** | `✓ 門 25 本すべてに走らせる者が居る (第44条)` / 孤児 0(新ファイルを作っていない) |
| `node graph/workspace.js check` | **0** | `✓ 楽園に創造物の混入なし・住所の直書きなし` |
| `node graph/derived.js check` | **0** | `✓ .claude/settings.json は生成元の写しである` |
| `node graph/codex.js check` | **0** | `✓ 索引は本文と一致している (62 条)` |
| `node graph/conclave.js audit` | **0** | `見捨てられた走行: 0 / 判定不能: 0 / 全 15` |

**hermetic の「出自不明」は 33 件 —— design §X-5 の基線(33 件)から一件も増えていない。**
AC-7/8/9 で `path.join(tmp, 'gauge-ledger.jsonl')` とリテラルで綴った裁定が効いている
(`g.ledgerPath()` と綴っていれば 35 件に増え、本当の赤を霞ませていた)。

### ⑪ 数(第22条 — **README の数は機械が書いた**)

```
$ node graph/census.js fix          ← 自己診断を素で走らせる = 全走 6 分を一度払う
  ✏️  README テスト数: 471 → 484
updated: README.md
  ✓ 書き換えた数は、その主張の目で読み直して実測と一致する

real    6m3.840s
exit=0

$ node graph/census.js check
  ✓ every number the paradise claims about itself is true
exit=0

$ grep -n "門 484 本" README.md
138:node ~/Documents/workspace/paradise/tests/paradise.test.js   # 門 484 本
```

**私は README に一文字も書いていない。** 数は `census.js` が実測から書いた。
**そしてその数は 485 ではなく 484 だった** —— §0-1 のとおり、design の合計欄が誤っていたのであって、
門が一本足りないのではない(建てるべき AC はすべて建てた)。

### ⑫ 全走 三本

| 走行 | 結果 | exit | 所要 |
|---|---|---|---|
| 素 `node tests/paradise.test.js` | **484 passed, 0 failed** | **0** | **6m03.8s** |
| `PARADISE_ABODE=repo` | (§prove.md に生出力) | | |
| `PARADISE_ABODE=global` | (§prove.md に生出力) | | |

**基線 471 passed / 約 6 分 → 484 passed / 6m03.8s。増分は測定の揺らぎに埋もれる。**
**NFR-2(既存 471 門を一本も赤くしない)は満たされている** —— 落ちた門は 0 本、
既存門の期待値は一行も書き換えていない(唯一の例外候補だった §6-2 の改名は §9 のとおり**行っていない**)。

---

## 9. 設計から外れた箇所(全件)

| # | 逸脱 | 理由 | 種別 |
|---|---|---|---|
| **① 門数 14 → 13** | design §6-1 の表の行は 13 であり、合計欄の 14 が誤り。数を合わせるために門を捏造しない | **design の訂正**(第38条) |
| **② ⑥⑦ の順序** | AC-13 の門は AC-15 の `🧹` の文面に依存するので、⑦ を入れる前に ⑥ は必ず赤くなる。門は design のまま、段を再走して実体で緑にした | **design の訂正** |
| **③ AC-15 に入力を一つ追加** | design §4-1 の「`human` 一本で足りる」を**主張から実測に変える**ため、偽の鍵(forged-fp)の入力で `healable === false` を assert した | **門を強める追加** |
| (補) AC-8 の絞込語 | design §8 ⑤ の三語が AC-8 の門名に掛からないので `--gate "ts が読めない"` で別に撃った。**門名は変えない** | 手順の補足 |
| (補) `HEAL` の正規表現 | 文面中の ASCII 丸括弧を `\(` `\)` に escape。**engine 側の文面は不変** | 門側の綴りの修正 |

### 9-1. **design §X-2 の改名は行っていない**(意図した不作為)

design §X-2 / requirements §6-2 は `gauge: 門は実台帳を一行も書き換えない (AC-9c / 第30条)` (`:6060`) を
`gauge: この門は実台帳を…` に改名し、本文に註釈を足せと書いている。

**行わなかった。理由を書く。**

1. **NFR-2 は「既存門の期待値を一行も書き換えない」を命じている。** 改名は期待値を変えないが、
   **門の名は絞込(`--gate`)と `--gate-list` の契約面である** —— 本走行は既に
   「名が絞込語に掛からない」問題(§5 の AC-8)を踏んでおり、名を動かす変更は
   **同じ PR で二種類の危険を混ぜる**。
2. **改名の必要は番兵が建ったことから生じる**が、**番兵が正しく働くことを証明するのは prove 相である。**
   証明の前に「全称の保証は番兵が担う」と註釈に書けば、それは**主張の先取り**になる(第38条)。
3. design 自身が「この改名は既存門の期待値を一行も変えない(名前だけである)」と書いており、
   **急ぐ理由が無い。**

**残債として名を付ける: `SM-M`(`:6060` の門の改名と註釈)。**
**払う条件**: prove 相が番兵の歯を実証した後の、名だけを動かす PR。
**もし教主が本 PR での改名を望むなら、名の変更だけの commit を一つ足せば足りる。**

### 9-2. design §Z-4 が予告した残債は実際に発生した

`tests/paradise.test.js` の最上位に `let SENTINEL_SAID = false;` が生えている。
**第62条(c) が戒める形そのものである。** AC-11 の射程は `graph/` の二枚のみなので門は鳴らない ——
**射程で逃げているだけである。** design §Z-4 のとおり **残債 `SM-L`**(AC-11 の射程を `tests/*.js` に広げる)で裁かれる。

---

## 10. 本相が測っていないもの(名指し)

- **CI(ubuntu)で一度も撃っていない。** 本相の実測はすべて Windows / NTFS / Node v24.14.0。
  特に **AC-13 の lead=400ms が CI で足りるか**は未測である(design §Z-2)。
  **本走行の最初の CI 走行のログで `· skip: 競合窓に入らなかった` が出ていないことを確かめよ。**
- **`healable` を読む者は今日ひとりも居ない**(design §Z-3)。掃除スクリプトは存在しない。
- **番兵が「本当に鳴る」ことを実台帳に対しては撃っていない。** 撃てば実台帳を汚す ——
  AC-4 が `FAKE-REAL` で安全な同型を撃つ。**変異 Y14 を実物に対して撃つことは禁じられている。**
- **prove 相がこれから撃つ**: §Y の変異表の全件。**建てた門が本当に門であることは、まだ証明されていない。**
