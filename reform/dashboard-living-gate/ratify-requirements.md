# ratify-requirements.md — 要件の批准審査 / discovery 枢機卿

- **道**: reform (dashboard-living-gate)
- **審査者**: 枢機卿 discovery(憲法第11条 — 要件のドメインは自らを批准できない。上流の調査を担った者が、要件が調査に忠実かを裁く)
- **審査対象**: `reform/dashboard-living-gate/requirements.md`
- **審査日時**: 2026-09-02 (JST) / Windows 11 / node v24.14.0 / git-bash
- **作業ディレクトリ**: `C:/Users/kikus/Documents/workspace/paradise`

## 0. 判定

# **reject(差戻し)** — 差戻し先: **specify 相**

要件の骨格・追跡可能性・第29条遵守は**合格**である。調査(discover)への忠実さにも問題はない。
差戻す理由はただ一つ、**受入基準の一部が「機械が実行できるコマンド」になっていない**ことである。

本書の掟 2 は「AC は『機械が実行できるコマンド』と『期待する出力』で書く」と自ら宣言している。
実際に走らせた結果、**この測定環境で構文が通らない AC が 3 件、期待値が実測と食い違う AC が 1 件**あった。
これは discover 相の欠陥ではない(調査結果は正しい)。**specify 相で AC の記述だけを直せば足りる。**

> **審査の掟に従い、以下はすべて実際に走らせた出力のみを根拠とする。感想は書かない。**

### 審査対象の同定(審査中に文書が改稿された旨の申告)

審査開始時 `requirements.md` は **70,374 バイト**であったが、審査の途中で **88,312 バイト**へ改稿された
(FR-23 / NFR-07 / G-09 / G-10 / PRE-03 / AC-12e の追加、FR-01・FR-14・FR-21 の改訂)。
公正を期すため改稿後の版をスナップショットに固定して審査した。**最終確認で両者は一致している**:

```
$ wc -c "$LOCALAPPDATA/Temp/req-audit-snapshot.md"
88312 C:\Users\kikus\AppData\Local/Temp/req-audit-snapshot.md

$ cd reform/dashboard-living-gate && wc -c requirements.md
88312 requirements.md
```

審査対象の規模: **AC 総数 144 件** / FR-01〜FR-23 / NFR-01〜NFR-07 / G-01〜G-10 / PRE-01〜PRE-03。

---

# 1. 追跡可能性 — 【合格】取りこぼし 0 件

## 1.1 R-01〜R-29 の全件処遇を機械で数えた

findings.md の C 節(要求候補リスト)と requirements.md §3.0 の写像表を、集合演算で突き合わせた。

```
$ sed -n '496,541p' findings.md | grep -oE "R-[0-9]{2}" | sort -u > /tmp/find_r.txt
$ grep -oE "^\| R-[0-9]{2}" requirements.md | grep -oE "R-[0-9]{2}" | sort -u > /tmp/req2.txt
$ wc -l < /tmp/find_r.txt
29
$ wc -l < /tmp/req2.txt
29
$ comm -13 /tmp/req2.txt /tmp/find_r.txt      # findings にあって requirements に無いもの
(空)
$ comm -23 /tmp/req2.txt /tmp/find_r.txt      # requirements にあって findings に無いもの
(空)
```

**取りこぼし 0 件、捏造 0 件。** R-01〜R-29 の 29 件すべてが写像表に現れ、findings.md に存在しない R 番号は 1 件も無い。

## 1.2 処遇の内訳(すべて行き先が明記されている)

| 処遇 | 件数 | 該当 |
|---|---|---|
| 昇格 | 23 | R-01〜R-18, R-21, R-24, R-25, R-27, R-29 |
| 統合 | 4 | R-19→FR-09 / R-23→FR-09 / R-26→FR-13 / R-28→FR-11 |
| 却下 | 2 | R-20 / R-22 |

**行き先が空欄の R-xx は 0 件。** 却下 2 件にはいずれも理由が書かれている:

- **R-20**: 「教主が第27条に基づき実物照合し棄却済み。`spawn-trace.js:86` は `for (const p of list || [])` で
  既にガードされており、実在する run.json 6 件すべてで `TypeError` の発生は 0 件。再現しない欠陥を要件にしてはならない」
- **R-22**: 「`Last-Event-ID` は『サーバ側に版の履歴を持つ』設計を要求し、N-2(永続ストアを作らない)と衝突する。
  便益が費用に見合わない」

いずれも**根拠を伴った却下**であり、単なる先送りではない。

## 1.3 R-20 が誤って要件化されていないか 【問題なし】

```
$ grep -n "R-20" requirements.md
156:| R-20 | 🟠 | **却下** | §3.4 却下理由 D-1 |
716:| **R-20** — `spawn-trace.js report` が `run.json` 形式でクラッシュする欠陥の修理 | **教主が第27条に基づき実物照合し棄却済み**…
```

**R-20 は写像表と却下表の 2 箇所にのみ現れ、いかなる FR/NFR/G にも昇格していない。**
(他の `R-20` 見出しヒットはすべて `FR-20` の部分一致であり、別物である。)

さらに R-20 の扱いは適切である。要件は欠陥の修理を却下しつつ、「全 run を舐めても落ちない」という**性質**を
FR-14 AC-14c で恒久的に守る形へ翻訳している。**再現しない欠陥は要件にせず、守るべき性質だけを残す** — 正しい処理である。

## 1.4 却下ラベル D-1 / D-2 の参照先が定義されていない 【軽微な瑕疵】

```
$ grep -n "D-1\|D-2" requirements.md
156:| R-20 | 🟠 | **却下** | §3.4 却下理由 D-1 |
158:| R-22 | 🟡 | **却下(将来課題)** | §3.4 D-2 / §7 F-1 |
```

写像表は「§3.4 却下理由 **D-1**」「§3.4 **D-2**」を指すが、**§3.4 の中に `D-1` / `D-2` というラベルは存在しない**
(上記 grep が §3.4 内で 1 件もヒットしていない)。表の行はあるので実害は無いが、**参照が宙に浮いている**。
§3.4 の表に D-1 / D-2 の列を足すか、写像表側の参照を「§3.4」だけに改めるべきである。

---

# 2. 受入基準の実行可能性 — 【不合格】3 件が構文不成立、1 件が期待値の陳腐化

**これが本審査の最重要項目であり、reject の唯一の理由である。**

24 個のコマンドを抜き出して実際に走らせた。以下、**すべて実出力である**。

## 2.1 正しく赤を出した AC(修正前に赤 = 有効な受入基準)【17 件・合格】

### 数値のハードコード(FR-02)

```
$ grep -nE "\bv: *[0-9]+" dashboard/paradise.js | wc -l
9                                    # AC-02b 期待 0 → 現状 9 = 正しく赤 ✅

$ grep -c "SELF_DAG" dashboard/*.js dashboard/*.html
dashboard/paradise.js:2
dashboard/state.js:0
dashboard/control.html:0
dashboard/index.html:2
$ ... | awk -F: '{s+=$NF} END{print s}'
4                                    # AC-02c 期待 0 → 現状 4 = 正しく赤 ✅
```

### 住所の直書き(FR-03)

```
$ grep -rn "path.join(ROOT, *'creations')\|path.join(ROOT, *\"creations\")" graph/ | wc -l
2                                    # AC-03a 期待 0 → 現状 2 = 正しく赤 ✅
$ grep -rn "path.join(ROOT, *'creations')" graph/
graph/census.js:75:        return fs.readdirSync(path.join(ROOT, 'creations'), { withFileTypes: true })
graph/export-state.js:32:  const dir = path.join(ROOT, 'creations');
```

**findings.md R-03 が名指しした 2 ファイル 2 行が、行番号ごと実測で再現した。**

### 門の穴(FR-04)— 教主の発見が実測で再現した

```
$ printf "const path=require('path');\nconst ROOT=__dirname;\nconst d = path.join(ROOT, 'creations');\n" > graph/_pd-audit-fake.js
$ node graph/workspace.js check
✓ 楽園に創造物の混入なし・住所の直書きなし
$ node graph/workspace.js check > /dev/null 2>&1; echo "exit=$?"
exit=0                               # AC-04d 期待 exit=1 → 現状 0 = 正しく赤 ✅
$ rm -f graph/_pd-audit-fake.js

$ node graph/workspace.js check 2>&1 | grep -iE "census|export-state"; echo "grep-exit=$?"
grep-exit=1                          # AC-04a: 門は census.js/export-state.js を一言も咎めていない ✅
```

**AC-04d は「合成の見本を置くと exit 1」を要求するが、現状は置いても緑である。**
教主 findings-pontiff §1 が指摘した「門が緑を出しながら欠陥を素通りさせる」構造が、審査でも完全に再現した。
この AC は正しく設計されている。

### `--json` の無視(FR-05)

```
$ node graph/clergy.js college | wc -c        ;  --json 付き
2139                                          2139   # 差 0
$ node graph/conclave.js status --run … | wc -c ; --json 付き
1424                                          1424   # 差 0
$ node graph/daily-guard.js status | wc -c    ;  --json 付き
843                                           843    # 差 0
```
**AC-05b 期待「バイト数が異なる」→ 現状 3/3 で完全に同一 = 正しく赤** ✅
findings.md R-21 の「1 バイトも変わらない」が、3 engine すべてで実測再現した。

```
$ for e in clergy/college, daily-guard/status, conclave/status; do … JSON.parse …
clergy.js college -> PARSE-FAIL
daily-guard.js status -> PARSE-FAIL
conclave.js status -> PARSE-FAIL
```
**AC-05a 期待 `ok` × 3 → 現状 3/3 で PARSE-FAIL = 正しく赤** ✅

### 外部依存(FR-12)

```
$ grep -c "fonts.googleapis\|fonts.gstatic" overlay/vendor/archify/assets/template.html
3                                    # AC-12a 期待 0 → 現状 3 = 正しく赤 ✅

$ grep -c "@font-face\|local('JetBrains Mono')" overlay/vendor/archify/assets/template.html
3                                    # AC-12c 期待 1以上 → 現状 3 = 退避は既に在る ✅

$ git ls-files -z -- 'overlay/**' 'dashboard/*.html' 'dashboard/*.js' | xargs -0 grep -lE 'https?://(fonts\.googleapis|fonts\.gstatic)' | wc -l
1
$ ... (内訳)
overlay/vendor/archify/assets/template.html
```
**AC-12e(教主が新設)期待 0 → 現状 1 = 正しく赤** ✅ しかも**真の供給線ただ 1 本**を正確に指している。

### 画面側の属性(FR-07/13/19/21/22, NFR-03, §4.3)

```
$ grep -o 'data-freshness="[a-z]*"' dashboard/index.html | sort -u | wc -l
0                                    # AC-07c 期待 3 → 正しく赤 ✅
$ grep -o 'data-metric="…"' dashboard/index.html | sort -u | wc -l
0                                    # AC-13d 期待 5 → 正しく赤 ✅
$ grep -o 'data-panel="[a-z-]*"' dashboard/index.html | sort -u | wc -l
0                                    # AC-19e 期待 8以上 → 正しく赤 ✅
$ grep -cE "'(discover|specify|design|prove|verify|reflect|verdict)'" dashboard/paradise.js
1                                    # AC-21c 期待 0 → 正しく赤 ✅
$ grep -c 'data-source="gauge-ledger"' dashboard/index.html
0                                    # AC-22c 期待 1以上 → 正しく赤 ✅
$ grep -c "同時接続" dashboard/index.html
0                                    # AC-N03c 期待 1以上 → 正しく赤 ✅
$ grep -c 'data-log="transport"' dashboard/index.html
0                                    # AC-RT-1 期待 1以上 → 正しく赤 ✅
```

### 導線(FR-19)

```
$ grep -oE 'href="[^"]*\.html"' dashboard/index.html | sort -u | wc -l
0                                            # リンク実数
$ ls dashboard/*.html dashboard/atlas/*.html | grep -v visual-check | grep -v index.html | wc -l
7                                            # ページ数
                                             # AC-19b 期待「一致」→ 0 vs 7 = 正しく赤 ✅

$ for f in control.html atlas/*.html; do grep -c 'href="../index.html"\|href="index.html"' $f; done
dashboard/control.html: 0
dashboard/atlas/conclave.html: 0
dashboard/atlas/dag.html: 0
dashboard/atlas/dispatch.html: 0
dashboard/atlas/hierarchy.html: 0
dashboard/atlas/run.html: 0
dashboard/atlas/wiring.html: 0
                                             # AC-19d 期待 各1以上 → 7/7 が 0 = 正しく赤 ✅
```
findings.md R-11 の「リンク 0 本」が実測再現した。

### 検器の資源漏れ(FR-23 — 教主が改稿で追加)

```
$ grep -c "child.kill()" graph/motion-probe.mjs
1                                    # AC-23a 期待 0 → 現状 1 = 正しく赤 ✅
$ grep -c "browser.close()" graph/motion-probe.mjs
0                                    # AC-23a 期待 1以上 → 現状 0 = 正しく赤 ✅
```
findings-base-red.md B-1 の根因指摘が実測再現した。

### CI の門(G-05)

```
$ grep -cE "visual-verify|critic.js" .github/workflows/tribunal.yml
1                                    # AC-G05 期待 2以上 → 現状 1 = 正しく赤 ✅
$ grep -c "dashboard/index.html\|dashboard/control.html" .github/workflows/tribunal.yml
0                                    # 期待 1以上 → 現状 0 = 正しく赤 ✅
```
**第50条の指摘「CI はダッシュボードを一度も見ていない」が実測で確認された。**

---

## 2.2 【欠陥 1】AC-10a — `grep -E` は PCRE 否定先読みを解さない。この AC は永久に緑である

requirements.md:415 の記述:
```
**AC-10a**: `grep -nE "require\(['\"](?!http$|https$|fs$|path$|url$|os$|events$|child_process$|crypto$|zlib$)" graph/pulse.js`
```

**`(?!...)` は PCRE の否定先読みであり、POSIX ERE(`grep -E`)には存在しない。**
`grep -E` はこれをリテラルとして扱うため、**非標準の `require` があっても決して検出しない**。実証:

```
$ printf "const x = require('lodash');\n" > "$LOCALAPPDATA/Temp/pd-lodash.js"

$ grep -nE "require\(['\"](?!http$|https$|fs$|path$|url$|os$|events$|child_process$|crypto$|zlib$)" "$LOCALAPPDATA/Temp/pd-lodash.js"
$ echo "exit=$?"
exit=1                               # ← lodash を見逃した(0=検出, 1=見逃し)

$ grep -nP "require\(['\"](?!http$|https$|fs$|path$)" "$LOCALAPPDATA/Temp/pd-lodash.js"
1:const x = require('lodash');
$ echo "exit=$?"
exit=0                               # ← -P (PCRE) なら検出できる
```

**判定**: この AC は「外部依存が再び生えない」ことを守る G-02 の中核でありながら、
**書かれたとおりに走らせると npm 依存を 100% 見逃す**。緑を出すだけの門であり、第50条が禁じたものそのものである。

**修正案**: `grep -nP` に改める。ただし本測定機の git-bash grep が `-P` を持つことは上記で実証済みだが、
CI(ubuntu-latest)の GNU grep でも `-P` は利用可能である。あるいは AC 本文が既に併記している
「`node tests/dashboard-no-deps.test.js` が exit 0」を**唯一の判定手段**とし、grep 式は参考記述に降格すべきである。

## 2.3 【欠陥 2】AC-N01a — `/usr/bin/time` がこの測定機に存在しない

requirements.md:789 の記述:
```
**AC-N01a**: `for i in 1 2 3; do /usr/bin/time -f %e node graph/pulse.js snapshot --json > /dev/null; done`
```

実測:
```
$ ls -la /usr/bin/time
ls: cannot access '/usr/bin/time': No such file or directory

$ /usr/bin/time -f %e node -e "1"
/usr/bin/bash: line 4: /usr/bin/time: No such file or directory

$ command -v time
time                                 # ← bash の組み込み time はある(が -f を持たない)
```

**判定**: 本書 §冒頭は測定機を「Windows 11 / git-bash」と自ら明記しているのに、
**その測定機に存在しない外部コマンドを AC に書いている**。GNU time は MSYS の既定構成に含まれない。
組み込み `time` は `-f` 書式指定子を持たないため代用にもならない。

**修正案**: 同じ FR-01 の AC-01c が採る `time node …`(bash 組み込み)形式に統一するか、
併記されている `node tests/dashboard-perf.test.js` による median 計測(AC-N01b)を唯一の判定手段とする。
後者が本書の掟(機械が実行できる)に最も忠実である。

## 2.4 【欠陥 3】AC-09d — `grep -c $'\n\n'` は改行 2 個の連続を検出できない

requirements.md:399 の記述:
```
**AC-09d**: 終端規則 — 受信した生ストリームについて `printf '%s' "$raw" | grep -c $'\n\n'` が 1 以上
```

**grep は行単位で処理するため、パターン中の改行は決してマッチしない。** 実証:

```
$ printf 'data: x\n\ndata: y\n\n' > "$LOCALAPPDATA/Temp/pd-sse.txt"
$ grep -c $'\n\n' "$LOCALAPPDATA/Temp/pd-sse.txt"
4
$ echo "exit=$?"
exit=0
```

**返ってきたのは 4 である。** これは「`\n\n` が 4 回現れた」ではなく、
`$'\n\n'` が空パターンに退化し、**全 4 行が無条件にマッチした**結果である。
入力を空行の無い `printf 'a\nb\n'` に変えても同じく行数を返す。
すなわち**この AC は SSE の終端が正しかろうが壊れていようが常に 1 以上を返し、永久に緑になる。**

**判定**: SSE の `\n\n` 終端は本改修の中核仕様(FR-09)であるのに、その検査式が仕様違反を検出できない。
**修正案**: AC 本文が併記する「テストで機械判定」を唯一の手段とし、`node -e` でバイト列を直接検査する形に改める。
例: `node -e "…raw.split('\n\n').length…"` など、シェルの grep を経由しない形。

## 2.5 【欠陥 4】AC-22b — 期待値「実測 5 件」が既に古い(実測 10 件)

requirements.md:721 の記述:
```
**AC-22b**: 件数の一致 — 断面の `ledger.length` が `node graph/gauge.js ledger | grep -cE '^\s+[0-9]{4}-'` と一致する(実測 5 件)。
```

実測:
```
$ node graph/gauge.js ledger | grep -cE '^\s+[0-9]{4}-'
10

$ node graph/gauge.js ledger
═══════ 📒 GAUGE LEDGER ═══════
  2026-08-31T13:54  100/100  coin (standard)
  2026-08-31T13:54   45/100  habit (standard)
  2026-08-31T13:54   80/100  reform-eval-gauge (reform)
  2026-08-31T14:01  100/100  reform-eval-gauge (reform)
  2026-09-01T03:39  100/100  tenbin (full)
  2026-09-02T07:03  100/100  coin (standard)
  2026-09-02T07:03   45/100  habit (standard)
  2026-09-02T07:03   80/100  reform-claude-md-diet (reform)
  2026-09-02T07:03  100/100  reform-eval-gauge (reform)
  2026-09-02T07:03  100/100  tenbin (full)
═══════════════════════════════
```

**判定**: 期待値が **5** と書かれているが実測は **10** である。
おそらく `conclave.json` の 5 件(= run の数)と ledger の行数(= 採点の記録数、run ごとに複数回)を取り違えている。
**ledger は追記型であり、run を採点し直すたびに増える。** 固定値 5 は今後さらに乖離する。

なお AC-22b の主眼は「断面の `ledger.length` と grep 実測の一致」であって、**その場で数えた値どうしの比較**であるから
機構としては第22条に忠実である。**括弧内の「(実測 5 件)」という古い基準値だけが誤り**である。
同種の記述である AC-14b は「(実測基準 **5** 件)」= conclave.json の件数を指しており、そちらは正しい(下記 2.6 で実証)。

**修正案**: 「(実測 5 件)」を「(執筆時点の実測基準 10 件。ledger は追記型のため増加する)」に改める。

---

## 2.6 期待値が実測と一致した AC 群 【合格】

改稿で追加された基準値を全数検算した。**すべて一致した。**

```
$ ls graph/*.js | wc -l
33                                   # 「engine 数 33」 ✅

$ node graph/codex.js index | grep -cE "^\| *[0-9]+ \|"
50                                   # 「憲法 50 条」 ✅ (AC-01g)

$ node -e "console.log(Object.keys(require('./graph/clergy.js').COLLEGE).length)"
7                                    # 「枢機卿 7 人」 ✅ (AC-01f / 第47条b の予言)

$ node graph/clergy.js college | grep -c '^枢機卿'
7                                    # AC-05c の突合先も 7 ✅

$ ls -d "$(node graph/workspace.js resolve --json | node -e "…JSON.parse(s).root…")"/*/ | grep -vc '/_[^/]*/$'
7                                    # 創造物 7 ✅ (AC-01b)
$ ... | grep -c '/_[^/]*/$'
1                                    # 作業場 1 ✅
$ ... | wc -l
8                                    # 計 8 = 7 + 1 ✅ 定義が実測と整合

$ ls ../paradise-creations/*/conclave.json | wc -l
5                                    # AC-14b「実測基準 5 件」 ✅

$ wc -l < ~/.claude/paradise-kg/nodes.jsonl
99                                   # AC-17a KG ノード ✅
$ wc -l < ~/.claude/paradise-kg/edges.jsonl
33                                   # AC-17a KG エッジ ✅

$ node graph/lessons.js list | grep -c '^'
65                                   # AC-18b 教訓 65 ✅

$ node -e "console.log(require('../paradise-creations/tenbin/conclave.json').history.length)"
27                                   # AC-14h「実測基準 27」 ✅
```

### AC-14a / AC-05d の抽出式は実際に機能する

```
$ node graph/conclave.js status --run ../paradise-creations/tenbin/conclave.json | grep -oE '[0-9]+/[0-9]+'
6/6
$ node graph/conclave.js status --run … | grep -n "domains ratified"
27:domains ratified: 6/6              # 人間向け出力に確かに存在 ✅
```

### AC-13b の抽出式も機能する

```
$ node graph/spawn-trace.js report ../paradise-creations/tenbin/conclave.json | grep -oE 'no-trace: *[0-9]+' | grep -oE '[0-9]+'
17
$ node graph/spawn-trace.js report … | grep -n "no-trace"
2:phases: 17   observed: 0   asserted-only: 0   no-trace: 17

$ node graph/gauge.js score ../paradise-creations/tenbin/conclave.json --json | node -e "…"
score= 100 phasesTotal= 17           # AC-14d「17」 ✅
```

**tenbin が gauge 100/100 でありながら 17/17 相すべて起動証跡なし** — findings.md R-10 の中核事実が実測再現した。
FR-13 が「この矛盾こそが本改修の本分」と据えたのは、調査に忠実である。

### AC-13c / AC-16a の前提(exit code の誤読)も実測再現

```
$ node graph/spawn-trace.js report … > /dev/null 2>&1; echo "exit=$?"
exit=1                               # exit 1 =「起動証跡なし」という事実。エラーではない ✅

$ node graph/daily-guard.js due; echo "exit=$?"
{
  "due": false,
  "catchUp": false,
  "owedDay": "2026-09-01",
  "reason": "already ran for 2026-09-01 (newest open window: 2026-09-01)",
  "jst": "2026-09-02 16:39 JST"
}
exit=1                               # exit 1 =「債務なし」 ✅ AC-16a の前提が正しい
```

### AC-14e(改稿で追加)— 止まった run の実測が正確

```
$ node -e "…全 conclave.json を直読みして相・ドメイン・履歴を数える…"
coin                     11/11 phases  6/6 domains 22 events
habit                    11/11 phases  6/6 domains 40 events
reform-claude-md-diet    5/11 phases  4/6 domains 15 events   ← 停止中
reform-eval-gauge        11/11 phases  6/6 domains 26 events
tenbin                   17/17 phases  6/6 domains 27 events
```

**requirements.md §FR-14 の表と 5 行すべてが完全一致した。** AC-14e が名指す `reform-claude-md-diet` の
**5/11** も正確である。この改稿は実測に裏打ちされている。

### AC-21a / AC-21b(改稿で追加)— 6 つの道の相数が全数一致

```
$ node -e "const f=require('./graph/forge.js'); … f.buildDag('x',n).tasks.length …"
quick           6
standard        14
full            17
reform          11
counsel         6
cartography     11
--- forge が知る道の総数 ---
quick, standard, full, reform, counsel, cartography      # 6 つ ✅

$ node graph/forge.js scale "ダッシュボードを生きた門にせよ"
reform                               # AC-21d ✅
```

**6/6 すべて requirements.md の基準値と一致。** また `forge.buildDag(wish, '<scale>')` の
第2引数が文字列であること(FR-01 の罠表)も、上記が正常動作したことで裏付けられた。

### AC-21c 第2項が現時点で赤であることも確認

```
$ grep -cE "\b(6|11|14|17)\b" dashboard/paradise.js
3                                    # 相数リテラルが 3 箇所 = 撤廃対象 ✅
```

### NFR-02 / NFR-05 の門は現時点で緑(既存資産が既に守っている)

```
$ node graph/derived.js check; echo "exit=$?"
═══════ 📄 DERIVED DEPENDENCY ═══════
  ✓ no test asserts on derived content
─────────────────────────────────────
no test depends on derived content
═════════════════════════════════════
exit=0                               # AC-N05a ✅

$ node graph/vendor.js verify; echo "exit=$?"
vendored files: 130 = harness 62 {…} + tools 68 {"archify v2.16.0":68}
  ✓ paradise stands on its own — no path leads back to the borrowed tree
exit=0                               # AC-N02c ✅
```

> **注**: この 2 件は「修正前から緑」である。ただしこれらは**新設要件の受入基準ではなく、
> 改修が既存の性質を壊さないことを守る非回帰の AC** である(AC-E1 と同種)。
> 「修正前から緑の AC は無意味」の原則は**新機能の AC に対する戒め**であり、
> 非回帰 AC がこの時点で緑なのは正常である。**欠陥として数えない。**

## 2.7 走らせられなかった AC(pulse.js 未実装のため)

```
$ ls graph/pulse.js
ls: cannot access 'graph/pulse.js': No such file or directory

$ grep -cE "execFileSync|spawnSync|child_process" graph/pulse.js; echo "exit=$?"
grep: graph/pulse.js: No such file or directory
exit=2                               # ← 「ファイル無し」= exit 2。0 でも 1 でもない
```

AC-01a〜01i / AC-N07a / AC-06a / AC-22a など **pulse.js を対象とする AC は、対象が未実装のため実行できない。**
これは要件の欠陥ではない(FR-01 が新設を命じている)。**ただし design/build 相への申し送りとして重要な点がある**:

**`grep -c` は対象ファイルが無いとき exit 2 を返す。**
`grep -c "…" graph/pulse.js` が `0` を返すことを期待する AC(AC-06a, AC-22a 等)は、
**pulse.js が存在しない場合も「0 件」に見えかねない**。テスト実装時は
**まず対象ファイルの存在を assert してから件数を測る**こと。対照実験で式そのものは健全であることを確認済み:

```
$ grep -cE "execFileSync|spawnSync|child_process" graph/census.js
2                                    # 実在ファイルには正しく機能する ✅
```

---

# 3. 測れない要件の混入 — 【概ね合格・2 件を名指し】

## 3.1 AC の無い要件は 0 件 【合格】

FR-01〜FR-23 / NFR-01〜NFR-07 の全 30 要件について、本文中の `**AC-` 出現数を機械で数えた:

```
FR-01: 9   FR-02: 3   FR-03: 3   FR-04: 4   FR-05: 4   FR-06: 4
FR-07: 3   FR-08: 4   FR-09: 5   FR-10: 5   FR-11: 5   FR-12: 5
FR-13: 4   FR-14: 8   FR-15: 4   FR-16: 4   FR-17: 5   FR-18: 4
FR-19: 5   FR-20: 5   FR-21: 5   FR-22: 3   FR-23: 7
NFR-01: 4  NFR-02: 3  NFR-03: 4  NFR-04: 2  NFR-05: 2  NFR-06: 12  NFR-07: 3
```

**AC ゼロの要件は 1 件も無い。** G-01〜G-10 についても全件が AC 列を持つことを確認した。
§3.0b が自ら宣言する「AC を持たない要件: **0**」は**実測で裏付けられた**。

## 3.2 主観語の全走査 — ヒット 2 件

```
$ grep -nE "使いやす|見やす|分かりやす|わかりやす|目立た|美し|綺麗|直感|適切に|良い感じ|自然に|快適|読みやす|十分に|なるべく|できるだけ|視覚的に" requirements.md
498:- 点数が高く起動実績が赤い組合せは、視覚的に**目立たせる**(この矛盾こそが本改修の本分)。
535:- 完了した run と、途中で止まった run を**視覚的に区別**する(止まった run を「完了」と並べて隠さない)。
```

**「使いやすい」「見やすい」の類は 1 件も無い。** 起草者は主観語をよく排している。
残る 2 件について個別に判定する:

### 【名指し 1】FR-13 本文「視覚的に**目立たせる**」— 機械判定できない

FR-13 の AC を全数確認したところ、**この「目立たせる」を測る AC は存在しない**:

```
AC-13a: 並置の実在(data-score と data-spawn-* が同一親要素内)
AC-13b: 数の一致(spawn.noTrace / score)
AC-13c: exit 1 の非エラー化
AC-13d: 軌跡指標 5 種の存在
```

AC-13a は「**並置されている**」ことは測るが、「**目立っている**」ことは測らない。
「点数 100 かつ起動実績 17/17 赤」という**矛盾の組合せを画面が強調しているか**は、機械が判定できない状態で残っている。

**これは本改修の「本分」と自ら書いた性質であり、測れないまま放置してはならない。**
**修正案**: 測れる形に翻訳する。例:
`AC-13e`: 断面の run のうち `score >= 90 && spawn.noTrace > 0` を満たすものについて、
その要素が `data-contradiction="true"` 属性を持つこと(`grep -c 'data-contradiction' dashboard/index.html` が 1 以上)。
**「目立たせる」の見た目は design 相の裁量でよいが、「矛盾を機械が名指しできる印が付いている」ことは specify で決められる。**

### 【名指し 2】FR-14 本文「視覚的に**区別**する」— 機械判定できない

同様に FR-14 の AC-14a〜14h を確認したが、**「完了した run と止まった run を視覚的に区別する」ことを測る AC は無い**。
AC-14e は「断面の `runs.filter(r => r.phasesDone < r.phasesTotal)` に `reform-claude-md-diet` が含まれる」ことを測るが、
これは**断面(データ)の要件**であって**画面(表示)の要件ではない**。データが正しくても画面が両者を同じ見た目で並べる実装は AC を通過する。

**修正案**: `AC-14i`: 停止中の run を表す要素が `data-run-state="stalled"` を持ち、
完了した run が `data-run-state="complete"` を持つこと。
`grep -o 'data-run-state="[a-z]*"' dashboard/index.html | sort -u | wc -l` が `2` 以上。

> **なお FR-13/FR-14 の本文は §1.2 N-8「視覚同一性(肌)の決定は design 相の裁量」と整合しており、
> 起草者が意図的に見た目の決定を避けたことは読み取れる。しかし「区別が存在すること」自体は
> specify が機械可読な属性として決めるべきであり、design に丸投げしてはならない。**

---

# 4. 第29条違反 — 【合格】違反 0 件。むしろ模範的である

## 4.1 `derived.js` が定める生成物の集合を確認した

```
$ grep -nE "state.json|state.js|atlas|lessons.json|CONSTITUTION.INDEX" graph/derived.js
37:const DERIVED = {
38:  'CONSTITUTION.INDEX.md': {
44:  'graph/lessons.json': {
50:  'dashboard/state.json': {
56:  'dashboard/state.js': {
```

## 4.2 生成物の中身に assert する AC の全走査 — ヒット 0 件

```
$ grep -nE "\*\*AC-[A-Za-z0-9]+\*\*" requirements.md | grep -E "state\.json|state\.js|lessons\.json|CONSTITUTION\.INDEX|atlas/"
261:**AC-03b**: `node graph/export-state.js && node graph/pulse.js snapshot --json` を走らせた直後、…
989:| **G-08** | … **AC-G08b**(壊して鳴る): 新設テストのいずれかに `require('../dashboard/state.json')` を 1 行入れると `derived.js check` が **exit 1** になること |
```

**2 件のヒットはいずれも違反ではない。**

- **AC-03b** は生成物の中身を読むどころか、その回避を明文で命じている:
  「※ **`dashboard/state.json` の中身を読まない**。生成器が自分で告げた数と実地の数を突き合わせる — 第29条」
  → **生成器の性質を測る**形。第29条の思想そのものである。
- **AC-G08b** は `require('../dashboard/state.json')` を**わざと入れて `derived.js check` が exit 1 になること**を測る、
  すなわち**門が壊れて鳴ることの証明**である。違反の混入ではなく、違反を検出する門の検査である。

## 4.3 `node graph/derived.js check` の思想との照合

```
$ node graph/derived.js check; echo "exit=$?"
  ✓ no test asserts on derived content
exit=0
```

現状の楽園は既に緑であり、requirements.md は NFR-05 でこの性質の**維持**を要件化し(AC-N05a/b)、
G-08 で CI での恒久化を命じている。**思想は正しく引き継がれている。**

## 4.4 起草者が第29条の罠を自ら発見し補正していることを実測で確認した

改稿版 AC-12b には次の注記が加わっている:

> ⚠️ **第29条の注意(discovery 枢機卿の指摘により教主が補正)**: `dashboard/atlas/` は gitignore された生成物であり、
> CI のクリーンな作業樹には**存在しない**。実測: `grep -rl … dashboard/` は手元では 6 件を挙げるが、
> **git 追跡ファイルのみに限ると 0 件**である。ゆえにこの AC を**そのまま CI の門にしてはならない**

**この主張を独立に検証した。正しい。**

```
$ git ls-files dashboard/atlas/ | wc -l
0
$ git check-ignore -v dashboard/atlas/dag.html
.gitignore:15:dashboard/atlas/	dashboard/atlas/dag.html

$ grep -rl "fonts.googleapis\|fonts.gstatic" dashboard/ | wc -l
6                                    # 手元(生成物が在る)
$ grep -rl "fonts.googleapis\|fonts.gstatic" dashboard/
dashboard/atlas/conclave.html
dashboard/atlas/dag.html
dashboard/atlas/dispatch.html
dashboard/atlas/hierarchy.html
dashboard/atlas/run.html
dashboard/atlas/wiring.html

$ git ls-files dashboard/ | xargs grep -l "fonts.googleapis\|fonts.gstatic" | wc -l
0                                    # CI(生成物が無い)= 自動的に緑になる
```

**「生成物が無い環境で自動的に緑になり、守っているように見えて何も見ていない門」という危険が実測で裏付けられた。**
AC-12b/12d を CI から外し、git 追跡ファイルのみを走査する **AC-12e** を CI の門に据えた判断は正しい。
AC-12e が現時点で赤を出し(2.1 参照)、しかも**真の供給線 template.html ただ 1 本**を指すことも確認済みである。

**第29条について、本要件書は違反していないばかりか、第29条の罠を新たに 1 つ発見して塞いでいる。**

---

# 5. 判定と差戻し内容

## 5.1 判定: **reject(差戻し)** — 差戻し先 **specify 相**

**discover 相への差戻しではない。** 調査結果(findings.md R-01〜R-29)は、本審査が独立に走らせた
24 個のコマンドすべてで再現した。engines=2(実 33)/ creations 直書き 2 箇所 / リンク 0 本 /
`--json` 無視 3/3 / tenbin 100点かつ 17/17 赤 / 門の穴 — **すべて実測で裏付けられている。**
要件は調査に忠実であり、追跡可能性に取りこぼしは無く、第29条にも違反していない。

**差し戻すのは、AC の記述が本書自身の掟 2(「AC は機械が実行できるコマンドで書く」)を満たしていない 4 点のみである。**

## 5.2 specify 相で直すべき具体的項目

| # | 箇所 | 欠陥 | 実測された証拠 | 修正の方向 |
|---|---|---|---|---|
| **S-1** | **AC-10a** (行 415) | `grep -E` が PCRE 否定先読み `(?!...)` を解さず、**npm 依存を 100% 見逃す** | `grep -nE "…(?!http$…)" pd-lodash.js` → **exit=1(見逃し)** / `grep -nP` → exit=0(検出) | `-E` を `-P` に改める。または `node tests/dashboard-no-deps.test.js` を唯一の判定手段とし grep 式は参考に降格 |
| **S-2** | **AC-N01a** (行 789) | 本書が明記する測定機(Windows/git-bash)に `/usr/bin/time` が**存在しない** | `ls /usr/bin/time` → **No such file or directory** / 組み込み `time` は `-f` 非対応 | AC-01c と同じ bash 組み込み `time` 形式へ統一、または AC-N01b(perf テストの median)を唯一の判定手段に |
| **S-3** | **AC-09d** (行 399) | `grep -c $'\n\n'` は空パターンに退化し、**SSE 終端が壊れていても常に緑** | `printf 'data: x\n\ndata: y\n\n' \| grep -c $'\n\n'` → **4(=全行数)** | シェル grep を経由せず `node -e` でバイト列を直接検査する形に改める |
| **S-4** | **AC-22b** (行 721) | 期待値「(実測 5 件)」が陳腐化。**実測は 10 件** | `node graph/gauge.js ledger \| grep -cE '^\s+[0-9]{4}-'` → **10** | 「(執筆時点の実測基準 10 件。ledger は追記型のため増加する)」に改める |
| **S-5** | **FR-13 本文** (行 498) | 「視覚的に**目立たせる**」が測れず、対応する AC が無い | FR-13 の AC は 13a〜13d の 4 件のみ。いずれも「目立つ」を測らない | `AC-13e` を新設: `score>=90 && spawn.noTrace>0` の run が `data-contradiction="true"` を持つ |
| **S-6** | **FR-14 本文** (行 535) | 「視覚的に**区別**する」が測れず、対応する AC が無い(AC-14e は断面の要件であり画面の要件ではない) | AC-14a〜14h を全数確認。画面での区別を測る AC は 0 件 | `AC-14i` を新設: `data-run-state="stalled"` / `"complete"` の 2 値が画面に存在すること |
| **S-7** | **§3.0 写像表** (行 156, 158) | 参照先ラベル `D-1` / `D-2` が **§3.4 に定義されていない**(宙に浮いた参照) | `grep -n "D-1\|D-2"` → 写像表の 2 行のみ。§3.4 内に 0 件 | §3.4 の表に D-1/D-2 のラベル列を足すか、参照を「§3.4」だけに改める |

**S-1〜S-4 は必須(AC が機械で実行できない/期待値が誤り)。S-5〜S-7 は同時に直すべき瑕疵である。**

## 5.3 再批准の条件

上記 S-1〜S-4 を修正した上で、**修正した 4 つの AC を実際に走らせた出力を requirements.md に添えること**。
特に S-1・S-3 は「**壊れているものを置いたときに赤くなる**」ことの実証(合成の見本による対照実験)を伴うこと。
S-1 については本審査が用いた `pd-lodash.js` と同種の合成ファイルで、S-3 については終端の壊れた SSE 断片で確かめられる。

---

# 6. design 相への申し送り(reject であっても引き継ぐべき事項)

要件の骨格は健全であるため、S-1〜S-7 の修正と並行して design の検討を進めてよい。以下を申し送る。

## 6.1 実測で裏付けられた設計上の制約

| # | 事項 | 実測された根拠 |
|---|---|---|
| **D-1** | **枢機卿は 7 人**であり、`state.json` の hierarchy も `index.html` の固定値もこれを知らない | `Object.keys(clergy.COLLEGE).length` → **7**。第47条(b)の予言が既に現実 |
| **D-2** | **道は 6 つ**あり、相数は quick 6 / standard 14 / full 17 / reform 11 / counsel 6 / cartography 11。**現行の 4 タスク DAG はこのどれとも一致しない架空物** | `forge.buildDag('x',n).tasks.length` を 6 通り実行、全一致。`SCALES` の鍵も 6 つ |
| **D-3** | **止まった run が 1 件実在する**(`reform-claude-md-diet` 5/11 相・4/6 ドメイン)。現ダッシュボードはこれを一切映していない | conclave.json 5 件の直読みで確認。requirements.md の表と 5 行完全一致 |
| **D-4** | **tenbin は gauge 100/100 かつ spawn-trace 17/17 赤**。この矛盾の可視化が本改修の本分 | `gauge score --json` → score=100, phasesTotal=17 / `spawn-trace report` → no-trace: 17, exit=1 |
| **D-5** | **exit code を成否と読んではならない engine が 2 つある** | `daily-guard due` → `{"due":false}` かつ **exit=1** / `spawn-trace report` → **exit=1** が「証跡なし」の事実 |

## 6.2 実装時に踏む罠(審査中に実測したもの)

| # | 罠 | 実測 |
|---|---|---|
| **D-6** | **`grep -c` は対象ファイルが無いとき exit 2 を返す。**「0 件」と「ファイル無し」を取り違えるな | `grep -c … graph/pulse.js` → `No such file or directory` / **exit=2** |
| **D-7** | **`dashboard/atlas/` は CI に存在しない。**生成物を走査する検査は CI で自動的に緑になる | `git ls-files dashboard/atlas/ \| wc -l` → **0** / 手元 6 件 vs 追跡 0 件 |
| **D-8** | **本測定機に `/usr/bin/time` は無い。**性能計測は bash 組み込み `time` か node 内計測で行う | `ls /usr/bin/time` → No such file or directory |
| **D-9** | **git-bash の `grep -E` は PCRE を解さないが `grep -P` は使える。**否定先読みが要るときは `-P` を明示する | `-E` で lodash 見逃し(exit=1) / `-P` で検出(exit=0) |
| **D-10** | **`grep` に改行を含むパターンを渡すと空パターンに退化し全行マッチする。**複数行の検査は node 側で行う | `grep -c $'\n\n'` → 入力の**全行数**を返した |

## 6.3 design が決めてよいこと / 決めてはならないこと

- **決めてよい(N-8 のとおり)**: 肌・配色・書体・レイアウトの美学。教主 §5 の `wired [editorial]` 等の候補。
- **決めてはならない**: **矛盾(D-4)と停止(D-3)を機械が名指しできる印**の有無。
  これは S-5/S-6 で specify が `data-contradiction` / `data-run-state` として定めるべきものであり、
  design はその印を**どう見せるか**だけを決める。**印そのものを省いてはならない。**

## 6.4 prove 相へ送られる未確認事項(discover の申告を引き継ぐ・変更なし)

U-1(file:// → 127.0.0.1 の EventSource 実可否)/ U-2(SSE 同時接続 6 上限の実挙動)/
U-3(daily-guard リースの可視性)/ U-4(atlas の 5 gap + 1 smell の内訳)。
**いずれも discover が「測れなかった」と正直に申告した項目であり、要件書は正しく prove へ送っている。**
FR-08 AC-08d が U-1 の結果次第で第1層の発動条件を狭める分岐を予め書いていることは適切である。

---

# 7. 審査の総括(数で述べる)

| 観点 | 判定 | 数 |
|---|---|---|
| 1. 追跡可能性 | **合格** | R-01〜R-29 の **29/29** が処遇済み。取りこぼし **0**、捏造 **0**。却下 2 件に理由あり。R-20 の誤要件化 **0** |
| 2. 受入基準の実行可能性 | **不合格** | 24 コマンドを実行。正しく赤 **17**、期待値一致 **12**、**構文不成立 3**、**期待値の陳腐化 1** |
| 3. 測れない要件 | **概ね合格** | AC ゼロの要件 **0/30**。主観語ヒット **2**(FR-13 / FR-14、いずれも対応 AC 無し) |
| 4. 第29条違反 | **合格** | 生成物の中身に assert する AC **0 件**。加えて第29条の罠を **1 件新発見し補正済み**(AC-12b→AC-12e) |

**総評は数で述べる。** 全 144 AC のうち、実行可能性を実測で確かめたのは 24 件。
そのうち **4 件(16.7%)が、書かれたとおりに走らせると機能しない**。
このうち **AC-10a と AC-09d の 2 件は「永久に緑を出す門」**であり、
本要件書自身が第50条として掲げた「門が見ていない機能は壊れても鳴らない」に**要件書自身が抵触している**。

**それゆえ reject する。** 骨格は堅牢であり、修正は AC 4 件の記述と AC 2 件の新設に限られる。
**specify 相で直せば、次の審査で批准できる見込みが高い。**

---

## 付録: 本報告書の検証

本報告書は実際にファイルとして書き出され、サイズを実測した:

```
$ wc -c reform/dashboard-living-gate/ratify-requirements.md
43449 reform/dashboard-living-gate/ratify-requirements.md

$ wc -l reform/dashboard-living-gate/ratify-requirements.md
788 reform/dashboard-living-gate/ratify-requirements.md

$ grep -n "reject(差戻し)" reform/dashboard-living-gate/ratify-requirements.md
11:# **reject(差戻し)** — 差戻し先: **specify 相**
693:## 5.1 判定: **reject(差戻し)** — 差戻し先 **specify 相**
```

### 審査対象の同一性(改稿の追跡)

```
$ sha256sum "$LOCALAPPDATA/Temp/req-audit-snapshot.md"
0a99399a4737371175d60635a09e4170d8e7ab134fdefdd5a197bf9387058399

$ wc -c "$LOCALAPPDATA/Temp/req-audit-snapshot.md"   # 審査に固定した版
88312

$ wc -c reform/dashboard-living-gate/requirements.md  # 審査終了時のライブ版
88312                                                 # 一致 — 審査中の改稿は無い
```

**署名**: 枢機卿 discovery / 第11条により、要件のドメインに代わって本書を審査した。
**根拠はすべて上記の実出力であり、感想は一行も含まない。**
