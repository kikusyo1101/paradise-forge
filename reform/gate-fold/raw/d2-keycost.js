#!/usr/bin/env node
'use strict';
/**
 * D-2: 鍵の算法の候補ごとに、材料のファイル数と計算の所要を測る。
 * 生成物(第29条)を鍵に入れないため、derived.js の宣言を読んで除外する。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..', '..');

function tracked() {
  const out = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

// ── 生成物の宣言を読む (第29条) ──
let derivedDecl = [];
try {
  const d = require(path.join(ROOT, 'graph', 'derived.js'));
  const src = fs.readFileSync(path.join(ROOT, 'graph', 'derived.js'), 'utf8');
  derivedDecl = (d.DERIVED || d.derived || []).map((x) => (typeof x === 'string' ? x : x.path || x.file || x.id));
  if (!derivedDecl.length) {
    // 宣言の形が違う場合は綴りで拾って人が読む
    derivedDecl = [...src.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);
  }
} catch (e) { derivedDecl = ['(derived.js が読めない: ' + e.message + ')']; }
console.log('derived.js が宣言する生成物:', JSON.stringify(derivedDecl, null, 0));
console.log('');

const ALL = tracked();

const CANDIDATES = {
  'K1: tests/**/*.js + graph/**/*.js のみ':
    (f) => /^tests\/.*\.js$/.test(f) || /^graph\/.*\.js$/.test(f),
  'K2: K1 + graph/*.json':
    (f) => /^tests\/.*\.js$/.test(f) || /^graph\/.*\.js$/.test(f) || /^graph\/[^/]+\.json$/.test(f),
  'K3: K2 + overlay/** 全部':
    (f) => /^tests\/.*\.js$/.test(f) || /^graph\/.*\.js$/.test(f) || /^graph\/[^/]+\.json$/.test(f) || /^overlay\//.test(f),
  'K4: 版管理下の全ファイル':
    () => true,
};

const timeIt = (fn) => {
  const t = process.hrtime.bigint();
  const v = fn();
  return [v, Number(process.hrtime.bigint() - t) / 1e6];
};

for (const [name, pick] of Object.entries(CANDIDATES)) {
  const files = ALL.filter(pick).sort();
  // 3 回測って中央値 — 一回だけの値は機の気分である
  const runs = [];
  let key = null, bytes = 0;
  for (let i = 0; i < 3; i++) {
    const [r, ms] = timeIt(() => {
      const h = crypto.createHash('sha256');
      let b = 0;
      for (const f of files) {
        h.update(f); h.update('\0');
        const buf = fs.readFileSync(path.join(ROOT, f));
        b += buf.length;
        h.update(crypto.createHash('sha256').update(buf).digest());
      }
      return { digest: h.digest('hex').slice(0, 16), bytes: b };
    });
    runs.push(ms); key = r.digest; bytes = r.bytes;
  }
  runs.sort((a, b) => a - b);
  console.log(`${name}\n    ファイル ${files.length} 本 / ${(bytes / 1048576).toFixed(1)} MiB / 鍵 ${key} / 中央 ${runs[1].toFixed(1)}ms (${runs.map((x) => x.toFixed(0)).join('/')}ms)`);
}

// ── 生成物が K3 に混ざっていないかを実測 ──
console.log('');
const k3 = ALL.filter(CANDIDATES['K3: K2 + overlay/** 全部']);
const suspects = k3.filter((f) => derivedDecl.some((d) => d && f === d));
console.log('K3 の材料に混ざった「宣言された生成物」:', suspects.length ? suspects : '(0 件)');
const lessonsIn = k3.filter((f) => /lessons\.json|identity\/catalog\.json|abode\.json|domains\.json/.test(f));
console.log('K3 に入る graph/*.json の実名:', lessonsIn);
