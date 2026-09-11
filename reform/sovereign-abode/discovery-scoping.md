# sovereign-abode — 調査: 楽園はプロジェクト内で完結できるか

**問い**: Claude Code (CLI) で「エージェント設定をプロジェクト内で完結させ、ユーザーのグローバル `~/.claude` に一切書かない」ことは本当に可能か。

**実測環境**: Windows 11 / git-bash (MSYS) / `claude --version` → **`2.1.247 (Claude Code)`**
**実測場所**: `C:/Users/kikus/AppData/Local/Temp/cc-scope-probe`(楽園リポジトリ外の一時ディレクトリ)
**調査のみ。実装・deploy・apply-* は一切実行していない。`~/.claude` 配下は読むだけ。**

## 結論(先に答え)

**配備(何が読まれるか)は、ほぼ完全にプロジェクト内で完結できる。**
agents / skills / commands / rules / CLAUDE.md / hooks / .mcp.json / settings.json は
すべて `<repo>/.claude/` から実際に読まれた(実出力で確認済み)。

**しかし「`~/.claude` に一切書かない」は達成できない。** 3つの機構が邪魔をする:

1. **workspace trust が `~/.claude.json` に住む** — project の `permissions.allow` は
   信頼を受けるまで**無視される**。信頼の記録先はグローバル。
2. **user settings は既定で必ず合成される** — 神の `deny` 9件が黙って効き続ける。
   切るには `--setting-sources project` が要る(が、それは神の護りも一緒に切る)。
3. **実行時状態は必ずグローバルへ書かれる** — `--no-session-persistence` を付けても
   `~/.claude/projects/.../subagents/*.meta.json` と `~/.claude/backups/` が増えた(実測)。

`CLAUDE_CONFIG_DIR` で丸ごと移すことは**できる**が、**神の認証まで巻き込む** —
空ディレクトリを指した瞬間 `Not logged in · Please run /login` になった(実測)。
**楽園だけを隔離して認証だけ残す、という分離は CLAUDE_CONFIG_DIR ではできない。**

---

## 1. プロジェクトスコープの器 — 何が `<repo>/.claude/` で効くか

出典の基点: [Explore the .claude directory](https://code.claude.com/docs/en/claude-directory)
の File reference 表(Scope 列が `Project and global` なら project で効く)。

| 器 | project で効くか | 実測での証拠 | 公式ドキュメント |
|---|---|---|---|
| `.claude/agents/` | **効く** | `probe-agent` に委譲 → `PROBE_AGENT_TOKEN_7714` を返した | [sub-agents](https://code.claude.com/docs/en/sub-agents) — 「Project subagents (`.claude/agents/`)」優先度3、user は4 |
| `.claude/skills/<name>/SKILL.md` | **効く** | `PROBE_SKILL_TOKEN_5567` を返した | [skills](https://code.claude.com/docs/en/skills) — Project: 「Sessions in this repository」 |
| `.claude/commands/*.md` | **効く** | skills と同一機構(commands は旧形式・現役) | [skills](https://code.claude.com/docs/en/skills) — 「A Markdown file in `.claude/commands/` is the older format and still works」 |
| `CLAUDE.md`(repo ルート) | **効く** | ツール未使用の文脈のみで `PROBE_CLAUDEMD_TOKEN_1102` を返した | [memory](https://code.claude.com/docs/en/memory) |
| `.claude/rules/*.md` | **効く** | 同一応答で `PROBE_RULE_TOKEN_3345` を返した | [claude-directory](https://code.claude.com/docs/en/claude-directory) — `rules/*.md` は `Project and global` |
| `.claude/settings.json` の `env` | **効く** | `ENV=[PROJECT_SETTINGS_TOKEN_8821]` | [settings](https://code.claude.com/docs/en/settings) |
| `.claude/settings.json` の `model` | **効く** | `modelUsage keys: ['claude-haiku-4-5']`(user は `fable`) | [settings](https://code.claude.com/docs/en/settings#settings-precedence) |
| `.claude/settings.json` の `hooks` | **効く**(信頼不要) | `PreToolUse` が発火し `PROJECT_HOOK_FIRED_5150` を書いた | [headless](https://code.claude.com/docs/en/headless#start-faster-with-bare-mode) — 「a `-p` session runs the hooks in a project's `.claude/settings.json` ... even in a folder you've never trusted」 |
| `.claude/settings.json` の `permissions.deny` | **効く**(信頼不要) | `curl --version` → `Permission to use Bash with command curl --version has been denied.` | [permissions](https://code.claude.com/docs/en/permissions) — 「`deny` and `ask` rules apply right away」 |
| `.claude/settings.json` の `permissions.allow` | **効かない(信頼まで)** | 起動毎に警告: `Ignoring 1 permissions.allow entry from .claude/settings.json: this workspace has not been trusted.` | [permissions](https://code.claude.com/docs/en/permissions#project-allow-rules-and-workspace-trust) |
| `.claude/settings.local.json` | 効く(gitignore 前提・個人用) | 未実測(仕様上 project より上位) | [settings](https://code.claude.com/docs/en/settings#keep-personal-settings-out-of-a-repository) |
| `.mcp.json`(repo ルート) | **効く**(`-p` では承認プロンプト無しで読まれる) | 未実測 | [mcp](https://code.claude.com/docs/en/mcp#project-scope) — 「In `claude -p` runs ... it loads project-scoped servers without asking」 |

### グローバル専用(project では**絶対に効かない**もの)— 名指し

[claude-directory の File reference 表](https://code.claude.com/docs/en/claude-directory)で
Scope が `Global only` のもの:

- **`~/.claude.json`** — アプリ状態・OAuth・**workspace trust の記録**・個人 MCP。
  楽園にとって最大の障害。後述の通り `permissions.allow` の可否を握っている。
- **`~/.claude/projects/<project>/memory/`** — auto memory(Claude 自身のメモ)。
  リポジトリ内に置けない。`CLAUDE_CODE_PROJECT_DIR_NAME` で名前は変えられるが、
  置き場所は config dir 配下のまま。
- **`~/.claude/.credentials.json`** — 認証。
- **`keybindings.json` / `themes/*.json`** — UI 設定。
- **`~/.claude/history.jsonl` / `sessions/` / `shell-snapshots/`** — 履歴・実行時状態。

さらに**設定キー単位**でもグローバル専用がある。
[settings-reference の Scope 列](https://code.claude.com/docs/en/settings-reference#settings-index)が
`User, local, or managed` / `User or managed` / `Managed` / `Global config` のキーは
**リポジトリの `settings.json` に書いても無視される**。楽園に効くものでは:

- **`permissions.defaultMode` の `auto` と `bypassPermissions`** — project/local settings からは
  効かない。「set them in user or managed settings instead, or pass `--permission-mode`」
  ([settings](https://code.claude.com/docs/en/settings#a-value-you-set-is-ignored))。
  v2.1.257 より前は任意のファイルから効いた。
- **`CLAUDE_CONFIG_DIR`(env ブロック内)** — 「Ignored in project and local settings」
  ([env-vars](https://code.claude.com/docs/en/env-vars))。自分自身を移動させられない。

---

## 2. 設定の優先順位

[settings#settings-precedence](https://code.claude.com/docs/en/settings#settings-precedence) より、
**高い順**:

1. **Managed settings**(`managed-settings.json` / MDM / claude.ai console)
2. **Command line**(`claude --settings <file-or-json>`)
3. **Project local**(`.claude/settings.local.json`)
4. **Shared project**(`.claude/settings.json`)
5. **User**(`~/.claude/settings.json`)

環境変数はこのスタックの階層ではない。キー毎に個別判定
(`ANTHROPIC_MODEL` はファイルの `model` に勝つ、等)。

### 合成のされ方 — マージか上書きか

**スカラー値は上書き(高い方が勝つ)。リストはマージ(和集合)。**

> "When you set the same list key, such as `permissions.allow`, in more than one file,
> Claude Code combines the lists instead of picking one, so each file can add entries
> without removing another file's."
> — [Lists merge instead of overriding](https://code.claude.com/docs/en/settings#lists-merge-instead-of-overriding)

#### 実測1: `model` はスカラー → 上書き

user(`~/.claude/settings.json`)は `"model": "fable"`。project は `claude-haiku-4-5`。

```
$ claude -p "hi" --output-format json --no-session-persistence --max-turns 1
modelUsage keys: ['claude-haiku-4-5']          ← project が user に勝った

$ claude -p "hi" --settings '{"model":"claude-sonnet-4-5"}' ...
modelUsage keys: ['claude-sonnet-4-5']         ← --settings が project に勝った

$ claude -p "hi" --setting-sources user ...
modelUsage keys: ['claude-fable-5']            ← project を外すと user の値に戻る
```

優先順位 2 > 4 > 5 が実出力で確認された。

#### 実測2: `permissions.deny` は和集合

project は `deny: ["Bash(curl *)", ...]`。user は `deny: ["Read(**/.env)", ...]` を持つ。
両方を同一セッションで試すと**両方とも拒否された**:

```
$ claude -p "(A) Read .env  (B) bash: curl --version"
(A) Read .env: DENIED: File is in a directory that is denied by your permission settings.
(B) Bash curl --version: DENIED: Permission to use Bash with command curl --version has been denied.
```

→ **deny は和集合。project の deny を足しても user の deny は消えない。**
これは安全側だが、楽園から見ると「神の deny を project 側から緩められない」ことを意味する。
実際 deny の評価順は deny → ask → allow で、
「A broad deny rule ... can't carry allowlist exceptions」
([permissions](https://code.claude.com/docs/en/permissions#manage-permissions))。

#### 実測3: user の deny を外せるのは `--setting-sources` だけ

```
$ claude -p "Read .env" (既定)
拒否メッセージ: File is in a directory that is denied by your permission settings.

$ claude -p "Read .env" --setting-sources project
Contents of `.env`:  DOTENV_TOKEN_2299          ← 神の deny が消えた
```

**これは諸刃**。`--setting-sources project` は user settings を丸ごと外すので、
`Edit(~/.claude/**)` や force-push 拒否といった**神の護りも同時に消える**。

#### hooks の合成

hooks も配列なのでマージされる(user の hook と project の hook が両方走る)。
「If you define the same handler in more than one settings file, it runs once」
([hooks](https://code.claude.com/docs/en/hooks))— 同一ハンドラの重複は1回に畳まれるが、
**異なるハンドラは共存する**。楽園の PreToolUse を project に置いても、
神の `~/.claude/settings.json` の PreToolUse は消えない。

---

## 3. `CLAUDE_CONFIG_DIR` — 楽園だけを隔離できるか

### 何ができるか

> `CLAUDE_CONFIG_DIR`: Override the configuration directory (default: `~/.claude`).
> **All settings, session history, and plugins are stored under this path.**
> ... Set it in your shell, user settings, or managed settings.
> **Ignored in project and local settings.**
> — [env-vars](https://code.claude.com/docs/en/env-vars)

`~/.claude` 全体を別の場所へ移せる。これは事実。
[claude-directory](https://code.claude.com/docs/en/claude-directory) も
「If you set `CLAUDE_CONFIG_DIR`, every `~/.claude` path on this page lives under that directory instead」
と述べる。

### 何が付いてくるか — **認証も付いてくる**

> If you've set the `CLAUDE_CONFIG_DIR` environment variable, Claude Code keeps the
> **`.credentials.json` file under that directory instead**, including the file the macOS
> fallback writes, and keys the macOS Keychain entry to that directory too, so **a session
> with a different `CLAUDE_CONFIG_DIR` reads a different entry.**
> — [authentication](https://code.claude.com/docs/en/authentication)(Windows は `%USERPROFILE%\.claude\.credentials.json`)

### 実測: 空ディレクトリを指すと認証が切れる

```
$ CLAUDE_CONFIG_DIR="C:/Users/kikus/AppData/Local/Temp/cc-alt-config" \
    claude -p "Reply with exactly: ALT_CONFIG_OK" --permission-mode bypassPermissions ...
Not logged in · Please run /login
```

そして新しい config dir にはこれらが**自動生成**された:

```
cc-alt-config/.claude.json
cc-alt-config/backups/.claude.json.backup.1789046799039
cc-alt-config/projects/C--Users-kikus-AppData-Local-Temp-cc-scope-probe
cc-alt-config/sessions
```

### 判定: **神の認証や履歴を巻き込まずに楽園だけを隔離することはできない**

`CLAUDE_CONFIG_DIR` は**全か無か**のスイッチである。認証・履歴・plugins・auto memory・
settings が1つの単位として動く。「設定だけ隔離して認証は共有」という選択肢は無い。

回避するなら:
- `.credentials.json` を新 config dir へ**コピー**する(神の資格情報の複製 = 汚染。避けるべき)
- `ANTHROPIC_API_KEY` を別に用意する(サブスクではなく API 課金に変わる。
  「In non-interactive mode (`-p`), the key is always used when present」— [env-vars](https://code.claude.com/docs/en/env-vars))

### さらに: `--no-session-persistence` を付けても `~/.claude` は汚れる(実測)

全プローブを `--no-session-persistence` 付きで走らせた後、baseline との差分:

```
=== NEW paths under ~/.claude across the ENTIRE probe ===
/c/Users/kikus/.claude/backups/.claude.json.backup.1789046711706
/c/Users/kikus/.claude/backups/.claude.json.backup.1789046813021
/c/Users/kikus/.claude/backups/.claude.json.backup.1789046874273
/c/Users/kikus/.claude/backups/.claude.json.backup.1789046938044
/c/Users/kikus/.claude/projects/C--Users-kikus-AppData-Local-Temp-cc-scope-probe/.../subagents/agent-ae326d6e10d4ff8d6.meta.json
/c/Users/kikus/.claude/projects/C--Users-kikus-AppData-Local-Temp-cc-scope-probe/.../subagents/agent-ad1ff1d89abf13634.meta.json
```

**「`~/.claude` に一切書かない」は、Claude Code を使う限り原理的に達成できない。**
達成できるのは「**楽園の配備物を `~/.claude` に置かない**」までである。
(なお神の資産は無傷: `settings.json` は 09-09 22:59、`CLAUDE.md` は 09-01 08:02、
`history.jsonl` は 08-28 00:51 のまま。`~/.claude/agents/` に probe-agent は入っていない。)

---

## 4. `--add-dir` / `additionalDirectories`

**この2つは全くの別物である。** ここが最も誤解されやすい。

> These exceptions apply **only to directories added with the `--add-dir` flag or the
> `/add-dir` command** ... Directories listed in **`permissions.additionalDirectories`
> in a settings file grant file access only and don't load any of the configuration below.**
> — [permissions#additional-directories-grant-file-access-not-configuration](https://code.claude.com/docs/en/permissions#additional-directories-grant-file-access-not-configuration)

### `--add-dir` が読むもの / 読まないもの

| 対象 | `--add-dir` で読まれるか | 実測 |
|---|---|---|
| `.claude/skills/` | **読まれる**(ライブリロードあり) | `EXT_SKILL_TOKEN_6613` を返した |
| `.claude/commands/` | **読まれる**(ライブリロード無し) | 仕様 |
| `.claude/agents/` | **読まれる**(ライブリロード無し) | `EXT_AGENT_TOKEN_4402` を返した |
| `.claude/settings.json` | **`enabledPlugins` と `extraKnownMarketplaces` だけ** | `EXTENV=[]` — `env` は読まれなかった |
| `CLAUDE.md` / `.claude/rules/` | **読まれない**(既定) | ツール無しで問うと `NO_EXT_CLAUDEMD` |
| hooks / permissions | **読まれない** | 上表の通り settings は2キーのみ |

実測(`--add-dir C:/Users/kikus/AppData/Local/Temp/cc-ext-dir`):

```
(1) EXT_AGENT_TOKEN_4402       ← agents 読まれた
(2) EXT_SKILL_TOKEN_6613       ← skills 読まれた
(3) EXTENV=[]                  ← settings.json の env は読まれなかった
```

`CLAUDE.md` は初回 (4) で値を返したが、それは Read ツールでファイルを開いたから。
`--tools ""` でツールを全て奪って文脈のみで問い直すと:

```
NO_EXT_CLAUDEMD
プロジェクトメモリトークン: PROBE_CLAUDEMD_TOKEN_1102
```

→ **追加ディレクトリの `CLAUDE.md` は自動ロードされない**(cwd 側の CLAUDE.md は載る)。
載せたければ `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` が要る(同ドキュメント)。

### 読まれる条件

- `project` setting source が有効であること(既定で有効)。
  `--setting-sources` から `project` を外すと **skills/commands/agents は読まれなくなる**。
- `--bare` では commands と agents は読まれない(skills だけ読まれる)
  ([headless](https://code.claude.com/docs/en/headless#start-faster-with-bare-mode))。
- `--safe-mode` / `strictPluginOnlyCustomization` でも制限される。
- agent ファイル内の inline MCP server は**そのディレクトリ自身の trust が要る**
  ([sub-agents](https://code.claude.com/docs/en/sub-agents))。

---

## 5. 実機実測 — 生の出力

### バージョン

```
$ claude --version
2.1.247 (Claude Code)
```

### 配置したもの

```
cc-scope-probe/.claude/agents/probe-agent.md      (name: probe-agent, PROBE_AGENT_TOKEN_7714)
cc-scope-probe/.claude/settings.json              (env/model/permissions/hooks)
cc-scope-probe/.claude/commands/probe-cmd.md
cc-scope-probe/.claude/skills/probe-skill/SKILL.md
cc-scope-probe/.claude/rules/probe-rule.md
cc-scope-probe/CLAUDE.md
```

### PROBE 1 — project agent と project settings は効いたか → **効いた**

```
$ claude -p "(1) delegate to subagent probe-agent verbatim (2) echo \$PARADISE_PROBE_ENV" \
    --permission-mode bypassPermissions --no-session-persistence --max-turns 8

Ignoring 1 permissions.allow entry from .claude/settings.json: this workspace has not been
trusted. Run Claude Code interactively here once and accept the trust dialog, or set
projects["C:/Users/kikus/AppData/Local/Temp/cc-scope-probe"].hasTrustDialogAccepted: true
in C:\Users\kikus\.claude.json.

**probe-agent 出力（verbatim）：**
PROBE_AGENT_TOKEN_7714
PROBE_CLAUDEMD_TOKEN_1102
PROBE_RULE_TOKEN_3345

**Bash コマンド出力（exact）：**
ENV=[PROJECT_SETTINGS_TOKEN_8821]
```

agent・CLAUDE.md・rules・env の4つが同時に立証された。
同時に、**警告文が `permissions.allow` の欠落とその記録先(`~/.claude.json`)を名指しした。**

### PROBE 2 — project の deny は信頼なしで効くか → **効いた**

```
$ claude -p "run: curl --version"
**ブロック** — `curl --version` はパーミッション拒否により実行できません。
```

### PROBE 3 — project skill

```
PROBE_SKILL_TOKEN_5567
```

### PROBE 6c — セッションから見える subagent 一覧(汚染の可視化)

```
acceptance-criteria-writer, architect, build-error-resolver, cardinal, claude,
code-reviewer, coverage-checker, creation-judge, data-collector, data-modeler,
doc-updater, e2e-runner, executor, Explore, feature-ranker, general-purpose,
interface-designer, linter, market-researcher, module-builder, Plan, planner,
probe-agent, refactor-cleaner, reporter, requirements-analyst, secret-scanner,
security-reviewer, self-critic, statusline-setup, tdd-guide, test-writer,
user-story-writer, ux-reviewer, web-scout
```

`probe-agent` は載っているが、**神の `~/.claude/agents/` の 30 余体も全部載っている**。
プロジェクト内で完結させても、既定では**グローバルの役者が混入し続ける**。
`.claude/agents/` は project が優先されるだけで(優先度 3 対 4)、user を**排除はしない**。

### PROBE 8 — project hooks は発火するか → **発火した**

```
$ claude -p "Run bash: echo hello-hook-probe"
実行完了: `hello-hook-probe`
--- hook-fired.log ---
PROJECT_HOOK_FIRED_5150
```

信頼していないフォルダでも、`-p` でプロジェクトの hook は走る。
(これは楽園にとって好都合だが、同時にセキュリティ上の注意点でもある。)

### PROBE 4 — CLAUDE_CONFIG_DIR

```
$ CLAUDE_CONFIG_DIR=".../cc-alt-config" claude -p "Reply with exactly: ALT_CONFIG_OK"
Not logged in · Please run /login
```

### `/doctor` について

`/doctor` は対話セッション用の slash command のため `-p` では実行していない。
代替として `--output-format json` の `modelUsage` と、起動時の
`Ignoring 1 permissions.allow entry ...` 警告を証拠に用いた。この警告は
[debug-your-config](https://code.claude.com/docs/en/debug-your-config) の
「check resolved settings」と同じ情報源(解決後の設定)を露出している。

### `~/.claude` を汚していないことの確認

```
=== integrity: god's files unchanged? ===
2026-09-09 22:59:21  /c/Users/kikus/.claude/settings.json
2026-09-01 08:02:50  /c/Users/kikus/.claude/CLAUDE.md
2026-08-28 00:51:02  /c/Users/kikus/.claude/history.jsonl
=== probe agent did NOT land in global agents: ===
CONFIRMED: no probe-agent in ~/.claude/agents
```

設定変更・deploy・apply-* は一切実行していない。増えたのは前述の
`backups/` と `projects/.../subagents/` の実行時状態のみ。

---

## 現実的に採れる方式 — 3案

### 案A: プロジェクト完結 + `--setting-sources project`(最も純粋)

楽園の agents/skills/commands/rules/CLAUDE.md/hooks/permissions を全て
`paradise/.claude/` に置き、起動を `claude --setting-sources project` に固定する。

**長所**
- 神の `~/.claude/settings.json` を**完全に無視**できる。deny 9件も hooks も混ざらない。
- 楽園の permissions/hooks が唯一の権威になる。`apply-guards.js` の verify が
  そのままプロジェクト内の真実になる。
- リポジトリを clone しただけで楽園が動く。CI・cloud session でもそのまま効く
  (cloud session は `.claude/settings.json` を読む — [settings](https://code.claude.com/docs/en/settings#settings-in-cloud-sessions))。
- `~/.claude/agents/` の 30 余体の混入が消え、役者一覧が楽園の意図通りになる。

**短所**
- **神の護りも同時に消える**(実測: `--setting-sources project` で `.env` が読めた)。
  楽園側の `deny` に force-push 禁止・`.env` 禁止・`Edit(~/.claude/**)` 禁止を
  **自前で全部書き直す**必要がある。書き漏らしはそのまま穴になる。
- `permissions.allow` は依然として workspace trust 待ちで無視される。
  → 実用には `~/.claude.json` に `hasTrustDialogAccepted: true` を一度書くか、
  対話で1回信頼する必要がある。**これはグローバルへの書き込みである。**
- `permissions.defaultMode` の `auto`/`bypassPermissions` は project からは効かない。
  起動フラグ `--permission-mode` で毎回渡す必要がある。
- 起動フラグを忘れた瞬間に汚染が戻る。ラッパー(スクリプト)が事実上必須。

### 案B: プロジェクト完結 + user settings は合成させたまま(最も現実的)

楽園の器を全て `paradise/.claude/` に置くが、`--setting-sources` は使わない。
神の user settings は下位レイヤとして残す。

**長所**
- **神の deny(force-push・`.env`・`~/.claude` 手編集の禁止)が生き続ける。**
  deny は和集合なので、楽園の deny を足すだけで護りが増える。第23条の安全側と整合。
- 起動フラグ無しの素の `claude` で動く。ラッパー不要 = 忘れようがない。
- model/env のようなスカラーは project が user に勝つ(実測済み)ので、
  楽園の意図はちゃんと通る。
- 段階移行できる。`~/.claude/agents/` から1体ずつ `paradise/.claude/agents/` へ
  移せばよく、大爆発が起きない。

**短所**
- **「グローバルに依存するな」という神の要求を完全には満たさない。**
  user settings が消えたら楽園の挙動は変わる。
- `~/.claude/agents/` の役者が混入し続ける(実測: 30 余体が見えた)。
  同名なら project が勝つが、余計な役者は消えない。
- 神の hooks も走り続ける。楽園の hook と二重発火する箇所が出うる。
- `permissions.allow` は案A と同じく trust 待ち。

### 案C: `CLAUDE_CONFIG_DIR` で楽園専用の config dir を建てる(最も強い隔離・最も高い代償)

`CLAUDE_CONFIG_DIR=<paradise>/.paradise-home claude` で起動し、
楽園専用の設定・履歴・auto memory を全てそこに閉じる。

**長所**
- **`~/.claude` への書き込みが本当にゼロになる**唯一の案。
  backups も projects/ も sessions/ も楽園側へ行く。
- auto memory(`projects/<project>/memory/`)まで楽園の管理下に入る。
  `CLAUDE_CODE_PROJECT_DIR_NAME` で名前も固定でき、worktree を跨いでも同じ記憶を共有できる。
- 神の環境と完全に独立。楽園が壊れても神の Claude Code は無傷。

**短所**
- **認証が切れる。** 実測で `Not logged in · Please run /login`。
  復旧には (a) 楽園 config dir で `/login` を別途やる、(b) `.credentials.json` を
  コピーする(神の資格情報の複製 — 却下すべき)、(c) `ANTHROPIC_API_KEY` を使う
  (サブスクから API 課金へ変わる)のいずれかが要る。
- **神の履歴・auto memory が引き継がれない。** 過去の決定が全部見えなくなる。
  `~/.claude/CLAUDE.md`(グローバルルール・日本語で話す等)も消える。
- `.paradise-home` を `.gitignore` しないと資格情報がコミットされる事故が起きる。
  ここは致命的なので機械強制(critic か guard)が要る。
- `CLAUDE_CONFIG_DIR` は project settings から設定できない(仕様)。
  必ず shell 側 = ラッパー必須。

---

## 推奨(判断材料としての整理)

- 神の要求「グローバルに依存するな」を**文字通り**満たすのは **案C だけ**。
  だが認証と履歴の断絶という代償が大きく、`/login` を楽園側でもう一度踏む覚悟が要る。
- 「配備物をグローバルに置くな」という**実質的な要求**なら **案B** が最も安全に届く。
  神の護りを保ったまま、楽園の器は全てリポジトリ内に移せる(実測で全て効いた)。
- **案A** は中間だが、神の deny を自前で写経し直す必要があり、
  「写経しない」という楽園の掟(CLAUDE.md)と正面から衝突する。ここは要注意。

いずれの案でも、**`permissions.allow` の workspace trust は避けられない壁**である。
楽園が allow に依存しているなら、`~/.claude.json` への1回の書き込み(または
managed settings の導入)が前提条件になる。allow を使わず deny + hooks だけで
機械強制を組み直せば、この壁は回避できる。

---

## 未確認事項(正直に)

- `.mcp.json` と `.claude/settings.local.json` は**実測していない**(仕様のみ)。
- `/doctor` の出力は対話モード限定のため未取得。
- managed settings 経路(`managed-settings.json`)は本機で未検証。
  組織配布が無い個人環境のため該当しないと判断した。
- 案C の `.credentials.json` コピー動作は**意図的に試していない**
  (神の資格情報に触れないため)。
