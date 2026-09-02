# reflect — 断罪機関の自己批判 (第9条)

> **裁かれる前に自らを疑う。** critic は verdict に先立つ。

## critic を三つの対象に向けた

| 対象 | 結果 |
|---|---|
| `graph`(engine, `--self`) | **the critic found nothing** — exit=0 |
| `dashboard`(画面, `--self`) | **the critic found nothing** — exit=0 |
| `reform/dashboard-living-gate`(散文) | 2 GAP — ただし**対象違い**(下記) |

## 散文への赤は対象違いである — 実測で示す

```
🔴 [gap] tests-exist: no test file found
```

```
$ ls tests/dashboard-*.test.js tests/motion-probe-leak.test.js | wc -l
13                                    ← テストは実在する

$ ls reform/dashboard-living-gate/ | grep -c "\.test\.js"
0                                     ← 散文の置き場にテストは無い
```

**第23条の reform は創造物と構造が違う。**

- 創造物(`../paradise-creations/<slug>/`)は**一つの場所に全てが揃う** —
  実装もテストも散文も同じディレクトリに住む。critic の既定の見方はこれに合う。
- reform は**楽園自身を直す**ので、実装は `graph/`、テストは `tests/`、
  散文だけが `reform/<slug>/` に住む。**成果物が三箇所に分かれる。**

ゆえに `critic review reform/<slug>` は散文だけを見て「テストが無い」と言う。
**critic が間違っているのではなく、向ける先が違った。**

## もう一件の赤も同型

```
🔴 [gap] lesson:require-customization: LESSON REGRESSION — "config" not addressed
```

この lesson は「借り物をそのまま使わず楽園に合わせよ」という教訓で、
`applies:` の scope が創造物向けである。散文の束に対して発火するのは誤射である。

ただし**この改修は実際に借り物を改変している**:

```
$ git diff main..HEAD --stat -- overlay/vendor/
 overlay/vendor/archify/assets/template.html      | ...
 overlay/vendor/archify/bin/visual-check.mjs      | ...
```

第19条(a)が明示的に許す改変であり、`vendor.js verify` は緑(第20条の独立性は保たれている)。
**lesson が求める「借り物をそのまま使うな」を、この改修は満たしている。**

## smell 一件 — 受け取る

```
🟠 [smell] spec-musthaves-covered: must-haves weakly reflected (verify via ACs):
   node標準ライブラリのみでサーバを実装する
```

これは**正しい指摘である**。散文には書いたが、散文だけでは証明にならない。
機械が検める形が要る。実測すると門は既に在った:

```
$ node tests/dashboard-no-deps.test.js
dashboard-no-deps: 10 passed, 0 failed
```

`package.json` の依存ゼロ・外部フォント参照ゼロ・`require` が node 標準のみ、を
10のアサーションが検めている。**smell は「散文が弱い」と言っており、それは当たっている** ——
だが**門は強い**。散文ではなく門が真実を語る(第22条)。

## この改修が critic に返すもの

critic は `reform/` を「創造物と同じ形」と仮定して見る。
**reform の道が増えた今、その仮定は狭い。**

負債として記録する: `critic.js` が reform の run を見るとき、
散文(`reform/<slug>/`)・実装(`graph/`)・門(`tests/`)の三箇所を
束ねて評価できるようにすべきである。今回は範囲を広げないため触れない。

## 判定

**engine と画面はいずれも critic が「何も見つけられなかった」と述べた。**
散文への赤2件は対象違い、smell 1件は指摘が正しく門が既に守っている。

**verdict へ進む。**
