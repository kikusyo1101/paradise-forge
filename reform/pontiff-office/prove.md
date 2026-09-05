# prove — 門をわざと壊して、鳴ることを証明する

**相**: prove @tdd-guide (reform の道 第5相, gate)
**入力**: `design.md` §8.4 (prove 相への申し送り) / `requirements.md` (52本の AC・完了条件) / `build-report.md` (AC-D4/D7 の自己申告)
**測定日**: 2026-09-03 / ブランチ `reform/pontiff-office` / HEAD `58498ee`
**測定機**: Windows 11, git-bash, node v24.14.0 (`C:/Users/kikus/Documents/workspace/paradise`)

> 「健全な系しか見たことのない門は、試されたことがない門である」(第21条)
>
> 本PRは 22本の新しい門を建て、**312 passed / 0 failed** で緑になっていた。
> **だがその緑は「壊したら赤くなる」ことを何も証明していなかった。**
> 本文書の全ての判定には、実際に走らせたコマンドの**生の出力**が付いている。

---

## 0. 要旨

### 0.1 本相が発見した欠陥 — **鍛造器そのものが門を壊していた**

| # | 欠陥 | どこで見つかったか | 処置 |
|---|---|---|---|
| **P-1** | `ordain.js` が新しい神官を `priests` 配列の**先頭**に挿していた。`clergy.marshalPlan()` は `PHASE_LEAD` に宣言の無い相を **`c.priests[0]`(筆頭神官)**へ落とすので、**産まれたばかりの役者が既存の発令を横取りする** | **実際に役者を1名産ませたら** `check-agents` が `misrouted` 2件で鳴った | `ordain.js writeCollege()` を**末席挿入**に直し、再読込で末席を検証する |
| **P-2** | `renderAgent()` が `--believers` を渡したときだけ `Task` を付けていた。だが `apply-spawn.needsSpawn()` は「**信徒を擁する枢機卿の神官**」全員に `Task` を要求する。ゆえに `construction` へ鍛造すると `Task` を欠いた原本が産まれ、配備時に transform が黙って足していた(**原本と実機が食い違う**・第29条違反) | 同上 | 権能を**枢機卿の編成から導く**ように直した |
| **P-3** | **atlas を撃つ試験の作業場が固定名だった**。`atlas.check()` は冒頭で outdir を `rmSync` するので、**二つのプロセスが同時に試験を走らせると片方が他方の描いた html を消す**。図は何も壊れていないのに門が `ENOENT` で落ちる | **教主が別プロセスで同じ試験を走らせていたとき**に赤が出た。prove 相が並走で再現 | 作業場を `fs.mkdtempSync` で**プロセス固有**にした。固定名の再侵入を裁く門を1本建てた |

**この2件は「経路が通るか」を撃つ試験では原理的に見えない。** 建造相は `ordain verify` が7門を**呼ぶ**ことを撃ったが、**実際に役者を産ませてはいなかった**(build-report が「経路のみ、実鍛造は未実施」と正直に自己申告している)。**産ませて初めて鳴った。**

**P-3 は第21条(c) が既に一度名指しした病の、別の口である。** 隣に `atlas: 門は己の残骸で落ちない — 同じ作業場で二度走る (第21条)` という試験が実在するが、**あの門は「同じプロセスが二度走る」ことは守っても「二つのプロセスが同時に走る」ことは守っていなかった。**

### 0.2 撃った門と結果

| 区分 | 注入した欠陥 | 鳴った門 | 結果 |
|---|---|---|---|
| **D4/D7** | 実際に役者を鍛造(`video-producer` / 分野 `video`) | `check-agents` `apply-spawn` | 🔴 2件 → engine を直して **7門全緑** |
| **(a)** | 序列の宣言なし / 証跡なし / 自己申告のみ / 閾値超過 / 申告矛盾 | `conclave done` `spawn-trace tier` | ✓ 5通りすべて名指しで鳴った |
| **(b)** | gate 相に `--tier 3` | `conclave done` | ✓ 量を測る前に鳴った |
| **(c)** | 統治行為9本(**偽陽性試験**) | — | ✓ **9本すべて黙った** |
| **(d)** | 紀元の印なし run | `spawn-trace verify` | ✓ 黄で通り、`verify` は exit 1(黄は緑ではない) |
| **(e)** | 分野宣言の削除 / 綴り違い / 担い手なしの願い | `domains check` `forge admit` | ✓ 名指しで鳴った。`check-agents` は緑のまま(二つの門が別の問い) |
| **(f)** | 溢れ / 実行時故障 / JSON不可解 / 読めない字 / Chrome不在 | `atlas check` `firstScreen` | ✓ 5種の `kind` に正しく分岐。**測定不能を「溢れた」と呼ばない** |
| **(g)** | 壊れた鍛造要求8通り | `ordain forge` | ✓ 8通りすべて鍛造の時点で拒み、**1バイトも書かなかった** |
| **⑦** | **神が許した序列3の正当な例外**(偽陽性) | — | ✓ **実測経路で通った**(exit 0 / score 100) |
| **P-3** | **二プロセスで固定名の作業場を共有**(教主が実測した赤の真因) | `atlas check`(己の作業場で転んだ) | 🔴 両プロセス赤 → 作業場を隔離して **両方緑**。固定名の再侵入を裁く門を建てた |

### 0.3 足した回帰試験

| 試験名 | 何を固定するか | 注入時に赤くなることを確認 |
|---|---|---|
| `鍛造器が実際に産んだ役者は既存の発令を乗っ取らない (AC-D4 / AC-D7)` | P-1 / P-2 の回帰 | ✓ 先頭挿入に戻すと `misrouted` 2件で破れる |
| `atlas: 本当に溢れる図は OVERFLOW と画素数で鳴る (§8.4 #1)` | 溢れの側の語と画素数 | ✓ 実測 3312px で撃つ |
| `atlas: 描画器の実行時故障を「溢れた」と呼ばない — 実経路で撃つ (§8.4 #2)` | **本PRの回帰の本体** | ✓ 分類を畳み戻すと `kind='overflow' reason="fail"` になり破れる |
| `第52条: 序列3の例外は**実測経路**で通る (AC-A5 / 完了条件⑦)` | 偽陽性の本体 | ✓ 大きい手仕事の対照が赤 |
| `第52条: 序列3の閾値は「以下」である — 境界ちょうどは通り、1つ超えれば鳴る` | 神が許した縁 | ✓ `>` を `>=` に狭めると破れる |
| `atlas: 門は他プロセスと作業場を共有しない — 並走で転ばない (第21条c)` | P-3 の回帰 | ✓ 固定名に戻すと破れる |

---

## 0.4 P-3 — **並走で転ぶ門**(教主が実測した赤の真因)

### 症状

終盤の走行で `atlas: 全ての道が図になる (第47条)` が赤になった:

```
quick/hierarchy: 第一画面を測定できなかった (描画器の理由: ENOENT: no such file or directory,
open 'C:\Users\kikus\AppData\Local\Temp\paradise-test-atlas\hierarchy.html')
— 測れなかったことは「溢れた」ことではない。描画器を直せ(第16条 / 第42条)
```

**この文言そのものは本PRの勝利である。** 旧実装ならこの ENOENT は `r.status`(`"fail"`)に畳まれ、**「溢れた。巻物と宣言せよ」という嘘の診断**になっていた。今は「測定できなかった」と正直に名乗り、誤った直し方を教えていない(第16条 / 第42条)。

**だが赤の真因は別に在った。**

### 真因

`tests/paradise.test.js:3440` は作業場を**固定名**で取っていた:
```js
const outdir = path.join(os.tmpdir(), 'paradise-test-atlas');
```

`atlas.check()` は冒頭で **`fs.rmSync(outdir, {recursive:true, force:true})`** する(`atlas.js:1352`)。
試験は 5道を回すので **5回消す** —— **隣のプロセスが描いた html を消す窓が5回開く。**

### 再現した(直す前に、実測で)

固定名 outdir を二プロセスで共有し、試験と同一の形(5道 × 6主題)で並走させた:

```
##### 再現: 固定名 outdir を二プロセスで共有 #####
[B] 🔴 1 件
[B]    counsel/conclave: delivery/commit: Could not commit verified delivery
       "...\paradise-test-atlas\conclave.html": EPERM: operation not permitted,
       rename '...\.archify-delivery-KgimdZ\conclave.html' -> '...\conclave.html'
[A] 🔴 1 件
[A]    counsel/wiring: 第一画面を測定できなかった (描画器の理由: ENOENT: no such file or
       directory, open '...\paradise-test-atlas\wiring.html')
       — 測れなかったことは「溢れた」ことではない。描画器を直せ(第16条 / 第42条)
共有 outdir: A=1 B=1  (どちらかが 1 なら再現)
```

**教主が見た文言と同型の赤が、両プロセスで出た。** 図は 1px も壊れていない。

### 直した後(同じ再現を、隔離して撃つ)

```
##### 対照: プロセス固有 outdir #####
[B] ✓ 緑 (5道 × 6主題)
[A] ✓ 緑 (5道 × 6主題)
固有 outdir: A=0 B=0  (両方 0 なら隔離が効いている)
```

**同じ並走・同じ負荷で、作業場を分けただけで両方緑になった。**

### 洗い出した固定名(すべて直した)

```
$ grep -n "tmpdir()" tests/*.js | grep -viE "process.pid|mkdtempSync|Math.random|Date.now"
```

| 箇所 | 旧 | 新 |
|---|---|---|
| `paradise.test.js:3440` | `paradise-test-atlas` | `fs.mkdtempSync(... 'paradise-test-atlas-')` |
| `paradise.test.js:3470` | `paradise-test-atlas-twice` | `fs.mkdtempSync(... 'paradise-test-atlas-twice-')` |
| `paradise.test.js:27` | `paradise-test-dag.json` | `paradise-test-dag-${process.pid}.json` |
| `paradise.test.js:183` | `paradise-forge-dag.json` | `paradise-forge-dag-${process.pid}.json` |
| `paradise.test.js:3027` | `paradise-lesson-artifact.json` | `paradise-lesson-artifact-${process.pid}.json` |

**他の試験ファイルは既に隔離されていた**(実測): `counsel.test.js` / `dashboard-sse.test.js` / `motion-probe-leak.test.js` はすべて `process.pid` を混ぜており、`kgRoot` / `ccRoot` / `makeCreation()` は既に `fs.mkdtempSync` を使っている。
`paradise.test.js:2524,2527` の `os.tmpdir()` は**読むだけの住所計算**(`ws.creationDir` の引数)であり書き込まないので、衝突しない。

### 回帰に固定した

試験名: **`atlas: 門は他プロセスと作業場を共有しない — 並走で転ばない (第21条c)`**

**並走そのものは再現しない。** 6主題 × 5道 × 2プロセスで数分掛かり、自己診断の中で回せば**門が己の重さで腐る**(第34条: 走れない門は落ちる門より悪い)。
代わりに**不変条件を撃つ**: 試験ファイル自身を読み、`const outdir = path.join(os.tmpdir(), '<固定名>')` の形が一つも残っていないことを assert する。**固定名が一つでも戻れば即座に鳴る。**

```
現況の固定名: [] → ✓ 緑
注入(固定名に戻す)後: ["paradise-test-atlas"] → ✓ 赤くなる(試験が鳴る)
```

> **なぜ engine ではなく試験を直したか**: `atlas.check()` が `outdir` を消すのは正しい振る舞いである —— 残骸が次の走行を汚す病を、既存の試験が既に捕らえている(第21条)。
> **消すことが誤りなのではなく、消す場所を共有していることが誤りである。** engine の側で「他プロセスが使っているかもしれないから消さない」を実装すれば、**残骸で落ちる病が戻る。** 作業場の隔離は呼び手の責務である。

---

## 1. 基線 — 積む前の実測 (第24条)

```
$ node tests/paradise.test.js 2>&1 | tail -5
  ✓ 鍛造器は既存の門を撃つ — 増やせば図が壊れるなら増やせていない (AC-D4 / 第47条)
  ✓ atlas: 測定できなかったことを「溢れた」と呼ばない (第16条 / 第42条)
  ✓ CI の序列の門は実在の走行を見る (第42条)

Paradise self-test: 312 passed, 0 failed
EXIT=0
```

```
$ git status --short
 M reform/pontiff-office/conclave.json          ← 環の台帳のみ(前相の done)
```

**基線は緑である。ゆえに以後の赤はすべて本相が注入したものである。**

---

## 2. 【1】鍛造器に本当に役者を産ませる (AC-D4 / AC-D7)

> 建造神官の自己申告(build-report §4-4):
> 「**AC-D4 の7門は `ordain verify` が呼ぶ engine の一覧として撃ち、うち2門は実際に走らせた。**
>  **AC-D7(`enlist`)も同様に経路の実装のみで、実走行はしていない。**」
>
> **経路が通ることと、産まれた役者が全ての門を通ることは別である。**

分野は `domains.json` に在るが**担い手が一人も居ない** `video`(映像・動画)を選んだ。神託の本旨「定義されていない分野の作業」に直結する。

### 2.1 既定は dry-run である (AC-D3)

```
$ node graph/ordain.js forge --name video-producer --domain video --cardinal construction --rank priest
═══ ⚒  ORDAIN — 鍛造 video-producer ═══
  分野: video   枢機卿: construction   位階: priest
  · overlay\agents\video-producer.md 役者の定義そのもの。原本は overlay に住む (第29条)
  · overlay/overlay.json         own.agents に "video-producer.md" を足す — deploy の plan に載せるため
  · graph/clergy.js              COLLEGE["construction"].priests に "video-producer" を足す — 無主にしない (第25条)
  · graph/domains.json           agents["video-producer"] に分野 "video" を宣言する (第52条)
────────────────────────────────────────────
  (既定は dry-run — overlay は1バイトも変わっていない)
  実際に書くなら --write を足せ
════════════════════════════════════════════
EXIT=0

$ git status --short
 M reform/pontiff-office/conclave.json          ← 基線と同一。**1バイトも変わっていない**
```

### 2.2 🔴 **実際に産ませたら門が鳴った** — 建造が見ていなかった穴

```
$ node graph/ordain.js forge --name video-producer --domain video --cardinal construction --rank priest --write
  ✓ overlay\agents\video-producer.md
  ✓ overlay/overlay.json
  ✓ graph/clergy.js
  ✓ graph/domains.json
  原本を書いた。**実機にはまだ何も無い** — 配備器だけが実機に書く (第29条)
EXIT=0

$ ls ~/.claude/agents/video-producer.md
ls: cannot access '/c/Users/kikus/.claude/agents/video-producer.md': No such file or directory
                                              ↑ AC-D2 合格。鍛造器は配備器ではない

$ node graph/deploy.js --write | tail -3
  "deployed": 59,
  "home": "C:\\Users\\kikus\\.claude"
EXIT=0

$ node graph/ordain.js verify --name video-producer
═══ ⚒  ORDAIN VERIFY — video-producer が既存の全門を通るか ═══
  ✓ 分野宣言             video
  🔴 実在                 🔴 misrouted: build (scale: quick) — 宣言 architect だが発令先は video-producer (construction の筆頭に落ちている) → clergy.js の PHASE_LEAD に build を書け /   🔴 misrouted: build-ui (scale: full) — 宣言 architect だが発令先は video-producer (construction の筆頭に落ちている) → clergy.js の PHASE_LEAD に build-ui を書け
  ✓ 位階モデル方針          node graph/apply-models.js verify
  ✓ 起動権能             node graph/apply-spawn.js verify
  ✓ 配備の一致            node graph/deploy.js check
  ✓ 分野の適合            node graph/domains.js check
  ✓ 結線               node graph/wiring.js check
  ✓ 自画像              node graph/atlas.js check
  🔴 増やせば門が壊れるなら、それは増やせていない (第47条)
EXIT=1
```

**門は正しく鳴った。鳴らされたのは鍛造器である。**

### 2.3 根本原因 (P-1) — 名を先頭に挿せば、その者が筆頭になる

```
$ node -e "console.log(JSON.stringify(require('./graph/clergy.js').COLLEGE.construction.priests))"
["video-producer-probe","architect","tdd-guide"]
                        ↑ 産まれたばかりの役者が筆頭に立っている
```

`clergy.js:496`:
```js
const priest = (wanted && (c.priests || []).includes(wanted)) ? wanted : c.priests[0];
```

`PHASE_LEAD` に宣言の無い相(`build` / `build-ui`)は **`c.priests[0]`** へ落ちる。
旧 `ordain.writeCollege()` は `priests: [` の**直後**に挿していた:

```js
const after = before.replace(key, `$1'${name}', `);      // ← 先頭に挿す
```

**ゆえに役者を1名増やすだけで、その枢機卿の指揮系統が組み替わる。**
`ordain.js` のコメントは「挿入は一点のみ・整形も並べ替えもしない」と述べていたが、**先頭挿入そのものが並べ替えであった。**

### 2.4 根本原因 (P-2) — 起動の権能が編成から導かれていなかった

```
$ grep "^tools:" overlay/agents/video-producer-probe.md      # 旧実装
tools: Read, Grep, Glob, Write, Edit, Bash                   # ← Task が無い
```

`apply-spawn.needsSpawn()` は `--believers` を見ない:
```js
if ((c.believers || []).length) { for (const p of c.priests || []) out.set(p, ...); }
```
**信徒を擁する枢機卿の神官は全員**が `Task` を要る。`construction` は `module-builder` / `test-writer` を擁する。
旧実装は `Task` を欠いた原本を産み、`deploy` の transform が実機で黙って足していた —— **原本と実機が食い違う定義を産むのは、原本主義(第29条)の反対である。**

### 2.5 直した — engine を直した。門は弱めていない

`graph/ordain.js`:
- `writeCollege()`: `priests` 配列を丸ごと捕らえ、**末席**に加える。書いた後に再読込し、**末席に居ることまで検証**して、外れていれば書き戻す
- `renderAgent()`: 起動の権能を `req.believers` ではなく **`COLLEGE[cardinal].believers` から導く**

### 2.6 直した後 — **7門すべて緑**

```
$ node graph/ordain.js forge --name video-producer --domain video --cardinal construction --rank priest --write
  ✓ (4ファイル)
$ ls ~/.claude/agents/video-producer.md
ls: cannot access ...: No such file or directory        ← まだ実機に無い (第29条)
$ node graph/deploy.js --write | tail -3
  "deployed": 59,
EXIT=0

$ node graph/ordain.js verify --name video-producer
═══ ⚒  ORDAIN VERIFY — video-producer が既存の全門を通るか ═══
  ✓ 分野宣言             video
  ✓ 実在               node graph/check-agents.js
  ✓ 位階モデル方針          node graph/apply-models.js verify
  ✓ 起動権能             node graph/apply-spawn.js verify
  ✓ 配備の一致            node graph/deploy.js check
  ✓ 分野の適合            node graph/domains.js check
  ✓ 結線               node graph/wiring.js check
  ✓ 自画像              node graph/atlas.js check
  ✓ 鍛造した役者は既存の門を一つも壊していない
EXIT=0
```

**個別にも撃った:**
```
$ node graph/check-agents.js         → EXIT=0
$ node graph/apply-models.js verify  → EXIT=0
$ node graph/apply-spawn.js verify   → EXIT=0
$ node graph/deploy.js check         → EXIT=0
$ node graph/wiring.js check         → EXIT=0
$ node graph/domains.js check        → EXIT=0
```

**産まれた原本と、配備された実機が一致している:**
```
$ cat overlay/agents/video-producer.md
---
name: video-producer
description: 映像・動画 を担う神官。枢機卿 Construction (建造) の麾下で 映像・動画 の仕事を受け持つ。
tools: Read, Grep, Glob, Write, Edit, Bash, Task        ← 編成から導かれた権能
model: claude-sonnet-5
effort: high
---
...
$ head -6 ~/.claude/agents/video-producer.md
（同一）

$ node -e "console.log(JSON.stringify(require('./graph/clergy.js').COLLEGE.construction.priests))"
["architect","tdd-guide","video-producer"]              ← 末席。筆頭は動いていない
```

**`~/.claude` は一度も手で編集していない。** 全て `overlay/` → `deploy.js --write` の経路である。

### 2.7 残すか消すか — **消した**(痕跡ゼロ)

**判断**: 役者を1名増やしても `video` の道は開かない。

```
$ node graph/forge.js scale "動画を作れ"
担い手が居ない — 分野: 映像・動画 (video)
  道 standard が名指しする役者のうち、この分野を担うと宣言していない者:
    requirements-analyst, architect, tdd-guide, code-reviewer, ux-reviewer, security-reviewer
EXIT=1
```

`standard` の道は6名の非PSEUDO agent 全員に `video` の宣言を要求する。**「担い手を1名増やす」ことと「その分野の道を開く」ことは別の仕事**であり、後者は道の改修 = reform の道の仕事である(第23条)。

`domains.json` に居るだけで**どの相からも呼ばれない役者**を残せば、それは第44条が禁じる「死んだ道具を教主が先例と読む」形になる。**ゆえに消した。**

```
$ (原本・台帳・overlay.json を戻し、deploy --write で実機を同期)
$ ls ~/.claude/agents/video-producer.md overlay/agents/video-producer.md
ls: cannot access '/c/Users/kikus/.claude/agents/video-producer.md': No such file or directory
ls: cannot access 'overlay/agents/video-producer.md': No such file or directory
$ grep -rn "video-producer" graph/clergy.js graph/domains.json overlay/overlay.json
(出力なし)
$ node graph/check-agents.js  → EXIT=0
$ node graph/deploy.js check  → EXIT=0
$ node graph/domains.js check → EXIT=0
```

**痕跡ゼロ。** 経路は `tests/paradise.test.js` の回帰試験が**毎回産ませて毎回消す**形で保持される。

---

## 3. 【2】故障注入 — 門をわざと壊して鳴らす

### 3.1 (a) 序列の門 — 第52条 (c) / (e)

**すべて `epoch` の印を持つ run(`conclave.convene()` の出力)に対して撃った。**

```
########## (a-1) 紀元の印つき run で、序列の宣言なしに done ##########
  exit=1 (鳴った)
  序列が宣言されていない — 相 "discover" をどの序列で処理したか述べよ (第52条)
    --tier 1 (委譲) / --tier 2 (編成) / --tier 3 (教主の手・例外)
    (判定: no-tier / 相 discover)

########## (a-2) 序列1を宣言したが起動の証跡が無い (第27条) ##########
  exit=1 (鳴った)
  起動の証跡が一つも無い — 序列1を名乗る相 "discover" は誰も起動していない (第27条)
    委ねるべき agent: market-researcher
    node graph/spawn-trace.js record <run> discover --agent market-researcher --tool-use-id <id>

########## (a-3) 序列1を宣言したが自己申告のみ (第5条) ##########
  exit=1 (鳴った)
  自己申告 — 序列1を名乗るが tool_use の証跡が無い (asserted-only)
    「起動した」は主張であって証拠ではない (第5条)

########## (a-4) 序列3を宣言しながら実測が閾値を超える ##########
  exit=1 (鳴った)
  序列3の枠を超えた — files=7 > 2 / churn=1420 > 50 / bytes=58000 > 4096
    本来の序列: 序列2 (編成 — 道の形をとるべき仕事である)
    委ねるべきだった agent: market-researcher

########## (a-5) 序列3を名乗りながら起動を観測 (申告矛盾) ##########
  exit=1 (鳴った)
  申告と実測が食い違う — 序列3(教主の手)を名乗りながら market-researcher の起動が観測されている
    起動したのなら序列1(委譲)と名乗れ
```

**第34条の要求(鳴るだけで直せない門は罠である)を満たしている**: (a-4) は**超えた量と閾値の両方** / **本来の序列名** / **委ねるべきだった agent 名**の3つを言っている。

**器の側 — `spawn-trace.js tier` が exit 1 で鳴るか:**
```
########## (a-6) spawn-trace.js tier ##########
  ═══════ ⚖️  TIER — 申告と実測の突合 (第52条) ═══════
    🔴 discover       序列3        tier3-breach  files=7/2 churn=1420/50 bytes=58000/4096
         序列3の枠を超えた — files=7 > 2 / churn=1420 > 50 / bytes=58000 > 4096
           本来の序列: 序列2 (編成 — 道の形をとるべき仕事である)
           委ねるべきだった agent: market-researcher
  ───────────────────────────────────────────────────
  序列1: 0 / 序列2: 0 / 序列3: 0 / unobservable: 0
  EXIT=1
```

**環と器が同じ判定を下している** (AC-B2)。

**台帳が書き換わらないことも確認した** (AC-A1 / AC-A6):
```
  台帳は書き換わったか: status=running / tierTrace=undefined
```
`markDone` が **throw** するので CLI は `save` に到達しない。

### 3.2 (b) 門相の禁 — 第52条 (d)

```
########## (b) gate 相に --tier 3 を宣言(量は幾ら小さくても) ##########
  exit=1 (鳴った)
  門相は序列3を名乗れない — 相 "verify" は gate である (第9条: 自己批評は独立でなければならない)
    教主が自分の仕事を自分で裁けば、独立は宣言のまま失われる
    委ねるべき agent: verification-loop
    (判定: gate-tier3 / 相 verify)
```

**量を測る前に鳴っている** —— `judge()` の判定順序 #3 が #6(実測)より先に立つ。T3-d は量と無関係だからである。

### 3.3 (c) 統治の免除 — 第52条 (f)【**偽陽性試験**】

**これが無ければ門は「教主が何もできない」機構になる。**

```
########## (c) 統治は裁かれない — 偽陽性試験 (第52条 f) ##########
  ✓ 黙った  exit=0  環を回す: conclave next
  ✓ 黙った  exit=0  照合する: conclave status --json
  ✓ 黙った  exit=0  照合する: conclave status (人向け)
  ✓ 黙った  exit=0  照合する: contract check
  ✓ 黙った  exit=0  照合する: check-agents
  ✓ 黙った  exit=0  照合する: domains check
  ✓ 黙った  exit=0  照合する: wiring check
  ✓ 黙った  exit=0  神と語る: clergy college
  ✓ 黙った  exit=0  照合する: spawn-trace tiers --json
```

**9本すべてが黙った。** しかもこれは白名簿ではない —— 序列の門は `markDone` の中にしか立たないので、それ以外は**定義上鳴らない**(設計 §2.7)。白名簿は必ず漏れるが、門を仕掛ける場所を絞れば漏れようがない。

### 3.4 (d) 紀元の遡及なし — legacy は黄であり、緑を騙らない

```
########## (d) 紀元の遡及なし ##########
  本走行 hasEpoch: false
  tierAudit ok: true  counts: {"序列1":0,"序列2":0,"序列3":0,"unobservable":11}
  全相の verdict: yellow
  spawn-trace verify discover → EXIT=1  (黄は緑ではない・第16条)
  legacy done → state=unobservable / status=done
```

**本走行(この文書を書いている走行)自身が移行対象である。**
- 序列の門で**赤にならない**(11相すべて `unobservable` = 🟡)
- だが `spawn-trace verify` は **exit 1** —— **黄を緑と呼べば移行は抜け穴になる**

```
$ node graph/spawn-trace.js audit | tail -4
  走査 N 件 / unobservable: M (legacy K 走行)
  ✓ 紀元以後の違反は無い — 黄は増えていない
EXIT=0
```

### 3.5 (e) 分野の門 — 論点 C

```
########## (e-1) domains.json から役者の宣言を1件消す ##########
  注入: agents["tdd-guide"] を削除 (実在はしたまま)
  実在の門 check-agents  → EXIT=0 (実在は満たされているので緑が正しい)
  分野の門 domains check → EXIT=1
    ═══ 🎭 DOMAINS — 役者は何を担えるか (第52条) ═══
      分野 14 / 宣言を持つ役者 13 / 道が名指しする役者 13
      🔴 tdd-guide: 分野宣言が無い — 道に載っているのに何を担えるか誰も知らない
           node graph/ordain.js enlist --name tdd-guide --domain <分野> --write
      🔴 実在は満たされていても、適合が宣言されていない (第52条)
  名指ししたか: true
```

**同じ入力に二つの門が違う答えを出している** (AC-C7)。`check-agents` は「名指しされた者が居るか」、`domains` は「居る者が何を担えるか」—— **実在の門をどれだけ強くしても、この穴は塞がらない。**

```
########## (e-2) 綴り違いの分野を名乗らせる ##########
  domains check → EXIT=1
      🔴 architect が台帳に無い分野 "diagrm" を名乗っている — 綴りを確かめよ
```

```
########## (e-3) forge.admit() は担い手の居ない願いを拒むか ##########
  「音楽を作れ」             → ok=false code=no-actor domain=music scale=standard
  「動画を作れ」             → ok=false code=no-actor domain=video scale=standard
  「ゲームのBGMを作曲しろ」    → ok=false code=no-actor domain=music scale=standard
  「ポモドーロタイマーを作れ」  → ok=true  code=-       domain=software scale=standard   ← AC-C4 の回帰

$ node graph/forge.js scale "音楽を作れ"
担い手が居ない — 分野: 音楽・音声 (music)
  道 standard が名指しする役者のうち、この分野を担うと宣言していない者: requirements-analyst, architect, tdd-guide, code-reviewer, ux-reviewer, security-reviewer
  実在するだけでは足りない。適合を宣言していない者に仕事は渡せない (第52条)
  node graph/ordain.js forge --name <役者名> --domain music --cardinal <枢機卿> --rank priest --write
EXIT=1
  「担い手が居ない」を含むか: true
  鍛造器の呼び出し行を含むか: true

  plan --out で拒んだとき → EXIT=1 / ディレクトリを作ったか: false      ← AC-C3
```

**門が厳しすぎて全部止めることも禁じられている** —— 「ポモドーロタイマーを作れ」は通る。

### 3.6 (f) atlas の門 — design.md §8.4 の申し送り

#### (f-1) **本当に溢れる図**を仕込む

`dag` は実測 3312px 溢れており、`scroll:true` を宣言して緑になっている主題である。**宣言を外せば同じ図が赤になる。**

```
########## (f-1) 本当に溢れる図 — dag から scroll:true を外す ##########
  基線: SUBJECTS.dag.scroll = true
  実測: kind=overflow overflow=3312px  reason=第一画面に収まらない (最大 3312px)
  宣言あり(現況): 行の語="scroll(3312px)"  合否=🟢  error=-
  🔥宣言を外す  : 行の語="OVERFLOW"  合否=🔴
     error: 第一画面に収まらない (最大 3312px) — 図は第一画面に収まってこそ図である。巻物でよいなら SUBJECTS に scroll:true と宣言せよ (第47条c)
     「OVERFLOW」の語が出たか: true
     画素数を言ったか: true
     溢れの文言が出たか: true
  🔥check() 実走行: ok=false kind=overflow screen="OVERFLOW"
     門全体: ok=false
  修復後: ok=true screen="scroll(3312px)" / 門全体 ok=true
```

**注入時に赤・修復後に緑の両方を確認した。** `scroll:true` を宣言すると緑になる(§8.4 #1 の期待通り)。

#### (f-2) **実行時故障を注入する** ← **本PRの回帰の本体**

設計 §8.4 の正直な注記は「receipt を模して分類を撃つ形になる」と述べていたが、**本相は実 `archify.mjs` を一時的に stub へ差し替え、`firstScreen` が本当に子を起動して受け取った receipt で分類させた** —— 分類を模すのではなく、**経路を通した**。

```
🔥 注入: 実行時故障 (viewer/visual-check-runtime)
   kind        = inconclusive
   行の語      = 測定不能
   reason      = 第一画面を測定できなかった (描画器の理由: CDP navigation timed out after 15000ms)
   溢れの文言を出すか = 出さない
   巻物で免除されるか = されない
   ✓ 「溢れた」と呼んでいない / overflow=0px (画素を騙っていない)

🔥 注入: 診断ゼロの非ゼロ終了
   kind        = inconclusive
   行の語      = 測定不能
   ✓ 「溢れた」と呼んでいない / overflow=0px

🔥 注入: JSON 不可解 (壊れた出力)
   kind        = inconclusive
   行の語      = 測定不能
   ✓ 「溢れた」と呼んでいない / overflow=0px

🔥 注入: 本当の溢れ (対照)
   kind        = overflow
   reason      = 第一画面に収まらない (最大 2600px)
   巻物で免除されるか = (scroll:true なら)される

🔥 注入: 読めない字 (対照)
   kind        = unreadable
   reason      = 実ブラウザで字が読めない (最小 5.57px / 床 6px) — 箱を広げるのではなく文言を短くするか、流れの向きを変えよ
   巻物で免除されるか = されない                     ← 第48条e
```

**5種の入力が5種の `kind` に正しく分岐している。旧実装はこれらをすべて `reason = "fail"` に畳んでいた。**

**再試行の挙動:**
```
########## 再試行 (間欠故障への備え) ##########
  retry あり → kind=inconclusive retried=true
  ✓ 再試行しても駄目なら赤のまま (判定不能は緑ではない・第16条): ok=false
  間欠(1回目故障・2回目成功) → kind=fits ok=true  ✓ 不定な赤で CI を腐らせない (第34条)
```

#### **旧実装を復元すると、findings §1.1 の記録と一字一句一致した**

```
########## 注入1: atlas の kind 分類を畳み戻す(旧実装の再現) ##########
  注入後の kind = overflow  reason = fail
  試験の assert (kind==='inconclusive') は破れるか: ✓ 破れる(試験は赤くなる)
  → 旧実装では reason が "fail" になる = findings §1.1 の記録と同形
```

findings §1.1 が記録した赤:
```
'standard/conclave: fail — 図は第一画面に収まってこそ図である。…(第47条c)'
```
**先頭語 `fail` は画素の実測値ではなく receipt の status である。** 設計 §8.1 の断定が、本相の故障注入で**再現された**。

#### (f-3) 読めない字 — 巻物が在っても赤

```
  免除の条件行: const scrollOk = fs2.ok || (fs2.kind === 'overflow' && SUBJECTS[subject].scroll === true && !fs2.unreadable);
  → unreadable / inconclusive は scroll:true でも免除されない: true
  分類の語彙: ["fits","overflow","unreadable","skipped","inconclusive"]
```

**巻物の許しは「長さ」への許しであって、「読めなさ」への許しでも「測らなかったこと」への許しでもない。**

### 3.7 (g) 鍛造器の門 — 壊れた agent 定義

```
########## (g) 壊れた agent 定義を鍛造させる ##########
  ✓ 拒んだ  分野宣言なし
       - --domain が無い — 担える分野を宣言されない役者は道に載せられない (第52条)
  ✓ 拒んだ  台帳に無い分野
       - 分野 "nosuchdomain" が台帳に無い — 既知: software, research, diagram, music, video, ...
  ✓ 拒んだ  実在しない位階
       - 位階 "archbishop" は clergy.RANKS に無い — 既知: god, pontiff, cardinal, priest, believer, executor
  ✓ 拒んだ  方針に反する model
       - model "haiku" は位階 priest の方針(claude-sonnet-5)に反する — apply-models verify が後で鳴る
  ✓ 拒んだ  枢機卿が COLLEGE に無い
       - 枢機卿 "nosuch" が COLLEGE に無い — 既知: discovery, requirements, architecture, construction, quality, counsel, cartography
  ✓ 拒んだ  名前の衝突(既存 agent)
       - 名 "architect" は既存の agent と衝突する — 名の混同は事故を生む (第17条)
  ✓ 拒んだ  名が無い
       - --name が無い — 名の無い役者は鍛造できない
  ✓ 拒んだ  名の綴りが不正
       - 名は小文字と連字符のみ: "Video_Producer"

  CLI (--write つき・要件を欠く) → EXIT=1
    🔴 鍛造できない — 2 件の欠け (第52条: 後の門が鳴るのではなく、鍛造の時点で鳴る)
  overlay/agents は変わったか: ✓ 1バイトも変わっていない
```

**`--write` を付けても1バイトも書かない。** 「後の門が鳴るのではなく、鍛造の時点で鳴る」(AC-D5)が満たされている。

---

## 4. 【3】偽陽性を撃つ — **神が許した序列3の正当な例外が本当に通る**

> 「門は『鳴るべき時に鳴る』だけでなく『**鳴るべきでない時に黙る**』ことで証明される。
>  ここが赤くなる門は、神託に反する門である。」

既存の試験は `judge()` に `measured` を**渡して**判定表を撃っていた。**それは判定の証明であって、測る器の証明ではない。**
本相は**清浄な git 作業場**を建て、そこに本物の手仕事を行い、`measure()` に実測させて `markDone` を通した。

```
清浄な作業場: C:\Users\kikus\AppData\Local\Temp\tier3-sandbox-dRy4tm
  git status --porcelain → ""

########## ⑦ 序列3の正当な例外 — 実測経路で通るか ##########
  行った仕事: 1ファイル新規 / 3行 / 41 bytes
  実測 (measure): files=2 churn=5 bytes=41 measurable=true
  ✓ markDone 通った: state=序列3
  序列3: 教主の手 (files=2/2 churn=5/50 bytes=41/4096)
  台帳: status=done / tierTrace={"files":2,"churn":5,"bytes":41}
  ═══════ ⚖️  TIER — 申告と実測の突合 (第52条) ═══════
    ✓ discover       序列3        序列3  files=2/2 churn=5/50 bytes=41/4096
  ───────────────────────────────────────────────────
  序列1: 0 / 序列2: 0 / 序列3: 1 / unobservable: 0
  spawn-trace tier EXIT=0
  gauge.score = 100  tier3=6 tier3Ratio=1.00
```

**完了条件⑦ のすべてを満たしている:**
- ✅ `conclave done` が **exit 0**
- ✅ stdout に **`序列3`** と **実測3量・閾値3つ**(`files=2/2 churn=5/50 bytes=41/4096`)
- ✅ `spawn-trace tier` も **exit 0**(環と器が割れていない)
- ✅ **`gauge.score` が 100** —— **神託の訂正が許した例外を秤が罰していない**(AC-H4-2)

**対照 — 同じ実測経路で、大きい手仕事なら赤:**
```
########## ⑦対照 ##########
  exit=1 (鳴った)
  序列3の枠を超えた — files=7 > 2 / churn=1010 > 50
    本来の序列: 序列2 (編成 — 道の形をとるべき仕事である)
    委ねるべきだった agent: market-researcher
  台帳は書き換わったか: status=running / tierTrace=undefined
```

**同じ器・同じ経路で、量だけが判定を分けている。** 名乗りではなく実測が裁いている(第52条 c)。

### 4.1 境界を固定した — 神が許した縁を狭めさせない

```
  境界ちょうど (files=2 churn=50 bytes=4096) judge.ok = true    ← 閾値は「以下」
  files=3    → ok=false ✓ 鳴った
  churn=51   → ok=false ✓ 鳴った
  bytes=4097 → ok=false ✓ 鳴った
```

**境界は門の最も嘘をつきやすい場所である。** `>` を `>=` に狭めれば神が許した例外が1つ削られる —— 回帰試験がそれを禁じる:

```
########## 注入2: 閾値を「未満」に狭める(神が許した縁を削る) ##########
  境界ちょうど ok = false
  試験の assert (境界は通る) は破れるか: ✓ 破れる(試験は赤くなる)
```

---

## 5. 足した回帰試験が**本当に赤くなる**ことの確認

**「試験を書いた」は主張である。** 注入時に赤くなることを、engine に故障を戻して実測した。

```
✓ 試験が在る: atlas: 本当に溢れる図は OVERFLOW と画素数で鳴る
✓ 試験が在る: atlas: 描画器の実行時故障を「溢れた」と呼ばない
✓ 試験が在る: 第52条: 序列3の例外は**実測経路**で通る
✓ 試験が在る: 第52条: 序列3の閾値は「以下」である
✓ 試験が在る: 鍛造器が実際に産んだ役者は既存の発令を乗っ取らない

########## 注入1: atlas の kind 分類を畳み戻す(旧実装の再現) ##########
  注入後の kind = overflow  reason = fail
  試験の assert (kind==='inconclusive') は破れるか: ✓ 破れる(試験は赤くなる)

########## 注入2: 閾値を「未満」に狭める ##########
  境界ちょうど ok = false
  試験の assert (境界は通る) は破れるか: ✓ 破れる(試験は赤くなる)

########## 注入3: 鍛造器を先頭挿入に戻す(本相が直した欠陥) ##########
  注入後の misrouted = 2
     🔴 build: 宣言 architect → 発令 video-producer-probe
     🔴 build-ui: 宣言 architect → 発令 video-producer-probe
  試験の assert (misrouted===0) は破れるか: ✓ 破れる(試験は赤くなる)

--- 完 (engine は全て書き戻した) ---
```

**3本すべてが、直した欠陥を戻すと破れる。** 門を通すために門を弱めた箇所は一つも無い。

---

## 6. 鳴らなかった門と、その扱い

| 門 | 鳴らなかったこと | 判断 |
|---|---|---|
| `check-agents` (分野宣言の削除時) | **正しい。** 実在は満たされている。適合を問うのは `domains.js` である(AC-C7 が明示的に要求した分業) | そのまま |
| `atlas check` (`ARCHIFY_CHROME` を不正な実行ファイルに向けたとき) | `kind=skipped`(🟢)。**正しい。** Chrome 不在は harness の不在であり、図の欠陥ではない。存在しないものを責めない | そのまま。**実行時故障の注入は `archify.mjs` 自体の差し替えで行った**(§3.6 f-2) |
| 統治行為9本 | **正しい。** これが (c) の偽陽性試験の目的である | そのまま |
| `apply-models verify` (鍛造直後) | **正しい。** model/effort が `clergy.modelFor` から生成されるので、方針違反が構造的に起きない | そのまま |

**「鳴らなかったから直す」のではなく、「鳴るべきだったか」を一件ずつ判断した。**

---

## 7. 終わりの検め

```
$ node tests/paradise.test.js 2>&1 | tail -2

Paradise self-test: 318 passed, 0 failed
EXIT=0

$ PARADISE_UPSTREAM=/nonexistent CLAUDE_HOME=/nonexistent node tests/paradise.test.js 2>&1 | tail -2

Paradise self-test: 318 passed, 0 failed
EXIT=0
（**harness が無い環境でも同じ数** — 門は不在を欠陥と呼ばない）

$ node graph/check-agents.js && node graph/wiring.js check && node graph/domains.js check
EXIT=0

$ node graph/codex.js check && node graph/deploy.js check
EXIT=0

$ node graph/apply-models.js verify && node graph/apply-spawn.js verify
EXIT=0

$ node graph/census.js check
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
EXIT=0
（README の試験数を 318 に直した後。**直す前は `doc says 312, reality is 318` で正しく鳴った** — 第22条)

$ node graph/spawn-trace.js audit | tail -3
  走査 8 件 / unobservable: 94 (legacy 8 走行)
  ✓ 紀元以後の違反は無い — 黄は増えていない
EXIT=0

$ node graph/atlas.js check | tail -4
  ✓ run         [lifecycle   ] 9/9  fits          動 13   726618b
  ✓ wiring      [architecture] 9/9  fits          動 87   773011b  standard(最小交差 64)
────────────────────────────────
  ✓ 6 主題すべてが検査に通る（うち 1 件は平面化不能のため standard: wiring）
EXIT=0
（**`OVERFLOW` の語は現れない** — AC-F1）

$ node graph/conclave.js status --run reform/pontiff-office/conclave.json --json
EXIT=0

$ node graph/spawn-trace.js tiers --json
{"epoch":"v1","TIERS":{"t3":{"files":2,"churn":50,"bytes":4096},"t2":{"files":10,"churn":880,"artifacts":2,"domains":2}}}
EXIT=0
（**7つの閾値がすべて現れる** — AC-G2）

$ git status --short
 M README.md                            ← 試験数 (第22条)
 M graph/ordain.js                      ← P-1 / P-2 の修復
 M reform/pontiff-office/conclave.json  ← 環の台帳
 M tests/paradise.test.js               ← 回帰試験 6本 + 作業場の隔離 (P-3)
?? reform/pontiff-office/prove.md       ← 本文書
```

**故障注入に使った一時ファイルは一つも残っていない。**

---

## 8. 本相が触ったもの

| ファイル | 何を変えたか | なぜ |
|---|---|---|
| `graph/ordain.js` | `writeCollege()` を**末席挿入 + 末席検証**へ / `renderAgent()` の起動権能を**枢機卿の編成から導く** | **本相が実鍛造で発見した2件の欠陥(P-1 / P-2)。門を弱めず engine を直した** |
| `tests/paradise.test.js` | 回帰試験 **6本**を追加 / atlas を撃つ試験の作業場を**プロセス固有**にし、固定名の一時ファイル3件も pid 付きへ(P-3) | 注入時に赤・修復後に緑を両方確認済み |
| `README.md` | 試験数 `312/312` → `318/318` | 第22条 —— `census check` が実測と突き合わせる |
| `reform/pontiff-office/prove.md` | 本文書 | — |

**触っていないもの:**
- `~/.claude` — **一度も手で編集していない**(全て `overlay/` → `deploy.js --write`)
- `forge.chooseScale` — 一行も触っていない
- `atlas.SUBJECTS` の `scroll` 宣言 — **図は直していない。門を直したのは建造相であり、本相はそれが鳴ることを証明しただけである**
- `spawn-trace.TIERS` の閾値 — 一つも動かしていない
- 注入に使った一時ファイル — **すべて消した**

---

## 9. 本相の正直な注記

1. **`(f-2)` の実行時故障は、実際の CDP タイムアウトを再現したものではない。**
   設計 §8.4 の正直な注記に従い、`archify.mjs` を stub へ差し替えて **receipt の実経路**を通した。
   証明できたのは「その receipt を受け取ったとき門が `inconclusive` と分類し、溢れの文言を出さない」ことである。
   **「Chrome が実際に何秒で落ちるか」は本相も測っていない。** この区別は保った。

2. **鍛造した役者を消した判断は、本相の判断である。**
   残せば `domains.json` に居るがどの相からも呼ばれない役者になる(第44条)。
   `video` の道を開くには `standard` の6名全員に宣言が要り、それは道の改修 = reform の道の仕事である(第23条)。
   **経路の証明は回帰試験が毎回産ませて毎回消す形で保持される** —— 痕跡ではなく機構で保つ。

3. **P-1 は `clergy.js` 側でも直せた**(`PHASE_LEAD` に `build` / `build-ui` を書く)。
   採らなかった理由: **それは症状を潰す直し方**であり、次に鍛造する役者がまた別の相を横取りする。
   `PHASE_LEAD` を持たない相は今後も生まれる。**「鍛造は序列を入れ替えない」という不変条件を鍛造器側に置く方が、穴が塞がる。**

4. **`(c)` の偽陽性試験は9本しか撃っていない。** requirements §2.5 は G-1〜G-9 を数えており、本相はそれに対応する9本を撃った。
   **統治行為の全数を数え上げたわけではない**(白名簿は必ず漏れる・第21条)。
   だが門が `markDone` 一箇所にしか立たないことは設計上の保証であり、9本はその**抜き取り検査**である。

5. **本走行自身が legacy である。** `reform/pontiff-office/conclave.json` は `epoch` を持たない。
   ゆえに本相の `done` も `unobservable`(🟡)として刻まれる。**この文書を書いている相自身が移行対象である。**

6. **P-3 の回帰試験は並走そのものを再現していない。**
   固定して撃っているのは「試験ファイルに固定名の作業場が残っていない」という**不変条件**である。
   本物の並走(6主題 × 5道 × 2プロセス)は本相が**手で実測して再現し、修復後に緑になることも実測した**が、
   自己診断の中に入れれば門が己の重さで腐る(第34条)。**この区別は保った。**
   実測の生の出力は §0.4 に全部載せた。

7. **教主が見た赤は、本PRが建てた門が正しく働いた証拠でもあった。**
   旧実装ならあの ENOENT は「溢れた。巻物と宣言せよ」という**嘘の診断**になっていた。
   本PRの `kind` 分類が「測定できなかった」と正直に名乗ったからこそ、**真因(作業場の共有)を探しに行けた。**
   **門が正しい語で鳴ることは、直せることと同義である**(第34条)。
