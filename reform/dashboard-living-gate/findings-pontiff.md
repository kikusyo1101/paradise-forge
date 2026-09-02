# 教主の独自実測 — discover 相への補遺

> 神官(market-researcher)の findings.md とは独立に、教主が自ら計測した事実。
> **すべて実コマンドの出力である。** 主張は一つも含まない。

## 1. 第30条の門に穴がある（門は緑を出しながら見逃している）

`workspace.js` の `hardcodedRefs()` は **引用符直後にスラッシュが続く形** `'creations/'`
しか咎めない (graph/workspace.js:112 の正規表現 `/['"`][^'"`]*creations\//`)。

```
$ node graph/workspace.js check
✓ 楽園に創造物の混入なし・住所の直書きなし          ← 緑
exit=0

$ grep -n "'creations'" graph/*.js
graph/census.js:75        return fs.readdirSync(path.join(ROOT, 'creations'), ...)
graph/export-state.js:32  const dir = path.join(ROOT, 'creations');
```

`path.join(ROOT, 'creations')` はスラッシュを含まないので**素通りする**。
結果、神が見る盤面:

```
実在する創造物 (workspace.js が知る住所): coin, habit, pomodoro,
  reform-claude-md-diet, reform-eval-gauge, rps, tenbin, _scratch  = 8件
dashboard/state.json が語る creations                              = 0件
```

**第19条が既に教えた病の再発である** —「在庫を数える門は供給線を証明しない」。
ここでは *形* を見る門が *意味* を見逃した。第30条(住所を知るのは workspace.js だけ)
を機械強制しているつもりで、強制できていなかった。

## 2. 自己診断が 282 秒かかり、census を通すと 120 秒で切られる

```
$ node tests/paradise.test.js         → 282s (267 passed, 1 failed)
$ node graph/census.js                → 120,072ms
  ※ census.js:44 の timeout: 120000 に達して打ち切られている
```

`census.js` は `runTests !== false` のとき**自己診断を丸ごと子プロセスで回す**。
ダッシュボードが数を得るために census を呼べば、**1回の描画に2分かかる**。

他の engine は速い（同一機で実測）:

| engine | 実測 |
|---|---:|
| `clergy.js college` | 58ms |
| `daily-guard.js status` | 73ms |
| `gauge.js ledger` | 56ms |
| `vendor.js verify` | 56ms |
| `derived.js check` | 73ms |
| `check-agents.js` | 71ms |
| `kg.js query` | 54ms |
| **`census.js`** | **120,072ms** |

→ **設計上の含意**: ダッシュボードは census を同期で呼んではならない。
数は「速い群」から取り、テスト数だけは別扱い（キャッシュ or 明示的な再計測）にする。

## 3. 自己診断が現在 1件 落ちている（本改修の前提が赤）

```
✗ atlas: 門は己の残骸で落ちない — 同じ作業場で二度走る (第21条)
  Error: navigation failed: net::ERR_FILE_NOT_FOUND
  at probeMotion (graph/motion-probe.mjs:62)
```

第24条「検めていない土台の上に建てるな」に触れる。**着工前に決着させるべき赤**。

## 4. headless Chrome が漏れている（門が己の残骸を残す）

```
$ powershell -File chrome-audit.ps1
chrome.exe total : 35
  headless       : 3
  archify profile: 6
$ ls $TEMP | grep -c "paradise-test-atlas\|archify-visual"
412
```

一時プロファイルが **412個** 残留。第21条の「己の残骸で落ちない」試験が落ちているのと
同根である可能性が高い。

## 5. 視覚同一性の候補（第17条 — 語彙を広く保つ）

```
$ node graph/identity.js suggest "楽園のダッシュボード — engineから生きた状態を映す統治の門" --slug dashboard
候補:
 - shopify [consumer_brand] score=0  traits=dark-canvas
 - wired   [editorial]      score=0  traits=editorial-serif/brutalist
 - nvidia  [enterprise]     score=2
直近に採った id: ferrari, mastercard / 直近の家族: finance, automotive
規則: 家族は重複させない・tech_saas は最大1枠(+40罰点)
```

**tech_saas 系が候補に一つも出ていない** = 既定の開発者ツール肌から構造的に離れている。
`wired [editorial]` は「統治の門・法と記録」という主題に合致し、
現行3ページの GitHub Primer 肌 (`#0d1117`) から最も遠い。

## 6. CI はダッシュボードをほぼ見ていない

`.github/workflows/tribunal.yml` 全207行のうち、ダッシュボードに触れるのは
`node graph/atlas.js check --scale "$s"` の1行のみ。

```
$ grep -n "atlas\|visual-verify\|dashboard\|motion-probe" .github/workflows/tribunal.yml
133:            node graph/atlas.js check --scale "$s"
```

→ `index.html` / `control.html` は **visual-verify も critic も一度も通っていない**。
第50条が名指しした病:「門が見ていない機能は、壊れても鳴らない」。

## 7. atlas は外部へ電話をかけている

```
$ grep -o 'https\?://[^"'"'"' ]*' dashboard/atlas/*.html | sed 's|.*\(https\?://[^/]*\).*|\1|' | sort | uniq -c
    258 http://www.w3.org          ← SVG名前空間。無害(取得しない)
     12 https://fonts.googleapis.com   ← 実際に取りに行く
      6 https://fonts.gstatic.com      ← 実際に取りに行く
```

出所は取り込んだ描画器のテンプレート:

```
overlay/vendor/archify/assets/template.html:36-41
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono..." media="print" onload="this.media='all'">
  <noscript><link href="...同上..." rel="stylesheet"></noscript>
```

第19条(a)により `overlay/vendor/` は楽園の所有物であり**改変してよい**。
同 template.html:6106-6112 には既に `local('JetBrains Mono')` の @font-face 退避があり、
**取りに行く3行を削るだけで書体は system monospace に落ちる**（設計は既に用意されている）。

## 8. 現行3ページの実測（Chrome/CDP)

| | index.html | control.html | atlas/dag.html |
|---|---|---|---|
| `a[href]` の数 | **0** | **0** | 0 (外部1つのみ) |
| 3秒後の再描画 | なし | なし | なし |
| setInterval/EventSource | 0 | 0 | 0 |
| 高さ @1440px | 1,282px | **12,916px** | 3,103px |
| 高さ @390px | 1,971px | **21,925px** | — |
| データ源 | `window.PARADISE`(固定値) | `window.PARADISE_STATE`(焼込) | 自己完結 |

`control.html` が語る数と現在の乖離:

```
表示: graph nodes 89 / lessons 55 / creations 0   (generated 2026-09-01T13:49)
現在: graph nodes 99 / lessons 65 / creations 8   (export-state.js を今走らせた実測)
```
