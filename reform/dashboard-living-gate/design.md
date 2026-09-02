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

**API の罠を設計時に固定する。**
**本表は「実際に走らせて確かめた」ものだけを載せる**(則1)。走らせた全出力は **§10 附録**に在る。

| # | 誤り | 正 | 誤ると | 実走で確認 |
|---|---|---|---|---|
| T-1 | `clergy.college()` | `clergy.COLLEGE`(7)/ `clergy.orgChart()` | `is not a function` | ✔ |
| T-2 | `forge.plan(w,{scale})` | `forge.buildDag(w, 'reform')` — **第2引数は文字列** | `SCALES[scale] is not a function` | ✔ |
| T-3 | `conclave.js status --run <slug>` | `--run <root>/<slug>/conclave.json` | ENOENT 例外(**D-13**) | ✔ |
| T-4 | `gauge.js score --json` | `gauge.js score <run.json> --json` | ENOENT / exit 2(**R-2**) | ✔ |
| **T-5** | **`gauge.score(<path 文字列>)`** | **`gauge.score(JSON.parse(fs.readFileSync(path)))`** | **THROW** `run-state carries no phases — 測れないものに点は付かない(第37条)` | **✔ D-2** |
| **T-6** | **`spawnTrace.report(<path 文字列>)`** | **`spawnTrace.report(<run オブジェクト>)`** | **例外を投げず `{ok:true,total:0,noTrace:0}` を返す。§1.3.4 の防御が必須** | **✔ D-3** |
| **T-7** | **`vendor.check()`** | **`vendor.verify()`** → `{ok, findings, status}` | `vendor.check is not a function` | **✔ D-4** |
| **T-8** | **`workspace.check()`** | **`workspace.hardcodedRefs()` + `workspace.strayCreations()`** の 2 本を合成 | `ws.check is not a function` | **✔ D-4** |
| T-9 | `lessons.exportLessons()` | `lessons.exportLessons(<outPath>)` — **outPath 必須**。読了後 `unlink` する(AC-18c) | `The "path" argument must be of type string … Received undefined` | ✔ |
| T-10 | `kg.query('')` | 正しい(全 99 ノード) | — | ✔ |

**実在する export を `Object.keys(require(...))` で確定させた**(推測で書かない — NFR-06):

```
$ node -e "for(const m of ['clergy','forge','workspace','kg','wiring','vendor','derived',
    'check-agents','gauge','spawn-trace','daily-guard','lessons','codex'])
    console.log(m, Object.keys(require('./graph/'+m+'.js')).join(','))"

clergy         RANKS,EFFORT_SUPPORT,supportsEffort,COLLEGE,TRIBUNAL,MODEL_EXCEPTIONS,SPAWN_TOOL,
               MAX_SPAWN_DEPTH,MAX_CONCURRENT,RUNTIME_CONCURRENT,EFFECTIVE_CONCURRENT,PARALLEL_SAFE,
               cardinalFor,modelFor,allPriests,allBelievers,marshalPlan,believerRole,groupByCardinal,
               orgChart,LEXICON,title,lexiconCheck
forge          CONSTITUTION,SCALES,SCALE_PRODUCES,chooseScale,buildDag,REFORM_RE,COUNSEL_RE,
               CREATE_RE,DOC_RE,DIAGRAM_RE,isCounsel,isCartography
workspace      resolve,root,defaultRoot,creationDir,init,strayCreations,hardcodedRefs,
               REPO_ROOT,SIBLING_NAME                                     ← check は無い
kg             remember,link,forget,query,getNode,neighbors,snapshot,stats,observe,predict,cochangeCounts
wiring         SURFACES,listEngines,requiresOf,map,check                  ← check は在る
vendor         status,resolveHooks,wire,refresh,verify,VENDOR,KINDS,TOOLS ← check は無い / verify が正
derived        DERIVED,isDerived,offendingAssertions,check,drift          ← check は在る
check-agents   check,requiredAgents,referenceMap,installedAgents,ungovernedPhases,
               misroutedPhases,hierarchyIntegrity,PSEUDO                  ← check は在る
gauge          score,normalize,record,baseline,compare,readLedger,ledgerPath,WEIGHTS
spawn-trace    record,verify,report
daily-guard    isDue,claim,release,markDone,nowJst,readLedger,lastOpenWindow,LEDGER,
               TARGET_HOUR,LEASE_MINUTES,DISPATCH_MINUTES
lessons        exportLessons
codex          parse,renderIndex,check,article,weigh,write,SOURCE,INDEX,ARTICLE_RE
```

**この一覧に無い名前を設計に書いてはならない。**
`vendor.check` / `workspace.check` を書いた前版は、**5 門のうち 2 門が常時例外**になる設計だった。

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
| `gates[]` | `array` | §1.3.3 | **cold 53〜67 / warm はキャッシュで 0**(実測) | 個別 |
| `gatesCached` | `boolean` | mtime 鍵が前回と同じなら `true`(§1.7) | 0.7 | `false` |
| `runs[]` | `array` | §1.3.4 | ~1.5 | 個別 |
| `ledger[]` | `array\|null` | §1.3.7(**FR-22**)`gauge.readLedger()` | 0.5 | `null` + errors |
| `daily` | `object` | §1.3.5 | ~9 | `null` |
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
| `creations` | §1.3.2a の `visibleDirs()` のうち `_` 始まりでないもの | `ls -d <root>/*/ \| grep -vc '/_[^/]*/$'` | 0.2 | `null` + errors |
| `workshops` | 同 `visibleDirs()` のうち `_` 始まりのもの | `ls -d <root>/*/ \| grep -c '/_[^/]*/$'` | 0.2 | `null` + errors |
| `runs` | `<root>/<creation>/conclave.json` の実在数 | `ls <root>/*/conclave.json \| wc -l` | 1.0 | `0` + errors |
| `agents` / `commands` / `skills` | `check-agents.js` / `~/.claude` 配下の実数え(**読むだけ**) | 同 engine | ~7 | `null` + errors |
| `lessons` | `lessons.exportLessons(<tmp>)` の要素数(**outPath 必須** — 罠 T-9) | export した JSON の length | ~2 | `null` + errors |
| `kgNodes` | `~/.claude/paradise-kg/nodes.jsonl` の解釈できた行数 | `wc -l < nodes.jsonl` | ~0.5 | 解釈できた行数(部分成功) |
| `kgEdges` | 同 `edges.jsonl` | `wc -l < edges.jsonl` | ~0.5 | 同上 |

### 1.3.2a `creations` / `workshops` の数え方 — **一つに決める(D-5 の是正)**

前版は「`_` 始まりでない dir」とだけ書き、**`.git` / `.github` を数えてしまう実装**を招いた。
審査官の実測は node=9 / bash=8 / 本書記載=7 の**三者不一致**であった。
**数え方を実装レベルで一本に決める**:

```js
// graph/pulse.js — 創造物と作業場を数える唯一の関数。ここ以外で readdirSync しない
function visibleDirs(root) {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .filter(e => !e.name.startsWith('.'));   // ← .git / .github を除く(これが欠けていた)
}
function countCreations(root) {              // 創造物 = 見えるディレクトリのうち _ 始まりでないもの
  return visibleDirs(root).filter(e => !e.name.startsWith('_')).length;
}
function countWorkshops(root) {              // 作業場 = 見えるディレクトリのうち _ 始まりのもの
  return visibleDirs(root).filter(e =>  e.name.startsWith('_')).length;
}
// 不変条件(実装内で assert する): countCreations + countWorkshops == visibleDirs().length
```

**除外規則は 2 段である。順序も含めて固定する**:

| 段 | 規則 | 除かれるもの | なぜ |
|---|---|---|---|
| 1 | `isDirectory()` | ファイル(`gauge-ledger.jsonl` 等) | 倉直下には engine の台帳も置かれる |
| 2 | **`!name.startsWith('.')`** | `.git` `.github` | **VCS と CI の骨組みは創造物ではない。** bash 側の `ls -d */` は元からドットを出さないので、**node 側をこれに合わせる**(両辺が同じ規則になる) |
| 3 | `startsWith('_')` で **分ける**(除かない) | — | `_` 始まりは**作業場**であり、`creations` からは外すが `workshops` として**必ず数える**。捨てない |

**実際に数えた**(AC-01b との一致確認 — 則1):

```
$ node -e "const fs=require('fs'),ws=require('./graph/workspace.js');const r=ws.resolve().root;
  const all=fs.readdirSync(r,{withFileTypes:true}).filter(e=>e.isDirectory());
  const vis=all.filter(e=>!e.name.startsWith('.'));
  console.log('all      ='+all.length+' ['+all.map(e=>e.name)+']');
  console.log('visible  ='+vis.length+' ['+vis.map(e=>e.name)+']');
  console.log('creations='+vis.filter(e=>!e.name.startsWith('_')).length);
  console.log('workshops='+vis.filter(e=> e.name.startsWith('_')).length)"

all      =10 [.git,.github,coin,habit,pomodoro,reform-claude-md-diet,reform-eval-gauge,rps,tenbin,_scratch]
visible  =8  [coin,habit,pomodoro,reform-claude-md-diet,reform-eval-gauge,rps,tenbin,_scratch]
creations=7        ← coin, habit, pomodoro, reform-claude-md-diet, reform-eval-gauge, rps, tenbin
workshops=1        ← _scratch
不変条件 7 + 1 == 8 : true

$ ROOT=$(node -e "process.stdout.write(require('./graph/workspace.js').resolve().root)")
$ ls -d "$ROOT"/*/ | grep -vc '/_[^/]*/$'   → 7      ← AC-01b の突合相手
$ ls -d "$ROOT"/*/ | grep -c  '/_[^/]*/$'   → 1
```

**node 側 7/1 と bash 側 7/1 が一致した。**
requirements.md AC-01b の定義(**創造物 7 + 作業場 1 = 8**)とも一致する。
**7 / 1 / 8 は執筆時点の参考値であって期待値ではない**(則3)——
門が裁くのは常に「断面の数 == その場で数えた数」であり、明日 8 個目の創造物が生まれても両辺が同時に動く。

**`counts.runs` も同じ `visibleDirs()` から引く**(`.git` の下に `conclave.json` は無いが、
**数え方の入口を 2 つ持たない**ことが要点である。入口が 2 つあれば、いつか片方だけが直る)。

**執筆時点の実測**: engines 33 / cardinals 7 / articles 50 / **creations 7 / workshops 1** / kgNodes 99 /
kgEdges 33 / lessons 65 / runs 5。
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
| `ok` | **門ごとに入口が違う。下表の関数**を module として呼び、例外なし・`ok:true` | `boolean` | `false` + errors に理由 |
| `ms` | `process.hrtime.bigint()` 差分 | `number` | 計測できた分 |
| `at` | 実行時刻(ms epoch) | `number` | — |
| `detail` | 門ごとの内訳(下表) | `object` | `{}` |

**【D-4 の是正】門ごとの正しい入口 — 実走して確定させた**:

| 門 | **正しい呼び方** | 返り | `detail` | 実測 ms |
|---|---|---|---|---|
| `wiring` | `wiring.check()` | `{ok, orphans, dangling, map}` | `{orphans:[], dangling:[]}` | 17.3〜21.4 |
| `vendor` | **`vendor.verify()`**(**`check` は存在しない**) | `{ok, findings, status}` | `{findings:n}` | 1.5〜2.3 |
| `derived` | `derived.check()` | `{ok, findings, undeclared, note}` | `{undeclared:n}` | 13.0〜19.5 |
| `check-agents` | `check-agents.check()` | `{ok, skipped, dir, need, sources, missing, dangling, ungoverned, misrouted, hierarchy, note}` | `{missing:n, ungoverned:n}` | 4.8〜7.9 |
| `workspace` | **単一の門関数が無い。`hardcodedRefs()` と `strayCreations()` の 2 本を合成する** | それぞれ配列 | `{hardcodedRefs:n, strayCreations:n}` | 14.0〜24.6 |

```js
// graph/pulse.js — gates の定義。名前と入口を 1 箇所に固定する
const GATES = [
  ['wiring',       () => { const r = wiring.check();
                           return { ok: r.ok, detail: { orphans: r.orphans||[], dangling: r.dangling||[] } }; }],
  ['vendor',       () => { const r = vendor.verify();          // ← check ではない(T-7)
                           return { ok: r.ok, detail: { findings: (r.findings||[]).length } }; }],
  ['derived',      () => { const r = derived.check();
                           return { ok: r.ok, detail: { undeclared: (r.undeclared||[]).length } }; }],
  ['check-agents', () => { const r = checkAgents.check();
                           return { ok: r.ok, detail: { missing: (r.missing||[]).length } }; }],
  ['workspace',    () => { const h = workspace.hardcodedRefs();  // ← check は無い(T-8)
                           const s = workspace.strayCreations(); // ← 2 本を合成して ok を作る
                           return { ok: h.length === 0 && s.length === 0,
                                    detail: { hardcodedRefs: h.length, strayCreations: s.length } }; }],
];
```

**実走の出力**(則1 — 走らせて確かめた):

```
$ node -e "const v=require('./graph/vendor.js'),ws=require('./graph/workspace.js');
           try{v.check()}catch(e){console.log('vendor.check   ->',e.message)}
           try{ws.check()}catch(e){console.log('workspace.check->',e.message)}"
vendor.check    -> vendor.check is not a function          ← 前版の設計はここで毎回落ちていた
workspace.check -> ws.check is not a function

$ (正しい入口で 5 門を 5 周)
pass1 cold: wiring=true(21.4) vendor=true(2.3) derived=true(19.0) check-agents=true(7.9) workspace=true(16.7)  SUM=67.2ms
pass2 warm: wiring=true(18.6) vendor=true(1.6) derived=true(13.6) check-agents=true(5.2) workspace=true(14.5)  SUM=53.5ms
pass3 warm: wiring=true(17.9) vendor=true(1.7) derived=true(13.7) check-agents=true(4.8) workspace=true(14.6)  SUM=52.8ms
pass4 warm: wiring=true(17.3) vendor=true(1.6) derived=true(13.0) check-agents=true(5.2) workspace=true(14.0)  SUM=51.1ms
pass5 warm: wiring=true(18.2) vendor=true(1.5) derived=true(14.0) check-agents=true(5.2) workspace=true(14.2)  SUM=53.2ms
```

**5 門とも `ok:true` で走り、合計 cold 67.2ms / warm 51〜53ms。**
**AC-15c(合計 1000ms 未満)** に大きな余裕をもって収まる。
(審査官の機では warm 29.1ms。**測る機と時によって 29〜67ms の幅がある** ——
だからこそ **固定値を書かず、`ms` を断面に載せて実測を語らせる**。§1.7 の時間収支もこの実測に改めた。)

**`ok:false` は errors[] に積まない** — 門が赤いのは engine の故障ではなく**事実**だからである。
積むのは「engine が例外を投げて合否そのものが取れなかった」場合に限る。
**そして `vendor.check` / `workspace.check` を書くことは、まさにその「例外」を 5 門中 2 門で常時発生させる。**
前版の設計は **AC-15a/15b を着工初日に落とす**ものだった。

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
| `run`(内部) | **`JSON.parse(fs.readFileSync(path,'utf8'))`。以降の engine には必ず「この run オブジェクト」を渡す** | 直読み | run 単位で skip + errors |
| `phasesDone`/`phasesTotal` | `run.domains[].phases[]` を舐めて `status==='done'` を数える | 直読み | run 単位で skip + errors |
| `domainsRatified`/`domainsTotal` | `run.domains[].status==='ratified'` | 直読み | 同上 |
| `state` | **`phasesDone < phasesTotal` → `stalled` / それ以外 → `complete`** | 派生 | `unknown` |
| `score` | **`gauge.score(run)` — 引数は run オブジェクト。パスを渡すと THROW**(T-5) | 0.2ms | `null` + errors |
| `spawn.*` | **`spawnTrace.report(run)` — 引数は run オブジェクト。§1.3.4a の防御必須**(T-6) | 0.1ms | `null` + errors |
| `contradiction` | **`score >= 90 && spawn.noTrace > 0`。ただし `score` か `spawn` が `null` なら `null`**(§1.3.4a) | 派生 | `null` |
| `metrics.*` | `gauge.score(run)` の 5 指標(同じ返り値を使い回す。2 回呼ばない) | 同 score | `null` |
| `historyLength` | `run.history.length` | 直読み | `0` |
| `lastEvent` | `run.history[run.history.length-1]` | 直読み | `null` |
| `scaleGuess` | `phasesTotal` を §1.3.6 の相数表に逆引き。**一意に定まらないときは `null`** | 派生 | `null` |
| `scaleCandidates[]` | 同逆引きの候補全部(`11` → `['reform','cartography']`) | 派生 | `[]` |

### 1.3.4a **【D-3 の是正】`spawn-trace.report()` の偽陰性に対する防御**

**これは本設計で最も重要な一節である。**

`spawn-trace.report()` にパス文字列を渡すと、**例外を投げずに `{ok:true, total:0, noTrace:0}` を返す。**
源(`graph/spawn-trace.js`)が `if (run.domains) … else collect(run.phases)` の形をしており、
文字列には `domains` も `phases` も無いため、**phases が空のまま「問題なし」を宣言する。**

```
$ node -e "const st=require('./graph/spawn-trace.js');
   const p='<root>/tenbin/conclave.json';
   console.log('path  ->', JSON.stringify(st.report(p)));
   console.log('object->', JSON.stringify(st.report(JSON.parse(require('fs').readFileSync(p,'utf8')))))"

path  -> {"ok":true,"total":0,"observed":0,"assertedOnly":0,"noTrace":0,"rows":[],"bypassed":[]}
object-> {"ok":false,"total":17,"observed":0,"assertedOnly":0,"noTrace":17,...}
```

**これは第16条「判定不能は緑ではない」の最悪の形である**:

1. **例外を投げない。** ゆえに §1.5 の try/catch 殻に捕まらず、**`errors[]` にも積まれない**。
2. `noTrace:0` になり、矛盾規則 `score>=90 && noTrace>0` が **構造的に永久 false**。
3. **FR-13 が「本改修の本分」と呼ぶ矛盾**(tenbin = gauge 100 点なのに 17 相すべて起動証跡なし)を、
   **設計自身の呼び方が握り潰す。**
4. しかも画面は緑を出す。**本改修が是正しようとしている当の病(第50条)を、本改修が再生産する。**

**`ok:true` をそのまま信じてはならない。設計上の防御を必ず入れる**:

```js
// graph/pulse.js — spawn の読み取りは必ずこの関数を通す。素の report() を直接呼ばない
function readSpawn(run, runName, errors) {
  const rep = spawnTrace.report(run);          // ← 引数は必ず run オブジェクト(T-6)
  // ★ 事前 assert: total > 0 でなければ「測れなかった」と表明する。ok:true を信じない
  if (!rep || typeof rep.total !== 'number' || rep.total <= 0) {
    errors.push({
      engine: 'spawn-trace', key: `runs[${runName}].spawn`,
      reason: `spawn-trace.report returned total=${rep && rep.total} — 測れていない(引数型を疑え)`,
      at: Date.now(), fatal: false,
    });
    return null;                                // ← 0 ではなく null。「数えて 0」ではない
  }
  return { total: rep.total, observed: rep.observed,
           assertedOnly: rep.assertedOnly, noTrace: rep.noTrace, ok: rep.ok };
}

// contradiction は spawn が測れて初めて言える。測れなければ false ではなく null
const contradiction = (score !== null && spawn !== null)
  ? (score >= 90 && spawn.noTrace > 0)
  : null;                                       // ← 第16条: 判定不能を緑(false)にしない
```

**`total > 0` を assert する根拠**: `report()` が `total:0` を返す事態は 2 つしかない。
(a) 引数の型を間違えた、(b) run に相が 1 つも無い。
**どちらも「起動証跡に問題が無い」を意味しない。** 前者は測り損ね、後者は測る対象が無い。
**いずれの場合も緑を出す資格が無い。**

**防御が効くことを実走で確かめた**(則1):

```
$ (防御なし = 前版の設計)
  raw = {"ok":true,"total":0,"observed":0,"assertedOnly":0,"noTrace":0,"rows":[],"bypassed":[]}
  contradiction(score100 && noTrace>0) = false   <<< 偽陰性。矛盾が消える

$ (防御あり = 本節の設計)
  パス渡し(誤)         -> spawn=null  errors に積んだ
  オブジェクト渡し(正) -> spawn= {"total":17,"noTrace":17,"ok":false}
  contradiction(bad)  = null(測れなかった — 緑ではない)
  contradiction(good) = true
  errors = [{"engine":"spawn-trace","key":"runs[tenbin].spawn",
             "reason":"spawn-trace.report returned total=0 — 測れていない(引数型を疑え)","fatal":false}]
```

**画面への波及**: `spawn === null` の run は `data-state="error"` +
`data-awaiting="spawn-trace"` で「起動実績を測れませんでした」と**名指しで**出す
(`ux.md` §2.4)。**「起動証跡あり」の緑として描いてはならない。**

**テスト設計への波及**(§6.1 `dashboard-run-panel.test.js`):
AC-13b / AC-13e の検査は**固定値との比較ではなく、まず `total > 0` を assert する**。
さらに**故障注入**として「`report()` にパスを渡す実装に差し替えたら赤くなる」ことを検査する
(§6.4 の G-01 系に 1 行追加)。**引数型の誤りが門に鳴ること**が要件である(第50条)。

**`spawn-trace` の exit 1 を errors に積んではならない**(AC-13c)。
**exit 1 は「起動証跡なし」という事実**であって engine の故障ではない。
module として呼べば exit code は存在せず、返り値の三値をそのまま読める — **これが子プロセスを避ける副次的利得である。**
(ただし上の `total<=0` は事実ではなく**測り損ね**であり、これは errors に積む。両者を混同しないこと。)

**`gauge.score()` も同じ罠を持つが、こちらは THROW する**(T-5)。
パスを渡すと `run-state carries no phases — 測れないものに点は付かない(第37条)` で例外になり、
§1.5 の try/catch 殻に**捕まる**。**`spawn-trace` だけが捕まらない** —— ゆえに専用の防御が要る。

**執筆時点の実測 — 訂正後の呼び方で全 5 run を実走した**(参考値であって期待値ではない・則3):

```
$ (gauge.score(run) と spawnTrace.report(run) を run オブジェクトで呼んだ結果)
  coin                     11/11 complete  score=100 total= 11 noTrace= 11 contradiction=true  hist=22
  habit                    11/11 complete  score= 45 total= 11 noTrace= 11 contradiction=false hist=40
  reform-claude-md-diet     5/11 stalled   score= 80 total= 11 noTrace= 11 contradiction=false hist=15
  reform-eval-gauge        11/11 complete  score=100 total= 11 noTrace= 11 contradiction=true  hist=26
  tenbin                   17/17 complete  score=100 total= 17 noTrace= 17 contradiction=true  hist=27
  CONTRADICTION_COUNT = 3
```

**⚠ 矛盾は tenbin だけではない。実測 3 件である。**
前版は「contradiction が付くのは tenbin のみ」と読める書き方をしていた。
requirements.md も同じ箇所で tenbin のみを挙げるが、**いずれも執筆時点の参考値**である(則3)。
AC-13e は「1 個以上」を求めるので門は落ちないが、
**実装者が「1 件しか出ないはず」と読み、3 件出た画面を不具合と誤認してはならない。**
**矛盾の件数は固定値ではなく、規則を全 run に適用した結果である。**

**`scaleGuess` は一意に定まらないことがある** — 実測の相数逆引き:

```
$ node -e "const f=require('./graph/forge.js');const o={};
   for(const k of Object.keys(f.SCALES))o[k]=f.buildDag('x',k).tasks.length;
   const d={};for(const[k,v] of Object.entries(o))(d[v]=d[v]||[]).push(k);
   console.log(JSON.stringify(o));console.log(JSON.stringify(d))"

{"quick":6,"standard":14,"full":17,"reform":11,"counsel":6,"cartography":11}
{"6":["quick","counsel"],"11":["reform","cartography"],"14":["standard"],"17":["full"]}
```

**相数 6 は `quick` と `counsel`、相数 11 は `reform` と `cartography` が衝突する。**
ゆえに `phasesTotal` だけでは道を一意に引けない。
**設計: 候補が 1 本のときだけ `scaleGuess` に道名を入れ、2 本以上なら `scaleGuess: null` とし、
`scaleCandidates: ['reform','cartography']` に両論を併記する。**
**推測で 1 本に決めてはならない**(NFR-06)。画面は候補が複数なら「reform または cartography」と出す。

**`run.json` 形式(旧 orchestrator)の混在**: `domains` を持たないファイルは
その run 単位で skip し `errors[]` に `{engine:'conclave-read', run:<name>, reason:'no domains[]'}` を積む。
**断面全体は exit 0 で返る**(AC-14c)。

### 1.3.5 `daily` — 日次ノルマ(FR-16)

| 鍵 | source | 落ちたとき |
|---|---|---|
| `due` / `catchUp` / `owedDay` / `reason` / `jst` | **`dailyGuard.isDue()` を module として。引数なし** | `null` + errors |
| `lease` | `status --json` に保持者欄が**現れる場合のみ**。無ければ鍵ごと出さない | 鍵を出さない |

**実走した出力**(則1):

```
$ node -e "console.log(JSON.stringify(require('./graph/daily-guard.js').isDue()))"
{"due":false,
 "reason":"already ran for 2026-09-01 (newest open window: 2026-09-01)",
 "now":{"date":"2026-09-02","hour":18,"minute":7,"stamp":"2026-09-02 18:07 JST"},
 "owedDay":"2026-09-01",
 "ledger":{"lastDate":"2026-09-01","history":[…],"lastStamp":"2026-09-01 22:08 JST"}}
実測 9.0ms。例外なし。exit code は存在しない
```

**断面への写し方**: `{ due, reason, owedDay, jst: now.stamp }`。
`isDue()` の返り値にも `ledger` 鍵があるが、**これは日次ノルマの台帳であって FR-22 の gauge ledger ではない。**
**同名の別物を断面の同じ場所に混ぜてはならない** —— FR-22 の台帳は最上位 `ledger[]`(§1.3.7)、
日次の台帳は `daily` の中に留める。混ぜれば AC-22b の 3 値一致が意味を失う。

**exit code を成否として読まない**(AC-16a)。実測 `due` は `{"due":false}` を返しつつ **exit=1**。
**exit 1 = 債務なし**である。module として呼べばこの罠は構造的に消える(上の実走に exit code は現れない)。
`lease` は discover 未確認のため、**存在しなければ鍵を出さない**(推測を出さない — NFR-06)。

### 1.3.6 `scale` — 道の形(FR-21)

```
scale = { quick:{phases,gates}, standard:{...}, full:{...},
          reform:{...}, counsel:{...}, cartography:{...}, classifierAvailable:true }
```

`source`: `forge.buildDag('x', '<name>').tasks.length`。**第2引数は文字列**(罠 T-2)。
実測 `quick 6 / standard 14 / full 17 / reform 11 / counsel 6 / cartography 11`。
**ハードコードしない** — 相数は `Object.keys(forge.SCALES)` を舐めて動的に得る。
道が 7 本目を迎えた朝、断面がひとりでに 7 本を描く。

### 1.3.7 `ledger[]` — 点数履歴(**FR-22。前版に欠落していた**)

**前版は `ledger` の語を 1 度も書いていなかった**(`grep -ci ledger design.md ux.md identity.md` → 0/0/0)。
FR-22 が課すのは 3 つである:

1. 点数履歴の源を **`gauge.js ledger` のみ**とし、**`baseline` を呼ばない**(AC-22a)
2. 断面の **`ledger.length`** が `readLedger().length` と CLI 行数と **3 値一致**する(AC-22b)
3. 画面に **`data-source="gauge-ledger"`** の出所ラベルを出す(AC-22c)

#### source と実走

```
$ node -e "const g=require('./graph/gauge.js');
   console.log('ledgerPath =', g.ledgerPath());
   const l=g.readLedger();
   console.log('length     =', l.length);
   console.log('行の鍵     =', JSON.stringify(Object.keys(l[0])));
   console.log('末尾1行    =', JSON.stringify(l[l.length-1]))"

ledgerPath = C:\Users\kikus\Documents\workspace\paradise-creations\gauge-ledger.jsonl
length     = 10                                          実測 0.5ms
行の鍵     = ["ts","slug","scale","metrics"]
末尾1行    = {"ts":"2026-09-02T07:03:12.474Z","slug":"tenbin","scale":"full",
              "metrics":{"score":100,"complete":true,"phasesTotal":17,"phasesDone":17,
                         "domainsTotal":6,"domainsRatified":6,"firstPassRate":1,
                         "reworkCount":0,"retryOverhead":0,"loopGuardTrips":0,
                         "durationMs":13520919}}

$ node graph/gauge.js ledger | grep -cE '^[[:space:]]+[0-9]{4}-'
10                                                       ← CLI の日付行と一致(2 値一致を確認)
```

**源(`readLedger().length` = 10)と表示(CLI 行数 = 10)は既に一致している。**
**欠けていたのは断面の 3 値目だけである。** 本節がそれを足す。

#### 断面スキーマ

```
ledger[i] = { ts, slug, scale, score, phasesDone, phasesTotal }
```

| 鍵 | 型 | source | 落ちたとき |
|---|---|---|---|
| `ts` | `string`(ISO) | 台帳行の `ts` を**そのまま**。**再計算しない** | 行を落とさず `null` |
| `slug` | `string` | 台帳行の `slug` | `null` |
| `scale` | `string` | 台帳行の `scale`(`full` / `reform` …) | `null` |
| `score` | `number` | `row.metrics.score` | `null` |
| `phasesDone` / `phasesTotal` | `number` | `row.metrics.*` | `null` |
| (配列全体) | `array\|null` | `gauge.readLedger()` を try/catch 殻で | **`null` + errors**。空配列で埋めない |

```js
// graph/pulse.js — FR-22。gauge.baseline() は呼ばない(AC-22a)
const ledger = guard('gauge', 'ledger', () =>
  gauge.readLedger().map(r => ({
    ts: r.ts,                        // ← 台帳が記録した時刻をそのまま持つ。再計算しない
    slug: r.slug, scale: r.scale,
    score: r.metrics && r.metrics.score,
    phasesDone: r.metrics && r.metrics.phasesDone,
    phasesTotal: r.metrics && r.metrics.phasesTotal,
  })), null);
```

**`baseline()` を呼ばない理由**(FR-22 の由来 R-29): `baseline` は `ledger` とほぼ同じ表示を出すが
**タイムスタンプを再計算する**。実測で `2026-09-02T07:03` に化けた。
**同じ出来事に 2 つの時刻が生まれれば、画面はそのどちらかで嘘をつく。**
ゆえに断面は **`readLedger()` 一本**を源とし、`ts` を**加工せずに**運ぶ。
`gauge.baseline` は export に存在する(`typeof === 'function'`)が、**pulse.js からは呼ばない。**
AC-22a の検査 `grep -o "gauge.js baseline\|gauge baseline" graph/pulse.js dashboard/*.js dashboard/*.html | wc -l` → `0` を構造として満たす。

**`ts` は ISO のまま断面に載せ、画面には `toISOString()` の文字列を出さない**(§1.3.1 と同じ原則)。
表示は `ux.md` §3 の局所時刻規則が担う。

#### 画面への出し方(FR-22 / AC-22c)

**新しい領域は作らない。** §4.2 の**領域 4 `runs-score`(点数と起動実績の並置)の内側**に、
run ごとの「点数の履歴」として置く。理由は §4.1 と同じ —— 領域を増やせば導線の維持費が上がる。
そして **FR-13 の並置(点数 / 起動実績)と FR-22 の履歴(その点数がいつ付いたか)は、
同じ問いの現在形と過去形**であり、離すほうが読み難い。

| 出すもの | 断面の鍵 | 実装上の掟 |
|---|---|---|
| 履歴行 | `ledger[]` を `slug` で絞り `ts` 降順 | **`data-source="gauge-ledger"` を根要素に付す(AC-22c)** |
| 各行の時刻 | `ledger[i].ts` | 「**ledger 記録時刻**」と明示するラベルを添える(FR-22 の要求)。相対表記は `ux.md` §3.2 |
| 各行の点数 | `ledger[i].score` | 直近との差を併記してよい(**engine を呼ばずに断面内で引き算する**) |
| `ledger` が `null` | — | `data-state="error"` + `data-awaiting="gauge"`。**空配列として描かない** |
| `ledger` が `[]` | — | `data-state="empty"`「まだ採点の記録がありません」。**`null` と区別する**(§1.5) |

**`ledger.length` が断面に載ることで AC-22b の 3 値一致が測れるようになる**:

```
源  : node -e 'console.log(require("./graph/gauge.js").readLedger().length)'        → 10
表示: node graph/gauge.js ledger | grep -cE '^[[:space:]]+[0-9]{4}-'                → 10
断面: node graph/pulse.js snapshot --json | node -e '…JSON.parse(s).ledger.length'  → 10  ★本節が足した
```

**10 は執筆時点の参考値であって期待値ではない**(則3)。
`ledger` は**追記型**であり、run を採点し直すたびに増える。**測るのは 3 つの数え方が一致することである。**

### 1.4 run 列挙の設計(D-13 の構造的回避)

```js
function listRuns() {
  const root = workspace.resolve().root;          // 第30条。住所を知るのは workspace.js だけ
  return visibleDirs(root)                        // §1.3.2a と同じ関数。数え方の入口を 2 つ持たない
    .filter(e => !e.name.startsWith('_'))         // 作業場は run ではない
    .map(e => ({ name: e.name, path: path.join(root, e.name, 'conclave.json') }))
    .filter(r => fs.existsSync(r.path));          // D-6: 不在と 0 件を取り違えない
}
```

**slug を CLI に渡す経路が構造上どこにも無い。** D-13 の罠は設計で消える。
**`visibleDirs()` を共有することで `counts.creations` と `runs[]` の母集合がずれない**(D-5 の再発防止)。
実測 `listRuns().length` = 5(coin / habit / reform-claude-md-diet / reform-eval-gauge / tenbin)。

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

### 1.5.1 **例外を投げない故障 — try/catch では捕まらないもの**

**try/catch の殻は「engine が投げてくれる」ことを前提にしている。投げない engine がある。**

| engine | 誤った呼び方をしたときの挙動 | 殻に捕まるか | 対処 |
|---|---|---|---|
| `gauge.score` | **THROW**(第37条の番人) | ✔ 捕まる | 殻だけで足りる |
| `vendor.check` / `workspace.check` | **THROW**(`is not a function`) | ✔ 捕まる | §1.3.3 で正しい入口に直した |
| `lessons.exportLessons()` | **THROW**(`path` 引数が undefined) | ✔ 捕まる | 殻だけで足りる |
| **`spawnTrace.report`** | **投げない。`{ok:true,total:0}` を返す** | **✘ 捕まらない** | **§1.3.4a の `total > 0` 事前 assert** |

**「静かに緑を返す故障」は殻を素通りする。** ゆえに設計は 2 段構えを取る:

1. **殻**(try/catch)= 投げる故障を捕らえる
2. **事前 assert** = 投げない故障を、**返り値の妥当性**で捕らえる

**返り値の妥当性を確かめるべき鍵**(すべて「0 や空が正常でありうるが、
それが『測った結果の 0』なのか『測れていない 0』なのかを区別できない」もの):

| 鍵 | assert | 破れたとき |
|---|---|---|
| `runs[].spawn` | `rep.total > 0` | `spawn = null` + errors(§1.3.4a) |
| `counts.creations` | `creations + workshops === visibleDirs().length` | `null` + errors(§1.3.2a) |
| `ledger[]` | `Array.isArray(rows)` | `null` + errors(§1.3.7) |
| `scale` | `Object.keys(forge.SCALES).length > 0` | `{}` + errors |

**第16条「判定不能は緑ではない」は、engine が緑を返してきた場合にも適用される。**

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

## 1.7 断面生成の時間収支 — **すべて実測に置き換えた**

**前版は gates を「~200ms」と見積もり、合計 ~250ms と書いた。これは過大見積であった。**
審査官の機での実測は warm **29.1ms**、本機での実測は warm **51〜53ms**。
**見積を捨て、実測を載せる**(則1):

| 区分 | 実測 | 備考 |
|---|---|---|
| require 13 engine(初回のみ) | 4.7ms | 常駐後は 0 |
| `counts` 一式(articles/engines/cardinals/creations/kg) | ~3.5ms | codex.parse() が 2.1ms で最大 |
| conclave 直読み + gauge.score + spawn.report ×5 run | ~1.5ms | score 0.2ms / report 0.1ms(**オブジェクト渡し**) |
| `ledger`(`gauge.readLedger()`) | 0.5ms | FR-22 |
| `daily`(`isDue()`) | 9.0ms | |
| `scale`(buildDag ×6) | ~0.5ms | |
| lessons export + 読取 + **unlink** | ~2ms | 一時ファイルは必ず削除(AC-18c) |
| **gates 5 門** | **cold 67.2ms / warm 51〜53ms** | **依然として最大の費目だが 200ms ではない** |
| **合計(gates 込み・毎回走らせる)** | **cold 89.5ms / warm 61〜70ms** | 実測 5 周 |
| **合計(gates をキャッシュ)** | **cold 93.7ms / warm 5.4〜8.9ms** | 実測 6 周 |

**実走の出力**(則1):

```
--- gates キャッシュ無し(毎回走らせる) ---
  pass1 = 89.5ms (cold)
  pass2 = 70.5ms   pass3 = 69.3ms   pass4 = 62.1ms   pass5 = 61.5ms
--- gates キャッシュ有り ---
  pass1 = 7.3ms    pass2 = 5.4ms    pass3 = 5.8ms    pass4 = 7.5ms   pass5 = 6.2ms

--- 断面まるごと 6 周(キャッシュ有りの設計そのまま) ---
=== 断面 #1 (COLD) ms=93.7 gatesCached=false ===
=== 断面 #6 (WARM) ms=7.2  gatesCached=true  ===
timings: [93.7, 7.9, 7.5, 7.5, 8.9, 7.2]
WARM_MAX = 8.9ms   (AC-N01d / AC-01i の 50ms 未満)
errors : []
```

### mtime キャッシュの要否 — **再検討した結果、残す**

審査官は「実測 29.1ms なのだからキャッシュは無くても AC-N01d(50ms 未満)を満たす」と申し送った。
**その通りであるが、それは審査官の機での話である。本機では違った**:

| 機 | gates warm | キャッシュ無しの断面 warm | AC-N01d(50ms) |
|---|---|---|---|
| 審査官の機 | 29.1ms | 実測なし(gates 単体のみ) | 余裕あり |
| **本機**(同一構成・別時刻) | **51〜53ms** | **61〜70ms** | **超える** |

**29ms と 53ms の差は engine の変更ではなく、機と時の揺らぎである。**
**その揺らぎが 50ms の閾を跨ぐ以上、キャッシュ無しの設計は「速い日は緑、遅い日は赤」になる。**
不定に赤くなる門は、§5.4 で我々自身が病と断じたもの(motion-probe の不定赤)と同じ形である。

**ゆえに mtime キャッシュは残す。ただし動機を実測に基づいて書き直す**:

> ~~gates は 200ms かかるから~~ → **gates は cold 67ms / warm 51〜53ms かかり、
> 断面全体を 61〜70ms に押し上げる。AC-N01d の 50ms を跨ぐ揺らぎの中にあるため、
> キャッシュで 5.4〜8.9ms に落として閾から遠ざける。**

**キャッシュの規則**(簡素に保つ — 賢くしない):

```js
// 鍵は graph/*.js の最大 mtime。engine が 1 本でも書き換われば全門を測り直す
function graphMtimeKey() {
  let max = 0;
  for (const f of fs.readdirSync(GRAPH)) if (f.endsWith('.js'))
    max = Math.max(max, fs.statSync(path.join(GRAPH, f)).mtimeMs);
  return max;                                   // 実測 0.7ms。門 5 本を測るより 70 倍安い
}
// 鍵が変わらなければ前回の gates 配列をそのまま返す。at はそのとき測った時刻を保つ
```

**門ごとに細かく無効化しない。** engine は互いを require しており、
「wiring.js だけ変わったから wiring 門だけ測り直す」は**依存の向きを人が推測すること**になる。
**推測を設計に入れない**(NFR-06)。全門まとめて測り直すほうが安全で、cold 67ms なら払える。

**キャッシュを持つことの代償と、その支払い方**:
`gates[i].at` は**その門を実際に測った時刻**であり、`generatedAt` より古くなりうる。
**古い合否を「いま測った」として出せば NFR-06 違反である。**
ゆえに `ux.md` §2.1 の**パネル単位の最終更新**を必ず実装し、
門のパネルは `gates[i].at` を自分の鮮度として出す(断面全体の鮮度を借りない)。
**キャッシュを持つなら、その事実を画面が語らねばならない。**

**`gatesCached: boolean` を断面の最上位に載せる** —— テストが
「2 回目はキャッシュが効いた」ことを機械で確かめられるようにするためである(AC-01i の補助)。

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
| 3 | `gates` | 門の合否 5 列 + **各門の測定時刻** | `gates[]`(`gates[i].at` / `gatesCached`) |
| 4 | `runs-score` | 点数と起動実績の**並置** + **点数履歴(FR-22)** | `runs[].score` / `runs[].spawn` / **`ledger[]`** |
| 5 | `daily` | 日次ノルマの債務 | `daily` |
| 6 | `scales` | 道の形 6 本 | `scale` |
| 7 | `memory` | 教訓 / KG | `lessonsByKind` / `counts.kg*` |
| 8 | `atlas-index` | **全画面への索引** | `atlas[]` + 実在検査 |

**領域 4 が 3 つの鍵を担う理由**(FR-13 + FR-22): 「点数」「起動実績」「その点数がいつ付いたか」は
**同じ問いの 3 つの面**である。並べれば矛盾が見え、離せば見えない。
`ledger[]` はこの領域の内側に **`data-source="gauge-ledger"`** を付した小節として置く(AC-22c / §1.3.7)。
**領域は 8 のまま増やさない** —— 増設は導線の維持費を上げる(§4.1)。

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
| `tests/dashboard-run-panel.test.js` | (FR-13 / FR-14 / **FR-22**) | AC-13a〜e, AC-14a〜i, **AC-22a/b/c** | ~2s |
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
| **G-01(D-5)** | **`visibleDirs()` から `.` 除外を外す**(`.git`/`.github` を数える) | **`dashboard-count.test.js` exit 1**(AC-01b の両辺が割れる) |
| **G-01(D-3)** | **`spawnTrace.report(run)` を `report(r.path)` に戻す** | **`dashboard-run-panel.test.js` exit 1** — `total > 0` の事前 assert が `spawn=null` を出し、`data-contradiction="true"` が 0 個になる(AC-13e) |
| **FR-22** | **`ledger` 鍵を断面から外す / `gauge.baseline()` に差し替える** | **`dashboard-run-panel.test.js` exit 1**(AC-22a の grep が 1 以上 / AC-22b の 3 値一致が崩れる) |
| G-02 | `template.html` に `fonts.googleapis` を 1 行戻す | CI exit 1 |
| G-03 | 合成の見本を `graph/` に置く(検査後**必ず削除**) | `workspace.js check` exit 1 |
| G-04 | 新 `dashboard/*.html` を足しリンクを張らない | CI exit 1 |
| G-05 | `index.html` に外部 CDN の `<link>` を 1 行 | critic exit 1 |
| G-06 | `paradise.js` に `v: 2` を 1 行戻す | CI exit 1 |
| G-07 | `pulse.js` に census 呼出を 1 行 | CI exit 1 |
| G-08 | 新設テストに `require('../dashboard/state.json')` を 1 行 | `derived.js check` exit 1 |
| G-09 | `browser.close()` を `child.kill()` に戻す | `motion-probe-leak.test.js` exit 1 |
| G-10 | `pulse.js` に `execFileSync` を 1 行 | CI exit 1 |

**D-3 の故障注入が最も重要である。** これは「引数の型を間違えると門が鳴る」ことの検査であり、
**前版の設計が踏んだ罠を、二度と静かに踏めなくする**ためのものである(第50条)。
壊した状態で緑が出るなら、その門は D-3 を見ていない。

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
| `ledger[]` の断面スキーマと `data-source="gauge-ledger"` を出すこと(FR-22 / §1.3.7) | 履歴行の書体・色・区切り → `identity.md` / `ux.md` §5.4 |
| **`data-contradiction` / `data-run-state` を出すこと**(印の**有無**) | **印をどう見せるか**(色・枠・字) → `identity.md` / `ux.md` §5 |

**印そのものを省いてはならない**(要件 §9.5)。design が決めてよいのは**どう見せるか**だけである。
本書は印を**出す**と決め、**どう見せるか**は姉妹文書に委ねた。

**本改稿でも色は 1 件も足していない**(第17条):

```
$ grep -coE '#[0-9a-fA-F]{6}' reform/dashboard-living-gate/design.md   → 0
```

---

# §9. 実装時の罠 — **build 相はここを先に読め**

**本節は審査報告 `ratify-design.md` §6.3 の申し送り 8 件を全て取り込み、
本改稿で確定させた事実を各項に併記したものである。**
**すべて実際に走らせて確かめてある**(則1)。走らせた全出力は §10 附録に在る。

| # | 罠 | 正しい形 | 誤ると何が起きるか | 本書の該当節 |
|---|---|---|---|---|
| **罠1** | **`spawn-trace.report()` / `gauge.score()` に**パスを渡す** | **必ずパース済みの run オブジェクトを渡す** | `gauge` は THROW するが **`spawn-trace` は例外を投げず `{ok:true,total:0}` を返す**。矛盾が永久に false になり、しかも門が鳴らない。**`total > 0` を先に確かめること** | §1.2 T-5/T-6 / **§1.3.4a** |
| **罠2** | gates 5 門を**一律 `check()`** で呼ぶ | **入口は門ごとに違う** — `wiring.check()` / `derived.check()` / `check-agents.check()` は `check()`、**`vendor` は `verify()`**、**`workspace` は `hardcodedRefs()` + `strayCreations()` の合成** | 5 門中 2 門が毎回 `is not a function` で例外 → 常時赤 → AC-15a/15b が落ちる | §1.2 T-7/T-8 / §1.3.3 |
| **罠3** | `counts.engines` を**固定値 33** と比較する | **`pulse.js` 自身を含んで 34 になる。** その場で数えた数と突き合わせる(AC-E3) | 着工初日に赤。しかも「正しい赤」ではなく則3 違反の赤 | §1.3.2 |
| **罠4** | `counts.creations` で**ドットディレクトリを除かない** | **`!name.startsWith('.')` を必ず入れる。** `.git` / `.github` を数えると node=9 / bash=7 で両辺が割れる。`_` 始まりは**捨てず**に `workshops` として数える | AC-01a/b が偽陽性で赤くなる(画面の嘘ではなく数え方の食い違い) | **§1.3.2a** |
| **罠5** | `lessons.exportLessons()` を**引数なし**で呼ぶ / **一時ファイルを消し忘れる** | **`exportLessons(<outPath>)` は outPath 必須。** 読了後 **必ず `unlink`** する。実測 1.8ms / count=65 / byKind={mechanism:63, conduct:2} | 引数なしは `The "path" argument must be of type string … Received undefined` で THROW。消し忘れると **AC-18c が落ちる**(審査官が実演済み) | §1.2 T-9 / §1.3.2 |
| **罠6** | `daily-guard` を**CLI で呼び exit code を成否と読む** | **`isDue()` を module として呼ぶ。** module 呼びなら **exit code が存在しない**。実測 `{"due":false, reason:"already ran for 2026-09-01", …}` / 9.0ms | CLI では `due:false` なのに **exit=1** が返る。exit 1 を「失敗」と読むと日次パネルが常にエラーになる(AC-16a) | §1.3.5 |
| **罠7** | `..` 脱出の 403 分岐を **`http.get` で検査する** | **生ソケット(`net.Socket` に `GET /../../x HTTP/1.1` を直書き)で検査する** | `http.get` は送信前にパスを正規化するため `..` がサーバに届かず **404 が返る**。**「塞げている」と誤認する**(審査官が実測) | §2.3 |
| **罠8** | `census.js --no-tests` を**新規に実装しようとする** | **内部 API は既に `opts.runTests !== false` の分岐を持つ。CLI フラグを `opts.runTests` に繋ぐだけでよい**(`grep -c 'no-tests' graph/census.js` → 0 = CLI 配線のみが未実装) | 既にある分岐を二重に書くと、既定挙動(テストを走らせる)を壊す危険がある。**FR-06 は既定挙動を変えないことを課している** | §1.6 |

**加えて、本改稿で見つけた 2 件**:

| # | 罠 | 正しい形 |
|---|---|---|
| **罠9** | `scaleGuess` を `phasesTotal` から**一意に引けると思う** | **相数 6 は `quick`/`counsel`、相数 11 は `reform`/`cartography` が衝突する。** 候補が 1 本のときだけ `scaleGuess` を埋め、複数なら **`null` + `scaleCandidates[]` に両論併記**(§1.3.4) |
| **罠10** | `daily.ledger` と FR-22 の `ledger[]` を**同じものと思う** | **別物である。** `isDue()` の返り値の `ledger` は**日次ノルマの台帳**、FR-22 の `ledger[]` は **gauge の点数台帳**(`gauge-ledger.jsonl`)。混ぜれば AC-22b の 3 値一致が意味を失う(§1.3.5 / §1.3.7) |

**着工前の門(PRE-03)**: 審査官の実測で `archify-visual-check-profile` の残骸が
**683 個**まで悪化している(本書 §5.4 が引用した 529 から +154)。
PRE-03 は掃除後 **10 未満**を求める。**この数を先に落としてから着工すること。**
掃除前後の数は PR 本文に記録する(設計文書ではなく build/PR の責務)。

---

# §10. 附録 — 本改稿で走らせた engine 呼び出しと実出力

**則1(走らせて確かめる)の証拠である。** 検証スクリプトは `$LOCALAPPDATA/Temp` に置き、
`reform/dashboard-living-gate/` には 1 件も残していない。

```
======== A. counts の source ========
OK   clergy.COLLEGE keys                       (0.0ms)  ->  7
OK   codex.parse().length (articles)           (2.1ms)  ->  50
OK   fs.readdirSync('graph').filter(.js)       (0.2ms)  ->  33
OK   kg.query('').length                       (0.7ms)  ->  99

======== B. counts.creations / workshops の数え方 ========
OK   workspace.resolve()  (0.2ms)
     -> {"root":"C:\\Users\\kikus\\Documents\\workspace\\paradise-creations",
         "source":"sibling","legacy":false,"exists":true}
  全ディレクトリ = 10  [.git, .github, coin, habit, pomodoro, reform-claude-md-diet,
                        reform-eval-gauge, rps, tenbin, _scratch]
  ドット除外後(visible) = 8
  creations (! _ 始まり) = 7  [coin, habit, pomodoro, reform-claude-md-diet,
                               reform-eval-gauge, rps, tenbin]
  workshops (_ 始まり)   = 1  [_scratch]
  AC-01b 期待: creations + workshops == visible : true
  counts.runs (conclave.json 実在) = 5
  $ ls -d "$ROOT"/*/ | grep -vc '/_[^/]*/$'   → 7      ← bash 側も 7。両辺一致
  $ ls -d "$ROOT"/*/ | grep -c  '/_[^/]*/$'   → 1

======== C. gates 5 門 — 正しい入口 ========
OK    wiring.check()            (258.4ms 初回)  ->  {"ok":true,"keys":["ok","orphans","dangling","map"]}
THROW vendor.check()   [誤]     (0.0ms)  ->  vendor.check is not a function
OK    vendor.verify()  [正]     (8.6ms)  ->  {"ok":true,"keys":["ok","findings","status"]}
OK    derived.check()           (143.2ms 初回) ->  {"ok":true,"keys":["ok","findings","undeclared","note"]}
OK    check-agents.check()      (7.5ms)  ->  {"ok":true,"keys":["ok","skipped","dir","need","sources",
                                              "missing","dangling","ungoverned","misrouted","hierarchy","note"]}
THROW workspace.check() [誤]    (0.0ms)  ->  ws.check is not a function
OK    ws.hardcodedRefs()  [正]  (3.6ms)  ->  {"isArray":true,"len":0}
OK    ws.strayCreations() [正]  (14.4ms) ->  {"isArray":true,"len":0}

-- 正しい入口で 5 門を 5 周 --
pass1 cold: wiring=true(21.4) vendor=true(2.3) derived=true(19.0) check-agents=true(7.9) workspace=true(16.7)  SUM=67.2ms
pass2 warm: wiring=true(18.6) vendor=true(1.6) derived=true(13.6) check-agents=true(5.2) workspace=true(14.5)  SUM=53.5ms
pass3 warm: ... SUM=52.8ms   pass4 warm: ... SUM=51.1ms   pass5 warm: ... SUM=53.2ms

======== D. gauge.score — パス vs オブジェクト ========
  target = C:\Users\kikus\Documents\workspace\paradise-creations\tenbin\conclave.json
THROW gauge.score(<path string>)  [誤]
      -> run-state carries no phases — 測れないものに点は付かない(第37条)
OK    gauge.score(JSON.parse(read(path))) [正]  (0.2ms)
      -> {"score":100,"keys":["score","complete","phasesTotal","phasesDone","domainsTotal",
          "domainsRatified","firstPassRate","reworkCount","retryOverhead","loopGuardTrips","durationMs"]}

======== E. spawn-trace.report — パス vs オブジェクト(偽陰性) ========
OK  spawn-trace.report(<path string>) [誤/静かに 0]
    -> {"ok":true,"total":0,"observed":0,"assertedOnly":0,"noTrace":0}
OK  spawn-trace.report(<run object>)  [正]
    -> {"ok":false,"total":17,"observed":0,"assertedOnly":0,"noTrace":17}
  >>> パス渡しは例外を投げない = try/catch 殻に捕まらない = errors[] に積まれない

-- §1.3.4a の防御を実装して確かめた --
  (防御なし) contradiction(score100 && noTrace>0) = false   <<< 偽陰性。矛盾が消える
  (防御あり) パス渡し   -> spawn=null  errors に積んだ
             オブジェクト -> spawn={"total":17,"noTrace":17,"ok":false}  contradiction=true
  errors = [{"engine":"spawn-trace","key":"runs[tenbin].spawn",
             "reason":"spawn-trace.report returned total=0 — 測れていない(引数型を疑え)","fatal":false}]

======== F. gauge ledger (FR-22) ========
OK  gauge.ledgerPath()        -> C:\Users\kikus\Documents\workspace\paradise-creations\gauge-ledger.jsonl
OK  gauge.readLedger().length -> 10        (0.5ms)
    行の鍵  = ["ts","slug","scale","metrics"]
    末尾1行 = {"ts":"2026-09-02T07:03:12.474Z","slug":"tenbin","scale":"full",
               "metrics":{"score":100,"complete":true,"phasesTotal":17,"phasesDone":17,…}}
$ node graph/gauge.js ledger | grep -cE '^[[:space:]]+[0-9]{4}-'   → 10   ← 2 値一致

======== G. daily-guard / lessons ========
OK    daily-guard.isDue()  (9.0ms)
      -> {"due":false,"reason":"already ran for 2026-09-01 (newest open window: 2026-09-01)",
          "now":{"date":"2026-09-02","hour":18,"minute":7,"stamp":"2026-09-02 18:07 JST"},
          "owedDay":"2026-09-01","ledger":{…}}
THROW lessons.exportLessons(undefined) [誤]
      -> The "path" argument must be of type string or an instance of Buffer or URL. Received undefined
OK    lessons.exportLessons(<outPath>) [正]  (1.8ms)  -> {"count":65,"byKind":{"mechanism":63,"conduct":2}}
      一時ファイル unlink 済み(AC-18c): true

======== H. forge.SCALES / KG JSONL ========
OK  Object.keys(forge.SCALES) -> ["quick","standard","full","reform","counsel","cartography"]
    buildDag("x",<name>).tasks.length = {"quick":6,"standard":14,"full":17,
                                         "reform":11,"counsel":6,"cartography":11}
    相数 -> 道名 逆引き = {"6":["quick","counsel"],"11":["reform","cartography"],
                           "14":["standard"],"17":["full"]}   ← 6 と 11 が衝突(罠9)
OK  KG 直読み nodes.jsonl -> {"lines":99,"parsed":99}
OK  KG 直読み edges.jsonl -> {"lines":33,"parsed":33}

======== I. atlas[] の source ========
OK  dashboard/atlas の *.html (visual-check 除く)
    -> ["conclave.html","dag.html","dispatch.html","hierarchy.html","run.html","wiring.html"]

======== J. 訂正後の設計で断面をまるごと 6 周 ========
=== 断面 #1 (COLD) ms=93.7 gatesCached=false ===
=== 断面 #6 (WARM) ms=7.2  gatesCached=true  ===
counts       : {"articles":50,"engines":33,"cardinals":7,"creations":7,"workshops":1,
                "runs":5,"kgNodes":99,"kgEdges":33,"lessons":65}
gates        : wiring=true(20.4ms) vendor=true(2.1ms) derived=true(19.5ms)
                check-agents=true(7.3ms) workspace=true(24.6ms)
gates.detail : {"hardcodedRefs":0,"strayCreations":0}  {"orphans":[],"dangling":[]}
scale        : {"quick":{"phases":6},"standard":{"phases":14},"full":{"phases":17},
                "reform":{"phases":11},"counsel":{"phases":6},"cartography":{"phases":11}}
lessonsByKind: {"mechanism":63,"conduct":2}
ledger.length: 10   ledger[last]: {"ts":"2026-09-02T07:03:12.474Z","slug":"tenbin",
                                   "scale":"full","score":100,"phasesDone":17,"phasesTotal":17}
daily        : {"due":false,"reason":"already ran for 2026-09-01 …","owedDay":"2026-09-01",
                "jst":"2026-09-02 18:08 JST"}
atlas        : 6  conclave,dag,dispatch,hierarchy,run,wiring
errors       : []
runs:
   coin                     11/11 complete  score=100 total= 11 noTrace= 11 contradiction=true  scaleGuess=null cand=[reform,cartography]
   habit                    11/11 complete  score= 45 total= 11 noTrace= 11 contradiction=false scaleGuess=null cand=[reform,cartography]
   reform-claude-md-diet     5/11 stalled   score= 80 total= 11 noTrace= 11 contradiction=false scaleGuess=null cand=[reform,cartography]
   reform-eval-gauge        11/11 complete  score=100 total= 11 noTrace= 11 contradiction=true  scaleGuess=null cand=[reform,cartography]
   tenbin                   17/17 complete  score=100 total= 17 noTrace= 17 contradiction=true  scaleGuess=full cand=[full]
CONTRADICTION_COUNT = 3

timings: [93.7, 7.9, 7.5, 7.5, 8.9, 7.2]     WARM_MAX = 8.9ms   (AC-N01d 50ms 未満)

-- gates キャッシュの要否を実測で決めた --
キャッシュ無し: 89.5(cold) / 70.5 / 69.3 / 62.1 / 61.5 ms   ← 50ms を超える。閾を跨ぐ
キャッシュ有り:  7.3 / 5.4 / 5.8 / 7.5 / 6.2 ms             ← 閾から遠い
```

**`errors[] = []`** —— 訂正後の呼び方で、設計した鍵はすべて実際に埋まった。
**前版の呼び方では `vendor` / `workspace` の 2 門が例外、全 run の `score` が `null`、
そして `spawn` は静かに 0 を返して矛盾 3 件を握り潰していた。**
