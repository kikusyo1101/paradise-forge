# SECURITY attempt 3 — gauge-ledger-idempotent

- 枝: `fix/gauge-ledger-idempotent` / 入力 HEAD: `0f3fe12` / 433 passed 0 failed
- 走行環境: Node v24.14.0 / Windows
- **本相は監査である。`graph/` も `tests/` も一行も直していない。**
  実験具は全て repo の外(`%LOCALAPPDATA%/Temp/sec3/`)に置いた。
- **実台帳の前後**:
  ```
  前 387d9e0ea5a4fde30249897ebba3d53150e39a32cbf1e4299d922674bcb9982b / 30 行
  後 387d9e0ea5a4fde30249897ebba3d53150e39a32cbf1e4299d922674bcb9982b / 30 行   ← 一致
  ```
  全門走行(433 passed)を挟んでも一バイトも動いていない(§4.1 の生出力)。

---

## 0. 前任(security attempt 2)の敗因を先に引き受ける

attempt 2 は「新規の重大なし」と書いた。同時に走っていた review-2 が **P-1**
(too-deep の読み飛ばしが `raw` を痩せさせ、全行 too-deep の台帳を `--audit` が
`rows=0 … exit 0`「健全」と答える)を見つけ、差し戻しになった。
前任は深さ・幅・巨大行という**値の形**は撃ったが、**`raw` の経路と audit の到達可能性**を見なかった。

ゆえに本相は狙いを変え、**経路**を撃った —— 誰が何を読み、その結論がどの exit に化け、
誰がその exit を信じるか。結果、**P-1 と同じ形の穴が別の入口に残っている**(F-2)。

**本報告は「安全です」とは書かない。** 書けるのは
**「私が撃った 23 の攻撃の範囲で、何が通り何が通らなかったか」**だけである。
§6 に**見ていない項目**を名指しで列挙する。

---

## 1. 判定の一覧

| 分類 | # | 件名 |
|---|---|---|
| **致命** | 0 | — |
| **重大** | **2** | **F-1** 先回り毒 — 攻撃者が正当な観測を**永久に刻ませない**(冪等性そのものが作った新しい攻撃面) / **F-2** `--audit` は破損行・`metrics` なし行を **`rows=0` exit 0「健全」**と答える(**P-1 と同型の未修理の入口**) |
| **軽微** | 3 | F-3 `ts:""` の一行で掃除が正当な観測を置換する(keep-first の武器化) / F-4 `ts` の欠落・非文字列で `gauge.js ledger` が exit 2 で全滅(main 由来) / F-5 `dashboard-run-panel.test.js` / `dashboard-count.test.js` が仮倉を持たず**実台帳を読んで裁く** |
| **受容** | 6 | 深さ・幅の DoS / memo・keyIndex のキャッシュ汚染 / 引数注入 / exit code の衝突 / 供給鎖 / 秘密の混入 —— いずれも**撃った範囲では**破れなかった(§3) |

**build attempt 3 の修理そのもの(raw の前出し・`tooDeep`・memo/keyIndex・門ヘルパーを守る門)が
開いた新しい穴は、撃った範囲では見つからなかった。** 重大 2 件のうち F-1 は**改革全体**が
持ち込んだもの(main では成立しない)、F-2 は**P-1 の修理が届かなかった隣の入口**である。

---

## 2. 重大

### 【重大】F-1 先回り毒 — 攻撃者は正当な観測を永久に刻ませられる

`score()` は決定的である(それがこの秤の徳である)。指紋の材料は `slug`+`scale`+`metrics` だけで
**`ts` を含まない**(冪等性の成立条件)。この二つを併せると、**攻撃者は未来の観測の指紋を先に計算できる**。
先に自分の行を置けば、`record` は「既記録」と見なして**正当な観測を一行も書かない**。

```
##### A1: 先回り毒(pre-emption) #####
record の返り: {"skipped":true,"ts":"1999-01-01T00:00:00.000Z","note":"ATTACKER"}
台帳の行数: 1 / 正当な観測は刻まれたか: false
CLI 表示: 📒 already recorded: coin → 100/100 @ 1999-01-01T00:00:00.000Z (同一指紋 g1:7fa530d33cd6c964) — 追記しない
audit:    📒 rows=1 distinct=1 duplicates=0 conflicts=0 too-deep=0 | exit 0
```

**三重に悪い。**
1. `record` は **exit 0** で「already recorded」と名乗る。呼び手(CI・cron・conclave)は成功と読む。
2. `--audit` は **exit 0「健全」**。攻撃者の行は `fp` が中身と整合しているので `forged-fp` ではない。
3. 攻撃者は `ts` を過去に置けるので、`compare --last` の窓にも `latestFor` にも自然に紛れる。
   `note:"ATTACKER"` のような余分な鍵は**指紋の材料外**なので、いくら足しても鍵は変わらない。

**これは main には無い穴である**(切り分けの実測):

```
##### A23 #####
main の export: score, normalize, record, baseline, compare, readLedger, ledgerPath, WEIGHTS
main: 先回り毒の後 record → 2 行 / 正当な観測は ✅ 刻まれた(毒は効かない)
```

main は重複を検めないので毒が効かない。**冪等性を入れたこと自体が、この攻撃面を開いた。**
「同じ観測は二度刻まない」は「**先に名乗った者が勝つ**」と表裏である。

**ただし前提を正直に書く。** この攻撃には台帳ファイルへの書き込み権が要る。台帳は
creations 倉の平文 JSONL で、人が手編集し git で衝突解決する器である —— 敵対的攻撃者より、
**マージ事故や善意の手編集が同じ結果を生む**道のほうが現実的である。
`design.md` が `fp` を「人が目で読む注記」と位置づけた判断とは矛盾しない
(F-1 は `fp` を信じることではなく、**材料が一致すれば無条件に skip すること**が原因である)。

**私は実装を直さない(監査相)。** 判断の材料だけ置く: `record` が skip する時、
既存行と新しい entry の `ts` の差や `note` 等の余分な鍵の差を**名乗る**(exit は 0 のままでよい)
だけでも、この毒は「黙って消える」から「画面に出る」に変わる。

---

### 【重大】F-2 `--audit` は破損行・`metrics` なし行を「健全」と答える —— P-1 と同型の未修理の入口

P-1 の修理は `too-deep` を `auditLedger` の返り値に載せ、CLI から到達可能にした。**正しい。**
だが `auditLedger` の入口は今も `e.metrics` で先に篩っている(`gauge.js:561`)。
`JSON.parse` に失敗した行は `readLedger` が **`raw:true` でも捨てる**(`gauge.js:421`)ので、
audit の目に一度も触れない。

```
##### A16: ファイル 4 行(全部が「読めない/材料が無い」行)に対する --audit #####
  exit=0
  stdout: 📒 rows=0 distinct=0 duplicates=0 conflicts=0 too-deep=0
  stderr: ⚠️ ledger line skipped (corrupt): {"ts":"2026-01-01T00:00:00.000Z","slug":"coin","scale":"stan…
          ⚠️ ledger line skipped (corrupt): <<<<<<< HEAD…
```

撃った 4 行は**すべて現実に起こる形**である —— git マージで切れた行、`<<<<<<< HEAD` の衝突マーカー、
`metrics` を失った行。台帳が全滅していても `--audit` は **exit 0**、`rows=0`。

```
##### A5: metrics を持たない行だけの 7 行の台帳 #####
exit=0
  stdout: 📒 rows=0 distinct=0 duplicates=0 conflicts=0 too-deep=0
```

**review-2 が P-1 について書いた言葉がそのまま当てはまる: 「読めなかった行を 0 件と偽るのは
第16条に真っ向から反する」。** `too-deep` は数えるようになったが、**`corrupt` は数えていない**。
`readLedger` は stderr に警告を出すが、`--audit` の**返り値にも exit にも載らない**。
CI が exit だけを読めば(それが exit code を分けた目的である)、全滅した台帳を緑と読む。

比較(main には `--audit` 自体が無いので「悪化」ではなく「未達」である):

```
##### A22 #####
main ledger --audit → exit=0 | (empty — まだ何も測られていない)      ← --audit を解さず ledger を表示
HEAD ledger --audit → exit=0 | 📒 rows=0 distinct=0 … too-deep=0
```

`requirements.md:317` は「重複数・矛盾数を報告し、重複ゼロなら exit 0」としか約束していないので、
**仕様違反ではない**。だが P-1 で差し戻された理由(読めなかった行を隠すな)は
`corrupt` にも等しく及ぶ、というのが本相の判断である。

---

## 3. 軽微

### 【軽微】F-3 `ts:""` の一行で掃除が正当な観測を置換する

`foldLedger` は keep-first = **`ts` 文字列の最小**を残す。`ts:""` は全ての ISO8601 より小さい。
同一指紋の行に空の `ts` を与えれば、**掃除(FR-8)が正当な行を攻撃者の行で置き換える**。

```
##### A17 #####
掃除前 4 行 → 掃除後 3 行
残った coin の行: {"ts":"","slug":"coin","scale":"standard","metrics":{"score":100,"complete":true},"note":"ATTACKER"}
audit: exit=1 / 📒 rows=4 distinct=3 duplicates=1 conflicts=0 too-deep=0
```

**軽微に留めた理由**: 指紋が同じである以上 `metrics` も同一で、**score は書き換わらない**
(消えるのは `ts` と `note` などの材料外の鍵だけ)。ダッシュボードに嘘の点は出ない。
また audit が `duplicates=1 / exit 1` で鳴るので、掃除の前に人が気づく道はある。
`design.md` が `Date.parse` を避けて文字列比較を選んだ判断(壊れた `ts` で `NaN` を出さない)は
正しく、**その代償としてこの窓が開いている**という関係である。

### 【軽微】F-4 `ts` の欠落・非文字列で `gauge.js ledger` が全滅する(main 由来・射程外)

```
##### A6 #####
metrics:null       | ledger exit=2 | 🔴 Cannot read properties of null (reading 'score')
ts なし            | ledger exit=2 | 🔴 Cannot read properties of undefined (reading 'slice')
ts:数値            | ledger exit=2 | 🔴 e.ts.slice is not a function
##### A21: main と HEAD の切り分け #####
main    gauge.js ledger → exit=2 | 画面行数=0 | 🔴 Cannot read properties of undefined (reading 'slice')
HEAD    gauge.js ledger → exit=2 | 画面行数=0 | 🔴 Cannot read properties of undefined (reading 'slice')
```

`renderLedger`(`gauge.js:614`)が `e.ts.slice` と `e.metrics.score` を無条件に読む。
**一行で画面が全滅する** —— 第55条(e)「一行の破損で秤全体を倒さない」に反する。
**main と完全に同じ挙動**であり本改革が作った穴ではない。review-2 も P-11 として
「main 由来・射程外」と記録している。**本相は再確認しただけである。**
なお `pulse.js` は `r.metrics ? … : null` で守られており倒れない(A7/A13 で実測、exit 0)。

### 【軽微】F-5 仮倉を持たない 2 門が実台帳を読んで裁く

課題 3(「環境変数の振り替えに失敗したら実台帳を相手に走る門が残っていないか」)への回答。

**書く門は無い。** `record`/`baseline` を呼ぶ全ての箇所が仮倉の文脈にある:

```
##### A14 #####
仮倉の印を持たない record/baseline 呼び出し: なし
withGaugeSandbox の順序: mkdtemp が env 代入より前か = true
```
(`mkdtempSync` が先に投げれば `process.env` は書き換わらない —— 仮倉の作成に失敗しても
実台帳に振り替わることはない。prove-3 の T1 門がこれを守っている。)

**だが読む門は 2 本ある。**

```
##### A12 #####
dashboard-count.test.js     | readLedger 回数= 2 | record/baseline 呼び出し= なし(読み取りのみ)
dashboard-run-panel.test.js | readLedger 回数= 3 | record/baseline 呼び出し= なし(読み取りのみ)
```

この 2 ファイルは `PARADISE_CREATIONS` を一度も書かない(全 `tests/*.js` を grep して該当はこの 2 本のみ)。
**実データを壊しはしないが、実データの中身に緑が依存する。**
実台帳を 30 行から変えれば、この門の結論は変わりうる。

実測(実台帳のコピー + 毒 1 行で撃った):

```
##### A20 #####
dashboard-count.test.js       実台帳 exit=0 (15 passed) / 毒入り exit=0 (15 passed)
dashboard-run-panel.test.js   実台帳 exit=0 (16 passed) / 毒入り exit=1 (14 passed, 2 failed)
```

**ただしこの 2 failed は毒のせいではない。** 追試したところ、`PARADISE_CREATIONS` を
**毒無しの空倉**に向けただけで同じ 2 本が落ちた:

```
poison=false → dashboard-run-panel: 14 passed, 2 failed
poison=true  → dashboard-run-panel: 14 passed, 2 failed
```

落ちるのは `D-3(故障注入)` の 2 本で、台帳ではなく**倉の中身**(創造物ディレクトリ)に依存している。
**すなわちこの門は「実倉に本物の創造物が居ること」を前提に緑である。**
新しい端末・CI の素の checkout では落ちる。**本改革が作った欠陥ではない**(この 2 本は
本ブランチの diff に含まれない)が、課題 3 が問うた「実データ依存の門」として名指す。

---

## 4. 受容(撃ったが破れなかった)

**「安全である」ではなく「この撃ち方では破れなかった」と読むこと。**

### 4.1 実台帳の保全 — 清潔な全門走行は一バイトも書かない

```
##### A15 #####
全門走行 exit=0 355s
Paradise self-test: 433 passed, 0 failed
台帳 before: 387d9e0ea5a4fde30249897ebba3d53150e39a32cbf1e4299d922674bcb9982b 30 行
台帳 after : 387d9e0ea5a4fde30249897ebba3d53150e39a32cbf1e4299d922674bcb9982b 30 行
一致 = ✅ 一バイトも動かない
```

prove-3 §5.1 が白状した汚染(19 行)は **AC-9c の門の欠陥ではなく、故障注入器の欠陥**である
という同報告の結論を、本相は独立に確認した。**清潔な実装の上では門は実台帳を書かない。**
prove-3 の学び —— 「注入器は `PARADISE_CREATIONS` を仮倉に固定した子プロセスの中でだけ走らせ、
注入器の側に実台帳の sha256 を前後で検算する錠を先に付けよ」 —— は正しく、
**本相の実験具はその作法に従った**(全実験を repo 外の仮倉で行い、前後で sha256 を採った)。

### 4.2 DoS の転嫁 — `raw:true` が生になったことで下流は溢れないか

課題 1 の核心。3.18 MB(20 万鍵の行 + 500 段の入れ子)の台帳で実測:

```
##### A7 #####
台帳サイズ: 3.18 MB
readLedger raw   52ms → 3
readLedger fold 253ms → 2      (⚠️ ledger line skipped (too deep, > 64) を stderr に出す)
auditLedger     159ms → {"rows":3,"distinct":3,"tooDeep":1,"duplicates":0,…}
keyIndex        182ms → 2
pulse.snapshot  460ms exit=0   pulse ledger rows=2 bytes=141
```

**`raw` を使う下流に深い行が流れ込む道はできていない。**
`pulse.js:428` は `gauge.readLedger()`(既定 = 畳む)を呼んでおり、`raw:true` は使わない。
`raw:true` の呼び手は `record` / `baseline` の `keyIndex` と `ledger --audit` の三つだけで、
いずれも `trueKey()` が `null` を返す道で深い行を安全に落とす。
**深い行が生で下流に届くのは、人間が `--audit` の画面で名前を見る時だけ**であり、
これは P-1 の修理が意図した通りの振る舞いである。
`pulse` の断面は 3.18MB の台帳から **141 バイト**しか作らない(必要な 5 鍵だけを写す)。

FR-8 の掃除手順については逆の性質も確認した —— 掃除は深い行を**消さない**:

```
##### A2 #####
毒入り audit exit=2 / rows=3 distinct=3 conflicts=2 too-deep=1
掃除後 audit exit=2 行数=3        ← 3 行のまま。深い行も偽の鍵の行も残る
```

**P-1 の帰結③(掃除が深い行を永久に消す)は治っている。** 代償として `--audit` は
掃除後も exit 2 で鳴り続けるが、これは「人が読むまで消えない事故」という設計通りの意味であり、
R-2 が戒めた「鳴りっぱなしの門」とは別物である(重複由来の exit 1 は掃除で消える)。

### 4.3 memo / keyIndex のキャッシュ汚染

課題 1 の第二点。

```
##### A8 #####
同一オブジェクト×3 → 畳んだ後 1 行
keyIndex.size = 1 (3 行のうち鍵を持つのは 1)
嘘の fp を名乗る行の索引鍵: [ 'g1:37842d6b29d7854c' ] / 本物の鍵: g1:0c5894cd1abaa010 → 乗っ取り 不能
```

- **鍵の衝突による乗っ取りは不能。** 索引の鍵は必ず `trueKey()` の返り値で、行の自己申告 `fp` は
  一切見ない(S-1 の修理が正しく効いている)。他人の鍵を名乗っても索引には自分の鍵で載る。
- **memo は呼び出しの内側でしか生きず、返らない。** 鍵は行オブジェクトの参照(`Map`)なので、
  `foldLedger` が返った瞬間に到達不能になる。**台帳の第二の住所にはなっていない。**
- **メモリを食わせる道**: memo/keyIndex は行数に比例するだけで、行あたりの倍率は増えない
  (保持するのは 16 文字の鍵と既に読んだ行への参照)。悪意の行で膨らませられるのは
  `readLedger` が既に全行をメモリに載せている分までであり、**キャッシュが増幅器にはならない**。
- **深すぎる行・材料の無い行は索引に載らない**(鍵を持たないので)。これは
  「重複を見逃して書く」側に倒れる = 台帳の第一の徳(記録が失われない)と整合する。

### 4.4 指紋の畳み込み — 別の観測が同じ鍵になるか

```
##### A3 #####
score:null        g1:65248c3ed3124e40
score:NaN         g1:65248c3ed3124e40      ← 同一
score:Infinity    g1:65248c3ed3124e40      ← 同一
score:-Infinity   g1:65248c3ed3124e40      ← 同一
score:undefined   g1:de368f765a2a8b09
score なし        g1:de368f765a2a8b09      ← 同一
score:0           g1:f01ba9cb2507d88a
score:-0          g1:f01ba9cb2507d88a      ← 同一(意図通り)
score:1.0000001   g1:f1d6786ccaa9641b
score:1.0000002   g1:f1d6786ccaa9641b      ← 同一(6 桁丸め)
score:1           g1:f1d6786ccaa9641b      ← 同一
```

`null`/`NaN`/`±Infinity` が同鍵、`undefined`/鍵なしが同鍵、`1.0000001`/`1.0000002`/`1` が同鍵。
**全て `design.md` §指紋の正規化が明示的に選んだ振る舞いである**(第16条: 測れなかったものを
0 で埋めず `"null"` に畳む / 6 桁丸めで浮動小数の揺れを吸う)。
`score()` は `toFixed(3)` までしか返さないので**実在の観測がここで衝突することはない**。
攻撃に使うには攻撃者が既に台帳へ書ける必要があり、その時は F-1 のほうが強力である。
**受容とするが、「指紋は観測の同一性を 6 桁精度でしか保証しない」ことは記録に残す。**

### 4.5 引数注入 — 子プロセスを撬てるか

課題 4。`slug` に改行・JSON 脱出・シェル展開を仕込んで `record` を撃った:

```
##### A9 #####
"a\nFAKE-LINE\", \"x\": \"y"  exit=0 行数=1 全行 parse 可=true
"../../escape"                exit=0 行数=2 全行 parse 可=true
"a\"}\n{\"ts\":\"9999"        exit=0 行数=3 全行 parse 可=true
"--slug"                      exit=0 行数=4 全行 parse 可=true
"$(whoami)"                   exit=0 行数=5 全行 parse 可=true
"`id`"                        exit=0 行数=6 全行 parse 可=true
最終台帳が指す道: C:\Users\kikus\AppData\Local\Temp\sec3b-c2ROiG\gauge-ledger.jsonl
```

**一件も破れなかった。** 行は必ず 1 行ずつ増え、全行が JSON として読める
(`JSON.stringify` が改行を `\n` にエスケープする)。`slug` は**ファイルパスに使われない**ので
`../../escape` も台帳の住所を動かさない(住所は `workspace.js` だけが決める)。

子プロセスの組み立て(prove-3 が門を増やした箇所):

```
##### A19 #####
shell:true の使用: ✅ 無し
execSync(文字列) の使用: ✅ 無し(execFileSync/spawnSync のみ)
node -e で組む script の数: 9
-e 文字列に JSON.stringify を経ずに埋め込まれた変数: 🔴 ${e.slug} ${seen.tmp} ${o.slug}
```

**この 🔴 は誤検出である。実読して確認した** —— 3 件とも `node -e` の script ではなく
**assert の失敗メッセージのテンプレート文字列**である(`tests/paradise.test.js:3228, 4845, 4895, 4918-4920`)。
実際に `-e` へ渡る 9 箇所は全て `JSON.stringify()` を通っている。
`shell:true` はゼロ、`execSync(文字列)` もゼロ、引数は必ず配列で渡る。**注入の余地は見つからなかった。**

### 4.6 exit code の衝突

課題 1 の第三点。

```
##### A10 #####
gauge.js ledger                  exit=0
gauge.js ledger --audit          exit=0
gauge.js bogus                   exit=3
gauge.js score nofile.json       exit=2
gauge.js compare a b             exit=2
```

**`gauge.js` を子プロセスで撬つ engine は一つも無い。** `pulse.js:47` が `require` するのみで、
exit code ではなく戻り値を読む。`.github/` に `gauge` の文字列は無い(CI からも呼ばれていない)。
`grep -rn "status === 2|code === 2"` で `exit 2` を例外扱いする呼び手を洗ったが、
gauge に対するものは**門の中の assert だけ**(`tests/paradise.test.js:3459, 4290, 4292` —— exit 2 を
期待する側であり、衝突ではない)。`atlas.js:1245` の `e.status === 2` は viewer/chrome の話で無関係。

**すなわち exit code の意味づけ(0/1/2/3)と衝突する既存の呼び手は、撃った範囲では見つからなかった。**
ただし裏返せば **`--audit` の exit を読む者が現在ひとりも居ない** —— review-2 の
P-9(R-10: CI に `--audit` の口が無い)が未着手のままである。
F-2 の実害は、この口が付いた瞬間に顕在化する。

### 4.7 供給鎖

課題 4。

```
##### A18 #####
require: require('fs') require('path') require('crypto') require('./workspace.js') require('./spawn-trace.js')
child_process / eval / Function: ✅ 無し
fs の書き込み経路: fs.appendFileSync
process.env の直読み: ✅ なし
package.json 存在: false | node_modules 存在: false
```

- **新規外部依存ゼロ。** `crypto` は Node 標準。`package.json` も `node_modules` も存在しない
  (楽園は外部依存を持たない)。`git diff main...HEAD -- package.json package-lock.json` は空。
- **`gauge.js` は書き込み経路を `appendFileSync` 一本しか持たない。**
  `writeFileSync` / `rm` / `unlink` / `truncate` はゼロ —— **台帳の行を消す道が実装に存在しない。**
  これは F-1/F-3 の被害を「記録が消える」ではなく「記録が増えない/置換される」に限定している。
- `process.env` の直読みゼロ(門 `tests/paradise.test.js:4479` が source と実挙動の両側で守っている)。
- `gauge.js` に `child_process` / `eval` / `new Function` は無い。

### 4.8 秘密・個人情報の混入

```
$ git diff main...HEAD | grep -nEi "(api[_-]?key|secret|token|passwd|password|bearer|ghp_|github_pat_|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN|@gmail|…)"
855:+      "No secrets in code; security is reviewed, never assumed."        ← lessons の文言
2691:+      "No secrets in code; security is reviewed, never assumed."       ← 同上
5475–6075: 前任の security-report が載せた **grep 文字列そのもの**
6035:      security: { issues: 0, secrets: 0 },                              ← 構造体の鍵名
$ git diff main...HEAD | grep -oE "[A-Za-z0-9+/]{40,}={0,2}" | sort -u
  → 全てファイルパスと、報告書が引用した実台帳の sha256(387d9e0e…)のみ
```

**秘密・鍵・個人情報の混入は見つからなかった。** 該当は全て「secret」という**単語**の出現である。
`.env` には一切触れていない。実台帳の sha256 は公開して差し支えない検算値である。

---

## 5. 課題への直答

| 課題 | 回答 |
|---|---|
| 1. raw の前出しが DoS を下流に転嫁したか | **していない**(§4.2)。`raw:true` の呼び手は 3 箇所のみで全て `trueKey`→`null` で深い行を落とす。`pulse` は既定(畳む)を読み、3.18MB の台帳から 141 バイトしか作らない |
| 1. memo/keyIndex のキャッシュ汚染 | **破れなかった**(§4.3)。索引の鍵は常に再導出、memo は呼び出し内で死ぬ、鍵の衝突による乗っ取りは不能 |
| 1. exit code の衝突 | **衝突する呼び手は見つからなかった**(§4.6)。ただし **`--audit` の exit を読む者が現在ゼロ**である |
| 2(a) 正当な観測を消せるか | **消せる —— F-1(重大)。** 先回り毒で永久に刻ませない。行を**消す**道は実装に無いが、**書かせない**道がある |
| 2(b) audit を永遠に固定できるか | **緑に固定できる —— F-2(重大)。** 破損行だけの台帳が exit 0。赤への固定も可能だが(§4.2 A2)、それは「人が読むべき事故」という設計通りの意味 |
| 2(c) ダッシュボードに嘘を表示できるか | **撃った範囲では不能。** `pulse` は畳んだ台帳を読み、`metrics` なし行でも倒れない(A7/A13 で exit 0)。ただし F-1 で「本来出るはずの点が出ない」ことは可能 |
| 2(d) 掃除を実行させて行を消させるか | **F-3(軽微)。** 正当な行を攻撃者の行に置換できるが score は変わらず、audit が exit 1 で先に鳴る。深い行・偽の鍵の行は掃除で消えない(P-1 の修理が効いている) |
| 2(e) 門を空打ちにさせるか | **撃った範囲では不能。** T1/T2 の門(prove-3 が新設)が仮倉の振替と失敗の計上を守っている |
| 3. 実台帳を相手に走る門 | **書く門は無い**(A14)。**読む門が 2 本ある** —— F-5(軽微)。うち `dashboard-run-panel` は実倉の中身に緑が依存する |
| 4. 供給鎖・引数注入 | **新規依存ゼロ / 注入の余地は見つからなかった**(§4.5, §4.7) |
| 5. 秘密の混入 | **見つからなかった**(§4.8) |

---

## 6. 私が見ていないこと(名指し)

**ここが本報告で最も重要な節である。** 前任はこの節を持たなかったために P-1 を見落とした。

1. **時系列の競合(TOCTOU)を撃っていない。** `record` は「読む→検める→追記」の三段だが、
   二つのプロセスが同時に走る場合を**一度も実測していない**。`appendFileSync` の原子性は
   OS と書き込みサイズに依存し、Windows で 4KB を超える行がどうなるかを私は測っていない。
   design.md は「予防が漏れても治癒が拾う」と述べるが、**行が途中で切れる場合**(= F-2 が
   数えない `corrupt`)は治癒の対象外である。**この二つは連結しうる。**
2. **`spawn-trace.js` 経由の攻撃面を見ていない。** `gauge.js` は `trace.epochStatus` と
   `trace.isTier3State` を呼び、その結果が `score` を最大 `-10×n` 動かす。
   **`run.tierTrace` を偽装して点を操作できるか**を撃っていない(本改革の射程外だが、
   台帳に刻まれる値の出所である以上、台帳の武器化と地続きである)。
3. **`baseline` の走査経路を撃っていない。** `readdirSync` で創造物ディレクトリを舐め
   `*.run.json` を全部 `record` する。**悪意のディレクトリ名やシンボリックリンク**で
   走査を外へ導けるかを見ていない。
4. **`--audit` の exit を CI に繋いだ場合の挙動**を見ていない(繋がっていないので測れない)。
   F-2 の実害はその時に決まる。
5. **実台帳の 30 行そのものの中身を監査していない。** 現在 `--audit` が何と答えるかを
   私は実台帳に対して**走らせていない**(読み取り専用の命令だが、実データに触れる判断を避けた)。
   `duplicates=24` という数は門の中の同型 30 行に対する値であって、実台帳の値ではない。
6. **F-5 の 2 門が「実倉の中身」に依存する範囲を特定していない。** 落ちる 2 本が
   台帳ではなく創造物ディレクトリに依存することまでは切り分けたが、
   **何が在れば緑になるのか**は追っていない。
7. **私が思いつかなかった攻撃については何も言えない。** 前任が「新規の重大なし」と書いた
   同じ場所で、私は 2 件の重大を見つけた。**この差は私の腕ではなく、狙う層を変えたことによる。**
   層をもう一つ変えれば、また出る可能性が高い。

---

## 7. 結び

**「安全です」とは書かない。**

書けるのは —— **build attempt 3 の修理(raw の前出し・`tooDeep`・memo/keyIndex・門ヘルパーを守る門)は、
私が撃った 23 の攻撃の範囲では新しい穴を開けていない**。修理はいずれも意図通りに働き、
P-1 の三つの帰結(生が痩せる / audit が到達不能 / 掃除が消す)は**実撃で治癒を確認した**。

**しかし重大が 2 件ある。**
F-1 は**冪等性という機構そのものが持ち込んだ新しい攻撃面**で、main には存在しない。
F-2 は**P-1 の修理が隣の入口に届いていない**もので、review-2 が P-1 について書いた
「読めなかった行を 0 件と偽るのは第16条に反する」がそのまま当てはまる。

そして §6 に列挙した 7 項目を私は見ていない。
