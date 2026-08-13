# AI Food

## What This Is

Web/PWA + Capacitor дневник питания (monorepo `apps/ai-food` + `apps/ai-app`): фото или текст → AI (gateway) → приём в дневник. После входа данные аккаунта синхронизируются между устройствами; **фото приёмов не синкаются** (только локальный Filesystem).

## Core Value

Сфотографировал / описал еду → получил правдоподобные КБЖУ → сохранил в дневник — и после логина не потерял дневник/вес/избранное/профиль на другом устройстве (**фото нужно иметь локально / снимать заново**).


## Requirements

### Validated

- ✓ Single-package pnpm repo + типы в src/shared/types — existing
- ✓ FSD-архитектура фронтенда (app → pages → widgets → features → entities → shared) — existing
- ✓ Маршруты Home / Add Food / Result / Diary с навигационным flow — existing
- ✓ Загрузка фото через file picker (`add-food` + `useImageStore`) — existing
- ✓ Анализ еды через POST `/analyze-food` (TanStack Query + Axios) — existing (mock)
- ✓ Отображение результата и сохранение в дневник (`save-meal` + `useDiaryStore`) — existing
- ✓ Общие доменные типы (`FoodItem`, `Meal`, `NutritionResult`, `ApiError`) — existing
- ✓ UI на Tailwind + shadcn/ui, mobile-first layout — existing

### Active

- [ ] Заменить mock `/analyze-food` на реальный анализ через OpenAI Vision API (ключ на бэкенде, не на клиенте)
- [ ] Рабочий end-to-end web-flow: фото → AI-анализ → подтверждение → дневник
- [ ] Персистентность дневника в localStorage (переживает перезагрузку страницы)
- [ ] Обработка ошибок AI и пользовательский feedback (toast/inline) при анализе и сохранении
- [ ] Закрыть расхождения с MVP-спеком, критичные для web-MVP (без Capacitor)
- [ ] Довести приложение до состояния «можно показать пользователям» — стабильный happy path + понятные ошибки

### Out of Scope

- Sync **blob-фото** приёмов — **намеренно никогда** (только URI stubs / локальный Filesystem)
- Medical-grade nutrition / on-device ML
- Google OAuth (сейчас Telegram bot + demo)


## Context

**Текущее состояние** (актуально 2026-08-13):
- Monorepo: `apps/ai-food` (React FSD) + `apps/ai-app` (Express gateway, Prisma/Postgres)
- Auth: Telegram bot / demo; квоты + годовая лицензия T-Bank
- Sync после логина: профиль (+микро), дневник, вес, избранное, настройки — см. `docs/USER-DATA-SYNC.md`
- **Не sync (навсегда):** фото приёмов
- Локальный кэш: Capacitor Preferences; фото в Filesystem `meal-images/`
- Канон продукта для агентов: `docs/AI-APP-FEATURES.md`

**Направление:**
- Polish GDPR export/delete; не планировать blob-фото на сервер

## Constraints

- **Tech stack**: pnpm + Turborepo; React/FSD/Vite (`ai-food`) + Express/Prisma (`ai-app`)
- **Security**: `VITE_AI_GATEWAY_API_KEY` виден в бандле (техдолг); OpenRouter / T-Bank секреты только на сервере
- **Persistence**: локальный кэш Preferences + Filesystem; server sync после логина для профиля/дневника/веса/избранного; **фото не на сервере**
- **Auth**: Telegram / demo; гость — только устройство
- **Architecture**: AI через gateway food routes; user-data через `/user/*/sync` + `X-User-Token`
- **Compatibility**: Web + Capacitor Android

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| User-data sync (meals/weight/favorites) + LWW | Restore после смены устройства без подписки | Done 2026-08-13 |
| Фото только локально (URI stubs) | Нет blob storage / privacy / размер | Done (by design) |
| Telegram auth + T-Bank license | Квоты AI; дневник бесплатно | Done |
| AI через backend proxy | Ключ и промпты на сервере | Done |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-03 — single-package repo*
