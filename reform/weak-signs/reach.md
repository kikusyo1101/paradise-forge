# 楽園 — 弱い印の**射程帳** (reform/weak-signs / PARA-10 の種H)

> ⚠️ **これは「直した帳」ではない。「原理的に塞げないと名指しした帳」である。**
> ここに載る 32 件は今なお `reform` へ誤着しており、`tests/reform-reach.test.js` が
> **その誤着を assert して凍らせている**(xfail)。誰かが直した瞬間、その門が赤くなる。

- 走行: `reform/weak-signs`(PARA-10 / PARA-11 の修理 / 2026-09-17)
- 裁定の出所: `reform/weak-signs/requirements.md` §2(受け入れ帳 140 / 射程帳 32 に割る)
- 凍結の門: `tests/reform-reach.test.js`(CI `tribunal.yml` に結線済み)
- 前例: `reform/judgment-triad/debt.md` + `tests/route-debt.test.js`(同じ作法)

---

## 1. なぜ「塞げない」と書いた紙を残すのか

本走行は `REFORM_RE` の**語境界**を日英の両枝で直し(`REFORM_FALSE_FRIENDS` / `\b`)、
受け入れ帳 140 件で対角 140/140・非対角 0/30 に到達した。
だが **32 件だけ**、受け入れ帳から**外して**合格線を引いた。

外した条件は**件数の都合ではなく原理**である。次の**二条件の両方**を満たすものだけを外した:

- **(i) 種H である** —— 印が**独立した語**として当たっている
  (`常夏の**楽園**` の「楽園」は語の一部ではない。`一**門**` の「門」とは違う)。
- **(ii) 語境界の修理を全部当てた形でも**なお誤着する。

**「表を足せば直るが、足していないから直っていない」的は一件もここに居ない。**
それが第21条(門を緩める言い訳にするな)の担保である ——
第60条が禁じた「表を足す」修理を**拒んだ結果として残る**的だけが、
「原理的に塞げない」と名乗る資格を持つ。

> ⚠️ **ここに載る願いを `REFORM_FALSE_FRIENDS` に書いて緑にしてはならない。**
> それは判定器の修理ではなく答案の暗記であり、コーパスの外(`熱帯の楽園` `自動車エンジン`)には
> 一切効かない。`tests/reform-sign.test.js` の `S-3` が機械でその道を塞いでいる
> (表の全項が「門」を含むことを撃つ)。

---

## 2. 射程帳の表(32 件)

`現状の道` は推定ではない。`node tests/reform-reach.test.js` が毎回これを撃ち直す。

| # | 印 | 願い | 現状の道 | 正解の道 |
|---|----|------|---------|---------|
| 1 | `楽園` | `常夏の楽園を巡るリゾート予約アプリが欲しい` | `reform` | `full` |
| 2 | `楽園` | `楽園ビーチの写真を並べる機能を実装して` | `reform` | `standard` |
| 3 | `paradise` | `build a fan wiki for paradise lost` | `reform` | `standard` |
| 4 | `paradise` | `i want a travel booking app for paradise island resorts` | `reform` | `full` |
| 5 | `ハーネス` | `登山用ハーネスの通販サイトを作れ` | `reform` | `full` |
| 6 | `ハーネス` | `安全ハーネスの点検記録を付ける機能を実装して` | `reform` | `standard` |
| 7 | `harness` | `implement an inventory importer for climbing harness stock` | `reform` | `standard` |
| 8 | `harness` | `build a safety harness inspection app` | `reform` | `full` |
| 9 | `憲法` | `日本国憲法の条文を検索できるアプリが欲しい` | `reform` | `full` |
| 10 | `constitution` | `create a full-text search index for the us constitution` | `reform` | `standard` |
| 11 | `constitution` | `build a constitution quiz app for students` | `reform` | `full` |
| 12 | `engine` | `implement a search engine result parser` | `reform` | `standard` |
| 13 | `engine` | `create a listing page for used car engine parts` | `reform` | `standard` |
| 14 | `エンジン` | `検索エンジンの順位を追うアプリが欲しい` | `reform` | `full` |
| 15 | `エンジン` | `エンジンオイルの交換履歴を記録する機能を実装して` | `reform` | `standard` |
| 16 | `パイプライン` | `石油パイプラインの保守記録システムを作って` | `reform` | `full` |
| 17 | `パイプライン` | `データパイプラインの実行ログを表示する機能を実装して` | `reform` | `standard` |
| 18 | `pipeline` | `implement a sales pipeline stage filter` | `reform` | `standard` |
| 19 | `pipeline` | `build a crm app with a deal pipeline view` | `reform` | `full` |
| 20 | `自己改善` | `自己改善の習慣を記録するアプリが欲しい` | `reform` | `full` |
| 21 | `自己改善` | `自己改善のチェックリスト機能を実装して` | `reform` | `standard` |
| 22 | `オーケストレーション` | `コンテナオーケストレーションの監視ダッシュボードを作って` | `reform` | `full` |
| 23 | `オーケストレーション` | `音楽のオーケストレーション譜面を印刷する機能を実装して` | `reform` | `standard` |
| 24 | `orchestration` | `implement a kubernetes orchestration status widget` | `reform` | `standard` |
| 25 | `orchestration` | `build a container orchestration cost dashboard product` | `reform` | `full` |
| 26 | `枢機卿` | `カトリック枢機卿の一覧を引けるアプリが欲しい` | `reform` | `full` |
| 27 | `枢機卿` | `枢機卿の選挙結果を取り込むコマンドを実装して` | `reform` | `standard` |
| 28 | `cardinal` | `implement a cardinal direction compass widget` | `reform` | `standard` |
| 29 | `cardinal` | `build a birdwatching app for spotting a cardinal` | `reform` | `full` |
| 30 | `神官` | `神社の神官の当番表を管理するアプリが欲しい` | `reform` | `full` |
| 31 | `神官` | `神官の装束の在庫を数えるコマンドを実装して` | `reform` | `standard` |
| 32 | `priest` | `implement a parish priest schedule importer` | `reform` | `standard` |

**道ごとの内訳: `standard` 17 件 / `full` 15 件。**
`counsel` / `cartography` / `reform` / `quick` は 0 件 ——
すなわち射程帳は **`standard→reform` と `full→reform` の二セルにしか触れない**。

**20 印のうち 17 印に的が在る。** 的を持たない 3 印は:

- `門` / `gate` —— **全件が種M**(語中埋没)であり、語境界の修理で全部塞がった。受け入れ帳に在る。
- `self-improve` —— 英語の的が無く、`自己改善` の 2 件が日本語側で先に当たる。

---

## 3. なぜ本走行で直さないのか(すべて実測)

1. **語境界では触れない。** これらの印は**独立した語**として当たっている。
   `\b` も複合語表も、語の中に埋もれた印しか救えない。
2. **表を足す修理は第60条が名指しで禁じた。** `常夏の楽園` `検索エンジン` `カトリック枢機卿` を
   表に書けば本コーパスでは緑になるが、それは**答案の暗記**であり、
   コーパスの外(`熱帯の楽園` `自動車エンジン` `northern cardinal`)には一切効かない。
   実測: その形(discover 相の X4)は耐久 48 件中 43/48、本走行の X4″(表は「門」の複合語だけ)は **44/48**。
   **表を膨らませた方が耐久は落ちた。**
3. **長い紛れ語は文の骨を削る。** 表に `コンテナオーケストレーション` を入れた形は
   削った跡に「の監視ダッシュボードを作って」しか残さず、`full` の願いを `standard` へ落とした
   (`full→standard` の新規誤着 1 件)。X4″ ではこのセルは 0 件である。
4. **文脈化も表である。** 「楽園/機構の語と共起したときだけ真」という形(R4/R5)は
   共起語の表を新たに作るだけで、同じ罠に落ちる。しかも `counsel.test.js:652` が鳴り、
   `門の閾値を上げよ` のような楽園の願いを落とす(耐久 枝A 8/10)。

**正しい修理は「もっと強い印を持つこと」である** —— すなわち願いの**対象**を
語彙一枚ではなく構造で判定すること。それは `REFORM_RE` の再設計であり、別走行の主題である。

---

## 4. 払い方(この射程を詰める者への手順)

`tests/reform-reach.test.js` は **誤った振る舞いを誤りのまま凍らせる門**(xfail 方式)である。
誰かが的を直した瞬間、`R-1` が **赤くなる**。**赤くなることがこの門の仕事である。**
そのとき次の順で払え:

1. 直った願いを `tests/route-matrix.test.js` の本コーパスへ、表の**正解の道**として昇格させる。
2. **同じ commit で** `W-1 [門番]` の `FLOOR` と総数の下限を、昇格させた件数だけ上げる。
3. `reform/weak-signs/reach.md`(この紙)の当該行と、`tests/reform-reach.test.js` の
   `REACH` 配列から**同時に**消す。`R-4` / `R-5` が**帳と門の一致**を撃っているので、
   片方だけ消せば門が鳴る。
4. 32 件すべてが払われて `REACH` が空になっても、**門を削除してはならない**(第44条の結線が切れる)。
   `R-1` / `R-3` は skip を名乗り、`R-4` / `R-5` は「reach.md の表が 0 行である」ことを撃つ形にする。

> ⚠️ **この門を `|| true` で黙らせたり、`REFORM_FALSE_FRIENDS` にこれらの願いを書き足して
> 払ったことにするな(第21条 / 第60条)。** 後者は `tests/reform-sign.test.js` の `S-3` が
> 機械で塞いでいる —— 表の全項が「門」を含まねばならない。
