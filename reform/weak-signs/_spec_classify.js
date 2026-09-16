'use strict';
const fs = require('fs');
const path = require('path');
const forge = require(path.join(__dirname, '..', '..', 'graph', 'forge.js'));
const CORPUS = require('./_spec_corpus.json');

/** 種M の機械的な定義: 印が**より長い語の一部**として当たっている */
const EN_SIGNS = ['paradise','harness','constitution','engine','gate','pipeline','self-improve','orchestration','cardinal','priest'];
const JA_GATE_COMPOUND = /一門|専門|部門|門下|入門|名門|門戸|関門|門限|門前|門外|登竜門|水門|城門|門松|門出|山門|正門|門番|門弟/;
function kindOf(wish) {
  const d = forge.denude(wish);
  // 日本語: 「門」が複合語の一部として当たっている
  if (JA_GATE_COMPOUND.test(d)) return 'M';
  // 英語: 素の印が当たり、\b 版の印が当たらない = 語中埋没
  for (const s of EN_SIGNS) {
    const bare = new RegExp(s.replace('-', '\\-'), 'i');
    const bnd = new RegExp('\\b' + s.replace('-', '\\-') + '\\b', 'i');
    if (bare.test(d) && !bnd.test(d)) return 'M';
  }
  return 'H';
}
const rows = [];
for (const c of CORPUS) {
  const got = forge.chooseScale(c.wish);
  if (got === c.route) continue;
  rows.push({ wish: c.wish, want: c.route, got, kind: kindOf(c.wish), tag: c.tag, src: c.src });
}
const mode = process.env.SPLIT_MODE || 'base';
const M = rows.filter(r => r.kind === 'M'), H = rows.filter(r => r.kind === 'H');
console.log('【' + mode + '】誤着 ' + rows.length + ' 件  (種M ' + M.length + ' / 種H ' + H.length + ')');
for (const label of ['M', 'H']) {
  const g = rows.filter(r => r.kind === label);
  if (!g.length) { console.log('  種' + label + ': 0 件'); continue; }
  console.log('  ── 種' + label + ' ' + g.length + ' 件 ──');
  for (const r of g) console.log('    ' + r.want + '->' + r.got + '  "' + r.wish + '"  (' + r.src + '/' + r.tag + ')');
}
fs.writeFileSync(path.join(__dirname, '_spec_' + mode + '_misroutes.json'), JSON.stringify(rows, null, 1));
