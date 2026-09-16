# security 相 — reform 走行『route-misfire』

> 走行: `reform/route-misfire` / ブランチ `reform/route-misfire`
> 対象: `graph/forge.js`(道選び)・`graph/workspace.js`(倉の判定と流出の門)
> 作法: **写しで済ませない**。本書に載る全ての項は、この相で**自分の手で再現を撃ち**、
> その**生出力を貼った**ものだけである。撃っていない面は §6 に**名乗って**列挙する。

## 0. 件数

| 重篤 | 件数 | 内訳 |
|------|------|------|
| **HIGH** | 1 | HIGH-1 倉の子を倉と誤認 → **緑を騙った**(第37条違反) |
| **MED**  | 3 | S-1 ReDoS(`denude` O(n²))/ MED-1 env 注入面 / MED-2 印 1 単独の生存 |
| **LOW**  | 1 | LOW-1 緑が「どの倉を検めたか」を名乗らない |
| 合計 | **5** | 全て修理済み。回帰の門を B-12/B-12b/B-13/B-14/B-15 に据えた |

> S-1 を MED に置く理由: `denude` の入力は**神託の文**であり、外部の無認証入力ではない。
> 遠隔からの投入路が無いので HIGH ではない。だが 7 秒の停止は環を止めるので LOW でもない。

---

## 1. HIGH-1 — 倉の**子**を指すと倉と名乗り、走査せずに緑を出す

### 病理
`isCreationsVault(root)` の印 1 は `git -C <root> config --get remote.origin.url` だった。
**git は `.git` を親方向に遡る。** ゆえに倉の子・孫・`.git` の中まで、全てが倉の remote を
返し、**全てが「倉である」と名乗った**。

害は「誤検知」ではない。`workspace.js check` は
「倉ならば走行帳の流出を裁き、倉でなければ **skip を声に出す**」という分岐を持つ。
子を倉と誤認すると、**倉の根を一度も走査しないまま**
「✓ … reform 走行帳の流出なし」を印字する —— skip の第三の記号(`·`)ではなく
**緑を騙る**。第37条「見なかったことを見たことにするな」への正面からの違反である。

### 自分で撃った再現(修理【前】= V1 変異を当てた複製に対して)
替え玉の倉を Temp に建て、**倉の根に reform の走行帳を仕込んで**(= 実際の流出)、
根と子の両方から `check` を撃った。

```
════ HIGH-1 修理【前】(V1) ════
--- 倉の根を指す (PARADISE_CREATIONS=C:\...\high1-pVWplY\some-vault-name) EXIT=1
✗ reform の走行帳が創造物の倉に居る (1 件) — 楽園の reform/<slug>/ へ移せ
--- 倉の子を指す (PARADISE_CREATIONS=C:\...\high1-pVWplY\some-vault-name\pomodoro) EXIT=0
✓ 楽園に創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし

isCreationsVault: 根= true  子= true
```

**同じ毒が、指し方一つで EXIT=1 から EXIT=0 に化けた。** しかも子を指した側は
「流出なし」と**断言**している —— 走査していないのに。

### 修理
印 1 を「remote が一致する」から「**git 倉の最上位が、渡された道と同一である**」へ強める。

```js
const top = execFileSync('git', ['-C', root, 'rev-parse', '--show-toplevel'], {...}).trim();
return path.resolve(top) === path.resolve(root);
```

### 自分で撃った再現(修理【後】= 現在の作業木)
```
--- 倉の根を指す (PARADISE_CREATIONS=C:\...\high1-UGZT3J\some-vault-name) EXIT=1
✗ reform の走行帳が創造物の倉に居る (1 件) — 楽園の reform/<slug>/ へ移せ
--- 倉の子を指す (PARADISE_CREATIONS=C:\...\high1-UGZT3J\some-vault-name\pomodoro) EXIT=0
· 走行帳の流出は検めなかった — C:\...\some-vault-name\pomodoro は創造物の倉ではない
✓ 楽園に創造物の混入なし・住所の直書きなし (走行帳の流出は上記のとおり未検査)

isCreationsVault: 根= true  子= false
```

子を指した側は今も EXIT=0 である。**それは正しい** —— 検められなかったことは失敗ではない。
変わったのは、**黙って緑を出すのをやめ、何を検めなかったかを名指した**ことである。

### 回帰の門 —— そしてこの走行の**主題**

前の相の変異試験で、8 件中 **V1(toplevel 突合を消す)だけが生存した**。
理由は門 B-12 の先頭に在った:

```js
if (!fs.existsSync(REAL_VAULT)) H.skip(`本物の創造物の倉が無い: ${REAL_VAULT}`);
```

**GitHub Actions の checkout に兄弟倉は無い。** ゆえに CI では B-12 は**永久に skip され**、
HIGH-1 の再発を誰も捕まえない。実在するものに依存する門は、実在しない場所で死ぬ。

**修理**: 門が**倉の替え玉を自分で組む**(`vaultFixture()`)。`git init` して
`remote add origin .../paradise-creations.git` を打ち、中に子・孫を掘る。
本物の倉を見る断定は **B-12b** に分離した —— 在れば撃ち、無ければ**そこだけ**退く。

#### 実測: 兄弟倉が**一切無い**複製(CI の checkout を模す)で撃つ

```
$ ls $LOCALAPPDATA/Temp/ci-sim
paradise
$ ls -d .../ci-sim/paradise/../paradise-creations
ls: cannot access '...ci-sim/paradise/../paradise-creations': No such file or directory
NO SIBLING VAULT (CI と同じ)
```

**(a) 兄弟倉なし・変異なし → 門は鳴らない(正しい緑)**
```
✓ B-12 [HIGH-1]: 倉の**子**を指しても倉と名乗らない — git は .git を親へ遡る
· B-12b [HIGH-1・実物]: 本物の倉でも根と子を取り違えない  (skipped: 本物の創造物の倉が無い: ...)
abandoned-run: 29 passed, 0 failed, 2 skipped
```

**(b) 兄弟倉なし + V1 変異(toplevel 突合を消す = HIGH-1 再発)→ 赤くなる**
```
✗ B-12 [HIGH-1]: 倉の**子**を指しても倉と名乗らない — git は .git を親へ遡る
    倉の内側 pomodoro が倉と名乗った — git が .git を親へ遡っている。
    isCreationsVault から rev-parse --show-toplevel での突合が消えていないか見よ

true !== false
· B-12b [HIGH-1・実物]: 本物の倉でも根と子を取り違えない  (skipped: 本物の創造物の倉が無い: ...)
abandoned-run: 28 passed, 1 failed, 2 skipped
RAW EXIT=1
```

**CI の盲点は塞がった。** 兄弟倉が一つも存在しない機械で、V1 は死ぬ。

---

## 2. S-1 (MED) — `denude` のファイル名剥ぎが O(n²)

### 病理
`denude` は神託の文から「道具の名」を剥ぐ 4 本の正規表現を持つ。第 3 本(R3)は

```js
/[A-Za-z0-9_.-]+\.(?:js|json|md|yml|yaml|ts|tsx|sh)\b/gi
```

だった。非一致の入力に対し、エンジンは**全ての開始位置**から `[A-Za-z0-9_.-]+` を
伸ばし直す。計算量は入力長の**二乗**である。

### 自分で撃った再現(修理前の R3 / 修理後の R3 / 他の 3 本を同じ入力で計測)
```
N	R1	R2	R3-修理前	R3-修理後	R4
12500	0.04	0.02	69.46	0.09	0.02
25000	0.01	0.00	256.35	0.06	0.00
50000	0.03	0.00	1016.76	0.12	0.00
100000	0.05	0.00	4392.02	0.26	0.00
剥ぐ結果は同一か: true
denude(N=200000) = 0.65 ms
```

倍化ごとの伸び **×3.69 / ×3.97 / ×4.32** —— 二乗である。
他の 3 本(R1/R2/R4)は同じ入力で **0.00〜0.05ms**。**R3 だけが病んでいた。**

> 教主の実測(96/369/1463/7010ms)と本測定(69/256/1017/4392ms)は絶対値が違うが、
> **倍率は両方とも約 4.0** で一致する。差は機械の負荷であり、病像は同じである。

### 修理
先頭に後読み `(?<![A-Za-z0-9_.-])` を置き、開始位置を**語頭に固定**する。
`N=100000` で **4392ms → 0.26ms**(約 1.7 万倍)。`denude` 実体は N=200000 で **0.65ms**。

**剥ぐ結果は一字も変わらない。** 語頭からしか一致しえない正規表現だから当然だが、
7 種の標本(`forge.js を直せ` / `a/b/c.test.js と x.md` / `x.JS X.Md` / `..js` / `a.b.c.js` …)
で突合して確認した —— 上の生出力の `剥ぐ結果は同一か: true`。

---

## 3. MED-1 — `PARADISE_CREATIONS` の注入面

### 病理の形
`isCreationsVault` は `execFileSync('git', [...])` を呼ぶ。配列渡しなのでシェルは介在せず、
**コマンド注入は成立しない**。だが別の害がある —— **例外が外へ漏れれば `check` が死に、
門は「走らなかった」のに誰も気づかない**(第37条の別の顔)。
加えて `--upload-pack=` や `-c protocol.ext.allow=always` は**道そのものが git のオプションに
見える**形であり、`git -C <道>` の引数解釈を曲げうる。

### 自分で撃った再現
```
════ MED-1: PARADISE_CREATIONS に細工した値 ════
  "C:/tmp\nrm -rf /"                     isVault=false  resolve=ok
  "C:/tmp; calc.exe"                     isVault=false  resolve=ok
  "C:/tmp & calc.exe"                    isVault=false  resolve=ok
  "C:/tmp/`calc`"                        isVault=false  resolve=ok
  "C:/tmp/$(calc)"                       isVault=false  resolve=ok
  "C:/tmp|calc"                          isVault=false  resolve=ok
  "--upload-pack=calc.exe"               isVault=false  resolve=ok
  "-c protocol.ext.allow=always"         isVault=false  resolve=ok
  "--exec-path=C:/evil"                  isVault=false  resolve=ok
  "\\no-such-host-xyzshare"              isVault=false  resolve=ok
  "C:/tmp/\u0000evil"                    isVault=false  resolve=ok
  "../../../../"                         isVault=false  resolve=ok
```

12 種すべてで **例外は一つも出ず、真偽以外も返らなかった**。
`resolve()` 経由も全て `ok`。**注入は成立せず、門が死ぬ経路も無い。**

> 効いている理由は二段である。(1) `isDir(p)` が最初に落とす —— これらの道はディレクトリとして
> 実在しないので git を呼ぶ前に `false`。(2) 仮に実在しても `execFileSync` の配列渡しで
> シェルは介在せず、`catch { return false; }` が例外を外へ出さない。
> **門**: `B-14`。

---

## 4. MED-2 — 印 1(git remote)単独が門に守られていなかった

### 病理
前の相の故障注入で、`git remote` の印を `return false` に倒しても**どの門も鳴らなかった**。
B-10 は本物の倉を撃つが、本物の倉は**目印ファイルを持っている**ので、印 1 が死んでも
印 2 が拾い、門は黙る。すなわち **印 1 は一度も単独で試されていなかった**。

害: 目印ファイルを消せば流出の門を黙らせられるのではないか、という疑い。

### 自分で撃った再現
目印を持たない clone を模し、**git remote の印だけ**で判定させ、さらに流出を仕込んだ。
```
════ MED-2: 目印を消しても git remote で倉と認めるか ════
  目印ファイル存在: false
  目印なし + remote あり  -> isCreationsVault = true
  目印なし + 別 remote    -> isCreationsVault = false
  目印を消した倉に流出を仕込んだ check: EXIT=1
```

**黙らせられない。** 目印ファイルを消しても印 1 が拾い、流出は EXIT=1 で鳴った。
逆向きも撃った —— 楽園本体の remote(`paradise-forge.git`)を持つ倉は `false`。
**印 1 は緩すぎも固すぎもしない。** 門: `B-13`。

> ⚠️ 名では裁いていないことも同時に確認した。fixture のディレクトリ名は
> `some-other-name` / `some-vault-name` であり、`paradise-creations` ではない。
> 名で裁けば `B-1 [故障注入]` の砂場が本物と誤認され、故障注入が死ぬ(L-11)。

---

## 5. LOW-1 — 残っていた問い: 攻撃者が Temp に目印を置けば門を黙らせられるか

### 問い
`.paradise-creations` という目印ファイルは**誰でも置ける**。攻撃者(あるいは事故)が
Temp に空の偽倉を建てて `PARADISE_CREATIONS` に指させれば、流出の門を黙らせられるか。

### 自分で撃った再現
```
A) 素の Temp ディレクトリ(印なし)
   isCreationsVault = false
   check EXIT=0
   · 走行帳の流出は検めなかった — C:\...\planted-fOiWY1 は創造物の倉ではない
     (目印 .paradise-creations も git remote paradise-creations も無い / source=env)
   ✓ 楽園に創造物の混入なし・住所の直書きなし (走行帳の流出は上記のとおり未検査)

B) 攻撃者が目印 .paradise-creations を置いた(git 倉ですらない)
   isCreationsVault = true
   check EXIT=0
   ✓ 楽園に創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし

C) その偽倉に reform の走行帳を仕込む(= 実際の流出)
   check EXIT=1
   ✗ reform の走行帳が創造物の倉に居る (1 件) — 楽園の reform/<slug>/ へ移せ
     C:\...\planted-fOiWY1\reform-planted\conclave.json  [slug]  domains 0/1
        倉での名が 'reform-' で始まる

D) env を与えず既定の道で走らせる(本物の倉が見られるか)
   check EXIT=0
   ✓ 楽園に創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし
```

### 裁き —— **許容**(ただし一点だけ実害があり、直した)

**黙らせられない。** C が示すとおり、偽倉であっても**走査は正しく働き**、
流出を仕込めば EXIT=1 で鳴る。目印は「ここを見よ」と言うだけで、
「見た結果を偽れ」とは言えない。

そして **`PARADISE_CREATIONS` を書ける者は、既にファイルシステムを書ける**。
同じ権限で `reform/` のファイルを直接消す方が早い。
env を信じる設計は**脅威模型の内側**であり、ここを固めても攻撃者の費用は上がらない。

**ただし B は曖昧な緑だった。**
「✓ … reform 走行帳の流出なし」としか言わないので、読んだ人は**本物の倉を検めた**と読む。
実際には Temp の空の偽倉を検めただけである。skip でも false green でもないが、
**どの倉を検めたかを言わない緑**は第37条の精神に反する —— *別の場所を見たなら、その場所を名乗れ*。

### 修理(この相で入れた)
```js
console.log('✓ 楽園に創造物の混入なし・住所の直書きなし' +
  (judgeRuns ? `・reform 走行帳の流出なし (検めた倉: ${r.root})` : ' (走行帳の流出は上記のとおり未検査)'));
```
修理後の実測:
```
$ node graph/workspace.js check
✓ 楽園に創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし (検めた倉: C:\Users\kikus\Documents\workspace\paradise-creations)
```
**門**: `B-15`(替え玉の倉を指した `check` の出力にその道が含まれることを断定する)。

---

## 6. **見ていない項目**(名乗り)

「擬っていないので安全」とは書かない。以下は**この相で一度も撃っていない**。

| # | 面 | なぜ撃たなかったか / 残る疑い |
|---|----|------------------------------|
| U-1 | **`forge.js` の他の正規表現の ReDoS** | 計ったのは `denude` の 4 本だけ。`REFORM_RE` / `PRODUCT_RE` / `BUILD_RE` / `COUNSEL_RE` / `DETERMINER_LOOKBEHIND` / `PRODUCT_FALSE_FRIENDS` は**計測していない**。後読みや交替を含むので、同じ病が潜みうる。 |
| U-2 | **`workspace.js` 以外の engine の env 注入面** | `PARADISE_CREATIONS` だけを撃った。`CLAUDE_CONFIG_DIR` などの他の env を読む engine(`abode.js` 等)は見ていない。 |
| U-3 | **`strayRuns()` 自体の走査の安全性** | 「倉と認めるか」の判定だけを撃った。倉と認めた**後**の走査 —— symlink を辿るか、深さは有界か、巨大な `conclave.json` で死なないか —— は見ていない。symlink ループで `check` が固まる可能性は未検証。 |
| U-4 | **TOCTOU** | `isCreationsVault` が true を返してから `strayRuns()` が走るまでの間に、道の実体が差し替わる競合は考えていない。単一プロセスの検査器なので実害は薄いと見るが、**撃っていない**。 |
| U-5 | **git の設定経由の影響** | `core.worktree` / `GIT_DIR` / `GIT_WORK_TREE` / `safe.directory` を細工した環境で `rev-parse --show-toplevel` が何を返すかは見ていない。印 1 の突合はここに依存している。 |
| U-6 | **Windows 以外の機械** | 全ての実測は Windows/MSYS で行った。`path.resolve` の大文字小文字の扱いや、POSIX での symlink 解決の差は見ていない。 |
| U-7 | **CI で実際に赤くなること** | 兄弟倉の無い**複製**で B-12 が赤くなることは実測した。だが **GitHub Actions 上で実際に走らせてはいない**(掟により push しない)。CI の node 版・git 版の差は未検証。 |
| U-8 | **`denude` 以外の入力経路の長さの上限** | 神託の文に 100000 字が来る経路が実在するかは調べていない。ReDoS の修理は正しいが、**元の到達可能性は測っていない**。 |

---
---

# 【二周目】security — 新しい正規表現と三枝化した述語を撃つ

> 相: `security`(quality 領域・**二周目**)/ 対象: `git diff ec0694c..HEAD` が足した RE と述語
> 一周目は 8 本の RE を線形と確かめたが、**二度目の build が足した RE は未測定**であった(U-1 の残り)。
> 本節の全ての数は**二周目の security が自分の手で撃った生出力**である(第27条)。

---

## 0. 件数

| 重篤 | 件数 | 名 |
|---|---|---|
| **HIGH** | **0** | (新規の HIGH 無し) |
| MED | 0 | — |
| LOW | 0 | — |
| **回帰の確認** | **3/3 生存** | HIGH-1 / S-1 / V-1 の修理は**今も生きている** |

> ⚠️ **「security に問題無し」ではない。** 本節が撃ったのは **ReDoS と回帰**である。
> review §1 が見つけた **`MEND_RE` の誤着 32/32** は道選びの正しさの問題であって
> security の問題ではないが、**同じ RE が原因**である ——
> **速さが線形であることは、意味が正しいことを何も保証しない。**

---

## 1. 新しい正規表現の ReDoS —— **全て線形。二乗の兆候なし**

### 1.1 何を撃ったか

一周目の U-1 は「`denude` の 4 本だけを計り、`REFORM_RE` 等は計測していない」と名乗り、
verify 相 §3.1 が 8 本を撃って線形と確かめた。
**二度目の build が足した / 割った RE は、その 8 本に含まれていない**:

| RE | 新設か | 一周目に計ったか |
|---|---|---|
| `MEND_RE` | **新設** | いいえ(build 相が粗く計ったのみ) |
| `REFORM_ABSTRACT_RE` | **分割で新生** | いいえ |
| `REFORM_STRONG_RE` | **分割で新生** | いいえ |
| `REFORM_RE`(束ね) | 形が変わった | 一周目の形とは別物 |
| `isReformSubject` | **三枝化** | いいえ(述語全体は未測定) |

### 1.2 悪意の形 × 大きさ の全表(生出力)

**8 種の悪意の形**を作った。各形は交替の枝の**接頭辞を最大限に繰り返す** ——
バックトラックを誘う古典的な形である。

```
RE                   | shape              | 10KB | 100KB | 200KB | 比(200/10)
--------------------------------------------------------------------------------------------
MEND_RE              | prefix-直           |    0.10 |   0.18 |   0.34 | 3.3x
MEND_RE              | prefix-fi          |    0.05 |   0.17 |   0.61 | 12.6x
MEND_RE              | almost-fix         |    0.01 |   0.08 |   0.16 | 17.2x
MEND_RE              | det-then-name      |    0.01 |   0.07 |   0.15 | 15.3x
MEND_RE              | near-strong        |    0.01 |   0.09 |   0.16 | 20.5x
MEND_RE              | near-abstract      |    0.02 |   0.39 |   0.37 | 21.3x
MEND_RE              | boundary-spam      |    0.00 |   0.04 |   0.04 | 16.2x
MEND_RE              | mixed-adversarial  |    0.00 |   0.05 |   0.20 | 96.1x
REFORM_ABSTRACT_RE   | prefix-直           |    0.06 |   0.21 |   0.37 | 6.2x
REFORM_ABSTRACT_RE   | prefix-fi          |    0.05 |   0.38 |   0.51 | 11.1x
REFORM_ABSTRACT_RE   | almost-fix         |    0.01 |   0.11 |   0.26 | 21.8x
REFORM_ABSTRACT_RE   | det-then-name      |    0.00 |   0.05 |   0.12 | 30.5x
REFORM_ABSTRACT_RE   | near-strong        |    0.01 |   0.11 |   0.27 | 21.2x
REFORM_ABSTRACT_RE   | near-abstract      |    0.02 |   0.24 |   0.41 | 22.8x
REFORM_ABSTRACT_RE   | boundary-spam      |    0.00 |   0.03 |   0.06 | 20.0x
REFORM_ABSTRACT_RE   | mixed-adversarial  |    0.02 |   0.32 |   0.39 | 25.0x
REFORM_STRONG_RE     | prefix-直           |    0.09 |   0.08 |   0.15 | 1.6x
REFORM_STRONG_RE     | prefix-fi          |    0.11 |   0.44 |   0.82 | 7.5x
REFORM_STRONG_RE     | almost-fix         |    0.02 |   0.18 |   0.44 | 18.9x
REFORM_STRONG_RE     | det-then-name      |    0.00 |   0.02 |   0.24 | 75.2x
REFORM_STRONG_RE     | near-strong        |    0.02 |   0.21 |   0.45 | 23.1x
REFORM_STRONG_RE     | near-abstract      |    0.00 |   0.06 |   0.12 | 32.8x
REFORM_STRONG_RE     | boundary-spam      |    0.00 |   0.02 |   0.04 | 17.0x
REFORM_STRONG_RE     | mixed-adversarial  |    0.02 |   0.20 |   0.39 | 20.6x
REFORM_RE_bundle     | prefix-直           |    0.19 |   0.19 |   0.55 | 2.8x
REFORM_RE_bundle     | prefix-fi          |    0.16 |   0.58 |   1.16 | 7.4x
REFORM_RE_bundle     | almost-fix         |    0.03 |   0.27 |   0.59 | 18.0x
REFORM_RE_bundle     | det-then-name      |    0.00 |   0.02 |   0.11 | 23.9x
REFORM_RE_bundle     | near-strong        |    0.03 |   0.28 |   0.60 | 20.8x
REFORM_RE_bundle     | near-abstract      |    0.02 |   0.23 |   0.57 | 28.8x
REFORM_RE_bundle     | boundary-spam      |    0.00 |   0.02 |   0.04 | 18.4x
REFORM_RE_bundle     | mixed-adversarial  |    0.03 |   0.55 |   0.67 | 19.8x
REFORM_WEAK_RE       | prefix-直           |    0.09 |   0.07 |   0.14 | 1.7x
REFORM_WEAK_RE       | prefix-fi          |    0.10 |   0.47 |   0.97 | 9.7x
REFORM_WEAK_RE       | almost-fix         |    0.02 |   0.20 |   0.42 | 21.1x
REFORM_WEAK_RE       | det-then-name      |    0.02 |   0.19 |   0.44 | 21.2x
REFORM_WEAK_RE       | near-strong        |    0.02 |   0.20 |   0.43 | 22.2x
REFORM_WEAK_RE       | near-abstract      |    0.00 |   0.06 |   0.11 | 24.2x
REFORM_WEAK_RE       | boundary-spam      |    0.00 |   0.02 |   0.07 | 34.6x
REFORM_WEAK_RE       | mixed-adversarial  |    0.02 |   0.19 |   0.50 | 28.3x
--------------------------------------------------------------------------------------------
最遅(200KB): REFORM_RE_bundle / prefix-fi = 1.16ms
最悪の伸び率: MEND_RE / mixed-adversarial = 96.1x
判定(粗い一回計測): ⚠️ 二乗の疑い
```

### 1.3 ⚠️ **「96.1x」は偽の赤であった** —— 自分の計測を疑って撃ち直した

**粗い一回計測は「二乗の疑い」を出した。だがこれは計測器の分解能の産物である。**
`MEND_RE / mixed-adversarial` の 10KB は **0.00ms**(分解能以下)であり、
**0 で割った比は意味を持たない。**

**ゆえに「入力を倍にした時の伸び」を 20 回平均 × 5 段で測り直した**
(二乗なら 4x / 線形なら 2x になるはずである):

```
入力を倍にした時の時間の伸び(二乗なら 4x / 線形なら 2x)
 MEND_RE             50KB=0.000ms 100KB=0.000ms 200KB=0.000ms 400KB=0.000ms 800KB=0.000ms
                     倍率: 0.56x 0.80x 2.38x 2.47x
 REFORM_ABSTRACT_RE  50KB=0.067ms 100KB=0.135ms 200KB=0.271ms 400KB=0.571ms 800KB=1.088ms
                     倍率: 2.01x 2.01x 2.10x 1.91x
 REFORM_STRONG_RE    50KB=0.076ms 100KB=0.157ms 200KB=0.318ms 400KB=0.571ms 800KB=1.265ms
                     倍率: 2.08x 2.02x 1.95x 2.04x
```

**倍率は全て 2.0x 前後である。完全な線形。二乗の兆候は無い。**
`MEND_RE` が 0.000ms なのは、`mixed-adversarial` の入力が**先頭付近で必ず当たる**ため
(`直` が 1 文字目に在る)—— 最悪計算量を測れていない形だった。
**800KB でも `REFORM_STRONG_RE` が 1.265ms。実害は無い。**

> **教訓(自分への)**: **粗い一回計測の「比」は、分母が分解能以下なら嘘をつく。**
> 一周目の security 相が S-1 を見つけたのは**倍率で見た**からであった。
> 本相も最初の表で「二乗の疑い」と書きかけた —— **自分の測定器を疑う一段が要る。**

### 1.4 三枝化した `isReformSubject` と `chooseScale` の全段(生出力)

RE 単体だけでなく、**三枝を順に通す述語全体**と、**denude を含む実際の到達経路**も撃った:

```
--- isReformSubject 全体(三枝) ---
  isReformSubject | prefix-直           |    0.04 |   0.24 |   0.48
  isReformSubject | prefix-fi          |    0.10 |   1.09 |   2.05
  isReformSubject | almost-fix         |    0.05 |   0.51 |   1.01
  isReformSubject | det-then-name      |    0.03 |   0.26 |   0.58
  isReformSubject | near-strong        |    0.05 |   0.51 |   1.17
  isReformSubject | near-abstract      |    0.02 |   0.28 |   0.55
  isReformSubject | boundary-spam      |    0.01 |   0.08 |   0.17
  isReformSubject | mixed-adversarial  |    0.05 |   0.49 |   0.96

--- chooseScale 全段(denude 含む・実際の到達経路) ---
  chooseScale     | prefix-直           |    0.53 |   1.05 |   2.22
  chooseScale     | prefix-fi          |    0.42 |   2.61 |   4.92
  chooseScale     | almost-fix         |    0.13 |   1.27 |   2.58
  chooseScale     | det-then-name      |    0.19 |   3.58 |   6.33
  chooseScale     | near-strong        |    0.13 |   1.27 |   2.72
  chooseScale     | near-abstract      |    0.12 |   1.14 |   2.24
  chooseScale     | boundary-spam      |    0.24 |   2.30 |   6.80
  chooseScale     | mixed-adversarial  |    0.19 |   1.83 |   3.89
```

**最悪でも 200KB で 6.80ms。** 10KB→200KB(20 倍)で時間も 20〜28 倍 —— **線形**である。
**三枝化は ReDoS を持ち込んでいない。**

> **一件の正直**: 枝が三つになったので、**楽園を名指さない入力は三枝すべてを通る**
> (最悪経路が長くなった)。二枝時代との直接比較は撃っていないが、
> **絶対値が 200KB で 1ms 台なので実害の域に無い。**

---

## 2. 回帰の確認 —— 一周目の HIGH-1 / S-1 / V-1 は**今も生きている**

一周目が直した 3 件を**再撃した**。「直したはず」を信じない(第27条)。

### 2.1 HIGH-1 —— 倉の**子**を倉と名乗らないか(生出力)

```
$ (isCreationsVault を本物の倉とその子に対して撃つ)
  isCreationsVault 在り = true
  倉の根        -> true
  倉の子 .claude -> false (false が正しい = HIGH-1 の修理が生きている)
  倉の子 .github -> false (false が正しい = HIGH-1 の修理が生きている)
  .git の中     -> false (false が正しい)
```

**生きている。** `rev-parse --show-toplevel` の突合(第60条(c) が名指した強い印)は今も働いている。

### 2.2 S-1 —— `denude` の O(n²) が戻っていないか(生出力)

```
$ (denude をファイル名を大量に含む入力で計る)
  denude 50KB = 1.09ms
  denude 100KB = 1.18ms
  denude 200KB = 1.52ms
  denude 400KB = 3.25ms
```

**生きている。** 50KB→400KB(8 倍)で 1.09→3.25ms(**3 倍**)—— 線形以下。
二乗なら 64 倍(約 70ms)になるはずである。

### 2.3 V-1 —— 壊れた走行帳で `check` が死なないか(生出力)

`PARADISE_CREATIONS` で仮倉を指し、`conclave.json` に **5 種の毒**を入れて撃った:

```
=== V-1 回帰: 壊れた走行帳で check が死なないか ===
  帳={"broken                           EXIT=0 OK(例外なし)
  帳=null                               EXIT=0 OK(例外なし)
  帳=[]                                 EXIT=0 OK(例外なし)
  帳={"phases":null}                    EXIT=0 OK(例外なし)
  帳={"phases":{"a":{"status":null}}}   EXIT=0 OK(例外なし)
```

**生きている。** uncaught TypeError で三つの検めが沈黙する病は再発していない。

---

## 3. 一周目の U-1〜U-8 のうち、二周目で新たに撃てたもの

| # | 一周目の名乗り | 二周目 |
|---|---|---|
| **U-1** | `forge.js` の他の RE の ReDoS | **12/15 まで進んだが完了していない**。verify 相が 8 本、**本相が新しい 5 本 + 既存 7 本を倍率で撃ち直した**(§1/§3.1)。**`PRODUCT_STRONG_RE` / `DOC_STRONG_RE` / `DIAGRAM_FALSE_FRIENDS` の 3 本は export されておらず撃てなかった**(§3.2) |
| U-2 | 他の engine の env 注入面 | **撃っていない**(本走行が触っていない engine の面) |
| U-3 | `strayRuns()` の走査の安全性 | 一周目に verify 相が撃ち V-1 を発見・修理。**本相は V-1 の回帰のみ再撃**(§2.3) |
| U-4 | TOCTOU | **撃っていない**(一周目に V-3 として許容済み。状況は変わっていない) |
| U-5 | git 設定経由 | **撃っていない**(一周目に V-2 として名乗り済み) |
| U-6 | Windows 以外の機械 | **撃っていない**(本機は Windows/MSYS のみ) |
| U-7 | CI で実際に赤くなること | **撃っていない**(掟により push しない) |
| U-8 | `denude` の入力長の到達可能性 | **撃っていない**。ただし §1 で 800KB まで線形と確かめたので、**到達可能でも実害が無い**ことは示せた |

### 3.1 U-1 の到達点 —— **12/15 を計った。残り 3 本は export されておらず撃てない**

「全部撃った」という主張は、**表と撃ったものを照合して**初めて真になる
(build 相が AC-37 で学んだ形である)。`forge.js` の RE 定数を**機械で数えた**:

```
$ grep -cE "^const [A-Z_]+ *= *(new RegExp|/)" graph/forge.js
15
```

**15 本在る。** 一本ずつ帰属を確かめた:

| RE | 誰が計ったか |
|---|---|
| `REFORM_RE`(束ね) | **二周目 security**(§1.2) |
| `REFORM_ABSTRACT_RE` | **二周目 security**(§1.2 / §1.3 の倍率) |
| `REFORM_STRONG_RE` | **二周目 security**(§1.2 / §1.3 の倍率) |
| `REFORM_WEAK_RE` | 一周目 verify §3.1 + **二周目 security** |
| `MEND_RE` | build 相(粗く)+ **二周目 security**(§1.2) |
| `COUNSEL_RE` / `BUILD_RE` / `CREATE_RE` / `DOC_RE` / `DIAGRAM_RE` / `PRODUCT_RE` / `PRODUCT_FALSE_FRIENDS` | 一周目 verify §3.1 + **二周目 security が倍率で撃ち直した**(下記) |
| **`PRODUCT_STRONG_RE`** | ⚠️ **誰も計っていない** |
| **`DOC_STRONG_RE`** | ⚠️ **誰も計っていない** |
| **`DIAGRAM_FALSE_FRIENDS`** | ⚠️ **誰も計っていない** |

**既存 7 本を倍率で撃ち直した生出力**(一周目は「線形」と結論したが、本相は倍率で再確認した):

```
  COUNSEL_RE              100KB=0.179 200KB=0.339 400KB=0.668 800KB=1.337  倍率: 1.89x 1.97x 2.00x
  BUILD_RE                100KB=0.133 200KB=0.264 400KB=0.525 800KB=1.079  倍率: 1.99x 1.99x 2.06x
  CREATE_RE               100KB=0.197 200KB=0.390 400KB=0.783 800KB=1.559  倍率: 1.98x 2.01x 1.99x
  DOC_RE                  100KB=0.126 200KB=0.239 400KB=0.482 800KB=0.959  倍率: 1.91x 2.02x 1.99x
  DIAGRAM_RE              100KB=0.101 200KB=0.205 400KB=0.406 800KB=0.811  倍率: 2.02x 1.98x 2.00x
  PRODUCT_RE              100KB=0.000 200KB=0.000 400KB=0.000 800KB=0.000  倍率: 0.37x 0.60x 0.90x
  PRODUCT_FALSE_FRIENDS   100KB=0.209 200KB=0.416 400KB=0.827 800KB=1.671  倍率: 1.99x 1.99x 2.02x
```

**全て 2.0x 前後。線形。**(`PRODUCT_RE` は先頭で当たるので 0.000ms —— **測れていない**。S2-1 と同じ形)

### 3.2 ⚠️ **U-1 は完了していない** —— 撃てない 3 本が在る

```
$ (module.exports に在るか確かめた)
  PRODUCT_STRONG_RE        export=false
  DOC_STRONG_RE            export=false
  DIAGRAM_FALSE_FRIENDS    export=false
```

**この 3 本は `module.exports` に無いので、外から掴めない。** ゆえに**撃てなかった**。

**「撃っていないので安全」とは書かない**(第37条)。3 本とも `PRODUCT_FALSE_FRIENDS`
(線形と確かめた)と**同じ形の交替表**なので同じく線形である**見込み**は高いが、
`DOC_STRONG_RE` は一周目の review §8 が「日英非対称」を名指した RE でもあり、
**見込みで済ませてよい根拠は無い。**

> **これは一周目の U-1 が「`forge.js` の他の正規表現」と書いた時、
> 表を数えずに書いたことの帰結である。** 一周目の verify は 8 本を撃って
> 「全て線形。危険なし」と結論したが、**当時から 15 本在った**。
> **数えずに「他の」と書けば、網羅は永久に確かめられない。**
> これは AC-37 が機械照合で解いた問題と**同じ形**であり、
> **security 側には同じ機械照合が無い。**

---

## 4. 【二周目】見ていない項目(名乗り)

| # | 面 | 残る疑い |
|---|---|---|
| S2-1 | **`MEND_RE` の最悪計算量を測れていない** | `mixed-adversarial` は先頭で当たるので**照合が即座に成功する**。**「当たらないが惜しい」長い入力**(全枝の接頭辞を持ち、どれも完成しない形)を `MEND_RE` 専用に設計していない。他の RE は 2.0x の線形を確かめたが、**`MEND_RE` だけは 0.000ms で測れていない** |
| S2-2 | **正規表現エンジンの実装依存** | Node v24 の V8 で測った。他の版・他のエンジン(RE2 等)では特性が違いうる |
| S2-3 | **入力が 800KB を超える経路** | 800KB まで撃った。それ以上は撃っていない |
| S2-4 | **`admit()` / `explainAdmit()` / `buildDag()` の計算量** | 道選びの RE だけを撃った。**DAG 構築側は一度も計っていない** |
| S2-5 | **並行実行下の挙動** | 単一プロセス・単一スレッドで測った。同時多発の負荷は撃っていない |
| S2-6 | **U-2 / U-4 / U-5 / U-6 / U-7** | §3 の表のとおり、二周目でも撃っていない |
| S2-7 | **`MEND_RE` の誤着が security 事象か** | 本相は「否」と裁いた(道選びの正しさの問題)。だが **`reform` は 11 相を走らせる最も重い道**であり、世間の願いが誤って 11 相を起動することを**資源の消尽と読む余地は在る**。**その角度からは撃っていない** |
