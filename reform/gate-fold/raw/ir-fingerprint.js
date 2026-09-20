// IR 指紋の実測: 6主題 × 6道 の buildIr 出力を正規化して SHA-256 を取る。
const crypto = require('crypto');
const path = require('path');
const atlas = require(path.join(__dirname, '..', '..', '..', 'graph', 'atlas.js'));

const SCALES = ['quick', 'standard', 'full', 'reform', 'counsel', 'cartography'];
const SUBJECTS = Object.keys(atlas.SUBJECTS);

// 正規化: JSON を安定化(キー順を固定)して文字列化。
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}
function fp(o) { return crypto.createHash('sha256').update(stable(o)).digest('hex').slice(0, 16); }

const table = {};
const errors = {};
for (const s of SUBJECTS) {
  table[s] = {};
  for (const sc of SCALES) {
    try {
      table[s][sc] = fp(atlas.buildIr(s, { scale: sc }));
    } catch (e) {
      table[s][sc] = 'ERR';
      errors[`${s}/${sc}`] = String(e.message).slice(0, 160);
    }
  }
}

console.log('主題\\道'.padEnd(12) + SCALES.map(x => x.padEnd(18)).join(''));
for (const s of SUBJECTS) {
  console.log(s.padEnd(12) + SCALES.map(sc => String(table[s][sc]).padEnd(18)).join(''));
}
console.log('');
const uniqAll = new Set();
for (const s of SUBJECTS) for (const sc of SCALES) uniqAll.add(table[s][sc]);
console.log('組み合わせ総数: ' + (SUBJECTS.length * SCALES.length));
console.log('相異なるIR総数: ' + uniqAll.size);
console.log('');
for (const s of SUBJECTS) {
  const u = new Set(SCALES.map(sc => table[s][sc]));
  console.log(`${s.padEnd(12)} 相異なるIR = ${u.size} ${u.size === 1 ? '  ← 全道で同一(畳める)' : '  ← 道ごとに変わる'}`);
}
if (Object.keys(errors).length) {
  console.log('\nERRORS:');
  for (const [k, v] of Object.entries(errors)) console.log('  ' + k + ': ' + v);
}
