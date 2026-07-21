#!/bin/sh
set -eu

# Render exposes deployment metadata under RENDER_* variables. A few older
# application paths still read the previous host's variable names, so provide
# runtime-only compatibility aliases until those call sites are fully retired.
# No secret values are copied or logged.
if [ "${RENDER:-}" = "true" ]; then
  export RAILWAY_GIT_COMMIT_SHA="${RAILWAY_GIT_COMMIT_SHA:-${RENDER_GIT_COMMIT:-}}"
  export RAILWAY_PUBLIC_DOMAIN="${RAILWAY_PUBLIC_DOMAIN:-${RENDER_EXTERNAL_HOSTNAME:-}}"
fi

GW_PORT="${PORT:-3000}"
case "$GW_PORT" in
  ''|*[!0-9]*) echo "[start] FATAL: PORT must be numeric"; exit 1 ;;
esac
APP_PORT="$((GW_PORT + 1))"
echo "[start] Gateway=:$GW_PORT  App=:$APP_PORT  Host=${RENDER_EXTERNAL_HOSTNAME:-local}"

# Apply database migrations before anything else starts. On a brand-new
database there are no tables at all yet -- the app's own runtime
auto-migration only ALTERs tables it assumes already exist, so this is
the actual bootstrap step. Retries in case the DB isn't reachable yet
at cold start.
echo "[start] Applying database migrations..."
MIGRATE_OK=0
for i in $(seq 1 12); do
  if node run-migrations.mjs; then
    MIGRATE_OK=1
    break
  fi
  echo "[start] Migrations not ready yet (attempt $i/12), retrying in 5s..."
  sleep 5
done
if [ "$MIGRATE_OK" != "1" ]; then
  echo "[start] FATAL: migrations did not succeed after 12 attempts. Refusing to start with an unmigrated database."
  exit 1
fi

# Start Express on APP_PORT in background, capture logs.
PORT="$APP_PORT" node dist/index.js > /tmp/app.log 2>&1 &
APP_PID=$!
echo "[start] Express started on :$APP_PORT (pid $APP_PID)"

# Bootstrap admin accounts in the background, retrying while supplementary
# runtime migrations settle.
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
  kill "$GW_PID" 2>/dev/null || true
  kill "$APP_PID" 2>/dev/null || true
  wait "$GW_PID" 2>/dev/null || true
  wait "$APP_PID" 2>/dev/null || true
  exit 0
}
trap cleanup TERM INT

wait "$GW_PID"
EXIT_CODE=$?
echo "[start] Gateway exited ($EXIT_CODE)"
kill "$APP_PID" 2>/dev/null || true
exit "$EXIT_CODE"
