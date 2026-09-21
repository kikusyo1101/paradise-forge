# 楽園の門の肥大を畳む機構 — design 相

**相**: design / **枝**: `reform/gate-fold` / **基点**: `requirements.md`(FR-01〜11 / AC-01〜27 / NFR-01〜06)
**測定機**: Windows 11 + git-bash, node v24.14.0 / **基点 SHA**: `6641e3b6b2cb747c53ab065fe92ba413c0fc9b21`

この相の分: **どう作るかを決め、その決め方が正しいことを実測で裏づける。実装はしない。**
本相で新たに撃った命令の生出力は `reform/gate-fold/raw/d1-*.txt` 〜 `d12-*.txt` に置いた。
**この文書に生コマンド出力か requirements/findings の節番号を持たない断定は無い。**

---

## 0. 本相で測ったもの(先に述べる)

design は「設計を書く相」ではなく「**設計の前提を実測で潰す相**」である。
requirements が住所を決めていない箇所(§8-4)と、AC が暗黙に仮定していた箇所を、撃って確かめた。

| # | 測ったこと | 結果 | 生出力 |
|---|---|---|---|
| **D-1** | 台帳の候補地 8 つを `hermetic.js` がどう裁くか | 版管理下=🔴 / `.claude/` 配下の未追跡=⚠️ 緑 / **engine の住所定数経由=🔴** | `raw/d1-ledger-hermetic.txt` |
| **D-2** | 鍵の材料の候補ごとの代 | K1 64本 4.3ms / K3 216本 11.8ms / K4 546本 32.6ms | `raw/d2-keycost.txt` |
| **D-3** | `PARADISE_NO_FOLD` を読める場所 | **塊の内側は註釈でも赤。塊の外(前・後)なら緑** | `raw/d3-nofold-placement.txt` |
| **D-4** | 新 engine / 新門が孤児になるか | `fold.js` 単体=🔴孤児 / CI の段だけでは engine の孤児は消えない / **require されて初めて緑** | `raw/d4-wiring-orphan.txt` |
| **D-6** | P-3 の持ち回しが残骸を漏らすか | 起動 2→1 / **プロファイル残 0 個** / 裁定の本数と ok が完全一致 | `raw/d6-pool-leak.txt` |
| **D-7** | **AC-11 は今の CI の走行単位では成立しない** | 道の中で畳める検査は **0 回**。40 回すべてが道を跨ぐ | `raw/d7-atlas-scope.txt` |
| **D-8** | 台帳の住所を `abode.js check` がどう裁くか | **`path.join(ROOT, '.claude', …)` は第58条(a)で行を名指されて 🔴** | `raw/d8-abode-address.txt` |
| **D-9** | 確定した鍵の代と AC-03/05 の成否 | 材料 135 本 / **中央 8.5ms** / repo≠global を実測 | `raw/d9-key-final.txt` |
| **D-10** | 鍵に入れるのは生の env か `resolve().mode` か | **生の env では 素≠repo になり P-1 の取り分が半減する** | `raw/d10-abode-normalize.txt` |
| **D-11** | census の呼び口を条件づけたとき AC の門が鳴るか | **三項で包むのは緑 / 引数を足すと赤 / 呼び口を増やすと赤** | `raw/d11-census-arity.txt` |
| **D-12** | 1 プロセスで 6 道 36 図を見られるか | **見られる。`Executed 32 out of 72 inspections (40 reused)` を実際に出した** | `raw/d12-atlas-onerun.txt` |

---

## 1. 台帳の住所と形式

### 1.1 決定

| 項 | 決定 |
|---|---|
| **住所** | `<repo>/.claude/paradise-fold-ledger.jsonl` |
| **引き方** | **`graph/abode.js` を通す。** `abode.pathFor('foldLedger')` を新設し、`fold.js` は住所を自分で組まない |
| **版管理** | **しない。** `.gitignore` に 2 行を足す |
| **形式** | **JSONL(1 行 1 領収書の追記)。** JSON 配列にはしない |
| **錠** | `<住所>.lock`(`daily-guard` の既存の作法と同形) |

領収書の 1 行(AC-01 が裁く 4 欄):

```json
{"key":"b7c61f2b13b055cd","exit":0,"summary":"Paradise self-test: 492 passed, 0 failed","at":"2026-09-21T05:00:00.000Z"}
```

### 1.2 なぜ `.claude/` か — `hermetic.js` に実際に撃って確かめた

候補地を 8 つ立て、`hermetic.js` の輸出 `scanFile()` を使い捨ての写しに向けて撃った
(道具 `raw/d1-ledger-hermetic.js`、生出力 `raw/d1-ledger-hermetic.txt`):

```
$ node reform/gate-fold/raw/d1-ledger-hermetic.js
A: ROOT 直下の未追跡 (.paradise-fold-ledger.jsonl)
    hits=1  ⚠️ untracked .paradise-fold-ledger.jsonl (appendFileSync)
B: 版管理下の現物 (README.md)
    hits=1  🔴 VIOLATION README.md は版管理下 (appendFileSync)
C: .claude/ の下 (追跡されている住処)
    hits=1  ⚠️ untracked .claude/paradise-fold.jsonl (appendFileSync)
D: .claude/paradise-fold-ledger.jsonl (gitignore 候補)
    hits=1  ⚠️ untracked .claude/paradise-fold-ledger.jsonl (appendFileSync)
E: engine の住所定数 経由 (fold.LEDGER)
    hits=1  🔴 VIOLATION 綴りが組めない / engine の住所定数 fold.LEDGER (appendFileSync)
F: 仮倉 (os.tmpdir)
    hits=1  ○ sandbox (appendFileSync)
G: graph/kg-store/ の下 (gitignore 済みの既存の倉)
    hits=1  ⚠️ untracked graph/kg-store/fold.jsonl (appendFileSync)
H: engine を呼ぶだけ (MUTATOR を書かない)
    hits=0  (書き込み呼び出しとして見えない)
```

**候補地にダミーを実際に置いて `hermetic.js check` を撃った**(生出力):

```
$ echo '{"probe":1}' > .claude/paradise-fold-ledger.jsonl
$ git status --porcelain
?? .claude/paradise-fold-ledger.jsonl
?? reform/gate-fold/
$ node graph/hermetic.js check
  走査 26 ファイル / 書き込み 435 箇所 (複製 396 / 倉の未追跡 4 / 出自不明 35)
  ✓ 版管理下の現物を走行中に書き換える門は無い — 同時に走っても答えは一つである
$ rm -f .claude/paradise-fold-ledger.jsonl
```

**`hermetic.js check` は緑のままである。** 衝突しない。

`.gitignore` の綴りの候補も、現物を触らずに `core.excludesFile` で実験した:

```
$ git -c core.excludesFile=<候補> check-ignore -v .claude/paradise-fold-ledger.jsonl
"…/d5-exclude.txt":1:.claude/paradise-fold-ledger.jsonl	.claude/paradise-fold-ledger.jsonl
$ git -c core.excludesFile=<候補> status --porcelain
?? reform/gate-fold/                    ← 台帳は現れない
```

### 1.3 採らなかった候補と、採らなかった理由

| 候補 | 採らない理由 |
|---|---|
| **B: 版管理下の現物**(README 等に書く) | `hermetic.js` が **🔴 VIOLATION** を返す(D-1 実測)。**第58条(c)**: 測定が測定を壊す |
| **E: engine の住所定数を裸で書く**(`fold.LEDGER`) | D-1 で **🔴 VIOLATION「engine の住所定数 — 版管理下の現物である」**。`hermetic.js:667` が `LEDGER_MEMBER_RE` で名指す形そのものである |
| **A: ROOT 直下の隠しファイル** | `hermetic` は緑(D-1)だが **`.gitignore` に新しい行が要る**。`.claude/` は既に台帳系(`paradise-daily.json`)の住処として掟が書かれており、**住所の流儀を二つに割らない**(第48条: 名の出所は一つ) |
| **G: `graph/kg-store/` の下** | `hermetic` は緑だが、`.gitignore` の当該行には「**KG の中身はそもそも追跡してはならない**」という長い裁定文が付いている。畳みの台帳は KG ではない。**他人の裁定文の庇護下に間借りしない** |
| **F: 仮倉(`os.tmpdir()`)** | `hermetic` は最も安全(○ sandbox)だが、**CI の段をまたいで読めない**。P-1 は「Self-test 段で刻み、Census 段で読む」ことが本体である。仮倉は段をまたぐ保証を持たない |
| **版管理下に置く(追跡する)** | 走行のたびに書き換わる**走行状態**であって原本ではない。`.gitignore` の既存の裁定文が `paradise-daily.json` について全く同じ理由を述べている ——「並行PRでは必ず衝突し、手で解決する術が無い」 |

### 1.4 `abode.js` を通すか — 第58条の本文を引いて判断する

第58条(a) の本文:

> **住所を作れる場所は一つである。** `os.homedir()` も `~` の展開も `CLAUDE_CONFIG_DIR` も、
> `graph/abode.js` の外に現れてはならない。散らばった住所は移した瞬間に嘘になる。
> 門はソースを走査し、**行を名指して**咎める。

この禁則が `.claude` の綴りにも及ぶことを、**複製の倉で実測した**(道具 `raw/d8-abode-address.js`):

```
$ node reform/gate-fold/raw/d8-abode-address.js
A: path.join(ROOT, ".claude", "…") — .claude を綴る
    exit=1  fold.js を名指した行: ["graph/fold.js:5  const LEDGER = path.join(ROOT, '.claude', 'paradise-fold-ledger.jsonl');"]
B: abode.resolve() を通して住処を得る
    exit=1  fold.js を名指した行: (なし)
C: ROOT 直下の隠しファイル(.claude を綴らない)
    exit=1  fold.js を名指した行: (なし)
D: os.homedir() を直に呼ぶ(禁じ手の対照)
    exit=1  fold.js を名指した行: ["graph/fold.js:6  const LEDGER = path.join(os.homedir(), '.paradise-fold-ledger.jsonl');"]
E: graph/kg-store/ の下(既に gitignore 済みの倉)
    exit=1  fold.js を名指した行: (なし)
```

> ⚠️ **exit=1 は全ケースで出ているが、それは fold.js のせいではない。**
> 複製の倉そのものが `✗ 兄弟倉の住処が楽園と一致しない (2 件)` / `✗ 門が己の測る対象を汚している (4 件)`
> で既に赤い(基準の実測 `raw/d8-abode-baseline.txt`)。**裁定の所在は「fold.js を名指した行」で読む。**
> **測れなかったことを緑と混同しない**(第37条)。

**判定: `abode.js` を通す(案 B)。** 案 A は `HOMEDIR_PATTERNS` の第4項
(`/path\.(join|resolve)\s*\([^)]*['"`]\.claude['"`]/` — `abode.js:701`)に当たり、**行を名指されて赤くなる**。

ゆえに `fold.js` の住所は:

```js
// graph/fold.js
const abode = require('./abode.js');
const LEDGER = process.env.PARADISE_FOLD_LEDGER || abode.pathFor('foldLedger');
```

`graph/abode.js` 側は `resolve()` の返り値に `foldLedger` を 1 欄足す
(既存の `dailyLedger` と**同じ行の隣**。`abode.js:~122` の `resolve()` 内)。
先例は `graph/daily-guard.js:35` である:

```js
const LEDGER = process.env.PARADISE_DAILY_LEDGER || abode.pathFor('dailyLedger');
```

**env の逃げ道(`PARADISE_FOLD_LEDGER`)を持つのは、門が現物を汚さずに台帳を撃てるようにするためである**
(NFR-03 / AC-24。第62条(b)「住所を振り替える門は、振替を壊す変異を見ない」——
この盲点は AC-27 の③で名乗る)。

### 1.5 なぜ JSONL か / なぜ錠が要るか

- **JSONL(追記)**: NFR-04 / AC-25 が並列度 2/4/8 で 30 試行を要求する。
  JSON 配列は **read-modify-write** を強いるので TOCTOU が構造的に生まれる。
  第62条の実測が「`record` の TOCTOU は並列度 2/4/8 のすべてで 100% 破れた」と言っている。
  `appendFileSync` の 1 回呼びは、1 行が PIPE_BUF 以下であれば原子的に近い。
  **だが「近い」は保証ではない** —— ゆえに錠を併せて持つ。
- **`.lock`**: `.gitignore` に `paradise-daily.json.lock` の先例が既に在る。同じ流儀に揃える。

### 1.6 `.gitignore` に足す 2 行(`.gitignore:40` 付近 / `paradise-daily.json` の隣)

```gitignore
# ── 畳みの走行台帳も追跡しない (reform/gate-fold / 第58条) ─────────────
#
# 領収書は**一回の CI 走行の中でだけ有効な走行状態**であって原本ではない。
# 走るたびに追記され、並行PRでは必ず衝突し、手で解決する術が無い ——
# 直上の `paradise-daily.json` を追跡しない理由と全く同型である。
# 台帳が無ければ fold は `bail=no-receipt` を名乗って全走する。
# それは欠損ではなく初期状態である(AC-08)。
.claude/paradise-fold-ledger.jsonl
.claude/paradise-fold-ledger.jsonl.lock
```

---

## 2. 鍵の算法

### 2.1 決定 — 材料の具体名

```
KF = ( tests/**/*.js
     ∪ graph/**/*.js
     ∪ graph/*.json                      (1 階層のみ。abode.json / domains.json)
     ∪ overlay/vendor/archify/**         (借り物の描画器。Atlas の裁定を左右する)
     ∪ .github/workflows/*.yml           (段が変われば「同じ入力」ではない)
     ) ∖ derived.js が宣言する生成物
  ⊕ 住処の正規化された mode              (abode.resolve().mode)
  ⊕ PARADISE_ARCHIFY の値
```

鍵の綴り(安定した算法。順序に依らないよう **ファイル名でソートしてから**混ぜる):

```
sha256( for f in sorted(KF): f + "\0" + sha256(contents(f))
        + "PARADISE_ABODE=" + abode.resolve().mode + "\0"
        + "PARADISE_ARCHIFY=" + (env ?? "") + "\0" )[0..16]
```

### 2.2 生成物を実際に調べて列挙した(第29条)

`derived.js` の宣言を正典として読んだ(`raw/d9-key-final.txt`):

```
$ node reform/gate-fold/raw/d9-key-final.js
derived.js が宣言する生成物(= 鍵に入れてはならない):
   CONSTITUTION.INDEX.md
   graph/lessons.json
   dashboard/state.json
   dashboard/state.js
   graph/identity/catalog.json
   .claude/settings.json
```

**このうち `graph/lessons.json` が KF の素朴な綴り(`graph/*.json`)に入る。**
`d2-keycost.txt` の実測:

```
K3 に入る graph/*.json の実名: [ 'graph/abode.json', 'graph/domains.json', 'graph/lessons.json' ]
```

第29条は明文で言う ——「**31 lessons in the repository, 0 after CI regenerates, 1682 lines gone**」。
`lessons.json` を鍵に入れれば、**CI が export し直した瞬間に鍵が動き、畳みが永久に効かなくなる**
(偽の緑ではなく、機構が無言で死ぬ)。ゆえに **`derived.js` の宣言で機械的に除く**。
名簿を写経しない —— 写経すれば次に生成物が増えた日に黙って壊れる(第44条)。

### 2.3 鍵の計算が何秒か — 測った

```
$ node reform/gate-fold/raw/d9-key-final.js
KF (確定案): tests+graph(js/json)+archify+workflows − 生成物
    材料 135 本 / 4.47 MiB / 鍵 17bef4090f5ae264
    計算 中央 8.5ms (最小 7.1 / 最大 10.3)
KF−archify (借り物を鍵から外した場合)
    材料 67 本 / 2.29 MiB / 鍵 118c8d8b5561a5e8
    計算 中央 3.4ms (最小 3.2 / 最大 4.0)
KF+overlay 全部
    材料 216 本 / 4.80 MiB / 鍵 eec6238e8d7a9cd2
    計算 中央 10.1ms (最小 9.8 / 最大 10.8)

鍵の計算の代 ≒ 7ms。P-1 の取り分 843,000ms に対し 0.0008%
```

**8.5ms。P-1 の取り分 843.0s の 0.001% である。畳みの取り分を食い潰さない。**
1 CI で鍵を採るのは高々 5 回(Self-test / Census / Abode-repo / Abode-global / Atlas)なので、
総計 **43ms**。第38条の物差しで無視できる。

### 2.4 `overlay/vendor/archify/` を鍵に入れる理由

入れると材料は 67→135 本、代は 3.4→8.5ms になる(+5.1ms)。それでも入れる:

- **§4.2 Jest #8702 の事故がこれである。** 鍵に依存グラフの根(manifest / lockfile 相当)が無かったため、
  CI が失敗を取り逃した。楽園の Atlas の裁定は **描画器 `archify` の版が変われば変わる**。
- **§2.5 Chromatic は明文で「to avoid false positives, we re-capture everything」と言う。**
  疑わしきは畳まない(揟7)。
- 代は **5.1ms**。取り分 843,000ms との比は 0.0006%。**入れない理由が無い。**

### 2.5 `.github/workflows/*.yml` を鍵に入れる理由

CI の段が変われば「同じ入力の走行」という前提そのものが変わる。
本設計は **§5 で tribunal.yml の 3 箇所を書き換える**。段を書き換えた PR で、
書き換え前の領収書が畳みに使われたら、それは第37条の「検めなかったものを通過と呼ぶ」である。

### 2.6 住処は **生の env ではなく `resolve().mode`** を入れる(本節で最も重い決定)

D-9 の素朴な実装(生の env)の実測:

```
AC-05 の実測: 素="17bef4090f5ae264" / repo="b7c61f2b13b055cd" / global="3bb9a6fa294a65eb"
   repo == global ? false
```

**AC-05 は満たされる。だが素と repo も別の鍵になっている。** これは致命的である ——
findings §1.2 が **59,027 バイトの出力が 1 バイトも違わない**ことを md5 で実測したのに、
鍵が違えば **Self-test 段の領収書で Abode(repo) 段を畳めない**。P-1 の取り分 843.0s のうち
420s(Abode-repo の分)が丸ごと消える。

`abode.resolve()` を通したときの実測(`raw/d10-abode-normalize.txt`):

```
$ node reform/gate-fold/raw/d10-abode-normalize.js
PARADISE_ABODE=(未設定)  →  raw=""        resolve().mode="repo"    source="default"
PARADISE_ABODE=repo      →  raw="repo"    resolve().mode="repo"    source="env"
PARADISE_ABODE=global    →  raw="global"  resolve().mode="global"  source="env"
```

**`resolve().mode` を鍵に入れれば、素と repo は同じ鍵になり、global だけが別になる。**
これは AC-05(「`=repo` と `=global` の鍵は異なる」)と findings §1.2 の**両方**を同時に満たす唯一の形である。

> ⚠️ **但し書き(第16条)**: これは「素 ≡ repo」を**鍵の側で宣言している**のであって、
> **測定ではない**。根拠は findings §1.2 のローカル実測だけであり、**CI runner では未測定**(§8-1 の U-1)。
> ゆえに §5.2 で「畳む前に一度だけ両方を撃って突き合わせる段」を置く(AC-23 の門が見張る)。
> **測っていないものを緑と呼ばない。**

### 2.7 採らなかった算法

| 候補 | 採らない理由 |
|---|---|
| **git SHA を鍵にする** | **AC-03 が明文で禁じる。** `git commit --allow-empty` で SHA だけが変われば鍵も変わってしまい(偽の miss)、逆に worktree の未コミットの変更を見ない(偽の hit)。**第16条**: 名で拾って振る舞いで裁いていない |
| **`restore-keys` 型の部分一致** | findings §2.4 の GitHub Actions の仕様警告そのもの。**第16条**に反する。requirements §1.4 が既に「採らない」と裁定済み |
| **IR 指紋を鍵にする** | requirements §0.1 の但し書き ——「鍵にするのは **IR ではなく HTML のバイト列**である。IR 種数と HTML 種数が一致したことは証拠ではあるが保証ではない」。**第16条** |
| **`graph/**/*.json` を再帰で採る** | `graph/identity/catalog.json` と `graph/kg-store/` が入る。前者は**生成物**(derived.js 宣言)、後者は `.gitignore` 済み。1 階層に限れば構造的に避けられる |
| **鍵に「前回の結果」を含める** | findings §2.3 pytest `--lf` の形。**第56条(d)**「緑の根拠になるのは引数無しの全走だけ」。結果は鍵ではなく**領収書の `exit` 欄**で見る(FR-03 / AC-07) |

---

## 3. どの engine に住まわせるか

### 3.1 決定

**新しい `graph/fold.js` を作る。** `fold-key` / `fold-status` の CLI もここに置く(§8-4 の申し送りへの答え)。

```
graph/fold.js
  ├─ 輸出: key(opts) / keyExplain(opts) / append(receipt) / find(key) / read() / status()
  ├─ CLI : node graph/fold.js fold-key --explain     (AC-06)
  │        node graph/fold.js fold-status --json     (AC-17)
  └─ 住所: abode.pathFor('foldLedger')               (§1.4)
```

### 3.2 なぜ新 engine か / 既存に入れないか

| 候補 | 採らない理由 |
|---|---|
| **`census.js` に入れる** | Abode(両居)段と Self-test 段も畳みを使う。census に入れれば **atlas.js が census.js を require する**ことになり、内の辺が意味不明になる(第48条: 結線は対象の形が決める) |
| **`abode.js` に入れる** | abode は**住処を知る唯一の器**(第58条)。畳みの判断を混ぜれば、`selfAudit()` が掛ける禁則の射程が曖昧になる。**器の職務を一つに保つ** |
| **`atlas.js` に入れる** | Atlas の畳み(P-2)だけなら足りるが、P-1(自己診断)が住めない |
| **`hermetic.js` に入れる** | hermetic は**裁く門**であって機構ではない。裁かれる側が裁きの器に住めば第54条(d) |

**3 者(paradise.test.js / census.js / atlas.js)が同じ鍵と同じ台帳を使う以上、住処は一つでなければならない**
(第48条 / 第58条と同じ形の論)。

### 3.3 孤児にならない結線を実測で示す

`wiring.js check` を**複製の倉**で段階的に撃った(道具 `raw/d4-wiring-orphan.js`、生出力 `raw/d4-wiring-orphan.txt`):

```
$ node reform/gate-fold/raw/d4-wiring-orphan.js
── 0: 複製したまま(基準)──
    engine 38 / 内の辺 72
    ✓ 門 25 本すべてに走らせる者が居る (第44条)
    ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
    exit=0
── 1: graph/fold.js を足す。require する者ゼロ / どの面も名を呼ばない ──
    engine 39 / 内の辺 72
    🔴 孤児 1: fold
    ✓ 門 25 本すべてに走らせる者が居る (第44条)
    🔴 結線が破れている
    exit=1
── 2: tests/fold.test.js も足す。CI にも統べる試験にも無い ──
    engine 39 / 内の辺 72
    🔴 孤児 1: fold
    🔴 孤児の門 1:
    tests/fold.test.js — 建てられているが、CI も paradise.test.js も走らせない
    🔴 結線が破れている
    exit=1
── 3: CI に `node tests/fold.test.js` の段を足す(門の結線のみ)──
    engine 39 / 内の辺 72
    🔴 孤児 1: fold
    ✓ 門 26 本すべてに走らせる者が居る (第44条)
    🔴 結線が破れている
    exit=1
── 4: census.js が ./fold.js を require する(engine の結線)──
    engine 39 / 内の辺 73
    ✓ 門 26 本すべてに走らせる者が居る (第44条)
    ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
    exit=0
```

**判定(第44条 / 第48条)**:

1. **engine の孤児**は CI の段では消えない(ケース 3 が赤のまま)。
   消すには **`require` されること**が要る(ケース 4 で緑)。
2. **門の孤児**は CI の段で消える(ケース 2→3)。
3. ゆえに build 相は **両方**を同じ変更で結線せねばならない。

> ⚠️ **`wiring.map(root)` / `wiring.gates(root)` を信じてはならない**(本相で踏んだ罠)。
> `wiring.js:32` が `GRAPH = __dirname` を握るので、**引数の倉を無視して現物の `graph/` を読む**。
> 最初の測定はこれで「孤児 0」という誤った答えを出した。
> **複製の倉で CLI を撃つ形に直した**(第16条: 輸出の形ではなく、実際に走る命令の答えを読む)。

### 3.4 結線の設計

| 呼び手 | 呼び方 | 何のために |
|---|---|---|
| `graph/census.js` | `require('./fold.js')` | FR-04(台帳を読む)。**これが engine の孤児を消す辺である** |
| `graph/atlas.js` | `require('./fold.js')` | FR-06(成果物ハッシュで畳む) |
| `tests/paradise.test.js` | `require(path.join(DIR,'..','graph','fold.js'))` | FR-01(領収書を刻む)/ FR-05 |
| `.github/workflows/tribunal.yml` | `node tests/fold.test.js` | 第44条(b)。門の孤児を消す |

---

## 4. `tests/paradise.test.js` の絞り込み塊との共存

### 4.1 先に AC-16 の門が何を数えているかを確かめた

`tests/paradise.test.js:10679-10703` を読んだ。門は**構文木を歩かない。綴りを数える**:

```js
const block = src.slice(ss[0].index, ee[0].index);          // :10694
const hits = block.match(/process\.env/g) || [];            // :10700
assert.strictEqual(hits.length, 0,                          // :10701
  `絞り込み塊が process.env を ${hits.length} 箇所読んでいる — census が env を継承する以上これは第22条違反`);
```

塊の境は `:32`(`// >>> gate-filter: 絞り込み塊 ここから`)と `:132`(`// <<< … ここまで`)。
`skip()` の docblock(`:97-100`)が自ら警告している ——
「**その禁則は註釈にも及ぶ。門は塊の中の綴りを数えるのであって、構文木を歩かない**」。

### 4.2 5 つの置き場所を実際に撃って裁定を得た

道具 `raw/d3-nofold-placement.js`(自分の写しを `tests/` に置いて子プロセスで撃ち、必ず消す。
手口は `paradise.test.js:10825` の F-1 門と同形)。生出力 `raw/d3-nofold-placement.txt`:

```
$ node reform/gate-fold/raw/d3-nofold-placement.js
現物の改行: CRLF
絞り込み塊: 行 32 〜 132

V0: 素(何も足さない) — 基準
    注入=★当たらなかった  exit=0
    ✓ gate-filter: 絞り込みは環境変数を読まない
V1: 塊の内側(GATE の返り値)で env を読む
    注入=あり  exit=1
    ✗ gate-filter: 絞り込みは環境変数を読まない
      絞り込み塊が process.env を 1 箇所読んでいる — census が env を継承する以上これは第22条違反
V2: 塊の内側の**註釈**に env の綴りを書くだけ
    注入=あり  exit=1
    ✗ gate-filter: 絞り込みは環境変数を読まない
      絞り込み塊が process.env を 1 箇所読んでいる — census が env を継承する以上これは第22条違反
V3: 塊の**外・前**(CURRENT_GATE の直後)で env を読む
    注入=あり  exit=0
    ✓ gate-filter: 絞り込みは環境変数を読まない
V4: 塊の**外・後**(終了マーカーの直後)で env を読む
    注入=あり  exit=0
    ✓ gate-filter: 絞り込みは環境変数を読まない
```

> ⚠️ 本相で踏んだ罠を記す: 最初の測定は **V1〜V4 すべてで「注入=なし」**を出した。
> 原因は **`tests/paradise.test.js` が CRLF である**ことで、`'\n'` を含む置換文字列が一つも当たらなかった。
> **当たらなかった注入で「衝突しない」と結論しかけた** —— 第37条の「検めなかったものを通過と呼ぶ」そのものである。
> 道具に「注入が当たったか」の欄を足して初めて見えた。**故障注入は当たったことを確かめてから読め。**

### 4.3 決定

**`PARADISE_NO_FOLD` は絞り込み塊の外・後(`:132` の直後)で読む。**

```js
// tests/paradise.test.js:133 付近(終了マーカー :132 の直後)
/**
 * **畳みの出口**(requirements §5 / AC-18)。
 *
 * ⚠️ **この宣言は絞り込み塊(:32-132)の外に住まねばならない。**
 * 塊は環境変数を一つも読めず、**その禁則は註釈にも及ぶ** ——
 * 門「gate-filter: 絞り込みは環境変数を読まない」(:10679)は塊の中の
 * `process.env` の**綴りを数える**のであって、構文木を歩かない。
 * 実測: 塊の内側に置けば、コードでも註釈でも exit 1 で赤くなる
 * (design 相 D-3 / `raw/d3-nofold-placement.txt` の V1・V2)。
 *
 * ⚠️ **`typeof` で守る理由は `test()` の docblock と同じ。**
 * 塊を子プロセスへ抜き出す門(:4907「test() の失敗が必ず数に載る」)は
 * この宣言を連れて行かない。**絞り込みが無い世界でも test() は単体で正しく数える。**
 */
const FOLD = { off: process.env.PARADISE_NO_FOLD === '1' || process.argv.includes('--no-fold') };
```

**衝突しない。** V4 が exit 0 で `✓ gate-filter: 絞り込みは環境変数を読まない` を名乗ったことが証拠である。

### 4.4 `--no-fold` の旗の解釈はどこに書くか — **塊の中には書けない**

`--no-fold` は CLI 引数なので塊の中で解釈してもよいように見える。**だが書いてはならない。**
塊の中の `die()`(`:55`)は **未知の旗をすべて exit 2 で殺す**:

```js
die(`Paradise gate-filter: unknown flag ${a}`);        // :55
```

ゆえに `--no-fold` を塊の中で**受理する**必要は在る(さもなくば AC-18 が exit 2 で死ぬ)。
だが**意味づけ**(env との or)は塊の外に置く。

塊の中に足すのは **`process.env` の綴りを含まない 1 行**だけである:

```js
// tests/paradise.test.js:46 付近(--gate-list の分岐の隣)
if (a === '--no-fold') { noFold = true; continue; }
```

これは AC-19(綴り違いの旗は黙殺されない)も同時に満たす ——
`--no-fould` は既存の `die()` に落ちて exit 2 になる。

> **採らなかった案**: 「`--no-fold` を塊の外だけで見る」。
> 塊の `die()` が先に殺すので **AC-18 が exit 2 になり実現不能**である(`:55` の生ソース)。

---

## 5. CI の段の変更(`.github/workflows/tribunal.yml` / 全 537 行)

### 5.1 変更する段の一覧(行番号で名指す)

| # | 行 | 現状 | 変更 |
|---|---|---|---|
| **C-1** | `:26-27` | `⚖️ Self-test` | **名乗りを変えない。** 台帳へ刻む段として**先頭に固定**する(NFR-02 / AC-23) |
| **C-2** | `:122-123` | `🔢 Census` | `PARADISE_FOLD_LEDGER` を段の env に置く(住所を一箇所で決める) |
| **C-3** | `:137-143` | `🗺 Atlas` — 道ごとに 6 プロセス | **1 プロセスで 6 道**に改める(§6。**これをやらないと AC-11 が実現不能**) |
| **C-4** | `:274-278` | `🏠 Abode(両居)` | **2 つの段に割る**(§5.2) |
| **C-5** | (新) | — | `📒 Fold` 段を `:125` の直前に足す(第44条 (b) の結線) |
| **C-6** | `:439` | 執行官 job の 5 本目 | **触らない**(requirements §7-5。別 job / 別 runner) |

### 5.2 C-4: Abode(両居)を 2 つに割る — §8-2 の申し送りへの答え

**割る。** 理由は三つ:

1. **§8-2 が求めた直接測定が手に入る。** requirements §1.1 は `420s / 421s` を
   「**按分であって直接測定ではない**」と明記した。段を割れば `gh run view` が直接答える。
2. **P-1 の畳みの単位が段である。** `=repo` は畳み、`=global` は決して畳まない(AC-10)。
   一つの段に二つの走行が居れば、**段の秒数を見ても畳みが効いたか判らない**(第38条: 記録なき前後は比較できない)。
3. **AC-10 の門が段の env を読める。** 割らなければ `bail=undeclared-state` がどちらの走行のものか出力から判らない。

**変更後の YAML(`:274-278` を置き換える)**:

```yaml
      # ── 両居 (第2段 / 第58条(e)) ──
      # **段を二つに割った** (reform/gate-fold / requirements §8-2)。
      # 旧: 一つの段で repo と global を続けて撃っていた。だが
      #   (a) 段の秒数 841s の内訳 420s/421s は**按分であって直接測定ではなかった**
      #   (b) `=repo` は畳み `=global` は決して畳まない(AC-10)ので、
      #       一つの段に両方が居ると**畳みが効いたかを段の秒で読めない**(第38条)
      # 片方でしか緑にならないなら、それは両居ではない(第20条)—— その意味は変えていない。
      - name: 🏠 Abode(repo 自己診断)— リポジトリ内の住処で緑か (AC-53a)
        # 畳みの対象。Self-test 段(:27)と**同一入力**であることを鍵が保証する。
        # 鍵が一致しなければ `bail=key-miss` を名乗って全走する —— 畳めないことは赤ではない。
        env:
          PARADISE_FOLD_LEDGER: ${{ github.workspace }}/.claude/paradise-fold-ledger.jsonl
        run: PARADISE_ABODE=repo node tests/paradise.test.js

      - name: 🏠 Abode(global 自己診断)— 実機の住処で緑か (AC-53b)
        # **この段は決して畳まれない**(AC-10 / 揟2)。結果が `~/.claude` という
        # 宣言外の状態に依る(findings §1.3 の実測: 6 門 12 行が別の答えを出す)。
        # Bazel で言う `tags = ["external"]` である(findings §4.3)。
        # 台帳を**渡さない**のは飾りではない: 渡しても `bail=undeclared-state` で
        # 畳まれないが、**渡さないことで「畳める経路が物理的に無い」ことを段が名乗る**。
        run: PARADISE_ABODE=global node tests/paradise.test.js
```

### 5.3 C-1: Self-test 段(`:26-27`)— 台帳の住所を渡すだけ

```yaml
      - name: ⚖️ Self-test — 楽園の自己検証
        # **この段は畳まれない。畳みの根拠を作る段である**(NFR-02 / AC-23)。
        # 第56条(d):「緑の根拠になるのは引数無しの全走だけである」。
        # 1 回の CI に**素の全走が少なくとも一本**在ることを AC-23 の門が数える。
        env:
          PARADISE_FOLD_LEDGER: ${{ github.workspace }}/.claude/paradise-fold-ledger.jsonl
        run: node tests/paradise.test.js
```

> ⚠️ **この段に `--no-fold` を書かない。** 書けば `bail=disabled` を名乗り、
> 「畳まなかった」のか「畳む機構が壊れていた」のかが出力から区別できなくなる。
> 台帳が空なので `bail=no-receipt` を名乗って全走する —— **それが正しい名乗りである**(AC-08)。

### 5.4 C-2: Census 段(`:122-123`)

```yaml
      - name: 🔢 Census — 楽園が己について語る数が真実か (第22条)
        # 実測(findings §1.1 / M-3): この段の 423s のほぼ全部が
        # `census.js:123` が起こす自己診断の子プロセスである(census 自身の仕事は 3ms)。
        # Self-test 段(:27)と**同一入力**であることを鍵が保証するので、領収書を読む。
        # ⚠️ **`--no-tests` を使ってはならない**(AC-04)。M-5 が実証した罠である:
        #    exit 0 / findings 0 を出すが「README テスト数」の主張が measurable=false に落ち、
        #    第22条の旗艦の数が**黙って無検査になる**(第37条違反)。
        #    畳みは「撃たない」であって「裁かない」ではない。
        env:
          PARADISE_FOLD_LEDGER: ${{ github.workspace }}/.claude/paradise-fold-ledger.jsonl
        run: node graph/census.js check
```

### 5.5 C-5: 新しい `📒 Fold` 段(`:125` の直前に挿入)

```yaml
      - name: 📒 Fold — 畳みの機構が己の掟を守るか (FR-11 / 第56条 b)
        # ⚠️ **この行を消すと直下の Wiring 門(:152)が孤児として名指しで鳴る。**
        #    実測(design D-4): CI の段を消した複製で
        #    `🔴 孤児の門 1: tests/fold.test.js — 建てられているが、CI も paradise.test.js も走らせない`
        #    第44条(b):「建てられた門が、誰にも呼ばれていなかった」が楽園の既往症である。
        #
        # **この段は畳まない。** 畳みを見張る門が畳まれれば、第56条(b) の
        # 「門番は絞り込みの外に立つ」と同じ穴が畳みの側に開く。
        env:
          PARADISE_NO_FOLD: '1'
          PARADISE_FOLD_LEDGER: ${{ runner.temp }}/fold-gate-ledger.jsonl
        run: node tests/fold.test.js
```

> **なぜ `runner.temp` の作り物の台帳か**: この門は台帳を**壊して鳴らす**(AC-16 の
> `bail=ledger-unreadable`、AC-25 の並行追記)。**現物の台帳を壊せば、後続の段が
> 畳めなくなるどころか偽の赤を出す**(第58条(c): 門は己の測る対象を汚さない)。
> 第62条(b) の処方そのもの ——「**現物が無い機では skip を名乗り、そこでは作り物の現物で門の歯を撃て**」。

### 5.6 C-3: Atlas 段(`:137-143`)→ §6 で詳述

---

## 6. Atlas の畳みの形

### 6.1 **AC-11 は今の CI の段のままでは実現不能である**(実測で示す)

AC-11 は要求する:

> `node graph/atlas.js check --scale quick` を 6 道すべてについて **1 回の走行**で撃つと、
> **72 回でなく 32 回**のブラウザ検査が走り、名乗りは `Atlas inspect: Executed 32 out of 72 inspections (40 reused)`

だが `tribunal.yml:139-143` の生ソースは**道ごとに別プロセス**を起こす:

```yaml
        run: |
          for s in quick standard full reform counsel cartography; do
            echo "── scale: $s ──"
            node graph/atlas.js check --scale "$s"
          done
```

**一つのプロセスは 12 検査しか見えない。** 道の中に畳める対が在るかを数えた
(道具 `raw/d7-atlas-scope.js`、生出力 `raw/d7-atlas-scope.txt`):

```
$ node reform/gate-fold/raw/d7-atlas-scope.js
道ごと(= 今の CI の 1 プロセス)の中でバイト同一の対:
  quick        主題 6 / 相異なる HTML 6 / 畳める対 0
  standard     主題 6 / 相異なる HTML 6 / 畳める対 0
  full         主題 6 / 相異なる HTML 6 / 畳める対 0
  reform       主題 6 / 相異なる HTML 6 / 畳める対 0
  counsel      主題 6 / 相異なる HTML 6 / 畳める対 0
  cartography  主題 6 / 相異なる HTML 6 / 畳める対 0

全 36 組: 相異なる HTML 16 種 / 畳める組 20
  総検査 72 回 / 走らせるべき 32 回 / 畳める 40 回

★ 今の CI の走行単位(道ごとに別プロセス)で in-process に畳める検査: 0 回
★ 道を跨ぐ台帳が要る畳み: 40 回
```

**道の中では 1 回も畳めない。** 40 回すべてが道を跨ぐ。
これは当然である —— findings §1.5 が示すとおり、畳める 4 主題は「**全道で同一**」なのだから、
畳みは必ず道の境を越える。

### 6.2 二つの道と、採った方

| 案 | 内容 | 採否 |
|---|---|---|
| **X: 台帳を跨がせる** | 道ごとのプロセスが成果物ハッシュを `.claude/…` の台帳へ書き、次のプロセスが読む | **採らない** |
| **Y: 1 プロセスで 6 道を回す** | CI の段を `for` ループから 1 命令に変える | **採る** |

**案 X を採らない理由**:
- **requirements §7-6 が禁じる**: 「本改修の台帳は **1 回の CI 走行の中**でのみ有効」。
  案 X は台帳を**プロセスを跨ぐ通信路**にする。プロセス間で受け渡す成果物ハッシュは、
  findings §2.4 の security 警告(「Cache contents are not signed or verified…
  leading to malicious code execution」)が指す信頼境界を、走行の内側に作る。
- **AC-11 の名乗りが出せない。** 6 つのプロセスは 6 つの総括行を出す。
  `Executed 32 out of 72` という**一つの数**を名乗れるのは、72 を全部見た一つの走行だけである
  (第22条: 総数と実行数は別の数であり、数え直せねばならない)。
- **並行の危険を新たに生む。** NFR-04 の錠が Atlas にも要る。**畳みの取り分に見合わない。**

**案 Y が成立することを実測した**(道具 `raw/d12-atlas-onerun.js`、生出力 `raw/d12-atlas-onerun.txt`):

```
$ node reform/gate-fold/raw/d12-atlas-onerun.js
1 プロセスで 6 道 × 6 主題 = 36 図を作った: 11529ms (11.5s)
Atlas inspect: Executed 32 out of 72 inspections (40 reused)
恒等式 E + reused == N : 32 + 40 == 72 → true
相異なる成果物: 16 種

畳まれた写し元の例:
   html=d185c1ff4425b032  ← hierarchy@quick
   html=9e39a4495e7553f8  ← conclave@quick
   html=fe4450eb25974fc3  ← dispatch@quick
   html=7b0eb88b1550005e  ← dag@quick
```

**AC-11 が要求する綴りが、そのまま出た。** 恒等式(AC-15)も閉じた。
図の作成は 11.5s(M-2 の 11.9s と一致)。

### 6.3 変更後の YAML(`:137-143` を置き換える)

```yaml
      - name: 🗺 Atlas — 楽園が己の姿を図にできるか (第47条)
        # 6つの主題 × 6つの道。IR が作れることと描画器が受理することは別である。
        #
        # **道ごとの `for` ループを畳んだ**(reform/gate-fold / AC-11)。
        # 旧: `for s in …; do node graph/atlas.js check --scale "$s"; done` —— 6 プロセス。
        # 実測(design D-7): **道の中には畳める対が 1 つも無い**。
        #   quick/standard/full/reform/counsel/cartography のいずれも 相異なる HTML = 6。
        # 畳める 20 組は**すべて道を跨ぐ**(hierarchy/dispatch/run/wiring は全道でバイト同一)。
        # ゆえに 6 道を**一つの走行**で見なければ、一回も畳めない。
        #
        # 実測(design D-12): 1 プロセスで 36 図を作り、
        #   `Atlas inspect: Executed 32 out of 72 inspections (40 reused)` を実際に名乗った。
        #   恒等式 32 + 40 == 72 も閉じた(AC-15)。
        #
        # ⚠️ **検査の総数 72 は 1 つも減らない。** 減るのは「同じ成果物を二度検める」分だけである
        #    (揟8 / 第37条)。畳んだ 40 件は `(reused: html=<sha16>)` で写し元を名指す(AC-12)。
        env:
          PARADISE_FOLD_LEDGER: ${{ github.workspace }}/.claude/paradise-fold-ledger.jsonl
        run: node graph/atlas.js check --all-scales
```

### 6.4 成果物ハッシュをどこで取るか

`graph/atlas.js:1409` の `draw()` が返す `r.html` のバイト列から採る。
**`draw()` の直後・`firstScreen()` の直前**である(`atlas.js:1409` と `:1420` の間)。

```js
// graph/atlas.js:1409-1420 の間に入る形(build 相が書く)
const r = draw(subject, { ...opts, outdir, out: path.join(outdir, `${subject}.html`) });
const htmlKey = fold.artifactKey(r.html);          // sha256(bytes)[0..16]
const prior = inspected.get(htmlKey);              // この走行の中だけの写像
const fs2 = opts.skipBrowser ? { ok: true, kind: 'skipped', … }
          : prior ? { ...prior.fs2, reusedFrom: htmlKey }
          : firstScreen(r.html);
const mo  = opts.skipBrowser ? { ok: true }
          : prior ? { ...prior.mo,  reusedFrom: htmlKey }
          : motionAlive(r.html);
if (!prior) inspected.set(htmlKey, { fs2, mo, by: `${subject}@${scale}` });
```

**鍵は成果物のバイト列である。** IR でも主題名でも道名でもない(第16条 / requirements §0.1 の但し書き)。

> ⚠️ **`inspected` はこの走行のプロセス内の `Map` であって、台帳ではない。**
> P-2 は台帳を一切使わない —— 使えば §7-6 の禁を破る。
> **P-1(台帳)と P-2(プロセス内の写像)は、同じ `fold.js` に住むが別の機構である。**
> この区別が崩れれば、Atlas の裁定が CI 走行を跨いで写され、第37条違反になる。

### 6.5 写したことが見える形(AC-11 / AC-12)

裁定行(`atlas.js:1504` の `console.log`)に写し元を足す:

```
  ✓ hierarchy  [architecture] 9/9  fits          動 12   214518b (reused: html=d185c1ff4425b032)
```

総括行(`atlas.js:1509-1512` の後):

```
Atlas inspect: Executed 32 out of 72 inspections (40 reused)
```

AC-12 の判定基準がそのまま効く: `grep -c 'reused: html=' <出力>` == 畳んだ件数 == 40。

> **採らなかった形**: 「`ok` だけを写し、写し元を書かない」。
> **第21条(b)**「報告せよ **誰が名付けたか** を —— 辿れない発見は直せない発見である」。
> `hierarchy@counsel` が赤いとき、その裁定が `hierarchy@quick` の写しだと判らなければ、直せない。

---

## 7. P-3(Chrome の持ち回し)

### 7.1 決定 — 借り物には一行も触れない

`overlay/vendor/archify/bin/visual-check.mjs:721-725` は既に注入口を持つ(実測済み):

```js
export async function runVisualCheck({
  artifactPath,
  chromePath,
  resolveChrome = findChrome,
  browserFactory = async (resolvedChrome) => new ChromeVisualBrowser(resolvedChrome),
} = {}) {
```

**ゆえに書き換えは要らない。外から `browserFactory` を渡すだけである**(第20条 / requirements §7-7)。

### 7.2 `browserFactory` へ渡すもの

```js
// graph/fold.js が輸出する持ち回しの器(build 相が書く)
function pooledBrowserFactory() {
  let shared = null, real = null;
  return {
    factory: async (chrome) => {
      if (!shared) {
        real = new ChromeVisualBrowser(chrome);
        shared = new Proxy(real, { get(t, k) {
          // 持ち回すので閉じない。**閉じる責は呼び手が握る**(下の dispose)
          if (k === 'close') return async () => {};
          const v = t[k];
          return typeof v === 'function' ? v.bind(t) : v;
        } });
      }
      return shared;
    },
    // **必ず finally から呼ぶ。** 途中で投げても残骸を残さないため
    dispose: async () => { if (real) { try { await real.close(); } catch {} real = shared = null; } },
  };
}
```

### 7.3 残骸(プロファイル)を漏らさないことをどう保証するか — 測った

`close()` を無力化する以上、**誰が profileRoot を消すのか**が本節の核心である。
借り物の `close()`(`visual-check.mjs:498-521`)は 3 つを行う:

1. `cdp.failAll(..., { graceful: true })`
2. SIGTERM → 1500ms → SIGKILL のエスカレーション
3. `fs.rmSync(this.profileRoot, { recursive: true, force: true })`(`:518`)

覆いは `close()` を**無力化するだけで、消しはしない**。`__real.close()` を最後に一度呼べば
3 つすべてが走る。**それが本当に漏れないかを数えた**(道具 `raw/d6-pool-leak.mjs`、生出力 `raw/d6-pool-leak.txt`):

```
$ node reform/gate-fold/raw/d6-pool-leak.mjs
A) 成果物ごとに起動: 図 2 / 起動 2 回 / 5541ms / プロファイル残 0
   裁定: [{"図":"run.html","ok":true,"status":"pass","exit":0},{"図":"wiring.html","ok":false,"status":"fail","exit":1}]
B) browser を持ち回す:  図 2 / 起動 1 回 / 4984ms / プロファイル残 0
   裁定: [{"図":"run.html","ok":true,"status":"pass","exit":0},{"図":"wiring.html","ok":false,"status":"fail","exit":1}]

判定: 裁定の本数 2 == 2 / 各図の ok と status が一致: true
削減: 起動 2 → 1 / 時間 5541 → 4984ms (10% 減)
残骸: A=0 個 / B=0 個 (どちらも 0 でなければ P-3 は採れない)
```

**残骸 0 個。裁定の本数も各図の `ok` も完全に一致(AC-13)。**
`wiring.html` が `ok:false` であることも両方で同じ —— **持ち回しは裁定を変えない**。

保証の三段構え:

| 段 | 機構 | 根拠 |
|---|---|---|
| ① | `dispose()` を **`finally` から呼ぶ** | 途中で投げても後始末が走る。`motion-probe.mjs:141` の既存の作法と同形 |
| ② | `sweepOrphanProfiles(before)` を併用 | `motion-probe.mjs:38` が既に持つ器。「構築前に無く、構築後に在るものだけを消す」—— **他の走行の作業場を巻き込まない** |
| ③ | **既存の門 `tests/motion-probe-leak.test.js` が数える** | `:65` AC-23b が「検器 1 回の前後でプロファイル数の差が 0」を撃つ。`tribunal.yml:44` の `🧹 Motion probe leak` 段が CI で撃つ |

> ⚠️ **第50条の裏面の既往症**: `motion-probe.mjs` の註釈が記録している ——
> 「自前の半端な kill だけを呼んでいた頃は SIGTERM を無視した Chrome が生き残り、
> 一時プロファイルが 483 → 519 → 529 と単調増加した(検器 1 回で +2)」。
> **`close()` を無力化する設計は、この病を再発させうる唯一の設計である。** ゆえに ①②③ を全部掛ける。

### 7.4 `motionAlive()` はどうするか — **持ち回さない**

`atlas.js:1376-1388` の `motionAlive()` は `graph/motion-probe.mjs` を **`execFileSync` で別プロセスとして**起こす。
`motion-probe.mjs:88` は `new ChromeVisualBrowser(chrome)` を**直に**呼ぶ(`browserFactory` の注入口が無い)。

**持ち回さない。** 理由:
- 注入口を作るには `motion-probe.mjs` を書き換えることになる。**これは借り物ではない**(楽園の engine)ので
  第20条には触れないが、**P-3 の取り分は 17.2s / 0.8% しかない**(requirements §1.2)。
  `motionAlive` 側まで広げても取り分は数秒である。
- **P-2 が先に効く。** 72 検査が 32 に減った後、`motionAlive` の起動は 36→16 回になる。
  持ち回しの余地そのものが縮む(requirements §1.3 の但し書きが同じ論を述べている)。

**P-3 の射程は `firstScreen()` 経路(`atlas.js:1420`)だけ**とする。
射程の外は見逃しではなく、**次の走行の残債として名を持つ**(第62条 c)。

---

## 8. 建てる門の一覧(AC-01〜27 × 試験ファイル × CI の段)

**新しい試験ファイルは `tests/fold.test.js` ただ一つ。** CI の `📒 Fold` 段(§5.5)が撃つ。
既存の `tests/paradise.test.js` にも常駐の門を足す —— **恒等式の錠と門番は全走から離せない**(第56条 b)。

| AC | 門の名 | 住む試験ファイル | 撃つ CI の段 |
|---|---|---|---|
| **AC-01** | `fold: 全走は領収書を刻む` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-02** | `fold: 絞り込み走行は領収書を刻まない` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-03** | `fold: 鍵は中身から採る — 註釈一行で鍵が動く` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-04** | `fold: 畳んだ census は第22条を裁き続ける` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-05** | `fold: 住処の宣言は鍵に効く` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-06** | `fold: 鍵の材料は数え直せる` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-07** | `fold: 緑しか畳まない — 赤い領収書は再走を呼ぶ` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-08** | `fold: 領収書の無い畳みは存在しない` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-09** | `fold: =repo は鍵が合えば畳まれる` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-10** | `fold: 宣言外の状態に依る走行は畳まれない (揟2 / 第37条)` | **`tests/paradise.test.js`** | ⚖️ Self-test(`:27`)/ 🏠 Abode(repo)(新 `:274`)|
| **AC-11** | `fold: 畳みの鍵は成果物のバイト列である` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-12** | `fold: 写した裁定は元を名指す (第21条 b)` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-13** | `fold: 持ち回しは検査を減らさない — 裁定の本数が一致する` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-14** | `fold: 総数と実行数は別の数である (第22条 / 揟4)` | **`tests/paradise.test.js`** | ⚖️ Self-test(`:27`) |
| **AC-15** | `fold: 数が閉じる — 錠は畳みの関数の外に立つ` | **`tests/paradise.test.js`** | ⚖️ Self-test(`:27`) |
| **AC-16** | `fold: bail は閉じた語彙で名乗る (揟5)` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-17** | `fold: bail は機械可読である` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-18** | `fold: --no-fold は畳みを完全に切る (揟6)` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-19** | `fold: 綴り違いの旗は黙殺されない` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-20** | `fold: 畳みの門番は絞り込みの外に立つ` | **`tests/paradise.test.js`** | ⚖️ Self-test(`:27`) |
| **AC-21** | `fold: 何もかも畳む機構は測定ではない` | **`tests/paradise.test.js`** | ⚖️ Self-test(`:27`) |
| **AC-22** | `fold: 改修は門を減らしていない — 本数が基準を下回らない` | **`tests/paradise.test.js`** | ⚖️ Self-test(`:27`) |
| **AC-23** | `fold: 全走が一本も走らない CI は測定ではない (第56条 d)` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-24** | `fold: 台帳の番兵は汚した門を名指す` | **`tests/paradise.test.js`** | ⚖️ Self-test(`:27`) |
| **AC-25** | `fold: 台帳は並行追記で壊れない` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-26** | `fold: 記録なき前後は比較できない` | `tests/fold.test.js` | 📒 Fold(新) |
| **AC-27** | `fold: 門は己の盲点を名乗る (第62条 a)` | `tests/fold.test.js` | 📒 Fold(新) |

### 8.1 なぜ 7 本だけ `paradise.test.js` に置くか

第56条(b) が明文で命じる:

> **門番は絞り込みの外に立つ。** 選ぶ機構を見張る門が、その機構自身によって選び落とせるなら、
> それは門番ではない —— **機械が無料で緑に保つ飾りである**。

- **AC-15 / AC-20** は「**錠は `test()` の外に在る**」ことを裁く門である。
  裁く対象(錠)が `paradise.test.js` の `:10901` 相当の位置に住む以上、**門も同じファイルに居なければ写経になる**。
- **AC-10** は「`=global` を子プロセスで実際に撃って `reused` の語が現れないこと」を確かめる(requirements §3.3)。
  **`tests/fold.test.js` に置くと `📒 Fold` 段が `PARADISE_NO_FOLD=1` で走る**(§5.5)ので、
  畳みが切られた世界で「畳まれないこと」を確かめる **常に緑の門**になる。第48条(c): 常に緑の門は門ではない。
- **AC-14 / AC-21 / AC-22 / AC-24** は全走の名乗りと門の総数を読むので、全走の中に居なければならない。

### 8.2 第44条(b) の結線を同じ変更で確かめる(§8-5 の申し送りへの答え)

D-4 が実測した通り、**CI の段を足すだけでは engine の孤児は消えない**。build 相は:

1. `tests/fold.test.js` を作る → `wiring.js check` が 🔴 孤児の門
2. `tribunal.yml` に `📒 Fold` 段を足す → 門の孤児は消える。**engine はまだ孤児**
3. `census.js` / `atlas.js` / `paradise.test.js` が `fold.js` を require → 両方緑

**各段階の終わりに `node graph/wiring.js check` を撃って exit 0 を確かめる**(§9)。

---

## 9. 段階(stage)の切り方

| 段階 | 作るもの | 終わりに撃つ命令 | 緑の条件 |
|---|---|---|---|
| **S-1** | `graph/abode.js` に `foldLedger` を 1 欄 / `.gitignore` に 2 行 | `node graph/abode.js check`<br>`node graph/hermetic.js check`<br>`git status --porcelain` | abode が `fold` を名指さない / hermetic 緑 / 台帳が `??` に現れない |
| **S-2** | `graph/fold.js`(鍵・台帳・bail のみ。誰も呼ばない) | `node graph/fold.js fold-key --explain`<br>`node graph/wiring.js check` | key が出て exit 0 / **wiring は 🔴 孤児 1: fold — これが正しい**(D-4 ケース1) |
| **S-3** | `tests/fold.test.js`(AC-01/03/05/06/07/08/16/17/25/27)+ `tribunal.yml` の `📒 Fold` 段 | `node tests/fold.test.js`<br>`node graph/wiring.js check` | 門が緑 / **wiring はまだ 🔴 孤児 1: fold**(D-4 ケース3) |
| **S-4** | `paradise.test.js` に FOLD 宣言(`:133`)・`--no-fold` の受理(`:46`)・領収書の刻み・恒等式の錠 | `node tests/paradise.test.js --gate '^gate-filter:'`<br>`node tests/paradise.test.js --gate-list \| tail -1`<br>`node tests/paradise.test.js` | gate-filter 6 本すべて緑(**特に「絞り込みは環境変数を読まない」**)/ 本数 ≥ 492 / 全走緑 |
| **S-5** | `census.js` が `fold.js` を require し台帳を読む(FR-04) | `node tests/paradise.test.js --gate '^gate-filter: census'`<br>`node graph/census.js check`<br>`node graph/wiring.js check` | **census の呼び口の門が緑**(D-11)/ census 緑 / **wiring が初めて exit 0** |
| **S-6** | `paradise.test.js` に AC-10/14/15/20/21/22/24 の常駐の門 | `node tests/paradise.test.js`<br>`node tests/paradise.test.js --gate-list \| tail -1` | 全走緑 / 本数が 492 + 足した本数 |
| **S-7** | `atlas.js` の `--all-scales` と成果物ハッシュの畳み(P-2)+ `tribunal.yml:137-143` | `node graph/atlas.js check --all-scales`<br>`node graph/atlas.js check --scale quick` | `Executed 32 out of 72 inspections (40 reused)` / 恒等式 / 単道も従来どおり緑 |
| **S-8** | `fold.js` の `pooledBrowserFactory`(P-3)+ `atlas.js:1420` の結線 | `node graph/atlas.js check --all-scales`<br>`node tests/motion-probe-leak.test.js` | 裁定が S-7 と一字一句同じ / **プロファイル残 0** |
| **S-9** | `tribunal.yml:274-278` を 2 段に割る / 全段の env | `node graph/wiring.js check`<br>`node graph/hermetic.js check`<br>`node graph/census.js check`<br>`node tests/paradise.test.js` | 四つとも exit 0 |
| **S-10** | CI で一度走らせ、AC-26 の前後を記録 | `gh run view <id> --json jobs` | **push の run どうしで比較**(M-6 の但し書き)/ 2,070s → 1,047.5s 以下 |

> ⚠️ **S-2 と S-3 で `wiring.js check` が赤いのは正常である。** 赤くなければ D-4 の実測と食い違う ——
> そのときは孤児判定が壊れている(**偽の緑**)。**赤を期待する段階を明記するのが第37条の作法である。**

### 9.1 S-5 が最も危うい段階である(D-11 が実証した)

`census.js` の呼び口は門「`gate-filter: census は自己診断を素で呼ぶ`」(`paradise.test.js:10704`)が
**ソースを静的に読んでいる**。三つの案を複製の倉で撃った(生出力 `raw/d11-census-arity.txt`):

```
$ node reform/gate-fold/raw/d11-census-arity.js
── 0: 素の census.js(基準)──
    exit=0   ✓ gate-filter: census は自己診断を素で呼ぶ
── A: 呼び口を三項で条件づける(引数 1 個のまま)──
    exit=0   ✓ gate-filter: census は自己診断を素で呼ぶ
── B: 自己診断に `--no-fold` を引数で渡す(引数 2 個)──
    exit=1   ✗ gate-filter: census は自己診断を素で呼ぶ
      census.js が自己診断に 2 個の引数を渡している — 絞り込みが census に漏れ込んでいる (第22条)
── C: 呼び口を 2 箇所に増やす ──
    exit=1   ✗ gate-filter: census は自己診断を素で呼ぶ
      census.js の自己診断呼び口が 2 箇所ある — 一箇所を見張っても意味が無い
```

**決定: 案 A のみ採る。**

```js
// graph/census.js:123 付近。**呼び口は 1 箇所 / 引数は 1 個**のまま
const receipt = fold.find(fold.key());               // 鍵の一致する緑の領収書 or null
const out = receipt ? receipt.summaryRaw
  : execFileSync(process.execPath, [path.join(ROOT, 'tests', 'paradise.test.js')],
      { encoding: 'utf8', cwd: ROOT, timeout: TIMEOUT_MS });
tests = summaryOf(out);
```

**`tests = summaryOf(out)` を通ることが AC-04 の核心である。**
`c.tests` が `null` にならないので `measurable()` は真を返し、
**「README テスト数」の主張は裁かれ続ける**。M-5 が実証した `--no-tests` の罠を構造的に回避する:

```
$ node -e "const c=require('./graph/census.js'); const a=c.check({runTests:false});
           console.log(a.ok, a.findings.length)"
true 0                                    ← findings 0 だが README テスト数は measurable=false
```

畳みは「**撃たない**」であって「**裁かない**」ではない(requirements AC-04)。

---

## 10. 危険と回避

| # | 危険 | なぜ起きうるか | 対応する門 |
|---|---|---|---|
| **R-1** | **鍵の漏れ → 偽の緑** | findings §4.2 Jest #8702 の実在の事故。鍵に依存の根が無ければ「壊れているのに畳む」 | **AC-03**(註釈一行で鍵が動く)/ **AC-06**(`fold-key --explain` を diff できる) |
| **R-2** | **赤・打ち切りを畳む** | findings §4.1 Tuist #8570。鍵が content hash だけで結果を見なかった | **AC-07**(`bail=not-green` / `bail=truncated`) |
| **R-3** | **`=global` が畳まれる** | 鍵に住処が入らなければ、6 門の赤が repo の緑で上書きされる(findings §1.3) | **AC-10**(**子プロセスで実際に撃って `reused` の語が出ないことを確かめる** — 設定ではなく走行を読む) |
| **R-4** | **畳みが何もかも畳む** | 鍵の比較を `true` に潰す一行 | **AC-21**(故障注入した写しを子プロセスで撃つ) |
| **R-5** | **門番が絞り込みで消える** | 第56条の既往症。`--gate-not '^fold:'` で門番ごと消える | **AC-15 / AC-20**(**錠は `test()` の外**。`:10901` の恒等式の錠と同じ位置) |
| **R-6** | **台帳が壊れていても静かに全走する** | `bail=no-receipt` と `bail=ledger-unreadable` を混同 | **AC-16**(**ディレクトリに置き換えて exit 1**。第62条 b ①: 読めないは skip ではなく赤) |
| **R-7** | **並行追記で領収書が落ちる** | 第62条の実測: TOCTOU は並列度 2/4/8 で 100% 破れ、114 門が黙った | **AC-25**(**複数プロセスで撃つ**。単一プロセスの門は競合を見ない) |
| **R-8** | **門が台帳を汚し、後続の段が偽の赤を出す** | `tests/fold.test.js` が台帳を壊して鳴らす | **AC-24** + §5.5 の `PARADISE_FOLD_LEDGER=${{ runner.temp }}/…`(作り物の台帳で歯を撃つ。第62条 b) |
| **R-9** | **【本設計が新たに生む】`close()` の無力化がプロファイルを漏らす** | `motion-probe.mjs` の既往症(検器 1 回で +2 / 483→529 に単調増加) | **AC-13** + **既存の `tests/motion-probe-leak.test.js:65`**(`tribunal.yml:44` の `🧹 Motion probe leak` 段が撃つ)/ D-6 で残骸 0 を実測済み |
| **R-10** | **【本設計が新たに生む】Atlas を 1 プロセスにしたので、1 主題の失敗が 6 道分を巻き込む** | `for` ループなら道ごとに独立していた。1 プロセスなら `draw()` の例外が全体を落としうる | `atlas.js:1455` の `catch` が既に主題ごとに閉じている(`rows.push({..., ok:false})`)。**`--all-scales` でも道ごとに同じ `catch` を通すことを S-7 で確かめる**(`--scale quick` 単体が従来どおり緑であること) |
| **R-11** | **【本設計が新たに生む】`abode.js` に欄を足すことが第58条の除外を広げる** | `HOMEDIR_EXCLUDE_MAX = 1`(`abode.js:716`)/ `EXCLUSION_EVIDENCE`(`:720`) | **欄を足すだけで除外は増えない**(除外はファイル単位)。S-1 で `node graph/abode.js check` が `除外 1 件: graph/abode.js` のままであることを確かめる |
| **R-12** | **【本設計が新たに生む】CI の段を変えたので鍵も変わり、初回は必ず全走する** | KF に `.github/workflows/*.yml` を含めた(§2.5) | **これは正しい振る舞いである。** `bail=key-miss` を名乗る。AC-26 の前後比較は**段の変更が入った後の 2 回**で行う |
| **R-13** | **【本設計が新たに生む】U-1(CI runner で 素 ≡ repo)が未測定のまま畳む** | §2.6 が `resolve().mode` で「素 ≡ repo」を**宣言**した。実測はローカルのみ | §5.2 で段を割ったので、**初回の CI で Self-test 段と Abode(repo)段の両方が全走し、領収書が 2 行刻まれる**。その 2 行の `summary` が一致することを AC-26 の記録が示す。**一致しなければ畳みを止める**(第37条) |

### 10.1 AC-27 が要求する盲点の名乗り(3 つ)

`tests/fold.test.js` の各門に書き、AC-27 の門がソースを静的に読んで空欄を赤にする:

| 盲点 | 本設計での答え |
|---|---|
| **① 単一プロセスか** | **AC-01〜AC-24 は単一プロセスで撃つ → 競合を見ない。** 補うのは AC-25 のみ(並列度 2/4/8 × 30 試行)。第62条: 「誰も二つのプロセスを同時に起こさなかった」 |
| **② `require.cache` を捨てるか** | **捨てる**(故障注入した写しを子プロセスで撃つ形)→ **モジュール大域を見ない**。`fold.js` の最上位に可変の大域(`let LEDGER_CACHE` 等)が生えても振る舞いに現れない日がある。補うのは **AC-21 の静的な読み**(第62条 c) |
| **③ 環境変数で住所を振り替えるか** | **振り替える**(`PARADISE_FOLD_LEDGER`)→ **振替を壊す変異を見ない**。第62条の実測 W1:「住所解決を壊した変異は門の防御を素通りして現物の台帳に 14 行を書いた」。補うのは **AC-24 の番兵**(現物の指紋を毎門で照合し、汚した門を名で呼ぶ) |

---

## 11. requirements の AC に対する所見

**変えるべき AC は無い。** ただし 2 本について、**実現の前提が requirements に書かれていなかった**ことを記す。
どちらも AC の文言は満たせるので、AC の改定ではなく **design の裁定**として扱う。

| AC | 書かれていなかった前提 | 本設計の答え |
|---|---|---|
| **AC-11** | 「6 道すべてについて **1 回の走行**で撃つ」と書かれていたが、**現状の CI は道ごとに別プロセス**である(`tribunal.yml:139-143`)。道の中に畳める対は **0 件**(D-7) | §6.3 で CI の段を 1 プロセスに改める。D-12 で `Executed 32 out of 72 inspections (40 reused)` を実際に出した。**AC は変えない** |
| **AC-05** | 「`PARADISE_ABODE=repo` と `=global` の鍵は異なる」だけが書かれており、**素と `=repo` の鍵が同じでなければならない**ことが書かれていない。生の env を鍵にすると AC-05 は満たせるが **P-1 の取り分が 420s 減る**(D-9 / D-10) | §2.6 で `abode.resolve().mode` を鍵に入れる。AC-05 は満たしたまま、findings §1.2 の「素 ≡ repo」も満たす。**AC は変えない** |

---

## 12. 変更するファイルの一覧(パスと行番号)

| ファイル | 行 | 何をするか |
|---|---|---|
| `graph/abode.js` | `:122` `resolve()` 内 | 返り値に `foldLedger` を 1 欄足す(`dailyLedger` の隣) |
| `graph/fold.js` | **新規** | 鍵・台帳・bail・`fold-key` / `fold-status` CLI・`pooledBrowserFactory` |
| `graph/census.js` | `:123` 付近 | 三項で領収書を読む(**呼び口 1 箇所 / 引数 1 個を保つ** — D-11) |
| `graph/atlas.js` | `:1409-1420` の間 | 成果物ハッシュで `firstScreen` / `motionAlive` を畳む |
| `graph/atlas.js` | `:1499-1515` | `--all-scales` と `Atlas inspect:` の総括行 |
| `graph/atlas.js` | `:1420` | `firstScreen` に `browserFactory` を通す(P-3) |
| `tests/paradise.test.js` | `:46` 付近 | `--no-fold` を受理する 1 行(**`process.env` の綴りを含めない**) |
| `tests/paradise.test.js` | `:133`(`:132` の直後) | `FOLD` 宣言。**絞り込み塊の外**(D-3 の V4) |
| `tests/paradise.test.js` | `:10901` 付近 | 畳みの恒等式の錠(**`test()` の外**。既存の錠の隣) |
| `tests/paradise.test.js` | `:10841` の前 | AC-10/14/15/20/21/22/24 の常駐の門 7 本 |
| `tests/fold.test.js` | **新規** | AC-01〜27 のうち 20 本 |
| `.github/workflows/tribunal.yml` | `:26-27` | Self-test 段に `PARADISE_FOLD_LEDGER` の env |
| `.github/workflows/tribunal.yml` | `:122-123` | Census 段に同 env |
| `.github/workflows/tribunal.yml` | `:125` の直前 | `📒 Fold` 段を新設 |
| `.github/workflows/tribunal.yml` | `:137-143` | Atlas 段を `--all-scales` の 1 命令に |
| `.github/workflows/tribunal.yml` | `:274-278` | Abode(両居)を 2 段に割る |
| `.gitignore` | `:40` 付近 | 台帳と錠の 2 行(`paradise-daily.json` の隣) |

**`overlay/vendor/` は一行も変えない**(第20条)。

---

## 13. 現物を汚していないことの証明

本相は `reform/gate-fold/raw/` の下と `$LOCALAPPDATA/Temp` にしか書いていない。
使い捨ての写しは `tests/` に置いた瞬間に `finally` で消している
(手口は `paradise.test.js:10825` の F-1 門と同形)。

```
$ git status --porcelain
?? reform/gate-fold/
```

`reform/gate-fold/` 以外は一つも汚れていない。

参考(候補地にダミーを置いた前後):

```
$ echo '{"probe":1}' > .claude/paradise-fold-ledger.jsonl && git status --porcelain
?? .claude/paradise-fold-ledger.jsonl
?? reform/gate-fold/
$ rm -f .claude/paradise-fold-ledger.jsonl && git status --porcelain
?? reform/gate-fold/
```

---

## 付録: 本相で撃った命令と生出力の住所

| 命令 | 生出力 | 何を確かめたか |
|---|---|---|
| `node reform/gate-fold/raw/d1-ledger-hermetic.js` | `raw/d1-ledger-hermetic.txt` | 台帳の候補地 8 つの hermetic 裁定 |
| `node graph/hermetic.js check`(ダミー設置下) | §1.2 本文 | **候補地にダミーを置いても緑** |
| `git -c core.excludesFile=<候補> check-ignore -v …` | §1.2 本文 | `.gitignore` の綴りが効く |
| `node reform/gate-fold/raw/d2-keycost.js` | `raw/d2-keycost.txt` | 鍵の材料の候補ごとの代 |
| `node reform/gate-fold/raw/d3-nofold-placement.js` | `raw/d3-nofold-placement.txt` | **塊の内側は註釈でも赤 / 外なら緑** |
| `node reform/gate-fold/raw/d4-wiring-orphan.js` | `raw/d4-wiring-orphan.txt` | **孤児は require で初めて消える** |
| `node reform/gate-fold/raw/d6-pool-leak.mjs` | `raw/d6-pool-leak.txt` | **持ち回しの残骸 0 / 裁定一致** |
| `node reform/gate-fold/raw/d7-atlas-scope.js` | `raw/d7-atlas-scope.txt` | **道の中では 0 回しか畳めない** |
| `node reform/gate-fold/raw/d8-abode-address.js` | `raw/d8-abode-address.txt` / `d8-abode-baseline.txt` | **`.claude` の綴りは第58条(a)で行を名指される** |
| `node reform/gate-fold/raw/d9-key-final.js` | `raw/d9-key-final.txt` | 確定した鍵の代 8.5ms / AC-03・AC-05 |
| `node reform/gate-fold/raw/d10-abode-normalize.js` | `raw/d10-abode-normalize.txt` | **`resolve().mode` だけが素≡repo と repo≠global を両立する** |
| `node reform/gate-fold/raw/d11-census-arity.js` | `raw/d11-census-arity.txt` | **census の呼び口は三項なら通る / 引数増・口増は赤** |
| `node reform/gate-fold/raw/d12-atlas-onerun.js` | `raw/d12-atlas-onerun.txt` | **AC-11 の綴りを実際に出した** |
| `node graph/wiring.js check` | §3.3 / `raw/d4-*.txt` | 基準は `engine 38 / 門 25` で exit 0 |
| `node tests/paradise.test.js --gate-list \| tail -1` | `Paradise gate list: 492 gates` | NFR-01 の基準値 |
| `node graph/codex.js article 16/20/21/22/29/34/37/38/44/48/56/58/62` | 掟の全文 | 各決定の根拠 |
