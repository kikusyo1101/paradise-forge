# 階層型マルチエージェント・オーケストレーション実装パターン調査（2025–2026）

調査日: 2026-08-31 / 出典は全て実際に取得した一次資料（公式docs・公式リポジトリのソース）。
「推測」と明記した箇所以外は出典に基づく事実。

---

## 0. 全体像：2025–2026 の潮流

- **「supervisor をライブラリで作る」から「supervisor をツール呼び出しで手書きする」へ回帰**している。
  LangChain は `langgraph-supervisor` リポジトリ冒頭で明示的にこう書いている:
  > "We now recommend using the **supervisor pattern directly via tools** rather than this library for most use cases. The tool-calling approach gives you more control over context engineering"
  出典: https://github.com/langchain-ai/langgraph-supervisor-py
- 実体のある制御構造は結局 **3方式しかない**：
  1. **ハンドオフ（制御移譲）**: 子が親に戻らない。会話の主導権が移る（OpenAI Agents SDK handoff / LangGraph `Command(goto=..., graph=Command.PARENT)` / AutoGen Swarm）
  2. **サブエージェント＝ツール（呼び出しと復帰）**: 親が制御を保持し、子は関数のように結果を返す（Claude Agent SDK `Agent` tool / LangChain subagents / OpenAI `Agent.as_tool()` / CrewAI `DelegateWorkTool`）
  3. **オーケストレータ・ループ（台帳方式）**: 別LLMが毎ターン「次に誰が話すか」を構造化出力で決める（AutoGen `SelectorGroupChat` / `MagenticOneGroupChat`）
- 階層は「**呼び出しと復帰**」でしか実際には深くならない。ハンドオフは階層ではなくフラットなグラフ遷移である（これは筆者の整理＝推測寄りだが、上記各docsの記述と整合する）。

---

## 1. LangGraph / LangChain

出典:
- https://github.com/langchain-ai/langgraph-supervisor-py
- https://raw.githubusercontent.com/langchain-ai/langgraph-supervisor-py/main/langgraph_supervisor/handoff.py （実ソース）
- https://docs.langchain.com/oss/python/langchain/multi-agent
- https://docs.langchain.com/oss/python/langchain/multi-agent/subagents
- https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs
- https://docs.langchain.com/oss/python/langchain/multi-agent/subagents-personal-assistant
- https://docs.langchain.com/oss/python/deepagents/subagents

### 誰を呼ぶかの決定
**LLM判断（tool-calling）**。supervisor は各ワーカーごとに生成された `transfer_to_<agent>` ツールを持ち、LLMがそのツールを呼ぶことでルーティングされる。静的DAGではない。
（Routerパターンは別に用意されており、そちらは分類ステップ＝ルーティング関数。docs の Patterns 表に `Router` として明記。）

### 実際に「起動する」コード構造
`handoff.py` の実体（要点）:

```python
@tool(name, description=description)
def handoff_to_agent(state: Annotated[dict, InjectedState],
                     tool_call_id: Annotated[str, InjectedToolCallId]) -> Command:
    tool_message = ToolMessage(content=f"Successfully transferred to {agent_name}", ...)
    # 並列ハンドオフ時は Send を使って ToolNode に複数 goto をまとめさせる
    return Command(goto=agent_name, graph=Command.PARENT,
                   update={**state, "messages": state["messages"] + [tool_message]})
```

- **`graph=Command.PARENT` が「実体のある起動」の核**。子ツールから親グラフのノード遷移を発火させる。
- 並列起動は `goto=[Send(agent_name, {...})]` のリスト。同ソースに「if the supervisor is calling multiple agents/tools in parallel, we need to remove tool calls that are not meant for this agent to ensure that the resulting message history is valid」というコメントがあり、**並列時にメッセージ履歴が壊れる問題を明示的に潰している**。
- 多階層は `create_supervisor([...]).compile(name="research_team")` を上位 supervisor の子として渡すだけ（README の Multi-level Hierarchies 節）。つまり**サブグラフが名前付きノードとして親に埋まる**。

サブエージェント＝ツール方式（現在の推奨）の実体は素朴：

```python
@tool("research", description="Research a topic and return findings")
def call_research_agent(query: str):
    result = subagent.invoke({"messages":[{"role":"user","content":query}]})
    return result["messages"][-1].content
```

### 親→子 / 子→親（context圧縮の実際）
- **親→子**: 2択が明文化されている（docs の Design decisions 表）。「Query only」＝ツール引数の文字列だけ、または「full context」＝会話履歴を渡す。デフォルトは query only で、サブエージェントは **stateless**（"Subagents are stateless—they don't remember past interactions"）。
- **子→親**: `output_mode="last_message"`（最終メッセージのみ）と `output_mode="full_history"`（全履歴）を `create_supervisor` で選べる。README に図解付き。
- 状態も返したい場合は `Command(update={...})` を返す:

```python
def call_subagent1(query: str, tool_call_id: Annotated[str, InjectedToolCallId]) -> Command:
    result = subagent1.invoke({"messages": [...]})
    return Command(update={"example_state_key": result["example_state_key"],
                           "messages": [ToolMessage(content=result["messages"][-1].content,
                                                    tool_call_id=tool_call_id)]})
```

- **サブグラフ handoff の圧縮指針が明記されている**（handoffs docs）:
  > "Pass only these two messages, not the full subagent history … the receiving agent may become confused by irrelevant internal reasoning, and token costs increase unnecessarily … consider summarizing the subagent's work in the ToolMessage content instead of passing raw message history."
- **`ToolMessage` を必ず返せ**という要件が明文化。`tool_call_id` を対にしないと会話履歴が不正になる。
- 大量データは仮想ファイルシステムに退避し要約だけ返す（deepagents docs のトラブルシュート「Use filesystem for large data」）。

### 失敗検知・再実行
- **フレームワークとしての自動再実行機構は見つからなかった。** 明示されているのは失敗の *予防* 側で、docs は次の失敗モードを名指ししている:
  > "A common failure mode is sub-agents that perform tool calls but don't include the results in their final response."（subagents-personal-assistant）
  > "Subagent not being called: Main agent tries to do work itself instead of delegating."（deepagents/subagents）
- 検知は事実上 supervisor LLM が ToolMessage の中身を見て再度ツールを呼ぶ（＝LLM任せ）。決定的な retry を入れるなら Custom workflow（LangGraph ノード）で自分で書く、というのが docs の建て付け。
- 非同期サブエージェントには **3ツール構成（start job / check status / get result）** が推奨されており、`failed` 状態が status の値として列挙されている。ここが再実行の掛かり所。

### 階層の深さ・コスト
- **公式に「何階層まで」という数値は見つからなかった。** README は multi-level を「supervisor of supervisors」として2層まで例示するのみ。
- コスト面の警告は「context bloat」中心。深さより **何を渡すか** の問題として扱われている。
- 実務上の落とし穴として docs が明記: **ツール関数の中でサブエージェントを呼ぶと LangGraph が静的に発見できず、`get_state(subgraphs=True)` でサブエージェント状態が取れない**。状態を覗きたいならノード関数から呼べ、とある（subagents docs の Checkpointing節）。これは「宣言だけで実体がない」を疑うときの実測ポイントになる。

---

## 2. Anthropic Claude Agent SDK / Claude Code subagents

出典:
- https://code.claude.com/docs/en/agent-sdk/subagents.md （最重要・詳細）
- https://code.claude.com/docs/en/agents
- https://www.anthropic.com/engineering/multi-agent-research-system （2025-06-13 公開の設計記事）

### 誰を呼ぶかの決定
**LLM判断**。子は `AgentDefinition` の `description`（"Natural language description of when to use this agent"）でマッチされる。明示指定は「Use the code-reviewer agent to …」とプロンプトに書く（Explicit invocation）。
**重要な実装要点**: `allowedTools` に `"Agent"` を含めないと、サブエージェント起動が permission callback に落ちるか `dontAsk` モードで拒否される。**これが「宣言はあるが起動しない」の第一原因として docs に明記されている。**

### 実際に起動する構造
```python
query(prompt="Review the authentication module for security issues",
      options=ClaudeAgentOptions(
        allowed_tools=["Read","Grep","Glob","Agent"],
        agents={"code-reviewer": AgentDefinition(
            description="Expert code review specialist. Use for quality, security, and maintainability reviews.",
            prompt="You are a code review specialist ...",
            tools=["Read","Grep","Glob"],   # 子のツールを制限
            model="sonnet")}))
```
起動の観測方法も明記: `tool_use` ブロックで `name in ("Task","Agent")`（v2.1.63 で Task→Agent に改名）、子の中のメッセージは `parent_tool_use_id` を持つ。**これが「実体があるか」を検証する唯一確実な手段。**

### 親→子 / 子→親
docs に表で明記されている（"What subagents inherit"）:

| 子が受け取る | 子が受け取らない |
|---|---|
| 自分の system prompt（`AgentDefinition.prompt`）と Agent ツールの prompt 文字列 | 親の会話履歴・ツール結果 |
| プロジェクト CLAUDE.md（`settingSources` 経由） | プリロードされた skill 内容（`skills` に列挙しない限り） |
| ツール定義（親から継承 or `tools` の部分集合） | 親の system prompt |

> "The only content you pass from parent to subagent is the Agent tool's prompt string, so include any file paths, error messages, or decisions the subagent needs directly in that prompt."

- **子→親**: 子の *最終メッセージのみ* が Agent ツールの結果として親に返る。中間のツール呼び出しと結果は子の中に留まる（＝これが context 圧縮の実体）。
- v2.1.210 以降、子の最終メッセージは親が読む前に **instruction-shaped パターンをスキャン**される（`<system-reminder>` 擬似タグの無害化、`Human:`/`Assistant:` 行のエスケープ）。プロンプトインジェクション対策。
- 親が子の出力を要約してしまうので、逐語で見せたければ親のプロンプトに明記せよ、とある。

### 失敗検知・再実行
ここは他フレームワークより具体的:
- **`maxTurns` 到達時、Claude Code は出力を "partial" とマークして返す**（v2.1.246+）。親はそれを見て未完了と判断できる。
- **`resume` で子の続きを実行できる**: 子完了時に Agent ツール結果に `agentId: <id>` が入る。①メッセージから `session_id` を取る ②結果テキストから `agentId` を正規表現で抜く ③次の `query()` に `resume: sessionId` を渡して agentId をプロンプトに含める。子のトランスクリプトは別ファイルで独立して永続化される。
- ただし **「レート制限など API エラーで子が早期終了した場合、そのエラーは結果として配達されない」**と明記（"An API error that ends the subagent early, such as a rate limit, is never delivered as its result."）。→ 沈黙する失敗モードが存在する。
- 同時実行上限に当たると `Concurrent subagent limit reached` という tool_result が返る。予算上限だと `Budget limit reached` と `error_max_budget_usd`。**失敗が構造化テキストで返る**ので親がハンドリングできる。

### 階層の深さとコスト（最も具体的な数値がある）
| 制限 | 設定 | デフォルト |
|---|---|---|
| 深さ | `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` | **3 層**（`1` で孫を禁止） |
| 同時実行 | `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` | **20** |
| 支出 | `maxBudgetUsd` / `max_budget_usd` | 無制限 |

- 深さ上限に当たった子は「spawn できないので自分でやる」挙動になる（デリゲーションが黙って消えるのではなく、実行に落ちる）。
- **Opus 5 は subagent への委譲を積極的に行うため、これらの上限が特に重要**と明記。`claude_code` プリセット system prompt では Opus 5 のとき「頼まれない限り Agent ツールを呼ぶな」という行が追加される。
- コスト実測値（Anthropic engineering記事）:
  > "agents typically use about **4× more tokens** than chat interactions, and multi-agent systems use about **15× more tokens** than chats."
  > "token usage by itself explains **80%** of the variance"（BrowseComp 分析、3因子で 95%）
  > Opus 4 lead + Sonnet 4 subagents は単体 Opus 4 に対し内部評価で **+90.2%**
- 適用可否の線引きも明記: 「全エージェントが同じ context を共有する必要がある領域や依存が多い領域は不向き。**コーディングタスクはリサーチほど並列化できない**」。
- 大規模（数十〜数百エージェント）は subagent ではなく **`Workflow` ツール**（オーケストレーションを会話の外のスクリプトに出す）に切り替えよ、とある（TS SDK v0.3.149+）。

### 委譲設計の実務知見（Anthropic engineering記事、最も転用価値が高い）
- **"Teach the orchestrator how to delegate."** 子には **目的 / 出力フォーマット / 使うべきツールとソース / タスク境界** の4点を必ず与える。曖昧だと「一つの子が2021年の車載チップ危機を調べ、他2つが2025年サプライチェーンを重複調査する」という実際に起きた失敗になる。
- **"Scale effort to query complexity."** プロンプトに規模ルールを埋め込む：単純な事実確認＝1エージェント・3〜10ツール呼び出し／比較＝2〜4エージェント各10〜15呼び出し／複雑な調査＝10以上。初期版では「単純クエリに50個の子を生やす」失敗があった。
- **子の出力をファイルシステムに書かせ、親には軽い参照だけ返す**（"Subagent output to a filesystem to minimize the 'game of telephone'"）。多段の情報劣化とトークン重複を防ぐ。
- **評価は end-state 評価＋LLM-as-judge**。単一のjudge呼び出しで 0.0–1.0 スコア＋pass/fail が最も人間判断と一致した。テストは20件程度の小さいセットから即始めろ。
- 既知の制約: **lead agent は子を同期実行しており、子を途中で操舵できず、子同士も協調できない**（2025年6月時点の自己申告）。

---

## 3. OpenAI Swarm → Agents SDK

出典:
- https://github.com/openai/swarm （"Swarm is now replaced by the OpenAI Agents SDK" と明記。**Swarm は教育用で本番非推奨**）
- https://openai.github.io/openai-agents-python/handoffs/
- https://openai.github.io/openai-agents-python/multi_agent/

### 誰を呼ぶかの決定
**LLM判断**。handoff は LLM からはツールとして見える（`transfer_to_<agent_name>`）。「複数の行き先があるなら行き先ごとに handoff を1つ登録し、モデルに選ばせろ」と明記。自前コードで行き先を決めたいときだけカスタム `Handoff` を使う。

Swarm の `client.run()` ループ（原文）:
1. 現エージェントから completion を取得 → 2. ツール呼び出しを実行し結果を追記 → 3. 必要なら Agent を切り替え → 4. context variables 更新 → 5. 新しい関数呼び出しがなければ return

### 2つのパターンの使い分け（Agents SDK docs の表を要約）
| パターン | 構造 | 使いどころ |
|---|---|---|
| **Agents as tools**（`Agent.as_tool()`） | manager が会話の主導権を保持し、専門家をツールとして呼ぶ | **これが階層型**。最終回答を1エージェントが所有、複数の出力を統合、guardrail を一箇所で強制 |
| **Handoffs** | triage が specialist に移譲し、specialist がそのターンの主役になる | ルーティング自体がワークフロー。specialist が直接ユーザに答える |

> "Use agents as tools when a specialist should help with a bounded subtask but should not take over the user-facing conversation."

**階層型オーケストレーションで使うべきは handoff ではなく `as_tool` である**、というのが公式の立場。

### 親→子 / 子→親
- **デフォルトでは受け手が会話履歴を全部見る**（"it's as though the new agent takes over the conversation, and gets to see the entire previous conversation history"）。
- 圧縮の実体は **`input_filter`**。`HandoffInputData`（`input_history` / `pre_handoff_items` / `new_items` / `input_items` / `run_context`）を受け取り新しい `HandoffInputData` を返す関数。よくある実装は同梱済み:
```python
handoff_obj = handoff(agent=agent, input_filter=handoff_filters.remove_all_tools)
```
- 他に `RunConfig.nest_handoff_history` / `RunConfig.handoff_input_filter` / `handoff_history_mapper` で run 全体の履歴の見え方を制御。per-handoff の `input_filter` が RunConfig より優先。
- **`input_type`** は「モデルが handoff 時に生成する小さなメタデータ」用（`reason`, `priority`, `language`, `summary`）。アプリの状態は `RunContextWrapper.context` に置け、と明確に区別されている。`input_type` は行き先を選ぶ手段ではない。
- `on_handoff` コールバックで移譲時の副作用（ログ、事前フェッチ、認可）を実行。**認可は `is_enabled` ではなく `on_handoff` の冒頭で行え**（`is_enabled` は引数生成前に評価されるため）。失敗時は return ではなく raise しろ、と明記。

### 失敗検知・再実行
- **ハンドオフ用の再実行機構は見つからなかった。** 明記されている制約:
  > "Handoffs stay within a single run. Input guardrails still apply only to the first agent in the chain, and output guardrails only to the agent that produces the final output. Use tool guardrails when you need checks around each custom function-tool call."
  → **階層の途中の品質チェックは guardrail では効かない。tool guardrail か自前ループが必要。**
- Swarm には `max_turns` があり、無限ハンドオフループを止める（コミュニティフォーラムにも "Agents SDK: looping handoffs" の議論あり: https://community.openai.com/t/agents-sdk-looping-handoffs/1256231 ※フォーラムの内容は本文未読、参考リンクのみ）。
- 品質改善の指針は「ループで回して自己批評させる／エラーメッセージを返して改善させる」（multi_agent docs の LLM オーケストレーション節）。

### 階層の深さ
- **公式の推奨階層数は見つからなかった。** ただし「triage → specialist、その specialist がさらに他エージェントを as_tool で呼ぶ」という2段の組み合わせが公式に例示されている。

---

## 4. CrewAI hierarchical process

出典:
- https://docs.crewai.com/en/learn/hierarchical-process
- https://docs.crewai.com/en/learn/custom-manager-agent
- https://docs.crewai.com/en/concepts/tasks , https://docs.crewai.com/en/concepts/agents
- 実ソース: https://raw.githubusercontent.com/crewAIInc/crewAI/main/lib/crewai/src/crewai/tools/agent_tools/delegate_work_tool.py
- 実ソース: https://raw.githubusercontent.com/crewAIInc/crewAI/main/lib/crewai/src/crewai/tools/agent_tools/base_agent_tools.py
- 実ソース: https://raw.githubusercontent.com/crewAIInc/crewAI/main/lib/crewai/src/crewai/translations/en.json

### 誰を呼ぶかの決定
**LLM判断**。`Process.hierarchical` にすると manager が自動生成（`manager_llm` 指定）または `manager_agent` で明示指定される。manager は `DelegateWorkTool` / `AskQuestionTool` を持ち、**`coworker` を役割名の文字列で指定して呼ぶ**。

自動生成される manager の人格は `en.json` にハードコードされている:
```json
"hierarchical_manager_agent": {
  "role": "Crew Manager",
  "goal": "Manage the team to complete the task in the best way possible.",
  "backstory": "You are a seasoned manager ... known for your ability to delegate work to the right people ... Even though you don't perform tasks by yourself, you have a lot of experience in the field, which allows you to properly evaluate the work of your team members."
}
```

### 実際に起動する構造（ここが一番「素朴」）
```python
class DelegateWorkToolSchema(BaseModel):
    task: str      # 委譲するタスク
    context: str   # そのタスクのコンテキスト
    coworker: str  # 委譲先の role/name

class DelegateWorkTool(BaseAgentTool):
    def _run(self, task, context, coworker=None, **kwargs):
        coworker = self._get_coworker(coworker, **kwargs)
        return self._execute(coworker, task, context)
```
`base_agent_tools.py` の `_execute` が実体:
```python
sanitized_name = self.sanitize_agent_name(agent_name)   # 空白正規化・小文字化・引用符除去
agent = [a for a in self.agents if self.sanitize_agent_name(a.role) == sanitized_name]
if not agent:  return I18N_DEFAULT.errors("agent_tool_unexisting_coworker").format(...)
task_with_assigned_agent = Task(description=task, agent=selected_agent,
                                expected_output=I18N_DEFAULT.slice("manager_request"))
return selected_agent.execute_task(task_with_assigned_agent, context)
```
**設計上の重要点**:
- **委譲先は文字列マッチ**。ソース内のコメントが率直:
  > "It is important to remove the quotes from the agent name. The reason we have to do this is because less-powerful LLM's have difficulty producing valid JSON."
  → **弱いモデルだと名前が一致せず委譲が静かに失敗する**。これが「宣言だけで実体がない階層」の典型的な発生源。
- 失敗しても **例外ではなく文字列（エラーメッセージ）が返る**。`agent_tool_unexisting_coworker` は利用可能な coworker 一覧を含むので、manager LLM が読んで呼び直せる。**これが事実上の唯一の再実行機構**（LLMによる自己修復）。
- 委譲先タスクは**その場で `Task` オブジェクトを新規生成**する。`expected_output` は `manager_request` という固定文字列。

### 親→子 / 子→親
- **親→子**: `task`（説明文）と `context`（文字列）の2つだけ。親の会話履歴は渡らない。→ **context圧縮は「manager がツール引数に書いた文だけ」という極端な形で自動的に達成される**（裏を返すと manager の記述精度に全依存）。
- **子→親**: `execute_task()` の戻り値＝子の Final Answer 文字列のみ。
- 別ルートとして `Task(context=[task1, task2])` で「他タスクの出力をコンテキストとして渡す」静的な依存指定がある（Tasks docs）。

### 失敗検知・再実行
- docs は "**Result Validation**: The manager evaluates outcomes to ensure they meet the required standards." と謳うが、**これは manager LLM のプロンプト上の役割であって、決定的な検証・再実行のコード機構は確認できなかった。**
- 見つかった数値上のガード: `max_iter`（デフォルト **20**、「最善の答えを出すまでの最大反復」）、`max_rpm`（毎分リクエスト上限）、`Crew` 側の "Max Requests Per Minute"。
- **重要な仕様変更**: docs に "**Delegation is now disabled by default** to give users explicit control." とある。すなわち `allow_delegation=True` を明示しないと委譲は起きない。**「hierarchical にしたのに階層が動かない」の最頻出原因。**
- また "Context Window Respect ... is now the default behavior"。

### 階層の深さ・コスト
- **公式に階層数の推奨は見つからなかった。** ドキュメントの構造は実質2階層（manager → workers）。crew of crews は Flows で組む形になるが、そのコスト面の公式記述は見つからなかった。
- （非公式記事 https://runguard.dev/blog/crewai-crews-of-crews-cost-control.html が "Manager LLM Cascade, Async Spawn Amplification" を扱っているが、内容は未検証のため参考のみ。）

---

## 5. AutoGen（AgentChat 0.4+ / Magentic-One / Society of Mind）

出典:
- https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/selector-group-chat.html
- https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/teams.html
- https://microsoft.github.io/autogen/stable/reference/python/autogen_agentchat.teams.html
- 実ソース: https://raw.githubusercontent.com/microsoft/autogen/main/python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_prompts.py
- 実ソース: https://raw.githubusercontent.com/microsoft/autogen/main/python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_magentic_one_group_chat.py
- 実ソース(SoM): https://microsoft.github.io/autogen/0.4.3/_modules/autogen_agentchat/agents/_society_of_mind_agent.html
- 論文: https://arxiv.org/abs/2411.04468 (Magentic-One)

AutoGen は **4つのチーム型を明確に分けている**（teams tutorial）: `RoundRobinGroupChat`（静的巡回）/ `SelectorGroupChat`（LLMが次話者を選ぶ）/ `MagenticOneGroupChat`（台帳付きオーケストレータ）/ `Swarm`（`HandoffMessage`）。さらに `GraphFlow` + `DiGraphBuilder`（**明示的な静的DAG**、条件付きエッジ・fan-out・join・ループ）がある。

### 誰を呼ぶかの決定（3方式が揃っている稀なフレームワーク）
1. **静的**: `RoundRobinGroupChat`、`GraphFlow`（`DiGraph` のエッジ条件は文字列部分一致 or callable）
2. **LLM判断**: `SelectorGroupChat` — 各参加者の `name` と `description` を見てモデルが次話者を決める。`allow_repeated_speaker`（デフォルトで連続発話を禁止）、`selector_func`（モデル判断を上書きするルーティング関数）、`candidate_func`（候補を絞る関数）を差せる。
3. **台帳型LLM判断**: `MagenticOneGroupChat`

### Magentic-One のオーケストレータ実装（本調査で最も再利用価値が高い制御構造）
`_prompts.py` の実物。オーケストレータは**2つの台帳**を持つ:

**Task Ledger（初期化時）**: 事実調査 → 計画
- `ORCHESTRATOR_TASK_LEDGER_FACTS_PROMPT`: 「1. GIVEN OR VERIFIED FACTS / 2. FACTS TO LOOK UP / 3. FACTS TO DERIVE / 4. EDUCATED GUESSES」の4見出しで事実を棚卸し
- `ORCHESTRATOR_TASK_LEDGER_PLAN_PROMPT`: チーム構成を見て箇条書きの計画。**「全メンバーを使う必要はない」と明示的に許可**している

**Progress Ledger（毎ターン）**: 構造化JSONで5項目を毎回判定
```
is_request_satisfied     : {reason, answer(bool)}   # 完了したか
is_in_loop               : {reason, answer(bool)}   # 同じことを繰り返していないか
is_progress_being_made   : {reason, answer(bool)}   # 前進しているか
next_speaker             : {reason, answer(str)}    # 次に誰を呼ぶか
instruction_or_question  : {reason, answer(str)}    # その子に何と言うか
```
Pydantic の `LedgerEntry` で受ける。**「次に誰を呼ぶか」と「その子に何を渡すか」が同じ構造化出力の中で同時に決まる**のが設計の要。

### 失敗検知・再実行（5フレームワーク中で最も明示的）
- **`max_stalls`（デフォルト 3）**: `_magentic_one_group_chat.py` の docstring に "The maximum number of stalls allowed before **re-planning**"。
- 停滞（`is_in_loop` = True または `is_progress_being_made` = False）が閾値を超えると再計画に入り、
  - `ORCHESTRATOR_TASK_LEDGER_FACTS_UPDATE_PROMPT`: 事実シートを更新（educated guess を verified fact に昇格させるなど）
  - `ORCHESTRATOR_TASK_LEDGER_PLAN_UPDATE_PROMPT`: 「**まず前回の失敗の根本原因を簡潔に説明し**、それを踏まえた新計画を出せ」
- `max_turns` デフォルト 20。`ValueError` は「progress ledger に必要なキーが無い」「next_speaker が不正」で送出される（＝ルーティング先の実在性を実行時に検証している）。
- 他に `TextMentionTermination` / `MaxMessageTermination` / `ExternalTermination`（外部から停止、現ターン終了後に止まる）/ `CancellationToken`（即時中断、`CancelledError`）。

### 階層構造：SocietyOfMindAgent（「実体のある入れ子」の教科書的実装）
ソースの本質はこれだけ:
```python
async def on_messages_stream(self, messages, cancellation_token):
    task = list(messages)
    async for inner_msg in self._team.run_stream(task=task, ...):   # 内部チームを実際に走らせる
        ...  # 内部メッセージを収集（外には Response しか出さない）
    llm_messages = [SystemMessage(content=self._instruction)]        # "Earlier you were asked to fulfill a request..."
    llm_messages.extend([UserMessage(content=m.content, source=m.source) for m in inner_messages])
    llm_messages.append(SystemMessage(content=self._response_prompt))# "Output a standalone response ... without mentioning any of the intermediate discussion."
    completion = await self._model_client.create(messages=llm_messages, ...)
    yield Response(chat_message=TextMessage(content=completion.content), inner_messages=inner_messages)
    await self._team.reset()   # 毎回リセット＝ステートレス化
```
- **チームを1個のエージェントとして見せる**ので、そのまま上位チームの participant になる＝**任意深さの階層が型として成立する**。
- **子→親の圧縮が「内部トランスクリプトを1回のLLM呼び出しで単一回答に畳む」形で実装されている**。デフォルトプロンプトが `DEFAULT_RESPONSE_PROMPT = "Output a standalone response to the original request, without mentioning any of the intermediate discussion."`
- `save_state` / `load_state` が内部チーム状態を丸ごと入れ子で永続化する（`SocietyOfMindAgentState(inner_team_state=...)`）。
- **制約**: `MagenticOneGroupChat` は「**does not support using team as participant**」と明記。つまり Magentic-One をそのまま入れ子にはできない（SoMでラップする必要がある）。`RoundRobinGroupChat` / `SelectorGroupChat` は team を participant にできる。

### 階層の深さ・コスト
- **公式の推奨階層数は見つからなかった。** 型としては無制限に入れ子可能。
- コスト警告は teams tutorial の Note にある:
  > "Teams are for complex tasks that require collaboration and diverse expertise. However, they also demand more scaffolding to steer compared to single agents. … start with a single agent for simpler tasks … Ensure that you have optimized your single agent with the appropriate tools and instructions before moving to a team-based approach."
- 状態設計上の重要規約（BaseChatAgent docs、繰り返し強調されている）:
  > "The caller should only pass the **new messages** to the agent on each call … **Do not pass the entire conversation history** to the agent on each call. This design principle must be followed when creating a new agent."

---

## 6. 横断比較表

| | 次に誰を呼ぶか | 起動の実体 | 親→子 | 子→親 | 失敗検知/再実行 | 深さの明示上限 |
|---|---|---|---|---|---|---|
| **LangGraph/LangChain** | LLM（tool-calling）／Routerは分類関数 | `Command(goto=..., graph=Command.PARENT)` ＋ `Send` で並列／またはツール内 `subagent.invoke()` | query文字列のみ（既定、stateless）or 全履歴 | `output_mode="last_message"` or `"full_history"`／`Command(update=...)` | **機構なし**（LLM任せ）。非同期は start/status/result の3ツールで `failed` を扱う | 記載なし（例示は2層） |
| **Claude Agent SDK** | LLM（`description` マッチ）／名指し可 | `Agent` ツール（`allowedTools` に `"Agent"` 必須）、`tool_use.name in ("Task","Agent")`、子は `parent_tool_use_id` を持つ | **Agentツールの prompt 文字列のみ**＋CLAUDE.md＋ツール定義 | 最終メッセージのみ（中間は子に留まる）＋出力スキャン | `maxTurns` 超過は **partial マーク**、`agentId`+`resume` で継続。上限超過は `Concurrent subagent limit reached` / `Budget limit reached`。**APIエラーは結果として返らない** | **深さ3 / 同時20（既定）** |
| **OpenAI Agents SDK** | LLM（`transfer_to_*` ツール）。階層なら `as_tool` | `handoff()` は制御移譲、`Agent.as_tool()` は呼び出し復帰 | 既定で**全履歴**。`input_filter`/`nest_handoff_history` で削る。`remove_all_tools` が既製 | handoff は主導権ごと移るので「返さない」。as_tool はツール戻り値 | **機構なし**。guardrail は chain の先頭/末尾にしか効かないと明記。Swarm は `max_turns` | 記載なし |
| **CrewAI** | LLM（manager が `coworker` を**文字列**で指定） | `DelegateWorkTool._run` → `_execute` → `selected_agent.execute_task(Task(...), context)` | `task` と `context` の2文字列のみ | Final Answer 文字列のみ | 不一致は**例外でなくエラー文字列**を返し manager が呼び直す。`max_iter=20`。**`allow_delegation` は既定 False** | 記載なし（実質2層） |
| **AutoGen** | 静的DAG(`GraphFlow`) / LLM(`SelectorGroupChat`) / 台帳LLM(`MagenticOne`) の**3方式全て** | `SocietyOfMindAgent` が内部 `team.run_stream()` を実行し `Response` に畳む | チームへの task メッセージ | 内部トランスクリプトを1回のLLMで単一回答に圧縮、`team.reset()` | **`max_stalls=3` で再計画**（根本原因説明→新計画）、`is_in_loop`/`is_progress_being_made` を毎ターンJSON判定、`max_turns=20`、`next_speaker` 不正は `ValueError` | 記載なし（型上は無制限。ただし MagenticOne は team を participant にできない） |

---

## 7. 「宣言だけで実体がない階層」を避けるための実装チェックリスト

出典で明示的に「これが原因で委譲が起きない」と書かれている項目のみを列挙（**推測ではない**）:

1. **起動ツールが許可されているか**
   - Claude Agent SDK: `allowedTools` に `"Agent"` が入っているか。無いと permission callback に落ちるか `dontAsk` で拒否される。
   - CrewAI: `allow_delegation=True` を明示したか（**既定は False**）。
2. **子の `description` が具体的か**
   - Claude/LangChain/CrewAI いずれも docs が「description が曖昧だと親が自分でやってしまう」と明記。LangChain deepagents の例: ❌`{"name":"helper","description":"helps with stuff"}` / ✅`"Conducts in-depth research on specific topics using web search. Use when you need detailed information that requires multiple searches."`
3. **本当に起動したかを観測できるようにする**
   - Claude: `tool_use.name in ("Task","Agent")` を検出し、`parent_tool_use_id` 付きメッセージの有無を確認する（docs に「Detect subagent invocation」節が独立してある）。
   - AutoGen: `next_speaker` が不正なら `ValueError` を投げる実装になっている＝実行時に実在性が検証される。
   - LangGraph: ツール関数内でサブエージェントを呼ぶと `get_state(subgraphs=True)` に**出てこない**。可視化したいならノード関数から呼ぶ。
4. **名前解決を文字列に依存させない／させるなら耐性を入れる**
   - CrewAI のソースコメントが明言：弱いモデルは有効なJSONを出せず coworker 名が壊れる。だから `sanitize_agent_name`（空白正規化・小文字化・引用符除去）が入っている。自作するなら同等の正規化と、失敗時に**候補一覧を返す**エラーメッセージが必須。
5. **子に「目的・出力形式・使うツール/ソース・タスク境界」の4点を渡す**（Anthropic engineering記事）。これが無いと子は重複調査・取りこぼしをする（実例つき）。
6. **子の最終メッセージに結果が全部入るようプロンプトで強制する**
   - LangChain docs: "A common failure mode is sub-agents that perform tool calls but don't include the results in their final response."
7. **ToolMessage / tool_call_id の対を必ず閉じる**（LangGraph）。閉じないと会話履歴が不正になり、以後の挙動が壊れる。
8. **停滞と完了を毎ターン構造化出力で判定する**（Magentic-One の Progress Ledger をそのまま流用できる）。`is_request_satisfied` / `is_in_loop` / `is_progress_being_made` の3ブール＋ `next_speaker` ＋ `instruction_or_question`。
9. **上限を設定して、上限に当たったことが観測可能な形で返るようにする**。Claude SDK は `Concurrent subagent limit reached` / `Budget limit reached` / `error_max_budget_usd` を返す。上限が silent failure にならない設計が重要。
10. **深い階層より「幅×コンテキスト分離」を優先**。Anthropic の実測では性能分散の80%がトークン使用量で説明され、深さの利得を示す公式データは見つからなかった。既定値が深さ3・同時20であることが実務上の目安になる。

---

## 8. 見つからなかった項目（正直な記録）

- **LangGraph / OpenAI Agents SDK / CrewAI / AutoGen のいずれにも「実用的な階層は何段まで」という公式の数値記述は見つからなかった。** 数値が明示されているのは Claude Agent SDK のみ（`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` 既定 3、`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` 既定 20）。
- **深い階層のコスト増加を定量化した公式データは見つからなかった。** 定量値があるのは Anthropic の「chat比 15倍トークン」「エージェントは chat比 4倍」「トークン量が性能分散の80%を説明」だけで、これは階層の深さではなくマルチエージェント全体の話である。
- **LangGraph / OpenAI Agents SDK / CrewAI に、子の結果が不十分だったときの決定的（非LLM）な再実行機構は見つからなかった。** 明示的な再計画機構を持つのは AutoGen Magentic-One の `max_stalls`、明示的な部分完了マーク＋再開を持つのは Claude Agent SDK の partial + `resume` のみ。
- CrewAI の "Result Validation"（manager が成果物を検証する）について、**プロンプト上の役割記述以上の実装（検証コード・リトライループ）は確認できなかった。**
- OpenAI Agents SDK のハンドオフ・ループ抑制について、公式 docs 内の明示的な記述は見つからなかった（コミュニティフォーラムに議論スレッドは存在するが未読）。
- Magentic-One の GAIA ベンチマーク数値は arXiv アブストラクトページからは取得できなかった（本文PDF未取得）。
