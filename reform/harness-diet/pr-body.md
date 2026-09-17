## ハーネスの引き算 — 実効 0 の hook 10 本・起動 0 の agent 21 体・守れない rules 5 本を退役し、default モードの全自律を止めない permissions にする

神託「すべて実行してほしい。裁定は大きな区切りで一回」に従い、ハーネス審査(2026-09-18)の着手順 3 件(台帳 #64/#65/#66)を 1 PR に束ねた。**教主の手で直接書いた**(第52条は神の命により適用外)。根拠の数は `reform/harness-diet/findings.md`。

### 1. hook 総入替 (#64)
- everything-claude-code 由来の hook 10 本は、この機で**実効 0** だった(TMUX 未設定 / prettier・tsc 設定無し / console.log 674 箇所で常時偽陽性 / sessions/*.tmp 全件 258B 空テンプレ / PostToolUse・Stop・SessionEnd の stdout はモデルに届かない)。`FORBIDDEN_HOOKS` に理由付きで 12 件を載せ、`apply-guards.js apply` が神の settings.json から除いた(EX-1 の writer として。`node graph/apply-guards.js verify` → hook 2 本 / 神の 5 キー無傷)。
- `tools/hooks/paradise-session-start.js` は**前回の状態だけ**を運ぶ: branch・未コミット件数・開いている走行帳(`conclave.js audit --json`)・任意で `PARADISE_TASKS` の resume・KG snapshot。掟の写経(「日本語で応答せよ」等)は CLAUDE.md が担うので落とした(第39条)。文体は事実の陳述(公式 reference: 命令形の system 文は注入防御に当たる)。

### 2. permissions (#65)
- 実運用が default モードと実測で確定(`~/.claude.json` に bypass 無し、transcript `permissionMode:"default"`)。allow 5 件では git add/commit/push・gh pr create・node -e が毎回プロンプト → **allow +24**(deny が先勝ちなので force-push 等は通らない)。
- skill に記録された実測事故(`git checkout --` が未コミットの門 13 本を消した)の手が deny に無かった → **deny +6**(`checkout --` / `restore` / `clean` / `stash drop` / `stash clear` / `branch -D`)。
- CLAUDE.md が自白していた「main へのローカル commit を拒む機構は無い」を機構に: `tools/hooks/paradise-commit-guard.js` を PreToolUse `if: Bash(git commit:*)` で配備(branch-guard の ON_MAIN で exit 2 / 判定不能は名乗って通す)。

### 3. 剪定 (#66)
- overlay.json に第五の関係 **`drop`**(vendor に素材は残す・配備しない・理由は実測)。`deploy.js` と `upstream.js` が読む。
- drop: agents 4(build-error-resolver / e2e-runner / refactor-cleaner / planner)、commands 14、rules 5(agents / performance / coding-style / testing / patterns — 楽園で**守れない**規則を毎セッション読ませればモデルは規則を無視することを学ぶ)。
- 信徒 12 体を退役(`clergy.js believers: []`、位階の語彙は残す)。根拠: 7 走行 / 108 起動に信徒の起動 0、入れ子起動 0/108。
- `deploy.js` に **stale 検出・除去**を追加 — 退役させても「足す」しか知らない deploy は派生物に 30 体を残し続けた(第29条: 写しに余分が在るのも乖離)。
- cardinal.md の Model policy 節(モデル表の散文)を `clergy.js models` への 1 行に。

### 数(`node graph/deploy.js --write` 実出力)
agents 30→14 / commands 19→5 / rules 8→3 / 神の hook 10→0 / deny 9→15 / allow 5→29。`paradise.test.js` **492 passed / 0 failed**、guards 75/0、counsel 209/0、abode 134/1(赤 1 は既存の migrate — #67 に起票、本 PR の範囲外)。atlas 6 主題 9/9(dispatch は信徒行が消えたぶん器の下限 420 で支えた)。

### 門の直し方(緩めていない)
- 固定値 `30/19/8`・`deny 9 / allow 5` を持っていた門は、楽園側の派生物と `policyFor({mode:'global'})` から**数える**形に(第22条)。
- 信徒を前提にした門は「信徒 0 / mode `no-believers` / Task は必要から生まれる」を裁く形に。
- session hook の門は「CLAUDE.md を指し、写経せず、git 状態と走行帳を運ぶ」を裁く形に。

### 申し送り
- **EX-3**(`~/.claude/scripts/{hooks,lib}` の複製 7 本)は hook が消えて孤児になった。台帳を書けるのは神のみ — 「閉じよ」の御言葉があれば `closed[]` へ。
- 憲法の条は足していない(第33条: 機構になった法は散文で書かない)。
