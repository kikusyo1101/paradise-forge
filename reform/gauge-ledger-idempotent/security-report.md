# SECURITY 相 — 安全監査報告: gauge-ledger-idempotent

- **対象**: `git diff main...HEAD`(ブランチ `fix/gauge-ledger-idempotent`)
  10 ファイル / +2945 −12。中核は `graph/gauge.js` (+232)、`CONSTITUTION.md` 第55条 (+41)、
  `tests/paradise.test.js` (+563 / 24 門)。
- **監査の姿勢**: **読むだけ。実装を直さない。** 仮倉での実測のみを根拠に採る。
- **走らせた確かめ**: 本文中に「実測」として生出力を貼る。仮倉は
  `C:/Users/kikus/AppData/Local/Temp/paradise-sec-*`。実台帳は一度も書いていない(§7 で証明)。
- **判定の要旨**: 致命 0 / **重大 2** / 軽微 3 / 受容 6。
  重大2件はいずれも**「安全でない」のではなく「安全だと誤って信じられる」**類の欠陥である。

---

## 総括(先に結論)

この変更は、監査対象として**極めて健全**である。攻撃面は増えていない ——
子プロセスを起こさず、ネットワークに出ず、`slug` を住所に使わず、
書き込み経路は `appendFileSync` 一本のまま(削除・切り詰めを一つも足していない)。
prototype pollution も実際に撃って通らないことを確認した。

にもかかわらず**重大が2件ある**。両方とも同じ根から生えている ——
**「指紋 `fp` は、台帳というただのテキストファイルに書かれた自己申告であり、
engine はそれを一度も検証しない」**という一点である。
冪等化は「同じ観測を二度刻まない」ための機構だが、その鍵を信じる構造は
「**別の観測を一度も刻まない**」ことを可能にしてしまう。これは記録の消失であり、
第55条自身が掲げる「台帳の第一の徳は記録が失われないこと」に正面から触れる。

---

## 【重大】S-1: `fp` は検証されない自己申告 — 誤った鍵が本物の観測を黙って飲み込む

### 所見

畳みも重複検査も、entry に書かれた `fp` を**そのまま信じる**。再計算して突き合わせる経路が無い。

- `graph/gauge.js:274` — `const fp = e.fp || fingerprint(e);`(`foldLedger`)
- `graph/gauge.js:335-336` — `const fp = e.fp || (e.metrics ? fingerprint(e) : null); if (fp === entry.fp) …`(`record`)
- `graph/gauge.js:409` — `const fp = e.fp || fingerprint(e);`(`auditLedger`)

`e.fp ||` の左側が真なら、右側の再計算は**決して走らない**。
grep で全経路を数えたが、`fp !== fingerprint(e)` の形の検証はコード中に一つも無い:

```
$ grep -n "e.fp ||\|fp !==\|fp ===\|verify" graph/gauge.js
274:    const fp = e.fp || fingerprint(e);           // ★ 鍵を持たない旧行はその場で導出
335:      const fp = e.fp || (e.metrics ? fingerprint(e) : null);
336:      if (fp === entry.fp) { existing = e; break; }
409:    const fp = e.fp || fingerprint(e);
480:      if (e.skipped) console.log(`📒 already recorded: ...(同一指紋 ${e.fp || fingerprint(e)})...`);
```

### 実測(何が起きるか)

`score:10` の観測と `score:99` の**別観測**に、同じ `fp` を載せて畳んだ:

```
$ node -e '... forged={...other, fp:g.fingerprint(base)} ; g.foldLedger([base_with_fp, forged]) ...'
=== 衝突を人工的に起こしたら何が起きるか(fp を手で同一に書いた別観測) ===
投入2行 -> 畳み後 1 行
残った: [{"slug":"coin","score":10,"ts":"2026-01-01T00:00:00.000Z"}]
audit: {"rows":2,"distinct":1,"duplicates":1,"conflicts":0}
=> score 99 の観測は黙って消え、audit は「重複1」としか言わない
```

**`score:99` の観測は消えた。** しかも `--audit` は `conflicts=0` と答える ——
矛盾を名指すはずの門が、**矛盾を「重複」と誤って分類して沈黙する**。
`auditLedger` は同一 `fp` を `bySlug` の Map で一つに潰してから(`gauge.js:412`)
`COMPARE_KEYS` を比べるので、**衝突した二行は比較の土俵に上がらない**。
すなわち第55条(d)「重複を畳んでも矛盾を畳んではならない」は、
`fp` が偽であるかぎり**成立しない**。

### なぜ重大か(そして致命でない理由)

- これは sha256 の暗号的強度の問題では**ない**。設計 §168-176 が論じる 64bit の
  誕生日衝突(10^4 行で約 5×10^-12)は**実用上問題ない** —— そこは受容(§A-1)。
  危ないのは**偶然の衝突ではなく、書かれた鍵をそのまま信じること**である。
- 現実的な発火経路が三つある:
  1. **人の手編集**。台帳は JSONL の平文であり、掟が禁じていない。
     行をコピペして `metrics` だけ直せば、`fp` は古いまま = 偽の鍵ができる。
  2. **git の衝突解決**。マージで行が混ざるのは discovery V-8 が実測済みの現実である。
  3. **将来の `g2:`**。第55条(f)と設計は「材料を変えるなら `g2:` を名乗れ」と定めるが、
     `g1:` を名乗ったまま材料だけ変えた実装が出れば、古い `g1:` 行と新行が
     検証されずに衝突しうる。版の接頭辞は**規律であって強制ではない**。
- **致命に上げない理由**: 攻撃者がリモートから触れる面ではなく、
  台帳へ書ける者(= すでにローカルの倉に書ける者)しか起こせない。
  また `record` は fail-open のため**既存行を消しはしない**(消えるのは「読んだときの見え方」)。
  ファイル上の生の行は残っており、`readLedger({raw:true})` で回収できる。

### 助言(実装は次相に委ねる — 本相は直さない)

`fp` を信じる箇所で再計算と突き合わせ、食い違ったら**再計算値を採るか、名指す**。
`e.fp || fingerprint(e)` を `fingerprint(e)` に寄せるだけでも S-1 は閉じる
(`fp` は人が読む注記として残せばよい)。第55条(f)が言う「鍵は読み時に導出できる」は
**まさにそれが可能であることの宣言**であり、格納値を信じる必要は元から無い。

---

## 【重大】S-2: `canonical()` の無制限再帰 — 一行で秤全体が倒れる(可用性)

### 所見

`canonical()`(`graph/gauge.js:213-232`)は深さの上限を持たない自己再帰である
(`graph/gauge.js:222` の配列、`223-231` の object)。
`readLedger` の try/catch は **`JSON.parse` だけ**を包んでおり(`gauge.js:305`)、
その後段の `foldLedger`(`gauge.js:309`)は**保護の外**に居る。

### 実測

深さ 50000 の入れ子を持つ**たった一行・300KB** の台帳を仮倉に置いた:

```
$ node -e '深さ50000の JSON を文字列として直に組んで書く'
depth= 50000  bytes= 300089

$ PARADISE_CREATIONS=<sandbox> node -e 'g.readLedger()'
--- readLedger (fold) on deeply nested row ---
THREW: RangeError | Maximum call stack size exceeded
```

どこで底が抜けるかを切り分けた:

```
$ node -e 'JSON.parse は耐えるか? fingerprint は? foldLedger は?'
JSON.parse: OK (parse は耐える)
fingerprint(canonical) THREW: RangeError -> 再帰の底が抜けたのは canonical()
foldLedger THREW: RangeError
```

**`JSON.parse` は耐える。倒れるのは新規に足された `canonical()` である。**
つまりこれは既存の欠陥ではなく、**この差分が持ち込んだ新しい破損耐性の穴**である。

### なぜ重大か

- 第55条(e)は「冪等化は fail-open に倒す」「一行の破損で秤全体を倒さない」と命じ、
  FR-6 の門(`AC-6a/6b`)は衝突マーカーに対してそれを実証している。
  しかし**深い入れ子という別種の壊れ方に対しては、その約束が破れている**。
  門が守っているのは「`<<<<<<< HEAD` 型の破損」だけで、破損一般ではない。
- 影響範囲は `gauge.js ledger` / `compare` に留まらない。設計が明記するとおり
  `pulse.js` が `readLedger()` を断面に載せるため、**ダッシュボードごと落ちる**。
- 救いが一つある: `record` は `readLedger` を try で包んでいる(`gauge.js:332-340`)ので、
  **記録の道だけは生き残る**(fail-open が効く)。ゆえに致命ではない。
- 悪意を要しない。`metrics` に深い構造が入る改修が将来入れば、事故として起きうる。

### 助言

`canonical()` に深さ上限を与え、超えたら例外ではなく決定的な標識(例: `'deep'`)を返すか、
`foldLedger` を `readLedger` の try の内側に入れて破損行と同じ扱いに落とす。

---

## 【軽微】S-3: 台帳は改変検知の器ではない — その旨がどこにも書かれていない

**偽の安心を名指す**という指示に従って、第55条・design・requirements・discovery を
`改竄|改変|tamper|保証|安全` で grep した。

```
$ grep -n "衝突|collision|sha256|16 桁|64bit|改竄|改変|tamper|保証|安全" reform/gauge-ledger-idempotent/*.md
design.md:168:  fpOf(entry) = "g1:" + sha256( canon({ slug, scale, metrics }) ).hex.slice(0, 16)
design.md:171-174: アルゴリズム: crypto.createHash('sha256')。… sha1 は衝突が実証済みで、
                   新しく書く鍵にわざわざ選ぶ理由が無い。
design.md:175-176: 桁数: hex 16 桁 = 64 bit。… 誕生日衝突確率は 10^4 行でも約 5×10^-12。十分である。
(以下、衝突マーカー = git の話であり暗号の衝突ではない)
```

### 判定: **偽の安心を与える記述は無かった。ただし必要な否認も無い。**

- 第55条・design・requirements のいずれも、指紋を「安全な保証」「改竄検知」と
  呼んでいない。`sha256` を選んだ理由も「sha1 は衝突が実証済みだから」という
  **正しく限定された**理由であり、真正性の主張ではない。**この点は明確に無罪である。**
- 一方で、`sha256` という語が単独で置かれると、読む者は
  「暗号ハッシュ = 改竄が分かる」と読みうる。実際には(S-1 のとおり)
  **`fp` は誰でも手で書き換えられ、engine は検証しない**。
- 第55条(a)は「鍵は **entry 自身の中に住む**」と定めるが、
  **その鍵が信頼された入力であることへの注意書きが無い**。
  「保証」と書いていないことと「保証でないと書いてあること」は違う。
- 憲法は「証拠ではなく騒音である」という語を使う。**冪等な台帳は「証拠」に近づくが、
  改竄検知の意味での証拠ではない** —— この線引きが明文で引かれていない。

### 助言

第55条に一文を足す。例:「**指紋は同一性の鍵であって、真正性の証明ではない。**
台帳は手で書き換えられる器であり、`fp` は検証されるまで自己申告である。」
これは S-1 の実装修正とセットで意味を持つ。

---

## 【軽微】S-4: `readFileSync` 全読みと `record` の O(N×台帳) — 実測すれば「まだ遠い」

台帳は毎回まるごとメモリに載る(`gauge.js:304`)。20万行 / 53MB を仮倉に置いて実測:

```
$ node -e '20万行の台帳を生成' ; PARADISE_CREATIONS=<sandbox> node --expose-gc -e '...'
rows=200000 bytes=53138170
raw rows=200000  parse+read ms=160
read+fold ms=897  folded=50500
audit ms=917  duplicates=149500 conflicts=500
heapUsed MB=190.6  rss MB=342.6
```

- **20万行・53MB で 0.9 秒 / RSS 343MB。**`foldLedger` も `auditLedger` も
  Map による線形処理で、計算量は O(n)。**アルゴリズム上の爆発は無い。**
- 実台帳は現に **30 行**である。想定は 10^3〜10^4 行。実用上の余裕は 4 桁ある。
- ただし `record` は追記のたびに `readLedger({raw:true})` で全行を舐める
  (`gauge.js:333`)。`baseline` はそれを創造物の数だけ繰り返す
  (`gauge.js:355-369`)ので、合計は **O(創造物数 × 台帳行数)**。
  これは冪等化が新たに持ち込んだコストである(以前の `record` は読まずに append していた)。
  現規模では無視できるが、**台帳が線形に伸びる器である以上、上限を持たない**ことは記しておく。
- **DoS として攻撃可能か**: 台帳に書ける者しか膨らませられないため、外部からの攻撃面ではない。
  ゆえに軽微。

---

## 【受容】確かめて、危険が無かった項目

### A-1【受容】sha256 の 16 桁切り詰め — 衝突確率は実用上問題ない

- `graph/gauge.js:283` / design.md:175-176。64bit 空間、10^4 行で誕生日衝突は約 5×10^-12。
- 実台帳 30 行での distinct は 6(`rows=30 distinct=6 duplicates=24`。§B の門出力で再確認)。
- **確率の議論としては妥当であり、設計はこのリスクを明示的に見積もっている。**
- **ただし「衝突したら何が起きるか」**は §S-1 の実測が答えである ——
  **黙って一方が消え、audit は矛盾と呼ばない。** つまり
  「確率は十分小さいが、起きたときの挙動は無音のデータ欠損」であり、
  設計が扱っているのは前半だけである。versioned prefix `g1:` は
  **材料変更**への備えであって、**衝突**への備えではない。

### A-2【受容】prototype pollution — 実際に撃ったが通らない

指示どおり `__proto__` / `constructor.prototype` を含む行を仮倉の台帳に置いて撫でた:

```
$ PARADISE_CREATIONS=<sandbox> node -e 'g.readLedger({raw:true}); g.readLedger(); g.auditLedger(raw)'
rows: 3 folded: 3
--- POLLUTION CHECKS (after readLedger/fold/audit) ---
audit: {"rows":3,"distinct":3,"duplicates":0,"conflicts":[]}
({}).polluted        = undefined
({}).pollutedMetrics = undefined
({}).pwn             = undefined
row0 proto === Object.prototype: true
row0 own __proto__ key: true
fp row0: g1:a546fd0f46103f10  fp row1: g1:d3d6921b1fb319ce
spread proto === Object.prototype: true
```

- **汚染は起きない。** `JSON.parse` は `__proto__` を **own data property** として作り、
  setter を起動しないため(仕様どおり)。`row0 own __proto__ key: true` かつ
  `proto === Object.prototype: true` がそれを示す。
- `record` の `{ ...existing, skipped: true }`(`gauge.js:344`)も spread であり、
  `spread proto === Object.prototype: true` のとおり汚染を運ばない。
- `canonical()` は `Object.keys()`(own enumerable のみ)を使うため、
  継承プロパティを材料に混ぜない —— **プロトタイプ経由で指紋を動かす道も無い。**
- 台帳の値は `Map` のキーと文字列連結にしか使われず、`eval` にも `require` にも渡らない。

### A-3【受容】パス・slug の扱い — `slug` は住所に使われていない

- 台帳の住所は `path.join(workspace.resolve().root, 'gauge-ledger.jsonl')`
  (`graph/gauge.js:56-58`)。**`LEDGER_NAME` は定数で、外部入力が一切混ざらない。**
- `slug` が住所に使われていないことを機械で確認した:

```
$ grep -n "slug" graph/gauge.js | grep -iE "path|join|resolve|readFile|writeFile|append|exec|spawn"
481:      else console.log(`📒 recorded: ${e.slug} → ...`)     ← 印字のみ
508:          console.log(`  ⚠️ 矛盾: ${c.slug} — ...`)          ← 印字のみ
```
  **`slug` は表示にしか使われない。** ゆえに `record --slug ../../..` を撃っても
  台帳の住所は動かない(実測: 仮倉に `run.json` 以外のファイルは生まれなかった)。

- `workspace.js:60-65` の `creationDir` は slug を厳格に検める。実読して実際に撃った:

```
$ node -e 'for(...) w.creationDir(s)'
"../../etc"    -> REJECTED: slug must be lowercase kebab-case
"a/../b"       -> REJECTED: slug must be lowercase kebab-case
".."           -> REJECTED: slug must be lowercase kebab-case
"normal-slug"  -> C:\Users\kikus\Documents\workspace\paradise-creations\normal-slug
"ABC"          -> REJECTED: slug must be lowercase kebab-case
"x;whoami"     -> REJECTED: slug must be lowercase kebab-case
""             -> REJECTED
null           -> REJECTED
```
  正規表現 `/^[a-z0-9][a-z0-9-]*$/`(`workspace.js:61`)は
  `.` `/` `\` `;` `..` を全て弾く。**パストラバーサルもコマンド注入の文字も通らない。**
- `PARADISE_CREATIONS` は `path.resolve(raw)`(`workspace.js:45`)で絶対化される。
  これは**信頼された設定入力**であり、任意の場所を指せるのは仕様である
  (テストの仮倉振替がまさにこれを使う)。環境変数を書ける者はすでに
  プロセスを支配しているため、権限昇格には当たらない。**この変更が広げた面ではない。**

### A-4【受容】テストの副作用 — 一時ディレクトリを残さず、実台帳を汚さない

- `withGaugeSandbox`(test:+2940 付近)は `try/finally` で
  ① `PARADISE_CREATIONS` を元に戻し(未定義なら `delete`)、
  ② `require.cache` を捨て、③ `fs.rmSync(tmp, {recursive:true, force:true})`。
  **例外時も finally が走る。** 故障注入の3門も同じ `try/finally { rmSync }` 形。
- 実測(全門走行の前後で数えた):

```
=== tmp dirs before ===
0
=== 実台帳 digest before ===
C:\Users\kikus\Documents\workspace\paradise-creations\gauge-ledger.jsonl 387d9e0ea5a4fde3 lines=30

$ node tests/paradise.test.js
Paradise self-test: 368 passed, 0 failed

=== tmp dirs AFTER ===
0
=== 実台帳 digest AFTER ===
387d9e0ea5a4fde3 lines=30
```
  **仮倉の残骸ゼロ。実台帳のダイジェストも行数も不変。** 368/368 緑。
- 門自身も `AC-9c` で実台帳の sha256 を前後比較しており、**この監査の観測と二重に一致する。**
- 残る穴は一つだけ(軽微未満・記録のみ): テスト実行を **Ctrl-C や強制終了で断ち切った場合**、
  `finally` が走らず `%TEMP%/paradise-gauge-*` が残る。OS の一時領域であり実害は無い。

### A-5【受容】子プロセスのコマンド組み立て — 注入の余地は無い

- `graph/gauge.js` は子プロセスを一切起こさない:

```
$ grep -nE "exec|spawn|child_process" graph/gauge.js
48: * 序列の集計は **spawn-trace が唯一の出所**である (第41条 / 第52条)。   ← コメント
51:const trace = require('./spawn-trace.js');                              ← モジュール名
119:   * `spawn-trace` の四値をそのまま読む …                                ← コメント
```
  **実行に至る `exec`/`spawn` は無い。** 一致したのは全て `spawn-trace` という名前である。
- テスト側は子プロセスを起こす(`runGaugeGate` / `execFileSync`)が、
  - **`execFileSync` であり shell を介さない**(`shell:true` は無い)。メタ文字は解釈されない。
  - 引数はプロセス外部から来ない。仮倉の道は `JSON.stringify(sandbox)` で
    **JS リテラルとして正しくエスケープされて**スクリプトに埋まる。
  - `mkdtempSync` が作る道はランダムだが OS 生成であり、攻撃者の制御下に無い。
  - `body` は**テストファイル中のリテラル**であって入力ではない。
- ゆえに注入の余地は無い。

### A-6【受容】秘密の漏洩 — 差分に鍵・トークン・個人情報は無い

```
$ git diff main...HEAD | grep -inE "token|secret|api[_-]?key|password|passwd|credential|BEGIN [A-Z ]*PRIVATE KEY|xox[baprs]-|gh[pousr]_|sk-[A-Za-z0-9]{20}|AKIA[0-9A-Z]{16}"
403:+      "No secrets in code; security is reviewed, never assumed."
1994:+      "No secrets in code; security is reviewed, never assumed."
3107:     security: { issues: 0, secrets: 0 },  spec: { satisfied: true },
```
- 一致した 3 件は**すべて掟の文言そのもの**(conclave.json の審査基準と既存テストの引数)。
  **実際の秘密値はゼロ。**
- 高エントロピー文字列も無い。差分中の hex は指紋の例
  (`g1:` + 16 桁)と ISO8601 の時刻のみ。
- 個人情報: 差分に現れる固有名詞は `kikus`(既存の道の一部)と創造物の slug のみ。新規の露出は無い。
- `.env` / permissions 系のファイルには**一切触れていない**:

```
$ git diff main...HEAD --name-only | grep -iE "\.env|permission|settings"
(触れていない)
```

---

## 見ていない項目(正直に)

- **`pulse.js` / dashboard 側の実コード**を読んでいない。`readLedger()` が畳むことの
  波及は設計の記述と `gauge.js` の export 面からのみ判断した。
  S-2(深い入れ子で `readLedger` が投げる)がダッシュボードに及ぶという評価は、
  **設計の記述に基づく推論であって、pulse を実際に落として確かめてはいない。**
- **並行書き込み(複数プロセスが同時に `record`)**を実際には起こしていない。
  `appendFileSync` の原子性は OS とサイズに依存するが、
  この差分は書き込み方式を変えていない(append のまま)ため、**新規のリスクではない**と判断した。
  第55条(b)が「書き手の規律が競合等で漏れても読み側が拾う」と設計上の答えを持つ。
- **`spawn-trace.js` の中身**は読んでいない。この差分が触っていないため。
- **Windows 以外の OS での挙動**は見ていない。実測はすべて Windows / Node v24.14.0。
- **`sha256` 実装そのもの**(Node 標準 `crypto`)は自明に信頼した。

---

## 走らせた命令の一覧(再現用)

```bash
cd C:/Users/kikus/Documents/workspace/paradise
git diff main...HEAD --stat
git diff main...HEAD -- graph/gauge.js
git diff main...HEAD -- CONSTITUTION.md CONSTITUTION.INDEX.md README.md
git diff main...HEAD -- tests/paradise.test.js
git diff main...HEAD | grep -inE "token|secret|api[_-]?key|password|credential|..."
git diff main...HEAD --name-only | grep -iE "\.env|permission|settings"
grep -n "e.fp ||\|fp !==\|fp ===\|verify" graph/gauge.js
grep -n "slug" graph/gauge.js | grep -iE "path|join|resolve|exec|spawn"
grep -nE "exec|spawn|child_process" graph/gauge.js
node -e '<creationDir に traversal / メタ文字 slug を撃つ>'
PARADISE_CREATIONS=<sandbox> node -e '<__proto__ 入り台帳を readLedger/fold/audit>'
node -e '<深さ50000 の入れ子で JSON.parse / canonical / foldLedger を切り分け>'
PARADISE_CREATIONS=<sandbox> node --expose-gc -e '<20万行 53MB の台帳で時間と RSS を測る>'
node -e '<同一 fp を載せた別観測を foldLedger / auditLedger に通す>'
node tests/paradise.test.js            # 368 passed, 0 failed
```

## 判定

**条件付き合格。** 攻撃面の増加は無く、prototype pollution・パストラバーサル・
コマンド注入・秘密の漏洩・テストの副作用は**実際に撃って、いずれも無かった**。

次相に送るべきは 2 点:

1. **S-1(重大)** — `fp` を信じる 3 箇所(`gauge.js:274, 335, 409`)で再計算と突き合わせる。
   これを閉じないかぎり、第55条(d)「矛盾を畳んではならない」は**紙の上の約束**に留まる。
2. **S-2(重大)** — `canonical()` に深さの底を与えるか、`foldLedger` を
   `readLedger` の破損耐性の傘の内側に入れる。**一行で秤が倒れる状態**は
   第55条(e)の fail-open の精神と矛盾する。

S-3(第55条に「指紋は真正性の証明ではない」の一文)は S-1 と同時に扱うのが筋である。
S-4 は現規模では実害が無く、記録に留めてよい。
