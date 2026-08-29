# AI Food Base

Turborepo monorepo: фронт дневника питания + AI Gateway.

| Package | Path | Role |
|---------|------|------|
| `ai-food` | `apps/ai-food` | Vite + React + Capacitor |
| `openrouter-gateway` | `apps/ai-app` | Express → OpenRouter, auth, quota, billing, user-data sync |
| `ai-web` | `apps/ai-web` | Next.js лендинг + admin UI |

После входа данные аккаунта (дневник, профиль, вес, избранное) синхронизируются между устройствами. **Фото приёмов не синкаются** — остаются в Filesystem на устройстве. Подробнее: [`apps/ai-food/docs/USER-DATA-SYNC.md`](./apps/ai-food/docs/USER-DATA-SYNC.md).

## Setup

```bash
pnpm install
cp apps/ai-app/.env.example apps/ai-app/.env
cp apps/ai-food/.env.example apps/ai-food/.env
cp apps/ai-web/.env.example apps/ai-web/.env
```

Заполни ключи. **Отдельные `.env`** — не объединять:

- `apps/ai-app/.env` — `OPENROUTER_API_KEY`, `API_KEY`, `DATABASE_URL`, …
- `apps/ai-food/.env` — только `VITE_*` (`VITE_AI_GATEWAY_URL=http://127.0.0.1:3000`, …)
- `apps/ai-web/.env` — `ADMIN_*`, `AI_GATEWAY_URL`, `SITE_URL`

## Scripts

```bash
pnpm dev          # turbo pipeline
pnpm dev:food     # только Vite :5173
pnpm dev:app      # только gateway :3000
pnpm dev:web      # только Next.js :3001
pnpm build        # vitest + e2e (ai-food) + сборка
pnpm test         # vitest + e2e (ai-food)
pnpm test:e2e     # только Playwright e2e; первый раз: pnpm --filter ai-food exec playwright install chromium
pnpm type-check
```

E2E поднимает Vite сам (`webServer`), AI gateway мокается в тестах — реальный OpenRouter не нужен. UI-режим: `pnpm test:e2e:ui` (на Windows UI слушает `127.0.0.1`, не IPv6).

Для демо-входа в e2e в `playwright.config.ts` задано `VITE_AUTH_MOCK=true`.

### Покрытые сценарии (34 теста)

| Spec | Сценарии |
|------|----------|
| `smoke` | старт приложения |
| `onboarding` | онбординг |
| `navigation` | навигация |
| `analyze-describe` | текстовый analyze, кастом-инструкции |
| `analyze-photo` | галерея 1/3 фото, scan gallery/shutter/photo+description, error/quota |
| `manual-entry` | ручной ввод |
| `diary-meal` | просмотр приёма |
| `favorites-flow` | quick-add, toggle избранного |
| `meal-edit` | КБЖУ, граммы, порции, состав, refine, delete |
| `login` | UI входа, демо-login/logout, sync после login |
| `subscribe` | цена, промо E2E10, mock checkout success/fail |
| `settings` | профиль в настройках |

## Dokploy

Три Application из одного репо — см. [docs/DOKPLOY.md](./docs/DOKPLOY.md).

| App | Build Path | Docker File | Port |
|-----|------------|-------------|------|
| Gateway | `/apps/ai-app` | `Dockerfile` | 3000 |
| Frontend | `/apps/ai-food` | `Dockerfile` | 80 |
| Web / Admin | `/apps/ai-web` | `Dockerfile` | 3001 |

## Git

Один репозиторий — **ai-food** (`origin` → `https://github.com/MkinG2k0/ai-food.git`). Корень monorepo = корень этого git. История `ai-app` как отдельный remote не сохранена: код лежит в `apps/ai-app/`.

## Cursor rules

Правила лежат в **корне** `.cursor/rules/` (вложенные `apps/*/.cursor/rules` Cursor не подхватывает в monorepo). `AGENTS.md` в `apps/ai-food` работает как nested agent notes.
