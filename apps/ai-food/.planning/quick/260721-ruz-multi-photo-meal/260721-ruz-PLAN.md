---
id: 260721-ruz
slug: multi-photo-meal
status: in-progress
---

# PLAN: Multi-photo meal slider

## Goal

Доделать multi-angle фото: при выборе нескольких ракурсов сохранять все в дневник и показывать слайдер на странице деталей приёма.

## Scope

1. `Meal.imageUris?: string[]` (+ `imageUri` = первое для legacy)
2. `useSaveMeal` — `saveMealImage` для каждого файла
3. `resolveMealImageUris` + `useMealImages`
4. `MealPhotoSlider` на `MealDetailPage` (scroll-snap + dots); lightbox с листанием
5. `MealCard` — бейдж «N» при >1 фото
6. Retry analyze — все сохранённые фото в API
7. Favorites — копировать `imageUris`

## Out of scope

- Лимит кол-ва фото в галерее
- Слайдер в карточках списка / избранном
---

## Tasks

### T1 — Domain + save
- Добавить `imageUris` в shared-types
- Сохранять все фото в `useSaveMeal`
- Хелпер `resolveMealImageUris`
- Обновить тест save-meal

### T2 — UI slider + lightbox
- `useMealImages`, `MealPhotoSlider`
- Обновить `ImageLightbox` (srcs + index)
- `MealDetailPage` + бейдж на `MealCard`

### T3 — Retry / favorites
- `useRetryAnalyzeMeal` грузит все uris
- Favorites / quick-add копируют `imageUris`
