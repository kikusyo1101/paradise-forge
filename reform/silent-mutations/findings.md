# reform `silent-mutations` — discover 相 findings

> 走行: `reform/silent-mutations` / 相: discover
> 機: Windows 11 / git-bash (MSYS) / Node `v24.14.0` `win32`
> 実験の仮倉: `C:/Users/kikus/AppData/Local/Temp/sm-lab/...`(`PARADISE_CREATIONS` で振替)
> **実台帳(`paradise-creations/gauge-ledger.jsonl`)には一行も書いていない** — §7 に検証を載せる。
>
> **この文書は実験の進行に合わせて追記している。** 書いてあることは全て実測であり、
> 走らせていない実験は「撃っていない」と §5 に名指す。

---

## 0. 開始時の状態(基線)

```
$ cd C:/Users/kikus/Documents/workspace/paradise && git branch --show-current
reform/silent-mutations

$ git status --short
?? reform/silent-mutations/

$ sha256sum graph/gauge.js tests/paradise.test.js
d1da309f101cad4edc47d05db2f78faecadfca9fdf3405027344a5fea39fa97a *graph/gauge.js
c5a1726d2e50d5c4dfb63c421b41d9994ea0e279f98c8d1b2b4703a3fcb95648 *tests/paradise.test.js

$ git -C C:/Users/kikus/Documents/workspace/paradise-creations status --short
 M gauge-ledger.jsonl        ← ★ 本相の**開始前から** M(私ではない)

$ sha256sum C:/Users/kikus/Documents/workspace/paradise-creations/gauge-ledger.jsonl
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77 *gauge-ledger.jsonl
$ wc -l   → 7 行
```

実台帳の `M` は本相の開始時点で既に立っていた。終了時に**同じ sha256 のまま**であることを §7 で示す。
**ただし途中で一度汚した** —— 隠さずに §5-3 に書く。

---

## 1. 実測の要約

### 1-1. 何を何回撃って、何が壊れたか

| 実験 | 撃った回数 | 壊れた回数 | 一言 |
|---|---|---|---|
| **A: 同一 run を 2 プロセス同時 `record`** | 50 試行 | **50 (100%)** | 常に 2 行。`skipped` 報告は **0 回**(期待 50) |
| **A: 4 プロセス同時** | 20 試行 | **20 (100%)** | 常に 4 行。重複 3 |
| **A: 8 プロセス同時** | 20 試行 | **20 (100%)** | 常に 8 行。重複 7 |
| **A: 逐次 CLI 二回(制御群)** | 1 | **0** | 1 行。冪等は設計どおり働く |
| **A: 競合窓の幅**(d ms ずらす) | 9 水準 × 10 | d≤5ms で 10/10、d=10ms で 9/10、**d≥20ms で 0/10** | 窓は **10〜20ms** |
| **A: `baseline` 2 プロセス同時** | 20 試行 | **20 (100%)** | 創造物 3 に対し常に 6 行 |
| **A: `baseline` 4 プロセス同時** | 20 試行 | **20 (100%)** | 常に 12 行 |
| **A: 同一プロセスで `baseline` 二回** | 1 | **0** | 3 行。二回目は全部 `skipped` |
| **A: `appendFileSync` 原子性** 1.1KB/8.1KB/100KB/1.2MB × 8 proc × 25 | 800 行 | **切れ 0 / 混線 0** | 総 bytes も完全一致 |
| **A: 同 16MB / 64MB × 4 proc × 3** | 24 行 | **切れ 0 / 混線 0** | 総 bytes 完全一致 |
| **A: 切れた行を `--audit` に読ませる** | 1 | — | `corrupt=1` と正しく数え **exit 2**。黙って消えない |
| **B: 変異を撃って門を走らせる** | **60 変異** | **鳴った 46 / 無音 14** | **無音率 23.3%** |
| **B: 無音 14 件の triage** | 14 | — | **【致命】4 /【重大】5 /【軽微】3 /【好み】1 / 私の欠陥 1** |
| **基線(無変異の全走)** | 1 | 0 | `471 passed, 0 failed` (exit 0) |

### 1-2. 三行で言うと

1. **TOCTOU は 100% 破れる。** だが破れ方は「重複行が生まれる」一種類だけで、
   `foldLedger` の治癒が読み手を守っており、**記録が失われる方向には倒れなかった**(§A-3)。
2. **`appendFileSync` は本機の NTFS で 64MB の一行まで切れなかった。** libuv が `O_APPEND` を
   `FILE_APPEND_DATA` に写すことをソースで確かめた。ただし **`writeFileUtf8` の loop が
   部分書きを返せば原理的に切れる道は在る**(§A-5)。
3. **無音率 23.3%。「門の書き方」の層が 40% で最悪**であり、review-3 §8.3 の名指しは正しかった。
   そして**私自身がその層の穴に落ちて実台帳を汚した**(§5-3)。

---


## 2. 主題A — TOCTOU の実験記録

### A-0. 何を測ったか

`record(runFile, slug, index)` (`graph/gauge.js:608-650`) は三段である:

1. `readLedger({raw:true})` → `keyIndex(...)` で索引を組む (`:627`)
2. `idx.get(entry.fp)` で既存行を検める (`:628`)
3. `fs.appendFileSync(ledgerPath(), JSON.stringify(entry)+'\n')` で追記する (`:640` / `:645`)

**(2) と (3) の間にロックは無い。** 実験器は `C:/Users/kikus/AppData/Local/Temp/sm-lab/toctou.js`。
各試行ごとに `mkdtempSync` で仮倉を作り `PARADISE_CREATIONS` を振り替える。
子プロセスは `require` を済ませてから `while (Date.now() < T0) {}` の spin barrier で
**同一 epoch ms に解き放たれる**(`setTimeout` では粒度が粗すぎて競合窓に入らない)。

### A-1. 制御群 — 逐次なら冪等は守られている

```
$ node window.js
[制御群 逐次 CLI 二回]
  1回目: 📒 recorded: race → 100/100 (C:\Users\kikus\AppData\Local\Temp\sm-lab\seq-n2luY9\gauge-ledger.jsonl)
  2回目: 📒 already recorded: race → 100/100 @ 2026-09-16T23:09:50.078Z (同一指紋 g1:08bf6d16608f7c4d) — 追記しない
  台帳行数 = 1 (冪等なら 1)
```

**逐次では一行。冪等は設計どおり働く。** 以下の破れは全て競合によるものであって、
記録そのものの誤りではない。

### A-2. 同一 run を N プロセス同時に `record` — **100% 破れる**

```
$ node toctou.js 50 2
procs=2 trials=50
  冪等が破れた試行 (台帳 > 1 行): 50/50
  行数の分布: {"2":50}
  skipped 報告の総数: 0 / 期待(冪等なら) 50
  JSON として読めない行を含む試行: 0
  --audit exit 分布: {"1":50}
  audit 一行目のサンプル: 📒 rows=2 distinct=1 duplicates=1 conflicts=0 too-deep=0 corrupt=0 suspect=0

$ node toctou.js 20 4
procs=4 trials=20
  冪等が破れた試行 (台帳 > 1 行): 20/20
  行数の分布: {"4":20}
  skipped 報告の総数: 0 / 期待(冪等なら) 60
  --audit exit 分布: {"1":20}
  audit 一行目のサンプル: 📒 rows=4 distinct=1 duplicates=3 conflicts=0 too-deep=0 corrupt=0 suspect=0

$ node toctou.js 20 8
procs=8 trials=20
  冪等が破れた試行 (台帳 > 1 行): 20/20
  行数の分布: {"8":20}
  skipped 報告の総数: 0 / 期待(冪等なら) 140
  --audit exit 分布: {"1":20}
  audit 一行目のサンプル: 📒 rows=8 distinct=1 duplicates=7 conflicts=0 too-deep=0 corrupt=0 suspect=0
```

| 並列度 | 試行 | 冪等が破れた | 台帳の行数 | `skipped` 報告 |
|---|---|---|---|---|
| 2 | 50 | **50/50 (100%)** | 常に 2 | **0 回**(期待 50) |
| 4 | 20 | **20/20 (100%)** | 常に 4 | **0 回**(期待 60) |
| 8 | 20 | **20/20 (100%)** | 常に 8 | **0 回**(期待 140) |

**競合率は並列度に依らず 100% であり、行数は N プロセスに対して常に丁度 N である。**
つまり「時々破れる」のではない —— **spin barrier で揃えた同時走行では一件も skip しない。**
`P=8` では重複が 7 行生まれ、一つも欠けない。

破れた試行の台帳の生の中身(二行が `ts` の ms まで同一である):

```
{"ts":"2026-09-16T23:07:26.957Z","slug":"race","scale":"standard","metrics":{"score":100,"complete":true,...
{"ts":"2026-09-16T23:07:26.957Z","slug":"race","scale":"standard","metrics":{"score":100,"complete":true,...
```

**`skipped` の誤報は起きない。** 破れ方は純粋に「重複行が生まれる」一種類である ——
誰も「既記録」と名乗らず、全員が書く。

### A-3. `foldLedger` による治癒は拾う

```
  --audit exit 1: 📒 rows=2 distinct=1 duplicates=1 conflicts=0 too-deep=0 corrupt=0 suspect=0
readLedger() (畳んだ版) の行数 = 1
readLedger({raw:true}) の行数 = 2
```

**治癒は拾う。** `readLedger()`(既定 = 畳む)は 1 行を返し、`compare` / `pulse` /
dashboard は正しい答えを見る。ゆえに **TOCTOU の実害は「台帳ファイルが膨らむ」ことと
`--audit` が exit 1 を返し続けることに限られる**(重複は `duplicates` に数えられ、
`conflicts=0` = 人の手を要する事故ではないと正しく分類される)。
design.md が言う「予防が漏れても治癒が拾う」は **この形の競合に関しては実測で成立している。**

ただし治癒が効くのは **行が丸ごと無事な場合だけ**である。行が切れた場合は §A-5 を見よ。

### A-4. 競合窓の幅 — **約 10〜20ms**

二つ目の `record` を `d` ms 遅らせ、各 `d` を 10 回:

```
[競合窓の幅 — 二つ目を d ms 遅らせる。各 d を 10 回]
  d=   0ms → 冪等が破れた: 10/10
  d=   1ms → 冪等が破れた: 10/10
  d=   2ms → 冪等が破れた: 10/10
  d=   5ms → 冪等が破れた: 10/10
  d=  10ms → 冪等が破れた: 9/10
  d=  20ms → 冪等が破れた: 0/10
  d=  50ms → 冪等が破れた: 0/10
  d= 100ms → 冪等が破れた: 0/10
  d= 200ms → 冪等が破れた: 0/10
```

**窓は 10ms 台で閉じる。** 20ms ずらせば一度も破れない。
台帳 7 行の小さな仮倉での値であり、**実台帳が 10^4 行に育てば `keyIndex` の再導出に
かかる時間だけ窓は広がる**(review-2 の実測 = N=20000 で fold 68ms)。窓の幅は
台帳の大きさの関数である —— 本相ではその依存を測っていない(§5 に名指す)。

### A-5. `appendFileSync` の原子性 —— Windows では **切れなかった**

実験器 `atomicity.js` / `big.js`。各行に固有の文字 (`A`〜`H`) を敷き詰め、
**混線すれば一行の中に二種以上の文字が現れる**形で検出する。8 プロセス × 25 回。

```
[< 4KB] 1行=1100B / 8 proc × 25 回 = 200 行を期待
   実際の行数=200  JSON不正=0  混線行(pad に 2 種以上の文字)=0  総 bytes=220000
   --audit exit 1: 📒 rows=200 distinct=8 duplicates=192 conflicts=0 too-deep=0 corrupt=0 suspect=0
[> 4KB] 1行=8100B / 8 proc × 25 回 = 200 行を期待
   実際の行数=200  JSON不正=0  混線行=0  総 bytes=1620000
   --audit exit 1: 📒 rows=200 distinct=8 duplicates=192 conflicts=0 too-deep=0 corrupt=0 suspect=0
[> 64KB] 1行=100100B / 8 proc × 25 回 = 200 行を期待
   実際の行数=200  JSON不正=0  混線行=0  総 bytes=20020000
   --audit exit 1: 📒 rows=200 distinct=8 duplicates=192 conflicts=0 too-deep=0 corrupt=0 suspect=0
[> 1MB] 1行=1200100B / 8 proc × 25 回 = 200 行を期待
   実際の行数=200  JSON不正=0  混線行=0  総 bytes=240020000
   --audit exit 1: 📒 rows=200 distinct=8 duplicates=192 conflicts=0 too-deep=0 corrupt=0 suspect=0
```

さらに極端な行で押した(4 プロセス × 3 回):

```
$ node --max-old-space-size=4096 big.js
1行=16777238B (16.0MB) 4proc×3 = 12行期待 → 実際 12行 / 形が壊れた行 0 / 混線 0 / 総bytes 201326856 (期待 201326856)
1行=67108886B (64.0MB) 4proc×3 = 12行期待 → 実際 12行 / 形が壊れた行 0 / 混線 0 / 総bytes 805306632 (期待 805306632)
```

| 1 行の大きさ | 同時プロセス | 期待行数 | 実測行数 | 混線 | JSON 不正 |
|---|---|---|---|---|---|
| 1,100 B (< 4KB) | 8 | 200 | 200 | 0 | 0 |
| 8,100 B (> 4KB) | 8 | 200 | 200 | 0 | 0 |
| 100,100 B (> 64KB) | 8 | 200 | 200 | 0 | 0 |
| 1,200,100 B (> 1MB) | 8 | 200 | 200 | 0 | 0 |
| 16,777,238 B (16MB) | 4 | 12 | 12 | 0 | 0 |
| 67,108,886 B (64MB) | 4 | 12 | 12 | 0 | 0 |

**この機・この Node・この NTFS では、`appendFileSync` は 64MB の一行でも途中で切れなかった。**
総 bytes も一致する = 一 byte も落ちていない。
「4KB を超えると切れる」という POSIX の通説は、**ここでは再現しなかった。**

#### なぜ切れないのか —— ソースで確かめた

1. **Node の `appendFileSync` は既定 flag `'a'`** — `node -p "require('fs').appendFileSync.toString()"` を実機で撃った:

```js
function appendFileSync(path, data, options) {
  options = getOptions(options, { encoding: 'utf8', mode: 0o666, flag: 'a' });
  ...
  if (!options.flag || isFd(path)) options.flag = 'a';
  fs.writeFileSync(path, data, options);
}
```

2. **`'a'` = `O_APPEND|O_CREAT|O_WRONLY`** — 実機の定数で確かめた:

```
$ node -e "const c=require('fs').constants; console.log(c.O_APPEND|c.O_CREAT|c.O_WRONLY)"
265     (O_APPEND=8, O_CREAT=256, O_WRONLY=1)
```

3. **libuv が Windows で `O_APPEND` を `FILE_APPEND_DATA` に写す** —
   `libuv/src/win/fs.c`(`v1.x` を実際に取得して該当行を引用。本相で取った写しは
   `C:/Users/kikus/AppData/Local/Temp/sm-lab/libuv-win-fs.c`、3825 行、該当は :494):

```c
  if (flags & UV_FS_O_APPEND) {
    access &= ~FILE_WRITE_DATA;
    access |= FILE_APPEND_DATA;
  }
```

   Microsoft の `NtCreateFile` の定めは
   「If the caller sets only the `FILE_APPEND_DATA` and `SYNCHRONIZE` flags,
   it can write only to the end of the file, and any offset information about
   write operations to the file is ignored.」
   (libuv issue #2482 内での引用。一次資料は
   `docs.microsoft.com/.../ntifs/nf-ntifs-ntcreatefile`)
   —— **offset の決定はカーネル側で行われる**。これが混線しない理由の説明として一貫する。

4. **ただし `writeFileSync` は分割書きの loop を持つ** —
   `node -p "require('fs').writeFileSync.toString()"`(実機)より:

```js
  // C++ fast path for string data and UTF8 encoding
  if (typeof data === 'string' && (options.encoding === 'utf8' || options.encoding === 'utf-8')) {
    return binding.writeFileUtf8(path, data, stringToFlags(flag), parseFileMode(...));
  }
  ...
  while (length > 0) { const written = fs.writeSync(fd, data, offset, length); offset += written; length -= length; }
```

   `record` が渡すのは **文字列 + utf8** なので C++ の fast path (`writeFileUtf8`) を通る。
   その C++ 側(`nodejs/node` `src/node_file.cc:3281`、本相で取得した写しは同ラボ `node_file.cc`)も
   **同じく loop である**:

```c
  const size_t length = value.length();
  uv_buf_t uvbuf = uv_buf_init(value.out(), length);
  while (offset < length) {
    bytesWritten = SyncCallAndThrowOnError(env, &req_write, uv_fs_write, file, &uvbuf, 1, -1);
    if (bytesWritten < 0) break;
    offset += bytesWritten;
    ...
  }
```

   **`uv_fs_write` が部分書きを返せば、この loop は二度目の `uv_fs_write` を撃つ。**
   その隙に別プロセスが追記すれば混線しうる —— **原理的には切れる道が在る。**
   私の実測(64MB まで 0/上記全件)はその道が**今日この機では踏まれなかった**ことを示すだけで、
   「切れない」を保証しない。**書けるのはここまでである。**

### A-6. 切れた行が在る場合 —— `--audit` は **exit 2**

原理上の道を実測できないので、**人工的に半分で切った行**を台帳に置いて下流の扱いを測った
(`baseline-race.js` の A3b):

```
=== A3b: 切れた行(truncate)を --audit / readLedger がどう扱うか ===
--audit exit 2
📒 rows=2 distinct=2 duplicates=0 conflicts=1 too-deep=0 corrupt=1 suspect=0
  ⚠️ 破損行: JSON として読めない — {"ts":"2026-09-01T00:00:00.000Z","slug":"a"…(畳みでも掃除でも消してはならない)
  🔴 人が読むべき行が 1 件ある — 掃除では消えない
⚠️ ledger line skipped (corrupt): {"ts":"2026-09-01T00:00:00.000Z","slug":"a"…
readLedger() = 2 行
readLedger({raw:true}) = 2 行
readLedger({raw:true,withCorrupt:true}) = 3 行
```

**切れた行は `corrupt=1` として正しく数えられ、黙って消えない。exit code は 2。**
security-report-3 §6-1 が懸念した「行が途中で切れる場合は治癒の対象外」は正しいが、
**F-2 の修理(`withCorrupt`)によって `--audit` からは見える**。
黙って消えるのは `readLedger()` / `readLedger({raw:true})` 側であり、
**掃除(FR-8)が生の列を書き戻せば切れた行は永久に消える** —— この経路は本相では撃っていない(§5)。

### A-7. `baseline()` の二重走行 — **同じく 100% 破れる**

創造物 3 つ(`alpha` / `beta` / `gamma`、それぞれ `conclave.json`)を置いた仮倉で:

```
=== A4-1: baseline を 2 プロセス同時 (創造物 3 / 期待 3 行) ===
{"broke":20,"trials":20,"dist":{"6":20},...}
=== A4-2: baseline を 4 プロセス同時 ===
{"broke":20,"trials":20,"dist":{"12":20},...}
```

| 経路 | 試行 | 破れ | 行数 |
|---|---|---|---|
| `baseline` × 2 プロセス | 20 | **20/20** | 常に 6(期待 3) |
| `baseline` × 4 プロセス | 20 | **20/20** | 常に 12(期待 3) |

**行数は `創造物数 × プロセス数` に丁度なる。** 一つも skip しない。

対して **同一プロセス内で `baseline()` を二回**(索引 `idx` は各呼び出しで組み直されるが、
一回目が書いた行は二回目の `readLedger` に見える):

```
=== A4-3: 同一プロセスで baseline を二回(index 共有しない経路) ===
1回目 written= 3 skipped= 0
2回目 written= 0 skipped= 3
台帳行数= 3
```

**同一プロセスの経路は冪等が守られる。** 違いは `index` (Map) の共有ではなく、
**「二回目が始まる前に一回目の追記がファイルに落ちているか」**である。
`baseline` が渡す `idx` は同一呼び出しの内側でしか生きず、
プロセスを跨いだ共有は存在しない —— ゆえに**プロセス間では `index` の有無に関わらず同じく破れる。**
`record` を index 無しで撃つ §A-2 と、index 共有で撃つ §A-7 が**どちらも 100%** なのがその証拠である。

### A-8. 修理の選択肢と代償(測れたものだけ数で、測っていないものは名指す)

| 案 | 効き | 代償 | 本相で測ったか |
|---|---|---|---|
| **何もしない(現状)** | 重複行が並列度ぶん生まれる。`readLedger()` の畳みが読み側を守る | 台帳ファイルが単調に膨らむ / `--audit` が exit 1 を返し続ける(CI に繋げば恒常赤) | **測った**(§A-2/A-3) |
| **ロックファイル**(`fs.openSync(lock,'wx')` + retry) | (2)-(3) を相互排他にできる | 異常終了で lock が残ると以後全ての `record` が詰まる。`fail-open` の第一の徳「記録が失われない」と衝突する。**待ち時間は未測** | **未実測** |
| **`O_APPEND` の保証に寄る**(現状そのもの) | 行が切れない限り重複は畳みで消える。64MB まで切れないことは実測した(§A-5) | **保証ではない** —— `writeFileUtf8` の loop が部分書きを返せば原理的に切れる(§A-5-4) | 部分的に測った |
| **一時ファイル + `rename`** | 行の原子性は上がる | **追記型 JSONL と噛み合わない**。台帳全体を書き戻す道になり、第55条(e)の「削除・truncate・`writeFileSync` の経路を足さない」に真っ向から反する | **未実測** |
| **`flock` 相当** | — | **Node 標準に `flock` は無い**(`fs` に該当 API 無し。`proper-lockfile` 等は外部依存 = 楽園は外部依存ゼロ) | API 不在を確認しただけ |
| **畳みを CI の門にする**(`--audit` の exit 1 を「掃除せよ」の合図として受け、定期掃除を回す) | 重複の蓄積を抑えられる。実装変更ゼロ | 掃除が生の列を書き戻すので、切れた行が在ればそこで消える(§A-6) | **未実測** |

**私の見立て**: 実害は「台帳が膨らむ」と「`--audit` が鳴り続ける」の二つに限られ、
**観測が失われる方向には倒れていない**(§A-3 の実測)。ゆえに**ロックを入れるのは代償が効きに見合わない**。
ただし `--audit` を CI に繋ぐ場合、**同時 `record` が起きる運用では恒常赤になる** ——
「重複 = exit 1」の設計判断が、競合を前提にした運用と噛み合わない。ここが specify に渡すべき点である(§6)。

---

## 3. 主題B — 変異表(60 変異 / 鳴った 46 / 無音 14 = **無音率 23.3%**)

### 3-0. 走らせ方(再現手順)

```
基線: $ node tests/paradise.test.js
      Paradise self-test: 471 passed, 0 failed   (FULLEXIT=0, 約 6 分)

各変異は:
  1. 実物の graph/gauge.js または graph/spawn-trace.js を書き換える
  2. $ git status --porcelain     → " M graph/gauge.js\n?? reform/silent-mutations/"
  3. $ node tests/paradise.test.js --gate gauge --gate pulse --gate ledger --gate 台帳 \
       --gate 秤 --gate census --gate spawn --gate dashboard --gate workspace --gate 倉 \
       --gate 門ヘルパー --gate 序列 --gate tier          (168 門 / 12 秒 / 無変異で 168 green 0 red)
  4. $ node tests/gauge-audit.test.js                       (独立の門)
  5. $ git checkout -- <file>
  6. $ git status --porcelain     → "?? reform/silent-mutations/"
```

走行器は `C:/Users/kikus/AppData/Local/Temp/sm-lab/mutate.js`(49 変異)と `mutate2.js`(11 変異)。
**全 60 変異で 手順 6 の porcelain が `?? reform/silent-mutations/` に戻ったことを機械が確かめている**
(`mutations.jsonl` の `porcelainAfter` を全件検査 → 想定外 0 件)。

> **v1 の失敗を正直に書く。** 最初の走行器は `String.replace` に `\n` を含む複数行パターンを渡しており、
> `graph/gauge.js` が **CRLF** であるために 4 件が空振りした(`file graph/gauge.js` →
> `with CRLF line terminators`)。空振りを「無音」と数えれば無音率が水増しされる。
> v2 で `\n` を `\r?\n` に写す `sub()` を入れ、**投入前に全 60 件が当たることを検査してから**走らせた。

### 3-1. 変異表

凡例: 🔔 = 鳴った / ❌ = 無音。`red` は 168 門絞り込み走行の赤の数、`audit` は `gauge-audit.test.js` の exit。

| # | 層 | 変異 | 結果 | gate exit | red | audit | 鳴った門(抜粋) |
|---|---|---|---|---|---|---|---|
| C1 | 並行性 | `record` の既存行検査を丸ごと外す | 🔔 | 1 | 15 | 0 | AC-1a / AC-2a / AC-2b / AC-2c / AC-2d |
| C2 | 並行性 | 追記を `writeFileSync(flag:'w')` に(追記が上書き) | 🔔 | 1 | 7 | 0 | 台帳は追記型 / AC-1c / AC-2a / AC-6c |
| C3 | 並行性 | 追記を「読む→連結→`writeFileSync`」に | 🔔 | 1 | 3 | 0 | AC-1c / P-2 R-3 |
| C4 | 並行性 | `baseline` が索引を毎 record 組み直す(競合窓が広がる) | 🔔 | 1 | 3 | 0 | P-2 R-3 / P-2 が冪等性を壊していない |
| C5 | 並行性 | `preempted` の枝で追記をやめる(毒に負けて刻まない) | 🔔 | 1 | 3 | 0 | F-1 / prove-4 F-1 |
| T1 | 時刻 | `CLOCK_SKEW_TOLERANCE_MS` 24h → 100 年 | 🔔 | 1 | 2 | 0 | 狂った時計と古い台帳のマージ |
| **T2** | 時刻 | `CLOCK_SKEW_TOLERANCE_MS` → 0 | ❌ **無音** | 0 | 0 | 0 | — |
| T3 | 時刻 | `runStartTs` が最小でなく最大 ts を返す | 🔔 | 1 | 1 | 0 | prove-2 の 13 変異門 |
| T4 | 時刻 | `runStartTs` が読めない時 epoch 0 を返す | 🔔 | 1 | 1 | 0 | build-4 の 8 変異門 |
| T5 | 時刻 | 「開始より前」を `<` → `<=` | 🔔 | 1 | 1 | 0 | build-4 の 8 変異門 |
| T6 | 時刻 | 「未来」を `>` → `>=` | 🔔 | 1 | 1 | 0 | build-4 の 8 変異門 |
| **T7** | 時刻 | audit 側の未来判定だけ 365 倍(record と物差しが割れる) | ❌ **無音** | 0 | 0 | 0 | — |
| T8 | 時刻 | `record` の ts を ISO → `Date.now()` の数値文字列 | 🔔 | 1 | 11 | 0 | AC-1a / AC-2a … |
| **T9** | 時刻 | `preemptionReasons` が「ts が読めない」を数えない | ❌ **無音** | 0 | 0 | 0 | — |
| **T10** | 時刻 | `record` の ts が +9h(ローカル時刻を UTC と偽る) | ❌ **無音** | 0 | 0 | 0 | — |
| T11 | 時刻 | `runStartTs` が `history` でなく `meta.history` を見る | 🔔 | 1 | 1 | 0 | build-4 の 8 変異門 |
| X1 | exit | `record` の先回り exit 2 → 1 | 🔔 | 1 | 1 | 0 | 先回りは exit 2 で名乗る (F-1) |
| X2 | exit | `baseline` の先回り exit 2 → 0 | 🔔 | 1 | 2 | 0 | prove-4 F-1 / G9〜G11 |
| X3 | exit | audit の duplicates exit 1 → 常に 0 | 🔔 | 1 | 5 | **1** | AC-7b / P-8 |
| X4 | exit | audit の exit 2 → 1(P-8 の信号分離を潰す) | 🔔 | 1 | 5 | **1** | AC-7b / P-8 |
| X5 | exit | `compare` の「台帳に無い」を 3 → 2 に戻す | 🔔 | 1 | 1 | 0 | D-3 |
| X6 | exit | `readRunFile` の 3 → 2 | 🔔 | 1 | 2 | 0 | D-3 / build-4 |
| X7 | exit | `main` の catch を一律 2 に戻す | 🔔 | 1 | 2 | 0 | D-3 / build-4 |
| X8 | exit | usage の exit 3 → 0(誤字を成功と呼ぶ) | 🔔 | 1 | 3 | 0 | P3/C6 |
| X9 | exit | audit が `corrupt` を human に数えない | 🔔 | 1 | 2 | **1** | F-2 / build-4 |
| X10 | exit | `compare --last` の N 検査を外す(NaN が窓に通る) | 🔔 | 1 | 3 | 0 | P3/C3 / D-3 |
| **S1** | spawn-trace | `underEra` を `!== 'legacy'` → `=== 'present'` | ❌ **無音** | 0 | 0 | 0 | — |
| S2 | spawn-trace | tier3 判定を `isTier3State` → 素の文字列比較 | 🔔 | 1 | 2 | 0 | 第52条 / M-4 |
| S3 | spawn-trace | `epochStatus` が created 不明を stripped に倒す | 🔔 | 1 | 2 | 0 | 健全な走行は満点 / 未完走は減点 |
| **S4** | spawn-trace | `TIER_EPOCH_AT` を 2099 に(全走行が legacy) | ❌ **無音** | 0 | 0 | 0 | — |
| S5 | spawn-trace | `tierBreach` の重み 10 → 0 | 🔔 | 1 | 1 | 0 | 第52条 |
| S6 | spawn-trace | `isTier3State` から legacy 表記「序列3」を落とす | 🔔 | 1 | 2 | 0 | 第52条 / M-4 |
| B1 | baseline走査 | `isDirectory()` の絞りを外す | 🔔 | 1 | 9 | 0 | AC-2a / AC-2d |
| B2 | baseline走査 | `withFileTypes` を外し名前だけで走査 | 🔔 | 1 | 9 | 0 | AC-2a / AC-2d |
| B3 | baseline走査 | record の失敗を握り潰す | 🔔 | 1 | 1 | 0 | D-5 / 第55条 e |
| B4 | baseline走査 | `*.run.json` の拾いを外す | 🔔 | 1 | 1 | 0 | P-2 が冪等性を壊していない |
| **B5** | baseline走査 | `path.join` → `path.resolve` | ❌ **無音** | 0 | 0 | 0 | — |
| B6 | baseline走査 | 倉が無い時に `[]` でなく throw | 🔔 | 1 | 2 | 0 | P3/E5 / 第20条 |
| **B7** | baseline走査 | `isDirectory()` → `statSync().isDirectory()`(junction を辿る) | ❌ **無音** | 0 | 0 | 0 | — |
| **B8** | baseline走査 | `conclave.json` 以外の `.json` も run-state として拾う | ❌ **無音** | 0 | 0 | 0 | — |
| W1 | workspace | `ledgerPath` が workspace を通らず `__dirname` 基準に | 🔔 | 1 | **53** | 1 | 台帳は追記型 / AC-1c 第30条 |
| W2 | workspace | `LEDGER_NAME` を変える | 🔔 | 1 | **55** | 1 | AC-22b / dashboard-count 系 |
| G1 | 門の書き方 | `keyIndex` の結果をモジュール大域にキャッシュ | 🔔 | 1 | 4 | 0 | AC-1a / AC-2b |
| **G2** | 門の書き方 | 大域 memo の**代入を欠いた**版(= 無効な変異) | ❌ 無音 | 0 | 0 | 0 | ※ §3-2 |
| **G2b** | 門の書き方 | 大域 memo を**実際に代入する**(作り直し) | 🔔 | 1 | 3 | 0 | **D-6「呼び出しを跨いで状態を持たない」** |
| G3 | 門の書き方 | `ledgerPath` を読み込み時に一度だけ固定 | 🔔 | 1 | 1 | 0 | **D-6(別プロセスで撃つ門)** |
| **G4** | 門の書き方 | `record` に**未使用の**大域カウンタを足す | ❌ **無音** | 0 | 0 | 0 | — |
| G5 | 門の書き方 | G4 の大域を実際に使う(3 回目以降は追記) | 🔔 | 1 | 5 | 0 | AC-2a / AC-2b / prove-4 回帰 |
| **G6** | 門の書き方 | `WEIGHTS` を大域で破壊的に書き換える(2 回目から点が変わる) | ❌ **無音** | 0 | 0 | 0 | — |
| G7 | 門の書き方 | `foldLedger` の memo を大域へ + 鍵を slug に | 🔔 | 1 | 1 | 0 | P-2 のメモ化 |
| **G8** | 門の書き方 | `record` が「書いた fp」を大域 Set に憶える | ❌ **無音** | 0 | 0 | 0 | — |
| G9 | 門の書き方 | `module.exports` を `Object.freeze` する | 🔔 | 1 | — | **1** | dashboard-count 系(走行器が倒れる) |
| D1 | 深さ | `MAX_CANONICAL_DEPTH` 64 → 4096 | 🔔 | 1 | 13 | 0 | S-2 / N3 / N11 / P-1 |
| D2 | 深さ | 深さ検査を `>` → `>=` | 🔔 | 1 | 1 | 0 | S-2 注入門 |
| A1 | 書式 | `ENTRY_KEYS` に `note` を足す | 🔔 | 1 | 2 | 0 | F-1 / build-4 |
| **A2** | 書式 | `alienKeys` が sort しない | ❌ **無音** | 0 | 0 | 0 | — |
| A3 | 書式 | `isCorruptMark` が別の鍵を見る | 🔔 | 1 | 3 | **1** | F-2 / prove-4 D-5 |
| A4 | 書式 | corrupt 標識に `line` を載せない | 🔔 | 1 | 1 | 0 | build-4 の 8 変異門 |
| A5 | 書式 | 指紋の材料から `scale` を落とす | 🔔 | 1 | 4 | **1** | AC-1b / N18 |
| A6 | 書式 | 指紋の版印 `g1:` → `g2:` | 🔔 | 1 | 3 | **1** | AC-1a / N18 |

### 3-2. 集計

**60 変異のうち 46 が鳴り、14 が無音 = 無音率 23.3%。**

| 層 | 変異数 | 無音 | 無音率 |
|---|---|---|---|
| **門の書き方** | 10 | **4** | **40%** |
| **baseline 走査** | 8 | **3** | **38%** |
| **時刻** | 11 | **4** | **36%** |
| **spawn-trace** | 6 | **2** | **33%** |
| 書式 | 6 | 1 | 17% |
| **並行性** | 5 | **0** | **0%** |
| **exit** | 10 | **0** | **0%** |
| workspace | 2 | 0 | 0% |
| 深さ | 2 | 0 | 0% |

**無音率の推移: 40% → 52% → 36% → 41% → 31% → 本相 23.3%。**
下がったが、**下がった理由の半分は層の選び方である**:
私が新しく攻めた層のうち **`exit` と `並行性` は無音 0** だった —— これは D-3 の修理と
build-4 / prove-4 の門が既に厚いからであって、私の腕ではない。
逆に、**review-3 §8.3 が名指した「門の書き方」の層は 40% で最悪**であり、
その名指しは本相の実測で裏付けられた。

### 3-3. G2 の失敗を隠さない

v2 の `G2` は「`readLedger` の結果を大域 memo に載せる」意図だったが、
**`__ledCache` への代入を書き忘れており、常に `null` のままだった = 挙動を一字も変えない変異**である。
無音だったのは門の穴ではなく私の欠陥である。`G2b` で作り直したところ **3 門が鳴った**
(うち一本は `gauge: 呼び出しを跨いで状態を持たない — 別プロセスで撃つ (D-6)`)。
**無音表から G2 を外さず、失敗として残す**(第16条)。ただし §3-2 の率には G2 も分母・分子に数えてある ——
外せば率が 13/59 = 22.0% に下がるので、**都合のよい方に丸めない。**

---

## 4. 無音 14 件の triage —— 「本番で起きたら何が壊れるか」を実測した

triage 器: `triage.js` / `triage2.js` / `junction.js` / `t10-probe.js`。
**実物は一切書き換えていない** —— 変異版の複製を `$LOCALAPPDATA/Temp/sm-lab/` に置き、
実物と並べて同じ仮倉に撃った。

| # | もし本番でこの変異が起きたら | 実測 | 分類 |
|---|---|---|---|
| **S1** | 「印を消した走行」(stripped)が序列の罰を免れる。**実測: 同じ run が実物 `score=60 noTier=4` / 変異版 `score=100 noTier=0 unobservable=4`** —— 第52条の門を回避した走行が満点になる。gauge の点は verdict の SHIP/REWORK を分ける | **あり(実測)** | **【致命】** |
| **S4** | `TIER_EPOCH_AT` を未来に動かすと**全走行が legacy = 序列の式が誰にも掛からない**。実測は S1 と同一の数字(`60 → 100`)。engine の一行で全歴史の点が動く | **あり(実測)** | **【致命】** |
| **T9** | `ts` が壊れた行が「正当な先着」に昇格する。**実測: 実物 `record exit 2 / 行数 2`(先回りを名乗り正当な観測を刻む)/ 変異版 `exit 0 / 行数 1`(`already recorded @ not-a-time` と名乗って刻まない)** —— F-1 が塞いだ窓が再び開き、**正当な観測が失われる** | **あり(実測)** | **【致命】** |
| **G8** | `record` が台帳でなく**プロセスの記憶**を信じる。**実測: 台帳を外から空にしてから再 record すると、実物は `written`(記録が復活・行数 1)/ 変異版は `skipped`(復活せず・行数 0)** —— 「記録が失われない」という台帳の第一の徳が破れる | **あり(実測)** | **【致命】** |
| **B7** | `statSync` は junction を辿る。**実測: 倉の中に `mklink /J` で外を指す部屋を一本置くと、実物は `刻まれた行 1(inside のみ)`、変異版は `2 行(inside:100 + via-junction:50)`** —— **倉の外の run-state が台帳に刻まれる = 第30条が junction 一本で破れる** | **あり(実測)** | **【重大】** |
| **B8** | `conclave.json` 以外の `.json` も run-state として読む。**実測: `package.json` / `forge.dag.json` を置いた部屋で、実物は `1 行(thing:100)`、変異版は `2 行(thing:100, thing:10)+ 画面に `✗ thing: run-state carries no phases`** —— 同一 slug に偽の観測が混ざり、`latestFor` の答えが変わりうる | **あり(実測)** | **【重大】** |
| **G6** | 同一プロセスで `score` を二度呼ぶと点が変わる。**実測: 同じ run を 4 回採点 → 実物 `70,70,70,70` / 変異版 `70,97,97,97`**。CLI は毎回新プロセスなので破れないが、**`baseline` / `pulse` / dashboard は一プロセスで何度も呼ぶ**。gauge の第一の約束「決定性」が破れる | **あり(実測)** | **【重大】** |
| **T7** | 監査と `record` で未来の物差しが割れる。**実測: 2 日先の毒行に対し 実物 `exit 2 suspect=1` / 変異版 `exit 0 suspect=0`。400 日先なら双方 `exit 2`** —— **「2 日先の毒」だけが監査を素通りする**。F-1 が「現実に起きる形」と呼んだ狂った時計の範囲がまさにここ | **あり(実測)** | **【重大】** |
| **T2** | 許容ずれ 0。**実測: 2 秒進んだ機が刻んだ行に対し 実物 `audit exit 0 suspect=0` / 変異版 `audit exit 2 suspect=1`** —— 正常な台帳が恒常的に exit 2 を返す。R-2 が戒めた「鳴りっぱなしの門」そのもの。ただし**記録は失われない**(record は双方 exit 0 / 行数 2) | **あり(実測)** | 【重大】 |
| **T10** | 刻む ts が +9h。**実測: 変異版が刻む `2026-09-17T08:52:43` は許容ずれ 24h の内側なので `audit exit 0 suspect=0`** —— 監査には掛からない。破れるのは `foldLedger` の keep-first(ts 最小)と `latestFor`(ts 最大)の順序である。実測: 二度目の record は実物 engine でも `already recorded @ 2026-09-17T08:52:43` と正しく skip した = **冪等性は破れない**。壊れるのは**時刻の意味と並び順**だけ | あり(順序のみ) | 【軽微】 |
| **B5** | `path.join` → `path.resolve`。**NTFS は `..` を名に持つディレクトリを作れない**ので、`readdirSync` が返す名に `..` が現れる道が無い。実測: junction を置いた仮倉で実物・変異版とも同じ `1 行(inside)`。**`path.resolve` 自体は無害で、危険は B7 の `statSync` 側に在った** | 無し(実測) | 【好み】 |
| **G4** | 未使用の大域カウンタ。**実測: 5 回連続 record で実物・変異版とも `write,skip,skip,skip,skip / 行数 1`** —— 挙動を一字も変えない。だが **G5(同じ大域を実際に使う)は 5 門が鳴った**。ここで名指すべきは「大域の**存在**を検める門が無い」ことであり、`G4→G5` の一行差で致命に化ける | 無し(今日) | 【軽微】 |
| **A2** | `alienKeys` が sort しない。**実測: 鍵の順が `zebra,apple` の毒行と `apple,zebra` の毒行で、実物は双方 `秤が書かない鍵: apple, zebra`、変異版は `zebra, apple` と `apple, zebra` に割れる**。exit はどちらも 2。**人が読む文面が入力順に依存する** = 同じ毒が二通りの報告になり、grep での照合が崩れる | あり(文面のみ) | 【軽微】 |
| **G2** | (私の欠陥。代入を欠いた無効な変異。作り直した `G2b` は 3 門が鳴った) | — | ※欠陥 |

**14 件中 4 件が【致命】、5 件が【重大】、3 件が【軽微】、1 件が【好み】、1 件が私の欠陥。**
**「今日は無害」で逃げたのは B5 の 1 件だけであり、それは「NTFS が `..` の名を許さない」という
実測に基づく根拠を持つ**(そして危険の本体は B7 に在ることを突き止めた)。

### 4-1. triage から派生した、変異ではない発見

**`baseline` は今日、junction を辿らない。** これは偶然ではなく `readdirSync(root, {withFileTypes:true})`
が返す `Dirent` の `isDirectory()` が **reparse point に対して false を返す**ためである。実測:

```
$ node junction.js
mklink /J → 成功
$ PARADISE_CREATIONS=<仮倉> node graph/gauge.js baseline   (実物・無変異)
exit=0
═══════ 📒 GAUGE LEDGER ═══════
  2026-09-16T23:46  100/100  inside (standard)
═══════════════════════════════

realpath 検査:
  inside: isSymbolicLink=false isDirectory=true  realpath=...\junc-hLswpR\inside
  via-junction: isSymbolicLink=true isDirectory=false realpath=...\OUTSIDE-fx9tyn
```

---

## 5. 私が見ていないこと(名指し — 第16条)

**この節が本報告で最も重要である。** 前任がこの節を持たなかったために穴を見落とした。

### 5-1. 主題A で撃てなかったもの

1. **`uv_fs_write` が部分書きを返す場面を作れていない。** §A-5-4 でソース上の道を突き止めたが、
   **その道を踏ませる条件(ディスクフル / ネットワークドライブ / パイプ)を一つも試していない。**
   私が測ったのは NTFS のローカルディスクだけである。**SMB 共有・ネットワークドライブ・
   ReFS・exFAT では測っていない。**
2. **台帳の大きさと競合窓の幅の関係を測っていない。** §A-4 の「窓 10〜20ms」は**7 行の台帳**での値である。
   実台帳が 10^4 行に育てば `keyIndex` の再導出ぶん窓は広がるはずだが、その曲線は撃っていない。
3. **修理案を一つも実装していない。** §A-8 の表のうち「未実測」と書いた 4 案は文字どおり未実測である。
   ロックファイルの待ち時間も、一時ファイル+rename の代償も、数を持っていない。
4. **掃除(FR-8)が切れた行を消す経路を撃っていない。** §A-6 で「掃除が生の列を書き戻せば消える」と
   書いたが、**掃除スクリプトそのものを走らせていない**。
5. **`pulse` / dashboard が競合中の台帳を読む場面を撃っていない。** 読み手が畳みで守られることは
   §A-3 で示したが、**追記の最中(行が半分だけ在る瞬間)に読む**道は撃っていない。
6. **プロセス数 16 以上・試行 100 以上を撃っていない。** P=2/4/8 で 100% だったので打ち切った。
7. **同一 run でなく「別の run を同時に record」する道を撃っていない。** 指紋が違えば
   衝突しないはずだが、`appendFileSync` の同時性という点では同じ実験になるため省いた。

### 5-2. 主題B で撃てなかったもの

8. **`mklink /D`(真の symbolic link)を張れていない。** 本機では権限不足(開発者モード off)で
   `mklink /D` が失敗した。`junction` については §4-1 で閉じていることを実測したが、
   **真の symlink・ハードリンク・`\\?\` 前置きの長パス・NTFS の ADS(`file:stream`)は撃っていない。**
9. **絞り込み走行 168 門の外を撃っていない。** 全 471 門で撃てば無音が減る可能性がある ——
   ただし全走は 6 分なので 60 変異 × 6 分 = 6 時間。撃たなかったのは時間の都合であって
   「関係ないから」ではない。**無音 14 件のうち何件が残り 303 門で鳴るかを私は知らない。**
10. **`conclave.js` / `verdict.js` / `critic.js` から gauge を呼ぶ経路を撃っていない。**
    gauge の点が SHIP/REWORK を分けることは知っているが、**S1/S4 の点の変化(60→100)が
    実際に verdict の判定を反転させるかを実測していない。**
11. **CI(GitHub Actions)で同じ変異を撃っていない。** ローカルの Windows でだけ測った。
    `gauge-audit.test.js` の実台帳枝は「神の機にのみ在る」ので、**CI での挙動は本相では測れない。**
12. **`pulse serve` を長時間走らせていない。** G2b / G6 / G8 の「大域が育つ」系の実害は
    **短命プロセスでしか測っていない**。長寿命プロセスでのメモリ増加は測っていない。
13. **私が思いつかなかった層については何も言えない。** 無音率は 23.3% であり、
    **前五回と同じく「新しい層を選べばまた出る」と考えるのが妥当である。**
    本相で無音率が下がったのは、`exit` と `並行性` という**既に門が厚い層**を多く撃ったからでもある。

### 5-3. 規律について私が犯した違反(隠さない)

14. **私は実台帳を汚した。** 変異 **W1**(`ledgerPath` が `workspace` を通らず
    `__dirname/../../paradise-creations` を指す)を撃った際、**その状態で走った門が
    実台帳に 14 行を書き込んだ**。時刻帯は `2026-09-16T23:40:31.497Z`〜`23:40:35.614Z` の 4 秒間、
    slug は `demo-before, demo-after, coin, habit, newcomer, c1, c2, c3, c4, c5, healthy, G9box, tenbin, sandbox-only`
    —— すべて `tests/paradise.test.js` の仮倉用 fixture の名である。

    **これは「実台帳を汚すな」という本相の絶対の禁止事項に対する明白な違反である。**
    原因は私の設計の甘さである: **`PARADISE_CREATIONS` による振替を前提に門を走らせたが、
    W1 はまさにその振替を無効化する変異だった** —— 変異が防御そのものを外すことを私は考えていなかった。

    **処置(実測で確認した):**
    ```
    $ cp gauge-ledger.jsonl $LOCALAPPDATA/Temp/sm-lab/ledger-polluted-backup.jsonl   # 証拠を保全
    $ node -e "<ts >= '2026-09-16T23:40' の行だけを落とす>"
    私の汚染を除いた行数= 7
    $ sha256sum gauge-ledger.jsonl
    955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77 *gauge-ledger.jsonl
    ```
    **本相の開始時に採った sha256 と完全一致した**(§0 を見よ)。行数も 7 行に戻った。
    汚染された版は証拠として `$LOCALAPPDATA/Temp/sm-lab/ledger-polluted-backup.jsonl` に残してある。

    **それでも「汚さなかった」とは書かない。** 汚し、そして戻した。
    **この事故自体が主題Bの発見の一つである** —— §6 の D-A に載せる。

15. **この違反に気づいたのは、相の終わりに `git -C paradise-creations status --short` を
    撃ったときである。** 変異ごとに実台帳の sha256 を確かめる番兵を、私は持っていなかった。
    **60 変異のうちどれが汚したかを事後に時刻から突き止めた**(W1 が 35 番目、汚染は 4 秒間の一塊)。
    W2(`LEDGER_NAME` を変える)も同じ経路を持つが、**別名のファイルを書くので実台帳は汚れなかった**
    —— `paradise-creations/gauge-ledger-v2.jsonl` が残っていないことは `git status --short` が
    `M gauge-ledger.jsonl` のみを出したことで確かめた。

---

## 6. 次の相(specify)への引き渡し — 直すべき欠陥の候補(優先順)

| # | 欠陥 | 根拠(本相の実測) | 分類 | 直し方の当たり |
|---|---|---|---|---|
| **D-A** | **門が `PARADISE_CREATIONS` の振替**だけ**に頼っており、住所解決を壊す変異が実台帳を汚せる** | 私が W1 で実際に実台帳に 14 行書いた(§5-3)。振替は「門が正しく書かれている限り」しか効かない | **【致命】** | `withGaugeSandbox` の finally で**実台帳の sha256 を確かめる**番兵を足す。あるいは実台帳を read-only にして門を走らせる。**「汚さなかったこと」を主張でなく測定にする**(第38条) |
| **D-B** | **`record` の TOCTOU が並列度 100% で破れる** | P=2 で 50/50、P=4 で 20/20、P=8 で 20/20。`skipped` 報告は 0 回(§A-2) | **【重大】** | 治癒(畳み)が読み手を守っているので**記録は失われない**。直すべきは「`--audit` が exit 1 を返し続ける」設計と運用の噛み合わせ。ロックの代償(§A-8)は未実測なので specify で測ること |
| **D-C** | **序列の一行(`underEra` / `TIER_EPOCH_AT`)を動かすと点が 60→100 に跳ぶのに、門が一本も無い** | S1 / S4 とも無音、実測で `score=60 → 100`(§4) | **【致命】** | `gauge.js` に「stripped の run は罰される」門、`spawn-trace.js` に「`TIER_EPOCH_AT` の値を固定する」門(N18 の `g1:` と同じ作法)を足す |
| **D-D** | **`record` が「台帳」でなく「プロセスの記憶」を信じる形に退行しても門が鳴らない** | G8 無音。実測で台帳を空にした後 `skipped`(記録が復活しない)(§4) | **【致命】** | 「台帳を外から空にしてから再 record すれば記録が復活する」門。**プロセスを跨がずに書ける**(同一プロセス内で `fs.writeFileSync(L,'')` するだけ) |
| **D-E** | **`ts` が壊れた既存行が「正当な先着」に昇格する退行に門が無い** | T9 無音。実測で 実物 `exit 2 / 2 行` vs 変異 `exit 0 / 1 行`(§4) | **【致命】** | `preemptionReasons` の三つの物差しを**一つずつ**撃つ門(既に「未来」と「書式外」は在るが「読めない ts」が無い) |
| **D-F** | **同一プロセスで `score` を二度呼ぶと点が変わる退行に門が無い** | G6 無音。実測 `70,70,70,70` vs `70,97,97,97`(§4) | **【重大】** | 「同じ run を N 回採点して全部同じ点」という門。**`withGaugeSandbox` の内側で書ける** —— 決定性は gauge の第一の約束なのに、今は CLI 一回撃ちでしか検められていない |
| **D-G** | **監査と `record` で時刻の物差しが割れても門が鳴らない** | T7 無音。2 日先の毒が変異版だけ素通り(§4) | **【重大】** | 「`record` が先回りと呼ぶ行は `--audit` も必ず suspect と呼ぶ」という**二つの口の一致**を検める門 |
| **D-H** | **`baseline` の走査が junction を辿らないのは `Dirent.isDirectory()` の性質頼みで、門が無い** | B7 無音。実測で変異版は倉の外の run-state を刻んだ(§4 / §4-1) | **【重大】** | 仮倉に `mklink /J` を張って「倉の外の run-state は刻まれない」門。**Windows 専用の門になるので skip を名乗る作法が要る**(第58条 e) |
| **D-I** | **`conclave.json` 以外の `.json` を拾う退行に門が無い** | B8 無音。実測で `forge.dag.json` が偽の観測になった(§4) | 【重大】 | 仮倉に `package.json` / `forge.dag.json` を置いて「拾われる run-state は `conclave.json` と `*.run.json` だけ」を検める門 |
| **D-J** | **`CLOCK_SKEW_TOLERANCE_MS` を 0 にしても鳴らない = 鳴りっぱなしの門を作れてしまう** | T2 無音。2 秒の時計ずれで exit 2(§4) | 【重大】 | 「常識的な時計ずれ(数秒〜数分)を罪と呼ばない」門。R-2 が戒めた形の再発防止 |
| **D-K** | **`alienKeys` の名指しの列が入力順依存になっても鳴らない** | A2 無音。`zebra,apple` / `apple,zebra` に割れる(§4) | 【軽微】 | 鍵の順を入れ替えた同じ毒行で「同じ文面」を検める門 |
| **D-L** | **「モジュール大域を足す」こと自体を検める門が無い** | G4(未使用の大域)無音 / G5(使う)は 5 門。一行差で致命に化ける(§4) | 【軽微】 | `graph/gauge.js` のソースを静的に読み、**関数の外で `let`/`const` の可変状態を宣言していないこと**を検める門(`WEIGHTS` 等の定数は許す)。review-3 §8.3 が「門の書き方を一段変えないと見えない層」と呼んだのはまさにこれである |

### 6-1. specify に渡す、最も重要な一文

**`withGaugeSandbox` が `require.cache` を捨てる作法は門の独立性のために正しいが、
その作法は「モジュール大域の状態」と「住所解決の破壊」の二つを同時に観測不能にしている。**

本相はその名指しを二方向から実測で裏付けた:
- **観測不能の側**: 「門の書き方」層の無音率が **40%** で全層最悪(§3-2)。
- **危険の側**: 住所解決を壊す変異(W1)が、**門の防御を素通りして実台帳を汚した**(§5-3)。

**変異を足して埋まる穴ではない。** 必要なのは
(a) 門が**別プロセスで**撃つ経路(既に `runGaugeGate` が在る — もっと使う)、
(b) 門が**実台帳の不可侵を主張でなく測定で**証明すること(D-A)、
(c) **ソースを静的に検める門**(D-L)、
の三つである。

---

## 7. 規律の証明(木の清潔)

```
$ cd C:/Users/kikus/Documents/workspace/paradise && git branch --show-current
reform/silent-mutations                    ← ブランチを一度も切り替えていない

$ git status --porcelain                   # 相の終了時
?? reform/silent-mutations/                ← 本報告(と走行帳)だけ

$ sha256sum graph/gauge.js graph/spawn-trace.js tests/paradise.test.js
d1da309f101cad4edc47d05db2f78faecadfca9fdf3405027344a5fea39fa97a *graph/gauge.js
8e9df0bcc82bc74a91a7c7f4f19e2d0ed805ca5cb46480d0f37a892b9f88a8b3 *graph/spawn-trace.js
c5a1726d2e50d5c4dfb63c421b41d9994ea0e279f98c8d1b2b4703a3fcb95648 *tests/paradise.test.js
   ↑ graph/gauge.js は §0 の開始時の値と完全一致 = 60 変異が一つも残っていない
   ↑ tests/paradise.test.js も一致 = 門には一度も触れていない

$ git -C C:/Users/kikus/Documents/workspace/paradise-creations status --short
 M gauge-ledger.jsonl                       ← ★ 開始時から M(私ではない)

$ sha256sum C:/Users/kikus/Documents/workspace/paradise-creations/gauge-ledger.jsonl
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77 *gauge-ledger.jsonl
   ↑ §0 の開始時の値と完全一致。ただし **一度 e454f6b2… に汚れてから戻した**(§5-3)
$ wc -l → 7 行                              ← 開始時と同じ

$ node graph/gauge.js ledger --audit        # 実台帳(読むだけ)
📒 rows=7 distinct=7 duplicates=0 conflicts=0 too-deep=0 corrupt=0 suspect=0
audit exit=0                                ← 健全

$ node tests/paradise.test.js               # 相の終了時の全走(確認)
Paradise self-test: 471 passed, 0 failed
FINALEXIT=0                                 ← 基線(§3-0)と同一
```

- **commit も push もしていない。** `git log --oneline -1` は両倉とも開始時と同じ commit を指す。
- **`CLAUDE.md` と `.env` には触れていない。**
- **全 60 変異の前後で `git status --porcelain` を機械が記録した**
  (`mutations.jsonl` の `porcelainDuring` / `porcelainAfter`)。
  変異中は `" M graph/gauge.js\n?? reform/silent-mutations/"`、変異後は `"?? reform/silent-mutations/"`。
  **想定外の porcelain は 0 件。**
- **実験の器はすべて `$LOCALAPPDATA/Temp/sm-lab/` に住む**
  (`toctou.js` / `window.js` / `atomicity.js` / `big.js` / `baseline-race.js` /
   `mutate.js` / `mutate2.js` / `triage.js` / `triage2.js` / `junction.js` / `t10-probe.js` /
   `mutations.jsonl` / `full-baseline.log` / `ledger-polluted-backup.jsonl` /
   `libuv-win-fs.c` / `node_file.cc`)。楽園の倉には一つも置いていない。
- **ただし §5-3 の違反が在る。** 「実台帳を汚さなかった」とは書かない。**汚し、戻した。**

---

## 8. 結び

**「安全です」とは書かない。**

書けるのは ——
- **`record` の TOCTOU は並列度 2/4/8 のすべてで 100% 破れる**(150 試行中 150)。
  ただし**破れ方は重複行の生成一種類だけ**であり、`skipped` の誤報は起きず、
  畳み(`foldLedger`)が読み手を守っている。**記録が失われる方向には倒れなかった。**
- **`appendFileSync` は本機の NTFS で 64MB の一行まで切れなかった**(8 プロセス × 25 回 × 4 水準 +
  4 プロセス × 3 回 × 2 水準、混線 0 / 欠損 0 byte)。libuv が `O_APPEND` を `FILE_APPEND_DATA` に
  写すことをソースで確かめた。**だが `writeFileUtf8` の loop が部分書きを返せば原理的に切れる道は在る。**
- **60 変異のうち 14 が無音(23.3%)。うち 4 件が【致命】、5 件が【重大】。**
  「今日は無害」で片付けたのは 1 件だけで、それも NTFS の制約という実測の根拠を持つ。
- **`review-3` §8.3 が名指した「門の書き方の層」は実測で無音率 40% の最悪層であり、
  その名指しは正しかった。** そして私は同じ層で**実台帳を汚すという実害を自分で起こした。**

**そして §5 に列挙した 15 項目を私は見ていない。**




