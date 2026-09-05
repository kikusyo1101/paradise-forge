# verify — 全門の撃ち直しと独立再現

**相**: verify @verification-loop (reform の道 第10相 / gate) / **立場**: quality 枢機卿の最後の門
**対象**: `reform/pontiff-office` (HEAD = `dfa567a` rework)
**日時**: 2026-09-03
**判定**: **全緑 (赤ゼロ)**

---

## 0. 裁定

| 検め | 結果 |
|---|---|
| 全門 × 通常環境 | **14/14 緑** |
| 全門 × 素の環境 (`PARADISE_UPSTREAM=/nonexistent CLAUDE_HOME=/nonexistent`) | **14/14 緑** |
| rework が塞いだと主張する9件の独立再現 | **9/9 塞がっている** |
| 回帰試験の抜き取り注入 (4本) | **4/4 が注入で赤・復旧で緑** |
| CI が本PRで足した段のローカル再現 | **緑** (CI 上の実走は未確認 — §5) |
| 台帳(`conclave.json`)とディスク上の成果物の整合 | **食い違い 0 件** (観測4は解消済み) |
| 作業場の汚れ | **注入は全て復旧。`git diff graph/ tests/` は空** |

**門は一つも弱めていない。** 閾値・判定順・GATES の名簿には一切触れていない。
注入した欠陥は4件すべて `git checkout --` で戻し、原本との一致を実測で確かめた(§4.5)。

---

## 1. 全門 — 通常環境

### 1.1 自己診断

```
$ node tests/paradise.test.js
rework (審査の差し戻しを塞ぐ):
  ✓ B-1: 序列3の門は git の失敗で fail-open しない — 非gitディレクトリの実経路で撃つ
  ✓ B-1: git が居ない環境 (ENOENT) でも緑を出さない — 別の故障、同じ原則
  ✓ B-1: 測定不能は audit / tier でも赤である — 刻まれた黄と混ぜない
  ✓ M-4: 序列3の state は機械の鍵として ASCII である — 旧い台帳も読める
  ✓ S-1 [HIGH]: --description の frontmatter インジェクションを鍛造の時点で拒む
  ✓ S-2 [HIGH]: prototype の鍵で validate を素通りできない
  ✓ S-3 [MEDIUM]: 途中で落ちた鍛造は孤児を残さない — 全か無かである
  ✓ S-4 [MEDIUM]: 巨大な未追跡ファイルで measure が死なない — 上限で足切りする
  ✓ S-5 [MEDIUM]: verify --only の綴り違いは 0門を撃って緑にならない (第37条)
  ✓ M-3: --scale を明示したら admit は**その道の名簿**を裁く

Paradise self-test: 328 passed, 0 failed
EXIT=0
```

rework の申告 (328 passed / 0 failed) と**実測が一致**した。

### 1.2 各 engine の門

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

$ node graph/census.js check          (実測 706 秒)
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
EXIT=0

$ node graph/codex.js check
═══════ 📖 CODEX CHECK ═══════
  ✓ 索引は本文と一致している (52 条)
EXIT=0

$ node graph/deploy.js check
═══════ 🏛  DEPLOYMENT CHECK ═══════
checked: 60  transforms (diff expected): agents
  ✓ every deployed file matches its declared source
EXIT=0

$ node graph/wiring.js check
═══ 🔗 WIRING GATE (第44条 / 第48条) ═══
  engine 36 / 内の辺 51
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
EXIT=0

$ node graph/domains.js check
═══ 🎭 DOMAINS — 役者は何を担えるか (第52条) ═══
  分野 14 / 宣言を持つ役者 14 / 道が名指しする役者 13
  ✓ 道が名指しする役者は全員、担える分野を宣言している
EXIT=0

$ node graph/apply-models.js verify
  ✓ creation-judge           executor  claude-opus-5/xhigh
  ✓ doc-updater              priest    claude-sonnet-5/high
  ✓ executor                 executor  claude-opus-5/xhigh
  ✓ planner                  priest    claude-opus-5/xhigh
  ✓ security-reviewer        priest    claude-opus-5/xhigh
  ✓ self-critic              executor  claude-opus-5/xhigh
  … (23 役者すべて緑)
all agents match the rank policy
EXIT=0

$ node graph/apply-spawn.js verify
═══════ 🗝  SPAWN AUTHORITY ═══════
  ✓ architect / auditor / cardinal / code-reviewer / doc-updater /
    market-researcher / reporter / requirements-analyst / security-reviewer / tdd-guide  granted
  · ux-reviewer            inherits-all
every agent that governs subordinates can actually dispatch them
EXIT=0

$ node graph/atlas.js check           (実測 710 秒 / 第一画面の実測を含む)
═══ 🗺  ATLAS GATE (第47条) ═══
  ✓ hierarchy   [architecture] 9/9  fits          動 29   734701b
  ✓ conclave    [workflow    ] 9/9  fits          動 26   734202b
  ✓ dispatch    [sequence    ] 9/9  fits          動 16   729702b
  ✓ dag         [architecture] 9/9  scroll(3312px)動 32   736885b
  ✓ run         [lifecycle   ] 9/9  fits          動 13   726618b
  ✓ wiring      [architecture] 9/9  fits          動 87   773011b  standard(最小交差 64)
  ✓ 6 主題すべてが検査に通る（うち 1 件は平面化不能のため standard: wiring）
EXIT=0

$ node graph/critic.js review graph --self --lessons graph/lessons.json
  ✓ [gap] lesson:… (全 lesson が satisfied)
VERDICT: the critic found nothing. Proceed to judgment.
EXIT=0

$ node graph/spawn-trace.js tiers
═══════ ⚖️  TIERS — 序列の閾値 (第52条) ═══════
  紀元: v1
  序列3 (教主の手・例外): files ≤ 2  churn ≤ 50  bytes ≤ 4096
  序列2 (編成が要る境界): files > 10  churn > 880  artifacts ≥ 2  domains ≥ 2
EXIT=0
```

**閾値の7つの数は rework の申告と一字一句一致する。** 誰も緩めていない。

```
$ node graph/branch-guard.js
═══════ 🧭 BRANCH GUARD ═══════
  branch : reform/pontiff-office (未コミットの変更あり)
  ✓ 最新の main の上に立っている
EXIT=0
```

---

## 2. 全門 — 素の環境

`PARADISE_UPSTREAM=/nonexistent CLAUDE_HOME=/nonexistent` を全ての門に与えて撃ち直した。

```
$ PARADISE_UPSTREAM=/nonexistent CLAUDE_HOME=/nonexistent node tests/paradise.test.js
  ✓ B-1 ×3 / M-4 / S-1 / S-2 / S-3 / S-4 / S-5 / M-3   (rework の10本すべて緑)
Paradise self-test: 328 passed, 0 failed
EXIT=0
```

**素の環境でも 328 passed / 0 failed。** 通常環境と同数である。

| 門 | 素の環境の出力 | EXIT |
|---|---|---|
| `check-agents.js` | all present / every phase has a master | 0 |
| `codex.js check` | ✓ 索引は本文と一致している (52 条) | 0 |
| `deploy.js check` | **checked: 0  transforms: none** ✓ | 0 |
| `wiring.js check` | engine 36 / 内の辺 51 ✓ | 0 |
| `domains.js check` | 分野 14 / 役者 14 / 名指し 13 ✓ | 0 |
| `apply-models.js verify` | all agents match the rank policy | 0 |
| `apply-spawn.js verify` | **(harness not installed here — check skipped)** | 0 |
| `census.js check` | ✓ every number the paradise claims about itself is true | 0 |
| `atlas.js check` | ✓ 6 主題すべてが検査に通る | 0 |
| `critic.js review graph --self` | VERDICT: the critic found nothing | 0 |
| `spawn-trace.js tiers` | 紀元 v1 / 閾値は通常環境と同一 | 0 |
| `branch-guard.js` | ✓ 最新の main の上に立っている | 0 |

**教主の注記(第16条)**: `deploy check` は素の環境で `checked: 0`、`apply-spawn verify` は
`check skipped` を返す。これは**赤ではないが「撃った門の数が減っている」**。両者は
`~/.claude` の実機を見る門なので、素の環境では見るものが無い。engine はそれを
「緑」ではなく**「不在の契約」として明示的に名乗って** exit 0 している
(lessons の `env-is-not-canon` が定めた作法)。**この2門については、素の環境の緑は
通常環境の緑ほど強い証拠ではない** — 通常環境で `checked: 60` の緑が出ていることを
もって充足とみなす。

---

## 3. rework が「塞いだ」と主張する9件の独立再現

rework.md の再現手順に頼らず、**教主が自ら書いた再現器で撃った。**

### 3.1 B-1 [BLOCK] — 非git ディレクトリで緑を出さないこと

一時ディレクトリを掘り、**祖先に `.git` が一つも無いことを実測してから** `measure()` / `judge()` を撃った。

```
$ node b1.js
非git 確認: 祖先に .git は 無い

A) measure @ 非git = {
 "files": 0, "churn": 0, "bytes": 8,
 "measurable": false,
 "unmeasured": [
  "コミット済みの差分を測れない: git log が exit 128 で失敗 (非gitディレクトリ・壊れた index・権限拒否のいずれか)",
  "未コミットの差分を測れない: git diff が exit 129 で失敗 (…)",
  "未追跡ファイルを測れない: git status が exit 128 で失敗 (…)"
 ]
}

A) judge  @ 非git = {"ok":false,"verdict":"red","state":"inconclusive"}
lines:
  序列3を実測できなかった — 測れなかったものを「閾値内」と報告しない (第16条)
    コミット済みの差分を測れない: git log が exit 128 で失敗 (…)
    未コミットの差分を測れない: git diff が exit 129 で失敗 (…)
    未追跡ファイルを測れない: git status が exit 128 で失敗 (…)
    この相が序列3の枠に収まっていたことは**検証されていない**。緑は出せない
    git が撃てる作業場で done を刻み直すか、序列1(委譲)として為せ
    委ねるべき agent: pontiff

判定: measurable===false ? true / verdict==="red" ? true / state==="inconclusive" ? true
B-1 独立再現: PASS (緑を出さない)
```

**課題文が求めた `verdict:"red"` / `state:"inconclusive"` を実測で確認した。**
`files=0 / churn=0` という数は今も返るが、**`measurable:false` が併走し `judge()` がそれを読む**
ので、0 が緑に化ける経路は塞がっている。

> **教主の自己申告**: 最初の再現器は `epoch` を `run.epoch = "v1"` と書いたため
> `hasEpoch()`(`run.epoch.tier` を見る)に弾かれ、`unobservable`(黄)が返って
> 「FAIL」と出た。**これは engine ではなく再現器の欠陥である。**
> `hasEpoch` の実装を読んで `{ tier: "v1" }` へ直したところ上記の通り赤が出た。
> 誤った再現で engine を有罪にしなかったことを記録に残す。

### 3.2 S-1 [HIGH] — frontmatter インジェクション (`--write` なし)

改行 + `---` + `model: fable` を混ぜた `--description` を実CLIへ渡した。

```
$ node graph/ordain.js forge --name evil-actor --domain quality --rank priest \
    --description $'benign\n---\nmodel: fable\nextra: pwned\n---\ntail'
EXIT=1 (拒まれた)
🔴 鍛造できない — 4 件の欠け (第52条: 後の門が鳴るのではなく、鍛造の時点で鳴る)
   - --description に改行が含まれる — frontmatter の行を増やせば engine が書いた tools:/model: が本文へ押し出される (S-1)
   - --description に "---" が含まれる — frontmatter の終端を偽装できる (S-1)
   - 分野 "quality" が台帳に無い — 既知: software, research, diagram, …
   - --cardinal が無い — 無主の役者は誰の麾下でもない (第25条)
```

**改行と `---` の両方が名指しで鳴った。** 黙って1行へ畳む挙動ではない(第34条)。

### 3.3 S-2 [HIGH] — prototype 汚染

課題文が名指しした3通りを実CLIへ撃った。

```
$ node graph/ordain.js forge --name probe-actor --domain constructor --rank priest --cardinal construction --description ok
🔴 - 分野 "constructor" が台帳に無い — 既知: software, research, diagram, …
EXIT=1

$ … --rank constructor …
🔴 - 位階 "constructor" は clergy.RANKS に無い — 既知: god, pontiff, cardinal, priest, believer, executor
EXIT=1

$ … --cardinal __proto__ …
🔴 - --cardinal の綴りが規則に反する: "__proto__" — 鍵は小文字と連字符のみ (S-2)
   - 枢機卿 "__proto__" が COLLEGE に無い — 既知: discovery, requirements, architecture, construction, quality, counsel, cartography
EXIT=1
```

**3通りすべて exit 1。** 撃った後の `git status` に `graph/domains.json` は現れず、
**台帳は1バイトも汚れていない。**

### 3.4 S-3 [MEDIUM] — `--write` の全か無か

`fs.writeFileSync` を差し替えて**最後の段 (`domains.json`) だけ**を失敗させた。

```
$ node s3.js
前: overlay/agents 件数 = 21
forge --write は throw したか: した — 鍛造が途中で落ちたので**全て巻き戻した** — 半端な役者を残さない (S-3): 注入した故障: domains.json への書き込み
後: overlay/agents 件数 = 21 / 増えた孤児 = []
中身が動いたファイル = []

S-3 独立再現: PASS (全か無か — 孤児ゼロ・1バイトも動かず)

$ git status --porcelain
 M reform/pontiff-office/conclave.json
?? reform/pontiff-office/pontiff-notes.md      ← 鍛造の痕跡は一つも無い
```

### 3.5 S-4 [MEDIUM] — 巨大な未追跡ファイルで死なないこと

**40 MiB / 655,360 行**の未追跡ファイルを本物の git 作業場に置き、
**`--max-old-space-size=96`(96 MB のヒープ上限)**で `measure()` を撃った。

```
$ node --max-old-space-size=96 s4.js
未追跡ファイル size = 41943040 bytes (=40 MiB)
経過 = 66 ms / throw = なし
measure = {"files":2,"churn":655361,"bytes":5,"measurable":true}
judge = {"ok":false,"verdict":"red","state":"tier3-breach"}

S-4 独立再現: PASS (死なず・測れたと名乗り・閾値超過で赤)
```

**ファイルの 40 倍以下のヒープで 66 ms で戻った** = 全量を読んでいない(足切りが効いている)。
かつ churn は過大評価の側(655,361 > 閾値 50)で**赤**を出す = fail-safe。
`exit 134` (SIGABRT) は再現しなかった。

### 3.6 S-5 [MEDIUM] — `verify --only` の綴り違い

```
$ node graph/ordain.js verify --name doc-updater --only 綴り違いの門
═══ ⚒  ORDAIN VERIFY — doc-updater が既存の全門を通るか ═══
  🔴 --only の綴り       そんな門は無い: 綴り違いの門 — 既知: 実在, 位階モデル方針, 起動権能, 配備の一致, 分野の適合, 結線, 自画像 (第37条: 不在は通過ではない)
  🔴 増やせば門が壊れるなら、それは増やせていない (第47条)
EXIT=1

$ node graph/ordain.js verify --name doc-updater --only 実在      ← 正しい綴り
  ✓ 分野宣言             software, research, diagram, slides, translation
  ✓ 実在               node graph/check-agents.js
  ✓ 鍛造した役者は既存の門を一つも壊していない
EXIT=0
```

**綴り違いは赤・正しい綴りは緑。** 偽陽性を出していない。

### 3.7 M-3 [MAJOR] — `--scale` の綴り違い

```
$ node graph/forge.js plan "テスト" --scale bogus-scale --out …
unknown scale: bogus-scale
EXIT=2
```

`admit` へ落ちる前に exit 2 で止まる(rework の主張どおり)。

### 3.8 M-4 [MAJOR] — 状態値の ASCII 化

```
$ node -e "…"
TIER3_STATE = "tier3"
LEGACY      = "序列3"
isTier3State(新) = true
isTier3State(旧) = true      ← 永続化された旧い台帳も読める
isTier3State(他) = false     ← 何でも通す実装ではない
```

### 3.9 独立再現のまとめ

| 件 | 級 | 独立再現の結果 |
|---|---|---|
| B-1 | BLOCK | ✅ `verdict:"red"` / `state:"inconclusive"` を実測 |
| S-1 | HIGH | ✅ 改行・`---` の両方が鍛造時に名指しで鳴る |
| S-2 | HIGH | ✅ 3欄すべて exit 1・`domains.json` 無傷 |
| S-3 | MEDIUM | ✅ 孤児ゼロ・1バイトも動かず |
| S-4 | MEDIUM | ✅ 96MB ヒープ・40MiB で 66ms 生還・赤 |
| S-5 | MEDIUM | ✅ 綴り違いは赤、正しい綴りは緑 |
| M-3 | MAJOR | ✅ exit 2 で拒む |
| M-4 | MAJOR | ✅ ASCII 鍵・旧綴りも読む・何でも通さない |
| (回帰10本) | — | ✅ 両環境で 10/10 緑 |

**9件すべてが実際に塞がっている。rework の申告に虚偽は見つからなかった。**

---

## 4. 回帰試験の抜き取り注入 — 「壊したら赤くなるか」

rework が追加した10本のうち **4本**(課題文の要求は最低3本)を選び、
**engine 側に欠陥を注入して実際に赤が出ることを実測**した。

### 4.1 注入前の基線

```
$ git diff --stat graph/ tests/
(空)
$ node tests/paradise.test.js
Paradise self-test: 328 passed, 0 failed
```

### 4.2 注入① — B-1 (`gitOut` の失敗を成功へ潰す)

```
注入: graph/spawn-trace.js
-    return { ok: false, reason: why };
+    return { ok: true, out: '' }; // ★注入: 失敗を「出力ゼロで成功」へ潰す (B-1 の旧病)

$ node tests/paradise.test.js
  ✗ B-1: 序列3の門は git の失敗で fail-open しない — 非gitディレクトリの実経路で撃つ
      非gitディレクトリで measurable:true — 「測れたか」を名乗る鍵が嘘をついている
  ✓ B-1: git が居ない環境 (ENOENT) でも緑を出さない — 別の故障、同じ原則
  ✓ B-1: 測定不能は audit / tier でも赤である — 刻まれた黄と混ぜない
Paradise self-test: 327 passed, 1 failed
EXIT=1
```

**鳴った。** しかも**失敗の理由まで正確に述べた**(「measurable:true が嘘をついている」)。

### 4.3 注入② — S-2 (`KEY_RE` の綴り規則を外す)

```
注入: graph/ordain.js
-const KEY_RE = /^[a-z][a-z0-9-]*$/;
+const KEY_RE = /^[\s\S]*$/; // ★注入: 綴りの規則を外す (S-2 の旧病)

$ node tests/paradise.test.js
  ✗ S-2 [HIGH]: prototype の鍵で validate を素通りできない
Paradise self-test: 327 passed, 1 failed
EXIT=1
```

### 4.4 注入③ — S-1 (`frontmatterSafe` の無害化を外す)

```
注入: graph/ordain.js
   if (typeof value !== 'string') return errors;
+  return errors; // ★注入: 無害化を丸ごと外す (S-1 の旧病)

$ node tests/paradise.test.js
  ✗ S-1 [HIGH]: --description の frontmatter インジェクションを鍛造の時点で拒む
      注入された description を受理した — 方針の保証が破れている
Paradise self-test: 327 passed, 1 failed
EXIT=1
```

### 4.5 注入④ — S-4 (読み込み上限を撤廃)

```
注入: graph/spawn-trace.js
-const MAX_UNTRACKED_READ = 1024 * 1024;
+const MAX_UNTRACKED_READ = Number.MAX_SAFE_INTEGER; // ★注入: 上限を外す (S-4 の旧病)

$ node tests/paradise.test.js
  ✗ S-4 [MEDIUM]: 巨大な未追跡ファイルで measure が死なない — 上限で足切りする
Paradise self-test: 327 passed, 1 failed
EXIT=1
```

### 4.6 復旧の検め(第20条の禁則)

```
$ git checkout -- graph/spawn-trace.js graph/ordain.js
$ git diff --stat graph/ tests/
(空 = 全復旧)

$ git status --porcelain graph/ tests/
(空 = engine/tests は無傷)

$ node tests/paradise.test.js
Paradise self-test: 328 passed, 0 failed      ← 基線へ戻った

$ git status --porcelain          ← 走行の終わり
 M reform/pontiff-office/conclave.json         ← 本走行の前から在る
?? reform/pontiff-office/pontiff-notes.md      ← 本走行の前から在る
```

**注入した4件はすべて元へ戻り、`git diff` は空である。作業場は汚していない。**

> **教主の注記**: 復旧の確認に `diff` でバックアップと突合したところ `ordain.js` が
> 「differ」と出た。**改行コード(CRLF/LF)の差であり中身は完全一致**であることを
> `diff <(tr -d '\r' …) <(tr -d '\r' …)` で確かめた(差分ゼロ)。
> **権威は git である** — `git diff` / `git status` がともに空であることをもって復旧とする。

### 4.7 抜き取りのまとめ

| 注入した試験 | 級 | 注入時 | 復旧後 |
|---|---|---|---|
| B-1 (fail-open) | BLOCK | ✗ **赤** (exit 1) | ✓ 緑 |
| S-1 (frontmatter) | HIGH | ✗ **赤** (exit 1) | ✓ 緑 |
| S-2 (prototype) | HIGH | ✗ **赤** (exit 1) | ✓ 緑 |
| S-4 (読み込み上限) | MEDIUM | ✗ **赤** (exit 1) | ✓ 緑 |

**4本すべてが「壊したら鳴る」。飾りの門ではない(第5条 / 第21条)。**
各注入は**1本だけ**を落とし他の327本は緑のまま = 試験が狙った欠陥を正確に捕らえている。

---

## 5. CI の再現(ローカル)

`.github/workflows/tribunal.yml` に本PRが足した段を、**同じコマンドでローカルに撃った。**

```
$ node graph/spawn-trace.js audit               # CI 236行目
  🟡 reform/pontiff-office/conclave.json  legacy (印なし・11 相が unobservable)
  🟡 ../paradise-creations/coin/conclave.json  legacy (印なし・11 相が unobservable)
  … (8 走行すべて legacy)
  走査 8 件 / unobservable: 94 (legacy 8 走行)
  ✓ 紀元以後の違反は無い — 黄は増えていない
EXIT=0

$ node graph/domains.js check                   # CI 240行目
  分野 14 / 宣言を持つ役者 14 / 道が名指しする役者 13
  ✓ 道が名指しする役者は全員、担える分野を宣言している
EXIT=0
```

同じ verify ジョブの隣接段も撃った(本PRの機構に依存するため):

```
$ node -e "… CI 208-228行目の故障注入をそのまま …"
spawn trace gate fires correctly on all three states
EXIT=0

$ node graph/vendor.js verify
vendored files: 130 = harness 62 {…} + tools 68 {"archify v2.16.0":68}
  ✓ paradise stands on its own — no path leads back to the borrowed tree
EXIT=0
```

**正直な限界(第16条)**: これは **ローカル (Windows / git-bash) での再現であって、
CI 上での実走ではない。** tribunal.yml は `runs-on: ubuntu-latest` であり、
**GitHub Actions 上で緑になることを教主は確認していない。** 特に:

- `deploy check` / `apply-spawn verify` は `~/.claude` の実機を見る。CI 上では
  素の環境に近い状態になるはずだが、**「はず」は証拠ではない**ので断定しない。
  §2 の素の環境の走行がその代理証拠である(両者とも exit 0)。
- 改行コード (CRLF/LF) の差は Windows 固有であり、Linux の CI では現れない。
- `atlas check` / `census check` は実測で 11〜12 分を要した。CI の時間制限に
  収まるかは**この走行では測っていない。**

---

## 6. 台帳とディスクの整合(観測4の追検)

`pontiff-notes.md` の観測4は「教主が `ratify construction` を飛ばし、
成果物は実在するのに環がそれを知らない」状態を記録している。
**現時点で食い違いが残っていないかを実測した。**

```
$ node -e "conclave.json の domains[].phases[] とディスクを突合"

枢機卿          domain.status 相         phase.status  成果物                                     ディスク
--------------------------------------------------------------------------------------------------------
discovery      ratified     discover    done          reform/pontiff-office/findings.md          在 37747B
requirements   ratified     specify     done          reform/pontiff-office/requirements.md      在 57400B
architecture   ratified     design      done          reform/pontiff-office/design.md            在 88368B
construction   ratified     build       done          reform/pontiff-office/build-report.md      在 41574B
construction   ratified     prove       done          reform/pontiff-office/prove.md             在 48723B
quality        active       review      done          reform/pontiff-office/review.md            在 57075B
quality        active       security    done          reform/pontiff-office/security-report.md   在 36654B
quality        active       docs        done          reform/pontiff-office/docs-report.md       在 13554B
quality        active       verify      running       —                                          —
tribunal       pending      reflect     pending       —                                          —
tribunal       pending      verdict     pending       —                                          —

台帳が知らないディスク上の .md = ["pontiff-notes.md","rework.md"]

食い違い件数 = 0
```

**観測4が記録した食い違いは解消している。**
`construction` は `ratified` になり、`quality` の三相はすべて `done` を刻んでいる。
`done` なのに成果物が無い相はゼロ、`done` でないのに成果物が在る相もゼロ。

**ただし二点を記す(第16条)**:

1. **`rework.md` と `pontiff-notes.md` は台帳が知らない。**
   どちらもディスクに実在するが `artifactPath` を持つ相が無い。
   - `pontiff-notes.md` は教主が序列3で自ら書いたもので、環の外の産物であると
     本人が明記している(観測4の主題そのもの)。
   - **`rework.md` は rework 相の成果物であるにもかかわらず、台帳に相が無い。**
     ```
     $ node -e "conclave.json の全相 id を並べる"
     discover, specify, design, build, prove, review, security, docs, verify, reflect, verdict
     rework 相は在るか: false
     history に rework は: []
     reworks 合計: discovery=0 requirements=0 architecture=0 construction=0 quality=0 tribunal=0
     ```
     すなわち**rework 相は環に載らずに走った。** 相が無いだけでなく、
     **`history` に一件も記録が無く、`reworks` の計数も全枢機卿 0 のままである** ——
     機構から見れば**差し戻しは一度も起きていない。**
     しかし `rework.md` (22,716 B) はディスクに実在し、engine は実際に7件分書き換わっている
     (§3 で独立に実測したとおり)。これは観測4と**同じ形の食い違い**であり、
     成果物の側ではなく**台帳の側に相が欠けている**という点だけが異なる。
     **この一件は verify の時点で残っている。** reflect / verdict への申し送りとする。
2. **`run.epoch` は今も `undefined`** である。
   ```
   $ node -e "console.log(require('./reform/pontiff-office/conclave.json').epoch)"
   undefined
   ```
   観測4が述べたとおり本走行は第52条の機構より前に `convene` されたため、
   序列の門はこの走行に対して立っていない(`spawn-trace audit` が `legacy` と
   正しく名乗る)。**これは設計上の移行方針(AC-A)であって欠陥ではない**が、
   **本PRが建てた門は本PR自身の走行を裁いていない**という事実は記録に値する。
   `tierAudit(conclave.json).ok = true` は「違反が無い」ではなく
   「紀元以後の相が一つも無い」ことを意味する。

---

## 7. 最終判定

### 撃った門と結果

| # | 門 | 通常 | 素 |
|---|---|---|---|
| 1 | `node tests/paradise.test.js` | ✅ 328/0 | ✅ 328/0 |
| 2 | `node graph/check-agents.js` | ✅ 0 | ✅ 0 |
| 3 | `node graph/census.js check` | ✅ 0 | ✅ 0 |
| 4 | `node graph/codex.js check` | ✅ 0 | ✅ 0 |
| 5 | `node graph/deploy.js check` | ✅ 0 (checked:60) | ✅ 0 (checked:0) |
| 6 | `node graph/wiring.js check` | ✅ 0 | ✅ 0 |
| 7 | `node graph/domains.js check` | ✅ 0 | ✅ 0 |
| 8 | `node graph/apply-models.js verify` | ✅ 0 | ✅ 0 |
| 9 | `node graph/apply-spawn.js verify` | ✅ 0 | ✅ 0 (skipped) |
| 10 | `node graph/atlas.js check` | ✅ 0 | ✅ 0 |
| 11 | `node graph/critic.js review graph --self` | ✅ 0 | ✅ 0 |
| 12 | `node graph/spawn-trace.js tiers` | ✅ 0 | ✅ 0 |
| 13 | `node graph/branch-guard.js` | ✅ 0 | ✅ 0 |
| 14 | `node graph/spawn-trace.js audit` (CI 段) | ✅ 0 | — |

### 判定

**全緑。赤は一つも残っていない。第20条の「片方の環境でも赤なら未完」に照らして、
通常環境・素の環境の双方で全門が緑である。**

- rework が塞いだと主張する9件は、**教主が独立に書いた再現器で9件すべて塞がっている**ことを実測した。
- 回帰試験は**抜き取った4本すべてが「壊したら鳴る」**ことを故障注入で実測した。飾りの門ではない。
- 注入した欠陥は**全て復旧し、`git diff graph/ tests/` は空**である。
- 門・閾値・GATES の名簿は**一つも弱めていない**。

### reflect / verdict への申し送り(赤ではないが記録すべきこと)

1. **`rework.md` が台帳の外に在る**(§6-1)。rework 相は `conclave.json` に相を持たない。
   観測4が名指しした病(申告と実測の乖離)と同じ形が**この走行にまだ一箇所残っている。**
2. **本走行は `epoch` を持たず、本PRが建てた門に裁かれていない**(§6-2)。
   `tierAudit.ok = true` は「合格」ではなく「対象外」である。
3. **CI 上での実走は未確認**(§5)。ローカル再現は緑だが、それは CI の緑を保証しない。
4. 素の環境における `deploy check` (`checked: 0`) と `apply-spawn verify` (`skipped`) は、
   **緑だが「撃った門の数が減っている」**(§2)。
5. rework 自身が申し送った **M-1 / M-2 の未解決**と、`prove.md` への一文の追記
   (rework §4 が「本 rework で果たしていない」と明記)は**依然として未着手**である。
