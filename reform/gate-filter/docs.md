# docs — 門の絞り込みの口を「使う者が読む文書」にする

対象: `README.md`(本体) / `reform/gate-filter/design.md`(既知の限界)
ブランチ `feat/gate-filter`
掟: **`tests/paradise.test.js` は一文字も触らない**(実装は教主の手にある)。
**README の数値は手で書かない**(第22条 — `node graph/census.js fix` の仕事)。
`.github/workflows/` ・ `CONSTITUTION.md` ・ `CLAUDE.md` は触らない。

状態: **完了**。触ったファイル 3 本(新規 1 / 追記 2)。

---

## 0. 書く前に確かめたこと(実出力)

書いた例は**すべて実際に走らせた**。全走(6 分)は走らせていない。

| # | 撃ったもの | 実出力(末尾) | exit | 所要 |
|---|---|---|---|---|
| 1 | `--gate-list` | `Paradise gate list: 451 gates` | 0 | **0.076s** |
| 2 | `--gate 'atlas:' --gate-list` | `Paradise gate list: 17 of 451 gates matched` | 0 | 即時 |
| 3 | `--gate-not 'atlas: 全ての道が図になる' --gate-not 'atlas: 門は己の残骸で落ちない'` | `Paradise gate-filter: 449 of 451 gates matched — 449 green, 0 red` | 0 | **20.063s** |
| 4 | `--gate 'zzz-no-such-gate'` | `Paradise gate list: 0 of 451 gates matched — nothing was measured` | **2** | 即時 |
| 5 | `--gate 'links nodes and shows neighbors'` | `Paradise gate-filter: 1 of 451 gates matched — 0 green, 1 red` | **1** | 即時 |
| 6 | `--gate 'remembers and queries a node\|links nodes and shows neighbors'` | `Paradise gate-filter: 2 of 451 gates matched — 2 green, 0 red` | 0 | 即時 |

- #3 は build 相の 20.773 秒を**独立に再現した**(20.063 秒)。母数も 449 本で一致。
- #5 / #6 は security 相 D-2 の「絞り込み走行は依存を保証しない」を、
  docs 相が**自分の手で再現した**。文書に写す前に実物で見た。
- #3 と #5 の出力には、実装が吐く警告行
  `Paradise gate-filter: 注意 — 絞り込み走行は門の依存を保証しない…(security D-2)`
  が総括行の直前に**必ず**現れることも確認した。README にはこの機序を散文で写した。

### 第22条に触れないことの確認

`graph/census.js:268` が README を書き換える正規表現は

```
/paradise\.test\.js\s+#\s*(\d+)\/(\d+) pass/
```

である(`node tests/paradise.test.js   # 451/451 pass` の 1 行だけを狙う)。
**今回 README に足した行はどれもこの形に当たらない** —— `paradise.test.js` の直後に
必ず `--gate` 系のフラグが来るため。ゆえに `census.js fix` と喧嘩しない。
加えて **門の本数(449 / 451)を README の散文に一つも書いていない**。
腐る数は書かず、総括行そのものに語らせる(楽園の作風 =「写経しない・開いた先が語る」)。

---

## 1. `README.md` への追記(本体) — diff 相当

**位置**: `## テスト` 節の中。従来の 138 行(`node … paradise.test.js   # 451/451 pass`)と
その下の「検証内容」段落は**一行も動かしていない**。検証内容の段落の**直後**に
`### 門を絞る` を新設し、`---` の手前に置いた。

```diff
 domains/ordain（分野の適合・役者の鍛造）・spawn-trace（起動の証跡と**序列の門**・第52条）・
 gauge（走行の採点と**台帳の冪等性**・指紋/畳み/監査・故障注入で門が鳴ることまで・第38条・第55条）。

+### 門を絞る（開発中の一本を撃つとき）
+```bash
+node tests/paradise.test.js --gate '<正規表現>'      # 当たった門だけ走らせる
+node tests/paradise.test.js --gate-not '<正規表現>'  # 当たった門を除く（**除外が勝つ**）
+node tests/paradise.test.js --gate-list             # 名を並べるだけ（fn を呼ばない・0.08秒）
+```
+同じフラグを重ねれば **OR**。`--gate` と `--gate-not` が同じ門に当たれば除外が勝つ。
+**環境変数は一つも無い** — census が絞り込み後の数を README に持ち込まないため（第22条）。
+撃つ名は `--gate-list` で見てから組む。
+
+**最も実用的な一行**（重い Atlas 2 本だけを除く。6 分が 20 秒台になる）:
+```bash
+node tests/paradise.test.js \
+  --gate-not 'atlas: 全ての道が図になる' --gate-not 'atlas: 門は己の残骸で落ちない'
+```
+
+**exit**: `0` 緑 / `1` 赤 / **`2` 測れなかった**。
+**マッチ 0 件は 2 である** — 業界の既定（何も走らなければ 0）と袂を分かつ。
+打ち間違えた正規表現が「緑」を名乗るくらいなら、測れなかったと叫ぶ方がよい。
+不正な正規表現・未知のフラグ・値の欠落も 2。
+
+**限界（隠さない）**: 絞り込み走行は**門の依存を保証しない**。共有状態を前段の門に
+頼る門は、単独で撃つと全走では緑なのに赤くなる（実装が走行のたびに警告を名乗る）。
+偽の赤を見たら前段の門を `--gate` に足して撃ち直せ。
+**「緑」の根拠になるのは引数無しの全走だけである。CI に絞り込みを持ち込むな。**
+
 ---
```

**足した行数: 26 行**(空行込み)。README は 343 → 369 行。
既存の一行も書き換えていない(追加のみ)。

### 何を書き、何を書かなかったか

書いた:
- 三つのフラグと意味(包含 / 除外 / 一覧)、**除外が勝つ**、複数指定は **OR**
- 環境変数が無い理由を一行(第22条)
- 最も実用的な一行 = Atlas 2 本を除く走行
- exit 規約 3 種。**マッチ 0 件が 2 であることと、それが業界既定と違うこと**
- 限界: 依存を保証しないこと / 偽の赤の直し方 / 全走だけが「緑」の根拠
- **CI に絞り込みを持ち込むな**

書かなかった(意図して):
- 門の本数(449 / 451) —— 腐る数。総括行が語る(第22条の精神)
- 引数解釈の全経路・エラー文字列の一覧 —— `reform/gate-filter/review.md` が持っている
- ReDoS の話 —— 使う者の文書ではない。`design.md` の「既知の限界」に置いた
- `--gate '.'` の総括行が変わる件 —— 罠ではあるが、CI 禁止の一行で実害が消える

---

## 2. `reform/gate-filter/design.md` への追記 — diff 相当

**位置**: `## 9. 設計が満たしていない/持ち越すもの(正直に書く)` と
`## 10. 要約` の**間**。9 章が設計時点の「持ち越し」、新 §9.5 が
**実装後に security 相が実測で見つけた**既知の限界であり、性質が違うので節を分けた。

```diff
 5. **節を単位にする絞り込みは作らない**(NG-02)。…

+---
+
+## 9.5 既知の限界(実装後・security 相の実測。設計として認める)
+
+### 9.5.1 絞り込み走行は門の依存を保証しない
+
+…(該当 4 本の門の名・実測値・機序・なぜ塗らないか)…
+
+### 9.5.2 単独走行が 1 秒で終わるとは限らない
+
+…(`atlas: 全ての道が図になる…` = 236.8 秒 / 緑)…
+
+### 9.5.3 ReDoS(LOW・塗らない)
+
+…(`((.*)*)*zzzz` / `(\w+\s?)*Z` で 45 秒超)…
+
 ---

 ## 10. 要約(神と教主のための一枚)
```

**足した行数: 73 行**。design.md は 871 → 944 行。既存の行は一つも書き換えていない。

引いた実測値と門の名(すべて `security.md` §2 / §3 から):
- 単独走行で偽の赤になる **4 本**:
  `links nodes and shows neighbors` / `snapshot surfaces hubs and survives reload` /
  `predict A returns B ranked appropriately` /
  `lessons export recovers the scope so the lesson is not global`
- 機序: 共有 `kgRoot`(150 行) / `ccRoot`(191 行) を前段の門が書く。
  `test()` は絞り込みで `return` するので前段の `fn()` が呼ばれない
- 復帰の実測: `--gate 'remembers and queries a node|links nodes and shows neighbors'`
  → `2 green, 0 red`(docs 相でも再現済み)
- 重い門: `atlas: 全ての道が図になる — 描画器が実際に受理する (第47条)` = **236.8 秒 / 緑**

---

## 3. 触っていないもの(確認済み)

- `tests/paradise.test.js` —— **一文字も触っていない**。`git status --porcelain` の
  ` M tests/paradise.test.js` は build 相(教主)の変更であり、docs 相は上書きしていない
- `.github/workflows/` / `CONSTITUTION.md` / `CLAUDE.md` / `graph/*.js` —— 触っていない
- README の既存 343 行 —— **追加のみ**。既存行の書き換え 0

## 4. 持ち越し(正直に)

- **README を census に検め直させていない**。`node graph/census.js check` は全走を要する
  経路を含むため、6 分の全走禁止の掟に従って走らせなかった。
  ただし §0 のとおり、足した行が census の正規表現に当たらないことは
  `graph/census.js:268` を読んで確認している。
- 英語版 README は無い(楽園は日本語一本)ので翻訳の持ち越しは無い。
