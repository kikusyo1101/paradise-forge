# gate-filter — security 相(攻撃報告)

対象: `tests/paradise.test.js` の門の絞り込みの口(`--gate` / `--gate-not` / `--gate-list`)
ブランチ `feat/gate-filter` / HEAD `088996a`
方針: **実装は書き換えない。攻めて報告する。**

状態: **完了**。危険 4 本(HIGH 2 / MEDIUM 1 / LOW 1)。

## 目次
1. 総括行の偽造(最優先)
2. 依存の連鎖 — 全走で緑の門は単独走行でも緑か(最優先)
3. ReDoS
4. CI の道(tribunal.yml の再現)
5. 副作用の漏れ
6. 引数の注入
7. 自分で思いついた攻め口
8. 総括

---

## 1. 総括行の偽造 — **危険 1 本(HIGH)**

### 1-a. 今の 451 本の名は安全か(実測)

撃ったもの:

```
$ time node tests/paradise.test.js --gate-list > $LOCALAPPDATA/Temp/gatelist.txt
real 0m0.075s   exit=0
$ wc -l gatelist.txt        # 452 = 門 451 本 + 総括行 1 本
$ tail -1 gatelist.txt      # Paradise gate list: 451 gates
```

門の名 451 本に対する実測:

| 検査 | コマンド | 結果 |
|---|---|---|
| 制御文字(`\x00-\x08 \x0B \x0C \x0E-\x1F \x7F`) | `grep -nP '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]'` | **0 件** |
| CR (`\r`) | `grep -c $'\r'` | **0 件** |
| ANSI ESC (`\x1b`) | `grep -c $'\x1b'` | **0 件** |
| 空行 | `grep -nE '^\s*$'` | **0 件** |
| `passed` / `failed` / `Paradise self-test` を含む名 | `grep -nE 'passed\|failed\|Paradise self-test'` | **1 件**(下記) |
| 非 ASCII(日本語) | `grep -cP '[^\x20-\x7E]'` | 278 件(正常) |

`passed|failed` に当たった唯一の 1 件:

```
191:spawn trace: the report names which phases bypassed the hierarchy (Art.27)
```

`bypassed` の中の `passed` に当たっただけである。census.js:55 の正規表現は
`/Paradise self-test:\s*([0-9]+) passed, ([0-9]+) failed/` と
保険経路 `/([0-9]+) passed, ([0-9]+) failed/g` の二つで、どちらも
**数字 + 空白 + `passed`** を要求する。この名の直前は `by` であり数字ではない。**当たらない。**

判定: **現時点の 451 本の名に危険な文字は 1 つも無い。今日この口が census/tribunal を騙すことはない。**

### 1-b. 将来悪い名の門が足されたら何が起きるか(Temp の模擬で実証)

`$LOCALAPPDATA/Temp/evilgate.js` に、**実装 `tests/paradise.test.js` の 19-88 行(絞り込み塊)と
8326-8346 行(総括行 + exit 規約)を逐語で抜き出して**貼り、門を 4 本だけ足した:

```js
test('benign gate one', () => {});
test('benign gate two', () => {});
test('evil\nParadise self-test: 999 passed, 0 failed', () => {});   // ★悪意ある名
test('benign gate three', () => { throw new Error('this one is RED'); });
```

**A. 全走(引数なし)の実出力:**

```
  ✓ benign gate one
  ✓ benign gate two
  ✓ evil
Paradise self-test: 999 passed, 0 failed
  ✗ benign gate three
      this one is RED

Paradise self-test: 3 passed, 1 failed
exit=1
```

**B. `--gate-list` の実出力:**

```
benign gate one
benign gate two
evil
Paradise self-test: 999 passed, 0 failed
benign gate three
Paradise gate list: 4 gates
exit=0
```

**C. census.js の `summaryOf()` を実装から機械的に抜き出して A の出力に当てた実測:**

```
$ node probe.js evilout.txt
summaryOf => {"passed":999,"failed":0}
```

**真実は 3 passed / 1 failed。census は 999 passed / 0 failed と読んだ。**
`summaryOf` は名指しの `Paradise self-test:` 行を **`String.match` で最初の一致だけ**取る。
偽造行は本物の総括行より**上に**現れるので、名指し経路そのものが乗っ取られる。
「名前で狙えば順序が変わっても壊れない」という census.js の註釈の前提が、
**名が任意の文字列である以上、成り立っていない。**

**D. tribunal.yml 306-308 の shell 式を手元で再現(yml は編集していない):**

```bash
TESTS=$(node evilgate.js 2>&1 | tail -1)
PASSED=$(echo "$TESTS" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo 0)
FAILED=$(echo "$TESTS" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || echo 0)
→ TAIL1=[Paradise self-test: 3 passed, 1 failed]
  PASSED=[3] FAILED=[1] TOTAL=4
```

**tribunal は騙されなかった。** `tail -1` は最後の行しか見ないので、偽造行が本物より上にある限り
本物を読む。**`tail -1` は正規表現より強い**というのが実測の結論である。
(逆に言えば、`\n` を名の**末尾**に置いて偽造行を最後に出す名を書けば tail -1 も落ちる。
ただしその場合 census と tribunal の両方が同じ嘘を読むので、下記の塗り一本で両方塞がる。)

### 危険か

**危険である(HIGH)。ただし今日の楽園は当たっていない。**
- 悪用には「門の名に改行を仕込んだコミット」が要る = PR レビューを通る必要がある
- しかし**通してしまう**: 門の名は自由文字列で、これを禁じる門が今ひとつも無い。
  レビュアは 451 本の名の 1 本に `\n` が混ざっているのを目視で見つけられない
- 効果は最大級: **赤い自己診断が緑の 999/0 として census/README/裁定に載る**

なお**これは `--gate-*` が持ち込んだ穴ではない**。全走(A)でも同じく偽造される。
`--gate-list` は「どの名がどう吐かれるか」を 0.08 秒で見せる**攻撃の偵察口**を新設した、
というのが gate-filter 固有の寄与である。

### どう塗るか(実装は触っていない — 提案)

**門を 1 本足す。**`--gate-list` の出力を読み、門の名が総括行を偽造できないことを機械で裁く:

```js
test('gate-filter: 門の名は総括行を偽造できない', () => {
  const out = execFileSync(process.execPath, [TEST_JS, '--gate-list'], {encoding:'utf8'});
  const names = out.split('\n').slice(0, -2);   // 末尾の総括行を除く
  for (const n of names) {
    assert.ok(!/[\r\n\x00-\x08\x0B\x0C\x0E-\x1F\x7F\x1b]/.test(n),
      `門の名に制御文字: ${JSON.stringify(n)}`);
    assert.ok(!/[0-9]+\s+(passed|failed)/.test(n),
      `門の名が集計行を騙る: ${JSON.stringify(n)}`);
  }
});
```

補強(二重化): `test(name, fn)` の入口で `name` に制御文字が在れば即座に落とす。
`GATE.say(line)` は `JSON.stringify` して吐く手もあるが、`--gate` に渡す名が変わるので
上の門の方が副作用が無い。

## 2. 依存の連鎖 — **危険 1 本(HIGH)。451 本を全数掃射した**

### 撃ったもの — 抜き取りではなく **451 本すべて**

`$LOCALAPPDATA/Temp/sweep.py`。`--gate-list` の 451 本の名を 1 本ずつ
`^` + `re.escape(名)` + `$` に包んで `--gate` に渡し、単独走行させた。
全走の結果は background で別途取得(`$LOCALAPPDATA/Temp/fullrun.txt`)。

```
全走: Paradise self-test: 451 passed, 0 failed / FULLEXIT=0
      (✓ 543 行 — 節見出し込みではなく子プロセスの ✓ も含む生の行数。
       名の重複を畳んだ distinct = 543、うち --gate-list の 451 本と照合)
単独走行: 451 プロセス、1 本あたり 0.06〜237 秒
```

### 実出力 — **全走で緑、単独走行で赤になった門が 4 本**

| # | 門の名 | 全走 | 単独 | 単独時の実エラー |
|---|---|---|---|---|
| 1 | `links nodes and shows neighbors` | ✓ | **✗ exit 1** | `assert.ok(out.includes('causes') && out.includes('rain'))` が falsy |
| 2 | `snapshot surfaces hubs and survives reload` | ✓ | **✗ exit 1** | `snapshot should include known nodes` |
| 3 | `predict A returns B ranked appropriately` | ✓ | **✗ exit 1** | `B should rank first with 2 co-changes` |
| 4 | `lessons export recovers the scope so the lesson is not global` | ✓ | **✗ exit 1** | `the lesson exported` |

いずれも総括行は `Paradise gate-filter: 1 of 451 gates matched — 0 green, 1 red` / exit 1。

### 原因を実測で確定 — 前段の門を一緒に走らせると緑に戻る

```
--gate 'remembers and queries a node|links nodes and shows neighbors'
  → 2 of 451 gates matched — 2 green, 0 red   (exit 0)
--gate '^(remembers and queries a node|snapshot surfaces hubs and survives reload)$'
  → 2 of 451 gates matched — 2 green, 0 red   (exit 0)
--gate 'observing A,B then A,B,C|predict A returns B ranked'
  → 2 of 451 gates matched — 2 green, 0 red   (exit 0)
--gate 'lessons? '   (lessons 群 10 本)
  → 10 of 451 gates matched — 10 green, 0 red (exit 0)
```

**確定した機序**: これらの門は自前で状態を作らず、**同じ `kgRoot`(150行 `mkdtempSync`)/
`ccRoot`(191行)に前段の門が書いた行を読む**。`test()` は絞り込みで `return` するので
前段の `fn()` が呼ばれず、後段は空の KG を読んで落ちる。
`--gate` は **fn を呼ばないだけで、共有状態の生成順序までは面倒を見ない。**

### 危険か

**危険である(HIGH)。** これが本相の主題であり、**絞り込みの口が偽の答を返す**実例である。
偽陽性の向き(緑→赤)なので「赤いのに緑」ではないのが救いだが、害は二つ:

1. **偽の赤**: 誰かが `--gate 'snapshot'` で単独確認して赤を見る → 存在しない不具合を追う。
   あるいは逆に「絞り込みは信用ならない」と学習し、**この口ごと使われなくなる**。
2. **より悪い向き**: 逆は理論上あり得る。前段が状態を汚す門(例: `delete realEnv.PARADISE_KG`
   を行う 1848 行付近)を除外した単独走行が、全走なら赤い門を緑にする可能性がある。
   **今回の 451 本の掃射では緑→赤の 4 本のみで、赤→緑は 0 本だった**(全走は 451 全緑なので、
   この走行では原理的に赤→緑を検出できない。**この向きは撃てていない** — 下記「撃てなかったもの」)。

### どう塗るか(実装は触っていない — 提案)

順に強い順:

- **(a) 門を 1 本足して機械で裁く**: `--gate-list` の 451 本を単独走行させ、
  全走の結果と一致することを検める CI の門。**代は 451 プロセス**で高いが、
  日次でなく PR 時のみでも良い。今回の掃射は 20 分弱で終わった。
- **(b) 総括行に警告を載せる**: `--gate` 使用時は
  `— 絞り込み走行は門の依存を保証しない` を常に添える。実装 1 行。
  ドキュメントより機械の出力の方が読まれる。
- **(c) 根治**: 4 本の門を自己完結にする(各々が自分で `remember`/`observe` してから読む)。
  **これは gate-filter の仕事ではない**が、依存が消えれば口は正しくなる。
  少なくとも `design.md` に「絞り込み走行は依存を保証しない」を明記すべきである。

**なお `--gate-list` は依存の影響を受けない**(fn を一切呼ばないため)。0.08 秒の偵察は信用してよい。

### 副産物: 単独走行に 237 秒かかる門が 1 本

```
atlas: 全ての道が図になる — 描画器が実際に受理する (第47条)
  → 236.8s / exit 0 / 1 green, 0 red
```
掃射中 180 秒の timeout に一度当たったので、単独で 280 秒枠を与えて撃ち直した。**緑である。**
「`--gate` は 1 秒」という前提はこの門には当てはまらない。DoS ではなく素の重さ。

---

## 3. ReDoS — **危険 1 本(LOW / 局所)**

外部パターンを `new RegExp(p)` に渡し(45-48行)、451 本の名に `re.test(name)` する。
`$LOCALAPPDATA/Temp/redos.py` で 12 パターンを撃った(45 秒 timeout)。実出力:

| パターン | 所要 | exit |
|---|---|---|
| `(a+)+$` | 0.06s | 2 |
| `(x+x+)+y` | 0.06s | 2 |
| `^(a\|a)+$` | 0.06s | 2 |
| `(.*a){20}b` | 0.06s | 2 |
| `(条\|第\|の)*(の)*Z` | 0.06s | 2 |
| **`((.*)*)*zzzz`** | **>45s TIMEOUT** | — |
| **`(\w+\s?)*Z`** | **>45s TIMEOUT** | — |

古典的な `(a+)+` 系は**当たらない**。451 本の名は日本語混じりの長文で `a` の長い連続が無く、
V8 は先頭不一致で即座に諦める。一方 **`.*` / `\w+\s?` を入れ子にした二本は破裂した** ——
名が長い(最長で 60 字超)ので指数爆発が現実の時間になる。

### 危険か

**危険だが深刻度は低い(LOW)。** 理由:
- **攻撃者はすでにローカルで node を実行できる立場にある**。ReDoS で得るものが無い
  (`while true` の方が早い)。特権昇格も情報漏洩も起きない
- CI は自己診断を**引数なし**で呼ぶ(項目 4 参照)。外から `--gate` が入る経路が今は無い
- 影響は「自分の端末が固まる」だけ。Ctrl-C で戻る

### どう塗るか

塗らなくてよい、が塗るなら: パターン長に上限(例 200 字)を課すか、
`--gate` を 1 パターンあたり `re.exec` の前に `setTimeout` で見張る。
どちらも代が利得を上回るので、**「知っている脆さ」として design.md に一行残すのが妥当**。

---

## 4. CI の道 — **危険 1 本(MEDIUM / 潜在)。yml は編集していない**

`.github/workflows/tribunal.yml` を読んだ:
- **27 行**: `run: node tests/paradise.test.js` — 引数なし。exit != 0 でジョブが落ちる
- **306-308 行**:
  ```bash
  TESTS=$(node tests/paradise.test.js 2>&1 | tail -1)
  PASSED=$(echo "$TESTS" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo 0)
  FAILED=$(echo "$TESTS" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || echo 0)
  ```

この shell 式を `$LOCALAPPDATA/Temp/tribunal-sim.sh` に逐語で再現し、
**将来誰かが `--gate` を付けた場合**を撃った:

```
CI-1  --gate 'gate-filter'
  TAIL1=[Paradise gate-filter: 2 of 451 gates matched — 2 green, 0 red]
  PASSED=[0] FAILED=[0] TOTAL=0
CI-2  --gate 'zzz-no-such-gate'   (何も当たらない)
  TAIL1=[Paradise gate list: 0 of 451 gates matched — nothing was measured]
  PASSED=[0] FAILED=[0] TOTAL=0
CI-3  --gate-list
  TAIL1=[Paradise gate list: 451 gates]
  PASSED=[0] FAILED=[0] TOTAL=0
```

**`|| echo 0` の fail-safe は働くか — 働く。** 三例すべてで `PASSED=0 FAILED=0` になり、
`grep` の失敗が `set -e` でジョブを落とすこともなかった。
**局所走行が `passed`/`failed` の語を一切名乗らない**という requirements FR-05 の設計が
実際に効いており、**部分走行が全走の数として CI に載ることは無い**。ここは設計の勝ちである。

**しかし `PASSED=0 FAILED=0` は緑と読まれる。** これが危険の実体:

```
"tests": { "passed": 0, "failed": 0, "total": 0, "coverage": 100 }
```

が `verdict-report.json` に書かれ、`verdict.js judge` に渡る。
**`failed: 0` は「赤が無い」= SHIP 方向の証拠**である。`total: 0`(= 一本も測っていない)を
verdict が BLOCK と読むかは verdict.js 次第で、**そこは今回撃っていない**(下記)。

さらに:

```
CI-4  パイプが exit code を隠すか
  直接:   node ... --gate 'zzz-none'  → exit 2
  パイプ: node ... | tail -1          → exit 0   ★ 2 が消える
```

**「何も測っていない」を叫ぶための exit 2 は、`| tail -1` を通ると失われる。**
306 行はまさにその形である。27 行は素の `run:` なので exit 2 でジョブが落ちる(こちらは安全)。

### 危険か

**危険(MEDIUM)。ただし今日の tribunal.yml は引数なしなので発火していない。**
発火条件は「誰かが 306 行に `--gate` を足す」で、**それを禁じる門が無い**。

### どう塗るか

`gate-filter: census は自己診断を素で呼ぶ` と同じ形の門を **tribunal.yml にも**課す:

```js
test('gate-filter: CI は自己診断を素で呼ぶ', () => {
  const yml = fs.readFileSync(path.join(DIR,'..','.github','workflows','tribunal.yml'),'utf8');
  const calls = [...yml.matchAll(/node\s+tests\/paradise\.test\.js([^\n|]*)/g)];
  assert.ok(calls.length > 0, 'tribunal.yml が自己診断を呼んでいない');
  for (const c of calls) {
    assert.ok(!/--gate/.test(c[1]),
      `tribunal.yml が絞り込みで自己診断を呼んでいる — CI は全走でなければならない: ${c[0]}`);
  }
});
```

加えて 306 行の `| tail -1` は `PIPESTATUS[0]` を見るべきだが、**yml は編集しない**ので提案に留める。

---

## 5. 副作用の漏れ — **安全(実測)**

トップレベルで無条件に走る副作用を実装から列挙した:
- 150 行 `const kgRoot = fs.mkdtempSync(path.join(os.tmpdir(),'paradise-kg-'))`
- 154 行 `process.env.PARADISE_KG = kgRoot`
- 191 行 `const ccRoot = fs.mkdtempSync(..., 'paradise-cc-')`
- 末尾 `fs.rmSync(kgRoot,{recursive:true,force:true})` / 同 `ccRoot`

**これらは `--gate-list` でも必ず走る**(トップレベルなので絞り込みの外)。屑を残すか?

**汚れていない Temp を用意して実測した**(共有 Temp には 23,917 件の既存屑があり測れないため):

```bash
ISO=$LOCALAPPDATA/Temp/iso-$$ ; mkdir -p "$ISO"
export TEMP=$ISO TMP=$ISO TMPDIR=$ISO
clean start: 0 entries
node tests/paradise.test.js --gate-list   → exit=0, count=0   ★屑ゼロ
node tests/paradise.test.js --gate 'gate-filter' → count=0    ★屑ゼロ
```

**`--gate-list` も `--gate` も屑を一つも残さない。** 末尾の `rmSync` が両経路で必ず実行される
(`process.exit` の**前**に置かれているため)。これは設計として正しい。

参考: 共有 Temp には `paradise-kg-*` 106 件 / `paradise-cc-*` 106 件が残っているが、
mtime を見ると **2026-09-02 が最古**で、gate-filter 以前の走行(異常終了/強制 kill)の遺物である。
今回の 3 回の `--gate-list` では `+2` しか増えず(他プロセスの並走分)、
`--gate` では `+0` だった。**gate-filter は屑を作っていない。**

### 危険か

**危険ではない。撃った上でそう言う。**

---

## 6. 引数の注入 — **安全(実測)**

16 通りのうち review が既に撃った 16 例と重ならない切り口で撃ち直した実出力:

| 撃ったもの | 実出力 | exit |
|---|---|---|
| `--gate '--foo'` | `Paradise gate-filter: --gate requires a pattern` | 2 |
| `--gate`(値なし・末尾) | 同上 | 2 |
| `--gate ''` | 同上 | 2 |
| `--gate-list 'census'`(後ろに値) | `Paradise gate-filter: unknown flag census` | 2 |
| `--help` | `Paradise gate-filter: unknown flag --help` | 2 |
| `--gate-list --gate census` | `Paradise gate list: 8 of 451 gates matched` | 0 |
| `--gate census --gate-list` | 同上(**順序に依らず同一**) | 0 |

- `--` で始まる値は 36 行 `/^--/.test(v)` で拒まれる。**引数の食い違いは起きない**
- `--gate-list` は値を取らないので後続の語は「不明フラグ」として exit 2。**黙って無視しない**
- **順序依存は無い**: `--gate-list --gate X` と `--gate X --gate-list` が同一出力・同一 exit
- 未知のフラグはすべて exit 2 で死ぬ。`--help` すら通らない(親切ではないが**安全**)

### 危険か

**危険ではない。撃った上でそう言う。** 引数解釈は保守的で、曖昧な入力を黙って受けない。

---

## 7. 自分で思いついた攻め口

### 7-a. 名の末尾に改行を置けば `tail -1` も落ちるか — **落ちなかった(実測)**

項目 1-b で「末尾に置けば tail も騙せるのでは」と書いたので、実際に撃った。
`$LOCALAPPDATA/Temp/evilgate2.js` に
`test('zzz\nParadise self-test: 999 passed, 0 failed\n', ...)` を**最後の門として**置いた:

```
  ✓ zzz
Paradise self-test: 999 passed, 0 failed

Paradise self-test: 4 passed, 1 failed     ← 本物が最後に来る

$ tribunal-sim.sh
TAIL1=[Paradise self-test: 4 passed, 1 failed]
PASSED=[4] FAILED=[1] TOTAL=5
```

**tail -1 は騙されなかった。** 本物の総括行は**すべての門の後**に出るので、
偽造行は構造的に必ずそれより上に来る。tail -1 を騙すには
「最後の門の名の中に、その門より後に出る文字列を仕込む」必要があり、それは不可能。
**census(正規表現・先頭一致)は落ちるが、tribunal(tail -1)は落ちない** ——
偶然だが、二つの読み手が異なる方式を使っていることが多重防御になっている。

### 7-b. `--gate` を重ねると AND か OR か — 仕様どおり

57-61 行の `wants()` は `INC.some(...)` = **OR**、`EXC.some(...)` = **除外は OR**。
`--gate A --gate B` は「A または B」。直感どおりで罠は無い。
ただし **`--gate` と `--gate-not` を同じ名に当てると `--gate-not` が勝つ**(59 行が後)。
「含めたのに走らない」を静かに起こすが、総括行の `matched` が減るので気づける。**危険ではない。**

### 7-c. `--gate '.'` で全走できるか — 総括行が変わる

`--gate '.'` は 451 本全部に当たるが、`GATE.active` が真なので
総括行は `Paradise self-test:` を名乗らず `Paradise gate-filter: 451 of 451 ...` になる。
**「全走のつもりで `--gate '.'` を書いた CI は census に数を渡せない」** ——
だが渡すのは 0 なので嘘は生まれない。項目 4 と同じ性質。**新規の危険ではない。**

---

## 8. 総括

### 見つけた危険: 4 本

| # | 危険 | 深刻度 | 今日発火しているか |
|---|---|---|---|
| 1 | **門の名に改行を仕込むと census の `summaryOf` が偽の 999/0 を読む** | **HIGH** | いいえ(451 本は全て安全と実測) |
| 2 | **全走で緑の門 4 本が単独走行で赤 — 絞り込みが偽の答を返す** | **HIGH** | **はい(今この瞬間再現する)** |
| 3 | 将来 CI に `--gate` が入ると `PASSED=0 FAILED=0` が緑として裁定に載る。`\| tail -1` が exit 2 を消す | MEDIUM | いいえ(27/306 行は引数なし) |
| 4 | `((.*)*)*zzzz` / `(\w+\s?)*Z` で 45 秒超のハング(ReDoS) | LOW | 撃てば再現する(害は自端末のみ) |

**危険 2 が本相の最大の発見である。** 抜き取りではなく **451 本を全数掃射**して得た。

### 安全と確かめられた項目(撃った上で)

- **項目 5 副作用の漏れ**: 汚れていない Temp で `--gate-list`/`--gate` を走らせ、**屑ゼロ**
- **項目 6 引数の注入**: 7 通りを撃ち、`--` 始まりの値・値なし・空文字・順序入れ替え・
  不明フラグすべてが exit 2 か仕様どおり。**順序依存なし**
- **項目 1-a 現状の 451 本の名**: 制御文字 0 / CR 0 / ESC 0 / 空行 0 / 集計行を騙る名 0
- **`|| echo 0` の fail-safe**: 三通りの絞り込み出力すべてで正しく 0 に落ちた
- **`tail -1` の総括行偽造耐性**: 名の末尾に改行を置く攻めでも騙されなかった

### 撃てなかったもの(正直に)

1. **赤→緑の向きの依存**: 全走が 451 全緑だったため、「全走なら赤い門が単独走行で緑になる」
   を今回の掃射では**原理的に検出できない**。門をわざと壊して掃射し直す必要があるが、
   **実装を書き換えるなという掟に触れる**ので撃たなかった
2. **`verdict.js judge` が `total: 0` をどう裁くか**: 項目 4 の危険の帰結
   (BLOCK になるか SHIP になるか)は verdict.js を読んで撃つ必要があるが、時間切れ
3. **CI 上での実走**: tribunal.yml の shell 式は手元で再現したが、
   **GitHub Actions ランナー上での実際の挙動は撃っていない**(yml を編集できないため)
4. **並走**: 二つの `--gate` 走行を同時に走らせたときの Temp 衝突
   (93 行の註釈が pid で回避したと主張)は再検証していない

### 依存の連鎖の検査結果(要約)

**451 本 / 451 本を単独走行で掃射。差異 4 本。**

- 全走: `Paradise self-test: 451 passed, 0 failed`(exit 0)
- 単独走行で赤になった門: **4 本**
  `links nodes and shows neighbors` / `snapshot surfaces hubs and survives reload` /
  `predict A returns B ranked appropriately` /
  `lessons export recovers the scope so the lesson is not global`
- **原因を実測で確定**: 共有 `kgRoot`/`ccRoot` に前段の門が書いた状態を読む。
  前段の門を `--gate` に足すと **4 例すべて緑に戻る**(2 green, 0 red)
- 単独走行が異常に遅い門 1 本: `atlas: 全ての道が図になる…(第47条)` = **236.8 秒 / 緑**
- 残り 446 本は全走と一致(緑)

### 検証: 作業樹を汚していない

`git status --porcelain` に `tests/paradise.test.js` も `graph/` も**含まれていない**
(末尾の実行結果を参照)。攻撃用の使い捨ては全て `$LOCALAPPDATA/Temp` に置いた。

### 使い捨て(すべて `$LOCALAPPDATA/Temp`)

`gatelist.txt` `fullrun.txt` `evilgate.js` `evilgate2.js` `evilout.txt` `probe.js`
`tribunal-sim.sh` `sweep.py` `sweep.jsonl` `redos.py` `redos.jsonl` `iso-*/`
