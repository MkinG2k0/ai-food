# AI Food

## What This Is

Web-first приложение для учёта питания: пользователь фотографирует еду, получает оценку КБЖУ через AI и сохраняет приёмы пищи в локальный дневник. Сейчас — brownfield single-package React (FSD) + Capacitor; AI через клиентский Gateway; цель ближайшего цикла — заменить mock на реальный OpenAI Vision и довести продукт до рабочего web-MVP, который можно показать пользователям.

## Core Value

Сфотографировал еду → получил правдоподобные данные о питании → сохранил в дневник — без лишних шагов и без потери данных при перезагрузке.

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

- Google OAuth / авторизация — отложено на следующий этап после MVP
- Backend БД и серверный дневник — локальное хранение достаточно для web-MVP
- Capacitor / нативная мобильная оболочка — web-first в этом цикле
- Платежи и подписки — не нужны для MVP
- On-device / self-hosted ML-модели — выбран OpenAI Vision API
- Мультипользовательская синхронизация между устройствами — требует auth + backend

## Context

**Текущее состояние кодовой базы** (см. `.planning/codebase/`):
- Фронтенд: React 18 + Vite + TypeScript, FSD, Zustand (UI state), TanStack Query (server state)
- Отдельного backend в репо нет; AI через клиентский Gateway
- Дневник: `useDiaryStore` в `entities/meal`, данные только в памяти (теряются при refresh)
- Тесты: Vitest, co-located unit-тесты; покрытие неполное
- Документация: утверждённый design spec (`docs/superpowers/specs/2026-06-24-ai-food-mvp-design.md`) описывает mock-MVP; часть пунктов (Capacitor, bottom nav, interceptors) ещё не реализована

**Известные пробелы** (из `.planning/codebase/CONCERNS.md`):
- Spec drift между design doc и реализацией
- Sonner toaster подключён, но не используется
- React Query Devtools в prod bundle
- Хардкод дневной нормы калорий (2000) и макросов
- `clearDiary()` есть в store, но нет в UI
- Нет ESLint/Prettier в репозитории

**Направление пользователя:**
- Сейчас внедрять AI (OpenAI Vision)
- В целом довести до рабочего web-MVP
- Auth (Google) — позже

## Constraints

- **Tech stack**: Сохранить стек pnpm + React/FSD/Vite (single package) — не переписывать с нуля
- **Security**: AI Gateway ключ сейчас в VITE_* на клиенте (техдолг: вынести с клиента)
- **Persistence**: localStorage на клиенте; без БД в этом цикле
- **Auth**: Без авторизации в MVP — один пользователь на устройство/браузер
- **Architecture**: API-вызовы только через TanStack Query hooks; Zustand не хранит server data
- **Compatibility**: Web-first; мобильный UX через responsive layout, не нативное приложение

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| OpenAI Vision API для распознавания еды | Пользователь выбрал; быстрый путь к качественному vision без своей ML-инфраструктуры | — Pending |
| Web-MVP (usable, showable) | Показать продукт пользователям без Capacitor/native shell | — Pending |
| Локальное хранение дневника (localStorage) | Без auth и БД; достаточно для демо и первых пользователей | — Pending |
| Auth отложен (Google OAuth позже) | Упростить MVP; один пользователь на устройство | — Pending |
| AI-вызовы через backend proxy | Защита API key, единая точка для rate limiting и логирования | — Pending |
| Пропустить Capacitor в этом цикле | Фокус на web-MVP и AI; native shell — следующий этап | — Pending |

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
