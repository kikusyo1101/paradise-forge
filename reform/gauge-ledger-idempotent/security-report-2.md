# SECURITY 相 — 安全監査報告 attempt 2: gauge-ledger-idempotent

- **対象**: 枝 `fix/gauge-ledger-idempotent` / HEAD = `67b1064` / `graph/gauge.js` (615 行)
- **前提**: 自己診断 **394 passed / 0 failed** (清浄な環境で実測、§6.2)
- **監査者の規律**: 本相は**実装を直さない**。仮倉 `C:/Users/kikus/AppData/Local/Temp/sec2/*` で
  `PARADISE_CREATIONS` を振り替えて実撃した。**実台帳 (`../paradise-creations/gauge-ledger.jsonl`)
  には一度も書いていない。** リポジトリへの commit / push / PR は一切していない。
- **前任**: `security-report.md` (attempt 1) が S-1 / S-2 / S-3 を提起。build attempt 2 が
  `trueKey` / 深さの底 64 / 第55条(g) で修復したと主張する。**その主張を自分で撃ち直した。**

---

## 総括(先に結論)

| # | 件名 | 判定 |
|---|---|---|
| **S-1** | 偽 `fp` が本物の観測を飲み込む | ✅ **治癒を確認**(読み・書き・CLI・audit の**全4経路**で実撃) |
| **S-2** | `canonical()` の無制限再帰 | ✅ **治癒を確認**(深さ10万で倒れず)。幅・100MB行・NUL も耐えた |
| **S-3** | 「真正性の証明ではない」の否認が無い | ✅ **治癒を確認**(第55条(g) が明文で否認) |
| **F-1** | **`metrics` を持たない一行で `gauge.js ledger` が落ちる** | 🟠 **重大**(新規発見・修理が開けた面ではない**既存**の穴だが、本改修の畳みが素通しする経路で**到達しやすくなった**) |
| **F-2** | `ts` は指紋の材料でないため、**未来時刻の偽の観測**が `compare` を騙す | 🟠 **重大**(新しい攻撃面 — 「行が自らの指紋を名乗る」形式の構造的帰結) |
| **F-3** | 自己診断が `PARADISE_CREATIONS` に汚染される(緑が環境依存) | 🟡 **軽微** |
| A-1〜A-7 | 供給鎖 / 秘密 / prototype 汚染 / 注入 / 衝突 / 性能 / audit 目潰し | ✅ **受容**(実撃して危険なし) |

**致命(即座に台帳が壊れる・秘密が漏れる)は一件も無かった。**
S-1/S-2/S-3 の修理そのものは正しく、**修理が新しい穴を開けてはいない**。
ただし修理が「指紋 = 同一性」を導入したことで、**指紋の材料に入っていない `ts` が
無防備な軸として残った**(F-2)。これは修理の副作用ではなく、修理が
**初めて意味を持たせた軸**である。

---

## 1. 【治癒確認】S-1 — 偽 `fp` は全経路で効かない

前任の所見は「`e.fp || fingerprint(e)` が自己申告を先に採る」だった。
prove が N9 で**書き側の残存**を指摘しているため、読み側だけでなく
**record / CLI / audit の全経路**を撃った。

### 実撃 — 正当な観測 `score:100` に偽の鍵を載せた行をぶつける

```
$ export PARADISE_CREATIONS=C:/Users/kikus/AppData/Local/Temp/sec2/s1
$ node graph/gauge.js record run/conclave.json --slug victim
📒 recorded: victim → 100/100 (C:\Users\kikus\AppData\Local\Temp\sec2\s1\gauge-ledger.jsonl)

# 攻撃: victim の本物の fp (g1:b7cfcc3a8db340b8) を名乗りながら
#       中身は score:0 という別物の行を追記する
forged fp = g1:b7cfcc3a8db340b8

=== 3. READ path: 本物の観測は生き残るか ===
═══════ 📒 GAUGE LEDGER ═══════
  2020-01-01T00:00    0/100  victim (small)
  2026-09-08T07:59  100/100  victim (small)
═══════════════════════════════

=== 4. AUDIT path ===
📒 rows=2 distinct=2 duplicates=0 conflicts=1
  ⚠️ 矛盾: victim — 名乗る指紋 g1:b7cfcc3a8db340b8 が中身から導かれる g1:df521c7522e8cfa9 と食い違う (@ 2020-01-01T00:00:00.000Z, score 0)
audit exit=1

=== 5. WRITE path: 本物の走行を再 record — 偽行に抑止されるか ===
📒 already recorded: victim → 100/100 @ 2026-09-08T07:59:21.353Z (同一指紋 g1:b7cfcc3a8db340b8) — 追記しない
record exit=0
```

### 判定: **治癒している。四つとも合格。**

1. **読み側** — `score:100` の本物が**消えていない**。旧実装ならここで消えた。
2. **audit** — 偽の鍵を `conflicts=1` で**名指し**、`duplicates` には数えず、exit 1 で鳴った。
   前任が「audit はそれを『重複』としか呼ばなかった」と嘆いた点が正されている。
3. **書き側 (N9 の懸念)** — 5 の出力が肝心である。`record` が「already recorded」と
   言ったのは**偽行に騙されたからではない**。生の台帳の**第1行(本物)**が
   同じ材料を持つため正しく既記録と判定した。偽行は `trueKey` 再導出で
   `g1:df52…` になり、`entry.fp` (`g1:b7cf…`) と一致せず**突き合わせに使われていない**。
   `gauge.js:402` が `trueKey(e) === entry.fp` と書いており、
   **左辺が再導出・右辺が自分で今計算した値**である — 自己申告は式のどこにも現れない。
4. **CLI** — 上記はすべて子プロセスの CLI 経由の実測であり、module 直呼びではない。

念のため「偽行しか無い台帳」でも撃った(§1 の s1 仮倉から本物行を除いた形): 偽行は
`trueKey` が別の鍵を返すため `existing` に一致せず、**本物は必ず追記される**。
「偽の鍵一つで本物が二度と刻まれなくなる」という N9 の害は**成立しない**。

---

## 2. 【治癒確認】S-2 — 深さの底は効く。幅・巨大行・NUL も耐える

前任の指摘は深さのみだった。今回は**深さ・幅(object 鍵数 / 配列長)・巨大単一行・
不正 UTF-8・NUL バイト**の 5 方向から撃った。

### 2.1 深さ 10 万 + object 20 万鍵 + 配列 50 万要素(4.7MB)

```
bytes: 4778185
=== ledger ===
⚠️ ledger line skipped (too deep, > 64): {"ts":"2026-01-02T00:00:00.000Z","slug":"deep","scale":"s","…
═══════ 📒 GAUGE LEDGER ═══════
  2026-01-01T00:00  100/100  good (small)
  2026-01-03T00:00    2/100  wide (s)
  2026-01-04T00:00    3/100  arr (s)
═══════════════════════════════
real    0m0.701s
=== audit ===
⚠️ ledger line skipped (too deep, > 64): …
📒 rows=3 distinct=3 duplicates=0 conflicts=0
real    0m0.452s
```

**判定: 治癒。** 深さ 10 万の一行は `RangeError` を起こさず
`GAUGE_TOO_DEEP` で**名指されて読み飛ばされ**、他の 3 行は無傷で読めた。
**幅には底が無いが、幅は再帰しないので倒れない** — 20 万鍵 (`Object.keys().sort()`)
も 50 万要素の配列も 0.7 秒で通った。**幅に底を設ける必要は無い**(実測が根拠)。

> 余談として、私が最初にこの爆弾を**素の JS オブジェクトで組み立てようとした側**が
> `RangeError` で落ちた。攻撃者も同じ制約を受けるため、深い入れ子は
> 文字列として直接書くしかない。台帳が平文 JSONL である以上それは容易であり、
> ゆえに底は必要である —— 修理の判断は正しい。

### 2.2 100MB の単一行 / 不正 UTF-8 / NUL バイト(個別に隔離して撃った)

```
### vector=huge          (100MB の一行: {"metrics":{"score":1,"pad":"AAA…"}})
═══════ 📒 GAUGE LEDGER ═══════
  2026-01-01T00:00  100/100  good (small)
  2026-01-02T00:00    1/100  huge (s)
═══════════════════════════════
  exit=0
### vector=badutf8       (生バイト 0xFF 0xFE を含む行)
🔴 Cannot read properties of undefined (reading 'score')
  exit=2
### vector=nul           (slug と値に U+0000 を埋め込む)
═══════ 📒 GAUGE LEDGER ═══════
  2026-01-01T00:00  100/100  good (small)
  2026-01-03T00:00    5/100  nu\u0000l (s)
═══════════════════════════════
  exit=0
```

- **100MB 行**: 通った(0.96 秒)。`readFileSync` 全読み + `split('\n')` で
  一時的に約 200MB の常駐になるが、既定ヒープ内で完走する。**受容**(§5)。
- **NUL バイト**: 通った。`canonical` は `JSON.stringify(v)` で文字列を引用するため
  NUL は `\u0000` にエスケープされ、鍵を割らない。**危険なし。**
- **不正 UTF-8**: **落ちた。** ただし原因は UTF-8 ではない — §3 の F-1 である
  (`0xFF 0xFE` は `readFileSync('utf8')` で U+FFFD に置換され、その行は
  `{"ts":"￾￾"}` として **JSON.parse に成功**し、`metrics` 無しの行になる)。
  次節で最小再現に切り分けた。

---

## 3. 【重大】F-1: `metrics` を持たない一行で `gauge.js ledger` が落ちる

### 最小再現

```
$ printf '{"ts":"2026-01-01T00:00:00.000Z","slug":"good","scale":"s","metrics":{"score":100}}\n{"ts":"2026-01-02T00:00:00.000Z"}\n' > gauge-ledger.jsonl

$ node graph/gauge.js ledger
🔴 Cannot read properties of undefined (reading 'score')

$ node graph/gauge.js ledger --audit
📒 rows=1 distinct=1 duplicates=0 conflicts=0     ← 生き残る
$ node graph/gauge.js compare --last 3
═══════ 📒 GAUGE LEDGER ═══════
  2026-01-01T00:00  100/100  good (s)             ← 生き残る
═══════════════════════════════
```

### 所見

`renderLedger` (`gauge.js:529`) は

```js
if (e.error) { … continue; }
lines.push(`… ${String(e.metrics.score).padStart(3)} …`);
```

と書く。`e.error` **も** `e.metrics` **も持たない行**はこの二分岐のどちらにも
該当せず、`e.metrics.score` で `TypeError` になる。
`foldLedger` は `metrics` 無しの行を**意図的に `passthrough` として素通しする**
(`gauge.js:322` — 「別々の失敗が一つに見える」のを避けるため、正しい設計判断)。
その素通しされた行が、そのまま `renderLedger` の穴に落ちる。

### これは「修理が開けた穴」か

**厳密には違う。** `main` の `gauge.js:266-267` にも同一の二分岐がある:

```
$ git show main:graph/gauge.js | grep -n "e.error\|metrics.score"
266:    if (e.error) { lines.push(`  ✗ ${e.slug}: ${e.error}`); continue; }
267:    lines.push(`  ${e.ts.slice(0, 16)}  ${String(e.metrics.score)…
```

**既存の穴である。** ただし本改修が `passthrough` という
「`metrics` 無しの行を意識的に残す経路」を新設したことで、
**この行が `renderLedger` に到達することが設計上の常態になった**。
前任 attempt 1 はここを見ていない(`renderLedger` は報告に一度も現れない)。
prove の N16 は `latestFor` の同型の穴を塞いだが、`renderLedger` は塞いでいない。

### 影響範囲(実測して限定した)

```
$ node -e 'const g=require(".../gauge.js"); g.readLedger(); console.log("ok")'
readLedger ok (crash is in renderLedger, CLI-only)

# pulse / dashboard は落ちない — 自前で三項防御している
pulse ok, ledger rows=2
[{"ts":"2026-01-01…","slug":"good","scale":"s","score":100},
 {"ts":"2026-01-02…","score":null,"phasesDone":null,"phasesTotal":null}]
```

- `readLedger` / `foldLedger` / `auditLedger` / `compare` / `latestFor` は**全て無傷**。
- `pulse.js:431` が `r.metrics ? r.metrics.score : null` と自衛しているため
  **ダッシュボードは落ちない**(第16条どおり `null` で名指す)。
- 落ちるのは **`gauge.js ledger` と `gauge.js baseline` の画面だけ**。exit 2。

### 到達経路(現実に起こりうるか)

1. **不正 UTF-8 混入** — git のマージ・エディタの文字コード事故で `0xFF` が一つ入るだけ。
   実測でこの経路から落ちた(§2.2 の `badutf8`)。
2. **`baseline()` の失敗行** — `{slug, error}` は `e.error` があるので**安全**。
   ただし `error` が `undefined` や空文字になる版があれば落ちる。
3. **手編集 / 将来の版の行** — 台帳は平文であり、第55条(g) 自身が
   「人の手で書き換えられる器」と認めている。

### 分類: 🟠 **重大**(致命ではない)

- 台帳の**記録は失われない**(書き込み経路は無傷、読み取り専用の画面が落ちるのみ)。
- ダッシュボードは生き残る。ゆえに「秤全体が倒れる」S-2 とは害の重さが違う。
- しかし**一行の破損で `ledger` 画面が倒れる**のは、第55条(e)
  「一行の破損で秤全体を倒さない」が `readLedger` では守られ **`renderLedger` では
  守られていない**という不整合であり、S-2 の修理精神がここに届いていない。

### 助言(実装は次相に委ねる — 本相は直さない)

`renderLedger` の分岐を三分にする。`e.error` でも `e.metrics` でもない行を
**黙って捨てず**、`⚠️ <ts> (metrics 無し — 読み飛ばし)` のように**名指して**印字する
(第16条: 測れなかったものを 0 で埋めず名指す)。回帰門は
「`{"ts":"…"}` だけの一行を仕込んで `ledger` が exit 0 で他の行を印字する」で足りる。

---

## 4. 【新しい攻撃面の探索】行が自らの指紋を名乗る形式を悪用できるか

神託の 4 項目 (a)〜(d) を仮倉で個別に撃った。

### 4.1 (a) 正当な観測を消せるか → **不可**

§1 が答えである。偽の鍵を名乗る行では本物は消えない。
**別方向も撃った**: 「本物と同じ材料を持つ行を先の `ts` で置く」——
これは `keep-first` により古い方が残るが、**materials が同一なので中身も同一**であり、
消えるのは重複だけで情報は失われない。**害なし。**

### 4.2 (b) 門を騙せるか → **可能。これが F-2(重大)。**

指紋の材料は `slug` + `scale` + `metrics` の三つに固定され、
**`ts` は意図的に除かれている**(そうしないと冪等性が成り立たない — 設計は正しい)。
帰結として、**`ts` は誰の検証も受けない自由な軸**になる。

#### 攻撃 1 — 旧観測の再生(replay)

古い `score:80` の行を `ts` だけ未来にして置き直す。**`fp` は正直**(材料が同じなので
再導出しても一致する)。

```
planted: honest 80@2026-01, 100@2026-06, REPLAY 80@2099-01
=== audit ===
📒 rows=4 distinct=3 duplicates=1 conflicts=0
audit exit=1                                   ← 鳴った
=== compare base vs proj ===
  score                   50        100   +50 ⬆ 改善   ← 真実が守られた
```

**防げている。** `foldLedger` が同一材料を畳んで `keep-first` (ts 最小) を残すため、
`ts` を未来にずらしても**古い行が勝ち**、`latestFor` は正しい `100` を返した。
`duplicates=1` / exit 1 で audit も鳴る。**畳みが replay 耐性を副産物として与えている。**

#### 攻撃 2 — 捏造(fabrication): 材料ごと作り直した自己整合な偽行

`fp` を**正直に**計算した、しかし**存在しない走行**の行を未来の `ts` で置く。

```
# 真実: proj は 2026-06 に 100 点だった
# 攻撃: score:10 / reworkCount:3 の自己整合な行を 2099-01 に置く

=== audit ===
📒 rows=3 distinct=3 duplicates=0 conflicts=0
audit exit=0                                   ← ★ 鳴らない

=== compare base vs proj ===
  metric                base       proj   Δ
  score                   50         10   -40 ⬇ 悪化   ← ★ 嘘が通った
  reworkCount              0          3   +3 ⬇ 悪化
```

**通った。** `latestFor` は「`ts` の最大」を最新とするため、
**未来の `ts` を名乗るだけで任意の点数を「最新」にできる**。
`fp` は材料の関数なので、材料ごと捏造した行は**完全に正直な指紋**を持ち、
`auditLedger` の `forged-fp` 検査は**原理的に反応しない**(検査しているのは
「行が自分と矛盾していないか」であって「行が現実と対応するか」ではない)。

#### なぜこれが「新しい」攻撃面か

改修**前**、台帳には鍵が無く、`compare` は事実上「台帳に在るものを信じる」器だった。
改修**後**、第55条(g) が「engine は格納された鍵を判断に用いてはならない、常に導き直す」
と定め、audit が exit 1 で鳴る門になった。この門の存在が
**「audit が緑 = 台帳は健全」という新しい期待**を生む。
`ledger --audit` は CI に載る門であり、緑は「重複も矛盾も無い」としか意味しないのに、
**「台帳の内容が信頼できる」と読まれる**。攻撃 2 はまさにその隙間を通る。

第55条(g) 自身が「指紋は真正性の証明ではない」と否認している(S-3 の治癒 = §5)ので、
**憲法は嘘をついていない**。危険なのは `--audit` の**画面**の方である:
`conflicts=0` としか書いておらず、「何を検査していないか」を名乗らない。

#### (c) audit を永遠に赤/緑に固定できるか → **赤は可能、緑は不可**

- **永遠に赤**: 偽 `fp` の行を一つ置けば `conflicts` が立ち続ける。
  ただし**これは門の正しい動作**であり、除去は行を消すだけでよい(可視・訂正可能)。
  DoS としては弱い。**受容。**
- **永遠に緑(危険な方)**: **不可**。目潰しを試みた ——
  「深すぎる行を詰めれば `distinct` が水増しされ、本物の重複が `duplicates` から消えるか」:

```
### A: 本物の重複のみ
📒 rows=2 distinct=1 duplicates=1 conflicts=0   exit=1
### B: 同じ重複 + 深すぎる詰め物を 1 行
📒 rows=2 distinct=1 duplicates=1 conflicts=0   exit=1
```

  `auditLedger` は `tooDeep` を `distinct` に**足し**、かつ `conflicts` に
  `kind:'too-deep'` として**別途名指す**(prove の N11 が塞いだ箇所)。
  詰め物では重複を隠せない。**目潰しは成立しない。**

### 4.3 (d) ダッシュボードに嘘を表示させられるか → **F-2 の帰結として可能**

`pulse.js:428` が `gauge.readLedger()` の畳んだ行をそのまま断面に載せ、
`ts` を「台帳が記録した時刻をそのまま。再計算しない」と明記して転記する。
ゆえに §4.2 の攻撃 2 の偽行は**そのまま画面に出る**。
ただしこれは F-2 と同一の根であり、独立した欠陥ではない。
**F-1 の側(落とす方)はダッシュボードに届かない**ことは §3 で実測済み。

### F-2 の分類: 🟠 **重大**(致命ではない)

- **前提が高い**: 攻撃者は既に台帳ファイルへの書き込み権を持つ。
  その権限があれば行の**削除**もできるので、「捏造」は権限の増幅ではない。
- **記録は失われない**: 本物の行は残り続ける(`ledger` の一覧に出る)。嘘は**上書きではなく追記**。
- **検知可能**: `git log -p` で台帳の履歴を見れば偽行の混入は分かる(台帳は git 管理下)。
- しかし**自動の門はどれも鳴らない**ため、「audit 緑」を根拠に改善/悪化を語ると騙される。
  第38条(改善は前後の数値で証明する)の**土台が偽造可能**である点で重い。

### 助言(実装は次相に委ねる)

1. **`--audit` の画面が「検査していないこと」を名乗る。**
   `conflicts=0` の下に一行 —— 「※ 指紋は同一性のみを裁く。行が現実の走行に
   対応するかは検査していない(第55条 g)」。**最小の変更で最大の効果**であり、
   これだけで「緑 = 信頼できる」という誤読が消える。
2. **未来の `ts` を名指す**(任意)。`ts > now` の行を `kind:'future-ts'` として
   `conflicts` に挙げる。捏造は防げないが、最も安価な捏造(未来時刻で最新を奪う)は塞がる。
   ただし**時計のずれで偽陽性が出る門**になるため、採るなら十分な猶予(例: +24h)が要る。
   **私はこれを強く推さない** —— 鳴りっぱなしの門は `auditLedger` 自身のコメントが戒めている。
3. 根本解(HMAC 等での真正性)は**推さない**。鍵の管理が新しい攻撃面を生み、
   「台帳は人が読める平文の器」という第30条の性格と衝突する。
   **否認を明示する(1) が正しい落としどころ**である。

---

## 5. 【治癒確認】S-3 — 否認は明文で入った

```
$ node graph/codex.js article 55
    (g) **指紋は同一性の鍵であって、真正性の証明ではない。** 台帳は人の手で
    書き換えられる平文の器であり、**行が名乗る `fp` は検証されるまで自己申告である**。
    `sha256` を用いるのは鍵の衝突を避けるためであって、改竄を検知するためではない。
    ゆえに engine は**格納された鍵を判断に用いてはならない** —— 常に中身から
    導き直す。`e.fp || fingerprint(e)` のように自己申告を先に採る式は、
    偽の鍵一つで**本物の観測を黙って飲み込む** …
```

**判定: 治癒。** 前任が求めた「暗号ハッシュ = 改竄検知と読まれうる」への否認が
条文として存在し、しかも**なぜそうなるか**(平文の器・自己申告)まで書かれている。
§4.2 で見つけた F-2 は、**この条文が正しく予言していた事象**である ——
憲法は嘘をついていないが、`--audit` の**画面**がこの否認を反映していない(§4 助言 1)。

---

## 6. 供給鎖・依存・注入・秘密

### 6.1 【受容】A-1: 新規の外部依存はゼロ

```
$ git diff main...HEAD -- package.json
(空 — 差分なし)

$ git diff main...HEAD -- graph/gauge.js | grep "^+" | grep "require("
+const crypto = require('crypto');   // Node 標準。外部依存はゼロのまま(指紋 = sha256)
```

**唯一の新しい `require` は Node 標準の `crypto`。** 供給鎖は一切広がっていない。

### 6.2 【受容】A-2: `execFileSync` にコマンド注入の余地は無い

新規テストの子プロセス起動を全て実読した(9 箇所):

```
+    const out = execFileSync(process.execPath, ['-e', script], …
+    const r = execFileSync(process.execPath, [WORKSPACE_JS, 'check'], …
+    const cli = () => execFileSync(process.execPath, [GAUGE_JS, 'record', run, '--slug', 'coin'], …
+    const out = execFileSync(process.execPath, [GAUGE_JS, 'compare', '--last', '3'], …
+      const out = execFileSync(process.execPath, [GAUGE_JS, 'ledger', '--audit'], …
+    const r = require('child_process').spawnSync(process.execPath, [GAUGE_JS, 'ledger'], …
```

- **全て `execFileSync` / `spawnSync` であり `exec` / `execSync` は一つも無い** ——
  シェルを経由しないので、メタ文字によるコマンド注入は**構造的に不可能**。
- 実行ファイルは `process.execPath`(現在の node の絶対パス)固定。`PATH` 探索に依存しない。
- 引数は**すべてリテラル**か、テスト内で組んだ一時パス。外部入力・台帳の内容・
  `slug` が引数に流れる経路は無い。`'-e', script` の `script` もテスト内のリテラル文字列。
- **判定: 注入の余地なし。**

### 6.3 【受容】A-3: 差分に秘密は無い

```
$ git diff main...HEAD | grep -inE "(api[_-]?key|secret|token|passwd|password|BEGIN .*PRIVATE KEY|ghp_|sk-|AKIA)"
505:+      "No secrets in code; security is reviewed, never assumed."     ← lessons の文言
2096:+      "No secrets in code; security is reviewed, never assumed."    ← 同上
3876:+$ git diff main...HEAD | grep -inE "token|secret|…"                 ← 前任報告書に載る grep 文字列自身
3877-3879, 3919, 3107, 5138: 同様(報告書の引用 / verdict の 0 件フィールド)
```

**鍵・トークン・資格情報は一件も無い。** 全て「秘密を置くな」という**教訓の文言**か、
前任の報告書が自分の grep コマンドを引用した行である。

### 6.4 【受容】A-4: 絶対パスは在るが、漏れる個人情報は「ユーザ名 `kikus`」のみ

```
$ git diff main...HEAD | grep -in "C:[\\\\/]Users[\\\\/]"
540, 566, 592, 777, 787, 802:  conclave.json の artifactPath (走行帳の構造上必要)
1414, 1687, 1994, 2475, 2491, 3814, 3839: 各報告書が実測した住所を引用
1433, 3018, 3414, 3548, 3764, 3914: 再現用コマンドの cwd / 仮倉のパス
```

- 混ざっているのは `C:/Users/kikus/…` の形の**ユーザ名 `kikus`** のみ。
  リポジトリは既にこの名を随所に持ち(`CLAUDE.md` が `kikus` を名指す)、
  **本改修が新たに露出させた個人情報は無い**。
- `.env` は差分に**一度も現れない**(読み書きとも無し)。
- **判定: 受容。** ただし公開リポジトリであれば `artifactPath` を相対にする価値はある
  (本改修の責任範囲外 — `conclave.js` の既存仕様)。

### 6.5 【受容】A-5: prototype 汚染は通らない

台帳の行に `__proto__` / `constructor.prototype` を仕込んで実撃した:

```
rows=2
Object.prototype.polluted = undefined
Object.prototype.pwn      = undefined
audit: {"rows":2,"distinct":2,"duplicates":0,"conflicts":[]}
```

`JSON.parse` は `__proto__` を**通常の own property** として置き、
`canonical` は `Object.keys()`(own enumerable のみ)を回り、
`foldLedger` は `Map` を使う(`{}` を辞書に使わない)。**汚染は成立しない。**
前任 A-2 の結論を独立に再現できた。

### 6.6 【受容】A-6: 64bit 切り詰めの衝突は実用範囲で発生しない

```
$ 20 万件の相異なる metrics で指紋を総当たり
collisions in 200k distinct metrics: 0
```

誕生日限界は 2^32 ≒ 43 億件。実台帳は 30 行、10^5 行でも衝突確率は約 5×10^-10。
**受容**(前任 A-1 と同結論、実測で裏付け)。

---

## 7. 【受容/軽微】供用の危険 — 実測値

`PARADISE_CREATIONS` を仮倉に振り替え、行数を変えて実測した(node v24.14.0)。

| 台帳の行数 | ファイル | `ledger` 全体 | `ledger --audit` | `readLedger(raw)` | `foldLedger` | heapUsed / rss |
|---|---|---|---|---|---|---|
| 1,000 | 244 KB | 0.07 s | 0.06 s | 14 ms | 4 ms | 6.0 MB / 81.8 MB |
| 10,000 | 2.4 MB | 0.17 s | 0.13 s | 50 ms | 34 ms | 18.0 MB / 100.8 MB |
| **100,000** | **24.4 MB** | **1.23 s** | **0.82 s** | **413 ms** | **327 ms** | **70.5 MB / 201.8 MB** |

```
=== record against 100k ledger ===
📒 recorded: newone → 100/100 (…\sec2\perf\gauge-ledger.jsonl)
  record wall=0.79s
```

### 判定: 【受容】。**実台帳は 30 行であり、危険は三桁遠い。**

- **`readFileSync` 全読み**: 100k 行 = 24 MB で rss 202 MB。線形であり、
  既定ヒープ(~4GB)まで**約 200 万行 / 500MB** の余裕がある。
- **`trueKey` の常時再導出**: `foldLedger` が 100k 行で 327 ms。
  sha256 は 1 行あたり **約 3.3 マイクロ秒**。「常に再導出する」という S-1 の
  修理方針の代償は**実測で無視できる**。設計コメントの「10^4 行で無視できる」は正しい。
- **`record` の O(N×台帳)**: 100k 行の台帳に 1 行足して 0.79 秒。
  `record` は走行の完了時にしか呼ばれないため、この頻度で 1 秒は許容。
- **`foldLedger` のメモリ**: 100k 行(重複を畳んで 15,150 行)で heapUsed 70.5 MB。
  `Map` に entry の**参照**を持つだけで複製しないため、行数に線形で増える定数は小さい。
- **100MB の単一行**でも既定ヒープで完走(§2.2)。

**将来の閾値の目安**: 台帳が **50 万行(120MB)** を超えたら
`readFileSync` を行ストリームに変える価値が出る。それ以前は**不要な最適化**である。

---

## 8. 【軽微】F-3: 自己診断が `PARADISE_CREATIONS` に汚染される

```
# 私の仮倉の環境変数が残ったまま自己診断を回すと:
Paradise self-test: 393 passed, 1 failed
  ✗ AC-14b: runs.length == 実在する conclave.json の数     0 !== 1
  ✗ D-3(故障注入): report にパスを渡すと total=0 になり…    run が 1 件も無い
  ✗ M-3: --scale を明示したら admit は…                     Unexpected end of JSON input

# 環境変数を落とすと:
Paradise self-test: 394 passed, 0 failed
```

### 所見

`dashboard-run-panel` / `pontiff-seat` 系の門が **`PARADISE_CREATIONS` が指す実倉に
`conclave.json` が在ること**を暗黙に前提としている。仮倉を指すと緑が崩れる。

- **本改修が持ち込んだ欠陥ではない**(gauge の門は全て仮倉で正しく緑になった —
  むしろ gauge 系の新設 59 門は**環境変数に対して健全**である)。
- しかし**緑が環境に依存する**のは第37条(不在は通過ではない)の精神に反する。
  CI が別の倉を指した瞬間、無関係な 3 門が赤くなる。
- 実害は低い(CI は素の環境で走る)。**分類: 🟡 軽微。**

### 助言

該当の門は「倉に run が 0 件」を **skip でも fail でもなく `測れなかった` と名指す**か、
自前の一時倉を用意して環境変数の影響を受けないようにする(gauge の新門がやっているとおり)。
**本改修の範囲外**であり、別の reform に回すのが筋である。

---

## 9. 見ていない項目(正直に)

- **並行書き込み(競合)**: 二つの `record` が同時に `appendFileSync` した時の行の
  インターリーブは**撃っていない**。`appendFileSync` は単一 write システムコールに
  なるため 4KB 未満の行は原子的だと**期待される**が、Windows 上で実測していない。
  台帳の行は約 250 バイトなので現実の危険は低いと**推測する**(測っていない)。
- **git マージ衝突マーカー(`<<<<<<<`)を含む台帳**: 前任が撃った領域であり、
  今回は再現していない(`JSON.parse` が失敗し破損行として読み飛ばされるはず)。
- **`pulse.js serve` の HTTP 面**: ブラウザを起動して実画面を見ていない。
  §4.3 の「嘘が画面に出る」は `pulse` の断面 (`snapshot`) を module として
  直接呼んだ実測に基づく判定であり、**描画された画面そのものは見ていない**。
- **`spawn-trace.js` / `workspace.js` 側の攻撃面**: 本改修が触っていないため範囲外とした。
- **`baseline()` の実行**: 実倉を書き換える恐れがあるため**一度も走らせていない**。
  `renderLedger` の穴(F-1)が `baseline` の画面にも及ぶことはコード読解による判定であり、
  実撃していない。
- **CONSTITUTION.md の他の条との整合**: 第55条(g) の文面のみ確認し、
  他条との矛盾は検査していない(`codex.js check` を走らせていない)。

### 監査中に観測した、私の作業ではない変化(報告のみ)

監査の途中で作業ツリーに以下が現れた。**私は一度もリポジトリに書いていない**
(全ての実撃は `C:/Users/kikus/AppData/Local/Temp/sec2/*` の仮倉で行った)。
**並行して走っている別相のものと判断し、一切触っていない。**

```
$ git status --short
 M README.md                                        ← gauge の記述が追記されている
 M reform/gauge-ledger-idempotent/conclave.json      ← 監査開始時から既に M
?? reform/gauge-ledger-idempotent/README.md          ← 17:04 に出現
```

---

## 10. 走らせた命令の一覧(再現用)

```bash
# 全て仮倉。実台帳には一度も書いていない。
export PARADISE_CREATIONS=C:/Users/kikus/AppData/Local/Temp/sec2/<case>
G=C:/Users/kikus/Documents/workspace/paradise/graph/gauge.js

# S-1: 偽 fp を四経路に撃つ
node "$G" record run/conclave.json --slug victim
#   → 偽 fp 行を追記 → ledger / ledger --audit / record を再実行

# S-2: 深さ10万・object 20万鍵・配列50万・100MB行・不正UTF-8・NUL
node "$G" ledger ; node "$G" ledger --audit

# F-1 最小再現
printf '{"ts":"…","slug":"good","scale":"s","metrics":{"score":100}}\n{"ts":"…"}\n' > gauge-ledger.jsonl
node "$G" ledger            # → 🔴 Cannot read properties of undefined (reading 'score')

# F-2: replay(防げる) と fabrication(通る)
node "$G" ledger --audit ; node "$G" compare base proj

# audit 目潰しの試み(不成立)
node "$G" ledger --audit    # A: 重複のみ / B: 重複 + too-deep 詰め物

# 供給鎖・秘密
git diff main...HEAD -- package.json
git diff main...HEAD -- graph/gauge.js | grep "^+" | grep "require("
git diff main...HEAD | grep -inE "(api[_-]?key|secret|token|…|AKIA)"
git diff main...HEAD | grep -in "C:[\\\\/]Users[\\\\/]"

# prototype 汚染 / 衝突
node -e '… __proto__ を仕込んで readLedger → Object.prototype を検査'
node -e '… 20万件の指紋を総当たりして衝突を数える'

# 性能(1k / 10k / 100k 行)
node "$G" ledger ; node "$G" ledger --audit ; node "$G" record …

# 自己診断
node tests/paradise.test.js        # 素の環境: 394 passed, 0 failed
```

---

## 11. 判定

**S-1 / S-2 / S-3 はいずれも治癒している。** 修理の実装(常に再導出する `trueKey`・
深さの底 64・第55条(g))は、私が独立に組んだ攻撃に対して正しく機能した。
**修理が新しい穴を開けてはいない。**

次相への引き継ぎ(重い順):

1. **F-2(重大)** — `ledger --audit` の画面に「指紋は同一性のみを裁く。行が現実の
   走行に対応するかは検査していない(第55条 g)」の一行を足す。
   **一行の変更**で「audit 緑 = 台帳が信頼できる」という誤読が閉じる。
   時刻の門(`future-ts`)は偽陽性の危険があるため**推さない**。
2. **F-1(重大)** — `renderLedger` の二分岐を三分にし、`metrics` も `error` も
   持たない行を**名指して読み飛ばす**。回帰門は 1 本で足りる。
   これは `main` から在る既存の穴だが、本改修の `passthrough` が到達を常態化させた。
3. **F-3(軽微)** — 自己診断の `PARADISE_CREATIONS` 非依存化。**別の reform に回すべき。**

供給鎖(外部依存ゼロ)・秘密(無し)・注入(不可)・prototype 汚染(不可)・
衝突(実用範囲で無し)・性能(実台帳の三桁先まで余裕)は**すべて受容**。
**致命は一件も無い。**
