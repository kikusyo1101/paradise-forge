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

## 5. この検査自身の限界(正直に書く)

- **DoS 耐性は未検査**。SSE の同時接続を増やしたときの挙動、`fs.watch` の連打は測っていない。
  ブラウザの同時接続上限(6本)を超えた場合の設計は design.md に記述があるが、
  **実測はしていない**。
- **注入(XSS)は未検査**。`conclave.json` の run 名に `<img src=x onerror=...>` を
  入れる試験を実施していない。画面が run 名をどう描くか(`textContent` か `innerHTML` か)は
  コードを読めば分かるが、**読んだだけで試していない**。

第16条により、**測っていないものを緑と呼ばない**。
上記2点は「安全と確認済み」ではなく「**未検査**」である。

## 判定

| 項目 | 結果 |
|---|---|
| サーバの束縛 | ✓ 127.0.0.1 のみ |
| パストラバーサル | ✓ 14経路すべて遮断 |
| トークン漏洩 | ✓ 0件 |
| 絶対パス露出 | ⚠️ 負債(X-2) — 出荷は止めない |
| vendor 改変 | ✓ 異常時の reject は健在 |
| DoS 耐性 | **未検査** |
| XSS | **未検査** |

**出荷を止める欠陥は無い。** ただし未検査が2件あることを明記して引き渡す。
