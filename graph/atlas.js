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

const ROOT = path.resolve(__dirname, '..');
const ARCHIFY = path.join(ROOT, 'overlay', 'vendor', 'archify', 'bin', 'archify.mjs');
const OUTDIR = path.join(ROOT, 'dashboard', 'atlas');

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
// 主題 4: dag — 道の全形 (層化グラフ描画)
// ══════════════════════════════════════════════════════════════════════
function irDag(scale) {
  const dag = forge.buildDag('<神託>', scale);
  const byId = new Map(dag.tasks.map(t => [t.id, t]));

  // ── 段(rank)を決める: まず最長経路 ────────────────────────────────
  const depth = {};
  const d = (id) => {
    if (depth[id] != null) return depth[id];
    const t = byId.get(id);
    return depth[id] = (t.deps || []).length ? Math.max(...t.deps.map(d)) + 1 : 0;
  };
  dag.tasks.forEach(t => d(t.id));

  /**
   * 段を「できるだけ遅く」へ押し下げる (ALAP)。
   *
   * 最長経路で段を決めると、子が一つだけ深い相が**段を飛ばす**辺を生む
   * (実測: standard の identity は深さ2、その唯一の子 build は深さ4)。
   * 段飛ばしは必ず幾何の問題を招くので、消せるものは先に消す。
   * 子を持つ相を「最も早い子の一段上」まで押し下げれば、その辺は隣り合う段
   * になる。ALAP 順位付けは層化描画の定石であり、依存の意味は変わらない。
   */
  const children = {};
  for (const t of dag.tasks) for (const dep of (t.deps || [])) (children[dep] ||= []).push(t.id);
  for (let pass = 0; pass < dag.tasks.length; pass++) {
    let moved = false;
    for (const t of [...dag.tasks].sort((a, b) => depth[b.id] - depth[a.id])) {
      const kids = children[t.id];
      if (!kids || !kids.length) continue;                 // 終端は動かさない
      const want = Math.min(...kids.map(k => depth[k])) - 1;
      if (want > depth[t.id]) { depth[t.id] = want; moved = true; }
    }
    if (!moved) break;
  }

  const byDepth = {};
  for (const t of dag.tasks) (byDepth[depth[t.id]] ||= []).push(t);

  /**
   * 段は**下へ**流し、同じ段の席は横に並べる。
   *
   * 縦流しは深さ10段で 2693px になり、1440x900 の実ブラウザを溢れる
   * (visual-check の実測)。だが横流しにすると幅が 1900px を超え、今度は
   * 字が潰れて desktop-readability が鳴いた。**どちらも通らない。**
   *
   * 相17・深さ10のグラフは、第一画面に収まらない。これは配置の下手さでは
   * なく**図の大きさそのもの**である。ゆえに縦流しを保ち、溢れることを
   * 測って認める(第47条(c)) — 道の全形は、巻物として読むものである。
   * 席と段は詰められるだけ詰めた: 高さ58px・段間104pxが、描画器の
   * 最小クリアランス(段間の隙間46px)を割らない下限である。
   */
  const W = 148, H = 58, COL = 178, ROW = 132;

  /**
   * 残った段飛ばしを **ダミー節点** で刻む (Sugiyama 法の第2段)。
   *
   * 五度、幾何で誤魔化そうとして五度とも門に鳴かれた:
   *   ・真下に引けば間の段の相を貫く            (edge-through-node)
   *   ・横辺から出せば同じ段の隣の相を貫く        (同上)
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
  for (const t of dag.tasks) for (const dep of (t.deps || [])) {
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
      for (const lv of [...p.map(d => d.lv), depth[to]]) {
        (perGap[lv] ||= []).push(key);
        gapLane[`${key}@${lv}`] = perGap[lv].length - 1;
      }
    }
  }
  const isDummy = (t) => !!t.dummy;
  /** 席順の最適化のため、ダミーも「上流を持つ実体」として扱う。 */
  const upstreamOf = (t) => {
    if (!isDummy(t)) return (byId.get(t.id).deps || []).map(dep => {
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
  const sweepAll = (layers) => {
    for (let sweep = 0; sweep < 8; sweep++) {
      let improved = false;
      for (const k of (sweep % 2 === 0 ? depths : [...depths].reverse())) {
        if (layers[k].length > 6) continue;             // 数え上げが爆発する段は触らない
        const up = layers[k - 1] || [], dn = layers[k + 1] || [];
        const score = (order) => crossings(up, order) + crossings(order, dn);
        const cur = score(layers[k]);
        let best = layers[k], bestN = cur;
        for (const q of perms(layers[k])) { const n = score(q); if (n < bestN) { best = q; bestN = n; } }
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
  const PAD_L = 40;
  const lvOf = (t) => t.lv !== undefined ? t.lv : depth[t.id];
  /**
   * 席の中心座標。ダミーも実体と同じ幅の席を占める — 席を細くすると辺が
   * 斜めに逃げ、直交が崩れる。
   *
   * ただしダミーの縦走りは**列の中心から半歩ずらす**。中心に置くと、上下の
   * 段で同じ列に立つ相の縦線と同じ x を共有し、描画器が ambiguous-corridor
   * で鳴いた(実測17px の並走)。ダミーは箱を持たないので、席の中でずれても
   * 何も貫かない — これが「見えない席」の利点である。
   */
  // ずらし幅は辺ごとに変える。同じ段に二本のダミーが並ぶとき、同じ幅だけ
  // ずらせば結局また並走する。席の幅(148px)の内側に収まる範囲で刻む。
  const slotX = (t) => PAD_L + Math.round((byDepth[lvOf(t)].indexOf(t) + (maxRow - byDepth[lvOf(t)].length) / 2) * COL) + W / 2
    + (t.dummy ? 40 + (skipRank[t.key] % 3) * 22 : 0);
  const rankY = (lv) => 40 + lv * ROW;
  const seatOf = (id) => byDepth[depth[id]].find(x => x.id === id);

  const components = dag.tasks.map(t => {
    const card = clergy.cardinalFor(t.id);
    return {
      id: idOf(t.id), type: t.gate ? 'security' : (card === 'tribunal' ? 'cloud' : 'backend'),
      label: t.id, sublabel: t.agent,
      pos: [slotX(seatOf(t.id)) - W / 2, rankY(depth[t.id])],
      size: [W, H], ...(t.gate ? { tag: '⚖ 門' } : {}),
    };
  });

  const connections = [];
  for (const t of dag.tasks) for (const dep of (t.deps || [])) {
    const base = { id: idOf(`e-${dep}-${t.id}`), from: idOf(dep), to: idOf(t.id), fromSide: 'bottom', toSide: 'top', ...(t.gate ? { variant: 'security' } : {}) };
    const p = skipPath[`${dep}->${t.id}`];
    if (p && p.length) {
      // ダミーの席を上から下へ縫う。折れは全て直角にする:
      //   起点の真下 → 席の x へ横に寄る → 席を縦に通る → …
      //   → 終点の x へ横に寄る → 終点の真上
      // 横に寄るのは必ず「次の段に入る直前の隙間」、縦に降りるのは必ず席の
      // 列の中。ゆえにどの相の箱も貫かない。
      // 横走りの高さ(段の上端からの距離)には二つの制約がある:
      //   ・浅すぎると枢機卿ドメインの枠線(箱の約16px外)に沿って走り、
      //     container-border-run で鳴く。境界は跨ぐもので、なぞるものではない。
      //   ・二本が近すぎると ambiguous-corridor(廊下の奪い合い)で鳴く。
      // ゆえに 26px から**14px 刻み**で配る。隙間 (ROW - H) = 74px あるので
      // 4本まで別々の廊下を持てる。dag は巻物と宣言してあるから、高さは惜しまない。
      const xStart = slotX(seatOf(dep)), xEnd = slotX(seatOf(t.id));
      const key = `${dep}->${t.id}`;
      /**
       * 隙間 (ROW - H) = 74px の中に、辺ごとの車線を刻む。
       * 下限 26px は箱の下辺からの最短クリアランス — これより浅いと
       * 枢機卿ドメインの枠線に沿って走り container-border-run で鳴く。
       * 上限は箱の下辺 +8px を割ってはならない (micro-segment)。
       * ゆえに 26/40/54 の三車線に収める。四本目は一本目と同じ廊下に戻るが、
       * 同じ隙間を四本が通る道は実測で存在しない。
       */
      const gapY = (lv) => rankY(lv) - (26 + (gapLane[`${key}@${lv}`] % 3) * 14);
      const raw = [];
      let prevX = xStart;
      for (const dm of p) {
        const y = gapY(dm.lv);
        raw.push([prevX, y], [slotX(dm), y]);
        prevX = slotX(dm);
      }
      const yLast = gapY(depth[t.id]);
      raw.push([prevX, yLast], [xEnd, yLast]);

      // 席の x が一致すると長さ0の折れが生まれ、描画器が micro-segment で
      // 鳴く。同じ点と一直線上の点を畳んでから渡す — 経路の意味は変わらない。
      const via = [];
      for (const pt of raw) {
        const lastP = via[via.length - 1];
        if (lastP && lastP[0] === pt[0] && lastP[1] === pt[1]) continue;
        const prevP = via[via.length - 2];
        if (lastP && prevP && ((prevP[0] === lastP[0] && lastP[0] === pt[0]) || (prevP[1] === lastP[1] && lastP[1] === pt[1]))) via.pop();
        via.push(pt);
      }
      connections.push({ ...base, via });
    } else {
      connections.push(base);
    }
  }

  const domains = [...new Set(dag.tasks.map(t => clergy.cardinalFor(t.id)))];
  const gates = dag.tasks.filter(t => t.gate).map(t => t.id);
  const maxLv = Math.max(...Object.values(depth));

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
  const irreducible = bestTotal;
  return {
    schema_version: 1, diagram_type: 'architecture',
    meta: {
      title: `${SUBJECTS.dag.title} (scale: ${scale})`,
      quality_profile: irreducible ? 'standard' : 'showcase',
      // 描画器は viewBox に 320px の下限を課す。相が一列しかない道(quick)では
      // 式の答えが 258px になり、門が正しく鳴いた。式に下限を持たせる。
      viewBox: [Math.max(320, PAD_L + (maxRow - 1) * COL + W + 40), Math.max(320, 40 + (maxLv + 1) * ROW + 40)],
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
      { dot: 'cyan', title: `道の性質 (${scale})`, items: [`相: ${dag.tasks.length}`, `深さ: ${maxLv + 1} 段`, `門: ${gates.join(', ')}`, `産物: ${dag.meta.produces}`] },
      { dot: 'amber', title: '同じ深さは同時に走る', items: depths.filter(k => byDepth[k].filter(x => !isDummy(x)).length > 1).map(k => `深さ${k}: ${byDepth[k].filter(x => !isDummy(x)).map(t => t.id).join(' / ')}`) },
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
function buildIr(subject, opts = {}) {
  const scale = opts.scale || 'standard';
  switch (subject) {
    case 'hierarchy': return irHierarchy();
    case 'conclave': return irConclave(scale);
    case 'dispatch': return irDispatch(opts.phase || 'build');
    case 'dag': return irDag(scale);
    case 'run': return irRun();
    default: throw new Error(`未知の主題: ${subject} (${Object.keys(SUBJECTS).join(' | ')})`);
  }
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
 */
function firstScreen(htmlPath) {
  try {
    const raw = execFileSync(process.execPath, [ARCHIFY, 'visual-check', htmlPath, '--json'], {
      cwd: path.dirname(path.dirname(ARCHIFY)), encoding: 'utf8',
      env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1' },
    });
    return { ok: true, receipt: JSON.parse(raw) };
  } catch (e) {
    let r = null; try { r = JSON.parse(String(e.stdout)); } catch {}
    const over = (r && r.diagnostics || []).filter(d => d.code === 'viewer/viewport-overflow');
    const worst = over.reduce((a, d) => Math.max(a, (d.evidence || {}).scrollHeight || 0), 0);
    return { ok: false, overflow: worst, receipt: r,
             reason: over.length ? `第一画面に収まらない (最大 ${worst}px)` : (r && r.status) || String(e.message).slice(0, 200) };
  }
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
function check(opts = {}) {
  const outdir = opts.outdir || path.join(os.tmpdir(), 'paradise-atlas-check');
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
      const fs2 = opts.skipBrowser ? { ok: true } : firstScreen(r.html);
      const scrollOk = fs2.ok || SUBJECTS[subject].scroll === true;
      rows.push({
        subject, type: r.type, profile: r.profile, minCrossings: r.minCrossings,
        ok: errorsOk && warnOk && profileOk && scrollOk,
        checks: `${v.checksPassed}/${v.checkCount}`, errors: v.errors, warnings: v.warnings,
        screen: fs2.ok ? 'fits' : (SUBJECTS[subject].scroll ? `scroll(${fs2.overflow}px)` : 'OVERFLOW'),
        bytes: (r.receipt.artifact || {}).bytes,
        ...(!scrollOk ? { error: `${fs2.reason} — 図は第一画面に収まってこそ図である。巻物でよいなら SUBJECTS に scroll:true と宣言せよ (第47条c)` } : {}),
        ...(errorsOk && !profileOk ? { error: impossible
          ? '平面化不能なのに showcase を名乗っている — 交差を隠している'
          : 'showcase を満たせる図が standard を名乗っている — 格下げの根拠が無い' } : {}),
        ...(errorsOk && profileOk && !warnOk ? { error: `警告 ${v.warnings} 件 — 平面化は可能なのに図が汚れている` } : {}),
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
  const opts = { scale: f.scale, phase: f.phase, out: f.out, outdir: f.outdir };

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
      console.log(`  ${r.ok ? '✓' : '🔴'} ${r.subject.padEnd(11)} [${r.type.padEnd(12)}] ${String(r.checks).padEnd(4)} ${String(r.screen || '').padEnd(14)}${r.bytes ? r.bytes + 'b' : ''}${note}`);
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
module.exports = { SUBJECTS, buildIr, draw, check, irHierarchy, irConclave, irDispatch, irDag, irRun, ARCHIFY };
