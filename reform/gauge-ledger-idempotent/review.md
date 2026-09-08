# REVIEW — gauge 台帳の冪等化 (gauge-ledger-idempotent)

- 相: **REVIEW(コードレビュー)**。本相では `graph/gauge.js` / `tests/paradise.test.js` を
  **恒久的には一行も変更していない**(変異注入の際に一時的に書き換えたが、各回 `git checkout -- graph/gauge.js`
  で復元し、最後に `git status --short` が空であることを実測した — §0.2)。
- 対象: 枝 `fix/gauge-ledger-idempotent` の 2 commit
  (`a3f4229` 実装 + 第55条 / `5278887` 門 24 件)。差分は `git diff main...HEAD`(10 files, +2945 / -12)。
- 先行文書は全文既読: `discovery.md`(394行)/ `requirements.md`(410行, FR-1〜9・AC 40件・NG-1〜10)/ `design.md`(795行)。
- 実測環境: `node -v` → **v24.14.0** / 枝 `fix/gauge-ledger-idempotent`。
- **本書の全ての判定は、私がこの相で走らせたコマンドの実出力に根拠を持つ。**
  見ていない項目は「見ていない」と書く。緑で埋めない。

---

## 0. 総評

**結論: 設計に忠実で、質の高い実装である。致命的欠陥は無い。ただし門には実測された穴が 8 つある。**

指紋の中核(材料の固定 / 鍵順非依存 / `ts` 非依存 / `fp` を材料から外す)は設計 §2 のとおりに実装され、
その全てが**変異注入で実際に鳴ることを確かめた**。foldLedger は O(n) であり、
readLedger の既定畳みによる下流(pulse / dashboard)の破綻も**実際に走らせて無いことを確認した**。

一方、**20 個の変異のうち 8 個が 24 門をすり抜けた**。とくに canonical の
`NaN → null`(第16条の心臓)、`-0` の畳み、`toFixed(6)` の丸め、同時刻 tie-break、
`fp` の自己参照除外 — **設計 §2.2 が最も力説した 5 つの規則のうち 4 つに門が無い**。
これらは「コメントで宣言されているが機械が守っていない」状態である。

さらに `ledger --audit` は **FR-8 の掃除を完了させても exit 1 のまま鳴り続ける**(実測)。
「鳴りっぱなしの門は無視される」と実装自身のコメントが警告している性質に、実装自身が該当している。

| 重大度 | 件数 | 概要 |
|---|---:|---|
| 致命 | **0** | — |
| 重大 | **3** | R-1 門の穴8件(第16条の規則に門が無い)/ R-2 audit が掃除後も鳴り続ける / R-3 record が O(n) で台帳と共に劣化 |
| 軽微 | **5** | R-4 fail-open は実際には成立しない / R-5 audit が正当な改善を「矛盾」と呼ぶ / R-6 `raw:` 名前空間の衝突 / R-7 死んだコード / R-8 ledger がファイルを二度読む |
| 好み | **3** | R-9 canonical の Date / R-10 CI に audit の口が無い / R-11 コメント密度 |

**自明な誤植・壊れた参照は一件も見つからなかったので、微修正も行っていない。**

---

## 0.1 走らせた命令と実出力(証拠。これ以外を根拠にしていない)

```
$ node tests/paradise.test.js
Paradise self-test: 368 passed, 0 failed            ← 344 → 368 (+24)。AC-9a 充足

$ node tests/dashboard-count.test.js
dashboard-count: 15 passed, 0 failed                ← AC-22b(ledger.length 一致)緑

$ node tests/dashboard-run-panel.test.js
dashboard-run-panel: 16 passed, 0 failed            ← AC-9b / AC-22b 緑

$ node <24門だけを切り出した抜粋>
gauge gates: 24 passed, 0 failed

$ node graph/codex.js article 55                    → exit 0(第55条は引ける)
$ diff <(node graph/codex.js index) CONSTITUTION.INDEX.md → 差分なし(索引は生成物と一致)
$ node graph/gauge.js ledger --audit
📒 rows=30 distinct=6 duplicates=24 conflicts=1
  ⚠️ 矛盾: reform-eval-gauge — score,firstPassRate が食い違う (…:80 vs …:100)
exit=1
```

## 0.2 変異注入(自分で実装を壊し、門が鳴るかを実測した)

`graph/gauge.js` に 20 種の変異を一つずつ入れ、24 門を走らせ、**毎回 `git checkout -- graph/gauge.js` で戻した**。
最後に `git status --short` を撃ち、`graph/gauge.js` が**一行も汚れていない**ことを確認済み
(出力は ` M reform/gauge-ledger-idempotent/conclave.json` のみ = 走行帳。engine は無傷)。

| # | 注入した欠陥 | 結果 | 鳴った門 |
|---|---|---|---|
| M1 | `canonical` の `Object.keys(v).sort()` から `.sort()` を外す | 🔔 1門 | AC-1b |
| M2 | **非有限を `'null'` でなく `'0'` にする(第16条違反)** | ❌ **無音** | — |
| M3 | **`-0` の畳みを外す** | ❌ **無音** | — |
| M4 | **`toFixed(6)` の丸めを外す** | ❌ **無音** | — |
| M5 | keep-first → keep-last | 🔔 2門 | AC-3b / AC-5c |
| M6 | **同時刻 tie-break を `return 0` で殺す** | ❌ **無音** | — |
| M7 | **metrics なし行を畳みで落とす(行落ち)** | ❌ **無音** | — |
| M8 | 指紋の材料から `scale` を落とす | 🔔 1門 | AC-1b |
| M9 | 指紋の材料から `metrics` を落とす | 🔔 8門 | AC-1b/3a/3b/5b/6b/7a/7b/NFR-1 |
| M10 | 指紋の材料に `ts` を混ぜる | 🔔 13門 | AC-1a〜NFR-1 の広範 |
| M11 | **`fp` 自身を材料に含める(AC-5c の成立条件を壊す)** | ❌ **無音** | — |
| M12 | 版接頭辞 `g1:` を落とす | 🔔 1門 | AC-1a |
| M13 | 指紋を 16 桁 → 2 桁に切る | 🔔 1門 | AC-1a |
| M14 | `readLedger` が `raw` を無視して常に畳む | 🔔 5門 | AC-3a/3d/4c/7b/NFR-1 |
| M15 | **`record` の fail-open を `throw` に変える** | ❌ **無音** | — |
| M16 | `record` が既記録でも append する | 🔔 3門 | AC-2a/2b/2d |
| M17 | **audit の判定鍵を `COMPARE_KEYS` → `['score']` に縮める** | ❌ **無音** | — |
| M18 | audit の矛盾検出を丸ごと殺す | 🔔 1門 | AC-7b |
| M19 | `latestFor` の `null` 返しを捏造値に変える | 🔔 1門 | AC-4b |
| M20 | 破損行の読み飛ばしを `throw` に変える | 🔔 3門 | AC-6a/6b/6c |

**12/20 は鳴る。8/20 は無音。** 無音の 8 件が R-1 の根拠である。

---

## 1. 指紋(fingerprint / canonical)—— 設計 §2 との照合

### 見て、正しかったもの(実測済み)

`node -e` で撫でた実出力:

```
null    g1:86d427caef1855c7      NaN     g1:86d427caef1855c7   ← NaN は null と同値。0 とは別。第16条 ✓
Inf     g1:86d427caef1855c7      -Inf    g1:86d427caef1855c7
zero    g1:6578d1faebb07d8e                                    ← 0 は別の鍵 ✓
undef   g1:6c2e9f0168b8ce8b      missing g1:6c2e9f0168b8ce8b   ← undefined の鍵は落とす = 鍵が無いのと同値 ✓
-0 と 0 → 同一鍵 ✓
0.1+0.2 と 0.3 → 同一鍵 ✓(toFixed(6) が効いている)
scale: 無し / null / undefined → 三つとも同一鍵 ✓(?? null が効いている)
metrics: 無し / null → 同一鍵 ✓
fingerprint(undefined) / (null) / ({}) → 三つとも同一鍵、例外を投げない ✓
```

**設計 §2.2 の表と実装 `graph/gauge.js:212-231` は完全に一致する。** 鍵順依存(M1)も実測で鳴る。
- 鍵順非依存: `tests/paradise.test.js:3101-3106` が `Object.keys(...).reverse()` で撃っており、**本物の門である**。
- `ts` 非依存 / 材料三点の各々が鍵を動かすこと: 同 `3092-3100`。**M8/M9/M10 で鳴ることを実測**。

### 【重大】R-1 設計 §2.2 が力説した規則の 4/5 に門が無い

**ファイル**: `graph/gauge.js:216-220`(canonical の数値枝)、`graph/gauge.js:281-284`(tie-break)、
`graph/gauge.js:246-253`(材料に `fp` を含めないこと)。

実装のコメント(`gauge.js:199-208`)は
「**非有限は `"null"` — 第16条。測れなかったものを 0 で埋めない**」
「`-0` は `0` に畳む」「`toFixed(6)` で丸める」と宣言している。
`design.md:149-163` も同じ 3 点を設計の核として書いている。**そのどれにも門が無い。**

**再現手順**:
```bash
cd C:/Users/kikus/Documents/workspace/paradise
# M2: 第16条違反を注入
python -c "import io;p='graph/gauge.js';s=io.open(p,encoding='utf-8').read();
s=s.replace(\"if (!Number.isFinite(v)) return 'null';\",\"if (!Number.isFinite(v)) return '0';\",1);
io.open(p,'w',encoding='utf-8',newline='').write(s)"
node tests/paradise.test.js | tail -1
#   → Paradise self-test: 368 passed, 0 failed   ★ NaN を 0 で埋めても全門が緑
git checkout -- graph/gauge.js
```
同じ手順で M3(`-0`)、M4(`toFixed(6)`)、M6(tie-break)、M11(`fp` 自己参照)も **368 passed, 0 failed** のまま通る。

**なぜ重大か**:
- **M2 は第16条そのものへの違反である。** 憲法の条文が engine のコメントにしか住んでおらず、機械が守っていない。
- **M11 は AC-5c の成立条件を壊す変異なのに、AC-5c の門(`tests/paradise.test.js:3361-3369`)が鳴らない。**
  理由: 門が `fresh` を `{...old, fp: gauge.fingerprint(old)}` と組み立てているため、
  変異版でも `fingerprint(old)`(fp 無し)と `fingerprint(fresh)`(fp あり)が
  たまたま同じ材料になってしまう。**門が「実装の現在の姿」を写しており、故障を捕らえられていない。**
  正しい撃ち方は「`record()` が実際に書いた fp 付き entry」と「fp を剥がした同一観測」を突き合わせること。
  私はこれを手で撃ち、実物では `fold([old, fresh]).length === 1` を確認した(実装は正しい。門だけが弱い)。
- M4(丸め)無音は「現に浮動小数の揺れが出る鍵は無い」ので今日は無害だが、
  `toFixed(6)` は**将来のための予防**として入っている。予防を守る門が無ければ、予防は次のリファクタで消える。

**提案**(実装しない。BUILD/次相の裁量):
`canonical` は内部関数なので直接は撃てない。`fingerprint` 経由で以下 5 行を足せば全部塞がる:
```js
assert.notStrictEqual(fp({metrics:{a:NaN}}), fp({metrics:{a:0}}), 'NaN を 0 で埋めた (第16条)');
assert.strictEqual  (fp({metrics:{a:NaN}}), fp({metrics:{a:null}}), 'NaN と null が別鍵');
assert.strictEqual  (fp({metrics:{a:-0}}),  fp({metrics:{a:0}}),   '-0 が畳まれていない');
assert.strictEqual  (fp({metrics:{a:0.1+0.2}}), fp({metrics:{a:0.3}}), '丸めが効いていない');
// tie-break: 同一 ts の 2 行を両順で fold して JSON.stringify 一致を撃つ
```

### 見たが、穴が無かったもの

- **鍵順依存**: 門あり(3101)、M1 で鳴る。**穴なし。**
- **`ts` 非依存**: 門あり(3092)、M10 で 13 門が鳴る。**穴なし。**
- **`undefined` の扱い**: `canonical` が object の枝で `undefined` 鍵を落とし、値としては `'null'` を返す。
  実測で `{a:undefined}` と `{}` が同一鍵。**設計どおり。穴なし。**
- **版接頭辞 `g1:`**: 門あり(`3087`)、M12 で鳴る。**穴なし。**

### 【好み】R-9 `canonical` は `Date` を区別できない

**ファイル**: `graph/gauge.js:222`。実測:
```
Date(0)   g1:9df8d577fa4b45ce
Date(999) g1:9df8d577fa4b45ce   ← 同一
```
`Object.keys(new Date())` が空なので `{}` に潰れる。`metrics` に Date は現れないので**今日は無害**。
`canonical` のコメント(`gauge.js:230`)は `function / symbol / bigint` を名指しているが `Date` に触れていない。
一行足すだけで済む。**好みの域。**

### 【軽微・情報】循環参照で `RangeError`

`fingerprint({metrics: 循環})` は `Maximum call stack size exceeded` で落ちる。
`metrics` は `score()` が組む平坦な object なので実運用では起きない。**射程外として名指すに留める。**

---

## 2. 計算量と下流への影響

### 見て、正しかったもの — foldLedger は O(n)。O(n²) では**ない**

実測(同一プロセス、1 回計測):
```
foldLedger N= 1000 →  1000 rows in  6ms
foldLedger N= 2000 →  2000 rows in  9ms
foldLedger N= 4000 →  4000 rows in 15ms
foldLedger N= 8000 →  8000 rows in 31ms
foldLedger N=16000 → 16000 rows in 63ms      ← n が 2 倍で時間も 2 倍。線形
```
`Map` による一巡 + 一回の sort。**設計どおり。O(n²) の穴は無い。**

指紋の再計算コストは実測で効く:
```
N=8000 / 旧行(fp なし、毎行 sha256 を導出) → 29ms
N=8000 / 新行(fp あり、導出をスキップ)     →  1ms
```
`e.fp || fingerprint(e)` の短絡が効いており、**台帳が新形式に移るほど速くなる**。良い設計。

### 【重大】R-3 `record()` は台帳の行数に比例して遅くなる(O(n) の全走査)

**ファイル**: `graph/gauge.js:331-341`。
`record` は追記のたびに `readLedger({ raw: true })` で**台帳を全部読んで全行の指紋を導出**する。
`baseline()`(`gauge.js:352-370`)は `record()` の M 重ループなので、**baseline 全体は O(M·N)** になる。

**再現手順と実測**(旧形式 N 行の台帳に、新しい観測を 20 件 record):
```
ledger N= 500 / record ×20 =  67ms  (1件あたり  3.4ms)
ledger N=1000 / record ×20 = 103ms  (1件あたり  5.2ms)
ledger N=2000 / record ×20 = 186ms  (1件あたり  9.3ms)
ledger N=4000 / record ×20 = 376ms  (1件あたり 18.8ms)   ← N に正比例
```

**なぜ重大か**: 台帳は追記型で**単調に増える器**である。冪等化によって増加は遅くなるが止まりはしない
(観測が変われば行は増える)。現在 30 行なので体感ゼロだが、
`requirements.md:175` が想定する **10^3〜10^4 行**の領域では baseline 1 回が数秒〜十数秒になる。
**「台帳が育つほど台帳への書き込みが遅くなる」は、追記型台帳としては望ましくない性質である。**

**緩和は容易で、設計を曲げない**: `record` は既存 fp の**集合**しか要らない。
`baseline()` が 1 回だけ `Set` を組んで `record` に渡す(あるいは `record` 内で
`new Set(readLedger({raw:true}).map(e => e.fp || fingerprint(e)))` を作り、
`baseline` が使い回す)だけで O(M+N) になる。第30条にも NG-8(索引ファイル禁止)にも触れない
—— **メモリ上の集合であってファイルではない**。

なお `design.md` はこの点を一言も検討していない。**設計の見落としであって実装の逸脱ではない。**

### 下流(pulse / dashboard)への意外な影響 —— 見たが、無かった

`readLedger()` が既定で畳むようになったことで壊れうる箇所を、grep で全部洗い出し**実際に走らせた**:

| 呼出元 | 影響 | 実測 |
|---|---|---|
| `graph/pulse.js:428`(断面の `ledger` 鍵) | 畳まれた行が載る = 意図どおり(FR-3 の目的そのもの) | `dashboard-run-panel: 16 passed, 0 failed` |
| `tests/dashboard-count.test.js:156`(`snap.ledger.length === readLedger().length`) | 両辺が同じ関数を呼ぶので同時に畳まれ、一致は保たれる | `dashboard-count: 15 passed, 0 failed` |
| `tests/dashboard-run-panel.test.js:204,210,227`(3値一致 / ts 一致) | 畳みも整列も決定的なので同じ列 | 緑 |
| `graph/gauge.js:433`(`compare`) | 畳んだ列に `latestFor` を掛ける。二重防御 | 24門で緑 |
| `graph/gauge.js:493`(`compare --last N` の `slice(-n)`) | 整列済み配列の末尾 = 時刻の新しい N 件。**設計 §3.8 のとおり一字も変えずに意味が正しくなる** | AC-3c が実測 |
| `graph/daily-guard.js:72` の `readLedger` | **同名の別関数**(daily-guard 自身の台帳)。gauge とは無関係 | 混同なし |

**`readLedger()` を無引数で呼ぶ既存箇所は一つも壊れていない。** 引数を足すだけの拡張になっている。

### 【軽微】R-8 `ledger` サブコマンドが台帳ファイルを二度読む

**ファイル**: `graph/gauge.js:512-513`。
```js
const folded = readLedger();            // ファイル読み + parse + fold
const raw = readLedger({ raw: true });  // 同じファイルをもう一度読み + parse
```
`raw` を一度読んで `foldLedger(raw)` を掛ければ I/O も parse も半分になる。
破損行の警告も 2 回出る(実測: `⚠️ ledger line skipped` が 6 回 = 3 行 × 2 回)。
**CLI の一回きりの処理なので実害は小さい。軽微。**

---

## 3. 後方互換(FR-5)—— 指紋なき旧行の扱い

### 見て、正しかったもの

- `e.fp || fingerprint(e)` という**同一の式**が `foldLedger:274` / `record:335` / `auditLedger:409` /
  `foldLedger` の tie-break `282-283` の 4 箇所すべてに現れる。**鍵の在り方が一箇所の規則に住んでいる**(設計 §4)。
- AC-5a(旧形式のみで行が落ちない)・AC-5b(鍵なしで畳める)は門があり、M9 で鳴る。**穴なし。**
- `fp` を材料から外していること(AC-5c の成立条件)は**実装として正しい**。
  私が `record()` の実際の出力で撃った実測:
  ```
  fresh.fp = g1:f730d069e86ec96d
  fold([old(fp なし), fresh(fp あり)]).length = 1   ← 正しい
  ```

### 取りこぼし: **実装には無い。門には在る**(R-1 の M11 を参照)

上記のとおり **AC-5c の門は M11 変異を捕らえられない**。実装は正しいが門が弱い。

### 見たが、無かったもの

- 旧行を engine が書き換える経路: **無い**。`writeFileSync` / `unlinkSync` / `truncateSync` / `rmSync` は
  `gauge.js` に一つも無く、`tests/paradise.test.js:3113-3114` が**その数がゼロであることを門で撃っている**。
  これは良い門である(実装をなぞるのではなく「経路が存在しないこと」を主張している)。
- metrics スキーマの漂流(旧 11 鍵 vs 現 16 鍵): `design.md:461-469` が正直に名指しており、
  「畳まれず 2 行残り FR-7 で見つかる」という扱いは設計どおり。**逸脱なし。**(ただし R-5 を参照)

---

## 4. エラー処理と境界

### 実測した境界(全て `node graph/gauge.js` を子プロセスで撃った)

| 境界 | 実出力 | 判定 |
|---|---|---|
| 台帳ファイルが無い / `ledger` | exit 0 / `(empty — まだ何も測られていない)` | ✓ |
| 台帳ファイルが無い / `ledger --audit` | exit 0 / `rows=0 distinct=0 duplicates=0 conflicts=0` | ✓ 静か |
| **全行が破損**(衝突マーカーのみ)/ `ledger` | exit 0 / `(empty)` + 警告 3 行 | ✓ 倒れない |
| 全行が破損 / `--audit` | exit 0 / `rows=0 …` | ✓ |
| **`metrics: null` の行** / `ledger` | **exit 2** `🔴 Cannot read properties of null (reading 'score')` | ⚠ §4.1 |
| `metrics: null` の行 / `--audit` | exit 0 / `rows=0 …`(audit は落ちない) | ✓ |
| **`ts` が無い行** / `ledger` | **exit 2** `🔴 Cannot read properties of undefined (reading 'slice')` | ⚠ §4.1 |
| slug が `undefined` / `null` | 同一鍵 | ✓ `?? null` どおり |
| slug が `'null'`(文字列)/ `0` / `false` | **すべて別の鍵** | ✓ 型を潰していない |

### §4.1 `metrics:null` / `ts` 欠落での exit 2 は **本改修の欠陥ではない**(main で同じ)

`main` の `graph/gauge.js` を切り出して同じ台帳で撃った実出力:
```
main / metrics:null → exit 2 🔴 Cannot read properties of null (reading 'score')
main / ts なし     → exit 2 🔴 Cannot read properties of undefined (reading 'slice')
```
落ちているのは `renderLedger`(`gauge.js:441-449`)で、**この改修が一字も触っていない既存関数**である。
むしろ `foldLedger` と `auditLedger` は `e.metrics` の有無を明示的に見ており(`267-273` / `405`)、
**新しく書かれた部分の方が既存より堅い。** 射程外として名指すに留める(NG の精神)。

### 第16条(測れなかったものを 0 で埋めない)への違反 —— 見たが、実装には無い

- `canonical` は `NaN` / `Infinity` を `'null'` にする(`0` ではない)。**実測で 0 と別鍵。違反なし。**
- `latestFor` は `hits.length === 0` で `null` を返す。**捏造しない**(M19 で門が鳴る)。**違反なし。**
- `auditLedger` は `undefined` と `0.5` を `Set` で別物と数える(`gauge.js:421`)。**違反なし。**
- `pulse.js:433-437` は `r.metrics ? r.metrics.score : null` と既に書かれており、
  畳んだ行でも同じ。**違反なし。**

**唯一の第16条まわりの問題は「規則を守る門が無いこと」(R-1 / M2)であって、実装の違反ではない。**

### 【軽微】R-4 `record` の fail-open は、実際には成立しない

**ファイル**: `graph/gauge.js:331-341`。
コメントは「**fail-open** —— 台帳が読めなければ『重複を見逃して書く』側に倒す」と宣言する。
だが `readLedger` が throw する原因(ファイルが読めない)は、**直後の `appendFileSync` でも同じく throw する**。

**再現手順**(台帳のパスをディレクトリにして読めなくする):
```bash
mkdir -p "$TMP/box/gauge-ledger.jsonl"     # ファイルの位置にディレクトリを置く
PARADISE_CREATIONS="$TMP/box" node -e "require('./graph/gauge.js').record('run.json','coin')"
```
実出力:
```
⚠️ ledger unreadable, recording anyway: EISDIR: illegal operation on a directory, read
record THROWS anyway: EISDIR    ← catch は握ったが append が同じ理由で落ちた
```
**catch 節は「重複検査だけを諦める」効果しか持たない。** 宣言と実際の振る舞いに差がある。
- ただし**倒れる向きは正しい**(既存行を消す方向には決して倒れない)。害は無い。
- そして **M15(catch を `throw` に変える)で門が一つも鳴らない** ため、この catch は
  「守られていない防御」でもある。
- 修正するなら、コメントを実態に合わせる(「重複検査だけを諦める」)か、
  `appendFileSync` も含めて考え直すか。**軽微。**

---

## 5. 門の質 —— 24 門は本当に故障を捕らえるか

### 見て、良かったもの

- **故障注入門 3 件(AC-2d / AC-3d / AC-4c)は本物である。** 実装の複製を作って壊し、
  **子プロセスで撃って exit code を実測**し、**注入版が期待どおり壊れていること**まで assert している
  (`tests/paradise.test.js:3176-3179`, `3268-3271`, `3336-3339`)。
  さらに「実物では緑」も両側で撃つ。NG-10(実装をなぞるだけのテストを門と称するな)を守っている。
- `injectGauge`(`3021-3033`)が **`assert.notStrictEqual(broken, src, '注入すべき箇所が見つからない')`** を持つ。
  実装の形が変われば門が自ら失効を宣言する。**優れた作法。**
- `gaugeWindowRows`(`2999-3010`)のコメント「**たまたま緑になる並びで門を書けば、それは門ではない**」— 
  重複を末尾側に置いて `slice(-3)` の窓を意図的に汚している。**門の設計として正しい。**
- AC-1c(`3108-3117`)が「`writeFileSync|unlinkSync|truncateSync|rmSync` の出現数がゼロ」を撃つ。
  **経路の不在**を主張する門であり、コメントの写経ではない。
- AC-9c(`3477-3495`)が実台帳の sha256 を前後で比較し、さらに env を戻した後に住所が
  実台帳へ戻ることまで撃つ。**後始末の門まで在る。**
- 私が実際に自分で 20 通り壊した結果、**12 通りで門が鳴った**。うち M9/M10/M14 は広範に鳴る。
  **門の骨格は健全である。**

### 【重大】R-1(再掲)無音の 8 変異

§0.2 の表のとおり。とくに以下が痛い:

| 変異 | 実装のどの宣言が守られていないか |
|---|---|
| M2 | `gauge.js:200-201` 「非有限は `null` — **第16条**」 |
| M3 | `gauge.js:203` 「`-0` は `0` に畳む」 |
| M4 | `gauge.js:205-207` 「`toFixed(6)` で丸める。予防である」 |
| M6 | `gauge.js:281` 「同時刻の tie-break も決定的に —— **shuffle しても同じ列を返すための必須条件**」 |
| M7 | `gauge.js:271-272` 「metrics を持たない行は畳みの対象外」(= 行落ちさせない) |
| M11 | `gauge.js:238-239` 「`fp` 自身も含めない。**これが AC-5c の成立条件**」 |
| M15 | `gauge.js:314-316` 「**fail-open**」(R-4 も参照) |
| M17 | `gauge.js:396` 「判定鍵は既存の `COMPARE_KEYS` を借りる」 |

**M6 が無音なのは AC-4a(shuffle 不変)の門があるのに、なぜか。**
`gauge30Rows()` が生む 30 行は `ts` がすべて相異なるため、**tie-break の枝に一度も入らない**。
門の素材が tie-break を踏んでいない。同一 `ts` の 2 行を混ぜれば塞がる。

**M7 が無音なのは**、24 門のどれも「`{slug, error}` 行(metrics なし)が畳みを通っても残る」を主張していないため。
私は手で撃って `foldLedger([{slug:'broken',error:'…'}])` が 1 行を返すことを確認した。**実装は正しい。門が無いだけ。**

### 【軽微】R-6 `raw:` 名前空間は `fp` と衝突しうる

**ファイル**: `graph/gauge.js:273` — `keep.set('raw:' + keep.size, e)`。

metrics なし行の鍵として `raw:0`, `raw:1`, … を使う。指紋は必ず `g1:` で始まるので**実装が書いた fp とは衝突しない**。
だが**外部から `fp: "raw:0"` を名乗る行が流入すると衝突する**。

**再現**:
```js
foldLedger([{slug:'e',error:'x'}, {ts:'T',slug:'s',metrics:{score:1},fp:'raw:0'}])
// → length 1   (2 が正しい。metrics なし行が食われた)
```
実運用でこの行が生まれる経路は無い(record は必ず `g1:` を書く)ので**軽微**だが、
`'raw:'` を `'\u0000raw:'` のような JSON に現れない前置に変えるか、
`Symbol` / 別配列で持つだけで構造的に潰せる。健全な入力では衝突しないことも実測済み
(metrics なし 50 行 + metrics あり 50 行 → fold = 100)。

### トートロジー(実装を写しただけの門)—— 見たが、ほぼ無い

24 門を一つずつ読んだ。**実装の式をそのまま assert しているだけの門は見つからなかった。**
最も惜しいのは AC-5c(`3361-3369`)で、`fresh` を実装の `fingerprint` で組み立てているため
M11 を捕らえられない(R-1 に計上済み)。これは「トートロジー」というより「素材の選び方が実装依存」である。

AC-3a(`3199-3208`)の `deepStrictEqual({rows:30, distinct:6, duplicates:24})` は
**discovery / design が実台帳で実測した数字**であり、実装から逆算した値ではない。**トートロジーではない。**

---

## 6. 既存 export の保全 / 第30条

### 見て、正しかったもの

```
main の export:  score, normalize, record, baseline, compare, readLedger, ledgerPath, WEIGHTS
HEAD の export:  上記 8 つ + fingerprint, foldLedger, latestFor, auditLedger
```
**既存 8 つは一つも消えておらず、名も変わっていない。足すだけ**(`gauge.js:531-535`)。設計 §3.0 のとおり。
`canonical` は export されていない(設計 §3.0「出せば第二の正規化規則が生まれる」)。**一致。**

### 第30条(台帳の住所を知るのは workspace.js だけ)—— 違反なし。実測で確認

- `graph/gauge.js` に `paradise-creations` の直書きは**無い**(門 `3110` が撃つ。私も grep で確認)。
- 索引ファイル・キャッシュファイルの新設は**無い**(NG-8。門 `3111` が `gauge-index|\.gauge-cache|fpIndex` を撃つ)。
- `node graph/workspace.js check` を門が走らせ、混入なしを確認(`3115-3116`)。
- 既存門 `B-4: 走行帳の住所を知るのは workspace.js だけである (第30条)` は 368 全緑の中に含まれる。
- `ledgerPath()` は `workspace.resolve()` 経由のまま。**触られていない。**

**第30条違反は一件も見つからなかった。**

---

## 7. 可読性・命名・既存の作法との一貫性

### 良い

- 命名は既存に馴染む: `fingerprint` / `foldLedger` / `auditLedger` / `latestFor` はいずれも
  `readLedger` / `renderLedger` / `ledgerPath` と同じ語彙圏にある。
- `canonical` / `fingerprint` / `foldLedger` / `readLedger` / `record` の並び順が
  「材料 → 鍵 → 畳み → 読み → 書き」と依存の向きに沿っている。**読みやすい。**
- 「なぜ採らなかったか」がコードのすぐ隣にある(keep-last を採らない理由 `gauge.js:257-261`、
  `Date.parse` を挟まない理由 `264-265`、fail-open の向き `314-316`)。
  **後から来る者が同じ罠を踏み直さないための良い書き方である。**
- 既存の CLI の作法(絵文字プレフィクス、`exit 3` = 使い方誤り、`exit 2` = 実行時エラー)を守っている。
- 第55条(`CONSTITUTION.md`)は実測値に根拠を置き、(a)〜(f) が FR-1〜FR-7 と対応する。
  `codex.js article 55` が引ける。索引は `codex.js index` の再生成と**一致する**(diff で確認)。
  README の `344/344 → 368/368` も実測と一致。**文書の整合は取れている。**

### 【軽微】R-7 `auditLedger` に死んだコード

**ファイル**: `graph/gauge.js:406, 410-411`。
```js
const byFp = new Map();      // fp -> entry[]
if (!byFp.has(fp)) byFp.set(fp, []);
byFp.get(fp).push(e);
```
push した配列は**一度も読まれない**。使われるのは `byFp.size`(`416`)だけ。
`new Set()` で足り、無駄な配列 N 本の確保も消える。
`design.md:391-397` の疑似コードをそのまま写した名残と見える。**軽微。**

### 【軽微】R-5 `auditLedger` は正当な改善を「矛盾」と名指す

**ファイル**: `graph/gauge.js:418-428`。

`design.md:504-506` の表は「同一 slug・metrics が食い違う → **conflicts に名指す + exit 1**」と定義しており、
実装はそのとおりである。だが**同じ commit の中の AC-3b は逆を言っている**:

> `畳みは 80→100 の本物の改善を殺さない (AC-3b / 第38条)`
> 「改善を語る二行が畳みに殺された — 秤が自分で第38条を破っている」

**実測**:
```
80→100 の本物の改善(reform-eval-gauge の実データ)→ conflicts = 1
```
**畳みが「殺すな」と守った改善2行を、audit は「矛盾」と呼んで exit 1 を返す。**
同一リポジトリの中で、同じ 2 行に対する評価が割れている。

同様に、metrics スキーマの漂流(旧 11 鍵 / 新 16 鍵)でも:
```
点数も何もかも同一だが tier3Ratio が undefined vs 0 → conflicts = 1
```
`design.md:517-518` はこれを「第16条ゆえに正しい」と正当化しているが、
**実運用では「点数が同じなのに矛盾と鳴る」ため、人は鳴っている理由を毎回読み解く必要がある。**

これは**設計の判断であって実装の逸脱ではない**。だが R-2 と合わさると害が出る。

### 【重大】R-2 `ledger --audit` は FR-8 の掃除を完了させても鳴り続ける

**ファイル**: `graph/gauge.js:510`。

`requirements.md:318`(NFR-2)は「**現実台帳に対し非ゼロ(重複24)、畳んだ6行に対し exit 0**」と定める。
`design.md:565` も掃除後の期待を「`duplicates=0` → **exit 0**」と書いている。

**実測 — 掃除を実行したときに何が起きるか**(実台帳を畳んだ 6 行を仮倉に置いて撃った):
```
$ node graph/gauge.js ledger --audit
📒 rows=6 distinct=6 duplicates=0 conflicts=1
  ⚠️ 矛盾: reform-eval-gauge — score,firstPassRate が食い違う (…:80 vs …:100)
exit=1                                       ★ 掃除が完璧でも exit 1
```
**FR-8 の AC(`design.md:565` の「期待: duplicates=0 → exit 0」)は、この実装では達成できない。**
原因は `gauge.js:510` の `a.duplicates > 0 || a.conflicts.length > 0` が **conflicts でも exit 1** にすること、
そして畳んだ 6 行に `reform-eval-gauge` の 80/100 が**設計どおり両方残る**こと。

**なぜ重大か**: `auditLedger` 自身のコメント(`gauge.js:395`)がこう書いている ——
> 「`durationMs` のような走行環境で当然揺れる値で鳴らせば、**鳴りっぱなしの門になる**」

**この実装は、その鳴りっぱなしの門になっている。** 改善が記録されるたびに conflicts が増え、
`--audit` は二度と緑にならない。CI にこの口を繋げば恒久的に赤になり、無視される門になる。

**再現手順**:
```bash
cd C:/Users/kikus/Documents/workspace/paradise
node -e "
const fs=require('fs'),path=require('path');const g=require('./graph/gauge.js');
const T=path.join(process.env.LOCALAPPDATA,'Temp','auditcheck');
fs.rmSync(T,{recursive:true,force:true});fs.mkdirSync(T,{recursive:true});
fs.writeFileSync(path.join(T,'gauge-ledger.jsonl'), g.readLedger().map(e=>JSON.stringify(e)).join('\n')+'\n');
console.log(T);"
PARADISE_CREATIONS="$LOCALAPPDATA/Temp/auditcheck" node graph/gauge.js ledger --audit; echo "exit=$?"
```

**提案**(実装しない):
- **重複と矛盾で信号を分ける。** 重複 = 機械が直せる欠陥 → exit 1。
  矛盾 = 人が読むべき情報(しばしば正当な改善) → exit 0 + 名指し、あるいは `--strict` でのみ非ゼロ。
- または「矛盾」の定義を「**同一 slug・同一 ts でありながら metrics が違う**」に狭める
  (= 本当にあり得ない事態)。改善は ts が違うので鳴らなくなる。
- どちらを採るにせよ、`requirements.md:318` と `design.md:565` の
  「掃除後は exit 0」という約束と実装が食い違っている事実は解消すべきである。

### 【好み】R-10 `ledger --audit` は CI に繋がれていない

`.github/workflows/tribunal.yml` を grep した実出力:
```
27:        run: node tests/paradise.test.js
306:          TESTS=$(node tests/paradise.test.js 2>&1 | tail -1)
```
FR-9(門を CI に繋ぐ)は「FR-2〜FR-7 の AC を `tests/paradise.test.js` に接続する」ことで満たされており、
**24 門は CI が走らせる**(`tribunal.yml:27`)。AC-9a は充足している。

一方 `ledger --audit` そのものは CI から一度も呼ばれない。
これは**正しい判断**でもある —— 台帳は creations 側に住み、CI のマシンには倉が無いことがありうる。
ただし R-2 が未解決のまま繋げば恒久的に赤になるので、**R-2 を先に片付けるべきである。好みの域。**

### 【好み】R-11 コメントが本文より長い箇所がある

`canonical`(実質 19 行)に対し前置コメントが 14 行、`foldLedger`(20 行)に対し 11 行。
楽園の既存コード(`score()` など)も同じ密度なので**作法としては一貫している**。
「なぜ」を残す方針は良い。ただし **R-1 のとおり、コメントで宣言した規則の 4/5 に門が無い**ため、
現状は「コメントが憲法で、機械が守っていない」状態になっている。
**コメントを削るのではなく、門を足して釣り合わせるのが筋である。**

---

## 8. 要件との突き合わせ(AC 40 件)

| AC | 判定 | 根拠 |
|---|---|---|
| AC-1a / 1b / 1c | ✅ | 門あり。M8/M9/M10/M12/M13 で鳴る |
| AC-2a / 2b / 2c / 2d | ✅ | 門あり。M16 で 3 門が鳴る。AC-2d は子プロセスの exit code を実測する本物 |
| AC-3a / 3b / 3c / 3d | ✅ | 門あり。M5/M9/M14 で鳴る |
| AC-4a / 4b / 4c | ⚠️ | 門あり・M19 で鳴るが、**AC-4a の素材が tie-break を踏まない**(M6 無音) |
| AC-5a / 5b / 5c | ⚠️ | 実装は正しい。**AC-5c の門が M11 を捕らえない** |
| AC-5d | ✅ | `tests/paradise.test.js:2906` の既存門は緑。368 passed |
| AC-6a / 6b / 6c | ✅ | 門あり。M20 で 3 門が鳴る |
| AC-7a / 7b | ⚠️ | 門あり・M18 で鳴るが、**M17(判定鍵の縮小)が無音**。加えて R-5 / R-2 |
| AC-8a〜8d | ⏸ | **creations 側の別 PR。本相の射程外**(`design.md:642` の判断は妥当)。**私は実行も検証もしていない。** ただし R-2 により AC-8a 系の「掃除後 exit 0」は現状達成不能 |
| AC-9a | ✅ | `368 passed, 0 failed`(> 344) |
| AC-9b | ✅ | `dashboard-run-panel: 16 passed, 0 failed` |
| AC-9c | ✅ | 門あり。実台帳の sha256 を前後比較。私の全実験も仮倉のみ |
| NFR-1 | ✅ | 門あり(`3459-3468`)。M9/M10/M14 で鳴る |
| NFR-2 | ⚠️ | 実装あり。ただし **R-2 により「掃除後 exit 0」の AC を満たさない** |
| NFR-3 | ✅ | `fingerprint` を export。AC-1a が兼ねる |

**NG-1〜NG-10 の違反 —— 見たが、一件も無かった。**
- NG-3(verdict 非波及)/ NG-4(pulse・dashboard 非改修): `git diff main...HEAD --stat` に
  `verdict.js` も `pulse.js` も `dashboard/` も**現れない**。✓
- NG-2(足すのは 1 鍵だけ): 台帳に増えたのは `fp` のみ。`skipped` は返り値だけに載りファイルには書かれない
  (`gauge.js:344` — 実装を読んで確認)。✓
- NG-7(baseline の到達範囲): `baseline()` は**一行も変わっていない**。✓
- NG-8(索引ファイル): 門で撃たれている。✓
- NG-10(なぞるだけのテスト): 故障注入 3 門が在り、私の 20 変異中 12 が鳴る。✓

---

## 9. 次に打つべき手(優先順)

1. **R-2** — `--audit` の exit code を重複と矛盾で分ける。放置すれば FR-8 の完了条件が達成不能で、
   CI に繋げない。**requirements / design の約束と実装が食い違っている唯一の箇所。**
2. **R-1** — 無音の 8 変異のうち少なくとも M2(第16条)・M11(AC-5c の成立条件)・M6(tie-break)に門を足す。
   いずれも数行で済む。**第16条が機械に守られていない状態を残さない。**
3. **R-3** — `record` の O(n) 全走査。`baseline` が fp 集合を一度だけ作って使い回す。
4. R-4 / R-5 / R-6 / R-7 / R-8 — 軽微。まとめて一巡で片付く。
5. R-9 / R-10 / R-11 — 好み。急がない。

---

## 10. この相で私が走らせた命令の全一覧

```
git status --short / git log --oneline -5
git diff main...HEAD --stat
git diff main...HEAD -- graph/gauge.js
git diff main...HEAD -- tests/paradise.test.js
git diff main...HEAD -- CONSTITUTION.md CONSTITUTION.INDEX.md README.md
git show main:graph/gauge.js                       (main との挙動比較のため)
grep -rn "readLedger" --include=*.js .             (下流の全呼出元の洗い出し)
grep -n "gauge|paradise.test" .github/workflows/tribunal.yml

node tests/paradise.test.js                        → 368 passed, 0 failed
node tests/dashboard-count.test.js                 → 15 passed, 0 failed
node tests/dashboard-run-panel.test.js             → 16 passed, 0 failed
node <24門の抜粋>                                   → gauge gates: 24 passed, 0 failed

node -e "指紋の境界を撫でる"                        (NaN/-0/Inf/undefined/丸め/循環/Date/slug の型)
node -e "foldLedger のベンチ N=1000..16000"         → 線形(6/9/15/31/63ms)
node -e "record のベンチ 台帳 N=500..4000"          → 3.4/5.2/9.3/18.8ms(N に正比例)
node -e "境界: ファイルなし/全行破損/metrics:null/ts なし"  (CLI を子プロセスで撃つ)
node -e "fail-open の実地検証(EISDIR)"
node -e "raw: 名前空間の衝突"
node -e "auditLedger が改善を矛盾と呼ぶか"
node graph/gauge.js ledger --audit                 → exit 1(実台帳)
PARADISE_CREATIONS=<畳んだ6行> node graph/gauge.js ledger --audit → exit 1(★R-2)
node graph/codex.js article 55                     → exit 0
diff <(node graph/codex.js index) CONSTITUTION.INDEX.md → 差分なし

bash mutate-gauge.sh                               (20 変異 × 24門。毎回 git checkout で復元)
git status --short                                 → graph/gauge.js は無傷
```

**実台帳(`../paradise-creations/gauge-ledger.jsonl`)は一行も書き換えていない。**
全ての実験は `$LOCALAPPDATA/Temp` 配下の仮倉で行った。
**兄弟倉 `../paradise-creations` には一度も書き込んでいない。** main への commit も push も PR も行っていない。
