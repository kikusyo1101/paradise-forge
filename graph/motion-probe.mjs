/**
 * 動きが実際に宿っているかを、実ブラウザで測る (第50条)。
 *
 * 静的な 9/9 も、第一画面の実測も、**動きについては何も言わない**。
 * 神が「signal が動いていない・play story が非活性」と告げたとき、
 * 門は全て緑だった — 門が見ていない事実は、壊れても鳴らないからである。
 *
 * ゆえにこの検器は主張ではなく数を持ち帰る:
 *   motionCapable  — viewer の motionGovernor が生きているか
 *   animatedEls    — 実際に動く要素の数 (0 なら静止画である)
 *   playDisabled   — Play story が押せるか
 *   beatAdvanced   — 押した先で章が実際に**進んだ**か
 *
 * 「押せる」は「動く」ではない。ゆえに押して、待って、進みを測る。
 *
 * 使い方: node graph/motion-probe.mjs <html> [--json]
 * 描画器の Chrome 起動機構をそのまま借りる — 検器のために別の供給線を引かない(第20条)。
 */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { ChromeVisualBrowser, findChrome } from '../overlay/vendor/archify/bin/visual-check.mjs';

/** 借り物が置いていく一時プロファイルの名。数えるのも消すのもこの一箇所で決める */
const PROFILE_MARK = 'archify-visual-check-profile';

/** 今ある一時プロファイルの名を取る。読めない環境でも落ちない */
function listProfiles() {
  try { return fs.readdirSync(os.tmpdir()).filter((f) => f.includes(PROFILE_MARK)); }
  catch { return []; }
}

/**
 * 構築前に無く、構築後に在るものだけを消す。**他の走行の作業場を巻き込まない** ——
 * 並行して走る検器のプロファイルを消せば、こちらが相手を壊す側になる。
 */
function sweepOrphanProfiles(before) {
  const known = new Set(before);
  for (const name of listProfiles()) {
    if (known.has(name)) continue;
    try { fs.rmSync(path.join(os.tmpdir(), name), { recursive: true, force: true }); } catch { /* 掃除の失敗は裁定を汚さない */ }
  }
}

const STATE = `(function () {
  var svg = document.querySelector('.diagram-container svg');
  var panel = document.querySelector('.guided-views');
  var play = document.getElementById('guided-view-play');
  var note = document.getElementById('guided-view-note');
  return JSON.stringify({
    motionCapable: document.documentElement.getAttribute('data-motion-capable') === 'true',
    motionAttr: document.documentElement.getAttribute('data-motion'),
    svgAnimation: svg ? svg.getAttribute('data-animation') : null,
    animatedEls: svg ? svg.querySelectorAll('[data-animate]').length : 0,
    governorCapable: !!(window.Archify && Archify.motionGovernor && Archify.motionGovernor.capable),
    hasPlay: !!play,
    playDisabled: play ? !!play.disabled : null,
    playing: panel ? panel.getAttribute('data-playing') : null,
    activeView: panel ? panel.getAttribute('data-active-view') : null,
    beat: note ? (note.textContent || '').trim() : ''
  });
})()`;

export async function probeMotion(htmlPath, { settleMs = 1200, playMs = 3000 } = {}) {
  const chrome = findChrome();
  if (!chrome) return { ok: false, reason: 'Chrome が見つからない — 動きは測れない' };
  // ■ 構築そのものが落ちる道 (第20条の内で塞ぐ)
  //   ChromeVisualBrowser の constructor は **profileRoot を mkdtempSync してから**
  //   Chrome を spawn する。spawn が失敗すると browser 変数に代入される前に throw し、
  //   下の finally の browser.close() は**空振りする** —— プロファイルだけが残る。
  //   実測: 実在しない Chrome を渡すと BEFORE=0 AFTER=1 (差 1)。
  //   借り物 (overlay/vendor/archify) には手を入れない (第20条) ので、
  //   **呼ぶ側が構築の失敗を引き受け、己の残骸を自分で片づける**。
  let browser;
  const profilesBefore = listProfiles();
  // ■ 非同期に飛んでくる死 (CI の Linux が教えた道)
  //   偽の実行ファイルは **spawn には成功する**。落ちるのはその後、CDP のパイプに
  //   書いた瞬間の EPIPE であり、それは try/catch にも finally にも捕まらない
  //   **unhandled rejection** として飛んでくる —— プロセスごと落ちるので、
  //   下の finally は一行も走らない。残骸だけが残る。
  //   ゆえに **プロセスが倒れる瞬間そのもの**に掃除を結ぶ。
  const sweepOnDeath = () => { try { sweepOrphanProfiles(profilesBefore); } catch { /* 最期の掃除が例外で騒がない */ } };
  process.once('exit', sweepOnDeath);
  process.once('uncaughtException', (e) => { sweepOnDeath(); throw e; });
  process.once('unhandledRejection', (e) => { sweepOnDeath(); throw e; });
  try {
    browser = new ChromeVisualBrowser(chrome);
  } catch (e) {
    // constructor は既に profileRoot を作った後かもしれない。**己の残骸は己で片づける**
    sweepOrphanProfiles(profilesBefore);
    return { ok: false, reason: `検器を起こせない: ${String((e && e.message) || e).split('\n')[0]}` };
  }
  try {
    const sessionId = await browser.sessionPromise;
    const send = (m, p) => browser.cdp.send(m, p, sessionId);
    const run = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result?.value;
    };

    await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
    // **測る側の好みで結果を変えない。** 実測: この上書きが無いと headless は
    // prefers-reduced-motion:reduce を名乗り、健全な図まで「動かない」と鳴った。
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });

    const loaded = browser.cdp.waitFor('Page.loadEventFired', sessionId);
    const nav = await send('Page.navigate', { url: pathToFileURL(path.resolve(htmlPath)).href });
    if (nav.errorText) throw new Error(`navigation failed: ${nav.errorText}`);
    await loaded;
    await new Promise((r) => setTimeout(r, settleMs));

    const before = JSON.parse(await run(STATE));
    let after = null;
    if (before.hasPlay && !before.playDisabled) {
      await run(`document.getElementById('guided-view-play').click(), 1`);
      await new Promise((r) => setTimeout(r, playMs));
      after = JSON.parse(await run(STATE));
    }

    const beatAdvanced = !!(after && after.beat && after.beat !== before.beat);
    const failures = [];
    if (!before.motionCapable || !before.governorCapable) failures.push('motionGovernor が capable でない — meta.animation:"trace" を名乗っていない疑い');
    if (!before.animatedEls) failures.push('動く要素が 0 個 — 描画器は静止画を作っている');
    if (before.svgAnimation !== 'trace') failures.push(`svg[data-animation] が "${before.svgAnimation}" — "trace" でなければ Live/Signal Flow/Play story は全て眠る`);
    if (!before.hasPlay) failures.push('Play story の釦自体が無い — meta.views が空である疑い');
    else if (before.playDisabled) failures.push('Play story が非活性 — 押せない釦は機能ではない');
    else if (!beatAdvanced) failures.push('Play story を押しても章が進まない — 活性は再生の証拠ではない');

    return { ok: failures.length === 0, failures, before, after, beatAdvanced };
  } finally {
    // 第50条(d): 借り物の作法は借り物の正典に問う。
    // 描画器は正しい後始末を close() として公開していた
    // (overlay/vendor/archify/bin/visual-check.mjs): (1) SIGTERM → 1500ms 後
    // **SIGKILL エスカレーション**、(2) **fs.rmSync(this.profileRoot)**。
    // 自前の半端な kill だけを呼んでいた頃は SIGTERM を無視した Chrome が生き残り、
    // 一時プロファイルが 483 → 519 → 529 と単調増加した (検器 1 回で +2)。
    // 残った Chrome が握るファイルが次の走行の file:// を ERR_FILE_NOT_FOUND にし、
    // 第21条テストを**不定に**赤くしていた。await は後始末が終わるまで待つ意である。
    try { await browser.close(); } catch { /* 検器の後始末が本体の裁定を汚さない */ }
    // close() が例外で倒れれば rmSync(profileRoot) にも届いていない。
    // **後始末が失敗したことを、後始末をしなかった言い訳にしない** ——
    // この走行が生んだ分だけを掃く(他所の走行の作業場には触れない)
    sweepOrphanProfiles(profilesBefore);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) { console.error('usage: node graph/motion-probe.mjs <html> [--json]'); process.exit(2); }
  const res = await probeMotion(file);
  if (args.includes('--json')) console.log(JSON.stringify(res, null, 2));
  else {
    console.log(`${res.ok ? '✓' : '🔴'} ${path.basename(file)}  動く要素 ${res.before?.animatedEls ?? '—'}  Play ${res.before?.playDisabled === false ? '活性' : '非活性'}  章の進み ${res.beatAdvanced ? 'あり' : 'なし'}`);
    for (const f of res.failures || []) console.log(`      ${f}`);
  }
  process.exit(res.ok ? 0 : 1);
}
