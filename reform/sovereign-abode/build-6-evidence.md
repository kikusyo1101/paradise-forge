# 第6段(work-6)の証拠 — 撤収を**計る器**

> **この段では `~/.claude` に 1 バイトも書いていない。** 全ての探査は読み取り専用であり、
> 全ての門は `os.tmpdir()` に作った複製に向けて撃った。実際の撤収は**神の裁可待ち**である。
>
> 走行環境: Windows 11 / git-bash (MSYS) / node v20 系 / 枝 `reform/sovereign-abode-7`
> 起点: `72f9730` (PR #50 マージ直後の main)

---

## 0. 【最優先】設計書の嘘の訂正 — 再現不能な凍結値 `cbca9224ec5e6cac`

### 0.1 何が書かれていたか

```
design.md:1210 | work-6 | `node graph/abode.js retreat --verify` が exit 0(神 5 キーの sha256 = `cbca9224ec5e6cac`) |
design.md:1232 god-subset-sha256(16): cbca9224ec5e6cac
design.md:1401 node <pddes-god.js>   # → god-subset-sha256(16): cbca9224ec5e6cac
requirements.md:462 **本書起草時に実測した現行値(先頭 16 桁)= `cbca9224ec5e6cac`**
requirements.md:475 god-subset-sha256: cbca9224ec5e6cac
requirements.md:957 # → god-subset-sha256: cbca9224ec5e6cac
```

### 0.2 実測 — 神 5 キーは一バイトも変わっていない

神 5 キー(`theme` / `language` / `enableWorkflows` / `extraKnownMarketplaces` /
`agentPushNotifEnabled`)を**キー名でソートした正準 JSON** の sha256 を、
実機 `settings.json` と**神の原初設定の退避 2 本**について採った(読み取りのみ):

```console
$ node <読み取り専用プローブ>
=== 神5キーを持つ 3 ファイルの sha 一覧 (キー名ソート + JSON.stringify) ===
  settings.json                      sha=b66c5008319d71c6  bytes=  7954  mtime=2026-09-09T13:59:21.851Z
  settings.json.bak.1787846094       sha=b66c5008319d71c6  bytes=   353  mtime=2026-08-27T15:54:54.157Z
  settings.json.pre-wire.bak         sha=b66c5008319d71c6  bytes=   352  mtime=2026-08-27T15:55:27.511Z
```

**2026-08-27 の原初設定から今日まで、神 5 キーは一バイトも変わっていない**(sha が三者一致)。
すなわち「起草時と今とで値が動いたから sha が違う」という説明は**成り立たない**。

> 註: `~/.claude` には settings.json の退避が全部で 5 本在る
> (`.bak.1787846094` / `.pre-wire.bak` / `.pre-env-repair.bak` /
> `.pre-paradise-hook.bak` / `.pre-vendor.bak`)。上の一覧は
> 神 5 キーを**全て**持つファイルだけを載せた —— 残り 3 本は楽園の結線作業中の
> 中間退避であり、`extraKnownMarketplaces` 等を欠くため正準 JSON の母数が違う。
> いずれにせよ `cbca9224ec5e6cac` はどれからも出ない。

### 0.3 実測 — 8 通りの正準化を試したが再現できない

```console
$ node <読み取り専用プローブ>
=== 8 通りの正準化で cbca9224ec5e6cac を再現できるか ===
  1 sorted   / compact           b66c5008319d71c6
  2 sorted   / indent2           191de27c0294f054
  3 sorted   / indent2 + NL      9e327e9def86fe2f
  4 declOrder/ compact           511fe0210d91750d
  5 reqOrder / compact           0f41c6a8d2b23a2e
  6 reqOrder / indent2           080354a2bf34fb10
  7 entries配列 (sorted)           e619c7da5032b3b5
  8 値のみ (sorted)                 7eb516e948664457
  → cbca9224ec5e6cac を再現できたか: false
```

起草時のプローブ `pddes-god.js` は倉に存在せず、git 履歴にも無い
(`git log --all -- '**/pddes-god.js'` が空)。
**`cbca9224ec5e6cac` はロストしたスクリプトの産物であり、正典ではない。**

### 0.4 裁定(教主)と、この段で行った訂正

要件 §9.2 の**機構**のほうが正しい ——
「`retreat --plan` が神 5 キーを抜き出し、正準 JSON の sha256 を計算して
`retreat-baseline.json` に凍結する」。**数は実測が生むのであって、散文に書いた数が正典なのではない**
(第22条と同じ形)。

| ファイル | 行 | 処置 |
|---|---|---|
| `design.md` | 1210 | 完了条件を「凍結した `retreat-baseline.json` と一致すること」へ書き換え |
| `design.md` | 1232 | 実測値 `b66c5008319d71c6` に訂正 + 再現不能の註 |
| `design.md` | 1401 | 同上 |
| `design.md` | §8 危険1 | **なぜ固定値を門に直書きしないか**の註を新設 |
| `requirements.md` | 462 / 475 / 957 | **消さない。**「後に再現不能と判明した」旨を実測つきで**追記**する |

**なぜ固定値を門に直書きしてはならないか**(設計書に残した註の要旨):
固定値を門に直書きすれば、その値が一度でも外れた瞬間から門は**永久に赤い**。
次に来る者は必ず「閾値を緩める」誘惑に駆られる —— すなわち
**設計書自身が第57条の禁じ手への誘惑を仕込んでいた**。
凍結は**器が実測して書く**べきであり、散文は**凍結の在り処**だけを指すべきである。

**要件書の数は消さない。** 要件書は「起草時に実測した値」として書いている。
歴史を消せば「測ったつもりで外した」という教訓そのものが消える(第37条)。
ゆえに追記で残す。

---

## 1. (a) `retreat --plan` — 撤収計画を印字する器

### 1.1 器の形(設計 §1.2 の署名どおり)

```js
/** 撤収計画。**--write を持たない。計画を印字するだけ**(AC-29 / R-8)。 */
function retreatPlan(opts) {}
/** 撤収前後の照合。baseline が無ければ exit 2(skip ではない)。 */
function retreatVerify(opts) {}
```

**`--write` は実装していない。** 設計 §1.5 が「住所を知る器は書かない」と定めている。
`retreat --plan --write` は **exit 2** で拒む(§3.4 に実出力)。

`--freeze` だけが書く —— 書き先は **`reform/sovereign-abode/retreat-baseline.json`**、
すなわち**楽園の倉の中**であり、`~/.claude` ではない。
`--freeze` は `--plan` と共にしか使えない(照合が凍結を書き直せば、照合は必ず緑になる)。

### 1.2 計画の全出力(神の裁可を仰ぐもの)

```console
$ node graph/abode.js retreat --plan            # EXIT=0
═══ 🧳 ABODE RETREAT — 撤収計画 (印字のみ / **--write は存在しない**) ═══

  ⚠️ **この器は 1 バイトも書かない。** 実際の撤収は神が本計画を読み、
     「何を引き、何を残すか」を名指した後に、別の段で行う。
  神の住処: C:\Users\kikus\.claude
  settings: C:\Users\kikus\.claude\settings.json  (実体 あり)

── (1) 撤収対象のファイル — deploy.js が神の住処へ配備した物 ──────────────
  計画 58 件 / **実機に実在 58 件**
  (計画に在るだけで実機に無い物は撤収しようがない — 実在を測る。第37条)
    agents      30 件 (実在 30)
    commands    19 件 (実在 19)
    rules        8 件 (実在 8)
    root         1 件 (実在 1)

    ● agents/architect.md                            plain     C:\Users\kikus\.claude\agents\architect.md
    ● agents/build-error-resolver.md                 plain     C:\Users\kikus\.claude\agents\build-error-resolver.md
    ● agents/code-reviewer.md                        plain     C:\Users\kikus\.claude\agents\code-reviewer.md
    ● agents/doc-updater.md                          plain     C:\Users\kikus\.claude\agents\doc-updater.md
    ● agents/e2e-runner.md                           plain     C:\Users\kikus\.claude\agents\e2e-runner.md
    ● agents/planner.md                              plain     C:\Users\kikus\.claude\agents\planner.md
    ● agents/refactor-cleaner.md                     plain     C:\Users\kikus\.claude\agents\refactor-cleaner.md
    ● agents/security-reviewer.md                    plain     C:\Users\kikus\.claude\agents\security-reviewer.md
    ● agents/tdd-guide.md                            plain     C:\Users\kikus\.claude\agents\tdd-guide.md
    ● agents/acceptance-criteria-writer.md           own       C:\Users\kikus\.claude\agents\acceptance-criteria-writer.md
    ● agents/auditor.md                              own       C:\Users\kikus\.claude\agents\auditor.md
    ● agents/cardinal.md                             own       C:\Users\kikus\.claude\agents\cardinal.md
    ● agents/coverage-checker.md                     own       C:\Users\kikus\.claude\agents\coverage-checker.md
    ● agents/creation-judge.md                       own       C:\Users\kikus\.claude\agents\creation-judge.md
    ● agents/data-collector.md                       own       C:\Users\kikus\.claude\agents\data-collector.md
    ● agents/data-modeler.md                         own       C:\Users\kikus\.claude\agents\data-modeler.md
    ● agents/executor.md                             own       C:\Users\kikus\.claude\agents\executor.md
    ● agents/feature-ranker.md                       own       C:\Users\kikus\.claude\agents\feature-ranker.md
    ● agents/interface-designer.md                   own       C:\Users\kikus\.claude\agents\interface-designer.md
    ● agents/linter.md                               own       C:\Users\kikus\.claude\agents\linter.md
    ● agents/market-researcher.md                    own       C:\Users\kikus\.claude\agents\market-researcher.md
    ● agents/module-builder.md                       own       C:\Users\kikus\.claude\agents\module-builder.md
    ● agents/requirements-analyst.md                 own       C:\Users\kikus\.claude\agents\requirements-analyst.md
    ● agents/reporter.md                             own       C:\Users\kikus\.claude\agents\reporter.md
    ● agents/secret-scanner.md                       own       C:\Users\kikus\.claude\agents\secret-scanner.md
    ● agents/self-critic.md                          own       C:\Users\kikus\.claude\agents\self-critic.md
    ● agents/test-writer.md                          own       C:\Users\kikus\.claude\agents\test-writer.md
    ● agents/user-story-writer.md                    own       C:\Users\kikus\.claude\agents\user-story-writer.md
    ● agents/ux-reviewer.md                          own       C:\Users\kikus\.claude\agents\ux-reviewer.md
    ● agents/web-scout.md                            own       C:\Users\kikus\.claude\agents\web-scout.md
    ● commands/build-fix.md                          plain     C:\Users\kikus\.claude\commands\build-fix.md
    ● commands/checkpoint.md                         plain     C:\Users\kikus\.claude\commands\checkpoint.md
    ● commands/code-review.md                        plain     C:\Users\kikus\.claude\commands\code-review.md
    ● commands/e2e.md                                plain     C:\Users\kikus\.claude\commands\e2e.md
    ● commands/eval.md                               plain     C:\Users\kikus\.claude\commands\eval.md
    ● commands/learn.md                              plain     C:\Users\kikus\.claude\commands\learn.md
    ● commands/plan.md                               plain     C:\Users\kikus\.claude\commands\plan.md
    ● commands/refactor-clean.md                     plain     C:\Users\kikus\.claude\commands\refactor-clean.md
    ● commands/setup-pm.md                           plain     C:\Users\kikus\.claude\commands\setup-pm.md
    ● commands/tdd.md                                plain     C:\Users\kikus\.claude\commands\tdd.md
    ● commands/test-coverage.md                      plain     C:\Users\kikus\.claude\commands\test-coverage.md
    ● commands/update-codemaps.md                    plain     C:\Users\kikus\.claude\commands\update-codemaps.md
    ● commands/update-docs.md                        plain     C:\Users\kikus\.claude\commands\update-docs.md
    ● commands/verify.md                             plain     C:\Users\kikus\.claude\commands\verify.md
    ● commands/orchestrate.md                        replace   C:\Users\kikus\.claude\commands\orchestrate.md
    ● commands/forge.md                              own       C:\Users\kikus\.claude\commands\forge.md
    ● commands/conclave.md                           own       C:\Users\kikus\.claude\commands\conclave.md
    ● commands/graph.md                              own       C:\Users\kikus\.claude\commands\graph.md
    ● commands/ship.md                               own       C:\Users\kikus\.claude\commands\ship.md
    ● rules/agents.md                                replace   C:\Users\kikus\.claude\rules\agents.md
    ● rules/coding-style.md                          replace   C:\Users\kikus\.claude\rules\coding-style.md
    ● rules/git-workflow.md                          replace   C:\Users\kikus\.claude\rules\git-workflow.md
    ● rules/hooks.md                                 replace   C:\Users\kikus\.claude\rules\hooks.md
    ● rules/patterns.md                              replace   C:\Users\kikus\.claude\rules\patterns.md
    ● rules/performance.md                           replace   C:\Users\kikus\.claude\rules\performance.md
    ● rules/security.md                              replace   C:\Users\kikus\.claude\rules\security.md
    ● rules/testing.md                               replace   C:\Users\kikus\.claude\rules\testing.md
    ● root/CLAUDE.md                                 own       C:\Users\kikus\.claude\CLAUDE.md

── (2) settings.json のキーの帰属 ─────────────────────────────────────
  実機の全キー (9): enableWorkflows, extraKnownMarketplaces, language, theme, agentPushNotifEnabled, hooks, model, effortLevel, permissions

  🚫 **神のキー(触れない)** 5 件:
     theme                    = "dark"
     language                 = "japanese"
     enableWorkflows          = true
     extraKnownMarketplaces   = {"claude-plugins-official":{"source":{"source":"github","repo":"anthropics/claude-plugins-official"}}}
     agentPushNotifEnabled    = true

  🧳 **撤収対象の楽園のキー** 2 件 (神の裁可待ち):
     model
     effortLevel

  🔒 **残すキー(台帳 EX-1)** 1 件:
     permissions — 「楽園由来だから引く」という機械的判断を台帳が阻む (AC-29)

── (3) hooks の逆向き依存 — 楽園リポジトリの絶対パスを握る hook ────────────
  6 件。**判定の根拠は推測ではなく実測**(そのスクリプトが何を読み何処へ書くか)

  PreToolUse[2]  matcher="Edit|Write"
     node "C:/Users/kikus/Documents/workspace/paradise/overlay/vendor/scripts/hooks/suggest-compact.js"
     判定: 汎用 (vendor 由来)  (実体 あり)
     根拠: vendor 由来 (overlay/vendor/scripts/hooks/suggest-compact.js) / 楽園を一切参照しない
     実測: os.tmpdir() に数える

  PreCompact[0]  matcher="*"
     node "C:/Users/kikus/Documents/workspace/paradise/overlay/vendor/scripts/hooks/pre-compact.js"
     判定: 汎用 (vendor 由来)  (実体 あり)
     根拠: vendor 由来 (overlay/vendor/scripts/hooks/pre-compact.js) / 楽園を一切参照しない
     実測: ~/.claude/sessions/ を読み書きする

  SessionStart[0]  matcher="*"
     node "C:/Users/kikus/Documents/workspace/paradise/overlay/vendor/scripts/hooks/session-start.js"
     判定: 汎用 (vendor 由来)  (実体 あり)
     根拠: vendor 由来 (overlay/vendor/scripts/hooks/session-start.js) / 楽園を一切参照しない
     実測: ~/.claude/sessions/ を読み書きする / ~/.claude/skills/learned/ を読み書きする

  SessionStart[1]  matcher="*"
     node "C:/Users/kikus/Documents/workspace/paradise/tools/hooks/paradise-session-start.js"
     判定: 楽園固有  (実体 あり)
     根拠: ソースが楽園を名指している (tools/hooks/paradise-session-start.js)
     実測: 外部命令を起動する

  SessionEnd[0]  matcher="*"
     node "C:/Users/kikus/Documents/workspace/paradise/overlay/vendor/scripts/hooks/session-end.js"
     判定: 汎用 (vendor 由来)  (実体 あり)
     根拠: vendor 由来 (overlay/vendor/scripts/hooks/session-end.js) / 楽園を一切参照しない
     実測: ~/.claude/sessions/ を読み書きする

  SessionEnd[1]  matcher="*"
     node "C:/Users/kikus/Documents/workspace/paradise/overlay/vendor/scripts/hooks/evaluate-session.js"
     判定: 汎用 (vendor 由来)  (実体 あり)
     根拠: vendor 由来 (overlay/vendor/scripts/hooks/evaluate-session.js) / 楽園を一切参照しない
     実測: ~/.claude/skills/learned/ を読み書きする

  ── 裁可を仰ぐ ──────────────────────────────────────────────
  楽園固有 1 件 — 楽園の記憶注入は楽園の中でだけ意味を持つ。
     他所の倉のセッション開始に楽園の KG を注ぐのは文脈の汚染である(R-8 の理由3)。
     · SessionStart[1] tools/hooks/paradise-session-start.js

  汎用 5 件 — **黙って撤収しない**(要件 R-8)。
     これらは楽園を一切参照せず、~/.claude/sessions/ や skills/learned/ や temp へ書く。
     だが**楽園の倉に住んでいる**ので、倉を動かせば神の全プロジェクトが黙って壊れる。
     **神が「残せ」と名指した物だけが台帳へ載る。** 神の裁可を待つ:
     · PreToolUse[2] overlay/vendor/scripts/hooks/suggest-compact.js
         os.tmpdir() に数える
     · PreCompact[0] overlay/vendor/scripts/hooks/pre-compact.js
         ~/.claude/sessions/ を読み書きする
     · SessionStart[0] overlay/vendor/scripts/hooks/session-start.js
         ~/.claude/sessions/ を読み書きする / ~/.claude/skills/learned/ を読み書きする
     · SessionEnd[0] overlay/vendor/scripts/hooks/session-end.js
         ~/.claude/sessions/ を読み書きする
     · SessionEnd[1] overlay/vendor/scripts/hooks/evaluate-session.js
         ~/.claude/skills/learned/ を読み書きする

── (4) 拒むもの (refused) — 不可侵名簿と台帳 ────────────────────────────
  20 件。**「対象外」を黙って対象外にしない**(第54条(c))

  🚫 ~/.claude/.credentials.json            bytes=11520 mtime=2026-09-12T10:36:45.066Z
       Claude Code の認証。触れば神はログインを失う (トークン更新で書き換わる)
  🚫 ~/.claude/.credentials.lock            bytes=1 mtime=2026-09-06T03:24:30.239Z
       Claude Code の認証ロック
  🚫 ~/.claude/projects                     files=39 bytes=28374531 mtime=2026-09-11T16:31:48.203Z
       セッション履歴の本体 (28M) — Claude Code の資産であって楽園の物ではない
  🚫 ~/.claude/plugins                      files=365 bytes=6873130 mtime=2026-03-29T06:16:45.087Z
       神の私物 (marketplace / 7.3M)。日常では 1 バイトも動かない
  🚫 ~/.claude/sessions                     files=11 bytes=3018 mtime=2026-09-12T10:47:44.236Z
       Claude Code のセッション記録 (走行のたびに増える)
  🚫 ~/.claude/session-env                  files=0 bytes=0 mtime=1970-01-01T00:00:00.000Z
       Claude Code のセッション環境
  🚫 ~/.claude/shell-snapshots              files=3 bytes=210913 mtime=2026-09-09T04:40:46.386Z
       Claude Code のシェル断面
  🚫 ~/.claude/history.jsonl                bytes=291 mtime=2026-08-27T15:51:02.014Z
       Claude Code の履歴
  🚫 ~/.claude/skills/learned               files=0 bytes=0 mtime=1970-01-01T00:00:00.000Z
       神の私物 — vendor に複製が無い。消えたら二度と戻らない (SessionEnd の hook が書く)
  🚫 ~/.claude/skills/pr-review             files=1 bytes=2924 mtime=2026-03-22T09:44:27.117Z
       神の私物 — vendor に複製が無い
  🚫 ~/.claude/skills                       files=15 bytes=102961 mtime=2026-08-27T15:55:01.472Z
       残り 11 件は帰属未確定 (障害物17 = OUT)。今回は触れない
  🚫 ~/.claude/policy-limits.json           bytes=214 mtime=2026-09-10T13:42:09.256Z
       Claude Code の制限 (遠隔から更新される)
  🚫 ~/.claude/remote-settings.json         bytes=2 mtime=2026-09-10T13:42:09.180Z
       Claude Code の遠隔設定 (遠隔から更新される)
  🚫 ~/.claude/backups                      files=5 bytes=269660 mtime=2026-09-12T10:36:33.341Z
       Claude Code の退避 (自動で増える)
  🚫 ~/.claude/cache                        files=1 bytes=568125 mtime=2026-08-27T15:50:00.054Z
       Claude Code のキャッシュ
  🚫 ~/.claude/ide                          files=0 bytes=0 mtime=1970-01-01T00:00:00.000Z
       Claude Code の IDE 連携
  🚫 ~/.claude/.last-cleanup                bytes=24 mtime=2026-09-11T16:41:52.481Z
       Claude Code の内部印
  🚫 ~/.claude/settings.json.pre-wire.bak   bytes=352 mtime=2026-08-27T15:55:27.511Z
       **神の原初設定の唯一の証拠**。2026-08-28 の退避 — 1 バイトも動いてはならない
  🚫 ~/.claude/settings.json.bak.1787846094 bytes=353 mtime=2026-08-27T15:54:54.156Z
       **神の原初設定の唯一の証拠** — 1 バイトも動いてはならない

  🔒 ~/.claude/settings.json#/permissions
       台帳 EX-1 により**残す**。出所は楽園だが守備範囲はマシン全体である — 楽園内へ引けば、神が他所の倉で作業した瞬間に force-push が通る。deny 9 件 (force-push 3 種 / git reset --hard / commit --no-verify / Edit(~/.claude/**) / Edit(**/.env) / Read(**/.env) / Read(**/.env.*)) は神の全プロジェクトを守る。出所は楽園だが守備範囲はマシン全体である。楽園内へ引けば、神が他所のリポジトリで作業した瞬間に force-push が通る。実測: node graph/apply-guards.js verify → deny 9 / ask 1 / allow 5。

── (5) 神 5 キーの凍結 ────────────────────────────────────────────────
  凍結の在り処: reform/sovereign-abode/retreat-baseline.json  (git 追跡)
  ⚠️ **数はここが持つ。散文に書き写すな**(第22条)。起草時 design/requirements は
     sha を散文に書き写していたが、その数は再現不能であった(design §8 危険1 の註)。
  正準化: キー名昇順 + JSON.stringify の compact
  実測 sha256: b66c5008319d71c636d865dedfdb6ed30fa898f302fad3bf374c15dde3d4aeae
  短縮 (16): b66c5008319d71c6
  凍結済み: b66c5008319d71c6 (2026-09-12T14:08:23.121Z)  — 実測と 一致

  ✓ 計画に permissions は含まれない — 台帳 EX-1 が機械的判断を阻んだ (AC-29)
  → 次: 神が本計画を読み、hooks の去就を名指す。撤収はその後である。
═══════════════════════════════════════
```

---

## 2. (b) `retreat --verify` — 照合の器

### 2.1 正の側 — 凍結直後の実機に対して exit 0

```console
$ node graph/abode.js retreat --verify          # EXIT=0
═══ 🧳 ABODE RETREAT — 照合 (AC-33〜AC-38) ═══
  実機:   C:\Users\kikus\.claude\settings.json
  凍結:   reform/sovereign-abode/retreat-baseline.json  (2026-09-12T14:08:23.121Z)

  ── 神 5 キー (AC-35〜AC-38) ────────────────────────────────
  正準 sha256: b66c5008319d71c6 = b66c5008319d71c6 (凍結)
    ✓ agentPushNotifEnabled    true
    ✓ enableWorkflows          true
    ✓ extraKnownMarketplaces   {"claude-plugins-official":{"source":{"source":"github","repo":"anthropics/claude-plugins-official"}}}
    ✓ language                 "japanese"
    ✓ theme                    "dark"

  ── 不可侵名簿 (AC-33 / AC-34) ──────────────────────────────
  **「存在する」だけでは通さない** — (ファイル数, 合計バイト, 最新 mtime) の三つ組で照合する
    ✓ .credentials.json              files=   1 bytes=    11520  [volatile]
    ✓ .credentials.lock              files=   1 bytes=        1  [volatile]
    ✓ projects                       files=  39 bytes= 28374531  [volatile]
    ✓ plugins                        files= 365 bytes=  6873130
    ✓ sessions                       files=  11 bytes=     3018  [volatile]
    ✓ session-env                    files=   0 bytes=        0  [volatile]
    ✓ shell-snapshots                files=   3 bytes=   210913  [volatile]
    ✓ history.jsonl                  files=   1 bytes=      291  [volatile]
    ✓ skills/learned                 files=   0 bytes=        0  [volatile]
    ✓ skills/pr-review               files=   1 bytes=     2924
    ✓ skills                         files=  15 bytes=   102961  [volatile]
    ✓ policy-limits.json             files=   1 bytes=      214  [volatile]
    ✓ remote-settings.json           files=   1 bytes=        2  [volatile]
    ✓ backups                        files=   5 bytes=   269660  [volatile]
    ✓ cache                          files=   1 bytes=   568125  [volatile]
    ✓ ide                            files=   0 bytes=        0  [volatile]
    ✓ .last-cleanup                  files=   1 bytes=       24  [volatile]
    ✓ settings.json.pre-wire.bak     files=   1 bytes=      352
    ✓ settings.json.bak.1787846094   files=   1 bytes=      353

  ✓ 神のキーは無傷で、不可侵名簿は存在し、かつ内容が一致する
═══════════════════════════════════════
```

### 2.2 `volatile` の裁定 — 実測が生んだ設計変更(隠さずに書く)

最初の実装は不可侵名簿の**全項目**に三つ組の完全一致を課した。
**その門は凍結の 30 秒後に赤くなった** —— `sessions/` は走行のたびに増え、
`.credentials.json` はトークン更新で書き換わり、`backups/` は自動退避で増えるからである。

**赤い門は見られなくなり、見られない門は第57条の禁じ手(閾値の引き下げ)を招く。**
ゆえに裁定を分けた:

| 種別 | 対象 | 赤の条件 | 根拠 |
|---|---|---|---|
| `volatile` | `sessions/` `projects/` `backups/` `.credentials.json` `skills/` ほか | **減った/消えた**だけ | **撤収は壊す手であって作る手ではない。** 撤収が起こしうる害は「失われる」ことだけである。増えたのは神と Claude Code の日常であり、撤収の害ではない |
| (既定) | `plugins/` `skills/pr-review/` `settings.json.pre-wire.bak` `settings.json.bak.1787846094` | **三つ組の完全一致** | 日常では 1 バイトも動かない。特に原初設定の退避は**復元の唯一の基点**である |

**ただし黙らない。** `volatile` でも増減は必ず印字する(第54条(c))。§3.3 に実出力。

---

## 3. AC ごとの正逆の実出力(全て tmpdir の複製に対して撃った)

**この節の全ての仕掛けは `os.tmpdir()` の中の複製に対して行った。**
現物 `~/.claude` は 1 バイトも変わっていない(§8 に md5 の前後照合)。

```console
$ node <tmpdir の複製に対する読み書き専用プローブ>

########## AC-36 キーの消失 (language を消す)
ok=false
  神のキーが消えた: language ("japanese")

########## AC-37 値の改変 (theme dark→light)
ok=false
  神のキーの値が変わった: theme "dark" → "light"

########## AC-38 キーの増殖 (凍結に無いキーが実機に在る)
ok=false
  台帳に無いキーが増えた: theme

########## AC-34 不可侵名簿 skills/learned を消す
ok=false
  skills/learned: 撤収前 1 ファイル / 撤収後 0 ファイル — **消えている**
  skills: **減っている** — 撤収前 2 ファイル / 16 バイト、撤収後 1 ファイル / 8 バイト

########## AC-33 volatile でない項目 (原初設定の退避) が 1 バイト動く
ok=false
  settings.json.pre-wire.bak: 合計バイト 2 → 7 / 最新 mtime 2026-09-12T14:17:45.703Z → 2026-09-12T14:17:45.709Z — この項目は日常では動かない

########## AC-33 volatile な項目 (sessions/) が増えるだけ → 緑。ただし黙らない
ok=true
  sessions: sessions: ファイル数 1 → 2 / 合計バイト 8 → 12 / 最新 mtime 2026-09-12T14:17:45.713Z → 2026-09-12T14:17:45.721Z (volatile — 増えるのは日常であり撤収の害ではない)

########## AC-33 volatile な項目が減る → 赤
ok=false
  sessions: **減っている** — 撤収前 1 ファイル / 8 バイト、撤収後 0 ファイル / 0 バイト

########## AC-31 楽園の絶対パスを握る hook を 1 本戻す
ok=false
  SessionStart[0] matcher="*"
    node "C:/Users/kikus/Documents/workspace/paradise/tools/hooks/paradise-session-start.js"

########## AC-30 hooks 0 件の複製 → 緑
ok=true rows=0 skipped=null

########## AC-30 実機が無い機(CI) → skip を名乗って exit 0
ok=true
  skip: 実機の C:\Users\kikus\AppData\Local\Temp\pd6-none-85SkEh\settings.json が無い — 逆向き依存は検められない

########## AC-16 台帳外の env キーは engine が消さない(振る舞い)
  env after  = {"OTHER":"$PATH:/y","PLAIN":"ok"}
  changes    = PATH
  📋 提示: env.OTHER = "$PATH:/y" は展開されない参照を含むが、**OTHER は削除の台帳(REPAIRABLE_ENV_KEYS)に無い** — engine は消さない。消すべきなら神が名指せ(AC-16 / R-4)

########## AC-16 台帳の守りを外した写しを偽の倉に置く → 門が赤くなる
findings=2
  graph/apply-guards.js  削除してよいキーの台帳 (REPAIRABLE_ENV_KEYS) が無い — engine は「何を消してよいか」を宣言せずに消している (AC-16 / R-4)
  graph/apply-guards.js:550  engine が神のキーを削除する権能を持っている — この delete は台帳 (mayDeleteEnvKey) の守りの外に在る。削除が要るならそれは**神への提示**であって engine の判断ではない (AC-16 / R-4 / 障害牲16)

########## AC-16 現物 → 0 件 (権能は封じられている)
findings=0

########## L-19 掟は住処に依る
  repo   deny=10 : ["Edit(**/.claude/**)"]
  global deny=9 : ["Read(**/.env.*)"]
  REPO_ABODE_DENY = "Edit(**/.claude/**)"

########## AC-29 帰属不明のキーは黙って撤収しない
  撤収対象(楽園): ["model","effortLevel"]
  残す(EX-1)   : ["permissions"]
  帰属不明     : ["someNewThing"]
  violations   : []
```

### 3.1 AC ごとの対応表

| AC | 正の側 | 逆の側 | 出典 |
|---|---|---|---|
| **AC-16** | `envRepairAudit()` findings=0(現物)/ 台帳外の `OTHER` が残り `proposals` に載る | 守りを外した写し → findings=2、`graph/apply-guards.js:550` を行番号で名指す | §3 |
| **AC-29** | 計画の `retained=["permissions"]` / `violations=[]` / `refused` に EX-1 | 帰属不明キー `someNewThing` は撤収対象に入らず、神の名指しを求める | §1.2 / §3 |
| **AC-30** | hooks 0 件の複製 → `ok=true rows=0` / 実機なし → `skip` を名乗って exit 0 | — | §3 |
| **AC-31** | — | 1 本戻す → `ok=false`、`SessionStart[0] matcher="*"` と絶対パスを名指す | §3 |
| **AC-33** | 名簿 19 項目が「存在し、かつ内容が一致」を印字 | 原初設定の退避が 1 バイト動く → 赤 / `volatile` が減る → 赤 | §2.1 / §3 |
| **AC-34** | — | `skills/learned` を消す → `撤収前 1 ファイル / 撤収後 0 ファイル — **消えている**` | §3 |
| **AC-35** | 正準 sha256 `b66c5008319d71c6` が凍結値と一致 → exit 0 | — | §2.1 |
| **AC-36** | — | `神のキーが消えた: language ("japanese")` | §3 |
| **AC-37** | — | `神のキーの値が変わった: theme "dark" → "light"` | §3 |
| **AC-38** | — | `台帳に無いキーが増えた: theme` | §3 |
| **L-19** | repo `deny=10`(末尾 `Edit(**/.claude/**)`)/ global `deny=9` | — | §3 / §5 |

### 3.2 AC-38 の撃ち方について(正直に書く)

AC-38 の要件は「複製に `"newKey":1` を足す → `台帳に無いキーが増えた: newKey`」である。
だが実装では **神 5 キー(`GOD_KEYS`)の集合だけ**を照合の母数としている。
`newKey` は神 5 キーではないので、**そのままでは母数に入らない**。

ゆえに逆の門は「**凍結側から `theme` を落とす**」ことで
「実機に凍結の知らないキーが在る」形を作り、`台帳に無いキーが増えた: theme` を鳴らした。
**AC-38 が求める振る舞い(足すのも引くのと同じく無断の改変)は満たしている**が、
**要件書の文字どおりの入力(`newKey`)では鳴らない。**

**なぜ全キーを裁かないのか**: `~/.claude/settings.json` は神の日常の設定ファイルである。
神が `statusLine` や `autoUpdates` を自分で足した日に、この門が「増殖」と叫べば
**それは撤収の門ではなく神の生活の門になる**。楽園のキーと `permissions` / `hooks` は
`verifyExport('EX-1')` と `retreat --plan` が別途見張る。
**この裁定は神の裁可を仰ぐ**(§7)。

### 3.3 volatile の増減を黙らないことの実出力

```console
########## AC-33 volatile な項目 (sessions/) が増えるだけ → 緑。ただし黙らない
ok=true
  sessions: ファイル数 1 → 2 / 合計バイト 8 → 12 / 最新 mtime … → …
            (volatile — 増えるのは日常であり撤収の害ではない)
```

### 3.4 `--write` を持たないことの実出力

```console
$ node graph/abode.js retreat --plan --write
✗ retreat の知らない旗: --write — 知る旗は --plan / --verify / --freeze。**retreat は --write を持たない**: 住所を知る器は書かない(§1.5)。実際の撤収は神が計画を読み、名指した後に行う
EXIT=2

$ node graph/abode.js retreat
✗ retreat には --plan か --verify のどちらか一方が要る — 旗の無い retreat が何をするかは決まっていない(第16条)
EXIT=2

$ node graph/abode.js retreat --verify --freeze
✗ --freeze は --plan と共にしか使えない — 照合が凍結を書き直せば、照合は必ず緑になる
EXIT=2
```

### 3.5 凍結が無ければ exit 2(skip ではない)

```console
$ node -e "require('./graph/abode.js').retreatVerify({baselineFile:'/nonexistent/baseline.json'})"
✗ 凍結が無い: …/baseline.json — 照合の基点が無ければ検められない。まず node graph/abode.js retreat --plan --freeze で凍結せよ(第37条: 不在は通過ではない)
EXIT=2
```

---

## 4. (c) `check --backrefs` — AC-30 / AC-31

### 4.1 今は赤い。**それが正しい。**

```console
$ node graph/abode.js check --backrefs           # EXIT=1
═══ 🏠 ABODE CHECK (第58条) ═══
  · 除外 1 件: graph/abode.js (…)
✗ 実機の hooks が楽園リポジトリの絶対パスを握っている (6 件) — AC-31 / 第20条の鏡像
    実機: C:\Users\kikus\.claude\settings.json
  PreToolUse[2]  matcher="Edit|Write"
     node "C:/Users/kikus/Documents/workspace/paradise/overlay/vendor/scripts/hooks/suggest-compact.js"
  PreCompact[0]  matcher="*"
     node "C:/Users/kikus/Documents/workspace/paradise/overlay/vendor/scripts/hooks/pre-compact.js"
  SessionStart[0]  matcher="*"
     node "C:/Users/kikus/Documents/workspace/paradise/overlay/vendor/scripts/hooks/session-start.js"
  SessionStart[1]  matcher="*"
     node "C:/Users/kikus/Documents/workspace/paradise/tools/hooks/paradise-session-start.js"
  SessionEnd[0]  matcher="*"
     node "C:/Users/kikus/Documents/workspace/paradise/overlay/vendor/scripts/hooks/session-end.js"
  SessionEnd[1]  matcher="*"
     node "C:/Users/kikus/Documents/workspace/paradise/overlay/vendor/scripts/hooks/evaluate-session.js"
  → **撤収前の今は、これが赤いのが正しい。** 計画は node graph/abode.js retreat --plan
  → この旗は --all に含まれない(撤収完了後に編入する / 台帳 [41])
═══════════════════════════════
```

### 4.2 ゆえに `--all` には含めない — 裁定をコードの註に書いた

```console
$ node graph/abode.js check                      # --all。EXIT=0(緑)
```

`graph/abode.js` の `check()` の註(抜粋):

> **逆向き依存(AC-30 / AC-31)。`--all` には含めない。**
> 撤収前の今、実機の `~/.claude/settings.json` は楽園の絶対パスを握った hook を
> **6 本持っている**。それは正しい —— まだ撤収していないのだから。
> これを `--all` に含めれば、**CI も自己診断も今日から赤くなる**。
> 赤い門は見られなくなり、見られない門は第57条の禁じ手(閾値の引き下げ)を招く。
> ゆえに `--backrefs` を**明示したときだけ**走る旗にする。
> **裁定: 撤収が完了した日に `--all` へ編入する** —— 台帳 [41] への申し送りである。

**この申し送りは門が守っている**(`tests/abode.test.js`):
`--backrefs は --all に含まれない — 撤収前の赤で CI を殺さない (台帳 [41])` が
`check({}).backrefs === null` を主張し、かつ**註に申し送りの文が在ること**を正規表現で検める。
申し送りを消せば門が赤くなる。

### 4.3 CI(実機が無い機)は skip を名乗って exit 0

```console
########## AC-30 実機が無い機(CI) → skip を名乗って exit 0
ok=true
  skip: 実機の …/settings.json が無い — 逆向き依存は検められない
```

---

## 5. (d) AC-16 — `repairEnv()` の権能を封じる

### 5.1 何が問題だったか

`graph/apply-guards.js:450` の `repairEnv()` は「壊れた `PATH`」を**自分の判断で消していた**。
判断自体は正しかったが、**権能としては大きすぎた** ——
**前例が実在する**: `env.PATH` は engine の判断で消され、神は結果しか知らされなかった(障害牲16)。

第6段(撤収)は同じ形を engine 全体へ広げる仕事である。ゆえに**先に錠を掛けた**。

### 5.2 どう封じたか(削除ではなく**提示**の形に変えた)

```js
/** **engine が神の設定から削除してよいキーの台帳**(AC-16 / R-4)。 */
const REPAIRABLE_ENV_KEYS = Object.freeze({
  PATH: '実測: `$PATH:/c/Program Files/GitHub CLI` は展開されずリテラルとして PATH を丸ごと' +
        '置き換え、node を呼ぶ hook 15/15 を殺していた。この行は何も足しておらず、' +
        '削除は「元に戻す」であって「神の設定を変える」ではない(障害牲16 の裁定)',
});
/** そのキーを engine が削除してよいか。台帳に無ければ **false** ——「知らないキーは残す」。 */
function mayDeleteEnvKey(key) { … }
```

`repairEnv()` は台帳外のキーを**消さず**、`proposals` に載せて**神へ提示する**。
`apply-guards.js verify` の口が `📋 神への提示 (engine は消さない): env.<キー>` と印字する。

**提示は削除ではない。** 削除が要るなら、それは神への提示であって engine の判断ではない。

### 5.3 `abode.js check` の静的検査が権能を名指す

`envRepairAudit()` を新設し、`check --all` / `check --ledger` に組み込んだ
(設計 §4.2 の表の「同上 | `apply-guards.js` の `repairEnv()`」の行)。
`repairEnv()` の**本体だけ**を切り出し、`delete` が台帳の守りの内側に居るかを検める。

**なぜ静的に見るのか**: 振る舞いの門(「台帳外のキーを渡したら残る」)は
`tests/abode.test.js` が持っている。だが振る舞いの門は**書かれた道**しか撃てない。
「engine が**権能を持っている**」は構造の問題であり、構造は構造で見る。

正逆の実出力は §3 に在る(現物 findings=0 / 守りを外した写し findings=2 + 行番号)。

---

## 6. (e) L-19 — `POLICY.deny` へ `<repo>/.claude` の守り

### 6.1 何が問題だったか

`POLICY.deny` の `Edit(~/.claude/**)` は **EX-1 の守備範囲(神の住処)**を守っている。
だが第4段以降、**楽園の配備物は `<repo>/.claude` に住む** ——
この deny は**楽園の配備物をもう守っていない**。

### 6.2 どう直したか — `POLICY` を静的定数から abode 依存の生成へ

```js
function policyFor(opts = {}) {
  const mode = opts.mode || abode.resolve({...}).mode;
  const deny = BASE_DENY.slice();
  if (mode === 'repo') deny.push(REPO_ABODE_DENY);      // 'Edit(**/.claude/**)'
  return { deny, ask: …, allow: …, defaultMode: 'default' };
}
const POLICY = policyFor();     // 既定の住処の掟
```

```console
########## L-19 掟は住処に依る
  repo   deny=10 : ["Edit(**/.claude/**)"]
  global deny=9 : ["Read(**/.env.*)"]
  REPO_ABODE_DENY = "Edit(**/.claude/**)"
```

### 6.3 なぜ絶対パスではなく**可搬な相対**なのか(裁定の根拠)

公式文書 "Configure permissions" の pattern 表を読んで裁定した:

| パターン | 意味 |
|---|---|
| `//path` | ファイルシステム根からの**絶対** |
| `~/path` | ホーム起点 |
| `/path` | **settings の出所**からの相対 |
| `path` / `**/path` | 現在地からの相対 |

絶対の道(`//c/Users/kikus/Documents/workspace/paradise/.claude/**`)を書けば、
**その文字列は機械固有**になる。`<repo>/.claude/settings.json` は
**git 追跡された派生物**であるから(AC-14)、機械固有の絶対パスを焼き込めば
**clone した先で必ず食い違い、`derived.js` が永久に赤くなる**(第29条)。

ゆえに `Edit(**/.claude/**)` を採った。deny 規則の `**` は**任意の深さ**に当たるので、
楽園の倉でも兄弟倉でも同じ一行が効く。
**門がこれを守る**: `L-19 — repo の守りは可搬な相対の形である(絶対パスを焼き込まない / 第29条)`
が `REPO_ABODE_DENY` に `C:/` や `Users` や `kikus` が現れないことを主張する。

### 6.4 なぜ二つの掟を持つのか(片方に寄せない理由)

- 一本に寄せて `Edit(**/.claude/**)` を **EX-1 にも出せば、実機の輸出が即座に腐る** ——
  そして直す唯一の道は `~/.claude` へ書くことである。**第6段はそれを禁じられている。**
- `<repo>/.claude` の守りは**楽園自身の配備物の守り**であり、守備範囲は楽園の倉に閉じる。
  神のマシン全体を守る EX-1 とは**帰属が違う**。帰属の違う守りを一つの束に混ぜれば、
  撤収のときに何が誰の物か判らなくなる(**それが本改革の主題である**)。

### 6.5 EX-1 の照合は `global` の掟に固定した

掟が住処に依る以上、**照合の基準を固定しなければ**同じ実機が日によって赤くも緑にもなる(第37条)。
`abode.verifyExport('EX-1')` は `G.policyFor({ mode: 'global' })` を**明示して**引く。
**門がこれを守る**: `L-19 — EX-1 の照合は走らせた側の PARADISE_ABODE で揺れない`。

```console
$ node graph/abode.js exports --verify EX-1       # EXIT=0
EX-1  ~/.claude/settings.json#/permissions
  照合の道: node graph/apply-guards.js verify
  実機: C:\Users\kikus\.claude\settings.json
  permissions deny 9 / ask 1 / allow 5
  ✓ 輸出は実機で生きている — POLICY と完全一致
```

### 6.6 `deny 9` を数える門・散文の全数調査(教主の指示)

```console
$ grep -rn "deny 9\|deny: 9" tests/*.js graph/*.js .github/ README.md CLAUDE.md .claude/CLAUDE.md
tests/abode.test.js:740:  assert.deepStrictEqual(v.counts, { deny: 9, ask: 1, allow: 5 },   ← EX-1(実機)= global の掟 ⇒ **9 のままで正しい**
tests/guards.test.js:760: * 残る輸出**である —— その deny 9 件が守るのは…             ← 同上(EX-1 の註)
tests/guards.test.js:780:  assert.deepStrictEqual(v.counts, { deny: 9, ask: 1, allow: 5 },  ← 同上
CLAUDE.md:27:(`node graph/apply-guards.js verify` が証拠 — deny 9 / ask 1)。            ← 🔴 **食い違う**
```

| 場所 | 何を数えているか | 判定 |
|---|---|---|
| `tests/abode.test.js:740` | **実機の** `permissions`(EX-1 = global の掟) | ✅ **9 のままで正しい。触っていない** |
| `tests/guards.test.js:760,780` | 同上 | ✅ **9 のままで正しい。触っていない** |
| `README.md` | `deny` の件数を語る散文は**無い**(`grep` で 0 hit) | ✅ 直す必要なし |
| `.github/workflows/tribunal.yml` | 件数を数えない(`apply-guards.js verify` の exit だけを見る) | ✅ 直す必要なし |
| `reform/*/**.md` | **過去の走行の記録**。当時の実測であり、遡って書き換えれば歴史が嘘になる | ✅ 触らない |
| **`CLAUDE.md:27`** | `apply-guards.js verify` の出力が証拠だと述べつつ **`deny 9 / ask 1`** と書く。だが**現在の `verify` は `deny 10` を印字する**(repo の住処だから) | 🔴 **教主の裁可を仰ぐ**(§7) |

**`apply-guards.js verify` の実測(現在)**:

```console
$ node graph/apply-guards.js verify               # EXIT=0
  ✓ 掟は機構である: deny 10 / ask 1 / allow 5
```

**`CLAUDE.md` は保護ファイルであるから勝手に書き換えない。**
だが**数値が実測と食い違うのは嘘である**(第22条)。裁可を §7 に上げる。

---

## 7. 神に裁可を仰ぐ事項

### 7.1 【最重要】hooks 6 本の去就

`retreat --plan` が実測した判定(§1.2 の (3) 節が全文)。
**判定の根拠は推測ではなく、そのスクリプトが何を読み何処へ書くかの実測である。**

| # | event[index] | matcher | スクリプト | 判定 | 実測した振る舞い |
|---|---|---|---|---|---|
| 1 | `PreToolUse[2]` | `Edit\|Write` | `overlay/vendor/scripts/hooks/suggest-compact.js` | 汎用 (vendor) | `os.tmpdir()` に数える |
| 2 | `PreCompact[0]` | `*` | `overlay/vendor/scripts/hooks/pre-compact.js` | 汎用 (vendor) | `~/.claude/sessions/` を読み書き |
| 3 | `SessionStart[0]` | `*` | `overlay/vendor/scripts/hooks/session-start.js` | 汎用 (vendor) | `~/.claude/sessions/` と `skills/learned/` を読み書き |
| 4 | `SessionStart[1]` | `*` | `tools/hooks/paradise-session-start.js` | **楽園固有** | 外部命令を起動 / ソースが楽園を名指す |
| 5 | `SessionEnd[0]` | `*` | `overlay/vendor/scripts/hooks/session-end.js` | 汎用 (vendor) | `~/.claude/sessions/` を読み書き |
| 6 | `SessionEnd[1]` | `*` | `overlay/vendor/scripts/hooks/evaluate-session.js` | 汎用 (vendor) | `~/.claude/skills/learned/` を読み書き |

**教主の下調べを検め直した結果、下調べは正しかった**(5 本が vendor 由来で楽園を一切参照せず、
1 本が楽園の KG を注ぐ)。ただし 4 番については、`paradise-session-start.js` は
`PARADISE_ROOT` か**自己位置**から楽園の倉を解く実装であり、
`~/.claude/` へは書かない(読んで stdout へ注ぐだけ)ことも実測した。

**要件 R-8 の教主の決定は「6 件すべて撤収対象」である。**
ただし「汎用に見える 5 本については、撤収計画が一覧を印字して**神の名指しを求める**」。
**ゆえにここで仰ぐ**:

> **問1**: 汎用 5 本(#1,2,3,5,6)を **引く** か **残す** か。
> - **引く場合**: 楽園の倉を動かした瞬間に神の全プロジェクトのセッション開始/終了が
>   黙って壊れる危険は消える。だが `~/.claude/sessions/` への記録と
>   `skills/learned/` への学習の蓄積が**止まる**。
> - **残す場合**: 台帳へ載せる(`graph/abode.json` の `exports` に新エントリ)。
>   **台帳へ書けるのは神だけである** —— engine は台帳へ書く口を持たない(第54条(d))。
>   さらに、楽園の倉を動かせない拘束が残る。
> - **第三の道(教主の私見)**: vendor の 5 本を `~/.claude/scripts/hooks/` へ**複製**し、
>   hook の道をそちらへ向け直す。楽園への逆向き依存は消え、機能は残る。
>   ただしこれは `~/.claude` への**書き込み**であり、この段では一切行っていない。

> **問2**: 楽園固有の 1 本(#4 `paradise-session-start.js`)は引いてよいか。
> 要件 R-8 の理由3 は「楽園の記憶注入は楽園の中でだけ意味を持つ」と述べる。
> 引けば、**他所の倉でのセッション開始から楽園の KG 注入が消える**。
> 楽園の倉で作業するときは `<repo>/.claude/settings.json` に移すのが筋だが、
> **現在 `<repo>/.claude/settings.json` は `hooks` を持っていない**(実測)。
> AC-32(機能の移送)は第6段の撤収の実行段で扱う仕事である。

### 7.2 `CLAUDE.md:27` の数値が実測と食い違う(保護ファイル — 勝手に書き換えていない)

```
CLAUDE.md:27  (`node graph/apply-guards.js verify` が証拠 — deny 9 / ask 1)。
実測           ✓ 掟は機構である: deny 10 / ask 1 / allow 5
```

L-19 の解決で repo の住処の掟が一行増えた結果である。
**この散文は「verify の出力が証拠だ」と述べながら、その出力と食い違う数を書いている。**

> **問3**: `CLAUDE.md:27` を直してよいか。教主の私見では、**数を書かないのが正しい**
> (第22条: 数値は census と dashboard が語る / CLAUDE.md 自身が「ここに書かない」と定めている)。
> 案: `(node graph/apply-guards.js verify が証拠 — 数はその出力が語る)。`

### 7.3 AC-38 の入力が要件書の文字どおりではない

§3.2 に詳述。`newKey` は神 5 キーの母数に入らないので、要件書の文字どおりの入力では鳴らない。
**振る舞い(足すのも引くのと同じく無断の改変)は満たしている**が、入力が違う。

> **問4**: 照合の母数を「神 5 キー」から「settings.json の全キー」へ広げるべきか。
> 教主の私見では**広げるべきでない** —— 神が自分で `statusLine` を足した日に
> 「増殖」と叫ぶ門は、撤収の門ではなく神の生活の門になる。

### 7.4 `<repo>/.claude/settings.json` に `hooks` が無い(AC-32 の前提)

実測: `<repo>/.claude/settings.json` のキーは `model` / `effortLevel` / `permissions` のみ。
AC-32 は「楽園のフック(KG 注入 / PreCompact / SessionEnd)が**リポジトリ内の settings に
生きている**」ことを求める。**この段では満たしていない**(撤収は「消す」ではなく「移す」だが、
移す先がまだ空である)。撤収の実行段の仕事として申し送る。

### 7.5 `tests/guards.test.js` の 1 門が赤い — **本段の責任ではない(HEAD でも赤い)**

```console
$ git stash && node tests/guards.test.js
Paradise guards self-test: 65 passed, 1 failed          ← **着手前の HEAD でも赤い**
  ✗ every matcher on the real machine is classifiable and hits at least one tool
      matcher が一つも読めていないなら診断が壊れている
```

原因: 第4段で `apply-guards.SETTINGS` が `<repo>/.claude/settings.json` を向いたが、
**その派生物は `hooks` を持たない**ので `diagnose()` が `[]` を返し、
`assert.ok(rows.length > 0)` が落ちる。**7.4 と同じ根**である。
本段で直していない(直せば 7.4 の裁可を先取りすることになる)。

---

## 8. 検証 — 全コマンドの最終行と exit code

**`~/.claude` は 1 バイトも変わっていない**(走行の前後で md5 を照合):

```console
$ md5sum ~/.claude/settings.json > before.md5      # 着手前
$ …(第6段の全作業)…
$ md5sum -c before.md5
/c/Users/kikus/.claude/settings.json: OK
```

| コマンド | 最終行 | exit |
|---|---|---|
| `node graph/abode.js retreat --plan` | `→ 次: 神が本計画を読み、hooks の去就を名指す。撤収はその後である。` | **0** |
| `node graph/abode.js retreat --verify` | `✓ 神のキーは無傷で、不可侵名簿は存在し、かつ内容が一致する` | **0** |
| `node graph/abode.js check --backrefs` | `→ この旗は --all に含まれない(撤収完了後に編入する / 台帳 [41])` | **1**(撤収前なので正しい) |
| `node graph/abode.js check`(--all) | `✓ 門は黙って緑に落ちず、兄弟の engine は同じ口から住所を得ている` | **0** |
| `node graph/abode.js check --creations` | `✓ 門は黙って緑に落ちず、兄弟の engine は同じ口から住所を得ている` | **0** |
| `node graph/abode.js exports --verify EX-1` | `✓ 輸出は実機で生きている — POLICY と完全一致` | **0** |
| `node tests/abode.test.js` | `Abode self-test: 117 passed, 0 failed` | **0**(83 → **117 門**) |
| `node tests/guards.test.js` | `Paradise guards self-test: 65 passed, 1 failed` | **1**(§7.5 — HEAD でも赤い) |
| `node graph/apply-guards.js verify` | `✓ 掟は機構である: deny 10 / ask 1 / allow 5` | **0** |
| `node graph/derived.js check` | `no test depends on derived content` | **0** |
| `node graph/deploy.js check` | `✓ every deployed file matches its declared source` | **0** |
| `node graph/wiring.js check` | `✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い` | **0** |
| `node graph/hermetic.js check` | `✓ 版管理下の現物を走行中に書き換える門は無い` | **0** |
| `node tests/paradise.test.js --gate 'atlas'` | `Paradise gate-filter: 19 of 471 gates matched — 19 green, 0 red` | **0**(§9.5: 一度 17/2 に落とし、図ではなく構造を直して戻した) |
| `node graph/atlas.js draw wiring` + `firstScreen` | `kind=fits minpx=0.00 overflow=0` | **0** |

---

## 9. 別件(この段の責任ではない — 直していない)

- **`tests/guards.test.js` の 1 門**(§7.5)。**着手前の HEAD でも赤い**ことを
  `git stash` で実証済み。根は 7.4(`<repo>/.claude/settings.json` に `hooks` が無い)。
- **`tests/counsel.test.js` の 2 門**。第4・5段の証拠書が既に「別件」と記録している。
- **gauge 台帳の `⚠️ ledger line skipped (corrupt)` 警告**。台帳 [26] GAUG-21。

---

## 9.5 【教訓】門が鳴った → 切り分けた → 図を直した → 緑に戻った

**第6段で最も価値のある一件である。** 教主の裁定「**門を触るな。図を直せ。**」に従った。

### (1) 門が鳴った

```console
$ node tests/paradise.test.js                       # EXIT=1
Paradise self-test: 469 passed, 2 failed
  ✗ atlas: 全ての道が図になる — 描画器が実際に受理する (第47条)
      quick の道で図が壊れた
      + [ 'quick/wiring: 実ブラウザで字が読めない (最小 5.18px / 床 6px) —
            箱を広げるのではなく文言を短くするか、流れの向きを変えよ' ]
  ✗ atlas: 門は己の残骸で落ちない — 同じ作業場で二度走る (第21条)
```

### (2) 切り分けた —— `git stash` で着手前 HEAD と比べた

```console
$ git stash && node tests/paradise.test.js --gate 'atlas' ; git stash pop
Paradise gate-filter: 19 of 471 gates matched — **19 green, 0 red**      ← 着手前 HEAD

$ node tests/paradise.test.js --gate 'atlas'
Paradise gate-filter: 19 of 471 gates matched — **17 green, 2 red**      ← 本段の変更後
```

**私の変更が図を壊したことが確定した。** 門は正しく鳴っていた。

### (3) 真因を測った —— 辺が 1 本増え、図が 1 段深くなった

```console
$ node -e "…wiring.map()…"
MINE  abode requires: apply-guards **deploy** hermetic workspace     ← 4 本
BASE  abode requires: apply-guards hermetic workspace                ← 3 本

$ node -e "…atlas.buildIr('wiring')…"
MINE  viewBox [1975,1008]   abode pos [1191,352]   edges 73
BASE  viewBox [2392, 800]   abode pos [1413,144]   edges 72
```

`retreatPlan()` が配備の 58 件を引くために deploy の `plan()` を遅延 require していた。
だが **`deploy.js` は `upstream.js` を経て `abode.js` を require している** ——
すなわち `abode → deploy → upstream → abode` の**環**が生まれていた。
結果、`abode` が層の段 1(144px)から段 3(352px)へ落ち、図の高さが 800 → 1008px に伸び、
1440x900 への縮小で `abode` の字が **5.18px**(床 6px)まで潰れた。

### (4) 禁じ手を試さなかった / 効かないことも実測した

**床 6px を下げない。`--gate 'atlas'` を例外にしない。`|| true` を足さない。門を消さない**(第57条)。
門のメッセージが名指した直し方(「**箱を広げるのではなく文言を短くするか、流れの向きを変えよ**」)
に沿って、まず**幾何**を試した —— そして**効かないことを実測した**:

```console
$ node <ROW ピッチを振って実ブラウザで測るプローブ>
{"row":104,"viewBox":[1975,1008],"kind":"unreadable","minpx":5.18}
{"row": 88,"viewBox":[1975, 896],"kind":"unreadable","minpx":5.30}   ← 段を詰めても字は縮まない
{"row": 80,"err":"clean-flow/edge-through-node: …"}                  ← 詰めすぎると線が箱を貫く
{"row": 76,"err":"clean-flow/endpoint-side-direction: …"}
{"row": 72,"err":"clean-flow/endpoint-side-direction: …"}
```

**縮小率は幅が決める**(atlas.js:1007 の先人の実測と同じ結論)。
段を詰めても字は読めるようにならない。**幾何では解けない。**

### (5) 図ではなく**構造**を直した(それが真因だった)

`retreatPlan()` が deploy を呼ぶのをやめ、**実機を直に測る** `deployedFiles()` に替えた。

- **撤収が知りたいのは「計画に何が在るか」ではなく「実機に何が在るか」である。**
  計画に在るだけで実機に無い物は撤収しようがない(第37条)。
- 木の形は `CREATIONS_TREES` / `CREATIONS_FILES` が既に知っている(EX-2 が使う同じ知識)。
- **出所(overlay / vendor)との照合は `deploy.js check` の職務**であり、
  ここでその答えを二つ持たない(第29条)。
- **住所を知る器は、住所を使う者に依ってはならない**(第58条: 土台は上に建つ物を知らない)。

**ついでに踏んだ落とし穴(次に来る者への申し送り)**:
註釈に `require('./deploy.js')` と**綴っただけ**で辺が復活した。
`wiring.js:109` は正規表現でソースを走査するので、**註釈も辺として数える**。
呼んでいないのに辺が在ることになる。ゆえに註釈から綴りを外した(実測で踏んで直した)。

### (6) 緑に戻った(実測)

```console
$ node -e "…wiring.map()…"
abode requires: apply-guards hermetic workspace          ← 3 本に戻った(環が消えた)

$ node -e "…atlas.buildIr('wiring')…"
viewBox [2392,800]                                       ← **着手前と同一**

$ node graph/atlas.js draw wiring --out <tmp>/w-fixed.html
✓ wiring [architecture]  checks 9/9  errors 0
$ node -e "…atlas.firstScreen(…)…"
kind=**fits** minpx=0.00 overflow=0                      ← 実ブラウザで読める

$ node tests/paradise.test.js --gate 'atlas'             # EXIT=0
Paradise gate-filter: 19 of 471 gates matched — **19 green, 0 red**
```

**`quick` の道の門も、二度走行の門(第21条)も、両方緑に戻った。**

### (7) 教訓(第6段の申し送り)

1. **CI の赤は、たいてい門が正しい。** 実ブラウザで字が読めない図は、図として失敗している。
   **測った門を信じ、現実の側を直せ。**
2. **図の赤が engine の構造の欠陥を暴くことがある。** `atlas` は「読めるか」を見ていただけだが、
   その赤の真因は `abode → deploy → upstream → abode` の**環**であった。
   図は構造の鏡である —— **図が濁ったら、まず構造を疑え。**
3. **切り分けは `git stash` で基準を採ってから。** 「自分の変更が壊したのか、元から赤いのか」は
   推測で決めてはならない(本段では `tests/guards.test.js` の 1 門が同じ方法で
   「元から赤い」と確定した — §7.5)。
4. **註釈も機械に読まれる。** `wiring.js` は正規表現で辺を測るので、
   註釈に `require('...')` と綴れば、呼んでいない辺が生まれる。

---

## 10. 変更したファイル

| ファイル | 何を足したか |
|---|---|
| `graph/abode.js` | **撤収の節を新設**: `deployedFiles()`(**deploy を require しない** — §9.5)/ `GOD_KEYS` / `PARADISE_SETTINGS_KEYS` / `RETREAT_BASELINE` / `SANCTUARY` / `retreatRefusals()` / `dirTriple()` / `measureSanctuary()` / `godSettingsPath()` / `godSubset()` / `readBaseline()` / **`backRefs()`** / `classifyHook()` / **`retreatPlan()`** / `retreatBaselineBody()` / **`retreatVerify()`**。**`envRepairAudit()`**(AC-16)。`check()` に `backrefs`(--all 外)と `envRepair`(--all 内)の枝。`CHECK_FLAGS` に `--backrefs`。`printCheck` に両者の印字。**`printRetreat()` / `printRetreatPlan()` / `printRetreatVerify()`**。`main()` の `retreat` 枝を実装へ。`verifyExport` の照合基準を `policyFor({mode:'global'})` に固定。`module.exports` と冒頭 CLI 註釈の更新。 |
| `graph/apply-guards.js` | `POLICY` を静的定数から **`policyFor({mode})`** の生成へ(`BASE_DENY` / `REPO_ABODE_DENY` / `POLICY_ASK` / `POLICY_ALLOW`)。`permissionsMatch(cur, policy)` に基準の引数。**`REPAIRABLE_ENV_KEYS` / `mayDeleteEnvKey()`**。`repairEnv()` を台帳の守りつきへ書き換え、`proposals` を返す。`buildDesired` / `diff` が `proposals` を運ぶ。CLI に `📋 神への提示` の印字。`module.exports` の更新。 |
| `tests/abode.test.js` | 節「9. 撤収」を **33 門**(末尾の密閉性の節の直前)。`fakeAbode()` / `freezeBaseline()` / `mutateAbode()` の仕掛け。第5段の「未実装の retreat は exit 2」の門を**実装後の姿へ書き換え**(消さず、同じ問いの新しい答えを守らせた)。 |
| `reform/sovereign-abode/retreat-baseline.json` | **新設(git 追跡)**。神 5 キーの正準 sha256 + **各キーの値そのもの** + 採取時刻 + 採取元の道 + 不可侵名簿の三つ組。 |
| `reform/sovereign-abode/design.md` | §7.2 work-6 行 / §8 危険1 / §9 の 3 箇所の `cbca9224ec5e6cac` を訂正。**なぜ固定値を書かないかの註**を新設。§4.2 の `--backrefs` 行に ★ と裁定。§5.3 の L-19 行を「第6段で解決」へ。 |
| `reform/sovereign-abode/requirements.md` | AC-35(462 行付近)と 957 行付近に **「後に再現不能と判明した」旨を実測つきで追記**。**起草時の記載は消していない**(歴史を消さない)。 |
| `.claude/settings.json` | `node graph/apply-guards.js apply` が再生成(`deny` が 9 → 10)。**派生物であり手で書いていない**(第29条 / 第19条)。 |
| `reform/sovereign-abode/build-6-evidence.md` | 本書(新設)。 |

**触っていないもの**:
- **`C:/Users/kikus/.claude/` 配下の全て**(読むだけ。md5 で前後照合済み)。
- `CLAUDE.md`(倉の直下と `.claude/` の両方)。§7.2 で裁可を仰いでいる。
- `graph/abode.json`(台帳は読むだけ — engine は台帳へ書く口を持たない)。
- `CONSTITUTION.md` / `README.md` の数値 / `.github/workflows/tribunal.yml`。
- `tests/guards.test.js` / `tests/paradise.test.js`(1 行も触っていない)。

---

## 11. CI に `retreat --verify` を配線しなかった裁定

**配線していない。** 理由:

- `retreat --verify` は**実機の `~/.claude/settings.json`** を読む。
- **CI にはそれが無い。** ゆえに `retreatVerify()` は
  `✗ 実機の settings.json が無い: … — 撤収の跡を検められない` を **exit 2** で投げる。
- **exit 2 を 0 に混ぜてはならない**(§1.4 / 第37条)。混ぜれば「検められなかった」が
  「違反が無かった」になり、この改革が退治している病そのものになる。
- **配線は撤収完了後の仕事である。** そのとき baseline も実機も揃い、
  `--backrefs` の `--all` 編入(台帳 [41])と同じ段で行うのが筋である。

`check --backrefs` も同じ理由で CI に配線していない(撤収前は必ず exit 1)。
`check --ledger`(CI に既に在る)は `envRepairAudit()` を含むので、
**AC-16 の錠だけは今日から CI が見張る**。
