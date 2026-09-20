// 門ごとの所要時間を測る(注入計測)。
// paradise.test.js のソースに計時を一箇所だけ挟んだ写しを tests/ 内に置いて走らせ、
// 終わったら必ず消す。
//
// ⚠️ 正直な但し書き(第37条): 写しは**自分のソースを読む門**を赤くしうる。
//   ゆえにこの計測は「各門の代」を測るためのものであり、
//   **緑の根拠にはしない**。緑の根拠は引数無しの原本の全走だけである(第56条d)。
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..', '..');
const SRC = path.join(ROOT, 'tests', 'paradise.test.js');
let src = fs.readFileSync(SRC, 'utf8');

const OLD = "try { fn(); console.log('  \\u2713 ' + name); pass++; }";
if (!src.includes(OLD)) { console.error('MARKER NOT FOUND — 原本が変わった。計測を中止する'); process.exit(3); }
const NEW = "try { const __t0=process.hrtime.bigint(); fn(); const __ms=Number(process.hrtime.bigint()-__t0)/1e6; "
          + "process.stderr.write('TIMING\\t'+__ms.toFixed(1)+'\\t'+name+'\\n'); "
          + "console.log('  \\u2713 ' + name); pass++; }";
src = src.replace(OLD, NEW);

const TMP = path.join(ROOT, 'tests', '__timing_probe__.js');
fs.writeFileSync(TMP, src);

console.error('走行開始 (数分)…');
let out = '', err = '', status = null;
try {
  const r = spawnSync(process.execPath, [TMP], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, cwd: ROOT });
  out = r.stdout || ''; err = r.stderr || ''; status = r.status;
} finally {
  try { fs.unlinkSync(TMP); } catch {}
}

const rows = err.split('\n').filter(l => l.startsWith('TIMING\t'))
  .map(l => { const p = l.split('\t'); return { ms: parseFloat(p[1]), name: p[2] }; });

const total = rows.reduce((a, r) => a + r.ms, 0);
const slow = rows.filter(r => r.ms >= 1000).sort((a,b)=>b.ms-a.ms);
const slowSum = slow.reduce((a,r)=>a+r.ms,0);
const summary = (out.match(/Paradise self-test:.*/) || ['(名乗り行なし)'])[0];

const L = [];
L.push('# 門ごとの計時 (注入計測) — 原本 tests/paradise.test.js の写しに hrtime を一箇所挟んだ走行');
L.push('');
L.push('子プロセスの終了コード: ' + status + '   ※ 写しは自分のソースを読む門を赤くしうる。代の計測が目的であり、緑の根拠ではない (第56条d)');
L.push('走行の名乗り: ' + summary);
L.push('計時できた門(緑になった門のみ): ' + rows.length + ' 本');
L.push('門の本体の合計: ' + (total/1000).toFixed(1) + ' s');
L.push('');
L.push('## 1 秒を超えた門');
L.push('本数: ' + slow.length + ' 本 / 合計 ' + (slowSum/1000).toFixed(1) + ' s  (計時できた門の代の ' + (total?(slowSum/total*100).toFixed(1):'—') + '%)');
L.push('');
for (const r of slow) L.push('  ' + (r.ms/1000).toFixed(1).padStart(7) + ' s  ' + r.name);
L.push('');
L.push('## 名に atlas を含む門');
const A = rows.filter(r => /atlas/i.test(r.name)).sort((a,b)=>b.ms-a.ms);
const aSum = A.reduce((a,r)=>a+r.ms,0);
L.push('本数: ' + A.length + ' 本 / 合計 ' + (aSum/1000).toFixed(1) + ' s  (' + (total?(aSum/total*100).toFixed(1):'—') + '%)');
for (const r of A) L.push('  ' + (r.ms/1000).toFixed(1).padStart(7) + ' s  ' + r.name);
L.push('');
L.push('## 上位 20 門');
for (const r of rows.slice().sort((a,b)=>b.ms-a.ms).slice(0,20)) L.push('  ' + (r.ms/1000).toFixed(2).padStart(8) + ' s  ' + r.name);
L.push('');
L.push('## 赤/飛ばしになった門(写しゆえの副作用を含む — 正直に全部載せる)');
for (const l of out.split('\n')) if (/^\s+[✗·]/.test(l)) L.push('  ' + l.trim());

const txt = L.join('\n');
fs.writeFileSync(path.join(__dirname, 'gate-timing.txt'), txt);
console.log(txt);
