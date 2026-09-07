# findings.md — 実測: CLAUDE.md は設計思想から逸脱しているか

計測日: 2026-08-31 / 神託: 「法は機構に、周知はダッシュボードに。CLAUDE.md はベストプラクティスに沿って絞れ」

## 1. 現状の実測 (数)

### 1-a. 大きさ
- project CLAUDE.md: **10,780 B (≈4,300 tokens)** — 毎セッション全額前払い
- global ~/.claude/CLAUDE.md: 5,849 B / CONSTITUTION.md: 45,621 B / INDEX: 2,919 B

### 1-b. 節別の内訳 (どこが太っているか)
| 節 | bytes | % | 中身の性質 |
|---|---|---|---|
| 楽園とは何か | **4,859** | **45.7%** | **憲法38条の要約表 (15〜38条を1行ずつ写経) + codex 案内** |
| 絶対に守ること | 2,404 | 22.6% | 6つの掟 — うち複数は既に hooks/permissions で機械強制済み |
| 門(コマンド) | 1,254 | 11.8% | 13 gate コマンド一覧 |
| 創造物の掟 | 719 | 6.8% | scoped constraint (creations を作る時しか関係ない) |
| あなたは誰か + 現状 | 1,189 | 11.2% | 役割・言語・数値 (census が数を管理) |

**最大の逸脱: 45.7% が憲法の要約写経。** 楽園は既に `codex.js index` (2,919 B, 第33条
「全文を常時読むな」) を建てたのに、CLAUDE.md 自身が **INDEX より大きい憲法表** を抱えた。
条を足すたび CLAUDE.md も太る — 第33条が自分の家で破られている。

### 1-c. 二重記載 (一方は嘘になる運命 — 第33条)
| CLAUDE.md の記述 | 機構側の実体 |
|---|---|
| 「mainへ直接コミットしない」「force禁止」 | apply-guards **deny 9件** + branch-guard + CI + CODEOWNERS で機械強制済み |
| 「~/.claude を手で編集しない」 | **deny `Edit(~/.claude/**)`** で機械強制済み |
| 「ブランチ前に branch-guard」 | 掟としては散文のみ (穴 — 後述) |
| 憲法表 15〜38条 | CONSTITUTION.INDEX.md (codex check が同期を機械保証) |
| 「自己診断 210件」「憲法38条」等の数 | census.js が管理 — だが **census の3つの claim が CLAUDE.md の数を見張る = 数を書き続ける前提の門** |
| 創造物の掟 (単一HTML/toISOString禁止/DOMAINマーカー/identity.md) | critic.js と visual-verify.js が一部を機械検査。identity/ux は forge の相 goal に埋込済 |

### 1-d. 発火の実態
- hooks 15本 (全て生存)、permissions deny 9 / ask 1 / allow 5 — **機械強制は既に在る**
- SessionStart で kg.js snapshot (KNOWLEDGE SNAPSHOT) も注入される — 周知経路は複数ある
- ダッシュボード export-state.js は forge.CONSTITUTION を出力済 (神への周知経路も既に在る)

## 2. 外界の定石 (2026)

- **常時ロードは短く、progressive disclosure が原則**。「消しても、コードから回復
  できない誤りが起きるか?」が各行のリトマス試験 (amux.io context-engineering guide)
- **CLAUDE.md の指示遵守率は ~70%** — 安全規則を散文に置くのは事故待ち。
  safety-critical は hooks (100%強制) へ (同上)
- **scoped constraint は rules/ または該当ディレクトリへ、workflow は skills へ、
  API仕様や運用手順は on-demand 読込へ** (jwatte.com deep-dive, rundatarun)
- 500 tokens 超は分割対象、170〜400 tokens が推奨帯 (claudecodeguides.com)
- boundaries: **always-true → CLAUDE.md / scoped → rule / repeatable workflow → skill /
  safety → hook** (jwatte)

## 3. 判定

CLAUDE.md の役割は「**最初の1画面: 誰であるか・何語か・どこを読むか・何が機械強制されて
いるかの地図**」であり、法典の複製でも数値台帳でもない。楽園には既に
codex (法の索引)・census (数の門番)・apply-guards (掟の強制)・dashboard (神への周知)・
kg snapshot (セッション注入) が全て建っている — **CLAUDE.md だけが2024年の書き方のまま**。

処方: 憲法表・数値・機械強制済みの掟の写経を CLAUDE.md から撤去し、指し示す一文に置換。
census の CLAUDE.md 監視 claim は「数を書かない」方針に合わせて撤去 (数を書き続ける前提の
門は方針転換で嘘になる — 第36条)。scoped な創造物の掟は rules/ へ。
