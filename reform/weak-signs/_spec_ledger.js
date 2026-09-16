#!/usr/bin/env node
/**
 * specify 相の計測器 ⑤: **受け入れ帳(140 件)/ 射程帳(32 件)** の割り方を数で確定する。
 *
 * 射程帳 = 「弱い印では**原理的に**塞げない」的だけ。定義は次の二条件の**両方**:
 *   (i) 印が**独立した語**として当たっている(種H。語境界でも複合語表でも触れない)
 *   (ii) X4″(語境界の修理を全部当てた形)でも**なお誤着する**
 * すなわち「表を足せば直るが足していないから直っていない」的は射程帳に**入れない**。
 * これが第21条(門を緩める言い訳にするな)の担保である。
 *
 * この計測器が出す数:
 *   ① 射程帳の件数と、受け入れ帳の件数(合計が 172 に閉じること)
 *   ② 受け入れ帳の**基準線**の対角(= 埋めるべき穴が実在すること / 緩めていないこと)
 *   ③ 受け入れ帳に X4″ を当てたときの対角と非対角セル(= 合格線が到達可能であること)
 *   ④ 受け入れ帳の道ごとの件数(route-matrix の FLOOR を上げる根拠)
 *
 * ⚠️ 本物の graph/ tests/ は一行も書き換えない。
 * 使い方: node reform/weak-signs/_spec_ledger.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const GATE = path.join(__dirname, '_cand_gate.js');
const WORK = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'ws_cand');
const X4PP = path.join(WORK, 'forge.X4PP.js');

// 射程帳 = _spec_x4p_misroutes.json(X4′ の残余 = 全件が種H)
const resid = JSON.parse(fs.readFileSync(path.join(__dirname, '_spec_x4p_misroutes.json'), 'utf8'));
fs.writeFileSync(path.join(__dirname, '_spec_reach.json'), JSON.stringify(resid.map(r => r.wish), null, 1));
console.log('射程帳の候補(X4′ の残余): ' + resid.length + ' 件  (種H ' + resid.filter(r => r.kind === 'H').length + ' / 種M ' + resid.filter(r => r.kind === 'M').length + ')');

fs.writeFileSync(path.join(__dirname, '_spec_ledger_probe.js'), `'use strict';
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
`);

const run = (b, env) => {
  try { return execFileSync(process.execPath, [GATE, b, 'reform/weak-signs/_spec_ledger_probe.js'], { encoding: 'utf8', cwd: ROOT, env: { ...process.env, ...env } }); }
  catch (e) { return (e.stdout || '') + (e.stderr || ''); }
};
console.log('\n═══ ② 基準線(main そのもの)での受け入れ帳 ═══');
console.log(run('none'));
console.log('═══ ③ X4″ を当てたときの受け入れ帳 ═══');
console.log(run(X4PP));
