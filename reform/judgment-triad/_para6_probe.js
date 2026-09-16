#!/usr/bin/env node
/** PARA-6 実測: pending の相を抱えたまま ratify を撃てるか。 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const ROOT = path.join(__dirname, '..', '..');
const forge = require(path.join(ROOT, 'graph', 'forge.js'));
const conclave = require(path.join(ROOT, 'graph', 'conclave.js'));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'para6-'));
const wish = 'ポモドーロタイマーのアプリが欲しい';
const scale = forge.chooseScale(wish);
const dag = forge.buildDag(wish, scale);
const dagPath = path.join(tmp, 'forge.dag.json');
fs.writeFileSync(dagPath, JSON.stringify(dag, null, 2));

const run = conclave.convene(dagPath);
console.log('=== 1. convene 直後 — 相は全て pending ===');
console.log(conclave.statusBoard(run));

const flat = r => r.domains.flatMap(d => d.phases);
const phases = flat(run);
console.log('\n相の状態の内訳(convene 直後):',
  JSON.stringify(phases.reduce((a, p) => (a[p.status] = (a[p.status] || 0) + 1, a), {})));

console.log('\n=== 2. 一つも done にせず、全ての枢機卿に ratify を撃つ ===');
for (const d of run.domains) {
  const r = conclave.ratify(run, d.cardinal);
  console.log(`  ratify(${d.cardinal}) -> ${JSON.stringify(r)}   [この領域の相: ` +
    d.phases.map(p => `${p.id}=${p.status}`).join(', ') + ']');
}

console.log('\n=== 3. ratify 後の statusBoard ===');
console.log(conclave.statusBoard(run));

const after = flat(run);
console.log('\n相の状態の内訳(ratify 後):',
  JSON.stringify(after.reduce((a, p) => (a[p.status] = (a[p.status] || 0) + 1, a), {})));
console.log('done の相の数:', after.filter(p => p.status === 'done').length, '/', after.length);
console.log('artifactPath を持つ相の数:', after.filter(p => p.artifactPath).length, '/', after.length);
console.log('ratified な領域の数:', run.domains.filter(d => d.status === 'ratified').length, '/', run.domains.length);

console.log('\n=== 4. conclave.js audit がこの走行帳をどう裁くか ===');
const runPath = path.join(tmp, 'conclave.json');
fs.writeFileSync(runPath, JSON.stringify(run, null, 2));
const rep = conclave.auditRuns({ ledgers: [{ where: 'probe', slug: 'para6-demo', path: runPath }] });
console.log(conclave.auditBoard(rep));
console.log('\nauditRuns の生の判定:', JSON.stringify(rep.ledgers[0], null, 2));
console.log('\nexit code 相当 (abandoned+unknown+unreadable):',
  rep.abandoned.length + rep.unknown.length + rep.unreadable.length);
console.log('TMPDIR=' + tmp);
