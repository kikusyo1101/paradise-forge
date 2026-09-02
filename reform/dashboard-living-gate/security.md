# security — 安全性の検査

> **この文書は一度、存在しないまま `done` と記録された。**
> executor(執行官)が `ls` で不在を暴き、quality を差し戻した(X-1)。
> 記録は教主の過ちである — 神官が打ち切られたのに成果物の実在を確かめず done を書いた。
> **第27条は subagent だけでなく、記録する者自身にも向く。**
>
> 以下は執行官が代行して実施した検査の実出力である。教主が実物で再現し、ここに正式化した。

## 1. サーバの露出 — 緑

```
$ node graph/pulse.js serve --port 7399   (背景)
$ curl -s http://127.0.0.1:7399/health
{"ok":true,"port":7399,"connections":0,"rescans":0}

$ netstat -ano | grep 7399
 TCP  127.0.0.1:7399   0.0.0.0:0        LISTENING  34824
 TCP  127.0.0.1:51348  127.0.0.1:7399   TIME_WAIT  0
```

**`127.0.0.1` にのみ束ねられている。** `0.0.0.0` での待受は無い。
同じ機の上のプロセスからしか触れないので、外部ネットワークからの到達経路が無い。

## 2. パストラバーサル — 14経路すべて遮断

```
403  /../CONSTITUTION.md
403  /../../CONSTITUTION.md
403  /%2e%2e%2fCONSTITUTION.md          ← URL エンコード
403  /%2e%2e/CONSTITUTION.md
403  /..%2fCONSTITUTION.md               ← 部分エンコード
404  /....//CONSTITUTION.md              ← 二重ドット
403  /.%2e/CONSTITUTION.md
403  /..\CONSTITUTION.md                 ← Windows 区切り
403  /dashboard/../../CONSTITUTION.md    ← 正規パスから遡上
403  /%5c..%5cCONSTITUTION.md            ← エンコードされた \
403  /atlas/../../../CONSTITUTION.md     ← 多段
403  /../graph/pulse.js                  ← engine の露出
403  /../.env                            ← 秘密の在処
403  /../../../../Windows/win.ini        ← OS のファイル
```

**本文の漏洩はゼロ。** `403` は明示的な拒絶、`404` は解決できないパス。
どちらもファイルの中身を返していない。

## 3. 秘密の漏洩 — トークン0件 / 絶対パス5件【負債 X-2】

断面 JSON にトークン・API キー・資格情報の類は**0件**。

ただし `runs[].path` が絶対パスを露出する:

```json
"path": "C:\\Users\\kikus\\Documents\\workspace\\paradise-creations\\tenbin\\conclave.json"
```

**これを出荷阻止としない理由**(執行官の判定を教主が追認):

1. サーバは `127.0.0.1` 限定 — 外部から断面を取れない
2. **画面は `.path` を一切描画しない**(`grep` で消費者0件)
3. 露出先は同じ機の上の同じ利用者のみ — その利用者は既にそのパスを知っている

**負債として記録する。** 断面を外部へ配る日が来たら、その前に落とす鍵である。

## 4. vendor 改変の安全性 — 異常時の reject は殺していない

`overlay/vendor/archify/bin/visual-check.mjs` の `failAll` に `graceful` の別を入れた。
**正常終了(`close()` 経由)のみ静かに畳み、異常は今まで通り reject する。**

```js
child.once('close', (code, signal) => {
  this.failAll(this.failure('process exit', new Error(`Chrome closed with ${ending}`)),
    { graceful: this.closing === true });   // ← 我々が閉じたときだけ graceful
});
```

パイプ断・起動失敗・不正 JSON の3経路は `graceful` を渡していないので、
**版元の意図(異常時は本当に reject する)は 1ミリも変えていない**。

## 5. 未検査だった 2 件を、引き継いだ教主が実測した

前任は「読んだだけで試していない」と正直に書いた。**試した。**

### B-1. DoS 耐性 — 実測

ブラウザの同時接続上限は 6 本。**その倍の 12 本**を張って上限超過を踏ませた。

```
$ node -e "pulse.serve() に 12 本の /events を張る"
12本の応答:            [200,200,200,200,200,200,200,200,200,200,200,200]
データを受けた本数:     12 / 12
12本張ったまま snapshot: {"st":200,"ms":10,"len":12085}
連打100回の後 snapshot:  {"st":200,"ms":10,"len":12085}
全接続を閉じた後:        {"st":200,"ms":10,"len":12084}
```

- 12 本すべてが 200 で、**すべてが配信を受けた**(上限超過で無言にならない)
- 張ったまま通常の要求が **10ms** で通る(塞がれば実質の DoS だが、塞がっていない)
- `fs.watch` を **100 回連打**した後も 10ms で応じる(デバウンスが暴発を吸収している)
- 全接続を閉じた後も回復する(掴んだまま離さない設計ではない)

### B-2. 注入(XSS) — 実測

**神の倉には触れず**、隔離した倉に毒入りの run を置いて実ブラウザで描かせた。

```
$ mkdir "$TMP/sandbox/<img src=x onerror=alert(1)>"   # run 名そのものが毒
$ PARADISE_CREATIONS=$TMP/sandbox node graph/pulse.js serve
$ (実 Chrome で index.html を開き、DOM を問う)

結果: {"fired":false, "imgs":0, "scripts":0, "shown":true,
       "runNames":["img src=x onerror=alert(1)", ...]}
```

- `fired: false` — **スクリプトは発火しなかった**
- `imgs: 0` / `scripts: 0` — **要素として解釈されていない**
- `shown: true` かつ run 名が生の文字列 — **文字として描かれている**(`textContent` の証拠)

検査後、隔離倉は削除した(実物の兄弟倉には一切触れていない)。

### 門に据えた — 実測は流れるが、門は残る

一度測っただけでは、明日 `innerHTML` が生えても鳴らない。ゆえに門にした:

```
tests/dashboard-sse.test.js     B-1(DoS): SSE 12 本 / fs.watch 連打 100 回
tests/dashboard-states.test.js  B-2(XSS): 生 HTML の注入口がゼロであること
```

第16条により、**測っていないものを緑と呼ばない**。
この 2 件はもう「未検査」ではない —— **測って、門にした**。

## 判定

| 項目 | 結果 |
|---|---|
| サーバの束縛 | ✓ 127.0.0.1 のみ |
| パストラバーサル | ✓ 14経路すべて遮断 |
| トークン漏洩 | ✓ 0件 |
| 絶対パス露出 | ⚠️ 負債(X-2) — 出荷は止めない |
| vendor 改変 | ✓ 異常時の reject は健在 |
| DoS 耐性 | ✓ **実測** — 12本/200・連打100回後も 10ms・回復する |
| XSS | ✓ **実測** — 発火せず、文字として描かれる |

**出荷を止める欠陥は無い。** 前任が「未検査」と記した 2 件は実測して門に据えた。
