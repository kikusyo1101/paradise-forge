# rework — quality 枢機卿の差し戻しを engine で塞ぐ

**相**: rework (reform の道 第9相) / **立場**: construction の再建造
**対象**: `reform/pontiff-office` の BLOCK 1件 + HIGH 2件 + MEDIUM 4件
**日時**: 2026-09-03
**指摘の出所**: `review.md` (code-reviewer) / `security-report.md` (security-reviewer)

---

## 0. 裁定

| 指摘 | 級 | 塞いだか | 回帰試験 | 注入で赤 |
|---|---|---|---|---|
| **B-1** `measure()` が git の失敗を「変更ゼロ」と読み序列3の門が fail-open | **BLOCK** | ✅ | 3本 | ✅ |
| **S-1** `ordain.js --description` の frontmatter インジェクション | **HIGH** | ✅ | 1本 | ✅ |
| **S-2** prototype 汚染による `validate()` バイパス | **HIGH** | ✅ | 1本 | ✅ |
| S-3 `--write` が非トランザクション(孤児が実機へ配備される) | MEDIUM | ✅ | 1本 | ✅ |
| S-4 `measure()` の非有界 `readFileSync` → catch 不能な OOM (exit 134) | MEDIUM | ✅ | 1本 | ✅ |
| S-5 `verify --only <綴り違い>` が 0門を撃って exit 0 | MEDIUM | ✅ | 1本 | ✅ |
| M-3 `--scale full` を渡しても `admit()` が quick の名簿しか検めない | MAJOR | ✅ | 1本 | ✅ |
| M-4 状態値に日本語リテラル `'序列3'` が混在 | MAJOR | ✅ | 1本 | ✅ |
| M-1 統治免除の理屈が files/churn について実装と一致していない | MAJOR | ❌ | — | **直せない** (§4) |
| M-2 門は `markDone` 一箇所にしかなく、環の外の仕事は捕捉できない | MAJOR | ❌ | — | **直せない** (§4) |

**自己診断: 328 passed / 0 failed**(rework 相で **+10本**、318 → 328)。
**9件の注入すべてが「注入したら赤・修復後に緑」を満たすことを実走で確認した**(§3)。

**門は一つも弱めていない。** 直したのは engine である。
`forge.chooseScale` は一行も触っていない。`~/.claude` は一度も手編集していない。

---

## 1. BLOCK — B-1: 序列3の門の fail-open

### 1.1 何が壊れていたか

`gitOut()` (`graph/spawn-trace.js`) が **ENOENT・非gitディレクトリ・壊れた index・
権限拒否を区別せず全て `null` に潰し**、`measure()` がそれを握り潰して
**「測れなかった」を「変更ゼロ (files=0 / churn=0)」として返した。**
`judge()` の段6はその 0 を実測値と信じ、閾値超過なしとして 🟢 を出した。

安全弁 `measurable` は `!!t0 || commitsMeasurable || diff != null` と書かれ、
`t0` は `markRunning` が必ず刻むので **git が完全に死んでいても真**になった。
**しかも `judge()` はその鍵を一度も読まなかった。**

#### 教主の再現(修復前の生の出力)

```
$ node -e "... measure/judge を非gitディレクトリで撃つ ..."
A) 非gitディレクトリでの measure = {"files":0,"churn":0,"bytes":8,
     "t0":"2026-09-03T07:50:06.427Z","t1":"...","measurable":true,"fileList":[]}
A) judge = {"ok":true,"verdict":"green","state":"序列3",
     "lines":["序列3: 教主の手 (files=0/2 churn=0/50 bytes=8/4096)"]}
  実際には 41 ファイル / 20000行 の手仕事が在る
```

**41ファイル・20,000行の手仕事が「files=0 / churn=0」として緑になった。**

### 1.2 どう塞いだか

**根本原因は「測って 0」と「測れなくて 0」を同じ 0 で表現していたことである。**
`atlas.js` が `kind:'inconclusive'` で既に正しく答えている問いを spawn-trace へ持ち込んだ。

1. **`gitOut()` が成否と出力を分けて返す** — `null` で二つのことを表現しない
   ```js
   { ok: true,  out: '<stdout>' }        撃てた(出力が空でも撃てた)
   { ok: false, reason: '<なぜ>' }       撃てなかった = 測定不能
   ```
2. **`measure()` が `unmeasured[]` に理由を積む。** `measurable` は
   **三つの git 問い合わせが全て撃てたときだけ真**(`unmeasured.length === 0`)。
   `t0` の欠落も測定不能に数える(doc comment が元から宣言していた通り)。
3. **`judge()` が `measurable` を実際に読む** — 段 6a を新設し、
   偽なら **第5の状態 `inconclusive` で赤**を返す。
4. **`unobservable` と分ける**(第36条: 別の問いには別の器):
   - `unobservable` … 機構が無かった時代の走行。走行者に罪は無い → 🟡
   - `inconclusive` … **機構は在るのに測れなかった**。序列3の主張が未検証 → 🔴
5. `tierAudit()` の赤の一覧に `inconclusive` を加えた ——
   `conclave.json` に刻まれた測定不能も後から赤で鳴る。

### 1.3 修復後の生の出力(同じ経路・同じ入力)

```
A) 非gitディレクトリでの measure = {"files":0,"churn":0,"bytes":8,"measurable":false,
  "unmeasured":[
    "コミット済みの差分を測れない: git log が exit 128 で失敗 (非gitディレクトリ・壊れた index・権限拒否のいずれか)",
    "未コミットの差分を測れない: git diff が exit 129 で失敗 (…)",
    "未追跡ファイルを測れない: git status が exit 128 で失敗 (…)"]}
A) judge = {"ok":false,"verdict":"red","state":"inconclusive"}
序列3を実測できなかった — 測れなかったものを「閾値内」と報告しない (第16条)
  コミット済みの差分を測れない: git log が exit 128 で失敗 (…)
  未コミットの差分を測れない: git diff が exit 129 で失敗 (…)
  未追跡ファイルを測れない: git status が exit 128 で失敗 (…)
  この相が序列3の枠に収まっていたことは**検証されていない**。緑は出せない
  git が撃てる作業場で done を刻み直すか、序列1(委譲)として為せ
  委ねるべき agent: architect
```

**鳴るだけでなく次に何をすべきかを言う**(第34条)。

### 1.4 回帰試験(3本・すべて**非gitディレクトリの実経路**で撃つ)

- `B-1: 序列3の門は git の失敗で fail-open しない — 非gitディレクトリの実経路で撃つ`
  合成した `measured` を渡さない。本当に非gitディレクトリで `measure()` させ、
  `measurable:false` / `verdict:'red'` / `state:'inconclusive'` / 文言 / `markDone` の throw /
  **台帳が書き換わらないこと**まで撃つ。最後に **git を与えるだけで同じ手仕事が緑になる**ことを確かめる。
- `B-1: git が居ない環境 (ENOENT) でも緑を出さない` — `PATH` を奪った子プロセスで実経路を撃つ。
- `B-1: 測定不能は audit / tier でも赤である — 刻まれた黄と混ぜない`
  `tierAudit` の赤・`counts.unobservable === 0`・器 (`spawn-trace.js tier`) の exit 1 まで。

---

## 2. HIGH

### 2.1 S-1 — `--description` の frontmatter インジェクション

**塞ぎ方**: `frontmatterSafe()` を新設し、**改行・`---`・制御文字を含む
`--description` を鍛造の時点で拒む**。1行へ畳んで黙って通さない ——
畳めば攻撃は消えるが、渡した者は自分の文字列が書き換わったことを知らない(第34条)。

**二重の守り**: `renderAgent()` は export されており `plan()` 以外からも呼ばれうる。
**frontmatter を書く器が自分で自分の不変条件を守る** —— 呼び手の作法に依存する守りは守りではない。
`validate()` が通した後でも `renderAgent()` は自力で throw する。

**回帰試験** `S-1 [HIGH]: --description の frontmatter インジェクションを鍛造の時点で拒む`:
審査官が使ったのと同じ攻撃文字列を `validate` / `plan` / `renderAgent` の3経路へ撃ち、
さらに **`apply-models.js` の実パーサ正規表現 `/^---\r?\n([\s\S]*?)\r?\n---/` そのもの**で
生成物を切り出して `model` が位階方針 (`clergy.modelFor`) と一致することを確かめる。
`fable` / `xhigh` が定義に残っていないことも撃つ。

### 2.2 S-2 — prototype 汚染バイパス

**塞ぎ方**: 三点を同時に。

1. `owns(obj, key)` = `Object.prototype.hasOwnProperty.call(...)` へ全ての存在検査を置換
   (`led.domains` / `clergy.RANKS` / `clergy.COLLEGE`)。
2. `--domain` / `--cardinal` / `--rank` に **`--name` と同じ綴りの規則** `KEY_RE = /^[a-z][a-z0-9-]*$/` を課す。
3. `writeCollege()` が **正規表現へ差し込む前に**綴りと実在を自力で検める ——
   審査が「到達しなかったのは偶然の綴りによるもので、設計上の防壁ではない」と正しく述べた箇所である。

**回帰試験** `S-2 [HIGH]: prototype の鍵で validate を素通りできない`:
`constructor` / `toString` / `valueOf` / `__proto__` / `hasOwnProperty` の5鍵 ×
`domain` / `cardinal` / `rank` の3欄 = **15通り**を撃つ。
`--rank constructor` が計画に到達しないこと(第34条の罠)、
`writeCollege('construction*', …)` が正規表現メタ文字を拒むこと、
**`domains.json` が1バイトも汚れていないこと**まで確かめる。

---

## 3. 「注入したら赤・修復後に緑」の実走(第21条)

**門がそう書かれていることは、門がそう鳴ることの証明ではない**(第5条)。
ゆえに直しを engine から**抜き戻して**、各回帰試験が実際に赤くなることを撃った。
(注入器は `.inject-proof.js`。走行後に engine を必ず元へ戻す。作業場には残さない。)

```
─── B-1 ─── 注入: gitOut の失敗を null に潰し、measurable を旧式へ戻す
  【注入時】 exit 1
    ✗ B-1: 序列3の門は git の失敗で fail-open しない — 非gitディレクトリの実経路で撃つ
    非gitディレクトリで measurable:true — 「測れたか」を名乗る鍵が嘘をついている
  【修復後】 exit 0
    ✓ B-1: 序列3の門は git の失敗で fail-open しない — 非gitディレクトリの実経路で撃つ

─── B-1-audit ─── 注入: tierAudit の赤の一覧から inconclusive を抜く
  【注入時】 exit 1
    ✗ B-1: 測定不能は audit / tier でも赤である — 刻まれた黄と混ぜない
  【修復後】 exit 0
    ✓ B-1: 測定不能は audit / tier でも赤である — 刻まれた黄と混ぜない

─── M-4 ─── 注入: gauge が旧い綴りだけを見る形へ戻す
  【注入時】 exit 1
    ✗ M-4: 序列3の state は機械の鍵として ASCII である — 旧い台帳も読める
  【修復後】 exit 0
    ✓ M-4: 序列3の state は機械の鍵として ASCII である — 旧い台帳も読める

─── S-1 ─── 注入: description の無害化を外す
  【注入時】 exit 1
    ✗ S-1 [HIGH]: --description の frontmatter インジェクションを鍛造の時点で拒む
    注入された description を受理した — 方針の保証が破れている
  【修復後】 exit 0
    ✓ S-1 [HIGH]: --description の frontmatter インジェクションを鍛造の時点で拒む

─── S-2 ─── 注入: hasOwnProperty の存在検査を素の鍵参照へ戻し、綴りの規則も外す
  【注入時】 exit 1
    ✗ S-2 [HIGH]: prototype の鍵で validate を素通りできない
    --domain constructor が検証を通った — prototype の鍵で門を素通りできる
  【修復後】 exit 0
    ✓ S-2 [HIGH]: prototype の鍵で validate を素通りできない

─── S-3 ─── 注入: forge の巻き戻しを外す
  【注入時】 exit 1
    ✗ S-3 [MEDIUM]: 途中で落ちた鍛造は孤児を残さない — 全か無かである
    孤児の定義が残っている — 次の deploy で実機へ配備される
  【修復後】 exit 0
    ✓ S-3 [MEDIUM]: 途中で落ちた鍛造は孤児を残さない — 全か無かである

─── S-4 ─── (engine 内で注入済み — 試験自身が旧実装を複製して撃つ)
  修復後: exit 0
  ✓ S-4 [MEDIUM]: 巨大な未追跡ファイルで measure が死なない — 上限で足切りする

─── S-5 ─── 注入: --only の綴り検査を外す
  【注入時】 exit 1
    ✗ S-5 [MEDIUM]: verify --only の綴り違いは 0門を撃って緑にならない (第37条)
  【修復後】 exit 0
    ✓ S-5 [MEDIUM]: verify --only の綴り違いは 0門を撃って緑にならない (第37条)

─── M-3 ─── 注入: admit が引数の scale を無視して chooseScale を呼び直す形へ戻す
  【注入時】 exit 1
    ✗ M-3: --scale を明示したら admit は**その道の名簿**を裁く
  【修復後】 exit 0
    ✓ M-3: --scale を明示したら admit は**その道の名簿**を裁く

✓ 全件が「注入したら赤・修復後に緑」を満たす
```

**S-4 だけは注入器を要さない。** 試験自身が engine の上限行を旧実装へ書き換えた
複製を作り、`--max-old-space-size=96` の子プロセスで 40 MiB / 2,100万行のファイルを
食わせて **落ちること (exit ≠ 0) を確かめてから**、実物の engine が落ちないことを撃つ。
V8 のヒープ枯渇は `try/catch` では捕まらないので、故障注入は子プロセスでしか撃てない。

---

## 4. 直していない指摘と、その理由

**黙って落としていない。以下は「直せない」または「本 rework で直すべきでない」と判断した。**

### M-1 [MAJOR] 統治免除の理屈が files/churn について実装と一致していない — **直していない**

審査の指摘は正しい。`requirements` は「序列の門は登録された成果物だけを見る」と説明するが、
実際にそうなのは `bytes` だけで、`files` / `churn` は `git log` / `git diff` / 未追跡で
**リポジトリ全体**を見る。免除は成立していない。

**直さなかった理由**: これを直すには **「相に帰属する変更」の定義そのもの**を
変える必要があり、二つの道はどちらも本 rework の範囲を超え、かつ**新たな fail-open を作る**:

- **(a) artifact 配下だけを測る** → 序列3の門は**手仕事をほぼ全て見逃す**。
  `measure()` の doc comment が実測で否定している道である
  (「委譲の証跡を持つコミットは 113件中 0件」= 教主の手仕事は artifact 外にも及ぶ)。
  **B-1 を塞いだ直後に、より大きな fail-open を開けることになる。**
- **(b) 統治行為に白名簿を置く** → `design.md:251` が既に
  「白名簿は必ず漏れる」と正しく退けている道である。

すなわち**「免除の理屈を実装に合わせる」のは requirements の書き換え(要求相の領分)であり、
engine の直しではない。** 現在の実装は**過大評価の側**(赤は出るが緑は出ない = fail-safe)へ
倒れており、**B-1 と違って門を空文にする向きではない。**
`requirements.md` の §2.5 が事実と食い違っている点は、要求相へ差し戻すべき指摘である。

### M-2 [MAJOR] 門は `markDone` 一箇所にしかない — **直していない**

審査自身が「これは BLOCK ではない。本PRの範囲(環の中の序列を機械化する)を超える」と
述べている。環に載せずに engine を書き換えれば `judge()` は一度も呼ばれない。
**これを塞ぐには「環の外の仕事を発見する機構」が要り、それは新しい設計相を要する。**

ただし審査が求めた**「範囲外であることの明示」は本 rework で果たしていない** ——
`prove.md` への一文の追記は散文の相の仕事である。**この一文が要ることをここに記して申し送る。**

### m-1 / m-2 / m-4 / n-1〜n-4 / S-6 / S-7 / S-8 — **直していない**

課題文が「上の3件の後」と優先度を定めた MEDIUM までを塞いだ。
残りは MINOR / NIT / LOW であり、いずれも**門を空文にする向きではない**。
特に記すべきもの:

- **S-6 / m-3(裸の `--tier` が `1` として通る)**: 実害は無い(結局 `no-trace` で赤になる)が、
  `tierTrace[id].declared` に `1` が刻まれる点で監査記録が不正確である。
  **これは `conclave.js` の `parse()` の流儀(値なしフラグ = `true`)に触る変更であり、
  同じ `parse()` を使う他の全フラグの挙動を動かす。** 本 rework の範囲外とした。
- **m-4(`dirBytes` がサブディレクトリを 0 として数える)**: B-1 と同じ病の小型版であり、
  fail-open の向きである。**塞ぐ価値は在るが、`--artifact` にディレクトリを渡す運用が
  現状無い**(実測: 全 conclave.json の artifactPath はすべてファイル)ため、
  優先度を落とした。再帰化は数行で済むので、次の rework で塞げる。
- **S-8(個人メールの新規混入)**: `findings.md` への `git shortlog` の貼り付けであり、
  **審査相の成果物であって engine ではない。** 消すかどうかは神の判断に属する。

---

## 5. MEDIUM / MAJOR の塞ぎ方(要点)

### S-3 — `forge --write` を全か無かにした
書く前に触りうる**4ファイル全ての原本を退避**し、一つでも落ちたら**一括で戻す**
(存在しなかったファイルは削除する)。`require` キャッシュも落とす ——
巻き戻したのに古い読み込みが残れば同じ罠である。
**回帰試験は `fs.writeFileSync` を差し替えて最後の段(`domains.json`)だけを失敗させ**、
`overlay/agents/` の顔ぶれ・3ファイルの中身・`overlay.json` の `own.agents` が
**1バイトも動いていないこと**を撃つ。

### S-4 — `measure()` に読み込み上限
`MAX_UNTRACKED_READ = 1 MiB`。超えたものは **64 バイト/行で下から見積もる** ——
`t3.bytes` の閾値が 4096 である以上、巨大ファイルを正確に数える意味は無い。
見積りは**過大評価の方向にしか働かない**(赤は出るが緑は出ない) = fail-safe。

### S-5 — `verify --only` の綴り違いを赤にした
GATES に無い名が一つでも在れば **exit 1 + 名指し**。`gates.length === 0` も緑にしない。
**撃たなかった門を通ったと呼べば、それは第16条の engine 自身による違反である。**

### M-3 — `admit(wish, scale)`
**`chooseScale` は一行も触っていない**(試験が11箇所で直に呼び、文字列を assert している)。
`admit` が第2引数を受け、実在する道名ならその名簿を裁く。CLI は `--scale` の
綴り違いを **`admit` より前に** exit 2 で拒む —— 選定へ黙って落ちた名簿で裁定を騙らないため。
**回帰試験は full にだけ載る役者から分野宣言を奪う故障注入**で、
`--scale full` が赤・選定された道は緑(偽陽性を出さない)・器の exit 1 まで撃つ。

### M-4 — 状態値を ASCII の機械鍵へ
`TIER3_STATE = 'tier3'` を新設。**散文の文言(`序列3: 教主の手 …`)は一字も変えない。**
旧い綴り `'序列3'` は `conclave.json` に**永続化されている**ので、
`isTier3State()` が新旧どちらも受ける(**書くのは常に ASCII、読むときだけ旧も受ける**)。
`report` / `tierAudit` / `gauge` の3箇所すべてがこの一つの述語を呼ぶ ——
**定義が二箇所に住めば必ず食い違う**(第41条)。

---

## 6. 終わりの検め(生の出力)

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
```

```
$ PARADISE_UPSTREAM=/nonexistent CLAUDE_HOME=/nonexistent node tests/paradise.test.js
Paradise self-test: 328 passed, 0 failed
EXIT=0
```

```
$ node graph/check-agents.js && node graph/wiring.js check && node graph/domains.js check
check-agents=0
wiring=0
domains=0

$ node graph/census.js check && node graph/codex.js check && node graph/deploy.js check
codex=0
deploy=0
（census は README のテスト数 318 が実測 328 と食い違うと正しく鳴った ——
  門が仕事をした証拠である。README を 328 へ改めて緑に戻した）

$ node graph/apply-models.js verify && node graph/apply-spawn.js verify
apply-models=0
apply-spawn=0

$ node graph/spawn-trace.js audit
  走査 8 件 / unobservable: 94 (legacy 8 走行)
  ✓ 紀元以後の違反は無い — 黄は増えていない
  exit 0

$ node graph/spawn-trace.js tiers --json
{"epoch":"v1","TIERS":{"t3":{"files":2,"churn":50,"bytes":4096},
  "t2":{"files":10,"churn":880,"artifacts":2,"domains":2}}}   ← 閾値は一つも動かしていない
```

---

## 7. 触ったもの / 触っていないもの

**変更**:
- `graph/spawn-trace.js` — B-1(gitOut / measure / judge / tierAudit)、S-4、M-4
- `graph/ordain.js` — S-1、S-2、S-3、S-5
- `graph/forge.js` — M-3(`admit` に第2引数。**`chooseScale` は不変**)
- `graph/gauge.js` — M-4(1行。`isTier3State` を借りる)
- `tests/paradise.test.js` — 回帰 +10本、既存1本を `TIER3_STATE` 参照へ
- `README.md` — census が鳴らしたテスト数 318 → 328

**触っていない**: `forge.chooseScale` / `~/.claude` / `TIERS` の7つの数 /
`spawn-trace.report()` の既存4鍵 / `judge()` の判定順 1〜5 / `conclave.markDone` の構造 /
出力の散文(「序列3: 教主の手 …」は一字も変えていない)。

**作業場**: `git status` に残るのは意図した変更のみ。注入器 `.inject-proof.js` は
証明を走らせた後に削除した(engine は必ず元へ戻る形で書いてある)。
