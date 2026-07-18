FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10.4.1

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY scripts/railway-normalize-package.cjs ./scripts/railway-normalize-package.cjs
COPY patches/ ./patches/
COPY .pnpmfile.cjs* ./
RUN node scripts/railway-normalize-package.cjs && pnpm install --no-frozen-lockfile
COPY . .
ENV NODE_ENV=production
RUN pnpm build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
COPY scripts/railway-normalize-package.cjs ./scripts/railway-normalize-package.cjs
COPY patches/ ./patches/
COPY .pnpmfile.cjs* ./
RUN node scripts/railway-normalize-package.cjs && pnpm install --prod --no-frozen-lockfile
COPY --from=builder /app/dist ./dist
# Gateway listens on Render's injected $PORT and proxies to the Express app on
# $PORT+1. During cold start it returns a warming response so the health check
# does not terminate an otherwise healthy container before Express is ready.
COPY start.sh gateway.mjs seed-admin.mjs ./
RUN chmod +x start.sh
EXPOSE 3000
CMD ["sh", "start.sh"]
