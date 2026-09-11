# 第4段 (work-4)「既定の反転」— 証拠

> 走者: 神官 / ブランチ `reform/sovereign-abode-5` / 起点 `d4511d2`(PR #48 マージ後)
> 満たす AC: **AC-9 / AC-10 / AC-11 / AC-12 / AC-54**(design.md §7 の work-4 行)
> 依存: work-3(PR #48 MERGED)—— **絶対条件**。見張りが建て替わっていない状態で
> 反転すれば、23 門が黙って skip に落ち、**壊れた目のまま**第5段・第6段へ進む(design §8 危険2)。

本書は**作業しながら逐次追記**した。節の順は着手順である。

---

## 0. 着手前のベースライン(実測)

反転前の現況を、自分の手で採り直した。教主の申告を鵜呑みにしない(第27条)。

```console
$ git status --short --branch
## reform/sovereign-abode-5
$ git log --oneline -1
d4511d2 Merge pull request #48 from kikusyo1101/reform/sovereign-abode-4
```

### 0.1 既定はまだ `global` — 反転の心臓は 1 行

```console
$ grep -n 'DEFAULT_MODE' graph/abode.js
43: *    第0段の職務であり、既定の反転(`DEFAULT_MODE = 'repo'`)は第4段の仕事である。
66:const DEFAULT_MODE = 'global';
117:  const mode = raw || DEFAULT_MODE;
758:      if (/\bmode\s*\(|\.mode\b|DEFAULT_MODE\b/.test(lines[i])) {
975:  REPO_ROOT, LEDGER, MODES, DEFAULT_MODE, KEYS, CHECK_FLAGS,
```

```console
$ node graph/abode.js resolve
mode=global (source=default)
  abode           C:\Users\kikus\.claude
  settings        C:\Users\kikus\.claude\settings.json
  agents          C:\Users\kikus\.claude\agents
  commands        C:\Users\kikus\.claude\commands
  rules           C:\Users\kikus\.claude\rules
  skills          C:\Users\kikus\.claude\skills
  claudeMd        C:\Users\kikus\.claude\CLAUDE.md
  kg              C:\Users\kikus\.claude\paradise-kg
  dailyLedger     C:\Users\kikus\.claude\paradise-daily.json
  creationsAbode  C:\Users\kikus\Documents\workspace\paradise-creations\.claude
  home            C:\Users\kikus
  exists: abode=true settings=true agents=true kg=true
EXIT=0
```

`PARADISE_ABODE=repo` は既に全住所が `<repo>` 配下を指す(第2段の成果)。
ただし **`kg=false`** —— 記憶はまだ移設されていない。これがこの段の仕事である。

```console
$ PARADISE_ABODE=repo node graph/abode.js resolve
mode=repo (source=env)
  ...
  kg              C:\Users\kikus\Documents\workspace\paradise\graph\kg-store
  dailyLedger     C:\Users\kikus\Documents\workspace\paradise\.claude\paradise-daily.json
  exists: abode=true settings=true agents=true kg=false
EXIT=0
```

### 0.2 `migrate` は未実装で exit 2(正直に「検められなかった」と答えている)

```console
$ node graph/abode.js migrate --plan
✗ migrate は 第4段 (work-4) で実装する — この段の abode.js は住所と台帳と門だけを持つ
EXIT=2
```

### 0.3 移設元の実測(神の `~/.claude`)

```console
$ wc -l C:/Users/kikus/.claude/paradise-kg/*.jsonl
    5 C:/Users/kikus/.claude/paradise-kg/cochange.jsonl
   33 C:/Users/kikus/.claude/paradise-kg/edges.jsonl
  122 C:/Users/kikus/.claude/paradise-kg/nodes.jsonl
  160 total
```

**設計書 (§7.2) は `nodes 120` と書いているが、それは執筆時の値である。**
現在の実測は **122**。ゆえに完了条件は「120 という固定値」ではなく
**「移設元と移設先の行数と sha256 集合が一致すること」**で裁く(AC-9 の本文どおり)。
固定値で裁けば、その値を書いた日から門は嘘になる(第22条の同型)。

### 0.4 反転で何が起きるかを、反転する前に測った(第38条: 測らなかった走行は語れない)

```console
$ PARADISE_ABODE=repo node -e "…pulse.snapshot()…"
{"counts":{…,"agents":30,"commands":19,"skills":null,"kgNodes":null,"kgEdges":null,"lessons":0},
 "errors":[{"engine":"pulse","key":"counts.skills","reason":"ENOENT: …\\.claude\\skills"},
           {"engine":"kg","key":"counts.kgNodes","reason":"ENOENT: …\\graph\\kg-store\\nodes.jsonl"},
           {"engine":"kg","key":"counts.kgEdges","reason":"ENOENT: …\\graph\\kg-store\\edges.jsonl"}]}

$ node -e "…pulse.snapshot()…"          # 反転前の既定 (global)
{"counts":{…,"agents":30,"commands":19,"skills":13,"kgNodes":122,"kgEdges":33,"lessons":87},"errors":[]}
```

読み取れること三つ:

1. `kgNodes` / `kgEdges` / `lessons` は **移設すれば戻る**。移設がこの段の仕事である。
2. **`counts.skills` は反転後も必ず `null` になる。** deploy は skills を一度も配備しない
   (discovery §1.2 の計画 0 件)。design §3.3 の裁定どおり **`counts.skills` は削除しない** ——
   削除は「数えられるものを数えるのをやめる」ことであり第22条に反する。
   `null` + `errors` に理由を載せて「楽園は skills を配備していない」を語らせる。
   **pulse は既に正しい**(0 で埋めず null を返す)。ゆえにこれは欠陥ではなく事実である。
3. `errors[].fatal` は全て false(`dashboard-count.test.js:34` の門が要求する形)。

### 0.5 反転前の全走行(素)— この数が比較の基点である

```console
$ node tests/paradise.test.js
Paradise self-test: 471 passed, 0 failed
EXIT=0
```

### 0.6 反転前の個別の門(全て exit 0)

```console
$ node graph/wiring.js check      → EXIT=0   engine 38 / 内の辺 72
$ node graph/codex.js check       → EXIT=0   索引は本文と一致している (59 条)
$ node graph/workspace.js check   → EXIT=0
$ node graph/hermetic.js check    → EXIT=0
$ node graph/conclave.js audit    → EXIT=0   見捨てられた走行: 0 / 判定不能: 0 / 全 11
$ node graph/abode.js check       → EXIT=0
```

---

## 1. `migrate --plan | --verify` を実装した(第4段の口)

### 1.1 仕様(design §1.2 の署名 / §1.4 の exit code / §1.5 の境界)

| 事項 | 実装 |
|---|---|
| 署名 | `migrateVerify(opts) → {ok, rows:[{file, from, to, sha, why, fromPath, toPath}], unmeasurable:[]}` |
| 追加 | `migratePlan(opts) → {from, to, rows, pending}` / `migrateSides(opts)` / `measureFile(p, kind)` |
| 対象 | `nodes.jsonl` / `edges.jsonl` / `cochange.jsonl`(`kind:'jsonl'`)+ `paradise-daily.json`(`kind:'file'`) |
| 照合 | **jsonl**: 空でない行数 + 各行 sha256 の**多重集合**(並べ替えて比較 — 順序は本質でないが重複は数える)<br>**file**: 空でない行数 + 全文 sha256(CRLF は LF に正規化) |
| exit 0 | 全行が `sha === true` |
| exit 1 | 移設先が無い / 行数が違う / 行数は同じだが sha 集合が違う |
| exit 2 | 移設元が無い(= 照合の基点が無い)/ 知らない旗 / 旗が無い / 旗が両方 |
| **`--write`** | **存在しない。** `printMigrate` が旗を名指しで拒み、`migratePlan`〜`migrateVerify` の本体に `writeFileSync/copyFileSync/mkdirSync/rmSync` が 1 行も無いことを門が実測する |

**設計に無い錠を一つ足した**(理由を明記する):
`migrateSides()` は移設元と移設先の `kg` / `dailyLedger` が**同じ住所なら exit 2 で拒む**。
個別 env(`PARADISE_KG` / `PARADISE_DAILY_LEDGER`)は `resolve()` の中で
`PARADISE_ABODE` より強く、**両側に等しく掛かる**。掛かれば移設元と移設先が同一になり、
照合は「自分と自分を比べて必ず緑」になる —— それは検めたことにならない(第37条)。
この錠が無ければ、CI で `PARADISE_KG` を立てた瞬間に migrate の門は永久に緑になる。

### 1.2 移設前 — `migrate --plan`(計画の印字。この器は書かない)

```console
$ node graph/abode.js migrate --plan
═══ 📦 ABODE MIGRATE — 計画 (印字のみ / --write は存在しない) ═══
  移設元 (global): kg=C:\Users\kikus\.claude\paradise-kg
                   daily=C:\Users\kikus\.claude\paradise-daily.json
  移設先 (repo)  : kg=C:\Users\kikus\Documents\workspace\paradise\graph\kg-store
                   daily=C:\Users\kikus\Documents\workspace\paradise\.claude\paradise-daily.json

  → 未移設          nodes.jsonl        122 行 → (先 無し)
     記憶の節点 (kg.js remember)
  → 未移設          edges.jsonl        33 行 → (先 無し)
     記憶の辺 (kg.js link)
  → 未移設          cochange.jsonl     5 行 → (先 無し)
     共変の観測 (kg.js observe)
  → 未移設          paradise-daily.json 25 行 → (先 無し)
     第43条の走行権を握る日次台帳

  4 件が未了。**この器は書かない。** 実際に動かす命令(写して走らせよ):

    mkdir -p "…\graph\kg-store" && cp "…\.claude\paradise-kg\nodes.jsonl" "…\graph\kg-store\nodes.jsonl"
    mkdir -p "…\graph\kg-store" && cp "…\.claude\paradise-kg\edges.jsonl" "…\graph\kg-store\edges.jsonl"
    mkdir -p "…\graph\kg-store" && cp "…\.claude\paradise-kg\cochange.jsonl" "…\graph\kg-store\cochange.jsonl"
    mkdir -p "…\.claude" && cp "…\.claude\paradise-daily.json" "…\.claude\paradise-daily.json"

  ⚠️ **元は消さない。** 移設は「写して検める」までであり、
     神の ~/.claude から元を引き上げるのは第6段(撤収)の仕事である。
  その後: node graph/abode.js migrate --verify
═══════════════════════════════════════
EXIT=0
```

### 1.3 移設前の `--verify` は **赤**(門が逆向きに働くことの実証)

```console
$ node graph/abode.js migrate --verify
═══ 📦 ABODE MIGRATE — 照合 (AC-9 / AC-10) ═══
  ✗ nodes.jsonl        122 行 → (先 無し)  sha256 集合の一致: false
     nodes.jsonl: 122 期待 / 移設先が無い (…\graph\kg-store\nodes.jsonl)
  ✗ edges.jsonl        33 行 → (先 無し)  sha256 集合の一致: false
     edges.jsonl: 33 期待 / 移設先が無い (…)
  ✗ cochange.jsonl     5 行 → (先 無し)  sha256 集合の一致: false
     cochange.jsonl: 5 期待 / 移設先が無い (…)
  ✗ paradise-daily.json 25 行 → (先 無し)  sha256 集合の一致: false
     paradise-daily.json: 25 期待 / 移設先が無い (…)
✗ 移設が不完全である — 「移した」という自己申告では通らない (AC-10)
═══════════════════════════════════════
EXIT=1
```

### 1.4 旗の誤りは exit 2(0 にも 1 にも混ぜない)

```console
$ node graph/abode.js migrate --write
✗ migrate の知らない旗: --write — 知る旗は --plan / --verify。**migrate は --write を持たない**:
  住所を知る器は書かない(§1.5)。実際に動かすのは kg.js / daily-guard.js の既存の口である
EXIT=2

$ node graph/abode.js migrate
✗ migrate には --plan か --verify のどちらか一方が要る —
  旗の無い migrate が何をするかは決まっていない(第16条)
EXIT=2
```

---

## 2. 移設を実行した — **写した。消していない**

計画が印字した 4 本の `cp` をそのまま走らせた(`abode.js` は一行も書いていない)。

### 2.1 移設前後の行数と sha256(全文 sha256 の先頭 16 桁)

| ファイル | 元 | 先 | 行数 | sha256(元) | sha256(先) |
|---|---|---|---|---|---|
| `nodes.jsonl` | `~/.claude/paradise-kg/` | `<repo>/graph/kg-store/` | **122 → 122** | `bb61152b42a88c10` | `bb61152b42a88c10` |
| `edges.jsonl` | 同上 | 同上 | **33 → 33** | `22f6a0e45b99af71` | `22f6a0e45b99af71` |
| `cochange.jsonl` | 同上 | 同上 | **5 → 5** | `5fbe7cac27cc3004` | `5fbe7cac27cc3004` |
| `paradise-daily.json` | `~/.claude/` | `<repo>/.claude/` | **25 → 25** | `30f7368de74b89bd` | `30f7368de74b89bd` |

### 2.2 移設元は無傷である(元を消すのは第6段の仕事)

```console
$ wc -l C:/Users/kikus/.claude/paradise-kg/*.jsonl
    5 cochange.jsonl
   33 edges.jsonl
  122 nodes.jsonl
$ ls -la C:/Users/kikus/.claude/paradise-daily.json
-rw-r--r-- 1 kikus 197609 642  9月  2 22:00 C:/Users/kikus/.claude/paradise-daily.json
```

### 2.3 移設後の `--verify` は **緑**(AC-9)

```console
$ node graph/abode.js migrate --verify
═══ 📦 ABODE MIGRATE — 照合 (AC-9 / AC-10) ═══
  ✓ nodes.jsonl        122 行 → 122 行  sha256 集合の一致: true
  ✓ edges.jsonl        33 行 → 33 行  sha256 集合の一致: true
  ✓ cochange.jsonl     5 行 → 5 行  sha256 集合の一致: true
  ✓ paradise-daily.json 25 行 → 25 行  sha256 集合の一致: true
  ✓ 行数と sha256 の集合が一致した — 記憶は移り、失われていない
═══════════════════════════════════════
EXIT=0
```

---

## 3. 反転 — **差分は 1 行である**

```console
$ git diff graph/abode.js | grep -E '^[-+]const DEFAULT_MODE'
-const DEFAULT_MODE = 'global';
+const DEFAULT_MODE = 'repo';
```

これが第4段の心臓であり、**戻すのも 1 行**である(design §8 危険2 の退路)。
`migrate` の実装・門の建て替え・`.gitignore` の裁定は**別のコミットに分けて**、
反転の差分を潔く保った(コミットの一覧は §7)。

### 3.1 AC-54 — 素の走行の全住所が `<repo>` 配下

```console
$ node graph/abode.js resolve          # env を一つも立てていない
mode=repo (source=default)
  abode           C:\Users\kikus\Documents\workspace\paradise\.claude
  settings        C:\Users\kikus\Documents\workspace\paradise\.claude\settings.json
  agents          C:\Users\kikus\Documents\workspace\paradise\.claude\agents
  commands        C:\Users\kikus\Documents\workspace\paradise\.claude\commands
  rules           C:\Users\kikus\Documents\workspace\paradise\.claude\rules
  skills          C:\Users\kikus\Documents\workspace\paradise\.claude\skills
  claudeMd        C:\Users\kikus\Documents\workspace\paradise\.claude\CLAUDE.md
  kg              C:\Users\kikus\Documents\workspace\paradise\graph\kg-store
  dailyLedger     C:\Users\kikus\Documents\workspace\paradise\.claude\paradise-daily.json
  creationsAbode  C:\Users\kikus\Documents\workspace\paradise-creations\.claude
  home            C:\Users\kikus
  exists: abode=true settings=true agents=true kg=true
EXIT=0
```

**`kg=true` になった** —— 着手前は `false` だった(§0.1)。移設が効いている。
`home` だけは外を指す。これは**診断専用の値であり住所ではない**(§1.2 の署名がそう宣言している)。

### 3.2 work-4 の完了条件その2 — `kg.js stats`

```console
$ node graph/kg.js stats
{
  "root": "C:\\Users\\kikus\\Documents\\workspace\\paradise\\graph\\kg-store",
  "nodes": 122,
  "edges": 33,
  "byType": { "system":4, "component":11, "decision":8, "run":3,
              "creation":7, "verdict":1, "lesson":87, "reform":1 }
}
EXIT=0
```

設計書 §7.2 は「nodes 120」と書くが、それは**執筆時の実測値**である。
現在の実測は 122 であり、**行数と sha256 集合の一致**(§2.1)で裁いた。
固定値で裁く門は、その値を書いた日から嘘になる(第22条の同型)。

### 3.3 AC-11 — 裸ホームでも記憶は生きている

```console
$ HOME=<sentinel> USERPROFILE=<sentinel> node graph/kg.js stats
{ "root": "C:\\Users\\kikus\\Documents\\workspace\\paradise\\graph\\kg-store",
  "nodes": 122, "edges": 33,
  "byType": { "system":4,"component":11,"decision":8,"run":3,
              "creation":7,"verdict":1,"lesson":87,"reform":1 } }
EXIT=0
```

改革前は同じ入力で `<sentinel>\.claude\paradise-kg` を見て 0 件になっていた。
**住処がリポジトリ内に移ったので、ホームを丸ごと失っても記憶は残る。**

### 3.4 AC-12 — 裸ホームでも日次台帳の住所が `<repo>` で始まる

```console
$ HOME=<sentinel> USERPROFILE=<sentinel> node graph/daily-guard.js status
PARADISE DAILY QUOTA
  ledger      : C:\Users\kikus\Documents\workspace\paradise\.claude\paradise-daily.json
  last run    : 2026-09-01 @ 2026-09-01 22:08 JST
  recent      :
    2026-09-01 22:08 JST  PR #27 第45条・発令者リースの死角を塞ぐ
    2026-08-31 07:24 JST  PR #4 自己審査のスコープ盲点を修復・憲法第14条
EXIT=0

$ ls -la <sentinel>
ls: cannot access '<sentinel>': No such file or directory
```

**履歴が移設先で読めている** —— 台帳が空から始まったのではなく、記録が付いて来た。
かつ `sentinel` ディレクトリは**作られていない**(`resolve` は住所を答えるだけで書かない)。

---

## 4. 故障注入(AC-7)— 反転した先でも門は**噛む**

design §8 危険2 が要求する証拠である。改革前は住処を丸ごと失っても 23 門が緑だった。
**反転した今、配備物の 1 バイトが門に届くか**を実地で撃った。

```console
$ node graph/deploy.js check                      # 注入前(素の走行 = mode repo)
═══════ 🏛  DEPLOYMENT CHECK ═══════
mode: repo   target: C:\Users\kikus\Documents\workspace\paradise\.claude
checked: 60  transforms (diff expected): agents
  ✓ every deployed file matches its declared source
════════════════════════════════════
EXIT=0

$ printf 'X' >> .claude/agents/cardinal.md        # ← 1 バイト足す
$ node graph/deploy.js check
═══════ 🏛  DEPLOYMENT CHECK ═══════
mode: repo   target: C:\Users\kikus\Documents\workspace\paradise\.claude
checked: 60  transforms (diff expected): agents
  🔴 agents/cardinal.md — 変換の管轄外(frontmatter の model/effort/tools 以外)で
     配備物が出所と食い違う — 手で触られた疑い (overlay(own))
════════════════════════════════════
EXIT=1                                            ← **赤くなった。名指しした。**

$ git checkout -- .claude/                        # ← 直した
$ git status --short .claude/
                                                  ← 何も出ない = 汚れは残っていない
$ node graph/deploy.js check
  ✓ every deployed file matches its declared source
EXIT=0
```

**直したことを実測で示した**(`git status --short .claude/` が空)。
故障注入の `finally` が落ちて汚染が残る事故は design §8 危険3 が警告している形である。

---

## 5. 建てた門

### 5.1 `tests/abode.test.js` — 53 → **66 passed, 0 failed**

新設した 13 門(全て両向き):

| 門 | 何を撃つか |
|---|---|
| 反転の差分は 1 行である (AC-52) | ソースを走査し `const DEFAULT_MODE =` の行が**ちょうど 1 本**であることを数える。2 本在れば反転は 1 行でなくなり、二箇所が食い違えば住所は静かに割れる |
| 第4段の既定は repo (AC-54) | 定数**と** `resolve()` の両方を見る。定数だけ見る門は、実装が定数を無視しても緑 |
| 反転は実測でも効いている (AC-54) | **子プロセスで `PARADISE_*` を全て剥いで** `resolve --json` を撃ち、9 つの住所が全て `<repo>` 配下であることを検める。親の env を継いだ検めは「素の走行」の検めではない |
| 外を向かせるのは global の明示だけ (AC-54 逆) | `PARADISE_ABODE=global` で `source:'env'` かつ楽園の外を向くこと |
| 未実装の retreat は exit 2 | migrate は実装されたが retreat は第6段の仕事 —— **今なお exit 2 が正しい** |
| 移設が完全なら緑 (AC-9 正) | 偽の移設元/先を建てて `migrateVerify({from,to})` |
| 【逆】末尾 1 行を削ると赤 (AC-10) | **実際に削る。**`5 期待 / 4 実測` と**数を名指す**ことまで検める |
| 【逆】移設先が丸ごと無ければ赤 (AC-10) | 「移した」の自己申告では通らない |
| 【逆】行数が同じでも中身が違えば赤 (AC-9) | 行数だけ合わせた偽物を作って撃つ。**数の一致は偶然でありうる** |
| 移設元が無いのは exit 2 | `sha === null`(真偽を付けない)/ `unmeasurable` に名が載ること |
| 【脱法】移設元と先が同じ住所なら exit 2 | 自己比較は永久に緑 —— それは検めたことにならない |
| migrate は `--write` を持たない (§1.5) | CLI が exit 2 で拒むことと、**ソースに書く口が無いこと**の両方を実測 |
| 現物の移設は済んでいる (完了条件) | 現物を撃つ。移設元が無い機(CI)では exit 2 が正しいので **exit 1 だけを赤**とし、0 のときは中身まで、2 のときは理由の名乗りまで検める |

すべて**複製に対して**仕掛けた(現物の KG には一行も触っていない)。
既存の密閉性の門 2 本(`版管理下のファイルへ一行も書かない` / `作業木は汚れない`)が緑のままである。

### 5.2 AC-52 の門の扱い(消したのではなく**向きを変えた**)

第0段の `この段の既定は global である (AC-52)` は、そのままでは反転後に永久に赤い。
**だが門を消していない。** AC-52 が守っていたのは「段階が一箇所にだけ住むこと」であり、
第0段ではそれが「反転してはならない」、第4段では「反転は 1 行で表されねばならない」
という形をとる —— **同じ要件の両面**である。ゆえに門を
`反転の差分は 1 行である — 段階は定数一つが表す (AC-52 / design §1.3)` へ建て替え、
**ソースを走査して代入行を数える**という、より強い形にした(第36条: 門は消すのではなく分ける)。

---

## 6. `.gitignore` の裁定 — 日次台帳は**追跡しない**

移設で `<repo>/.claude/paradise-daily.json` が現れた。第2段は `.claude/` を
**敢えて無視しない**(追跡する)と裁定している。だが台帳はその例外である:

```gitignore
.claude/paradise-daily.json
.claude/paradise-daily.json.lock
```

**理由**(`.gitignore` の註釈に残した): 台帳は第43条の走行権を記録する**走行状態**であって
原本ではない。走るたびに `lastDate` / `lease` が書き換わり、並行 PR では必ず衝突し、
手で解決する術が無い —— `graph/kg-store/` を追跡しない理由(第2段の註釈)と**全く同型**である。
派生物(`.claude/settings.json`)を追跡する理由 ——「clone 直後から無ければ門が skip に落ちる」
—— は台帳に当てはまらない。台帳が無ければ `daily-guard` は空の台帳から始める
(`readLedger()` の既定)。それは欠損ではなく初期状態である。

`graph/kg-store/` の行は**第2段の裁定どおりそのまま残した**(変更なし)。

---

## 7. 憲法 — **条を足さない。理由を記す**

第58条(住処)が既にこの段の射程を全て覆っている:

- **(a) 住所を作る場所は一つ** —— 反転は `abode.js` の定数 1 本を変えるだけで済み、
  他の engine を一行も触っていない。**これは第58条(a) が既に成立していることの証明である。**
  もし住所が散らばっていれば、反転は 14 ファイルの書き換えになっていた。
- **(e) 住処の不在を skip と呼んでよいのは外を向いていると名乗ったときだけ** ——
  反転で既定が `repo` になり、この条文が**初めて既定経路で効く**ようになった。
  条文を足したのではなく、既に在る条文が**本番に入った**のである。
- 移設の「消さずに移す」は R-3 の要件であり、第19条(b)(配備物は建て直せる産物、
  記憶はそうでない)が既に根拠を与えている。`abode.js` が KG を
  `<repo>/graph/kg-store`(配備の木の**外**)に置くのはこの条の帰結である。

**よって条を足さない。** `node graph/codex.js check` は 59 条のまま緑である。

---

## 8. 全走行(3 通り)

| 走行 | 最終行 | exit |
|---|---|---|
| **素**(env 無し / 新しい既定 = repo) | `Paradise self-test: 471 passed, 0 failed` | 0 |
| `PARADISE_ABODE=repo` | `Paradise self-test: 471 passed, 0 failed` | 0 |
| `PARADISE_ABODE=global` | `Paradise self-test: 471 passed, 0 failed` | 0 |

反転**前**のベースラインも `471 passed, 0 failed`(§0.5)である。
**三通りとも緑。AC-53(両居)と AC-54(反転)が同時に立っている。**

**門の数が変わっていないことへの註釈**: `tests/abode.test.js` は
`tests/paradise.test.js` の中では走らない(CI が別の段で撃つ — `tribunal.yml:152`)。
ゆえに新設した 13 門は 471 には現れず、`node tests/abode.test.js` の
`66 passed, 0 failed` に現れる。**これは意図された構成であり、この段で変えていない。**

### 8.1 `PARADISE_ABODE=global` の走行 — **緑で着地した**

```console
$ PARADISE_ABODE=global node tests/paradise.test.js
Paradise self-test: 471 passed, 0 failed
EXIT=0
```

反転の**逆向き**が生きている: `PARADISE_ABODE=global` は `DEFAULT_MODE` を読まない
(`source:'env'` で先に決まる)ので、反転は `global` 経路に一切影響しない。
**それを推論ではなく実測で示した。**

### 8.2 個別の門(反転**前**に採った — 反転後は未採取のものが在る)

```console
$ node graph/wiring.js check      → EXIT=0   engine 38 / 内の辺 72
$ node graph/codex.js check       → EXIT=0   索引は本文と一致している (59 条)
$ node graph/workspace.js check   → EXIT=0
$ node graph/hermetic.js check    → EXIT=0
$ node graph/conclave.js audit    → EXIT=0   見捨てられた走行: 0 / 判定不能: 0 / 全 11
$ node graph/abode.js check       → EXIT=0
$ node graph/derived.js check     → EXIT=0   (反転後に採取。.claude/settings.json は生成元の写し)
```

`node graph/census.js check` は**内部で自己診断を回すため 5〜10 分掛かり**、
切り上げの時点で採取できていない(第22条の門であり、門を足したら必ず走らせねばならない)。
**未採取である。** §10 に申し送る。

---

## 9. やり残したこと・正直な申告

1. **`node graph/census.js check` が未走行。** 門を 13 本足した(`tests/abode.test.js`)。
   census は自己診断の数を測って README へ書き戻す器であり、
   `tests/abode.test.js` の数を数えているなら README の数が古くなる。
   **これは CI を赤くしうる最有力候補である。** `census.js fix` が要るかもしれない。
   ただし 471 は変わっていないので、census が `paradise.test.js` の総数だけを見ているなら
   影響は無い。**どちらかを実測していない。**
3. **反転後の `wiring` / `codex` / `workspace` / `hermetic` / `conclave audit` を
   採り直していない。** §8.2 の値は反転**前**のものである
   (`derived.js check` だけは反転後に採った)。住所に依らない門が大半だが、
   `hermetic` は倉を走査するので `graph/kg-store/` が現れたことの影響を見ていない。
4. **`graph/kg-store/` が `.gitignore` されたまま現れた。** 第2段の裁定どおりだが、
   **CI(clone 直後)には KG が無い**。ゆえに CI では:
   - `migrate --verify` → 移設元も移設先も無い → **exit 2**(§5.1 の門はこれを許す形に書いた)
   - `pulse.snapshot()` の `kgNodes` → `null` + `errors` に ENOENT
   前者は門に織り込んだが、**後者を CI で実測していない**。`dashboard-count.test.js` は
   「不在なら null」を許す形(`:108`)なので通るはずだが、**これも推論である。**
5. **`counts.skills` が反転で `null` になる**(§0.4)。design §3.3 の裁定どおり
   削除していないが、**ダッシュボードの画面でこれがどう見えるかを目視していない。**
6. **`.claude/paradise-daily.json` を `.gitignore` に足した判断は、設計書に明文が無い。**
   `graph/kg-store/` の裁定(第2段)から**類推**して同型と判断した。
   神または教主が「台帳も追跡すべき」と裁くなら、この 2 行を消せばよい。
7. **第6段への申し送り**: 神の `~/.claude/paradise-kg/` と `~/.claude/paradise-daily.json` は
   **意図的に残してある**。撤収(元を引き上げること)は第6段の仕事である。
   `nodes.jsonl.bak.lexicon`(退避)も触っていない。

---

## 10. 次の走者が最初に撃つべき命令(この順で)

```bash
cd C:/Users/kikus/Documents/workspace/paradise

# 1) 門を 13 本足したので census を走らせる (第22条)
#    ⚠️ 内部で自己診断を回すため 5〜10 分掛かる。background で走らせ、ログを tail で読め。
node graph/census.js check                           # 赤なら node graph/census.js fix

# 2) 反転後の個別の門を採り直す (§8.2 の値は反転前のものである)
node graph/wiring.js check
node graph/codex.js check
node graph/workspace.js check
node graph/hermetic.js check
node graph/conclave.js audit
node graph/abode.js check

# 4) 移設と反転が生きていることの再確認 (1 秒で済む)
node graph/abode.js resolve                          # 全住所が <repo> 配下 / kg=true
node graph/abode.js migrate --verify                 # 4 行とも sha256 集合の一致: true
node graph/kg.js stats                               # nodes 122 / edges 33

# 5) 赤が出たら — **緩めるな。ログを読め。** 退路は 1 行である:
#    graph/abode.js の DEFAULT_MODE を 'global' へ戻す、または
export PARADISE_ABODE=global                         # engine を触らない緊急退避
```

---
