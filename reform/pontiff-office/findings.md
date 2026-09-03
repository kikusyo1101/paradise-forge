# findings — 教主(Pontiff)の役割は機構化されていない

**相**: discover @market-researcher (reform の道, gate)
**神託**: 「教主の役割を改めて定義する必要がある。神託を実行するにあたり教主が作業を行う工数が現時点で圧倒的に多い。なぜなら、定義されていない分野の作業はすべて教主がサブエージェントを使わずに直接実行しているからだ。」
**測定日**: 2026-09-03 / ブランチ `reform/pontiff-office` / HEAD `262cd0e`
**測定機**: Windows 11, git-bash, node (リポジトリ `C:/Users/kikus/Documents/workspace/paradise`)

この文書に「〜のはず」「おそらく」は無い。**すべての数にそれを出したコマンドが付いている。**
測れなかったものは §7 に「測れなかった」と明記した。

---

## 0. 結論(数だけ先に)

| # | 実測された欠陥 | 数 | 出典 §|
|---|---|---:|---|
| **D-1** | **実在する走行 8件・全 94相のうち、起動が観測された相** | **0 / 94 (0.0%)** | §2.1 |
| **D-2** | 実在する run ファイルのうち `spawnTrace` キーを持つもの | **0 / 8** | §2.1 |
| **D-3** | `conclave.js`(環を回す engine)が `spawn-trace` を呼ぶ箇所 | **0** | §2.2 |
| **D-4** | 起動証跡ゼロのまま `conclave.js markDone` が `done` を受理する | **受理された(拒まれない)** | §2.3 |
| **D-5** | 非merge コミット113件のうち、agent 名義/委譲の証跡を持つもの | **0 / 113** | §2.4 |
| **D-6** | 「役者の居ない仕事」15件の願いのうち `standard` へ落ちたもの | **14 / 15 (93.3%)** | §3.1 |
| **D-7** | 道の総数 / 「産まない・作らない仕事」用の道の数 | **6本 / 0本** | §3.1 |
| **D-8** | `forge.js` が名指しする agent のうち実体ファイルが無いもの | **1 / 14** (`verification-loop`) | §4.2 |
| **D-9** | agent 定義ファイル 30件のうち、どの道からも名指しされないもの | **17 / 30 (56.7%)** | §4.2 |
| **D-10** | **新しい役者を鍛造して配備する engine** | **0本**(既存ファイルの改変器が4本あるのみ) | §5 |
| **D-11** | 全51条のうち「教主が自ら作業してはならない」と述べる条 | **0条** | §6 |
| **D-12** | 憲法が `pontiff` を語る16行のうち、禁止形で語る行 | **1行**(第23条・しかも reform の道に限定) | §6.2 |
| **D-13** | 門(gate)6本の現況 | 5緑 / 1赤(本件と無関係) | §1 |

**一行でいえば**: 楽園には「起動を観測する器」(`spawn-trace.js`)も「起動の権能を配る器」(`apply-spawn.js`)も在り、両方とも緑を出している。**だが、環を回す `conclave.js` がその器を一度も呼んでいない。** ゆえに証跡は8走行94相すべてで空であり、教主が全部自分でやったことを機構は一度も咎めなかった。

---

## 1. 全ての門を実際に走らせた現況

### 1.1 `node tests/paradise.test.js`

```
$ node tests/paradise.test.js   (所要 約200秒)
...
Paradise self-test: 289 passed, 1 failed
EXIT=1
```

赤の1件を名指しする(`grep -n "✗"` → 416行目、1件のみ):

```
  ✗ atlas: 全ての道が図になる — 描画器が実際に受理する (第47条)
      standard の道で図が壊れた
+ actual - expected
+ [
+   'standard/conclave: fail — 図は第一画面に収まってこそ図である。巻物でよいなら SUBJECTS に scroll:true と宣言せよ (第47条c)',
+   'standard/dispatch: fail — 図は第一画面に収まってこそ図である。巻物でよいなら SUBJECTS に scroll:true と宣言せよ (第47条c)'
+ ]
- []
```

**この赤は作図(atlas)の溢れであり、本件(教主の役割)とは無関係である。**
本文書はこの赤を直すことを求めない。数として記録するのみ。

### 1.2 残る5門 — すべて緑

```
$ node graph/check-agents.js
═══════ ⛪ AGENT PRESENCE ═══════
agents dir: C:\Users\kikus\.claude\agents
named by the paradise: 14 (forge.js + clergy.js + examples)
  ✓ all present
  ✓ every phase has a master
  ✓ every dispatch reaches the declared priest
  ✓ the hierarchy is real, not declared
EXIT=0

$ node graph/census.js check     (所要 約240秒)
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
EXIT=0

$ node graph/apply-models.js verify
AGENT MODEL POLICY  (C:\Users\kikus\.claude\agents)
  ✓ (30名すべて) ...
all agents match the rank policy
EXIT_APPLY=0

$ node graph/deploy.js check
═══════ 🏛  DEPLOYMENT CHECK ═══════
checked: 60  transforms (diff expected): agents
  ✓ every deployed file matches its declared source
EXIT_DEPLOY=0

$ node graph/critic.js review graph --self --lessons graph/lessons.json
  ✓ [gap] lesson:... (37件すべて satisfied)
VERDICT: the critic found nothing. Proceed to judgment.
EXIT=0
```

### 1.3 **これが本題の入口である**

**門は 5/6 が緑で、赤の1件も作図の溢れである。**
すなわち **「教主が94相すべてを自分でやった」という事実に対して、鳴った門は一つも無い。**
`check-agents.js` は「the hierarchy is real, not declared」と出力するが、これは *宣言と実体ファイルの照合* であって *実際に起動されたか* ではない(§2で分ける)。

---

## 2. 教主の手仕事の実測 ← **本題**

### 2.1 起動の証跡(spawnTrace)は 94相中 0件

実在する run ファイルを全部見つけ、全部開いて数えた。

```
$ find . -name conclave.json -not -path "./node_modules/*" | sort
./reform/conclave-resume/conclave.json
./reform/dashboard-living-gate/conclave.json
./reform/pontiff-office/conclave.json

$ find ../paradise-creations -name "conclave.json"
../paradise-creations/coin/conclave.json
../paradise-creations/habit/conclave.json
../paradise-creations/reform-claude-md-diet/conclave.json
../paradise-creations/reform-eval-gauge/conclave.json
../paradise-creations/tenbin/conclave.json
```

計 **8走行**。全部を `spawn-trace.js` で数えた:

```
$ node -e "
const fs=require('fs');const st=require('./graph/spawn-trace.js');
const files=[...上記8件...];
let T=0,O=0,A=0,N=0;
for(const f of files){const r=JSON.parse(fs.readFileSync(f,'utf8'));const rep=st.report(r);
 T+=rep.total;O+=rep.observed;A+=rep.assertedOnly;N+=rep.noTrace;
 console.log(f.padEnd(52),'total='+rep.total,'observed='+rep.observed,'asserted='+rep.assertedOnly,'no-trace='+rep.noTrace,'hasSpawnTraceKey='+('spawnTrace' in r));}
console.log('RUNS='+files.length,'PHASES_TOTAL='+T,'OBSERVED='+O,'ASSERTED_ONLY='+A,'NO_TRACE='+N,'RATIO_OBSERVED='+(O/T*100).toFixed(1)+'%');"

reform/conclave-resume/conclave.json                 total=11 observed=0 asserted=0 no-trace=11 hasSpawnTraceKey=false
reform/dashboard-living-gate/conclave.json           total=11 observed=0 asserted=0 no-trace=11 hasSpawnTraceKey=false
reform/pontiff-office/conclave.json                  total=11 observed=0 asserted=0 no-trace=11 hasSpawnTraceKey=false
../paradise-creations/coin/conclave.json             total=11 observed=0 asserted=0 no-trace=11 hasSpawnTraceKey=false
../paradise-creations/habit/conclave.json            total=11 observed=0 asserted=0 no-trace=11 hasSpawnTraceKey=false
../paradise-creations/reform-claude-md-diet/conclave.json total=11 observed=0 asserted=0 no-trace=11 hasSpawnTraceKey=false
../paradise-creations/reform-eval-gauge/conclave.json total=11 observed=0 asserted=0 no-trace=11 hasSpawnTraceKey=false
../paradise-creations/tenbin/conclave.json           total=17 observed=0 asserted=0 no-trace=17 hasSpawnTraceKey=false
---
RUNS=8 PHASES_TOTAL=94 OBSERVED=0 ASSERTED_ONLY=0 NO_TRACE=94 RATIO_OBSERVED=0.0%
```

`grep -l` でも裏を取った(1件も引っかからない):

```
$ grep -l "spawnTrace" $(find .. -name "conclave.json" -o -name "*.dag.json" -o -name "run.json" | grep -v node_modules)
GREP_EXIT=1        # ← 一致ゼロ
```

> **D-1 / D-2**: **94相中 observed 0件・asserted-only すら 0件・no-trace 94件。比率 0.0%。**
> `spawnTrace` キーを持つ run ファイルは **8件中 0件**。
> 「起動したと自称すらしていない」— 証跡の器が一度も使われていない。

CLI の生出力(1走行分、全11相が赤):

```
$ node graph/spawn-trace.js report reform/dashboard-living-gate/conclave.json
═══════ 👁  SPAWN TRACE ═══════
phases: 11   observed: 0   asserted-only: 0   no-trace: 11
  🔴 discover     この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない
  🔴 specify      (同上)
  🔴 design       (同上)
  🔴 build        (同上)
  🔴 prove        (同上)
  🔴 review       (同上)
  🔴 security     (同上)
  🔴 docs         (同上)
  🔴 verify       (同上)
  🔴 reflect      (同上)
  🔴 verdict      (同上)
───────────────────────────────
11 phase(s) bypassed the hierarchy — the ladder was declared but not walked
EXIT=1
```

### 2.2 原因: 環を回す engine が証跡の器を呼んでいない

```
$ grep -c "spawn-trace" graph/conclave.js graph/orchestrator.js graph/synod.js
graph/conclave.js:0
graph/orchestrator.js:0
graph/synod.js:0
```

`spawn-trace` を require するのは 2本だけで、どちらも環の外に居る:

```
$ node graph/wiring.js | grep -E "spawn-trace|conclave|contract"
  conclave                 ←require  1  →require  2  呼ぶ面: 命令/試験/散文
  contract                 ←require  0  →require  1  呼ぶ面: 門(CI)/命令/試験
  spawn-trace              ←require  2  →require  0  呼ぶ面: 門(CI)/試験
```

呼び手の内訳(`grep -rn "spawn-trace"`):
- `graph/contract.js:74` — **`opts.run` が渡されたときだけ** 検める(§2.3)
- `graph/pulse.js:48` — ダッシュボードの表示用

そして `contract.js` の CLI は `opts.run` を渡す口を持たない:

```
$ grep -n "opts.run\|--run" graph/contract.js
73:  if (opts.run) {
（CLI の main() は `contract.js check` で stdin を読むのみ。--run フラグは存在しない）
```

> **D-3**: `conclave.js` / `orchestrator.js` / `synod.js` は spawn-trace を **0回** 呼ぶ。
> 証跡の器は在るが、**環に配線されていない。**

### 2.3 起動証跡ゼロのまま `done` が通ることを実測した

`conclave.js markDone` は「成果物が実在するか」だけを見る。教主が自分の手で書いた成果物は当然実在する。

```
$ node -e "
const fs=require('fs'),os=require('os'),path=require('path');
const cl=require('./graph/conclave.js');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'po-'));
const art=path.join(tmp,'findings.md');
fs.writeFileSync(art,'教主が自分の手で書いた成果物である'.repeat(5));
const run={domains:[{cardinal:'discovery',domain:'Discovery',status:'active',reworks:0,reviewClass:'pontiff',
  phases:[{id:'discover',agent:'market-researcher',status:'running',attempts:1,resumes:0,dispatchedAt:new Date().toISOString()}]}],history:[]};
try{ cl.markDone(run,'discover',art); console.log('markDone RESULT: ACCEPTED (status='+run.domains[0].phases[0].status+')'); }
catch(e){ console.log('markDone RESULT: REJECTED -> '+e.message); }
console.log('run.spawnTrace after markDone =', JSON.stringify(run.spawnTrace));
const trace=require('./graph/spawn-trace.js');
console.log('spawn-trace.verify(discover) =', JSON.stringify(trace.verify(run,'discover')));"

markDone RESULT: ACCEPTED (status=done)
run.spawnTrace after markDone = undefined
spawn-trace.verify(discover) = {"ok":false,"state":"no-trace","phase":"discover",
  "reason":"この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない"}
```

> **D-4**: **誰も起動していない相を、環の engine が `done` として受理した。**
> 同じ run を `spawn-trace.verify` にかければ `no-trace` で赤が出る。
> **同じデータに対して、環は緑・証跡の器は赤。環が証跡の器に問い合わせていないからである。**

CI にはこの三値を裁く門が存在する(`.github/workflows/tribunal.yml:205-228`)が、**合成した run に対して**しか撃たれていない:

```yaml
      - name: 👁 Spawn trace — 起動の証跡を裁く機構が働くか (第27条)
        run: |
          node -e "
            const run = { domains: [{ phases: [{ id: 'p' }] }] };   # ← その場で作った偽の run
            assert.strictEqual(contract.reconcile({phase:'p',...},{run}).accepted, false, ...);
```

```
$ grep -rn "conclave.json" .github/workflows/tribunal.yml
（一致 0件）
```

> **D-4 系**: CI の spawn-trace 門は **実在する走行を一件も見ていない**。
> 見ていれば 94/94 の赤で必ず落ちる。門は自分で作った健全なオモチャだけを見ている。

### 2.4 コミット群 — 委譲の証跡は 113件中 0件

```
$ git rev-list --count HEAD
150

$ git log --format='%an <%ae>' | sort | uniq -c
     74 kiku.syo1101 <kiku.syo1101@gmail.com>
     35 kikusyo1101 <kiku.syo1101@gmail.com>      # ← GitHub の merge commit 名義
      2 Paradise <paradise@local>
     39 Paradise <paradise@localhost>

$ git log --no-merges --format='%an' | sort | uniq -c
     72 kiku.syo1101
     41 Paradise

$ git log --merges --oneline | wc -l
37
```

- 非merge コミット **113件**。著者は `kiku.syo1101`(神の git config そのもの)と `Paradise`(cron/自動走行の名義)の **2種のみ**。

```
$ git config user.name;  git config user.email
kiku.syo1101
kiku.syo1101@gmail.com
```

- **agent 名義のコミットは存在しない。** 委譲の trailer も無い:

```
$ git log --format='%B' | grep -icE "co-authored-by|generated with|agent:|priest:|神官:"
1
$ git log --format='%B' | grep -iE "co-authored-by|generated with" | sort | uniq -c
（出力なし ← 上の 1 は 'agent:' 等の別語がコミット本文に1度出ただけ。委譲 trailer は 0件）
```

直近40コミットの規模:

```
$ git log --no-merges -40 --numstat --format='COMMIT|%h|%an'   (集計)
kiku.syo1101     {"commits":40,"add":20587,"del":4702,"files":159}
```

> **D-5**: **非merge 113件すべてが、教主(神の git 名義)または無人走行名義。**
> **どのコミットにも「誰に委譲したか」の証跡が無い(0/113)。**
> 直近40コミットだけで **+20,587 / −4,702 行、159ファイル** が同一名義で動いている。

### 2.5 走行の点数は満点なのに、起動は全滅

```
$ node graph/gauge.js score reform/conclave-resume/conclave.json --json
{"score":100,"complete":true,"phasesTotal":11,"phasesDone":11,"domainsTotal":6,"domainsRatified":6,
 "firstPassRate":1,"reworkCount":0,"retryOverhead":0,"loopGuardTrips":0,"durationMs":6706706}

$ node graph/gauge.js score ../paradise-creations/tenbin/conclave.json --json
{"score":100,...,"phasesTotal":17,"phasesDone":17,"domainsRatified":6,...}
```

同じ走行の起動実績は §2.1 の通り **11/11・17/17 が no-trace**。

> **改善を測る engine(`gauge`)に「教主の手仕事」を測る指標が一つも無い。**
> `score / firstPassRate / reworkCount / retryOverhead / loopGuardTrips / durationMs` の6指標は
> **どれも「誰が働いたか」を含まない。** 100点は「教主が一人で全部やった」と両立する。

---

## 3. 「定義されていない分野」の穴を機構として測る

### 3.1 道は6本、うち「役者の居ない仕事」の受け皿は 0本

```
$ node -e "const f=require('./graph/forge.js');console.log(Object.keys(f.SCALES).length, Object.keys(f.SCALES).join(', '))"
6 quick, standard, full, reform, counsel, cartography
```

`chooseScale`(`graph/forge.js:354-371`)は**最後に必ず `standard` へ落ちる**:

```js
function chooseScale(wish) {
  const w = wish.toLowerCase();
  if (isCartography(wish)) return 'cartography';
  if (isCounsel(wish))     return 'counsel';
  if (REFORM_RE.test(wish)) return 'reform';
  const quickJa = /一行|修正|バグ|直す|.../;  ...
  if (quickJa.test(wish) || quickEn.test(w)) return 'quick';
  if (fullJa.test(wish)  || fullEn.test(w))  return 'full';
  return 'standard';          // ← 既定。合致しなかった願いは全部ここ
}
```

**「役者の居ない仕事」を15件、実際に走らせた:**

```
$ printf '%s\n' "動画を作れ" "音楽を作れ" ... | while read w; do
    printf "%-24s -> %s\n" "$w" "$(node graph/forge.js scale "$w")"; done

動画を作れ           -> standard
音楽を作れ           -> standard
Excelの表を作れ      -> standard
法務を調べろ         -> standard
英語に翻訳しろ       -> standard
メールを送れ         -> standard
プレゼン資料を作れ   -> standard
写真を加工しろ       -> standard
経理の帳簿をつけろ   -> standard
契約書をレビューしろ -> standard
ブログ記事を書け     -> standard
データを分析しろ     -> counsel
サーバーをデプロイしろ -> standard
採用面接をしろ       -> standard
ゲームのBGMを作曲しろ -> standard
```

> **D-6**: **15件中 14件(93.3%)が `standard` へ落ちた。**
> `counsel` に着いた1件も、語「分析」が諐問の語彙に当たっただけで、
> 「データを分析する役者」が居るからではない。

### 3.2 落ちた先の `standard` が名指しする役者を突き合わせる

```
$ node graph/forge.js phases --scale standard
FORGE PHASES  [scale: standard]  (14 phases, gates: discover, design, verify, reflect, verdict)
  discover  @market-researcher   ⚖️GATE
  specify   @requirements-analyst
  ux        @architect
  design    @architect           ⚖️GATE
  identity  @architect
  detail    @architect
  build     @architect
  tests     @tdd-guide
  review    @code-reviewer
  ux-review @ux-reviewer
  security  @security-reviewer
  verify    @verification-loop   ⚖️GATE
  reflect   @self-critic         ⚖️GATE
  verdict   @creation-judge      ⚖️GATE
```

`check-agents.js` はこれを緑にする(§1.2)。**なぜなら 10名すべてが実在するからである。**

> **これが穴の正体**: 「音楽を作れ」は `standard` へ落ち、**実在する `architect` が build 相を担う**ことになる。
> 名前は全部埋まっているので **門は一切鳴らない。**
> 楽園には「その仕事をやれる役者が居ない」ことを表現する型が存在しない。
> 憲法第49条が既に同じ病を名指ししている(「道が無いことはできないことではなく、**代役が黙って務めること**を意味する」)が、
> 第49条の是正は `cartography` **1本の道を足しただけ**で、一般化された機構にはなっていない。

### 3.3 6本の道が名指しする役者の集合

```
$ node -e "...(forge.SCALES 各道の agent 集合を出す)..."
scales: 6 quick, standard, full, reform, counsel, cartography
quick        6 : architect, creation-judge, market-researcher, requirements-analyst, self-critic, verification-loop
standard    10 : architect, code-reviewer, creation-judge, market-researcher, requirements-analyst,
                 security-reviewer, self-critic, tdd-guide, ux-reviewer, verification-loop
full        11 : (standard) + doc-updater
reform      10 : architect, code-reviewer, creation-judge, doc-updater, market-researcher,
                 requirements-analyst, security-reviewer, self-critic, tdd-guide, verification-loop
counsel      6 : auditor, executor, market-researcher, reporter, requirements-analyst, self-critic
cartography  9 : architect, auditor, creation-judge, doc-updater, requirements-analyst,
                 self-critic, tdd-guide, ux-reviewer, verification-loop
UNION named by forge: 14
  architect, auditor, code-reviewer, creation-judge, doc-updater, executor, market-researcher,
  reporter, requirements-analyst, security-reviewer, self-critic, tdd-guide, ux-reviewer, verification-loop
```

**6本すべてが同じ14名の内側で回っている。**
14名の職能は「調査・要件・設計・実装・テスト・レビュー・セキュリティ・文書・UX・裁定」に限られる。

**居ない役者を名指しする**(=どの道も呼び出せない分野):

| 分野 | 該当する役者 | 実測 |
|---|---|---|
| 映像・動画 | 無し | UNION 14名に該当なし |
| 音楽・音声 | 無し | 同上 |
| 表計算・帳票 (Excel等) | 無し | 同上 |
| 法務・契約 | 無し | 同上 |
| 翻訳・多言語 | 無し | 同上 |
| 画像・写真加工 | 無し | 同上 |
| 会計・経理 | 無し | 同上 |
| 通信(メール等)の実行 | 無し | 同上 |
| インフラ運用・デプロイ | 無し | 同上 |
| 資料作成(スライド) | 無し | 同上 |

---

## 4. 既存 agent 定義の一覧と、道との突き合わせ

### 4.1 実体

```
$ ls ~/.claude/agents
acceptance-criteria-writer.md architect.md auditor.md build-error-resolver.md cardinal.md
code-reviewer.md coverage-checker.md creation-judge.md data-collector.md data-modeler.md
doc-updater.md e2e-runner.md executor.md feature-ranker.md interface-designer.md linter.md
market-researcher.md module-builder.md planner.md refactor-cleaner.md reporter.md
requirements-analyst.md secret-scanner.md security-reviewer.md self-critic.md tdd-guide.md
test-writer.md user-story-writer.md ux-reviewer.md web-scout.md
COUNT=30
```

```
$ node graph/clergy.js college
枢機卿 discovery: priests: market-researcher                     / reviewed-by: pontiff
枢機卿 requirements: priests: requirements-analyst               / reviewed-by: cardinal:discovery
枢機卿 architecture: priests: architect                          / reviewed-by: cardinal:requirements
枢機卿 construction: priests: architect, tdd-guide               / reviewed-by: cardinal:quality
枢機卿 quality: priests: code-reviewer, security-reviewer, doc-updater, ux-reviewer / reviewed-by: executor
枢機卿 counsel: priests: market-researcher, auditor, reporter, requirements-analyst / reviewed-by: executor
枢機卿 cartography: priests: auditor, requirements-analyst, architect, ux-reviewer  / reviewed-by: executor
執行官 tribunal: officers: self-critic, creation-judge

$ node -e "const c=require('./graph/clergy.js');
 console.log('priests:',c.allPriests().length); console.log('believers:',c.allBelievers().length);
 console.log('cardinals:',Object.keys(c.COLLEGE).length);"
priests: 12
believers: 12
cardinals: 7
```

### 4.2 突き合わせ(実測)

```
$ node -e "... forge の UNION と ~/.claude/agents の実ファイルを突き合わせる ..."
UNION named by forge: 14
agent FILES: 30
named-but-no-file: verification-loop
file-but-never-named-by-forge: 17
  acceptance-criteria-writer, build-error-resolver, cardinal, coverage-checker, data-collector,
  data-modeler, e2e-runner, feature-ranker, interface-designer, linter, module-builder, planner,
  refactor-cleaner, secret-scanner, test-writer, user-story-writer, web-scout
```

`verification-loop` はファイルを持たないが、`check-agents.js` が明示的に免除している:

```
$ grep -n "PSEUDO" graph/check-agents.js
28:const PSEUDO = new Set(['verification-loop']);
$ ls ~/.claude/agents | grep -i verif
exit=1        # ← 実体は無い
```

> **D-8**: forge が名指しする14名のうち **1名(`verification-loop`)は実体を持たない**。
> 免除で緑になっている(これは既知の設計であり、本件の主題ではない)。
> **D-9**: agent 定義30件のうち **17件(56.7%)は、6本の道のどこからも名指しされない。**
> `planner` `cardinal` は clergy の階層に登場するが SCALES には現れず、
> 信徒12名も `marshalPlan` 経由の間接呼び出しのみで、道は誰一人名指ししない。

**要点**: 役者は **30名居るのに、道が呼ぶのは14名**。そして14名は全員 SDLC の役者である。
**新しい分野の役者を増やしても、道がそれを名指ししない限り呼ばれない。** そして道を増やす機構は §5 の通り無い。

---

## 5. 新しい役者を鍛造して配備する engine は存在するか → **存在しない**

### 5.1 探した

```
$ grep -rn "new-agent\|create-agent\|scaffold\|ordain\|叙任\|鍛造\|新しい役者\|新しい神官\|agent を作\|エージェントを作" \
    --include="*.js" --include="*.md" graph/ tools/ CLAUDE.md README.md
graph/build-identity-catalog.js:4: * build-identity-catalog.js — 視覚語彙カタログの鍛造
README.md:37:上流をマシンから消しても、楽園は鍛造し、裁き、出荷する。それが独立である。
```

**agent を新設する engine・コマンド・語彙は一つも見つからなかった(該当2件はどちらも別文脈)。**

### 5.2 在る4本の `apply-*` は「既存ファイルの改変器」であって「鍛造器」ではない

```
$ ls graph/apply-*.js
graph/apply-guards.js  graph/apply-models.js  graph/apply-seat.js  graph/apply-spawn.js
```

各engine が何を書くか(実測):

| engine | 対象 | 新規作成できるか | 根拠 |
|---|---|---|---|
| `apply-models.js` | `~/.claude/agents/*.md` の frontmatter | **不可** | `apply-models.js:32-33` — `readdirSync(AGENT_DIR)` で**既存の .md を列挙**して回る。無いものは対象にならない |
| `apply-spawn.js` | 同 frontmatter の `tools` | **不可** | `apply-spawn.js:80` — `if (!fs.existsSync(p)) { rows.push({...status:'absent'}); continue; }` — 不在なら `absent` と記して**素通り** |
| `apply-seat.js` | `~/.claude/settings.json`(教主の座) | 該当せず | agent ファイルを扱わない |
| `apply-guards.js` | `settings.json` の permissions/hooks | 該当せず | 同上 |

```
$ node graph/deploy.js check
checked: 60  transforms (diff expected): agents
  ✓ every deployed file matches its declared source
```

`deploy.js` は **配る器**であって **作る器ではない**。配る対象は `overlay/` に既に在るファイルのみ:

```
$ find overlay -type f | wc -l
166
$ node -e "const c=require('./overlay/overlay.json');
 console.log('kinds:',JSON.stringify(c.kinds));
 console.log('own.agents count:',(c.own&&c.own.agents||[]).length);
 console.log('replace count:',Object.keys(c.replace||{}).length);"
kinds: ["agents","commands","rules","skills"]
own.agents count: 21
replace count: 9
```

### 5.3 「新しい役者を1名増やす」ために教主が手で触る箇所(実測)

engine が無いので、必要な手作業を数えた:

| # | 触る場所 | なぜ必要か(根拠) |
|---|---|---|
| 1 | `overlay/agents/<name>.md` を**手で新規作成** | 鍛造器が無い(§5.1)。`deploy.js` は `overlay/` に在るものしか配らない(`deploy.js:60-97`) |
| 2 | `overlay/overlay.json` の `own.agents` に追記 | `deploy.js:94-96` が `c.own[kind]` を読んで steps に積む。134行のJSON |
| 3 | `graph/clergy.js` の `COLLEGE`(183行〜)に priests として追記 | `clergy.js:183` は**リテラル定数**。動的登録の口は無い |
| 4 | `graph/forge.js` の SCALES に相を足す/agent 名を書く | 道が名指ししない役者は呼ばれない(§4.2 で17名が実証) |
| 5 | `node graph/apply-models.js apply` を走らせる | 位階モデルの適用(第12条) |
| 6 | `node graph/apply-spawn.js apply` を走らせる | 起動権能の付与(第25条) |
| 7 | `node graph/deploy.js --write` を走らせる | 実機 `~/.claude/agents/` へ配備 |
| 8 | `node graph/check-agents.js` / `census.js check` で緑を確認 | 第22条 |

> **D-10**: **新しい役者を鍛造する engine は 0本。**
> 教主は **4ファイルを手編集し、4コマンドを順に走らせる** — 全8工程が散文の手順であり、機構ではない。
> しかもこの手順は README にも CLAUDE.md にも書かれていない(§5.1 の grep が 0件)。
> 憲法第10条「宣言は機構ではない」が、**役者を増やすという行為そのものに適用されていない。**

---

## 6. 憲法の現況

### 6.1 条数

```
$ node graph/codex.js index
全 51 条 / 本文 75,305 B / 索引はその約 94% 減
```

### 6.2 「教主が自ら作業してはならない」と述べる条は **在るか → 無い**

指示された5条を全文読んだ(`node graph/codex.js article <n>`)。要点を実文で引く:

| 条 | 題 | 教主について何を述べているか | 「自ら作業するな」と述べているか |
|---:|---|---|---|
| **11** | The paradise is an ecclesiastical hierarchy of nested cycles | 「God issues the wish; **the pontiff (the session) governs**; cardinals supervise domains; priests do large work…」 | **否**。教主の役目を `governs` と述べるのみで、**実務の禁止は一言も無い** |
| **12** | Capability is assigned by rank | 「the pontiff and the cardinals hold **the strongest reasoning because they decide**」 | **否**。モデルの割当だけを述べる |
| **25** | A hierarchy that cannot be walked is not a hierarchy | 「`conclave.next` handed a priest's orders **to the pontiff**, who then called the priest directly」「a ladder taller than the ceiling silently collapses into **the parent doing the work itself**」 | **症状としては名指ししている。だが禁令の形をしていない。** (a)〜(e)の是正はすべて *発令の宛先と権能* についてであり、「教主が実務をするな」ではない |
| **27** | An artifact proves work was done; it never proves who did it | 「an artifact **the pontiff wrote by his own hand** satisfies both conditions perfectly」「The reconciler could not tell delegation from impersonation, which is exactly how **eleven pull requests were produced with no cardinal ever convened**」 | **否**。是正(a)〜(d)は *証跡を残せ・三値で裁け* であり、**「教主が書くな」とは述べていない** |
| **45** | 発令する者は走る者ではない。同じ鍵を渡すな。 | 排他リースの kind(`run`/`dispatch`)を分ける条。**題は本件に酷似するが、対象は cron の watchdog とリースであって教主ではない** | **否**。「発令者」は `tools/paradise-catchup.py` を指す |

**全文検索でも裏を取った:**

```
$ grep -nE "pontiff (must not|may not|shall not|never)|教主は.*(な|禁|べからず|してはならない)|not by the pontiff" CONSTITUTION.md
228:23. **The paradise reforms itself by its own law, not by the pontiff's hand.**
EXIT=0

$ grep -cE "pontiff" CONSTITUTION.md
16          # pontiff を語る行は16行
$ grep -c "pontiff\|教主" CONSTITUTION.md
22
```

唯一ヒットした第23条の全文を読むと、対象は **reform の道に限定**されている:

> 23. **The paradise reforms itself by its own law, not by the pontiff's hand.**
>     Every road the forge knew — quick, standard, full — ended at `creations/<slug>`.
>     There was no road by which paradise could change *itself*. So **eleven consecutive
>     engine changes were written, reviewed and declared complete by the pontiff alone**:
>     no cardinal was convened, no priest dispatched, no tribunal summoned. …
>     Therefore paradise carries a **reform** scale, and three things follow. …

> **D-11**: **全51条のうち「教主が自ら作業してはならない」と一般則として述べる条は 0条。**
> **D-12**: `pontiff` を語る16行のうち、禁止形は **1行(第23条)のみ**。
> しかもその是正は「reform という道を1本足す」ことであり、**教主の実務を禁じてはいない。**
> 第23条自身が「eleven consecutive engine changes were written … **by the pontiff alone**」と
> 過去形で記録しているが、§2.4 の実測では **その後も非merge 113件すべてが同じ名義**である。

### 6.3 テストが教主を裁いているか

```
$ grep -cin "教主\|pontiff" tests/paradise.test.js
28
```

28件を読むと、教主を扱うのは以下の型のみ(抜粋):

```
612:  assert.strictEqual(step.reviewClass, 'pontiff', 'discovery is ratified by the pontiff');
878:  assert.ok(t(clergy.RANKS.pontiff.model) >= priest, 'the pontiff holds the whole plan');
2136:      'the order goes to the cardinal — the pontiff does not call priests directly');
2599:  assert.strictEqual(c.RANKS.pontiff.model, 'fable', '教主は長丁場の座');
```

`2136` が最も近いが、これは **`conclave.next()` が返す発令書の宛先が cardinal であること**を検めるだけで、
**教主が実際に自分で手を動かしたかは一切見ていない**(§2.3 で `markDone` が素通りすることを実証済み)。

```
$ node -e "const c=require('./graph/clergy.js');console.log(JSON.stringify(c.RANKS.pontiff,null,1))"
{
 "level": 1,
 "title": "Pontiff 教主",
 "role": "governs the whole; the session itself",
 "model": "fable",
 "effort": "xhigh",
 "why": "一度の座で終わらぬ仕事を持つ。計画の全体を保ち、全ての結果を照合し、最終の決を下す"
}
```

> 教主の `role` は文字列 `"governs the whole; the session itself"` **一文のみ**。
> 神託が求める5つの役割(管理・指示出し・結果確認・オーケストレーション新設・agent定義作成・神との対話)のうち、
> **この宣言が触れているのは「governs」の一語だけ**であり、**残り4つは機構にも散文にも存在しない。**

---

## 7. 測れなかったこと(正直に記す)

1. **`gh pr list` / PR本文の実測をしていない。** 本相の禁則(git 操作の制限)と、
   ネットワーク越しの `gh` を走らせていないため。PR番号の話は §6.2 の憲法第23条の引用(本文中の記述)に依る。
   **「11件のPRが教主の独断だった」は憲法本文の記述であり、私が git から数え直した数ではない。**
   私が数え直したのは §2.4 の「非merge 113件・merge 37件・著者2種」である。
2. **`reform/atlas-diagram-engine` 等5件の reform 走行には `conclave.json` が存在しない。**
   ```
   $ for d in reform/*/; do ... done
   atlas-diagram-engine        NO conclave.json
   atlas-motion-signal         NO conclave.json
   cartography-road            NO conclave.json
   conclave-resume             HAS conclave.json
   cron-fires-the-road         NO conclave.json
   dashboard-living-gate       HAS conclave.json
   hierarchical-orchestration  NO conclave.json
   pontiff-office              HAS conclave.json
   ```
   **8件の reform ディレクトリのうち 5件は環の台帳を持たない** — すなわち conclave を通していない可能性が高いが、
   **台帳が無い以上「通さなかった」ことを機械的に証明できない。** よって §2.1 の 94相にはこの5件を含めていない。
   (含めれば no-trace の分母はさらに増える方向にしか動かない)
3. **「教主が直接実装したコード行数」を委譲分と分離できていない。** git は著者名しか持たず、
   楽園は委譲の証跡をコミットに残していない(§2.4 で 0/113)。**分離する術が機構に無いこと自体が D-5 の内容である。**
4. **`node graph/forge.js scale` を走らせた願いは15件**であり、網羅的な分類ではない。
   ただし14/15 が `standard` へ落ちた事実と、`chooseScale` の実装(既定 return `'standard'`)は一致する。

---

## 8. 実測から導かれる欠陥の所在(設計はしない — 場所を名指すだけ)

本相は discover である。**直し方は書かない。** 実測が指した場所だけを列挙する。

| 欠陥 | 実測 | 住んでいる場所 |
|---|---|---|
| 環が起動を記録しない | §2.1 §2.2 (94/94 no-trace, conclave の spawn-trace 呼出 0回) | `graph/conclave.js` |
| 環が起動を検めずに done を通す | §2.3 (markDone ACCEPTED / verify no-trace) | `graph/conclave.js` `markDone` |
| 門が実在の走行を見ていない | §2.3 (tribunal.yml に conclave.json への参照 0件) | `.github/workflows/tribunal.yml` |
| 教主の手仕事を測る指標が無い | §2.5 (gauge 6指標に「誰が」が無い) | `graph/gauge.js` |
| 役者の居ない仕事が黙って standard へ落ちる | §3.1 (14/15) | `graph/forge.js` `chooseScale` |
| 道が名指しする役者が14名に固定 | §3.3 §4.2 (定義30名中17名が道から不可視) | `graph/forge.js` SCALES / `graph/clergy.js` COLLEGE |
| 新しい役者を鍛造する engine が無い | §5 (0本。手作業8工程) | `graph/apply-*.js`(改変器のみ) / `overlay/` |
| 憲法に教主の実務禁止条が無い | §6.2 (0/51条) | `CONSTITUTION.md` |
| 教主の role が一文の文字列 | §6.3 | `graph/clergy.js` `RANKS.pontiff` |

---

## 9. この findings 自身の正直な注記

**この相(discover)自体も、`spawnTrace` に証跡を残していない。**

```
$ node graph/spawn-trace.js report reform/pontiff-office/conclave.json
phases: 11   observed: 0   asserted-only: 0   no-trace: 11
```

私(market-researcher)は教主から起動されたが、`conclave.js` にそれを記録する経路が無い(§2.2)ため、
**この走行もまた 11/11 が no-trace のまま進む。**
これは §2 で述べた欠陥の、生きた実例である。
