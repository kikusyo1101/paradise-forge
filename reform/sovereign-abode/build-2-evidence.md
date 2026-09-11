# 第2段(work-2)「両居」— 実出力の証跡

ブランチ `reform/sovereign-abode-2` / Windows(git-bash)+ WSL(Ubuntu, node v22.11.0)。
**既定 `DEFAULT_MODE` は `global` のまま**(反転は第4段)。

---

## 1. 神の資産は無傷である

```console
$ ls -la ~/.claude/settings.json
-rw-r--r-- 1 kikus 197609 7954  9月  9 22:59 /c/Users/kikus/.claude/settings.json
$ ls ~/.claude/agents/*.md | wc -l
30
$ node graph/deploy.js check          # 素の走行 = mode:global
mode: global   target: C:\Users\kikus\.claude
checked: 60  ✓ every deployed file matches its declared source
exit=0
```

mtime は **2026-09-09 22:59 のまま**。`~/.claude` へは 1 バイトも書いていない。

---

## 2. AC-5 — `PARADISE_ABODE=repo` の配備計画

```console
$ PARADISE_ABODE=repo node graph/deploy.js plan
target  : C:\Users\kikus\Documents\workspace\paradise\.claude
files   : {"plain":23,"own":26,"replace":9}        ← 合計 58
  ✓ every source exists
exit=0
```

## 3. AC-6 — 配備後の照合は `checked: 60` / skip ではない

```console
$ PARADISE_ABODE=repo node graph/deploy.js --write
{"ok":true,"deployed":58,"seeded":"...\\.claude\\settings.json","mode":"repo",
 "pontiff_seat":"fable/xhigh (更新)","guards":"deny 9 / ask 1 / allow 5 (更新 1)"}

$ PARADISE_ABODE=repo node graph/deploy.js check
mode: repo   target: C:\Users\kikus\Documents\workspace\paradise\.claude
checked: 60  transforms (diff expected): agents
  ✓ every deployed file matches its declared source
exit=0
```

`skipped` は印字されていない(skip なら `· skipped: <理由>` が必ず出る)。

## 4. AC-7(逆)— 1 バイトの書き換えを名指す

**この段で最も重い発見**: 旧 `check()` は「transform 対象の kind なら差は乖離ではない」として
**agents 30 ファイルを丸ごと照合から外していた**。改修前の実測:

```console
$ printf 'X' >> .claude/agents/cardinal.md
$ PARADISE_ABODE=repo node graph/deploy.js check
checked: 60   ✓ every deployed file matches its declared source      ← 緑。見逃した
exit=0
```

**58 ファイルのうち 30 が、実質一度も検められていなかった。** 免除をキー単位にして是正:

```console
$ printf 'X' >> .claude/agents/cardinal.md
$ PARADISE_ABODE=repo node graph/deploy.js check
  🔴 agents/cardinal.md — 変換の管轄外(frontmatter の model/effort/tools 以外)で
     配備物が出所と食い違う — 手で触られた疑い (overlay(own))
exit=1
```

未知の変換 engine には免除を与えない(`governedKeys()` が `null` を返す = 免除なしで照合)。
**裁かれる側が裁きの範囲を決めてはならない**(第54条(d))。

## 5. AC-8(逆・不在)— repo では赤、global を名乗ったときだけ skip

```console
$ rm -rf .claude
$ PARADISE_ABODE=repo node graph/deploy.js check
mode: repo   target: ...\.claude
  🔴 abode/.claude — リポジトリ内の住処 ...\.claude が存在しない — 派生物の欠損である。
     node graph/deploy.js --write で建て直せ (第58条(e))
exit=1

$ PARADISE_ABODE=global CLAUDE_HOME=.../.claude node graph/deploy.js check
mode: global   target: ...\.claude
  · skipped: mode=global (source=env) かつ 配備先 ...\.claude が無い —
    外を向いた住処はこの機の資産であり、無いことは欠陥ではない
exit=0
```

**skip は理由を名乗る。** 真偽値の `skipped:true` は「黙って通った」と同義である(第54条(c))。

## 6. AC-13 — `<repo>/.claude/settings.json` を検める

```console
$ PARADISE_ABODE=repo node graph/apply-guards.js verify
  ✓ 掟は機構である: deny 9 / ask 1 / allow 5
  ✓ env に展開されないシェル変数参照は無い
exit=0
```

## 7. AC-14 — git 追跡の派生物として登録

```console
$ git ls-files .claude | wc -l
59
$ node graph/derived.js check
  住処の派生物: .claude/settings.json  (git 追跡 あり / 実体 あり)
  ✓ .claude/settings.json は生成元の写しである (permissions / model / effortLevel)
exit=0
```

### 第29条との整合(design §6.2 の結論どおり)

第29条が禁じるのは「**生成元が無い環境で落ちる**検査」であって「中身を見ること」ではない。
`graph/lessons.json` が罠だったのは生成元(KG)が CI に無いからであり、ゆえに `needs: 'KG'`。

この派生物の生成元は `apply-guards.POLICY` と `clergy.RANKS.pontiff` ——
**どちらも engine の中の定数であり、clone された全ての環境に必ず在る。**
依存する外部環境はゼロ。ゆえに `needs: null` で登録し、中身を検めてよい。
この構造は「生成元が無い環境で落ちる」形に**成り得ない**。理由は `derived.js` の
`DERIVED[REPO_SETTINGS_KEY]` の註釈に書いた。

**なぜ追跡するのか**: clone 直後に存在しなければ、第3段で向け直す guards の 4 門が
CI で必ず skip に落ちる。skip し続ける門は門ではない(第37条)。

## 8. AC-15(逆)— 消えた deny 文字列を名指す

```console
$ node -e "... permissions.deny から 1 件削る ..."
消した行: Bash(git reset --hard:*)
$ node graph/derived.js check
  🔴 permissions.deny: Bash(git reset --hard:*) が写しから消えている
       → node graph/apply-guards.js apply
exit=1
```

## 9. AC-53 — **両居の核心。両方の mode で全走行が緑**

git 込みの複製(`$LOCALAPPDATA/Temp/pdw2`、`.claude` 59 ファイルが追跡済み)で実施:

```console
$ PARADISE_ABODE=repo   node tests/paradise.test.js
Paradise self-test: 469 passed, 0 failed          EXIT=0

$ PARADISE_ABODE=global node tests/paradise.test.js
Paradise self-test: 469 passed, 0 failed          EXIT=0

$ node tests/guards.test.js    Paradise guards self-test: 64 passed, 0 failed   EXIT=0
$ node tests/abode.test.js     Abode self-test: 45 passed, 0 failed             EXIT=0
```

**両方緑・赤 0 件。** 片方でしか緑にならないなら両居ではない — そうはならなかった。

## 10. 個別の門

```console
$ node graph/abode.js check              exit=0
$ node graph/abode.js check --count      exit=0
$ node graph/abode.js check --ledger     exit=0
$ node graph/hermetic.js check           exit=0   (台帳 0 件のまま)
$ node graph/wiring.js check             exit=0   (engine 38 / 孤児 0)
$ node graph/codex.js check              exit=0   (58 条)
$ node graph/census.js check             exit=0
$ node graph/census.js fix               README テスト数: 464/464 → 469/469
```

## 11. CI は Ubuntu である — Linux で撃った

WSL(Ubuntu)+ node v22.11.0。**`| cat` でパイプに流して**撃っている ——
POSIX では stdout がパイプのとき `console.log` が非同期になり、`process.exit()` が
掃き出しを待たない。前回 CI だけを赤にした病である。ゆえに触った 3 engine の
CLI 終了は全て `process.exitCode` に改めた。

```console
=== AC-5 repo plan ===        target: /tmp/pdl/.claude  files: {"plain":23,"own":26,"replace":9}  exit=0
=== AC-6 repo check | cat === checked: 60  ✓ ...                                    pipe-exit=0
=== AC-13 ===                 ✓ 掟は機構である: deny 9 / ask 1 / allow 5             pipe-exit=0
=== AC-14 ===                 ✓ .claude/settings.json は生成元の写しである           pipe-exit=0
=== AC-7 逆 ===               🔴 agents/cardinal.md — 変換の管轄外で…               pipe-exit=1
=== AC-8 逆 (repo, 不在) ===  🔴 abode/.claude — 派生物の欠損である                 pipe-exit=1
=== AC-8 skip (global 明示)=== · skipped: mode=global (source=env) かつ…            pipe-exit=0
=== AC-15 逆 ===              🔴 permissions.deny: Bash(git push --force:*) が…     pipe-exit=1
hermetic=0  wiring=0  abode-count=0
```

**Windows と Linux で同じ答え。** 出力の欠落なし。

---

## 12. `.gitignore` の裁定

### `graph/kg-store/` — **このまま残す。変更なし。**

第4段で KG がここへ移っても、この行は残る。理由(`.gitignore` の註釈にも書いた):

1. KG は走行のたびに追記される「**記憶**」であって「原本」ではない。
   並行 PR で必ず衝突し、手で解決する術が無い。
2. `.claude/settings.json` を追跡する理由 ——「clone 直後に無いと門が skip に落ちる」——
   は KG には**当てはまらない**。KG が無ければ、KG を読む門は「測れなかった」と
   表明すればよい(第16条・第37条)。
3. 今 追跡に変えれば、**空の kg-store が追跡され**、第4段の移設
   (`migrate --verify` が行数と sha256 集合の一致を要求する)が「既に在るファイル」と衝突する。

**移設は第4段の仕事。この段では判断と理由を書くだけ。**

### `.claude/` — **敢えて無視しない(追跡する)**

理由は AC-14 のとおり。手で編集してはならない旨と、建て直す唯一の命令を註釈に書いた。

---

## 13. 変更したファイル

| ファイル | 変更 |
|---|---|
| `graph/deploy.js` | mode を見た skip(第58条(e))/ 住処不在の名指し / **変換免除をキー単位へ是正**(AC-7 の真因)/ mode=repo での settings.json の種撒き / `process.exitCode` 化 / mode・target の名乗り |
| `graph/derived.js` | `DERIVED` に `.claude/settings.json` を `needs: null` で登録(第29条の整合を註釈で説明)/ `verifyRepoSettings()` 新設(消えた deny 行を名指す)/ `check()` へ結線 / `process.exitCode` 化 |
| `.gitignore` | kg-store の裁定を明文化 / `.claude/` を追跡する理由 |
| `tests/paradise.test.js` | 門 5 本新設(変換免除のキー単位 / 未知 engine に免除なし / skip は global のみ / `needs: null` の整合 / 消えた deny の名指し) |
| `.github/workflows/tribunal.yml` | repo での deploy+guards の 3 門 / **両居の全走行 2 本**(AC-53) |
| `README.md` | `census.js fix` が書いた(464 → 469)。手で書いていない(第22条) |
| `.claude/` 59 ファイル | **新規追跡。派生物**(`deploy --write` の産物) |

---

## 14. やっていないこと(境界の遵守)

- `DEFAULT_MODE` は `global` のまま(反転は第4段)
- guards 4 門の向け直し・静かな緑の `skip()` 化はしていない(第3段)
- `~/.claude` の 58 ファイルはそのまま(撤収は第6段)
- `git commit` / `gh pr` は打っていない — 教主の手に委ねる
