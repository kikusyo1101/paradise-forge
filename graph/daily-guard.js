#!/usr/bin/env node
/**
 * PARADISE :: daily-guard — the daily improvement quota keeper
 * ---------------------------------------------------------------------
 * The paradise improves itself once a day. The wish: fire at 22:00 JST when
 * kikus is most likely at the machine — but if the machine was OFF at 22:00,
 * catch up as soon as it wakes, so the day's quota is never silently lost.
 *
 * This is the MECHANISM behind that (Constitution Art. 10: a declaration is not
 * a mechanism). A watchdog job calls `claim` every 30 minutes; it answers
 * whether the daily run is owed right now AND hands out the single right to run.
 *
 *   daily-guard.js due          -> exit 0 = OWED (read-only probe, no side effect)
 *   daily-guard.js claim [who]  -> exit 0 = OWED **and you hold the lease**
 *   daily-guard.js release      -> drop a held lease (run aborted, retry sooner)
 *   daily-guard.js status       -> human-readable state
 *   daily-guard.js done [note]  -> record that today's run completed
 *   daily-guard.js reset        -> clear the ledger (testing)
 *
 * Rules:
 *   - "Today" is the JST calendar day (the god's timezone).
 *   - A day is owed once its 22:00 JST window has OPENED and no run is recorded
 *     for it. The window does not close at midnight: a day missed because the
 *     machine was off is still owed on wake (Art. 43 — a missed window is a
 *     debt, not a forgiveness).
 *   - Exactly one run per owed day, and exactly one runner at a time: `claim`
 *     is atomic, so the 22:00 job and the 30-minute watchdog can never both
 *     fire the same improvement.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const LEDGER = process.env.PARADISE_DAILY_LEDGER ||
  path.join(os.homedir(), '.claude', 'paradise-daily.json');
const TARGET_HOUR = Number(process.env.PARADISE_DAILY_HOUR || 22);
/** How long a claimed lease is honoured before it is presumed dead (minutes). */
const LEASE_MINUTES = Number(process.env.PARADISE_DAILY_LEASE_MINUTES || 90);
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

function prevDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * The most recent JST day whose window has already OPENED.
 * Before 22:00 today, the newest opened window belongs to YESTERDAY — which is
 * precisely the day a sleeping machine loses if the window is treated as
 * closing at midnight.
 */
function lastOpenWindow(now) {
  // An unreachable target hour means no window has ever opened (used by tests
  // to model "the window is shut"). Never invent a debt for a day whose window
  // cannot exist.
  if (TARGET_HOUR > 23) return null;
  return now.hour >= TARGET_HOUR ? now.date : prevDay(now.date);
}

/** Is a lease currently held by a live runner? */
function activeLease(l, now) {
  const lease = l.lease;
  if (!lease || !lease.expiresAt) return null;
  return Date.now() < lease.expiresAt ? lease : null;
}

/** Is the daily run owed right now? (read-only) */
function isDue() {
  const now = nowJst();
  const l = readLedger();
  const owedDay = lastOpenWindow(now);

  if (owedDay === null) {
    return { due: false, reason: `before the ${TARGET_HOUR}:00 JST window (now ${now.hour}:${String(now.minute).padStart(2, '0')})`, now, owedDay, ledger: l };
  }

  if (l.lastDate && l.lastDate >= owedDay) {
    const sameDay = l.lastDate === now.date;
    return {
      due: false,
      reason: sameDay
        ? `already ran today (${l.lastDate})`
        : `already ran for ${l.lastDate} (newest open window: ${owedDay})`,
      now, owedDay, ledger: l,
    };
  }

  const held = activeLease(l, now);
  if (held) {
    return {
      due: false,
      reason: `another runner holds the lease (${held.holder}, until ${held.expires})`,
      now, owedDay, ledger: l, leased: true,
    };
  }

  const catchUp = owedDay !== now.date || (l.lastDate && l.lastDate < prevDay(now.date));
  return {
    due: true,
    reason: catchUp
      ? `CATCH-UP: last run ${l.lastDate || '(never)'}; the ${owedDay} window opened and was missed`
      : `today's run (${owedDay}) is owed — window open since ${TARGET_HOUR}:00 JST`,
    catchUp: !!catchUp,
    now, owedDay, ledger: l,
  };
}

/**
 * Take the single right to run, atomically. Two callers racing at 22:00:00 and
 * 22:00:40 cannot both win: the ledger write is guarded by an exclusive lock
 * file, so the loser is told the lease is held.
 */
function claim(holder) {
  const lock = LEDGER + '.lock';
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  let fd;
  try {
    fd = fs.openSync(lock, 'wx');          // fails if another claimer holds it
  } catch {
    // A stale lock (crashed runner) must not wedge the quota forever.
    try {
      const age = Date.now() - fs.statSync(lock).mtimeMs;
      if (age > LEASE_MINUTES * 60 * 1000) { fs.rmSync(lock, { force: true }); fd = fs.openSync(lock, 'wx'); }
      else return { due: false, reason: 'another runner is claiming right now', now: nowJst(), leased: true };
    } catch {
      return { due: false, reason: 'another runner is claiming right now', now: nowJst(), leased: true };
    }
  }
  try {
    const r = isDue();
    if (!r.due) return r;
    const l = readLedger();
    const expiresAt = Date.now() + LEASE_MINUTES * 60 * 1000;
    l.lease = {
      holder: holder || 'unknown',
      day: r.owedDay,
      at: r.now.stamp,
      expires: new Date(expiresAt).toISOString(),
      expiresAt,
    };
    writeLedger(l);
    return { ...r, claimed: true, holder: l.lease.holder, ledger: l };
  } finally {
    fs.closeSync(fd);
    fs.rmSync(lock, { force: true });
  }
}

/** Give the lease back without recording a run (the attempt aborted). */
function release() {
  const l = readLedger();
  const had = !!l.lease;
  delete l.lease;
  writeLedger(l);
  return had;
}

function markDone(note) {
  const now = nowJst();
  const l = readLedger();
  // Credit the day that was actually owed, not merely the wall-clock day: a
  // catch-up run finishing on the 2nd settles the 1st's debt.
  const owedDay = l.lease && l.lease.day ? l.lease.day : lastOpenWindow(now);
  l.lastDate = owedDay;
  l.lastStamp = now.stamp;
  l.history = (l.history || []).concat([{ date: owedDay, at: now.stamp, note: note || '' }]).slice(-60);
  delete l.lease;
  writeLedger(l);
  return l;
}

function main() {
  const cmd = process.argv[2] || 'status';
  if (cmd === 'due') {
    const r = isDue();
    console.log(JSON.stringify({ due: r.due, catchUp: !!r.catchUp, owedDay: r.owedDay, reason: r.reason, jst: r.now.stamp }, null, 2));
    process.exit(r.due ? 0 : 1);          // exit 0 = OWED
  }
  if (cmd === 'claim') {
    const r = claim(process.argv.slice(3).join(' ') || 'cli');
    console.log(JSON.stringify({ due: r.due, claimed: !!r.claimed, catchUp: !!r.catchUp, owedDay: r.owedDay, reason: r.reason, jst: r.now.stamp }, null, 2));
    process.exit(r.claimed ? 0 : 1);      // exit 0 = OWED and the lease is YOURS
  }
  if (cmd === 'release') { console.log(release() ? 'lease released' : 'no lease held'); return; }
  if (cmd === 'done') { const l = markDone(process.argv.slice(3).join(' ')); console.log('recorded: ' + l.lastDate + ' @ ' + l.lastStamp); return; }
  if (cmd === 'reset') { writeLedger({ lastDate: null, history: [] }); console.log('ledger cleared: ' + LEDGER); return; }
  if (cmd === 'status') {
    const r = isDue();
    const l = r.ledger;
    console.log('PARADISE DAILY QUOTA');
    console.log('═'.repeat(52));
    console.log(`  now (JST)   : ${r.now.stamp}`);
    console.log(`  window      : every day at ${TARGET_HOUR}:00 JST (missed days stay owed)`);
    console.log(`  newest open : ${r.owedDay}`);
    console.log(`  last run    : ${l.lastDate || '(never)'}${l.lastStamp ? ' @ ' + l.lastStamp : ''}`);
    console.log(`  owed now    : ${r.due ? 'YES — ' + r.reason : 'no — ' + r.reason}`);
    if (l.lease) console.log(`  lease       : ${l.lease.holder} for ${l.lease.day} (until ${l.lease.expires})`);
    console.log(`  ledger      : ${LEDGER}`);
    if (l.history && l.history.length) {
      console.log('  recent      :');
      l.history.slice(-5).reverse().forEach(h => console.log(`    ${h.at}${h.note ? '  ' + h.note : ''}`));
    }
    console.log('═'.repeat(52));
    return;
  }
  console.error('commands: due | claim [holder] | release | done [note] | status | reset');
  process.exit(2);
}
if (require.main === module) main();
module.exports = { isDue, claim, release, markDone, nowJst, readLedger, lastOpenWindow, LEDGER, TARGET_HOUR };
