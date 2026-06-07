FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm

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
EXPOSE 3000
CMD ["pnpm", "start"]
