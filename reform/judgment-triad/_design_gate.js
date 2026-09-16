#!/usr/bin/env node
/**
 * 既存門を **本物のリポジトリの場所から** 走らせつつ、forge.js だけを曲げた版に
 * すり替える。require.cache に曲げた module を先に載せる形なので、
 * 門が計算する ROOT は本物のままであり、overlay/ 等の相対参照が壊れない。
 *
 * 使い方: node _design_gate.js <曲げた forge の絶対パス> <tests/xxx.test.js>
 *        BENT=<none> なら素の forge のまま走らせる(対照群)
 * ⚠️ 本物の graph/ tests/ は一行も書き換えない。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Module = require('module');
const ROOT = path.join(__dirname, '..', '..');
const REAL_FORGE = path.join(ROOT, 'graph', 'forge.js');
const bent = process.argv[2];
const gate = path.join(ROOT, process.argv[3]);

if (bent && bent !== 'none') {
  // 曲げた原文を、本物のパスの module として評価して require.cache に載せる
  const src = fs.readFileSync(bent, 'utf8');
  const m = new Module(REAL_FORGE, null);
  m.filename = REAL_FORGE;
  m.paths = Module._nodeModulePaths(path.dirname(REAL_FORGE));
  m._compile(src, REAL_FORGE);
  m.loaded = true;
  require.cache[REAL_FORGE] = m;
}
require(gate);
