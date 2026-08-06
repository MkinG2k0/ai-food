# AI Gateway (sibling backend)

**Последнее обновление:** 2026-08-06

## Что это

Бэкенд для **ai-food** — пакет в этом monorepo:

| | |
|---|---|
| Путь | `apps/ai-app` |
| npm-пакет | `openrouter-gateway` |
| Роль | HTTP-прокси к [OpenRouter](https://openrouter.ai) + **food domain endpoints** + optional Telegram auth, guest quota, billing |
| Не делает | дневник / UI на клиенте; сжатие фото и парсинг XML/JSON ответа |

**Разделение ответственности:**

| На сервере (`apps/ai-app`) | На клиенте (`apps/ai-food`) |
|----------------------------|-----------------------------|
| Промпты, сборка `messages[]` | Сжатие изображений перед upload |
| `OPENROUTER_MODEL` + temperature `0` | Парсинг XML/JSON КБЖУ, feature-masking |
| `POST /v1/food/analyze\|refine\|ask` | Auth/quota headers, UX ошибок |
| Generic `POST /v1/chat/completions` (onboarding и пр.) | |

## Связка

```
ai-food (этот репо)
  VITE_AI_GATEWAY_URL + VITE_AI_GATEWAY_API_KEY
       │
       ├─ POST {gateway}/v1/food/analyze   (SSE)     ← analyze photo/text
       ├─ POST {gateway}/v1/food/refine    (JSON)    ← meal correction
       ├─ POST {gateway}/v1/food/ask       (JSON)    ← custom content / Q&A
       └─ POST {gateway}/v1/chat/completions         ← e.g. onboarding micronutrients
  + Bearer / X-API-Key + X-Device-Id / X-User-Token / X-Usage-Kind
       │
ai-app (openrouter-gateway)
  OPENROUTER_API_KEY + OPENROUTER_MODEL (+ optional API_KEY)
  src/food/* prompts + modelConfig; routes/food.ts
  DATABASE_URL + AUTH_* + TBANK_* (subscription)
       │
       ▼
  https://openrouter.ai/api/v1
  https://securepay.tinkoff.ru (Init / notifications)
```

## Env (фронт → бэк)

Файлы **раздельные** — не класть секреты бэка в `VITE_*` и не объединять в корневой `.env`.

| `apps/ai-food/.env` | `apps/ai-app/.env` | Назначение |
|---------------------|--------------------|------------|
| `VITE_AI_GATEWAY_URL` | — (URL сервиса) | Базовый URL gateway, без `/v1` |
| `VITE_AI_GATEWAY_API_KEY` | `API_KEY` | Общий секрет клиента; если `API_KEY` не задан на бэке — auth отключён |
| — | `OPENROUTER_API_KEY` | Ключ провайдера (только на сервере) |
| — | `OPENROUTER_MODEL` | Модель для `/v1/food/*` (fallback: `google/gemini-3-flash-preview`) |
| — | `PORT` | HTTP-порт (по умолчанию **3000**) |
| — | `OPENROUTER_HTTP_REFERER` / `OPENROUTER_APP_TITLE` | Опциональные заголовки атрибуции OpenRouter |
| — | `DATABASE_URL`, `AUTH_SECRET` | Auth + квота |
| — | `TELEGRAM_BOT_TOKEN` (или `AUTH_TELEGRAM_BOT_TOKEN`), `TELEGRAM_BOT_USERNAME` | Bot deep-link login |
| — | `TELEGRAM_WEBHOOK_SECRET`, `PUBLIC_GATEWAY_URL` | Webhook `POST /telegram/webhook` + `setWebhook` при старте |
| — | *(admin UI)* | Guest free limit + login bonus (`AppSettings`, defaults 50 / 100) |
| `VITE_TELEGRAM_BOT_USERNAME` (опц.) | — | Подпись кнопки «Войти через Telegram» на фронте |
| — | `SUBSCRIPTION_*`, `TBANK_*`, `PUBLIC_APP_URL` | Годовая лицензия (см. [SUBSCRIPTION.md](./SUBSCRIPTION.md)) |

`PUBLIC_GATEWAY_URL` — публичный origin **gateway** (webhook). `PUBLIC_APP_URL` — origin **фронта** (T-Bank redirects).

Локально из корня monorepo: `pnpm dev` (оба), или `pnpm dev:food` (:5173) + `pnpm dev:app` (:3000). Turbo **не** подгружает `.env` — это делают Vite и `tsx --env-file=.env`.

`VITE_API_URL` в `src/shared/api/client.ts` — отдельный axios base (legacy). AI food-вызовы идут через `fetch`/`axios` на `VITE_AI_GATEWAY_URL`.

## Эндпоинты gateway

| Метод | Путь | Auth | Заметки |
|-------|------|------|---------|
| `GET` | `/health` | нет | `{ "status": "ok" }` |
| `POST` | `/auth/telegram/start` | нет* | `{ challengeId, botDeepLink, expiresAt }` — старт bot deep-link login |
| `GET` | `/auth/telegram/status?challengeId=` | нет* | `{ status: "pending" \| "expired" }` или `{ status: "ok", token, user }`; `user.nutritionProfile` — объект `{ profile, targets }` или `null` |
| `POST` | `/auth/demo/login` | нет* | Демо-юзер + JWT; только если `AUTH_MOCK≠false`. Body: `{ deviceId? }` → `{ token, user }`; `user.nutritionProfile` — объект или `null` |
| `POST` | `/telegram/webhook` | `X-Telegram-Bot-Api-Secret-Token` | Telegram Bot API updates; подтверждение challenge |
| `GET` | `/auth/me` | `X-User-Token` | Профиль + `subscriptionExpiresAt` / `hasActiveSubscription`; `nutritionProfile` — объект `{ profile, targets }` или `null` |
| `PUT` | `/auth/profile` | `X-User-Token` | Body `{ profile, targets }` → публичный user с `nutritionProfile` |
| `GET` | `/usage` | device (+ optional JWT) | Квота: unlimited **только** при active лицензии |
| `POST` | `/billing/promo/validate` | `X-User-Token` | Проверка промокода и цена со скидкой |
| `POST` | `/billing/subscribe` | `X-User-Token` | T-Bank Init / mock; опционально `{ promoCode }`; ответ: `amount`, `originalAmount`, `promoCode` |
| `POST` | `/billing/tbank/notification` | Token T-Bank | Активация лицензии |
| `GET` | `/billing/status` | `X-User-Token` | Статус лицензии |
| `POST` | `/billing/sync` | `X-User-Token` | GetState / mock confirm |
| `GET` | `/v1/models` | да* | список моделей OpenRouter |
| `POST` | `/v1/embeddings` | да* | embeddings |
| `POST` | `/v1/chat/completions` | да* + quota | Generic proxy (JSON или SSE); клиент шлёт `model`/`messages` — используется onboarding и legacy callers |
| `POST` | `/v1/food/analyze` | да* + quota | **SSE** nutrition analyze; body без `model`/`messages`/`temperature` |
| `POST` | `/v1/food/refine` | да* + quota | **JSON** meal correction; `response_format: json_object` на сервере |
| `POST` | `/v1/food/ask` | да* + quota | **JSON** settings custom-content или follow-up question |

\* Gateway API key: `Authorization: Bearer <API_KEY>` или `X-API-Key`, только если задан `API_KEY`.

### Food request shapes (clean client payloads)

**Analyze** — `images?: string[]` (data-URL после client compress), `description?`, `customInstructions?`, `dietType?`, `features?`. Нужно хотя бы фото или непустое описание. Клиент **не** шлёт `model`, `temperature`, `messages`, `system`.

**Refine** — `correction`, `mealContext: { name?, items[] }`, optional `imageDataUrl`, `customInstructions?`, `dietType?`, `features?`.

**Ask** — `mealContext: { name?, totalCalories, items[] }`, либо `customInstructions` (settings slide), либо `question` (follow-up). Клиент early-return `''` если оба пусты.

Temperature на food-роутах всегда `0`. Модель — `OPENROUTER_MODEL` (или fallback выше).

**Usage kinds** (`X-Usage-Kind`): analyze → `analyze` / related kinds via client `resolveAnalyzeUsageKind`; refine → `refine`; ask → `other`.

**Важно:** логин ≠ unlimited. Unlimited AI только при `hasActiveSubscription` (см. [SUBSCRIPTION.md](./SUBSCRIPTION.md)).

## Кто вызывает gateway из ai-food

| Клиентский модуль | Путь | Назначение |
|-------------------|------|------------|
| `src/features/analyze-food/api/analyzeFoodApi.ts` | `/v1/food/analyze` | Анализ фото/текста → XML КБЖУ (SSE) |
| `src/features/analyze-food/api/streamChatCompletions.ts` | `streamFoodAnalyze` → `/v1/food/analyze` | SSE-клиент analyze |
| `src/features/analyze-food/api/refineMealApi.ts` | `/v1/food/refine` | Уточнение результата (JSON) |
| `src/features/analyze-food/api/fetchMealCustomContentApi.ts` | `/v1/food/ask` | Доп. markdown-контент / вопрос о блюде |
| `src/features/onboarding/api/micronutrientTargetsApi.ts` | `/v1/chat/completions` | Цели по микронутриентам (пока generic chat) |
| `src/features/auth/*` | `/auth/*`, `/usage` | Bot login, demo, profile, quota |
| `src/features/billing/*` | `/billing/*` | Subscribe / status / sync |

Ошибки gateway (`RATE_LIMITED`, `UPSTREAM_TIMEOUT`, `QUOTA_EXCEEDED`, …) мапятся в клиентские `ApiError`. При `402` UI ведёт гостя на `/login`, авторизованного — на `/subscribe`.

## Структура ai-app (кратко)

```
apps/ai-app/
├── src/server.ts
├── src/app.ts             # /health, /auth, /usage, /billing, /v1/*
├── src/middleware/{auth,quota,error}.ts
├── src/routes/{health,models,embeddings,chat,food,auth,usage,billing}.ts
├── src/food/{prompts,buildMessages,modelConfig,analyzeFeatures}.ts
├── src/lib/{quota,subscription,tbank,jwt,…}.ts
└── prisma/                # User, Device, UsageEvent, Payment
```

## Важные ограничения / техдолг

1. **Ключ gateway на клиенте** (`VITE_AI_GATEWAY_API_KEY`) — виден в бандле. OpenRouter-ключ и `TBANK_PASSWORD` — только на сервере.
2. **Food prompts SoT на сервере** (`src/food/*`); клиент сжимает фото и парсит ответ. Settings `aiModel` UI может оставаться, но food-вызовы его не отправляют.
3. **Monorepo** — gateway + фронт в одном репо (`apps/ai-app`, `apps/ai-food`). Onboarding micronutrients ещё на `/v1/chat/completions`.

## Команды (бэк)

```bash
cd apps/ai-app
cp .env.example .env
pnpm install
pnpm prisma:deploy   # или npx prisma migrate deploy
pnpm dev             # http://127.0.0.1:3000 (IS_LOCAL=true)
pnpm test
```
