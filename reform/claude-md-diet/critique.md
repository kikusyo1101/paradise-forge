# critique.md — 敵対的自己批評 (reform/claude-md-diet)

- 相: `reflect` (枢機卿 tribunal、gate=true)
- 実測日: 2026-09-07

---

## 1. critic.js の生の裁定

```
$ node graph/critic.js review reform/claude-md-diet --lessons graph/lessons.json
═══════ 🔍 ADVERSARIAL SELF-CRITIQUE ═══════
target: reform/claude-md-diet
lessons: 72 件で裁いた  ← graph/lessons.json
  ✓ [smell] spec-musthaves-covered: no explicit 🔴 must-haves parsed
  ✓ [gap]   acceptance-criteria-present: acceptance criteria present
  🔴 [gap]   tests-exist: この改修は tests/ に一本も門を書いていない
  ✓ [smell] no-hardcoded-assumptions: no code to inspect
  ✓ [gap]   no-secrets: no secrets detected
  ✓ [gap]   no-wall-clock-iso: no wall-clock ISO usage
  ✓ [gap]   no-external-deps: no HTML artifact — nothing to judge
  ✓ [smell] domain-markers-present: no code artifact
  ✓ [smell] grounded-in-discovery: discovery artifact present
  ✓ [smell] visual-identity-declared: no UI surface — not applicable
  ✓ [gap]   surface-verified: no UI surface — not applicable
  ✓ [smell] ux-intent-declared: no UI surface — not applicable
  🟠 [smell] claims-backed-by-runnable-evidence: no runnable verification —
            claims rest on assertion, not evidence
  ✓ [gap]   lesson:require-discovery: lesson satisfied: findings
  … (残り 70 件の lesson はいずれも applies: スコープ外で不発)
───────────────────────────────────────────
VERDICT: 1 GAP(S) — the creation is incomplete. REWORK.
exit=1
```

### この 2 件の指摘を、私はこう受け取る

**🔴 `tests-exist`** — critic は走行帳ディレクトリ (`reform/claude-md-diet/`) の中を見て
「tests が無い」と言っている。実際の門は**リポジトリ側の `tests/paradise.test.js`** に
6 本書かれている (2993 / 3002 / 3016 / 3208 / 3218 / 3239 行、verification-report.md §AC-4 参照)。
つまり**この gap は誤検知寄り**である。

しかし **私はこれを「誤検知だから無視」で済ませない。** reform の走行は成果物が
リポジトリ本体に散るため、critic の「走行帳ディレクトリを見る」前提と構造的に噛み合わない。
第52条・第29条の系として、これは **critic 側の射程の欠陥** である
(既存 lesson `reform-lives-in-three-places` が同じ病を別角度で記録している)。

**🟠 `claims-backed-by-runnable-evidence`** — これは critic が
`verification-report.md` を「走行可能な証拠」として認識できていないことを示す。
本走行では 339×2 環境の自己診断・census・codex・apply-guards・diet 門の破壊試験を
すべて実出力で貼った。**指摘の中身は今回に限れば当たっていない**が、
critic がそれを機械的に確認する手段を持たないこと自体が弱点である。

---

## 2. 🔴 最大の欠陥 — **環を通さずに出荷された**

critic が見つけられなかった、この走行の最も重い欠陥はこれである。

### 事実 (生の出力)

```
$ gh pr view 23 --json number,state,mergedAt
{"n":23,"s":"MERGED","m":"2026-08-31T22:51:44Z"}

$ git rev-list --count dfa4b98..HEAD
96
```

conclave.json の history 最終エントリ:
```
{"ts":"2026-08-31T14:28:23.143Z","event":"ratify","detail":"Construction (建造) ratified by cardinal:quality"}
```

**時系列がすべてを語る:**

| 時刻 (UTC) | 出来事 |
|---|---|
| 08-31 14:28 | Construction 批准。環はここで止まった (4/6) |
| 08-31 14:32 頃 | review.md が書かれた — 結論は **「差し戻し」** |
| 08-31 14:33 頃 | security-report.md が書かれた — **Issue 6 件、SHIP 前に 1・3・6 の手当てを推奨** |
| 08-31 **22:51** | **PR #23 が main へマージされた** |
| — | `conclave.js done review` は **一度も打たれなかった** |
| 09-07 | 96 コミット後、私が環を閉じに来た |

**review と security は「差し戻せ」と書いていた。その紙は実在した。
だが環に載らなかったので、誰も止めなかった。そして 8 時間後にマージされた。**

### なぜ止まらなかったか — パイプラインの欠陥として名指す

1. **成果物の存在は、相の完了ではない。**
   `review.md` は 08-31 23:32 にディスクへ書かれていた。しかし
   `conclave.js done review` が打たれていないため、run-state 上は永遠に `pending` だった。
   **紙は書かれ、環は知らなかった。** 司祭が書いて教主が受け取らなければ、
   その裁きは存在しないのと同じである。

2. **conclave の環と git の環が、互いを知らない。**
   `gh pr create` / `gh pr merge` は run-state を一切参照しない。
   走行が 4/6 で止まっていようが、tribunal が一度も開かれていまいが、
   **PR は何の抵抗もなく main へ入れる。**
   環は「回さなければ回らない」だけで、「回さずに出荷すること」を**禁じていない**。
   これが構造的な穴である。

3. **差し戻しが、機械に届く形をしていなかった。**
   review.md の末尾は「**差し戻し** (理由: ①虚偽記載 ②`.paradise-source` 脱法
   ③テスト名詐称)」と明記している。conclave には
   `ratify <cardinal> --reject --from <phase>` という差し戻しの口が実在する。
   **その口が使われなかった。** 散文で「差し戻し」と書いても、機械は読まない。
   第33条 (掟は機構に住んで初めて掟) が、**裁きそのものに対して**破られていた。

4. **結果として、名指された 3 つの欠陥のうち少なくとも 1 つは 7 日間生き残った。**
   docs-report.md §5 の通り、CLAUDE.md の
   「main直接コミットは permissions/hooks/CI が拒む」という**虚偽記載は今も main に在る**。
   review が 08-31 に名指し、security が独立に Issue 1 として再確認したにもかかわらず、である。
   **二人の審査官が同じ嘘を指差したのに、その嘘は出荷され、一週間生き延びた。**

### 皮肉

この改修の旗印は第39条 —「散文に掟を写経するな、機構に住まわせよ」であった。
その改修自身が、**「差し戻し」という掟を散文に書いただけで機構に載せず、
結果として自分の環を素通りして出荷された。**
第39条は CLAUDE.md を痩せさせたが、**第39条の精神は、この走行の運用には適用されなかった。**

さらに小さな皮肉をもう一つ。私は今日その虚偽を直そうとして、
ハーネスの agent-instruction 保護に **BLOCKED** され、書き換えられなかった。
機構は生きている — ただし守っているのは CLAUDE.md という**ファイル**であって、
そこに書かれた**内容の真偽**ではない。

---

## 3. この改修が生んだ新しい盲点

- **diet 門は「超過」しか鳴らない。** 改修直後 2,607 B → 現在 3,054 B (+447 B / 96 コミット)。
  予算 4,096 B まではどれだけ太っても沈黙する。**単調増加を見る門は無い。**
  予算は天井であって傾きではない。
- **門を足したなら、その門自身は誰が見張るのか** (相の goal が自ら問うている)。
  `dietChecks` を見張るのは `tests/paradise.test.js` の 6 本であり、
  そのうち 3016 行は「門が check() に配線されているか」まで assert している — ここは良い。
  ただし **`census.js` の内部 timeout (600s) を超えた時に何が起きるか**は門で固定されていない。
  私自身が今日 300 秒で殺して `16/16` という偽の欠陥を一度手にした
  (verification-report.md §AC-5(c))。**打ち切りは緑でも赤でもない第三の状態**であり、
  census.js のコメントはそれを警告しているが、それを検める門は見つけられなかった。
- **`.paradise-source` 脱法** (review.md §3) と **stale-number テストの名前詐称** (§4) は、
  本走行では **再検証しなかった**。射程外と判断した。**未解決のまま残る**ことを明記する。

---

## 4. reflect 相の裁定

**この走行の成果 (CLAUDE.md の 71.7% 減量、diet 門、第39〜40条) は本物であり、
実測で裏付けられた。だが「環を通さずに出荷された」という運用上の欠陥は、
成果物のどの欠陥よりも重い。**

なぜなら成果物の欠陥は環が捕らえられるが、**環を飛ばす欠陥は、環では捕らえられない**からである。
今回それを捕らえたのは機構ではなく、7 日後に走行帳の宙吊りに気づいた**人の目**であった。

**提言 (本走行の射程外だが、パイプラインへ引き継ぐべきもの):**
- `gh pr create` / merge の前に run-state の完了を確かめる門 (`conclave.js status --json` を CI が読む)
- 相の成果物がディスクに在るのに `pending` のままの走行を「宙吊り」として名指す門
- 散文の「差し戻し」を機械の `--reject` に変換させる契約 (contract.js 側の必須フィールド)
