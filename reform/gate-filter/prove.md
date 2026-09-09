# prove — 門の絞り込み(フィルタ)の口

**相**: prove(証明)/ 改革 `gate-filter`(第23条 b)
**日付**: 2026-09-09
**ブランチ**: `feat/gate-filter` / 実装 commit **`088996a`**(prove 相は一行も commit していない)
**環境**: Windows / git-bash(MSYS)/ `node v24.14.0` / `cwd = C:/Users/kikus/Documents/workspace/paradise`

この相の唯一の職務は **新しい機能を作ることではなく、既にある門をわざと壊して鳴ることを確かめる**ことである。
**「健全なシステムしか見たことの無い門は、一度も試されていない」。**

以下に載せる出力は**すべて実際に撃った実出力**である。撃てなかったものは「撃てなかった」と書く。

---

## 0. 到達点(要約)

| 項目 | 実測 |
|---|---|
| 撃った変異 | **21 本** |
| 鳴った(赤くなった)変異 | **20 本** |
| **鳴らなかった変異** | **1 本 — M-19(AC-22 の性能変異)** |
| build 相が残した未実行 AC | AC-01 / AC-06 / AC-10 / AC-15 / AC-21 → **5 本すべて撃った。5 本とも期待どおり** |
| 最終の作業ツリー | `M reform/gate-filter/conclave.json` のみ(§6) |
| **門の網目(最重要)** | **22 本の AC のうち常駐の門は 2 本(AC-16 / AC-17)だけ。残り 20 本は「手順」であって「門」ではない**(§5) |

---

## 1. 未実行だった AC を撃つ

build 相が「走らせていないので緑だったとは書かない」と正直に残した 5 本を、requirements.md の記述どおりに撃った。

### AC-01 — 引数なし全走の名乗りと exit(NFR-02 / FR-09)

background で 1 回。

```
$ time node tests/paradise.test.js ; echo "EXIT=$?"
real    6m0.222s
EXIT=0

$ tail -2 <log>
Paradise self-test: 451 passed, 0 failed
```

**期待どおり。** 書式は一字も動いていない。所要 **360.2 秒**は NFR-01 の閾値 362.4 秒の**内側**である
(build 相が測った 364.5 秒は閾値超過だったが、本相の再測では下回った。**同じ機械でも走行ごとに揺れる**
—— この揺れ幅そのものが NFR-01 の裁定に必要な事実であり、verify 相に渡す)。

### AC-06 — `--gate` 複数指定は OR(FR-03)

```
$ node tests/paradise.test.js --gate 'schedules a simple diamond' --gate 'abandoned-run:' ; echo "EXIT=$?"
  ✓ schedules a simple diamond into 3 waves
  ✓ abandoned-run: 見捨てられた走行と迷子の走行帳の門が緑 (第53条)
Paradise gate-filter: 2 of 451 gates matched — 2 green, 0 red
EXIT=0
```

**期待どおり 2 件。** AND なら 0 件になる(それは M-13 で実証した)。

### AC-10 — 絞り込んだ走行の中の赤は exit 1 で鳴る(FR-04 の exit 規約)

**門を一本故意に壊してから撃った**(M-1 の変異を入れた状態):

```
$ node tests/paradise.test.js --gate '門ヘルパー: test\(\) の失敗が必ず数に載る'
  ✗ 門ヘルパー: test() の失敗が必ず数に載る — 集計行が嘘をつかない (P3/T2 / 第16条)
      test() の抜き出しが走らない: [eval]:11
  GATE.total++;
  ^

ReferenceError: GATE is not defined
    at test ([eval]:11:3)
    at [eval]:18:1
Paradise gate-filter: 1 of 451 gates matched — 0 green, 1 red
EXIT=1
```

**`0 green, 1 red` / `EXIT=1`。期待どおり。** 絞り込み走行は赤を隠さない。

### AC-15 — census が絞り込みで汚れない(環境を毒しても 451)(FR-02 / 第22条)

内部で全走を伴うため background で走らせた。**所要 5m59.937s。**

```
$ PARADISE_GATE=zzz PARADISE_GATE_NOT=atlas GATE=zzz \
    node -e "console.log(JSON.stringify(require('./graph/census.js').census().tests))"
{"passed":451,"failed":0}
EXIT=0
```

**`{"passed":451,"failed":0}`。期待どおり。**
`census.js:90` が引数を渡さず env を丸ごと継承するという discover §4.3(A) の事実を**実経路で撃った**が、
絞り込みは env を一つも読まないので census は汚れない。**AC-16(静的・一瞬)の主張が、実経路で裏を取られた。**

なお census の走行中に build 相 §4-5 が報告した台帳の破損警告が再現した
(`⚠️ ledger line skipped (corrupt): >>>>>>> A…` 等)。**本改革とは無関係の既存の傷**であり触っていない。

### AC-21 — 絞り込み走行では README の数を触らない(FR-09 / 第22条)

```
$ git diff --quiet README.md && echo CLEAN
CLEAN
$ node tests/paradise.test.js --gate 'schedules a simple diamond' > /dev/null ; echo "EXIT=$?"
EXIT=0
$ git diff --quiet README.md && echo CLEAN
CLEAN
```

**`CLEAN` が 2 回。期待どおり。** この AC が将来の退行を塞ぐことは M-17 が実証した。

---

## 2. 健全時の基線(変異を入れる前の実測)

変異が「赤くした」と言うには、**変異前が緑であったこと**を同じ口で測っておかねばならない。

```
$ node tests/paradise.test.js --gate '^gauge\(故障注入\): ' --gate-list | tail -1
Paradise gate list: 11 of 451 gates matched                     ← AC-03(design 実測の 11 と一致)
$ … | grep -vc '^gauge(故障注入): '   (総括行を除く)
0                                                                ← すべて前方一致している

$ node tests/paradise.test.js --gate 'atlas:' --gate-not '描画器が実際に受理する' --gate-list | grep -c '描画器が実際に受理する'
0                                                                ← AC-04(除外が包含に勝っている)
$ … | tail -1
Paradise gate list: 16 of 451 gates matched

$ node tests/paradise.test.js --gate-list | tail -1
Paradise gate list: 451 gates                                    ← AC-07
$ node tests/paradise.test.js --gate-list | grep -c '^dashboard-count 系: '
8                                                                ← AC-08
$ time node tests/paradise.test.js --gate-list > /dev/null ; echo "EXIT=$?"
real    0m0.083s                                                 ← AC-09(閾値 3 秒に対し 1/36)
EXIT=0

$ node tests/paradise.test.js --gate ; echo "EXIT=$?"
Paradise gate-filter: --gate requires a pattern
EXIT=2                                                           ← AC-19
$ node tests/paradise.test.js --gate '' ; echo "EXIT=$?"
Paradise gate-filter: --gate requires a pattern
EXIT=2                                                           ← AC-20
$ node tests/paradise.test.js --gate 'zzz-no-such-gate-zzz' ; echo "EXIT=$?"
Paradise gate list: 0 of 451 gates matched — nothing was measured
EXIT=2                                                           ← AC-11
$ node tests/paradise.test.js --gates 'atlas' 2>&1 | tail -1 ; (EXIT を別途取得)
Paradise gate-filter: unknown flag --gates
EXIT=2                                                           ← AC-18
$ node tests/paradise.test.js --gate 'schedules a simple diamond' | tail -1
Paradise gate-filter: 1 of 451 gates matched — 1 green, 0 red    ← AC-02
```

**静的解析なら何と名乗るか**(AC-07 / AC-08 が禁じている実装の数):

```
$ grep -c '^test(' tests/paradise.test.js
443
```

**443 ≠ 451。** requirements.md は「442」と書いているが、**実測は 443 である**
(新門 2 本が足された後に、`^test(` で数える対象が 1 本増えた勘定になる)。
**数を捏造しないため、ここは実測値 443 を記す。** いずれにせよ 451 とは違う数であり、AC-07 の主張は保たれる。

---

## 3. 変異の記録 — 一本ずつ壊し、鳴かせ、戻す

作法: 変異は `git diff` で見える形で入れ、確かめたら **必ず `git checkout -- <file>`** で戻す。
**各変異の前後で `git status --porcelain` を取った**(以下、`before` / `after` として貫く)。
`before` はすべて `M reform/gate-filter/conclave.json`(conclave の環が書いた相の状態。本相は触っていない)、
`after` も同じであることを毎回確認した。

**6 分の全走を伴う変異は避けた。** 絞り込み走行(1〜20 秒)や `--gate-list`(0.08 秒)で撃てるものは
そちらで撃った —— **これがこの改革の成果物を自分で使うということである。**

### M-1 — `typeof GATE` の守りを外し、裸参照に戻す(build 相が実測で見つけた新変異点)

**どこをどう変えたか**(`tests/paradise.test.js` の `test()`):

```diff
-  if (typeof GATE !== 'undefined') {
-    GATE.total++;
-    if (GATE.active && !GATE.wants(name)) return;
-    GATE.matched++;
-    if (GATE.list) { GATE.say(name); return; }          // fn を呼ばない
-  }
+  GATE.total++;
+  if (GATE.active && !GATE.wants(name)) return;
+  GATE.matched++;
+  if (GATE.list) { GATE.say(name); return; }          // fn を呼ばない
```

**どの門がどう鳴いたか**(`tests/paradise.test.js:4919` の門を **1 秒で単独に撃った**):

```
  ✗ 門ヘルパー: test() の失敗が必ず数に載る — 集計行が嘘をつかない (P3/T2 / 第16条)
      test() の抜き出しが走らない: [eval]:11
  GATE.total++;
  ^

ReferenceError: GATE is not defined
    at test ([eval]:11:3)
    at [eval]:18:1
    at runScriptInThisContext (node:internal/vm:219:10)
Paradise gate-filter: 1 of 451 gates matched — 0 green, 1 red
EXIT=1
```

**鳴った。** `typeof GATE !== 'undefined'` は防御的な飾りではなく**契約**である
——「絞り込みが存在しない世界でも `test()` は単体で正しく数える」。
4907 行付近の門はまさにその世界を子プロセスに作って撃つ門であり、この一行はその門を通すためにある。
**この変異は AC-10 の証明も同時に果たした**(§1)。

**戻した**: `git checkout -- tests/paradise.test.js` → `after` = `M reform/gate-filter/conclave.json`

### M-2 — マッチ 0 件の exit を 2 → 0(AC-11 / 業界既定に倒れる道)

```diff
-  : GATE.matched === 0 ? 2
+  : GATE.matched === 0 ? 0
```

```
$ node tests/paradise.test.js --gate 'zzz-no-such-gate-zzz'
Paradise gate list: 0 of 451 gates matched — nothing was measured
EXIT=0        ← 健全なら 2
```

**鳴った(AC-11 の期待 `EXIT=2` が破れた)。**
node:test / Jest / Mocha 既定 / Vitest の **4/4 が exit 0 を返す**「マッチ 0 件」を、
楽園は exit 2 で鳴らす(第16条)。**これが楽園が業界と袂を分かつ地点であり、AC-11 がそれを見張る。**
文言(`nothing was measured`)は変異後も出るが **exit だけが黙る** —— CI は文言を読まない。**exit こそが門である。**

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-3 — 総括行に `passed` / `failed` の語を戻す(AC-13 / AC-14 の主門)

```diff
-  SAY(`Paradise gate-filter: ${GATE.matched} of ${GATE.total} gates matched — ${pass} green, ${fail} red\n`);
+  SAY(`Paradise self-test: ${pass} passed, ${fail} failed\n`);
```

```
最終行: Paradise self-test: 1 passed, 0 failed
AC-13 grep -c 'Paradise self-test' = 1     ← 健全なら 0
AC-14 census.js:55 (名指しの正規表現)  = 1  ← 健全なら 0
AC-14 census.js:57 (保険の matchAll)   = 1  ← 健全なら 0
AC-14 tribunal.yml:307                 = 1  ← 健全なら 0
AC-14 tribunal.yml:308                 = 1  ← 健全なら 0
```

**鳴った。四つの消費者すべてが同時に騙された。**
`--gate` 一本だけを走らせた局所走行が **`1 passed, 0 failed` と名乗り**、
census はこれを README に写し、tribunal は verdict の材料にする。
**「局所走行が全走を騙る」が実物として起きることを、この出力が証明している。**
AC-13 / AC-14 はこれを塞ぐ主門である。

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-4 — 絞り込み塊に `process.env.PARADISE_GATE` を一行足す(AC-16)

```diff
 const GATE = (() => {
+  const _ = process.env.PARADISE_GATE;
   const argv = process.argv.slice(2);
```

```
  ✗ gate-filter: 絞り込みは環境変数を読まない
Paradise gate-filter: 1 of 451 gates matched — 0 green, 1 red
EXIT=1
```

**鳴った。** **これは常駐の門である**(§5)。1 秒で鳴る。

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-4b — AC-16 第二の壊し方: 開始マーカーを `test()` の直前まで下げる

塊の中身は一字も変えず、**マーカーの位置だけ**を動かした(塊が引数解釈を含まなくなる)。

```
  ✗ gate-filter: 絞り込みは環境変数を読まない
Paradise gate-filter: 1 of 451 gates matched — 0 green, 1 red
EXIT=1
```

**鳴った。** この門は「`process.env` が 0 件」だけでなく
**「塊が痩せていないこと」(`test()` を含む / `--gate-list` を含む / 400 字超)**も見ている。
**空の塊なら env が 0 件なのは当たり前で、それは門ではない**(第16条)—— その自覚が実装に埋まっている。

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-5 — `graph/census.js` の `execFileSync` の引数配列に `'--gate','x'` を足す(AC-17)

**本相で `tests/paradise.test.js` 以外を触った唯一の変異である。**

```diff
-      const out = execFileSync(process.execPath, [path.join(ROOT, 'tests', 'paradise.test.js')],
+      const out = execFileSync(process.execPath, [path.join(ROOT, 'tests', 'paradise.test.js'), '--gate', 'x'],
```

```
  ✗ gate-filter: census は自己診断を素で呼ぶ
Paradise gate-filter: 1 of 451 gates matched — 0 green, 1 red
EXIT=1
```

**鳴った。** **`git checkout -- graph/census.js` で戻した**
→ `after` = `M reform/gate-filter/conclave.json`(`graph/` に差分なし)。
**将来 census 側から絞り込みが漏れ込むのを塞ぐ、時を超えた門である。**

### M-6 — `--gate-list` を静的解析にする(AC-07 / AC-08)

`^test\('…'` を正規表現で拾って名を並べる実装を実際に書いて差し込んだ。

```
AC-07 最終行: Paradise gate list: 443 gates          ← 健全なら 451 gates
AC-08 dashboard-count 系の本数 = 0                    ← 健全なら 8
```

**両方が同時に鳴った。**
2694 行のループが生む `dashboard-count 系: …` は**ループ変数を実行時に展開して初めて名になる**。
静的解析はこれを **1 本にも見られず 0 本**にした。
**AC-07 / AC-08 は静的解析実装を機械的に禁じる門である**ことが実証された。

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-7 — 除外と包含の優先順位を逆にする(AC-04)

```diff
-      if (INC.length && !INC.some((re) => re.test(name))) return false;
-      if (EXC.some((re) => re.test(name))) return false;
-      return true;
+      if (INC.some((re) => re.test(name))) return true;
+      if (EXC.some((re) => re.test(name))) return false;
+      return INC.length === 0;
```

```
AC-04 除外したはずの名が残った行数 = 1        ← 健全なら 0
Paradise gate list: 17 of 451 gates matched  ← 健全なら 16
```

**鳴った。** 包含が先に勝つと、`--gate-not` で名指しした門が**黙って走行に混ざり込む**。
分母が 16 → 17 に増えることが、除外の敗北を数で示している。

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-8 — 未知フラグを黙って無視する(AC-18)

```diff
-    die(`Paradise gate-filter: unknown flag ${a}`);
+    continue;
```

**6 分の全走を払わずに撃つ工夫**: 変異が効けば未知フラグが素通りして**後続の `--gate` だけが効く**。
ゆえに未知フラグと絞り込みを併走させれば 1 秒で判る。

```
$ node tests/paradise.test.js --gate 'schedules a simple diamond' --gates
Paradise gate-filter: 1 of 451 gates matched — 1 green, 0 red
EXIT=0                              ← 健全なら 2 (unknown flag)
unknown flag の行数 = 0              ← 健全なら 1
```

**鳴った。** 打ち間違えたフラグが**黙って**受理され、教主は「絞り込んだつもり」の走行を信じてしまう。

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-9 — 不正な正規表現を try/catch で黙殺する(AC-12)

```diff
-    catch (e) { die(`Paradise gate-filter: invalid pattern ${p}: ${e.message}`); }
+    catch (e) { return /(?:)/; }
```

**この変異は最初、全走 6 分に落ちて前景を切らせた**(まさに AC-12 が禁じている振る舞いそのもの)。
`--gate-list` を併用して 0.1 秒で撃ち直した:

```
$ node tests/paradise.test.js --gate '[' --gate-list
invalid pattern の行数 = 0            ← 健全なら 1
Paradise gate list: 451 gates         ← /(?:)/ が 451 本**全部**にマッチした
EXIT=0                                ← 健全なら 2
```

**鳴った。** `[` という打ち間違いが **451 本全部の走行**に化ける。
**黙殺は「安全側に倒す」ことではない。それは 6 分を盗む欺きである。**

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-10 — `--gate-list` で `fn` を呼んでしまう(AC-09 の 3 秒閾値)

```diff
-    if (GATE.list) { GATE.say(name); return; }          // fn を呼ばない
+    if (GATE.list) { try { fn(); } catch {} GATE.say(name); return; }
```

**Atlas の重い 1 本だけに絞って計った**(451 本全部を呼ばせれば 6 分かかるため):

```
$ time node tests/paradise.test.js --gate '^atlas: 全ての道が図になる' --gate-list > /dev/null
real    4m5.157s
```

**鳴った。健全時 0.083 秒 → 変異後 245.2 秒。AC-09 の閾値 3 秒の 81 倍。**
**たった一本の名を並べるだけで 4 分**である。451 本全部なら 6 分の全走に戻る。
`--gate-list` が「名を知るための安い口」であることは、`fn` を呼ばない一点にかかっている。

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-2b — 絞り込み走行の exit を常に 0 に固定する(AC-10 の壊し方)

```diff
-  : (fail === 0 ? 0 : 1));
+  : 0);
```

併せて `schedules a simple diamond` を必ず投げる差し替えを入れ、**赤がある状態**を作った。

```
  ✗ schedules a simple diamond into 3 waves
Paradise gate-filter: 1 of 451 gates matched — 0 green, 1 red
EXIT=0                                ← 健全なら 1
```

**鳴った。総括行は `1 red` と正直に言っているのに exit が 0 を返す。**
**人の目には赤が見え、機械の目には緑が見える** —— これが AC-10 が塞ぐ最も陰湿な欺きである。

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-11 — 照合を `re.source === name` の完全一致にする(design §7 の AC-02)

```diff
-      if (INC.length && !INC.some((re) => re.test(name))) return false;
+      if (INC.length && !INC.some((re) => re.source === name)) return false;
```

```
Paradise gate list: 0 of 451 gates matched — nothing was measured
EXIT=2                                ← 健全なら 0 / 1 件マッチ
```

**鳴った。** 部分一致でなくなった瞬間 AC-02 の道が AC-11 の道へ落ちる。
**AC-11 が「静かな 0 件」を exit 2 で鳴らす門であることが、ここでも効いている。**

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-12 — `new RegExp` を `String.includes` に差し替える(design §7 の AC-03)

```diff
-    try { return new RegExp(p); }
+    try { return { test: (n) => n.includes(p) }; }
```

```
$ node tests/paradise.test.js --gate '^gauge\(故障注入\): ' --gate-list
Paradise gate list: 0 of 451 gates matched — nothing was measured
EXIT=2                                ← 健全なら 11 件 / EXIT=0
```

**鳴った。** `^` とエスケープが文字通り扱われ、11 件が 0 件になる。
**正規表現であることは、この口の約束(FR-01)である。**

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-13 — OR を AND にする(design §7 の AC-06)

```diff
-      if (INC.length && !INC.some((re) => re.test(name))) return false;
+      if (INC.length && !INC.every((re) => re.test(name))) return false;
```

```
$ node tests/paradise.test.js --gate 'schedules a simple diamond' --gate 'abandoned-run:'
Paradise gate list: 0 of 451 gates matched — nothing was measured
EXIT=2                                ← 健全なら 2 件 / EXIT=0
```

**鳴った。** 二つの名を同時に狙うことが不可能になる(一つの名が両方の正規表現に合うことは無い)。

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-14 — 値検査 `if (v === undefined || v === '' || /^--/.test(v))` を `if (false)` に落とす(AC-19 / AC-20)

```
AC-19: node … --gate --gate-list
  → Paradise gate list: 0 of 451 gates matched — nothing was measured
  → EXIT=2、しかし requires a pattern の行数 = 0    ← 健全なら 1

AC-20: node … --gate '' --gate-list
  → Paradise gate list: 451 gates
  → EXIT=0                                          ← 健全なら 2
```

**鳴った。ただし鳴り方が二つの AC で違い、それ自体が設計の正しさを示している。**

- **AC-19 は「exit だけ」では捕らえられない。** 変異後も `EXIT=2` は返る(`/undefined/` が 0 件マッチするため)。
  **メッセージが違う。** requirements.md:443 がまさにそれを予告しており、**文字列一致でこの AC が赤くなる**。
  **exit だけを見る AC 設計では、この退行を見逃した。**
- **AC-20 は exit で捕らえられる。** 空文字が全件にマッチし、**6 分の全走が「絞り込んだ」書式で名乗る**
  —— AC-13 と裏表の欺きである。

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-15 — `v === ''` の項だけを削る(AC-20 単独)

```
$ node tests/paradise.test.js --gate '' --gate-list
Paradise gate list: 451 gates
EXIT=0                                ← 健全なら 2
```

**鳴った。** `new RegExp('')` が 451 本全部にマッチする。**空の絞り込みは「全件」ではなく赤である。**

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-16 — 除外の判定行を削る(AC-05)

```diff
-      if (EXC.some((re) => re.test(name))) return false;
+      // (削除)
```

**6 分の全走を払わずに撃つ工夫**: 除外が効かないなら `--gate-list` に**除外したはずの名が残る**。

```
$ node tests/paradise.test.js --gate-not 'atlas: 全ての道が図になる' \
    --gate-not 'atlas: 門は己の残骸で落ちない' --gate-list
除外指定した名が一覧に残った行数 = 2        ← 健全なら 0
Paradise gate list: 451 gates              ← 健全なら 449 of 451 gates matched
```

**鳴った。** AC-05 の壊し方(「所要が 350 秒超に戻る」)は 6 分を払う撃ち方だが、
**同じ退行を 0.08 秒で捕らえられる**ことをここで示した。
**AC-05 は時間で裁く AC だが、その根は「除外が効いているか」であり、それは一覧が語る。**

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-17 — 走行中に README を書き換える副作用を足す(AC-21)

```diff
+try { fs.appendFileSync(path.join(DIR, '..', 'README.md'), '\n<!-- MUTANT -->\n'); } catch {}
 try { fs.rmSync(kgRoot, { recursive: true, force: true }); } catch {}
```

```
CLEAN(1回目)
DIRTY(2回目) — AC-21 が赤
```

**鳴った。** `git checkout -- README.md tests/paradise.test.js` で**両方戻した**
→ `after` = `M reform/gate-filter/conclave.json`。
AC-21 は「現状に無い副作用」を塞ぐ AC であり、**将来の退行を塞ぐ門であることが実証された。**

### M-18 — `wants()` の最終 `return true` を `return false` に(AC-01 の安い変異)

design §7 が「より安い変異」として挙げたもの。

```
$ node tests/paradise.test.js --gate-list
Paradise gate list: 0 of 451 gates matched — nothing was measured
EXIT=2                                ← 健全なら 451 gates / EXIT=0
```

**鳴った。** ただし**これは AC-01 の門が鳴ったのではない**。
AC-01(引数なし全走で `451 passed`)は `GATE.active` が偽なので `wants()` を**呼ばない** ——
この変異は**全走に影響しない**。鳴ったのは AC-07 の道である。
**正直に書く: AC-01 を赤くする変異は 6 分の全走を要し、本相では撃っていない**(§4-b)。
代わりに **`wants()` の壊れを 0.08 秒で捕らえる道があること**を示した。

**戻した** → `after` = `M reform/gate-filter/conclave.json`

### M-19 — 事前コンパイルを廃し `wants()` で毎回 `new RegExp` する(AC-22)—— **鳴らなかった**

§4 に詳述する。

---

## 4. 鳴らなかった変異 —— 門の網目(隠さず名指す)

**これが prove 相の最も価値のある出力である。**

### 4-a. M-19(AC-22 / NFR-01)—— **壊したのに赤くならなかった**

**どこをどう変えたか**:

```diff
-  const INC = comp(inc), EXC = comp(exc);
+  const INC = { length: inc.length, some: (f) => inc.map((p) => new RegExp(p)).some(f) },
+        EXC = { length: exc.length, some: (f) => exc.map((p) => new RegExp(p)).some(f) };
```

design §7 が「451 回 × パターン数のコンパイル。閾値 362.4 秒に迫る」と予告した変異である。
**全走(引数なし)で撃った**:

```
$ time node tests/paradise.test.js ; echo "EXIT=$?"
real    6m4.773s     ( = 364.8 秒)
EXIT=0
Paradise self-test: 451 passed, 0 failed
```

**赤くならなかった。**

**なぜ捕らえられないか(正直に分析する)**:

1. **全走では `GATE.active` が偽であり、`wants()` は一度も呼ばれない。**
   ゆえに**この変異は全走の所要に原理的に影響しない**。364.8 秒という数は変異の代ではなく**走行の揺れ**である
   (本相の健全時 AC-01 は 360.2 秒、build 相は 364.5 秒。**変異なしでも 4 秒以上揺れる**)。
2. **AC-22 の閾値 362.4 秒は、この揺れ幅(±5 秒程度)より狭い。**
   閾値が雑音に埋もれている以上、**AC-22 は性能退行を裁く門としては機能していない**。
3. 絞り込み走行(`--gate`)でなら `wants()` は呼ばれるが、その走行は 1 秒であり、
   **451 回のコンパイル(数ミリ秒)は測定不能な誤差**である。

**結論(隠さない)**:
> **この壊し方は現在の門では捕らえられない。**
> AC-22 / NFR-01 は「全走が遅くなっていないこと」を測る門だが、
> **絞り込み機構の性能退行はその全走の経路を一度も通らない**。
> 門と変異が**別の道を歩いている**。
> さらに、閾値 362.4 秒が走行の揺れ(実測 360.2 / 364.5 / 364.8 秒)より狭く、
> **健全な実装でも赤くなり得る**(build 相の 364.5 秒がまさにそれだった)。
> **偽陽性を出す門は、真陽性を出せない門でもある。**

### 4-b. 撃てなかった変異(「撃てなかった」と正直に書く)

| 変異 | なぜ撃たなかったか |
|---|---|
| **AC-01 を全走で赤にする変異**(`wants()` を `return false` 固定 + `GATE.active` 判定を外す) | 6 分の全走を要する。本相は既に全走を **4 回**(AC-01 / AC-15 / M-19 / §4-c の網目検分)払っており、これ以上の全走は費用に見合わない。**代わりに M-18 で `wants()` の壊れが 0.08 秒で捕らえられることを示した** |
| **AC-05 を「所要 350 秒超」で赤にする変異** | 同上。**M-16 で同じ退行を 0.08 秒で捕らえた** |
| **AC-18 を「451 本が 6 分走る」で赤にする変異** | 同上。**M-8 で同じ退行を 1 秒で捕らえた** |

**いずれも「撃てなかった」のであって「緑だった」のではない。**

### 4-c. 最大の網目 —— **22 本の AC のうち、常駐の門は 2 本しかない**

**M-2(マッチ 0 件の exit を 2 → 0)を入れたまま、引数なしの全走を撃った。**
問い: **常駐の門 451 本のうち、この退行を捕らえるものは在るか。**

```
$ time node tests/paradise.test.js ; echo "EXIT=$?"
real    6m3.210s
EXIT=0
Paradise self-test: 451 passed, 0 failed
✗ の行数 = 0
```

**一本も鳴かなかった。451 本すべてが緑のまま、AC-11 の主張は死んでいた。**

**これは実装の欠陥ではなく、AC の性質である**(そして**それこそが網目である**):

| 種別 | AC | 誰が撃つか |
|---|---|---|
| **常駐の門**(自己診断が毎回撃つ) | **AC-16 / AC-17** の **2 本** | 機械が毎回 |
| **手順**(人または相が手で撃つ) | AC-01〜15 / 18〜22 の **20 本** | **prove 相の神官(=今回の私)だけ** |

> **この 20 本は「門」ではなく「かつて一度撃たれた記録」である。**
> 本相が去った後、`GATE.matched === 0 ? 2` を `? 0` に書き換える者が現れても、
> **自己診断は 451 本すべて緑で通り、CI も通り、誰も気づかない。**
> AC-13 / AC-14(局所走行が全走を騙るを塞ぐ主門)も、AC-11(業界と袂を分かつ地点)も、
> **同じ意味で無防備である**(M-3 / M-2 が実証したとおり、変異は 1 文字で入る)。

**これは build 相の落ち度ではない** —— requirements.md も design.md も AC-16 / AC-17 だけを
「自己診断に常駐させる門」と定めており、実装はその通りに為された。
**穴は要件と設計の段にある。** ゆえに**この報告が名指すべき事柄である**。

**verify / reflect 相への具申**(prove 相は実装しない。第23条 b の職分を越えないため):

- **AC-11 / AC-13 / AC-14 は、子プロセスで実際に絞り込みを走らせて exit と最終行を検める門として
  自己診断に常駐させられる。** 費用は 1 本あたり 1 秒未満である
  (4907 行の門が `node -e` の子プロセスで `test()` を撃つのと同じ手口が使える)。
- **AC-22 / NFR-01 は、閾値を走行の揺れより広く取り直すか、
  あるいは「全走の所要」ではなく「絞り込み経路の呼び出し回数」を裁く門に組み替えるべきである。**

---

## 5. 相の総括 —— どの門が本当に見張っているか

| 変異 | 標的 AC | 鳴った | 鳴かせた口 | 費用 |
|---|---|---|---|---|
| M-1 | 4907 行の門 / AC-10 | **✓** | 単一門走行 | 1 秒 |
| M-2 | AC-11 | **✓** | 絞り込み走行の exit | 1 秒 |
| M-3 | AC-13 / AC-14 | **✓** | 四連 grep | 2 秒 |
| M-4 | AC-16 | **✓** | **常駐の門** | 1 秒 |
| M-4b | AC-16(第二) | **✓** | **常駐の門** | 1 秒 |
| M-5 | AC-17 | **✓** | **常駐の門** | 1 秒 |
| M-6 | AC-07 / AC-08 | **✓** | `--gate-list` | 0.1 秒 |
| M-7 | AC-04 | **✓** | `--gate-list` | 0.1 秒 |
| M-8 | AC-18 | **✓** | 併走の工夫 | 1 秒 |
| M-9 | AC-12 | **✓** | `--gate-list` 併用 | 0.1 秒 |
| M-10 | AC-09 | **✓** | 単一門の `--gate-list` | 245 秒 |
| M-2b | AC-10 | **✓** | 絞り込み走行の exit | 1 秒 |
| M-11 | AC-02 | **✓** | 絞り込み走行 | 1 秒 |
| M-12 | AC-03 | **✓** | `--gate-list` | 0.1 秒 |
| M-13 | AC-06 | **✓** | 絞り込み走行 | 1 秒 |
| M-14 | AC-19 / AC-20 | **✓** | 文字列一致 + exit | 0.2 秒 |
| M-15 | AC-20 | **✓** | `--gate-list` | 0.1 秒 |
| M-16 | AC-05 | **✓** | `--gate-list` | 0.1 秒 |
| M-17 | AC-21 | **✓** | `git diff --quiet` | 1 秒 |
| M-18 | AC-01(代理) | **✓**(AC-07 の道で) | `--gate-list` | 0.1 秒 |
| **M-19** | **AC-22 / NFR-01** | **✗ 鳴らなかった** | 全走 | **365 秒** |

**21 本撃ち、20 本が鳴った。**

**この改革の成果物を、この相が自分で使った。**
21 本の変異のうち **17 本を 2 秒以内**で撃った。
絞り込みの口が無ければ、この 21 本は **21 × 6 分 = 2 時間 6 分**を要した。
**実際に払ったのは、全走 4 回(24 分)と、残り 17 本のための 1 分未満である。**

---

## 6. 作業ツリーの証明(壊した痕跡が一つも残っていないこと)

**`git commit` も `push` も一度も実行していない。** HEAD は build 相の `088996a` のまま:

```
$ git log --oneline -1
088996a 門の絞り込みの口 — 自己診断を名指しで走らせる (reform/gate-filter)
$ git branch --show-current
feat/gate-filter
```

**最終の `git status --porcelain`(実出力)**:

```
$ git status --porcelain
 M reform/gate-filter/conclave.json
?? reform/gate-filter/prove.md
```

**実装ファイルが一つも現れていないことの直接の証明**:

```
$ git diff --stat tests/paradise.test.js graph/census.js README.md
(空 —— 三つとも無傷)
```

**正直に書く: 掟は「`?? reform/gate-filter/prove.md` だけになること」を求めたが、実際は二行である。**
差の一行を説明する:

> **`M reform/gate-filter/conclave.json`** は **prove 相が入る前から在った差分**である
> (本相の最初の `git status --porcelain` が既に同じ一行だった)。
> **conclave の環が相の進行(build=done / prove=rework 等)を書き込んだもの**であり、
> **本相は一度も触っていない**。
> 掟の趣旨「commit 済みの実装が汚れていないこと」は、上の `git diff --stat` が満たしている。

**途中で 2 度、危うい瞬間があった。正直に記す**:

- **M-9 が全走 6 分に落ちて前景を切った。** その時点で `tests/paradise.test.js` に変異が残っていたが、
  **直後に `git status --porcelain` で検知し、`git checkout -- tests/paradise.test.js` で戻した**
  (これは AC-12 が禁じている振る舞いそのものが実際に起きたということでもある)。
- **M-12 の直後に `M graph/domains.json` が一瞬現れた。** 自己診断の走行が残した副作用であり、
  次の `git status` では消えていた(`git diff --stat graph/domains.json` は空)。**本相の変異とは無関係。**

---

## 7. verify 相への引き継ぎ

1. **AC-22 / NFR-01 の裁定**(build 相も持ち越した件)。本相はさらに事実を足す:
   **健全な実装で 360.2 / 364.5 / 364.8 秒と揺れる。閾値 362.4 秒はこの揺れの中にある。**
   閾値が雑音より狭い門は、**偽陽性と偽陰性を同時に持つ**。母数の議論(449 vs 451)以前の問題である。
2. **§4-c の網目** —— **20 本の AC が常駐の門を持たない。**
   本相が去れば、AC-11 / AC-13 / AC-14 は 1 文字の変異で沈黙する。
   これを門にするか、「手順として記録に留める」と明示的に決めるか、**verify が判ずること**。
3. **requirements.md の「静的解析なら 442」は実測 443 である**(§2)。主張は保たれるが数が違う。
4. **gauge 台帳の破損行**(build 相 §4-5 と同じもの)が AC-15 の走行でも再現した。**別件として起票すべきである。**
