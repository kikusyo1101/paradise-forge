# verification-report.md — requirements.md の受入条件を、現在の main 上で自ら駆動した結果

- 相: `verify` (枢機卿 quality、gate=true)
- 実測日: 2026-09-07 / 対象: **現在の main** `4d2f217` (実装マージから 96 コミット後)
- 方針: requirements.md の AC-1〜AC-5 を **一つずつ自分の手で駆動** した。
  「〜のはず」は一つも書かない。通らない AC は通らないと書く。

---

## 総括表

| AC | 内容 | 判定 |
|---|---|---|
| AC-1 | CLAUDE.md は「最初の1画面」に痩せる (≤4,000 B 目標) | ✅ **合格** (3,054 B) |
| AC-2 | 創造物の掟は散文から機構 (critic.js) へ | ✅ **合格** (陽性・陰性の両方向を実測) |
| AC-3 | 数の門は方針転換に追従する (diet 門) | ✅ **合格** (壊して鳴らした) |
| AC-4 | prove — 門を壊して鳴らす | ✅ **合格** (門の実在とテストを実読) |
| AC-5 | 全門緑 + 憲法第39条 + 文書更新 | ⚠️ **部分合格** — 全門緑だが**文書に虚偽が残る** |

---

## AC-1: CLAUDE.md は「最初の1画面」に痩せる

> 目標 ≤ 4,000 B (現 10,780 B)

```
$ wc -c CLAUDE.md
3054 CLAUDE.md

$ grep -c "" CLAUDE.md
40
```

10,780 B → **3,054 B (▲71.7%)**、40 行。目標 4,000 B を下回る。

残すもの (litmus 通過) を実読で確認: 役割と言語 (3-5 行) / 地図 = CONSTITUTION・codex・forge・
conclave・門・ダッシュボード・創造物への指し示し (7-24 行) / 機械強制の目録 (26-29 行) /
機械強制できない判断則 4 件 (31-38 行)。憲法 52 条の要約表は**存在しない** —
`node graph/codex.js index` を指す 1 行に畳まれている。

**判定: ✅ 合格。**
ただし記録すべき事実 — 改修直後 `git show dfa4b98:CLAUDE.md | wc -c` = **2,607 B** に対し
現在 3,054 B。96 コミットで **+447 B 太った**。予算内だが単調増加している。

## AC-2: 創造物の掟は散文から機構へ (第33条)

> toISOString 禁止・外部依存(CDN)禁止 → critic.js の決定的 check (gap) に昇格。DOMAIN マーカー → smell。

**(a) 掟が check として実在するか**
```
$ node graph/critic.js checklist | grep -iE "iso|external|domain"
[gap]   no-wall-clock-iso: 創造物は toISOString() を使わない …
[gap]   no-external-deps:  創造物は外部依存ゼロの単一HTML …
[smell] domain-markers-present: 純粋関数の domain 層は一対のマーカで囲み …
```
severity も仕様通り (gap / gap / smell)。

**(b) 陽性 — 汚れた創造物を実際に作って critic にかけた**

`$LOCALAPPDATA/Temp/ac2test/index.html` に CDN 参照と `toISOString()` を仕込んで実走:
```
$ node graph/critic.js review "$T" --lessons graph/lessons.json
  🔴 [gap] no-wall-clock-iso: toISOString() used 1× — ローカル日付が UTC に化ける
  🔴 [gap] no-external-deps: 1 external reference(s): href="https://cdn.example.com/x.css"
  🟠 [smell] domain-markers-present: no extractable domain markers …
```
**3 件すべてが名指しで鳴った。** 掟は散文ではなく機構として生きている。

**判定: ✅ 合格。**

## AC-3: 数の門は方針転換に追従する — diet 門

> CLAUDE.md が予算 (4,096 B) を超えたら census check が落ちる。
> volatile な数 (自己診断N件/憲法N条) が再侵入しても落ちる。

**予算値の実測**
```
$ node -e "const c=require('./graph/census.js');
  console.log(c.CLAUDE_MD_BUDGET, c.GLOBAL_CLAUDE_MD_BUDGET, c.ALWAYS_ON_RULES_BUDGET)"
4096 2048 4096
```

**壊して鳴らした (第21条)** — 現物 CLAUDE.md を一時的に汚し、`dietChecks()` を直接駆動:
```
FAT      -> ["常時ロードの散文が 8054 B — 予算 4096 B。法は機構へ、詳細は指した先へ"]
VOLATILE -> ["テスト数は census が数える"]
RESTORED -> []
```
- 5,000 B を足す → **予算超過を名指しで捕らえた**
- `自己診断 339 件` を足す → **volatile な数の再侵入を捕らえた**
- 原状復帰後 → findings 0。`wc -c CLAUDE.md` = 3054、`git diff --stat CLAUDE.md` = 差分なし
  (**現物を汚したまま放置していないことを実出力で証明**)

**ハーネス側 (第40条) も実測**
```
$ node -e "…console.log(c.harnessDietChecks())"
[]
```
| 対象 | 実測 | 予算 | 判定 |
|---|---|---|---|
| `overlay/root/CLAUDE.md` | 1,576 B | 2,048 B | ✅ |
| 無スコープ rules 合計 | 2,482 B (agents 537 / git-workflow 425 / hooks 481 / performance 517 / security 522) | 4,096 B | ✅ |
| `paths:` スコープ付き rules | coding-style / patterns / testing の 3 本 | — | ✅ 仕様通り |

**判定: ✅ 合格。**

## AC-4: prove — 門を壊して鳴らす (第21条)

回帰テストとして固定されているかを実読:
```
$ grep -n "diet|予算" tests/paradise.test.js
2993: test('diet: 現物の CLAUDE.md は予算内で数値を持たない (第39条)')
3002: test('diet: 太った CLAUDE.md と数値の再侵入を門が名指しで捕らえる (第21条: 壊して鳴らす)')
3016:   assert.ok(/dietChecks/.test(src) && /findings\.push\(\.\.\.dietChecks\(\)\)/.test(src),
          'dietChecks is wired into check() — a gate not wired is decoration')
3208: test('diet: 現物の global CLAUDE.md と rules は予算内 (第40条)')
3218: test('diet: ファイル種の掟 3本は paths: スコープを持ち、写経の病巣は再発しない (第40条)')
3239: test('diet: /ship command は手順の全文を引き受けている (第40条)')
```
「門が check() に配線されているか」まで assert している (3016 行) のは良い —
鳴らない門は飾りである、という第21条の趣旨を満たす。
§AC-3 で私自身が合成入力で両方向 (鳴る/黙る) を再現できたことが、この門の生きた証拠である。

**判定: ✅ 合格。**

⚠️ ただし review.md §(4) が指摘した
「`census: a stale number …` テストが名前の主張を証明していない」件は、
本走行では **再検証していない** (docs/verify の射程外と判断した)。未確認事項として記す。

## AC-5: 全門緑 + 憲法第39条 + 文書更新

**(a) 自己診断 — 通常環境**
```
$ time node tests/paradise.test.js
Paradise self-test: 339 passed, 0 failed
real  5m42.046s     exit=0
```

**(b) 自己診断 — 素の環境 (第20条)**
```
$ PARADISE_UPSTREAM=/nonexistent CLAUDE_HOME=/nonexistent node tests/paradise.test.js
Paradise self-test: 339 passed, 0 failed
bare exit=0
```
**両環境で 339 passed / 0 failed。片方でも赤なら未完 — 赤は無い。**

**(c) census 収束**
```
$ node graph/census.js check
  ✓ every number the paradise claims about itself is true
exit=0
```
⚠️ **正直な記録**: 最初 `timeout 300` を被せて走らせ
`🔴 README テスト数: doc says 339/339, reality is 16/16` を得たが、これは
**私が外から 300 秒で殺したことによる部分計測**であって欠陥ではない。
timeout 無しで完走させたら緑だった。census.js 68-103 行が警告する
「打ち切られた部分出力を真実として報告するな (第16条)」に私自身が一度足を踏み入れた。

**(d) codex 整合**
```
$ node graph/codex.js check
  ✓ 索引は本文と一致している (52 条)
exit=0
```

**(e) apply-guards**
```
$ node graph/apply-guards.js verify
  ✓ 掟は機構である: deny 9 / ask 1 / allow 5
  ✓ hook matcher 15 件すべて生きている
exit=0
```

**(f) 憲法第39条・第40条の追記**
`node graph/codex.js article 39` / `article 40` 両方が実在。条文の名指す数
(4,096 / 2,048 / 4,096) は census.js の実測値と完全一致。

**(g) 🔴 文書更新 — ここが落ちる**

`docs-report.md §5` の通り、CLAUDE.md 26-27 行は今も
「force-push・**main直接コミット**・~/.claude 手編集・.env 読み書きは permissions/hooks/CI が拒む」
と書くが、実測した POLICY (deny 9 / ask 1 / allow 5) にも `.git/hooks/` (空) にも
**main 上の `git commit` を拒む規則は存在しない**。GitHub 保護が拒むのは push/merge であり、
しかも `enforce_admins: false`。

これは review.md と security-report.md が **2026-08-31 に差し戻し理由として名指した欠陥**であり、
7 日後の今も残っている。是正を試みたが CLAUDE.md は agent-instruction 保護対象で、
神の承認が無いため書き換えられなかった (BLOCKED、迂回はしていない)。

**判定: ⚠️ 部分合格。(a)-(f) は緑、(g) の「文書更新」が不合格。**

---

## verify 相の結論

**全門は緑 (339/339 × 2 環境、census/codex/apply-guards すべて exit 0)。
AC-1〜AC-4 は自ら駆動して合格を確認した。AC-5 は門の部分は緑だが、
文書の部分に虚偽が残るため不合格である。**

この改修は **AC の 4/5 を満たしたまま、残る 1 を満たさずに main へ出荷された**。
出荷を止めるはずの review/security が「差し戻し」を書いていたのに、
その差し戻しが環に載らなかった — これが宙吊りの正体である (critique.md へ引き継ぐ)。
