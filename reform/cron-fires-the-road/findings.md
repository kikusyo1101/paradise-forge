# findings — 日次自律改善は道を歩いていたか

**神託**: 「日次の自律改善はハーネスの設計に則って、指示、調査、検討、設計、実装、レビューを経ていますか」
**神の裁定**: 「すでに改善を回すフローがあり、CRONはそれを発火するのみ。最も近いのはAだと認識している」

## 実測 1 — 日次 cron の指示部に道は在るか

`~/AppData/Local/hermes/cron/output/04a496e1ac86/` の走行ログから指示部(102〜168行)を切り出し計数。

```
synod: 0    conclave: 0    clergy: 0    contract: 0
delegate: 0    枢機卿: 0    神官: 0    tribunal: 0
forge: 2  ← 中身は GitHub URL "paradise-forge"。道具の名ではない
```

呼ぶと書かれた `node` コマンド13本:

```
apply-seat.js cron / verify   branch-guard.js       census.js check
critic.js review              daily-guard.js due/done  deploy.js check
export-state.js               kg.js remember        workspace.js check/init/root
```

**すべて門(gate)と台帳。道(pipeline)は一本も無い。**

## 実測 2 — その道は楽園に実在するか

```
$ node graph/forge.js scale "楽園の daily-guard の欠陥を直す"
reform

$ node graph/forge.js plan "..." --out probe.dag.json
FORGED  scale=reform  phases=11  gates=[discover, specify, design, prove, verify, reflect, verdict]

tasks(11): discover(market-researcher) specify(requirements-analyst) design(architect)
           build(architect) prove(tdd-guide) review(code-reviewer) security(security-reviewer)
           docs(doc-updater) verify(verification-loop) reflect(self-critic) verdict(creation-judge)

$ node graph/check-agents.js
✓ every phase has a master / the hierarchy is real, not declared
```

**道は生きていた。日次がそれを呼んでいなかっただけである。**

## 実測 3 — 写経の規模

| | 行数 | synod | convene | ratify | gauge | verdict judge | delegate |
|---|---|---|---|---|---|---|---|
| 日次 cron 指示部 | 67 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/conclave` (本物) | 113 | 2 | 7 | 4 | 3 | 1 | 2 |

cron は `/conclave` の**劣化コピーを67行抱えていた**。

## 実測 4 — 道の側にも欠けがあった

`/conclave` は創造物専用に書かれており、**reform の作法が無い**:

```
$ grep -in "reform\|楽園自身\|第23条" overlay/commands/conclave.md
(空)
```

`workspace.js init` は楽園の**外**へ隔てる機構であり、engine を直す reform には当たらない。
実績ある置き場 `reform/<slug>/` は散文の慣習にすぎず、機構も道も知らなかった。

## 実測 5 — 己の門もまた飾りでありうる

第46条の門を建て、写経を戻して鳴らそうとしたところ **鳴らなかった**。
ジョブ探索が3マーカー一致で、壊れた版に当たらず無言で `return` していた。
**不在を通過にしていた**（第37条違反）。`daily-guard` を握る者として名指しで探し、
見つからなければ赤にする形へ作り直した。三通り（道の名を消す / 運転手順を写経する /
ジョブごと消える）すべてで鳴ることを確認済み。

## 結論

神の認識どおり、**A が正しい**。cron は発火器であり手順書ではない。
病は「道が無い」ことではなく「**道が在るのに呼ばれていない**」ことだった。
第23条が断罪した教主単独の改変は、条を建てたのちも**発火器の中に写経として生き残っていた**。
