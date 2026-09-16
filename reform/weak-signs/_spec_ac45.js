'use strict';
const path = require('path');
const forge = require(path.join(__dirname, '..', '..', 'graph', 'forge.js'));
console.log('── AC-45 の的(紛れ語 / 門が現在 reform を期待している 2 件)──');
for (const w of ['専門店の棚の傾きを直したい', '部門別の売上の誤りを直したい'])
  console.log('  "' + w + '"  -> ' + forge.chooseScale(w));
console.log('── AC-45 の逆向き(本物の門 / reform を失ってはならない 3 件)──');
for (const w of ['門に監査の一段を足す', '門の判定を書き換える', '門を強化する'])
  console.log('  "' + w + '"  -> ' + forge.chooseScale(w));
console.log('── counsel.test.js:652 の 20 語を REFORM_RE に直に撃つ ──');
const MUST = ['楽園','paradise','ハーネス','harness','憲法','constitution','engine','エンジン','門','gate',
  'パイプライン','pipeline','自己改善','self-improve','オーケストレーション','orchestration','枢機卿','cardinal','神官','priest'];
const lost = MUST.filter(w => !forge.REFORM_RE.test(w));
console.log('  REFORM_RE から落ちた語: ' + (lost.length ? lost.join(', ') : '0 語 — 過不足なし'));
const FORBID = ['gauge','forge','conclave','codex','clergy','synod','verdict','critic','abode','hermetic','vendor','census','workflow','identity'];
const crept = FORBID.filter(n => forge.REFORM_RE.test('a ' + n + ' app'));
console.log('  engine の固有名が入り込んだ: ' + (crept.length ? crept.join(', ') : '0 語'));
