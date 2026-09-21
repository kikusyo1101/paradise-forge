# 畳みの機構の安全審査 — security 相

**相**: security / **枝**: `reform/gate-fold` / **基点**: prove 相の `56bad0b`
**測定機**: Windows 11 + git-bash, node v24.14.0(ローカル)
**審査官の立場**: **実装を一行も直していない。** 撃って、名を与え、塗り方を書いた。

> **この文書の掟**: 生コマンド出力の無い断定を書かない。**撃てなかったものは「撃てなかった」と書く**(第37条)。
> 壊した現物はすべて sha256 の一致で復元を確かめた。**`git checkout -- <file>` は一度も使っていない。**

---

## 0. 結論(先に述べる)

**畳みの機構には、署名の無い台帳という信頼境界が在り、そこは守られていない。**
**一行の偽の領収書で、CI の 5 段のうち 4 段が「走らせずに緑」になる。** 実測で撃ち抜いた。

| 位 | 欠陥 | 撃ったか |
|---|---|---|
| **BLOCK** | **S-1** 台帳は署名されず、**一行足すだけで 4 段が偽の緑になる** | **撃ち抜いた** |
| **BLOCK** | **S-2** `.claude/` は鍵の外 —— **PR が台帳そのものを持ち込める**(`.gitignore` は CI の checkout を縛らない) | **撃ち抜いた** |
| **HIGH** | **S-3** `find()`/`decide()` は**読む側の検めを持たない** —— `validateReceipt` は書く側にしか立っていない | **撃ち抜いた** |
| **HIGH** | **S-4** `.lock` が**ディレクトリ**だと `withLock` が**無限に回る**。`waitMs` も `staleMs` も効かない(実測 25s 超で戻らず) | **撃ち抜いた** |
| **MEDIUM** | **S-5** `.lock` を握り続けるだけで領収書が刻めない(DoS)。**走行は緑のまま次段が全走に落ちる**(致命ではないが名乗りが弱い) | **撃ち抜いた** |
| **MEDIUM** | **S-6** `PARADISE_FOLD_LEDGER` の相対パスは**倉の外へ脱出でき**、`guardWrite` は `caller-named` で**黙って通す** | **撃ち抜いた** |
| **MEDIUM** | **S-7** `fold-key --explain` が `PARADISE_ARCHIFY` の**生の値**を名乗る(第6条の面) | **撃ち抜いた** |
| **LOW** | **S-8** 鍵 64bit の誕生日衝突は **1 コア 6 時間**。だが**攻撃経路としては S-1 より遥かに高価**で実用上の脅威ではない | **数で出した** |
| **LOW** | **S-9** 台帳に大きさの上限が無い(49MB / 20 万行を 153ms で読む。実害は薄い) | **撃ち抜いた** |
| — | **指摘無し** と判じたもの(§7 に**何を見たか**を列挙) | Secret scan 段 / UNC / 神の住処 / symlink |

**一言で言えば**: prove 相は「**鍵が現物を覆うか**」を塞いだ。本相が見たのは**その隣**である ——
**鍵が完璧でも、台帳が嘘をつけば畳みは偽の緑を生む。** findings §2.4 が引いた
GitHub Actions cache の security 警告 ——「**Cache contents are not signed or verified**」——
は、**楽園の台帳にそのまま当てはまる。**

---

## 1. **S-1 [BLOCK] 台帳は信頼境界であり、そこに門が一本も立っていない**

### 1.1 撃った

`PARADISE_FOLD_LEDGER` に**走らせていない走行の領収書を 1 行だけ**置いた。
現物の鍵は `fold-key` が名乗るので、**攻撃者は鍵を計算できる**(秘密ではない)。

```
$ K=$(node graph/fold.js fold-key)          # → ce3c51087f916a57
$ echo '{"at":"2026-09-21T00:00:00.000Z","key":"'$K'","exit":0,
         "summary":"Paradise self-test: 500 passed, 0 failed"}' > forged.jsonl

$ PARADISE_FOLD_LEDGER=forged.jsonl node tests/paradise.test.js
Paradise fold: Executed 0 out of 1 runs (1 reused, key=ce3c51087f916a57)
Paradise fold: 写し元の領収書 at=2026-09-21T00:00:00.000Z exit=0 key=ce3c51087f916a57
self-test exit=0                    ← **0.17 秒。門は一本も走っていない**

$ PARADISE_FOLD_LEDGER=forged.jsonl node graph/census.js check
Census self-test: Executed 0 out of 1 runs (1 reused, key=ce3c51087f916a57)
═══════ 🔢 CENSUS CHECK ═══════
  ✓ every number the paradise claims about itself is true
═══════════════════════════════
census exit=0                       ← **第22条の旗艦が、走っていない走行の数を「真」と宣言した**

$ PARADISE_ABODE=repo PARADISE_FOLD_LEDGER=forged.jsonl node tests/paradise.test.js
Paradise fold: Executed 0 out of 1 runs (1 reused, key=ce3c51087f916a57)
exit=0                              ← Abode(repo 自己診断) 段も同じ一行で畳まれた
```

**畳まれた段は 4 つ**(`tribunal.yml:35` / `:140` / `:185` / `:328` が同じ台帳を指す)。
**`summary` の中身は誰も検めない** —— `census.js:144` が `receipt.summary` を
**そのまま `summaryOf()` へ流す**。ゆえに偽の数も通る:

```
$ (summary を "Paradise self-test: 9999 passed, 0 failed" に差し替えて撃つ)
  🔴 README テスト数: doc says 500, reality is 9999  (README.md)
```

**——これは「捕まえた」のではない。** census は**台帳の言う 9999 を『現実』として採り**、
README の 500 を**嘘だと名指した**。**攻撃者が README に合わせて 500 と書けば黙る**(上の実測がそれである)。
**census が裁いているのは『台帳と README の一致』であって、『走行と README の一致』ではない。**

### 1.2 なぜ門が見なかったか

`tests/fold.test.js` の 26 門と `^fold:` の 8 門を全部読んだ。
**台帳を「敵が書いた面」として扱う門は一本も無い。**

```
$ grep -rn "git ls-files\|署名\|signature\|hmac\|HMAC" tests/fold.test.js graph/fold.js
(0 件)
```

prove 相の M-05 / M-13 は**形**(`exit` の型、`key` の綴り)を塞いだ。
**形が正しい嘘は、一つも塞がれていない。** 第62条そのものである ——
門が「本物の走行が書く形」を fixture にした結果、**形は本物で中身が嘘**の層を見なかった。

### 1.3 findings との照合

findings §2.4 (ii) が引いた原文:

> 「Cache contents are not signed or verified, and any workflow run that can read a cache
> may extract its contents. Extracted caches **may modify files that are subsequently executed**」

楽園の台帳は cache より**弱い**。cache は少なくとも GitHub が鍵の範囲を管理するが、
**台帳は単なる追記ファイルであり、書ける者が「走行の結果」を宣言できる。**
findings §4.1 Tuist #8570 は「鍵が結果を見なかった」欠陥だが、**S-1 は「結果の申告を誰も検めない」欠陥**であり、**より深い**。

### 1.4 **こう塗れ**

**(a) 台帳の一行に MAC を掛ける(最小の手当て)。** `graph/fold.js:351 append()` / `:415 find()`。

```js
// fold.js:333 validateReceipt の隣に置く
const LEDGER_SECRET = process.env.PARADISE_FOLD_SECRET || null;   // ★ 秘密は env から。コードに置かない(第6条)
function seal(r) {
  if (!LEDGER_SECRET) return r;                    // 秘密が無い走行は封をしない
  const h = crypto.createHmac('sha256', LEDGER_SECRET);
  h.update(r.key); h.update('\0'); h.update(String(r.exit)); h.update('\0'); h.update(r.summary);
  return { ...r, seal: h.digest('hex').slice(0, 32) };
}
```
`find()`(`fold.js:418`)の絞りを **`r.key === k && r.exit === 0 && sealOk(r)`** にする。

> ⚠️ **だがこれは根を断たない。** CI の runner 上で走る走行は**秘密を握れる**ので、
> 同じ runner で走る悪意ある step は封を作れる。**MAC が守るのは「runner の外から持ち込まれた台帳」だけである**(= S-2)。

**(b) 一走行の中でしか信じない(根を断つ手当て。requirements §7-6 の明文に戻す)。**
`fold.js:353` の領収書に **`run` 欄**(走行の一意識別)を足し、`find()` が
**「同じ `run` の領収書しか採らない」**ようにする。CI では `${{ github.run_id }}-${{ github.run_attempt }}`。

```js
// fold.js:415 find() を
function find(k, opts = {}) {
  const runId = (opts.env || process.env).PARADISE_FOLD_RUN || null;
  ...
  const hits = rows.filter(r => r.key === k && r.exit === 0 &&
    (runId === null ? false : r.run === runId));   // ★ 走行 id 不明なら畳まない(揟7: 疑わしきは畳まない)
```
`tribunal.yml` の 4 箇所(`:35` / `:140` / `:185` / `:328`)に
`PARADISE_FOLD_RUN: ${{ github.run_id }}-${{ github.run_attempt }}` を足す。
**これなら、外から持ち込まれた台帳は `run` が合わず畳めない。**

**(c) 門を建てよ**(`tests/fold.test.js`):
**`fold: 走らせていない走行の領収書は畳みの根拠にならない`** ——
偽の領収書(形は完全に正しい / `run` だけ違う)を台帳に置き、`decide().fold === false` を撃つ。
**これが無い限り、次の走行がこの穴を塞いだことを誰も証明できない**(第38条)。

---

## 2. **S-2 [BLOCK] PR が台帳そのものを持ち込める —— `.gitignore` は CI の checkout を縛らない**

### 2.1 撃った

台帳の既定の住所は `<倉>/.claude/paradise-fold-ledger.jsonl`(`abode.js:162`)であり、
CI もそこを指す(`tribunal.yml:35` の `${{ github.workspace }}/.claude/…`)。
`.gitignore:51` に載っているが、**`.gitignore` は「既に追跡されている物」を止めない。**

```
$ git add -f .claude/paradise-fold-ledger.jsonl
$ git diff --cached --name-only
.claude/paradise-fold-ledger.jsonl                  ← **版管理下に入った**
```

**そして鍵はこれを見ない:**

```
$ K1=$(node graph/fold.js fold-key)
$ echo attacker-x > .claude/attacker-planted.txt ; K2=$(node graph/fold.js fold-key)
K1=ce3c51087f916a57 K2=ce3c51087f916a57 同じ？ YES     ← **`.claude/` は鍵の外**(prove §4 残債 R-2 が名を与えた通り)
```

**現物の既定パスに偽の領収書を置いて撃った**(復元済み):

```
$ (現物 .claude/paradise-fold-ledger.jsonl を偽の一行で置換)
$ node tests/paradise.test.js
Paradise fold: Executed 0 out of 1 runs (1 reused, key=ce3c51087f916a57)
self-test exit=0
$ (復元) 復元 sha 一致=true
```

**門はこれを捕らえない**(実測。17 門を撃った):

```
$ (台帳を版管理下 + 偽の緑 にして) node tests/paradise.test.js --gate 'fold:|workspace|gitignore|ignored'
Paradise gate-filter: 17 of 500 gates matched — **17 green, 0 red**
$ node graph/workspace.js check   → exit=0 ✓
$ node graph/hermetic.js check    → exit=0 ✓
```

### 2.2 攻撃の筋道(fork PR)

1. fork の PR が `.claude/paradise-fold-ledger.jsonl` を **`git add -f` して commit** する。
2. `tribunal.yml` の Self-test 段(`:34` `run: node tests/paradise.test.js`)が
   `${{ github.workspace }}/.claude/…` を読む。**checkout された攻撃者の台帳である。**
3. 鍵が一致すれば(攻撃者は自分の PR の内容で `fold-key` を計算できる)、
   **Self-test / Census / Abode(repo) / Atlas の 4 段が撃たれずに緑になる。**

> **fork PR に secret は渡らないが、この攻撃に secret は要らない。** 要るのは**ファイル 1 本**である。
> `pull_request` トリガ(`tribunal.yml:9`)は fork からも発火し、`verify` job は
> **攻撃者の tree をそのまま checkout して走る。** GITHUB_TOKEN の権限とは無関係の面である。

### 2.3 **こう塗れ**

**(a) 台帳は `runner.temp` に置く。** `tribunal.yml` の **4 箇所**(`:35` / `:140` / `:185` / `:328`)を

```yaml
PARADISE_FOLD_LEDGER: ${{ runner.temp }}/paradise-fold-ledger.jsonl
```

に変える。**`runner.temp` は checkout の外であり、PR は触れない。**
(`:157` の Fold 段は**既に** `runner.temp` を使っている —— **正しい形が既に一箇所在る。**)

**(b) 版管理下の台帳を engine が拒む。** `fold.js:382 read()` の頭に:

```js
// 台帳が版管理下に在るなら、それは走行の記録ではなく PR が持ち込んだ物である
if (!opts.file && isTracked(file)) {           // git ls-files --error-unmatch
  const err = new Error(`fold: 台帳が版管理下に在る: ${file} — 走行の記録は commit されない`);
  err.bailCode = 'ledger-unreadable';          // **不在と別の語。赤である**(AC-16)
  throw err;
}
```

**(c) 門を建てよ**: **`fold: 台帳は版管理下に居てはならない`**(`tests/fold.test.js`)——
`.claude/paradise-fold-ledger.jsonl` が `git ls-files` に出ないこと、かつ
`tribunal.yml` の被畳み段の `PARADISE_FOLD_LEDGER` が **`github.workspace` を含まないこと**を
行頭から `:` まで正確に読む形(prove W-04 の教訓)で撃つ。

---

## 3. **S-3 [HIGH] 読む側に検めが無い —— `validateReceipt` は書く側にしか立っていない**

`fold.js:333 validateReceipt` は `append()`(`:353`)からしか呼ばれない。
**`read()` / `find()` / `decide()` は、行の形を一切検めずに `JSON.parse` の結果を信じる。**

6 つの形を実際に台帳へ置いて撃った:

```
畳まず bail=not-green     exit が文字列 "0"        ← prove M-05 が塞いだ(生きている)
畳まず bail=not-green     exit が false           ← 同上
畳まず bail=key-miss      key が大文字            ← 鍵比較が通さない
**畳んだ**                summary に任意の文字列   ← 誰も検めない
**畳んだ**                余分な欄 signature       ← 未知の欄を拒まない
**畳んだ**                at が 2999 年            ← 時刻を誰も検めない
```

さらに **`hits[hits.length - 1]`(`fold.js:419`)は「最後の緑」を採る** ——
**本物の赤の後ろに偽の緑を 1 行足せば、赤が上書きされる**:

```
$ (同じ鍵で exit=1(480 passed, 20 failed) の後に exit=0 を足す)
decide → {"fold":true,"bail":null,
          "receipt":{"exit":0,"summary":"Paradise self-test: 500 passed, 0 failed"}}
```

**赤い走行の記録が、追記 1 行で無効化できる。** 台帳が追記専用であることは、
**古い記録を消せないこと**を意味するだけで、**新しい嘘を防がない。**

**こう塗れ**: `fold.js:415 find()` と `:452 read()` に `validateReceipt` を掛ける
(形の壊れた行は `ledger-unreadable` にする。**黙って読み飛ばすな** —— prove M-12 の教訓)。
`fold.js:419` の「最後の緑」は **「同じ鍵の行が exit を食い違わせていたら `ledger-unreadable`」**に変える ——
**同じ入力が二つの答えを出したなら、それは畳める状態ではない**(第37条)。
門: **`fold: 同じ鍵で答えが食い違う台帳は畳みの根拠にならない`**。

---

## 4. **S-4 [HIGH] `.lock` がディレクトリだと `withLock` が無限に回る**

`fold.js:293` は `fs.openSync(lock, 'wx')` で錠を取る。**Windows でディレクトリに当てると `EEXIST` が返る**:

```
$ node -e "fs.mkdirSync(d); try{fs.openSync(d,'wx')}catch(e){console.log(e.code)}"
open code= EEXIST
```

`:309` は `EEXIST` を**待つべき競合**として受ける。`:312` の stale 回収は `fs.rmSync(lock, {force:true})` ——
**`recursive` が無いのでディレクトリは消えない**:

```
$ node -e "fs.rmSync(d,{force:true})"
rmSync(非 recursive) code= ERR_FS_EISDIR
```

`:313` の `catch {}` がそれを飲み、`continue` で先頭へ戻る。
**`:316` の `waitMs` 判定は `continue` に飛び越される** —— `stale` 枝が毎周回必ず成立するからである。

**実測(`waitMs: 2000` を指定した走行を 25 秒で打ち切った)**:

```
$ time timeout 25 node a42.js     # recordRun(..., {waitMs:2000, staleMs:1})
real  0m25.086s                    ← **2000ms の期限を 12 倍超えて戻らなかった**
(出力なし)
```

**これは CPU を焼く無限ループである。** 攻撃者(あるいは事故)が
`paradise-fold-ledger.jsonl.lock` という**ディレクトリ**を一つ置くだけで、
**領収書を刻もうとした走行が永久に終わらない** —— CI の段が job timeout まで回り続ける。

**こう塗れ**: `fold.js:312-315` の stale 枝を

```js
if (st && Date.now() - st.mtimeMs > (opts.staleMs || 30000)) {
  try { fs.rmSync(lock, { force: true, recursive: true }); } catch {}   // ★ recursive
  if (Date.now() - t0 > waitMs) throw new Error(...);                   // ★ 期限は stale 枝の中でも効かせる
  continue;
}
```

**期限の検めを `continue` の前に置くことが本質である** —— **どの枝を通っても `waitMs` で必ず抜けること**。
門: **`fold: 錠は必ず期限で抜ける — どの競合の形でも無限に回らない`** ——
`.lock` を**ディレクトリとして**置き、`waitMs` の 3 倍以内に `recordRun` が戻ることを撃つ。

---

## 5. **S-5 [MEDIUM] 錠を握り続ける DoS —— 走行は緑のまま、次段が静かに全走へ落ちる**

攻撃者が `.lock` を置き、mtime を更新し続ければ stale 回収は効かない。実測:

```
$ (0.5 秒ごとに lock の mtime を更新しながら recordRun を撃つ / waitMs=4000)
経過ms=4020 written=false why=fold: 台帳の錠が 4000ms 解けない: …lockdos.jsonl.lock
台帳の行数=0
```

**既定の `waitMs` は 60000**(`fold.js:289`)—— **CI の段が 60 秒止まる**。
`recordRun` は投げずに `{written:false}` を返し(`:369`)、
`paradise.test.js:11225` が **`Paradise fold: 領収書を刻めなかった — …` を一行名乗って緑で終わる**。

**判定**: これは **BLOCK ではない**。走行自体は正しく走り、次段は `bail=no-receipt` で**全走に落ちる** ——
**偽の緑ではなく、畳みが効かないだけ**である(揟7 の正しい側)。だが:

- **60 秒 × 4 段 = 4 分**が無言で失われ、**原因は「領収書を刻めなかった」の一行にしか残らない。**
- **読みは錠を取らない**ので、`decide()` / `find()` は錠が在っても素通りする(実測: `read 行数=1 find=true`)——
  **読みが止まらないのは正しい設計である**(DoS の面が狭い)。

**こう塗れ**: `fold.js:289` の `waitMs` 既定 60000 を **CI では短くできる口**にする
(`opts.waitMs || Number(env.PARADISE_FOLD_WAIT_MS) || 60000`)。
`paradise.test.js:11226` の名乗りに **`bail` 相当の閉じた語**(`lock-timeout`)を足し、
**「台帳が書けなかった」を機械が数えられるようにせよ**(AC-17 / findings §2.5 の Bail Reason 列と同じ趣旨)。

---

## 6. **S-6 [MEDIUM] `PARADISE_FOLD_LEDGER` の細工 —— 倉の外へ脱出でき、関門は黙って通す**

第58条の輸出の関門(`abode.js:497 guardWrite`)を実際に撃った。

```
$ (PARADISE_FOLD_LEDGER='graph/../../../../Users/kikus/AppData/Local/Temp/sec-fold/escape.jsonl')
append 成功 {"at":"…","key":"0000000000000000","exit":0,"summary":"escaped"}
$ ls C:/Users/kikus/Users/kikus/AppData/Local/Temp/sec-fold/escape.jsonl
-rw-r--r-- 88   ← **倉の外に着弾した**(相対パスが cwd 基準で解かれた)
```

`guardWrite` の裁定を直に問うと:

```
通った scope=caller-named   C:/Users/kikus/Users/kikus/…/escape.jsonl
通った scope=caller-named   C:/Users/kikus/.bashrc          ← **神のシェル初期化ファイルも通る**
通った scope=repo           …/paradise/graph/fold.js
通った scope=caller-named   C:/Windows/Temp/x.jsonl
```

**守られているもの(これは正しく効いている)**:

```
$ (PARADISE_FOLD_LEDGER=~/.claude/pwned-fold.jsonl)
拒まれた: 倉の外への書き込みを拒んだ: C:\Users\kikus\.claude\pwned-fold.jsonl.lock ← graph/fold.js
  この道は楽園の住処である(PARADISE_ABODE=global の住処)が、台帳のどの輸出の範囲にも入らない。
  (畳みの走行台帳の錠を置く) — … (AC-55 / 第58条(b)(f))
```

**UNC**: `\\attacker.example\share\l.jsonl` は `UNKNOWN: unknown error` で倒れた(到達しないので書けない)。
**symlink**: **撃てなかった** —— Windows で `symlinkSync` が `EPERM`(開発者モード無し)。
**Linux runner での symlink 経由の書き込みは未測定である。緑と呼ばない**(第37条)。

**判定**: `guardWrite` は**楽園の住処を正しく守っている**(第58条(f) は生きている)。
だが **(4) の `caller-named` は意図された穴である**(`abode.js:473-481` が明文で
「門が `os.tmpdir()` の複製へ書く道を塞げば密閉が不可能になる」と述べている)。
**`PARADISE_FOLD_LEDGER` は env であり、`caller-named` は「神が CLI で名指した」を想定している。**
**env は CLI 引数より弱い** —— CI の workflow を書き換えられる者、あるいは
`env:` を注入できる composite action は、**楽園の器に任意の道へ追記させられる。**

**こう塗れ**: `fold.js:40 ledgerPath()` を

```js
function ledgerPath(opts = {}) {
  if (opts.file) return opts.file;                 // 門が複製を差す道(第58条(c))。そのまま
  const env = opts.env || process.env;
  const raw = env.PARADISE_FOLD_LEDGER;
  if (!raw) return abode.pathFor('foldLedger', opts.abodeOpts);
  const real = path.resolve(raw);                  // ★ 相対を必ず解く
  if (!/\.jsonl$/.test(real)) throw new Error(`fold: 台帳の名は .jsonl である: ${real}`);  // ★ 拡張子を縛る
  return real;
}
```
**最低限、相対パスを `path.resolve` で解いて名乗ること。** 今は `escape.jsonl` の着弾点すら
`fold-status` の `ledger:` 欄を読むまで分からない。
門: **`fold: 台帳の道は env で倉の外へ黙って出ない`**。

---

## 7. **S-7 [MEDIUM] `fold-key --explain` が env の生の値を名乗る(第6条の面)**

```
$ PARADISE_ARCHIFY='/x/secret-<TOKENのような文字列>.mjs' node graph/fold.js fold-key --explain
{ "name": "PARADISE_ARCHIFY",
  "value": "/x/secret-<TOKENのような文字列>.mjs",   ← **生の値がそのまま出る**
  "via": "env", "valueSha": "4aca3fdeaee01c5a" }
```

> ⚠️ **実測時の値をそのまま写経しない。** 当初この節は `sk-` で始まる本物めいた綴りを
> 例示に使っており、**CI の「🔒 Secret scan」段がこの文書を秘密の混入として赤にした**
> (教主が verdict の材料を集める段で実測)。病を説明する文書が、その病の門に捕まる —
> 第21条(門は名を語る全ての口を見張る)の正しい振る舞いであり、**門が緩いのではなく
> 例示が軽率だった**。**秘密に似た綴りは、それ自体が秘密と同じ扱いを受ける。**


**`valueSha` が既に在る** —— **値を名乗る必要は無い。**
`PARADISE_ABODE` は `abode.resolve().mode`(`repo`/`global` の二値)なので安全だが、
`PARADISE_ARCHIFY` は**道であり、道には秘密が混じりうる**(トークン入りの URL、私的な倉の名、ユーザ名)。

**台帳への漏洩経路は在るか。** 調べた:

- `append()` が書くのは `{at, key, exit, summary}` の 4 欄のみ(`fold.js:353`)。
- `summary` の出所は `paradise.test.js:11207` の
  `` `Paradise self-test: ${pass} passed, ${fail} failed` `` —— **数だけ。env は入らない。**
- **→ 台帳に秘密が残る経路は無い。** これは**指摘無し**とする(根拠: 上の 2 行)。
- ただし `recordRun` の `why`(`fold.js:371`)は**例外メッセージ 200 字を出力に載せる**。
  `guardWrite` の例外は**台帳の実パスを含む**(S-6 の出力がそれ) —— **CI ログに絶対パスが出る。**
  秘密ではないが、**`runner.temp` へ移せば(S-2(a))この面も消える。**

**こう塗れ**: `fold.js:225-226` の `value:` を落とし、`valueSha` だけ残す。
`PARADISE_ABODE` は二値なので `value` を残してよい(**鍵が動いた理由の特定に要る** / AC-06)。

```js
{ name: 'PARADISE_ABODE',  value: mode, via: 'abode.resolve().mode', valueSha: … },
{ name: 'PARADISE_ARCHIFY', via: 'env', valueSha: sha256(archify).slice(0,16) },  // ★ value を出さない
```

> ⚠️ prove 相の **P-08**(`--explain` から env の欄を消す変異)が `fold: 鍵の材料は数え直せる` で鳴る。
> **欄そのものを消すな** —— `value` だけ落とせば AC-06 は満たされたままである(`valueSha` の差分で理由は特定できる)。

---

## 8. **S-8 [LOW] 鍵の予像攻撃 —— 数で答える**

鍵は sha256 の**先頭 16 桁 = 64bit**(`fold.js:230`)。実測した:

```
$ (攻撃者が 277 本の前置を再利用し、1 本だけ振る場合の試行速度)
1 コアの試行/秒 = 1.97e+5
誕生日衝突 2^32 試行 = 21776 秒 = **362.9 分 (1 コア ≒ 6 時間)**
第二原像 2^64 試行 = **2.97e+6 コア年**
```

**実用上の危険度の判定**:

- **第二原像(狙った鍵に一致する別の入力を作る)= 約 300 万コア年。** **実用上不可能。**
  これが攻撃者の欲しいものである —— 「**自分の悪意ある tree が、緑の走行の鍵と一致する**」。
- **誕生日衝突(任意の二つの入力が一致)= 1 コア 6 時間** だが、**攻撃には使えない。**
  攻撃者が得るのは「**自分で作った二つの無意味な tree が同じ鍵を持つ**」であり、
  **既存の緑の領収書とは無関係**である。
- **そして決定的に**: 攻撃者は **S-1 を使えば 0 秒で同じ結果を得る。**
  **鍵を破る動機が無い。**

**判定: LOW。** 64bit は**この用途には足りている** —— 鍵が守っているのは
「入力が変わったことの検出」であり、**敵対的な予像に耐える秘密ではない**からである。
**本当の欠陥は鍵の長さではなく、台帳に署名が無いこと(S-1)である。**

> ただし **prove 相の M-03(鍵を 8 桁 = 32bit に削る変異)が鳴ること**は正しい ——
> 32bit なら誕生日衝突が **0.02 秒**になり、**事故としての衝突**が現実に起きる。
> **16 桁の下限を凍らせた門は、数の根拠を持っている。**

---

## 9. **S-9 [LOW] 台帳に大きさの上限が無い**

```
$ (20 万行 / 49.2MB の台帳を read する)
台帳サイズ MB= 49.2
read 行数= 200000 所要ms= 153
```

`read()`(`fold.js:385`)は `readFileSync(file, 'utf8')` で**全部を記憶に載せる**。
追記専用なので**削られることが無い**。CI では走行ごとに新しい `runner.temp` なので実害は薄いが、
**ローカルの `.claude/` は無限に育つ。** 153ms は許容内であり **LOW**。

**こう塗れ**: `read()` に「**末尾 N 行だけ読む**」口を足すか、
`append()` が 10000 行を超えたら古い行を落とす(**ただし追記の原子性を壊さないこと**)。
**急がなくてよい** —— 名前を与えて残債にすれば足りる。

---

## 10. CI の攻撃面 — `tribunal.yml` の変更は何を開けたか

**変更は 5 箇所**(`:35` / `:140` / `:157` / `:185` / `:328`)。全部読んだ。

| 箇所 | 何をするか | 新しい攻撃面 |
|---|---|---|
| `:35` Self-test | `github.workspace/.claude/…` へ**刻む** | **S-2**(PR が同じ道に台帳を置ける) |
| `:140` Census | 同じ台帳を**読む** | **S-1 / S-2** |
| `:157` Fold 段 | `runner.temp` + `PARADISE_NO_FOLD: '1'` | **無し。正しい形である**(checkout の外・畳まない) |
| `:185` Atlas | 同じ台帳を**読む** | **S-1 / S-2** |
| `:328` Abode(repo) | 同じ台帳を**読む** | **S-1 / S-2** |

**`:157` が既に正解を持っている** —— 他の 4 箇所を同じ形に揃えれば S-2 は閉じる(§2.3(a))。

**permissions**: `verify` job に `permissions:` の宣言が無い(**リポジトリ既定を継承する**)。
`tribunal` job は `contents: read / pull-requests: write` を明示している(`:445-447`)—— **正しい**。
**`verify` にも `permissions: contents: read` を明示せよ**(最小権限 / 第6条 fail-closed)。
畳みの変更が作った穴ではないが、**畳みが `verify` を「走らせずに緑」にできる以上、この job の権限は重い。**

**fork PR / workflow の写し替え**:
- `on: pull_request`(`:9`)は **fork から発火し、`pull_request_target` ではない** —— **secret は渡らない。正しい。**
- fork の PR は `tribunal.yml` 自身を書き換えられるが、**その変更は自分の PR の checkout にしか効かない**
  (GitHub は PR の workflow を base の定義で走らせる)。だが **`run:` の中身は head の tree から読まれる
  ファイル(`tests/paradise.test.js` 等)に依る** —— **これは畳み以前からの面であり、本改修の新規ではない。**
- **本改修が新しく作った面は S-2 ただ一つ** —— **コードではなくデータ(台帳)を持ち込むだけで CI を黙らせられる。**
  **これは質的に新しい。** 従来はコードを書き換える必要があり、そのコードは鍵に入っていた。

**Secret scan 段(`:111-118`)は生きている。** 現在の綴りをそのまま実走した:

```
$ grep -rIn -E "sk-[a-zA-Z0-9]{20,}|gh[pou]_[a-zA-Z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----" \
       --exclude-dir=.git --exclude-dir=node_modules .
no secrets detected → 段は生きており緑
```

**畳みは Secret scan を一切触っていない**(この段に `PARADISE_FOLD_LEDGER` は無く、`run:` も変わっていない)。
**射程も確かめた**: `grep -rI` は `.jsonl` を走査対象にする ——
**台帳が `github.workspace` に在る限り、台帳に混ざった秘密は Secret scan に捕まる**(これは S-2 の唯一の良い面である。
`runner.temp` へ移せばこの網から外れるが、**そもそも台帳に秘密は入らない**(§7 で確認済み))。

---

## 11. **指摘無し** と判じたもの — **何を見てそう言ったか**

第37条に従い、**「見なかったから無い」と言わない。** 見たものを列挙する。

| 面 | 何を見たか | なぜ指摘無しか |
|---|---|---|
| **台帳への秘密の残留**(第6条) | `append()` が書く 4 欄(`fold.js:353`)/ `summary` の唯一の出所(`paradise.test.js:11207` = 数のみ)/ `census.js:144` の読み口 | **env も道も台帳に入らない。**書かれるのは数と鍵とタイムスタンプだけ |
| **Secret scan 段** | `tribunal.yml:111-118` を実走 / 台帳の拡張子が grep の射程内であることを実測 | **壊れていない。**畳みは触っていない |
| **神の住処 `~/.claude` への書き込み** | `guardWrite` を実際に撃ち、拒否の文面まで読んだ | **第58条(f) の関門は効いている** |
| **UNC パス** | `\\attacker.example\share\…` を実際に渡した → `UNKNOWN: unknown error` | 到達しないので書けない(ただし**到達する UNC は未測定**) |
| **`P-2`(プロセス内の写像)** | `inspected()`(`fold.js:513-550`)は台帳に触れず、`map` はプロセスと共に死ぬ | **外部入力の面が無い** |
| **`pooledBrowserFactory`** | `fold.js:575-602`。借り物の `close()` を覆うが `dispose()` が `finally` から本物を呼ぶ | 信頼境界を跨がない(**第20条に触れず**) |
| **読みの DoS** | 錠が在る状態で `read()` / `find()` を撃った → 素通り(`read 行数=1 find=true`) | **読みは錠を取らない。**これは正しい |
| **`bail` 語彙からの漏洩** | `BAIL_CODES`(`fold.js:58-66`)は 7 語の凍結表。`bail()` が語彙外を投げる | **任意文字列が出力に載る経路が無い** |

**撃てなかったもの**(第37条):

- **Linux runner 上での symlink 台帳** —— Windows で `symlinkSync` が `EPERM`。**未測定。**
- **CI 上での実走** —— 本相もすべてローカル(prove 残債 R-3 と同じ)。
  **S-2 の攻撃は筋道を読んで組み立てたものであり、実際の GitHub Actions 上では撃っていない。**
  ただし**その前提(台帳が `github.workspace` に在る / `.gitignore` は `-f` で越えられる / 鍵は `.claude/` を見ない)は
  すべてローカルで実測した。**
- **`atlas.js check --all-scales` の実走**(prove 残債 R-4 と同じ。数分かかる)。

---

## 12. 塗る順序(審査官の推し)

1. **S-2(a)** —— `tribunal.yml` の 4 行を `runner.temp` に変える。**一行ずつ。最小で最大の効き。**
2. **S-1(b)** —— `run` 欄で一走行に閉じる。requirements §7-6 の明文に**実体を与える**。
3. **S-4** —— `recursive: true` と `waitMs` の枝越え。**2 行で無限ループが消える。**
4. **S-3** —— 読む側の `validateReceipt` と「食い違う台帳は畳まない」。
5. **S-7** —— `--explain` の `value` を落とす(`PARADISE_ARCHIFY` のみ)。
6. **S-6 / S-5 / S-9** —— 名前を与えて次の走行へ。

**そして塗ったら門を建てよ。** 本相が撃った攻撃は**すべて再走できる形で書いてある** ——
**門にならない指摘は、次の走行で黙って再発する**(第48条 c / 第38条)。

---

## 13. 復元の証

本相は現物を **3 回**壊し、**3 回とも sha256 の一致で復元を確かめた**。

```
S-2 の撃ち:   退避 sha=6b69f2ea… → 復元 sha=6b69f2ea… 一致=true
A3b の撃ち:   (退避簿の綴りの事故 → 直接検め直し) sha=6b69f2ea… 一致=true
A17 の撃ち:   台帳 sha=6b69f2ea… 一致=true / git reset で index も戻した

$ git status --porcelain
 M reform/gate-fold/conclave.json      ← 走行帳のみ
```

**`git checkout -- <file>` は使っていない。** `CLAUDE.md` / `overlay/vendor/` には触れていない。
**実装は一行も直していない** —— 審査官だからである。

**審査の前後で門は緑である**(本相は実装を直していないので当然だが、確かめた):

```
$ node tests/paradise.test.js --gate '^fold:'   → 8 of 500 gates matched — 8 green, 0 red
$ node tests/fold.test.js                        → Fold self-test: 26 passed, 0 failed
```

> ⚠️ **一度だけ `25 passed, 1 failed` を見た。** 直後の 2 回は `26 passed, 0 failed` に戻った。
> 原因は**本相ではない** —— 同時刻に別の相(review)が `tests/fold.test.js` を編集中であり、
> `git status` が ` M tests/fold.test.js` を示した(**本相はこの現物に触れていない**)。
> **並行する相の途中状態を読んだ偽の赤である。** 名を与えて記す(第37条: 測定の失敗も記録する)。

> ⚠️ **本相で踏んだもう一つの罠**: 退避簿を `sha256sum > file` で作り、後に `cut -d' '` で読んだところ
> **MSYS の `*` 印と `\` 接頭辞で比較がずれ、「一致=FALSE」の偽の赤が出た。**
> 台帳の中身を直接読んで一致を確かめ直した(**偽の赤も測定の失敗である** / 第62条 b)。
