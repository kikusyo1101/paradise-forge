# build 相の設計判断を支える実測 (第38条: 改善は数値で語れ)

> 「engine は 27〜73ms」という discover の結論は **子プロセス経由**の値である。
> ダッシュボードの中核 engine は node プロセス**内**から `require()` で呼べる。
> 実際に何msで揃うかを測った。憶測で設計しない。

## 実測: プロセス内呼び出しなら 7.4ms で全事実が揃う

```
$ node prove-snapshot-speed.js
=== require() でプロセス内から直接呼ぶ場合 (子プロセスを産まない) ===
  require clergy               2.7ms
  require forge                0.6ms
  require workspace            0.8ms
  require kg                   0.6ms
  clergy.orgChart()            0.0ms
  forge.buildDag()             0.0ms
  workspace.resolve()          0.1ms
  kg.query("")                 0.4ms
  creations 実測(正しい住所)     0.2ms
  conclave.json 全件直読み      1.0ms
  engines/articles 実数え       0.7ms

  合計                         7.4ms
```

`require` のコスト(4.7ms)は**起動時1回だけ**。2回目以降の snapshot 生成は:

```
orgChart + buildDag = 0.53ms
```

**結論**: 毎秒どころか毎フレーム再計算しても問題ない。
discover が測った 27〜73ms は「node を起動する代金」であって engine の代金ではなかった。
**ゆえに新ダッシュボードのサーバは engine を子プロセスで呼んではならない。`require` して常駐させる。**

## 実測で得られた「今の真実」(すべてハードコードなし)

```json
{
  "engines": 33,
  "articles": 50,
  "cardinals": 7,
  "creations": 7,
  "creationNames": ["coin","habit","pomodoro","reform-claude-md-diet",
                    "reform-eval-gauge","rps","tenbin"],
  "runsFound": 5,
  "kgNodes": 99,
  "creationsRoot": "C:\\Users\\kikus\\Documents\\workspace\\paradise-creations",
  "creationsSource": "sibling"
}
```

### 枢機卿は 7 人である

```
$ node -e "console.log(Object.keys(require('./graph/clergy.js').COLLEGE).length)"
7
```

第47条(b)が予言していた事態がまさに起きている —
「**枢機卿が7人目を迎えた朝、図がひとりでに7人を描かねばならない**」。
`dashboard/state.json` の hierarchy も `index.html` の固定値も、この 7 を知らない。

### 道(scale)ごとの相数 — すべて engine が答える

```
quick 6 / standard 14 / full 17 / reform 11 / counsel 6 / cartography 11
```

`index.html` が「Live Graph Execution」と称して描く 4 タスクは、
この**どれとも一致しない架空のDAG**である。

## 走行中の環は conclave.json の直読みで完全に読める (1.0ms / 5件)

```
  coin                     11/11 phases  6/6 domains  22 events
  habit                    11/11 phases  6/6 domains  40 events
  reform-claude-md-diet     5/11 phases  4/6 domains  15 events   ← 途中で止まっている
  reform-eval-gauge        11/11 phases  6/6 domains  26 events
  tenbin                   17/17 phases  6/6 domains  27 events
```

構造(実測):

```
meta / created / domains[] / history[]
  domain: { seq, cardinal, domain, status, reworks, phases[], reviewClass, pdca }
  phase : { id, agent, goal, deps, gate, artifact, status, attempts, artifactPath }
  history: { ts, event, detail }        ← 27件。時系列がそのまま在る
```

**engine を呼ぶ必要すらない。** `fs.watch` + `JSON.parse` だけで
「いま何相が走っているか」「どのドメインが批准済みか」「直近の出来事は何か」が出る。

`reform-claude-md-diet` が **5/11 相で止まったまま**であることも、この直読みで判る。
現ダッシュボードはこれを一切映していない。

## engine の API 上の注意 (build 相で踏む罠)

| 誤り | 正 |
|---|---|
| `clergy.college()` | `clergy.COLLEGE` (定数) または `clergy.orgChart()` |
| `forge.plan(wish, {scale})` | `forge.buildDag(wish, 'reform')` — **第2引数は文字列** |
| `kg.query('')` | 正しい。全ノードを返す (99件) |

実測で `SCALES[scale] is not a function` を踏んで確認した。
**CLI の引数形と module の API 形は違う。** build 相はここを間違えやすい。

## この実測が build 相に課す設計制約

| # | 制約 | 根拠 |
|---|---|---|
| S-1 | サーバは engine を `require` で常駐させ、子プロセスを産まない | 7.4ms(初回) / 0.53ms(以降) vs 子プロセス 27〜73ms |
| S-2 | `census.js` だけは別扱い(非同期・キャッシュ) | 120,072ms。自己診断を内包するため構造的に遅い |
| S-3 | 走行中の環は `conclave.json` の `fs.watch` で足りる | 5件の直読みが 1.0ms。engine 呼び出し不要 |
| S-4 | 数はすべて実数えで出す。枢機卿 7・engine 33・条 50・創造物 7 | 第22条。現在の表示はすべて誤り |
| S-5 | 創造物の住所は `workspace.resolve()` からのみ得る | `source: "sibling"` を実測。第30条 |
