#!/usr/bin/env node
/**
 * PARA-10/11 実測: 6 道 × 6 道の混同行列(**基準線**)。
 * _matrix_probe.js (reform/judgment-triad) を踏襲し、次の二つを足す:
 *   ① 残債 2 件(PARA-10 / PARA-11)を **戻す**
 *   ② 本走行 2(b) の「紛れ語 × 産物名」の的と、2(a) の REFORM_RE 紛れ語の的を足す
 * ⚠️ 判定器は一行も変えない。PROBE_FORGE で曲げた写しを差せる。
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const forgePath = process.env.PROBE_FORGE || path.join(ROOT, 'graph', 'forge.js');
const forge = require(forgePath);

const ROUTES = ['counsel', 'cartography', 'reform', 'quick', 'standard', 'full'];
const CORPUS = [];
const w = (route, wish, src, tag) => CORPUS.push({ route, wish, src: src || 'new', tag: tag || '' });

// ══ 前走行 101 件コーパス(_matrix_probe.js より一字一句) ══════════════
// ── counsel (18件) ──
w('counsel', '楽園の構造を調査して報告してほしい', 'gate');
w('counsel', '楽園のエンジンを監査してほしい', 'gate');
w('counsel', '二つの案の比較表がほしい', 'gate');
w('counsel', '人口動態を調査して報告してほしい', 'gate');
w('counsel', '腎機能の低下を診断してほしい', 'gate');
w('counsel', '相場を分析して所見をくれ', 'gate');
w('counsel', '憲法に条を足すべきかどう思う', 'gate');
w('counsel', 'gauge に口を設けるのは妥当か', 'gate');
w('counsel', '楽園に相を足すべきかどうすべきか', 'gate');
w('counsel', '楽園の門を直すべきか検討して', 'gate');
w('counsel', 'ポモドーロアプリに休憩の機能を足すべきか検討して', 'gate');
w('counsel', 'should we add a flag to the gate? please advise', 'gate');
w('counsel', 'is it worth adding an endpoint here? give your assessment', 'gate');
w('counsel', 'compare the two approaches and advise whether to add a command', 'gate');
w('counsel', 'review whether introducing a new tool is a good idea', 'gate');
w('counsel', 'should we add a dark mode to the habit tracker? advise', 'gate');
w('counsel', '楽園の門に一段を足すべきか。意見をくれ', 'gate');
w('counsel', 'gauge に口を設けるべきか。所見がほしい', 'gate');
// ── cartography (15件) ──
w('cartography', '楽園の位階の相関図を作れ', 'gate');
w('cartography', 'オーケストレーションの相関図を作れ', 'gate');
w('cartography', '家計の流れをフロー図にして', 'gate');
w('cartography', '楽園の相の系統図を描いてほしい', 'gate');
w('cartography', '依存の関連図を可視化して', 'gate');
w('cartography', 'draw an architecture diagram of the engine', 'gate');
w('cartography', 'visualize the phase flowchart', 'gate');
w('cartography', '楽園の位階の相関図を作るべきか検討して', 'gate');
w('cartography', '構成図を描くのは妥当か', 'gate');
w('cartography', '組織の階層図を作って');
w('cartography', 'データの流れを図示して');
w('cartography', '楽園の相の依存をダイアグラムにして');
w('cartography', 'システム構成図を描いてくれ');
w('cartography', 'draw a sequence diagram for the login flow');
w('cartography', '一族の系統図を描いてほしい');
// ── reform (15件) ──
w('reform', '楽園の自己診断に fingerprint を確かめる口を設ける', 'gate');
w('reform', '門に監査の一段を足す', 'gate');
w('reform', '楽園の憲法に条を足せ', 'gate');
w('reform', '楽園の門に一段を設けよ', 'gate');
w('reform', '楽園の判定器を書き換えろ', 'gate');
w('reform', '楽園の走行台帳に印を付与せよ', 'gate');
w('reform', '楽園の相を新設する', 'gate');
w('reform', '楽園の門を見直すべきだ', 'gate');
w('reform', '楽園に監査の口を足すべきである', 'gate');
w('reform', '足すべきか迷ったが決めた。楽園の門に一段を足せ', 'gate');
w('reform', '妥当か検討済み:楽園に監査の口を実装せよ', 'gate');
w('reform', '楽園の走行帳に鼓動の口を足せ');
w('reform', '楽園の相の並びを変えよ');
w('reform', '楽園の憲法の条を書き直せ');
w('reform', '楽園の監査の門を強化せよ');
// ── quick (15件) ──
w('quick', '台帳の毒を直す', 'gate');
w('quick', 'タイポを直して', 'gate');
w('quick', '誤字を修正して', 'gate');
w('quick', '一行のバグを直す', 'gate');
w('quick', 'fix the typo in the readme', 'gate');
w('quick', 'quick tweak to the parser', 'gate');
w('quick', 'hotfix the broken import', 'gate');
w('quick', 'rename the variable', 'gate');
w('quick', '変数名を直す');
w('quick', '誤字の修正');
w('quick', '色を微調整して');
w('quick', 'patch the broken link');
w('quick', 'adjust the padding');
w('quick', 'small tweak to the css');
w('quick', 'typo fix in the docs');
// ── standard (15件) ──
w('standard', 'レシピ検索の並び替えを実現して', 'gate');
w('standard', '写真の整頓を実装して', 'gate');
w('standard', '読書記録の栞を作る', 'gate');
w('standard', '通知の仕組みを構築して', 'gate');
w('standard', 'implement a markdown renderer', 'gate');
w('standard', 'create a csv importer', 'gate');
w('standard', 'develop a caching layer', 'gate');
w('standard', 'make a url shortener service', 'gate');
w('standard', 'build a calorie tracker cli tool', 'gate');
w('standard', 'メモ帳の検索を実装して');
w('standard', 'CSV の取り込みを作る');
w('standard', 'build a rss reader');
w('standard', 'implement a pagination helper');
w('standard', 'create a thumbnail generator');
w('standard', 'develop a rate limiter');
// ── full (15件) ──
w('full', '健康診断アプリが欲しい', 'gate');
w('full', 'build a habit tracker app', 'gate');
w('full', 'ポモドーロタイマーのアプリが欲しい', 'gate');
w('full', '家計簿のシステムを作って', 'gate');
w('full', '読書記録のプラットフォームが欲しい', 'gate');
w('full', 'build a calorie tracker application', 'gate');
w('full', 'launch an mvp dashboard product', 'gate');
w('full', 'build an end-to-end saas platform', 'gate');
w('full', 'ECサイトを作れ', 'new', 'PARA-7');
w('full', '社内ポータルサイトを作れ', 'new', 'PARA-7');
w('full', '予約サイトを作りたい', 'new', 'PARA-7');
w('full', 'コーポレートサイトが欲しい', 'new', 'PARA-7');
w('full', '通販サイトを構築して', 'new', 'PARA-7');
w('full', 'ニュースポータルのウェブサイトが欲しい', 'new', 'PARA-7');
w('full', 'build an e-commerce site', 'new', 'PARA-7');
// ── PARA-9 の族(5件)── ※ ①「一門の家系図…」が残債 PARA-10 そのもの
w('full', '一門の家系図を作れるアプリが欲しい', 'debt', 'PARA-10');
w('full', '家系図を作れるアプリが欲しい', 'new', 'PARA-9');
w('full', '相関図を描けるアプリを作って', 'debt', 'PARA-11');
w('standard', '組織図を編集できるツールを作る', 'new', 'PARA-9');
w('standard', '系統図を出力するコマンドを実装して', 'new', 'PARA-9');
// ★ 前走行 specify §2.3 の的(_design_matrix.js の 101 件に在る 5 件)
w('standard', 'レシピサイトの並び替えを実装して', 'new', 'PARA-7-partial');
w('standard', 'サイトの検索機能を実装して', 'new', 'PARA-7-partial');
w('standard', '通販サイトのクーポン計算を作る', 'new', 'PARA-7-partial');
w('standard', 'add a sort option to the recipe site', 'new', 'PARA-7-partial');
w('standard', 'implement pagination for the site listing', 'new', 'PARA-7-partial');

// ══ ② 本走行が足す的 ═══════════════════════════════════════════════
// (A) PARA-11 の族: 紛れ語 × 強い産物名 (2(b) の 24 件)
const P11 = [
  ['full', '人口動態のアプリが欲しい'], ['standard', '相談窓口のツールを作る'],
  ['standard', '入口の混雑を表示する画面を実装して'], ['full', '口コミ投稿のアプリが欲しい'],
  ['standard', '口座残高を取り込むコマンドを実装して'], ['standard', '非常口の点検を記録する機能を実装して'],
  ['full', '相場を追うアプリが欲しい'], ['standard', '相談予約のボタンを実装して'],
  ['full', '相続の手続きを進めるアプリが欲しい'], ['standard', '相互リンクを集めるツールを作る'],
  ['standard', '真相究明メモの画面を実装して'], ['full', '首相の発言を集めるアプリが欲しい'],
  ['full', '専門店のサイトが欲しい'], ['standard', '部門別の集計コマンドを実装して'],
  ['full', '名門校の受験対策アプリが欲しい'], ['standard', '入門講座の進捗を記録する機能を実装して'],
  ['standard', '門限を知らせるタイマーを実装して'], ['full', '登竜門コンテストの投票アプリが欲しい'],
  ['full', '腎機能の数値を記録するアプリが欲しい'], ['standard', '認知機能テストの画面を実装して'],
  ['full', '一段落したタスクを片付けるアプリが欲しい'], ['standard', '画面越しの通話を録画するツールを作る'],
  ['full', 'タイマー競技の記録アプリが欲しい'], ['standard', '機能性表示食品の一覧を出すコマンドを実装して'],
];
for (const [r, x] of P11) w(r, x, 'new', 'P11');
// (B) PARA-11 × 作図: 紛れ語が isCartography の打ち消しを殺す族 (2(c))
const P11C = [
  ['full', '専門分野の系統図を編集できるアプリが欲しい'], ['standard', '人口分布の構成図を出力するツールを作る'],
  ['standard', '窓口の導線を図示するコマンドを実装して'], ['standard', '相場の推移を可視化するツールを作る'],
];
for (const [r, x] of P11C) w(r, x, 'new', 'P11c');
// (C) PARA-10 の族: REFORM_RE の各印が世間の語に埋もれる (2(a) の 46 件から重複を除く)
const P10 = [
  ['full', '常夏の楽園を巡るリゾート予約アプリが欲しい'], ['standard', '楽園ビーチの写真を並べる機能を実装して'],
  ['standard', 'build a fan wiki for paradise lost'], ['full', 'i want a travel booking app for paradise island resorts'],
  ['full', '登山用ハーネスの通販サイトを作れ'], ['standard', '安全ハーネスの点検記録を付ける機能を実装して'],
  ['standard', 'implement an inventory importer for climbing harness stock'], ['full', 'build a safety harness inspection app'],
  ['full', '日本国憲法の条文を検索できるアプリが欲しい'], ['counsel', '各国の憲法の前文を比較表がほしい'],
  ['standard', 'create a full-text search index for the us constitution'], ['full', 'build a constitution quiz app for students'],
  ['standard', 'implement a search engine result parser'], ['full', 'build a civil engineering estimate app'],
  ['standard', 'create a listing page for used car engine parts'],
  ['full', '検索エンジンの順位を追うアプリが欲しい'], ['standard', 'エンジンオイルの交換履歴を記録する機能を実装して'],
  ['standard', 'implement a gateway timeout retry helper'], ['full', 'build an app to investigate delegate voting records'],
  ['standard', 'create a script to aggregate the daily sales rows'], ['standard', 'implement a navigate-back button for the wizard'],
  ['full', '石油パイプラインの保守記録システムを作って'], ['standard', 'データパイプラインの実行ログを表示する機能を実装して'],
  ['standard', 'implement a sales pipeline stage filter'], ['full', 'build a crm app with a deal pipeline view'],
  ['full', '自己改善の習慣を記録するアプリが欲しい'], ['standard', '自己改善のチェックリスト機能を実装して'],
  ['standard', 'implement a self-improvement streak counter'], ['full', 'build a self-improvement journal app'],
  ['full', 'コンテナオーケストレーションの監視ダッシュボードを作って'], ['standard', '音楽のオーケストレーション譜面を印刷する機能を実装して'],
  ['standard', 'implement a kubernetes orchestration status widget'], ['full', 'build a container orchestration cost dashboard product'],
  ['full', 'カトリック枢機卿の一覧を引けるアプリが欲しい'], ['standard', '枢機卿の選挙結果を取り込むコマンドを実装して'],
  ['standard', 'implement a cardinal direction compass widget'], ['full', 'build a birdwatching app for spotting a cardinal'],
  ['full', '神社の神官の当番表を管理するアプリが欲しい'], ['standard', '神官の装束の在庫を数えるコマンドを実装して'],
  ['standard', 'implement a parish priest schedule importer'], ['full', 'build a priesthood directory app for the diocese'],
];
for (const [r, x] of P10) w(r, x, 'new', 'P10');

function buildMatrix(corpus) {
  const m = {};
  for (const a of ROUTES) { m[a] = {}; for (const b of ROUTES) m[a][b] = []; }
  const unknown = [];
  for (const row of corpus) {
    const got = forge.chooseScale(row.wish);
    if (!ROUTES.includes(got)) { unknown.push({ ...row, got }); continue; }
    m[row.route][got].push(row);
  }
  return { m, unknown };
}
function render(m) {
  const head = '正解\\実際'.padEnd(14) + ROUTES.map(r => r.slice(0, 6).padStart(12)).join('') + '     計';
  const lines = [head, '─'.repeat(head.length)];
  for (const a of ROUTES) {
    let n = 0;
    const cells = ROUTES.map(b => { n += m[a][b].length; return String(m[a][b].length).padStart(12); }).join('');
    lines.push(a.padEnd(14) + cells + String(n).padStart(8));
  }
  return lines.join('\n');
}
const { m: MATRIX, unknown: UNKNOWN } = buildMatrix(CORPUS);
console.log('forge: ' + forgePath);
console.log('コーパス件数: ' + CORPUS.length + '  (道ごと: ' +
  ROUTES.map(r => `${r}=${CORPUS.filter(c => c.route === r).length}`).join(', ') + ')');
console.log('  内訳: 前走行 gate/new = ' + CORPUS.filter(c => c.src === 'gate' || (c.src === 'new' && !['P10','P11','P11c'].includes(c.tag))).length +
  ' / 残債 debt = ' + CORPUS.filter(c => c.src === 'debt').length +
  ' / 本走行 P10 = ' + CORPUS.filter(c => c.tag === 'P10').length +
  ' / 本走行 P11 = ' + CORPUS.filter(c => c.tag === 'P11').length +
  ' / 本走行 P11c = ' + CORPUS.filter(c => c.tag === 'P11c').length);
console.log('\n═══ 6 道 × 6 道 混同行列 ═══\n');
console.log(render(MATRIX));
const diag = ROUTES.reduce((s, r) => s + MATRIX[r][r].length, 0);
console.log('\n対角の合計: ' + diag + ' / ' + CORPUS.length + '  (誤着 ' + (CORPUS.length - diag) + ' 件)');
if (UNKNOWN.length) console.log('6 道の外へ落ちた願い: ' + UNKNOWN.length);
console.log('\n═══ 非ゼロの非対角セル ═══');
let bad = 0, badN = 0;
for (const a of ROUTES) for (const b of ROUTES) {
  if (a === b) continue;
  const cell = MATRIX[a][b];
  if (!cell.length) continue;
  bad++; badN += cell.length;
  console.log(`\n  [${a} → ${b}] : ${cell.length} 件`);
  if (!process.env.PROBE_TERSE) for (const c of cell) console.log(`      ・${c.wish}   (${c.src}${c.tag ? '/' + c.tag : ''})`);
}
if (!bad) console.log('  (無し — 全セル 0)');
console.log(`\n非ゼロの非対角セル数: ${bad} / ${ROUTES.length * (ROUTES.length - 1)}   誤着の総数: ${badN}`);
// 前走行のコーパス(gate + new、残債と本走行の的を除く)だけで見た対角 — 回帰の検出用
const OLD = CORPUS.filter(c => c.src !== 'debt' && !['P10','P11','P11c'].includes(c.tag));
const oldBad = OLD.filter(c => forge.chooseScale(c.wish) !== c.route);
console.log(`前走行 101 件コーパスのみ: 対角 ${OLD.length - oldBad.length}/${OLD.length}` +
  (oldBad.length ? '  ✗ 回帰: ' + oldBad.map(c => `"${c.wish}"->${forge.chooseScale(c.wish)}(正解 ${c.route})`).join(' / ') : '  (回帰なし)'));
process.exitCode = 0;

// ── 監査: コーパスに重複が無いか(第37条: 数が閉じることを確かめる) ──
if (process.env.PROBE_AUDIT) {
  const seen = new Map();
  for (const c of CORPUS) {
    if (seen.has(c.wish)) console.log('重複: "' + c.wish + '"  (' + seen.get(c.wish).src + '/' + seen.get(c.wish).tag + ')  と  (' + c.src + '/' + c.tag + ')');
    else seen.set(c.wish, c);
  }
  console.log('ユニークな願い: ' + seen.size + ' / 総行数 ' + CORPUS.length);
  const OLD2 = CORPUS.filter(c => c.src !== 'debt' && !['P10','P11','P11c'].includes(c.tag));
  console.log('OLD(前走行分) 行数=' + OLD2.length + '  ユニーク=' + new Set(OLD2.map(c=>c.wish)).size);
}
