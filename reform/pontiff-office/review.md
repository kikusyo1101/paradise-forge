# review — reform/pontiff-office の機構審査

**相**: review @code-reviewer (reform の道 第6相)
**対象**: `reform/pontiff-office` (8コミット + docs 1、`main` 比 +7,007 / −64)
**立場**: 第11条。教主が指揮した仕事を、指揮系統の外の目で読む。**直さない — 名指しするだけである。**
**日時**: 2026-09-03

---

## 0. 裁定

| | |
|---|---|
| **BLOCK** | **1件** — `measure()` が git の失敗を「変更ゼロ」と読み、序列3の門が **fail-open** する |
| MAJOR | 4件 |
| MINOR | 5件 |
| NIT | 4件 |

**BLOCK 級を1件見つけた。** 本PRの中核である第52条(c)「その『単純』は教主が名乗るのではなく、
機構が実測して裁く」が、**実測が失敗したとき無条件に緑を出す**。
条文が門と対になっていることを自ら宣言している(第52条末尾)以上、
門が空振りする経路が在れば条文もその分だけ空文である。

同時に率直に記す。**この PR の骨格は良い。** 判定表を `spawn-trace.js` 一箇所に住まわせた判断、
`chooseScale` を一行も変えずに `admit()` を足した判断、`markDone` の throw が `save` に到達しない形、
`atlas` の `kind` 分類、`writeCollege` が末席に挿す理由の実測——
どれも「後から読んで分かる」水準を超えて「なぜそうしなかったか」まで書かれている。
以下の指摘は、その水準に対して撃つものである。

---

## 1. BLOCK

### B-1 `measure()` は git の失敗を「変更ゼロ」と読む — 序列3の門が fail-open する

**場所**: `graph/spawn-trace.js:167-171` (`gitOut`)、`:186-262` (`measure`)、`:260` (`measurable`)

```js
function gitOut(args, cwd) {
  try {
    return execFileSync('git', args, {...});
  } catch { return null; }        // ← 全ての失敗が null に潰れる
}
```

`gitOut` は git のあらゆる失敗——`ENOENT`(git 不在)・非 git ディレクトリ・
壊れた index・権限拒否・`--since` の日付書式エラー——を区別せず `null` に潰す。
`measure()` は `null` を受けると単に**その計測をスキップし、files=0 / churn=0 のまま先へ進む**。

`judge()` はその 0 を実測値として閾値に当てる:

```
files=0 > 2 ?  no
churn=0 > 50 ? no
bytes=0 > 4096 ? no
→ 🟢 序列3: 教主の手 (files=0/2 churn=0/50 bytes=0/4096)
```

**走らせた出力**(`execFileSync` を差し替えて git を ENOENT にした):

```
$ node -e "cp.execFileSync = (f)=>{ if(f==='git') throw ENOENT; ... }"
measure with git ENOENT = {"files":0,"churn":0,"bytes":0,"measurable":true}
judge tier3 => 🟢 GREEN — 門は通る 序列3 | 序列3: 教主の手 (files=0/2 churn=0/50 bytes=0/4096)
```

非 git ディレクトリでも同じである(50,000 バイトの成果物を置いた状態で):

```
measure(non-git cwd) = {"files":0,"churn":0,"bytes":0,"t0":"...","t1":"...","measurable":true,"fileList":[]}
judge tier3 => 🟢 GREEN "序列3" 序列3: 教主の手 (files=0/2 churn=0/50 bytes=0/4096)
```

**なぜ BLOCK か。**

1. **`measurable` は嘘をついている。** `spawn-trace.js:260` は
   `measurable: !!t0 || commitsMeasurable || diff != null` と書く。
   `t0` は `dispatchedAt` が在れば真になる。`dispatchedAt` は `conclave.markRunning()` が
   必ず刻む(`conclave.js:241`)。ゆえに **git が完全に死んでいても `measurable:true` が返る。**
   上の出力がそれを示している。「測れたか」を名乗る鍵が、測れなかった事実を隠している。

2. **誰もこの鍵を読んでいない。** `measurable` の消費者を grep した:
   ```
   ./graph/spawn-trace.js:260:    measurable: !!t0 || commitsMeasurable || diff != null,
   ./tests/paradise.test.js:4443:    assert.strictEqual(m.measurable, true, '測れなかった — ...')
   ```
   **`judge()` は `m.measurable` を一度も見ない。** 試験は「true であること」を assert するだけで、
   false になった経路の挙動を撃っていない。つまり measurable は**書かれただけの鍵**であり、
   fail-safe の役を一切果たしていない。

3. **設計自身がこれを禁じている。** `spawn-trace.js:178-182` の doc comment はこう述べる:

   > **窓の両端**: t0 = `phase.dispatchedAt`(無ければ history の dispatch)、
   > t1 = 呼ばれた瞬間。**両方無ければ測定不能** — 測れなかったものを
   > 「閾値内」と報告しない(第16条)。

   `t0` の欠落だけを「測定不能」と定義しており、**git 自体の失敗を測定不能に数えていない。**
   さらに同 comment は「限界は正直に書く: …過大評価の方向にしか働かない(赤は出るが緑は出ない)= fail-safe」
   と主張するが、**git 失敗経路は過小評価であり、緑しか出さない。** 主張と実装が食い違っている。

4. **`atlas.js` は同じ問いに正しく答えている。** 本PRは同じコミット群で
   `atlas.js` に `inconclusive` という第5の `kind` を導入し、
   「測れなかったことは『溢れた』ことではない」「測定不能も許さない — 測らなかったものに
   巻物の許しを与えれば、門は『見なかった』を『収まっていた』と言い換えることになる(第16条)」
   (`atlas.js:1367-1371`) と書いた。**同じ PR の中で、同じ原則が spawn-trace 側には適用されていない。**
   片方だけ第16条を守っているのは、原則の不徹底ではなく見落としである。

**求める形**(直しは verify 相/後続PRの領分だが、方向だけ記す):
`gitOut` が `null` を返したことを `measure()` が握り潰さず、
`measurable:false` / `state:'inconclusive'` を返し、`judge()` が**緑を出さない**こと。
`atlas` の `kind` と同じ第4の状態が `judge` にも要る。

---

## 2. MAJOR

### M-1 第52条(f)「統治は仕事ではない」の免除根拠が、実装では成立していない

**場所**: `requirements.md:166-167`、`graph/spawn-trace.js:72-78` (`MEASURE_EXCLUDE`)、`:186-262`

requirements §2.5 は免除の機構をこう説明する:

> **この区別が機械に見える理由**: 統治行為は **`conclave.js done --artifact` に成果物を登録しない。**
> 序列の門は「登録された成果物」だけを見る。ゆえに統治は何も鳴らさない(AC-G1)。

**これは `bytes` にしか当てはまらない。** `measure()` は3つの量を測る:

| 量 | 出所 | 「登録された成果物だけを見る」か |
|---|---|---|
| `bytes` | `opts.artifact || p.artifactPath` | **はい** |
| `files` | `git log --numstat` + `git diff HEAD` + 未追跡 | **いいえ — リポジトリ全体** |
| `churn` | 同上 | **いいえ — リポジトリ全体** |

**走らせた出力**(artifact を一切渡さない = 統治行為の想定):

```
$ node -e "t.measure(run,'p')   // artifact 未登録"
artifact 未登録でも measure() は: {"files":3,"churn":756,"bytes":0}
```

**files=3 / churn=756 が計上された。** t3 の閾値は files 2 / churn 50 である。
すなわち**成果物を一つも登録しない純粋な統治行為であっても、
その窓の間にリポジトリが動いていれば序列3の判定は赤になる。**
免除は `bytes` の一項だけであり、requirements が約束した「何も鳴らさない」は成立していない。

実際には赤が出ていない理由は、**免除が効いているからではなく、
教主が統治行為に対して `done` を刻んでいないからである**——
すなわち門を通っていないだけであって、免除機構が働いた結果ではない。

**なぜ MAJOR か。** 課題文が名指しした通り、ここが緩ければ第52条は空文になる。
実際に検めた結論は「緩い」ではなく **「免除の理屈が実装と一致していない」** である。
方向は二つに割れている:

- **偽陽性の側**: 統治中に他所でリポジトリが動けば、統治が序列違反として鳴りうる。
- **偽陰性の側**: 逆に、`MEASURE_EXCLUDE` は `conclave.json` / `dashboard/atlas/` / `node_modules` の
  3本しか除かない。**「統治」を名乗って逃げる経路は、白名簿ではなく
  「artifact を登録しない」ことで開く。** design.md:251 は
  「これは『統治行為を白名簿に載せる』設計ではない。**白名簿は必ず漏れる**」と正しく述べているが、
  白名簿を避けた代わりに置いた根拠(「登録された成果物だけを見る」)が
  files/churn について事実でないため、**根拠そのものが漏れている。**

なお課題文の問い「何でも『統治』と名乗れば逃げられる作りになっていないか」への直接の答えは
**「名乗りでは逃げられない」** である。`judge()` に「統治」という入力口は存在せず、
`opts` に governance フラグは無い。名乗りによる脱出口は無い。
**逃げ道は名乗りではなく『門を通らないこと』の側に在る**(→ M-2)。

### M-2 門は `markDone` 一箇所にしか立っておらず、`done` を刻まなければ序列は何も縛らない

**場所**: `graph/conclave.js:344`(唯一の `trace.judge()` 呼び出し)、`tests/paradise.test.js:3855`

門の設置点を grep で数えた。`judge()` の呼び手は `conclave.markDone` ただ一つである。
試験自身がこれを自覚して書いている:

```js
// tests/paradise.test.js:3855
// **白名簿ではない。門を仕掛ける場所が markDone 一箇所だから、それ以外は定義上鳴らない。**
```

これは AC-G1(統治は偽陽性を出さない)を満たす設計判断として意図的であり、
design.md:1084 が明示している。**問題は、それが同時に第52条(e) の穴になることである。**

第52条(e) は述べる:

> **(e) 宣言なき手仕事は序列3ではなく、ただの無証跡である。** 事後に
> 「あれは序列3だった」と言えるなら、序列は何も縛らない(第27条)。

しかし現在の機構では、**逆向きの「宣言しない」が縛られていない**:
`conclave` の環に載せずに教主が engine を書き換えれば、`markDone` を一度も通らないので
`judge()` は一度も呼ばれない。`spawn-trace.js audit` は `tierTrace` に**刻まれた判定を読むだけ**であり
(`spawn-trace.js:434` の comment「刻まれた判定を読む。**再判定しない**」)、
**環の外で起きた仕事を発見する機構は本PRに無い。**

第52条は自ら「第23条は同じ病を名指ししたが、その後も非merge の全てが同じ名義であり続けた」と
書いている。その病の再発経路が、条文の下でそのまま残っている。

**これは BLOCK ではない。** 本PRの範囲(環の中の序列を機械化する)を超えるからである。
だが **requirements/design のどちらも、この残存リスクを「範囲外」として明示していない。**
prove.md に「環に載らない仕事は本機構では捕捉できない」の一文が要る。

### M-3 `--scale` を明示した `forge plan` で、`admit()` が**誤った名簿**を裁く

**場所**: `graph/forge.js:401-411` (`admit`)、`:475-486` (`plan` の CLI)、`design.md:1010`

`admit()` は自分の中で `chooseScale(wish)` を呼び直し、その道の名簿だけを裁く:

```js
function admit(wish) {
  const scale = chooseScale(wish);              // ← 引数の --scale を受け取らない
  const agents = new Set(SCALES[scale](wish).map(t => t.agent).filter(Boolean));
  ...
}
```

CLI 側は `admit()` を先に通してから `--scale` を適用する:

```js
const a = admit(wish);
if (!a.ok) { ...; process.exit(1); }
const scale = flags.scale || a.scale;          // ← --scale がここで初めて効く
```

`forge.js:481` の comment は
「`--scale` を明示した呼び方は道の選定を人が引き受けたということなので、**分野の適合だけを裁く**」
と述べるが、**裁いている名簿は `--scale` で選んだ道のものではない。**

**走らせた出力**:

```
$ node -e "..."
chooseScale('CSSのタイポを直せ') = quick
quick roster: market-researcher,requirements-analyst,architect,verification-loop,self-critic,creation-judge
full  roster: market-researcher,requirements-analyst,architect,tdd-guide,code-reviewer,ux-reviewer,security-reviewer,doc-updater,verification-loop,self-critic,creation-judge
admit() judged: quick -> ok false
=> --scale full を渡しても admit は quick の名簿しか裁かない
```

`--scale full` を渡すと `tdd-guide` / `code-reviewer` / `ux-reviewer` / `security-reviewer` / `doc-updater` の
5名が新たに道に載るが、**その5名の分野適合は一度も検められない。**
逆向きの穴も在る: `--scale quick` を渡した願いが `chooseScale` では `full` に落ちる場合、
`admit()` は実際には使わない `full` の名簿で拒否しうる(偽陽性)。

`admit(wish, scale)` を受けられる形にすれば済む話であり、**設計意図(コメント)と実装の乖離**である。

### M-4 機械の状態値に日本語文字列 `'序列3'` が混ざっている — 他の全状態は ASCII kebab-case

**場所**: `graph/spawn-trace.js:361, 393-397, 400-402, 436-441`、`graph/gauge.js:127`

`judge()` が返す `state` の値域を並べる:

```
'unobservable'  'no-tier'  'asserted-only'  'no-trace'
'gate-tier3'    'tier3-observed'  'tier3-breach'
'序列3'          ← これだけ日本語
'observed'
```

`'序列3'` は機械の鍵として**5箇所で文字列比較されている**:

```js
graph/spawn-trace.js:397   tier3: phases.filter(id => stateOf(id) === '序列3').length,
graph/spawn-trace.js:441   '序列3': rows.filter(r => r.state === '序列3').length,
graph/gauge.js:127         const tier3 = marked.filter(p => tt[p.id].state === '序列3').length;
```

`tierAudit().counts` の鍵も `'序列1' / '序列2' / '序列3' / unobservable` と**日英が混在**している
(`spawn-trace.js:436-441`)。

**なぜ MAJOR か。第41条(語彙の正典)の趣旨に照らして重い。**
`clergy.js` の `LEXICON` は「散文の名」を一つの出所に縛る機構であり、
`lexiconCheck` が全散文を裁く(実測: `node graph/clergy.js lexicon-check` → 207文書に異名なし、exit 0)。
だが `LEXICON` は **rank と college しか知らない**。`tier` / `domain` / `ordain` は
`LEXICON` に登録されておらず、**新語3つが正典の外に建った。**

そこへ「機械の状態値が日本語」が重なると:

- `state` の綴りを直す/訳す誰かが、`'序列3'` を `'tier3'` に変えた瞬間に
  `gauge.tier3` と `report.tier3` と `tierAudit.counts` が**黙って 0 になる**。
  型も試験もこれを止めない(試験は `'序列3'` を直書きしている)。
- `conclave.json` に永続化される値でもある(`tierTrace[id].state`)。
  **台帳のスキーマに日本語リテラルが焼き付いている。**

散文が「序列3」と呼び、code が `'序列3'` と綴ること自体は食い違いではない——
むしろ一致している。**問題は同じ値域の他の7つが英語であること**、
すなわち**値域の内側で語が食い違っていること**である。

---

## 3. MINOR

### m-1 `TIERS.t2.artifacts` と `TIERS.t2.domains` は誰も使わない — 表示専用の死んだ閾値

**場所**: `graph/spawn-trace.js:66-69`、`:369`、`:492`

```js
const TIERS = Object.freeze({
  t3: Object.freeze({ files: 2, churn: 50, bytes: 4096 }),
  t2: Object.freeze({ files: 10, churn: 880, artifacts: 2, domains: 2 }),
});
```

grep した消費者:

```
./graph/spawn-trace.js:369:  const t2 = m.files > TIERS.t2.files || m.churn > TIERS.t2.churn;   ← files/churn のみ
./graph/spawn-trace.js:492:  console.log(`... artifacts ≥ ${TIERS.t2.artifacts}  domains ≥ ${TIERS.t2.domains}`);  ← 表示のみ
./tests/paradise.test.js:3844-3845: 「7値が現れる」ことを assert  ← 存在のみ
```

**`artifacts` と `domains` はどの判定にも入っていない。**
`tiers` の出力は「序列2 (編成が要る境界): … artifacts ≥ 2 domains ≥ 2」と**閾値として告知する**が、
`judge()` は成果物の数も分野の数も数えない。**告知された基準で裁かれない。**

第52条(c) は「閾値は `node graph/spawn-trace.js tiers` ただ一箇所が語り、**門はその数で裁く**」と述べる。
7値のうち2値については、門はその数で裁いていない。

AC-G2 が「7つの数がすべて現れる」ことしか要求していないため試験は緑だが、
**試験が要求を写しているだけで、要求が門の実効性を写していない。**

### m-2 `conclave done` の CLI に完全に同一な二分岐がある(死んだ分岐)

**場所**: `graph/conclave.js:464-465`

```js
if (v && v.state === 'unobservable') console.log(v.lines.join('\n'));
else if (v && v.lines && v.lines.length) console.log(v.lines.join('\n'));
```

両分岐の本体が**一字一句同じ**である。`unobservable` の `lines` は必ず1本以上あるので
(`spawn-trace.js:307`)、第1分岐は第2分岐に完全に吸収される。
分岐を分けた意図(unobservable を別扱いする)が、実装では失われている。

### m-3 裸の `--tier`(値なし)が `true` として通り、`declared: 1` と記録される

**場所**: `graph/conclave.js:440` (`parse`)、`:462`、`graph/spawn-trace.js:299`

`conclave` の `parse()` は値を伴わないフラグを `true` にする。
`judge()` は `Number(true)` = `1` を得るので、**`--tier` とだけ書けば「序列1(委譲)を宣言した」ことになる。**

**走らせた出力**:

```
$ node -e "t.judge(run,'p',{tier:true})"   // 起動証跡あり
bare --tier => RED asserted-only | 自己申告 — 序列1を名乗るが tool_use の証跡が無い
declared recorded as: 1
```

`--tier` に値を書き忘れたタイプミスが、**未宣言(no-tier)ではなく「序列1を宣言した」に化ける。**
序列1は証跡を要求するので実害は出にくいが、
第52条(e)「宣言なき手仕事は…ただの無証跡である」の精神に照らせば、
**打ち損じが宣言として通ってはならない。**

同様に `judge()` の数値変換は緩い:

```
"3"     => tier3 として扱われる
"03"    => tier3
" 3 "   => tier3   ← 空白入りも通る
"3abc"  => no-tier  (NaN 経路は正しく赤)
true    => tier1
```

`Number.isNaN` のガードは在るので **NaN が閾値比較に届く経路は無い**(課題文の懸念点は満たされている)。
問題は NaN ではなく、**NaN にならない緩い変換**の側である。

### m-4 `measure()` の `bytes` はディレクトリを浅くしか数えない

**場所**: `graph/spawn-trace.js:265-268` (`dirBytes`)

```js
function dirBytes(dir) {
  let total = 0;
  try { for (const f of fs.readdirSync(dir)) {
    try { const st = fs.statSync(path.join(dir, f));
          total += st.isDirectory() ? 0 : st.size; } catch {} } } catch {}
  return total;
}
```

サブディレクトリは **0 として加算される**(再帰しない)。
成果物がディレクトリで、中身が `src/` の下に在れば `bytes=0` になる。
これも過小評価=fail-open の方向であり、B-1 と同じ病の小型版である。

**走らせた出力**:

```
bytes for DIRECTORY artifact = 292158 (shallow, subdirs counted as 0)
```

`reform/pontiff-office/` は平坦なので今回は効かないが、
`--artifact` にディレクトリを渡す設計を許している以上、限界を doc comment に書くべきである
(`measure()` は他の限界を全て正直に書いているので、ここだけ黙っているのが不整合)。

### m-5 `domains.check()` は `check-agents` の名簿構築を再実装している

**場所**: `graph/domains.js:90-99` vs `graph/check-agents.js:44-49, 81, 182`

両者とも `forge.SCALES` を総なめし、`clergy.COLLEGE` の `priests` を足して名簿を作る:

```js
// domains.js:91-98
for (const scale of Object.keys(forge.SCALES)) {
  for (const t of forge.SCALES[scale]('<wish>')) if (t.agent) named.add(t.agent);
}
for (const c of Object.values(clergy.COLLEGE)) for (const p of (c.priests || [])) named.add(p);
for (const o of (clergy.TRIBUNAL.officers || [])) named.add(o);
```

```js
// check-agents.js:44-49 — 同じ二重ループ
```

**重複しているのは「判定」ではなく「名簿の作り方」である。**
design.md:960 の重複審査表は「実在 vs 適合は別の問い」として判定の非重複を正しく論じているが、
**名簿構築ロジックの重複には触れていない。**

実際に食い違いが出ている。`domains check` の出力:

```
分野 14 / 宣言を持つ役者 14 / 道が名指しする役者 13
```

`check-agents` は自分で「named by the paradise: N (forge.js + clergy.js + **examples**)」と数える。
`domains.js` は `examples` を見ない。**二つの門が「道が名指しする役者」を違う数で持っている。**
今は両方緑なので露見しないが、`examples` にだけ現れる agent が生まれた日に、
`check-agents` は鳴り `domains` は黙る。

`check-agents` が名簿を `module.exports` すれば済む。`PSEUDO` は既にそうしている
(`domains.js:88` が `require('./check-agents.js').PSEUDO` を正しく再利用している)ので、
**同じ engine から片方だけ借りているのが不徹底である。**

---

## 4. NIT

### n-1 `domains.domainsOf()` と `atlas.FIRST_SCREEN_KINDS` は export されているが呼び手が居ない

grep 結果:

```
domainsOf:          定義1 + export1 = 呼び手 0
FIRST_SCREEN_KINDS: 定義1 + export1 = 呼び手 0
```

`node graph/wiring.js check` は engine 間の辺しか見ないので鳴らない
(実測: `engine 36 / 内の辺 51 / ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い`, exit 0)。
第44条「呼ぶ者の居ない道具は住み続けない」の engine 内版である。
`dispatchTime` も export されているが外部呼び手は 0(内部 1箇所のみ)。

### n-2 `conclave.next()` の `tier_hint` は誰も読まない

```
./graph/conclave.js:214:          tier_hint: {
```

engine 内・試験・CI・散文のどこにも消費者が無い(`build-report.md` と `design.md` の言及のみ)。
発令書の JSON に載って教主が目で読む前提の「助言」であり、コメントもそう明言している
(「助言であって強制ではない」)ので設計通りではある。
ただし **`gate` 相以外では常に `{default:1}` の同じ値**であり、情報量がほぼ無い。

### n-3 `clergy.RANKS.pontiff.duties` は試験の存在確認以外に読み手が居ない

```
./tests/paradise.test.js:3831: assert.ok(p.duties && p.duties[k], ...)
```

`tiers`(配列)は `atlas` も `apply-seat` も読まないが、順序が法であるという主張を
`RANKS` に住まわせる意味は理解できる。`duties` は object であり順序に意味が無く、
**どの engine も参照しない純粋な文書**である。散文(第52条 f)と二重に持っている
——第22条「数を散文へ写経すれば必ず腐る」の、数ではなく列挙版のリスクが在る。

### n-4 `ordain verify --only` は試験からしか使われない

```
tests/paradise.test.js:4200:  ordainT.verify('architect', { only: ['分野の適合', '結線'] });
```

CLI にも `--only` の口が在り(`ordain.js:367, 379`)、help にも載っているが、
実運用の呼び手は無い。試験を速くするための口を production の help に載せているのは
情報の水増しである。害は無いので NIT。

---

## 5. 設計意図と実装の乖離 — §13 コマンド面表の実走確認

design.md §13 が確定させた argv / exit code / 出力の語を、**全て実際に走らせて**突合した。

| 表 | 約束 | 実測 | 判定 |
|---|---|---|---|
| §13.2 `tiers --json` | exit 0 / JSON に 2,50,4096,10,880,2,2 | `{"epoch":"v1","TIERS":{"t3":{"files":2,"churn":50,"bytes":4096},"t2":{"files":10,"churn":880,"artifacts":2,"domains":2}}}` exit 0 | **一致**(ただし m-1) |
| §13.2 `tier <run>` | exit 0 に `序列1: n / 序列2: n / 序列3: n / unobservable: n` | `序列1: 0 / 序列2: 0 / 序列3: 0 / unobservable: 11` exit 0 | **一致** |
| §13.2 `audit` | exit 0 に `unobservable: <n>` + 黄の一覧 / 走査0件は exit 1 | `走査 8 件 / unobservable: 94 (legacy 8 走行)` exit 0、黄8行 | **一致** |
| §13.2 `report` | 5値 | `phases: … observed: … asserted-only: … no-trace: … 序列3: … unobservable: …` | **一致** |
| §13.3 `scale` 担い手なし | exit 1 + `担い手が居ない` + 分野名 + `node graph/ordain.js forge …` | 「音楽を作れ」→ 3語すべて出現、exit 1 | **一致** |
| §13.3 `scale` 分野不明 | exit 1 + `分野を判定できない` | 「ズズズqqq」→ 一致、exit 1 | **一致** |
| §13.3 `scale` 通常 | exit 0 / 道名のみ(従来通り) | 「ログイン画面を作れ」→ `standard` のみ、exit 0 | **一致** |
| §13.3 `plan` 拒否時 | **`<path>` を作らない** | `ls .revtmp/deny` → `No such file or directory`、exit 1 | **一致** |
| §13.4 `domains check` | exit 0 / exit 1 + 欠けた名 | exit 0、`分野 14 / 宣言を持つ役者 14 / 道が名指しする役者 13` | **一致** |
| §13.4 `classify` | exit 0 + 分野id / exit 1 + `分野を判定できない` | `music (音楽・音声)` exit 0 / 一致 exit 1 | **一致** |
| §13.5 `ordain forge/enlist/verify` | 0 / 1 | dry-run で 0、不備で 1、`verify --name architect` で全7門 ✓ exit 0 | **一致** |
| §13.6 `contract check --run` | exit 1 + `file-but-unspawned` | `"verified": "file-but-unspawned"` exit **1** | **一致** |
| §13.6 `contract check` 無 `--run` | exit code 現状不変 | exit **0** | **一致** |
| §13.7 `gauge score --json` | 既存9鍵 + tier1/tier2/tier3/noTier/unobservable/tier3Ratio | legacy run で `…,"tier1":0,"tier2":0,"tier3":0,"noTier":0,"unobservable":11,"tier3Ratio":0}` かつ既存9鍵不変 | **一致** |
| §13.7 `gauge compare` | exit 0。COMPARE_KEYS に tier3Ratio | exit 0、`COMPARE_KEYS` に含む(`gauge.js:227`) | **一致** |
| §13.8 `atlas check` | exit 0 のとき stdout に `OVERFLOW` を含まない | 自己診断 318/318 緑に含まれる | **一致** |
| §13.1 `conclave done` | 表の全行 | 下記 | **1点乖離** |

**§13.1 の乖離**: 表は `done` の argv を
`done <phaseId> --run <run.json> --artifact <path> [--tier <1|2|3>]` と書き、
`--tier` を `1|2|3` に限定している。**実装は値の無い `--tier` を受理し `1` と解釈する**(→ m-3)。
表は「1|2|3 のいずれか」を argv の契約として宣言しているので、これは表と実装の乖離である。

**§13.1 の他の行はすべて一致した。** 実走で確認した例:

```
$ node graph/conclave.js done build --run .revtmp/run.json --artifact README.md --tier
起動の証跡が一つも無い — 序列1を名乗る相 "build" は誰も起動していない (第27条)
  委ねるべき agent: architect
  node graph/spawn-trace.js record <run> build --agent architect --tool-use-id <id>
  (判定: no-trace / 相 build)
exit=1
--- what got recorded? ---
undefined        ← run ファイルは書き換わっていない
```

**「拒んだのに台帳だけ進む」が構造的に禁じられていることを実測で確認した**
(`conclave.js:457-459` の主張が本当である)。これは良い。

**「成果物の実在の門が序列の門より先に立つ」ことも実測で確認した**:
存在しない artifact + `--tier` を渡すと第22条のメッセージが先に鳴り、
`tierTrace` は書かれない。`conclave.js:342-343` の設計意図通りである。

---

## 6. 命名の審査(第41条)

**結論: 新語3つは既存語と衝突していないが、正典(`LEXICON`)の外に建っている。**

| 新語 | 既存語との衝突 | 所見 |
|---|---|---|
| `tier` / 序列 | **衝突なし** | `RANKS[].level` が既存の階層数値だが、`tier` は行為の分類であり位階ではない。`clergy.RANKS.pontiff.tiers` に住まわせたことで**位階の属性**として読める形になったのは、むしろ正しい入れ子である |
| `domain` / 分野 | **衝突あり(既存語の再利用)** | 下記 |
| `ordain` / 鍛造 | **衝突なし** | `forge` との重なりが唯一の懸念 → 下記 |

### 6.1 `domain` は既に2つの意味で使われており、本PRが**3つ目**を足した

grep で数えた既存用法:

```
graph/conclave.js:105,116,284,372,394,401,416,434-435,488-495   run.domains = 枢機卿の管区(6つ)
graph/gauge.js:57-61,166                                        同上
graph/spawn-trace.js:146-147,391,417                            同上
graph/clergy.js  COLLEGE[].domain                               枢機卿の担当領域名
graph/deploy.js:153 / apply-seat.js                             —
```

- **意味1**: `run.domains[]` = 環の管区。枢機卿1人が1つ持つ。値は `construction` `quality` など。
- **意味2**: `clergy.COLLEGE[c].domain` = 枢機卿の領域の**表示名**。
- **意味3(本PR)**: `domains.json` の分野 = 役者が担える**仕事の種類**。値は `music` `software` `infra` など。

**意味1と意味3が同じ engine の中で並んでいる。** `spawn-trace.js` を読むと:

```js
graph/spawn-trace.js:54:  *   t2.domains   = 2  2分野に跨る仕事に…      ← 意味3
graph/spawn-trace.js:146: if (Array.isArray(run.domains)) {           ← 意味1
```

**同じファイルの同じ綴りが 92行離れて別のものを指している。**
`TIERS.t2.domains` は「2分野に跨る」= 意味3 の閾値だが、
`run.domains` を読む `findPhase` のすぐ上に住んでいる。

`lexiconCheck` はこれを裁けない——`LEXICON` は `ranks` と `college` しか知らず、
`domain` は登録語彙ではないからである(実測: `lexicon-check` は 207文書に対して exit 0)。

**MINOR 相当の指摘だが、命名の節に置く**: 新語 `domain/分野` は
既存の `run.domains`(管区)と綴りが完全に一致する。
`clergy.js` の `COLLEGE[].domain` を「管区」と読み替える改名は本PRの範囲外だが、
**`domains.json` 側を `fields` / `専門` などにする選択肢が design.md で検討された形跡が無い。**

### 6.2 `ordain`(鍛造)と `forge`(鍛造)が同じ日本語訳を持つ

- `graph/forge.js` = 願いを DAG に鍛造する engine
- `graph/ordain.js forge` = 役者を鍛造するサブコマンド

**`ordain.js` のサブコマンド名が `forge` である。** つまり
`node graph/forge.js plan` と `node graph/ordain.js forge` が並び立つ。
`ordain.js:14` の doc comment 自身が `node graph/ordain.js forge --name …` と書き、
`forge.js:415` の `forgeCallLine()` が `node graph/ordain.js forge …` の文字列を生成する。

散文側は使い分けている(design/requirements は「道の鍛造」と「役者の鍛造」を書き分ける)が、
**code の綴りは同一である。** `ordain` という良い語を engine 名に選びながら、
サブコマンドで `forge` に戻しているのが惜しい。
`ordain.js ordain` か `ordain.js create` なら曖昧さが消える。NIT 級だが、
第41条が名の揺れを「歩けぬ階層の言語版」と呼ぶ以上、記録に残す。

### 6.3 `graph/identity.js` との衝突は無い

`identity.js` は視覚アイデンティティの選定(第17条)であり、
`tier` / `domain` / `ordain` のいずれとも語彙を共有しない。
`identity/catalog.json` に `tier` の語が3件在るが、すべて外部デザインシステムの
説明文中の英単語("3-tier pricing" 等)であり、機構の語ではない。**衝突なし。**

### 6.4 散文と code の語の食い違い

**M-4 で挙げた `state: '序列3'` が唯一の実質的な食い違い**である。
それ以外は散文と code が一致している。`README.md` / `CONSTITUTION.INDEX.md` の
更新も実測値と合っている(条 51→52、`290/290`→`318/318`、実測 318 passed)。

---

## 7. 既存 engine との一貫性

新 engine 2本を既存34本の流儀と突合した。**概ね揃っている。** 浮いている箇所のみ名指しする。

| 観点 | 既存の流儀 | `domains.js` | `ordain.js` | 判定 |
|---|---|---|---|---|
| shebang + `'use strict'` | 全 engine | ✓ | ✓ | 揃 |
| `require.main === module` ガード | 全 engine | ✓ (`:172`) | ✓ (`:385`) | 揃 |
| `module.exports` | 全 engine | ✓ | ✓ | 揃 |
| doc comment に条番号 | 全 engine | ✓ 第52条/第49条 | ✓ 第52条/第29条/第35条 | 揃 |
| 未知コマンドの exit | 実測: census 2 / critic 2 / wiring 2 / contract 2 | **2** | **2** | 揃 |
| 門の合否 exit | 0/1 | ✓ | ✓ | 揃 |
| 装飾罫 `═══` + 絵文字 | 全 engine | `═══ 🎭 DOMAINS —` | `═══ ⚒ ORDAIN —` | 揃 |
| 🔴 で不合格行 | 全 engine | ✓ | ✓ | 揃 |
| **`--json` の受理** | census/gauge/atlas は `--json` | `check`/`classify`/`list` すべて対応 | **無し** | **浮き** |
| **エラーの投げ方** | engine は throw、CLI が exit | `check()` は throw しない | `writeCollege` が **throw**(`:230, :245`) | 下記 |

### 7.1 浮いている箇所

**(A) `ordain.js` に `--json` が無い** — MINOR。
`domains.js` は3サブコマンド全てで `--json` を受ける。同じPRで生まれた
`ordain.js` は `forge` / `verify` のどちらにも `--json` が無く、
`verify` の結果(7門の合否)を機械が読む口が無い。
`ordain.verify()` は `{ok, rows}` を返すので、CLI に一行足すだけで揃う。
`atlas` `census` `gauge` `conclave status` が皆 `--json` を持つ中で、これだけ持たない。

**(B) `spawn-trace.js` の CLI 引数解析だけが手作り** — MINOR。
`conclave.js:440` / `ordain.js:312` / `forge.js` は `parse(argv)` 相当のヘルパを持つが、
`spawn-trace.js:531-534` は `process.argv.indexOf(name)` を直に引く `flag()` である:

```js
const flag = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : null;
};
```

本PRは `spawn-trace.js` に **3つの新サブコマンド**(`tiers` / `tier` / `audit`)を足して
CLI を大きくしたが、解析器は据え置いた。`--json` の判定も
`argv.includes('--json')`(`:487`)と `process.argv.includes('--json')`(`domains.js:119`)で
書き方が割れている。**新 engine 2本は揃っているが、拡張した既存 engine が揃っていない。**

**(C) `ordain.writeCollege()` が JS ソースを正規表現で書き換える** — 既に自認済み。

`ordain.js:220-223` が自ら書いている:

> ⚠️ **正直な注記**: JS のリテラルを engine が書き換えるのは脆い。より堅いのは
> `COLLEGE` を JSON へ外出しすることだが、…本PRの範囲を超える。

**この自認は正しく、審査として付け加えることは少ない。** 評価すべき点として:
書き換え後に `require.cache` を落として再読込し、末席に入ったことまで確認し、
失敗したら**元のバイト列を書き戻す**(`:244`)。ロールバック付きである。
既存 engine で最も近い流儀は `apply-*.js` 群だが、あれらは Markdown frontmatter を扱う。
**JS ソースを書き換える engine は楽園でこれが初めてである。** 流儀が無いところに建てたので
「浮いている」とは言えないが、**先例になる**ことは記録しておく。

**(D) `domains.js check()` が `require` を関数内で行う** — NIT。

```js
function check() {
  const L = load();
  const forge = require('./forge.js');           // ← 関数内 require
  const { PSEUDO } = require('./check-agents.js');
```

`ordain.js:39-40` は先頭で `require` している。`domains.js` だけ関数内。
循環依存の回避としては合理的(`forge.js` が `domains.js` を `admit()` 内で require しており
**相互参照**になっている)が、その理由がコメントされていない。
`forge.js:402` 側も関数内 require であり、**両側とも遅延 require で循環を避けている**が、
どちらのコメントにも「循環だから」と書かれていない。読む者が理由を再発見させられる。

---

## 8. 重複の審査

課題文の指摘対象(gauge / census / critic / wiring / check-agents)を順に検めた。

| 既存の門 | 二度測っているか | 根拠 |
|---|---|---|
| `gauge` | **否** | `gauge.js:112-113` が `trace.hasEpoch(run)` を呼び、集計は `tierTrace` を読むだけ。`gauge` 独自の tier 判定は無い。コメントも「集計は自前で書かず spawn-trace の四値をそのまま読む」と明示。**既存9鍵の値が動いていないことを legacy run で実測**(score 80、firstPassRate 1、reworkCount 0 — 本PR前後で不変) |
| `census` | **否** | `grep -n "tier\|序列" graph/census.js` → **0件**。無関係 |
| `critic` | **否** | 同 grep → 0件。無関係 |
| `wiring` | **否** | engine 間の辺のみ。`wiring check` exit 0 / `engine 36 / 内の辺 51` |
| `check-agents` | **判定は否 / 名簿構築は重複** | → m-5。判定(実在 vs 適合)の分離は design.md:960 の通り正しく、`PSEUDO` も再利用されている。重複しているのは名簿の作り方だけ |

**判定の重複は無い。** design.md §12 の重複審査表は、判定レベルでは正確である。
唯一の指摘は m-5(名簿構築ロジック)であり、これは判定ではなく実装の共有漏れである。

CI 側も確認した。`tribunal.yml` に足された2ステップ:

```yaml
236:        run: node graph/spawn-trace.js audit
240:        run: node graph/domains.js check
```

既存ステップと重複していない(168行の `spawn-trace.report()` は
**パスを渡したときの `{ok:true,total:0}` を撃つ故障注入**であり、`audit` とは別の問い)。

---

## 9. 死んだコード・未使用の口(engine 内 grep)

`node graph/wiring.js check` は engine 間の辺しか見ない(実測 exit 0)ので、
**engine 内**を grep で洗った。全 export と新規追加シンボルの呼び手を数えた結果:

| シンボル | 場所 | 呼び手 | 判定 |
|---|---|---|---|
| `domains.domainsOf` | `domains.js:73` | **0**(export のみ) | 死んだ口 (n-1) |
| `atlas.FIRST_SCREEN_KINDS` | `atlas.js:1217` | **0**(export のみ) | 死んだ口 (n-1) |
| `spawn-trace.dispatchTime` | `spawn-trace.js:158` | 内部1 / 外部0 | 過剰 export (n-1) |
| `TIERS.t2.artifacts` | `spawn-trace.js:68` | **判定 0 / 表示 1** | 死んだ閾値 (m-1) |
| `TIERS.t2.domains` | `spawn-trace.js:68` | **判定 0 / 表示 1** | 死んだ閾値 (m-1) |
| `conclave` の `tier_hint` | `conclave.js:214` | **0** | 消費者なし (n-2) |
| `RANKS.pontiff.duties` | `clergy.js:82` | 試験1のみ | 文書のみ (n-3) |
| `ordain verify --only` | `ordain.js:367` | 試験1のみ | 試験専用 (n-4) |
| `conclave done` の第1分岐 | `conclave.js:464` | 到達するが無意味 | 死んだ分岐 (m-2) |
| `measure().measurable` | `spawn-trace.js:260` | **judge が読まない** | **死んだ安全弁 (B-1)** |
| `measure().fileList` | `spawn-trace.js:261` | **0** | 死んだ口 |
| `ordain.existingNames` | `ordain.js:43` | 内部1 / 外部0(試験除く) | 妥当 |
| `ordain.renderAgent` | `ordain.js:112` | 内部1 / 試験 | 妥当 |
| `ordain.GATES` | `ordain.js:280` | 内部1 / 試験 | 妥当 |
| `spawn-trace.findPhase` | `spawn-trace.js:145` | 内部3 | 妥当 |
| `spawn-trace.findRuns` | `spawn-trace.js:451` | CLI 1 / 試験 | 妥当 |
| `forge.forgeCallLine` | `forge.js:415` | 内部2 / wiring の NAME_RES | 妥当・巧い |
| `domains.serves` | `domains.js:66` | `forge.admit` | 妥当 |

`measure().fileList` を追記する。`[...files].slice(0, 20)` を返すが**どの呼び手も読まない**。
赤が出たときに「どのファイルが超えたか」を示すために作ったと読めるが、
`judge()` の `lines[]` には `over.join(' / ')`(数値のみ)しか載らず、
**ファイル名は一度も人に見えない。** 第34条「次に何をすべきかを言わない門は罠である」に照らせば、
`fileList` を出さない赤は「churn=756 > 50」としか言わず、**どこを見ればよいか教えない。**
死んだコードであると同時に、**それを繋げば門が親切になる**箇所である。

---

## 10. エラー処理の穴(課題文の重点項目)

### 10.1 `measure()` が git を呼ぶ箇所 → **B-1**(上述)

まとめ直す。`measure()` は git を **3回** 呼ぶ:

| 呼び出し | 行 | 失敗時 |
|---|---|---|
| `git log --no-merges --since --until --numstat` | `:203` | `raw === null` → `commitsMeasurable` は false のまま、**files/churn に何も足さず続行** |
| `git diff --numstat HEAD` | `:222` | `diff === null` → **黙ってスキップ** |
| `git status --porcelain --untracked-files=all` | `:238` | `untracked === null` → **黙ってスキップ** |

**3経路すべてが「失敗 = 変更ゼロ」に潰れる。** そして `judge()` はその 0 を実測値として緑を出す。
`measurable` はこれを検出できない(`!!t0` で真になるため)。

さらに `--since=${t0}` / `--until=${t1}` は **ISO 文字列をシェル無しで渡している**ので
インジェクションは無い(`execFileSync` で配列渡し、シェル経由でない)。**そこは正しい。**
問題は失敗時の扱いだけである。

### 10.2 NaN / undefined が閾値比較に混入する経路

**結論: NaN は閾値に届かない。** `judge()` の順序が正しく守っている:

```js
graph/spawn-trace.js:299   if (tier == null || Number.isNaN(tier)) { → no-tier(赤) }
graph/spawn-trace.js:305   if (![1,2,3].includes(tier)) { → no-tier(赤) }
```

`Number.isNaN` と `includes([1,2,3])` の二段で、閾値比較に到達する `tier` は 1/2/3 に限られる。
**実測**:

```
"3abc" => RED no-tier      ← NaN 経路は赤
null   => RED no-tier
""     => RED no-tier
undefined => RED no-tier
```

`m.files` / `m.churn` / `m.bytes` 側も、`Number(m[0]) || 0` の `|| 0` で
NaN が加算に混入しない(`:214-215, :232-233`)。`bytes` は `st.size`(常に数値)か 0。
**課題文が懸念した NaN 混入経路は存在しない。**

穴は NaN ではなく:
- **NaN にならない緩い変換**(`true` → 1、`" 3 "` → 3) → m-3
- **0 が「測れなかった」と「本当に変更ゼロ」を区別できない** → B-1

後者が本質である。`measure()` は `null`(測れなかった)と `0`(測って0だった)を
**同じ 0 で表現している。** 三値論理を二値に潰したことが B-1 の根本原因である。

### 10.3 その他のエラー処理

**良い形**として記録する:

- `conclave.js:461-469` — throw が `save` の前に立ち、拒否時に台帳が進まない。**実測で確認済み**。
- `ordain.js:243-246` — `clergy.js` の書き換えが壊れたら**元のバイト列を書き戻す**。
- `ordain.js:302-305` — 子プロセスの失敗時、stdout+stderr から 🔴 行だけを2行抽出して見せる。
  出力全部を垂れ流さない配慮。
- `contract.js:137-138` — `--run` のパスが読めなければ `exit 2`(門の失敗ではなく使い方の失敗)。
  exit 1 と 2 を混ぜていない。
- `spawn-trace.js:463` — `audit` が読めない `conclave.json` を `⚠️` で報告して**続行**する。
  1つの壊れた台帳で監査全体を落とさない。

**弱い形**:

- `spawn-trace.js:463` の `continue` は読めなかった run を**赤にも黄にも数えない**。
  `走査 8 件` の分母には入るが、`red` にも `yellowRuns` にも入らない。
  読めない台帳が10個あっても `✓ 紀元以後の違反は無い` と出る。第16条の観点で MINOR。
- `domains.js:32` — `load()` が `JSON.parse(fs.readFileSync(...))` を素で呼ぶ。
  `domains.json` が壊れていれば**全ての呼び手が生の SyntaxError で落ちる**。
  `ordain.validate` / `forge.admit` / `domains check` の3経路が全部これを通る。
  他の engine(`identity.js:37` の `try/catch` など)は台帳の読み取りを守っている。

---

## 11. 第52条(f)「統治は仕事ではない」の実装 — 課題文の重点項目

**問い**: 免除の判定が緩すぎないか。何でも「統治」と名乗れば逃げられる作りになっていないか。

**答え**: **名乗りでは逃げられない。だが免除の理屈が実装と一致していない(M-1)、
そして門を通らない経路が縛られていない(M-2)。**

### 11.1 名乗りによる脱出口は無い — ここは堅い

`judge()` のシグネチャは `judge(run, phaseId, opts)` であり、
`opts` が受けるのは `tier` / `measured` / `artifact` / `cwd` / `t0` / `t1` のみ。
**`governance` / `exempt` / `統治` に相当する入力口は存在しない。**
grep で確認した(`graph/*.js` の `統治|governance|exempt|免除` 検索)結果、
`spawn-trace.js` で「統治」が現れるのは `MEASURE_EXCLUDE` の**コメント1行だけ**である:

```js
graph/spawn-trace.js:72:  /** 序列3の実測から除くもの。統治を仕事と数えれば、宣言する行為自体が違反になる。 */
```

**免除は3本の正規表現に固定されており、実行時に増やせない。**
`MEASURE_EXCLUDE` は `const` の配列リテラルで、外部から push する口も無い。
design.md:251 が「白名簿は必ず漏れる(第21条)」と述べて白名簿設計を避けた判断は正しく、
**その判断は実装に反映されている。** ここは評価する。

### 11.2 だが免除の根拠(「登録された成果物だけを見る」)が事実でない

M-1 で実測した通り。requirements §2.5 は
「序列の門は『登録された成果物』だけを見る。ゆえに統治は何も鳴らさない」と書くが、
`files` と `churn` はリポジトリ全体を測る。artifact を渡さない計測で
`{"files":3,"churn":756,"bytes":0}` が返ることを実走で確認した。

**したがって AC-G1(統治は偽陽性を出さない)が成立している理由は、
requirements が説明した理由ではない。** 実際の理由は M-2 ——
統治行為に対して `conclave done` を打たないので、そもそも `judge()` が呼ばれないからである。

**これは「緩い」のではなく「根拠が違う」問題である。**
現状は偶然 AC-G1 を満たしているが、**その偶然は
「教主が統治行為を `done` として刻まない」という運用習慣に依存している。**
機構ではなく習慣に依存する免除は、第50条(機械が強制していないものは強制されていない)に照らして弱い。

### 11.3 具体的な帰結: 鍛造そのものが序列3を超える

requirements §2.5 の G-9 は「役者を鍛造する」を統治に分類する。
だが `ordain forge --write` が書くファイルを数えると:

```
$ node -e "ordain.plan({name:'music-smith',domain:'music',cardinal:'construction'})"
  writes: overlay\agents\music-smith.md
  writes: overlay/overlay.json
  writes: graph/clergy.js
  writes: graph/domains.json
=> file 数: 4  / TIERS.t3.files = 2
```

**4ファイル > 閾値2。** `MEASURE_EXCLUDE` に `overlay/` も `graph/domains.json` も入っていない。
requirements §552 は自ら
「**鍛造器を走らせる行為は統治(G-9)であり序列の判定対象にならない**」と書くが、
**もしその相が `done` として刻まれれば、序列3では通らない。**
G-9 が守られているのは、やはり「`done` を刻まないから」であって免除機構によってではない。

### 11.4 判定

**第52条(f) は空文ではない。** 名乗りによる脱出口が無いこと、
免除が3本の固定正規表現に限られること、白名簿を意図的に避けた設計判断は、
条文を実効あるものにしている。

**だが (f) の実装は、requirements が説明した機構ではない別の機構(門の設置点が1つしかないこと)に
支えられている。** そしてその機構は第52条(e) の穴と表裏一体である(M-2)。
**(f) を守る仕組みが、(e) を破る抜け道と同じものである** ——
これが本PRの構造上の最大の緊張であり、prove.md にも design.md にも書かれていない。

---

## 12. 良い箇所(審査として記録する)

褒めるだけの審査は審査ではないが、**次のPRが壊さないために**明記する。

1. **判定表の単一出所** — `TIERS` を `Object.freeze` で二重に凍らせ、
   `conclave` も `gauge` も `tier` も `audit` も同じ `judge()` を呼ぶ。
   `gauge.js:41-45` が「gauge が自分で `tierTrace` を数え直せば、五値の定義が二箇所に住む」と
   理由を書いている。**第41条の実装として模範的。**

2. **`chooseScale` を一行も変えなかった判断** — `forge.js:390-393` が
   「`tests/paradise.test.js` は `chooseScale(...)` を **11箇所**で直に呼び、返り値が
   **文字列**であることを assert している。返り値を object に変えればその11本が一斉に嘘になる ——
   **直す口実に既存の門を壊してはならない**」と書き、`admit()` を横に足した。
   実測で `chooseScale('CSSのタイポを直せ') = quick`(文字列)を確認。

3. **`epoch` を `meta` の外に置いた理由** — `conclave.js:86-96` が
   「`meta` は forge が作る DAG から丸ごと転記されるので、そこに置けば
   **古い DAG を読み直して convene し直した run が印を持たない**という抜け穴が開く」と述べる。
   **抜け穴を先回りして塞ぎ、その理由を残した。**

4. **`writeCollege` が末席に挿す理由** — `ordain.js:206-218` が prove 相の実測を引用する:
   ```
   🔴 misrouted: build    (quick) 宣言 architect → 発令 <新役者>
   ```
   **「鍛造器が門を壊していた。経路だけを撃つ試験では見えない」** ——
   故障注入で発見し、原因(`PHASE_LEAD` に無い相が `priests[0]` に落ちる)まで特定し、
   コメントに残した。これは prove 相の仕事の質が高い証拠である。

5. **`atlas` の `kind` 分類** — `inconclusive` を導入し、
   「測れなかったことは『溢れた』ことではない」を分けた。
   旧実装が `reason` に `"fail"` を落として**誤った直し方まで教えていた**ことを
   `atlas.js:1204-1210` が実測付きで記録している。**B-1 はこの正しさの裏返しである。**

6. **`forgeCallLine` が第34条と第48条を同時に満たす** — `forge.js:412-415`:
   「**この行がそのまま結線でもある** — `wiring.js` の NAME_RES が
   `graph/ordain.js` の綴りを拾うので、第34条を満たす一行が第48条をも満たす」。
   `wiring check` が exit 0 であることを実測で確認した。

7. **自己診断 318/318 緑** — `node tests/paradise.test.js` exit 0。
   第52条の試験が20本、`grep -c "第52条" ` で確認。
   `README.md` の `290/290` → `318/318` も実測と一致。

---

## 13. verify 相 / 後続PRへの申し送り

| # | 重大度 | 要旨 | 場所 |
|---|---|---|---|
| B-1 | **BLOCK** | git 失敗を「変更ゼロ」と読み序列3が fail-open。`measurable` は死んだ安全弁 | `spawn-trace.js:167-171, 186-262` |
| M-1 | MAJOR | 第52条(f) の免除根拠「登録された成果物だけを見る」が files/churn について事実でない | `requirements.md:166` / `spawn-trace.js:186-262` |
| M-2 | MAJOR | 門は `markDone` 一箇所。環に載らない仕事を捕捉する機構が無い(第52条 e の穴)。範囲外として明記されていない | `conclave.js:344` |
| M-3 | MAJOR | `--scale` 明示時に `admit()` が誤った名簿を裁く | `forge.js:401, 475-486` |
| M-4 | MAJOR | 機械の状態値に `'序列3'`(日本語)が混在。台帳スキーマに焼き付き | `spawn-trace.js:361` 他5箇所 |
| m-1 | MINOR | `TIERS.t2.artifacts` / `.domains` は告知されるが裁かない | `spawn-trace.js:68, 492` |
| m-2 | MINOR | `conclave done` に完全同一の二分岐 | `conclave.js:464-465` |
| m-3 | MINOR | 裸の `--tier` が `declared:1` になる(§13.1 の argv 契約と乖離) | `conclave.js:440` |
| m-4 | MINOR | `dirBytes` が再帰せずサブディレクトリを 0 と数える | `spawn-trace.js:265` |
| m-5 | MINOR | `domains.check` が `check-agents` の名簿構築を再実装(`examples` の扱いが食い違う) | `domains.js:90-99` |
| — | MINOR | `audit` が読めない台帳を赤にも黄にも数えない | `spawn-trace.js:463` |
| — | MINOR | `domains.load()` が JSON 破損で生の SyntaxError | `domains.js:32` |
| — | MINOR | `ordain.js` に `--json` が無い(`domains.js` には在る) | `ordain.js` CLI |
| — | MINOR | `spawn-trace.js` の CLI 解析だけ手作り、`--json` 判定の書き方も割れる | `spawn-trace.js:531` |
| n-1 | NIT | `domainsOf` / `FIRST_SCREEN_KINDS` / `fileList` に呼び手が居ない | 各所 |
| n-2 | NIT | `tier_hint` に消費者が無く、`gate` 以外は常に同値 | `conclave.js:214` |
| n-3 | NIT | `RANKS.pontiff.duties` は試験の存在確認のみ | `clergy.js:82` |
| n-4 | NIT | `ordain verify --only` は試験専用だが help に載る | `ordain.js:367` |
| — | NIT | `ordain.js` のサブコマンド名 `forge` が `forge.js` と衝突 | `ordain.js:325` |
| — | NIT | `domains.js` / `forge.js` の相互遅延 require に理由コメントが無い | `domains.js:87` / `forge.js:402` |

**最小限の受入条件(私見)**: B-1 を塞ぐこと。
`gitOut` の失敗を `judge()` まで伝播させ、`atlas` の `inconclusive` と同じ第4状態を持たせる。
それができるまで、第52条(c)「機構が実測して裁く」は**実測が成功した場合に限り**成り立つ条文である。

---

## 14. 審査の限界(見なかったものを見たと言わない — 第16条)

- **`node tests/paradise.test.js` は完走させた**(318 passed / 0 failed / exit 0)が、
  **CI(`tribunal.yml`)の実走は行っていない。** GitHub Actions 上での
  `spawn-trace.js audit` / `domains.js check` の挙動はローカル実行からの推定を含まない
  ——ローカルでは両方 exit 0 を実測した、とだけ述べる。
- **`ordain forge --write` を実際には走らせていない**(`overlay/` と `graph/clergy.js` を
  書き換えるため。審査は直さない)。`plan()` の dry-run 出力のみで判断した。
  `writeCollege` のロールバックが本当に働くかは**未検証**である。
  prove.md がこれを実鍛造で撃ったと記録しているが、私はその走行を再現していない。
- **`atlas check` の実ブラウザ経路を単独では走らせていない。** 自己診断の中で緑になったことのみ確認。
  `firstScreen` の `inconclusive` 分岐は試験(`atlas: 描画器の実行時故障を「溢れた」と呼ばない — 実経路で撃つ`)が
  緑であることをもって足りるとした。
- **`prove.md` / `build-report.md` / `findings.md` は読んだが、その中の主張を再実行して
  裏を取ってはいない**(`ordain.js` のコメントに引用された prove 相の実測を除く)。
- **B-1 の再現は `execFileSync` の差し替えと非 git ディレクトリの2経路で行った。**
  実機で git を削除する検証は行っていない。
- `--scale` 経路(M-3)は `admit()` を直接呼んで名簿の差を示したが、
  **`forge plan --scale full` を実際に走らせて DAG を生成させてはいない。**

---

*審査: @code-reviewer / reform の道 第6相 / 第11条(指揮系統の外の目)*
