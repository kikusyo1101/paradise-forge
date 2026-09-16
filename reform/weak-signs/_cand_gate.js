#!/usr/bin/env node
/**
 * 既存門を **本物のリポジトリの場所から** 走らせつつ、forge.js だけを曲げた版にすり替える。
 * require.cache に曲げた module を先に載せる形なので、門が計算する ROOT は本物のままであり、
 * overlay/ 等の相対参照が壊れない(reform/judgment-triad/_design_gate.js と同じ作法)。
 *
 * 使い方: node _cand_gate.js <曲げた forge の絶対パス> <走らせる js の repo 相対パス>
 * ⚠️ 本物の graph/ tests/ は一行も書き換えない。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Module = require('module');
const ROOT = path.join(__dirname, '..', '..');
const REAL_FORGE = path.join(ROOT, 'graph', 'forge.js');
const bent = process.argv[2];
const target = path.join(ROOT, process.argv[3]);

if (bent && bent !== 'none') {
  const src = fs.readFileSync(bent, 'utf8');
  const m = new Module(REAL_FORGE, null);
  m.filename = REAL_FORGE;
  m.paths = Module._nodeModulePaths(path.dirname(REAL_FORGE));
  m._compile(src, REAL_FORGE);
  m.loaded = true;
  require.cache[REAL_FORGE] = m;
}
require(target);
