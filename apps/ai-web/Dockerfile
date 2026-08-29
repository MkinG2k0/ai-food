# syntax=docker/dockerfile:1
#
# Dokploy:
#   Build Path          = /apps/ai-web
#   Docker File         = Dockerfile
#   Docker Context Path = .
#   Docker Build Stage  = (пусто)
#   Port                = 3001

FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate
WORKDIR /app

FROM base AS builder
COPY package.json ./
RUN pnpm install --no-frozen-lockfile
COPY . .

# Canonical URL for metadata / sitemap / OG (Dokploy build arg or leave empty)
ARG SITE_URL=
ENV SITE_URL=$SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER=1

RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
ENV HOME=/app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs --home /app --shell /usr/sbin/nologin nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3001
CMD ["node", "server.js"]
