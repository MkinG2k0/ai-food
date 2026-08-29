# Dokploy

Три **Application** из одного Git-репозитория (`ai-food` / monorepo root). Предпочтительный билдер — **Dockerfile** (не Nixpacks).

## Applications

| App | Role | Build Path | Docker File | Context | Port |
|-----|------|------------|-------------|---------|------|
| Gateway | `apps/ai-app` Express | `/apps/ai-app` | `Dockerfile` | `.` | **3000** |
| Frontend | `apps/ai-food` SPA (nginx) | `/apps/ai-food` | `Dockerfile` | `.` | **80** |
| Web / Admin | `apps/ai-web` Next.js | `/apps/ai-web` | `Dockerfile` | `.` | **3001** |

Общие настройки в UI Dokploy:

- **Source** — тот же repo + branch
- **Build Path** — как в таблице (контекст = каталог приложения)
- **Docker File** = `Dockerfile`
- **Docker Context Path** = `.`
- **Docker Build Stage** — пусто
- **Port** — как в таблице
- Домен + HTTPS на каждое приложение отдельно

## Env: Gateway (`ai-app`)

Скопируй ключи из `apps/ai-app/.env.example`. Минимум для прода:

| Key | Notes |
|-----|--------|
| `OPENROUTER_API_KEY` | провайдер |
| `API_KEY` | общий секрет с `VITE_AI_GATEWAY_API_KEY` на фронте (опц.) |
| `DATABASE_URL` | Postgres |
| `AUTH_SECRET` | ≥32 символа |
| `IS_LOCAL` | `false` (слушать `0.0.0.0`) |
| `ADMIN_API_KEY` | тот же, что у `ai-web` |
| `PUBLIC_GATEWAY_URL` | публичный HTTPS origin этого сервиса |
| `PUBLIC_APP_URL` | origin фронта (`ai-food`) для T-Bank redirects |
| `TELEGRAM_*` / `TBANK_*` | по необходимости |

При старте контейнер гоняет `prisma migrate deploy`, затем сервер.

## Env: Frontend (`ai-food`)

**Build-time** (Dockerfile `ARG` / Dokploy Build Arguments) — попадают в Vite-бандл:

| Key | Notes |
|-----|--------|
| `VITE_AI_GATEWAY_URL` | публичный URL gateway |
| `VITE_AI_GATEWAY_API_KEY` | = `API_KEY` gateway |
| `VITE_APP_URL` | публичный URL этого SPA |
| `VITE_TELEGRAM_BOT_USERNAME` | опц. |
| `VITE_AUTH_MOCK` | `false` в проде |

Runtime env на nginx почти не нужен (статика).

## Env: Web / Admin (`ai-web`)

**Runtime** (вкладка Environment):

| Key | Notes |
|-----|--------|
| `ADMIN_PASSWORD` | пароль UI `/admin/login` |
| `ADMIN_SESSION_SECRET` | ≥32 символа |
| `ADMIN_API_KEY` | = `ADMIN_API_KEY` gateway |
| `AI_GATEWAY_URL` | публичный HTTPS origin gateway, без `/` в конце |
| `SITE_URL` | канонический URL лендинга (`https://…`) для sitemap / OG |

**Build-arg** (опционально, но желательно): `SITE_URL` — тот же URL, чтобы `metadataBase` / OG были верными уже в статике.

Генерация секретов:

```bash
openssl rand -base64 24   # ADMIN_PASSWORD
openssl rand -base64 32   # ADMIN_SESSION_SECRET / AUTH_SECRET
```

## Порядок деплоя

1. Postgres (Dokploy Database или внешний) → `DATABASE_URL` в Gateway.
2. Deploy **Gateway** → проверить `GET /health`.
3. Deploy **Frontend** с build-args на URL gateway.
4. Deploy **Web** (`ai-web`) с `AI_GATEWAY_URL` на gateway и `SITE_URL` на свой домен.
5. Проверки: лендинг `/`, `/admin/login`, админ-прокси к gateway (health / stats).

## Сеть

- `AI_GATEWAY_URL` и `VITE_AI_GATEWAY_URL` обычно **публичный HTTPS** доменов Dokploy.
- Если приложения в одной Docker-сети Dokploy, можно указать внутренний hostname сервиса gateway — тогда с браузера всё равно нужен публичный URL для Vite (`VITE_*` вшивается в клиент).

## Nixpacks (не рекомендуется)

В `apps/*/nixpacks.toml` есть запасные конфиги. Для прода используй Dockerfile из таблицы выше.
