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
