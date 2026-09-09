# reflect 相 — 敵対的自己批評(改革 `gate-filter`)

- **ブランチ**: `feat/gate-filter` / HEAD `7d26614`
- **相**: reflect(断罪機関。どの枢機卿にも属さない)
- **立場**: **この改革を弁護しない。** 本書は褒めるためではなく、**まだ誰も撃っていない網目**を探すために書く。

本相は変異を実装に入れて実際に撃った。**撃てなかったものは「未実行」と明記する。**
変異はすべて `git checkout -- tests/paradise.test.js` で戻した(§9)。

---

## 0. 結論の先出し

**新しい盲点を 6 本見つけた。うち 1 本(F-1)は致命である。**

| # | 盲点 | 深刻度 | 撃ったか |
|---|---|---|---|
| **F-1** | **`--gate` を「1 本も実行しない no-op」に変える 1 行変異が、全走 454 本を緑のまま通す。常駐の門 5 本は自分自身も絞り込まれるため鳴けない** | **致命** | ○ 実測 |
| **F-2** | `matched` と `green+red` の一致を誰も検めない。`N of 454 gates matched — 0 green, 0 red` が exit 0 で成立する | **重大** | ○ 実測 |
| **F-3** | 常駐 5 本は**自分自身が絞り込みの対象**である。`--gate-not 'gate-filter:'` の一語で門番を全部黙らせられる | **重大** | ○ 実測 |
| **F-4** | `critic.js` の「何も見つからなかった」は**空虚な緑**。reform 走行には scope 主語が無く、76 件の教訓が全部 out-of-scope で素通りする | **重大** | ○ 実測 |
| **F-5** | 絞り込みが使えるようになったこと自体が風習の危険を生む(全走の回避)。機構的な抑止が一つも無い | **中** | 論証 + 一部実測 |
| **F-6** | 残り 17 本の AC は依然として無防備。特に AC-12 / AC-18〜20 の「引数の誤りを赤にする」群は 1 行で全滅する | **中** | ○ 実測 |

**新しい条は要る。** 草案は §7。

---

## 1. 【F-1・致命】門番の門は、自分が絞り込まれるので鳴けない

### 中核の問い への答え

> **門を足した。ではその門自身は誰が見張るのか。**

**答え: 誰も見張っていない。** 正確には——**門番の 3 本は「子プロセスの呼び方」を守ってはいるが、「絞り込みが実際に門を走らせること」を一切守っていない。**

### 撃った変異(E6)

`tests/paradise.test.js:83` の 1 行。

```js
- if (GATE.list) { GATE.say(name); return; }          // fn を呼ばない
+ if (GATE.active) { GATE.list && GATE.say(name); return; }
```

意味: **絞り込み走行のとき、門の本体 `fn()` を一度も呼ばずに `return` する。**
`--gate-list` のときだけ名を出す振る舞いは保たれるので、`--gate-list` の実測(0.07 秒 / 454 gates)は変異前と区別がつかない。

### 実測 — 絞り込み走行

```
$ node tests/paradise.test.js --gate 'schedules a simple diamond'
門の絞り込み (gate-filter / 第22条):
Paradise gate-filter: 注意 — 絞り込み走行は門の依存を保証しない。…
Paradise gate-filter: 1 of 454 gates matched — 0 green, 0 red
EXIT=0
```

**`1 of 454 gates matched` と名乗りながら、緑 0・赤 0。そして exit 0。**
「1 本当たった」と言い、「0 本走った」と言い、それでも**成功を返す**。

### 実測 — 常駐の門 5 本

```
$ node tests/paradise.test.js --gate '^gate-filter: '
Paradise gate-filter: 5 of 454 gates matched — 0 green, 0 red
EXIT=0
```

**門番 5 本を名指しで呼んでも、5 本とも走らない。** ✗ が一つも出ない。
なぜなら**門番自身が絞り込みの対象だから**である。`return` は門番にも等しく効く。

> **門番は、自分が見張っている当の機構によって黙らされる。**
> これは第16条(「証拠はその名ではなく、それが何を為すかで裁かれる」)の
> 教科書的な破れである。5 本の門は「常駐している」という**名**を持つが、
> 変異後に**為している**ことは何も無い。

### 全走はどうなるか

全走(引数なし)では `GATE.active === false` なので `if (GATE.active)` は成立せず、
**454 本は正常に走り、正常に緑になる**。門番 3 本は子プロセスを起こすが、
その子は `--gate` 付き = 0 本走行で `exit 0` / `Paradise self-test:` を名乗らず /
最終行は `gates matched` を含む——**3 本の assert がすべて充たされる**。

### 全走の実測 — **緑のまま通った**

E6 変異を入れたまま、引数なしの全走を撃った(background / 約 6 分):

```
$ node tests/paradise.test.js
FULLRUN_EXIT=0
Paradise self-test: 454 passed, 0 failed
✗ の数: 0
```

**`454 passed, 0 failed` / exit 0 / ✗ ゼロ。**
**絞り込み機構が完全に壊れているのに、楽園は自分を健全だと宣言した。**

これが指示の言う「**壊れても全走が緑のままなら、それは新しい網目であり、この相の最大の成果である**」に該当する。**成果である。**

### なぜ prove/review/verify の誰も気づかなかったか

三相が撃った変異(M1〜M4, prove の 21 本)は**すべて「名乗りの文字列」と「exit 値」を撃つ変異**であった。
`? 2` → `? 0`、`GATE.active` → `true`、警告行の位置、`green/red` → `passed/failed`。
**「絞り込みが本当に門を実行しているか」を撃つ変異が一つも無かった。**

門番 3 本の assert を読めば分かる——3 本が見ているのは
`r.status` と `r.stdout` の**文字列**だけである。**子が実際に何本の門を走らせたかを、誰も数えていない。**

---

## 2. 【F-2・重大】`matched` と `green + red` の一致を誰も検めない

F-1 の根はここにある。総括行は 3 つの数を名乗る:

```
Paradise gate-filter: {matched} of {total} gates matched — {pass} green, {fail} red
```

**健全ならば `matched === pass + fail` が恒等式である。** 絞り込みを通った門は必ず走り、
必ず緑か赤のどちらかになるからだ。しかし——

**この恒等式を検める門は一本も存在しない。** 実測:

| 走行 | matched | green | red | 恒等式 | exit |
|---|---|---|---|---|---|
| 健全 `--gate '^gate-filter: '` | 5 | 5 | 0 | ○ 5=5 | 0 |
| **E6 変異後** | **5** | **0** | **0** | **✗ 5≠0** | **0** |

**`5 ≠ 0` という露骨な自己矛盾を名乗りながら、機構は緑を返す。**

これは第22条(「楽園が自分について語る数は、数えられるものでなければならず、実際に数えられていなければならない」)
の違反である。総括行は**3 つの数を語りながら、その 3 つの整合を誰も数えていない**。

**F-1 は F-2 の系である。** 恒等式の門が 1 本あれば、E6 は即座に赤くなる
(`matched=5, green+red=0`)。**この 1 本が本改革の最大の欠落である。**

---

## 3. 【F-3・重大】門番は `--gate-not` の一語で全員黙る

門番 5 本の名はすべて `gate-filter: ` で始まる(verify.md が「既存 2 本と揃えた」と誇っている点である)。
**揃えたことが、まとめて外す取っ手になった。**

**一語で 5 本全部が走行から消える。実測:**

```
$ node tests/paradise.test.js --gate-not '^gate-filter: ' --gate-list | tail -1
Paradise gate list: 449 of 454 gates matched
$ node tests/paradise.test.js --gate-not '^gate-filter: ' --gate-list | grep -c '^gate-filter: '
0
```

**454 → 449。門番 5 本がきれいに消え、残った門は 0 本も `gate-filter:` を名乗らない。**
しかも**除外は包含に勝つ**(AC-04)ので、
`--gate 'gate-filter' --gate-not 'gate-filter'` のような自己矛盾した指定でも
**黙って 0 本**になる。

これ自体は絞り込み機構の設計どおりの振る舞いであり、単独では欠陥ではない。
**欠陥なのは、「門番だけは絞り込みから除外する」という発想が設計に無いこと**である。

> 門番を絞り込めるということは、**絞り込みの機構が門番より上位にある**ということだ。
> 見張られる側が見張る側の生殺与奪を握っている。

F-1 が成立したのは、まさにこの上下関係のせいである。

---

## 4. 【F-4・重大】`critic.js` の「何も見つからなかった」は空虚な緑である

指示どおり過去の教訓の再発を見た。

```
$ node graph/critic.js review reform/gate-filter --lessons graph/lessons.json
VERDICT: the critic found nothing (76 件の教訓で裁いた). Proceed to judgment.
EXIT=0
```

**教主も verify も、この exit 0 を「教訓の再発なし」と読んだ。だがこれは緑ではない。**

出力を最後まで読むと、**76 件のほぼ全部が同じ理由で素通りしている**:

```
✓ [gap] lesson:gate-must-not-depend-on-what-it-guards: lesson out of scope here (applies: paradise-internal)
✓ [gap] lesson:env-is-not-canon: lesson out of scope here (applies: paradise-internal)
✓ [gap] lesson:gate-neutralized-by-or-true: lesson out of scope here (applies: paradise-internal)
   … (同文が延々と続く)
```

### 原因(`graph/critic.js:517-531` を読んだ)

critic は教訓の `applies:` を **creation の spec(`requirements.md` + `findings.md` + `prd.md`)**
に対して照合する。`reform/gate-filter/` には **`findings.md` も `prd.md` も存在せず**、
`requirements.md` に `paradise-internal` の語は **0 回**しか現れない。

```
$ grep -c "paradise-internal" reform/gate-filter/requirements.md
0
```

**ゆえに scope 主語が実質空になり、`applies: paradise-internal` を持つ教訓が全部 out-of-scope に落ちる。**

### 実測による証明

同じディレクトリの写しに、scope 主語を宣言する `findings.md` を 1 枚置いただけで撃ち直した:

```
$ printf '# findings\n\nthis reform is paradise-internal orchestration work.\n' > $T/findings.md
$ node graph/critic.js review $T --lessons graph/lessons.json
EXIT=1
```

**exit 0 → exit 1。** 鳴った教訓のうち、**本改革に正面から刺さるもの**を挙げる:

| 教訓 | 本文 | 本改革との関係 |
|---|---|---|
| `gate-must-not-depend-on-what-it-guards` | 門は自分が守るものに依存してはならない | **F-1 / F-3 そのものである。門番が絞り込み機構に依存している** |
| `gate-neutralized-by-or-true` | 門が `\|\| true` で無力化される | **F-1 は「`\|\| true` を書かずに門を無力化する」新種である** |
| `gate-asserts-invariant-not-symptom` | 症状ではなく**不変量**を assert せよ | **F-2 そのもの。門番は症状(文字列)を見て不変量(`matched=green+red`)を見ていない** |
| `absence-is-not-passage` | 不在は通過ではない | **0 本走った走行が exit 0 を返す = F-1** |
| `art28-conduct-not-grepped` | 規範の教訓は grep で裁けない | **F-5(全走回避の風習)がまさにこれ** |

**楽園は、この改革を裁くのに必要な教訓を既に全部持っていた。**
**それが scope の穴で一つも発火しなかった。**

### これは第14条の破れである

第14条: *A scope needs a subject, or the fence becomes a blind spot.*
critic.js の該当箇所のコメント自身がこう書いている——

> the subject must be the target's DECLARED scopes — otherwise the subject
> is the empty string and every scoped lesson silently vanishes exactly
> where it was written to fire (Art. 14: a scope without a subject is a blind spot, not a fence).

**engine(`--self`)については `selfScopeSubject()` でこの穴を塞いである。
だが `reform/*/` という第三の場所には、その手当てが無い。**
reform は creation でも engine でもない——**第14条の手当てから漏れた住所**である。

> **註**: これは `gate-filter` 改革が作った穴ではなく、reform の道そのものの穴である。
> だが**本改革の審査がこの空虚な緑に依拠している**以上、reflect 相が名指す責任がある。
> 本相は `graph/critic.js` を触っていない(掟)。**次相 or 別改革の課題として記す。**

---

## 5. 【F-5・中】この改革が楽園にもたらしたもの——全走を避ける風習

指示は「逃げるな」と言うので逃げずに書く。**これは機械の欠陥ではなく、風習の危険である。**

### 何が起きたか

改革前、楽園には**全走という選択肢しか無かった**。6 分は重いが、
**重さが「全部を見る」ことを強制していた**。

改革後、20.8 秒で 449 本が撃てる。**合理的な行為者(人でも AI でも)は、
20.8 秒の道がある限り 350 秒の道を選ばない。**

### なぜこれが危険か——本改革自身が証拠を残している

security 相が実測した D-2 を読め:

> `--gate 'links nodes and shows neighbors'` → **0 green, 1 red**
> 前段 `remembers and queries a node` を足す → **2 green, 0 red**

**共有 `kgRoot` に依存する門は、単独走行で偽の赤を出す。**
教主はこれに対し**警告行を出す**という手当てをした。だが警告行が防ぐのは
**偽の赤に驚くこと**だけである。逆向きの危険——

> **絞り込み走行で緑だった門が、全走では赤かもしれない。**

を防ぐ機構は**一つも無い**。門は順序に依存し、絞り込みは順序を壊す。
**「20 秒で緑だった」は「全走で緑である」を一切含意しない。**
警告行はこれを「依存を保証しない」と正直に名乗っているが、**名乗りは門ではない**。

### 機構的な抑止が一つも無い

| 問い | 答え |
|---|---|
| 絞り込み走行の回数を記録する台帳はあるか | **無い** |
| 最後に全走したのが何時かを楽園は知っているか | **知らない** |
| 「絞り込みだけで PR を出した」ことを検める門はあるか | **無い** |
| commit / PR が全走の証拠を要求するか | **していない**(CI は全走するが、それは commit 後である) |

**楽園は「自分が最後にいつ全体を見たか」を記憶していない。**
これは第22条が守ろうとしたもの——**楽園が自分について語る数の正しさ**——の、
時間軸方向の穴である。README の `454/454` は**いつの 454 か**を語らない。

### 反論への応答

「CI が全走するから良い」——これは**半分しか正しくない**。
CI は push 後に走る。**設計判断・変異検証・「直った」という確信**はすべて
push の**前**に、絞り込み走行の緑を根拠に形成される。
第38条は「記録なき前後は比較できない」と言うが、
**絞り込み走行には「どの母数で測ったか」の記録が残らない。**

事実、**本相自身がこの風習に一度足を踏み入れた**: §1 の E6 変異を
最初に絞り込み走行だけで裁こうとし、`0 green, 0 red / exit 0` を見て
「変異が入っていないのでは」と疑った。**全走を撃つまで、何が起きたか分からなかった。**
道具は既に判断を曲げ始めている。

---

## 6. 【F-6・中】残り 17 本の AC — 引数の誤り群は 1 行で全滅する

verify.md の集計は「常駐 5 本 / 手順 16 本 / 未実行 1 本」である。
**手順 16 本は機械が守っていない。** そのうち**最も危険な群**を選んで撃った。

### 撃った的: `die()` の一行(AC-12 / AC-18 / AC-19 / AC-20 を一撃で殺す)

4 本の AC——不正な正規表現・打ち間違えたフラグ・値の無い `--gate`・空文字パターン——は
**すべて `die()` という 1 個の関数を通る**:

```js
const die = (msg) => { process.stderr.write(msg + '\n'); process.exit(2); };
```

`process.exit(2)` を `process.exit(0)` に変えて実際に撃った:

| AC | 引数 | 健全時 exit | **変異後 exit** |
|---|---|---|---|
| AC-18 打ち間違えたフラグ | `--gates` | 2 | **0** |
| AC-19 値の無い `--gate` | `--gate` | 2 | **0** |
| AC-12 不正な正規表現 | `--gate '['` | 2 | **0** |

**3 本とも exit 0 になった。**(AC-20 空文字も同じ `die` を通るので同様)
メッセージは stderr に出続けるので、**目で見ている限り何も変わらない。**
変わったのは**機械が読む値だけ**である——第16条が最も嫌う形の破れである。

**そして常駐 5 本は 5 green / 0 red のまま。全走も撃った:**

```
$ node tests/paradise.test.js      # die 変異を入れたまま
FULLRUN_EXIT=0
Paradise self-test: 454 passed, 0 failed
✗ の数: 0
```

**これも全走が緑のまま通る。** 2 本目の網目である。

> **同じ 1 行に 4 本の AC がぶら下がっているのに、その 1 行を見張る門が 0 本である。**
> これは prove 相が発見した「常駐が 2 本しか無い」という網目と**同型**であり、
> verify 相はその網目を 5 本に広げただけで、**塞ぎ切っていない**。

---

## 7. 新しい条は要るか — **要る。草案を示す**

### 判断

**要る。** ただし specify 相が持ち越した「部分の走行は全体の走行の名を騙ってはならない」
**だけでは足りない**。それは既に第22条が(名乗りの側から)覆っており、
実装も AC-13/14 で守っている。**本相が見つけた F-1 / F-2 が要求するのは、より深い条である**:

> **絞り込みは、絞り込まれた門を実行しなければならない。
> そして門番は、自分が絞り込まれてはならない。**

第16条は「証拠はその名ではなく為すことで裁かれる」と言う。
だが第16条は**個々の門**について語り、**門を選ぶ機構**については語っていない。
本改革は楽園に**「門の部分集合を走らせる」という新しい走行の種**を導入した。
**新しい走行の種には、それを裁く条が要る**(第36条の精神——新しい道は古い門に拒まれる)。

### 条文の草案(英語 / 既存の文体に合わせた)

> **56. A selection must run what it selected, and the selector may not select away its own warden**
>
> The paradise may now run a subset of its gates. A subset is a new kind of run, and a
> new kind of run brings a new kind of lie: a selection that matches gates and runs none
> of them reports a shape indistinguishable from success. Therefore:
>
> **(a) The count must close.** A selecting run states three numbers — matched, green, red.
> `matched` must equal `green + red`, and the run must assert this of itself before it
> exits. A run that names a gate it did not execute has not measured; it has narrated.
> Absence of red is not presence of green (Art. 37).
>
> **(b) The warden stands outside the selection.** The gates that watch the selecting
> mechanism must not themselves be selectable away by that mechanism. A warden that the
> guarded thing can silence is not a warden; it is a decoration that the machine keeps
> green for free (Art. 16). Whatever names or filters the wardens carry, at least one
> gate must execute unconditionally, in every run, and must fail when the selection
> mechanism stops executing what it selects.
>
> **(c) A partial run may not stand in for the whole.** A selecting run must not speak
> the summary the whole run speaks, and no number the paradise publishes about itself
> may be sourced from a selecting run (Art. 22). The paradise must also be able to say
> **when** it last ran whole; a claim of health whose last full measurement is unrecorded
> is a claim about the past stated in the present tense (Art. 38).
>
> *Why: the gate-filter reform added the fifth kind of self-deception — not a gate that
> fails silently, but a gate that is never asked. Three wardens were raised to watch the
> new mouth; all three watched what it said and none watched whether it did anything.
> A one-line change made every selecting run execute zero gates while reporting `5 of 454
> gates matched` and exiting 0, and the full run stayed green because the wardens were
> selected away along with everything else.*

### この条が要求する機構(次相への実装課題)

1. **`matched === pass + fail` の恒等式を総括行の直前で assert する**(F-2 を塞ぐ / (a))
2. **門番 5 本を絞り込みの対象外にする**——例: `wants()` が `^gate-filter: ` で始まる名に
   対しては常に `true` を返す、あるいは絞り込み走行でも門番だけは必ず走らせる(F-1/F-3 / (b))
3. **全走の日時を台帳に刻む**(F-5 / (c))

> **註**: 1 と 2 には順序がある。**2 を先に入れると 1 が無くても E6 は鳴る**
> (門番が走れば `0 green` にはならない)。だが**1 の方が根である** ——
> 恒等式は門番以外のあらゆる絞り込み走行を守る。**両方入れよ。**

---

## 8. 撃った変異の全表(**鳴ったものも正直に記す**)

**7 本の変異を実装に入れて撃った。すべて `git checkout -- tests/paradise.test.js` で戻した。**

| # | 変異 | 常駐 5 本 | 全走 | 判定 |
|---|---|---|---|---|
| **E6** | `if (GATE.list)` → `if (GATE.active)`(**絞り込み走行が `fn()` を呼ばない**) | **5 green 0 red / exit 0** | **454 passed 0 failed / exit 0** | **✗ 網目(F-1)** |
| **E8** | `die()` の `exit(2)` → `exit(0)`(AC-12/18/19/20 を同時に殺す) | **5 green 0 red** | **454 passed 0 failed / exit 0** | **✗ 網目(F-6)** |
| E2 | `gateRun` の子に `--gate-list` を付ける(子が門を 1 本も実行しない) | **5 green 0 red / exit 0** | 未実行 | **✗ 網目(F-1 の別経路)** |
| E3 | 子に渡す `--gate` を `--gaet` に打ち間違える | 2 green **3 red** / exit 1 | — | ○ 鳴った |
| E4 | `GATE_ONE` を存在しない門の名にする | 3 green **2 red** / exit 1 | — | ○ 鳴った |
| E5 | 子の実行対象を `node -e` の別物にすり替える | 2 green **3 red** / exit 1 | — | ○ 鳴った |
| E7 | `wants()` を無効化(絞り込みが全門を `return`) | **exit 2**(0 件走行) | — | ○ 鳴った(AC-11 の系が拾った) |

### 読み方

**門番 3 本は「子プロセスの呼び方の壊れ」には確かに鳴る(E3/E4/E5)。**
verify 相が主張した防御は本物である。**そこは認める。**

**だが「子が正しく呼ばれ、正しい形の出力を返しながら、中身を一つも実行していない」
という壊れ方には、3 本とも無力である(E2/E6)。**

> 門番が見ているのは **子の名乗り**であって、**子の仕事**ではない。
> これは楽園が第16条で繰り返し戒めてきた過ちの、最も新しい形である。

### E7 が鳴ったことの意味(門番の功績ではない)

E7 で鳴ったのは **AC-11 の門ではなく、AC-11 が守っている実装そのもの**である。
`wants()` が全門を落とすと `matched === 0` になり、既存の `exit 2` 経路が発火した。
**門が鳴ったのではなく、実装が自分で転んだ。** 混同してはならない。

E6 が E7 と違うのは、**`matched` は正しく数え上げたまま `fn()` だけを飛ばす**点である。
`matched === 0` の経路に落ちないので、実装は自分で転ばない。**だから誰も気づかない。**

---

## 9. 掟の遵守と `git status --porcelain`

| 掟 | 遵守 |
|---|---|
| 実装を恒久に書き換えない | **遵守**。7 本の変異はすべて `git checkout -- tests/paradise.test.js` で戻した |
| `graph/` を触らない | **遵守**。critic.js の穴(F-4)は**読んだだけ**。写しを `$LOCALAPPDATA/Temp` に作って撃った |
| `.github/workflows/` `CONSTITUTION.md` `CLAUDE.md` `README.md` を触らない | **遵守**。第56条は**草案を critique.md に書いただけ** |
| 作ってよいのは `critique.md` だけ | **遵守** |
| 捏造しない | §10 に未実行を列挙 |

### `git status --porcelain`(本相の最後)

```
?? reform/gate-filter/critique.md
```

**`tests/` は含まれていない。** 変異は一つも残っていない。
(verify 相が commit を済ませているため、前相の持ち越し差分も既に無い。
本相が生んだ差分は `critique.md` の 1 本のみである。)

---

## 10. 本相が撃てなかったもの(**捏造しないための明記**)

| 撃てなかったもの | 理由 |
|---|---|
| E2 変異での全走 | 全走 6 分 × 本数の予算。**E6 と同じ機序**(子が門を実行しない)なので E6 の全走で代表させた。**E2 単独の全走は未実行である** |
| AC-15(census が環境を毒されても汚れない) | verify 相と同じく**未実行**。本相も走らせていない |
| 残り 17 本の AC のうち F-6 で扱った 4 本以外 | 予算。AC-01〜10 / AC-21 / AC-22 の変異は**撃っていない** |
| F-4 の是正が実際に効くか | `graph/critic.js` を触れないため、**写しでの再現までしか撃っていない**。修正案の検証は未実行 |
| F-5(全走回避の風習)の定量 | **測っていない**。台帳が無いので測りようが無い——それ自体が F-5 の論拠である |
| ReDoS(security 相の 45 秒ハング) | 既知として再発見せず。**本相では撃っていない** |

---

## 11. reflect 相の裁定

**この改革は「良い改革だが、未完である」。**

verify 相が常駐を 2 → 5 本にしたのは正しい前進であり、
E3/E4/E5 が鳴ったことがそれを実証している。**そこを否定しない。**

だが本相の裁定はこうである:

> **5 本の門番は、絞り込み機構が「嘘をつく」ことは防いだが、
> 絞り込み機構が「何もしない」ことは防いでいない。**
>
> prove 相が見つけた網目は「門が 2 本しか無い」であった。
> verify 相はそれを「門を 3 本足す」で塞いだ。
> **だが足した門は、足した先の機構に自分の首を握らせたままである。**
> **網目は数の問題ではなく、上下関係の問題であった。**

**ratify に進める前に、§7 の機構 1(恒等式 `matched === green + red`)と
機構 2(門番を絞り込みの対象外にする)を実装すべきである。**
どちらも数行であり、E6 を赤にするのに十分である。

**第56条の制定を建議する。**(草案 §7。`CONSTITUTION.md` は本相では触っていない)
