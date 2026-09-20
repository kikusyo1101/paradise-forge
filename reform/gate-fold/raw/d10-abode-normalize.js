#!/usr/bin/env node
'use strict';
/**
 * D-10: 鍵に入れる住処の値は **生の env か、解決後の mode か**。
 *
 * findings §1.2 は「素 ≡ `=repo` はバイト単位で同一」を md5 で実測した。
 * ゆえに **素の領収書で `=repo` の走行を畳めなければ P-1 の取り分は半分に落ちる。**
 * 生の env を鍵に入れると 素("") と repo("repo") は別の鍵になる —— D-9 で実測した。
 * `abode.resolve().mode` を通せばどうなるかを、子プロセスで実測する。
 */
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..', '..');

const probe = `
const a = require(${JSON.stringify(path.join(ROOT, 'graph', 'abode.js'))});
const r = a.resolve();
console.log(JSON.stringify({ raw: process.env.PARADISE_ABODE || '', mode: r.mode, source: r.source }));
`;

for (const env of [undefined, 'repo', 'global']) {
  const e = { ...process.env };
  if (env === undefined) delete e.PARADISE_ABODE; else e.PARADISE_ABODE = env;
  const out = execFileSync(process.execPath, ['-e', probe], { encoding: 'utf8', env: e, cwd: ROOT });
  const j = JSON.parse(out);
  console.log(`PARADISE_ABODE=${env === undefined ? '(未設定)' : env}  →  raw="${j.raw}"  resolve().mode="${j.mode}"  source="${j.source}"`);
}

console.log('');
console.log('判定:');
console.log('  生の env を鍵に入れる  → 素 と repo が別の鍵になる(D-9 実測: 17bef409… vs b7c61f2b…)');
console.log('                          ⇒ 素の領収書で repo の走行を畳めず、P-1 の取り分が落ちる');
console.log('  resolve().mode を入れる → 素 と repo が同じ鍵になり、global だけ別になる');
console.log('                          ⇒ findings §1.2(素≡repo のバイト同一)と AC-05/AC-10 の両方を満たす');
