## ハーネスの引き算 (2) — EX-3 を閉じ、神の住処から楽園の配備物 58 件を退避し、migrate の完了条件を「旧⊆新」に直す

神託「残りも終わらせよ」に従い、PR #59 の残務 2 件を 1 PR に束ねた。裁定は CI 1 回。数は `reform/harness-diet-2/findings.md`。

### 1. EX-3 を閉じる → `closed[CL-2]`
- PR #59 マージ後、`~/.claude/settings.json` の hooks は全 6 事象で **0 本**。`~/.claude/scripts/{hooks,lib}` の複製 7 本を呼ぶ者は居ない — 輸出は宛先を失った。
- 台帳 `graph/abode.json`: EX-3 → `closed[CL-2]`(evidence は実測)。writer `apply-hooks.js` 退役、その門 6 本 + withdraw 門を除く、CI の EX-3 段を除く。
- **神の住処から楽園の配備物を退避して除いた**: `agents/`(30) `commands/`(19) `rules/`(8) `scripts/`(7) `CLAUDE.md` + `agents.bak.*` 2 件 → `%LOCALAPPDATA%\Temp\paradise-retreat-1789745208\`。第7段が「裁可待ち」で残していた 58 件で、うち `rules/` 8 本は PR #59 で drop した規則(coding-style / agents …)を含み**全プロジェクトで毎セッション読まれ続けていた**。神の 5 キー・sessions・plugins・skills は無傷(`retreat --verify` ✓)。

### 2. `migrate --verify` の完了条件(#67)
- 実測: nodes.jsonl 122 → 142、旧 122 行は全て新に在る(包含 missing 0)。「集合の一致」を要求する門は移設の翌日から永久に赤い(main でも赤、CI は skip)。
- `containsContent()`: jsonl は「旧⊆新 かつ 新≧旧」。消えた行数を名指す。門 +2(育っても緑 / 行数が多くても旧 1 行の差し替えは赤)。

### 数
paradise 492/0 · guards 69/0 · abode 137/0 · wiring 38 engine 宙吊り 0 · census ✓ · `retreat --plan` 実在 58 → 0。

### 触らなかったこと
- `~/.claude/settings.json` の `model` / `effortLevel`(教主の座)。第7段の「裁可待ち」2 キーだが、全プロジェクトの既定 model でもあるので引かない。引くなら別の御言葉で。
- 憲法の条は足していない。
