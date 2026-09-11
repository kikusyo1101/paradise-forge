# 引き継ぎ — 主権的住処の改革 (reform/sovereign-abode)

> 書いた日: 2026-09-11 夜 / 書いた者: 教主
> **明日の私へ。** ここを読めば、どこまで来て、次に何を打てばよいかが分かる。

---

## 0. 今どこに居るか — 一行で

**第4段(既定の反転)は着地し、PR #49 を開いた。CI の結果待ち。**
明日の最初の仕事は **CI を読むこと**。緑なら神にマージを仰ぎ、第5段へ進む。

```
第0段 ✅ PR #45 MERGED   第58条 + abode.js / abode.json / abode.test.js
第1段 ✅ PR #46 MERGED   os.homedir() 16箇所を器へ通す
第2段 ✅ PR #47 MERGED   両居 — <repo>/.claude を git 追跡の派生物に
第3段 ✅ PR #48 MERGED   見張りの建て替え + 第59条(鼓動)
第4段 ▶  PR #49 OPEN     既定の反転 (DEFAULT_MODE = 'repo') + KG/日次台帳の移設
第5段 ⏸  未着手          兄弟倉への配備 (EX-2)
第6段 ⏸  未着手          撤収 — ~/.claude から楽園の痕跡を引く
第7段 ⏸  未着手          global モードの限定
```

**PR #49**: https://github.com/kikusyo1101/paradise-forge/pull/49
枝 `reform/sovereign-abode-5` / HEAD `6faf288` / コミット 4 本。

---

## 1. 明日、最初に打つコマンド

```bash
cd C:/Users/kikus/Documents/workspace/paradise

# (1) ★最優先: PR #49 の CI を読む
gh pr checks 49
gh pr view 49 --json state,mergeable,mergeStateStatus -q '.state+" / "+.mergeStateStatus'
# 赤が出ていたら: gh run view <runId> --log-failed | grep -vE "ledger line|warning:" | tail -40
#   → **門を疑う前にログを読め。** この改革では赤が3回とも「門が正しく鳴っていた」(第4節)

# (2) 緑なら神にマージを仰ぎ、マージ後に:
git checkout main && git fetch origin && git merge --ff-only origin/main
git checkout -b reform/sovereign-abode-6      # 第5段へ
node tasks.js done 32   (C:/Users/kikus/tasks)  # 台帳 [32] を閉じ、[33] を開く
```

**第4段で確認済みのこと(再走行は不要)**:

```
素 / PARADISE_ABODE=repo / =global の 3 走行とも  471 passed, 0 failed
tests/abode.test.js                                66 passed, 0 failed
census / wiring / codex / workspace / hermetic / derived / abode check / conclave audit  全て EXIT=0
node graph/abode.js resolve   → mode=repo (source=default) / 全住所 <repo> 配下 / kg=true
node graph/abode.js migrate --verify → 4 行とも sha256 集合の一致: true / EXIT=0
故障注入(AC-7) → deploy.check が反転先でも赤くなり、git checkout で復元済み
神の ~/.claude の記憶は無傷(122/33/5 行 + paradise-daily.json 642 bytes)
```

---

## 2. 第4段で何をやったか

### 反転 — 1行

```diff
-const DEFAULT_MODE = 'global';
+const DEFAULT_MODE = 'repo';
```

設計書(`design.md` §1.3)は**これが1行の差分であること**を PR の可読性の要件としている。
付随して直す物は別コミットに分ける方針。

### 実測(反転後)

| 測ったもの | 結果 |
|---|---|
| 素の走行(反転後) | `471 passed, 0 failed` |
| `tests/abode.test.js` | 53 → 66 green |
| `.gitignore` | 日次台帳(`.claude/paradise-daily.json`)は追跡しない裁定を明記 |

### 移設の対象(反転前の実測値)

```
~/.claude/paradise-kg/
  nodes.jsonl     122 行
  edges.jsonl      33 行
  cochange.jsonl    5 行
  nodes.jsonl.bak.lexicon   (退避)
~/.claude/paradise-daily.json   642 bytes (9/2 以降更新なし — cron は神の意志で停止中)
```

**`~/.claude` の実体は消していない。** 撤収は第6段の仕事である。

---

## 3. 明日やること(第4段を閉じる)

1. **PR を開く**(まだ開いていない)。本文には必ず:
   - 反転が**1行**であることを diff で示す
   - **故障注入の証拠**(AC-7): `<repo>/.claude/agents/cardinal.md` を1バイト書き換えて
     `deploy.check` が赤くなる生出力。**直したことも確認する**(`git checkout -- .claude/`)
   - 3通りの走行(素 / `PARADISE_ABODE=repo` / `=global`)の最終行
   - migrate の移設前後の行数と sha256
2. **CI を読む。** 赤が出たら**門を疑う前にログを読め** — この改革では3回とも
   「門が正しく鳴っていた」。第4節の教訓を参照。
3. マージは神の御手。**PR の URL を神に必ず渡す**(頼まれなくても)。

---

## 3. 第5段(次の仕事)— 兄弟倉への配備 (EX-2)

台帳 **[33] GENE-7**。design.md §7 の work-5 行が正典:

> 兄弟倉への配備(EX-2)。`check --creations` の実装。兄弟倉の `.claude` を `.gitignore` に足す
> 満たす AC: AC-46〜AC-51 / 完了条件: `check --creations` が exit 0 で agents 30 / commands 19 / rules 8

着手前に実測すべきこと:
```bash
ls -a ../paradise-creations/.claude    # 着手時点では存在しない = 兄弟倉に神官が0体
node graph/abode.js exports --verify EX-2   # 現在は exit 2「この器では検められない」
node graph/abode.js check --creations       # 未実装(第5段の仕事)
```

台帳 `graph/abode.json` の EX-2 が根拠を語っている —— 創造物は兄弟倉に住む(第30条)。
そこで起動した環から神官 30 体が見えなければ、**環は神官を失ったまま緑を出す。**

## 4. 第4段の申し送り(PR #49 に書いたが、ここにも残す)

- CI(clone 直後)には移設元が無く `migrate --verify` は exit 2 を返す設計。門もそれを許す形だが
  **CI で実測していない**。`tribunal.yml` に migrate の行は足していない = 現状 CI はこの口を撃たない。
- `.claude/paradise-daily.json` を `.gitignore` に足したのは設計書に明文が無く、
  `graph/kg-store/` の裁定(第2段)からの**類推**。神が「追跡すべき」と裁くならこの2行を消せばよい。
- 設計書 §7.2 は「nodes 120」と書くが実測 122。執筆時の値と判断し、固定値ではなく
  **行数と sha256 集合の一致**で裁いた。
- `migrateSides()` の「移設元と移設先が同じ住所なら exit 2」は**設計に無い追加**(申告済み)。
  個別 env が両側に掛かると自己比較で永久に緑になる穴を塞ぐため。
- `pulse.counts.skills` は反転で必ず null になる(deploy は skills を配備しない)。
  design §3.3 の裁定どおり null + errors で語らせているが、**ダッシュボードの画面を目視していない**。

## 5. この改革で三度踏んだ教訓 — **CIの赤は、たいてい門が正しい**

PR #48 で赤が三層あり、**三つとも門が正しかった**。直したのは全て現実の側である。

| 赤 | 真因 | 直し方 |
|---|---|---|
| `gate-filter: 絞り込みは環境変数を読まない` | skip 機構の移植で絞り込み塊に `process.env` が混入 | 門は触らず実装を直した |
| `README テスト数: 469/469 ≠ 459/459` | **skip が本物になり `passed` が測る機械で変わる数になった** | README に語らせる数を「門の総数 = passed+failed+skipped」へ |
| `sovereign-abode 環が閉じぬまま 1512分 無音` | **段が着地した真の進捗を記録する口が engine に無かった** | 第59条「鼓動」を建てた |

**禁じ手(全て第57条違反)**: `|| true` / 閾値の引き下げ / 門の削除 / 例外リストへの名指し退避。

---

## 5. 第59条の鼓動 — 忘れると24時間後に赤くなる

この改革は複数の PR に跨がるため、**段が着地するたびに走行帳へ鼓動を刻む**必要がある。

```bash
node graph/conclave.js beat build \
  --run C:/Users/kikus/Documents/workspace/paradise/reform/sovereign-abode/conclave.json \
  --evidence reform/sovereign-abode/build-N-evidence.md \
  --note "<何が着地したか — 8字以上・プレースホルダ不可>"
```

**五つの錠**(教主が実地で撃って確認済み):

| 錠 | 破ろうとすると | 実測 |
|---|---|---|
| 1 | 実在しない/空の証拠 | exit 2 |
| 2 | **同じ証拠で二度目** | exit 1「同じ証拠を指し続ければ門は永久に黙る」 |
| 3 | running でない相 | exit 1 |
| 4 | status を変えようとする | 不可(記録するだけ) |
| 5 | 註釈がプレースホルダ | exit 2 |

拒否されたとき**走行帳は1バイトも書き換わらない**(確認済み)。

現在の鼓動: 3回(build-1 / build-2 / build-3 の各証拠)。
**第4段が着地したら build-4-evidence.md で4回目を打つ。**

---

## 6. 落とし穴(実際に踏んだもの)

- `node tests/paradise.test.js` は **471門 / 6〜8分**。**必ず background**。
  フォアグラウンドは180秒でタイムアウトする。
- **自己診断を並行で二本走らせるな**(第58条(c))。走行が版管理下の
  `README.md` / `graph/domains.json` を一時的に汚す経路があり、偽の赤が出る。
- `node graph/census.js fix` も**内部で自己診断を回す**(5〜10分)。background 必須。
  **README の数値を手で書くな**(第22条) — fix が測定から書き戻す。
- `conclave.js --run` は**スラグではなくパス**を取る。かつ native な `C:/...` 形式
  (MSYS の `/c/...` は native プログラムに渡すと失敗する)。
- 憲法に条を足したら `node graph/codex.js index --write` → `check`。
- 門を1本足したら README の数が変わる → `census.js fix` を忘れると CI が赤くなる。

---

## 7. 別件として起票済み(第4段とは混ぜない)

- **[34] GENE-8**: `tests/counsel.test.js` が2門赤い。**着手前の HEAD でも同じ2門が赤い**
  (git stash で実測)ため今回の変更とは無関係。さらに **CI からも `paradise.test.js`
  からも呼ばれていない**(grep 実測0件)= 誰も呼ばない門が赤いまま住んでいる。第44条の対象。
- **[26] GAUG-21**: gauge 台帳にマージ衝突の残骸(`>>>>>>> A…`)。
  走行のたびに `⚠️ ledger line skipped (corrupt)` が出るのはこれ。今回の欠陥ではない。

---

## 8. 位置と正典

| 何 | どこ |
|---|---|
| リポジトリ | `C:/Users/kikus/Documents/workspace/paradise` |
| 作業枝 | `reform/sovereign-abode-5` |
| 遠隔 | `github.com/kikusyo1101/paradise-forge`(main は保護 / マージは神のみ) |
| **設計書(正典)** | `reform/sovereign-abode/design.md`(1475行 — §1.3 / §3 / §5 / §7 / §8) |
| 要件 | `reform/sovereign-abode/requirements.md`(AC-1〜56) |
| 各段の証拠 | `reform/sovereign-abode/build-{1,2,3,4}-evidence.md` |
| 走行帳 | `reform/sovereign-abode/conclave.json` |
| 課題台帳 | `C:/Users/kikus/tasks/tasks.js`(`node tasks.js resume`)— 第4段は **[32]** |
| 憲法 | `node graph/codex.js index` / `article <n>` — 現在 **59条** |
