# work-1 (第1段) の実出力 — 住所の付け替えは無色透明である

> 本書は **証拠の保管所**である。主張は一つも書かない。全て実走行の出力である。
> 測定機: Windows 11 / git-bash(MSYS) / node v24.14.0 / ブランチ `reform/sovereign-abode-2`
> 走行日: 2026-09-11。`~/.claude` には**一度も書いていない**
> (`deploy.js --write` も `apply-* apply` も走らせていない。verify のみ)。

---

## 1. ゴール —— `check --count` が本当に付け替えた結果として緑

### 付け替え前 (main の HEAD の複製)

```console
$ cd $TEMP/pdbefore && node graph/abode.js check --count
═══ 🏠 ABODE CHECK (第58条) ═══
  · 除外 1 件: graph/abode.js (住所を作るのが職務 / 資格の裏付け: … / homedir 呼び出し 1 箇所)
✗ 楽園の住所を直に作っている engine (16 件) — abode.js を通せ
  graph/apply-guards.js:70   …  graph/apply-models.js:20  …  graph/apply-seat.js:31
  graph/apply-spawn.js:34    …  graph/check-agents.js:106 …  graph/check-agents.js:205
  graph/daily-guard.js:36    …  graph/export-state.js:23  …  graph/kg.js:31
  graph/ordain.js:74         …  graph/pulse.js:320        …  graph/upstream.js:33
  graph/vendor.js:48         …  graph/vendor.js:49
  tools/hooks/paradise-session-start.js:28  …  tools/wire-paradise-hooks.js:17
EXIT=1
```

### 付け替え後 (作業木)

```console
$ node graph/abode.js check --count
═══ 🏠 ABODE CHECK (第58条) ═══
  · 除外 1 件: graph/abode.js (住所を作るのが職務 / 資格の裏付け:
    function resolve+function pathFor+function globalWrite+module.exports を輸出している
    / homedir 呼び出し 1 箇所)
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
EXIT=0
```

**門を緩めていない証拠** —— 走査規則 (`HOMEDIR_PATTERNS`) も除外 (`HOMEDIR_EXCLUDE_FILES`)
も四重の錠 (`exclusionAudit`) も**一文字も変えていない**。`git diff graph/abode.js` は空である。
変えたのは走査**対象**の 14 ファイルだけである。

```console
$ rg -n "os\.homedir\(\)" graph/*.js tools -g '!**/node_modules/**'
graph/abode.js:94:  return (env && (env.USERPROFILE || env.HOME)) || os.homedir();
     ↑ 走るコードの中の呼び出しはこの 1 行のみ (他の hit は全て註釈・診断文)
```

---

## 2. 心臓 —— 前後で同じ値を返すことの実証

探査器 `probe-addresses.js` は engine を実際に require し、**engine が答えた住所そのもの**を
拾う(輸出されていない定数は fs を見張って実測する)。ソースの書き方は一切見ない。
ゆえに前後の木で一行も変えずに走る。

照合器 `compare-addresses.js` は 10 条件で前後を突き合わせる。
**差分は「無い」ことにしない** —— 理由つきで宣言された差分だけが許され、
宣言に無い差分が 1 件でも出れば exit 1 である。

```console
$ node reform/sovereign-abode/compare-addresses.js $TEMP/pdbefore
  一致 134 件 / 宣言された是正 28 件 / **宣言に無い差分 0 件**
✓ 素の走行では住所は一つも動かず、動いた住所は全て理由つきで宣言されている
EXIT=0
```

### 2.1 条件 `bare` (env 無し) —— 神の日常。1 バイトも変わらない

```
  ✓ apply-guards.SETTINGS          C:/Users/kikus/.claude/settings.json
  ✓ apply-models.AGENT_DIR         C:/Users/kikus/.claude/agents
  ✓ apply-seat.SETTINGS            C:/Users/kikus/.claude/settings.json
  ✓ apply-spawn.AGENTS_DIR         C:/Users/kikus/.claude/agents
  ✓ check-agents.check.dir         C:/Users/kikus/.claude/agents
  ✓ check-agents.hierarchy.dir     C:/Users/kikus/.claude/agents
  ✓ daily-guard.LEDGER             C:/Users/kikus/.claude/paradise-daily.json
  ✓ export-state.kgRoot            C:/Users/kikus/.claude/paradise-kg
  ✓ kg.ROOT                        C:/Users/kikus/.claude/paradise-kg
  ✓ ordain.globalAgents            C:/Users/kikus/.claude/agents
  ✓ pulse.claudeDir                C:/Users/kikus/.claude
  ✓ pulse.claudeDir(agents)        C:/Users/kikus/.claude/agents
  ⟳ session-start.lastResort       前=C:/Users/kikus/Documents/workspace/paradise → 後=null
      宣言された是正: 第16条 — 最後の手段の推測の行を削った (§2.4)
  ✓ session-start.paradiseRoot     <REPO>
  ✓ upstream.claudeHome            C:/Users/kikus/.claude
  ✓ upstream.upstreamPath          C:/Users/kikus/Documents/workspace/everything-claude-code
  ✓ vendor.settingsPath            C:/Users/kikus/.claude/settings.json
  ✓ wire-paradise-hooks.SETTINGS   C:/Users/kikus/.claude/settings.json
```

### 2.2 条件 `PARADISE_ABODE=global` —— 明示しても既定と同一

上と**完全に同じ 18 行**。`global` を明示することが既定と同義であることの実証。

### 2.3 個別 env —— 変わった住所は全て「病の是正」である

第58条の前文が名指しした病は「env を四本立てても engine は本物のホームを見ていた」である。
ゆえに個別 env の条件で**一部の住所が変わるのは、病が治った証拠**である。
変わらなければ治っていない。28 件の是正は全て `EXPECTED_DIFFS` に理由つきで載っている:

| 条件 | 住所 | 前 → 後 | 根拠 |
|---|---|---|---|
| `CLAUDE_HOME` | `check-agents.check.dir` | `~/.claude/agents` → `<box>/abode/agents` | AC-17 |
| `CLAUDE_HOME` | `check-agents.hierarchy.dir` | 同上 | AC-17 |
| `CLAUDE_HOME` | `pulse.claudeDir` (+agents) | `~/.claude` → `<box>/abode` | AC-17 (一点突破が 5 箇所に効く) |
| `CLAUDE_HOME` | `apply-models.AGENT_DIR` | `~/.claude/agents` → `<box>/abode/agents` | design §3.1 #2 |
| `CLAUDE_HOME` | `daily-guard.LEDGER` | `~/.claude/…json` → `<box>/abode/…json` | abode の rebase |
| `CLAUDE_HOME` | `wire-paradise-hooks.SETTINGS` | → `<box>/abode/settings.json` | design §3.1 #14 |
| `PARADISE_AGENTS` | `apply-spawn.AGENTS_DIR` | `CLAUDE_HOME` しか見なかった → 従う | **AC-20 の対称性** |
| `PARADISE_AGENTS` | `check-agents.*` / `ordain.globalAgents` | 見なかった → 従う | AC-17 / 第58条(a) |
| `PARADISE_SETTINGS` | `vendor.settingsPath` / `wire-…SETTINGS` | 見なかった → 従う | design §3.1 #13/#14 |
| 全条件 | `session-start.lastResort` | 推測の道 → `null` | 第16条 |

### 2.4 `session-start.lastResort` —— 唯一の「素の走行で変わった値」

`tools/hooks/paradise-session-start.js:28` は `~/.claude` ではなく**楽園リポジトリ自身**の
住所を推測していた(性質が違うので別扱いとした)。

```js
// 前: 一台の機械の都合を全ての機械へ当てはめる推測
return path.join(os.homedir(), 'Documents', 'workspace', 'paradise');
// 後: 判定不能を推測で埋めない (第16条)。呼び手は黙って手を引く
return null;
```

**`abode.js` には繋がない。** 繋げば循環である(`abode.js` は倉の中に住み、倉の場所を前提にする)。
`paradiseRoot()` の**通常経路は一切変わっていない**(`PARADISE_ROOT` → 自己位置の 2 段):

```
  ✓ session-start.paradiseRoot     <REPO>        ← 全 10 条件で前後一致
```

### 2.5 条件 `PARADISE_ABODE=repo` —— 付け替え後のみ意味を持つ

付け替え前は**この env を立てても 16 箇所の一つも動かなかった**(`~/.claude` を見続けた)。
付け替え後:

```
    apply-guards.SETTINGS          <REPO>/.claude/settings.json
    apply-models.AGENT_DIR         <REPO>/.claude/agents
    apply-seat.SETTINGS            <REPO>/.claude/settings.json
    apply-spawn.AGENTS_DIR         <REPO>/.claude/agents
    check-agents.check.dir         <REPO>/.claude/agents
    check-agents.hierarchy.dir     <REPO>/.claude/agents
    daily-guard.LEDGER             <REPO>/.claude/paradise-daily.json
    export-state.kgRoot            <REPO>/graph/kg-store
    kg.ROOT                        <REPO>/graph/kg-store
    ordain.globalAgents            <REPO>/.claude/agents
    pulse.claudeDir                <REPO>/.claude
    pulse.claudeDir(agents)        <REPO>/.claude/agents
    upstream.claudeHome            <REPO>/.claude
    vendor.settingsPath            <REPO>/.claude/settings.json
    wire-paradise-hooks.SETTINGS   <REPO>/.claude/settings.json
    upstream.upstreamPath          C:/Users/kikus/…/everything-claude-code  ← 上流は動かない (正しい)
```

**16 箇所が一斉に倉の内側を向く。** これが第4段(既定の反転)を 1 行で実行できる状態である。
**ただし既定は `global` のまま反転していない**(`DEFAULT_MODE` に一文字も触れていない)。

---

## 3. check-agents の罠 —— 門を消さず、design のとおり分けた

`paradise.test.js:1459`「check-agents skips silently where no harness is installed」は
**存在しない道を明示的に渡して** `skipped===true` を主張している。`explicit` の分岐で保存した:

```console
$ node -e "…ca.check(<存在しない道>)…"
{"明示された不在":{"skipped":true,"ok":true}}          ← 既存の門は生きている

$ node -e "…ca.check()…"                                既定 (mode=global)
{"既定":{"ok":true,"skipped":false,"dir":"C:\\Users\\kikus\\.claude\\agents"}}

$ PARADISE_ABODE=repo node -e "…ca.check()…"            解決器が答えた住所 + mode=repo
{"ok":false,"skipped":false,
 "dir":"C:\\…\\paradise\\.claude\\agents","missing":14,
 "note":"リポジトリ内の住処に神官が一体も居ない: … — node graph/deploy.js --write で建てよ"}
   ↑ 第58条(e): 倉の内側の不在は「ハーネス不在」ではなく派生物の欠損である
```

```console
$ node tests/paradise.test.js --gate 'check-agents'
Paradise gate-filter: 2 of 462 gates matched — 2 green, 0 red
```

**実装時に見つけた落とし穴**: `abode.mode(opts)` と `abode.pathFor('agents')` を
**別々に呼ぶと答えが割れる**(`opts.env` を差した呼び手に対し「mode は repo と答えたのに
住所は global」になる)。住所を作れる場所が一つでも、**引き方が二本なら答えは割れる**。
`abode.resolve(opts)` を一度だけ呼び、そこから両方を採る形に直した。

---

## 4. pulse の一点突破 —— 1 行で 5 箇所

`claudeDir()` (320行) を直した。392 agents / 396 commands / 397 skills / 399 kg / 535 SSE が全て通る。

```console
$ node -e "…pulse.snapshot()…"                        # 通常
{"agents":30,"commands":19,"skills":13,"kgNodes":120,"kgEdges":33,"errors":0}
                                        ↑ design §3.3 の改革前の実測と完全一致

$ USERPROFILE=<sentinel> HOME=<sentinel> node -e "…"   # 裸ホーム
{"agents":null,"commands":null,"skills":null,"kgNodes":null,
 "errors":["counts.agents","counts.commands","counts.skills","counts.kgNodes","counts.kgEdges"]}
                                        ↑ AC-19: 0 で埋めず null + errors。**現状維持を証した**
```

---

## 5. 門の締め直し —— 基準値 16 をゼロ要求へ

`tests/abode.test.js` の `KNOWN_HOMEDIR_RESIDUE = 16` を**定数ごと削除**し、
ゼロを要求する門に置き換えた。かつ **3 本の門を足した**:

| 門 | 何を握るか |
|---|---|
| `住所の直書きは生産コードに一つも無い (第58条(a))` | `homedirRefs()` が空配列であること |
| `check --count は残存ゼロを exit 0 で答える` | exit 0 **かつ**「除外 1 件:」の名乗りが出ること(黙って緩めていない証拠 / 第54条(c)) |
| `【逆】新しい engine が住所を直に作れば赤に戻る` | 偽の倉に直書きを仕込んで**実際に鳴らす**(緑は「撃っても鳴らない」ではない) |
| `旗を立てない check も住所走査を走らせる` | **`--count` が既定経路に在ること**を機械が握る(下記) |

### 「`--count` を `check` の既定経路に入れられるか」の答え

**既に入っている。** `abode.check()` の `all` 分岐が旗なしのとき住所走査を常に走らせる。
だが「入っている」を散文で述べれば腐る(第10条)。ゆえに**旗を立てずに撃って赤になること**を
門が握る形にした —— 誰かが将来 `--count` を旗つきの特別扱いに戻せば、そこが鳴る。

```console
$ node tests/abode.test.js
Abode self-test: 45 passed, 0 failed        (work-0 の 43 → 45)
```

---

## 6. その他の門 (全て実出力)

```console
$ node graph/abode.js check --count       ✓ EXIT=0
$ node graph/abode.js check --ledger      ✓ EXIT=0
$ node graph/abode.js check               ✓ EXIT=0
$ node graph/hermetic.js check            ✓ 版管理下の現物を走行中に書き換える門は無い  EXIT=0
                                            (台帳 0 件のまま。⚠️ 註記は 10 件だが赤ではない)
$ node graph/wiring.js check              ✓ engine 38 / 内の辺 66 / 孤児なし  EXIT=0
                                            (辺 53 → 66 — 13 本の require が増えた)
$ node graph/codex.js check               ✓ 索引は本文と一致している (58 条)  EXIT=0
$ node graph/census.js check              ✓ every number the paradise claims about itself is true  EXIT=0
$ node graph/apply-guards.js verify       ✓ 掟は機構である: deny 9 / ask 1 / allow 5
                                          ✓ hook matcher 13 件すべて生きている  EXIT=0
$ node graph/deploy.js check              ✓ checked: 60 / every deployed file matches its declared source  EXIT=0
$ node graph/deploy.js plan               target: C:\Users\kikus\.claude      ← AC-52: 配備先は動いていない
                                          files : {"plain":23,"own":26,"replace":9}
$ node graph/check-agents.js              ✓ all present / 階層は実在する  EXIT=0
$ node graph/apply-models.js verify       ✓ all agents match the rank policy  EXIT=0
$ node graph/apply-spawn.js verify        ✓ 下位を擁する者は全員発令できる  EXIT=0
$ node graph/apply-seat.js verify         ✓ 教主は宣言どおり座している  EXIT=0
$ node graph/workspace.js check           ✓ 混入なし・住所の直書きなし  EXIT=0
$ node graph/vendor.js verify             ✓ paradise stands on its own  EXIT=0
$ node graph/domains.js check             ✓ 道が名指しする役者は全員宣言を持つ  EXIT=0
$ node graph/kg.js stats                  nodes 120 / edges 33          ← 記憶は無傷
$ node tests/guards.test.js               64 passed, 0 failed
$ PARADISE_SETTINGS=/nonexistent/… node tests/guards.test.js
                                          60 passed, 0 failed, 4 skipped  ← design §5.0 の基点と完全一致
$ node tests/dashboard-count.test.js      15 passed, 0 failed
$ node tests/dashboard-no-deps.test.js    10 passed, 0 failed
```

### 神の資産は無傷

```console
$ ls -la ~/.claude/settings.json
-rw-r--r-- 1 kikus 197609 7954  9月  9 22:59 /c/Users/kikus/.claude/settings.json
                                  ↑ mtime は 2026-09-09 22:59 のまま
$ sha256sum ~/.claude/settings.json
4425f39ed3051abe75f90526e9e1e7f55aba29d88212e21cfd2a7f43b304aa28
$ ls ~/.claude/agents/*.md | wc -l
30
```

---

## 7. 全走行 (git 込みの複製)

```console
$ node tests/paradise.test.js        # $TEMP/pdwork1 (作業木の複製 + git init)
Paradise self-test: 462 passed, 0 failed
```

### 直せなかったもの —— `abandoned-run A-3` の間欠赤 (**私の変更が原因ではない**)

一度目の全走行で 1 件赤が出た。隠さずに書く。

```
  ✗ A-3 [故障注入]: 未完のまま無音の走行を名指しする
      無音の長さを名指ししていない            (assert: dead.idleMs >= 1500*60*1000)
Paradise self-test: 461 passed, 1 failed
```

**原因を実測で特定した。門の時刻競合である**(`tests/abandoned-run.test.js:121-128`):

```js
const at = Date.now();                                   // ← 先に採る
const dead = conclave.runAbandonment(ledger({ lastBeat: ago(1500) }), at);
//                                              ↑ ここで **改めて** Date.now() を読む
assert.ok(dead.idleMs >= 1500 * 60 * 1000);              // 1ms でも進めば破れる
```

**私の変更を一切含まない main HEAD の複製で再現した**:

```console
$ cd $TEMP/pdbefore2 && node -e "…30万回 A-3 の主張を撃つ…"
main HEAD の conclave: 30万回中 idleMs の主張が破れた回数 = 10
```

`graph/conclave.js` も `tests/abandoned-run.test.js` も**私は一行も触っていない**
(`git status --short` が証拠)。**再走行では 462 passed, 0 failed** であり、
main HEAD の全走行も 462 passed, 0 failed である。

**裁定: これは work-1 の回帰ではない。** ただし**間欠的に偽の赤を出す門が実在する**ことは
事実であり、隠さずここに記録する。直すべき形(`at` を `ago()` の後に採る、または
`ledger()` に固定の刻を渡す)は明らかだが、**work-1 の職掌外**であり、
門を勝手に触れば「門を先に緩めた」と区別がつかなくなるので手を触れなかった。

---

## 8. 改変したファイル

**engine 12 / 道具 2 / 門 1 / 宣言 1 = 16 ファイル**(`~/.claude` には一切書いていない)

```
graph/apply-guards.js  graph/apply-models.js  graph/apply-seat.js   graph/apply-spawn.js
graph/check-agents.js  graph/daily-guard.js   graph/export-state.js graph/kg.js
graph/ordain.js        graph/pulse.js         graph/upstream.js     graph/vendor.js
tools/hooks/paradise-session-start.js         tools/wire-paradise-hooks.js
tests/abode.test.js                           overlay/overlay.json ($note のみ)
```

新設(証拠として残す):

```
reform/sovereign-abode/probe-addresses.js     16 箇所の住所を engine から実測する探査器
reform/sovereign-abode/compare-addresses.js   前後を 10 条件で突き合わせ、宣言に無い差分を赤にする
reform/sovereign-abode/build-1-evidence.md    本書
```

**`graph/abode.js` は一行も変えていない**(`DEFAULT_MODE = 'global'` のまま。反転は第4段)。
`graph/abode.json` も触れていない。`git commit` も `gh` も使っていない。

---

## 9. work-1 が満たした AC

| AC | 内容 | 証拠 |
|---|---|---|
| **AC-3** | `check --count` が exit 0(`abode.js` 1 ファイル 1 箇所) | §1 |
| **AC-4** | `~/.claude` リテラル / `CLAUDE_CONFIG_DIR` も 0 件 | §1 (旗なし `check` も緑) |
| **AC-17** | env の逃げ道が無かった engine が解決器に従う | §2.3 / §3 |
| **AC-18/19** | pulse の counts が現状維持(裸ホームで null + errors) | §4 |
| **AC-20** | `apply-models` と `apply-spawn` が同一の口 | §2.3 (`PARADISE_AGENTS` で両者が揃う) |
| **AC-52** | 全走行の数が変わらず、`deploy plan` の target が `~/.claude` のまま | §6 / §7 |
