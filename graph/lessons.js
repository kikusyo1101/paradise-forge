#!/usr/bin/env node
/**
 * PARADISE :: Lessons — Reflexion's episodic memory bridge
 * ---------------------------------------------------------------
 * Exports 'lesson'-type nodes from the knowledge graph into a flat
 * lessons.json the critic consumes. A lesson is a past miss turned into
 * a check that runs on every future creation, so the paradise never
 * depends on the user to catch the same flaw twice.
 *
 * A lesson node's body is the CHECK: a keyword/phrase that must appear
 * somewhere in a creation's code/spec/findings, or the critic flags a
 * regression.
 *
 * Usage:
 *   lessons.js export [--out lessons.json]   # kg lesson nodes -> lessons.json
 *   lessons.js list                          # show current lessons
 */
'use strict';
const fs = require('fs');
const path = require('path');
const kg = require('./kg.js');

const DEFAULT_OUT = path.join(__dirname, 'lessons.json');

/**
 * 教訓帳を書き出す。
 *
 * ⚠️ **空の KG で既存の教訓帳を上書きしない** (reflect C-2)。
 * 実測: CI は `lessons.js export --out graph/lessons.json || true` を撃つ。
 * CI に KG は無いので export は **0 件**を書き、**版管理下の 72 件を消す**。
 * その 0 件の帳を critic へ渡すので、critic は教訓を一つも撃たずに緑を出していた。
 * 「証拠を消す道具」が「証拠を読む門」の直前に立っていた形である。
 *
 * ゆえに: 出力が 0 件で、かつ書き先が既に非空なら **書かずに exit 1**。
 * 本当に空にしたい者は `--allow-empty` で意思を示せ —— 事故では起きない。
 */
function exportLessons(outPath, opts = {}) {
  const lessons = collectLessons();
  if (!lessons.length && !opts.allowEmpty) {
    let existing = null;
    try { existing = JSON.parse(fs.readFileSync(outPath, 'utf8')); } catch { existing = null; }
    if (Array.isArray(existing) && existing.length) {
      const e = new Error(
        `教訓 0 件を書き出そうとした — 書き先には既に ${existing.length} 件が在る: ${outPath}\n` +
        `  この機に KG が無い(PARADISE_KG が空/未設定)のが原因である。\n` +
        `  上書きすれば版管理下の教訓帳が消え、critic は教訓 0 件で「何も見つからなかった」と述べる。\n` +
        `  意図して空にするなら --allow-empty を渡せ。`);
      e.code = 'EMPTY_EXPORT';
      e.existing = existing.length;
      throw e;
    }
  }
  fs.writeFileSync(outPath, JSON.stringify(lessons, null, 2));
  return lessons;
}

function collectLessons() {
  // kg.query returns nodes whose blob matches; we want type === 'lesson'
  const all = kg.query('');            // '' matches everything
  const lessons = all
    .filter(n => n.type === 'lesson')
    .map(n => {
      // A lesson body may carry a scope via "applies:<term>|check:<term>" or just the check.
      // Convention: body "check|applies" (pipe-separated) sets both; else body is the check.
      // Fail-safe: the spec may sit in the body (correct) or, for historical /
      // malformed nodes, in the label. Parse whichever carries it — an unparsed
      // "|applies:" would silently become a GLOBAL check and false-fire on
      // every unrelated creation.
      let label = n.label;
      const spec = [n.body, n.label].find(s => s && s.includes('|applies:'));
      let check = n.body || n.label, applies = null;
      if (spec) {
        const [c, a] = spec.split('|applies:');
        check = c.replace(/^check:/, '').trim(); applies = a.trim();
        if (label === spec) label = check;
      }
      // ── 教訓には二種類ある (憲法 第28条) ────────────────────────────
      // 「機構」の教訓はコードに実装として現れる(census.js を作った 等)。
      // 「規範」の教訓は行いの掟であり、**コードに文字列として現れようがない**
      // (「ブラウザを閉じよ」「遅れて届いた証拠にも従え」)。
      // 両者を同じ文字列照合で裁くと、規範は永久に赤を出す。実測すると
      // 30件中18件が規範で、赤くなかった16件は**偶然コードに単語が現れただけ**
      // だった。判定が働いていたのではなく、偶然に依存していた。
      const kindSpec = [n.body, n.label].find(s => s && /\|kind:/.test(s));
      let kind = null;
      if (kindSpec) {
        const m = kindSpec.match(/\|kind:([a-z-]+)/);
        if (m) {
          kind = m[1];
          check = check.replace(/\|kind:[a-z-]+/, '').trim();
          if (applies) applies = applies.replace(/\|kind:[a-z-]+/, '').trim();
        }
      }
      // 未宣言は 'mechanism' 扱い。既存の教訓の裁き方を変えないため（後方互換）。
      return { id: n.id, label, check, applies, kind: kind || 'mechanism', ts: n.ts };
    });
  return lessons;
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'export') {
    let out = DEFAULT_OUT, allowEmpty = false;
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === '--out') out = rest[++i];
      else if (rest[i] === '--allow-empty') allowEmpty = true;
    }
    let l;
    try { l = exportLessons(out, { allowEmpty }); }
    catch (e) {
      // **黙って空を書かない。** 教訓帳が消えれば断罪の門が盲になる (reflect C-2)。
      console.error(e.message);
      process.exit(1);
    }
    console.error(`exported ${l.length} lesson(s) -> ${out}`);
    console.log(JSON.stringify(l, null, 2));
  } else if (cmd === 'list') {
    const l = kg.query('').filter(n => n.type === 'lesson');
    if (!l.length) console.log('(no lessons yet)');
    else l.forEach(n => console.log(`- ${n.id}: ${n.label}${n.body ? ' — check: ' + n.body : ''}`));
  } else {
    console.error('commands: export [--out f] | list');
    process.exit(2);
  }
}
if (require.main === module) main();
module.exports = { exportLessons, collectLessons };
