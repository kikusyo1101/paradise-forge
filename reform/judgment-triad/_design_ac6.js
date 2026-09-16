#!/usr/bin/env node
/**
 * design 相: AC-6 の裏取り —— `tests/route-matrix.test.js` のコーパスに 15 件を足し、
 * FLOOR を standard 16 / full 16 に上げた版を、D5+C2a の forge に向けて撃つ。
 * ⚠️ 本物の tests/route-matrix.test.js も graph/forge.js も一行も変えない。
 *    曲げた写しは $LOCALAPPDATA/Temp に置く。
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const GATE_SRC = path.join(ROOT, 'tests', 'route-matrix.test.js');
const WORK = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'jt_design');
const FORGE = path.join(WORK, 'forge.FINAL.js');
if (!fs.existsSync(FORGE)) { console.error('先に _design_final.js を走らせよ'); process.exit(1); }

let src = fs.readFileSync(GATE_SRC, 'utf8');
const EOL = src.includes('\r\n') ? '\r\n' : '\n';

// ── (1) 足す的 15 件(standard 7 / full 8) ──────────────────────────
const ADD =
  EOL + "// ★ reform/judgment-triad: PARA-7 / PARA-9 の的(design §5.3 / AC-6)" + EOL +
  "w('standard', 'レシピサイトの並び替えを実装して');" + EOL +
  "w('standard', 'サイトの検索機能を実装して');" + EOL +
  "w('standard', '通販サイトのクーポン計算を作る');" + EOL +
  "w('standard', 'add a sort option to the recipe site');" + EOL +
  "w('standard', 'implement pagination for the site listing');" + EOL +
  "w('standard', '組織図を編集できるツールを作る');" + EOL +
  "w('standard', '系統図を出力するコマンドを実装して');" + EOL +
  "w('full', 'ECサイトを作れ');" + EOL +
  "w('full', '社内ポータルサイトを作れ');" + EOL +
  "w('full', '予約サイトを作りたい');" + EOL +
  "w('full', 'コーポレートサイトが欲しい');" + EOL +
  "w('full', '通販サイトを構築して');" + EOL +
  "w('full', 'ニュースポータルのウェブサイトが欲しい');" + EOL +
  "w('full', 'build an e-commerce site');" + EOL +
  "w('full', '家系図を作れるアプリが欲しい');" + EOL;

// 最後の w(...) 行の直後に挿す
const lines = src.split(EOL);
let last = -1;
lines.forEach((l, i) => { if (/^w\('/.test(l)) last = i; });
if (last < 0) throw new Error('w( の行が見つからない');
lines.splice(last + 1, 0, ...ADD.split(EOL).filter(x => x !== ''));
src = lines.join(EOL);

// ── (2) FLOOR と総数の下限を上げる ────────────────────────────────
const FLOOR_OLD = "  const FLOOR = { counsel: 42, cartography: 9, reform: 11, quick: 8, standard: 9, full: 8 };";
const FLOOR_NEW = "  const FLOOR = { counsel: 42, cartography: 9, reform: 11, quick: 8, standard: 16, full: 16 };";
if (!src.includes(FLOOR_OLD)) throw new Error('FLOOR の錨が無い');
src = src.replace(FLOOR_OLD, FLOOR_NEW);
const N_OLD = "assert.ok(CORPUS.length >= 87,";
const N_NEW = "assert.ok(CORPUS.length >= 102,";
if (!src.includes(N_OLD)) throw new Error('総数の下限の錨が無い');
src = src.replace(N_OLD, N_NEW).replace("(下限 87)", "(下限 102)");

// ★ 写した門は __dirname から ROOT を算するので、そのままでは本物のリポジトリを見失う。
//   ROOT の算出だけを本物の絶対パスに固定する(門の中身は一行も変えない)。
const ROOT_OLD = src.match(/^const ROOT = .*$/m);
if (!ROOT_OLD) throw new Error('ROOT の定義が見つからない');
src = src.replace(ROOT_OLD[0], 'const ROOT = ' + JSON.stringify(ROOT) + ';');
console.log('ROOT の定義を固定: ' + ROOT_OLD[0].trim() + '  ->  const ROOT = <本物の根>;');

const OUT = path.join(WORK, 'route-matrix.AC6.test.js');
fs.writeFileSync(OUT, src);
console.log('曲げた門: ' + OUT);
console.log('FLOOR: standard 9→16 / full 8→16、総数の下限 87→102');

const GATE = path.join(__dirname, '_design_gate.js');
// 曲げた門を、曲げた forge に向けて撃つ。_design_gate.js は ROOT からの相対を取るので
// 写しの門は直に走らせ、forge だけを cache 注入する薄い包みを作る。
const WRAP = path.join(WORK, '_wrap.js');
fs.writeFileSync(WRAP, `'use strict';
const fs=require('fs'),path=require('path'),Module=require('module');
const REAL=${JSON.stringify(path.join(ROOT,'graph','forge.js'))};
const src=fs.readFileSync(${JSON.stringify(FORGE)},'utf8');
const m=new Module(REAL,null);m.filename=REAL;m.paths=Module._nodeModulePaths(path.dirname(REAL));
m._compile(src,REAL);m.loaded=true;require.cache[REAL]=m;
process.argv=[process.argv[0],${JSON.stringify(OUT)}];
require(${JSON.stringify(OUT)});
`);
let exit = 0, out = '';
try { out = execFileSync(process.execPath, [WRAP], { encoding: 'utf8', cwd: ROOT }); }
catch (e) { exit = e.status; out = (e.stdout || '') + (e.stderr || ''); }
console.log('\n══ 曲げた route-matrix.test.js(的 +15 / FLOOR 上げ)× D5+C2a の forge  exit=' + exit + ' ══');
const L = out.split('\n');
const i = L.findIndex(x => x.includes('混同行列'));
console.log(L.slice(i >= 0 ? i : 0).join('\n').trimEnd());
