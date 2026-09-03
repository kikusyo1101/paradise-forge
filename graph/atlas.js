#!/usr/bin/env node
'use strict';
/**
 * atlas.js — 楽園が己の姿を図にする (憲法 第47条)
 *
 * 神が問うた:「オーケストレーションとサブエージェントの関係を図にせよ」。
 * 楽園は散文で階層を語ってきたが、**散文は歩けない**。誰が誰を呼び、どこで
 * 差し戻され、何が並列で走るのかは、読むより見る方が速い。
 *
 * ゆえに atlas は「楽園の真実 → 図の中間表現(JSON IR)」を作る engine である。
 * 描くのは atlas ではない — 描画は `overlay/vendor/archify` (MIT, v2.16.0) が
 * 決定的に行う。**結合面はコードではなくスキーマに置く**。上流が壊れたとき
 * 直すのはここだけで済み、しかも archify の validate が壊れた瞬間に赤で鳴る。
 *
 * ⚠️ atlas は事実を持たない。位階は clergy.js、道は forge.js、環は conclave.js
 * だけが知っている。ここに数や名を写経すれば、それは即座に古びる
 * (第29条「生成物は真実の写しであって真実ではない」の作図版)。
 *
 *   node graph/atlas.js subjects                 描ける主題の一覧
 *   node graph/atlas.js ir <subject> [--out f]   JSON IR を吐く(描かない)
 *   node graph/atlas.js draw <subject> [--out f] IR を作り archify で HTML にする
 *   node graph/atlas.js all [--outdir d]         全主題を描く
 *   node graph/atlas.js check                    門: 全主題が 9/9 で通るか (exit 1 = 赤)
 *
 * 主題 (subject):
 *   hierarchy  位階図      — 神→教主→枢機卿→神官→信徒、執行官は独立   [architecture]
 *   conclave   大きな環    — ドメイン間 PDCA と批准/差戻し             [workflow v2]
 *   dispatch   発令の連鎖  — 一つの wave が神から信徒まで降り、証拠が昇る [sequence]
 *   dag        道の全形    — forge の SDLC DAG を層化して描く            [architecture]
 *   run        走行の相    — 相の状態機械 (pending→done→ratify/rework)  [lifecycle]
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const clergy = require('./clergy.js');
const forge = require('./forge.js');
const wiring = require('./wiring.js');

const ROOT = path.resolve(__dirname, '..');
const ARCHIFY = path.join(ROOT, 'overlay', 'vendor', 'archify', 'bin', 'archify.mjs');
const OUTDIR = path.join(ROOT, 'dashboard', 'atlas');
// 動きの検器 (第50条)。CJS からは呼べない ESM なので、門は子として走らせる。
const PROBE = path.join(ROOT, 'graph', 'motion-probe.mjs');

/** 主題 → 図の種別。archify のどの道具で描くかは主題の性質が決める。 */
const SUBJECTS = {
  hierarchy: { type: 'architecture', title: '楽園の位階 — 誰が誰を呼ぶか' },
  conclave:  { type: 'workflow',     title: '大いなる環 — ドメイン間PDCAと批准' },
  dispatch:  { type: 'sequence',     title: '発令の連鎖 — 神託から信徒、そして証拠' },
  // `scroll: true` = 第一画面に収まらないことを**最初から認めた**主題。
  // 相17・深さ10の DAG は、どう詰めても 1440x900 に入らない — それは配置の
  // 下手さではなく図の大きさそのものである(第47条(c))。巻物として読む。
  dag:       { type: 'architecture', title: '道の全形 — forge の SDLC DAG', scroll: true },
  run:       { type: 'lifecycle',    title: '相の一生 — 走行状態の機械' },
  // 結線もまた「収まらないと最初から認めた」主題である。engine は 30 を超え、
  // 段の一つに十以上が並ぶ — それは配置の下手さではなく機構の数そのものである。
  wiring:    { type: 'architecture', title: '結線の相関 — engine が engine を呼ぶ', scroll: true },
};

// ── 版元の情報 (第20条(c): 借りたものは必ず出典を刻む) ────────────────
const VENDOR_NOTE = 'archify v2.16.0 (MIT, tt-a1i) — overlay/vendor/archify';

/** archify の id は英数と _- のみ。楽園の相名(build-ui 等)はそのまま通る。 */
const idOf = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^[^a-zA-Z]/, 'p$&');

/** 位階 → archify の見た目の型。判断する者は security、作る者は backend。 */
const RANK_TYPE = {
  god: 'external', pontiff: 'security', cardinal: 'security',
  priest: 'backend', believer: 'frontend', executor: 'security',
};

// ══════════════════════════════════════════════════════════════════════
// 主題 1: hierarchy — 位階図
// ══════════════════════════════════════════════════════════════════════
function irHierarchy() {
  const college = Object.entries(clergy.COLLEGE);
  // 枢機卿6名+執行官で7列。1440px の卓上で字が読める幅に収める必要があり、
  // 描画器が desktop-readability で実測して鳴く — 箱を広げるのではなく
  // **文言を短くする**のが正しい直し方である(第18条: 表層は実測で裁かれる)。
  const W = 132, H = 62, GAP_Y = 124;
  const components = [], connections = [];

  // 縦に位階、横に枢機卿団。枢機卿の数が増えても式が並べ直す(写経しない)。
  const colX = (i) => 40 + i * 152;
  const centerX = colX((college.length - 1) / 2);

  const rankNode = (id, rank, label, sublabel, x, y, tag) => {
    components.push({ id, type: RANK_TYPE[rank], label, sublabel, pos: [Math.round(x), y], size: [W, H], ...(tag ? { tag } : {}) });
  };

  // 箱に収まる名が要る。勝手な略称を作らず、正典の**和名**を使う
  // (第41条: 名の出所は LEXICON ただ一つ)。
  const ja = (k) => clergy.LEXICON.ranks[k].ja;
  rankNode('god', 'god', ja('god'), '神託を降す', centerX, 30, 'L0');
  rankNode('pontiff', 'pontiff', ja('pontiff'), clergy.RANKS.pontiff.model, centerX, 30 + GAP_Y, 'L1');

  for (let i = 0; i < college.length; i++) {
    const [name, c] = college[i];
    const id = idOf('c-' + name);
    rankNode(id, 'cardinal', clergy.LEXICON.college[name].ja, `${c.governs.length}相 / ${c.work}`, colX(i), 30 + GAP_Y * 2, 'L2');
    // 「発令」は端点(教主→枢機卿)が完全に含意するので語らない。扇状に開く
    // 6本の間に文字を押し込めば隣の線に2pxまで迫る — 意味の重複を消すのが
    // 正しく、線を歪めるのは誤りである(archify: label-preserving repair order)。
    connections.push({ id: idOf('dispatch-' + name), from: 'pontiff', to: id, fromSide: 'bottom', toSide: 'top' });
  }

  // 神官と信徒は「層」として置く — 個体を全部描けば12を超え、主路が読めなくなる。
  const priests = clergy.allPriests().filter(p => !clergy.TRIBUNAL.officers.includes(p));
  const believers = clergy.allBelievers();
  rankNode('priests', 'priest', ja('priest'), `${priests.length}名 / ${clergy.RANKS.priest.model}`, centerX, 30 + GAP_Y * 3, 'L3');
  rankNode('believers', 'believer', ja('believer'), `${believers.length}名 / ${clergy.RANKS.believer.model}`, centerX, 30 + GAP_Y * 4, 'L4');
  // 執行官は枢機卿団の**外**、同じ高さの右端に立つ。位階の柱に混ぜれば
  // 発令線と交差し、図そのものが「独立」を否定してしまう。
  // 執行官は枢機卿団の枠から**目に見えて離す**。実際に描いて見たところ、
  // 隣に置くと破線の枠が執行官の箱に届いて見え、**図が「独立」という己の
  // 主張を裏切っていた**。静的な検査はこれを咎めない — 幾何は正しいからだ。
  // 意味の破れは、開いて見るまで分からない(第47条・第18条)。
  rankNode('tribunal', 'executor', ja('executor'), `${clergy.TRIBUNAL.officers.length}名 / 断罪`, colX(college.length) + 56, 30 + GAP_Y * 3, '独立');

  connections.push({ id: 'god-pontiff', from: 'god', to: 'pontiff', variant: 'emphasis' });
  for (let i = 0; i < college.length; i++) {
    connections.push({ id: idOf('marshal-' + college[i][0]), from: idOf('c-' + college[i][0]), to: 'priests', fromSide: 'bottom', toSide: 'top', ...(i === 0 ? { label: `起動(${clergy.SPAWN_TOOL})`, labelDy: 34 } : {}) });
  }
  connections.push({ id: 'priest-believer', from: 'priests', to: 'believers', label: `並列 ≤${clergy.EFFECTIVE_CONCURRENT}`, variant: 'dashed', labelDy: 34 });
  connections.push({ id: 'summon-tribunal', from: 'pontiff', to: 'tribunal', label: '召喚 / 裁定', variant: 'security', fromSide: 'bottom', toSide: 'top' });

  const bottom = 30 + GAP_Y * 4 + H;
  return {
    schema_version: 1, diagram_type: 'architecture',
    meta: {
      title: SUBJECTS.hierarchy.title, quality_profile: 'showcase',
      viewBox: [colX(college.length) + W + 96, bottom + 40],
      views: [
        { id: 'chain-of-command', label: '指揮系統', focus: ['god', 'pontiff', ...college.map(([n]) => idOf('c-' + n)), 'priests', 'believers'], note: '神託が降り、教主が枢機卿に発令し、枢機卿が神官を起動する。' },
        { id: 'independence', label: '執行官の独立', focus: ['pontiff', 'tribunal'], note: '執行官はいずれの枢機卿にも属さない。断罪の門でのみ召喚される。' },
      ],
    },
    components,
    boundaries: [{ kind: 'region', label: `枢機卿団 (College of Cardinals) — ${college.length}名`, wraps: college.map(([n]) => idOf('c-' + n)) }],
    connections,
    cards: [
      // 札は3枚・各3行まで。実ブラウザで測ると札が1枚増えるごとに約150px
      // 伸び、1440x900 を溢れる(visual-check が viewport-overflow で鳴く)。
      // 図は第一画面に収まってこそ図である — 註釈で画面を埋めない。
      { dot: 'cyan', title: '位階とモデル (第31条)', items: Object.entries(clergy.RANKS).filter(([, r]) => r.model).slice(0, 3).map(([k, r]) => `${clergy.title(k)}: ${r.model}${r.effort ? ' / ' + r.effort : ''}`) },
      { dot: 'rose', title: '起動の権能 (第25条)', items: [`道具 ${clergy.SPAWN_TOOL} / 深さ上限 ${clergy.MAX_SPAWN_DEPTH}`, `実用並列度 ${clergy.EFFECTIVE_CONCURRENT} (天井 ${clergy.RUNTIME_CONCURRENT})`] },
      { dot: 'amber', title: `${clergy.title('executor')} の独立`, items: [clergy.TRIBUNAL.officers.join(' / '), 'いずれの枢機卿にも属さない', '裁定は拘束力を持つ'] },
    ],
  };
}

// ══════════════════════════════════════════════════════════════════════
// 主題 2: conclave — 大きな環 (ドメイン間 PDCA)
// ══════════════════════════════════════════════════════════════════════
function irConclave(scale) {
  const dag = forge.buildDag('<神託>', scale);
  const order = [];
  for (const t of dag.tasks) { const c = clergy.cardinalFor(t.id); if (c && !order.includes(c)) order.push(c); }
  // workflow v2 は列 0..5 しか持たない。ドメインは実測で最大6 — ちょうど収まる。
  if (order.length > 6) throw new Error(`domains=${order.length} > workflow v2 の列上限6。主題 dag を使うこと`);

  const info = (c) => c === 'tribunal'
    ? { domain: clergy.TRIBUNAL.domain, governs: clergy.TRIBUNAL.governs, reviewClass: 'god', work: 'review' }
    : clergy.COLLEGE[c];

  /**
   * ドメインが一つしかない道(諐問)では、外の環が「一箱」に潰れる。
   * 実測すると幅が狭いぶん viewer が拡大し、実ブラウザで 1394px に間延びした。
   * だがこれは幾何の問題ではない — **一つのドメインしかない道に「ドメイン間の
   * 環」を描くこと自体が嘘に近い**。その道の環は相と相の間にある。
   * ゆえにその場合は相を列に並べ、内の環(枢機卿のPDCA)を描く。
   * 図の主題は、対象の形に従って選ぶものである。
   */
  const single = order.length === 1;
  const nodes = [], edges = [];
  if (single) {
    const c = order[0], d = info(c);
    const phases = dag.tasks.filter(t => clergy.cardinalFor(t.id) === c);
    phases.slice(0, 6).forEach((t, i) => {
      nodes.push({ id: idOf('p-' + t.id), lane: 'conclave', col: i, type: t.gate ? 'security' : 'backend',
        label: t.id, sublabel: t.agent, ...(t.gate ? { tag: '⚖ 門' } : {}), width: 132 });
      if (i > 0) edges.push({ id: idOf('seq-' + t.id), from: idOf('p-' + phases[i - 1].id), to: idOf('p-' + t.id), variant: 'emphasis' });
    });
    nodes.push({ id: 'ratify', lane: 'ratify', col: Math.min(5, phases.length - 1), type: 'security', label: '批准', sublabel: d.reviewClass, width: 132 });
    nodes.push({ id: 'rework', lane: 'rework', col: 0, type: 'messagebus', label: '差戻し', sublabel: `上限 ${require('./conclave.js').MAX_DOMAIN_REWORK} 回`, width: 132 });
    edges.push({ id: 'to-ratify', from: idOf('p-' + phases[Math.min(5, phases.length - 1)].id), to: 'ratify', variant: 'security' });
    edges.push({ id: 'reject', from: 'ratify', to: 'rework', label: '否認', variant: 'security', role: 'error' });
    edges.push({ id: 'reopen', from: 'rework', to: idOf('p-' + phases[0].id), label: '相を再び開く', variant: 'dashed', role: 'branch' });
    return {
      schema_version: 2, diagram_type: 'workflow',
      meta: {
        title: `内なる環 — ${d.domain} の相と批准 (scale: ${scale})`, quality_profile: 'showcase',
        views: [
          { id: 'phases', label: '相の連なり', focus: phases.slice(0, 6).map(t => idOf('p-' + t.id)), note: 'ドメインが一つの道では、環は相と相の間にある。' },
          { id: 'ring', label: '差戻しの環', focus: ['ratify', 'rework'], note: `否認は相を巻き戻す。${require('./conclave.js').MAX_DOMAIN_REWORK} 回を超えれば blocked。` },
        ],
      },
      lanes: [
        { id: 'conclave', label: `${d.domain} の相` },
        { id: 'ratify', label: '批准 — 適切なクラス' },
        { id: 'rework', label: '差戻し', variant: 'exception' },
      ],
      mainPath: phases.slice(0, 6).map(t => idOf('p-' + t.id)),
      nodes, edges,
      cards: [
        { dot: 'cyan', title: '内の環 (第11条)', items: ['ドメインが一つの道では外の環は現れない', '環は相と相の間にある — 枢機卿のPDCA', `審査は ${d.reviewClass} が行う`] },
      ],
    };
  }
  order.forEach((c, i) => {
    const d = info(c);
    const phases = dag.tasks.filter(t => clergy.cardinalFor(t.id) === c).map(t => t.id);
    nodes.push({
      id: idOf('d-' + c), lane: 'conclave', col: i,
      type: c === 'tribunal' ? 'security' : 'backend',
      // 文言は短く。相の一覧は札(cards)に載せる — 事実は捨てず、幅だけ譲る。
      label: d.domain.replace(/\s*\(.*\)$/, ''), sublabel: `${phases.length}相`,
      tag: (clergy.PARALLEL_SAFE[d.work] || {}).parallel ? '並列可' : '逐次', width: 132,
    });
    nodes.push({
      id: idOf('r-' + c), lane: 'ratify', col: i, type: 'security',
      label: '批准', sublabel: d.reviewClass, width: 132,
    });
    // 批准は真下に垂れ、前進は真横に走る。斜めの前進を描くと批准の縦線と
    // 同じ廊下を奪い合い、描画器が ambiguous-corridor で正しく鳴く。
    edges.push({ id: idOf('rat-' + c), from: idOf('d-' + c), to: idOf('r-' + c), variant: 'security' });
    if (i > 0) edges.push({ id: idOf('adv-' + c), from: idOf('d-' + order[i - 1]), to: idOf('d-' + c), variant: 'emphasis', label: i === 1 ? '批准で前進' : undefined });
  });
  const last = order[order.length - 1];
  // 差戻しは最後のドメインの**隣**に置く。列5に固定していたら、ドメインが
  // 一つしかない諐問の道で右と下に巨大な空白が生まれ、実ブラウザで 1375px に
  // 間延びした。空の列は「そこに何かある」と読み手に誤解させる — 図の余白は
  // 意味を持つので、意味のない余白を作らない。
  nodes.push({ id: 'rework', lane: 'rework', col: Math.min(5, order.length), type: 'messagebus', label: '差戻し', sublabel: `上限 ${require('./conclave.js').MAX_DOMAIN_REWORK} 回`, width: 132 });
  edges.push({ id: 'reject', from: idOf('r-' + last), to: 'rework', label: '否認', variant: 'security', role: 'error' });
  // 差戻しは上流のドメインを再び開く。環はここで閉じる。
  edges.push({ id: 'reopen', from: 'rework', to: idOf('d-' + order[0]), label: '上流を再び開く', variant: 'dashed', role: 'branch' });

  return {
    schema_version: 2, diagram_type: 'workflow',
    meta: {
      title: `${SUBJECTS.conclave.title} (scale: ${scale})`, quality_profile: 'showcase',
      views: [
        { id: 'great-ring', label: '大いなる環', focus: order.map(c => idOf('d-' + c)), note: 'ドメインは依存順に開かれ、批准を得たものだけが次を開く。' },
        { id: 'appropriate-class', label: '適切なクラスの審査', focus: order.map(c => idOf('r-' + c)), note: 'いかなるドメインも自らを批准しない。審査者は clergy.js が定める。' },
        { id: 'send-back', label: '差戻しの環', focus: [idOf('r-' + last), 'rework'], note: '否認は下流を巻き戻し、批准済みのドメインですら再び開く。' },
      ],
    },
    lanes: [
      { id: 'conclave', label: '枢機卿団 (ドメイン)' },
      { id: 'ratify', label: '批准 — 適切なクラス' },
      { id: 'rework', label: '差戻し', variant: 'exception' },
    ],
    // mainPath は2点以上でなければならない。諐問の道はドメインが一つしか
    // 無く(counsel 枢機卿が6相すべてを統べる)、素朴に写すと1点になる。
    // その場合は「ドメイン → その批准」を主路とする — 環はそこにある。
    mainPath: order.length > 1 ? order.map(c => idOf('d-' + c)) : [idOf('d-' + order[0]), idOf('r-' + order[0])],
    nodes, edges,
    cards: [
      { dot: 'cyan', title: '二重の環 (第11条)', items: ['外の環: ドメイン間 — 開く/批准/差戻し', '内の環: 枢機卿ごとの相の PDCA', '内の環は外から見えない — それが階層である'] },
      { dot: 'rose', title: '自らを批准しない', items: order.slice(0, 3).map(c => `${info(c).domain} ← ${info(c).reviewClass}`) },
    ],
  };
}

// ══════════════════════════════════════════════════════════════════════
// 主題 3: dispatch — 発令の連鎖 (これが神の問うた「関係性」の核)
// ══════════════════════════════════════════════════════════════════════
function irDispatch(phaseId) {
  const plan = clergy.marshalPlan(phaseId, { priestCanSpawn: true });
  if (!plan.cardinal) throw new Error(`統べる枢機卿の居ない相: ${phaseId}`);
  const believer = plan.believers[0] || null;

  // 参加者の名は箱(86px)に収まらねばならない。ゆえに正典の**和名**を使う
  // (第41条: 名の出所は LEXICON 一つ。短くするために勝手な異名を作らない)。
  const ja = (k) => clergy.LEXICON.ranks[k].ja;
  const participants = [
    { id: 'god', type: 'external', label: ja('god'), sublabel: '神託を降す' },
    { id: 'pontiff', type: 'security', label: ja('pontiff'), sublabel: 'conclave' },
    { id: 'cardinal', type: 'security', label: ja('cardinal'), sublabel: plan.cardinal },
    { id: 'priest', type: 'backend', label: ja('priest'), sublabel: plan.priest },
    ...(believer ? [{ id: 'believer', type: 'frontend', label: ja('believer'), sublabel: believer }] : []),
    { id: 'contract', type: 'messagebus', label: '照合', sublabel: 'contract.js' },
    { id: 'tribunal', type: 'security', label: ja('executor'), sublabel: '断罪機関' },
  ];

  const M = [];
  // 行間は実ブラウザの高さを決める。42px では 1516px になり 1440x900 を溢れた。
  // 描画器は 28px を下限とするので、それ以上は**行数を減らす**しかない —
  // 縮められない図は、語ることを減らして縮める(第47条(c)の別形)。
  const STEP = 29;
  let y = 160;                                   // 描画器が課す下限
  const push = (from, to, label, variant) => { M.push({ id: idOf(`m-${from}-${to}-${M.length}`), from, to, y, label, variant }); y += STEP; };
  // 戻りの行は、端点が完全に含意するものを畳んである。図が語るべきは
  // 「誰が誰を呼ぶか」であって、往復の全ての足跡ではない。
  push('god', 'pontiff', '神託', 'emphasis');
  push('pontiff', 'cardinal', `wave: ${phaseId} を発令`, 'emphasis');
  push('cardinal', 'priest', `起動(${clergy.SPAWN_TOOL}) + 契約`, 'default');
  if (believer) push('priest', 'believer', `細分 (${plan.execution.parallel ? '並列 ≤' + plan.execution.limit : '逐次'})`, plan.execution.parallel ? 'default' : 'dashed');
  push('priest', 'cardinal', '{phase,status,artifact,evidence}', 'return');
  push('cardinal', 'contract', '実物と突き合わせ fail-closed', 'security');
  push('cardinal', 'pontiff', '批准を請う', 'return');
  push('pontiff', 'tribunal', '召喚 → SHIP / REWORK / BLOCK', 'security');
  push('pontiff', 'god', '答えのみ', 'return');
  const bottom = y + 20;

  const seg = (from, to, label) => ({ from, to, label });
  return {
    schema_version: 1, diagram_type: 'sequence',
    meta: {
      title: `${SUBJECTS.dispatch.title} (相: ${phaseId})`, quality_profile: 'showcase',
      viewBox: [860, bottom + 60], column_fit: 'spread',
      views: [
        { id: 'descend', label: '降りる発令', focus: ['god', 'pontiff', 'cardinal', 'priest'], note: '教主は神官を直接呼ばない。枢機卿を素通りした瞬間、階層は宣言だけになる。' },
        { id: 'ascend', label: '昇る証拠', focus: ['priest', 'cardinal', 'contract'], note: '「できました」は主張であって証拠ではない。実物と照合してから昇る。' },
        { id: 'judgment', label: '断罪', focus: ['pontiff', 'tribunal', 'god'], note: '執行官はいずれの枢機卿にも属さず、その裁定は拘束力を持つ。' },
      ],
    },
    participants,
    segments: [seg(146, 280, '発令 (降りる)'), seg(296, Math.max(320, bottom - 160), '実務と照合 (昇る)'), seg(Math.max(340, bottom - 144), bottom - 20, '断罪と返答')],
    messages: M,
    activations: [
      { participant: 'pontiff', from: 162, to: bottom - 22, type: 'security' },
      { participant: 'cardinal', from: 196, to: bottom - 106, type: 'security' },
      { participant: 'priest', from: 230, to: bottom - 162, type: 'backend' },
      ...(believer ? [{ participant: 'believer', from: 264, to: 306, type: 'frontend' }] : []),
    ],
    cards: [
      { dot: 'cyan', title: `この相の編成 (${phaseId})`, items: [`枢機卿 ${plan.domain} / 神官 ${plan.priest}`, `信徒: ${plan.believers.join(', ') || '(無し)'} — ${plan.execution.parallel ? '並列可 上限' + plan.execution.limit : '逐次'}`] },
      { dot: 'amber', title: '契約に必ず載るもの (第26条)', items: ['purpose / output_format / boundary', 'evidence_required / done_when / if_unclear'] },
    ],
  };
}

// ══════════════════════════════════════════════════════════════════════
// 層化グラフ配置器 — 「依存の絵」を描く者は皆これを使う
//
// 道(dag)と結線(wiring)は、見た目こそ違うが**同じ問題**である:
// 有向グラフを段に分け、席を並べ、交差を減らし、段飛ばしの辺を直角に縫う。
// ここを写経で二つに増やせば、片方だけが直った日に図が食い違う。
// ゆえに配置は一箇所に住み、主題はデータを渡すだけにする (第29条の作図版)。
//
//   layered(items, opts) → { posOf, depth, byDepth, edges, minCrossings, size }
//     items: [{ id, deps: [id...] }]  — 事実は呼び手が engine から読む
// ══════════════════════════════════════════════════════════════════════
function layered(items, opts = {}) {
  const W = opts.W || 148, H = opts.H || 58, COL = opts.COL || 178, ROW = opts.ROW || 132;
  const PAD_L = opts.PAD_L != null ? opts.PAD_L : 40, PAD_T = opts.PAD_T != null ? opts.PAD_T : 40;
  /**
   * 流れの向き。既定は縦(段が下へ降りる)。
   *
   * 向きは好みではなく**図の形が決める**。深さ3・幅15の結線を縦に流したら
   * 図幅が 2112px になり、1440 の画面に収めるための縮小で副題が 5.57px ——
   * 描画器の読みやすさの床(6px)を割った。同じ図を横に流せば、幅は段の数
   * (3)で決まり、多い方の次元が巻物の長さになる。**長い辺を巻物の向きに
   * 合わせる** — それだけで字は縮まずに済む。
   *
   * 実装は座標の入れ替えである。段は breadth(席の並ぶ軸)と depth(段の進む軸)
   * の二軸で組み、最後に向きへ写す。層化の論理は一つのまま増えない。
   */
  const horizontal = opts.flow === 'horizontal';
  // 席の広がりと段の厚み。横流しでは席は縦に並ぶので、席の広がりは箱の「高さ」。
  const SEAT = horizontal ? H : W, SEAT_PITCH = horizontal ? ROW : COL;
  // 席と席の間に必ず空ける隙間。描画器は 8px 未満を layout/constraint で咎める
  const SEAT_GAP = Math.max(12, SEAT_PITCH - SEAT);
  const SEAT_MIN = Math.max(48, Math.round(SEAT * 0.4));
  const RANK = horizontal ? W : H, RANK_PITCH = horizontal ? COL : ROW;
  const PAD_B = horizontal ? PAD_T : PAD_L;      // 席の軸の余白
  const PAD_D = horizontal ? PAD_L : PAD_T;      // 段の軸の余白
  /** breadth/depth の対を、向きに従って [x, y] へ写す。 */
  const xy = (b, d) => horizontal ? [d, b] : [b, d];
  const byId = new Map(items.map(t => [t.id, t]));
  const allDepsOf = (id) => (byId.get(id).deps || []).filter(d => byId.has(d));
  // 段が決まるまでは全ての辺を前向きとみなす。環の辺は下で名指しして外す。
  let depsOf = allDepsOf;

  /**
   * **環の辺を名指しして外す** (層化描画の第0段)。
   *
   * 層化は非循環を前提にする。だが実測すると楽園の engine には環が在った —
   * upstream.js と vendor.js は互いを require する(取り込みは上流を知り、
   * 上流は取り込みを知る)。環を無いことにすれば段が矛盾し、辺は上へ逆走し、
   * 描画器が endpoint-side-direction で正しく鳴く。
   *
   * ここでも道は三つあり、二つは不正である:
   *   ✗ 環の辺を黙って捨てる  — 図が嘘になる(相互依存は事実である)
   *   ✗ 段を無理に付け替える  — 依存の意味が変わる
   *   ✓ **後退辺として区別し、経路を描画器に委ねて描く** — 事実は残り、
   *      層化は成立する。呼び手はそれを破線で「環」と語ればよい。
   *
   * 見つけ方は深さ優先探索。段を測ってから「上へ戻る辺」を後退辺と呼ぶのでは
   * 遅い — 段そのものが環に汚染された後だからである(実測: 深さを先に測ると
   * ALAP が環越しに節点を押し下げ、健全な辺まで逆走に見えた)。
   * ゆえに **段を測る前に** 環を切る。順序は id 順で決定的にする。
   */
  const backKeys = new Set();
  {
    const WHITE = 0, GREY = 1, BLACK = 2;
    const color = {};
    for (const t of items) color[t.id] = WHITE;
    const visit = (id) => {
      color[id] = GREY;
      for (const dep of allDepsOf(id).slice().sort()) {
        if (color[dep] === GREY) backKeys.add(`${dep}->${id}`);   // 環を閉じる辺
        else if (color[dep] === WHITE) visit(dep);
      }
      color[id] = BLACK;
    };
    for (const t of [...items].sort((a, b) => a.id < b.id ? -1 : 1)) if (color[t.id] === WHITE) visit(t.id);
  }
  const back = [];
  for (const t of items) for (const dep of allDepsOf(t.id)) {
    if (backKeys.has(`${dep}->${t.id}`)) back.push({ from: dep, to: t.id });
  }
  depsOf = (id) => allDepsOf(id).filter(dep => !backKeys.has(`${dep}->${id}`));

  // ── 段(rank)を決める: まず最長経路 ────────────────────────────────
  const depth = {};
  const d = (id) => {
    if (depth[id] != null) return depth[id];
    const ds = depsOf(id);
    return depth[id] = ds.length ? Math.max(...ds.map(d)) + 1 : 0;
  };
  items.forEach(t => d(t.id));

  /**
   * 段を「できるだけ遅く」へ押し下げる (ALAP)。
   *
   * 最長経路で段を決めると、子が一つだけ深い節点が**段を飛ばす**辺を生む
   * (実測: standard の identity は深さ2、その唯一の子 build は深さ4)。
   * 段飛ばしは必ず幾何の問題を招くので、消せるものは先に消す。
   * 子を持つ節点を「最も早い子の一段上」まで押し下げれば、その辺は隣り合う段
   * になる。ALAP 順位付けは層化描画の定石であり、依存の意味は変わらない。
   */
  const children = {};
  for (const t of items) for (const dep of depsOf(t.id)) (children[dep] ||= []).push(t.id);
  for (let pass = 0; pass < items.length; pass++) {
    let moved = false;
    for (const t of [...items].sort((a, b) => depth[b.id] - depth[a.id])) {
      const kids = children[t.id];
      if (!kids || !kids.length) continue;                 // 終端は動かさない
      const want = Math.min(...kids.map(k => depth[k])) - 1;
      if (want > depth[t.id]) { depth[t.id] = want; moved = true; }
    }
    if (!moved) break;
  }

  /**
   * 広い段を折り返す道は**試して捨てた**。記録として残す。
   *
   * 15席の段を7席ずつに畳めば図の比は画面に寄る。だが実測すると、
   * 折り返した後段への辺が全て段飛ばしになり、**ダミー節点が段あたり20本**
   * まで膨れて交差が 6 → 30 に増えた。加えて折り返しは意味も壊す —
   * 同じ段の節点は「互いに依存しない」ことを示すのに、二段に分ければ
   * 読み手はそこに順序を見る。
   *
   * 図の比が画面と噛み合わないとき、直すのは配置ではなく**主題の粒度**である。
   * (irWiring は結線を持つ者だけを層に並べ、独立した engine を層の外へ出す。)
   */
  const byDepth = {};
  for (const t of items) (byDepth[depth[t.id]] ||= []).push({ id: t.id });

  /**
   * 残った段飛ばしを **ダミー節点** で刻む (Sugiyama 法の第2段)。
   *
   * 五度、幾何で誤魔化そうとして五度とも門に鳴かれた:
   *   ・真下に引けば間の段の節点を貫く          (edge-through-node)
   *   ・横辺から出せば同じ段の隣の節点を貫く      (同上)
   *   ・余白の車線は、列を降りる平凡な辺と交わる  (proper-crossing)
   *   ・車線どうしも、跨ぐ区間が半端に重なれば交わる
   * 左右2つの余白では足りないことも数で確かめた — reform の道では4本の
   * 段飛ばしが互いに衝突し、2色では塗り分けられない。
   *
   * ゆえに**幾何ではなく構造で**解く。段飛ばしの辺には、通過する各段に
   * 見えない席(ダミー)を一つ取らせる。するとその辺は「隣り合う段どうしの
   * 辺」の連なりに分解され、席順の最適化がそのまま交差の最小化になる。
   * これが層化グラフ描画の教科書解であり、小細工の要らない唯一の道である。
   */
  const skipPath = {};     // 辺key → 通過する段の席の並び
  const skipRank = {};     // 辺key → 何本目か
  /**
   * 横走りの高さは **その隙間を実際に通る辺の中での順番** で決める。
   *
   * 通し番号で決めていたら、別々の隙間を通る辺が同じ高さを与えられ、
   * 逆に同じ隙間を通る二本が同じ高さになった(実測: reform で17pxの並走)。
   * 廊下の混み具合は隙間ごとに違うのだから、車線も隙間ごとに配る。
   */
  const gapLane = {};      // `${key}@${lv}` → その隙間での順番
  for (const t of items) for (const dep of depsOf(t.id)) {
    if (depth[t.id] - depth[dep] <= 1) continue;
    const key = `${dep}->${t.id}`;
    skipRank[key] = Object.keys(skipPath).length;
    skipPath[key] = [];
    for (let lv = depth[dep] + 1; lv < depth[t.id]; lv++) {
      const node = { dummy: true, id: `__${key}__${lv}`, key, lv };
      byDepth[lv].push(node);
      skipPath[key].push(node);
    }
  }
  // 各隙間(段 lv に入る直前)を通る辺を数え、通る順に車線を配る。
  {
    const perGap = {};
    for (const [key, p] of Object.entries(skipPath)) {
      const to = key.split('->')[1];
      for (const lv of [...p.map(x => x.lv), depth[to]]) {
        (perGap[lv] ||= []).push(key);
        gapLane[`${key}@${lv}`] = perGap[lv].length - 1;
      }
    }
  }
  const isDummy = (t) => !!t.dummy;
  /** 席順の最適化のため、ダミーも「上流を持つ実体」として扱う。 */
  const upstreamOf = (t) => {
    if (!isDummy(t)) return depsOf(t.id).map(dep => {
      const p = skipPath[`${dep}->${t.id}`];
      return p && p.length ? p[p.length - 1].id : dep;
    });
    const p = skipPath[t.key], i = p.indexOf(t);
    return [i === 0 ? t.key.split('->')[0] : p[i - 1].id];
  };

  // ── 席順を決める: 交差の最小化 ────────────────────────────────────
  const perms = (arr) => arr.length <= 1 ? [arr] : arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map(r => [x, ...r]));
  const posIn = (arr, id) => arr.findIndex(t => t.id === id);
  /** 隣り合う二段の間で、辺どうしが何回交差するか。 */
  const crossings = (upper, lower) => {
    const es = [];
    for (const lo of lower) for (const u of upstreamOf(lo)) {
      const iu = posIn(upper, u); if (iu >= 0) es.push([iu, posIn(lower, lo.id)]);
    }
    let n = 0;
    for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++)
      if ((es[i][0] - es[j][0]) * (es[i][1] - es[j][1]) < 0) n++;
    return n;
  };
  const depths = Object.keys(byDepth).map(Number).sort((x, y) => x - y);
  const totalCrossings = (layers) => depths.slice(1).reduce((acc, k) => acc + crossings(layers[k - 1] || [], layers[k]), 0);
  /**
   * 段ごとに全順列を試し、改善が尽きるまで上下へ掃く。
   * 段あたりの席は実測で最大6つ — 6! = 720 通りなので**近似する理由が無い**。
   */
  /**
   * 席が7つを超えた段は、全順列(5040通り以上)を数え上げられない。
   * かつてここは **その段を素通り** していた。楽園の道では段あたり最大6席
   * だったので、誰も気づかなかった — そして結線の図(段に13席)を描いた瞬間、
   * 触られない段が交差を56本生んだ。**「起こらない」と決めつけた枝は、
   * 起こった日に黙って壊れる。**
   *
   * ゆえに広い段には教科書解(重心法)を当てる。上下の隣接段における
   * 接続先の平均位置で並べ替えるのを繰り返すと、交差は単調に減っていく。
   * 厳密ではないが、素通りよりは必ず良い。同値は元の順を保つ(決定的)。
   */
  const barycenter = (layer, up, dn) => {
    const keyOf = (t, i) => {
      const ns = [];
      for (const u of upstreamOf(t)) { const j = posIn(up, u); if (j >= 0) ns.push(j * (dn.length ? 1 : 1)); }
      for (const lo of dn) if (upstreamOf(lo).includes(t.id)) ns.push(posIn(dn, lo.id));
      return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : i;
    };
    return layer.map((t, i) => [keyOf(t, i), i, t]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]);
  };
  const sweepAll = (layers) => {
    for (let sweep = 0; sweep < 8; sweep++) {
      let improved = false;
      for (const k of (sweep % 2 === 0 ? depths : [...depths].reverse())) {
        const up = layers[k - 1] || [], dn = layers[k + 1] || [];
        const score = (order) => crossings(up, order) + crossings(order, dn);
        const cur = score(layers[k]);
        let best = layers[k], bestN = cur;
        const candidates = layers[k].length > 6 ? [barycenter(layers[k], up, dn)] : perms(layers[k]);
        for (const q of candidates) { const n = score(q); if (n < bestN) { best = q; bestN = n; } }
        // 重心法だけでは止まる場所がある(実測: 15席の段で交差13が動かなかった)。
        // 隣どうしの入れ替えを、改善が尽きるまで繰り返す — Sugiyama 法の第3段。
        // 全順列と違い O(席^2) で済み、席が幾つ増えても走る。
        if (layers[k].length > 6) {
          let cand = best, candN = bestN;
          for (let pass = 0; pass < 6; pass++) {
            let moved = false;
            for (let i = 0; i + 1 < cand.length; i++) {
              const q = [...cand]; [q[i], q[i + 1]] = [q[i + 1], q[i]];
              const n = score(q);
              if (n < candN) { cand = q; candN = n; moved = true; }
            }
            if (!moved) break;
          }
          if (candN < bestN) { best = cand; bestN = candN; }
        }
        if (bestN < cur) { layers[k] = best; improved = true; }
      }
      if (!improved) break;
    }
    return layers;
  };
  /**
   * 段ごとの最適化は**局所最適に落ちる**。実測: reform の道で、どの段を単独で
   * 並べ替えても悪化するのに、二段を同時に動かせば交差が消える配置が在った。
   * ゆえに乱択再出発を重ね、**全体の交差数**が最小の配置を採る。種を固定する
   * ので出力は決定的である — 乱数で図が揺れれば、それは真実の写しではない(第29条)。
   */
  let rng = 20260901;
  const rand = () => (rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const snapshot = (l) => Object.fromEntries(depths.map(k => [k, [...l[k]]]));
  let bestLayers = snapshot(sweepAll(byDepth)), bestTotal = totalCrossings(bestLayers);
  for (let restart = 0; restart < 40 && bestTotal > 0; restart++) {
    const trial = snapshot(bestLayers);
    for (const k of depths) trial[k] = trial[k].map(v => [rand(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
    sweepAll(trial);
    const n = totalCrossings(trial);
    if (n < bestTotal) { bestTotal = n; bestLayers = snapshot(trial); }
  }
  for (const k of depths) byDepth[k] = bestLayers[k];

  // ── 座標を与える ──────────────────────────────────────────────────
  const maxRow = Math.max(...Object.values(byDepth).map(a => a.length));
  const lvOf = (t) => t.lv !== undefined ? t.lv : depth[t.id];
  /**
   * 席の中心座標。ダミーも実体と同じ幅の席を占める — 席を細くすると辺が
   * 斜めに逃げ、直交が崩れる。
   *
   * ただしダミーの縦走りは**列の中心から半歩ずらす**。中心に置くと、上下の
   * 段で同じ列に立つ節点の縦線と同じ x を共有し、描画器が ambiguous-corridor
   * で鳴いた(実測17px の並走)。ダミーは箱を持たないので、席の中でずれても
   * 何も貫かない — これが「見えない席」の利点である。
   * ずらし幅は辺ごとに変える。同じ段に二本のダミーが並ぶとき、同じ幅だけ
   * ずらせば結局また並走する。
   *
   * そして幅は**席の幅から導く**。40px と固定していたら、席が 112px しか
   * 無い結線の図でダミーが隣の席まではみ出し、無関係の箱を 2px の隙間で
   * 貫いた(edge-through-node)。席の中に居るはずの「見えない席」が席の外に
   * 出れば、それはもう見えない席ではない。
   */
  const dummyDx = Math.max(12, Math.round(SEAT * 0.27));
  /**
   * **席の幅を名ごとに与える道は、呼び手が `widthOf` を渡したときだけ開く。**
   *
   * ここを既定にしてはならない —— 実測でそれを確かめた。
   * 一律の席幅をやめた最初の版は、結線の図(段に 27 席)を 3416 → 2265px に縮めた
   * 代わりに、**reform の道の DAG を壊した**: 図幅が 762 → 582px に詰まり、
   * `build → security` の辺が建造の枠線に 106px 寄り添って
   * composition/container-border-run で描画器が正しく鳴いた。
   * 席が 5 つしかない図に、27 席の図のための詰め方を当てたのが誤りである。
   *
   * ゆえに**詰めるのは、詰めねば読めない図だけ**にする。
   * `widthOf` を渡さない呼び手は、1 ピクセルも座標が変わらない(実測で確認済み)。
   *
   * ダミーの席を細くするのも同じ扱いにする。ダミーは箱を持たないので隣に箱の幅を
   * 空ける必要が無いが、**その節約が要るのは席が溢れた図だけ**である。
   */
  const perName = typeof opts.widthOf === 'function';
  const DUMMY_PITCH = perName ? Math.max(24, Math.round(dummyDx * 2.2)) : SEAT_PITCH;
  const seatW = (t) => (t && t.dummy) ? (perName ? DUMMY_PITCH : SEAT)
    : (perName ? Math.max(SEAT_MIN, opts.widthOf(t.id)) : SEAT);
  const pitchOf = (t) => (t && t.dummy) ? DUMMY_PITCH : (perName ? seatW(t) + SEAT_GAP : SEAT_PITCH);
  /** 段の中で t の左端までに積まれた間隔の総和 */
  const offsetIn = (layer, t) => {
    let acc = 0;
    for (const s of layer) { if (s === t) break; acc += pitchOf(s); }
    return acc;
  };
  const layerSpan = (layer) => layer.reduce((a, s) => a + pitchOf(s), 0);
  const maxSpan = Math.max(...Object.values(byDepth).map(layerSpan));
  const slotB = (t) => {
    const layer = byDepth[lvOf(t)];
    if (!perName) {
      // 一律の席幅。**旧来の式をそのまま保つ** — 座標が 1px でも動けば、
      // 図は同じ事実を語りながら描画器の裁定だけが変わる
      return PAD_B + Math.round((layer.indexOf(t) + (maxRow - layer.length) / 2) * SEAT_PITCH) + SEAT / 2
        + (t.dummy ? dummyDx + (skipRank[t.key] % 3) * Math.round(dummyDx * 0.55) : 0);
    }
    // 段は中央に揃える。狭い席が混ざっても中心は総幅で決まる
    const start = PAD_B + Math.round((maxSpan - layerSpan(layer)) / 2);
    return start + offsetIn(layer, t) + (t.dummy ? DUMMY_PITCH / 2 : seatW(t) / 2)
      + (t.dummy ? (skipRank[t.key] % 3 - 1) * Math.round(dummyDx * 0.55) : 0);
  };
  const rankD = (lv) => PAD_D + lv * RANK_PITCH;
  const seatOf = (id) => byDepth[depth[id]].find(x => x.id === id);
  // 箱の左端は、その席の中心から**その席自身の幅**の半分だけ戻った点である。
  // 一律 SEAT/2 を引いていた頃は、名ごとに幅を変えた瞬間に箱と辺がずれた
  // (実測: endpoint-side-direction で描画器が正しく鳴いた)。
  const posOf = (id) => { const t = seatOf(id); return xy(slotB(t) - seatW(t) / 2, rankD(depth[id])); };

  // ── 辺を縫う ──────────────────────────────────────────────────────
  // 段は下(縦流し)あるいは右(横流し)へ進む。辺の側はその向きが決める。
  const FWD = horizontal ? { fromSide: 'right', toSide: 'left' } : { fromSide: 'bottom', toSide: 'top' };
  const BACK = horizontal ? { fromSide: 'left', toSide: 'right' } : { fromSide: 'top', toSide: 'bottom' };
  const edges = [];
  for (const t of items) for (const dep of depsOf(t.id)) {
    const base = { from: dep, to: t.id, ...FWD };
    const p = skipPath[`${dep}->${t.id}`];
    if (!p || !p.length) { edges.push(base); continue; }
    // ダミーの席を上から下へ縫う。折れは全て直角にする:
    //   起点の真下 → 席の x へ横に寄る → 席を縦に通る → …
    //   → 終点の x へ横に寄る → 終点の真上
    // 横に寄るのは必ず「次の段に入る直前の隙間」、縦に降りるのは必ず席の
    // 列の中。ゆえにどの節点の箱も貫かない。
    /**
     * 段の隙間 (RANK_PITCH - RANK) の中に、辺ごとの車線を刻む。
     *
     * 下限 26px は箱の辺からの最短クリアランス — これより浅いと
     * 枠線に沿って走り container-border-run で鳴く。上限は向かいの箱の
     * 辺 +8px を割ってはならない (edge-through-node)。
     *
     * かつてここは 26/40/54px と**数を焼き付けて**いた。段間 74px の道では
     * 正しかったが、段を詰めた図(隙間 56px)では第三車線が向かいの箱に
     * 2px まで迫り、描画器が正しく鳴いた。隙間の広さは呼び手が決めるもの
     * なので、車線もそこから導く。三車線が入らない隙間では車線を減らす。
     */
    const key = `${dep}->${t.id}`;
    const gapSpan = RANK_PITCH - RANK;
    const laneStep = 14;
    const lanes = Math.max(1, Math.min(3, Math.floor((gapSpan - 26 - 8) / laneStep) + 1));
    const gapD = (lv) => rankD(lv) - (26 + (gapLane[`${key}@${lv}`] % lanes) * laneStep);
    const bStart = slotB(seatOf(dep)), bEnd = slotB(seatOf(t.id));
    /**
     * 席がわずかにずれた二点は **5px の折れ** を作り、描画器が
     * 「読めない曲がり」として正しく鳴いた(実測: 作図の道 chart-measure → verify)。
     *
     * 直し方は「後から畳む」ではなく **経路を作る前に席を揃える** である。
     * 畳んだ後に点を動かせば、終点の真上に来るはずの線がずれ、今度は
     * endpoint-side-direction で鳴く — 症状を別の症状へ移しただけになる。
     * ゆえに横へ寄る先(ダミーの席)が起点/終点とほぼ同じ列なら、最初から
     * その列に合わせる。**目に見えない寄り道は寄り道ではない。**
     */
    const MICRO = 8;
    const snapB = (v) => {
      for (const tv of [bStart, bEnd]) if (Math.abs(v - tv) < MICRO) return tv;
      return v;
    };
    const raw = [];
    let prevB = bStart;
    for (const dm of p) {
      const d2 = gapD(dm.lv);
      const b2 = snapB(slotB(dm));
      raw.push(xy(prevB, d2), xy(b2, d2));
      prevB = b2;
    }
    const dLast = gapD(depth[t.id]);
    raw.push(xy(prevB, dLast), xy(bEnd, dLast));

    // 席の x が一致すると長さ0の折れが生まれ、描画器が micro-segment で
    // 鳴く。同じ点と一直線上の点を畳んでから渡す — 経路の意味は変わらない。
    //
    const via = [];
    for (const pt of raw) {
      const lastP = via[via.length - 1];
      if (lastP && lastP[0] === pt[0] && lastP[1] === pt[1]) continue;
      const prevP = via[via.length - 2];
      if (lastP && prevP && ((prevP[0] === lastP[0] && lastP[0] === pt[0]) || (prevP[1] === lastP[1] && lastP[1] === pt[1]))) via.pop();
      via.push(pt);
    }
    edges.push({ ...base, via });
  }
  // 後退辺は座標を与えない。側も経路も描画器に委ねる — 上へ戻る線の廊下を
  // 私が選べば、それは前向きの辺の廊下を必ず奪う。
  for (const e of back) edges.push({ from: e.from, to: e.to, back: true, ...BACK });

  const maxLv = Math.max(...depths);
  // 幅は席の**間隔の総和**で決まる。名ごとの席幅を使うときはダミーが狭い席を占めるので、
  // 「最大席数 × 席の間隔」では実際より広く見積もる(実測: 結線の図で 3416 と 2265 の差)。
  // 一律の席幅のときは旧来の式をそのまま保つ — 他の図の座標を 1px も動かさない
  const breadthTotal = perName ? (PAD_B + maxSpan - SEAT_PITCH + SEAT + 40)
    : (PAD_B + (maxRow - 1) * SEAT_PITCH + SEAT + 40);
  const depthTotal = PAD_D + maxLv * RANK_PITCH + RANK + 40;
  return {
    posOf, depth, byDepth, depths, edges, isDummy, horizontal, sizeOf: (id) => xy(seatW({ id }), RANK),
    minCrossings: bestTotal,
    size: xy(breadthTotal, depthTotal).map(v => Math.max(320, v)),
    // 同じ段に立つ実体(ダミーを除く) — 「同時に走りうる」札の材料
    rows: depths.map(k => ({ depth: k, ids: byDepth[k].filter(x => !isDummy(x)).map(x => x.id) })),
    box: [W, H],
  };
}

// ══════════════════════════════════════════════════════════════════════
// 主題 4: dag — 道の全形 (層化グラフ描画)
// ══════════════════════════════════════════════════════════════════════
function irDag(scale) {
  const dag = forge.buildDag('<神託>', scale);
  const L = layered(dag.tasks.map(t => ({ id: t.id, deps: t.deps || [] })));
  const [W] = L.box;

  const components = dag.tasks.map(t => {
    const card = clergy.cardinalFor(t.id);
    return {
      id: idOf(t.id), type: t.gate ? 'security' : (card === 'tribunal' ? 'cloud' : 'backend'),
      label: t.id, sublabel: t.agent,
      pos: L.posOf(t.id).map(Math.round), size: L.box,
      ...(t.gate ? { tag: '⚖ 門' } : {}),
    };
  });
  const gateOf = new Map(dag.tasks.map(t => [t.id, !!t.gate]));
  const connections = L.edges.map(e => ({
    id: idOf(`e-${e.from}-${e.to}`), from: idOf(e.from), to: idOf(e.to),
    fromSide: e.fromSide, toSide: e.toSide,
    ...(gateOf.get(e.to) ? { variant: 'security' } : {}),
    ...(e.via ? { via: e.via } : {}),
  }));

  const domains = [...new Set(dag.tasks.map(t => clergy.cardinalFor(t.id)))];
  const gates = dag.tasks.filter(t => t.gate).map(t => t.id);

  /**
   * 交差ゼロが**不可能な図がある** (第47条(c))。
   *
   * full の道では建造の2相(build/build-ui)が品質の3相(review/security/docs)
   * すべてに掛かる。この層間の最小交差数を全順列で数え上げると **2** であり、
   * 席順をどう変えても、線をどう回しても消えない — 層化されたこのグラフは
   * 平面的でない。archify の showcase は交差を一切許さないので、この道は
   * 構造上 showcase を満たせない。
   *
   * ここで取りうる道は三つあり、二つは不正である:
   *   ✗ 辺を黙って間引く    — 依存を消せば図は嘘になる
   *   ✗ 黙って standard に落とす — 「9/9通った」と報告できてしまう
   *   ✓ **不可能を計測して宣言する** — 交差数を数え、0でなければ standard を
   *      名乗り、その理由を図の札に書き、門にもそう報告させる。
   * 測って正直に格下げするのは敗北ではない。測らずに緑を名乗るのが敗北である。
   */
  const irreducible = L.minCrossings;
  return {
    schema_version: 1, diagram_type: 'architecture',
    meta: {
      title: `${SUBJECTS.dag.title} (scale: ${scale})`,
      quality_profile: irreducible ? 'standard' : 'showcase',
      // 描画器は viewBox に 320px の下限を課す。相が一列しかない道(quick)では
      // 式の答えが 258px になり、門が正しく鳴いた。式に下限を持たせる。
      viewBox: L.size,
      views: [
        { id: 'gates', label: '門 (gate)', focus: gates.map(idOf), note: '門の相は検証なしに前へ進めない。ここで嘘は止まる。' },
        { id: 'critical-path', label: '最長の道', focus: dag.tasks.filter(t => (t.deps || []).length <= 1).slice(0, 8).map(t => idOf(t.id)), note: '深さがそのまま順序であり、同じ深さは同時に走りうる。' },
      ],
    },
    components,
    boundaries: domains.filter(Boolean).map(c => ({
      kind: 'region',
      label: c === 'tribunal' ? clergy.TRIBUNAL.domain : clergy.COLLEGE[c].domain,
      wraps: dag.tasks.filter(t => clergy.cardinalFor(t.id) === c).map(t => idOf(t.id)),
    })),
    connections,
    cards: [
      { dot: 'cyan', title: `道の性質 (${scale})`, items: [`相: ${dag.tasks.length}`, `深さ: ${L.depths.length} 段`, `門: ${gates.join(', ')}`, `産物: ${dag.meta.produces}`] },
      { dot: 'amber', title: '同じ深さは同時に走る', items: L.rows.filter(r => r.ids.length > 1).map(r => `深さ${r.depth}: ${r.ids.join(' / ')}`) },
      ...(irreducible ? [{ dot: 'slate', title: '消せない交差', items: [
        `この道の層化グラフは平面的でない — 最小交差数 ${irreducible}`,
        '席順の全順列を数え上げても 0 にならない(近似ではなく厳密に測った)',
        '辺を間引けば図は嘘になる。ゆえに交差を残し、showcase を名乗らない',
      ] }] : []),
    ],
    __minCrossings: irreducible,
  };
}

// ══════════════════════════════════════════════════════════════════════
// 主題 5: run — 相の一生 (状態機械)
// ══════════════════════════════════════════════════════════════════════
function irRun() {
  const MAX = require('./conclave.js').MAX_DOMAIN_REWORK;
  return {
    schema_version: 1, diagram_type: 'lifecycle',
    meta: {
      title: SUBJECTS.run.title, quality_profile: 'showcase', viewBox: [1080, 680],
      views: [
        { id: 'happy', label: '順路', focus: ['pending', 'running', 'done', 'ratified', 'complete'], note: '相は発令で走り、実物と照合されて初めて done になる。' },
        { id: 'sendback', label: '差戻し', focus: ['ratified', 'rework', 'running'], note: '否認は下流を巻き戻す。批准済みのドメインですら再び開く。' },
        { id: 'guard', label: '環の番人', focus: ['rework', 'blocked'], note: `${MAX}回を超えた差戻しは blocked となり教主へ上がる。無限の環を許さない。` },
      ],
    },
    lanes: [
      { id: 'main', label: '相の順路' },
      { id: 'review', label: '審査' },
      { id: 'loop', label: '差戻しの環' },
      { id: 'terminal', label: '終端' },
    ],
    states: [
      { id: 'pending', type: 'start', label: 'pending', sublabel: '依存待ち', lane: 'main', col: 0, step: '01', tag: '入口' },
      { id: 'running', type: 'active', label: 'running', sublabel: '神官が働く', lane: 'main', col: 1, step: '02', tag: 'attempts++' },
      { id: 'done', type: 'active', label: 'done', sublabel: '実物と照合済み', lane: 'main', col: 2, step: '03', tag: 'artifact' },
      { id: 'ratified', type: 'decision', label: 'ratified', sublabel: '適切なクラスが批准', lane: 'main', col: 3, step: '04', tag: '門' },
      { id: 'complete', type: 'success', label: 'complete', sublabel: '全ドメイン批准', lane: 'main', col: 4, step: '05', tag: '完' },
      // 終端/事象の列 N は本線の列 N+2 の真下に揃う。ゆえに verdict は
      // col 2 (= 本線 col 4 = complete の真下) に置く。ここを違えると
      // 「完了 → 断罪」の線が無関係な相を貫き、描画器が正しく鳴く。
      { id: 'reconcile', type: 'waiting', label: 'reconcile', sublabel: 'contract.js', lane: 'review', col: 0, tag: 'fail-closed' },
      { id: 'rework', type: 'waiting', label: 'rework', sublabel: '下流ごと巻き戻す', lane: 'review', col: 1, tag: `≤${MAX}` },
      { id: 'blocked', type: 'failure', label: 'blocked', sublabel: '教主へ上がる', lane: 'loop', col: 1, yOffset: 96, tag: '環の番人' },
      { id: 'verdict', type: 'failure', label: 'verdict', sublabel: 'SHIP/REWORK/BLOCK', lane: 'terminal', col: 2, tag: '執行官' },
    ],
    transitions: [
      // 自動経路に委ねる。側を宣言すると曲がりが辺に直交せず、描画器が
      // endpoint-side-direction で鳴いた — 側面の設計は描画器の領分である。
      { id: 'to-reconcile', from: 'running', to: 'reconcile', variant: 'security' },
      { id: 'to-rework', from: 'ratified', to: 'rework', variant: 'default' },
      { id: 'rework-guard', from: 'rework', to: 'blocked', variant: 'security' },
      { id: 'complete-verdict', from: 'complete', to: 'verdict', variant: 'security' },
    ],
    cards: [
      { dot: 'emerald', title: '順路と照合 (第27条)', items: ['done は「言った」でなく「在った」で立つ', 'contract.js が食い違いを fail-closed で止める'] },
      { dot: 'rose', title: '環の番人', items: [`差戻しは ${MAX} 回まで — 超えれば blocked`, '批准済みのドメインも巻き戻しで再び開く'] },
    ],
  };
}

// ══════════════════════════════════════════════════════════════════════
// 主題 6: wiring — 結線の相関 (神が問うた「オーケストレーションの関連図」)
//
// 位階図は「誰が誰を呼ぶか」を**人の階層**で語る。だが楽園を実際に動かして
// いるのは engine である。どの engine がどの engine の上に建ち、その engine を
// 誰が(門・命令・神官・器物・散文が)呼ぶのか — それは今まで誰も語らなかった。
//
// ここも事実は写経しない。wiring.js がディスクを走査して測った結線を、
// そのまま図にする。engine が一つ生まれれば、翌朝この図はひとりでに増える。
// ══════════════════════════════════════════════════════════════════════
function irWiring() {
  const m = wiring.map();
  const ja = Object.fromEntries(wiring.SURFACES.map(s => [s.id, s.ja]));

  /**
   * **結線を持つ者だけを層に並べる。**
   *
   * 素朴に33の engine 全てを層化したら、警告が76件出た。原因は幾何ではない —
   * require の辺を一本も持たない engine 8本(census/verdict/branch-guard ほか)が
   * 段0に居座り、**結線を持つ者どうしを 2988px の彼方へ引き離していた**。
   * 長い斜線は互いに交わり、廊下を奪い合う。
   *
   * だが彼らは孤児ではない。命令や門が直に呼ぶ、独立した engine である。
   * 事実は「彼らに require の辺が無い」ことなので、**辺の図から出して、
   * 独立した一群として描く**のが正しい。消すのでも、混ぜるのでもない。
   */
  const linked = m.engines.filter(e => e.requires.length || e.requiredBy.length);
  const solo = m.engines.filter(e => !e.requires.length && !e.requiredBy.length);
  /**
   * 席は詰める。土台を require する engine は一段に15並び、道(dag)と同じ
   * 148px の席で並べると図幅が 2988px になった。実ブラウザで測ると、
   * 1440x900 に収めるための縮小で**副題が 4.05px** になり、描画器の
   * 読みやすさの床(6px)を割った — 巻物と宣言しても字が読めなければ図ではない。
   * 幅は席の数 × 席の幅でしか決まらないので、詰められるのは席の幅だけである。
   */
  /**
   * 席の幅は**名が決める**。勘で 120px と置いたら、22文字の
   * build-identity-catalog が箱をはみ出して描画器が正しく鳴いた。
   * engine の名は engine が決めるものであり、次に長い名が生まれた日に
   * 図が壊れてよい道理は無い。ゆえに最長の名から導く(描画器の実測では
   * 半角相当で約 6.6px/字)。
   */
  const widthFor = (ids) => Math.max(112, Math.ceil(Math.max(...ids.map(x => x.length)) * 6.6) + 18);
  const LW = widthFor(linked.map(e => e.id));
  /**
   * 図の広さは、席の数 × 席の幅でしか決まらない。席は15、名は engine が
   * 決める — ならば**縮められるのは箱の中身だけ**である。
   *
   * 三つ試して二つ捨てた(実測):
   *   ✗ 横に流す        504px 幅の短冊になり、viewer が引き伸ばして
   *                     1440x900 に箱が4つしか映らなかった
   *   ✗ 段を折り返す    ダミー節点が段あたり20本に膨れ、交差 6 → 30。
   *                     おまけに「同じ段=並列」という意味を壊す
   *   ✓ 副題を捨てる    呼び手の面は**札に移す**。箱には名だけを残す。
   * 図が大きいとき削るのは線でも箱でもなく、まず**箱の中の字**である。
   */
  /**
   * **席割りは実測で決める** (第47条c)。
   *
   * engine が 33 → 34 になり、census.js と export-state.js が第30条の是正で
   * workspace.js を require した瞬間、両者が「辺を持たない engine」から
   * 「層に並ぶ engine」へ移った。加えて pulse.js が 13 本を require したので
   * 段飛ばしが 2 → 8 本に増え、最大席数が 18 → **27 席**に膨れた。
   *
   * 実測(教主が buildIr を直に呼んで測った数):
   *   席の幅 112px / 席の間隔 124px → viewBox 幅 **3416px**
   *   1440 / 3416 = 0.422 倍に縮小され、本来 10.27px の字が **4.33px** に潰れた
   *   床 6px を満たすのに許される幅 = 1440 × 10.27 ÷ 6 = **2464px**
   *
   * **scroll:true では解けない** — 第48条e により巻物の許しは長さにだけ効き、
   * 読めない字は免除しない。横に流すことも、段を折り返すことも、上の註釈が
   * 既に実測で捨てている。ゆえに実際に描いて測り、四つ試して二つを採った:
   *
   *   ✗ 席の間隔だけを詰める   pitch 124→98 で 2358px / 字 5.99px。**床に届かない。**
   *                            さらに詰めると箱が 8px 以内に接し描画器が鳴く
   *   ✗ 箱を高くする           H 52→140 で 字 4.33px のまま。**縮小率は幅が決める**
   *   ✓ ダミーの席を細くする   3416 → 2952px。ダミーは箱を持たないので
   *                            箱の幅を確保する必要が無い(下の DUMMY_PITCH)
   *   ✓ 席の幅を名ごとに与える 2952 → **2265px** / **床を満たす**。
   *                            `kg` (2字) が `build-identity-catalog` (22字) と
   *                            同じ席を占める理由は無かった(下の nameW)
   *
   * **2265px は 2464px の上限に 199px の余裕を持つ。** 明日 engine が 1 本増えても
   * 幅は名の長さの分しか伸びない —— 席の数ではなく名の総和で決まるからである。
   */
  // 席の幅は名ごとに与える。**その無駄が 19 席の段では図幅そのものになる。**
  const nameW = (id) => Math.max(56, Math.ceil(id.length * 6.6) + 18);
  const L = layered(linked.map(e => ({ id: e.id, deps: e.requires })),
                    { W: LW, H: 52, COL: LW + 12, ROW: 104, widthOf: nameW });
  const [W, H] = L.box;
  const SW = widthFor(solo.map(e => e.id));

  /**
   * 箱は**名だけ**を載せる。
   *
   * 副題(呼び手の面)を置いていたが、15席の段ではどんなに短くしても
   * 1440x900 で 4.5〜5.6px に潰れ、読みやすさの床(6px)を割った(実測)。
   * 読めない字は情報ではない。呼び手の面は色・タグ・札が語る。
   */
  const tagOf = (e) => e.orphan ? '孤児'
    : e.callers.includes('ci') ? '門'
    : e.requiredBy.length >= 3 ? `土台 ×${e.requiredBy.length}` : null;
  const nodeOf = (e, pos, extra = {}) => {
    const tag = tagOf(e);
    return {
      id: idOf('w-' + e.id),
      // 門(CI)が呼ぶ engine は security。楽園の掟を実際に裁いている者である。
      // 誰も呼ばない孤児は cloud — 目で見て「浮いている」と分かる形にする。
      type: e.orphan ? 'cloud' : (e.callers.includes('ci') ? 'security' : 'backend'),
      label: e.id,
      pos: pos.map(Math.round),
      ...(tag ? { tag } : {}),
      ...extra,
      size: extra.size || [nameW(e.id), 52],
    };
  };

  // 独立の一群は、層の**下**に格子で置く。列数は層の幅に合わせる —
  // 図の幅を独立群が広げてはならない(彼らは主題の脇役である)。
  /**
   * 孤児は独立群から**目に見えて離す**。
   *
   * 一度は格子の中に混ぜて枠だけ描いた。実際に開いて見ると、孤児の枠が
   * 独立群の枠とほぼ重なり、二つの題が同じ行で潰れ合った — 図が
   * 「この engine は他と違う」という己の主張を裏切っていた。
   * 静的な検査はこれを咎めない。幾何は正しいからである(第47条・第18条)。
   *
   * 独立と孤児は意味が違う: 独立は面が呼ぶ engine、孤児は誰も呼ばない engine。
   * 意味が違うものを同じ格子に並べれば、枠を足しても違いは伝わらない。
   */
  const alive = solo.filter(e => !e.orphan), dead = solo.filter(e => e.orphan);
  const COLS = Math.max(1, Math.min(alive.length || 1, Math.floor((L.size[0] - 80) / (SW + 12))));
  const soloTop = L.size[1] - 40 + 56;
  const soloRowsN = Math.ceil(alive.length / COLS);
  const deadTop = soloTop + soloRowsN * 84 + 56;
  const components = [
    ...linked.map(e => nodeOf(e, L.posOf(e.id))),
    ...alive.map((e, i) => nodeOf(e, [40 + (i % COLS) * (SW + 12), soloTop + Math.floor(i / COLS) * 84], { size: [SW, 52] })),
    // 枠の題は箱より広い。孤児が1本しか居ない図で箱を左端に置くと、
    // 題(「呼ぶ者の居ない engine — 第44条 (1)」で約240px)が画布の外へ出て
    // 描画器が正しく鳴く。枠を持つ一群は、**題の幅の分だけ内側に置く**。
    ...dead.map((e, i) => nodeOf(e, [96 + i * (SW + 12), deadTop], { size: [SW, 52] })),
  ];
  /**
   * 孤児は**枠を持たせて名指しする**。
   *
   * 実際に描いて見たところ、孤児は独立群の格子の中に同じ大きさで並び、
   * 色(cloud)だけが違っていた。だが独立の engine も孤児も等しく「辺を持たない」
   * ので、格子の中では見分けがつかない — 図が己の主張を裏切っていた。
   * 静的な検査はこれを咎めない。幾何は正しいからである(第47条・第18条)。
   */
  const orphanIds = m.engines.filter(e => e.orphan).map(e => idOf('w-' + e.id));

  // 相互依存(環)の辺は破線で語る。上へ戻る線を実線で引けば、読み手は
  // 「段が間違っている」と読む — 事実は「そこに環が在る」である。
  const connections = L.edges.map(e => ({
    id: idOf(`w-${e.from}-${e.to}`), from: idOf('w-' + e.from), to: idOf('w-' + e.to),
    // 側は配置器が向きから決めて渡してくる。ここで綴り直せば、流れの向きを
    // 変えた日に**この一行だけが古い向きのまま**残る(実測で鳴かれた)。
    // 後退辺は前向きの辺と逆の側を使う — 線が上(あるいは左)へ走るのに
    // 「下へ出る」と名乗れば、描画器は endpoint-side-direction で正しく鳴く。
    fromSide: e.fromSide, toSide: e.toSide,
    ...(e.back ? { variant: 'dashed', label: '相互' } : (e.via ? { via: e.via } : {})),
  }));
  const cycles = L.edges.filter(e => e.back).map(e => `${e.to} ⇄ ${e.from}`);

  const orphans = m.engines.filter(e => e.orphan).map(e => e.id);
  const hubs = [...m.engines].sort((a, b) => b.requiredBy.length - a.requiredBy.length)
    .filter(e => e.requiredBy.length > 0).slice(0, 4);
  const byCi = m.engines.filter(e => e.callers.includes('ci')).map(e => e.id);

  const bottom = dead.length ? deadTop + 52 + 24 : soloTop + soloRowsN * 84;
  return {
    schema_version: 1, diagram_type: 'architecture',
    meta: {
      // 交差が残るなら showcase を名乗らない — dag と同じ掟が同じ理由で効く。
      title: SUBJECTS.wiring.title,
      quality_profile: L.minCrossings ? 'standard' : 'showcase',
      viewBox: [L.size[0], bottom + 48],
      views: [
        { id: 'foundation', label: '土台', focus: hubs.map(e => idOf('w-' + e.id)),
          note: 'ここが壊れれば上の全てが壊れる。最も多く require される engine である。' },
        { id: 'gates', label: '門が呼ぶ engine', focus: byCi.map(id => idOf('w-' + id)),
          note: '執行官(CI)が毎PRで走らせる engine。掟を実際に裁いているのはこれらである。' },
        ...(solo.length ? [{ id: 'standalone', label: '独立の engine', focus: solo.map(e => idOf('w-' + e.id)),
          note: 'require の辺を持たない。門や命令が直に呼ぶ、単独で立つ engine である。' }] : []),
        ...(orphans.length ? [{ id: 'orphans', label: '孤児', focus: orphans.map(id => idOf('w-' + id)),
          note: '誰も require せず、どの面もその名を呼ばない。死んだ道具は先例として模倣される (第44条)。' }] : []),
      ],
    },
    components,
    boundaries: [
      ...(alive.length ? [{
        kind: 'region',
        label: `独立の engine — require の辺を持たず、面が直に呼ぶ (${alive.length})`,
        wraps: alive.map(e => idOf('w-' + e.id)),
      }] : []),
      ...(orphanIds.length ? [{
        kind: 'security-group',
        label: `呼ぶ者の居ない engine — 第44条 (${orphanIds.length})`,
        wraps: orphanIds,
      }] : []),
    ],
    connections,
    cards: [
      { dot: 'cyan', title: '結線の実測 (第48条)', items: [
        `engine ${m.engines.length} / require の辺 ${m.edges.length}`,
        `門(CI)が直に呼ぶ engine: ${byCi.length}`,
        `土台: ${hubs.map(e => `${e.id}(×${e.requiredBy.length})`).join(' / ')}`,
      ] },
      { dot: orphans.length ? 'rose' : 'emerald', title: '呼ぶ者の居ない engine (第44条)',
        items: orphans.length
          ? [`孤児 ${orphans.length}: ${orphans.join(', ')}`, '生きているなら呼ぶ者を作り、死んでいるなら退治せよ']
          : ['孤児なし — 全ての engine に呼ぶ者が居る', 'node graph/wiring.js check が毎PRで数える'] },
      ...(cycles.length ? [{ dot: 'slate', title: '環 (相互依存)', items: [
        ...cycles, '層化は非循環を前提にする。環の辺は破線で残し、段には使わない',
      ] }] : []),
    ],
    __minCrossings: L.minCrossings,
  };
}

// ══════════════════════════════════════════════════════════════════════
/**
 * **動きは名乗らねば宿らない** (第50条)。
 *
 * 実測: 神が「signal の機能が動いていない、play story が非活性」と告げた。
 * 開いて測ると `data-motion-capable` が付いておらず、`[data-animate]` は
 * **0個**、motionGovernor は capable:false で死んでいた。図が壊れていたのでは
 * ない — 描画器は最初から静止画を作っていたのである。
 *
 * 版元の正典が理由を述べている:
 *   schemas/README.md — "Every `meta` object also accepts `animation: \"trace\"`
 *     for opt-in SVG/CSS motion in generated HTML. **Omit it**, or set `\"none\"`,
 *     **for the default static output**."
 *   SKILL.md:120     — "`meta.animation: \"trace\"` is **opt-in**"
 * そして viewer は `svg[data-animation="trace"]` が無ければ motionGovernor を
 * capable:false にし、Live/Still も、Signal Flow の走査も、Play story も
 * まとめて眠らせる。**押せない釦は壊れた釦ではなく、名乗らなかった代償である。**
 *
 * atlas.js は6主題のどれにも animation を書いていなかった (実測 0箇所)。
 * ゆえに宣言は主題ごとの気まぐれにせず、**ここ一箇所**で全主題に課す。
 * 静止させたい走行(印刷・回帰の固定など)だけが --static で降ろせる。
 */
const MOTION = 'trace';

function buildIr(subject, opts = {}) {
  const scale = opts.scale || 'standard';
  const ir = (() => {
    switch (subject) {
      case 'hierarchy': return irHierarchy();
      case 'conclave': return irConclave(scale);
      case 'dispatch': return irDispatch(opts.phase || 'build');
      case 'dag': return irDag(scale);
      case 'run': return irRun();
      case 'wiring': return irWiring();
      default: throw new Error(`未知の主題: ${subject} (${Object.keys(SUBJECTS).join(' | ')})`);
    }
  })();
  // 版元の enum は 'trace' | 'none' の二値。名乗らないことと 'none' は同義だが、
  // **黙るのと断るのは違う** — 静止を選んだ走行はそう書き残す。
  ir.meta.animation = opts.static ? 'none' : MOTION;
  return ir;
}

/**
 * 描く。**電話をかけさせない** — 取り込んだ写しは供給線であってはならない
 * (第20条)。上流の更新チェッカーは取り込み時に削いであるが、環境変数でも塞ぐ。
 */
function archify(args) {
  try {
    return execFileSync(process.execPath, [ARCHIFY, ...args], {
      cwd: path.dirname(path.dirname(ARCHIFY)),
      encoding: 'utf8',
      env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1' },
    });
  } catch (e) {
    // 描画器の診断は構造化されている。それを握り潰して「失敗しました」と
    // 言えば直す道が消える — 門は直し方まで述べなければならない(第21条)。
    let detail = String(e.stdout || e.message);
    try {
      const r = JSON.parse(String(e.stdout));
      detail = (r.diagnostics || []).map(x => `${x.code}: ${x.message}` + ((x.supportedFixes || []).length ? `\n        → ${x.supportedFixes.join(' / ')}` : '')).join('\n      ') || r.error || detail;
    } catch {}
    const err = new Error(detail);
    err.diagnostics = detail;
    throw err;
  }
}

/**
 * 実ブラウザで第一画面に収まるか (第47条(c))。
 * 静的な 9/9 は「図として正しい」ことしか言わない。**画面に収まるかは
 * 実際に開いてみないと分からない** — 実測すると 5つの主題のうち3つが
 * 溢れていた(1301px / 2693px / 923px)。ゆえに門は目でなく数で裁く。
 *
 * ⚠️ **不合格には種類が在る。種類を畳めば門が嘘をつく。**
 *
 * 実測(reform/pontiff-office design §8): 溢れ診断も可読性診断も無い不合格の
 * とき、旧実装の `reason` は receipt の `status` すなわち文字列 `"fail"` に
 * 落ち、呼び手はそれに**溢れの文言を接ぎ木していた**。結果、記録された赤は
 * `fail — 図は第一画面に収まってこそ図である。巻物でよいなら scroll:true と
 * 宣言せよ` の形になる。図は 1px も溢れていないのに、**門は溢れたと報告し、
 * かつ誤った直し方(巻物の宣言)まで教える。** 第34条が言う「罠」の最悪の形である。
 *
 * ゆえに診断コードで分類し、呼び手が意味を取り違えられない `kind` を返す:
 *   'fits'         … exit 0
 *   'overflow'     … viewer/viewport-overflow      (scroll:true で免除しうる)
 *   'unreadable'   … viewer/projected-text-readability (第48条e: 決して免除しない)
 *   'skipped'      … viewer/chrome-unavailable (exit 2)。harness 不在を責めない
 *   'inconclusive' … viewer/visual-check-runtime / JSON 不可解 / 診断ゼロの非ゼロ終了
 *                    **測定不能である。溢れではない。判定不能は緑でもない(第16条)。**
 */
const FIRST_SCREEN_KINDS = Object.freeze(['fits', 'overflow', 'unreadable', 'skipped', 'inconclusive']);

function firstScreenOnce(htmlPath) {
  try {
    const raw = execFileSync(process.execPath, [ARCHIFY, 'visual-check', htmlPath, '--json'], {
      cwd: path.dirname(path.dirname(ARCHIFY)), encoding: 'utf8',
      env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1' },
    });
    return { ok: true, kind: 'fits', overflow: 0, unreadable: 0, receipt: JSON.parse(raw) };
  } catch (e) {
    let r = null; try { r = JSON.parse(String(e.stdout)); } catch {}
    const ds = (r && r.diagnostics) || [];
    const over = ds.filter(d => d.code === 'viewer/viewport-overflow');
    const worst = over.reduce((a, d) => Math.max(a, (d.evidence || {}).scrollHeight || 0), 0);
    /**
     * 実ブラウザの不合格には**溢れ以外**が在る。
     *
     * 実測: 結線の図は一画面に収まっていた(溢れ 0px)のに、縮小されて副題が
     * 5.57px になり読みやすさの床(6px)を割っていた。ところが門は
     * 「溢れていないなら scroll 免除の対象」としか見ておらず、
     * **巻物と宣言するだけで「字が読めない」を通していた。**
     * 巻物の許しは「長さ」への許しであって、「読めなさ」への許しではない。
     */
    const unreadable = ds.filter(d => d.code === 'viewer/projected-text-readability');
    const px = unreadable.reduce((a, d) => Math.min(a, (d.evidence || {}).minimumProjectedNodeTextPx || 99), 99);
    // Chrome が居ない環境(CI)で「図が溢れた」と言えば、それは check-agents /
    // deploy check が既に採っている「harness 不在なら検めるものが無い」の
    // 流儀に反する。**存在しないものを責めない。**
    if (ds.some(d => d.code === 'viewer/chrome-unavailable') || e.status === 2) {
      return { ok: true, kind: 'skipped', overflow: 0, unreadable: 0, receipt: r,
               reason: '描画器の Chrome が不在 — 検めるものが無い(ARCHIFY_CHROME を指せば測る)' };
    }
    if (unreadable.length) {
      return { ok: false, kind: 'unreadable', overflow: worst, unreadable: px, receipt: r,
        reason: `実ブラウザで字が読めない (最小 ${px.toFixed(2)}px / 床 ${(unreadable[0].evidence || {}).minimumRequiredNodeTextPx || 6}px) — 箱を広げるのではなく文言を短くするか、流れの向きを変えよ` };
    }
    if (over.length) {
      return { ok: false, kind: 'overflow', overflow: worst, unreadable: 0, receipt: r,
        reason: `第一画面に収まらない (最大 ${worst}px)` };
    }
    // 溢れでも可読性でもない不合格 = **測れなかった**。溢れと呼んではならない。
    const why = (r && (r.error || (ds[0] && ds[0].message))) || String(e.message).slice(0, 200);
    return { ok: false, kind: 'inconclusive', overflow: 0, unreadable: 0, receipt: r,
      reason: `第一画面を測定できなかった (描画器の理由: ${String(why).slice(0, 200)})` };
  }
}

/**
 * 測定不能は**一度だけ**再試行する。
 *
 * 描画器は主題ごとに Chrome を起動し CDP を 15,000ms の制限で叩く。
 * 自己診断は 30回それを繰り返すので、負荷の高い瞬間に制限へ届きうる。
 * 間欠故障を一発で赤にすれば CI は不定に落ち、やがて誰も見なくなる(第34条)。
 * **だが再試行しても駄目なら赤にする — 判定不能は緑ではない(第16条)。**
 */
function firstScreen(htmlPath, opts = {}) {
  let r = firstScreenOnce(htmlPath);
  if (r.kind === 'inconclusive' && opts.retry !== false) {
    const again = firstScreenOnce(htmlPath);
    if (again.kind !== 'inconclusive') return again;
    return { ...again, retried: true };
  }
  return r;
}


function draw(subject, opts = {}) {
  const spec = SUBJECTS[subject];
  if (!spec) throw new Error(`未知の主題: ${subject}`);
  const ir = buildIr(subject, opts);
  const outdir = opts.outdir || OUTDIR;
  fs.mkdirSync(outdir, { recursive: true });
  const irPath = path.join(outdir, `${subject}.${spec.type}.json`);
  const htmlPath = opts.out || path.join(outdir, `${subject}.html`);
  // IR が名乗った品位で裁いてもらう。名乗りと審査を食い違わせない —
  // showcase を要求しながら standard の IR を渡せば、赤は嘘の赤になる。
  const profile = (ir.meta && ir.meta.quality_profile) || 'showcase';
  const minCrossings = ir.__minCrossings || 0;
  delete ir.__minCrossings;                       // 私的な印は成果物に残さない
  fs.writeFileSync(irPath, JSON.stringify(ir, null, 2));
  const receipt = JSON.parse(archify(['deliver', spec.type, irPath, htmlPath, '--quality', profile, '--json']));
  return { subject, type: spec.type, ir: irPath, html: htmlPath, receipt, profile, minCrossings };
}

/** 門: 全主題が実際に 9/9 で通るか。図が壊れたまま気付かない、を許さない。 */
/**
 * 動きが実際に宿っているか (第50条)。
 *
 * 静的な 9/9 も、第一画面の実測も、**動きについては何も言わない**。
 * 神が「signal が動いていない・play story が非活性」と告げたとき、
 * 門は6主題すべて緑だった — 門が見ていない事実は、壊れても鳴らない。
 *
 * 実測で判った原因は**二つ**あり、どちらも「図の壊れ」ではなかった:
 *   (a) atlas.js が `meta.animation` を一度も名乗っていなかった (実測 0箇所)。
 *       版元の正典 (schemas/README.md) は "Omit it … for the default static
 *       output" と述べている — 黙れば静止画になるのが仕様である。ゆえに
 *       motionGovernor は capable:false、`[data-animate]` は 0個 だった。
 *   (b) この PC は Windows の「アニメーションを表示する」が OFF で
 *       (SPI_GETCLIENTAREAANIMATION=0)、実機 Brave が
 *       `prefers-reduced-motion: reduce` を名乗る。viewer はこれを尊重して
 *       Still に落ち、Play story を正しく非活性にする。
 *
 * (b) は viewer の**正しい振る舞い**であって欠陥ではない。ゆえに門は
 * reduced-motion を明示的に降ろした上で (a) だけを裁く — さもなくば
 * 測る側の環境設定が、健全な図を不合格にしてしまう。
 */
function motionAlive(htmlPath) {
  try {
    const raw = execFileSync(process.execPath, [PROBE, htmlPath, '--json'], {
      cwd: ROOT, encoding: 'utf8', env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1' },
    });
    return JSON.parse(raw);
  } catch (e) {
    let r = null; try { r = JSON.parse(String(e.stdout)); } catch {}
    // 検器が動かなかったこと(Chrome 不在等)と、図が動かないことは別である。
    // 前者を後者として報告すれば、門は嘘の赤を出す。
    return r || { ok: false, failures: [`動きの検器が走らなかった: ${String(e.message).slice(0, 160)}`], before: null };
  }
}

function check(opts = {}) {
  const outdir = opts.outdir || path.join(os.tmpdir(), 'paradise-atlas-check');
  /**
   * **前の走行の残骸を残さない。**
   *
   * `visual-check` は図の隣に `<subject>.visual-check.*.png|json|html` を撒く。
   * それらが残ったまま同じ outdir で描き直すと、描画器が「出力が入力を
   * 置き換えようとしている」(output/input-alias) と鳴く — 図は何も壊れて
   * いないのに門が落ちる。**門が己の残骸で落ちるなら、それは門ではなく罠である。**
   * 実測: 同じ outdir を使い回すテストが、二度目の走行から不定に赤くなっていた。
   *
   * ただし消してよいのは **門が自分で作る作業場だけ**である。呼び手が
   * `dashboard/atlas` のような成果物の住処を指してきたとき掃除すれば、
   * 門が成果物を消す — 直しが新しい破壊になる。ゆえに住処には触れない。
   */
  if (outdir !== OUTDIR) fs.rmSync(outdir, { recursive: true, force: true });
  const rows = [];
  for (const subject of Object.keys(SUBJECTS)) {
    try {
      const r = draw(subject, { ...opts, outdir, out: path.join(outdir, `${subject}.html`) });
      const v = r.receipt.validation || {};
      // 誤りは常に許さない。**警告**は、平面化不能を測ったときに限り許す —
      // その警告の中身がまさに「消せない交差」だからである。
      // standard を名乗ってよいのも、交差ゼロが不可能だと測れたときだけ。
      // 測らずに格下げすれば、それは緑を買収したのと同じである。
      const impossible = r.minCrossings > 0;
      const errorsOk = r.receipt.ok === true && v.checksPassed === v.checkCount && v.errors === 0;
      const warnOk = v.warnings === 0 || impossible;
      const profileOk = r.profile === 'showcase' ? !impossible : impossible;
      // 実ブラウザで第一画面に収まるか。巻物と宣言した主題だけ免除する。
      const fs2 = opts.skipBrowser ? { ok: true, kind: 'skipped', overflow: 0, unreadable: 0 } : firstScreen(r.html);
      // 巻物の宣言は「長い」ことだけを許す。読めないことは決して許さない。
      // **測定不能も許さない** — 測らなかったものに巻物の許しを与えれば、
      // 門は「見なかった」を「収まっていた」と言い換えることになる(第16条)。
      const scrollOk = fs2.ok ||
        (fs2.kind === 'overflow' && SUBJECTS[subject].scroll === true && !fs2.unreadable);
      // 動きは名乗らねば宿らない (第50条)。図として正しくとも、静止画なら
      // Live も Signal Flow も Play story も全て死んでいる。
      const mo = opts.skipBrowser ? { ok: true } : motionAlive(r.html);
      rows.push({
        subject, type: r.type, profile: r.profile, minCrossings: r.minCrossings,
        ok: errorsOk && warnOk && profileOk && scrollOk && mo.ok,
        checks: `${v.checksPassed}/${v.checkCount}`, errors: v.errors, warnings: v.warnings,
        screenKind: fs2.kind,
        // 語は kind から出す。**`OVERFLOW` は本当に溢れたときにだけ現れる語である。**
        screen: fs2.kind === 'fits' ? 'fits'
              : fs2.kind === 'skipped' ? 'skipped'
              : fs2.kind === 'unreadable' ? `字 ${fs2.unreadable.toFixed(1)}px`
              : fs2.kind === 'inconclusive' ? '測定不能'
              : (SUBJECTS[subject].scroll ? `scroll(${fs2.overflow}px)` : 'OVERFLOW'),
        motion: mo.ok ? `動 ${(mo.before && mo.before.animatedEls) || 0}` : '静止',
        bytes: (r.receipt.artifact || {}).bytes,
        // **溢れの文言は kind==='overflow' のときだけ出す。**
        // 測定不能に「巻物と宣言せよ」と言えば、門は嘘の直し方まで教える。
        ...(!scrollOk && fs2.kind === 'overflow'
          ? { error: `${fs2.reason} — 図は第一画面に収まってこそ図である。巻物でよいなら SUBJECTS に scroll:true と宣言せよ (第47条c)` } : {}),
        ...(!scrollOk && fs2.kind === 'unreadable' ? { error: fs2.reason } : {}),
        ...(!scrollOk && fs2.kind === 'inconclusive'
          ? { error: `${fs2.reason} — 測れなかったことは「溢れた」ことではない。描画器を直せ(第16条 / 第42条)` } : {}),
        ...(errorsOk && !profileOk ? { error: impossible
          ? '平面化不能なのに showcase を名乗っている — 交差を隠している'
          : 'showcase を満たせる図が standard を名乗っている — 格下げの根拠が無い' } : {}),
        ...(errorsOk && profileOk && !warnOk ? { error: `警告 ${v.warnings} 件 — 平面化は可能なのに図が汚れている` } : {}),
        ...(scrollOk && !mo.ok ? { error: `${(mo.failures || []).join(' / ')} — 動きは名乗らねば宿らない。meta.animation:"trace" を宣言せよ (第50条)` } : {}),
      });
    } catch (e) {
      rows.push({ subject, type: SUBJECTS[subject].type, ok: false, checks: '—', error: String(e.diagnostics || e.message).slice(0, 900) });
    }
  }
  return { ok: rows.every(r => r.ok), rows };
}

// ── CLI ───────────────────────────────────────────────────────────────
function parse(argv) { const f = {}; const pos = []; for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) f[argv[i].slice(2)] = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true; else pos.push(argv[i]); } return { f, pos }; }

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { f, pos } = parse(rest);
  const opts = { scale: f.scale, phase: f.phase, out: f.out, outdir: f.outdir, static: !!f.static };

  if (cmd === 'subjects') {
    console.log('═══ 🗺  ATLAS — 描ける主題 ═══');
    for (const [k, v] of Object.entries(SUBJECTS)) console.log(`  ${k.padEnd(11)} [${v.type.padEnd(12)}] ${v.title}`);
    console.log(`\n描画器: ${VENDOR_NOTE}`);
    return;
  }
  if (cmd === 'ir') {
    const ir = buildIr(pos[0], opts);
    const json = JSON.stringify(ir, null, 2);
    if (f.out) { fs.mkdirSync(path.dirname(path.resolve(f.out)), { recursive: true }); fs.writeFileSync(f.out, json); console.error(`IR -> ${f.out}`); }
    else console.log(json);
    return;
  }
  if (cmd === 'draw') {
    const r = draw(pos[0], opts);
    const v = r.receipt.validation;
    console.log(`✓ ${r.subject} [${r.type}]  checks ${v.checksPassed}/${v.checkCount}  errors ${v.errors}  warnings ${v.warnings}`);
    console.log(`  IR   : ${r.ir}`);
    console.log(`  HTML : ${r.html}  (${r.receipt.artifact.bytes} bytes, sha256 ${r.receipt.artifact.sha256.slice(0, 12)}…)`);
    return;
  }
  if (cmd === 'all') {
    let bad = 0;
    for (const s of Object.keys(SUBJECTS)) {
      try { const r = draw(s, opts); const v = r.receipt.validation; console.log(`✓ ${s.padEnd(11)} ${v.checksPassed}/${v.checkCount}  ${r.html}`); }
      catch (e) { bad++; console.log(`🔴 ${s.padEnd(11)}\n      ${String(e.diagnostics || e.message)}`); }
    }
    process.exit(bad ? 1 : 0);
  }
  if (cmd === 'check') {
    const res = check(opts);
    console.log('═══ 🗺  ATLAS GATE (第47条) ═══');
    for (const r of res.rows) {
      const note = r.profile === 'standard' ? `  standard(最小交差 ${r.minCrossings})` : '';
      console.log(`  ${r.ok ? '✓' : '🔴'} ${r.subject.padEnd(11)} [${r.type.padEnd(12)}] ${String(r.checks).padEnd(4)} ${String(r.screen || '').padEnd(14)}${String(r.motion || '').padEnd(7)}${r.bytes ? r.bytes + 'b' : ''}${note}`);
      if (r.error) console.log(`      ${r.error}`);
    }
    console.log('────────────────────────────────');
    const dg = res.rows.filter(r => r.profile === 'standard');
    console.log(res.ok
      ? `  ✓ ${res.rows.length} 主題すべてが検査に通る` +
        (dg.length ? `（うち ${dg.length} 件は平面化不能のため standard: ${dg.map(r => r.subject).join(', ')}）` : '（全て showcase 9/9）')
      : '  🔴 図が壊れている — 楽園は己の姿を語れない');
    console.log('════════════════════════════════');
    process.exit(res.ok ? 0 : 1);
  }
  console.error('commands: subjects | ir <subject> [--out f] | draw <subject> [--out f] | all [--outdir d] | check');
  console.error('  options: --scale quick|standard|full|reform|counsel   --phase <phaseId>');
  process.exit(2);
}
if (require.main === module) main();
module.exports = { SUBJECTS, buildIr, draw, check, layered, irHierarchy, irConclave, irDispatch, irDag, irRun, irWiring, ARCHIFY, firstScreen, FIRST_SCREEN_KINDS };
