#!/usr/bin/env node
/**
 * PARADISE :: daily-guard — the daily improvement quota keeper
 * ---------------------------------------------------------------------
 * The paradise improves itself once a day. The wish: fire at 22:00 JST when
 * kikus is most likely at the machine — but if the machine was OFF at 22:00,
 * catch up as soon as it wakes, so the day's quota is never silently lost.
 *
 * This is the MECHANISM behind that (Constitution Art. 10: a declaration is not
 * a mechanism). A watchdog job calls `due` every 30 minutes; it answers whether
 * the daily run is owed right now.
 *
 *   daily-guard.js due     -> exit 0 = OWED (fire now), exit 1 = not owed
 *   daily-guard.js status  -> human-readable state
 *   daily-guard.js done    -> record that today's run completed
 *   daily-guard.js reset   -> clear the ledger (testing)
 *
 * Rules:
 *   - "Today" is the JST calendar day (the god's timezone).
 *   - The run is OWED when: today's date > last recorded date AND the local
 *     clock is at/after the target hour (default 22:00 JST).
 *   - Once recorded, no further runs are owed that day — exactly one per day.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const LEDGER = process.env.PARADISE_DAILY_LEDGER ||
  path.join(os.homedir(), '.claude', 'paradise-daily.json');
const TARGET_HOUR = Number(process.env.PARADISE_DAILY_HOUR || 22);
const TZ = 'Asia/Tokyo';

/** The current JST date (YYYY-MM-DD) and hour, regardless of machine timezone. */
function nowJst() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    stamp: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} JST`,
  };
}

function readLedger() {
  try { return JSON.parse(fs.readFileSync(LEDGER, 'utf8')); }
  catch { return { lastDate: null, history: [] }; }
}

function writeLedger(l) {
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.writeFileSync(LEDGER, JSON.stringify(l, null, 2));
}

/** Is the daily run owed right now? */
function isDue() {
  const now = nowJst();
  const l = readLedger();
  if (l.lastDate === now.date) {
    return { due: false, reason: `already ran today (${now.date})`, now, ledger: l };
  }
  if (now.hour < TARGET_HOUR) {
    return { due: false, reason: `before the ${TARGET_HOUR}:00 JST window (now ${now.hour}:${String(now.minute).padStart(2, '0')})`, now, ledger: l };
  }
  const missed = l.lastDate && l.lastDate < prevDay(now.date);
  return {
    due: true,
    reason: missed
      ? `CATCH-UP: last run was ${l.lastDate}; today (${now.date}) is owed`
      : `today's run (${now.date}) is owed — window open since ${TARGET_HOUR}:00 JST`,
    catchUp: !!missed,
    now, ledger: l,
  };
}

function prevDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function markDone(note) {
  const now = nowJst();
  const l = readLedger();
  l.lastDate = now.date;
  l.lastStamp = now.stamp;
  l.history = (l.history || []).concat([{ date: now.date, at: now.stamp, note: note || '' }]).slice(-60);
  writeLedger(l);
  return l;
}

function main() {
  const cmd = process.argv[2] || 'status';
  if (cmd === 'due') {
    const r = isDue();
    console.log(JSON.stringify({ due: r.due, catchUp: !!r.catchUp, reason: r.reason, jst: r.now.stamp }, null, 2));
    process.exit(r.due ? 0 : 1);          // exit 0 = OWED
  }
  if (cmd === 'done') { const l = markDone(process.argv.slice(3).join(' ')); console.log('recorded: ' + l.lastStamp); return; }
  if (cmd === 'reset') { writeLedger({ lastDate: null, history: [] }); console.log('ledger cleared: ' + LEDGER); return; }
  if (cmd === 'status') {
    const r = isDue();
    const l = r.ledger;
    console.log('PARADISE DAILY QUOTA');
    console.log('═'.repeat(52));
    console.log(`  now (JST)   : ${r.now.stamp}`);
    console.log(`  window      : every day at ${TARGET_HOUR}:00 JST (catch-up on wake)`);
    console.log(`  last run    : ${l.lastDate || '(never)'}${l.lastStamp ? ' @ ' + l.lastStamp : ''}`);
    console.log(`  owed now    : ${r.due ? 'YES — ' + r.reason : 'no — ' + r.reason}`);
    console.log(`  ledger      : ${LEDGER}`);
    if (l.history && l.history.length) {
      console.log('  recent      :');
      l.history.slice(-5).reverse().forEach(h => console.log(`    ${h.at}${h.note ? '  ' + h.note : ''}`));
    }
    console.log('═'.repeat(52));
    return;
  }
  console.error('commands: due | done [note] | status | reset');
  process.exit(2);
}
if (require.main === module) main();
module.exports = { isDue, markDone, nowJst, readLedger, LEDGER, TARGET_HOUR };
