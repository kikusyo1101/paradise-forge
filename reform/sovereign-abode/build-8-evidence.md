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

---

## §6 門を建てる途中で捕らえた、門自身の病(正直に記す)

**この節は「うまくいった」記録ではない。** 第58条(c)(門は己の測る対象を汚すな)に
**自分の門が引っかかった**記録である。

最初、`mode=repo` の正の門をこう書いた:

```js
const r = runEngine('graph/apply-guards.js', ['apply'], { PARADISE_ABODE: 'repo' });
```

これは現物の `<repo>/.claude/settings.json`(**版管理下**)を的にする。走らせると:

```console
$ node tests/abode.test.js
  ✗ この門を走らせても、楽園の作業木は汚れない(前後の差で裁く)
      この門の走行が作業木を汚した — 復元しても窓は開く (第58条(c)):
  M .claude/settings.json
```

**門が門を捕らえた。** 汚れの正体は改行の正準化であり(engine は `\n` で書き、
作業木は CRLF)、内容の差ではない。**第7段の HEAD(`01fe0b4`)の engine で
同じことをしても同じく汚れる**ことを実測した —— 本段が持ち込んだ病ではない:

```console
$ git checkout 01fe0b4 -- graph/apply-guards.js graph/abode.js
$ PARADISE_ABODE=repo node graph/apply-guards.js apply
  ✎ 掟を機構にした (0 change(s))   ...\paradise\.claude\settings.json
$ git status --short .claude
 M .claude/settings.json          ← 第7段の engine でも汚れる
```

**閾値を下げる誘惑を退けた。** 取りうる道は三つあった:

1. この門から「実際に書けたこと」の主張を外す(= 弱める)。**却下** ——
   「拒まれなかった」は「書けた」ではない。黙って何もしなかった走行と区別がつかない。
2. 汚れを `finally` で `git checkout` して戻す。**却下** ——
   第58条(c) が名指しで禁じた形である(「復元しても窓は開く」)。
3. **的を倉の中の未追跡の道に建てる。** 採用。
   `<repo>/.paradise-guard-probe-<pid>/settings.json` を作り、そこへ書かせ、消す。
   `guardWrite` にとっては紛れもなく「倉の中」(`REPO_ROOT` 配下)であり ——
   **複製を倉の外に置いたのでは、この門は「倉の中」を一度も試していないことになる** ——
   `hermetic.js` は倉の中の未追跡への書き込みを赤にしない(`untracked`)。

結果、門は「倉の中へ**実際に書けた**」(permissions の deny が書かれたことを実測)を
主張しながら、作業木を 1 バイトも汚さない。

もう一つ、**逆側の設計判断を実測が正した**のも記す。`guardWrite` の最初の実装は
「倉の外は台帳の裏付けが無ければ全て拒む」であった。走らせると `tests/guards.test.js` が
**16 門落ちた** —— 全て「`os.tmpdir()` の複製へ書いている」ことを理由に。

```console
  ✗ apply writes the permissions block that was entirely absent
      倉の外への書き込みを拒んだ: ...\Temp\paradise-guards-L2dQOp\apply1.json ← graph/apply-guards.js
Paradise guards self-test: 59 passed, 16 failed
```

**これは門が正しく鳴ったのではなく、守る対象の定義が粗かった。** 拒むべきは
「**楽園の住処**でありながら台帳の裏付けが無い書き込み」であって、
「呼び手が明示的に名指した、楽園と無関係な道」ではない —— 後者を拒めば
第58条(c) の密閉そのものが不可能になる。`abodeRoots()` を建てて守る対象を
機構で定めた結果、16 門は全て緑に戻り、**欠陥A/B は変わらず拒まれ続けている**
(§3 の実出力)。閾値も `|| true` も足していない。

```console
$ node tests/guards.test.js
Paradise guards self-test: 75 passed, 0 failed
EXIT=0
```

---

## §7 完了条件の実測

### 1. `tests/paradise.test.js` — 素 / repo / global の 3 走行とも緑(第20条)

```console
$ node tests/paradise.test.js
Paradise self-test: 471 passed, 0 failed
BARE_EXIT=0

$ PARADISE_ABODE=repo node tests/paradise.test.js
Paradise self-test: 471 passed, 0 failed
REPO_EXIT=0

$ PARADISE_ABODE=global node tests/paradise.test.js
Paradise self-test: 471 passed, 0 failed
GLOBAL_EXIT=0
```

**3 走行とも 471 / 0。** 門を建てた後(§6 の修正を入れた最終形)の再走行も
`Paradise self-test: 471 passed, 0 failed / FINAL_EXIT=0` である。

### 2. `tests/abode.test.js` — 門の総数

```console
$ node tests/abode.test.js
Abode self-test: 135 passed, 0 failed
EXIT=0
```

**第6段時点 83 → 135。52 門の増。**

```console
$ node tests/guards.test.js
Paradise guards self-test: 75 passed, 0 failed
EXIT=0
```

### 3〜4. `abode.js` の旗

```console
$ node graph/abode.js check              → EXIT=0
$ node graph/abode.js check --outward    → EXIT=0
$ node graph/abode.js check --backrefs   → EXIT=0     (第6段の撤収は壊れていない)
$ node graph/abode.js check --creations  → EXIT=0
$ node graph/abode.js check --ledger     → EXIT=0
$ node graph/abode.js check --nonsense   → EXIT=2     (未知の旗は 2 のまま)
```

### 5. 兄弟の門

```console
$ node graph/census.js check
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
CENSUS_CHECK_EXIT=0

$ node graph/codex.js check       → EXIT=0   (索引は本文と一致 / 59 条)
$ node graph/workspace.js check   → EXIT=0   (創造物の混入なし・住所の直書きなし)
$ node graph/hermetic.js check    → EXIT=0   (版管理下の現物を走行中に書き換える門は無い)
$ node graph/derived.js check     → EXIT=0
$ node graph/conclave.js audit    → EXIT=0   (見捨てられた走行: 0 / 判定不能: 0 / 全 11)
```

**README は手で書いていない。** `census.js check` が緑である ——
本段は `tests/paradise.test.js` の門数を変えていない(増えたのは
`tests/abode.test.js` の 52 門であり、README が主張する数はこの走行の数ではない)ので
`census.js fix` による書き換えは発生しなかった。**数は測定が生む**(第22条)。

---

## §8 神の実機 `~/.claude` を1バイトも汚していないことの証明

§0 で採った指紋と、全作業を終えた後の指紋を**同じ手で**採って照合する。

| 測るもの | 着手前 (§0) | 作業後 | 一致 |
|---|---|---|---|
| `sha256sum ~/.claude/settings.json` | `e6fb4b2011d14c5b05c3537e5f7aacf8298262367ea0ba0234a09dd6c46f7ccc` | `e6fb4b2011d14c5b05c3537e5f7aacf8298262367ea0ba0234a09dd6c46f7ccc` | ✓ |
| `find ~/.claude -type f \| wc -l` | 556 | 556 | ✓ |
| `node graph/abode.js check --backrefs` | 逆向き依存 0 件 / exit 0 | 逆向き依存 0 件 / exit 0 | ✓ |

```console
$ sha256sum ~/.claude/settings.json
e6fb4b2011d14c5b05c3537e5f7aacf8298262367ea0ba0234a09dd6c46f7ccc  /c/Users/kikus/.claude/settings.json
$ find ~/.claude -type f | wc -l
556
$ node graph/abode.js check --backrefs
  ✓ 逆向き依存は 0 件 — 実機の hooks は楽園の木を指していない (AC-30)
EXIT=0
```

**engine を `--write` で走らせたのは、全て偽のホーム(`USERPROFILE`/`HOME` を
差し替えた `$LOCALAPPDATA/Temp` の中)に対してである。**
神の実機を的にした走行は、この作業中に一度も無い。

---

## §9 できなかったこと・見ていないこと(正直に)

- **CI(GitHub Actions)では一度も走らせていない。** push も PR も掟で禁じられており、
  本書の数は全て**この機の単独走行**である。CI 固有の環境(実機の `~/.claude` が無い
  Ubuntu)での `check --outward` の振る舞いは**論証しただけで実測していない** ——
  ただしこの門は実機を一切見ず倉のソースだけを読むので、機によって答えが変わる
  経路は無い(`backRefs` のように実機を見る門とは性質が違う)。
- **`--outward` は `graph/` と `tools/` しか走査しない**(`scanTargets()` の範囲)。
  `hooks/` や `dashboard/` に abode を引く engine が生まれれば、この門は見ない。
  現時点でそこに `require('./abode.js')` は無いことを実測したが、**将来の穴である**。
- **`exportRoots()` のブレース展開は入れ子を解かない。** 台帳に入れ子は無く、
  解けない記法には空を返す(= 拒む側に倒れる)ので安全側だが、**完全ではない**。
- `guardWrite` の `caller-named`(§2.1 の (4))は**通す**判断である。
  これは第58条(c) の密閉と両立させるための設計判断であり、
  「倉の外の道が engine の手に在るなら出所は abode か呼び手かの二つだけ」という
  第58条(a) の保証に**寄りかかっている**。その保証が崩れれば、この判断も崩れる。
- `apply-hooks.js`(EX-3)と `deploy.js` の `writeCreations`(EX-2)には
  **二重に関門を掛けていない**(既に `globalWrite` を通っている)。
  ただし `globalWrite` は内側で `guardWrite` を通すよう配線したので、
  結果として両者も新しい関門を通っている。
