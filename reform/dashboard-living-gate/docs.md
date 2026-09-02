# docs — 散文の整備 (reform/dashboard-living-gate)

> この改修が作ったもの (`graph/pulse.js` / `dashboard/index.html` / `dashboard/control.html` /
> 三層フォールバック / 門13本) を、**既存の散文に**書き込んだ記録。
> 書いた手順はすべて自分で走らせ、実出力を本文に貼っている。

---

## 0. 方針 — 散文を増やさず、既存の散文を正す

`dashboard/README.md` を新設しない。散文が散らばると、どちらが正典か分からなくなり腐る。

| やらなかったこと | 代わりにやったこと |
|---|---|
| `dashboard/README.md` を新設 | **README.md に「ダッシュボード」節を追加**(唯一の正典) |
| CLAUDE.md に手順を写経 | CLAUDE.md には **2行の道標**だけ(第39条: 常時ロードは1画面) |
| README に「門13本」と固定値で書く | **`census.js` に `dashboardGates` を実装**し、README の数を機械が数え直す |

新規ファイルは `reform/dashboard-living-gate/docs.md`(この記録)のみ。
散文の本体は既存3ファイル (`README.md` / `CLAUDE.md` / `CONSTITUTION.INDEX.md`) を直した。

---

## 1. README.md — 「ダッシュボード — 楽園の門」節を新設

`## 創造の楽園 (The Forge)` の直後に節を置いた。旧文:

```
**可視化:** `dashboard/control.html` が創造パイプライン・知識グラフ・lesson・創造物を
生きた管理盤として表示。
```

これは `pulse.js` も `index.html` も三層フォールバックも起動方法も語っていない。
節へのリンクに差し替え、本体を書いた。書いた内容:

- **起動**: `node graph/pulse.js serve` (既定 127.0.0.1:7317 / `--port n`)、
  ポート衝突時は落ちずに別ポートを取ること、`127.0.0.1` のみで待つこと
- **常駐せず見る**: `snapshot --json` / `freshness --age-ms n --transport …`
- **何が見えるか**: 画面2枚 (`/` と `/control.html`) の見出しを実物から写した表
- **サーバの口3つ**: `/events` (SSE) / `/snapshot.json` / `/health`、および 403/404 の拒み方
- **測れなかったは緑ではない** (第16条): `null` は `null` のまま残る。ゼロで埋めない。
  `census` を断面に含めない理由 (実測2分)
- **三層フォールバック**の図と、定数が `pulse.js` の `T` 1箇所にしか住まない理由
- **どの門が守っているか**: 13本を1本ずつコマンド付きで列挙

engine 表にも 1 行足した:

```
| `graph/pulse.js` | **楽園の断面 (snapshot)**。数・門の合否・走行・台帳・記憶を 1 個の
  JSON に写す唯一の engine。画面はここしか見ない — 突合点が 1 つだから門が 1 式で書ける |
```

### 数を census が検められる形にした

README に書いた唯一の数は「ダッシュボードの門 **13 本**」。
これを固定値で放置すれば、門を1本足した日に嘘になる。ゆえに `graph/census.js` に:

```js
// census() の返り値
dashboardGates: (() => {
  try {
    return fs.readdirSync(path.join(ROOT, 'tests'))
      .filter(f => /^dashboard-.+\.test\.js$/.test(f) || f === 'motion-probe-leak.test.js')
      .length;
  } catch { return 0; }
})(),

// claims() の一覧
{ file: 'README.md', re: /ダッシュボードの門 \*\*(\d+) 本\*\*/, actual: c.dashboardGates,
  label: 'README ダッシュボード門数' },
```

**門が生きていることを、壊して確かめた** (第27条 — 鳴らない門は門ではない):

```
$ sed -i 's/門 \*\*13 本\*\*/門 **99 本**/' README.md && node graph/census.js check --no-tests
═══════ 🔢 CENSUS CHECK ═══════
  🔴 README ダッシュボード門数: doc says 99, reality is 13  (README.md)
═══════════════════════════════
exit=1

$ sed -i 's/門 \*\*99 本\*\*/門 **13 本**/' README.md && node graph/census.js check --no-tests
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
exit=0
```

実測の裏取り:

```
$ node -e "const c=require('./graph/census.js');console.log(c.census({runTests:false}).dashboardGates)"
13
$ ls tests/dashboard-*.test.js tests/motion-probe-leak.test.js | wc -l
13
```

---

## 2. CONSTITUTION.INDEX.md — 条数を実数と突き合わせた

読み取り時点の索引は **「全 49 条」** を主張していた。実数を数えた:

```
$ grep -cE '^[0-9]+\. \*\*' CONSTITUTION.md
50
$ grep -nE '^50\. \*\*' CONSTITUTION.md
969:50. **動きは名乗らねば宿らず、門が見ない機能は壊れても鳴らない。**
```

索引は**生成物であり手で編集しない** (第29条)。ゆえに生成器を走らせた:

```
$ node graph/codex.js check
═══════ 📖 CODEX CHECK ═══════
  🔴 第50条が索引に無い
       → node graph/codex.js index --write
══════════════════════════════

$ node graph/codex.js index --write
✍️  CONSTITUTION.INDEX.md を建てた (3980 B)

$ node graph/codex.js check
═══════ 📖 CODEX CHECK ═══════
  ✓ 索引は本文と一致している (50 条)
══════════════════════════════
```

現在の索引の主張と実数は一致している:

```
$ grep -m1 "全 " CONSTITUTION.INDEX.md
全 50 条 / 本文 73,257 B / 索引はその約 93% 減
$ tail -1 CONSTITUTION.INDEX.md
| 50 | 動きは名乗らねば宿らず、門が見ない機能は壊れても鳴らない。 | 2818 |
```

**正直に書いておく**: `git status` に `CONSTITUTION.INDEX.md` は現れない。
作業中に兄弟の走行 (`777df68`, 22:16) が同じ修正を先に commit していたためであり、
本作業の `index --write` は冪等に同じ内容を書いた。**ずれは実測で確認し、閉じた** —
ただし差分の功は本作業のものではない。

---

## 3. dashboard/ の使い方 — 既存の散文に足した

新規ファイルを作らず、README の新節 (§1) が使い方の本体を担う。
CLAUDE.md には**道標だけ**を2行 (常時ロードの散文は1画面。第39条):

```
ダッシュボードは `node graph/pulse.js serve` → 名乗ったポートを開く
(画面・口・門の一覧は README の「ダッシュボード」節)。
```

CLAUDE.md の予算 (4,096 B) を破らないことを門で確認した:

```
$ wc -c CLAUDE.md
2814 CLAUDE.md
$ node graph/census.js check --no-tests
  ✓ every number the paradise claims about itself is true     # diet 門も含めて緑
```

---

## 4. 書いた起動手順を、自分で実行した

README に書いたとおりに走らせた実出力。

### 4.1 起動

```
$ node graph/pulse.js serve
pulse listening port=7317
```

### 4.2 3つの口

```
$ curl -s http://127.0.0.1:7317/health
{"ok":true,"port":7317,"connections":0,"rescans":0}

$ curl -s -o /dev/null -w "index.html HTTP %{http_code}\n" http://127.0.0.1:7317/
index.html HTTP 200

$ curl -s -o /dev/null -w "control.html HTTP %{http_code}\n" http://127.0.0.1:7317/control.html
control.html HTTP 200

$ curl -s -N http://127.0.0.1:7317/events | head -c 400
retry: 1000

event: snapshot
data: {"schemaVersion":1,"generatedAt":"2026-09-02T13:12:38.816Z","generatedAtMs":1788354758816,
"ageMs":0,"transportHint":"sse","connections":1,"counts":{"articles":50,"engines":34,
"cardinals":7,"creations":7,"workshops":1,"runs":5,"agents":30,"commands":19,"skills":13,
"kgNodes":99,"kgEdges":33,"lessons":65},"gates":[{"name":"wiring","ok":true,...
```

`/events` は **`retry: 1000` を先に出し、接続直後に `event: snapshot` を1発**押している —
README に書いたとおり。

### 4.3 断面の中身 (README の「何が見えるか」の裏取り)

```
$ curl -s http://127.0.0.1:7317/snapshot.json > snap.tmp.json && node -e "..."
schemaVersion: 1
counts: {"articles":50,"engines":34,"cardinals":7,"creations":7,"workshops":1,"runs":5,
         "agents":30,"commands":19,"skills":13,"kgNodes":99,"kgEdges":33,"lessons":65}
gates: wiring=ok vendor=ok derived=ok check-agents=ok workspace=ok
top keys: schemaVersion,generatedAt,generatedAtMs,ageMs,transportHint,connections,counts,
          gates,gatesCached,runs,ledger,daily,scale,lessonsByKind,atlas,census,thresholds,
          source,buildMs,errors
errors: []
```

断面の `counts.articles` は **50** — §2 で直した索引と、`grep -c` の実数と一致する。
断面は `census` の鍵を持つが README に書いたとおり同期経路では埋めない。

### 4.4 外へ出る参照は拒む

```
$ curl -s -w " HTTP %{http_code}" http://127.0.0.1:7317/../CONSTITUTION.md -o /dev/null
 HTTP 404
```

### 4.5 鮮度の CLI (README に書いた3行をそのまま)

```
$ node graph/pulse.js freshness --age-ms 5000  --transport sse
live
$ node graph/pulse.js freshness --age-ms 30000 --transport poll
lagging
$ node graph/pulse.js freshness --age-ms 90000 --transport sse
frozen
```

---

## 5. 門が緑のままであること

### 5.1 census (散文の数を裁く門)

`--no-tests` (速い経路):

```
$ node graph/census.js check --no-tests
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
exit=0
```

**既定の全経路** (自己診断を丸ごと回す。実測 約6分):

```
$ node graph/census.js check
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
CENSUS_FULL_EXIT=0
```

全経路が緑ということは、README の `paradise.test.js #N/N pass` の数もまた
実測と一致している (この主張は自己診断を走らせないと裁けない)。

### 5.2 ダッシュボードの門 (散文を触った影響を確かめる)

```
$ node tests/dashboard-no-hardcode.test.js
dashboard-no-hardcode: 7 passed, 0 failed
$ node tests/dashboard-links.test.js
dashboard-links: 6 passed, 0 failed
$ node tests/dashboard-count.test.js
dashboard-count: 15 passed, 0 failed
$ node tests/dashboard-no-deps.test.js
dashboard-no-deps: 10 passed, 0 failed
```

### 5.3 結線と生成物

```
$ node graph/wiring.js check
═══ 🔗 WIRING GATE (第44条 / 第48条) ═══
  engine 34 / 内の辺 41
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
exit=0

$ node graph/derived.js check
═══════ 📄 DERIVED DEPENDENCY ═══════
  ✓ no test asserts on derived content
═════════════════════════════════════
```

### 5.4 codex (条数の門)

```
$ node graph/codex.js check
  ✓ 索引は本文と一致している (50 条)
```

---

## 6. 触ったファイル

```
$ wc -c CLAUDE.md README.md CONSTITUTION.INDEX.md graph/census.js
  2814 CLAUDE.md              (2643 → 2814 / 予算 4096 B 内)
 21184 README.md              (16686 → 21184)
  3980 CONSTITUTION.INDEX.md  (3937 → 3980 / 全49条 → 全50条)
 18118 graph/census.js        (17078 → 18118 / dashboardGates を実装)
 46096 total

$ git diff --stat
 CLAUDE.md       |  2 ++
 README.md       | 85 +++++++++++++++++++++++++++++++++++++++++++++++++++++++--
 graph/census.js | 16 +++++++++++
 3 files changed, 101 insertions(+), 2 deletions(-)
```

`reform/dashboard-living-gate/docs.md` (この記録) が新規。散文の本体は既存を正した。

---

## 7. 残した掟

- **README に数を書くなら `census.js` の `claims()` に一行足す**。
  足さない数は、書いた日から腐り始める。門が見ない数は嘘になる自由を持つ。
- **`CONSTITUTION.INDEX.md` は手で直さない**。`node graph/codex.js index --write` が建てる (第29条)。
  ずれに気づいたら `codex.js check` を先に走らせ、赤の名指しを読んでから生成器を回す。
- **ダッシュボードの使い方は README の1節にだけ住む**。`dashboard/README.md` を作らない。
  CLAUDE.md には道標のみ — 手順を写経した瞬間、二つの正典ができて片方が腐る。
