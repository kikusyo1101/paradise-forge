#!/usr/bin/env node
'use strict';
/**
 * prove 相 M-14 の硬化を `tests/paradise.test.js` へ綴じる台本。
 *
 * **なぜ台本なのか**: この現物は **CRLF** であり、LF の綴りを含む置換は一つも当たらない
 * (prove 相で実測して踏んだ)。かつ 726KB / 11,000 行を超えるので、
 * 手で編むより**当たったことを assert する台本**の方が安全である(第37条)。
 *
 *   node reform/gate-fold/prove/harden-m14.js          # 綴じる
 *   node reform/gate-fold/prove/harden-m14.js --check  # 綴じられているかを見るだけ
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..', '..');
const P = path.join(ROOT, 'tests', 'paradise.test.js');
const CRLF = (s) => s.replace(/\r?\n/g, '\r\n');

/** 綴じる門の本文。**CRLF で書く。** */
const GATE = CRLF(`
test('fold: 畳んだ走行は写し元を名乗る — 名乗りは死にコードの後ろへ移らない (prove M-14)', () => {
  /**
   * **prove 相 M-14 の無音を塞ぐ門。**
   *
   * 実測: 畳んだ走行が出す「写し元の領収書 at=… exit=… key=…」の行を
   * \`process.exit(0)\` の**後ろへ移す**変異(死にコード化)を撃ったところ、
   * **20 門も 7 門も一本も鳴らなかった**。AC-12「写した裁定は元を名指す」は
   * **Atlas の裁定行**しか撃っておらず、**全走の畳み**の名乗りを誰も読んでいなかった。
   *
   * 写し元が消えると、畳んだ緑が**いつ・どの領収書に由来するか**を辿れなくなる ——
   * 第21条 b:「辿れない発見は直せない発見である」。
   *
   * ⚠️ **設定ではなく走行を読む**(第16条)。ゆえに**畳める台帳を作って実際に撃つ。**
   */
  const fld = require(path.join(DIR, '..', 'graph', 'fold.js'));
  const file = foldLedger('m14');
  const asRepo = { ...process.env, PARADISE_ABODE: 'repo' };
  const k = fld.key({ env: asRepo });
  fld.append({ key: k, exit: 0, summary: 'Paradise self-test: 499 passed, 0 failed' }, { file });
  const r = require('child_process').spawnSync(process.execPath, [__filename],
    { encoding: 'utf8', cwd: path.join(DIR, '..'), timeout: 120000,
      env: { ...asRepo, PARADISE_FOLD_LEDGER: file } });
  const out = String(r.stdout);
  // ① 畳んだこと自体(前提。崩れていたら測っていない)
  assert.match(out, /Paradise fold: Executed 0 out of 1 runs \\(1 reused, key=/,
    \`前提が崩れた — 畳める台帳を作れていない: \${out.split('\\\\n').slice(0, 3).join(' / ')}\`);
  // ② **写し元の名乗りが実際に出ていること**(死にコードへ移っていないこと)
  const m = out.match(/Paradise fold: 写し元の領収書 at=(\\S+) exit=(\\S+) key=(\\S+)/);
  assert.ok(m,
    '**畳んだ走行が写し元を名乗らなかった** — 名乗りが process.exit の後ろに在れば死にコードである。' +
    \`辿れない緑は直せない (第21条 b / prove M-14): \${out.split('\\\\n').slice(0, 4).join(' / ')}\`);
  // ③ 名乗った中身が**台帳の領収書と一致する**(空欄や undefined を名乗っていない)
  assert.strictEqual(m[3], k, \`名乗った鍵が台帳の鍵と違う: \${m[3]} != \${k}\`);
  assert.strictEqual(m[2], '0', \`名乗った exit が 0 でない: \${m[2]}\`);
  assert.ok(/^\\d{4}-\\d{2}-\\d{2}T/.test(m[1]), \`名乗った刻が刻の形でない: \${m[1]}\`);
  assert.strictEqual(r.status, 0, \`畳んだ走行が exit \${r.status}\`);
  // ④ **綴りの衝突を作っていない**(requirements §4.1 / census.js:57 の保険経路)
  assert.strictEqual((out.match(/passed/g) || []).length, 0,
    '畳んだ走行が passed の語を出した — census.js:57 が拾い、偽の数になる');
});
`);

const ANCHOR = CRLF("function f0key(fld) { return fld.key(); }\n");

function main() {
  const raw = fs.readFileSync(P);
  const before = crypto.createHash('sha256').update(raw).digest('hex');
  const s = raw.toString('utf8');
  if (s.includes('prove M-14')) { console.log('既に綴じられている'); return; }
  if (process.argv.includes('--check')) { console.log('**未綴じ**'); process.exit(1); }
  const i = s.indexOf(ANCHOR);
  if (i < 0) {
    console.error('錨が見つからない — 形が変わった。**当たらない編みで「綴じた」と言ってはならない** (第37条)');
    process.exit(2);
  }
  const out = s.slice(0, i + ANCHOR.length) + GATE + s.slice(i + ANCHOR.length);
  if (out === s) { console.error('編みが当たらなかった'); process.exit(2); }
  fs.writeFileSync(P, Buffer.from(out, 'utf8'));
  const after = crypto.createHash('sha256').update(fs.readFileSync(P)).digest('hex');
  console.log(`綴じた: ${before.slice(0, 16)} -> ${after.slice(0, 16)}`);
}

main();
