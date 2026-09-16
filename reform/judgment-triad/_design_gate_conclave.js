'use strict';
const fs=require('fs'),path=require('path'),Module=require('module');
const ROOT=path.join(__dirname,'..','..');
const REAL=path.join(ROOT,'graph','conclave.js');
const bent=process.argv[2];
if(bent&&bent!=='none'){const src=fs.readFileSync(bent,'utf8');const m=new Module(REAL,null);
m.filename=REAL;m.paths=Module._nodeModulePaths(path.dirname(REAL));m._compile(src,REAL);m.loaded=true;require.cache[REAL]=m;}
const target=path.join(ROOT,process.argv[3]);
// argv を切り詰める — paradise.test.js の gate-filter が argv を読むので、
//   余分な引数を残すと 'unknown flag' で exit 2 になる(測定が無効になる)。
process.argv=[process.argv[0],target];
require(target);
