# docs-report.md — 散文は現在の main で正しいか (遡及実測)

- 相: `docs` (枢機卿 quality)
- 実測日: 2026-09-07
- 実測対象: **現在の main** (`4d2f217`)。本改修の実装は 2026-08-31 に PR #23 として既にマージ済み
  (`dfa4b98` 系列, merge commit `a197cd9`)。以後 main は 96 コミット進んだ。
- ゆえにこの報告は「これから書く散文の下書き」ではなく **「既に出荷された散文が、96 コミット後の
  現実とまだ合っているか」の遡及検分** である。

---

## 0. 何を測ったか (生の出力)

```
$ git rev-list --count dfa4b98..HEAD
96

$ gh pr view 23 --json number,state,mergedAt,mergeCommit
{"c":"a197cd9d726034433626b248f1d9673c5d427e41","m":"2026-08-31T22:51:44Z","n":23,"s":"MERGED",
 "t":"reform(diet): CLAUDE.md の設計思想回帰 — 憲法写経の退治とハーネス全体の diet 門 (第39〜40条)"}
```

---

## 1. CLAUDE.md の diet — 予算内か

```
$ wc -c CLAUDE.md
3054 CLAUDE.md

$ wc -c overlay/root/CLAUDE.md
1576 overlay/root/CLAUDE.md

$ node -e "const c=require('./graph/census.js');
  console.log(c.CLAUDE_MD_BUDGET, c.GLOBAL_CLAUDE_MD_BUDGET, c.ALWAYS_ON_RULES_BUDGET)"
4096 2048 4096
```

| 対象 | 実測 | 予算 | 判定 |
|---|---|---|---|
| project `CLAUDE.md` | **3,054 B** | 4,096 B | ✅ 内 |
| global `overlay/root/CLAUDE.md` | **1,576 B** | 2,048 B | ✅ 内 |
| 無スコープ rules 合計 | **2,482 B** (agents 537 / git-workflow 425 / hooks 481 / performance 517 / security 522) | 4,096 B | ✅ 内 |

**注意すべき変化**: 改修直後 (dfa4b98) の CLAUDE.md は 2,607 B、現在は 3,054 B。
96 コミットの間に **+447 B 太った**。まだ予算内だが、diet 門は「予算超過」しか鳴らないため、
**じわじわ太る動きは門に捕まらない**。これは第39条が想定した振る舞いの範囲内ではあるが、
実測しなければ見えない事実なので記録する。

## 2. diet 門は実際に鳴る側に立っているか

```
$ node -e "const c=require('./graph/census.js');
  console.log('dietChecks:',JSON.stringify(c.dietChecks()));
  console.log('harnessDietChecks:',JSON.stringify(c.harnessDietChecks()))"
dietChecks: []
harnessDietChecks: []
```

両者とも findings ゼロ = 現在の main は diet 門に対して緑。
`census.js` に `CLAUDE_MD_BUDGET=4096` (305 行) / `GLOBAL_CLAUDE_MD_BUDGET=2048` (342 行) が実在し、
`module.exports` (473 行) から公開されていることをソース実読で確認した。

## 3. 憲法 第39条・第40条 の条文は実在し、散文と一致するか

```
$ node graph/codex.js article 39   → 実在。「常時ロードの散文は最初の1画面」「diet 門 (census.dietChecks)
                                      予算 4,096 B」まで条文に明記されている
$ node graph/codex.js article 40   → 実在。「global CLAUDE.md 予算 2,048 B」「無スコープ rules 予算 4,096 B」
                                      「census.harnessDietChecks が原本を裁く」と明記
```

条文が名指す数 (4,096 / 2,048 / 4,096) は §1 の `census.js` 実測値と **完全一致**。
条文が名指す engine (`census.dietChecks` / `census.harnessDietChecks`) も実在を確認済み。
→ **憲法散文にズレなし。**

## 4. 創造物の掟の「機構への昇格」は実在するか

```
$ node graph/critic.js checklist | grep -i "iso|external|domain"
[gap]   no-wall-clock-iso: 創造物は toISOString() を使わない …
[gap]   no-external-deps:  創造物は外部依存ゼロの単一HTML …
[smell] domain-markers-present: 純粋関数の domain 層は一対のマーカで囲み …
```

CLAUDE.md が「掟 (単一HTML・外部依存ゼロ・toISOString禁止・DOMAINマーカー) は
**critic.js が機械で裁く**」と書いている通り、3 つとも critic の check として実在。
→ **この行は真である。**

## 5. 🔴 ズレ発見 — CLAUDE.md の「機械が強制していること」は今も一部が虚偽

CLAUDE.md 現行 (27-31 行) はこう書く:

> force-push・main直接コミット・`~/.claude` 手編集・`.env` 読み書きは
> **permissions/hooks/CI が拒む** (`node graph/apply-guards.js verify` が証拠)。

実測 (`graph/apply-guards.js` の POLICY, 87-117 行を実読):

```
deny: git push --force / -f / --force-with-lease / git reset --hard /
      git commit --no-verify / Edit(~/.claude/**) / Edit(**/.env) /
      Read(**/.env) / Read(**/.env.*)          … 計 9 件
ask:  gh pr merge                               … 計 1 件
allow: node graph/* / node tests/* / git status / git diff / git log … 計 5 件

$ node graph/apply-guards.js verify
  ✓ 掟は機構である: deny 9 / ask 1 / allow 5
  ✓ hook matcher 15 件すべて生きている
exit=0
```

```
$ ls .git/hooks/ | grep -v sample     → (空。ローカル git hook は 1 本も無い)
```

**deny/ask/hooks のどこにも「main 上での `git commit` を拒む」規則は存在しない。**
これは review.md (§1【重大】) と security-report.md (Issue 1) が **2026-08-31 の時点で既に
名指して差し戻した欠陥であり、7 日後の現在も CLAUDE.md にそのまま残っている。**

GitHub 側の保護は実在する (これは真):

```
$ gh api repos/kikusyo1101/paradise-forge/branches/main/protection
required_status_checks: ["検証ゲート (self-test / policy / secrets)",
                         "⚖️ 執行官の裁定 (independent judgment)"] (strict:true)
required_pull_request_reviews: require_code_owner_reviews:true, required_approving_review_count:0
allow_force_pushes: false / allow_deletions: false / enforce_admins: **false**
```

→ 拒まれるのは **push/merge の時点** (GitHub 側) であって、**ローカルの commit ではない**。
しかも `enforce_admins:false` なので、管理者 (神本人) は保護を素通りできる。
CLAUDE.md の「permissions/hooks/CI が拒む」という三者列挙のうち、
「main直接コミット」については **permissions=✗ hooks=✗ CI=△(push後)** である。

### 是正 (試みたが **できなかった** — 正直に記す)

CLAUDE.md の当該行を実態通りに書き換えようとした。用意した文面は:

```
force-push・`~/.claude` 手編集・`.env` 読み書きは **permissions が拒む**
(`node graph/apply-guards.js verify` が証拠)。main への **push** は GitHub の
保護が拒み、**マージは神の御手のみ** (CODEOWNERS + 保護)。
だが **main へのローカル commit を拒む機構は無い** — ここだけは散文の掟である。
ブランチを切る前の `node graph/branch-guard.js` も散文の掟 — 必ず走らせる。
```

しかし編集は **ハーネスの保護機構に拒まれた**:

```
BLOCKED: write to protected agent-instruction file(s) (CLAUDE.md)
approval prompt timed out without a user response. Silence is not consent.
```

CLAUDE.md は agent-instruction 保護対象であり、神の明示的同意なしには書き換えられない。
**別経路 (terminal / node の fs) での迂回は行わなかった** — 迂回は保護機構の意義を殺すからである。

→ **この虚偽は未是正のまま残る。** verdict でこれを AC 不合格として扱い、
critique.md で「神の承認を要する是正」として引き継ぐ。神が承認すれば 1 行の置換で済む。

**皮肉な記録**: 「main直接コミットは機械が拒む」という虚偽の行を直そうとして、
**本物の機械の拒絶に遭った**。機構は生きている — ただし守っているのは CLAUDE.md の
文字列であって、その内容の真偽ではない。

## 6. README の該当節

```
$ grep -n "第39条|第40条|diet|4,096|2,048" README.md
(ヒットなし)
```

README は diet 門・第39〜40条を **一度も記述していない**。
engine 表 (88-205 行) にも `census` の diet 機能は現れない。
ただし README の engine 表は `census.js` 自体を列挙しておらず (`export-state.js` はある)、
これは本改修より前から続く構造であり、本走行では **記述漏れとして記録するに留める** (§7)。

## 7. census check の実測 — README の数値 claim

```
$ node graph/census.js check     (完走に 5 分超。自己診断を丸ごと回すため)
```
別途 `node tests/paradise.test.js` を単独で完走させた実測:
```
real  5m42.046s
Paradise self-test: 339 passed, 0 failed
```

⚠️ **正直な記録**: 最初の試行で `timeout 300 node graph/census.js check` を打ち、
`🔴 README テスト数: doc says 339/339, reality is 16/16` という出力を得た。
これは **私が外から 300 秒で殺したことによる部分計測** であり、実際の欠陥ではない。
`census.js` 68-103 行のコメントが警告している「打ち切られた走行の部分出力を真実として
報告してはならない (第16条)」に、私自身が一度足を踏み入れた。記録として残す。
(census 自身の内部 timeout は 600,000 ms なので、census を殺したのは私の 300 秒であった。)

---

## 判定

| 検分項目 | 判定 |
|---|---|
| CLAUDE.md / global / rules が diet 予算内か | ✅ 3,054 / 1,576 / 2,482 B — 全て内 |
| diet 門 (dietChecks / harnessDietChecks) が実在し緑か | ✅ findings 0 |
| 憲法 第39・40条 の条文と数が engine と一致するか | ✅ 完全一致 |
| 創造物三法が critic に昇格しているか | ✅ 3 件実在 |
| CLAUDE.md「機械が強制していること」の記述 | 🔴 **虚偽が残存** — 是正を試みたが保護機構に拒まれ**未是正** |
| README に diet の記述 | ⚠️ **無し** — 記録に留める |

**docs 相の結論: 散文は 5 項目で正しく、1 項目 (main直接コミットの機械強制主張) で虚偽。
虚偽の是正は保護機構 (神の承認が要る) に阻まれ、未是正のまま verdict へ送る。**
