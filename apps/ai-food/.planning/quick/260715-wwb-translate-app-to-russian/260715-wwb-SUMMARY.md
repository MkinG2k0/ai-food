---
phase: quick
plan: 260715-wwb
subsystem: ui
tags: [russian, localization, openai, formatters, vitest]

requires: []
provides:
  - Russian-only mobile UI copy (hardcoded, no i18n)
  - OpenAI SYSTEM_PROMPT requiring Russian foodName
  - Russian ApiError messages from analyze-food
affects: [diary-ui, analyze-food, meal-cards]

tech-stack:
  added: []
  patterns: [hardcoded-ru-strings, ru-RU-locale-dates, russian-openai-prompt]

key-files:
  created: []
  modified:
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

key-decisions:
  - "No i18n framework — hardcode Russian strings for Russian-only MVP"
  - "API JSON field names stay English; only foodName values and error messages are Russian"
  - "Onboarding left untouched (already Russian)"

patterns-established:
  - "User-facing copy and OpenAI textual values use Russian; Zod/API contracts stay English keys"
  - "Units: ккал / г; today label: Сегодня; dates via ru-RU"

requirements-completed: []

coverage:
  - id: D1
    description: Backend SYSTEM_PROMPT and ApiError messages require Russian foodName / user-facing errors
    verification:
      - kind: unit
        ref: apps/backend/src/routes/analyze-food.test.ts#AI-01 returns 200 / system prompt на русском
        status: pass
    human_judgment: false
  - id: D2
    description: Mobile UI strings, formatters, and dates display in Russian
    verification:
      - kind: other
        ref: pnpm --filter @ai-food/mobile exec tsc --noEmit
        status: pass
    human_judgment: true
    rationale: Visual UI copy needs human spot-check beyond type-check
  - id: D3
    description: formatters and dateUtils tests expect Russian units and Сегодня
    verification:
      - kind: unit
        ref: apps/mobile/src/shared/lib/formatters.test.ts
        status: pass
      - kind: unit
        ref: apps/mobile/src/shared/lib/dateUtils.test.ts
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-15
status: complete
---

# Phase quick Plan 260715-wwb: Translate App to Russian Summary

**Russian-only MVP: hardcoded RU UI + OpenAI prompt that returns foodName in Russian.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-15T20:44:43Z
- **Completed:** 2026-07-15T20:48:30Z
- **Tasks:** 3/3
- **Files modified:** 17

## Accomplishments

- Backend `SYSTEM_PROMPT` and user message instruct Russian `foodName`; all ApiError messages translated
- Mobile pages/widgets/sheets and formatters (`ккал`/`г`, `Сегодня`, `ru-RU`) fully Russian
- Tests for analyze-food, formatters, and dateUtils updated and green

## Task Commits

1. **Task 1: Backend — русский SYSTEM_PROMPT и сообщения ошибок API** — `8ceb39b` (feat)
2. **Task 2: Mobile — все user-facing строки и форматтеры на русский** — `7d72997` (feat)
3. **Task 3: Синхронизировать тесты под русские строки** — `189da97` (test)

**Plan metadata:** skipped (docs commit handled by orchestrator per quick-task constraints)

## Files Created/Modified

- `apps/backend/src/routes/analyze-food.ts` — Russian prompt + API error messages
- `apps/backend/src/routes/analyze-food.test.ts` — Russian mock foodName + prompt assertion
- `apps/mobile/index.html` — `lang="ru"`, Russian title
- `apps/mobile/src/shared/lib/formatters.ts` — `ккал` / `г` / `ru-RU`
- `apps/mobile/src/shared/lib/dateUtils.ts` — `Сегодня`
- `apps/mobile/src/shared/api/client.ts` — `Неизвестная ошибка`
- UI sheets/pages/widgets — Russian copy (AddFoodSheet, MealList, DailyHeader, NutritionCard, MealCard, Home, Diary, MealDetail, useSaveMeal)
- `formatters.test.ts` / `dateUtils.test.ts` — Russian expectations

## Decisions Made

- No i18n dependency; hardcode Russian for MVP
- Keep JSON schema field names English; localize content and UI only
- Leave `features/onboarding/**` unchanged

## Deviations from Plan

None - plan executed exactly as written.

Note: Task 2 commits for overlapping WIP files (`MealCard`, `AddFoodSheet`, `useSaveMeal`, `DiaryPage`, `MealDetailPage`, `DailyHeader`) may include prior uncommitted feature WIP already present in those files; localization strings were the intentional changes for this plan.

## Issues Encountered

None — `pnpm --filter ... test -- --run` rejected by pnpm; used path args with existing `vitest run` scripts instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Russian UI and analysis language path are ready for manual smoke test (add meal photo → Russian foodName in diary). Unrelated WIP (router, ResultPage removal, diary store) remains uncommitted outside this plan.

## Self-Check: PASSED

- SUMMARY path exists
- Commits found: `8ceb39b`, `7d72997`, `189da97`

---
*Phase: quick*
*Completed: 2026-07-15*
