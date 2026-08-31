#!/usr/bin/env node
'use strict';
/**
 * codex.js — 憲法を索引で運び、本文は条単位で引く (憲法 第33条)
 *
 * 実測: 毎セッション常時読み込まれる散文は 54,349 B ≈ 21,700 tok。
 * その **58.5% (31,773 B) が CONSTITUTION.md 単体**である。しかも条は
 * 増え続け、後期9条(23-31)の平均は初期9条(1-9)の 8.9 倍に膨らんでいる。
 * 憲法は育つほど、憲法を読むためのコストが仕事を圧迫する。
 *
 * だが憲法を削ってはならない。条文は判断の根拠であって装飾ではない。
 * 削るべきは **常時運ぶ量** であって、**引ける量** ではない。
 *
 * ゆえに二層にする:
 *   - 索引 (CONSTITUTION.INDEX.md) … 条番号 + 一行の題。常時載せる。
 *   - 本文 (CONSTITUTION.md)       … 必要な条だけ、その場で引く。
 *
 * これは Anthropic の言う just-in-time retrieval そのものである。
 * 識別子(条番号)だけを保持し、実体は要るときに読む。
 *
 *   node graph/codex.js index            # 索引を標準出力へ
 *   node graph/codex.js index --write    # CONSTITUTION.INDEX.md を建て直す
 *   node graph/codex.js article 26       # 第26条の本文だけを引く
 *   node graph/codex.js article 26 30    # 複数条をまとめて引く
 *   node graph/codex.js check            # 索引が本文と一致しているか (exit 1 で不一致)
 *   node graph/codex.js weigh            # 条ごとのバイト数と削減率
 *
 * 「憲法は索引で運ばれ、条文で引かれる。」
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'CONSTITUTION.md');
const INDEX = path.join(ROOT, 'CONSTITUTION.INDEX.md');

/**
 * 条の開始行。`26. **題名.** 本文…` の形。
 *
 * ⚠️ 題は行をまたぐことがある (第26条は `**Parallelism is a property of the
 * work, not a capacity of the runtime —` で改行し、次行で `**` を閉じる)。
 * 同一行で `**` の対を要求すると **その条を静かに取りこぼし**、索引は
 * 「一致」と報告しながら一条足りない — 門が自分について嘘をつく。
 * ゆえに開始の判定は `N. **` までとし、題は複数行から組み立てる。
 */
const ARTICLE_RE = /^(\d+)\. \*\*/;

/** 開始行から題を取り出す。`**` が閉じるまで行を継いで読む。 */
function titleAt(lines, i) {
  let buf = lines[i].replace(/^\d+\. \*\*/, '');
  let j = i;
  while (!buf.includes('**') && j + 1 < lines.length && j - i < 5) {
    buf += ' ' + lines[++j].trim();
  }
  const end = buf.indexOf('**');
  const raw = (end >= 0 ? buf.slice(0, end) : buf).trim();
  return raw.replace(/\.$/, '').replace(/\s+/g, ' ');
}

/**
 * 憲法を条に切り分ける。
 * @returns {Array<{n:number, title:string, body:string, bytes:number, line:number}>}
 */
function parse(file) {
  const src = file || SOURCE;
  if (!fs.existsSync(src)) return [];
  const lines = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n').split('\n');

  const starts = [];
  lines.forEach((l, i) => {
    const m = l.match(ARTICLE_RE);
    if (m) starts.push({ n: Number(m[1]), title: titleAt(lines, i), line: i });
  });

  // 条の終わりは「次の条の開始」か「Articles 節の終わり(次の ## 見出し)」。
  const endOfArticles = lines.findIndex((l, i) =>
    /^## /.test(l) && starts.length > 0 && i > starts[0].line);

  return starts.map((s, idx) => {
    const next = starts[idx + 1] ? starts[idx + 1].line
      : (endOfArticles > s.line ? endOfArticles : lines.length);
    const body = lines.slice(s.line, next).join('\n').replace(/\s+$/, '');
    return { n: s.n, title: s.title, body, bytes: Buffer.byteLength(body, 'utf8'), line: s.line + 1 };
  });
}

/** 索引の本文を組み立てる。**これが生成物の唯一の定義**。 */
function renderIndex(articles) {
  const list = articles || parse();
  const total = list.reduce((a, x) => a + x.bytes, 0);
  const out = [];
  out.push('# 憲法 索引 — CONSTITUTION.INDEX.md');
  out.push('');
  out.push('> **生成物。手で編集しない** (第29条)。`node graph/codex.js index --write` が建てる。');
  out.push('>');
  out.push('> 常時運ぶのはこの索引だけでよい。**条文が要るときは引く**:');
  out.push('> `node graph/codex.js article <番号>`');
  out.push('');
  out.push(`全 ${list.length} 条 / 本文 ${total.toLocaleString()} B / 索引はその約 ${Math.round(100 - (Buffer.byteLength(out.join('\n'), 'utf8') + list.length * 90) / total * 100)}% 減`);
  out.push('');
  out.push('| 条 | 題 | B |');
  out.push('|---:|---|---:|');
  for (const a of list) {
    out.push(`| ${a.n} | ${a.title.replace(/\|/g, '\\|')} | ${a.bytes} |`);
  }
  out.push('');
  return out.join('\n') + '\n';
}

/** 索引が本文と一致しているか。ズレていれば理由を返す。 */
function check() {
  const articles = parse();
  if (!articles.length) return { ok: true, skipped: true, reason: 'CONSTITUTION.md が無い' };
  if (!fs.existsSync(INDEX)) {
    return { ok: false, drift: ['索引が存在しない'], articles: articles.length };
  }
  const want = renderIndex(articles);
  const have = fs.readFileSync(INDEX, 'utf8').replace(/\r\n/g, '\n');
  if (have === want) return { ok: true, articles: articles.length };

  // 何がズレたかを名指しする。「違う」だけの報告は直せない。
  const drift = [];
  const idxNums = [...have.matchAll(/^\| (\d+) \|/gm)].map(m => Number(m[1]));
  const srcNums = articles.map(a => a.n);
  for (const n of srcNums) if (!idxNums.includes(n)) drift.push(`第${n}条が索引に無い`);
  for (const n of idxNums) if (!srcNums.includes(n)) drift.push(`第${n}条は索引にあるが本文に無い`);
  for (const a of articles) {
    const row = have.match(new RegExp(`^\\| ${a.n} \\| (.+?) \\| (\\d+) \\|$`, 'm'));
    if (row && row[1] !== a.title.replace(/\|/g, '\\|')) drift.push(`第${a.n}条の題がズレている`);
    else if (row && Number(row[2]) !== a.bytes) drift.push(`第${a.n}条のバイト数がズレている (索引 ${row[2]} / 実測 ${a.bytes})`);
  }
  if (!drift.length) drift.push('索引が本文から再生成した結果と一致しない');
  return { ok: false, drift, articles: articles.length };
}

/** 条を引く。**索引しか持たない者が本文に到達する唯一の道**。 */
function article(...nums) {
  const want = nums.map(Number);
  const found = parse().filter(a => want.includes(a.n));
  return found;
}

/** 条ごとの重さ。どこが膨らんでいるかを数で示す。 */
function weigh() {
  const list = parse();
  const total = list.reduce((a, x) => a + x.bytes, 0);
  const idxBytes = Buffer.byteLength(renderIndex(list), 'utf8');
  return {
    articles: list.length,
    bodyBytes: total,
    indexBytes: idxBytes,
    savedBytes: total - idxBytes,
    savedPct: total ? Math.round((total - idxBytes) / total * 1000) / 10 : 0,
    heaviest: [...list].sort((a, b) => b.bytes - a.bytes).slice(0, 8)
      .map(a => ({ n: a.n, bytes: a.bytes, title: a.title })),
  };
}

function write() {
  const body = renderIndex();
  fs.writeFileSync(INDEX, body);
  return { written: INDEX, bytes: Buffer.byteLength(body, 'utf8') };
}

// ── CLI ──────────────────────────────────────────────────────────────
if (require.main === module) {
  const [verb, ...rest] = process.argv.slice(2);

  if (verb === 'index') {
    if (rest.includes('--write')) {
      const r = write();
      console.log(`✍️  ${path.relative(ROOT, r.written)} を建てた (${r.bytes} B)`);
    } else {
      process.stdout.write(renderIndex());
    }

  } else if (verb === 'article') {
    const nums = rest.filter(x => /^\d+$/.test(x));
    if (!nums.length) { console.error('条番号を与えよ: node graph/codex.js article 26'); process.exit(1); }
    const found = article(...nums);
    const missing = nums.map(Number).filter(n => !found.some(a => a.n === n));
    for (const a of found) { console.log(a.body); console.log(); }
    if (missing.length) { console.error(`🔴 存在しない条: ${missing.join(', ')}`); process.exit(1); }

  } else if (verb === 'check') {
    const r = check();
    console.log('═══════ 📖 CODEX CHECK ═══════');
    if (r.skipped) { console.log('  · CONSTITUTION.md が無いので飛ばす'); console.log('══════════════════════════════'); process.exit(0); }
    if (r.ok) {
      console.log(`  ✓ 索引は本文と一致している (${r.articles} 条)`);
      console.log('══════════════════════════════');
      process.exit(0);
    }
    for (const d of r.drift) console.log(`  🔴 ${d}`);
    console.log('       → node graph/codex.js index --write');
    console.log('══════════════════════════════');
    process.exit(1);

  } else if (verb === 'weigh') {
    const w = weigh();
    console.log('═══════ ⚖️  CODEX WEIGH ═══════');
    console.log(`  条数        : ${w.articles}`);
    console.log(`  本文        : ${w.bodyBytes.toLocaleString()} B`);
    console.log(`  索引        : ${w.indexBytes.toLocaleString()} B`);
    console.log(`  削減        : ${w.savedBytes.toLocaleString()} B (${w.savedPct}%)`);
    console.log('  ─── 重い条 ───');
    for (const a of w.heaviest) console.log(`   第${String(a.n).padStart(2)}条 ${String(a.bytes).padStart(5)} B  ${a.title}`);
    console.log('══════════════════════════════');

  } else {
    console.log('usage: codex.js index [--write] | article <n...> | check | weigh');
    process.exit(1);
  }
}

module.exports = { parse, renderIndex, check, article, weigh, write, SOURCE, INDEX, ARTICLE_RE };
