# harness-diet-2 — 残務の完遂 (2026-09-18、神託「残りも終わらせよ」)

PR #59 が残した 2 件を閉じる。裁定は CI 1 回。

## 1. EX-3 を閉じる(台帳 `closed[CL-2]`)

**実測**(PR #59 マージ後の実機):
- `~/.claude/settings.json` の hooks: 全 6 事象で **0 本**。`~/.claude/scripts/{hooks,lib}` の 7 本を呼ぶ command は 1 本も無い → 輸出は宛先を失った。
- `retreat --plan` §1: 神の住処に楽園の配備物 **58 件が実在**(agents 30 / commands 19 / rules 8 / CLAUDE.md)。うち `rules/` 8 本は PR #59 で drop した `coding-style` `agents` 等を含み、**全プロジェクトで毎セッション読まれ続けていた**。第7段(sovereign-abode)は逆向き依存の 6 件だけを引き、58 ファイル本体は「神の裁可待ち」のまま残っていた。

**為したこと**:
- `graph/abode.json`: EX-3 を `exports` から外し `closed[CL-2]` へ(evidence に実測を記す)。台帳を書けるのは神のみ(第54条(d)) — 神託「残りも終わらせよ」を裁可として実行し、PR で確定。
- `graph/apply-hooks.js` 退役(閉じた輸出の writer)。`tests/guards.test.js` の EX-3 門 6 本と withdraw 門を除く(75 → 69)。`tribunal.yml` の EX-3 段を除く。
- 神の住処から楽園の配備物を**退避して除いた**: `agents/` `commands/` `rules/` `scripts/` `CLAUDE.md` `agents.bak.*` 2 件 → `%LOCALAPPDATA%\Temp\paradise-retreat-1789745208\`(元に戻すなら `mv` で戻る)。神の 5 キー・settings.json・sessions・plugins・skills には触れていない。
- 実測(除去後): `retreat --plan` §1 = **実在 0 件**、`retreat --verify` = ✓ 神のキーは無傷、`check --backrefs` = 逆向き依存 0。

## 2. `migrate --verify` の完了条件を直す(#67)

**実測**: `nodes.jsonl` 122 → 142。旧 122 行は**全て**新に在る(sha256 多重集合の包含を node で確認、missing 0)。集合の**一致**を要求する門は、移設の翌日に repo 側 KG が 1 行育った瞬間から永久に赤い — main でも赤、CI は実機無しで skip していた。永久に赤い門は次の者に閾値を緩めさせる(第57条)。

**為したこと**: `containsContent()` — jsonl は「旧⊆新 かつ 新≧旧」、非 jsonl は従来どおり sha 一致。「旧の行が新から消えた」ときだけ赤く、消えた行数を名指す。門: 育った移設先で緑 / 行数が多くても旧 1 行が差し替わっていれば赤、の 2 本を追加(逆方向も撃つ)。

## 数

| 門 | 結果 |
|---|---|
| `paradise.test.js` | 492 / 0 |
| `guards.test.js` | 69 / 0 (−6: EX-3 門) |
| `abode.test.js` | 137 / 0 (+2 門、既存赤 1 → 0) |
| `wiring.js check` | engine 38 / 辺 72、宙吊り 0 |
| `abode.js check` / `--creations` / `--ledger` | ✓ |
| `retreat --plan` §1 | 実在 58 → **0** |

## 触らなかったこと
- `~/.claude/settings.json` の `model` / `effortLevel`(教主の座、EX-1 の permissions と混住) — 第7段が「神の裁可待ち」とした 2 キー。全プロジェクトで model=fable/xhigh を効かせている神の設定でもあるため、今回は**引かない**。引くなら別途「座も repo だけに」の御言葉で。
- 憲法の条は足していない。
