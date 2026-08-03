# AI Gateway (sibling backend)

**Последнее обновление:** 2026-08-03

## Что это

Бэкенд для **ai-food** живёт в отдельном репозитории:

| | |
|---|---|
| Путь | `d:\Project\Main\ai-app` (рядом с этим репо) |
| npm-пакет | `openrouter-gateway` |
| Роль | HTTP-прокси к [OpenRouter](https://openrouter.ai) (OpenAI-compatible API) |
| Не делает | доменную логику еды, дневник, БД, auth пользователей |

Промпты, сжатие фото, парсинг XML/JSON КБЖУ — **на клиенте** (`src/features/analyze-food`, `onboarding`). Gateway только форвардит `chat/completions` (и служебные `/models`, `/embeddings`).

## Связка

```
ai-food (этот репо)
  VITE_AI_GATEWAY_URL + VITE_AI_GATEWAY_API_KEY
       │
       ▼
  POST {gateway}/v1/chat/completions   (+ Bearer / X-API-Key)
       │
ai-app (openrouter-gateway)
  OPENROUTER_API_KEY (+ optional API_KEY для клиентов)
       │
       ▼
  https://openrouter.ai/api/v1
```

## Env (фронт → бэк)

| ai-food (`.env`) | ai-app (`.env`) | Назначение |
|------------------|-----------------|------------|
| `VITE_AI_GATEWAY_URL` | — (URL сервиса) | Базовый URL gateway, без `/v1` |
| `VITE_AI_GATEWAY_API_KEY` | `API_KEY` | Общий секрет клиента; если `API_KEY` не задан на бэке — auth отключён |
| — | `OPENROUTER_API_KEY` | Ключ провайдера (только на сервере) |
| — | `PORT` | HTTP-порт (по умолчанию **3000**) |
| — | `OPENROUTER_HTTP_REFERER` / `OPENROUTER_APP_TITLE` | Опциональные заголовки атрибуции OpenRouter |

Локально: фронт `pnpm dev` (:5173), бэк в `ai-app` — `npm run dev` (:3000). В комментариях `.env` иногда фигурирует `:3001` — сверять с реальным `PORT` gateway.

`VITE_API_URL` в `src/shared/api/client.ts` — отдельный axios base (legacy/не основной AI-путь). AI ходит напрямую через `fetch`/`axios` на `VITE_AI_GATEWAY_URL`.

## Эндпоинты gateway

| Метод | Путь | Auth | Заметки |
|-------|------|------|---------|
| `GET` | `/health` | нет | `{ "status": "ok" }` |
| `GET` | `/v1/models` | да* | список моделей OpenRouter |
| `POST` | `/v1/embeddings` | да* | embeddings |
| `POST` | `/v1/chat/completions` | да* | JSON или SSE при `stream: true` |

\* Auth: `Authorization: Bearer <API_KEY>` или `X-API-Key: <API_KEY>`, только если на бэке задан `API_KEY`.

Тело chat валидируется Zod (`model`, `messages`, опционально `stream`, `temperature`, `max_tokens`, `response_format`, `tools`, …). Лимит JSON body: **10 MB** (base64 vision). Upstream concurrency: **5**. SSE create timeout: **120 s**.

## Кто вызывает gateway из ai-food

| Клиентский модуль | Назначение |
|-------------------|------------|
| `src/features/analyze-food/api/analyzeFoodApi.ts` | Анализ фото/текста → XML КБЖУ (stream) |
| `src/features/analyze-food/api/streamChatCompletions.ts` | Общий SSE-клиент `/v1/chat/completions` |
| `src/features/analyze-food/api/refineMealApi.ts` | Уточнение результата |
| `src/features/analyze-food/api/fetchMealCustomContentApi.ts` | Доп. markdown-контент по блюду |
| `src/features/onboarding/api/micronutrientTargetsApi.ts` | Цели по микронутриентам |

Ошибки gateway (`RATE_LIMITED`, `UPSTREAM_TIMEOUT`, `BAD_REQUEST`, `UPSTREAM_ERROR`, …) мапятся в клиентские `ApiError` в этих модулях.

## Структура ai-app (кратко)

```
ai-app/
├── src/server.ts          # listen PORT
├── src/app.ts             # createApp: cors, /health, /v1/*
├── src/middleware/auth.ts # requireApiKey
├── src/middleware/error.ts
├── src/routes/{health,models,embeddings,chat}.ts
├── lib/{openai,queue,errors,types}.ts
└── docs/                  # ARCHITECTURE, API, CONFIGURATION, …
```

Документация бэка: `d:\Project\Main\ai-app\docs\` (особенно `ARCHITECTURE.md`, `API.md`).

## Важные ограничения / техдолг

1. **Ключ gateway на клиенте** (`VITE_AI_GATEWAY_API_KEY`) — любой, кто видит бандл/`.env`, может бить в gateway. OpenRouter-ключ на сервере спрятан; gateway-секрет — нет.
2. **Нет доменного API еды** на бэке — не ищи `/analyze-food` в ai-app; его убрали, логика на фронте.
3. **Два репо** — правки прокси/auth/лимитов → `ai-app`; правки промптов/парсинга/UX анализа → `ai-food`.
4. Исторические артефакты в `.planning/` могут ещё упоминать in-repo mock backend — актуальный источник по AI: этот файл.

## Команды (бэк)

```bash
cd d:\Project\Main\ai-app
cp .env.example .env   # задать OPENROUTER_API_KEY, опционально API_KEY
npm install
npm run dev            # tsx watch, http://0.0.0.0:3000
npm test
npm run type-check
```
