# security 相 — reform 走行『silent-mutations』

**審査者**: security-reviewer(独立審廷 / 第11条)
**対象**: 未 commit の作業木(branch `reform/silent-mutations`)
  `CONSTITUTION.md +39`(第62条) / `CONSTITUTION.INDEX.md +3` / `README.md ±1` /
  `graph/gauge.js +8`(`healable` 欄と 🧹 の文面)/ `tests/paradise.test.js +617`(実台帳番兵 + 新設13門)
**姿勢**: 「問題なし」を出すために撃つのではない。**この改修が新たに開けた穴**を探すために撃つ。
前任(`reform/gauge-ledger-idempotent/security-report-3.md` の F-1/F-2、
`reform/route-misfire/security-report.md` の HIGH-1)と**同じ層は撃たない** ——
前任は「台帳の中身」と「住所解決」を撃った。**本稿は番兵そのもの・静的の門そのもの・
そして第62条が開けた設計上の窓**を撃つ。

---

## 0. 実台帳の保全(第一の戒め)

全作業は複製(`$LOCALAPPDATA/Temp/sec-sm/paradise` + 偽の兄弟倉)に対して行った。
実台帳 `C:/Users/kikus/Documents/workspace/paradise-creations/gauge-ledger.jsonl` は
**作業中に三度照合し、三度とも一致した**。

```
$ sha256sum C:/Users/kikus/Documents/workspace/paradise-creations/gauge-ledger.jsonl
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77   (開始時 / 7行)
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77   (中間 checkpoint 2)
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77   (中間 checkpoint 3)
955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77   (終了時)
```

実装の変異は**すべて複製に対して**撃ち、毎回 `finally` で生バイト列を書き戻して
`sha256` 一致を証明した(`git checkout -- <file>` は一度も使っていない)。

---

## 1. 撃った攻撃の一覧(45本)

| # | 層 | 攻撃 | 結果 |
|---|----|------|------|
| A1 | 番兵/DoS | 実台帳を 10万行 93MB に差し替えて gauge 節を走らせる | **代が 12s→17s** |
| A2 | 番兵/DoS | 1.17GB の実台帳で 66 回 digest したときの peak RSS | **2.42GB** |
| A3 | 番兵/DoS | 1.17GB の実台帳で gauge 節を実走 | **12s→68.5s(5.7倍)** |
| A4 | 番兵/耐障害 | 実台帳をディレクトリに差し替える(`existsSync` は真、`read` は EISDIR) | **【致命】節の読み込みで未捕捉例外。484門すべてが走らない** |
| A5 | 番兵/競合 | 走行中に別プロセスが実台帳を一瞬消して戻す | 偽の赤は出ず(窓を外した) |
| A6 | 番兵/競合 | 別プロセスが実台帳を連続して消し/戻しし続ける | **【重大】偽の赤 1件 + 番兵が skip に落ちた** |
| A7 | 番兵/迂回 | 節の読み込み時だけ実台帳を隠し、後で汚す | **【致命】番兵を永久 skip に固定 → 実台帳を汚しても 122 green / 0 red** |
| A8 | 番兵/窓 | `REAL_DIGEST` の陳腐化窓を計測(gauge 節) | 前窓 2ms / 番兵の射程 12.6s |
| A9 | 番兵/窓 | 全484門走行での番兵の射程を計測 | **【重大】367秒の走行のうち番兵が見るのは最初の12.3秒だけ** |
| A10 | 番兵/射程 | 番兵の外で実台帳に触る門を数える | 節外に 3 箇所(3337 / 7932 / 8343行) |
| A11 | healable | 破損行 / 偽の鍵 / 重複 / 健全 の四入力で `healable` を観測 | 規約どおり |
| A12 | healable | `metrics` を持たない行を混ぜる | **【重大】healable:true / exit 0 / rows が 1 に化ける** |
| A13 | healable | `metrics` 無しの行を 100 本 | **【重大】ファイル 101 行が rows=1 / healable:true** |
| A14 | healable | `null` 行 | **healable:true** |
| A15 | healable | 配列行 `[1,2,3]` | **healable:true** |
| A16 | healable | 裸の文字列行 | **healable:true** |
| A17 | healable | 裸の数値行 | **healable:true** |
| A18 | healable | 空オブジェクト行 | **healable:true** |
| A19 | healable | `metrics:"x"`(非オブジェクト) | **healable:true** |
| A20 | healable | `metrics:null` | **healable:true** |
| A21 | healable | `__proto__` を持つ行(原型汚染) | 偽の鍵として捕捉(healable:false) |
| A22 | healable/実在 | 「掃除(FR-8)」は道具として実在するか | **【重大】実在しない。`healable` は存在しない道具を指す** |
| A23 | healable/下流 | `healable` を読む下流(pulse/dashboard/verdict/conclave)の探索 | 読み手ゼロ(偽表示の道は今日は無い) |
| A24 | 情報漏洩 | 秘密を仕込んだ破損行に対する `--audit --json` | **【重大】台帳の生バイトが 200 文字そのまま出る** |
| A25 | 並行門 | 仮倉のパスに空白/引用符/`;`/`$()`/backtick/`%PATH%` | 破れず(`execFileSync` は shell を通さない) |
| A26 | 並行門 | AC-13 の `execFileSync` にタイムアウトが有るか | **【軽微】無い(無限待ち)** |
| A27 | 並行門 | 死なない子で駆動子を吊るす | 8秒で外部から殺すまで無限に待つ |
| A28 | 並行門 | 駆動子が死んだ後に孫が漏れるか(Windows) | 漏れない(job object が孫を連れて死ぬ) |
| A29-A43 | 静的の門 | 可変の大域を 15 の形で書き、字句器に見つかるか | **【重大】9/15 が不可視** |
| A44 | 静的の門 | ghost 変異が本当に有害か(跨ぎ呼び出しで古い畳みを返す) | 有害と実証 |
| A45 | 静的の門 | 原型の沈黙変異 G4 を `globalThis` / `module.exports` / `class static` 形で撃つ | (本文参照) |

| A46 | 漏洩 | 番兵が画面に出す sha256 は漏洩か | **【軽微】前像が総当り可能** |
| A47 | 設計 | 第62条(b) が「門が現物に触れる」を正当化していないか | **【重大】正当化している(設計上の窓)** |
| A48 | 設計 | 第62条(b) は「どの門が汚したかを名指せ」と命じるが、番兵は名指すか | **【重大】名指さない。条文と実装が食い違う** |
| A49 | 番兵/偽の赤 | **開発者が別端末で `gauge.js record` を正当に走らせる**(競合なし・悪意なし) | **【致命】無実の門 6 本が赤くなり、番兵が無実の門を名指す** |
| A50 | 漏洩 | 印字された digest の前像の推測難度 | 7行/2034B/構造既知 → 総当り可能 |
| A51 | 供給鎖 | README の門数が実測と合っているか(第22条) | 471→484 に更新済み(整合) |
| A52 | 供給鎖 | CONSTITUTION.INDEX の条数/バイト数 | 61→62 / 123,619B(整合) |
| A53 | 番兵/同一性 | 実台帳をハードリンク(symlink は EPERM)に差し替える | 番兵は**中身**を見る。同一性は見ない |
| A54 | 供給鎖 | 差分に増えた `require` を数える | **新規依存ゼロ**(全て Node 標準 or リポジトリ内) |
| A55 | 秘密 | 差分 + 走行記録 6 枚(339KB)を秘密 regex で撃つ | **混入なし** |

---

## 2. 各攻撃の手順と実測結果(生の出力)

### 2-1. 番兵は新しい攻撃面である(最優先の層)

番兵は `withGaugeSandbox` の `finally` で **実台帳を読む**。
これは第30条が守ってきた「門は仮倉としか話さない」という規律に、
**門が現物に触れる合法の経路を新設した**ということである。以下はその経路を撃った記録である。

#### A1/A2/A3 — DoS。実台帳が育てば門が窒息する

番兵は**門ごとに実台帳を全部読んで sha256 を取る**。
design が測ったのは「sha256 一回 0.057ms × 62 = 3.5ms(節の 0.04%)」だが、
**その測定は実台帳が 7 行 2KB であることに完全に依存している**。実台帳は**追記のみで育つ台帳**である。

```
$ node digestbench.js paradise-creations/gauge-ledger.jsonl big-1e5.jsonl big-100mb.jsonl
paradise-creations/gauge-ledger.jsonl  size=0.0MB  per-call=0.04ms  x62gates=0.00s  peakRSS_read=0.0MB(Buffer)
big-1e5.jsonl                          size=25.8MB per-call=14.47ms x62gates=0.90s  peakRSS_read=25.8MB(Buffer)
big-100mb.jsonl                        size=93.4MB per-call=54.03ms x62gates=3.35s  peakRSS_read=93.4MB(Buffer)

$ grep -c "withGaugeSandbox(" tests/paradise.test.js
66                 # design の「62 呼出」は既に 66 に増えている
```

実走(複製 + 偽の兄弟倉。**実台帳には一切触れていない**):

```
[素]        gauge 節 123 門 = 11.9 秒
[93MB]      gauge 節 123 門 = 16.7 秒      (+40%)
[1.17GB]    gauge 節 123 門 = 68.5 秒      (+476% / 5.7倍)

$ node peak.js paradise-creations/gauge-ledger.jsonl
peakRSS after 66 digests = 2421.7 MB  file= 1173.9 MB
```

**判定**: 今日は実害ではない(実台帳は 2KB)。だが **`fs.readFileSync` は全体をメモリに載せる**ので、
代は台帳の大きさに**線形**であり、峰の常駐は**台帳の 2 倍**まで膨らんだ。
第55条が「台帳は追記のみ」と定めている以上、**この代は単調増加する**。
そして掃除(FR-8)は**道具として存在しない**(A22)ので、縮む道が無い。

#### A4 — 【致命】実台帳をディレクトリに差し替えると 484 門すべてが走らない

`ledgerDigest` は `fs.existsSync(p) ? readFileSync(p) : null` である。
**「在るか」と「読めるか」を同じ言葉で扱っている** —— これは `workspace.js` が
`exists` と `vault` を分けた理由(欠陥B)と**同型の誤り**である。

```
$ rm -f paradise-creations/gauge-ledger.jsonl && mkdir -p paradise-creations/gauge-ledger.jsonl
$ node -e "..."
existsSync = true
readFileSync THREW: EISDIR

$ node paradise/tests/paradise.test.js --gate "gauge"
  return binding.read(fd, buffer, offset, length, position);
                 ^
Error: EISDIR: illegal operation on a directory, read
    at Object.readSync (node:fs:736:18)
    at tryReadSync (node:fs:416:20)
    at Object.readFileSync (node:fs:470:19)
    at ledgerDigest (…\tests\paradise.test.js:3469:54)
    at Object.<anonymous> (…\tests\paradise.test.js:3470:21)      <== 節の読み込み(トップレベル)
    at Module._compile (node:internal/modules/cjs/loader:1812:14)
  errno: -4068, code: 'EISDIR', syscall: 'read'
$ echo $?
1
```

**`REAL_DIGEST = ledgerDigest(REAL_LEDGER)` は節のトップレベルで走る**ので、
これは門の失敗ではなく **モジュール読み込みの失敗**である。
`--gate gauge` だけでなく **484 門すべてが一本も走らない**。
`EACCES`(権限剥奪)/`ELOOP`(リンクの環)/`ENAMETOOLONG` も同じ道である。

**再現**: 実台帳の位置に同名のディレクトリを作る。以上。

#### A7 — 【致命】番兵を永久 skip に固定し、実台帳を汚しても緑

番兵の判定は `REAL_DIGEST === null` —— つまり**節の読み込みの一瞬**に台帳が見えなければ、
その走行のあいだ**番兵は永久に無力化される**。窓は `existsSync` の一回だけである。

```
$ node pin.js
before sha = 955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77
[attacker] poisoned the real ledger mid-run
TEST exit = 0
      · skip: 実台帳が無い(…\paradise-creations\gauge-ledger.jsonl)— 兄弟倉は楽園の倉に付いてこない。
        番兵自体の歯は「実台帳が無い機でも番兵は歯を持つ」の (a) が撃っている
Paradise gate-filter: 123 of 484 gates matched — 122 green, 0 red, 1 skipped
after  sha = 99e70b37f27fa2106d2f97d40112221d263cc2d2d341f0cc784178d2f9cdc294
POISON row present in REAL ledger = true          <== 実台帳が汚れている
restored sha = 955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77
```

攻撃者の手順は三行である。

1. 実台帳を `unlink`(名前を変えるだけでもよい)
2. 2.5 秒待つ — この間に `paradise.test.js` が読み込まれ、`REAL_DIGEST = null` が焼き付く
3. 台帳を戻し、**以降は好きなだけ汚す**。番兵は `skip` を名乗り続け、**一度も指紋を照合しない**

**これは本走行が塞ごうとした W1 そのもの**である。
W1 は「住所解決を壊して門の防御を素通りする」変異だった。
番兵は W1 を捕らえるために建てられたが、**番兵自身に同じ形の素通りが在る**。

**重要**: これは「skip を名乗るから第37条を満たす」では済まない。
第37条が要求するのは**不在を通過と扱わないこと**であり、
「不在**を装われた**」状態は、この実装では不在と区別できない。
`sentinelSkipNote()` は「兄弟倉は楽園の倉に付いてこない」と **CI を想定した理由を断定している** ——
神の機械で skip が出た時点で**それは異常であり、断定された理由は嘘である**。

#### A9 — 【重大】番兵は 367 秒の走行のうち最初の 12.3 秒しか見ていない

```
$ node window3.js
FULL RUN. gates: Paradise self-test: 478 passed, 5 failed, 1 skipped
sentinel firings = 80  of 484 gates
run wall clock total = 367012ms
DIGEST at t=0; FIRST sentinel t+2ms; LAST sentinel t+12308ms
largest inter-sentinel gaps (ms): 1706, 1308, 919, 793, 790, 658, 440, 355
```

- 番兵は **80 回**鳴る(門は 484 本)。**404 門は番兵に見られていない。**
- 番兵の射程は **t+2ms 〜 t+12,308ms**。**走行の残り 354 秒(96.6%)は無防備**である。
- `REAL_DIGEST` は t=0 に一度だけ計られ、**t+2ms に初めて照合される**。
  この 2ms が「汚して戻す」窓だが、より重要なのは**最後の番兵の後の 354 秒**である ——
  **そこで実台帳を汚した門は、この走行では絶対に捕まらない。**

節外にも実台帳に触る道が 3 箇所在る(`tests/paradise.test.js:3337` / `:7932` / `:8343`)。
**そのすべてが番兵の射程の外**にある。

#### A6 / A49 — 【重大〜致命】偽の赤。しかも無実の門を名指す

`A49` は**悪意も競合も要らない**。開発者が**別の端末で `gauge.js record` を正当に走らせる**だけでよい。
台帳は追記のみで、`record` は台帳を書くのが仕事である。これは事故ではなく**通常の営み**である。

```
$ node falsered.js
[dev] recorded a LEGITIMATE run in the other terminal
TEST exit = 1
  ✗ gauge: readLedger({raw:true}) は本当に生の全行を返す (P-1 ①)
      実台帳が書き換えられた — 門は仮倉としか話してはならない (D-A / 第30条 / 第62条 b):
      before=955ea34a…aab77 after=2bd6c8c6…669dec
  ✗ gauge(CLI): 全行が深すぎる台帳を --audit が「健全」と答えない (P-1 ② / 第16条)
      実台帳が書き換えられた — …
  ✗ gauge(CLI): 深すぎる行を「畳んだ重複」に混ぜて数えない (P-1 / NFR-1 / 第16条)
      実台帳が書き換えられた — …
  ✗ gauge: FR-8 の掃除(畳んだ版で置き換える)が深すぎる行を消さない (P-1 ③ / 第55条 e)
      実台帳が書き換えられた — …
  ✗ gauge(CLI): audit の信号は「掃除できる欠陥」と「人が読むべき事故」を分ける (P-8)
```

**この赤は二重に嘘である。**

1. **無実の門が赤くなる。** 台帳を汚したのは**別プロセスの `gauge.js record`** であって、
   `readLedger({raw:true}) は本当に生の全行を返す` という門ではない。
2. **一度汚れたら残り全部が赤くなる。** `REAL_DIGEST` は t=0 の値に固定されているので、
   **以降の全ての門が同じ差分を見て、全員が「私が汚した」と名乗る**。
   上の出力で 6 本が同じ `after=2bd6c8c6…` を名乗っているのがそれである。

第62条(b)は「**どの門が汚したかを名指して**倒れよ」と命じている。
**実装は名指していない** —— `withGaugeSandbox(fn)` は門の名前を引数に取らず(`:3503`)、
文面には `before=` と `after=` しか無い(`:3533-3534`)。
**条文が要求した機能が実装されていないまま条文だけが入った。**

A6(悪意ある連続 flicker)でも同じ形が出た:

```
$ node flick2.js
exit = 1
      · skip: 実台帳が無い(…)— 兄弟倉は楽園の倉に付いてこない。…
      · skip: 実台帳が無い(…)— …
  ✗ gauge: 門は実台帳を一行も書き換えない (AC-9c / 第30条)
Paradise gate-filter: 123 of 484 gates matched — 121 green, 1 red, 1 skipped
final sha = 955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77   <== 台帳は無傷
```

**台帳は一バイトも変わっていないのに赤が出た。** これが偽の赤の定義である。

#### A53 — 番兵は中身を見る。同一性は見ない

```
$ node symlink.js
symlinkSync failed: EPERM - trying junction/hardlink
HARDLINK created instead
lstat isSymbolicLink = false  digest via path = 955ea34a020bf568
TEST exit = 0   Paradise gate-filter: 123 of 484 gates matched — 122 green, 0 red, 1 skipped
sentinel complained? false
=> the sentinel follows the link: it hashes CONTENT at the path, never identity (inode/target).
after swapping the TARGET, digest via path = ed6911d082016499 (changed => detectable, but only on the NEXT run)
```

**判定: 受容。** 中身を見るのは正しい設計である(リンクの張り替えも中身が変われば捕まる)。
ただし **`REAL_LEDGER` が指す先が別のファイルに化けても、中身が同じなら番兵は黙る**。
実害の道は思いつかなかったが、**「同じ道に同じ中身が在る」しか保証していない**ことは名乗っておく。

---

### 2-2. `--json` の `healable` 欄(`graph/gauge.js` の八行)

#### A12-A20 — 【重大】「人の手が要る事故」を `healable:true` と名乗らせられる

`healable = (a.conflicts.length === 0)` である。
だが **`conflicts` に載らない不健全**が在る。`readLedger` が黙って捨てる行がそれである。

```
$ node hb2.js
--- H1 metrics-less row (human must look)
    file lines=2    exit=0  rows=1  healable=true
--- H2 100 metrics-less rows
    file lines=101  exit=0  rows=1  healable=true          <== 101 行が rows=1
--- H3 JSON null lines
    file lines=3    exit=0  rows=1  healable=true
--- H4 array line
    file lines=2    exit=0  rows=1  healable=true
--- H5 bare string line
    file lines=2    exit=0  rows=1  healable=true
--- H6 bare number line
    file lines=2    exit=0  rows=1  healable=true
--- H7 empty object
    file lines=2    exit=0  rows=1  healable=true
--- H8 metrics:"x"
    file lines=2    exit=2  rows=2  healable=true          <== exit 2 なのに healable:true !!
--- H9 metrics:null
    file lines=2    exit=0  rows=1  healable=true
--- H10 __proto__ key
    file lines=2    exit=2  rows=2  healable=false
```

**二つの穴が在る。**

1. **`rows` が嘘をつく。** ファイルに 101 行あって `rows=1` と答える。
   これは前任が F-2 で名指した病(`rows=0 … exit 0`)の**残り半分**である。
   前任は `JSON.parse` に失敗する行(`corrupt`)を塞いだが、
   **`JSON.parse` に成功して `metrics` を持たない行**は今も静かに消える。
   `healable:true` はこの上に建っている。

2. **H8: `exit=2` なのに `healable=true`。** これが最も鋭い。
   `metrics:"x"` は `rows=2` に数えられ、**exit code 2(人が読むまで消えない事故)を出しているのに**、
   `healable` は `true` と名乗る。**exit code と `healable` が矛盾している。**
   design §4-1 の「`human` 一本で足りる」という主張は、**この入力で破れる**。

   `healable` の意味は「掃除を掛ければ消える欠陥しか残っていない」である。
   H8 では掃除を掛けても exit 2 は消えない。**`healable` は嘘をついている。**

**再現**: 仮倉の台帳に `{"ts":"…","slug":"S","scale":"standard","metrics":"x"}` を一行入れて
`node graph/gauge.js ledger --audit --json`。`exit=2` と `"healable":true` が同時に出る。

#### A22 — 【重大】`healable` は存在しない道具を指している

```
$ node graph/gauge.js
commands: score <run.json> [--json] | record <run.json> --slug <s> | baseline |
          compare <a> <b> | compare --last N | ledger [--audit]

$ node -e "console.log(Object.keys(require('./graph/gauge.js')).join(', '))"
score, normalize, record, baseline, compare, readLedger, ledgerPath, WEIGHTS, fingerprint,
foldLedger, latestFor, auditLedger, keyIndex, alienKeys, preemptionReasons, runStartTs,
ENTRY_KEYS, CLOCK_SKEW_TOLERANCE_MS, renderLedger
```

**「掃除(FR-8)」という命令も関数も存在しない。**
`healable:true` は「掃除を掛ければ消える」と名乗るが、**掛ける掃除が無い**。
build.md 自身が `> **healable を読む者は今日ひとりも居ない**(design §Z-3)。掃除スクリプトは存在しない。` と書いている。

**判定**: 今日は実害ゼロ(読み手が居ないので誤導される者も居ない)。
だが**読み手が居ない欄を出力に足すことは、第44条が戒めた「鳴らない門」の双子**である ——
**誰も読まない事実は、腐っても誰も気づかない。**
明日誰かが `healable` を信じて自動化を書いたとき、H8 の矛盾がそのまま事故になる。

#### A23 — 下流に偽を表示する道は**今日は無い**

```
$ grep -rn "healable" --include=*.js --include=*.md --include=*.yml --include=*.json .
./graph/gauge.js:940   (註釈)
./graph/gauge.js:944   const healable = human === 0;
./graph/gauge.js:945   if (argv.includes('--json')) console.log(JSON.stringify({ ...a, healable }));
./reform/silent-mutations/*.md   (走行の記録のみ)
```

`pulse` / dashboard / `verdict.js` / `conclave` のいずれも `healable` を読まない。
**偽表示の道は今日は閉じている。** ただし A22 の理由で、これは「安全」ではなく「未使用」である。

#### A24 — 【重大】`--json` は台帳の生バイトを 200 文字そのまま吐く

`{ ...a, healable }` の `a` は `auditLedger` の返り値であり、
その `conflicts[].line` には **破損行の生の中身が 200 文字入っている**(`gauge.js:503`)。

```
$ node leak.js
=== RAW --json OUTPUT ===
{"rows":1,"distinct":1,"tooDeep":0,"corrupt":1,"suspect":0,"duplicates":0,"conflicts":[
 {"slug":"coin","kind":"forged-fp","declared":"g1:deadbeefdeadbeef","actual":"g1:21098f8296de44e3",
  "observations":[{"ts":"2026-08-31T13:54:12.961Z","fp":"g1:deadbeefdeadbeef","score":100}]},
 {"slug":null,"kind":"corrupt","declared":null,"actual":null,
  "line":"{\"ts\":\"2026-09-01T00:00:00.000Z\",\"slug\":\"acme-internal\",\"apiKey\":\"sk-live-ABCDEF0123456789\",\"note\":\"CEO salary 1200万\",",
  "observations":[{"ts":null,"fp":null,"score":null}]}],"healable":false}

=== what leaked ===
leaked the secret?   true
leaked slug names?   true
leaked fingerprints? true
```

人が読む道と機械が読む道で**露出量が違う**:

```
$ node leak2.js
payload written  = 400 chars of P
line echoed back = 200 chars      <== --json
human line echoes = 60 chars      <== 画面の「破損行:」は 60 文字で切る
```

**`--json` は人向けの 3.3 倍を吐く。**
`--audit` は元々この `line` を持っていたが、**それを機械可読な形で外に出す道を新設したのは本改修である**
(`if (argv.includes('--json')) console.log(JSON.stringify({ ...a, healable }))` の一行)。
CI のログに貼られる出力であり、台帳が汚れる原因は**人が手で書いた行**であることが多い。

**判定【重大】**: 機密が台帳に入る設計ではないので今日の実害は低い。
だが **`{...a}` の全展開は「何が出るか」を作者が数えていない証拠**であり、
`auditLedger` に将来フィールドが増えれば**自動的に外へ漏れる**。
出力は**列挙**すべきであって、展開すべきではない。

---

### 2-3. 並行門(AC-13)の子プロセス

#### A25 — 引数注入・パス注入は破れなかった(受容)

```
$ node pathinj.js
plain          -> "OK:GAUGEPATH"
with space     -> "OK:GAUGEPATH"
with'quote     -> "OK:GAUGEPATH"
with"dquote    mkdir FAILED ENOENT        (Windows がファイル名として拒む)
with&amp       -> "OK:GAUGEPATH"
with;semi      -> "OK:GAUGEPATH"
with$(id)      -> "OK:GAUGEPATH"
with`tick`     -> "OK:GAUGEPATH"
with%PATH%     -> "OK:GAUGEPATH"
```

`execFileSync` / `spawn` は **shell を経由しない**ので、メタ文字はすべてただの文字として渡る。
`mkdtempSync(os.tmpdir())` が生む道に攻撃者が文字を注ぐ余地も無い。
駆動子と子は `-e` の文字列ではなく**ファイルとして**書かれており(design 相の判断)、
二重 `JSON.stringify` の破れも無い。**この層は堅い。**

#### A26 / A27 — 【軽微】タイムアウトが無い

```
$ sed -n '6459,6460p' tests/paradise.test.js
    const marks = execFileSync(process.execPath, [driverJs, childJs, GAUGE_JS, runFile],
      { encoding: 'utf8', env });                            <== timeout なし

$ grep -n "timeout" tests/paradise.test.js
1869:  … timeout: 30000 …      (kg の門は持っている)
1920:  … timeout: 30000 …      (kg の門は持っている)
```

実測(死なない子を吊るす):

```
$ node hang.js
threw after 8007 ms  signal= SIGTERM  status= null     (私が外から 8 秒で殺した)
elapsed = 8008 ms  (AC-13 as written passes NO timeout => unbounded)
```

AC-13 の門には `timeout` が無いので、`record` が何らかの理由で返らない日には
**CI が無限に吊る**。同じファイルの `:1869` / `:1920` は 30 秒を持っており、**作法が一貫していない**。
`RACE_LEAD_MS`(助走)の門は在るが、**上限の門は無い**。

#### A28 — ゾンビは残らない(受容)

```
$ node orphan4.js
orphanprobe BEFORE = 0
driver killed by: SIGTERM
orphanprobe AFTER driver death = 0
=> grandchildren ORPHANED (process leak): false
```

Windows では駆動子が死ぬと job object が孫を連れて死ぬ。**プロセスは漏れない。**
(※ この結果は **Windows 固有**である。POSIX の CI では孫が `init` に引き取られて残りうる —— 未検証。§4 に名乗る)

---

### 2-4. 静的の門(AC-11/12)を騙す

#### A29-A43 — 【重大】9/15 の形で、字句器に見えない可変の大域を持てた

字句器は `let` / `var` の宣言と、**最上位の名前**への代入・破壊的操作を見る。
ゆえに **「最上位の名前を作らずに状態を持つ」形はすべて素通りする**。
15 の形を発明し、**本当に呼び出しを跨いで状態を持つか**も同時に実測した。

```
$ node staticbypass.js
name                                       | hits | REALLY stateful? | verdict
-----------------------------------------------------------------------------------------------
B1 globalThis.x = 1                        |    0  | YES              | *** BYPASS ***
B2 module.exports.cache = {}               |    0  | YES              | *** BYPASS ***
B3 exports.seen (bare exports)             |    0  | no               | -
B4 const obj + Object.assign               |    0  | YES              | *** BYPASS ***
B5 const arr + concat-reassign into prop   |    1  | YES              | caught(1)
B6 Object.defineProperty on a const        |    1  | YES              | caught(1)
B7 Map via const + .get/.set through alias |    1  | YES              | caught(1)
B8 process.env as the store                |    0  | YES              | *** BYPASS ***
B9 require.cache of self                   |    0  | YES              | *** BYPASS ***
B10 eval-created global                    |    0  | YES              | *** BYPASS ***
B11 Proxy over a frozen table              |    1  | YES              | caught(1)
B12 dynamic require of a sibling store     |    0  | YES              | *** BYPASS ***
B13 class static field                     |    0  | YES              | *** BYPASS ***
B14 destructured let                       |    0  | YES              | *** BYPASS ***
B15 for-loop let at top level              |    1  | YES              | caught(1)
```

**14/15 が本当に状態を持ち、そのうち 9 本が門に見えない。**
特に注目すべきは **B14(分割代入の `let`)** である ——
`let { a, b } = { a:0, b:0 };` は**紛れもない最上位の `let`** だが、
正規表現 `/\b(let|var)\s+([A-Za-z_$][\w$]*)/` が `{` に当たらず素通りする。
**門が名指すと宣言した形そのものが、書き方一つで抜ける。**

#### A41 — G8(設計が捕らえたと主張する変異)の等価形を 5 つ作り、全部が不可視だった

```
$ node g8ghost.js
target line present in real gauge.js: true
G8-original  record.__seen   hits= 1  loads=ok
      caught as: record(最上位束縛の属性への代入)
G8a globalThis memo          hits= 0  loads=ok  *** INVISIBLE TO THE GATE ***
G8b module.exports memo      hits= 0  loads=ok  *** INVISIBLE TO THE GATE ***
G8c require.cache memo       hits= 0  loads=ok  *** INVISIBLE TO THE GATE ***
G8d class static memo        hits= 0  loads=ok  *** INVISIBLE TO THE GATE ***
G8e process.env flag         hits= 0  loads=ok  *** INVISIBLE TO THE GATE ***
```

**同じ意味・同じ害・同じ行**を、書き方だけ変えて 5 通り。**原型だけが捕まる。**

#### A45 — 決定的な対照。**原型の沈黙変異 G4 を、全 484 門に対して四通りで撃つ**

第62条が生まれた直接の理由は、変異 **G4(未使用のモジュール大域を足す)が 471 門に対して無音だった**ことである。
新設の静的の門は**まさにこの G4 を捕らえるために建てられた**。
そこで G4 を四通りに書き、**全 484 門を四回走らせた**(複製に対して / 毎回 sha256 で復元を証明)。

```
$ node g4ghost.js
G4  let __recCount = 0;            (design’s own form)
    Paradise self-test: 479 passed, 4 failed, 1 skipped
    static gate: ✗ gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない (D-L / 第62条 c)
G4g globalThis.__recCount = 0;     (my form)
    Paradise self-test: 480 passed, 3 failed, 1 skipped
    static gate: ✓ gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない (D-L / 第62条 c)
G4m module.exports.__recCount = 0; (my form)
    Paradise self-test: 480 passed, 3 failed, 1 skipped
    static gate: ✓ gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない (D-L / 第62条 c)
G4c class C { static n = 0; }      (my form)
    Paradise self-test: 480 passed, 3 failed, 1 skipped
    static gate: ✓ gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない (D-L / 第62条 c)
restored sha match = true
```

**これが本審査で最も重い一枚である。**

- **設計者自身の形(`let`)だけが捕まる。** 480→479 passed、赤が一本増える。
- **私の三つの形は、`let` と意味が同一でありながら全 484 門が完全に無音**である
  (480 passed / 3 failed = 基準線と完全一致)。
- G4 は**未使用の大域**なので振る舞いの門は元々鳴らない —— それが第62条の出発点だった。
  **静的の門は「振る舞いが届かない層を補う」ために建てられ、その唯一の目的に対して 3/4 で失敗した。**

**第62条の本文は「無音率は次の走行で測り直される」と書いている。**
G4 の層に限って測れば、**無音率は 471 門時代の 100%(1/1)から、484 門時代の 75%(3/4)にしか下がっていない。**
条を足したという主張は、**この数では証明されていない**(第38条)。


#### A44 — ghost が本当に有害であることを証明する(第16条: 主張ではなく測定)

`globalThis.__foldMemo` に畳みの結果を貯める形を `gauge.js` に植え、
**呼び出しを跨いで古い台帳を返すか**を実測した。

```
$ node harm2.js
[CLEAN]
  call1 = 1 rows [a]
  call2 = 2 rows [a,b]  file on disk = 2 rows
  STALE READ (real defect) = false
both halves applied: true
syntax check: ok
[GHOST-mutated]
  call1 = 1 rows [a]
  call2 = 1 rows [a]  file on disk = 2 rows      <== ファイルに 2 行あるのに 1 行しか返さない
  STALE READ (real defect) = true
restored sha match = true
```

**これは D-6 の門(「呼び出しを跨いで状態を持たない」)が禁じた病そのもの**である。

#### A42/A43 — 対照実験: 同じ害、`let` なら赤、`globalThis` なら緑

害の在る形で全 484 門を三回走らせた(**すべて複製に対して**)。

```
######## BASELINE (無変異) ########
MODE=baseline  exit=1   Paradise self-test: 480 passed, 3 failed, 1 skipped
static gate:   ✓ gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない (D-L / 第62条 c)
   ✗ D-3(故障注入): report にパスを渡すと total=0 になり、防御が spawn=null を返す
   ✗ D-3(故障注入): 防御が無ければ矛盾が 0 件に化ける — その差を数で示す
   ✗ dashboard-count 系: dashboard-run-panel が緑 (G-01/02/04/06)
   ✗ 第52条: 環を回すことは仕事ではない — 統治は序列の外にある
   ✗ B-10 [逆]: 本物の倉では今まで通り裁く …
   ✗ B-12b [HIGH-1・実物]: 本物の倉でも根と子を取り違えない
   ✗ abandoned-run: 見捨てられた走行と迷子の走行帳の門が緑 (第53条)
      (↑ 複製の既定赤 7 本。偽の兄弟倉/git 履歴の欠落による。以下の比較はこれを基準線とする)

######## GHOST (globalThis.__foldMemo — 害あり) ########
mutation applied: true | anchor preserved: true
MODE=ghost  exit=1   Paradise self-test: 480 passed, 3 failed, 1 skipped
static gate:   ✓ gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない (D-L / 第62条 c)
failing gates: (基準線の 7 本と完全一致 — 新たな赤ゼロ)

######## VISIBLE (let __foldMemo2 — 同じ害) ########
MODE=visible  exit=1   Paradise self-test: 479 passed, 4 failed, 1 skipped
static gate:   ✗ gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない (D-L / 第62条 c)
   ✗ gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない (D-L / 第62条 c)   <== +1 本
```

**`let` と書けば赤。`globalThis` と書けば緑。害は同一。**
これが第62条(c)が言う「射程の外」であり、**条文はこれを「次の走行の残債」と名乗れと命じている**。
`SM-L` として残債は名乗られているが、**その内容は「hermetic.js を射程に入れる」であって、
「字句の抜け道」ではない。** 残債の名が、私が測った穴を指していない。

> **註**: 害の在る ghost を全走させたところ、**gauge 節の門が大量に赤くなった**
> (`readLedger({raw:true}) は本当に生の全行を返す` など 15 本)。
> **振る舞いの門は ghost を捕らえている。** ゆえにこれは「静的の門だけが騙される」であって、
> 「楽園全体が騙される」ではない。**静的の門は保険であって、唯一の壁ではない。**
> だが第62条(c)は「**振る舞いの門が届かない層を補うため**に静的の門を建てる」と言っている ——
> **その目的に照らすと、届かない層こそが抜けている。**

---

### 2-5. 供給鎖と秘密

#### A54 — 新規依存ゼロ(受容)

```
$ git diff -U0 | grep "^+" | grep "require(" | wc -l
8
$ git diff -U0 | grep "^+" | grep "require("
+const REAL_LEDGER = path.join(require(WORKSPACE_JS).resolve().root, 'gauge-ledger.jsonl');
+  ? require('crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex') : null);
+  const H = require(HERMETIC_JS);
+      "const fs = require('fs');",
+      'const g = require(process.argv[2]);',
+      "const { spawn } = require('child_process');",
+      ['-e', 'console.log(require(process.argv[1]).readLedger().length)', GAUGE_JS],
+  const trace = require(SPAWN_TRACE_JS);
```

8 本すべてが **Node 標準(`crypto` / `fs` / `child_process`)かリポジトリ内のファイル**である。
`package.json` は差分に無く、`node_modules` は空(依存ゼロのリポジトリ)。**新規依存ゼロ。**

#### A55 — 秘密・鍵・個人情報の混入は無い

差分 + 未追跡の走行記録 6 枚(計 339,184 B)を撃った。

```
$ grep -nEi "(api[_-]?key|secret|token|passwd|password|BEGIN [A-Z ]*PRIVATE KEY|ghp_|github_pat_|
             sk-[A-Za-z0-9]{20,}|xox[bap]-|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|
             Bearer [A-Za-z0-9._-]{20,})" fulldiff.txt
1257:      "No secrets in code; security is reviewed, never assumed."
3755:      "No secrets in code; security is reviewed, never assumed."

$ grep -nE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}" fulldiff.txt | grep -v "a@b"
(出力なし)

$ grep -c "C:/Users/kikus\|C:\\Users\\kikus" fulldiff.txt
21
```

**混入なし。** 2 件の hit は critic の検査項目の**文言そのもの**(「コードに秘密を置くな」)であり、秘密ではない。
メールアドレスは `a@b`(テストの固定値)のみ。
`C:/Users/kikus` は 21 箇所あるが、**これは走行記録の中の道であって、追跡されるファイルの差分ではない**
(`git diff` 側にはユーザ名は入っていない)。ただし `reform/silent-mutations/*.md` は
**commit されれば公開リポジトリにホームパスが載る** —— §5 に申し送る。

#### A46 / A50 — 【軽微】番兵が印字する sha256 は「漏洩」と呼ぶには弱いが、無害でもない

```
$ wc -c paradise-creations/gauge-ledger.jsonl
2034
$ node -e "..."
rows: 7
key set: ["ts","slug","scale","metrics"]
slugs: coin, habit, reform-eval-gauge, reform-eval-gauge, tenbin, reform-claude-md-diet, gate-filter
```

**判定: 漏洩ではない。ただし前像は総当り可能である。**

- 出るのは**違反したときだけ**(`gauge.js:3533` の一箇所)であり、常時は出ない。
- sha256 は一方向であり、digest から中身は復元できない —— **理論上は。**
- だが **前像は 2034 バイト・7 行・鍵は 4 つ・slug 名は README と KG に公開されている**。
  `ts` はミリ秒まで在るが、**走行の日付が分かれば探索空間は小さい**。
  総当りが現実的である以上、**「sha256 だから安全」という理由は成り立たない**。
- 実害が低いのは **暗号の強さではなく、台帳に秘密が無いから**である。
  台帳の中身が公開情報(走行の点数)だから無害なのであって、
  **「digest なら何を出してもよい」という一般則は導けない**。

---

### 2-6. 第62条が開けた窓(設計上の危険)

#### A47 — 【重大】条文が「門が現物に触れる」を正当化してしまった

第62条(b)の文言:

> (b) **不可侵を主張ではなく測定にせよ。** 「この門は現物を汚さない」は設計の意図であって
> 証拠ではない。**汚していないことを、走行のたびに数で示せ** —— 現物の指紋を前後で照合し、
> 食い違えば**どの門が汚したかを名指して**倒れよ。

この命令は正しい。だが**実装は「指紋を取るために現物を読む」という形しか持てなかった**。
結果として憲法が、**門が本番の現物を読む経路を恒久的に祝福した**。

これは第30条(「住所を知るのは `workspace.js` だけ」)と**緊張する**。
今日、`tests/paradise.test.js` は `workspace.js` を通して住所を得ており、第30条は形式的には守られている。
だが**規律としての第30条の趣旨**は「門は仮倉としか話すな」であり、
番兵は**その趣旨を、条文の名の下に破る**。

**具体的な危険の形**:

1. **次の門が同じ理屈を使う。** 「第62条(b)に従って現物を測る」という一行で、
   どんな門も本番の成果物を読む正当性を得る。**読むだけなら安全という前提は A4 が壊した** ——
   `readFileSync` は `EISDIR` / `EACCES` / `ELOOP` で**投げる**。読むことは副作用を持つ。
2. **測定の代が門の数に比例する。** 今回は sha256 一つで済んだが、
   次の門が「現物の JSON を parse して検める」形を選べば、代は一気に膨らむ(A1-A3 の道)。
3. **測るために読んだ現物が、測る側の状態になる。** `REAL_DIGEST` は**モジュール大域である** ——
   皮肉なことに、**第62条(c) が `gauge.js` に禁じた「呼び出しを跨ぐ可変でない大域」を、
   第62条(b) の実装が自分自身に導入した**。`REAL_DIGEST` は `const` なので(c)の字句には掛からないが、
   **「一度測った値を走行の終わりまで信じる」という性質そのものが A7/A9 の穴の根**である。

**名指し**: 第62条(b)は「指紋を前後で照合せよ」としか言っていない。
**「いつ」「どの粒度で」「不在と不能をどう分けるか」「誰が汚したかをどう名指すか」を言っていない。**
実装はその四つすべてで最も弱い選択をした(一度だけ / 節の中だけ / 分けない / 名指さない)。
**条文が緩いので、実装の弱さが条文違反にならない。** これが最も危険な形である。

#### A48 — 【重大】条文が要求した「名指し」が実装されていない

第62条(b): 「食い違えば**どの門が汚したかを名指して**倒れよ」

```
$ grep -n "function withGaugeSandbox" tests/paradise.test.js
3503:function withGaugeSandbox(fn) {         <== 門の名前を受け取る引数が無い

$ sed -n '3531,3537p' tests/paradise.test.js
      const verdict9 = sentinelVerdict(bodyThrew, REAL_DIGEST, after);
      if (verdict9 !== 'ok') {
        const msg = '実台帳が書き換えられた — 門は仮倉としか話してはならない (D-A / 第30条 / 第62条 b): '
          + `before=${REAL_DIGEST} after=${after}`;      <== 名前が無い。digest しか無い
```

**A49 の出力がその帰結である** —— 6 本の門が同じ文面で倒れ、**誰も真犯人ではない**。
第62条(b)が命じた機能が無いまま、条文だけが憲法に入った。
これは第44条(「鳴らない門は飾り」)の変種である: **守られない条文は飾りである。**

---

## 3. 見つけた欠陥

### 【致命】S-1 — 実台帳がディレクトリ/読めない物なら、484 門すべてが一本も走らない

- **場所**: `tests/paradise.test.js:3468-3470`(`ledgerDigest` / `REAL_DIGEST`)
- **病理**: `existsSync` が真でも `readFileSync` は投げる。
  `REAL_DIGEST` は節のトップレベルで計られるので、例外は**モジュールの読み込みを殺す**。
  `exists`(在るか)と `readable`(読めるか)を同じ言葉にした —— `workspace.js` の欠陥B と同型。
- **再現**:
  ```bash
  rm -f <creations>/gauge-ledger.jsonl && mkdir <creations>/gauge-ledger.jsonl
  node tests/paradise.test.js          # → EISDIR で即死。一門も走らない。exit 1
  ```
- **効き方**: 走行の**全滅**。CI では「赤」と出るが、**何が赤なのかは誰にも分からない**。
  `EACCES` / `ELOOP` / `ENAMETOOLONG` も同じ。
- **修理の方向(実装は触っていない)**: `ledgerDigest` を `try/catch` で包み、
  **`null`(不在)と `undefined`/`'unreadable'`(不能)を別の値にする**。
  第37条が「不在は通過ではない」と言うなら、**不能も通過ではない**。
  そして不能は**skip ではなく赤**であるべきである —— 実台帳が読めない機は異常である。

### 【致命】S-2 — 番兵を永久 skip に固定でき、以後どれだけ実台帳を汚しても緑

- **場所**: `tests/paradise.test.js:3470` / `:3523`(`if (REAL_DIGEST === null)`)
- **病理**: 判定が**節の読み込みの一瞬の観測**に固定される。
  その一瞬に台帳を隠せば、走行のあいだ番兵は永久に無力。
  `sentinelSkipNote()` は**理由を「兄弟倉が無い機」と断定する**が、神の機械ではそれは嘘である。
- **再現**: §2-1 A7。実台帳を `unlink` → 2.5 秒待つ → 戻す → 汚す。
  実測 `122 green / 0 red` かつ `POISON row present in REAL ledger = true`。
- **効き方**: **本走行が塞ごうとした W1 と同型の素通り**。番兵の存在意義そのものを無効化する。
- **修理の方向**: (a) `REAL_DIGEST === null` のとき**その場で `existsSync` を測り直す** ——
  走行の途中で台帳が現れたなら、それは「兄弟倉が無い機」ではない。
  (b) 不在を skip にしてよい条件を **`workspace.js` の `source`** で判定する
  (`source==='sibling'` かつ倉自体が無い ⇒ CI。倉は在るのにファイルだけ無い ⇒ **異常。赤**)。
  今日の実装は**倉の有無を見ずにファイルの有無だけを見ている**。

### 【致命】S-3 — 無実の門を名指す偽の赤。悪意も競合も要らない

- **場所**: `tests/paradise.test.js:3503`(引数に門の名が無い)/ `:3533-3534`(文面に名が無い)
- **病理**: `REAL_DIGEST` が t=0 に固定されているので、**一度汚れたら以降の全門が同じ差分を見る**。
  全員が「実台帳が書き換えられた」と名乗り、**真犯人と無実が区別できない**。
- **再現**: §2-1 A49。**開発者が別端末で `gauge.js record` を走らせるだけ**。
  実測: 無実の門 6 本が赤。`before=955ea…` `after=2bd6c…` が 6 本に同一表示。
- **効き方**: 第62条(b)が明文で要求した「名指し」が無い。
  そして**偽の赤は真の赤より有害である** —— 人は偽の赤を学習し、次の真の赤を無視する(R-2 の教訓)。
- **修理の方向**: `withGaugeSandbox(label, fn)` に門の名を渡す。
  かつ **`REAL_DIGEST` を `let` にして、番兵が鳴った後に現在値へ更新する** ——
  そうすれば二本目以降は「私は汚していない」と正しく言える。
  (ただし `REAL_DIGEST` を可変にすることは、第62条(c)が禁じる形に**門自身が**近づく。
   この緊張こそ A47 で名指した設計の窓である。)

### 【重大】S-4 — `exit 2` の台帳が `healable:true` を名乗る

- **場所**: `graph/gauge.js:943-945`
- **病理**: `healable = (conflicts.length === 0)` だが、
  **`conflicts` に載らずに exit 2 を出す道**が在る(`metrics` が非オブジェクトの行)。
- **再現**: 台帳に `{"ts":"2026-09-01T00:00:00.000Z","slug":"S","scale":"standard","metrics":"x"}`。
  `node graph/gauge.js ledger --audit --json` → `exit=2` かつ `"healable":true`。
- **効き方**: 今日は読み手ゼロ。明日 `healable` で自動掃除を組んだ者が**人の目が要る台帳を機械に掛ける**。
- **修理の方向**: `healable` を `conflicts.length` ではなく **exit code を決める同じ式**から導く
  (第48条: 同じ問いに二つの答えを持たない)。
  今の実装は `human` と `healable` で**同じ問いに二つの答え**を持っている。

### 【重大】S-5 — `--json` が台帳の生バイトを 200 文字吐く(`{...a}` の無検査展開)

- **場所**: `graph/gauge.js:945`(`JSON.stringify({ ...a, healable })`)
- **病理**: `a.conflicts[].line` は破損行の生の中身 200 文字。人向けの出力は 60 文字で切っているのに、
  **機械向けの新設の出口は切っていない。**
- **再現**: §2-2 A24。`sk-live-ABCDEF0123456789` が `--json` にそのまま出た。
- **効き方**: 台帳に秘密を置く設計ではないので今日の実害は低い。
  だが**展開は列挙ではない** —— `auditLedger` に将来フィールドが増えれば自動的に外へ出る。
- **修理の方向**: 出す欄を**明示的に列挙**する。`line` は人向けと同じ 60 文字に切る。

### 【重大】S-6 — 静的の門は 9/15 の形で騙せる。G8 の等価形 5 本すべてが不可視

- **場所**: `tests/paradise.test.js:3645-3694`(`mutableGlobals`)
- **病理**: 「最上位の**名前**」を起点に探すので、**名前を作らない状態**(`globalThis` /
  `module.exports` / `require.cache` / `class static` / `process.env` / 動的 require)が全部抜ける。
  加えて **`let { a, b } = …`(分割代入)** は紛れもない最上位の `let` だが正規表現が当たらない。
- **再現**: §2-4。対照実験 —— **同じ害を `let` で書けば赤、`globalThis` で書けば緑**。
  **決め手は A45**: 第62条が生まれた元凶 **G4 そのもの**を四通りで撃ち、
  **設計者の形(`let`)だけが捕まり、私の三形(`globalThis` / `module.exports` / `class static`)は
  全 484 門が完全に無音**だった(480 passed / 3 failed = 基準線と完全一致)。
  **門が建てられた唯一の目的に対して 3/4 で失敗している。**
- **効き方**: 振る舞いの門が同じ変異を捕らえたので**楽園全体は守られている**。
  だが第62条(c)は「振る舞いが届かない層を補う」ためにこの門を建てた ——
  **その目的に対しては、届かない層こそが穴である。**
- **修理の方向**: **射程を名指しで狭く切る**のは正しい(第44条(c))。
  だが**「見ていない形」も名指しで列挙すべき**である。
  今の残債 `SM-L` は「hermetic.js を射程に入れる」としか言っておらず、
  **私が測った 9 つの抜け道を指していない。**

### 【重大】S-7 — 第62条(b)は「いつ/どの粒度で/不在と不能の別/誰が汚したか」を言っていない

- **場所**: `CONSTITUTION.md` 第62条(b)
- **病理**: 条文が緩いので、実装が四つすべてで最弱の選択(一度だけ/節の中だけ/分けない/名指さない)をしても
  **条文違反にならない**。S-1/S-2/S-3 はすべてこの緩さの子である。
- **効き方**: 今後の門が「第62条(b)に従う」の一行で本番の現物を読む正当性を得る。
  **読むことは副作用を持つ**(A4 が実証)。
- **修理の方向**: 条文に最低限の要求を書く —— 「不在と**不能**を分けよ」「汚した門を**名で**呼べ」
  「前後の『前』は**その門の直前**であって走行の開始ではない」。

### 【重大】S-8 — `rows` が嘘をつく。101 行のファイルを `rows=1` と答える

- **場所**: `graph/gauge.js`(`readLedger` が `metrics` 無しの行を落とす道)
- **病理**: 前任 F-2 は `JSON.parse` に失敗する行を塞いだが、
  **parse に成功して `metrics` を持たない行**は今も静かに消える。`healable:true` はこの上に建つ。
- **再現**: §2-2 A13。`metrics` を持たない行 100 本 + 健全 1 行 → `rows=1 / healable:true / exit 0`。
- **註**: これは **main 由来**であり本改修が作った病ではない。
  だが **`healable` を足したことで「健全である」という主張が一段強くなった** ——
  改修がこの古い穴の上に新しい看板を立てた。

### 【軽微】S-9 — AC-13 の子プロセスにタイムアウトが無い

- **場所**: `tests/paradise.test.js:6459-6460`
- **再現**: §2-3 A26/A27。同じファイルの `:1869` / `:1920` は 30 秒を持っており、作法が不一致。
- **効き方**: `record` が返らない日に CI が無限に吊る。**今日は起きていない。**

### 【軽微】S-10 — 番兵の代は台帳の大きさに線形。縮む道が無い

- **再現**: §2-1 A1-A3。1.17GB で 12s→68.5s、峰の常駐 2.42GB。
- **効き方**: 今日 2KB なので実害ゼロ。だが台帳は**追記のみで育ち**、掃除(FR-8)は**存在しない**。
- **修理の方向**: `createReadStream` で流して hash する(峰の常駐が定数になる)。
  あるいは `mtime + size` を先に見て、変わっていなければ digest を省く。

### 【軽微】S-11 — 印字される sha256 の前像は総当り可能

- §2-5 A46/A50。**漏洩ではない**が、「digest だから安全」という理由は成り立たない。
  無害なのは**台帳の中身が公開情報だから**である。

### 【好み】S-12 — `sentinelSkipNote()` が skip の理由を断定している

- 「兄弟倉は楽園の倉に付いてこない」は **CI の事情の断定**である。
  神の機械で skip が出たときも同じ文が出る —— **そのときそれは嘘である**(S-2 の攻撃を隠す文面でもある)。
- 第16条の精神に照らすなら「**なぜ無いのかは測っていない**」と名乗るべきである。

### 【好み】S-13 — 走行記録にホームパスが 21 箇所

- `reform/silent-mutations/*.md` に `C:/Users/kikus/...` が 21 箇所。
  追跡ファイルの差分には無い。公開リポジトリに commit されるなら**ユーザ名が載る**。

---

## 4. **私が見ていないこと**(第16条 —— 本報告で最も重要な節)

以下は**私が撃たなかった/撃てなかった/測り損ねた**ものである。
「出なかった」ではなく「**見ていない**」と読め。

### 4-1. 測定の土台そのものの疑い

- **U-1: 複製の基準線に既定の赤が 7 本ある。** 対照実験(A42/A43)はこの 7 本を基準線として
  「新たな赤の増減」で判定した。**7 本の赤が私の変異の影響を隠していないことを証明していない。**
  特に `B-10 [逆]: 本物の倉では…` と `B-12b [HIGH-1・実物]` は**倉を見る門**であり、
  私が偽の兄弟倉を使っている以上、**この二本は私の実験環境で常に嘘をついている**。
- **U-2: 私の複製は `git` の履歴を持たない。** `cp -r` で作ったので `.git` は在るが
  作業木の状態が本物と違う可能性がある。`abandoned-run` / `第52条` の赤はそれ由来だと**推測した**が、
  **確かめていない。**
- **U-3: 全 484 門の走行を、素の本物の作業木に対して一度も走らせていない。**
  CONTEXT の「三本とも 484 passed / 0 failed」を**信じた**。自分で撃っていない。
  ゆえに **「私の複製の 7 本の赤」が複製由来なのか改修由来なのかを切り分けていない。**
  これは本報告の**最大の穴**である。
- **U-4: 時間の計測はすべて一回である。** A1/A3 の「12s→68.5s」は各 1 試行。
  分散を測っていないので、**5.7 倍という数字の信頼区間を私は知らない。**

### 4-2. 番兵について見ていないこと

- **U-5: POSIX(CI が実際に走る機械)で一度も撃っていない。** すべて Windows 11 / git-bash。
  - `EISDIR`(A4)は Linux でも同じはずだが**確かめていない**。
  - **ゾンビの不在(A28)は Windows の job object に依存する結論である。**
    Linux の CI では駆動子が死んでも孫が `init` に引き取られて**残りうる**。
    **AC-13 のプロセス漏れは、CI では私の結論と逆になる可能性が高い。**
  - `symlink`(A53)は Windows で `EPERM` だったのでハードリンクで代替した。
    **真の symlink / `ELOOP`(リンクの環)/ `/proc` 系の特殊ファイルは撃っていない。**
- **U-6: `EACCES`(権限剥奪)を実測していない。** ディレクトリ差し替え(EISDIR)で
  同じ道を通ることを示したが、**Windows の ACL で読み取りを剥ぐ実験はしていない**。
  管理者権限が要り、複製の環境を壊す恐れがあったので避けた。
- **U-7: `REAL_DIGEST` が `null` になる道を全部数えていない。**
  私は `unlink` だけを撃った。**名前の変更 / 親ディレクトリの移動 / ネットワークドライブの切断 /
  ウイルス対策ソフトの一時ロック** も同じ窓を開けるはずだが、測っていない。
  特に **ウイルス対策ソフトによる一瞬のロックは、Windows では日常的に起きる** ——
  つまり **S-2 は攻撃者を必要としない可能性がある。これは撃っていない。**
- **U-8: 番兵が `warn` を返す道(`bodyThrew && dirty`)を実環境で一度も発生させていない。**
  `sentinelVerdict` の単体としては門が撃っているが、
  **`withGaugeSandbox` の中で本体が投げ、かつ実台帳が汚れる**という複合状況は作っていない。
  この道は `console.error` するだけで**例外を投げない** ——
  つまり **本体が投げる門の中でなら、実台帳を汚しても走行は止まらない。**
  攻撃として成立するかは**測っていない**が、形は危うい。
- **U-9: 番兵が仮倉の掃除(`fs.rmSync`)の**後**に走ることの意味を追っていない。**
  `rmSync` が失敗を握り潰す(`catch {}`)ので、**仮倉が残ったまま番兵が緑を出す道**が在る。
  仮倉の残骸が次の門に影響するかは**見ていない**。
- **U-10: 番兵の 80 回という数を、門の一覧と突き合わせていない。**
  「404 門が見られていない」と書いたが、**そのうち何本が実台帳に触りうる門なのか**は数えていない。
  節外の 3 箇所(`:3337` / `:7932` / `:8343`)を名指したが、**それらが実際に何をするかは読んでいない。**

### 4-3. `healable` / `--audit` について見ていないこと

- **U-11: `auditLedger` の全分岐を撃っていない。** `too-deep` と `preemption-suspect` は
  **一度も自分で作っていない**(前任が撃った層なので避けた)。
  ゆえに **`too-deep` だけの台帳で `healable` がどう出るかを私は知らない。**
  `human = conflicts.length` に載るはずだが、**確かめていない。**
- **U-12: `duplicates > 0` かつ `conflicts > 0` の複合を撃っていない。**
  🧹 の行と 🔴 の行が**同時に出るか**、出るならどちらが先かは見ていない。
  `process.exit(2)` が 🧹 の行より**前**に在るので(`gauge.js:946-948`)、
  **🧹 は人の手が要る台帳では絶対に出ない** —— これは意図だと読んだが、**門で確かめていない。**
- **U-13: `--json` と `--audit` を**同時に**指定しない道を撃っていない。**
  `--json` 単独(`ledger --json`)が何を出すかは見ていない。
- **U-14: `healable` を読む下流が「今日は居ない」ことを grep で確かめたが、
  `dashboard/` の生成物や `overlay/` は読んでいない。** JS 以外の経路(シェル、cron、
  `~/.claude` のコマンド定義)は撃っていない。
- **U-15: 出力の順序を攻撃していない。** `--json` の行は `exit(2)` の**前**に出るので
  機械は読めるはずだが、**stdout がパイプで閉じられたとき(EPIPE)に何が起きるか**は見ていない。

### 4-4. 静的の門について見ていないこと

- **U-16: 私は 15 の形しか発明していない。** `Symbol` を鍵にした大域 / `WeakMap` /
  `AsyncLocalStorage` / `Error.prepareStackTrace` / プロトタイプ改変 / `Function('return this')()` /
  `vm` モジュール / top-level `await` を使った遅延初期化 —— **どれも撃っていない。**
  9/15 という比率は**私の想像力の限界**であって、抜け道の総数ではない。
- **U-17: 偽の赤の側をほとんど撃っていない。** 門が**正しいコードを罪と呼ぶ**形を
  私はほぼ探していない(A29 の `ok.js` / `trap.js` は既存の門の中の話)。
  正規表現 `(?<![.\w$])NAME\s*=(?!=)` は **`a === b` の左辺**や**分割代入の既定値**に
  当たりうるはずだが、**確かめていない。**
- **U-18: 射程の二本(`gauge.js` / `spawn-trace.js`)以外は一切見ていない。**
  `conclave.js` / `kg.js` / `forge.js` は台帳に準ずる状態を持つが、**門の射程外であり私も撃っていない。**
- **U-19: `topLevelDepths` の深さ計算そのものを攻撃していない。**
  文字列の中の括弧は `shadow` が潰すはずだが、**テンプレートリテラルの入れ子(`` `${`${x}`}` ``)や
  正規表現中の括弧**で深さがずれるかは測っていない。ずれれば**最上位が最上位でなくなる**。
- **U-20: `hermetic.js` の `shadow` / `bindingsOf` / `functionsOf` を借りていることの危険を測っていない。**
  第48条に従った正しい設計だが、**`hermetic.js` が変われば静的の門の意味が黙って変わる**。
  その結合を**誰も門にしていない**(`hermetic.js` の変更で静的の門が壊れることを撃つ門が無い)。
  これは第44条の形の穴だが、**私は実測していない。**

### 4-5. 撃つべきだったが撃たなかった層

- **U-21: `graph/gauge.js` の 8 行以外の差分を、変異で撃っていない。**
  第62条の 39 行と `CONSTITUTION.INDEX.md` の 3 行は**読んだだけ**である。
  `codex.js index --write` の整合(条文のバイト数 3685 が正しいか)は**検算していない**。
- **U-22: `tests/paradise.test.js` の +617 行のうち、私が読んだのは約 300 行である。**
  新設 13 門のうち、**私が中身まで読んだのは 6 本**(番兵 3 / 静的 2 / 並行 1)。
  残り 7 本(`record は台帳を信じる` / `ts が読めない既存行` / `先回りの三つの物差し` /
  `stripped の罰` / `TIER_EPOCH_AT` / `N 回採点の決定性` ほか)は **一行も読んでいない。**
  **そこに穴があっても私は見つけられない。**
- **U-23: 第21条の「壊して鳴らす」を、新設 13 門の**すべて**に対して撃っていない。**
  私が壊したのは静的の門(2 本)と番兵(間接的に)だけである。
  **11 本の新設門は「壊したら鳴るか」を私が確かめていない。** これは prove 相の仕事だが、
  **security の目でも撃つべきだった。**
- **U-24: 供給鎖を `git diff` の範囲でしか見ていない。** 走行記録 6 枚(339KB)は
  秘密 grep で撃ったが、**それらが将来 commit されたときのリポジトリ肥大**(第39条の diet gate)は測っていない。
  `design.md` は 91KB ある。
- **U-25: 私は `--gate gauge` の絞り込み走行を主に使った。** 出力自身が
  「絞り込み走行は門の依存を保証しない。共有状態を前段の門に頼る門は単独走行で偽の赤を出しうる」と
  **警告している**。私の A5/A6/A7/A49 の結果は**すべてこの警告の下にある** ——
  全走で同じ結果が出ることを、**A42/A43 以外では確かめていない。**
- **U-26: 時間帯・同時実行の影響を見ていない。** 私の計測中、この機械では
  他の node プロセスが 10 本前後走っていた(A27 の出力)。
  **CPU の競合が A1-A3 の時間に与えた影響を分離していない。**

### 4-6. 最も正直に言うべきこと

**私は「番兵を永久 skip に固定できた」と書いたが、それは私が用意した環境での話である。**
攻撃者が `paradise-creations` に書き込める前提を置いている。
その前提が成り立つ機械では、**攻撃者は番兵を迂回するまでもなく直接台帳を書ける**。
ゆえに S-2 の真の価値は「攻撃者に対する防御の穴」ではなく、
**「事故(ウイルス対策ソフトのロック、ネットワークドライブの瞬断、同僚の別端末)に対する脆さ」**である。
U-7 で名乗ったとおり、**その事故の側を私は一度も実測していない。**
S-2 を「致命」と呼んだのは**攻撃の再現性**を見てのことだが、
**実際の危険度は私が測っていない事故の頻度に依る。**

---

## 5. verify 相への申し送り

1. **U-3 を最初に潰せ。** 素の作業木で全 484 門を**自分で**走らせ、
   「484 passed / 0 failed」を実測せよ。私は複製でしか走らせておらず、
   **複製には基準線の赤が 7 本ある**。この 7 本が複製由来であることを切り分けるまで、
   本報告の対照実験(A42/A43)の結論は**基準線の上に立っている**。

2. **S-1 は verify で必ず再現せよ。** 一行で全門が死ぬ。
   ```bash
   mkdir <creations>/gauge-ledger.jsonl && node tests/paradise.test.js   # EISDIR で即死
   ```
   これが**CI で起きたら CI が何も検めずに赤くなる**。
   修理するなら「不在」と「不能」を別の値にし、**不能は skip ではなく赤**にせよ。

3. **S-3(偽の赤)を CI の観点で裁け。** 開発者が別端末で `gauge.js record` を走らせる —— 
   これは**日常の営み**である。今の実装では**その瞬間に CI/ローカルの全走が赤くなり、
   無実の門が名指される**。第62条(b)が命じた「名指し」が実装されていないことと合わせ、
   **条文と実装の食い違いとして裁く**べきである。

4. **S-4(`exit 2` かつ `healable:true`)は八行の中の欠陥である。**
   `healable` を `conflicts.length` から導くのをやめ、**exit code を決める式と同じ源から導け**(第48条)。
   再現は一行:
   ```bash
   echo '{"ts":"2026-09-01T00:00:00.000Z","slug":"S","scale":"standard","metrics":"x"}' > <vault>/gauge-ledger.jsonl
   node graph/gauge.js ledger --audit --json   # exit=2 かつ "healable":true
   ```

5. **S-6 の残債 `SM-L` の文面を直せ。** 今の残債は「hermetic.js を射程に入れる」としか言っていない。
   **私が測った 9 つの抜け道**(`globalThis` / `module.exports` / `require.cache` /
   `class static` / `process.env` / 動的 require / `Object.assign` / `eval` / 分割代入 `let`)を
   **名指しで残債に書け**。第62条(c)が「射程の外は次の走行の残債として名を持て」と命じている以上、
   **名を持たない残債は条文違反である**。

6. **U-5 を POSIX で撃て。** 私の Windows での「ゾンビは漏れない」(A28)は
   **job object 由来の結論であり、Linux の CI では逆になりうる**。
   AC-13 のプロセス漏れは**CI の機械で撃ち直す**必要がある。
   S-9(タイムアウト無し)と合わせると、**CI が無限に吊る道**が残っている。

7. **U-22/U-23 を引き受けよ。** 新設 13 門のうち **7 本を私は一行も読んでいない**。
   そして **11 本について「壊したら鳴るか」を撃っていない**。
   第21条が要求する「壊して鳴らす」は、**私の審査では完了していない**。

8. **本報告の性格を誤読するな。** 私は「安全である」とは一度も書いていない。
   撃った 55 本のうち破れたのは 11 本であり、**破れなかった 44 本のうち相当数は
   「私の撃ち方が浅かったから破れなかった」可能性がある**(U-16 が典型)。
   §4 を読まずに §3 だけを読む者は、**この審査を実際より強いものと誤解する**。

---

## 6. 数

| 項目 | 数 |
|---|---:|
| 撃った攻撃 | **55** |
| 見つけた欠陥 | **13**(致命 3 / 重大 5 / 軽微 3 / 好み 2) |
| 番兵を永久 skip に固定できたか | **できた**(A7。実台帳を汚しても 122 green / 0 red) |
| 静的の門を騙せたか | **騙せた**(15 形中 9 形が不可視。G8 等価形は 5/5 不可視。**A45: 条の元凶 G4 を 3/4 の形で全 484 門が無音**) |
| 秘密の混入 | **無し**(差分 + 走行記録 339,184 B を撃って 0 件) |
| 新規依存 | **ゼロ**(追加 require 8 本すべて Node 標準 or リポジトリ内) |
| 実台帳 sha256 | **`955ea34a020bf5681b5607de9ed22abaddc7bc5228cb231dd843c05ba55aab77`**(開始・中間 2 回・終了で一致) |
| 「私が見ていないこと」の項目 | **26**(U-1 〜 U-26) |
