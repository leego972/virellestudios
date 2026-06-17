#!/bin/sh
GW_PORT="${PORT:-3000}"
APP_PORT="$((GW_PORT + 1))"
echo "[start] Gateway=:$GW_PORT  App=:$APP_PORT"

echo "[start] Bootstrapping admin accounts..."
node seed-admin.mjs || echo "[start] Admin seed skipped (DATABASE_URL not set yet?)"

# Start Express on APP_PORT in background, capture logs
PORT="$APP_PORT" node dist/index.js > /tmp/app.log 2>&1 &
APP_PID=$!
echo "[start] Express started on :$APP_PORT (pid $APP_PID)"

# Start gateway on GW_PORT in background
PORT="$GW_PORT" node gateway.mjs &
GW_PID=$!
echo "[start] Gateway started on :$GW_PORT (pid $GW_PID)"

# Propagate SIGTERM/SIGINT to both child processes for clean shutdown
cleanup() {
  echo "[start] Shutting down..."
  kill "$GW_PID" 2>/dev/null
  kill "$APP_PID" 2>/dev/null
  wait "$GW_PID" 2>/dev/null
  wait "$APP_PID" 2>/dev/null
  exit 0
}
trap cleanup TERM INT

# Wait for gateway — clean up Express if it exits unexpectedly
wait "$GW_PID"
EXIT_CODE=$?
echo "[start] Gateway exited ($EXIT_CODE)"
kill "$APP_PID" 2>/dev/null
exit "$EXIT_CODE"