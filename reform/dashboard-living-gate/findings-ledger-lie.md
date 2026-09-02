# X-1 — 台帳が虚偽の done を述べていた

> executor(執行官)が `ls` 一発で暴いた。**教主の過ちである。**

## 何が起きたか

security 相の神官が反復上限で打ち切られた。教主はそれを知りながら、
成果物の実在を確かめずに `done` を記録した。

```
$ ls reform/dashboard-living-gate/security.md
No such file or directory

$ node -e "台帳を読む"
{"id":"security","status":"done","artifactPath":"reform/dashboard-living-gate/security.md"}

$ git log --all --oneline -- reform/dashboard-living-gate/security.md | wc -l
0                                    ← 一度も存在したことがない
```

**台帳だけが「済んだ」と述べていた。**

## なぜ誰も気づかなかったか

教主は第27条を守り、神官の主張を何度も実物で照合してきた:

- discover 神官の R-20(spawn-trace がクラッシュする)を実物で棄却
- security 神官の「9/1 から漏れた Chrome が CDP ポートを開いている」を netstat で棄却
- review 神官の F-1〜F-11 を一つずつ確認

**だが教主が書いた台帳を、教主自身は一度も疑わなかった。**

第27条は「subagent の done を信じない」と述べる。
その条文を守る者が、**自分の書いた done を検めない**という穴が空いていた。

## 三つの手当て

### ① 台帳を差し戻した

```
$ node graph/conclave.js ratify quality --reject --from security
security: rework
```

### ② security.md を正式に起こした

執行官が代行した検査(127.0.0.1 束縛 / 14経路のトラバーサル / 秘密の走査)を
**教主自身が再現**し、`security.md` として記録した。

未検査の2件(DoS 耐性・XSS)は「安全」ではなく「**未検査**」と明記した(第16条)。

### ③ engine が二度と嘘を書けないようにした

```js
// graph/conclave.js markDone()
if (artifactPath) {
  const abs = path.isAbsolute(artifactPath) ? artifactPath
    : path.join(path.dirname(__dirname), artifactPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`成果物が実在しない: ${artifactPath}
  相 "${id}" を done にはできない —— 名乗った成果物が無い(第22条)。
  実物を確かめてから記録せよ(第27条は記録する者自身にも向く)。`);
  }
}
```

**人の注意力ではなく機械が守る**(第50条)。

則Dに従い壊して確かめた:
```
実在しない成果物 → exit=1
実在する成果物   → exit=0
```

## 副産物 — 新しい門が既存テストの嘘を 6件 暴いた

門を据えた直後、自己診断が **282 passed, 6 failed** になった:

```
✗ ratify advances the conclave to the next cardinal
✗ domain-level reject triggers an INNER rework (the small circle)
✗ a review class can send work back ACROSS domains (the great circle)
✗ cross-domain rework also resets DOWNSTREAM phases in later domains
✗ conclave: 中断→復帰→complete まで環が回りきる (第51条a)
```

原因はすべて同じ — **テストが架空の成果物名を渡していた**:

```js
conclave.markDone(run, 'discover', 'findings.md');   // 存在しない
conclave.markDone(run, 'specify',  'r.md');          // 存在しない
conclave.markDone(run, 'review',   'rv.md');         // 存在しない
conclave.markDone(run, 'security', 'sec.md');        // 存在しない
```

**門が本物である何よりの証拠である。** 6件すべてを実在するファイルへ置き換えた。

テストの目的は「相が done になる」ことの検証であって成果物名は何でもよい。
ならば**実在するものを渡すのが正しい** —— 架空名は、たまたま検査が無かったから
通っていただけである。

## 残る同型の穴(次の改修へ)

`graph/orchestrator.js:105` の `markDone` は**同じ検査を持たない**。

```
$ grep -n "markDone" graph/orchestrator.js
105:function markDone(run, id, artifact, note) {
```

conclave と orchestrator は別の道(第10条 vs 第11条)だが、
**「成果物を名乗るなら実在せねばならない」は道を問わない**。
本改修の範囲を広げないため今回は触れないが、**負債として記録する**。

## 則F

**自分が書いた記録を、他人の主張と同じ厳しさで疑え。**

第27条は subagent に向けて書かれた。だが嘘は subagent だけが生むのではない。
**記録する者が、実物を確かめずに記録した瞬間に生まれる。**

そして自分の記録は、他人の主張より疑われにくい —— 書いた本人が
「自分は確かめたはずだ」と思い込むからである。

**機械に守らせよ。** 人の注意力は、自分自身に対して最も甘い。
