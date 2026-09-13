# discovery — reform 走行『route-misfire』

道: `reform` / 相: `discover`
対象: `graph/forge.js` の道選び (`chooseScale`) と `graph/workspace.js` の `check`
基準: main `c216014` (現ブランチ `reform/route-misfire` は engine を一行も変えていない)

---

## 0. 何を調べたか(実測の範囲)

| 調べた物 | 手段 | 結果の置き場 |
|---|---|---|
| `chooseScale` の現在の振る舞い | `node -e` で `graph/forge.js` を読み込み 20 件の願いを撃った | §2 |
| 語彙の当たり方 (COUNSEL/CREATE/DOC/REFORM/DIAGRAM) | 同上。各正規表現を願いに直接撃った | §2 の右5列 |
| 道選びを裁いている既存の門 | `grep -rn "chooseScale" tests/` | §3 |
| 欠陥Bの再現 | `$LOCALAPPDATA/Temp` に仮倉を作り `PARADISE_CREATIONS` を向けて `workspace.js check` | §4 |
| 本物の創造物の倉の姿 | `ls -a` / `git config --get remote.origin.url` / `.gitignore` / `.github/` の中身 | §5 |
| 治療案の当否 | 3 世代の試作を `node` で撃ち、37 件の判定表で採点 | §6 |
| 既存の門が緑であること(基準線) | `node tests/counsel.test.js` / `node tests/abandoned-run.test.js` | §7 |

**調べきれなかったこと**は §8 に隠さず並べた(第37条)。

---

## 1. 現在の判定の形 — 何がどの順で立っているか

`graph/forge.js:354` `chooseScale` の判定順(実装の読み取り):

```
1. isCartography(wish)  → 'cartography'
2. isCounsel(wish)      → 'counsel'
3. REFORM_RE.test(wish) → 'reform'
4. quickJa / quickEn    → 'quick'
5. fullJa  / fullEn     → 'full'
6. 既定                 → 'standard'
```

関わる語彙(行番号は main c216014):

| 名 | 行 | 中身の要点 |
|---|---|---|
| `REFORM_RE` | 284 | 楽園/paradise/ハーネス/憲法/engine/門/gate/パイプライン/自己改善/オーケストレーション/枢機卿/神官 |
| `COUNSEL_JA` | 295 | 調査\|監査\|報告\|意見\|比較\|分析\|**診断**\|推奨\|助言\|論評\|検討\|考察\|集計\|整理\|見直\|妥当か\|… |
| `COUNSEL_EN` | 296 | `\b(research\|investigate\|**audit**\|report\|advise\|…)\b` |
| `CREATE_RE` | 303 | 欲しい\|ほしい\|作れ\|作って\|作る\|つくって\|実装\|実現\|開発\|構築 + `\b(build\|create\|make\|implement\|develop)\b` |
| `DOC_RE` | 310 | 報告書\|比較表\|レポート\|一覧表\|資料\|所見\|報告\|調査\|監査\|意見\|助言\|分析\|**診断**\|考察\|論評 + … |
| `isCounsel` | 314 | `COUNSEL_RE` に当たり、かつ (**創造動詞が無い** または **DOC 語彙にも当たる**) なら諮問 |

**この三つが欠陥Aの全ての根である。**

1. `CREATE_RE` は「**物を新しく作る**」動詞しか知らない。「**既に在る物に一段足す**」動詞
   (設ける/足す/加える/追加/新設/導入/できるようにする) を **一語も持っていない**。
   ゆえに改修の願いは「創造動詞なし」と判定され、`isCounsel` の打ち消し(316行)が効かない。
2. `COUNSEL_JA` の「診断」と `DOC_RE` の「診断」が同一語である。ゆえに
   「健康診断アプリが欲しい」は **CREATE にも DOC にも当たり**、316 行の打ち消しが
   `DOC_RE.test(wish)` によって無効化される。
3. 語彙判定は **願い文をそのまま**読む。`--audit` というフラグ名の中の `audit` が
   `COUNSEL_EN` の `\baudit\b` に当たる。フラグ名は**産物の名**であって**依頼の動詞ではない**。
4. `REFORM_RE` は engine の**抽象名**(楽園/エンジン/門)しか知らず、engine の
   **固有名**(gauge / CI / ledger / conclave / census …)を一つも持たない。
   ゆえに「gauge に口を設ける」が楽園の話だと見抜けない。

第19条の再発である ——「形を見る門は意味を見逃す」。
道選びは **語の形**(どんな字が現れたか)を見て、**求められている産物の種類**を見ていない。

---

## 2. 実測 — 現在の `chooseScale` を 20 件撃った

撃った命令:

```
node C:/Users/kikus/AppData/Local/Temp/rm-probe.js
```

(中身: `require('graph/forge.js')` して `chooseScale` と各正規表現を直接呼ぶ捨て試作)

生出力(そのまま):

| 願い | 現在の道 | 教主の裁定 | 判定 | COUNSEL | CREATE | DOC | REFORM | DIAGRAM |
|---|---|---|---|---|---|---|---|---|
| 楽園の自己診断に絞り込みの口を設ける | counsel | reform | **誤着** | ○ | - | ○ | ○ | - |
| 門に監査の一段を足す | counsel | reform | **誤着** | ○ | - | ○ | ○ | - |
| CI に ledger --audit を追加する | counsel | reform | **誤着** | ○ | - | ○ | - | - |
| 健康診断アプリが欲しい | counsel | standard | **誤着** | ○ | ○ | ○ | - | - |
| gauge に fingerprint を確かめる口を設ける | standard | reform | **誤着** | - | - | - | - | - |
| 楽園の位階の相関図を作れ | cartography | cartography | OK | - | ○ | - | ○ | ○ |
| 楽園のエンジンを監査してほしい | counsel | counsel | OK | ○ | ○ | ○ | ○ | - |
| 台帳の毒を直す | quick | quick | OK | - | - | - | - | - |
| ポモドーロタイマーが欲しい | standard | standard | OK | - | ○ | - | - | - |
| 市場の競合を調査して報告書をくれ | counsel | counsel | OK | ○ | - | ○ | - | - |
| 楽園の門を一本足せ | reform | reform | OK | - | - | - | ○ | - |
| オーケストレーションの相関図を作れ | cartography | cartography | OK | - | ○ | - | ○ | ○ |
| 比較表がほしい | counsel | counsel | OK | ○ | ○ | ○ | - | - |
| 憲法に条を足す | reform | reform | OK | - | - | - | ○ | - |
| ECサイトを作れ | standard | full | **誤着** | - | ○ | - | - | - |
| 意図を汲んで実装せよ | standard | standard | OK | - | ○ | - | - | ○ |
| タイポを直して | quick | quick | OK | - | - | - | - | - |
| build a CLI tool | standard | standard | OK | - | ○ | - | - | - |
| audit the engine | counsel | counsel | OK | ○ | - | ○ | ○ | - |
| add a --audit flag to ledger in CI | counsel | reform | **誤着** | ○ | - | ○ | - | - |

```
MISROUTED=7 / 20
```

### 2.1 一件ずつの死因(語彙の当たり方から読み取れる事実)

| 願い | 死因 |
|---|---|
| 楽園の自己診断に絞り込みの口を設ける | 「診断」が COUNSEL_JA と DOC_RE に同時に当たる。「設ける」は CREATE_RE に無いので打ち消しが立たない → counsel が REFORM より先に立ち勝つ |
| 門に監査の一段を足す | 「監査」が COUNSEL/DOC に当たる。「足す」は CREATE_RE に無い → 同上 |
| CI に ledger --audit を追加する | `--audit` の中の `audit` が `COUNSEL_EN` に当たる。「追加」は CREATE_RE に無い。さらに `CI` は REFORM_RE に無いので 3 段目でも救われない |
| 健康診断アプリが欲しい | 「診断」が COUNSEL と DOC の両方に居るので、「欲しい」(CREATE)があっても 316 行の打ち消しが `!DOC_RE.test()` で無効化される |
| gauge に fingerprint を確かめる口を設ける | COUNSEL にも REFORM にも当たらない。engine の固有名 `gauge` を REFORM_RE が知らない → 既定の standard へ落ちる |
| add a --audit flag to ledger in CI | 上の英語版。同じ死因 |
| **ECサイトを作れ**(教主の名指しに無い、**この調査で見つけた追加の一件**) | `fullJa` は「製品\|システム\|アプリ\|プラットフォーム\|全体」しか持たず「サイト」を知らない → standard へ落ちる |

**ECサイトの件は教主の名指しに無い。** 本走行の範囲に含めるかは requirements 相で裁定するが、
「見つけたのに黙る」のは第37条に反するのでここに記す。

### 2.2 「健康診断アプリ」と「アプリ」の別の顔(回帰の罠)

同じ実測で分かったことがもう一つある。`fullJa` は「アプリ」を含む。ゆえに
`地図アプリが欲しい` は現在 **full** へ行く(`tests/paradise.test.js:7199` は
「cartography **でない**」としか断定していないので、full でも門は緑)。
「健康診断アプリが欲しい」を counsel から外すと、それは **standard ではなく full** へ落ちる。
教主の裁定は **standard** である。ゆえに **`fullJa` から「アプリ」を外す**必要がある —— が、
これは別の願いの行き先を動かす。§6.3 に実測を置いた。

---

## 3. 既存の門 — 何本が何を主張しているか

```
$ grep -rn "chooseScale" tests/ | wc -l
25
$ grep -rlc "chooseScale" tests/
tests/counsel.test.js
tests/dashboard-no-hardcode.test.js
tests/paradise.test.js
```

`chooseScale` を**直に呼ぶ**箇所は **25 箇所**、**3 ファイル**に散っている。
断定の中身で数え直すと:

| ファイル | 断定の数 | 何を主張しているか |
|---|---|---|
| `tests/counsel.test.js` | 判定表 11 行(`ROUTES`)+ 個別 7 断定 | 諮問の道の判定表。「楽園のエンジンを監査してほしい→counsel」「ポモドーロタイマーが欲しい→standard」「タイポを直して→quick」「比較表がほしい→counsel」。さらに **語彙を潰した壊れ engine を作って**「語彙が効いている証拠」を撃つ門(292〜298行)を持つ |
| `tests/paradise.test.js` | 12 断定 | 286-288: 英語 3 件 (`fix login bug`→quick / `add a dark mode toggle`→standard / `build a habit tracker app`→**full**)。2226-2232: 第23条の reform 4 件 + 「楽園のエンジンのバグを修正する→reform」+「ポモドーロタイマーが欲しい→standard」。7191-7203: 第49条の作図 4 件 + 紛れ語 2 件 + 既存 3 件 |
| `tests/dashboard-no-hardcode.test.js` | 1 断定 | 74行: 「ダッシュボードを生きた門にせよ」→reform |
| (`tests/paradise.test.js:8509/8566`) | 2 箇所 | `admit()` の裁定が `chooseScale` と一致することの断定。**返り値が文字列であることに依存** |

**重い制約**が二つ出た。

* **(C-1) `chooseScale` の返り値は文字列でなければならない。**
  `forge.js:392` のコメントが明示し、`paradise.test.js:8566` が `admit(...).scale === chooseScale(wish)` を
  撃っている。**object に変えれば一斉に嘘になる。**
* **(C-2) `counsel.test.js:292` の「壊れ engine」門は `COUNSEL_JA` / `COUNSEL_EN` の
  定数名をソース置換で潰す。** 語彙をこの二つの定数から別の場所へ移すと
  「門の壊し方が古い」で赤くなる(`assert.ok(broken !== src, …)`)。
  → **`COUNSEL_JA` / `COUNSEL_EN` という定数名と、その語彙が判定に効く経路を残さねばならない。**
  加えてこの門は「語彙を潰せば『楽園のエンジンを監査してほしい』が **reform** へ落ちる」ことも撃つ。
  すなわち **counsel を潰したとき REFORM_RE がその願いを拾う**という関係も保存が要る。

門の総数:

```
$ node tests/paradise.test.js --gate-list | wc -l
472
```

(絞り込みの口は **CLI 引数のみ**: `--gate <正規表現>` / `--gate-not <正規表現>` / `--gate-list`。
`tests/paradise.test.js:19-116` の「絞り込み塊」。**環境変数は一つも読まない** —— `census.js` が
自己診断を素で呼んで env を継承し、絞り込み後の数を README に持ち込むのを防ぐため(第22条)。
ただし **絞り込んでも走行時間は縮まない**: 塊は `test()` の呼び出しだけを止め、
ファイル先頭〜末尾のトップレベルの重い処理は走る。実測、`--gate` 付きでも 180 秒で終わらなかった。)

---

## 4. 欠陥B の再現 — 実測の生出力

```
$ TMPV="$LOCALAPPDATA/Temp/fakevault-$$"
$ mkdir -p "$TMPV/reform-probe"
$ cat > "$TMPV/reform-probe/conclave.json" <<'EOF'
{"meta":{"scale":"reform","wish":"probe"},"domains":[{"name":"discovery","status":"pending",
 "phases":[{"id":"discover","artifactPath":"graph/forge.js"}]}]}
EOF
$ PARADISE_CREATIONS="$(cygpath -w "$TMPV")" node graph/workspace.js check
✗ reform の走行帳が創造物の倉に居る (1 件) — 楽園の reform/<slug>/ へ移せ
  C:\Users\kikus\AppData\Local\Temp\fakevault-313\reform-probe\conclave.json  [scale,slug,artifact]  domains 0/1
     meta.scale が 'reform' を名乗っている / 倉での名が 'reform-' で始まる / 成果物が楽園 engine (…) を指している
EXIT=1

$ PARADISE_CREATIONS="$(cygpath -w "$TMPV")" node graph/workspace.js resolve --json
{
  "root": "C:\\Users\\kikus\\AppData\\Local\\Temp\\fakevault-313",
  "source": "env",
  "legacy": false,
  "exists": true
}

$ node graph/workspace.js check          # env 無し = 本物の倉
✓ 楽園に創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし
EXIT=0
```

**再現した。** そして `resolve()` の返り値が病の正体を名指ししている ——
`source: 'env'` としか言わず、`exists: true` としか言わない。
**「在る」と「創造物の倉である」が同じ言葉になっている。**
これは第37条が verdict について言ったことと同じ形である:
*「見に行けなかった」と「何も無かった」が同じ文になってはならない* の裏返しで、
ここでは *「ディレクトリが在る」と「創造物の倉である」が同じ文になっている*。

被害の射程(`grep -rn PARADISE_CREATIONS tests/`):
**5 ファイル・40 箇所以上**が `PARADISE_CREATIONS` で仮倉を立てている
(`abandoned-run.test.js` / `abode.test.js` / `gauge-audit.test.js` / `paradise.test.js` / …)。
そのいずれかが env を残したまま `workspace.js check` を呼ぶ人の手に戻れば、偽の赤が出る。

---

## 5. 本物の創造物の倉は何で見分けられるか(実測)

`C:/Users/kikus/Documents/workspace/paradise-creations` を実際に見た。

```
$ ls -a C:/Users/kikus/Documents/workspace/paradise-creations
.  ..  .claude  .git  .github  .gitignore  _scratch
coin  gauge-ledger.jsonl  habit  pomodoro  README.md  rps  tenbin

$ git -C C:/Users/kikus/Documents/workspace/paradise-creations config --get remote.origin.url
https://github.com/kikusyo1101/paradise-creations.git

$ git -C C:/Users/kikus/Documents/workspace/paradise remote -v
origin  https://github.com/kikusyo1101/paradise-forge.git (fetch/push)

$ ls C:/Users/kikus/Documents/workspace/paradise-creations/.github/workflows
tribunal.yml

$ find …/paradise-creations -maxdepth 2 -name ".paradise*"
(何も無い)
```

### 見分けの候補と、その当否

| 候補 | 本物で真か | 仮倉で偽か | 判定 |
|---|---|---|---|
| **git remote origin が `paradise-creations` で終わる** | ✅ 真(実測) | ✅ 偽(Temp 直下に git repo は無い。実測 exit 1・14ms) | **採る** |
| 目印ファイル `.paradise-creations` が在る | ❌ **無い**(実測。作れば真にできるが、今は存在しない) | ✅ | 副条件として採る(**engine が作る**なら) |
| `README.md` が在る | ✅ | 仮倉次第 | 弱い。単独では不可 |
| `.github/workflows/tribunal.yml` が在る | ✅ | ✅ | 中。ただし倉側の CI を消したら engine が壊れる = 結合が強すぎる |
| ディレクトリ名が `paradise-creations` | ✅ | ✅(ただし `abandoned-run.test.js` の sandbox は `paradise-creations` という名の仮倉を作る → **偽陽性**) | ❌ **採ってはならない**(実測: `tests/abandoned-run.test.js:51` `const store = path.join(dir, 'paradise-creations')`) |
| `source !== 'env'` なら本物 | ✅ | ✅ | ❌ **採ってはならない**。既存の門 40 箇所以上が env で仮倉を立てて `strayRuns()` を**正しく鳴らしている**(`B-1 [故障注入]`)。env を一律に無視すれば **その門が死ぬ** |

**最後の行が最も重い。** 「env なら裁かない」は最短だが、`tests/abandoned-run.test.js:258`
(`B-1 [故障注入]`)が **まさに env で仮倉を立てて `strayRuns()` が鳴ることを撃っている**。
env を無条件で黙らせれば **欠陥B対策が欠陥B対策を殺す**。
ゆえに裁きの分岐は **env かどうか**ではなく **その場所が創造物の倉か**でなければならない。
そして `strayRuns()` 自身は**今のまま鳴り続けねばならない** —— 黙らせるのは
**CLI の `check` が EXIT=1 を出すかどうか**の層である(§6.4)。

`git` が使えない/repo でない場合の実測コスト: **14〜15ms**(上記の 2 回の計測)。
`check` は CI で 1 回走るだけなので、この代は払える。

---

## 6. 治し方の検討 — 教主の 4 案を実測で採点した

### 6.1 第1世代(案A+B+C を素朴に足しただけ)

```
$ node C:/Users/kikus/AppData/Local/Temp/rm-proto.js
…
NG=1 / 36
| 台帳の毒を直す | quick | reform | quick | **NG** |
```

**失敗の原因**: REFORM_RE に engine の固有名を足すとき「台帳/ledger」を入れたため、
`台帳の毒を直す`(教主が回帰防止に名指しした quick)が reform へ攫われた。
**誤着を直して別の誤着を生んだ。** これが最大の危険であるという教主の警告が、そのまま実測で出た。

### 6.2 engine の固有名をどこから採るか(第22条)

手で語を並べると上のような事故が起きる。**測って作れないか**を試した。

```
$ node C:/Users/kikus/AppData/Local/Temp/rm-proto2.js
graph/*.js 総数= 39
長さ4以上の名= 38 ["abode","apply-guards",…,"census","check-agents","clergy","codex","conclave",
  "contract","critic",…,"forge","gauge","graph-engine",…,"verdict",…,"wiring","workspace"]
除外される短名= ["kg"]
誤射なし
gauge に当たるか: true
CI に当たるか: true
```

`graph/*.js` のファイル名(4 文字以上)を語彙にすると **38 語**が自動で採れ、
回帰防止の 11 件に **一件も誤射しなかった**。`gauge` も拾える。
ただし **`ledger` / `CI` / `自己診断` / `走行帳` はファイル名に無い**ので別途要る。
そして §6.1 が示した通り **`ledger` / `台帳` を入れると quick が壊れる。**

→ **結論: `台帳` と `ledger` は REFORM 語彙に入れてはならない。**
「CI に ledger --audit を追加する」は **`CI`** で reform に着けばよい(実測でそうなった)。

### 6.3 第3世代(採用候補) — 37 件で NG=0

```
$ node C:/Users/kikus/AppData/Local/Temp/rm-proto3.js
NG=0 / 37
isCounsel2("検討したツールを実装して") = false (期待 false)
isCounsel2("現状のCIの健全性を監査してほしい") = true (期待 true)
denude("CI に ledger --audit を追加する") = "CI に ledger を追加する"
```

全 37 行(誤着 5 件 + 教主の回帰防止 4 件 + 既存の門が撃っている断定すべて):

| 願い | 現行 | 試作3 | 期待 | 判定 |
|---|---|---|---|---|
| 楽園の自己診断に絞り込みの口を設ける | counsel | **reform** | reform | OK |
| 門に監査の一段を足す | counsel | **reform** | reform | OK |
| CI に ledger --audit を追加する | counsel | **reform** | reform | OK |
| 健康診断アプリが欲しい | counsel | **standard** | standard | OK |
| gauge に fingerprint を確かめる口を設ける | standard | **reform** | reform | OK |
| 楽園の位階の相関図を作れ | cartography | cartography | cartography | OK |
| 楽園のエンジンを監査してほしい | counsel | counsel | counsel | OK |
| 台帳の毒を直す | quick | quick | quick | OK |
| ポモドーロタイマーが欲しい | standard | standard | standard | OK |
| 現状のCIの健全性を監査してほしい | counsel | counsel | counsel | OK |
| Rustの非同期ランタイムの選択肢を調査して比較表がほしい | counsel | counsel | counsel | OK |
| 今月のPRの傾向を報告してほしい | counsel | counsel | counsel | OK |
| この設計は妥当か意見がほしい | counsel | counsel | counsel | OK |
| ハーネスの設計を見直す必要はないか | counsel | counsel | counsel | OK |
| 楽園のエンジンのバグを修正する | reform | reform | reform | OK |
| 楽園に新しい門を追加してほしい | reform | reform | reform | OK |
| タスク管理アプリを作って | full | **standard** | standard\|full | OK |
| タイポを直して | quick | quick | quick | OK |
| ログイン画面のバグを直す | quick | quick | quick | OK |
| オーケストレーションの相関図、関連図を作成し連携してほしい | cartography | cartography | cartography | OK |
| 位階の図を描いてほしい | cartography | cartography | cartography | OK |
| creations のデータフローを可視化して | cartography | cartography | cartography | OK |
| draw a sequence diagram of the dispatch chain | cartography | cartography | cartography | OK |
| 意図を汲んでタイマーを実装してほしい | standard | standard | standard | OK |
| 地図アプリが欲しい | full | **standard** | standard\|full | OK |
| 楽園の憲法に条を足せ | reform | reform | reform | OK |
| バグを直して | quick | quick | quick | OK |
| エンジンを監査してほしい | counsel | counsel | counsel | OK |
| ダッシュボードを生きた門にせよ | reform | reform | reform | OK |
| fix login bug | quick | quick | quick | OK |
| add a dark mode toggle | standard | standard | standard | OK |
| build a habit tracker app | full | full | full | OK |
| 楽園のオーケストレーションを改善する | reform | reform | reform | OK |
| 憲法に条を足す | reform | reform | reform | OK |
| improve the harness engine | reform | reform | reform | OK |
| 門を強化する | reform | reform | reform | OK |
| 市場の競合を調査して報告書をくれ | counsel | counsel | counsel | OK |

**太字が動いた 5 件。うち 3 件は狙った修正、2 件(`タスク管理アプリを作って` / `地図アプリが欲しい`)は
`fullJa` から「アプリ」を外した副作用である。**

副作用の当否:
* `タスク管理アプリを作って` — `counsel.test.js:56` は `['standard','full']` の**どちらでも緑**。壊れない。
* `地図アプリが欲しい` — `paradise.test.js:7199` は「cartography でない」としか言わない。壊れない。
* 英語の `\bapp\b` は `fullEn` に**残す**ので `build a habit tracker app` → full は保存される(実測 OK)。
* **これは日本語と英語で「アプリ/app」の扱いが割れることを意味する。** 意図的だが、
  requirements 相で教主の裁定を仰ぐべき点である(§8-2)。

### 6.4 欠陥B の案D — 何を「本物」とするか

`isCreationsVault(root)` を `workspace.js` に置き、**二つの独立した印**のどちらかで肯う:

1. `git -C <root> config --get remote.origin.url` が `paradise-creations(.git)?` で終わる
2. `<root>/.paradise-creations` という目印ファイルが在る(**engine が `init` 時に置く**。
   今は存在しないので、build 相で「置く側」も作らねばならない)

そして **裁きの層を分ける**(§5 の最後の行が要求した設計):

| 関数 | 変更 | 理由 |
|---|---|---|
| `strayRuns()` | **変えない。今まで通り鳴る** | `abandoned-run.test.js` の `B-1 [故障注入]` が env 仮倉で鳴ることを撃っている。ここを黙らせたら欠陥B対策が既存の門を殺す |
| `resolve()` | 返り値に `vault: true\|false\|null` を**足す**(既存キーは一つも消さない) | `paradise.test.js:3085` が `source`/`legacy`/`root` を撃っている。**増やすのは安全、変えるのは危険** |
| CLI `check` | 倉が本物でないとき `strayRuns` の結果を **EXIT に数えず、声に出して skip** | 第37条。「見に行けなかった」を「一件も無い」と偽らず、かつ偽の赤も出さない |

「声に出して skip」の形(第37条の要求):
**黙って 0 件にしてはならない。** 「創造物の倉ではない場所を指しているので、走行帳の流出は検めなかった」
と**名指しで**言い、その上で exit 0 を返す。

---

## 7. 基準線 — 今の門は緑である(壊す前の記録)

```
$ node tests/counsel.test.js        → Counsel self-test: 51 passed, 0 failed   (EXIT=0)
$ node tests/abandoned-run.test.js  → abandoned-run: 20 passed, 0 failed       (EXIT=0)
$ node graph/workspace.js check     → ✓ …流出なし                              (EXIT=0)
$ node tests/paradise.test.js --gate-list | wc -l  → 472
```

`tests/paradise.test.js` の全走は **6 分**かかるため、この相では **撃っていない**(§8-1)。

CI の結線(`.github/workflows/tribunal.yml`):
* 30行 `node graph/workspace.js check` — **`|| true` 無し**。赤は赤である
* 168行 `node tests/counsel.test.js`
* 171行 `node tests/abandoned-run.test.js`
* 383-386行 verify job でも `workspace.js check` を verdict.md へ追記(`|| true` を外した旨の註釈あり)

→ **欠陥B の偽の赤は CI を落とす力を持っている。** 直す価値は理屈ではなく実害である。

---

## 8. 調べきれなかったこと・確信が持てないこと(第37条)

1. **`tests/paradise.test.js` の全走を一度も撃っていない。** 6 分かかり、
   絞り込みの口 (`--gate`) は `test()` の呼び出しを止めるだけでトップレベルの重い処理を止めないため、
   180 秒の制限内で終わらなかった。**472 門のうち、道選びに触れない門への影響は未検証である。**
   build 相は**必ず全走を一度撃たねばならない**。
2. **`fullJa` から「アプリ」を外す是非は、教主の裁定を得ていない。**
   「健康診断アプリが欲しい」を standard に着けるには他に道が無いが、
   これは「日本語の『アプリ』は full の印ではなくなる / 英語の `app` は full の印のまま」という
   **非対称**を持ち込む。requirements 相で明示的に決めるべきである。
3. **`ECサイトを作れ` → standard の誤着は、教主の名指しに無い別の欠陥である。**
   本走行で直すか、別の走行に送るかを裁定していない。
4. **`.paradise-creations` 目印ファイルは今この世に存在しない。**
   案D の第2の印を採るなら、build 相は「目印を置く側」(`workspace.js init` か倉側の一回きりの手)も
   作らねばならない。**目印だけを読む実装を書けば、本物の倉ですら偽になる。**
5. **`git` が無い環境での `isCreationsVault` の振る舞いを実測していない。**
   git を PATH から外した実験はしていない。`execFileSync` が `ENOENT` で投げることは
   `strayCreations()` の既存の catch から推測できるが、**推測である**。
6. **倉側 (`paradise-creations`) の `.git` を持たない checkout(CI の actions/checkout など)で
   remote が読めるかを実測していない。** CI は倉を clone しないので `exists=false` になり
   そもそもここを通らない、と読んだが、これも実装の読み取りであって実測ではない。
7. **`denude()` がバッククォート内を剥ぐことで、正当な願いの意味を落とす場合があるか**を
   広く撃っていない。37 件では事故が無かったが、37 件は全ての願いではない。
8. **`--gate` の絞り込みが走行時間を縮めない**ことは実測したが、
   **なぜ縮まないか**(どのトップレベル処理が重いか)は特定していない。
   本走行の範囲外だが、自己診断の絞り込みという別の reform 走行の前提が崩れている可能性がある。
