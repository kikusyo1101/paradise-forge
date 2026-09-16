#!/usr/bin/env node
/**
 * design 相 (rev.2): PARA-7 候補を **cache 注入**で測る。
 *   曲げた forge.js の原文を $LOCALAPPDATA/Temp に置き、_design_gate.js が
 *   本物のパスの module としてそれを評価して require.cache に載せる。
 *   → 門は本物のリポジトリから走るので overlay/ 等の相対参照が壊れない
 *     (rev.1 は graph/ だけを写したため counsel.test.js が偽の ✗ 5 本を出した)。
 * ⚠️ 本物の graph/ tests/ は一行も書き換えない。測定は一つずつ逐次に走らせる (NFR-1)。
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'graph', 'forge.js');
const GATE = path.join(__dirname, '_design_gate.js');
const orig = fs.readFileSync(SRC, 'utf8');
const EOL = orig.includes('\r\n') ? '\r\n' : '\n';

const CART_HEAD = 'function isCartography(wish) {' + EOL + '  if (!DIAGRAM_RE.test(wish)) return false;';
const C2A_LINE = EOL + '  if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;';
const FULL_JA_OLD = "  const fullJa = /製品|システム|アプリ|プラットフォーム|全体/;";
const FULL_EN_OLD = "  const fullEn = /\\b(product|platform|system|app|application|saas|dashboard|end-to-end|mvp|launch)\\b/;";
const DECIDE_OLD = "  if (quickJa.test(d) || quickEn.test(w)) return 'quick';" + EOL +
                   "  if (fullJa.test(d) || fullEn.test(w)) return 'full';" + EOL +
                   "  return 'standard';";

const must = (s, needle, name) => { if (!s.includes(needle)) throw new Error(name + ': 置換の的が見つからない'); return s; };
const C2a = s => must(s, CART_HEAD, 'C2a').replace(CART_HEAD, CART_HEAD + C2A_LINE);
const C1_JA = "  const fullJa = /製品|システム|アプリ|プラットフォーム|全体|サイト|ウェブ|ウェブサイト|EC|通販|ポータル/i;";
const C1_EN = "  const fullEn = /\\b(product|platform|system|app|application|saas|dashboard|end-to-end|mvp|launch|site|website|web[- ]?app|e-?commerce|portal|shop|store)\\b/;";
const C1 = s => must(must(s, FULL_JA_OLD, 'C1ja'), FULL_EN_OLD, 'C1en').replace(FULL_JA_OLD, C1_JA).replace(FULL_EN_OLD, C1_EN);
const decide = (s, body) => must(s, DECIDE_OLD, 'decide').replace(DECIDE_OLD, body);

const PART_DEFS =
  "  // ★ 部分機能の印 — 産物**全体**ではなく、その**一部**を求めている標識" + EOL +
  "  const partJa = /機能|ボタン|並び替え|並べ替え|並び順|絞り込み|検索|計算|ページング|ページ送り|一覧|フォーム|入力欄|項目|タブ|導線|リンク/;" + EOL +
  "  const partEn = /\\b(sort|sorting|pagination|paginate|search|filter|filtering|button|option|field|form|listing|widget|link|tab)\\b/;" + EOL;
const SITE_DEFS =
  "  const siteJa = /サイト|ウェブ|ウエブ|ホームページ|EC|通販|ポータル/;" + EOL +
  "  const siteEn = /\\b(site|website|web[- ]?app|e-?commerce|portal|shop|store)\\b/;" + EOL;
const WHOLE_DEFS = (verbsEn) =>
  "  // ★ サイト語が願いの**主題語**である形 —— サイト語 + 助詞 + 創造動詞" + EOL +
  "  const siteWholeJa = /(?:サイト|ウェブ|ウエブ|ホームページ|ポータル|通販|EC)\\s*(?:を|が|は)\\s*(?:作|造|構築|開発|立ち上げ|新設|リニューアル|欲しい|ほしい|要る|必要)/;" + EOL +
  "  const siteWholeEn = /\\b(?:" + verbsEn + ")\\b[^.]{0,30}\\b(?:site|website|web[- ]?app|e-?commerce|portal|shop|store)\\b/;" + EOL;

const Q = "  if (quickJa.test(d) || quickEn.test(w)) return 'quick';" + EOL;
const F = "  if (fullJa.test(d) || fullEn.test(w)) return 'full';" + EOL;
const S = "  return 'standard';";

const CANDIDATES = [
  ['B0', 'C2a のみ(PARA-7 未修理)— 対照', s => C2a(s)],
  ['C1', 'C2a + fullJa/fullEn にサイト語を無条件で足す(specify §2.3 の形)', s => C1(C2a(s))],
  ['D1', 'C2a + サイト語が主題語の形だけを full にする(fullJa は触らない)',
   s => decide(C2a(s), WHOLE_DEFS('build|create|launch|develop|make|need|want') + Q + F +
     "  if (siteWholeJa.test(d) || siteWholeEn.test(w)) return 'full';" + EOL + S)],
  ['D2', 'C2a + サイト語を full の段に足すが、部分機能の印が在れば打ち消す',
   s => decide(C2a(s), SITE_DEFS + PART_DEFS + Q + F +
     "  if ((siteJa.test(d) || siteEn.test(w)) && !(partJa.test(d) || partEn.test(w))) return 'full';" + EOL + S)],
  ['D3', 'C1 + 部分機能の段を full より**先**に置き standard を返す(段の入れ替え)',
   s => decide(C1(C2a(s)), PART_DEFS + Q +
     "  if (partJa.test(d) || partEn.test(w)) return 'standard';" + EOL + F + S)],
  ['D4', 'C2a + 主題語の形 ∧ 部分機能の打ち消し(D1 ∧ D2 / 英に implement を含む)',
   s => decide(C2a(s), WHOLE_DEFS('build|create|launch|develop|make|implement|need|want') + PART_DEFS + Q + F +
     "  if ((siteWholeJa.test(d) || siteWholeEn.test(w)) && !(partJa.test(d) || partEn.test(w))) return 'full';" + EOL + S)],
];

// ── D5: 創造動詞が**何を目的語に取るか**で裁く(構造で分ける) ──────────
// 日本語:  (a) サイト語 + を/が/は + (短い間) + 創造動詞     「ウェブサイトを一から作ってほしい」
//          (b) サイト語 + の + **創造の名詞**                「ECサイトの構築」「…の立ち上げ」
//     ✗ 当たらない: サイト語 + の + **他の名詞** + を + 動詞  「サイトの検索機能を実装して」
//                   サイト語 + に + …                        「ECサイトに決済の導線を追加して」
// 英語:   創造動詞 + 冠詞/形容詞(前置詞を挟まない) + サイト語
//     ✗ 当たらない: build a csv export **for** the shop admin(前置詞が挟まる)
const D5_DEFS =
  "  // ★ サイト語が創造動詞の**目的語**である形だけを full にする" + EOL +
  "  const SITE = 'サイト|ウェブ|ウエブ|ホームページ|ポータル|通販|EC';" + EOL +
  "  const siteWholeJa = new RegExp('(?:' + SITE + ')(?:を|が|は)[^をのに]{0,6}(?:作|造|構築|開発|制作|立ち上げ|新設|リニューアル|刷新|欲しい|ほしい|要る|必要)'" + EOL +
  "    + '|(?:' + SITE + ')の(?:構築|開発|制作|作成|新設|立ち上げ|リニューアル|刷新)');" + EOL +
  "  const siteWholeEn = /\\b(?:build|create|launch|develop|make|implement|need|want|set\\s+up)\\b\\s+(?:a|an|the|new|our|my)?\\s*(?:(?!\\b(?:for|to|of|in|on|with|from|into)\\b)[a-z][a-z-]*\\s+){0,2}(?:site|website|web[- ]?app|e-?commerce|portal|shop|store)\\b/i;" + EOL;

CANDIDATES.push(
  ['D5', 'C2a + 創造動詞の目的語がサイト語である形だけを full にする(構造で分ける / 打ち消し無し)',
   s => decide(C2a(s), D5_DEFS + Q + F +
     "  if (siteWholeJa.test(d) || siteWholeEn.test(w)) return 'full';" + EOL + S)],
  ['D5g', 'D5 + 部分機能の打ち消しを重ねる(第60条(b) の両枝 — 帯と吊り)',
   s => decide(C2a(s), D5_DEFS + PART_DEFS + Q + F +
     "  if ((siteWholeJa.test(d) || siteWholeEn.test(w)) && !(partJa.test(d) || partEn.test(w))) return 'full';" + EOL + S)],
);

const WORK = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'jt_design');
fs.mkdirSync(WORK, { recursive: true });
const only = process.argv.slice(2).filter(a => !a.startsWith('-'));

for (const [name, desc, fn] of CANDIDATES) {
  if (only.length && !only.includes(name)) continue;
  let bentSrc;
  try { bentSrc = fn(orig); } catch (e) { console.log(`\n候補 ${name}: 置換に失敗 — ${e.message}`); continue; }
  const bentPath = path.join(WORK, `forge.${name}.js`);
  fs.writeFileSync(bentPath, bentSrc);
  const run = (rel) => {
    try { return { exit: 0, out: execFileSync(process.execPath, [GATE, bentPath, rel], { encoding: 'utf8', cwd: ROOT }) }; }
    catch (e) { return { exit: e.status, out: (e.stdout || '') + (e.stderr || '') }; }
  };
  // ★ 逐次に走らせる (NFR-1)。並行させれば偽の ✗ が出る(findings §6.2)。
  const mx = run('reform/judgment-triad/_design_matrix.js');
  const gm = run('tests/route-matrix.test.js');
  const gc = run('tests/counsel.test.js');

  console.log('\n' + '═'.repeat(88));
  console.log(`候補 ${name} — ${desc}`);
  console.log(`  曲げた forge: ${bentPath}  (原文と異なるか: ${bentSrc !== orig ? 'YES' : '⚠ NO'})`);
  console.log('═'.repeat(88));
  const lines = mx.out.split('\n');
  const i = lines.findIndex(l => l.includes('混同行列'));
  console.log(lines.slice(i >= 0 ? i : 0).join('\n').trimEnd());
  console.log('\n  ── 既存門 tests/route-matrix.test.js ──  exit=' + gm.exit);
  console.log(gm.out.split('\n').filter(l => l.includes('✗') || l.includes('Route matrix self-test'))
    .map(l => '  ' + l.trim()).join('\n') || '  (出力なし)');
  console.log('  ── 既存門 tests/counsel.test.js ──  exit=' + gc.exit);
  console.log(gc.out.split('\n').filter(l => l.includes('✗') || l.includes('Counsel self-test'))
    .map(l => '  ' + l.trim()).join('\n') || '  (出力なし)');
}
