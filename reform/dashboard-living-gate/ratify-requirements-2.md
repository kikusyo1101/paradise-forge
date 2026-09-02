# ratify-requirements-2.md — 再審査報告(discovery 枢機卿)

- **対象**: `reform/dashboard-living-gate/requirements.md`(118,735 バイト / 1,594 行)
- **前回報告**: `reform/dashboard-living-gate/ratify-requirements.md`(44,526 バイト・**reject**)
- **審査者**: discovery 枢機卿(憲法第11条 — requirements ドメインは自己批准できない)
- **測定機**: Windows 11 / git-bash / GNU grep 3.0 / node v24.14.0
- **作業ディレクトリ**: `C:/Users/kikus/Documents/workspace/paradise`
- **合成の見本の置き場**: `$LOCALAPPDATA/Temp/pd-ratify2/`(**楽園の作業樹には一切残していない**)
- **実走コマンド数**: **47**(前回と重複しない AC を優先した)

---

## 判定

# **ratify(批准)**

**条件**: 下記 §5 の **残欠陥 2 件(R-1 / R-2)を design 相への申し送りとして持ち越す**。
両件とも「AC の書き方の欠陥」ではあるが、**要件そのものの欠落ではなく**、
かつ **§9 が立てた則1〜4 の枠内で機械的に是正できる形**である。差戻す水準に達していない。

前回 reject の理由は「AC の一部が機械で実行できるコマンドになっておらず、**壊れていても永久に緑を返す**」ことであった。
**その 4 件はすべて直っている**(§1)。神官が自力発見と申告する 5 件も**すべて実在の欠陥であり、すべて直っている**(§2)。
§9 の検証ログは**再走で全件再現した**(§3)。ゆえに批准する。

---

## §1. 前回の 4 欠陥 — 自らの手で確かめた

### ① AC-10a — `grep -E` に PCRE 否定先読み(npm 依存を 100% 見逃す)

合成の見本を作り直して対照実験した。

```
$ printf "const x = require('lodash');\nconst h = require('http');\nconst f = require('node:fs');\n" > bad.js
$ printf "const h = require('http');\nconst f = require('node:fs');\nconst p = require('path');\n" > good.js

--- L1 形B(-P 非依存のパイプ方式)bad.js
$ grep -o "require('[^']*'" bad.js | grep -cvE "^require\('(node:|http'|https'|fs'|path'|url'|os'|events'|child_process'|crypto'|zlib')"
1
   exit=0                    ← lodash を検出

--- L2 形B good.js
0
   exit=1                    ← 誤検出なし

--- L3 形A(grep -P)bad.js
$ grep -cP "require\(['\"](?!node:)(?!http['\"])(?!https['\"])(?!fs['\"])(?!path['\"])" bad.js
1
   exit=0

--- L4 形A good.js
0
   exit=1

--- L5 旧式(-E に PCRE)bad.js
$ grep -cE "require\(['\"](?!http|https|fs|path)" bad.js
0
   exit=1                    ← 見逃した(前回不合格とした形の再現)
```

**判定: 直っている。** 新式は壊れた見本に赤、旧式は緑。両形(A/B)とも本機で機能する。

### ② AC-09d — `grep -c $'\n\n'` が空パターンに退化(SSE 終端が壊れても永久に緑)

```
$ printf 'data: x\n\ndata: y\n\n' > sse-ok.txt
$ printf 'data: x\ndata: y\n'     > sse-broken.txt
$ printf 'data: x\n\ndata: y\n'   > sse-half.txt

--- 修正後の式(node)を 3 通りに走らせた実出力
sse-ok       (1)終端数=2  (2)判定=OK  exit=0
sse-broken   (1)終端数=0  (2)判定=NG  exit=1
sse-half     (1)終端数=1  (2)判定=NG  exit=1

--- 旧式の再現
$ grep -c $'\n\n' sse-ok.txt      →  4      ← 全行数。期待 2 ではない
$ grep -c $'\n\n' sse-broken.txt  →  2      ← 壊れていても 0 にならない = 永久に緑
```

**判定: 直っている。** 半壊(末尾の終端欠落)まで捕らえる。教主が命じた実測条件「正常な SSE に対して **2**」を満たす。

### ③ AC-N01a — `/usr/bin/time` が本機に不在

```
$ ls -la /usr/bin/time
ls: cannot access '/usr/bin/time': No such file or directory

$ node -e 'const{execFileSync}=require("child_process");for(let i=0;i<3;i++){const t0=process.hrtime.bigint();execFileSync(process.execPath,["-e","1"],{stdio:"ignore"});const ms=Number(process.hrtime.bigint()-t0)/1e6;console.log(ms.toFixed(1)+"ms");if(ms>=1000)process.exit(1);}'
26.8ms
22.9ms
30.0ms
   exit=0
```

**判定: 直っている。** `/usr/bin/time` の不在を再確認し、`process.hrtime.bigint()` による node 内計測が 3 回とも成立した。

### ④ AC-22b — 固定値を期待値にしていた(実測 5 件 → 実は 10)

```
$ node -e 'console.log(require("./graph/gauge.js").readLedger().length)'
10                         ← 源(gauge の自己申告)

$ node graph/gauge.js ledger | grep -cE '^[[:space:]]+[0-9]{4}-'
10                         ← 表示(CLI が描いた日付行)

判定: MATCH (10 == 10)
```

**判定: 直っている。** 固定値を捨て「源 = 表示 = 断面」の 3 値一致に改まった。文面にも
「執筆時点の参考値は 10 だが、これは期待値ではない」と明記されている。**則3 に従った形である。**

**§1 総括: 前回の 4 欠陥はすべて是正されている。**

---

## §2. 神官が自力発見したと申告する 5 件 — 鵜呑みにせず実走した

神官の申告は S-5 / S-6(新設 AC 2 件)・S-7(宙に浮いた参照)・**S-8(ERE の `\|` リテラル化)**・
**S-9(`grep -c` の複数ファイル問題)**。主眼は S-8 / S-9 である。

### S-8 — ERE の `\|` はリテラルのパイプ文字(AC-G05a)

まず合成の見本で挙動そのものを確かめた。

```
$ printf 'visual-verify here\ncritic.js here\nboth visual-verify critic.js\n' > ci.txt

$ grep -cE 'visual-verify\|critic.js' ci.txt
0
   exit=1                  ← リテラル「visual-verify|critic.js」を探している(誤)

$ grep -cE 'visual-verify|critic.js' ci.txt
3
   exit=0                  ← ERE の素の | が交替(正)

$ grep -c 'visual-verify\|critic.js' ci.txt
3
   exit=0                  ← BRE なら \| が交替(正)
```

**神官の申告は事実である。** 次に、修正後の AC を実ファイルに対して走らせた。

```
$ grep -cE "visual-verify|critic\.js" .github/workflows/tribunal.yml
1
   exit=0                  ← AC-G05a の期待は「2 以上」→ 現状 1 = 正しく赤

$ grep -cE 'visual-verify\|critic\.js' .github/workflows/tribunal.yml
0
   exit=1                  ← 旧式。第50条の是正を担う門が永久に緑だった

$ grep -c 'dashboard/index.html\|dashboard/control.html' .github/workflows/tribunal.yml
0
   exit=1                  ← AC-G05a 第2式。期待は「1 以上」→ 現状 0 = 正しく赤
```

**判定: 直っている。** 第1式は `-E` + 素の `|`、第2式は `-E` を外した BRE の `\|` で、**方言が混ざっていない**。
両式とも現時点で正しく赤を返す(則1)。

**文書全体への波及も機械で洗った**(node で走査。§9 が引用する反例を除外するため §9 境界で分けた):

```
=== A: grep -E 系に \| (リテラル化する交替) ===
1058: AC-G05a(修正済み。素の | と BRE の \| を使い分けている)
-- 本文(§1-8)該当 1 件 / §9内 2 件(いずれも反例としての引用)
```

**本文に未修正の `-E` + `\|` は 0 件である。**

### S-9 — `grep -c` に複数ファイルを渡すと合計にならない(AC-02c / AC-22a)

```
$ grep -c "SELF_DAG" dashboard/*.js dashboard/*.html
dashboard/paradise.js:2
dashboard/state.js:0
dashboard/control.html:0
dashboard/index.html:2
   exit=0                  ← 合計ではなく内訳。「合計が 0」の判定に使えない

$ grep -c "SELF_DAG" dashboard/*.js dashboard/*.html | wc -l
4                          ← wc -l と組むと「ファイル数」を数えてしまう(教主の懸念どおり)

$ grep -o "SELF_DAG" dashboard/*.js dashboard/*.html | wc -l
4                          ← 集計形。期待 0 → 現状 4 = 正しく赤

$ grep -c "SELF_DAG" dashboard/*.js dashboard/*.html | awk -F: '{s+=$NF} END{print s}'
4                          ← awk 集計でも同じ
```

**神官の申告は事実である。** AC-02c(L249-254)と AC-22a(L759)は、いずれも文面が
`grep -o … | wc -l` の集計形に書き換わっており、⚠️ 注記も添えられている。

**判定: 申告された 2 件は直っている。ただし走査は網羅していなかった** — §5 R-1 を見よ。

### S-5 / S-6 — 新設 AC が「書いた時点で赤」であること(則1)

```
$ grep -c 'data-contradiction="true"' dashboard/index.html
0
   exit=1                  ← AC-13e の期待は「1 以上」→ 正しく赤

$ grep -o 'data-run-state="[a-z]*"' dashboard/index.html | sort -u | wc -l
0
   exit=0                  ← AC-14i の期待は「2 以上」→ 正しく赤
```

**判定: 直っている(新設が成立している)。** 2 件とも現時点で赤である。
AC-14i は「`stalled` の要素数が断面の `runs.filter(...).length` と一致すること」と書かれ、
括弧内の **1** を明示的に「固定値を期待値にしない」と断っている — 則3 に従った形である。

### S-7 — §3.0 写像表の `D-1` / `D-2` が §3.4 に未定義だった

```
$ sed -n '156,158p' requirements.md
| R-20 | 🟠 | **却下** | §3.4 **D-1** |
| R-22 | 🟡 | **却下(将来課題)** | §3.4 D-2 / §7 F-1 |
```

§3.4 の表にラベル列が追加され、参照先が実在する。**判定: 直っている。**

**§2 総括: 神官が自力発見したと申告する 5 件は、すべて実在の欠陥であり、すべて是正されている。**
**ただし S-9 の「走査の網羅性」だけは申告どおりではなかった(§5 R-1)。**

---

## §3. §9 の検証ログ自体が再現するか — サンプリングした

ログに載っている実出力を、いま同じコマンドで走らせて照合した。

| ログ | 主張された出力 | 本審査での再走 | 一致 |
|---|---|---|---|
| ① AC-10a 形B bad.js | 件数 1 / exit=0 | `1` / exit=0 | ✅ |
| ① AC-10a 形B good.js | 件数 0 / exit=1 | `0` / exit=1 | ✅ |
| ① AC-10a 形A `-P` bad/good | 1 / 0 | `1` / `0` | ✅ |
| ② AC-09d sse-ok | 終端数 2 / OK / exit 0 | 終端数 2 / OK / exit=0 | ✅ |
| ② AC-09d sse-broken | 0 / NG / exit 1 | 0 / NG / exit=1 | ✅ |
| ② AC-09d sse-halfbroken | 1 / NG / exit 1 | 1 / NG / exit=1 | ✅ |
| ② 旧式 `grep -c $'\n\n'` | ok=4 / broken=2 | `4` / `2` | ✅ |
| ③ AC-N01a `/usr/bin/time` | 不在 | 不在 | ✅ |
| ③ AC-N01a node 内計測 | 26.7/23.1/22.4ms exit 0 | 26.8/22.9/30.0ms exit=0 | ✅(値域一致) |
| ④ AC-22b 源 | 10 | `10` | ✅ |
| ④ AC-22b 表示 | 10 | `10` | ✅ |
| ⑤ AC-G05a 合成 3 通り | 0 / 3 / 3 | `0` / `3` / `3` | ✅ |
| ⑤ AC-G05a 実ファイル | 1 / 0 | `1` / `0` | ✅ |
| ⑥ AC-13e | 0 exit 1 | `0` exit=1 | ✅ |
| ⑥ AC-14i | 0 | `0` | ✅ |
| ⑦ AC-02c 内訳 | paradise.js:2 state.js:0 control.html:0 index.html:2 | **完全一致** | ✅ |
| ⑦ AC-02c 集計 | 4 | `4` | ✅ |
| ⑦ awk 集計 | 4 | `4` | ✅ |
| 走査1 `\b` 対照 | `1:const v: 3;` / 1 | `1:const v: 3;` / `1` | ✅ |
| 走査3 可用性 | netstat/xargs 在・time 無 | 同左 | ✅ |
| 走査3 AC-12e | 1(正しく赤) | `1` | ✅ |
| 走査4 D-6 exit 2 | pulse.js に exit=2 | `No such file or directory` / exit=2 | ✅ |
| 走査5 非ASCII | ✗ 2 件 / 同時接続 1 件 | `2` / `1` | ✅ |
| 走査6 BRE `\+` | 1 | `1` | ✅ |
| 走査6 AC-N07c | 2 | `2` | ✅ |
| 走査6 AC-01b | 7 | `7` | ✅ |
| 走査6 AC-18b 教訓 | 65 | `65` | ✅ |
| 走査7 AC-02b | 9 | `9` | ✅ |
| 走査7 AC-03a | 2 | `2` | ✅ |
| 走査7 AC-P02a child.kill | 1 | `1` | ✅ |
| 走査7 AC-P02a browser.close | 0 | `0` | ✅ |
| 走査7 AC-21c-1 | 1 | `1` | ✅ |
| 走査7 AC-21c-2 | 3 | `3` | ✅ |
| 走査7 AC-22c | 0 | `0` | ✅ |
| 走査7 枢機卿 | 7 | `7` | ✅ |
| 走査7 engines | 33 | `33` | ✅ |

再走の実出力(抜粋):

```
$ git ls-files -z -- 'overlay/**' 'dashboard/*.html' 'dashboard/*.js' | xargs -0 grep -lE 'https?://(fonts\.googleapis|fonts\.gstatic)' | wc -l
1                          ← AC-12e。期待 0 → 現状 1 = 正しく赤

$ grep -c "fonts.googleapis\|fonts.gstatic" overlay/vendor/archify/assets/template.html
3                          ← AC-12a。期待 0 = 正しく赤
$ grep -c "@font-face\|local('JetBrains Mono')" overlay/vendor/archify/assets/template.html
3                          ← AC-12c。期待 1 以上 = 緑(白紙化していない)

$ grep -c "child.kill()" graph/motion-probe.mjs      →  1   期待 0 = 正しく赤
$ grep -c "browser.close()" graph/motion-probe.mjs   →  0   期待 1以上 = 正しく赤

$ node graph/clergy.js college | grep -c '^枢機卿'    →  7
$ ls graph/*.js | wc -l                               →  33
$ node graph/lessons.js list | grep -c '^'            →  65
$ wc -l < ~/.claude/paradise-kg/nodes.jsonl           →  99
$ node -e "console.log(require('../paradise-creations/tenbin/conclave.json').history.length)"  →  27
$ ls ../paradise-creations/*/conclave.json | wc -l    →  5
```

**判定: §9 の検証ログは捏造ではない。サンプリングした 36 項目すべてが再現した。**
「走らせていない主張は 1 行も含まない」という §9.6 の宣言は、本審査の範囲では**支持される**。

---

## §4. 則1〜4 が文書全体に適用されているか

### 則4 — この機に在るコマンドだけ

```
$ for c in timeout realpath stat xargs netstat comm awk sed sort perl; do printf "%-10s " "$c"; command -v "$c" || echo MISSING; done
timeout    /usr/bin/timeout
realpath   /usr/bin/realpath
stat       /usr/bin/stat
xargs      /usr/bin/xargs
netstat    /c/WINDOWS/system32/netstat
comm       /usr/bin/comm
awk        /usr/bin/awk
sed        /usr/bin/sed
sort       /usr/bin/sort
perl       /usr/bin/perl

$ ls -la /usr/bin/time
ls: cannot access '/usr/bin/time': No such file or directory
```

`timeout` `realpath` `stat` は**本機に在る**(§9.1 則4 は「疑え」と書いており、不在とは書いていない — 正確)。
`/usr/bin/time` のみ不在で、S-2 がそれを回避している。

文書本文の走査(node):

```
=== E: 可用性が疑わしいコマンド ===
851: AC-N01a — 「/usr/bin/time は本機に存在しない(則4)」= 注意書き
862: 「/usr/bin/time -f %e を書いてはならない」= 禁止の明記
-- 本文(§1-8)該当 2 件(いずれも禁止側の記述)/ §9内 16 件
```

**判定: 則4 は適用されている。実行される AC に不在コマンドは 0 件。**

### 則2 — 正規表現の方言をまたぐな

```
=== A: grep -E 系に \| ===          本文 1 件(AC-G05a・修正済みの正しい形)
=== B: grep -E 系に PCRE 構文 ===   本文 0 件
=== F: grep に改行パターン ===      本文 1 件(L416「書いてはならない」の禁止記述)
```

`-E` に残る GNU 拡張は `\b` のみで、対照実験で本機の ERE で機能することを確認した:

```
$ printf 'const v: 3;\nconst vx: 9;\nphases 11 here\n' > b.js
$ grep -nE '\bv: *[0-9]+' b.js
1:const v: 3;               ← vx: 9 にマッチしない = \b が効いている
$ grep -cE '\b(6|11|14|17)\b' b.js
1
```

**判定: 則2 は適用されている。**

### 則1 — 書いた時点で赤を見る

前回と重複しない AC を選んで実走した。**すべて期待どおり赤である**(未実装なのだから赤が正しい):

```
$ grep -o 'data-freshness="[a-z]*"' dashboard/index.html | sort -u | wc -l    →  0   AC-07c 期待 3   = 正しく赤
$ grep -oE 'href="[^"]*\.html"' dashboard/index.html | sort -u | wc -l        →  0   AC-19b          = 正しく赤
$ grep -o 'data-panel="[a-z-]*"' dashboard/index.html | sort -u | wc -l       →  0   AC-19e 期待 8以上 = 正しく赤
$ grep -c 'data-source="gauge-ledger"' dashboard/index.html                   →  0   AC-22c 期待 1以上 = 正しく赤
$ grep -c "同時接続" dashboard/index.html                                      →  0   AC-N03c 期待 1以上 = 正しく赤
$ grep -c 'data-log="transport"' dashboard/index.html                         →  0   AC-RT-1 期待 1以上 = 正しく赤
$ grep -c "no-tests" <(node graph/census.js show --help 2>&1)                 →  0   AC-06c 期待 1以上 = 正しく赤
$ grep -rhoE 'https?://[^"'"'"' )]*' dashboard/ | wc -l                       →  276 AC-N02c 期待 0   = 正しく赤
```

非回帰 AC は緑であるべきで、実際に緑である(則1 の但し書きどおり):

```
$ node graph/derived.js check                    →  exit=0     AC-N05a  緑(正しい)
$ node graph/wiring.js check --json | … .ok      →  true       AC-E2    緑(正しい)
$ grep -c "hardcodedRefs\|path.join(ROOT, 'creations')" tests/paradise.test.js  →  3   AC-04c  緑
$ grep -c "workspace.js check" .github/workflows/tribunal.yml                   →  2   G-03    緑
$ grep -c "derived.js check" .github/workflows/tribunal.yml                     →  1   AC-G08a 緑
```

**FR-04 の門の穴が実在することを、合成の見本で機械証明した**(AC-04d の前提が正しいことの確認):

```
$ printf "const path=require('path');\nconst d = path.join(ROOT, 'creations');\n" > graph/pd-fake-ratify2.js
$ node graph/workspace.js check
✓ 楽園に創造物の混入なし・住所の直書きなし
   exit=0                  ← path.join 形を素通り。AC-04d が命じる「exit 1」に現状なっていない = 正しく赤
$ rm graph/pd-fake-ratify2.js

$ grep -rn "path.join(ROOT, *'creations')" graph/ | wc -l          →  2   旧住所が 2 件実在
$ node graph/workspace.js check 2>&1 | grep -c "census.js\|export-state.js"  →  0   門が名指しできていない
```

**判定: 則1 は適用されている。「修正前は緑だった」新機能 AC は見つからなかった。**

### 則3 — 固定値を期待値にしない

`grep -c … が `0`` 形式の AC を 26 件抽出して個別に検めた。大半は「**違反が 0 件**」= 不変量であり、
明日 1 になることが**そもそも赤の定義**であるから則3 違反ではない。

しかし **1 件、則3 の免除リストにも載らず、かつ照合コマンドが走らないものが残っている**(§5 R-2)。

---

## §5. 残る欠陥(design / build 相への申し送り)

### R-1 — `AC-N05b` に S-9(D-12)の病が残っている【本審査で発見】

**§9.4 の総括表は「`grep -c` の全 38 出現を走査し、欠陥は 2 件(AC-02c / AC-22a)」と申告する。
実際の出現数は本文だけで 44、文書全体で 83 である。走査が網羅していない。**

```
$ node -e '…grep -c の出現を機械計数…'
本文(§1-8) = 44  全体 = 83     ← 総括表の申告は 38
```

漏れたのは **AC-N05b(L927)**:

```
**AC-N05b**: 新設した全テストファイルについて
`grep -c "state.json\|atlas/.*\.html" tests/dashboard-*.test.js` が `0`
```

`tests/dashboard-*.test.js` は **glob であり複数ファイルに展開される**。
将来の状態を合成して、この AC が壊れる様を実証した:

```
--- (a) 新設テストが 1 本だけの時期
$ grep -c "state.json\|atlas/.*\.html" tests/dashboard-*.test.js
0
    exit=1                 ← 素の 0。AC の文面「0」と一致してしまう

--- (b) 新設テストが 2 本以上になった時期(同じ AC・同じコマンド)
tests/dashboard-count.test.js:0
tests/dashboard-links.test.js:0
    exit=1                 ← 内訳。「0」ではない。違反ゼロなのに AC が成立しない

--- (c) 違反を 1 件仕込む(門は赤くならねばならない)
tests/dashboard-count.test.js:0
tests/dashboard-links.test.js:0
tests/dashboard-states.test.js:1
    exit=0                 ← exit が 1→0 に反転。exit で判定すると違反時に緑

--- 正しい集計形なら決定的
$ grep -o "state.json\|atlas/.*\.html" tests/dashboard-*.test.js | wc -l
(c) の状態 = 1   /   違反ゼロ = 0
```

**この AC は二重に壊れている**:
1. **出力形が非決定的** — 新設テストが 1 本のうちは「0」、2 本以上になった瞬間「内訳」に化ける。
2. **exit code が反転する** — 違反 0 件で exit=1、違反 1 件で **exit=0**。exit で裁く実装は**違反時に緑を出す**。

これは §9 が D-12 として明文化した病そのものであり、**第29条を機械強制する門(G-08)の AC** が罹っている。

**是正**(design/build が実装時に必ず適用すること):
```bash
grep -o "state.json\|atlas/.*\.html" tests/dashboard-*.test.js | wc -l    # → 0 を期待
```
かつ **D-6 のとおり `fs.existsSync` で対象の実在を先に assert する**(現時点では対象不在で exit 2 になる):
```
$ ls tests/dashboard-*.test.js
ls: cannot access 'tests/dashboard-*.test.js': No such file or directory
```

**批准を妨げない理由**: 要件(第29条を門で守る)は正しく立っており、欠けているのは書式のみ。
§9 が既に D-12 として一般形を明文化しているため、**是正の型は文書内に在る**。適用漏れが 1 件残っただけである。

### R-2 — `AC-14d` の照合コマンドが走らず、かつ固定値 `17` が期待値のまま【本審査で発見】

```
**AC-14d**: 相の数 — 断面の tenbin の `phasesTotal` が `17`(=`gauge score --json` の `phasesTotal`)と一致すること。
```

文面のコマンドをそのまま走らせた:

```
$ node graph/gauge.js score --json
🔴 ENOENT: no such file or directory, open 'C:\Users\kikus\Documents\workspace\paradise\--json'
    exit=2

$ node graph/gauge.js
commands: score <run.json> [--json] | record <run.json> --slug <s> | baseline | compare <a> <b> | compare --last N | ledger
```

**`gauge score` は run.json を必須引数に取る。`--json` だけでは走らない。**
正しい形は次であり、これなら 17 が取れる:

```
$ node graph/gauge.js score ../paradise-creations/tenbin/conclave.json --json
{"score":100,"complete":true,"phasesTotal":17,"phasesDone":17,"domainsTotal":6,"domainsRatified":6,
 "firstPassRate":1,"reworkCount":0,"retryOverhead":0,"loopGuardTrips":0,"durationMs":13520919}

$ node -e 'console.log(require("./graph/forge.js").buildDag("x","full").tasks.length)'
17                         ← 独立した第2の数え方でも 17
```

**則3 の免除リスト(L779-782)は AC-01b / AC-14b / AC-14h / AC-17a / AC-18b / AC-21a〜c を挙げるが、
`AC-14d` は入っていない。** ゆえに AC-14d の `17` は「参考値」と読み替える根拠を持たず、**固定値のまま残っている**。

**是正**: 引数を補い、固定値を捨てて 2 値一致に改める:
```bash
node graph/gauge.js score ../paradise-creations/tenbin/conclave.json --json | node -e '….phasesTotal'
node -e 'console.log(require("./graph/forge.js").buildDag("x","full").tasks.length)'
# 期待: 上記 2 値が一致(現時点ではいずれも 17 だが、これは期待値ではない)
```

**批准を妨げない理由**: 「相の数が断面と engine で一致すること」という要件は正しい。
壊れているのは引数 1 個と、免除リストへの記載漏れである。design が引数を補えば成立する。

### 参考 — R-2 と同根だが要件としては健全なもの

`AC-05d` が突合対象とする行は**実在した**(こちらは走る):

```
$ node graph/conclave.js status --run ../paradise-creations/tenbin/conclave.json | grep -c "domains ratified"
1
$ … | tail -1
domains ratified: 6/6
```

ただし `conclave.js status --run` は **slug ではなく path** を取る(`--run tenbin` は ENOENT で落ちる)。
これは §9 の D-6 と同種の「実装時に踏む罠」であり、**D-13 として build に申し送るべき**である。

`AC-14e` が名指す `reform-claude-md-diet` **5/11** は、機械で数えて一致した:

```
$ node -e '…domains[].phases を舐めて done/total を数える…'
phases done/total = 5/11
```

---

## §6. design 相への申し送り

1. **R-1(AC-N05b)を実装前に書き換えよ。** `grep -o … | wc -l` の集計形にし、
   `fs.existsSync` で対象の実在を先に assert する。**exit code で裁いてはならない** — 違反時に反転する。
2. **R-2(AC-14d)に引数を補え。** `gauge score <run.json> --json` が正しい形。
   併せて `17` を固定値から外し、`forge.buildDag(wish,'full').tasks.length` との一致で測れ。
3. **D-13(新規)**: `conclave.js status --run` は **slug ではなく conclave.json への path** を取る。
   `--run tenbin` は ENOENT で落ちる。AC-05d / AC-14b を実装するテストはこれを踏む。
4. **§9.4 の走査結果を再走査せよ。** 総括表の「全 38 出現」は実測 44(本文)/ 83(全体)で、
   走査自体が網羅していなかった。**同じ手法で `grep -c` の全 83 出現を洗い直すこと**が R-1 の再発を防ぐ。
5. **印を省くな**(§9.5 の再確認)。`data-contradiction`(AC-13e)と `data-run-state`(AC-14i)は
   specify が定めた**測れる形**である。design が決めてよいのは**どう見せるか**だけであり、
   **印そのものを省いてはならない**。両 AC は現時点で正しく赤である(§2 で実証)。
6. **則1〜4 を新規 AC にも適用せよ。** design が AC を足すときは、
   **書いた時点で走らせ、赤を見てから**文書に載せること。§9 が示した型を踏襲せよ。

---

## §7. 本報告の検証

```
$ wc -c reform/dashboard-living-gate/ratify-requirements-2.md
27122 reform/dashboard-living-gate/ratify-requirements-2.md

$ grep -c '' reform/dashboard-living-gate/ratify-requirements-2.md
576

$ git status --porcelain reform/dashboard-living-gate/
?? reform/dashboard-living-gate/ratify-requirements-2.md      ← 本報告のみ。作業屑なし

$ git status --porcelain                                       # 楽園の作業樹全体
?? reform/dashboard-living-gate/ratify-requirements-2.md      ← 他に汚れなし

$ ls "$LOCALAPPDATA/Temp/pd-ratify2/"                          # 合成の見本(楽園の外)
b.js  b1.sh  b2.sh  b3.sh  b4.sh  b5.sh  b6.sh  b7.sh  bad.js  ci.txt
fake  fake2  good.js  ja.txt  mark.txt  r.txt  req.js  scan.js  scan2.js
sse-broken.txt  sse-half.txt  sse-ok.txt  ws.out
```

**AC-04d の検証で `graph/` に置いた合成の見本 `graph/pd-fake-ratify2.js` は削除済み**
(上の `git status --porcelain` が `graph/` に何も出していないことがその証明)。

**本報告に書かれたコマンドと出力は、すべて実際に走らせたものである。走らせていない主張は 1 行も含まない。**

---

## §8. 結語

**verdict: ratify**

前回 reject した 4 欠陥は**すべて是正された**。神官が自力発見したと申告する 5 件は**すべて実在の欠陥であり、
すべて是正された** — 主眼であった `grep -cE "a\|b"` のリテラル化(S-8)と `grep -c` の複数ファイル問題(S-9)は、
合成の見本と実ファイルの双方で対照実験し、**修正が効いていることを確認した**。
§9 の検証ログは**サンプリングした 36 項目すべてが再現**し、捏造ではない。

残る 2 件(R-1 / R-2)は**書式の適用漏れ**であり、要件そのものの欠落ではない。
是正の型は §9 の D-12 / 則3 として**文書内に既に在る**。差戻す水準ではない。

**前回 reject した手前という義理で reject はしない。直っているから批准する。**
残欠陥は design 相への申し送りとして持ち越し、**§6 の 6 項目を design が受け取ること**を批准の条件とする。
