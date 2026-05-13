FROM node:22-slim AS base
  ENV PNPM_HOME="/pnpm"
  ENV PATH="$PNPM_HOME:$PATH"
  RUN corepack enable

  # ─── Install dependencies (pre-warms Docker cache layer) ───
  FROM base AS deps
  WORKDIR /app
  COPY package.json pnpm-lock.yaml ./
  COPY patches/ ./patches/
  RUN pnpm install --frozen-lockfile

  # ─── Build ───
  FROM base AS build
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  # Re-run install in full workspace context (pnpm-workspace.yaml now present) so
  # router@2.2.0 gets the correct path-to-regexp@8 — fixes "pathRegexp.match is not a function"
  RUN pnpm install --frozen-lockfile
  RUN pnpm run build

  # ─── Production ───
  FROM base AS production
  RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
  WORKDIR /app
  ENV NODE_ENV=production

  # Use node_modules from BUILD (workspace-correct) not deps (non-workspace)
  COPY --from=build /app/node_modules ./node_modules
  COPY --from=build /app/dist ./dist
  COPY --from=build /app/drizzle ./drizzle
  COPY package.json ./

  EXPOSE 3000
  COPY gateway.mjs start.sh ./
  RUN chmod +x start.sh

  CMD ["./start.sh"]
  