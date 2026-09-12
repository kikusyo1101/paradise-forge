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
