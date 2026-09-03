# reflect — 敵対的自己批評

**相**: reflect @self-critic (reform の道 第11相 / gate / tribunal 第一の相)
**対象**: `reform/pontiff-office` (HEAD = `dfa567a`)
**日時**: 2026-09-03
**立場**: どの枢機卿にも属さない。**緑を褒めるためではなく、緑が隠したものを名指しするために在る。**

---

## 0. 本相の裁定

verify は正しい。**328 passed / 0 failed、14門 × 2環境で赤ゼロ、rework の9件は独立再現で全て塞がり、抜き取り注入4本すべてが鳴った。** 教主はこれを疑ったが、覆せなかった。

**だが本相は「緑である」を「欠陥が無い」と読まない(第9条)。**
以下、**新たに実測した盲点を 8 件**名指しする。うち **2 件は本PR自身が塞いだ病の再発**であり、**1 件は本PRが建てた門を無効化する経路**である。

| # | 盲点 | 重大度 | 今か後か |
|---|---|---|---|
| **C-1** | `bytes` 経路に B-1 と**同一の fail-open** が残っている | **BLOCK 級** | **今** |
| **C-2** | `critic --lessons` が壊れた/不在の教訓帳を**緑で通す**。CI は実際に 0 件で撃っている | **BLOCK 級** | **今** |
| **C-3** | `epoch` を消すだけで第52条の門を**丸ごと回避**できる。監査は区別しない | **HIGH** | 今(小)/ 後(大) |
| **C-4** | 環の外の成果物 **29 件**・抽象名で done を刻んだ相 **4 件**。突合する門はゼロ | HIGH | 後 |
| **C-5** | 沈黙の門は**既に在る**(STALE_MS=15分)。ただし誰も撃たず、`--json` が捨てている | HIGH | **今**(配線のみ) |
| **C-6** | `rework` が道の相として存在しない — 差し戻しを記録する場所が無い | MAJOR | 後 |
| **C-7** | 閾値の循環論法。過去実績の **9.7%** しか序列3枠に入らない | MEDIUM | 後(要神託) |
| **C-8** | 測っている量(変更行数)と神が困っている量(工数)が**同じでない** | MEDIUM | 後(要神託) |

---

## 1. 良い点(1節で終える)

- **B-1 の修復は本物である。** 教主は verify の再現を信じず、清潔な git 作業場を掘って独立に撃ち直した。`measurable:false` → `verdict:'red'` / `state:'inconclusive'` は実測で確認した。
- **第52条(d)「門相は序列3を名乗れない」は実際に鳴る。** 合成 run で撃った:
  ```
  門相 (gate:true)  + epoch 有り => **拒まれた**: 門相は序列3を名乗れない — 相 "reflect" は gate である (第9条)
  並の相(gate:false)+ epoch 有り => **拒まれた**: 序列3の枠を超えた — churn=788 > 50
  ```
  **量が小さくても許さない**という条文が、実装で先に立っている(順序が正しい)。
- **抜き取り注入4本は飾りではない。** verify の実測を教主は疑ったが、注入の記録は具体的で、失敗理由まで正確だった。

**以上。残りは全て「まだ危ういところ」である。**

---

## 2. C-1 [BLOCK 級] `bytes` 経路に B-1 と同一の fail-open が残っている — **今直すべき**

### 実測

観測2は「B-1 は塞がった」と述べる。**塞がったのは `files`/`churn` を測る `gitOut()` だけである。** 第三の量 `bytes` は同じ関数の中で、**同じ病を抱えたまま残っている。**

`graph/spawn-trace.js:321-325`:
```js
const abs = path.isAbsolute(art) ? art : path.join(cwd, art);
try {
  const st = fs.statSync(abs);
  bytes = st.isDirectory() ? dirBytes(abs) : st.size;
} catch {}          // ← 失敗が bytes=0 に潰れ、unmeasured に何も積まれない
```

清潔な git 作業場を掘って撃った(`probe-bytes2.js`):
```
作業場: …\bytesprobe-dLWLiJ (清潔・コミット済み)
A) artifact が存在しない  bytes=0 measurable=true unmeasured=[]
     judge => ok=true verdict=green state=tier3
     lines => ["序列3: 教主の手 (files=1/2 churn=1/50 bytes=0/4096)"]
B) artifact 欄が空         bytes=0 measurable=true unmeasured=[]
     judge => ok=true verdict=green state=tier3
C) 実在する 3 バイト       bytes=2 measurable=true unmeasured=[]
     judge => ok=true verdict=green state=tier3
```

**A と C が区別できていない。** `bytes=0/4096` という行は「成果物は 0 バイトだった」と読めるが、実際には**「成果物を測れなかった」**である。B-1 で断罪されたのと**一字一句同じ構造**である:

| | B-1 (塞いだ) | C-1 (残っている) |
|---|---|---|
| 失敗の潰し方 | `catch { return null }` | `catch {}` |
| 結果 | `files=0 churn=0` | `bytes=0` |
| `measurable` | `false` を積むよう修正済み | **`true` のまま** |
| `judge()` | 赤 | **緑** |

### なぜ本PRの機構がこれを捕らえなかったか

`measurable` の判定は `unmeasured.length === 0`(`:330`)であり、**`unmeasured` に積むのは `gitOut` の失敗だけ**である。`bytes` の失敗は `unmeasured` に一行も積まれない。**「全ての問いが撃てたときだけ真」というコメント(`:329`)が、実装と食い違っている。** 第33条(散文が機構を騙る)が engine の内部コメントで起きている — これは lessons の `comment-claims-what-code-does-not` が名指しした型そのものである。

同型が `dirBytes()` (`:338-340`) にもある。二重の `catch {}` に加え、**サブディレクトリを 0 バイトとして数える**(rework が m-4 として認識し「運用が無い」として見送った)。`--artifact` にディレクトリを渡す運用は現状無いが、**C-1 の本体(単一ファイルの statSync)は運用が在る** — `artifactPath` は全ての相が持つ。

### 判断

**今直すべき。** 理由は三つ:
1. **本PRが自ら BLOCK と断じた欠陥と同一構造**である。同じ走行の中で片側だけ直して「塞いだ」と report するのは第16条違反の一形態である。
2. 修復は `catch { unmeasured.push('成果物の大きさを測れない: …') }` の一行で足り、**新しい fail-open を作らない**(M-1 の見送り理由が当てはまらない)。
3. 回帰試験の型は既に在る — B-1 の3本をそのまま `bytes` へ複製できる。

**ただし engine は本相では直さない(作法)。verdict の判断に委ねる。**

---

## 3. C-2 [BLOCK 級] `critic --lessons` が壊れた教訓帳を緑で通す — **今直すべき**

### 実測

本相が命じられて走らせたコマンドそのものが、**己の門を無効化できる。**

```
lessons.json の実件数: 72
正常 (graph/lessons.json) => 撃たれた lesson  73 件 / 緑=true / exit=0
壊れた JSON              => 撃たれた lesson   0 件 / 緑=true / exit=0
存在しないパス            => 撃たれた lesson   0 件 / 緑=true / exit=0
空配列 []                => 撃たれた lesson   0 件 / 緑=true / exit=0
```

出所は `graph/critic.js:423`:
```js
if (opts.lessons) { try { lessons = JSON.parse(fs.readFileSync(opts.lessons, 'utf8')); } catch {} }
```

**`--lessons` を渡したという事実自体が無視される。** 教訓を 0 件しか撃たなくても、`VERDICT: the critic found nothing. Proceed to judgment.` が出て exit 0 になる。第37条(不在は通過ではない)が、**断罪の一つ手前の門で破れている。**

### さらに悪い — CI は実際に 0 件で撃っている

これは仮定ではない。`derived.js:43-48` が自ら宣言している:

> `graph/lessons.json` … **CIにKGは無いため空になる。**件数や中身を前提にした検査を書いてはならない

CI と同じ形を再現した(`probe-ci-lessons.js`):
```
この機 (KG 在り):   本番 KG => lessons.json = 72 件
CI と同じ形 (KG無し): 空の KG => lessons.json =  0 件
その lessons.json で critic を撃つと: 撃たれた lesson 0 件 / 緑=true
```

`.github/workflows/tribunal.yml:259-262`:
```yaml
node graph/lessons.js export --out graph/lessons.json || true
node graph/critic.js review graph --self --lessons graph/lessons.json >> verdict.md 2>&1 || true
```

**`|| true` が二つ並んでいる。** 同じファイルの `:181-183` には教主自身の戒めが書かれている:

> ⚠️ **`|| true` を付けるな**(quality 枢機卿が審査で指摘・教主が是正)。付けた瞬間、critic が何を言おうと CI は緑になる —— それは「門の形をした飾り」であり、第50条が名指しした『見ていない門』そのものである。

**同じファイルの 76 行下で、その戒めが破られている。** 第21条(一つの口だけを見張る門は盲点である)の逆——**一つの口だけを正した是正**である。

### 「これは既知の設計では」への反証

`derived.js` の教訓 `art29-derived-not-truth` は「**生成物の中身を前提にした検査を書くな**」と述べる。それは正しい。だが本件は逆方向である:

- 教訓が禁じたのは「lessons.json が 31 件であることを前提にする検査」
- 本件は「**lessons.json が空であることを検知しない検査**」

`derived.js` は**生成物に依存する検査を禁じた**が、**生成物が空だったときに何を報告すべきかは定めなかった**。lessons の `env-is-not-canon` が要求する「不在の契約を測れ」が、ここでは実装されていない。critic は「教訓 0 件で走った」ことを**出力に一言も書かない** — 見た目は 72 件で走ったときと区別がつかない。

### 判断

**今直すべき(小さい直し)。** engine 側は数行:
- `--lessons` を渡されて読めなかった/0件だったなら、**その事実を出力に書き、`kind:'inconclusive'` として扱う**(atlas と spawn-trace が既に持つ第4の状態を、三つ目の engine へ)。
- 少なくとも「教訓 N 件で裁いた」の N を必ず印字する。**0 と 72 が同じ画面に見えてはならない。**

CI 側の `|| true` の撤去は**神の判断を仰ぐべき**である — 撤去すれば CI に KG が無い限り常に鳴る。**engine が「0件」を正直に名乗れるようにするのが先**であり、順序を逆にしてはならない。

---

## 4. C-3 [HIGH] `epoch` を消せば第52条の門は丸ごと消える — 監査は区別しない

### 実測(verify 申し送り2 への裁定)

verify は「`tierAudit.ok=true` は合格ではなく対象外である」と正しく述べた。**だがそれで終わってはならない。** 教主が問うたのは「**新しい走行なのに印が無い場合を区別できるか**」である。**区別できない。**

`probe-epoch.js`:
```
A) 実物の created = 2026-09-03T02:30:46.829Z (11:30 JST, 紀元 13:54 JST より前 → 正当な legacy)
   tierAudit => ok=true epoch=false rows=11 全て unobservable=true

B) created = 2026-09-03T09:50:31.006Z (紀元導入より後) / epoch 無し / 全相 done / tierTrace 空
   tierAudit => ok=true epoch=false
   状態の内訳: {"序列1":0,"序列2":0,"序列3":0,"unobservable":11}
   → 「新しい走行なのに印が無い」を区別できたか: **できていない (緑)**
```

**B は「昨日 convene され、11相すべてを done にし、序列を一度も宣言しなかった走行」である。** これは第52条(e)が名指しした「宣言なき手仕事」の完成形だが、`tierAudit` は `ok=true` を返す。

### 材料は全て揃っている

比較に必要な二つの数は、どちらも既に機構が持っている:

| 量 | 出所 | 実測値 |
|---|---|---|
| 走行の convene 時刻 | `conclave.json` の `created` | `2026-09-03T02:30:46.829Z` |
| 紀元の導入時刻 | 紀元を刻んだコミット `8aad635` | `2026-09-03T13:54:49+09:00` |

`hasEpoch()` (`spawn-trace.js:162`) は `run.epoch.tier` の有無しか見ない。**`run.created` を読んでいない。** 一行で比較できるものを、比較していない。

### さらに — これは「移行方針」では説明できない

AC-A の遡及しない設計判断は正当である。だが `conclave.js:95` の教主自身のコメントはこう述べる:

> `epoch` の削除は diff に現れる —— **機構は騙りを防げないが、**

**「diff に現れる」は門ではない。** 誰も見ない diff は第44条の「死んだ道具」と同じである。しかも `conclave.json` は毎相書き換わるファイルであり、その diff を人が読む運用は存在しない。

### 判断

- **今できる小さい直し**: `tierAudit` に「`created` が紀元導入時刻より後なのに `epoch` が無い」を **`no-epoch-after-era`(赤)** として足す。閾値は不要で、比較は決定的である。
- **後続PRの宿題(大)**: 紀元導入時刻をどこに刻むか。現状は git のコミット時刻という**engine の外**にある。`TIER_EPOCH = 'v1'` の隣に `TIER_EPOCH_AT` を置けば engine の中で完結する。

### そして本相自身への裁定 — 問【4】への直接の答え

> **自分を裁けない門で自分を裁いたと report するのは、第16条違反の一形態ではないか。**

**その通りである。ただし verify は違反していない。**

verify は `§6-2` で「`tierAudit.ok = true` は『違反が無い』ではなく『紀元以後の相が一つも無い』ことを意味する」と**自ら書いた**。第16条が要求するのは「測れなかったことを測れなかったと書く」ことであり、verify はそれを果たした。**第16条違反ではない。**

**違反になるのは、この注記を落として上位へ報告した場合である。** ゆえに本相は verdict へ次を申し送る:

> **本PRの verdict は「第52条の門が本PRを裁いた」と書いてはならない。** 本走行に対して門は一度も立っていない(11相すべて `unobservable`)。書けるのは「門が**他の走行に対して**正しく鳴ることを、故障注入と合成 run で実証した」までである。

---

## 5. C-4 [HIGH] 台帳の外の仕事 — 環をまたいで 29 件 / 突合する門はゼロ

### 実測(観測4 / verify 申し送り1 への裁定)

verify は本走行について「食い違い 0 件」と実測した。**それは正しい。だが問いの範囲が狭い。** 教主が問うたのは「**ディスク上に成果物が在るのに `phases[].status !== 'done'` は突合可能か**」であり、これは**楽園全体で測れる**(`probe-ledger2.js`):

```
conclave-resume          相11 | 台帳外  1 | 抽象名 0 | 真の幽霊 0
dashboard-living-gate    相11 | 台帳外 18 | 抽象名 0 | 真の幽霊 0
pontiff-office           相11 | 台帳外  2 | 抽象名 0 | 真の幽霊 0
coin                     相11 | 台帳外  0 | 抽象名 4 | 真の幽霊 0
    抽象名: review=verified, security=verified, verify=verified, reflect=critique:clean
habit                    相11 | 台帳外  3 | 抽象名 0 | 真の幽霊 0
reform-claude-md-diet    相11 | 台帳外  2 | 抽象名 0 | 真の幽霊 0
reform-eval-gauge        相11 | 台帳外  0 | 抽象名 0 | 真の幽霊 0
tenbin                   相17 | 台帳外  3 | 抽象名 0 | 真の幽霊 0

合計: 台帳外の成果物 29 件 / 抽象名で done を刻んだ相 4 件 / パス形なのに実物が無い相 0 件
```

**観測4は本走行に限った現象ではない。8走行中 6走行で起きている。**

### 第16条に従い、自分の測定の誤りを先に書く

最初の走査は「幽霊(done なのに実物が無い)9件」を出した。**これは誤りだった。** 内訳を見ると `artifactPath` が `verified` / `critique:clean` という**抽象名**であり、パスではない。これらは「成果物が消えた」のではなく「**パスでない文字列で done を刻んだ**」のである。分類を直して再測した結果が上表であり、**パス形なのに実物が無い相は 0 件**である。

**誤った再現で楽園を有罪にしなかったことを記録に残す**(教主が verify §3.1 で同じ作法を守ったのと同じ)。

### だが「抽象名 4 件」は別の欠陥である

`contract.js:61-65` は自らこう書いている:

```js
// Artifact might be an abstract name (e.g. "implementation") rather than a path.
// Accept only if a real path is given AND exists & is non-trivial.
```

`contract` はこれを拒む。**しかし `coin` の 4 相は `done` を刻めている。** `conclave.markDone` は成果物の実在を検めるが(C-2 の probe で `成果物が実在しない: …critique.md` と拒まれたのを実測した)、`coin` の 4 相はそれを通り抜けている。**環と器が違う判定を書いている** — `conclave.js:315` が「環と器が別の判定を書けば必ず食い違う」と警告した、まさにその形である。

### 突合は機械化できるか — できる

上の走査は**教主が 30 行で書いた**。必要な入力は `conclave.json` の `artifactPath` とディレクトリの `readdirSync` だけであり、どちらも既に楽園の中に在る。`graph/` に**この突合を撃つ engine は一つも無い**ことも実測した(`artifactPath` と `readdirSync` を両方持つ engine: **0 件**)。

### 判断

**後続PRの宿題。** 理由:
- 29 件の大半(18 件)は `dashboard-living-gate` の `findings-*.md` / `ratify-*.md` であり、**これらは「環の外の不正」ではなく「一つの相が複数の文書を産んだ」形**である。門にするなら**まず `artifactPath` を複数持てるようにする**設計が要り、それは新しい設計相の仕事である(M-2 の見送り理由と同型で、**この理由は妥当である**)。
- ただし **`coin` の抽象名 4 件は今すぐ測れる**。「`artifactPath` がパス形か」は正規表現一本で、`contract.js` が既に持っている判定である。**同じ問いに二つの engine が違う答えを出している状態**を放置すべきではない。

---

## 6. C-5 [HIGH] 沈黙の門は**既に在る**。誰も撃っていないだけである — **今直すべき(配線のみ)**

### 観測1 への裁定 — 教主は自分の家に在るものを見ていない

観測1は「`wave` を返したのに `dispatch` の証跡が現れない相を機構は鳴らせるか」と問い、「新 engine か既存の拡張か」と続けた。**答えは「どちらでもない。門は既に完成している」である。**

`graph/conclave.js:48`:
```js
const STALE_MS = 15 * 60 * 1000;
```

`graph/conclave.js:419-427`(`statusBoard`):
```js
// 第51条a: 静止は失敗より悪い。中断の疑いがある running を人に見せ、沈黙を破る。
if (p.status === 'running') {
  const at = p.dispatchedAt ? Date.parse(p.dispatchedAt) : NaN;
  if (Number.isNaN(at)) note = '  ⚠ (running・発令の刻なし — resume --force で回収せよ)';
  else {
    const age = Date.now() - at;
    if (age >= STALE_MS) note = `  ⚠ (running ${Math.round(age / 60000)}分 — 中断の疑い。resume で回収せよ)`;
  }
}
```

**実際に鳴る**(`probe-silence.js`):
```
=== STALE_MS = 900000 ms = 15 分 ===
running 相: reflect @self-critic dispatchedAt=2026-09-03T09:45:47.238Z age=4分 stale=false
statusBoard の ⚠ 行: (無し)
60分前に偽装 => ⚠ 行: [
  '     ▶ ⚖️ reflect @self-critic  ⚠ (running 60分 — 中断の疑い。resume で回収せよ)'
]
```

**第51条が前PRで建てた門が、そのまま観測1の答えである。** 教主は自分が**先週建てた門**を、今週「無い」と書いた。第44条の裏面がここで起きている:

> **鳴らない番人は、番人が居ないことより見つかりにくい。**(観測1、教主自身の言葉)

**その通りだった。ただし対象が違う。** 鳴らない番人は「まだ建てていない門」ではなく、**「建ててあるのに誰も撃たない門」**である。

### なぜ鳴らなかったのか — 三つの穴を実測した

**(a) `status --json` が警告を捨てている。**
```
JSON の相の鍵: id,agent,status,gate
dispatchedAt を運ぶか: false
警告/stale を運ぶか: false
```
機械が読む口(`--json`)に `dispatchedAt` も stale 判定も乗っていない。**人間向けテキストにだけ載っている。** 機械が読めない警告は、機械が鳴らせない。

**(b) 撃つ者が居ない。** `pulse.js` に `stale`/`dispatchedAt`/`running` は**一件も現れない**(grep で 0 行)。ダッシュボードは沈黙を表示していない。CI も `conclave` を実行していない(workflow 内の `conclave` 出現は 1 行、コメントのみ)。

**(c) exit code が常に 0。** `node graph/conclave.js status --run …` は stale があっても `EXIT=0` である。`status` は表示器であって門ではない。

### ゆえに問【1】の各問いへ直接答える

| 教主の問い | 答え |
|---|---|
| 機構は鳴らせるか | **鳴らせる。既に書いてある。** `statusBoard` が第51条で建てた |
| 新 engine か既存の拡張か | **どちらでもない。「配線」である。**`--json` に `dispatchedAt`/`staleMs` を載せ、`pulse` か `daily-guard` が読む。**重複を作るな**という掟に照らせば、新 engine を建てるのは誤りである |
| 閾値の根拠 | **既に実測から在る。`STALE_MS = 15分`。** 第52条の閾値と同じく engine 一箇所が語っている(第41条)。新たに導出する必要は無い |
| 偽陽性を先に考えよ | **下記** |

### 偽陽性を先に考える(教主の指示)

**15 分は本走行の実データで検証できる。** 本相 `reflect` は `dispatchedAt=09:45:47Z`、測定時 `age=4分` で `stale=false` だった。つまり**現に走っている相を誤検知していない。**

だが偽陽性の危険は残る。実測した本走行の相の性質:
- `census check` は **706 秒**(11.8 分)、`atlas check` は **710 秒**(11.8 分)を要した(verify §1.2)。**この二つを含む相は 15 分に極めて近い。**
- 神との対話中は `dispatchedAt` が更新されない。

**ゆえに本相の推奨は「鳴らす」ではなく「見せる」である**:
- `pulse` のダッシュボードに stale な相を**表示**する(exit code を汚さない)。神が既に番人をやっているのだから、**神の画面に出せば番人の仕事が機構へ移る。**
- **exit 1 で落とす門にするのは早い。** 15 分は第51条が「走者の死」のために置いた数であって、「教主の沈黙」のために測った数ではない。**第52条の閾値がそうしたように、沈黙の実測を取ってから閾値を分けるべきである。**本走行で観測された沈黙は 3 回だが、**その継続時間は誰も記録していない**(観測1 自身が「機構が測った数ではない」と認めている)。**測っていない量に閾値を置くのは、本PRが自ら禁じた作法である。**

### 判断

- **今: 配線のみ。**`status --json` に `dispatchedAt` と stale 判定を載せる(既存の `statusBoard` と同じ run から作る — 別集計を書けば食い違う、と教主自身が `:485` に書いている)。これは数行で、新しい閾値も新しい engine も要らない。
- **後続PR: 沈黙の実測を取ってから閾値を分ける。** 第52条が files/churn/bytes でやったのと同じ作法を、時間軸でやり直す。

---

## 7. C-6 [MAJOR] `rework` が道の相として存在しない — 差し戻しを記録する場所が無い

### 実測(verify 申し送り1 の後半)

verify が測ったとおり:
```
conclave.json の全相 id: discover, specify, design, build, prove, review, security, docs, verify, reflect, verdict
rework 相は在るか: false
history に rework は: []
reworks 合計: discovery=0 requirements=0 architecture=0 construction=0 quality=0 tribunal=0
```

reform の道の相を engine に問い直した:
```
$ node -e "…forge.SCALES.reform('<wish>')…"
discover@market-researcher / specify@requirements-analyst / design@architect / build@architect /
prove@tdd-guide / review@code-reviewer / security@security-reviewer / docs@doc-updater /
verify@verification-loop / reflect@self-critic / verdict@creation-judge
```

**`rework` は道に存在しない。** `rework.md` (22,716 B) はディスクに在り、engine は 7 件書き換わり、verify が独立に 9 件塞がっていることを実測した。**しかし機構から見れば差し戻しは一度も起きていない。**

### これは欠陥か — **欠陥である**

`conclave.js` は差し戻しの語彙を**二つ**持っている:
- `ratify --reject` … 粒度は **domain**。枢機卿ごと批准を取り消す
- `resume` … 粒度は **phase**。ただし意味は「走者の死からの回収」であって品質の差し戻しではない

`conclave.js:250-252` の教主自身のコメントが、この不足を既に名指ししている:

> `ratify --reject` … 粒度が domain。`reworks` を消費して loop-guard を無駄に削り、**台帳上で「品質差し戻し」と「走者の死」が混ざって後から区別できない**

**本走行で起きたのは第三の形である**: 審査(review)が BLOCK 1件 + HIGH 2件 + MEDIUM 4件を出し、**同じ枢機卿の中で engine を直した。** domain 批准は取り消していない(取り消せば discovery まで巻き戻る)。走者も死んでいない。**この形を記録する場所が、台帳に一つも無い。**

### 結果として何が失われたか — 実測

`gauge.js` は走行の荒れ具合(trajectory)を `reworks` と `resumes` から導く(`:63,68,81,89`)。`reworks` が全枢機卿 0 である以上、**本走行の trajectory score は「一度も差し戻していない完璧な走行」として算出される。**

第38条は「改善の主張は gauge の前後数値で」と定め、`verdict.js:76` は `loopGuardTrips > 0` を「暴走した走行は事故であって成果ではない」として REWORK にする。**本走行は BLOCK 1件を含む 9 件を差し戻したにもかかわらず、その痕跡が数値に一つも残らない。** 第38条が測ろうとした量が、この形の差し戻しに対して測れていない。

### 判断

**後続PRの宿題(ただし verdict は本PRの trajectory を額面通り読んではならない)。**

- 相を足すのは道の設計変更であり、本PRの範囲(環の中の序列を機械化する)を超える。**M-2 の見送り理由と同型であり、この理由は妥当である。**
- ただし **verdict への申し送り**: `gauge score` を本走行に対して撃つ場合、`reworks=0` は「差し戻しが無かった」ではなく「**差し戻しを記録する場所が無かった**」である。C-3 の `tierAudit.ok=true` と**同じ読み違えの罠**であり、同じ扱いをせよ。

---

## 8. 問【2】への直接の答え — fail-open の全 engine 走査

教主は「数を出せ」と命じた。出す。

### 機械的走査(grep、`graph/*.js` 36 engine)

| 型 | 件数 | 内訳(engine:件数) |
|---|---|---|
| `catch { return null }` | **12** | apply-guards:1 apply-seat:1 branch-guard:1 census:1 check-agents:2 critic:1 deploy:2 kg:1 spawn-trace:1 upstream:1 |
| **空の `catch {}`** | **20** | atlas:3 contract:2 critic:1 derived:3 domains:1 export-state:2 ordain:4 **spawn-trace:4** |
| `|| 0` | **33** | verdict:9 gauge:4 atlas:3 build-identity-catalog:3 export-state:3 kg:3 conclave:2 spawn-trace:2 upstream:2 deploy:1 pulse:1 |
| `catch → [] / {} / false / ''` | **8** | critic:2 workspace:2 census:1 deploy:1 derived:1 wiring:1 |
| **合計** | **73 箇所** | |

### 危険なものを名指しする(実測で仕分けた)

**grep の 73 件を「73 件の欠陥」と報告しない。** 大半は正当である。実際に撃って仕分けた:

| # | 箇所 | 判定 | 根拠 |
|---|---|---|---|
| **1** | `spawn-trace.js:325` (bytes の statSync) | **🔴 危険** | **C-1。実測で緑を出した** |
| **2** | `spawn-trace.js:340` (`dirBytes` 二重 catch + サブディレクトリを 0) | 🔴 危険 | 同型。rework が m-4 として認識済み・運用が無いため優先度低 |
| **3** | `critic.js:423` (lessons の JSON.parse) | **🔴 危険** | **C-2。CI で実際に 0 件になる** |
| 4 | `spawn-trace.js:311` (未追跡ファイルの行数) | 🟡 許容 | 失敗時 `n=0`。**churn を過小評価**するが、直上に `MAX_UNTRACKED_READ` の過大評価が同居し、S-4 の試験が撃っている。ただし `unmeasured` に積まないのは C-1 と同じ病 |
| 5 | `domains.js:99` (clergy の require) | 🟢 無害 | **実測: clergy を throw させても `need=13 missing=0 ok=true` で変化なし。**`forge.SCALES` が既に同じ 13 名を名指ししており、この catch は冗長路である |
| 6 | `deploy.js:35,46` (md5/contentHash) | 🟢 正しい | `null` は捨てられず `'source missing'`/`'not deployed'` として **drift に積まれる**(`:139-141`)。失敗が可視化されている — **これが正しい型である** |
| 7 | `verdict.js:49,50,62,87,90` (`sec.issues \|\| 0`) | 🟢 修正済み | 第37条で `if (!report.security) breaches.push(…)` が上に立った(`:145`)。`|| 0` は残るが**到達前に BLOCK が出る** |
| 8 | `ordain.js:45,48` (existingNames) | 🟢 正しい | 名簿が縮めば**衝突を見逃す = 偽陰性**だが、S-2/S-3 の門が後段で拒む |
| 9 | `contract.js:65,88` (statSync/dirSize) | 🟡 許容 | `exists=false` として扱われ**拒む方向**(fail-closed) |
| 10 | `derived.js:127,139,164` | 🟢 正しい | 生成物の不在は `exists=false` として報告される |

**危険 = 3 件(#1 #2 #3)。うち 2 件は本PRが触った engine である。**

### 観測2 の問いへの答え — 「条文が在るのに実装が片側だけだった。何が保証するのか」

**答え: 何も保証していない。そして本PRはその証拠を自ら増やした。**

- 第16条は在った。`atlas.js` が論点Fで正しく解いた。**`spawn-trace.js` の `files`/`churn` には適用され、同じ関数の `bytes` には適用されなかった**(C-1)。
- 教訓 `art29-derived-not-truth` は在った。`derived.js` が lessons.json を「中身を前提にするな」と宣言した。**`critic.js` は中身を前提にしないどころか、中身が空でも黙った**(C-2)。

**第13条(教訓はその範囲に縛られる)の裏面は、範囲の取り方ではなく「適用の証跡が残らないこと」である。** `atlas.js` が `inconclusive` を新設したとき、**「同じ問いを持つ engine を全て洗ったか」を誰も測らなかった。** 第21条(全ての口を見張れ)は名前の参照については実装されている(`wiring.js`)が、**「同じ設計上の問い」については実装されていない。**

### 走査自体を門にできるか(第21条)

**部分的にできる。ただし単純な grep 門にしてはならない。**

- **できない理由**: 上の仕分けが示す通り、**73 件中 70 件は正当である。** grep 件数を凍らせる門は lessons の `gate-asserts-invariant-not-symptom` が名指しした「今日の欠陥数を凍らせる試験」そのものになる。
- **できる形**: 不変条件で撃つ。**「失敗を既定値に潰す箇所は、その失敗を呼び手に見せる経路を持たねばならない」**。`spawn-trace` は `unmeasured[]`、`atlas` は `kind`、`deploy` は `drift[]` を既に持っている。**この三つが同じ形を持っていることが、門にできる不変条件である。**
  - 具体的には: **測定を名乗る engine(`measure`/`check`/`verify` を export するもの)は、失敗を積む配列か `kind` を返さねばならない**、を裁く。
- **今は建てるな。** これは新しい設計相を要する(どの engine が「測定を名乗る」かの定義が必要)。**後続PRの宿題。**

---

## 9. 問【5】未着手の指摘への裁定

### M-1(統治免除の理屈と実装の不一致) — **rework の見送りは妥当。ただし宿題として明記せよ**

まず再現した:
```
artifact 未登録(=統治行為)の measure: {"files":2,"churn":788,"bytes":0,"measurable":true}
計上されたファイル: ["reform/pontiff-office/pontiff-notes.md","reform/pontiff-office/verification-report.md"]
```
**review の指摘は今も生きている。** 成果物を一つも登録しない純粋な統治行為でも `files=2 / churn=788` が計上される(閾値は files 2 / churn 50)。

**rework の見送り理由(a)(b) を検めた結果、妥当である:**
- **(a) artifact 配下だけを測る** → **正しく退けた。** `measure()` の doc が実測で否定した道であり(委譲の証跡を持つコミットは 113件中 0件)、**B-1 を塞いだ直後により大きな fail-open を開ける**。本相の C-1 が示す通り、この走行は既に fail-open を一つ見落としている。**今この方向へ動かすのは危険である。**
- **(b) 白名簿** → **正しく退けた。** `design.md:251` の「白名簿は必ず漏れる」は正しく、第21条が支持する。

**加えて rework が挙げなかった論拠を本相が足す**: 現在の実装は**過大評価の側**(赤は出るが緑は出ない)へ倒れている。これは fail-safe であり、**C-1(fail-open)と真逆の向き**である。**同じ走行で fail-open が一つ残っている以上、fail-safe な不一致より fail-open を先に直すのが正しい優先順位である。**

**ゆえに: 後続PRの宿題として明記せよ。** 直すべきは engine ではなく `requirements.md §2.5` の記述である(要求相の領分)。**「登録された成果物だけを見る」は `bytes` にしか当てはまらない**と書き直すこと。

### M-2(環の外の仕事は捕捉できない) — **見送りは妥当。ただし「明示」の宿題は依然未着手であり、本相が引き取る**

`judge()` の呼び手を数え直した:
```
$ grep -rn "\.judge(\|judge(run" graph/*.js
graph/conclave.js:344:  const v = trace.judge(run, id, { tier: opts.tier, artifact: artifactPath, cwd: opts.cwd });
```
**`spawn-trace.judge()` の呼び手は今も `markDone` ただ一つである。** review の実測は生きている。

**見送り理由は妥当である**: 環の外の仕事を発見する機構は新しい設計相を要する。C-4 の走査が示す通り、突合の材料は在るが、**「環の外の成果物」と「一つの相が産んだ複数の文書」を区別する設計**が先に要る(29 件中 18 件が後者)。

**だが rework 自身が「果たしていない」と書いた申し送り — `prove.md` への一文 — は依然として未着手である。** verify も申し送り5でこれを繰り返した。**三つの相が同じ一文を「次の誰かが書く」と言い送っている。**

**本相の裁定**: **この一文はもう先送りできない。** ただし置く場所は `prove.md` ではない。第39条の作法に照らせば、**散文へ書いた掟は 70% しか守られない**。既に `CLAUDE.md` には教主の手で正しい一行が入っている:

> 門は**環の中でしか**序列を裁けない — 環を通さない手仕事は無証跡である。

**この一行が既に存在することを、review も rework も verify も見ていない。** 三つの相が「書かれていない」と言い送った文は、**docs 相が既に書いていた**(観測3 が引用しているのはまさにこの一行である)。

**ゆえに M-2 の「明示」の宿題は、実質的に果たされている。** 残るのは `requirements.md` / `design.md` の受入条件へ「範囲外」として明記することであり、これは M-1 と同じく**要求相の領分・後続PRの宿題**である。

### verify 申し送り4(素の環境で撃った門の数が減る) — **第37条には触れない。ただし報告の書き方に条件を付ける**

実測し直した:
```
$ PARADISE_UPSTREAM=/nonexistent CLAUDE_HOME=/nonexistent node graph/deploy.js check
checked: 0  transforms (diff expected): none
  ✓ every deployed file matches its declared source          ← EXIT=0

$ … node graph/apply-spawn.js verify
  (harness not installed here — check skipped)
no harness at this path — nothing to verify                   ← EXIT=0
```

**第37条(不在は通過ではない)に触れるかを分けて答える:**

- **`apply-spawn verify` は触れない。** 出力が `check skipped` / `nothing to verify` と**明示的に名乗っている**。第37条が禁じたのは「検査していない」と「問題ゼロ」が**同じ文になる**ことである。ここは別の文になっている。lessons の `env-is-not-canon`(「門は不在の側でも『不在の契約』を測れ」)が定めた作法に従っている。
- **`deploy check` は際どい。** `checked: 0` と印字はするが、**次の行が `✓ every deployed file matches its declared source` である。** 0 件を検めて「全ての配備物が一致している」と述べるのは、**第37条が名指しした「空のレポートが SHIP を得る」と同じ文型**である。`checked: 0` を読まねば区別できない。

**判断: 軽微だが直す価値がある(後続PR)。** `check()` は既に `skipped: true` と `note: 'no harness on this machine…'` を返している(`deploy.js:134`)。**CLI がそれを印字していないだけである**(`:247` は `r.checked` しか読まない)。`apply-spawn` と同じく「検めるものが無かった」と名乗らせれば揃う。**engine の判定は既に正しく、口が正直でないだけである。**

**なお verify の扱いは適切だった** — §2 で「この2門については素の環境の緑は通常環境の緑ほど強い証拠ではない」と自ら書いている。第16条を守っている。

---

## 10. 問【6】この改修そのものへの敵対的批評

### C-7 [MEDIUM] 閾値の循環論法 — 実測で評価する

教主の問い:「閾値は実測 p25 から導いたが、**それは『過去の楽園がやってきたこと』であって『正しい境界』ではない**。」

**この批判は正しい。そして実測すると、循環論法であることが数字に出る。**

非merge 113 コミットを全て測り直した(`probe-thresholds.js`):
```
閾値: {"t3":{"files":2,"churn":50,"bytes":4096},"t2":{"files":10,"churn":880,…}}

非merge コミット総数: 113
  序列3の枠に収まる (files≤2 && churn≤50): 11 件 = 9.7%
  序列2の境界を超える (files>10 || churn>880): 35 件 = 31.0%
  どちらでもない中間帯: 67 件 = 59.3%

files 分布: p25=2 p50=4 p75=10 max=77
churn 分布: p25=106 p50=323 p75=880 max=39539
```

**評価:**

1. **循環は在る。だが致命的ではない。** 閾値は「過去の中央値」ではなく **p25(下位四分位)** に置かれている。「過去にやってきたことの 9.7% だけが序列3枠」という結果は、**「これまで通りを追認する」設計にはなっていない**ことを意味する。**循環論法だが、循環の向きが厳しい側へ倒れている。**

2. **ただし `churn ≤ 50` の根拠は弱い。** requirements は「churn の最下位帯(113件中 13件 = 11.5%)」と述べるが、**churn の実測 p25 は 106 であって 50 ではない。**「files の p25」と「churn の最下位帯」という**異なる統計量が同じ表に並んでいる。** 教主が「実測 p25 から導いた」と一括して報告したのは不正確である。**bytes の 4096 も「p25=4,040 を丸めた」であり、三つの数の導出根拠が三様である。**

3. **59.3% が中間帯に落ちるのは設計として正しい。** 序列2(編成)は「これを超えたら道を組め」の下限であり、中間帯は「委譲(序列1)で足りる」領域である。**空白ではなく既定である。**

**判断: 後続PRの宿題。ただし今すぐできることが一つある** — `spawn-trace.js:46-54` の doc comment が「requirements §2.4 の実測」と一括して述べている箇所を、**三つの数それぞれの導出(files=p25 / churn=最下位帯 / bytes=p25を丸め)に分けて書く**こと。**数の出所が一箇所であること(第41条)は守られているが、出所の説明が実際より均質に見える。**

### C-8 [MEDIUM] 測っている量と、神が困っている量は同じでない

教主の問い:「**神は『教主の工数が多すぎる』と言ったのであって『教主の変更行数が多すぎる』とは言っていない。**」

**批判は正しい。そして本走行がその証拠を産んだ。**

神の実際の言葉(`conclave.json` の `meta.wish` に保存されている):
> 教主は神と作業者の間に立ち、タスクの管理・指示出し・結果の確認のみを行い、**自ら制作作業をしない**

そして観測1が記録した神の三度の言葉:
> 「動いてる?」/「うごいていますか。」/「またまたまたとまっている」

**神が三度困ったのは、教主が書きすぎたからではない。教主が止まったからである。**

| 神が困った回数(本走行) | 機構が測る量 |
|---|---|
| 教主が書きすぎて困った: **0 回** | files / churn / bytes → **測る** |
| 教主が止まって困った: **3 回** | 沈黙の長さ → **測らない**(C-5) |

**第52条の門は、本走行において神が一度も困らなかった量を測り、三度困った量を測っていない。**

**ただし公平を期す**:
- 願い文(`meta.wish`)は「自ら制作作業をしない」と明記しており、**教主の手仕事を測ることは願いの直接の要求である。** 第52条が的外れなのではない。
- 神の三度の叱責は**本走行中に起きたこと**であり、願いが発せられた時点(`created: 02:30:46Z`)より後である。**設計時点で測れなかった量である。**

**ゆえに判断: 第52条は「間違った量を測った」のではなく「**測るべき量の片側しか測っていない**」。** 観測1・観測3 が「同じ穴の両端」と述べたのは正しい。C-5 が示す通り、**もう片端を測る道具は既に楽園に在る**(STALE_MS)。**後続PRで、沈黙の実測を取ってから閾値を分けよ。**

### 第52条は門と対になっているか — 実測

教主の問い:「**条を足せば足すほど『機械が強制しない散文』が増える**(第33条・第39条)。今回の条は門と対になっているか、実測で確かめよ。」

```
条の総数: 52
engine/テストを名指しする条: 28
名指ししない条: 24 => 1,2,3,4,5,6,7,8,9,10,11,15,17,18,19,20,26,32,35,36,45,46,49,51
```

**第52条は門と対になっている。** `graph/` の 7 engine(`clergy` `conclave` `domains` `forge` `gauge` `ordain` `spawn-trace`)が第52条を名指しし、`tests/paradise.test.js` に **71 行**が第52条/序列3/tier3/TIERS を撃っている。**条文だけの条ではない。**

**だが批判は二つ残る:**

1. **憲法の 46% (24/52) が engine を名指ししていない。** 第33条は「機械が強制しない法は忘れてよい提案である」と述べる。**その 24 条は今どうなっているのか、誰も測っていない。** `census.js` は条の**数**は数えるが(`:66`)、**条と門の対応は数えていない。** これは第21条(全ての口を見張れ)の未実装領域である。
2. **本相が名指しした C-5 の対象、第51条は「名指ししない 24 条」の一つである。** そして実際に **`statusBoard` にしか実装が無く、誰も撃たない**状態だった。**「門と対になっていない条は腐る」という第33条の主張が、実測で裏付けられた。**

**判断: 後続PRの宿題。**「条 → engine」の対応表を `census` が数え直す門は建てられる(第22条の型そのもの)。**ただし単純な grep 門にするな** — 第33条・第39条のような「散文の在り方を定める条」は engine を名指ししようがない。**`kind` を宣言させる形**(lessons の `art28-conduct-not-grepped` が `kind:conduct` で解いたのと同じ)が正しい。

---

## 11. verdict への申し送り

### 今直すべきもの(本PR内)

| # | 件 | 直しの大きさ | 理由 |
|---|---|---|---|
| **C-1** | `spawn-trace.js:325` の `bytes` fail-open | 数行 + 回帰3本 | **本PRが BLOCK と断じた病と同一構造。**「塞いだ」と report できない |
| **C-2** | `critic.js:423` — 教訓 0 件を名乗らせる | 数行 | **本相を撃つ門自身が空で緑を出す。**CI で実際に 0 件 |
| **C-3a** | `tierAudit` に `created > 紀元導入時刻 && !epoch` を足す | 十数行 | `epoch` 削除という**門の完全な回避経路**が塞がる |
| **C-5a** | `status --json` に `dispatchedAt` / stale を載せる | 数行 | **新しい門を建てない配線のみ。**判定は第51条が既に持っている |

**C-1 と C-2 は本相が「今直すべき」と判断する。** 残る2件は verdict の裁量とする。

### 後続PRの宿題(理由付きで先送り)

| # | 件 | 先送りの理由 |
|---|---|---|
| C-3b | 紀元導入時刻を engine 内へ(`TIER_EPOCH_AT`) | 移行方針の再設計を伴う |
| C-4 | 台帳とディスクの突合門 | `artifactPath` の複数化設計が先に要る(29件中18件がこの形) |
| C-5b | 沈黙の閾値を第51条から分ける | **沈黙の長さを一度も実測していない。**測らずに閾値を置くのは本PRが禁じた作法 |
| C-6 | `rework` 相の新設 | 道の設計変更。M-2 と同型 |
| C-7 | 三つの閾値の導出根拠を分けて書く | 要求相の領分 |
| C-8 | 沈黙側の量を測る | C-5b と同じ |
| M-1 | `requirements.md §2.5` の訂正 | 要求相の領分。**engine は fail-safe 側に倒れており急がない** |
| M-2 | requirements/design への「範囲外」明記 | 要求相の領分。**`CLAUDE.md` には既に一行在る** |
| 申送4 | `deploy check` に「検めるものが無かった」を名乗らせる | 軽微。engine の判定は既に正しい |
| — | 「失敗を潰す箇所は呼び手に見せる経路を持て」の門 | 「測定を名乗る engine」の定義が先に要る |
| — | 「条 → 門」の対応を census が数える門 | `kind` の宣言設計が先に要る |

### verdict が**書いてはならない**こと(第16条)

1. **「第52条の門が本PRを裁いた」と書くな。** 本走行は `epoch` を持たず、11相すべて `unobservable` である。`tierAudit.ok=true` は**対象外**を意味する(C-3)。
2. **「差し戻しゼロの走行だった」と書くな。** `reworks` 全枢機卿 0 は「差し戻しが無かった」ではなく「**記録する場所が無かった**」である。実際には BLOCK 1件を含む 9 件が差し戻された(C-6)。
3. **「critic が敵対的自己批評を通した」を証拠に使うな。** その門は教訓 0 件でも緑を出す(C-2)。本相が走らせた `critic review graph --self --lessons graph/lessons.json` は **73 件の lesson を撃って緑**だったが、**それは KG がこの機に在ったからである。**

---

## 12. 本相自身の限界(第16条)

- **CI 上での実走は本相も確認していない。** C-2 の「CI では 0 件になる」は、`PARADISE_KG` を空ディレクトリへ向けたローカル再現である。GitHub Actions 上の実走ではない。ただし `derived.js:43-48` が**engine 自身の宣言として同じことを述べている**ので、二つの独立な根拠がある。
- **観測1 の「三度」は本相も検証できていない。** 機構がそれを測っていないことは C-5 で示したが、**三度という数自体は教主の自己申告のままである。**本相はそれを反証も裏付けもしていない。
- **engine を一行も直していない。** 本相の全ての実測は一時ディレクトリまたはメモリ上の合成 run で行った。走行終了時の確認:
  ```
  $ git status --porcelain
   M reform/pontiff-office/conclave.json     ← 本走行の前から在る
  ?? reform/pontiff-office/pontiff-notes.md  ← 本走行の前から在る
  ?? reform/pontiff-office/verification-report.md ← 本走行の前から在る
  ```
  `graph/` と `tests/` は無傷である。
- **C-4 の走査で一度誤った。** 抽象名の `artifactPath` を「幽霊」と数えて 9 件と報告しかけた。分類を直して再測した(真の幽霊は 0 件)。**誤った再現で楽園を有罪にしなかった**が、**一度は有罪にしかけたことを記録に残す。**
- **本相は門相である。** 第52条(d) により序列3を名乗れない。本相の成果物は `critique.md` 1 件であり、engine の変更は 0 である。
