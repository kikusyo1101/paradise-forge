# セキュリティ審査報告 — reform/claude-md-diet (CLAUDE.md ダイエット改革)

- 対象: 作業ツリー差分 (main 6598372 対比 / CLAUDE.md・CONSTITUTION.md・CONSTITUTION.INDEX.md・README.md・graph/census.js・graph/critic.js・tests/paradise.test.js)
- 審査者: security phase subagent
- 実行した検証: `git diff`、`apply-guards.js verify`(緑)、`~/.claude/settings.json` の permissions 実読、`tests/paradise.test.js`(214/214 pass)、regex の敵対的実測

---

## (1) 新 CLAUDE.md はセキュリティ姿勢を弱めるか

新 CLAUDE.md の主張:
> force-push・main直接コミット・`~/.claude` 手編集・`.env` 読み書きは **permissions/hooks/CI が拒む** (`node graph/apply-guards.js verify` が証拠)

apply-guards の POLICY deny(実機 settings.json にも配備済みを確認)と突き合わせた結果:

| 旧散文の掟 | POLICY deny の裏付け | 判定 |
|---|---|---|
| force push 禁止 | `git push --force` / `-f` / `--force-with-lease` | ⚠️ 部分的 — `git push origin +branch`(refspec 強制)は拒めない |
| main 直接コミット禁止 | **該当ルールなし** | 🔴 ローカル機械強制は存在しない |
| `~/.claude` 手編集禁止 | `Edit(~/.claude/**)` | ⚠️ 部分的 — `Write` ツールや Bash リダイレクトは Edit ルールの適用外の可能性 |
| `.env` 読み書き禁止 | `Edit/Read(**/.env)`, `Read(**/.env.*)` | ⚠️ 部分的 — `Bash(cat .env)` 等のシェル経由読取は拒めない |

**🔴 Issue 1 (中): 「main直接コミット」の機械強制は実在しない。**
deny/ask/hooks のどこにも main へのコミット/プッシュを拒む規則がなく、実強制は GitHub 側の branch protection(リポジトリ外設定・`apply-guards verify` の証明範囲外)のみ。旧散文は「掟」として直接書いていたが、新版は「機械が拒む(写経しない)」へ置き換えたため、**強制が実在するという過大主張**になった。第33条の精神(機械が強制しない法は助言)に照らすと、ローカルの main コミットは今や「助言ですらない」。対処: `Bash(git commit:*)` を main ブランチで拒む hook を建てるか、CLAUDE.md の文言を「main への push は GitHub 保護が拒む(ローカル commit は branch-guard と己の規律)」と実態通りに直す。

**⚠️ Issue 2 (低〜中): deny リストの迂回路を「拒む」と断言している。**
上表の ⚠️ 3件(refspec 強制 push・Write/Bash 経由の `~/.claude` 書込・Bash 経由の `.env` 読取)はいずれも既存の穴だが、旧版は散文の掟が(遵守率 ~70% とはいえ)迂回路も含めて覆っていた。新版は「機械が拒む」とだけ述べるため、迂回路の存在が不可視になった。対処: deny へ `Bash(git push origin +*)`・`Write(~/.claude/**)`・`Bash(cat *.env*)` 相当を追加、または CLAUDE.md の断言を「主要経路を拒む」に弱める。

良い点: 「マージは神の御手のみ」は ask `Bash(gh pr merge:*)` + CODEOWNERS + 保護で三重に裏付けあり。branch-guard は「散文の掟」と正直に明記されており過大主張がない。secrets スキャン(CI verify job)・`.env` deny は維持。

## (2) ReDoS 審査 — census.js dietChecks / critic.js 新規 regex

実測(Node、敵対的入力):

| regex | 入力 | 時間 | 判定 |
|---|---|---|---|
| `自己診断[^\n]*\d+\s*件` (census) | `自己診断` + 数字 20万字 | **31,512 ms** | 🔴 O(n²) |
| `(?:src\|href)\s*=\s*["']https?://[^"']+["']\|@import…` (critic) | `src="https://` + 50万字 | 1 ms | ✅ 線形 |
| `自己診断` 混在 20万字 | — | 11 ms | ✅ |

**🔴 Issue 3 (中): `VOLATILE_NUMBER_RES[0]` に多項式 ReDoS。**
`[^\n]*` と `\d+` が数字上で重なり、終端 `件` が現れない長い数字列で O(n²) の後退が起きる(20万字で 31.5 秒 → 1MB なら十数分)。入力 CLAUDE.md は PR 経由で書き換わる半信頼ファイルであり、census/self-test 経由で CI・門をハングさせられる。dietChecks は予算超過(>4,096 B)を検出しても**その後 regex を全文に走らせる**ため、予算門は防波堤にならない。トラストモデル上 CI は repo コードを実行するので致命ではないが、堅牢性欠陥として修正すべき。対処: (a) regex 前に `text.slice(0, CLAUDE_MD_BUDGET * 2)` へ切り詰める、または (b) `自己診断[^\n]{0,120}?\d{1,6}\s*件` のように有界化。tests/paradise.test.js に複製された同 regex 3 本も同様に。
なお `憲法…\d+\s*条` と `\*\*\d+\s*tests?\*\*` は開始点が限られ実質線形。critic.js の新規 3 check(toISOString・external-deps・DOMAIN マーカー)は**ネスト量指定子なし・実測線形で ReDoS なし**(external-deps の `[^"']+` は単一量指定子であり破滅的後退は起きない)。

## (3) 散文撤去による強制ギャップ — 旧掟 → 新しい機械の家

| 旧 CLAUDE.md の掟 | 新しい家 | 判定 |
|---|---|---|
| 日本語で話す / 役割 / 実出力で報告 | CLAUDE.md に残存(散文のまま) | ✅ 意図的 |
| main 直接コミット禁止 | 「permissions/hooks/CI」と主張 | 🔴 Issue 1 — 孤児(ローカル強制なし) |
| force-push 禁止 | POLICY deny ✅ | ⚠️ refspec 迂回(Issue 2) |
| `~/.claude` 手編集禁止 | `Edit(~/.claude/**)` deny ✅ | ⚠️ Write/Bash 迂回(Issue 2) |
| `.env` 禁止 | Read/Edit deny + CI secrets scan ✅ | ⚠️ Bash 迂回(Issue 2) |
| マージは神の御手 | ask `gh pr merge` + CODEOWNERS + 保護 | ✅ |
| branch-guard を分岐前に走らせる | 散文のまま残存(明示的に「散文の掟」と宣言) | ✅ 正直 |
| reform の道 / 教主の独断禁止 | 散文残存 + forge/conclave の道 | ✅ |
| 単一HTML・外部依存ゼロ | critic `no-external-deps` (gap) | ✅ 昇格 |
| toISOString 禁止 | critic `no-wall-clock-iso` (gap) | ✅ 昇格 |
| DOMAIN マーカー | critic `domain-markers-present` | ⚠️ Issue 4 — severity が `smell` に格下げ |
| identity.md / ux.md 先行宣言 | 既存 `visual-identity-declared` / `ux-intent-declared` | ✅ 既存 check |
| 「design.md と identity.md の名を混同しない」 | **どこにもない** | ⚠️ Issue 5 — 孤児(軽微) |
| **deploy --write の⚠️(第35条: 司祭への禁令は deploy --write も併記)** | 憲法第35条(on-demand)のみ | 🔴 Issue 6 — 孤児 |
| hook 追加時の発火確認(第34条) | `apply-guards diagnose` は在るが常時面から消滅 | ⚠️ 軽微(codex 第34条で引ける) |
| ブラウザ kill / subagent done 不信 / 欠陥=パイプライン欠陥 / gauge | CLAUDE.md 判断則に残存 | ✅ |
| 数値(テスト数・条数) | census + dietChecks + テスト2本 | ✅ 昇格 |

**🔴 Issue 6 (中): `deploy --write` の警告が孤児化、しかも allow が矛盾を抱える。**
旧版は「`deploy --write` は実機 settings.json / agents を書き換える。司祭に禁じるときは併せて禁じよ」と常時面で警告していた。新版から消え、機械的受け皿はゼロ。それどころか POLICY allow の `Bash(node graph/*)` が `node graph/deploy.js --write` を**無条件許可**する — `Edit(~/.claude/**)` を deny しながら、同じ実機を書き換えるコマンドを auto-allow するのは方針の自己矛盾(既存欠陥だが、散文の防波堤を撤去した本改革で顕在化)。対処: `Bash(node graph/deploy.js --write*)` を ask へ移す。

**⚠️ Issue 4 (軽微):** `domain-markers-present` は severity `smell` — 旧散文では絶対則だった。verdict 上の重みが掟より軽い。意図的なら容認可、意図せぬなら `gap` へ。
**⚠️ Issue 5 (軽微):** design/identity の名を混同しない掟は critic にも codex 指示にも昇格されず消滅した孤児。

なお第39条の新設・diet 門・テスト(壊して鳴らす形式)・self 免除(`ctx.isSelf`)の設計は健全で、prompt-injection 表面(CLAUDE.md)の縮小自体は**攻撃面の削減として好ましい**。

## (4) 差分中の秘密

diff 全文を APIキー・トークン・秘密鍵・パスワードのパターン(`api[_-]?key|token|secret|password|BEGIN RSA/OPENSSH|ghp_|sk-|AKIA` 等)で走査 — **検出 0 件**。ヒットは critic 自身の秘密検出 regex と CI コメントのみ(検査器のコードであり秘密ではない)。

---

## 総括

改革の方向(散文→機構、常時面の縮小)は正しく、テスト 214/214 緑・apply-guards verify 緑。ただし「機械が拒む」という新しい断言が実態を上回る箇所(main コミット・迂回路)、dietChecks の確認済み O(n²) ReDoS、deploy --write 孤児化+allow 矛盾は修正を推奨する。SHIP 前に Issue 1・3・6 の手当てが望ましい。

issues: 6
secrets: 0
