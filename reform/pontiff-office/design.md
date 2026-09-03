# design — 教主(Pontiff)の職務を機構にする

**相**: design @architect (reform の道 第3相, gate)
**入力**: `reform/pontiff-office/requirements.md` (52本の AC) / `reform/pontiff-office/findings.md`
**測定日**: 2026-09-03 / ブランチ `reform/pontiff-office` / HEAD `262cd0e`
**測定機**: Windows 11, git-bash, node v24.14.0 (`C:/Users/kikus/Documents/workspace/paradise`)

本文書に「〜のはず」は無い。**既存 engine の挙動を述べた箇所には、本相で実際に読んだ行番号か、実際に走らせたコマンドと出力が付いている。**
本相が新たに実測して判明した事実は §0.1 と §8 に集約した。**そのうち一件は requirements の前提を覆した**(論点 F)。

---

## 0. 要旨

### 0.1 本相が実測して判明した、requirements が知らなかった事実

| # | 実測 | 帰結 |
|---|---|---|
| **F-1** | `node tests/paradise.test.js` を本相で完走させた → **`Paradise self-test: 290 passed, 0 failed`** | **findings §1.1 の赤1件は再現しない。** atlas の赤は決定的な欠陥ではなく**間欠**である |
| **F-2** | `atlas.check({scale, outdir})` を試験と同一の outdir・同一の5道で回した → **30行すべて OK**(`standard/conclave` `standard/dispatch` とも `screen=fits`) | 図は溢れていない |
| **F-3** | `atlas.draw` で描いた `standard/conclave` `standard/dispatch` を `archify visual-check --json` に直接かけた → **exit=0 status=pass 診断ゼロ** | 描画器は受理している |
| **F-4** | `atlas.js:1200-1227` の `firstScreen()` を実読し、その分岐を再現した → **溢れ診断も可読性診断も無い不合格のとき `reason` は `r.status` すなわち文字列 `"fail"` に落ちる** | findings §1.1 が記録した `standard/conclave: fail — 図は第一画面に…` の先頭語 `fail` は**画素の実測値ではなく receipt の status である**。**あの赤は溢れではない** |
| **F-5** | `overlay/vendor/archify/bin/visual-check.mjs:24` `EXIT={pass:0,fail:1,skipped:2}` / `:844` は Chrome 検査が完走できないとき `viewer/visual-check-runtime` を出して **exit 1** | 描画器の**実行時故障**が、楽園の門では**図の溢れ**として報告される |
| **G-1** | README.md:138 は `# 290/290 pass` と主張し、`census.js` の `claims()` がこれを実測と突き合わせる | **試験を1本足すたび README を直さねば census が鳴る**(第22条) |
| **G-2** | `conclave.markDone` を呼ぶ試験は **8本 / 22箇所**(`tests/paradise.test.js`)。加えて `tests/dashboard-run-panel.test.js` が `spawnTrace.report()` を直に叩く | 序列を必須にする設計は、**この 8本 + 1本を壊さない形でしか採れない** |

### 0.2 設計の骨子(一行ずつ)

| 論点 | 骨子 | 新 engine |
|---|---|---|
| **G** | 序列の閾値・語彙・判定表を **`spawn-trace.js` 一箇所**に置く。`clergy.RANKS.pontiff` に順序つき三段を持たせる | 無 |
| **A** | `conclave.js done --tier <1\|2\|3>` で申告。`markDone` が `spawn-trace` に問う。**紀元(epoch)の印を持つ run にだけ効く** | 無 |
| **B** | `conclave.js` が `spawn-trace.js` を `require` する(現在 0回)。`contract.js check --run` の口を開ける | 無 |
| **C** | 分野の台帳 `graph/domains.json` + 判定器 `graph/domains.js`。`forge.js` は `chooseScale` を残したまま `admit()` を足す | **`domains.js`** |
| **D** | 鍛造器 `graph/ordain.js` が `overlay/` と台帳に書く。配備は `deploy.js` のまま | **`ordain.js`** |
| **E** | 憲法 第52条。閾値を写経せず、門を engine 名で名指しする | 無 |
| **F** | **図は直さない。門を直す。** `firstScreen()` を診断コードで分類し、測定不能を溢れと呼ばない | 無 |
| **H** | `gauge.js` に序列の指標を **足す**。式は legacy に掛けない | 無 |

**新しい engine は 2本だけである**(`domains.js` / `ordain.js`)。序列の機構は既存の `spawn-trace.js` を太らせる — requirements が AC-G2/A9/A11/A12 で `spawn-trace.js` の subcommand として呼び出し面を固定しているからであり、**別の engine を建てれば AC がそのまま空振りする**。

---

## 1. 全体の配置図 — 何をどこに置くか

```
                        ┌──────────────────────────────────────┐
   願い ──▶ forge.js ──▶│ admit(wish)                          │
             (C)        │  1. 分野を判定 (domains.js)          │
                        │  2. 道を選ぶ (chooseScale ← 不変)    │
                        │  3. その道の全 agent が分野を担うか  │
                        └──────────────┬───────────────────────┘
                                       │ 担い手が居ない
                                       ▼
                             ordain.js (D) ──▶ overlay/agents/*.md
                              鍛造器            overlay/overlay.json
                                        └────▶ graph/domains.json
                                                      │
                                              deploy.js --write (既存)
                                                      ▼
                                                ~/.claude/agents/

   run の環 ──▶ conclave.js
                  ├── convene()  … run.epoch を刻む      ← 紀元 (A)
                  ├── markRunning() … dispatchedAt (既存)
                  └── markDone(run,id,art, {tier})
                            │ require('./spawn-trace.js')   ← 結線 (B)
                            ▼
                     spawn-trace.js  (G/A)
                       ├── TIERS         閾値7つの唯一の出所
                       ├── measure()     git の窓を実測
                       ├── judge()       §2.7 の判定表(唯一の実装)
                       ├── tier <run>    事後の突合
                       ├── tiers --json  閾値を機械へ
                       ├── audit         全 run を監査
                       └── report <run>  五値の集計
                            │
                            ├──▶ contract.js (既存 :73-82 の run 経路)
                            └──▶ gauge.js  序列の指標を足す (H)
```

**事実の出所は一つである**(第41条)。閾値は `spawn-trace.TIERS` だけが持ち、憲法も README も CLAUDE.md も数を写経しない。判定表は `spawn-trace.judge()` だけが実装し、`conclave` も `gauge` も `tier` も `audit` も **同じ関数を呼ぶ** — 二つ書けば必ず食い違う(findings §2.3 が実証した「環は緑・器は赤」の再発)。

---

## 2. G — 序列(tier)の機構

### 2.1 閾値は `spawn-trace.js` の `TIERS` 一箇所に住む

```js
// graph/spawn-trace.js
const TIERS = Object.freeze({
  t3: Object.freeze({ files: 2, churn: 50, bytes: 4096 }),   // T3-a / T3-b / T3-c
  t2: Object.freeze({ files: 10, churn: 880, artifacts: 2, domains: 2 }), // T2-a..d
});
```

**AC-G2** の要求は「`node graph/spawn-trace.js tiers --json` が exit 0 を返し、7つの数がすべて現れる」である。
上の構造を `JSON.stringify` すれば `2 / 50 / 4096 / 10 / 880 / 2 / 2` の7値がそのまま出る。

> **なぜ `Object.freeze` か**: 閾値は走行中に書き換わってはならない。`gauge` も `conclave` も同じオブジェクトを参照するので、一箇所が壊れれば全部が壊れる。凍らせておけば、書き換えの試みは実行時に静かに無視されるのではなく `use strict` 下で throw する — **黙って別の数で裁く門を作らない。**

### 2.2 序列の宣言をどこに刻むか

run の中に、相 id を鍵とする台帳を持つ:

```jsonc
{
  "epoch": { "tier": "v1", "at": "2026-09-03T..." },   // ← 紀元の印 (§2.4)
  "tierTrace": {
    "design": {
      "declared": 1,                       // 申告された序列 (1|2|3)
      "state": "observed",                 // observed|asserted-only|no-trace|序列3|unobservable
      "measured": { "files": 1, "churn": 24, "bytes": 58291 },
      "at": "2026-09-03T..."
    }
  }
}
```

**なぜ `spawnTrace` と別の鍵にするか**: `spawnTrace` は「誰が起動されたか」の観測記録であり、`tierTrace` は「教主が何を申告し、機構が何を測ったか」である。
findings §2.1 の `hasSpawnTraceKey` 判定と `tests/dashboard-run-panel.test.js` が `spawnTrace` の形に依存している(本相で実読)。**既存の鍵の意味を変えれば、それを読む門が静かに嘘になる。** 足すなら別の鍵で足す。

### 2.3 `RANKS.pontiff` — 三段の序列と5つの役割 (AC-G3 / AC-G4)

現況は `role` 文字列一文のみ(findings §6.3 実測)。次を **足す**(`level`/`title`/`model`/`effort`/`why` は一切変えない — `tests/paradise.test.js:878,2599` がそれらを assert している):

```js
pontiff: {
  level: 1, title: 'Pontiff 教主',
  role: 'governs the whole; the session itself',    // ← 既存。消さない
  model: 'fable', effort: 'xhigh', why: '…',        // ← 既存。消さない
  // 神託の訂正が定めた三段。**配列である** — 順序そのものが法だからである。
  tiers: [
    { n: 1, ja: '委譲', what: '担える役者に為させる', when: '既定' },
    { n: 2, ja: '編成', what: 'オーケストレーションを組む', when: '複雑かつ長大なとき' },
    { n: 3, ja: '教主の手', what: '教主が自ら行う', when: '単純かつ文脈の小さいときに限る。例外' },
  ],
  // 神託が数えた5役割 (AC-G4)
  duties: {
    manage:      '神と作業者の間に立ち、進行を管理する',
    dispatch:    '発令書を書き、指示を出す',
    reconcile:   '結果を実物とコマンド出力で確認する',
    orchestrate: '必要なら新しいオーケストレーションを組む',
    ordain:      'Agent 定義を鍛造し、サブエージェントを使う',
    commune:     '神と会話する',
  },
}
```

**AC-G3 の試験 `第52条: 教主の職務は一文の文字列ではなく三段の序列である` は `tiers` が配列であり `tiers[2].n === 3` であることを assert する。**
`duties` を object にしたのは、AC-G4 が「鍵が現れる」ことしか要求しないためである。順序が法であるのは `tiers` だけなので、そこだけを配列にする。

> **第41条(名の出所は一つ)への配慮**: `clergy.js lexicon-check` は `.md/.js/.json/.yml` を走査して異名を裁く(`clergy.js:597-619` を本相で実読)。`tiers[].ja` に入れる語 —— **委譲 / 編成 / 教主の手** —— は新しい語彙である。`LEXICON` に登録するか、`lexiconCheck` の対象語彙と衝突しないことを build 相が確認せねばならない(§10 の嘘リストに再掲)。

### 2.4 紀元(epoch)の印 — 既存94相を遡及させない

**印を刻む場所**: `conclave.convene()` が作る run オブジェクトの最上位に `epoch: { tier: 'v1', at: <iso> }` を置く。

```js
// graph/conclave.js convene() の return に1行足すだけ
return {
  meta: dag.meta || {}, created: now(),
  epoch: { tier: TIER_EPOCH, at: now() },   // ← 追加
  domains, history: [...],
};
```

| 印 | 意味 | 序列の門 |
|---|---|---|
| `epoch.tier` が在る | 序列を宣言する経路が機構に在った時代の走行 | **効く** |
| `epoch.tier` が無い | legacy(既存8走行94相 + 本走行) | **効かない。`unobservable`(🟡)** |

**なぜ run の最上位で、`meta` の中ではないか**: `meta` は `forge` が作る DAG から丸ごと転記される(`conclave.js:76` `meta: dag.meta || {}` を実読)。
**`meta` に置けば、古い DAG を読み直して convene し直した run が印を持たない**という抜け穴が開く。印は「この run を作った engine が新しかったか」の証であり、**DAG の性質ではなく run の出自**である。ゆえに convene が自分の手で刻む。

**騙りへの備え**: 印を手で消せば legacy を騙れる。だが `conclave.json` は版管理下に在り(実測: `reform/pontiff-office/conclave.json` は git 追跡下)、`epoch` の削除は diff に現れる。**機構は騙りを防げないが、騙りを見えなくすることはできない** — requirements §3.3 が採った (c) の前提そのものである。

**本走行への効果**(AC-A13): `reform/pontiff-office/conclave.json` は本相で実読したところ鍵が `[meta, created, domains, history]` であり **`epoch` を持たない**。ゆえに legacy として `unobservable` を名乗り、`done` は exit 0 を返し、環は回り続ける。**この設計文書を書いている相自身が移行対象である。**

### 2.5 実測 — `dispatch` から `done` までの窓をどう切るか

requirements §2.6 は「窓 = `dispatch` 時刻から `done` 時刻まで」「コミット済みと未コミットの両方」とだけ定め、測り方を design に委ねた。

**窓の両端**:
- `t0` = `phase.dispatchedAt`(`conclave.js:210` `markRunning` が刻む。本相で実読・本走行の相で実在を確認)。無ければ `history` の当該 `dispatch` イベントの `ts` に落ちる。**両方無ければ測定不能** — 測れなかったものを「閾値内」と報告しない(第16条)。
- `t1` = `markDone` が呼ばれた瞬間(`now()`)。

**測る三量**:

| 量 | 取り方 | 註 |
|---|---|---|
| **files / churn(コミット済み)** | `git log --no-merges --since=<t0> --until=<t1> --numstat --format=C\|%h` を集計 | requirements §2.4 が閾値を導いたのと**同じコマンド**である。閾値と実測が同じ器で出ることが要点 |
| **files / churn(未コミット)** | `git diff --numstat HEAD` + `git status --porcelain` の未追跡ファイル | 時刻で切れない。**現在の相に帰属させる**(下記) |
| **bytes** | `fs.statSync(artifact).size`。ディレクトリなら `contract.dirSize` と同じ数え方 | T3-c |

**未コミット差分を現在の相に帰属させる根拠と、その正直な限界**:
未コミットの変更に時刻は無い。だが**教主が手で書いた成果物は、`done` の時点でほぼ必ず未コミットである**(findings §2.4: 委譲の証跡を持つコミットは 113件中 0件であり、相ごとのコミットという習慣が存在しない)。
未コミット分を捨てれば、**序列3の門は教主の手仕事をほぼ全て見逃す** — 門の目的そのものを失う。ゆえに帰属させる。
**限界**: 前の相の未コミット残骸が次の相に加算されうる。これは**過大評価の方向にしか働かない**(赤は出るが緑は出ない)、すなわち fail-safe である。第16条は「判定不能を緑にするな」と言い、過大評価はそれに反しない。

**測定から除くもの**:

| 除くもの | 理由 |
|---|---|
| `**/conclave.json` | 環の台帳。`done` を刻む行為そのものが差分を生む。**統治(§2.5 G-1)を仕事と数えれば、序列を宣言する行為自体が序列違反になる**(AC-G1 が禁じる偽陽性) |
| `dashboard/atlas/**` | 生成物(第29条)。`.gitignore` 済みだが未追跡走査に現れうる |
| `node_modules/**` | 自明 |

### 2.6 判定 — §2.7 の表を実装する唯一の関数

```js
// graph/spawn-trace.js
// 返す: { ok, verdict, state, lines[], next }
//   ok=true  … 緑 or 黄
//   ok=false … 赤。lines[] が「超えた量と閾値・本来の序列・委ねるべき agent」を持つ
function judge(run, phaseId, opts = {})
```

| 申告 | 証跡 | 実測 | 門相 | 判定 | 出力の語(requirements が固定した文字列) |
|---|---|---|---|---|---|
| 印なし run | — | — | — | 🟡 | `unobservable` |
| 宣言なし | — | — | — | 🔴 | `序列が宣言されていない` |
| 1 / 2 | observed | — | — | 🟢 | — |
| 1 / 2 | asserted-only | — | — | 🔴 | `自己申告` / `asserted-only` |
| 1 / 2 | no-trace | — | — | 🔴 | `起動の証跡` / `第27条` |
| 3 | observed | — | — | 🔴 | `申告と実測が食い違う` |
| 3 | — | — | **gate** | 🔴 | `門相は序列3を名乗れない` / `第9条` |
| 3 | no-trace | 全て閾値内 | 否 | 🟢 | `序列3` + `files=n/2 churn=n/50 bytes=n/4096` |
| 3 | no-trace | 超過 | 否 | 🔴 | 超過量+閾値 / 本来の序列 / 委ねるべき agent 名 |

**判定の順序**(先に立つものが勝つ):
1. 印が無ければ `unobservable`。**それ以上何も測らない**(legacy に git を走らせるのは無駄であり、遅い門は撃たれなくなる — 第34条)
2. 宣言が無ければ赤
3. 序列3 かつ `gate:true` → 赤(**量を測る前に**。T3-d は量と無関係だから)
4. 序列3 かつ `observed` → 赤(申告矛盾)
5. 序列1/2 → 証跡の三値で裁く
6. 序列3 → 実測して閾値と突合

**赤のときに門が言う3つ**(AC-A6 / 第34条「鳴るだけで直せない門は罠である」):
1. 超えた項目の**実測値と上限値の両方** — 例 `files=7 > 2` `churn=1420 > 50`
2. **本来の序列名** — 実測が `TIERS.t2` をも超えていれば `序列2`、そうでなければ `序列1`
3. **委ねるべきだった agent 名** — `phase.agent`。findings §2.4 で `conclave.json` の相が `agent` を持つことを実測済み

### 2.7 統治が偽陽性を出さないこと (AC-G1)

requirements §2.5 の G-1〜G-9 が鳴らない理由は**構造的**である:

> 序列の門は `markDone` の中にしか立たない。`status` / `next` / `contract check`(`--run` 無し)/ `census check` / `check-agents` は **`markDone` を通らない**。ゆえに序列の判定関数が一度も呼ばれない。

これは「統治行為を白名簿に載せる」設計ではない。**白名簿は必ず漏れる**(第21条: 名を語る口を数え落とす)。
そうではなく、**門を仕掛ける場所を一箇所に絞る**ことで、それ以外は定義上鳴らない。AC-G1 の試験は「実装前後で exit code が変化しない」ことを5コマンドで確かめる。

---

## 3. A — 門の設計

### 3.1 `conclave.js done` のコマンド面

```
node graph/conclave.js done <phaseId> --run <run.json> --artifact <path> [--tier <1|2|3>]
```

| 条件 | exit | 出力先 | 含む語 | run ファイル |
|---|---:|---|---|---|
| 印なし run(legacy) | **0** | stdout | `unobservable` | 書き換わる(`status=done`, `tierTrace[id].state='unobservable'`) |
| 印あり・`--tier` 無し | **1** | stderr | `序列が宣言されていない` | **書き換わらない** |
| 印あり・tier1/2・`no-trace` | **1** | stderr | `起動の証跡` `第27条` | **書き換わらない** |
| 印あり・tier1/2・`asserted-only` | **1** | stderr | `自己申告` `asserted-only` | **書き換わらない** |
| 印あり・tier1/2・`observed` | **0** | stdout | statusBoard | 書き換わる |
| 印あり・tier3・gate相 | **1** | stderr | `門相は序列3を名乗れない` `第9条` | **書き換わらない** |
| 印あり・tier3・`observed` | **1** | stderr | `申告と実測が食い違う` | **書き換わらない** |
| 印あり・tier3・閾値内 | **0** | stdout | `序列3` `files=n/2 churn=n/50 bytes=n/4096` | 書き換わる |
| 印あり・tier3・超過 | **1** | stderr | 超過量+閾値 / `序列1`or`序列2` / agent名 | **書き換わらない** |

**「run ファイルが書き換わらない」をどう保証するか**(AC-A1 / A6 が明示的に要求):

現在の CLI は `markDone(...)` → `save(rp, run)` の順で無条件に保存する(`conclave.js:393` を実読)。
`markDone` が **throw** すれば `save` に到達しない — **既存の実在検査(`conclave.js:289-295`)が既にこの形である**。
ゆえに序列の門も **例外を投げる**形で実装する。CLI 側は `try { markDone(...) } catch (e) { console.error(e.message); process.exit(1); }` で受ける。

> **この形を選んだ理由**: `markDone` を「戻り値で可否を返す」形に変えると、**`markDone` を直に呼ぶ既存8本の試験がすべて意味を変える**(§10)。throw なら、印を持たない合成 run に対しては従来通り何も起きず、既存試験は一行も直さずに緑のままである。

### 3.2 `markDone` の signature — 既存8本を壊さない形

```js
function markDone(run, id, artifactPath, opts = {})   // opts.tier / opts.now / opts.cwd
```

第4引数を **省略可能な options** にする。既存の呼び出し `markDone(run, 'discover', 'tests/paradise.test.js')` は第4引数が `undefined` → `opts={}` → `tier` 未申告。
だが **`run.epoch` を持たない合成 run では序列の門が一切立たない**ので、`tier` 未申告でも従来通り通る。

> **これが設計の要である。** 序列の門は「印を持つ run」にしか効かない。既存試験が作る run は `convene()` を通していない手書きオブジェクトか、旧 `convene` の出力であり、どちらも印を持たない。**8本の試験は一行も直さずに緑のままである**(§10 で1本ずつ確認)。

### 3.3 `spawn-trace.js` の新しいコマンド面

| コマンド | exit 0 | exit 1 | exit 2 |
|---|---|---|---|
| `spawn-trace.js tiers --json` | 常に。7閾値を JSON で | — | — |
| `spawn-trace.js tier <run.json>` | 全相が 🟢/🟡。stdout に `序列1: n / 序列2: n / 序列3: n / unobservable: n` | 1件でも 🔴。stdout に 相id・申告序列・実測値・閾値 | 引数不足 |
| `spawn-trace.js audit` | 印つき run に 🔴 が無い。stdout に `unobservable: <n>` と黄を抱える run の一覧 | 🔴 が在る(run の path と相 id を出す)**または走査対象が 0件** | — |
| `spawn-trace.js report <run.json>` | 変更なし(既存の三値判定を維持) | 変更なし | — |
| `spawn-trace.js verify <run> <phase>` | 変更なし | **legacy run でも exit 1**(AC-A10 後段: 黄は緑ではない) | — |
| `spawn-trace.js record …` | 変更なし | — | — |

**`report` の出力に五値を出す (AC-A12)**:
```
phases: 11   observed: 0   asserted-only: 0   no-trace: 11   序列3: 0   unobservable: 0
```
**返り値のオブジェクトは既存4鍵(`total`/`observed`/`assertedOnly`/`noTrace`)を保ったまま `tier3`/`unobservable` を足す。**
`tests/dashboard-run-panel.test.js` が `report()` の形に依存している(本相で `:102,:146,:173,:182` を実読)。**鍵を消さず足すだけなら、あの試験は緑のままである**(§10)。

**`audit` の走査範囲**: リポジトリ配下 + 兄弟倉。住所を知るのは `workspace.js` だけである(第30条)ので、`audit` は `workspace.resolve().root` を引く — `gauge.baseline()` が既に同じ引き方をしている(`gauge.js:166` 実読)。**新しい住所の知り方を発明しない。**

**走査 0件で exit 1 の理由**(AC-A11): 見なかった門は緑ではない(第16条)。CI で `workspace` が解決できず 0件を走査して緑を返せば、**この門は永久に何も見ないまま緑を出し続ける** — findings §2.3 が CI の spawn-trace 門について実証した病そのものである。

### 3.4 `--tier` は誰が渡すのか

`conclave.js next` が返す発令書に、**その相について既定で妥当な序列**を助言として載せる:

```jsonc
"dispatch": [{ "id": "design", "agent": "architect", "gate": true,
  "tier_hint": { "default": 1, "forbidden": [3], "why": "門相は序列3を名乗れない (第9条)" }}]
```

**助言であって強制ではない。** 教主は `--tier 3` を申告できるが、gate 相なら門が拒む。
**hint を出す理由**: 第34条。次に何をすべきかを言わない門は罠である。発令の時点で「この相は序列3を名乗れない」と分かっていれば、教主は最後に拒まれるのではなく最初に知る。

---

## 4. B — conclave が spawn-trace を呼ぶ結線

### 4.1 現況(本相で再確認)

```
$ node graph/wiring.js map | grep -E "conclave|spawn-trace|contract"
  conclave                 ←require  1  →require  2  呼ぶ面: 命令/試験/散文
  contract                 ←require  0  →require  1  呼ぶ面: 門(CI)/命令/試験
  spawn-trace              ←require  2  →require  0  呼ぶ面: 門(CI)/試験
```

`conclave.js` の require は `graph-engine.js` と `clergy.js` の2本のみ(`conclave.js:33-34` 実読)。**spawn-trace を呼んでいない。**

### 4.2 結線の変更

| engine | 変更 | 変更後の `wiring map` |
|---|---|---|
| `conclave.js` | `require('./spawn-trace.js')` を足す | `→require 3` に増え、**呼び出し先に `spawn-trace` が現れる (AC-B1)** |
| `gauge.js` | `require('./spawn-trace.js')` を足す | 序列の集計を自前で書かない(第41条) |
| `spawn-trace.js` | `require('./clergy.js')` は**足さない** | 下記 |
| `forge.js` | `require('./domains.js')` を足す | C |
| `contract.js` | 変更なし(`:74` が既に遅延 require している) | — |

> **`spawn-trace.js` が `clergy` を require しない理由**: 序列の判定に位階は要らない。要るのは「相が gate か」だけであり、それは `run` の中の `phase.gate` に既に在る(`conclave.js:64` が convene 時に DAG から転記していることを実読)。
> **必要のない辺を張れば結線図が濃くなり、`atlas` の結線図(既に最小交差 22 の平面化不能)がさらに汚れる。** 辺は要るときだけ張る。

### 4.3 循環参照の検査

`conclave → spawn-trace`、`contract → spawn-trace`、`gauge → spawn-trace`。
`spawn-trace` は誰も require しない(`→require 0` を維持)。**閉路は生まれない。**
`wiring.js` は閉路を裁かないが、`node -e "require('./graph/conclave.js')"` が回らなくなれば CI の「🧩 Engine integrity」段(`tribunal.yml:105`)が落ちる。**閉路を作らないことは設計の制約である。**

### 4.4 `contract.js check --run` (AC-B3)

```
node graph/contract.js check --run <run.json>     # stdin から結果 JSON、run から証跡
node graph/contract.js check                      # 従来通り。exit code は変化しない
```

`contract.js:73-82` の `opts.run` 経路は**既に実装済みで `file-but-unspawned` を返す**(本相で実読)。
**CLI に口が無いだけである**(findings §2.2)。`main()` の `check` 分岐で `--run` を読み、`checkPayload(d, { run })` に渡す。**器は正しい。口を開けるだけ。**

**`reconcile` の中身は変えない。** 序列の判定を `reconcile` に持ち込むと、CI の「👁 Spawn trace」段(`tribunal.yml:205-228`)が撃つ3本の assertion が意味を変える(§10)。**証跡の照合(contract)と序列の裁き(spawn-trace)は別の問いである。**

### 4.5 CI が実在の走行を見る (AC-B4)

`.github/workflows/tribunal.yml` に段を **足す**(既存の「👁 Spawn trace」段は消さない — 故障注入の門であり、健全な系しか見ない門への対抗である):

```yaml
      - name: 👁 Tier audit — 序列の門が実在の走行を見る (第42条 / 第52条)
        run: node graph/spawn-trace.js audit
```

`grep -c "conclave.json" .github/workflows/tribunal.yml` は現況 **0件**(本相で確認)。`audit` は内部で `conclave.json` を走査するが、**yml の本文に文字列 `conclave.json` が現れねば AC-B4 の合格条件(grep が1以上)を満たさない。**
ゆえに段の註釈に走査対象を明記する:

```yaml
        # 走査対象は実在する conclave.json（合成した run ではない）。
```

> **AC-A10 の移行方針との整合**: 既存8走行はすべて印を持たないので `unobservable` に落ち、`audit` は exit 0 を返す。**CI は落ちない。落ちるのは紀元以後の違反だけである。**

---

## 5. C — 役者の居ない仕事が黙って standard へ落ちない門

### 5.1 分野をどこに、どう宣言するか

**採る: 台帳 `graph/domains.json` + 判定器 `graph/domains.js`。**

| 選択肢 | 帰結 | 採否 |
|---|---|---|
| (a) `overlay/agents/*.md` の frontmatter | forge が名指しする14名のうち **`overlay/agents/` に在るのは8名だけ**(本相で実測: 不在は architect / code-reviewer / doc-updater / security-reviewer / tdd-guide の5名 + PSEUDO の verification-loop)。残り5名は vendor 由来であり、宣言を持たせるには `replace` 項目か新しい transform が要る。**`deploy.js check` の transform 一覧(現況 `agents` のみ)を触ることになり、AC-D4 の「配備の一致」が揺れる** | 不採用 |
| (b) 中央台帳 `graph/domains.json` | vendor 由来か否かに関わらず同じ形で宣言できる。`clergy.COLLEGE` が既に**神官の所属を中央で宣言している**のと同じ流儀。deploy に一切触れない | **採用** |

> **正直な弱点**: 台帳は「楽園が役者に代わって宣言する」形であり、「役者が自ら宣言する」形ではない。
> だが `clergy.COLLEGE` は既に**枢機卿の麾下・信徒・審査クラスを中央で宣言している**(`clergy.js:183-` 実読)。楽園の既存の流儀に従う方が、二つの宣言場所を作るより第41条に適う。

**`domains.json` の形**:

```jsonc
{
  "$comment": "役者が担える分野の台帳。ordain.js が書き、domains.js が読む。手編集も可。",
  "domains": {
    "software":  { "ja": "実装・ソフトウェア", "ja_re": "アプリ|ツール|タイマー|サイト|…", "en_re": "\\b(app|tool|site|api|cli)\\b" },
    "research":  { "ja": "調査・分析", "ja_re": "…", "en_re": "…" },
    "diagram":   { "ja": "作図", "…": "…" },
    "music":     { "ja": "音楽・音声", "ja_re": "音楽|作曲|BGM|音声|…", "en_re": "\\b(music|audio|song)\\b" },
    "video":     { "ja": "映像・動画", "…": "…" },
    "spreadsheet": { "ja": "表計算・帳票", "…": "…" },
    "legal":     { "ja": "法務・契約", "…": "…" },
    "translation": { "ja": "翻訳・多言語", "…": "…" },
    "image":     { "ja": "画像・写真加工", "…": "…" },
    "accounting":{ "ja": "会計・経理", "…": "…" },
    "comms":     { "ja": "通信の実行", "…": "…" },
    "infra":     { "ja": "インフラ運用", "…": "…" },
    "slides":    { "ja": "資料作成", "…": "…" },
    "hr":        { "ja": "採用・人事", "…": "…" }
  },
  "agents": {
    "architect":            ["software"],
    "market-researcher":    ["research"],
    "requirements-analyst": ["software", "research", "diagram"],
    "…":                    ["…"]
  }
}
```

**分野の語彙が forge の既存語彙と同じ流儀であること**: `forge.js` は既に `COUNSEL_JA` / `DIAGRAM_JA` / `REFORM_RE` を**日本語(境界なし)と英語(境界あり)に分けて**持つ(`forge.js:284-335` 実読。`\b` は日本語で機能しないという実測済みの教訓が註釈に残っている)。**同じ分け方を踏襲する。新しい流儀を発明しない。**

### 5.2 `forge.js` の変更 — `chooseScale` を**変えない**

```js
function chooseScale(wish) { … }        // ← 一行も変えない
function admit(wish) {                   // ← 新設
  const scale = chooseScale(wish);
  const dom = domains.classify(wish);            // → {id, ja} | null
  if (!dom) return { ok:false, code:'unknown-domain', scale };
  const agents = new Set(SCALES[scale](wish).map(t => t.agent));
  const unfit = [...agents].filter(a => !PSEUDO.has(a) && !domains.serves(a, dom.id));
  if (unfit.length) return { ok:false, code:'no-actor', scale, domain:dom, unfit };
  return { ok:true, scale, domain:dom };
}
```

> **なぜ `chooseScale` を温存するか — これは既存の門を嘘にしないための設計判断である。**
> `tests/paradise.test.js` は `forge.chooseScale(...)` を **11箇所**で直に呼び、返り値が**文字列**であることを assert している(本相で実測: `:173,174,175,1937,1940,1943,3613,3620,3621,3623,3624,3625`)。
> `chooseScale` の返り値を object に変えれば、**その11本が一斉に嘘になる。** ゆえに判定は新しい関数に足す。

**CLI の面**:

| 入力 | exit | stdout |
|---|---:|---|
| `scale "ポモドーロタイマーを作れ"`(担い手あり) | **0** | `standard` のみ(**従来と一字も変えない** — AC-C4) |
| `scale "音楽を作れ"`(担い手なし) | **1** | `担い手が居ない` / 分野名 `音楽・音声` / **鍛造器の呼び出し行** |
| `scale "<分野不明>"` | **1** | `分野を判定できない` |
| `plan "音楽を作れ" --out <path>` | **1** | 同上。**`<path>` を作らない**(AC-C3) |

**鍛造器の呼び出し行**(第34条: 次に何をすべきかを言う):
```
node graph/ordain.js forge --name <役者名> --domain music --cardinal <枢機卿> --rank priest --write
```

**AC-C3 の実装上の要点**: 現在の `plan` は `fs.mkdirSync` → `fs.writeFileSync` の順で書く(`forge.js:424-427` 実読)。
**`admit()` の判定を `mkdirSync` より前に置く。** さもなくば拒んだのにディレクトリだけ残る — 「担えない道の痕跡を残さない」という AC-C3 の趣旨(第44条: 死んだ道具を教主が先例と読む)に反する。

### 5.3 分野の門 (AC-C1 / AC-C7)

```
node graph/domains.js check       # exit 0 = 全員が宣言を持つ / exit 1 = 欠けた agent 名を列挙
node graph/domains.js classify "<願い>"   # 分野判定の単体確認
node graph/domains.js list        # 台帳の一覧
```

**AC-C7 が要求する「同じ入力に二つの門が違う答えを出す」**:

| 門 | 問い | 分野宣言を持たない役者が居るとき |
|---|---|---|
| `check-agents.js` | **実在**するか(`~/.claude/agents/*.md` が在るか) | **exit 0**(実在は満たされている) |
| `domains.js check` | **適合**を宣言しているか | **exit 1** |

**これは重複ではない。** `check-agents` は「名指しされた者が居るか」、`domains` は「居る者が何を担えるか」を問う。
findings §3.2 が名指しした穴 —— 「10名全員が実在するので門は一切鳴らない」 —— は、**実在の門をどれだけ強くしても塞がらない。**

### 5.4 AC-C5 の不変条件を15件で撃つ

試験名 `役者の居ない仕事は道に入れない (第49条)`。findings §3.1 の15願いを固定入力とし、**件数ではなく不変条件**を assert する:

> `admit(wish).ok === true` なら、`SCALES[scale](wish)` の全相の agent が(PSEUDO を除き)`domains.serves(agent, domain)` を満たす。

**現況でこの試験が fail することの確認**: 現況は15件すべてが `standard`(実測: 14件 standard + 1件 counsel)へ exit 0 で落ちる。`domains` 台帳が無ければ `serves()` は常に false を返すので、不変条件は初回から破れる。**壊れた状態で赤くなる試験である**(第21条)。

---

## 6. D — 役者を鍛造して配備する engine `graph/ordain.js`

### 6.1 工程を8から3へ

| # | 現況(findings §5.3) | 設計後 |
|---|---|---|
| 1 | `overlay/agents/<name>.md` を手で新規作成 | **ordain が書く** |
| 2 | `overlay/overlay.json` の `own.agents` に追記 | **ordain が書く** |
| 3 | `graph/clergy.js` の `COLLEGE` に追記 | **ordain が書く** |
| 4 | `graph/forge.js` の SCALES に agent 名を書く | **ordain が `domains.json` に書く**(§6.3) |
| 5 | `apply-models.js apply` | **`deploy.js --write` が transform として既に走らせる** |
| 6 | `apply-spawn.js apply` | 同上 |
| 7 | `deploy.js --write` | **教主が走らせる(2)** |
| 8 | `check-agents` / `census check` | **`ordain verify` が走らせる(3)** |

```
1. node graph/ordain.js forge --name <n> --domain <d> --cardinal <c> --rank <r> --write
2. node graph/deploy.js --write
3. node graph/ordain.js verify --name <n>
```

**手編集 0ファイル / コマンド 3本 / 合計 3工程。** AC-D1(手編集0)・AC-D3(既定 dry-run)・合格条件「3以下」を満たす。

> **`deploy.js --write` を ordain に飲み込ませない理由**(AC-D2 / 第29条 / 第35条):
> `overlay/overlay.json` の `$comment` は「手で `~/.claude` を編集してはならない — 編集は必ずここへ書く」と述べ、`deploy_target.$note` は「配備先は成果物であって原本ではない」と述べる(requirements §6.2、本相で実ファイル確認)。
> **鍛造器が配備までやれば、鍛造器は配備器になる。** 原本を書く器と実機に書く器を分けることが第29条の要求である。
> AC-D2 の試験 `鍛造器は原本に書き、配備器だけが実機に書く (第29条)` は、**forge 直後に `~/.claude/agents/<新名>.md` が存在しない**ことを assert する。

### 6.2 `ordain.js` のコマンド面

| コマンド | 動作 | exit |
|---|---|---|
| `ordain.js forge --name <n> --domain <d> --cardinal <c> --rank <r>` | **dry-run**。書く予定の一覧を stdout へ。`overlay/` を1バイトも変えない | 0 |
| `ordain.js forge … --write` | `overlay/agents/<n>.md` / `overlay/overlay.json` / `graph/clergy.js` / `graph/domains.json` に書く | 0 |
| `ordain.js forge …`(要件を欠く) | 何も書かず、欠けているものを stderr に名指し | **1** |
| `ordain.js enlist --name <既存> --domain <d> [--cardinal <c>] [--write]` | 既に `overlay/agents/` に在る孤立役者に分野を与えて配線する(AC-D7) | 0 |
| `ordain.js verify --name <n>` | AC-D4 の7門を順に撃つ | 0 / **1** |

**AC-D5(不完全な鍛造を受理しない — fail fast)** が拒む4つ:

| 欠け | 検め方 |
|---|---|
| 1. 分野宣言が無い | `--domain` 未指定、または `domains.json` の `domains` に無い id |
| 2. 位階が `apply-models` の方針に反する | `clergy.RANKS` に無い rank / `MODEL_EXCEPTIONS` と矛盾する model 指定 |
| 3. 所属枢機卿が `COLLEGE` に無い | `clergy.COLLEGE[cardinal]` が undefined |
| 4. 名が既存 agent と衝突 | `overlay/agents/` ∪ `~/.claude/agents/` ∪ `clergy.allPriests()` ∪ `allBelievers()` |

> **「後の門が鳴るのではなく、鍛造の時点で鳴ること」** が AC-D5 の合格条件である。
> 4つとも `deploy` の**前に**判る。鍛造してから `check-agents` に叱られるのは、8工程時代と同じ体験である。

### 6.3 鍛造した役者が既存の全門を通ることをどう保証するか (AC-D4)

`ordain.js verify` が7門を順に撃つ。**新しい判定を書かない — 既存の門を呼ぶだけである**(重複禁止):

| # | 門 | 通る根拠(設計上の保証) |
|---|---|---|
| 1 | `check-agents.js` | ordain が `overlay/agents/<n>.md` を書き `deploy` が配るので**実在**する。`COLLEGE` に priests として登録するので**無主にならない**。**`PHASE_LEAD` に相を登録しない限り相を持たない**ので `misroutedPhases()` に現れない(§6.4) |
| 2 | `apply-models.js verify` | ordain が書く frontmatter の `model`/`effort` を `clergy.modelFor(name, rank)` **から生成する**。方針から生成された値が方針に反することはない |
| 3 | `apply-spawn.js verify` | `needsSpawn()` は「信徒を擁する者」を返す。**新役者に believers を与えなければ対象外**。与えるなら frontmatter の `tools` に `Task`(= `clergy.SPAWN_TOOL`)を含めて生成する |
| 4 | `deploy.js check` | `overlay.json` の `own.agents` に追記するので `plan()` の steps に載り、`contentHash` が一致する |
| 5 | `wiring.js check` | `ordain.js` 自身が孤児にならないこと(§6.5) |
| 6 | `census.js check` | 散文の数を腐らせないこと(§6.6) |
| 7 | `atlas.js check` | **役者が増えれば位階図の箱が増える**。§6.7 |

### 6.4 `check-agents` の3つの検査に対する具体的保証

`check-agents.check()` は4つを見る(本相で `:203-230` 実読): `missing` / `ungoverned` / `misrouted` / `hierarchy`。

- **`missing`**: `referenceMap()` は forge の全道 + `COLLEGE.priests` + `examples/*.json` を走査する。ordain が `COLLEGE` に登録した名は**そこから名指しされる**ので、実体が無ければ赤になる。**ゆえに `deploy --write` 前に `ordain verify` を撃てば必ず赤い。** これは正しい —— `verify` は配備後に撃つ(3工程の3番目)。
- **`ungoverned`**: 相を足さない限り無関係。**ordain は相を作らない。** 新しい相が要るなら、それは道の改修であり reform の道の仕事である(第23条)。
- **`misrouted`**: `misroutedPhases()` は**道の相**について宣言と `marshalPlan` の一致を見る。相を持たない新役者は走査に現れない。
- **`hierarchy`**: `believers` を与えたときだけ `PRIEST_CANNOT_SPAWN` が立ちうる。§6.3 の #3 で塞ぐ。

### 6.5 `ordain.js` は孤児にならないか (AC-D6 / 第48条)

`wiring.js` の孤児判定は `requiredBy.length === 0 && callers.length === 0`(`wiring.js:159` 実読)。
`ordain.js` を require する engine は無い(鍛造は環の外の行為である)。**ゆえに「呼ぶ面」で救われねばならない。**

`SURFACES`(`wiring.js:39-57` 実読)が数える面のうち、`ordain` の名が確実に現れるのは:

| 面 | どこに現れるか | 誰が書くか |
|---|---|---|
| **散文** | `README.md` の engine 表(AC-D8 が要求) | docs 相 |
| **機構** | `forge.js` が「担い手が居ない」ときに出す**鍛造器の呼び出し行**(AC-C2) | build 相 |
| **試験** | `tests/paradise.test.js` の AC-D2/D4/D5 の試験 | prove 相 |

> **`forge.js` が出す呼び出し行が、そのまま結線になる。** `wiring.js` の `NAME_RES` は `graph/ordain.js` という綴りを拾う(`wiring.js:97`)。
> **第34条が要求した「次に何をすべきかを言う」ことが、第48条が要求する「呼ぶ者が居る」ことを同時に満たす。** 二つの条が同じ一行で満たされる。

**宙吊りの検査**: `forge.js` が `graph/ordain.js` を名指しするので、**engine が実在せねば `wiring check` が宙吊りで赤になる**。ゆえに build 相は `forge.js` の文言と `ordain.js` の実体を**同じ変更で**入れること(第21条(c): 新しい口を開けるときは同じ変更で門を広げる)。

### 6.6 `census` を通す (AC-D8 / 第22条)

`census.claims()`(本相で `:160-180` 実読)が突き合わせる README の数は10件。ordain が影響するのは:

| 主張 | 影響 |
|---|---|
| `paradise.test.js # (\d+)/\d+ pass` | **試験を足せば必ず変わる。README:138 の `290/290` を直す**(現況の実測値は 290) |
| `取り込んだもの（(\d+)ファイル` ほか vendor 系8件 | `overlay/vendor/` を触らないので不変 |
| `ダッシュボードの門 (\d+) 本` | `tests/dashboard-*.test.js` を足さないので不変 |

**`overlay/agents/` にファイルを足しても census の主張には現れない**(`overlayAgents` は census が測るが `claims()` に載っていない)。ゆえに鍛造そのものは census を鳴らさない。**鳴らすのは試験の増加である。**

### 6.7 `atlas` を通す (AC-D4 #7)

`irHierarchy()` は `clergy` から位階図を組む。ordain が `COLLEGE[c].priests` に名を足せば**箱が1つ増える**。
本相の実測では `hierarchy` は全5道で `screen=fits` であり、余裕がどれだけあるかは測っていない。

**ゆえに `ordain verify` は `atlas.js check` を必ず撃つ**(AC-D4 が明示的に要求している理由がこれである)。
**増やせば図が壊れるなら、それは増やせていない**(第47条)。図が溢れたときの逃げ道は §8 で確立する規律に従う —— **まず門が正しく測っているかを確かめ、本当に溢れているなら箱の中身を削る**(第48条d が既に「削るのは線でも箱でもなく、まず箱の中身」と定めている)。

### 6.8 `clergy.js` への書き込みをどう安全に行うか

`COLLEGE` は**リテラル定数**である(findings §5.3、本相で `clergy.js:183-` 実読)。動的登録の口は無い。
ordain は `priests: ['market-researcher']` のような配列リテラルに名を1つ挿入する。

**安全策**:
1. 書く前に `node -e "require('./graph/clergy.js')"` 相当の再読込で**構文が壊れていないこと**を確かめ、壊れていれば書き戻す
2. 挿入は `priests: [` の直後という**一点のみ**。整形も並べ替えもしない
3. `--write` 無しでは**差分を stdout に出すだけ**(AC-D3)

> **正直な注記**: JS のリテラルを engine が書き換えるのは脆い。より堅いのは `COLLEGE` を JSON へ外出しすることだが、**それは `clergy.js` を読む全ての門(`check-agents` / `atlas` / `conclave` / `apply-*` / `lexicon-check`)の前提を動かす**大改修であり、本PRの範囲を超える。
> 本PRは「経路が在ること」(AC-D7 の但し書きと同じ精神)を作り、台帳化は次の reform に残す。**この判断を verdict 相への申し送りとして記録する。**

---

## 7. E — 憲法 第52条

### 7.1 条文が主張すべきこと

| # | 主張 | 根拠となる AC |
|---|---|---|
| 1 | **既定は委譲である。** 担える役者が居るなら教主はその者に為させる | AC-E4 |
| 2 | **複雑かつ長大な仕事は道の形をとる。** 教主は道を組む | AC-E4 |
| 3 | **教主の手は、単純で文脈の小さい仕事に限って許される。その「単純」は教主が名乗るのではなく機構が実測して裁く** | AC-E4 / AC-E7 |
| 4 | 三段はこの順に現れ、**序列3が例外であることを述べる語**を持つ | AC-E4 |
| 5 | **強制する門を engine 名で名指しする**: `graph/conclave.js` / `graph/spawn-trace.js` / `tests/paradise.test.js` | AC-E3 |
| 6 | 適用範囲は**道に限定されない**(道名を書かない) | AC-E6 |
| 7 | **閾値の数(2 / 50 / 4096 / 10 / 880)を書かない。** 幾らかは `spawn-trace.js tiers` が語る | AC-E7 |
| 8 | **「教主は作業してはならない」という絶対禁止の表現を含めない** | AC-E4 |

### 7.2 条文が踏んではならない地雷(build 相への申し送り)

| # | 地雷 | 理由(実測) |
|---|---|---|
| **1** | **`quick`/`standard`/`full`/`reform`/`counsel`/`cartography` の語を書かない** | AC-E6。第23条の失敗(是正が reform 1本の追加に留まった)を繰り返さない |
| **2** | **`2` `50` `4096` `10` `880` を書かない** | AC-E7 |
| **3** | ⚠️ **しかし「第50条」「第10条」への参照は `50` `10` を含む。** 単純な数値 grep で AC-E7 を試験すれば**条番号の参照に誤爆する** | 本相の指摘。試験は「第N条」の形を除いた上で数を探さねばならない。**さもなくば門が正しい条文を偽って断罪する(第42条)** |
| **4** | 位階の名は正典に従う(教主 / 枢機卿 / 神官 / 信徒 / 執行官) | `clergy.js lexicon-check` が `.md` を走査し異名を行番号で名指しする(`:597-619` 実読)。**`/reform/` は skip されるが `CONSTITUTION.md` は skip されない** |
| **5** | 「委譲 / 編成 / 教主の手」という**新語**を導入する | この3語が `LEXICON` の既存語と衝突しないことを build 相が `lexicon-check` で確かめること |

### 7.3 条を足すと連動して動くもの

| 対象 | 何が起きるか | 誰が直すか |
|---|---|---|
| `CONSTITUTION.INDEX.md` | **生成物**(第29条)。`node graph/codex.js index --write` で建て直す | build |
| `codex.js check` | 索引と本文の一致。上を忘れれば赤 | — |
| CI「📜 Constitution」段 | `count >= 12` を見るだけ(`tribunal.yml:37` 実読)。52条で当然通る | — |
| `census.js check` | 条数は `claims()` に**載っていない**(本相で実読)。ゆえに直接は鳴らない。**鳴るのは試験数(README:138)である** | docs |
| `CLAUDE.md` | `dietChecks` の `VOLATILE_NUMBER_RES` が `憲法[:：]?\s*\*?\*?\d+\s*条` を禁じる(`census.js:210` 実読)。**CLAUDE.md に「憲法52条」と書けば即座に赤** | 誰も書かない |

### 7.4 AC-E5 の試験

`tests/paradise.test.js` に名前が `第52条` を含む試験が1件以上あり、すべて passed。
本設計では **3件**になる:
- `第52条: 環を回すことは仕事ではない — 統治は序列の外にある` (AC-G1)
- `第52条: 教主の職務は一文の文字列ではなく三段の序列である` (AC-G3/G4)
- `第52条: 条は閾値を写経せず、門を名指しする` (AC-E3/E4/E6/E7)

---

## 8. F — 既存の赤1件(atlas)は**図の欠陥ではなく門の欠陥である**

### 8.1 (a) `check()` の第一画面判定の出所を実読した

`atlas.js:1313-1316`:
```js
const fs2 = opts.skipBrowser ? { ok: true } : firstScreen(r.html);
const scrollOk = fs2.ok || (SUBJECTS[subject].scroll === true && !fs2.unreadable);
```

`firstScreen()`(`atlas.js:1200-1227`)は**自前で幾何を計算していない**。`archify visual-check --json` を子として走らせ、その診断を読む。**出所は描画器である。** ここまでは正しい。

**だが `catch` 節の畳み方が誤っている**(`atlas.js:1206-1226`):
```js
} catch (e) {
  let r = null; try { r = JSON.parse(String(e.stdout)); } catch {}
  const ds = (r && r.diagnostics) || [];
  const over      = ds.filter(d => d.code === 'viewer/viewport-overflow');
  const unreadable= ds.filter(d => d.code === 'viewer/projected-text-readability');
  return { ok:false, overflow:worst, unreadable:…, reason:
      unreadable.length ? `…字が読めない…`
    : over.length       ? `第一画面に収まらない (最大 ${worst}px)`
    : (r && r.status) || String(e.message).slice(0,200) };   // ← ここ
}
```

**`visual-check` が非ゼロで終われば、診断の中身が何であろうと `ok:false` になる。**
溢れでも可読性でもない失敗(= Chrome の実行時故障)のとき、`reason` は最後の分岐に落ちて **`r.status` すなわち文字列 `"fail"`** になる。
そして `check()` はその `reason` に**溢れの文言を接ぎ木する**(`atlas.js:1327`):

```js
...(!scrollOk ? { error: `${fs2.reason} — 図は第一画面に収まってこそ図である。巻物でよいなら SUBJECTS に scroll:true と宣言せよ (第47条c)` } : {}),
```

→ 出力は **`fail — 図は第一画面に収まってこそ図である。…`**

**findings §1.1 が記録した赤は、まさにこの形をしている**:
```
'standard/conclave: fail — 図は第一画面に収まってこそ図である。…(第47条c)'
```
**先頭語は `fail` であって画素数ではない。** 本当に溢れていれば `第一画面に収まらない (最大 3312px)` の形で出る —— 本相の実測でも `dag` は `scroll(3312px)` と画素で報告されている。

> **結論(断定)**: **あの赤は溢れではない。`visual-check` の実行時故障が、溢れとして誤って報告されたものである。**

### 8.2 (b) 再現条件を実測で確定させた

| # | 実測 | 結果 |
|---|---|---|
| 1 | `node tests/paradise.test.js` を完走 | **`290 passed, 0 failed`** — 赤は**再現しない** |
| 2 | 試験と同一の outdir(`os.tmpdir()/paradise-test-atlas`)で `atlas.check` を quick/standard/full/reform/counsel の**5道×6主題=30行**回す | **30行すべて OK。** `standard/conclave` `standard/dispatch` とも `screen=fits` |
| 3 | `atlas.draw('conclave',{scale:'standard'})` → `archify visual-check --json` を直に撃つ | **exit=0 status=pass 診断ゼロ** |
| 4 | 同上 `dispatch` | **exit=0 status=pass 診断ゼロ** |
| 5 | 溢れ診断も可読性診断も無い receipt を `firstScreen` の分岐に通す再現 | `reason` が `"fail"` になり、出力が findings §1.1 と**一字一句一致** |

**ゆえに再現条件は「同じ outdir の残骸」でも「道ごとの outdir 共有」でもない。**
`check()` は `outdir !== OUTDIR` のとき冒頭で `fs.rmSync(outdir,{recursive:true,force:true})` する(`atlas.js:1299` 実読)ので、残骸は毎回消える。実測 #2 がそれを裏づけた。

**残る原因は描画器の実行時故障である。** `visual-check.mjs` は主題ごとに **Chrome を新しく起動し**(`:321` `fs.mkdtempSync(...'archify-visual-check-profile-')`)、**CDP を 15,000ms の制限つきで叩く**(`:209,:229`)。
`atlas.check` は6主題 × 5道 = **30回 Chrome を起動する**。自己診断全体は約200〜300秒走り、その間 census も同じ試験を子として起動しうる。**負荷の高い瞬間に CDP が 15 秒で返らなければ、`viewer/visual-check-runtime` が出て exit 1 になる**(`visual-check.mjs:833-852` 実読)。

**これは既存試験 `atlas: 門は己の残骸で落ちない — 同じ作業場で二度走る (第21条)`(tests:3451)が捕らえた病の、別の口からの再発である。**
あのときは**ファイルの残骸**が門を落とした。今度は**時間の不足**が門を落とす。どちらも「図は何も壊れていないのに門が落ちる」——**門が己の事情で落ちるなら、それは門ではなく罠である。**

### 8.3 (c) 直し方 —— **図は直さない。門を直す。** `scroll:true` は宣言しない

| 選択肢 | 採否 | 根拠 |
|---|---|---|
| `SUBJECTS.conclave/dispatch` に `scroll:true` を宣言する | **不採用** | **図は溢れていない**(実測 #2 #3 #4 で `fits` / `pass`)。溢れていない図に巻物を宣言するのは、`atlas` 自身が別の場所で禁じた「**測らずに格下げすれば、それは緑を買収したのと同じである**」(`atlas.js:1307` の註釈)そのものである。**緑は買える。だが買った緑は嘘である** |
| 図を分割・圧縮する | **不採用** | 直すべき欠陥が図に無い。**存在しない欠陥を直せば、次に本当に溢れたとき余裕が残っていない** |
| **`firstScreen()` が診断コードで分類し、測定不能を溢れと呼ばない** | **採用** | 第16条(証拠は名でなく為すことで裁く)・第42条(物そのものを見ない門は嘘をつく)・第34条(走れない門は落ちる門より悪い) |

**設計**:

```js
// firstScreen() の返り値に kind を持たせる。呼び手が意味を取り違えられなくする。
//   kind: 'fits' | 'overflow' | 'unreadable' | 'skipped' | 'inconclusive'
```

| 診断 / 終了状態 | `kind` | `scroll:true` で免除 | `check()` の行 | 行の合否 |
|---|---|---|---|---|
| exit 0 | `fits` | — | `fits` | 🟢 |
| `viewer/viewport-overflow` | `overflow` | **される** | `OVERFLOW` / `scroll(Npx)` | 宣言次第 |
| `viewer/projected-text-readability` | `unreadable` | **されない**(第48条e) | `字 N.Npx` | 🔴 |
| `viewer/chrome-unavailable`(exit 2) | `skipped` | — | `skipped` | 🟢(harness 不在) |
| `viewer/visual-check-runtime` / JSON 不可解 / 診断ゼロの非ゼロ終了 | **`inconclusive`** | **されない** | **`測定不能`** | 🔴(再試行後) |

**要点3つ**:

1. **`inconclusive` を `overflow` と呼ばない。** 溢れの文言(`図は第一画面に収まってこそ図である。巻物でよいなら…`)は `kind === 'overflow'` のときだけ出す。
   **これが本件の核心である。** 誤った文言は誤った直し方(`scroll:true` の宣言)を教主に指示する —— 門が嘘をつくだけでなく、**嘘の直し方まで教える**。第34条が言う「罠」の最も悪い形である。
2. **`inconclusive` は一度だけ再試行する。** 間欠故障を一発で赤にすれば、CI は不定に落ち、やがて誰も見なくなる(第34条)。再試行しても駄目なら赤にする —— **判定不能は緑ではない(第16条)。**
3. **`skipped` は緑。** Chrome が無い環境(CI)で「図が溢れた」と言えば、それは `check-agents` / `deploy check` が既に採っている「harness 不在なら検めるものが無い」の流儀に反する。**存在しないものを責めない。**

**AC-F1 との整合**: `atlas.js check` の stdout は、図が収まるとき `fits` を出し `OVERFLOW` を含まない。測定不能のときも `OVERFLOW` ではなく `測定不能` を出す。**`OVERFLOW` は本当に溢れたときにだけ現れる語になる。**

**AC-F2 との整合**: 本相の実測で自己診断は既に `290 passed, 0 failed`。本PRは試験を足すので passed は 290 を超える。**`289 以上`(AC-F2)を満たす。**
**そして README:138 の `290/290 pass` を新しい数に直さねば `census check` が鳴る**(§0.1 G-1)。

**AC-F3 との整合**: AC-F3 は `scroll:true` による直し方**も**認めるが、**どちらの直し方でも合格条件は AC-F1 / AC-F2 である**と述べている。本設計は宣言せずに両方を満たす。

### 8.4 (d) prove 相への申し送り —— この門をわざと壊して鳴るか試す

**健全な系で緑になるだけの門は、証明されていない**(第21条)。次の3本を要求する:

| # | 注入する故障 | 期待される鳴り方 |
|---|---|---|
| **1** | **本当に溢れる図**を仕込む(例: `SUBJECTS` に一時的な主題を足し、箱を大量に並べた IR を描かせる。あるいは既存の `dag` から `scroll:true` を外す) | `kind='overflow'`。行に `OVERFLOW`、error に **溢れの文言と画素数**。`scroll:true` を宣言すると緑になること |
| **2** | **実行時故障**を注入する(`firstScreen` に渡す receipt を差し替える、または `ARCHIFY_CHROME` を不正な実行ファイルに向ける) | `kind='inconclusive'`。行に **`測定不能`**、error に **描画器の実際の理由**。**溢れの文言が現れないこと** ← 本件の回帰そのもの |
| **3** | **読めない字**を注入する(`scroll:true` の主題で字を潰す) | `kind='unreadable'`。**`scroll:true` が在っても赤**(第48条e。既存試験 tests:3474 の趣旨を kind 分類の後も維持する) |

**#2 が本PRの回帰テストの本体である。** 試験名の案: `atlas: 測定できなかったことを「溢れた」と呼ばない (第16条 / 第42条)`。

> **正直な注記**: 本相は「赤が出る瞬間」を捕まえていない。捕まえたのは (1) 赤が再現しないこと、(2) 記録された赤の文言が `firstScreen` の実行時故障分岐と**一字一句一致**すること、(3) 描画器がその分岐を出す条件(CDP 15秒制限)が実在すること、の3つである。
> **「Chrome が実際に何秒で落ちたか」は測っていない。** ゆえに #2 の故障注入は、実際の CDP タイムアウトを再現するのではなく、**その receipt を模して `firstScreen` の分類を撃つ**形になる。分類の正しさは証明でき、Chrome の挙動そのものは証明していない —— この区別を prove 相は保つこと。

---

## 9. H — 秤が教主の工数を測る

### 9.1 `gauge.score()` に足す鍵(AC-H1 / AC-H2)

```jsonc
{
  "score": 100, "complete": true, "phasesTotal": 11, "phasesDone": 11,
  "firstPassRate": 1, "reworkCount": 0, "retryOverhead": 0,
  "loopGuardTrips": 0, "durationMs": 6706706,
  // ↓ ここから足す
  "tier1": 0, "tier2": 0, "tier3": 0,
  "noTier": 0,            // 序列の宣言が無い相 (印つき run でのみ立つ)
  "unobservable": 11,     // ← tier1 とは別の鍵 (AC-H1 が明示的に要求)
  "tier3Ratio": 0         // 序列3の相 / 走行全体 (AC-H2)
}
```

**既存9鍵は名も値も一切変えない。** `tests/paradise.test.js` は `gauge.score()` を **16箇所**で呼び、`score`/`reworkCount`/`retryOverhead`/`loopGuardTrips`/`complete`/`firstPassRate` を assert する(本相で `:2735-2864` を実測)。**足すだけなら1本も嘘にならない。**

**集計は `spawn-trace.report()` から取る。** gauge が自分で `tierTrace` を数え直せば、五値の定義が二箇所に住む(第41条違反)。`gauge.js` は `require('./spawn-trace.js')` する。

### 9.2 台帳の連続性を壊さない (AC-H3)

```js
const raw = 100 - WEIGHTS.rework*reworkCount - … 
          - (run.epoch ? WEIGHTS.tierBreach * (noTier + tier12WithoutTrace) : 0);
```

**`run.epoch` を持たない run には序列の項が一切掛からない。**

| run | score |
|---|---|
| `reform/conclave-resume/conclave.json`(legacy) | **100 のまま**(AC-H3。`tests:2790` が実ファイルの `coin`/`habit` を採点しているので、ここが動けば試験が落ちる) |
| 印つき・宣言なしの相が在る | **100 未満**(AC-H4-1) |
| 印つき・序列3で閾値内 | **100 であり得る**(AC-H4-2。**神託の訂正が許した例外を秤が罰してはならない**) |

**AC-H4 を分ける試験**が `tests/paradise.test.js` に要る。名の案: `第52条: 秤は序列3を罰しない — 訂正が許した例外を減点しない`。

### 9.3 前後比較 (AC-H5)

`gauge.js compare --last <N>` は既に実装済み(`gauge.js:252-257` 実読)で `renderLedger` を出す。
`COMPARE_KEYS`(`:187`)に `tier3Ratio` を足す。`HIGHER_BETTER.tier3Ratio = false`(**教主の手の割合は下がるほど良い**)。

> **これが無ければ、次の reform が「教主の工数が減った」を数で語れない**(第38条)。神託が述べた「工数が圧倒的に多い」は、**この数が下がることでしか反証できない。**

### 9.4 `renderLedger` は変えない

`gauge record` が刻む `metrics` は `score()` の返り値そのものなので、新しい鍵は自動的に台帳へ入る。表示は変えない —— **台帳の行の形を変えれば、過去の行と新しい行が別の形になる。**

---

## 10. **この変更で嘘になる既存の門**(reform の道の掟)

依存関係を変えたので、古い前提を符号化した門を全部読み直した。

### 10.1 `conclave.markDone` を前提にする試験 — **8本 / 22箇所**(実測)

```
$ grep -n "markDone" tests/*.js | wc -l         → 22
$ (試験名ごとに集計)                            → 8本
```

| # | 試験名 | 行 | 嘘になるか | 根拠 |
|---|---|---|---|---|
| 1 | `conclave: 成果物を名乗るなら実在せねばならない — 台帳は虚偽の done を記せない (第22条/第27条)` | 579,588,593 | **ならない** | 手書き run(印なし)。序列の門が立たない。**`:593` は `markDone(run2, id)` と artifact 無しで呼ぶ** — 第4引数を options にしたので影響なし |
| 2 | `conclave advances to ratify when a domain…` | 609 | **ならない** | 同上 |
| 3 | `ratify advances the conclave to the next cardinal` | 618 | **ならない** | 同上 |
| 4 | `domain-level reject triggers an INNER rework (the small circle)` | 629,631 | **ならない** | 同上 |
| 5 | `a review class can send work back ACROSS domains (the great circle)` | 645,649 | **ならない** | 同上 |
| 6 | `cross-domain rework also resets DOWNSTREAM phases in later domains` | 672,676 | **ならない** | 同上 |
| 7 | `conclave: 中断→復帰→complete まで環が回りきる (第51条a)` | 727 | **要注意** | `convene()` を通す可能性がある。**通していれば印を持ち、序列の門が立って落ちる** |
| 8 | `cartography: 環が最後まで回り、作図の結びに着く (第11条)` | 3705 | **要注意** | 同上。`conclaveMod.markDone(run, id, art)` を全相に対して回す |

**#7 / #8 への処置**(build 相への拘束):
どちらも `convene()` の出力を使うなら **印を持つ** → 序列の宣言が無い `markDone` は throw する → **その2本が落ちる。**
処置は次のいずれかであり、**設計として (A) を指定する**:

- **(A) 採用**: 試験が `markDone(run, id, art, { tier: 1 })` を渡し、かつ `spawn-trace.record(run, id, {toolUseId:'toolu_test'})` を先に呼ぶ。
  **理由**: この2本は「環が回りきる」ことを証明する試験である。**序列の機構を入れた後の楽園では、環が回るとは序列を宣言して回ることである。** 試験を機構に合わせるのが正しい。**しかも記録の追加は2行で済む。**
- (B) 不採用: 試験の run から `epoch` を削って legacy を騙らせる。**騙りを試験が教えることになる。**

> **これが本PRで「嘘になる」既存の門の全てである。** 残り6本は印を持たないので一行も直らない。
> **`markDone` を「戻り値で可否を返す」形に変えていれば、8本すべてが直しの対象になっていた。** throw を選んだ理由がこれである(§3.1)。

### 10.2 `spawn-trace` の形を前提にする門

| 門 | 前提 | 嘘になるか | 処置 |
|---|---|---|---|
| `tests/dashboard-run-panel.test.js`(`:102,:146,:173,:182`) | `report()` が `{ok,total,observed,assertedOnly,noTrace}` を返す。**パス文字列を渡すと `{ok:true,total:0}` を返す**(故障注入の罠 T-6) | **ならない(条件つき)** | **既存5鍵を消さず、`tier3`/`unobservable` を足すだけ**。**パス渡しの挙動を変えない** —— 変えれば `:146,:182` の故障注入が意味を失う |
| `graph/pulse.js:48` | `spawn-trace` を表示用に呼ぶ | **要確認** | 断面 JSON に新しい鍵が増える。`tests/dashboard-count.test.js` が「断面の数 == その場で数えた数」を裁く。**build 相は pulse の断面と dashboard の門を読み直すこと** |
| CI「👁 Spawn trace」段(`tribunal.yml:205-228`) | `contract.reconcile({...},{run})` が三値で `accepted` を返す。合成 run は `{domains:[{phases:[{id:'p'}]}]}` | **ならない** | **`reconcile` を変えない**(§4.4)。合成 run は印を持たないので序列の門も立たない |
| `tests/paradise.test.js` の verify/record 系 | 三値判定 | **ならない** | `verify()` の三値を変えない。第四値 `unobservable` は `tierTrace` 側の状態であり、`verify()` の返り値には入れない |

> **設計上の拘束**: **`spawn-trace.verify()` の返り値に `unobservable` を混ぜてはならない。**
> AC-A10 後段が「legacy run への `verify` は exit 1」と要求している —— **黄は緑ではない。** `verify` が `unobservable` を返して `ok:true` にすれば、この AC が破れる。
> 四値は `tierTrace[phase].state` に住み、三値は `verify()` に住む。**別の問いには別の器**。

### 10.3 `forge.chooseScale` を前提にする試験 — **11箇所**(実測)

`:173,174,175,1937,1940,1943,3613,3620,3621,3623,3624,3625` が `chooseScale(...)` の返り値が**文字列**であることを assert する。
**`chooseScale` を一行も変えない**設計(§5.2)なので、**11箇所すべて嘘にならない。**

⚠️ **ただし `:1943` `forge.chooseScale('ポモドーロタイマーが欲しい') === 'standard'` と、AC-C4 の `forge.js scale "ポモドーロタイマーを作れ"` が exit 0 で `standard` を出すことは、別の主張である。**
前者は道の選定、後者は**道の選定 + 分野の適合**。後者が通るためには `software` 分野を `standard` の10名(の非PSEUDO 9名)全員が担うと宣言せねばならない。**`domains.json` の初期値でこれを満たすことが AC-C4 の前提である。**

### 10.4 `conclave.convene()` の出力の形を前提にするもの

| 対象 | 前提 | 嘘になるか |
|---|---|---|
| `gauge.normalize()`(`gauge.js:49-68`) | `run.domains[].phases[]` | **ならない**。`epoch` は最上位に足すだけ |
| `conclave.js status --json`(`:410-425`) | 出力の鍵 | **ならない**。`epoch` を出力に足さない限り。**足さない**(AC-A13 は exit 0 と `discover` が done のままであることしか要求しない) |
| `atlas.irConclave`(`:157-`) | `forge.buildDag` から組む。run を読まない | **ならない** |
| `reform/*/conclave.json` 3件 + 兄弟倉5件 | `epoch` を持たない | **ならない**。legacy として黄 |

### 10.5 散文の数

| 主張 | 現況 | 嘘になるか |
|---|---|---|
| `README.md:138` `# 290/290 pass` | 本相の実測と一致 | **必ず嘘になる。** 試験を足すので直す(docs 相) |
| `CONSTITUTION.INDEX.md` 「全 51 条」 | 生成物 | **必ず嘘になる。** `codex.js index --write` で建て直す |
| `CLAUDE.md` | 数を持たない(第39条で撤去済み) | **ならない** |
| README の engine 表 | `ordain.js` / `domains.js` の行が無い | **不足になる**(AC-D8)。足す |

### 10.6 まとめ — 直さねばならない既存の門

| 対象 | 件数 | 種類 |
|---|---:|---|
| `tests/paradise.test.js` の環回し試験 | **2** | `#7 conclave 中断→復帰` / `#8 cartography 環が回りきる` に序列の宣言を足す |
| `README.md` | **2箇所** | 試験数(:138)/ engine 表 |
| `CONSTITUTION.INDEX.md` | **1** | 再生成 |
| `pulse.js` と dashboard の門 | **要調査** | 断面に鍵が増えることの影響(build 相が読み直す) |
| **一行も直らないもの** | markDone 試験6本 / chooseScale 11箇所 / CI spawn-trace 段 / dashboard-run-panel / gauge 16箇所 | **設計がそう作られているから** |

---

## 11. 新しい門は誰が見張るのか (第21条)

**門を足したなら、その門自身を誰が見張るのかを述べねばならない。**

| 新しい門 | 見張る者 | 壊して鳴らす試験(prove 相) |
|---|---|---|
| `conclave done` の序列判定 | `tests/paradise.test.js` の `環と器は同じ run に同じ判定を下す (第27条)`(AC-B2)。**4つの組で、片方だけ緑になる組合せが存在しないことを撃つ** | 証跡ゼロ+序列1 / observed+序列1 / 序列3閾値内 / 序列3超過 |
| `spawn-trace tier` | 同上(上の3番目・4番目が `tier` の exit code を撃つ) | 同上 |
| `spawn-trace audit` | **`audit` が 0件を走査したとき exit 1**(AC-A11)。**これが `audit` 自身の見張りである** —— 何も見ずに緑を出す門を、門自身が禁じる | `workspace` を解決不能にして 0件走査 → exit 1 を確認 |
| `spawn-trace tiers` | `AC-G2` の試験が7つの数の**実在**を撃つ。加えて **散文に同じ数が現れないこと**(AC-E7)が第41条の裏面を見張る | 閾値を1つ消して JSON から欠けさせる |
| `domains.js check` | AC-C1 の試験 + **AC-C5 の不変条件を15願いで撃つ試験** | 台帳から1名の宣言を消す → exit 1 と名指し |
| `forge.js` の admit | AC-C2/C3/C6 の試験。**AC-C4 の回帰**(担える願いは通る)が「門が厳しすぎて全部止める」ことを禁じる | 「音楽を作れ」→ exit 1 / 「ポモドーロタイマーを作れ」→ exit 0 |
| `ordain.js` | AC-D2(原本主義)・AC-D3(既定 dry-run)・AC-D5(4つの欠けを拒む)・**AC-D4(7門の通し撃ち)** | 分野なし/位階違反/枢機卿不在/名前衝突の4通りで exit 1 |
| `atlas` の `kind` 分類 | **§8.4 の3本**。とくに #2「実行時故障を溢れと呼ばない」 | receipt を模して分類を撃つ |
| `gauge` の序列指標 | AC-H3(legacy 不変)と AC-H4(序列3を罰しない)を**分ける**試験 | legacy の score が動けば赤 |
| **CI の `audit` 段** | `grep -c "conclave.json" tribunal.yml >= 1`(AC-B4)。**配線されぬ門は飾りである** | 段を消せば試験が赤 |

**そして門全体を見張るのは `wiring.js check`(孤児・宙吊り)と `critic.js review graph --self` である。**
`ordain.js` が孤児にならないことは §6.5 で、`domains.js` は `forge.js` が require するので孤児にならない。

---

## 12. 既存 engine と重複しないことの確認

**「gauge/census/critic/wiring が既に測っているものを二度測る設計は却下される」** — 一つずつ照合した。

| 既存 engine | 既に測っているもの | 本設計が測るもの | 重複か |
|---|---|---|---|
| `gauge.js` | 走行の荒れ(rework/retry/loopGuard/完走) | **誰が働いたか**(序列の相数と割合) | **否**。findings §2.5 が「6指標に該当ゼロ」と実証。**しかも集計は自前で書かず `spawn-trace.report()` を呼ぶ** |
| `census.js` | 散文の数と実測の一致 | — | **否**。序列の数は散文に**書かない**(第39条/AC-E7)。census の主張は増やさない |
| `critic.js` | 教訓に照らした欠陥 | — | **否**。触らない |
| `wiring.js` | engine の結線(孤児・宙吊り) | — | **否**。新 engine が**通る側**である |
| `check-agents.js` | 役者の**実在**・無主の相・宛先ずれ・階層の実体 | 役者の**分野適合** | **否**。AC-C7 が「同じ入力に二つの門が違う答えを出すことが正しい」と明示 |
| `contract.js` | 成果物の実在 + 起動証跡(`opts.run`) | 序列の申告と実測の突合 | **否**。`reconcile` は変えない。序列は `spawn-trace.judge()` に住む |
| `spawn-trace.js` | 起動の三値 | 序列の四値・閾値・実測 | **同じ engine に同居させる**。§0.2 の通り、判定表が二箇所に住めば必ず食い違う |
| `apply-models` / `apply-spawn` | 既存 agent の frontmatter | — | **否**。`ordain` は**新規作成**器であり、`deploy` の transform として既存2本を**呼ぶ**(書き直さない) |
| `deploy.js` | overlay → `~/.claude` の配備 | — | **否**。`ordain` は配備しない(AC-D2) |
| `atlas.js` | 図の正しさ | — | **否**。`kind` 分類は**既存判定の分解**であり、新しい判定ではない |

---

## 13. コマンド面の確定表(argv / exit code / 出力の語)

**requirements が AC で指定した語と一字一句合わせた。**

### 13.1 `graph/conclave.js`

```
done <phaseId> --run <run.json> --artifact <path> [--tier <1|2|3>]
```
| 出力の語 | 出力先 | exit |
|---|---|---:|
| `序列が宣言されていない` | stderr | 1 |
| `起動の証跡` / `第27条` | stderr | 1 |
| `自己申告` / `asserted-only` | stderr | 1 |
| `門相は序列3を名乗れない` / `第9条` | stderr | 1 |
| `申告と実測が食い違う` | stderr | 1 |
| `序列1` または `序列2`(本来の序列)+ 超過量と閾値 + agent 名 | stderr | 1 |
| `序列3` + `files=n/2 churn=n/50 bytes=n/4096` | stdout | 0 |
| `unobservable` | stdout | 0 |

他の subcommand(`convene`/`next`/`resume`/`ratify`/`status`)は **argv も exit code も出力も変えない。**

### 13.2 `graph/spawn-trace.js`

```
tiers --json                     → exit 0 / JSON に 2,50,4096,10,880,2,2
tier <run.json>                  → exit 0: `序列1: n / 序列2: n / 序列3: n / unobservable: n`
                                   exit 1: 相id・申告序列・実測値・閾値
audit                            → exit 0: `unobservable: <n>` + 黄を抱える run の一覧
                                   exit 1: 🔴 の run path と相id / **走査 0件**
report <run.json>                → 5値: observed / asserted-only / no-trace / 序列3 / unobservable
verify <run.json> <phase>        → 変更なし(legacy でも exit 1)
record <run.json> <phase> --agent <n> --tool-use-id <id>   → 変更なし
```

### 13.3 `graph/forge.js`

```
scale "<願い>"    → exit 0: 道名のみ(従来通り)
                    exit 1: `担い手が居ない` + 分野名 + `node graph/ordain.js forge …`
                    exit 1: `分野を判定できない`
plan "<願い>" --out <path>   → exit 1 のとき **<path> を作らない**
phases [--scale …]           → 変更なし
```

### 13.4 `graph/domains.js`(新)

```
check                → exit 0 / exit 1 + 宣言を欠く agent 名の列挙
classify "<願い>"    → exit 0 + 分野id / exit 1 + `分野を判定できない`
list                 → 台帳の一覧
```

### 13.5 `graph/ordain.js`(新)

```
forge --name <n> --domain <d> --cardinal <c> --rank <r> [--write]   → 0 / 1
enlist --name <既存> --domain <d> [--cardinal <c>] [--write]        → 0 / 1
verify --name <n>                                                   → 0 / 1
```

### 13.6 `graph/contract.js`

```
check [--run <run.json>]   → --run 有: exit 1 + `file-but-unspawned`
                             --run 無: **exit code は現状から変化しない**
schema                     → 変更なし
```

### 13.7 `graph/gauge.js`

```
score <run.json> --json    → 既存9鍵 + tier1/tier2/tier3/noTier/unobservable/tier3Ratio
compare --last <N>         → exit 0。COMPARE_KEYS に tier3Ratio
record / baseline / ledger → 変更なし
```

### 13.8 `graph/atlas.js`

```
check [--scale …]   → exit 0 のとき stdout に `OVERFLOW` を含まない
                      screen 列: fits / scroll(Npx) / OVERFLOW / 字 N.Npx / 測定不能 / skipped
```

---

## 14. 実装の順序(build 相が何をどの順で作るか)

**下から積む。各段の終わりに `node tests/paradise.test.js` が緑であること。**

| # | 段 | 作るもの | 終わりの検め |
|---|---|---|---|
| **1** | **atlas の門を直す**(論点F) | `firstScreen()` に `kind` を持たせ、`check()` の error 文言を `kind` で分ける。再試行を1回入れる | `node graph/atlas.js check` → exit 0 / `OVERFLOW` を含まない。**先に直す理由: 自己診断が間欠で赤くなる状態では、以後どの段の緑も信用できない** |
| **2** | **閾値と判定表**(G) | `spawn-trace.js` に `TIERS` / `measure()` / `judge()` / `tiers` を足す。**まだ誰も呼ばない** | `spawn-trace.js tiers --json` → 7値。既存試験が全部緑 |
| **3** | **紀元の印**(A) | `conclave.convene()` に `epoch` を1行。**まだ門は立てない** | 既存試験が全部緑。既存 run が legacy と判定されること |
| **4** | **門を立てる**(A/B) | `conclave.markDone` が `spawn-trace.judge()` を呼ぶ。CLI が throw を受けて exit 1。**§10.1 の #7 #8 に序列の宣言を足す** | AC-A1〜A8。`wiring map` に `conclave → spawn-trace` が現れる(AC-B1) |
| **5** | **事後の突合と監査**(A) | `tier` / `audit` / `report` の五値 | AC-A9 / A11 / A12。`audit` が 0件で exit 1 |
| **6** | **contract の口**(B) | `check --run` | AC-B3。`--run` 無しの exit code 不変 |
| **7** | **秤**(H) | `gauge` が `spawn-trace.report()` を呼び、鍵を足す。式は `run.epoch` のときだけ | AC-H1〜H5。**legacy の score が 100 のまま**(`tests:2790`) |
| **8** | **分野の台帳**(C) | `domains.json` + `domains.js`。**forge はまだ触らない** | `domains.js check` → exit 0(14名全員に宣言) |
| **9** | **forge の admit**(C) | `admit()` を足す。`chooseScale` は触らない。CLI の `scale`/`plan` が admit を通る | AC-C2〜C7。**`chooseScale` の11箇所が緑のまま** |
| **10** | **鍛造器**(D) | `ordain.js`。forge の呼び出し行が `graph/ordain.js` を名指しするので**この段で宙吊りが解ける** | AC-D1〜D7。`wiring check` → exit 0 |
| **11** | **憲法 第52条**(E) | `CONSTITUTION.md` に条を足し、`codex.js index --write`。**§7.2 の地雷5つを避ける** | AC-E1/E3/E4/E6/E7。`codex check` / `lexicon-check` → exit 0 |
| **12** | **CI と散文** | `tribunal.yml` に `audit` 段。README の engine 表 + 試験数 | AC-B4 / AC-D8 / AC-E2。`census check` → exit 0 |

**#1 を最初に置く理由**: 論点F の赤は間欠である。**間欠に赤くなる自己診断を抱えたまま #2 以降を積めば、自分が壊したのか門が転んだのかを区別できない。** 第24条(検証していない土台の上に建てるな)。

**#9 と #10 の順序が逆にできない理由**: `forge.js` が `graph/ordain.js` を名指しした瞬間、`wiring.js` の宙吊り検査が「存在しない engine を呼んでいる」と鳴る(`wiring.js:146-148`)。**#9 と #10 は同じコミットに入れるのが最も安全である**(第21条(c): 新しい口を開けるときは同じ変更で門を広げる)。

---

## 15. AC → 設計 トレーサビリティ(52本すべて)

| AC | 設計の場所 | 実装先 |
|---|---|---|
| AC-G1 統治は偽陽性を出さない | §2.7 | 門を `markDone` 一箇所に絞る |
| AC-G2 閾値が1箇所に | §2.1 | `spawn-trace.TIERS` / `tiers --json` |
| AC-G3 `RANKS.pontiff` が序列を持つ | §2.3 | `clergy.RANKS.pontiff.tiers`(配列) |
| AC-G4 神託の5役割 | §2.3 | `clergy.RANKS.pontiff.duties` |
| AC-A1 宣言なしの done は通らない | §3.1 | `markDone` が throw / CLI exit 1 |
| AC-A2 序列1/2 は証跡を要求 | §3.1 §2.6 | `judge()` 段5 |
| AC-A3 自己申告を緑にしない | §3.1 §2.6 | `judge()` が `verify()` の三値を読む |
| AC-A4 序列1の緑の側 | §3.1 | `record` 後 exit 0 |
| AC-A5 序列3の緑の側 | §3.1 §2.5 | 実測3量を stdout に |
| AC-A6 序列3の赤の側 | §2.6 | 超過量+閾値 / 本来の序列 / agent名 |
| AC-A7 門相は序列3不可 | §2.6 判定順3 | `phase.gate` を量より先に見る |
| AC-A8 申告と実測の食い違い | §2.6 判定順4 | — |
| AC-A9 事後の突合 | §3.3 | `spawn-trace.js tier <run>` |
| AC-A10 移行 | §2.4 §3.3 | legacy → `unobservable` / `verify` は exit 1 |
| AC-A11 黄が増えないことを裁く | §3.3 | `audit`(0件で exit 1) |
| AC-A12 五値の集計 | §3.3 | `report` に2鍵を足す |
| AC-A13 現走行が回り続ける | §2.4 | 本走行は `epoch` 不在 → legacy |
| AC-B1 結線が門に見える | §4.2 | `conclave` が `spawn-trace` を require |
| AC-B2 矛盾ゼロの試験 | §11 | 4つの組を撃つ試験 |
| AC-B3 contract に run を渡す口 | §4.4 | `check --run` |
| AC-B4 CI が実在の走行を見る | §4.5 | `audit` 段 + 註釈に `conclave.json` |
| AC-C1 宣言の網羅 | §5.3 | `domains.js check` |
| AC-C2 黙って落ちない | §5.2 | `admit()` + 3つの語 |
| AC-C3 計画も書かない | §5.2 | 判定を `mkdirSync` の前に |
| AC-C4 回帰・担える願いは通る | §5.2 §10.3 | stdout は道名のみ |
| AC-C5 15件の不変条件 | §5.4 | 件数でなく不変条件を assert |
| AC-C6 判定不能を緑にしない | §5.2 | `分野を判定できない` |
| AC-C7 実在だけでは足りない | §5.3 | 二つの門が違う答えを出す |
| AC-D1 1コマンドで原本が揃う | §6.1 | `ordain forge --write` |
| AC-D2 原本主義 | §6.1 | 配備は `deploy` のまま |
| AC-D3 既定は dry-run | §6.2 | `--write` 無しで0バイト |
| AC-D4 7門を通る | §6.3 §6.4 §6.7 | `ordain verify` |
| AC-D5 fail fast | §6.2 | 4つの欠けを鍛造時に |
| AC-D6 鍛造器が孤児にならない | §6.5 | forge の呼び出し行 + README + 試験 |
| AC-D7 孤立 agent を配線 | §6.2 | `ordain enlist` |
| AC-D8 手順が散文にも | §6.6 | README の engine 表 |
| AC-D9 鍛造そのものが序列2 | §6.1 | AC-D1 が満たされれば自動的に成立 |
| AC-E1 条が在る | §7.1 | 第52条 + `codex index --write` |
| AC-E2 散文の数が腐らない | §7.3 §10.5 | README:138 を直す |
| AC-E3 条が門を名指しする | §7.1 #5 | 3つの engine 名 |
| AC-E4 三段の序列を述べる | §7.1 #4 #8 | 順序 + 例外の語 / 絶対禁止を書かない |
| AC-E5 条と対の試験 | §7.4 | 3件 |
| AC-E6 一般則である | §7.2 地雷1 | 道名を書かない |
| AC-E7 閾値を写経しない | §7.2 地雷2 **と3** | 条番号への誤爆を避ける |
| AC-F1 `atlas check` が exit 0 / `OVERFLOW` 無し | §8.3 | `kind` 分類 |
| AC-F2 `0 failed` / passed ≥ 289 | §8.3 §0.1 | 実測 290 → 試験を足す |
| AC-F3 逃げ道 | §8.3 | **`scroll:true` を宣言しない**(根拠つき) |
| AC-H1 序列の指標 | §9.1 | 6鍵を足す |
| AC-H2 教主の手の割合 | §9.1 | `tier3Ratio` |
| AC-H3 台帳の連続性 | §9.2 | `run.epoch` が無ければ項が掛からない |
| AC-H4 紀元以後は点に効く / 序列3は罰しない | §9.2 | 2つを分ける試験 |
| AC-H5 前後比較 | §9.3 | `COMPARE_KEYS` に追加 |

**52 / 52。**

---

## 16. 本相の正直な注記

1. **論点F の結論は requirements の前提を覆した。** requirements §8 は「atlas の赤 = 図の溢れ」を前提に AC-F1〜F3 を書いたが、**本相の実測はその赤が再現しないこと、および記録された文言が実行時故障の分岐と一字一句一致することを示した。**
   AC-F1/F2/F3 は**そのまま満たせる**(F3 は「scroll:true でも良い」という許可であって義務ではない)ので差し戻しはしない。**だが直す対象は図ではなく門である。**

2. **「Chrome が実際に落ちた瞬間」は捕まえていない。** 捕まえたのは (a) 赤が再現しないこと、(b) 文言の一致、(c) 描画器が exit 1 + `viewer/visual-check-runtime` を出す条件の実在、の3つである。**因果は状況証拠で立てた。** §8.4 の #2 が撃つのは「分類の正しさ」であって「Chrome の挙動」ではない —— この区別を prove 相は保つこと。

3. **未コミット差分の帰属は近似である**(§2.5)。時刻で切れないので現在の相に帰属させた。**過大評価の方向にしか働かない**ので fail-safe だが、厳密ではない。より正確に測る道(相ごとのコミットを要求する)は requirements §1.2 が D-5 として明示的に範囲外にしている。

4. **`clergy.js` の `COLLEGE` をリテラルのまま engine に書き換えさせる判断は脆い**(§6.8)。台帳へ外出しする方が堅いが、`clergy.js` を読む全ての門の前提を動かすので本PRの範囲を超える。**verdict 相への申し送りとして残す。**

5. **`pulse.js` と dashboard の門への影響は「要調査」で止めた。** `pulse.js:48` が `spawn-trace` を呼ぶことは実測したが、断面に鍵が増えたとき `tests/dashboard-count.test.js`(「断面の数 == その場で数えた数」)がどう反応するかは**走らせて確かめていない。** build 相は #7 の段で必ず読み直すこと(§10.2)。

6. **分野の判定は語彙の正規表現である。** 分類器ではない。「音楽を作れ」は捕らえるが、語彙に無い言い回しは `分野を判定できない`(exit 1)へ落ちる。**判定不能を緑にしないので安全側だが、語彙の網羅性は本PRが保証するものではない** —— 台帳は `ordain` が育てる前提である。

7. **序列3の閾値は requirements が実測から導いた数をそのまま使い、一つも動かしていない。** design が閾値を変えたいなら理由と実測を添えて差し戻せ、と requirements §0 が定めている。**差し戻す理由は見つからなかった。**
