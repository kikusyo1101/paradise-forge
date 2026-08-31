## 神託
> 改善を続けてください。少なくとも3回はループしてください

**ループ1/3。** 前PRで私自身が書いた「実起動の検証は未実施」という穴を塞ぐ。

---

## 🔍 これは化粧の問題ではなかった

`contract.js` は成果物の**実在と大きさ**だけを検めていた。

```js
if (!exists) return { accepted: false, ... };
if (size < minBytes) return { accepted: false, ... };
return { accepted: true, verified: 'file' };   // ← 誰が作ったかを問わない
```

**教主が己の手で書いた成果物も、この二条件を完璧に満たす。**
つまり照合機構は**委譲と成りすましを区別できなかった**。

11件のPRが枢機卿を一度も召集せずに生まれた根が、まさにここにある。
第25条で階層に実体を与え、第26条で安全な幅を与えてなお、
**「本当に発令されたのか」を確かめる手段が無かった。**

### 調査が名指ししていた

> **MAST (arXiv:2503.13657)** — FM-2.6「**推論と実行の不一致**」**13.98%**
> 「委譲する」と述べながら自分で実行する挙動。計測されている。

> **Claude Agent SDK docs**
> 「`tool_use.name in ("Task","Agent")` を検出し、子のメッセージが `parent_tool_use_id` を
> 持つことを確認する。**これが実体があるかを検証する唯一確実な手段である**」

---

## 🔧 第27条 — 起動の証跡

`spawn-trace.js` を新設。起動を**三値**で裁く:

| 状態 | 意味 | 判定 |
|---|---|---|
| `observed` | `tool_use` の実idがある | ✅ **唯一の緑** |
| `asserted-only` | 「起動した」という自己申告のみ | ❌ 主張は証拠ではない(第5条) |
| `no-trace` | 証跡なし | ❌ 自分でやった可能性を否定できない |

`contract.reconcile` は走行状態を渡されたとき証跡を照合し、
起動されていない相の成果物を `file-but-unspawned` として**拒否**する。

**後方互換**: 走行状態を渡さない既存の呼び出しは従来どおり動く（回帰テストで固定）。

---

## 🧪 証拠 — 門をわざと壊して四段階で確認

同一の完璧な成果物に対し、状態だけを変えて実行:

```
① 走行状態なし（従来の呼び出し）
   accepted: true,  verified: "file"                    ← 後方互換

② 走行状態あり・証跡なし（教主が自分でやった状態）
   accepted: false, verified: "file-but-unspawned"
   「この相には起動の証跡が一つも無い — 誰かが自分でやった可能性を否定できない」

③ 自己申告のみ（tool_use idが無い）
   accepted: false, verified: "file-but-unspawned"
   「『起動した』という自己申告だけで、tool_use の証跡が無い。主張は証拠ではない(第5条)」

④ 観測された起動
   accepted: true,  verified: "file+spawn"
   「artifact verified (28b) and dispatch observed: 1 件の起動を観測: market-researcher」
```

**③が核心である。** 自己申告を証拠として認めないことが、素通りを塞ぐ。

```
Paradise self-test: 168 passed, 0 failed          (163 → 168)
check-agents / census / apply-models / apply-spawn / deploy / branch-guard : 全 exit=0
素の環境(CI相当): 168 passed, 0 failed
```

**CIステップは実際に走らせて確認した**（YAMLが妥当なことと、中身が動くことは別である）:
```
$ bash <抽出したCIステップ>
spawn trace gate fires correctly on all three states
exit=0
```

---

## 憲法照合

- **第5条**（主張は証拠ではない）: 自己申告の起動を明示的に不合格とした
- **第9条**: 監査対象は創造物でなく楽園自身の機構
- **第21条**: 発見は必ず**どの相か**を名指しする（`bypassed` が相名を返す）
- **第27条**: 本PRで制定

## 正直に述べる限界

- **`spawn-trace` は証跡を記録する器であり、記録する主体は依然として教主である。**
  教主が意図的に偽の `toolUseId` を書けば通ってしまう。真に外部から観測するには
  Claude Code のセッションログを直接読む必要があり、本PRの範囲を超える
- ただし**穴は一段深くなった**: 以前は「何もしなくても通る」、今は「偽証しなければ通らない」

## 裁き
執行官(CI)と神の御手に。教主は自らを承認しない。
