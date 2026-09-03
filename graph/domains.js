#!/usr/bin/env node
'use strict';
/**
 * domains.js — 役者が担える分野を裁く (憲法 第52条 / 第49条の一般化)
 *
 * 実測が名指しした穴: 15の願いのうち **14件(93.3%)** が既定の `standard` へ
 * 黙って落ちた。落ちた先の10名は**全員実在する**ので `check-agents.js` は緑を出す。
 * 「音楽を作れ」は standard へ落ち、実在する `architect` が build 相を担う。
 * **名前は全部埋まっているので門は一切鳴らない。**
 *
 * **agent の実在では足りない。必要なのは分野(domain)の適合である。**
 *
 * `check-agents` は「名指しされた者が居るか」を問い、この engine は
 * 「居る者が何を担えるか」を問う。**同じ入力に二つの門が違う答えを出すことが
 * 正しい** —— 「実在」と「適合」は別の問いである(第36条: 門は消すのではなく分ける)。
 *
 *   node graph/domains.js check              全員が宣言を持つか (exit 1 = 欠けた名を列挙)
 *   node graph/domains.js classify "<願い>"  分野判定の単体確認
 *   node graph/domains.js list               台帳の一覧
 *
 * 判定は語彙の正規表現であって分類器ではない。語彙に無い言い回しは
 * `分野を判定できない`(exit 1)へ落ちる —— **判定不能は緑ではない(第16条)。**
 * 台帳は `ordain.js` が育てる前提である。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LEDGER = path.join(__dirname, 'domains.json');

function load() {
  const raw = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  return { domains: raw.domains || {}, agents: raw.agents || {} };
}

/**
 * 分野ごとの正規表現。**日本語(境界なし)と英語(境界あり)に分ける** —
 * `\b` は「単語構成文字と非構成文字の境目」であり日本語は全て非構成文字として
 * 扱われるので、`\b(音楽)\b` は日本語文中で事実上決して一致しない。
 * この誤りは既に forge の quick/full 判定に埋まっていた実測済みの教訓である。
 */
function reFor(spec) {
  const parts = [];
  if (spec.ja_re) parts.push(spec.ja_re);
  if (spec.en_re) parts.push(spec.en_re);
  return parts.length ? new RegExp(parts.join('|'), 'i') : null;
}

/**
 * 願いを分野に写す。写せなければ **null**(判定不能)。
 * 複数当たったときは台帳の宣言順で最初のものを採る —— 順序が決定性を与える。
 * `all` に全候補を残すので、呼び手は必要なら別の裁き方ができる。
 */
function classify(wish, led) {
  const L = led || load();
  const hits = [];
  for (const [id, spec] of Object.entries(L.domains)) {
    const re = reFor(spec);
    if (re && re.test(wish)) hits.push({ id, ja: spec.ja });
  }
  if (!hits.length) return null;
  return { ...hits[0], all: hits };
}

/** その役者はその分野を担うと宣言しているか。 */
function serves(agent, domainId, led) {
  const L = led || load();
  const list = L.agents[agent];
  return Array.isArray(list) && list.includes(domainId);
}

/** その役者が宣言している分野。宣言が無ければ null(空配列と区別する)。 */
function domainsOf(agent, led) {
  const L = led || load();
  const list = L.agents[agent];
  return Array.isArray(list) ? list : null;
}

/**
 * 門: forge の全ての道が名指しする役者が、一人残らず分野宣言を持つか。
 *
 * **`check-agents` の PSEUDO 免除に従う** — `verification-loop` は実体を持たない
 * 疑似 agent であり、既存の免除規則を二つ書かない(第41条)。
 */
function check() {
  const L = load();
  const forge = require('./forge.js');
  const { PSEUDO } = require('./check-agents.js');

  const named = new Set();
  for (const scale of Object.keys(forge.SCALES)) {
    for (const t of forge.SCALES[scale]('<wish>')) if (t.agent) named.add(t.agent);
  }
  // 位階の宣言からも拾う。道に載らぬ神官が台帳から漏れるのを防ぐ。
  try {
    const clergy = require('./clergy.js');
    for (const c of Object.values(clergy.COLLEGE)) for (const p of (c.priests || [])) named.add(p);
    for (const o of (clergy.TRIBUNAL.officers || [])) named.add(o);
  } catch {}

  const need = [...named].filter(a => !PSEUDO.has(a)).sort();
  const missing = need.filter(a => !Array.isArray(L.agents[a]) || !L.agents[a].length);
  // 台帳が知らない分野を名乗る役者も裁く — 綴り違いは静かな穴になる
  const unknownDomains = [];
  for (const [a, list] of Object.entries(L.agents)) {
    for (const d of (list || [])) if (!L.domains[d]) unknownDomains.push({ agent: a, domain: d });
  }
  return {
    ok: missing.length === 0 && unknownDomains.length === 0,
    need, missing, unknownDomains,
    domainCount: Object.keys(L.domains).length,
    declared: Object.keys(L.agents).length,
  };
}

// ── CLI ───────────────────────────────────────────────────────────────
function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const json = rest.includes('--json') || process.argv.includes('--json');

  if (cmd === 'check') {
    const r = check();
    if (json) { console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1); }
    console.log('═══ 🎭 DOMAINS — 役者は何を担えるか (第52条) ═══');
    console.log(`  分野 ${r.domainCount} / 宣言を持つ役者 ${r.declared} / 道が名指しする役者 ${r.need.length}`);
    for (const a of r.missing) {
      console.log(`  🔴 ${a}: 分野宣言が無い — 道に載っているのに何を担えるか誰も知らない`);
      console.log(`       node graph/ordain.js enlist --name ${a} --domain <分野> --write`);
    }
    for (const u of r.unknownDomains) {
      console.log(`  🔴 ${u.agent} が台帳に無い分野 "${u.domain}" を名乗っている — 綴りを確かめよ`);
    }
    console.log(r.ok
      ? '  ✓ 道が名指しする役者は全員、担える分野を宣言している'
      : '  🔴 実在は満たされていても、適合が宣言されていない (第52条)');
    console.log('════════════════════════════════════════════════');
    process.exit(r.ok ? 0 : 1);
  }

  if (cmd === 'classify') {
    const wish = rest.filter(a => a !== '--json').join(' ').trim();
    if (!wish) { console.error('usage: domains.js classify "<願い>"'); process.exit(2); }
    const d = classify(wish);
    if (!d) {
      console.log('分野を判定できない — 台帳の語彙にこの願いを写す言葉が無い');
      console.log('  語彙を育てるか、鍛造器で担い手を建てよ: node graph/ordain.js forge --help');
      process.exit(1);
    }
    if (json) { console.log(JSON.stringify(d)); process.exit(0); }
    console.log(`${d.id}  (${d.ja})`);
    if (d.all.length > 1) console.log(`  他の候補: ${d.all.slice(1).map(x => x.id).join(', ')}`);
    process.exit(0);
  }

  if (cmd === 'list') {
    const L = load();
    if (json) { console.log(JSON.stringify(L, null, 2)); return; }
    console.log('═══ 🎭 DOMAINS — 分野の台帳 ═══');
    for (const [id, spec] of Object.entries(L.domains)) {
      const who = Object.entries(L.agents).filter(([, v]) => (v || []).includes(id)).map(([k]) => k);
      console.log(`  ${id.padEnd(12)} ${spec.ja.padEnd(14)} 担い手 ${who.length}: ${who.join(', ') || '—'}`);
    }
    console.log('────────────────────────────────');
    for (const [a, list] of Object.entries(L.agents)) console.log(`  ${a.padEnd(22)} ${(list || []).join(', ')}`);
    console.log('════════════════════════════════');
    return;
  }

  console.error('commands: check [--json] | classify "<願い>" [--json] | list [--json]');
  process.exit(2);
}
if (require.main === module) main();
module.exports = { load, classify, serves, domainsOf, check, LEDGER };
