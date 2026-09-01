#!/usr/bin/env python3
"""PARADISE :: daily catch-up watchdog (no-agent cron script).

Runs every 30 minutes with NO agent (no tokens). Asks daily-guard whether
today's improvement is still owed; if it is -- because the 22:00 JST window
was missed while the machine slept -- it CLAIMS the run and fires the daily
job immediately.

Silence is success: prints NOTHING when nothing is owed, so the user is never
pinged for a no-op (the watchdog pattern).

Two hard-won rules are encoded here; do not "simplify" them away:

1. CLAIM, don't merely ask (`claim`, not `due`). The 22:00 job and this
   watchdog can both find the day owed within the same minute -- the improvement
   takes minutes to run and records `done` only at the end. The lease makes the
   right to run exclusive, so the paradise can never improve itself twice and
   open two competing PRs.

1b. Claim as a DISPATCHER (`--dispatch`), never as a runner. This watchdog does
   not improve anything itself; it fires the agent that will. A full run-lease
   held here locks out the very agent being fired -- it boots, asks for the
   right to run, is told "another runner holds the lease", and exits doing
   nothing. That deadlock is invisible: every gate stays green while the
   catch-up path is dead. A dispatch lease is a short bridge (10 min) that the
   fired runner ADOPTS when it claims for real (Art. 45).

2. `hermes cron run` EXITS 0 EVEN WHEN IT FAILS. Verified by hand:
       $ hermes cron run ZZZnotarealjob
       Failed to run job: Job with ID or name 'ZZZnotarealjob' not found.
       returncode: 0
   So the return code is not a verdict -- the output text is. If the fire did
   not actually take, the lease MUST be released, or a single failed dispatch
   would wedge the day's quota shut until the lease expired.

NOTE: this is Python, not bash, on purpose. The Hermes scheduler hands the
script its path in native Windows form (C:\\Users\\...); bash on this host eats
the backslashes and dies with exit 127. Python is invoked natively and is safe.
"""
import json
import os
import shutil
import subprocess
import sys

PARADISE = r"C:/Users/kikus/Documents/workspace/paradise"
GUARD = os.path.join(PARADISE, "graph", "daily-guard.js")
DAILY_JOB = "04a496e1ac86"  # 楽園・日次自律改善（22時 / キャッチアップ対応）
HOLDER = "catchup-watchdog"

# Text that proves the dispatch did NOT take, despite an exit code of 0.
FAILURE_MARKERS = ("failed to run", "not found", "traceback", "error:")


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, shell=False)


def release():
    node = shutil.which("node")
    if node:
        run([node, GUARD, "release", HOLDER])


def main():
    if not os.path.isfile(GUARD):
        return 0  # nothing to guard yet

    node = shutil.which("node")
    hermes = shutil.which("hermes")
    if not node or not hermes:
        # A watchdog that cannot see its own tools must SAY so: a non-zero exit
        # surfaces as an error alert rather than failing silently forever.
        print("⚠️ 日次改善の監視が走れません（node または hermes が PATH に無い）")
        print(f"   node={node} hermes={hermes}")
        return 1

    # Take the right to run as a DISPATCHER: a short bridge the fired agent
    # adopts. Claiming a full run-lease here would lock out that very agent.
    p = run([node, GUARD, "claim", HOLDER, "--dispatch"])
    if p.returncode != 0:
        return 0  # not owed, or another runner holds it -> silent

    info = {}
    try:
        info = json.loads(p.stdout)
    except Exception:
        pass
    reason = info.get("reason", "owed")
    owed_day = info.get("owedDay", "?")

    fired = run([hermes, "cron", "run", DAILY_JOB])
    blob = ((fired.stdout or "") + (fired.stderr or "")).lower()
    ok = fired.returncode == 0 and not any(m in blob for m in FAILURE_MARKERS)

    if ok:
        print("⏰ 楽園・日次改善のノルマ未達を検知 → 即時発火しました")
        print(f"   負っている日: {owed_day}")
        print(f"   理由: {reason}")
        return 0

    # The fire did not take. Give the right back so the next tick can retry.
    release()
    print("⚠️ 日次改善の即時発火に失敗しました（ノルマは未達のまま・次回再挑戦します）")
    print(f"   負っている日: {owed_day}")
    print(f"   出力: {((fired.stdout or '') + (fired.stderr or '')).strip()[:400]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
