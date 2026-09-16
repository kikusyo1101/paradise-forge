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

**AC-04** 『健康診断アプリが欲しい』は **counsel でない**(教主裁定1)
```
node -e "const F=require('./graph/forge.js');const g=F.chooseScale('健康診断アプリが欲しい');console.log(g);process.exit(g!=='counsel'?0:1)"
```
期待: stdout が `counsel` **以外** / exit **0**

> **教主の裁定1(2026-09-13)** — design §1.6 の「`fullJa` から『アプリ』を外す」は**却下**。
> `fullJa` は一字も触らない。本走行の主題は **counsel への誤着**であって、
> full/standard の境目ではない。境目の病は別件に起票済み(台帳 PARA-7)。
> ゆえに本 AC の期待値を `standard` から **『counsel でないこと』** に改めた。
> **実測(build 相)**: `full` に着く。「診断」に道を奪われてはいない。

**AC-05** 『gauge に fingerprint を確かめる口を設ける』は reform へ着く
```
node -e "const F=require('./graph/forge.js');const g=F.chooseScale('gauge に fingerprint を確かめる口を設ける');console.log(g);process.exit(g==='reform'?0:1)"
```
期待: stdout `reform` / exit **0**

### 3.2 欠陥A — 回帰を防ぐ(教主が名指しした 4 件)

**AC-06** 『健康診断アプリが欲しい』→ **counsel でない**(AC-04 と同一。教主の回帰防止リストの一件として再掲)
— AC-04 と同じ命令・同じ期待(教主裁定1により期待値を改めた)。

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
['CI に ledger --audit を追加する','reform'],['健康診断アプリが欲しい','NOT:counsel'],
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
let bad=0;for(const[w,e]of T){const g=F.chooseScale(w);const ok=e.startsWith('NOT:')?g!==e.slice(4):e.split('|').includes(g);if(!ok){console.log('NG',w,'got='+g,'want='+e);bad++}}
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

## 3.6 欠陥C — **逆向きの誤着**: 世間一般の願いが reform へ拉い去られる

> ⚠️ **これは設計時に見逃された穴である。**
> design §1.5 は「`ENGINE_NAMES` は `graph/*.js` の名から測って作れ」「engine が増えたら
> 門が赤くなって人に知らせよ」とまでは言った。だが **「engine の名の半分は世間一般の語である」**
> とは一言も言わなかった。ゆえに build 相は `identity` `vendor` `contract` `census` `pulse`
> `deploy` `domains` `workflow` `ci` `atlas` を**強い固有名と同じ表に並べ**、
> `REFORM_RE` に `\b(?:ENGINE_NAMES)\b` として流し込んだ。
>
> 結果、**世間並みの創造の願いが engine 改修の 11 相へ攫われた**。教主の実測(HEAD `3b726f5`):
>
> | 願い | 落ちた先 | 当たった弱い名 |
> |---|---|---|
> | `build a workflow automation app for my team` | reform | workflow |
> | `an identity verification service for startups` | reform | identity |
> | `a vendor management dashboard` | reform | vendor |
> | `build a contract review tool` | reform | contract |
> | `make a census data explorer` | reform | census |
> | `a pulse oximeter tracking app` | reform | pulse |
> | `deploy a static site for my blog` | reform | deploy |
> | `atlas という名の地図アプリを作れ` | reform | atlas |
> | `CIに合格するためのアプリが欲しい` | reform | ci |
> | `顧客のワークフローを管理するアプリが欲しい` | reform | ワークフロー |
>
> 神が「ベンダー管理アプリが欲しい」と命じて楽園の engine を改造する道が立ち上がる ——
> **§3 の欠陥Aと同じ重さの病を、正反対に生んだ**だけである。本 requirements が
> §2 で名指しで禁じた「**誤着を直して別の誤着を生む**」そのものであり、
> ゆえに build 相は差し戻された(rework)。

**修正の形**: `ENGINE_NAMES` を **強い名 / 弱い名の二枚**に割る。

* **強い名** (`ENGINE_NAMES_STRONG`) — 楽園固有で世間の願い文に現れない
  (`conclave` `clergy` `codex` `forge` `gauge` `synod` `ordain` `spawn-trace` …)。
  **単独で reform を名乗ってよい。**
* **弱い名** (`ENGINE_NAMES_WEAK` / `ENGINE_NAMES_WEAK_JA`) — 世間一般の語と衝突する
  (`identity` `vendor` `contract` `census` `pulse` `deploy` `domains` `workflow` `ci`
  `atlas` `upstream` `derived` `lessons` `workspace` `ワークフロー`)。
  **(1) 建造の動詞(`BUILD_RE`)を伴い、かつ (2) 英語の冠詞
  (a/an/the/my/our/your/their)の直後でない** 時にのみ reform を名乗る。

`REFORM_RE` の**強い抽象名は一語も減らしていない**(楽園/paradise/憲法/engine/門/
自己診断/走行帳/オーケストレーション/神官/枢機卿…)。`ワークフロー` 一語だけが
強い抽象名の側から弱い名の側へ移った —— それは engine の器官名ではなく世間の語だからである。
`isCounsel` / `denude` / `PRODUCT_*` / `DOC_STRONG_RE` / `chooseScale` の**判定順は一段も動かしていない**。
3 段目の述語が `REFORM_RE.test(d)` から `isReformSubject(d)` に替わっただけである。

---

**AC-31** 世間一般の願いが reform へ攫われない(欠陥Cの修正 / 回帰防止)
```
node tests/counsel.test.js
```
期待: 上の実測 10 件と、rework 相の神官が自ら考えた 14 件 —— 計 **24 件が
`standard` または `full` に着き、`reform` でない**ことを門が断定する。
門は `notStrictEqual('reform')` で誤魔化さず、**落ち先まで名指しする**(第37条)。

**AC-32** 弱い名も、楽園を名指していれば reform に留まる(**逆向きの証明** / 第36条)
```
node tests/counsel.test.js
```
期待: `CI に ledger --audit を追加する` / `ci に一段の門を足す` /
`workflow に再試行の口を設ける` / `census に fix の口を足す` /
`add a retry flag to the deploy engine` が **すべて reform**。
強い名は単独で名乗る(`gauge に fingerprint を確かめる口を設ける` → reform)。
**註**: この AC が無ければ「弱い名は常に reform でない」に倒して AC-31 を緑にできてしまう。
それは弱い名を語彙から消したのと同じで、欠陥Aの修正を殺す。

**AC-33** 冠詞の除外が**単独で**効いている(黙る門を作らない / 第21条)
```
node tests/counsel.test.js
```
期待: `add a dark mode toggle to my vendor dashboard` /
`add CSV export to our census explorer app` /
`extend the workflow builder in my todo app` ほか計 **6 件が reform でない**。
**註**: AC-31 の 24 件は**どれも建造の動詞を持たない**ので、冠詞の除外を消しても
`BUILD_RE` の伴需が独りで守り門は黙る(rework 相の故障注入で実測)。
ゆえに **建造の動詞を持ちながら世間の願いである**形で別に撃つ。

**AC-34** `ENGINE_NAMES` 網羅の門が**二分に合わせて**更新されている(design §1.5 の改版)
```
node tests/counsel.test.js
```
期待: `graph/*.js` の名(4 文字以上・小文字)が **強い名か弱い名のどちらかに載っている**。
加えて —— (a) 同じ名が両方に居ない(排他)、(b) `ENGINE_NAMES` が二つの和である、
(c) `ledger`/`台帳` がどちらにも無い(L-4)、(d) **世間一般の 14 語が強い名の側に無い**。
engine が増えたら赤くなり、人に「**どちらへ載せるか**」を選ばせる。

**AC-35** 欠陥Cの修正が**故障注入で鳴る**(第21条 / 第57条)
三つの変異それぞれで `node tests/counsel.test.js` が赤くなること:
| 変異 | 期待 |
|---|---|
| (a) 弱い名を強い名の表に戻す | 赤くなる |
| (b) 冠詞の除外(後読み)を消す | 赤くなる |
| (c) `isReformSubject` から `BUILD_RE` の伴需を消す | 赤くなる |
**註**: 何本赤くなったかを rework 相が実測で書く。手で数を書かない(第22条)。

---

## 3.7 F-1 / F-4 — **強い名が無条件で reform を名乗る**(tribunal の BLOCK / 二度目の差し戻し)

裁判は **BLOCK** を出した。理由は本走行が **main に無かった病を作った**ことである。

**F-1**: `isReformSubject` は `if (REFORM_RE.test(d)) return true;` で
**強い名 26 語を無条件に真**としていた。防壁は `DETERMINER_LOOKBEHIND`(限定詞の除外)一枚のみ。
**日本語に冠詞は無い**ので、日本語の願いに対して防壁は事実上ゼロであった。

**F-4**: AC-31/32/33 のコーパス 29 件が**全て弱い名**であり、強い名が 0 件だった。
AC-35 の三変異も全て弱い名側の機構を狙っていた。
ゆえに 471/134/33 が**全緑のまま F-1 を素通しした**。
**「門が無い」より「門が在ると思っていたら守っていなかった」の方が危険である。**

**実測(第38条 — main と HEAD の両方で同じ探針を撃った)**:

| 群 | main c216014 | HEAD ec0694c(修理前) | HEAD(修理後) |
|---|---|---|---|
| 強い名 26 語 × 世間の願い | 0/26 | **25/26** | **0/26** |
| 教主の 10 件 | 0/10 | **10/10** | **0/10** |
| tribunal の B群 19 件 | 0/19 | **19/19** | **0/19** |
| **強い名 合計** | **0/55** | **54/55** | **0/55** |
| A群(楽園の改修・reform が正解) | 誤着 9/9 | 誤着 0/9 | 誤着 0/9 |

**註**: HEAD 修理前が 55/55 でなく 54/55 なのは、`graph-engine 折れ線グラフ描画ライブラリのデモサイト` が
**`cartography` に先に捕まった**ためである(判定順で作図が reform より先に立つ)。
強い名の枝が守ったのではない —— **別の段が偶々受け止めた**だけである(第37条)。

**修理**: `REFORM_RE` を `REFORM_ABSTRACT_RE`(抽象名)と `REFORM_STRONG_RE`(強い固有名)に割り、
`isReformSubject` を**三枝**にした。枝ごとに課す条件が違い、**どの枝も無条件ではない**:

1. 抽象名(楽園/門/engine/憲法/走行帳)—— 楽園以外を指さないので**無条件**
2. 強い固有名 —— 限定詞の除外 **かつ** 改変の動詞(`BUILD_RE` ∪ **`MEND_RE`**)
3. 弱い名 —— 限定詞の除外 **かつ** `BUILD_RE`

**`MEND_RE` が必要な理由**: `conclave の毒を除く` は `BUILD_RE` を一語も持たない
(「除く」は建造ではない)。強い名に `BUILD_RE` だけを課せば、この願いが死ぬ。
**強い名の方が証拠として強いので、許す動詞集合も広い** —— これが枝 2 と枝 3 の非対称の根拠である。
逆に `MEND_RE` に世間の創造の動詞(`作れ`/`欲しい`/`build`)を一語でも足せば F-1 へ戻る(AC-41 が撃つ)。

**弱い名の扱い・`isCounsel`・`denude`・`PRODUCT_*`・`DOC_STRONG_RE`・`chooseScale` の判定順は一行も触っていない。**

---

**AC-36** 教主が実測した **10 件**が reform へ攫われない(F-1 / 回帰の消滅)
```
node tests/counsel.test.js
```
期待: `gauge calibration tracker` / `forge 鍛冶屋の在庫管理アプリを作って` /
`synod 教会会議の議事録アプリ` / `critic 映画批評サイトを作れ` /
`verdict 裁判の記録を管理するツール` / `clergy 聖職者名簿アプリが欲しい` /
`abode 不動産アプリを作って` / `hermetic 密封容器の在庫管理` /
`conclave ボードゲームのスコア表アプリ` / `ordain 儀式の手順書アプリが欲しい`
—— **全て reform でない**。教主の実測(main 0/10 / HEAD 10/10)をそのまま門にした。

**AC-37** **強い名 26 語すべて**について世間の願いを一件ずつ撃つ(F-4 の本体)
```
node tests/counsel.test.js
```
期待: (a) `ENGINE_NAMES_STRONG` の**全語**にコーパスの一件が対応する
(表に在ってコーパスに無い名があれば赤い / 逆も赤い)、
(b) コーパスの願いが**その名を実際に含む**(第16条 — 名指しは呼び出しではない)、
(c) 26 件すべてが reform でない。

**註**: tribunal は 26 語のうち **12 語しか撃っていない**と名乗った(reflect W-3)。
この門は**表とコーパスを機械で照合する**ので、強い名を足してコーパスを忘れれば赤くなる。
**F-4(コーパスが表に追いつかない)の再演を機械が止める。**

**AC-38** 強い名は**改変の動詞を伴えば今まで通り reform**(逆向きの証明 / 第36条)
```
node tests/counsel.test.js
```
期待: (a) `BUILD_RE` 側 —— `gauge に fingerprint を確かめる口を設ける` /
`codex に検めの口を足す` / `synod に警告の一段を足す` / `conclave に再試行の口を設ける` /
`forge の道選びに一段足す` / `verdict に閾値の口を設ける` が **reform**。
(b) `MEND_RE` 側 —— `conclave の毒を除く` / `forge の道選びを修正する` /
`gauge の重みを見直す` / `codex の索引を書き換える` が **`isReformSubject` で真**。
**この 4 件は `BUILD_RE` を一語も持たないことを門が前提として確かめる**
(持っていれば `MEND_RE` を撃てていない — 黙る門になる)。

**註**: この AC が無ければ「強い名を語彙から消す」ことで AC-36/37 を全て緑にできてしまい、
欠陥A(engine 改修の願いが standard/counsel へ落ちる)が甦る。

**AC-39** 強い名の枝の**二条件がそれぞれ単独で効いている**(第21条 / 黙る門を作らない)
```
node tests/counsel.test.js
```
期待: (i) **動詞の伴需だけ**が守っている例 —— `forge 鍛冶屋の…` / `gauge calibration tracker`
(限定詞が無いので `REFORM_STRONG_RE` は真。動詞の伴需だけが reform を止めている)。
(ii) **限定詞の除外だけ**が守っている例 —— `add a gauge widget to my car dashboard` /
`add a critic score to my movie app`(`BUILD_RE` を持つので動詞の伴需は満たされる)。
門は両方について**前提が崩れていないこと**を先に assert する。

**註**: F-4 の教訓の一般化である。条件が二つ在るとき、片方だけで緑になる例しか持たない門は、
もう片方を消しても鳴らない。

**AC-40** **抽象名は無条件のまま**である(修理が広がりすぎていないこと)
```
node tests/counsel.test.js
```
期待: `楽園` / `paradise` / `憲法` / `engine` / `ハーネス` / `走行帳` / `自己診断` は
**動詞を伴わなくても** `isReformSubject` が真。
加えて `楽園の自己診断に絞り込みの口を設ける` / `門に監査の一段を足す` は **reform**。

**AC-41** `MEND_RE` に**世間の創造の動詞が紛れていない**(F-1 の再発防止)
```
node tests/counsel.test.js
```
期待: `作れ` `作って` `作る` `ほしい` `欲しい` `つくって` `実装` `開発` `構築` /
`build` `create` `make` `implement` `develop` —— **一語も `MEND_RE` に当たらない**。
逆向き: `除く` `直す` `修正` `見直` / `fix` `remove` は**確かに当たる**(表を空にして緑にしていない)。

**AC-42** F-1 / F-4 の修理が**故障注入で鳴る**(第21条 / 第57条)
11 の変異それぞれで `node tests/counsel.test.js` が赤くなること。
**うち 3 変異は門(コーパス)の側を壊す** —— 変異が実装側だけを狙ったのが F-4 の構造的理由だったからである。

| # | 変異 | 狙い | 期待 |
|---|---|---|---|
| M-1 | 強い名の枝から動詞の伴需を消す | **F-1 の修理そのものを戻す** | 赤 |
| M-2 | 強い名の枝から `MEND_RE` だけを落とす | 除去の願いが死ぬ | 赤 |
| M-3 | `MEND_RE` に世間の創造の動詞を足す | F-1 へ戻る道 | 赤 |
| M-4 | 強い名の枝から限定詞の除外を消す | R-4 の守りを戻す | 赤 |
| M-5 | 抽象名にも動詞を課す | 修理が広がりすぎた形 | 赤 |
| M-6 | 強い名の枝を殺す(`if (false)`) | 門を「消して」緑にする道 | 赤 |
| M-7 | 弱い名から `BUILD_RE` の伴需を消す | AC-35(c) の再確認 | 赤 |
| M-8 | 弱い名を強い名の表へ戻す | AC-35(a) の再確認 | 赤 |
| M-9 | `MEND_RE` から「除く」だけを落とす | 一語の欠落を捕らえるか | 赤 |
| M-10 | **門**: 強い名一語をコーパスから落とす | **F-4 の再演** | 赤 |
| M-11 | **門**: 強い名を表へ足しコーパスへ足さない | **実際の増設の形** | 赤 |

**註**: 何本赤くなったかを **build 相が実測で書く**。手で数を書かない(第22条)。
**黙った変異は名指しで正直に書く**(第37条)。

---

## 3.8 【build 相三度目】Q2-1〜Q2-4 の修理の AC(AC-43〜46)

> quality 二周目が **Q2-1(六度目の回帰)** を実測した ——
> `MEND_RE` の新設が、**強い名 × 改める動詞 の世間の願い 32/32 を reform へ攫った**(main 0/32)。
> 病の核心は第60条(f) が名指す通り「**強い枝に許した動詞集合が、そのまま新しい弱い印になった**」。
> AC-43〜46 はその修理と、**その修理自身への両方向試験**である。

**AC-43** `MEND_RE` × 強い名 の**世間の願いが reform へ着かない**(Q2-1 の本体)
```
node tests/counsel.test.js
```
期待:
* `isReformSubject` の枝 2'(強い名 × `MEND_RE`)が **`mendsParadise(d)` を追加で要求する**。
  `mendsParadise` = **世間の器の名を持たない**(`WORLDLY_VESSEL_RE`)**かつ**
  **強い名が助詞で結ばれている**(`STRONG_BOUND_RE`)。
* **`MEND_RE` の語彙表の全語について一件ずつ**世間の願いを撃つ
  (`MEND_WORLDLY_EVERY_VERB` / 34 語)。**一語も reform でない。**
* コーパスは `MEND_RE` の源と**機械照合される** —— `MEND_RE` に語を足して
  コーパスへ願いを足さなければ**赤くなる**(F-4 の五度目を機械が止める)。
* **二条件がそれぞれ単独で効いている**ことを撃つ(第21条 / 黙る門を作らない):
  器の不在だけが守っている例 / 助詞の結びだけが守っている例を**別々に持つ**。
* 禁則: `WORLDLY_VESSEL_RE` に**楽園の器官の名**(`口`/`門`/`相`/`一段`/`フラグ`/
  `台帳`/`索引`/`ledger`/`gate`/`flag`/`engine`)を**一語も入れてはならない** ——
  入れた瞬間 `門に監査の一段を足す` が死ぬ。**表を直に撃つ門**がこれを守る。
* 禁則: `ダッシュボード`/`dashboard` も入れてはならない —— 楽園自身が
  `dashboard/index.html` を持ち、`ダッシュボードを生きた門にせよ` は楽園の改革である(実測で赤くなった)。

**AC-44** 枝 3(弱い名)と枝 2'(強い名)の**どちらも OR で広がっていない**(Q2-3)
```
node tests/counsel.test.js
```
期待:
* 弱い名 × `MEND_RE` × **建造の動詞なし**の世間の願い 10 件について、
  **`isReformSubject` が偽**かつ **`chooseScale` が reform でない**。
  枝 3 を `(BUILD_RE || MEND_RE)` へ広げた瞬間に赤くなる。
* 枝 2' については **`mendsParadise` が実際に判定へ効いていること**を直に撃つ
  (`mendsParadise(d) === false` なのに `isReformSubject(d) === true` なら赤)。

**註**: quality 二周目 §2.3 の実測 —— 弱い名に `MEND_RE` を許す変異を
**177 本の門が一本も捕らえなかった**。AC-42 の 11 変異はすべて「実装を**弱める**」変異で、
「実装の条件を **OR で広げる**」変異が一件も無かったからである。
**広げる変異は、弱める変異とは別の門でしか捕らえられない。**

**AC-45** 抽象名 `門` / `gate` の**紛れ語が世間の願いを攫わない**
```
node tests/counsel.test.js
```
期待:
* `門` は `REFORM_ABSTRACT_RE` の唯一の**一字の名**である。
  `専門店` `門前町` `名門` `部門別` `入門講座` `関門` は世間の語であり、判定の門ではない。
  `PRODUCT_FALSE_FRIENDS` / `DIAGRAM_FALSE_FRIENDS` と**同じ作法**で `ABSTRACT_FALSE_FRIENDS` が守る。
* 英語の `gate` には**限定詞の除外も掛かる**(`the gate` は世間の搭乗口)。
* **世間の器の名を一語も持たない紛れ語**を別に撃つ ——
  故障注入 M-I の実測で、器を持つ例だけでは `WORLDLY_VESSEL_RE` が単独で守ってしまい
  `ABSTRACT_FALSE_FRIENDS` の表を空にしても門が**黙った**。
* 逆向き: `門に監査の一段を足す` / `critic の門を一本足す` / `門の判定を書き換える` は **reform** のまま。

**註**: これは **main 由来の病**である(main でも HEAD でも 5 件が攫われていた)。
本走行が新しく塞いだ。

**AC-46** 本相が足した正規表現も**故障注入で鳴る**(第21条 / 第57条 / 第60条(f))
13 の変異それぞれで `node tests/counsel.test.js` が赤くなること。
**うち 4 変異は「条件を OR で広げる/守りを外す」方向**である —— AC-42 の 11 変異が
すべて「弱める」方向だったことが Q2-3 の構造的理由だったからである。

| # | 変異 | 狙い | 期待 |
|---|---|---|---|
| M-A | 枝 2' から `mendsParadise` を外す | **Q2-1 そのものを戻す** | 赤 |
| M-B | `mendsParadise` から `WORLDLY_VESSEL_RE` の検査を外す | 二条件の片方だけを消す | 赤 |
| M-C | `mendsParadise` から `STRONG_BOUND_RE` の要求を外す | 二条件のもう片方を消す | 赤 |
| M-D | `STRONG_BOUND_RE` から助詞の要求を外す | 印を弱める | 赤 |
| M-E | `WORLDLY_VESSEL_RE` の表からアプリ/サイト/ツールを落とす | 表を空にして緑にする道 | 赤 |
| M-F | `WORLDLY_VESSEL_RE` に楽園の器官の名(`口`)を混ぜる | **禁則を破る** | 赤 |
| M-G | 枝 3 を `MEND_RE` へ広げる | **Q2-3 の変異** | 赤 |
| M-H | 抽象名の紛れ語+器の守りを丸ごと外す | AC-45 を戻す | 赤 |
| M-I | `ABSTRACT_FALSE_FRIENDS` の表を空にする | 表の側を壊す | 赤 |
| M-J | `gate` の限定詞の除外を外す | 英語側の守りを戻す | 赤 |
| M-K | `MEND_RE` の表から日本語を落とす | **逆向き**(楽園の改修が死ぬ) | 赤 |
| M-L | `namesParadiseAbstractly` を素の `REFORM_ABSTRACT_RE` へ戻す | AC-45 を戻す | 赤 |
| M-M | 枝 2(建造)を消す | **足しすぎの修理が逆向きを殺していないか** | 赤 |

**註**: 何本赤くなったかを **build 相が実測で書く**。手で数を書かない(第22条)。
**黙った変異は名指しで正直に書く**(第37条)。

---

**AC 総数: 46**
内訳 — 欠陥Aの修正 5 (AC-01〜05) / 回帰防止 4 (AC-06〜09) / 既存の門の保存 8 (AC-10〜17) /
欠陥Bの修正 9 (AC-18〜26) / engine の健全性 4 (AC-27〜30) /
欠陥C(逆向きの誤着)の修正 5 (AC-31〜35) /
F-1 / F-4(強い名の無条件通過)の修正 7 (AC-36〜42) /
**Q2-1〜Q2-3(`MEND_RE` の両方向)の修正 4 (AC-43〜46)**

---

## 4. 完了条件

**AC-01 から AC-46 のすべてが期待通りである**こと。ただし:
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

## 6. 教主の裁定(2026-09-13 に下りた。以下が優先する)

1. **`fullJa` から「アプリ」を外すことは却下された。** `fullJa` は一字も触らない。
   本走行の主題は **counsel への誤着**であって full/standard の境目ではない。
   境目の病は別件に起票済み(台帳 PARA-7)。
   ゆえに **AC-04 / AC-06 の期待値を『standard』から『counsel でないこと』へ改めた**(上記 §3.1)。
   実測: 『健康診断アプリが欲しい』は **full** に着く —— 「診断」に道を奪われてはいない。
2. **`ECサイトを作れ` → standard の誤着は本走行に含めない。** 同じ理由。触らない。
3. **`.paradise-creations` 目印ファイルは作る。** ただし**読む側だけにしない**。
   * `workspace.js init` が倉の根に置く口を持つ(FR-11。門 `B-11` が撃つ)。
   * 兄弟倉 `paradise-creations` に実物を置き commit する(**push も PR もしない**)。
     実測: ブランチ `chore/vault-marker` / commit `e87577c`。
   * これにより印 2 は**本物の倉で実際に発火している** —— `git` を PATH から外しても
     `isCreationsVault(本物の倉) === true`(実測)。第57条の「発火しない門」を免れた。

---

## 7. build 相が設計から逸脱した点(正直な記録 — 第37条)

1. **`PRODUCT_FALSE_FRIENDS` を足した(設計に無い)。**
   設計 §1.3 の L-8 は「図」についてのみ紛れ語を警告していたが、実装して撃つと
   一字の産物名「口」「相」が **人口 / 窓口 / 入口 / 相場 / 相談** の中に埋もれており、
   **基準線で counsel だった 7 件が standard へ落ちた**(実測)。
   設計の判定順は変えていない。`wantsProduct()` として `PRODUCT_RE` の使い方を包んだだけである。
2. **`DOC_STRONG_RE` を足した(設計に無い)。**
   設計 §1.3 の 3 段目は「DOC に当たり、かつ PRODUCT が無いなら諐問」だったが、
   これだと『各社の**画面**設計を調査して**報告書**がほしい』が創造の道へ攫われる(実測)。
   二つの顔を持つ語は **「診断」と「監査」だけ**であり、他の文書の名(報告書/比較表/調査/分析…)は
   産物の名に勝たねばならない。3 段目をその形に精密化した。
3. **`counsel.test.js:292` の「壊れ engine」門の期待値を `standard` → `reform` に改めた。**
   FR-04 が `REFORM_RE` に **`CI`** を加えた必然の帰結である(『現状の**CI**の健全性を…』)。
   門の主張(「語彙を潰せば counsel でなくなる」)は一字も緩めていない。
   `notStrictEqual` で誤魔化さず、落ち先を名指ししたまま残した。
