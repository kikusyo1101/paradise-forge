# identity.md — ダッシュボードの**見た目** (design 相 / 第17条)

> **本書は見た目のみを述べる。** 構造は `design.md`、画面と流れは `ux.md` に在る。
> **第17条**: 「Structure lives in `design.md`; appearance lives in `identity.md`;
> **conflating the two names is itself a defect**.」
>
> 第17条(a) が要求するのは 3 つである — **方向を述べること / パレットと書体を述べること /
> どれを退けたかとその理由を述べること**。本書はその 3 つを順に果たす。
> **(d) identity は参照であって依存ではない** — Web フォント 0・CDN 0・取得 0。

- **slug**: `dashboard`
- **採用**: **`wired`**(family: `editorial` / traits: `editorial-serif`, `brutalist`)
- **記録**: `node graph/identity.js record dashboard wired` を実走済み(§6)
- **測定機**: Windows 11 / node v24.14.0。コントラストは WCAG 2.1 相対輝度式を実装して**計算した**(§4)

---

## §1. なぜ視覚同一性を文書で先に決めるのか

第17条は原因を名指ししている ——
「An agent left to choose freely does not choose freely: it falls to the palette it has seen most,
and every creation ends up wearing the same **developer-tool skin**.」

**楽園でこれは既に起きた。** 現行 3 ページは誰も選んでいないのに
**GitHub Primer 肌**(`#0d1117` / `#161b22` / `#3fb950` / `#f85149`)を着ている。
「機械の語彙が狭いから、機械が最も多く見た肌に落ちる」という構造的な事故である。
**ゆえに救済も構造でなければならない** — 先に文書で宣言し、採用を記録し、反復を機械で押し下げる。

---

## §2. 候補 — engine が実際に挙げたもの(実出力)

```
$ node graph/identity.js suggest "楽園のダッシュボード — engineから生きた状態を映す統治の門" --slug dashboard
```

engine が返した規則と回避条件(実出力より):

```json
"avoided": { "recent_ids": ["ferrari", "mastercard"],
             "recent_families": ["finance", "automotive"] },
"rule": "candidates never repeat a family; tech_saas gets at most 1 slot (+40 penalty);
         the last 12 ids and last 2 families are pushed down"
```

| id | family | traits | score | 主要パレット(実出力) |
|---|---|---|---|---|
| `shopify` | consumer_brand | dark-canvas | **0** | primary `#000000` / canvas-night `#000000` / canvas-night-elevated `#0a0a0a` / canvas-light `#ffffff` / canvas-cream `#fbfbf5` / surface-elevated-dark `#1e2c31` |
| `wired` | editorial | editorial-serif, brutalist | **0** | primary `#000000` / ink `#000000` / ink-soft `#1a1a1a` / body `#757575` / hairline `#e0e0e0` / canvas `#ffffff` / canvas-soft `#f5f5f5` / link `#057dbc` |
| `nvidia` | enterprise | (なし) | **2** | primary `#76b900` / ink `#000000` / canvas `#ffffff` / surface-dark `#000000` / hairline `#cccccc` / hairline-strong `#5e5e5e` |

`rejected_head`(engine が押し下げたもの): `uber`(1) / `nike`(4) / `hp`(5) / `meta`(6)。

**採用: `wired`。** 3 候補の中から選んだので、
第17条(a) の但し書き(3 候補以外を選ぶ場合は自分で suggest を走らせて根拠を示せ)には該当しないが、
**上記の suggest は本設計相で自ら実走した実出力である**(教主の引用の写経ではない)。

---

## §3. 採用の理由と、却下の理由

### 3.1 採用: `wired` — **editorial / brutalist**

**理由は 4 つある。すべて「この創造物の職務」から導かれる。**

**(1) このダッシュボードは装飾物ではなく「読み物」である。**
出すものは走行中の環・数の看板・門の合否・矛盾の指摘 —— **すべて事実の陳述**である。
editorial(雑誌)の語彙は「見出し・小見出し・本文・注記・罫」という**情報の階層を明示する道具立て**を持つ。
8 領域(design.md §4.2)を並べたとき、階層を色ではなく**字の大きさと罫**で示せる方向は、
色を状態(ratified / rework / blocked / 矛盾)に**専有させられる**。
**色を階層に使えば、色は状態を語れなくなる。** これが最大の理由である。

**(2) brutalist は「装飾しない」という設計上の制約であり、外部依存ゼロの掟と一致する。**
影・グラデーション・角丸・アイコンフォントを使わない方向は、
CSS だけで完結する(第20条・NFR-02)。**Web フォントも SVG アイコンセットも要らない。**

**(3) `#000000` on `#ffffff` = 21.00:1 という上限の余白。**
editorial の基調は極端な明暗差である。ここから始めれば、
状態色に**濃い色を割り当てても 4.5:1 を割らない**余裕が生まれる(§4 の実測が示す)。
Primer 肌の `#0d1117` / `#161b22` は段差が **1.09:1** しかなく(§4.4 実測)、
**面の区切りに色を使えないので枠線に頼るしかなくなり、その枠線もまた薄い**——構造的に詰む。

**(4) 家族が重複しない。** 直近採用は `mastercard`(finance)/ `ferrari`(automotive)。
`editorial` はどちらとも異なる。第17条(b)「三択が同じ家族から出るのは選択ではない」を満たす。

### 3.2 却下: `nvidia`(enterprise)— **理由: 主色が本文コントラストを満たさない**

```
#76b900 on #ffffff  →  2.41:1   need 4.5   FAIL
#76b900 on #000000  →  8.71:1   need 4.5   PASS
```

**主色が明テーマで使えない。** `2.41:1` は WCAG AA(4.5:1)を大きく割り、
**非テキストの 3:1(1.4.11)すら満たさない** —— 枠線にも状態色にも使えない。
暗テーマでのみ成立する主色は、**両テーマを要求される本件(visual-verify が両方を検査する)で二重管理を生む**。
加えて hairline `#cccccc` は白地で `1.61:1` であり、これも 1.4.11 を満たさない。
**「主色を明テーマで使えない」ことを設計で回避し続けるのは、方向を採用したことにならない。**

### 3.3 却下: `shopify`(consumer_brand)— **理由: 面の段差が測れない**

```
#0a0a0a on #000000  →  1.06:1   need 3.0   FAIL   (canvas-night-elevated / canvas-night)
```

shopify は「near-black canvas + full-bleed 写真 + 極細の巨大見出し」を核とする方向である。
問題は 2 つ:

1. **段差が 1.06:1。** 本件は 8 領域を面で区切る。`#000000` と `#0a0a0a` の段差では
   **領域の境界が見えず、枠線に頼るしかない。** これは Primer 肌が陥ったのと同じ構造である(§4.4)。
2. **核が写真である。** 「full-bleed photography of merchants」を外すと shopify ではなくなるが、
   本件は**外部から画像を取得できない**(第17条(d)・NFR-02)。
   **方向の核を捨てて名前だけ借りるのは、方向を採用したことにならない。**

### 3.4 却下: 現行の GitHub Primer 肌 — **理由: 第17条が名指しで禁じた当のもの**

`#0d1117` / `#161b22` / `#3fb950` / `#f85149`。**使ってはならない。**
第17条の条文が「Paradise's own habit tracker shipped in GitHub Primer dark with **no one having chosen it**」
と、この肌を**違反の実例として名指ししている**。加えて実測:

```
#0d1117 on #161b22  →  1.09:1   need 3.0   FAIL   (canvas と surface の段差)
```

**誰も選んでいない上に、面の段差が測れない。** 却下に二重の根拠がある。

---

## §4. パレット — 役割ごとの色と、**計算したコントラスト比**

### 4.1 計算方法(再現可能な形で示す)

WCAG 2.1 の相対輝度式をそのまま実装した。**「読みやすい」は書かない。数値を出す。**

```js
function lum(hex) {                                    // WCAG 2.1 relative luminance
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) {                                 // (L1 + 0.05) / (L2 + 0.05)
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
```

**基準**: 本文テキスト **4.5:1 以上**(WCAG 1.4.3 AA)/ 非テキスト(枠線・状態色の面)**3:1 以上**(WCAG 1.4.11)。

### 4.2 明テーマ(light)

| 役割 | 16 進 | 用途 |
|---|---|---|
| `--canvas` | `#ffffff` | 最下層の地 |
| `--canvas-soft` | `#f5f5f5` | 領域の地(1 段上げ) |
| `--paper` | `#eae6dd` | run カード等、さらに 1 段上げた面 |
| `--ink` | `#12100e` | 見出し・数値 |
| `--body` | `#595959` | 本文・注記 |
| `--hairline` | `#767676` | 罫・枠線(**非テキスト 3:1 を満たす濃さ**) |
| `--link` | `#1a5fb4` | リンク |
| `--primary` | `#000000` | 主色(バッジ地・強調帯) |
| `--on-primary` | `#ffffff` | 主色の上の字 |
| `--ok` | `#1a6b3c` | ratified / 門が緑 / 生 |
| `--warn` | `#8a4b00` | rework / 遅延 |
| `--bad` | `#b3251e` | blocked / 門が赤 / 停止した run |
| `--contradiction` | `#6b21a8` | **矛盾**(点数満点かつ起動実績なし) |
| `--focus` | `#7a4a00` | 焦点環 |

**明テーマの実測(全ペア)**:

```
ink(明)/canvas                #12100e on #ffffff  18.98:1  need 4.5  PASS
ink(明)/canvas-soft           #12100e on #f5f5f5  17.41:1  need 4.5  PASS
ink/paper(明)                 #12100e on #eae6dd  15.24:1  need 4.5  PASS
body候補A/canvas(明)            #595959 on #ffffff   7.00:1  need 4.5  PASS
body/canvas-soft(明)          #595959 on #f5f5f5   6.42:1  need 4.5  PASS
body/paper(明)                #595959 on #eae6dd   5.62:1  need 4.5  PASS
link(明)/canvas               #1a5fb4 on #ffffff   6.29:1  need 4.5  PASS
link(明)/canvas-soft          #1a5fb4 on #f5f5f5   5.77:1  need 4.5  PASS
link(明)/paper                #1a5fb4 on #eae6dd   5.05:1  need 4.5  PASS
on-primary/primary(明)        #ffffff on #000000  21.00:1  need 4.5  PASS
緑候補A(明)                     #1a6b3c on #ffffff   6.54:1  need 4.5  PASS
緑A/soft(明)                   #1a6b3c on #f5f5f5   6.00:1  need 4.5  PASS
ratified緑(明)/paper           #1a6b3c on #eae6dd   5.25:1  need 4.5  PASS
琥珀候補B(明)                    #8a4b00 on #ffffff   6.80:1  need 4.5  PASS
rework琥珀(明)/paper            #8a4b00 on #eae6dd   5.46:1  need 4.5  PASS
赤候補A(明)                     #b3251e on #ffffff   6.56:1  need 4.5  PASS
赤A/soft(明)                   #b3251e on #f5f5f5   6.02:1  need 4.5  PASS
blocked赤(明)/paper            #b3251e on #eae6dd   5.27:1  need 4.5  PASS
紫候補B(明)                     #6b21a8 on #ffffff   8.72:1  need 4.5  PASS
矛盾紫(明)/paper                 #6b21a8 on #eae6dd   7.00:1  need 4.5  PASS
--- failures: 0
```

**非テキスト(WCAG 1.4.11 / 3:1)**:

```
枠線候補/canvas(明)               #767676 on #ffffff   4.54:1  need 3.0  PASS
枠線/canvas-soft(明)            #767676 on #f5f5f5   4.17:1  need 3.0  PASS
枠線/paper(明)                  #767676 on #eae6dd   3.65:1  need 3.0  PASS
焦点環(明)/canvas                #7a4a00 on #ffffff   7.48:1  need 3.0  PASS
焦点環(明)/canvas-soft           #7a4a00 on #f5f5f5   6.86:1  need 3.0  PASS
焦点環(明)/paper                 #7a4a00 on #eae6dd   6.01:1  need 3.0  PASS
--- failures: 0
```

**最も低い数値は `#767676 on #eae6dd` の 3.65:1**(非テキスト基準 3.0 に対し +0.65 の余裕)。
**本文の最低は `#1a5fb4 on #eae6dd` の 5.05:1**(AA 4.5 に対し +0.55 の余裕)。

### 4.3 暗テーマ(dark)

| 役割 | 16 進 | 用途 |
|---|---|---|
| `--canvas` | `#12100e` | 最下層の地(**純黒にしない**理由は §4.5) |
| `--canvas-soft` | `#1c1a17` | 領域の地 |
| `--paper`(raised) | `#26231e` | run カード等 |
| `--ink` | `#f7f4ee` | 見出し・数値 |
| `--body` | `#b0a99f` | 本文・注記 |
| `--hairline` | `#837b6d` | 罫・枠線 |
| `--link` | `#5fb3e8` | リンク |
| `--primary` | `#f7f4ee` | 主色(明暗を反転させる) |
| `--on-primary` | `#12100e` | 主色の上の字 |
| `--ok` | `#6ec08a` | ratified / 門が緑 / 生 |
| `--warn` | `#e0a83a` | rework / 遅延 |
| `--bad` | `#ef6f62` | blocked / 停止した run |
| `--contradiction` | `#c08ad8` | **矛盾** |
| `--focus` | `#e8c46a` | 焦点環 |

**暗テーマの実測(全ペア)**:

```
ink/canvas(暗)                #f7f4ee on #12100e  17.29:1  need 4.5  PASS
ink/canvas-soft(暗)           #f7f4ee on #1c1a17  15.82:1  need 4.5  PASS
ink/raised(暗)                #f7f4ee on #26231e  14.26:1  need 4.5  PASS
body候補/canvas(暗)             #b0a99f on #12100e   8.16:1  need 4.5  PASS
body/soft(暗)                 #b0a99f on #1c1a17   7.46:1  need 4.5  PASS
body/raised(暗)               #b0a99f on #26231e   6.72:1  need 4.5  PASS
link(暗)                      #5fb3e8 on #12100e   8.23:1  need 4.5  PASS
link/soft(暗)                 #5fb3e8 on #1c1a17   7.52:1  need 4.5  PASS
link(暗)/raised               #5fb3e8 on #26231e   6.78:1  need 4.5  PASS
緑(暗)                         #6ec08a on #12100e   8.65:1  need 4.5  PASS
緑/soft(暗)                    #6ec08a on #1c1a17   7.91:1  need 4.5  PASS
ratified緑(暗)/raised          #6ec08a on #26231e   7.13:1  need 4.5  PASS
琥珀(暗)                        #e0a83a on #12100e   8.89:1  need 4.5  PASS
琥珀/soft(暗)                   #e0a83a on #1c1a17   8.13:1  need 4.5  PASS
rework琥珀(暗)/raised           #e0a83a on #26231e   7.33:1  need 4.5  PASS
赤(暗)                         #ef6f62 on #12100e   6.44:1  need 4.5  PASS
赤/soft(暗)                    #ef6f62 on #1c1a17   5.89:1  need 4.5  PASS
blocked赤(暗)/raised           #ef6f62 on #26231e   5.31:1  need 4.5  PASS
紫(暗)                         #c08ad8 on #12100e   7.11:1  need 4.5  PASS
紫/soft(暗)                    #c08ad8 on #1c1a17   6.51:1  need 4.5  PASS
矛盾紫(暗)/raised                #c08ad8 on #26231e   5.86:1  need 4.5  PASS
--- failures: 0
```

**非テキスト(3:1)**:

```
枠線(暗)/canvas                 #837b6d on #12100e   4.54:1  need 3.0  PASS
枠線(暗)/canvas-soft            #837b6d on #1c1a17   4.15:1  need 3.0  PASS
枠線(暗)/raised                 #837b6d on #26231e   3.74:1  need 3.0  PASS
焦点環(暗)/canvas                #e8c46a on #12100e  11.33:1  need 3.0  PASS
焦点環(暗)/canvas-soft           #e8c46a on #1c1a17  10.36:1  need 3.0  PASS
焦点環(暗)/raised                #e8c46a on #26231e   9.34:1  need 3.0  PASS
--- failures: 0
```

**最も低い数値は `#837b6d on #26231e` の 3.74:1**(非テキスト基準 3.0 に対し +0.74 の余裕)。
**本文の最低は `#ef6f62 on #26231e` の 5.31:1**(AA 4.5 に対し +0.81 の余裕)。

### 4.4 却下した色の実測(なぜ使えないかを数値で示す)

```
nvidia-primary/白             #76b900 on #ffffff   2.41:1  need 4.5  FAIL   ← §3.2
wired-body/canvas-soft       #757575 on #f5f5f5   4.23:1  need 4.5  FAIL   ← §4.5(1)
wired-hairline/白             #e0e0e0 on #ffffff   1.32:1  need 3.0  FAIL   ← §4.5(2)
shopify段差(黒/黒)               #0a0a0a on #000000   1.06:1  need 3.0  FAIL   ← §3.3
Primer段差(参考)                 #0d1117 on #161b22   1.09:1  need 3.0  FAIL   ← §3.4
--- failures: 5
```

### 4.5 wired の原色をそのまま使わなかった箇所と、その理由

**方向は wired だが、**wired が示す 3 色は本件の要求(AA + 1.4.11 + 両テーマ)を満たさない。
**採用とは写経ではない** —— 方向の**核**(極端な明暗差・罫による階層・装飾の排除)を保ち、
測って落ちた色だけを差し替える。

| wired の原色 | 実測 | 差し替え後 | 理由 |
|---|---|---|---|
| `body #757575` | `#f5f5f5` 上で **4.23:1 FAIL** | **`#595959`**(`#f5f5f5` 上 **6.42:1**) | 白地では 4.61:1 で辛うじて通るが、本件は `canvas-soft` `paper` の 2 段の面を使うので**その上で落ちる**。面を持つ設計に合わせて濃くした |
| `hairline #e0e0e0` | 白地で **1.32:1 FAIL** | **`#767676`**(白地 **4.54:1**) | 8 領域を罫で区切る設計(§3.1 の理由 1)では、罫が**構造を伝える非テキスト要素**である。1.4.11 の 3:1 は必須 |
| `link #057dbc` | 白地 **4.50:1**(境界ちょうど) | **`#1a5fb4`**(白地 **6.29:1**) | 4.50 は AA の**境界値**であり、`canvas-soft` `paper` 上では割る。3 面すべてで通る濃さにした |
| `ink #000000` | 21.00:1 PASS | **`#12100e`**(18.98:1) | 純黒はテーマ反転時に「地」と同一値になり、CSS 変数の取り違えを黙って通す。**わずかに温度を持たせて明暗テーマの ink/canvas が偶然一致しない**ようにした。18.98:1 は十分な余剰 |

**暗テーマの canvas を純黒 `#000000` にしなかった理由**:
純黒地に明色を置くとハロー(にじみ)が出て小さな数字が読み取りにくい。
`#12100e` は ink `#f7f4ee` に対し **17.29:1** を保ちつつ、面を 3 段(`#12100e` / `#1c1a17` / `#26231e`)に
分けられる。**段差が測れることが Primer 肌 / shopify の却下理由だったのだから、自分がそれを犯してはならない。**

---

## §5. 書体 — **外部フォント禁止。system font stack のみ**

第17条(d)「The identity is a *reference*, never a dependency — **no web font, no CDN, nothing fetched**」。
加えて NFR-02(外部依存ゼロ)。**`@import` も `<link rel="preconnect">` も書かない。**

```css
:root {
  /* 見出し・本文: editorial の核である serif を、機に在るものだけで組む */
  --font-display:
    "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "MS PMincho",
    Georgia, "Times New Roman", serif;

  /* UI ラベル・バッジ: 和文が主なので sans を別に持つ */
  --font-ui:
    system-ui, -apple-system, "Segoe UI", "Yu Gothic UI", "Hiragino Kaku Gothic ProN",
    "Noto Sans JP", Meiryo, sans-serif;

  /* 数値・時刻・engine 名・パス: 桁が揃うことが要件 */
  --font-mono:
    ui-monospace, "SFMono-Regular", "Cascadia Mono", "Consolas",
    "Liberation Mono", "Menlo", monospace;
}
```

**3 本立てにする理由**:

1. **`--font-display`(明朝/serif)** — editorial の核。見出しと大きな数値に使う。
   本機(Windows)では `Yu Mincho` / `MS PMincho`、macOS では `Hiragino Mincho ProN` が当たる。
   **どこにも当たらなければ `serif` に落ちる** —— それでも「serif である」という方向は保たれる。
2. **`--font-ui`(sans)** — 和文の小さいラベルは明朝だと潰れる。**読めることが美学に優先する**(第18条b)。
3. **`--font-mono`** — **数値の桁が揃わなければ、数の看板は看板にならない。**
   `11/11` と `5/11`、`17/17` を縦に並べたとき、プロポーショナルでは桁がずれて比較できない。
   `ui-monospace` は Web フォントではなく**OS が持つ等幅**を指す標準キーワードである。

**`@font-face` を書かない。** `local()` による退避すら書かない —— 本件で必要な字は
すべて OS が持っており、**書けば「取りに行かない font-face」と「取りに行く font-face」を
人が見分ける負担が生まれる**(それが FR-12 で除去する当の病である)。

**サイズ**: 相対単位(`rem`)のみ。基準 `16px`。最小 `0.8125rem`(13px)——
これ未満を作らない。**小さすぎる字は、コントラストが足りているのに読めない。**

---

## §6. 採用の記録(第17条c — 反復を構造的に防ぐ)

```
$ node graph/identity.js record dashboard wired
{
  "ok": true,
  "recorded": {
    "slug": "dashboard",
    "id": "wired",
    "family": "editorial"
  }
}
exit=0
```

記録後の `history`(実出力・末尾):

```
$ node graph/identity.js history
    {
      "slug": "dashboard",
      "id": "wired",
      "family": "editorial",
      "traits": [
        "editorial-serif",
        "brutalist"
      ],
      "ts": "2026-09-02T08:34:45.275Z"
    }
```

**これで次の創造物の suggest では `wired` と `editorial` が押し下げられる。**
第17条(c)「Repetition is barred by **construction**, not by hope」——
希望ではなく構造で反復を防ぐとは、この 1 行を実際に走らせることである。

---

## §7. 両テーマの定義(visual-verify が両方を検査する)

```css
:root {                    /* 明テーマを既定にする */
  --canvas: #ffffff;  --canvas-soft: #f5f5f5;  --paper: #eae6dd;
  --ink: #12100e;     --body: #595959;         --hairline: #767676;
  --link: #1a5fb4;    --primary: #000000;      --on-primary: #ffffff;
  --ok: #1a6b3c;      --warn: #8a4b00;         --bad: #b3251e;
  --contradiction: #6b21a8;                    --focus: #7a4a00;
}

@media (prefers-color-scheme: dark) {
  :root {
    --canvas: #12100e;  --canvas-soft: #1c1a17;  --paper: #26231e;
    --ink: #f7f4ee;     --body: #b0a99f;         --hairline: #837b6d;
    --link: #5fb3e8;    --primary: #f7f4ee;      --on-primary: #12100e;
    --ok: #6ec08a;      --warn: #e0a83a;         --bad: #ef6f62;
    --contradiction: #c08ad8;                    --focus: #e8c46a;
  }
}

[data-theme="light"] { color-scheme: light; }   /* 手動切替も持つ */
[data-theme="dark"]  { color-scheme: dark;  }
```

**同じ変数名で両テーマを持つ理由**: 画面側のコードが `var(--ok)` としか書かなければ、
**テーマの追加でコードが 1 行も変わらない。** 色をテーマごとに直書きすれば
「暗テーマだけ直し忘れた」が必ず起きる —— それは visual-verify が片方だけ赤にする形の欠陥である。

**`color-scheme` を宣言する理由**: スクロールバー・フォーム部品など
**ブラウザが描く部品の明暗**が地に合う。宣言しないと暗テーマの中に白いスクロールバーが立つ。

---

## §8. 色に頼らないこと(第18条b の要請)

**色は状態の第 2 の手掛かりであって、第 1 ではない。**
`--ok` / `--warn` / `--bad` / `--contradiction` の 4 色は、**必ず文字ラベルを伴う**:

| 状態 | 色 | **併記する語**(色が見えなくても伝わる) |
|---|---|---|
| ratified | `--ok` | `批准` |
| rework | `--warn` | `差戻` |
| blocked / stalled | `--bad` | `停止` |
| 矛盾 | `--contradiction` | `矛盾` |
| 生(SSE) | `--ok` | `生` |
| 凍結 | `--body` | `凍結` |

**理由**: 4 色のうち緑 `#1a6b3c` と赤 `#b3251e` は、第 1 型・第 2 型色覚では近接して見える。
`5.25:1` と `5.27:1` という**ほぼ同じ明度**であることが、その差を色相にしか置いていない証拠である。
**明度で分けようとすれば今度は「重要度の階層」に読めてしまう** —— 停止は暗く、批准は明るく、と。
ゆえに**語で分ける**。語は明度も色相も要らない。

**表示の詳細(どこに何を置くか)は `ux.md` に在る。** 本書が定めたのは「必ず語を伴う」ことだけである。

---

## §9. 本書が見た目だけを述べたことの確認(第17条)

| 本書に**書いた**もの(見た目) | 本書に**書かなかった**もの |
|---|---|
| 採用した方向(`wired`)とその 4 つの理由 | 断面の鍵・型・source → `design.md` §1 |
| 却下した 3 方向(nvidia / shopify / Primer)と**数値による**理由 | サーバ・SSE・fs.watch → `design.md` §2 |
| 役割ごとの 16 進と、全ペアの実測コントラスト比 | 三層の判定条件 → `design.md` §3 |
| system font stack 3 本と、3 本立てにする理由 | 画面遷移・4 状態の中身 → `ux.md` §1/§2 |
| 明暗両テーマの CSS 変数定義 | 焦点環を**どこに**出すか → `ux.md` §6 |
| 色に頼らないための語の併記 | 鮮度を**どう文にするか** → `ux.md` §3 |

**焦点環の色 `#7a4a00` / `#e8c46a` は本書が定めた**(見た目)。
**焦点環をどの要素にどう出すかは `ux.md` §6 が定める**(流れ)。第17条の線はここに引かれる。
