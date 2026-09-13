# 改革『主権的住処』 第8段の証拠 — **輸出の関門を全ての engine へ掛ける** (AC-55 / 第58条(f))

枝: `reform/sovereign-abode-8` / 着手時 HEAD: `01fe0b4`
神官: construction相 / 発令: 教主 (2026-09-13)

第7段で撤収は完遂した(逆向き依存 6件→0件)。だが **`PARADISE_ABODE=global` は
まだ「台帳を迂回して何でも外へ書けるモード」のまま**であった。本段はそれを機構で塞ぐ。

要件は `requirements.md` の **AC-55**、設計は `design.md` §4.1/§4.2、条は **第58条(b)**。

---

## §0 着手前のベースライン(自分の手で実測)

**神の実機 `~/.claude` を1バイトも汚さないことを証明するため、先に指紋を採る。**

```console
$ git branch --show-current
reform/sovereign-abode-8

$ node graph/abode.js check --backrefs
═══ 🏠 ABODE CHECK (第58条) ═══
  · 除外 1 件: graph/abode.js (住所を作るのが職務 / 資格の裏付け: function resolve+function pathFor+function globalWrite+module.exports を輸出している / homedir 呼び出し 1 箇所)
  · creations abode: C:\Users\kikus\Documents\workspace\paradise-creations\.claude
    agents 30 / commands 19 / rules 8 / CLAUDE.md あり / git 追跡 false
  ✓ 逆向き依存は 0 件 — 実機の hooks は楽園の木を指していない (AC-30)
    実機: C:\Users\kikus\.claude\settings.json
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
  ✓ 門は黙って緑に落ちず、兄弟の engine は同じ口から住所を得ている
═══════════════════════════════
EXIT=0

$ sha256sum ~/.claude/settings.json
e6fb4b2011d14c5b05c3537e5f7aacf8298262367ea0ba0234a09dd6c46f7ccc  /c/Users/kikus/.claude/settings.json

$ find ~/.claude -type f | wc -l
556
```

**この 3 つ(backrefs 0件 / sha256 / ファイル数 556)を、作業後に同じ手で採り直して照合する(§8)。**

---

## §1 欠陥の再現 — 教主の実測を自分の手で撃ち直す

### 欠陥A — deploy が global で台帳を迂回して丸ごと外へ出せる

```console
$ PARADISE_ABODE=global node graph/deploy.js plan
═══════ 🏛  DEPLOYMENT PLAN ═══════
upstream: C:\Users\kikus\Documents\workspace\everything-claude-code
target  : C:\Users\kikus\.claude
files   : {"plain":23,"own":26,"replace":9}
transform after copy: agents
  ✓ every source exists
  (dry run — pass --write to deploy)
═══════════════════════════════════
EXIT=0
```

計画だけでは「1バイト書けるか」の証明にならない。**偽のホームを立てて実際に `--write` を撃った**
(神の実機は決して撃たない):

```console
$ FAKE2=C:/Users/kikus/AppData/Local/Temp/pd-defectA-1655
$ USERPROFILE=$FAKE2 HOME=$FAKE2 PARADISE_ABODE=global node graph/deploy.js --write
{
  "ok": false,
  "deployed": 58,
  "error": "pontiff seat: settings.json not found or unreadable: ...\\pd-defectA-1655\\.claude\\settings.json"
}
EXIT=0

$ find $FAKE2/.claude -type f | wc -l
58
$ find $FAKE2/.claude -maxdepth 1
.../.claude
.../.claude/agents
.../.claude/CLAUDE.md
.../.claude/commands
.../.claude/rules
```

**58 ファイルが台帳に無い宛先へ書かれた。** 台帳 `graph/abode.json` にこの宛先は無い
(EX-1 は settings の permissions キー1本、EX-2 は兄弟倉、EX-3 は `~/.claude/scripts/{hooks,lib}` のみ)。
第6段で撤収した物が、そのまま戻せる状態であった。
**しかも exit は 0 である** —— `write()` が `ok:false` を返しても CLI は 0 を返していた(付随する欠陥)。

### 欠陥B — EX-1 の writer 自身が関門を通っていない(本丸)

```console
$ FAKE=C:/Users/kikus/AppData/Local/Temp/pd-defect-858   (中に .claude/settings.json = {} を置く)
$ USERPROFILE=$FAKE HOME=$FAKE PARADISE_ABODE=global node graph/apply-guards.js apply
  ✎ 掟を機構にした (1 change(s))   ...\pd-defect-858\.claude\settings.json
     · permissions: no `permissions` key at all — every machine-enforceable law was unenforced
EXIT=0

$ (書かれた結果を数える)
deny 9 ask 1 allow 5
```

**`[輸出 EX-1]` の名乗りが一度も印字されない。** すなわち `apply-guards.js` は
`abode.globalWrite` を通らず直接 `fs.writeFileSync` していた(`graph/apply-guards.js:889`)。
第54条(c)「黙って通した輸出は0件」が破れており、**AC-23 は今日まで門として嘘だった** ——
台帳から EX-1 を消しても、この経路は何も検めずに書けたからである。

### 関門を実際に通っていた経路の実測

`graph/*.js` のうち `./abode.js` を require し、かつ書く口を持つファイルを走査
(註釈と文字列を落とした上で。`codeOnly()` と同じ流儀):

```
** apply-guards.js  write@ 889
OK apply-hooks.js   write@ 145,146,248,254,327,332
** apply-models.js  write@ 115
** apply-seat.js    write@ 78
** apply-spawn.js   write@ 120
** daily-guard.js   write@ 77,78,170,178,205
OK deploy.js        write@ 307,308,314,315,466,469,470
** export-state.js  write@ 92,94,99
** kg.js            write@ 37,38,46,72,89,93
** ordain.js        write@ 286,288,301,352,360,376,410,411
** vendor.js        write@ 130,132,155
```

`OK` = `globalWrite(` を含む / `**` = 一度も含まない。
**11 本中 2 本しか関門を通っていなかった**(`deploy.js` の `writeCreations` = EX-2 と
`apply-hooks.js` = EX-3 のみ)。残る 9 本は住処を `abode` から引きながら、
そこへ書く瞬間には誰にも検められていなかった。

---

## §2 建てた機構

### 2.1 `graph/abode.js` — `guardWrite(realPath, opts)`

`globalWrite()` は「台帳の target を**名指して**書く者」を包む口である。だが
**実測された欠陥はそこに無かった** —— 欠陥は「台帳を名指さずに、ただ
`abode.pathFor('settings')` が答えた道へ `fs.writeFileSync` する engine」であった。
名指さない者は関門を知らず、関門も彼を知らない。

ゆえに新しい口は**問いを裏返す**:「今から書くこの実パスは、台帳が許した宛先か」。

| 場合 | 振る舞い |
|---|---|
| (1) `REPO_ROOT` 配下 | **黙って通す** (`scope: 'repo'`)。自分の倉の中は輸出ではない |
| (2) 台帳の輸出の範囲 かつ 呼び手 = `writer` | 通す (`scope: 'export'`)。エントリの実質も検める |
| (3) 楽園の住処(`abodeRoots()`)だが裏付け無し | **throw。宛先と呼び手を名指す** |
| (4) 楽園の住処でもない倉の外の道 | 記して通す (`scope: 'caller-named'`) |

**(4) はなぜ通すのか**(設計上の判断。教主の裁可した大枠に対する細部の選択として、
理由をここに残す):倉の外の道が engine の手に在るなら出所は二つしかない ——
**abode が答えた**(→ (2)(3) が裁く)か、**呼び手が渡した**(CLI 引数 = 神が明示的に
名指した道、あるいは**門が建てた複製**)かである。住所を自分で組み立てる道は
第58条(a) と `check --count` が既に塞いでいる。
後者を拒めば、**第58条(c) が命じる密閉が不可能になる** —— 門は現物を汚さぬために
`os.tmpdir()` の写しへ書くのだから。実測: 拒む実装にしたところ `tests/guards.test.js`
の 16 門が「複製への書き込み」を理由に落ちた。**閾値を下げずに、守る対象を正しく定めた。**

**`abodeRoots()` が守りの地図である。** これが AC-55 の核心を機構にしている:

- **全ての mode の住処を同時に数える。** ゆえに `PARADISE_ABODE` をどちらへ倒しても
  可否は 1 ミリも動かない。「今どちらを向いているか」を問う実装なら、
  **向きを変えるだけで関門を外せる**。
- **個別 env の上書き(`OVERRIDE_ENV`)を剥いでから数える。** `CLAUDE_HOME=<どこか>` を
  立てただけで神の `~/.claude` が地図から外れるなら、それは env 一本で開く抜け道である。

`globalWrite()` も内側で `guardWrite()` を通す。二重検査ではなく、
**同じ問いに答えが二つ在ることを禁じる**ための配線である(第29条)。

### 2.2 `exportRoots(entry, opts)` — 台帳の宛先を実パスへ解く

`exportRealPath()` は `~` 起点の**単一の道**しか解かない(そして EX-2 に `null` を
返すことを既存の門が握っている)。関門は `<creations-root>/...` も `{hooks,lib}` も
解けねばならないので、**列挙する**口を別に建てた。

- `~/…` → `home(env)`(`exportRealPath` と同じ土台)
- `<creations-root>/…` → **`workspace.js` 経由**(第30条: 創造物の住所を知るのは workspace.js だけ)
- `{a,b}` → 各枝へ展開(EX-3 が実際に `scripts/hooks` と `scripts/lib` の二つへ書く形)
- `#/pointer` → **パス部だけを見る**(EX-1 の `settings.json#/permissions` は settings.json を覆う)
- 知らない記法 → **空を返す**(推測で埋めない / 第16条。空 = 拒む側に倒れる)

### 2.3 `selfAudit()` の禁則を `guardWrite` へ広げた

第7段までの禁則は `globalWrite` の本体だけを見ていた。**それでは足りない** ——
`guardWrite` に `if (mode() === 'global') return;` を一行足せば、
**`globalWrite` を一切触らずに**許可制を丸ごと外せる。関門の名が増えたなら、禁則もその名へ広げる。
関門そのものが器から消えた場合も鳴る(掛ける相手が居ない)。

### 2.4 `check --outward` — 構造を構造で見る静的な門

振る舞いの門だけでは足りない。`tests/abode.test.js` は「台帳に無い宛先は 1 バイトも
書けない」を撃っていたが、それは **`globalWrite` を呼んだ者にしか効かない**。
呼ばない者は門の外に居た。

ゆえに:`./abode.js` を require していて、かつ書く口
(`writeFileSync` / `appendFileSync` / `copyFileSync` / `mkdirSync` / `rmSync` / `createWriteStream`)
を持つファイルが `guardWrite(` も `globalWrite(` も一度も含まないなら、**書く行を名指して**赤にする。
走査は `codeOnly()` を通す(註釈と文字列を落とす —— 病を説明した罰を与えない)。
**`--all` に編入した**(第44条: 旗を立てたときしか走らない門は、誰も旗を立てなくなった日に死ぬ)。

### 2.5 関門を掛けた engine(11 本)

`deploy.js` / `apply-guards.js` / `apply-seat.js` / `apply-models.js` / `apply-spawn.js` /
`kg.js` / `daily-guard.js`(台帳と錠の 2 箇所)/ `export-state.js` / `ordain.js` / `vendor.js`(2 箇所)。
`apply-hooks.js` は既に `globalWrite`(EX-3)を通っているので**二重には掛けていない**。

`deploy.js` の `write()` は**全ファイルのコピー前に住処を一度検める**。ループの中に置けば
「1 ファイル目で拒む」ことはできても**0 ファイルで拒む**ことはできない。

付随して捕らえた欠陥:`deploy --write` は `write()` が `ok:false` を返しても
**exit 0** であった。CI にとって失敗と成功の区別がつかない(第37条)。exit 1 に直した。

---

## §3 欠陥が塞がったことの実測(逆の側)

### 欠陥A — 塞がった

```console
$ FAKE3=C:/Users/kikus/AppData/Local/Temp/pd-after-285    (.claude/settings.json = {} を置く)
$ USERPROFILE=$FAKE3 HOME=$FAKE3 PARADISE_ABODE=global node graph/deploy.js --write
ERROR: 倉の外への書き込みを拒んだ: C:\Users\kikus\AppData\Local\Temp\pd-after-285\.claude ← graph/deploy.js この道は楽園の住処である(PARADISE_ABODE=global の住処)が、台帳のどの輸出の範囲にも入らない。 (配備物を住処へ書く) — 倉の外へ出るのは、台帳に載った writer が台帳に載った宛先へ書くときだけである (AC-55 / 第58条(b)(f))。mode はこの可否を変えない: PARADISE_ABODE=global は「台帳の輸出を実行するモード」であって「許可制を外すモード」ではない
EXIT=1

$ find $FAKE3/.claude -type f | wc -l
1          ← 走行前に自分で置いた settings.json のみ。**58 → 0**
```

### 欠陥B — 塞がった(そして正しい輸出は名乗る)

```console
$ USERPROFILE=<偽ホーム> HOME=<偽ホーム> PARADISE_ABODE=global node graph/apply-guards.js apply
[輸出 EX-1] ~/.claude/settings.json#/permissions ← graph/apply-guards.js
  ✎ 掟を機構にした (1 change(s))   ...\pd-defect-858\.claude\settings.json
     · permissions: no `permissions` key at all — every machine-enforceable law was unenforced
EXIT=0
```

**名乗りが出るようになった**(第54条(c): 黙って通した輸出は 0 件)。
台帳が在るので通る —— 関門は「書かせない」機構ではなく「**台帳の言うとおりにだけ書かせる**」機構である。

倉の中(既定)は今までどおり黙って通る:

```console
$ node graph/apply-guards.js apply
  ✎ 掟を機構にした (0 change(s))   C:\Users\kikus\Documents\workspace\paradise\.claude\settings.json
EXIT=0                       ← [輸出 EX-1] を名乗らない。倉の中は輸出ではない
```

### `check --outward` の逆と正

着手時(関門を掛ける前):

```console
$ node graph/abode.js check --outward
✗ 外へ書きうる engine が関門を通っていない (29 行) — AC-55 / 第58条(f)
  graph/apply-guards.js  (1 箇所)
    graph/apply-guards.js:889  fs.writeFileSync(file, after);
  graph/apply-models.js  (1 箇所)
    graph/apply-models.js:115  if (t2 !== before) { fs.writeFileSync(r.file, t2); changed++; ...
  graph/apply-seat.js  (1 箇所)
    graph/apply-seat.js:78  fs.writeFileSync(file, JSON.stringify(s, null, 2) + '\n');
  graph/apply-spawn.js  (1 箇所)
  graph/daily-guard.js  (5 箇所)
  graph/export-state.js  (3 箇所)
  graph/kg.js  (6 箇所)
  graph/ordain.js  (8 箇所)
  graph/vendor.js  (3 箇所)
  → 書く直前に abode.guardWrite(<書く道>) を置け。倉の中は黙って通る。倉の外は台帳の writer と宛先が要る
EXIT=1
```

関門を掛けた後:

```console
$ node graph/abode.js check --outward
═══ 🏠 ABODE CHECK (第58条) ═══
  · 除外 1 件: graph/abode.js (...)
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
  ✓ 門は黙って緑に落ちず、兄弟の engine は同じ口から住所を得ている
═══════════════════════════════
EXIT=0
```

---

## §4 建てた門(tests/abode.test.js)

```console
$ node tests/abode.test.js
倉の外への書き込み (第58条(f) / AC-55):
  ✓ 【正】倉の中への書き込みは黙って通る — 関門が既定の道を重くしない
  ✓ 【逆】神の住処へは、台帳に無い宛先なら拒む — 呼び手と宛先を名指す (AC-55)
  ✓ 【逆】mode を倒しても関門の可否は 1 ミリも動かない (AC-55 の核心)
  ✓ 【正】台帳に載った writer が載った宛先へ書くときは通り、輸出を名乗る (EX-1)
  ✓ 【正】mode=repo で apply-guards apply は <repo>/.claude/settings.json を拒まれない
  ✓ 【正】台帳が在る走行で外へ書くとき apply-guards は [輸出 EX-1] を名乗る (第54条(c))
  ✓ 【逆・欠陥A】PARADISE_ABODE=global の deploy --write は exit 1 で 1 バイトも書かない
  ✓ 【逆・欠陥B / AC-23 の実現】台帳から EX-1 を抜けば apply-guards apply は exit 1
  ✓ 【逆】guardWrite を mode で分岐させる変異を仕込むと selfAudit が鳴る (AC-55)
  ✓ 【逆】関門そのものを器から消すと selfAudit が鳴る — 掛ける相手が居ない
  ✓ 【正】exportRoots は ~ と <creations-root> と {a,b} を解き、知らない記法は解かない
  ✓ 【正】現物の台帳の輸出は 3 件とも実パスへ解ける — 解けない宛先は守れない

外へ書く engine の静的な門 (check --outward):
  ✓ 【正】現物の engine は全て関門を通っている — check --outward が exit 0
  ✓ 【正】--outward は --all に編入されている — 旗を立てねば走らない門は死ぬ (第44条)
  ✓ 【逆】abode を引く engine から関門の呼びを消すと、行とファイルを名指して鳴る
  ✓ 【逆】abode を引かない engine は対象外 — 住所を持たない者に輸出の罪は無い
  ✓ 註釈と文字列の中の writeFileSync は数えない — 病を説明した罰を与えない

Abode self-test: 135 passed, 0 failed
EXIT=0
```

**83 (第6段) → 135。52 門の増である。**

**逆の側の裁き方について**(この改革の作法):

- 欠陥Aの門は「exit 1」だけでは足りない。**走行前後で偽ホームの中身を
  「道 → sha256」の写像に撮り、一致を実測**している。exit だけ見る門は、
  「1 ファイル書いてから落ちた」を緑と呼ぶ。
- 欠陥Bの門(AC-23)は**中身と mtime の両方**を見る。中身だけなら
  「同じ内容を書き直した」を見逃す。
- 変異注入は全て**複製**に対して行う(第58条(c))。EX-1 を抜いた台帳も、
  関門を消した engine も、`os.tmpdir()` の中の偽の倉に建てている。

### 密閉性(第58条(c))

```console
$ node graph/hermetic.js check
  ✓ 版管理下の現物を走行中に書き換える門は無い — 同時に走っても答えは一つである
EXIT=0
```

門自身の門も緑である(`この門は版管理下のファイルへ一行も書かない` /
`この門を走らせても、楽園の作業木は汚れない(前後の差で裁く)`)。

---

## §5 憲法

`CONSTITUTION.md` **第58条に (f) を追記**した(新しい条は立てていない ——
住処の条は第58条である)。趣旨と、実測した欠陥A/Bを数で引用してある
(58 ファイル / deny 9・ask 1・allow 5 が名乗り無しに書かれた / engine 11 本中 2 本しか
関門を通っていなかった)。条の末尾の「これを強制する門」の列挙に
`guardWrite` と `check --outward` を足した。

```console
$ node graph/codex.js index --write
✍️  CONSTITUTION.INDEX.md を建てた (5151 B)
$ node graph/codex.js check
═══════ 📖 CODEX CHECK ═══════
  ✓ 索引は本文と一致している (59 条)
══════════════════════════════
EXIT=0
```
