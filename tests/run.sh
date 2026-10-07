#!/usr/bin/env bash
# Runs every automated check: content, the AI service (with a fake Gemini) and the browser tests on a built site.
#   tests/run.sh             everything
#   tests/run.sh reader a11y only these browser-test groups
# Needs: Node 22.18+, esbuild where Node can find it (npm install --no-save esbuild), Python with Playwright + Chromium.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${OUT:-_site_test}"; WEB_PORT="${WEB_PORT:-8766}"; AI_PORT="${AI_PORT:-9201}"

echo "== content"; node tools/validate.js | tail -n 2
echo "== AI service"; node tools/ai_function_test.mjs | tail -n 3
echo "== build"; node tools/build.js "$OUT" test > /dev/null

node tests/serve.mjs "$OUT" "$WEB_PORT" > /dev/null & WEB_PID=$!
PORT="$AI_PORT" ORIGIN="http://localhost:$WEB_PORT" node tests/mockai.mjs > /dev/null & AI_PID=$!
trap 'kill $WEB_PID $AI_PID 2>/dev/null || true' EXIT
sleep 1

echo "== browser"
BASE="http://localhost:$WEB_PORT/" AI_URL="http://localhost:$AI_PORT/ai" python3 tests/e2e.py "$@"
