## 神託
> 楽園は完全に崩壊してしまいました。枢機卿はオーケストレーションのコントローラであり、
> 司祭はサブエージェントになり実際の作業を行う。さらに細分化した作業を行う場合は
> さらに司祭の下に信徒のサブエージェントがいる。階級が高い方から低い方に作業が流れ呼び出されていく。

**今回は `reform` の道を通した。** synod が計画を批准 → forge が11相のDAGを鍛造 →
調査は司祭2名を並列発令（Anthropic公式・LangGraph本家など一次資料40KB）。

---

## 🔍 崩壊は実測で20件の欠陥になった

| 階層 | 神の設計 | 実測された実態 |
|---|---|---|
| 枢機卿 | オーケストレーションのコントローラ | **JSONデータ。誰も起動しない** |
| 司祭 | subagentとして実務 | 実在。だが**教主が直接呼ぶ**（枢機卿を素通り） |
| 信徒 | 司祭の下のsubagent | **13名全員が名前だけ。実体ファイルゼロ** |

`conclave.next` は**司祭への発令書を教主に返していた**。これが素通りの正体。
**5階層のうち実行されていたのは2つだけ。**

### 原因は調査が名指ししていた
> Claude Agent SDK docs:「allowedTools に `Agent`(旧Task) が無いと、サブエージェント起動は
> permission callback に落ちるか拒否される。**これが『宣言はあるが起動しない』の第一原因**」

実測: `Task` を持つのは `cardinal` 只一人。**梯子は使われていなかったのではなく、通れなかった。**

## 🔧 第25条 — 階層の実体化

- **枢機卿に actor を与えた**（`agent: 'cardinal'`）
- **信徒11名を鍛造**（haiku/low、`description` は「いつ呼ぶか」を具体的に — 調査が「曖昧だと親が自分でやる」と明記）
- **`apply-spawn.js` 新設** — 権能を位階の規則として機械適用（7名に付与）
- **発令を枢機卿宛に変更** + Anthropic の4点（目的/出力形式/使う道具/タスク境界）を契約として搭載
- **深さ3が実行可能と判明** — `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` 既定3

```
node graph/check-agents.js
  改修前 → 20 hierarchy defect(s): the ladder is declared but cannot be walked
  改修後 → the hierarchy is real, not declared
```

## 🔧 第19条改正 — そして独立が嘘だったと判明

神の指摘「**上流工程を変えないは既に破棄された**」は正しく、私は破棄済みの制約に縛られて設計していた。
第19条を改正した。**その過程で遥かに重い欠陥が出た**:

```
deploy.plan() の出所内訳
  { upstream: 31, "overlay(own)": 21, "overlay(replace)": 1 }   総数 53
                    ↑ 53件中31件が上流ツリー由来

PARADISE_UPSTREAM=/nonexistent で上流を隠すと
  { "overlay(own)": 21, "overlay(replace)": 1 }   総数 22
                    ↑ 司祭9名(architect/code-reviewer/tdd-guide/security-reviewer ほか)が消滅
```

**第20条で「独立した」と宣言し、vendorのファイル数を数える門まで作りながら、
deploy は一度も vendor を見ていなかった。在庫を数えて、供給線を見ていなかった。**

修正後（独立の唯一の定義＝上流を消して同じか、で証明）:
```
上流あり: { vendor: 31, own: 21, replace: 1 }  総数 53  missing 0
上流なし: { vendor: 31, own: 21, replace: 1 }  総数 53  missing 0
                                                    ↑ 完全一致
```

## 🧪 証拠

```
Paradise self-test: 157 passed, 0 failed          (149 → 157)
check-agents / census / apply-models / apply-spawn / deploy / branch-guard : 全 exit=0
素の環境(CI相当): 157 passed, 0 failed
```

**門をわざと壊して発火を確認**（prove相）:
- 実在しない信徒を組織に加える → `BELIEVER_MISSING` が名指しで発火
- 第24条の門が本セッション冒頭で実際に働いた → PR #13 が既にマージ済みで土台が古いことを
  **分岐前に**検知（前回は気づかず rebase 競合を起こした）

## 正直に述べる限界

- **Claude Code 側での実起動テストは行っていない。** engine と門の整備が本PRの範囲。
  「枢機卿が実際に司祭を起動する」実地検証は次の神託に譲る
- 信徒は13名中11名のみ実体化（残り2つは重複ロール。過剰生成はトークン15倍の世界で害）

## 憲法照合
- 第5条: 全て実コマンド出力で裏づけ。捏造なし
- 第8条: 調査（外部40KB + 内部実測）が仕様に先行
- 第23条: 本改革は `reform` の道を通した（前回できなかったこと）

## 裁き
執行官(CI)と神の御手に。教主は自らを承認しない。
