---
phase: quick
plan: 260715-wwb
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/backend/src/routes/analyze-food.ts
  - apps/backend/src/routes/analyze-food.test.ts
  - apps/mobile/index.html
  - apps/mobile/src/shared/lib/formatters.ts
  - apps/mobile/src/shared/lib/formatters.test.ts
  - apps/mobile/src/shared/lib/dateUtils.ts
  - apps/mobile/src/shared/lib/dateUtils.test.ts
  - apps/mobile/src/shared/api/client.ts
  - apps/mobile/src/features/add-food/ui/AddFoodSheet.tsx
  - apps/mobile/src/features/save-meal/model/useSaveMeal.ts
  - apps/mobile/src/widgets/meal-list/ui/MealList.tsx
  - apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx
  - apps/mobile/src/widgets/nutrition-card/ui/NutritionCard.tsx
  - apps/mobile/src/entities/meal/ui/MealCard.tsx
  - apps/mobile/src/pages/home/ui/HomePage.tsx
  - apps/mobile/src/pages/diary/ui/DiaryPage.tsx
  - apps/mobile/src/pages/meal-detail/ui/MealDetailPage.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Все видимые пользователю строки mobile UI (кнопки, заголовки, empty states, aria-label, статусы анализа, ошибки) на русском."
    - "formatCalories/formatMacro и даты (Today → Сегодня, toLocale* с ru-RU) отображаются по-русски."
    - "SYSTEM_PROMPT и user-message к OpenAI требуют foodName и текст анализа на русском; API error message в ответах бэкенда на русском."
    - "Онбординг уже на русском — не ломать и не переписывать заново."
    - "Тесты formatters/dateUtils/analyze-food обновлены под русские ожидания и проходят."
  artifacts:
    - path: "apps/backend/src/routes/analyze-food.ts"
      provides: "Русский SYSTEM_PROMPT + русские ApiError message + русский user text"
      contains: "на русском"
    - path: "apps/mobile/src/shared/lib/formatters.ts"
      provides: "ккал / г в пользовательском формате"
      contains: "ккал"
    - path: "apps/mobile/src/features/add-food/ui/AddFoodSheet.tsx"
      provides: "Русский лист добавления еды"
      contains: "Добавить"
  key_links:
    - from: "SYSTEM_PROMPT foodName instruction"
      to: "Meal.items[].name / NutritionResult.foodName в UI"
      via: "OpenAI Vision → AnalyzeFoodResponse.result.foodName → useSaveMeal updateMeal"
      pattern: "foodName"
    - from: "formatCalories / formatMacro"
      to: "DailyHeader, MealCard, MealDetailPage, NutritionCard"
      via: "@/shared/lib"
      pattern: "ккал"
---

<objective>
Перевести приложение на русский язык без i18n-фреймворка: хардкод русских строк в mobile UI и в backend OpenAI-промпте, чтобы и интерфейс, и названия блюд в ответе модели были на русском.

Purpose: Продукт Russian-only MVP; сейчас смесь EN UI + EN foodName в SYSTEM_PROMPT. Пользователь должен видеть полностью русский опыт end-to-end.

Output: Один проход правок по backend route + mobile user-facing strings + синхронизация тестов. Без react-i18next / новых зависимостей.
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

# Backend
@apps/backend/src/routes/analyze-food.ts
@apps/backend/src/routes/analyze-food.test.ts

# Shared formatters / dates / API errors
@apps/mobile/src/shared/lib/formatters.ts
@apps/mobile/src/shared/lib/formatters.test.ts
@apps/mobile/src/shared/lib/dateUtils.ts
@apps/mobile/src/shared/lib/dateUtils.test.ts
@apps/mobile/src/shared/api/client.ts
@apps/mobile/index.html

# UI still in English (onboarding already Russian — leave alone)
@apps/mobile/src/features/add-food/ui/AddFoodSheet.tsx
@apps/mobile/src/features/save-meal/model/useSaveMeal.ts
@apps/mobile/src/widgets/meal-list/ui/MealList.tsx
@apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx
@apps/mobile/src/widgets/nutrition-card/ui/NutritionCard.tsx
@apps/mobile/src/entities/meal/ui/MealCard.tsx
@apps/mobile/src/pages/home/ui/HomePage.tsx
@apps/mobile/src/pages/diary/ui/DiaryPage.tsx
@apps/mobile/src/pages/meal-detail/ui/MealDetailPage.tsx

## Constraints
- No i18n framework — hardcode Russian strings
- Do not touch onboarding UI (already Russian)
- ResultPage is deleted in working tree / not routed — do not recreate it; translate NutritionCard anyway for consistency
- Cross-slice imports stay via barrels; this task only edits leaf UI/lib/route files
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend — русский SYSTEM_PROMPT и сообщения ошибок API</name>
  <files>apps/backend/src/routes/analyze-food.ts, apps/backend/src/routes/analyze-food.test.ts</files>
  <action>
В `apps/backend/src/routes/analyze-food.ts`:

1. Переписать `SYSTEM_PROMPT` так, чтобы модель возвращала JSON с тем же набором полей (`foodName`, `calories`, `protein`, `carbs`, `fat`, `fiber`, `confidence`), но явно указать: значение `foodName` — название блюда/продукта **на русском языке** (не на английском). Можно оставить схему полей на английских ключах (контракт API не менять). Добавить краткую инструкцию отвечать содержимым полей (имена) по-русски.

2. Перевести user text в `messages` (сейчас English analyze instruction) на русский, например: проанализировать изображение еды и вернуть nutrition data как JSON.

3. Перевести все пользовательские `message` в `sendApiError` / ветках ошибок на русский естественный язык, сохранив те же `code` и HTTP status:
   - нет файла изображения
   - пустой ответ анализа
   - schema mismatch
   - rate limit
   - timeout
   - bad request image
   - generic analysis failed

4. В `analyze-food.test.ts`: обновить mock `foodName` на русское название (например `Курица гриль` вместо `Grilled Chicken`). Не менять assertions на структуру ответа. Опционально: assert, что system prompt, переданный в OpenAI `create`, содержит явное указание на русский `foodName` (через `mockCreate` call args) — если это дёшево читается из уже существующего mock setup.

Не менять Zod schema, route path, multer, model id.
  </action>
  <verify>
    <automated>pnpm --filter @ai-food/backend test -- --run src/routes/analyze-food.test.ts</automated>
  </verify>
  <done>
SYSTEM_PROMPT требует foodName на русском; user message и все ApiError.message на русском; тесты analyze-food зелёные; JSON field names и HTTP codes без изменений.
  </done>
</task>

<task type="auto">
  <name>Task 2: Mobile — все user-facing строки и форматтеры на русский</name>
  <files>apps/mobile/index.html, apps/mobile/src/shared/lib/formatters.ts, apps/mobile/src/shared/lib/dateUtils.ts, apps/mobile/src/shared/api/client.ts, apps/mobile/src/features/add-food/ui/AddFoodSheet.tsx, apps/mobile/src/features/save-meal/model/useSaveMeal.ts, apps/mobile/src/widgets/meal-list/ui/MealList.tsx, apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx, apps/mobile/src/widgets/nutrition-card/ui/NutritionCard.tsx, apps/mobile/src/entities/meal/ui/MealCard.tsx, apps/mobile/src/pages/home/ui/HomePage.tsx, apps/mobile/src/pages/diary/ui/DiaryPage.tsx, apps/mobile/src/pages/meal-detail/ui/MealDetailPage.tsx</files>
  <action>
Хардкод русских строк (без i18n). Рекомендуемый словарь (можно слегка править формулировки, смысл сохранить):

**shared**
- `formatCalories`: `N ккал` (было `N kcal`)
- `formatMacro`: `N г` (было `Ng`)
- `formatDate`: locale `ru-RU` вместо `undefined`
- `formatHeaderDate`: `Сегодня` вместо `Today`; остальное уже `ru-RU`
- `client.ts` fallback message: `Неизвестная ошибка`
- `index.html`: `lang="ru"`, title например `AI Food — дневник питания`

**AddFoodSheet**: Добавить еду / Галерея / Камера / Описать / Отправить; aria-label для inputs на русском; placeholder вида `Напр.: куриный салат с рисом`

**useSaveMeal**: placeholder name `Анализ…`; fallback без описания `Без названия`; portion `1 порция` (оба места)

**MealList**: пустые состояния — `Сегодня приёмов пищи нет` / `В этот день приёмов пищи нет`; подсказка `Нажмите +, чтобы добавить первое блюдо`

**DailyHeader**: `N ккал осталось` / `N ккал сверх нормы` (числа через Math.round как сейчас; можно опираться на `formatCalories` или сырой текст — главное единообразие единиц)

**NutritionCard**: `N% совпадение`; labels Белки / Углеводы / Жиры / Клетчатка; unit `г`

**MealCard**: aria и видимый текст — `Анализ еды` / `Анализ еды…` / `Ошибка анализа…`; фраза `at` в aria заменить на русскую (`в {time}` / `за {time}`)

**HomePage**: aria-label `Добавить еду`

**DiaryPage**: Дневник питания / Пока нет приёмов пищи / Добавьте первый приём пищи / кнопка Добавить еду

**MealDetailPage**: Детали приёма / `дата в {time}` / Белки Углеводы Жиры / Состав / убрать english `protein|carbs|fat` рядом с formatMacro (оставить только числа или подписи на русском)

Не трогать `features/onboarding/**` (уже RU). Не восстанавливать ResultPage. Не менять FSD импорты/barrels кроме правки строк в существующих файлах.
  </action>
  <verify>
    <automated>pnpm --filter @ai-food/mobile exec tsc --noEmit</automated>
  </verify>
  <done>
В перечисленных UI/lib файлах нет английских user-facing литералов из исходного набора (Add Food, Gallery, kcal remaining, Today, Analyzing, Meal Details, Protein, Items, Untitled meal, 1 serving и т.п.); type-check проходит.
  </done>
</task>

<task type="auto">
  <name>Task 3: Синхронизировать тесты под русские строки</name>
  <files>apps/mobile/src/shared/lib/formatters.test.ts, apps/mobile/src/shared/lib/dateUtils.test.ts</files>
  <action>
Обновить expectations:
- `formatters.test.ts`: `320 ккал`, `321 ккал`, `0 ккал`; macros `35 г`, `36 г`
- `dateUtils.test.ts`: `formatHeaderDate` для сегодня → `Сегодня`; past date assertion сравнивает с `Сегодня` а не `Today`

Фикстуры вроде `Chicken Salad` в store-тестах можно оставить (это тестовые данные имени блюда, не UI-копирайт) — не обязательно русифицировать.

Запустить связанные тесты mobile shared/lib.
  </action>
  <verify>
    <automated>pnpm --filter @ai-food/mobile test -- --run src/shared/lib/formatters.test.ts src/shared/lib/dateUtils.test.ts</automated>
  </verify>
  <done>
formatters и dateUtils тесты зелёные и ожидают русские единицы/`Сегодня`.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → backend `/analyze-food` | Untrusted image upload; API returns nutrition JSON + error messages shown in UI |
| backend → OpenAI | SYSTEM_PROMPT steers model language; response still validated by Zod |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260715-wwb-01 | Information Disclosure | ApiError.message | low | accept | Сообщения об ошибках на русском не раскрывают stack/API keys; коды без изменений |
| T-260715-wwb-02 | Tampering | OpenAI foodName content | medium | accept | Модель может вернуть любой string; Zod уже валидирует тип; UI отображает как есть (existing) |
| T-260715-wwb-03 | Elevation of Privilege | n/a | low | accept | Нет auth/locale escalation в scope |
| T-260715-wwb-SC | Tampering | npm installs | high | accept | Новых пакетов нет — установка не выполняется |
</threat_model>

<verification>
1. Backend analyze-food tests pass with Russian prompt expectations
2. Mobile formatters/dateUtils tests pass
3. `tsc --noEmit` for mobile passes
4. Spot-check: grep user-facing English leftovers in changed UI files should come up empty for the strings listed in Task 2
</verification>

<success_criteria>
- UI и API ошибки русские
- AI foodName инструктирован на русском
- Тесты обновлены и зелёные
- Без i18n dependency
</success_criteria>

<output>
Create `.planning/quick/260715-wwb-translate-app-to-russian/260715-wwb-SUMMARY.md` when done
</output>
