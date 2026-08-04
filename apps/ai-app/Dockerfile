# syntax=docker/dockerfile:1
#
# Dokploy:
#   Build Path          = /apps/ai-app
#   Docker File         = Dockerfile
#   Docker Context Path = .
#   Docker Build Stage  = (пусто)
#   Port                = 3000

FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate
WORKDIR /app

FROM base AS builder
COPY package.json ./
RUN pnpm install --no-frozen-lockfile
COPY . .
# prisma generate reads DATABASE_URL via prisma.config.ts — dummy is enough at build
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
ENV IS_LOCAL=false
ENV PORT=3000
# system user otherwise gets HOME=/nonexistent → corepack EACCES
ENV HOME=/app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --home /app --ingroupdir /app gateway

COPY --from=builder --chown=gateway:nodejs /app /app

USER gateway
EXPOSE 3000
WORKDIR /app
# bypass `pnpm` shim (corepack); use local bins
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && ./node_modules/.bin/tsx src/server.ts"]
