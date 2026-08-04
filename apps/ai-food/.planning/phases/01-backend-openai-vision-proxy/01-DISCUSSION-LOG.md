# Phase 1: Backend OpenAI Vision Proxy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-24
**Phase:** 01-backend-openai-vision-proxy
**Areas discussed:** Модель и промпт, Обработка ошибок (ERR-03), Конфигурация ключа, Парсинг и валидация ответа

---

## Модель и промпт

| Option | Description | Selected |
|--------|-------------|----------|
| gpt-4o-mini | Дешевле в 10×, vision-запросы хорошо обрабатывает, достаточно для распознавания еды и оценки КБЖУ. Идеально для MVP. | ✓ |
| gpt-4o | Точнее для сложных блюд, дороже в 10×. Оправдано только если качество mini окажется недостаточным. | |

**User's choice:** gpt-4o-mini
**Notes:** Upgrade to gpt-4o deferred until quality assessment after MVP.

| Option | Description | Selected |
|--------|-------------|----------|
| JSON mode + промпт | response_format: { type: 'json_object' } + промпт со схемой. Гарантирует JSON, просто и надёжно для MVP. | ✓ |
| Structured Outputs (JSON Schema) | response_format: { type: 'json_schema', json_schema: ... } — контракт на уровне API. Строже, но сложнее настроить. | |

**User's choice:** JSON mode + промпт

| Option | Description | Selected |
|--------|-------------|----------|
| Английский | LLM лучше следуют инструкциям на английском — лучшая точность. foodName можно оставить на английском или перевести на фронте. | ✓ |
| Русский | Названия еды сразу на русском, не нужен перевод. Может снижать точность для редких блюд. | |

**User's choice:** Английский

---

## Обработка ошибок (ERR-03)

| Option | Description | Selected |
|--------|-------------|----------|
| 4 кода | INVALID_IMAGE \| RATE_LIMITED \| ANALYSIS_TIMEOUT \| ANALYSIS_FAILED — покрывают все случаи из ERR-03, клиент может показать разные сообщения. | ✓ |
| 2 кода | INVALID_IMAGE \| ANALYSIS_FAILED — проще, но теряется деталь. Rate limit и timeout попадают в ANALYSIS_FAILED. | |

**User's choice:** 4 кода (INVALID_IMAGE, RATE_LIMITED, ANALYSIS_TIMEOUT, ANALYSIS_FAILED)

| Option | Description | Selected |
|--------|-------------|----------|
| Вернуть ANALYSIS_FAILED | Ошибка 500 + code: ANALYSIS_FAILED. Клиент покажет inline error. Просто и однозначно. | ✓ |
| Fallback-значения | 0 для пропущенных полей. Скрывает ошибку, пользователь видит нулевые КБЖУ — не рекомендуется. | |

**User's choice:** Вернуть ANALYSIS_FAILED при невалидном JSON от модели

---

## Конфигурация ключа

| Option | Description | Selected |
|--------|-------------|----------|
| dotenv в apps/backend | apps/backend/.env — отдельный .env для бэкенда. Стандартный подход Express, не попадает в client bundle. | ✓ |
| .env в корне monorepo | Один .env для всех apps, через Turborepo env propagation. Риск: переменная может оказаться в Vite env и попасть в bundle. | |

**User's choice:** dotenv в apps/backend

| Option | Description | Selected |
|--------|-------------|----------|
| Да, создать .env.example | apps/backend/.env.example с OPENAI_API_KEY=your_key_here. Документирует требуемые переменные, .env остаётся в .gitignore. | ✓ |
| Нет, только документация в README | Меньше файлов, но нет машиночитаемого шаблона для CI/CD. | |

**User's choice:** Создать apps/backend/.env.example

---

## Парсинг и валидация ответа

| Option | Description | Selected |
|--------|-------------|----------|
| Zod схема сейчас | Runtime гарантия типов. Добавляет Zod в зависимости. AI-05 уже отложен в v2 — но можно взять раньше. | ✓ |
| Простая проверка полей (Recommended) | typeof checks или optional chaining без Zod. Быстро, достаточно для MVP. Zod — v2 (уже есть в REQUIREMENTS.md как AI-05). | |

**User's choice:** Zod схема сейчас (вопреки рекомендации — пользователь решил сделать раньше v2)

| Option | Description | Selected |
|--------|-------------|----------|
| Сохранить и вычислять реальное | Date.now() до/после вызова OpenAI. Полезная статистика, не ломает контракт. | ✓ |
| Захардкодить 0 | Убрать поле фактически. Проще, но ломает контракт и потенциально нужную статистику. | |

**User's choice:** Сохранить и вычислять реальное processingTime

---

## Claude's Discretion

- OpenAI SDK version (latest stable `openai` npm package)
- Image delivery format (base64 от multer memoryStorage)
- Timeout value (suggest 30 000ms)
- Console error logging strategy

## Deferred Ideas

- AI-06 (backend image resize via sharp) — v2
- AI-07 (retry without re-upload) — v2
- Structured Outputs / gpt-4o upgrade — after quality assessment
