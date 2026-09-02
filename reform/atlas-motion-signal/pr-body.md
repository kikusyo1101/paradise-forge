## 神の報告

> 作成した図 ダッシュボードの atlas について
> signal の機能が動いていないように見える
> play story が非活性になっている

**そのとき門は6主題すべて緑だった。** 静的検査 9/9、実ブラウザの第一画面も合格。
にもかかわらず図は動かなかった。壊れていたのは図ではなく、**門の視野**である。

## 原因は二つあり、どちらも「図の壊れ」ではなかった

### (a) 動きを一度も名乗っていなかった

版元の正典 (`overlay/vendor/archify/schemas/README.md`) がこう述べている:

> Every `meta` object also accepts `animation: "trace"` for opt-in SVG/CSS motion
> in generated HTML. **Omit it**, or set `"none"`, **for the default static output**.

`SKILL.md:120` も同じ — `meta.animation: "trace"` is **opt-in**。

`atlas.js` は6主題のどれにも `animation` を書いていなかった(実測 0箇所)。
黙れば静止画になるのが仕様なので、描画器は仕様どおり静止画を作り、viewer は
`svg[data-animation="trace"]` を見つけられず `motionGovernor` を `capable:false` にし、
**Live/Still も Signal Flow の走査も Play story もまとめて眠らせていた。**

実測(修正前 `dag.html`):
```
motionCapable  : null       ← data-motion-capable が付かない
svgAnimation   : null       ← "trace" でない
animatedEls    : 0          ← 動く要素がゼロ
governorCapable: false      ← motionGovernor が死んでいる
Play story     : disabled=true / "Story playback unavailable while motion is Still"
```

**押せない釦は壊れた釦ではなく、名乗らなかった代償である。**

### (b) 神の PC はアニメーションを切っている(これは欠陥ではない)

`animation:"trace"` を宣言した後も、神の画面では Play story は非活性のままだった。
実機 Brave (headless ではない) で測ると:

```
実機の判定: {"reduce":true,"noPreference":false}
SPI_GETCLIENTAREAANIMATION = 0   ← Windows の「アニメーションを表示する」が OFF
```

viewer はこれを尊重して Still に落ち、Play story を正しく非活性にする。
**これは viewer の欠陥ではなく利用者の意思の尊重であり、楽園はこれを直さない。**
神の画面で動かしたい場合は Windows の設定
(設定 → アクセシビリティ → 視覚効果 → アニメーション効果) を ON にされたし。

門もまた、測る側の環境設定で健全な図を落とさぬよう reduced-motion を
明示的に降ろしてから (a) だけを裁く。**己の環境を世界の仕様と取り違えた門は、嘘の赤を出す。**

## 直したもの

| ファイル | 変更 |
|---|---|
| `graph/atlas.js` | `buildIr` が全主題に `meta.animation` を課す。静止を選ぶ走行は黙るのではなく `'none'` と断る (`--static`)。宣言は主題ごとの気まぐれにせず**一箇所**に置く |
| `graph/motion-probe.mjs` | **新設**。実ブラウザで動きを測る検器。押し・待ち・章が進んだことまで測る |
| `graph/atlas.js check` | 動きを裁定に加え、動く要素数を表に出す |
| `CONSTITUTION.md` | 第50条 |
| `tests/paradise.test.js` | 回帰4件 |

## 実測 — 主張ではなく出力

### 描き直した6主題すべてに動きが宿った

```
═══ 🗺  ATLAS GATE (第47条) ═══
  ✓ hierarchy   [architecture] 9/9  fits          動 29   734203b
  ✓ conclave    [workflow    ] 9/9  fits          動 26   733704b
  ✓ dispatch    [sequence    ] 9/9  fits          動 16   729204b
  ✓ dag         [architecture] 9/9  scroll(3317px)動 32   736387b
  ✓ run         [lifecycle   ] 9/9  fits          動 13   726120b
  ✓ wiring      [architecture] 9/9  fits          動 59   757113b  standard(最小交差 6)
  ✓ 6 主題すべてが検査に通る
```

全主題で `motionCapable=true` / `svgAnimation=trace` / `governorCapable=true`、
Play story は `disabled=false`。

### 「押せる」で満足せず、実際に再生が進むことを測った

```
dag.html
  押す前 : {"playing":"false","storyPlaying":null,"activeView":"all"}
  押した後: {"playing":"true","storyPlaying":"true","activeView":"gates",
            "beat":"Beat 01 / 05 · discover · starting point"}
  3秒後  : {"activeView":"gates","count":"1 / 2",
            "beat":"Beat 04 / 05 · verify → reflect"}
```

章が `all → gates` へ遷移し、Beat が 01/05 → 04/05 へ進んだ。
`wiring` `run` でも同様に実測(01/04→04/04、01/05→04/05)。

### 門を壊して鳴ることを確かめた (第23条b)

`animation` の宣言を奪うと、**静的検査は 9/9 のまま緑**であるにもかかわらず:

```
🔴 conclave    [workflow    ] 9/9  fits          静止     732704b
      motionGovernor が capable でない — meta.animation:"trace" を名乗っていない疑い /
      動く要素が 0 個 — 描画器は静止画を作っている /
      svg[data-animation] が "null" — "trace" でなければ Live/Signal Flow/Play story は全て眠る
  🔴 図が壊れている — 楽園は己の姿を語れない     exit=1
```

6主題すべてで鳴り exit 1。**神が遭遇した「全部緑なのに動かない」を、今度は門が捕まえる。**
仕掛けは走行後に外し、`grep PARADISE_BREAK_MOTION` = 0 で残骸の無いことを確認済み。

### 自己診断

```
Paradise self-test: 268 passed, 0 failed
  ✓ atlas: 全ての主題が動きを名乗る — 黙秘は静止画への同意である (第50条a)
  ✓ atlas: 静止を選んだ走行は、黙るのではなく断る (第50条a)
  ✓ atlas: 動きの検器が実在し、門がそれを見ている (第50条c)
  ✓ atlas: 版元の既定値を記憶ではなく正典から引く (第50条d)
```

最後のテストは上流 `archify` の `animation` enum が `['none','trace']` から
変わった瞬間に赤くなる — **上流が動けば、ここが最初に食い違う。**

## 第50条 — 動きは名乗らねば宿らず、門が見ない機能は壊れても鳴らない

- (a) **黙秘は放棄と同じ意味を持つ。** 設定し忘れは無効な設定と同じ結果を生む。
- (b) **直したのに直らない症状は、原因が二つある。** そして片方は直してはならない正しい振る舞いだった。
- (c) **「押せる」は「動く」ではない。** 釦の活性を見て合格と呼ぶ門は、半分しか見ていない。
- (d) **借り物の作法は借り物の正典に問う。** 記憶や推測ではなく上流の schema/SKILL を読んで確定させた。

教訓4件を `kg.js` に永続化済み (`applies:paradise-internal`) — critic が今後自動で検査する。
