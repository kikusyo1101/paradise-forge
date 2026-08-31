#!/usr/bin/env node
'use strict';
/**
 * visual-verify.js — 見た目を「実測」で裁く (憲法 第18条)
 *
 * Paradise はバックエンドを 479 のアサーションで裁く一方、見た目は
 * 「identity.md が在るか」しか見ていなかった。宣言と実装が食い違っても
 * 誰も気づかない — putty-cream と書いて真っ黒に実装しても通ってしまう。
 * この engine は宣言を実装と突き合わせ、目視でなく数値で欠陥を挙げる。
 *
 *   visual-verify.js check <creationDir> [--json]
 *
 * 検査:
 *   1. identity-honoured   — identity.md が挙げる色が実装に本当に在るか
 *   2. contrast-aa         — 本文/主要面のコントラストが WCAG AA (4.5:1) を満たすか
 *   3. no-default-palette  — 既定の開発者ツール配色へ落ちていないか
 *   4. states-covered      — 空・読み込み・エラーの状態が実装されているか
 *   5. responsive-declared — 画面幅への対応が宣言されているか
 *   6. focus-visible       — キーボード焦点が視認できるか
 *   7. touch-target        — 触れる的が小さすぎないか
 *   8. motion-respected    — 動きを減らす設定を尊重しているか
 *
 * 依存ゼロ。ブラウザを起動せず、CSS/HTML を静的に解く。
 * 目視の代わりではなく、目視の前に潰せるものを潰すための門。
 */
const fs = require('fs');
const path = require('path');

// ─── 色 ───
function parseHex(h) {
  const s = h.replace('#', '').trim();
  const f = s.length === 3 ? s.split('').map(c => c + c).join('') : s.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(f)) return null;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
}
/** WCAG 2.x の相対輝度。sRGB のガンマを戻してから重み付けする。 */
function luminance(rgb) {
  const [r, g, b] = rgb.map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(fg, bg) {
  const a = luminance(fg), b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// ─── CSS カスタムプロパティの解決 ───
/**
 * :root / [data-theme=...] / @media(prefers-color-scheme) の各ブロックから
 * トークンを集める。テーマごとに別々の表を返す — ライトだけ壊れている、
 * という事故が実際に起きるため、テーマを混ぜて評価してはならない。
 */
function extractThemes(css) {
  const themes = { light: {}, dark: {} };
  // CSS コメントはセレクタの直前に置かれることが多く、残したままだと
  // セレクタ文字列が「コメント + :root」になり `^:root` の判定を外す。
  // 実際にそれで 25 個のトークンを持つ :root ブロックを丸ごと捨てていた。
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = blockRe.exec(clean))) {
    const sel = m[1].trim();
    const body = m[2];
    if (!/--[\w-]+\s*:/.test(body)) continue;
    const vars = {};
    // 末尾のセミコロンは CSS では省略できる。`;` を必須にすると
    // ブロック最後の宣言を丸ごと取りこぼす — 実際にそれで --fg を
    // 見失い、1.92:1 の欠陥を見逃した。
    for (const v of body.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)(?:;|$)/g)) {
      const val = v[2].trim();
      if (val) vars[v[1]] = val;
    }
    const isDark = /data-theme\s*=\s*["']?dark/.test(sel) || /prefers-color-scheme:\s*dark/.test(clean.slice(Math.max(0, m.index - 200), m.index));
    const isLight = /data-theme\s*=\s*["']?light/.test(sel);
    const isRoot = /(^|,|\s):root\b/.test(sel);
    // 同じセレクタは何度でも現れる(:root が @media 内にも書かれる)。
    // 後から来たブロックで前を「置き換える」と、最初の :root に書かれた
    // --level-* のような主要トークンが丸ごと消える。既存の値は保ち、上書きだけ許す。
    const merge = (target) => { for (const [k, v] of Object.entries(vars)) target[k] = v; };
    if (isDark) merge(themes.dark);
    else if (isLight) merge(themes.light);
    else if (isRoot) merge(themes.light);
  }
  // dark が空なら light を引き継ぐ(単一テーマの創造物)
  if (!Object.keys(themes.dark).length) themes.dark = { ...themes.light };
  else themes.dark = { ...themes.light, ...themes.dark };
  return themes;
}
/** var(--a, fallback) を辿って実色に落とす。循環は打ち切る。 */
function resolveColor(value, table, depth = 0) {
  if (!value || depth > 8) return null;
  const v = String(value).trim();
  const direct = v.match(/#[0-9a-fA-F]{3,8}\b/);
  if (direct && !v.startsWith('var(')) return parseHex(direct[0]);
  const ref = v.match(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/);
  if (ref) {
    const next = table[ref[1]];
    if (next !== undefined) return resolveColor(next, table, depth + 1);
    if (ref[2]) return resolveColor(ref[2], table, depth + 1);
    return null;
  }
  if (direct) return parseHex(direct[0]);
  return null;
}

/** 前景/背景としてありそうなトークン名。命名は創造物ごとに違うので広めに拾う。 */
// `--on-signal` のような「特定の面の上に乗る色」は、その面と対で評価すべきで
// あって主背景と比べても無意味(白ボタン文字を紙の地と比べて落とすのは誤検出)。
// on-<surface> は対応する --<surface> を相手に測る。
const FG_HINTS = /^--(fg|text|ink|foreground|body)(-|$)/;
const ON_SURFACE = /^--on-([\w-]+)$/;
const BG_HINTS = /^--(bg|background|canvas|surface|paper|panel|card)(-|$)/;

const DEFAULT_PALETTE = /#(?:58a6ff|0d1117|161b22|21262d|3fb950|f85149|8b949e|c9d1d9|e6edf3|238636|1f6feb|30363d|9be9a8|40c463|30a14e|216e39|0e4429|006d32|26a641|39d353)\b/gi;

/**
 * 階調そのものが判別できるか。
 * ヒートマップの5段階は「情報を色の濃さで伝える」約束だが、隣り合う段が
 * 1.02:1 なら段は存在しないに等しい。前景/背景のコントラストだけを見ていた
 * 8検査はこれを全て通過し、人の目と手計算でしか見つからなかった。
 * (ux-reviewer 神官の上申により追加 — 憲法 第18条(b))
 */
const RAMP_MIN_STEP = 1.2; // 隣接段がこれ未満なら段として機能していない
function checkRampSeparation(ctx) {
  const findings = [];
  for (const [themeName, table] of Object.entries(ctx.themes)) {
    // --level-0..N / --step-N のような連番トークンを段階列とみなす
    const groups = new Map();
    for (const k of Object.keys(table)) {
      const m = k.match(/^(--[\w-]*?)(\d+)$/);
      if (!m) continue;
      if (!groups.has(m[1])) groups.set(m[1], []);
      groups.get(m[1]).push({ n: Number(m[2]), key: k });
    }
    for (const [prefix, steps] of groups) {
      if (steps.length < 3) continue; // 段階列と呼べる長さがない
      steps.sort((a, b) => a.n - b.n);
      for (let i = 0; i < steps.length - 1; i++) {
        const c1 = resolveColor(table[steps[i].key], table);
        const c2 = resolveColor(table[steps[i + 1].key], table);
        if (!c1 || !c2) continue;
        const r = contrast(c1, c2);
        if (r < RAMP_MIN_STEP) {
          findings.push(`${themeName}: ${steps[i].key} vs ${steps[i + 1].key} = ${r.toFixed(2)}:1`);
        }
      }
    }
  }
  return findings.length
    ? { id: 'ramp-separation', ok: false, severity: 'gap', note: `${findings.length} adjacent step(s) indistinguishable (need >= ${RAMP_MIN_STEP}:1) — ` + findings.slice(0, 4).join('; ') }
    : { id: 'ramp-separation', ok: true, severity: 'gap', note: 'colour ramps keep their steps distinguishable' };
}

/**
 * 文字でない UI(枠線・アイコン・状態の丸)は WCAG 1.4.11 で 3:1 を要する。
 * 毎日押す的が見えないのは、読めない文章と同じ欠陥である。
 */
function checkNonTextContrast(ctx) {
  const findings = [];
  const BORDERISH = /^--(line|border|outline|divider|rule|stroke|hairline)(-|$)/;
  for (const [themeName, table] of Object.entries(ctx.themes)) {
    const bgs = Object.keys(table).filter(k => BG_HINTS.test(k));
    if (!bgs.length) continue;
    for (const lk of Object.keys(table).filter(k => BORDERISH.test(k))) {
      const line = resolveColor(table[lk], table);
      if (!line) continue;
      // その線が置かれうる背景すべてに対し、最も見やすい組でも 3:1 に届かないなら欠陥
      let best = 0, bestBg = null;
      for (const bk of bgs) {
        const bg = resolveColor(table[bk], table);
        if (!bg) continue;
        const r = contrast(line, bg);
        if (r > best) { best = r; bestBg = bk; }
      }
      if (bestBg && best < 3.0) findings.push(`${themeName}: ${lk} on ${bestBg} = ${best.toFixed(2)}:1`);
    }
  }
  return findings.length
    ? { id: 'non-text-contrast', ok: false, severity: 'gap', note: `${findings.length} UI boundary/state colour(s) below WCAG 1.4.11 (3:1) — ` + findings.slice(0, 3).join('; ') }
    : { id: 'non-text-contrast', ok: true, severity: 'gap', note: 'non-text UI boundaries meet 3:1' };
}

/**
 * ブラウザ既定 UI(スクロールバー・フォーム部品)を暗色に合わせるための宣言。
 * 無いと、暗いカードの上に明るいスクロールバーが露出する。
 */
function checkColorScheme(ctx) {
  const darkAware = /prefers-color-scheme|data-theme/.test(ctx.css);
  if (!darkAware) return { id: 'color-scheme-declared', ok: true, severity: 'smell', note: 'single theme — not applicable' };
  return /color-scheme\s*:/.test(ctx.css)
    ? { id: 'color-scheme-declared', ok: true, severity: 'smell', note: 'color-scheme is declared so browser UI follows the theme' }
    : { id: 'color-scheme-declared', ok: false, severity: 'smell', note: 'themes exist but color-scheme is never declared — scrollbars and form controls will not follow the theme' };
}

// ─── 検査群 ───
function checkIdentityHonoured(ctx) {
  if (!ctx.identity) return { id: 'identity-honoured', ok: true, severity: 'info', note: 'no identity.md — not applicable' };
  const declared = [...new Set((ctx.identity.match(/#[0-9a-fA-F]{6}\b/g) || []).map(s => s.toUpperCase()))];
  if (!declared.length) return { id: 'identity-honoured', ok: true, severity: 'info', note: 'identity.md declares no explicit hex colors' };
  const impl = new Set((ctx.code.match(/#[0-9a-fA-F]{6}\b/g) || []).map(s => s.toUpperCase()));
  const missing = declared.filter(c => !impl.has(c));
  const honoured = declared.length - missing.length;
  const ratio = honoured / declared.length;
  // identity.md は「初版の誤り」も引用するので、全色一致は求めない。
  // 宣言した色の過半が実装に現れていなければ、宣言は絵に描いた餅。
  return ratio >= 0.5
    ? { id: 'identity-honoured', ok: true, severity: 'gap', note: `${honoured}/${declared.length} declared colors present in the implementation` }
    : { id: 'identity-honoured', ok: false, severity: 'gap', note: `only ${honoured}/${declared.length} declared colors reached the implementation — the identity is decorative, not honoured` };
}

function checkContrast(ctx) {
  const findings = [];
  for (const [themeName, table] of Object.entries(ctx.themes)) {
    const fgs = Object.keys(table).filter(k => FG_HINTS.test(k));
    const bgs = Object.keys(table).filter(k => BG_HINTS.test(k));
    if (!fgs.length || !bgs.length) continue;
    // 主背景 = 最初に見つかった bg 系。主前景 = 最初の fg 系。
    const bgKey = bgs[0], bg = resolveColor(table[bgKey], table);
    if (!bg) continue;
    for (const fk of fgs) {
      const fg = resolveColor(table[fk], table);
      if (!fg) continue;
      const ratio = contrast(fg, bg);
      // 補助テキスト(muted/faint/subtle)は 3:1、本文系は 4.5:1 を求める
      const isSecondary = /(muted|faint|subtle|tertiary|placeholder|disabled)/.test(fk);
      const need = isSecondary ? 3.0 : 4.5;
      if (ratio < need) findings.push(`${themeName}: ${fk} on ${bgKey} = ${ratio.toFixed(2)}:1 (needs ${need}:1)`);
    }
    // --on-signal は --signal の上で測る。相手が居ない on-* は評価しない。
    for (const ok of Object.keys(table).filter(k => ON_SURFACE.test(k))) {
      const surfKey = '--' + ok.match(ON_SURFACE)[1];
      if (table[surfKey] === undefined) continue;
      const on = resolveColor(table[ok], table);
      const surf = resolveColor(table[surfKey], table);
      if (!on || !surf) continue;
      const ratio = contrast(on, surf);
      if (ratio < 4.5) findings.push(`${themeName}: ${ok} on ${surfKey} = ${ratio.toFixed(2)}:1 (needs 4.5:1)`);
    }
  }
  return findings.length
    ? { id: 'contrast-aa', ok: false, severity: 'gap', note: `${findings.length} pair(s) below WCAG AA — ` + findings.slice(0, 4).join('; ') }
    : { id: 'contrast-aa', ok: true, severity: 'gap', note: 'all resolvable fg/bg pairs meet WCAG AA' };
}

function checkNoDefaultPalette(ctx) {
  const hits = [...new Set((ctx.code.match(DEFAULT_PALETTE) || []).map(s => s.toLowerCase()))];
  return hits.length >= 2
    ? { id: 'no-default-palette', ok: false, severity: 'gap', note: `${hits.length} generic dev-tool colors: ${hits.slice(0, 6).join(', ')}` }
    : { id: 'no-default-palette', ok: true, severity: 'gap', note: 'the palette is not the machine default' };
}

/**
 * 空・読み込み・エラーの三状態。機能テストは「データがある」道しか通らず、
 * 初回起動の空画面や失敗表示は誰にも見られないまま出荷される。
 */
function checkStates(ctx) {
  const missing = [];
  if (!/(empty|空|まだ|何もあり|no-?data|nothing|はじめ|最初の)/i.test(ctx.code)) missing.push('empty');
  if (!/(error|エラー|失敗|できません|問題が)/i.test(ctx.code)) missing.push('error');
  return missing.length
    ? { id: 'states-covered', ok: false, severity: 'gap', note: `no visible handling for: ${missing.join(', ')} state(s)` }
    : { id: 'states-covered', ok: true, severity: 'gap', note: 'empty and error states are addressed' };
}

function checkResponsive(ctx) {
  const mq = (ctx.css.match(/@media[^{]*\((?:max|min)-width/g) || []).length;
  const hasViewport = /name=["']viewport["']/.test(ctx.code);
  if (!hasViewport) return { id: 'responsive-declared', ok: false, severity: 'gap', note: 'no viewport meta — the page will not adapt on a phone' };
  return mq >= 1
    ? { id: 'responsive-declared', ok: true, severity: 'gap', note: `${mq} width breakpoint(s) declared` }
    : { id: 'responsive-declared', ok: false, severity: 'gap', note: 'viewport meta present but no width breakpoint — one layout for every screen' };
}

function checkFocusVisible(ctx) {
  const ok = /:focus-visible|:focus\b/.test(ctx.css) && !/outline\s*:\s*none\s*;?\s*\}/.test(ctx.css.replace(/:focus[^{]*\{[^}]*\}/g, ''));
  return ok
    ? { id: 'focus-visible', ok: true, severity: 'gap', note: 'keyboard focus is styled' }
    : { id: 'focus-visible', ok: false, severity: 'gap', note: 'no visible focus style — keyboard users cannot see where they are' };
}

function checkTouchTarget(ctx) {
  // WCAG 2.5.8 は 24x24 CSS px を下限とする。宣言が無ければ「小さすぎないと
  // 言い切れない」し、明示的に 24px 未満を宣言していればそれは実害である。
  // (ux-reviewer が 13px のヒートマップセルを目視で発見した — 数値で捕まえる)
  const decls = [...ctx.css.matchAll(/(?:min-)?(?:height|width)\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/g)]
    .map(m => ({ px: m[2] === 'px' ? Number(m[1]) : Number(m[1]) * 16, raw: m[0] }));
  // 触れる的に使われがちなセレクタ配下の寸法を拾う
  const interactiveBlocks = [...ctx.css.matchAll(/([^{}]*(?:button|\[role="button"\]|\.cell|-cell|\.chip|a\b)[^{}]*)\{([^{}]*)\}/gi)];
  const tooSmall = [];
  for (const [, sel, body] of interactiveBlocks) {
    for (const m of body.matchAll(/(?:min-)?(?:height|width)\s*:\s*(\d+(?:\.\d+)?)px/g)) {
      const px = Number(m[1]);
      if (px > 0 && px < 24) tooSmall.push(`${sel.trim().slice(0, 40)} → ${px}px`);
    }
  }
  if (tooSmall.length) {
    return { id: 'touch-target', ok: false, severity: 'gap',
             note: `${tooSmall.length} interactive element(s) below the 24px WCAG 2.5.8 floor: ` + [...new Set(tooSmall)].slice(0, 3).join('; ') };
  }
  const big = decls.filter(v => v.px >= 32).length;
  return big > 0
    ? { id: 'touch-target', ok: true, severity: 'smell', note: `${big} interactive size floor(s) >= 32px declared` }
    : { id: 'touch-target', ok: false, severity: 'smell', note: 'no minimum size declared for interactive elements — targets may be too small to hit' };
}

function checkMotion(ctx) {
  const animates = /(transition|animation)\s*:/.test(ctx.css);
  if (!animates) return { id: 'motion-respected', ok: true, severity: 'smell', note: 'no motion to reduce' };
  return /prefers-reduced-motion/.test(ctx.css)
    ? { id: 'motion-respected', ok: true, severity: 'smell', note: 'reduced-motion preference is honoured' }
    : { id: 'motion-respected', ok: false, severity: 'smell', note: 'the UI animates but ignores prefers-reduced-motion' };
}

// ─── 実行 ───
function loadContext(dir) {
  const files = fs.readdirSync(dir);
  const uiFiles = files.filter(f => /\.(html|css)$/i.test(f));
  let code = '';
  for (const f of uiFiles) { try { code += fs.readFileSync(path.join(dir, f), 'utf8') + '\n'; } catch { /* skip */ } }
  const css = [...code.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n')
            || uiFiles.filter(f => /\.css$/i.test(f)).map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  let identity = null;
  const idf = files.find(f => /^identity\.md$/i.test(f));
  if (idf) { try { identity = fs.readFileSync(path.join(dir, idf), 'utf8'); } catch { /* skip */ } }
  return { dir, files, uiFiles, code, css, identity, themes: extractThemes(css) };
}

function check(dir) {
  const ctx = loadContext(dir);
  if (!ctx.uiFiles.length) {
    return { dir, applicable: false, ok: true, results: [], summary: 'no UI surface — visual verification not applicable' };
  }
  const results = [
    checkIdentityHonoured(ctx), checkContrast(ctx), checkNoDefaultPalette(ctx),
    checkStates(ctx), checkResponsive(ctx), checkFocusVisible(ctx),
    checkTouchTarget(ctx), checkMotion(ctx),
    // ux-reviewer 神官の上申により追加(第2世代)。8検査を全通過しながら
    // 主役UIが読めない状態が実際に成立したため。
    checkRampSeparation(ctx), checkNonTextContrast(ctx), checkColorScheme(ctx),
  ];
  const gaps = results.filter(r => !r.ok && r.severity === 'gap');
  const smells = results.filter(r => !r.ok && r.severity === 'smell');
  return {
    dir, applicable: true, ok: gaps.length === 0,
    themes: Object.fromEntries(Object.entries(ctx.themes).map(([k, v]) => [k, Object.keys(v).length])),
    results, gaps, smells,
    summary: gaps.length ? `${gaps.length} visual gap(s), ${smells.length} smell(s)`
                         : (smells.length ? `no gaps, ${smells.length} smell(s)` : 'all visual checks pass'),
  };
}

/**
 * 目視の証拠を要求する。機械が測れるのは「規則に反していないか」までで、
 * 「見て嫌にならないか」は測れない。だから verify ゲートは、実ブラウザで
 * 何を見たかの申告を要求する — 見ていないなら、見ていないと書かせる。
 *
 *   visual-verify.js evidence <creationDir>   # 撮るべき組み合わせを示す
 *
 * 返すのは指示であって判定ではない。判定は ux-reviewer が下す。
 */
function evidencePlan(dir) {
  const ctx = loadContext(dir);
  if (!ctx.uiFiles.length) return { applicable: false, shots: [], note: 'no UI surface' };
  const themes = Object.keys(ctx.themes).filter(t => Object.keys(ctx.themes[t]).length);
  const widths = [380, 1280]; // 携帯の実寸 / 通常の画面
  const states = ['first-run (no data)', 'populated'];
  const shots = [];
  for (const t of (themes.length ? themes : ['default'])) {
    for (const w of widths) {
      for (const s of states) shots.push({ theme: t, width: w, state: s });
    }
  }
  return {
    applicable: true,
    shots,
    required: shots.length,
    note: 'Open the file in a real browser and capture each combination. ' +
          'A combination you could not capture must be reported as "not seen", never as "fine".',
    pitfall: 'The saved theme in localStorage can override the HTML attribute — ' +
             'if the theme will not switch, pin applyTheme() in a COPY, never in the artifact.',
  };
}

if (require.main === module) {
  const cmd = process.argv[2];
  const dir = process.argv[3];
  if (cmd === 'evidence' && dir) {
    const plan = evidencePlan(dir);
    if (process.argv.includes('--json')) console.log(JSON.stringify(plan, null, 2));
    else {
      console.log('═══════ 📷 REQUIRED VISUAL EVIDENCE ═══════');
      if (!plan.applicable) console.log('  (no UI surface — none required)');
      for (const s of plan.shots) console.log(`  · theme=${s.theme}  width=${s.width}px  state=${s.state}`);
      if (plan.applicable) { console.log('  ' + plan.note); console.log('  pitfall: ' + plan.pitfall); }
      console.log('═══════════════════════════════════════════');
    }
    process.exit(0);
  }
  if (cmd !== 'check' || !dir) { console.error('usage: visual-verify.js check <creationDir> [--json] | evidence <creationDir>'); process.exit(2); }
  const res = check(dir);
  if (process.argv.includes('--json')) { console.log(JSON.stringify(res, null, 2)); }
  else {
    console.log('═══════ 👁  VISUAL VERIFICATION ═══════');
    console.log('target:', dir);
    if (!res.applicable) console.log('  (no UI surface)');
    for (const r of res.results) {
      const mark = r.ok ? '✓' : (r.severity === 'gap' ? '🔴' : '🟠');
      console.log(`  ${mark} [${r.severity}] ${r.id}: ${r.note}`);
    }
    console.log('───────────────────────────────────────');
    console.log(res.ok ? `VISUAL: ${res.summary}` : `VISUAL GAPS — the look is not verified. ${res.summary}`);
    console.log('═══════════════════════════════════════');
  }
  process.exit(res.ok ? 0 : 1);
}

module.exports = { check, evidencePlan, contrast, luminance, parseHex, extractThemes, resolveColor, DEFAULT_PALETTE };
