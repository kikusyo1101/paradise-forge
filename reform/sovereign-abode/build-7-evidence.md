# 改革『主権的住処』 第7段の証拠 — **撤収の完遂** (裁可 1-A / 2-A / 3-A / 4-A / 5-A)

枝: `reform/sovereign-abode-7` / 着手時 HEAD: `ad1bef5`
神官: construction相 / 発令: 教主 (2026-09-13)

第6段で「計る器」が建った(`retreat --plan` / `retreat --verify` / `check --backrefs`)。
第7段は**その器が計った物を実際に引く**段である。神が5つの問いに全て推奨案を選んだ
(1-A / 2-A / 3-A / 4-A / 5-A)ので、本書はその5件の裁可の実行記録である。

> **測定の前提について(教主からの申し送り / 2026-09-13)**
> 本神官の作業の最初の約8分間、教主が独立に `census.js check` と
> `tests/paradise.test.js` を並行で走らせていた(第58条(c) が禁じる形)。
> その窓に重なった測定は**全て撃ち直した**。本書に載る数は
> **すべて本神官自身の単独走行で測ったもの**であり、教主の走行の 471 緑は
> 本段の成果の証拠として用いない。

---

## §0 着手前のベースライン(自分の手で実測)

```console
$ git branch --show-current
reform/sovereign-abode-7
$ git status --short
(空 — 作業木は清い)

$ node graph/abode.js check --backrefs
✗ 実機の hooks が楽園リポジトリの絶対パスを握っている (6 件) — AC-31 / 第20条の鏡像
    実機: C:\Users\kikus\.claude\settings.json
  PreToolUse[2]  matcher="Edit|Write"
     node "C:/Users/kikus/.../overlay/vendor/scripts/hooks/suggest-compact.js"
  PreCompact[0]  matcher="*"
     node "C:/Users/kikus/.../overlay/vendor/scripts/hooks/pre-compact.js"
  SessionStart[0]  matcher="*"
     node "C:/Users/kikus/.../overlay/vendor/scripts/hooks/session-start.js"
  SessionStart[1]  matcher="*"
     node "C:/Users/kikus/.../tools/hooks/paradise-session-start.js"
  SessionEnd[0]  matcher="*"
     node "C:/Users/kikus/.../overlay/vendor/scripts/hooks/session-end.js"
  SessionEnd[1]  matcher="*"
     node "C:/Users/kikus/.../overlay/vendor/scripts/hooks/evaluate-session.js"
  → **撤収前の今は、これが赤いのが正しい。**
exit 1

$ node graph/abode.js retreat --verify
  正準 sha256: b66c5008319d71c6 = b66c5008319d71c6 (凍結)
  ✓ 神のキーは無傷で、不可侵名簿は存在し、かつ内容が一致する
exit 0

$ node tests/guards.test.js
  ✗ every matcher on the real machine is classifiable and hits at least one tool
      matcher が一つも読めていないなら診断が壊れている
Paradise guards self-test: 65 passed, 1 failed
exit 1
```

**逆向き依存 = 6 件。guards に赤 1 門。** これが本段の始点である。

---

## §1 裁可 5-A — `derived.js` の揃を repo に固定

### 1.1 何が問題だったか(着手前の実測)

`verifyRepoSettings()` は `apply-guards` の**既定の** `POLICY` を引いていた。
`POLICY = policyFor()` は `abode.resolve()` を通るので**走らせた側の env を見る**。
`<repo>/.claude/settings.json` は定義上 repo の住処の派生物なのに、
`PARADISE_ABODE=global` で走らせた者には repo 専用の deny 一本が「掟に無い行」と見える:

```console
$ node graph/derived.js check                       # 既定 (repo)
  ✓ .claude/settings.json は生成元の写しである (permissions / model / effortLevel)
exit 0

$ PARADISE_ABODE=global node graph/derived.js check
  🔴 permissions.deny: Edit(**/.claude/**) は掟に無い — 手で足された行である
       → node graph/apply-guards.js apply
  1 件、派生物が生成元と食い違う
exit 1                                              ← 🔴 **AC-53 未達**
```

同じ作業木が env 次第で赤くも緑にもなる。これは EX-1 の照合を `global` に
固定したのと**同型の欠陥**である(`verifyExport('EX-1')` の註が既に警告していた)。

### 1.2 直した内容 — `graph/derived.js`

```diff
-  // ── permissions ← apply-guards.POLICY ────────────────────────────────
-  const { POLICY } = require('./apply-guards.js');
+  // ── permissions ← apply-guards.policyFor({mode:'repo'}) ──────────────
+  // **揃は repo に固定する**(裁可 5-A / AC-53)。`<repo>/.claude/settings.json` は
+  // 定義上 repo の住処の派生物であり、走らせた側の env で「あるべき姿」が変わる道理は無い。
+  const POLICY = require('./apply-guards.js').policyFor({ mode: 'repo' });
```

### 1.3 実測 — AC-53 が閉じた

```console
$ node graph/derived.js check                          exit 0
$ PARADISE_ABODE=global node graph/derived.js check    exit 0   ← ★ AC-53 達成
$ PARADISE_ABODE=repo   node graph/derived.js check     exit 0
```

三つの住処すべてで緑。**一行の固定で AC-53 が閉じた。**

---

## §2 裁可 4-A — AC-38 の母数は広げない(要件書へ神の裁定を追記)

実装変更は**無し**(神の裁可どおり)。要件書 §R-9 の AC-38 の直下に、
神の裁定を引用として追記した。`reform/sovereign-abode/requirements.md`:

```markdown
> **神の裁定 (裁可 4-A / 2026-09-12) — 母数は広げない。**
> AC-38 の母数は **GOD_KEYS(神5キー)** のままとする。実装は現に
> 「神5キー以外のキーが増えたか」ではなく「神5キーの集合が変わったか」を裁う。
> 神託: 「母数を広げない。神が自分で statusLine を足した日に『増殖』と叫ぶ門は、
> 撤収の門ではなく神の生活の門になる」。
>
> ゆえに上記の期待文(入力が `"newKey":1` で exit 1)は**実装と食い違ったまま残す** ——
> これは実装の欠陥ではなく、起草時の母数の取り違えである
> (証拠書 `build-6-evidence.md` §3.2 に実出力で記録済み)。
```

食い違いを**消さずに、理由を添えて残した**のが要点である。
要件書を実装に合わせて黙って書き換えれば、起草時の誤りが歴史から消える。

---

## §3 裁可 3-A — `CLAUDE.md` から数を抜く … **🔴 遂行できなかった**

### 3.1 実測した事実

数を書いている箇所は**倉直下の `CLAUDE.md:27` の一箇所だけ**であった:

```console
$ grep -rn "deny 9 / ask 1" --include=*.md . | grep -v reform/
./CLAUDE.md:27:(`node graph/apply-guards.js verify` が証拠 — deny 9 / ask 1)。
./CONSTITUTION.md:532:    — its own output said so: `"guards": "deny 9 / ask 1 / allow 5 (更新 10)"`.
```

- `CONSTITUTION.md:532` は**過去の走行の引用**(憲法の条文が当時の出力を証拠として引く形)であり、
  「現在の数」を主張していない。ゆえに 3-A の対象外と判じた。
- `.claude/CLAUDE.md` と `overlay/root/CLAUDE.md` は**数を持たない**(実測: 両者 1576 B で同一)。
  ゆえに「出所を直して deploy で建て直す」道は**不要**であった
  (教主の想定は「`.claude/` 側にも在りうる」だったが、実機には無かった)。
- 倉直下の `CLAUDE.md` は deploy の派生物では**ない**(`deploy.js` は `overlay/root/CLAUDE.md` を
  `.claude/CLAUDE.md` へ配るだけで、倉直下には触らない)。ゆえに手で直すのが正しい道であった。

意図した修正は次の一行だけである:

```diff
-(`node graph/apply-guards.js verify` が証拠 — deny 9 / ask 1)。
+(`node graph/apply-guards.js verify` が証拠 — 数はその出力が語る)。
```

なお **この数は既に嘘になっている** — 現在の `verify` は `deny 10` を印字する:

```console
$ node graph/apply-guards.js verify
  ✓ 掟は機構である: deny 10 / ask 1 / allow 5
```

### 3.2 なぜ遂行できなかったか(第37条: 正直に書く)

`CLAUDE.md` は本神官の走行環境で**保護された agent 指示ファイル**として扱われ、
書き込みが承認待ちになったまま**応答が返らず時間切れ**になった:

```
BLOCKED: write to protected agent-instruction file(s) (CLAUDE.md)
approval prompt timed out without a user response.
Silence is not consent. The user has NOT consented to this write.
```

**沈黙は同意ではない。** ゆえに本神官はこの一行の修正を**行っていない**。
別経路(terminal / sed 等)で同じ編集を試みることは、承認機構の迂回であり
禁じ手(第57条の同類)であるため**試みなかった**。

> **申し送り**: 裁可 3-A は**未遂**である。修正内容は上の diff 一行で確定しており、
> 落としてはならない文(`日本語で話す` / `PR` + `マージは神` / `apply-guards` /
> `CONSTITUTION.md` / `codex.js` / `subagent|「done」を信じない`)はいずれも
> 27 行目とは無関係なので、この一行の置換で門が赤くなることは無い
> (門の実体は `tests/paradise.test.js:1881` と `census.dietChecks()`)。
> 教主または神が自ら適用するのが正しい道である。

---

## §4 裁可 2-A — 楽園固有の1本の**移送先を先に作る**(AC-32)

### 4.1 なぜ順序が正典なのか(着手前の実測)

```console
$ node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('.claude/settings.json'))))"
[ 'model', 'effortLevel', 'permissions' ]          ← **hooks が無い**
```

`<repo>/.claude/settings.json` は hooks を一本も持っていなかった。
**空の移送先へ向けて引けば、楽園の記憶注入が黙って消える。** ゆえに先に生やす。

そしてこれが `tests/guards.test.js` の赤 1 門の**根**でもあった:

```console
$ node -e "const G=require('./graph/apply-guards.js'); console.log(G.diagnose(G.SETTINGS).length)"
0
```

門は `rows.length > 0` を要求する(「matcher が一つも読めていないなら診断が壊れている」)。
第4段で住処が `<repo>/.claude` へ移った結果、診断すべき hook がゼロになり
門が赤くなっていた。**赤は門が正しかった** —— 移送先が空であることを門が告げていた。

### 4.2 engine が生成する形にした(第29条)

`<repo>/.claude/settings.json` は `derived.js` が裁く派生物なので手で書かない。
`graph/apply-guards.js` に宣言を置き、`buildDesired()` が生やす形にした。
`apply-guards.js` は既に settings.json を組む職能を持つので、別 engine は立てていない
(立てれば「同じ問いに二つの答え」になる / 第29条)。

**実装の要点(2つの落とし穴を避けた)**:

1. **絶対パスを書かない。** `$CLAUDE_PROJECT_DIR` を使う。
   絶対パス直書きは AC-30 の逆向き依存**そのもの**であり、移送先に同じ病を持ち込めば
   倉を動かした瞬間に repo 側の hook が壊れる。
2. **移送先は「対象ファイル」で決まり、env では決まらない。**
   `repoHooksFor(file)` は渡された `file` が repo の住処の settings.json の**ときだけ**
   フックを返す。`PARADISE_ABODE=repo` を名乗った者が神の住処へ楽園のフックを
   書けてはならない —— env で分岐すれば、住処を取り違えた一回の走行が神のホームを汚す。

```js
const REPO_HOOKS = {
  SessionStart: [{
    matcher: '*',
    hooks: [{ type: 'command',
              command: 'node "$CLAUDE_PROJECT_DIR/tools/hooks/paradise-session-start.js"' }],
    description: 'Paradise: inject the knowledge-graph snapshot (repo abode / 第58条)',
  }],
};
function repoHooksFor(file) {
  return isRepoSettingsFile(file) ? JSON.parse(JSON.stringify(REPO_HOOKS)) : {};
}
```

### 4.3 神の住処へは 1 本も足さないことを、書く前に実測した

```console
$ node -e "
const G=require('./graph/apply-guards.js');
console.log('repoSettingsFile=',G.repoSettingsFile());
console.log('isRepo(real god)=',G.isRepoSettingsFile('C:/Users/kikus/.claude/settings.json'));
console.log('repoHooksFor(god)=',JSON.stringify(G.repoHooksFor('C:/Users/kikus/.claude/settings.json')));
const god=JSON.parse(require('fs').readFileSync('C:/Users/kikus/.claude/settings.json','utf8'));
const r=G.buildDesired(god,{file:'C:/Users/kikus/.claude/settings.json'});
console.log('changes kinds=',JSON.stringify(r.changes.map(c=>c.kind)));
console.log('god hooks unchanged=',JSON.stringify(god.hooks)===JSON.stringify(r.next.hooks));
"
repoSettingsFile= C:\Users\kikus\Documents\workspace\paradise\.claude\settings.json
isRepo(real god)= false
repoHooksFor(god)= {}
changes kinds= ["permissions"]
god hooks unchanged= true        ← ★ 神の住処には 1 本も足さない
```

### 4.4 移送先を生やした(実出力)

```console
$ PARADISE_ABODE=repo node graph/apply-guards.js apply
  ✎ 掟を機構にした (1 change(s))   ...\paradise\.claude\settings.json
     · repo-hook: 移送先に楽園のフックが居ない — 撤収は消すではなく移すである (AC-32)
exit 0
```

生えた形(`<repo>/.claude/settings.json` の差分):

```diff
   "permissions": { ... }
+  },
+  "hooks": {
+    "SessionStart": [
+      {
+        "matcher": "*",
+        "hooks": [
+          { "type": "command",
+            "command": "node \"$CLAUDE_PROJECT_DIR/tools/hooks/paradise-session-start.js\"" }
+        ],
+        "description": "Paradise: inject the knowledge-graph snapshot (repo abode / 第58条)"
+      }
+    ]
   }
```

### 4.5 移送先が**生きている**ことを実測(引く前の必須条件)

```console
$ CLAUDE_PROJECT_DIR="C:/Users/kikus/Documents/workspace/paradise" \
  node "C:/Users/kikus/Documents/workspace/paradise/tools/hooks/paradise-session-start.js" < /dev/null

=== 楽園 (PARADISE) — セッション開始 ===
あなたは楽園の教主(王)。kikus は神であり、日本語で神託を下す。**日本語で応答すること。**
場所: C:\Users\kikus\Documents\workspace\paradise
...
=== PARADISE KNOWLEDGE SNAPSHOT ===
nodes:122  edges:33
exit 0
```

**記憶注入が repo 側で現に動く。** ここで初めて神の住処から引く資格が生じた。

### 4.6 AC-32 の赤 1 門が治った

```console
$ node graph/apply-guards.js verify
  ✓ 掟は機構である: deny 10 / ask 1 / allow 5
  ✓ hook matcher 1 件すべて生きている
  ✓ env に展開されないシェル変数参照は無い
exit 0

$ node tests/guards.test.js
Paradise guards self-test: 66 passed, 0 failed
exit 0                          ← ★ 65緑/1赤 → 66緑/0赤 (AC-32 が根であった)
```

門の総数は変わっていない(65 passed + 1 failed = 66 = 66 passed + 0 failed)。
**門を足して緑にしたのではなく、赤かった既存の門が治った。**

---

## §5 裁可 1-A — 汎用5本を「向け直す」(輸出 EX-3)

### 5.1 実測で確かめた複製の形(推測で進まなかった)

教主が申し送った落とし穴を、**書く前に全て実機で検算した**。

**(a) 5本だけでは動かない — lib も要る**

```console
$ grep -n "require(" overlay/vendor/scripts/hooks/*.js | grep lib
evaluate-session.js:22:} = require('../lib/utils');
pre-compact.js:20:}     = require('../lib/utils');
session-end.js:22:}     = require('../lib/utils');
session-start.js:18:}   = require('../lib/utils');
session-start.js:19:const { getPackageManager, getSelectionPrompt } = require('../lib/package-manager');
suggest-compact.js:23:} = require('../lib/utils');

$ grep -n "require(" overlay/vendor/scripts/lib/package-manager.js | grep utils
10:const { ... } = require('./utils');
```

→ **運ぶ物は 7 本**(hooks 5 + lib 2)。`lib/` を落とせば 5 本全部が即死する。

**(b) `evaluate-session.js` の config 参照が `~/.claude/scripts/hooks/` で正しく解ける**

```console
$ node -e "…path.join('C:/Users/kikus/.claude/scripts/hooks','..','..','skills','continuous-learning','config.json')…"
resolved = C:\Users\kikus\.claude\skills\continuous-learning\config.json
exists   = true                       ← **実機に既在**(409 B / 教主の確認どおり)
content  = { "min_session_length": 10, "extraction_threshold": "medium", … }
```

→ 複製先が `~/.claude/scripts/hooks/` の**ちょうど二段**であるときだけ config が解ける。
一段浅くても深くても継続学習の設定を失う。**この形を回帰門に固定した**(§6.3)。

**(c) 偽のホームで 5 本すべてを実際に走らせた(神の実機を汚さずに)**

`utils.js:18` の `getHomeDir()` は `os.homedir()` を返し、`os.homedir()` は
`USERPROFILE` を読む。ゆえに env を差し替えれば実行を安全に証明できる:

```console
$ FAKE=$LOCALAPPDATA/Temp/fakehome
$ mkdir -p $FAKE/.claude/scripts/{hooks,lib} $FAKE/.claude/skills/continuous-learning
$ cp overlay/vendor/scripts/hooks/*.js $FAKE/.claude/scripts/hooks/
$ cp overlay/vendor/scripts/lib/*.js   $FAKE/.claude/scripts/lib/
$ cp ~/.claude/skills/continuous-learning/config.json $FAKE/.claude/skills/continuous-learning/
$ for h in session-start pre-compact session-end suggest-compact evaluate-session; do
    USERPROFILE=$FAKE HOME=$FAKE node $FAKE/.claude/scripts/hooks/$h.js </dev/null; echo "exit=$?"
  done
--- session-start ---     exit=0   [SessionStart] Package manager: npm (fallback)
--- pre-compact ---       exit=0   [PreCompact] State saved before compaction
--- session-end ---       exit=0   [SessionEnd] Created session file: …fakehome\.claude\sessions\…
--- suggest-compact ---   exit=0
--- evaluate-session ---  exit=0

$ find $FAKE -type f            # 書き込みは全て偽のホームに閉じた
<fake>/.claude/sessions/2026-09-13-session.tmp
<fake>/.claude/sessions/compaction-log.txt
<fake>/.claude/scripts/hooks/*.js  <fake>/.claude/scripts/lib/*.js
```

→ **5 本すべてが複製先の構造で走る。** 神の実機には 1 バイトも触れていない。

### 5.2 台帳 EX-3(手で編集した — 第54条(d))

`abode.js` は台帳へ書く口を持たない(`selfAudit()` が静的に禁じている)ので
`graph/abode.json` を**手で**編集した。エントリ全文:

```json
{
  "id": "EX-3",
  "target": "~/.claude/scripts/{hooks,lib}",
  "kind": "deploy-tree",
  "writer": "graph/apply-hooks.js",
  "scope": "machine",
  "reason": "撤収は「消す」ではなく「移す」である。神の settings.json は汎用フック 5 本 (suggest-compact / pre-compact / session-start / session-end / evaluate-session) を楽園の倉の絶対パスで握っていた (AC-30 の逆向き依存 6 件のうち 5 件)。この 5 本は楽園を一切参照せず ~/.claude/sessions/ と skills/learned/ と os.tmpdir() へ書く、神の全プロジェクトのための機能である。倉から引くだけでは神の日常が黙って壊れ、倉に残せば逆向き依存が消えない。ゆえに神の住処へ複製し、hook の道をそちらへ向け直す。実測: 5 本は require('../lib/utils') を引き package-manager.js も require('./utils') を引くので lib/ も複製が要る。evaluate-session.js は path.join(__dirname,'..','..','skills','continuous-learning','config.json') を読むため、~/.claude/scripts/hooks/ に置けば ~/.claude/skills/continuous-learning/config.json を指し、それは実機に既在する (409 B)。偽のホームへ複製して 5 本すべてを撃ち exit 0 を確認済み。",
  "ordainedBy": "god",
  "ordainedOn": "2026-09-12",
  "ordainedVia": "reform/sovereign-abode — 第6段の撤収計画に対する神の裁可 1-A",
  "verify": "node graph/apply-hooks.js verify"
}
```

台帳の門が **writer の実在**を要求したので、engine を立ててから台帳が緑になった:

```console
$ node graph/abode.js check --ledger      # engine を立てる前
✗ 台帳の実質が無い (1 件)
  EX-3   writer      : writer が実在しない: graph/apply-hooks.js
exit 1                                     ← 門が正しく鳴った(第54条(b))

$ node graph/abode.js check --ledger      # graph/apply-hooks.js を立てた後
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
exit 0
```

### 5.3 新しい engine — `graph/apply-hooks.js`

EX-3 の `writer`。`deploy.js` に足すのではなく**別 engine を立てた**理由:
`deploy.js` の職掌は overlay → 住処の配備であり、その `check()` は配備物 60 件を
源と 1:1 照合する。汎用フックの複製は**輸出であって配備ではない**
(源は overlay だが宛先は台帳が名指す神の住処であり、`deploy check` の
1:1 照合に入れれば「配備物が 67 件ある」という別の嘘が生まれる)。
`wiring.js` が孤児と裁かないことを実測済み(engine 39 / 孤児 0)。

口は5つ:

| 口 | 職務 |
|---|---|
| `plan` | 複製の計画を印字。**1 バイトも書かない** |
| `apply` | 神の住処へ複製。書き込みは `abode.globalWrite()`(EX-3 の関門)を通る |
| `redirect` | settings.json の 5 本の道を向け直す。**書く前に退避を取る** |
| `withdraw` | 楽園固有の1本を引く。**移送先が空なら拒む** |
| `verify` | 複製が源と sha256 一致するか。住処が無い機は理由を名乗って skip |

### 5.4 書く前の乾走 — 偽のホームへ apply + redirect を撃った

```console
$ node <dryrun> $LOCALAPPDATA/Temp/dryrun         # 神の settings.json の複製を的にする
--- apply to fake dest ---
[輸出 EX-3] ~/.claude/scripts/{hooks,lib} ← graph/apply-hooks.js
copied= 7 ok= true
--- verify fake dest ---
verify ok= true | states= ok,ok,ok,ok,ok,ok,ok
--- redirect fake settings ---
changed= 5 ok= true backup= settings.json.pre-retreat-1789227227.bak
    PreToolUse[2] suggest-compact.js redirect
    PreCompact[0] pre-compact.js redirect
    SessionStart[0] session-start.js redirect
    SessionStart[1] paradise-session-start.js skip     ← 楽園固有は別の手で扱う
    SessionEnd[0] session-end.js redirect
    SessionEnd[1] evaluate-session.js redirect
--- GOD 5 KEYS ---
before sha= b66c5008319d71c6
after  sha= b66c5008319d71c6
GOD_KEYS_EQUAL= true
permissions_unchanged= true
model/effort unchanged= true
--- remaining paradise refs ---
   STILL: SessionStart node "…/tools/hooks/paradise-session-start.js"
remaining_backrefs= 1
--- do the redirected hooks actually run from the fake home? ---
    suggest-compact.js exit=0 / pre-compact.js exit=0 / session-start.js exit=0
    session-end.js exit=0 / evaluate-session.js exit=0
```

**乾走で神5キーの sha が不変であることを確かめてから、実機へ向かった。**

### 5.5 神の settings.json の退避(掟: 書く前に必ず自分の手で)

```console
$ cp "C:/Users/kikus/.claude/settings.json" \
     "C:/Users/kikus/.claude/settings.json.pre-retreat-$(date +%s).bak"
BACKUP=C:/Users/kikus/.claude/settings.json.pre-retreat-1789227301.bak

$ ls -la C:/Users/kikus/.claude/settings.json.pre-retreat-1789227301.bak
-rw-r--r-- 1 kikus 197609 7954  9月 13 00:35 …/settings.json.pre-retreat-1789227301.bak

$ sha256sum C:/Users/kikus/.claude/settings.json \
            C:/Users/kikus/.claude/settings.json.pre-retreat-1789227301.bak
4425f39ed3051abe75f90526e9e1e7f55aba29d88212e21cfd2a7f43b304aa28 *settings.json
4425f39ed3051abe75f90526e9e1e7f55aba29d88212e21cfd2a7f43b304aa28 *settings.json.pre-retreat-1789227301.bak
                                   ↑ **一バイト違わぬ退避が取れている**

$ # 書く前の神5キー(正準化 = キー名昇順 + compact JSON)
canonical= {"agentPushNotifEnabled":true,"enableWorkflows":true,"extraKnownMarketplaces":
            {"claude-plugins-official":{"source":{"source":"github",
            "repo":"anthropics/claude-plugins-official"}}},"language":"japanese","theme":"dark"}
sha16= b66c5008319d71c6
all keys= enableWorkflows, extraKnownMarketplaces, language, theme,
          agentPushNotifEnabled, hooks, model, effortLevel, permissions
```

`redirect` と `withdraw` も**それぞれ独自に**退避を取る(engine の中に錠がある)。
ゆえに本段で `~/.claude` に増えた退避は 3 件である。

### 5.6 実機への複製(`~/.claude` への最初の書き込み)

```console
$ node graph/apply-hooks.js apply
[輸出 EX-3] ~/.claude/scripts/{hooks,lib} ← graph/apply-hooks.js
  複製先: C:\Users\kikus\.claude\scripts
    ✎ hooks/suggest-compact.js  1850 B
    ✎ hooks/pre-compact.js  1314 B
    ✎ hooks/session-start.js  1813 B
    ✎ hooks/session-end.js  1681 B
    ✎ hooks/evaluate-session.js  2314 B
    ✎ lib/utils.js  8438 B
    ✎ lib/package-manager.js  10052 B
  ✓ 7 本を複製した — 照合: node graph/apply-hooks.js verify
exit 0

$ node graph/apply-hooks.js verify
    ✓ hooks/suggest-compact.js  1850 B (sha 一致)
    ✓ hooks/pre-compact.js  1314 B (sha 一致)
    ✓ hooks/session-start.js  1813 B (sha 一致)
    ✓ hooks/session-end.js  1681 B (sha 一致)
    ✓ hooks/evaluate-session.js  2314 B (sha 一致)
    ✓ lib/utils.js  8438 B (sha 一致)
    ✓ lib/package-manager.js  10052 B (sha 一致)
  ✓ 7 本すべてが源と sha256 で一致する
exit 0
```

照合が**複製の前には赤かった**ことも記録しておく(黙って緑に落ちる門ではない):

```console
$ node graph/apply-hooks.js verify        # 複製の前
    🔴 hooks/suggest-compact.js  missing        (7 本すべて missing)
  🔴 複製が無い: hooks/suggest-compact.js — C:\Users\kikus\.claude\scripts\hooks\…
exit 1
```

### 5.7 ★ `~/.claude` に新しく作った物の全一覧

| 道 | バイト | 備考 |
|---|---|---|
| `~/.claude/scripts/hooks/suggest-compact.js`   | 1850 | 複製(sha 一致) |
| `~/.claude/scripts/hooks/pre-compact.js`       | 1314 | 複製(sha 一致) |
| `~/.claude/scripts/hooks/session-start.js`     | 1813 | 複製(sha 一致) |
| `~/.claude/scripts/hooks/session-end.js`       | 1681 | 複製(sha 一致) |
| `~/.claude/scripts/hooks/evaluate-session.js`  | 2314 | 複製(sha 一致) |
| `~/.claude/scripts/lib/utils.js`               | 8438 | 複製(sha 一致) |
| `~/.claude/scripts/lib/package-manager.js`     | 10052 | 複製(sha 一致) |
| `~/.claude/settings.json.pre-retreat-1789227301.bak` | 7954 | **私が手で取った退避** |
| `~/.claude/settings.json.pre-retreat-1789227308.bak` | 7954 | `redirect` が取った退避 |
| `~/.claude/settings.json.pre-retreat-1789227317.bak` | 7774 | `withdraw` が取った退避 |

`~/.claude/scripts` は本段で**新設**である(着手前は存在しなかった — 実測済み)。
**既存のファイルを消したものは 1 件も無い。** 変更したのは `settings.json` の
`hooks` 配列の中の `command` 文字列 5 本と、`SessionStart` から引いた 1 群のみ。

### 5.8 hook の道を向け直した

```console
$ node graph/apply-hooks.js redirect
  ✎ PreToolUse[2] suggest-compact.js
      から: node "C:/Users/kikus/Documents/workspace/paradise/overlay/vendor/scripts/hooks/suggest-compact.js"
      へ  : node "C:/Users/kikus/.claude/scripts/hooks/suggest-compact.js"
  ✎ PreCompact[0] pre-compact.js          (同形)
  ✎ SessionStart[0] session-start.js      (同形)
  · SessionStart[1] paradise-session-start.js — skip / 汎用 5 本の台帳に無い
  ✎ SessionEnd[0] session-end.js          (同形)
  ✎ SessionEnd[1] evaluate-session.js     (同形)
  🛟 退避: C:\Users\kikus\.claude\settings.json.pre-retreat-1789227308.bak
  ✓ 5 本を向け直した
exit 0

$ node graph/abode.js check --backrefs
✗ 実機の hooks が楽園リポジトリの絶対パスを握っている (1 件)
  SessionStart[1]  matcher="*"
exit 1                                    ← 6 件 → **1 件**(楽園固有の1本だけ残る)

$ node graph/abode.js retreat --verify
  正準 sha256: b66c5008319d71c6 = b66c5008319d71c6 (凍結)
exit 0                                    ← 神5キー不変
```

### 5.9 複製したフックが実機で現に走る

```console
$ for h in suggest-compact pre-compact session-start session-end evaluate-session; do
    node "C:/Users/kikus/.claude/scripts/hooks/$h.js" </dev/null >/dev/null 2>&1; echo "$h exit=$?"
  done
suggest-compact exit=0 / pre-compact exit=0 / session-start exit=0
session-end exit=0 / evaluate-session exit=0
```

> **正直な註記(第37条)**: この実走は `~/.claude/sessions/` に**セッション記録を
> 1 件足した**(11 件 3018 B → 12 件 3392 B)。`retreat --verify` はこれを
> `(volatile — 増えるのは日常であり撤収の害ではない)` と判じて緑を保った ——
> `sessions` は走行のたびに増える物として不可侵名簿に登録されているからである。
> **これは私の実走が足した分である**ことを明記しておく。消していない(消せば不可侵侵害)。

---

## §6 裁可 2-A の後半 — 楽園固有の1本を引く

### 6.1 引く直前に移送先が生きていることを再度実測した

```console
$ CLAUDE_PROJECT_DIR="…/paradise" node tools/hooks/paradise-session-start.js </dev/null
=== 楽園 (PARADISE) — セッション開始 ===
あなたは楽園の教主(王)。kikus は神であり、日本語で神託を下す。
exit 0                                    ← 移送先が生きている
```

### 6.2 引いた

```console
$ node graph/apply-hooks.js withdraw
  🧳 SessionStart[1] を引いた
      node "C:/Users/kikus/Documents/workspace/paradise/tools/hooks/paradise-session-start.js"
      (Paradise: inject the knowledge-graph snapshot (added alongside upstream, never into it))
  → 移送先で生きている: C:\Users\kikus\Documents\workspace\paradise\.claude\settings.json
  🛟 退避: C:\Users\kikus\.claude\settings.json.pre-retreat-1789227317.bak
  ✓ 1 本を引いた
exit 0
```

### 6.3 `withdraw` は移送先が空なら拒む — 両方向を偽の的で撃って証した

```console
--- 【逆】移送先が空 → 拒むはず ---
ok= false removed= 0
refused= 移送先に楽園のフックが居ない (…repo-empty.json) — 空の移送先へ向けて引けば
         機能が黙って消える。PARADISE_ABODE=repo node graph/apply-guards.js apply を先に…
god settings still has hook: 1 (引かれていないこと)      ← **拒んだので消えていない**

--- 【正】移送先が生きている → 引くはず ---
ok= true removed= 1 backup= god-settings.json.pre-retreat-1789227294.bak
god settings has hook now: 0
GOD_KEYS_EQUAL= true
permissions_unchanged= true
other hooks kept: PreToolUse=3 PreCompact=1 SessionStart=1 PostToolUse=4 Stop=1 SessionEnd=2
```

この 2 方向は `tests/guards.test.js` の回帰門に固定した(§8)。

---

## §7 ★ 完了条件の実測

### 7.1 逆向き依存 6 件 → **0 件 / exit 0**

```console
$ node graph/abode.js check --backrefs
═══ 🏠 ABODE CHECK (第58条) ═══
  · 除外 1 件: graph/abode.js (住所を作るのが職務 / …)
  ✓ 逆向き依存は 0 件 — 実機の hooks は楽園の木を指していない (AC-30)
    実機: C:\Users\kikus\.claude\settings.json
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
  ✓ 門は黙って緑に落ちず、兄弟の engine は同じ口から住所を得ている
═══════════════════════════════
exit 0                                    ← ★★ **完了条件 (1) 達成**
```

### 7.2 神5キー sha `b66c5008319d71c6` 不変 / 不可侵名簿一致 — exit 0

```console
$ node graph/abode.js retreat --verify
  ── 神 5 キー (AC-35〜AC-38) ────────────────────────────────
  正準 sha256: b66c5008319d71c6 = b66c5008319d71c6 (凍結)
    ✓ agentPushNotifEnabled    true
    ✓ enableWorkflows          true
    ✓ extraKnownMarketplaces   {"claude-plugins-official":{"source":{"source":"github","repo":"anthropics/claude-plugins-official"}}}
    ✓ language                 "japanese"
    ✓ theme                    "dark"

  ── 不可侵名簿 (AC-33 / AC-34) ──────────────────────────────
    ✓ .credentials.json              files=   1 bytes=    11520
    ✓ .credentials.lock              files=   1 bytes=        1
    ✓ projects                       files=  39 bytes= 28374531
    ✓ plugins                        files= 365 bytes=  6873130
    ✓ sessions                       files=  12 bytes=     3392
         sessions: ファイル数 11 → 12 / … (volatile — 増えるのは日常であり撤収の害ではない)
    ✓ session-env / shell-snapshots / history.jsonl
    ✓ skills/learned                 files=   0 bytes=        0
    ✓ skills/pr-review               files=   1 bytes=     2924
    ✓ skills                         files=  15 bytes=   102961
    ✓ policy-limits.json / remote-settings.json
    ✓ backups                        files=   5 bytes=   269660
    ✓ cache / ide / .last-cleanup
    ✓ settings.json.pre-wire.bak     files=   1 bytes=      352
    ✓ settings.json.bak.1787846094   files=   1 bytes=      353
  ✓ 神のキーは無傷で、不可侵名簿は存在し、かつ内容が一致する
exit 0                                    ← ★★ **完了条件 (2) 達成**
```

**神の原初設定の唯一の証拠**(`pre-wire.bak` 352 B / `bak.1787846094` 353 B)は
1 バイトも動いていない。

### 7.3 神の住処に残った楽園への参照(実測 0 件)

```console
=== FINAL god settings hooks ===
PreToolUse[2]:   node "C:/Users/kikus/.claude/scripts/hooks/suggest-compact.js"
PreCompact[0]:   node "C:/Users/kikus/.claude/scripts/hooks/pre-compact.js"
SessionStart[0]: node "C:/Users/kikus/.claude/scripts/hooks/session-start.js"
SessionEnd[0]:   node "C:/Users/kikus/.claude/scripts/hooks/session-end.js"
SessionEnd[1]:   node "C:/Users/kikus/.claude/scripts/hooks/evaluate-session.js"
(SessionStart[1] は引かれた — 移送先 <repo>/.claude/settings.json で生きている)

=== key order preserved? ===
enableWorkflows, extraKnownMarketplaces, language, theme, agentPushNotifEnabled,
hooks, model, effortLevel, permissions          ← 9 キー / 着手前と**同一の並び**

=== hook group counts per event ===
  PreToolUse = 3   PreCompact = 1   SessionStart = 1
  PostToolUse = 4  Stop = 1         SessionEnd = 2
  ↑ SessionStart だけが 2 → 1(引いた 1 本)。**他は全て不変。**
```

神の私物のフック(tmux の助言 / git push の確認 / prettier / tsc / console.log の
見張り / Stop の見張り)は**一本も触っていない**。

### 7.4 EX-1 は無傷(`permissions` を引いていない)

```console
$ node graph/abode.js exports --verify EX-1
EX-1  ~/.claude/settings.json#/permissions
  照合の道: node graph/apply-guards.js verify
  実機: C:\Users\kikus\.claude\settings.json
  permissions deny 9 / ask 1 / allow 5
  ✓ 輸出は実機で生きている — POLICY と完全一致
exit 0                                    ← 神の住処は deny 9 のまま(repo は deny 10)
```

### 7.5 撤収後の `retreat --plan`(何が減ったか)

```console
── (3) hooks の逆向き依存 — 楽園リポジトリの絶対パスを握る hook ────────────
  ✓ 0 件 — 撤収済みか、そもそも結線されていない
```

着手前は同じ節が「6 件。**判定の根拠は推測ではなく実測**」として
6 本を一本ずつ並べ、末尾で「**裁可を仰ぐ**」と神の名指しを求めていた。
**その裁可が下り、履行された。**

---

## §8 `--backrefs` を `--all` へ編入(前の神官の申し送りの履行)

第6段の神官はコードの註と門で「撤収完了後に `--all` へ編入する」と申し送っていた。
**条件(`check --backrefs` が exit 0)が満たされたので履行した。**

`graph/abode.js` の3箇所を更新した:
`check()` の分岐(`if (all || opts.backrefs)`)/ `backRefs()` の docstring /
`CHECK_FLAGS` の註。

さらに**申し送りを守っていた門そのもの**を更新した。旧門は正規表現
`/撤収(が)?完了(した日|後)に\s*`?--all`?\s*へ編入/` でコードの註を見ていたので、
編入すれば必ず赤くなる —— **申し送りを守る門が、履行を妨げる形で残っていた**。

| 旧 (第6段) | 新 (第7段) |
|---|---|
| `--backrefs` は `--all` に含まれない — 撤収前の赤で CI を殺さない (台帳 [41]) | `--backrefs` は `--all` に編入された — 撤収が完遂したので既定で走る (第44条) |
| — | `--all` に編入しても実機が無い機(CI)は skip を名乗って緑 (第58条(e)) |

**編入の安全性の根拠**は二つ目の門が持つ: CI には実機が無く、`backRefs()` は
理由を名乗って skip する。ゆえに編入しても CI は緑である(§9 で実測)。
旗 `--backrefs` 自体は残した(撤収の作業中に単独で撃ちたい場面がある)。

```console
$ node graph/abode.js check                  # 無旗 = --all(backrefs を含む)
  ✓ 逆向き依存は 0 件 — 実機の hooks は楽園の木を指していない (AC-30)
  ✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない
  ✓ 門は黙って緑に落ちず、兄弟の engine は同じ口から住所を得ている
exit 0
```

### 8.1 足した回帰門(9 門)

`tests/guards.test.js` に AC-32 と EX-3 の正逆を固定した。
`tests/abode.test.js` の編入の門 2 件と合わせて、本段で**門は 117 → 118(abode)/
65 → 75(guards)**になった。

| 門 | 何を守るか |
|---|---|
| 【正】AC-32 — repo の住処に楽園のフックが生える | 移送先の宣言が在り、`$CLAUDE_PROJECT_DIR` を使い、絶対パスを直書きしない |
| 【逆】神の住処へは 1 本も足さない | 宛先で分岐している(env で分岐していない)ことを証す |
| 【正】二度撃っても増えない | `apply` の冪等性 — 増殖すれば神の住処が汚れる |
| 【正】EX-3 の宛先・writer・照合の道が実在する | 台帳の実質(第54条(b)) |
| 【正】運ぶ物は hooks 5 + lib 2 | **lib を落とせば 5 本全部が死ぬ**という実測を門に固定 |
| 【正】構造は `scripts/{hooks,lib}` で相対 require が解ける | config.json への `../../` が住処の skills を指すこと |
| 【逆】複製が無ければ / 中身が違えば赤 | 「在る」だけでは通さない(sha256 で裁く) |
| 【正】住処が無い機は skip を名乗る | 黙って緑に落ちない(第58条(e))— CI 配線の根拠 |
| 【逆】withdraw は移送先が空なら拒む | **裁可 2-A の順序**を機械が守る |

---

## §9 CI の配線(実測してから配線した)

**偽の空ホームを指す env で撃って、skip を名乗るかを先に確かめた。**

```console
$ FAKE=$LOCALAPPDATA/Temp/cihome      # 空の dir(実機の settings.json が無い状態)

$ USERPROFILE=$FAKE HOME=$FAKE node graph/abode.js check --backrefs
  · skip: 実機の …cihome\.claude\settings.json が無い — 逆向き依存は検められない
exit 0                                    ← ✅ **配線してよい**

$ USERPROFILE=$FAKE HOME=$FAKE node graph/apply-hooks.js verify
  · skipped: 神の住処が無い: …cihome\.claude — EX-3 は検められない
exit 0                                    ← ✅ **配線してよい**

$ USERPROFILE=$FAKE HOME=$FAKE node graph/abode.js retreat --verify
✗ 実機の settings.json が無い: …cihome\.claude\settings.json — 撤収の跡を検められない
exit 2                                    ← 🔴 **配線しない**
```

### 9.1 `retreat --verify` は CI に配線しなかった(理由)

発令は「両者 skip を名乗って exit 0 になるはず。**実測してから配線せよ**。
skip にならないなら配線せず理由を報告せよ」であった。
実測の結果 `retreat --verify` は skip にならず **exit 2** である。

これは engine の欠陥ではなく**正しい振る舞い**である —— 神の住処の凍結
(神5キーの sha / 不可侵名簿)は実機でしか照合できず、
**「測れなかった」を緑にしないのが第37条**だからである。
配線すれば CI は**常に**赤い。ゆえに配線を見送り、`tribunal.yml` に
その理由を註として残した(次の神官が「なぜ片方だけ?」と問うため)。

配線した2ステップ:

```yaml
      # ⚠️ `retreat --verify` は**ここに配線しない。** 同じ env で撃つと
      #    `✗ 実機の settings.json が無い — 撤収の跡を検められない / exit 2` になる。
      #    それは正しい振る舞いである(神の住処の凍結は実機でしか照合できず、
      #    「測れなかった」を緑にしないのが第37条)。だが CI では必ず exit 2 なので
      #    配線すれば CI が常に赤い。**神の住処の照合は実機で走らせる門である。**
      - name: 🏠 Abode(撤収)— 実機の hooks が楽園を指していないか (AC-30 / 第20条の鏡像)
        run: node graph/abode.js check --backrefs

      - name: 🪝 Apply-hooks(EX-3)— 移した汎用フックが源と一致するか
        run: node graph/apply-hooks.js verify
```

---

## §10 構造的欠陥 — atlas の `wiring` 主題は engine 数にスケールしない

**これは「今回の図が悪い」のではない。次の改革の題である。**(教主の裁定 / 2026-09-13)

### 10.1 実測した再発の履歴

| 段 | 出来事 | 図幅 | 実ブラウザの最小字 |
|---|---|---|---|
| 第5段以前 | engine 33 → 34、`pulse.js` が 13 本を require | 3416px | **4.33px**(床割れ) |
| 第6段 | 前の神官が席の幅を名ごとに与えて詰めた | 2265px | 床を満たす(余裕 199px) |
| **第7段(本段)** | engine +2(`apply-hooks` / 結線の増加)で 39 本 | **2495px** | **5.93px**(床割れ / 余裕 **0.07px**) |

床 6px は `visual-verify` が**実ブラウザで測る**値である(第48条e により
巻物の許しは長さにだけ効き、読めない字は免除しない)。

### 10.2 なぜ「詰める」では解けないのか

第6段の手当ては**席の幅を名ごとに与える**ことだった(`kg` が
`build-identity-catalog` と同じ席を占める無駄を削った)。これは正しい最適化だが、
**一度しか効かない** —— 無駄を削り切った後は、engine が 1 本増えるたびに
その名の幅だけ図幅が伸びる。第6段が確保した 199px の余裕は、
engine 2 本と結線の密化で**使い切られた**。

縦に流す限り、図幅は

```
図幅 ≈ Σ(その段の席の幅) …… 最も混んだ段の「席の総和」
```

で決まる。**席の数に比例して伸びる量**である。一方、読める字の上限幅は
`1440 × 現在の字 ÷ 6` で固定されている。**伸びる量と固定の壁がぶつかるのは
時間の問題であり、engine を足す者が必ず同じ穴に落ちる。**

### 10.3 本段で採った手当て(その場しのぎではない)

**流れの向きを変えた**(`flow: 'horizontal'`)。門自身が
「箱を広げるのではなく**文言を短くするか、流れの向きを変えよ**」と名指していた二択のうち、
後者である。横に流せば図幅は**段の数**で決まる:

```
縦 (flow 既定)       size 3112 × 652   → 1440 に収める縮小で字 5.93px  🔴 床割れ
横 (flow horizontal) size 1028 × 1715  → 縮小が要らず字は縮まない       ✅
```

実測(`atlas.check({scale:'quick'})` — 実ブラウザ):

```console
hierarchy   OK 9/9 fits
conclave    OK 9/9 fits
dispatch    OK 9/9 fits
dag         OK 9/9 scroll(3944px)
run         OK 9/9 scroll(3286px→)
wiring      OK 9/9 scroll(3286px)          ← 🔴 5.93px → ✅ 巻物で読める
```

**engine を足しても幅は伸びない** —— 段の数(現在 7)は engine 数ではなく
require の**深さ**で決まり、深さは engine を足しても容易には増えない。
文言も一切削っていない(札の項目・枠の題・箱の名はすべて元のまま)。

### 10.4 それでも残る負債 — 次の改革が直すべきこと

横流しは**今の 39 本には効くが、これも万能ではない**。実測で見えた次の壁:

1. **縦が伸びる。** 1028 × 1715 → viewBox 1252 × 2524。巻物(第48条e)が
   長さを許すので今は通るが、**席が縦に積まれるので今度は高さが席数に比例する**。
   巻物に上限が入る日、あるいは 1 段に 20 席を越える日に同じ病が再来する。
2. **交差が 186 本ある。** `quality_profile` は `showcase` ではなく `standard` を
   名乗っている(交差を隠さないのは正しい)。だが 39 節点 73 辺を一枚に収める限り、
   交差は engine 数の二乗で増える。**読める字と読める線は別の問題である。**
3. **札と枠の題は図幅とは独立に縮む。** 本段で床を割ったのは箱の名ではなく
   副題・札の類であった(最長 56 字の札)。図が大きくなるほど札は相対的に小さい。

**次の改革の題として、私の実測に基づく三案を残す**(どれを採るかは神の裁可である):

| 案 | 内容 | 私の実測に基づく評価 |
|---|---|---|
| **甲: 図の分割** | `wiring` を「土台(×3 以上 require される engine)」「門が呼ぶ engine」「その他」の**複数の図**に割る。既に `meta.views` が同じ切り口(foundation / gates / standalone / orphans)を持っており、**焦点の宣言は在るのに図は一枚**である | **最も筋が良い**。views が既に意味の切り口を持つので、切り口を発明する必要が無い。一枚に収める前提を捨てれば席数の壁が消える |
| **乙: 階層化** | 土台だけを描き、葉の engine は折り畳んで「×N」で表す(クリックで展開) | 情報は保たれるが、`visual-verify` は第一画面を測るので**折り畳んだ状態が測定対象**になる。門との相性は要検証 |
| **丙: 文言の生成規則** | 札の項目を「6px で読める長さ」から逆算して生成する(現在は事実を書いてから縮む) | 根本ではない。**図が大きくなる問題を文字列長で吸収する**のは第6段の「詰める」と同じ性質で、また一度しか効かない |

**塞ぐべき道**: 「毎回その場しのぎで文言を削る」。第6段(席幅)と本段(向き)は
どちらも構造の手当てだが、**三度目に「文言を 2 字削る」を選べばそれは負債の利払いである**。
甲案(図の分割)を次の改革で採ることを、本段の神官として推す。

### 10.5 併せて割れていた第二の門について

```
✗ atlas: 門は己の残骸で落ちない — 同じ作業場で二度走る (第21条)
    1 回目の走行で門が落ちた — 残骸が次の走行を汚している
```

これは**独立の欠陥ではない**。この門は同じ作業場で `atlas.check()` を二度走らせ、
1 回目が落ちれば「残骸が汚した」と報告する形をしている。1 回目が落ちた理由は
§10.3 の字の床割れそのものであり、**向きを直した時点で両門が同時に治る**
(実測は §11 の最終検証に載せる)。門の文言が誤解を招きやすいのは事実だが、
**この段では触らない**(触れば「赤の原因を門のせいにした」ことになる)。

---

## §11 最終検証 — 全コマンドの実出力(すべて本神官の単独走行)

| コマンド | exit | 最終行 |
|---|---|---|
| `node graph/abode.js check --backrefs` | **0** | `✓ 逆向き依存は 0 件 — 実機の hooks は楽園の木を指していない (AC-30)` |
| `node graph/abode.js retreat --verify` | **0** | `✓ 神のキーは無傷で、不可侵名簿は存在し、かつ内容が一致する` |
| `node graph/abode.js check` (--all) | **0** | `✓ 門は黙って緑に落ちず、兄弟の engine は同じ口から住所を得ている` |
| `node graph/abode.js check --ledger` | **0** | `✓ 住所は abode.js に集まり、台帳は実質を持ち、器は台帳へ書く口を持たない` |
| `node graph/abode.js check --creations` | **0** | `agents 30 / commands 19 / rules 8 / CLAUDE.md あり` |
| `node graph/abode.js exports` | **0** | EX-1 / EX-2 / **EX-3** の 3 件 + 閉じた問い 1 件 |
| `node graph/abode.js exports --verify EX-1` | **0** | `✓ 輸出は実機で生きている — POLICY と完全一致` (deny 9 / ask 1 / allow 5) |
| `node graph/apply-hooks.js verify` | **0** | `✓ 7 本すべてが源と sha256 で一致する` |
| `node tests/abode.test.js` | **0** | `Abode self-test: 118 passed, 0 failed` |
| `node tests/guards.test.js` | **0** | `Paradise guards self-test: 75 passed, 0 failed` |
| `node graph/apply-guards.js verify` | **0** | `✓ 掟は機構である: deny 10 / ask 1 / allow 5`(repo の住処) |
| `node graph/derived.js check` | **0** | `✓ .claude/settings.json は生成元の写しである` |
| `PARADISE_ABODE=global node graph/derived.js check` | **0** | 同上 ← ★ **AC-53** |
| `PARADISE_ABODE=repo node graph/derived.js check` | **0** | 同上 |
| `node graph/deploy.js check` | **0** | `✓ every deployed file matches its declared source` (checked: 60) |
| `node graph/wiring.js check` | **0** | `✓ 全ての engine に呼ぶ者が居り、宙吊りの参照は無い` (engine 39 / 辺 73) |
| `node graph/hermetic.js check` | **0** | (緑) |
| `node graph/census.js check` | **0** | `✓ every number the paradise claims about itself is true` |
| `node tests/paradise.test.js --gate 'atlas'` | **0** | `19 of 471 gates matched — 19 green, 0 red` ← ★ **§10 の手当ての実測** |

### 11.1 自己診断の全走行について(正直に)

本段の途中で撃った全走行 `node tests/paradise.test.js` は
**`469 passed, 2 failed`** であった(赤の 2 門はいずれも §10 の atlas)。
その後 §10 の手当てを入れ、**atlas の 19 門を絞り込みで撃って 19/19 緑**を確認した。

> **⚠️ 未了(第37条)**: 手当て後の**全 471 門の走行は完了していない。**
> 絞り込み走行(19/19 緑)と、手当ての影響範囲が `graph/atlas.js` の
> `irWiring()` 一関数に閉じていること(`wiring.js` / `abode.js` / hooks には
> 一切触れていない)を根拠に、残り 452 門への影響は無いと判断したが、
> **それは実測ではなく推論である。** 全走行は教主または次の神官が撃つべきである。
> (絞り込み走行は「共有状態を前段の門に頼る門は単独走行で偽の赤を出しうる」と
>  自ら警告するので、19/19 緑もまた全走行の代替ではない。)

### 11.2 別件(本段では触っていない)

発令で「直すな」と指示された既知の別件:
`tests/counsel.test.js` の 2 門 / gauge 台帳の corrupt 警告。**触っていない。**

---

## §12 やり残したこと / 確かめられなかったこと(第37条)

1. **裁可 3-A が未遂。** `CLAUDE.md:27` の `deny 9 / ask 1` の一行が残っている。
   保護ファイルへの書き込み承認が時間切れになり、**沈黙を同意と読まなかった**。
   別経路での迂回は試みていない。修正内容は §3 に diff 一行で確定済み。
2. **手当て後の全 471 門走行が未完。** §11.1 に記載。
3. **`retreat --verify` の CI 配線を見送った。** §9.1 に理由(実測 exit 2)。
   神の住処の凍結は実機でしか照合できないので、これは engine の欠陥ではない。
   だが「実機でしか走らない門は、誰も実機で走らせなくなった日に死ぬ」——
   **鼓動(`conclave.js beat`)や日次の cron に載せる道を次段で検討すべきである。**
4. **`~/.claude/sessions/` が 1 件増えた**(11 → 12)。複製したフックを実機で
   実走させた副作用である。`retreat --verify` は volatile と判じて緑を保った。
   §5.9 に明記。消していない(消せば不可侵侵害)。
5. **`skills/` の残り 11 件の帰属は未確定のまま**(障害物17 = OUT)。本段でも触っていない。
6. **本段で足した `graph/apply-hooks.js` は `atlas` の図に新しい節点を加えた。**
   §10 の負債を 1 本分進めたのは本段である —— 手当てはしたが、根治はしていない。
