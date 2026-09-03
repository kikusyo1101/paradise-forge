# 保安審査 — reform/pontiff-office

**相**: security (reform の道 第7相) / **審査者**: @security-reviewer
**対象**: `git diff main...HEAD` (22ファイル / +7,007 / -64)
**審査日**: 2026-09-03
**基準**: 楽園の engine は**開発者の環境で走る**。危害の射程は creations より広い。
creations の掟(単一HTML・外部依存ゼロ)ではなく、**開発機のファイル系・子プロセス・
CI の権限**を射程として検めた。

---

## 0. 裁定

| 危険度 | 件数 | 見出し |
|--------|------|--------|
| CRITICAL | 0 | — |
| HIGH | 2 | S-1 frontmatter インジェクション / S-2 prototype 汚染による検証バイパス |
| MEDIUM | 3 | S-3 --write の非トランザクション性 / S-4 measure() の非有界メモリ / S-5 verify --only の無音空振り |
| LOW | 3 | S-6 --tier の真偽値強制 / S-7 artifactPath の無制約 stat / S-8 個人メールの新規混入 |
| 無し(確認済) | 5 | N-1 コマンド注入 / N-2 任意コード実行 / N-3 ReDoS / N-4 CI 権限 / N-5 秘密の混入 |

**CRITICAL は無い。** 本PRを保安の理由で差し戻す必要は無い。
ただし **S-1 と S-2 は `ordain.js` という「ファイルを生成して配備する engine」に
在る欠陥であり、いずれもマージ前に塞ぐべきである。** 理由は S-1 の項に述べる。

**本報告は指摘のみである。一行も直していない。**

---

## 1. HIGH

### S-1 [HIGH] `ordain.js --description` による frontmatter インジェクション — 生成される agent 定義の権能とモデルを乗っ取れる

**経路**: `renderAgent()` (graph/ordain.js:112-149) は `req.description` を
**一切の無害化なしに** frontmatter の `description:` 行へ差し込む。

```js
`description: ${desc}`,        // ordain.js:126 — 改行も `---` も素通り
```

`--description` に改行を混ぜれば、後続の `tools:` `model:` `effort:` 行を
**攻撃者が先に書ける**。YAML は先勝ちではないが、楽園の配備側パーサは
**正規表現で最初の `---` 対を切り出す**ため、`---` を注入すると
**engine が書いた本物の tools/model 行が frontmatter の外(本文)へ押し出される。**

**実測(サンドボックス複製、`--write` あり)**:

```console
$ node graph/ordain.js forge --name evilagent --domain software --cardinal construction --write \
    --description $'ok\ntools: Read, Write, Edit, Bash, Task\nmodel: fable\neffort: xhigh\n---\nBODY'
  原本を書いた。**実機にはまだ何も無い** — 配備器だけが実機に書く (第29条)

$ cat overlay/agents/evilagent.md
---
name: evilagent
description: ok
tools: Read, Write, Edit, Bash, Task
model: fable
effort: xhigh
---
BODY
tools: Read, Grep, Glob, Write, Edit, Bash, Task     ← engine が書いた本物。本文へ落ちた
model: claude-sonnet-5                                ← 同上。もはや frontmatter ではない
effort: high
---
```

**配備側の実パーサで確認した**(`apply-models.js:39` / `apply-spawn.js` が使う
`/^---\r?\n([\s\S]*?)\r?\n---/` そのもの):

```console
$ node -e "const fm=require('fs').readFileSync('overlay/agents/evilagent.md','utf8')
           .match(/^---\r?\n([\s\S]*?)\r?\n---/); ..."
=== effective fields ===
   name = evilagent
   description = ok
   tools = Read, Write, Edit, Bash, Task
   model = fable          ← 位階方針は claude-sonnet-5。**方針を迂回した**
   effort = xhigh
```

**なぜ HIGH か。** ordain.js の冒頭コメントは
「`model / effort` は `clergy.modelFor` から生成する — **方針から生成された値が
方針に反することはない**(AC-D4 #2 の保証)」と宣言する。
**この保証は破れている。** `validate()` は `--model` を渡した場合だけ位階方針との
一致を検めるが(ordain.js:74-82)、`--description` 経由の注入は**検証を一切通らない**。
結果、鍛造器は

- 位階方針より高価なモデル(`fable`)を名乗る定義、
- 編成が要求しない `Task`(起動権能)を持つ定義、

を**原本として** `overlay/agents/` に産む。第29条の原本主義に従い、この原本は
`deploy.js --write` で `~/.claude/agents/` すなわち**開発者の実機**へ配備される。

**射程の限定(正直な評価)**: `--description` は CLI 引数であり、
現状「神の願い文字列」が自動でここへ流れる経路は無い(`forge.js admit` は
願いを分野判定にしか使わず、ordain を自動起動しない)。ゆえに**現時点の悪用には
教主が自分でこの引数を渡す必要がある**。CRITICAL ではなくHIGH としたのはこの一点による。
だが ordain.js の存在意義は「鍛造を自動化して8工程を3工程にする」ことであり、
**将来 subagent や願い文字列が `--description` を埋める形になった瞬間、
これは信頼境界を跨ぐ任意 frontmatter 書き込みになる。**

**既存の門は捕まえない**(実測):

```console
$ node graph/apply-models.js verify   # → exit 0、evilagent への言及なし
$ node graph/apply-spawn.js verify    # → "· evilagent  absent" (未配備としか言わない)
```

`check-agents` は `🔴 missing: evilagent` を出すが、これは
**「まだ deploy していない」の意味であって、注入の検出ではない。**
`deploy.js --write` を打てば消える赤である。

**指摘(直していない)**: `renderAgent` が `desc` を1行へ畳む(`/[\r\n]+/` を空白へ)か、
`validate()` が `req.description` に改行・`---` を含むことを拒むか。
`name` が `/^[a-z][a-z0-9-]*$/` で守られているのと同じ厳しさが `description` にも要る。

---

### S-2 [HIGH] prototype チェーンによる `validate()` の全面バイパス — 存在しない枢機卿・分野・位階が「在る」と判定される

**経路**: `validate()` は3箇所で**プレーンオブジェクトへの素の鍵参照**によって
存在を検める(ordain.js:67, 73, 86):

```js
else if (!led.domains[req.domain]) { ... }        // domains.json 由来の object
if (!clergy.RANKS[rank]) { ... }                  // clergy.js のリテラル
else if (!clergy.COLLEGE[req.cardinal]) { ... }   // 同上
```

`Object.prototype` の鍵(`constructor` `toString` `valueOf` `__proto__` …)は
**すべて真値を返す**ので、この3つの門はいずれも素通りする。

**実測**:

```console
$ node -e "const c=require('./graph/clergy.js');
           console.log(typeof c.COLLEGE['constructor'], typeof c.RANKS['constructor']);
           const d=require('./graph/domains.js').load();
           console.log(typeof d.domains['constructor'], typeof d.agents['constructor']);"
function function
function function

$ node graph/ordain.js forge --name protoprobe --domain software --cardinal constructor
═══ ⚒  ORDAIN — 鍛造 protoprobe ═══
  分野: software   枢機卿: constructor   位階: priest          ← 通った
  · graph/clergy.js   COLLEGE["constructor"].priests に "protoprobe" を足す

$ node graph/ordain.js forge --name protoprobe3 --domain constructor --cardinal construction
  分野: constructor   枢機卿: construction   位階: priest      ← 存在しない分野が通った
  · graph/domains.json  agents["protoprobe3"] に分野 "constructor" を宣言する
```

`__proto__` `toString` `valueOf` でも同様に通ることを確認した。

**帰結は3つあり、深刻さが異なる**:

1. **`--domain constructor` は `--write` で本当に台帳を汚す。**
   `writeDomains()` は検証を再実行せず `domains.json` へ書く。以後
   `domains.js check` の `unknownDomains` が恒久的に赤を出す
   (「台帳に無い分野を名乗っている」)。**自己修復しない毒**である。

2. **`--rank constructor` は生の TypeError で落ちる**(検証を通った後に):

```console
$ node graph/ordain.js forge --name protoprobe2 --domain software --cardinal construction --rank constructor
TypeError: Cannot read properties of undefined (reading 'split')
    at renderAgent (graph/ordain.js:123:46)
```
   `clergy.RANKS['constructor']` は関数なので `!clergy.RANKS[rank]` を通過し、
   `clergy.RANKS[rank].title` が `undefined` で爆ぜる。
   **これは第34条が名指しした「罠」の形** — 門が緑を出した後に engine が崩れる。

3. **`--cardinal constructor --write` は writeCollege で落ちるが、
   その時点で既に2ファイルが書かれている** → S-3 へ。

**さらに `writeCollege()` は `cardinal` を正規表現へ無エスケープで差し込む**
(ordain.js:228):

```js
const key = new RegExp(`(['"]?${cardinal}['"]?\\s*:\\s*\\{[\\s\\S]*?priests:\\s*\\[)([^\\]]*)(\\])`);
```

`validate()` が prototype 鍵を通す以上、ここへ届く `cardinal` は
`COLLEGE` の実在キーとは限らない。現状 `--name` は
`/^[a-z][a-z0-9-]*$/` で守られているが **`--cardinal` には綴りの規則が一切無い**。
正規表現メタ文字を含む cardinal は `new RegExp` を壊すか、
`[\s\S]*?` の貪欲でない探索と組み合わさって**意図しない別の `priests: [` に
一致しうる**。実測では prototype 鍵(英字のみ)が `m` に一致せず
`throw new Error('clergy.js の COLLEGE[...] を見つけられない')` に落ちたため、
**任意の COLLEGE 書き換えには到達しなかった**。だが「到達しなかった」のは
偶然の綴りによるものであり、設計上の防壁ではない。

**指摘(直していない)**: 存在検査は `Object.prototype.hasOwnProperty.call(...)`
または `Object.keys(...).includes(...)` へ。`--cardinal` / `--domain` / `--rank` にも
`--name` と同じ綴りの規則を課す。`writeCollege` の `cardinal` は正規表現へ入れる前に
エスケープする。

---

## 2. MEDIUM

### S-3 [MEDIUM] `forge --write` は非トランザクション — 途中で落ちると半端な状態が残る

**経路**: `forge()` (ordain.js:263-274) は `p.steps` を順に実行するだけで、
巻き戻しも事前検証もしない。順序は `agent-md` → `overlay-own` → `clergy-college` → `domains`。
`writeCollege` だけが自己巻き戻しを持つ(ordain.js:244)が、
**それは自分が壊した `clergy.js` を戻すだけで、先に書かれた2ファイルには触れない。**

**実測**(サンドボックス複製、S-2 の prototype 鍵で writeCollege を落とした):

```console
$ md5sum graph/clergy.js graph/domains.json overlay/overlay.json   # BEFORE
495832df1626d725ed18937d57ca0af5 *graph/clergy.js
2f2b1730715b0a833f58c35bae60c6cf *graph/domains.json
6ec65afff165669439f5243b68cb278c *overlay/overlay.json
$ ls overlay/agents/ | grep -c .
21

$ node graph/ordain.js forge --name protopwn --domain software --cardinal constructor --write
Error: clergy.js の COLLEGE["constructor"].priests を見つけられない — 手で足せ
    at writeCollege (graph/ordain.js:230:17)

$ md5sum graph/clergy.js graph/domains.json overlay/overlay.json   # AFTER
495832df1626d725ed18937d57ca0af5 *graph/clergy.js      ← 不変(巻き戻し成功)
2f2b1730715b0a833f58c35bae60c6cf *graph/domains.json   ← 不変(到達せず)
94ad3e676bc02f4e5684dd87efd3506c *overlay/overlay.json ← **書き換わった**
$ ls overlay/agents/ | grep -c .
22                                                      ← **1ファイル増えた**
$ ls -la overlay/agents/protopwn.md
-rw-r--r-- 1 kikus 197609 1203 9月 3 16:21 overlay/agents/protopwn.md
$ grep -c protopwn overlay/overlay.json ; grep -c protopwn graph/domains.json
1                                                       ← own.agents に載った
0                                                       ← 分野宣言は無い
```

**残った状態が意味するもの**: `overlay/agents/protopwn.md` が実在し、
`overlay.json` の `own.agents` に載っている。すなわち
**次に誰かが `node graph/deploy.js --write` を打てば、この孤児は実機
`~/.claude/agents/` へ配備される** — 位階にも属さず、分野宣言も持たないまま。

保安上の含意は「攻撃」より「事故」に近いが、射程は開発者の実機である。
`domains.js check` は分野宣言の欠落を捕まえるが、それは**配備を止めない**。

**指摘(直していない)**: `forge()` を「全ステップ検証 → 全書き込み」の2相にするか、
書き込み前に全ファイルの原本を退避して失敗時に一括で戻す。

---

### S-4 [MEDIUM] `spawn-trace.measure()` は未追跡ファイルを丸ごとメモリへ読む — 巨大ファイル1個でプロセスが即死する

**経路**: `measure()` の未追跡ファイル計数(graph/spawn-trace.js、新規):

```js
const st = fs.statSync(abs);
if (st.isFile()) n = fs.readFileSync(abs, 'utf8').split(/\r?\n/).length;
```

**サイズ上限が無い。** `readFileSync` でファイル全体を文字列にし、
さらに `split` で**行数と同じ長さの配列**を作る。後者が本命で、
1行あたり最低でも十数バイトのオブジェクト頭が乗る。

**実測**(サンドボックス、git 初期化済み、未追跡ファイルを置いて `--max-old-space-size=256`):

```console
# 200MB / 1行 のファイル → 通る(split が1要素なので安い)
$ python -c "open('bigfile.bin','wb').write(b'A'*(200*1024*1024))"
$ node --max-old-space-size=256 -e "...measure(run,'p',{cwd:process.cwd()})..."
OK files= 1 churn= 1 ms= 258

# 80MB / 4,000万行 のファイル → 落ちる
$ python -c "open('manylines.bin','wb').write(b'x\n'*40000000)"
$ node --max-old-space-size=256 -e "...measure(run,'p',{cwd:process.cwd()})..."
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
----- Native stack trace -----
...
$ echo $?
134
```

**なぜ MEDIUM か。** `try {} catch {}` で囲まれているが、
**V8 のヒープ枯渇は catch できない** — プロセスが SIGABRT (exit 134) で死ぬ。
`measure()` は `conclave.js done` の内側(`markDone` → `trace.judge`)で走るので、
**作業ディレクトリにログや生成物の巨大な未追跡ファイルが1つ在るだけで、
`conclave done` が丸ごと落ちる。** 環が止まる。

攻撃ではなく事故として起きる筋が現実的である(ビルドログ、`npm` の出力、
creations の生成物)。`MEASURE_EXCLUDE` は `conclave.json` / `dashboard/atlas/` /
`node_modules/` の3つしか除かない。

**指摘(直していない)**: `fs.statSync` の `size` で足切りしてから読む
(例: 1MiB 超は行数を推定値か 0 とする)、あるいはストリームで数える。
`t3.bytes` の閾値が 4096 である以上、**巨大ファイルを正確に数える意味は無い。**

---

### S-5 [MEDIUM] `ordain verify --only <綴り違い>` は一つも門を撃たずに緑を返す

**経路**: `verify()` (ordain.js:295) は
`const gates = opts.only ? GATES.filter(g => opts.only.includes(g.name)) : GATES;`
で絞る。`--only` に GATES に無い名を渡すと **`gates` は空配列**になり、
`rows` は「分野宣言」の1行だけになって `rows.every(r => r.ok)` が真になる。

**実測**:

```console
$ node graph/ordain.js verify --name architect --only 'nonexistent-gate'
═══ ⚒  ORDAIN VERIFY — architect が既存の全門を通るか ═══
  ✓ 分野宣言             software, diagram, infra
  ✓ 鍛造した役者は既存の門を一つも壊していない
══════════════════════════════════════════════
$ echo $?
0
```

門は**7つのうち0つ**を撃ったのに「一つも壊していない」と述べ、exit 0 を返す。
これは第16条(判定不能は緑ではない)の**engine 自身による違反**である。
`--only` は綴りを間違えやすい日本語名(`実在` `配備の一致` `分野の適合` …)であり、
事故が起きる形をしている。

**指摘(直していない)**: `opts.only` の各要素が GATES に一致しなければ exit 2 で拒む。
少なくとも `gates.length === 0` を緑にしない。

---

## 3. LOW

### S-6 [LOW] `conclave done --tier` を値なしで渡すと「序列1」を宣言したことになる

`parse` は値の無いフラグへ `true` を入れる。`judge()` は
`const tier = opts.tier == null ? null : Number(opts.tier);` で受け、
**`Number(true) === 1`** なので `[1,2,3].includes(1)` を通る。

**実測**:

```console
$ node -e "const t=require('./graph/spawn-trace.js');
           const run={epoch:{tier:'v1'},domains:[{phases:[{id:'p',agent:'x'}]}]};
           ..."
--tier (bare, ==true): "no-trace"      ← 序列1として裁かれた(no-tier ではない)
--tier abc          : "no-tier"        ← 正しく拒む
--tier "1"          : "no-trace"       ← 妥当
--tier 1.9          : "no-tier"        ← 正しく拒む
--tier " 3 "        : "tier3-breach"   ← 空白付きが通る
```

保安影響は小さい(結局 no-trace で赤になる)。だが**「宣言しなかった」と
「序列1を宣言した」は別の状態**であり、`tierTrace[id].declared` に `1` が
刻まれてしまう点で監査記録が不正確になる。`gauge.js` の `tier1` 集計にも入る。

### S-7 [LOW] `artifactPath` / `--run` はリポジトリ外の任意パスを受け、その存在とサイズが露見する

`measure()` は `path.isAbsolute(art) ? art : path.join(cwd, art)` で
**正規化も封じ込めもせず** `statSync` する。`conclave done --artifact` も同様。

**実測**:

```console
$ node graph/conclave.js done specify --run /tmp/sec.run.json \
    --artifact "C:/Windows/System32/drivers/etc/hosts" --tier 3
序列3: 教主の手 (files=1/2 churn=22/50 bytes=1056/4096)
     ✓    specify @requirements-analyst          ← done として受理された

$ node -e "...読み返す..."
artifactPath: C:/Windows/System32/drivers/etc/hosts   status: done
tierTrace.specify: {"declared":3,"state":"序列3","measured":{...,"bytes":1056},...}
```

`contract.js check --run` も同様に任意パスを読み、JSON でなければ理由を出す:

```console
$ echo '{...}' | node graph/contract.js check --run "C:/Windows/System32/drivers/etc/hosts"
run-state が読めない: C:/Windows/.../hosts — Unexpected token '﻿', "﻿# Copyrig"... is not valid JSON
```

**読み取りのみ・書き込み無し・内容の全文露出も無い**(サイズと先頭の断片のみ)。
すべて **CLI を打つ本人の権限**で、本人が指定したパスに対して起きるので、
信頼境界を跨いでいない。ゆえに LOW。
ただし `conclave.json` は版管理下に入るため、**リポジトリ外の絶対パスと
そのバイト数が成果物として記録・コミットされうる**点は記しておく。

### S-8 [LOW] 新規追加行に個人のメールアドレスが入っている

CI の秘密走査パターン(`sk-` / `gh[pou]_` / PRIVATE KEY)には**一切当たらない**。
鍵・トークンの類は無い(N-5)。だが「鍵・トークン**以外**の個人情報」を検めよとの
指示に従い走査したところ、以下が**新規追加行**に在る:

```console
$ git diff main...HEAD | grep -E "^\+" | grep -EIno "[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
3931:kiku.syo1101@gmail.com
3932:kiku.syo1101@gmail.com
3949:kiku.syo1101@gmail.com
6954:prove@paradise.local        ← テスト内の固定値。問題なし

$ # 出所を特定
reform/pontiff-office/findings.md: 3   ← git shortlog の貼り付け
$ git grep -c "kiku.syo1101@gmail.com" main -- .
(該当なし — main には存在しない。**本PRで初めて入る**)
```

`findings.md` が `git shortlog -sne` の生出力を証跡として貼ったために入った。
リポジトリが公開されているなら、**本PRが初めてこのアドレスをリポジトリ本文へ持ち込む**。
コミットメタデータには元々在るので新規露出とは言い切れないが、
**本文への貼り付けはスクレイピングの容易さが桁違いである。**
`C:\Users\kikus\...` 形式の絶対パスも8箇所在るが、これは README/CLAUDE.md の
既存の流儀に沿うもので新規の問題ではない。

**指摘(直していない)**: `findings.md` の shortlog 引用でアドレス部を伏せる。

---

## 4. 「無い」と確かめたもの — 確かめ方つき

指示の「無いなら**こう確かめた**と書け」に従う。

### N-1 コマンド注入 — 無い。`execFileSync` の配列渡しであることを実測で確認した

新規コードの子プロセス起動は**2箇所のみ**で、いずれもシェルを経由しない:

```console
$ git diff main...HEAD -- 'graph/*.js' | grep -E "^\+" | grep -E "exec|spawn"
+const { execFileSync } = require('child_process');      # ordain.js
+    return execFileSync('git', args, { cwd: cwd || ROOT, ... });   # spawn-trace.js gitOut
+const { execFileSync } = require('child_process');      # spawn-trace.js
+      execFileSync(process.execPath, [path.join(ROOT, ...g.cmd[0].split('/')), ...],  # ordain verify
```

`exec` / `execSync` / `shell:true` は**一つも無い**。
`measure()` が組み立てる git 引数は `['log','--no-merges','--since='+t0, ...]` という
**配列**であり、`t0` は run.json 由来(=攻撃者が影響しうる)だが要素境界を跨げない。

**実測(シェルメタ文字を `dispatchedAt` へ注入)**:

```console
$ node -e "const t=require('./graph/spawn-trace.js');
   const evil='2020-01-01T00:00:00Z; touch /tmp/PWNED_SHELL';
   const run={epoch:{tier:'v1'},domains:[{phases:[{id:'p',dispatchedAt:evil,agent:'x'}]}]};
   const m=t.measure(run,'p',{cwd:process.cwd()});
   console.log(JSON.stringify(m,null,1));
   console.log('PWNED_SHELL created?', require('fs').existsSync('/tmp/PWNED_SHELL'));"
{ "files": 0, "churn": 0, "bytes": 0,
  "t0": "2020-01-01T00:00:00Z; touch /tmp/PWNED_SHELL",   ← そのまま git へ渡り、git が無視した
  "measurable": true, ... }
PWNED_SHELL created? false                                 ← **シェルは起動していない**
```

**git のオプション注入も不可能**であることを確認した。`t0` は
`'--since=' + t0` という**単一の文字列へ連結される**ので、`--output=...` を渡しても
独立した引数にはならない:

```console
$ ...dispatchedAt:'--output=/tmp/EVIL'...
measurable= true files= 0 churn= 0        ← /tmp/EVIL は作られない
```

`ordain verify --only` にメタ文字を入れても、`only` は
**GATES の名前フィルタにしか使われず**、コマンドには一切入らない:

```console
$ node graph/ordain.js verify --name architect --only '実在; touch /tmp/PWN2'
  ✓ 分野宣言             software, diagram, infra
$ ls /tmp/PWN2
ls: cannot access '/tmp/PWN2': No such file or directory
```

phase 名・ブランチ名がシェルへ渡る経路は**無い**。

### N-2 任意コード実行 — 無い。全パターンを新規追加行で走査した

```console
$ git diff main...HEAD -- 'graph/*.js' '.github/*' | grep -E "^\+" \
    | grep -E "\beval\(|new Function|child_process|exec\(|execSync\(|spawn\(|require\([^'\"]"
```

一致は上記 N-1 の `execFileSync` 群のみ。
**`eval` は 0件。`new Function` は 0件。`shell:true` は 0件。**

動的 `require` は1件だけ在る(ordain.js:239):

```js
delete require.cache[require.resolve(CLERGY_JS)];
const reloaded = require(CLERGY_JS);
```

`CLERGY_JS` は `path.join(__dirname, 'clergy.js')` の**定数**であり、
ユーザ入力は入らない。ただし**これは engine が書き換えた直後の JS を
自プロセスへ再読込する**ので、`writeCollege` が任意の内容を書ければ
任意コード実行になる。現状 `writeCollege` が書けるのは
`priests: [` 直後の `, '<name>'` のみで、`name` は
`/^[a-z][a-z0-9-]*$/` に縛られる(クォートも改行も入らない)。
**ゆえに現時点で到達可能な RCE は無い。**
だが S-2 が示す通り `cardinal` は無検証で正規表現へ入るため、
**`name` の綴り規則だけがこの経路を守っている**ことは記しておく。

### N-3 ReDoS — 無い。願いが正規表現側へ来る経路が無いことと、実測の両方で確かめた

指示の問い「**ユーザの願いが正規表現側に来る経路は無いか**」に直接答える。

`domains.js reFor()` は `new RegExp(parts.join('|'), 'i')` を作るが、
`parts` の出所は **`domains.json` の `ja_re` / `en_re` のみ**(domains.js:42-47)。
`classify(wish)` において **`wish` は常に `re.test(wish)` の被検査側**であり、
パターン側へは決して入らない(domains.js:54-63)。
`forge.js admit()` も `domains.classify(wish, led)` を呼ぶだけである。
**願いが正規表現の構成要素になる経路は無い。**

台帳の語彙自体も安全な形をしている: 選択肢の羅列(`A|B|C`)と
`(?:...)` の非捕捉群のみで、**入れ子の量化子が一つも無い**
(`(a+)+` / `(a|a)*` の類が存在しない)。

**実測(病的な入力で計測)**:

```console
$ node -e "const d=require('./graph/domains.js');
  for (const n of [1000,20000,200000]) { ... }"
ja len 1000   ms= 1      en len 1000   ms= 0
ja len 20000  ms= 1      en len 20000  ms= 0
ja len 200000 ms= 5      en len 200000 ms= 3
repeat-hit ms= 2                       ← 'deploy ' を5万回
```

40万文字で 5ms。**破局的後戻りは起きない。**

なお `writeCollege` の `new RegExp` は**パターン側にユーザ入力(`cardinal`)が入る**が、
これは ReDoS ではなく正規表現インジェクションの問題として S-2 に記した。
`[\s\S]*?` は非貪欲かつ後戻りの分岐が単純で、実測でも即座に失敗した。

### N-4 CI 権限 — 過剰でない。`pull_request_target` は使っていない

```console
$ grep -rn "pull_request_target" .github/
(none)
$ ls .github/workflows/
tribunal.yml
$ grep -nE "^permissions:|^\s+permissions:|secrets\.|GITHUB_TOKEN" .github/workflows/tribunal.yml
247:    permissions:
```

**本PRが足した2段**(`tribunal.yml` +11行):

```yaml
      - name: 👁 Tier audit — 序列の門が実在の走行を見る (第42条 / 第52条)
        run: node graph/spawn-trace.js audit
      - name: 🎭 Domains — 役者は担える分野を宣言しているか (第52条)
        run: node graph/domains.js check
```

検めた点と結論:

- **`pull_request_target` は使っていない。** トリガは
  `pull_request: branches:[main]` / `push: branches:[main]` / `workflow_dispatch` のみ。
  ゆえに fork PR のコードは**書き込み権限や secrets を持たない文脈**で走る。
  これは「untrusted な PR のコードを特権付きで実行する」形**ではない**。
- **足された2段は `verify` job に入っている。** この job には
  `permissions:` の宣言が無く、リポジトリ既定に従う。
  **`verify` job は `secrets` を一つも参照せず、書き込みも行わない。**
  権限を明示的に `contents: read` へ絞ればより堅いが、
  **本PRが権限を拡大した事実は無い**(diff に `permissions` の変更行は無い)。
- 唯一 `permissions` を持つのは既存の `tribunal` job (247行目) で、
  `contents: read` / `pull-requests: write`。PR へ裁定コメントを貼るための
  最小限であり、**本PRは触れていない**。
- 足された2段は**新たな secrets もネットワークアクセスも要求しない**。
  `spawn-trace.js audit` はリポジトリ内の `conclave.json` を読むだけ、
  `domains.js check` は `domains.json` と `forge.js` / `clergy.js` を読むだけ。

**懸念を1つだけ記す(保安ではなく健全性)**: `audit` は
`workspace.js` 経由で**兄弟倉 `../paradise-creations` も走査する**
(spawn-trace.js `findRuns`)。CI には兄弟倉が存在しないので
`try {} catch {}` で黙って飛ぶ。**CI で走る `audit` はリポジトリ内しか見ない**が、
`walk` は深さ3で `node_modules` と `.git` を除くのみ。
**シンボリックリンクのループを検出しない**(`fs.readdirSync` の再帰、
`e.isDirectory()` は Windows のジャンクションを真とする)。
リポジトリ内に自己参照リンクが在れば深さ3で止まるので**無限ループにはならない**。
実測: 3件を 10ms で走査。

### N-5 秘密の混入 — 鍵・トークンは無い。`critic.js` の走査も実行した

指示どおり `node graph/critic.js` の秘密走査を走らせた:

```console
$ node graph/critic.js review graph --self
═══════ 🔍 ADVERSARIAL SELF-CRITIQUE ═══════
target: graph
  ✓ [smell] no-hardcoded-assumptions: config flows from an intake into the logic
  ✓ [gap] no-secrets: no secrets detected
  ✓ [gap] no-wall-clock-iso: engine code is exempt (creations-only law)
  ✓ [gap] no-external-deps: engine code is exempt (creations-only law)
  ✓ [smell] domain-markers-present: engine code is exempt (creations-only law)
───────────────────────────────────────────
VERDICT: the critic found nothing. Proceed to judgment.
$ echo $?
0
```

CI と同じパターンを**新規追加行に限って**独立に走らせた結果も一致:

```console
$ git diff main...HEAD | grep -E "^\+" \
  | grep -EIn "sk-[a-zA-Z0-9]{20,}|gh[pou]_[a-zA-Z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|xox[baprs]-"
(no key/token patterns in added lines)
```

**`~/.claude` への書き込み経路も検めた**(指示 1-3):

```console
$ grep -nE "writeFileSync|mkdirSync|appendFileSync|rmSync|unlinkSync|copyFileSync" graph/ordain.js
183:  fs.mkdirSync(AGENTS_DIR, { recursive: true });          # overlay/agents/
184:  fs.writeFileSync(path.join(ROOT, step.file), ...);      # ROOT 配下
197:  fs.writeFileSync(OVERLAY_JSON, out);                    # overlay/overlay.json
236:  fs.writeFileSync(CLERGY_JS, after);                     # graph/clergy.js
244:  fs.writeFileSync(CLERGY_JS, before);                    # 巻き戻し
260:  fs.writeFileSync(DOMAINS_JSON, out);                    # graph/domains.json
```

**書き込み先6箇所すべてがリポジトリ内の定数パスであり、
`~/.claude` へ直接書く経路は一つも無い。**
`ordain.js` が `homedir()` に触れるのは `existingNames()` の**読み取り1箇所のみ**
(ordain.js:47-48、`CLAUDE_HOME || ~/.claude` の `agents/` を `readdirSync`)。
第29条の「鍛造器は配備器にならない」は**守られている**。
なお `step.file` は `path.relative(ROOT, ...)` で作られた engine 内部の値で、
`--name` の綴り規則により走査文字を含み得ない(S-2 でも到達しなかった)。

**`--name` によるパス走査も直接試した**(指示 1-1):

```console
$ for n in '../../evil' '/etc/evil' 'C:/Windows/Temp/evil' '..\evil' 'Evil' 'a/b'; do
    node graph/ordain.js forge --name "$n" --domain software --cardinal construction; done
🔴 鍛造できない — 名は小文字と連字符のみ: "../../evil"
🔴 鍛造できない — 名は小文字と連字符のみ: "/etc/evil"
🔴 鍛造できない — 名は小文字と連字符のみ: "C:/Windows/Temp/evil"
🔴 鍛造できない — 名は小文字と連字符のみ: "..\evil"
🔴 鍛造できない — 名は小文字と連字符のみ: "Evil"
🔴 鍛造できない — 名は小文字と連字符のみ: "a/b"
```

**6形すべて拒まれた。`--name` のパス走査は無い。**
`/^[a-z][a-z0-9-]*$/` は `.` `/` `\` `:` を許さず、アンカー付きで
改行も通さない(JS の `$` は `m` フラグ無しなら文字列末尾)。
**`--name` については防御が正しい。** 問題は同じ厳しさが
`--description`(S-1) `--cardinal` `--domain` `--rank`(S-2) に無いことである。

### N-6 資源の枯渇(その他) — 有界であることを確認した

指示 7 に答える。

- **atlas の再試行は無限にならない。** `firstScreen()` は
  `firstScreenOnce()` を呼び、`inconclusive` のときだけ**もう一度だけ**呼ぶ。
  再帰ではなく直列の2回であり、`opts.retry !== false` は
  内側の呼び出しへ渡らない(内側は `firstScreenOnce` を直接呼ぶ)。
  **上限は厳密に2回。** Chrome の子プロセスも最大2つ。

```js
function firstScreen(htmlPath, opts = {}) {
  let r = firstScreenOnce(htmlPath);
  if (r.kind === 'inconclusive' && opts.retry !== false) {
    const again = firstScreenOnce(htmlPath);       // ← 再帰ではない
    if (again.kind !== 'inconclusive') return again;
    return { ...again, retried: true };
  }
  return r;
}
```

- **ordain が生成するファイル数に上限は要らない。** `forge()` は
  `plan()` が返す `steps` を回すが、`steps` は
  **1回の呼び出しにつき最大4件の固定構成**(`agent-md` / `overlay-own` /
  `clergy-college` / `domains`)で、入力によって増えない。
  新規 `.md` は**常に1つだけ**。ループで名前を展開する経路は無い
  (`grep` で確認: ordain.js の `for` は `existingNames` の読み取りと
  `steps` の実行・表示のみ)。**ファイル数の増幅は無い。**
  ただし**同名で繰り返し呼んでも増えない**ことは衝突検査が保証する:

```console
$ node graph/ordain.js forge --name evilagent ... --write   # 2回目
🔴 鍛造できない — 名 "evilagent" は既存の agent と衝突する (第17条)
```

- **`findRuns` の走査は深さ3で有界**(実測 3件 / 10ms)。
- **唯一の非有界は S-4 の `readFileSync`** である。

---

## 5. 審査の作法についての注記

- 破壊的な検証(`--write` を伴うもの、巨大ファイルの生成)は
  **すべて `git archive HEAD` で作った一時複製** (`$LOCALAPPDATA/Temp/pdx-sec-*`)
  の中で行い、審査後に `rm -rf` で除去した。
- 本体リポジトリに対しては**読み取りと dry-run のみ**を実行した。
  `checkout` / `branch` / `commit` / `push` は一度も打っていない。
- 検証中に本体の作業ツリーで `dashboard/state.js` `dashboard/state.json` の
  `generated` 時刻と `nodeCount`(99→106)が更新された。これは
  `node tests/paradise.test.js` を走らせた副作用である。
  **生成物であり、新しい engine を正しく反映した値なので巻き戻していない**
  (第29条: 生成物は成果物であって原本ではない)。
  `CLAUDE.md` `README.md` `.revtmp/` の変更は本審査によるものではない。
- `node tests/paradise.test.js` は 180 秒で時間切れとなり、
  **全件の合否を見ていない**(atlas の相まで緑を確認)。
  **見なかったものを「通った」とは書かない**(第16条)。
  試験の完走は quality 相の責務であり、本報告は保安の判定のみを述べる。

---

## 6. 結論

**CRITICAL は無い。本PRは保安を理由に BLOCK すべきものではない。**

一方で、**`ordain.js` は本PRで最も危険な engine であるという前提は正しかった。**
HIGH 2件はいずれも `ordain.js` に在り、いずれも**同じ根**を持つ:

> `--name` には `/^[a-z][a-z0-9-]*$/` という正しい防御が在る。
> **`--description` `--cardinal` `--domain` `--rank` には、何も無い。**

鍛造器が自ら掲げた保証 —— 「方針から生成された値が方針に反することはない」 ——
は `--description` の一行で破れる(S-1、実測済み)。
検証の3つの門は prototype の鍵で素通りする(S-2、実測済み)。
そして書き込みは巻き戻らない(S-3、実測済み)。

**推奨**: S-1 と S-2 をマージ前に塞ぐ。いずれも数行で、
既存の門を一つも動かさずに直せる性質の欠陥である。
S-4(measure の OOM)は環を止める故障なので、次の reform で扱うに足る。

*本報告は指摘のみである。engine を一行も変更していない。*
