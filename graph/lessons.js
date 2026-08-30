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

function exportLessons(outPath) {
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
      return { id: n.id, label, check, applies, ts: n.ts };
    });
  fs.writeFileSync(outPath, JSON.stringify(lessons, null, 2));
  return lessons;
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'export') {
    let out = DEFAULT_OUT;
    for (let i = 0; i < rest.length; i++) if (rest[i] === '--out') out = rest[++i];
    const l = exportLessons(out);
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
module.exports = { exportLessons };
