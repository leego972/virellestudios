#!/bin/sh
  GW_PORT="${PORT:-3000}"
  APP_PORT="$((GW_PORT + 1))"
  echo "[start] Gateway=:$GW_PORT  App=:$APP_PORT"

  # Start Express app on APP_PORT in background
  PORT="$APP_PORT" node dist/index.js &

  # Gateway runs in foreground
  PORT="$GW_PORT" exec node gateway.mjs
  