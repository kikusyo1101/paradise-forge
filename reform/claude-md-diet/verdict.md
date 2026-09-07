# verdict.md — 遡及の裁き (reform/claude-md-diet)

- 相: `verdict` (枢機卿 tribunal、gate=true、reviewClass: god)
- 裁定日: 2026-09-07
- **裁定: 🔴 BLOCK** (機械の裁定、exit 2)

---

## 0. 先に述べておくべき事実 — これは事後の裁きである

**この改修は既に main に在る。**

```
$ gh pr view 23 --json number,state,mergedAt,mergeCommit
{"n":23,"s":"MERGED","m":"2026-08-31T22:51:44Z","c":"a197cd9d726034433626b248f1d9673c5d427e41"}

$ git rev-list --count dfa4b98..HEAD
96
```

裁く前に出荷された。tribunal が開かれる前に、成果は現実へ届いていた。
**この裁定は「出してよいか」を決めるものではない。既に出たものが、
出してよいものだったのかを、7 日と 96 コミット遅れて述べるものである。**

私はこの事実を隠さない。隠せば、この走行が犯した罪を二度繰り返すことになる。

## 1. 機械の裁定 (生の出力)

```
$ node graph/verdict.js judge reform/claude-md-diet/verdict-report.json
═══════════ ⚖️  VERDICT ═══════════
🔴  BLOCK
Constitutional breach — cannot ship, escalate to human.

Breaches (BLOCK):
  🔴 2 security issue(s) — must be resolved before shipping
  🔴 spec not satisfied: AC-5『全門緑 + 憲法第39条 + 文書更新』のうち文書更新が不合格 —
     CLAUDE.md に『main直接コミットは機械が拒む』という虚偽記載が残存する …
     — code must serve the spec

Passed:
  ✓ trajectory 80/100
  ✓ build passes
  ✓ lint clean
  ✓ 339/339 tests pass
═══════════════════════════════════
exit=2
```

**私はこの裁定に同意する。** そして重い意味を認める —
**BLOCK と裁かれたものが、既に main で 96 コミット走り続けている。**

## 2. 何が緑で、何が赤か

### ✅ 本物であったもの (すべて自分の手で駆動した)

| 項目 | 実測 |
|---|---|
| 自己診断 (通常) | `339 passed, 0 failed` exit 0 (real 5m42.046s) |
| 自己診断 (素の環境) | `PARADISE_UPSTREAM=/nonexistent CLAUDE_HOME=/nonexistent` → `339 passed, 0 failed` exit 0 |
| census | `✓ every number the paradise claims about itself is true` exit 0 |
| codex | `✓ 索引は本文と一致している (52 条)` exit 0 |
| apply-guards | `✓ deny 9 / ask 1 / allow 5`、`✓ hook matcher 15 件` exit 0 |
| CLAUDE.md 減量 | 10,780 B → **3,054 B (▲71.7%)** / 40 行 |
| global CLAUDE.md | 1,576 B / 予算 2,048 B ✅ |
| 無スコープ rules | 2,482 B / 予算 4,096 B ✅ |
| diet 門 (破壊試験) | 5,000B 追加→ `予算 4096 B` で鳴る / `自己診断 339 件` 追加→ `テスト数は census が数える` で鳴る / 復帰→ findings 0 |
| 創造物三法 (陽性試験) | 汚した HTML に対し 3 件すべてが名指しで発火 |
| trajectory | gauge score **80/100** (floor 60) |

**AC-1・AC-2・AC-3・AC-4 は合格である。** この改革の骨格は正しく、実測が裏付けた。

### 🔴 赤であるもの

**(1) CLAUDE.md の虚偽記載 (未是正)**

CLAUDE.md 26-27 行:
> force-push・**main直接コミット**・`~/.claude` 手編集・`.env` 読み書きは
> **permissions/hooks/CI が拒む**

実測:
```
POLICY deny 9 件 = git push --force/-f/--force-with-lease / git reset --hard /
                   git commit --no-verify / Edit(~/.claude/**) / Edit(**/.env) /
                   Read(**/.env) / Read(**/.env.*)
POLICY ask  1 件 = gh pr merge
$ ls .git/hooks/ | grep -v sample   → (空)
$ gh api …/branches/main/protection → enforce_admins: false, allow_force_pushes: false
```
**main 上の `git commit` を拒む規則は、permissions にも hooks にも存在しない。**
GitHub 保護が拒むのは push/merge であり、しかも管理者は素通りできる。

これは **review.md §1【重大】と security-report.md Issue 1 が 2026-08-31 に
独立して名指した欠陥**である。二人の審査官が同じ嘘を指差した。
それでも 8 時間後にマージされ、**7 日間生き延びた。**

是正を試みた。しかしハーネスの保護に拒まれた:
```
BLOCKED: write to protected agent-instruction file(s) (CLAUDE.md)
approval prompt timed out without a user response. Silence is not consent.
```
**別経路での迂回はしなかった。** 保護を迂回する裁定者は、裁く資格を失う。
→ **神の承認による 1 行の置換を要する。**

**(2) `.paradise-source` 脱法 (実測で再現)**

review.md §3 が指摘した脱法を、私は実際に再現した:
```
$ touch "$T/.paradise-source"
$ node graph/critic.js review "$T" --lessons graph/lessons.json
  ✓ [gap]   no-wall-clock-iso: engine code is exempt (creations-only law)
  ✓ [gap]   no-external-deps:  engine code is exempt (creations-only law)
  ✓ [smell] domain-markers-present: engine code is exempt (creations-only law)
```
同じ HTML はマーカー無しでは 3 件すべてで赤になる。
**空ファイル 1 個で、創造物三法が丸ごと消える。**

これが重いのは、本改修の論理そのものを崩すからである。
「掟を CLAUDE.md から消してよい理由は critic が機械で裁くからだ」— その裁きが
`touch` 一発で無効化できるなら、**掟を散文から外した判断の土台が弱い。**
しかも司祭 (subagent) が build 中にこのファイルを置くのを妨げる機構は無い。
第27条 (自己申告は証拠でない) に照らせば、**ディレクトリの自己申告で法域を移れるのは矛盾**である。

### ✅ 解消済みを実測で確認したもの (審査後に直っていた)

security-report.md Issue 3 の ReDoS は現行 main で解消されていた:
```
$ node -e "… /自己診断[^\n]{0,80}?\d+\s*件/ vs /自己診断[^\n]*\d+\s*件/ を 20万字で"
CURRENT(bounded)  elapsed_ms= 33
OLD(unbounded)    elapsed_ms= 32359
```
**約 980 倍。有界・怠惰量化への修正は実効性がある。** 秘密の混入も 0 件。

## 3. trajectory 80/100 という数を、私は信用しない

```
$ node graph/gauge.js score reform/claude-md-diet/conclave.json --json
{"score":80,"complete":false,"phasesTotal":11,"phasesDone":10,"domainsTotal":6,
 "domainsRatified":5,"firstPassRate":1,"reworkCount":0,"retryOverhead":0,
 "loopGuardTrips":0,"durationMs":596528099,"unobservable":11,"tier3Ratio":0}
```

`reworkCount: 0` / `firstPassRate: 1` — 数字は「一発で通った美しい走行」を描く。
**それは嘘である。**

review.md は末尾にこう書いていた:
> **差し戻し** (理由: ①「main直接コミット」を機械強制済みと記す虚偽記載
> ② `.paradise-source` 1 ファイルで創造物三法を脱法できる isSelf 判定
> ③ stale-number 門テストが名前の主張を証明していない)

**差し戻しは宣告されていた。だが `conclave.js ratify --reject --from build` は打たれなかった。**
散文で「差し戻し」と書いても、機械は読まない。ゆえに gauge の目には差し戻し 0 に映る。

`durationMs: 596528099` = **約 6.9 日**。これは仕事の長さではなく、**宙吊りの長さ**である。
この数だけが正直だった。

## 4. 裁定と、その理由

### 🔴 BLOCK

**理由:**
1. **spec not satisfied** — AC-5 が要求する「文書更新」を満たさない。虚偽の散文が main に在る。
2. **security issues: 2** — 虚偽記載 (Issue 1) と `.paradise-source` 脱法。
   どちらも 2026-08-31 に審査官が名指し、どちらも今日実測で再現した。

### だが BLOCK は「この改革が悪かった」という意味ではない

門は 339×2 環境で緑。CLAUDE.md は 71.7% 痩せた。diet 門は本当に鳴る。
第39・40条は engine の実測値と完全に一致する。**この改革の骨格は正しい。**

BLOCK が意味するのは —
**「正しい骨格が、二つの直せる欠陥を抱えたまま、環を通さずに出荷された」** ということである。

### 罪の所在

**この走行の最大の罪は、成果物にではなく運用にある。**

review と security は仕事をした。紙は書かれ、欠陥は名指された。
**だがその紙が環に載らなかった。** `conclave.js done review` が一度も打たれず、
run-state は永遠に `pending` のまま、tribunal は一度も開かれず、
そして `gh pr merge` は run-state を一切見ずに main へ通した。

**環は「回さなければ回らない」だけで、「回さずに出荷すること」を禁じていない。**
これが構造的な穴である (critique.md §2 に詳述)。

今回それを捕らえたのは機構ではなく、7 日後に走行帳の宙吊りに気づいた**人の目**であった。
**機構が捕らえられなかったという事実こそ、この裁定が名指す最大の欠陥である。**

## 5. 神への上申 (BLOCK は人へのエスカレーションを命じる)

既にマージ済みである以上、revert は 96 コミットの上で現実的でない。
ゆえに **前へ直す** ことを上申する:

1. **CLAUDE.md 26-27 行の虚偽を消す** — 神の承認 1 つで済む。文案は docs-report.md §5 に用意した。
2. **`.paradise-source` の法域を限る** — マーカー由来の isSelf は楽園 ROOT 配下でのみ有効とし、
   creations 配下で検出したらそれ自体を gap として名指す。
3. **環を飛ばした出荷を、機構に捕らえさせる** — `conclave.js status --json` を CI が読み、
   走行が未完のまま PR が main へ入るのを止める門。
   **これが在れば、PR #23 は 2026-08-31 に止まっていた。**
4. review.md §4 の「stale-number テストの名前詐称」は **本走行では再検証していない**。
   未確認事項として引き継ぐ。

---

**裁定者は、この改革の成果を認め、その出荷の仕方を裁く。
BLOCK。ただし前へ直せ — 戻すのではなく。**
