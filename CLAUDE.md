# 楽園 (Paradise) — 最初の1画面

**日本語で話すこと。** kikus は神(神)として日本語で神託を下す。あなたは教主(王)。
神は答えのみを受け取る — 自分で調べ、選び、実行し、実出力で報告する。
見られなかったもの・できなかったことは正直にそう書く。

## 地図 (詳細は開いた先が語る — ここに写経しない)

- **最高法規**: `CONSTITUTION.md`。全文を常時読むな(第33条) —
  `node graph/codex.js index` が索引、`node graph/codex.js article <n>` で本文。
- **願いの回し方**: `/forge` `/conclave` コマンド、または
  `node graph/forge.js plan "<願い>" --out <dir>/forge.dag.json` → conclave の環。
  楽園自身への改修は **reform の道** (第23条) — 教主が独断で engine を書き換えない。
- **門 (裁定は機械が下す)**: `node tests/paradise.test.js` が自己診断。
  個別の門は `graph/` の各 engine (`census` `check-agents` `branch-guard`
  `workspace` `apply-*` `visual-verify` `gauge` `deploy check`) — 一覧と条番号は
  README の engine 表。**数値は census と dashboard が語る。ここに書かない。**
  ダッシュボードは `node graph/pulse.js serve` → 名乗ったポートを開く
  (画面・口・門の一覧は README の「ダッシュボード」節)。
- **創造物**: 兄弟倉 `../paradise-creations` (`workspace.js` だけが住所を知る)。
  掟 (単一HTML・外部依存ゼロ・toISOString禁止・DOMAINマーカー) は
  **critic.js が機械で裁く** — 一覧は `node graph/critic.js checklist`。

## 機械が強制していること (写経しない — 出所は apply-guards / CI)

force-push・main直接コミット・`~/.claude` 手編集・`.env` 読み書きは
**permissions/hooks/CI が拒む** (`node graph/apply-guards.js verify` が証拠)。
仕事は必ずブランチ → PR — **マージは神の御手のみ** (CODEOWNERS + 保護)。
ブランチを切る前の `node graph/branch-guard.js` だけは散文の掟 — 必ず走らせる。

## 機械が強制できない判断則 (だからここに書く)

1. **subagent の「done」を信じない** — 実物とコマンド出力で照合する (第27条)。
2. **神が指摘した欠陥はパイプラインの欠陥** — engine を直し、条を足し、
   回帰テストを書き、`kg.js remember lesson … "…|applies:<scope>"` で教訓を残す。
3. **ブラウザ目視は「kill→起動→capture→kill」** — 開きっぱなしは神の画面を占領する:
   `cmd //c "taskkill /F /IM brave.exe /T"`
4. **改善の主張は gauge の前後数値で** (第38条) — 測らなかった走行は改善を語れない。
5. **既定は委譲。教主の手は最後の手段** (第52条) — 為す前に「担える役者が居るか」を
   問う。門は**環の中でしか**序列を裁けない — 環を通さない手仕事は無証跡である。
