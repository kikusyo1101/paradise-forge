# グローバルルール — 最初の1画面

**日本語で話すこと。** ユーザー(kikus)には日本語で報告する。

## セッション開始時

1. `git branch && git status && git log --oneline -3` と `gh pr list` を確認。
   オープン中の PR があればそのブランチで継続、feature ブランチならそのまま継続。
2. Claude Code のメモリ(auto memory)を確認 — 過去の決定と未完了タスクはそこにある。

## Git / GitHub (詳細は `/ship` — ここに写経しない)

コードを変更したら指示を待たず **`/ship` の道** を完走する:
ブランチ → Conventional Commit → push → PR → `/pr-review` → 裁定に従う。
セッション終了・`/compact` 前は WIP でも commit + push して退避する。

> force-push 禁止・main 直接コミット禁止などの安全側は
> `~/.claude/settings.json` の permissions/hooks が機械強制している。
> 建てるのは `graph/apply-guards.js` — settings.json を手で編集しない。
> 強制の有無は主張でなく `node graph/apply-guards.js verify` の出力で確かめる。

## 機械が強制できない判断則

1. **subagent の「done」を信じない** — 実物とコマンド出力で照合する。
2. コミット前に `git status` で `.env` / `*.db` の混入を確かめ、個別 add する。
3. 検証・レビューは適切な agent (code-reviewer / security-reviewer 等) に運ぶ —
   一覧と使い分けは各 agent の description が語る。
