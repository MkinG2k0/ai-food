# AI Food Base

Turborepo monorepo: фронт дневника питания + AI Gateway.

| Package | Path | Role |
|---------|------|------|
| `ai-food` | `apps/ai-food` | Vite + React + Capacitor |
| `openrouter-gateway` | `apps/ai-app` | Express → OpenRouter, auth, quota, billing |

## Setup

```bash
pnpm install
cp apps/ai-app/.env.example apps/ai-app/.env
cp apps/ai-food/.env.example apps/ai-food/.env
```

Заполни ключи. **Два отдельных `.env`** — не объединять:

- `apps/ai-app/.env` — `OPENROUTER_API_KEY`, `API_KEY`, `DATABASE_URL`, …
- `apps/ai-food/.env` — только `VITE_*` (`VITE_AI_GATEWAY_URL=http://127.0.0.1:3000`, …)

## Scripts

```bash
pnpm dev          # оба приложения
pnpm dev:food     # только Vite :5173
pnpm dev:app      # только gateway :3000
pnpm build
pnpm test
pnpm type-check
```

## Dokploy

Два Application из одного репо — см. [docs/DOKPLOY.md](./docs/DOKPLOY.md).

| App | Dockerfile | Port |
|-----|------------|------|
| Gateway | `apps/ai-app/Dockerfile` (context `.`) | 3000 |
| Frontend | `apps/ai-food/Dockerfile` (context `.`) | 80 |

## Git

Один репозиторий — **ai-food** (`origin` → `https://github.com/MkinG2k0/ai-food.git`). Корень monorepo = корень этого git. История `ai-app` как отдельный remote не сохранена: код лежит в `apps/ai-app/`.

## Cursor rules

Правила лежат в **корне** `.cursor/rules/` (вложенные `apps/*/.cursor/rules` Cursor не подхватывает в monorepo). `AGENTS.md` в `apps/ai-food` работает как nested agent notes.
