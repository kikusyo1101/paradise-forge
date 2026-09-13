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
