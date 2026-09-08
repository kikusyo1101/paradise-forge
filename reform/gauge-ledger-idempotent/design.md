# DESIGN — gauge 台帳の冪等化 (gauge-ledger-idempotent)

- 相: **DESIGN(設計のみ)**。本相では `graph/*.js` / `tests/*.js` を **一行も変更していない**(実装は BUILD の領分)。
- 先行文書(**全文既読**):
  - `reform/gauge-ledger-idempotent/discovery.md`(394行)
  - `reform/gauge-ledger-idempotent/requirements.md`(410行 / FR-1〜FR-9・NFR-1〜3・AC 40件・NG-1〜10)
- 本相で実読したコード: `graph/gauge.js`(全323行)/ `graph/pulse.js:47, 116, 277-294, 426-437, 481` /
  `tests/paradise.test.js:2825-2931`(gauge 節)/ `tests/dashboard-run-panel.test.js:191-229` /
  `tests/dashboard-count.test.js:151-158` / `.github/workflows/tribunal.yml`(全344行)
- 実測環境: `node -v` → **v24.14.0** / 枝 `main`(読み取りのみ)
- 本書の設計判断はすべて **先行2文書の実測** か **本相で私が走らせた原型実験の実出力**(§2.4)に根拠を持つ。

---

## 0. 本相で走らせた原型実験(設計の根拠。engine は触っていない)

実台帳 30 行を **読み取り専用で**読み、本設計の指紋関数の原型を `node -e` で撃った実出力:

```
rows 30 distinct fp16 6
folded 6
   2026-08-31T13:54:12.961Z 100 coin
   2026-08-31T13:54:12.962Z  45 habit
   2026-08-31T13:54:12.963Z  80 reform-eval-gauge
   2026-08-31T14:01:25.440Z 100 reform-eval-gauge
   2026-09-01T03:39:58.444Z 100 tenbin
   2026-09-02T07:03:12.473Z  80 reform-claude-md-diet
shuffle-invariant: true
key-order independent: true   naive JSON.stringify equal? false
mixed old/new same key: true
old row has tier3Ratio? false
```

および entry の実形状:

```
entry keysets      [ 'ts,slug,scale,metrics' ]          ← 冪等鍵は無い(V-4 の再確認)
metrics keysets    1 種類。complete,domainsRatified,domainsTotal,durationMs,firstPassRate,
                   loopGuardTrips,phasesDone,phasesTotal,retryOverhead,reworkCount,score
metrics 値の型      number / boolean のみ(null なし)
JSON.stringify は鍵順に依存する: {x,y} vs {y,x} → 別文字列(true)
0.1+0.2 → 0.30000000000000004 / JSON.stringify(1.0) → "1" / JSON.stringify(-0) → "0"
```

この 5 行が §2 の設計を決めている:
- **`raw 30 → fold 6`** と **`shuffle-invariant: true`** が FR-3 / FR-4 の実現可能性の証拠。
- **`key-order independent: true` に対し `naive JSON.stringify equal? false`** —
  **素の `JSON.stringify` を指紋の材料にしてはならない**(§2.2)。
- **`old row has tier3Ratio? false`** — 旧行の `metrics` は 11 鍵、今の `score()`(`gauge.js:154-167`)は
  16 鍵を返す。**旧行を今日 record し直せば指紋は別になる**。これは誤りではなく FR-7 の「矛盾」として扱う(§5)。

---

## 1. 設計の全体像

### 1.1 一枚の絵

```
        書く道                                    読む道
  ┌──────────────────────┐               ┌────────────────────────────┐
  │ record(runFile,slug) │               │ readLedger()               │
  │  1. score()          │               │  1. 行を parse(破損は読み飛ばす)│
  │  2. entry を組む      │               │  2. 各行に fp を確保        │
  │  3. **fp を刻む**  ★1 │               │     (無ければ導出)     ★2 │
  │  4. 既存 fp に在れば   │               │  3. **fp で keep-first 畳み**│
  │     追記せず既記録を返す│               │  4. **ts 昇順に整列**    ★3 │
  │  5. 無ければ append    │               └────────────────────────────┘
  └──────────────────────┘                         │
        ↑ baseline() は record() の N 重ループ       ├→ compare / latestFor(ts 最大)
          ゆえに自動で冪等になる                     ├→ compare --last N(整列後の末尾)
                                                    ├→ pulse.js:428(**一行も変えない**)
                                                    └→ dashboard(**一行も変えない**)
```

- **★1 予防(FR-2)** — 台帳の物理的肥大と git diff の汚染を止める。
- **★2 治癒(FR-3 / FR-5)** — 既に汚れた台帳・他ブランチから流入した重複・鍵を持たない旧行に、
  書き手の規律に依存せず効く。
- **★3 順序非依存(FR-4)** — マージ後の行順が時刻順でない実測(discovery 2章 `T0,T2,T1`)への回答。

**二重に敷く理由**は discovery 2章の推奨そのもの: ★1 が競合等で漏れても ★2 が拾う(defense in depth)。

### 1.2 中心の決定 —— `readLedger()` は **既定で畳んで返す**

FR-3 は「`readLedger()` 自体を変えるか、畳み済みを返す別経路を設けるかは DESIGN の裁量」と述べる(requirements:125)。
**別経路ではなく `readLedger()` 自体を畳む側にする。** 決め手は一つ:

> `graph/pulse.js:428` は `gauge.readLedger()` を呼び、その全行を断面の `ledger` 鍵に載せる。
> `dashboard/paradise.js:344-372` がそれを描く。**NG-4 は pulse / dashboard を触ることを禁じている。**
> ゆえに「画面に +0 が三段並ぶ」(discovery 1.4(c))を NG-4 を破らずに治す道は、
> **源である `readLedger()` が畳むこと以外に無い。**

副作用の点検(§8 のリスク表で再掲):
- `tests/dashboard-count.test.js:156` は `snap.ledger.length === gauge.readLedger().length` を主張する。
  pulse も試験も同じ `readLedger()` を呼ぶので、**両辺が同時に畳まれ一致は保たれる**。
- `tests/dashboard-run-panel.test.js:203-213`(AC-22b)は `snap.ledger[i].ts === readLedger()[i].ts` を
  全 i で主張する。畳みも整列も **決定的**(§2.3)なので、同じ入力に対し両者は同じ列を得る。**一致は保たれる。**
- `readLedger()` は `ts` を**加工しない**(元の文字列をそのまま運ぶ)。
  AC-22b の「時刻が加工されている」検査(dashboard-run-panel.test.js:212)と `dashboard/paradise.js:372` の
  「記録時刻をそのまま運ぶ — 再計算しない」という宣言を守る。

生の全行が要る者のために **`readLedger({ raw: true })`** を残す(後方互換の逃げ道・FR-8 の掃除スクリプト・NFR-2 の監査が使う)。

### 1.3 採らなかった案と理由(trade-off)

| 案 | 内容 | 採否 | 理由 |
|---|---|---|---|
| **b 単独** | `baseline()` だけ既存分をスキップ | **却下** | discovery 1.5 / V-7 の実測: `record` 単独の二度打ち(6→8行)が素通りする。実運用で record を打つのは `/conclave` の道を歩く人(`overlay/commands/conclave.md:148`)。**門は人が歩く道に立てる。** AC-2b を満たせない |
| **a 単独**(書き側だけ) | record で検査、読み側は素通し | **却下** | 既に台帳に入った 24 行と、他枝から流入する重複に無力。AC-3a / AC-3c / AC-5b を満たせない |
| **c 単独**(読み側だけ) | 書き込みは無条件 append のまま | **却下** | 台帳ファイルが走行回数に比例して膨れ続け、git diff がレビュー不能になる。AC-2a / AC-2b を満たせない |
| 別ファイルの指紋索引 | `.gauge-index.json` 等に既知 fp を持つ | **却下** | **NG-8 / 第30条**。台帳以外の第二の住所を engine が知ることになる(discovery 5章 G-7)。指紋は entry 自身が持てば索引は要らない |
| 畳みを **keep-last** に | 同一 fp のうち後着を残す | **却下** | discovery 2章冒頭の実測でマージ後の行順は時刻順でない(`T0,T2,T1`)。「後着=新しい」は嘘になりうる。**keep-first = ts 最小**(requirements FR-3)を採る |
| 畳みを **ファイルに書き戻す**(自己修復 write) | readLedger が畳んだ結果で台帳を上書き | **却下** | 読み取りが破壊的書き込みを起こす。破損行(`<<<<<<<`)が居る台帳で走れば**生きた記録を消す**。FR-2 の fail-open 原則(「既存行を消す方向に倒れてはならない」requirements:86)に真っ向から反する |
| entry スキーマの刷新(`runId` 等を足す) | run の同一性を別鍵で表す | **却下** | **NG-2**(足すのは冪等鍵 1 つだけ)。`record(runFile, slug)` は run ファイルのパスしか知らず、run の同一性を名乗る鍵は run-state に無い |
| `metrics` を材料から外し `slug+scale` だけで鍵にする | 鍵が粗い | **却下** | `reform-eval-gauge 80 → 100` の**本物の改善2行が畳まれて消える**(discovery 2章(c)/AC-3b)。第38条を秤自身が殺す |

---

## 2. 指紋(冪等鍵)の正確な定義 ★ここが曖昧だと実装が崩れる

### 2.1 材料 (material)

FR-1(requirements:54)が要求する材料は「**少なくとも `slug` と `scale` と `metrics` から決まり、`ts` に依存しない**」。
本設計はこれを**過不足なく**採る:

```
material = { slug, scale, metrics }
```

- `ts` は含めない(AC-1b)。
- `fp` 自身は含めない(自己参照を避ける。**これが AC-5c の成立条件** — §4)。
- entry に将来別の鍵が増えても、材料は**この3つに固定**する。材料を変えれば過去行の指紋が動き、
  比較の基準線が動く(`gauge.js:146-149` が既に述べている戒め: 「式は legacy に掛けない — 過去の台帳の点を
  後から書き換えれば比較の基準線そのものが動く」)。**材料の定義は engine のただ一箇所に住む。**

### 2.2 正規化 (canonicalization) — `JSON.stringify` を直接使ってはならない

§0 で実測したとおり `JSON.stringify` は**鍵順に依存する**(`{x,y}` と `{y,x}` が別文字列)。
`score()` の返す `metrics` は `gauge.js:154-167` のリテラル順で生まれるので現状は安定しているが、
**将来 `metrics` を組み直す者が鍵の順を変えれば、同じ観測の指紋が黙って割れる。**
ゆえに指紋は「安定化した文字列表現」の上に建てる。

**`canon(v)` の定義**(BUILD はこの規則をそのまま実装せよ):

| 入力 | 出力 |
|---|---|
| `null` / `undefined` | `"null"`(`undefined` の鍵は**そもそも出力しない**、下記 object 参照) |
| `boolean` | `"true"` / `"false"` |
| `string` | `JSON.stringify(v)`(JSON のエスケープ規則をそのまま借りる) |
| `number` | **非有限(`NaN`/`±Infinity`)は `"null"`**、`-0` は `0` に畳み、**`Number(v.toFixed(6))` を `String()`** した値 |
| `Array` | `"[" + 要素の canon を "," 連結 + "]"`(**順序は保つ** — 配列の順序は意味である) |
| `object` | `"{" + Object.keys(v).sort() の各 k について JSON.stringify(k)+":"+canon(v[k]) を "," 連結 + "}"`。`v[k] === undefined` の鍵は**落とす** |

**数値の扱いの根拠**:
- `firstPassRate` / `tier3Ratio` は `gauge.js:99, 139` で既に `+(x).toFixed(3)` されている。
  `durationMs` は整数ミリ秒。`score` は整数。**現に浮動小数の揺れが出る鍵は無い**(§0 の型実測)。
- それでも `toFixed(6)` で丸めるのは**予防**である。将来 `metrics` に生の除算結果が入ったとき、
  `0.1+0.2 = 0.30000000000000004`(§0 実測)のような表現差で同じ観測の指紋が割れるのを防ぐ。
  6 桁は `toFixed(3)` の既存精度より細かく、**現存する全ての値を無損失に通す**(整数も `toFixed(6)` → `Number` で元に戻る)。
- `-0` を `0` に畳むのは `Object.is(-0, 0) === false` かつ `JSON.stringify(-0) === "0"` という
  JS の非対称(§0 実測)を指紋の中で解消するため。
- `NaN` を `"null"` にするのは第16条(**測れなかったものを 0 で埋めない**)と整合する:
  `0` ではなく `null` として名指す。`metrics` に `NaN` が入ること自体は別の欠陥(NG-6 の `tier3Ratio` 事案)であり、
  指紋はそれを **`0` と区別する**。

### 2.3 ハッシュと桁数

```
fpOf(entry) = "g1:" + sha256( canon({ slug, scale, metrics }) ).hex.slice(0, 16)
```

- **アルゴリズム**: `crypto.createHash('sha256')`。Node 標準、外部依存ゼロ。
  (discovery/requirements の実験は sha1 だったが、**新たに engine が刻む鍵は sha256 を採る** —
  sha1 は衝突が実証済みで、新しく書く鍵にわざわざ選ぶ理由が無い。畳みの結果は §0 で
  sha256 でも `30 → 6` と一致することを実測済み。)
- **桁数**: hex **16 桁 = 64 bit**。台帳の規模は現に 30 行、想定でも 10^3〜10^4 行。
  64 bit 空間での誕生日衝突確率は 10^4 行でも約 `10^8 / 2^64 ≈ 5×10^-12`。**十分である。**
  行を人間が目で読む台帳なので、64 桁の全文はノイズになる。
- **接頭辞 `g1:`** は**材料と正規化の版**を名乗る。将来材料を変える必要が生じたら `g2:` を名乗り、
  **`g1:` の行は `g1:` の規則で再導出する**。これにより「過去の指紋が黙って動く」事故を構造的に防ぐ。
  接頭辞を別鍵(`fpAlg`)にしないのは **NG-2(足すのは1鍵だけ)** を守るため。
- **決定性**: 同じ material なら常に同じ文字列。`Object.keys().sort()` は Unicode コードポイント順で決定的。

### 2.4 検証済みの性質(§0 の実出力に対応)

| 性質 | 実測 | 対応する AC |
|---|---|---|
| 実台帳 30 行 → distinct 6 | `rows 30 distinct fp16 6` | AC-3a / AC-5b / AC-8b |
| 畳み後に `80 → 100` の改善2行が残る | `folded 6` の 3・4 行目 | AC-3b |
| 行順に依存しない | `shuffle-invariant: true`(5 回 shuffle) | AC-4a |
| 鍵順に依存しない | `key-order independent: true` | FR-1 の堅牢性 |
| `fp` を持つ行と持たない行が同じ鍵になる | `mixed old/new same key: true` | AC-5c |

---

## 3. 関数単位の変更設計(疑似コード。**ファイルには書かない**)

> 対象は `graph/gauge.js` のみ。`pulse.js` / `dashboard/paradise.js` / `verdict.js` は **一行も触らない**(NG-3 / NG-4)。

### 3.0 新規関数の一覧とシグネチャ

| 名 | シグネチャ | export | 由来 |
|---|---|---|---|
| `canonical` | `canonical(value) -> string` | **しない**(内部) | §2.2。外に出すと第二の正規化規則が生まれる |
| `fingerprint` | `fingerprint(entry) -> string` | **する** | NFR-3(鍵を確認できる経路)/ AC-1a が `a.fp === b.fp` を撃つために必要 |
| `foldLedger` | `foldLedger(entries) -> entry[]` | **する** | AC-3a / AC-4a が直接撃つ。純関数(I/O 無し) |
| `latestFor` | `latestFor(slug, entries) -> entry\|null` | **する(新規に export)** | **V-11 の設計制約**: 現在 `module.exports`(`gauge.js:323`)に無く AC-4b を門から撃てない |
| `auditLedger` | `auditLedger(entries) -> {rows,distinct,duplicates,conflicts[]}` | **する** | FR-7(AC-7b)/ NFR-1 / NFR-2 |

**既存 export は一つも消さない・名も変えない**(`gauge.js:323` の
`score, normalize, record, baseline, compare, readLedger, ledgerPath, WEIGHTS` を全て維持)。**足すだけである。**

### 3.1 `readLedger()` — `gauge.js:187-198`

**変更前**(実物 187-198):
```js
function readLedger() {
  const p = ledgerPath();
  if (!fs.existsSync(p)) return [];
  const out = [];
  for (const line of fs.readFileSync(p, 'utf8').split('\n').filter(Boolean)) {
    try { out.push(JSON.parse(line)); }
    catch { console.error(`⚠️ ledger line skipped (corrupt): ${line.slice(0, 60)}…`); }
  }
  return out;
}
```

**変更後**:
```js
function readLedger(opts = {}) {
  const p = ledgerPath();
  if (!fs.existsSync(p)) return [];
  const out = [];
  for (const line of fs.readFileSync(p, 'utf8').split('\n').filter(Boolean)) {
    try { out.push(JSON.parse(line)); }              // ← 破損耐性は一字も変えない(FR-6)
    catch { console.error(`⚠️ ledger line skipped (corrupt): ${line.slice(0, 60)}…`); }
  }
  return opts.raw ? out : foldLedger(out);           // ← 既定は畳む(§1.2)
}
```
- **`try/catch` の中身と警告文言は一字も変えない** — AC-6a が `⚠️ ledger line skipped (corrupt)` ×3 と
  例外を投げないことを撃つ。畳みは **parse を全部終えた後**に掛かるので、破損行の扱いに影響しない。
- 引数を足すだけなので既存の無引数呼び出し(`gauge.js:247, 305, 313` / `pulse.js:428`)は壊れない。

### 3.2 `foldLedger(entries)` — 新規(`readLedger` の直後に置く)

```js
/** 同一指紋は先着(ts 最小)を残し、ts 昇順に整列して返す。純関数・I/O 無し。 */
function foldLedger(entries) {
  const keep = new Map();                       // fp -> entry
  for (const e of entries) {
    if (!e || typeof e !== 'object') continue;  // 壊れた値は落とす(fail-safe)
    if (!e.metrics) { keep.set('raw:' + keep.size, e); continue; }
      // ↑ metrics を持たない行(baseline の {slug,error} 等)は畳みの対象外。指紋の材料が無い
    const fp = e.fp || fingerprint(e);          // ★ 旧行はその場で導出(FR-5)
    const cur = keep.get(fp);
    // keep-first = ts 最小。行位置は一切見ない(FR-4)
    if (!cur || String(e.ts) < String(cur.ts)) keep.set(fp, e);
  }
  return [...keep.values()].sort((a, b) => {
    const ta = String(a.ts || ''), tb = String(b.ts || '');
    if (ta !== tb) return ta < tb ? -1 : 1;
    // 同時刻の tie-break も決定的に: 指紋の辞書順(shuffle しても同じ列を返すため)
    const fa = a.fp || (a.metrics ? fingerprint(a) : ''), fb = b.fp || (b.metrics ? fingerprint(b) : '');
    return fa < fb ? -1 : fa > fb ? 1 : 0;
  });
}
```
- `ts` は **ISO8601 の UTC 文字列**(`gauge.js:204` の `new Date().toISOString()`)なので
  **文字列の辞書順 = 時刻順**である。`Date.parse` を挟まない — 壊れた `ts` で `NaN` が出て
  比較が非決定になるのを避ける(第16条の精神: 測れないものを黙って 0 にしない)。
- **`ts` 同着の tie-break を指紋の辞書順にするのは AC-4a(shuffle-invariant)の必須条件**である。
  §0 の実測(`shuffle-invariant: true`)はこの tie-break 込みで撃った。

### 3.3 `fingerprint(entry)` / `canonical(value)` — 新規(§2 の実装)

```js
function canonical(v) { /* §2.2 の表をそのまま */ }

function fingerprint(entry) {
  const material = { slug: entry.slug ?? null, scale: entry.scale ?? null, metrics: entry.metrics ?? null };
  return 'g1:' + crypto.createHash('sha256').update(canonical(material)).digest('hex').slice(0, 16);
}
```
- `require('crypto')` を `gauge.js:37-39` の require 群に足す(Node 標準。**外部依存はゼロのまま**)。
- `?? null` により `scale` の `undefined` と `null` が同じ指紋になる(`gauge.js:206` は `|| null` で
  既に `null` を書くので現状は同値だが、他所から来た行のために明示する)。

### 3.4 `record(runFile, slug)` — `gauge.js:200-211`

**変更前**(実物 200-211):
```js
function record(runFile, slug) {
  const run = JSON.parse(fs.readFileSync(runFile, 'utf8'));
  const m = score(run);
  const entry = { ts: new Date().toISOString(), slug, scale: (run.meta && run.meta.scale) || null, metrics: m };
  fs.appendFileSync(ledgerPath(), JSON.stringify(entry) + '\n');   // ★209 欠陥の中心
  return entry;
}
```

**変更後**:
```js
function record(runFile, slug) {
  const run = JSON.parse(fs.readFileSync(runFile, 'utf8'));
  const m = score(run);
  const entry = { ts: new Date().toISOString(), slug, scale: (run.meta && run.meta.scale) || null, metrics: m };
  entry.fp = fingerprint(entry);                       // ★1 指紋を刻む(FR-1 / 鍵は entry の中に住む)

  // ★2 追記前に既存を検める(FR-2)。**fail-open**: 読めない台帳は「重複を見逃して書く」側に倒す
  let existing = null;
  try {
    for (const e of readLedger({ raw: true })) {
      if ((e.fp || (e.metrics ? fingerprint(e) : null)) === entry.fp) { existing = e; break; }
    }
  } catch (err) {
    console.error(`⚠️ ledger unreadable, recording anyway: ${err.message}`);  // 既存行は決して消さない
  }
  if (existing) return { ...existing, skipped: true };  // 追記しない。**第一の記録を正とする(keep-first)**

  fs.appendFileSync(ledgerPath(), JSON.stringify(entry) + '\n');
  return entry;
}
```
- 返り値は必ず `metrics` を持つ(既記録を返す場合も)。CLI(`gauge.js:293`)が `e.metrics.score` を読むため。
- `skipped: true` は**返り値にだけ載る**。台帳のファイルには一字も書かない(NG-2: 台帳の鍵は増やさない)。
- **fail-open の向き**を明文化: 台帳が読めないときは *書く*。`existing` の探索に失敗しても
  `fs.appendFileSync` は元のまま実行される。**削除・切り詰めの経路は一つも足さない。**

### 3.5 CLI `record` の口 — `gauge.js:287-295`

**変更前**(292-293):
```js
const e = record(file, slug);
console.log(`📒 recorded: ${e.slug} → ${e.metrics.score}/100 (${ledgerPath()})`);
```
**変更後**(AC-2c: 二度目は沈黙せず名乗る。**exit code は 0 のまま**):
```js
const e = record(file, slug);
if (e.skipped) console.log(`📒 already recorded: ${e.slug} → ${e.metrics.score}/100 @ ${e.ts} (同一指紋 ${e.fp || fingerprint(e)}) — 追記しない`);
else           console.log(`📒 recorded: ${e.slug} → ${e.metrics.score}/100 (${ledgerPath()})`);
```

### 3.6 `baseline()` — `gauge.js:214-234` は **一行も変えない**

`baseline()` は `record()` を呼ぶだけ(223 / 229 行)なので、`record()` が冪等になれば
**baseline は自動的に冪等になる**(requirements FR-2:82)。**変更しないことが設計判断である。**
NG-7(baseline の到達範囲を広げない)もここで守られる。

### 3.7 `latestFor(slug, entries)` — `gauge.js:241-244`

**変更前**:
```js
function latestFor(slug, entries) {
  const hits = entries.filter(e => e.slug === slug && e.metrics);
  return hits.length ? hits[hits.length - 1] : null;   // ★ 位置を時刻の代理にしている
}
```
**変更後**(FR-4 / AC-4b):
```js
function latestFor(slug, entries) {
  const hits = entries.filter(e => e && e.slug === slug && e.metrics);
  if (!hits.length) return null;
  // 「最新」は ts の最大。行位置は見ない(マージ後の行順は時刻順ではない — discovery 2章 T0,T2,T1)
  return hits.reduce((best, e) => (String(e.ts || '') > String(best.ts || '') ? e : best), hits[0]);
}
```
- **`foldLedger` が既に整列しているのに、なぜ `latestFor` も明示するのか**:
  `latestFor` は `entries` を**引数で受ける**(`gauge.js:248` の呼び出し)ため、
  畳みを通っていない配列を渡されうる。順序非依存は**関数自身の性質**として持たせる(defense in depth)。
- **これを `module.exports` に足す**(V-11 の制約を解く)。AC-4b は `latestFor` を直接撃つ。

### 3.8 `compare --last N` — `gauge.js:301-308`

**変更前**(305):
```js
const entries = readLedger().filter(e => e.metrics).slice(-n);
```
**変更後**: **一字も変えない。**
理由: `readLedger()` が既に「畳んで ts 昇順に整列」して返すので(§3.1 / §3.2)、
`slice(-n)` は**整列済み配列の末尾 N = 時刻の新しい N 件**という正しい意味になる。
AC-3c(3件が異なる観測)は畳みによって満たされる。
> **設計上の注意**: これは「`slice(-n)` を許した」のではなく「配列に時刻順という不変条件を与えた」のである。
> この不変条件を破る変更(畳みを外す・整列を外す)は AC-3c と AC-4a が同時に鳴らす。

### 3.9 `auditLedger(entries)` — 新規(FR-7 / NFR-1 / NFR-2)

```js
/** 台帳の健全性を数える純関数。読むだけ。書かない。 */
function auditLedger(entries) {
  const byFp = new Map();      // fp -> entry[]
  const bySlug = new Map();    // slug -> Map<fp, entry>
  for (const e of entries) {
    if (!e || !e.metrics) continue;
    const fp = e.fp || fingerprint(e);
    if (!byFp.has(fp)) byFp.set(fp, []);
    byFp.get(fp).push(e);
    if (!bySlug.has(e.slug)) bySlug.set(e.slug, new Map());
    bySlug.get(e.slug).set(fp, e);
  }
  const rows = entries.filter(e => e && e.metrics).length;
  const distinct = byFp.size;
  // 矛盾 = 同一 slug に、metrics が食い違う観測が2つ以上ある(FR-7)
  const conflicts = [];
  for (const [slug, m] of bySlug) {
    if (m.size < 2) continue;
    const obs = [...m.values()].sort((a, b) => String(a.ts) < String(b.ts) ? -1 : 1);
    const diffs = COMPARE_KEYS.filter(k => new Set(obs.map(o => o.metrics[k])).size > 1);
    if (diffs.length) conflicts.push({ slug, keys: diffs, observations: obs.map(o => ({ ts: o.ts, fp: o.fp || fingerprint(o), score: o.metrics.score })) });
  }
  return { rows, distinct, duplicates: rows - distinct, conflicts };
}
```

**新サブコマンド** `gauge.js ledger --audit`(NFR-2。読み取り専用):
```js
if (cmd === 'ledger') {
  if (argv.includes('--audit')) {
    const a = auditLedger(readLedger({ raw: true }));   // 生の全行を数える
    console.log(`📒 rows=${a.rows} distinct=${a.distinct} duplicates=${a.duplicates} conflicts=${a.conflicts.length}`);
    for (const c of a.conflicts) console.log(`  ⚠️ 矛盾: ${c.slug} — ${c.keys.join(',')} が食い違う (${c.observations.map(o => `${o.ts}:${o.score}`).join(' vs ')})`);
    process.exit(a.duplicates > 0 || a.conflicts.length > 0 ? 1 : 0);   // AC-7b の判別可能な信号
  }
  console.log(renderLedger(readLedger()));   // 既定は畳んだ一覧
  return;
}
```

### 3.10 `renderLedger(entries)` — `gauge.js:263-272`(NFR-1。**must を危うくするなら捨てる**)

`ledger` サブコマンドの出力に一行だけ足す案:
```
═══════ 📒 GAUGE LEDGER ═══════
  ... 6 行 ...
  (raw 30 行 / 重複 24 行を畳んだ — `gauge.js ledger --audit` で内訳)
═══════════════════════════════
```
**ただし `renderLedger` の関数シグネチャは変えない。** `renderLedger` は `baseline()` の返り値
(`gauge.js:298`)にも使われ、そこには `{slug, error}` 行が混じる(`gauge.js:224, 230`)。
畳みの件数は**呼び出し側(`gauge.js:313` の `ledger` 分岐)で組み立てて追記する**。
NFR-1 は nice-to-have なので、AC-2/3/4/5/6 が危うくなったら**この節ごと落とす**(requirements:310)。

---

## 4. 後方互換(FR-5)—— 指紋を持たない古い行の扱い

**方針: 「読み時に導出する」。別扱いにはしない。**

- 台帳の既存 30 行は `['ts','slug','scale','metrics']` のみ(§0 で再実測、V-4 と一致)。
- `foldLedger`(§3.2)と `record`(§3.4)と `auditLedger`(§3.9)の**すべて**が
  `e.fp || fingerprint(e)` という同一の式で鍵を得る。**鍵の在り方が一箇所に住む。**
- **読み飛ばし・エラー・行落ちは起こらない**: 導出は純粋な計算であり、失敗し得るのは
  `metrics` が無い行だけ。その行は畳みの対象外として **そのまま残す**(§3.2 の `raw:` 分岐)。
  → AC-5a(`readLedger().length === N`)を満たす。
- **AC-5c(新旧混在で1行に畳まれる)の成立条件**は「`fp` 自身を材料に含めないこと」(§2.1)。
  §0 で `mixed old/new same key: true` を実測済み。
- **旧行を engine が書き換えることはしない。** ファイルに `fp` を後から注入する移行スクリプトは作らない
  (書き込みは `record` の append 一本という現在の性質を保つ)。
  FR-8 の掃除(§6)で書き戻される 6 行には、その時点で `fp` が入る。

### 4.1 metrics スキーマの漂流について(正直に名指す)

§0 の実測: 旧行の `metrics` は 11 鍵、現在の `score()`(`gauge.js:154-167`)は
`tier1, tier2, tier3, noTier, unobservable, tier3Ratio` を加えた **16 鍵**を返す。
ゆえに **「同じ run を今日 record し直した行」は旧行と指紋が違い、畳まれずに2行残る。**

- これは**設計どおりである**。metrics が違えば観測が違う。畳んで隠せば第38条を裏切る。
- 人はこれを FR-7 の経路(`ledger --audit`)で**矛盾として見つけられる**。
- `tier3Ratio` が旧行に無いこと自体は **NG-6(射程外の別欠陥)**。本改修では触らない。

### 4.2 既存門 `tests/paradise.test.js:2906` をどう扱うか ★指示された論点

**結論: この試験は一字も変えない。変えずに緑のまま通る。**

実読した中身(2906-2931):
- 2918-2919 が `g2.record(before, 'demo-before')` と `g2.record(after, 'demo-after')` を撃つ。
- 2921 が `assert.strictEqual(entries.length, 2, '台帳は2行を刻む')`。

この2回は `makeGaugeRun`(2831-2843)由来の **異なる slug × 異なる metrics** である:
- `before` = `makeGaugeRun({ reworks: 3, retries: { build: 2 } })` → 減点あり
- `after` = `makeGaugeRun()` → 満点

ゆえに **指紋は二つとも別**であり、書き側は2行を刻み、読み側の畳みも2行を返す。
requirements FR-5 の AC-5d(requirements:199-202)が述べたとおり
「**この試験が赤くなる実装は FR-2 の解釈を誤っている**」— 本設計は誤っていない。

> **BUILD への警告**: もしこの試験が赤くなったら、原因は指紋の材料に `slug` か `metrics` が
> 入っていないことである。**試験を書き換えて緑にしてはならない。** 指紋の定義を §2.1 に戻せ。

---

## 5. FR-7(矛盾の名指し)の具体化

### 5.1 何が「矛盾」か

FR-7(requirements:230)が言う矛盾は **「同一の観測対象(同一 slug・同一 run)に対して metrics が食い違う」**。
指紋は `metrics` を材料に含むので、**metrics が違えば指紋も違い、両方が残る**(AC-7a = 畳まれず2行)。
本 FR が追加で要求するのは「**それを人が見つけられる出力経路**」(requirements:236)である。

### 5.2 振る舞いの定義

| 状況 | 指紋 | 畳み | 出力 |
|---|---|---|---|
| 同一 slug・同一 metrics(真の重複) | 一致 | **1行に畳む** | `--audit` が `duplicates` に数える |
| 同一 slug・metrics が食い違う | **不一致** | **両方残す** | `--audit` が `conflicts` に**名指す** + **exit 1** |
| 別 slug | 不一致 | 両方残す | 何も言わない |

- **黙って先着を採らない。** 畳みは同一指紋にしか効かないので、構造的に矛盾を隠せない。
- **`record` は矛盾を止めない。** 同一 slug で metrics が違えば、それは新しい観測であり追記する。
  Stripe(discovery 3-2)は API 呼び出しを**拒否**するが、楽園の台帳は**記録の器**である —
  記録を拒めば「記録が失われない」という台帳の第一の徳を壊す(discovery 4章の所見と同じ理由)。
  **拒否ではなく名指し**を採る。
- **矛盾の判定鍵**は `COMPARE_KEYS`(`gauge.js:236` の
  `score, firstPassRate, reworkCount, retryOverhead, loopGuardTrips, tier3Ratio`)に限る。
  `durationMs` のような走行環境で当然揺れる値で矛盾を鳴らすと、鳴りっぱなしの門になる。
  **判定鍵の一覧は既存の定数を借りる — 二箇所に住まわせない。**
- **第16条**: 片方の行に `tier3Ratio` が無い(`undefined`)場合、`new Set([undefined, 0.5]).size === 2` で
  矛盾として鳴る。これは正しい —— **「測れなかった」と「0.5 だった」は違う**。0 で埋めない。

### 5.3 実例(discovery 1.6)

台帳の `reform-claude-md-diet 80` と現在の実測 `score = 100`。
本設計下では: 今日 record すれば指紋が違うので2行残り、`ledger --audit` が
`⚠️ 矛盾: reform-claude-md-diet — score が食い違う (2026-09-02T07:03:12.473Z:80 vs <今>:100)` と名指し **exit 1**。
**この矛盾の原因究明(台帳の鮮度)は NG-5 により射程外** —— 名指すところで止める。

---

## 6. FR-8 —— 汚染 24 行の処置(creations 側。**今は実行しない**)

台帳の住所は `node graph/workspace.js root` → `C:\Users\kikus\Documents\workspace\paradise-creations`。
**engine の PR(paradise 側)とは別の PR** である(AC-8d)。
**前提: paradise 側で `foldLedger` が実装され緑になった後**に実行する(掃除スクリプトが engine の畳みを呼ぶため)。

```bash
# ── 0. 処置前の証拠を採る(AC-8b/AC-8c の前後比較に要る) ──────────────
cd /c/Users/kikus/Documents/workspace/paradise-creations
git rev-parse --abbrev-ref HEAD
git status --short gauge-ledger.jsonl          # 期待: " M gauge-ledger.jsonl"
wc -l < gauge-ledger.jsonl                     # 期待: 30
git log --oneline -- gauge-ledger.jsonl        # 期待: 7791cdf / f804697 を控える(AC-8c)
cp gauge-ledger.jsonl "$LOCALAPPDATA/Temp/gauge-ledger.before.jsonl"   # 退避

# ── 1. 枝を切る(main への直接 commit は禁 / 第23条の道) ──────────────
git switch -c reform/gauge-ledger-fold

# ── 2. 楽園の engine の畳みで書き戻す(掃除の規則を二箇所に書かない) ──
node -e "
  const fs=require('fs'), path=require('path');
  const g=require('C:/Users/kikus/Documents/workspace/paradise/graph/gauge.js');
  const p=g.ledgerPath();
  const raw=g.readLedger({raw:true});
  const folded=g.foldLedger(raw);
  console.log('raw', raw.length, '-> folded', folded.length);
  // 観測を一つも失わないことを書く前に検める(AC-8b)
  const S=a=>new Set(a.map(e=>e.fp||g.fingerprint(e)));
  const A=S(raw), B=S(folded);
  if (A.size!==B.size || [...A].some(k=>!B.has(k))) { console.error('指紋集合が一致しない — 中止'); process.exit(1); }
  fs.writeFileSync(p, folded.map(e=>JSON.stringify({...e, fp: e.fp||g.fingerprint(e)})).join('\n')+'\n');
  console.log('wrote', p);
"

# ── 3. 処置後の証拠(AC-8a / AC-8b) ────────────────────────────────
wc -l < gauge-ledger.jsonl                     # 期待: 6
node /c/Users/kikus/Documents/workspace/paradise/graph/gauge.js ledger --audit   # 期待: duplicates=0 → exit 0
git diff --stat gauge-ledger.jsonl

# ── 4. 普通のコミットで置く(履歴は書き換えない = NG-1) ───────────────
git add gauge-ledger.jsonl
git commit -m "第38条: gauge 台帳の重複を畳む — raw 30 行 / distinct 6 を keep-first で 6 行に

同一指紋(slug+scale+metrics)の行が 24 行(80%)重複していた。
先着(ts 最小)を残し、観測は一つも失っていない(指紋集合は前後で一致)。
80→100 の本物の改善2行(reform-eval-gauge)は両方残っている。
履歴は書き換えていない — 畳んだ版を前に進めるだけ(旧状態は git show で復元可)。"

git log --oneline -- gauge-ledger.jsonl        # 期待: 7791cdf / f804697 が同じ SHA で残る(AC-8c)
git push -u origin reform/gauge-ledger-fold
gh pr create --title "第38条: gauge 台帳の重複 24 行を畳む (30 -> 6)" --body-file <(cat <<'EOF'
## 何を
gauge-ledger.jsonl の 30 行のうち 24 行(80%)が同一観測の重複だった。keep-first で 6 行に畳む。

## 証拠
- 前: `wc -l` = 30 / distinct 指紋 = 6
- 後: `wc -l` = 6 / distinct 指紋 = 6 / `gauge.js ledger --audit` → duplicates=0 exit 0
- 指紋集合は前後で完全一致 —— **観測は一つも失われていない**
- `reform-eval-gauge 80 → 100` の改善2行は両方残存

## やっていないこと
- 履歴の書き換え(rebase/filter-branch/force-push)は**していない**。旧状態は `git show HEAD~1:gauge-ledger.jsonl` で復元できる。
- engine の修正は paradise 側の別 PR。
EOF
)
```

**AC-8d の担保**: paradise 側 PR の `git diff --name-only` に `gauge-ledger.jsonl` が現れないこと。
台帳は creations 側リポジトリにしか存在しないので構造的に満たされるが、BUILD 完了時に一度 `git diff --name-only` で確認する。

---

## 7. 門の設計 —— `tests/paradise.test.js` への組み込み

### 7.1 置き場所と作法

- 既存の Gauge 節(`tests/paradise.test.js:2826-2931`)の**直後**、`verdict` 節(2933 行)の**手前**に足す。
- 全ての門は既存作法(`tests/paradise.test.js:2907-2930`)に従う:
  1. `fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-gauge-'))` で仮倉を作る
  2. `process.env.PARADISE_CREATIONS = tmp` で住所を振り替える(**第30条を破らない**)
  3. `delete require.cache[...workspace.js]` と `[...gauge.js]` を撃ってから `require`
  4. `finally` で env を戻し、require.cache を再度捨て、`fs.rmSync(tmp, {recursive:true, force:true})`
- **実台帳を一行も書き換えない**(AC-9c)。門は仮倉としか話さない。
- 上記 4 段は 6 つの門で繰り返されるので、**`withGaugeSandbox(fn)` という補助関数**を Gauge 節の先頭に置く
  (`tests/paradise.test.js:1084-1095` の `withGuard` が既に同型の先例)。

### 7.2 AC → 門 の対応表(requirements の AC を一つも落とさない)

| AC | 門の名(test の題) | 撃ち方 | 期待 |
|---|---|---|---|
| **AC-1a** | `gauge: 同一 run の二度の record は同じ指紋を名乗る (FR-1)` | 仮倉で `record(run,'coin')` ×2、返り値の `fp` を比較 | `a.fp === b.fp`(かつ二度目は `skipped === true`) |
| **AC-1b** | 同上(同じ門の中) | `fingerprint({...e, ts:'1999-01-01T00:00:00.000Z'})` を比較 | `ts` を変えても同一 |
| **AC-1c** | `gauge: 冪等化は第二の住所を持ち込まない (第30条)` | `execFileSync(node, ['graph/workspace.js','check'])` + `gauge.js` の本文に `paradise-creations` 直書きが無いこと | exit 0 / 直書きゼロ。既存 B-4 門も緑のまま |
| **AC-2a** | `gauge: baseline を二度走らせても台帳は増えない (FR-2 / 冪等性の核)` | 仮倉に `conclave.json` ×2 → `baseline()` → 行数 n1 → `baseline()` → n2 | `n1 === n2 === 2` |
| **AC-2b** | `gauge: record の二度打ちも一行 — 人が実際に歩く道 (FR-2)` | `record(run,'coin')` ×2 → 生の行数 | `1` |
| **AC-2c** | `gauge: 二度目の record は沈黙せず「既記録」を名乗る` | CLI を `execFileSync` で2回。二度目の stdout | `/already recorded/` を含み **exit 0** |
| **AC-2d** | `gauge(故障注入): 冪等検査を外すと AC-2a が鳴る` | §7.3 の注入手順 | 注入版で `n2 === n1*2` → 門の assert が throw |
| **AC-3a** | `gauge: 実台帳同型の30行が6行に畳まれる (FR-3)` | 仮倉に 30 行(distinct 6)を書き `foldLedger(readLedger({raw:true})).length` | `6` |
| **AC-3b** | `gauge: 畳みは 80→100 の本物の改善を殺さない (第38条)` | 同じ 30 行の畳み結果に `reform-eval-gauge` が score 80 と 100 の**両方**在ること | `true` |
| **AC-3c** | `gauge: 重複台帳でも compare --last 3 が3つの異なる観測を返す` | CLI `compare --last 3` の出力3行を `(slug,score)` で集合化 | 重複なし = 3 |
| **AC-3d** | `gauge(故障注入): 畳みを外すと窓が重複で埋まる` | §7.3 | 注入版で窓に同一 `(slug,score)` が2つ → assert が throw |
| **AC-4a** | `gauge: 行順を入れ替えても畳んだ結果が同一 (FR-4)` | 同じ 30 行を 2 通り shuffle → `JSON.stringify(fold(A)) === JSON.stringify(fold(B))` | `true`(§0 で 5 回実測済み) |
| **AC-4b** | `gauge: 「最新」は ts の最大であって末尾行ではない` | 台帳を `T0, T2, T1` の順で書き `latestFor('coin', readLedger({raw:true}))` | `T2` の行(末尾の `T1` ではない) |
| **AC-4c** | `gauge(故障注入): hits[hits.length-1] に戻すと AC-4b が鳴る` | §7.3 | 注入版が `T1` を返す → assert が throw |
| **AC-5a** | `gauge: 冪等鍵を持たない旧形式のみの台帳で行が一つも落ちない (FR-5)` | 旧形式 N 行を書き `readLedger({raw:true}).length` | `N` |
| **AC-5b** | `gauge: 鍵が無くても再計算で畳める` | 旧形式 30 行 → `readLedger().length` | `6` |
| **AC-5c** | `gauge: 新旧混在(鍵あり/なしの同一観測)は1行に畳まれる` | 同一観測を「`fp` 付き」と「`fp` 無し」で2行書く → 畳み | `1`(§0 で `mixed old/new same key: true` を実測) |
| **AC-5d** | (門を足さない) | `node tests/paradise.test.js` 全体 | `0 failed` かつ既存 2906 の門が緑 |
| **AC-6a** | `gauge: 衝突マーカー入り台帳でも生きた3行が読める (FR-6)` | `<<<<<<< HEAD` / `=======` / `>>>>>>> A` を挟んだ台帳 → `readLedger({raw:true}).length` | `3`、例外を投げない |
| **AC-6b** | `gauge: 破損台帳に畳みを掛けても生きた行が減らない` | 同じ台帳 → `readLedger().length`。**3行は互いに異なる metrics にする** | `3` |
| **AC-6c** | `gauge: 破損行が在っても record は既存行を失わない (fail-open)` | 破損台帳に `record` → 生きた行数を前後比較 | 後 ≥ 前 |
| **AC-7a** | `gauge: 同一 slug で metrics が違えば畳まれず2行残る (FR-7)` | 同一 slug・別 metrics の2行 → 畳み | `2` |
| **AC-7b** | `gauge: 矛盾は判別可能な信号で名指される` | CLI `ledger --audit` を矛盾あり/なしの2つの仮倉で | あり: **exit 1** かつ stdout に `矛盾` と slug 名。なし: **exit 0** |
| **AC-8a/b/c/d** | (creations 側 / §6 の手順で実出力を採る) | paradise の門にはしない —— 別リポジトリの状態を engine の自己試験が前提にすると、他マシンで偽の赤が出る(`tests/paradise.test.js:2900` の「他マシンでは沈黙」と同じ理由) | §6 の実出力を PROVE 相の証拠として提出 |
| **AC-9a** | (門を足さない) | `node tests/paradise.test.js` | `N > 344` かつ `0 failed` |
| **AC-9b** | (既存門) | `node tests/dashboard-run-panel.test.js` | 緑(AC-22a が baseline 不呼び出しを守る) |
| **AC-9c** | `gauge: 門は実台帳を書き換えない` | 全門実行の前後で `../paradise-creations` の `git status --short` を比較 | 差分なし。倉が無い機では沈黙(第20条) |
| **NFR-1** | `gauge: ledger の出力が畳んだ件数を名乗る` | CLI `ledger` の出力 | `30` と `6` に相当する数が現れる。**must を危うくするなら落とす** |
| **NFR-2** | AC-7b と同じ門が兼ねる | — | — |
| **NFR-3** | AC-1a が兼ねる(`fingerprint` を export したので確認経路が在る) | — | — |

**discovery の G-1〜G-7 との対応**(requirements §4.1 の表をそのまま継承。**一つも落としていない**):
G-1→AC-2a / G-2→AC-2b / G-3→AC-3c / G-4→AC-6a,6b,6c / G-5→AC-4a,4b / G-6→AC-7a,7b / G-7→AC-1c。

### 7.3 故障注入門の作り方 ★「実装を壊してテストが赤くなること」をどう確かめるか

**楽園の既存の作法をそのまま借りる。** `tests/paradise.test.js:5067-5085`(spawn-trace の上限外し)が先例である:

> `const src = fs.readFileSync(ST,'utf8'); const old = src.replace(/…/, '…旧実装…');`
> `assert.notStrictEqual(old, src, '注入すべき箇所が見つからない');`
> 壊した複製を撃つ → **落ちること**を assert / 実物を撃つ → **緑であること**を assert

**gauge 版の手順**(3 つの注入で共通):

```js
function injectGauge(sandDir, replacer) {
  const SRC = path.join(DIR, '..', 'graph', 'gauge.js');
  const src = fs.readFileSync(SRC, 'utf8');
  const broken = replacer(src);
  // ★ 置換が効かなければ「前提が変わった」= 門の失効。ここで必ず鳴らす
  assert.notStrictEqual(broken, src, '注入すべき箇所が見つからない — 実装の形が変わった');
  // 複製は sandbox に置く。相対 require を実物の graph/ に向け直す
  const out = path.join(sandDir, 'gauge.broken.js');
  fs.writeFileSync(out, broken.replace(/require\('\.\/([\w.-]+)'\)/g,
    (_, f) => `require(${JSON.stringify(path.join(DIR, '..', 'graph', f))})`));
  return out;
}
```

| 門 | 何を注入するか(置換の的) | 注入版に期待する挙動 |
|---|---|---|
| **AC-2d** | `record` の重複検査ブロック(`if (existing) return {...existing, skipped:true};` と探索ループ)を丸ごと削り、無条件 `appendFileSync` に戻す | `baseline()` ×2 で行数が `n1*2` になる。門は「注入版で行数が倍になること」を **assert する**(= 注入版が期待どおり壊れる) |
| **AC-3d** | `readLedger` の `return opts.raw ? out : foldLedger(out);` を `return out;` に戻す | `compare --last 3` の窓に同一 `(slug,score)` が2つ現れる |
| **AC-4c** | `latestFor` の `hits.reduce(...)` を `hits[hits.length - 1]` に戻す | `T0,T2,T1` の台帳で `T1` を返す(誤り) |

**各門の形は必ず二段で撃つ**(片側だけでは門ではない — `tests/paradise.test.js:3412`
「緑になるだけの門は門ではない (第21条 壊して鳴らす)」):

1. **注入版で撃つ** → 壊れた結果になることを assert(`assert.notStrictEqual(n2, n1)` 等)。
   ここが通らないなら、その門は**健全な系しか見ていない**ので門ではない。
2. **実物で撃つ** → 正しい結果になることを assert。

> **「exit 1 で鳴る」の実体**: 注入版を `execFileSync(process.execPath, ['-e', script])` で子プロセスとして撃ち、
> **子プロセスが非ゼロで落ちること**を親が確かめる形にする(`tests/paradise.test.js:5059-5078` と同型)。
> これにより requirements が言う「門が exit 1 で鳴る」を**文字どおり実測できる**。

### 7.4 CI への接続(FR-9)

`.github/workflows/tribunal.yml` を実読した(全344行)。gauge の段は**一つも無い**(`grep -c gauge` → `0`)。
新しい門は `tests/paradise.test.js` に住むので、**26-27 行の「⚖️ Self-test」段が自動的に撃つ** —— これで FR-9 は満たされる。
加えて、台帳の健全性を CI が名指しで見るために、`📄 Derived` 段(125-126 行)の直後に一段足すことを**推奨**する:

```yaml
      - name: 📒 Gauge ledger — 台帳が冪等か (第38条 / FR-2〜FR-7)
        # CI には creations の倉が無い。倉が無ければ台帳は 0 行 → duplicates 0 → exit 0。
        # ゆえにこの段は「倉が在るとき」だけ実質的に鳴る。偽の赤は出さない(第20条)。
        run: node graph/gauge.js ledger --audit
```
**`|| true` を付けないこと**(tribunal.yml:35, 187-191, 264-283 が同じ戒めを三度述べている)。

---

## 8. リスクと回避策 —— とくに既存 344 門を赤くし得る箇所

| # | リスク | 影響する既存門(実読した行) | なぜ安全か / 回避策 |
|---|---|---|---|
| R-1 | **`readLedger()` が畳むようになると行数が変わる** | `tests/dashboard-count.test.js:156` `snap.ledger.length === gauge.readLedger().length` | 両辺が同じ `readLedger()` を通る(pulse.js:428)。**同時に畳まれるので一致は保たれる**。BUILD は実際に `node tests/dashboard-count.test.js` を撃って確かめること |
| R-2 | **畳みで並びが変わる** | `tests/dashboard-run-panel.test.js:210-213` `snap.ledger[i].ts === rows[i].ts` を全 i | 畳みも整列も決定的(§3.2 の tie-break 込み)。両辺が同じ関数を通るので同じ列になる |
| R-3 | **`ts` を加工したと見なされる** | 同上 212 行 / `dashboard/paradise.js:372` の宣言 | 畳みは `ts` を**一字も書き換えない**。行を選び並べ替えるだけ |
| R-4 | **既存の gauge 門が record ×2 で2行を要求** | `tests/paradise.test.js:2921` | §4.2 の分析: 異なる slug × 異なる metrics ゆえ指紋が別。**2行のまま**。**この門を書き換えてはならない** |
| R-5 | **`compare` が `latestFor` の変更で壊れる** | `tests/paradise.test.js:2922-2924`(`compare` が改善を語り、記録なきは throw) | `latestFor` は「最後の一件」から「ts 最大の一件」に変わるだけ。2行しかない仮倉では同じ行を返す。`throw` の経路(`gauge.js:249`)は変えない |
| R-6 | **`baseline()` の返り値が変わり `renderLedger` が落ちる** | `gauge.js:298` → `renderLedger` → `267` が `e.ts.slice()` と `e.metrics.score` を読む | `record` は既記録でも `{...existing, skipped:true}` を返すので **`ts` と `metrics` を必ず持つ**。`renderLedger` は無傷 |
| R-7 | **`crypto` の追加が「外部依存」と見なされる** | `tests/dashboard-no-deps.test.js` / tribunal.yml:155-156 | `crypto` は **Node 標準**。ただしこの門は dashboard の資材を見るものであり gauge は対象外。念のため BUILD は実際に撃って確かめる |
| R-8 | **`gauge.js` の行数増で wiring / census の数が動く** | `graph/census.js check`(tribunal.yml:122-123)/ `graph/wiring.js check`(142-145) | 新規 export(`fingerprint, foldLedger, latestFor, auditLedger`)が**孤児**と判定される恐れ。**全て門(tests)から呼ばれる**ので辺が立つ。BUILD は `node graph/wiring.js check` と `node graph/census.js check` を必ず撃つ |
| R-9 | **`record` が読み取りを始めることで遅くなる** | `tests/dashboard-perf.test.js`(tribunal.yml:164-165) | perf 門は pulse の同期経路を見る。pulse は `record` を呼ばない(`AC-22a` が禁じている)。台帳は 6 行規模で影響は無視できる |
| R-10 | **fail-open の実装ミスで既存行が消える** | (門が無い領域 = 最も危険) | `record` に**削除・truncate・`writeFileSync` の経路を一つも足さない**。書き込みは `appendFileSync` のまま。AC-6c がこれを見張る |
| R-11 | **`ledger --audit` が実台帳で常に exit 1** | 新設 CI 段 | FR-8 の掃除(§6)が終われば `duplicates=0` になる。**掃除の PR を engine の PR より先にマージするか、CI 段の追加を掃除後に回す**(§9 の順序で担保) |
| R-12 | **自己試験が長い**(requirements:406 が「所要 >6分」と記録) | 反復のたびに全体を撃つと BUILD が遅い | BUILD 中は `node -e` で個別の門を撃ち、最後に一度だけ全体を撃つ |

---

## 9. BUILD 相への手渡し —— 順序付きの作業分解

各段は **「撃つコマンド」と「期待する実出力」** を持つ。**前段が緑になるまで次段へ進まない。**

| # | やること | 触るファイル | 撃って確かめる |
|---|---|---|---|
| **B-0** | 枝を切る(`main` へ直接 commit しない) | — | `git switch -c reform/gauge-ledger-idempotent` / `node graph/branch-guard.js` |
| **B-1** | `canonical` / `fingerprint` を実装(§2)。`crypto` を require に足す。`module.exports` に `fingerprint` を追加 | `graph/gauge.js` | `node -e "const g=require('./graph/gauge.js'); ..."` で実台帳 30 行を指紋化 → **`distinct 6`**(§0 と一致) |
| **B-2** | `foldLedger` を実装(§3.2)し export。**`readLedger` はまだ変えない** | `graph/gauge.js` | 実台帳で `foldLedger(readLedger()).length` → **`6`** / shuffle ×5 で不変 |
| **B-3** | `readLedger(opts)` を畳む側に切り替え(§3.1) | `graph/gauge.js` | **R-1/R-2 の回帰**: `node tests/dashboard-count.test.js` と `node tests/dashboard-run-panel.test.js` が**緑** |
| **B-4** | `latestFor` を ts 最大に(§3.7)+ export | `graph/gauge.js` | `T0,T2,T1` の仮倉で **`T2`** を返す |
| **B-5** | `record` に指紋刻印と重複検査(§3.4)+ CLI の文言(§3.5) | `graph/gauge.js` | 仮倉で `baseline` ×3 → **`2 / 2 / 2`**(現状の `2/4/6` が消えること)/ `record` ×2 → **1行** |
| **B-6** | **既存 344 門の回帰**をここで一度撃つ | — | `node tests/paradise.test.js` → **`344 passed, 0 failed`**(まだ新門を足していないので数は同じ) |
| **B-7** | `auditLedger` + `ledger --audit`(§3.9) | `graph/gauge.js` | 実台帳で `rows=30 distinct=6 duplicates=24` → **exit 1** |
| **B-8** | 門を書く: AC-1a/1b/1c, 2a/2b/2c, 3a/3b/3c, 4a/4b, 5a/5b/5c, 6a/6b/6c, 7a/7b, 9c(§7.2) | `tests/paradise.test.js` | `node tests/paradise.test.js` → **`0 failed`** かつ **`N > 344`** |
| **B-9** | **故障注入門** AC-2d / AC-3d / AC-4c(§7.3) | `tests/paradise.test.js` | 注入版が**壊れること**を実出力で示す。三つとも二段(注入=赤 / 実物=緑) |
| **B-10** | NFR-1(`ledger` の件数表示)。**B-8/B-9 を危うくするなら落とす** | `graph/gauge.js` | `ledger` の出力に `30` と `6` |
| **B-11** | 憲法・門の周辺を撃つ | — | `node graph/workspace.js check`(exit 0)/ `node graph/census.js check` / `node graph/wiring.js check` / `node graph/critic.js review graph --self --lessons graph/lessons.json` |
| **B-12** | CI に段を足す(§7.4)。**`\|\| true` を付けない**。**R-11 により §6 の掃除の後に回してよい** | `.github/workflows/tribunal.yml` | YAML の構文 + ローカルで `node graph/gauge.js ledger --audit` |
| **B-13** | paradise 側 PR を立てる | — | `git diff --name-only` に **`gauge-ledger.jsonl` が現れない**(AC-8d) |
| **B-14** | **creations 側**の掃除(§6 の手順)。**別の PR** | `../paradise-creations/gauge-ledger.jsonl` | `wc -l` → **`6`** / `ledger --audit` → exit 0 / `git log` の旧 SHA が不変(AC-8c) |
| **B-15** | 第38条の証明を採る(DoD 6) | — | 前: `rows=30 distinct=6 duplicates=24` / 後: `rows=6 distinct=6 duplicates=0` |

**依存の向き**: B-1 → B-2 → B-3 → B-4 → B-5 は直列(後段が前段の関数を使う)。
B-7 は B-1/B-2 に依存。B-8/B-9 は B-5 まで完了後。B-14 は B-13 のマージ後(engine の `foldLedger` を使うため)。
B-12 は B-14 の後が安全(R-11)。

---

## 10. 追跡可能性 —— FR → 本書の節

| FR | 本設計での応答 |
|----|----|
| **FR-1** 冪等鍵 | §2 全体(材料 §2.1 / 正規化 §2.2 / ハッシュ §2.3)、§3.3。鍵は entry の `fp` に住み、別ファイルを作らない |
| **FR-2** 書き側の予防 | §3.4(`record` の重複検査と fail-open)/ §3.5(AC-2c の文言)/ §3.6(baseline は無変更で自動的に冪等) |
| **FR-3** 読み側の治癒 | §1.2(`readLedger` が既定で畳む決定)/ §3.2(`foldLedger` の keep-first)/ §3.8(`--last N` は無変更で正しくなる) |
| **FR-4** 順序非依存 | §3.2(ts 昇順 + 決定的 tie-break)/ §3.7(`latestFor` は ts 最大、かつ **export する** — V-11 の解消) |
| **FR-5** 後方互換 | §4(読み時に導出。別扱いにしない)/ §4.2(既存門 2906 は無変更で緑)/ §4.1(スキーマ漂流を正直に名指す) |
| **FR-6** 破損耐性 | §3.1(`try/catch` と警告文言を一字も変えない。畳みは parse の後段)/ §3.4(fail-open の向き) |
| **FR-7** 矛盾の名指し | §5(何が矛盾か・判定鍵は `COMPARE_KEYS`・拒否ではなく名指し・第16条で `undefined` を 0 と区別)/ §3.9 |
| **FR-8** 汚染24行の処置 | §6(creations 側のコマンド列。履歴を書き換えない。engine の畳みを呼ぶので規則が二箇所に住まない) |
| **FR-9** 門を CI に | §7.1-7.2(AC 対応表)/ §7.3(故障注入の作法)/ §7.4(Self-test 段が自動で撃つ + `ledger --audit` の段) |
| **NFR-1/2/3** | §3.10 / §3.9 / §3.3(`fingerprint` を export)。**must を危うくするなら落とす** |
| **NG-1〜10** | NG-1:§6 は普通の commit / NG-2: 足す鍵は `fp` 一つ / NG-3,4: `verdict.js`・`pulse.js`・`dashboard/` を触らない(§1.2 の決定はそのために在る) / NG-5:§5.3 は名指しで止める / NG-6:§4.1 で射程外と明記 / NG-7:§3.6 で baseline 無変更 / NG-8:§1.3 で索引ファイルを却下 / NG-9: 命令文書を触らない / NG-10:§7.3 の二段撃ち |

---

## 11. 本相で走らせたコマンド(すべて実行済み・engine は無変更)

```
git rev-parse --abbrev-ref HEAD                        → main
node -v                                                → v24.14.0
node -e "実台帳の entry 鍵/型を検査"                    → keysets ['ts,slug,scale,metrics'] / metrics 11鍵 / number,boolean のみ
node -e "JSON.stringify の鍵順依存を検める"             → {x,y} vs {y,x} は別文字列 (true)
node -e "0.1+0.2 / JSON.stringify(1.0) / -0 を検める"   → 0.30000000000000004 / "1" / "0"、Object.is(-0,0)=false
node -e "canon+sha256 原型で実台帳 30 行を指紋化"       → rows 30 / distinct fp16 6
node -e "keep-first 畳み + ts 整列"                     → folded 6(80→100 の2行が残存)
node -e "shuffle ×5 で畳み比較"                         → shuffle-invariant: true
node -e "metrics の鍵順を反転して指紋比較"              → key-order independent: true
node -e "fp 付き行と fp 無し行の指紋比較"               → mixed old/new same key: true
grep -c gauge .github/workflows/tribunal.yml           → 0(CI に gauge の門はゼロ)
grep -rn "readLedger|gauge-ledger|ledgerPath" (repo)   → 呼び出し元は gauge.js / pulse.js:428 / tests のみ
```

**実台帳(`../paradise-creations/gauge-ledger.jsonl`)は読んだだけで一行も書き換えていない。**
**`graph/` と `tests/` と `.github/` への書き込みはゼロ。** 本相の成果物は本書 1 ファイルのみ。
