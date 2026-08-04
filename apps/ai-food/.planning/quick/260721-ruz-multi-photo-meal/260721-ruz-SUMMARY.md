---
id: 260721-ruz
slug: multi-photo-meal
status: complete
---

# SUMMARY: Multi-photo meal slider

## Done

- `Meal.imageUris` — все ракурсы сохраняются; `imageUri` = первое (legacy)
- `useSaveMeal` пишет все файлы через `saveMealImage`
- `MealPhotoSlider` на деталях: swipe + dots; одно фото — как раньше
- `ImageLightbox` листает несколько фото (стрелки / клавиатура)
- `MealCard` — бейдж с числом фото
- Retry analyze шлёт все сохранённые ракурсы
- Favorites / quick-add копируют `imageUris`

## Tests

- `resolveMealImageUris`, `useSaveMeal`, `useRetryAnalyzeMeal`, `useQuickAddFavorite` — green
- `pnpm --filter @ai-food/mobile type-check` — ok
