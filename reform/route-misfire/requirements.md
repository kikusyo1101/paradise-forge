# requirements — reform 走行『route-misfire』

道: `reform` / 相: `specify`
前相: [`discovery.md`](./discovery.md)(実測はすべてそちらに在る。ここでは結論だけを引く)

---

## 0. この走行が直すもの / 直さないもの

| | |
|---|---|
| **直す(欠陥A)** | `graph/forge.js` の `chooseScale` が「語の形」だけを見て「求められている産物の種類」を見ず、engine 改修の願いを `counsel` / `standard` へ攫う |
| **直す(欠陥B)** | `graph/workspace.js` の `check` が `PARADISE_CREATIONS` の残留で、創造物の倉ですらない場所を裁いて偽の赤 (EXIT=1) を出す |
| **直さない(別走行へ送る)** | `ECサイトを作れ` → standard の誤着(`fullJa` が「サイト」を知らない)。discovery §2.1 で発見したが教主の名指しに無い。**FR に含めない。§6 に記録だけ残す** |
| **直さない** | `tests/paradise.test.js` の `--gate` 絞り込みが走行時間を縮めない件(discovery §8-8)。別の欠陥である |

---

## 1. 機能要件 (FR)

### FR-01 — 建造の動詞を engine が知る
「既に在る物に一段足す」動詞(設ける/足す/加える/追加/新設/導入/搭載/組み込/持たせ/生やす/できるようにする/可能にする/拡張、および英語 add/introduce/extend/enable/support/wire)を
**創造の語彙として認める**。これにより `isCounsel` の打ち消し(現 `forge.js:316`)が改修の願いにも効く。

### FR-02 — フラグ名とコード片は「依頼の動詞」ではない
語彙判定の前に、願い文から次を剥ぐ:
(a) バッククォートで囲まれた区間、(b) `--flag` / `-f` 形式の語、(c) `名前.js` `名前.json` 等のファイル名。
剥いだ文で語彙を判定する。**剥いだ文は判定にのみ使い、`meta.wish` には元の願い文を保存する。**

### FR-03 — 産物の主名詞は文書の語彙に勝つ
願いが**産物の主名詞**(アプリ/ツール/コマンド/口/門/画面/機能/フラグ/オプション/エンドポイント/ボタン/一段/相/ページ/タイマー、および app/tool/command/flag/option/cli/api/endpoint/button/screen/feature/toggle)を含むとき、
`DOC_RE` に当たっても **諮問ではない**。「健康診断アプリ」の「診断」に道を奪わせない。

### FR-04 — REFORM は engine の固有名を知る
`REFORM_RE` に engine の固有名(CI / ワークフロー / workflow / 自己診断 / 走行帳 および `graph/*.js` のモジュール名 —— conclave / forge / codex / verdict / critic / synod / census / gauge / clergy / workspace / … )を加える。
**`台帳` と `ledger` は加えてはならない。** discovery §6.1 の実測で
`台帳の毒を直す` が quick から reform へ攫われた。

### FR-05 — `chooseScale` の返り値は文字列のままである
`forge.js:392` のコメントと `tests/paradise.test.js:8566` (`admit(wish,…).scale === chooseScale(wish)`) が依存する。
**返り値の型を変えてはならない。**

### FR-06 — `COUNSEL_JA` / `COUNSEL_EN` は定数名も判定経路も残す
`tests/counsel.test.js:280-298` の「壊れ engine」門が、この二つの定数名をソース置換で潰して
「語彙が判定に効いている」ことを撃つ。定数名を消す/語彙を別の場所へ移すと
`assert.ok(broken !== src, '門の壊し方が古い')` が赤になる。

### FR-07 — `resolve()` は「在る」と「創造物の倉である」を別の言葉で言う
`resolve()` の返り値に `vault` を**足す**。既存キー (`root` / `source` / `legacy` / `exists`) は
一つも消さず、意味も変えない(`tests/paradise.test.js:3085` が撃っている)。

### FR-08 — 本物の創造物の倉であることを確かめてから裁く
`isCreationsVault(root)` を `workspace.js` に置く。肯う印は二つ、**どちらか一つで足りる**:
1. `git -C <root> config --get remote.origin.url` が `paradise-creations(\.git)?$` に一致する
2. `<root>/.paradise-creations` という目印ファイルが在る

**ディレクトリ名では判定しない。** `tests/abandoned-run.test.js:51` の sandbox は
`paradise-creations` という名の仮倉を作るので、名で裁けば偽陽性になる。

### FR-09 — 仮倉なら声に出して skip する(第37条)
CLI `check` は、解決した倉が `isCreationsVault` でないとき:
* 走行帳の流出検査を **EXIT に数えない**(偽の赤を出さない)
* **黙って 0 件にしない。** 「その場所は創造物の倉ではないので、走行帳の流出は検めなかった」と
  **場所を名指しして**印字する

### FR-10 — `strayRuns()` 自体は今まで通り鳴る
`strayRuns()` の返り値と鳴り方を**変えてはならない**。
`tests/abandoned-run.test.js:258` の `B-1 [故障注入]` は **env で仮倉を立てて `strayRuns()` が鳴ること**を
撃っている。ここを黙らせれば欠陥B対策が既存の門を殺す。
skip の判断は **CLI `check` の層**でのみ行う。

### FR-11 — 目印ファイルを置く側も engine が持つ
FR-08 の印 2 を採るなら、`.paradise-creations` を**置く口**も engine が持たねばならない。
discovery §5 の実測で、本物の倉に目印ファイルは**存在しない**。
読む側だけを作れば、本物の倉ですら偽になる。

---

## 2. 非機能要件 (NFR)

* **NFR-01** — `isCreationsVault` が呼ぶ `git` の代は 1 回 20ms 未満であること(実測 14〜15ms)。
  `check` は CI で 1 回走るだけなので払える。
* **NFR-02** — `git` が PATH に無い / 対象が git repo でない場合、**例外を投げず** `false` を返すこと。
  `strayCreations()` の既存の作法(catch して空を返す)に倣う。
* **NFR-03** — 新しい門ファイルを足すなら **CI か `tests/paradise.test.js` のどちらかが必ず呼ぶ**こと。
  `node graph/wiring.js check` は門の孤児を exit 1 で名指しする(第44条)。
* **NFR-04** — README 等に数値を手で書かない(第22条)。数は `graph/census.js` が測る。

---

## 3. 受入条件 (AC) — すべて機械が撃てる形

前提: `cd C:/Users/kikus/Documents/workspace/paradise`。
以下の `node -e` は**そのまま貼って走る**。`process.exit` で判定するので `echo $?` が答えである。

### 3.1 欠陥A — 誤着を直す(5 件)

**AC-01** 『楽園の自己診断に絞り込みの口を設ける』は reform へ着く
```
node -e "const F=require('./graph/forge.js');const g=F.chooseScale('楽園の自己診断に絞り込みの口を設ける');console.log(g);process.exit(g==='reform'?0:1)"
```
期待: stdout `reform` / exit **0**

**AC-02** 『門に監査の一段を足す』は reform へ着く
```
node -e "const F=require('./graph/forge.js');const g=F.chooseScale('門に監査の一段を足す');console.log(g);process.exit(g==='reform'?0:1)"
```
期待: stdout `reform` / exit **0**

**AC-03** 『CI に ledger --audit を追加する』は reform へ着く(フラグ名に道を奪わせない)
```
node -e "const F=require('./graph/forge.js');const g=F.chooseScale('CI に ledger --audit を追加する');console.log(g);process.exit(g==='reform'?0:1)"
```
期待: stdout `reform` / exit **0**

**AC-04** 『健康診断アプリが欲しい』は standard へ着く(counsel でも full でもない)
```
node -e "const F=require('./graph/forge.js');const g=F.chooseScale('健康診断アプリが欲しい');console.log(g);process.exit(g==='standard'?0:1)"
```
期待: stdout `standard` / exit **0**

**AC-05** 『gauge に fingerprint を確かめる口を設ける』は reform へ着く
```
node -e "const F=require('./graph/forge.js');const g=F.chooseScale('gauge に fingerprint を確かめる口を設ける');console.log(g);process.exit(g==='reform'?0:1)"
```
期待: stdout `reform` / exit **0**

### 3.2 欠陥A — 回帰を防ぐ(教主が名指しした 4 件)

**AC-06** 『健康診断アプリが欲しい』→ standard(AC-04 と同一。教主の回帰防止リストの一件として再掲)
— AC-04 と同じ命令・同じ期待。

**AC-07** 『楽園の位階の相関図を作れ』は cartography のままである
```
node -e "const F=require('./graph/forge.js');const g=F.chooseScale('楽園の位階の相関図を作れ');console.log(g);process.exit(g==='cartography'?0:1)"
```
期待: stdout `cartography` / exit **0**

**AC-08** 『楽園のエンジンを監査してほしい』は counsel のままである
```
node -e "const F=require('./graph/forge.js');const g=F.chooseScale('楽園のエンジンを監査してほしい');console.log(g);process.exit(g==='counsel'?0:1)"
```
期待: stdout `counsel` / exit **0**

**AC-09** 『台帳の毒を直す』は quick のままである(**FR-04 の禁則が守られている証拠**)
```
node -e "const F=require('./graph/forge.js');const g=F.chooseScale('台帳の毒を直す');console.log(g);process.exit(g==='quick'?0:1)"
```
期待: stdout `quick` / exit **0**

### 3.3 欠陥A — 既存の門が撃っている断定を一つも壊さない

**AC-10** 判定表 37 行を一度に撃ち、一件でも外れたら赤くなる
```
node -e "
const F=require('./graph/forge.js');
const T=[['楽園の自己診断に絞り込みの口を設ける','reform'],['門に監査の一段を足す','reform'],
['CI に ledger --audit を追加する','reform'],['健康診断アプリが欲しい','standard'],
['gauge に fingerprint を確かめる口を設ける','reform'],['楽園の位階の相関図を作れ','cartography'],
['楽園のエンジンを監査してほしい','counsel'],['台帳の毒を直す','quick'],
['ポモドーロタイマーが欲しい','standard'],['現状のCIの健全性を監査してほしい','counsel'],
['Rustの非同期ランタイムの選択肢を調査して比較表がほしい','counsel'],['今月のPRの傾向を報告してほしい','counsel'],
['この設計は妥当か意見がほしい','counsel'],['ハーネスの設計を見直す必要はないか','counsel'],
['楽園のエンジンのバグを修正する','reform'],['楽園に新しい門を追加してほしい','reform'],
['タスク管理アプリを作って','standard|full'],['タイポを直して','quick'],['ログイン画面のバグを直す','quick'],
['オーケストレーションの相関図、関連図を作成し連携してほしい','cartography'],['位階の図を描いてほしい','cartography'],
['creations のデータフローを可視化して','cartography'],['draw a sequence diagram of the dispatch chain','cartography'],
['意図を汲んでタイマーを実装してほしい','standard'],['地図アプリが欲しい','standard|full'],
['楽園の憲法に条を足せ','reform'],['バグを直して','quick'],['エンジンを監査してほしい','counsel'],
['ダッシュボードを生きた門にせよ','reform'],['fix login bug','quick'],['add a dark mode toggle','standard'],
['build a habit tracker app','full'],['楽園のオーケストレーションを改善する','reform'],
['憲法に条を足す','reform'],['improve the harness engine','reform'],['門を強化する','reform'],
['市場の競合を調査して報告書をくれ','counsel']];
let bad=0;for(const[w,e]of T){const g=F.chooseScale(w);if(!e.split('|').includes(g)){console.log('NG',w,'got='+g,'want='+e);bad++}}
console.log('NG='+bad+' / '+T.length);process.exit(bad?1:0)"
```
期待: 最終行 `NG=0 / 37` / exit **0**

**AC-11** `isCounsel` の直接の断定(`tests/counsel.test.js` が撃っている 2 行)が保存されている
```
node -e "const F=require('./graph/forge.js');const a=F.isCounsel('検討したツールを実装して'),b=F.isCounsel('現状のCIの健全性を監査してほしい');console.log('a='+a,'b='+b);process.exit((a===false&&b===true)?0:1)"
```
期待: stdout `a=false b=true` / exit **0**

**AC-12** `chooseScale` の返り値は文字列である(FR-05)
```
node -e "const F=require('./graph/forge.js');const t=typeof F.chooseScale('何でもよい願い');console.log(t);process.exit(t==='string'?0:1)"
```
期待: stdout `string` / exit **0**

**AC-13** `COUNSEL_JA` / `COUNSEL_EN` の定数名が `forge.js` に残っている(FR-06)
```
node -e "const s=require('fs').readFileSync('graph/forge.js','utf8');const ok=/const COUNSEL_JA\s*=/.test(s)&&/const COUNSEL_EN\s*=/.test(s);console.log(ok);process.exit(ok?0:1)"
```
期待: stdout `true` / exit **0**

**AC-14** 諮問の語彙を潰すと判定が崩れる(語彙が判定に効いている証拠 / `counsel.test.js:292` と同じ主張)
```
node tests/counsel.test.js
```
期待: 最終行 `Counsel self-test: 51 passed, 0 failed`(**passed は 51 以上、failed は 0**)/ exit **0**

**AC-15** 走行帳の門が緑である
```
node tests/abandoned-run.test.js
```
期待: 最終行 `abandoned-run: N passed, 0 failed`(N ≥ 20)/ exit **0**

**AC-16** 自己診断の全走が緑である(**6 分かかる。build 相で必ず一度撃つこと**)
```
node tests/paradise.test.js
```
期待: 集計行の `failed` が **0** / exit **0**

**AC-17** `--scale` を明示した `admit` の裁定が `chooseScale` と一致する(`paradise.test.js:8566` の主張)
```
node -e "const F=require('./graph/forge.js');const w='ポモドーロタイマーを作れ';const ok=F.admit(w,'nonexistent').scale===F.chooseScale(w);console.log(ok);process.exit(ok?0:1)"
```
期待: stdout `true` / exit **0**

### 3.4 欠陥B — 偽の赤を止め、かつ黙らない

**AC-18** 仮倉(創造物の倉ではない場所)を指しても `check` は緑である
```
V="$LOCALAPPDATA/Temp/ac18-$$"; mkdir -p "$V/reform-probe"
printf '%s' '{"meta":{"scale":"reform"},"domains":[{"phases":[{"artifactPath":"graph/forge.js"}]}]}' > "$V/reform-probe/conclave.json"
PARADISE_CREATIONS="$(cygpath -w "$V")" node graph/workspace.js check; echo "EXIT=$?"; rm -rf "$V"
```
期待: exit **0**
**修正前の実測**: exit **1**、`✗ reform の走行帳が創造物の倉に居る (1 件)` を印字(discovery §4)

**AC-19** その緑は**黙っていない** — 検めなかったことと、その場所を名指しする(第37条 / FR-09)
```
STAMP="ac19-$$"; V="$LOCALAPPDATA/Temp/$STAMP"; mkdir -p "$V/reform-probe"
printf '%s' '{"meta":{"scale":"reform"},"domains":[{"phases":[{"artifactPath":"graph/forge.js"}]}]}' > "$V/reform-probe/conclave.json"
OUT=$(PARADISE_CREATIONS="$(cygpath -w "$V")" node graph/workspace.js check)
echo "$OUT"
echo "$OUT" | grep -q "創造物の倉ではない" && echo "$OUT" | grep -qF "$STAMP" && echo AC19-PASS || echo AC19-FAIL
rm -rf "$V"
```
期待: stdout に `AC19-PASS`。すなわち出力に (a) 検めなかった旨の文言、(b) **skip した場所の道**(この仮倉に固有の名 `$STAMP` を含む)の両方が在る。
**黙って `✓ …流出なし` とだけ言って終わるのは不合格である。**
**註**: 道全体を `grep -qF` で照合しないのは、`cygpath -w` が返す道が
`C:\Users\kikus\AppData\Local/Temp/…` のように区切りを混ぜるため(実測)。
node が正規化して印字する道と一字一句は一致しない。固有の名で照合する。

**AC-20** 本物の倉では今まで通り検める(片側だけ証明した修理は壁であって門ではない — 第37条)
```
node graph/workspace.js check; echo "EXIT=$?"
```
期待: exit **0** かつ stdout に `✓` の行。**AC-19 の skip 文言は出ない**(本物の倉なので検めている)。

**AC-21** `strayRuns()` 自体は仮倉でも今まで通り鳴る(FR-10 / `abandoned-run.test.js` の `B-1` を殺していない)
```
node -e "
const fs=require('fs'),path=require('path'),os=require('os');
const ws=require('./graph/workspace.js');
const d=fs.mkdtempSync(path.join(os.tmpdir(),'ac21-'));
const repo=path.join(d,'paradise'),store=path.join(d,'paradise-creations');
fs.mkdirSync(path.join(repo,'reform'),{recursive:true});
fs.mkdirSync(path.join(store,'by-scale'),{recursive:true});
fs.writeFileSync(path.join(store,'by-scale','conclave.json'),JSON.stringify({meta:{scale:'reform'},domains:[{status:'ratified',phases:[]}]}));
const r=ws.strayRuns(repo,{env:{PARADISE_CREATIONS:store}});
console.log(JSON.stringify(r.map(x=>x.slug)));
fs.rmSync(d,{recursive:true,force:true});
process.exit(r.length===1&&r[0].slug==='by-scale'?0:1)"
```
期待: stdout `[\"by-scale\"]` / exit **0**

**AC-22** `isCreationsVault` が本物の倉に真、仮倉に偽を返す(FR-08)
```
node -e "
const fs=require('fs'),path=require('path'),os=require('os');
const ws=require('./graph/workspace.js');
const real=ws.isCreationsVault('C:/Users/kikus/Documents/workspace/paradise-creations');
const fake=ws.isCreationsVault(fs.mkdtempSync(path.join(os.tmpdir(),'ac22-')));
console.log('real='+real,'fake='+fake);process.exit((real===true&&fake===false)?0:1)"
```
期待: stdout `real=true fake=false` / exit **0**
**註**: 本物の倉が無い機械(CI の checkout)ではこの AC は**撃てない**。
その場合は **skip を声に出す**こと。緑と記録してはならない(第37条)。

**AC-23** 名前だけの偽物を本物と認めない(FR-08 の「ディレクトリ名で裁かない」)
```
node -e "
const fs=require('fs'),path=require('path'),os=require('os');
const ws=require('./graph/workspace.js');
const d=fs.mkdtempSync(path.join(os.tmpdir(),'ac23-'));
const decoy=path.join(d,'paradise-creations'); fs.mkdirSync(decoy);
const v=ws.isCreationsVault(decoy);
console.log('decoy='+v); fs.rmSync(d,{recursive:true,force:true});
process.exit(v===false?0:1)"
```
期待: stdout `decoy=false` / exit **0**

**AC-24** 目印ファイルだけでも本物と認める(FR-08 の印 2 / FR-11)
```
node -e "
const fs=require('fs'),path=require('path'),os=require('os');
const ws=require('./graph/workspace.js');
const d=fs.mkdtempSync(path.join(os.tmpdir(),'ac24-'));
fs.writeFileSync(path.join(d,'.paradise-creations'),'');
const v=ws.isCreationsVault(d);
console.log('marked='+v); fs.rmSync(d,{recursive:true,force:true});
process.exit(v===true?0:1)"
```
期待: stdout `marked=true` / exit **0**

**AC-25** `resolve()` の既存キーが一つも消えていない(FR-07)
```
node -e "
const ws=require('./graph/workspace.js');
const r=ws.resolve({env:{PARADISE_CREATIONS:require('os').tmpdir()}});
const need=['root','source','legacy','exists','vault'];
const miss=need.filter(k=>!(k in r));
console.log(JSON.stringify(r));console.log('missing='+JSON.stringify(miss));
process.exit(miss.length===0&&r.source==='env'?0:1)"
```
期待: `missing=[]` かつ `source` が `env` / exit **0**

**AC-26** `git` が無くても例外を投げない(NFR-02)
```
NODE=$(which node)
PATH="/usr/bin:/bin" "$NODE" -e "
const ws=require('C:/Users/kikus/Documents/workspace/paradise/graph/workspace.js');
let threw=false,v=null;
try{v=ws.isCreationsVault('C:/Users/kikus/Documents/workspace/paradise-creations')}catch(e){threw=true;console.log('THREW '+e.message)}
console.log('threw='+threw,'v='+v);process.exit(threw?1:0)"
```
期待: `threw=false` / exit **0**
**実測済**: この `PATH` で `git` は確かに消える(`which: no git in (/usr/bin:/bin)`)。
また `execFileSync('git',…)` はその状態で `ENOENT` を投げることを実測した
(`node -e` で直接確認済。ゆえにこの AC は**本当に撃てている**)。
`NODE=$(which node)` が要るのは、`PATH` を削ると `node` 自身も消えるため(実測 `command not found`)。

### 3.5 engine の健全性

**AC-27** 門の孤児が居ない(新しい門を足したなら CI か `paradise.test.js` が呼んでいる / NFR-03)
```
node graph/wiring.js check; echo "EXIT=$?"
```
期待: exit **0**、`✓ 門 N 本すべてに走らせる者が居る` を印字

**AC-28** 住所の直書きが再発していない(第30条)
```
node -e "const ws=require('./graph/workspace.js');const r=ws.hardcodedRefs();console.log(JSON.stringify(r));process.exit(r.length===0?0:1)"
```
期待: stdout `[]` / exit **0**

**AC-29** README 等の数値が測定と一致する(第22条)
```
node graph/census.js check; echo "EXIT=$?"
```
期待: exit **0**
**註**: `census.js` は 3 分以上かかる(discovery §7 で `node graph/census.js` が 180 秒で終わらなかった)。
build 相は十分な待ち時間を与えること。

**AC-30** 誤着の修正が `forge.js` の CLI からも同じ答えを返す(環と器が割れていない)
```
node graph/forge.js scale "楽園の自己診断に絞り込みの口を設ける"
```
期待: stdout `reform` / exit **0**
**修正前の実測**: stdout `counsel` / exit 0

---

**AC 総数: 30**
内訳 — 欠陥Aの修正 5 (AC-01〜05) / 回帰防止 4 (AC-06〜09) / 既存の門の保存 8 (AC-10〜17) /
欠陥Bの修正 9 (AC-18〜26) / engine の健全性 4 (AC-27〜30)

---

## 4. 完了条件

**AC-01 から AC-30 のすべてが期待通りである**こと。ただし:
* 撃てなかった AC(AC-22 の倉不在 / AC-26 の git 除去不能)は
  **skip を声に出して記録する**。緑と数えてはならない(第37条)。
* **AC-16(全走)を撃たずに完了と称してはならない。** 6 分は払うべき代である。
* 何件が pass / skip / fail かを **build 相が実測で書く**。手で数を書かない(第22条)。

---

## 5. 明示的な非目標

* `chooseScale` の返り値を構造化する(object にする)—— FR-05 が禁じる
* 語彙判定を機械学習/LLM に置き換える —— この走行の射程外
* `tests/paradise.test.js` の走行時間を縮める —— 別の欠陥(discovery §8-8)
* `ECサイトを作れ` の誤着を直す —— §6 へ送る

---

## 6. 教主の裁定を仰ぐべき点(discovery §8 から繰り上げ)

1. **`fullJa` から「アプリ」を外すこと。** AC-04(健康診断アプリ→standard)を満たす唯一の道だが、
   日本語の「アプリ」は full の印ではなくなり、英語の `app` は full の印のまま残る —— **非対称が生まれる**。
   実測では `タスク管理アプリを作って` が full→standard、`地図アプリが欲しい` が full→standard に動く。
   どちらも既存の門は緑のままだが(`counsel.test.js:56` は `['standard','full']` のどちらでも可、
   `paradise.test.js:7199` は「cartography でない」としか言わない)、**振る舞いは確かに変わる**。
2. **`ECサイトを作れ` → standard の誤着**を本走行で直すか、別の走行へ送るか。本 requirements は送る側に立った。
3. **`.paradise-creations` 目印ファイルを誰がいつ置くか**(FR-11)。
   `workspace.js init` が置くのか、倉側に一度手で置いて commit するのか。
   build 相の前に決まっていないと、AC-24 は通るが本物の倉は印 1(git remote)だけに頼ることになる。
