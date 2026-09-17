# reform `silent-mutations` — design 相 design.md

> 走行: `reform/silent-mutations` / 相: design
> 入力: `requirements.md` (718行 / AC-1〜AC-16) + `findings.md` (730行 / 実測)
> 機: Windows 11 / git-bash / Node `v24.14.0` / CI は **ubuntu**
> 基線(本相の開始時・終了時ともに実測):
> ```
> $ git -C paradise status --short            → ?? reform/silent-mutations/
> $ sha256sum graph/gauge.js                  → d1da309f101cad4edc47d05db2f78faecadfca9fdf3405027344a5fea39fa97a
> $ sha256sum graph/spawn-trace.js            → 8e9df0bcc82bc74a91a7c7f4f19e2d0ed805ca5cb46480d0f37a892b9f88a8b3
> $ sha256sum tests/paradise.test.js          → c5a1726d2e50d5c4dfb63c421b41d9994ea0e279f98c8d1b2b4703a3fcb95648
> $ sha256sum CONSTITUTION.md                 → bf239b675e27630ff93df5f47ba2ca259036d95f32298d6b18e72ee4a1aca7ff
> $ sha256sum paradise-creations/gauge-ledger.jsonl → 955ea34a…aab77 / 7 行   ← **不変**
> ```
>
> **本相は楽園の倉に一行も実装していない。** 試作はすべて `$LOCALAPPDATA/Temp/sm-design/`
> `sm-repo/`(`git archive` の複製)`sm-mut/`(変異版 10 枚)に住む。
> 途中で `tests/paradise.test.js` に二度探針を入れたが(§4-6 / §3-3)、**両方とも `cp` で戻し
> sha256 の一致を確かめてある**(上記)。本文書が作る唯一のファイルはこの一枚である。

---

## 0. 本相が実測した数(すべて本文書中で撃った値)

| # | 測ったもの | 値 | 撃った器 |
|---|---|---|---|
| **M-0** | gauge 節の現状 | `--gate gauge --gate 門ヘルパー` = **116 門 / 9.5〜9.6 秒**(requirements の 10.7 秒は別の機負荷での値。以後 **9.6 秒**を基準にする) | 実機 `time` |
| **M-1a** | 実台帳の大きさ | **2034 bytes / 7 行** | `statSync` |
| **M-1b** | 番兵一回の代 | `existsSync + readFileSync + sha256` = **0.057 ms**(116 回 = **6.6 ms** / 1000 回 = 51.5 ms) | `digest-cost.js` |
| **M-1c** | 二段構えの予備判定 | `statSync().mtimeMs + size` = **0.014 ms** | 同上 |
| **M-1d** | `withGaugeSandbox` の実呼出回数 | gauge+門ヘルパー 節の一走で **62 回**(静的な出現 59・`test()` の内側に居る門は 55 本) | `sm-repo` に計数器を注入して実測 |
| **M-2a** | AC-11 字句器(hermetic 再利用)の偽陽性 | `graph/gauge.js` **0 件** / `graph/spawn-trace.js` **0 件** / (参考)`workspace.js` **0 件** / `hermetic.js` **3 件**(`:516` `:519` `:522` の `TRACKED` — 射程外にする理由の実測) | `lexer.js` |
| **M-2b** | 註釈・文字列・テンプレート・正規表現の中の `let` | **0 件**(8 種の罠を並べた作り物で誤検出ゼロ) | `lexer-check.js` |
| **M-2c** | 字句器の所要 | 実物 2 枚 = **4.6 ms**(20 回中央値) / 複製 1 枚 = 8.5 ms / 作り物 2 枚 = 1.3 ms | `cost.js` |
| **M-3a** | AC-13 の門一本の全所要 | lead=400ms で **566 ms** / lead=250ms で **417 ms** / lead=150ms で **316 ms**(各 5 回の中央値) | `gate-cost.js` |
| **M-3b** | 競合の再現率 | lead を 400/300/250/200/150/20/5 ms と振り、**全水準で raw=2 / folded=1 / skipped=0**(各 3〜5 回、計 31 回すべて) | `race-sync2.js` |
| **M-3c** | 並列度 4 | raw=4 / folded=1 / skipped=0(5/5)→ **M2 成立** | 同上 |
| **M-3d** | M3(`skipped` の誤報) | 並列度 2 で 31 回 / 4 で 5 回、**総計 0 回** | 同上 |
| **M-3e** | M4(掃除の安全性) | 掃除前後の distinct な指紋 **1 → 1**(36/36 で不変) | 同上 |
| **M-4** | AC-15 の `--json` に `healable` を足した改修版 | exit の分布が **{健全:0, 重複:1, 事故:2, 重複+事故:2}** で改修前と**完全一致**。既存 5 門も緑 | `sm-repo` に実装して `ac15.js` + 既存門を実走 |
| **M-5** | AC-15 改修版に対する既存門 | `tests/gauge-audit.test.js` = **5 passed / 0 failed / 1 skipped** / `--gate gauge --gate 門ヘルパー` = **116 of 471 — 114 green, 0 red, 2 skipped** | `sm-repo` で実走 |
| **M-6** | 第62条の追記手順 | `CONSTITUTION.md` の `## The Verdict Law` の直前に挿入 → `codex.js check` が **exit 1「第62条が索引に無い」** → `index --write` → `check` が **exit 0「62 条」** | `sm-repo` で実走 |
| **M-7** | hermetic が `g.ledgerPath()` をどう読むか | **`unknown`(出自不明)の警告に落ちる**が `check` は **exit 0**。リテラルで綴れば警告も消える(警告 33 件 → 33 件のまま) | 実物に探針を入れて実走・即復旧 |
| **M-8** | 新設門の所要見積(AC-13 を除く) | AC-15 284ms / AC-4 65ms / AC-11 14ms / AC-12 1.3ms / 同一プロセス系 6 本 **417ms** = **781 ms** | `cost.js` |

**M1〜M4 は四つとも通った。ゆえに D-B の裁定は β + γ で確定する。α(ロック)の段には進まない。**

---

## 1. AC-1〜4 / D-A — 実台帳の番兵

### 1-1. 代の裁定 — **digest 直打ちでよい。二段構えは要らない。**

requirements §8 問い 2 は「1 秒を超えるなら `statSync` の二段構えに倒せ」と命じた。実測:

```
existsSync + readFileSync + sha256 × 116 = 6.59 ms   (1回 0.0568 ms)
statSync(mtimeMs+size)          × 116 = 1.62 ms   (1回 0.0140 ms)
```

**6.6 ms は 9.6 秒の 0.07% である。** CI 二回でも 13 ms。二段構えは 5 ms を節約するために
「mtime の粒度が粗い機で見逃す」という**新しい穴**を作る取引であり、割に合わない。
**digest を毎回採る。二段構えは採らない。**

> 注: 2034 bytes の台帳での値である。台帳が 10^4 行(≈3MB)に育てば代は線形に増えるが、
> 1000 回で 51.5 ms(= 1 回 0.0515 ms)という測定から、**代はファイル読みではなく syscall の
> 固定費が支配している**と読める。台帳が 1500 倍になるまで 1 秒には届かない。

### 1-2. `withGaugeSandbox` の finally に置く実際のコード

**住所**: `tests/paradise.test.js`。gauge 節の宣言部(`GAUGE_JS` :3455 / `WORKSPACE_JS` :3456 の直後)と
`withGaugeSandbox`(:3459)の `finally`(:3466-3472)。

宣言部に**足す**(`WORKSPACE_JS` の次の行):

```js
/**
 * ── 実台帳の番兵(第62条(b) / D-A)─────────────────────────────────
 * 本走行の discover 相で、住所解決を壊す変異(W1)が **門の防御を素通りして**
 * 実台帳に 14 行を書いた。`PARADISE_CREATIONS` の振替は「門が正しく書かれている限り」
 * しか効かない —— 振替そのものを壊す変異には無力である。
 * ゆえに **不可侵を主張ではなく測定にする**:門ごとに指紋を照合する。
 * 実測の代: sha256 一回 0.057 ms × 62 呼出 = 3.5 ms(節 9.6 秒の 0.04%)。
 */
const REAL_LEDGER = path.join(require(WORKSPACE_JS).resolve().root, 'gauge-ledger.jsonl');
const ledgerDigest = (p) => (fs.existsSync(p)
  ? require('crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex') : null);
const REAL_DIGEST = ledgerDigest(REAL_LEDGER);

/**
 * 番兵の判定 —— **純関数**である(AC-3(a) が作り物の「実台帳」でこの関数自体を撃つため)。
 * 実台帳が不在の機(CI)では `before === after === null` で true を返すが、
 * **黙って true を返してはならない** —— 不在は `sentinelSkipNote()` が名乗る(第37条)。
 */
function ledgerUntouched(before, after) { return before === after; }

/** 不在を名乗る一行(AC-3(b) / 第58条(e) / `tests/gauge-audit.test.js:177` の先例)。 */
function sentinelSkipNote() {
  return `      · skip: 実台帳が無い(${REAL_LEDGER})— 兄弟倉は楽園の倉に付いてこない。`
       + '番兵自体の歯は「実台帳が無い機でも番兵は歯を持つ」の (a) が撃っている';
}
let SENTINEL_SAID = false;   // 節に一度だけ名乗る(62 回の skip 行で画面を埋めない)
```

> ⚠️ **`let SENTINEL_SAID` は `tests/paradise.test.js` の最上位に生える可変大域である。**
> AC-11 の射程は `graph/gauge.js` と `graph/spawn-trace.js` **のみ**なので門は鳴らない。
> だが第62条(c)の「射程の外は見逃しではなく残債」に従い、**§Z-4 に名を刻む**。
> 代案(`sentinelSaid` を `withGaugeSandbox` の属性にする)は G8 変異と同型になるので採らない。

`withGaugeSandbox` の `finally` を**こう書き換える**(現行 :3466-3472 の全置換):

```js
  } finally {
    // ── ① 本体の後始末を**先に**全部済ませる(AC-1 の順序の掟) ──
    //     番兵が投げても投げなくても、env / cache / 仮倉は必ず元に戻る。
    if (prevEnv === undefined) delete process.env.PARADISE_CREATIONS;
    else process.env.PARADISE_CREATIONS = prevEnv;
    delete require.cache[require.resolve(WORKSPACE_JS)];
    delete require.cache[require.resolve(GAUGE_JS)];
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}

    // ── ② 番兵。**env を戻した後**でなければ住所が仮倉を指したままになる ──
    if (REAL_DIGEST === null) {
      if (!SENTINEL_SAID) { console.log(sentinelSkipNote()); SENTINEL_SAID = true; }
    } else {
      const after = ledgerDigest(REAL_LEDGER);
      if (!ledgerUntouched(REAL_DIGEST, after)) {
        const msg = '実台帳が書き換えられた — 門は仮倉としか話してはならない (D-A / 第30条 / 第62条 b): '
          + `before=${REAL_DIGEST} after=${after}`;
        /**
         * **番兵は本体の例外を飲み込まない(AC-2)。**
         * `finally` の中の `throw` は本体の例外を**差し替える**ので、
         * 本体が既に投げているときは名乗るだけに留める。
         * `bodyThrew` は try の外で宣言し、catch で立てる(下記)。
         */
        if (bodyThrew) console.error('🔴 ' + msg + ' (本体の例外を優先して名乗りのみ)');
        else throw new Error(msg);
      }
    }
  }
```

`bodyThrew` を立てるため、`withGaugeSandbox` の本体をこう組む(全体形):

```js
function withGaugeSandbox(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-gauge-fp-'));
  const prevEnv = process.env.PARADISE_CREATIONS;
  process.env.PARADISE_CREATIONS = tmp;
  delete require.cache[require.resolve(WORKSPACE_JS)];
  delete require.cache[require.resolve(GAUGE_JS)];
  let bodyThrew = false;                                   // ★ 足す一行
  try {
    return fn(require(GAUGE_JS), tmp);
  } catch (e) { bodyThrew = true; throw e; }               // ★ 足す一行
  finally {
    …上の ① ②…
  }
}
```

**なぜ `catch (e) { bodyThrew = true; throw e; }` で足りるか。** `finally` の `throw` は
本体の例外を無条件に上書きする —— これは JS の仕様であって作法ではない。
ゆえに「本体が投げたか」を**明示的な旗**で憶えるしかない。`try/catch/finally` の三段は
本体の例外を一度も飲まずに旗だけを立てる最小の形である。

### 1-3. AC-2 の門(本体の例外を飲み込まない)

```js
test('gauge(番兵): 実台帳の番兵は本体の例外を飲み込まない (D-A / 第16条)', () => {
  assert.throws(() => withGaugeSandbox(() => { throw new Error('BODY-BOOM'); }), /BODY-BOOM/,
    '番兵が本体の例外を差し替えた — 門が何で落ちたか分からなくなる (AC-2)');
  // 番兵の文面が本体の例外に混ざっていないこと
  try { withGaugeSandbox(() => { throw new Error('BODY-BOOM'); }); }
  catch (e) { assert.ok(!/実台帳が書き換えられた/.test(e.message), `番兵が本体の例外を汚した: ${e.message}`); }
});
```

### 1-4. AC-3 の門(不在の機で歯を持つ・skip を名乗る)

**`tests/gauge-audit.test.js` の (a)/(b) 二段作法**(:100-160 が (a)、:168-183 が (b))を踏襲する。
(b) の skip の名乗り方は **`gauge-audit.test.js:177` の `skip(…)` をそのまま写す** ——
ただし paradise.test.js 側は `skip()` が `throw e.__skip` の形(`:89`)であり、
節の途中で skip すると門一本が丸ごと飛ぶ。**AC-3 は (a) を必ず走らせたいので `skip()` を使わず、
`console.log` で名乗って通す**(`tests/route-debt.test.js:69` の先例と同型)。

```js
test('gauge(番兵): 実台帳が無い機でも番兵は歯を持つ — 不在は通過ではない (D-A / 第37条)', () => {
  // ── (a) 作り物の「実台帳」で判定関数そのものを撃つ。CI でも必ず走る歯である ──
  const box = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-sentinel-'));
  try {
    const fake = path.join(box, 'gauge-ledger.jsonl');
    fs.writeFileSync(fake, JSON.stringify({ ts: '2026-09-01T00:00:00.000Z', slug: 'sentinel-fixture',
      scale: 'standard', metrics: { score: 100, complete: true, phasesTotal: 1, phasesDone: 1,
        domainsTotal: 1, domainsRatified: 1, firstPassRate: 1, reworkCount: 0, retryOverhead: 0,
        loopGuardTrips: 0, durationMs: 1000 } }) + '\n');
    const before = ledgerDigest(fake);
    assert.ok(before, '作り物の実台帳の指紋が採れていない(前提)');
    assert.strictEqual(ledgerUntouched(before, ledgerDigest(fake)), true,
      '触っていない台帳を「書き換えられた」と呼んだ — 番兵が偽の赤を出す');
    fs.appendFileSync(fake, JSON.stringify({ ts: '2026-09-02T00:00:00.000Z', slug: 'intruder' }) + '\n');
    assert.strictEqual(ledgerUntouched(before, ledgerDigest(fake)), false,
      '一行足された台帳を「無傷」と呼んだ — 番兵に歯が無い (D-A)');
  } finally { fs.rmSync(box, { recursive: true, force: true }); }

  // ── (b) 本物。在れば照合、無ければ**名乗って**通す(黙った緑は禁じる) ──
  if (REAL_DIGEST === null) {
    console.log(sentinelSkipNote());
    assert.ok(/· skip: 実台帳が無い/.test(sentinelSkipNote()), '不在の名乗りが形を失った');
    return;
  }
  assert.strictEqual(ledgerDigest(REAL_LEDGER), REAL_DIGEST,
    '節の実行中に実台帳が動いた — どの門が汚したかは番兵の Error が名指す (D-A)');
});
```

**壊し方の実現**: `if (!fs.existsSync(REAL_LEDGER)) { console.log(…); return true; }` から
`console.log` を落とすと、この門の `assert.ok(/· skip: 実台帳が無い/…)` が落ちる。
—— **`sentinelSkipNote()` を純関数にしたのはこのためである。** 出力を grep するのではなく
**名乗りの文字列そのものを assert する**ので、CI(不在)と神の機(在る)の**どちらでも**歯が立つ。

### 1-5. AC-4 の門(W1 の再現)

```js
test('gauge(故障注入): 住所解決を壊す変異(W1)を番兵が名指す — 本走行の実害の再現 (D-A)', () => {
  const box = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-w1-'));
  try {
    fs.mkdirSync(path.join(box, 'FAKE-REAL'), { recursive: true });
    const fakeReal = path.join(box, 'FAKE-REAL', 'gauge-ledger.jsonl');
    fs.writeFileSync(fakeReal, '');
    // 注入: ledgerPath() が workspace を通らず「複製の隣」を指す(= W1 と同型)
    const broken = injectGauge(box, 'gauge-w1.js', (s) => s.replace(
      'return path.join(workspace.resolve().root, LEDGER_NAME);',
      "return path.join(__dirname, 'FAKE-REAL', LEDGER_NAME);"));
    const run = path.join(box, 'run.json');
    fs.writeFileSync(run, JSON.stringify(makeGaugeRun()));
    const body = `
      const r = g.record(${JSON.stringify(run)}, 'w1-probe');
      console.log('LEDGER=' + g.ledgerPath());
    `;
    // ── 注入版: 偽の実台帳が動く = 番兵が false を返さねばならない ──
    const before = ledgerDigest(fakeReal);
    const bad = runGaugeGate(broken, box, body);
    assert.strictEqual(bad.code, 0, `注入版が走らなかった(前提): ${bad.out}`);
    assert.strictEqual(ledgerUntouched(before, ledgerDigest(fakeReal)), false,
      '住所解決を壊した変異が偽の実台帳を汚したのに、番兵が「無傷」と答えた (D-A / AC-4)');
    assert.ok(/gauge-w1\.js|FAKE-REAL/.test(bad.out + broken), '注入版を名指していない');
    // ── 実物: 振替が効くので偽の実台帳は動かない。**片側だけでは門ではない**(第21条) ──
    fs.writeFileSync(fakeReal, '');
    const clean = ledgerDigest(fakeReal);
    const good = runGaugeGate(GAUGE_JS, box, body);
    assert.strictEqual(good.code, 0, `実物が走らなかった: ${good.out}`);
    assert.strictEqual(ledgerUntouched(clean, ledgerDigest(fakeReal)), true,
      '実物が振替の外へ書いた — 前提が崩れている');
  } finally { fs.rmSync(box, { recursive: true, force: true }); }
});
```

**実測で確かめた前提**(`mut-verify.js` の `W1-ledgerPath` 行):
実物は `ledgerPath()` が仮倉配下(`inSandbox: true`)を返す。W1 変異版は `require` の時点で
`FAKE-REAL` が無ければ落ちるので、**ディレクトリを先に作ること**が必須である
(試作では作らずに全鍵が `undefined` になった —— この失敗も設計の一部として書いておく)。

### 1-6. requirements §8 問い 3 への回答 — **節末の第二段は建てない**

**裁定: 第二段(節末の独立した門)は建てない。AC-3(b) が同じ仕事をする。**

根拠を数で書く。

| 経路 | 番兵が覆うか | 覆い方 |
|---|---|---|
| `withGaugeSandbox` を通る門 **55 本 / 62 呼出** | **覆う** | finally の①②。**どの門が汚したかを名指せる** |
| `runGaugeGate` の子プロセス | **覆う(間接)** | 子は必ず `withGaugeSandbox` か AC-4 の門の内側から起こされる。子が汚せば、呼び手の finally で after が動く |
| `gaugeCli(...)` の直接呼び出し | **覆う(間接)** | 同上 |
| `tests/gauge-audit.test.js` の `audit()` | **覆わない** | **別ファイル・別プロセス**である。paradise.test.js の番兵は届かない |

**`gauge-audit.test.js` を覆わないことは見逃しではない。** 同ファイルは `fakeVault()` で
`mkdtempSync` の倉しか作らず、実台帳の枝(:168-183)は**読むだけ**である
(`const r = audit(root)` / コメント「⚠️ 読むだけ。実台帳は**1バイトも書き換えない**」)。
`audit()` は `spawnSync(GAUGE, 'ledger', '--audit')` を撃つだけで、`--audit` は追記経路を持たない。
**名を付けて残す**: `SM-J`(`gauge-audit.test.js` に番兵を持たせるか)。→ §Z-1。

**節末の一回で済ませない理由**: requirements 自身が書いたとおり「汚した門を名指せない」。
62 回の照合の代は **3.5 ms** であり、名指しを捨てる理由が無い。W1 のとき discover は
「60 変異のうちどれが汚したか」を事後に時刻から推理した —— **その推理を二度とさせないのが本設計の目的である。**

---

## 2. AC-11/12 / D-L — 静的に大域を読む門

### 2-1. 裁定 — **`graph/hermetic.js` の `shadow` / `bindingsOf` / `functionsOf` を再利用する。輸出に足すものは無い。**

requirements §8 問い 1 への回答である。**実際に読み、実際に走らせて判定した。**

`hermetic.js` の輸出(`:758-763`):
```js
module.exports = {
  MUTATORS, SCAN_DIRS, EXEMPT, KNOWN_OPEN, ROOT,
  matchParen, splitArgs, shadow, peel, literalPath, literalPrefix, bindingsOf, bindingFor,
  functionsOf, returnsOf, originOf, anchorsOf, normalizeRel,
  scanFile, listFiles, audit, trackedSet,
};
```

| 要る仕事 | hermetic の輸出で足りるか | 判定 |
|---|---|---|
| 註釈・文字列・テンプレート・**正規表現**を空白に潰す | `shadow(src)` が**そのまま**やる。`:109-171` は `Array.from` の罠と正規表現の罠を**実測で塞いだ**版である | **足りる。書き直すな** |
| 最上位の束縛名を集める | `bindingsOf(src, sh)` が `{name, at, expr}` を返す。`const a=…, b=…` の二番目以降も拾う | **足りる** |
| 最上位の関数宣言名を集める | `functionsOf(src, sh)` が `Map<name, {at,start,end}>` を返す | **足りる**(G8 の `record.__seen` を撃つのに必要 — §2-3) |
| **「最上位か」の判定** | **無い。** hermetic は住所の出自しか見ないので入れ子の深さを持たない | **足りない → 門の側に `depthMap(sh)` を 10 行で書く** |

**ゆえに「借りる + 一つだけ足す」。足すのは `hermetic.js` の輸出ではなく、門の側の 10 行である。**
理由: `depthMap` は hermetic 自身が使わない道具であり、hermetic に足せば
「呼ぶ者の居ない輸出」= 第44条の死骸になる。**第48条は「同じ問いに二つの答えを持つな」と
命じているのであって「全ての道具を一箇所に集めろ」とは命じていない。**
字句(問い: 何が註釈か)は hermetic 一本に住み続ける。深さ(問い: 何が最上位か)は
今この門しか問わない。

### 2-2. 検査関数の実装(`tests/paradise.test.js` の gauge 節、`injectGauge` の直後に置く)

```js
/**
 * ── 最上位の可変大域を静的に検める(D-L / 第62条(c))────────────────
 * 射程: `graph/gauge.js` と `graph/spawn-trace.js` **のみ**。
 * `hermetic.js` は git の一覧の memo(`TRACKED` :516)を正当に持つので射程外である
 * (実測: 射程を graph/ 全体に広げると即座に 3 件の偽の赤 — :516 :519 :522)。
 *
 * 字句器は `graph/hermetic.js` の `shadow` / `bindingsOf` / `functionsOf` を**借りる**
 * (第48条: 同じ問いに二つの答えを持たない)。足すのは深さの地図だけである。
 */
const HERMETIC_JS = path.join(DIR, '..', 'graph', 'hermetic.js');
const SPAWN_TRACE_JS = path.join(DIR, '..', 'graph', 'spawn-trace.js');
const DESTRUCTIVE = ['push', 'set', 'add', 'delete', 'clear', 'pop', 'shift', 'unshift',
  'splice', 'sort', 'reverse'];

/** 影の各位置の入れ子の深さ。0 = 最上位。**hermetic には無い唯一の道具**である。 */
function topLevelDepths(sh) {
  const d = new Int32Array(sh.length);
  let depth = 0;
  for (let i = 0; i < sh.length; i++) {
    const c = sh[i];
    if (c === '(' || c === '[' || c === '{') { d[i] = depth; depth++; continue; }
    if (c === ')' || c === ']' || c === '}') { depth--; d[i] = depth; continue; }
    d[i] = depth;
  }
  return d;
}

function mutableGlobals(files) {
  const H = require(HERMETIC_JS);
  const found = [];
  const ESC = /[.*+?^${}()|[\]\\]/g;
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const sh = H.shadow(src);                 // ★ 註釈 / 文字列 / テンプレート / 正規表現を潰す
    const dep = topLevelDepths(sh);
    const lineAt = (i) => src.slice(0, i).split('\n').length;
    // (i) 最上位の let / var 宣言
    const declRe = /\b(let|var)\s+([A-Za-z_$][\w$]*)/g;
    let m;
    while ((m = declRe.exec(sh))) {
      if (dep[m.index] !== 0) continue;
      found.push({ file, line: lineAt(m.index), name: m[2], why: `最上位の ${m[1]} 束縛` });
    }
    // 最上位の名 = 束縛 + 関数宣言(関数も属性を持てる — G8 の `record.__seen` がこれ)
    const tops = new Set();
    for (const b of H.bindingsOf(src, sh)) if (dep[b.at] === 0) tops.add(b.name);
    for (const [fname, f] of H.functionsOf(src, sh)) if (dep[f.at] === 0) tops.add(fname);
    // (ii) 最上位の名への破壊的操作
    for (const name of tops) {
      const esc = name.replace(ESC, '\\$&');
      for (const [re, why] of [
        [new RegExp('(?<![.\\w$])' + esc + '\\s*=(?!=)', 'g'), '最上位束縛への再代入'],
        [new RegExp('(?<![.\\w$])' + esc + '\\s*\\.\\s*[A-Za-z_$][\\w$]*\\s*=(?!=)', 'g'), '最上位束縛の属性への代入'],
        [new RegExp('(?<![.\\w$])' + esc + '\\s*\\[[^\\]]*\\]\\s*=(?!=)', 'g'), '最上位束縛の添字への代入'],
        [new RegExp('(?<![.\\w$])' + esc + '\\s*\\.\\s*(?:' + DESTRUCTIVE.join('|') + ')\\s*\\(', 'g'), '最上位束縛への破壊的操作'],
      ]) {
        let g2;
        while ((g2 = re.exec(sh))) {
          // 宣言そのもの(`const X = …`)は罪ではない
          if (/\b(?:const|let|var)\s+$/.test(sh.slice(Math.max(0, g2.index - 12), g2.index))) continue;
          found.push({ file, line: lineAt(g2.index), name, why });
        }
      }
    }
  }
  found.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.name.localeCompare(b.name));
  return found;
}
```

### 2-3. 「コメントや文字列の中の `let` を誤検出しない」ことの保証 — **実測**

**保証は主張ではない。`$LOCALAPPDATA/Temp/sm-design/lexer-check.js` で八つの罠を並べて撃った:**

```js
// let ghost = 1;  ← 行註釈の中の let
/* let ghost2 = 2;  let ghost3 = 3; */      ← 塊註釈の中(二つ)
const S = 'let ghost4 = 4;';                 ← 単引用の中
const T = `let ghost5 = 5; ${'let ghost6'}`; ← テンプレート + 内側の文字列
const U = /let ghost7 = 7/;                  ← 正規表現リテラルの中
function h() { let inner = 0; return inner; }← 関数の内側(深さ > 0)
/** let ghost8 — JSDoc の中 */               ← JSDoc
```
```
[註釈・文字列の罠] 0 件 []
```

**誤検出 0/8。** 保証の機構は三段である:
1. `H.shadow(src)` が註釈・文字列・テンプレート・正規表現を**空白に潰す**。
   この関数は hermetic の build 相が `Array.from` のサロゲート罠と正規表現の罠を
   **実測で塞いだ**版である(`hermetic.js:95-108` の註釈が証拠を持つ)。
2. 走査は**影の上**で行い、行番号だけを**原本**の添字から採る。
   `shadow` は文字数を変えない(潰した箇所を空白に置換する)ので添字が一致する。
3. `topLevelDepths` が深さ 0 以外を落とす。`function h(){ let inner = 0; }` はここで落ちる。

**そして AC-12 がこの三段を門にする。** `DESTRUCTIVE` から `add` を落とせば二枚目が 2 件になり赤くなる。

### 2-4. 実測した偽陽性と検出率(**AC-11/12 の期待値はこの実測で確定する**)

| 入力 | 結果 | 判定 |
|---|---|---|
| `graph/gauge.js`(実物) | **0 件** (6.2 ms) | ✅ 偽の赤ゼロ |
| `graph/spawn-trace.js`(実物) | **0 件** (3.5 ms) | ✅ |
| (参考) `graph/workspace.js` | **0 件** | 射程を広げても偽の赤は出ない |
| (参考) `graph/hermetic.js` | **3 件**: `:516 TRACKED (let)` / `:519 TRACKED (再代入)` / `:522 TRACKED (破壊的操作)` | ✅ requirements §FR-3 の表と**完全一致**。射程外にする根拠の実測 |
| AC-12(a) 許す形 7 種 | **0 件** | ✅ 偽の赤 0/7 |
| AC-12(b) 拒む形 | **3 件**: `counter:1 (let)` / `SEEN:4 (破壊的操作)` / `TBL:4 (属性への代入)` | ✅ 3/3 |
| 註釈・文字列の罠 8 種 | **0 件** | ✅ |
| **変異 G4**(`let __recCount = 0;` を :72 の直後) | **1 件** `__recCount:73 (最上位の let 束縛)` | ✅ AC-11 の壊し方が成立 |
| **変異 G4b**(`const __SEEN = new Set();` + `.add()`) | **1 件** `__SEEN:629 (破壊的操作)` | ✅ `const` で逃げられない |
| **変異 G6**(`WEIGHTS.rework = 0;`) | **1 件** `WEIGHTS:166 (属性への代入)` | ✅ |
| **変異 G8**(`record.__seen = …`) | **1 件** `record:627 (属性への代入)` | ✅ **`functionsOf` を足した後**。足さない版では **0 件で素通りした** |
| **変異 G8b**(`const __WROTE = new Set()` + `.add()`) | **1 件** `__WROTE:647 (破壊的操作)` | ✅ |

> **`functionsOf` を足さねばならないことは実測で分かった。** 最初の試作は `bindingsOf` だけを
> 使い、`record.__seen = …`(関数宣言の属性)を **0 件で見逃した**。`functionsOf` を足して 1 件になった。
> **設計を検めずに書いていれば、G8 の層は門を建てた後も無音のままだった。**

### 2-5. AC-11 / AC-12 の門の本文

```js
test('gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない (D-L / 第62条 c)', () => {
  console.log('      · 射程: graph/gauge.js / graph/spawn-trace.js の最上位のみ — '
    + 'hermetic.js は git の一覧の memo(:516 TRACKED)を正当に持つため射程外'
    + '(第57条: 射程を広げるのは別の走行。残債 SM-L)');
  const found = mutableGlobals([GAUGE_JS, SPAWN_TRACE_JS]);
  assert.deepStrictEqual(found, [],
    '最上位に可変の大域が生えた — 呼び出しを跨いで状態を持つ道である (D-L):\n'
    + found.map(f => `  ${path.basename(f.file)}:${f.line}  ${f.name}  (${f.why})`).join('\n'));
  // ── 壊して鳴ることを同じ門で撃つ(第21条)。**複製に対して**撃つ(第58条 c) ──
  const box = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-dl-'));
  try {
    const p = path.join(box, 'gauge-g4.js');
    fs.writeFileSync(p, fs.readFileSync(GAUGE_JS, 'utf8').replace(
      "const LEDGER_NAME = 'gauge-ledger.jsonl';",
      "const LEDGER_NAME = 'gauge-ledger.jsonl';\nlet __recCount = 0;"));
    const hit = mutableGlobals([p]);
    assert.strictEqual(hit.length, 1, `G4 の一行を見逃した — 門になっていない: ${JSON.stringify(hit)}`);
    assert.strictEqual(hit[0].name, '__recCount');
    assert.ok(/最上位の let 束縛/.test(hit[0].why), hit[0].why);
    // G6 / G8 の層も同じ門で鳴ること(一行差で致命に化ける段差を塞ぐ)
    const p6 = path.join(box, 'gauge-g6.js');
    fs.writeFileSync(p6, fs.readFileSync(GAUGE_JS, 'utf8')
      .replace('  const composite = Math.max(0, Math.min(100, raw));',
               '  WEIGHTS.rework = 0;\n  const composite = Math.max(0, Math.min(100, raw));'));
    assert.strictEqual(mutableGlobals([p6]).length, 1, 'G6(定数表の破壊的書き換え)を見逃した');
    const p8 = path.join(box, 'gauge-g8.js');
    fs.writeFileSync(p8, fs.readFileSync(GAUGE_JS, 'utf8').replace(
      '    const idx = index instanceof Map ? index : keyIndex(readLedger({ raw: true }));',
      '    const idx = index instanceof Map ? index : (record.__seen || (record.__seen = keyIndex(readLedger({ raw: true }))));'));
    assert.strictEqual(mutableGlobals([p8]).length, 1,
      'G8(関数の属性への memo)を見逃した — functionsOf を借りていない');
  } finally { fs.rmSync(box, { recursive: true, force: true }); }
});

test('gauge(静的): 大域の門は定数を罪と呼ばない — 偽の赤を出さない境界 (D-L / 第16条)', () => {
  const box = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-dl2-'));
  try {
    const ok = path.join(box, 'ok.js');
    fs.writeFileSync(ok, [
      "const fs = require('fs');",
      'const WEIGHTS = { rework: 10, retryOverhead: 5 };',
      'const FROZEN = Object.freeze({ a: 1 });',
      'const RE = /^g1:[0-9a-f]{16}$/;',
      "const NAME = 'gauge-ledger.jsonl';",
      'const MAXD = 64;',
      "const isT3 = (s) => s === 'tier3';",
      "function f() { let local = 0; local++; const m = new Map(); m.set('k', 1); return local + m.size; }",
      'module.exports = { WEIGHTS, FROZEN, RE, NAME, MAXD, isT3, f };',
    ].join('\n'));
    assert.deepStrictEqual(mutableGlobals([ok]), [],
      '定数を罪と呼んだ — この門は偽の赤を出す (D-L)');
    // 註釈・文字列・テンプレート・正規表現の中の `let` を罪と呼ばない(字句器の歯)
    const trap = path.join(box, 'trap.js');
    fs.writeFileSync(trap, [
      '// let ghost1 = 1;',
      '/* let ghost2 = 2;  let ghost3 = 3; */',
      "const S = 'let ghost4 = 4;';",
      'const T = `let ghost5 = 5; ${"x"}`;',
      'const U = /let ghost6 = 6/;',
      'function h() { let inner = 0; return inner; }',
      '/** let ghost7 — JSDoc の中 */',
      'module.exports = { S, T, U, h };',
    ].join('\n'));
    assert.deepStrictEqual(mutableGlobals([trap]), [],
      '註釈か文字列の中の let を罪と呼んだ — 字句器が影を作れていない (D-L)');
    const bad = path.join(box, 'bad.js');
    fs.writeFileSync(bad, [
      'let counter = 0;',
      'const SEEN = new Set();',
      'const TBL = { n: 0 };',
      'function g() { counter++; SEEN.add(counter); TBL.n = counter; return counter; }',
      'module.exports = { g };',
    ].join('\n'));
    const hits = mutableGlobals([bad]);
    assert.strictEqual(hits.length, 3,
      `可変の大域を見逃した — 門になっていない (D-L): ${JSON.stringify(hits)}`);
    assert.deepStrictEqual(hits.map(h => h.name).sort(), ['SEEN', 'TBL', 'counter']);
  } finally { fs.rmSync(box, { recursive: true, force: true }); }
});
```

**所要**: AC-11 = 実物 4.6 ms + 複製 3 枚 ≈ 26 ms。AC-12 = 1.3 ms。**合計 27 ms。**

---

## 3. AC-13 / D-B β — 二プロセスの競合門

### 3-1. 実装形の裁定 — **「同期の駆動子」形を採る。`spawnSync` の並列は不可能、`runGaugeGate` の拡張は不可。**

三案を実際に書いて比べた。

| 案 | 撃てるか | 実測 | 判定 |
|---|---|---|---|
| **(A) `spawnSync` を N 本並べる** | **撃てない。** `spawnSync` は**直列**である。対照群で実測: raw=**1** / 二本目が `{"skipped":true}` —— **競合が一度も起きない** | 125 ms / raw=1 | **却下** |
| **(B) `spawn` を N 本 + `await`** | 撃てるが `paradise.test.js` の `test()` は**同期**である(`:90 function test(name, fn) { … fn(); … }`)。`fn` が Promise を返しても誰も待たない | — | **却下** |
| **(C) 同期の駆動子**: 門は `execFileSync` 一発。**駆動子の中**で `spawn` を N 本起こし spin barrier で揃える | **撃てる。** 門は同期のまま、競合は駆動子の内側で起きる | **316〜566 ms**(§3-3) | **採る** |
| (D) `runGaugeGate` の拡張 | `runGaugeGate` は `execFileSync(process.execPath, ['-e', script])` を**一本**撃つ形である。N 本の同時性を持ち込むと既存 10 箇所の呼び手すべてに影響する(第57条: 修理は掟を広げてはならない) | — | **却下** |

**そして (C) を書くときの罠を実測で踏んだ。** 最初の試作は駆動子も子も `-e` の文字列に
入れ子で書いたが、**`JSON.stringify` の二重埋め込みが壊れて子が全滅した**
(`require(""C:/...gauge.js"")` / `SyntaxError: missing ) after argument list` × 10 本、
raw=0 で「競合しなかった」と偽の結論を出しかけた)。

> **⚠️ build 相への警告: 子と駆動子は仮倉の中に `.js` ファイルとして書け。`-e` の入れ子は壊れる。**
> 壊れても `execFileSync` は exit 0 で帰る(子の失敗は駆動子の exit に載らない)ので、
> **raw=0 が「競合窓に入らなかった」と読めてしまう** —— 前提の skip 枝が
> **静かに嘘を吐く**形である。ゆえに §3-4 の skip 枝は `raw === 0` を skip に含めない。

### 3-2. 門の本文

```js
test('gauge(並行): 競合で重複が生まれても畳みが読み手を守る — 治癒に寄りかかると決めた以上、治癒を門にする (D-B / 第55条 b / 第62条 a)', () => {
  const box = fs.mkdtempSync(path.join(os.tmpdir(), 'paradise-gauge-race-'));
  try {
    const runFile = path.join(box, 'run.json');
    fs.writeFileSync(runFile, JSON.stringify(makeGaugeRun()));
    /**
     * 子と駆動子は**ファイルとして**書く。`-e` の文字列に入れ子で埋めると
     * `JSON.stringify` の二重化で壊れ、**壊れたまま exit 0 で帰る**(design 相の実測)。
     */
    const childJs = path.join(box, 'race-child.js');
    fs.writeFileSync(childJs, [
      'const g = require(process.argv[2]);',      // require を先に済ませる
      'const T0 = Number(process.argv[4]);',
      'while (Date.now() < T0) {}',               // spin barrier — setTimeout では窓(10〜20ms)に入らない
      "const r = g.record(process.argv[3], 'race');",
      "process.stdout.write(r.skipped ? 'S' : 'W');",
    ].join('\n'));
    const driverJs = path.join(box, 'race-driver.js');
    fs.writeFileSync(driverJs, [
      "const { spawn } = require('child_process');",
      'const [, , childPath, gaugePath, runPath] = process.argv;',
      'const N = 2, T0 = Date.now() + 400;',      // 400ms = 子 2 本が require を終えるのに十分な余裕
      "let left = N, marks = '';",
      'for (let i = 0; i < N; i++) {',
      "  const p = spawn(process.execPath, [childPath, gaugePath, runPath, String(T0)], { stdio: ['ignore', 'pipe', 'inherit'] });",
      "  p.stdout.on('data', (d) => { marks += d; });",
      "  p.on('close', () => { if (--left === 0) process.stdout.write(marks); });",
      '}',
    ].join('\n'));
    const env = { ...process.env, PARADISE_CREATIONS: box };
    const marks = execFileSync(process.execPath, [driverJs, childJs, GAUGE_JS, runFile],
      { encoding: 'utf8', env });
    const L = path.join(box, 'gauge-ledger.jsonl');
    const raw = fs.existsSync(L) ? fs.readFileSync(L, 'utf8').split('\n').filter(Boolean).length : 0;

    // ── 器が壊れたのか競合しなかったのかを分ける(第16条)──
    assert.strictEqual(marks.length, 2,
      `子が二本とも答えていない — 器が壊れている(競合の有無とは別問題): marks=${JSON.stringify(marks)} raw=${raw}`);
    assert.ok(raw >= 1, `子が一行も刻んでいない — 器が壊れている: raw=${raw}`);

    // ── 前提が立たなかった場合は赤にせず**名乗って**通す(第58条 e)──
    if (raw < 2) {
      console.log(`      · skip: 競合窓に入らなかった(raw=${raw})— 治癒の門は前提が立ったときだけ判定する`);
      return;
    }
    assert.strictEqual(raw, 2, `競合の前提が崩れた(重複が 2 行でない): ${raw}`);
    // ── 本題(四つ)──
    const folded = Number(execFileSync(process.execPath,
      ['-e', 'console.log(require(process.argv[1]).readLedger().length)', GAUGE_JS],
      { encoding: 'utf8', env }).trim());
    assert.strictEqual(folded, 1,
      `畳みが競合下の重複を拾えなかった — 治癒が成立していない (D-B β): folded=${folded}`);
    assert.strictEqual((marks.match(/S/g) || []).length, 0,
      `子が「既記録」を誤報した — 記録が失われる方向の破れ: marks=${marks}`);
    let audit;
    try { audit = { code: 0, out: execFileSync(process.execPath, [GAUGE_JS, 'ledger', '--audit'],
      { encoding: 'utf8', env }) }; }
    catch (e) { audit = { code: e.status, out: String(e.stdout || '') }; }
    assert.strictEqual(audit.code, 1, `audit の exit が規約から外れた: ${audit.code} / ${audit.out}`);
    assert.ok(/rows=2 distinct=1 duplicates=1 conflicts=0 too-deep=0 corrupt=0 suspect=0/.test(audit.out),
      `競合の跡が「機械が畳める欠陥」と分類されていない: ${audit.out}`);
    assert.ok(/機械が畳めば消える/.test(audit.out),
      `AC-15 の文面が competition の跡に出ていない: ${audit.out}`);   // γ と噛み合っていること
  } finally { fs.rmSync(box, { recursive: true, force: true }); }
});
```

### 3-3. 所要の実測 — **門一本 566 ms(lead=400ms)**

`gate-cost.js`(駆動子 + raw 読み + 畳み確認 + `--audit` の四段すべてを含む、各 5 回):

| lead | 門一本の全所要(中央値) | ばらつき | 競合の成否 |
|---|---|---|---|
| 400 ms | **566 ms** | 561〜573 | raw=2 / folded=1 / skipped=0 |
| 250 ms | **417 ms** | 411〜420 | 同上 |
| 150 ms | **316 ms** | 310〜318 | 同上 |

**M1 の判定(≤ 1500ms)は 400ms でも通る。** `paradise.test.js` に置いてよい。
**lead は 400 ms を採る。** 250/150 でも本機では全件競合したが、
**CI(ubuntu / 共有ランナー)は Node の起動が遅い可能性がある** —— lead が子の `require` より
短ければ子は barrier を素通りし、競合窓に入らずに §3-4 の skip 枝へ落ちる。
**166 ms(566 − 400)の節約のために CI で常時 skip する門を作るのは第37条の自傷である。**

### 3-4. flaky にならない保証 — **三段に分ける**

requirements は「競合が起きなかったとき門はどう振る舞うか」を問うた。**三つの状態を区別する。**

| 状態 | 見分け方 | 門の振る舞い |
|---|---|---|
| **器が壊れた** | `marks.length !== 2` または `raw === 0` | **赤。** 子が走っていないのは競合の問題ではない。**ここを skip に含めると、`-e` の入れ子が壊れた試作のように「静かな緑」になる**(design 相が実際に踏んだ) |
| **競合窓に入らなかった** | `raw === 1`(子は両方走ったが一方が `skipped`) | **`· skip:` を名乗って通す**(第58条 e)。機の速さに依存する前提を赤の理由にしない |
| **競合した** | `raw === 2` | **本題の四つを判定** |

**実測の裏付け**: 本機で lead を 5 ms(子の `require` が終わる前)まで削っても
**raw=2 / skipped=0 が 31/31**。競合窓に入らない状態は**本機では一度も作れなかった**。
ゆえに skip 枝は「CI で起きうる未知の遅さ」への保険であって、
**本機では常に本題まで到達する**(神の機で門の歯が毎回立つ)。

### 3-5. Windows 固有の前提を持ち込んでいないことの確認

| 使う機能 | ubuntu で動くか |
|---|---|
| `child_process.spawn` / `execFileSync` | ✅ POSIX 標準 |
| `while (Date.now() < T0) {}` の spin | ✅ 言語機能 |
| `fs.mkdtempSync(path.join(os.tmpdir(), …))` | ✅ |
| `fs.appendFileSync`(engine 側) | ✅ **ただし** findings §A-5 が確かめたのは NTFS である。ubuntu の `O_APPEND` は POSIX が 4KB 以下の原子性を保証する。**本門が撃つ一行は約 400 bytes** なので、どちらの機でも切れない |
| `mklink /J` / junction | **使わない**(D-H = 残債 SM-H。本走行では建てない) |
| `\\?\` 長パス / ADS | **使わない** |

**Windows でしか起きない前提はゼロである。**

---

## 4. AC-15 / D-B γ — `--audit` の文面と `--json` の `healable`

### 4-1. 実装 — `graph/gauge.js:938` の三行を五行にする

現行(`:938-940`):
```js
        const human = a.conflicts.length;   // forged-fp / too-deep / corrupt / 先回り はどれも人の手が要る
        if (human > 0) { console.log(`  🔴 人が読むべき行が ${human} 件ある — 掃除では消えない`); process.exit(2); }
        process.exit(a.duplicates > 0 ? 1 : 0);
```

**改修後**(この形を `sm-repo` の複製に実装し、既存門を実走して確かめてある):
```js
        const human = a.conflicts.length;   // forged-fp / too-deep / corrupt / 先回り はどれも人の手が要る
        /**
         * **`healable` = 「掃除(FR-8)を掛ければ消える欠陥しか残っていない」**(D-B γ)。
         * 競合由来の重複は畳みで消える。偽の鍵・深すぎる行・破損行・先回りは人が読むまで消えない。
         * **exit code は一切動かさない** —— 既存 5 門がこの規約を符号化している(第57条)。
         */
        const healable = human === 0;
        if (argv.includes('--json')) console.log(JSON.stringify({ ...a, healable }));
        if (human > 0) { console.log(`  🔴 人が読むべき行が ${human} 件ある — 掃除では消えない`); process.exit(2); }
        if (a.duplicates > 0) console.log('  🧹 機械が畳めば消える(競合の跡)— 人の手は要らない');
        process.exit(a.duplicates > 0 ? 1 : 0);
```

**要点四つ:**
1. **`healable` は `human === 0` で決まる。** `conflicts` には forged-fp / too-deep / corrupt /
   preemption-suspect の**四種すべて**が積まれる(`auditLedger` の `:742-786`)。
   `conflicts.length === 0 && corrupt === 0 && suspect === 0` と書くのは冗長である
   —— corrupt も suspect も `conflicts` に**必ず**押し込まれる(`:781-786` / `:787-790`)ので
   `human` 一本で足りる。**requirements §AC-15 の壊し方(`healable = true` に潰す)はそのまま成立する。**
2. **`--json` の行は `human > 0` の判定より前に出す。** 後に置けば exit 2 の道で JSON が出ない。
3. **`🧹` の行は `process.exit` の直前**。requirements の要求どおり
   「`duplicates > 0 && conflicts === 0`」のときだけ出る(`human > 0` なら既に exit 2 している)。
4. `--json` を撃っても**人が読む一行目は出続ける**。既存門(`gauge-audit.test.js:113` 等)は
   `--json` を渡さないので影響を受けないが、渡された場合でも壊れない形にした。

### 4-2. 実測 — 改修版の exit / 文面 / `healable`

`ac15.js` を `sm-repo`(改修版)と実物(対照群)に撃った:

| 入力 | 実物 exit | **改修版 exit** | 改修版の人が読む文面 | `healable` |
|---|---|---|---|---|
| 1. 競合の跡(同一行 ×2) | 1 | **1** | `rows=2 … duplicates=1 conflicts=0 …` + `🧹 機械が畳めば消える(競合の跡)— 人の手は要らない` | `true` |
| 2. 事故(破損行 + 正規行) | 2 | **2** | `⚠️ 破損行: …` + `🔴 人が読むべき行が 1 件ある — 掃除では消えない`(`🧹` は**出ない**) | `false` |
| 3. 健全(正規行一行) | 0 | **0** | `rows=1 distinct=1 duplicates=0 … suspect=0`(`🧹` も `🔴` も出ない) | `true` |
| 4. 重複 + 事故(追加で撃った) | 2 | **2** | `🔴` のみ(`🧹` は**出ない**) | `false` |

**exit code の分布は 4/4 で不変である。**

### 4-3. requirements §6-1 の 5 本を**一本ずつ実際に読んで**確かめた

| # | 門 | 住所 | 読んだ結果 | 改修版で実走 |
|---|---|---|---|---|
| 1 | `gauge: 矛盾は判別可能な信号で名指される (AC-7b / NFR-2)` | `paradise.test.js:3944` | `--audit` を `--json` 無しで撃ち、`code` と `/矛盾/` `/conflicts=1/` `/rows=30 distinct=6 duplicates=24/` `/duplicates=0 conflicts=0/` を見る。**新設の `🧹` 行は `duplicates=24` の入力(dup)で出るが、この門は exit と上の正規表現しか見ない** | ✅ 緑 |
| 2 | `gauge(CLI): audit の信号は「掃除できる欠陥」と「人が読むべき事故」を分ける (P-8)` | `paradise.test.js:4791` | **exit code しか見ない**(`.code` を四回 assert)。文面は一切読まない | ✅ 緑 |
| 3 | `gauge(CLI): exit code の規約に実装が従う — 2 は台帳の事故に予約する (D-3)` | `paradise.test.js:5653` | `gaugeCli` の `.code` のみ。引数の誤り 6 種が 3、台帳の事故が 2、測れない run が 2 | ✅ 緑 |
| 4 | `【逆】重複を仕込むと exit 1 — 機械が畳めば消える欠陥 (第55条)` | `gauge-audit.test.js:117` | `r.code === 1` と `/duplicates=1/`。**`🧹` の行は `duplicates=1` の**後**に出るので正規表現に掛からない** | ✅ 緑 |
| 5 | `実台帳が健全である — 在る環境では本物を監査する` | `gauge-audit.test.js:168` | `r.code === 0`。健全なら `🧹` も `🔴` も出ない | ✅ 緑(神の機)/ 名乗って skip(CI) |

**さらに `--audit` の文面を読む門を grep で総ざらいした**(§X-1)。**5 本で漏れは無い。**

**実走の証拠:**
```
$ cd $LOCALAPPDATA/Temp/sm-repo && node tests/gauge-audit.test.js
Gauge ledger audit self-test: 5 passed, 0 failed, 1 skipped
$ node tests/paradise.test.js --gate gauge --gate 門ヘルパー
Paradise gate-filter: 116 of 471 gates matched — 114 green, 0 red, 2 skipped
```
(2 skipped は実台帳と兄弟倉が `sm-repo` に無いための正当な skip。**赤は 0 本。**)

### 4-4. requirements §8 問い 5 — **`pulse` は `healable` を拾わない。ゆえに `--json` に足してよい。**

`graph/pulse.js:47` は `require('./gauge.js')` で**モジュールとして**読む。
`--audit` の CLI 経路も `--json` の出力も**一切通らない**:

```js
// pulse.js:448-458 — ledger 節の全体
const ledger = guard(errors, 'gauge', 'ledger', () => {
  const rows = gauge.readLedger();                 // ← モジュール直呼び。CLI ではない
  if (!Array.isArray(rows)) throw new Error('readLedger() が配列を返さなかった');
  return rows.map(r => ({ ts: r.ts, slug: r.slug, scale: r.scale,
    score: r.metrics ? r.metrics.score : null,
    phasesDone: r.metrics ? r.metrics.phasesDone : null,
    phasesTotal: r.metrics ? r.metrics.phasesTotal : null }));
}, null);
```

**`pulse.js` に `--audit` も `auditLedger` も現れない**(grep で確認: `gauge` の出現 12 箇所を全部読んだ)。
ゆえに第29条(生成物の中身を前提にした検査を作らない)の危険は無い。

**それでも `--json` に足す**理由: 文面だけでは**機械が読めない**。`healable` は
「掃除を回してよいか」の判断材料であり、将来の掃除スクリプト(FR-8 / 残債)が読む欄である。
文面の grep に依存させれば、それこそ第29条の違反になる。
**exit code を動かさないという凍結は保ったまま、機械可読な信号だけを足す。**

---

## 5. AC-5 / AC-6 — 序列の門の入力(すべて実測で確定)

### 5-1. `stripped` の run をどう作るか

**`makeGaugeRun()` は使えない。** 実測した理由:

```js
// paradise.test.js:3340 の makeGaugeRun は `created` を持たない
return { meta: { scale: 'standard' }, domains: [...], history: [...] };
```
`trace.epochStatus({})` は **`legacy`** を返す(実測)。`created` が無い run は紀元前扱いである。
ゆえに **AC-5 は `created` を明示的に持つ独自の run を組む**。

```js
/** 印を消した走行(stripped)—— 紀元以後に convene され、`tierTrace` を一つも持たない。 */
function makeStrippedRun() {
  return {
    created: '2026-09-10T00:00:00.000Z',        // TIER_EPOCH_AT (2026-09-03T04:54:49.000Z) より後
    meta: { scale: 'standard' },
    domains: [{ status: 'ratified', phases: ['a', 'b', 'c', 'd']
      .map(id => ({ id, status: 'done', attempts: 1 })) }],
    history: [{ ts: '2026-09-10T00:00:00.000Z', event: 'convene' },
              { ts: '2026-09-10T00:30:00.000Z', event: 'complete' }],
  };   // ← `epoch` 鍵も `tierTrace` も持たない = 印を消した走行
}
```

**実測した期待値**(`ac-inputs.js` で実機に撃った):

```
[AC-5 stripped] score=60 noTier=4 unobservable=0 tier1=0 tier2=0 tier3=0 complete=true
[対照 legacy]   score=100 noTier=0 unobservable=4
```

```js
test('gauge: 印を消した走行(stripped)は序列の罰を免れない (D-C / 第52条)', () => {
  const m = gauge.score(makeStrippedRun());
  assert.strictEqual(m.score, 60,
    `印を消した走行が ${m.score} 点を得た — 第52条の門を回避できる (D-C)。` +
    '恩赦は移行のためであって回避のためではない');
  assert.strictEqual(m.noTier, 4, `罰の対象が ${m.noTier} 相 — 4 相すべてが無印であるべき (D-C)`);
  assert.strictEqual(m.unobservable, 0,
    `stripped が unobservable に逃げた (${m.unobservable}) — legacy と同じ扱いになっている (D-C)`);
  assert.strictEqual(m.complete, true, '完走の run で撃っていない(前提)— 未完走の減点と混ざる');
  // ── 対照群: 紀元**前**の走行は恩赦される(移行の安全を壊していないこと)──
  const legacy = gauge.score({ ...makeStrippedRun(), created: '2026-08-01T00:00:00.000Z' });
  assert.strictEqual(legacy.score, 100, `legacy を遡って有罪にした (${legacy.score}) — 第16条`);
  assert.strictEqual(legacy.unobservable, 4, '恩赦された走行が unobservable で数えられていない');
});
```

> **対照群を同じ門に入れた理由**(requirements に無い追加): S1 変異(`!== 'legacy'` → `=== 'present'`)は
> stripped 側を 100 にするが、**legacy 側は 100 のまま**である。片側だけ見る門は
> 「恩赦を壊す修理」(= legacy を 60 にする逆の変異)を見逃す。第21条 a の適用である。

### 5-2. `TIER_EPOCH_AT` の凍結 — **N18 の `g1:` と同じ作法**

先例(`paradise.test.js:4338` の `gauge: 指紋の版は黙って動かない — g1: の値を固定する (N18)`)を写す。
requirements §8 問い 7 への回答: **その作法でよい。そして掟を assert の文面に書く。**

```js
test('gauge: 紀元の日付は黙って動かない — TIER_EPOCH_AT の値を固定する (D-C / N18 と同じ作法)', () => {
  const trace = require(SPAWN_TRACE_JS);          // cache を捨てない — 定数の照合である
  assert.strictEqual(trace.TIER_EPOCH_AT, '2026-09-03T04:54:49.000Z',
    '紀元が黙って動いた — engine の一行で全歴史の点が動く (D-C / 第52条)。' +
    '正当に動かすなら、この門も同じ PR で動かせ(N18 の g1: と同じ掟)。' +
    '門を先に動かさずに engine だけ動かす道は無い');
  // 値の固定だけでは足りない — その値が**何を分けるか**も凍らせる(第38条: 数で示せ)
  assert.strictEqual(trace.epochStatus({ created: '2026-09-10T00:00:00.000Z' }), 'stripped',
    '紀元以後の無印が stripped と呼ばれていない — 恩赦が回避に化ける (D-C)');
  assert.strictEqual(trace.epochStatus({ created: '2026-08-01T00:00:00.000Z' }), 'legacy',
    '紀元以前の走行が legacy でなくなった — 過去の点が後から動く (AC-H3)');
  assert.strictEqual(trace.epochStatus({}), 'legacy',
    'created を持たない走行の扱いが変わった — 旧い run-state が遡って有罪になる');
});
```

**実測で確かめた三値**: `stripped` / `legacy` / `legacy`。
**S4 変異(2099 に動かす)を撃つと**:`at` が `2099-01-01T00:00:00.000Z`、
`epochStatus({created:'2026-09-10'})` が **`stripped` → `legacy`** に倒れる
(`mut-verify.js` の実測)。**一本目と二本目の assert が同時に鳴る。**

---

## 6. 門の頃合いと所要の見積

### 6-1. AC ごとの門数

| AC | 建てる門 | 本数 | 形 |
|---|---|---|---|
| AC-1 | (門ではなく器 = `withGaugeSandbox` の finally) | **0** | — |
| AC-2 | `gauge(番兵): 実台帳の番兵は本体の例外を飲み込まない` | **1** | 同一プロセス |
| AC-3 | `gauge(番兵): 実台帳が無い機でも番兵は歯を持つ` | **1** | 同一プロセス + 仮倉 |
| AC-4 | `gauge(故障注入): 住所解決を壊す変異(W1)を番兵が名指す` | **1** | 複製 + 子 2 本 |
| AC-5 | `gauge: 印を消した走行(stripped)は序列の罰を免れない` | **1** | 純関数 |
| AC-6 | `gauge: 紀元の日付は黙って動かない` | **1** | 純関数 |
| AC-7 | `gauge: record は台帳を信じ、プロセスの記憶を信じない` | **1** | 仮倉 |
| AC-8 | `gauge: ts が読めない既存行は正当な先着ではない` | **1** | 仮倉 |
| AC-9 | `gauge: 先回りの三つの物差しは独立に効く` | **1** | 仮倉 ×4 |
| AC-10 | `gauge: 同一プロセスで N 回採点しても点は動かない` | **1** | 純関数 |
| AC-11 | `gauge(静的): 台帳を書く engine は最上位に可変の大域を持たない` | **1** | 静的 + 複製 3 枚 |
| AC-12 | `gauge(静的): 大域の門は定数を罪と呼ばない` | **1** | 静的 + 作り物 3 枚 |
| AC-13 | `gauge(並行): 競合で重複が生まれても畳みが読み手を守る` | **1** | 駆動子 + 子 2 本 |
| AC-15 | `gauge(CLI): audit は競合の跡と事故を文面で分ける` | **1** | 子 6 本 |
| AC-14 / AC-16 | 測定と既存門 | **0** | — |
| **合計** | | **14** | requirements の「新設 14 門」と一致 |

### 6-2. 所要の見積と根拠

| 要素 | 実測 | 根拠 |
|---|---|---|
| **AC-13**(並行) | **566 ms** | `gate-cost.js` lead=400 の 5 回中央値 |
| **AC-15**(CLI 子 6 本) | **284 ms** | `cost.js`。子 1 本 ≈ 47 ms × 6 |
| **AC-4**(複製 2 枚 + 子 2 本) | **65 ms** | `cost.js` |
| **AC-11 + AC-12**(静的) | **27 ms** | 実物 4.6 + 複製 3 枚 ≈ 25 + 作り物 1.3 |
| **AC-2/3/5/6/7/8/9/10**(同一プロセス系 8 本) | **~490 ms** | `cost.js` の「仮倉 + record」= 69.5 ms × 6 本 + 純関数 3 本(AC-5/6/10)は各 < 2 ms + AC-9 は仮倉 ×4 で ~140 ms |
| **AC-1 の番兵**(既存 62 呼出 + 新設ぶん) | **+4 ms** | 0.057 ms × ~70 |
| **新設の合計** | **≈ 1.44 秒** | |

**gauge 節の見積: 9.6 秒 → 11.0〜11.5 秒(+1.4〜1.9 秒)。**
requirements の基準は「10.7 秒 → 16 秒以下」だったので、**基準に対して 4.5 秒以上の余裕がある。**

**NFR-1(全走増分 ≤ 20 秒)に対して**: 増分 **1.4 秒**。CI は ×2 なので実費 **2.8 秒**。
**上限の 7% である。設計を変える必要は無い。**

**全走の見積: 約 6 分 → 約 6 分 2 秒。** 門の総数 **471 → 485**。

> **AC-13 の lead を削れば更に 250 ms 縮むが、削らない。** §3-3 の理由(CI の遅さへの保険)。
> 余裕が 4.5 秒あるのだから、**確実に歯が立つ側に倒す。**

### 6-3. 頃合い — 門をどこに挿すか

| 門 | 挿入位置(現在の行番号) | 理由 |
|---|---|---|
| AC-2 / AC-3 / AC-4(番兵三本) | `injectGauge` / `runGaugeGate` / `seedGaugeCreations` の定義の**直後**(:3585 付近、最初の `test('gauge: 同一 run の…')` :3588 の直前) | 器を定義した直後に器自身の門を置く。AC-4 は `injectGauge` と `runGaugeGate` の両方を要する |
| AC-11 / AC-12(静的二本) | AC-2〜4 の直後 | 番兵と同じ「門の形を検める」層。実行が速い(27 ms)ので節の頭に置いて早く落ちる |
| AC-5 / AC-6(序列二本) | `gauge: 手つかずの走行は拒否 …`(:6134)の直前 | 序列は `spawn-trace.js` を読む。節の既存の序列系(第52条節 :7310)とは別に、gauge 節の末尾に集める |
| AC-7 / AC-8 / AC-9(台帳の三本) | `gauge: 先回り毒は正当な観測を刻ませないことができない (F-1)`(:5537)の**直後** | F-1 の回帰が集まる `Gauge 先回りと破損の門 (build attempt 4)` 節(:5524)の内側。D-E は F-1 が塞いだ窓の回帰である |
| AC-10(決定性) | AC-5 / AC-6 の隣 | 純関数の門を固める |
| AC-13(並行) | `gauge: 呼び出しを跨いで状態を持たない — 別プロセスで撃つ (D-6)`(:5905)の**直後** | 既にそこが「別プロセスで撃つ門」の場所である。第62条(a) の二例が隣り合う |
| AC-15(CLI) | `gauge(CLI): audit の信号は「掃除できる欠陥」と「人が読むべき事故」を分ける (P-8)`(:4791)の**直後** | 同じ規約を守る門を隣に置く。P-8 が exit を守り、AC-15 が文面を分ける |

---

## 7. 第62条の追記手順(**実機で一通り走らせて確かめた**)

### 7-1. 挿入位置 — `## The Verdict Law` の**直前**

`CONSTITUTION.md` は 1573 行。末尾は条文ではなく `## The Verdict Law` の表である:

```
1538: 61. **判定器を直したら、その判定器が奪いうる全ての行き先を数えよ。**
  …(第61条の本文)…
1559:    `tests/lesson-export.test.js` が原本(KG)と帳を id の集合で突き合わせる。
1560: (空行)
1561: ## The Verdict Law
```

**ゆえに「末尾に追記」ではない。`## The Verdict Law` の直前、第61条の本文の後に挿す。**
改行コードは **CRLF** である(`cat -A` で確認)。build 相は CRLF を保って書け
(Python なら `io.open(..., newline='')`、エディタなら改行設定を確かめよ)。

### 7-2. 手順と実測

```bash
# ① CONSTITUTION.md の `## The Verdict Law` の直前に第62条(requirements §7-2 の文案)を挿す
# ② 索引が古いことを門に言わせる(手順を飛ばさない証拠)
$ node graph/codex.js check
  🔴 第62条が索引に無い
       → node graph/codex.js index --write
  exit 1                                        ← 実測
# ③ 索引を建て直す(**手で書くな**)
$ node graph/codex.js index --write
  ✍️  CONSTITUTION.INDEX.md を建てた (5501 B)     ← 実測
# ④ 一致を確かめる
$ node graph/codex.js check
  ✓ 索引は本文と一致している (62 条)              ← 実測
  exit 0
$ tail -1 CONSTITUTION.INDEX.md
  | 62 | 門の形が、門の盲点を決める。… | 593 |     ← 実測
```

**この四段を `sm-repo` の複製で実走した。** ②が exit 1 を返すことまで確かめてある ——
**索引を手で書けば③が無意味になり、④が嘘の緑を返す形にはなっていない**(check は本文を読み直す)。

### 7-3. 数の測り直し(第22条)

`README.md:138` の `# 門 471 本` が **485** になる。**手で書くな。**

```bash
$ node graph/census.js fix     # 自己診断を素で走らせて README を書き換える(全走 6 分を一度払う)
$ node graph/census.js check   # ✓ every number the paradise claims about itself is true
```

`census.js` は `summaryOf()`(`:73-95`)で `passed + failed + skipped` を読む ——
**skip を名乗る門(AC-3(b) / AC-13 の skip 枝)が CI で飛んでも数は動かない。**
新設の AC-3 は神の機では緑、CI では緑(名乗って通す形で `skip()` を投げない)なので、
**両方の機で 485 と数えられる。**

> ⚠️ `census.js fix` は**全走を一度要求する**(`graph/census.js:90` が自己診断を素で呼ぶ)。
> これが本走行で全走 6 分を払う**唯一**の段である。§8 の順序で最後に置いた理由である。

### 7-4. `tribunal.yml` は一行も変えない

- 第62条: `📜 Constitution` 段は `count >= 12` を検めるだけ(requirements §7-3-3 の確認どおり)。
- AC-13: FR-4 の裁定に従い新ファイルを作らないので `node graph/wiring.js check` は不変
  (実測: `sm-repo` で `✓ 門 25 本すべてに走らせる者が居る (第44条)`)。

---

## 8. build 相への実施順序(**途中で赤くならない道**)

各段に**絞込コマンド**を書く。**全走 6 分は §8-7 の一回だけである。**

| 段 | 触るもの | 走らせる絞込 | 期待 | 所要 |
|---|---|---|---|---|
| **① 器を先に** | `withGaugeSandbox` の finally + 宣言部(§1-2)。**門は一本も足さない** | `node tests/paradise.test.js --gate gauge --gate 門ヘルパー` | **116 green, 0 red**(神の機では実台帳の digest が動かないので番兵は黙る) | 10 秒 |
| **② 番兵の三本** | AC-2 / AC-3 / AC-4 | `node tests/paradise.test.js --gate 番兵 --gate 故障注入` | 番兵 2 本 + 既存の故障注入門が緑 | 5 秒 |
| **③ 静的の二本** | `topLevelDepths` / `mutableGlobals` + AC-11 / AC-12 | `node tests/paradise.test.js --gate 静的` | **2 green**(射程の名乗りが画面に出ること) | 1 秒 |
| **④ 純関数の三本** | AC-5 / AC-6 / AC-10 + `makeStrippedRun` | `node tests/paradise.test.js --gate 序列 --gate 紀元 --gate 決定性 --gate stripped` | 新設 3 本が緑。既存の序列節も緑 | 3 秒 |
| **⑤ 台帳の三本** | AC-7 / AC-8 / AC-9 | `node tests/paradise.test.js --gate 先回り --gate record --gate 物差し` | 新設 3 本 + F-1 の既存門が緑 | 6 秒 |
| **⑥ 並行の一本** | AC-13 | `node tests/paradise.test.js --gate 並行` | **1 green / 566 ms**。`raw=2 folded=1 skipped=0` | 2 秒 |
| **⑦ engine と CLI** | `graph/gauge.js:938`(§4-1)+ AC-15 | `node tests/gauge-audit.test.js` → `node tests/paradise.test.js --gate CLI --gate audit` | gauge-audit **5 passed 0 failed**(神の機なら 6 passed)。§4-3 の 5 本が緑 | 10 秒 |
| **⑧ 憲法** | `CONSTITUTION.md` + 索引 | `node graph/codex.js check`(exit 1 を確認)→ `index --write` → `check` | **exit 0 / 62 条** | 2 秒 |
| **⑨ 節の通し** | — | `node tests/paradise.test.js --gate gauge --gate 門ヘルパー --gate 番兵 --gate 静的 --gate 並行` | **130 gates matched, 0 red / ≤ 12 秒** | 12 秒 |
| **⑩ 衛生** | — | `node graph/hermetic.js check` / `wiring.js check` / `workspace.js check` | 三つとも **exit 0**。孤児 0 | 5 秒 |
| **⑪ 数** | `README.md`(census が書く) | `node graph/census.js fix` → `check` | `✓ every number … is true`。README が **485** | **6 分**(唯一の全走) |
| **⑫ 全走の確認** | — | `node tests/paradise.test.js` / `PARADISE_ABODE=repo …` / `PARADISE_ABODE=global …` | **485 passed, 0 failed** ×3 | 18 分 |

### 8-1. なぜこの順序か(途中で赤くならない理由)

- **① を最初に置く理由**: 番兵を器に入れた時点で既存 55 門すべてが照合を始める。
  **もし本設計に欠陥があれば、この段で 55 本が同時に赤くなる** —— 門を足した後では
  「門の欠陥か器の欠陥か」を切り分けられない(第57条の教訓)。
- **③④ を engine の改修より前に置く理由**: AC-5/6/10/11/12 は**実装を一行も変えずに緑になる**
  (今日正しい振る舞いを凍らせる門である)。engine を触る前に「今日の振る舞い」を凍らせておけば、
  ⑦ で engine を触ったときに**何が動いたかが門で分かる**。
- **⑦ を engine 改修の唯一の段にする理由**: `graph/gauge.js` に触るのは §4-1 の 3 行だけである。
  ここで `gauge-audit.test.js` を**先に**撃つ(別ファイルなので絞込が効かない)。
- **⑪ を最後から二番目に置く理由**: `census.js fix` は全走を要求する。門を全部建て終えてから一度だけ払う。
- **⑫ の三走(素 / repo / global)は最後**。CI が撃つのと同じ三本である。

### 8-2. 各段で赤が出たときの読み方

| 段 | 赤の意味 |
|---|---|
| ① で既存門が赤 | **番兵の順序が間違っている**(env 復元より前に digest を採った等)。§1-2 の①②の順を確かめよ |
| ① で `実台帳が書き換えられた` | **本当に汚れている。** `git -C paradise-creations diff` を読め。門を直す前に台帳を戻せ |
| ③ が赤 | 字句器の借り方。`H.functionsOf` を落としていないか(§2-4 の G8 の実測を見よ) |
| ⑥ で `器が壊れている` | 子か駆動子の `-e` 入れ子。**ファイルとして書いているか**(§3-1 の警告) |
| ⑥ で `· skip: 競合窓に入らなかった` | 神の機では起きないはずである(31/31 で競合した)。起きたら lead を 600ms に上げて再測 |
| ⑦ が赤 | §4-3 の 5 本のどれか。**exit code を動かしていないか**を先に疑え |

---

## §X. この変更で嘘になる門の再確認

requirements §6 の 5 分類を**自分で門を読んで**追った。**結論: 一本も増えていない。**

### X-1. 6-1 の 🔴 5 本 — **全部読んだ。全部緑で実走した。**

§4-3 の表のとおり。**さらに漏れが無いかを機械で確かめた:**

```
$ grep -rn "rows=|duplicates=|conflicts=|suspect=|too-deep=|corrupt=" tests/*.js graph/*.js .github/workflows/*.yml
```
`--audit` の出力文字列を読む箇所は **`gauge-audit.test.js` 5 箇所 / `paradise.test.js` 16 箇所**。
そのすべてを読み、**新設の二行(`🧹` と `--json` の JSON)がどれかの正規表現に掛かるか**を検めた:

| 読む側の正規表現 | `🧹` に掛かるか | `{"rows":…}` に掛かるか |
|---|---|---|
| `/rows=2 distinct=2 duplicates=0/` `/rows=30 distinct=6 duplicates=24/` `/rows=6 distinct=6 duplicates=0 conflicts=0/` `/rows=3/` `/rows=0/` `/rows=30/` | ❌(`🧹` に `rows=` は無い) | ❌(`--json` を渡していない) |
| `/duplicates=1/` `/duplicates=0 conflicts=0/` `/duplicates=24/` | ❌ | ❌ |
| `/conflicts=1/` `/corrupt=1/` `/corrupt=3/` `/too-deep=3/` `/suspect=1/` `/破損行/` `/矛盾/` | ❌ | ❌ |

**そして実走で裏を取った** —— `sm-repo` に改修を入れて `gauge-audit.test.js` = 5 passed 0 failed、
`--gate gauge --gate 門ヘルパー` = 114 green 0 red 2 skipped。

### X-2. 6-2 の 🟠 1 本 — `gauge: 門は実台帳を一行も書き換えない (AC-9c / 第30条)` (`:6060`)

**読んだ。requirements の裁定を支持する。** この門は三つを撃っている:

```js
const before = digest(real);
withGaugeSandbox((g, tmp) => { … g.record(…); g.baseline();
  assert.ok(g.ledgerPath().startsWith(tmp), …); });        // ① 振替が効いていること
assert.strictEqual(digest(real), before, …);               // ② 実台帳が不変(番兵と重複)
delete require.cache[…]; delete require.cache[…];
assert.strictEqual(require(GAUGE_JS).ledgerPath(), real, '住所の振替が漏れている');  // ③ 後始末
```

**②は番兵と重複するが、①③は番兵が撃たない。** requirements の裁定どおり
**名を実態に合わせて残す**:

```js
// 改名: `gauge: 門は実台帳を…` → `gauge: この門は実台帳を一行も書き換えない (AC-9c / 第30条)`
// 本文の冒頭に一行足す:
//   /** **全称の保証は AC-1 の番兵が担う。** この門が撃つのは
//    *  (a) 振替が効くこと (b) 一回ぶんの不可侵 (c) env を戻せば住所が実台帳に戻ること —— の三つである。 */
```

**この改名は既存門の期待値を一行も変えない**(名前だけである)。NFR-2 に抵触しない。

> ⚠️ **`skip(…)` の文面は変えるな。** `:6063` の `skip(\`兄弟倉に gauge-ledger.jsonl が無い: ${real}\`)` は
> CI で発火する。番兵の `sentinelSkipNote()` と**別の文面**なので、CI の画面には二本の skip が出る ——
> これは正しい(別の門が別の理由で飛んでいる)。

### X-3. 6-3 の 🟡 1 本 — `gauge: 呼び出しを跨いで状態を持たない (D-6)` (`:5905`)

**読んだ。requirements の裁定を支持する。両方残す。** 実測で境界を確かめた:

| 門 | 撃つもの | AC-11 との重複 |
|---|---|---|
| D-6 | **振る舞い**: `ledgerPath()` が env を追随するか / `foldLedger` の memo が呼び出しを跨がないか。**別プロセスで cache を捨てずに**撃つ | 無い。D-6 は `ledgerPath` と `foldLedger` という**具体**を撃つ |
| AC-11 | **ソース**: 最上位に可変の束縛が在るか | 無い。AC-11 は「大域を足すこと」という**一般**を撃つ |

**実測の裏付け**: 変異 `G8-memo`(`record.__seen`)に対し AC-11 は **1 件を名指す**が、
D-6 の二つの assert(`ledgerPath` と `foldLedger`)は**どちらも通る** ——
`record` の memo は `ledgerPath` にも `foldLedger` にも触れないからである。
**逆に**、変異 `readLedger-raw` に対し AC-11 は **0 件**(ソースは可変大域を足していない)。
**二本は互いの穴を埋めている。**

### X-4. 6-4 の 🟡 2 箇所

| 対象 | 状態 | 手当て |
|---|---|---|
| `README.md:138` の `# 門 471 本` | **485 になる** | `node graph/census.js fix`(§7-3)。**手で書くな**(第22条) |
| `tribunal.yml` の `verdict-report.json` の `tests.passed` | **嘘にならない**。実測から組む設計が効いている | 手当て不要 |

### X-5. 6-5 の ⚪ 2 件 — **両方とも実測で確かめた**

**(a) `fs.writeFileSync(g.ledgerPath(), '')` が hermetic を通るか**(requirements §8 問い 6)

**実測した。実物に探針を入れて `node graph/hermetic.js check` を撃った:**

```
  走査 26 ファイル / 書き込み 405 箇所 (複製 366 / 倉の未追跡 4 / 出自不明 35)
  ⚠️  tests/paradise.test.js:6052  fs.writeFileSync(g.ledgerPath()) — 出自を辿れない
  ⚠️  tests/paradise.test.js:6054  fs.appendFileSync(g.ledgerPath()) — 出自を辿れない
  ✓ 版管理下の現物を走行中に書き換える門は無い — 同時に走っても答えは一つである
  exit 0
```
対照群(`path.join(tmp, 'gauge-ledger.jsonl')` とリテラルで綴った版):
```
  走査 26 ファイル / 書き込み 403 箇所 (複製 366 / 倉の未追跡 4 / 出自不明 33)
  出自不明の新規 0 件
```

**判定:**
- `g.ledgerPath()` は **`unknown`(出自不明)に落ちる。** requirements の予想どおり
  `peel()` は関数呼び出しの返り値を辿らない。
- **だが `check` は exit 0 のまま。** `unknown` は警告であって赤ではない(赤は `repo` のみ)。
- **それでもリテラルで綴る。** 理由: 警告欄を二行増やせば、その二行が
  **本当の赤を霞ませる**(`hermetic.js:291` の註釈が「複製への書き込みが門の警告欄を埋めて
  本当の赤が霞んだ」と実測で書いている)。

**ゆえに AC-7 / AC-8 / AC-9 の門は `g.ledgerPath()` ではなく `path.join(tmp, 'gauge-ledger.jsonl')` と綴る:**

```js
test('gauge: record は台帳を信じ、プロセスの記憶を信じない (D-D / 第55条 e)', () => {
  withGaugeSandbox((g, tmp) => {
    const LEDGER = path.join(tmp, 'gauge-ledger.jsonl');   // ★ リテラルで綴る(hermetic の警告欄を汚さない)
    assert.strictEqual(g.ledgerPath(), LEDGER, '住所が仮倉に振り替わっていない(前提)');
    const run = path.join(tmp, 'run.json');
    fs.writeFileSync(run, JSON.stringify(makeGaugeRun()));
    const a = g.record(run, 'revive');
    const b = g.record(run, 'revive');
    assert.strictEqual(b.skipped, true, '二度目が既記録を名乗っていない(前提)');
    fs.writeFileSync(LEDGER, '');                          // ★ 台帳を外から空にする
    const c = g.record(run, 'revive');
    assert.ok(!c.skipped,
      '台帳を空にしても「既記録」を名乗った — record がプロセスの記憶を信じている (D-D)');
    assert.strictEqual(g.readLedger({ raw: true }).length, 1,
      '記録が復活していない — 台帳の第一の徳「記録が失われない」が破れた (第55条 e)');
    assert.strictEqual(c.fp, a.fp, '復活した行が別の鍵を名乗った');
  });
});
```
**実測した期待値**(`ac-inputs.js` / `mut-verify.js`): 実物 `b.skipped=true, c.skipped=false, rows=1, sameFp=true`。

**(b) `gauge: 門は仮倉の残骸も住所の振替も残さない (門自身の衛生)` (`:4462`)**

**読んだ。** この門は `withGaugeSandbox` を**四回**呼び、
`process.env.PARADISE_CREATIONS` が戻ること・仮倉が消えること・
三つの仮倉が互いの台帳を見ないこと(`[0,1,0]`)を撃つ。
**番兵は①(env 復元・cache 破棄・仮倉削除)の後に走るので、この門の観測に一切影響しない。**
順序を守れば不変である。**逆に、番兵を①より前に置けばこの門が赤くなる** —— 良い見張りである。

### X-6. **私が新たに見つけた — requirements §6 に無い一件**

**`tests/paradise.test.js:4991` `gauge: 環境変数で畳みや監査を無効化する裏口が無い (P-3 / V11・W8)`**

```js
const src = fs.readFileSync(GAUGE_JS, 'utf8');
const hits = src.match(/process\.env(\.\w+|\[[^\]]+\])/g) || [];
assert.deepStrictEqual(hits, [], `gauge.js が環境変数を読んでいる: …`);
```

**§4-1 の改修が `process.env` を一つも足さないことを、この門が自動で守る。**
足せば即座に赤になる。**嘘にはならない** —— むしろ改修の正しさを機械で保証する門である。
だが requirements §6 に名が無かったので**ここで名指す**。
build 相は §4-1 を書くとき `process.env` を使う誘惑に負けるな(`--json` の判定は `argv` で行う)。

**同様に `:3618` `gauge: 冪等化は第二の住所を持ち込まない (AC-1c / 第30条)`:**
```js
assert.strictEqual((code.match(/writeFileSync|unlinkSync|truncateSync|rmSync/g) || []).length, 0,
  'record に破壊的書き込みの経路が足された — 台帳の第一の徳は「記録が失われない」こと');
```
**§4-1 の改修は `console.log` と `process.exit` しか足さない。** 破壊的書き込みは 0 件のまま。
**この門も嘘にならないが、build 相が `--audit` に掃除を足せば即座に赤になる** —— 足すな。

**結論: requirements §6 の 5 分類に漏れは無い。ただし「嘘にならないが改修を見張る門」が
2 本ある(`:4991` と `:3618`)。名指して残す。**

---

## §Y. prove 相への変異表

各行は **「ソースのこの行をこう書き換えれば、この門が exit 1 で鳴る」** である。
**行番号は本相の開始時の実物**(gauge.js sha256 `d1da309f…`)。
「実測」欄は本相が `sm-mut/` の変異版 10 枚を実際に走らせて得た数である。

### Y-1. 安い変異(絞込走行で撃てる)

| # | AC | ファイル:行 | 元の一行 | 書き換え | 実測(実物 → 変異版) | 鳴る門 | 絞込コマンド |
|---|---|---|---|---|---|---|---|
| **Y1** | AC-5 | `graph/gauge.js:149` | `  const underEra = (r) => trace.epochStatus(r) !== 'legacy';` | `… === 'present';` | stripped の `score` **60 → 100** / `noTier` **4 → 0** / `unobservable` **0 → 4** | AC-5 | `--gate stripped` |
| **Y2** | AC-6 | `graph/spawn-trace.js:100` | `const TIER_EPOCH_AT = '2026-09-03T04:54:49.000Z';` | `= '2099-01-01T00:00:00.000Z';` | `TIER_EPOCH_AT` が変わり `epochStatus({created:'2026-09-10'})` **stripped → legacy** | AC-6(二本の assert が同時に鳴る) | `--gate 紀元` |
| **Y3** | AC-7 | `graph/gauge.js:627` | `    const idx = index instanceof Map ? index : keyIndex(readLedger({ raw: true }));` | `… : (record.__seen \|\| (record.__seen = keyIndex(readLedger({ raw: true }))));` | **`b.skipped` true → false**(索引が古いまま毒行を見ない) | AC-7 の**前提の assert**、AC-8 / AC-9(`preempted` true → false) | `--gate record --gate 先回り` |
| **Y3b** | AC-7 | `graph/gauge.js:648`(最後の `appendFileSync` の直前) | (無し) | `const __WROTE = new Set();` を :72 の直後に、`if (__WROTE.has(entry.fp)) return { ...entry, skipped: true }; __WROTE.add(entry.fp);` を :648 の直前に | **`c.skipped` false → true / rows 1 → 0** —— 記録が復活しない | **AC-7 の本題**、AC-11(`__WROTE:647 破壊的操作`) | `--gate record --gate 静的` |
| **Y4** | AC-8 | `graph/gauge.js:584` | `  if (ets === null \|\| isNaN(Date.parse(ets))) {` | `  if (false) {` | 毒行に対し **`skipped` false → true / `preempted` true → false / rows 2 → 1** | AC-8(四本の assert) | `--gate 先回り` |
| **Y5** | AC-9 | `graph/gauge.js:596` | `  if (alien.length) why.push(\`秤が書かない鍵を持つ: ${alien.join(', ')}\`);` | `  if (false) why.push(…);` | 三本目だけが **`preempted` true → false / reasons [] に** | AC-9(**三本目だけ落ちる** = 第21条 a の実証) | `--gate 物差し` |
| **Y6** | AC-10 | `graph/gauge.js:177`(`const composite = Math.max(0, Math.min(100, raw));` の直前) | (無し) | `  WEIGHTS.rework = 0;` を挿入 | 同一プロセス 5 回採点 **[80,80,80,80,80] → [80,100,100,100,100]**(legacy run)/ **[40,…] → [60,…]**(stripped run) | AC-10、AC-11(`WEIGHTS:177 属性への代入`) | `--gate 決定性 --gate 静的` |
| **Y7** | AC-11 | `graph/gauge.js:72` の直後 | (無し) | `let __recCount = 0;` | 字句器が **0 件 → 1 件**(`__recCount:73 最上位の let 束縛`) | AC-11 | `--gate 静的` |
| **Y7b** | AC-11 | `graph/gauge.js:627` | Y3 と同じ | Y3 と同じ | 字句器が **0 件 → 1 件**(`record:627 属性への代入`) | AC-11 | `--gate 静的` |
| **Y8** | AC-12 | `tests/paradise.test.js` の `DESTRUCTIVE` | `['push','set','add','delete',…]` | `add` を落とす | 作り物二枚目が **3 件 → 2 件** | AC-12(`assert.strictEqual(hits.length, 3)`) | `--gate 静的` |
| **Y9** | AC-13 | `graph/gauge.js:510` | `  if (opts.raw) return out;` | `  return out;` | 競合後 `readLedger()` **1 → 2** | AC-13(`folded === 1`)。**既存の畳み系門も多数鳴る** | `--gate 並行` |
| **Y10** | AC-15 | `graph/gauge.js:938` の次(改修後) | `        const healable = human === 0;` | `        const healable = true;` | 事故の入力で `healable` **false → true**、`🧹` が出る | AC-15 | `--gate audit` |
| **Y11** | AC-2 | `tests/paradise.test.js` の finally | `if (bodyThrew) console.error(…); else throw new Error(msg);` | `throw new Error(msg);`(無条件) | 本体の `BODY-BOOM` が届かない | AC-2 | `--gate 番兵` |
| **Y12** | AC-3 | `tests/paradise.test.js` の `sentinelSkipNote` | `return \`      · skip: 実台帳が無い(…\`;` | `return '';`(名乗りを落とす) | CI 枝の `assert.ok(/· skip: 実台帳が無い/…)` が落ちる | AC-3 | `--gate 番兵` |
| **Y13** | AC-4 | `tests/paradise.test.js` の `ledgerUntouched` | `return before === after;` | `return true;` | 注入版でも true が返る | AC-4(`ledgerUntouched(…) === false` が落ちる)、AC-3(a) も同時に落ちる | `--gate 番兵` |

**Y1〜Y13 はすべて絞込走行(最長 12 秒)で撃てる。**

### Y-2. 高い変異(全走を要する)

| # | AC | 対象 | 書き換え | なぜ全走が要るか |
|---|---|---|---|---|
| **Y14** | AC-1 / D-A | `graph/gauge.js:75` | `  return path.join(workspace.resolve().root, LEDGER_NAME);` → `  return path.join(__dirname, '..', '..', 'paradise-creations', LEDGER_NAME);` | **これが W1 そのもの = 実台帳を実際に汚す変異である。** **絞込では撃つな。** AC-4 が `FAKE-REAL` を使った**安全な同型**を撃つ(Y13 が AC-4 の歯を守る)。prove 相が本物を撃ちたければ `git archive` の複製を `$LOCALAPPDATA/Temp` に作り、**兄弟倉も複製した上で**撃て。**実物に対して撃つことを禁じる** |
| **Y15** | AC-16 | 新設門のどれか | 仮倉ではなく `graph/gauge.js` に直に `fs.writeFileSync` する形に書き換える | `node graph/hermetic.js check` が `🔴 tests/paradise.test.js:<行>` で鳴る。全走ではないが**別 engine の走行**が要る |
| **Y16** | NFR-7 | `README.md:138` | `485` を手で `471` に戻す | `node graph/census.js check` が鳴る。**`census.js` は全走 6 分を要求する**(自己診断を素で呼ぶ) |
| **Y17** | AC-16 | 第62条 | `CONSTITUTION.md` に第62条を足して `codex.js index --write` を**撃たない** | `node graph/codex.js check` が exit 1(実測済 §7-2)。全走は不要だが**手順の門**である |
| **Y18** | NFR-2 | 任意 | 新設 14 門を足した状態で全走 | `485 passed, 0 failed` ×3(素 / repo / global)。**これだけは 18 分を払うしかない** |

### Y-3. requirements の「壊し方」と実測が食い違った二件(**prove 相は実測の側を採れ**)

| requirements が書いた壊し方 | 実測した結果 | 正しい壊し方 |
|---|---|---|
| **AC-10**: `graph/gauge.js:170` の `  const raw = 100` を `  WEIGHTS.rework = 0; const raw = 100` に | **鳴らない方向に間違っている。** `raw` の**計算式の中**で `WEIGHTS.rework` が読まれるので、一回目から 100 になり **[60,60,60,60,60] で一定** —— 決定性は破れない | **`const composite = Math.max(0, Math.min(100, raw));`(:177)の直前に `WEIGHTS.rework = 0;` を挿す。** 実測 **[80,100,100,100,100]**(legacy run) |
| **AC-7**: `:627` を `record.__seen` の memo に | **AC-7 の本題(三度目が復活するか)は鳴らない。** 実測では `c.skipped` が **false のまま**(索引は古いが `idx.get(fp)` が返す既存行が `preemptionReasons` を通り、`preempted` として**追記される**)。動くのは `b.skipped` **true → false** の**前提の assert** | **本題を撃ちたければ Y3b(`__WROTE` の Set)を使え。** 実測 `c.skipped` **false → true / rows 1 → 0` |

> **この二件は requirements の欠陥ではなく、design が実測で詰めるべき部分である。**
> 「壊し方」は書いた時点では仮説であり、**撃つまでは仮説のままである**(第38条)。
> 両方とも `sm-mut/` に変異版を置いて実際に走らせて分かった。

---

## §Z. 私が決めきらなかったこと

### Z-1. `tests/gauge-audit.test.js` に番兵を持たせるか(**名: SM-J**)

§1-6 で「番兵は `gauge-audit.test.js` を覆わない」と結論した。
同ファイルの実台帳枝(`:168-183`)は**読むだけ**で `audit()` は `--audit` を撃つだけ、
`--audit` は追記経路を持たない —— **今日は安全である。**
だが「今日安全」は「永久に安全」ではない。誰かが `gauge-audit.test.js` に
`record` を撃つ門を足した日、番兵は居ない。

**決めなかった理由**: 番兵を二つのファイルに持てば `REAL_LEDGER` / `ledgerDigest` /
`sentinelSkipNote` が**二箇所に住む**(第48条)。共通の器を `tests/_*.js` に括り出すのが
正しい形だが、それは `wiring.js` の「門の除外」(`tests/_pulse-fixture.js` の先例)を
一つ増やす変更であり、本走行の射程を超える。

**払う条件**: `gauge-audit.test.js` に書き込む門が一本でも足された PR で、
番兵の器を `tests/_ledger-sentinel.js` に括り出し、両ファイルから require する。

### Z-2. AC-13 の lead(400ms)が CI で足りるか

**本機では lead=5ms でも 31/31 で競合した。** だが CI(ubuntu / 共有ランナー)での
Node 起動時間を**一度も測っていない**(findings §5-2-11 が名指した未測項目である)。
lead が子の `require` より短ければ skip 枝に落ちる —— **門が緑のまま歯を失う。**

**決めなかった理由**: CI で測る術が本相には無い。

**払う条件**: **本走行の最初の CI 走行のログを読め。** `· skip: 競合窓に入らなかった` が
出ていれば lead を 800ms に上げる PR を出せ。**出ていないことを確かめるまで、
AC-13 が CI で歯を持つとは書けない**(第38条)。

### Z-3. `--audit --json` を CI や `pulse` が読む日が来るか

§4-4 で「`pulse` は拾わない」と実測した。だが `healable` を足す動機は
「将来の掃除スクリプトが読む」ことである —— **その掃除スクリプトは存在しない。**
`healable` は**今日、誰も読まない欄**である(第44条: 誰も呼ばない物は腐る)。

**決めなかった理由**: FR-8 の掃除は本走行の射程外である(requirements §2 に無い)。
`healable` を足さずに文面だけで済ませる道も残っていたが、
**requirements §FR-5 が `--json` の欄を明示的に命じた**ので従った。

**払う条件**: 掃除を engine に持つ PR(残債)で `healable` の読み手を作るか、
半年読まれなければ `--json` から落とす。**どちらかを必ず選べ。**

### Z-4. `let SENTINEL_SAID` — 門のファイルに可変大域を足すこと

§1-2 で `tests/paradise.test.js` の最上位に `let SENTINEL_SAID = false;` を置いた。
**第62条(c) が戒める形そのものである。** AC-11 の射程外(`graph/` の二枚のみ)なので
門は鳴らないが、**射程で逃げているだけである。**

**代案を二つ検討し、両方とも採らなかった:**
- `withGaugeSandbox.__said` にする → **G8 変異と同型**(関数の属性への memo)。より悪い。
- 名乗りを毎回出す → 62 行の skip 行が画面を埋め、**本当の skip が霞む**。

**決めなかった理由**: 「門のファイル自身は可変大域を持ってよいのか」を裁く条が無い。
`tests/paradise.test.js` は既に `let pass = 0, fail = 0, skipped = 0` を最上位に持つ ——
**集計器としては正当**である。`SENTINEL_SAID` も同じ類だと**私は思うが、証明していない。**

**払う条件**: AC-11 の射程を `tests/*.js` に広げる走行(残債 `SM-L`)で裁け。

### Z-5. `graph/hermetic.js` の `TRACKED`(`:516`)を直すか

AC-11 の射程を `graph/` 全体に広げれば**即座に 3 件の赤**になる(実測)。
`TRACKED` は `git ls-files` の memo であり、**正当な最適化**である
(`trackedSet()` を毎回呼べば `execFileSync` が門の数だけ走る)。

**決めなかった理由**: 「正当な memo」と「危険な大域」を機械で分ける基準を持っていない。
`Object.freeze` で包む / WeakMap にする / 関数の引数に押し上げる —— どれも
`hermetic.js` の構造を動かす修理であり、本走行の「実装は最小」方針を破る。

**払う条件**: 残債 `SM-L`(AC-11 の射程を広げる)。そのとき `TRACKED` を先に直すか、
「memo は許す」という例外を**コードに書いて毎回名乗る**(第44条 c)かを裁け。

### Z-6. 残債 `SM-G` / `SM-H` / `SM-I` をどこに刻むか(requirements §8 問い 8)

**裁定: `reform/silent-mutations/debt.md` の散文には留めない。だが本走行では xfail 門も建てない。**

理由: `tests/route-debt.test.js` の xfail 作法(誤った振る舞いを凍らせ、誰かが直した日に赤くなる)は
**「今日の振る舞いが誤っている」件にしか使えない**。SM-G/H/I は三つとも
**「今日の振る舞いは正しいが門が無い」**件である —— 凍らせるべき誤りが存在しない。

**ゆえに: 本走行は `reform/silent-mutations/requirements.md §2-2` を唯一の台帳とする。**
requirements §2-2 は各件に**名**(`SM-G` / `SM-H` / `SM-I`)と**払う条件**を持っている。
`debt.md` を別に作れば、同じ問いに二つの答えが住む(第48条)。

**誰がいつ読むのか**(第44条への回答): **次の reform 走行の discover 相**である。
`graph/conclave.js audit` が本走行の走行帳を辿り、`reform/silent-mutations/requirements.md` が
artifact として登録されている。

**私が決めきらなかったのはここである**: この読み方は**慣習であって門ではない**。
「残債が読まれること」を機械で保証する仕組みは楽園に無い。
**払う条件**: 残債を横断で数える engine(`graph/debt.js` 等)を作る走行が来たとき、
`SM-G/H/I/J/L` をその最初の入力にせよ。

### Z-7. 本設計が測っていないもの(名指し)

- **CI(ubuntu)で一つも撃っていない。** 本相の実測はすべて Windows / NTFS / Node v24.14.0 である。
- **`census.js fix` を走らせていない**(全走 6 分 + README の書き換えを伴うため)。
  `check` が今日緑であることだけを確かめた。
- **全走 `node tests/paradise.test.js` を本相では一度も走らせていない。** 基線 471/0 は findings の値である。
- **番兵を入れた `withGaugeSandbox` を実際に 62 回走らせていない。** 代の 6.6 ms は
  `digest-cost.js` の単体測定であり、**門の中に入れた状態での実測ではない。**
  → **build 相の段①が最初の実測になる。**
- **`healable` を読む者が現れる日を測っていない**(Z-3)。
