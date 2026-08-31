# グローバルルール

---

## 1. セッション開始時の動作

セッション開始時に必ず以下を行うこと：

1. Git の状態を確認する：
   ```bash
   git branch && git status && git log --oneline -3
   gh pr list   # オープン中の PR があれば継続作業を優先する
   ```
   - オープン中の PR がある場合 → そのブランチに移動して作業を継続する
   - feature ブランチにいる場合 → そのまま継続する

2. Claude Code のメモリシステムを確認する（過去の決定事項・未完了タスクはここに記録されている）

---

## 2. Git / GitHub 管理ルール（Claude が自動実行する）

**ユーザーが Git 操作を指示しなくても、Claude がすべて自動で実行すること。**
コードを変更したら、ユーザーの確認を待たずにブランチ作成〜マージまで完走する。

> 安全ルール（force push 禁止・main への直接コミット禁止）は `~/.claude/settings.json` の
> `permissions` と Hooks で強制される。**この強制を建てるのは `graph/apply-guards.js` であり、
> 手で settings.json を編集しない**（配備物であるため。楽園 第19条・第33条）。
>
> ⚠️ この行は以前「Hooks で自動強制されている」と述べていたが**事実ではなかった**。
> 実測: `permissions` キーは存在せず、`main` も `force` も settings.json に一度も現れず、
> 15フック中8本は公式に存在しない matcher 式言語を使っていて**永遠に発火しなかった**。
> 強制の有無は主張ではなく `node graph/apply-guards.js verify` の出力で確かめること。

---

### 2-1. コード変更後に Claude が自動実行する手順

コードファイルを編集・作成・削除したら、作業完了後に必ず以下を順番に実行する：

#### Step 1: ブランチ確認・作成

```bash
git branch   # 現在のブランチを確認
```

- `main` にいる場合 → 変更内容に合ったブランチを作成して移動
- すでに feature ブランチにいる場合 → そのまま継続

```bash
git checkout -b feat/変更内容   # main にいる場合（ブランチ名は命名規則に従う）
```

#### Step 2: コミット

```bash
git status   # .env や *.db が含まれていないか必ず確認してから、関係するファイルのみを add する
git add <変更したファイルを個別に指定>
git commit -m "feat(scope): 変更内容を日本語で説明"
```

#### Step 3: プッシュ

```bash
git push -u origin ブランチ名
```

#### Step 4: PR 作成

```bash
gh pr create \
  --title "feat(scope): 変更内容" \
  --body-file .github/pull_request_template.md
```

#### Step 5: PR レビュー（`/pr-review` スキルを実行）

PR 作成直後にレビューエージェントを起動し、結果を待つ。

#### Step 6: マージ

- **✅ APPROVED** → 自動でマージを実行
  ```bash
  gh pr merge --squash --delete-branch
  git checkout main && git pull
  ```
- **⚠️ NEEDS CHANGES** → 指摘を自動修正 → `fix(scope): 修正内容` でコミット → push → 再レビュー（最大3回）
- **🔴 BLOCKED** → マージ禁止・PR クローズしない・ユーザーに報告して指示を待つ

---

### 2-2. ブランチ命名規則

| 種別 | 命名 | 例 |
|------|------|---|
| 機能追加 | `feat/機能名` | `feat/kanban-drag-fix` |
| バグ修正 | `fix/内容` | `fix/checkbox-border` |
| セキュリティ | `security/内容` | `security/remove-hardcoded-key` |
| UI 改善 | `ui/内容` | `ui/hover-states` |
| リファクタリング | `refactor/内容` | `refactor/auth-hook` |

---

### 2-3. コミットメッセージ（Conventional Commits）

フォーマット: `<type>(<scope>): <説明（日本語OK）>`

| タイプ | 用途 |
|--------|------|
| `feat` | 新機能追加 |
| `fix` | バグ修正 |
| `style` | UI・スタイル変更（機能変化なし） |
| `refactor` | リファクタリング |
| `security` | セキュリティ対応 |
| `docs` | ドキュメント・コメント変更 |
| `test` | テスト追加・変更 |
| `chore` | 設定・ビルド・依存関係・WIP |

```
# 良い例
feat(kanban): ドラッグ&ドロップでステータス変更できる機能を追加
fix(auth): セッション期限切れ時に自動ログアウトされない問題を修正
security(config): SECRET_KEYをdocker-compose.ymlから環境変数に移行
chore: WIP - カンバンカード編集UIの途中保存
```

---

### 2-4. セッション終了・`/compact` 前に Claude が実行すること

作業途中でも必ず push しておく：

```bash
git add <変更したファイルを個別に指定>
git commit -m "chore: WIP - 作業中の内容メモ"
git push
```

---

### 2-5. PR レビューエージェントの判定基準

| 判定 | 意味 | Claudeの対応 |
|------|------|------------|
| ✅ APPROVED | 全観点で問題なし | 自動でマージ実行 → main に戻る |
| ⚠️ NEEDS CHANGES | 修正が必要 | 自動修正 → コミット → push → 再レビュー（最大3回） |
| 🔴 BLOCKED | セキュリティ等の重大問題 | マージ禁止・PR クローズしない・ユーザーに報告 |

---

### 2-6. 新規プロジェクト開始時（初回のみ）

1. `.gitignore` と `.env.example` を作成する
2. `git init` → `git add .` → `git commit -m "chore: initial commit"`
3. GitHub でリポジトリ作成（Private 推奨）してURLを教えてもらう
4. `git remote add origin <URL>` → `git push -u origin main`
