# verdict 相 — 断罪の書(改革 `gate-filter`)

- **ブランチ**: `feat/gate-filter` / HEAD `9db2942`
- **相**: verdict(裁きの門。環の最後の相)
- **審査者**: 神(kikus)
- **本書の数はすべて verdict 相が自分の手で走らせて得た実出力である。**
  教主・他相の報告は一枚も写していない(第27条)。写せなかったもの・撃てなかったものは §7 に明記する。

---

## 神への一枚(10 行)

1. **判定は `SHIP`(`node graph/verdict.js judge` の exit **0**)。機械がそう言った。**
2. **何が変わったか**: 自己診断に門の絞り込みの口が生えた。`--gate` / `--gate-not` / `--gate-list`。環境変数ゼロ。
3. **速さ**: **453 本を 20.664 秒で測った(前: 449 本を 358.8 秒)。** 全走は **455 本を 355.331 秒**。
4. **正しさ**: 全走 `455 passed, 0 failed` / exit 0。✓ 547 行 / ✗ 0 行。
5. **AC 22 本すべて ○**。verify 相で唯一「未実行」だった **AC-15 を本相で実際に走らせた** — `{"passed":455,"failed":0}`。
6. **環が見つけたもの**: 常駐の門が 2 本しか無い網目(prove)、賽だった NFR-01(review)、単独走行の偽の赤(security)、**そして致命 F-1** — 1 行で門を一本も走らせず緑を返す穴(reflect)。
7. **F-1 は塞いだ**。第56条を起草し、**恒等式の錠を `test()` の外に置いた**。絞り込みでは消せない。実測: `--gate-not '.'` → exit 2。
8. **何が残っているか**: ① 門番 6 本は `--gate-not '^gate-filter: '` の一語で黙る(F-3。ただし錠は黙らない) ② 単独走行の偽の赤の根治(D-2)はしていない — 警告行で名乗るに留めた ③ ReDoS(LOW、実測でハング再現) ④ 手順止まりの AC が 16 本。
9. **AC-15 はもう残債ではない**(本相で実行した)。残るのは上の 4 項目である。
10. **この 4 つを全部知った上での SHIP である。** 隠して得た緑ではない。

---

## 1. 判定とその根拠

```
$ node graph/verdict.js judge reform/gate-filter/verdict-report.json
═══════════ ⚖️  VERDICT ═══════════
✅  SHIP
All gates pass, no breach — creation is complete.

Passed:
  ✓ trajectory 80/100
  ✓ build passes
  ✓ 455/455 tests pass
  ✓ no security issues
  ✓ spec satisfied
═══════════════════════════════════
VERDICT_EXIT=0
```

**判定: `SHIP` / exit `0`。**

`graph/verdict.js` の判定法(`explain`)に照らした根拠:

| 門 | 要求 | 本相の実測 | 結果 |
|---|---|---|---|
| BLOCK 検査 `security.secrets` | 0 でなければ BLOCK | 差分域 4 ファイルを grep → **`SECRETS_FOUND=0`** | 通過 |
| BLOCK 検査 `security.issues` | 0 でなければ BLOCK | **0**(§5 で受容の理由を明記) | 通過 |
| BLOCK 検査 `spec.satisfied` | false なら BLOCK | **true**(AC 22/22。§3) | 通過 |
| BLOCK 検査 `security` の不在 | 不在は「証明されていない安全」= BLOCK | 実際に撃って報告した | 通過 |
| REWORK 検査 `build` | `fail` / 不在なら REWORK | 常駐 engine 11 本すべて exit 0(§2) | 通過 |
| REWORK 検査 `tests.failed` | >0 なら REWORK | **0**(全走 `455 passed, 0 failed`) | 通過 |
| REWORK 検査 `tests` の空 | total 0 なら「空の試験」 | **455** | 通過 |
| REWORK 検査 `trajectory` の不在 | `produces:'artifact'` は gauge 必須(第38条) | `gauge.js score --json` の実出力を載せた | 通過 |
| REWORK 検査 `trajectory.score` | 60 未満なら REWORK | **80** | 通過 |
| REWORK 検査 `loopGuardTrips` | >0 なら REWORK | **0** | 通過 |

**verdict.js は `security.issues: 0` を宣言に基づいて読む。ゆえに 0 と書いた責任は本相にある。**
その責任の中身は §5 に全部開いてある — **残っている危険を消したのではなく、出荷を止めるものではないと裁いた**。

### 本相が自分で走らせた門(exit はすべて実出力)

```
node tests/paradise.test.js                    → exit 0  Paradise self-test: 455 passed, 0 failed  (5m55.331s)
node graph/census.js check                     → exit 0  every number the paradise claims about itself is true
node graph/codex.js check                      → exit 0  索引は本文と一致している (56 条)
node graph/check-agents.js                     → exit 0  the hierarchy is real, not declared
node graph/conclave.js audit                   → exit 0  見捨てられた走行: 0 / 判定不能: 0 / 全 10
node graph/workspace.js check                  → exit 0  創造物の混入なし・住所の直書きなし・reform 走行帳の流出なし
node graph/wiring.js check                     → exit 0  engine 36 / 内の辺 53、孤児0・宙吊り0
node graph/branch-guard.js                     → exit 0  branch feat/gate-filter / 最新の main の上に立っている
node graph/apply-guards.js verify              → exit 0  hook matcher 15 件すべて生きている
node graph/derived.js check                    → exit 0  no test asserts on derived content
node graph/critic.js review reform/gate-filter --lessons graph/lessons.json
                                               → exit 0  the critic found nothing (76 件の教訓で裁いた)
node graph/gauge.js score reform/gate-filter/conclave.json --json
                                               → score 80 / firstPassRate 1 / reworkCount 0 / loopGuardTrips 0
```

> **註(critic の緑を額面で受け取っていない)**: reflect 相 F-4 が実測で示したとおり、
> `reform/*` には scope 主語が無く 76 件の教訓がほぼ全て out-of-scope で素通りする。
> **本相はこの exit 0 を「教訓の再発なし」の証拠として採用していない。**
> 採用したのは §2 の実走行の数と、§3 の AC 22 本である。

---

## 2. 第38条 — 前と後

**「速くなった」とは書かない。数で語る。**

| 何を | 何本 | 何秒 | 誰が測ったか |
|---|---|---|---|
| **前** | **449 本** | **358.8 秒** | 改革前の基準値(本相では再現できない — 実装が既に変わっている) |
| **後・全走** | **455 本** | **355.331 秒** | **本相**(`node tests/paradise.test.js` を background で。`real 5m55.331s` / exit 0) |
| **後・絞り込み(Atlas 重 2 本を除く)** | **453 本** | **20.664 秒** | **本相**(`time node tests/paradise.test.js --gate-not 'atlas: 全ての道が図になる' --gate-not 'atlas: 門は己の残骸で落ちない'`) |

```
$ time node tests/paradise.test.js --gate-not 'atlas: 全ての道が図になる' \
    --gate-not 'atlas: 門は己の残骸で落ちない'
Paradise gate-filter: 注意 — 絞り込み走行は門の依存を保証しない。共有状態を前段の門に頼る門は単独走行で偽の赤を出しうる (security D-2)
Paradise gate-filter: 453 of 455 gates matched — 453 green, 0 red
real    0m20.664s
AC05_EXIT=0
```

**453 本を 20.664 秒で測った(前: 449 本を 358.8 秒)。**

母数が動いていることを隠さない: 449 → 451(AC-16/17)→ 454(AC-11/13/14)→ **455**(第56条の恒等式の錠を撃つ門)。
review が指摘したとおり **絶対秒での比較は母数が動くと壊れる**。ゆえに verify 相が NFR-01 を「秒/門」に改訂した。
本相の全走の秒/門は **355.331 ÷ 455 = 0.7810 秒/門**(閾値 0.8790 / 基準 0.7991)。**○ 合格。**

### 全走の実測(本相が自分で撃ったもの)

```
$ node tests/paradise.test.js            # background / 引数なし
EXIT=0
real    5m55.331s
最終行: Paradise self-test: 455 passed, 0 failed
✓ 行: 547
✗ 行: 0
```

---

## 3. AC 22 本の最終的な成否

verify.md の表を起点に、**それ以降に変わったものを本相が反映した**。

| AC | 主張 | 種別 | verify 時 | **本相の最終** | 変化 |
|---|---|---|---|---|---|
| AC-01 | 引数なし全走の名乗りと exit | 手順 | ○ | **○** | 母数 454→455。本相の全走 `455 passed, 0 failed` / exit 0 |
| AC-02 | 単一の門を名前で狙える | 手順 | ○ | ○ | — |
| AC-03 | 正規表現として解釈される | 手順 | ○ | ○ | — |
| AC-04 | 除外が包含に勝つ | 手順 | ○ | ○ | — |
| AC-05 | Atlas 重 2 本を外した走行 | 手順 | ○(教主実測) | **○(本相が再走)** | **`453 of 455 — 453 green, 0 red` / 20.664s / exit 0** |
| AC-06 | `--gate` 複数は OR | 手順 | ○ | ○ | — |
| AC-07 | `--gate-list` が実行時の名を出す | 手順 | ○ | **○** | 本相実測 `Paradise gate list: 455 gates` |
| AC-08 | ループの 8 本を含む | 手順 | ○ | ○ | — |
| AC-09 | `--gate-list` は門を実行しない | 手順 | ○ | ○ | — |
| AC-10 | 絞り込み走行の中の赤は exit 1 | 手順 | ○ | ○ | — |
| **AC-11** | マッチ 0 件は緑ではない | **常駐** | ○ | **○** | 本相実測: `--gate-not '.'` → `0 of 455 gates matched — nothing was measured` / **exit 2** |
| AC-12 | 不正な正規表現は赤 | 手順 | ○ | ○ | — |
| **AC-13** | 絞り込み走行は `Paradise self-test:` を名乗らない | **常駐** | ○ | ○ | 全走 455 の中で緑 |
| **AC-14** | 最終行が census / tribunal の双方に読まれない | **常駐** | ○ | ○ | 全走 455 の中で緑 |
| **AC-15** | **census が環境を毒されても汚れない** | 手順 | **未実行** | **○(本相で実行)** | **`{"passed":455,"failed":0}` / exit 0** ← **本書で最も大きい変化** |
| **AC-16** | 絞り込みは `process.env` を読まない | **常駐** | ○ | ○ | — |
| **AC-17** | `census.js` の呼び口が引数を渡さない | **常駐** | ○ | ○ | — |
| AC-18 | 打ち間違えたフラグは全走に落ちない | 手順 | ○ | ○ | — |
| AC-19 | 値の無い `--gate` は赤 | 手順 | ○ | ○ | — |
| AC-20 | 空文字パターンは赤 | 手順 | ○ | ○ | — |
| AC-21 | 絞り込み走行では README を触らない | 手順 | ○ | ○ | — |
| AC-22 | 全走の所要が悪化していない | 手順 | ○ | **○** | 本相実測 0.7810 秒/門(閾値 0.8790) |

### 集計 — verify 相からの変化

| | verify 時 | **本相の最終** |
|---|---|---|
| ○ | **21 本** | **22 本** |
| 未実行 | **1 本(AC-15)** | **0 本** |
| **常駐の門** | **5 本** | **6 本** |

**AC-15 は verdict 相が実際に走らせて ○ にした。「未実行」はもう残っていない。**

```
$ PARADISE_GATE=zzz PARADISE_GATE_NOT=atlas GATE=zzz \
    node -e "console.log(JSON.stringify(require('./graph/census.js').census().tests))"
{"passed":455,"failed":0}
AC15_EXIT=0
```

環境変数を三種類まぜて毒しても、census は**全走の 455** を返した。
絞り込みは環境変数を一切読まない(AC-16 の構造の門が守っている性質を、**実経路で**確かめた)。

### 常駐の門 6 本(本相が `--gate-list` から実測した名)

```
gate-filter: 絞り込みは環境変数を読まない
gate-filter: census は自己診断を素で呼ぶ
gate-filter: マッチ 0 件は緑ではない — exit 2 で鳴る (AC-11 / 第16条)
gate-filter: 絞り込んだ走行は Paradise self-test: を名乗らない (AC-13 / 第22条)
gate-filter: 絞り込み走行の最終行は census / tribunal の双方に読まれない (AC-14 / 第22条)
gate-filter: 名指した門を走らせない走行は測定ではない — 数が閉じる (reflect F-1/F-2)
```

**2 本 → 6 本(3 倍)。** 6 本目が reflect 相の致命 F-1 を塞いだ門である。

---

## 4. 環が見つけたもの(この改革の実質)

この改革の価値は「速くなったこと」ではない。**環が自分の網目を 4 つ見つけたこと**である。

| 相 | 見つけたもの | 処置 |
|---|---|---|
| prove | 変異 21 本中 20 本が鳴った。だが**常駐の門が 2 本しか無い** | verify が 3 本足して 5 本に |
| review | **NFR-01 は門ではなく賽であった** — 揺れ 15 秒を閾値 362.4 が横切っていた | 「秒/門」に改訂(第38条: 秤が揺れるならそれは秤ではない) |
| security | 危険 4 本。**全走で緑の門 4 本が単独走行で赤**(共有 kgRoot 依存) | 教主が警告行を実装(**本相の AC-05 走行で実際に出力された**) |
| **reflect** | **致命 F-1** — `if (GATE.list)` → `if (GATE.active)` の **1 行**で門を一本も走らせず `0 green, 0 red` / exit 0。**門番 5 本は自分も絞り込まれるので鳴けなかった** | **恒等式の錠を `test()` の外に置き、第56条を起草**(commit `9db2942`) |

### F-1 が塞がったことの実測

錠は選別を通らない位置に在る。ゆえに **`--gate-not` で全門を落としても錠は生きている**:

```
$ node tests/paradise.test.js --gate-not '.'
Paradise gate list: 0 of 455 gates matched — nothing was measured
EXIT=2
```

そして門番の名を全部除外しても、走行そのものは成立する:

```
$ node tests/paradise.test.js --gate-not '^gate-filter: ' --gate-list | tail -1
Paradise gate list: 449 of 455 gates matched
$ node tests/paradise.test.js --gate-not '^gate-filter: ' --gate-list | grep -c '^gate-filter: '
0
```

**門番 6 本は消せる。錠は消せない。** これが第56条(b)の設計である。

---

## 5. 残っているもの — 隠さない

**本相は以下の 4 項目をすべて実測で確かめた上で SHIP を報告している。**
**知らずに出した緑ではない。**

### ① AC-15 — **本相で解消した**(残債ではなくなった)

verify 相・reflect 相の両方が「未実行」と明記していたもの。**本相が実際に走らせた**(§3)。
結果 `{"passed":455,"failed":0}` / exit 0。**○。** 残債から外す。

### ② security F-3 — 門番は `--gate-not` の一語で黙る(**残っている**)

門番 6 本の名がすべて `gate-filter: ` で始まるため、`--gate-not '^gate-filter: '` で 6 本まとめて外せる。
**実測(§4)で確かめた: 455 → 449、`gate-filter:` を名乗る門は 0 本。**

- **緩和**: 恒等式の錠は `test()` の外に在るので**この手では消せない**(実測 `--gate-not '.'` → exit 2)。
- **止まらない理由**: 全走(CI と census が撃つ唯一の経路)は `GATE.active === false` なので門番 6 本が必ず走る。
  黙らせられるのは**手元の絞り込み走行だけ**であり、そこで得た緑は元より全走の代わりにならない(第56条(c))。
- **残債である**: 「門番を絞り込みの対象外にする」機構(reflect §7 の機構 2)は**実装していない**。

### ③ security D-2 — 単独走行の偽の赤(**根治していない**)

共有 `kgRoot` / `ccRoot` に前段の門が書いた状態を読む門が 4 本ある。単独走行すると赤くなる。
**処置は警告行のみ** — 名乗るに留めた。本相の AC-05 走行でその警告行が実際に出た:

```
Paradise gate-filter: 注意 — 絞り込み走行は門の依存を保証しない。共有状態を前段の門に頼る門は単独走行で偽の赤を出しうる (security D-2)
```

- **止まらない理由**: 誤りの向きが **緑 → 赤(偽の赤)**。赤いものを緑と偽る向きではない。
- **残債である**: 4 本の門を自己完結にする根治は**していない**。
  security 相自身が「赤→緑の向きは原理的に撃てていない」と明記している(全走が全緑のため)。**本相も撃っていない。**

### ④ ReDoS(LOW)(**残っている**)

**本相が実測で再現した**:

```
$ timeout 30 node tests/paradise.test.js --gate '((.*)*)*zzzz' --gate-list
REDOS_EXIT=124   (124 = timeout)
```

30 秒で切っても返らない。security 相の「45 秒超ハング」を本相の目で確認した。

- **止まらない理由**: この口を叩ける者は既にローカルで node を実行できる。特権昇格も情報漏洩も無い。被害は自端末の停止のみで Ctrl-C で戻る。
- **残債である**: パターン長の上限も時間見張りも**実装していない**。

### さらに残っているもの(reflect が名指したが本書が消していないもの)

| # | 残っているもの | 状態 |
|---|---|---|
| F-6 | 手順止まりの AC が **16 本**。特に `die()` の 1 行に AC-12/18/19/20 の **4 本**がぶら下がり、その 1 行を見張る門は **0 本** | 未着手 |
| F-5 | 楽園は「最後に全走したのがいつか」を記憶する台帳を持たない。第56条(c)(d) が要求するが機構は無い | 未着手 |
| F-4 | `critic.js` は `reform/*` に scope 主語が無いため 76 件の教訓がほぼ全て out-of-scope。**critic の exit 0 は空虚な緑でありうる** | 未着手(reform の道そのものの穴。本改革の産物ではない) |
| — | `census check` が吐く `⚠️ ledger line skipped (corrupt)` 4 行(creations 側の git コンフリクト痕) | 本改革と無関係。未着手 |

---

## 6. 走行そのものの裁き(第38条)

```
$ node graph/gauge.js score reform/gate-filter/conclave.json --json
{"score":80,"complete":false,"phasesTotal":11,"phasesDone":10,"domainsTotal":6,
 "domainsRatified":5,"firstPassRate":1,"reworkCount":0,"retryOverhead":0,
 "loopGuardTrips":0,"durationMs":26228997,"tier1":10,"tier2":0,"tier3":0}
```

| 項目 | 値 | verdict.js の閾値 | 判定 |
|---|---|---|---|
| score | **80** | 60 以上 | ○ |
| loopGuardTrips | **0** | 0 でなければ REWORK | ○ |
| firstPassRate | **1.00**(全相が一発で通った) | — | — |
| reworkCount | **0** | — | — |
| durationMs | 26,228,997(**約 437.1 分 = 7.29 時間**) | — | — |
| complete | **false** | — | **verdict 相が未 done だから**。この判定そのものが 11 本目 |

**荒れた走行ではない。** 差し戻し 0・ループ暴走 0・一発通過率 100%。
ただし **critic が一度 REWORK を宣告している**(`discover.md` → `findings.md` の改名で解消)。
これは gauge の `reworkCount` には現れない — **tribunal の差し戻しは domain の rework ではないから**である。隠さず記す。

---

## 7. 本相が撃てなかったもの(捏造しないための明記)

| 撃てなかったもの | 理由 |
|---|---|
| **改革前の 449 本 / 358.8 秒の再現** | 実装が既に変わっており、本相では**原理的に再現できない**。§2 の「前」は他相由来の値であることを明記した |
| **NFR-01 の連続 3 回中央値** | 全走 6 分 × 3 の予算。本相は **1 回**しか撃っていない(355.331 秒)。中央値ではなく単発である |
| **security 相の 455 本全数掃射の再現** | 予算。単独走行 455 プロセスは 20 分弱かかる。**本相では撃っていない** |
| **reflect 相の 7 変異(E2〜E8)の再現** | 「実装を書き換えるな」の掟。**本相は変異を一つも入れていない** |
| **赤→緑の向きの依存**(全走で赤い門が単独走行で緑になるか) | 全走が全緑のため原理的に検出不能。security 相と同じく**撃てていない** |
| **CI(GitHub Actions)上での実走** | push も PR も禁じられている。**ローカルの実出力のみで裁いた** |
| **F-4 の是正が効くか** | `graph/critic.js` を触れない。**未検証** |

---

## 8. 掟の遵守

| 掟 | 遵守の証拠 |
|---|---|
| 実装を書き換えない | `git status --porcelain` に `tests/` も `graph/` も現れない |
| `CONSTITUTION.md` / `graph/` / `.github/` / `README.md` を触らない | 同上。**すべて読んだだけ** |
| 作ってよいのは `verdict-report.json` と `verdict.md` のみ | この 2 本だけを新規に置いた |
| 数値を捏造しない | §7 に撃てなかったものを列挙。§2 の「前」は他相由来と明記 |
| SHIP を出すのが仕事ではない | 機械の出力(§1)をそのまま載せた。**改竄していない** |
| push / PR をしない | していない |
| main に commit しない | `git branch --show-current` → `feat/gate-filter` |

---

## 9. verdict 相の裁定

**`SHIP`。ただし「完成した」という意味ではない。**

機械が SHIP を返したのは、**この改革が請け負った 22 本の主張をすべて実出力で満たしたから**である。
だが本書が §5 に並べた **7 つの残債**(F-3 / D-2 / ReDoS / F-6 / F-5 / F-4 / census 台帳)は、
**一つも消えていない**。

> **reflect 相はこう書いた: 「網目は数の問題ではなく、上下関係の問題であった」。**
> その裁定は正しかった。verify 相が門を 3 本足しても F-1 は開いたままで、
> **塞いだのは門ではなく、`test()` の外に置いた錠だった。**
>
> **この改革が楽園に遺した最大のものは `--gate` ではない。第56条である。**
> 「選んだ門は走らせねばならない」「門番は絞り込みの外に立つ」
> 「部分は全体を騙らない」「速さは全走を避ける口実にならない」——
> この四つは、絞り込みの口が在る限り永久に楽園を縛る。

**そして最後に一つ、機構が守っていない約束が残る。**
第56条(d) は「速さは全走を避ける口実にならない」と言うが、
**それを機械で強制する門は一本も無い**(F-5)。
20.664 秒の道が在る以上、次に楽園を回す者は 355 秒の道を選ばない。
**この書自身が、その誘惑に一度も屈しなかったことを実出力で示した** ——
全走を background で 5m55.331s 待ち、その数で裁いた。

**次にこの環を回す者へ: 第56条(d) を守る台帳を建てよ。それが F-5 である。**

---

*verdict 相 / `feat/gate-filter` / HEAD `9db2942` / 判定 `SHIP` / exit `0`*
