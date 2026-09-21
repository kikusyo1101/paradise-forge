# 畳みの機構を壊して鳴らす — prove 相

**相**: prove / **枝**: `reform/gate-fold` / **基点**: build 相の `622225f` / `0383b48`
**測定機**: Windows 11 + git-bash, node v24.14.0(ローカル)
**この相の分**: **健全な系で緑になるだけの門は証明されていない**(第21条)。
欠陥を意図的に注入し、**門がそれを名指しで捕らえるかを実測する。**

> **この文書の掟**: 生コマンド出力の無い断定を書かない。
> **撃てなかったものは「撃てなかった」と書く**(第37条)。
> 変異の台本はすべて `reform/gate-fold/prove/` に在り、**再走できる**。

---

## 0. 結論(先に述べる)

| | 数 |
|---|---|
| 撃った変異(異なる ID) | **33 件** |
| 初撃の無音 | **11 件 (33%)** |
| **予想された壊し方の無音率** | **0/11 = 0%** |
| **自分で発明した壊し方の無音率** | **11/22 = 50%** |
| 硬化後に鳴るようになった無音 | **11 件中 11 件** |
| 建てた門 | **6 本**(499 → **500**、`fold.test.js` は 20 → **26**) |
| 最終の全走 | **`Paradise self-test: 500 passed, 0 failed`**(exit 0) |

**過去の走行が言った数(予想 13% / 発明 50%)は、本相でも再現した** ——
発明した壊し方の無音率は **50%** で一致し、予想された壊し方は **0%** まで下がった。
**予想の側が下がったのは、build 相が撃って鳴ることを既に確かめていたからである**
(第27条に従い、それを信じずに全部撃ち直した。11/11 が鳴った)。

### 0.1 本相で見つけた最重の欠陥 — **鍵の漏れによる実在の偽の緑**

**`overlay/root/CLAUDE.md` を潰しても、鍵は 1 ビットも動かなかった。**
その状態で畳んだ走行と畳んだ census は、**どちらも exit 0 の緑を出した** ——
素の全走なら 2 門が赤い状態である。

```
$ node -e "... overlay/root/CLAUDE.md を '壊れた\n' で潰す ..."
鍵: 壊す前=a794321db680464e 壊した後=a794321db680464e  同じ？ true
--- 畳んだ全走 ---
Paradise fold: Executed 0 out of 1 runs (1 reused, key=a794321db680464e)
Paradise fold: 写し元の領収書 at=2026-09-21T00:00:00.000Z exit=0 key=a794321db680464e
exit=0
--- 畳んだ census ---
Census self-test: Executed 0 out of 1 runs (1 reused, key=a794321db680464e)
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
exit=0
復元 sha 一致: true
```

同じ破壊を**畳まずに**撃つと、門は 2 本鳴る:

```
$ node tests/paradise.test.js --gate-not '^atlas'   (overlay/root/CLAUDE.md を潰した状態)
exit=1
  ✗ deploy: the deployed tree matches its declared sources
  ✗ diet: ファイル種の掟 3本は paths: スコープを持ち、写経の病巣は再発しない (第40条)
480 of 499 gates matched — 478 green, 2 red
```

**これは findings §4.2 Jest #8702(鍵に manifest が入っておらず CI が失敗を取り逃した)と同型である。**
畳みの機構は、**赤い楽園を緑と報告する器になっていた。**

---

## 1. 変異の一覧表

**層**: L1 = build 相の予想した壊し方の再現 / L2 = 偽の緑を狙う発明 /
L3 = 門自身の盲点(第62条)/ L4 = 結線(第44条)

台本: すべて `reform/gate-fold/prove/mutations.js` に在り、
`node reform/gate-fold/prove/mutate.js <ID>` で**一件ずつ再走できる**。
生出力は `reform/gate-fold/prove/raw/<ID>.<門束>.txt`。

### 1.1 第1層 — 予想された壊し方(11 件 / 無音 0)

| # | 何を壊したか | 期待 | **実測(初撃)** | 鳴った門 |
|---|---|---|---|---|
| **P-01** | 領収書の追記を消す(`append()` を空に) | AC-01 | **鳴った** | `fold: 全走は領収書を刻む` 他 5 本 |
| **P-02** | 鍵の材料から内容ハッシュを抜き名前だけに | AC-03 | **鳴った** | `fold: 鍵は中身から採る` |
| **P-03** | 鍵の材料から住処を抜く | AC-05 | **鳴った** | `fold: 住処の宣言は鍵に効く` |
| **P-04** | 採用条件から `exit === 0` を外す(Tuist #8570 と同型) | AC-07 | **鳴った** | `fold: 緑しか畳まない` |
| **P-05** | `=global` を畳める経路を通す | AC-10(最重量) | **鳴った** | `fold: 宣言外の状態に依る走行は畳まれない` |
| **P-06** | 鍵の比較を常に真へ潰す | AC-21 | **鳴った** | `fold: 何もかも畳む機構は測定ではない` 他 |
| **P-07** | `bails` を人間向け文字列だけにする | AC-17 | **鳴った** | `fold: bail は機械可読である` |
| **P-08** | `--explain` から環境変数の欄を消す | AC-06 | **鳴った** | `fold: 鍵の材料は数え直せる` |
| **P-09** | 追記を read-modify-write に(TOCTOU) | AC-25 | **鳴った** | `fold: 台帳は並行追記で壊れない` |
| **P-10** | 読めない台帳を不在と同じ扱いに | AC-16 | **鳴った** | `fold: bail は閉じた語彙で名乗る` |
| **W-01** | CI の `📒 Fold` 段を黙って消す | 第44条 b | **鳴った** | `wiring.js check` が `🔴 孤児の門 1:` / `fold: 全走が一本も走らない CI は測定ではない` |

**無音率 0/11 = 0%。** build.md の自己申告は**再現した**(第27条: 信じずに撃ち直した)。

### 1.2 第2層 — 自分で発明した、偽の緑を狙う変異(18 件 / 無音 8)

| # | 何を壊したか | **実測(初撃)** | 硬化後 |
|---|---|---|---|
| **M-01** | 鍵の材料から 1 本だけ抜く | 鳴った | 鳴る |
| **M-02** | **鍵の覆いを `overlay/vendor/archify` だけへ狭める**(= 本相前の実装) | **本相で発見した穴そのもの**(§2.1) | **鳴る**(新門) |
| **M-02b** | 根の文書の名簿を空にする | — (硬化後に作った) | **鳴る**(新門) |
| **M-03** | 鍵を 16 桁 → 8 桁に削る | 鳴った | 鳴る |
| **M-04** | **長さを変えずに中身を変える** — 内容ハッシュの代わりにバイト数を混ぜる | 鳴った | 鳴る |
| **M-05** | `find()` の緑の条件を `==`(緩い等号)に | **無音** | **鳴る**(新門) |
| **M-06** | `say()` の `reused` を定数 1 に | 鳴った | 鳴る |
| **M-07** | `inspected().closed()` を常に真に | **無音** | **残債**(§4) |
| **M-07b** | `tally()` 内の恒等式の錠を殺す | — | **鳴る**(新門) |
| **M-08** | 成果物の鍵を **HTML の先頭 1KB だけ**から採る | **無音** | **鳴る**(新門) |
| **M-09** | `BAIL_CODES` に語彙外の語を足す | 鳴った | 鳴る |
| **M-10** | atlas の `--no-fold` を黙殺(旗は受けるが何もしない) | **無音** | **鳴る**(硬化) |
| **M-11** | census の畳みを `--no-fold` でも切らない | **無音** | **鳴る**(硬化) |
| **M-12** | 壊れた JSON 行を黙って読み飛ばす | 鳴った | 鳴る |
| **M-13** | `validateReceipt` を素通しにする | **無音** | **鳴る**(新門) |
| **M-14** | **出力行を `process.exit` の後ろへ移す**(死にコード化) | **無音** | **鳴る**(新門) |
| **M-15** | 恒等式の錠を `!==` → `>` へ弱める(境界文字) | 鳴った | 鳴る |
| **M-16** | 領収書の刻みを `!GATE.active` の枝の外へ | **無音** | **鳴る**(§1.5) |

### 1.3 第3層 — 門自身の盲点(3 件 / 無音 2)

| # | 何を壊したか | **実測(初撃)** | 硬化後 |
|---|---|---|---|
| **B-01** | **撃ちのループを空にする**(AC-11 の道の一覧を `[]` へ) | 鳴った | 鳴る |
| **B-02** | **注入が当たったことの検めを消す**(`withMutant` の `assert.notStrictEqual`) | **無音** | **鳴る**(新門) |
| **B-03** | **負の fixture を消す**(AC-16 の「健全な decide が倒れない」) | **無音** | **鳴る**(新門) |

### 1.4 第4層 — 結線(4 件 / 無音 2)

| # | 何を壊したか | **実測(初撃)** | 硬化後 |
|---|---|---|---|
| **W-01** | `📒 Fold` 段を消す | 鳴った(`wiring` が孤児を名指す) | 鳴る |
| **W-02** | Self-test 段の `PARADISE_FOLD_LEDGER` の行を丸ごと消す | **無音**(最初の綴りが甘く、一致がずれた) | **鳴る**(§1.5) |
| **W-03** | `📒 Fold` 段の `PARADISE_NO_FOLD: '1'` を抜く | 鳴った | 鳴る |
| **W-04** | **`PARADISE_FOLD_LEDGER` を `..._DISABLED` へ改名**(綴りは残るが変数は死ぬ) | **無音** | **鳴る**(硬化) |

### 1.5 **無音と数えなかったもの**(第37条: 測らなかったものを緑と呼ばない)

| # | 何が起きたか | どうしたか |
|---|---|---|
| **M-11(初回)** | **注入が当たらなかった** —— `graph/census.js` は **CRLF** であり、LF の綴りを含む置換は一つも当たらなかった | 走者が**例外で倒れる**形にしてあったので気づけた。CRLF へ直して撃ち直し、**無音**を確認 |
| **M-14 / M-16 / W-02(初回)** | 撃った変異が**意味的に無害**だった(`process.exit` の後に註釈を足す等) | **これは「門の無音」ではなく「変異の発明が甘い」である。** 撃ち直して M-14/M-16 は無音、W-02 は鳴った |
| **B-02(初回)** | 注入が当たらなかった | 綴りを直して撃ち直し、**無音**を確認 |

> **走者は「注入が当たらなかった」を無音と別の値として数える。**
> 当たらない注入で「鳴らない」と結論するのは第37条違反である
> (`mutate.js` の `fire()` が Buffer の同一性で検め、例外にする)。

---

## 2. 無音だった変異 — なぜ門が見なかったか / どう強くしたか

### 2.1 **M-02 — 鍵が門の読む現物を覆っていなかった(最重・実在の偽の緑)**

**なぜ門が見なかったか。**
AC-03 の門は「**註釈一行を書き換えると鍵が動く**」を撃っていた。それは
`tests/paradise.test.js` に対しては真である —— だが門は**鍵の材料に入っているものだけを撃っていた。**
**入っていないものを撃つ門が一本も無かった。** 第62条そのものである:
*門の形が、門の盲点を決める。*

**どう測ったか(全数)。** `reform/gate-fold/prove/material-holes.js` —
版管理下の現物を 1 本ずつ潰し、①鍵が動くか ②動かないなら門が赤くなるかを測った。
**生バイトを握り `finally` で書き戻し、sha256 の一致を assert する。**

```
鍵不動  **門赤**  overlay/root/CLAUDE.md
      鳴った門: deploy: the deployed tree matches its declared sources | diet: ファイル種の掟 3本は…
鍵不動  **門赤**  overlay/overlay.json
      鳴った門: upstream 系 5 / deploy 系 4 / independence 系 4 / seat / diet 2 / 鍛造器 … 計 17 門
鍵不動  **門赤**  README.md
      鳴った門: census: README が語るテスト数は測る機械で変わらない | census: a stale number…
鍵不動  **門赤**  CLAUDE.md
      鳴った門: CLAUDE.md exists and states the working language and the hard rules
鍵不動  **門赤**  CONSTITUTION.md
      鳴った門: census: the paradise measures itself from the artifacts, not from prose (Art.22)
鍵不動  **門赤**  overlay/vendor/hooks/hooks.json
      鳴った門: independence: the vendored hooks resolve to files that actually exist
鍵不動  **門赤**  dashboard/index.html
      鳴った門: AC-19e / dashboard-count 系 … 計 14 門
鍵不動  門緑    .gitignore / tools/wire-paradise-hooks.js / graph/motion-probe.mjs / overlay/vendor/commands/plan.md
```

**穴は 7 本。** 合わせて **38 門**が、鍵の動かない破壊で赤くなる。
そのすべてが**畳みで消える**。

**どう強くしたか。** `graph/fold.js` の `materials()` の覆いを拡げた:

- `overlay/vendor/archify` だけ → **`overlay/` / `dashboard/` / `tools/` の木ごと**
  (木で採るので**次に増えた 1 本も自動で鍵に入る** —— 名簿を写経しない / 第44条)
- 倉の根の文書を `ROOT_DOCS` として**凍結表**で名指し(`README.md` / `CLAUDE.md` / `CONSTITUTION.md` / `.gitignore`)
- `walkJs` が `.mjs` も採るように(`graph/motion-probe.mjs` は Atlas の**動きの裁定を下す実行体**であり、
  `.js` だけを採る綴りが鍵の外に落としていた)
- 生成物の除外(`derived.js`)は**そのまま通る** —— 拡げた分も `dashboard/state.json` 等は除かれる

**材料 137 本 → 277 本。**

**強くした後に鳴った証拠。**

```
$ node -e "... 7 本 + 3 本を 1 本ずつ壊して鍵が動くか ..."
鍵が動く  overlay/root/CLAUDE.md
鍵が動く  overlay/overlay.json
鍵が動く  README.md
鍵が動く  CLAUDE.md
鍵が動く  CONSTITUTION.md
鍵が動く  overlay/vendor/hooks/hooks.json
鍵が動く  dashboard/index.html
鍵が動く  .gitignore
鍵が動く  tools/wire-paradise-hooks.js
鍵が動く  overlay/vendor/commands/plan.md
復元後の鍵一致: true
```

**§0.1 の偽の緑そのものを撃ち直した:**

```
$ (overlay/root/CLAUDE.md を潰して、畳める台帳で全走と census を撃つ)
鍵: 壊す前=1f201f608fab9f4b / 壊した後=dc49e3fc2b8fdc3c → 同じか: false
--- 全走の頭 ---
Paradise fold: Executed 1 out of 1 runs (0 reused, bail=key-miss)
--- census ---
  🔴 自己診断の総括: **測れなかった** — 部分の値で埋めない (第37条 / 第58条(d))
復元 sha 一致: true
```

**畳まれなくなり、census は赤を出した。**

建てた門: **`fold: 鍵は門が読む現物を覆う (prove M-02)`**
—— 木の覆い・根の文書・`.mjs`・**複製の倉で実際に壊して鍵が動くこと**を撃つ。
壊して鳴る証拠:

```
$ node reform/gate-fold/prove/mutate.js M-02
--- M-02 [鳴った] graph/fold.js
    fold: exit=1 鳴った門: fold: 鍵は門が読む現物を覆う (prove M-02)
$ node reform/gate-fold/prove/mutate.js M-02b
--- M-02b [鳴った] graph/fold.js
    fold: exit=1 鳴った門: fold: 鍵は門が読む現物を覆う (prove M-02)
```

> ⚠️ **この門は「本数」で裁かない。** 数は改修のたびに動くので、数で縛れば偽の赤になる
> (第62条 b)。裁くのは**覆いの形**である。

### 2.2 **M-05 — 領収書の緑が緩い等号で読まれていた(Tuist #8570 の台帳側)**

**なぜ門が見なかったか。** AC-07 の門は `exit: 1` と `exit: null` の**二つの形**しか置いていなかった。
`exit: "0"`(文字列)/ `false` / `[]` / `''` は**誰も置かなかった**。
台帳は JSONL であり **外から 1 行足せる面**である —— 門の fixture が
「本物の走行が書く形」だけを想定していたので、**偽造された形の層が丸ごと見えなかった**。

```
$ node reform/gate-fold/prove/mutate.js M-05     (硬化前)
--- M-05 [**無音**] graph/fold.js
    fold: exit=0
    resident: exit=0
```

**どう強くしたか。** `find()` の `===` を**註釈で凍らせ**、門を建てた:
**`fold: 領収書の緑は型で裁く — 偽装された exit は畳めない (prove M-05)`**
—— 6 つの形(`"0"` / `false` / `[]` / `''` / `'0x0'` / `0.0`)を実際に台帳へ置き、
**`0.0` だけが畳めること**を撃つ(負の fixture だけでは「何も通さない実装」が緑になる)。

```
$ node reform/gate-fold/prove/mutate.js M-05     (硬化後)
--- M-05 [鳴った] graph/fold.js
    fold: exit=1 鳴った門: fold: 領収書の緑は型で裁く — 偽装された exit は畳めない (prove M-05)
```

### 2.3 **M-07 — 恒等式の錠が「外に立って」いたが、誰も呼んでいなかった**

**なぜ門が見なかったか。** AC-15 は「錠は畳みの関数の外に立つ」と要求し、
`inspected().closed()` がその形で在った。だが:

```
$ grep -rn "\.closed()" --include=*.js .    (reform/ を除く)
(0 件)
```

**誰も呼んでいなかった。** 形は要件どおり、効きは零 ——
**呼ばれない錠は外でも内でもない。**

**どう強くしたか。** 錠を **`tally()`(数が読まれる唯一の口)の上**へ移した。
`atlas.js:1506` / `1530` は `tally: seen.tally()` で数を配っており、
そこで倒れれば **Atlas の走行そのものが倒れる**(門ではなく走行が倒れる / AC-15)。
門 **`fold: P-2 の恒等式の錠は数を配る口の上に立つ (prove M-07)`** を建てた。

```
$ node reform/gate-fold/prove/mutate.js M-07b
--- M-07b [鳴った] graph/fold.js
    fold: exit=1 鳴った門: fold: P-2 の恒等式の錠は数を配る口の上に立つ (prove M-07)
```

> ⚠️ **M-07 そのもの(`closed()` を `return true` に潰す変異)は、今も無音である。**
> これは残債として §4 に名を与えた。**直したのは錠の住所であって、`closed()` ではない。**

### 2.4 **M-08 — 成果物の鍵の「由来」を誰も撃っていなかった**

**なぜ門が見なかったか。** AC-11 の門は `fold.inspected()` に**作り物の鍵**
(`same-hierarchy` / `vary-conclave-quick` …)を与えて 72 → 32 の数を数えていた。
**鍵がどこから来たかを一度も撃っていなかった。**
門の作法(写像に数を入れて数える)が、**鍵の由来の層を丸ごと隠していた** —— 第62条。

先頭 1KB は 6 主題すべてで同じ `<!DOCTYPE html>…<style>` である。
その変異の下では **72 検査すべてが 1 つの裁定に畳まれ**、71 件が誰にも検められない。

**どう強くしたか。** `artifactKey` に**バイト列の全長を鍵の材料として混ぜ**、
門 **`fold: 成果物の鍵は成果物の全長から採る (prove M-08)`** を建てた ——
**先頭 1KB が同一で後ろだけ違う二つの成果物**を実際に作り、別の鍵になることを撃つ。

```
$ node reform/gate-fold/prove/mutate.js M-08
--- M-08 [鳴った] graph/fold.js
    fold: exit=1 鳴った門: fold: 成果物の鍵は成果物の全長から採る (prove M-08)
```

### 2.5 **M-10 / M-11 — `--no-fold` が「綴り」でしか検められていなかった**

**なぜ門が見なかったか。** AC-18 の門はこう書いていた:

```js
for (const f of [PARADISE, census.js, atlas.js]) {
  assert.ok(/--no-fold/.test(fs.readFileSync(f, 'utf8')), '… 三者で同じ綴りでなければ出口ではない');
}
```

**綴りが在ることは、効くことではない。** 「旗を受け取るが何もしない」実装が素通りした
—— 第16条(証拠は名ではなく振る舞いで裁く)の、門の側での違反である。

**どう強くしたか。** AC-18 の門に**振る舞いの検め**を足した:
`atlas.js check --scale quick --static --no-fold` を**実際に撃ち**、
出力に `reused: html=` が一件も出ないことを読む。census / atlas の
旗の読み口が**判断の式として在ること**も正規表現で凍らせた。

```
$ node reform/gate-fold/prove/mutate.js M-10 M-11
--- M-10 [鳴った] graph/atlas.js
    fold: exit=1 鳴った門: fold: --no-fold は畳みを完全に切る (揟6)
--- M-11 [鳴った] graph/census.js
    fold: exit=1 鳴った門: fold: --no-fold は畳みを完全に切る (揟6)
```

### 2.6 **M-13 — 「拒むべきものを拒むか」を誰も撃っていなかった**

**なぜ門が見なかったか。** 門は `append()` の**成功**しか撃っていなかった。
`validateReceipt` が 6 つの形を拒むことを、**一つも撃っていなかった** ——
第62条 c の言う「無罪と宣言した形」の裏返しであり、**法に書かれた盲点**である。

**どう強くしたか。** 門 **`fold: 領収書の形は台帳へ入る前に裁かれる (prove M-13)`** を建てた。
**7 つの負の fixture**(`key` が 4 桁 / 16 進でない / `exit` が文字列 / 小数 / `summary` 無し /
`at` が空 / 物ですらない)が**拒まれること**、かつ**拒まれた行が台帳に残らないこと**、
そして**正しい形(`exit: 0` と `exit: null`)は通ること**を撃つ。

```
$ node reform/gate-fold/prove/mutate.js M-13
--- M-13 [鳴った] graph/fold.js
    fold: exit=1 鳴った門: fold: 領収書の形は台帳へ入る前に裁かれる (prove M-13)
```

### 2.7 **M-14 — 全走の畳みの「写し元の名乗り」を誰も読んでいなかった**

**なぜ門が見なかったか。** AC-12「写した裁定は元を名指す」は **Atlas の裁定行**しか撃っていなかった。
`tests/paradise.test.js` の畳んだ走行が出す
`Paradise fold: 写し元の領収書 at=… exit=… key=…` を、**誰も読んでいなかった。**
その行を `process.exit(0)` の後ろへ移すと**死にコード**になり、
**畳んだ緑がどの領収書に由来するかを永久に辿れなくなる**(第21条 b)。

**どう強くしたか。** 門 **`fold: 畳んだ走行は写し元を名乗る — 名乗りは死にコードの後ろへ移らない (prove M-14)`**
を `tests/paradise.test.js` の常駐部へ綴じた(台本: `reform/gate-fold/prove/harden-m14.js`)。
**畳める台帳を作って実際に走行を撃ち**、名乗った `key` / `exit` / `at` が
台帳の領収書と一致することを読む。併せて `passed` の語が出ないこと
(`census.js:57` の保険経路との綴りの衝突)も撃つ。

```
$ node reform/gate-fold/prove/mutate.js M-14
--- M-14 [鳴った] tests/paradise.test.js
    resident: exit=1 鳴った門: fold: 畳んだ走行は写し元を名乗る — 名乗りは死にコードの後ろへ移らない (prove M-14)
```

### 2.8 **B-02 / B-03 — 門を空転させる変異(第62条の核心)**

**なぜ門が見なかったか。**

- **B-02**: `withMutant` の `assert.notStrictEqual(broken, src)` を殺すと、
  **当たらなかった注入を「鳴った」と読む道が開く。**
  この現物の一族は **CRLF** を含み、LF の綴りは**一つも当たらない** ——
  この検めが死ねば、`fold.test.js` の「壊して鳴らす」が**全部空振りのまま緑**になる。
  **本相でこの罠を実際に踏んだ**(§1.5)。
- **B-03**: AC-16 の「健全な `decide` が倒れない」という**負の fixture** を消しても、
  誰も気づかなかった。**無罪と宣言した形が黙って消えれば、倒れる実装が緑で通る。**

**どう強くしたか。** 門 **`fold: この門は己の故障注入の骨を持っている (prove B-02 / B-03)`** を建てた:
①`withMutant` の検めが在ること ②**恒等な `mutate` を実際に渡して投げることを確かめる**
(綴りだけ残した無力化を捕らえる) ③二つの負の fixture が生きていること
④撃ちのループ(道の一覧)が痩せていないこと。

```
$ node reform/gate-fold/prove/mutate.js B-02 B-03
--- B-02 [鳴った] tests/fold.test.js
    fold: exit=1 鳴った門: fold: この門は己の故障注入の骨を持っている (prove B-02 / B-03)
--- B-03 [鳴った] tests/fold.test.js
    fold: exit=1 鳴った門: fold: 全走が一本も走らない CI は測定ではない (第56条 d) |
                          fold: この門は己の故障注入の骨を持っている (prove B-02 / B-03)
```

### 2.9 **W-04 — CI の環境変数を「部分一致」で読んでいた**

**なぜ門が見なかったか。** AC-23 の検めは `/PARADISE_FOLD_LEDGER/` の**部分一致**だった。
`PARADISE_FOLD_LEDGER` を **`PARADISE_FOLD_LEDGER_DISABLED` へ改名**すると、
**変数は死ぬのに綴りは残る** —— 検めは接尾辞の影に隠れて素通りし、
**領収書が刻まれない CI が緑で通る。**

**どう強くしたか。** 名を**行頭から `:` まで**で正確に読む形へ直した
(`/^\s*PARADISE_FOLD_LEDGER:\s/m`)。`PARADISE_NO_FOLD: '1'` も同じ形に揃えた。

```
$ node reform/gate-fold/prove/mutate.js W-04
--- W-04 [鳴った] .github/workflows/tribunal.yml
    fold: exit=1 鳴った門: fold: 全走が一本も走らない CI は測定ではない (第56条 d)
```

### 2.10 **M-16 / W-02 — 「無音」ではなく「変異の発明が甘かった」**

初撃では無音だったが、**変異が意味的に無害だった**。撃ち直したら鳴った。

- **M-16**: 刻みの呼びを別名に差し替えるだけでは、位置関係(`call > guard`)が変わらなかった。
  **枝の条件 `if (!GATE.active)` を `if (true)` へ潰す**形にしたら鳴った ——
  `fold: 絞り込み走行は領収書を刻まない`。
- **W-02**: `PARADISE_FOLD_LEDGER: …` を `..._DISABLED: x` に置換したら、
  **部分一致の検めが後者の中の綴りを拾って**素通りした(これが W-04 の発見につながった)。
  **行を丸ごと消す**形にしたら鳴った。

**この二つは無音率に「無音」として数えていない。** 数えたのは
「当たった変異に対して門が鳴らなかった」件のみである(第37条)。

---

## 3. 無音率 — 予想 vs 発明

| 層 | 撃った | 無音(初撃) | 無音率 |
|---|---:|---:|---|
| **L1 予想された壊し方の再現** | 10 | 0 | **0%** |
| **L2 発明(偽の緑狙い)** | 16 | 7 | **44%** |
| **L3 門自身の盲点** | 3 | 2 | **67%** |
| **L4 結線** | 4 | 2 | **50%** |
| | | | |
| **予想された壊し方(P-* / W-01)** | **11** | **0** | **0%** |
| **自分で発明した壊し方** | **22** | **11** | **50%** |
| **合計** | **33** | **11** | **33%** |

**過去の走行が言った「予想 13% / 発明 50%」は、発明の側で完全に再現した。**
予想の側が 13% → 0% に下がったのは、**build 相が既に全部撃って鳴らせていたから**である
(本相は第27条に従いそれを信じず、11 件を自分で撃ち直して 11/11 が鳴ることを確かめた)。

**無音は層に偏った。** 第62条の言うとおりである:

- **鍵の由来の層**(M-02 / M-08): 門が**作り物の鍵**で数を数えていたので、
  **鍵がどこから来たかを永久に見なかった。**
- **型と境界の層**(M-05 / M-13): 門が**本物の走行が書く形**だけを fixture にしたので、
  **外から足される形を見なかった。**
- **門自身の層**(B-02 / B-03): **門が己の空転を見なかった。**
- **綴りと効きの層**(M-10 / M-11 / W-04): 門が**ソースの綴り**を読んでいたので、
  **「受け取るが何もしない」実装を見なかった。**

---

## 4. 強くできなかったもの — **残債**(第62条 c)

### 残債 R-1: `inspected().closed()` は今も誰も呼んでいない

**M-07 の変異(`closed()` を `return true` に潰す)は、硬化後も無音である。**

```
$ node reform/gate-fold/prove/mutate.js M-07     (硬化後)
--- M-07 [注入が当たらなかった] …    ※ 錠を tally() へ移した後は変異点の形が変わった
```

**本相が直したのは錠の住所(`tally()` の上へ移した)であって、`closed()` ではない。**
`closed()` は module.exports に載らず(`inspected()` の戻り値の一部)、
**呼び手が 0 件のまま残っている。**

- **なぜ消さなかったか**: AC-15 が「錠は畳みの関数の外に立つ」と明文で要求しており、
  `closed()` はその要求の**外向きの口**である。消せば要件の文面と実体が食い違う。
- **なぜ門を建てられなかったか**: 「呼ばれていない関数が在る」ことは**欠陥ではない**。
  欠陥は「**呼ばれていないのに錠だと名乗っている**」ことであり、
  それを裁くには**エクスポートされた口のうち、どれが契約でどれが便宜か**を
  engine の側が名乗る機構が要る。**本改修では作らない**(揟7: 疑わしきは畳まない)。
- **次の走行への申し送り**: `closed()` を消して AC-15 の文面を `tally()` に寄せるか、
  `closed()` を呼ぶ門を建てるか。**どちらかを選ぶまで、この口は「飾り」である**
  (第48条 c: 常に緑の門は門ではない)。

### 残債 R-2: 鍵の外に残った現物 —— `reform/` と `.claude/`

拡げた後も、版管理下の **339 本(`reform/`)+ 23 本(`.claude/`)** は鍵の外に在る。

```
$ node -e "(版管理下で鍵にも derived にも無いものを種別で数える)"
鍵の外: 370 本
{ '.claude': 23, '.github': 2, 'NOTICE.md': 1, graph: 5, reform: 339 }
```

- `reform/` は**相の記録**であり、門が中身を裁くのは `build.md` の 1 本だけ
  (`fold: 記録なき前後は比較できない` が `/改善した|削減した/` を読む)。
  **これを鍵に入れれば、文書を一行直すたびに畳みが効かなくなる** ——
  偽の緑ではなく、機構が無言で死ぬ(第29条の除外と同じ理由)。
- `.claude/` は**配備先**であり、`mode=repo` の走行では読まれるが
  **宣言外の状態に近い**。`=global` を畳まない判断(AC-10)と同じ地平に在る。
- `.github/CODEOWNERS` / `pull_request_template.md` / `NOTICE.md` /
  `graph/examples/*.dag.json` / `graph/identity/history.json` /
  `graph/.paradise-source` は、**潰しても門が赤くならないことを実測した**
  (`raw/M-02-material-holes.json` / `raw/M-02-sweep2.txt`)。
- **ただし「今は鳴らない」は「永久に鳴らない」ではない。**
  次にこれらを読む門が建てば、**その日から鍵の穴になる。**
  射程の外は見逃しではなく、**次の走行の残債として名を持つ**(第62条 c)。

### 残債 R-3: CI 上では一度も撃っていない

本相の測定は**すべてローカル**である。CI runner 上で
①拡げた鍵(277 本)が畳みを殺さないか(`overlay/` を CI が書き換えないか)
②`📒 Fold` 段が新しい 6 門を実際に走らせるか
は**未測定である。緑と呼ばない**(第37条)。

### 残債 R-4: `atlas.js check --all-scales` の実走を撃っていない

M-08 の硬化は `artifactKey` の**単体**と**複製の成果物**で撃った。
**6 道 72 検査の実走(数分・ブラウザ 32 起動)は本相では撃っていない。**
`Executed 32 out of 72 inspections (40 reused)` が硬化後も成り立つかは
**未測定である**(`artifactKey` に長さを混ぜたので鍵の値は全部動いたが、
**同値関係は変わらない**ため 32/40 は保たれるはず —— だがこれは推論であって測定ではない)。

---

## 5. 復元の規律 — **本相で踏んだ罠**

**`finally` は殺されたら走らない。**

`material-holes.js` の初回走行が親の timeout で SIGKILL されたとき、
`finally` の書き戻しが飛び、**`graph/.paradise-source` が「壊れた」の 1 行で残った**:

```
$ git status --porcelain
 M graph/.paradise-source
$ git diff graph/.paradise-source
-This directory holds the Paradise ENGINE source (graph-engine, kg, forge, verdict,
…
+壊れた
```

**生バイトをプロセスの記憶だけに置く復元は、プロセスと一緒に死ぬ。**
ゆえに両方の走者に**退避簿**(`reform/gate-fold/prove/restore-journal/`)を足した ——
壊す**前に**ディスクへ生バイトと sha256 を置き、次の走行が `--rescue` で後始末する。

実際に効いた:

```
$ node reform/gate-fold/prove/mutate.js --rescue
復元した graph/fold.js
```

**本相の変異は 33 件すべてで、`finally` の書き戻し後に sha256 の一致を assert した。**
一件も食い違わなかった(食い違えば走者が `exit 9` で倒れる)。
**`git checkout -- <file>` は一度も使っていない** ——
唯一の例外は上の SIGKILL 事故の後始末であり、それは**本相の規律の失敗として記録した**。

---

## 6. 建てた門 / 触った現物

### 6.1 建てた門(6 本。499 → **500**)

| 門 | 住所 | 塞いだ無音 |
|---|---|---|
| `fold: 鍵は門が読む現物を覆う (prove M-02)` | `tests/fold.test.js` | **M-02**(実在の偽の緑) |
| `fold: 領収書の緑は型で裁く — 偽装された exit は畳めない (prove M-05)` | `tests/fold.test.js` | M-05 |
| `fold: P-2 の恒等式の錠は数を配る口の上に立つ (prove M-07)` | `tests/fold.test.js` | M-07(部分) |
| `fold: 成果物の鍵は成果物の全長から採る (prove M-08)` | `tests/fold.test.js` | M-08 |
| `fold: 領収書の形は台帳へ入る前に裁かれる (prove M-13)` | `tests/fold.test.js` | M-13 |
| `fold: この門は己の故障注入の骨を持っている (prove B-02 / B-03)` | `tests/fold.test.js` | B-02 / B-03 |
| `fold: 畳んだ走行は写し元を名乗る — 名乗りは死にコードの後ろへ移らない (prove M-14)` | `tests/paradise.test.js`(常駐) | M-14 |

既存の門を**強くした**もの(本数は増えない):

| 門 | 何を足したか | 塞いだ無音 |
|---|---|---|
| `fold: --no-fold は畳みを完全に切る (揟6)` | **振る舞いの検め**(atlas を実際に撃つ / 判断の式を凍らせる) | M-10 / M-11 |
| `fold: 全走が一本も走らない CI は測定ではない (第56条 d)` | 環境変数の名を**行頭から `:` まで**正確に読む | W-04 |

> **門は一本も緩めていない。** 触った既存の assert はすべて**強くなる向き**である。

### 6.2 触った現物

| 現物 | 何を変えたか |
|---|---|
| `graph/fold.js` | 鍵の覆いを拡げた(`overlay/` / `dashboard/` / `tools/` / `ROOT_DOCS` / `.mjs`)/ `find()` の `===` を註釈で凍らせた / `tally()` に恒等式の錠 / `artifactKey` に全長を混ぜた / `ROOT_DOCS` を export |
| `tests/fold.test.js` | 門 6 本を建て、2 本を強くした(20 → **26**) |
| `tests/paradise.test.js` | 常駐の門 1 本を建てた(7 → **8**) |
| `README.md` | 門の本数の主張 499 → **500**(**畳んだ census が自分で捕まえた。§7.2**) |

**`overlay/vendor/` には一行も触れていない**(第20条)。**`CLAUDE.md` は書き換えていない。**

### 6.3 残した台本(再走できる)

| 台本 | 何をするか |
|---|---|
| `reform/gate-fold/prove/mutate.js` | 変異の走者。`--list` / `--all` / `<ID>` / **`--rescue`** |
| `reform/gate-fold/prove/mutations.js` | 変異表 33 件(CRLF を自動で当て直す `sub`) |
| `reform/gate-fold/prove/material-holes.js` | **鍵の材料の穴を全数で測る**。`--rescue` つき |
| `reform/gate-fold/prove/harden-m14.js` | M-14 の門を `paradise.test.js`(CRLF)へ綴じる台本 |
| `reform/gate-fold/prove/results.jsonl` | 全撃の記録(鳴った門の名まで) |
| `reform/gate-fold/prove/raw/` | 生出力(`<ID>.<門束>.txt` / 穴の全数 / 最終の全走) |

---

## 7. 最終の実測(生出力)

### 7.1 全走 — **500 passed, 0 failed**

```
$ PARADISE_FOLD_LEDGER=<絶対パス> node tests/paradise.test.js
  ✓ fold: 台帳の番兵は汚した門を名指す

Paradise self-test: 500 passed, 0 failed
EXIT=0
```

台帳に刻まれた領収書:

```
$ cat reform/gate-fold/prove/raw/final-ledger.jsonl
{"at":"2026-09-21T00:59:17.532Z","key":"21148facbcd0c512","exit":0,"summary":"Paradise self-test: 500 passed, 0 failed"}
```

### 7.2 畳みが一巡すること

```
$ PARADISE_FOLD_LEDGER=<台帳> node graph/census.js check
Census self-test: Executed 0 out of 1 runs (1 reused, key=21148facbcd0c512)
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
```

> **畳んだ census が、本相の改修そのものを捕まえた。** 門を 1 本建てた時点で:
> ```
> 🔴 README テスト数: doc says 499, reality is 500  (README.md)
> ```
> **AC-04 が要求した「畳んでも第22条の主張を裁く」が、仕込みではなく実務で鳴った。**
> README を直して緑に戻した。

### 7.3 bail の三態

```
$ PARADISE_ABODE=global node graph/fold.js fold-status
fold: Executed 1 out of 1 runs (0 reused, bail=undeclared-state)
$ PARADISE_NO_FOLD=1 node graph/fold.js fold-status
fold: Executed 1 out of 1 runs (0 reused, bail=disabled)
$ PARADISE_FOLD_LEDGER=<台帳> node graph/fold.js fold-status
fold: Executed 0 out of 1 runs (1 reused, key=21148facbcd0c512)
```

### 7.4 門の本数

```
$ node tests/paradise.test.js --gate-list | tail -1
Paradise gate list: 500 gates

$ node tests/fold.test.js | tail -1
Fold self-test: 26 passed, 0 failed

$ node tests/paradise.test.js --gate '^fold:' | tail -1
Paradise gate-filter: 8 of 500 gates matched — 8 green, 0 red
```

### 7.5 結線と住処

```
$ node graph/wiring.js check
  ✓ 門 26 本すべてに走らせる者が居る (第44条)
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
exit=0

$ node graph/hermetic.js check
  ✓ 版管理下の現物を走行中に書き換える門は無い — 同時に走っても答えは一つである
exit=0

$ node graph/abode.js check
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
  ✓ 門は黙って緑に落ちず、兄弟の engine は同じ口から住所を得ている
exit=0
```

### 7.6 版管理の状態

```
$ git status --porcelain
 M README.md
 M graph/fold.js
 M reform/gate-fold/conclave.json
 M tests/fold.test.js
 M tests/paradise.test.js
?? reform/gate-fold/prove/
```

**壊した現物は一つも残っていない。** 33 件の変異すべてで sha256 の一致を確かめた。

---

## 8. この相が第62条に答えたこと

> **62. 門の形が、門の盲点を決める。振る舞いだけを撃つ門は、己の作法が隠した層を永久に見ない。**

本相はその条を**自分の身で再現した**:

| 門の作法 | 隠していた層 | 見つけた無音 |
|---|---|---|
| **鍵の材料に在るものだけを壊す** | 鍵の**外**の層 | **M-02**(7 本の穴 / 38 門 / 実在の偽の緑) |
| **作り物の鍵を写像に入れて数える** | 鍵の**由来**の層 | M-08 |
| **本物の走行が書く形だけを fixture にする** | **外から足される形**の層 | M-05 / M-13 |
| **ソースの綴りを読む** | **効き**の層 | M-10 / M-11 / W-04 |
| **門が自分の骨を撃たない** | **門の空転**の層 | B-02 / B-03 |
| **Atlas の裁定行だけを読む** | **全走の畳みの名乗り**の層 | M-14 |

**そして無音率は次の走行で測り直される。**
本相が建てた 6 本の門も、**次の変異走行の数が前より良くなって初めて証明される**(第38条)。
残債 R-1 〜 R-4 は、**まだ誰も落ちていない穴**として名を持つ。
