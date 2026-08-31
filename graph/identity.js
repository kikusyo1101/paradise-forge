#!/usr/bin/env node
'use strict';
/**
 * identity.js — 視覚アイデンティティの選定 (憲法 第17条)
 *
 * 「AI が作ると見た目が似通う」のは AI の癖ではなく、参照できる語彙が
 * テック系SaaSに偏っていることの帰結である。だからこの engine は
 *  (1) 非テック系を既定にし、
 *  (2) 直近に使った語彙・family・trait の再使用を禁じ、
 *  (3) 選んだ理由と却下した候補を記録に残す。
 * 選定は決定的(seed=創造物名)で、同じ wish からは同じ答えが再現する。
 *
 *   identity.js suggest "<wish>" --slug <name> [--history f] [--n 3]
 *   identity.js pick    "<wish>" --slug <name> [--history f]   # 単一の裁定
 *   identity.js record  <slug> <catalogId> [--history f]       # 採用を刻む
 *   identity.js history [--history f]
 *   identity.js families
 *
 * 履歴の既定は graph/identity/history.json。
 */
const fs = require('fs');
const path = require('path');

const CATALOG = path.join(__dirname, 'identity', 'catalog.json');
const HISTORY = path.join(__dirname, 'identity', 'history.json');

/** 直近この件数に採用された語彙・familyは再使用しない(反復の禁令)。 */
const RECENT_ID_BAN = 12;   // 同じ語彙そのもの
const RECENT_FAMILY_BAN = 2; // 同じ family の連続
const TECH_SAAS_PENALTY = 40; // テック系は既定にしない

function loadCatalog(p = CATALOG) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function loadHistory(p = HISTORY) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return { picks: [] }; }
}
function saveHistory(h, p = HISTORY) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(h, null, 2));
}

/** 決定的ハッシュ(seedから安定した順序を作る。乱数は使わない)。 */
function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/** wish から求められている気配を読む。控えめな手がかりで足りる。 */
const WISH_TRAITS = [
  [/習慣|healt|health|日課|継続|routine|habit|記録|track/i, ['warm-organic', 'editorial-serif', 'soft-pastel']],
  [/ゲーム|game|遊|play|じゃんけん|くじ|coin/i, ['playful', 'skeuomorphic-chrome', 'neon-futurist']],
  [/時間|timer|pomodoro|集中|focus/i, ['minimal', 'swiss-grid', 'terminal']],
  [/金|money|価格|投資|finance|budget|家計/i, ['swiss-grid', 'luxury', 'dark-canvas']],
  [/文章|note|書|read|blog|記事|memo/i, ['editorial-serif', 'minimal', 'warm-organic']],
  [/開発|code|dev|terminal|ログ|log|api/i, ['terminal', 'brutalist']],
  [/速度|車|走|speed|race/i, ['motorsport', 'luxury']],
];
function wishTraits(wish) {
  const out = new Set();
  for (const [re, tags] of WISH_TRAITS) if (re.test(wish)) tags.forEach(t => out.add(t));
  return [...out];
}

/**
 * 候補を採点する。低いほど良い(=順位が上)。
 * 反復の禁令は「加点(=不利)」として効かせ、候補が尽きる事故を避ける。
 */
function score(entry, ctx) {
  let s = 0;
  const { recentIds, recentFamilies, wanted, seed } = ctx;

  // (1) 反復の禁令 — 直近の語彙と family を強く不利にする
  const idx = recentIds.indexOf(entry.id);
  if (idx >= 0) s += 1000 - idx * 10;                      // 直近ほど重い
  if (recentFamilies.includes(entry.family)) s += 250;

  // (2) テック系SaaSは既定にしない(禁止ではなく、既定から降ろす)
  if (entry.family === 'tech_saas') s += TECH_SAAS_PENALTY;

  // (3) wish が求める気配に近いものを引き上げる
  const hit = entry.traits.filter(t => wanted.includes(t)).length;
  s -= hit * 60;

  // (4) 語彙として痩せているものは避ける(色が少ない=実装時に迷う)
  if (entry.palette.length < 4) s += 30;

  // (5) 同点を決定的にほぐす
  s += (hash(seed + '|' + entry.id) % 25);
  return s;
}

function suggest(wish, slug, opts = {}) {
  const cat = loadCatalog(opts.catalog);
  const hist = loadHistory(opts.history);
  const picks = hist.picks || [];
  const recentIds = picks.slice(-RECENT_ID_BAN).map(p => p.id).reverse();
  const recentFamilies = picks.slice(-RECENT_FAMILY_BAN).map(p => p.family);
  const wanted = wishTraits(wish);
  const ctx = { recentIds, recentFamilies, wanted, seed: slug || wish };

  const ranked = cat.entries
    .map(e => ({ e, s: score(e, ctx) }))
    .sort((a, b) => a.s - b.s);

  // 多様性は確率でなく構造で担保する。候補は family を重複させない。
  // 同じ family から3つ並べても「選択肢」ではなく、司祭は結局いつもの
  // 見た目に落ちる。さらに tech_saas は候補全体で高々1枠に制限する。
  const n = opts.n || 3;
  const picked = [];
  const usedFamilies = new Set();
  let techSlots = 1;
  for (const pass of [1, 2]) {
    for (const r of ranked) {
      if (picked.length >= n) break;
      if (picked.includes(r)) continue;
      if (pass === 1) {
        if (usedFamilies.has(r.e.family)) continue;
        if (r.e.family === 'tech_saas' && techSlots <= 0) continue;
      }
      if (r.e.family === 'tech_saas') { if (techSlots <= 0) continue; techSlots--; }
      picked.push(r); usedFamilies.add(r.e.family);
    }
  }
  const chosen = picked.slice(0, n).map(({ e, s }) => ({
    id: e.id, family: e.family, traits: e.traits, score: s,
    description: e.description, palette: e.palette, fonts: e.fonts, source: e.source,
  }));
  return {
    wish, slug,
    wanted_traits: wanted,
    avoided: { recent_ids: recentIds.slice(0, 6), recent_families: recentFamilies },
    rule: `candidates never repeat a family; tech_saas gets at most 1 slot (+${TECH_SAAS_PENALTY} penalty); ` +
          `the last ${RECENT_ID_BAN} ids and last ${RECENT_FAMILY_BAN} families are pushed down`,
    candidates: chosen,
    rejected_head: ranked.filter(r => !picked.includes(r)).slice(0, 4)
      .map(({ e, s }) => ({ id: e.id, family: e.family, score: s })),
  };
}

function record(slug, id, opts = {}) {
  const cat = loadCatalog(opts.catalog);
  const e = cat.entries.find(x => x.id === id);
  if (!e) throw new Error('unknown catalog id: ' + id);
  const hist = loadHistory(opts.history);
  hist.picks = hist.picks || [];
  hist.picks.push({ slug, id: e.id, family: e.family, traits: e.traits, ts: new Date().toISOString() });
  saveHistory(hist, opts.history || HISTORY);
  return { ok: true, recorded: { slug, id: e.id, family: e.family } };
}

// ─── CLI ───
if (require.main === module) {
  const a = process.argv.slice(2);
  const cmd = a[0];
  const flag = k => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : undefined; };
  const opts = { history: flag('--history'), catalog: flag('--catalog'), n: Number(flag('--n')) || undefined };
  try {
    if (cmd === 'suggest' || cmd === 'pick') {
      const wish = a[1];
      if (!wish) throw new Error('need a wish');
      const res = suggest(wish, flag('--slug') || 'unnamed', { ...opts, n: cmd === 'pick' ? 1 : opts.n });
      console.log(JSON.stringify(res, null, 2));
    } else if (cmd === 'record') {
      console.log(JSON.stringify(record(a[1], a[2], opts), null, 2));
    } else if (cmd === 'history') {
      console.log(JSON.stringify(loadHistory(opts.history), null, 2));
    } else if (cmd === 'families') {
      console.log(JSON.stringify(loadCatalog(opts.catalog).counts, null, 2));
    } else {
      console.error('commands: suggest "<wish>" --slug s | pick "<wish>" --slug s | record <slug> <id> | history | families');
      process.exit(2);
    }
  } catch (err) { console.error('ERROR: ' + err.message); process.exit(1); }
}

module.exports = { suggest, record, loadCatalog, loadHistory, wishTraits, score, hash,
                   RECENT_ID_BAN, RECENT_FAMILY_BAN, TECH_SAAS_PENALTY };
