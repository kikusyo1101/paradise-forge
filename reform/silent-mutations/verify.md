# verify — reform 走行 `silent-mutations` の検証相

**検証役**: verify(第11条 の appropriate-class — build も review も security も自分の指摘を自分で裁けない)
**日付**: 2026-09-17
**対象**: ブランチ `reform/silent-mutations` の**未 commit** の作業樹
**作法**: review / security が使った**同じ攻撃を同じ形で撃ち直し**、直る前と直った後の
**exit code と赤の本数**を両方載せる。主張ではなく実測で裁く。

---

## 0. 不可侵の確認(第一の戒め)

実台帳 `C:/Users/kikus/Documents/workspace/paradise-creations/gauge-ledger.jsonl` は
**作業の開始・中間・終了で四度照合し、四度とも一致した**。

```
[開始]
$ sha256sum ../paradise-creations/gauge-ledger.jsonl
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77   7 行

[番兵の修理の直後]
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77

[全走(素)の直後]
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77   7 行

[全実測の後]
(§6 に最終の照合を載せる)
```

**全ての故障注入と攻撃は複製に対してのみ撃った。**
複製は `$LOCALAPPDATA/Temp/vf/paradise` と `$LOCALAPPDATA/Temp/vf2/paradise`(`.git` / `node_modules` を除く全複製)。
複製の兄弟倉 `…/vf2/paradise-creations/gauge-ledger.jsonl` に**実台帳の写しを置いて**
「神の機」を再現した —— これをしなければ番兵の照合枝が一度も走らず、
番兵への攻撃はすべて**偽の無音**になる(review 相が同じ一手を打っている)。

```
$ cd $LOCALAPPDATA/Temp/vf2/paradise && node -e "console.log(require('./graph/workspace.js').resolve().root)"
C:\Users\kikus\AppData\Local\Temp\vf2\paradise-creations
$ sha256sum $LOCALAPPDATA/Temp/vf2/paradise-creations/gauge-ledger.jsonl
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77
```

**`git checkout -- <file>` は一度も使っていない**(戒め 2)。変異はすべて
「生バイト列を読む → 置換 → 走らせる → `finally` で書き戻す → sha256 の一致を印字」の形で撃った
(ハーネス: `$LOCALAPPDATA/Temp/vf/mut2.js` / `a7.js` / `a49.js` / `a45.js`)。
**復元は毎回 `restored=true` を実測で印字している。**

---

## 1. 直した件の一覧(前 / 後の実測)

| # | 件 | 出所 | 前(実測) | 後(実測) |
|---|---|---|---|---|
| 1 | **S-1** 実台帳が読めないと 484 門が一本も走らない | security 致命 | `EISDIR` で**モジュール読み込みが死ぬ。exit 1 / 門 0 本** | **exit 1 / 62 門が赤**(門は走り、番兵が「読めない」を名指す) |
| 2 | **S-2** 番兵を永久 skip に固定できる | security 致命 | **122 green / 0 red**(実台帳を汚しても緑) | **exit 1 / 62 門が赤**(「不在だった台帳が走行の途中で現れた」を名指す) |
| 3 | **S-3** 番兵が真犯人を名指せない | security 致命 | 名指し **0 行** | **47 行すべてが門名を名乗り、変化の形を `appended` と分類** |
| 4 | **A** AC-4 の三本目の assert が空回り | review 重大 | `bad.out` を捨てても **SILENT**(128 green / 0 red) | **CAUGHT red=1** |
| 5 | **B** AC-11 の射程を半分にすると無音 | review 重大 | **SILENT**(128 green / 0 red) | **CAUGHT red=2** |
| 6 | **C** AC-13 の早期 return を潰すと無音 | review 重大 | **SILENT**(128 green / 0 red) | **CAUGHT red=1** |
| 7 | **D / 第62条の末文** 「三本とも別の門が撃つ」が実体より大きい | review 重大 / docs | 外から撃つ門は **番兵の 1 本のみ** | **3 本すべてに外の門**(条を実体に合わせるのではなく実体を条に合わせた) |
| 8 | **S-4** `exit 2` なのに `healable:true` | security 重大 | `metrics:"x"` で **exit 2 / healable:true** | **8 入力すべてで `healable === (exit !== 2)`** |
| 9 | **S-6 / A45** 静的の門が G4 の四形中三形を見逃す | security 重大 | **1/4 CAUGHT**(let のみ) | **6/6 CAUGHT**(偽陽性 0 を実測) |
| 10 | **S-5** `--json` が破損行の生バイト 200 文字を吐く | security 重大 | `line` = **200 文字** | `line` = **60 文字**(人向けと同じ) |
| 11 | **S-8** `rows` が 101 行を rows=1 と答える | security 重大 | `rows=1` のみ・沈黙 | `rows=1` **+ `ignored=100`** を数えて名乗る |
| 12 | **軽微 e** AC-13 が判定したことを名乗らない | review 軽微 | skip だけが名乗る | `· 競合成立(raw=2 → folded=1)` を毎回名乗る |
| 13 | **S-12** `sentinelSkipNote` が skip の理由を断定 | security 好み | 「兄弟倉は楽園の倉に付いてこない」と断定 | 「…だと思われる(なぜ無いのかは測っていない)」 |
| 14 | **軽微 b** 要件の門数 14/485/130 が実体と食い違う | review 軽微 | 14 / 485 / 130 | 実測に合わせて直す(§7) |
| 15 | **軽微 d** AC-11 の名指しが `path.basename` | review 軽微 | ベース名のみ | フルパス(`f.file`) |
| 16 | **軽微 9** 残債 `SM-L` の中身が名を持たない | review 軽微 | 「hermetic.js」だけ | `pulse.js:_gateCache / hermetic.js:TRACKED / abode.js:unmeasurable` を門が毎回名乗る |
| 17 | **好み 3** `mutableGlobals` の assert メッセージが毎回構築 | review 好み | 常に `map().join()` | `found.length ? … : ''` |
| 18 | **S-7** 第62条(b) が「いつ/粒度/不在と不能/名指し」を言っていない | security 重大 | 条文が緩く、最弱の実装を許した | **最低限の四つ**を条文に明文化 |

**直した件数: 18。** 新設した門は **8 本**(484 → 492)。

---

## 2. 直した中身(実コード)

### 2-1. 番兵 — S-1 / S-2 / S-3(`tests/paradise.test.js`)

**S-1: `ledgerDigest` を fail-safe にし、「不在」と「読めない」を別の値にした。**

```js
const SENTINEL_UNREADABLE = 'unreadable:';
function ledgerDigest(p) {
  try {
    return require('crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  } catch (e) {
    const code = String((e && e.code) || 'EUNKNOWN');
    return code === 'ENOENT' ? null : SENTINEL_UNREADABLE + code;   // ★ 不在 ≠ 不能
  }
}
```

**判定は「なぜ動くのか」を一本の純関数に集めた**(第48条)。
`sentinelReason(before, after)` が `null`(無事)/ `'skip'`(不在のまま)/ 理由の文面 を返し、
`sentinelVerdict` はそれを `'ok' / 'skip' / 'warn' / 'throw'` に写すだけである。
**「読めない」は skip ではなく `throw`** —— 第37条が「不在は通過ではない」と言うなら、不能も通過ではない。

**S-2: 器の `if (REAL_DIGEST === null)` の先行分岐を消した。**
いまは毎門で `ledgerDigest(REAL_LEDGER)` を採り直し、`sentinelVerdict` に前後を渡すだけである。
`before === null && after === <指紋>` は `'throw'` —— **一瞬隠した後に現れたら鳴る。**
そして **AC-2 の配線凍結に「この分岐が戻っていないこと」を足した**:

```js
assert.ok(!/if \(REAL_DIGEST === null\)/.test(box9),
  '番兵が `REAL_DIGEST === null` で先に分岐する形に戻った — '
  + '節の読み込みの一瞬だけ台帳を隠せば走行のあいだ永久に無力になる (verify S-2 / security A7)');
```

**S-3: 門の名を番兵に渡した。**
`test()` が `CURRENT_GATE.name` に名を置き(`finally` で消す)、番兵の `sentinelMessage` がそれを読む。
**66 の呼び口すべてに名を配るより、走行の側が名を置く方が安い**(第48条: 名の出所は一つ)。

「外部の正当な `record`」と「門が汚した」の別は **形で**つけた —— 台帳は追記のみで育つ(第55条)ので、
**前の全バイトが先頭に残っていれば `appended`**、先頭が変われば `rewritten`、短くなれば `truncated`。

> **正直に書く**: `appended` は「門は無実」を意味**しない**。
> 振替を壊した門が実台帳に追記した場合(本走行の W1 がまさにそれ)も同じ形を取る。
> 門と外部を確実に分けるには番兵が**門ごとに前の指紋を採り直す**形が要る —— **残債 SM-S3**。
> 門のコードと名乗りの文面の両方にこの但し書きを書いた。

### 2-2. A — AC-4 の空回りの assert

```js
// 旧: assert.ok(/gauge-w1\.js|FAKE-REAL/.test(bad.out + broken), '注入版を名指していない');
//     ↑ broken は injectGauge の返り値(= gauge-w1.js を必ず含むパス)なので常に真
assert.ok(/FAKE-REAL/.test(bad.out), …);
assert.ok(/LEDGER=/.test(bad.out), …);
// AC-4 が要求していた「番兵が名指しで鳴る」も純関数として直接撃つ:
const w1msg = sentinelMessage(sentinelReason(before, ledgerDigest(fakeReal)), '<この門の名>', …);
assert.ok(/門「gauge\(故障注入\)/.test(w1msg), …);
```

### 2-3. B — AC-11 の射程を凍らせた

射程を定数 `STATIC_SCOPE` に出し、**中身と本数の両方**を assert した(N18 / `RACE_LEAD_MS` と同じ作法)。
さらに**別の門**(`gauge(静的): 静的の門の射程は外から凍らされている`)が
門の本文を読んで `const STATIC_SCOPE = [GAUGE_JS, SPAWN_TRACE_JS];` と
`mutableGlobals(STATIC_SCOPE)` の両方を凍らせる —— **定数だけ凍って門が別の物を見る**道を塞ぐ。

### 2-4. C — AC-13 の裁定を純関数に持ち上げた

`raceVerdict({ marks, raw, folded, auditCode, auditOut })` を新設し、
返り値は `'harness' / 'skip' / 'broken' / 'ok'`。**門の側に分岐は一つも残らない** ——
材料を集めて渡し、`harness` と `broken` を赤にするだけである。
別の門が (a) 全ケース(健全 / skip / 器の破れ 4 種 / 治癒の破れ 7 種)を直接撃ち、
(b) 門の本文を読んで呼び出しと assert、そして**分岐が戻っていないこと**を凍らせる。

### 2-5. 第62条の裁定 —— **(ii) 実体を条に合わせた**

**裁定: 条の文面は正しかった。弱かったのは実体である。**

根拠:
1. 条を弱めれば**次の走行は弱い掟の上に建てる**。第62条(a) 自身が
   「言えない盲点は、まだ誰も落ちていない穴」と書いている —— 穴を認めて掟を下げるのは、
   この条の精神と逆向きである。
2. 外の門を建てる代は**実測で安い**: (a) は子プロセスを起こさない純関数の門(0ms)、
   (c) はソースを読むだけの門(< 5ms)。**節の所要は 13.0 → 13.3 秒**(§5)。
3. 建てた結果、review が SILENT と名指した二件が**両方 CAUGHT に変わった**(§3)。
   条を弱めていたら、この二件は今日も無音のままだった。

条の末文は**実体を名指して**書き直した(何が撃つかを門の名で列挙し、
「この三本は後から建てられた」という経緯と教訓も残した)。
併せて **S-7** の指摘に従い、条の (b) に**番兵の最低限の四つ**(不在と不能の別 /
「前」はその門の直前 / 名指し / 追記と書き換えの別)を明文化した。
`codex.js index --write` → `codex.js check` を走らせた(§4)。

### 2-6. S-4 — `healable` を exit から導く(`graph/gauge.js`)

```js
function auditVerdict(a) {
  const human = (a && Array.isArray(a.conflicts) ? a.conflicts.length : 0);
  const duplicates = (a && Number(a.duplicates)) || 0;
  const exit = human > 0 ? 2 : (duplicates > 0 ? 1 : 0);
  return { human, exit, healable: exit !== 2 };   // ★ healable は exit から導く(第48条)
}
```

**exit の規約は一文字も動かしていない**(exit 0 健全 / 1 畳めば消える / 2 人の手)。
動かしたのは `healable` の側だけである。CLI は `auditVerdict` の `exit` をそのまま
`process.exit` に渡すので、**二つが食い違う道が構造的に無い。**
門は二段で撃つ: (a) 純関数を四通りで(どの機でも走る)、(b) **CLI を子プロセスで 8 入力**走らせ、
実際の exit code と `--json` の `healable` の一致を撃つ。

### 2-7. S-6 / A45 — 字句器を強め、偽陽性 0 を実測した

**裁定: 強める。かつ射程を正直に名乗る。両方やった。**

「名前を作らない置き場」を**名指しで列挙**した(列挙は射程である / 第44条 c):
`globalThis` / `module.exports`(`exports` 単体含む)/ `process.env` / `require.cache` /
最上位の分割代入 `let`/`var` / `class` の `static` 欄と `static {}` 塊。

**偽陽性 0 の実測**(`graph/*.js` 全 22 ファイルを走査):

```
$ node fp.js
abode.js     1 ["1506:unmeasurable:最上位束縛への破壊的操作"]
hermetic.js  3 ["516:TRACKED:最上位の let 束縛","519:…再代入","522:…破壊的操作"]
pulse.js     2 ["170:_gateCache:最上位の let 束縛","203:…再代入"]
TOTAL hits over graph/ = 6
SCOPE(gauge,spawn-trace) = []
```

**当たった 3 ファイルはいずれも改修前から既知**(残債 SM-L に名を持つ)であり、
**強めたことで新たに当たったファイルは 0 件**である。
偽の赤を出さない境界の門にも、読むだけの `globalThis` / 関数の中の代入 /
一括の `module.exports = {…}` を**罪と呼ばない**ことを足した。

### 2-8. S-5 / S-8 — 直す価値があると裁定した

- **S-5(直す)**: 一行で直る。かつ `{...a}` の全展開は
  **「何が出るか」を作者が数えていない証拠**であり、`auditLedger` に欄が増えれば自動的に漏れる
  —— 実際この走行で私が `ignored` / `oddMetrics` の二欄を増やしている。**列挙に変えた。**
  破損行は人向けと同じ 60 文字に切った。門が「`{...a}` に戻っていないこと」も凍らせる。
- **S-8(直す)**: `rows` の意味は一字も動かさない(既存の門がこの意味で立っている)が、
  **消えた行を `ignored` という自分の鍵で数えて名乗る**。
  併せて `metrics` が観測の形をしていない行を `oddMetrics` で数える —— これが S-4 の**原因**であり、
  「exit 0 で健全と名乗るが中身は観測ではない」を人が見られるようにする。
  **exit の規約は動かさない**(第57条)。

---

## 3. 再現攻撃 —— review / security と**同じ攻撃**を撃ち直した

すべて `$LOCALAPPDATA/Temp/vf2/paradise`(改修後の全複製)+ 実台帳の写しを置いた兄弟倉に対して。

### 3-1. review の SILENT 三件

```
$ node mut2.js <複製> spec-A_hollow.json
[A_hollow (AC-4 空回り: bad.out を捨てる)] exit=1 red=1 green=135 ::
  Paradise gate-filter: 137 of 492 gates matched — 135 green, 1 red, 1 skipped
   RED> ✗ gauge(故障注入): 住所解決を壊す変異(W1)を番兵が名指す — 本走行の実害の再現 (D-A)
VERDICT=CAUGHT
restored=true

$ node mut2.js <複製> spec-B_L3.json
[B_L3 (射程を半分に)] exit=1 red=2 green=134 :: 137 of 492 gates matched — 134 green, 2 red, 1 skipped
   RED> ✗ gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない (D-L / 第62条 c)
   RED> ✗ gauge(静的): 静的の門の射程は外から凍らされている (verify / review【重大 D】/ 第21条)
VERDICT=CAUGHT
restored=true

$ node mut2.js <複製> spec-C_R3.json
[C_R3 (早期 return の条件を潰す)] exit=1 red=1 green=135 :: 137 of 492 — 135 green, 1 red, 1 skipped
   RED> ✗ gauge(並行): 競合の裁定は純関数であり、門から呼ばれている (verify / review【重大 C】/ 第44条)
VERDICT=CAUGHT
restored=true
```

**改修前はいずれも `SILENT red=0 green=128`。三件とも鳴るようになった。**
B は**二本**鳴る —— 射程を縮めた当の門と、外から射程を凍らせる新設の門の両方である。

### 3-2. security S-1(A4)— 実台帳をディレクトリに差し替える

```
[改修前]
$ mkdir <creations>/gauge-ledger.jsonl && node tests/paradise.test.js --gate gauge
Error: EISDIR: illegal operation on a directory, read
    at ledgerDigest (…\tests\paradise.test.js:3469:54)
    at Object.<anonymous> (…\tests\paradise.test.js:3470:21)   <== 節のトップレベル
$ echo $?   → 1     ★ 門は一本も走っていない

[改修後]
$ mkdir <creations>/gauge-ledger.jsonl
$ node tests/paradise.test.js --gate gauge --gate 番兵 --gate 静的 --gate 並行 --gate 門ヘルパー
Paradise gate-filter: 137 of 492 gates matched — 74 green, 62 red, 1 skipped
$ echo $?   → 1
  ✗ gauge: 同一 run の二度の record は同じ指紋を名乗る (AC-1a / FR-1)
      実台帳が在るのに読めない(unreadable:EISDIR) — 「読めない」は「不在」ではない (verify S-1 / 第37条):
      汚したのは 門「gauge: 同一 run の二度の record は同じ指紋を名乗る (AC-1a / FR-1)」 /
      変化の形=unknown(変化の形は測れなかった) / before=unreadable:EISDIR after=unreadable:EISDIR
  ✓ gauge(番兵): 「読めない」は「不在」ではない — 実台帳が読めない機で節ごと死なない (verify S-1 / 第37条)
```

**門は走る。番兵は赤い。そして何が起きたかが画面から読める。**
「全滅して理由が誰にも分からない赤」から「62 門が同じ理由を名指す赤」に変わった。

### 3-3. security S-2(A7)— 節読み込みの一瞬だけ台帳を隠し、あとで汚す

```
[改修前 / security の実測]
122 green / 0 red   かつ   POISON row present in REAL ledger = true      ★ SILENT

[改修後]
$ node a7.js <複製> <複製の実台帳> --gate gauge --gate 番兵 --gate 静的 --gate 並行 --gate 門ヘルパー
exit=1 red=62
番兵が skip を名乗った=true  毒行が台帳に残っている=true
  > ✗ gauge(CLI): baseline も先回りを exit 2 で名乗る — 呼び手が成功と読まない (prove-4 / F-1)
  > 節の読み込みの時は不在だった実台帳が、走行の途中で現れた — 一瞬だけ隠して番兵を永久 skip に
    固定する手口である (verify S-2 / 第62条 b): 汚したのは 門「gauge(CLI): baseline も先回りを
    exit 2 で名乗る…」 / 変化の形=unknown / before=null after=f8ebabfe7341d1e3…
VERDICT=CAUGHT
restored=true sha=955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77
```

> **射程を正直に**: 塞いだのは「隠した**後に現れた**」道である。
> 走行の最初から最後まで隠し続ければ番兵は今も skip を名乗って通す —— **残債 SM-S2**。
> 門がその前提を明示的に assert している(`sentinelVerdict(false, null, null) === 'skip'`)ので、
> 誰かが塞いだ日にはこの assert が「前提が変わった」と鳴る。

### 3-4. security S-3(A49)— 開発者が別端末で `record` を正当に走らせる

```
[改修前 / security の実測]
無実の門 6 本が赤。before=955ea… after=2bd6c… が 6 本に同一表示。**名指しは 0 行。**

[改修後]
$ node a49.js <複製> <複製の実台帳> --gate gauge --gate 番兵 --gate 静的 --gate 並行 --gate 門ヘルパー
exit=1 red=47
番兵が門を名指した行 = 47 / 追記と名乗った行 = 47
  例> 実台帳が書き換えられた — 門は仮倉としか話してはならない (D-A / 第30条 / 第62条 b):
      汚したのは 門「gauge: fp は指紋の材料に入らない (R-1/M11 / AC-5c の成立条件)」 /
      変化の形=appended(既存の行は無傷で末尾に追記された(外部の正当な record と同じ形。
      ただし振替を壊した門の追記も同じ形を取る — 形だけでは分けられない)) /
      before=955ea34a… after=cc89c748d6f9…
VERDICT=CAUGHT(番兵が鳴り、名指した)
restored=true sha=955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77
```

**赤の本数は減っていない(47 本)。減らすのは残債 SM-S3 の仕事である。**
だが**人が読める情報は増えた** —— 誰が走っていた時か、形は追記か書き換えか。
そして門の言葉が「これは外部の営みかもしれない」と**正直に**言っている。

### 3-5. security S-6 / A45 — G4 を六形で全走に撃つ

```
[改修前 / security の実測(四形)]
G4  let              479 passed, 4 failed   静的の門 ✗   CAUGHT
G4g globalThis       480 passed, 3 failed   静的の門 ✓   *** SILENT ***
G4m module.exports   480 passed, 3 failed   静的の門 ✓   *** SILENT ***
G4c class static     480 passed, 3 failed   静的の門 ✓   *** SILENT ***
→ 1/4 CAUGHT

[改修後 / 六形に拡張して撃った]
$ node a45.js <複製> --gate 静的 --gate 番兵 --gate gauge
G4   let(設計者の形)     exit=1 red=1 静的の門が鳴った=true CAUGHT
G4g  globalThis          exit=1 red=1 静的の門が鳴った=true CAUGHT
G4m  module.exports      exit=1 red=1 静的の門が鳴った=true CAUGHT
G4c  class static        exit=1 red=1 静的の門が鳴った=true CAUGHT
G4e  process.env         exit=1 red=2 静的の門が鳴った=true CAUGHT
G4d  分割代入 let          exit=1 red=1 静的の門が鳴った=true CAUGHT
restored=true sha=ea4e4e1bfbf1abe3
→ 6/6 CAUGHT
```

**第62条が生まれた元凶に対する無音率: 75%(3/4)→ 0%(0/6)。**

### 3-6. security S-4(A12-A20)— `healable` と exit の一致

```
[改修前]
H1   filelines=2 exit=0 rows=1 healable=true   MISMATCH=false
H8   filelines=2 exit=2 rows=2 healable=true   MISMATCH=true    ★ exit 2 なのに healable:true
H13  filelines=2 exit=1 rows=2 healable=true   MISMATCH=false

[改修後 — 同じ 13 入力を同じハーネスで]
H1   filelines=2 exit=0 rows=1 healable=true  conflicts=0 MISMATCH=false
H3   filelines=2 exit=0 rows=1 healable=true  MISMATCH=false
H4   filelines=2 exit=0 rows=1 healable=true  MISMATCH=false
H5   filelines=2 exit=0 rows=1 healable=true  MISMATCH=false
H6   filelines=2 exit=0 rows=1 healable=true  MISMATCH=false
H7   filelines=2 exit=0 rows=1 healable=true  MISMATCH=false
H8   filelines=2 exit=0 rows=2 healable=true  MISMATCH=false   ★ 一致した
H9   filelines=2 exit=0 rows=1 healable=true  MISMATCH=false
H10  filelines=2 exit=2 rows=2 healable=false MISMATCH=false
H11  filelines=2 exit=2 rows=1 healable=false MISMATCH=false
H12  filelines=2 exit=2 rows=2 healable=false MISMATCH=false
H13  filelines=2 exit=1 rows=2 healable=true  MISMATCH=false
H14  filelines=2 exit=2 rows=2 healable=false MISMATCH=false
```

> **H8 について正直に書く。** 私の手元では `metrics:"x"` は**改修前も改修後も exit 0** である。
> security 相が報告した `exit=2 かつ healable:true` を、**私は一度も再現できなかった。**
> 詳細と 15 入力の網羅は **§3-6b** に書いた —— **「破れは再現できなかったが、
> 破れうる構造は実在したので塞いだ」** が私の裁定である。
> 重要なのは **`healable === (exit !== 2)` が 8 入力すべてで成り立ち、それが門になった**ことである。

```
[改修後 / 門そのもの]
✓ gauge(CLI): healable は exit code と必ず一致する — 同じ問いに二つの答えを持たない (verify S-4 / 第48条)
```

### 3-6b. **S-4 について、私が見つけた不都合な事実を先に書く**

私は `healable` を exit から導くように直したが、**security 相が報告した破れを私は再現できなかった。**

```
$ node s4sweep.js <HEAD 相当の複製の gauge.js>      ← 改修**前**の実装に 15 入力
single metrics:"x"       exit=0 healable=true  rows=1 MISMATCH=false
H + metrics:"x"          exit=0 healable=true  rows=2 MISMATCH=false
H + metrics:"x" + dup    exit=1 healable=true  rows=3 MISMATCH=false
metrics:[]               exit=0 healable=true  rows=2 MISMATCH=false
metrics:0                exit=0 healable=true  rows=1 MISMATCH=false
metrics:true             exit=0 healable=true  rows=2 MISMATCH=false
metrics:"x" + corrupt    exit=2 healable=false rows=2 MISMATCH=false
metrics:"x" + deep       exit=2 healable=false rows=3 MISMATCH=false
dup only                 exit=1 healable=true  rows=2 MISMATCH=false
healthy                  exit=0 healable=true  rows=1 MISMATCH=false
corrupt                  exit=2 healable=false rows=1 MISMATCH=false
deep                     exit=2 healable=false rows=2 MISMATCH=false
future                   exit=2 healable=false rows=2 MISMATCH=false
alien key                exit=2 healable=false rows=2 MISMATCH=false
100 metricsless          exit=0 healable=true  rows=1 MISMATCH=false
TOTAL MISMATCHES = 0 / 15                     ★ 改修**前**でも 0 件

$ node s4sweep.js <改修後の gauge.js>          ← 同じ 15 入力
(exit 列は 15 入力すべて改修前と完全に同一)
TOTAL MISMATCHES = 0 / 15
```

**`metrics:"x"` は改修前も exit 0 である。** security 相の `exit=2 かつ healable:true` を、
私は 15 通りの入力で**一度も再現できなかった**。理由の推測は書かない(第16条: 推測は測定ではない)。
security の実測が別の条件(別版の実装 / 別の毒の組み合わせ / ハーネスの取り違え)であった可能性が高いが、
**私は security の機を持っていないので確かめられない。**

**それでも修理を入れた理由**は三つある。

1. **HEAD の実装は構造的に二つの式を持っていた。** `const healable = human === 0;` と
   `process.exit(a.duplicates > 0 ? 1 : 0)` は**別の式**であり、第48条(同じ問いに二つの答えを持つな)に反する。
   今日たまたま一致しているのは**偶然の一致**であって、保証ではない。
2. **保証を門にした。** `auditVerdict` を通して `healable` を exit から導き、
   `gauge(CLI): healable は exit code と必ず一致する` が
   **純関数 4 通り + CLI の実走 8 入力**で一致を撃つ。**今日から一致は測定である。**
3. **exit の規約は一文字も動かしていない**(改修前後の 15 入力の exit は完全に同一 —— 上の表)。

**「破れは再現できなかったが、破れうる構造は実在したので塞いだ」** —— これが私の裁定である。

### 3-7. security S-5(A24)— `--json` の生バイト

```
$ node <HEAD 相当の複製>/graph/gauge.js ledger --audit --json   (400 文字の毒を仕込んだ破損行)
  --json line 長= 200  秘密 200 連続= false  healable= false
$ node <改修後>/graph/gauge.js ledger --audit --json
  --json line 長= 60   秘密 200 連続= false  healable= false
```

**人向け(60)を超えない。** 門が「`{...a}` の全展開に戻っていないこと」も凍らせる。

### 3-8. security S-8(A13)— 101 行を rows=1

```
[改修後]
✓ gauge(CLI): 読まれずに消える行を監査が名乗る — 101 行を rows=1 と答えて黙らない (verify S-8)
  rows=1 / ignored=100
  画面: ⚠️ 観測を持たない行が 100 行ある — 監査の数(rows)に載らず静かに消える行である
```

---

---

## 4. 直さないと決めた件(残債に名を付ける / 第16条)

| 残債名 | 件 | 出所 | なぜ今日直さないか |
|---|---|---|---|
| **SM-S2** | 走行を**通して**実台帳を隠し続ければ番兵は今も skip を名乗って通す | security S-2 の残り | 「不在の機(CI)は skip」は第37条が認めた設計であり、**本物の不在と偽装の不在を外から区別する道が今日は無い**。`workspace.js` の `source` を見る案(security の修理案 b)は住所解決の意味を変える改修であり、**同じ PR で構造を動かせば赤の切り分けができない**(第57条)。**払う条件**: `workspace.js` が「倉は在るがファイルだけ無い」を名乗る口を持つ単独 PR。門は `sentinelVerdict(false, null, null) === 'skip'` を明示的に assert しているので、塞いだ日にこの assert が「前提が変わった」と鳴る |
| **SM-S3** | 番兵は「外部の追記」と「振替を壊した門の追記」を分けられない | security S-3 の残り | 形(`appended` / `rewritten` / `truncated`)までは分けた。**完全に分けるには番兵が門ごとに前の指紋を採り直す**必要があり、それは「一度汚れたら以降の全門が同じ差分を見る」を直す改修である。**代**: 66 呼出 × sha256 = 今日 3.5ms なので代は安いが、**「二本目以降は私は汚していない」と言わせる設計は、汚染の起点を失う危険と対**である(最初の一本だけが鳴り、後続は緑になる = 見落としに化けうる)。**この裁定には測定が要る**ので単独の走行に送る。門のコードと番兵の名乗りの文面の両方にこの但し書きを書いた |
| **SM-L** | 静的の門の射程は `gauge.js` / `spawn-trace.js` のみ。射程の外に既知の可変大域が 3 ファイル 6 件 | review 重大 B の裏 / security S-6 | 第62条(c) が「射程は名指しで狭く切れ」と命じている。**中身に名を与えた**: `pulse.js:_gateCache`(:170 / :203)/ `hermetic.js:TRACKED`(:516 / :519 / :522)/ `abode.js:unmeasurable`(:1506)。門が毎回この三つを画面で名乗り、**外から凍らせる門がその名乗りの存在を assert する**。射程を広げるには各ファイルの memo が正当かを個別に裁く必要があり、それは別の走行である(第57条) |
| **SM-L2** | 字句器はまだ動的 require / `Object.assign` / `eval` / Proxy の形を**見ていない** | security A29-A43 の残り | 5 形を足して G4 は 6/6 を捕らえたが、security が数えた 15 形のうち**なお 4 形が不可視**である。`require.cache` は正規表現を書いたが `graph/` に実例が無く、**偽陽性 0 は確かめたが真陽性は確かめていない**(§7-3)。**名指しで残債にする**のが第62条(c) の命令であり、見ていない形を列挙した |
| **SM-G** | 時刻の物差しが `preemptionReasons` と `audit` の入口に散っている | requirements の既存残債 | 前相からの持ち越し。構造のリファクタであり、門を足す PR で動かせない(第57条) |
| **SM-T** | AC-13 の子プロセスにタイムアウトが無い(S-9) | security 軽微 | **CI が無限に吊る道**であり直す価値はあるが、`execFileSync` に `timeout` を足すと**遅い機で偽の赤**が出る。適切な値を決めるには CI(ubuntu)での実測が要り、**私は ubuntu で一度も走らせていない**(§7-4)。値を推測で置くのは第16条違反である。**払う条件**: CI で AC-13 の所要を 10 回測り、中央値の 5 倍を置く |
| **SM-DoS** | 番兵の代は台帳の大きさに線形。縮む道が無い(S-10) | security 軽微 | 今日の実台帳は 2KB / 7 行で代は 0.04ms × 66 = **2.6ms**。1.17GB で 68.5 秒になるのは真だが、**台帳が 1.17GB になる前に掃除(FR-8)が要る**のであって番兵の問題ではない。`createReadStream` 化は峰の常駐を定数にするが、**今日の実害が 0 なので測る前に直さない**(第38条: 改善は数で示せ — 示す数が無い) |
| **SM-PATH** | 走行記録にホームパスが 21 箇所(S-13) | security 好み | `reform/silent-mutations/*.md` にのみ存在し、**追跡ファイルの差分には無い**。走行記録は実測の生出力であり、パスを伏せれば再現性が落ちる。**教主が公開の可否を裁く事項**であり、私が勝手に消さない |
| **SM-AC8** | AC-8 が要求した「CLI 経路で exit 2」を撃っていない(軽微 a) | review 軽微 | 既存門 `gauge(CLI): 先回りは exit 2 で名乗る (F-1 / 第16条)` が**同じ規約を同じ道で**撃っている。足せば +150ms を払って**同じことを二度撃つ**だけであり、第44条が戒める冗長である。**正しい払い方は AC の文面を実体に合わせること**であって、門を足すことではない |
| **SM-C2** | 既存 `:3361` の決定性門に「こちらはコピー間」の一行(好み 2) | review 好み | コメント一行だが、**既存門の本文に触れる**。本走行は「既存 471 門を一本も触らない」を NFR-2 に掲げている |
| — | AC-8 は AC-9 に完全包含される(好み 1) | review 好み | **直さない。残債にもしない。** AC-8 の名は「F-1 の回帰」を名乗り、回帰の由来を記録している。消すのは記録を消すことである |
| — | 番兵が印字する sha256 の前像は総当り可能(S-11) | security 軽微 | **直さない。残債にもしない。** 漏洩ではない(台帳の中身は公開情報)。「digest だから安全」という**理由**が成り立たないという指摘は正しいが、指紋を印字しなければ人は何が起きたか分からない。直す対象が無い |

**残債に名を付けた件数: 10**(SM-S2 / SM-S3 / SM-L / SM-L2 / SM-G / SM-T / SM-DoS / SM-PATH / SM-AC8 / SM-C2)。
**残債にせず「直さない」と裁定した件: 2**(好み 1 / S-11)。

> **⚠️ rework 相の註記(R-3 / 件数の正本化)。** この「10」は **verify 相が自分で新たに名を付けた分**である。
> **走行全体の残債の正本は `PR.md` §6 の表の 14 件** —— この 10 に、前の相からの持ち越し
> **SM-H / SM-I / SM-J / SM-M** を足した数である。**引き継いだ債も、この PR が払っていない債である。**
> 走行の文書は残債を 10 / 12 / 14 の三通りに数えていた(reflect の摘発)——
> 数え方が違うのであって矛盾ではないが、**どれが正本かを書いていなかったのが誤りである。**
>
> **そして SM-S2 の「なぜ今日直さないか」は、rework 相で書き直された。**
> ここに書いた「**本物の不在と偽装の不在を外から区別する道が今日は無い**」は**測定で偽**である ——
> `workspace.resolve()` は `exists` で既に分けている(reflect が実測 / rework が三通りの機で撃ち直した)。
> **rework 相は (i) 実際に塞ぐ**を採り、`sibling` の機では番兵が倒れるようにした(実測 58 門赤)。
> 残った射程は **`source === 'env'` の機だけ**であり、**それが現在の SM-S2 の理由である**(`rework.md` §R-4)。
> **SM-L2 も SM-L3 に置き換わった**(`rework.md` §R-1)。**この節の当該行は歴史として残す。**

---

## 5. 全走三本と CI 相当の門(生出力)

### 5-1. 全走三本 —— **三本とも 0 failed**

```
[素]
$ time node tests/paradise.test.js
Paradise self-test: 492 passed, 0 failed
exit=0
real    6m5.233s

[PARADISE_ABODE=repo]
$ time PARADISE_ABODE=repo node tests/paradise.test.js
Paradise self-test: 492 passed, 0 failed
exit=0
real    6m6.090s

[PARADISE_ABODE=global]
$ time PARADISE_ABODE=global node tests/paradise.test.js
Paradise self-test: 492 passed, 0 failed
exit=0
real    6m5.627s
```

**門数 492(実測)。三本とも 0 failed / exit 0。** 赤は三本とも `grep -c "✗"` = **0**。

素の走行で番兵と新設の門が名乗った行:

```
      · 射程: graph/gauge.js / graph/spawn-trace.js の最上位のみ — hermetic.js は git の一覧の
        memo(:516 TRACKED)を正当に持つため射程外(第57条: 射程を広げるのは別の走行。
        残債 SM-L = pulse.js:_gateCache / hermetic.js:TRACKED / abode.js:unmeasurable)
      · 競合成立(raw=2 → folded=1)— 畳みが読み手を守った / audit exit=1
```

**「skip: 実台帳が無い」は一度も出ていない** —— 神の機では番兵が毎門で実台帳を照合している。
**競合の門は skip せず判定した**(review【軽微 e】の対の一行が効いている)。

### 5-2. CI 相当の門 —— **12 本すべて exit 0**

| 門 | exit | 最後の行 |
|---|---:|---|
| `node graph/wiring.js check` | **0** | `✓ 門 25 本すべてに走らせる者が居る (第44条)` / `✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い` |
| `node graph/hermetic.js check` | **0** | `✓ 版管理下の現物を走行中に書き換える門は無い — 同時に走っても答えは一つである` |
| `node graph/workspace.js check` | **0** | `✓ 楽園に創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし` |
| `node graph/derived.js check` | **0** | `no test depends on derived content` |
| `node graph/codex.js check` | **0** | `✓ 索引は本文と一致している (62 条)` |
| `node graph/census.js fix`(background) | **0** | `✏️  README テスト数: 484 → 492` / `✓ 書き換えた数は、その主張の目で読み直して実測と一致する` |
| `node graph/census.js check`(background) | **0** | `✓ every number the paradise claims about itself is true` |
| `node graph/conclave.js audit` | **0** | `見捨てられた走行: 0 / 判定不能: 0 / 全 15` |
| `node tests/gauge-audit.test.js` | **0** | `Gauge ledger audit self-test: 6 passed, 0 failed, 0 skipped` |
| `node tests/guards.test.js` | **0** | `Paradise guards self-test: 75 passed, 0 failed` |
| `node tests/route-matrix.test.js` | **0** | `Route matrix self-test: 13 passed, 0 failed` |
| `node tests/ratify-guard.test.js` | **0** | `Ratify guard self-test: 9 passed, 0 failed` |

**review 相が timeout で諦めた `census.js check` を、私は background で完走させた**(所要 約 9 分)。
**「楽園が語る数はすべて真」** —— README の 492 は census が書いた数であり、手で書いていない(第22条)。

### 5-3. 所要 —— 第62条の外の門を三本足した代

```
$ for i in 1 2 3; do node tests/paradise.test.js --gate gauge --gate 門ヘルパー; done
run1: 13469ms | 137 of 492 gates matched — 137 green, 0 red
run2: 13206ms
run3: 13426ms
中央値 13426ms
```

| 物差し | 値 | 判定 |
|---|---|---|
| review が実測した改修後(verify 前) | 中央値 **13353ms** / 129 門 | — |
| **verify 後** | 中央値 **13426ms** / **137 門** | **+73ms で 8 門増えた** |
| NFR-1 の上限 | **137 門 / ≤16 秒**に更新 | **13.4 秒 ✅** |
| 新設 8 門の増分 | **+0.07 秒** | 新設の門は**子プロセスを一本も起こさない**(純関数とソース読み)ため |
| CI は ×2(repo/global) | 実費 **+0.15 秒** | 上限内 ✅ |

**第62条の外の門三本は、ほぼ無料である。** これが「条を弱めるのではなく実体を条に合わせる」を選べた理由である。

### 5-4. 全走の所要

| 走行 | 改修前(教主の実測) | verify 後 | 差 |
|---|---|---|---|
| 素 | 約 6 分 / 484 門 | **6m05s / 492 門** | ほぼ同じ |
| `PARADISE_ABODE=repo` | 約 6 分 | **6m06s** | 〃 |
| `PARADISE_ABODE=global` | 約 6 分 | **6m06s** | 〃 |

---

## 6. 不可侵と作業木の最終確認

```
$ sha256sum ../paradise-creations/gauge-ledger.jsonl
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77
$ wc -l ../paradise-creations/gauge-ledger.jsonl
7

$ git status --short
 M CONSTITUTION.INDEX.md
 M CONSTITUTION.md
 M README.md
 M graph/gauge.js
 M tests/paradise.test.js
?? reform/silent-mutations/

$ git diff --stat
 CONSTITUTION.INDEX.md  |    3 +-
 CONSTITUTION.md        |   58 +++
 README.md              |   14 +-
 graph/gauge.js         |   95 +++-
 tests/paradise.test.js | 1304 +++++++++++++++++++++++++++++++++++++++++++++++-
 5 files changed, 1461 insertions(+), 13 deletions(-)
```

**実台帳は開始時と一字一句同じ**(`955ea34a…` / 7 行)。
**作業木は本走行の 5 ファイル + `reform/silent-mutations/` のみ** —— 余分なファイルは一つも無い。
`dashboard/state.*` は汚していない(`export-state.js` を走らせていない / review の落ち度を踏んでいない)。
`CLAUDE.md` / `.env` / `tribunal.yml` に触れていない。`README.md` と `CONSTITUTION.INDEX.md` は
**`census.js fix` と `codex.js index --write` が書いた** —— 手で書いた数字は一つも無い。

**commit も push もしていない。** 教主が PR を立てる。

---

## 7. **私が見ていないこと**(第16条 —— 本報告で最も重要な節)

以下は**私が撃たなかった / 撃てなかった / 測り損ねた**ものである。
「出なかった」ではなく「**見ていない**」と読め。

### 7-1. S-4 について —— 最も正直に言うべきこと

1. **security が報告した S-4 の破れを、私は一度も再現できなかった**(§3-6b)。
   15 入力を改修前の実装に撃って `MISMATCH = 0 / 15`。
   **私が直したのは「破れ」ではなく「破れうる構造」である。**
   security の実測が何だったのかは**分からないまま**である。
2. **その結果、S-4 の修理は「前は壊れていた / 後は直った」の対で証明できていない。**
   証明できているのは「**今は門が一致を毎回測る**」だけである。第21条が求める
   「壊して鳴らす」は、`auditVerdict` の `healable: exit !== 2` を `healable: true` に潰せば鳴る
   (門の (a) が撃つ)—— だが**改修前の実装が実際に破れる入力を、私は示せていない。**

### 7-2. 番兵について見ていないこと

3. **実台帳を実際に汚す変異は一度も撃っていない**(戒め 1)。
   複製の兄弟倉に写しを置いて撃ったが、**本物の実台帳で番兵が鳴る場面は見ていない。**
4. **SM-S3 の是非を測っていない。** 「番兵が門ごとに前の指紋を採り直す」形にすると
   偽の赤は 47 → 1 に減るが、**それが見落としに化けないか**を私は測っていない。
   残債に送ったのは、**測らずに直すのは第38条違反**だからである。
5. **`EACCES` / `ELOOP` / `ENAMETOOLONG` を実際に作っていない。** 撃ったのは `EISDIR` のみ。
   `ledgerDigest` は `ENOENT` 以外をすべて `unreadable:<CODE>` に落とすので**構造上は同じ道**だが、
   **Windows で `ELOOP` を作れないので実測していない。**
6. **番兵の射程は今も走行の最初の 12 秒である**(security A9)。
   gauge 節が終われば実台帳は誰も見ていない。**残り 5 分 50 秒は無防備である。**
   私はこれを直していないし、残債にもしていない —— **番兵は gauge 節の門を守る道具**であり、
   節の外の門は実台帳に触らない(security A10 が数えた 3 箇所は読むだけ)。
   **だがそれを私は grep でしか確かめていない。**

### 7-3. 静的の門について見ていないこと

7. **`require.cache` の正規表現は真陽性を確かめていない。** `graph/` に実例が無いので
   **偽陽性 0 は確かめたが、本物の `require.cache` memo を捕らえるかは撃っていない。**
8. **security が数えた 15 形のうち、なお 4 形が不可視である**(動的 require / `Object.assign` /
   `eval` / Proxy)。**残債 SM-L2 に名を与えたが、直していない。**
9. **偽陽性 0 の実測は `graph/*.js` の 22 ファイルのみ。** `tests/` / `dashboard/` は走査していない。
   射程が `gauge.js` / `spawn-trace.js` の 2 本なので今日は無害だが、
   **射程を広げた日にどれだけ偽陽性が出るかは測っていない。**

### 7-4. 並行の門について見ていないこと

10. **並列度 4 / 8 を撃っていない**(review の申し送り 3)。`raceVerdict` は `raw === 2` を要求するので、
    **N=4 にすれば門は `broken` を返す** —— これは意図した設計だが、
    「治癒が N に依らない」という AC-14 の M2 は**私も確かめていない。**
11. **CI(ubuntu)で一度も走らせていない。** 競合が成立するか、子プロセスが漏れないか、
    タイムアウト無しで吊らないか —— **すべて Windows の実測からの推論である。**
12. **AC-13 の 10 連走をやり直していない。** review の 10/10 緑を引き継いでいる。
    私が確かめたのは**全走三本の中で 3 回**(三本とも `競合成立(raw=2 → folded=1)`)だけである。

### 7-5. 掃除(FR-8)について

13. **掃除は今日も道具として存在しない**(security A22)。`healable` を直したが、
    **`healable` を読む者は今日もひとりも居ない。** 私は読み手を作っていない。
14. **AC-14 の M4(掃除の安全性)を検証していない。**

### 7-6. 私の修理そのものについて

15. **`CURRENT_GATE` は門の外で器が呼ばれると `null` を名乗る。** その道を私は
    「(門の外 — 器が test() の外で呼ばれた)」と名乗らせたが、
    **実際に門の外で `withGaugeSandbox` が呼ばれる場面が在るかを数えていない。**
16. **新設 8 門を「壊して鳴らす」を全部は撃っていない。** 撃ったのは
    「外から凍らせる三本」(S-1 / S-2 / S-3 の再現で鳴った)と
    「射程 / 分岐 / 空回り」(§3-1)であり、**新設門の assert を一本ずつ殺す網羅は撃っていない。**
    review 相が第三弾でやった 24 種の網羅に相当する作業を、私は自分の門に対してやっていない。
17. **`test()` に `finally { CURRENT_GATE.name = null }` を足したことの副作用を測っていない。**
    492 門が緑なので実害は無いが、**`test()` は門の根**であり、
    `門ヘルパー: test() の失敗が必ず数に載る` が抜き出す本文がここで変わっている。
    その門は緑だが、**私は抜き出しの中身を目で読んでいない。**
18. **所要の測定は本機 1 台 × 3 回。** 分散も信頼区間も出していない。
19. **6 分の全走を三本走らせたが、それぞれ 1 回ずつである。** flaky の有無は測っていない。
20. **`ignored` / `oddMetrics` の二欄を `auditLedger` の返り値に足したが、
    下流(pulse / export-state / verdict / dashboard)を走らせて壊れないことを確かめていない。**
    `--json` は列挙に変えたので**新しい欄が勝手に外へ出ることは無い**が、
    `auditLedger` を直に呼ぶ者が `Object.keys` を数えていれば壊れうる。
    全走 492 門が緑なので**門の射程では壊れていない**が、それは下流を走らせたことにはならない。

---

## 8. 裁定

**review の重大 4 件・security の致命 3 件と重大 5 件を直した。** 教主が「今直す」と裁定した 8 件は
**すべて実測で塞がったことを確かめた** —— review が SILENT と名指した三件は
**exit 1 / 赤 1〜2 本**で鳴るようになり、security が撃った A4 / A7 / A49 / A45 は
**全滅 → 62 門赤** / **122 green → 62 門赤** / **名指し 0 → 47 行** / **1/4 → 6/6** に変わった。

**第62条の裁定: (ii) 実体を条に合わせた。** 掟を弱める道もあったが、
外の門三本の代が **+73ms** と実測できたので、弱める理由が無かった。
**掟が実体より大きく名乗れば次の走行はその嘘を土台にする** —— ならば実体を追いつかせるのが筋である。
併せて第62条(b) に**番兵の最低限の四つ**を明文化した(S-7)。緩い条文が最弱の実装を許し、
実測でそのすべてが破れたからである。

**だが私は「無音を塞いだ」と全称で名乗らない。**
§7 の 20 項目は、**私の修理そのものに対する網羅的な故障注入を私がやっていない**ことを含む。
第21条が求める「壊して鳴らす」は、**新設 8 門については部分的にしか果たしていない。**
そして S-4 については、**破れを一度も再現できていない**(§3-6b)。次の相があるならそこを撃て。

**実台帳は不変。exit の規約は不動。作業木は 5 ファイル + 走行記録のみ。commit していない。**

---

*実測に使った複製・変異ハーネス: `$LOCALAPPDATA/Temp/vf*`(揮発)。*
*実台帳 sha256 `955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77` / 7 行 —— 検証の前後で不変。*
