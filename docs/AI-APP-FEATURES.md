# AI Food — описание продукта для ИИ

Документ для контекста агентов и внешних LLM. Отражает **текущий код**, а не устаревшие planning-доки июня 2026.

---

## System prompt (кратко)

```
AI Food — web/PWA дневник питания без auth и без серверной БД.

Core loop: фото или текст → AI (клиентский AI Gateway chat/completions) →
optimistic Meal (analyzing → ready|error) → локальный дневник (Capacitor Preferences).

Экраны: /onboarding, / (home), /stats, /settings, /favorites, /meal/:id,
/meal/:mealId/item/:itemId, /model-test. Отдельных /add и /result нет.

Фичи: онбординг (профиль + КБЖУ-цели + AI-нормы микро), анализ фото/текста
(stream XML), refine текстом, ручное редактирование состава, избранное
(quick-add без AI), статистика недели + вес, settings (flags, custom
instructions, aiModel), PWA.

Домен: Meal.items[] (FoodItem: КБЖУ, fiber, grams); healthiness, confidence,
micronutrients (8 ids), portions, totalGrams. Persist: ai-food-diary,
ai-food-profile, ai-food-settings, ai-food-favorites, ai-food-weight.

Стек: Turborepo, React FSD, TanStack Query (server), Zustand (client),
@ai-food/shared-types. Импорты между слайсами только через index.ts.
Mobile НЕ вызывает backend /analyze-food — ключ VITE_AI_GATEWAY_* на клиенте.
UI на русском. Нет: auth, sync, DB search, barcode, cloud diary.
```

---

## One-liner

**AI Food** — web/PWA дневник питания: фото или текст → AI оценивает КБЖУ, состав, микронутриенты → приём сохраняется локально на устройстве. Без аккаунта и без серверной БД.

**Core value:** сфотографировал / описал еду → получил правдоподобные данные → сохранил в дневник → данные переживают перезагрузку.

---

## Стек и границы

| Слой | Технологии |
|------|------------|
| Monorepo | Turborepo + pnpm: `apps/mobile`, `apps/backend`, `packages/shared-types` |
| Frontend | React 18, Vite, FSD, Tailwind + shadcn, TanStack Query, Zustand |
| AI | Клиентский **AI Gateway** (`VITE_AI_GATEWAY_URL` + `VITE_AI_GATEWAY_API_KEY`) → `/v1/chat/completions` |
| Persist | Capacitor Preferences (+ миграция с localStorage); фото в Filesystem |
| Auth / DB | Нет |
| Язык UI | Русский |

**FSD:** `app → pages → widgets → features → entities → shared`. Импорты между слайсами только через `index.ts`.

**Важно:** backend `POST /analyze-food` существует, но **mobile primary path его не использует** — анализ идёт с клиента на Gateway. Ключ API сейчас в клиентском `VITE_*` bundle.

---

## Маршруты

| Route | Назначение |
|-------|------------|
| `/onboarding` | Анкета профиля и целей |
| `/` | Home: неделя, прогресс дня, список приёмов, FAB «+» |
| `/stats` | Недельная статистика + вес |
| `/settings` | Настройки анализа, инструкции, redo onboarding |
| `/favorites` | Избранные блюда |
| `/meal/:id` | Детали приёма, refine, favorite, delete, custom content |
| `/meal/:mealId/item/:itemId` | Правка ингредиента |
| `/diary` | История по датам (в роутере есть; основной nav с Home может отсутствовать) |
| `/model-test` | Dev-сравнение моделей (вне ProfileGuard) |

Без профиля `ProfileGuard` → `/onboarding`. Отдельных `/add` и `/result` **нет** — анализ optimistic inline на Home.

---

## User journeys

1. **Онбординг** → профиль + локальные КБЖУ-цели + AI-нормы микронутриентов → Home
2. **Фото** → `+` → галерея/камера → meal `analyzing` → stream → `ready` → карточка → detail
3. **Текст** → `+` → «Описать» → тот же optimistic-flow без фото
4. **Уточнить AI** → detail → «Уточнить» → refine → обновление meal
5. **Ручная правка** → summary editor / edit item / swipe-delete
6. **Избранное** → ★ на detail → quick-add без AI на выбранную дату
7. **Статистика / вес** → `/stats`
8. **Тест моделей** → Settings → `/model-test`

---

## Фичи (по модулям)

### 1. Onboarding (`features/onboarding`)

- 8 шагов: пол, возраст, рост, вес, активность, цель, целевой вес + срок, тип диеты
- Локальный расчёт `DailyTargets` (kcal, БЖУ, клетчатка 30 г)
- AI: `micronutrientTargetsApi` → дневные нормы 8 микронутриентов; fallback на defaults
- Persist: `ai-food-profile`
- Диета (`none|halal|vegan|vegetarian`) влияет на промпты анализа (halal: pork→chicken bias)

### 2. Add food (`features/add-food`)

- `AddFoodSheet`: галерея / камера (`input type=file`) / описать текстом / избранное
- Камера — HTML file input, не Capacitor Camera
- Перед AI: client-side compression изображения (Canvas)

### 3. Save + analyze (`features/save-meal` + `analyze-food`)

- Optimistic: сразу `Meal` со `status: analyzing`, partial XML обновляет UI
- `analyzeFoodApi`: streaming XML → `NutritionResult`
- Входы: фото и/или текст; в промпт: custom instructions, diet, feature flags
- Результат: название, КБЖУ, fiber, `items[]` (состав в граммах), portions/`itemCount`, totalGrams, healthiness 1–10, confidence, micronutrients, disclaimers, reasons
- Ошибки: `status: error` + код; «Повторить» (`useRetryAnalyzeMeal`); no-food detection
- Stale recovery: `recoverStaleAnalyzingMeals` после hydrate
- Модель из `useSettingsStore.aiModel` (default Gemini flash)

### 4. Refine meal (`features/refine-meal`)

- Текстовое уточнение готового приёма (+ опционально фото)
- `refineMealApi` → JSON `NutritionResult` → `updateMeal`
- Не стриминг

### 5. Custom content (часть `analyze-food`)

- На detail: блок «Дополнительно» — Markdown по custom instructions / follow-up Q&A
- `fetchMealCustomContentApi`; карусель `customContent` + `customContentEntries`

### 6. Edit meal (`features/edit-meal`)

- `MealSummaryEditor`: название, КБЖУ, порции, граммы, микро
- Правка/удаление ингредиентов (`FoodItem`)
- SoT состава: `Meal.items[]`; агрегаты пересчитываются
- Без AI

### 7. Delete meal (`features/delete-meal`)

- Swipe на карточке + confirm sheet; кнопка на detail
- Без AI

### 8. Favorites (`features/favorites`)

- До 50 снимков приёма (`ai-food-favorites`)
- ★ на detail; quick-add без повторного AI
- Нельзя для `analyzing`/`error`

### 9. Stats (`features/stats`)

- Недельный график калорий vs цели
- Недельные микронутриенты vs нормы (если есть данные)
- Прогресс веса: лог, цель, тренд (`ai-food-weight`)
- Без AI (агрегация локальных данных)

### 10. Settings (`features/settings`)

- Persist `ai-food-settings`: custom instructions (до ~2000), feature flags (vitamins / healthiness / composition), `aiModel`
- Профиль read-only + redo onboarding (дневник/инструкции сохраняются)
- Ссылка на model-test
- Flags маскируют и промпт, и UI (`maskNutritionResultByFeatures`)

### 11. Model test (`features/model-test`)

- Бенчмарк моделей по эталонным фото (accuracy КБЖУ)
- Dev-инструмент

### 12. Diary / Home UI

- `DailyHeader`: week strip, прогресс vs targets, nav Stats/Settings
- `MealList` по `selectedDate`; сохранение привязано к выбранной дате календаря
- `MealCard`: compact КБЖУ, статусы analyzing/ready/error, retry

---

## Доменная модель

```
UserProfile → DailyTargets + micronutrientTargets
Meal {
  items: FoodItem[]  // состав: name, КБЖУ, fiber, grams
  totalCalories, name?, imageUri?, status?
  portions?, totalGrams?, healthiness?, confidence?
  micronutrients?, aiModel?, disclaimers?, customContent?
}
NutritionResult  // ответ AI до маппинга в Meal
```

Источник типов: `packages/shared-types/src/index.ts`.

8 микронутриентов: vitaminA/C/D/B12, iron, calcium, folate, magnesium (mg/µg).

---

## AI-вызовы

| Сценарий | API | Формат |
|----------|-----|--------|
| Анализ фото/текста | `analyzeFoodApi` | stream XML |
| Уточнение | `refineMealApi` | JSON |
| Нормы микро (онбординг) | `micronutrientTargetsApi` | JSON |
| «Дополнительно» | `fetchMealCustomContentApi` | Markdown |

Все через Gateway chat/completions. Промпты RU-oriented; составные блюда → разбивка на ингредиенты/слои; grams обязательны.

---

## Persistence keys

| Key | Содержимое |
|-----|------------|
| `ai-food-diary` | meals + selectedDate |
| `ai-food-profile` | profile, targets, micronutrientTargets |
| `ai-food-settings` | instructions, flags, aiModel |
| `ai-food-favorites` | favorites[] |
| `ai-food-weight` | entries, goalKg |
| Filesystem `meal-images/` | фото приёмов |

---

## PWA / Capacitor

- **PWA:** `vite-plugin-pwa`, installable, safe-area
- **Capacitor:** Preferences + Filesystem; config есть; нативных `android/`/`ios/` в репо нет
- Камера = web file input

---

## Явно НЕ в продукте

- Auth, sync, cloud DB
- Поиск по базе продуктов / barcode / voice
- AI-коуч / meal plans
- Medical-grade nutrition
- Primary path через backend OpenAI proxy (есть код, mobile его не зовёт)
- UI `clearDiary`
- Полноценное редактирование профиля без redo onboarding

---

## Правила для ассистентов, меняющих код

1. Cross-slice импорты только через barrels
2. AI-ответы не класть в Zustand «как server cache» — в diary только уже смапленный `Meal`
3. Промпты/парсеры — `features/analyze-food/api/*`
4. Shared domain — `@ai-food/shared-types`
5. Документы `.planning/PROJECT.md` / research июня **устарели** относительно текущего кода — ориентироваться на этот файл

---

*Сгенерировано: 2026-07-19 по состоянию кодовой базы.*
