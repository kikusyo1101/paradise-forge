# findings.md — 楽園オーケストレーションの実測（discover相）

> 神託:「楽園は完全に崩壊してしまいました。枢機卿はオーケストレーションのコントローラであり、
> 司祭はサブエージェントになり実際の作業を行う。さらに細分化した作業を行う場合はさらに司祭の下に
> 信徒のサブエージェントがいる。階級が高い方から低い方に作業が流れ呼び出されていく。」

憶測を書かない。すべて実行したコマンドの出力である。

---

## 1. 神が示した設計 vs 実装されているもの

| 階層 | 神の設計 | 実装の実態（実測） | 判定 |
|---|---|---|---|
| 教主 | 統べる | セッション自身。実在 | ✅ |
| **枢機卿** | **オーケストレーションのコントローラ** | **`COLLEGE` の JSON データ。誰も起動しない** | 🔴 **崩壊** |
| **司祭** | **subagentになり実際の作業を行う** | `~/.claude/agents/*.md` に実在。だが**教主が直接呼ぶ** | 🔴 **経路が違う** |
| **信徒** | **司祭の下のsubagent** | **13名すべて名前だけ。実体ファイルゼロ** | 🔴 **完全な虚構** |

### 実測 ①：枢機卿は actor ではなく data である

```
$ node -e "const c=require('./graph/clergy.js');
  console.log(Object.values(c.COLLEGE).some(v=>v.agent||v.controller))"
false   → COLLEGE に「誰が枢機卿を演じるか」の記述が無い
```

`~/.claude/agents/cardinal.md` は存在する（opus/high、`tools: ... Task`）。
つまり**枢機卿を演じる能力は用意されているのに、起動する経路が無い**。

### 実測 ②：`conclave.next` は司祭への発令書を教主に返す

```json
{
  "level": "domain",
  "cardinal": "discovery",          ← ただの文字列。誰も起動されない
  "dispatch": [ { "id": "discover", "agent": "market-researcher", ... } ]
}
```

**発令書を受け取るのは教主である。** 枢機卿は「担当者名のラベル」でしかなく、
`market-researcher` を起動するのは教主。神の言う
「階級が高い方から低い方に作業が流れ呼び出されていく」は成立していない。

実際の流れ：
```
教主 ──→ 司祭        （枢機卿を素通り）
```
神の設計：
```
教主 ──→ 枢機卿 ──→ 司祭 ──→ 信徒
```

### 実測 ③：信徒13名は全員が実体を持たない

```
web-scout                  🔴 実体なし(名前だけ)
feature-ranker             🔴 実体なし(名前だけ)
user-story-writer          🔴 実体なし(名前だけ)
acceptance-criteria-writer 🔴 実体なし(名前だけ)
data-modeler               🔴 実体なし(名前だけ)
interface-designer         🔴 実体なし(名前だけ)
module-builder             🔴 実体なし(名前だけ)
test-writer                🔴 実体なし(名前だけ)
linter                     🔴 実体なし(名前だけ)
coverage-checker           🔴 実体なし(名前だけ)
secret-scanner             🔴 実体なし(名前だけ)
```

`marshal` は「誰が何をするか」を返すが、返された名前に対応する
subagent は一つも存在しない。**組織図に13名いて、出勤者ゼロ。**

これは第21条（名は在るが担い手が居ない）と同じ病が、
**司祭の検査対象外の場所**で起きていたことを意味する。
`check-agents.js` は司祭しか見ておらず、信徒を一度も検めていない。

---

## 2. なぜ崩壊したのか — 根本原因

**宣言と機構の乖離。** 楽園は階層を *記述* したが *実行* しなかった。

- `clergy.js` は「組織はこうである」と述べるデータ
- `conclave.js` は「次に誰が動くべきか」を計算する
- **しかし「計算結果に従って実際に起動する」コードが存在しない**

その空白を教主が埋めていた。だから：
- 枢機卿は素通りされる（教主が直接司祭を呼ぶ）
- 信徒は実体を持てない（司祭が起動する経路が無いので作る動機が無かった）
- 前回の神の指摘「オーケストレーションもサブエージェントも使っていない」は
  **機構が無いから使えなかった**のが真因

第23条で `reform` の道を作ったが、それは*何を*するかの道であって、
*誰が誰を呼ぶか*の機構ではなかった。**同じ病の別の面が残っていた。**

---

## 3. 現状の健全部分（壊れていないもの）

```
Paradise self-test: 149 passed, 0 failed
check-agents / census / apply-models / deploy / branch-guard : 全 exit=0
```

- 司祭11名は全員実在し、model方針（第12条）も一致
- DAG生成・波分割・ratify/reject の**計算**は正しい
- 執行官の独立性は `TRIBUNAL` として保たれている

**壊れているのは「計算結果を実行に移す層」だけである。** 土台は使える。

---

## 4. critic が指摘した既存の gap（1件）

```
🔴 lesson:browser-cleanup: LESSON REGRESSION — past miss recurs
```
本改革とは独立の既存課題。ブラウザ目視を伴う作業が無いため今回は該当しないが、
**scoped lesson の誤爆**の可能性がある（`applies:paradise-internal` が
engine 自体のレビューで発火している）。要検証。

---

## 5. 決定的な実測 — 誰が「呼ぶ」能力を持っているか

設計の分岐点なので、能力の所在を実測した。

### Hermes 側（教主のセッション）
```
$ grep -A8 "^delegation:" ~/AppData/Local/hermes/config.yaml
delegation:
  max_iterations: 250
        ↑ max_spawn_depth の記載なし = 既定値 1
```
**`max_spawn_depth=1`。** 教主が生んだ子は、さらに子を生めない。
これが「信徒が実体を持てなかった」物理的な理由である。
組織図に13名いて出勤者ゼロだったのは、怠慢ではなく**通れない道**だった。

### Claude Code 側（~/.claude/agents）
各エージェントの `tools:` を全数調査した結果：

```
cardinal               Read, Grep, Glob, Bash, Task     ← Task を持つ唯一の存在
architect              Read, Grep, Glob
market-researcher      Read, Grep, Glob, WebSearch, WebFetch, Write
tdd-guide              Read, Write, Edit, Bash, Grep
code-reviewer          Read, Grep, Glob, Bash
security-reviewer      Read, Write, Edit, Bash, Grep, Glob
self-critic            Read, Grep, Glob, Bash
creation-judge         Read, Grep, Glob, Bash
...（他はすべて Task なし）
```

**`Task`（他エージェントを起動する道具）を持つのは `cardinal` ただ一人。**

これは重大な発見である：

| | 現状 | 意味 |
|---|---|---|
| 枢機卿 → 司祭 | `cardinal.md` が `Task` を持つ | **Claude Code 上では既に実行可能。使われていないだけ** |
| 司祭 → 信徒 | 司祭は誰も `Task` を持たない | 権能が与えられていない |
| 教主 → 枢機卿 | Hermes の delegate_task | 可能 |
| 教主 → 司祭 → 信徒 | `max_spawn_depth=1` | **物理的に不可能** |

つまり神の設計「教主→枢機卿→司祭→信徒」は、
**二つの異なる実行基盤にまたがっている**：

- 教主は Hermes のセッション（`delegate_task`、深さ1）
- 枢機卿・司祭・信徒は Claude Code のエージェント（`Task`、`~/.claude`）

**Claude Code の中でなら3階層は成立しうる。** `cardinal` が `Task` で司祭を呼び、
司祭に `Task` を与えれば信徒を呼べる。設計はこの事実の上に立てるべきである。

---

## 6. 調査で得るべきだったが得られなかったもの（正直な記録）

- 深い階層（3段以上）の実コスト実測値は、外部調査の司祭の報告を待つ
- `max_spawn_depth=1` の制約下で「司祭が信徒を呼ぶ」が物理的に可能かは
  design 相で決着させる必要がある
