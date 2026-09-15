# design — reform 走行『route-misfire』

道: `reform` / 相: `design`
前相: [`discovery.md`](./discovery.md) → [`requirements.md`](./requirements.md)

**この文書はコードを書かない。** 何をどこにどの順で置くか、署名と判定順、
そして**踏んではならない地雷**を示す。実装は build 相の仕事である。

---

## 0. 設計の一行

> **道選びは「どんな字が現れたか」ではなく「何を寄越せと言われているか」で決める。
> 倉の裁きは「env で指されたか」ではなく「そこが創造物の倉か」で決める。**

前者が欠陥A、後者が欠陥B。どちらも第19条の同じ病 —— **形を見て意味を見逃した**。

---

## 1. 欠陥A — `graph/forge.js`

### 1.1 変える物・足す物の一覧

| 対象 | 行(main c216014) | 操作 | 中身 |
|---|---|---|---|
| `denude(wish)` | 新規(`REFORM_RE` の直前) | **足す** | 願い文から判定を惑わす記号を剥ぐ |
| `BUILD_JA` / `BUILD_EN` | 新規(`CREATE_RE` の直後) | **足す** | 建造の動詞の語彙(二つに割る。日本語に `\b` を使わない) |
| `CREATE_RE` | 303 | **広げる** | 既存の源に `BUILD_JA` / `BUILD_EN` を足す。**既存の語は一つも消さない** |
| `PRODUCT_RE` | 新規(`DOC_RE` の直後) | **足す** | 産物の主名詞 |
| `ENGINE_NAMES` | 新規(`REFORM_RE` の直前) | **足す** | engine の固有名。**`graph/*.js` のファイル名から測って作る** |
| `REFORM_RE` | 284 | **広げる** | 既存の源に `ENGINE_NAMES` を足す |
| `isCounsel(wish)` | 314 | **書き換える** | 剥いだ文で判定し、産物の主名詞を DOC より強くする |
| `isCartography(wish)` | 345 | **呼び側を変えるだけ** | 関数自体は触らない。`chooseScale` が剥いだ文を渡す |
| `chooseScale(wish)` | 354 | **書き換える** | 冒頭で一度だけ剥ぎ、以降は剥いだ文で判定する |
| `fullJa` | 366 | **狭める** | 「アプリ」を外す(**要教主の裁定** — requirements §6-1) |
| `module.exports` | 521 | **足す** | `denude` / `PRODUCT_RE` / `BUILD_RE` を追加(門が直接撃てるように) |

**`chooseScale` の返り値の型は文字列のまま**(FR-05 / AC-12)。
**`COUNSEL_JA` / `COUNSEL_EN` の定数名は残す**(FR-06 / AC-13)。

### 1.2 新しい関数の署名

```
denude(wish: string) -> string
```
願い文から**判定を惑わす記号**を剥いだ文を返す。副作用なし。冪等
(`denude(denude(w)) === denude(w)` であること)。

剥ぐ順序(この順でなければならない):
1. **バッククォート区間** `` `…` `` → 空白
   (先に剥がないと、中の `--flag` を剥いだ跡がバッククォートの対応を壊す)
2. **フラグ語** 行頭または空白/開き括弧の直後の `--word` / `-w` → 空白
   (**直前の一字を保存して置換する**こと。素朴に食うと直前の語が繋がる)
3. **ファイル名** `名前.js` `.json` `.jsonl` `.md` `.yml` `.yaml` `.ts` `.tsx` `.sh` → 空白
4. 連続空白を一つに畳み、前後を落とす

**剥いだ文は判定にのみ使う。** `buildDag` の `meta.wish` には**元の願い文**が入る
(`counsel.test.js:120` が `meta.wish === '願い'` を撃っている)。

```
BUILD_RE : RegExp          // 建造の動詞。CREATE_RE に合流する
PRODUCT_RE : RegExp        // 産物の主名詞
ENGINE_NAMES : string      // engine の固有名の語彙(| 区切り。RegExp ではない)
```

`ENGINE_NAMES` を **string** にするのは、`REFORM_RE` の源に埋め込むためである
(`COUNSEL_JA` が string であるのと同じ作法)。

### 1.3 `isCounsel` の新しい判定順

```
isCounsel(wish) -> boolean
  w = denude(wish)
  1. COUNSEL_RE が w に当たらない        → false           (諮問の語彙が無い)
  2. CREATE_RE(拡張済) が w に当たる
     または PRODUCT_RE が w に当たる      → 次の 3 へ        (物を求めている疑い)
     そうでなければ                      → true            (答えだけを求めている)
  3. DOC_RE が w に当たり、かつ
     PRODUCT_RE が w に当たらない        → true            (求めている物が文書そのもの)
     そうでなければ                      → false           (求めているのは物である)
```

**3 が肝である。** 現行は `CREATE_RE(w) && !DOC_RE(w)` という一行で、
「診断」が COUNSEL と DOC の両方に居ることを利用して打ち消しが無効化されていた。
新しい形は **「DOC に当たったか」ではなく「DOC に当たり、かつ産物の主名詞が無いか」**を問う。

* 「健康診断アプリが欲しい」 → CREATE ○ / DOC ○ / PRODUCT ○(アプリ) → **3 で false** → 諮問でない ✅
* 「比較表がほしい」 → CREATE ○ / DOC ○ / PRODUCT ✗ → **3 で true** → 諮問 ✅
* 「Rustの…調査して比較表がほしい」 → 同上 → 諮問 ✅
* 「楽園の自己診断に絞り込みの口を設ける」 → CREATE ○(設ける) / DOC ○(診断) / PRODUCT ○(口) → **3 で false** ✅
* 「検討したツールを実装して」 → CREATE ○(実装) / DOC ✗ / PRODUCT ○(ツール) → **3 で false** ✅(AC-11)
* 「現状のCIの健全性を監査してほしい」 → CREATE ✗ / PRODUCT ✗ → **2 で true** ✅(AC-11)

### 1.4 `chooseScale` の新しい判定順

```
chooseScale(wish) -> string            // 型は変えない
  w  = denude(wish)                    // ★ 一度だけ剥ぎ、以降 w を使う
  lw = w.toLowerCase()

  1. isCartography(w)         → 'cartography'
  2. isCounsel(wish)          → 'counsel'     // ★ 元の文を渡す(中で自分で剥ぐ)
  3. REFORM_RE(拡張済).test(w) → 'reform'
  4. quickJa.test(w) || quickEn.test(lw) → 'quick'
  5. fullJa.test(w)  || fullEn.test(lw)  → 'full'
  6. 既定                      → 'standard'
```

**順序は変えない。** 変えるのは「何を渡すか」と「各段の語彙」だけである。
順序を動かせば `counsel.test.js:292` の「壊れ engine」門が撃っている関係
(語彙を潰すと `楽園のエンジンを監査してほしい` が **reform** へ落ちる = counsel が reform より先に立つ)
が崩れる。

`isCounsel` にだけ**元の文**を渡すのは、`isCounsel` が単体でも正しく振る舞わねばならないため
(`counsel.test.js` が `forge.isCounsel('検討したツールを実装して')` を直接撃つ / AC-11)。
二重に剥ぐが `denude` は冪等なので害は無い。

### 1.5 `ENGINE_NAMES` を測って作る(第22条)

discovery §6.2 の実測: `graph/*.js` のファイル名のうち **4 文字以上で `[a-z][a-z-]*` の形**は **38 件**。
これを回帰防止の 11 件に撃って **誤射ゼロ**だった。

だが **build 相で `fs.readdirSync` を走らせて動的に作ってはならない。** 理由:
* `chooseScale` は純粋な関数であるべきで、ディスクを読む副作用を持たせるとテストが遅く脆くなる
* ファイルが増減するたび道選びの挙動が黙って変わる —— **それは第22条の「測る」ではなく「揺れる」である**

**設計の答え**: `ENGINE_NAMES` は **`forge.js` の中に静的な文字列として書く**。
そのうえで **門を一本立て**、「`graph/*.js` の名のうち 4 文字以上のものが `ENGINE_NAMES` に載っているか」を
`fs.readdirSync` で照合する。**engine が増えたら門が赤くなって人に知らせる。**
測るのは門であって、判定ではない。

**禁則(discovery §6.1 の実測で踏んだ)**:
`ENGINE_NAMES` に **`台帳` / `ledger` を入れてはならない**。
`台帳の毒を直す` が quick から reform へ攫われる(AC-09 が赤くなる)。
「CI に ledger --audit を追加する」は **`CI`** の方で reform に着けばよい —— 実測でそうなった。

#### 1.5.1 名の表は**三枝**になった(rework 相 → F-1 の修理)

設計当初は名を一枚の表にして `REFORM_RE` に流し込む形であった。実測が二度覆した:

| 代 | 形 | 実測で出た病 |
|---|---|---|
| 初代(build) | 一枚の表 → `REFORM_RE` | **欠陥C** —— 世間の願い 10 件が reform へ攫われた(`a vendor management dashboard` 等) |
| 二代(rework/quality) | 強い名 / 弱い名の二分。弱い名に `BUILD_RE` + 限定詞の除外、**強い名は限定詞の除外のみ** | **F-1** —— 強い名 26 語が**日本語の願いを無条件で攫った**(日本語に冠詞は無い。main 0/55 → HEAD 54/55) |
| 三代(本修理) | **抽象名 / 強い固有名 / 弱い名の三枝**。どの枝も無条件ではない | — |

**三代の形**:

```
isReformSubject(d):
  1. REFORM_ABSTRACT_RE(d)                                    → true   (無条件)
  2. REFORM_STRONG_RE(d) && (BUILD_RE(d) || MEND_RE(d))       → true
  3. REFORM_WEAK_RE(d)   &&  BUILD_RE(d)
```

**枝 1 が無条件でよい理由**: 抽象名(楽園/門/engine/憲法/走行帳/自己診断)は
**楽園以外のものを指さない**。世間の願い文に「楽園の」とは書かれない。
ここに動詞を課せば `楽園はどうあるべきか` 系が死ぬ(AC-40 が撃つ)。

**枝 2 と枝 3 が非対称な理由**: 強い名は**楽園固有性の証拠として強い**ので、
許す動詞集合も広くてよい(`BUILD_RE` ∪ `MEND_RE`)。
弱い名(vendor/census/workflow)は世間の語そのものなので、`MEND_RE` まで許すと
`fix the vendor page` が楽園の改革と誤読される。**証拠の強さが許す範囲を決める。**

**`MEND_RE` が要る理由**: `conclave の毒を除く` は `BUILD_RE` を一語も持たない
(「除く」は建造ではない)。強い名に `BUILD_RE` だけを課せば、
楽園の最も自然な改修の願い(**壊れた物を除く**)が全て死ぬ。

**`MEND_RE` の禁則**: 世間の創造の動詞(`作れ`/`欲しい`/`build`/`create`)を
**一語も入れてはならない**。入れた瞬間 `forge 鍛冶屋の在庫管理アプリを作って` が
reform へ戻る —— それが F-1 そのものである(AC-41 が表を直に撃つ)。

### 1.6 `fullJa` から「アプリ」を外す(要裁定)

AC-04(健康診断アプリ→standard)を満たすには他に道が無い。
外した結果、実測で動くのは次の 2 件のみ:

| 願い | 変更前 | 変更後 | 既存の門 |
|---|---|---|---|
| タスク管理アプリを作って | full | standard | `counsel.test.js:56` は `['standard','full']` のどちらでも緑 |
| 地図アプリが欲しい | full | standard | `paradise.test.js:7199` は「cartography でない」としか言わない |

**英語の `\bapp\b` は `fullEn` に残す。** ゆえに `build a habit tracker app` → full は保存される
(`paradise.test.js:288` / 実測 OK)。
**日本語と英語で非対称になる。** これは意図的だが、requirements §6-1 が教主の裁定を仰いでいる点である。
**裁定が下りるまで build 相はこの一行を書いてはならない。**

### 1.7 踏んではならない地雷(既存の門が張っている)

| # | 地雷 | 出所 | 守り方 |
|---|---|---|---|
| L-1 | `chooseScale` の返り値を object にする | `forge.js:392` の警告 / `paradise.test.js:8566` | 文字列のまま(AC-12/AC-17) |
| L-2 | `COUNSEL_JA`/`COUNSEL_EN` の定数名を消す・語彙を別の場所へ移す | `counsel.test.js:280-298` がソース置換で潰す | 定数名と判定経路を残す(AC-13) |
| L-3 | 日本語の語彙に `\b` を使う | 過去の実測(日本語の願いが全て standard へ落ちた) | `BUILD_JA` と `BUILD_EN` を**別の定数に割る** |
| L-4 | `ENGINE_NAMES` に `台帳`/`ledger` を入れる | discovery §6.1 の実測 | 入れない(AC-09) |
| L-5 | `meta.wish` に剥いだ文を入れる | `counsel.test.js:115-122` | `buildDag` には元の願い文を渡す |
| L-6 | `denude` が直前の一字を食う | フラグ剥ぎの素朴な実装 | 捕獲群で直前の一字を保存して置換 |
| L-7 | 判定の順序を入れ替える | `counsel.test.js:292-298` が順序の帰結を撃つ | 順序は変えない。渡す文と語彙だけを変える |
| L-8 | `PRODUCT_RE` に「図」を入れる | `isCartography` の紛れ語対策(`意図/地図`) | 入れない。作図は 1 段目で既に決着している |

---

## 2. 欠陥B — `graph/workspace.js`

### 2.1 変える物・足す物の一覧

| 対象 | 行 | 操作 | 中身 |
|---|---|---|---|
| `VAULT_MARKER` | 新規(`SIBLING_NAME` の直後) | **足す** | 目印ファイルの名 `.paradise-creations` |
| `isCreationsVault(root)` | 新規(`isDir` の直後) | **足す** | そこが本物の創造物の倉かを裁く |
| `resolve(opts)` | 40 | **足す(壊さない)** | 返り値に `vault` を追加 |
| `strayRuns()` | 207 | **触らない** | FR-10。`abandoned-run.test.js:258` が env 仮倉で鳴ることを撃つ |
| `runLedgers()` | 163 | **触らない** | 同上 |
| CLI `check` | 255 | **書き換える** | 倉が本物でないとき、走行帳の裁きを EXIT に数えず、声に出して skip |
| `module.exports` | 286 | **足す** | `isCreationsVault` / `VAULT_MARKER` |
| `init` の CLI | 243 | **足す** | 倉を作るとき目印ファイルを置く(FR-11) |

### 2.2 `isCreationsVault` の署名と判定順

```
isCreationsVault(root: string) -> boolean
```

判定順(**安い印から先に**。git は 14〜15ms の代を払う):

```
1. root が存在しない / ディレクトリでない          → false
2. <root>/.paradise-creations が在る               → true      (目印。ディスク一発)
3. git -C <root> config --get remote.origin.url が
   /paradise-creations(\.git)?$/ に一致            → true      (由来。14〜15ms)
4. それ以外                                        → false
```

**例外は一つも外へ出さない**(NFR-02 / AC-26)。
`git` が PATH に無い場合 `execFileSync` は `ENOENT` を投げる —— **実測で確認済**。
`strayCreations()` の既存の作法(`try { … } catch { return [] }`)に倣って握り潰す。
`stdio: ['ignore','pipe','ignore']` で git の泣き言を画面に出さないのも既存に倣う。

**ディレクトリ名では裁かない。** `tests/abandoned-run.test.js:51` の sandbox は
`paradise-creations` という名の仮倉を作る。名で裁けば **既存の門が撃つ仮倉が本物になり、
skip が発動して `B-1 [故障注入]` が死ぬ**(AC-23 がこれを防ぐ)。

**`source === 'env'` でも裁かない。** env で仮倉を立てて `strayRuns()` を正しく鳴らす門が
40 箇所以上在る(discovery §4)。**印は場所そのものに在るべきで、指され方に在ってはならない。**

### 2.3 `resolve()` の変更 — 足すだけ

```
resolve(opts) -> { root, source, legacy, exists, vault }
                                            ~~~~~ ★ 追加
```

`vault` の値:
* `true`  — `exists` かつ `isCreationsVault(root)`
* `false` — `exists` だが本物の倉ではない
* `null`  — `exists` が false(**見に行けなかった。偽と断じない** — 第16条/第37条)

**既存の 4 キーは名も意味も変えない。** `paradise.test.js:3085` が
`source === 'env'` / `legacy === false` / `root === path.resolve(…)` を撃っている(AC-25)。

`null` を使うのは `conclave.js:runAbandonment` の先例に倣う ——
`A-5 [第16条]: 測れなかった走行はゼロで埋めず null のまま名指しする`。
**「無い」と「見ていない」を同じ値にしない**のが楽園の作法である。

### 2.4 CLI `check` の新しい形

```
check:
  r     = resolve()
  stray = strayCreations()          // 変わらず
  hard  = hardcodedRefs()           // 変わらず

  ── 走行帳の裁きだけが条件付きになる ──────────────────
  judgeRuns = (r.vault === true)
  runs      = judgeRuns ? strayRuns() : []
  skipped   = !judgeRuns

  ── 印字 ───────────────────────────────────────────
  if (skipped):
      「· 走行帳の流出は検めなかった — <r.root> は創造物の倉ではない
         (目印 .paradise-creations も git remote paradise-creations も無い)」
      ※ 記号は ✓ でも ✗ でもない。第三の記号(· )を使う。
        緑を騙らず、赤も騙らない。

  緑の条件: stray=0 かつ hard=0 かつ runs=0
  → 緑でも skipped なら **上の一行を必ず先に印字してから** ✓ を出す
  → exit 0

  赤(いずれか非零): 従来通り名指しして exit 1
```

**`skipped` は exit に影響しない。** 検められなかったことは失敗ではない —— **黙ることが失敗である**。
これが第37条の正しい読み方である。第37条は「絶対に緑にするな」とは言っていない。
「**見なかったことを見たことにするな**」と言っている。

**`r.vault === null`(倉が無い)場合も同じ扱い**とする。
ただし文言は「倉が存在しない」と区別して言うこと —— CI の checkout がこれに当たり、
「倉ではない」と「倉が無い」を混ぜると人が原因を追えない(第21条: 名指ししない門は直せない)。

### 2.5 `init` に目印を置かせる(FR-11)

discovery §5 の実測: **本物の倉に `.paradise-creations` は存在しない。**
読む側だけを作ると、印 2 は永久に死んだ枝になる —— 第57条が咎める「発火しない門」である。

`init(slug, opts)` が倉の根に目印を置く:
```
init(slug, opts) -> string          // 署名は変えない
  dir = creationDir(slug, opts)
  mkdirSync(dir, {recursive:true})
  ★ 倉の根に VAULT_MARKER が無ければ置く(冪等。中身は一行の説明でよい)
  return dir
```

**現に在る倉には、build 相が一度だけ置く**(倉側のリポジトリへの 1 ファイル追加)。
ただし **倉への commit は本走行の権限外**である可能性がある —— 教主の裁定を仰ぐこと。
置けないなら印 1(git remote)だけで AC-22 は通る(実測 `real=true`)。
**その場合「印 2 は本物の倉で一度も発火していない」と声に出して記録する**(第57条 / 第37条)。

### 2.6 踏んではならない地雷

| # | 地雷 | 出所 | 守り方 |
|---|---|---|---|
| L-9 | `strayRuns()` を仮倉で黙らせる | `abandoned-run.test.js:258` `B-1 [故障注入]` | 関数は触らない。skip は CLI の層だけ(AC-21) |
| L-10 | `source === 'env'` で裁く | 同上。40 箇所以上が env で仮倉を立てる | 場所そのものを見る |
| L-11 | ディレクトリ名で裁く | `abandoned-run.test.js:51` の sandbox 名 | 名で裁かない(AC-23) |
| L-12 | `resolve()` の既存キーを変える/消す | `paradise.test.js:3085` | 足すだけ(AC-25) |
| L-13 | skip したとき黙って `✓ …流出なし` と言う | 第37条 | 第三の記号で名指しして印字(AC-19) |
| L-14 | `isCreationsVault` が例外を投げる | NFR-02 | catch で握り潰し false(AC-26) |
| L-15 | `check` が **CLI の中だけ**で skip を判定し、`strayRuns` の呼び出しごと消す | — | 消してよい。ただし **`strayRuns` の export と振る舞いは残す**(`B-2` が `typeof` を撃つ) |
| L-16 | `workspace.js` に住所の直書きを持ち込む | `hardcodedRefs` / AC-28 | `workspace.js` 自身は除外リストに在る(115行)ので安全。**他の engine に書かない** |

---

## 3. 門(テスト)の設計

### 3.1 どこに置くか

| 何を撃つ門 | 置き場 | 理由 |
|---|---|---|
| 判定表 37 行(AC-10) | **`tests/counsel.test.js` の `ROUTES` を拡張** | 既に判定表という形を持っている。新しいファイルを作れば同じ主張が二箇所に散る(第21条の逆:一つの主題に二つの口) |
| `denude` / `PRODUCT_RE` の単体(AC-11 周辺) | 同上 | 語彙の門はここに集まっている |
| `ENGINE_NAMES` が `graph/*.js` を網羅するか(§1.5 の門) | **`tests/counsel.test.js`** に一本 | `fs.readdirSync` を使う門。engine が増えたら赤くなる |
| `isCreationsVault` / `resolve().vault` / CLI の skip(AC-18〜26) | **`tests/abandoned-run.test.js` に `B-5`〜 として追加** | 欠陥B の一族は既にここに住む(`B-1`〜`B-4`)。ファイルは CI(`tribunal.yml:171`)と `paradise.test.js:8972` の両方から呼ばれている |

**新しい `tests/*.test.js` ファイルは作らない。** 作れば `wiring.js check` が
「誰も呼ばない門」として名指しする(第44条 / AC-27)ので、CI と `paradise.test.js` の
両方に結線を足す作業が増える。既存の二本に載せるのが安い。

### 3.2 `paradise.test.js:8976` の閾値に注意

```
assert.ok(rep.pass >= 20, `abandoned-run が ${rep.pass} 件しか検査していない — 門が痩せた`);
```
`abandoned-run.test.js` に門を足すと `pass` は増えるので、この断定は自然に緑のままである。
**減らしてはならない**だけである。`counsel.test.js` 側には同様の下限が
`tribunal.yml` から直に走るためソース上には無い —— が、AC-14 が `51 passed 以上` を求めている。

### 3.3 両方向を撃つ(第37条)

修理の門は**必ず両向きに撃つ**こと:

| 欠陥 | 塞がった側 | 壊していない側 |
|---|---|---|
| A | 誤着 5 件が正しい道へ着く(AC-01〜05) | 判定表 37 行が全部 OK(AC-10)+ 既存の門が緑(AC-14/15/16) |
| B | 仮倉で緑(AC-18)かつ黙らない(AC-19) | 本物の倉では今まで通り検める(AC-20)+ `strayRuns` は鳴る(AC-21) |

**片方だけ示した修理は壁であって門ではない**(第37条の原文)。

---

## 4. build 相への引き渡し

### 4.1 着手前に裁定を得るべき 3 点

1. **`fullJa` から「アプリ」を外してよいか**(§1.6 / requirements §6-1)。
   **裁定なしにこの一行を書いてはならない** —— AC-04 が通らないので走行は止まる。
2. **倉側リポジトリに `.paradise-creations` を置いてよいか**(§2.5 / FR-11)。
   否なら印 1 だけで進み、**印 2 が本物の倉で未発火であることを声に出して記録する**。
3. **`ECサイトを作れ` → standard の誤着**(discovery §2.1)を本走行に含めるか。
   requirements は含めない側に立った。

### 4.2 手順(この順で)

```
1. forge.js  : denude / BUILD_* / PRODUCT_RE / ENGINE_NAMES を足す
               → AC-01〜05, AC-10, AC-11, AC-12 を撃つ (数秒)
2. forge.js  : fullJa から「アプリ」を外す (裁定後)
               → AC-04, AC-10 を撃ち直す
3. counsel.test.js : 判定表 37 行 + 語彙の門 + ENGINE_NAMES 網羅の門
               → node tests/counsel.test.js  (AC-14)
4. workspace.js : VAULT_MARKER / isCreationsVault / resolve().vault
               → AC-22, AC-23, AC-24, AC-25, AC-26 を撃つ
5. workspace.js : CLI check の skip、init の目印置き
               → AC-18, AC-19, AC-20, AC-21 を撃つ
6. abandoned-run.test.js : B-5 以降を足す
               → node tests/abandoned-run.test.js  (AC-15)
7. 健全性     : node graph/wiring.js check (AC-27)
                node -e hardcodedRefs      (AC-28)
                node graph/forge.js scale …(AC-30)
8. **全走**    : node tests/paradise.test.js  (AC-16 / 6 分)
9. 数         : node graph/census.js check   (AC-29 / 3 分以上)
```

**8 を飛ばして完了と称してはならない。** discovery §8-1 が正直に書いた通り、
この走行は設計相までに **472 門のうち道選びに触れない門への影響を一度も測っていない**。

### 4.3 実測すべき数(手で書かない — 第22条)

build 相の報告に載せる数は**すべて命令の生出力から採る**こと:
* `node tests/paradise.test.js` の集計行
* `node tests/counsel.test.js` / `node tests/abandoned-run.test.js` の集計行
* AC 30 件の pass / skip / fail の内訳(**skip は声に出す**)

README に数を書き足す必要が生じたら `node graph/census.js fix` に書かせる。

---

## 5. この設計が残す未解決(第37条)

1. **`denude` が正当な願いの意味を落とす場合**を 37 件でしか撃っていない。
   バッククォート内に願いの本体を書く人は居る(「`ledger --audit` を CI に足して」)。
   その場合「ledger」も剥がれるが、`CI` が残るので reform に着く —— **実測した一例でしか確かめていない**。
2. **`ENGINE_NAMES` 網羅の門は、engine が増えたときに人を煩わせる。**
   新しい `graph/foo.js` を足すたび門が赤くなり、語彙に `foo` を足す作業が生まれる。
   これが正しい代なのか(第44条の「呼ばれない門は腐る」の逆に、うるさすぎる門は無視される)は
   実運用で測るしかない。**逃げ道として「除外リストをコード内に明示する」形**
   (`HARDCODE_EXCLUDE_FILES` の先例)を用意しておくこと。
3. **`isCreationsVault` を `resolve()` の中で呼ぶと、`resolve()` が git を撃つ関数になる。**
   `resolve()` は今まで純粋にディスクしか見なかった。40 箇所以上の門が呼んでいる。
   1 回 15ms × 40 = 0.6 秒。**許容できると見たが、実測していない。**
   もし全走が遅くなるなら、`vault` を **遅延評価(getter)** にする道が在る —— build 相の判断に委ねる。
4. **倉側のリポジトリに `.paradise-creations` を commit する権限**を確認していない。
   本走行は `push も PR もするな` と命じられている。倉は別リポジトリである。
5. **CI(`tribunal.yml:30`)の `workspace.js check` が、倉を持たない checkout で
   どの枝を通るか**を実測していない。`exists=false` → `vault=null` → skip、と読んだが
   **CI を実際に走らせて確かめていない**。build 相か prove 相が撃つこと。
