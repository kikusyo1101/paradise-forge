# design.md — CLAUDE.md 減量の設計

## boundaries (2026 定石の適用)
| 種別 | 行き先 | 楽園での実体 |
|---|---|---|
| always-true (役割・言語・地図) | CLAUDE.md | 残す — 1画面 |
| 法の全文・要約 | on-demand | codex.js index / article (既設) — 指すだけ |
| safety-critical | hooks/permissions | apply-guards deny9/ask1 + branch-guard + CI (既設) — 写経を撤去 |
| scoped constraint (創造物の掟) | 検査器 | critic.js に決定的 check を追加 (新規) |
| 数値 (tests/条数/創造物数) | 門+周知 | census (数える) + dashboard export-state (神に見せる) — CLAUDE.md から撤去 |
| workflow (願いの回し方) | commands | /forge /conclave (既設) — CLAUDE.md はコマンド名のみ |

## 変える箇所
1. **overlay/root/CLAUDE.md** — 全面書換 (~3.5KB)。deploy --write で ~/.claude 側も再生成。
   ※ project CLAUDE.md は repo 直下 — これも同内容の役割別に書換。実測: repoの
   CLAUDE.md (10,780B) と overlay/root/CLAUDE.md (global 5,849B) は別物。両方痩せる。
2. **graph/critic.js** — checks に追加:
   - `no-wall-clock-iso` (gap): creation の js/html が toISOString( を含む → 名指し
   - `no-external-deps` (gap): html が http(s) の script/link/font/img src を含む → 名指し
   - `domain-markers-present` (smell): DOMAIN:START/END が無い
   ※ 対象は creation dir (--self では発火しない様に scope を切る — graph/*.js は
   toISOString を正当に使う)。
3. **graph/census.js** —
   - CLAUDE.md の数値 claim 3 行を削除
   - `dietChecks()` 新設: repo CLAUDE.md > 4,096B で fail / volatile 数値パターン
     (自己診断.*件|憲法.*条|\\*\\*\\d+ tests\\*\\*) の再侵入で fail。check() に合流。
4. **CONSTITUTION.md 第39条** + codex index 再生成 + README 更新。

## この変更で嘘になる既存の門 (第35条点検)
- census の CLAUDE.md claims → 撤去 (設計済)
- tests/paradise.test.js 内で CLAUDE.md の文言を前提にする試験が無いか grep → 対応
- deploy check → overlay/root/CLAUDE.md 書換後に --write で収束
- kg snapshot の SESSION START 文言は CLAUDE.md 非依存 (確認済)

## 新しい盲点 (reflect へ)
- 「1画面」の予算自体が腐る → diet 門が byte 予算を固定するので機械が見張る
- 撤去した掟が本当に全て機構側に在るかの突合 → prove で個別に発火確認
