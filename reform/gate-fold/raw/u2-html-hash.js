// U-2 の再実測(specify 相による独立再現): IR が同じとき成果物の HTML はバイト同一か。
// 第16条: 名ではなく中身で裁く。ゆえに HTML ファイルのバイト列を sha256 する。
// 仮倉に書く(第62条 (b): 現物を汚さない)。
const crypto = require('crypto'), fs = require('fs'), path = require('path'), os = require('os');
const atlas = require('../../../graph/atlas.js');
const SUBJECTS = ['hierarchy','conclave','dispatch','dag','run','wiring'];
const SCALES   = ['quick','standard','full','reform','counsel','cartography'];
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0,16);
const stable = (o) => JSON.stringify(o, (k,v) =>
  (v && typeof v === 'object' && !Array.isArray(v))
    ? Object.keys(v).sort().reduce((a,k2)=>(a[k2]=v[k2],a),{}) : v);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'u2-'));
const irSet = new Set(), htmlSet = new Set();
const rows = [];
for (const s of SUBJECTS) {
  const ir = {}, html = {};
  for (const sc of SCALES) {
    const outdir = path.join(tmp, s, sc);
    fs.mkdirSync(outdir, { recursive: true });
    ir[sc] = sha(Buffer.from(stable(atlas.buildIr(s, { scale: sc }))));
    atlas.draw(s, { scale: sc, outdir, skipBrowser: true });
    const htmlPath = path.join(outdir, `${s}.html`);
    html[sc] = sha(fs.readFileSync(htmlPath));
    irSet.add(ir[sc]); htmlSet.add(html[sc]);
  }
  rows.push({ s, ir, html });
}
for (const r of rows) {
  const iu = new Set(Object.values(r.ir)).size, hu = new Set(Object.values(r.html)).size;
  console.log(`${r.s.padEnd(11)} 相異なるIR=${iu}  相異なるHTML=${hu}  ${iu===hu?'[一致]':'[!!! 不一致 !!!]'}`);
  console.log(`   IR  : ${SCALES.map(sc=>r.ir[sc]).join(' ')}`);
  console.log(`   HTML: ${SCALES.map(sc=>r.html[sc]).join(' ')}`);
}
console.log(`\n組み合わせ総数: ${SUBJECTS.length*SCALES.length}`);
console.log(`相異なるIR総数:   ${irSet.size}`);
console.log(`相異なるHTML総数: ${htmlSet.size}`);
console.log(irSet.size===htmlSet.size
  ? 'U-2 判定: IR種数 == HTML種数 — IR が同一なら HTML もバイト同一(畳みの鍵に使える)'
  : 'U-2 判定: 不一致 — IR の同一性は HTML の同一性を含意しない(鍵に使えない)');
fs.rmSync(tmp, { recursive: true, force: true });
