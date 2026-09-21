// Atlas 段の代を「図を作る」と「ブラウザで検める」に分ける実測。
// これが無いと「畳めば何秒減るか」を数で言えない(第38条)。
const fs=require('fs'),path=require('path'),os=require('os');
const atlas=require('../../../graph/atlas.js');
const S=['hierarchy','conclave','dispatch','dag','run','wiring'];
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'u5-'));
let drawTotal=0;
for(const s of S){
  const outdir=path.join(tmp,s); fs.mkdirSync(outdir,{recursive:true});
  const t=Date.now(); atlas.draw(s,{scale:'standard',outdir,skipBrowser:true});
  const d=Date.now()-t; drawTotal+=d;
  console.log(`draw(skipBrowser) ${s.padEnd(10)} ${String(d).padStart(6)} ms`);
}
console.log(`\n1道あたり 図の作成のみ 合計: ${drawTotal} ms (${(drawTotal/1000).toFixed(1)}s)`);
console.log(`参考: 6道の check 実測 = 286.7s / 道 47.8s (findings §1.6)`);
console.log(`→ 1道 47.8s のうち 図の作成は ${(drawTotal/1000).toFixed(1)}s、残り ${(47.8-drawTotal/1000).toFixed(1)}s がブラウザ検査`);
fs.rmSync(tmp,{recursive:true,force:true});
