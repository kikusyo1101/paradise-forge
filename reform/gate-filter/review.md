# review — 門の絞り込みの口 (gate-filter)

**相**: review(品質領域 / コード審査)
**枝**: `feat/gate-filter` / HEAD `088996a`
**審査対象**: `git diff 59aa00a..088996a -- tests/paradise.test.js`(130 行増 / 2 行減)
**掟**: この相は実装を書き換えない。作った物はこの `review.md` 一件のみ。
**作法**: 以下の判断はすべて**実際に撃った出力**に基づく。推測で書いた行は一つも無い。

---

## 0. 総評

この改革は**壊れていない**。境界例を 16 通り撃ったが、**引数解釈・exit 規約・
正規表現の扱いに誤りは一つも見つからなかった**(§3.5 の実測表)。局所走行は 0.07〜0.09 秒
で終わり、名乗り(`Paradise self-test:`)を局所走行が僭称しない配慮も、`process.env` を
一つも読まない配慮も、**理由が塊のコメントに書かれた上で自己診断の門に落とし込まれている**
(AC-16 / AC-17)。ここは賞賛ではなく実測の報告である。

審査の主題は実装の瑕疵ではなく、**prove が名指した網目** — 22 本の AC のうち
自己診断に常駐する門が 2 本しかない、という一点である。**本相はこれを再現した上で、
提案する門の雛形が実際に変異を捕まえることまで実測で確かめた**(§1.4)。

**指摘の本数: 重大 2 / 中 4 / 軽 4。**

---

## 1. 網目への所見 — どの AC を常駐の門に昇格させるべきか【最優先】

### 1.1 網目の再現(実測)

まず prove の主張を自分の目で確かめた。**実装は一字も触らず**、写しを作って変異を入れた。

```
$ cp tests/paradise.test.js tests/_scratch_mut.test.js
$ # 変異: ": GATE.matched === 0 ? 2"  →  ": GATE.matched === 0 ? 0"
$ node tests/_scratch_mut.test.js --gate 'gate-filter:'
門の絞り込み (gate-filter / 第22条):
  ✓ gate-filter: 絞り込みは環境変数を読まない
  ✓ gate-filter: census は自己診断を素で呼ぶ
Paradise gate-filter: 2 of 451 gates matched — 2 green, 0 red
exit=0                      ← 常駐する2本は変異に気づかない

$ node tests/_scratch_mut.test.js --gate 'ZZZ_NOPE' >/dev/null 2>&1; echo $?
0                           ← 本来 2。AC-11 が永久に沈黙している
```

**prove の指摘は正しい。** 1 文字の変異で AC-11 の主張が消えるが、自己診断は緑のままである。

常駐している門を数え上げた(実行時の名で数えた。静的解析ではない):

```
$ node tests/paradise.test.js --gate-list | grep '^gate-filter:'
gate-filter: 絞り込みは環境変数を読まない
gate-filter: census は自己診断を素で呼ぶ
```

**2 本。** 残り 20 本の AC は prove.md に記録された「かつて一度撃たれた記録」であって、
**門ではない**。第16条の言い方を借りれば、記録は「実体を読む」ものではない。

### 1.2 昇格の優先順位

判断の軸を先に置く。**「壊れたときに楽園が失うものの大きさ」×「1 文字変異で壊れる近さ」**である。
AC-16/AC-17 が既に常駐しているのは偶然ではない —— あれは**第22条(census 汚染)という
楽園全体の数を汚す罪**を守る門だからだ。同じ基準を残り 20 本に当てる。

| 順 | AC | 守るもの | 壊れたとき楽園が失うもの | 変異の近さ | 見積 |
|---|---|---|---|---|---|
| **1** | **AC-11** | マッチ 0 件 = exit 2 | **緑の意味**。CI が「0 本走って成功」を成功と読む。第16条が名指しで禁じた罪 | `? 2`→`? 0` の**1 文字** | **25 分** |
| **2** | **AC-13** | 局所走行が `Paradise self-test:` を名乗らない | **census の数**。局所走行の 2 を README の 451 に書き込む | `if (!GATE.active)` を消すだけ | **20 分** |
| **3** | **AC-14** | 最終行が census/tribunal 双方に読まれない | 同上 + **tribunal の判定**。`passed`/`failed` の語を戻すだけで再発 | 書式文字列の 1 語 | **20 分**(AC-13 と同じ門に同居可) |
| 4 | AC-12 | 不正な正規表現で走行を始めない | 誤った全走 451 本を「絞り込んだ」と誤認。6 分の浪費と誤った緑 | `catch` を握り潰す | 15 分 |
| 5 | AC-19/20/18 | 引数の誤りを黙って全走に落とさない | 打ち間違いが 6 分の全走に化ける | `die()` を消す | 20 分(3 本まとめて) |
| 6 | AC-09 | `--gate-list` が門を実行しない | 一覧が副作用を起こす。`--gate-list` の 0.07 秒が壊れる | `return` を消す | 15 分 |
| 7 | AC-01 | 引数なし全走の名乗りと exit が不変 | 後方互換。ただし**全走 6 分が要る**ので常駐の代が高い | — | (§1.5 で別扱い) |

**1〜3 を今相の推奨とする。** 4〜6 は次相でよい。**7 は常駐させてはならない**(§1.5)。

AC-02〜08 / AC-10 / AC-15 / AC-21 を推さない理由: これらは**振る舞いの記述**であって、
壊れたときに失うのは「絞り込みの便利さ」に留まる。AC-11/13/14 が失うのは**楽園が自分について
語る数の正しさ**であり、格が違う。第16条の「実体で裁く」に従えば、門にすべきは後者である。

### 1.3 実装の雛形(**実装するな。次相の材料である**)

手口は 4907 行の門(`門ヘルパー: test() の失敗が必ず数に載る`)と同じ ——
**`spawnSync` で自分自身を子プロセスとして撃つ**。集計を汚さずに済む。

配置先: `tests/paradise.test.js` の gate-filter 節(現 AC-16/17 の隣、8276 行付近)。

```js
// ── 絞り込みの口が自分の掟を守っていることを、自己診断が毎回撃って確かめる ──
// 手口は 4907 行の門と同じ: 自分自身を子プロセスで起こす。集計 (pass/fail) を汚さない。
// 1 本あたり実測 60ms 前後。全走への上乗せは 3 本で 0.2 秒未満 (NFR-01 に影響しない)。
const gateRun = (...args) =>
  require('child_process').spawnSync(process.execPath, [__filename, ...args],
    { encoding: 'utf8' });

test('gate-filter: マッチ 0 件は緑ではない — exit 2 で鳴る (AC-11 / 第16条)', () => {
  // 業界既定 (node:test / Jest / Mocha / Vitest の 4/4) は exit 0。楽園はここで袂を分かつ。
  // 「0 本走って成功」を成功と読ませない —— 緑の意味を守る門である。
  const r = gateRun('--gate', 'zzz-no-such-gate-zzz');
  assert.strictEqual(r.status, 2,
    `マッチ 0 件の exit が ${r.status} — 0 本しか走らなかった走行が緑になっている (第16条)`);
  assert.match(r.stdout, /0 of \d+ gates matched — nothing was measured/,
    `0 件の名乗りが変わった: ${r.stdout.trim().split('\n').pop()}`);
  // `passed` の語が出ないこと = census.js:57 の保険経路にも読まれないこと
  assert.strictEqual(r.stdout.split('\n').filter((l) => /passed/.test(l)).length, 0,
    '0 件走行が passed を名乗った — census がこれを拾う');
});

test('gate-filter: 絞り込んだ走行は Paradise self-test: を名乗らない (AC-13 / 第22条)', () => {
  // census.js:55 が読む名乗り。局所走行の 2 本が README の 451 に化けるのを塞ぐ主門。
  const r = gateRun('--gate', '^gate-filter: census は自己診断を素で呼ぶ$');
  assert.strictEqual(r.status, 0, `門 1 本の走行が exit ${r.status}: ${r.stderr.slice(0, 200)}`);
  assert.strictEqual((r.stdout.match(/Paradise self-test/g) || []).length, 0,
    '絞り込み走行が Paradise self-test: を名乗った — census が局所の数を全走の数として読む');
});

test('gate-filter: 絞り込み走行の最終行は census / tribunal の双方に読まれない (AC-14 / 第22条)', () => {
  // 三者の読み口を全部塞いでいることを一度に撃つ。
  // census.js:55 (名乗り) / census.js:57 (保険 matchAll) / tribunal.yml:307,308 (passed|failed)
  const r = gateRun('--gate', '^gate-filter: census は自己診断を素で呼ぶ$');
  const last = r.stdout.trim().split('\n').pop();
  for (const [re, who] of [
    [/Paradise self-test:\s*\d+ passed, \d+ failed/, 'census.js:55'],
    [/\d+ passed, \d+ failed/,                       'census.js:57 (保険)'],
    [/\d+ passed/,                                   'tribunal.yml:307'],
    [/\d+ failed/,                                   'tribunal.yml:308'],
  ]) {
    assert.strictEqual(re.test(last), false,
      `絞り込み走行の最終行が ${who} に読まれる: ${last}`);
  }
});
```

**見積の内訳**(3 本合計 **約 65 分**): 雛形の移植 15 分 / 変異で鳴ることの確認 3 本 × 10 分 /
全走 1 回で NFR-01 への影響を測る 6 分 / build.md への追記 10 分。

### 1.4 雛形が実際に変異を捕まえることの実測

**雛形を書いただけでは門ではない**(第16条)。鳴ることを確かめた。
実装は触らず、変異させた写しを `$LOCALAPPDATA/Temp/mut.test.js` に置き、雛形をそれに向けた。

健全な実装に対して(所要は各 60ms 前後):

```
$ node tpl.js
AC-11 OK 61 ms
AC-13 OK 58 ms
AC-14 OK  最終行= Paradise gate-filter: 1 of 451 gates matched — 1 green, 0 red 0 ms
```

`? 2` → `? 0` の変異を入れた写しに対して:

```
$ node tpl_mut.js
AssertionError [ERR_ASSERTION]: AC-11 exit
(node exit=1)
```

**現在すり抜けている変異が、この門では鳴る。** 網目はこれで塞がる。
所要は 3 本で 0.2 秒未満であり、NFR-01 の裁定(§2)とは独立に導入できる。

### 1.5 【指摘 M-1・中】AC-01/AC-22 を常駐の門にしてはならない

上の表の 7 番を明示的に否定しておく。AC-01(全走の名乗り)と AC-22(全走の所要)は
**全走 6 分を要する**。これを自己診断の中に入れると**自己診断が自分を全走で呼ぶ再帰**になる。
次相が「22 本すべてを常駐させよ」と読み違える危険があるため、ここに書き留める。

**この 2 本の正しい置き場は自己診断ではなく `census.js` / CI である** —— 実際 census は
既に全走を起こして名乗りを読んでいる(`census.js:54 summaryOf`)。AC-01 は事実上
**census が毎回撃っている**。二重に持つ必要は無い。

---

## 2. NFR-01 の裁定案

### 2.1 事実(実測値のみ)

| 出所 | 全走の所要 | 母数 |
|---|---|---|
| requirements.md:291(改革前の基準) | 358.8 秒 | 449 |
| build.md:317 | 364.5 秒 | 451 |
| prove.md:45 | 360.2 秒 | 451 |
| prove.md:702(M-19) | 365 秒 | 451 |
| **本相の実測(§2.1a)** | **350 秒** | **451** |
| **NFR-01 の上限** | **362.4 秒**(= 358.8 × 1.01) | **449 で定めた** |

**閾値 362.4 秒は、観測された揺れの内側にある。**
同じ健全な実装が、走らせるたびに緑にも赤にもなる。

#### 2.1a 本相が自分で測った全走(揺れは prove の記録よりさらに広い)

背景走行で実測した(`date +%s` で前後を挟んだ):

```
START=1788939570
EXIT=0
END=1788939920
Paradise self-test: 451 passed, 0 failed
```

**350 秒 / 451 本 / exit 0。**

**これは既知の 4 つの観測すべてより速い。** 揺れの幅は prove が記録した
360.2〜365(4.8 秒)ではなく、**350〜365 の 15 秒**である。**閾値 362.4 秒は
この幅のほぼ中央を横切っている** —— 健全な実装が、同じ日に、緑にも赤にもなる。
**C-1 は prove の見立てよりさらに重い。**

### 2.2 【指摘 C-1・重大】これは門ではなく賽である

第38条は「**秤が揺れるなら、それは秤ではない**」と明記している(`node graph/codex.js article 38`)。

> **決定的に測れるものは決定的に測る。**(…)同じ走行には常に同じ点
> (LLM に尋ねない — **秤が揺れるなら、それは秤ではない**)。

NFR-01 は現状**秤ではない**。しかも prove の M-19 が実証したとおり、
**壊しても鳴らなかった**(prove.md:585「壊したのに赤くならなかった」)。
揺れより狭い閾値は、鳴っても意味が無く、鳴らなくても意味が無い。

さらに第38条は「**同じ母数で語れ**」を含意する。358.8 秒は **449 本**の所要であり、
364.5 秒は **451 本**の所要である。**分母が違う二つの数の比を取って 1.01 と裁いている。**
これは第22条(「数は測られ、比較されねばならない」)の趣旨にも反する。

### 2.3 裁定案 — **閾値を広げるのではなく、裁く量を変えるべきである**

閾値を広げるだけの案(例: 380 秒)は却下を推す。理由は二つ:

1. **広げれば門は鳴らなくなる。** 揺れが 4.8 秒あるなら、真に有意な劣化(例: +3 秒)は
   永久に検出できない。鳴らない門は門ではない(第16条)。
2. **母数の問題が残る。** 449 と 451 を同じ絶対秒で裁く限り、門を足すたびに閾値の意味が動く。

**推奨: NFR-01 を「全走の絶対秒」から「1 門あたりの所要(秒/門)」に書き換える。**

```
NFR-01 (改訂案):
  全走の 1 門あたり所要 = 全走秒 ÷ 実行時の門数 が、改革前の基準
  (358.8 ÷ 449 = 0.7991 秒/門) の +10% 以内 = 0.8790 秒/門 以下。
  測定は連続 3 回の中央値を採る(単発の値では裁かない)。
```

この案の根拠(実測から):

- **母数の問題が消える。** 門を足しても割り算が吸収する。第38条の「同じ母数で語れ」を満たす。
- **観測された 4 つの実測がすべて通る**:

  | 観測 | 秒/門 |
  |---|---|
  | 本相 350 ÷ 451 | **0.7761** |
  | prove 360.2 ÷ 451 | **0.7987** |
  | build 364.5 ÷ 451 | **0.8082** |
  | prove M-19 365 ÷ 451 | **0.8093** |

  **揺れ幅は 0.0332 秒/門。許容幅は 0.0799 秒/門** —— **揺れの約 2.4 倍の余裕**がある。
  ここが現行との決定的な違いである(現行は揺れ 15 秒に対し余裕が実質ゼロ)。
- **有意な劣化は捕まる**: `test()` に重い処理を足して 1 門あたり +10% 劣化すれば必ず鳴る。
- **中央値 3 回**は第38条の「決定的に測る」に寄せる工夫。単発の外れ値で赤くしない。

**+5% ではなく +10% を採る理由**(本相は当初 +5% を書いたが、自分で測った 350 秒を得て
改めた): +5%(許容幅 0.0400)では揺れ 0.0332 が許容幅の **83%** を占め、
**再び「揺れとほぼ同じ広さの閾値」に戻ってしまう**。C-1 と同じ過ちを小さく繰り返すだけである。
**閾値は揺れの倍以上に取らねば門にならない。**

**代案(採らない理由も記す)**: 「NFR-01 を落として gauge に委ねる」も考えたが、
gauge が測るのは**走行の軌跡**(差し戻し・再試行)であって**自己診断の実行時間**ではない。
別の量である。NFR-01 は残すべきで、直すべきは**単位**である。

**この裁定は verify 相ではなく、requirements.md の改訂を要する**(build.md:345 が
「verify 相が判ずること」と持ち越したが、AC の期待値を書き換える以上は requirements の
改訂である)。**本相は実装も requirements も触っていない** —— 提案に留める。

---

## 3. 実装の審査

### 3.1 引数解釈の中で `process.exit(2)` を直接呼ぶこと — **妥当**

`die()` は `process.stderr.write` の直後に `process.exit(2)` を呼ぶ。
一般には「トップレベルの副作用で exit するな」が定石だが、**ここは妥当**と判ずる:

1. この塊は**モジュールとして require されない**。`paradise.test.js` は実行専用である。
2. 引数が不正なら**走行を始めてはならない**(AC-12 の主張そのもの)。例外を投げて
   上位に委ねる先が無い(トップレベル IIFE である)。
3. **stderr の切り捨てが起きないことを実測した。** `process.exit` は非同期の書き込みを
   切り捨てうるが、Windows のファイル/パイプ宛で 3 回とも全文が届いた:

```
試行1 exit=2 stderr=[Paradise gate-filter: invalid pattern [: Invalid regular expression: /[/: Unterminated character class]
試行2 exit=2 (同上)
試行3 exit=2 (同上)
```

4091 バイトの長いメッセージでも切り捨てが無いことも確かめた(`'('×2000` のパターン)。

**指摘なし。** ただし §3.2 の `die` の型については軽微な指摘を一つ置く(L-1)。

### 3.2 【指摘 L-1・軽】`die()` の戻り値型が `comp()` の中で嘘をつく

```js
const comp = (arr) => arr.map((p) => {
  try { return new RegExp(p); }
  catch (e) { die(`...`); }        // ← die は never を返すが、型上は undefined
});
```

`die()` が `process.exit` で抜けるので実害は無い(実測でも `exit=2`)。
だが**読み手には `INC` に `undefined` が混ざりうるように見える**。
`catch { die(...); throw new Error('unreachable'); }` とするか、
`die` の宣言に「この関数は戻らない」と一行コメントを添えるのが親切である。
**動作は正しい。可読性のみの指摘。**

### 3.3 `typeof GATE !== 'undefined'` の守り — **正しい解。ただし理由の記録が要る**

これは**設計の妥協ではなく、正しい解**と判ずる。理由:

4907 行の門は `test()` の**ソースを正規表現で抜き出して子プロセスで走らせる**:

```js
const m = src.match(/function test\(name, fn\) \{[\s\S]*?\n\}/);
spawnSync(process.execPath, ['-e', `let pass=0,fail=0;\n${m[0]}\ntest(...)`]);
```

子プロセスには `GATE` が存在しない。`GATE` を裸で参照すれば `ReferenceError` で
**「集計行が嘘をつかない」という門の根が落ちる**。build.md はこれを実測で踏んでいる。

**他の手はあったか。** 三つ検討した:

| 案 | 評価 |
|---|---|
| `const GATE = ...` を `var` にして巻き上げる | **不可**。子プロセスには宣言自体が無い。同じ `ReferenceError` |
| `test()` の外で `if (GATE.active)` を判定し、`test` を二種類定義し分ける | **不可**。抜き出しの正規表現 `/function test\(name, fn\) \{...\}/` が一致しなくなり、4907 行の門が別の理由で落ちる |
| 抜き出し側(4907 行)に `let GATE` を注入する | **可能だが劣る**。門の側を絞り込みの都合で書き換えることになる。**門の根を機能の都合で緩めてはならない** |
| **`typeof GATE !== 'undefined'`(採用案)** | **最善**。絞り込みの側が退く。「絞り込みが無い世界でも `test()` は単体で正しく数える」という不変条件が明示される |

**採用案が正しい。** しかも塊のコメントに**なぜそうしたかが実測付きで書かれている**
(「実測で落ちた」)。これは第16条の求める「実体を読む」記録である。**指摘なし。**

### 3.4 【指摘 M-2・中】report ブロックの入れ子三項に分岐の漏れは無いが、`--gate-list` の 0 件が二重に裁かれる

exit の決定:

```js
process.exit(!GATE.active ? (fail === 0 ? 0 : 1)
  : GATE.matched === 0 ? 2
  : GATE.list ? 0
  : (fail === 0 ? 0 : 1));
```

網羅性を状態空間で確かめた。状態は `(active, matched===0, list, fail===0)` の 16 通りだが、
`active=false` のとき `matched` と `list` は到達不能(list なら active が真)なので実質 6 通り。
**すべての枝に終端がある。漏れは無い**(実測 §3.5 の 16 例で確認)。

ただし**表示側と exit 側で 0 件の扱いが食い違って見える**:

```
$ node tests/paradise.test.js --gate 'ZZZ_NOPE'
Paradise gate list: 0 of 451 gates matched — nothing was measured    ← "gate list" と名乗る
exit=2
```

`--gate-list` を渡していないのに **`gate list` を名乗る**。
design.md:558「§5.3 マッチ 0 件が `gate list` を名乗ることについて」がこれを
**意図的な選択として記録しており**、AC-11(requirements.md:374)が明文で
`Paradise gate list:` を要求している。**よって実装は仕様どおりであり、実装の瑕疵ではない。**

だが**仕様の側が読み手を誤らせる**。`--gate-list` を渡していない走行が `gate list` を
名乗る理由は、design.md を読まないと分からない。しかも:

```
$ node tests/paradise.test.js --gate 'gate-filter' --gate-not 'gate-filter'
Paradise gate list: 0 of 451 gates matched — nothing was measured
exit=2
```

**包含と除外が同じ門に当たる場合も同じ経路**である(除外が勝つ = AC-04 のとおり正しい)。
この二つは原因が違う(綴り間違い / 除外の衝突)のに**同じ一行**しか出ない。
**推奨**: 次相で `Paradise gate-filter: 0 of 451 gates matched — nothing was measured` に
統一し、AC-11 の期待値も併せて改訂すること。**今相では直さない**(AC が明文で縛っているため、
実装だけ直すと AC-11 が赤くなる。requirements と同時に動かすべき)。

### 3.5 境界例の実測(16 例)

すべて実際に撃った。`exit` はパイプを経由せず直接取得した。

| # | 入力 | 実出力(最終行) | exit | 判定 |
|---|---|---|---|---|
| B1 | `--gate 'gate-filter' --gate-not 'gate-filter'` | `Paradise gate list: 0 of 451 gates matched — nothing was measured` | **2** | ○ 除外が勝つ(AC-04) |
| B2 | `--gate-list --gate 'gate-filter'` | `Paradise gate list: 2 of 451 gates matched` | 0 | ○ 併用可・名のみ |
| B3 | `--gate A --gate B`(多重) | `Paradise gate-filter: 2 of 451 gates matched — 2 green, 0 red` | 0 | ○ OR(AC-06) |
| B4 | `--gate-list --gate-list --gate X` | `Paradise gate list: 2 of 451 gates matched` | 0 | ○ 冪等 |
| B5 | `--gate '絞り込みは環境変数'` | `1 of 451 gates matched — 1 green, 0 red` | 0 | ○ 非 ASCII |
| B6 | `--gate '[絞込]み'` | `1 of 451 gates matched — 1 green, 0 red` | 0 | ○ 非 ASCII 文字クラス |
| B7 | `--gate 'ZZZ_NO_SUCH_GATE_ZZZ'` | `0 of 451 … nothing was measured` | **2** | ○ AC-11 |
| B8 | `--gate '['` | `invalid pattern [: Invalid regular expression…` | **2** | ○ AC-12 |
| B9 | `--gate ''` | `--gate requires a pattern` | **2** | ○ AC-20 |
| B10 | `--gate`(値なし) | `--gate requires a pattern` | **2** | ○ AC-19 |
| B11 | `--bogus` | `unknown flag --bogus` | **2** | ○ AC-18 |
| B12 | `--gate --gate-not` | `--gate requires a pattern` | **2** | ○ `^--` の守り |
| B13 | `--gate 'a'×1000 / ×10000 / ×30000` | `0 of 451 … nothing was measured` | **2** | ○ 長大でも正常 |
| B14 | `--gate 'a'×100000` | (シェルが起動できず) | 126 | △ §3.6 |
| B15 | `--gate '(a+)+$'`(ReDoS 型) | `0 of 451 … nothing was measured` / **93ms** | **2** | ○ 破局的後戻りなし |
| B16 | `--gate-list`(全件) | `Paradise gate list: 451 gates` / 452 行 | 0 | ○ AC-07 |

`--gate-list` の所要 **0.071 秒**、狭い `--gate` の所要 **0.091 秒**(`time` 実測)。

**引数解釈と exit 規約に瑕疵は見つからなかった。**

### 3.6 【指摘 L-2・軽】極端に長いパターンは OS の制約であり、実装の瑕疵ではない

10 万字のパターンで `exit=126` が出るが、原因は実装ではない:

```
FileNotFoundError: [WinError 206] ファイル名または拡張子が長すぎます。
```

Windows の `CreateProcess` の argv 上限(約 32767 字)に当たっている。
**`node` が起動する前に OS が拒んでいる。** 3 万字までは正常に動く(B13)。
**修正不要。** 記録として残すのみ。

### 3.7 【指摘 M-3・中】`--gate=X` 形式が「未知のフラグ」として扱われる

```
$ node tests/paradise.test.js --gate='gate-filter'
Paradise gate-filter: unknown flag --gate=gate-filter
exit=2
```

**これは正しい振る舞い**である(AC-18: 打ち間違えたフラグは黙って全走に落ちない)。
**黙って全走に落ちないので害は無く、exit 2 で明示的に鳴る。**

だが `--flag=value` は GNU 系 CLI の広く行き渡った慣習であり、**利用者は必ず一度は踏む**。
エラー文言が `unknown flag --gate=gate-filter` では、**何が悪いのか分からない**
(利用者は「`--gate` は知っているフラグのはずだ」と思う)。

**推奨**(次相 / 15 分): 文言を親切にする。実装を増やさず一行で足りる。

```js
die(`Paradise gate-filter: unknown flag ${a}` +
    (/^--gate(-not)?=/.test(a) ? ` — 値は空白で区切れ: ${a.split('=')[0]} '${a.split('=').slice(1).join('=')}'` : ''));
```

`--gate=X` を**受理せよ**とは言わない。受理すると AC-18 の「黙って落ちない」の線引きが
曖昧になる。**拒否したまま、理由を告げるべき**である。

### 3.8 【指摘 C-2・重大】`--gate-list` が `console.log` を差し替える手口は、失敗を飲み込む

```js
if (GATE.list) console.log = () => {};
```

**意図は正しい**。33 個の節見出し(`console.log('Graph engine:')` など)を書き換えずに
黙らせるため(NFR-04)であり、`GATE.say` は `process.stdout.write` を**束縛済みで退避**して
あるので一覧そのものは届く。**設計としては筋が通っており、実測でも 451 行が正しく出る**(B16)。

**危険はそこではない。** `--gate-list` は `test()` の中で `fn` を呼ばずに `return` するので、
通常は門の本文が走らない。**しかし `console.log` の差し替えはトップレベルの副作用より後、
かつプロセス全体に効く。** 帰結:

1. **`--gate-list` 中に起きた例外の診断が消える。** 門の外(トップレベル)で
   `console.log` を使って報告するコードがあれば、それも黙る。
2. **将来 `test()` の外で警告を出す実装が入ったとき、`--gate-list` でだけ静かに消える。**
   これは**気づけない類の欠落**である。差し替えは `console.log` を**復元しない** ——
   プロセスが終わるまで戻らない。

実測で害が出ていないことは確かめた(B16 で 451 行 + 集計行 = 452 行、欠落なし)。
**よって今すぐ壊れてはいない。** だが**この一行を守る門が無い**:

```
$ node tests/paradise.test.js --gate-list | wc -l
452
```

`console.log = () => {}` を消しても `--gate-list` は動く(節見出しが混ざるだけ)。
**混ざったことを誰も検出しない。** AC-07 の門(§1.2 の 6 位)を常駐させれば
「出力行が門の数 + 1 行ちょうど」を撃てるので、**この危険は AC-09/AC-07 の常駐で同時に塞がる**。

**推奨**: `console.log` の差し替えを**やめよ**とは言わない(代案の
「33 箇所を書き換える」は NFR-04 に反する)。**行数の門を常駐させて、
差し替えが効いていることを機械に見張らせよ。**

```js
test('gate-filter: --gate-list の出力は門の名だけである (AC-07 / AC-09 / NFR-04)', () => {
  const r = gateRun('--gate-list');
  assert.strictEqual(r.status, 0, `--gate-list が exit ${r.status}`);
  const lines = r.stdout.trim().split('\n');
  const tail = lines.pop();
  const m = tail.match(/^Paradise gate list: (\d+) gates$/);
  assert.ok(m, `--gate-list の集計行が変わった: ${tail}`);
  assert.strictEqual(lines.length, Number(m[1]),
    `名の行が ${lines.length} 行だが集計は ${m[1]} 門 — 節見出しが混ざっている` +
    ` (console.log の差し替えが効いていない / NFR-04)`);
  // 門を実行していない証拠 (AC-09)
  assert.strictEqual(lines.filter((l) => /^\s*[✓✗]/.test(l)).length, 0,
    '--gate-list が門を実行した — 一覧は 0.07 秒で終わる約束である');
});
```

---

## 4. 文書の整合

### 4.1 【指摘 C-2 の隣・M-4・中】静的 `test(` の数が文書間で三通りに割れている

prove は「requirements は 442 と書くが実測は 443」を見つけた。**本相はその根がもっと深いことを見つけた。**

```
$ grep -c '^test(' tests/paradise.test.js                      # 現行 (088996a)
443
$ git show 59aa00a:tests/paradise.test.js | grep -c '^test('   # 改革前
441
```

**改革前は 442 ではなく 441 である。** 文書の記述と突き合わせる:

| 出所 | 記述 | 実測 | 判定 |
|---|---|---|---|
| requirements.md:214 | 「ソース上の行頭 `test(` は **442**」(改革前) | **441** | **✗ 誤り** |
| requirements.md:218 | 「**442 − 1 + 8 = 449**」 | 441 − 0 + 8 = 449 | **✗ 式が誤り(答だけ合う)** |
| requirements.md:351 | 「静的解析で作れば **442** を名乗り」 | 441 | **✗ 誤り** |
| design.md:119 | 「静的な `test(` は 442 のまま + 新門 2 = **444** ≠ 451」 | 441 + 2 = **443** | **✗ 誤り** |
| design.md:444 | 「静的な `test(` は 442。**7 本の差**」 | 441。差は **8 本** | **✗ 誤り** |
| design.md:760 | 「`Paradise gate list: **442** gates` になる」 | 441 | **✗ 誤り** |
| build.md:205 | 「AC-07(静的解析なら **442**)」 | **443**(現行) | **✗ 誤り** |
| build.md:301 | 「静的 **442** / 実行時 **449** の差 **7**」 | 441 / 449、差 **8** | **✗ 誤り** |
| prove.md:160 | 「requirements は 442 だが**実測は 443**」 | 443(現行) | **○ 正しい** |

**根の誤りは「改革前の静的値 442」である**(実際は 441)。ここから派生して
**「差は 7 本」**という記述が二箇所にあるが、**実際の差は 8 本**である。検算:

```
$ node tests/paradise.test.js --gate-list | grep -c '^dashboard-count 系: '
8
```

`dashboard-count` のループが**行頭でない** `test(` から **8 本**を生む(2762 行、インデント有り)。
インデントされた `test(` は行頭正規表現 `^test(` に数えられないので、
**静的 441 + ループ 8 = 実行時 449**。**ちょうど合う。**

requirements.md:218 の「442 − 1 + 8 = 449」は、**442 という誤った値**と
**− 1 という存在しない補正**が偶然打ち消し合って正しい答に着地している。
**式が偶然正しい答を出しているのが最も危険な形**である —— 次に誰かが門を足したとき、
この式は静かに間違える。

**推奨**: requirements.md / design.md / build.md の「442」を **441**(改革前)または
**443**(現行)に、文脈に応じて訂正し、「差 7」を **差 8** に訂正する。
**式は「静的(行頭)441 + ループ展開 8 = 449」と書き直すべき**である。

**本相は文書を書き換えない**(掟)。次相への申し送りとする。

### 4.2 【指摘 L-3・軽】design.md:117 に「447」という出所不明の数がある

design.md:117(AC-05 の行)に `447 of 449` とあり、これは
「449 − Atlas 重 2 本 = 447」で**正しい**。同じ行の改訂後が
`449 of 451`(451 − 2 = 449)で**これも正しい**。**誤りではない。**

ただし **449 が「改革前の総数」と「改革後の AC-05 の分子」の二つの意味で使われている**ため、
表を拾い読みすると混乱する。**実害なし。可読性の指摘に留める。**

### 4.3 文書どおりで正しかったもの(実測で確認)

難癖を避けるため、**合っていたもの**も記録する。

```
$ node tests/paradise.test.js --gate '^gauge\(故障注入\): ' --gate-list | tail -1
Paradise gate list: 11 of 451 gates matched          ← AC-03 の「11」 ○ 一致

$ node tests/paradise.test.js --gate-list | grep -c '^dashboard-count 系: '
8                                                     ← AC-08 の「8」 ○ 一致

$ node tests/paradise.test.js --gate 'schedules a simple diamond' | grep -c 'Paradise self-test'
0                                                     ← AC-13 ○ 一致

$ L=$(node tests/paradise.test.js --gate 'schedules a simple diamond' 2>&1 | tail -1)
最終行: Paradise gate-filter: 1 of 451 gates matched — 1 green, 0 red
0 / 0 / 0 / 0                                         ← AC-14 の「0 が 4 行」 ○ 一致

$ node tests/paradise.test.js --gate-list | tail -1
Paradise gate list: 451 gates                         ← AC-07 の「451」 ○ 一致
```

**AC-03 / AC-07 / AC-08 / AC-13 / AC-14 の期待値は、文書の記述と実測が完全に一致した。**
数の誤りは §4.1 の「静的 `test(` の数」の系統に**限局している**。

### 4.4 【指摘 L-4・軽】`prove.md` が版管理に入っていない

```
$ git status --porcelain
 M reform/gate-filter/conclave.json
?? reform/gate-filter/prove.md
?? reform/gate-filter/review.md
```

`prove.md`(767 行)が **`??`(untracked)** である。prove 相は批准済みと聞いているが、
**成果物が commit されていない**。本相の `review.md` も同様に untracked である(当然)。
**次相かマージ前に `git add` されることを確認すべき。** 実装には影響しない。

---

## 5. 指摘の一覧

### 重大 (2)

| 番号 | 指摘 | 根拠 |
|---|---|---|
| **C-1** | **NFR-01 が門ではなく賽である。** 閾値 362.4 秒 < 揺れ幅(360.2〜365)。かつ 449 で定めた閾値で 451 を裁いている。第38条「秤が揺れるならそれは秤ではない」に正面から反する | §2 / prove M-19 |
| **C-2** | **22 本の AC のうち常駐する門は 2 本のみ。** `? 2`→`? 0` の 1 文字変異で AC-11 が永久に沈黙するが全走は緑(実測で再現)。`--gate-list` の `console.log` 差し替えも同様に無防備 | §1.1 / §3.8 |

### 中 (4)

| 番号 | 指摘 |
|---|---|
| **M-1** | AC-01 / AC-22 を常駐の門にしてはならない(全走 6 分の再帰になる)。次相が「22 本すべて常駐」と読み違える危険。正しい置き場は census / CI(§1.5) |
| **M-2** | `--gate-list` を渡していない 0 件走行が `gate list` を名乗る。かつ「綴り間違い」と「除外の衝突」が同じ一行に潰れる。**AC-11 が明文で縛っているので実装は正しい** — 直すなら requirements と同時に(§3.4) |
| **M-3** | `--gate=X` 形式が `unknown flag --gate=gate-filter` としか言わない。**振る舞いは正しい(exit 2)** が、GNU 慣習を踏んだ利用者に理由が伝わらない(§3.7) |
| **M-4** | **静的 `test(` の数が文書間で三通りに割れている。** 根の誤りは「改革前 442」(実測 441)。「差 7」は実際 8。requirements.md:218 の式は**誤りが打ち消し合って偶然正解している**(§4.1) |

### 軽 (4)

| 番号 | 指摘 |
|---|---|
| **L-1** | `die()` が `comp()` の `catch` で「戻らない関数」であることが型・読解上わからない(§3.2) |
| **L-2** | 10 万字パターンの `exit=126` は Windows `CreateProcess` の argv 上限(WinError 206)。**実装の瑕疵ではない**。3 万字までは正常(§3.6) |
| **L-3** | design.md:117 の `447` / `449` は正しいが、`449` が二つの意味で使われ拾い読みしにくい(§4.2) |
| **L-4** | `prove.md` が untracked のまま。マージ前に `git add` の確認を(§4.4) |

---

## 6. 次相への申し送り(優先順)

1. **AC-11 / AC-13 / AC-14 を常駐の門に昇格**(§1.3 の雛形をそのまま使える。**変異で鳴ることは
   本相が実測済み** §1.4)。**約 65 分。全走への上乗せは 0.2 秒未満**
2. **NFR-01 を「秒/門」に改訂**(§2.3)。requirements.md の改訂を伴う
3. **文書の数の訂正**(§4.1)。442 → 441/443、差 7 → 差 8、式の書き直し
4. AC-07 / AC-09 / AC-12 / AC-18/19/20 の常駐(§1.2 の 4〜6 位)。約 50 分
5. M-2 / M-3 の文言改善(requirements と同時に)

---

## 7. 掟の遵守

本相は**実装を一行も書き換えていない**。変異の検証はすべて写し
(`tests/_scratch_mut.test.js` → 削除済み、`$LOCALAPPDATA/Temp/mut.test.js`)に対して行った。

```
$ git status --porcelain
 M reform/gate-filter/conclave.json
?? reform/gate-filter/prove.md
?? reform/gate-filter/review.md
```

**`M tests/paradise.test.js` は無い。** `conclave.json` は環が書いた相の状態であり、本相は触っていない
(審査開始時点で既に `M` であった)。`review.md` が本相の成果物である。
