# 着工前に検めた土台の赤 (第24条)

> 「検めていない土台の上に建てるな」。刷新に着手する前に、自己診断の赤を実測で追った記録。
> **これは build 相への入力であり、教主が独断で engine を直した記録ではない (第23条)。**

## 症状

```
$ node tests/paradise.test.js
Paradise self-test: 267 passed, 1 failed        ← 2回とも同じ

✗ atlas: 門は己の残骸で落ちない — 同じ作業場で二度走る (第21条)
    Error: navigation failed: net::ERR_FILE_NOT_FOUND
    at probeMotion (graph/motion-probe.mjs:62)
```

## 単独では緑になる — ゆえに環境由来である

```
$ node -e "... atlas.check({scale:'quick', outdir}) を二度 ..."
pass 1 failures: []
pass 2 failures: []
```

**同じテストが単独では二度とも通る。** フル走行のときだけ落ちる = 他のテストが残した何かが原因。

## 残骸の実測

```
$ ls $TEMP | grep -c "archify-visual-check-profile"
483

$ powershell -File chrome-audit.ps1
chrome.exe total : 35
  headless       : 3
  archify profile: 6
  oldest archify : 2026/09/02 16:14:23
```

`taskkill /F /IM chrome.exe /T` を撃った直後に測り直しても **headless 4 / archify profile 10** と増えていた
(門が走り続けているため)。一時プロファイルは **483個** 積み上がっている。

## 根因 — 検器が後始末を半分しかしていない

`graph/motion-probe.mjs:84-86`:

```js
  } finally {
    try { browser.child.kill(); } catch { /* 検器の後始末が本体の裁定を汚さない */ }
  }
```

一方、取り込んだ描画器が用意している正規の後始末 `overlay/vendor/archify/bin/visual-check.mjs:475`:

```js
  async close() {
    this.cdp.failAll(new Error('visual-check finished'));
    if (this.child.exitCode === null && this.child.signalCode === null) {
      this.child.kill('SIGTERM');
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (...) this.child.kill('SIGKILL');   // ← SIGTERM を無視した子を殺す
          resolve();
        }, 1500);
        ...
      });
    }
    try {
      fs.rmSync(this.profileRoot, { recursive: true, force: true });  // ← プロファイルを消す
    } catch { ... }
  }
```

**`motion-probe.mjs` は `close()` を呼ばず `child.kill()` だけを呼んでいる。** ゆえに:

1. SIGTERM を無視した Chrome への **SIGKILL エスカレーションが無い** → プロセスが生き残る
2. **`fs.rmSync(this.profileRoot)` が走らない** → 一時プロファイルが永久に残る (実測483個)
3. 残った Chrome が握ったままのファイルが、次の走行の `file://` 参照を
   `net::ERR_FILE_NOT_FOUND` にする

第50条(d)が既に教えている —「**借り物の作法は借り物の正典に問う**」。
描画器は正しい後始末を `close()` として公開していたのに、検器はそれを使わず自前の半端な
kill を書いた。**用意されている作法を読まずに書いた一行が、門を不定に赤くしていた。**

## build 相への要件 (追跡用)

| # | 要件 | 受入基準(案) |
|---|---|---|
| B-1 | `motion-probe.mjs` の後始末を `browser.close()` に改める | `await browser.close()` が呼ばれていること。`grep -c "child.kill()" graph/motion-probe.mjs` が 0 |
| B-2 | 検器が一時プロファイルを残さない | 検器を1回走らせる前後で `ls $TEMP \| grep -c archify-visual-check-profile` が **増えない** |
| B-3 | フル自己診断が緑で完走する | `node tests/paradise.test.js` が `0 failed` |
| B-4 | 残骸で落ちる門を回帰試験が捕らえる | 既存の第21条テストが、B-1 を戻すと**赤くなる**ことを prove 相で確認する |

**この赤は本改修の対象そのものである** — 「門が見ていない機能は壊れても鳴らない」(第50条)の
双子として、「**門が己の残骸で不定に鳴る**」もまた門の欠陥だからである。
