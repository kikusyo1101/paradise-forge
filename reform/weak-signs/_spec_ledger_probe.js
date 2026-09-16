'use strict';
const path = require('path');
const forge = require(path.join(__dirname, '..', '..', 'graph', 'forge.js'));
const CORPUS = require('./_spec_corpus.json');
const REACH = new Set(require('./_spec_reach.json'));
const ROUTES = ['counsel','cartography','reform','quick','standard','full'];
const ACC = CORPUS.filter(c => !REACH.has(c.wish));
const RCH = CORPUS.filter(c => REACH.has(c.wish));
console.log('  受け入れ帳 ' + ACC.length + ' 件 + 射程帳 ' + RCH.length + ' 件 = ' + (ACC.length + RCH.length) + ' (コーパス ' + CORPUS.length + ')');
const bad = ACC.filter(c => forge.chooseScale(c.wish) !== c.route);
const cells = {};
for (const c of bad) { const k = c.route + '→' + forge.chooseScale(c.wish); cells[k] = (cells[k] || 0) + 1; }
console.log('  受け入れ帳の対角: ' + (ACC.length - bad.length) + ' / ' + ACC.length + '   非ゼロ非対角セル: ' + Object.keys(cells).length + ' / 30');
for (const [k, v] of Object.entries(cells)) console.log('    [' + k + '] ' + v + ' 件');
if (bad.length && bad.length <= 25) for (const c of bad) console.log('      ・' + c.route + '->' + forge.chooseScale(c.wish) + '  "' + c.wish + '"');
console.log('  受け入れ帳の道ごとの件数: ' + ROUTES.map(r => r + '=' + ACC.filter(c => c.route === r).length).join(', '));
console.log('  射程帳の道ごとの件数:   ' + ROUTES.map(r => r + '=' + RCH.filter(c => c.route === r).length).join(', '));
const rbad = RCH.filter(c => forge.chooseScale(c.wish) !== c.route);
console.log('  射程帳で今なお誤着: ' + rbad.length + ' / ' + RCH.length + ' (xfail の門はこれを凍らせる)');
