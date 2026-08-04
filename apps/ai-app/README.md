<!-- generated-by: gsd-doc-writer -->
# openrouter-gateway

HTTP-прокси к [OpenRouter](https://openrouter.ai) на Express: ключ OpenRouter остаётся на сервере, клиентские приложения ходят по REST через OpenAI-совместимый API.

## Installation

```bash
npm install
```

Скопируйте переменные окружения и укажите ключ OpenRouter:

```bash
cp .env.example .env
```

| Переменная | Обязательна | Описание |
|------------|-------------|----------|
| `OPENROUTER_API_KEY` | да | Ключ с [openrouter.ai/keys](https://openrouter.ai/keys) |
| `OPENROUTER_HTTP_REFERER` | нет | Атрибуция (`HTTP-Referer`) |
| `OPENROUTER_APP_TITLE` | нет | Атрибуция (`X-Title`) |
| `API_KEY` | нет | Секрет для вызывающих приложений; если не задан — auth отключена |
| `PORT` | нет | Порт HTTP-сервера (по умолчанию `3000`) |

## Quick start

1. Установите зависимости: `npm install`
2. Создайте `.env` из `.env.example` и задайте `OPENROUTER_API_KEY`
3. Запустите dev-сервер:

```bash
npm run dev
```

Сервер слушает `http://0.0.0.0:3000` (или порт из `PORT`).

| Скрипт | Описание |
|--------|----------|
| `npm run dev` | Dev-сервер с hot reload (`tsx watch --env-file=.env`) |
| `npm start` | Production-запуск (`tsx src/server.ts`) |
| `npm test` | Тесты (Vitest) |
| `npm run type-check` | Проверка TypeScript (`tsc --noEmit`) |

## Usage examples

`GET /health` всегда открыт. Остальные маршруты под `/v1` требуют `Authorization: Bearer <API_KEY>` или `X-API-Key: <API_KEY>`, если задан `API_KEY`.

### Healthcheck

```bash
curl http://localhost:3000/health
```

Ожидаемый ответ: `{ "status": "ok" }`.

### Chat completions

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "openai/gpt-4o-mini",
    "messages": [
      { "role": "user", "content": "Привет! Кратко ответь." }
    ]
  }'
```

Обязательные поля: `model`, `messages`. Опционально: `stream`, `temperature`, `max_tokens`, `response_format`, `tools`, `tool_choice`, `top_p`, `presence_penalty`, `frequency_penalty`, `user`.

Streaming (`stream: true`) возвращает SSE (`text/event-stream`) с чанками OpenAI (`data: {...}`, в конце `data: [DONE]`).

### Embeddings

```bash
curl -X POST http://localhost:3000/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "openai/text-embedding-3-small",
    "input": "hello world"
  }'
```

Обязательные поля: `model`, `input` (строка или массив строк). Опционально: `dimensions`, `encoding_format` (`float` \| `base64`), `user`.

### Список моделей

```bash
curl http://localhost:3000/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Ответ: `{ "object": "list", "data": [...] }`.

### Ошибки

Все ошибки gateway:

```json
{
  "message": "Human-readable text",
  "code": "ERROR_CODE",
  "status": 400
}
```

| Код | HTTP | Когда |
|-----|------|--------|
| `UNAUTHORIZED` | 401 | Нет / неверный `API_KEY` |
| `VALIDATION_ERROR` | 400 | Невалидное тело запроса |
| `NOT_FOUND` | 404 | Неизвестный маршрут |
| `RATE_LIMITED` | 429 | Лимит OpenRouter |
| `BAD_REQUEST` | 400 | OpenRouter отклонил запрос |
| `UPSTREAM_TIMEOUT` | 504 | Таймаут upstream |
| `UPSTREAM_ERROR` | 500 | Прочий сбой upstream |

Лимит JSON-тела: **10 MB**. Таймаут upstream: **30 с** (non-stream), **120 с** (stream). CORS разрешён для всех origin (`*`).
