# 品質審査 — reform/dashboard-living-gate

**審査対象**: `ce89686..HEAD`(38 ファイル / +5535 −1314)
**基準**: `reform/dashboard-living-gate/requirements.md` / `design.md`
**審査日**: 2026-09-02
**掟**: 感想を書かない。走らせた実出力だけが根拠である。指摘には file:line を添える。

---

## 0. 総括 — 指摘 11 件

| # | 重篤度 | 観点 | 件名 | 場所 |
|---|---|---|---|---|
| F-1 | **重大** | ③エラー処理 | **基点の「278 passed, 0 failed」が再現しない。2 回走らせて 277/1 と 276/2** | `graph/motion-probe.mjs:62` |
| F-2 | **重大** | ①嘘の註釈 | `census.js:73` の「timeout は 120 秒」が**コードと食い違う**(実値 600000ms) | `graph/census.js:73` vs `:83` |
| F-3 | 中 | ①嘘の註釈 | 「実測 120,072ms」は**打ち切り時刻**であって所要ではない疑い。実所要は 142,062ms | `graph/pulse.js:22` / `graph/census.js:297` |
| F-4 | 中 | ①嘘の註釈 | 「自己診断は 282 秒」が実測 142 秒と 2 倍食い違う | `graph/census.js:73` / `tests/dashboard-perf.test.js:38` |
| F-5 | 中 | ②重複 | **`thresholds` を断面に載せているが、誰も読んでいない**。画面は自前の `TH` を持つ | `graph/pulse.js:469-474` |
| F-6 | 中 | ②重複 | `control.html` が `paradise.js` の 5 関数を写経している | `dashboard/control.html:140,159,136,149,176` |
| F-7 | 中 | ③エラー処理 | **`control.html` は counts が null でも「測れず」と言わず、文字列 `null` を画面に出す** | `dashboard/control.html:219` |
| F-8 | 小 | ④命名 | `errors[].engine` が design.md の `conclave-read` に対し実装は `conclave` | `graph/pulse.js:251,259,264` vs design.md:448,613 |
| F-9 | 小 | ④命名 | 断面の 3 鍵(`thresholds` / `buildMs` / `atlas`)が design.md §1.3.1 の表に無い | `graph/pulse.js:467,469,484` |
| F-10 | 小 | ⑤死んだコード | `bodyOf()` が定義のみで**一度も呼ばれない** | `dashboard/paradise.js:114` |
| F-11 | 小 | ①註釈 | `paradise.js:6` の「実測 33 engine」が現在 34。註釈が数値を固定している | `dashboard/paradise.js:6` |

**緑と認めた事実**(いずれも実走で確認):

- 断面は 20 鍵すべて埋まり `errors: []`、`exit 0`(`node graph/pulse.js snapshot --json`)
- 故障注入 5 本同時でも断面は落ちない。`errors[]` 14 件、他の鍵は健在
- 閾値 `FRESH_*` / `POLL_*` は engine と画面で二重定義だが **テストが一致を機械で裁いている**(F-5 参照)
- `ledger` の 3 値一致(断面 30 / `readLedger()` 30 / JSONL 30 行)
- `contradiction` は実測 3 件で design.md §1.3.4 の記述と一致
- `motion-probe-leak.test.js` は 5 passed、プロファイル差 0

---

## 1. 可読性と註釈の質 — 註釈が主張する数値を実際に走らせた

この改修は「註釈に実測値を残す」方針を取った。**方針そのものは実行されている**。
`pulse.js` の冒頭 32 行は設計判断の根拠を実測で示し、`atlas.js:957-1006` は
席割りを「四つ試して二つを採った」と実測の一覧で語る。**これは良い**。

しかし**主張した数値を実際に走らせると、3 件が食い違った**。

### F-2【重大】`census.js:73` の「timeout は 120 秒」はコードと食い違う

```
$ sed -n '73p' graph/census.js
     * 実測: 自己診断は 282 秒かかるのに timeout は 120 秒である。**構造的に必ず

$ sed -n '83p' graph/census.js
    const TIMEOUT_MS = Number(opts.testTimeoutMs || process.env.CENSUS_TEST_TIMEOUT_MS || 600000);
```

**註釈は「120 秒」と述べ、10 行下のコードは 600000ms = 600 秒である。**
これはこの改修が**自ら直した箇所**であり(600000 への引き上げがこの diff に含まれる)、
註釈だけが是正前の値のまま取り残されている。

註釈は「構造的に必ず打ち切られる」と読者に告げるが、**現在のコードでは打ち切られない**
(実所要 142 秒 < 600 秒)。読者は存在しない病を信じることになる。

**修正案**(実装するな・審査が仕事である):
`graph/census.js:73-75` を、既定 600000ms と実所要を対比する記述に改める。

```
* 実測(2026-09-02): 自己診断は 142 秒。既定 timeout は 600 秒(:83)なので
* 通常は打ち切られない。ただし CENSUS_TEST_TIMEOUT_MS で短く指定された場合、
* 打ち切り時の部分出力を真実として報告してはならない(第16条)。
```
**「なぜ null にするか」の論理は正しい。数字だけが古い。**

### F-4【中】「自己診断は 282 秒」が実測と 2 倍食い違う

```
$ s=$(date +%s%N); node tests/paradise.test.js; e=$(date +%s%N); echo $(( (e-s)/1000000 ))
elapsed_ms=142062
```

**実測 142 秒。註釈の 282 秒はその 1.98 倍**である。
同じ数値が `tests/dashboard-perf.test.js:38` にも写経されている:

```
assert.ok(!/paradise\.test/.test(pulseSrc), '自己診断を呼んでいる — 単体 282 秒');
```

テストの assert 文言なので門の合否には影響しないが、**同じ古い数が 2 箇所に散っている**。

**修正案**: `census.js:73` と `dashboard-perf.test.js:38` の 282 を実測値に改め、
測った日付を添える(`atlas.js:957` が既にやっている作法 —— 実測に日付を付ければ、
古びたことが読者に分かる)。

### F-3【中】「実測 120,072ms」は所要ではなく**打ち切り時刻**の疑い

```
graph/pulse.js:22       :   120,072ms。同期経路に置けば画面が 2 分固まる。
graph/census.js:297     :   既定では回す — 実測 120,072ms かかり、同期経路では待てない。
tests/dashboard-perf.test.js:37 : 'census を require している — 実測 120,072ms が同期経路に入る'
```

**120,072ms = 120 秒 + 72ms。**これは是正前の timeout 120 秒で打ち切られた瞬間の
時刻であって、census の所要時間ではない。実際に census を最後まで走らせれば
自己診断 142 秒 + 自身の 65ms = **約 142 秒**である。

```
$ node graph/census.js show --no-tests   →  65ms
$ node tests/paradise.test.js            →  142,062ms
```

**「census を同期経路に置くな」という結論は正しい。むしろ実際はもっと遅い。**
だが根拠として挙げた数が打ち切り値であることは、この改修自身が `census.js:71-81` で
「打ち切られた走行の部分出力を真実として報告してはならない」と断じた過ちと**同型**である。
**打ち切り時刻を所要時間として 3 箇所に配ったのは、その掟の自己適用漏れである。**

**修正案**: 3 箇所の `120,072ms` を「census(自己診断込み)は実測 142 秒」に改める。
`--no-tests` なら 65ms であることを併記すれば、なぜ FR-06 が `--no-tests` を足したかが同時に伝わる。

### F-11【小】`paradise.js:6` の「実測 33 engine」が現在 34

```
$ ls graph/*.js | wc -l
34
$ grep -n "33 engine" dashboard/paradise.js
6: *   固定配列の metrics と架空 4 タスクの自己 DAG リテラルは撤廃した —— 実測 33 engine を
```

design.md:220 は **「`counts.engines` は pulse.js 自身を含んで 34 になる。固定値 33 と
比較する実装を書いてはならない」** と明記している。実装は正しく 34 を返す(実測)。
註釈だけが 33 のまま。**害は小さいが、この改修の方針(註釈に実測を残す)が
時とともに嘘になる典型例**である。

**修正案**: 「実測 33 engine(改修時点)」と時点を明示するか、
「engine の実数」と数を書かない表現に改める。**数を書くなら日付を添える。**

### 検証したが**嘘ではなかった**註釈(緑)

| 註釈 | 主張 | 実測 | 判定 |
|---|---|---|---|
| `pulse.js:15-18` | child_process が 1 件も現れない | 走るコード内 0 件(下記) | ✓ |
| `pulse.js:16` | 常駐 require は 0.53ms | 13 engine の require が 11.7ms、常駐後の呼び出し 0.0002ms | ✓ 桁として正しい |
| `design.md:704` | 断面 cold 93.7 / warm 7.2 | cold 78.7 / warm 7.6〜8.8(6 周) | ✓ 揺らぎの範囲内 |
| `pulse.js:230` | `total<=0` は測り損ね | 故障注入で `spawn=null` + errors 実証 | ✓ |
| `design.md` §1.3.4 | contradiction は実測 3 件 | 実測 3 件(coin / reform-eval-gauge / tenbin) | ✓ |
| `design.md` §1.3.4 | 相数 11 は reform と cartography が衝突 | 実測 `scaleGuess=null cands=["reform","cartography"]` 4 run | ✓ |

`pulse.js:15-18` の検証 — **design.md の AC-N07a の式そのままで走らせると 1 件出る**:

```
$ grep -cE "child_process|execFileSync|spawnSync|execSync" graph/pulse.js
1
$ grep -nE "child_process|execFileSync|spawnSync|execSync" graph/pulse.js
17: *   ゆえに本ファイルに child_process / execFileSync / spawnSync / execSync は
```

**唯一の一致は「子プロセスを産まない」と述べる註釈そのもの**である。
テスト側 `tests/dashboard-no-deps.test.js:36-41` は註釈行を除いてから数えており、
その理由を「欠陥を語る散文と欠陥そのものを取り違えない」と書いている。**この判断は正しい。**
ただし **design.md:59 に書かれた AC-N07a の式(`grep -cE … が 0`)は、そのまま走らせると 1 を返す。**
これは実装の欠陥ではなく**受入基準の書き方の欠陥**であり、
将来「AC 通りに検算したら赤い」と誤認される。

**修正案**: design.md:59 の AC-N07a を、テストが実際に使う式に揃える:
`grep -vE "^\s*(\*|//)" graph/pulse.js | grep -cE "child_process|…" が 0`。

---

## 2. 重複と抽象の漏れ — grep で実証

### F-5【中】`thresholds` を断面に載せているが**誰も読んでいない**

`pulse.js:469-474` は 7 つの閾値を断面の最上位に載せる。design.md:904 は
その動機を「同じ断面に対して画面と engine が違う鮮度を言う。嘘は齟齬から生まれる」と述べる。

**だが全ツリーを grep すると、消費者が 1 人も居ない**:

```
$ grep -rn "thresholds" --include=*.js --include=*.html --include=*.mjs .
./graph/pulse.js:469:    thresholds: {
```

**1 件。定義のみ。**画面(`dashboard/paradise.js:21-30`)は自前の `TH` を持ち、
断面の `thresholds` を一度も参照しない。

```
$ grep -n "FRESH_LIVE_MS\|FRESH_FROZEN_MS" graph/pulse.js dashboard/paradise.js
graph/pulse.js:71:  FRESH_LIVE_MS: 10000,
graph/pulse.js:72:  FRESH_FROZEN_MS: 60000,
dashboard/paradise.js:26:  FRESH_LIVE_MS: 10000,
dashboard/paradise.js:27:  FRESH_FROZEN_MS: 60000,
```

**閾値は 2 箇所に書かれている。**`pulse.js:59-62` の註釈は
「**1 箇所で定義し、二重に書かない**」と明言しているが、実態は二重定義である。

**ただし齟齬は門が裁いている** —— そこは評価する:

```
$ grep -n "TH" tests/dashboard-transport.test.js
58:  for (const [ck, ek] of [['FRESH_LIVE_MS','FRESH_LIVE_MS'], ['FRESH_FROZEN_MS','FRESH_FROZEN_MS'], …
61:    assert.strictEqual(client.TH[ck], pulse.T[ek],
62:      `${ck}: 画面 ${client.TH[ck]} != engine ${pulse.T[ek]} — 同じ断面に 2 つの鮮度が生まれる`);
```

**評価**: これは**許容できる二重定義**である。画面は `<script src>` で読まれる素の JS であり、
engine の `T` を import できない(外部依存ゼロの掟)。**構造上写経は避けられない。**
避けられない写経を**門で縛った**のは正しい設計判断である。

**問題は `thresholds` の方**。齟齬をテストで防いでいるなら、断面に載せた `thresholds` は
**何の役目も果たしていない**。載っているだけで誰も読まない鍵は、
将来の読者に「画面はこれを読んでいるのだろう」と誤解させる。**死んだ鍵である。**

**修正案(二択。どちらかに決めよ)**:
- (a) **消す** — `pulse.js:469-474` を削る。門が一致を裁いているので情報は失われない
- (b) **使う** — `paradise.js:21-30` の `TH` を「断面が来るまでの初期値」と位置づけ、
  断面受信後は `snap.thresholds` で上書きする。こちらなら**真に単一の源**になり、
  `dashboard-transport.test.js` の一致検査は「初期値が断面と合っているか」の検査に変わる

(b) が設計の意図に忠実だが、(a) のほうが安い。**どちらでもよいが、今の中間状態が最も悪い。**

### F-6【中】`control.html` が `paradise.js` の 5 関数を写経している

```
$ grep -rn "function el(" --include=*.js --include=*.html dashboard/
dashboard/control.html:140:  function el(t, a, k) {
dashboard/paradise.js:100:function el(tag, attrs, kids) {

$ grep -rn "たった今" --include=*.js --include=*.html dashboard/ graph/
dashboard/control.html:160:    if (ms < 2000) return 'たった今';
dashboard/paradise.js:69:  if (ageMs < 2000) return 'たった今';

$ grep -rn "location.origin" --include=*.js --include=*.html dashboard/
dashboard/control.html:137:    if (/^https?:$/.test(location.protocol) && location.origin && …) return location.origin;
dashboard/paradise.js:46:  if (typeof location !== 'undefined' && /^https?:$/.test(location.protocol) && …

$ grep -rn "生(SSE)" --include=*.js --include=*.html dashboard/
dashboard/control.html:176:    if (tb) tb.textContent = transport === 'sse' ? '生(SSE)' : (transport === 'poll' ? '生(2秒ごと)' : '凍結');
dashboard/paradise.js:175:var TRANSPORT_LABEL = { sse: '生(SSE)', poll: '生(2秒ごと)', frozen: '凍結' };
```

**写経されている 5 件**:

| 論理 | paradise.js | control.html | 一致か |
|---|---|---|---|
| DOM 生成 `el()` | `:100-111` | `:140-148` | 実質同一 |
| 相対時刻 `relTime()` | `:68-77` | `:159-165` | **境界値まで同一**(2000/60000/3600000/86400000) |
| 出自解決 `base()` | `:45-57` | `:136-139` | 同一規則 |
| パネル状態 `setState()` | `:121-133` | `:149-158` | 同一(5 状態・data-awaiting) |
| 経路ラベル | `:175` | `:176` | **文字列まで同一** |
| ポーリング間隔 | `:24` `POLL_INTERVAL_MS:2000` | `:129` `POLL_MS = 2000` | **同じ 2000 が 3 箇所目** |

**閾値 2000 は engine(`pulse.js:66`)・画面(`paradise.js:24`)・control(`control.html:129`)の
3 箇所にある。門が縛っているのは前 2 者だけである**(`dashboard-transport.test.js:58` の
配列に control.html は入っていない)。**control.html の 2000 は野放しである。**

**修正案**: `dashboard/` に `common.js`(el / relTime / base / setState / TRANSPORT_LABEL)を切り出し、
`index.html` と `control.html` の双方が `<script src="common.js">` で読む。
外部依存ゼロの掟には触れない —— 同じ倉の中の 3 本目の script タグである。
`paradise.js:701` は既に `module.exports` を条件付きで持つので、テストからの参照も維持できる。

最低限でも **`control.html:129` の `POLL_MS` を `dashboard-transport.test.js:58` の
一致検査対象に加える**こと。今は engine が 2000 を 3000 に変えても control.html だけ取り残される。

### 色と鮮度規則の二重定義 — **無かった**(緑)

```
$ grep -n "7317\|2000\|10000\|60000\|5000" dashboard/index.html
(0 件)
```

`index.html` は閾値を 1 つも持たず、`<script src="paradise.js">` に委ねている(`:297-298`)。
CSS の色定義(`index.html:82` 「凍結を赤にしない — 故障ではないからである」)も 1 箇所のみ。
**index.html については写経が無い。設計通りである。**

---

## 3. エラー処理 — engine を実際に壊して確かめた

### 故障注入 1 本(緑)

```
$ PULSE_FAULT=clergy node graph/pulse.js snapshot --json
exit=0
keys 20   cardinals=null   articles=50
errors=[{"engine":"clergy","key":"counts.cardinals",
         "reason":"PULSE_FAULT=clergy — 故障注入","at":1788354757920,"fatal":false}]
```

**断面は落ちない。exit 0。`cardinals` は 0 ではなく `null`。`errors[]` に積まれる。**
`pulse.js:92-94` の「0 は『数えて 0 だった』、null は『数えられなかった』」が実際に守られている。

### 故障注入 5 本同時(緑)

```
$ PULSE_FAULT=clergy,gauge,spawn-trace,wiring,lessons node graph/pulse.js snapshot --json
exit=0
errors count = 14
  clergy      | counts.cardinals        | PULSE_FAULT=clergy — 故障注入
  lessons     | counts.lessons          | PULSE_FAULT=lessons — 故障注入
  wiring      | gates[wiring]           | PULSE_FAULT=wiring — 故障注入
  gauge       | runs[coin].score        | (×5 run)
  spawn-trace | runs[coin].spawn        | (×5 run)
  gauge       | ledger                  | PULSE_FAULT=gauge — 故障注入
--- 生き残った鍵 ---
counts.articles 50  counts.engines 34  gates 5  runs 5  ledger null
gate ok: wiring=false vendor=true derived=true check-agents=true workspace=true
run: 全 5 run が score=null spawn=null contradiction=null
```

**5 engine を同時に殺しても断面は 20 鍵すべてを返し、exit 0。**
壊れていない門 4 本は正しく緑を保ち、壊した wiring だけが赤。
`contradiction` は `false` ではなく `null`(第16条「判定不能は緑ではない」)。
**`pulse.js:96-108` の guard 設計は実際に機能している。**

### F-7【中】`control.html` は counts が null でも「測れず」と言わない

`index.html` 側は正しい。`paradise.js:438-441`:

```
// null は「数えられなかった」。0 と区別して出す
'data-measured': v === null || v === undefined ? 'false' : 'true'
text: (v === null || v === undefined) ? '測れず' : String(v)
```

**`control.html` にはこの区別が無い**:

```
$ grep -n "測れず\|測れま" dashboard/control.html
→ 0 件
```

`control.html:219` は無条件に文字列連結する:

```js
mb.appendChild(el('p', { class: 'mono', text: 'KG ノード ' + snap.counts.kgNodes + ' / エッジ ' + snap.counts.kgEdges }));
```

実演した:

```
$ node -e 'var s={counts:{kgNodes:null,kgEdges:null}};
           console.log("KG ノード " + s.counts.kgNodes + " / エッジ " + s.counts.kgEdges);'
KG ノード null / エッジ null
```

**kg engine が落ちた瞬間、control.html は画面に文字列 `null` を出す。**
NFR-06(推測で埋めない)には違反しないが、
ux.md の「人の言葉で出す」には違反している。**神は `null` を読まされる。**

**なお control.html の errors パネル(`:222-225`)は正しい** —— errors を表で出し、
空なら「測れなかった鍵はありません」と言い切る。**画面全体としては「測れていない」を表明する。**
欠けているのは counts の 1 行だけである。

**修正案**: `control.html:219` を `paradise.js:517-518` と同じ形に揃える:
```js
text: 'KG ノード ' + (snap.counts.kgNodes === null ? '測れず' : snap.counts.kgNodes) + …
```
F-6 の `common.js` 切り出しを行えば、この種の取りこぼしは構造的に消える。

### F-1【重大】基点の「278 passed, 0 failed」が再現しない

**タスクは「既に実測済み(再測不要)」として `278 passed, 0 failed` を挙げた。
再測したところ再現しなかった。しかも 2 回で違う結果が出た。**

```
$ node tests/paradise.test.js          # 1 回目 (142,062ms)
Paradise self-test: 277 passed, 1 failed
  ✗ atlas: 全ての道が図になる — 描画器が実際に受理する (第47条)
      quick/dispatch: fail — 図は第一画面に収まってこそ図である…

$ node tests/paradise.test.js          # 2 回目
Paradise self-test: 276 passed, 2 failed
  ✗ atlas: 全ての道が図になる — 描画器が実際に受理する (第47条)
      quick/conclave: fail — …          ← 落ちる主題が変わった
  ✗ atlas: 門は己の残骸で落ちない — 同じ作業場で二度走る (第21条)
      dag: 動きの検器が走らなかった: Command failed: … motion-probe.mjs
```

**両回とも同じ例外が根にある**:

```
Error: navigation failed: net::ERR_FILE_NOT_FOUND
    at probeMotion (file:///…/graph/motion-probe.mjs:62:30)
Node.js v24.14.0
```

**これは `findings-flaky-gates.md` が「三つの形」として記録した病そのもの**であり、
同ファイルの表は形 #1 の原因を **「Chrome 一時プロファイルの漏れ」**、
形 #3 を **「`failAll` の unhandled rejection(調査中)」** としている。

**この改修は両方に手を入れた**:
- `motion-probe.mjs:93` — `child.kill()` → `await browser.close()`
- `visual-check.mjs:240-265` — `failAll` に `graceful` を導入

**そして手を入れた箇所の門は緑である**:

```
$ node tests/motion-probe-leak.test.js
  ✓ AC-23a: 作法を使っている — child.kill() が 0 件、browser.close() が 1 件以上
  ✓ AC-23b(本命): 検器を 1 回走らせる前後でプロファイル数の差が 0
      実測: chrome BEFORE=18 AFTER=18
  ✓ AC-23c: headless Chrome を残さない(前後の差が 0)
  ✓ AC-23e(壊して鳴る): close() を kill() に戻せばこの門が赤くなる
  ✓ AC-23g: atlas を 1 主題通した前後でも累積 0
motion-probe-leak: 5 passed, 0 failed
```

**プロファイルの漏れ(形 #1)は確かに止まっている。だが自己診断はまだ不定に赤い。**

`atlas.check()` を単体で 2 周させると**両回とも全緑**である:

```
$ node -e "atlas.check({scale:'quick', outdir:…})"   # 2 回
--- pass 1 ---  hierarchy: ok  conclave: ok  dispatch: ok  dag: ok  run: ok  wiring: ok
--- pass 2 ---  hierarchy: ok  conclave: ok  dispatch: ok  dag: ok  run: ok  wiring: ok
```

**単体では緑。142 秒の自己診断の中で走らせると赤い。しかも落ちる主題が回ごとに変わる。**
`findings-flaky-gates.md:23` が「**どの主題が落ちたかを追えば、永久に真因に辿り着かない**」と
自ら書いた通りの症状が、**改修後もそのまま残っている**。

**この改修が消したのは「漏れの累積」であって、「不定の赤」ではない。**
`findings-flaky-gates.md:12` の形 #3 は表の中で **「(調査中)」** のままであり、
実際に調査は完了していない。

**根拠となる観察**(真因の断定はしない — 審査の役目を越える):
- `atlas.js:1272` は `motion-probe.mjs` を **`execFileSync` で子として** 起動する
- 自己診断は同じ 142 秒の中で atlas 系テストを複数回走らせ、その各回が Chrome を起こす
- `ERR_FILE_NOT_FOUND` は **navigate 先の HTML が読めない**の意である。
  `atlas.js:1299` の `fs.rmSync(outdir, …)` と、前のテストが残した Chrome の
  ファイル握りが競合している可能性がある(`findings-flaky-gates.md:10` が
  「残った Chrome が握るファイルが次の走行の file:// を ERR_FILE_NOT_FOUND にし」と
  同じ因果を既に記している)

**修正案**:
1. **`findings-flaky-gates.md` の表から「(調査中)」を消さない。**
   むしろ「形 #3 は未解決」と本文に明記する。**緑でないものを緑と書かないことが第一である**
2. `motion-probe.mjs:61-62` の navigate 失敗時に **リトライを 1 回入れる**か、
   `ERR_FILE_NOT_FOUND` を「図が動かない」ではなく「**検器が走らなかった**」として
   返す(`atlas.js:1276-1280` は既にその区別を持っている。だが `probeMotion` が
   **throw する**ため、子プロセスが非 0 で落ち、`atlas.js:1277` の
   `JSON.parse(e.stdout)` も失敗して区別が効いていない)。
   → **`probeMotion` は navigate 失敗を throw せず `{ok:false, reason:'検器が走らなかった'}` で
     返すべきである。**`motion-probe.mjs:44` は Chrome 不在時に既にその形で返しており、
     **navigate 失敗だけが throw になっているのは一貫性の欠如**である
3. **PR に「self-test は現在 276〜277 passed / 1〜2 failed で不定」と正直に書く。**
   278/0 を主張したまま出せば、第16条(判定不能は緑ではない)に対する違反になる

**この 1 件だけは、報告の正確さに関わるため merge 前の是正を勧める。**
コードの欠陥としては小さいが、**「緑である」という主張が実測と食い違っている**ことが重い。

---

## 4. 命名と一貫性 — 断面スキーマの鍵名は design.md と一致するか

### 最上位 20 鍵の照合

```
$ node graph/pulse.js snapshot --json | node -e "…Object.keys(o)"
schemaVersion generatedAt generatedAtMs ageMs transportHint connections
counts gates gatesCached runs ledger daily scale lessonsByKind
atlas census thresholds source buildMs errors
```

design.md §1.3.1 の表に**在る 17 鍵はすべて一致**(型・順序とも)。

### F-9【小】design.md §1.3.1 の表に無い 3 鍵

```
$ for k in thresholds buildMs atlas gatesCached transportHint; do
    printf "%-16s design=%s\n" "$k" "$(grep -c "$k" design.md)"; done
thresholds       design=0     ← 表に無い
buildMs          design=0     ← 表に無い
atlas            design=24    ← §4.3 にはあるが §1.3.1 の表に無い
gatesCached      design=7     ← 表に在る ✓
transportHint    design=2     ← 表に在る ✓
```

- **`thresholds`(`pulse.js:469`)** — design.md に**一度も現れない**。F-5 の通り消費者も居ない
- **`buildMs`(`pulse.js:484`)** — design.md に**一度も現れない**。
  §1.7 は時間収支を語るが `buildMs` という鍵名は出てこない。
  実際には `dashboard-perf.test.js` が計測に使っており**有用な鍵**である
- **`atlas`(`pulse.js:467`)** — §4.3(design.md:1015-1025)に設計はあるが、
  §1.3.1 の**スキーマ表には行が無い**

**設計文書が断面の全鍵を語っていない。**「断面という単一の突合点」を掲げた改修としては、
突合点の定義が不完全である。

**修正案**: design.md §1.3.1 の表に 3 行を足す。
```
| `atlas[]`      | `array`  | §4.3 dashboard/atlas の実在 html | ~0.5 | `[]` + errors |
| `thresholds`   | `object` | pulse.js の T(定数)              | 0    | — |
| `buildMs`      | `number` | 断面生成の実測(hrtime)          | 0    | — |
```
(`thresholds` を F-5 の (a) で消すなら、その行は不要)

### F-8【小】`errors[].engine` の名が design.md と食い違う

design.md は 2 箇所で `conclave-read` を指定する:

```
design.md:448 : errors[] に {engine:'conclave-read', run:<name>, reason:'no domains[]'} を積む
design.md:613 : engine | 落ちた engine 名(clergy / forge / gauge / conclave-read / lessons / kg …)
```

**実装は `conclave` である**:

```
$ grep -rn "conclave-read" reform/ graph/ tests/
reform/dashboard-living-gate/design.md:448
reform/dashboard-living-gate/design.md:613
（graph/ と tests/ には 0 件）

$ grep -n "engine: 'conclave'" graph/pulse.js
251:      errors.push({ engine: 'conclave', key: 'runs', … });
259:      errors.push({ engine: 'conclave', key: `runs[${r.name}]`, … });
264:      errors.push({ engine: 'conclave', run: r.name, key: `runs[${r.name}]`, reason: 'no domains[]', … });
```

**影響は実在する**。画面は `data-awaiting` に出す名を実在 engine に限っている:

```
dashboard/paradise.js:168-170
var KNOWN_ENGINES = ['pulse','census','conclave','clergy','forge','workspace','kg','wiring',
  'vendor','derived','check-agents','gauge','spawn-trace','daily-guard','lessons','codex','atlas'];
function engineName(n) { return KNOWN_ENGINES.indexOf(String(n)) >= 0 ? String(n) : 'pulse'; }
```

**`KNOWN_ENGINES` は `conclave` を含み `conclave-read` を含まない。**
つまり design.md 通りに `conclave-read` を積んでいたら、
`engineName()` が**フォールバックして `pulse` と表示し、真の出所が隠れていた**。

**実装のほうが正しい**(`graph/conclave.js` は実在し、`conclave-read` は実在しない)。
**修正すべきは design.md である。**

**修正案**: design.md:448 と :613 の `conclave-read` を `conclave` に改める。
なお `pulse.js:264` は design.md 通り `run: r.name` を余分に積んでおり、
これは §1.5 の 5 鍵の表(`engine`/`key`/`reason`/`at`/`fatal`)に無い 6 番目の鍵である。
害は無いが、**表に載せるか消すかのどちらかにすべき**である。

### 一致していた命名(緑)

```
$ node -e "…Object.keys(o.runs[0])"
name,path,phasesDone,phasesTotal,domainsRatified,domainsTotal,domains,state,
score,spawn,contradiction,metrics,historyLength,lastEvent,scaleGuess,scaleCandidates
$ node -e "…Object.keys(o.gates[0])"     → name,ok,ms,at,detail
$ node -e "…Object.keys(o.daily)"        → due,catchUp,owedDay,reason,jst,lease
```

`runs[]` の `scaleGuess` / `scaleCandidates`、`gates[]` の 5 鍵、
`daily` の `jst`(`now.stamp` から写す)まで design.md と一致。
`lease` が「現れる場合のみ」の条件付きであることも `pulse.js:444` で守られている。**良い。**

---

## 5. 死んだコード

### F-10【小】`bodyOf()` が定義のみで一度も呼ばれない

```
$ grep -rnw "bodyOf" dashboard/ tests/ graph/
dashboard/paradise.js:114:function bodyOf(name) { var p = panel(name); return p ? p.querySelector('[data-body]') : null; }
```

**1 件。定義行のみ。**`paradise.js` 内・`tests/` 内・`graph/` 内のいずれからも呼ばれない。
役目は `setState()`(`:121-133`)が `p.querySelector('[data-body]')` を直に行って果たしている。

**修正案**: `dashboard/paradise.js:114` を削除する。

### 全 33 関数を機械で数えた(その他は生存)

```
$ for f in origin resolvePort base freshnessOf relTime … ; do
    grep -cw "$f" dashboard/paradise.js ; done

origin=6  resolvePort=3  base=3  freshnessOf=3  relTime=6  localStamp=4
durationText=3  el=101  clear=2  panel=4  bodyOf=1 ←  setState=14  showEmpty=6
showError=16  errorsFor=2  sourceTag=10  engineName=6  renderTop=3  runCard=3
renderRuns=2  ledgerRows=2  scoreCard=2  renderScores=2  renderGates=2
renderCounts=2  renderDaily=2  renderScales=2  renderMemory=2  renderAtlas=2
render=5  logLine=6  setDisconnected=2  start=3
```

**`bodyOf` 以外はすべて 2 以上(定義 + 1 回以上の呼び出し)。**
`render*` 系 10 本が揃って 2 なのは `render()`(`:546-573`)からの 1 回ずつであり、正常。

### パネルの過不足 — 無し(緑)

```
$ grep -o 'data-panel="[a-z-]*"' dashboard/index.html | sort -u
atlas-index counts daily gates memory running-ring runs-score scales   (8)
$ grep -o "setState('[a-z-]*'\|showEmpty('…\|showError('…" dashboard/paradise.js | sort -u
atlas-index counts daily gates memory running-ring runs-score scales   (8)
```

**HTML の 8 パネルと JS が描く 8 パネルが完全一致。**描かれないパネルも、
存在しないパネルを描こうとする枝も無い。

### `pulse.js` の export — `GATES` のみ未使用

```
$ grep -rnw "GATES" --include=*.js --include=*.html .
./graph/pulse.js:139:const GATES = [
./graph/pulse.js:185:  const gates = GATES.map(…)
./graph/pulse.js:694:module.exports = { …, T, GATES, SCHEMA_VERSION };
```

**`GATES` は外部から一度も参照されない。**他の export は使われている:

```
visibleDirs → tests/dashboard-count.test.js:56,60
listRuns    → tests/dashboard-perf.test.js:84
readSpawn   → tests/dashboard-run-panel.test.js:138,146
```

**判定: 死んだコードとまでは言わない。**`GATES` は門の一覧であり、
将来テストが「門の名前集合」を検算する自然な入口である。
実際 `dashboard-perf.test.js:65` は文字列で `'check-agents,derived,vendor,wiring,workspace'` を
写経しており、**`pulse.GATES.map(g=>g[0])` を使えばその写経が消える**。
**消すのではなく、使うほうを勧める。**

### 到達しない枝 — 見つからず(緑)

`pulse.js:655-660` の `EADDRINUSE` 分岐、`:548-552` の `sawRename` 分岐、
`paradise.js:611-613` の二重凍結抑止は、いずれも
`dashboard-sse.test.js` / `dashboard-watch.test.js` / `dashboard-fallback.test.js` が
実際に到達させている(12 本すべて緑を確認)。

---

## 6. 門の結線 — tribunal.yml

タスクは「門 13 本を結線」とするが、**dashboard テストの実体は 12 本**である:

```
$ ls tests/dashboard-*.test.js | wc -l
12
$ grep -o "tests/dashboard-[a-z-]*\.test\.js" .github/workflows/tribunal.yml | sort -u | wc -l
12
```

**12 本すべてが tribunal.yml に結線されている。取りこぼしは 0。**
「13 本」は `motion-probe-leak.test.js` を足した数(12 + 1 = 13)と解する。
その場合も結線済みである(`tribunal.yml` の `🧹 Motion probe leak` ステップ)。

**`|| true` が 1 つも無いことを確認した** —— `tribunal.yml` の
`🎨 Dashboard surface` ステップの註釈が
「付けた瞬間、critic が何を言おうと CI は緑になる」と自ら戒めている。**良い。**

ただし **`paradise.test.js:2377-2380` が子として呼ぶのは 8 本のみ**である:

```
for (const name of ['dashboard-count','dashboard-no-deps','dashboard-links',
  'dashboard-no-hardcode','dashboard-transport','dashboard-freshness',
  'dashboard-states','dashboard-run-panel']) { … }
```

`dashboard-perf` / `dashboard-sse` / `dashboard-watch` / `dashboard-fallback` の
**4 本は自己診断に含まれない**(CI では走る)。
所要時間を考えての判断と読めるが、**その理由がコードにも註釈にも書かれていない**。

**修正案**: `paradise.test.js:2377` に、なぜ 8 本なのか(残り 4 本は CI 専用である旨と
その根拠 —— サーバを立てる・Chrome を起こす等)を 1 行で記す。
**選別に理由が書かれていなければ、次の人は取りこぼしと読む。**

---

## 7. 是正の優先順位

| 順 | 件 | 理由 |
|---|---|---|
| 1 | **F-1** | 「278 passed, 0 failed」の主張が実測と食い違う。**PR の記述を実測に改めること**が最優先 |
| 2 | **F-2** | 註釈がコードと矛盾。10 行離れた場所に答えがある分、読者を確実に誤らせる |
| 3 | F-3 / F-4 | 打ち切り値を所要時間として 3 箇所に配った。この改修自身の掟の自己適用漏れ |
| 4 | F-7 | 神が画面で文字列 `null` を読まされる |
| 5 | F-5 / F-6 | 死んだ鍵と写経。今すぐ壊れはしないが、次の改修者が必ず踏む |
| 6 | F-8 / F-9 | design.md 側の是正(実装は正しい) |
| 7 | F-10 / F-11 | 1 行削除・1 行修正 |

---

## 8. 審査の総評

**この改修の中核 —— 「断面という単一の突合点」 —— は実装として成立している。**
故障注入 5 本を同時に浴びせても断面は 20 鍵を返し exit 0 で、
欠けた鍵は `0` ではなく `null` になり、`errors[]` が穴を名指しする。
`spawn-trace.report()` の偽陰性に対する事前 assert(`pulse.js:230`)は、
「ok:true を信じない」を実際のコードにできている稀な例である。

**弱いのは、実測を語る註釈の保守である。**
この改修は「註釈に実測値を残す」方針を掲げ、実際に多くを残した。
だが**残した数値のうち 4 件が既に古いか、そもそも別の量である**(F-2/F-3/F-4/F-11)。
特に F-3 —— 打ち切り時刻 120,072ms を所要時間として 3 箇所に配ったこと —— は、
**この改修自身が `census.js:71-81` で「打ち切られた走行の部分出力を真実として
報告してはならない」と断じた過ちと同型**である。掟を engine には適用し、
自分の註釈には適用しなかった。

**実測を註釈に書く方針は正しい。ならば註釈も測り直しの対象に含めよ。**
`atlas.js:957` が既にやっているように**日付を添える**ことが、最も安い保険である。

そして F-1 —— **不定に赤い自己診断**。
`findings-flaky-gates.md` は自ら「症状は揺れる。原因は揺れない」と書き、
形 #3 を「(調査中)」のまま残した。**その調査は完了していない。**
プロファイルの漏れ(形 #1)は確かに止まった —— それは `motion-probe-leak.test.js` の
5 passed が証明している。**だが病は 2 つあり、直ったのは 1 つである。**
**直った 1 つをもって「全門緑」と報告してはならない。**

---

*審査は実行のみを根拠とする。本書のすべての数値は上に掲げたコマンドの実出力である。*
*修正案は提示したが、実装は行っていない —— 審査が仕事である。*
