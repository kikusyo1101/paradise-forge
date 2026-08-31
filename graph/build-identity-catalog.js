#!/usr/bin/env node
'use strict';
/**
 * build-identity-catalog.js — 視覚語彙カタログの鍛造
 *
 * Paradise は依存ゼロを憲法級の制約とする。だから外部の DESIGN.md 群を
 * 実行時に取りに行くことはしない。ここで一度だけ「語彙の索引」に圧縮し、
 * graph/identity/catalog.json として同梱する。
 *
 *   node graph/build-identity-catalog.js <srcDir> [--out graph/identity/catalog.json]
 *
 * srcDir には VoltAgent/awesome-design-md (MIT) の design-md/<name>/DESIGN.md を
 * <name>.md として平置きしたものを与える。
 *
 * 出力は「どんな見た目か」を選ぶための索引であって、原文の複製ではない。
 * 実装時に必要な細部は原典を参照する(帰属は catalog.json に埋める)。
 */
const fs = require('fs');
const path = require('path');

/** テック系SaaS/開発者ツールに偏った語彙。ここが「AIっぽさ」の温床。 */
const TECH_SAAS = new Set([
  'airtable', 'cal', 'claude', 'clickhouse', 'cohere', 'composio', 'cursor',
  'elevenlabs', 'expo', 'figma', 'framer', 'hashicorp', 'intercom', 'linear.app',
  'lovable', 'minimax', 'mintlify', 'miro', 'mistral.ai', 'mongodb', 'notion',
  'ollama', 'opencode.ai', 'posthog', 'raycast', 'replicate', 'resend',
  'runwayml', 'sanity', 'sentry', 'slack', 'supabase', 'superhuman',
  'together.ai', 'vercel', 'voltagent', 'warp', 'webflow', 'x.ai', 'zapier',
]);

/** テック系以外。AI が自力ではまず出さない語彙。 */
const FAMILY = {
  automotive: ['bmw', 'bmw-m', 'bugatti', 'ferrari', 'lamborghini', 'renault', 'tesla'],
  retro_hardware: ['dell-1996', 'hp', 'nintendo-2001', 'playstation'],
  consumer_brand: ['airbnb', 'nike', 'starbucks', 'shopify', 'spotify', 'uber', 'meta', 'pinterest'],
  finance: ['binance', 'coinbase', 'kraken', 'mastercard', 'revolut', 'wise', 'stripe'],
  editorial: ['theverge', 'wired'],
  enterprise: ['apple', 'ibm', 'nvidia', 'spacex', 'vodafone', 'clay'],
};
function familyOf(name) {
  for (const [fam, list] of Object.entries(FAMILY)) if (list.includes(name)) return fam;
  return TECH_SAAS.has(name) ? 'tech_saas' : 'other';
}

/** 素朴な YAML フロントマター読み(依存ゼロ。必要な最小限だけ拾う)。 */
function frontMatter(src) {
  if (!src.startsWith('---')) return null;
  const end = src.indexOf('\n---', 3);
  if (end < 0) return null;
  return src.slice(3, end);
}
function scalar(block, key) {
  const m = block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, '');
}
/** colors: ブロックから name -> value を拾う(インデント2の行のみ)。 */
function colorMap(block) {
  const out = {};
  const m = block.match(/^colors:\s*$([\s\S]*?)(?=^\S|\Z)/m);
  if (!m) return out;
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^\s{2}([\w-]+):\s*"?([^"#\n]*(?:#[0-9a-fA-F]{3,8})?[^"\n]*)"?\s*(?:#.*)?$/);
    if (!mm) continue;
    const v = mm[2].trim().replace(/^["']|["']$/g, '');
    if (v) out[mm[1]] = v;
  }
  return out;
}
function fontFamilies(src) {
  const set = new Set();
  for (const m of src.matchAll(/fontFamily:\s*"?([^"\n,]+)"?/g)) set.add(m[1].trim());
  return [...set].slice(0, 6);
}

/** 散文型(フロントマター無し)から見出し語と色を救出する。 */
function fromProse(src) {
  const hexes = [...src.matchAll(/#[0-9a-fA-F]{6}\b/g)].map(m => m[0]);
  const freq = new Map();
  for (const h of hexes) freq.set(h.toLowerCase(), (freq.get(h.toLowerCase()) || 0) + 1);
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e[0]);
  const theme = (src.match(/^##\s*1\.[^\n]*\n+([\s\S]{0,600})/m) || [, ''])[1]
    .replace(/\s+/g, ' ').trim();
  return { colors: top, description: theme.slice(0, 400) };
}

/** 見た目の「気配」を語彙化する。司祭が selection するときの検索キー。 */
const TRAIT_RULES = [
  [/beveled|bevel|chrome|metallic|brushed|faceplate|halftone|Y2K|skeuomorph/i, 'skeuomorphic-chrome'],
  [/serif|editorial|magazine|journalis|typographic|broadsheet/i, 'editorial-serif'],
  [/brutal|raw|stark|uncompromis|industrial/i, 'brutalist'],
  [/warm|parchment|cream|terracotta|earthy|organic|hand-drawn/i, 'warm-organic'],
  [/neon|glow|cyber|futuris|iridesc|holograph/i, 'neon-futurist'],
  [/monospace|terminal|command-line|code-first/i, 'terminal'],
  [/gradient/i, 'gradient-led'],
  [/racing|motorsport|performance|speed|carbon.fib/i, 'motorsport'],
  [/luxur|premium|couture|craft|hand-?built/i, 'luxury'],
  [/playful|friendly|rounded|whimsic|bright/i, 'playful'],
  [/minimal|restrain|austere|gallery|white space/i, 'minimal'],
  [/dark|black canvas|void|midnight/i, 'dark-canvas'],
  [/pastel|soft|muted/i, 'soft-pastel'],
  [/geometric|grid|swiss|systematic/i, 'swiss-grid'],
];
function traitsOf(text) {
  const t = new Set();
  for (const [re, tag] of TRAIT_RULES) if (re.test(text)) t.add(tag);
  return [...t];
}

/**
 * trait は「その語彙を他と区別する印」でなければ意味がない。
 * 本文全体を舐めると単語が一度出ただけで付き、74件中71件が同じ trait を
 * 持つような無力な索引になる(実測で確認済み)。だから
 *  (a) 判定は description(要約)に限定し、
 *  (b) 全体の 55% を超えて出現した trait は識別力なしとして捨てる。
 */
const TRAIT_UBIQUITY_LIMIT = 0.55;
function pruneUbiquitousTraits(entries) {
  const n = entries.length;
  const freq = new Map();
  for (const e of entries) for (const t of e.traits) freq.set(t, (freq.get(t) || 0) + 1);
  const dropped = [...freq.entries()].filter(([, c]) => c / n > TRAIT_UBIQUITY_LIMIT).map(([t]) => t);
  const drop = new Set(dropped);
  for (const e of entries) e.traits = e.traits.filter(t => !drop.has(t));
  return dropped;
}

function build(srcDir) {
  const entries = [];
  for (const f of fs.readdirSync(srcDir).filter(x => x.endsWith('.md')).sort()) {
    const name = f.replace(/\.md$/, '');
    const src = fs.readFileSync(path.join(srcDir, f), 'utf8');
    if (src.length < 500) continue; // 404 などの残骸は取らない
    const fm = frontMatter(src);
    let description, colors, fonts, format;
    if (fm) {
      format = 'design.md';
      description = (scalar(fm, 'description') || '').slice(0, 400);
      colors = colorMap(fm);
      fonts = fontFamilies(fm);
    } else {
      format = 'prose';
      const p = fromProse(src);
      description = p.description;
      colors = Object.fromEntries(p.colors.map((c, i) => [`c${i + 1}`, c]));
      fonts = [...new Set([...src.matchAll(/\*\*(?:Primary|Headline|Body[^:]*)\*\*:\s*`?([^`\n,(]+)/g)]
        .map(m => m[1].trim()))].slice(0, 4);
    }
    // trait は description(その語彙の要約)だけで判定する。本文全体を
    // 舐めると識別力を失うことを実測で確認したため(pruneUbiquitousTraits 参照)。
    const traits = traitsOf(description);
    entries.push({
      id: name,
      family: familyOf(name),
      format,
      traits,
      description,
      palette: Object.entries(colors).slice(0, 10).map(([k, v]) => ({ role: k, value: v })),
      fonts,
      source: `https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/${name}/DESIGN.md`,
    });
  }
  const droppedTraits = pruneUbiquitousTraits(entries);
  const byFamily = {};
  for (const e of entries) byFamily[e.family] = (byFamily[e.family] || 0) + 1;
  return {
    version: 1,
    generated_from: 'VoltAgent/awesome-design-md',
    license: 'MIT',
    attribution: 'Visual vocabulary distilled from VoltAgent/awesome-design-md (MIT). ' +
                 'Format follows google-labs-code/design.md (Apache-2.0).',
    note: 'This is an INDEX for choosing a visual direction, not a copy of the sources. ' +
          'Paradise creations stay dependency-free: nothing here is fetched at build time.',
    counts: { total: entries.length, by_family: byFamily },
    dropped_traits: droppedTraits,
    entries,
  };
}

if (require.main === module) {
  const src = process.argv[2];
  const oi = process.argv.indexOf('--out');
  const out = oi > 0 ? process.argv[oi + 1] : path.join(__dirname, 'identity', 'catalog.json');
  if (!src) { console.error('usage: build-identity-catalog.js <srcDir> [--out file]'); process.exit(2); }
  const cat = build(src);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(cat, null, 2));
  console.log(`catalog -> ${out}  (${cat.counts.total} entries)`);
  console.log('by family:', JSON.stringify(cat.counts.by_family));
}
module.exports = { build, familyOf, traitsOf };
