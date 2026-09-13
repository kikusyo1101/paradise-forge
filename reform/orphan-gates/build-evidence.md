# 改革『孤児の門』の証拠 — **建てられた門が誰にも呼ばれていない** (第44条)

枝: `reform/orphan-gates` / 着手時 HEAD: `910a316`
発令: 教主 (2026-09-13)

直前の改革『主権的住処』第8段 (PR #52 MERGED) が掘り当てた病 —— **要件と憲法に
書かれた門が、書かれた日から一度も撃たれていなかった** —— は、あの一件の事故では
なかった。台帳を浚うと**同じ形の負債が 3 件**出た。三件とも根は一つである:

> **第44条 — 誰も呼ばない門は門ではない。**

`wiring.js` は既に **engine** の孤児を数えている。だが **試験そのものの孤児**は
誰も数えていなかった。門を建てる engine が、門が呼ばれているかを見ていなかった。

本改革は 3 本を手で結線するだけでは終わらない。**四本目が生えた日に同じことが
起きる**からである。ゆえに心臓は §4 —— 同じ病の再発を機構が自動で名指す**メタ門**である。

---

## §0 着手前のベースライン(自分の手で実測)

**神の実機 `~/.claude` を1バイトも汚さないことを証明するため、先に指紋を採る。**

```console
$ git branch --show-current
reform/orphan-gates

$ sha256sum ~/.claude/settings.json
e6fb4b2011d14c5b05c3537e5f7aacf8298262367ea0ba0234a09dd6c46f7ccc  /c/Users/kikus/.claude/settings.json

$ find ~/.claude -type f | wc -l
556
```

**この 2 つ(sha256 / ファイル数 556)を、作業後に同じ手で採り直して照合する(§8)。**

---

## §1 欠陥の再現 — 教主の実測を自分の手で撃ち直す

### 欠陥A — CI が走らせていない `tests/` が 3 本存在する

```console
$ for f in tests/*.test.js; do n=$(basename $f); grep -q "node tests/$n" .github/workflows/*.yml || echo "孤児: $n"; done
孤児: abandoned-run.test.js
孤児: counsel.test.js
孤児: guards.test.js
```

単体で走らせた実測:

```console
$ node tests/counsel.test.js > /tmp/counsel.out 2>&1; echo "REAL_EXIT=$?"
REAL_EXIT=1

$ tail -1 /tmp/counsel.out
Counsel self-test: 49 passed, 2 failed
```

**`guards.test.js` が呼ばれていないのは特に重い。** 第7段で塞いだ輸出の関門
(AC-23)を守る門がまさにこれであり、第57条が「**これを強制する門**」として
名指ししているのもこの試験である。憲法が名指しした門が、CI から呼ばれていなかった。

### 欠陥B — `counsel.test.js` の赤い 2 門

```console
$ grep -n "✗" -A 8 /tmp/counsel.out
28:  ✗ 枢機卿 counsel が存在し、6相すべてを統べる
29-      Expected values to be strictly deep-equal:
30-+ actual - expected
32-  [
33-    'market-researcher',
34-    'auditor',
35-    'reporter',
36-+   'requirements-analyst'
--
74:  ✗ 相ごとに相応しい神官が指揮される — 実体を作って命令が届かぬ階層は階層でない (第25条)
75-      Expected values to be strictly equal:
76-+ actual - expected
78-+ 'requirements-analyst'
79-- 'auditor'
```

### 欠陥C — `gauge` の `--audit` の exit を読む口がどこにも無い

```console
$ grep -rn "gauge" .github/
(空)

$ node graph/gauge.js ledger --audit; echo "AUDIT_EXIT=$?"
📒 rows=7 distinct=7 duplicates=0 conflicts=0 too-deep=0 corrupt=0 suspect=0
AUDIT_EXIT=0
```

台帳は清い。**今なら門を建てても緑で始まる** —— 建てるなら今である。

---

## §2 counsel.test.js の 2 門を**裁く** — 門が古いのか、実装が壊れているのか

**これは赤直しではない。どちらが正しいかを先に決める作業である。**
門を緑にするために期待値を実装に合わせるのは第57条違反の恐れがある。ゆえに
**実装が正しいことを独立した証拠で示せない限り、門の側を直してはならない。**

### 2.1 何が食い違っているか

`clergy.js` の `PHASE_LEAD` には **`assess` が二度書かれている**:

```console
$ grep -n "assess:" graph/clergy.js
365:  assess:     'auditor',            // 集めた事実を突き合わせる
419:  assess:  'requirements-analyst',
```

JS のオブジェクトリテラルは**後勝ち**なので、実効値は `requirements-analyst` である。

```console
$ node -e "console.log(require('./graph/clergy.js').marshalPlan('assess').priest)"
requirements-analyst
```

### 2.2 裁き — **実装が正しく、門が古い**。根拠は 3 本

**根拠1: 道(forge.js)の宣言が `requirements-analyst` である。**
`assess` 相を誰が担うかを決めるのは道の宣言であり、`PHASE_LEAD` はそれに従う側である。

```console
$ sed -n '171,173p' graph/forge.js
    { id: 'assess', agent: 'requirements-analyst',
      goal: '外の調査(findings)と手元の実測(measurements)を突き合わせ、問いに対する筋を立てる。両者が食い違う点こそ本題である',
      deps: ['survey', 'measure'], artifact: 'analysis.md' },
```

**根拠2: `clergy.js` 自身が、なぜ麾下に加えたかを註釈で語っている。**

```console
$ sed -n '275,279p' graph/clergy.js
    // `assess`(事実を突き合わせて筋を立てる)は forge で requirements-analyst と
    // 宣言されているのに、この麾下に居なかった。marshalPlan は他家の神官への
    // 発令を正しく拒み、筆頭へ落としていた — **宣言と発令が静かに食い違って
    // いた**(第25条)。指揮系統を跨がせるのではなく、麾下に加えて正す。
```

`priests` に `requirements-analyst` が足され、`PHASE_LEAD.assess` が上書きされたのは
**第25条を満たすための意図的な修正**であって、事故ではない。門はその修正より古い。

**根拠3(決定的): 門の期待に実装を合わせると、CI に結線済みの別の門が赤くなる。**

版管理下の現物は汚さず、`$LOCALAPPDATA/Temp` の複製で故障注入した(第58条(c)):

```console
$ cd "$LOCALAPPDATA/Temp" && cp -r .../paradise verdict-probe && cd verdict-probe
$ sed -i "s/^  assess:  'requirements-analyst',/  assess:  'auditor',/" graph/clergy.js
$ node graph/check-agents.js; echo "REAL_EXIT=$?"
═══════ ⛪ AGENT PRESENCE ═══════
named by the paradise: 14 (forge.js + clergy.js + examples)
  ✓ all present
  ✓ every phase has a master
  🔴 misrouted: assess (scale: counsel) — 宣言 requirements-analyst だが発令先は auditor (counsel の筆頭に落ちている) → clergy.js の PHASE_LEAD に assess を書け
  ✓ the hierarchy is real, not declared
─────────────────────────────────
1 phase(s) are dispatched to a priest other than the one declared
═════════════════════════════════
REAL_EXIT=1
```

**`check-agents.js` は CI に結線済みの門である**(tribunal.yml:132)。
`counsel.test.js` の期待どおりに実装を倒せば、**その門が名指しで鳴る**。
二つの門が正反対を要求しており、**片方は CI に呼ばれ、もう片方は孤児だった**。
呼ばれていた方が正しい —— 孤児の門は、実装が動いた日から更新されなかったのである。

これは第44条の最も痛い形の実証である: **誰も呼ばない門は、腐っても誰にも気付かれない。**

### 2.3 ゆえに直すのは門の側である

期待値を実装に合わせるのではない。**門が測るべき事実が変わったことを、門に教える。**
`requirements-analyst` は counsel 枢機卿の 4 人目の神官として実在し、`assess` を
指揮する —— その事実を門に書き、**なぜそうなのかを門の註釈に残す**(次に読む者が
再び古い方へ倒さないため)。

### 2.4 直したもの

1. **`tests/counsel.test.js`** — 2 門の期待を現在の実装へ更新し、**なぜそう裁いたか**を
   門の註釈に残した(次に読む者が再び古い方へ倒さないため)。
2. **門を厳しくする方向の変更を1つ加えた。** 「三名すべてが指揮される」の列挙を
   `clergy.COLLEGE.counsel.priests` から引くようにした —— 麾下に神官が増えたのに
   一度も指揮されない者が生まれれば、それこそ第25条の病だからである。
   写経した3名の列挙のままなら、4人目は永久に検められなかった。
3. **`graph/clergy.js` の `PHASE_LEAD` から死んだ重複鍵を退治した。**

`assess` は **二度書かれていた**。JS は後勝ちなので `auditor` の行は一度も使われず、
**読む者には生きて見えるのに機械は無視する死骸**だった —— まさに第44条の形である。
実際これが「実装が壊れている」という誤読を誘っていた。宛先の宣言を一箇所に集めた。

```console
$ grep -n "assess:" graph/clergy.js
418:   * ⚠️ **かつてこの鍵は上の「諐問の道」節にも `assess: 'auditor'` として
428:  assess:  'requirements-analyst',
```

### 2.5 【正】直った側の実測

```console
$ node tests/counsel.test.js; echo "COUNSEL_EXIT=$?"
Counsel self-test: 51 passed, 0 failed
COUNSEL_EXIT=0

$ node graph/check-agents.js; echo "AGENTS_EXIT=$?"
  ✓ all present
  ✓ every phase has a master
  ✓ every dispatch reaches the declared priest
  ✓ the hierarchy is real, not declared
every named priest exists, every phase has a master, every dispatch reaches the declared priest, the hierarchy is real
AGENTS_EXIT=0
```

**49 passed / 2 failed → 51 passed / 0 failed。** 門は減っていない(2 門とも生きたまま直った)。

---

## §3 メタ門を建てる — 同じ病の再発を機構が名指す (本改革の心臓)

**3本を手で結線して終われば、四本目が生えた日に同じことが起きる。**

### 3.1 置き場所 — 新しい engine を建てない

まず既存の仕組みを調べた(重複する門を二重に建てないため):

```console
$ grep -rn "孤児\|orphan" graph/*.js | head -3
graph/atlas.js:954:   * だが彼らは孤児ではない。命令や門が直に呼ぶ、独立した engine である。
graph/atlas.js:1052:  const tagOf = (e) => e.orphan ? '孤児'
...
$ node graph/wiring.js --help
commands: map [--json] | check [--json]
```

**`wiring.js` が既に第44条の一般化を担っていた** —— 冒頭の註釈がそう名乗っている
(「どちらも持たない engine は **孤児** である。孤児は無害ではない —— 教主が
それを先例と読む (第44条)」)。しかもこの engine は**既に CI へ結線済み**である
(tribunal.yml:148)。ゆえに新しい engine は建てず、ここへ第三の病を足した。

- 既存: **engine の孤児**(誰も require せず、どの面も名を呼ばない)
- 新規: **門の孤児**(建てられた試験を、CI も統べる試験も走らせない)

### 3.2 engine の孤児と、門の孤児は数え方が違う

engine は `require` や散文に名が出れば「呼ばれている」と数えてよい。
だが **試験は走らされて初めて門である**。散文が名を語っても何も守らない。
ゆえに呼び手として数えるのは**実際に走らせる二つの口**だけに絞った:

| 呼び手 | 何を見るか |
|---|---|
| 門(CI) | `.github/workflows/*.yml` が `node tests/<名>` を撃つ |
| 統べる試験 | `tests/paradise.test.js` がその試験を子として起こす |

### 3.3 **門を建てる途中で、門自身が第16条を破りかけた**

初回の実測で、`guards.test.js` が**呼ばれている**と判定された。呼び手はこれだった:

```console
$ grep -n "guards.test.js" tests/paradise.test.js
78: * 先例は `tests/guards.test.js:30` の `skip()` である。同じ形をここへ移した。
```

**註釈である。何も走らせない。**
門が「名が出たか」で数えていたため、**散文で名を語ることを走らせることと取り違えた**
—— 名前で証拠を判ずるなという第16条を、第44条の門自身が破りかけたのである。

ゆえに統べる試験の側は**註釈行を捨ててから**数えるようにした(先例は `workspace.js`
の `hardcodedRefs`: 「註釈は道を説明してよい。咎めるのは実際に走るコードの中の住所だけ」)。
CI(yml)側は逆に全文で見る —— `run:` の中身は註釈ではなく命令そのものだからである。

修正後、**門は教主が実測した 3 本を独立に再現した**:

```console
$ node graph/wiring.js check; echo "EXIT=$?"
═══ 🔗 WIRING GATE (第44条 / 第48条) ═══
  engine 39 / 内の辺 73
  · 門の除外 1 件: tests/_pulse-fixture.js — 門ではなく、pulse の門が読む作り物の的である(先頭の _ が支援ファイルを表す)
  🔴 孤児の門 3:
      tests/abandoned-run.test.js — 建てられているが、CI も paradise.test.js も走らせない
      tests/counsel.test.js — 建てられているが、CI も paradise.test.js も走らせない
      tests/guards.test.js — 建てられているが、CI も paradise.test.js も走らせない
      門は走らされて初めて門である。赤いまま誰にも気付かれず住み続ける (第44条)。
      .github/workflows/*.yml に "node tests/<名>" を足すか、paradise.test.js から起こせ。
  🔴 結線が破れている
EXIT=1
```

### 3.4 除外は**口で名乗る** (第54条(c))

`_pulse-fixture.js` は門ではなく作り物の的である。だが**黙って除外しない**:

- 除外は `GATE_EXCLUDE` に `why` 付きで書く(理由の書けない除外は見逃しである)
- 除外の判定を**綴りの規則より先**に置いた。逆にすると `_pulse-fixture.js` は
  `.test.js` で終わらないので黙って落ち、**免除が一度も数えられない**。
- CLI は毎回 `· 門の除外 1 件: …` と出力する(上の実出力に見える通り)。

先例は `workspace.js` の `HARDCODE_EXCLUDE_FILES` である。

---

## §4 3本 + gauge を CI へ結線する

`.github/workflows/tribunal.yml` の検証ゲートへ、Wiring 門の直後に 4 本を足した。
**Wiring 門の直後**に置いたのは偶然ではない —— 誰かがこの行を消せば、直上の門が
孤児として名指しで鳴る(§5 の【逆2】がそれを実証している)。

### 4.1 gauge の `--audit` — 律速な難所を二段で撃つ

実台帳は**兄弟倉**に住み、**CI に兄弟倉は無い**。素朴に書けば CI では毎回
「台帳が無い → 緑」になる。これは第37条(不在は通過ではない)違反である。
ゆえに `tests/gauge-audit.test.js` を建て、**両方**やった:

- **(a) 門自体の健全性** — 仮倉に毒を仕込み、exit 1 / 2 が本当に出ることを撃つ。
  CI に兄弟倉が無くとも**必ず走る**。これが無ければ CI では永遠に skip しか出ず、
  門が審であることすら証されない。
- **(b) 実台帳** — 在る環境では本物を監査し、無ければ **skip を名乗って**通す
  (第58条(e)。黙って return しない)。

⚠️ 実台帳は**読むだけ**である。兄弟倉の `gauge-ledger.jsonl`(未コミットの正当な
1行を含む)は 1バイトも書き換えていない。故障注入は全て `os.tmpdir()` の複製に対して行った。

```console
$ node tests/gauge-audit.test.js; echo "EXIT=$?"

台帳の監査 — 門自体の健全性 (CI に兄弟倉が無くとも必ず走る):
  ✓ 【正】清い台帳は exit 0 — 門は正当な台帳を通す(壁ではなく門である)
  ✓ 【逆】重複を仕込むと exit 1 — 機械が畳めば消える欠陥 (第55条)
  ✓ 【逆】破損行を仕込むと exit 2 — 人が読むまで消えない事故 (第37条)
  ✓ 【逆】偽の指紋を仕込むと exit 2 — 名乗る鍵と中身が食い違う (第16条)
  ✓ 【逆】台帳が無い倉は「読めない」— 空と健全を同じ文にしない (第37条)

台帳の監査 — 実台帳 (神の機にのみ在る):
  ✓ 実台帳が健全である — 在る環境では本物を監査する

Gauge ledger audit self-test: 6 passed, 0 failed, 0 skipped
EXIT=0
```

**逆の側の生の実測**(門が本当に三段の信号を返すことの直接証拠):

```console
$ PARADISE_CREATIONS="$T" node graph/gauge.js ledger --audit    # 清い写し
📒 rows=3 distinct=3 duplicates=0 conflicts=0 too-deep=0 corrupt=0 suspect=0
EXIT=0

$ head -1 "$T/gauge-ledger.jsonl" >> "$T/gauge-ledger.jsonl"     # 重複を仕込む
📒 rows=4 distinct=3 duplicates=1 conflicts=0 too-deep=0 corrupt=0 suspect=0
EXIT=1

$ echo 'this-is-not-json{{{' >> "$T/gauge-ledger.jsonl"          # 破損行を仕込む
⚠️ ledger line skipped (corrupt): this-is-not-json{{{…
📒 rows=4 distinct=3 duplicates=1 conflicts=1 too-deep=0 corrupt=1 suspect=0
  ⚠️ 破損行: JSON として読めない — this-is-not-json{{{…(畳みでも掃除でも消してはならない)
  🔴 人が読むべき行が 1 件ある — 掃除では消えない
EXIT=2

$ # 偽の指紋を名乗らせる
📒 rows=1 distinct=1 duplicates=0 conflicts=1 too-deep=0 corrupt=0 suspect=0
  ⚠️ 矛盾: alpha — 名乗る指紋 deadbeefdeadbeef が中身から導かれる g1:2c018e48be0a5641 と食い違う
  🔴 人が読むべき行が 1 件ある — 掃除では消えない
EXIT=2
```

指紋は**写経していない** —— `gauge.fingerprint()` に導かせている。写経すれば、
指紋の規則が変わった日にこの門が黙って嘘をつく(第29条)。

### 4.2 結線後 — メタ門が緑になる

```console
$ node graph/wiring.js check; echo "EXIT=$?"
═══ 🔗 WIRING GATE (第44条 / 第48条) ═══
  engine 39 / 内の辺 73
  · 門の除外 1 件: tests/_pulse-fixture.js — 門ではなく、pulse の門が読む作り物の的である(先頭の _ が支援ファイルを表す)
  ✓ 門 19 本すべてに走らせる者が居る (第44条)
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
EXIT=0
```

---

## §5 門の逆の側を撃つ — 健全な系で緑になるだけの門は証明されていない

**故障注入は版管理下の現物に対して行っていない**(第58条(c) / hermetic)。
`$LOCALAPPDATA/Temp/meta-probe` へ倉を丸ごと複製し、そこを壊した。

### 【逆1】孤児 `tests/orphan-demo.test.js` を仕込む → **名指しで exit 1**

```console
$ cp -r . "$T/meta-probe" && cd "$T/meta-probe"
$ printf "console.log('I am a gate nobody calls');\n" > tests/orphan-demo.test.js
$ node graph/wiring.js check; echo "EXIT=$?"
  · 門の除外 1 件: tests/_pulse-fixture.js — 門ではなく、pulse の門が読む作り物の的である(先頭の _ が支援ファイルを表す)
  🔴 孤児の門 1:
      tests/orphan-demo.test.js — 建てられているが、CI も paradise.test.js も走らせない
      門は走らされて初めて門である。赤いまま誰にも気付かれず住み続ける (第44条)。
      .github/workflows/*.yml に "node tests/<名>" を足すか、paradise.test.js から起こせ。
  🔴 結線が破れている
EXIT=1
```

**これが完成形である。** 将来誰かが `tests/foo.test.js` を足して CI に繋ぎ忘れたら、
**その PR で CI が赤くなる。**

### 【逆2】CI の yml から `node tests/guards.test.js` の行を消す → **guards を名指し**

```console
$ rm -f tests/orphan-demo.test.js
$ grep -v "node tests/guards.test.js" .github/workflows/tribunal.yml > /tmp/y && mv /tmp/y .github/workflows/tribunal.yml
$ node graph/wiring.js check; echo "EXIT=$?"
  🔴 孤児の門 1:
      tests/guards.test.js — 建てられているが、CI も paradise.test.js も走らせない
      門は走らされて初めて門である。赤いまま誰にも気付かれず住み続ける (第44条)。
  🔴 結線が破れている
EXIT=1
```

**手で結線した 3 本は、手で黙って外せない。** メタ門が自己適用として見張っている。

### 【正】現状の倉でメタ門が exit 0 — §4.2 の実出力の通り

### hermetic — 門が己の測る対象を汚していないこと

```console
$ node graph/hermetic.js check; echo "EXIT=$?"
  ✓ 版管理下の現物を走行中に書き換える門は無い — 同時に走っても答えは一つである
EXIT=0
```

---
