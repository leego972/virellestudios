#!/bin/sh
  GW_PORT="${PORT:-3000}"
  APP_PORT="$((GW_PORT + 1))"
  echo "[start] Gateway=:$GW_PORT  App=:$APP_PORT"

  # Capture Express app stdout+stderr so gateway can expose it at /debug-app-log
  PORT="$APP_PORT" node dist/index.js > /tmp/app.log 2>&1 &

  # Gateway in foreground
  PORT="$GW_PORT" exec node gateway.mjs
  