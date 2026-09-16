#!/usr/bin/env node
/**
 * specify 相の計測器 ③: **172 件コーパスを「受け入れ帳」と「射程の帳」に割る**ための件数を確定する。
 *
 * 裁定の根拠を推定で書かないために、次を一件ずつ機械的に数える:
 *   ① 基準線(B0)で誤着する 52 件を、種M / 種H に**機械的な規則**で割る
 *      種M の定義: 印が**より長い語の一部**として当たっている
 *                  = 英語なら \b 版の印が偽 / 日本語なら「門」の複合語表に当たる
 *      種H の定義: 印が独立した語として当たっている(= 種M でない誤着)
 *   ② X4′ を当てた後に残る誤着が、**種H と完全に一致するか**を集合で照合する
 *
 * これが一致すれば、受け入れ線を「種M は 0 件 / 種H は別帳で凍結」と引ける。
 * 一致しなければ、その差分が第三の病であり、requirements はそれを名指さねばならない。
 *
 * ⚠️ 本物の graph/ tests/ は一行も書き換えない。
 * 使い方: node reform/weak-signs/_spec_split.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const GATE = path.join(__dirname, '_cand_gate.js');
const WORK = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'ws_cand');
const X4P = path.join(WORK, 'forge.X4prime.js');
if (!fs.existsSync(X4P)) { console.error('先に node reform/weak-signs/_spec_x4prime.js を走らせよ'); process.exit(2); }

// ── 判定の的を repo 内に書き出す(_cand_gate.js は repo 相対しか受けない) ──
const CLASSIFIER = `'use strict';
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
  // 英語: 素の印が当たり、\\b 版の印が当たらない = 語中埋没
  for (const s of EN_SIGNS) {
    const bare = new RegExp(s.replace('-', '\\\\-'), 'i');
    const bnd = new RegExp('\\\\b' + s.replace('-', '\\\\-') + '\\\\b', 'i');
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
const fs = require('fs');
`;
// fs は上で使うので先頭へ移す
fs.writeFileSync(path.join(__dirname, '_spec_classify.js'),
  CLASSIFIER.replace("const path = require('path');", "const fs = require('fs');\nconst path = require('path');").replace(/\nconst fs = require\('fs'\);\n$/, '\n'));

// ── コーパスを JSON に吐く(_matrix.js の CORPUS を一字一句そのまま使う) ──
const mtx = fs.readFileSync(path.join(__dirname, '_matrix.js'), 'utf8');
const dumpSrc = mtx.replace(/^function buildMatrix[\s\S]*$/m,
  "require('fs').writeFileSync(require('path').join(__dirname,'_spec_corpus.json'), JSON.stringify(CORPUS,null,1));\nconsole.log('コーパスを書き出した: '+CORPUS.length+' 件');\n");
fs.writeFileSync(path.join(__dirname, '_spec_dumpcorpus.js'), dumpSrc);
console.log(execFileSync(process.execPath, [path.join(__dirname, '_spec_dumpcorpus.js')], { encoding: 'utf8', cwd: ROOT }));

const run = (bent, env) => {
  try { return execFileSync(process.execPath, [GATE, bent, 'reform/weak-signs/_spec_classify.js'], { encoding: 'utf8', cwd: ROOT, env: { ...process.env, ...env } }); }
  catch (e) { return (e.stdout || '') + (e.stderr || ''); }
};

console.log('═══ ① 基準線(main そのもの)の誤着を種で割る ═══');
console.log(run('none', { SPLIT_MODE: 'base' }));
console.log('═══ ② X4′ を当てた後に残る誤着を種で割る ═══');
console.log(run(X4P, { SPLIT_MODE: 'x4p' }));

// ── ③ 集合の照合 ──
const base = JSON.parse(fs.readFileSync(path.join(__dirname, '_spec_base_misroutes.json'), 'utf8'));
const x4p = JSON.parse(fs.readFileSync(path.join(__dirname, '_spec_x4p_misroutes.json'), 'utf8'));
const baseH = new Set(base.filter(r => r.kind === 'H').map(r => r.wish));
const x4pSet = new Set(x4p.map(r => r.wish));
const onlyBaseH = [...baseH].filter(w => !x4pSet.has(w));
const onlyX4p = [...x4pSet].filter(w => !baseH.has(w));
console.log('═══ ③ 照合: 「X4′ の残余」==「基準線の種H」か ═══');
console.log('  基準線の種H: ' + baseH.size + ' 件   X4′ の残余: ' + x4pSet.size + ' 件');
console.log('  種H なのに X4′ で直った(= 表以外の力で直った): ' + onlyBaseH.length + (onlyBaseH.length ? '\n    ・' + onlyBaseH.join('\n    ・') : ''));
console.log('  X4′ の残余なのに種H でない(= 第三の病 / 新規の誤着): ' + onlyX4p.length + (onlyX4p.length ? '\n    ・' + onlyX4p.join('\n    ・') : ''));
console.log('  一致するか: ' + (onlyBaseH.length === 0 && onlyX4p.length === 0 ? 'YES — 受け入れ線を種で引ける' : 'NO — 差分を requirements で名指せ'));
