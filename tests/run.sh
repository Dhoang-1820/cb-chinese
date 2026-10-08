#!/usr/bin/env bash
# Runs every automated check: content, the AI service (with a fake Gemini) and the browser tests on a built site.
#   tests/run.sh             everything
#   tests/run.sh reader a11y only these browser-test groups
# Needs: Node 22.18+, esbuild where Node can find it (npm install --no-save esbuild), Python with Playwright + Chromium.
set -euo pipefail
cd "$(dirname "$0")/.."
trap 'echo "::error title=Tests::tests/run.sh stopped at line $LINENO (see the step log)"' ERR
OUT="${OUT:-_site_test}"; WEB_PORT="${WEB_PORT:-8766}"; AI_PORT="${AI_PORT:-9201}"

echo "== content"; node tools/validate.js | tail -n 2   # also runs validate_grammar / _drills / _hsk5 / _hsk5_drills / _hsk4x
echo "== HSK page watch"; node tools/hsk_watch_test.mjs | tail -n 1
echo "== AI service"; node tools/ai_function_test.mjs | tail -n 3
echo "== service worker: optional packs"; node tools/sw_packs_test.mjs | tail -n 1
echo "== cloud backup format"; node tests/backup_test.mjs | tail -n 1
echo "== build"; node tools/build.js "$OUT" test > /dev/null

node tests/serve.mjs "$OUT" "$WEB_PORT" > /dev/null & WEB_PID=$!
PORT="$AI_PORT" ORIGIN="http://localhost:$WEB_PORT" node tests/mockai.mjs > /dev/null & AI_PID=$!
trap 'kill $WEB_PID $AI_PID 2>/dev/null || true' EXIT
# wait until both servers answer (a cold machine can take several seconds), instead of hoping one second is enough
wait_for() { for _ in $(seq 1 60); do curl -s -o /dev/null "$1" && return 0; sleep 0.5; done; echo "::error title=Tests::$2 did not start"; echo "$2 did not start" >&2; return 1; }
wait_for "http://localhost:$WEB_PORT/index.html" "the test web server"
wait_for "http://localhost:$AI_PORT/__calls" "the stand-in AI service"

echo "== browser"
BASE="http://localhost:$WEB_PORT/" AI_URL="http://localhost:$AI_PORT/ai" python3 tests/e2e.py "$@"
