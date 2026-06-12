#!/bin/sh
GW_PORT="${PORT:-3000}"
APP_PORT="$((GW_PORT + 1))"
echo "[start] Gateway=:$GW_PORT  App=:$APP_PORT"

# Pipe to both stdout (Railway logs) AND /tmp/app.log (debug endpoint)
PORT="$APP_PORT" node dist/index.js 2>&1 | tee /tmp/app.log &

# Gateway in foreground
PORT="$GW_PORT" exec node gateway.mjs
