# review — reform 走行 `silent-mutations` の品質審査

**審査役**: code-reviewer(第11条 の appropriate-class review — build 相は自分の門を裁けない)
**日付**: 2026-09-17
**審査対象**: ブランチ `reform/silent-mutations` の**未 commit** の作業樹
**審査の作法**: 設計書の主張を読まず、**実物のコードと実測の生出力**だけで裁く。
故障注入は `$LOCALAPPDATA/Temp/rv-repo`(`.git` を除く倉の全複製)に対してのみ撃った(第58条 c)。

---

## 0. 審査の前提と不可侵の確認

実台帳の指紋を審査の**前**に採り、**終わりにもう一度採った**:

```
[審査前]
$ sha256sum C:/Users/kikus/Documents/workspace/paradise-creations/gauge-ledger.jsonl
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77
$ wc -l → 7

[全実測の後]
$ sha256sum ...
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77
$ wc -l → 7
```

**実台帳は不変である(NFR-3 を審査の側からも確認)。**

### 審査を成立させた一手 —— 複製の機を「神の機」にした

変異はすべて複製に撃った。複製は `$LOCALAPPDATA/Temp/paradise-creations/gauge-ledger.jsonl`
を「実台帳」として解決するので、審査の前に実台帳のコピーをそこへ置いた:

```
$ cd $LOCALAPPDATA/Temp/rv-repo && node -e "...workspace.resolve().root..."
copy REAL_LEDGER= C:\Users\kikus\AppData\Local\Temp\paradise-creations\gauge-ledger.jsonl true
$ sha256sum $LOCALAPPDATA/Temp/paradise-creations/gauge-ledger.jsonl
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77
```

これをしなければ複製の機は「実台帳が無い機」になり、**番兵の照合枝が一度も走らず、
番兵に撃った変異はすべて偽の無音になって**審査そのものが嘘になっていた。
prove 相の Z1 の実測がどちらの機で行われたのかは記録から読み取れないので、私は自分で機を揃えた。

### ハーネスの感度の証明(第37条: 測れないは緑ではない)

「変異を撃ったのに鳴らなかった」が**変異が届いていないだけ**でないことを、対照変異で確かめた:

```
E1対照: gauge.js の readLedger({raw}) を常に [] にする
→ CAUGHT red=44 green=84   (44 門が同時に赤)
```

**ハーネスは鳴るものは鳴らせる。** ゆえに以下の SILENT は本物の無音である。

### 復元の証明(第58条 / prove 相が踏んだ罠を踏まない)

全変異で書き戻し後に生バイト列の一致(`after === before`)を機械的に確かめた。
**`git checkout -- <file>` は本走行のファイルに一度も使っていない。**
(ただし §3【私の落ち度】に一件記す。)

---

## 1. 審査の要約

| 撃った物 | 件数 | 結果 |
|---|---:|---|
| **故障注入(複製への変異)** | **有効 65** | **CAUGHT 63 / SILENT 2** — 無音率 **3.1%** |
| ├ 第一弾(設計/prove が名指した変異の再現 + 拡張) | 23 有効 | CAUGHT 21 / SILENT 2 |
| ├ 第二弾(CRLF 対応 + 器・衛生・下流契約の盲点狙い) | 16 | CAUGHT 16 |
| ├ 第三弾(**新設門の assert を一本ずつ殺す** 24 種) | 24 | CAUGHT 24 |
| └ 第四弾(SILENT 2 件の単独再現 + 対照) | 4 | SILENT 2 再現 / CAUGHT 2 |
| **AC の実コード照合** | **AC-2〜16 = 15 本** | 合致 9 / 部分欠落 5 / **空回りの assert 1 本発見** |
| **exit code 四通り × 現行 vs HEAD** | 8 | **完全一致 — exit は一切動いていない** |
| **`--json` 下流(pulse / export-state / verdict / ledger / gauge-audit)** | 5 | すべて exit 0・欄の混入なし |
| **AC-13 の 10 連走** | 10 | **10/10 緑・`skip` 0 回・中央値 665ms** |
| **助走を変えた競合成立率**(5〜400ms × 10 試行) | 80 | **80/80 成立**(lead=5ms でも) |
| **CPU 負荷下の競合成立率**(4 コア占有 × 3 セット) | 24 | **24/24 成立** |
| **gauge 節の所要(同条件 3 回ずつ)** | 6 | HEAD **10.8〜11.9s** → 改修後 **13.2〜13.4s**(+**2.4s**) |
| **仮倉の残骸(連走 3 回の前後)** | — | **新設 6 接頭辞すべて 0 件残留** |
| **第62条が名指す三本** | 3 | **3 本とも実在し、壊せば鳴る。ただし条の一文に嘘がある**(§3【重大 D】) |

**見つけた欠陥: 【致命 0 / 重大 4 / 軽微 5 / 好み 3】**

---

## 2. AC と実コードの照合表

`requirements.md` の AC-2〜16 を一本ずつ読み、`tests/paradise.test.js` の**実コード**と突き合わせた。
「実際の assert」は**読んだ行そのもの**であり、設計書の引用ではない。

| AC | 門(実在の名前 / 行) | 実際の assert | 判定 |
|---|---|---|---|
| **AC-2** 番兵は本体の例外を飲み込まない | `gauge(番兵): 実台帳の番兵は本体の例外を飲み込まない (D-A / 第16条)` `:3732` | ① `assert.throws(withGaugeSandbox(throw BODY-BOOM), /BODY-BOOM/)` ② 例外文面に `実台帳が書き換えられた` を含まない ③ `sentinelVerdict(false,'aaa','aaa')==='ok'` ④ `(false,'aaa','bbb')==='throw'` ⑤ `(true,'aaa','bbb')==='warn'` ⑥⑦⑧ **器の本文を読み `sentinelVerdict(bodyThrew, REAL_DIGEST, after)` / `ledgerDigest(REAL_LEDGER)` / `throw new Error(msg)` を正規表現で凍結** | ✅ **合致 + AC を超える**。⑥〜⑧ は AC-2 が求めていない「配線の凍結」で、Z1 を塞ぐ prove 相の修理。**実測**: Z1 / Z1b / Z1c / Z1d / A1 / A2 / P1 / P2 / X5 の 9 変異すべて CAUGHT |
| **AC-3** 不在の機で skip を名乗る / 不在でも歯を持つ | `gauge(番兵): 実台帳が無い機でも番兵は歯を持つ — 不在は通過ではない (D-A / 第37条)` `:3770` | (a) 作り物の台帳で `ledgerUntouched` の真偽両側 + **長さの変わらない書き換え**(Z10 の塞ぎ) (a2) `sentinelSkipNote()` の形と住所を**枝の外で** (b) 神の機で `ledgerDigest(REAL_LEDGER)===REAL_DIGEST` | ✅ **合致**。AC の (a)/(b) 二段作法を守り、prove 相の修理二本(Z10 / Y12)も入っている。**実測**: A3 / A4 / P3 すべて CAUGHT |
| **AC-4** W1 の変異を注入すると**番兵が名指しで鳴る** | `gauge(故障注入): 住所解決を壊す変異(W1)を番兵が名指す — 本走行の実害の再現 (D-A)` `:3822` | ① 注入版 exit 0 ② `ledgerUntouched(before, after) === false` ③ **`/gauge-w1\.js\|FAKE-REAL/.test(bad.out + broken)`** ④ 実物で `true` | ⚠️ **部分欠落 + 空回りの assert 1 本** → §3【重大 A】 |
| **AC-5** stripped の走行は罰される | `gauge: 印を消した走行(stripped)は序列の罰を免れない (D-C / 第52条)` `:6691` | `score===60` / `noTier===4` / `unobservable===0` / `complete===true` / **対照群** `legacy.score===100` / `legacy.unobservable===4` | ✅ **合致 + 対照群で上回る**。**実測**: S1 → 2 門赤 / V1 → 1 門赤 |
| **AC-6** `TIER_EPOCH_AT` の値を門が固定 | `gauge: 紀元の日付は黙って動かない — TIER_EPOCH_AT の値を固定する (D-C / N18 と同じ作法)` `:6706` | 定数の一致 / `epochStatus` 三点 / **境界ちょうど** `epochStatus({created: TIER_EPOCH_AT})==='stripped'` / **境界 −1ms** `'legacy'` | ✅ **合致 + Z9 の塞ぎ**。**実測**: S4 → 3 門赤 / Z9 再現 → 1 門赤 / S5(created 不在の扱い変更) → 4 門赤 |
| **AC-7** 台帳を空にすれば record は復活する | `gauge: record は台帳を信じ、プロセスの記憶を信じない (D-D / 第55条 e)` `:5960` | `ledgerPath()===LEDGER`(前提) / `b.skipped===true` / `!c.skipped` / `raw.length===1` / `c.fp===a.fp` | ✅ **合致**。**実測**: G8 → 7 門赤 / V3 → 1 門赤 |
| **AC-8** 読めない `ts` の既存行は正当な先着でない | `gauge: ts が読めない既存行は正当な先着ではない (D-E / F-1 の回帰)` `:5979` | `probe.fp` / `!r.skipped` / `r.preempted===true` / `/ts が時刻として読めない/` / `raw.length===2` | ⚠️ **部分欠落**。AC-8 が要求した「**CLI 経路では exit 2 で名乗る**」を**一度も撃っていない**(grep: この門の本文に `execFileSync` / `runGaugeGate` 0 件)→ §3【軽微 a】。**さらに AC-9 に完全包含される** → §3【好み 1】 |
| **AC-9** 先回りの物差しを一つずつ撃つ | `gauge: 先回りの三つの物差しは独立に効く — 一本でも死ねば鳴る (D-E / 第21条 a)` `:5997` | 4 ケース(読めない ts / 開始より前 / 秤が書かない鍵 / 未来)を**別々の仮倉**で、各々 `preempted===true` / `reasons.length>=1` / 名指しの正規表現 / `raw.length===2` | ✅ **合致**。**実測**: T9 / E3 / E4 / E5 / X8(定数を巨大化して未来の物差しを事実上殺す)の 5 変異すべて CAUGHT |
| **AC-10** N 回採点しても点が変わらない | `gauge: 同一プロセスで N 回採点しても点は動かない — 決定性は秤の第一の約束 (D-F / 第38条)` `:6732` | 荒れた run 5 回 → `Set.size===1` / `seen[0]<100` / **stripped も 5 回 → `Set.size===1` / `<100`** | ✅ **合致**。**実測**: G6 → 2 門赤 / V2 → 1 門赤。既存 `:3361` とは測る層が違う(§3【好み 2】) |
| **AC-11** 最上位の可変大域が 0 件 | `gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない (D-L / 第62条 c)` `:3855` | 射程を `console.log` で名乗る / `deepStrictEqual(mutableGlobals([GAUGE_JS, SPAWN_TRACE_JS]), [])` / 複製に **G4・G6・G8** を撃って各 1 件 | ⚠️ **部分欠落**。**射程の片方を落としても門は緑のまま**(実測 SILENT)→ §3【重大 B】。**実測(良い側)**: G4 / N1〜N6 / X4 / Z2再 / L2 の 10 変異は CAUGHT |
| **AC-12** 偽の赤を出さない境界 | `gauge(静的): 大域の門は定数を罪と呼ばない — 偽の赤を出さない境界 (D-L / 第16条)` `:3889` | 許す形 7 種 → `[]` / **註釈・文字列・テンプレ・正規表現・JSDoc の中の `let` 7 種 → `[]`**(AC が求めていない追加) / 拒む形 3 種 → 3 件 + 名前集合の一致 | ✅ **合致 + 上回る**。**実測**: L1(`add` 落とし)→ この門だけが赤 / N6(`shadow` 殺し)→ 2 門赤 |
| **AC-13** 競合下でも治癒が成立する | `gauge(並行): 競合で重複が生まれても畳みが読み手を守る …(D-B / 第55条 b / 第62条 a)` `:6425` | `RACE_LEAD_MS>=150` / 器の前提 2 本 / **`raw<2` なら skip を名乗って return** / `raw===2` / `folded===1` / `S` の数 0 / `audit.code===1` / 文面 2 本 | ⚠️ **部分欠落**。**早期 return の条件を潰すと本題の全 assert が飛んでも門は緑**(実測 SILENT)→ §3【重大 C】。**実測(良い側)**: R1 / R2 / R4 / R5 / R6 / R7 / X1 / X2 / X3 の 9 変異は CAUGHT |
| **AC-14** D-B の採否を決める測定 | — **門ではない**(測定) | — | §4 で M1〜M3 を再測。**M1 = 665ms ≤ 1500ms 通過 / M3 = `skipped` 誤報 0/104** |
| **AC-15** audit が競合の跡を名乗る / exit は動かさない | `gauge(CLI): audit は競合の跡と人の手を要する事故を文面で分ける — exit の規約は動かさない (D-B γ / 第57条)` `:5158` | 3 種 × (exit / 🧹 / 🔴)= 9 本 + `--json` の `healable` 4 本 + 「`--json` が人の読む行を奪わない」1 本 | ✅ **合致**。**実測**: Y11 / Y12 / Y13 / Y14(死に枝化)/ X9 / X10(欄名の改名)/ Q1 / Q2 / Q3 / V4 / V5 の 11 変異すべて CAUGHT。§5 の四通り実測で exit の不動も確認 |
| **AC-16** 走行の衛生(CI 段がすべて緑) | 既存の `tribunal.yml` の段(新設なし) | — | §4 で実測。**新設 6 接頭辞の残骸 0 件 / X6・X7(衛生を壊す変異)は CAUGHT** |

**照合した AC = 15 本(AC-2〜16)。** AC-14 は門ではなく測定なので §4 で扱った。

### 「主張だけで assert の無い門」を探した結果 — **1 本見つけた**

AC-4 の門の三本目:

```js
assert.ok(/gauge-w1\.js|FAKE-REAL/.test(bad.out + broken), '注入版を名指していない');
```

`broken` は `injectGauge(box, 'gauge-w1.js', …)` の**返り値 = 複製のパス文字列**
(`path.join(sandDir, 'gauge-w1.js')`)であり、**必ず `gauge-w1.js` を含む**。ゆえに:

```
$ node -e "const broken=path.join('C:/tmp/paradise-w1-XXX','gauge-w1.js');
           console.log(/gauge-w1\.js|FAKE-REAL/.test('' + broken));"
true
```

**`bad.out` が空文字でも真になる。この一行は何も検めていない。**
実測でも裏を取った: 注入版の `console.log('LEDGER=' + …)` を消す変異(W2)を撃つと、
**この assert は鳴らず、代わりに別の assert(前提)が鳴った**(§3【重大 A】)。

---

## 3. 見つけた欠陥

### 【重大 A】 AC-4 の門は「番兵が名指す」と名乗るが、番兵は一度も走らない

**門名**: `gauge(故障注入): 住所解決を壊す変異(W1)を番兵が名指す — 本走行の実害の再現 (D-A)` `:3822`

**何が起きているか**:

1. この門の本文に `withGaugeSandbox` が**一度も現れない**(実測: `awk NR>=3823&&NR<=3854 /withGaugeSandbox/ | wc -l` → `0`)。
   ゆえに**番兵(器の `finally`)はこの門の中で一度も実行されない。** 撃たれているのは
   `ledgerUntouched(before, after)` という**判定関数だけ**である。
2. 三本目の assert は §2 で示したとおり**常に真**であり、`bad.out` を検めていない。
3. AC-4 が要求した「**文面に `実台帳が書き換えられた` が現れる**」を撃つ assert が**一本も無い**。

**判定**: 門の名前は「番兵が名指す」と全称で語るが、実体は「`ledgerUntouched` が false を返す」。
第44条(名を口にする全ての口を見よ)の逆 —— **名が実体より大きい。**
致命でない理由は、判定関数そのものは AC-2/AC-3 が撃っており、配線も AC-2 の ⑥〜⑧ が凍結しているため。

**再現手順**:
```bash
# 1. 空回りの assert の証明
node -e "const path=require('path');
  const broken=path.join('C:/tmp/paradise-w1-XXX','gauge-w1.js');
  console.log(/gauge-w1\.js|FAKE-REAL/.test('' + broken));"   # → true

# 2. 変異 W1(assert から broken を外す)を複製に撃つ
#    → その assert が赤になる = 今まで bad.out を一度も見ていなかった証拠
node rv-mutate.js <複製> <spec: assert.ok(/.../.test(bad.out + broken)) → .test(bad.out)>
# 実測: CAUGHT red=1  ← broken を外した途端に落ちる

# 3. 変異 W2(注入版の出力を消す)
#    → 三本目ではなく「前提」の assert が鳴る(名指しの assert は依然として無音)
# 実測: CAUGHT red=1
```

---

### 【重大 B】 AC-11 の静的門は射程の半分を失っても緑のまま(SILENT)

**門名**: `gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない (D-L / 第62条 c)` `:3855`

**実測(単独で撃ち直して再現)**:
```
L3: mutableGlobals の射程から spawn-trace.js を落とす
    (found = mutableGlobals([GAUGE_JS, SPAWN_TRACE_JS])
       → found = mutableGlobals([GAUGE_JS]))
→ SILENT red=0 green=128 restored=True
```

**なぜ無音か**: 射程の縮小は「見なかった」を「見て何も無かった」に化けさせる。
prove 相は Z2(`mutableGlobals([])`)を見つけて**空の射程を拒む歯**を足したが、
**`[A, B]` → `[A]` は空ではないので拒否に掛からない。** 半分の射程は空の射程の親戚である。

**しかも今日の `spawn-trace.js` は実質空の射程である**(実測: 最上位 `let`/`var` = 0 件、
破壊的操作も 0 件)。ゆえに射程から外しても**今日は何も変わらない**。
だが「今日の engine が清潔である」と「門が engine を見ている」は別の主張であり、
**第62条(c) が名指したのは後者である。**

**併せて発見(残債の裏)**: `graph/pulse.js` は `gauge.readLedger()` を呼んで台帳を読む engine だが、
**最上位に `let _gateCache` を持つ**(実測)。射程外なので門は鳴らない。
`design.md` はこれを「残債 SM-L」として名指しているので**見落としではないが、
第62条(c) の『射程の外は次の走行の残債として名を持て』を満たすには、
`SM-L` の中身が `pulse.js:_gateCache` であることが `design.md` か門のコメントに**書かれていなければならない。
現状の門のコメントは `hermetic.js` しか名指していない。

**再現手順**: 上記 `L3` の変異を複製に撃ち、`--gate 静的` を含む節を走らせる。129 門すべて緑のまま。

---

### 【重大 C】 AC-13 の並行門は「判定を全部飛ばす」変異に対して無音(SILENT)

**門名**: `gauge(並行): 競合で重複が生まれても畳みが読み手を守る …` `:6425`

**実測(単独で撃ち直して再現)**:
```
R3: if (raw < 2) {  →  if (true) {
→ SILENT red=0 green=128 restored=True
```

この一文字の変異で、門の**本題の五つの assert が全部飛ぶ**:
`raw===2` / `folded===1` / `S` の数 0 / `audit.code===1` / 文面 2 本。
それでも 129 門は緑。**門は「歯を全部抜かれても」誰にも咎められない。**

**なぜ prove 相は捕らえられなかったか**: prove 相は `RACE_LEAD_MS` を凍らせて
「助走を殺す変異(Z5)」を塞いだ。それは正しい修理だが、**塞いだのは skip へ落ちる一つの道だけ**である。
**早期 return の条件そのものを潰す道は残っている。** 定数は凍らせられたが、**分岐は凍らせられていない。**

**しかも本機ではこの skip 枝に一度も入らない**(実測 104 試行中 104 回 `raw===2`)。
ゆえに **skip 枝は本機では到達不能な死に枝**であり、prove 相が Y11 で名指した
「番兵の裁定が正常機では到達不能な死に枝」と**同じ形の病がもう一つ残っている。**
Y11 は純関数に持ち上げて解決した。**この枝は持ち上げられていない。**

**再現手順**:
```bash
# 複製で:  tests/paradise.test.js の `if (raw < 2) {` を `if (true) {` に
node tests/paradise.test.js --gate gauge --gate 門ヘルパー --gate 番兵 --gate 静的 --gate 並行
# → 129 of 484 gates matched — 128 green, 0 red, 1 skipped   (無音)
```

---

### 【重大 D】 第62条の「三本とも壊して鳴ることを別の門が撃つ(第21条)」は**三本のうち一本しか真でない**

条の文面(`CONSTITUTION.md` の第62条 末尾):

> **これを強制する門**: … 番兵((b))、… 二プロセスで凍結する門((a))、… ソースで読む門((c))。
> **三本とも壊して鳴ることを別の門が撃つ(第21条)。**

**実測での照合**:

| 三本 | 「別の門」は在るか | 実測 |
|---|---|---|
| **(b) 番兵** | ✅ **在る**。`gauge(番兵): 実台帳の番兵は本体の例外を飲み込まない` `:3732` が**別の `test()` として** `withGaugeSandbox` のソースを読み配線を凍結する | Z1 / Z1b / Z1d / X5 すべて CAUGHT |
| **(a) 並行** | ❌ **無い**。`RACE_LEAD_MS` も並行門の本文も、**外から撃つ門は 0 本**(grep 実測)。壊して鳴らすのは**自分の中の `RACE_LEAD_MS>=150` 一本だけ** | **R3 が SILENT** — まさに「別の門が撃っていない」層で無音が出た |
| **(c) 静的** | △ **半分**。`mutableGlobals` を呼ぶのは `:3859`(自分)と `:3893`(境界の門)のみ。境界の門は `DESTRUCTIVE` / `shadow` / 深さ地図を撃つので**半ば別の門**だが、**射程そのものを撃つ門は無い** | **L3 が SILENT** — 射程の層が誰にも守られていない |

**判定**: 条が「三本とも」と全称で名乗ったのは**実体より大きい主張**である。
第62条(a) 自身が「**言えない盲点は、まだ誰も落ちていない穴である**」と書いているのに、
**条の最後の一文がその盲点を隠している。** そして私はその穴に二度落ちた(R3 / L3)。

**これは重大である理由**: 第38条は「改善を数で示せ」と命じ、第62条はそれを規律にも掛けると宣言した。
**宣言した本人が、自分の三本の守りを数で確かめずに『三本とも』と書いた。**
条は掟であり、**掟が嘘を名乗れば、次の走行はその嘘を前提に建てる。**

**再現手順**: 上記 §3【重大 B】【重大 C】の変異二本。どちらも条が「別の門が撃つ」と言った層である。

---

### 【軽微 a】 AC-8 が要求した「CLI 経路で exit 2」が撃たれていない

`requirements.md` AC-8 は明示的に書いている:

> CLI 経路(`runGaugeGate`)では **exit 2** で名乗ること(既存の `先回りは exit 2 で名乗る (F-1)` の規約に従う)

実コード `:5979-5996` に `execFileSync` / `runGaugeGate` / `exit` は**一つも無い**(grep 実測: 0 件)。
**実害は小**(既存の `gauge(CLI): 先回りは exit 2 で名乗る (F-1 / 第16条)` `:6064` が同じ規約を撃っている)が、
**AC が要求した入力を門が撃っていない**ことは記録されるべきである。

### 【軽微 b】 門の総数の申し立てが要件と食い違う

| 出所 | 数 |
|---|---:|
| `requirements.md` AC-16 | `485 passed`(471 + **新設 14**) |
| `requirements.md` NFR-1 | 改修後 **130 門** |
| **実体** | `README.md` = **484 本** / gauge 節 = **129 門** / `git diff` の `+test(` = **13 本** |

要件が「14」と数えたのは **AC-1(門ではなく器)を門として数えた**ため。
`census.js fix` が README を 484 に直しているので**矛盾は解消済み**だが、
**要件の数と実体の数が一致しない**まま prove/build が通っている。第22条の精神に照らして記す。

### 【軽微 c】 AC-11 が指定した名前と出典表記が実体と違う

要件: `gauge(静的): … (D-L / review-3 §8.3)` / 実体: `… (D-L / 第62条 c)`。
条を足したので出典を条に差し替えたのは合理的だが、**要件の文面を更新した記録が無い。**

### 【軽微 d】 AC-11 が指定した名指しの書式が実体と違う

要件: `${f.file}:${f.line}` / 実体: `${path.basename(f.file)}:${f.line}`。
射程が 2 ファイルのうちは実害が無いが、**射程を広げた日にどちらの `gauge.js` か分からなくなる**
(`mutableGlobals` は複製のパスも受け取る設計である)。実際、§3【重大 B】の実測で
`bad.js` という**ベース名だけ**が出た例を見た。

### 【軽微 e】 AC-13 の門は「判定した」ことを画面で名乗らない

skip したときは名乗る(`· skip: 競合窓に入らなかった`)。
**前提が立って本題を判定したときは無言である。**
CI のログを読む者は「緑だった」しか読めず、**「競合が起きて治癒が確かめられた」を確認できない。**
第37条の裏側(名乗らない緑)。skip だけが名乗る設計は、**skip が常態化したとき初めて気づく**。

### 【好み 1】 AC-8 は AC-9 に完全包含される

- AC-8 `:5979`: 毒 `ts:'not-a-time'` → `preempted` / `/ts が時刻として読めない/` / `raw.length===2`
- AC-9 `:5997` `cases[0]`: **同じ毒・同じ三つの期待**(+ `reasons.length>=1`)

**AC-9 は AC-8 の上位集合である。** 実測でも T9 変異は 3 門を同時に赤にした(AC-8 / AC-9 / 既存)。
消すべきとは言わない(名前が「F-1 の回帰」を名乗っており回帰の由来を記録している)が、
**AC-8 が独自に撃つべきだった CLI 経路(【軽微 a】)を撃てば重複でなくなる。**

### 【好み 2】 AC-10 と既存 `:3361` は測る層が違うが、名前からは読めない

- 既存 `:3361` `gauge: 決定性 — 同じ走行には常に同じ点`: `score(run)` と `score(deepcopy)` を 1 回ずつ
- 新設 AC-10: **同一オブジェクトを 5 回**(最上位大域の汚染を見る)

**重複ではない。** だが両方の名前が「決定性」を名乗るので、将来「片方は要らない」と消されうる。
新設側の名前は「N 回採点しても」と言っているのでまだマシだが、
**既存側のコメントに「こちらはコピー間、あちらは呼び出し間」と一行書いておくのが安い保険である。**

### 【好み 3】 `mutableGlobals` の assert メッセージは毎回無駄に構築される

```js
assert.deepStrictEqual(found, [], '…' + found.map(…).join('\n'));
```
`found` が空(常態)でも第三引数は毎回評価される。`found.length ? … : ''` で足りる。
**実害はゼロ(2 ファイルの走査で 1ms 未満)。好みである。**

---

### 【私の落ち度】 審査中に `dashboard/state.*` を汚し、復元した

下流の確認で `node graph/export-state.js` を実物の倉で走らせたところ、
`dashboard/state.json` / `state.js` が再生成されて `git status` に現れた。
**これは本走行の変更集合ではない**(審査開始時は clean だった)ので `git checkout -- ` で戻した。
**本走行の 5 ファイルには一切触れていない**(戒め 3 を守り、本走行のファイルには `git checkout` を使っていない):

```
$ git status --short
 M CONSTITUTION.INDEX.md
 M CONSTITUTION.md
 M README.md
 M graph/gauge.js
 M tests/paradise.test.js
?? reform/silent-mutations/
$ git diff --stat
 CONSTITUTION.INDEX.md  |   3 +-
 CONSTITUTION.md        |  39 ++
 README.md              |   2 +-
 graph/gauge.js         |   8 +
 tests/paradise.test.js | 617 +++++++++++++++++++++++++++++++++++++
 5 files changed, 666 insertions(+), 3 deletions(-)
```

**verify 相への注意**: `export-state.js` は実物の倉で走らせると derived な二枚を汚す。
本走行が README を触っているので `census.js fix` は必要だが、`export-state.js` は不要である。

---

## 4. 所要と flaky の実測

### 4.1 gauge 節の所要 —— design の見積 9.6→11.5 秒に対して

**同条件で撃った**(どちらも `$LOCALAPPDATA/Temp` の複製 + 偽の兄弟倉。本機のノイズを揃えるため):

```
[HEAD(改修前)]
base run1: 11935ms | 116 of 471 gates matched — 115 green, 0 red, 1 skipped
base run2: 10891ms | 116 of 471
base run3: 10839ms | 116 of 471
中央値 10891ms

[改修後]
after run1: 13353ms | 129 of 484 gates matched — 128 green, 0 red, 1 skipped
after run2: 13440ms | 129 of 484
after run3: 13236ms | 129 of 484
中央値 13353ms
```

**実物の倉での改修後の実測(参考)**: 12414ms / 12886ms / 12792ms(中央値 **12.8 秒**)

| 物差し | 値 | 判定 |
|---|---|---|
| **13 門の増分** | **+2.46 秒**(10891 → 13353ms) | **NFR-1(≤20 秒)を大きく下回る ✅** |
| design の見積 | 9.6 → 約 11.5 秒(+1.9 秒) | **実測 +2.46 秒 — 見積より 0.56 秒重い**が上限内 |
| NFR-1 の別の言い方 | 「130 門 / ≤16 秒」 | **129 門 / 13.4 秒 ✅** |
| CI は ×2(`PARADISE_ABODE=repo/global`) | 実費 **+4.9 秒** | ≤40 秒の上限内 ✅ |

**AC-13 の並行門が毎回払う 566ms は妥当か** —— **妥当である。**

- 実測の門単体の所要: **10 連走で 659〜688ms(中央値 665ms)**、うち門の外(node 起動 + 484 門の登録)を
  除いた正味は約 **560〜580ms**。
- **AC-14 の M1 の閾値 1500ms の 44%。** 通過。
- 増分 2.46 秒のうち **約 23%** をこの一門が占める。**残り 12 門で 1.9 秒。**
- **これは「二プロセスを本当に起こす」ことの正当な代である。** 実測した内訳:
  子一本の spawn + `require(gauge.js)` = **39ms**、助走 `RACE_LEAD_MS` = **400ms**、
  残りが `--audit` の子プロセスと `readLedger` の子プロセス。
  **助走 400ms が所要の 71% を占める。** そして §4.2 が示すとおり、**400ms は要らない。**

### 4.2 flaky のリスク —— 10 連走と、助走を削った測定

**10 連走(要求どおり)**:
```
run 1: exit=0 662ms skip=0 | 1 of 484 gates matched — 1 green, 0 red
run 2: exit=0 671ms skip=0 | 1 green, 0 red
run 3: exit=0 688ms skip=0 | 1 green, 0 red
run 4: exit=0 665ms skip=0 | 1 green, 0 red
run 5: exit=0 659ms skip=0 | 1 green, 0 red
run 6: exit=0 668ms skip=0 | 1 green, 0 red
run 7: exit=0 659ms skip=0 | 1 green, 0 red
run 8: exit=0 661ms skip=0 | 1 green, 0 red
run 9: exit=0 664ms skip=0 | 1 green, 0 red
run 10: exit=0 667ms skip=0 | 1 green, 0 red
```
**10/10 緑。`· skip: 競合窓に入らなかった` は一度も出ていない。揺れ幅 29ms(4.4%)。**

**助走を削って競合窓の広さを測った**(門と同型の駆動子を複製して 8 段 × 10 試行 = 80 回):
```
lead=400ms trials=10 競合成立=10 skip=0 raw=[2,2,2,2,2,2,2,2,2,2]
lead=200ms trials=10 競合成立=10 skip=0
lead=100ms trials=10 競合成立=10 skip=0
lead= 50ms trials=10 競合成立=10 skip=0
lead= 30ms trials=10 競合成立=10 skip=0
lead= 20ms trials=10 競合成立=10 skip=0
lead= 10ms trials=10 競合成立=10 skip=0
lead=  5ms trials=10 競合成立=10 skip=0
```
**80/80 成立。助走 5ms でも競合窓に入る。**

**CPU を 4 コア占有した負荷下**(CI の混み合いを模す):
```
lead=400ms trials=8 競合成立=8 skip=0
lead= 50ms trials=8 競合成立=8 skip=0
lead=400ms trials=8 競合成立=8 skip=0
```
**24/24 成立。**

**`skipped` の誤報(AC-14 M3)**: 104 試行すべてで **0 回**。

### 4.3 **CI(ubuntu / 本機より遅い)での不安定の裁定**

**私の裁定: この門が CI で「赤くなる」危険は極めて低い。だが「緑のまま歯を失う」危険は残る。**

根拠を分けて述べる。

**(1) 赤くなる危険はほぼ無い。**
門は前提が立たなければ `skip` を名乗って**通す**設計であり、赤にはならない。
`assert.strictEqual(marks.length, 2)` と `assert.ok(raw >= 1)` の二本は器の破損を撃つが、
これらは**機の速さに依存しない**(子が返事をするかどうかだけを見る)。
遅い機では子の起動が遅くなるが、駆動子は `close` を待つので**タイムアウトの概念が無い**。

**(2) だが「緑のまま歯を失う」危険は本物である。**
競合が起きない機では門は `skip` を名乗って通る。そのとき:
- **本題の五つの assert は一つも走らない。**
- **緑である。** CI のサマリは `484 passed` と言う。
- **誰も「治癒が確かめられていない」ことに気づかない。**

これは §3【重大 C】の構造そのものである —— **R3 の変異が無音だったのは、
「本題を飛ばして緑」が正当な経路として設計に組み込まれているから**である。
遅い機では**変異を撃たなくても同じ状態になる。**

**(3) 助走 400ms は遅い機を守るための保険ではない。**
競合窓は `record` の **read → write の間**(discover の実測で 10〜20ms)であり、
助走は**子二本が同時に窓に入る**ための同期に使われる。
本機では **5ms でも 100% 成立した**(§4.2)。遅い機では子の起動が遅れるが、
**spin barrier は絶対時刻 `T0` で揃えるので、起動の遅い子は `T0` を過ぎてから spin を抜ける** ——
つまり**助走が長いほど揃いやすい**のは正しい。ただし **400ms は本機の起動 39ms の 10 倍**であり、
ubuntu の CI runner が本機の 10 倍遅いことは考えにくい。**過剰である。**

**(4) ゆえに私の裁定**:
- 助走 400ms を**下げる根拠は十分にある**(実測 5ms で 100%)。だが下げれば遅い機での余裕が減る。
  **下げるべきではない。所要 2.46 秒は上限 20 秒に対して余裕があり、保険としては安い。**
- **本当に直すべきは助走ではなく `skip` の側である。** §6 の申し送り 3 を参照。
- **CI で `skip` が出る頻度を計測する道が無い。** `skip` は `console.log` に出るだけで、
  誰も数えていない。**「CI で何回 skip したか」を後から数えられないのは第38条の違反に近い。**

### 4.4 門の衛生(仮倉 / env / 一時ファイル)

**連走 3 回の前後で `$TMPDIR` の件数を数えた**:
```
before=35909
run1: 14098ms  129 green, 0 red
run2: 12886ms  129 green, 0 red
run3: 12792ms  129 green, 0 red
after=35912  delta=3
```

**delta=3 の正体**: `paradise-conclave-*.json`(既存の `:667` が作る一時ファイル。
`mkdtempSync` ではなく `path.join(os.tmpdir(), 'paradise-conclave-'+rand+'.json')`)。
**新設 13 門の仕業ではない。**

**新設門が作る 6 接頭辞の残骸を個別に数えた**:
```
paradise-gauge-fp-   : 88   ← 既存の器。全て 9月16日 00:42 の古い残骸(今日の走行の分は 0)
paradise-sentinel-   : 0
paradise-w1-         : 0
paradise-dl-         : 0
paradise-dl2-        : 0
paradise-gauge-race- : 0
```
**新設 5 接頭辞すべて 0 件。`finally` の `rmSync` が効いている。**
(`paradise-gauge-fp-` の 88 件は昨日の別走行の残骸であり、今日の 3 連走では 1 件も増えていない。)

**env の復元と仮倉削除が門で守られているか** —— 撃って確かめた:
```
X6: withGaugeSandbox の rmSync を落とす      → CAUGHT red=1
X7: withGaugeSandbox の env 復元を落とす      → CAUGHT red=4
```
**両方 CAUGHT。衛生は主張ではなく門になっている ✅**

### 4.5 既存 CI 段の確認

| 段 | 結果 |
|---|---|
| `node tests/gauge-audit.test.js` | **6 passed, 0 failed, 0 skipped / exit 0** — 実台帳を本物として監査し緑 |
| `node graph/pulse.js snapshot --json` | exit 0 / `ledger rows=7` / **`healable` 欄の混入なし** |
| `node graph/export-state.js` | exit 0(ただし derived 二枚を汚す — §3【私の落ち度】) |
| `node graph/gauge.js score <run> --json` | exit 0 / `{"score":80,...}` **欄の構造は不変** |
| `node graph/gauge.js ledger`(重複台帳) | exit 0 / `(raw 2 行 / 重複 1 行を畳んだ …)` **人が読む道は不変** |
| `node graph/census.js check` | **未確認**(180 秒で timeout。§5 に記す) |

---

## 5. `graph/gauge.js` の八行 —— exit code は動いていないか

### 5.1 diff の全文(八行)

```diff
         const human = a.conflicts.length;
+        /** `healable` = 「掃除(FR-8)を掛ければ消える欠陥しか残っていない」(D-B γ)。
+         *  … **exit code は一切動かさない** —— 既存 5 門がこの規約を符号化している(第57条)。 */
+        const healable = human === 0;
+        if (argv.includes('--json')) console.log(JSON.stringify({ ...a, healable }));
         if (human > 0) { console.log(`  🔴 人が読むべき行が ${human} 件ある …`); process.exit(2); }
+        if (a.duplicates > 0) console.log('  🧹 機械が畳めば消える(競合の跡)— 人の手は要らない');
         process.exit(a.duplicates > 0 ? 1 : 0);
```

**読んで言えること**: `process.exit(…)` の二行は**一文字も変わっていない**。
足されたのは `const healable` / `--json` の一行 / `🧹` の一行だけ。**構造的に exit は動かない。**

### 5.2 四通りを仮倉で撃った実測(現行 vs HEAD)

仮倉に 4 種の台帳を立て、**現行の `gauge.js`** と **`git show HEAD:graph/gauge.js`** の両方で撃った:

| 入力 | 中身 | **現行 exit** | **HEAD exit** | 一致 | `--json` の `healable` |
|---|---|---:|---:|:---:|---|
| **健全** (v1) | 正規行 × 1 | **0** | **0** | ✅ | `true` |
| **重複** (v2) | 同一正規行 × 2 | **1** | **1** | ✅ | `true` |
| **事故** (v3) | 破損行 + 正規行 | **2** | **2** | ✅ | `false` |
| **両方** (v4) | 破損行 + 正規行 × 2 | **2** | **2** | ✅ | `false` |

**生出力(現行)**:
```
--- 健全 (v1) exit=0
📒 rows=1 distinct=1 duplicates=0 conflicts=0 too-deep=0 corrupt=0 suspect=0
  [--json exit=0] "healable":true

--- 重複 (v2) exit=1
📒 rows=2 distinct=1 duplicates=1 conflicts=0 too-deep=0 corrupt=0 suspect=0
  🧹 機械が畳めば消える(競合の跡)— 人の手は要らない
  [--json exit=1] "healable":true

--- 事故 (v3) exit=2
⚠️ ledger line skipped (corrupt): {"ts":"2026-01-01T00:00:00.000Z","slug":"coin","metr…
📒 rows=1 distinct=1 duplicates=0 conflicts=1 too-deep=0 corrupt=1 suspect=0
  ⚠️ 破損行: JSON として読めない — …(畳みでも掃除でも消してはならない)
  🔴 人が読むべき行が 1 件ある — 掃除では消えない
  [--json exit=2] "healable":false

--- 両方 (v4) exit=2
📒 rows=2 distinct=1 duplicates=1 conflicts=1 too-deep=0 corrupt=1 suspect=0
  🔴 人が読むべき行が 1 件ある — 掃除では消えない
  [--json exit=2] "healable":false
```

**生出力(HEAD)**:
```
--- 健全 (v1) HEAD exit=0 | 📒 rows=1 distinct=1 duplicates=0 conflicts=0 too-deep=0 corrupt=0 suspect=0
--- 重複 (v2) HEAD exit=1 | 📒 rows=2 distinct=1 duplicates=1 conflicts=0 too-deep=0 corrupt=0 suspect=0
--- 事故 (v3) HEAD exit=2 | 📒 rows=1 distinct=1 duplicates=1... (同上)
--- 両方 (v4) HEAD exit=2 | 📒 rows=2 distinct=1 duplicates=1 conflicts=1 too-deep=0 corrupt=1 suspect=0
```

**裁定: exit code は一切動いていない。4/4 で一致。第57条を守っている ✅**

**「両方」(v4) の観察**: 破損行と重複が同居すると exit **2**(事故が優先)、`🧹` は**出ない**、
`healable: false`。**これは AC-15 の表に無い第四のケースだが、規約から導かれる正しい挙動**である。
`--json` の `healable` を読む掃除スクリプトは v4 で正しく止まる。

### 5.3 `--json` の欄追加が下流を壊さないか(実際に走らせた)

| 下流 | 走らせた結果 | 判定 |
|---|---|---|
| `graph/pulse.js snapshot --json` | exit 0 / `ledger rows=7` / スナップショット JSON に `healable` の文字列が**一度も現れない** | ✅ **無関係**。`pulse` は `gauge.readLedger()` を**関数として**呼ぶので `--audit` の CLI 出力を一切見ない |
| `dashboard/paradise.js` / `control.html` | ソース検索: `healable` / `auditLedger` の参照 **0 件**。読むのは `snap.ledger` のみ | ✅ **無関係** |
| `graph/verdict.js` | `gauge.js score <run> --json` を食う。`ledger --audit --json` は**食わない**(grep 実測) | ✅ **無関係** |
| `graph/export-state.js` | exit 0 | ✅ |
| `gauge.js ledger`(人が読む道) | 重複台帳で `(raw 2 行 / 重複 1 行を畳んだ …)` **不変** | ✅ |
| `tests/gauge-audit.test.js` | **6 passed, 0 failed / exit 0** | ✅ |

**さらに、下流の契約を壊す変異を撃って門が鳴ることを確かめた**:
```
X10: --json の欄名を healable → heal_able に改名  → CAUGHT red=2
Y13: --json の行そのものを落とす                 → CAUGHT red=1
```
**欄の名前は門で凍結されている ✅**

**唯一の懸念(軽微)**: `--json` の一行は `process.exit` の**前**に置かれているので、
`human > 0` のときも `duplicates > 0` のときも必ず出る。**これは正しい。**
だが `--json` を渡しても**人が読む行が先に出る**(`📒 rows=…` と `⚠️ 破損行: …`)ので、
出力は**厳密な JSON ではない**。門 `:5182` が「`--json` が人の読む行を奪わない」を撃っているので
**これは意図された設計**だが、`jq` に直接パイプできない。
新設門の `js()` ヘルパーが `out.split('\n').find(l => l.trim().startsWith('{'))` で行を拾っているのは
その回避である。**掃除スクリプトを書く者は同じ回避を書かねばならない。**

---

## 6. 第62条の文面と実体の一致

条が「これを強制する門」として名指した三本を、**実在と鳴ることの両方**で確かめた。

| 条が名乗った門 | 実在 | 実際に鳴るか(実測) |
|---|:---:|---|
| **(b)** 実台帳の指紋を毎門で照合する**番兵** | ✅ `withGaugeSandbox` `:3503` の `finally` `:3522-3540` | Z1/Z1b/Z1c/Z1d/A1/A2/A3/A4/P1/P2/P3/X5 の **12 変異すべて CAUGHT** |
| **(a)** 競合下でも治癒が成立することを二プロセスで凍結する門 | ✅ `gauge(並行): …` `:6425` | R1/R2/R4/R5/R6/R7/X1/X2/X3 の **9 変異 CAUGHT**。**ただし R3 は SILENT**(§3【重大 C】) |
| **(c)** 台帳を書く engine の最上位に可変の大域が無いかをソースで読む門 | ✅ `gauge(静的): …` `:3855` | G4/N1/N2/N3/N4/N5/N6/X4/Z2再/L2/L1 の **11 変異 CAUGHT**。**ただし L3 は SILENT**(§3【重大 B】) |

**三本とも実在し、三本とも鳴る。** 条の主要な主張は真である。

**だが条の最後の一文は嘘である** —— 「**三本とも壊して鳴ることを別の門が撃つ(第21条)**」。
実測では **(b) だけが真**で、(a) は**外から撃つ門が 0 本**、(c) は**射程を撃つ門が 0 本**。
これは §3【重大 D】に記した。**条が嘘を名乗っているので、重大な欠陥として名指す。**

**併せて**: 条の (c) が「**台帳を書く engine**」と名乗っているのに対し、
実際の射程は `[gauge.js, spawn-trace.js]` である。`spawn-trace.js` は
`gauge-ledger.jsonl` を**書かない**(`run.json` を書く)。
**条の言葉と射程の実体がずれている。** 実害は小さいが、
「射程は名指しで狭く切れ」と命じた条自身が**射程の名を曖昧に語っている**。

---

## 7. 私が見ていないこと(第16条)

**この節は必須である。以下は撃っていない。私は「安全です」とは書かない。**

1. **全走 6 分を改修後の樹で通していない。**
   HEAD の複製で全走を撃ったが `465 passed, 5 failed` で終わった —— **その 5 本はすべて
   `.git` を除いて複製したことによる偽の赤**(`hermetic` が `git ls-files` を呼べない /
   `dashboard-no-deps` が同じ理由で落ちる / `B-10` が倉の印を見つけられない)であり、
   **改修とは無関係**である。だが**改修後の樹で `484 passed, 0 failed` を私自身は確かめていない。**
   教主の既測値を引き継いでいるだけである。`--gate` の絞込走行では **129/129 緑**を 6 回確かめた。

2. **`PARADISE_ABODE=repo` / `global` の二走を私は撃っていない。** 教主の既測値のみ。

3. **`node graph/census.js check` / `codex.js check` / `wiring.js check` / `hermetic.js check` を
   完走させていない。** `census.js check` が 180 秒で timeout し、以降を諦めた。
   **AC-16 の CI 段のうち 4 本は未確認である。**

4. **実際の ubuntu CI で走らせていない。** §4.3 の裁定は
   **本機(Windows / node v24.14.0)での実測からの推論**であり、CI の実測ではない。
   「本機で 104/104 競合が成立した」は「ubuntu で成立する」を意味しない。
   **spin barrier は絶対時刻で揃えるので機の速さに強いはずだ、というのは理屈であって実測ではない。**

5. **並列度 4 / 8 を撃っていない。** AC-14 の M2(治癒の N 非依存性)は
   design/build 相が測ったと言うが、**私は N=2 しか撃っていない。**
   `readLedger()` が N=4 でも 1 を返すかは、私の実測の外である。

6. **`--audit` の `too-deep` / `preemption-suspect` / `forged-fp` の三種で exit を撃っていない。**
   §5.2 は `corrupt` 一種でしか「事故 = exit 2」を確かめていない。
   既存門 `:5148-5153` が `forged-fp` と `too-deep` を撃っているので既存の被覆はあるが、
   **`healable` 欄がその三種でも `false` になるかは、`forged-fp` 一種しか撃っていない**
   (新設門 `:5178` が撃っている。`too-deep` と `preemption-suspect` は未確認)。

7. **掃除(FR-8)を実際に走らせていない。** AC-14 の M4(掃除の安全性)は未検証。
   `healable: true` を信じて掃除を掛けたら観測が消える、という道が残っていないかを
   **私は確かめていない。**

8. **`reform/silent-mutations/` の 6 枚の記録の内容を検証していない。**
   `findings.md`(730行)/ `requirements.md`(718行)/ `design.md`(1335行)/
   `build.md`(458行)/ `prove.md`(511行)のうち、**私が読んだのは requirements.md の AC 節と
   design.md/prove.md の該当箇所のみ**である。findings の 60 変異の実測値や、
   design の D-A〜D-L の裁定の妥当性は**審査していない。**

9. **`CONSTITUTION.INDEX.md` の 3 行と `README.md` の 1 行を検めていない。**
   `codex.js index --write` と `census.js fix` が生成したと記録にあるが、
   **私は生成器を走らせて一致を確かめていない**(§7-3 の timeout のため)。

10. **`withGaugeSandbox` を通らない gauge 節の門(129 − 番兵が覆う本数)がいくつあるか数えていない。**
    AC-1 は「番兵が覆う門の数 0 → 114」と測定可能性を書いたが、**私はこの 114 を検算していない。**

11. **番兵が実際に実台帳の汚染を捕らえる場面を、実台帳で見ていない。**
    偽の実台帳(複製の兄弟倉)では捕らえることを確かめたが、
    **本物の実台帳を汚す変異は戒め 1 のため撃っていない。** これは正しい判断だが、限界である。

12. **性能の測定は本機 1 台・各 3 回のみ。** 分散も信頼区間も出していない。
    「+2.46 秒」は中央値の差であり、**統計的な主張ではない。**

---

## 8. verify 相への申し送り(直すべきものを優先順で)

| # | 何を | なぜ(実測の根拠) | 手当ての案 | 重み |
|---|---|---|---|:---:|
| **1** | **第62条の最後の一文「三本とも壊して鳴ることを別の門が撃つ」を、実体に合わせて書き直す** | (a) と (c) を外から撃つ門は **0 本**(grep 実測)。R3 / L3 の二つの SILENT がまさにその層で出た | **二択**。(i) 文面を「番兵は別の門が撃つ。並行と静的は自分の中で壊して鳴らす —— **外から撃つ門は次の走行の残債(SM-?)である**」に直す(安い・誠実)。(ii) 門を二本足して条を真にする(高い)。**掟が嘘を名乗る方が害が大きいので (i) を先に、(ii) を残債に** | **重大** |
| **2** | **AC-13 の並行門の早期 return を撃つ歯を足す** | `if (raw < 2)` → `if (true)` が **SILENT**(単独で再現済)。本題の 5 つの assert が全部飛んでも 129 門緑 | Y11 と同じ作法: **判定を純関数に持ち上げる**。`raceVerdict(raw, folded, marks, auditCode, auditOut)` を作り、AC-2 の ⑥〜⑧ と同型に **(a) 純関数を直接撃つ + (b) 門の本文を読んで呼び出しが在ることを凍結する**。これなら遅い機でも歯が残る | **重大** |
| **3** | **AC-11 の静的門の射程を凍結する歯を足す** | `[GAUGE_JS, SPAWN_TRACE_JS]` → `[GAUGE_JS]` が **SILENT**(単独で再現済) | 一行で足りる: 門の本文に `assert.deepStrictEqual(SCOPE.map(p => path.basename(p)).sort(), ['gauge.js','spawn-trace.js'])` を置き、`const SCOPE = [GAUGE_JS, SPAWN_TRACE_JS]` を `mutableGlobals(SCOPE)` に渡す。**射程が定数になれば N18 / RACE_LEAD_MS と同じ「定数を凍らせる」作法に乗る** | **重大** |
| **4** | **AC-4 の空回りの assert を直す** | `/gauge-w1\.js\|FAKE-REAL/.test(bad.out + broken)` は `broken` のせいで**常に真**(実測で証明) | `+ broken` を外し、`bad.out` だけを検める。注入版が `LEDGER=` を出すので `assert.ok(/FAKE-REAL/.test(bad.out))` が正しく効く(W1 変異で CAUGHT を実測済) | **重大** |
| **5** | **AC-4 の門名を実体に合わせるか、番兵を本当に通す** | 門名は「**番兵が**名指す」と全称で語るが、`withGaugeSandbox` はこの門の中で一度も走らない | **二択**。(i) 名を `…を番兵の判定関数が名指す` に縮める(安い)。(ii) 注入版を `withGaugeSandbox` 越しに撃つ(重い・器の意味が変わる)。**(i) を推す** | 重大 |
| **6** | **AC-13 の門が「判定した」ことを名乗るようにする** | skip のときだけ名乗り、**判定したときは無言**。CI のログから「治癒が確かめられた」が読めない | `console.log('      · 競合成立(raw=2)— 畳みが 1 行に戻した')` を一行。**skip の頻度を後から数えるにはこの対の一行が要る**(第38条) | 軽微 |
| **7** | **AC-8 に CLI 経路(exit 2)の assert を足す** | AC-8 が明示的に要求したが**撃っていない**(grep 0 件)。足せば AC-9 との完全包含も解消する | 既存の `runGaugeGate` を一回呼び、exit 2 と `/先回り/` を撃つ。**+ 約 150ms** | 軽微 |
| **8** | **AC-11 の名指しを `path.basename` からフルパスに戻す** | 要件が `${f.file}` を指定。射程を広げた日に**どちらのファイルか分からなくなる** | 一語の差し替え | 軽微 |
| **9** | **`SM-L`(残債)の中身を書き留める** | 門のコメントは `hermetic.js` しか名指していない。**実測では `pulse.js` にも最上位 `let _gateCache` がある**(台帳を読む engine である) | 門のコメントか `design.md` の残債節に `pulse.js:_gateCache` を名指しで足す。第62条(c) の「射程の外は次の走行の残債として名を持て」を満たす | 軽微 |
| **10** | **要件の門数(14 / 485 / 130)を実体(13 / 484 / 129)に直す** | 要件が AC-1(器)を門として数えた。`census.js fix` が README を直しているので CI は緑だが、**要件と実体が食い違ったまま** | `requirements.md` AC-16 / NFR-1 の数を直す | 軽微 |
| **11** | **既存 `:3361` の決定性門に「こちらはコピー間」の一行を足す** | 新設 AC-10 と名前が似ており、将来「片方は要らない」と消されうる | コメント一行 | 好み |
| **12** | **`mutableGlobals` の assert メッセージを遅延評価にする** | `found` が空でも毎回 `map().join()` を構築 | `found.length ? … : ''` | 好み |
| **13** | **`export-state.js` を PR に含めないよう verify 相が確認する** | 私が審査中に走らせて `dashboard/state.json` / `state.js` を汚した(復元済) | `git status` が本走行の 5 ファイル + `reform/` のみであることを commit 前に確認 | 好み |

### verify 相が必ず自分で撃つべきこと(私が撃っていないので)

1. **改修後の樹で全走 3 本**(素 / `PARADISE_ABODE=repo` / `global`)。私は絞込走行しか撃っていない。
2. **`census.js check` / `codex.js check` / `wiring.js check` / `hermetic.js check` の 4 本**。
   私は `census.js check` の timeout で諦めた。
3. **並列度 4 / 8 での M2**(治癒の N 非依存性)。私は N=2 しか撃っていない。
4. **掃除(FR-8)を競合直後の台帳に掛けて distinct が減らないこと**(AC-14 の M4)。未検証。
5. **`too-deep` / `preemption-suspect` の `healable` が `false` であること**。`forged-fp` しか確かめていない。

---

## 9. 審査の裁定

**13 門は概ね AC を満たしている。** 15 本の AC のうち 9 本が完全に合致し、
うち 4 本は AC の要求を**超えて**いた(境界の追撃・対照群・字句器の罠・配線の凍結)。
故障注入 65 件のうち **63 件が鳴った(無音率 3.1%)** —— これは
`findings.md` が報告した本走行前の無音率 **23.3%** と比べて**明確な改善**である(第38条)。

**だが二つの SILENT は構造的である。** どちらも
「**前提が立たないとき緑で通す**」「**射程を狭めても緑で通す**」という
**新設門が自分で選んだ作法の内側にある盲点**であり、
第62条(a) が「作法はすべて盲点と対になっている」と書いたそのものである。
**条は盲点を語れと命じたが、条自身の三本の盲点は語られていない。**

**そして条の最後の一文は実体より大きい。** これが本審査で最も重い所見である。
第44条が戒めた「呼ばれない門は存在しないのと同じ」の、掟の側での再演 ——
**測られない主張を掟に書けば、次の走行はその嘘を土台にする。**

**致命は無い。** exit code は動いておらず、実台帳は不変であり、下流は壊れておらず、
所要は上限の 12% しか使っていない。**PR を止める理由は無い。**
だが **§8 の 1〜4 を verify 相が裁定するまで、この走行は「無音を塞いだ」と名乗るべきではない。**
自分の新しい門に無音が二つ残っているからである。

---

*審査に使った複製・変異ハーネス・実測ログ: `$LOCALAPPDATA/Temp/rv-*`(揮発)。*
*実台帳 sha256 `955ea34a02…5aab77` / 7 行 —— 審査の前後で不変。*
