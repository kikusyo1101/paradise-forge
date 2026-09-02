# requirements — conclave の環に「再開の道」を建てる

- 道: `reform/conclave-resume`（reform の道 — 楽園自身の改修、第23条）
- 前相: `reform/conclave-resume/findings.md`（discover）
- 相: specify / 神官 requirements-analyst
- 直す対象: **pipeline**（engine に回復の verb が無いこと・stuck を門が見ていないこと）。
  詰まった run 1 本を手で直すのは artifact の修理であって禁じられる（第9条）。
  ただし **その 1 本が新しい道で生き返ること**を受入条件に含める（§AC-09）—
  pipeline が直った証拠は実物の蘇生でしか取れないからである。

---

## 0. 追加実測（findings に無い、設計判断に必須の事実）

findings.md は「running が永久欠番になる」ところまでを実測した。要件を機械判定可能に
落とすには、あと 3 つの事実が要る。本相で自ら確認した。

### 0-A. 相のレコードに**時刻が無い**

`convene()` が作る相の全フィールド（`graph/conclave.js:58-62` 実測）:

```js
phases: g.phases.map(id => ({
  id, agent, goal, deps, gate,
  artifact, status: 'pending', attempts: 0, artifactPath: null,
}))
```

`startedAt` も `heartbeat` も `dispatchedAt` も**無い**。
時刻の痕跡は `run.history` の `{ts, event:'dispatch', detail:'review, security, docs'}` だけ
（`markRunning` が push する。`graph/conclave.js:200`）。

→ **帰結**: 「running が古いか」を時刻で裁く設計は、schema の追加を要求する。
既存の壊れた run（§AC-09）は当然その欄を持たないので、**時刻を唯一の根拠にする案は
既存の実物を救えない**。これが §2 の verb 選定を強く縛る。

### 0-B. `attempts` は数えられるだけで、**どこからも裁かれていない**

```
$ grep -n "attempts" graph/conclave.js
61:  ... status: 'pending', attempts: 0, artifactPath: null,
156:  ... expects_artifact: ph.artifact, attempt: ph.attempts + 1,
199:  ... { p.status = 'running'; p.attempts += 1; } }
```

61 は初期化、156 は発令メッセージへの表示、199 は加算。**比較が 1 箇所も無い。**
loop-guard は `MAX_DOMAIN_REWORK = 3`（domain 単位の `reworks`）**のみ**であり、
相単位の上限は存在しない。

→ **帰結**: 回復が `attempts` を増やすなら、その瞬間に**相単位の loop-guard が必要**になる。
今は無いので、回復の道を建てるだけでは「無限に回復し続ける環」を新設してしまう（§4）。

### 0-C. `next()` は現状**純粋**である（state を書かない）

`main()` が `next` の後に別途 `markRunning` を呼び、その後 `save` する
（`graph/conclave.js:285`）。`next()` 自身は run を変更しない。
テストも `conclave.next(run)` を副作用なしに何度も呼ぶ前提で書かれている
（`tests/paradise.test.js:539` 他）。

→ **帰結**: 「`next` が自動で回収する」案は `next()` の純粋性を壊す。
`status --json` やダッシュボードが `next()` を覗くだけで state が書き換わる事故が起きうる。

### 0-D. 現行の憲法は第50条まで。新条は**第51条**

`node graph/codex.js index` の末尾は `| 50 | 動きは名乗らねば宿らず… |`。

---

## 1. 願いの言い換え（この文書が満たすべきこと）

> conclave の環が中断で running のまま二度と回らなくなる袋小路を塞ぐ — 再開の道を engine に建てる。

これを 3 つの必須性質に分解する。

| # | 性質 | 破れると起きること |
|---|------|--------------------|
| P1 | 中断で `running` に残った相を、**嘘を刻まずに**再び ready へ戻す道が engine にある | 環が静止する（本日の実物） |
| P2 | その道が**生きている走者を横から殺さない** | 二重発令（第45条の同型再発） |
| P3 | 回復が**有限回で人へ escalate する** | 無限に発令し続ける環を新設する（第10条違反） |

---

## 2. 論点1 — 回復の verb をどう選ぶか

### 2-1. 候補と、その利点・危険

#### 候補A: 既存 `done` を使う
- 利点: 新規実装ゼロ。
- **危険（致命）**: 成果物が無いのに `status='done'`, `artifactPath` 無しを刻む。
  下流の相は `phaseReady` が deps の `done` だけを見る（`conclave.js:82`）ため、
  **空の依存の上に走り出す**。第37条「Absence is not passage」の直接違反であり、
  嘘が state に永続化される（第27条の裏面）。
- **判定: 却下。** 願いの文言「`done` で嘘を刻ませてはならない」と一致。

#### 候補B: `ratify --reject --from <id>` を流用
- 利点: 既存の実装で相は `rework` に戻る。
- **危険**: (1) `target.reworks += 1` して `MAX_DOMAIN_REWORK=3` を消費する
  （`conclave.js:231`）。中断は**品質の失敗ではない**のに loop-guard の残数を削る。
  3 回落ちれば domain が `blocked` になり、走者の死が「品質不合格」として記録される。
  (2) 粒度が domain 単位で、`from` の**下流全部**を reset する（`conclave.js:212-213`）。
  本日の実物では `review`/`security`/`docs` の 3 相だけを戻したいのに、
  巻き添えで既に `done` の上流や他 domain の批准まで剥がれうる。
  (3) history に `domain-rework` と刻まれ、**中断と品質差し戻しが台帳上で区別できなくなる**。
- **判定: 却下。** 願いの文言と一致。

#### 候補C: 新しい verb `resume`（明示的な人の意思）
- 利点:
  - `running → rework`（または `pending`）への遷移が**専用の語彙**を持つ。
    history に `resume` として刻まれ、品質差し戻し（`domain-rework`）と区別できる。
  - `reworks` を消費しない。loop-guard の意味が汚れない。
  - **人が明示的に叩く**ので、生きている走者を殺すか否かの判断に人の意思が入る（P2 に最強）。
  - **時刻フィールドを持たない既存の壊れた run にも効く**（§0-A の帰結）。
- 危険:
  - 誰も叩かなければ環は静止したまま。**自動回復にはならない。**
    第43条の教訓（「取り戻しの機構は、取り戻すべき唯一の場合に働かなかった」）の再演になりうる —
    人が気づくことに依存する機構は、人が見ていない夜に効かない。
  - 乱用されれば無限リトライになる（→ §4 の loop-guard で塞ぐ）。
  - 本当に走っている相へ叩けば二重発令（→ §2-2 の生死判定と `--force` 要求で塞ぐ）。

#### 候補D: `next` が自動で回収する
- 利点: 人の介入なしに環が回る。夜に死んでも朝には進む。第10条「durable」に最も近い。
- 危険:
  - **`next()` の純粋性を壊す**（§0-C）。`status`/ダッシュボードが覗いただけで
    state が変わる経路が生まれる。既存テストの前提も壊れる。
  - **生きている走者を横から pending に戻す**危険が最大。`next` は「今誰が走っているか」を
    知らない。走行中の相を回収して再発令すれば、同じ相を 2 体が走り、
    同じファイルへ書き込む。**これは第45条が刻んだ「排他が相手を間違える」型の再発**である。
  - 時刻がなければ「古い running」を判定できない（§0-A）。

### 2-2. 決定 — **C を必須、D を条件付きで併設**

**両方要る。ただし役割を分ける。**

- **`resume` は無条件の権利ではなく、既定は「死んだと判定できる running のみ」を回収する。**
  人が叩く verb であるから、判定に迷ったら**拒んで理由を述べる**のが安全側である。
  人の意思で判定を上書きしたい場合のみ `--force` を要する。
- **`next` の自動回収は既定 OFF**。`--reclaim` フラグ（または run.meta の設定）を
  明示したときだけ働く。これにより §0-C の純粋性は既定で保たれ、
  cron のような無人経路だけが opt-in で自動回復を得る。

### 2-3. 「死んだ running」と「生きている running」の区別 — 何に拠るか

3 つの根拠を**この優先順で**用いる。単独ではどれも不十分だからである。

| 根拠 | 使える場面 | 使えない場面 |
|------|-----------|-------------|
| **明示的な人の意思**（`resume --force`） | いつでも | 人が見ていない夜 |
| **時刻**（`dispatchedAt` + 猶予 `staleAfter`） | 新しい run（schema 追加後） | **既存の壊れた run**（§0-A: 欄が無い） |
| **attempts** | — | 中断も成功も区別せず増える。生死の情報を持たない |

→ **`attempts` は生死の根拠に使わない**（§0-B: 中断回数ではなく発令回数だから）。
使うのは §4 の loop-guard の上限判定のみ。

**採る規則（機械判定可能な形）**:

1. 相が `running` かつ `dispatchedAt` を持ち、`now - dispatchedAt > staleAfter` → **死んだ running**。
2. 相が `running` かつ `dispatchedAt` を**持たない**（旧 schema／既存の壊れた run）→
   **判定不能**。engine は自動では触らず、`resume` に `--force` を要求する。
   これで「既存の実物を救えるが、自動では暴走しない」が両立する。
3. 相が `running` かつ猶予内 → **生きている running**。`resume` は既定で**拒む**
   （終了コード非ゼロ＋残り猶予を述べる）。`--force` でのみ回収できる。
4. `staleAfter` の既定値は run.meta または engine 定数で**一箇所に定義**し、
   CLI から上書き可能とする（テストが時計を待たずに済むため。これは検証可能性の要件である）。
5. `dispatchedAt` は `markRunning()` が刻む。**既存 run を書き換えて後付けしない**
   （それは artifact の修理である）。

**根拠**: 第45条は「排他が相手を間違える」ことを禁じた。ここでの誤りは逆向き
（回復が生者を殺す）だが同型である。ゆえに **engine は迷ったら動かず、人に問う**。

---

## 3. 論点2 — stuck を門が見る

現状 `stuck` は全リポジトリで 1 箇所、それは `stuck` を**生む**行である
（findings §4 実測）。試す門は 0 本。266 本が緑でも環は死んだ。

→ 回帰テストは **「stuck が返ること」だけでは不十分**。それは病気の再現でしかない。
**中断から復帰して complete に着くまでを通す門**が要る（第34条・第50条）。

---

## 4. 論点3 — loop-guard との整合

§0-B の通り、相単位の上限は**現在存在しない**。回復の道を建てると同時に建てる。

- `MAX_PHASE_RESUME`（既定 **2**）を engine 定数として置く。
  根拠: `MAX_DOMAIN_REWORK = 3` と同じ「有限で小さい」思想に倣う。
  中断は品質の失敗ではないので domain の 3 とは**別の数**として持ち、互いを消費しない。
- 相ごとに `resumes` カウンタを持つ（`attempts` とは別。§0-B: `attempts` は発令回数であり
  意味が違う。混ぜると「何回中断したか」が永久に読めなくなる）。
- `resumes > MAX_PHASE_RESUME` → その相の回復を**拒み**、domain を `blocked` にし、
  `history` に `phase-loop-guard` を刻み、**人への escalate を出力に明示する**。
  根拠: 第10条「the loop-guard escalates to a human rather than burning on the same
  phase forever」。今の実装は burn も escalate もしない「静止」という第三の死に方をする
  （findings §5）。escalate を出す先は engine の出力（非ゼロ終了＋人向け文言）とし、
  `next` はその後 `stuck` ではなく `blocked` を返す — **静止と閉塞を混同させない**。

---

## 5. 論点5 — 憲法条は要るか

**要る。** 根拠は findings §5 の実測: 第10条は "durable" と "loop-guard escalates" を
要求するが、**「中断した走者の残骸をどうするか」を一言も定めていない**。
第45条は「発令者が走者を締め出す」を裁くが、逆向き（走者の死が state を汚す）は範囲外。
第34条・第37条は門の話であって state 遷移の話ではない。
条文が無いから実装が無く、実装が無いから門も無かった。**穴は条文にある。**

### 第51条（草案）

> 51. **走者の死は環の死ではない。走り始めた印は、帰れる印でなければならない。**
>     発令の瞬間に刻む `running` は「今から為す」の宣言であって「為された」の記録ではない。
>     走者が途中で死ねばその印は残骸となり、残骸を回収する道が無ければ環は落ちたとも
>     言われぬまま**静止**する — burn もせず escalate もしない、第三の死に方である。
>     ゆえに走行中を表す状態は、**必ず走行前へ戻る道を対で持つ**。その道は
>     成果物の無いまま `done` を刻んではならず（嘘は state に永続する）、品質の
>     差し戻しと同じ台帳・同じ上限を消費してはならない（中断は不合格ではない）。
>     そして回復は**生者を殺してはならない** — 死を判じられぬ印は、engine が独断で
>     戻さず人に問う。回復もまた有限であり、尽きたときは静止ではなく閉塞を名乗り、人を呼ぶ。

（題は「〜は〜である」型の箴言。日本語条 43〜50 に倣う。）

---

## 6. 受入条件（AC）

すべて `cd C:/Users/kikus/Documents/workspace/paradise` を前提とする。
検証コマンドが未実装の機能を叩くのは正しい（これから建てるものだからである）。

---

### AC-01 — `resume` verb が engine の語彙に存在する

`node graph/conclave.js` の usage 行に `resume` が現れること。

**満たす条件**: 出力に `resume` を含み、その語法に `--run` と対象相 id が示されること。

```bash
node graph/conclave.js 2>&1 | grep -q "resume" && echo AC-01-PASS || echo AC-01-FAIL
```

---

### AC-02 — 死んだ running が `resume` で ready へ戻り、`done` を刻まない

中断を模した run（発令直後に走者が消えた state）に `resume` を打つと、
対象相の `status` が `rework` または `pending` になり、**`done` にはならず**、
`artifactPath` は `null` のまま。

**満たす条件**: 下記が `AC-02-PASS` を印字する。

```bash
node -e "
const c=require('./graph/conclave.js');
const run=c.convene('reform/conclave-resume/forge.dag.json');
c.markRunning(run,['discover']);                       // 発令
// 走者は死んだ — markDone は呼ばれない
const before=c.allPhases(run).get('discover').status;
c.resume(run,['discover'],{force:true});
const p=c.allPhases(run).get('discover');
const ok = before==='running' && (p.status==='rework'||p.status==='pending')
        && p.status!=='done' && p.artifactPath===null;
console.log(ok?'AC-02-PASS':'AC-02-FAIL '+before+'→'+p.status+' art='+p.artifactPath);
"
```

---

### AC-03 — `resume` の直後に `next` が再び当該相を発令する（環が回る）

回復した相が `phaseReady` を通り、`next` が `stuck` ではなく `wave` を返すこと。

```bash
node -e "
const c=require('./graph/conclave.js');
const run=c.convene('reform/conclave-resume/forge.dag.json');
c.markRunning(run,['discover']);
const dead=c.next(run);                               // 中断中は stuck
c.resume(run,['discover'],{force:true});
const s=c.next(run);
const ok = dead.phase==='stuck' && s.phase==='wave'
        && s.dispatch.some(d=>d.id==='discover');
console.log(ok?'AC-03-PASS':'AC-03-FAIL dead='+dead.phase+' after='+s.phase);
"
```

---

### AC-04 — `resume` は生きている running を既定で殺さない（第45条／P2）

`dispatchedAt` が猶予内の相へ `--force` 無しで `resume` を打つと、
**state は変化せず**、終了コードが非ゼロで、理由（残り猶予）が述べられること。

```bash
node -e "
const c=require('./graph/conclave.js');
const run=c.convene('reform/conclave-resume/forge.dag.json');
c.markRunning(run,['discover']);                       // dispatchedAt は今
let threw=null;
try { c.resume(run,['discover'],{}); } catch(e){ threw=e.message; }
const p=c.allPhases(run).get('discover');
const ok = p.status==='running' && threw && /live|生き|猶予|stale/i.test(threw);
console.log(ok?'AC-04-PASS':'AC-04-FAIL status='+p.status+' err='+threw);
"
```

**加えて CLI 経路でも非ゼロ終了すること**（engine API だけ直っても人は救われない）:

```bash
node graph/conclave.js resume discover --run <live-run.json>; \
  [ $? -ne 0 ] && echo AC-04-CLI-PASS || echo AC-04-CLI-FAIL
```

---

### AC-05 — 猶予を過ぎた running は `--force` 無しで回収できる

`dispatchedAt` が `staleAfter` より古い相は、人の追加意思なしに回復できること
（無人の cron 経路が救われるため）。`staleAfter` は CLI/オプションで上書き可能であること
（テストが実時間を待たないため — これは検証可能性の要件である）。

```bash
node -e "
const c=require('./graph/conclave.js');
const run=c.convene('reform/conclave-resume/forge.dag.json');
c.markRunning(run,['discover']);
c.allPhases(run).get('discover').dispatchedAt=new Date(Date.now()-864e5).toISOString(); // 24h前
c.resume(run,['discover'],{staleAfterMs:1000});        // force なし
const ok=c.allPhases(run).get('discover').status!=='running';
console.log(ok?'AC-05-PASS':'AC-05-FAIL');
"
```

---

### AC-06 — `markRunning` が `dispatchedAt` を刻む（§0-A の穴を塞ぐ）

```bash
node -e "
const c=require('./graph/conclave.js');
const run=c.convene('reform/conclave-resume/forge.dag.json');
c.markRunning(run,['discover']);
const p=c.allPhases(run).get('discover');
const ok = typeof p.dispatchedAt==='string' && !isNaN(Date.parse(p.dispatchedAt));
console.log(ok?'AC-06-PASS':'AC-06-FAIL '+p.dispatchedAt);
"
```

---

### AC-07 — `resume` は `reworks` を消費せず、台帳で品質差し戻しと区別される

domain の `reworks` が増えないこと。`history` に `resume` 事象が刻まれ、
それが `domain-rework` **ではない**こと。

```bash
node -e "
const c=require('./graph/conclave.js');
const run=c.convene('reform/conclave-resume/forge.dag.json');
const d=run.domains[0]; const before=d.reworks;
c.markRunning(run,['discover']);
c.resume(run,['discover'],{force:true});
const ev=run.history.filter(h=>h.event==='resume');
const ok = d.reworks===before && ev.length===1
        && !run.history.some(h=>h.event==='domain-rework');
console.log(ok?'AC-07-PASS':'AC-07-FAIL reworks='+before+'→'+d.reworks+' ev='+ev.length);
"
```

---

### AC-08 — 相単位 loop-guard: 回復は有限で、尽きたら閉塞して人を呼ぶ

`MAX_PHASE_RESUME`（既定 2）を超える回復は拒まれ、domain が `blocked` になり、
`history` に `phase-loop-guard` が刻まれ、その後の `next` が `stuck` ではなく
`blocked` を名乗ること（静止と閉塞を混同させない）。

```bash
node -e "
const c=require('./graph/conclave.js');
const M=c.MAX_PHASE_RESUME;
const run=c.convene('reform/conclave-resume/forge.dag.json');
let last;
for(let i=0;i<M+1;i++){ c.markRunning(run,['discover']); last=c.resume(run,['discover'],{force:true}); }
const p=c.allPhases(run).get('discover');
const s=c.next(run);
const ok = typeof M==='number' && M>0
        && last && last.ok===false
        && p.resumes<=M
        && run.domains[0].status==='blocked'
        && run.history.some(h=>h.event==='phase-loop-guard')
        && s.phase==='blocked' && /escalat|人|pontiff|神/i.test(JSON.stringify(s));
console.log(ok?'AC-08-PASS':'AC-08-FAIL M='+M+' resumes='+p.resumes+' dom='+run.domains[0].status+' next='+s.phase);
"
```

**根拠**: 第10条（loop は有限、人へ escalate）。`attempts` ではなく専用の
`resumes` で数える根拠は §0-B（`attempts` は発令回数であり中断回数ではない）。

---

### AC-09 — **既存の壊れた実物が実際に生き返る**

`reform/dashboard-living-gate/conclave.json`（`review`/`security`/`docs` の 3 相が
`running` 化石。本相で実測確認済み）が、新しい道で `stuck` を脱すること。

この run は `dispatchedAt` を**持たない**（§0-A）ため、engine は自動では触らず
`--force` を要求する — その挙動込みで受入条件とする。

**満たす条件**: 原本を壊さぬよう複製に対して、
(a) `--force` 無しの `resume` は非ゼロ終了で「判定不能」を述べ、
(b) `--force` 付きの `resume` の後、`next` が `stuck` ではなく `wave` を返し、
    その `dispatch` に `review`/`security`/`docs` が含まれること。

```bash
cp reform/dashboard-living-gate/conclave.json "$LOCALAPPDATA/Temp/ac09.json"
node graph/conclave.js next --run "$LOCALAPPDATA/Temp/ac09.json" | grep -q '"stuck"' \
  && echo AC-09a-precondition-stuck-OK

node graph/conclave.js resume review security docs --run "$LOCALAPPDATA/Temp/ac09.json"
[ $? -ne 0 ] && echo AC-09b-refuses-without-force-PASS || echo AC-09b-FAIL

node graph/conclave.js resume review security docs --force --run "$LOCALAPPDATA/Temp/ac09.json"
node graph/conclave.js next --run "$LOCALAPPDATA/Temp/ac09.json" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
      const j=JSON.parse(s); const ids=(j.dispatch||[]).map(d=>d.id);
      const ok = j.phase==='wave' && ['review','security','docs'].every(x=>ids.includes(x));
      console.log(ok?'AC-09c-PASS':'AC-09c-FAIL '+j.phase+' '+ids.join(','));
    })"
rm -f "$LOCALAPPDATA/Temp/ac09.json"
```

**根拠**: pipeline を直したという主張は、実物が蘇ることでしか証明できない（第27条）。
原本は複製上で検証し、**原本を手で書き換えない**（第9条 — artifact を直すのではない）。

---

### AC-10 — 中断を模した run から復帰して **complete に着く**（門の本体）

`stuck` を返すことを試すだけでは病気の再現に過ぎない。
**中断 → 回復 → 全相 done → 全 domain 批准 → `conclave-complete`** の全経路を
1 本の回帰テストで通すこと。

**満たす条件**: `tests/paradise.test.js` に当該テストが存在し、
全体が緑（既存 266 本を割らない）。

```bash
grep -c "stuck" tests/paradise.test.js          # 0 本 → 1 本以上へ（現状 0 が実測）
grep -q "resume" tests/paradise.test.js && echo AC-10-has-test || echo AC-10-FAIL
node tests/paradise.test.js 2>&1 | tail -5      # failed=0 かつ passed >= 266+4
```

テストが必ず含むべき筋（機械判定可能な形で）:

1. `convene` → `markRunning(全相のうち1波)` → **`markDone` を呼ばない**（中断の模擬）
2. `next()` が `{phase:'stuck'}` を返すことを assert（**現状 0 本の穴を直接塞ぐ**）
3. `resume(..., {force:true})` → `next()` が `wave` を返すことを assert
4. 以降すべての相を `markDone` + `ratify` で進め、
   最終的に `next().phase === 'conclave-complete'` に着くことを assert

**根拠**: 第34条「走れない門は落ちる門より悪い」、第50条「門が見ない機能は壊れても鳴らない」。
findings §4 が示した通り、266 本緑でも環は死んだ。**通し経路の門でしか塞げない。**

---

### AC-11 — `next --reclaim` による自動回収（opt-in、既定 OFF）

無人経路（cron）が人を待たずに回復できること。かつ**既定では `next()` が state を
書き換えない**こと（§0-C の純粋性を守る）。

```bash
node -e "
const c=require('./graph/conclave.js');
const run=c.convene('reform/conclave-resume/forge.dag.json');
c.markRunning(run,['discover']);
c.allPhases(run).get('discover').dispatchedAt=new Date(Date.now()-864e5).toISOString();
const snap=JSON.stringify(run);
const plain=c.next(run);                                   // 既定
const pure = JSON.stringify(run)===snap;                   // 副作用なし
const auto=c.next(run,{reclaim:true,staleAfterMs:1000});   // opt-in
const ok = pure && plain.phase==='stuck' && auto.phase==='wave';
console.log(ok?'AC-11-PASS':'AC-11-FAIL pure='+pure+' plain='+plain.phase+' auto='+auto.phase);
"
```

**加えて**: `--reclaim` は猶予内の（生きている）running を**回収しない**こと。

```bash
node -e "
const c=require('./graph/conclave.js');
const run=c.convene('reform/conclave-resume/forge.dag.json');
c.markRunning(run,['discover']);                            // 今発令 = 生きている
const s=c.next(run,{reclaim:true});
console.log(s.phase==='stuck'?'AC-11b-PASS':'AC-11b-FAIL '+s.phase);
"
```

**根拠**: 候補D の利点（第43条 — 人が見ていない夜にも取り戻す）を取りつつ、
危険（第45条 — 生者を殺す二重発令）を猶予判定で塞ぐ。既定 OFF は §0-C の帰結。

---

### AC-12 — `status` が running の残骸を人に見せる（沈黙を破る）

`status` の出力で、`running` の相が**どれだけ古いか**が読めること。
`--json` に `dispatchedAt` と `stale` 真偽が出ること。

```bash
node graph/conclave.js status --run "$LOCALAPPDATA/Temp/ac12.json" --json \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
      const j=JSON.parse(s);
      const ph=j.domains.flatMap(d=>d.phases||[]).filter(p=>p.status==='running');
      const ok = ph.length>0 && ph.every(p=>'stale' in p && 'dispatchedAt' in p);
      console.log(ok?'AC-12-PASS':'AC-12-FAIL');
    })"
```

**根拠**: 第44条の裏面「沈黙する番人は、壊れた番人より見つかりにくい」。
本日の実物は `status` が `▶ running` と表示していたが、**それが化石だとは誰にも見えなかった**
（findings §1 の status 出力）。

---

### AC-13 — 第51条が憲法に刻まれ、codex から読める

```bash
node graph/codex.js article 51 | grep -q "走者の死は環の死ではない" && echo AC-13-PASS || echo AC-13-FAIL
node graph/codex.js index | grep -q "^| 51 " && echo AC-13-index-PASS
node tests/paradise.test.js 2>&1 | grep -i "constitution\|codex" | tail -3
```

**根拠**: §5。条文が無いから実装が無く、実装が無いから門が無かった。
条を足さねば同じ穴が別の場所で再発する（第9条 — pipeline を直す）。

---

## 7. 範囲外（この道でやらないこと）

| やらないこと | 理由 |
|---|---|
| 詰まった `reform/dashboard-living-gate` を手で編集して救う | artifact の修理。第9条違反。AC-09 は**新しい道が救えること**を測る |
| `$LOCALAPPDATA/Temp` の残骸 9896 個の掃除機構 | findings §付随。同じ病の別の顔だが**別の道**。ここで混ぜると受入が曖昧になる |
| atlas の赤 2 本 | 同上（残骸由来・別件） |
| 走者の生死を OS プロセス監視で判定する | engine は state machine であり、プロセス表を覗くのは越権。時刻と人の意思で足りる（§2-3） |

---

## 8. 追跡表（願い → AC）

| 性質 | AC |
|---|---|
| P1 回復の道が engine にある（嘘を刻まない） | AC-01, AC-02, AC-03, AC-05, AC-06, AC-07 |
| P2 生きている走者を殺さない | AC-04, AC-05, AC-09b, AC-11b, AC-12 |
| P3 有限回で人へ escalate | AC-08 |
| 実物が蘇る | AC-09 |
| 門が見る | AC-10, AC-12 |
| 条として明文化 | AC-13 |
