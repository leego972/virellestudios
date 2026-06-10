FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10.4.1

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY scripts/railway-normalize-package.cjs ./scripts/railway-normalize-package.cjs
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
COPY .pnpmfile.cjs* ./
RUN node scripts/railway-normalize-package.cjs && pnpm install --prod --no-frozen-lockfile
COPY --from=builder /app/dist ./dist
# Gateway + startup script — gateway listens on $PORT, proxies to app on $PORT+1.
# If the app hasn't started yet, gateway returns {"ok":true,"warming":true} so
# Railway's health check passes during cold start instead of killing the container.
COPY start.sh gateway.mjs ./
RUN chmod +x start.sh
EXPOSE 3000
CMD ["sh", "start.sh"]
