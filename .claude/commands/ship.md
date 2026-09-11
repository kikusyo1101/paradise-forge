---
name: ship
description: Git/PR delivery procedure — branch, commit, push, PR, review loop, merge. Load when committing code, opening a PR, finishing a work session, or bootstrapping a new repo. Full workflow with naming rules and review verdicts.
---

# /ship — 仕事を神の御前に運ぶ道

コード変更を **ブランチ → コミット → push → PR → レビュー → マージ** まで運ぶ手順。
ユーザーの Git 指示を待たずに、変更が済んだらこの道を自動で完走する。

> 安全側 (force-push 禁止・main 直接コミット禁止・`.env` 不可侵) は
> `apply-guards.js` が permissions/hooks に機械強制している — 証拠は
> `node graph/apply-guards.js verify`。この文書は手順であって強制ではない。

## Step 0: ブランチ確認

```bash
git branch && git status
```
- `main` にいる → 変更内容に合ったブランチを作成 (`git checkout -b feat/内容`)
- feature ブランチにいる → そのまま継続
- 楽園リポジトリでは切る前に `node graph/branch-guard.js` を必ず走らせる

### ブランチ命名

| 種別 | 命名 | 例 |
|------|------|---|
| 機能追加 | `feat/機能名` | `feat/kanban-drag-fix` |
| バグ修正 | `fix/内容` | `fix/checkbox-border` |
| セキュリティ | `security/内容` | `security/remove-hardcoded-key` |
| UI 改善 | `ui/内容` | `ui/hover-states` |
| リファクタリング | `refactor/内容` | `refactor/auth-hook` |
| 楽園自身の改修 | `reform/内容` | `reform/claude-md-diet` |

## Step 1: コミット

```bash
git status   # .env や *.db が混ざっていないか確認してから
git add <変更したファイルを個別に指定>
git commit -m "feat(scope): 変更内容を日本語で説明"
```

Conventional Commits: `<type>(<scope>): <説明（日本語OK）>`
type: `feat` `fix` `style` `refactor` `security` `docs` `test` `chore`

```
feat(kanban): ドラッグ&ドロップでステータス変更できる機能を追加
security(config): SECRET_KEYをdocker-compose.ymlから環境変数に移行
chore: WIP - カンバンカード編集UIの途中保存
```

## Step 2: Push と PR

```bash
git push -u origin ブランチ名
gh pr create --title "feat(scope): 変更内容" --body-file .github/pull_request_template.md
```

## Step 3: レビューと裁定

PR 作成直後に `/pr-review` を起動し、判定に従う:

| 判定 | Claude の対応 |
|------|------------|
| ✅ APPROVED | マージ可の状態で神に報告 (楽園系リポジトリはマージは神のみ) |
| ⚠️ NEEDS CHANGES | 自動修正 → `fix(scope):` コミット → push → 再レビュー (最大3回) |
| 🔴 BLOCKED | マージ禁止・PR クローズしない・神に報告して指示を待つ |

一般リポジトリで APPROVED の場合のみ:
```bash
gh pr merge --squash --delete-branch && git checkout main && git pull
```

## セッション終了・/compact 前

作業途中でも必ず退避する:
```bash
git add <個別指定> && git commit -m "chore: WIP - 作業中の内容メモ" && git push
```

## 新規プロジェクト開始時 (初回のみ)

1. `.gitignore` と `.env.example` を作成
2. `git init` → `git add .` → `git commit -m "chore: initial commit"`
3. GitHub でリポジトリ作成 (Private 推奨)
4. `git remote add origin <URL>` → `git push -u origin main`
