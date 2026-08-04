# Quick Task 260716-2dw: Кнопка «Дополнить» — Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

<domain>
## Task Boundary

Добавить кнопку «Дополнить» на экране деталей приёма пищи (`MealDetailPage`). Пользователь вводит текстовое уточнение или переписывание блюда (например «съел половину», «котлета не куриная а мясная»), система обрабатывает через AI и обновляет КБЖУ + состав сохранённого приёма.

</domain>

<decisions>
## Implementation Decisions

### AI processing
- Полный цикл: текстовое уточнение → AI Gateway → пересчёт NutritionResult → обновить meal в diary store (name, items, totals).

### Button placement
- Под карточкой КБЖУ (`MealSummaryEditor`) / над секцией «Состав».

### Claude's Discretion
- UI: BottomSheet + Textarea по аналогии с `AddFoodSheet` mode describe
- API: расширить клиентский `analyzeFoodApi` (VITE_AI_GATEWAY) — text refine с текущим meal context; backend не трогать (как в 260716-05y)
- Если у meal есть imageUri — по возможности передать изображение вместе с correction text; если нет — text-only refine на основе текущего name/items
- Loading/error: loading на кнопке отправки в sheet + toast при ошибке/успехе
- Feature slice: новый `features/refine-meal` или расширение `edit-meal` — выбрать по FSD consistency

</decisions>

<specifics>
## Specific Ideas

Примеры user input:
- «съел половину» → пропорционально уменьшить КБЖУ/граммы
- «котлета не куриная а мясная» → заменить ингредиент и пересчитать макросы
- и т.п. свободный текст

Существующие паттерны:
- `AddFoodSheet` — BottomSheet + Textarea для description
- `useSaveMeal({ description })` — text-only analysis path уже есть
- `analyzeFoodApi` — клиентский AI Gateway (не backend)
- `updateMeal` / `updateMealNutrition` / item mutations в `useDiaryStore`

</specifics>

<canonical_refs>
## Canonical References

- apps/mobile/src/pages/meal-detail/ui/MealDetailPage.tsx
- apps/mobile/src/features/add-food/ui/AddFoodSheet.tsx
- apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts
- apps/mobile/src/features/save-meal/model/useSaveMeal.ts
- apps/mobile/src/entities/meal/model/useDiaryStore.ts
- apps/mobile/src/shared/ui/bottom-sheet.tsx

</canonical_refs>
