# 楽園の主権的住処 — 要件定義書 (reform/sovereign-abode / specify)

> **神託**:「グローバルに依存しないようにしたい。Paradise のプロジェクト内だけで完結し、
> グローバルには私が直接追加を依頼したものだけ入れる」
>
> 本書は **要件**である。設計も実装もしていない。engine は一行も変えていない。
> 作ったファイルは本書 1 本のみ。`~/.claude` には一切書いていない。
>
> 上流の根拠: `reform/sovereign-abode/discovery-footprint.md` (668行) /
> `reform/sovereign-abode/discovery-scoping.md` (492行)。本書の数値は全てそこ、
> または本書 §9 の再実測に出典を持つ。
>
> 測定機: Windows 11 / git-bash(MSYS) / node v24.14.0 / ブランチ `reform/sovereign-abode`
> 起草日: 2026-09-10

---

## 0. 一行の要件

**楽園自身の住処を知る器を一つ立て(`graph/abode.js`)、`os.homedir()` を engine 本体から
全て取り上げ、グローバルへの書き込みは「神が名指した物の台帳」に載った物だけを通す。
撤収は神の私物を一指も触れず、撤収で死ぬ門は死なせない。**

改革前の実測: `os.homedir()` は生産コード **14 ファイル / 16 箇所**に散在。
うち `check-agents.js` と `pulse.js` は env の逃げ道が **一つも無い**。
改革後の目標: `os.homedir()` が生産コードに現れるのは **`graph/abode.js` 1 ファイルのみ**。

これは第30条(創造物の住所は `workspace.js` だけが知る)を、**楽園自身の住所**に対して
繰り返す形である。第30条が「作られる物」の住所を一箇所に集めたように、本改革は
「作る物自身」の住所を一箇所に集める。

---

## 1. スコープの線引き — 障害物 20 件の選別

判定の物差しは三つ。
**(あ) 神託を直接満たすか**、**(い) 機械が裁けるか**、**(う) 神の日常を壊さずに動かせるか**。

### 1.1 MUST — 今回の改革で直す (17 件)

| # | 障害物 | 判定 | 分けた理由(一行) |
|---|---|---|---|
| 1 | 58 ファイルの配備先が `~/.claude` | **MUST** | 神託が名指す「グローバルに入る物」の本体であり、`overlay.json` 1 行と既定値の変更で届く |
| 2 | `apply-seat` / `apply-guards` の settings.json | **MUST** | 神のキーと混住する唯一の書き込み先で、放置すれば撤収そのものが不可能になる |
| 3 | `apply-models` の agents 書き換え | **MUST** | 配備物を書き換える二段目の手であり、配備先を移せば必ず追随させねば配備と改変の宛先が割れる |
| 4 | `kg.js` / `export-state.js` の KG | **MUST** | 楽園の記憶本体(nodes 120 / edges 33)がグローバルに住み続ける限り「プロジェクト内で完結」は名乗れない |
| 5 | `daily-guard` の日次台帳 | **MUST** | 第43条の走行権がグローバルのファイル 1 本に握られており、住処を移さねば台帳だけが取り残される |
| 7 | `check-agents` に env スイッチが無い | **MUST** | env でも引数でも逸れない箇所が残ると、宣言だけ内向きで実測は外を見るという最悪の嘘になる(第10条) |
| 8 | `pulse.js` の `claudeDir()` が `os.homedir()` 固定 | **MUST** | ダッシュボードの agents/commands/skills が全てここを通り、数を語る口が古い住処を語り続ける(第22条) |
| 9 | `apply-spawn` が `CLAUDE_HOME` だけを見る | **MUST** | 兄弟の `apply-models` と非対称で、片方だけ逸れると agents の frontmatter が二つの住処に割れる |
| 10 | `vendor.js` の settings 3 経路 | **MUST** | `wire()` がバックアップを作りながらグローバルへ書く現役の口であり、閉じねば許可制に穴が残る |
| 11 | `tools/wire-paradise-hooks.js` | **MUST** | グローバル settings.json を書くことが存在理由の道具で、許可制の下では廃止か台帳経由かの決着が要る |
| 12 | 配備をやめると guards.test の 4 門が消える | **MUST** | 掟と機構の乖離を見る**唯一の目**であり、これを落としたまま緑を出すのは第37条の正面違反 |
| 13 | 6 門が「静かに緑」に落ちる | **MUST** | 黙って早期 return する門は skip としてすら数えられず、改革が門を殺したことに誰も気づけない |
| 14 | settings.json が神の設定と混住 | **MUST** | 撤収の最大の危険であり、神の 5 キーを壊さない保証を機械で作ることが改革の前提条件 |
| 15 | `hooks` 13 群が混住し 6 群が楽園の絶対パスを握る | **MUST** | グローバルが楽園の木を指す**逆向き依存**で、リポジトリを動かした瞬間に神の全プロジェクトが黙って壊れる |
| 16 | `env.PATH` が既に楽園に消されている前例 | **MUST**(機構部分のみ) | engine が神のキーを削除できる権能が生きている限り、撤収が同じ事故を再演する — 権能を機構で封じるのは今回 |
| 19 | `paradise-kg/` は撤収ではなく移設 | **MUST** | 消せば第2原則(自己改善)の土台が死ぬため、「移す」を明示的な要件にしないと撤収の巻き添えになる |
| 20 | 楽園の agents 30 体の行き先 | **MUST**(神が裁定済) | 神が「全部引き上げる」と裁定した — 神は楽園リポジトリを通して他所を操作するため(§1.4) |

### 1.2 SHOULD — 余力があれば今回 (1 件)

| # | 障害物 | 分けた理由(一行) |
|---|---|---|
| 6 | 楽園の残骸ディレクトリ/バックアップ 計 6 件 | engine に生成コードが 0 hit = **誰も再生成しない**ので放置しても害が増えず、削除は神の裁可待ちで改革の成否を左右しない |

### 1.3 OUT — 別の改革へ (2 件)

| # | 障害物 | 分けた理由(一行) |
|---|---|---|
| 17 | `~/.claude/skills/` 13 件の帰属が未確定 | deploy の計画件数が **0** = 楽園は skills を一度も配備していないため撤収対象が存在せず、`overlay/vendor/skills/` の宙吊り資産の帰属整理は vendor 資産の別改革の題である |
| 18 | **hermes 側のグローバル依存** (`~/AppData/Local/hermes/`) | 下記 §1.5 に単独で記す |

### 1.4 障害物 20 (agents 30 体) — 神の裁定と、その裁定に付いた二つの反論

**神の裁定: 全部引き上げる。** 理由は「神は楽園リポジトリを通して他のリポジトリを操作する」。
よってこれは未解決の問いではなく **確定要件** (R-2 / R-11) である。

ただし教主が二つの反論を出し、神が受け入れた。両方を確定要件に落とす。

**反論1 —「楽園由来」と「守備範囲が楽園」は別である。**
`~/.claude/settings.json` の `permissions` は `apply-guards.js:169-200` の `POLICY` が
唯一の出典で、確かに**楽園由来**である。だがその deny 9 件が守っているのは**神の全プロジェクト**である:

```
Bash(git push --force:*) / Bash(git push -f:*) / Bash(git push --force-with-lease:*)
Bash(git reset --hard:*) / Bash(git commit --no-verify:*)
Edit(~/.claude/**) / Edit(**/.env) / Read(**/.env) / Read(**/.env.*)
```

出所を理由に機械的に引き上げれば、**神が他所のリポジトリで作業した瞬間に force-push が通る。**
→ `permissions` は撤収対象から**除外**し、台帳の **第一号 EX-1** として正規の輸出にする (R-7)。
これは「例外」でも「見逃し」でもない。**台帳に登録された、門が名指しで許す輸出**である。

**反論2 — 創造物は兄弟倉に住んでいる (第30条)。**
創造物は `../paradise-creations`(楽園の**外**の別リポジトリ)に住む。実測でも別ディレクトリに
7 つの創造物が在る。神官を `<paradise>/.claude/agents/` に閉じると、
**創造物の倉で起動した環からは 30 体全員が見えなくなる。**
「楽園リポジトリを通して操作する」は人間の運用習慣であって機構ではない(第10条: 宣言は機構ではない)。
→ 兄弟倉でも神官が居ることを**門が確かめる** (R-11)。
**神官を失った環が緑を出し続ける**のが最悪の結末である — それは今回の調査が暴いた病
(check-agents / pulse が env を無視して測らず緑を返す)と**同じ形**である。

### 1.5 障害物 18 (hermes 側の cron 依存) — OUT とする理由を明示する

`tests/paradise.test.js:6167` は `~/AppData/Local/hermes/scripts/paradise-catchup.py` を、
`:6286` は `~/AppData/Local/hermes/cron/jobs.json` を見る。実測でどちらも実在する:

```console
$ ls -la ~/AppData/Local/hermes/scripts/paradise-catchup.py
-rwxr-xr-x 1 kikus 197609 4639  9月  1 22:05 .../paradise-catchup.py

$ node -e "…jobs.json を読む…"
jobs: 2
 - 04a496e1ac86 | { kind: 'cron', expr: '0 22 * * *' } | あなたはkikusの楽園（Paradise…）の教主…
 - fbdf33f304f3 | { kind: 'cron', expr: '*/30 * * * *' } | …
```

**OUT の理由は三つ。いずれも「今は手を出せない」ではなく「手を出すべきでない」である。**

1. **cron は本質的にマシン単位の資産である。** 発火器は「いつ・どのマシンが走るか」を
   決める物であり、リポジトリはそれを知らない。リポジトリ内に cron を置いても、
   誰かが登録しなければ一度も鳴らない。住所を移すことに意味が無い。
2. **神が意図的に入れた物である。** 神が hermes に日次ジョブを登録した。
   神託は「グローバルには**私が直接追加を依頼したものだけ**入れる」であり、
   これは神託が**禁じている物ではなく、神託が許している物の見本**である。
3. **第46条が「写経するな、指せ」と命じている。** jobs.json は楽園の道を**指している**
   (実測: prompt が楽園のパスと役割を指し、手順を写経していない)。指す物を引き上げれば、
   指す先を失うか、写経に退化する。第46条の正面違反になる。

**よって障害物 18 は「非依存化の対象外」であると要件で確定させる。**
ただし**黙って対象外にはしない** — 台帳の `scope: "machine"` 区画に
**輸出ではなく「外部資産」として明示的に登録**し、門が「この 2 件は意図された外部依存である」と
名乗れるようにする (AC-24)。第54条(c): 免除は記録されて初めて例外である。

---

## 2. 要件一覧 (MUST) — R-1 〜 R-12

| ID | 要件 | 主な出所の障害物 |
|---|---|---|
| R-1 | 楽園自身の住処を知る器を**一つ**立てる (`graph/abode.js`) | 7, 8, 9, 10 |
| R-2 | 配備先の既定をリポジトリ内 `<repo>/.claude/` へ移す | 1, 3, 20 |
| R-3 | KG と日次台帳の既定をリポジトリ内へ移す(消さず移す) | 4, 5, 19 |
| R-4 | settings の既定をリポジトリ内へ移し、神のキーに触れない | 2, 14 |
| R-5 | env の逃げ道が無い engine を是正する | 7, 8, 9, 10, 11 |
| R-6 | グローバルへの輸出を許可制にする(台帳 + 門) | 神託本体 |
| R-7 | `permissions` を台帳第一号 EX-1 として明示輸出する | 反論1 |
| R-8 | `hooks` 6 件の逆向き依存を撤収する | 15 |
| R-9 | 撤収の安全 — 不可侵名簿を門に落とす | 14, 16 |
| R-10 | 回帰の見張り — 消える 4 門と静かな 6 門を死なせない | 12, 13 |
| R-11 | 創造物の倉でも神官が居ることを門が確かめる | 反論2, 20 |
| R-12 | 段階移行 — env で両居させ、後から既定を反転する | 全件 |

---

## 3. 受入条件 (AC) — 「この門が、この入力で、こう鳴る」

**AC の書式**: 門 / 入力 / 期待。
**両方向を証さない AC は AC ではない** (第57条・第37条)。
健全な系で緑になるだけの門は、何も証明していない。ゆえに各要件は
**正の AC(正しい系が通る)と 逆の AC(欠陥を注入すると名指しで鳴る)を対で持つ。**

---

### R-1 — 住処を知る器は一つだけ

新しい engine `graph/abode.js` が、楽園自身の住処に関する**唯一の権威**になる。
解決する住所: `abode`(配備先) / `settings` / `agents` / `commands` / `rules` / `kg` /
`dailyLedger` / `creationsAbode`。決定順は `PARADISE_ABODE` env → 既定(リポジトリ内)。

**AC-1**(正) — 門: `node graph/abode.js resolve --json`
入力: `HOME=<sentinel> USERPROFILE=<sentinel>` (存在しない sentinel ディレクトリ)
期待: **exit 0**。印字された全ての住所が `<repo>` で始まる。`sentinel` を含む住所が **0 件**。
sentinel ディレクトリの中身は走行後も **0 ファイル**(器は住所を答えるだけで、何も作らない)。

**AC-2**(逆) — 門: `node graph/abode.js check`
入力: `graph/pulse.js` に `os.homedir()` を 1 行仕込む(検証後に戻す)
期待: **exit 1**。出力に `graph/pulse.js:<行番号>` と `os.homedir()` の両方が現れる。
「どこかに違反がある」ではなく**行を名指す**こと。

**AC-3**(数える) — 門: `node graph/abode.js check --count`
入力: 無し(素の状態)
期待: 生産コード(`graph/*.js` + `tools/**`)における `os.homedir()` の出現が
**`graph/abode.js` 1 ファイル・N 箇所のみ**。それ以外の出現が 1 件でもあれば exit 1。
**改革前の実測ベースライン = 14 ファイル / 16 箇所**:

```console
$ rg -c "os\.homedir\(\)" graph/*.js tools -g '!**/node_modules/**' | sort
graph/apply-guards.js:1   graph/apply-models.js:1  graph/apply-seat.js:1
graph/apply-spawn.js:1    graph/check-agents.js:2  graph/daily-guard.js:1
graph/export-state.js:1   graph/kg.js:1            graph/ordain.js:1
graph/pulse.js:1          graph/upstream.js:1      graph/vendor.js:2
tools\hooks\paradise-session-start.js:1            tools\wire-paradise-hooks.js:1
```

**AC-4**(逆・住所詐称) — 門: `node graph/abode.js check`
入力: `graph/kg.js` の `PARADISE_KG` 参照を消して `~/.claude/paradise-kg` 直書きに戻す
期待: **exit 1**。`~/.claude` という文字列リテラルが `abode.js` 以外に現れたことを名指す。
(`~` 展開も `CLAUDE_CONFIG_DIR` 参照も同じ扱い。**住所を作れるのは abode だけ**。)

---

### R-2 — 配備先の既定をリポジトリ内へ

**AC-5**(正) — 門: `node graph/deploy.js plan`
入力: env 無し
期待: `target` が `<repo>\.claude` である。`files` の合計が **58** のまま
(`{"plain":23,"own":26,"replace":9}` — 内訳が変わったら別の欠陥である)。
改革前の実測: `target : C:\Users\kikus\.claude` / 合計 58。

**AC-6**(正) — 門: `node graph/deploy.js check`
入力: 配備済みのリポジトリ内住処
期待: **exit 0**、`checked: 60`(58 ファイル + 教主の座 + 掟)。
`skipped` が true で緑を返してはならない — **リポジトリ内の住処では不在は欠陥である**。

**AC-7**(逆) — 門: `node graph/deploy.js check`
入力: `<repo>/.claude/agents/cardinal.md` を 1 バイト書き換える
期待: **exit 1**。`cardinal.md` を名指す。

**AC-8**(逆・不在) — 門: `node graph/deploy.js check`
入力: `<repo>/.claude/` ごと消す(リポジトリ内の住処が既定のとき)
期待: **exit 1**。「配備されていない」を **skip ではなく赤**で鳴らす。
ただし `PARADISE_ABODE=global` を明示したときのみ、ハーネス不在は
**名乗った skip**(`skipped: <理由>` を印字し `N skipped` に数える)として許される。

---

### R-3 — KG と日次台帳は「移す」のであって「消す」のではない

**AC-9**(正・移設の完全性) — 門: `node graph/abode.js migrate --verify`
入力: 移設後
期待: **exit 0**。移設元と移設先の `nodes.jsonl` / `edges.jsonl` / `cochange.jsonl` の
**行数が一致**し、各行の sha256 集合が一致する。
改革前の実測ベースライン: **nodes 120 / edges 33 / cochange 5**。

**AC-10**(逆) — 門: `node graph/abode.js migrate --verify`
入力: 移設先の `nodes.jsonl` から末尾 1 行を削る
期待: **exit 1**。`nodes.jsonl: 120 期待 / 119 実測` のように**数を名指す**。
「移した」という自己申告では通らない。

**AC-11**(正) — 門: `node graph/kg.js stats`
入力: `HOME=<sentinel> USERPROFILE=<sentinel>`
期待: **exit 0** かつ nodes 120 を返す(住処がリポジトリ内なので裸ホームでも記憶は生きている)。
改革前は同じ入力で `<sentinel>\.claude\paradise-kg` を見て 0 件になる。

**AC-12**(正) — 門: `node graph/daily-guard.js status`
入力: `HOME=<sentinel> USERPROFILE=<sentinel>`
期待: **exit 0**。台帳の住所が `<repo>` で始まる。
第55条(台帳は冪等)の既存門が引き続き緑であること。

---

### R-4 — settings の既定をリポジトリ内へ。神のキーには触れない

**AC-13**(正) — 門: `node graph/apply-guards.js verify`
入力: env 無し
期待: **exit 0**。検査対象が `<repo>/.claude/settings.json`。
出力に `deny 9 / ask 1 / allow 5` と `hook matcher N 件すべて生きている`。
改革前の実測: `✓ 掟は機構である: deny 9 / ask 1 / allow 5` / `✓ hook matcher 13 件すべて生きている`。

**AC-14**(正) — 門: `node graph/derived.js check`
入力: 無し
期待: **exit 0**。`<repo>/.claude/settings.json` は git 追跡された**派生物**であり、
その `permissions` が `apply-guards.POLICY` と、`model`/`effortLevel` が
`clergy.RANKS.pontiff` と一致する(第29条: 派生は真実の写し)。
**追跡する理由**: clone 直後から存在しなければ、R-10 の 4 門が CI で必ず skip に落ちる。

**AC-15**(逆) — 門: `node graph/derived.js check`
入力: `<repo>/.claude/settings.json` の `permissions.deny` から 1 件消す
期待: **exit 1**。消えた deny 文字列を名指し、`node graph/apply-guards.js apply` を示す。

**AC-16**(逆・神のキーへの手) — 門: `node graph/abode.js check`
入力: `apply-guards.js` の `repairEnv()` が、台帳に無いキーを削除できる状態
期待: **exit 1**。「engine が神のキーを削除する権能を持っている」ことを名指す。
**要件**: 撤収と修理は、**台帳に載っていないキーを削除してはならない**。
削除が要るなら、それは神への提示であって engine の判断ではない(障害物16の再演防止)。

---

### R-5 — env の逃げ道が無い engine の是正

**AC-17**(逆・現状の再現) — 門: 任意の解決器プローブ
入力: `USERPROFILE=<sentinel> HOME=<sentinel> CLAUDE_HOME=/nonexistent
PARADISE_AGENTS=/nonexistent PARADISE_KG=/nonexistent PARADISE_SETTINGS=/nonexistent/settings.json`
期待(**改革後**): `check-agents.check().dir` が `<repo>/.claude/agents` を返し、
`skipped=false` かつ神官 30 体を数える。
**改革前の実測(これが直すべき病)**:

```console
$ USERPROFILE=<sentinel> HOME=<sentinel> CLAUDE_HOME=/nonexistent \
  PARADISE_AGENTS=/nonexistent PARADISE_KG=/nonexistent node <probe>
homedir              -> C:/Users/kikus/AppData/Local/Temp/pdreq-sentinel-home
check-agents.dir     -> C:\Users\kikus\AppData\Local\Temp\pdreq-sentinel-home\.claude\agents
check-agents.skipped -> true  ok= true          ← 測らずに ok=true を返している
```

**この `skipped=true ok=true` こそが今回の改革が殺すべき形である。**
測っていないのに緑。第37条(不在は通過ではない)の正面違反。

**AC-18**(正) — 門: `node graph/pulse.js counts --json`
入力: `HOME=<sentinel> USERPROFILE=<sentinel>`
期待: `counts.agents = 30` / `counts.commands = 19`。`null` を返してはならない。
ダッシュボードが数を語る以上、その数の出所は住処の器でなければならない(第22条)。

**AC-19**(逆) — 門: `node graph/pulse.js counts --json`
入力: `<repo>/.claude/agents/` を空にする
期待: **exit 1**(または `counts.agents=0` + `errors` に名指しの項目)。
**0 を静かに返して緑にしてはならない。**

**AC-20**(正・対称性) — 門: `node graph/abode.js check --symmetry`
入力: 無し
期待: `apply-models` と `apply-spawn` が**同一の解決器**から agents 住処を得ている。
片方が `PARADISE_AGENTS` を見て他方が `CLAUDE_HOME` を見る非対称(障害物9)は exit 1。

**AC-21**(正) — 門: `node graph/wiring.js check`
入力: 無し
期待: `tools/wire-paradise-hooks.js` が孤児として名指されるか、
または abode 経由に書き換わっている。第44条(死んだ道具は無害ではない)。

---

### R-6 — 許可制の契約 (§4 に詳述)

**AC-22**(正) — 門: `node graph/abode.js exports`
入力: 無し
期待: **exit 0**。台帳の全エントリを、`id / target / writer / reason / ordainedOn` 付きで印字。
**黙って通した輸出はゼロ**(第54条(c): 免除は記録されて初めて例外である)。

**AC-23**(逆・台帳に無い輸出) — 門: `node graph/apply-guards.js apply`
入力: `graph/abode.json` の `exports` から EX-1 を消した状態で、
`PARADISE_ABODE=global` を立てて実行
期待: **exit 1**。`~/.claude/settings.json#/permissions は台帳に無い輸出である` と
**宛先を名指して**拒む。1 バイトも書かない(走行後の mtime が不変)。

**AC-24**(正・外部資産の明示) — 門: `node graph/abode.js exports --external`
入力: 無し
期待: hermes の 2 件(`cron/jobs.json` / `scripts/paradise-catchup.py`)が
`scope: "machine"` / `kind: "external-asset"` として印字される。
**「対象外」を黙って対象外にしない。**

**AC-25**(逆・空の申告) — 門: `node graph/abode.js check`
入力: 台帳に `{"id":"EX-9","target":"","reason":"","ordainedOn":""}` を足す
期待: **exit 1**。`EX-9: target が空 / reason が空 / ordainedOn が日付として読めない` を名指す。
**第54条の先例(空のマーカー 1 個で三法が素通りした)を、台帳で再演させない。**

**AC-26**(逆・名乗りの詐称) — 門: 実行時の輸出関門
入力: `graph/kg.js` から `abode.globalWrite('~/.claude/settings.json#/permissions', …)` を呼ぶ
(台帳の `writer` は `graph/apply-guards.js`)
期待: **throw + exit 1**。`EX-1 の writer は graph/apply-guards.js — 呼び手は graph/kg.js` と鳴る。
**呼び手は自己申告のフラグではなく、実測された呼び出し元で判定する**(第54条(a): 資格は名乗りではなく住所が決める)。

---

### R-7 — `permissions` は台帳第一号 EX-1

**AC-27**(正) — 門: `node graph/abode.js exports --verify EX-1`
入力: 無し
期待: **exit 0**。実機の `~/.claude/settings.json` の `permissions` が
`apply-guards.POLICY` と**完全一致**し、deny 9 / ask 1 / allow 5 を印字する。

**AC-28**(逆・輸出の腐食) — 門: 同上
入力: 実機の `permissions.deny` から `Bash(git push --force:*)` を消した複製に対して verify
期待: **exit 1**。消えた 1 行を名指す。
**輸出は「出したら終わり」ではない。出した先も門が見張る。**

**AC-29**(逆・撤収の暴走) — 門: `node graph/abode.js retreat --plan`
入力: 無し
期待: 撤収計画に `permissions` が**含まれない**。含まれたら exit 1。
「楽園由来だから引く」という機械的判断が、台帳の EX-1 に**必ず阻まれる**ことを証す。

---

### R-8 — `hooks` 6 件の逆向き依存を撤収する

**教主の決定: 6 件すべて撤収対象。** 理由は三つ。

1. **第20条(a)の鏡像違反である。** 第20条は「配備物・設定・フックは楽園が所有しない木を
   指してはならない」と命じる。今起きているのはその**鏡**で、グローバル設定が楽園の木を指している。
   方向が逆でも、結び目の危険は同じである。
2. **リポジトリを動かせば神の全プロジェクトが黙って壊れる。** 実測で 6 本:

```console
$ node <probe>
hook refs into paradise repo: 6
   .../overlay/vendor/scripts/hooks/suggest-compact.js
   .../overlay/vendor/scripts/hooks/pre-compact.js
   .../overlay/vendor/scripts/hooks/session-start.js
   .../tools/hooks/paradise-session-start.js
   .../overlay/vendor/scripts/hooks/session-end.js
   .../overlay/vendor/scripts/hooks/evaluate-session.js
hooks events: PreToolUse:3 PreCompact:1 SessionStart:2 PostToolUse:4 Stop:1 SessionEnd:2
```

3. **楽園の記憶注入は楽園の中でだけ意味を持つ。** KG がリポジトリ内へ移る以上
   (R-3)、他所のリポジトリのセッション開始に楽園の KG を注入するのは文脈の汚染である。

**ただし黙って撤収しない。** 汎用に見える 5 本(vendor 由来)については、
撤収計画が**一覧を印字して神の名指しを求める**。神が「残せ」と名指した物だけが台帳へ載る。
これは「例外を作る」のではなく、**許可制の正しい使い方**である。

**AC-30**(正) — 門: `node graph/abode.js check --backrefs`
入力: 撤収後
期待: **exit 0**。`~/.claude/settings.json` の中に
`C:/Users/kikus/Documents/workspace/paradise` を含む文字列が **0 件**。
改革前の実測ベースライン = **6 件**。

**AC-31**(逆) — 門: 同上
入力: `hooks` に楽園リポジトリの絶対パスを 1 本戻す
期待: **exit 1**。そのフックの `event` と `matcher` と絶対パスを名指す。

**AC-32**(正・機能の移送) — 門: `node graph/apply-guards.js verify`
入力: `<repo>/.claude/settings.json`
期待: 楽園のフック(KG 注入 / PreCompact / SessionEnd)が**リポジトリ内の settings に生きている**。
撤収は「消す」ではなく「移す」であることを、フック数で証す。

---

### R-9 — 退路と安全: 撤収で壊してはならない物

#### 9.1 不可侵名簿 (絶対に触れない)

| 対象 | 帰属 | 撤収時 |
|---|---|---|
| `.credentials.json` / `.credentials.lock` | Claude Code (認証) | **絶対不可侵** |
| `projects/` (28M) | Claude Code (セッション履歴の本体) | **絶対不可侵** |
| `plugins/` (7.3M) | 神の私物 (marketplace) | **絶対不可侵** |
| `sessions/` / `session-env/` / `shell-snapshots/` / `history.jsonl` | Claude Code | 不可侵 |
| `skills/learned/` / `skills/pr-review/` | 神の私物 (vendor に複製なし) | **絶対不可侵** |
| `skills/` の残り 11 件 | 帰属未確定 (障害物17 = OUT) | **今回は触れない** |
| `policy-limits.json` / `remote-settings.json` / `backups/` / `cache/` / `ide/` / `.last-cleanup` | Claude Code | 不可侵 |
| `settings.json.pre-wire.bak` / `settings.json.bak.1787846094` | **神の原初設定の唯一の証拠** | **保存** |
| settings.json の神 5 キー | 神 | **不可侵**(§9.2) |
| settings.json の `permissions` | 楽園由来・守備範囲は神 | **台帳 EX-1 により残す** |

**AC-33**(正) — 門: `node graph/abode.js retreat --verify`
入力: 撤収後
期待: **exit 0**。名簿の全項目について「**存在し、かつ内容が一致する**」ことを印字する。
ディレクトリは (ファイル数, 合計バイト, 最新 mtime) の三つ組で照合する
(28M/7.3M を毎回ハッシュしない現実的な設計)。
**「存在する」だけでは通さない** — 第37条: 不在は通過ではない。存在も通過ではない。

**AC-34**(逆) — 門: 同上
入力: 名簿の複製から `skills/learned/` を消す
期待: **exit 1**。`skills/learned/: 撤収前 N ファイル / 撤収後 0 ファイル` と名指す。

#### 9.2 神の 5 キーが無傷であることを機械で確かめる方法

settings.json は神のキーと混住しており、engine は `JSON.stringify(next)` の
**全書き戻し**方式である以上、撤収時に必ず全キーを触る。よって照合は必須である。

**機構**:
1. 撤収**前**に `node graph/abode.js retreat --plan` が、神の 5 キーだけを抜き出し、
   **キー名でソートした正準 JSON** の sha256 を計算し、
   `reform/sovereign-abode/retreat-baseline.json` に凍結する(git 追跡)。
2. 撤収**後**に `node graph/abode.js retreat --verify` が同じ計算をやり直し、
   sha256 が一致しなければ exit 1 で**差分キーを名指す**。

**AC-35**(正) — 門: `node graph/abode.js retreat --verify`
入力: 撤収後の実機 `~/.claude/settings.json`
期待: **exit 0**。神 5 キーの正準 sha256 が凍結値と一致。
**本書起草時に実測した現行値(先頭 16 桁)= `cbca9224ec5e6cac`**:

> ⚠️ **【第6段での追記 — この数は後に再現不能であることが判明した】**
>
> 第6段(work-6)の実装時、起草時のプローブ `pddes-god.js` が倉にも git 履歴にも
> 存在しないことが判り、正準化の流儀を **8 通り**試したが `cbca9224ec5e6cac` を
> 再現できなかった(sorted / 宣言順 / 本書の記載順 × compact / indent2 / +NL /
> entries 配列 / 値のみ)。実測:
>
> ```console
> 1 sorted   / compact           b66c5008319d71c6      5 reqOrder / compact    0f41c6a8d2b23a2e
> 2 sorted   / indent2           191de27c0294f054      6 reqOrder / indent2    080354a2bf34fb10
> 3 sorted   / indent2 + NL      9e327e9def86fe2f      7 entries配列 (sorted)  e619c7da5032b3b5
> 4 declOrder/ compact           511fe0210d91750d      8 値のみ (sorted)        7eb516e948664457
> ```
>
> さらに、**神 5 キーは 2026-08-27 の原初設定の退避から今日まで一バイトも変わっていない**:
> `settings.json` / `settings.json.bak.1787846094` / `settings.json.pre-wire.bak` の
> 三者の正準 sha が全て `b66c5008319d71c6` で一致する。
> ゆえに「起草時と値が動いたから違う」という説明も成り立たない。
>
> **この記載を消さないのは、歴史を消さないためである。**「測ったつもりで外した」こと
> 自体が教訓である(第37条)。**下の実測ブロックは起草時の記録としてそのまま残す。**
>
> **正典は本節 §9.2 の機構のほうである** —— `retreat --plan` が実測して
> `reform/sovereign-abode/retreat-baseline.json` に凍結し、`retreat --verify` は
> **凍結値と照合する**。数は実測が生むのであって、散文に書いた数が正典なのではない(第22条)。


```console
$ node <probe>
keys: enableWorkflows, extraKnownMarketplaces, language, theme, agentPushNotifEnabled,
      hooks, model, effortLevel, permissions
  GOD theme = "dark"
  GOD language = "japanese"
  GOD enableWorkflows = true
  GOD extraKnownMarketplaces = {"claude-plugins-official":{"source":{"source":"github",
      "repo":"anthropics/claude-plugins-official"}}}
  GOD agentPushNotifEnabled = true
paradise keys: model="fable" effortLevel="xhigh" permissions.deny=9
god-subset-sha256: cbca9224ec5e6cac
```

**AC-36**(逆・キーの消失) — 門: 同上
入力: 複製から `language` キーを削除
期待: **exit 1**。`神のキーが消えた: language ("japanese")` と名指す。

**AC-37**(逆・値の改変) — 門: 同上
入力: 複製の `theme` を `"dark"` → `"light"` に変える
期待: **exit 1**。`神のキーの値が変わった: theme "dark" → "light"` と名指す。
**存在だけを見る門は、値の改変を見逃す。両方を見る。**

**AC-38**(逆・キーの増殖) — 門: 同上
入力: 複製に `"newKey": 1` を足す
期待: **exit 1**。`台帳に無いキーが増えた: newKey`。
撤収が神の設定に**足す**のも、引くのと同じく無断の改変である。

---

### R-10 — 回帰の見張り: 消える 4 門と静かな 6 門

**これは本改革で最も落としやすい要件である。** 配備を内向きにすると、
実機を見ていた門が「実機が無い」と判断して黙って消える。実測で再現済み:

```console
$ node tests/guards.test.js
Paradise guards self-test: 64 passed, 0 failed

$ PARADISE_SETTINGS=/nonexistent/settings.json node tests/guards.test.js
  · the real machine enforces no unconditional BLOCK  (skipped: no ~/.claude/settings.json …)
Paradise guards self-test: 60 passed, 0 failed, 4 skipped
```

**この目を死なせないための答えは「向け直す」でも「別に立てる」でもなく、両方である。**
4 門は**リポジトリ内の住処を見るように向け直し**、
かつ**実機の輸出 EX-1 を見る門を新たに立てる**。片方だけでは必ず穴が残る:

- 向け直すだけ → 実機に残る `permissions`(EX-1)を誰も見なくなる。輸出が腐っても鳴らない。
- 別に立てるだけ → リポジトリ内の settings が腐っても鳴らない。

**AC-39**(正・門の総数) — 門: `node tests/guards.test.js`
入力: env 無し(改革後)
期待: `Paradise guards self-test: N passed, 0 failed, **0 skipped**`。
`N ≥ 64 + (新設の EX-1 門)`。**skipped が 1 でもあれば要件未達。**
改革前の実測ベースライン: 通常 `64 passed, 0 failed`(skipped 表示なし)/
`PARADISE_SETTINGS=/nonexistent` で `60 passed, 0 failed, 4 skipped`。

**AC-40**(逆・4 門が本当に噛むか) — 門: `node tests/guards.test.js`
入力: `<repo>/.claude/settings.json` に死んだ matcher を 1 本仕込む
(実在しないツール名にしか当たらない matcher)
期待: **exit 1**。門 `the real settings.json has no dead and no overfiring matcher` が
その `event[index]` を名指す。**向け直した門が、向け直した先でも噛むことを証す。**

**AC-41**(逆・不在は skip ではなく赤) — 門: `node tests/guards.test.js`
入力: `<repo>/.claude/settings.json` を消す(既定 = リポジトリ内住処のとき)
期待: **exit 1**。**skip に落ちてはならない。**
リポジトリ内の住処で settings が無いのは「ハーネス不在」ではなく「派生物の欠損」である。

**AC-42**(正・輸出を見る新しい目) — 門: `node tests/guards.test.js`
入力: 実機に `~/.claude/settings.json` が在る
期待: 新設の門 `台帳 EX-1 は実機で生きている` が緑。実機の `permissions` が POLICY と一致。
実機が無い CI では **`skip('実機の ~/.claude/settings.json が無い — EX-1 は検めない')` と
名乗り、`N skipped` に数えられる**。黙って return しない。

**AC-43**(正・静かな緑の根絶) — 門: `node graph/abode.js check --silent-green`
入力: 無し
期待: **exit 0**。`tests/*.js` に `if (!fs.existsSync(...)) return;` 形の
**黙った早期 return が 0 件**。全て `skip('<理由>')` に置換されている。
**改革前の実測ベースライン = 7 hit**(うち 1 件は変異注入用の文字列リテラル):

```console
$ rg -n "existsSync\([^)]*\)\) return" tests/*.js | wc -l
7
tests/paradise.test.js:2965   tests/paradise.test.js:5006(変異注入の文字列)
tests/paradise.test.js:5607   tests/paradise.test.js:6245  tests/paradise.test.js:6287
tests/dashboard-no-deps.test.js:69   tests/dashboard-links.test.js:89
```

**AC-44**(逆) — 門: 同上
入力: `tests/paradise.test.js` に `if (!fs.existsSync(p)) return;` を 1 行戻す
期待: **exit 1**。`tests/paradise.test.js:<行>` を名指し、
`skip() を使え — 黙った return は N skipped に数えられない` と鳴る。

**AC-45**(正・6 門の実質) — 門: `node tests/paradise.test.js --gate 'deploy|conclave: 配備|check-agents|seat|配備'`
入力: env 無し(改革後)
期待: `23 of N gates matched — 23 green, 0 red, **0 skipped**`。
改革前の実測: 通常環境・`CLAUDE_HOME=/nonexistent`・裸ホームの**三つ全てで
`23 green, 0 red`** — つまり**この 23 門は環境の違いを一度も検出できていない**。
改革後は、リポジトリ内住処を壊せば赤くなること(AC-41 と同型)を各門で証す。

---

### R-11 — 創造物の倉でも神官が居ることを門が確かめる

#### 11.1 取りうる道の比較

| 道 | 内容 | 長所 | 短所 | 判定 |
|---|---|---|---|---|
| **甲** | 兄弟倉にも配備する (`../paradise-creations/.claude/`) | 神官 + 掟 + CLAUDE.md が全て載る。`deploy check` が既に drift を裁ける。起動フラグ不要 = 忘れようがない | 楽園の外へ書く(→ 台帳 EX-2 が要る)。兄弟倉の git 汚染を防ぐ手当てが要る | **推奨** |
| 乙 | `--add-dir` を機構が強制する | 書き込みゼロ | **実測で `--add-dir` は `CLAUDE.md` も `rules/` も hooks も読まない**(agents/skills/commands のみ)。掟が載らない。かつラッパ必須 = 忘れれば無音で失われる | 却下 |
| 丙 | 「起動は必ず楽園から」と門が検める | 実装が最も軽い | **人間の運用習慣を門が事後に叱るだけ**。神官が居ない環はもう走ってしまっている。第10条: 宣言は機構ではない | 却下 |
| 丁 | 兄弟倉の `.claude` を junction/symlink にする | 複製ゼロ | Windows では権限が要る。git が追えない。CI で再現できない | 却下 |

**推奨は甲。** 決め手は「忘れようがないこと」である。
乙と丙はどちらも**人間が正しく起動すること**に依存し、失敗が**無音**である。
今回の調査が暴いた病(`check-agents` が測らずに `skipped=true ok=true` を返す)と同じ形で、
**神官を失った環が緑を出し続ける**。甲だけがその形を持たない。

甲は楽園の外へ書くため、**台帳 EX-2 として登録された正規の輸出**とする(§4.2)。
そして兄弟倉の `.claude/` は**創造物の倉の git に追跡させない** —
創造物の倉に engine の写しを commit すれば、第30条の分離が逆流する。

#### 11.2 AC

**AC-46**(正) — 門: `node graph/abode.js check --creations`
入力: 兄弟倉 `../paradise-creations` が実在する(実測: 実在。7 創造物 + README)
期待: **exit 0**。`<creations>/.claude/agents/*.md` が楽園の **30 体と 1:1 一致**
(欠落 0 / 余剰 0)。`commands` 19 / `rules` 8 / `CLAUDE.md` も同様。

**AC-47**(逆・欠落) — 門: 同上
入力: 兄弟倉から `cardinal.md` を 1 本消す
期待: **exit 1**。`creations abode: 神官が欠けている — cardinal` と名指す。

**AC-48**(逆・神官ゼロは赤) — 門: 同上
入力: 兄弟倉の `.claude/agents/` を空にする(または `.claude/` ごと不在)
期待: **exit 1**。**skip に落ちてはならない。**
実測で現在は `../paradise-creations/.claude` が**存在しない**
(`ls: cannot access '../paradise-creations/.claude': No such file or directory`)。
つまり**改革前の今この瞬間、創造物の倉には神官が一体も居ない**。
この状態を「不在だから問わない」で通せば、反論2 が警告した最悪の結末そのものになる。

**AC-49**(正・倉が無い機では名乗って skip) — 門: 同上
入力: 兄弟倉が存在しないマシン(CI)
期待: **exit 0** かつ `skip('creations abode 不在: <path>')` を**印字**し、
走行末尾の `N skipped` に数えられる。黙って緑にしない。

**AC-50**(逆・第30条の逆流) — 門: `node graph/abode.js check --creations`
入力: 兄弟倉で `.claude/` が git 追跡されている状態
期待: **exit 1**。`創造物の倉が engine の写しを追跡している (第30条)` と鳴る。
正の側: `git -C <creations> check-ignore .claude` が exit 0 を返すこと。

**AC-51**(正・全数の一致) — 門: `node graph/check-agents.js`
入力: 兄弟倉を作業ディレクトリとした住処解決
期待: **exit 0** かつ `skipped=false`。**`skipped=true` で `ok=true` を返した瞬間に不合格。**

---

### R-12 — 段階移行の AC

**AC-52**(第1段の不変性) — 門: `node tests/paradise.test.js`
入力: 第1段(器と台帳を建てただけ、既定は据え置き)完了時
期待: **455 passed, 0 failed** が変わらない。
`node graph/deploy.js plan` の `target` が `C:\Users\kikus\.claude` のまま。
**神の日常が 1 バイトも変わっていないことを、門の総数と配備先で証す。**

**AC-53**(第2段の両居) — 門: `node graph/abode.js resolve --json`
入力: `PARADISE_ABODE=repo` と `PARADISE_ABODE=global` の両方
期待: どちらも exit 0。前者は全住所が `<repo>` 配下、後者は現行と完全一致。
**両方で `node tests/paradise.test.js` が緑**であること(片方でも赤なら未完 — 第20条)。

**AC-54**(第3段の反転) — 門: `node graph/abode.js resolve --json`
入力: env 無し
期待: 全住所が `<repo>` 配下。`PARADISE_ABODE=global` を明示したときだけ外を向く。

**AC-55**(第5段・逃げ道の封鎖) — 門: `node graph/abode.js check`
入力: `PARADISE_ABODE=global` を立てて、台帳に無い宛先へ書こうとする
期待: **exit 1**。`global` は「台帳の輸出を実行する」ためのモードであって、
「許可制を外す」モードではない。

---

## 4. 許可制の契約

### 4.1 台帳は何を記録するか

台帳は `graph/abode.json` の `exports` 配列。
(先例: `graph/domains.js` + `graph/domains.json` — engine の隣にデータが住む形)

各エントリの必須項目:

| 項目 | 意味 | 空・不正なら |
|---|---|---|
| `id` | `EX-<n>` | exit 1 |
| `target` | 輸出先の住所。JSON キーなら `<path>#/<pointer>` | 空 = exit 1 |
| `kind` | `settings-key` / `deploy-tree` / `file` / `external-asset` | 未知の値 = exit 1 |
| `writer` | この輸出を書いてよい**唯一の**モジュールの道 | 実在しないファイル = exit 1 |
| `reason` | **なぜグローバルでなければならないか**。楽園内で足りない理由 | 空 = exit 1 |
| `scope` | `machine` / `sibling-worktree` / `user` — 守備範囲 | 未知 = exit 1 |
| `ordainedBy` | `god` | `god` 以外 = exit 1 |
| `ordainedOn` | **神が名指した日** (`YYYY-MM-DD`) | 日付として読めない = exit 1 |
| `ordainedVia` | どの会話・どの改革で名指されたかの出所 | 空 = exit 1 |
| `verify` | この輸出が生きているか確かめるコマンド | 空 = exit 1 |

### 4.2 台帳の初期エントリ

```json
{
  "exports": [
    {
      "id": "EX-1",
      "target": "~/.claude/settings.json#/permissions",
      "kind": "settings-key",
      "writer": "graph/apply-guards.js",
      "scope": "machine",
      "reason": "deny 9 件 (force-push 3 種 / git reset --hard / commit --no-verify / Edit(~/.claude/**) / Edit(**/.env) / Read(**/.env) / Read(**/.env.*)) は神の全プロジェクトを守る。出所は楽園だが守備範囲はマシン全体である。楽園内へ引けば、神が他所のリポジトリで作業した瞬間に force-push が通る。",
      "ordainedBy": "god",
      "ordainedOn": "2026-09-10",
      "ordainedVia": "reform/sovereign-abode — 教主の反論1を神が受諾",
      "verify": "node graph/apply-guards.js verify  →  deny 9 / ask 1 / allow 5"
    },
    {
      "id": "EX-2",
      "target": "<creations-root>/.claude/{agents,commands,rules,CLAUDE.md}",
      "kind": "deploy-tree",
      "writer": "graph/deploy.js",
      "scope": "sibling-worktree",
      "reason": "創造物は兄弟倉に住む (第30条)。そこで起動した環から神官 30 体が見えなければ、環は神官を失ったまま緑を出す。--add-dir は CLAUDE.md も rules も hooks も読まない (実測) ため代替にならない。",
      "ordainedBy": "god",
      "ordainedOn": "2026-09-10",
      "ordainedVia": "reform/sovereign-abode — 教主の反論2を神が受諾",
      "verify": "node graph/abode.js check --creations  →  agents 30 / commands 19 / rules 8"
    }
  ],
  "external": [
    {
      "id": "EXT-1",
      "target": "~/AppData/Local/hermes/cron/jobs.json",
      "kind": "external-asset",
      "scope": "machine",
      "reason": "cron は本質的にマシン単位の資産であり、神が意図的に登録した。第46条により発火器は道を指すのであって写経しない。楽園は読むだけで書かない。",
      "ordainedBy": "god",
      "ordainedOn": "2026-09-10",
      "verify": "tests/paradise.test.js:6286 (第46条の門)"
    },
    {
      "id": "EXT-2",
      "target": "~/AppData/Local/hermes/scripts/paradise-catchup.py",
      "kind": "external-asset",
      "scope": "machine",
      "reason": "第43条の見逃し窓の監視。hermes の cron が呼ぶため hermes 側に住む必然がある。",
      "ordainedBy": "god",
      "ordainedOn": "2026-09-10",
      "verify": "tests/paradise.test.js:6167 (第43条の門)"
    }
  ]
}
```

`model` / `effortLevel` は**初期エントリに含めない**(§7 の未解決の問い 2 参照)。
既定は撤収であり、神が名指したときだけ EX-3 として台帳に載る。

### 4.3 誰が書けるか

**台帳を書けるのは神だけである。**

- `graph/abode.json` は **git 追跡ファイル**であり、変更は必ず PR を通り、
  マージは神の御手のみ(CODEOWNERS + ブランチ保護)。
- **engine には台帳へ追記する CLI を作らない。** `abode.js` は台帳を**読むだけ**である。
  `abode.js add-export …` のような口を作った瞬間、それは自己申告になる(第54条(d):
  裁かれる側が裁きの範囲を決めてはならない)。
- 台帳を書き換える PR は、`ordainedVia` に神の言葉の出所を持たねばならない。

**AC-56**(逆) — 門: `node graph/abode.js check`
入力: `abode.js` に台帳追記の関数を追加する
期待: **exit 1**。`台帳へ書く口を engine が持ってはならない (第54条(d))` と鳴る。

### 4.4 門は何を拒むか — 自己申告を信じない三段構え

第54条の先例は重い: **空の `.paradise-source` を 1 個置くだけで、
`no-wall-clock-iso` / `no-external-deps` / `domain-markers-present` の三法すべてが素通りした。**
掟を機構化したこと自体が、1 ファイルで無効化された。同じ形を台帳で作ってはならない。

| 段 | 拒む物 | 根拠 | AC |
|---|---|---|---|
| **第一段: 住所** | `os.homedir()` / `~` 展開 / `CLAUDE_CONFIG_DIR` が `abode.js` 以外に現れる | 第54条(a): 資格は名乗りではなく**住所**が決める。グローバル宛の住所を作れる場所を 1 箇所に絞れば、「台帳を通さずに書く」経路そのものが存在しなくなる | AC-2, AC-3, AC-4 |
| **第二段: 台帳の実質** | `target`/`reason`/`ordainedOn` が空・プレースホルダ・日付として読めない | 第54条(b): 裏付けの無い申告は退け、名指しで鳴らす。**エントリが在ることは資格ではない** | AC-25 |
| **第三段: 呼び手の実測** | 台帳の `writer` と、実測された呼び出し元が食い違う | 第54条(a) 再: 呼び手が「私は apply-guards です」と名乗るフラグは受け付けない。stack / module path で**測る** | AC-26 |

さらに **第54条(c)**: 輸出を 1 件通すたびに標準出力へ
`[輸出 EX-1] ~/.claude/settings.json#/permissions ← graph/apply-guards.js` を印字する。
**黙って通した輸出は 0 件**であること(AC-22)。

---

## 5. 退路 — 撤収の順序と、いつでも戻れること

撤収は不可逆であってはならない。

1. **撤収前に凍結する。** `retreat --plan` が (a) 神 5 キーの正準 sha256、
   (b) 不可侵名簿の (ファイル数, バイト, 最新 mtime)、(c) 撤収対象 58 ファイルの sha256 一覧を
   `reform/sovereign-abode/retreat-baseline.json` に書き、git 追跡する。
2. **撤収は 4 段に割る。** ①配備物 58 → ②`model`/`effortLevel`(神の裁可後) →
   ③`hooks` 6 件 → ④残骸(SHOULD)。各段の後に `retreat --verify` が緑であること。
3. **戻す道が常に在る。** `node graph/deploy.js --write --abode global` を走らせれば、
   58 ファイルは 1 命令で再生成できる(第19条: 配備物は成果物であって原本ではない)。
   settings のキーは baseline から復元できる。
4. **`~/.claude` への書き込みが原理的に 0 にならないことを正直に書く。** 調査の実測どおり、
   `--no-session-persistence` を付けても `backups/` と `projects/.../subagents/` は増える。
   本改革が達成するのは「**楽園の配備物と記憶を `~/.claude` に置かない**」までである。
   これを門の文言に書き、「グローバル書き込みゼロ」を名乗らない。

---

## 6. 段階移行 — 神の日常を壊さない順序

**一撃で切り替えない。** env で両居させ、門が両方で緑になってから既定を反転する。
理由は単純で、この改革は**神が毎日使っている道具の住所を変える**からである。

| 段 | 何をするか | 既定の向き | 神の日常への影響 | 門 |
|---|---|---|---|---|
| **第0段** | `graph/abode.js` と `graph/abode.json`(台帳・初期 2 エントリ)を建てる。engine はまだ誰も呼ばない | グローバル | **ゼロ** | AC-1, AC-22, AC-25, AC-52 |
| **第1段** | 全 engine の住所解決を `abode.js` 経由に付け替える。**既定値は現行のグローバルのまま** | グローバル | **ゼロ**(住所は同じ値を返す) | AC-3, AC-17, AC-20, AC-52 |
| **第2段** | `PARADISE_ABODE=repo` で内向きを選べるようにする(両居)。`<repo>/.claude/` を deploy し、git 追跡の派生物にする | グローバル | ゼロ(明示しなければ現行) | AC-5〜8, AC-13〜15, AC-53 |
| **第3段** | 回帰の見張りを先に建て替える。4 門を向け直し、EX-1 を見る門を新設し、静かな 6 門を `skip()` にする | グローバル | ゼロ | AC-39〜45 |
| **第4段** | **既定を反転**。env 無し = リポジトリ内。KG と日次台帳を移設(消さず移す) | **リポジトリ内** | 小(楽園を使うときだけ挙動が変わる) | AC-9〜12, AC-54 |
| **第5段** | 兄弟倉へ配備 (EX-2)。創造物の倉に神官を入れる | — | 改善(今は神官 0 体) | AC-46〜51 |
| **第6段** | **撤収**。58 ファイル → `model`/`effortLevel`(裁可後) → `hooks` 6 件 | — | 中(§7 の問い 2,3 の裁定に依る) | AC-30〜38 |
| **第7段** | `PARADISE_ABODE=global` を「台帳の輸出を実行するモード」に限定する | — | ゼロ | AC-55 |

**順序の要点は三つ。**

1. **第3段(見張りの建て替え)は第4段(既定の反転)より前に置く。**
   逆にすれば、反転した瞬間に 4 門が skip へ落ち、その状態で誰も気づかないまま
   第5段以降が進む。**壊れた目で撤収を見届けることになる。**
2. **第6段(撤収)は最後である。** 撤収は不可逆に最も近い。
   リポジトリ内住処が完全に動き、門が全て建て替わってから初めて外の物に手をつける。
3. **`hooks` の撤収は 58 ファイルの後である。** hooks を先に抜くと、
   撤収作業中のセッションで KG 注入が止まり、作業者自身が文脈を失う。

---

## 7. 未解決の問い — 教主の判断を仰ぐ

> **注**: 「楽園の agents 30 体を他所のリポジトリで呼べなくなる件」は
> **神が既に裁定した**(全部引き上げる。神は楽園リポジトリを通して他所を操作するため)。
> よって未解決には残さない。確定要件 R-2 / R-11 に落とした。
> ただし反論2 が指摘した残余リスク(創造物の倉での可視性)は R-11 で機構化した。

```
┌─ 問い 1 ─ env.PATH の復元 ────────────────────────────────────────────┐
│ 神が書いた "env": { "PATH": "$PATH:/c/Program Files/GitHub CLI" } を    │
│ apply-guards.js の repairEnv() が「展開されない致命的欠陥」として        │
│ キーごと削除した(第34条: この 1 行が 15 本のフックを全滅させていた)。   │
│ 神託「グローバルには私が直接依頼した物だけ」は、この削除自体が違反       │
│ だったことを含意する。撤収設計はこの一件の是非を先に裁く必要がある。     │
│                                                                        │
│ 選択肢 (a) 戻さない — 第34条の実測どおり $PATH は展開されず害だった      │
│        (b) 展開済みの絶対パスで戻す — 神の意図(gh を PATH に)を活かす  │
│        (c) 神が名指すまで保留し、台帳に「削除済み・未裁定」として記録    │
│ 教主の見立て: (b)。神の意図は「gh を使えるようにする」であって           │
│ 「$PATH という文字列を置く」ではない。ただし engine の判断で書き戻すのは │
│ 削除と同じ罪なので、神の名指しが要る。                                  │
└────────────────────────────────────────────────────────────────────┘

┌─ 問い 2 ─ model / effortLevel をグローバルに残すか ────────────────────┐
│ apply-seat.js が clergy.RANKS.pontiff から model="fable" /              │
│ effortLevel="xhigh" を ~/.claude/settings.json に書いている(実測)。   │
│ permissions と違い、これは「守り」ではなく「位階の宣言」である。         │
│ 楽園の外に教主は居ない → 教主の見立ては撤収。                           │
│ だが撤収すれば、神の全プロジェクトの既定モデルが Claude Code の素の      │
│ 既定へ戻る。これは神の日常の変化である。                                │
│                                                                        │
│ 選択肢 (a) 撤収する(教主の既定)                                       │
│        (b) 台帳 EX-3 として残す — 「神は全プロジェクトでこのモデルを     │
│            使いたい」なら、それは正規の輸出である                        │
│ 判断材料: 撤収後に神が体感する差(既定モデルの変化)を許容できるか。     │
└────────────────────────────────────────────────────────────────────┘

┌─ 問い 3 ─ vendor 由来の汎用フック 5 本を残すか ────────────────────────┐
│ 撤収対象の hooks 6 本のうち、楽園固有は 1 本                            │
│ (tools/hooks/paradise-session-start.js — KG 注入)だけ。残り 5 本は     │
│ vendor 由来の汎用フック(pre-compact / suggest-compact / session-start / │
│ session-end / evaluate-session)で、神の全プロジェクトで動いている。     │
│ 教主の既定は全 6 本撤収(第20条(a)の鏡像違反 / 逆向き依存の危険)。      │
│                                                                        │
│ 選択肢 (a) 全 6 本撤収(教主の既定)                                    │
│        (b) 汎用 5 本を台帳 EX-4..8 として残す — ただし原本は楽園にしか   │
│            無いので、リポジトリを動かせば依然として壊れる               │
│        (c) 汎用 5 本をマシン単位の場所へ複製して残す — 第29条の写経      │
│            問題を招く(写しは腐る)                                    │
│ 撤収計画は必ず 6 本の一覧を印字し、神の名指しを求めること(R-8)。      │
└────────────────────────────────────────────────────────────────────┘

┌─ 問い 4 ─ permissions.allow と workspace trust ───────────────────────┐
│ 実測(discovery-scoping §1): <repo>/.claude/settings.json の            │
│ permissions.allow は workspace trust を受けるまで**無視される**。       │
│   Ignoring 1 permissions.allow entry from .claude/settings.json:        │
│   this workspace has not been trusted.                                  │
│ 信頼の記録先は ~/.claude.json(Global only)であり、                    │
│ hasTrustDialogAccepted を書くことは**グローバルへの書き込み**である。   │
│ 楽園の allow 5 件 (node graph/* / node tests/* / git status|diff|log)   │
│ はこの壁の向こうにある。                                                │
│                                                                        │
│ 選択肢 (a) ~/.claude.json への 1 回の書き込みを台帳 EX-9 として認める    │
│        (b) allow を捨て、deny + hooks だけで機械強制を組み直す          │
│            → 毎回の許可プロンプトが増える                              │
│        (c) 対話で 1 回信頼する(機構ではなく手作業。第10条に触れる)    │
│ deny と ask は信頼なしで効く(実測)ので、護りは (b) でも失われない。   │
└────────────────────────────────────────────────────────────────────┘

┌─ 問い 5 ─ paradise-kg/ を git 追跡するか ─────────────────────────────┐
│ 移設先がリポジトリ内になる以上、追跡の可否を決めねばならない。          │
│ 実測: nodes 120 / edges 33 / cochange 5、教訓 85 件を含む。             │
│ .gitignore には既に「PARADISE_KG がリポジトリを指すなら                 │
│ graph/kg-store/ をローカルに保つ」という予備の行が在る。                │
│                                                                        │
│ 選択肢 (a) 追跡する — 教訓が PR で見え、CI でも記憶が生きる。           │
│            ただし jsonl が肥大し、並行 PR で必ず衝突する               │
│        (b) 追跡しない — 衝突ゼロ。ただし CI に記憶が無い(第29条の      │
│            lessons.json と同じ形。既に前例がある)                      │
│        (c) 追跡するが append-only で、衝突は機構が解く                 │
│ 機密の観点も要る: KG に神の言葉やパスが入るなら公開リポジトリでは危険。  │
└────────────────────────────────────────────────────────────────────┘

┌─ 問い 6 ─ 残骸 6 件の削除裁可 (SHOULD 障害物6) ───────────────────────┐
│ agents.bak.1788121597/ (15) / agents.bak.spawn.1788168490/ (16) /       │
│ settings.json.pre-vendor.bak / .pre-paradise-hook.bak / .pre-env-repair.bak │
│ engine に生成コードが 0 hit = 誰も再生成しない。                        │
│ ただし settings.json.pre-wire.bak と settings.json.bak.1787846094 は     │
│ **神の原初設定の唯一の証拠**なので保存する(不可侵名簿に載せた)。      │
│ 削除は神の裁可を要する。今回の改革の成否は左右しない。                  │
└────────────────────────────────────────────────────────────────────┘
```

---

## 8. 本要件が満たさないもの(正直に)

- **「`~/.claude` への書き込みが 0 になる」は達成しない。** Claude Code 自身が
  `backups/` と `projects/.../subagents/` を書く(実測)。達成するのは
  「楽園の配備物・設定・記憶を `~/.claude` に置かない」までである。
- **方式C (`CLAUDE_CONFIG_DIR`) は採らない。** 実測で `Not logged in` が出る。
- **方式A (`--setting-sources project`) も既定としては採らない。** 神の deny 9 件が消える。
- **`~/.claude/agents/` の役者混入は、撤収完了までゼロにならない。**
  Claude Code は project と user の両方を読み、project は**優先されるだけで排除しない**(実測)。
- **`~/.claude/skills/` 13 件には一切触れない**(障害物17 = OUT)。
- **hermes の cron / catchup には一切触れない**(障害物18 = OUT)。台帳に外部資産として記録するのみ。

---

## 9. 本書起草時に実際に走らせたコマンド(全数)

```bash
# 位置と状態
git branch --show-current                      # → reform/sovereign-abode
git status --short                             # → ?? reform/sovereign-abode/ のみ

# 憲法の引用元
node graph/codex.js index                      # → 全 57 条
node graph/codex.js article 10|16|19|20|23|29|30|33|34|37|42|46|54|56

# 現行の門(改革前ベースライン)
node graph/apply-guards.js verify              # → deny 9 / ask 1 / allow 5, matcher 13 生存
node graph/deploy.js plan                      # → target C:\Users\kikus\.claude, 58 件
node graph/deploy.js check                     # → checked 60, drift 0
node graph/check-agents.js                     # → 階層は宣言でなく実在
node graph/workspace.js check                  # → 創造物の混入なし
node graph/wiring.js                           # → engine の結線一覧
node graph/critic.js checklist                 # → 14 checks
node tests/guards.test.js                      # → 64 passed, 0 failed
PARADISE_SETTINGS=/nonexistent/settings.json node tests/guards.test.js
                                               # → 60 passed, 0 failed, 4 skipped
node tests/paradise.test.js --gate 'conclave: 配備'
                                               # → 1 of 455 gates matched — 1 green, 0 red

# グローバル依存の再実測
rg -c "os\.homedir\(\)" graph/*.js tools -g '!**/node_modules/**' | sort
                                               # → 14 ファイル / 16 箇所
rg -n "existsSync\([^)]*\)\) return" tests/*.js # → 7 hit(静かな早期 return)
grep -n "function claudeDir" graph/pulse.js     # → :320 os.homedir() 固定
sed -n '29,33p' graph/kg.js                     # → ROOT = PARADISE_KG || ~/.claude/paradise-kg
sed -n '34,38p' graph/daily-guard.js            # → LEDGER = PARADISE_DAILY_LEDGER || ~/...

# 逃げ道の不在(sentinel HOME・読み取りのみ・何も書かない)
USERPROFILE=<sentinel> HOME=<sentinel> CLAUDE_HOME=/nonexistent \
  PARADISE_AGENTS=/nonexistent PARADISE_KG=/nonexistent \
  PARADISE_SETTINGS=/nonexistent/settings.json node <probe>
                                               # → check-agents.skipped=true ok=true(病)
                                               # → sentinel 配下の生成物 0 ファイル

# 神の資産の実測(読み取りのみ)
node <probe>   # settings.json の 9 キー / 神 5 キー / permissions.deny=9
               # → god-subset-sha256: cbca9224ec5e6cac
               #    【第6段での追記】この数は再現不能であった。実測は b66c5008319d71c6。
               #    AC-35 の註を見よ。凍結は retreat-baseline.json が持つ(第22条)。
               # → hook refs into paradise repo: 6
node <probe>   # ~/AppData/Local/hermes/cron/jobs.json → jobs: 2
ls -la ~/AppData/Local/hermes/scripts/paradise-catchup.py
ls -d ../paradise-creations ; ls -a ../paradise-creations/.claude
                                               # → 兄弟倉は在るが .claude は無い(神官 0 体)
```

## 10. 本書起草で改変したファイル

**楽園リポジトリ内: 本書 1 本のみ** (`reform/sovereign-abode/requirements.md`)。
engine は一行も変えていない。`~/.claude` には**一切書いていない**
(全ての探査は読み取り専用。`deploy.js --write` も `apply-*` も走らせていない)。
`git commit` も `gh` も使っていない。
一時ファイルは `$LOCALAPPDATA/Temp/pdreq-probe.js` / `pdreq-sentinel.js` /
`pdreq-sentinel-home/`(空)に置いた。
