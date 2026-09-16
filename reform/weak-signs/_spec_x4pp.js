#!/usr/bin/env node
/**
 * specify 相の計測器 ④: 受け入れ線を「数で書ける」ことを確かめる最後の三点。
 *
 *  Q5. 「門」の複合語表は**閉じていない** —— 耐久 枝B の「門人」が X4′ を抜ける。
 *      表に `門人` を足した X4″ なら 枝B の種M が全件塞がるか(= 種M 0 件は到達可能か)。
 *  Q6. **AC-45 の二つの的**が X4″ でどの道へ行くか(門の書き換え先を数で定める)。
 *  Q7. **counsel.test.js:652**(REFORM_RE の 20 語を直に撃つ門)が X4″ で緑か。
 *      さらに `full→standard` の新規誤着が X4″ で 0 件であることを再確認する。
 *
 * ⚠️ 本物の graph/ tests/ は一行も書き換えない。門は逐次に走らせる(NFR-1)。
 * 使い方: node reform/weak-signs/_spec_x4pp.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const GATE = path.join(__dirname, '_cand_gate.js');
const WORK = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'ws_cand');
const src = fs.readFileSync(path.join(WORK, 'forge.X4prime.js'), 'utf8');
// X4″ = X4′ の表に「門人」を足しただけ(耐久 枝B が名指しした穴)
const OLD = "'一門|専門|部門|門下|入門|名門|門戸|関門|門限|門前|門外|登竜門|水田";
const bent = src.replace("門番|門弟'", "門番|門弟|門人'");
if (bent === src) { console.error('置換の的が見つからない'); process.exit(2); }
const bentPath = path.join(WORK, 'forge.X4PP.js');
fs.writeFileSync(bentPath, bent);
console.log('X4″ = X4′ + 「門人」  ' + bentPath + '\n');

const run = (b, rel, env) => {
  try { return { exit: 0, out: execFileSync(process.execPath, [GATE, b, rel], { encoding: 'utf8', cwd: ROOT, env: { ...process.env, ...env } }) }; }
  catch (e) { return { exit: e.status, out: (e.stdout || '') + (e.stderr || '') }; }
};

// ── Q6 の的を repo 内に置く ──
fs.writeFileSync(path.join(__dirname, '_spec_ac45.js'), `'use strict';
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
`);

console.log('═══ Q5. 耐久 枝B(X4″) ═══');
console.log(execFileSync(process.execPath, [path.join(__dirname, '_cand_stress.js'), 'X4PP'],
  { encoding: 'utf8', cwd: ROOT }).split('\n').filter(l => /B-世間|A-楽園|枝A\(/.test(l)).join('\n'));

console.log('\n═══ Q6/Q7. AC-45 の的 と REFORM_RE の 20 語(X4″) ═══');
console.log(run(bentPath, 'reform/weak-signs/_spec_ac45.js').out);

console.log('═══ Q7b. 172 件コーパス(X4″)— full→standard の新規誤着を確かめる ═══');
const mx = run(bentPath, 'reform/weak-signs/_matrix.js', { PROBE_TERSE: '1' });
const L = mx.out.split('\n'); const i = L.findIndex(l => l.includes('混同行列'));
console.log(L.slice(i).join('\n').trimEnd());

console.log('\n═══ Q7c. 既存門(X4″ / 逐次) ═══');
for (const t of ['tests/route-matrix.test.js', 'tests/counsel.test.js', 'tests/route-debt.test.js']) {
  const r = run(bentPath, t);
  console.log(`\n  ── ${t} ──  exit=${r.exit}`);
  for (const l of r.out.split('\n').filter(l => l.includes('✗') || /self-test:/.test(l))) console.log('  ' + l.trim());
}
