#!/bin/sh
GW_PORT="${PORT:-3000}"
APP_PORT="$((GW_PORT + 1))"
echo "[start] Gateway=:$GW_PORT  App=:$APP_PORT"

PORT="$APP_PORT" node dist/index.js > /tmp/app.log 2>&1 &
APP_PID=$!
echo "[start] Express started on :$APP_PORT (pid $APP_PID)"

(
  echo "[start] Bootstrapping admin accounts (will retry until DB is ready)..."
  for i in $(seq 1 24); do
    if node seed-admin.mjs; then
      break
    fi
    echo "[start] Admin seed not ready yet (attempt $i/24), retrying in 5s..."
    sleep 5
  done
) &

PORT="$GW_PORT" node gateway.mjs &
GW_PID=$!
echo "[start] Gateway started on :$GW_PORT (pid $GW_PID)"

cleanup() {
  echo "[start] Shutting down..."
  kill "$GW_PID" 2>/dev/null
  kill "$APP_PID" 2>/dev/null
  wait "$GW_PID" 2>/dev/null
  wait "$APP_PID" 2>/dev/null
  exit 0
}
trap cleanup TERM INT

wait "$GW_PID"
EXIT_CODE=$?
echo "[start] Gateway exited ($EXIT_CODE)"
kill "$APP_PID" 2>/dev/null
exit "$EXIT_CODE"
