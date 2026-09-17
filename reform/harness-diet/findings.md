# harness-diet — 実測記録 (2026-09-18)

審査の全文はハーネス審査セッション(Hermes)に在る。ここには**改革の根拠になった数**だけを置く。

## 実測

| 項 | 測り方 | 結果 |
|---|---|---|
| hook の実効 | `~/.claude/settings.json` の hook 10 本を一本ずつ読み、この機の前提を確かめた | TMUX 未設定 / package.json・tsconfig・prettier 設定 無し / `graph/*.js` に `console.log` 674 箇所 / `~/.claude/sessions/*.tmp` 全件 258B の空テンプレ / `skills/learned` 0 件 / PostToolUse・Stop・SessionEnd の stdout はモデルに届かない(公式 hooks reference) → **10 本とも実効 0** |
| agent の実起動 | 全 15 走行の `conclave.json.spawnTrace`(追跡付き 7 走行 / 108 起動)+ Claude Code 全 transcript の `subagent_type` | 起動 0 回: 21 体。入れ子起動(`parentToolUseId` 有り) **0/108**。rank 内訳 pontiff 17 / priest 8 / null 83、cardinal 0 |
| command の実起動 | Claude Code 全 transcript の `<command-name>` | vendor command 15 本すべて 0 回(観測されたのは /compact /model /local-model のみ) |
| permission mode | `~/.claude.json` に `bypassPermissionsModeAccepted` 無し / `settings.local.json` 無し / 最新 transcript `permissionMode:"default"` | **default モード** → allow 5 件では git add/commit/push・gh pr create・node -e が毎回プロンプト |
| 二重ロード | `reform/sovereign-abode/discovery-scoping.md` L40–41(楽園自身のプローブ: `.claude/rules/*.md` は Project and global 双方が効く) | `<repo>/.claude/rules/*` と `~/.claude/rules/*` はバイト一致 → 無スコープ rules 5 本が毎セッション 2 回載っていた |
| 破壊操作の deny 漏れ | skill に記録された実測事故(`git checkout -- <file>` が未コミットの門 13 本 + engine 編集を消した) | `checkout --` / `restore` / `clean` / `stash drop` / `branch -D` は deny に無かった |

## 為したこと

1. **hook 総入替** — `apply-guards.js FORBIDDEN_HOOKS` に 12 件(理由付き)を追加。`apply` が神の settings.json から実効 0 の hook を除いた(EX-1 の writer として)。楽園の SessionStart hook は**前回の状態**(branch / 未コミット / 開いた走行帳 / 任意で `PARADISE_TASKS` の resume)だけを運ぶ形に書き直し、CLAUDE.md と同じ文の写経を落とした。
2. **permissions** — deny +6(作業木を消す手)/ allow +24(読み書き系 git・gh・node)。`tools/hooks/paradise-commit-guard.js` を PreToolUse `if: Bash(git commit:*)` で配備し、`branch-guard.js` の ON_MAIN を機構にした(CLAUDE.md の「拒む機構は無い」を消した)。
3. **剪定** — 第五の関係 `drop` を overlay.json に導入(vendor に素材は残す・配備しない・理由は実測)。agents 4 + commands 14 + rules 5 を drop、信徒 12 体を own から退役(`clergy.js believers: []`)、上流 rules 3 本を薄版で残す。`deploy.js` に **stale 検出と除去**を追加(計画に無い配備物は乖離 — 第29条)。cardinal.md の Model policy 節を 1 行ポインタに。

## 数(改革前 → 後、`node graph/deploy.js --write` の実出力)

| | 前 | 後 |
|---|---|---|
| 配備 agents | 30 | 14 |
| 配備 commands | 19 | 5 |
| 配備 rules | 8 | 3 |
| 神の settings.json hook | 10 | 0 |
| repo settings.json hook | 1 | 2 |
| permissions deny / allow | 9 / 5 (repo 10 / 5) | 15 / 29 (repo 16 / 29) |
| Task 定義に載る description | 6,633 B | 約 2,900 B |
| `paradise.test.js` | 484 passed / 8 failed(改革直後) | 492 passed / 0 failed |

## 触らなかったこと(範囲外・申し送り)

- `graph/abode.json` の **EX-3**(`~/.claude/scripts/{hooks,lib}` の複製 7 本)は神の裁可 1-A で建った輸出。hook が消えたので複製は孤児になったが、台帳を書けるのは神だけ(第54条(d))。**神が「閉じよ」と言えば `closed[]` へ移す**。
- `abode.js migrate --verify` が実機で赤(nodes.jsonl 122→142)。main でも赤、CI は実機無しで skip。本改革の前から。台帳 #67 に起票。
- 憲法の条は足していない。本改革で機構になったのは審査の指摘であり、第33条(機械が強制する法は散文で書かない)がそのまま適用される。
- 第52条(教主の手は最後の手段)は神の命「すべて実行」により本走行では適用外。conclave の環は回していない — 裁定は PR の CI 一回。
