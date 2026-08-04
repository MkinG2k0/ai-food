# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate
WORKDIR /app

FROM base AS prepare
RUN npm install -g turbo@^2
COPY . .
RUN turbo prune ai-food --docker

FROM base AS builder
COPY --from=prepare /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prepare /app/out/full/ .

# Baked into the SPA at build time — set in Dokploy Env / Docker build args
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

RUN pnpm exec turbo run build --filter=ai-food

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/apps/ai-food/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/ai-food/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
