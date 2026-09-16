#!/usr/bin/env node
/**
 * discover 相: PARA-10 / PARA-11 の**修理候補**を写しで撃つ(実装はしない)。
 *   作法は reform/judgment-triad/_design_para7b.js を踏襲 ——
 *   曲げた forge.js の原文を $LOCALAPPDATA/Temp に置き、_cand_gate.js が
 *   **本物のパスの module** としてそれを評価し require.cache に載せる。
 *   → 門は本物のリポジトリから走るので overlay/ 等の相対参照が壊れない。
 * ⚠️ 本物の graph/ tests/ は一行も書き換えない。門は逐次に走らせる (NFR-1)。
 * 使い方: node _cand.js            (全候補)
 *        node _cand.js R1 P1      (名指し)
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

const must = (s, needle, name) => { if (!s.includes(needle)) throw new Error(name + ': 置換の的が見つからない'); return s; };

// ══ 置換の的 ══════════════════════════════════════════════════════════
const REFORM_OLD = "const REFORM_RE = /(楽園|paradise|ハーネス|harness|憲法|constitution|engine|エンジン|門|gate|パイプライン|pipeline|自己改善|self-improve|オーケストレーション|orchestration|枢機卿|cardinal|神官|priest)/i;";
const WANTS_OLD =
  "function wantsProduct(w) {" + EOL;
const WANTS_BODY_OLD =
  "  if (PRODUCT_FALSE_FRIENDS.test(w)) return false;" + EOL +
  "  if (PRODUCT_STRONG_RE.test(w)) return true;" + EOL +
  "  // 一字の名(口/門/相)だけで当たった場合、それが紛れ語の一部でないか確かめる" + EOL +
  "  return PRODUCT_RE.test(w) && !PRODUCT_FALSE_FRIENDS.test(w);";
const CART_OLD = "  if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;";

// ══ PARA-10 候補 ══════════════════════════════════════════════════════
// R1 「除去」: 弱い印「門」だけを撃ち捨てる(前走行が試して既存門を壊した形)
const R1_RE = "const REFORM_RE = /(楽園|paradise|ハーネス|harness|憲法|constitution|engine|エンジン|gate|パイプライン|pipeline|自己改善|self-improve|オーケストレーション|orchestration|枢機卿|cardinal|神官|priest)/i;";
const R1 = s => must(s, REFORM_OLD, 'R1').replace(REFORM_OLD, R1_RE);

// R2 「語境界」: 英語の印に \b を課すだけ(種M の英語 6 件を狙う。日本語は触らない)
const R2_RE = "const REFORM_RE = /(楽園|ハーネス|憲法|エンジン|門|パイプライン|自己改善|オーケストレーション|枢機卿|神官|" +
  "\\b(?:paradise|harness|constitution|engine|gate|pipeline|self-improve|orchestration|cardinal|priest)\\b)/i;";
const R2 = s => must(s, REFORM_OLD, 'R2').replace(REFORM_OLD, R2_RE);

// R3 「紛れ語表」: REFORM_FALSE_FRIENDS を足し、当たった箇所を**削ってから**印を探す
//    (= PARA-11 の「削ってから探す」形を REFORM_RE に適用したもの)
const R3_DEFS = EOL + EOL +
  "/** ★ 候補 R3: REFORM_RE の紛れ語(世間の語に埋もれた印) */" + EOL +
  "const REFORM_FALSE_FRIENDS = new RegExp(" + EOL +
  "  '一門|専門|部門|門下|入門|名門|門戸|関門|門限|門前|門外|登竜門|水門|城門|門松|門出|山門|正門|門番|門弟|' +" + EOL +
  "  '常夏の楽園|楽園ビーチ|楽園リゾート|登山用ハーネス|安全ハーネス|' +" + EOL +
  "  '日本国憲法|各国の憲法|検索エンジン|エンジンオイル|石油パイプライン|データパイプライン|' +" + EOL +
  "  'コンテナオーケストレーション|音楽のオーケストレーション|カトリック枢機卿|神社の神官|' +" + EOL +
  "  'engineering|gateway|delegate|aggregate|navigate|priesthood|self-improvement', 'i');";
const R3_FN =
  "function isReformSubject(d) {" + EOL +
  "  // ★ 候補 R3: 紛れ語の一致箇所を**削ってから**印を探す" + EOL +
  "  const stripped = String(d).replace(new RegExp(REFORM_FALSE_FRIENDS.source, 'gi'), ' ');" + EOL +
  "  return REFORM_RE.test(stripped);" + EOL +
  "}";
const ISREF_OLD = "function isReformSubject(d) {" + EOL + "  return REFORM_RE.test(d);" + EOL + "}";
const R3 = s => must(must(s, REFORM_OLD, 'R3a'), ISREF_OLD, 'R3b')
  .replace(REFORM_OLD, REFORM_OLD + R3_DEFS)
  .replace(ISREF_OLD, R3_FN);

// R4 「文脈化」: 弱い印「門」を**複合/共起でのみ**通す。
//    「楽園の門」「監査の門」「門に…を足す」のように、楽園の語 or 機構の語と共起した時だけ真。
const R4_RE = "const REFORM_RE = /(楽園|paradise|ハーネス|harness|憲法|constitution|engine|エンジン|gate|パイプライン|pipeline|自己改善|self-improve|オーケストレーション|orchestration|枢機卿|cardinal|神官|priest)/i;";
const R4_DEFS = EOL + EOL +
  "/** ★ 候補 R4: 弱い印「門」は**文脈**でのみ楽園を指す(第60条: 弱い印は文脈化するか除去する) */" + EOL +
  "const GATE_CONTEXT_RE = /(楽園|憲法|監査|判定|走行|相|一段|CI|自己診断|枢機卿|神官|台帳|帳)[^。]{0,8}門|門[^。]{0,8}(楽園|憲法|監査|判定|走行|一段|強化|見直|直す|設け|足す|付与|新設)/;";
const R4_FN =
  "function isReformSubject(d) {" + EOL +
  "  // ★ 候補 R4: 抽象名が当たれば真。「門」だけは共起の文脈を要求する。" + EOL +
  "  if (REFORM_RE.test(d)) return true;" + EOL +
  "  return GATE_CONTEXT_RE.test(String(d));" + EOL +
  "}";
const R4 = s => must(must(s, REFORM_OLD, 'R4a'), ISREF_OLD, 'R4b')
  .replace(REFORM_OLD, R4_RE + R4_DEFS)
  .replace(ISREF_OLD, R4_FN);

// R5 = R2 + R4(英語の語境界 ∧ 「門」の文脈化) — 種M の英語と種M の「門」を同時に狙う
const R5_RE = "const REFORM_RE = /(楽園|ハーネス|憲法|エンジン|パイプライン|自己改善|オーケストレーション|枢機卿|神官|" +
  "\\b(?:paradise|harness|constitution|engine|gate|pipeline|self-improve|orchestration|cardinal|priest)\\b)/i;";
const R5 = s => must(must(s, REFORM_OLD, 'R5a'), ISREF_OLD, 'R5b')
  .replace(REFORM_OLD, R5_RE + R4_DEFS)
  .replace(ISREF_OLD, R4_FN);

// ══ PARA-11 候補 ══════════════════════════════════════════════════════
// P1 「削ってから探す」(debt.md §4 の提案そのもの)
const P1_BODY =
  "  // ★ 候補 P1 (debt.md §4): 紛れ語の一致箇所を**削ってから**強い名を探す" + EOL +
  "  const stripped = String(w).replace(new RegExp(PRODUCT_FALSE_FRIENDS.source, 'gi'), ' ');" + EOL +
  "  if (PRODUCT_STRONG_RE.test(stripped)) return true;" + EOL +
  "  return PRODUCT_RE.test(stripped);";
const P1 = s => must(s, WANTS_BODY_OLD, 'P1').replace(WANTS_BODY_OLD, P1_BODY);

// P2 「打ち消しを弱い印に限定」(= DIAGRAM_FALSE_FRIENDS と同じ健全な形)
const P2_BODY =
  "  // ★ 候補 P2: 打ち消しは**弱い印だけで当たった場合**に限る(isCartography の作法)" + EOL +
  "  if (PRODUCT_STRONG_RE.test(w)) {" + EOL +
  "    const stripped = String(w).replace(new RegExp(PRODUCT_FALSE_FRIENDS.source, 'gi'), ' ');" + EOL +
  "    if (PRODUCT_STRONG_RE.test(stripped)) return true;" + EOL +
  "  }" + EOL +
  "  if (PRODUCT_FALSE_FRIENDS.test(w)) return false;" + EOL +
  "  return PRODUCT_RE.test(w);";
const P2 = s => must(s, WANTS_BODY_OLD, 'P2').replace(WANTS_BODY_OLD, P2_BODY);

// P3 = P1 + isCartography の打ち消しも wantsProduct 経由の「削ってから」に揃える
const P3_CART = "  // ★ 候補 P3: 作図の打ち消しも「削ってから強い名を探す」形に揃える" + EOL +
  "  {" + EOL +
  "    const _s = String(wish).replace(new RegExp(PRODUCT_FALSE_FRIENDS.source, 'gi'), ' ');" + EOL +
  "    if (PRODUCT_STRONG_RE.test(_s)) return false;" + EOL +
  "  }";
const P3 = s => must(P1(s), CART_OLD, 'P3').replace(CART_OLD, P3_CART);

// ══ 合わせ技 ══════════════════════════════════════════════════════════
const X1 = s => R4(P3(s));   // 「門」の文脈化 + 削ってから探す(両病同時)
const X2 = s => R5(P3(s));   // 英語の語境界 + 「門」の文脈化 + 削ってから探す
const X3 = s => R3(P3(s));   // 紛れ語表を削ってから印を探す + 削ってから探す(表を消さない形)
const X4 = s => R2(R3(P3(s))); // X3 + 英語の語境界(R3 が先 — R3 は REFORM_OLD を残すので R2 が後から当たる)

const CANDIDATES = [
  ['B0',  '素の main(対照)', s => s],
  ['R1',  'PARA-10 除去: 弱い印「門」を撃ち捨てる', R1],
  ['R2',  'PARA-10 語境界: 英語の印に \\b を課す(日本語は不変)', R2],
  ['R3',  'PARA-10 紛れ語表: REFORM_FALSE_FRIENDS を削ってから印を探す', R3],
  ['R4',  'PARA-10 文脈化: 「門」は楽園/機構の語と共起した時だけ真', R4],
  ['R5',  'PARA-10 語境界 ∧ 文脈化 (R2+R4)', R5],
  ['P1',  'PARA-11 削ってから探す (debt.md §4)', P1],
  ['P2',  'PARA-11 打ち消しを弱い印に限定 (isCartography の作法)', P2],
  ['P3',  'PARA-11 P1 + isCartography の打ち消しも揃える', P3],
  ['X1',  '合わせ技 R4 + P3', X1],
  ['X2',  '合わせ技 R5 + P3', X2],
  ['X3',  '合わせ技 R3 + P3(抽象名の表を一語も消さない)', X3],
  ['X4',  '合わせ技 R3 + R2 + P3(X3 + 英語の語境界)', X4],
];

const WORK = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'ws_cand');
fs.mkdirSync(WORK, { recursive: true });
const only = process.argv.slice(2).filter(a => !a.startsWith('-'));

for (const [name, desc, fn] of CANDIDATES) {
  if (only.length && !only.includes(name)) continue;
  let bent;
  try { bent = fn(orig); } catch (e) { console.log(`\n候補 ${name}: 置換に失敗 — ${e.message}`); continue; }
  const bentPath = path.join(WORK, `forge.${name}.js`);
  fs.writeFileSync(bentPath, bent);
  const run = (rel, env) => {
    try { return { exit: 0, out: execFileSync(process.execPath, [GATE, bentPath, rel], { encoding: 'utf8', cwd: ROOT, env: { ...process.env, ...env } }) }; }
    catch (e) { return { exit: e.status, out: (e.stdout || '') + (e.stderr || '') }; }
  };
  // ★ 逐次に走らせる (NFR-1)
  const mx = run('reform/weak-signs/_matrix.js', { PROBE_TERSE: '1' });
  const gm = run('tests/route-matrix.test.js');
  const gc = run('tests/counsel.test.js');
  const gd = run('tests/route-debt.test.js');

  console.log('\n' + '═'.repeat(92));
  console.log(`候補 ${name} — ${desc}`);
  console.log(`  曲げた forge: ${bentPath}  (原文と異なるか: ${bent !== orig ? 'YES' : (name === 'B0' ? '— 対照なので同一で正しい' : '⚠ NO')})`);
  console.log('═'.repeat(92));
  const lines = mx.out.split('\n');
  const i = lines.findIndex(l => l.includes('混同行列'));
  console.log(lines.slice(i >= 0 ? i : 0).join('\n').trimEnd());
  for (const [label, r] of [['tests/route-matrix.test.js', gm], ['tests/counsel.test.js', gc], ['tests/route-debt.test.js', gd]]) {
    console.log(`\n  ── 既存門 ${label} ──  exit=${r.exit}`);
    const bad = r.out.split('\n').filter(l => l.includes('✗'));
    const sum = r.out.split('\n').filter(l => /self-test:/.test(l));
    console.log((bad.length ? bad.slice(0, 12).map(l => '  ' + l.trim()).join('\n') + (bad.length > 12 ? `\n    …(他 ${bad.length - 12} 本)` : '') + '\n' : '') +
      (sum.map(l => '  ' + l.trim()).join('\n') || '  (集計行なし)'));
  }
}
