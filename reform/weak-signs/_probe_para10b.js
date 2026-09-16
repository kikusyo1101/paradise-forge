#!/usr/bin/env node
/**
 * PARA-10b 実測: 誤着の**原因を二種に割る**。
 *   種M(機械的 / 語中埋没) : 印が**より長い語の一部**として当たっている
 *       英語は `\b印\b` が偽になるかで機械的に判る (engine ⊂ engineering, gate ⊂ delegate)
 *       日本語は既存の `PRODUCT_FALSE_FRIENDS` に載る複合語かで判る (門 ⊂ 専門/部門/入門…)
 *   種H(同音異義 / 世間の語) : 印は**独立した語**として当たっているが、意味が世間のもの
 *       (枢機卿=バチカンの枢機卿 / 神官=神社の神官 / 楽園=常夏の楽園)
 * この割り方が修理の形を決める: 種M は語境界/紛れ語で機械的に消せる。種H は消せない。
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const forge = require(path.join(ROOT, 'graph', 'forge.js'));
const { chooseScale, REFORM_RE, PRODUCT_FALSE_FRIENDS } = forge;

const SIGNS = ['楽園','paradise','ハーネス','harness','憲法','constitution','engine','エンジン','門','gate',
  'パイプライン','pipeline','自己改善','self-improve','オーケストレーション','orchestration','枢機卿','cardinal','神官','priest'];
const EN = new Set(['paradise','harness','constitution','engine','gate','pipeline','self-improve','orchestration','cardinal','priest']);

// 誤着した 45 件(_probe_para10.js の的から誤着したものだけ)
const BAD = [
 '常夏の楽園を巡るリゾート予約アプリが欲しい','楽園ビーチの写真を並べる機能を実装して',
 'build a fan wiki for paradise lost','i want a travel booking app for paradise island resorts',
 '登山用ハーネスの通販サイトを作れ','安全ハーネスの点検記録を付ける機能を実装して',
 'implement an inventory importer for climbing harness stock','build a safety harness inspection app',
 '日本国憲法の条文を検索できるアプリが欲しい',
 'create a full-text search index for the us constitution','build a constitution quiz app for students',
 'implement a search engine result parser','build a civil engineering estimate app','create a listing page for used car engine parts',
 '検索エンジンの順位を追うアプリが欲しい','エンジンオイルの交換履歴を記録する機能を実装して',
 '一門の家系図を作れるアプリが欲しい','専門店の在庫を管理するシステムを作って','部門別の売上を集計するコマンドを実装して',
 '名門校の受験対策アプリが欲しい','入門講座の進捗を記録する機能を実装して',
 'implement a gateway timeout retry helper','build an app to investigate delegate voting records',
 'create a script to aggregate the daily sales rows','implement a navigate-back button for the wizard',
 '石油パイプラインの保守記録システムを作って','データパイプラインの実行ログを表示する機能を実装して',
 'implement a sales pipeline stage filter','build a crm app with a deal pipeline view',
 '自己改善の習慣を記録するアプリが欲しい','自己改善のチェックリスト機能を実装して',
 'implement a self-improvement streak counter','build a self-improvement journal app',
 'コンテナオーケストレーションの監視ダッシュボードを作って','音楽のオーケストレーション譜面を印刷する機能を実装して',
 'implement a kubernetes orchestration status widget','build a container orchestration cost dashboard product',
 'カトリック枢機卿の一覧を引けるアプリが欲しい','枢機卿の選挙結果を取り込むコマンドを実装して',
 'implement a cardinal direction compass widget','build a birdwatching app for spotting a cardinal',
 '神社の神官の当番表を管理するアプリが欲しい','神官の装束の在庫を数えるコマンドを実装して',
 'implement a parish priest schedule importer','build a priesthood directory app for the diocese',
];

let M = 0, H = 0;
const rowsM = [], rowsH = [];
for (const wish of BAD) {
  const hit = wish.match(REFORM_RE);
  const sign = hit[0].toLowerCase();
  let kind, why;
  if (EN.has(sign)) {
    const bounded = new RegExp('\\b' + sign.replace('-', '[- ]?') + '\\b', 'i').test(wish);
    kind = bounded ? 'H' : 'M';
    why = bounded ? `\\b${sign}\\b が真 = 独立語` : `\\b${sign}\\b が偽 = 語中に埋没`;
  } else {
    const ff = wish.match(PRODUCT_FALSE_FRIENDS);
    // 日本語: 印の直前直後に漢字/カナが続けば複合語の一部と見る
    const idx = hit.index;
    const before = wish[idx - 1] || '';
    const after = wish[idx + hit[0].length] || '';
    const cont = /[\u4E00-\u9FFF\u30A0-\u30FF]/;
    const embedded = (sign === '門') && (cont.test(before) || cont.test(after));
    kind = embedded ? 'M' : 'H';
    why = embedded ? `「${before}${hit[0]}${after}」= 複合語の一部` +
        (ff ? ` / 既存 PRODUCT_FALSE_FRIENDS にも一致 ${JSON.stringify(ff[0])}` : ' / ⚠ PRODUCT_FALSE_FRIENDS には無い')
      : '独立した語として当たっている(意味が世間のもの)';
  }
  const line = `  [種${kind}] ${JSON.stringify(hit[0])}@${hit.index}  "${wish}"\n          ${why}  -> ${chooseScale(wish)}`;
  if (kind === 'M') { M++; rowsM.push(line); } else { H++; rowsH.push(line); }
}
console.log('═══ 種M: 語中に埋没した印(機械的に消せる) ' + M + ' 件 ═══');
console.log(rowsM.join('\n'));
console.log('\n═══ 種H: 独立語だが意味が世間のもの(機械的には消せない) ' + H + ' 件 ═══');
console.log(rowsH.join('\n'));
console.log(`\n種M=${M} / 種H=${H} / 合計=${BAD.length}`);

// ── 参考: REFORM_RE は紛れ語の守りを **一つも** 持たない ──────────────
console.log('\n═══ 参考: 既存の守りとの対比 ═══');
console.log('PRODUCT_RE / PRODUCT_STRONG_RE は `PRODUCT_FALSE_FRIENDS` で守られている。');
console.log('REFORM_RE には紛れ語の表が **存在しない**(forge.js に REFORM_FALSE_FRIENDS は無い):');
const fs = require('fs');
const src = fs.readFileSync(path.join(ROOT, 'graph', 'forge.js'), 'utf8');
console.log('  grep -c "REFORM_FALSE_FRIENDS" graph/forge.js = ' + (src.match(/REFORM_FALSE_FRIENDS/g) || []).length);
console.log('  isReformSubject の本体 = ' + String(forge.isReformSubject).replace(/\s+/g, ' '));
// 「門」の紛れ語のうち PRODUCT_FALSE_FRIENDS が既に知っているもの
const KNOWN = ['門前','専門','部門','門下','入門','名門','門戸','関門','門限','門外','登竜門'];
const TEST = ['一門','専門','部門','名門','入門','門下','関門','水門','城門','門松','門出'];
console.log('\n  「門」の複合語が PRODUCT_FALSE_FRIENDS に載っているか:');
for (const t of TEST) console.log(`    ${t}: PRODUCT_FALSE_FRIENDS=${PRODUCT_FALSE_FRIENDS.test(t)}  REFORM_RE=${REFORM_RE.test(t)}`);
