# requirements.md — CLAUDE.md の減量 (法は機構に、周知はダッシュボードに)

神託: CLAUDE.md は憲法の写経場ではない。hooks/skills/agents/rules 等ベストプラクティスに
従った場所で遵守させ、神への周知はダッシュボードで足りる。

## AC-1: CLAUDE.md は「最初の1画面」に痩せる
- 目標 ≤ 4,000 B (現 10,780 B、外界推奨帯 170〜500 tokens に接近)。
- 残すもの (litmus: 消すとコードから回復できない誤りが起きる行のみ):
  役割と言語 / どこを読むか (codex index・CONSTITUTION) / 門の起動地図 (圧縮) /
  機械強制されていない判断則 (subagent不信・ブラウザ閉鎖・欠陥=パイプライン欠陥) /
  reform の道への入口。
- 消すもの: 憲法38条の要約表 (45.7%) → `codex.js index` を指す1行に /
  数値の自己申告 (tests数・条数) → census/dashboard に委譲 /
  機械強制済みの掟の写経 → 「何が機械で強制されているか」の地図1行ずつに /
  創造物の掟の詳細 → 機構へ移す (AC-2)。

## AC-2: 創造物の掟は散文から機構へ (第33条)
- toISOString 禁止・外部依存(CDN)禁止 → **critic.js の決定的 check (gap)** に昇格。
  DOMAIN マーカー → smell。creations の各 html/実装を grep で裁く。
- identity.md/ux.md の掟は既に forge.js の相 goal に埋込済み (追加不要を確認)。

## AC-3: 数の門は方針転換に追従する (第36条)
- census の CLAUDE.md 数値 claim 3 行を撤去 (数を書き続ける前提の門は新方針で嘘になる)。
- 代わりに **diet 門**: CLAUDE.md が予算 (4,096 B) を超えたら census check が落ちる。
  volatile な数 (自己診断N件/憲法N条) が CLAUDE.md に再侵入しても落ちる。
  ※ 値でなく不変量を固定 (「CLAUDE.md は数値台帳ではない」)。

## AC-4: prove — 門を壊して鳴らす (第21条)
- 太った CLAUDE.md (合成) → diet 門が鳴る / 数の再侵入 → 鳴る / 現物 → 緑。
- toISOString 入り creation → critic が名指す / 無し → 沈黙。CDN 参照も両方向。

## AC-5: 全門緑 + 憲法第39条 + 文書更新
- 素の環境含む全テスト緑。憲法に「常時読まれる散文は最初の1画面である」を追記。
- README の該当節・codex index 再生成・census 収束。
