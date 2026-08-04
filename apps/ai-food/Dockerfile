# syntax=docker/dockerfile:1
# Dokploy: Build Path = `/`  |  Docker File = `apps/ai-food/Dockerfile`  |  Context = `.`

FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
RUN node -e "const p=require('./package.json'); if (p.name !== 'ai-food-base' || !p.packageManager) { console.error('\\nERROR: Docker context must be the monorepo root.\\nIn Dokploy set Build Path=/ and Docker Context Path=.\\n'); process.exit(1); }"

COPY apps/ai-app/package.json ./apps/ai-app/
COPY apps/ai-food/package.json ./apps/ai-food/
RUN pnpm install --frozen-lockfile --filter=ai-food...

COPY apps/ai-food ./apps/ai-food

ARG VITE_AI_GATEWAY_URL
ARG VITE_AI_GATEWAY_API_KEY
ARG VITE_API_URL
ARG VITE_TELEGRAM_BOT_USERNAME
ARG VITE_APP_URL
ARG VITE_AUTH_MOCK=false
ENV VITE_AI_GATEWAY_URL=$VITE_AI_GATEWAY_URL \
    VITE_AI_GATEWAY_API_KEY=$VITE_AI_GATEWAY_API_KEY \
    VITE_API_URL=$VITE_API_URL \
    VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME \
    VITE_APP_URL=$VITE_APP_URL \
    VITE_AUTH_MOCK=$VITE_AUTH_MOCK

RUN pnpm --filter ai-food run build

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/apps/ai-food/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/ai-food/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
