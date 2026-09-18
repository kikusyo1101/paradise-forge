## ハーネスの引き算 (3) — 教主の座 model / effortLevel を神の住処から引く

神託「進めたい」(2026-09-18)。第7段(sovereign-abode)が「神の裁可待ち」で残していた最後の 2 キー。裁定は CI 1 回。

### 根拠(実測)
- 原初設定 `settings.json.pre-wire.bak`(2026-08-27)に `model` は**無い** — 楽園が書いたキー。
- 座は第4段以降 `<repo>/.claude/settings.json` に住む(`apply-seat` は repo へ書く)。神の住処の写しは、**楽園の外の全プロジェクトの既定 model を楽園が決めている**状態だった。

### 為したこと
- `apply-guards.js buildDesired` に (e): **神の住処のときだけ** `model` / `effortLevel` を引く(`isRepoSettingsFile` で宛先判定、env では分岐しない)。changes に `seat-withdrawn` を立て元の値を名指す。EX-1 の writer が同じ settings.json を書く権能を持つ。
- 門 +3(引く / repo からは引かない / 冪等)。固定値で `model` の保存を要求していた既存の門 3 本は「神のキーだけ保存」に改めた。
- 実機に適用(`PARADISE_ABODE=global node graph/apply-guards.js apply`): 神の settings.json は **7 キー**(神の 5 + hooks + permissions)。退避 `%LOCALAPPDATA%\Temp\settings.json.pre-seat-withdraw.bak`。

### 数
`retreat --plan` §2 撤収対象 2 → **0**、`retreat --verify` ✓ 神のキー無傷、`apply-seat verify` ✓ 教主は repo に座している(fable/xhigh)。paradise 492/0 · guards 72/0 · abode 137/0 · counsel 208/0 · 他 6 門緑(今回は tribunal.yml が呼ぶ個別門を全て回した)。

### 影響
楽園の外のプロジェクトで Claude Code の model は Claude Code の既定に戻る。楽園の中では `<repo>/.claude/settings.json` が fable/xhigh を効かせる。

### これで第7段の裁可待ちは 0 件。sovereign-abode の撤収は完遂。
