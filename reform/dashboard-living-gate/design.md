# design.md — ダッシュボード刷新の**構造** (design 相)

> **本書は構造のみを述べる。** 肌・配色・書体は `identity.md`、画面と流れは `ux.md` に在る。
> **第17条**: 「Structure lives in `design.md`; appearance lives in `identity.md`;
> conflating the two names is itself a defect.」— 三者を混ぜないことが要件である。

- **対象**: `reform/dashboard-living-gate/requirements.md`(批准済み)FR-01〜23 / NFR-01〜07 / G-01〜10
- **入力**: `ratify-requirements-2.md`(§6 申し送り)/ `findings.md` / `findings-speed.md` /
  `findings-gate-syntax.md` / `findings-base-red.md`
- **機**: Windows 11 / git-bash / node v24.14.0 / GNU grep 3.0
- **本書の姉妹**: `identity.md`(見た目)/ `ux.md`(画面と流れ)

---

## §0. 申し送りの受領(R-1 / R-2 / D-13)

再審査報告 §6 の 3 件を **`requirements.md` に反映済み**である。本書はその結果の上に立つ。

| # | 是正 | requirements.md での位置 | 現時点の実出力 |
|---|---|---|---|
| **R-1** | `AC-N05b` を `fs.existsSync` + `readdirSync` の node 形へ全面改稿。exit code で裁かない | §NFR-05 | `NG: 対象テストが 0 件` / exit=1(**則1: 正しく赤**) |
| **R-2** | `AC-14d` に `<run.json>` 引数を補い、`forge.buildDag` との 3 値一致へ。則3 免除リストへ追加 | §FR-14 / §FR-22 | `phasesTotal=17` と `buildDag(x,'full').tasks.length=17` が一致 |
| **D-13** | `conclave.js status --run` は **path**。AC-05d / AC-14a を path 形に修正し §9.5 に D-13 を明文化 | §FR-05 / §FR-14 / §9.5 | `--run tenbin` → ENOENT 例外 / `--run …/conclave.json` → `domains ratified: 6/6` |

**設計への波及**: D-13 により、本設計の run 列挙は **一切 slug を CLI に渡さない**。
`workspace.resolve()` が返す倉の住所から `<root>/<slug>/conclave.json` を組み立てる(§1.4)。

---

# §1. `graph/pulse.js` の設計

## 1.1 なぜ 1 本の engine に集約するか

**分散させないのは、第22条(数の一致)を機械で検査できるようにするためである。**
画面が engine を個別に呼ぶ設計では「画面が出した数」と「engine が出した数」の突合点が
画面の数だけ増え、G-01 の門が書けない。**断面(snapshot)という単一の突合点**を置けば、
門は「断面の数 == その場で数えた数」の 1 式で書ける。

## 1.2 起動形態 — require で常駐。子プロセス禁止(NFR-07)

```js
// graph/pulse.js 冒頭。module として読む。これが常駐の実体である。
const clergy    = require('./clergy.js');
const forge     = require('./forge.js');
const workspace = require('./workspace.js');
const kg        = require('./kg.js');
const wiring    = require('./wiring.js');
// child_process は書かない。execFileSync / spawn / exec / fork のいずれも snapshot 経路に無い。
```

**根拠(findings-speed.md 実測)**:

| 呼び方 | 初回 | 2 回目以降 |
|---|---|---|
| 子プロセス(`execFileSync`) | 27〜73ms / engine | 毎回同じ(node 起動代を毎回払う) |
| `require` で常駐 | **7.4ms**(require 4.7ms 込み) | **0.53ms** |

**137 倍差**である。子プロセスを産む設計は「engine の代金」ではなく「node の起動代」を毎回払う。
ゆえに **NFR-07 / AC-N07a(`grep -cE "child_process|execFileSync|spawnSync|execSync" graph/pulse.js` が `0`)**
を構造として満たす。

**API の罠を設計時に固定する**(findings-speed.md で実測):

| 誤り | 正 | 誤ると |
|---|---|---|
| `clergy.college()` | `clergy.COLLEGE` / `clergy.orgChart()` | `is not a function` |
| `forge.plan(w,{scale})` | `forge.buildDag(w, 'reform')` — **第2引数は文字列** | `SCALES[scale] is not a function` |
| `conclave.js status --run <slug>` | `--run <root>/<slug>/conclave.json` | ENOENT 例外(**D-13**) |
| `gauge.js score --json` | `gauge.js score <run.json> --json` | ENOENT / exit 2(**R-2**) |
| `kg.query('')` | 正しい(全 99 ノード) | — |

## 1.3 断面(snapshot)の JSON スキーマ — 鍵ごとの定義

**表の読み方**: `source` はその値がどの engine / ファイル由来か。`ms` は本機での実測または見積。
`落ちたとき` は当該 engine が例外を投げたときに `errors[]` へ積む内容と、その鍵の代替値。

### 1.3.1 最上位

| 鍵 | 型 | source | ms | engine が落ちたとき |
|---|---|---|---|---|
| `schemaVersion` | `number` | 定数(pulse.js) | 0 | — |
| `generatedAt` | `string` | `new Date()` | 0 | — |
| `generatedAtMs` | `number` | `Date.now()` | 0 | — |
| `ageMs` | `number` | 受信側が算出。断面上は常に `0` | 0 | — |
| `transportHint` | `"sse"\|"poll"\|"frozen"` | サーバが配信経路に応じ付す | 0 | — |
| `connections` | `number` | サーバ内の SSE 接続カウンタ | 0 | — |
| `counts` | `object` | §1.3.2 | — | 個別 |
| `gates[]` | `array` | §1.3.3 | ~200 | 個別 |
| `runs[]` | `array` | §1.3.4 | ~1.0 | 個別 |
| `daily` | `object` | §1.3.5 | ~30 | `null` |
| `scale` | `object` | §1.3.6 | ~1 | `{}` |
| `lessonsByKind` | `{mechanism:n, conduct:n}` | `lessons.js export --out` | ~40 | `{}` |
| `census` | `object\|null` | 非同期キャッシュ(§1.6) | 0(同期経路で呼ばない) | `null` |
| `source` | `object` | 各鍵 → engine 名の写像 | 0 | — |
| `errors[]` | `array` | §1.5 | 0 | — |

`generatedAt` は **ISO を断面(機械可読データ)には持つ**。
**画面へ `toISOString()` の文字列をそのまま出してはならない**(楽園の掟)——
表示は `ux.md` §3 の局所時刻規則が担う。断面は機械の言葉、画面は人の言葉である。

### 1.3.2 `counts` — 数の看板(第22条)

| 鍵 | source(実装) | 突合相手(門が使う第2の数え方) | ms | 落ちたとき |
|---|---|---|---|---|
| `articles` | `codex.js` の索引長 | `node graph/codex.js index` の条数 | ~3 | `null` + errors |
| `engines` | `fs.readdirSync('graph').filter(/\.js$/)` | `ls graph/*.js \| wc -l` | 0.7 | `null` + errors |
| `cardinals` | `Object.keys(clergy.COLLEGE).length` | `clergy.js college \| grep -c '^枢機卿'` | 0.0 | `null` + errors |
| `creations` | `workspace.resolve()` の root 直下、`_` 始まりでない dir | `ls -d <root>/*/` | 0.2 | `null` + errors |
| `workshops` | 同 root 直下、`_` 始まりの dir | 同上 | 0.2 | `null` + errors |
| `runs` | `<root>/*/conclave.json` の実在数 | `ls <root>/*/conclave.json \| wc -l` | 1.0 | `0` + errors |
| `agents` / `commands` / `skills` | `check-agents.js` / `~/.claude` 配下の実数え(**読むだけ**) | 同 engine | ~30 | `null` + errors |
| `lessons` | `lessons.js export --out <tmp>` の要素数 | export した JSON の length | ~40 | `null` + errors |
| `kgNodes` | `~/.claude/paradise-kg/nodes.jsonl` の解釈できた行数 | `wc -l < nodes.jsonl` | ~2 | 解釈できた行数(部分成功) |
| `kgEdges` | 同 `edges.jsonl` | `wc -l < edges.jsonl` | ~2 | 同上 |

**執筆時点の実測**: engines 33 / cardinals 7 / articles 50 / creations 7 / kgNodes 99 / lessons 65。
**これらは期待値ではない**(則3)。門は常に「断面の数 == その場で数えた数」で裁く(AC-01a/b/f/g)。

**`counts.engines` は pulse.js 自身を含んで 34 になる。** AC-E3 が命じるとおり、
固定値 33 と比較する実装を書いてはならない。

### 1.3.3 `gates[]` — 門の合否(FR-15)

```
gates[i] = { name, ok, ms, at, detail }
```

| 鍵 | source | 型 | 落ちたとき |
|---|---|---|---|
| `name` | 5 門固定: `wiring` `vendor` `derived` `check-agents` `workspace` | `string` | — |
| `ok` | 各 engine の `check()` を **module として**呼び、例外なし・`ok:true` | `boolean` | `false` + errors に理由 |
| `ms` | `process.hrtime.bigint()` 差分 | `number` | 計測できた分 |
| `at` | 実行時刻(ms epoch) | `number` | — |
| `detail` | `wiring` のみ `{orphans:[], dangling:[]}`(件数と内訳) | `object` | `{}` |

**実測**: 5 門とも 27〜53ms、合計 200ms 未満。**AC-15c(合計 1000ms 未満)** に構造的に収まる。
**`ok:false` は errors[] に積まない** — 門が赤いのは engine の故障ではなく**事実**だからである。
積むのは「engine が例外を投げて合否そのものが取れなかった」場合に限る。

### 1.3.4 `runs[]` — 走行中の環(FR-14)

**源は `conclave.json` の直読み。engine を呼ばない**(S-3。5 件 1.0ms 実測)。

```
runs[i] = { name, path, phasesDone, phasesTotal, domainsRatified, domainsTotal,
            state, score, spawn:{observed,assertedOnly,noTrace}, contradiction,
            metrics:{firstPassRate,reworkCount,retryOverhead,loopGuardTrips,durationMs},
            historyLength, lastEvent:{ts,event,detail}, scaleGuess }
```

| 鍵 | source | 算出 | 落ちたとき |
|---|---|---|---|
| `name` | dir 名 | — | — |
| `path` | `<root>/<slug>/conclave.json`(**D-13**: slug を CLI に渡さない) | — | — |
| `phasesDone`/`phasesTotal` | `domains[].phases[]` を舐めて `status==='done'` を数える | 直読み | run 単位で skip + errors |
| `domainsRatified`/`domainsTotal` | `domains[].status==='ratified'` | 直読み | 同上 |
| `state` | **`phasesDone < phasesTotal` → `stalled` / それ以外 → `complete`** | 派生 | `unknown` |
| `score` | `gauge.js` を **module として** `score(runPath)` | 〜10ms | `null` + errors |
| `spawn.*` | `spawn-trace.js` を module として。三値 | 〜20ms | `null` + errors |
| `contradiction` | **`score >= 90 && spawn.noTrace > 0`** の真偽 | 派生 | `false` |
| `metrics.*` | gauge の 5 指標 | 同 score | `null` |
| `historyLength` | `history.length` | 直読み | `0` |
| `lastEvent` | `history[history.length-1]` | 直読み | `null` |
| `scaleGuess` | `phasesTotal` を §1.3.6 の相数表に照合して道名を引く | 派生 | `null` |

**`spawn-trace` の exit 1 を errors に積んではならない**(AC-13c)。
**exit 1 は「起動証跡なし」という事実**であって engine の故障ではない。
module として呼べば exit code は存在せず、返り値の三値をそのまま読める — **これが子プロセスを避ける副次的利得である。**

**執筆時点の実測**(期待値ではない):

```
coin                     11/11  6/6  22 events   complete
habit                    11/11  6/6  40 events   complete
reform-claude-md-diet     5/11  4/6  15 events   stalled  ← 唯一の停止中
reform-eval-gauge        11/11  6/6  26 events   complete
tenbin                   17/17  6/6  27 events   complete + contradiction(score 100 / noTrace 17)
```

**`run.json` 形式(旧 orchestrator)の混在**: `domains` を持たないファイルは
その run 単位で skip し `errors[]` に `{engine:'conclave-read', run:<name>, reason:'no domains[]'}` を積む。
**断面全体は exit 0 で返る**(AC-14c)。

### 1.3.5 `daily` — 日次ノルマ(FR-16)

| 鍵 | source | 落ちたとき |
|---|---|---|
| `due` / `catchUp` / `owedDay` / `reason` / `jst` | `daily-guard.js` を module として | `null` + errors |
| `lease` | `status --json` に保持者欄が**現れる場合のみ**。無ければ鍵ごと出さない | 鍵を出さない |

**exit code を成否として読まない**(AC-16a)。実測 `due` は `{"due":false}` を返しつつ **exit=1**。
**exit 1 = 債務なし**である。module として呼べばこの罠は構造的に消える。
`lease` は discover 未確認のため、**存在しなければ鍵を出さない**(推測を出さない — NFR-06)。

### 1.3.6 `scale` — 道の形(FR-21)

```
scale = { quick:{phases,gates}, standard:{...}, full:{...},
          reform:{...}, counsel:{...}, cartography:{...}, classifierAvailable:true }
```

`source`: `forge.buildDag('x', '<name>').tasks.length`。**第2引数は文字列**(罠表)。
実測 `quick 6 / standard 14 / full 17 / reform 11 / counsel 6 / cartography 11`。
**ハードコードしない** — 相数は `Object.keys(forge.SCALES)` を舐めて動的に得る。
道が 7 本目を迎えた朝、断面がひとりでに 7 本を描く。

### 1.4 run 列挙の設計(D-13 の構造的回避)

```js
function listRuns() {
  const root = workspace.resolve().root;          // 第30条。住所を知るのは workspace.js だけ
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('_'))
    .map(e => ({ name: e.name, path: path.join(root, e.name, 'conclave.json') }))
    .filter(r => fs.existsSync(r.path));          // D-6: 不在と 0 件を取り違えない
}
```

**slug を CLI に渡す経路が構造上どこにも無い。** D-13 の罠は設計で消える。

## 1.5 `errors[]` — engine が落ちたときに積むもの

```
errors[i] = { engine, key, reason, at, fatal:false }
```

| 鍵 | 内容 |
|---|---|
| `engine` | 落ちた engine 名(`clergy` / `forge` / `gauge` / `conclave-read` / `lessons` / `kg` …) |
| `key` | 欠けた断面の鍵(`counts.cardinals` / `runs[2].score` …)。**どこが穴かを名指しする** |
| `reason` | `err.message` の 1 行(スタックは積まない。断面が肥大する) |
| `at` | ms epoch |
| `fatal` | 常に `false`。**断面全体を落とす経路を作らない** |

**設計原則**: 各 engine 呼び出しは `try { … } catch (e) { push(errors, …); return null }` の
**個別の殻**に入れる。1 つの engine が落ちても他の鍵は揃う(**AC-01e**)。
**欠けた鍵は `null` にする。0 や空配列で埋めない** —
`0` は「数えて 0 だった」、`null` は「数えられなかった」であり、**画面はこれを別の状態として出す**
(`ux.md` §2 の 空 / エラー の区別)。**推測で埋めることが最大の嘘である**(NFR-06)。

**故障注入**: 環境変数 `PULSE_FAULT=<engine名>` で当該 engine の呼び出しを強制的に例外にする。
これは **AC-01e / AC-20d が要求する検査手段**であり、テスト専用の入口である。

## 1.6 census の隔離(FR-06 / S-2)

**`pulse.js` は census を一切 require しない**(AC-06a: `grep -rn "census" graph/pulse.js` が `0`)。
census.js は自己診断を子プロセスで丸ごと回すため **実測 120,072ms**。同期経路に置けば画面が 2 分固まる。

**設計**:

```
graph/pulse-census.js      ← 別ファイル。ここだけが子プロセスを許される(NFR-07 の唯一の例外)
  ├ 明示指示でのみ起動する(自動では走らせない)
  ├ 結果を $LOCALAPPDATA/Temp/pulse-census-cache.json に書く
  └ pulse.js は「そのファイルが在れば読む、無ければ census:null」だけを行う
```

**`pulse.js` 側は fs.readFileSync 1 回のみ。子プロセスを産まない。**
census が未取得のとき `census: null` となり、画面は `data-state="empty"` +
`data-awaiting="census"` を出す(AC-06d / `ux.md` §2)。
`census.js` 側には **`--no-tests` フラグ**を足す(FR-06)。既定挙動は変えない。

## 1.7 断面生成の時間収支

| 区分 | 実測/見積 | 備考 |
|---|---|---|
| require 4 engine(初回のみ) | 4.7ms | 常駐後は 0 |
| orgChart + buildDag×6 | 0.53ms | 毎フレーム可 |
| conclave 直読み 5 件 | 1.0ms | |
| gates 5 門 | ~200ms | **最大の費目** |
| lessons export + 読取 + 削除 | ~40ms | 一時ファイルは必ず削除(AC-18c) |
| KG JSONL 2 本 | ~4ms | |
| **合計(常駐 2 回目以降)** | **~250ms** | |

**NFR-01 の 50ms 未満(AC-N01d)を満たすため、gates を毎回走らせない。**

**gates のキャッシュ設計**: `gates` は engine ファイル群の mtime が変わったときのみ再走査する。
`graph/*.js` の最大 mtime を鍵にし、変化が無ければ前回値を `at` 付きで返す。
これにより 2 回目以降の `/snapshot.json` は **~50ms 未満**に収まり、
かつ「いつ測った門の合否か」を `at` が正直に語る(NFR-06)。

---

# §2. サーバの設計 — node 標準 http のみ

## 2.1 依存(FR-10 / NFR-02)

`http` `fs` `path` `url` `os` のみ。**npm パッケージ 0 件。`package.json` の dependencies 0 件。**
AC-10a の検査は否定先読みを避けた形Bで書く(則2):

```bash
grep -o "require('[^']*'" graph/pulse.js \
  | grep -cvE "^require\('(node:|http'|https'|fs'|path'|url'|os'|events'|crypto'|zlib')"
```

**`child_process` を許可リストに入れない** — pulse.js には 1 件も現れないからである(AC-N07a)。

## 2.2 ポート自動割当と告知(FR-10)

```
1. 既定 7317 で listen を試みる
2. EADDRINUSE を捕らえたら server.listen(0, '127.0.0.1') で OS に任せる
3. listening イベントで server.address().port を得る
4. stdout に 1 行だけ告知:  pulse listening port=<n>
5. 同じ番号を dashboard/state.js の window.PARADISE_PORT へ書き出す
```

**待ち受けは `127.0.0.1` のみ。`0.0.0.0` で listen してはならない**(AC-10e)。
ローカル専用・無認証であり、外から触れる面を作らない。

**告知の 3 経路**(クライアントの解決順 — この順である理由も含めて):

| 順 | 経路 | なぜこの順か |
|---|---|---|
| 1 | `window.PARADISE_PORT`(`state.js` が持つ) | **サーバが最後に書いた実際の番号**。最も確からしい |
| 2 | 既定 7317 | state.js が古い/無い場合の常識的な既定 |
| 3 | 解決不能 → 第3層へ即降格 | 当てずっぽうに走査しない(推測禁止・NFR-06) |

**二重起動耐性**(AC-10d): 2 つ目の起動は EADDRINUSE を捕らえて別ポートを取り、**両方が生き続ける**。
`process.exit` してはならない。神が複数のタブ・複数の窓で見ることは正常な使い方である。

## 2.3 エンドポイント設計

| method / path | 返すもの | ヘッダ |
|---|---|---|
| `GET /events` | **SSE ストリーム**(§2.4) | `text/event-stream` / `no-cache` / `keep-alive` / **`Content-Length` を書かない** |
| `GET /snapshot.json` | 断面 1 個(第2層のポーリング先) | `application/json` / `Cache-Control: no-store` |
| `GET /` `GET /index.html` 他 | `dashboard/` 配下の静的配信 | 拡張子から MIME |
| `GET /health` | `{"ok":true,"port":n,"connections":n}` | JSON |
| 上記以外 | 404 + JSON `{error:"not found"}` | JSON |

**全応答に `Access-Control-Allow-Origin: *`**。`file://` の origin は `null` であり、
これが無いと第2層の fetch が CORS で死ぬ。ローカル専用・無認証ゆえ許容する(B-3)。

**パス正規化**: 静的配信は `path.normalize` 後に `dashboard/` の外へ出る参照を **403 で拒む**
(`..` によるディレクトリ脱出を塞ぐ)。ローカル専用でも、書かない理由にはならない。

## 2.4 SSE の設計(FR-09)

```
接続時に送る:
  retry: 1000\n\n                              ← 再接続間隔をサーバが指示する
  event: snapshot\n data: <JSON>\n\n            ← 初回の断面を即座に(空白の一瞬を作らない)

更新時:
  event: snapshot\n data: <JSON>\n\n

15000ms ごと:
  : ping\n\n                                    ← コメント行。プロキシと OS のアイドル切断を防ぐ
```

- **各イベントは空行(`\n\n`)で終端する。** AC-09d はこれを **node の `split` で数える** —
  `grep -c $'\n\n'` は行指向ゆえ空パターンに退化し、**壊れていても全行数を返して永久に緑になる**(則2 / D-10)。
- **再接続を自前で書かない。** `EventSource` の既定動作に任せ、間隔は `retry:` で指示する。
  自前の再接続は EventSource の再接続と二重に走り、接続数を食う(NFR-03 の 6 上限に直撃する)。
- **接続数を数える**: `connections` を `/snapshot.json` と `/health` に出す(AC-N03a)。
  ブラウザ側の 6 上限は観測できないが、**サーバが自分の持つ数を語る**ことはできる。
- **切断時の後始末**: `req.on('close')` で keepalive タイマーを `clearInterval` し、
  購読者集合から除く。**これを怠ると findings-base-red.md と同じ「己の残骸」を作る。**

## 2.5 `fs.watch` の設計(FR-11 / NFR-04)

### 監視対象(ディレクトリではなくファイルを狙う)

| 対象 | 理由 |
|---|---|
| `<root>/<slug>/conclave.json`(実在する run の数だけ) | 環が回った瞬間を捉える最短路 |
| `~/.claude/paradise-kg/nodes.jsonl` / `edges.jsonl` | 記憶が増えた瞬間(**読むだけ。書かない** — N-4) |
| `graph/`(ディレクトリ。engine 増減の検知用) | `counts.engines` と gates キャッシュの無効化 |
| `dashboard/state.js` | 第3層の凍結データが更新された瞬間 |

**ディレクトリ監視を既定にしない。** 実測でディレクトリ監視は `.tmp` の中間状態まで拾い **9 イベント**出た。
`graph/` だけは engine の増減を知る必要があるため例外とし、**デバウンス後に拡張子 `.js` の差分のみ**を見る。

### デバウンス(80ms・タイマー式)

```js
const WATCH_DEBOUNCE_MS = 80;   // 定数は 1 箇所。50〜100ms の範囲(AC-11e)
let timer = null;
function onRaw(eventType, filename) {   // eventType は 'change' でも 'rename' でも同じ扱い
  clearTimeout(timer);
  timer = setTimeout(fire, WATCH_DEBOUNCE_MS);
}
```

**時刻差比較による抑制を書いてはならない。** 実測で Windows は 1 書込につき必ず 2 イベントを出し、
しかも **同一 ms 内に 2 発**(901ms, 901ms)出た。時刻差 0 では抑制できない。**タイマー式のみが効く。**

### `change` と `rename` を等価に扱う

`export-state.js` が安全書き込み(tmp → rename)に切り替えた瞬間、**`change` は一切出ない**。
実測で atomic write は **`rename` のみ**を出した。`change` だけを見る実装は**その日に沈黙する**。
ゆえに `eventType` で分岐しない。

### `rename` 後の張り直しと `filename: null` 耐性

`rename` は inode の差し替えを意味し、古いハンドルは新しいファイルを見ない。
**デバウンス発火後、対象が `rename` を含んでいたら watcher を閉じて張り直す**(AC-11d)。
`filename` が `null` でも分岐せず「対象群のいずれかが動いた」として全面再走査する(AC-11c)。

### バッファ溢れからの復帰(NFR-04)

`watcher.on('error')` で `ERROR_NOTIFY_ENUM_DIR` 等を受けたら:
**(1) 現ハンドルを閉じる → (2) 対象を全面再走査して断面を作り直す → (3) watcher を張り直す。**
復帰したことを SSE で告げ、画面は `disconnected` → `ready` へ戻る(`ux.md` §2)。

---

# §3. 三層フォールバックの実装設計(FR-08 / §4)

## 3.1 定数(**1 箇所で定義する。二重に書かない** — AC-RT-2)

```js
const T = {
  FIRST_EVENT_TIMEOUT_MS: 5000,   // 接続後これだけ無音なら降格
  ERROR_STREAK:              2,   // onerror がこの回数連続したら降格
  POLL_INTERVAL_MS:       2000,   // 第2層の間隔
  PROMOTE_RETRY_MS:      30000,   // 第1層への再挑戦間隔
  RETRY_HINT_MS:          1000,   // サーバが retry: で指示する値
  KEEPALIVE_MS:          15000,   // : ping の間隔
  WATCH_DEBOUNCE_MS:        80,   // fs.watch のデバウンス
  FRESH_LIVE_MS:         10000,   // 生 / 遅延 の境
  FRESH_FROZEN_MS:       60000,   // 遅延 / 凍結 の境
};
```

**二重管理を禁じる理由**: 画面が 10000 を、engine が 12000 を持つと、
**同じ断面に対して画面と engine が違う鮮度を言う**。嘘は齟齬から生まれる。
AC-07b がこの一致を機械で検査する。

## 3.2 各層の判定条件

| 層 | 発動条件 | 更新粒度 | `data-transport` |
|---|---|---|---|
| 第1層 SSE | `typeof EventSource === 'function'` かつ `open` した | 事実が変わった瞬間(デバウンス 80ms 後) | `sse` |
| 第2層 poll | 第1層が張れない/落ちた が `fetch` は通る | 2000ms | `poll` |
| 第3層 frozen | `fetch` が `TypeError` / `fetch` 未定義 / 第2層が連続 2 回失敗 | 再読込時のみ | `frozen` |

**第3層が成立する根拠**: `<script src="state.js">` は CORS を経由しない。
Chrome の `file://` からの `fetch()` は **network error**(WHATWG#3099 実測)であり、
origin は `null` になる。**ゆえに fetch では絶対に届かないが script タグでは届く。**
これは既に `control.html:426` が使っている手であり、**再発明ではなく既存資産の格上げである。**

## 3.3 降格・昇格の遷移

```
起動
 └→ EventSource を張る
      ├ open した                        → 【第1層】
      ├ 5000ms 以内に最初のイベント無し  → 降格
      └ onerror が連続 2 回              → 降格
                                              ↓
     fetch('/snapshot.json') を 2000ms 間隔
      ├ 成功                             → 【第2層】
      └ TypeError / 連続 2 回失敗        → 降格
                                              ↓
     window.PARADISE_STATE を読む        → 【第3層 = 凍結】

 昇格: 第2層・第3層のいずれにいても 30000ms ごとに第1層を再試行し、open したら第1層へ戻す
 再接続: 第1層内の一時切断は EventSource の既定動作に任せる。自前で書かない
```

**なぜ「連続 2 回」なのか**: 1 回の失敗で降格すると、
サーバ再起動の一瞬で凍結表示に落ち、神を無用に驚かせる。
**なぜ「5000ms 無音」も降格条件なのか**: `open` は成功しても
NFR-03 の同時接続 6 上限に当たった 7 枚目のタブは**沈黙する**。
`open` だけを見る実装は、7 枚目のタブで永久に空白を出し続ける。

**昇格を必ず持つ理由**: 一度落ちた画面が二度と戻らないなら、
神は「サーバを立て直したのに画面が凍ったまま」を見る。**それは画面が嘘をついている状態である。**

## 3.4 利用者への通知(NFR-06 — 劣化しても嘘をつかない)

| 手段 | 内容 |
|---|---|
| **常時可視の経路バッジ** | `data-transport` を反映。3 値のいずれかを**必ず**表示する。画面最上部・固定 |
| **一行ログ**(`data-log="transport"`) | 切替のたびに `HH:MM:SS 生(SSE) → 2秒ごと(理由: 最初のイベントが 5 秒来なかった)` を追記。最新 10 行を保持 |
| **鮮度の連動** | 降格しても経過は止めない。第3層に落ちた瞬間、鮮度は必ず `frozen` になる |
| **スピナーを出さない** | 切替中は `data-state="disconnected"` + `data-awaiting="pulse.serve"` で**待っている対象を名指しする** |
| **上限の示唆** | 降格理由が「接続できない」の場合、文言に SSE の同時接続 **6** 上限の可能性を含める(AC-N03c) |

**見せ方の詳細は `ux.md` §2/§3 に在る。** 本節が定めるのは**どの信号を出すか**であって、どう見えるかではない。

---

# §4. ページ構成

## 4.1 何ページ作るか — **2 ページのみ**(新規増設は 0)

| ページ | 役割 | 由来 |
|---|---|---|
| `dashboard/index.html` | **門**。走行中の環・数の看板・門の合否・点数と起動実績・日次ノルマ・道の形・索引 | 既存を全面改稿 |
| `dashboard/control.html` | 深掘り。gates の内訳・KG・教訓・履歴の全件 | 既存を改稿 |

**増やさない理由**: FR-19 は「`dashboard/` 配下の全 `*.html` が index から **1 ホップ**で到達できること」
「孤児 0」を課す(AC-19a)。**ページを増やすほど導線の維持費が上がり、孤児の生まれる面が広がる。**
今ある 2 枚で 8 領域(AC-19e)を賄えるなら、それが最小の構造である。

## 4.2 トップ(門)の 8 領域(`data-panel`)

| # | `data-panel` | 内容 | 断面の鍵 |
|---|---|---|---|
| 0 | (領域外・最上部固定) | 経路バッジ + 鮮度 | `transportHint` / `generatedAt` / `ageMs` |
| 1 | `running-ring` | **走行中の環**(最上位) | `runs[]` |
| 2 | `counts` | 数の看板 | `counts` |
| 3 | `gates` | 門の合否 5 列 | `gates[]` |
| 4 | `runs-score` | 点数と起動実績の**並置** | `runs[].score` / `runs[].spawn` |
| 5 | `daily` | 日次ノルマの債務 | `daily` |
| 6 | `scales` | 道の形 6 本 | `scale` |
| 7 | `memory` | 教訓 / KG | `lessonsByKind` / `counts.kg*` |
| 8 | `atlas-index` | **全画面への索引** | 静的 + 実在検査 |

**「数の看板」と「走行中の環」を別領域に分ける**(Zylos の Activity Panel 分離則)。
混ぜると認知が過負荷になり、**何をしたかの監査が不可能になる**。

## 4.3 atlas 6 枚との関係 — **gitignore された生成物であることを設計に織り込む**

**実測**:

```
$ git ls-files dashboard/atlas/ | wc -l
0                                    ← CI には 1 ファイルも存在しない
$ ls dashboard/atlas/*.html | grep -v visual-check | wc -l
6                                    ← 手元には 6 枚ある
$ grep -n 'atlas' .gitignore
15:dashboard/atlas/
```

**ここが導線設計の急所である。** 素朴に「index から atlas 6 枚へ静的リンクを張る」と、
**CI では 6 本すべてが死リンクになり、AC-19c(死リンクゼロ)が落ちる。**
逆に「CI で緑になるように atlas を検査対象から外す」と、
**手元では孤児 6 枚が残り、第50条(門が見ていない機能は壊れても鳴らない)を再生産する。**

**設計解 — 索引を静的に書かず、断面に載せた実在情報から描く**:

```
1. pulse.js が snapshot に atlas[] を載せる:
     atlas[i] = { name, href, exists }
     source: fs.readdirSync('dashboard/atlas') の *.html から
             *.visual-check.html を除いたもの。ディレクトリ自体が無ければ atlas: []

2. 画面(index.html)は atlas[] を舐めて索引領域を描く。
   - exists:true  → 通常のリンク
   - atlas[] が空 → data-state="empty" で
                     「図はまだ生成されていません(node graph/atlas.js all で作れます)」
                     を出す。空リンクを描かない = 死リンクが構造的に生まれない

3. AC-19b の一致検査も、実在を数える両辺で書く:
     画面の href 数  ==  ls dashboard/*.html dashboard/atlas/*.html
                          | grep -v visual-check | grep -v index.html | wc -l
   CI では両辺とも atlas 分が 0 になり、control.html の 1 本だけで一致する。
   手元では両辺とも 6 + 1 = 7 で一致する。
   → 環境によって画面と実地が同時に動くので、固定値を持たずに一致する(則3)。
```

**この設計が満たすもの**: (a) CI で死リンク 0(atlas が無いので描かない)、
(b) 手元で孤児 0(atlas があれば必ず描く)、(c) **第29条を犯さない** —
検査するのは「生成物の中身」ではなく「生成器が作った**ファイルの実在**と画面の**一致**」である。

**atlas 側から index への戻りリンク**(AC-19d)は、
**`overlay/vendor/archify/assets/template.html` を直す**ことで実現する。
**`dashboard/atlas/*.html` を手で書き換えてはならない**(N-6: gitignore された生成物)。
これは FR-12(Google Fonts 3 行の除去)と**同じファイルの同じ改修**であり、一度の手当てで両方が済む。

---

# §5. engine 側の修正設計

## 5.1 `census.js:75` / `export-state.js:32` — 旧住所の直書き(FR-03)

**実測された現状**:

```js
// graph/census.js:75
creations: (() => {
  try {
    return fs.readdirSync(path.join(ROOT, 'creations'), { withFileTypes: true })
      .filter(e => e.isDirectory()).length;
  } catch { return 0; }        // ← ここが病巣。実在 8 件を 0 と報告して黙る

// graph/export-state.js:32
function creations() {
  const dir = path.join(ROOT, 'creations');
  if (!fs.existsSync(dir)) return [];   // ← 同じ病。0 件を返して黙る
```

**設計**:

```js
const workspace = require('./workspace.js');
const r = workspace.resolve();          // { root, source } を返す。第30条
// 解決に失敗したら 0 を返して黙るのではなく、明示的に告げる
```

**`catch { return 0 }` を撤廃する理由**: これが「静かな嘘」の型である。
**実在 8 件に対し 0 と報告し、しかも成功したように振る舞った。**
Braintrust の言う「silent retry loops blend into normal traffic」の楽園版である。
解決に失敗したら **errors に積み、値は `null` にする**(§1.5 の原則と同一)。

## 5.2 `workspace.js` の `hardcodedRefs` の穴(FR-04 / G-03)

**実測された現状**(`graph/workspace.js:112`):

```js
if (/['"`][^'"`]*creations\//.test(line)) {    // 引用符の直後にスラッシュが続く形しか咎めない
```

**この正規表現は `path.join(ROOT, 'creations')` を素通りさせる。**
教主が合成の見本で機械証明した:

```
$ printf "const d = path.join(ROOT, 'creations');\n" > graph/pd-fake-ratify2.js
$ node graph/workspace.js check
✓ 楽園に創造物の混入なし・住所の直書きなし
exit=0                                  ← 素通り。門が緑を出しながら FR-03 の欠陥を見逃していた
```

**門が緑を出しながら第30条違反を 2 件抱えていた。** 第19条が既に教えた病の再発 —
**形を見る門が意味を見逃した。**

**設計 — 検出規則を 2 本立てにする**:

```js
const PATTERNS = [
  /['"`][^'"`]*creations\//,                                  // 従来形(維持)
  /path\.(join|resolve)\s*\([^)]*['"`]creations['"`]/,         // 新設: path.join 経由
];
const EXCLUDE = [
  'workspace.js',        // 自分自身。住所を知るのが職務である
  /^tests\//,            // 試験は合成の見本を持つ
  /^reform\//,           // 本改修の文書は罠を引用する
];
```

**除外リストをコード内に明示する**(要件が命じている)。
**除外を暗黙にすると、除外したこと自体が見えなくなる** — それがこの門の元の病である。

**出力の改善**: 現状は違反を見つけても**ファイル名を名指ししていなかった**(実測: `census.js` も
`export-state.js` も出力に現れない)。**`graph/<file>:<line>: <text>` の形で必ず名指しする。**
名指ししない門は、赤くなっても直せない。

## 5.3 `--json` が無視される 3 engine(FR-05)

**実測 — バイト数が 1 も変わらない**:

```
clergy.js college     : plain=2139  json=2139
daily-guard.js status : plain=843   json=843
conclave.js status    : plain=1424  json=1424
```

**設計**(3 engine 共通の型):

```js
const wantJson = process.argv.includes('--json');
const data = computeData();                  // 人間向け描画と同じ源から作る
if (wantJson) { process.stdout.write(JSON.stringify(data)); return; }
renderHuman(data);                           // 既定の人間向け出力は 1 バイトも変えない
```

**「同じ源から作る」ことが要点である。** JSON 用に別の集計を書けば、
**人間向け出力と JSON が食い違う日が必ず来る** — それは AC-05c/05d が検査する一致そのものを壊す。
`--json` 時は**人間向けテキストを 1 行も混ぜない**(先頭の飾り罫も出さない)。混ざれば `JSON.parse` が落ちる。

なお **pulse.js はこの 3 engine の CLI を呼ばない**(module として関数を呼ぶ)。
本修正は**画面のためではなく、CI と人間のための修正**である。

## 5.4 `motion-probe.mjs` の `close()` 漏れ(FR-23 / G-09)

**実測された現状**(`graph/motion-probe.mjs:85`):

```js
} finally {
  try { browser.child.kill(); } catch { /* 検器の後始末が本体の裁定を汚さない */ }
}
```

**描画器は正しい後始末を `close()` として公開していた**(`overlay/vendor/archify/bin/visual-check.mjs:475`):
(1) SIGTERM → 1500ms 後 **SIGKILL エスカレーション**、(2) **`fs.rmSync(this.profileRoot)`**。

**`child.kill()` だけを呼んだ結果**: SIGTERM を無視した Chrome が生き残り、一時プロファイルが
**483 → 519 → 529 と単調増加**。検器 1 回で **+2** 個。
残った Chrome が握るファイルが次の走行の `file://` を `ERR_FILE_NOT_FOUND` にし、
第21条テストを**不定に**赤くしていた。

**設計**:

```js
} finally {
  try { await browser.close(); } catch { /* 検器の後始末が本体の裁定を汚さない */ }
}
```

`probeMotion` は既に `async` である。`finally` 内の `await` は関数の解決を遅らせるが、
**その遅れこそが「後始末が終わるまで待つ」ということである。**

**第50条(d)「借り物の作法は借り物の正典に問う」** — 用意されている作法を読まずに書いた一行が門を不定に赤くした。

**AC の設計上の要点**: 判定は **AC-23b(前後のプロファイル数の差が 0)** が下す。
**`node tests/paradise.test.js` が 0 failed を受入基準にしてはならない** —
この赤は不定であり、**漏れが 529 個まで悪化した状態でも緑を出した**。
**症状を見る門は、原因が悪化していても黙る。数えられるのは漏れの方である。**

---

# §6. 新設テストの設計(G-01〜G-10)

## 6.1 テストファイルの割当

| ファイル | 担う門 | 担う AC | 見積 |
|---|---|---|---|
| `tests/dashboard-count.test.js` | **G-01** | AC-01a/b/f/g, AC-02a〜c, AC-03a〜c, AC-E3 | ~2s |
| `tests/dashboard-no-deps.test.js` | **G-02** | AC-10a/b, AC-12d/e, AC-17d, AC-N02a〜c | ~1s |
| `tests/dashboard-links.test.js` | **G-04** | AC-19a〜e | ~0.5s |
| `tests/dashboard-no-hardcode.test.js` | **G-06** | AC-02a〜c, AC-21a〜e | ~1s |
| `tests/dashboard-perf.test.js` | **G-07 + G-10** | AC-N01b/c/d, AC-N07a/c, AC-01i, AC-06a | ~8s |
| `tests/dashboard-states.test.js` | (FR-20 / G-01 補) | AC-20a〜e, AC-06d, AC-16c | ~2s |
| `tests/dashboard-transport.test.js` | (FR-08 / §4) | AC-08a/b, AC-RT-1/2 | ~0.5s |
| `tests/dashboard-fallback.test.js` | (FR-08 / NFR-03/06) | AC-08c, AC-N03b, AC-N06a, AC-RT-3 | ~12s |
| `tests/dashboard-watch.test.js` | (FR-11 / NFR-04) | AC-11a〜e, AC-N04a, AC-17e | ~3s |
| `tests/dashboard-freshness.test.js` | (FR-07) | AC-07a/b/c | ~1s |
| `tests/dashboard-sse.test.js` | (FR-09 / FR-10) | AC-09a〜e, AC-10c/d/e, AC-N03a | ~22s |
| `tests/dashboard-run-panel.test.js` | (FR-13 / FR-14) | AC-13a〜e, AC-14a〜i | ~2s |
| `tests/motion-probe-leak.test.js` | **G-09** | AC-23a〜e/g | ~5s |
| **G-03 / G-05 / G-08** | ファイルを新設しない | AC-04a〜d は既存 `paradise.test.js` に追記(G-03)。AC-G05a/b と AC-G08a/b は **`tribunal.yml` の grep + 既存 `derived.js check`** で足りる | ~0s |

**13 本。** G-03 / G-05 / G-08 に新規ファイルを作らない理由は §6.3 に述べる。

## 6.2 合計 60 秒未満に収める方法(AC-G-common)

見積合計 **~60s** は上限に張り付く。**構造で削る**:

| 手 | 削減 | 理由 |
|---|---|---|
| **サーバを 1 回だけ起動して共有する** | **-25s** | `sse` / `fallback` / `perf` が各々サーバを起動すると `listen` + 初回 require を 3 回払う。`tests/_pulse-fixture.js` を作り、**1 プロセスで 1 回だけ起動して port を配る**。各テストは同じサーバに繋ぐ |
| **`census` を 1 度も呼ばない** | **-120s** | これが最大の削減。AC-N01c が「pulse が呼ぶ engine 集合に census が**含まれない**」を assert し、構造的に保証する |
| **keepalive の検査を実時間で待たない** | **-20s** | AC-09e は 20 秒保持を求めるが、`KEEPALIVE_MS` を環境変数 `PULSE_KEEPALIVE_MS=200` で上書き可能にし、**テストでは 200ms で 1 行以上の `: ping` を確認する**。検査するのは「周期的にコメント行が出る」という**性質**であって 15000 という値ではない(値は AC-RT-2 が定数の一元性として別途検査する) |
| **ヘッドレスブラウザを使うのは fallback のみ** | — | ブラウザ起動は 3〜5s。AC-08c(file:// で 10 秒以内に frozen)だけが実ブラウザを要する。他は HTML/JS の静的走査と node 内の擬似 DOM で足りる |
| **watch のデバウンス検査は実時間 80ms×数回** | — | 削れない。ただし合計 3s に収まる |
| **静的走査系(count/links/no-deps/no-hardcode/transport/freshness)を 1 プロセスに束ねる** | -2s | node 起動代 27ms × 6 = 162ms。`paradise.test.js` から呼ぶときは同一プロセスで require する |

**削減後の見積: ~33s。** 上限 60s に対し余裕を持つ。

**計測は node で行う**(則4。`/usr/bin/time` は本機に**存在しない**):

```bash
node -e 'const{execFileSync}=require("child_process");const t0=process.hrtime.bigint();
execFileSync(process.execPath,["tests/dashboard-count.test.js"],{stdio:"ignore"});
console.log((Number(process.hrtime.bigint()-t0)/1e6).toFixed(1)+"ms")'
```

## 6.3 G-03 / G-05 / G-08 に新規ファイルを作らない理由

| 門 | 実装先 | 理由 |
|---|---|---|
| **G-03** | 既存 `tests/paradise.test.js` に追記 | 検査対象が `workspace.js` の**engine の性質**であって画面ではない。AC-04c が `grep -c "hardcodedRefs\|path.join(ROOT, 'creations')" tests/paradise.test.js` が `1` 以上を求めており、**要件が既に paradise.test.js への追記を指定している** |
| **G-05** | `tribunal.yml` への追加 + 既存 `visual-verify` / `critic.js` | 門の実体は**CI が走らせること**であって新しいテストではない。AC-G05a は tribunal.yml の grep で測る |
| **G-08** | 既存 `derived.js check` | 第29条の門は既に在る。要件が命じるのは「**CI で維持すること**」(AC-G08a)であって新設ではない |

**門を増やすことと、ファイルを増やすことは違う。** 既に在る門を CI に載せることで守れる性質に、
新しいファイルを足せば維持費だけが増える。

## 6.4 「壊すと赤くなる」の設計(全 G-xx 共通の掟)

**緑を出すだけの門は、見ていない門と区別できない**(第50条)。
各テストは**故障注入の入口**を持ち、壊した状態で exit 1 になることを AC が要求する:

| 門 | 壊し方 | 期待 |
|---|---|---|
| G-01 | `pulse.js` の `counts.engines` を +1 | `paradise.test.js` exit 1 |
| G-02 | `template.html` に `fonts.googleapis` を 1 行戻す | CI exit 1 |
| G-03 | 合成の見本を `graph/` に置く(検査後**必ず削除**) | `workspace.js check` exit 1 |
| G-04 | 新 `dashboard/*.html` を足しリンクを張らない | CI exit 1 |
| G-05 | `index.html` に外部 CDN の `<link>` を 1 行 | critic exit 1 |
| G-06 | `paradise.js` に `v: 2` を 1 行戻す | CI exit 1 |
| G-07 | `pulse.js` に census 呼出を 1 行 | CI exit 1 |
| G-08 | 新設テストに `require('../dashboard/state.json')` を 1 行 | `derived.js check` exit 1 |
| G-09 | `browser.close()` を `child.kill()` に戻す | `motion-probe-leak.test.js` exit 1 |
| G-10 | `pulse.js` に `execFileSync` を 1 行 | CI exit 1 |

## 6.5 AC を書くときの掟(則1〜4 を新設 AC にも適用する)

| 則 | 本設計での遵守 |
|---|---|
| **則1** 書いた時点で赤を見る | §0 のとおり R-1 の是正形を**実際に走らせ、`NG: 対象テストが 0 件` / exit=1 を確認した**。未実装なのだから赤が正しい |
| **則2** 方言をまたぐな | 複数行・否定先読み・集計を要する検査は**すべて node で書く**。`grep -E` に `(?!` も `\|` も書かない。`grep -c` に改行パターンを渡さない |
| **則3** 固定値を期待値にしない | 断面の数 == その場で数えた数、の 2 値(または 3 値)一致で書く。`17` / `33` / `7` は参考値であって期待値ではない |
| **則4** この機に在るコマンドだけ | `/usr/bin/time` は**不在**。計測は `process.hrtime.bigint()` |
| **D-6** | `grep -c` は対象不在で **exit 2**。テストは `fs.existsSync` を先に assert する |
| **D-12** | 「合計が 0」は `grep -o … \| wc -l` か node の `match().length` で測る |
| **D-13** | `conclave.js status --run` に slug を渡さない。§1.4 が構造的に回避する |

---

# §7. 実装順序(依存の向き)

```
1. graph/pulse.js の snapshot 部       ← 他のすべてが依存する。まずここが動かないと何も測れない
2. engine 修正 4 件(§5)               ← pulse が正しい数を得るための前提
   5.1 census/export-state の住所 → 5.2 workspace の門(5.1 を検査する門なので後)
   5.3 --json 3 件 / 5.4 motion-probe は独立。並行可
3. graph/pulse.js の serve 部(SSE / watch)
4. dashboard/index.html + control.html(三層 / 8 領域 / 4 状態)
5. tests/dashboard-*.test.js 13 本
6. tribunal.yml への G-01〜G-10 の結線
```

**5.2 を 5.1 より後に置く理由**: `workspace.js` の門を先に直すと、
**5.1 が未修正の間ずっと CI が赤になる**。門は「直した後に、戻したら鳴る」ことを証明できればよい。
ただし **AC-04a は「5.1 適用前の状態で exit 1 になること」を要求する** ——
これは 5.1 を一時的に復元して確かめる手順であり、順序ではなく検査である。

---

# §8. 本書が構造だけを述べたことの確認(第17条)

| 本書に**書いた**もの(構造) | 本書に**書かなかった**もの |
|---|---|
| 断面の鍵・型・source・ms・落ちたときの挙動 | それらをどの色で出すか → `identity.md` |
| サーバのエンドポイント・ヘッダ・ポート解決 | バッジの形・角丸・余白 → `identity.md` |
| 三層の判定条件と遷移 | 遷移を神にどう見せるか → `ux.md` §3 |
| 何ページ作るか・8 領域の割当 | 領域の並び順が神の視線をどう導くか → `ux.md` §1 |
| engine 修正の差分と理由 | — |
| テスト 13 本の割当と 60 秒の収め方 | — |
| **`data-contradiction` / `data-run-state` を出すこと**(印の**有無**) | **印をどう見せるか**(色・枠・字) → `identity.md` / `ux.md` §5 |

**印そのものを省いてはならない**(要件 §9.5)。design が決めてよいのは**どう見せるか**だけである。
本書は印を**出す**と決め、**どう見せるか**は姉妹文書に委ねた。
