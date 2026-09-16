#!/usr/bin/env node
/**
 * specify 相の計測器 ②: **X4′(裁定形)** を測る。
 *
 * X4 の `REFORM_FALSE_FRIENDS` は三種の語を混ぜている:
 *   (a) 「門」の複合語 — **日本語には \b が無い**ので、これは語境界の代用である(正当)
 *   (b) engineering/gateway/delegate/… — R2 の `\b` と**冗長**
 *   (c) 常夏の楽園/検索エンジン/カトリック枢機卿/… — **種H の的そのものの逐語暗記**
 *       第60条「弱い印は表を足しても強くならない」が名指しで禁じた形
 *
 * X4′ = R2(英語 10 印に \b) + R3′((a) だけの表) + P3。
 * すなわち **語境界の修理だけ**を採り、**種H を表で暗記しない**形である。
 *
 * この計測器が答える問い:
 *   Q1. X4′ で種M は全件直るか(= 語境界だけで塞げるか)
 *   Q2. X4′ に残る誤着は**全件が種H か**(= 受け入れ線を種で引けるか)
 *   Q3. X4 が生んだ `full→standard` の新規誤着 1 件は X4′ で消えるか
 *   Q4. 既存門は X4 と同じか(counsel / route-matrix / route-debt)
 *
 * ⚠️ 本物の graph/ tests/ は一行も書き換えない。門は逐次に走らせる(NFR-1)。
 * 使い方: node reform/weak-signs/_spec_x4prime.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'graph', 'forge.js');
const GATE = path.join(__dirname, '_cand_gate.js');
const orig = fs.readFileSync(SRC, 'utf8');
const EOL = orig.includes('\r\n') ? '\r\n' : '\n';
const must = (s, n, t) => { if (!s.includes(n)) throw new Error(t + ': 置換の的が見つからない'); return s; };

const REFORM_OLD = "const REFORM_RE = /(楽園|paradise|ハーネス|harness|憲法|constitution|engine|エンジン|門|gate|パイプライン|pipeline|自己改善|self-improve|オーケストレーション|orchestration|枢機卿|cardinal|神官|priest)/i;";
const WANTS_BODY_OLD =
  "  if (PRODUCT_FALSE_FRIENDS.test(w)) return false;" + EOL +
  "  if (PRODUCT_STRONG_RE.test(w)) return true;" + EOL +
  "  // 一字の名(口/門/相)だけで当たった場合、それが紛れ語の一部でないか確かめる" + EOL +
  "  return PRODUCT_RE.test(w) && !PRODUCT_FALSE_FRIENDS.test(w);";
const CART_OLD = "  if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;";
const ISREF_OLD = "function isReformSubject(d) {" + EOL + "  return REFORM_RE.test(d);" + EOL + "}";

// R2: 英語の 10 印に \b(日本語は不変)
const R2_RE = "const REFORM_RE = /(楽園|ハーネス|憲法|エンジン|門|パイプライン|自己改善|オーケストレーション|枢機卿|神官|" +
  "\\b(?:paradise|harness|constitution|engine|gate|pipeline|self-improve|orchestration|cardinal|priest)\\b)/i;";
const R2 = s => must(s, REFORM_OLD, 'R2').replace(REFORM_OLD, R2_RE);

// R3′: 表は「門」の複合語**だけ** = 日本語の語境界の代用。種H を一語も暗記しない。
const R3P_DEFS = EOL + EOL +
  "/** ★ R3′: 「門」の複合語 = 日本語に \\b が無いことの代用(種H は一語も入れない / 第60条) */" + EOL +
  "const REFORM_FALSE_FRIENDS = new RegExp(" + EOL +
  "  '一門|専門|部門|門下|入門|名門|門戸|関門|門限|門前|門外|登竜門|水門|城門|門松|門出|山門|正門|門番|門弟', 'i');";
const R3P_FN =
  "function isReformSubject(d) {" + EOL +
  "  const stripped = String(d).replace(new RegExp(REFORM_FALSE_FRIENDS.source, 'gi'), ' ');" + EOL +
  "  return REFORM_RE.test(stripped);" + EOL +
  "}";
const R3P = s => must(must(s, REFORM_OLD, 'R3a'), ISREF_OLD, 'R3b')
  .replace(REFORM_OLD, REFORM_OLD + R3P_DEFS).replace(ISREF_OLD, R3P_FN);

const P1_BODY =
  "  const stripped = String(w).replace(new RegExp(PRODUCT_FALSE_FRIENDS.source, 'gi'), ' ');" + EOL +
  "  if (PRODUCT_STRONG_RE.test(stripped)) return true;" + EOL +
  "  return PRODUCT_RE.test(stripped);";
const P1 = s => must(s, WANTS_BODY_OLD, 'P1').replace(WANTS_BODY_OLD, P1_BODY);
const P3_CART = "  {" + EOL +
  "    const _s = String(wish).replace(new RegExp(PRODUCT_FALSE_FRIENDS.source, 'gi'), ' ');" + EOL +
  "    if (PRODUCT_STRONG_RE.test(_s)) return false;" + EOL +
  "  }";
const P3 = s => must(P1(s), CART_OLD, 'P3').replace(CART_OLD, P3_CART);

const X4P = s => R2(R3P(P3(s)));

const WORK = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'ws_cand');
fs.mkdirSync(WORK, { recursive: true });
const bentPath = path.join(WORK, 'forge.X4prime.js');
fs.writeFileSync(bentPath, X4P(orig));
console.log('曲げた forge: ' + bentPath + '  (原文と異なるか: ' + (X4P(orig) !== orig ? 'YES' : 'NO') + ')');

// ── 種M の 13 件(findings §2(a)-2 の生の写しから一字一句) ──────────
const KIND_M = [
  'build a civil engineering estimate app',
  '一門の家系図を作れるアプリが欲しい',
  '専門店の在庫を管理するシステムを作って',
  '部門別の売上を集計するコマンドを実装して',
  '名門校の受験対策アプリが欲しい',
  '入門講座の進捗を記録する機能を実装して',
  'implement a gateway timeout retry helper',
  'build an app to investigate delegate voting records',
  'create a script to aggregate the daily sales rows',
  'implement a navigate-back button for the wizard',
  'implement a self-improvement streak counter',
  'build a self-improvement journal app',
  'build a priesthood directory app for the diocese',
];

const run = (rel, env) => {
  try { return { exit: 0, out: execFileSync(process.execPath, [GATE, bentPath, rel], { encoding: 'utf8', cwd: ROOT, env: { ...process.env, ...env } }) }; }
  catch (e) { return { exit: e.status, out: (e.stdout || '') + (e.stderr || '') }; }
};

// Q1: 種M 13 件 — isReformSubject が偽になるか(= 語境界で塞げたか)
// ⚠️ _cand_gate.js は repo 相対のパスしか受けないので、的は repo の中に置く。
fs.writeFileSync(path.join(__dirname, '_spec_m13.js'),
  "'use strict';\n" +
  "const path=require('path');\n" +
  "const f=require(path.join(__dirname,'..','..','graph','forge.js'));\n" +
  "const M=" + JSON.stringify(KIND_M) + ";\n" +
  "let bad=0;for(const w of M){const d=f.denude(w);const r=f.isReformSubject(d);const s=f.chooseScale(w);\n" +
  "  if(r||s==='reform'){bad++;console.log('  ✗ [種M] \"'+w+'\"  isReformSubject='+r+'  ->'+s);}\n" +
  "  else console.log('  ok [種M] \"'+w+'\"  isReformSubject=false  ->'+s);}\n" +
  "console.log('\\n種M で今なお reform を名乗る件数: '+bad+' / '+M.length);\n");
console.log('\n═══ Q1. 種M 13 件 — 語境界だけで塞げるか ═══');
console.log(run('reform/weak-signs/_spec_m13.js').out);

// Q2/Q3: 172 件コーパス
console.log('\n═══ Q2/Q3. 172 件コーパスの混同行列(X4′) ═══');
const mx = run('reform/weak-signs/_matrix.js', { PROBE_AUDIT: '1' });
console.log(mx.out);

// Q4: 既存門を**逐次**に(NFR-1)
console.log('\n═══ Q4. 既存門(逐次) ═══');
for (const t of ['tests/route-matrix.test.js', 'tests/counsel.test.js', 'tests/route-debt.test.js']) {
  const r = run(t);
  console.log(`\n  ── ${t} ──  exit=${r.exit}`);
  for (const l of r.out.split('\n').filter(l => l.includes('✗') || /self-test:/.test(l))) console.log('  ' + l.trim());
}
