# Quick: Micronutrient badges

## Goal
Vision returns qualitative levels for top-8 vitamins/minerals; show badges on meal detail with «оценка» disclaimer; persist on Meal.

## Decisions (locked)
- Levels: high | medium | low | none (not mg / % RDA)
- IDs: vitaminA, vitaminC, vitaminD, vitaminB12, iron, calcium, folate, magnesium
- Optional on Meal for legacy; required in AI prompt
- UI: MealSummaryEditor (meal detail) — no diary card clutter
- Source: Vision qualitative estimate (no USDA in this task)

## Tasks
1. shared-types: MicronutrientId/Level/Estimate + optional on NutritionResult & Meal
2. analyzeFoodApi + refineMealApi: prompt + validation (+ tests)
3. useSaveMeal + useRefineMeal: persist micronutrients
4. MicronutrientsBadges UI in MealSummaryEditor
