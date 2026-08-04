# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate
WORKDIR /app

FROM base AS prepare
RUN npm install -g turbo@^2
COPY . .
RUN turbo prune openrouter-gateway --docker

FROM base AS builder
COPY --from=prepare /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prepare /app/out/full/ .
# prisma generate reads DATABASE_URL via prisma.config.ts — dummy is enough at build
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
RUN pnpm exec turbo run build --filter=openrouter-gateway

FROM base AS runner
ENV NODE_ENV=production
ENV IS_LOCAL=false
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 gateway

# Full pruned tree keeps pnpm symlink layout intact
COPY --from=builder --chown=gateway:nodejs /app /app

USER gateway
EXPOSE 3000
WORKDIR /app/apps/ai-app
CMD ["pnpm", "run", "start:prod"]
