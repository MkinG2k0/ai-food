---
phase: 260817-wes
plan: 01
subsystem: nutrition
tags: [kbju, macros, tenths, sanitize, prompts, formatters]
requires: []
provides:
  - "sanitizeNutrient snaps protein/fat/carbs/fiber/calories to tenths (5.5)"
  - "parseNutrientInput for editors (comma/dot)"
  - "AI analyze/refine prompts request one-decimal macros with 5.5 few-shot"
  - "formatMacro and editors show/edit tenths; formatCalories stays whole kcal"
affects: [diary, analyze, refine, barcode, manual-entry, meal-edit]
actuals:
  tokens: 8000
  tasks: 3
  commits: 5
tech-stack:
  added: []
  patterns: [tenths-sanitize-like-grams]
key-files:
  created: []
  modified:
    - apps/ai-food/src/entities/meal/model/mealNutritionMath.ts
    - apps/ai-app/src/food/prompts.ts
    - apps/ai-food/src/shared/lib/formatters.ts
    - apps/ai-food/src/shared/lib/useAnimatedNumber.ts
key-decisions:
  - "Same tenths formula as sanitizeGrams for all nutrient writes"
  - "Calories stored as tenths, displayed whole via formatCalories"
  - "Daily header / widgets / onboarding goals stay whole-number UX"
  - "No Prisma migration; Meal.totalCalories already Float; items Json"
requirements-completed: [QUICK-260817-wes]
coverage:
  - id: D1
    description: 5.5 survives sanitize, per-100, portion ratio, nutrient-ratio, barcode scale
    requirement: QUICK-260817-wes
    verification:
      - kind: unit
        ref: src/entities/meal/model/mealNutritionMath.test.ts
        status: pass
      - kind: unit
        ref: src/entities/meal/model/mealPortions.test.ts
        status: pass
      - kind: unit
        ref: src/features/scan-barcode/api/mapOffProductToMeal.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Gateway prompts request one-decimal macros; XML 5.5 parses as 5.5
    requirement: QUICK-260817-wes
    verification:
      - kind: unit
        ref: src/features/analyze-food/api/parseNutritionXml.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: formatMacro(5.5) is "5.5 г"; editors persist tenths; kcal strings stay whole
    requirement: QUICK-260817-wes
    verification:
      - kind: unit
        ref: src/shared/lib/formatters.test.ts
        status: pass
      - kind: unit
        ref: src/features/manual-entry/model/buildManualMeal.test.ts
        status: pass
    human_judgment: false
duration: 25min
completed: 2026-08-17
status: complete
---

# Quick 260817-wes: дробные КБЖУ

**Белок 5.5 г теперь хранится, масштабируется с порциями/соотношением и показывается без округления до целого; ИИ просят ту же точность.**

## Accomplishments

- `sanitizeNutrient` snap к десятым (как `sanitizeGrams`); все scale/ratio/barcode пути идут через него.
- `parseNutrientInput` экспортирован из `@/entities/meal` для редакторов.
- Промпты analyze/refine в `apps/ai-app/src/food/prompts.ts` просят одно десятичное; few-shot йогурта с protein 5.5.
- `formatMacro` показывает 5.5 без хвостового `.0`; `formatCalories` остаётся целыми ккал.
- Редакторы приёма/ингредиента/ручного ввода и штрихкод принимают `step=0.1`.

## Commits

- `316f653` test(260817-wes-01): add failing tests for tenths macros
- `668b175` feat(260817-wes-01): snap macros to tenths like grams
- `2eabd8d` feat(260817-wes-01): ask AI for one-decimal macros
- `d39317b` test(260817-wes-01): add failing tests for tenths display
- `5834299` feat(260817-wes-01): show and edit tenths macros in UI

## Deviations

- Executor abort mid-task 3; UI changes completed and committed after resume. Scope unchanged.
