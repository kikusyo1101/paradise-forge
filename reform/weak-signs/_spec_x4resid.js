#!/usr/bin/env node
/**
 * specify 相の計測器: 最有力候補 **X4**(R3+R2+P3)を写しに当て、
 * 172 件コーパスに残る誤着 20 件を **一件ずつ名指しで** 取り出し、
 * 種M(語中埋没)/ 種H(同音異義)/ その他 に割る。
 *
 * 受け入れコーパスと「病の射程を測る的」を別帳に分ける裁定(requirements §3)の
 * 件数は、この出力から決める。**推定を書かないため**の計測器である。
 *
 * ⚠️ 本物の graph/ tests/ は一行も書き換えない(_cand.js と同じ作法)。
 * 使い方: node reform/weak-signs/_spec_x4resid.js
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

// ── _cand.js の X4 と一字一句同じ変換 ──────────────────────────────
const REFORM_OLD = "const REFORM_RE = /(楽園|paradise|ハーネス|harness|憲法|constitution|engine|エンジン|門|gate|パイプライン|pipeline|自己改善|self-improve|オーケストレーション|orchestration|枢機卿|cardinal|神官|priest)/i;";
const WANTS_BODY_OLD =
  "  if (PRODUCT_FALSE_FRIENDS.test(w)) return false;" + EOL +
  "  if (PRODUCT_STRONG_RE.test(w)) return true;" + EOL +
  "  // 一字の名(口/門/相)だけで当たった場合、それが紛れ語の一部でないか確かめる" + EOL +
  "  return PRODUCT_RE.test(w) && !PRODUCT_FALSE_FRIENDS.test(w);";
const CART_OLD = "  if (!PRODUCT_FALSE_FRIENDS.test(wish) && PRODUCT_STRONG_RE.test(wish)) return false;";
const ISREF_OLD = "function isReformSubject(d) {" + EOL + "  return REFORM_RE.test(d);" + EOL + "}";

const R2_RE = "const REFORM_RE = /(楽園|ハーネス|憲法|エンジン|門|パイプライン|自己改善|オーケストレーション|枢機卿|神官|" +
  "\\b(?:paradise|harness|constitution|engine|gate|pipeline|self-improve|orchestration|cardinal|priest)\\b)/i;";
const R2 = s => must(s, REFORM_OLD, 'R2').replace(REFORM_OLD, R2_RE);
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
  "  const stripped = String(d).replace(new RegExp(REFORM_FALSE_FRIENDS.source, 'gi'), ' ');" + EOL +
  "  return REFORM_RE.test(stripped);" + EOL +
  "}";
const R3 = s => must(must(s, REFORM_OLD, 'R3a'), ISREF_OLD, 'R3b')
  .replace(REFORM_OLD, REFORM_OLD + R3_DEFS).replace(ISREF_OLD, R3_FN);
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
const X4 = s => R2(R3(P3(s)));

const WORK = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'ws_cand');
fs.mkdirSync(WORK, { recursive: true });
const bentPath = path.join(WORK, 'forge.X4spec.js');
fs.writeFileSync(bentPath, X4(orig));
console.log('曲げた forge: ' + bentPath + '  (原文と異なるか: ' + (X4(orig) !== orig ? 'YES' : 'NO') + ')');
console.log('本物の graph/forge.js は読み取りのみ。\n');

// ── X4 を当てて 172 件コーパスを撃ち、誤着を一件ずつ出す ───────────
const out = execFileSync(process.execPath, [GATE, bentPath, 'reform/weak-signs/_matrix.js'],
  { encoding: 'utf8', cwd: ROOT, env: { ...process.env, PROBE_AUDIT: '1' } });
console.log(out);
