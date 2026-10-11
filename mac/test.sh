#!/bin/bash
# Smoke-tests the built app headlessly (no screen access needed):
#   1. the game boots inside the app with no JavaScript errors,
#   2. saved progress (localStorage) survives a relaunch,
#   3. a demo world renders; snapshots land in build/.
# Run mac/build.sh first.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$ROOT/build/FunTrivia.app/Contents/MacOS/FunTrivia"
[[ -x "$BIN" ]] || { echo "Build the app first: mac/build.sh"; exit 1; }

run() { "$@" & local pid=$!; ( sleep 30; kill $pid 2>/dev/null ) & local watchdog=$!; wait $pid; local code=$?; kill $watchdog 2>/dev/null || true; return $code; }

echo "1. Boot"
first=$(FUNTRIVIA_SELFTEST="$ROOT/build/Snapshot Launch.png" run "$BIN")
echo "   $first"
echo "2. Relaunch keeps saved data"
second=$(FUNTRIVIA_SELFTEST="$ROOT/build/Snapshot Launch.png" run "$BIN")
echo "   $second"
[[ "$second" != *'"previousRun":null'* ]] || { echo "FAIL: storage did not persist"; exit 1; }
echo "3. Demo world"
demo=$(FUNTRIVIA_DEMO=1 FUNTRIVIA_SELFTEST="$ROOT/build/Snapshot World Map.png" run "$BIN")
echo "   $demo"
[[ "$demo" == *'view-map'* ]] || { echo "FAIL: demo save did not open the world map"; exit 1; }
echo "PASS"
