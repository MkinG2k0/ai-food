# Dokploy

Два **отдельных** Application в одном Git-репо (`ai-food`). Build context / path — **корень monorepo** (`.`).

| App в Dokploy | Build Path | Docker File | Port |
|---------------|------------|-------------|------|
| Gateway | `/apps/ai-app` | `Dockerfile` | **3000** |
| Frontend | `/apps/ai-food` | `Dockerfile` | **80** |

Рекомендуемый build type: **Dockerfile** (production). Nixpacks — запасной вариант (см. ниже).

## 1. Gateway (`openrouter-gateway`)

**General** (Dokploy часто ставит context = Build Path — поэтому собираем **из папки приложения**):

| Поле | Значение |
|------|----------|
| **Build Path** | `/apps/ai-app` |
| **Build Type** | Dockerfile |
| **Docker File** | `Dockerfile` ← не `apps/ai-app/Dockerfile` |
| **Docker Context Path** | `.` |
| **Docker Build Stage** | *(пусто)* |
| **Port** | `3000` |

**Watch paths (опционально):** `apps/ai-app/**`

**Environment** (runtime — вкладка Env):

```env
PORT=3000
IS_LOCAL=false
OPENROUTER_API_KEY=
API_KEY=
DATABASE_URL=
AUTH_SECRET=
FLASHCALL_API_KEY=
TELEGRAM_BOT_TOKEN=
FREE_GENERATION_LIMIT=50
AUTH_LOGIN_GENERATION_BONUS=100
PUBLIC_APP_URL=https://<frontend-domain>
SUBSCRIPTION_PRICE_KOPECKS=10000
SUBSCRIPTION_DURATION_DAYS=365
TBANK_TERMINAL_KEY=
TBANK_PASSWORD=
TBANK_API_URL=https://securepay.tinkoff.ru
# TBANK_MOCK=true
```

`start:prod` = `prisma migrate deploy` + сервер. Postgres должен быть доступен к моменту старта (Dokploy Postgres / внешний URL).

Домен → порт **3000**.

## 2. Frontend (`ai-food`)

**General**

| Поле | Значение |
|------|----------|
| **Build Path** | `/apps/ai-food` |
| **Build Type** | Dockerfile |
| **Docker File** | `Dockerfile` |
| **Docker Context Path** | `.` |
| **Port** | `80` |

**Watch paths:** `apps/ai-food/**`

**Environment** — переменные **на этапе build** (Vite вшивает `VITE_*` в бандл). В Dokploy задай их в Env приложения **до** деплоя; для Docker они должны попасть в build (Build Arguments / env available at build — зависит от версии Dokploy). Минимум:

```env
VITE_AI_GATEWAY_URL=https://<gateway-domain>
VITE_AI_GATEWAY_API_KEY=<тот же секрет что API_KEY на gateway>
VITE_APP_URL=https://<frontend-domain>
VITE_TELEGRAM_BOT_USERNAME=
VITE_AUTH_MOCK=false
```

Домен → порт **80**. SPA fallback уже в `apps/ai-food/nginx.conf`.

После смены `VITE_*` нужен **rebuild** фронта (не только restart).

## Связка

1. Задеплой gateway, получи URL.
2. В env фронта укажи `VITE_AI_GATEWAY_URL` на этот URL (без `/v1`).
3. `VITE_AI_GATEWAY_API_KEY` = `API_KEY` gateway.
4. На gateway `PUBLIC_APP_URL` = публичный URL фронта (редиректы T-Bank).

## Nixpacks (альтернатива)

Build path: `/` (корень).

**Gateway**

```env
NIXPACKS_TURBO_APP_NAME=openrouter-gateway
NIXPACKS_BUILD_CMD=pnpm exec turbo run build --filter=openrouter-gateway
NIXPACKS_START_CMD=pnpm --filter openrouter-gateway run start:prod
```

Port `3000`. Конфиг: `apps/ai-app/nixpacks.toml`.

**Frontend (static SPA)**

```env
NIXPACKS_TURBO_APP_NAME=ai-food
NIXPACKS_BUILD_CMD=pnpm exec turbo run build --filter=ai-food
```

- Publish directory: `./apps/ai-food/dist`
- Static SPA: **on**
- Port: `80`

## Локальная проверка Docker

```bash
# Gateway (context = apps/ai-app)
docker build -f apps/ai-app/Dockerfile -t ai-food-gateway apps/ai-app
docker run --rm -p 3000:3000 --env-file apps/ai-app/.env ai-food-gateway
```
