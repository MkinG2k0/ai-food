# AI Gateway (sibling backend)

**Последнее обновление:** 2026-08-04

## Что это

Бэкенд для **ai-food** живёт в отдельном репозитории:

| | |
|---|---|
| Путь | `d:\Project\Main\ai-app` (рядом с этим репо) |
| npm-пакет | `openrouter-gateway` |
| Роль | HTTP-прокси к [OpenRouter](https://openrouter.ai) + optional Telegram auth, guest quota, billing |
| Не делает | доменную логику еды, дневник на клиенте |

Промпты, сжатие фото, парсинг XML/JSON КБЖУ — **на клиенте** (`src/features/analyze-food`, `onboarding`). Gateway форвардит `chat/completions` и обслуживает auth/usage/billing.

## Связка

```
ai-food (этот репо)
  VITE_AI_GATEWAY_URL + VITE_AI_GATEWAY_API_KEY
       │
       ▼
  POST {gateway}/v1/chat/completions   (+ Bearer / X-API-Key)
  + X-Device-Id / X-User-Token / X-Usage-Kind (quota)
       │
ai-app (openrouter-gateway)
  OPENROUTER_API_KEY (+ optional API_KEY для клиентов)
  DATABASE_URL + AUTH_* + TBANK_* (subscription)
       │
       ▼
  https://openrouter.ai/api/v1
  https://securepay.tinkoff.ru (Init / notifications)
```

## Env (фронт → бэк)

| ai-food (`.env`) | ai-app (`.env`) | Назначение |
|------------------|-----------------|------------|
| `VITE_AI_GATEWAY_URL` | — (URL сервиса) | Базовый URL gateway, без `/v1` |
| `VITE_AI_GATEWAY_API_KEY` | `API_KEY` | Общий секрет клиента; если `API_KEY` не задан на бэке — auth отключён |
| — | `OPENROUTER_API_KEY` | Ключ провайдера (только на сервере) |
| — | `PORT` | HTTP-порт (по умолчанию **3000**) |
| — | `OPENROUTER_HTTP_REFERER` / `OPENROUTER_APP_TITLE` | Опциональные заголовки атрибуции OpenRouter |
| — | `DATABASE_URL`, `AUTH_SECRET`, `TELEGRAM_BOT_TOKEN` | Auth + квота |
| — | `FREE_GENERATION_LIMIT` | Guest AI budget (default 50) |
| — | `SUBSCRIPTION_*`, `TBANK_*`, `PUBLIC_APP_URL` | Годовая лицензия (см. [SUBSCRIPTION.md](./SUBSCRIPTION.md)) |

Локально: фронт `pnpm dev` (:5173), бэк в `ai-app` — `npm run dev` (:3000).

`VITE_API_URL` в `src/shared/api/client.ts` — отдельный axios base (legacy). AI ходит через `fetch` на `VITE_AI_GATEWAY_URL`.

## Эндпоинты gateway

| Метод | Путь | Auth | Заметки |
|-------|------|------|---------|
| `GET` | `/health` | нет | `{ "status": "ok" }` |
| `POST` | `/auth/telegram` | нет* | Telegram Login → JWT; ответ включает `hasActiveSubscription` |
| `GET` | `/auth/me` | `X-User-Token` | Профиль + `subscriptionExpiresAt` / `hasActiveSubscription` |
| `GET` | `/usage` | device (+ optional JWT) | Квота: unlimited **только** при active лицензии |
| `POST` | `/billing/subscribe` | `X-User-Token` | T-Bank Init / mock |
| `POST` | `/billing/tbank/notification` | Token T-Bank | Активация лицензии |
| `GET` | `/billing/status` | `X-User-Token` | Статус лицензии |
| `POST` | `/billing/sync` | `X-User-Token` | GetState / mock confirm |
| `GET` | `/v1/models` | да* | список моделей OpenRouter |
| `POST` | `/v1/embeddings` | да* | embeddings |
| `POST` | `/v1/chat/completions` | да* + quota | JSON или SSE; `402 QUOTA_EXCEEDED` |

\* Gateway API key: `Authorization: Bearer <API_KEY>` или `X-API-Key`, только если задан `API_KEY`.

**Важно:** логин ≠ unlimited. Unlimited AI только при `hasActiveSubscription` (см. [SUBSCRIPTION.md](./SUBSCRIPTION.md)).

## Кто вызывает gateway из ai-food

| Клиентский модуль | Назначение |
|-------------------|------------|
| `src/features/analyze-food/api/analyzeFoodApi.ts` | Анализ фото/текста → XML КБЖУ (stream) |
| `src/features/analyze-food/api/streamChatCompletions.ts` | Общий SSE-клиент `/v1/chat/completions` |
| `src/features/analyze-food/api/refineMealApi.ts` | Уточнение результата |
| `src/features/analyze-food/api/fetchMealCustomContentApi.ts` | Доп. markdown-контент по блюду |
| `src/features/onboarding/api/micronutrientTargetsApi.ts` | Цели по микронутриентам |
| `src/features/auth/*` | Telegram login, `/usage` |
| `src/features/billing/*` | Subscribe / status / sync |

Ошибки gateway (`RATE_LIMITED`, `UPSTREAM_TIMEOUT`, `QUOTA_EXCEEDED`, …) мапятся в клиентские `ApiError`. При `402` UI ведёт гостя на `/login`, авторизованного — на `/subscribe`.

## Структура ai-app (кратко)

```
ai-app/
├── src/server.ts
├── src/app.ts             # /health, /auth, /usage, /billing, /v1/*
├── src/middleware/{auth,quota,error}.ts
├── src/routes/{health,models,embeddings,chat,auth,usage,billing}.ts
├── src/lib/{quota,subscription,tbank,jwt,…}.ts
└── prisma/                # User, Device, UsageEvent, Payment
```

## Важные ограничения / техдолг

1. **Ключ gateway на клиенте** (`VITE_AI_GATEWAY_API_KEY`) — виден в бандле. OpenRouter-ключ и `TBANK_PASSWORD` — только на сервере.
2. **Нет доменного API еды** на бэке — логика анализа на фронте.
3. **Два репо** — прокси/auth/billing → `ai-app`; промпты/UX → `ai-food`.

## Команды (бэк)

```bash
cd d:\Project\Main\ai-app
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev            # http://0.0.0.0:3000
npm test
```
