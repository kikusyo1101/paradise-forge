# 楽園の主権的住処 — 設計書 (reform/sovereign-abode / design)

> **神託**:「グローバルに依存しないようにしたい。Paradise のプロジェクト内だけで完結し、
> グローバルには私が直接追加を依頼したものだけ入れる」
>
> 本書は **設計**である。engine は一行も変えていない。作ったファイルは本書 1 本のみ。
> `~/.claude` には**一切書いていない**。`deploy.js --write` も `apply-*` も走らせていない。
> `git commit` も `gh` も使っていない。
>
> 上流の根拠: `discovery-footprint.md`(668行) / `discovery-scoping.md`(492行) /
> **`requirements.md`(972行 — R-1〜R-12 / AC-1〜AC-56 が本書の主鍵)**。
>
> 測定機: Windows 11 / git-bash(MSYS) / node v24.14.0 / ブランチ `reform/sovereign-abode`
> 起草日: 2026-09-10。本書の数は §11 の実走行に出典を持つ。

---

## 0. 設計の一行

**`graph/abode.js` を「楽園自身の住所を答える唯一の器」として建て、`graph/abode.json` を
「神が名指した輸出の台帳」として置く。engine の `os.homedir()` 16 箇所を全て `abode` 経由に
付け替え、`abode.js check` が三段構え(住所 / 台帳の実質 / 呼び手の実測)で違反を名指す。**

第30条が創造物の住所を `workspace.js` 一箇所に集めたのと同じ形を、**楽園自身の住所**に対して繰り返す。
本書は `workspace.js` (287行) を読み、その形・命名・CLI・除外リストの書き方をそのまま踏襲する。

**本書が §5 で新たに暴いた最重要事実**(要件の時点では未発見):

- **`census.js` の計数は密閉されていない。** 全走行中に版管理下の `README.md` と
  `graph/domains.json` が**故障注入で一時的に書き換えられる**(実測で捕捉)。
  同時に走ると別の答えを返す。**これは「測らずに答えを返す門」であり、今回の改革の主題そのものである。**
- **`455` と `451`/`16` の食い違いの真因は `grep -c '^test('` ではない。**
  `census.summaryOf()` の**保険経路(最後の子集計行に落ちる)**である。実測で再現した(§5.6)。

---

## 1. `graph/abode.js` の完全仕様

### 1.1 既存 `workspace.js` の形 — 何を踏襲するか

`graph/workspace.js` を全文読んだ。踏襲すべき形は六つ:

| # | `workspace.js` の形 | 出典(行) | `abode.js` での対応 |
|---|---|---|---|
| 1 | 冒頭の長い日本語 docblock が **なぜこの器が要るか**を語り、CLI の全サブコマンドを列挙 | 1-22 | 同形。第30条と本改革の関係を冒頭に書く |
| 2 | `REPO_ROOT = path.resolve(__dirname, '..')` を定数化 | 28 | 同一 |
| 3 | `resolve(opts)` が `{root, source, ...}` を返し、**`source` で由来を名乗る** | 36-55 | `resolve()` が全住所 + `source` を返す |
| 4 | 判定は **env → 既定** の一本道。`opts.env` を注入可能にして試験から差せる | 41-43 | 同形 (`opts.env` / `opts.repoRoot`) |
| 5 | **除外リストをコード内に明示**する (`HARDCODE_EXCLUDE_FILES`) — 「除外を暗黙にすると、除外したこと自体が見えなくなる」 | 111-117 | §4.4 で厳格化して踏襲 |
| 6 | 門は**必ず行を名指す** (`out.push({file, line, text, why})`) | 138-144 | 同形 |
| 7 | `check` サブコマンドは全違反を印字して `process.exit(1)`、無違反なら 1 行で `✓` と `exit 0` | 255-283 | 同形 |

### 1.2 公開 API — 全関数シグネチャ

```js
// graph/abode.js
'use strict';

const REPO_ROOT = path.resolve(__dirname, '..');
const LEDGER    = path.join(__dirname, 'abode.json');   // domains.js:29 と同形

/** @typedef {'repo'|'global'} Mode */

/**
 * 楽園自身の住処を解決する。**この関数だけが os.homedir() を呼ぶ。**
 * @param {{env?:object, repoRoot?:string}} [opts]
 * @returns {{
 *   mode: Mode,
 *   source: 'env'|'default',
 *   abode: string,          // 配備の根 (<repo>/.claude か <home>/.claude)
 *   settings: string,       // <abode>/settings.json
 *   agents: string,         // <abode>/agents
 *   commands: string,       // <abode>/commands
 *   rules: string,          // <abode>/rules
 *   skills: string,         // <abode>/skills
 *   claudeMd: string,       // <abode>/CLAUDE.md
 *   kg: string,             // <abode>/paradise-kg  (mode=repo なら <repo>/graph/kg-store)
 *   dailyLedger: string,    // <abode>/paradise-daily.json
 *   creationsAbode: string, // <creations-root>/.claude  (workspace.resolve().root 経由)
 *   home: string,           // os.homedir() の値 (診断専用。住所ではない)
 *   exists: {abode:boolean, settings:boolean, agents:boolean, kg:boolean}
 * }}
 */
function resolve(opts = {}) {}

/** 単一の住所を引く薄い口。未知の key は throw する(黙って undefined を返さない — 第16条)。 */
function pathFor(key, opts) {}         // key: 'abode'|'settings'|'agents'|... → string

/** mode だけを返す。@returns {Mode} */
function mode(opts) {}

/** 台帳を読む。**読むだけ。書く口は存在しない**(第54条(d) / AC-56)。
 *  @returns {{exports:Export[], external:External[], path:string}} */
function ledger(opts) {}

/** 台帳の実質を検める(第二段)。@returns {Finding[]} */
function validateLedger(led) {}

/** id で輸出を引く。無ければ null。@returns {Export|null} */
function exportFor(id) {}

/** 宛先(target 文字列)で輸出を引く。@returns {Export|null} */
function exportForTarget(target) {}

/**
 * **輸出の関門。グローバルへ書く engine は必ずここを通る。**
 * 台帳に無い宛先、または呼び手が writer と食い違えば throw する。
 * 呼び手は引数の自己申告ではなく **new Error().stack から実測**する(第54条(a) / AC-26)。
 * 通した輸出は必ず標準出力へ `[輸出 EX-1] <target> ← <writer>` を印字する(第54条(c) / AC-22)。
 * @param {string} target
 * @param {() => T} write   実際の書き込みを行う関数
 * @returns {T}
 * @throws {Error} 台帳に無い / writer 不一致
 */
function globalWrite(target, write) {}

/** 生産コード中の os.homedir() / '~/.claude' 直書きを走査する(第一段)。
 *  @returns {{file:string, line:number, text:string, why:string}[]} */
function homedirRefs(repoRoot = REPO_ROOT) {}

/** apply-models と apply-spawn が同じ解決器から agents を得ているか(AC-20)。
 *  @returns {{ok:boolean, findings:Finding[]}} */
function symmetry(repoRoot = REPO_ROOT) {}

/** tests/*.js の黙った早期 return を走査する(AC-43/44)。
 *  @returns {{file:string, line:number, text:string}[]} */
function silentGreens(repoRoot = REPO_ROOT) {}

/** 実機 settings.json の hooks が楽園リポジトリの絶対パスを握っていないか(AC-30/31)。
 *  @returns {{event:string, index:number, path:string}[]} */
function backRefs(opts) {}

/** 兄弟倉の神官の実在を検める(AC-46〜50)。
 *  @returns {{ok:boolean, skipped:boolean, reason?:string, counts:object, missing:string[], extra:string[], tracked:boolean}} */
function creationsAbode(opts) {}

/** KG / 日次台帳の移設が完全か(AC-9/10)。
 *  @returns {{ok:boolean, rows:{file:string, from:number, to:number, sha:boolean}[]}} */
function migrateVerify(opts) {}

/** 撤収計画。**--write を持たない。計画を印字するだけ**(AC-29 / R-8)。
 *  @returns {{files:string[], settingsKeys:string[], hooks:object[], refused:{what:string,why:string}[]}} */
function retreatPlan(opts) {}

/** 撤収前後の照合(AC-33〜38)。baseline が無ければ exit 2(skip ではない)。
 *  @returns {{ok:boolean, findings:Finding[]}} */
function retreatVerify(opts) {}

module.exports = {
  resolve, pathFor, mode, ledger, validateLedger, exportFor, exportForTarget,
  globalWrite, homedirRefs, symmetry, silentGreens, backRefs,
  creationsAbode, migrateVerify, retreatPlan, retreatVerify,
  REPO_ROOT, LEDGER, MODES, HOMEDIR_EXCLUDE_FILES,
};
```

### 1.3 `PARADISE_ABODE` の値域と優先順位

```
値域: 'repo' | 'global'   ← この 2 値のみ。他の文字列は exit 2 で拒む(黙って既定へ落とさない)
```

**優先順位(上が勝つ)** — `workspace.js:40-55` と同じ「一本道」:

| 順 | 出所 | 判定 |
|---|---|---|
| 1 | `opts.env.PARADISE_ABODE`(試験からの注入) | `source: 'env'` |
| 2 | `process.env.PARADISE_ABODE` | `source: 'env'` |
| 3 | 既定値 | `source: 'default'` |

**既定値は段階で動く(第0〜3段 = `global` / 第4段以降 = `repo`)。** これが R-12 の心臓である。
既定値は**コード内の一行の定数** `const DEFAULT_MODE = 'global';` で表し、第4段でこの一行だけを
`'repo'` に変える。**既定の反転が 1 行の差分であること**を PR の可読性の要件とする。

**個別 env は廃止しない。** `PARADISE_SETTINGS` / `PARADISE_AGENTS` / `PARADISE_KG` /
`PARADISE_DAILY_LEDGER` / `CLAUDE_HOME` は **`PARADISE_ABODE` より強い**(既存の門と CI が
これで隔離している — `tests/paradise.test.js:154` が `PARADISE_KG` を tmp へ固定している実測が根拠)。
順序は:

```
個別 env (PARADISE_SETTINGS 等) > PARADISE_ABODE > DEFAULT_MODE
```

これを崩すと `tests/paradise.test.js:154` の隔離が壊れ、自己診断が本番 KG を汚す(過去の実事故)。

**`CLAUDE_HOME` の扱い**: `overlay.json:26-29` の `deploy_target.path_env` が `CLAUDE_HOME` なので、
`upstream.claudeHome()` は残す。ただし**その実装を `abode.pathFor('abode')` の薄い委譲に変える**
(§3 の付け替え地図 #12)。`CLAUDE_HOME` は `abode` を上書きする個別 env として生き続ける。

### 1.4 CLI サブコマンドと exit code

```
node graph/abode.js resolve [--json]      住所を印字 (由来つき)
node graph/abode.js path <key>            単一の住所を印字 (スクリプトから引く口)
node graph/abode.js check [--count] [--symmetry] [--silent-green]
                          [--backrefs] [--creations] [--all]
                                          違反の検出。旗が無ければ --all
node graph/abode.js exports [--external] [--verify <id>]
                                          台帳の印字と、輸出が実機で生きているかの照合
node graph/abode.js migrate --plan | --verify
                                          KG / 日次台帳の移設 (--plan は印字のみ)
node graph/abode.js retreat --plan | --verify
                                          撤収の計画と照合 (--write は存在しない)
```

**exit code の意味** — `workspace.js` は 0/1/2 を使う(`init` の倉不在が 2)。同じ三値に揃える:

| code | 意味 | 例 |
|---|---|---|
| **0** | 検めて、違反が無かった | `check` が緑 / `exports` が台帳を印字 |
| **1** | **検めて、違反が在った** | `os.homedir()` が abode 以外に在る / 台帳のエントリが空 / 神のキーが変わった |
| **2** | **検められなかった**(前提が無い / 引数が不正) | `PARADISE_ABODE=nonsense` / `path <未知のkey>` / `retreat --verify` に baseline が無い |
| **3** | 想定外の例外(バグ) | — |

**`2` と `0` を混ぜてはならない。** 第37条: 不在は通過ではない。「検められなかった」を
`0` で返した瞬間、この器は自分が診断している病そのものになる。

**`skip` は口で名乗る。** `check --creations` が兄弟倉不在で通るとき(AC-49)は
`skip('creations abode 不在: <path>')` を**印字して** exit 0。黙って return しない。

### 1.5 何をしないか(境界の明示)

- **`abode.js` は一切書き込みをしない。** `migrate` も `retreat` も `--plan`/`--verify` のみ。
  実際にファイルを動かすのは `deploy.js` / `kg.js` / `daily-guard.js` の既存の口である。
  **住所を知る者と、書く者を分ける** — これも `workspace.js` の形(`init` だけが `mkdirSync` を持ち、
  中身には触れない — 59-71 行)。
- **台帳へ追記する CLI を持たない**(AC-56 / 第54条(d))。

---

## 2. 台帳 `graph/abode.json` のスキーマ

先例は `graph/domains.js` + `graph/domains.json`(engine の隣にデータが住む形)。

### 2.1 フィールドの型と必須性

**`exports[]` のエントリ**

| フィールド | 型 | 必須 | 不正の判定 |
|---|---|---|---|
| `id` | `string` | ✅ | `/^EX-\d+$/` に合わないと exit 1。重複も exit 1 |
| `target` | `string` | ✅ | 空/空白のみ = exit 1。`#/` を含むなら JSON Pointer として解釈 |
| `kind` | `'settings-key'\|'deploy-tree'\|'file'` | ✅ | 列挙外 = exit 1 |
| `writer` | `string` (repo 相対の道) | ✅ | `fs.existsSync(<repo>/<writer>)` が偽 = exit 1 |
| `reason` | `string` | ✅ | 空、または **40 字未満** = exit 1(§2.3) |
| `scope` | `'machine'\|'sibling-worktree'\|'user'` | ✅ | 列挙外 = exit 1 |
| `ordainedBy` | `'god'` | ✅ | `'god'` 以外 = exit 1 |
| `ordainedOn` | `string` `YYYY-MM-DD` | ✅ | 日付として読めない/未来 = exit 1 |
| `ordainedVia` | `string` | ✅ | 空 = exit 1 |
| `verify` | `string` | ✅ | 空 = exit 1 |

**`external[]` のエントリ** — `kind` は `'external-asset'` 固定、`writer` は**禁止**
(楽園は外部資産に書かないため。`writer` が在れば exit 1 = 「読むだけ」の宣言が嘘になる)。

### 2.2 初期エントリ — 実際の JSON 全文

```json
{
  "$schema": "graph/abode.js が validateLedger() で強制する。engine には追記する口が無い (第54条(d))",
  "$note": "この台帳を書けるのは神だけである。変更は PR を通り、マージは神の御手のみ (CODEOWNERS + ブランチ保護)。",
  "exports": [
    {
      "id": "EX-1",
      "target": "~/.claude/settings.json#/permissions",
      "kind": "settings-key",
      "writer": "graph/apply-guards.js",
      "scope": "machine",
      "reason": "deny 9 件 (force-push 3 種 / git reset --hard / commit --no-verify / Edit(~/.claude/**) / Edit(**/.env) / Read(**/.env) / Read(**/.env.*)) は神の全プロジェクトを守る。出所は楽園だが守備範囲はマシン全体である。楽園内へ引けば、神が他所のリポジトリで作業した瞬間に force-push が通る。実測: node graph/apply-guards.js verify → deny 9 / ask 1 / allow 5。",
      "ordainedBy": "god",
      "ordainedOn": "2026-09-10",
      "ordainedVia": "reform/sovereign-abode — 教主の反論1を神が受諾 (requirements.md §1.4)",
      "verify": "node graph/apply-guards.js verify"
    },
    {
      "id": "EX-2",
      "target": "<creations-root>/.claude/{agents,commands,rules,CLAUDE.md}",
      "kind": "deploy-tree",
      "writer": "graph/deploy.js",
      "scope": "sibling-worktree",
      "reason": "創造物は兄弟倉に住む (第30条)。そこで起動した環から神官 30 体が見えなければ、環は神官を失ったまま緑を出す。実測: ../paradise-creations/.claude は存在しない = 現在この倉には神官が一体も居ない。--add-dir は CLAUDE.md も rules も hooks も読まない (discovery-scoping §4 の実測) ため代替にならない。",
      "ordainedBy": "god",
      "ordainedOn": "2026-09-10",
      "ordainedVia": "reform/sovereign-abode — 教主の反論2を神が受諾 (requirements.md §1.4 / §11.1 甲案)",
      "verify": "node graph/abode.js check --creations"
    }
  ],
  "external": [
    {
      "id": "EXT-1",
      "target": "~/AppData/Local/hermes/cron/jobs.json",
      "kind": "external-asset",
      "scope": "machine",
      "reason": "cron は本質的にマシン単位の資産であり、神が意図的に登録した (jobs 2 件)。第46条により発火器は道を指すのであって写経しない。楽園は読むだけで書かない。",
      "ordainedBy": "god",
      "ordainedOn": "2026-09-10",
      "ordainedVia": "reform/sovereign-abode — requirements.md §1.5 (障害物18 を OUT と裁定)",
      "verify": "tests/paradise.test.js:6282 「cron: 日次の発火は道を写経せず、道を指す (第46条)」"
    },
    {
      "id": "EXT-2",
      "target": "~/AppData/Local/hermes/scripts/paradise-catchup.py",
      "kind": "external-asset",
      "scope": "machine",
      "reason": "第43条の見逃し窓の監視。hermes の cron が呼ぶため hermes 側に住む必然がある。正典は tools/paradise-catchup.py であり、配備実物との一致を門が検める。",
      "ordainedBy": "god",
      "ordainedOn": "2026-09-10",
      "ordainedVia": "reform/sovereign-abode — requirements.md §1.5 (障害物18 を OUT と裁定)",
      "verify": "tests/paradise.test.js:6163 「watchdog: 監視スクリプトは正典に住み、配備された実物と一致する (第43条)」"
    }
  ],
  "closed": [
    {
      "id": "CL-1",
      "subject": "~/.claude/settings.json#/env/PATH の復元",
      "question": "apply-guards.js の repairEnv() が神の env.PATH ($PATH:/c/Program Files/GitHub CLI) をキーごと削除した。神託「グローバルには私が直接依頼した物だけ」は、この削除自体が違反だったことを含意する。復元すべきか。",
      "verdict": "実測の上で不要と裁定",
      "evidence": "$ which gh  →  /c/Program Files/GitHub CLI/gh   ── gh は既に素の PATH に居り、失われた env.PATH は現在いかなる実害も無い。第34条の実測どおり $PATH: 前置は展開されず、その行は何も足さず PATH を破壊してフック 15/15 を殺していた。",
      "closedOn": "2026-09-10",
      "closedBy": "pontiff",
      "closedVia": "reform/sovereign-abode design — 教主の実測による裁定 (神の名指しがあれば EX-3 として再開する)"
    }
  ]
}
```

**`model` / `effortLevel` は初期エントリに含めない**(未解決の問い 2)。既定は撤収であり、
神が名指したときだけ `EX-3` として台帳に載る。

**`closed[]` 区画を新設した理由**: 要件の「問い1」を教主が実測で閉じた。閉じた判断を
散文にだけ書けば腐る(第10条: 宣言は機構ではない)。**台帳に残せば、次に誰かが
「env.PATH を戻すべきでは」と言ったとき、機械が答えを持っている。**
`validateLedger()` は `closed[]` にも `evidence` の非空を要求する — 根拠の無い「閉じた」は
自己申告であり、第54条(b) が退ける。

### 2.3 バリデーション規則 — 空・プレースホルダ・不正日付をどう拒むか

第54条の先例(空のマーカー 1 個で三法が素通り)を台帳で再演させないため、
`validateLedger()` は **在ることを資格と認めない**。

```js
const PLACEHOLDER_RE = /^(TODO|TBD|FIXME|XXX|N\/?A|-+|\?+|後で|未定|なし)$/i;
const REASON_MIN = 40;   // 「なぜグローバルでなければならないか」は一文では書けない

function validateEntry(e, i, kind) {
  const F = [];
  const say = (field, why) => F.push({ id: e.id || `<${kind}[${i}] に id が無い>`, field, why });

  // (a) 空 — trim して空、または型が string でない
  for (const k of REQUIRED[kind]) {
    const v = e[k];
    if (typeof v !== 'string' || !v.trim()) say(k, `${k} が空`);
  }
  // (b) プレースホルダ — 「書いた」ふりを退ける
  for (const k of ['target', 'reason', 'ordainedVia', 'verify']) {
    if (typeof e[k] === 'string' && PLACEHOLDER_RE.test(e[k].trim())) say(k, `${k} がプレースホルダ: ${e[k]}`);
  }
  // (c) 実質 — reason が短すぎるのはプレースホルダの変装である
  if (typeof e.reason === 'string' && e.reason.trim().length < REASON_MIN) {
    say('reason', `reason が ${e.reason.trim().length} 字 — なぜ楽園内で足りないかを ${REASON_MIN} 字以上で述べよ`);
  }
  // (d) 日付 — 「読める」だけでなく「実在の日付」かつ「未来でない」
  //     new Date('2026-02-31') は 3/3 に化ける。ゆえに往復で照合する。
  if (typeof e.ordainedOn === 'string') {
    const s = e.ordainedOn.trim();
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
    if (!ok) say('ordainedOn', `ordainedOn が日付として読めない: ${JSON.stringify(s)}`);
    else if (new Date(s + 'T00:00:00Z') > new Date()) say('ordainedOn', `ordainedOn が未来: ${s}`);
  }
  // (e) 列挙値
  if (!KINDS[kind].has(e.kind)) say('kind', `未知の kind: ${e.kind}`);
  if (!SCOPES.has(e.scope))     say('scope', `未知の scope: ${e.scope}`);
  if (e.ordainedBy !== 'god')   say('ordainedBy', `ordainedBy が god でない: ${e.ordainedBy}`);
  // (f) writer の実在 — 実在しないファイルを writer に書けば、誰も書けない輸出になる
  if (kind === 'exports') {
    if (!fs.existsSync(path.join(REPO_ROOT, e.writer || ''))) say('writer', `writer が実在しない: ${e.writer}`);
  } else {
    if ('writer' in e) say('writer', '外部資産に writer を書いてはならない — 楽園は読むだけである');
  }
  // (g) id の形と重複は呼び手側で検める
  return F;
}
```

**AC-25 の期待出力**(要件が要求する形):

```
✗ 台帳の実質が無い (3 件)
  EX-9  target      : target が空
  EX-9  reason      : reason が空
  EX-9  ordainedOn  : ordainedOn が日付として読めない: ""
  → 台帳は在ることが資格ではない (第54条(b))
```

**`node graph/derived.js` に台帳を登録しない。** `abode.json` は**生成物ではなく原本**である
(人が書き、engine は読むだけ)。`derived.js:38-62` の `DERIVED` に入れれば
「中身を前提にした検査を書くな」という規則が掛かってしまい、AC-27 の「EX-1 が在ること」を
検める門が書けなくなる。ここは意図して原本側に置く。

---

## 3. 付け替え地図 — 14 ファイル / 16 箇所

実測(本書起草時に再実行):

```console
$ rg -n "os\.homedir\(\)" graph/*.js tools tests -g '!**/node_modules/**'
graph/apply-models.js:20 / graph/apply-guards.js:70 / graph/kg.js:31
graph/check-agents.js:106 / graph/check-agents.js:205 / graph/export-state.js:23
graph/apply-spawn.js:34 / graph/upstream.js:33 / graph/vendor.js:48 / graph/vendor.js:49
graph/apply-seat.js:31 / graph/pulse.js:320 / graph/ordain.js:47 / graph/daily-guard.js:36
tools/wire-paradise-hooks.js:17 / tools/hooks/paradise-session-start.js:28
tests/dashboard-count.test.js:91 / tests/paradise.test.js:6167,6244,6286
$ rg -o "os\.homedir\(\)" graph/*.js tools -g '!**/node_modules/**' | wc -l
16          ← 生産コードは 14 ファイル / 16 箇所(要件のベースラインと一致)
```

### 3.1 生産コード 14 ファイル / 16 箇所

| # | ファイル:行 | 現行の行 | 変更後の行 |
|---|---|---|---|
| 1 | `graph/apply-guards.js:69-70` | `const SETTINGS = process.env.PARADISE_SETTINGS \|\|`<br>`  path.join(process.env.CLAUDE_HOME \|\| path.join(os.homedir(), '.claude'), 'settings.json');` | `const abode = require('./abode.js');`<br>`const SETTINGS = process.env.PARADISE_SETTINGS \|\| abode.pathFor('settings');` |
| 2 | `graph/apply-models.js:20` | `const AGENT_DIR = process.env.PARADISE_AGENTS \|\| path.join(os.homedir(), '.claude', 'agents');` | `const AGENT_DIR = process.env.PARADISE_AGENTS \|\| abode.pathFor('agents');` |
| 3 | `graph/apply-seat.js:30-31` | `const SETTINGS = process.env.PARADISE_SETTINGS \|\|`<br>`  path.join(process.env.CLAUDE_HOME \|\| path.join(os.homedir(), '.claude'), 'settings.json');` | `const SETTINGS = process.env.PARADISE_SETTINGS \|\| abode.pathFor('settings');` |
| 4 | `graph/apply-spawn.js:32-34` | `const AGENTS_DIR = () => process.env.CLAUDE_HOME`<br>`  ? path.join(process.env.CLAUDE_HOME, 'agents')`<br>`  : path.join(os.homedir(), '.claude', 'agents');` | `const AGENTS_DIR = () => process.env.PARADISE_AGENTS \|\| abode.pathFor('agents');`<br>**← 兄弟の apply-models と同一の口になる(AC-20 の対称性)** |
| 5 | **`graph/check-agents.js:106`** | `const dir = agentsDir \|\| path.join(os.homedir(), '.claude', 'agents');` | `const dir = agentsDir \|\| abode.pathFor('agents');` <br>**§3.2 参照 — env の逃げ道がここで初めて生まれる** |
| 6 | **`graph/check-agents.js:205`** | `const dir = agentsDir \|\| path.join(os.homedir(), '.claude', 'agents');` | `const dir = agentsDir \|\| abode.pathFor('agents');` |
| 7 | `graph/daily-guard.js:35-36` | `const LEDGER = process.env.PARADISE_DAILY_LEDGER \|\|`<br>`  path.join(os.homedir(), '.claude', 'paradise-daily.json');` | `const LEDGER = process.env.PARADISE_DAILY_LEDGER \|\| abode.pathFor('dailyLedger');` |
| 8 | `graph/export-state.js:23` | `const kgRoot = process.env.PARADISE_KG \|\| path.join(os.homedir(), '.claude', 'paradise-kg');` | `const kgRoot = process.env.PARADISE_KG \|\| abode.pathFor('kg');` |
| 9 | `graph/kg.js:31` | `const ROOT = process.env.PARADISE_KG \|\| path.join(os.homedir(), '.claude', 'paradise-kg');` | `const ROOT = process.env.PARADISE_KG \|\| abode.pathFor('kg');` |
| 10 | `graph/ordain.js:47` | `const home = process.env.CLAUDE_HOME \|\| path.join(os.homedir(), '.claude');`<br>`for (const f of fs.readdirSync(path.join(home, 'agents'))) …` | `for (const f of fs.readdirSync(abode.pathFor('agents'))) …`<br>(`home` 変数ごと消える) |
| 11 | **`graph/pulse.js:320`** | `function claudeDir(...seg) { return path.join(os.homedir(), '.claude', ...seg); }` | `function claudeDir(...seg) { return path.join(abode.pathFor('abode'), ...seg); }`<br>**§3.3 参照 — 392/396/397/399/535 が全てここを通るので 1 行で 5 箇所が直る** |
| 12 | `graph/upstream.js:33` | `return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;` | **`expand()` は残す**(上流の `~/Documents/workspace/...` を展開する正当な用途がある)。ただし `claudeHome(c)`(39行) を `function claudeHome() { return abode.pathFor('abode'); }` に置換し、`overlay.json` の `deploy_target.default_path` は**参照されなくなる**(§3.4) |
| 13 | `graph/vendor.js:48-50` | `function expand(p) { … os.homedir() … }`<br>`function claudeHome() { return expand(process.env.CLAUDE_HOME \|\| path.join(os.homedir(), '.claude')); }`<br>`function settingsPath() { return process.env.CLAUDE_SETTINGS \|\| path.join(claudeHome(), 'settings.json'); }` | `function claudeHome() { return abode.pathFor('abode'); }`<br>`function settingsPath() { return process.env.CLAUDE_SETTINGS \|\| abode.pathFor('settings'); }`<br>**`expand()` は削除**(vendor は `~` 付きの道を持たない — 実測で `expand` の呼び手は 49/50 のみ) |
| 14 | `tools/wire-paradise-hooks.js:17` | `const SETTINGS = process.env.CLAUDE_SETTINGS \|\| path.join(os.homedir(), '.claude', 'settings.json');` | **この道具を廃止する**(§3.5)。撤収後は `hooks` を書く口が `apply-guards.js` の一本になる |
| 15 | `tools/hooks/paradise-session-start.js:28` | `return path.join(os.homedir(), 'Documents', 'workspace', 'paradise');` | **フック 6 件の撤収(R-8)でこのファイル自体が配備先から外れる。** ただしファイルは残す(第43条の道具として `PARADISE_ROOT` → 自己位置解決 の 2 段は正しい)。最後の手段の行だけ削り、解決できなければ `process.exit(0)`(第16条: 判定不能を推測で埋めない) |
| 16 | `graph/abode.js`(新設) | — | **`os.homedir()` はここに 1 箇所だけ現れる。** `function home(env) { return env.USERPROFILE \|\| env.HOME \|\| os.homedir(); }` |

### 3.2 `check-agents.js:106,205` — env の逃げ道が無い箇所をどう直すか

**病の実測**(本書で再現):

```console
$ USERPROFILE=<sentinel> HOME=<sentinel> CLAUDE_HOME=<abode> PARADISE_AGENTS=<abode>/agents node <probe>
check-agents.check -> skipped=true ok=true dir=<sentinel>\.claude\agents missing=0
                                    ↑ env を 4 本立てても本物の os.homedir() を見ている
```

**直し方は「env を足す」ではなく「解決器を通す」。**
`agentsDir \|\| abode.pathFor('agents')` に変えれば、`PARADISE_AGENTS` も `CLAUDE_HOME` も
`PARADISE_ABODE` も **全て abode.js の一本道が吸収する**。個別に env を足すのは
「散らばった住所を、散らばったまま逸らせるようにする」だけで、第30条の形に反する。

**しかしこれだけでは AC-17 を満たさない。** 変更後も `installedAgents(dir)` が
「ディレクトリが読めない/空」なら `{ok:true, skipped:true}` を返す(`check-agents.js:200-202,211-213`)。
**リポジトリ内の住処では、神官が居ないのは欠陥である。** ゆえに二つ目の変更が要る:

```js
function check(agentsDir, opts) {
  const dir = agentsDir || abode.pathFor('agents');
  …
  const have = installedAgents(dir);
  if (!have || have.size === 0) {
    // ★ 追加: 引数で明示された道(試験の作り物)なら従来どおり skip。
    //    だが **解決器が答えた住所** で不在なら、mode によって裁きが変わる。
    const explicit = !!agentsDir;
    const m = abode.mode(opts);
    if (!explicit && m === 'repo') {
      return { ok: false, skipped: false, dir, need, sources,
               missing: need, dangling: need.map(a => ({ agent: a, namedBy: sources[a] })),
               note: `リポジトリ内の住処に神官が一体も居ない: ${dir} — node graph/deploy.js --write で建てよ` };
    }
    return { ok: true, skipped: true, dir, need, sources, missing: [], dangling: [],
             note: `harness 不在 (mode=${m}): ${dir}` };
  }
  …
}
```

**`explicit` の分岐が要る理由**: `tests/paradise.test.js:1459`
「check-agents skips silently where no harness is installed」が**存在しない道を明示的に渡して**
`skipped===true` を主張している。この門を殺さずに、既定の住処だけを厳しくする。
これが第36条(門は消すのではなく分ける)の適用である。

### 3.3 `pulse.js:320` — `claudeDir()` の一点突破

`claudeDir()` は `pulse.js` 内の 5 箇所(392 agents / 396 commands / 397 skills /
399 kg / 535 SSE 監視)が全て通る。**320 行の 1 行を変えれば 5 箇所が同時に直る。**

ただし `pulse.js` には固有の落とし穴が二つある:

**落とし穴A — `dashboard-no-deps.test.js:57` の門**:

```js
test('AC-17d: pulse.js は ~/.claude 配下へ書かない(読むだけ)', () => {
  for (const line of pulseSrc.split('\n')) {
    if (!/writeFile|appendFile|mkdir/.test(line)) continue;
    assert.ok(!/\.claude/.test(line), '~/.claude へ書く行が在る: ' + line.trim());
  }
});
```

これは**文字列 `.claude` を含む書き込み行**を禁じている。付け替え後 `claudeDir` から
`.claude` の literal が消えるので、この門は**構文上は通り続けるが、意味を失う**。
→ §5 の「嘘になる門」で扱う(L-9)。

**落とし穴B — `counts` の null 問題**。実測:

```console
$ node -e "…pulse.snapshot()…"                       # 通常
{"agents":30,"commands":19,"skills":13,"kgNodes":120,"errors":0}

$ USERPROFILE=<sentinel> HOME=<sentinel> node -e "…"  # 裸ホーム
{"agents":null,"commands":null,"skills":null,"kgNodes":null,
 "errors":["counts.agents","counts.commands","counts.skills","counts.kgNodes","counts.kgEdges"]}
```

**pulse は既に正しい**(0 で埋めず null を返し、errors に名を載せる)。
AC-19 が要求する「0 を静かに返して緑にしてはならない」は既に満たされている。
→ **AC-19 は「現状維持を証す門」として書く**(回帰防止)。付け替えで壊さないことが要件。

**`counts.skills` の扱い**: `claudeDir('skills')` は付け替え後 `<repo>/.claude/skills` を指すが、
deploy は skills を一度も配備しない(計画 0 件 — discovery §1.2)。よって
**第4段の反転と同時に `counts.skills` は必ず null になる。** これは欠陥ではなく事実だが、
ダッシュボードが「測れず」と表示することになる。設計の裁定: **`counts.skills` を削除しない。**
削除は「数えられるものを数えるのをやめる」ことであり第22条に反する。null + errors で
「楽園は skills を配備していない」を語らせる。

### 3.4 `upstream.js` / `overlay.json` の関係の整理

現行:

```
overlay.json: deploy_target = { path_env: "CLAUDE_HOME", default_path: "~/.claude" }
upstream.claudeHome(c) = expand(env[c.deploy_target.path_env] || c.deploy_target.default_path)
deploy.plan()/check() = up.claudeHome(c)
```

変更後: **`overlay.json` の `default_path` を `abode.js` が上書きする。**

```js
// graph/upstream.js
function claudeHome(_c) { return abode.pathFor('abode'); }   // 引数 c は互換のため残す
```

**`overlay.json` の `deploy_target` ブロックは残す**(vendor の宣言としての価値がある)が、
`$note` を書き換えて「**住所の権威は graph/abode.js に移った。この既定値はもう読まれない**」と
明記する。**読まれない宣言を放置すると、次の者がそれを真実だと読む。**

さらに `abode.js check` に**第四の走査**を足す: `overlay.json` の `default_path` が
`abode.js` の既定と食い違ったまま放置されていないか。→ 食い違いは exit 1(第29条: 派生は真実の写し)。

### 3.5 `tools/wire-paradise-hooks.js` の廃止

- 存在理由が「グローバル settings.json へ SessionStart フックを足す」であり、
  R-8(hooks 6 件の撤収)で**役目そのものが消える**。
- `wiring.js` の孤児検出には掛からない(`tools/` 配下は `SURFACES` の `tool` 面であって
  engine ではない)。掛かるのは `tests/paradise.test.js:6182`「tools: 呼ぶ者の居ない道具は
  住み続けない (第44条)」だが、実測でこの道具は**自分自身の docblock でしか名を呼ばれていない**:

```console
$ rg -n "wire-paradise-hooks" (repo 全体)
tools/wire-paradise-hooks.js:4,9,10,11    ← 自分の docblock
overlay/overlay.json:126                  ← $note が名を呼んでいる ← これが孤児判定を免れさせている
tests/paradise.test.js:6216,6217          ← 名指しの免除リスト
```

**`overlay.json:126` の `$note` が唯一の「呼び手」である。** 註釈が道具を生かしている。
→ 廃止手順: ① `overlay.json:126` の `$note` を書き換える ② `tests/paradise.test.js:6217` の
名指し免除(`f !== 'wire-paradise-hooks.js'`)を外す ③ ファイルを削除。
**②を先にやると門が赤くなる。順序は ①→③→② である**(門を先に緩めない)。

### 3.6 試験側の 4 箇所(生産コードではないが付け替えが要る)

| # | ファイル:行 | 扱い |
|---|---|---|
| T1 | `tests/dashboard-count.test.js:91` | `abode.pathFor('kg')` に付け替え。**門が engine と同じ住所解決を使うことが要件**(でなければ門が engine の嘘を追認する) |
| T2 | `tests/paradise.test.js:6167` | **付け替えない。** EXT-2 の外部資産(hermes)を見る門であり、`os.homedir()` が正しい。§5 の L-6 で `skip()` 化のみ |
| T3 | `tests/paradise.test.js:6244` | **住所を `abode.pathFor('commands')` に付け替える。** §5 の L-5(最重要の嘘) |
| T4 | `tests/paradise.test.js:6286` | **付け替えない**(EXT-1)。§5 の L-7 で `skip()` 化のみ |

---

## 4. 違反を検出する門の設計 — `abode.js check`

### 4.1 三段構えの実装可能な形

第54条の先例(空の `.paradise-source` 1 個で三法が素通り)を踏まえ、**申告を一切信じない**。

#### 第一段: 住所 — ソース走査で `os.homedir()` の直接呼び出しを禁じる

**是。ソースを走査する。** 根拠は `workspace.js:106-148` の先例(`hardcodedRefs`)が
既に同じ手で第30条を強制しており、楽園の流儀に一致するため。かつ実行時検出では
「その経路が今回走らなかった」を「違反が無い」と誤読する(第37条)。

```js
const HOMEDIR_PATTERNS = [
  { re: /\bos\.homedir\s*\(/,                       why: 'os.homedir() の直接呼び出し' },
  { re: /\bprocess\.env\.(USERPROFILE|HOMEPATH)\b/,  why: 'ホームを env から直に読んでいる' },
  { re: /['"`]~\/\.claude/,                          why: "文字列リテラルの '~/.claude'" },
  { re: /path\.(join|resolve)\s*\([^)]*['"`]\.claude['"`]/, why: "path.join の引数の '.claude'" },
  { re: /\bCLAUDE_CONFIG_DIR\b/,                     why: 'CLAUDE_CONFIG_DIR は方式C — 採らないと裁定済み' },
];
```

**走査対象**: `graph/*.js`(1 階層) + `tools/**`(再帰)。`tests/**` は**別の旗**
(`--silent-green`)で扱う — 試験は違反コードを文字列として持つ正当な理由がある
(`derived.js:93-98` が同じ罠を踏んで対処した先例がある)。

**註釈の除外**: `workspace.js:136-137` と同じく、`//` `*` `/*` で始まる行は咎めない。
「註釈は道を説明してよい。咎めるのは実際に走るコードの中の住所だけ。」

**名指しの形**(AC-2 が要求):

```
✗ 楽園の住所を直に作っている engine (1 件) — abode.js を通せ
  graph/pulse.js:320  function claudeDir(...seg) { return path.join(os.homedir(), '.claude', ...seg); }
     os.homedir() の直接呼び出し
```

#### 第二段: 台帳の実質 — §2.3 の `validateLedger()`

#### 第三段: 呼び手の実測 — `globalWrite()` のスタック検査

```js
function callerModule() {
  // Error.stack の 3 行目以降から、最初に現れる「abode.js 以外の repo 内の .js」を採る。
  // 呼び手が「私は apply-guards です」と名乗るフラグは受け付けない(第54条(a))。
  const prev = Error.prepareStackTrace;
  try {
    Error.prepareStackTrace = (_, frames) => frames;
    const frames = new Error().stack;
    for (const f of frames) {
      const file = f.getFileName && f.getFileName();
      if (!file || !file.endsWith('.js')) continue;
      const abs = path.resolve(file);
      if (abs === __filename) continue;                    // 自分自身は飛ばす
      if (!abs.startsWith(REPO_ROOT + path.sep)) continue;  // node 内部を飛ばす
      return path.relative(REPO_ROOT, abs).split(path.sep).join('/');
    }
  } finally { Error.prepareStackTrace = prev; }
  return null;
}

function globalWrite(target, write) {
  const e = exportForTarget(target);
  if (!e) {
    throw new Error(`${target} は台帳に無い輸出である — graph/abode.json に神の名指しが要る (AC-23)`);
  }
  const caller = callerModule();
  if (caller !== e.writer) {
    throw new Error(`${e.id} の writer は ${e.writer} — 呼び手は ${caller ?? '(測れず)'} (AC-26)`);
  }
  const r = write();
  console.log(`[輸出 ${e.id}] ${e.target} ← ${e.writer}`);   // 第54条(c): 黙って通した輸出は 0 件
  return r;
}
```

**`caller === null` は通さない。** 「測れなかった」を「一致した」と読めば、第37条違反である。

**`PARADISE_ABODE=global` でも許可制は外れない(AC-55)。** `globalWrite()` は mode を一切見ない。
`global` は「既定の住所が外を向く」だけであって、「台帳を迂回する」意味を持たない。
この不変条件を `check` が撃つ: `abode.js` のソースに `mode` と `globalWrite` の**同一関数内での参照**が
現れたら exit 1(mode で輸出を分岐させる実装を機械的に禁じる)。

### 4.2 `check` の全旗と、何で赤くなるか

| 旗 | 見るもの | 赤の条件 | AC |
|---|---|---|---|
| `--count` | `graph/*.js` + `tools/**` の `os.homedir()` 出現 | `abode.js` 以外に 1 件でも在る | AC-3 |
| (無旗の第一段) | 同上 + `~/.claude` リテラル + `CLAUDE_CONFIG_DIR` | 同上。**行を名指す** | AC-2, AC-4 |
| (第二段) | `abode.json` の全エントリ | 空/プレースホルダ/不正日付/writer 不在/重複 id | AC-25 |
| (第三段の静的側) | `abode.js` 自身のソース | 台帳へ**書く**関数(`writeFileSync(LEDGER…)` / `add-export` 等)が在る | AC-56 |
| 同上 | `apply-guards.js` の `repairEnv()` | 台帳に無いキーを削除できる状態 | AC-16 |
| `--symmetry` | `apply-models` と `apply-spawn` の agents 解決式 | 同一の呼び口でない | AC-20 |
| `--silent-green` | `tests/*.js` | `existsSync(...)) return` / `if (X.skipped) return` の形が在る | AC-43, AC-44 |
| `--backrefs` | 実機 `~/.claude/settings.json` の hooks | 楽園リポジトリの絶対パスを含む | AC-30, AC-31 |
| `--creations` | 兄弟倉 `<creations>/.claude` | 神官 30 と 1:1 でない / `.claude` が git 追跡されている | AC-46〜50 |
| (overlay 整合) | `overlay.json` の `deploy_target.default_path` | `abode.js` の既定と食い違う | §3.4 |

**`--all`(既定)は上記を全部走らせ、違反を種別ごとに束ねて印字し、1 件でも在れば exit 1。**

### 4.3 `abode.js` 自身の除外を、どう安全にするか(第54条の教訓)

`workspace.js:111-117` は除外を `HARDCODE_EXCLUDE_FILES = new Set(['workspace.js'])` と
**コード内に明示**した。理由も書いてある —「除外を暗黙にすると、除外したこと自体が見えなくなる」。

これを踏襲するが、**第54条は「明示」だけでは足りないことを教えている。**
空の `.paradise-source` は「明示された除外の条件」を満たしていた。**申告が一つで足りたのが病だった。**
ゆえに `abode.js` の自己除外に**四重の錠**を掛ける:

```js
/**
 * 除外は **1 ファイルのみ**。理由: 住所を作ることがこのファイルの職務だからである。
 * 除外を広げてはならない —— 広げた瞬間、この門は自分の穴を自分で開ける。
 */
const HOMEDIR_EXCLUDE_FILES = new Set(['abode.js']);
```

**錠1 — 除外リストの長さを門が固定する。** `abode.js check` 自身が
`HOMEDIR_EXCLUDE_FILES.size === 1` を検め、2 以上なら exit 1:

```
✗ 住所の除外リストが 2 件に増えている: abode.js, pulse.js
  除外は abode.js ただ一つである。増やすなら憲法を改めよ (第54条(d))
```

**錠2 — 除外されるファイルの中身を、門が実測で検める。** 除外は「名前」ではなく
「そのファイルが本当に住所の器か」で与える(第54条(a): 資格は名乗りではなく住所が決める)。
`abode.js` が `resolve` / `pathFor` / `globalWrite` を `module.exports` していることを検め、
していなければ除外を**与えない**:

```js
function exclusionEarned(repoRoot) {
  const src = read(path.join(repoRoot, 'graph', 'abode.js'));
  const need = ['function resolve', 'function pathFor', 'function globalWrite', 'module.exports'];
  const missing = need.filter(n => !src.includes(n));
  return { granted: missing.length === 0, missing };
}
```

**錠3 — 除外の中でも上限を置く。** `abode.js` 内の `os.homedir()` の出現を**1 箇所**に固定する。
2 箇所以上あれば「住所を作る場所が器の中で分裂している」ので exit 1。
(この上限が AC-3 の「`abode.js` 1 ファイル・N 箇所のみ」の N を機械が決める形である。N = 1。)

**錠4 — 除外を適用したなら必ず口で名乗る(第54条(c))。** `check` の出力に常に:

```
· 除外 1 件: graph/abode.js (住所を作るのが職務 / 資格の裏付け: resolve+pathFor+globalWrite を輸出している / homedir 呼び出し 1 箇所)
```

**この 4 行が出ない `check` は、除外を黙って適用している。**
`tests/` 側に「`check` の出力に `除外 1 件:` が現れること」を主張する門を置く。
`critic.js` の `exemption-claim-verified`(この門だけは免除されない)と同じ形である。

### 4.4 実装済み engine への回帰 — `wiring.js` の孤児判定に必ず掛かる

**実測で確かめた重要な落とし穴**:

```console
$ cd <repo の複製> && (graph/abode.js を stub として置く) && node graph/wiring.js check
═══ 🔗 WIRING GATE (第44条 / 第48条) ═══
  engine 37 / 内の辺 53
  🔴 孤児 1: abode
      誰も require せず、門も命令も試験も散文もその名を呼ばない。
  🔴 結線が破れている
EXIT=1

$ node tests/paradise.test.js --gate 'wiring:'
  ✗ wiring: 楽園の結線に孤児も宙吊りも無い (第44条 / 第48条)
Paradise gate-filter: 5 of 455 gates matched — 4 green, 1 red
```

**第0段(器を建てただけ、誰も呼ばない)で CI が赤くなる。**
要件 §6 の第0段は「engine はまだ誰も呼ばない」と書いているが、**それは wiring 門と両立しない。**

**設計の裁定**: 第0段の仕事に「呼び手を最低 1 本作る」を含める。最も軽い呼び手は
**`tests/abode.test.js` の新設**(試験は `SURFACES` の `test` 面として数えられる — `wiring.js:44`)。
第0段で `abode.js` と同時に `tests/abode.test.js` を書き、AC-1/AC-22/AC-25 を撃つ。
これは「門を先に建てる」という楽園の流儀にも合う。

---

## 5. 嘘になる既存の門の全洗い出し 【本書の最重要節】

`tests/*.js` 全 18 ファイル(12,138 行)を横断し、住所が変わることで嘘になる門を全数列挙する。
候補は `--gate` で実測して確かめた(全走行は 455 門 / 約 8 分)。

### 5.0 実測の基点(改革前のベースライン)

```console
$ node tests/paradise.test.js
Paradise self-test: 455 passed, 0 failed          (単独走行 / 約 8 分)

$ node tests/guards.test.js
Paradise guards self-test: 64 passed, 0 failed

$ PARADISE_SETTINGS=/nonexistent/settings.json node tests/guards.test.js
Paradise guards self-test: 60 passed, 0 failed, 4 skipped        ← 4 門が消える

$ node tests/paradise.test.js --gate 'deploy|conclave: 配備|check-agents|seat|配備'
Paradise gate-filter: 23 of 455 gates matched — 23 green, 0 red

$ USERPROFILE=<sentinel> HOME=<sentinel> node tests/paradise.test.js --gate '…同上…'
Paradise gate-filter: 23 of 455 gates matched — 23 green, 0 red   ← 環境差を検出できていない
```

### 5.1 (a) 偽の赤になる門 — 3 件

| ID | ファイル:行 | 門の名 | なぜ偽の赤になるか | 直し方 |
|---|---|---|---|---|
| **L-1** | `tests/paradise.test.js:1744` | `deploy: the deployed tree matches its declared sources` | 第4段の反転直後、`<repo>/.claude` を deploy する**前**に走ると `deploy.check()` が drift を返す。ただし実測では `skipped` に落ちるので赤にはならない(→ L-2 に化ける) | 第2段で `<repo>/.claude` を git 追跡の派生物として先に配備する。**順序が守り** |
| **L-2** | `tests/dashboard-count.test.js:90` | `AC-17a/17b: counts.kgNodes / kgEdges == JSONL の解釈できた行数` | 門(91行)が `os.homedir()` で KG 住所を**再計算**し、engine は `abode.pathFor('kg')` を見る。**二つの住所が割れた瞬間に偽の赤**。実測で再現した(下記) | 門の 91 行を `abode.pathFor('kg')` に付け替える(T1)。**門と engine が同じ解決器を使うこと**が要件 |
| **L-3** | `tests/paradise.test.js:6529` `wiring:` 群 | `wiring: 楽園の結線に孤児も宙吊りも無い` | `abode.js` を建てただけで**孤児**になり赤。実測済み(§4.4) | 第0段で `tests/abode.test.js` を同時に書く |

**L-2 の実測**(リポジトリの複製で `pulse.js` の kgRoot だけを `<repo>/graph/kg-store` に付け替え、
門は付け替えないまま走らせた):

```console
$ node tests/dashboard-count.test.js
  ✗ AC-17a/17b: counts.kgNodes / kgEdges == JSONL の解釈できた行数
  ✓ AC-17c: 壊れた行があっても断面は落ちず、解釈できた行数を返す
dashboard-count: 14 passed, 1 failed
```

**これが「住所が割れると門が嘘の赤を出す」の実証である。**

### 5.2 (b) 黙って skip に落ちる門 — 15 件

#### 5.2.1 `guards.test.js` の 4 門(実測で 64→60 + 4 skipped)

| ID | ファイル:行 | 門の名 | 直し方 |
|---|---|---|---|
| **L-4a** | `tests/guards.test.js:572` | `the real settings.json has no dead and no overfiring matcher` | `G.SETTINGS` が `abode.pathFor('settings')` 経由になるので**自動的にリポ内住処を向く**。加えて `mode==='repo'` なら `skip()` を**禁じ**、不在を赤にする(AC-41) |
| **L-4b** | `tests/guards.test.js:581` | `every matcher on the real machine is classifiable and hits at least one tool` | 同上 |
| **L-4c** | `tests/guards.test.js:591` | `the law IS the machinery on the real machine — permissions present, no drift` | 同上。**掟と機構の乖離を見る唯一の目**(最重要) |
| **L-4d** | `tests/guards.test.js:709` | `the real machine enforces no unconditional BLOCK` | 同上 |

**「向け直すだけ」では足りない**(要件 R-10 が明言)。実機に残る EX-1 を見る門を**新設**する:

```js
// tests/guards.test.js に新設 (AC-42)
test('台帳 EX-1 は実機で生きている (輸出の腐食を見張る)', () => {
  const abode = require('../graph/abode.js');
  const ex1 = abode.exportFor('EX-1');
  assert.ok(ex1, 'EX-1 が台帳から消えた — permissions を守る者が居なくなる');
  const real = ex1.target.split('#')[0].replace(/^~/, os.homedir());
  if (!fs.existsSync(real)) skip(`実機の ${real} が無い — EX-1 は検めない`);   // ★ 名乗る
  const s = JSON.parse(fs.readFileSync(real, 'utf8'));
  assert.ok(G.permissionsMatch(s.permissions, G.POLICY),
    'EX-1 の輸出が腐っている — 実機の permissions が POLICY と食い違う');
});
```

**この門が向け直した 4 門の「片翼」である。** 実測で確かめた:

```console
$ PARADISE_SETTINGS=<リポ内住処の写し>/settings.json node tests/guards.test.js
Paradise guards self-test: 64 passed, 0 failed        ← 向け直せば 4 門は生きる

$ (その写しに死んだ matcher を 1 本注入) → 同上
  ✗ the real settings.json has no dead and no overfiring matcher
  ✗ every matcher on the real machine is classifiable and hits at least one tool
Paradise guards self-test: 62 passed, 2 failed        ← 向け直した先でも噛む (AC-40 の実証)
```

#### 5.2.2 「静かに緑」に落ちる門 — `existsSync(...) return` 形 7 hit / `skipped) return` 形 6 hit

実測(要件のベースラインと一致):

```console
$ rg -n "existsSync\([^)]*\)\) return" tests/*.js | wc -l
7
$ rg -n "if \(\w+\.skipped\) return" tests/*.js
tests/counsel.test.js:189 / tests/paradise.test.js:1440,1746,2259,2270,2284
```

| ID | ファイル:行 | 門の名 | 分類 | 直し方 |
|---|---|---|---|---|
| **L-5** | `tests/paradise.test.js:6242`(return は 6245) | `conclave: 配備された道は正典と一致する (第29条)` | **住所も古い** | 6244 行を `abode.pathFor('commands')` へ付け替え + `skip()` 化。**mode=repo なら不在は赤**(配備の欠損である) |
| **L-6** | `tests/paradise.test.js:6163`(条件は 6167) | `watchdog: 監視スクリプトは正典に住み、配備された実物と一致する (第43条)` | EXT-2 | 住所は据え置き。`if (!exists) skip('EXT-2 未配備: <path>')` に変える |
| **L-7** | `tests/paradise.test.js:6282`(return は 6287) | `cron: 日次の発火は道を写経せず、道を指す (第46条)` | EXT-1 | 同上。かつ 2 段目の `if (!prompts.length) return;`(6291付近)も `skip()` へ |
| **L-8** | `tests/paradise.test.js:1744`(return は 1746) | `deploy: the deployed tree matches its declared sources` | 住処依存 | `if (r.skipped)` を `skip(r.note)` に。mode=repo なら `assert.fail` |
| **L-9** | `tests/paradise.test.js:1435`(return は 1440) | `every phase in every forge scale names an agent that actually exists` | 住処依存 | 同上 |
| **L-10** | `tests/paradise.test.js:2256`(2259) | `hierarchy: believers have bodies, not merely names (Art.25)` | 住処依存 | 同上 |
| **L-11** | `tests/paradise.test.js:2265`(2270) | `hierarchy: a priest with believers can actually dispatch them (Art.25)` | 住処依存 | 同上 |
| **L-12** | `tests/paradise.test.js:2276`(2284) | `hierarchy: the gate fires when a believer loses its body (Art.25)` | 住処依存 | 同上 |
| **L-13** | `tests/counsel.test.js:186`(189) | `counsel の道が名指す神官は全て clergy に実在する` | 住処依存 | 同上 |
| **L-14** | `tests/paradise.test.js:2961`(2965) | `gauge: 実在の run-state を採点できる — coin は habit より健全` | 兄弟倉依存 | `skip('倉に coin/habit が無い')` へ。**abode の変更とは無関係だが AC-43 が 0 件を要求する** |
| **L-15** | `tests/paradise.test.js:5604`(5607) | `gauge: 門は実台帳を一行も書き換えない (AC-9c / 第30条)` | 兄弟倉依存 | 同上 |
| **L-16** | `tests/dashboard-no-deps.test.js:67`(69) | `AC-10b: package.json が無いか、dependencies が 0 件` | 無関係 | `skip('package.json 不在')` へ(AC-43 の 0 件要件) |
| **L-17** | `tests/dashboard-links.test.js:81`(89) | `AC-19d: control.html と atlas 各枚に index への戻りリンクが在る` | 無関係 | 同上 |

**除外**: `tests/paradise.test.js:5006` は**変異注入の文字列リテラル**であり、実コードではない。
`--silent-green` の走査は `derived.js:96-98` と同じ手で「行全体が引用符に包まれた疑似コード」を除く。

**`paradise.test.js` に `skip()` が無い問題**: 実測で `paradise.test.js` の `test()`
(70-87行)は **skip の概念を持たない**。`guards.test.js:22-30` は持つ。
→ **第3段の仕事に「`paradise.test.js` の `test()` に skip 機構を移植する」を含める。**
移植先は `// >>> gate-filter: 絞り込み塊` の**内側**(`test()` の本体)であり、
`tests/paradise.test.js:8281` の門「gate-filter: 絞り込みは環境変数を読まない」が
**この塊に `process.env` が現れることを禁じている**。skip の実装で env を読んではならない。
**これは実装時に踏み抜きやすい罠なので、ここで名指ししておく。**

### 5.3 (c) 内容が古い前提を符号化している門 — 8 件

| ID | ファイル:行 | 何を符号化しているか | 改革後にどう嘘になるか | 直し方 |
|---|---|---|---|---|
| **L-18** | `tests/dashboard-no-deps.test.js:57` | `pulse.js` の書き込み行に文字列 `.claude` が現れないこと | 付け替えで `claudeDir` から `.claude` の literal が消える。**門は通り続けるが何も見ていない**(静かな緑の最悪形) | 主張を**住所ベース**に変える: `pulse` のソースから `writeFile\|appendFile\|mkdir` の行を採り、`abode.pathFor('abode')` 配下を指す式(`claudeDir(` / `abode.`)を含まないことを検める |
| **L-19** | `tests/guards.test.js:159` | `POLICY.deny` に `Edit(~/.claude/**)` が在ること | **EX-1 の輸出先はグローバルのまま**なので嘘にならない。ただし第4段以降、楽園自身の配備物は `<repo>/.claude` に住むので、この deny は**楽園の配備物をもう守っていない** | deny を**足す**: `Edit(<repo>/.claude/**)` 相当。ただし permissions は相対パスを解さないので、`apply-guards.POLICY` を静的定数から `abode` 依存の生成に変える必要がある → **これは第29条(派生は真実の写し)の問題であり、work-6 で扱う** |
| **L-20** | `tests/paradise.test.js:1775` | `deploy: paradise-owned files come from the repository, not from ~/.claude` | 門の**名前**が `~/.claude` を指しているが、中身は `s.src.includes('overlay')` を見るだけ。付け替え後も正しい | 名前を「配備先ではなく overlay から来る」に改める(嘘ではないが誤読を招く) |
| **L-21** | `tests/counsel.test.js:208` | エラーメッセージが `~/.claude/agents は deploy.js の成果物` と述べる | 第4段以降、成果物は `<repo>/.claude/agents` | メッセージを `abode.pathFor('agents')` から生成する |
| **L-22** | `tests/paradise.test.js:6216-6217` | `wire-paradise-hooks.js` を**名指しで免除**している | §3.5 で道具を廃止すると、免除リストが**存在しないファイルを守る**ようになる | 廃止と同時に 6217 行の `&& f !== 'wire-paradise-hooks.js'` を削る。**順序: ①overlay.json の $note → ③ファイル削除 → ②免除解除** |
| **L-23** | `tests/paradise.test.js:1459` | `check-agents skips silently where no harness is installed` — 存在しない道を明示的に渡して `skipped===true` を主張 | §3.2 の変更で **`explicit` の分岐を入れなければこの門が赤になる** | 分岐を入れて門を保存(第36条: 門は消すのではなく分ける)。かつ**逆の門を新設**: 解決器が答えた住所で mode=repo なら赤 |
| **L-24** | `tests/paradise.test.js:1751` | `deploy: check skips cleanly where no harness is installed` — `typeof r.skipped === 'boolean'` しか見ない | 型しか見ないので永久に緑。**第37条の観点では既に門ではない** | mode ごとの期待を書く: `mode==='global'` なら skip 可、`mode==='repo'` なら `skipped===false` を要求 |
| **L-25** | `tests/paradise.test.js:2231-2237` | `independence: hiding the upstream does not change the deployment (Art.20)` — `PARADISE_UPSTREAM` を潰して `deploy.plan()` の総数が変わらないことを見る | **`plan()` は変わらないが `check()` は skip する。** 実測: `PARADISE_UPSTREAM=/nonexistent` で配備先が在っても `deploy.check()` が `skipped:true` を返す | `deploy.check()` の skip 条件から `!fs.existsSync(UP)` を外す(`deploy.js:129-134`)。上流は「在れば見る」ものであり、**配備の照合には要らない**(第19条(d))。この 1 行が CI で 5 門を空回りさせている |

**L-25 の実測**(これは要件が捉えていなかった発見):

```console
$ PARADISE_UPSTREAM=/nonexistent node -e "…deploy.check()…"
{"skipped":true,"ok":true,"checked":0,"note":"no harness on this machine — nothing deployed to verify"}
   ↑ 配備先 C:\Users\kikus\.claude は実在するのに skip している
$ PARADISE_UPSTREAM=/nonexistent node tests/paradise.test.js --gate 'deploy:'
Paradise gate-filter: 5 of 455 gates matched — 5 green, 0 red    ← 5 門とも空回りで緑
```

**CI(clone 直後)には上流が無いので、`deploy` 系 5 門は CI で常に空回りしている。**
改革でこれを直さないと、第2段で `<repo>/.claude` を git 追跡にしても CI は永久に検めない。

### 5.4 (d) 【新発見】密閉されていない門 — census の非密閉性 4 件

> 教主が実測で名指しした事象。本書で真因を突き止めた。

#### 5.4.1 現象

教主の走行と本書の走行が同時に走り、`census.js check` が**別々の嘘の数**を返した:

```
教主の観測:  🔴 README テスト数: doc says 455/455, reality is 16/16
本書の観測:  🔴 README テスト数: doc says 455/455, reality is 451/455
かつ git が実在しないファイル (tests/thing.test.js, graph/thing.js,
reform/demo/*.md, tests/unrelated.test.js) について警告を吐いた
```

#### 5.4.2 真因(1) — **走行が版管理下のファイルを一時的に書き換える**

**実測で捕らえた**(リポジトリの複製で git init し、15ms 間隔で `git status` をサンプリング):

```console
$ node <watch.js> <repo複製> 'lexicon: 門は己の作業場の残骸'
[tick 2] DIRTY: ?? verdict-report.json
[tick 2] DIRTY: ?? verdict.md
[tick 7] DIRTY: M README.md            ← ★ 版管理下の README.md が書き換えられている
child exit 0 ticks 12
汚れた版管理下ファイル: ?? verdict-report.json | ?? verdict.md | M README.md
走行後の git status: "?? out.txt"       ← 走行後は復元される

$ node <watch.js> <repo複製> '異名|第52条: 実在だけでは足りない'
[tick 10] DIRTY: M graph/domains.json  ← ★ 台帳が書き換えられている
汚れた版管理下ファイル: M graph/domains.json
走行後の git status: "?? out.txt"
```

出所は 2 箇所、いずれも**故障注入の門**である:

| 場所 | 何を汚すか | コード |
|---|---|---|
| `tests/paradise.test.js:6131,6140,6147` | `README.md` | `const victim = path.join(ROOT, 'README.md'); … fs.writeFileSync(victim, victimOrig + '\n' + debrisText); … finally { fs.writeFileSync(victim, victimOrig); }` |
| `tests/paradise.test.js:7079,7093` / `7828,7855` | `graph/domains.json` | `fs.writeFileSync(domainsT.LEDGER, JSON.stringify(led, null, 2)); … finally { fs.writeFileSync(domainsT.LEDGER, backup); }` |

**どちらも「現物を汚して門が鳴ることを証す」という正しい動機から生まれている**
(6127 行の註釈: 「作り物のファイルではなく**現物**を汚す — 門が現物を歩いていることまで含めて測るため」)。
**動機は正しい。だが密閉されていない。**

**影響**: この窓(実測で 15ms×5 tick ≈ 75ms 前後)に別のプロセスが `README.md` を読めば、
`census.js` も `clergy.js lexicon-check` も**汚染された現物**を見る。実測で再現した:

```console
$ (README.md に異名を 1 行足した状態で) node graph/clergy.js lexicon-check
  🔴 README.md:372  「司祭」→「神官」  位階 priest の正典の名は「神官」(Priest) — 「司祭」は異名 (第41条)
```

#### 5.4.3 真因(2) — **`census.summaryOf()` の保険経路**

**455 と 451/16 の食い違いの真因は `grep -c '^test('` ではない。** 実測で確認した:

```console
$ grep -c "^test(" tests/paradise.test.js      → 447
$ grep -c "^\s*test(" tests/paradise.test.js   → 448   (字下げは 1 本だけ: 2762 行のループ内 test)
$ node tests/paradise.test.js  → Paradise self-test: 455 passed, 0 failed
```

**447 でも 448 でもなく 455 が正しい。** `census.js` は `grep` を使っていない —
`census.js:90` が**自己診断を子プロセスで走らせ、その出力を読む**(`summaryOf`)。

`summaryOf`(`census.js:54-61`)は二段構えである:

```js
const named = String(out).match(/Paradise self-test:\s*([0-9]+) passed, ([0-9]+) failed/);
if (named) return { passed: +named[1], failed: +named[2] };
const all = [...String(out).matchAll(/([0-9]+) passed, ([0-9]+) failed/g)];
if (!all.length) return null;
const last = all[all.length - 1];              // ★ 保険経路
return { passed: +last[1], failed: +last[2] };
```

**保険経路が「最後の子テスト集計行」を拾う。** 実測で再現した:

```console
$ node <summ.js> <full.txt>
完走出力              -> {"passed":455,"failed":0,"via":"named"}
途中で死んだ出力(340行) -> {"passed":16,"failed":0,"via":"fallback(last child line)"}   ← 教主の 16
途中で死んだ出力(400行) -> {"passed":16,"failed":0,"via":"fallback(last child line)"}
途中で死んだ出力(650行) -> {"passed":11,"failed":0,"via":"fallback(last child line)"}
```

出力に現れる子集計行(実測):

```
dashboard-count: 15 / dashboard-no-deps: 10 / dashboard-links: 6 / dashboard-no-hardcode: 8
dashboard-transport: 8 / dashboard-freshness: 6 / dashboard-states: 12
dashboard-run-panel: 16   ← 333 行目。ここまでで打ち切られると「16」
abandoned-run: 11         ← 648 行目。ここまでで打ち切られると「11」
```

**`16` は `dashboard-run-panel: 16 passed, 0 failed` である。** 教主の走行は
`dashboard-run-panel` の直後(333〜647行のどこか)で子プロセスが**落ちた/打ち切られた**。
落ちた原因は §5.4.2 の並行汚染(汚れた `README.md` を読んだ `lexicon` 門が赤 → exit 1)である。

**`451` は何か。** 本書の走行では**完走したが 4 門が赤**だった。
`census.js:99-101` は「走り切ったが exit != 0 なら、その数は事実なので読む」として
`stdout` から `summaryOf` を読む。`451 passed, 4 failed` → `451/455`。
**4 門の赤は、教主の走行が同時に `README.md` / `domains.json` を汚していたためである。**

#### 5.4.4 これが今回の改革の主題そのものである理由

`census.js` は「楽園が己について語る数」を守る門である。その門が

- **測る対象(README.md)を、測っている最中に自分で汚す**
- **測れなかったとき、部分値を「測れた」ふりで返す**(保険経路)

の二つを同時に持っている。**これは「測らずに答えを返す門」であり、
`check-agents` の `skipped=true ok=true` と同じ形である。**
第37条(不在は通過ではない)と第16条(判定不能は緑ではない)の正面違反。

#### 5.4.5 直し方 — 4 件

| ID | 対象 | 直し方 |
|---|---|---|
| **L-26** | `census.js:54-61` `summaryOf` の保険経路 | **保険経路を削除する。** `Paradise self-test:` を名乗る行が無ければ `null` を返す(= 測れなかった)。理由: 保険が守ろうとした「版が変わった場合」は、`tests/paradise.test.js:8347` の門「絞り込んだ走行は `Paradise self-test:` を名乗らない」が既に名乗りの契約を機械で守っている。**契約が門で守られている以上、保険は嘘の温床でしかない。** 削除後、`census.check()` は `measurable()` が偽になり**その主張を裁かない**(既存の設計どおり) |
| **L-27** | `tests/paradise.test.js:6131-6147`(README 汚染) | 汚染の対象を**複製**に変える。`clergy.js lexicon-check` に `--root <dir>` を足し、`fs.cpSync(ROOT, tmp)` した複製の README を汚して撃つ。**現物を歩くことは `withDebris`(A の側)で既に証されており、汚染(B の側)は複製で足りる** |
| **L-28** | `tests/paradise.test.js:7079-7093` / `7828-7855`(domains.json 汚染) | `domains.js` の `LEDGER` を **env で差せるようにする**(`PARADISE_DOMAINS_LEDGER`)。`gauge` が `PARADISE_CREATIONS` で仮倉へ振り替える先例(`tests/paradise.test.js:4902-4916` の `withGaugeSandbox`)と同形。**楽園には既にこの型がある** |
| **L-29** | (新設の掟) | **重い門を一時複製で走らせる設計は、並行実行で壊れないことを門自身が保証せねばならない。** §6 の第58条(c) に落とす。機構: `abode.js check --hermetic` が `tests/*.js` を走査し、**`ROOT`/`__dirname`/`DIR` 起点の版管理下ファイルへの `writeFileSync` を検出して名指す**。除外は「直後に `finally` で復元する」ことではない(復元しても窓は開く)。除外は「複製に対して書いている」ことだけ |

**`--hermetic` の走査規則**:

```js
// 版管理下の道へ書く行を咎める。tmpdir / mkdtemp / 複製への書き込みは咎めない。
const REPO_WRITE_RE = /(writeFileSync|appendFileSync|rmSync|unlinkSync)\s*\(\s*(victim|[A-Za-z_$][\w$]*\.LEDGER|path\.join\s*\(\s*(ROOT|DIR|__dirname))/;
// 例外: 直前 25 行以内に mkdtempSync / cpSync が在り、書き込み先の変数がその配下なら許す
```

**この門は自分自身にも掛かる**(`abode.js check` が `tests/` を走査する以上、
`tests/abode.test.js` も走査対象である)。第54条(d): 裁かれる側が裁きの範囲を決めてはならない。

### 5.5 洗い出しの総括 — 29 件

| 分類 | 件数 | ID |
|---|---|---|
| (a) 偽の赤になる | 3 | L-1, L-2, L-3 |
| (b) 黙って skip / 静かな緑に落ちる | 15 | L-4a〜d, L-5〜L-17 |
| (c) 古い前提を符号化 | 8 | L-18〜L-25 |
| (d) 密閉されていない(新発見) | 3 + 掟 1 | L-26, L-27, L-28 + L-29 |
| **計** | **29** | |

**新設が要る門**: AC-42(EX-1 の輸出を見る目) / AC-19 の逆(pulse が 0 を静かに返さない) /
`check-agents` の mode=repo 赤 / `deploy.check` の mode=repo 赤 / `abode.js` の除外の裏付け /
`--hermetic`。**合計 6 本以上の新設**を第3段で建てる。

---

## 6. 憲法に条を足すか — 足す(第58条を起草した)

### 6.1 足す理由

既存の 57 条を検めた。**本改革が要求する三つの掟のうち、二つは既存条の射程外である。**

| 本改革の掟 | 既存条との関係 | 判定 |
|---|---|---|
| 「楽園自身の住所を知る器は一つ」 | **第30条は創造物の住所しか語っていない。** 30条の文面は "creations live outside the paradise, and the engine holds exactly one road to them: `graph/workspace.js`"。**楽園自身の住所は誰も守っていない** | **射程外 → 新条が要る** |
| 「グローバルへの輸出は台帳に載った物だけ」 | 第20条(a) は「配備物・設定・フックは楽園が所有しない木を指してはならない」= **楽園→外**の禁止。今回は**外→楽園**の逆向き、および「外へ出す物の許可制」。第57条(d) は「グローバルの強制に置いてよいのは人の既定であって仕事の規約ではない」= **何を置くか**の質を語るが、**誰が許すか**を語らない | **重複せず、補完する → 新条が要る** |
| 「測る対象を測りながら汚すな」 | 第37条(不在は通過ではない)、第16条(判定不能は緑ではない)、第21条(狼少年より無言がまし)のいずれも**近いが射程が違う**。「門が己の測定対象を破壊する」という形は、どの条も名指していない | **射程外 → 新条に含める** |

### 6.2 既存条との重複・矛盾の検め

| 条 | 内容 | 第58条との関係 |
|---|---|---|
| **第19条** | 「取り込んだものは楽園の所有。配備物は成果物であって原本ではない。上流は供給源ではない」 | **矛盾なし・強化する。** 第19条(b)「`~/.claude` は `overlay/` からいつでも建て直せる」は、住所が `<repo>/.claude` に移っても**そのまま成り立つ**。第58条は「その住所を誰が決めるか」を足すだけ |
| **第20条** | 「楽園は自分の足で立つ。何も外を指してはならない」 | **矛盾なし・鏡像を補う。** 20条(a) は楽園→外。第58条(b) は外→楽園(hooks 6 件の逆向き依存)を扱う。**方向が違うので条を分ける**(第36条: 門は消すのではなく分ける) |
| **第29条** | 「派生物は真実の写しであって真実ではない。中身を前提にした検査を書くな」 | **注意が要る。** `<repo>/.claude/settings.json` を git 追跡の派生物にする(AC-14)ので、第29条が「その中身を前提にした検査を書くな」と命じる。**だが AC-15 は中身を検めることを要求する。** 矛盾ではない — 第29条が禁じるのは「**生成元が無い環境で落ちる**検査」であり、`apply-guards.POLICY` は**engine の定数なので常に在る**。`derived.js` の `DERIVED` に `.claude/settings.json` を**登録し**、`needs: null`(生成元は engine 自身)と宣言することで整合させる。**この一点は実装で踏み抜きやすいので第58条の本文に明記した** |
| **第30条** | 「作る物と作られる物は家を共にしない。創造物の住所は `workspace.js` だけが知る」 | **矛盾なし・同型を楽園自身に適用。** 第58条の本文で第30条を明示的に引き、「30条の形を作る側に折り返す」と述べる |
| **第37条** | 「不在は通過ではない」 | **矛盾なし・具体化する。** 第58条(d) が「住処が無いことを skip と呼んでよいのは mode=global のときだけ」と射程を切る |
| **第54条** | 「門は免除の自己申告を信じない。資格は住所が決める」 | **矛盾なし・最も強く継承する。** 台帳の三段構え(§4.1)は 54条(a)(b)(c)(d) の逐条適用である。第58条は 54条を**輸出**という新しい対象へ延長する |
| **第57条** | 「修理は掟を広げてはならない」(d)「グローバルの強制は他人のリポジトリを壊す。規約はリポジトリと共に配られよ」 | **矛盾なし・実行する。** 57条(d) は「置くな」と命じたが、**既に置かれている物をどう引くか**を語らなかった。第58条(b)(c) がその手順(台帳と撤収)を機構化する |

**結論: 重複も矛盾も無い。第58条を足す。**

### 6.3 第58条の本文(起草)

```
58. **楽園自身の住処を知る器は一つである。外へ出す物は、神が名指した台帳に載った物だけである。**
    第30条は**作られる物**の住所を一箇所に集めた —— `graph/workspace.js` ただ一つが
    創造物の倉を知る。だが**作る物自身**の住所は、誰も守っていなかった。実測:
    `os.homedir()` は生産コードの **14 ファイル / 16 箇所**に散らばり、うち
    `check-agents.js` と `pulse.js` は env の逃げ道を **一つも持たなかった**。

        $ USERPROFILE=<sentinel> CLAUDE_HOME=<別の住処> PARADISE_AGENTS=<別の住処> node <probe>
        check-agents.skipped -> true   ok -> true      ← 測らずに緑を返している

    **env を四本立てても、engine は本物のホームを見ていた。** 宣言は内を向き、
    実測は外を向く —— 第10条が禁じた形が、住所という最も静かな場所に住んでいた。

    (a) **住所を作れる場所は一つである。** `os.homedir()` も `~` の展開も
    `CLAUDE_CONFIG_DIR` も、`graph/abode.js` の外に現れてはならない。散らばった住所は
    移した瞬間に嘘になる。門はソースを走査し、**行を名指して**咎める —— 名指ししない門は、
    赤くなっても直せない(第30条の `workspace.js check` と同じ形である)。
    **除外は `abode.js` ただ一つ**であり、その除外は名前ではなく**実質**が与える:
    そのファイルが本当に住所の器を輸出していることを門が確かめる(第54条(a))。
    除外を適用したなら必ず口で名乗る(第54条(c))。除外が二つに増えたら、それは条の改正である。

    (b) **グローバルへ出す物は、神が名指した台帳に載った物だけである。**
    「グローバルには私が直接依頼した物だけ入れる」——これは engine の判断で
    足すことも引くことも禁じる。ゆえに輸出は `graph/abode.json` に登録され、
    各エントリは **なぜ楽園の内側で足りないか**を述べ、**誰がいつ名指したか**を持つ。
    **engine は台帳へ書く口を持たない** —— 持てば、裁かれる側が裁きの範囲を決めることになる
    (第54条(d))。台帳の変更は PR を通り、マージは神の御手のみである。
    第一号は `~/.claude/settings.json#/permissions` である:出所は楽園だが、
    その deny 9 件が守るのは神の全プロジェクトであり、**出所を理由に機械的に引けば、
    神が他所のリポジトリで作業した瞬間に force-push が通る。**
    **出所と守備範囲は別である。** 台帳はその区別を記録する場所である。

    (c) **門は、己が測る対象を測りながら汚してはならない。**
    実測された事故: 楽園の自己診断は、故障注入のために**版管理下の `README.md` と
    `graph/domains.json` を書き換えて元に戻す**。動機は正しい ——「現物を歩いていること」
    まで測るためである。だがその窓の間に別のプロセスが同じ現物を読み、**汚染された
    README を見て赤を出した**。同じ命令が、同時に走ると別の答えを返す。

        教主の走行:  reality is 16/16      ← 子集計行 `dashboard-run-panel: 16 passed` を拾った
        本書の走行:  reality is 451/455    ← 汚染で 4 門が落ちた走行の数
        単独の走行:  Paradise self-test: 455 passed, 0 failed

    **測定が測定を壊すなら、その数は測定ではない。** ゆえに故障注入は**複製**に対して行い、
    版管理下の現物へ書く門は、複製への振替を機構で持たねばならない
    (`gauge` が `PARADISE_CREATIONS` で仮倉へ振り替える先例が既に在る)。

    (d) **測れなかったことを、部分の値で埋めてはならない。** 同じ事故の第二の原因は、
    集計を読む器の**保険経路**だった —— 名乗りの行が見つからなければ「最後に現れた
    `N passed` の行」に落ちる。その行は子テストの集計であり、**打ち切られた走行の
    途中の数が「楽園のテスト総数」として README に書かれかけた。**
    契約が門で守られているなら、保険は嘘の温床でしかない。**読めなければ null を返し、
    測れなかったと表明せよ**(第16条・第37条)。

    (e) **住処の不在を skip と呼んでよいのは、外を向いていると名乗ったときだけである。**
    リポジトリ内の住処で配備物が無いのは「ハーネス不在」ではなく「派生物の欠損」である。
    ゆえに `PARADISE_ABODE=repo`(既定)では不在は**赤**であり、
    `PARADISE_ABODE=global` を明示したときだけ、**理由を名乗った skip** として数えられる。
    黙って早期に return する門は、`N skipped` にすら数えられない —— 門が死んだことに
    誰も気づけない(第37条)。

    **これを強制する門**: `graph/abode.js` の `check`(住所の走査 / 台帳の実質 /
    呼び手の実測 / 除外の裏付け / 静かな緑 / 密閉性)と `globalWrite`(輸出の関門)。
    回帰は `tests/abode.test.js` が、活きた脱法(台帳に無い宛先への書き込み・
    writer を詐称した呼び出し・空のエントリ・除外の水増し)を実際に仕込んで撃つ。
```

**追加後の手順**(楽園の掟):

```bash
node graph/codex.js index --write
node graph/codex.js check
node graph/census.js fix     # 条数を README へ書き戻す (第22条)
```

---

## 7. 分解 — 建造相(build)を 8 本の仕事に分ける

要件 §6 の第0〜7段の順序を尊重する。**依存は「前の段の門が緑になること」で切る。**

```
work-0 ─┬─ work-1 ──┬─ work-2 ── work-3 ──┬─ work-4 ── work-5 ── work-6
        │           │                      │
        └─ work-7 ──┘ (並行可・独立)        └─ (work-3 完了が work-4 の絶対条件)
```

| 仕事 | 段 | 内容 | 並行 | 依存 | 満たす AC |
|---|---|---|---|---|---|
| **work-0** | 第0段 | `graph/abode.js`(resolve / pathFor / mode / ledger / validateLedger / globalWrite / homedirRefs)+ `graph/abode.json`(EX-1,2 / EXT-1,2 / CL-1)+ **`tests/abode.test.js`**(wiring の孤児を避けるため必須 — §4.4)+ 第58条の追記 + `codex.js index --write` | — | なし | AC-1, AC-22, AC-24, AC-25, AC-26, AC-52, AC-56 |
| **work-1** | 第1段 | 生産コード 14 ファイル / 16 箇所の付け替え(§3.1)。**既定は `global` のまま**。`check-agents` の `explicit` 分岐、`pulse.claudeDir` の一点突破、`apply-spawn` の対称化 | — | work-0 | AC-3, AC-4, AC-17, AC-18, AC-20, AC-52 |
| **work-2** | 第2段 | `PARADISE_ABODE=repo` の両居。`<repo>/.claude/` を deploy し **git 追跡の派生物**にする。`derived.js` の `DERIVED` に `.claude/settings.json` を登録(§6.2 第29条の整合)。`.gitignore` の kg-store 行を見直す | — | work-1 | AC-5, AC-6, AC-7, AC-8, AC-13, AC-14, AC-15, AC-53 |
| **work-3** | 第3段 | **見張りの建て替え。§5 の 29 件を全部直す。** guards 4 門の向け直し + EX-1 門の新設 + `paradise.test.js` への `skip()` 移植 + 静かな緑 13 件の `skip()` 化 + `deploy.check` の upstream 依存解除(L-25) + `--silent-green` / `--hermetic` の実装 | — | work-2 | AC-39〜AC-45, AC-19 |
| **work-4** | 第4段 | **既定の反転**(`DEFAULT_MODE = 'repo'` の 1 行)。KG と日次台帳の移設(`migrate --plan` → 実行 → `--verify`) | — | **work-3(絶対)** | AC-9, AC-10, AC-11, AC-12, AC-54 |
| **work-5** | 第5段 | 兄弟倉への配備(EX-2)。`check --creations` の実装。兄弟倉の `.claude` を `.gitignore` に足す | — | work-4 | AC-46〜AC-51 |
| **work-6** | 第6段 | **撤収。** `retreat --plan` で baseline 凍結 → 58 ファイル → `model`/`effortLevel`(神の裁可後)→ hooks 6 件 → `retreat --verify`。`apply-guards.repairEnv()` の権能封じ(AC-16)。`POLICY.deny` に `<repo>/.claude` の守りを足す(L-19) | — | work-5 | AC-16, AC-29, AC-30〜AC-38 |
| **work-7** | 第0〜1段と並行 | **`census` の密閉化**(§5.4 の L-26/27/28)。`summaryOf` の保険経路削除 + README 汚染の複製化 + `domains.js` の LEDGER env 化 | **✅ 並行可** | なし(work-0 と独立) | (新設 AC。第58条(c)(d) を強制する門) |

### 7.1 並行の可否と理由

- **work-7 だけが並行できる。** 住所とは無関係な密閉性の欠陥であり、触るファイルが重ならない
  (`census.js` / `domains.js` / `tests/paradise.test.js` の故障注入節)。
  **むしろ先に片付けるべきである** — 密閉されていない門の上で改革を測れば、測定が信用できない。
- **work-1〜work-6 は直列。** 各段が「前段の門が緑」を前提にする。
  特に **work-3 → work-4 の順序は絶対**(要件 §6 の順序の要点1)。逆にすれば、
  反転した瞬間に 4 門が skip へ落ち、**壊れた目で撤収を見届けることになる。**
- **work-6 の内部も 4 段に割る**(要件 §5): ①58 ファイル → ②`model`/`effortLevel`(裁可後)
  → ③hooks 6 件 → ④残骸(SHOULD)。各段の後に `retreat --verify` が緑であること。
  hooks を先に抜くと**撤収作業中のセッションで KG 注入が止まり、作業者自身が文脈を失う。**

### 7.2 各仕事の完了条件(門で言う)

| 仕事 | 完了条件 |
|---|---|
| work-0 | `node tests/paradise.test.js` が **455 → 455+新設分**、`node graph/wiring.js check` が緑(孤児なし)、`node graph/codex.js check` が緑 |
| work-1 | `node graph/abode.js check --count` が exit 0(`abode.js` 1 ファイル 1 箇所)、`node graph/deploy.js plan` の target が `C:\Users\kikus\.claude` のまま |
| work-2 | `PARADISE_ABODE=repo` と `=global` の**両方**で全走行が緑(AC-53) |
| work-3 | `node tests/guards.test.js` が `N passed, 0 failed, 0 skipped`、`node graph/abode.js check --silent-green` が exit 0 |
| work-4 | 素の `node graph/abode.js resolve --json` の全住所が `<repo>` 配下、`node graph/kg.js stats` が nodes 120 |
| work-5 | `node graph/abode.js check --creations` が exit 0 で agents 30 / commands 19 / rules 8 |
| work-6 | `node graph/abode.js retreat --verify` が exit 0(神 5 キーの sha256 = `cbca9224ec5e6cac`) |
| work-7 | `node graph/abode.js check --hermetic` が exit 0、`node graph/census.js check` が**同時実行しても**同じ答えを返す |

---

## 8. 危険と退路 — 最も壊れやすい 3 箇所

### 危険1 — 神の `settings.json` を撤収で壊す(最悪・不可逆に最も近い)

**なぜ壊れやすいか**: engine は `JSON.stringify(next)` の**全書き戻し**方式である
(`apply-guards.js:704` / `apply-seat.js:79` / `vendor.js:126,128`)。撤収時に必ず全キーを触る。
神の 5 キー(`theme` / `language` / `enableWorkflows` / `extraKnownMarketplaces` /
`agentPushNotifEnabled`)が巻き添えになる経路が構造的に存在する。
**前例がある** — `env.PATH` は既に engine の判断で消された。

**予防**: 撤収前に `retreat --plan` が神 5 キーの正準 sha256 を凍結する。実測値:

```console
$ node <probe>
keys: enableWorkflows, extraKnownMarketplaces, language, theme, agentPushNotifEnabled,
      hooks, model, effortLevel, permissions
god subset: agentPushNotifEnabled, enableWorkflows, extraKnownMarketplaces, language, theme
god-subset-sha256(16): cbca9224ec5e6cac
permissions deny/ask/allow: 9 1 5
hooks groups: PreToolUse:3 PreCompact:1 SessionStart:2 PostToolUse:4 Stop:1 SessionEnd:2
backrefs into paradise repo: 6
env key present? false
```

**ロールバック手順(実コマンド)**:

```bash
# 0) 撤収前に必ず自前の退避を取る(baseline とは別に、生のファイルを)
cp "C:/Users/kikus/.claude/settings.json" \
   "C:/Users/kikus/.claude/settings.json.pre-sovereign-$(date +%s).bak"

# 1) 壊れたと判ったら、まず神のキーだけを復元する
node graph/abode.js retreat --verify        # 何が変わったかを名指しさせる (exit 1)

# 2) 最も古い証拠(神の原初設定)から神のキーを取り出して戻す
#    settings.json.pre-wire.bak は 2026-08-28 の神の原初設定である(不可侵名簿に載せた)
node -e "
const fs=require('fs'),os=require('os'),path=require('path');
const p=path.join(os.homedir(),'.claude','settings.json');
const orig=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.claude','settings.json.pre-wire.bak'),'utf8'));
const now=JSON.parse(fs.readFileSync(p,'utf8'));
for(const k of ['theme','language','enableWorkflows','extraKnownMarketplaces','agentPushNotifEnabled'])
  if(k in orig) now[k]=orig[k];
fs.writeFileSync(p, JSON.stringify(now,null,2)+'\n');
console.log('神のキーを原初から復元した');
"

# 3) 楽園側のキーは 1 命令で再生成できる(第19条: 配備物は成果物であって原本ではない)
node graph/apply-guards.js apply
node graph/apply-seat.js apply
node graph/apply-guards.js verify           # deny 9 / ask 1 / allow 5 を確認
```

### 危険2 — 第4段の反転で「壊れた目」のまま先へ進む

**なぜ壊れやすいか**: 実測で確かめた事実 —

```console
$ USERPROFILE=<sentinel> HOME=<sentinel> node tests/paradise.test.js --gate 'deploy|check-agents|seat|配備'
Paradise gate-filter: 23 of 455 gates matched — 23 green, 0 red     ← 住処を丸ごと失っても緑
$ USERPROFILE=<sentinel> HOME=<sentinel> node <probe>
deploy.check       -> skipped=true ok=true checked=0
check-agents.check -> skipped=true ok=true
seat.diff          -> skipped=true ok=true
```

**23 門は住処が消えたことを一度も検出できない。** 反転の直後にこの状態になれば、
work-5(兄弟倉への配備)と work-6(撤収)が**何も見ていない緑の上**で進む。

**予防**: work-3(見張りの建て替え)を work-4 より前に置く。**work-4 の PR は、
work-3 の全門が緑になっていることを CI が証してからでなければマージしない。**
かつ work-4 の PR に**故障注入の証拠**を付ける: `<repo>/.claude/agents/cardinal.md` を
1 バイト書き換えて `deploy.check` が赤くなる出力を貼る(AC-7)。

**ロールバック手順**:

```bash
# 反転は 1 行の定数である。戻すのも 1 行。
git -C C:/Users/kikus/Documents/workspace/paradise \
    diff HEAD~1 -- graph/abode.js | head -20        # 反転の差分を確認
git -C C:/Users/kikus/Documents/workspace/paradise revert --no-edit <反転のコミット>

# または env で即座に外を向かせる(engine を触らない緊急退避)
export PARADISE_ABODE=global
node graph/abode.js resolve --json                  # 全住所が ~/.claude を向くことを確認
node graph/deploy.js check                          # 従来の配備が生きていることを確認
node tests/paradise.test.js --gate 'deploy|check-agents|seat'
```

### 危険3 — 密閉されていない門の上で改革を測る(測定そのものが壊れる)

**なぜ壊れやすいか**: §5.4 の実証どおり、`tests/paradise.test.js` は走行中に
版管理下の `README.md` と `graph/domains.json` を書き換える。改革中は
**教主・神官・CI が同時に門を撃つ**ので、この窓に当たる確率が高い。
当たると `census` が嘘の数を返し(16 / 451)、**改革が門を壊したのか、
並行実行が壊したのかを誰も区別できない。**

**予防**: work-7 を**最初に**片付ける(work-0 と並行に走らせる)。
かつ改革期間中は「重い門を並行で撃たない」を運用で守る — **だがこれは第10条が禁じる
「宣言は機構ではない」の形なので、機構(`--hermetic` 門)を建てるまでの暫定である。**

**ロールバック手順**:

```bash
# 症状: census.js check が走行ごとに違う数を返す / 実在しないファイルの git 警告が出る
# 1) まず、自分以外に走っている門が無いか確かめる
tasklist //FI "IMAGENAME eq node.exe" //FO CSV | head -20

# 2) 版管理下のファイルが本当に汚れていないかを確かめる(復元漏れの検出)
cd C:/Users/kikus/Documents/workspace/paradise
git status --porcelain
git diff --stat -- README.md graph/domains.json

# 3) 汚染が残っていたら、版管理から復元する(故障注入の finally が落ちた場合)
git checkout -- README.md graph/domains.json

# 4) census の数を単独走行で測り直す(並行を排除して初めて信じられる)
node tests/paradise.test.js | tail -1        # Paradise self-test: N passed, 0 failed
node graph/census.js check                   # 上と同じ N が README と一致するか

# 5) work-7 の変更を戻したいとき
git revert --no-edit <work-7 のコミット>
```

---

## 9. この設計が満たさないもの(正直に)

- **「`~/.claude` への書き込みが 0 になる」は達成しない。** Claude Code 自身が
  `backups/` と `projects/.../subagents/` を書く(discovery-scoping の実測)。
  達成するのは「楽園の配備物・設定・記憶を `~/.claude` に置かない」までである。
  **門の文言にもこれを書き、「グローバル書き込みゼロ」を名乗らない。**
- **`counts.skills` は第4段以降 null になる。** deploy は skills を配備していないため。
  これは欠陥ではなく事実であり、pulse は null + errors で正しく語る。
- **`permissions.allow` は workspace trust の壁の向こうに残る**(未解決の問い4)。
  deny と ask は信頼なしで効く(実測)ので、護りは失われない。本設計はこの壁を越えない。
- **`~/.claude/skills/` 13 件・hermes の cron/catchup には一切触れない**(障害物17/18 = OUT)。
  台帳の `external[]` に EXT-1/EXT-2 として記録するのみ。
- **`retreat` は `--write` を持たない。** 実際の撤収は `deploy.js` の口が行う。
  本設計は「計画と照合」までを `abode.js` の責務とする。
- **`--hermetic` は全ての非密閉性を捕らえない。** 静的走査であり、
  子プロセス経由の書き込み(`execFileSync('node', [...])`)は追えない。
  捕らえられるのは「テストのソースに直に書かれた版管理下への書き込み」までである。**これを門の文言に書く。**

---

## 10. 本設計で改変したファイル

**楽園リポジトリ内: 本書 1 本のみ**(`reform/sovereign-abode/design.md`)。
engine は一行も変えていない。`~/.claude` には**一切書いていない**
(全ての探査は読み取り専用。`deploy.js --write` も `apply-*` も走らせていない)。
`git commit` も `gh` も使っていない。

一時ファイル・一時複製は `$LOCALAPPDATA/Temp/` 配下に置いた:
`pddes-probe.js` / `pddes-god.js` / `pddes-sum.js` / `pddes-watch.js` /
`pddes-home/`(空の sentinel)/ `pddes-abode/`(settings の写し)/
`pddes-repo/` `pddes-repo2/` `pddes-repo3/`(リポジトリの複製 — 故障注入用)/ `pddes-out/`。

---

## 11. 本書起草時に実際に走らせたコマンド(全数)

```bash
# 位置と状態
git branch --show-current                      # → reform/sovereign-abode
git status --short                             # → ?? reform/sovereign-abode/ のみ

# 憲法の学習 (既存の条の文体を写す)
node graph/codex.js article 19|20|29|30|37|54|57
node graph/codex.js index | tail -8            # → 全 57 条

# 現行の門(改革前ベースライン)
node graph/deploy.js plan                      # → target C:\Users\kikus\.claude / 58 件
node graph/apply-guards.js verify              # → deny 9 / ask 1 / allow 5 / matcher 13 生存
node graph/workspace.js check                  # → 混入なし
node graph/wiring.js check                     # → engine 36 / 内の辺 53 / 孤児なし
node graph/census.js check                     # → 単独走行では緑
node tests/guards.test.js                      # → 64 passed, 0 failed
PARADISE_SETTINGS=/nonexistent/settings.json node tests/guards.test.js
                                               # → 60 passed, 0 failed, 4 skipped
node tests/paradise.test.js                    # → 455 passed, 0 failed  (単独 / 約 8 分)

# 問い1 の裁定 (台帳 CL-1 の根拠)
which gh                                       # → /c/Program Files/GitHub CLI/gh

# 神の資産の実測 (読み取りのみ)
node <pddes-god.js>                            # → god-subset-sha256(16): cbca9224ec5e6cac
                                               # → permissions deny/ask/allow: 9 1 5
                                               # → hooks: PreToolUse:3 PreCompact:1 SessionStart:2
                                               #          PostToolUse:4 Stop:1 SessionEnd:2
                                               # → backrefs into paradise repo: 6
                                               # → env key present? false

# 住所解決の実測 (4 通りの環境)
node <pddes-probe.js>                          # 通常 / 裸ホーム / env 一式 / 空の住処
                                               # → 裸ホームで check-agents.skipped=true ok=true (病)
node graph/kg.js stats                         # → nodes 120 / edges 33
USERPROFILE=<sentinel> HOME=<sentinel> node graph/kg.js stats     # → nodes 0
node -e "…pulse.snapshot()…"                   # → agents 30 / commands 19 / skills 13 / kgNodes 120
USERPROFILE=<sentinel> HOME=<sentinel> node -e "…"
                                               # → 全て null + errors 5 件 (pulse は正しい)

# 門の絞り込み (background / --gate で絞る)
node tests/paradise.test.js --gate-list        # → 455 門の一覧
node tests/paradise.test.js --gate 'deploy|conclave: 配備|check-agents|seat|配備'
                                               # → 23 of 455 — 23 green, 0 red
USERPROFILE=<sentinel> HOME=<sentinel> node tests/paradise.test.js --gate '…同上…'
                                               # → 23 green, 0 red (環境差を検出できていない)
node tests/paradise.test.js --gate 'deploy:|check-agents|hierarchy:|conclave: 配備|seat:|watchdog:|cron: |tools: |independence:'
                                               # → 36 of 455 — 36 green, 0 red
PARADISE_UPSTREAM=/nonexistent node tests/paradise.test.js --gate 'deploy:'
                                               # → 5 green, 0 red (上流不在で 5 門が空回り)

# L-3 の実証 (abode.js を stub で建てると wiring が赤)
(repo を複製し graph/abode.js を stub で置く)
node graph/wiring.js check                     # → 🔴 孤児 1: abode / EXIT=1
node tests/paradise.test.js --gate 'wiring:'   # → 5 of 455 — 4 green, 1 red

# L-2 の実証 (住所が割れると門が偽の赤)
(複製で pulse.js の kgRoot を <repo>/graph/kg-store に付け替え、門は付け替えない)
node tests/dashboard-count.test.js             # → ✗ AC-17a/17b / 14 passed, 1 failed

# L-4 の実証 (向け直せば 4 門は生き、向け直した先でも噛む)
PARADISE_SETTINGS=<abode の写し>/settings.json node tests/guards.test.js
                                               # → 64 passed, 0 failed
(その写しに死んだ matcher を 1 本注入)
PARADISE_SETTINGS=<写し>.dead.json node tests/guards.test.js
                                               # → 62 passed, 2 failed (AC-40 の実証)

# L-25 の実証 (deploy.check が upstream 不在だけで skip する)
PARADISE_UPSTREAM=/nonexistent node -e "…deploy.check()…"
                                               # → {"skipped":true,"ok":true,"checked":0}

# 【新発見】census の非密閉性 — 走行が版管理下のファイルを汚す窓を捕らえる
(repo を複製し git init → commit → 15ms 間隔で git status をサンプリング)
node <pddes-watch.js> <複製> 'lexicon: 門は己の作業場の残骸'
                                               # → [tick 7] DIRTY: M README.md
node <pddes-watch.js> <複製> '異名|第52条: 実在だけでは足りない'
                                               # → [tick 10] DIRTY: M graph/domains.json
(README.md に異名を 1 行足した状態で)
node graph/clergy.js lexicon-check             # → 🔴 README.md:372 「司祭」→「神官」

# 【新発見】455 / 451 / 16 の食い違いの真因 (summaryOf の保険経路)
grep -c "^test(" tests/paradise.test.js        # → 447
grep -c "^\s*test(" tests/paradise.test.js     # → 448 (字下げは 1 本のみ)
node <pddes-sum.js> <full.txt>
   完走出力              -> {"passed":455,"failed":0,"via":"named"}
   途中で死んだ出力(340行) -> {"passed":16,"failed":0,"via":"fallback(last child line)"}
   途中で死んだ出力(650行) -> {"passed":11,"failed":0,"via":"fallback(last child line)"}
rg -o "^[a-z-]+: ([0-9]+) passed" <full.txt>
   dashboard-run-panel: 16 passed   ← 教主が観測した「16」の正体

# 依存の再実測
rg -n "os\.homedir\(\)" graph/*.js tools tests -g '!**/node_modules/**'
rg -o "os\.homedir\(\)" graph/*.js tools -g '!**/node_modules/**' | wc -l    # → 16
rg -n "existsSync\([^)]*\)\) return" tests/*.js                              # → 7 hit
rg -n "if \(\w+\.skipped\) return" tests/*.js                                # → 6 hit
rg -n "wire-paradise-hooks" (repo 全体)  # → overlay.json:126 の $note が唯一の呼び手
ls -d ../paradise-creations ; ls -a ../paradise-creations/.claude
                                               # → 兄弟倉は在るが .claude は無い(神官 0 体)
```
