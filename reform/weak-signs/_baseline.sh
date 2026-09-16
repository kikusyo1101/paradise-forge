#!/usr/bin/env bash
# 基準線: 7 門を一つずつ逐次に走らせる (NFR-1: 並行させると hermetic 系が偽の✗を出す)
cd /c/Users/kikus/Documents/workspace/paradise || exit 9
OUT=reform/weak-signs/_baseline_out.txt
: > "$OUT"
run() {
  echo "" >> "$OUT"
  echo "=== \$ $* ===" >> "$OUT"
  "$@" >> "$OUT" 2>&1
  echo "--- exit=$? ---" >> "$OUT"
}
run node tests/paradise.test.js
run node tests/route-matrix.test.js
run node tests/counsel.test.js
run node tests/route-debt.test.js
run node tests/ratify-guard.test.js
run node graph/wiring.js check
run node graph/conclave.js audit
echo "ALL DONE" >> "$OUT"
