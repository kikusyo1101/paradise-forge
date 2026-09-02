# requirements.md — ダッシュボード刷新 (dashboard-living-gate) / specify 相

- **道**: reform (楽園自身の改修 — 憲法第23条b)
- **入力**: `reform/dashboard-living-gate/findings.md` (神官・discover 相)、
  `reform/dashboard-living-gate/findings-pontiff.md` (教主の独立実測)、
  `reform/dashboard-living-gate/findings-base-red.md` (教主・着工前の土台検査 / 第24条)、
  `reform/dashboard-living-gate/findings-speed.md` (教主・プロセス内呼出しの実測 / 第38条)。
  **この4つ以外を根拠にしていない。**
- **測定機**: Windows 11 / node v24.14.0 / git-bash / `C:/Users/kikus/Documents/workspace/paradise`
- **執筆日時**: 2026-09-02 (JST)
- **本書の掟**:
  1. 要件はすべて番号付き (FR / NFR / G / PRE)。
  2. **受入基準 (AC) の無い要件を書かない。** AC は「機械が実行できるコマンド」と「期待する出力」で書く。
  3. AC は **生成物の中身を前提にしない**(第29条)。`dashboard/state.json` の中身に対する assert は書かず、
     **生成器の性質**(その場で走らせた出力どうしの一致)を測る。
  4. **不定に鳴る門の受入基準は、症状ではなく原因を数える形で書く。**
     (findings-base-red.md B-5 の一般化。「テストが緑」を AC に置いてはならない場面がある — §2 参照。)
  5. 各要件に findings.md の由来 R-xx / findings-base-red.md の B-xx / findings-speed.md の S-x を明記する(追跡可能性)。

## 本書が採用する「今の真実」(AC の期待値の基準・すべて実測)

> 出典: findings-speed.md。**これらは固定値としてコードに書く数ではない** — AC で
> 「その場で数えた値と一致するか」を測るための、執筆時点の実測基準である(第22条)。

| 事実 | 実測値 | 数え方 |
|---|---|---|
| engine 数 | **33** | `ls graph/*.js \| wc -l` |
| 憲法の条数 | **50** | `node graph/codex.js index` |
| 枢機卿の数 | **7** | `Object.keys(require('./graph/clergy.js').COLLEGE).length` |
| 創造物 | **7** | 兄弟倉直下の `_` で始まらないディレクトリ(`coin, habit, pomodoro, reform-claude-md-diet, reform-eval-gauge, rps, tenbin`) |
| 作業場 | **1** | 同 `_` 始まり(`_scratch`) |
| conclave.json | **5** | `ls ../paradise-creations/*/conclave.json \| wc -l` |
| KG ノード / エッジ | **99 / 33** | `wc -l < ~/.claude/paradise-kg/nodes.jsonl` |
| 教訓 | **65** | `lessons.js export --out` の要素数 |
| 道ごとの相数 | quick **6** / standard **14** / full **17** / reform **11** / counsel **6** / cartography **11** | `forge.buildDag(wish, '<scale>')` |

> **第47条(b)の予言が既に現実になっている**: 枢機卿は **7 人**。
> `dashboard/state.json` の hierarchy も `index.html` の固定値も、この 7 を知らない。
> **index.html が「Live Graph Execution」と称して描く 4 タスク DAG は、上記 6 つの道のどれとも一致しない架空物である。**

---

## 0. 一行の要約

**現在のダッシュボードは、一度も engine を呼んだことがない。**
engines を 2 と言い(実 **33**)、self-tests を 10 と言い(実 **268**)、creations を 0 と言い(実 **7**)、
枢機卿の 7 人目を知らず(第47条bの予言は既に成就している)、
「Live Graph Execution」と称して **実在する 6 つの道のどれとも一致しない 4 タスクの架空 DAG** を描いている。
本改修は「画面に出る全ての数が、その場で走った engine の出力と一致する」ことを唯一の中心に据える。

---

# 1. 目的と非目的

## 1.1 目的 (何を作るか)

| # | 目的 | 由来 |
|---|---|---|
| P-1 | **嘘を消す。** 画面に現れる全ての数値を、閲覧時に走った engine の実出力に置換する | R-01 / findings E-3 |
| P-2 | **生きた門にする。** node 標準ライブラリのみの HTTP+SSE サーバで、事実の変化が画面に届く | R-05〜R-08, B-1 |
| P-3 | **file:// を捨てない。** サーバが無くても壊れず、代わりに「凍結された写しである」と正直に名乗る | R-05, B-3 |
| P-4 | **住所の欠陥を engine 側で治す。** creations の直書き2箇所と、それを見逃した門の穴を塞ぐ | R-03 / 教主 §1 |
| P-5 | **赤を隠さない。** gauge 100/100 と spawn-trace 17/17赤 を同じ画面に並べる | R-10, B-4例2 |
| P-6 | **門に守らせる。** 本改修で得た性質を CI が自動で検査する(第50条) | 教主 §6 |

## 1.2 非目的 (明確に作らないもの)

| # | 作らないもの | 理由 |
|---|---|---|
| N-1 | **外部サービス・CDN・Web フォント・npm 依存** | 楽園の掟(外部依存ゼロ)。教主 §7 で atlas が既に違反しており、増やさず**減らす**側に立つ |
| N-2 | **データベース・永続ストア** | 事実の源は engine と JSONL。二重帳簿を作らない |
| N-3 | **公開サーバ・認証・多人数同時利用** | サーバは `127.0.0.1` に閉じたローカル専用。認証情報を一切載せない |
| N-4 | **`~/.claude` の手編集** | 掟。KG/ledger は **読むだけ**(`nodes.jsonl` 等の書き込みは engine 経由のみ) |
| N-5 | **ダッシュボードから楽園を操作する機能**(run の起動・裁定の実行・リースの取得) | 本改修は**観測**の門である。`daily-guard claim` は排他リースを奪う副作用があり、discover でも実行を見送られた(findings D) |
| N-6 | **`dashboard/atlas/` の生成物そのものを手で書き換えること** | gitignore された生成物。直すのは**生成器**(`overlay/vendor/archify/assets/template.html`)側 |
| N-7 | **census.js を速くすること** | 本改修の範囲外。**同期経路から外す**ことで解決する(FR-06)。自己診断 282秒の高速化は別件 |
| N-8 | **視覚同一性(肌)の決定** | 教主 §5 の `wired [editorial]` 等は **design 相**の裁量。specify は「測れる形」だけを決める |
| N-9 | **main への直接コミット / マージ** | 掟。ブランチ `reform/dashboard-living-gate` → PR。マージは神の御手のみ |

---

# 2. 前提条件 (着工前に決着させるべき赤)

| # | 前提 | 由来 | 受入基準 (AC) |
|---|---|---|---|
| **PRE-01** | 自己診断が緑で完走すること。第24条「検めていない土台の上に建てるな」 | 教主 §3 | **【教主により達成済み・2026-09-02 実測】** `node tests/paradise.test.js` → `Paradise self-test: 268 passed, 0 failed`。着工の門は開いた |
| **PRE-02** | **検器の資源漏れを本改修で修理する**(範囲外に切らない) | 教主 findings-base-red.md | **AC-P02a**: `grep -c "child.kill()" graph/motion-probe.mjs` が `0` かつ `grep -c "browser.close()" graph/motion-probe.mjs` が `1` 以上。<br>**AC-P02b**: 検器を1回走らせる前後で `ls "$TEMP" \| grep -c "archify-visual-check-profile"` の**差が 0**。<br>**AC-P02c**: 新設テストが、`close()` を `child.kill()` に戻すと **exit 1** になること(壊して鳴る証明)<br>→ 詳細は **FR-23**(AC-23a〜23g) |
| **PRE-03** | **現存する残骸を掃除し、掃除前後の数を PR 本文に記録する。** 529 個の既存ノイズに埋もれたまま「漏れ 0」を主張できない | 教主 findings-base-red.md(483→519→529 の実測) | `ls "$TEMP" \| grep -c "archify-visual-check-profile"` を掃除前・掃除後の 2 回取り、**両方の数値**が PR 本文に記載され、掃除後が **10 未満**であること。かつ FR-23 適用後に自己診断を 3 回走らせ、**3 回を通じた増加が 0** であること(症状ではなく原因を数える — §2.0) |

> ## PRE-01 / PRE-02 に関する教主の訂正 (第16条・第22条)
>
> 本書が起草された時点の前提「自己診断の赤 1 件が固定的に出る」「プロファイル 412 個」は、
> **その後の実測により両方とも覆った**。正しい事実は次のとおり:
>
> **(a) 赤は不定(フレーク)である。** 4 回の走行で `267 passed, 1 failed` → `1 failed` →
> **赤ゼロ** → `268 passed, 0 failed` と揺れた。
>
> **(b) しかし欠陥は消えていない。単調に悪化している。**
> ```
> 483 個 → 519 個 → 529 個   (30分間の観測)
> ```
>
> **(c) 検器 1 回の走行で漏れることを差分で実測した。**
> ```
> $ node prove-leak.js
> BEFORE {"profiles":527,"chrome":10}
> AFTER  {"profiles":529,"chrome":10}
> LEAK   {"profiles":2}
> ```
>
> **(d) 根因は `graph/motion-probe.mjs:85`** — 描画器が公開している正規の
> `browser.close()`(SIGKILL エスカレーション + `fs.rmSync(profileRoot)`)を使わず、
> 自前の `browser.child.kill()` だけを書いている。
>
> ゆえに **PRE-01 の AC「自己診断が 0 failed」を受入基準にしてはならない** —
> 漏れが 529 個まで悪化した状態でも、その AC は**緑を出した**。
> 症状を見る門は、原因が悪化していても黙る。**数えられるのは漏れの方である**(第22条)。
>
> **そして X-6「掃除は別件」も撤回する。** 漏れは進行中の欠陥であり、
> 本改修が新設する門(G-xx)自身が visual-verify / motion-probe を CI で回す以上、
> **漏れを抱えたまま門を増やせば、CI が己の残骸で不定に赤くなる**。
> 直すのは本改修の責務である。


> **着工の門**: PRE-01 は達成済み。**PRE-02 が満たされない限り**(= 検器 1 回の前後で漏れ 0 が
> 実測されない限り)、以下の FR/NFR の実装に着手してはならない。
> 判定は **症状(0 failed)ではなく原因(漏れの差分)** で行う — §2 の訂正のとおり。

---

# 3. 要件一覧

## 3.0 追跡可能性 — R-xx から本書への写像(全 29 件の処遇)

| R-xx | 優先度 | 処遇 | 行き先 |
|---|---|---|---|
| R-01 | 🔴 | 昇格 | FR-02 |
| R-02 | 🔴 | 昇格 | FR-06 / NFR-01 |
| R-03 | 🔴 | 昇格 | FR-03 |
| R-04 | 🔴 | 昇格 | FR-07 |
| R-05 | 🔴 | 昇格 | FR-08 / NFR-06 |
| R-06 | 🔴 | 昇格 | FR-10 / NFR-02 |
| R-07 | 🔴 | 昇格 | FR-09 |
| R-08 | 🔴 | 昇格 | FR-11 |
| R-09 | 🔴 | 昇格 | FR-12 / NFR-02 |
| R-10 | 🔴 | 昇格 | FR-13 |
| R-11 | 🟠 | 昇格 | FR-19 |
| R-12 | 🟠 | 昇格 | FR-20 |
| R-13 | 🟠 | 昇格 | FR-14 |
| R-14 | 🟠 | 昇格 | FR-16 |
| R-15 | 🟠 | 昇格 | FR-15(+ FR-01 に統合) |
| R-16 | 🟠 | 昇格 | FR-17 |
| R-17 | 🟠 | 昇格 | FR-18 |
| R-18 | 🟠 | 昇格 | NFR-03 |
| R-19 | 🟠 | **統合** | FR-09 (SSE の `retry:` は必須ヘッダ群と一体で検査する) |
| R-20 | 🟠 | **却下** | §3.4 却下理由 D-1 |
| R-21 | 🟠 | 昇格 | FR-05 |
| R-22 | 🟡 | **却下(将来課題)** | §3.4 D-2 / §7 F-1 |
| R-23 | 🟡 | **統合** | FR-09 (キープアライブ行は SSE 形式要件の一部) |
| R-24 | 🟡 | 昇格 | FR-10 |
| R-25 | 🟡 | 昇格 | FR-21 |
| R-26 | 🟡 | **統合** | FR-13 (軌跡指標は gauge/spawn-trace 並置の同一パネル) |
| R-27 | 🟡 | 昇格 | NFR-04 |
| R-28 | 🟡 | **統合** | FR-11 (`filename` null 耐性はデバウンス実装と一体) |
| R-29 | 🟡 | 昇格 | FR-22 |
| — | — | 新規(教主 findings-pontiff §1) | FR-04 (`workspace.js` の門の穴), G-03 |
| — | — | 新規(教主 findings-base-red B-1〜B-5) | **FR-23** (`motion-probe.mjs` の資源漏れ), **G-09**, PRE-01〜PRE-03 |
| — | — | 新規(教主 findings-speed S-1〜S-5) | **NFR-07** (`require` 常駐・子プロセス禁止), **G-10**, FR-01 の改訂, FR-14 の改訂(S-3), FR-21 の改訂(6 つの道) |

**由来なしの新規要件は FR-01(集約 engine)のみ。** それ以外はすべて R-xx または教主の 3 文書に紐づく。

## 3.0b 要件の総数(第22条 — 自らについて述べる数も数える)

| 種別 | 数 | 内訳 |
|---|---|---|
| 前提条件 PRE | **3** | PRE-01 / PRE-02 / PRE-03 |
| 機能要件 FR | **23** | FR-01 〜 FR-23 |
| 非機能要件 NFR | **7** | NFR-01 〜 NFR-07 |
| 門 G | **10** | G-01 〜 G-10 |
| 却下 | **2** | R-20(再現せず) / R-22(将来課題 F-1 へ) |
| 統合 | **4** | R-19→FR-09 / R-23→FR-09 / R-26→FR-13 / R-28→FR-11 |
| **AC を持たない要件** | **0** | 本書の掟 2 |

---

## 3.1 機能要件 (FR)

### FR-01 — 唯一の集約 engine `graph/pulse.js` を新設し、engine を `require` で常駐させる
> **由来**: R-01, R-02, R-15, R-16, R-17 の統合 + **S-1 / S-3**(findings-speed.md)。
> ダッシュボードが engine を個別に呼ぶのではなく、**一本の機械可読な断面 (snapshot)** を通す。
> これが無いと「数の一致」を機械で検査できない(第22条)。
>
> **discover の「27〜73ms」は子プロセス経由 = node 起動代であって engine の代金ではなかった。**
> プロセス内から `require()` で呼ぶと実測:
> ```
> require 4 engine 込みで全事実が   7.4ms  (初回・require のコスト 4.7ms を含む)
> 2 回目以降の snapshot 生成        0.53ms
> conclave.json 5 件の直読み        1.0ms
> ```
> → 前提は「毎秒ポーリング可能」ではなく **「毎フレーム再計算可能」** が正しい。

- `node graph/pulse.js snapshot --json` は **速い群の engine のみ**を呼び、単一 JSON を stdout に出す。
- **サーバ(`pulse.js serve`)は engine を `require` で常駐させ、子プロセスを一切産まない**(S-1 / NFR-07)。
  `execFileSync` / `spawn` / `exec` を snapshot 経路に書いてはならない。
- 断面に必ず含む鍵(最低限): `generatedAt`(ISO), `ageMs`,
  `counts{articles, engines, cardinals, creations, workshops, runs, agents, commands, skills, lessons, kgNodes, kgEdges}`,
  `gates[]`, `runs[]`, `daily{}`, `scale{}`, `source`(各値がどの engine 由来か)。
- **census.js を呼んではならない**(FR-06)。
- 例外時も **JSON を返す**(`errors[]` に engine 名と理由を積み、プロセスは exit 0)。片方の engine が落ちても断面全体が消えない。
- **module の API 形は CLI の引数形と違う**(build 相が踏む罠 — findings-speed.md で実測):

| 誤り | 正 |
|---|---|
| `clergy.college()` | `clergy.COLLEGE`(定数)または `clergy.orgChart()` |
| `forge.plan(wish, {scale})` | `forge.buildDag(wish, 'reform')` — **第2引数は文字列**。オブジェクトを渡すと `SCALES[scale] is not a function` を踏む(実測) |
| `kg.query('')` | 正しい。全ノード(99 件)を返す |

**AC-01a**: `node graph/pulse.js snapshot --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log(o.counts.engines)})"`
が返す値が、`ls graph/*.js | wc -l` の出力と**一致**する(第22条。執筆時点の実測基準 33 だが、AC は**その場で数えた値**と比較する)。
**AC-01b**: 同じく `o.counts.creations` が
`ls -d "$(node graph/workspace.js resolve --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(JSON.parse(s).root))")"/*/ 2>/dev/null | grep -vc '/_[^/]*/$'`
と一致する。同様に `o.counts.workshops` が `_` 始まりのディレクトリ数と一致する
(**定義**: 創造物 = 兄弟倉直下のディレクトリのうち `_` で始まらないもの / 作業場 = `_` で始まるもの。実測 8 件 = **創造物 7 + 作業場 1**)。
**AC-01c**: `time node graph/pulse.js snapshot --json > /dev/null` の実時間が **1000ms 未満**(NFR-01)。
**AC-01d**: `node graph/pulse.js snapshot --json | node -e "…JSON.parse…"` が **例外を投げない**(`echo $?` が 0)。
**AC-01e**: `graph/` 配下の任意の 1 engine を一時的に壊した状態(例: `PULSE_FAULT=clergy node graph/pulse.js snapshot --json`)でも exit 0 で JSON が返り、`errors[0].engine` が `clergy` であること。
**AC-01f**(枢機卿 7 人 — 第47条b): `o.counts.cardinals` が
`node -e "console.log(Object.keys(require('./graph/clergy.js').COLLEGE).length)"` と一致する(実測基準 **7**)。
**AC-01g**(条数): `o.counts.articles` が `node graph/codex.js index` の数える条数と一致する(実測基準 **50**)。
**AC-01h**(プロセス内であることの証明): `grep -cE "execFileSync|spawnSync|child_process" graph/pulse.js` が `0`、
かつ `grep -c "require('./" graph/pulse.js` が `1` 以上(engine を module として読んでいる証拠)。
**AC-01i**(2 回目が速いこと = 常駐の証明): `pulse.js serve` を起動し、連続 2 回 `/snapshot.json` を取得したとき
**2 回目の応答が 50ms 未満**であること(初回 require のコストが 2 回目に乗らない = 常駐している証明)。

---

### FR-02 — `dashboard/index.html` の全数値をハードコードから実出力へ置換する
> **由来**: R-01。`dashboard/paradise.js:14-39` の固定配列が engines=2 / self-tests=10 を主張(実測 33 / 210 = **16.5〜21倍の虚偽**)。
> `paradise.js:107` の架空 4タスク DAG も同様に撤廃する。

- `dashboard/paradise.js` の `metrics:[{k,v}]` 形式の**固定値配列を全廃**する。
- 画面に出る全ての数は FR-01 の断面(第1〜3層いずれか)由来とし、**数値リテラルを HTML/JS に埋めない**。
- 唯一の例外は第3層で読み込む `state.js`(生成物)であり、これは FR-07 により**必ず「凍結」と表示される**。

**AC-02a**: `node tests/dashboard-no-hardcode.test.js` (新設) が exit 0。
同テストは `dashboard/index.html` と `dashboard/paradise.js` を走査し、
`k:'engines'` / `v:<数値>` 形式のメトリクス固定配列、および `SELF_DAG` 相当のタスク定義リテラルの存在数が **0** であることを assert する。
**AC-02b**: `grep -nE "\bv: *[0-9]+" dashboard/paradise.js | wc -l` が `0`。
**AC-02c**: `grep -c "SELF_DAG" dashboard/*.js dashboard/*.html` の合計が `0`。

---

### FR-03 — creations の住所を `workspace.js` に一本化する【engine 修正】
> **由来**: R-03。`graph/census.js:75` と `graph/export-state.js:32` が旧住所 `path.join(ROOT,'creations')` を直書き。
> 実在 8 件に対し `dashboard/state.json` は 0 件。第30条(住所を知るのは workspace.js だけ)違反。

- 両ファイルの `path.join(ROOT, 'creations')` を撤廃し、`workspace.js` の解決結果を使う。
- 旧住所が存在しない環境(現状がそれ)で **0 を返して黙る**のではなく、解決に失敗したら **明示的に errors に積む**。

**AC-03a**: `grep -rn "path.join(ROOT, *'creations')\|path.join(ROOT, *\"creations\")" graph/ | wc -l` が `0`。
**AC-03b**: `node graph/export-state.js && node graph/pulse.js snapshot --json` を走らせた直後、
`node graph/export-state.js` の stdout に出る `creations:<n>` の `<n>` が、AC-01b と同じ `ls -d` の実測値と一致する
(※ **`dashboard/state.json` の中身を読まない**。生成器が自分で告げた数と実地の数を突き合わせる — 第29条)。
**AC-03c**: `node graph/census.js show --no-tests` (FR-06 で追加するフラグ) の `creations` 行の数値が AC-01b の実測値と一致する。

---

### FR-04 — `workspace.js` の門の穴を塞ぐ【engine 修正・教主発見】
> **由来**: 教主 findings-pontiff §1(findings.md には無い、教主の独立発見)。
> `graph/workspace.js:112` の正規表現 `/['"`][^'"`]*creations\//` は **引用符直後にスラッシュが続く形**しか咎めず、
> `path.join(ROOT, 'creations')` を素通りさせた。門は緑を出しながら FR-03 の欠陥を見逃していた。
> 第19条が既に教えた病の再発 —「形を見る門が意味を見逃した」。

- `hardcodedRefs()` の検出規則を拡張し、**`path.join(...)` 経由の旧住所参照**を咎める。
- 検出対象は最低限: `'creations'` / `"creations"` / `` `creations` `` が `path.join` / `path.resolve` の引数に現れる形、および従来の `creations/` 形。
- `workspace.js` 自身と、テスト・本 reform 配下の文書は除外してよい(除外リストをコード内に明示すること)。

**AC-04a**(回帰の証明・赤→緑): FR-03 の修正を**適用する前**の `graph/census.js` を一時的に復元した状態で
`node graph/workspace.js check; echo "exit=$?"` が `exit=1` を返し、出力に `census.js` と `export-state.js` の**両方の行番号**が現れること。
**AC-04b**: FR-03 適用後は `node graph/workspace.js check; echo "exit=$?"` が `exit=0`。
**AC-04c**: 恒久回帰テスト `node tests/paradise.test.js` に本件の試験が 1 件以上追加され、
`grep -c "hardcodedRefs\|path.join(ROOT, 'creations')" tests/paradise.test.js` が `1` 以上を返す。
**AC-04d**: 合成の見本で機械判定する — 一時ファイル `$LOCALAPPDATA/Temp/pd-fake-$$.js` に
`const d = path.join(ROOT, 'creations');` を書いて `graph/` に置き `node graph/workspace.js check` が exit 1 を返し、
削除後に exit 0 に戻ること(検査後、一時ファイルは必ず削除する)。

---

### FR-05 — `--json` が無視される engine 3 つに真の JSON 出力を足す【engine 修正】
> **由来**: R-21。実測で `clergy.js college` / `conclave.js status` / `daily-guard.js status` は
> `--json` を付けても **出力が 1 バイトも変わらない**。ダッシュボードに正規表現でのパースを強いる。

- 3 engine が `--json` 指定時に、人間向けテキストを一切出さず、単一 JSON オブジェクトのみを stdout に出す。
- 人間向け出力(既定)は**変更しない**(既存の目視・CI を壊さない)。

**AC-05a**: 3 engine それぞれについて、
`node graph/<e> <sub> --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{JSON.parse(s);console.log('ok')})"`
が `ok` を出すこと(3/3)。
**AC-05b**: 同一 engine で `node graph/<e> <sub> | wc -c` と `node graph/<e> <sub> --json | wc -c` の**バイト数が異なる**こと
(現状は同一 = 無視されている証拠。差が出れば実装された証拠)。
**AC-05c**: `node graph/clergy.js college --json` の JSON が枢機卿数 7 + 執行官 1 を持ち、
その枢機卿数が `node graph/clergy.js college | grep -c '^枢機卿'` と一致すること(第22条)。
**AC-05d**: `node graph/conclave.js status --run <run> --json` の `domainsRatified`/`domainsTotal` が、
人間向け出力の `domains ratified: 6/6` 行の 2 数値と一致すること。

---

### FR-06 — `census.js` をダッシュボードの同期経路から隔離する
> **由来**: R-02。census.js は `census.js:43-44` で自己診断 `tests/paradise.test.js` を子プロセスで丸ごと回し、
> `timeout:120000` に達して打ち切られる。実測 **120,072ms**(教主実測と完全一致)。自己診断は単体 **282秒**。
> **構造的に必ず打ち切られる** — 偶発ではない。

- `census.js` に **自己診断を回さないモード**(`--no-tests` 等の明示フラグ)を足す。既定の挙動は変えない。
- `pulse.js`(FR-01)は census.js を**一切呼ばない**。self-test の数は次のいずれかで扱う:
  (a) 非同期の別経路(明示的な再計測ボタン相当の指示)で取得し、取得時刻とともに表示する、
  (b) 未取得なら「未計測」と表示する(**推測値を出さない**)。

**AC-06a**: `grep -rn "census" graph/pulse.js | wc -l` が `0`。
**AC-06b**: `time node graph/census.js show --no-tests` の実時間が **1000ms 未満**、かつ出力に `self-test` 行が
`(not run)` ではなく `(skipped: --no-tests)` 等、**回さなかったことが明示された文言**で現れること。
**AC-06c**: 既定挙動の非破壊 — `node graph/census.js show --help 2>&1 | grep -c "no-tests"` が `1` 以上。
**AC-06d**: 画面側の証明 — `node tests/dashboard-states.test.js` (FR-20) が、self-test の値が未取得のとき
当該パネルが `data-state="empty"` かつ `data-awaiting` に `census` を名指ししていることを assert する。

---

### FR-07 — 鮮度 (freshness) と「生 / 凍結」を常時表示する
> **由来**: R-04。現 `state.json` は `2026-09-02T07:03:56` で凍結。Braintrust は `freshness` を記録項目に明示し
> 「stale reads」を検出対象に挙げている。control.html は 89/55/0 を表示し続け、現在は 99/65/8(教主 §8)。

**表示規則(数値で定義する)** — `ageMs` = 断面の `generatedAt` から現在時刻までの経過:

| 区分 | 条件 | 表示 |
|---|---|---|
| **生 (live)** | 経路が第1層 or 第2層 **かつ** `ageMs <= 10000` | `生` + 経過秒 |
| **遅延 (lagging)** | 経路が第1層 or 第2層 **かつ** `10000 < ageMs <= 60000` | `遅延` + 経過秒 |
| **凍結 (frozen)** | 経路が第3層 **または** `ageMs > 60000` | `凍結` + 経過(時分秒)+ `generatedAt` の実時刻 |

- 分類ロジックは engine 側に**純関数として置く**: `node graph/pulse.js freshness --age-ms <n> --transport <sse|poll|frozen>` が
  `live` / `lagging` / `frozen` のいずれか 1 語のみを stdout に出す。画面はこれと同じ閾値を用いる。
- 凍結時は経過を必ず**人間可読な相対表記**(例 `2時間14分前`)で出す。絶対時刻だけの表示は不可。

**AC-07a**: 境界値の全数検査 — 次の 6 通りが期待どおりであること。
`for a in 0 10000 10001 60000 60001; do node graph/pulse.js freshness --age-ms $a --transport sse; done`
が上から `live live lagging lagging frozen` を出し、
`node graph/pulse.js freshness --age-ms 0 --transport frozen` が `frozen` を出す。
**AC-07b**: 閾値の二重管理を禁じる — `node tests/dashboard-freshness.test.js` が
`dashboard/*.html` / `dashboard/*.js` 内の閾値リテラル(`10000` と `60000`)と、`graph/pulse.js` の定数が**一致**することを assert し exit 0。
**AC-07c**: 3 区分すべてが画面に実在する — `grep -o 'data-freshness="[a-z]*"' dashboard/index.html | sort -u | wc -l` が `3`。

---

### FR-08 — file:// で開いても壊れない三層フォールバック
> **由来**: R-05。WHATWG#3099 実測記録: **Chrome は `file://` からの `fetch()` で network error**、origin は `null`。
> Safari は全 file:// で network error、Edge は timeout。
> `control.html:743-744` に既に思想がある — **再発明ではなく既存資産の格上げ**。

| 層 | 経路 | 発動条件 |
|---|---|---|
| 第1層 | `EventSource('http://127.0.0.1:<PORT>/events')` | `typeof EventSource === 'function'` かつ接続成功 |
| 第2層 | `fetch('http://127.0.0.1:<PORT>/snapshot.json')` を `setInterval` (既定 2000ms) | 第1層の `onerror` が **連続 2 回**、または接続後 **5000ms 以内に最初のイベントが来ない** |
| 第3層 | `window.PARADISE_STATE`(`<script src="state.js">` で読む) | 第2層の `fetch` が `TypeError` を投げる / `fetch` 未定義 / 第2層が **連続 2 回**失敗 |

- **昇格(復帰)も定義する**: 第2層・第3層に落ちた後も **30000ms ごとに第1層を再試行**し、成功したら昇格する。
- 第3層は必ず `data-transport="frozen"` となり、FR-07 により **`凍結`** と表示される。
- 第3層が成立する根拠: `<script src>` は CORS を経由しない(既に control.html:426 が使っている手)。

**AC-08a**: 3 層すべてが実装に存在する — `node tests/dashboard-transport.test.js` (新設) が
`dashboard/index.html`(および同梱スクリプト)に `EventSource` / `fetch(` / `window.PARADISE_STATE` の 3 つの分岐が
**すべて**存在し、`data-transport` の取り得る値が `sse` / `poll` / `frozen` の 3 つであることを assert して exit 0。
**AC-08b**: 閾値が定数として1箇所にある — 同テストが 連続失敗回数 `2` / 初回待ち `5000` / 再試行 `30000` の 3 定数の**定義箇所がそれぞれ 1 箇所のみ**であることを assert する。
**AC-08c**: サーバ不在時の第2層→第3層降格をヘッドレスで実測する —
`node tests/dashboard-fallback.test.js` が(サーバを起動せずに)`file://` で `dashboard/index.html` を開き、
`document.querySelector('[data-transport]').dataset.transport` が **10 秒以内に `frozen`** になることを assert する。
**AC-08d**(prove 相への申し送り): **サーバ在の状態で `file://` から `http://127.0.0.1` への EventSource が実際に繋がるか**は
discover で未実測(findings D)。prove 相で実ブラウザ検証し、繋がらない場合は第1層の発動条件を
「`http://` で開いたときのみ」に狭める(その場合も第2層以降で画面は成立する)。

---

### FR-09 — SSE の形式を仕様どおりに出す
> **由来**: R-07(必須ヘッダ)+ **R-19 統合**(`retry:`)+ **R-23 統合**(キープアライブ)。
> 実証: `require('http')` のみで 6/105/205/305ms と逐次配信された。Node が自動で `Transfer-Encoding: chunked` を付ける。

- 必須ヘッダ: `Content-Type: text/event-stream` / `Cache-Control: no-cache` / `Connection: keep-alive`。
- **`Content-Length` を書いてはならない**(chunked と衝突する)。
- ストリーム先頭に `retry: <ms>` を出す(既定 1000)。再接続そのものは **EventSource 任せ**にし、自前の再接続を書かない。
- キープアライブとして `: ping\n\n` のコメント行を定期送出する(既定 15000ms 間隔)。
- 各イベントは `event: <name>` + `data: <json>` + **空行 2 個で終端**(`\n\n`)。

**AC-09a**: `node graph/pulse.js serve --port 0` を起動し、告知されたポートに対して
`node -e "require('http').get('http://127.0.0.1:'+process.env.P+'/events',r=>{console.log(JSON.stringify(r.headers));process.exit(0)})"`
が `content-type: text/event-stream`, `cache-control: no-cache`, `connection: keep-alive` を含み、
**`content-length` を含まない**こと。
**AC-09b**: 先頭 512 バイトに `retry: ` が現れること —
上記応答の先頭チャンクを取り `grep -c '^retry: [0-9]\+$'` が `1`。
**AC-09c**: 逐次配信の実測 — 到着チャンクのタイムスタンプを 3 個以上記録し、
**最初のチャンクが接続から 1000ms 以内**に届き、かつ 2 個目以降の到着時刻が最初と**異なる**こと(バッファされていない証明)。
**AC-09d**: 終端規則 — 受信した生ストリームについて `printf '%s' "$raw" | grep -c $'\n\n'` が 1 以上、かつ
`data:` 行を持つブロックがすべて空行で終端していること(テストで機械判定)。
**AC-09e**: キープアライブ — 接続を 20 秒保持したとき `: ping` 行が **1 行以上**現れること。

---

### FR-10 — サーバは node 標準ライブラリのみ・ポートは自動割当し告知する
> **由来**: R-06(依存ゼロ)+ R-24(`server.listen(0)`)。`_probe-sse.js` で `require('http')` のみの動作を実証済み。

- `graph/pulse.js serve` は `http` / `fs` / `path` / `url` など **node 標準のみ**で実装する。
- 既定ポート(例 7317)を試み、使用中なら `server.listen(0)` で自動割当する。
- **実際のポートを stdout に 1 行で告知**する(例 `pulse listening port=51234`)。
  クライアントは `window.PARADISE_PORT`(`state.js` に書かれる)→ 既定ポート の順で解決する。
- `Access-Control-Allow-Origin: *` を返す(file:// の origin は `null`。ローカル専用・無認証なので許容 — B-3)。
- 待ち受けは `127.0.0.1` のみ。`0.0.0.0` で listen してはならない(N-3)。

**AC-10a**: `grep -nE "require\(['\"](?!http$|https$|fs$|path$|url$|os$|events$|child_process$|crypto$|zlib$)" graph/pulse.js`
相当の検査を行う `node tests/dashboard-no-deps.test.js` が exit 0(標準モジュール以外の `require` が **0 件**)。
**AC-10b**: `test -f package.json && node -e "const p=require('./package.json');console.log(Object.keys(p.dependencies||{}).length)"` が `0`(または package.json が存在しないこと)。
**AC-10c**: 告知の実測 — `node graph/pulse.js serve --port 0` の stdout 1 行目が `/port=[0-9]+/` に一致し、
その番号に `GET /snapshot.json` すると HTTP **200** かつ本文が `JSON.parse` 可能。
**AC-10d**: 二重起動耐性 — 既定ポートを占有した状態でもう 1 つ起動し、**両方が exit せず**別ポートを告知すること。
**AC-10e**: `netstat -ano | grep <port>` 相当の確認で、待ち受けアドレスが `127.0.0.1` であり `0.0.0.0` でないこと。

---

### FR-11 — `fs.watch` はデバウンスし、`change` と `rename` を等価に扱う
> **由来**: R-08 + **R-28 統合**(`filename` null 耐性)。
> 実測: Windows は **1 書込につき必ず 2 イベント**、しかも **同一 ms 内に 2 発**(901ms, 901ms)。
> atomic write(tmp→rename)は **`rename` のみ**を出す。時刻差による抑制は効かない。

- タイマー式デバウンス **50〜100ms**(既定 80ms)を必ず入れる。時刻差比較だけの抑制は不可。
- `change` と `rename` を**同じ扱い**にする。`change` のみを見る実装は、`export-state.js` が安全書き込みに切り替えた瞬間に沈黙する。
- `filename` が `null` でも落ちない(本環境では 6/6 で非 null だったが、文献は null を警告)。
- 監視対象は「見たいファイルそのもの」に絞る(ディレクトリ監視は `.tmp` の中間状態まで拾い、実測 9 イベント)。
- `rename` を受けたら watcher を**張り直す**(inode 差し替えで古いハンドルに残るため)。

**AC-11a**: 実測での合流 — `node tests/dashboard-watch.test.js` (新設) が対象ファイルに
`writeFileSync` を 1 回行い、**発火した生イベント数 >= 2** かつ **デバウンス後のコールバック回数 == 1** を assert する。
**AC-11b**: atomic write 経路 — 同テストが tmp 書込 → `rename` を 1 回行い、`rename` のみが出た状況でも
デバウンス後のコールバックが **1 回**発火すること(`change` を待って沈黙しない)。
**AC-11c**: null 耐性 — `filename` に `null` を渡す合成イベントでコールバックが**例外を投げない**こと。
**AC-11d**: 張り直し — `rename` 後に同名ファイルへ再度書き込み、コールバックが**再び発火**すること。
**AC-11e**: デバウンス幅が定数 1 箇所で定義され、50〜100ms の範囲にあること(テストで値域を assert)。

---

### FR-12 — 外部依存(Google Fonts)を除去する【生成器側を直す】
> **由来**: R-09 + 教主 §7。atlas 6 枚 × 3 = **18 箇所**が `fonts.googleapis.com` / `fonts.gstatic.com` を実取得。
> 出所は `overlay/vendor/archify/assets/template.html:36-41`。第19条(a)により `overlay/vendor/` は楽園の所有物で**改変してよい**。
> 同 template.html:6106-6112 に既に `local('JetBrains Mono')` の @font-face 退避がある — **取りに行く 3 行を削るだけ**。

- **`dashboard/atlas/*.html` を手で書き換えない**(N-6: gitignore された生成物)。直すのは template.html。
- 削るのは `preconnect` / `stylesheet(media=print onload)` / `noscript` の 3 行。書体は system monospace に落ちる。

**AC-12a**: 生成器の性質を測る(第29条) — `grep -c "fonts.googleapis\|fonts.gstatic" overlay/vendor/archify/assets/template.html` が `0`。
**AC-12b**: 再生成後の実地確認 — **atlas を作り直した直後に限り**
`grep -rl "fonts.googleapis\|fonts.gstatic" dashboard/ | wc -l` が `0`。
> ⚠️ **第29条の注意(discovery 枢機卿の指摘により教主が補正)**: `dashboard/atlas/` は **gitignore された生成物**であり、
> CI のクリーンな作業樹には**存在しない**。実測: `grep -rl … dashboard/` は手元では 6 件を挙げるが、
> **git 追跡ファイルのみに限ると 0 件**である。ゆえにこの AC を**そのまま CI の門にしてはならない** —
> 生成物が無い環境で自動的に緑になり、「守っているように見えて何も見ていない門」になる(第19条・第29条)。
> **CI で回すのは AC-12a と AC-12e のみ**とし、AC-12b は `node graph/atlas.js all` を先に実行した
> ローカル/リリース検証でのみ使う。
**AC-12c**: 白紙化していないこと — `grep -c "@font-face\|local('JetBrains Mono')" overlay/vendor/archify/assets/template.html` が `1` 以上
(退避が残っている証明)。
**AC-12d**: 【**教主により CI 対象から除外**】楽園全体の外部 http(s) 参照の走査
`grep -rhoE 'https?://[^"'"'"' )]*' dashboard/ | … | wc -l` が `0`。
AC-12b と同じ理由で**生成物依存**のため、CI ではなくローカル検証にのみ用いる。
**AC-12e**: 【**教主が新設 — CI の門はこれを使う**】**git が追跡しているファイルだけ**を走査し、
**実際に取りに行くコード**の中に外部書体参照が存在しないこと:
```
git ls-files -z -- 'overlay/**' 'dashboard/*.html' 'dashboard/*.js' \
  | xargs -0 grep -lE 'https?://(fonts\.googleapis|fonts\.gstatic)' | wc -l    # → 0
```
**修正前の実測(この AC が正しく赤を出す証明)**:
```
$ git ls-files -z | xargs -0 grep -lE 'https?://(fonts\.googleapis|fonts\.gstatic)'
overlay/vendor/archify/assets/template.html      ← 真の供給線。これを消せば緑になる
reform/dashboard-living-gate/findings-pontiff.md ← 欠陥を*記述*した文書。咎めてはならない
tests/paradise.test.js                           ← 門が*検出語として*持つ文字列。同上
```
ゆえに走査対象を `overlay/**` と `dashboard/*.html|*.js` に限る。
**欠陥を語る散文と、欠陥そのものを取り違えない** — 第28条「conduct の教訓を grep で裁くな」の同型である。
生成物の有無に左右されず、**供給線そのもの**を測る(第19条「在庫を数える門は供給線を証明しない」)。



---

### FR-13 — `gauge` の点数と `spawn-trace` の起動実績を同じ画面に並べる
> **由来**: R-10 + **R-26 統合**(軌跡指標)。
> tenbin は gauge **100/100** かつ spawn-trace **17/17 赤**(observed 0 / asserted-only 0 / no-trace 17)。
> Braintrust:「silent retry loops blend into normal traffic」— **沈黙した失敗が正常に紛れる**のが最大の敵。

- 各 run について、同一の行/カードの中に **点数**(`gauge score --json`)と **起動実績**(`spawn-trace report` の三値)を並置する。
- 軌跡指標 `firstPassRate` / `reworkCount` / `retryOverhead` / `loopGuardTrips` / `durationMs` を同じ面に出す(第38条)。
- **`spawn-trace report` の exit 1 を「エラー」として赤くしない。** exit 1 は「起動証跡なし」という**事実**である。
  (`daily-guard due` と同じ罠 — FR-16 参照。)
- 点数が高く起動実績が赤い組合せは、視覚的に**目立たせる**(この矛盾こそが本改修の本分)。

**AC-13a**: 並置の実在 — `node tests/dashboard-run-panel.test.js` (新設) が、run パネルの各要素が
`data-score` と `data-spawn-observed` / `data-spawn-asserted` / `data-spawn-notrace` の属性を**同一の親要素内**に持つことを assert。
**AC-13b**: 数の一致(第22条) — 実在 run について
`node graph/pulse.js snapshot --json` の `runs[]` 中 tenbin の `spawn.noTrace` が、
`node graph/spawn-trace.js report ../paradise-creations/tenbin/conclave.json | grep -oE 'no-trace: *[0-9]+' | grep -oE '[0-9]+'`
と一致する。同様に `score` が `node graph/gauge.js score ../paradise-creations/tenbin/conclave.json --json` の `score` と一致する。
**AC-13c**: exit 1 の非エラー化 — `pulse.js` が spawn-trace の exit 1 を受けたとき、
断面の `errors[]` に**積まれない**こと(`o.errors.filter(e=>e.engine==='spawn-trace').length === 0`)。
**AC-13d**: 軌跡指標 5 種すべてが画面に存在 —
`grep -o 'data-metric="\(firstPassRate\|reworkCount\|retryOverhead\|loopGuardTrips\|durationMs\)"' dashboard/index.html | sort -u | wc -l` が `5`。

---

### FR-14 — 走行中の環 (conclave) をトップに置く — `conclave.json` の直読みで足りる
> **由来**: R-13 + **S-3**(findings-speed.md)。`conclave.json` は
> `{meta, created, domains[], history[]}` で**既に構造化済み**であり、**engine 呼び出しすら不要**。
> **5 件の全件直読みが 1.0ms**(実測)。`fs.watch` + `JSON.parse` だけで
> 「いま何相が走っているか」「どのドメインが批准済みか」「直近の出来事は何か」が出る。
>
> 実測された 5 run の現状(執筆時点):
> ```
> coin                     11/11 phases  6/6 domains  22 events
> habit                    11/11 phases  6/6 domains  40 events
> reform-claude-md-diet     5/11 phases  4/6 domains  15 events   ← 途中で止まっている
> reform-eval-gauge        11/11 phases  6/6 domains  26 events
> tenbin                   17/17 phases  6/6 domains  27 events
> ```
> **`reform-claude-md-diet` が 5/11 相で止まったままであることを、現ダッシュボードは一切映していない。**
> Zylos:「トップは今何が起きているか = 実行中スパン」。

- トップに「走行中の環」領域を置き、run ごとに **ドメインの批准状況**と **相の done / ⚖gate** を出す。
- **数の源は `conclave.json` の直読み**とする(S-3)。`conclave.js` の呼び出しは**補助**であり、必須経路にしない。
- `history[]`(実測 15〜40 件)から**直近の出来事**を時系列で出す。
- 「走行中」の定義: `domainsRatified < domainsTotal` **または** いずれかの相が `status != done`。
  → 執筆時点では **`reform-claude-md-diet` の 1 件のみ**が「走行中(停止中)」に該当する。
- 完了した run と、途中で止まった run を**視覚的に区別**する(止まった run を「完了」と並べて隠さない)。

**AC-14a**: 数の一致 — `node graph/pulse.js snapshot --json` の `runs[]` のうち tenbin の
`domainsRatified`/`domainsTotal` が `node graph/conclave.js status --run ../paradise-creations/tenbin/conclave.json | grep -oE '[0-9]+/[0-9]+'` の値と一致する。
**AC-14b**: 網羅 — 断面の `runs.length` が
`ls ../paradise-creations/*/conclave.json 2>/dev/null | wc -l` と一致する(実測基準 **5** 件)。**取りこぼしを許さない**(第22条)。
**AC-14c**: 全 run を舐めても落ちない — `node graph/pulse.js snapshot --json; echo $?` が `0`。
`run.json` 形式(旧 orchestrator)のファイルが混在していても exit 0 で、`errors[]` にその旨が積まれるだけであること。
**AC-14d**: 相の数 — 断面の tenbin の `phasesTotal` が `17`(=`gauge score --json` の `phasesTotal`)と一致すること。
**AC-14e**(停止中の run を見落とさない): 断面の
`runs.filter(r => r.phasesDone < r.phasesTotal).map(r => r.name)` に **`reform-claude-md-diet`** が含まれること。
かつ その run の `phasesDone/phasesTotal` が、`conclave.json` を直読みして数えた値と一致すること(実測基準 **5/11**)。
**AC-14f**(engine 非依存の証明 — S-3): `conclave.js` を一時的に退避した状態でも
`node graph/pulse.js snapshot --json` の `runs.length` が AC-14b と同じ値を返すこと(直読みで足りている証明)。
**AC-14g**(直読みが速いこと): conclave 全件の読み取りのみを計測し、**10ms 未満**であること(実測 1.0ms)。
**AC-14h**(出来事の時系列): 断面の tenbin の `history.length` が
`node -e "console.log(require('../paradise-creations/tenbin/conclave.json').history.length)"` と一致する(実測基準 **27**)。

---

### FR-15 — 門の合否を一列に並べる
> **由来**: R-15。`wiring` / `vendor` / `derived` / `check-agents` / `workspace` はいずれも 27〜53ms、
> 合計でも 200ms 以下。現在は全緑。`wiring.js check --json` は engine 33 件の依存グラフ全体(11,974B)を 42ms で吐く。

- 5 つの門の合否を 1 領域に並べ、それぞれ **合否 / 実行時間 / 最終実行時刻**を出す。
- `wiring` の `orphans[]` / `dangling[]` は件数を出し、0 でなければ内訳を開ける。

**AC-15a**: 5 門すべてが断面にある — `node graph/pulse.js snapshot --json` の
`gates.map(g=>g.name).sort().join(',')` が `check-agents,derived,vendor,wiring,workspace` と一致。
**AC-15b**: 合否の一致 — 各門について断面の `ok` が、対応する engine を直接走らせた exit code の
`(exit===0)` と一致すること(5/5)。
**AC-15c**: 合計時間 — `gates.reduce((a,g)=>a+g.ms,0)` が **1000 未満**。
**AC-15d**: wiring の内訳 — 断面の `gates.find(g=>g.name==='wiring').orphans` の件数が
`node graph/wiring.js check --json | node -e "…JSON.parse…orphans.length"` と一致。

---

### FR-16 — 日次ノルマの債務を出し、exit code を誤読しない
> **由来**: R-14。実測 `node graph/daily-guard.js due` は `{"due":false,...}` を返しつつ **exit=1**。
> **exit 1 =「債務なし」**である。成否と誤読すると画面が赤く光る。

- 債務の判定は **JSON の `due` フィールド**のみで行う。exit code を成否として使ってはならない。
- 表示項目: `due` / `catchUp` / `owedDay` / `reason` / `jst`、および `daily-guard.js status --json`(FR-05)由来の窓・ledger 位置・直近履歴。
- **リース(第45条)の保持者表示**は discover で未確認(`claim` は排他リースを取得する副作用があり実行を見送られた)。
  → 本改修では「`status --json` に保持者欄が現れる場合のみ表示する」に留め、現れない場合は当該欄を出さない(推測を出さない)。

**AC-16a**: exit code 非依存の証明 — `node graph/daily-guard.js due; echo "exit=$?"` が `exit=1` を返す状況で、
`node graph/pulse.js snapshot --json` の `daily.due` が `false` であり、`errors[]` に `daily-guard` が**積まれない**こと。
**AC-16b**: 値の一致 — 断面の `daily.owedDay` が `node graph/daily-guard.js due | node -e "…JSON.parse…owedDay"` と一致。
**AC-16c**: 画面での色 — `node tests/dashboard-states.test.js` が、`daily.due === false` のとき当該パネルの
`data-state` が `error` **でない**ことを assert する。
**AC-16d**: リース欄の条件付き表示 — `node graph/daily-guard.js status --json | node -e "…console.log('lease' in o)"` が
`false` のとき、`grep -c 'data-field="lease"' dashboard/index.html` が `0` であること(未確認の欄を捏造しない)。

---

### FR-17 — KG は JSONL を直接読み、`nodes.jsonl` を監視する
> **由来**: R-16。`~/.claude/paradise-kg/nodes.jsonl` は **追記型 JSONL**(実測 99 行)。
> `kg.js query ''` は行形式で `--json` が無い。**直読みの方が速く、かつ完全**。

- KG のノード/エッジは JSONL の直読みを既定とする(`kg.js stats` は既定 JSON なので補助に使ってよい)。
- `nodes.jsonl` を FR-11 の規則で監視し、「記憶が増えた瞬間」を捉える。
- **`~/.claude` へは書き込まない**(N-4)。読むだけ。

**AC-17a**: 行数の一致(第22条) — `node graph/pulse.js snapshot --json` の `counts.kgNodes` が
`wc -l < ~/.claude/paradise-kg/nodes.jsonl` と一致し、`counts.kgEdges` が `wc -l < ~/.claude/paradise-kg/edges.jsonl` と一致する。
**AC-17b**: engine との突合 — 同 `counts.kgNodes` が `node graph/kg.js stats | node -e "…JSON.parse…nodes"` と一致する。
**AC-17c**: 壊れた行への耐性 — JSONL の末尾に不完全な行(改行なしの途中書き)がある状態でも
`node graph/pulse.js snapshot --json; echo $?` が `0` を返し、`counts.kgNodes` が**解釈できた行数**になること。
**AC-17d**: 書き込み禁止 — `node tests/dashboard-no-deps.test.js` が `graph/pulse.js` に
`~/.claude` 配下への `writeFile` / `appendFile` / `mkdir` が **0 件**であることを assert。
**AC-17e**: 追記の検知 — テストが `nodes.jsonl` の複製に 1 行追記し、デバウンス後 1 回だけ更新イベントが出ること(FR-11 と共通)。

---

### FR-18 — 教訓は `lessons.js export --out` を源とする
> **由来**: R-17。`list` は人間向け、**`export --out` だけが `{id,label,check,applies,kind,ts}` の完全 JSON**(65 件)。
> `kind` は `mechanism` / `conduct` の 2 値(第28条: 規範の教訓は grep で裁けない)。

- 教訓の取得は `export --out <一時ファイル>` を使い、**`list` の出力を正規表現でパースしない**。
- 一時ファイルは `$LOCALAPPDATA/Temp` 配下に作り、**読了後に必ず削除する**(作業屑を残さない)。
- `kind` の 2 値で分けて件数を出す。

**AC-18a**: 源の証明 — `grep -c "lessons.js list" graph/pulse.js` が `0`、`grep -c "lessons.js export\|export --out" graph/pulse.js` が `1` 以上。
**AC-18b**: 件数の一致 — 断面の `counts.lessons` が
`node graph/lessons.js list | grep -c '^' ` 相当の件数と一致する(またはより厳密に、export した JSON の要素数と一致する)。
**AC-18c**: 屑を残さない — `node graph/pulse.js snapshot --json > /dev/null` の前後で
`ls "$LOCALAPPDATA/Temp" | grep -c "pd-lessons\|pulse-lessons"` の値が**変わらない**こと。
**AC-18d**: 2 値の網羅 — 断面の `lessonsByKind` の鍵集合が `mechanism` と `conduct` を含み、
その合計が `counts.lessons` と一致する。

---

### FR-19 — 門(トップ)から全機能へ導線を張る
> **由来**: R-11。実測: `index.html` の `a[href]` は **0 本**、`control.html` も **0 本**(教主 §8)。
> control.html にも atlas 6 枚にも**辿り着けない**。

**トップ(門)に置くもの**(上から順、これが「門」の定義):

1. **経路バッジと鮮度**(FR-07/FR-08)— `data-transport` と `data-freshness`。**画面の一番上、常時可視**。
2. **走行中の環**(FR-14)— 走行中があれば最上位に、無ければ「走行中の環はありません」の空状態(FR-20)。
3. **数の看板**(FR-01/FR-02)— 条数 / engine 数 / 創造物数 / 作業場数 / agents / commands / skills / 教訓 / KG。
4. **門の合否**(FR-15)— 5 門の一列。
5. **点数と起動実績**(FR-13)— run ごとの並置。
6. **日次ノルマ**(FR-16)。
7. **道の形**(FR-21)。
8. **全画面への索引** — `control.html` と `atlas/*.html` 6 枚への完全なリンク集。

- **導線の保証規則**: `dashboard/` 配下の全 `*.html`(`atlas/` を含む、`*.visual-check.html` は除く)が
  `index.html` から **1 ホップ**で到達できること。孤児 0。
- Zylos の設計則に従い、「数の看板」と「走行中の環」は**別領域**に分ける(Activity Panel の分離)。

**AC-19a**: 孤児ゼロ — `node tests/dashboard-links.test.js` (新設) が、
`dashboard/**/*.html`(`*.visual-check.html` 除く)の集合と `index.html` の `a[href]` 参照先の集合を比較し、
**到達不能なページが 0 件**であることを assert して exit 0。
**AC-19b**: リンクの実数 — `grep -oE 'href="[^"]*\.html"' dashboard/index.html | sort -u | wc -l` が
`ls dashboard/*.html dashboard/atlas/*.html 2>/dev/null | grep -v visual-check | grep -v 'index.html' | wc -l` と**一致**する(第22条)。
**AC-19c**: 死リンクゼロ — 同テストが各 `href` の実ファイル存在を確認し、欠落 0 件。
**AC-19d**: 相互性 — `control.html` と atlas 6 枚のそれぞれから `index.html` への戻りリンクが 1 本以上ある
(`grep -c 'href="\.\./index.html"\|href="index.html"'` が各ファイルで 1 以上)。
**AC-19e**: 8 領域すべてが存在 — `grep -o 'data-panel="[a-z-]*"' dashboard/index.html | sort -u | wc -l` が `8` 以上。

---

### FR-20 — 空・読み込み中・エラー・接続断の 4 状態をすべて設計する
> **由来**: R-12 + 第18条a「設計されていない状態は誰も見ていない状態」。
> Zylos:「**displaying 'Agent is working...' is not transparency**」「just a spinning indicator and hope」。
> → **スピナーは禁じ手。何を待っているかを名指しせよ。**

各パネル(`data-panel`)は次の 5 状態を持ち、**いずれか 1 つを必ず表示する**:

| 状態 | `data-state` | 表示の規則 |
|---|---|---|
| 通常 | `ready` | 値と出所(どの engine 由来か)を出す |
| 空 | `empty` | 「無い」ことを言い切る文言(例「走行中の環はありません」)。0 と空を区別する |
| 読み込み中 | `loading` | **待っている対象を名指しする**。`data-awaiting="<engine名>"` が必須。予想所要が既知なら併記(例「census を待っています(最大 120 秒)」) |
| エラー | `error` | 失敗した engine 名 + 理由 + 直前に成功した時刻。**全画面を落とさない**(そのパネルだけ) |
| 接続断 | `disconnected` | 経路(`sse`/`poll`)が落ちたこと + 降格先 + 最終成功時刻からの経過 |

**AC-20a**: 全パネル × 5 状態の網羅 — `node tests/dashboard-states.test.js` (新設) が
`data-panel` を持つ全要素について、5 つの `data-state` 値それぞれに対応するマークアップ/分岐が存在することを assert し exit 0。
**AC-20b**: スピナー禁止 — `data-state="loading"` の要素がすべて **非空の `data-awaiting` 属性**を持つこと。
同テストが「読み込み中」「Loading」「…」だけで `data-awaiting` の無い要素を **0 件**と assert する。
**AC-20c**: 名指しの妥当性 — 各 `data-awaiting` の値が、`ls graph/*.js | sed 's|.*/||;s|\.js$||'` の集合に含まれること(架空の名を待たない)。
**AC-20d**: 局所故障 — `PULSE_FAULT=wiring` で断面を取ったとき、
`node tests/dashboard-states.test.js --fault wiring` が「wiring パネルのみ `error`、他は `ready`」を assert する。
**AC-20e**: 空と 0 の区別 — run が 1 件も無い状況を合成したとき、走行中パネルが `data-state="empty"` であり、
数値 `0` を表示するだけの `ready` に**ならない**こと。

---

### FR-21 — 道 (scale) の形を可視化する — 6 つの道すべて
> **由来**: R-25 + **findings-speed.md**。実測された道ごとの相数:
> ```
> quick 6 / standard 14 / full 17 / reform 11 / counsel 6 / cartography 11
> ```
> **`index.html` が「Live Graph Execution」と称して描く 4 タスク DAG は、この 6 つのどれとも一致しない架空物である。**
> **道の形そのものがダッシュボードに映せる事実**。

- **6 つの道すべて**の相数と gates 列を画面に出す。現在走行中の run については、その run が乗っている道を強調する。
- 源は `forge.buildDag(wish, '<scale>')`(**第2引数は文字列** — FR-01 の罠表)。ハードコードしない。
- 現行の架空 4 タスク DAG は撤廃する(FR-02 AC-02c と重複して守る)。

**AC-21a**: 数の一致(第22条) — 6 つの道すべてについて、断面の `scale.<name>.phases` が
`node -e "const f=require('./graph/forge.js');console.log(f.buildDag('x','<name>').tasks.length)"` と一致する(6/6)。
執筆時点の実測基準: quick **6** / standard **14** / full **17** / reform **11** / counsel **6** / cartography **11**。
**AC-21b**: 網羅 — 断面の `Object.keys(scale).length` が、forge が知る道の総数と一致すること(実測基準 **6**)。
架空の道を足しても、実在する道を落としてもならない。
**AC-21c**: ハードコード禁止 — `grep -cE "'(discover|specify|design|prove|verify|reflect|verdict)'" dashboard/paradise.js` が `0`、
かつ `grep -cE "\b(6|11|14|17)\b" dashboard/paradise.js` に相数リテラルが現れないことをテストが assert する。
**AC-21d**: 願いの分類 — `node graph/forge.js scale "ダッシュボードを生きた門にせよ"` が `reform` を返し、
断面の `scale.classifierAvailable` が `true` であること。
**AC-21e**(架空 DAG の撲滅): 断面の道の相数集合に一致しない DAG が画面に存在しないこと —
`node tests/dashboard-no-hardcode.test.js` が、画面が描く任意の DAG のタスク数が
`Object.values(scale).map(s=>s.phases)` のいずれかと一致することを assert する(**4 は含まれないので現行 DAG は落ちる**)。

---

### FR-22 — `gauge baseline` を使わず `ledger` のみを源とする
> **由来**: R-29。実測: `baseline` は `ledger` とほぼ同一の表示だが**タイムスタンプが再計算される**
> (`2026-09-02T07:03` になった)。**取り違えの罠**。

- ダッシュボードは `gauge.js ledger` のみを点数履歴の源とし、**`baseline` を呼ばない**。
- 履歴の各行に、その時刻が **ledger 記録時刻**であることを明示するラベルを付ける。

**AC-22a**: `grep -c "gauge.js baseline\|gauge baseline" graph/pulse.js dashboard/*.js dashboard/*.html` の合計が `0`。
**AC-22b**: 件数の一致 — 断面の `ledger.length` が `node graph/gauge.js ledger | grep -cE '^\s+[0-9]{4}-'` と一致する(実測 5 件)。
**AC-22c**: 出所ラベル — `grep -c 'data-source="gauge-ledger"' dashboard/index.html` が `1` 以上。

---

### FR-23 — 検器 `motion-probe.mjs` の資源漏れを止める【engine 修正・第50条の裏面】
> **由来**: findings-base-red.md B-1〜B-5 / PRE-01・PRE-02。
> `graph/motion-probe.mjs:84-86` の `finally` が `browser.child.kill()` しか呼ばず、
> 描画器が**正規の後始末として公開している** `browser.close()` を使っていない。
> `close()` は (1) SIGTERM → 1500ms 後 **SIGKILL エスカレーション**、(2) `fs.rmSync(this.profileRoot)` を行う
> (`overlay/vendor/archify/bin/visual-check.mjs:475`)。
>
> 結果、headless Chrome が生き残り一時プロファイルが積み上がる。**実測: 483 → 519 → 529 と単調増加。**
> 検器 1 回の走行で **+2 個**漏れることを差分で実測済み(`prove-leak.js`: BEFORE 527 → AFTER 529)。
> `atlas.js check` は 6 主題を回すため、門を 1 回通すだけで十数個が積まれる。
> 残った Chrome が握るファイルが次の走行の `file://` 参照を `net::ERR_FILE_NOT_FOUND` にし、
> 「atlas: 門は己の残骸で落ちない (第21条)」を**不定に**赤くしていた。
>
> **第50条(d)「借り物の作法は借り物の正典に問う」** — 描画器は正しい後始末を公開していたのに、
> 検器はそれを読まずに自前の半端な kill を書いた。**用意されている作法を読まずに書いた一行が、門を不定に赤くした。**
>
> **第50条の双子として位置づける**:
> - 表: 「門が見ていない機能は壊れても鳴らない」 → G-05(CI がダッシュボードを見ていない)
> - 裏: 「**門が己の残骸で不定に鳴る**」 → 本要件

- `graph/motion-probe.mjs` の `finally` を `await browser.close()` に改める。自前の `child.kill()` は撤廃する。
- 本改修が G-05 で visual-verify / motion-probe を CI に載せる以上、**漏れを抱えたまま門を増やせば CI が己の残骸で不定に赤くなる。** 直すのは本改修の責務である(X-6 の撤回)。

> **⚠ この要件の AC は、症状ではなく原因を数える。**
> 漏れが 529 個まで悪化した状態で自己診断は **0 failed を出した**。
> ゆえに「`node tests/paradise.test.js` が 0 failed」を**唯一の**受入基準にしてはならない(本書の掟 4)。

**AC-23a**(作法を使っていること — B-1): `grep -c "child.kill()" graph/motion-probe.mjs` が `0`、
かつ `grep -c "browser.close()" graph/motion-probe.mjs` が `1` 以上。
**AC-23b**(**本命** — 原因を数える / B-2・B-5): 検器を **1 回**走らせる前後で
`ls "$TEMP" | grep -c "archify-visual-check-profile"` の**差が 0**。
```
BEFORE=$(ls "$TEMP" | grep -c "archify-visual-check-profile")
node <検器を1回だけ走らせる>
AFTER=$(ls "$TEMP" | grep -c "archify-visual-check-profile")
test $((AFTER - BEFORE)) -eq 0
```
修正前の同じ手順は **+2** を返す(実測: 527 → 529)。**この差分こそが判定である。**
**AC-23c**(Chrome を残さない): 同じ前後で
`powershell -c "(Get-Process chrome -EA 0 | Where-Object {$_.CommandLine -match 'headless'}).Count"` 相当の
headless プロセス数の**差が 0**。
**AC-23d**(門が漏れを数える — B-5): 新設テスト `tests/motion-probe-leak.test.js` が
AC-23b と同じ差分計測を行い、差が 0 でなければ **exit 1** すること。
**AC-23e**(壊して鳴る — B-4): `browser.close()` を `child.kill()` に戻すと
`node tests/motion-probe-leak.test.js` が **exit 1** になること。**緑を出すだけの門は、見ていない門と区別できない。**
**AC-23f**(症状側・補助): `for i in 1 2 3; do node tests/paradise.test.js 2>&1 | grep -cE '^✗'; done` が `0 0 0`。
※ **これは補助の AC である。** 単独で満たされても FR-23 の充足を意味しない(§2.0)。判定は AC-23b が下す。
**AC-23g**(atlas 一巡での累積 0): `node graph/atlas.js check --scale quick` を 1 回通した前後で
プロファイル数の差が **0**(6 主題を回しても十数個積まれないこと)。

---

## 3.2 非機能要件 (NFR)

### NFR-01 — 同期経路の応答は 1 秒未満(CLI) / 常駐サーバは 50ms 未満
> **由来**: R-02 + **S-1 / S-2**(findings-speed.md)。
> discover の「27〜73ms」は**子プロセス経由 = node 起動代**であり、engine の代金ではなかった。
> プロセス内実測: 初回 **7.4ms** / 2 回目以降 **0.53ms**。唯一 census.js が 120,072ms で桁違いに外れる。

- CLI 経路(`pulse.js snapshot --json`、node 起動代込み)は **1000ms 未満**。
- 常駐サーバ経路(`serve` の 2 回目以降の `/snapshot.json`)は **50ms 未満**(初回 require のコストは 1 回だけ)。
- 120 秒級の処理(census / 自己診断)は同期経路に置かない(FR-06 / S-2)。

**AC-N01a**: `for i in 1 2 3; do /usr/bin/time -f %e node graph/pulse.js snapshot --json > /dev/null; done` の
**3 回すべて**が 1.0 秒未満。
**AC-N01b**: 上限の機械検査 — `node tests/dashboard-perf.test.js` が断面生成を 3 回計測し、median が 1000ms 未満を assert して exit 0。
**AC-N01c**: 回帰の防止 — 同テストが `pulse.js` の呼ぶ engine 集合を出力し、その中に `census` / `paradise.test` が**含まれない**ことを assert。
**AC-N01d**(常駐の効き): `serve` 起動後、`/snapshot.json` を 5 回連続取得し、**2 回目以降 4 回すべてが 50ms 未満**。

### NFR-07 — サーバは engine を `require` で常駐させ、子プロセスを産まない
> **由来**: **S-1**(findings-speed.md)。子プロセス 27〜73ms に対し、プロセス内は 0.53ms。
> **子プロセスを産むのは engine の代金ではなく node 起動代を毎回払う設計である。**
> 前提は「毎秒ポーリング可能」ではなく **「毎フレーム再計算可能」**。

- snapshot 生成経路に `child_process`(`execFileSync` / `spawn` / `exec` / `fork`)を書かない。
- 例外は census(FR-06 / S-2)のみ。census を非同期で取る場合に限り子プロセスを許すが、
  その呼び出しは snapshot 経路の**外**に置き、結果はキャッシュする。

**AC-N07a**: `grep -cE "child_process|execFileSync|spawnSync|execSync" graph/pulse.js` が `0`。
census を非同期経路に置く場合は、その 1 箇所が `graph/pulse.js` **以外**のファイルにあること。
**AC-N07b**: 実測での証明 — AC-01i / AC-N01d(2 回目以降 50ms 未満)。
子プロセスを産む実装は node 起動代 27ms 以上を毎回払うため、この閾値を安定して満たせない。
**AC-N07c**: engine が module として読まれていること — `grep -cE "require\('\./(clergy|forge|workspace|kg)" graph/pulse.js` が `2` 以上。

### NFR-02 — 外部依存ゼロ・node 標準ライブラリのみ
> **由来**: R-06, R-09 + 楽園の掟。

- サーバ・クライアント・生成器のいずれも、CDN / Web フォント / npm パッケージを使わない。
- 例外は `http://www.w3.org` の SVG 名前空間宣言のみ(取得しない)。

**AC-N02a**: FR-10 の AC-10a / AC-10b(標準外 `require` 0 件、dependencies 0 件)。
**AC-N02b**: FR-12 の AC-12d(`www.w3.org` 以外の外部 http(s) 参照 0 件)。
**AC-N02c**: `node graph/vendor.js verify; echo "exit=$?"` が `exit=0` を返し、出力に
`✓ paradise stands on its own` が含まれること。

### NFR-03 — SSE の同時接続 6 上限を設計に織り込む
> **由来**: R-18。MDN:「the limit is **per browser** and is set to a very low number (**6**)」。
> HTTP/2 でない場合、**タブを 7 枚開くと 7 枚目が沈黙する**。

- 7 枚目以降のタブは、第1層が張れないことを **5000ms 以内に検知**して第2層へ降格する(FR-08 と同じ判定で足りる)。
- 降格した理由を利用者に告げる文言に「同時接続の上限」の可能性を含める。
- サーバ側は接続数を数え、`/snapshot.json` に `connections` として出す。

**AC-N03a**: サーバ側計数 — SSE 接続を 7 本張った状態で `GET /snapshot.json` の `connections` が
実際に張った本数と一致すること(node クライアントで機械検証。ブラウザ上限とは別に、サーバが数を持つことの証明)。
**AC-N03b**: 降格の実測 — 第1層が 5000ms 以内に張れない状況を合成し、
`node tests/dashboard-fallback.test.js` が `data-transport` が `poll` に落ちることを assert する。
**AC-N03c**: 文言 — `grep -c "同時接続" dashboard/index.html` が `1` 以上。
**AC-N03d**(prove 相): 実ブラウザで 7 タブ同時に開いての実測は discover 未実施(findings D)。prove 相で実測すること。

### NFR-04 — `fs.watch` のバッファ溢れから全面再走査で復帰する
> **由来**: R-27。The Node Book:「Windows reports this as `ERROR_NOTIFY_ENUM_DIR` … the safe recovery path is a **directory rescan**」。

- watcher が `error` を発した場合、**監視を張り直し、対象を全面再走査**して断面を作り直す。
- 復帰したことを画面に告げる(`data-state` が `disconnected` → `ready` へ)。

**AC-N04a**: `node tests/dashboard-watch.test.js` が watcher に合成 `error` を発火させ、
(1) プロセスが落ちない、(2) 再走査が 1 回行われる、(3) 新しい watcher ハンドルが張られる、の 3 点を assert。
**AC-N04b**: `grep -c "\.on('error'" graph/pulse.js` が `1` 以上。

### NFR-05 — 生成物の中身に依存した検査を書かない(第29条)
> **由来**: 楽園の掟。`dashboard/atlas/` と `dashboard/state.json` / `state.js` は gitignore された生成物。

- 本改修で追加するどのテストも、生成物の**中身**を assert しない。測るのは**生成器の性質**と、
  その場で走らせた 2 つの実出力の**一致**である。

**AC-N05a**: `node graph/derived.js check; echo "exit=$?"` が `exit=0` を返し、
`✓ no test asserts on derived content` が出ること。
**AC-N05b**: 新設した全テストファイルについて
`grep -c "state.json\|atlas/.*\.html" tests/dashboard-*.test.js` が `0`
(生成物のパスを直接読むテストが存在しない)。

### NFR-06 — 劣化しても嘘をつかない
> **由来**: R-05 の裏面 + 第18条。サーバが無くても画面は成立するが、**成立の仕方が違うことを隠さない**。

- 第3層(凍結)では、必ず `generatedAt` と経過を出し、`凍結` バッジを外さない。
- どの層であっても、**取得できなかった値を推測で埋めない**(空状態として出す — FR-20)。

**AC-N06a**: `node tests/dashboard-fallback.test.js` が第3層状態で
`data-freshness="frozen"` と `generatedAt` 表示の**両方**が存在することを assert。
**AC-N06b**: 推測禁止 — 断面に存在しない鍵に対応するパネルが `ready` に**ならない**こと(FR-20 の AC-20e と同一機構)。

---

## 3.3 画面の要件(まとめ・§3.1 への索引)

| 問い | 答える要件 |
|---|---|
| トップ(門)に何を置くか | **FR-19**(8 領域の順序を規定) |
| 全機能への導線をどう保証するか | **FR-19 AC-19a/b/c/d**(孤児 0・リンク実数の一致・死リンク 0・戻りリンク) |
| 「生 / 凍結」の表示規則 | **FR-07**(閾値 10,000ms / 60,000ms を数値で定義、境界値 6 通りを AC で全数検査) |
| 鮮度(最終更新からの経過) | **FR-07**(相対表記必須)+ **NFR-06** |
| 空 / 読み込み中 / エラー / 接続断 | **FR-20**(5 状態を `data-state` で機械可読にし、`data-awaiting` でスピナーを禁ずる) |
| 走行中の環 (conclave) | **FR-14**(`conclave.json` 直読み 1.0ms・engine 不要。取りこぼし 0 を AC-14b、停止中 run の可視化を AC-14e で強制) |
| エージェントの起動実績 (spawn-trace) | **FR-13**(gauge の点数と**同一カード内**に並置。exit 1 をエラー扱いしない) |
| 道の形 (6 つの scale) | **FR-21**(quick 6 / standard 14 / full 17 / reform 11 / counsel 6 / cartography 11。架空 4 タスク DAG を AC-21e で撲滅) |

---

## 3.4 却下した要求とその理由

| R-xx | 却下理由 |
|---|---|
| **R-20** — `spawn-trace.js report` が `run.json` 形式でクラッシュする欠陥の修理 | **教主が第27条に基づき実物照合し棄却済み**。`spawn-trace.js:86` は `for (const p of list \|\| [])` で既にガードされており、実在する run.json 6 件(creations 5 + 本 reform 1)すべてで `TypeError` の発生は **0 件**。再現しない欠陥を要件にしてはならない。ただし「全 run を舐めても落ちない」という**性質**は FR-14 AC-14c で恒久的に守る |
| **R-22** — `id:` と `Last-Event-ID` による差分再送 | **将来課題へ送る**(§7 F-1)。断面全体が数十 KB 規模であり、`127.0.0.1` 上での全量再送の実コストは実測ベースで無視できる。一方 `Last-Event-ID` は「サーバ側に版の履歴を持つ」設計を要求し、N-2(永続ストアを作らない)と衝突する。**便益が費用に見合わない**ため本改修では採らない。EventSource の自動再接続(MDN: 既定で restart)だけで可用性は足りる(FR-09) |

> **統合したもの**(却下ではない): R-19→FR-09 / R-23→FR-09 / R-26→FR-13 / R-28→FR-11。
> いずれも単独の要件にすると AC が親要件と重複するため、親の AC に条項として畳み込んだ。

---

# 4. リアルタイム要件(三層の切替仕様)

> **由来**: R-05, R-06, R-07, R-18, R-19, R-24 / B-1, B-3。
> 実装要件は FR-08(層)/ FR-09(SSE 形式)/ FR-10(サーバ)/ NFR-03(接続上限)に置く。本節はその**振る舞いの規定**である。

## 4.1 各層がいつ効くか

| 層 | 効く条件 | 更新の粒度 | 表示 |
|---|---|---|---|
| **第1層 SSE** | `graph/pulse.js serve` が動いており、`EventSource` が `open` した | 事実が変わった瞬間(fs.watch のデバウンス 80ms 後) | `data-transport="sse"` / バッジ「生 (SSE)」 |
| **第2層 ポーリング** | 第1層が使えない/落ちた が、`fetch` は通る(= `http://` で開いている、または SSE だけが失敗) | 2000ms 間隔 | `data-transport="poll"` / バッジ「生 (2秒ごと)」 |
| **第3層 埋め込み JS** | `fetch` が `TypeError`(Chrome の file:// は **network error**)/ `fetch` 未定義 / サーバ不在 | 再読込のときだけ | `data-transport="frozen"` / バッジ「**凍結**」 |

## 4.2 どう切り替わるか(降格・昇格の判定)

```
起動
 └→ EventSource を張る
      ├ open した                      → 第1層
      ├ 5000ms 以内に最初のイベント無し → 降格
      └ onerror が連続 2 回            → 降格
 降格 → fetch('/snapshot.json') を 2000ms 間隔
      ├ 成功                            → 第2層
      └ TypeError / 連続 2 回失敗       → 降格
 降格 → window.PARADISE_STATE を読む     → 第3層(凍結)

 昇格: 第2層・第3層のいずれにいても 30000ms ごとに第1層を再試行し、open したら第1層へ戻す
 再接続: 第1層内の一時切断は EventSource の既定動作に任せる(自前で書かない)。
         間隔はサーバが `retry: 1000` で指示する。
```

**判定に使う定数(1 箇所で定義し、二重に書かない)**:
`FIRST_EVENT_TIMEOUT_MS=5000` / `ERROR_STREAK=2` / `POLL_INTERVAL_MS=2000` / `PROMOTE_RETRY_MS=30000` / `RETRY_HINT_MS=1000` / `KEEPALIVE_MS=15000` / `WATCH_DEBOUNCE_MS=80`。

## 4.3 切り替わったことをどう伝えるか

1. **常時可視の経路バッジ** — 画面最上部に `data-transport` を反映したバッジ。3 値のいずれかを必ず表示する。
2. **降格/昇格の一行ログ** — 切替が起きるたびに「`HH:MM:SS` SSE → ポーリング(理由: 最初のイベントが 5 秒来なかった)」形式の行を追記する。最新 10 行を保持。
3. **鮮度との連動** — 降格しても経過(FR-07)は止めない。第3層に落ちた瞬間、鮮度は必ず `frozen` になる。
4. **スピナーを出さない** — 切替中は `data-state="disconnected"` とし、`data-awaiting` に待っている対象(`pulse.serve`)を名指しする(FR-20)。
5. **上限の示唆** — 降格理由が「接続できない」の場合、文言に SSE の同時接続 6 上限の可能性を含める(NFR-03)。

**本節の AC**: FR-08 AC-08a〜08c / FR-09 AC-09a〜09e / FR-10 AC-10c / NFR-03 AC-N03b/c。
加えて:
**AC-RT-1**: 一行ログの実在 — `grep -c 'data-log="transport"' dashboard/index.html` が `1` 以上。
**AC-RT-2**: 定数の一元化 — `node tests/dashboard-transport.test.js` が上記 7 定数の定義箇所がそれぞれ **1 箇所**であることを assert して exit 0。
**AC-RT-3**: 降格ログの内容 — `tests/dashboard-fallback.test.js` が降格発生後にログ行が 1 行以上増え、その行が**理由の文字列**を含むことを assert。

---

# 5. engine 側の修正要件(まとめ・§3.1 への索引)

| 欠陥 | 実測された症状 | 要件 |
|---|---|---|
| `census.js:75` の `path.join(ROOT,'creations')` | 実在 8 件を **0 件**と報告 | **FR-03** |
| `export-state.js:32` の同上 | `state.json` の `creations.length` が **0** | **FR-03** |
| `workspace.js:112` の正規表現が `path.join` 形式を見逃す | `workspace.js check` が **exit 0(緑)**を出しながら上記 2 件を素通り。第30条を機械強制しているつもりで、できていなかった(教主 §1) | **FR-04** |
| `census.js:43-44` が自己診断を子プロセスで丸ごと回す | **120,072ms**(timeout:120000 で打ち切り)。自己診断は単体 282 秒。画面が 2 分固まる | **FR-06** / **NFR-01** |
| `--json` が無視される engine 3 つ | `clergy college` / `conclave status` / `daily-guard status` は フラグ有無で出力が **1 バイトも変わらない** | **FR-05** |
| `daily-guard due` の exit 1 | exit 1 が「債務なし」。成否と誤読すると赤く光る | **FR-16** |
| `spawn-trace report` の exit 1 | exit 1 が「起動証跡なし」という**事実**。エラーではない | **FR-13 AC-13c** |
| atlas 生成器の Google Fonts 3 行 | 生成物 6 枚 × 3 = 18 箇所が外部へ実取得 | **FR-12** |
| `motion-probe.mjs:84-86` が `browser.close()` を使わず `child.kill()` だけを呼ぶ | 一時プロファイルが **483 → 519 → 529** と単調増加。検器 1 回で **+2**。第21条テストが**不定に**赤くなる(第50条の裏面) | **FR-23** / **G-09** |
| engine を子プロセスで呼ぶ設計 | node 起動代 27〜73ms を毎回払う。プロセス内なら **0.53ms**(実測 137倍差) | **NFR-07** / **FR-01** |

**engine 修正に共通する AC**:
**AC-E1**: すべての engine 修正の後、`node tests/paradise.test.js` が **exit 0**。
※ **これは補助の AC である**(§2.0)。この赤は不定であり、漏れが 529 個まで悪化した状態でも緑を出した。
**engine 修正の充足判定は、各 FR の「原因を数える AC」が下す**(特に FR-23 AC-23b)。
**AC-E2**: `node graph/wiring.js check --json | node -e "…JSON.parse…ok"` が `true`(新 engine `pulse.js` も含めて結線が切れていない)。
**AC-E3**: `node graph/pulse.js snapshot --json` の `counts.engines` が `ls graph/*.js | wc -l` と一致する — **pulse.js 自身を数えた新しい値**で一致すること(固定値 33 と比較しない。第22条)。

---

# 6. 門(ゲート)の要件 — CI が自動で守るもの

> **由来**: 教主 §6。`.github/workflows/tribunal.yml` 全 207 行のうちダッシュボードに触れるのは
> `node graph/atlas.js check --scale "$s"` の **1 行のみ**。`index.html` / `control.html` は
> **visual-verify も critic も一度も通っていない**。
> **第50条: 門が見ていない機能は、壊れても鳴らない。**

本改修の完了時点で、CI が**自動的に**守るようになるもの:

| # | 門が守る性質 | 実装 | 受入基準 (AC) |
|---|---|---|---|
| **G-01** | **画面の数が嘘をつかない** — 断面の数と実地の数が一致し続ける(第22条) | `tests/dashboard-count.test.js` を `paradise.test.js` から呼ぶ + tribunal.yml に追加 | **AC-G01a**: `node tests/paradise.test.js 2>&1 \| grep -c "count.*一致\|dashboard-count"` が `1` 以上。<br>**AC-G01b**(壊して鳴る): `graph/pulse.js` の `counts.engines` を故意に +1 すると `node tests/paradise.test.js` が **exit 1** になる |
| **G-02** | **外部依存が再び生えない** | `tests/dashboard-no-deps.test.js` | FR-12 AC-12d の grep を CI で実行し、`fonts.googleapis` を `overlay/vendor/archify/assets/template.html` に 1 行戻すと CI が **exit 1** になること |
| **G-03** | **住所の直書きが `path.join` 形式でも咎められる**(教主が見つけた穴) | `graph/workspace.js` の検出規則拡張 + 回帰テスト | FR-04 AC-04a/AC-04d(合成の見本で exit 1 → 削除で exit 0)。CI の `workspace.js check` ステップが tribunal.yml に存在すること: `grep -c "workspace.js check" .github/workflows/tribunal.yml` が `1` 以上 |
| **G-04** | **孤児ページが生まれない**(導線が切れない) | `tests/dashboard-links.test.js` | FR-19 AC-19a/b/c。新しい `dashboard/*.html` を追加してリンクを張らないと CI が **exit 1** |
| **G-05** | **ダッシュボードが visual-verify と critic を通る**(第50条の直接の是正) | tribunal.yml に `index.html` / `control.html` への `visual-verify` と `critic` を追加 | **AC-G05a**: `grep -cE "visual-verify\|critic.js" .github/workflows/tribunal.yml` が **2 以上**。かつ `grep -c "dashboard/index.html\|dashboard/control.html" .github/workflows/tribunal.yml` が `1` 以上。<br>**AC-G05b**(壊して鳴る): `dashboard/index.html` に外部 CDN の `<link>` を 1 行入れると critic が **exit 1** になること。**緑を出すだけの門は、見ていない門と区別できない** |
| **G-06** | **ハードコード数値が再発しない** | `tests/dashboard-no-hardcode.test.js` | FR-02 AC-02a/b/c。`dashboard/paradise.js` に `v: 2` を 1 行戻すと CI が **exit 1** |
| **G-07** | **同期経路が遅くならない** | `tests/dashboard-perf.test.js` | NFR-01 AC-N01b/c。`pulse.js` に `census` の呼出を 1 行足すと CI が **exit 1** |
| **G-08** | **生成物の中身を前提にした検査が混入しない**(第29条) | 既存の `derived.js check` を CI で維持 | **AC-G08a**: NFR-05 AC-N05a/b。`grep -c "derived.js check" .github/workflows/tribunal.yml` が `1` 以上。<br>**AC-G08b**(壊して鳴る): 新設テストのいずれかに `require('../dashboard/state.json')` を 1 行入れると `derived.js check` が **exit 1** になること |
| **G-09** | **門が己の残骸で不定に鳴らない**(第50条の裏面) — 検器の資源漏れを**数える** | `tests/motion-probe-leak.test.js`(新設)を `paradise.test.js` + tribunal.yml から呼ぶ | FR-23 AC-23b/d/e。**症状(0 failed)ではなく原因(プロファイル数の差分)を裁く。** `browser.close()` を `child.kill()` に戻すと CI が **exit 1** |
| **G-10** | **engine が子プロセス化して遅くならない**(S-1 の恒久化) | `tests/dashboard-perf.test.js` に統合 | NFR-07 AC-N07a/c。`pulse.js` に `execFileSync` を 1 行足すと CI が **exit 1** |

**門の要件に共通する掟**:
- **すべての G-xx は「壊してみて赤くなること」を AC に含む。** 緑を出すだけの門は、見ていない門と区別できない(第50条)。
- 新設テストはすべて `tests/paradise.test.js` から呼ばれ、単独でも `node tests/dashboard-*.test.js` として走ること。
- 新設テストの合計実行時間は **60 秒未満**(自己診断 282 秒をこれ以上伸ばさない)。
  **AC-G-common**: `time node tests/dashboard-count.test.js tests/dashboard-links.test.js …` の合計が 60 秒未満。

---

# 7. やらないこと / 将来課題

## 7.1 本改修でやらないこと(理由付き・§1.2 の再掲を含まない)

| # | やらないこと | 理由 |
|---|---|---|
| X-1 | `tests/paradise.test.js` の 282 秒を短縮すること | 本改修の目的ではない。FR-06 で**同期経路から外す**ことで問題は解消する。短縮は別の reform 案件 |
| X-2 | `census.js` の全面書き換え | 触るのは 2 点のみ — 住所(FR-03)とテスト実行の任意化(FR-06)。engine の作り直しは第23条の別の道 |
| X-3 | atlas 6 枚の visual-verify の「5 gap + 1 smell」の是正 | discover で未実行(findings D)。本改修は**外部依存の除去**(FR-12)と**CI に載せること**(G-05)までを担い、個々の gap の是正は G-05 が鳴らした後の別件 |
| X-4 | ダッシュボードの肌(視覚同一性)の決定 | design 相の裁量(N-8)。教主 §5 の候補(`wired [editorial]` 等)は design への申し送りに留める |
| X-5 | `orchestrator.js` / `synod.js` / `critic.js` / `verdict.js` の計測と改修 | discover で未計測(副作用として run 状態を書き換えるため見送られた) |
| X-6 | ~~headless Chrome 一時プロファイル 412 個の掃除~~ **【教主により撤回 — 本改修の範囲に戻す】** | PRE-02 参照。漏れは進行中の欠陥(483→529、検器1回で+2を実測)であり、根因は `motion-probe.mjs:85` が `browser.close()` を使っていないこと。本改修は G-05 で visual-verify / critic を CI に載せる以上、**漏れを抱えたまま門を増やせば CI が己の残骸で不定に赤くなる**。直すのは本改修の責務である |

## 7.2 将来課題(次の道へ送るもの)

| # | 課題 | 送り先 |
|---|---|---|
| **F-1** | `Last-Event-ID` による差分再送(R-22) | 断面が数百 KB を超えるか、`127.0.0.1` 以外で使う日が来たら再検討 |
| **F-2** | 第45条(発令者リース)の保持者をダッシュボードから読めるようにする | `daily-guard status --json` に保持者欄が無い場合、engine 側に足す別件。**本改修では推測で欄を作らない**(FR-16 AC-16d) |
| **F-3** | ダッシュボードからの操作(run 起動・裁定)| N-5。観測の門が固まってから |
| **F-4** | HTTP/2 化による SSE 同時接続上限の解消 | node 標準の `http2` で可能だが、証明書の扱いが増える。上限 6 が実害になってから |

## 7.3 prove 相へ必ず渡す未確認事項(discover の正直な申告を引き継ぐ)

| # | 未確認事項 | 誰が確かめるか |
|---|---|---|
| **U-1** | **`file://` の HTML から `http://127.0.0.1` への EventSource が実際に繋がるか。** B-3 の記述は仕様と文献からの**論理的帰結**であって実測ではない | **prove 相・実ブラウザ(Brave)**。FR-08 AC-08d。繋がらない場合、第1層の発動条件を「`http://` で開いたときのみ」に狭める |
| **U-2** | SSE 同時接続 6 上限の実挙動(7 タブ同時) | prove 相。NFR-03 AC-N03d |
| **U-3** | daily-guard のリース(claim/release)の状態が読めるか | prove 相。ただし `claim` は排他リースを取得する副作用があるため、**実行するなら他プロセスが走っていないことを確認してから** |
| **U-4** | atlas 6 枚の visual-verify の 5 gap + 1 smell の内訳 | G-05 が CI に載った後、最初の赤で判明する |

---

# 8. 完了の定義 (Definition of Done)

本改修は、次の**すべて**が満たされたときに完了とする。

1. **PRE-01〜PRE-03 が満たされている。** ただし判定は **症状ではなく原因**で下す —
   「`node tests/paradise.test.js` が 0 failed」だけでは足りない(漏れ 529 個の状態でも緑が出た)。
   **FR-23 AC-23b(検器 1 回の前後でプロファイル数の差 0)が着工と完了の両方の門である。**
2. FR-01〜**FR-23** の全 AC が実出力で満たされている。
3. NFR-01〜**NFR-07** の全 AC が実出力で満たされている。
4. **G-01〜G-10** の門が CI に載っており、**それぞれ「壊すと赤くなる」ことが実証されている**。
5. `node graph/pulse.js snapshot --json` の `counts.engines` が `ls graph/*.js | wc -l` と一致する(第22条)。
   同様に `counts.cardinals` が **7**(第47条bの予言)、`counts.creations` が実地の数と一致する。
6. `dashboard/index.html` から全ページへ 1 ホップで到達でき、孤児 0。
7. サーバを止めた状態で `file://` から開いても画面が成立し、**`凍結` と正直に名乗る**。
8. サーバが `require` で engine を常駐させており、`/snapshot.json` の 2 回目以降が **50ms 未満**(NFR-07)。
9. 途中で止まった run(執筆時点では `reform-claude-md-diet` 5/11 相)が画面上で**完了と区別されて**見えている。
10. U-1〜U-4 が prove 相の成果物に記録されている(未確認のまま verdict へ進まない)。

**この改修の第一の受入基準は、findings.md E-3 が指した一行に尽きる:**
> **画面に出る全ての数が、その場で走った engine の出力と一致すること。**

**そして本書が加えた第二の掟は、教主の実測が教えた一行である:**
> **不定に鳴る門の受入基準は、症状ではなく原因を数える形で書け。**
> 緑を見て「直った」と報告することは、第16条より悪い —— **判定が緑でも欠陥は在りうる。**
