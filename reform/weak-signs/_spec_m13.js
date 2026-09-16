'use strict';
const path=require('path');
const f=require(path.join(__dirname,'..','..','graph','forge.js'));
const M=["build a civil engineering estimate app","一門の家系図を作れるアプリが欲しい","専門店の在庫を管理するシステムを作って","部門別の売上を集計するコマンドを実装して","名門校の受験対策アプリが欲しい","入門講座の進捗を記録する機能を実装して","implement a gateway timeout retry helper","build an app to investigate delegate voting records","create a script to aggregate the daily sales rows","implement a navigate-back button for the wizard","implement a self-improvement streak counter","build a self-improvement journal app","build a priesthood directory app for the diocese"];
let bad=0;for(const w of M){const d=f.denude(w);const r=f.isReformSubject(d);const s=f.chooseScale(w);
  if(r||s==='reform'){bad++;console.log('  ✗ [種M] "'+w+'"  isReformSubject='+r+'  ->'+s);}
  else console.log('  ok [種M] "'+w+'"  isReformSubject=false  ->'+s);}
console.log('\n種M で今なお reform を名乗る件数: '+bad+' / '+M.length);
