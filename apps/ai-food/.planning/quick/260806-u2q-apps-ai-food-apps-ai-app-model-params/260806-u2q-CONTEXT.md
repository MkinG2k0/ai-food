# Quick Task 260806-u2q: AI prompts/config → backend - Context

**Gathered:** 2026-08-06
**Status:** Ready for planning

<domain>
## Task Boundary

Перенести конфигурацию ИИ-запроса и промпты с фронта `apps/ai-food` на бэкенд `apps/ai-app`. Фронт шлёт максимально чистый запрос (только данные пользователя: изображение, текст, контекст блюда). Промпты, model, temperature и сборка messages живут на сервере.

</domain>

<decisions>
## Implementation Decisions

### API shape
- **Отдельные food-эндпоинты** на `apps/ai-app` (не proxy chat/completions с template).
- Примеры: `POST /v1/food/analyze`, `/v1/food/refine`, `/v1/food/ask` (точные имена — на усмотрение при планировании, но раздельные маршруты).
- Клиент НЕ отправляет system prompt, model, temperature, messages[].

### Что остаётся на фронте
- Сжатие изображения перед upload (уменьшение payload).
- Парсинг ответа (XML/JSON nutrition) и UX-обработка ошибок.
- Auth headers (`VITE_AI_GATEWAY_API_KEY` / session) как сейчас к gateway.

### Что уходит на бэк
- Все system/user prompt templates из `features/analyze-food`.
- Выбор model и temperature (серверные defaults / env).
- Сборка OpenRouter payload и проксирование.

### Claude's Discretion
- Точные path names и структура папок в `apps/ai-app`.
- Нужно ли объединять схожие операции или держать 1:1 с текущими клиентскими API (`analyze`, `refineMeal`, `fetchMealCustomContent`, др.).
- Обновить `apps/ai-food/docs/AI-GATEWAY.md` и при необходимости `.cursor/rules/ai-gateway.mdc`.

</decisions>

<specifics>
## Specific Ideas

- Запрос с фронта «максимально чистый».
- Затрагивает и analyze, и refine, и ask/custom content — всё, где сейчас фронт конфигурирует ИИ.

</specifics>

<canonical_refs>
## Canonical References

- `apps/ai-food/docs/AI-GATEWAY.md` — текущий контракт gateway
- `.cursor/rules/ai-gateway.mdc` — разделение env / apps
- `apps/ai-food/src/features/analyze-food/` — текущие промпты и API-клиенты
- `apps/ai-app/src/app.ts` — монтирование `/v1/*` роутов

</canonical_refs>
