# 第5段 (work-5)「兄弟倉への配備 (EX-2)」— 証拠

> 走者: 神官 / ブランチ `reform/sovereign-abode-6` / 起点 `f9d08d7`(PR #49 マージ後)
> 満たす AC: **AC-46 / AC-47 / AC-48 / AC-49 / AC-50 / AC-51**(design.md §7 の work-5 行)
> 完了条件(design §7.2): `node graph/abode.js check --creations` が exit 0 で agents 30 / commands 19 / rules 8

本書は**作業しながら逐次追記**した。節の順は着手順である。
コマンドは `$` 付きで生出力を貼る。載っていない AC は「満たした」と主張しない(第37条)。

---

## 0. 着手前のベースライン(実測)

教主の申告を鵜呑みにせず、自分の手で採り直した(第27条)。

```console
$ git status --short --branch
## reform/sovereign-abode-6
$ git log --oneline -1
f9d08d7 Merge pull request #49 from kikusyo1101/reform/sovereign-abode-5
```

### 0.1 楽園の住処 — 既定は倉の中 (第4段の成果)

```console
$ node graph/abode.js resolve
mode=repo (source=default)
  abode           C:\Users\kikus\Documents\workspace\paradise\.claude
  settings        C:\Users\kikus\Documents\workspace\paradise\.claude\settings.json
  agents          C:\Users\kikus\Documents\workspace\paradise\.claude\agents
  commands        C:\Users\kikus\Documents\workspace\paradise\.claude\commands
  rules           C:\Users\kikus\Documents\workspace\paradise\.claude\rules
  skills          C:\Users\kikus\Documents\workspace\paradise\.claude\skills
  claudeMd        C:\Users\kikus\Documents\workspace\paradise\.claude\CLAUDE.md
  kg              C:\Users\kikus\Documents\workspace\paradise\graph\kg-store
  dailyLedger     C:\Users\kikus\Documents\workspace\paradise\.claude\paradise-daily.json
  creationsAbode  C:\Users\kikus\Documents\workspace\paradise-creations\.claude
  home            C:\Users\kikus
  exists: abode=true settings=true agents=true kg=true
EXIT=0
```

`creationsAbode` は既に `resolve()` が答えている(第30条 — 住所は `workspace.js` 経由)。
**この段でこの住所を自分で組み直すことはしない。**

### 0.2 鏡写しの源 — `<repo>/.claude` の実数

```console
$ ls .claude/agents/*.md | wc -l
30
$ ls .claude/commands/*.md | wc -l
19
$ ls .claude/rules/*.md | wc -l
8
$ ls .claude/
agents
CLAUDE.md
commands
paradise-daily.json
rules
settings.json
$ git ls-files .claude | wc -l
59
$ find .claude -type d | sort
.claude
.claude/agents
.claude/commands
.claude/rules
$ find .claude/agents .claude/commands .claude/rules -type f ! -name '*.md' | sort
(出力なし — 三つの木は .md だけの平坦な木である)
```

**EX-2 の target が名指すのは `{agents,commands,rules,CLAUDE.md}` の四つだけ。**
`settings.json` と `paradise-daily.json` は台帳に無い ⇒ 複製しない(台帳を越えて書かない)。

### 0.3 兄弟倉 — **神官が一体も居ない**

```console
$ node graph/workspace.js resolve
C:\Users\kikus\Documents\workspace\paradise-creations  (source=sibling, exists=true)
EXIT=0
$ ls -a ../paradise-creations/
.
..
.git
.github
_scratch
coin
gauge-ledger.jsonl
habit
pomodoro
README.md
rps
tenbin
$ ls -a ../paradise-creations/.claude
ls: cannot access '../paradise-creations/.claude': No such file or directory
EXIT=2
$ ls ../paradise-creations/.gitignore
ls: cannot access '../paradise-creations/.gitignore': No such file or directory
EXIT=2
$ git -C C:/Users/kikus/Documents/workspace/paradise-creations check-ignore .claude
EXIT=1
```

要件 §11.2 AC-48 が書いたとおりの状態である ——
**兄弟倉そのものは実在するのに、そこには神官が一体も居ない。**
`check-ignore` が exit 1 = `.claude/` はまだ無視されていない(AC-50 の正の側は未達)。

### 0.4 `check --creations` は未実装 — ただし**黙って緑ではない**

```console
$ node graph/abode.js check --creations
✗ check の知らない旗: --creations — 知る旗は --count / --ledger / --exclusion / --silent-green / --symmetry / --hermetic / --all。知らない旗を黙って捨てて緑を返す門は、測らずに答えている(第37条)
EXIT=2
```

第3段が建てた「知らない旗は exit 2」の掟が生きている。**この掟はこの段でも維持する。**

### 0.5 AC-51 の着手前の実測 — 病はここに在る

```console
$ cd ../paradise-creations && node C:/Users/kikus/Documents/workspace/paradise/graph/check-agents.js
═══════ ⛪ AGENT PRESENCE ═══════
agents dir: C:\Users\kikus\Documents\workspace\paradise\.claude\agents
named by the paradise: 14 (forge.js + clergy.js + examples)
  ✓ all present
  ...
EXIT=0
```

**作業ディレクトリを兄弟倉に移しても、`check-agents` は楽園の倉の `.claude/agents` を見ている。**
`abode.resolve()` は `__dirname` 起点で倉を決めるので cwd では動かない。すなわち
「兄弟倉で起動した環から神官が見えるか」を、この出力は**一度も測っていない**。
住処解決が兄弟倉を指したときに何が起きるかを実測する:

(→ §5 で env 注入により実測する)

---

## 1. `graph/abode.js` — `creationsAbode()` と `check --creations`

設計 §1.2 の署名に従って実装した。要点は三つ:

1. **住所を自分で組まない。** `resolve().creationsAbode`(= `workspace.js` 経由 / 第30条)だけを引き、
   比較の基準は `pathFor('agents'|'commands'|'rules'|'claudeMd')` から採る。
2. **判定は二重。** 名前集合の 1:1(`missing` / `extra`)**かつ** 内容 sha256 の一致(`differs`)。
   名前だけを数える門は、中身をすり替えられても緑を出す。
3. **skip の物差しは「兄弟倉そのものが在るか」。** root が無ければ skip(AC-49)、
   root は在るのに `.claude` が無い/空なら **赤**(AC-48)。ここを混ぜたら本改革が退治している病そのものである。

`tracked` は `git -C <creations> ls-files .claude` の実測。走らせられなければ
**黙って false にせず `null` + `unmeasurable` に理由を積む**(第37条)。

### 1.1 旗の追加 — 「知らない旗は exit 2」の掟は維持した

`CHECK_FLAGS` に `'--creations': 'creations'` を足し、`check()` の `all` 判定と
`r.ok` の合成の両方に含めた(= `--all` で必ず走る。旗を立てたときしか走らない門は、
誰も旗を立てなくなった日に死ぬ)。

---

## 2. AC-48(逆・神官ゼロは赤)— 実装直後、配備前の実測

**改革前のこの瞬間、兄弟倉には神官が一体も居ない。** その状態を門が赤と裁くか:

```console
$ node graph/abode.js check --creations
═══ 🏠 ABODE CHECK (第58条) ═══
  · 除外 1 件: graph/abode.js (住所を作るのが職務 / 資格の裏付け: function resolve+function pathFor+function globalWrite+module.exports を輸出している / homedir 呼び出し 1 箇所)
  · creations abode: C:\Users\kikus\Documents\workspace\paradise-creations\.claude
    agents (読めず) / commands (読めず) / rules (読めず) / CLAUDE.md なし / git 追跡 false
✗ 兄弟倉の住処が楽園と一致しない (2 件) — 第30条 / EX-2
  creations abode: 兄弟倉は在るのに C:\Users\kikus\Documents\workspace\paradise-creations\.claude が無い — この倉で起動した環は神官を一体も見ない。**不在は skip ではない**(第37条 / AC-48)。 node graph/deploy.js --write --creations で配備せよ
  creations abode: CLAUDE.md が兄弟倉に無い — 散文の掟を持たない倉で起動した環は、掟を知らないまま働く (AC-46)
  → node graph/deploy.js --write --creations
═══════════════════════════════
EXIT=1
```

**exit 1。skip に落ちていない。** 要件 AC-48 の期待どおりである。

---

## 3. `graph/deploy.js` — `--creations` の鏡写し

### 3.1 裁定1 — 鏡写しであって plan() の再走ではない

`<repo>/.claude/{agents,commands,rules,CLAUDE.md}` を**そのまま複製**する。
overlay から建て直さない・transform を再適用しない。
`<repo>/.claude` は既に変換済みの派生物であり、そこから写せば sha256 一致が 1:1 検査の意味を持つ。
二度建てれば二つの真実ができる(第29条)。

**`settings.json` / `paradise-daily.json` は写さない** —— EX-2 の `target` が名指すのは四つだけである。

```console
$ node graph/deploy.js plan --creations
═══════ ⛪ CREATIONS DEPLOY — 計画 (EX-2 / dry run) ═══════
source : C:\Users\kikus\Documents\workspace\paradise\.claude   (楽園の派生物をそのまま鏡写す)
target : C:\Users\kikus\Documents\workspace\paradise-creations\.claude
輸出   : <creations-root>/.claude/{agents,commands,rules,CLAUDE.md}
files  : {"agents":30,"commands":19,"rules":8,"root":1}
  agents    30 本  C:\Users\kikus\Documents\workspace\paradise-creations\.claude\agents
  commands  19 本  C:\Users\kikus\Documents\workspace\paradise-creations\.claude\commands
  rules     8 本  C:\Users\kikus\Documents\workspace\paradise-creations\.claude\rules
  root      1 本  C:\Users\kikus\Documents\workspace\paradise-creations\.claude
  ⚠️ settings.json / paradise-daily.json は写さない — EX-2 の target に無い
  (dry run — pass --write to deploy)
═══════════════════════════════════════════════════════
EXIT=0
```

### 3.2 `deploy.js check --creations` は作らない(第29条)

照合は `abode.js check --creations` が唯一持つ。重複した真実を作らない。
**黙って無視せず、口で拒む**:

```console
$ node graph/deploy.js check --creations
ERROR: 兄弟倉の照合はこの器が持たない — node graph/abode.js check --creations が唯一の答えである
EXIT=2
```

### 3.3 裁定1 の前提条件 — 汚れた源は鏡写さない(実地の故障注入)

`.claude/agents/cardinal.md` の末尾に 1 行足してから配備を試みた。

```console
$ printf 'HTMLコメント1行' >> .claude/agents/cardinal.md
$ node graph/deploy.js check
mode: repo   target: C:\Users\kikus\Documents\workspace\paradise\.claude
checked: 60  transforms (diff expected): agents
  🔴 agents/cardinal.md — 変換の管轄外(frontmatter の model/effort/tools 以外)で配備物が出所と食い違う — 手で触られた疑い (overlay(own))
════════════════════════════════════
EXIT=1

$ node graph/deploy.js --write --creations
{
  "ok": false,
  "refused": "源が楽園の定義と乖離している (1 件) — 汚れた源を鏡写せば汚れが二箇所に増える。node graph/deploy.js --write で建て直してから来い",
  "drift": [
    "agents/cardinal.md: 変換の管轄外(frontmatter の model/effort/tools 以外)で配備物が出所と食い違う — 手で触られた疑い"
  ]
}
EXIT=1
```

**1 バイトも書かずに exit 1 で拒んだ。** 復元して緑に戻したことも確かめた:

```console
$ git checkout -- .claude/agents/cardinal.md && git status --short .claude
(出力なし)
$ node graph/deploy.js check
  ✓ every deployed file matches its declared source
```

### 3.4 裁定2 — 書き込みは EX-2 の関門を通る(実測で二方向から撃った)

```console
$ node -e "const abode=require('./graph/abode.js'); const e=abode.exportFor('EX-2');
           try { abode.globalWrite(e.target+'x', ...) } catch(err){ ... }
           try { abode.globalWrite(e.target,     ...) } catch(err){ ... }"
  ✓ 拒否(target 不一致): <creations-root>/.claude/{agents,commands,rules,CLAUDE.md}x は台帳に無い輸出である — graph/abode.json に神の名指しが要る (AC-23)
  ✓ 拒否(writer 不一致): EX-2 の writer は graph/deploy.js — 呼び手は (測れず) (AC-26)
```

**target は 1 文字違えば拒まれ、呼び手が `graph/deploy.js` でなければ拒まれる。**
ゆえに `deploy.js` から直接呼んでいる(別 engine を挟めば呼び手が変わって関門が閉じる)。

---

## 4. 実配備 — 兄弟倉に神官を入れる (AC-46 の正)

```console
$ node graph/deploy.js --write --creations
[輸出 EX-2] <creations-root>/.claude/{agents,commands,rules,CLAUDE.md} ← graph/deploy.js
{
  "ok": true,
  "source": "C:\\Users\\kikus\\Documents\\workspace\\paradise\\.claude",
  "target": "C:\\Users\\kikus\\Documents\\workspace\\paradise-creations\\.claude",
  "exportTarget": "<creations-root>/.claude/{agents,commands,rules,CLAUDE.md}",
  "deployed": 58,
  "counts": { "agents": 30, "commands": 19, "rules": 8, "root": 1 },
  "note": "settings.json / paradise-daily.json は EX-2 の target に無いので写していない",
  "verify": "node graph/abode.js check --creations"
}
EXIT=0
```

`[輸出 EX-2] … ← graph/deploy.js` の一行が、関門を通ったことを口で名乗っている(第54条(c))。

### 4.1 **AC-46(正)/ design §7.2 の完了条件** — `check --creations` が exit 0 で 30 / 19 / 8

```console
$ node graph/abode.js check --creations
═══ 🏠 ABODE CHECK (第58条) ═══
  · 除外 1 件: graph/abode.js (住所を作るのが職務 / 資格の裏付け: function resolve+function pathFor+function globalWrite+module.exports を輸出している / homedir 呼び出し 1 箇所)
  · creations abode: C:\Users\kikus\Documents\workspace\paradise-creations\.claude
    agents 30 / commands 19 / rules 8 / CLAUDE.md あり / git 追跡 false
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
  ✓ 門は黙って緑に落ちず、兄弟の engine は同じ口から住所を得ている
═══════════════════════════════
EXIT=0
```

**exit 0 / agents 30 / commands 19 / rules 8。完了条件を満たした。**

---

## 5. AC ごとの逆の側 — 実地で撃った生出力

### AC-47(逆・欠落) — 神官を 1 本消す

```console
$ rm ../paradise-creations/.claude/agents/cardinal.md
$ node graph/abode.js check --creations
    agents 29 / commands 19 / rules 8 / CLAUDE.md あり / git 追跡 false
✗ 兄弟倉の住処が楽園と一致しない (1 件) — 第30条 / EX-2
  creations abode: 神官 が欠けている — cardinal
  → node graph/deploy.js --write --creations
═══════════════════════════════
EXIT=1
```

要件が求めた「`creations abode: 神官が欠けている — cardinal`」を名指している。復元後 exit 0。

### AC-48(逆・神官ゼロは赤) — `agents/` を空にする

```console
$ mv ../paradise-creations/.claude/agents ...bak && mkdir ../paradise-creations/.claude/agents
$ node graph/abode.js check --creations
    agents 0 / commands 19 / rules 8 / CLAUDE.md あり / git 追跡 false
✗ 兄弟倉の住処が楽園と一致しない (31 件) — 第30条 / EX-2
  creations abode: agents/ が空である — 神官が 0 体の倉を緑と呼んではならない (AC-48)
  creations abode: 神官 が欠けている — acceptance-criteria-writer
  creations abode: 神官 が欠けている — architect
  …
EXIT=1
```

**skip に落ちていない。** `.claude` ごと不在の場合は §2 で実測済み(同じく exit 1)。

### AC-49(正・倉が無い機では名乗って skip)

CI には兄弟倉が無い。偽の住処を指して実測した:

```console
$ PARADISE_CREATIONS=C:/Users/kikus/AppData/Local/Temp/no-such-creations-XYZ node graph/abode.js check --creations
  · skip: creations abode 不在: C:\Users\kikus\AppData\Local\Temp\no-such-creations-XYZ — 兄弟倉そのものがこの機に無い(clone していない機では創造物も無い)
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
═══════════════════════════════
EXIT=0
```

**`· skip:` の形で口で名乗って exit 0。** 黙って緑ではない(第58条(e))。

deploy 側は黙って 0 を返さない —— 「検められなかった」は exit 2 である:

```console
$ PARADISE_CREATIONS=<不在> node graph/deploy.js plan --creations
  · 検められず: 兄弟倉が無い: C:\Users\kikus\AppData\Local\Temp\no-such-creations-XYZ — 配備先の倉が無ければ配備は検められない
EXIT=2
$ PARADISE_CREATIONS=<不在> node graph/deploy.js --write --creations
  · 検められず: 兄弟倉が無い: …
EXIT=2
```

### AC-50(逆・第30条の逆流) — 兄弟倉が `.claude` を git 追跡している

`os.tmpdir()` に偽の兄弟倉を建て、そこで `.claude` を 58 件 commit してから撃った
(**現物の倉は 1 バイトも触っていない** — 第58条(c)):

```console
$ git init … && git add .claude && git commit -m "track .claude"
tracked files: 58
$ PARADISE_CREATIONS=C:/Users/kikus/AppData/Local/Temp/ac50-tracked-394 node graph/abode.js check --creations
    agents 30 / commands 19 / rules 8 / CLAUDE.md あり / git 追跡 true
✗ 兄弟倉の住処が楽園と一致しない (1 件) — 第30条 / EX-2
  創造物の倉が engine の写しを追跡している (第30条) — 58 件 (例: .claude/CLAUDE.md, .claude/agents/acceptance-criteria-writer.md, .claude/agents/architect.md)。兄弟倉の .gitignore に .claude/ を足せ (AC-50)
EXIT=1
```

### AC-50(正)— `check-ignore` が exit 0 を返す

兄弟倉に `.gitignore` を新設した(**別 PR** — 倉が違う。§6)。

```console
$ git -C C:/Users/kikus/Documents/workspace/paradise-creations check-ignore .claude
.claude
EXIT=0
$ git -C C:/Users/kikus/Documents/workspace/paradise-creations ls-files .claude | wc -l
0
$ git -C C:/Users/kikus/Documents/workspace/paradise-creations status --short
 M gauge-ledger.jsonl
```

**兄弟倉に 58 本の神官が実在するのに、git は 1 件も追跡していない。**
`gauge-ledger.jsonl` は着手前から modified であり、**一切触っていない**(教主の指示どおり)。

### AC-51(正)— 住処解決が兄弟倉を指したとき `check-agents` が exit 0 かつ `skipped=false`

```console
$ cd ../paradise-creations && CLAUDE_HOME=<creations>/.claude node <paradise>/graph/check-agents.js
═══════ ⛪ AGENT PRESENCE ═══════
agents dir: C:\Users\kikus\Documents\workspace\paradise-creations\.claude\agents
named by the paradise: 14 (forge.js + clergy.js + examples)
  ✓ all present
  ✓ every phase has a master
  ✓ every dispatch reaches the declared priest
  ✓ the hierarchy is real, not declared
─────────────────────────────────
every named priest exists, every phase has a master, every dispatch reaches the declared priest, the hierarchy is real
═════════════════════════════════
EXIT=0

$ CLAUDE_HOME=<creations>/.claude node -e "…check()…"
{"ok":true,"skipped":false,"dir":"C:\\…\\paradise-creations\\.claude\\agents","need":14,"missing":0}
EXIT=0
```

**`skipped=false` かつ `ok=true` かつ exit 0。** §0.5 で実測した病 —— cwd を移しても
楽園の倉を見ていた —— は、住処解決を兄弟倉へ向けた今、実物を見て緑を返している。

### AC-51(逆)— 「`skipped=true` で `ok=true` を返した瞬間に不合格」の側

住処解決が**神官ゼロの兄弟倉**を指したとき:

```console
$ CLAUDE_HOME=<tmp>/.claude node graph/check-agents.js     # agents/ は空
リポジトリ内の住処に神官が一体も居ない: C:\…\ac51-empty-1352\.claude\agents — node graph/deploy.js --write で建てよ
EXIT=1
$ CLAUDE_HOME=<tmp>/.claude node -e "…check()…"
{"ok":false,"skipped":false,"note":"リポジトリ内の住処に神官が一体も居ない: …"}
```

**`skipped=false` で `ok=false`。** 第3段が建てた掟(不在は skip ではない)がここでも生きている。

---

## 6. 兄弟倉の `.gitignore`(**別 PR** — 倉が違い、独立して審査できる)

`C:/Users/kikus/Documents/workspace/paradise-creations` で枝 `chore/ignore-claude-abode` を切り、
`.gitignore` を新設した。理由は第30条 / EX-2 をコメントで書いた。

```console
$ cd ../paradise-creations && git checkout -b chore/ignore-claude-abode
Switched to a new branch 'chore/ignore-claude-abode'
$ git add .gitignore          # ★ git add . は使っていない
$ git status --short
A  .gitignore
 M gauge-ledger.jsonl         # ← 着手前から modified。触っていない
$ git commit -m "chore(第30条): 楽園の派生物 .claude/ をこの倉の履歴から外す"
[chore/ignore-claude-abode 5549778] chore(第30条): 楽園の派生物 .claude/ をこの倉の履歴から外す
 1 file changed, 15 insertions(+)
 create mode 100644 .gitignore
$ git push -u origin chore/ignore-claude-abode
 * [new branch]      chore/ignore-claude-abode -> chore/ignore-claude-abode
$ gh pr create …
https://github.com/kikusyo1101/paradise-creations/pull/4
```

**PR: https://github.com/kikusyo1101/paradise-creations/pull/4**

`main` へは直接 commit していない。楽園側の PR は開いていない(教主の指示)。
`gauge-ledger.jsonl` は最後まで `M` のままであり、この走者は一度も add していない。

---

## 7. CI への配線 — skip を名乗って exit 0 になることを**実測で**確かめた

`.github/workflows/tribunal.yml` の「🏠 Abode」の直後に節を足した:

```yaml
      # ── 兄弟倉への配備 (第5段 / EX-2 / AC-46〜50) ──
      # CI には兄弟倉が無い。ゆえにここは **`· skip: creations abode 不在: …` を
      # 名乗って exit 0** になるのが正しい(AC-49)。**黙った緑ではない。**
      # 逆に兄弟倉が在るのに神官が居なければ exit 1 —— 不在は skip ではない(AC-48)。
      - name: 🏠 Abode(兄弟倉)— 環が起動する場所に神官が居るか (EX-2 / AC-46〜50)
        run: node graph/abode.js check --creations
```

**「そうなるはず」では証拠にならない。** CI の形(兄弟倉が隣に居ない木)を
`os.tmpdir()` に作って実際に撃った:

```console
$ mkdir -p <tmp>/work/paradise-forge
$ tar -cf - --exclude=.git --exclude=node_modules . | (cd <tmp>/work/paradise-forge && tar -xf -)
$ cd <tmp>/work/paradise-forge
$ node graph/workspace.js resolve
C:\Users\kikus\AppData\Local\Temp\cisim2\work\paradise-creations  (source=default, exists=false)
$ node graph/abode.js check --creations
═══ 🏠 ABODE CHECK (第58条) ═══
  · 除外 1 件: graph/abode.js (…)
  · skip: creations abode 不在: C:\Users\kikus\AppData\Local\Temp\cisim2\work\paradise-creations — 兄弟倉そのものがこの機に無い(clone していない機では創造物も無い)
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
  ✓ 門は黙って緑に落ちず、兄弟の engine は同じ口から住所を得ている
═══════════════════════════════
EXIT=0
```

**CI ではこの節が `· skip:` を印字して exit 0 になる。**

参考: `--creations` を知らない旧 HEAD の clone で同じ命令を撃つと exit 2 で拒まれる
(= この節は CI へ入る前から「旗が実装されていること」を要求している):

```console
$ (第5段の変更前の clone で) node graph/abode.js check --creations
✗ check の知らない旗: --creations — …
EXIT=2
```

---

## 8. 門 — `tests/abode.test.js` に AC-46〜AC-51 を足した

**この門はリポジトリに一行も書かない。** 仕掛けは全て `os.tmpdir()` の複製に対して行い、
住所は `CLAUDE_HOME`(楽園側の `.claude`)と `PARADISE_CREATIONS`(兄弟倉の根)の
env 二本で丸ごと隔離した。ファイル末尾に既に在る密閉性の門 2 本は**緑のまま**である。

正の側と逆の側を両方撃った(17 門を新設 / **66 → 83**):

```console
$ node tests/abode.test.js
…
兄弟倉の住処 (第30条 / EX-2 / AC-46〜51):
  ✓ 【正】兄弟倉に神官が 1:1 で居れば緑 — 名も中身も一致する (AC-46)
  ✓ 【正】現物の兄弟倉が 30 / 19 / 8 で緑 — 作り物だけの門は現実が壊れても鳴らない (§7.2)
  ✓ 【逆】神官を 1 本消すと、その名を名指して赤 (AC-47)
  ✓ 【逆】名が揃っていても中身が違えば赤 — 名の一致は同一性ではない (AC-46)
  ✓ 【逆】楽園に居ない者が兄弟倉に居れば赤 — 1:1 は余剰も許さない (AC-46)
  ✓ 【逆】agents が空なら赤 — skip に落ちてはならない (AC-48)
  ✓ 【逆】兄弟倉は在るのに .claude ごと無ければ赤 — 不在は skip ではない (AC-48)
  ✓ 【正】兄弟倉そのものが無い機は、名乗って skip し exit 0 (AC-49)
  ✓ 【正】CLI の skip は口で名乗る — 黙った緑を許さない (AC-49 / 第58条(e))
  ✓ 【逆】兄弟倉が .claude を git 追跡していれば赤 — 第30条の逆流 (AC-50)
  ✓ 【正】現物の兄弟倉は .claude を追跡していない (AC-50 の正)
  ✓ git を走らせられなければ tracked は null — 黙って false にしない (第37条)
  ✓ 台帳を越えて写さない — settings.json / paradise-daily.json は EX-2 の target に無い
  ✓ --creations は check の知る旗であり、--all にも含まれる (第44条)
  ✓ creationsAbode は住所を自分で組まない — workspace.js の答えの下に住む (第30条)
  ✓ 【逆】AC-51 — 住処解決が神官ゼロを指したとき check-agents は skipped=false で赤
  ✓ 【正】AC-51 — 住処解決が神官の揃った兄弟倉を指せば skipped=false かつ ok=true

門の密閉性 (第58条(c)):
  ✓ この門は版管理下のファイルへ一行も書かない — 仕掛けは全て複製に対して行う
  ✓ この門を走らせても、楽園の作業木は汚れない(前後の差で裁く)

Abode self-test: 83 passed, 0 failed
EXIT=0
```

**囮を仕込んだ門がある**: `fakeCreations()` は楽園側にだけ `settings.json` と
`paradise-daily.json` を置く。門はそれらが**兄弟倉へ写っていないこと**と、
**その不在を咎めていないこと**の両方を裁く —— 台帳を越えて検めれば、
台帳を越えて書いてよいことになるからである。

さらに `graph/abode.json` の EX-2 の `target` と `writer` の文字列そのものを門が握っている。
台帳が変われば門が鳴る(= 門と台帳のどちらが正しいかを決めてから直すことになる)。

---

## 9. 憲法に条は足していない — その判断の根拠

第30条(engine と creation は別の倉に住む)と第58条(住処を知る場所は一つ / skip は名乗る)で
この段の掟は全て導ける。**新しい法理は一つも生まれていない** ——
この段がやったのは、既存の二条を兄弟倉という現場へ**機構として届けた**ことである。
条を足せば「読むべき散文」だけが増える(第33条が戒めた形)。ゆえに足さない。

---

## 10. 検証 — 報告の前に全部走らせた(**直列**で / 第58条(c))

自己診断を並行させると偽の赤が出る。ゆえに `census fix` → `census check` →
素の走行 → `PARADISE_ABODE=repo` → `=global` を一本の直列スクリプトで回した。

| コマンド | exit | 最終行 |
|---|---|---|
| `node graph/abode.js check --creations` | **0** | `✓ 門は黙って緑に落ちず、兄弟の engine は同じ口から住所を得ている` |
| `node graph/abode.js check`(= `--all`) | **0** | 同上 |
| `node tests/abode.test.js` | **0** | `Abode self-test: 83 passed, 0 failed` |
| `node graph/check-agents.js` | **0** | `every named priest exists, every phase has a master, …` |
| `node graph/deploy.js check` | **0** | `✓ every deployed file matches its declared source` |
| `node graph/wiring.js check` | **0** | `✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い`(engine 38 / 辺 72) |
| `node graph/census.js check` | **0** | `✓ every number the paradise claims about itself is true` |
| `node graph/census.js fix` | **0** | `nothing to fix` / `✓ 書き換えた数は、その主張の目で読み直して実測と一致する` |
| `node graph/codex.js check` | **0** | `✓ 索引は本文と一致している (59 条)` |
| `node graph/workspace.js check` | **0** | `✓ 楽園に創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし` |
| `node tests/paradise.test.js`(素) | **0** | `Paradise self-test: 471 passed, 0 failed` |
| `PARADISE_ABODE=repo node tests/paradise.test.js` | **0** | `Paradise self-test: 471 passed, 0 failed` |
| `PARADISE_ABODE=global node tests/paradise.test.js` | **0** | `Paradise self-test: 471 passed, 0 failed` |

**`census fix` は `nothing to fix` を返した** —— 新設した 17 門は
`tests/abode.test.js`(README が数を語らない門)に足したので、README の数値は動かない。
数値を手で書いていないことの証拠でもある(第22条)。

**AC-53(両居)は保たれた**: `repo` と `global` の両方で 471/471。

`node graph/wiring.js check` が緑 = `creationsAbode` / `creationsPlan` / `writeCreations` /
`--creations` の旗は孤児にも宙吊りにもなっていない。

---

## 11. できなかったこと・確かめられなかったこと(第37条)

**測れなかったを緑と呼ばないために、正直に列挙する。**

1. **CI の実走行はまだ見ていない。** §7 の skip は `os.tmpdir()` に作った
   「兄弟倉が隣に居ない木」での実測であり、GitHub Actions のランナー上の生ログではない。
   PR は開いていない(教主の指示)ので、CI が回るのはマージ判断の前段である。
2. **兄弟倉 PR #4 の CI / マージは未確認。** 開いただけである。
   マージ前は `git -C <creations> check-ignore .claude` が緑なのは**作業木の
   `.gitignore`** による。origin/main にはまだ届いていない。
3. **`node graph/abode.js exports --verify EX-2` は依然 exit 2** である。
   `verifyExport()` は EX-1 しか自動照合の道を持たず、EX-2 の照合の道は台帳が
   `node graph/abode.js check --creations` と名指している。**この段でそこを変えていない。**
   ゆえに「台帳の verify 欄が指す道は緑だが、`exports --verify EX-2` は
   『この器では検められない』と答え続ける」—— 設計どおりだが、二つの口が
   同じ問いに別の答え方をしている状態ではある(第6段以降の検討事項として申し送る)。
4. **兄弟倉で実際に環を起動していない。** AC-51 は `check-agents` の住処解決を
   兄弟倉へ向けて撃ったが、「兄弟倉で `claude` を起動して神官が本当に見えるか」を
   人間の目で確かめてはいない。`--add-dir` の実測(discovery-scoping §4)から
   配備が必要と判断した設計に従っただけである。
5. **`skills/` は配備していない。** EX-2 の target に無く、deploy は skills を
   一度も配備しない(design §5.2 の実測: 計画 0 件)。第5段の仕事ではない。
6. **`~/.claude`(神のホーム)には 1 バイトも書いていない。** 撤収は第6段である。
   兄弟倉への配備は `<creations>` 配下のみ。

### 別件(この段の責任ではない — 直していない)

- **`tests/counsel.test.js` の 2 門が赤い。** 着手前の HEAD でも赤く(第4段の
  引き継ぎ書 §7 が実測済み)、CI からも `paradise.test.js` からも呼ばれていない。
  台帳 **[34] GENE-8** として起票済み。
- **gauge 台帳のマージ衝突残骸** による `⚠️ ledger line skipped (corrupt)` の警告。
  台帳 **[26] GAUG-21**。走行のたびに出るが、この段の欠陥ではない。

---

## 12. 変更したファイル

| ファイル | 何を足したか |
|---|---|
| `graph/abode.js` | `CREATIONS_TREES` / `CREATIONS_FILES` / `listMd()` / **`creationsAbode()`** / `spawnGit()`(+167 行、`check` の直前)。`check()` に `creations` の枝と `r.ok` の合成。`CHECK_FLAGS` に `--creations`。`printCheck` に skip と結果の印字。`module.exports` に `creationsAbode` / `CREATIONS_TREES` / `CREATIONS_FILES`。冒頭の CLI 註釈に `--creations`。 |
| `graph/deploy.js` | **`creationsPlan()`** / **`writeCreations()`**(+110 行、`main()` の直前)。`main()` に `--creations` の枝(plan / --write / check の拒否)。`module.exports` に 2 関数。冒頭の CLI 註釈。 |
| `tests/abode.test.js` | 節「7.5 兄弟倉の神官」を **17 門**(+267 行、末尾の密閉性の節の直前)。`fakeCreations()` / `trackInGit()` の仕掛け。 |
| `.github/workflows/tribunal.yml` | 「🏠 Abode(兄弟倉)」の節 7 行(150 行目付近 / 「🏠 Abode」の直後)。 |
| `reform/sovereign-abode/build-5-evidence.md` | 本書(新設)。 |
| **(別倉)** `paradise-creations/.gitignore` | 新設 15 行。`.claude/` と第30条の理由。PR #4。 |

**触っていないもの**: `CLAUDE.md`(倉の直下と `.claude/` の両方)/ `~/.claude` /
`graph/abode.json`(台帳は読むだけ)/ `CONSTITUTION.md` / README の数値 /
兄弟倉の `gauge-ledger.jsonl`。
