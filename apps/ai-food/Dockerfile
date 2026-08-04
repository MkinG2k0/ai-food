# syntax=docker/dockerfile:1
#
# Dokploy:
#   Build Path          = /apps/ai-food
#   Docker File         = Dockerfile
#   Docker Context Path = .
#   Port                = 80

FROM node:22-bookworm-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate
WORKDIR /app

COPY package.json ./
RUN pnpm install --no-frozen-lockfile
COPY . .

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

RUN pnpm run build

FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
