# syntax=docker/dockerfile:1
# Dokploy: Build Path = `/`  |  Docker File = `apps/ai-app/Dockerfile`  |  Context = `.`

FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate
WORKDIR /app

FROM base AS builder
# Fail fast if context is apps/ai-app instead of monorepo root
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
RUN node -e "const p=require('./package.json'); if (p.name !== 'ai-food-base' || !p.packageManager) { console.error('\\nERROR: Docker context must be the monorepo root.\\nIn Dokploy set Build Path=/ and Docker Context Path=.\\n'); process.exit(1); }"

COPY apps/ai-app/package.json ./apps/ai-app/
COPY apps/ai-food/package.json ./apps/ai-food/
RUN pnpm install --frozen-lockfile --filter=openrouter-gateway...

COPY apps/ai-app ./apps/ai-app
# prisma generate reads DATABASE_URL via prisma.config.ts — dummy is enough at build
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
RUN pnpm --filter openrouter-gateway run build

FROM base AS runner
ENV NODE_ENV=production
ENV IS_LOCAL=false
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 gateway

COPY --from=builder --chown=gateway:nodejs /app /app

USER gateway
EXPOSE 3000
WORKDIR /app/apps/ai-app
CMD ["pnpm", "run", "start:prod"]
