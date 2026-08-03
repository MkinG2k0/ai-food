# Manual food entry — Design

## Problem

В sheet «Добавить еду» нет способа занести блюдо вручную: с фото (опционально),
своими КБЖУ и опциональным составом — без AI-анализа. Пользователи, которые знают
цифры с этикетки или хотят быстрый ввод, вынуждены идти через камеру/описание.

## Goals

1. Кнопка **«Вручную»** в меню `AddFoodSheet`.
2. Отдельная страница `/manual-entry`: фото (опц.), название, КБЖУ, опциональный состав.
3. Сохранение сразу в дневник как `Meal` со `status: 'ready'` (без AI).
4. Состав можно задать при создании и/или дозаполнить на `/meal/:id` как у обычных блюд.
5. Если состав на форме пуст — итог из полей блюда (одна позиция-заглушка).
   Если состав не пуст (≥1 позиция) — итог = сумма позиций.

## Non-goals

- AI-оценка ручного блюда, микронутриенты, healthiness, confidence.
- Мультифото на ручном вводе.
- Автодобавление в избранное при сохранении.
- Персистентный draft при уходе со страницы.
- Изменение пайплайна analyze / refine.

## Decisions (from discussion)

| Тема | Решение |
|------|---------|
| Модель ввода | Сначала итог блюда; состав опционален |
| Где состав | И на странице создания, и потом на деталях |
| Связь итог ↔ состав | Непустой состав пересчитывает итог (сумма); пустой — поля формы |
| Минимум для save | Название + ккал > 0; Б/Ж/У могут быть 0; фото/состав опц. |
| UX-подход | Отдельный роут `/manual-entry` (не режим sheet, не черновик в detail) |

## Architecture

### Entry

В `AddFoodSheet` (режим `menu`), после «Избранное» или рядом с ним:

- Кнопка outline «Вручную» с иконкой (`Keyboard` или аналог, цвет `text-emerald-600`).
- `onClick`: закрыть sheet → `navigate('/manual-entry')`.

### Route

- `src/app/router.tsx`:
  `{ path: '/manual-entry', element: <ProfileGuard><ManualEntryPage /></ProfileGuard> }`
  внутри `AppShell`.
- Назад с `/manual-entry` → `/` (или `navigate(-1)`), без записи в дневник.

### FSD layout

```
pages/manual-entry/
  ui/ManualEntryPage.tsx
  index.ts

features/manual-entry/
  model/useSaveManualMeal.ts    # сборка Meal + persist image + addMeal
  ui/ManualCompositionDraft.tsx # список/форма черновых позиций (по необходимости)
  index.ts
```

Кнопка входа остаётся в `features/add-food` (`AddFoodSheet`).
Хук сохранения живёт в `features/manual-entry` (не в `save-meal`), чтобы не смешивать
AI-пайплайн с синхронным ручным create.
Переиспользовать: `saveMealImage`, `timestampForSelectedDate`, `useDiaryStore.addMeal`,
паттерны инпутов из `MealSummaryEditor` / `FoodItemEditPage`.

### Page UI (`ManualEntryPage`)

Верх: кнопка назад + заголовок «Вручную».

Секции сверху вниз:

1. **Фото** — превью; действия «Добавить» / «Заменить» / «Убрать»;
   одно фото (камера или галерея через hidden `<input type="file">`).
2. **Название** — обязательный text input.
3. **КБЖУ** — ккал, белки, жиры, углеводы; опционально клетчатка и граммы порции.
   - Состав пуст: поля редактируемые; ккал > 0 обязательны.
   - Состав не пуст: поля показывают сумму позиций (read-only).
4. **Состав** — список черновых позиций; «Добавить» → инлайн/мини-форма
   (название, ккал, Б, Ж, У, г). Удаление позиции из списка.
5. **Сохранить** — primary button.

### Save rules → `Meal`

```ts
{
  id: crypto.randomUUID(),
  timestamp: timestampForSelectedDate(selectedDate),
  name: trimmedName,
  status: 'ready',
  // imageUri / imageUris — если фото сохранено через saveMealImage
  // без aiModel, healthiness, confidence, micronutrients
  items: FoodItem[],
  totalCalories: number, // sumItemCalories(items)
  totalGrams?: number,   // если заданы граммы / сумма item.grams
}
```

| Состав на форме | `items` | Итог |
|-----------------|---------|------|
| пуст | одна `FoodItem`: `name` = название блюда, КБЖУ/г из полей формы | из полей формы |
| ≥1 позиция | позиции состава (у каждой свой `id`) | сумма; `name` блюда с формы |

Валидация перед save:

- название непустое после trim;
- если состав пуст: `calories > 0`;
- если состав не пуст: каждая позиция — непустое имя и `calories > 0`;
- ошибка `saveMealImage` → toast, meal не создавать.

После успеха → `navigate(`/meal/${id}`)`.

### Post-save (meal detail)

- Ручной meal выглядит как обычный `ready` meal.
- Состав дозаполняется через существующий UI (`FoodItemDisplayCard`, `FoodItemEditPage`).
- `updateMealItem` / `removeMealItem` уже пересчитывают `totalCalories` из items —
  это соответствует правилу «состав → итог».
- Не показывать/не предлагать retry analyze для meal без изображения анализа и без
  AI-контекста (существующее поведение error/analyzing не должно ломаться;
  ручной meal не попадает в analyzing).

## Data flow

```
AddFoodSheet "Вручную"
  → navigate /manual-entry
  → user fills form (+ optional photo, optional composition)
  → useSaveManualMeal()
       → saveMealImage? 
       → build Meal (ready)
       → useDiaryStore.addMeal
  → navigate /meal/:id
```

## Error handling

- Пустая форма / невалидные поля: кнопка Save disabled или no-op + без toast-спама.
- Ошибка записи фото: toast, остаёмся на странице с заполненной формой.
- Назад / уход со страницы: discard (без draft).

## Testing

1. `useSaveManualMeal`: без состава → 1 item, `totalCalories` = введённые ккал, `status: 'ready'`.
2. С составом из N позиций → `items.length === N`, `totalCalories` = сумма.
3. Без названия или ккал ≤ 0 (пустой состав) → не вызывает `addMeal`.
4. С фото → `imageUri` / `imageUris` заданы через mocked `saveMealImage`.
5. `AddFoodSheet`: «Вручную» закрывает sheet и навигирует на `/manual-entry`
   (если есть/добавляется тест sheet).

## Out of scope follow-ups

- Быстрое «в избранное» после ручного save.
- Мультифото / описание текстом на той же странице.
- Синхронизация ручного meal с AI refine.
