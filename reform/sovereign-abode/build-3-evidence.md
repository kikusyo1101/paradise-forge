# 第3段 (work-3) 「見張りの建て替え」 — 証拠

改革: `reform/sovereign-abode` / ブランチ `reform/sovereign-abode-4`
満たすべき AC: AC-39〜AC-45, AC-19 / 直す対象: design.md §5 の 29 件のうち第3段の管轄分

**この文書は作業しながら逐次追記している。** 生のコマンド出力しか貼らない。

---

## 0. 着手前のベースライン(実測)

着手時の HEAD は `dc26f71`(第2段のマージ)。作業木はクリーン。

```console
$ node tests/guards.test.js
  ✓ the real machine enforces no unconditional BLOCK

Paradise guards self-test: 64 passed, 0 failed
EXIT=0
```

64 緑・0 skip に見えるが、**これは実機 `~/.claude/settings.json` が在るから**である。
`PARADISE_SETTINGS=/nonexistent` を立てれば 4 門が消える(design §5.0 の実測)。
第3段の仕事は「実機が在るかどうかに関わらず、mode=repo では不在を赤にする」ことである。

### 0.1 `--silent-green` は**存在しないのに緑を返していた**(第37条違反の現行犯)

```console
$ node graph/abode.js check --silent-green
═══ 🏠 ABODE CHECK (第58条) ═══
  · 除外 1 件: graph/abode.js (住所を作るのが職務 / 資格の裏付け: function resolve+function pathFor+function globalWrite+module.exports を輸出している / homedir 呼び出し 1 箇所)
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
═══════════════════════════════
EXIT=0
```

**`--silent-green` という旗を `abode.js` は一つも知らない。** `printCheck` は
`rest.includes('--count'|'--ledger'|'--exclusion')` の三つしか読まず、**知らない旗は
黙って捨て、旗が一つも立たなかったことにして `--all` を走らせ、0 を返していた。**
すなわち「検めていないものを、検めて違反が無かった(exit 0)」と答えていた。
これは第37条(不在は通過ではない)の正面違反であり、
`check-agents` の `skipped=true ok=true` と同じ形である。**第3段でまずこれを塞ぐ。**

### 0.2 「静かな緑」の実測(design 執筆時から行が動いているので採り直した)

```console
$ grep -nE "if \(\w+\.skipped\) return" tests/*.js
tests/counsel.test.js:189:  if (res.skipped) return;   // ハーネス未配置の環境では検査しない
tests/paradise.test.js:1440:  if (res.skipped) return; // ハーネス未配置の環境では検査しない
tests/paradise.test.js:1746:  if (r.skipped) return; // ハーネス未配置の環境では検査対象が無い
tests/paradise.test.js:2280:  if (r.skipped) return;                     // ハーネス未配置の環境では検めない
tests/paradise.test.js:2291:  if (r.skipped) return;
tests/paradise.test.js:2305:    if (r.skipped) return;

$ grep -nE "existsSync\([^)]*\)\) return" tests/*.js
tests/dashboard-links.test.js:89:  if (!fs.existsSync(atlasDir)) return;    // CI には生成物が無い。不在は違反ではない
tests/dashboard-no-deps.test.js:69:  if (!fs.existsSync(p)) return;
tests/paradise.test.js:3298:  if (!fs.existsSync(coinF) || !fs.existsSync(habitF)) return; // 他マシンでは沈黙 (第20条)
tests/paradise.test.js:5339:      { tag: 'E5', name: 'e5.js', mutate: s => ... }   ← 変異注入の文字列リテラル (実コードではない)
tests/paradise.test.js:5940:  if (!fs.existsSync(real)) return;   // 倉が無い機では沈黙 (第20条)
tests/paradise.test.js:6608:  if (!fs.existsSync(deployed)) return;      // 未配備なら問わない
tests/paradise.test.js:6650:  if (!fs.existsSync(jobs)) return;          // ハーネス不在の環境では問わない
```

合計 **13 件**(5339 の擬似コードを除く)。design §5.2.2 の 13 件と数が一致する。

### 0.3 第7段(密閉)は既に済んでいる — 実測で確かめた

```console
$ node graph/hermetic.js check
  ⚠️  tests/paradise.test.js:6487  fs.writeFileSync(d) — 出自を辿れない
  ⚠️  tests/paradise.test.js:7437  fs.writeFileSync(f) — 出自を辿れない
  ⚠️  tests/paradise.test.js:7441  fs.rmSync(f) — 出自を辿れない
  ✓ 版管理下の現物を走行中に書き換える門は無い — 同時に走っても答えは一つである
EXIT=0
```

L-26 / L-27 / L-28 / L-29 は work-7 で解決済み。**ただし `abode.js check --hermetic` の旗は
まだ存在しない**(0.1 と同じ病)。第3段で `hermetic.js` への委譲として建てる。

---

## 1. `abode.js` — 知らない旗を黙って捨てる病を塞ぎ、3 旗を建てた

### 1.1 未知の旗は exit 2(第37条 / §1.4 の三値)

```console
$ node graph/abode.js check --nonsense
✗ check の知らない旗: --nonsense — 知る旗は --count / --ledger / --exclusion / --silent-green / --symmetry / --hermetic / --all。知らない旗を黙って捨てて緑を返す門は、測らずに答えている(第37条)
EXIT=2
```

**ここが第3段の一番の急所だった。** 旗を知らないまま緑を返す門は、
他のどんな門を建てても「旗を打ち間違えた走行」を全部緑にしてしまう。

### 1.2 `--silent-green` の初回走行 — **12 件を名指して赤**

```console
$ node graph/abode.js check --silent-green
═══ 🏠 ABODE CHECK (第58条) ═══
  · 除外 1 件: graph/abode.js (…homedir 呼び出し 1 箇所)
✗ 黙って早期に return する門 (12 件) — skip() を使え
  tests/counsel.test.js:189  if (res.skipped) return;   // ハーネス未配置の環境では検査しない
  tests/dashboard-links.test.js:89  if (!fs.existsSync(atlasDir)) return;    // CI には生成物が無い。不在は違反ではない
  tests/dashboard-no-deps.test.js:69  if (!fs.existsSync(p)) return;
  tests/paradise.test.js:1440  if (res.skipped) return; // ハーネス未配置の環境では検査しない
  tests/paradise.test.js:1746  if (r.skipped) return; // ハーネス未配置の環境では検査対象が無い
  tests/paradise.test.js:2280  if (r.skipped) return;                     // ハーネス未配置の環境では検めない
  tests/paradise.test.js:2291  if (r.skipped) return;
  tests/paradise.test.js:2305  if (r.skipped) return;
  tests/paradise.test.js:3298  if (!fs.existsSync(coinF) || !fs.existsSync(habitF)) return; // 他マシンでは沈黙 (第20条)
  tests/paradise.test.js:5940  if (!fs.existsSync(real)) return;   // 倉が無い機では沈黙 (第20条)
  tests/paradise.test.js:6608  if (!fs.existsSync(deployed)) return;      // 未配備なら問わない
  tests/paradise.test.js:6650  if (!fs.existsSync(jobs)) return;          // ハーネス不在の環境では問わない
═══════════════════════════════
EXIT=1
```

**12 件は §0.2 の 13 件から `paradise.test.js:5339`(変異注入の文字列リテラル)を
引いた数と一致する。** 走査は `codeOnly()` を通しているので、
**病を説明した文字列に罰を与えていない**(design §5.2.2 の「除外」と同じ裁定)。
L-5〜L-17 の実体はこの 12 行である。

### 1.3 `--symmetry`(AC-20)/ `--hermetic`(L-29 への委譲)

```console
$ node graph/abode.js check --symmetry
  ✓ 門は黙って緑に落ちず、兄弟の engine は同じ口から住所を得ている
EXIT=0

$ node graph/abode.js check --hermetic
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
EXIT=0
```

`--hermetic` は **`graph/hermetic.js` の `audit()` への委譲**である。
同じ問いに二つの答えを持てば、いつか食い違う(第29条)——
作法を `abode.js` に書き写さない。偽の倉に対しては
`· skip: --hermetic は楽園の現物の倉でしか測れない` と**名乗って**飛ばす。

### 1.4 `exports --verify EX-1` の自動照合(AC-27)を実装した

work-0 はここを `throw unmeasurable('…第3段 (work-3 / AC-27) で実装する…')` と
**exit 2 で正直に置いていた**。第3段でその約束を果たした:

```console
$ node graph/abode.js exports --verify EX-1
EX-1  ~/.claude/settings.json#/permissions
  照合の道: node graph/apply-guards.js verify
  実機: C:\Users\kikus\.claude\settings.json
  permissions deny 9 / ask 1 / allow 5
  ✓ 輸出は実機で生きている — POLICY と完全一致
EXIT=0

$ node graph/abode.js exports --verify EX-2     ← 照合の道を持たない id
✗ EX-2 の自動照合はこの器が持たない — 照合の道は「node graph/abode.js check --creations」である。自分で走らせよ
EXIT=2
```

**exit 2 であって 0 ではない。** 「この器では検められない」を緑にすれば、
第5段で `--creations` を作り忘れても誰も気づかない。

### 1.5 実装中に踏んだ罠(記録に残す)

`verifyExport()` は `apply-guards.js` を遅延 require し、`apply-guards.js` は
先頭で `abode.js` を require する。**`module.exports` が CLI 起動ブロックより
後ろに在ったため、abode 自身が main のとき空の exports が兄弟に渡った**:

```console
$ node graph/abode.js exports --verify EX-1
✗ abode.pathFor is not a function
EXIT=3
```

処置: `module.exports` を `if (require.main === module)` の**前**へ移した。
**環になる require では、輸出は入口より先に立てる。**

---

## 2. `skip()` の移植と、静かな緑 12 件の根絶(L-5〜L-17 / AC-43)

### 2.1 移植先は 3 箇所だった

| 走行 | 移植したもの |
|---|---|
| `tests/paradise.test.js` | 絞り込み塊の**内側**に `skip()` と `skipped` を新設。集計行・恒等式の錠も改めた |
| `tests/_pulse-fixture.js` | `makeHarness()` に `settle()` を入れ、`skip` を輸出(dashboard-* 全 13 走行が共有する) |
| `tests/counsel.test.js` | 自前の `test()` に同じ形を入れた |

**罠は design.md §5.2.2 が名指ししていたとおりだった** —— 移植先は
`// >>> gate-filter: 絞り込み塊` の内側であり、門「gate-filter: 絞り込みは環境変数を
読まない」がこの塊に `process.env` が現れることを禁じている。
ゆえに **skip の理由は必ず引数で受け取る**形にした(環境を読んで理由を組み立てない)。

### 2.2 恒等式の錠を `matched = green + red + skipped` へ改めた

`paradise.test.js` の末尾には絞り込み機構から独立した錠が在る(reflect F-1 の処置)。
skip を足せば `matched = green + red` は破れる。**錠を外さず、右辺を正した**:

```js
if (GATE.active && !GATE.list && GATE.matched !== pass + fail + skipped) { … process.exit(2); }
```

**これは緩めたのではない。** skip は `fn()` を**呼んだ上で**「前提が無い」と名乗った門で
あり、`· <名> (skipped: <理由>)` として出力に現れる。錠が捕まえるのは
**呼ばれずに消えた門**であり、それは今も捕まる。
F-1 の門の側(`lock` の正規表現と総括行の読み口)も同時に改めた。

### 2.3 `門ヘルパー: test() の失敗が必ず数に載る` を三態へ広げた

この門は `test()` の本文を抜き出して子プロセスで走らせる、門の根である。
**skip が fail を食う変異**は新しい穴なので、子で緑・赤・skip を同時に撃つ形に広げた:

```js
assert.deepStrictEqual(got, { pass: 1, fail: 1, skipped: 1 }, …);
assert.ok(/\(skipped: /.test(String(res.stdout)), 'skip が理由を名乗っていない…');
```

### 2.4 住所を持っていた 3 門は**台帳と解決器**へ付け替えた

| ID | 門 | 付け替え |
|---|---|---|
| **L-5** | `conclave: 配備された道は正典と一致する` | `os.homedir()` → `abode.resolve().commands`。かつ **mode=repo なら不在を赤**(`assert.notStrictEqual(site.mode,'repo')`)、global のときだけ名乗って skip |
| **L-6** | `watchdog: 監視スクリプトは…配備された実物と一致する` | `os.homedir()` → `abode.exportRealPath('EXT-2')`。**住所は台帳が知っている** |
| **L-7** | `cron: 日次の発火は道を写経せず、道を指す` | 同上 `exportRealPath('EXT-1')`。2 段目の `if (!prompts.length) return` も skip 化 |

`exportRealPath()` の実測(台帳の `~` を解くのは abode ただ一つ):

```console
$ node -e "const a=require('./graph/abode.js');console.log(a.exportRealPath('EXT-1'),'|',a.exportRealPath('EXT-2'))"
C:\Users\kikus\AppData\Local\hermes\cron\jobs.json | C:\Users\kikus\AppData\Local\hermes\scripts\paradise-catchup.py
```

### 2.5 `--silent-green` が 12 件 → **0 件**

```console
$ node graph/abode.js check --silent-green
═══ 🏠 ABODE CHECK (第58条) ═══
  · 除外 1 件: graph/abode.js (…homedir 呼び出し 1 箇所)
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
  ✓ 門は黙って緑に落ちず、兄弟の engine は同じ口から住所を得ている
═══════════════════════════════
EXIT=0
```

**途中で自分が撃たれた**: 最初に書いた `skipReason()` は
`if (typeof r.skipped === 'string' …) return r.skipped.trim();` という形で、
**`--silent-green` に自分が名指された**。除外を作らず、**自分の書き方を変えた**
(`[r.skipped, r.note].find(…)`)。門が己の裁く形を使えば、いつか除外を作る羽目になる(第54条(d))。

### 2.6 skip が実際に数えられていることの実測

```console
$ node tests/dashboard-no-deps.test.js
dashboard-no-deps: 9 passed, 0 failed, 1 skipped     ← package.json 不在 (L-16)
$ node tests/dashboard-links.test.js
dashboard-links: 6 passed, 0 failed                  ← 手元には atlas が在るので skip 0 (L-17)
$ node tests/dashboard-count.test.js
dashboard-count: 15 passed, 0 failed
```

**`10 passed` が `9 passed + 1 skipped` に分かれた。** これが AC-43 の意味である ——
数は減っていない。**測っていなかった 1 件が、測っていないと名乗るようになった。**

---

## 3. guards 4 門の向け直しと、EX-1 を見る新しい目(L-4a〜d / AC-39〜42)

### 3.1 `requireSettings()` — 不在の裁きを mode に委ねる(AC-41)

4 門の `if (!fs.existsSync(G.SETTINGS)) skip('no ~/.claude/settings.json on this machine');` を
`requireSettings()` に差し替えた。**門を消さず、裁きを分けた**(第36条):

- `mode=repo` → **赤**。`<repo>/.claude/settings.json` は git 追跡の派生物であり、
  不在は「ハーネス不在」ではなく**派生物の欠損**である。直す命令まで名指す。
- `mode=global` → 理由を名乗って `skip()`。`N skipped` に数えられる。

住所は `G.SETTINGS`(engine が実際に読む道)で裁く —— **門は engine が見る物を見る**。

```console
$ PARADISE_SETTINGS=<存在しない道> PARADISE_ABODE=repo node tests/guards.test.js
Paradise guards self-test: 62 passed, 4 failed
EXIT=1                                   ← AC-41: skip に落ちず、赤くなる

$ PARADISE_SETTINGS=<存在しない道> PARADISE_ABODE=global node tests/guards.test.js
Paradise guards self-test: 62 passed, 0 failed, 4 skipped
                                         ← 外を向いたと名乗ったときだけ skip。しかも数に載る
```

### 3.2 AC-40 — 向け直した先でも**噛む**ことを故障注入で証した

`.claude/settings.json` の複製に、**永遠に発火しない matcher を 1 本**仕込んだ
(`tool == "Bash" && tool_input.command matches "git push"` — 公式仕様では死に matcher):

```console
$ PARADISE_SETTINGS=<死んだ matcher 入りの複製> node tests/guards.test.js
  ✗ the real settings.json has no dead and no overfiring matcher
  ✗ every matcher on the real machine is classifiable and hits at least one tool
  ✗ the law IS the machinery on the real machine — permissions present, no drift
Paradise guards self-test: 63 passed, 3 failed
EXIT=1
```

**現物は 1 バイトも触っていない**(複製に対して撃った / 第58条(c))。

### 3.3 AC-42 — 台帳 EX-1 を見る門を**新設**した(4 門の片翼)

4 門をリポジトリ内の住処へ向け直すと、**誰も実機を見なくなる**。
だが EX-1(`~/.claude/settings.json#/permissions`)は**意図してグローバルに残る輸出**
であり、その deny 9 件が守るのは神の全プロジェクトである。
**出所と守備範囲は別である。** ゆえに片翼を建てた:

```console
$ node tests/guards.test.js
輸出の腐食 (台帳 EX-1 / 第58条(b)):
  ✓ 台帳 EX-1 は実機で生きている (輸出の腐食を見張る / AC-42)
  ✓ 【逆】実機の deny が 1 行消えれば EX-1 の照合は赤になる (AC-28)

Paradise guards self-test: 66 passed, 0 failed
```

- **正の門**: `abode.verifyExport('EX-1')` が緑 + `deny 9 / ask 1 / allow 5`。
  実機が無い機(CI)では `skip(v.skipped)` で**名乗って**退く(黙って return しない)。
- **逆の門**: 実機の写しから deny を 1 行抜いた偽のホームを作り、
  `verifyExport('EX-1', { env: { USERPROFILE: fake, HOME: fake } })` で撃つ。
  **消えた行を名指すこと**まで主張する。**現物は触らない。**

### 3.4 work-3 の完了条件その1 — 達成

```console
$ node tests/guards.test.js
Paradise guards self-test: 66 passed, 0 failed
EXIT=0
```

`, N skipped` の綴りが**出ていない = 0 skipped**(guards.test.js は skip が 0 件の
ときこの節を印字しない)。ベースライン 64 → **66**(新設 2 門)。

### 3.5 神の資産は無傷

```console
$ node graph/abode.js exports --verify EX-1
  実機: C:\Users\kikus\.claude\settings.json
  permissions deny 9 / ask 1 / allow 5
  ✓ 輸出は実機で生きている — POLICY と完全一致
```

---

## 4. L-25 — `deploy.check` の上流依存を解いた(第19条(d) / CI で 5 門が空回りしていた)

第2段で `mode` を見る形にはなっていたが、**上流依存は残っていた**。実測(着手時):

```console
$ PARADISE_UPSTREAM=/nonexistent node -e "…deploy.check()…"
{"skipped":"mode=global (source=default) かつ 上流 /nonexistent が無い — …","ok":true,"checked":0,"drift":0}
   ↑ 配備先 C:\Users\kikus\.claude は実在するのに skip している
$ PARADISE_UPSTREAM=/nonexistent node tests/paradise.test.js --gate 'deploy:'
Paradise gate-filter: 5 of 469 gates matched — 4 green, 0 red, 1 skipped
```

**CI(clone 直後)には上流が無い。** ゆえに deploy 系の門は CI で常に空回りしていた。
`plan()` は上流無しでも **58 steps** を返す(実測)—— 照合に上流は要らない。
配備は `overlay/` から建つ。**上流はもはや供給元ではない**(第20条 / 第19条(d))。

処置: skip 条件から `!fs.existsSync(UP)` を外し、`check()` から `UP` の束縛ごと消した。

```console
$ PARADISE_UPSTREAM=/nonexistent node -e "…deploy.check()…"
{"skipped":false,"ok":true,"checked":60,"drift":0}         ← 上流が無くても 60 件照合する
$ PARADISE_UPSTREAM=/nonexistent node tests/paradise.test.js --gate 'deploy:'
Paradise gate-filter: 5 of 469 gates matched — 5 green, 0 red
```

**skip が 1 件 → 0 件。** 5 門が初めて実際に働くようになった(AC-45 の実質)。

---

## 5. L-2 — 門と engine で住所が割れていた(**実測で偽の赤を再現した**)

設計 §5.1 が予言していた病を、**現物で再現した**:

```console
$ PARADISE_ABODE=repo node tests/dashboard-count.test.js       ← 改革前 (git stash した HEAD)
  ✗ AC-17a/17b: counts.kgNodes / kgEdges == JSONL の解釈できた行数
      kgNodes が割れた   null !== 121
dashboard-count: 14 passed, 1 failed
```

**門は `os.homedir()` で `~/.claude/paradise-kg`(121 行)を見て、
断面は `<repo>/.claude/paradise-kg`(存在しない)を見ていた。**
しかも engine 側も割れていた —— `kg.js` / `export-state.js` は
`abode.pathFor('kg')`(= mode=repo では `<repo>/graph/kg-store`)を見るのに、
`pulse.js` だけが `claudeDir('paradise-kg')` を見ていた。**住所が三本に割れていた。**

処置は二箇所:

| 場所 | 前 | 後 |
|---|---|---|
| `graph/pulse.js`(2 箇所) | `process.env.PARADISE_KG \|\| claudeDir('paradise-kg')` | `abode.pathFor('kg')`(個別 env も内側で吸収する) |
| `tests/dashboard-count.test.js:91`(T1) | `process.env.PARADISE_KG \|\| path.join(os.homedir(), …)` | `abode.pathFor('kg')` |

```console
$ node -e "…pulse.snapshot()…"
{"agents":30,"commands":19,"kgNodes":121,"kgEdges":33,"errors":0}          ← global: 変わらず

$ PARADISE_ABODE=repo node -e "…pulse.snapshot()…"
repo: {"agents":30,"kgNodes":null,"errors":["counts.skills","counts.kgNodes","counts.kgEdges"]}
       ↑ 第4段の移設前なので kg-store は空。**0 で埋めず null + errors**(AC-19 の現状維持)

$ PARADISE_ABODE=global node tests/dashboard-count.test.js → dashboard-count: 15 passed, 0 failed
$ PARADISE_ABODE=repo   node tests/dashboard-count.test.js → dashboard-count: 15 passed, 0 failed
```

**両居で緑。** 門が engine と同じ解決器を使うようになったので、
第4段で KG を移設しても門は勝手についてくる。

---

## 6. L-18 — 「通り続けるが何も見ていない」門を住所ベースへ

`dashboard-no-deps.test.js` の `AC-17d` は **文字列 `.claude` を含む書き込み行**を
禁じていた。work-1 の付け替えで `claudeDir()` から `.claude` の literal が消えた結果、
**門は構文上は通り続けるが、何も見ていない**状態になっていた(静かな緑の最悪形)。

処置: 主張を**住所ベース**に改めた(`claudeDir(` / `abode.` / `.claude` のいずれかを
含む書き込み行を咎める)。かつ**門が痩せていないこと**(書き込みの行が 1 本以上在ること)
を同時に主張する —— 0 件の走査に対する 0 件の違反は、門ではない(第16条)。

```console
$ node tests/dashboard-no-deps.test.js
dashboard-no-deps: 9 passed, 0 failed, 1 skipped

$ (pulse.js の写しに `fs.writeFileSync(claudeDir('x.json'), '1')` を注入して走査)
注入後に名指された行数: 1 function rogue(){ fs.writeFileSync(claudeDir('x.json'), '1'); }
```

**撃てば鳴る。**

---

## 7. L-20 / L-23 / L-24 — 名の是正と、既に直っていた物の確認

| ID | 判定 | 証拠 |
|---|---|---|
| **L-20** | **直した**(名のみ) | 門の名を `…, not from ~/.claude` → `…, not from the deploy target` へ。中身は `s.src.includes('overlay')` を見るだけで、付け替え後も正しい。**名が住所を指していると、住処が移った日に「この門は古い」と誤読される** |
| **L-23** | **既に直っていた**(第1段) | `check-agents.js:214` に `const explicit = !!agentsDir;` が在り、`paradise.test.js:1476` の門「check-agents skips silently where no harness is installed」が生きている。`node tests/paradise.test.js --gate 'check-agents'` → 2 green, 0 red |
| **L-24** | **既に直っていた**(コミット 1a7d11b) | `deploy: check skips cleanly where no harness is installed` は `typeof r.skipped === 'boolean'` をやめ、**mode ごとの期待**(`skip したなら理由を名乗れ` / `mode=repo で skip は禁止`)を主張している |
| **L-22** | **手を触れていない(第6段の管轄)** | `wire-paradise-hooks.js` の廃止は work-6。順序は ①overlay.json の $note → ③ファイル削除 → ②免除解除 であり、**②を先にやれば門が赤くなる**。第3段で触れば掟を破る |
| **L-19** | **手を触れていない(第6段の管轄)** | `POLICY.deny` に `<repo>/.claude` の守りを足すのは work-6(design §7 の表が明記) |
| **L-26〜29** | **既に直っていた**(work-7) | §0.3 の `hermetic.js check` が exit 0。第3段では `abode.js check --hermetic` の**旗**を建て、委譲した |

---

## 8. 新設した門(第3段で建てた見張り)

| 走行 | 門 | 何を握るか |
|---|---|---|
| `guards.test.js` | `台帳 EX-1 は実機で生きている (AC-42)` | 実機 permissions が POLICY と一致 / deny 9・ask 1・allow 5 |
| `guards.test.js` | `【逆】実機の deny が 1 行消えれば…赤になる (AC-28)` | 偽ホームの複製で撃ち、消えた行を名指す |
| `abode.test.js` | `知らない旗は exit 2 (第37条)` | **知る旗を全て受け取れること**も同時に握る |
| `abode.test.js` | `check --silent-green は…exit 0 (AC-43)` | 黙った早期 return ゼロ |
| `abode.test.js` | `【逆】黙った return を 1 行戻せば行を名指して鳴る (AC-44)` | 偽の倉に仕込んで**実際に鳴らす**(行番号まで) |
| `abode.test.js` | `註釈と文字列の中の早期 return は数えない` | 病を説明した罰を与えない(除外ではなく走査の作法) |
| `abode.test.js` | `check --symmetry …(AC-20)` + 逆 | 兄弟 engine の式の同一性 |
| `abode.test.js` | `check --hermetic は hermetic.js へ委譲し…` | **作法を二重に書いていないこと**を機械が握る + 偽の倉では名乗って skip |
| `abode.test.js` | `exports --verify EX-1 …(AC-27)` / `照合の道を持たない輸出に 0 を返さない` | 未実装は緑ではない(exit 2) |
| `abode.test.js` | `exportRealPath は台帳の ~ を器だけが解く` | 解けない記法には null(推測で埋めない) |
| `dashboard-no-deps` | `AC-17d`(建て替え) | 住所ベース + 門が痩せていないこと |

```console
$ node tests/abode.test.js
Abode self-test: 55 passed, 0 failed          (work-1 の 45 → 55)
$ node tests/guards.test.js
Paradise guards self-test: 66 passed, 0 failed  (ベースライン 64 → 66)
```

---

## 9. 【踏み抜いた罠の記録】門が正しく鳴った — 緩めずに現実を直した

全走行の 1 本目で、**発令時に名指しされていた罠に正確に嵌った**:

```console
$ node tests/paradise.test.js
  ✗ gate-filter: 絞り込みは環境変数を読まない
      絞り込み塊が process.env を 1 箇所読んでいる — census が env を継承する以上これは第22条違反

Paradise self-test: 468 passed, 1 failed
```

### 9.1 真因 — **註釈が違反だった**

skip の実装は env を一切読んでいない(理由は必ず引数で受け取る形にした)。
にもかかわらず赤になったのは、**私が書いた docblock に禁じられた綴りを書いたから**である:

```js
 * ⚠️ **この関数は絞り込み塊の内側に住む。** 塊は `process.env` を一つも読めない
                                                     ^^^^^^^^^^^ ← これが 1 件目として数えられた
```

門は塊の中の綴りを数える(`block.match(/process\.env/g)`)のであって、構文木を歩かない。
**禁則は註釈にも及ぶ。** そして**それは門の欠陥ではない** —— この門は
`census.js` が env を丸ごと継承するという事実を守っており、
綴りの一致で裁くのは「塊に env の道を作らせない」という目的に対して正しい近似である。
門自身も同じ流儀を採っている(`'// >>>' + ' gate-filter…'` と分けて書き、
**自分が偽のマーカーにならないようにしている** — 8850 行の註釈がそう明言している)。

### 9.2 処置 — **門は一文字も触っていない**

直したのは**現実の側**、すなわち私の註釈である。綴りを書かずに名を呼ぶ形に改め、
**同じ罠を次の者が踏まないよう、その事実を註釈自身に残した**。

門の判定条件・除外リスト・正規表現・閾値は**一切触っていない**。
差分で確かめた(門の本文に触れる変更が無いこと):

```console
$ git diff tests/paradise.test.js | grep -E "^[-+].*(絞り込みは環境変数を読まない|hits\.length|block\.length|MS = |ME = )"
+ * (門「gate-filter: 絞り込みは環境変数を読まない」/ 第22条)。skip の理由は
   ↑ 私の docblock が門の名を引用している 1 行のみ。判定条件の差分はゼロ
```

```console
$ node tests/paradise.test.js --gate 'gate-filter'
Paradise gate-filter: 6 of 469 gates matched — 6 green, 0 red
```

### 9.3 教訓

**この赤は門が正しく働いた証拠である。**
「skip の実装で env を読むな」という掟を私は守った。だが掟の**射程**を読み違えた ——
機械が数えるのは意味ではなく綴りであり、**註釈は走らないが、走査はされる**。
`|| true` も除外リストも閾値の引き下げも使わず、赤の指す先(私の文章)を直した。

---

## 10. work-3 の完了条件 — 三つとも達成(全て生の出力)

### 10.1 `node tests/guards.test.js` が `N passed, 0 failed, 0 skipped`

```console
$ node tests/guards.test.js
Paradise guards self-test: 66 passed, 0 failed
EXIT=0
```

`, N skipped` の節は skip が在るときだけ印字される(`guards.test.js:756` の
`(skipped ? … : '')`)。**出ていない = 0 skipped** である。
ベースライン 64 → 66(新設した EX-1 の正逆 2 門)。

### 10.2 `node graph/abode.js check --silent-green` が exit 0

```console
$ node graph/abode.js check --silent-green
═══ 🏠 ABODE CHECK (第58条) ═══
  · 除外 1 件: graph/abode.js (住所を作るのが職務 / 資格の裏付け: function resolve+function pathFor+function globalWrite+module.exports を輸出している / homedir 呼び出し 1 箇所)
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
  ✓ 門は黙って緑に落ちず、兄弟の engine は同じ口から住所を得ている
═══════════════════════════════
EXIT=0
```

**この旗は第3段で建てた。** 着手時は旗そのものが存在せず、
黙って捨てられて exit 0 が返っていた(§0.1 / §1.1)。

### 10.3 全走行が両 mode で緑(AC-53)

```console
$ PARADISE_ABODE=global node tests/paradise.test.js
Paradise self-test: 469 passed, 0 failed
GLOBAL_EXIT=0

$ PARADISE_ABODE=repo node tests/paradise.test.js
Paradise self-test: 469 passed, 0 failed
REPO_EXIT=0
```

### 10.4 その他の門

```console
$ node graph/census.js check
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
CENSUS_EXIT=0

$ node graph/wiring.js check
  engine 38 / 内の辺 72
  ✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い
WIRING_EXIT=0

$ node graph/codex.js check
  ✓ 索引は本文と一致している (58 条)

$ node graph/hermetic.js check    → HERMETIC_EXIT=0
$ node graph/workspace.js check   → WORKSPACE_EXIT=0
$ node graph/derived.js check     → no test depends on derived content
```

**README の数は手で書いていない**(第22条)。`census.js check` が緑であることが、
`469/469` が測定と一致している証拠である(新設した門は `abode.test.js` と
`guards.test.js` の別集計に載るので、`paradise.test.js` の 469 は動かない)。

### 10.5 神の資産は無傷

```console
$ node graph/abode.js exports --verify EX-1
  permissions deny 9 / ask 1 / allow 5
  ✓ 輸出は実機で生きている — POLICY と完全一致

$ node graph/apply-guards.js verify
  ✓ env に展開されないシェル変数参照は無い
  🩺 hook 13 本 — …
```

`DEFAULT_MODE` は `'global'` のまま(反転は第4段)。`~/.claude` へは 1 バイトも書いていない。

---

## 11. 改変したファイル

| ファイル | 何を |
|---|---|
| `graph/abode.js` | 未知の旗を exit 2 / `--silent-green` `--symmetry` `--hermetic` の実装 / `verifyExport` `exportRealPath`(AC-27)/ `module.exports` を CLI より前へ |
| `graph/deploy.js` | `check()` の上流依存を解除(L-25) |
| `graph/pulse.js` | KG の住所を `abode.pathFor('kg')` へ(2 箇所 / L-2) |
| `tests/paradise.test.js` | `skip()` 移植・`skipReason()`・恒等式の錠・門ヘルパーの三態化・L-5/6/7/14/15/20 |
| `tests/guards.test.js` | `requireSettings()`(L-4a〜d / AC-41)・EX-1 の正逆 2 門(AC-42 / AC-28) |
| `tests/abode.test.js` | 新設 10 門(旗の作法 / AC-43 / AC-44 / AC-20 / --hermetic / AC-27) |
| `tests/_pulse-fixture.js` | `makeHarness` に skip 機構(dashboard-* 13 走行が共有) |
| `tests/counsel.test.js` | skip 機構 + L-13 |
| `tests/dashboard-count.test.js` | KG の住所を解決器へ(T1 / L-2) |
| `tests/dashboard-no-deps.test.js` | AC-17d を住所ベースへ(L-18)・L-16 |
| `tests/dashboard-links.test.js` | L-17 |

**`graph/abode.json`(台帳)は 1 行も触っていない** —— 台帳の変更は神の名指しが要る(第58条(b))。
`CONSTITUTION.md` も触っていない(第3段に新条は不要)。

---

## 12. やり残したこと・正直な申告

1. **L-19 / L-22 は手を触れていない。** design §7 の表が **work-6(第6段)の管轄**と
   定めているためである。特に L-22(`wire-paradise-hooks.js` の免除解除)は
   **順序が守り**であり(①$note → ③削除 → ②免除解除)、第3段で②だけ先にやれば
   門を先に緩めることになる。
2. **AC-45 の「23 門」という数は確かめていない。** design の絞り込み式
   (`'deploy|conclave: 配備|check-agents|seat|配備'`)は現在 23 門に当たらない
   (門の名が改革の過程で動いたため)。代わりに `--gate 'deploy:'` の 5 門が
   **上流を潰しても空回りしなくなったこと**(§4)で実質を示した。
   **数を合わせるために式をいじることはしなかった** —— 数は目的ではない。
3. **`counsel.test.js` は 2 門が赤いままである。これは私の変更とは無関係である。**
   着手前の HEAD(`git stash` して実測)でも同じ 2 門が赤い:
   `枢機卿 counsel が存在し、6相すべてを統べる` /
   `相ごとに相応しい神官が指揮される`(`auditor` を期待して `requirements-analyst` が来る)。
   **この走行は CI(tribunal.yml)からも `paradise.test.js` からも呼ばれていない**
   (実測: `grep -rn "counsel.test" .github tests graph README.md` → 0 件)。
   すなわち**誰にも呼ばれない門が、既に赤いまま住んでいる**。
   第44条(呼ぶ者の居ない道具)の観点で扱うべき事象だが、**第3段の管轄ではないので
   直していない。** 教主へ申し送る。
4. **`--creations` は作っていない**(第5段 / work-5 の管轄)。
   `exports --verify EX-2` は exit 2 で「この器では検められない」と正直に答える。
5. **`check --hermetic` は `hermetic.js` への委譲である。** 偽の倉に対しては
   名乗って skip するが、**`audit()` の中身そのものは第3段で検め直していない**
   (work-7 が既に門を持っているため二重に書かなかった)。
6. **mode=repo の `counts.skills` / `counts.kgNodes` は null である。** これは欠陥では
   なく事実である(deploy は skills を配備せず、KG の移設は第4段)。
   design §3.3 の裁定どおり **0 で埋めず null + errors** を返している。
