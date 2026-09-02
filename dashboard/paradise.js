/**
 * paradise.js — 門の画面を断面から描く (FR-02 / FR-07 / FR-08 / FR-20)
 *
 * ■ 掟
 *   **数値リテラルを画面に埋めない。** 画面に出る全ての数は断面 (snapshot) 由来である。
 *   固定配列の metrics と架空 4 タスクの自己 DAG リテラルは撤廃した —— 実測 33 engine を
 *   「2」と主張していた画面が、16.5 倍の嘘をついていた。
 *
 * ■ 三層フォールバック (FR-08)
 *   第1層 EventSource → 第2層 fetch ポーリング → 第3層 window.PARADISE_STATE (凍結)。
 *   降格しても嘘をつかない。**どの層にいるかを常に名乗る** (NFR-06)。
 *
 * ■ 閾値は 1 箇所 (AC-RT-2 / AC-07b / AC-08b)
 *   画面が 10000 を、engine が 12000 を持てば、同じ断面に対して両者が違う鮮度を言う。
 *   下の TH がこの画面での唯一の定義であり、graph/pulse.js の T と一致することを
 *   tests/dashboard-freshness.test.js と tests/dashboard-transport.test.js が検査する。
 */
'use strict';

/* ── 定数。それぞれ 1 箇所でのみ定義する ── */
var TH = {
  FIRST_EVENT_TIMEOUT_MS: 5000,
  ERROR_STREAK: 2,
  POLL_INTERVAL_MS: 2000,
  PROMOTE_RETRY_MS: 30000,
  FRESH_LIVE_MS: 10000,
  FRESH_FROZEN_MS: 60000,
  DEFAULT_PORT: 7317,
  LOG_KEEP: 10,
};

/* ── 経路の解決 (§2.2)。当てずっぽうに走査しない ── */
/**
 * **自分が配信されてきた出自を最優先する。**
 *
 * サーバは既定 7317 が塞がっていれば listen(0) で OS に番号を任せる(FR-10)。
 * 自動割当なら番号は毎回変わる —— ゆえに固定の 7317 を先に見る実装は、
 * **自動割当が働いた瞬間に必ず凍結する。** 実測: `serve --port 7411` で起こし
 * 7411 で開いた画面が 7317 に繋ぎに行き、SSE も fetch も落ちて凍結のままだった。
 *
 * http(s) で開かれているなら、その origin こそ**サーバが実際に応答している住所**である。
 * 推測より確かな事実がそこに在る(NFR-06)。file:// のときだけ、
 * state.js が書いた PARADISE_PORT → 既定 7317 の順に落ちる。
 */
function origin() {
  if (typeof location !== 'undefined' && /^https?:$/.test(location.protocol) && location.origin && location.origin !== 'null') {
    return location.origin;                        // ← 自分の出自。最も確からしい
  }
  return null;
}
function resolvePort() {
  const o = origin();
  if (o) { const m = o.match(/:(\d+)$/); if (m) return Number(m[1]); }
  if (typeof window !== 'undefined' && typeof window.PARADISE_PORT === 'number') return window.PARADISE_PORT;
  return TH.DEFAULT_PORT;
}
function base() { return origin() || ('http://127.0.0.1:' + resolvePort()); }

/* ── 鮮度 (FR-07)。graph/pulse.js freshness と同じ閾値・同じ規則 ── */
function freshnessOf(ageMs, transport) {
  if (transport === 'frozen') return 'frozen';       // 第3層は ageMs に関わらず必ず frozen
  if (ageMs > TH.FRESH_FROZEN_MS) return 'frozen';
  if (ageMs > TH.FRESH_LIVE_MS) return 'lagging';
  return 'live';
}

/* ── 経過の相対表記 (ux.md §3.2)。toISOString() を画面に出さない ── */
function relTime(ageMs) {
  if (ageMs < 2000) return 'たった今';
  if (ageMs < 60000) return Math.floor(ageMs / 1000) + ' 秒前';
  if (ageMs < 3600000) return Math.floor(ageMs / 60000) + ' 分前';
  if (ageMs < 86400000) {
    var h = Math.floor(ageMs / 3600000), m = Math.floor((ageMs % 3600000) / 60000);
    return h + ' 時間 ' + m + ' 分前';
  }
  return Math.floor(ageMs / 86400000) + ' 日前';
}
/** 絶対表記は凍結時のみ併記する。**局所時刻**で出す — UTC は神の時計ではない */
function localStamp(ms) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(new Date(ms));
  } catch (e) {
    var d = new Date(ms), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '/' + p(d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' +
      p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
}
function durationText(ms) {
  if (typeof ms !== 'number' || !isFinite(ms)) return '—';
  var d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000);
  if (d > 0) return d + '日 ' + h + '時間';
  var m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? h + '時間 ' + m + '分' : m + '分';
}

/* ── DOM の小道具 ── */
function el(tag, attrs, kids) {
  var n = document.createElement(tag);
  if (attrs) for (var k in attrs) {
    if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
    if (attrs[k] === null || attrs[k] === undefined) continue;
    if (k === 'text') n.textContent = String(attrs[k]);
    else if (k === 'class') n.className = attrs[k];
    else n.setAttribute(k, String(attrs[k]));
  }
  if (kids) for (var i = 0; i < kids.length; i++) if (kids[i]) n.appendChild(kids[i]);
  return n;
}
function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
function panel(name) { return document.querySelector('[data-panel="' + name + '"]'); }
function bodyOf(name) { var p = panel(name); return p ? p.querySelector('[data-body]') : null; }

/**
 * パネルの状態を立てる (FR-20 / ux.md §2)。5 状態のいずれか 1 つを必ず持つ。
 * loading / disconnected は **必ず data-awaiting を伴う** — スピナーは禁じ手であり、
 * 「何を待っているか」を名指ししない表示は透明性ではない。
 */
function setState(name, state, awaiting) {
  var p = panel(name);
  if (!p) return null;
  p.setAttribute('data-state', state);
  if (state === 'loading' || state === 'disconnected' || state === 'error') {
    p.setAttribute('data-awaiting', awaiting || 'pulse');
  } else {
    p.removeAttribute('data-awaiting');
  }
  var b = p.querySelector('[data-body]');
  if (b) clear(b);
  return b;
}
/** 空状態は「無い」ことを言い切る。0 を表示するだけの ready にしない (AC-20e) */
function showEmpty(name, msg, hint) {
  var b = setState(name, 'empty');
  if (!b) return;
  b.appendChild(el('p', { class: 'note', text: msg }));
  if (hint) b.appendChild(el('p', { class: 'hint mono', text: hint }));
}
/** エラーは engine 名・理由・直前に成功した時刻を出す。全画面を落とさない */
function showError(name, engine, reason, lastOkMs) {
  engine = engineName(engine);
  var b = setState(name, 'error', engine);
  if (!b) return;
  b.appendChild(el('p', { class: 'note bad', text: '⚠ ' + engine + ' が答えませんでした' }));
  if (reason) b.appendChild(el('p', { class: 'hint mono', text: reason }));
  b.appendChild(el('p', {
    class: 'hint',
    text: lastOkMs ? '最後に取れたのは ' + relTime(Date.now() - lastOkMs) + '(' + localStamp(lastOkMs) + ')'
      : 'まだ一度も取れていません',
  }));
}
function errorsFor(snap, keyPrefix) {
  var out = [];
  var errs = (snap && snap.errors) || [];
  for (var i = 0; i < errs.length; i++) {
    if (String(errs[i].key || '').indexOf(keyPrefix) === 0) out.push(errs[i]);
  }
  return out;
}
function sourceTag(name) { return el('p', { class: 'src', text: '出所: ' + name }); }

/**
 * data-awaiting に出してよいのは **実在する engine の名だけ** (AC-20c)。
 * 断面が知らない名を返してきたときは pulse を名指しする —— 架空の名を待たない。
 */
var KNOWN_ENGINES = ['pulse', 'census', 'conclave', 'clergy', 'forge', 'workspace', 'kg', 'wiring',
  'vendor', 'derived', 'check-agents', 'gauge', 'spawn-trace', 'daily-guard', 'lessons', 'codex', 'atlas'];
function engineName(n) { return KNOWN_ENGINES.indexOf(String(n)) >= 0 ? String(n) : 'pulse'; }

/* ══════════════════════════════════════════════════════════
   領域 0 — 状況の一行(経路バッジ + 鮮度)。画面最上部・常時可視
   ══════════════════════════════════════════════════════════ */
var TRANSPORT_LABEL = { sse: '生(SSE)', poll: '生(2秒ごと)', frozen: '凍結' };

function renderTop(snap, transport) {
  var root = document.querySelector('[data-transport]');
  if (!root) return;
  root.setAttribute('data-transport', transport);
  var ageMs = snap ? Math.max(0, Date.now() - snap.generatedAtMs) : 0;
  var fresh = freshnessOf(ageMs, transport);
  root.setAttribute('data-freshness', fresh);

  var badge = document.querySelector('[data-field="transport-badge"]');
  if (badge) badge.textContent = TRANSPORT_LABEL[transport] || transport;
  var age = document.querySelector('[data-field="age"]');
  if (age) {
    age.textContent = snap ? relTime(ageMs) : '断面をまだ受け取っていません';
    // 凍結時のみ絶対時刻を併記する。生に絶対時刻を添えても情報は増えない
    if (snap && fresh === 'frozen') age.textContent += '(' + localStamp(snap.generatedAtMs) + ')';
  }
  var fl = document.querySelector('[data-field="freshness-word"]');
  if (fl) fl.textContent = fresh === 'live' ? '生' : (fresh === 'lagging' ? '遅延' : '凍結');

  var head = document.querySelector('[data-field="headline"]');
  if (head && snap) {
    var stalled = (snap.runs || []).filter(function (r) { return r.state === 'stalled'; });
    var contra = (snap.runs || []).filter(function (r) { return r.contradiction === true; });
    var badGates = (snap.gates || []).filter(function (g) { return !g.ok; });
    var parts = [];
    if (stalled.length) parts.push('停止した環 ' + stalled.length + ' 件');
    if (contra.length) parts.push('矛盾 ' + contra.length + ' 件');
    if (badGates.length) parts.push('赤い門 ' + badGates.length + ' 件');
    if (snap.errors && snap.errors.length) parts.push('測れなかった鍵 ' + snap.errors.length + ' 件');
    head.textContent = parts.length ? parts.join(' / ') : '異常なし — 全ての門が緑、停止した環なし';
    head.setAttribute('data-anomaly', parts.length ? 'true' : 'false');
  }
}

/* ══════════════════════════════════════════════════════════
   領域 1 — 走行中の環 (FR-14)。停止中を常に先頭に、完了は畳む
   ══════════════════════════════════════════════════════════ */
var DOMAIN_WORD = { ratified: '✓批准', active: '▶進行', rejected: '↺差戻', blocked: '⏸停止', pending: '―未着手' };

function runCard(r, collapsed) {
  var head = el('h3', { class: 'run-head' }, [
    el('span', { class: 'run-state-word', text: r.state === 'stalled' ? '[停止]' : '[完了]' }),
    el('span', { class: 'run-name mono', text: r.name }),
    el('span', { class: 'run-phase mono', text: r.phasesDone + '/' + r.phasesTotal + ' 相' }),
    r.contradiction === true ? el('span', { class: 'tag-contradiction', text: '[矛盾]' }) : null,
  ]);
  var doms = el('ul', { class: 'domains' }, (r.domains || []).map(function (d) {
    return el('li', { class: 'domain', 'data-domain-status': d.status }, [
      el('span', { class: 'domain-name', text: d.domain || d.cardinal }),
      el('span', { class: 'domain-word', text: DOMAIN_WORD[d.status] || '―未着手' }),
    ]);
  }));
  var bar = el('div', { class: 'bar', role: 'img',
    'aria-label': '相の進捗 ' + r.phasesDone + ' / ' + r.phasesTotal }, [
    el('span', { class: 'bar-fill', style: 'width:' + (r.phasesTotal ? (100 * r.phasesDone / r.phasesTotal) : 0) + '%' }),
  ]);
  var ev = r.lastEvent
    ? el('p', { class: 'hint', text: '最後の出来事: ' + r.historyLength + ' 件目「' +
        String(r.lastEvent.event || r.lastEvent.note || JSON.stringify(r.lastEvent)).slice(0, 80) + '」' })
    : el('p', { class: 'hint', text: '出来事はまだ記録されていません' });
  var scale = el('p', { class: 'hint mono',
    text: '道: ' + (r.scaleGuess ? r.scaleGuess : ((r.scaleCandidates || []).join(' または ') || '不明')) });

  var card = el('article', {
    class: 'run' + (collapsed ? ' collapsed' : ''),
    'data-run-state': r.state,                       // AC-14i。**省いてはならない**
    'data-contradiction': r.contradiction === true ? 'true' : 'false',
    'data-run': r.name,
  }, [head, collapsed ? null : doms, bar, collapsed ? null : ev, collapsed ? null : scale]);
  return card;
}

function renderRuns(snap) {
  var readErrs = errorsFor(snap, 'runs');
  if (!snap.runs) { showError('running-ring', 'conclave', '環を読めませんでした'); return; }
  if (snap.runs.length === 0) {
    showEmpty('running-ring', '走行中の環はありません',
      'node graph/forge.js plan "<願い>" --out <dir>/forge.dag.json で環を起こせます');
    return;
  }
  var b = setState('running-ring', 'ready');
  // 目立たせる最も強い手段は位置である。停止中を常に先頭に置く
  var stalled = snap.runs.filter(function (r) { return r.state === 'stalled'; });
  var done = snap.runs.filter(function (r) { return r.state !== 'stalled'; });
  stalled.forEach(function (r) { b.appendChild(runCard(r, false)); });
  if (done.length) {
    var btn = el('button', { type: 'button', class: 'expander', 'aria-expanded': 'false',
      text: '完了した環 ' + done.length + ' 件を開く' });
    var wrap = el('div', { class: 'run-group' }, done.map(function (r) { return runCard(r, true); }));
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      btn.textContent = (open ? '完了した環 ' : '完了した環 ') + done.length + (open ? ' 件を開く' : ' 件を閉じる');
      wrap.querySelectorAll('.run').forEach(function (c) { c.classList.toggle('collapsed', open); });
    });
    b.appendChild(btn);
    b.appendChild(wrap);
  }
  if (readErrs.length) b.appendChild(el('p', { class: 'hint bad', text: '読めなかった環 ' + readErrs.length + ' 件(errors[] に記録)' }));
  b.appendChild(sourceTag('conclave.json 直読み'));
}

/* ══════════════════════════════════════════════════════════
   領域 2 — 点数と起動実績の並置 (FR-13) + 点数履歴 (FR-22)
   ══════════════════════════════════════════════════════════ */
var METRIC_LABEL = {
  firstPassRate: '初回通過率', reworkCount: '差戻',
  retryOverhead: '再試行超過', loopGuardTrips: 'loop-guard', durationMs: '所要',
};

function ledgerRows(snap, slug) {
  // ledger は null(読めなかった)と [](まだ無い)を区別する
  if (snap.ledger === null || snap.ledger === undefined) return null;
  return snap.ledger.filter(function (l) { return l.slug === slug; })
    .sort(function (a, b) { return new Date(b.ts) - new Date(a.ts); });
}

function scoreCard(snap, r) {
  var kids = [];
  kids.push(el('h3', { class: 'run-head' }, [
    el('span', { class: 'run-name mono', text: r.name }),
    r.contradiction === true ? el('span', { class: 'tag-contradiction', text: '[矛盾]' }) : null,
  ]));

  // 点数と起動実績を **横に並べる**。縦に積むと矛盾が矛盾に見えない
  var left = el('div', { class: 'half' }, [
    el('h4', { text: '点数' }),
    el('p', { class: 'big mono', text: r.score === null ? '測れず' : String(r.score) + ' / 100' }),
  ]);
  var right;
  if (r.spawn === null) {
    // 測れなかったのは事実ではない。ready の中の値ではなく error である
    right = el('div', { class: 'half', 'data-state': 'error', 'data-awaiting': 'spawn-trace' }, [
      el('h4', { text: '起動実績' }),
      el('p', { class: 'note bad', text: '起動実績を測れませんでした' }),
      el('p', { class: 'hint', text: 'spawn-trace が total=0 を返した — 緑として描かない(第16条)' }),
    ]);
  } else {
    right = el('div', { class: 'half' }, [
      el('h4', { text: '起動実績' }),
      el('p', { class: 'mono', text: '観測      ' + r.spawn.observed + ' / ' + r.spawn.total }),
      el('p', { class: 'mono', text: '宣言のみ  ' + r.spawn.assertedOnly + ' / ' + r.spawn.total }),
      el('p', { class: 'mono bad', text: '証跡なし  ' + r.spawn.noTrace + ' / ' + r.spawn.total }),
    ]);
  }
  var pair = el('div', {
    class: 'pair',
    'data-score': r.score === null ? '' : String(r.score),
    'data-spawn-observed': r.spawn ? String(r.spawn.observed) : '',
    'data-spawn-asserted': r.spawn ? String(r.spawn.assertedOnly) : '',
    'data-spawn-notrace': r.spawn ? String(r.spawn.noTrace) : '',
  }, [left, right]);
  kids.push(pair);

  if (r.contradiction === true) {
    // 絵を読み解かせない。言葉で言い切る
    kids.push(el('p', { class: 'verdict-line', text: '⚠ 満点だが、階層を一度も歩いていない' }));
  }

  if (r.metrics) {
    kids.push(el('ul', { class: 'metrics' }, Object.keys(METRIC_LABEL).map(function (k) {
      var v = r.metrics[k];
      return el('li', { class: 'metric mono', 'data-metric': k,
        text: METRIC_LABEL[k] + ' ' + (k === 'durationMs' ? durationText(v) : (v === undefined || v === null ? '—' : String(v))) });
    })));
  }

  // 点数履歴 (FR-22)。**gauge.baseline ではなく ledger のみが源である**
  var rows = ledgerRows(snap, r.name);
  var hist;
  if (rows === null) {
    hist = el('div', { class: 'ledger', 'data-source': 'gauge-ledger', 'data-state': 'error', 'data-awaiting': 'gauge' }, [
      el('h4', { text: '点数の履歴' }),
      el('p', { class: 'note bad', text: '点数履歴を読めませんでした' }),
    ]);
  } else if (rows.length === 0) {
    hist = el('div', { class: 'ledger', 'data-source': 'gauge-ledger', 'data-state': 'empty' }, [
      el('h4', { text: '点数の履歴' }),
      el('p', { class: 'note', text: 'この環はまだ採点されていません' }),
      el('p', { class: 'hint mono', text: 'node graph/gauge.js record <run.json> --slug ' + r.name }),
    ]);
  } else {
    hist = el('div', { class: 'ledger', 'data-source': 'gauge-ledger', 'data-state': 'ready' }, [
      el('h4', { text: '点数の履歴' }),
      el('ul', {}, rows.slice(0, 3).map(function (row, i) {
        var prev = rows[i + 1];
        var diff = (prev && typeof row.score === 'number' && typeof prev.score === 'number')
          ? (row.score - prev.score) : null;
        var ts = Date.parse(row.ts);
        return el('li', { class: 'mono' }, [
          el('span', { text: (row.score === null ? '—' : row.score) + ' 点' }),
          diff === null ? null : el('span', { class: 'diff', text: (diff >= 0 ? '+' : '') + diff }),
          el('span', { class: 'hint', text: 'ledger 記録時刻 ' + (isFinite(ts) ? relTime(Math.max(0, Date.now() - ts)) : '不明') }),
        ]);
      })),
      el('p', { class: 'src', text: '出所: gauge-ledger.jsonl(記録時刻をそのまま運ぶ — 再計算しない)' }),
    ]);
  }
  kids.push(hist);
  return el('article', { class: 'score-card', 'data-run': r.name,
    'data-contradiction': r.contradiction === true ? 'true' : 'false' }, kids);
}

function renderScores(snap) {
  if (!snap.runs || snap.runs.length === 0) {
    showEmpty('runs-score', '採点できる環がありません', 'node graph/forge.js plan "<願い>" で環を起こせます');
    return;
  }
  var b = setState('runs-score', 'ready');
  // 矛盾を先頭に。異常を上、正常を下
  var sorted = snap.runs.slice().sort(function (a, c) {
    return (c.contradiction === true ? 1 : 0) - (a.contradiction === true ? 1 : 0);
  });
  sorted.forEach(function (r) { b.appendChild(scoreCard(snap, r)); });
  b.appendChild(sourceTag('gauge.score / spawn-trace.report(run オブジェクト)'));
}

/* ══════════════════════════════════════════════════════════
   領域 3 — 門の合否 (FR-15)。各門は自分の測定時刻を出す
   ══════════════════════════════════════════════════════════ */
function renderGates(snap) {
  if (!snap.gates || !snap.gates.length) { showEmpty('gates', '門がまだ測られていません', 'node graph/pulse.js snapshot --json'); return; }
  var b = setState('gates', 'ready');
  var list = el('ul', { class: 'gates' }, snap.gates.map(function (g) {
    var detail = Object.keys(g.detail || {}).map(function (k) { return k + '=' + g.detail[k]; }).join(' ');
    return el('li', { class: 'chip gate', 'data-gate': g.name, 'data-ok': g.ok ? 'true' : 'false' }, [
      el('span', { class: 'gate-word', text: g.ok ? '✓緑' : '🔴赤' }),
      el('span', { class: 'gate-name mono', text: g.name }),
      el('span', { class: 'hint mono', text: g.ms.toFixed(1) + 'ms' }),
      el('span', { class: 'hint', text: '測った時刻 ' + relTime(Math.max(0, Date.now() - g.at)) }),
      detail ? el('span', { class: 'hint mono', text: detail }) : null,
    ]);
  }));
  b.appendChild(list);
  // キャッシュを持つなら、その事実を画面が語らねばならない
  b.appendChild(el('p', { class: 'hint',
    text: snap.gatesCached
      ? '※ この合否は前回の測定を再利用しています(engine が書き換わるまで測り直しません)'
      : '※ この断面でいま測りました' }));
  b.appendChild(sourceTag('wiring / vendor.verify / derived / check-agents / workspace の 2 本合成'));
}

/* ══════════════════════════════════════════════════════════
   領域 4 — 数の看板 (FR-01 / FR-02)
   ══════════════════════════════════════════════════════════ */
var COUNT_LABEL = {
  articles: '憲法の条', engines: 'engine', cardinals: '枢機卿', creations: '創造物',
  workshops: '作業場', runs: '環', agents: '神官(agents)', commands: '命令(commands)',
  skills: '技(skills)', lessons: '教訓', kgNodes: 'KG ノード', kgEdges: 'KG エッジ',
};
var COUNT_SOURCE = {
  articles: 'codex', engines: 'fs', cardinals: 'clergy', creations: 'workspace',
  workshops: 'workspace', runs: 'conclave-read', agents: 'check-agents', commands: 'fs',
  skills: 'fs', lessons: 'lessons', kgNodes: 'kg', kgEdges: 'kg',
};
function renderCounts(snap) {
  if (!snap.counts) { showError('counts', 'pulse', '数の看板を作れませんでした'); return; }
  var b = setState('counts', 'ready');
  var ul = el('ul', { class: 'counts' });
  Object.keys(COUNT_LABEL).forEach(function (k) {
    var v = snap.counts[k];
    // null は「数えられなかった」。0 と区別して出す
    ul.appendChild(el('li', { class: 'count', 'data-count': k, 'data-measured': v === null || v === undefined ? 'false' : 'true' }, [
      el('span', { class: 'count-value mono', text: (v === null || v === undefined) ? '測れず' : String(v) }),
      el('span', { class: 'count-label', text: COUNT_LABEL[k] }),
      el('span', { class: 'src mono', text: COUNT_SOURCE[k] }),
    ]));
  });
  b.appendChild(ul);
  // census は同期経路で呼ばない。未取得なら「何を待っているか」を名指しする
  var cen = el('div', { class: 'census', 'data-field': 'census' });
  if (snap.census === null || snap.census === undefined) {
    cen.setAttribute('data-state', 'empty');
    cen.setAttribute('data-awaiting', 'census');
    cen.appendChild(el('p', { class: 'note', text: 'self-test の数はまだ測っていません' }));
    cen.appendChild(el('p', { class: 'hint mono', text: 'census を待っています(最大 120 秒)— node graph/census.js show' }));
  } else {
    cen.setAttribute('data-state', 'ready');
    cen.appendChild(el('p', { class: 'mono', text: 'self-test: ' + JSON.stringify(snap.census) }));
  }
  b.appendChild(cen);
  b.appendChild(sourceTag('各 engine を module として呼んだ実測'));
}

/* ══════════════════════════════════════════════════════════
   領域 5 — 日次ノルマ (FR-16)。exit code を成否として読まない
   ══════════════════════════════════════════════════════════ */
function renderDaily(snap) {
  if (!snap.daily) { showError('daily', 'daily-guard', '日次ノルマを読めませんでした'); return; }
  var d = snap.daily;
  if (d.due === false) {
    // due:false は exit 1 を返すが、それは「債務なし」という良い知らせである
    var b = setState('daily', 'ready');
    b.appendChild(el('p', { class: 'note ok', text: '本日の債務はありません' }));
    b.appendChild(el('p', { class: 'hint', text: d.reason || '' }));
    b.appendChild(el('p', { class: 'hint mono', text: 'JST ' + (d.jst || '') + ' / 直近の窓 ' + (d.owedDay || '') }));
    b.appendChild(sourceTag('daily-guard.isDue()(exit code ではなく due 欄で判ずる)'));
    return;
  }
  var b2 = setState('daily', 'ready');
  b2.appendChild(el('p', { class: 'note warn', text: '債務があります: ' + (d.owedDay || '') }));
  b2.appendChild(el('p', { class: 'hint', text: d.reason || '' }));
  if (d.lease) b2.appendChild(el('p', { class: 'hint mono', 'data-field': 'lease', text: 'リース保持者 ' + d.lease.holder }));
  b2.appendChild(sourceTag('daily-guard.isDue()'));
}

/* ══════════════════════════════════════════════════════════
   領域 6 — 道の形 (FR-21)。6 本すべて。相数はハードコードしない
   ══════════════════════════════════════════════════════════ */
function renderScales(snap) {
  var names = Object.keys(snap.scale || {}).filter(function (k) { return snap.scale[k] && typeof snap.scale[k].phases === 'number'; });
  if (!names.length) { showEmpty('scales', '道がまだ読めていません', 'node graph/forge.js scale "<願い>"'); return; }
  var b = setState('scales', 'ready');
  b.appendChild(el('ul', { class: 'scales' }, names.map(function (n) {
    var phases = snap.scale[n].phases;
    // 現在走行中の run が乗っている道を強調する
    var used = (snap.runs || []).some(function (r) { return r.scaleGuess === n || (r.scaleCandidates || []).indexOf(n) >= 0; });
    return el('li', { class: 'scale', 'data-scale': n, 'data-in-use': used ? 'true' : 'false' }, [
      el('span', { class: 'scale-name mono', text: n }),
      el('span', { class: 'scale-phases mono', text: phases + ' 相' }),
      el('span', { class: 'bar' }, [el('span', { class: 'bar-fill', style: 'width:' + (100 * phases / Math.max.apply(null, names.map(function (m) { return snap.scale[m].phases; }))) + '%' })]),
    ]);
  })));
  b.appendChild(el('p', { class: 'hint', text: '分類器: ' + (snap.scale.classifierAvailable ? '在り' : '無し') }));
  b.appendChild(sourceTag("forge.buildDag('x', '<道名>').tasks.length(第2引数は文字列)"));
}

/* ══════════════════════════════════════════════════════════
   領域 7 — 記憶(教訓 / KG)。トップは件数のみ
   ══════════════════════════════════════════════════════════ */
function renderMemory(snap) {
  var kinds = Object.keys(snap.lessonsByKind || {});
  if (!kinds.length && !snap.counts.kgNodes) {
    showEmpty('memory', '教訓はまだありません', 'node graph/kg.js remember lesson <id> "<label>" "<check>|applies:<scope>"');
    return;
  }
  var b = setState('memory', 'ready');
  b.appendChild(el('ul', { class: 'kinds' }, kinds.map(function (k) {
    return el('li', { class: 'mono', 'data-kind': k, text: k + ': ' + snap.lessonsByKind[k] });
  })));
  b.appendChild(el('p', { class: 'mono', text: 'KG ノード ' + (snap.counts.kgNodes === null ? '測れず' : snap.counts.kgNodes) +
    ' / エッジ ' + (snap.counts.kgEdges === null ? '測れず' : snap.counts.kgEdges) }));
  b.appendChild(sourceTag('lessons.exportLessons(<一時ファイル>) / JSONL 直読み'));
}

/* ══════════════════════════════════════════════════════════
   領域 8 — 全画面への索引 (FR-19)。断面の atlas[] から描く。静的リンクを書かない
   ══════════════════════════════════════════════════════════ */
function renderAtlas(snap) {
  var b = setState('atlas-index', 'ready');
  var links = [el('li', {}, [el('a', { href: 'control.html', text: '深掘り — 門の内訳・KG・教訓・履歴の全件' })])];
  var atlas = snap.atlas || [];
  atlas.forEach(function (a) {
    if (!a.exists) return;                            // 実在するものだけ描く = 死リンクが構造的に生まれない
    links.push(el('li', {}, [el('a', { href: a.href, text: '図 — ' + a.name })]));
  });
  b.appendChild(el('ul', { class: 'atlas' }, links));
  if (!atlas.length) {
    b.appendChild(el('p', { class: 'note', 'data-field': 'atlas-empty', text: '図はまだ生成されていません' }));
    b.appendChild(el('p', { class: 'hint mono', text: 'node graph/atlas.js all で 6 枚を作れます' }));
  }
  b.appendChild(sourceTag('dashboard/atlas の実在ファイル(断面の atlas[])'));
}

/* ══════════════════════════════════════════════════════════
   断面をすべての領域へ配る
   ══════════════════════════════════════════════════════════ */
var lastOkMs = null;

function render(snap, transport) {
  if (snap && typeof window !== 'undefined') window.__lastSnap = snap;
  renderTop(snap, transport);
  if (!snap) return;
  lastOkMs = Date.now();
  try { renderRuns(snap); } catch (e) { showError('running-ring', 'conclave', e.message, lastOkMs); }
  try { renderScores(snap); } catch (e) { showError('runs-score', 'gauge', e.message, lastOkMs); }
  try { renderGates(snap); } catch (e) { showError('gates', 'wiring', e.message, lastOkMs); }
  try { renderCounts(snap); } catch (e) { showError('counts', 'codex', e.message, lastOkMs); }
  try { renderDaily(snap); } catch (e) { showError('daily', 'daily-guard', e.message, lastOkMs); }
  try { renderScales(snap); } catch (e) { showError('scales', 'forge', e.message, lastOkMs); }
  try { renderMemory(snap); } catch (e) { showError('memory', 'lessons', e.message, lastOkMs); }
  try { renderAtlas(snap); } catch (e) { showError('atlas-index', 'atlas', e.message, lastOkMs); }

  // errors[] が名指しした鍵のパネルだけを error にする。全画面を落とさない
  (snap.errors || []).forEach(function (er) {
    var key = String(er.key || '');
    if (key.indexOf('counts.') === 0) showError('counts', engineName(er.engine), er.reason, lastOkMs);
    else if (key.indexOf('gates[') === 0) showError('gates', engineName(er.engine), er.reason, lastOkMs);
    else if (key === 'daily') showError('daily', engineName(er.engine), er.reason, lastOkMs);
    else if (key === 'scale') showError('scales', engineName(er.engine), er.reason, lastOkMs);
    else if (key === 'ledger') { /* 領域 2 の内側が自分で error を出す */ }
  });
}

/* ══════════════════════════════════════════════════════════
   三層フォールバック (FR-08 / §3)
   ══════════════════════════════════════════════════════════ */
function logLine(text) {
  var box = document.querySelector('[data-log="transport"]');
  if (!box) return;
  var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
  var line = el('li', { class: 'mono', text: p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + ' ' + text });
  box.insertBefore(line, box.firstChild);
  while (box.children.length > TH.LOG_KEEP) box.removeChild(box.lastChild);
}

function setDisconnected(reason) {
  // スピナーを出さない。待っている対象を名指しする
  ['running-ring', 'runs-score', 'gates', 'counts', 'daily', 'scales', 'memory', 'atlas-index'].forEach(function (n) {
    var p = panel(n);
    if (p && p.getAttribute('data-state') !== 'ready') {
      var b = setState(n, 'disconnected', 'pulse.serve');
      if (b) {
        b.appendChild(el('p', { class: 'note', text: '生(SSE)が切れました — ' + reason }));
        b.appendChild(el('p', { class: 'hint', text: 'タブを多く開いていると、ブラウザの同時接続の上限で以降のタブが繋がりません(上限の値と説明は画面上部に在る)。他のタブを閉じるか、そのままポーリングでご覧ください' }));
      }
    }
  });
}

function start() {
  var transport = 'frozen';
  var es = null, pollTimer = null, firstEventTimer = null, promoteTimer = null;
  var errStreak = 0, pollFails = 0;

  function stopSSE() {
    if (es) { try { es.close(); } catch (e) { /* 既に閉じていればよい */ } es = null; }
    clearTimeout(firstEventTimer); firstEventTimer = null;
  }
  function stopPoll() { clearInterval(pollTimer); pollTimer = null; }

  /* ── 第3層: window.PARADISE_STATE。<script src> は CORS を経由しない ── */
  function toFrozen(reason) {
    stopSSE(); stopPoll();
    // 既に凍結しているなら二度告げない。飛行中のポーリングが 2 本残っていると
    // 同じ降格が 2 行ログに載り、神は「2 回落ちた」と読む(実測で 2 行出た)
    if (transport === 'frozen') { schedulePromote(); return; }
    transport = 'frozen';
    logLine('凍結(埋め込み JS)へ降格(理由: ' + reason + ')');
    var st = (typeof window !== 'undefined') ? window.PARADISE_STATE : null;
    if (st && st.generatedAt) {
      // 旧 state.js は断面ではない。凍結として正直に描ける最小限だけを渡す
      var ms = Date.parse(st.generatedAt);
      render({
        generatedAtMs: isFinite(ms) ? ms : Date.now() - TH.FRESH_FROZEN_MS - 1,
        counts: {}, gates: [], runs: [], scale: {}, lessonsByKind: {},
        ledger: null, daily: null, atlas: [], census: null, errors: [],
      }, 'frozen');
    } else {
      render(null, 'frozen');
    }
    setDisconnected(reason);
    schedulePromote();
  }

  /* ── 第2層: fetch ポーリング ── */
  function toPoll(reason) {
    stopSSE();
    if (transport === 'poll') return;
    transport = 'poll';
    logLine('2秒ごと(ポーリング)へ降格(理由: ' + reason + ')');
    pollFails = 0;
    if (typeof fetch !== 'function') { toFrozen('fetch が使えません'); return; }
    var tick = function () {
      fetch(base() + '/snapshot.json', { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (snap) { pollFails = 0; render(snap, 'poll'); })
        .catch(function (e) {
          pollFails++;
          // file:// からの fetch は Chrome では network error(TypeError)になる
          if (e instanceof TypeError || pollFails >= TH.ERROR_STREAK) toFrozen('サーバに届きません(' + pollFails + ' 回連続)');
        });
    };
    tick();
    stopPoll();
    pollTimer = setInterval(tick, TH.POLL_INTERVAL_MS);
    schedulePromote();
  }

  /* ── 第1層: EventSource。再接続は EventSource の既定動作に任せる ── */
  function toSSE() {
    if (typeof EventSource !== 'function') { toPoll('EventSource が使えません'); return; }
    stopSSE();
    try { es = new EventSource(base() + '/events'); } catch (e) { toPoll('EventSource を張れませんでした'); return; }
    // open だけを見る実装は、接続上限に当たった 7 枚目のタブで永久に空白を出す
    firstEventTimer = setTimeout(function () {
      if (transport !== 'sse') toPoll('最初のイベントが ' + (TH.FIRST_EVENT_TIMEOUT_MS / 1000) + ' 秒来ませんでした');
    }, TH.FIRST_EVENT_TIMEOUT_MS);
    es.addEventListener('snapshot', function (ev) {
      clearTimeout(firstEventTimer); firstEventTimer = null;
      errStreak = 0;
      if (transport !== 'sse') { transport = 'sse'; logLine('生(SSE)へ昇格'); stopPoll(); }
      try { render(JSON.parse(ev.data), 'sse'); } catch (e) { /* 壊れた 1 通で画面を落とさない */ }
    });
    es.onerror = function () {
      errStreak++;
      if (errStreak >= TH.ERROR_STREAK) toPoll('接続が ' + errStreak + ' 回連続で切れました');
    };
  }

  /** 一度落ちた画面が二度と戻らないなら、それは画面が嘘をついている状態である */
  function schedulePromote() {
    clearTimeout(promoteTimer);
    promoteTimer = setTimeout(function () {
      if (transport !== 'sse') { logLine('生(SSE)への再挑戦'); toSSE(); }
      schedulePromote();
    }, TH.PROMOTE_RETRY_MS);
  }

  // 起動時: どの層にも入る前は loading。待っている対象を名指しする
  ['running-ring', 'runs-score', 'gates', 'counts', 'daily', 'scales', 'memory', 'atlas-index'].forEach(function (n) {
    var b = setState(n, 'loading', 'pulse');
    if (b) b.appendChild(el('p', { class: 'note', text: 'pulse を待っています(断面の到着待ち)' }));
  });
  logLine('起動 — 生(SSE)を試みます');
  toSSE();
  // 鮮度は経路が落ちても止めない。経過秒は嘘をつけない
  setInterval(function () {
    var root = document.querySelector('[data-transport]');
    if (root && window.__lastSnap) renderTop(window.__lastSnap, root.getAttribute('data-transport'));
  }, 1000);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TH, freshnessOf, relTime, localStamp, durationText, resolvePort };
} else if (typeof document !== 'undefined') {
  // ■ **閾値と経路の解決は一箇所から配る** (F-6 / 第50条)
  //   control.html は同じ規則を写経していた —— DEFAULT_PORT も POLL_MS も
  //   base() も別々に書かれ、**片方を直しても他方は古いまま残る**形だった。
  //   ここで窓を開け、control.html はこれを読む。
  //   関数ではなく値と純関数だけを渡す(描画は各画面のもの)。
  window.PARADISE = {
    TH: TH,
    base: base,
    freshnessOf: freshnessOf,
    relTime: relTime,
    localStamp: localStamp,
    durationText: durationText,
    resolvePort: resolvePort,
  };
  // ■ start() は「楽園の門」(index.html) の画面を組み立てる。
  //   同じ script を読むだけの画面で走らせてはならない —— 存在しないパネルを
  //   触りに行き、SSE も勝手に張る。**自分の画面かどうかを名指しで確かめる**。
  var isGate = !!document.querySelector('[data-transport]');
  if (isGate) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
}
