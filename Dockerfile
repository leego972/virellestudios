FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Install pnpm via npm so Docker is decoupled from the packageManager field.
# corepack would pin pnpm@10.4.1 (stale field) instead of the 10.33.x that
# generated the current lockfile, causing ERR_PNPM_OUTDATED_LOCKFILE.
RUN npm install -g pnpm

# ─── Install dependencies (pre-warms Docker cache layer) ───
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml .pnpmfile.cjs ./