#!/usr/bin/env node
/**
 * design 相の計測器 ①: **X4″ の最終パッチ形**を組み立て、写しの上で測る。
 *
 * discover / specify 相の計測器(_cand.js / _spec_x4prime.js / _spec_x4pp.js)は
 * 「候補を比べる」ための粗い置換だった。本器はそれと違い、
 * **建造相がそのまま graph/forge.js へ貼る文字列**を持つ。
 * ゆえに置換の的(anchor)は本物の forge.js に一箇所しか無いことを機械で確かめ、
 * 生成した写しは `--emit` で丸ごと取り出せる(design.md のパッチ全文の出所)。
 *
 * 部品:
 *   R2 — REFORM_RE を日英に割り、英語側に \b を課す(表の語は一語も動かさない)
 *   R3 — REFORM_FALSE_FRIENDS(「門」の複合語 21 語)+ isReformSubject を
 *        「削ってから探す」形へ
 *   P3 — wantsProduct を「削ってから探す」形へ + isCartography の同じ行を揃える
 *   EX — module.exports に REFORM_FALSE_FRIENDS を足す(AC-3 が門から撃つため)
 *
 * ⚠️ 本物の graph/ tests/ は一行も書き換えない。門は逐次に走らせる(NFR-1)。
 * 使い方:
 *   node reform/weak-signs/_design_patch.js            # 写しを $LOCALAPPDATA/Temp/ws_cand へ書くだけ
 *   node reform/weak-signs/_design_patch.js --emit R3  # その部品の差分だけを標準出力へ
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'graph', 'forge.js');
const orig = fs.readFileSync(SRC, 'utf8');
const EOL = orig.includes('\r\n') ? '\r\n' : '\n';

/** 置換の的は**一箇所しか無い**ことを機械で確かめる(第58条: 当て損ねを緑にしない)。 */
function cut(s, needle, label) {
  let n = 0, i = -1;
  while ((i = s.indexOf(needle, i + 1)) >= 0) n++;
  if (n !== 1) throw new Error(`${label}: 置換の的が ${n} 箇所(1 でなければならない)`);
  return s;
}

// ══════════════════════════════════════════════════════════════════════
// 置換の的(本物の forge.js の原文と一字一句同じ)
// ══════════════════════════════════════════════════════════════════════
const A_REFORM_RE =
  'const REFORM_RE = /(楽園|paradise|ハーネス|harness|憲法|constitution|engine|エンジン|門|gate|' +
  'パイプライン|pipeline|自己改善|self-improve|オーケストレーション|orchestration|枢機卿|cardinal|神官|priest)/i;';
const A_SUBJDOC = '/**' + EOL + ' * 願いの**対象が楽園自身**か。';
const A_ISREF = 'function isReformSubject(d) {' + EOL + '  return REFORM_RE.test(d);' + EOL + '}';
const A_WANTS =
  '  if (PRODUCT_FALSE_FRIENDS.test(w)) return false;' + EOL +
  '  if (PRODUCT_STRONG_RE.test(w)) return true;' + EOL +
  '  // 一字の名(口/門/相)だけで当たった場合、それが紛れ語の一部でないか確かめる' + EOL +
  '  return PRODUCT_RE.test(w) && !PRODUCT_FALSE_FRIENDS.test(w);';
const A_CART = '  if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;';
const A_EXPORTS = 'buildDag, REFORM_RE, isReformSubject, PRODUCT_FALSE_FRIENDS,';

// ══════════════════════════════════════════════════════════════════════
// R2 — 英語の印に \b を課す。**表の語は一語も動かさない**(AC-10 / counsel:652)
// ══════════════════════════════════════════════════════════════════════
const R2_NEW = [
  '/**',
  ' * ★ PARA-10 (reform/weak-signs / R2): **語境界を二枝で持つ**(第60条(b))。',
  ' *',
  ' * 旧実装は日英を一つの選択肢の並びに混ぜ、英語にも境界を課していなかった ——',
  ' * `gateway` の中の `gate` / `engineering` の中の `engine` /',
  ' * `delegate` `aggregate` `navigate` の中の `gate` / `priesthood` の中の `priest` /',
  ' * `self-improvement` の中の `self-improve` が当たり、世間の願いが改革の道へ攫われた。',
  ' *',
  ' * ⚠️ **日本語に `\\b` を使ってはならない**(COUNSEL_JA / BUILD_JA の註と同じ理由 ——',
  ' *    日本語は全て非単語構成文字として扱われるので、境界は事実上決して一致しない)。',
  ' *    日本語側の語境界は `REFORM_FALSE_FRIENDS`(下)が代用する。',
  ' *    **日英を別の定数に割る形は L-3 で確立済みである**(`BUILD_JA` / `BUILD_EN` / `BUILD_RE`、',
  ' *    `COUNSEL_JA` / `COUNSEL_EN`、`DIAGRAM_JA` / `DIAGRAM_EN`)。同じ作法に揃えた。',
  ' *',
  ' * ⚠️ **語は一語も増減していない。** `tests/counsel.test.js:652` が 20 語を直に',
  ' *    撃っており(AC-10)、`REFORM_RE.test(\'門\')` / `.test(\'gate\')` は今も真である。',
  ' *    直したのは**当たり方**であって表ではない。',
  ' */',
  "const REFORM_JA = '楽園|ハーネス|憲法|エンジン|門|パイプライン|自己改善|オーケストレーション|枢機卿|神官';",
  "const REFORM_EN = '\\\\b(?:paradise|harness|constitution|engine|gate|pipeline|self-improve|" +
    "orchestration|cardinal|priest)\\\\b';",
  'const REFORM_RE = new RegExp(`${REFORM_JA}|${REFORM_EN}`, \'i\');',
].join(EOL);
const R2 = s => cut(s, A_REFORM_RE, 'R2').replace(A_REFORM_RE, R2_NEW);

// ══════════════════════════════════════════════════════════════════════
// R3 — REFORM_FALSE_FRIENDS(「門」の複合語 21 語)+ 「削ってから探す」
// ══════════════════════════════════════════════════════════════════════
const R3_TABLE = [
  '/**',
  ' * ★ PARA-10 (reform/weak-signs / R3): 弱い印「門」の**紛れ語**。',
  ' *',
  ' * これは `REFORM_EN` の `\\b` に対応する**日本語側の語境界**である ——',
  ' * 日本語に単語境界が無いので、「門」がより長い語の一部として当たる形を',
  ' * 語で数え上げるほか無い。`DIAGRAM_FALSE_FRIENDS` / `PRODUCT_FALSE_FRIENDS` と同じ作法。',
  ' *',
  ' * ⚠️⚠️ **ここに「門」を含まない語を一語でも入れてはならない**(第60条)。',
  ' *    弱い印は表を足しても強くならない。`常夏の楽園` `検索エンジン` `カトリック枢機卿`',
  ' *    のような**同音異義の的そのもの**を書けば、それは判定器の修理ではなく答案の暗記であり、',
  ' *    コーパスの外(`熱帯の楽園` `自動車エンジン`)には一切効かない。',
  ' *    しかも長い紛れ語は文の骨まで削る —— `コンテナオーケストレーション` を入れた形は',
  ' *    「の監視ダッシュボードを作って」だけを残し、`full` の願いを `standard` へ落とした',
  ' *    (reform/weak-signs/requirements.md §3.3 の実測)。',
  ' *    **塞げない的は `reform/weak-signs/reach.md` へ載せよ。**',
  ' *    `tests/reform-sign.test.js` の S-3 がこの戒めを機械で撃つ。',
  ' */',
  'const REFORM_FALSE_FRIENDS = new RegExp(',
  "  // 分野・学び・家系の「門」— 判定の門ではない",
  "  '一門|専門|部門|門下|入門|名門|門戸|関門|門限|門人|登竜門|' +",
  "  // 建物・行事の「門」",
  "  '門前|門外|水門|城門|門松|門出|山門|正門|門番|門弟', 'i');",
  '',
  '',
].join(EOL);
const R3_FN = [
  'function isReformSubject(d) {',
  '  /**',
  '   * ★ PARA-10 (reform/weak-signs / R3): 紛れ語の**一致箇所ごと全体**を削ってから印を探す。',
  '   *',
  '   * ⚠️ `if (REFORM_FALSE_FRIENDS.test(d)) return false;` と書いてはならない ——',
  '   *    それは**文全体**を無効化する形であり、PARA-11 が実証した病そのものである',
  '   *    (「専門の楽園を改修せよ」が改革の道を失う)。削るのは当たった箇所だけである。',
  '   * ⚠️ 削る単位は「一致箇所ごと全体」である。部分だけ削れば残りが印に当たる。',
  '   */',
  "  const stripped = String(d).replace(new RegExp(REFORM_FALSE_FRIENDS.source, 'gi'), ' ');",
  '  return REFORM_RE.test(stripped);',
  '}',
].join(EOL);
const R3 = s => cut(cut(s, A_SUBJDOC, 'R3a'), A_ISREF, 'R3b')
  .replace(A_SUBJDOC, R3_TABLE + A_SUBJDOC)
  .replace(A_ISREF, R3_FN);

// ══════════════════════════════════════════════════════════════════════
// P3 — wantsProduct / isCartography を「削ってから探す」形へ
// ══════════════════════════════════════════════════════════════════════
const P3_WANTS = [
  '  /**',
  '   * ★ PARA-11 (reform/weak-signs / P3): 紛れ語の**一致箇所ごと全体**を削ってから',
  '   * 強い名を探す。**文全体を無効化してはならない** ——',
  '   * 旧実装の一行目 `if (PRODUCT_FALSE_FRIENDS.test(w)) return false;` は',
  '   * 「相関図を描けるアプリを作って」の「相関」に当たった瞬間、同じ文の「アプリ」まで',
  '   * 巻き添えで殺していた(debt.md PARA-11)。',
  '   *',
  '   * これは `isCartography` の `onlyWeak` が示す作法の**一般形**である ——',
  '   * `DIAGRAM_RE` は弱い印と強い印を別の式に切り出せるので述語で書けるが、',
  '   * `PRODUCT_RE` は強弱が同じ文に同居する(「専門店のサイト」)。',
  '   * ゆえに述語では分けられず、**一致箇所を削る**ことでしか強弱を分離できない。',
  '   *',
  '   * ⚠️ 削る単位は「一致箇所ごと全体」である。`窓口` から `窓` だけ削れば',
  '   *    残った `口` が `PRODUCT_RE` に当たり、諐問の道を失う(第60条)。',
  '   */',
  "  const stripped = String(w).replace(new RegExp(PRODUCT_FALSE_FRIENDS.source, 'gi'), ' ');",
  '  if (PRODUCT_STRONG_RE.test(stripped)) return true;',
  '  return PRODUCT_RE.test(stripped);',
].join(EOL);
const P3_CART = [
  '  {',
  '    // ★ PARA-11 (reform/weak-signs / P3): 作図の打ち消しも**同じ形**に揃える。',
  '    //    旧: if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;',
  '    //        ← 紛れ語が在るだけで打ち消しが丸ごと死に、図一枚で返っていた。',
  '    //    ⚠️ `wantsProduct(wish)` を呼んではならない(AC-8)—— `PRODUCT_RE` の一字の名「相」が',
  '    //       『楽園の相の系統図を描いてほしい』に当たる。**強い産物名だけ**で打ち消す。',
  "    const _stripped = String(wish).replace(new RegExp(PRODUCT_FALSE_FRIENDS.source, 'gi'), ' ');",
  '    if (PRODUCT_STRONG_RE.test(_stripped)) return false;',
  '  }',
].join(EOL);
const P3 = s => cut(cut(s, A_WANTS, 'P3a'), A_CART, 'P3b')
  .replace(A_WANTS, P3_WANTS).replace(A_CART, P3_CART);

// ══════════════════════════════════════════════════════════════════════
// EX — export に REFORM_FALSE_FRIENDS を足す(AC-3 の門が表を直に読むため)
// ══════════════════════════════════════════════════════════════════════
const EX = s => cut(s, A_EXPORTS, 'EX').replace(A_EXPORTS,
  'buildDag, REFORM_RE, REFORM_FALSE_FRIENDS, isReformSubject, PRODUCT_FALSE_FRIENDS,');

// ══════════════════════════════════════════════════════════════════════
const VARIANTS = {
  B0:    s => s,
  R2:    s => R2(s),
  R3:    s => EX(R3(s)),
  P3:    s => P3(s),
  R2R3:  s => EX(R3(R2(s))),
  R2P3:  s => P3(R2(s)),
  R3P3:  s => EX(R3(P3(s))),
  X4PP:  s => EX(R3(R2(P3(s)))),          // ★ X4″ の最終形
};

const WORK = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'ws_cand');
fs.mkdirSync(WORK, { recursive: true });

const emit = process.argv.indexOf('--emit');
if (emit >= 0) {
  const name = process.argv[emit + 1] || 'X4PP';
  process.stdout.write(VARIANTS[name](orig));
  process.exit(0);
}

for (const [name, fn] of Object.entries(VARIANTS)) {
  const bent = fn(orig);
  const p = path.join(WORK, `forge.D_${name}.js`);
  fs.writeFileSync(p, bent);
  // 写しが**構文として読めること**をその場で確かめる(第58条: 当て損ねを緑にしない)
  let ok = 'OK';
  try { new (require('module'))(SRC, null)._compile(bent, SRC); } catch (e) { ok = 'PARSE-FAIL: ' + e.message; }
  console.log(`${name.padEnd(6)} 原文と異なる=${bent !== orig ? 'YES' : (name === 'B0' ? '— 対照' : '⚠ NO')}  ` +
    `行数 ${bent.split(/\r?\n/).length}  ${ok}  ${p}`);
}
