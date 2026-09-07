# コードレビュー — reform/claude-md-diet (CLAUDE.md ダイエット改革・第39条)

レビュー対象: 作業ツリー上の差分 (ブランチ先端は main と同一、変更は未コミット)。
`git diff -- CLAUDE.md graph/census.js graph/critic.js tests/paradise.test.js CONSTITUTION.md README.md` 全文読了。
実走確認: `node tests/paradise.test.js` → **214 passed, 0 failed**、`node graph/census.js check` → exit 0。
CLAUDE.md 実測 2,643 B (予算 4,096 B 内)。

---

## (1) 2026 リトマス — 「その行を消すと、回復不能な誤りが起きるか」

### 新 CLAUDE.md の合格状況
大勢は良い。役割・言語、地図 (codex/forge/critic への指し示し)、機械化不能な判断則 4 つ — いずれも
リトマスを通る。10,780 B → 2,643 B、憲法 38 条の要約表 (旧ファイルの ~46%) を codex.js index への
1 行に畳んだのは第 33 条の趣旨そのものであり、正しい。

### リトマスに落ちる行 / 虚偽の行

- **【重大】「force-push・main直接コミット・`~/.claude` 手編集・`.env` 読み書きは permissions/hooks/CI が拒む (`apply-guards.js verify` が証拠)」**
  — この列挙のうち **「main直接コミット」だけは機械が拒んでいない**。実機の
  `~/.claude/settings.json` と `apply-guards.js` の POLICY を照合した:
  deny 9 件は force-push 系 / reset --hard / --no-verify / Edit(~/.claude) / .env のみで、
  **`git commit` を main 上で拒む permission も hook も存在しない**。ローカルで main に
  コミットする手は素通しである (止まるのは GitHub 側のブランチ保護、つまり push/merge 時)。
  findings.md 27 行目の「apply-guards deny 9件…で機械強制済み」という調査結論が誤りで、
  その誤りがそのまま CLAUDE.md に写った。これは apply-guards.js 冒頭コメントが告発した
  原罪 —「散文が『settings.json で自動強制されている』と嘘をつく」(第33・34条) — の再演である。
  旧 CLAUDE.md の掟 1「main へ直接コミットしない。必ずブランチ → PR」は
  **機構に守られていない散文の掟のまま削除された**。対処はどちらか:
  (a) 「機械が強制できない判断則」節に戻す (branch-guard と対にする)、または
  (b) 本当に機構化する (例: PreToolUse hook で main 上の `git commit` を拒む) してから
  この行を書く。現状の行は虚偽であり、そのままにできない。

- **【小】「数値は census と dashboard が語る。ここに書かない。」** — この掟は dietChecks が
  機械強制しており、第 33 条「散文と機構に同じ掟を二重に持たない」に照らすと写経に当たる。
  ただし「地図」としての 1 行なので許容範囲。指摘に留める。

### 削除されたが残すべきだった内容

- **【中】第 35 条の運用則**: 「司祭に『実機に apply するな』と命じるときは `deploy --write` も
  併せて禁じよ / 禁令はその道具が何を書くかで述べよ」。これは実事故から生まれた
  **機械化不能な判断則** (委任時の禁令の書き方) であり、apply-guards にも critic にも
  対応する機構はない。新 CLAUDE.md の「機械が強制できない判断則」節の趣旨に完全に合致するのに
  丸ごと消えた。1〜2 行で復活させるべき。
- **【小】「選択肢を示すなら、まず自分の推奨を述べてから問う」** — 機構化不能な様式則。
  消しても回復不能ではないが、神の様式 (答えのみ受け取る) の実装細則として安価に残せた。
- その他の削除 (門の一覧・条文表・モデル表・数値) は census/codex/README/clergy が語るので削除妥当。

---

## (2) dietChecks の正しさ

- **バイト vs 文字**: 正しい。`fs.readFileSync(p)` (encoding 指定なし) は Buffer を返し、
  `raw.length` は **バイト長**。日本語主体の UTF-8 で char 数と 3 倍近く乖離するところを
  正しくバイトで裁いている。テスト側も `fs.statSync().size` で突き合わせており整合。
- **正規表現の誤検知リスク**: 概ね低い。
  - `/憲法[:：]?\s*\*?\*?\d+\s*条/` は「憲法38条を参照」のような**正当な条文引用も捕らえる**。
    現ファイルは「第38条」表記 (「憲法」が前置しない) なので鳴らないが、将来
    「憲法39条」と書いた瞬間に誤検知する。許容できる保守性だが、条番号引用は
    「第\d+条」表記に限る、という慣行への依存であることは認識しておくこと。
  - `/自己診断[^\n]*\d+\s*件/` も「自己診断で 3 件の欠陥」のような散文に当たり得るが、
    CLAUDE.md 内でその文が書かれる蓋然性は低い。
- **【小・バグ】`fix()` との相互作用**: dietChecks の findings は `kind: 'stale'` を名乗るが
  `re` を持たない。`census.js fix` が走ると `text.match(undefined)` → 空正規表現が index 0 に
  マッチし、結果として **内容は無変化のままファイルを書き戻し「✏️ 予算超過: 5000 → 4096」と
  修正済みのように報告する**。実害 (破壊) は無いが虚偽報告である。diet findings は
  `kind: 'diet'` 等に分けて `fix()` が確実にスキップするようにすべき。

---

## (3) critic の isSelf 免除 — `.paradise-source` による脱法

- **【中】脱法可能である。** `critic.js:374` — `isSelf = opts.self || fs.existsSync(path.join(dir, '.paradise-source'))`。
  創造物ディレクトリに `.paradise-source` という空ファイルを 1 つ置くだけで、
  今回の創造物三法 (toISOString / 外部依存 / DOMAIN マーカー) に加え、既存の
  creationOnly 免除群 (tests-exist・AC 検査・visual-identity 等) まで**全て素通り**する。
  このマーカー判定は既存機構だが、本改革は「散文の掟は critic が機械で裁くから CLAUDE.md から
  消してよい」という論理の上に立つ — その裁きが 1 ファイルで無効化できるなら、
  掟の機構化という主張の土台が弱い。しかも司祭 (subagent) が build 中にこのファイルを
  置くことを妨げる機構は無い。
  対処案 (いずれか): マーカー由来の isSelf は **dir が楽園 ROOT 配下にある場合のみ**有効とする /
  creations 配下で `.paradise-source` を検出したらそれ自体を gap として名指す。
  第 27 条 (自己申告は証拠でない) の精神からも、ディレクトリの自己申告で法域を移れるのは矛盾。

- 免除ロジック自体の実装は正しい (`ctx.isSelf` は review() で必ず設定され、`--self` の
  engine 検査で kg.js 等の正当な toISOString を誤って裁かない。テストでも実証済み)。

---

## (4) 書き換えられた 2 テスト — 名前どおりの証明か

- **`CLAUDE.md exists and states the working language and the hard rules`** — **概ね可**。
  言語・PR/神マージ・apply-guards への指し示し・CONSTITUTION/codex への指し示し・
  機械化不能則の残存を検査しており、名前 (hard rules を「述べている」) と第 39 条の
  「指し示しでよい」への読み替えは整合。ただし `/apply-guards/.test(src)` は
  **指し示しの存在**を証明するだけで、指した先が本当にその掟を強制していることは
  証明しない — (1) の「main直接コミット」虚偽はこの門を素通りした。門の限界として認識せよ。
- **`census: a stale number in the documents is a failing gate (Art.22)`** — **名前と中身が乖離【中】**。
  旧テストは「CLAUDE.md の claim が実測と一致する」ことまで assert していた。新テストは
  (a) README テスト数 claim の**存在**と (b) CLAUDE.md に claim が無いこと、しか検査せず、
  **「腐った数を仕込んだら門が落ちる」ことをどこでも証明していない**。冒頭コメントの
  「わざと壊して試す」はもはや嘘である。README を一時改変して check() が findings を返すことを
  確かめるか、claims() のロジックを合成入力で直接検分する (diet 側のテストが取った手法) か、
  少なくともテスト名とコメントを実態に合わせるべき。
  なお隣の `every number the paradise currently claims is true` が現物一致は担保しているため、
  穴は「stale 検出能力の無検証」に限られる。
- 新規 4 テスト (diet 実物 / diet 合成 / 創造物三法の陽性・陰性 / self 免除) は良い。
  特に陽性 (CDN+toISOString を名指し) と陰性 (清い創造物を通す) の両方向を試すのは
  第 37 条の作法に適う。

---

## その他

- README の `214/194 pass` — 分母 194 が既に虚構めいているが census の claim regex は
  分子のみ照合する仕様で、既存の形式を踏襲しており本改革の責任範囲外。
- CONSTITUTION.md 第 39 条の条文は経緯・定石・帰結が明快で良い。CONSTITUTION.INDEX.md も
  差分に含まれており codex check の整合は census/テスト経由で担保されている。

---

## 裁定

骨格は正しい改革であり、テスト 214 件全通過・予算内も実証した。しかし
**(1) の「main直接コミットは permissions/hooks が拒む」が虚偽**である点は、
本改革自身が旗印とする第 33・34 条 (機構に無い掟を散文が強制済みと騙らない) への
違反であり、このまま main に入れられない。併せて (3) の `.paradise-source` 脱法と
(4) の stale 門のテスト名詐称を直すこと。

**差し戻し** (理由: ①「main直接コミット」を機械強制済みと記す虚偽記載 — 機構化するか判断則節へ戻す、② `.paradise-source` 1 ファイルで創造物三法を脱法できる isSelf 判定、③ stale-number 門テストが名前の主張「腐った数で門が落ちる」を証明していない。①③は小規模修正、②は判定の限定で対処可能 — 修正後の再審を推奨)
