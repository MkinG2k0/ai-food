# AI Food — описание продукта для ИИ

Документ для контекста агентов и внешних LLM. Отражает **текущий код**, а не устаревшие planning-доки июня 2026.

---

## System prompt (кратко)

```
AI Food — web/PWA + Capacitor дневник питания (monorepo: apps/ai-food + apps/ai-app).

Core loop: фото или текст → AI (gateway /v1/food/*) → optimistic Meal →
локальный дневник (Preferences) + sync на сервер после входа.

После Telegram/demo login синхронизируются: профиль (profile+targets+
micronutrientTargets), дневник, избранное, вес/goalKg, настройки UI.
Фото приёмов НЕ синкаются и НЕ будут — только локальный Filesystem;
в API — URI stubs. Гость — только устройство, без user-data API.

Экраны: /onboarding, /login, /consent, /subscribe, / (home), /stats,
/settings, /favorites, /barcode|/scan, /meal/:id, item edit, /model-test.

Фичи: онбординг, analyze/refine/ask, ручной ввод, barcode OFF, favorites,
stats+вес, settings, PWA, Android widgets, квоты AI + T-Bank лицензия.

Стек: pnpm workspace Turborepo; React FSD + Express gateway + Prisma/Postgres.
Импорты между слайсами только через index.ts. UI на русском.
```

---

## One-liner

**AI Food** — дневник питания: фото или текст → AI оценивает КБЖУ → приём на устройстве; после входа данные аккаунта (кроме **фото**) восстанавливаются на других устройствах.

**Core value:** сфотографировал / описал еду → получил правдоподобные данные → сохранил → не потерял при смене телефона (фото нужно снимать заново / пока локально).

---

## Стек и границы

| Слой | Технологии |
|------|------------|
| Repo | Turborepo: `apps/ai-food` + `apps/ai-app` |
| Frontend | React 18, Vite, FSD, Tailwind + shadcn, TanStack Query, Zustand |
| Backend | Express `openrouter-gateway`, Prisma → Postgres |
| AI | `POST /v1/food/analyze\|refine\|ask` (+ generic chat для микро-онбординга) |
| Persist local | Capacitor Preferences; фото в Filesystem `meal-images/` |
| Persist server | User, Meal, WeightEntry, Favorite, UsageEvent, Payment, … |
| Auth | Telegram bot login / demo; `X-User-Token` |
| Язык UI | Русский |

**FSD:** `app → pages → widgets → features → entities → shared`. Импорты между слайсами только через `index.ts`.

---

## Синхронизация данных

| Данные | После логина |
|--------|----------------|
| Профиль + daily targets + micronutrientTargets | Да (`/auth/profile`, `/auth/me`) |
| Дневник meals | Да (`POST /user/meals/sync`) |
| Избранное | Да (`POST /user/favorites/sync`) |
| Вес + goalKg | Да (`POST /user/weights/sync`) |
| Settings / aiModel / custom instructions / flags / calendarRings | Да (`POST /user/settings/sync`) |
| Квоты / подписка | Да (`/usage`, `/billing/*`) |
| **Фото блюд** | **Нет и не будет** — только локальные файлы; blob storage не планируется |

Гость: всё только на устройстве. Logout: wipe локальных user-данных (кроме deviceId) → `/onboarding`.

Канон: [`USER-DATA-SYNC.md`](./USER-DATA-SYNC.md).

---

## Маршруты

| Route | Назначение |
|-------|------------|
| `/onboarding` | Анкета профиля и целей |
| `/login` | Telegram / demo вход |
| `/consent` | Согласие на обработку данных |
| `/subscribe` (+ success/fail) | Оплата годовой лицензии |
| `/` | Home: неделя, прогресс дня, список приёмов, FAB «+» |
| `/stats` | Недельная статистика + вес |
| `/settings` | Настройки, backup, выход |
| `/favorites` | Избранные блюда |
| `/barcode` / `/scan` | Штрихкод / unified scan |
| `/meal/:id` | Детали приёма, refine, favorite, delete |
| `/meal/:mealId/item/:itemId` | Правка ингредиента |
| `/model-test` | Dev-сравнение моделей |

Без профиля `ProfileGuard` → `/onboarding`.

---

## Persistence keys (локальный кэш)

| Key | Содержимое | Sync |
|-----|------------|------|
| `ai-food-diary` | meals + pendingDeletes | да (logged-in) |
| `ai-food-profile` | profile, targets, micronutrientTargets | да |
| `ai-food-settings` | instructions, flags, aiModel, calendarRings | да |
| `ai-food-favorites` | favorites + pendingDeletes | да |
| `ai-food-weight` | entries, goalKg | да |
| `ai-food-auth` | session + JWT | токен локально; User на сервере |
| Filesystem `meal-images/` | фото приёмов | **нет (намеренно навсегда)** |

---

## AI вызовы

| Фича | API | Формат |
|------|-----|--------|
| Анализ фото/текста | `/v1/food/analyze` | SSE XML |
| Уточнение | `/v1/food/refine` | JSON |
| Ask about dish | `/v1/food/ask` | JSON |
| Нормы микро (онбординг) | `/v1/chat/completions` | JSON |

Клиент сжимает фото и парсит ответ; промпты/model на gateway.

---

## Явно НЕ в продукте

- Sync / upload **файлов** фото приёмов на сервер — **permanent**, причина: **конфиденциальность** (снимки еды/окружения не кладём в центральное хранилище). Blob storage не планируется; в sync только URI-stubs
- Medical-grade nutrition / UL-токсичность микронутриентов как меддиагноз
- Health Connect / Apple Health
- БАДы отдельным типом записи (пока не нужно)
- UI `clearDiary` как отдельная кнопка (есть wipe при logout)
- iOS native — пока нет (`android/` есть; App Store later)

## Аккаунт

- Удаление аккаунта: `DELETE /auth/me` + кнопка в настройках с подтверждением (серверные данные + локальный wipe)

## Бэклог (ок делать)

- Локальные напоминания «запиши еду» (push / local notifications)

---

См. также: [`AI-GATEWAY.md`](./AI-GATEWAY.md), [`SUBSCRIPTION.md`](./SUBSCRIPTION.md), [`USER-DATA-SYNC.md`](./USER-DATA-SYNC.md).
