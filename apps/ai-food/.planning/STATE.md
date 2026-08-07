---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 1
current_phase_name: Photo Capture & Analysis Loading
status: executing
stopped_at: Completed quick task 260807-jk6 — today KBJU rings home widget
last_updated: "2026-08-07T11:25:00.000Z"
last_activity: 2026-08-07
last_activity_desc: "Android KBJU rings widget for today"
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
  percent: 17
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-24)

**Core value:** Сфотографировал еду → получил правдоподобные данные о питании → сохранил в дневник — без лишних шагов и без потери данных при перезагрузке.
**Current focus:** Phase 2 — Photo Capture & Analysis Loading

## Current Position

Phase: 1 of 6 COMPLETE — next: Phase 2 (Photo Capture & Analysis Loading)
Plan: 2/2 complete in Phase 1
Status: Phase 1 verified PASS — Phase 2 not started
Last activity: 2026-08-07 - Completed quick task 260807-jk6: today KBJU rings home widget

Progress: [█░░░░░░░░░] 17%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- OpenAI Vision via backend proxy (API key server-only)
- Web-MVP without auth, DB, or Capacitor in this cycle
- localStorage for diary persistence
- USER OVERRIDE 260716-05y: mobile analyze uses client-side VITE_AI_GATEWAY_API_KEY against deployed AI Gateway (backend untouched)
- 260716-0f7: selectedDate in diary store (ephemeral); useSaveMeal timestamp via timestampForSelectedDate
- 260716-0hj: meal delete via BottomSheet confirm (detail button + list swipe); removeMeal only after confirm
- 260716-0vb: NutritionResult.items per-component КБЖУ; useSaveMeal maps to Meal.items; empty items → foodName fallback
- 260716-16d: Meal.name from foodName; mealDisplayName for legacy; UI title ≠ composition list
- 260716-1ew: COMPOSITION_PROMPT_RULE — compound dishes → ingredient/layer items (burger ≠ single item)
- 260716-1ml: Meal.items[] SoT; updateMealItem/removeMealItem/updateMealNutrition; edit-meal on MealDetailPage
- 260716-1zl: composition display-only + FoodItemEditPage; FoodMacrosBadges shared with MealCard
- 260716-24h: FoodItem.grams replaces portion; AI returns grams; UI badge «N г»
- 260716-2dw: MealDetail «Дополнить» → refineMealApi (client gateway) → updateMeal; features/refine-meal
- 260716-3d2: features/stats — getWeeklyCalorieSeries + WeeklyCaloriesChart; StatsPage `/stats`; DailyHeader nav
- 260716-3g0: useSettingsStore (ai-food-settings) customInstructions → analyze/refine system prompts; `/settings`
- 260718-4y0: Settings aiModel SoT; chat/completions honors client model; OPENROUTER_MODEL fallback
- 260719-mq7: FoodItemEditPage «На 100 г»↔«На порцию»; absolute FoodItem only; grams rescale on edit page
- 260716-3nc: DietType on UserProfile (none/halal/vegan/vegetarian); appendDietPreference with Halal-only pork→chicken bias; Settings diet edit
- 260716-jaa: UserProfile.targetWeight; onboarding StepTargetWeight after Goal (TOTAL_STEPS=8); micronutrient userText; macros still from weight
- 260716-jlq: micronutrientTargetsApi model gpt-4.1 (not mini); analyze/refine unchanged
- 260716-jqc: RU-structured analyze prompts; grams REQUIRED; few-shot A/B; locked vision user text D-03
- 260716-jve: UserProfile.targetWeightDate; StepTargetWeight date + isFutureDay; micronutrient userText; Settings «Срок»
- 260716-3nq: Settings profile summary + resetProfile redo onboarding (diary/customInstructions kept)
- 260716-3qy: FoodItem/DailyTargets.fiber; save/refine persist; daily totals + 30 г goal; diary badges/edit «Кл»/клетчатка
- 260716-4dd: MealCard density=compact (large kcal + Б/Ж/У/К circles); FoodItemDisplayCard keeps pill badges
- 260716-4nf: micronutrients qualitative high/medium/low/none on NutritionResult/Meal; Vision prompt; MealSummaryEditor badges «оценка»
- 260716-iqm: MicronutrientEstimate amount+unit (mg/µg); MICRONUTRIENT_UNITS; AI norms after onboarding; chart dailyAvg vs norm
- 260716-51m: MealCard error «Повторить» → useRetryAnalyzeMeal; applyAnalyzeResultToMeal shared with useSaveMeal; loadMealImageAsFile
- 260716-53i: features/favorites (ai-food-favorites, max 50); MealDetail star; AddFoodSheet «Избранное» → quick-add for selectedDate
- 260716-5gj: vite-plugin-pwa autoUpdate + safe-area; Meal Detail thicker Полезность/Точность bars, 2×2 macros
- 260803-wue: features/auth mock Telegram session (ai-food-auth); /login optional; Settings Аккаунт; no next-auth
- 260804-3gx: one-time T-Bank yearly license (ai-app billing) + paywall; login ≠ unlimited; hasActiveSubscription gates AI
- 260806-u2q: food prompts + OPENROUTER_MODEL + temperature 0 on ai-app `/v1/food/*`; clients send clean bodies only
- 260806-vce: `/scan` Еда|Штрихкод (CalZen-style); TextareaWithVoice (Capgo native / Web Speech); AddFoodSheet simplified
- 260807-itx: Android home widget 6 buttons → `aifood://add/<action>` → DeepLinkHandler / AddFoodSheet
- 260807-j74: Six separate 1×1 App Widgets (one per AddFood action); tall 6-button widget removed
- 260807-jk6: Today KBJU rings 2×2 widget + Preferences snapshot sync + KbjuWidget.refresh

### Pending Todos

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260624-l39 | configure Capacitor in mobile app | 2026-06-24 | eec0222 | [260624-l39-configure-capacitor-in-mobile-app](./quick/260624-l39-configure-capacitor-in-mobile-app/) |
| 260627-29b | Generate Claude Design prompt for ai-food app | 2026-06-27 | — | [260627-29b-generate-claude-design-prompt-for-ai-foo](./quick/260627-29b-generate-claude-design-prompt-for-ai-foo/) |
| 260705-psq | Fix WeekStrip swipe: scrollbar glitch + 3-week virtualized carousel (pending human verify) | 2026-07-05 | 59d495c, 98c237c | [260705-psq-fix-weekstrip-swipe-scrollbar-appears-du](./quick/260705-psq-fix-weekstrip-swipe-scrollbar-appears-du/) |
| 260706-x79 | Show detailed meal info on MealCard click: clickable MealCard + /meal/:id detail page | 2026-07-07 | fb13801, 538fd60 | [260706-x79-show-detailed-meal-info-on-mealcard-clic](./quick/260706-x79-show-detailed-meal-info-on-mealcard-clic/) |
| 260715-wwb | Translate app to Russian (UI + OpenAI foodName prompt) | 2026-07-15 | 8ceb39b, 7d72997, 189da97 | [260715-wwb-translate-app-to-russian](./quick/260715-wwb-translate-app-to-russian/) |
| 260716-05y | Switch analyzeFoodApi to AI Gateway (ai-app chat/completions) | 2026-07-16 | e5151b9, 78025a9 | [260716-05y-analyze-food-ai-gateway-ai-app-api-vite-](./quick/260716-05y-analyze-food-ai-gateway-ai-app-api-vite-/) |
| 260716-0f7 | Fix meal timestamp to use selected calendar date | 2026-07-16 | 3ec20f1, 39d8da2, cc48ce5, 6fbf615 | [260716-0f7-fix-meal-selected-calendar-date](./quick/260716-0f7-fix-meal-selected-calendar-date/) |
| 260716-0hj | Meal delete: detail button + swipe confirm (framer-motion) | 2026-07-16 | 9ea28e0, 1893781, 93da285, d12ce03 | [260716-0hj-meal-id-motion-for-react-motion-react-ht](./quick/260716-0hj-meal-id-motion-for-react-motion-react-ht/) |
| 260716-0vb | Split meal composition КБЖУ (items[] from AI → FoodItem[]) | 2026-07-16 | c4ae029, b565a0a, 1b20699, 306ce93 | [260716-0vb-split-meal-composition-kbzhu](./quick/260716-0vb-split-meal-composition-kbzhu/) |
| 260716-16d | Dish name separate from composition (Meal.name + mealDisplayName) | 2026-07-16 | 1a58d23, 99885da, 33f8211, 2133b26 | [260716-16d-sdelat-nazvanie-bluda-otdelno-ot-perechi](./quick/260716-16d-sdelat-nazvanie-bluda-otdelno-ot-perechi/) |
| 260716-1ew | Stronger composition breakdown (бургер → булка/котлета/сыр…) | 2026-07-16 | 39a3aa3, 23dcdbc | [260716-1ew-silnee-razdelenie-sostava](./quick/260716-1ew-silnee-razdelenie-sostava/) |
| 260716-1ml | Edit/delete composition KBJU on meal detail | 2026-07-16 | f9e579d, b8bc52f, b26f07a | [260716-1ml-edit-delete-composition-kbzhu](./quick/260716-1ml-edit-delete-composition-kbzhu/) |
| 260716-1zl | Composition display + food item edit page | 2026-07-16 | 1dbadd4, 7cb65af | [260716-1zl-composition-display-edit-page](./quick/260716-1zl-composition-display-edit-page/) |
| 260716-24h | Replace portion with grams on ingredients | 2026-07-16 | a1152f4, 9127dd3, 5d88035, a7d0674 | [260716-24h-ingredient-grams-not-portions](./quick/260716-24h-ingredient-grams-not-portions/) |
| 260716-2dw | Meal refine «Дополнить» via AI Gateway | 2026-07-16 | d5d9e7c, ae6c22b, 40965ca | [260716-2dw-ai](./quick/260716-2dw-ai/) |
| fast | Show dish macros Б/У/Ж in one horizontal row | 2026-07-16 | d604193 | — |
| fast | Refine loading on Дополнить button; remove bottom Удалить | 2026-07-16 | e50c59e | — |
| 260716-3g0 | Settings: persisted custom instructions in AI prompts | 2026-07-16 | fcda000, 9d4ce65, 882fdcb, 5ce71af | [260716-3g0-settings-custom-instructions](./quick/260716-3g0-settings-custom-instructions/) |
| 260716-3nq | Settings: profile summary + redo onboarding | 2026-07-16 | 80e9192, 33f5b2f, 6ebad18 | [260716-3nq-settings-redo-onboarding](./quick/260716-3nq-settings-redo-onboarding/) |
| 260716-3nc | Onboarding diet type + Halal pork→chicken AI bias | 2026-07-16 | 5027899, d26a412, 054becc, 3c42947 | [260716-3nc-bias](./quick/260716-3nc-bias/) |
| 260716-3qy | Add dietary fiber everywhere (persist, totals, diary UI) | 2026-07-16 | 5c3cbc7, 83a5885, 6b33f4c, b9e83db, 7d6c414 | [260716-3qy-add-fiber](./quick/260716-3qy-add-fiber/) |
| 260716-3d2 | модуль статистики — недельный график калорий (сумма по дням) | 2026-07-15 | a90f01b, 026da04, 08a7dac | [260716-3d2-stats-weekly-kcal](./quick/260716-3d2-stats-weekly-kcal/) |
| fast | Выровнять бейджи КБЖУ (ккал до 9999, макросы до 999) | 2026-07-16 | 05a2665 | — |
| 260716-4dd | MealCard compact: large kcal + letter circles Б/Ж/У/К | 2026-07-16 | b549a54, 98203ef | [260716-4dd-mealcard](./quick/260716-4dd-mealcard/) |
| 260716-4aa | Полезность (1–10) и точность распознавания (%) после даты на деталях приёма | 2026-07-16 | 0fa166c, 3aca94d, 38c16b4, 18185df | [260716-4aa-1-10](./quick/260716-4aa-1-10/) |
| 260716-4nf | Micronutrient badges (top-8 qualitative levels) on meal detail | 2026-07-16 | — | [260716-4nf-micronutrient-badges-vision-returns-top-](./quick/260716-4nf-micronutrient-badges-vision-returns-top-/) |
| 260716-50x | Client-side image compression before AI (Canvas, no backend) | 2026-07-16 | — | [260716-50x-client-side-image-compression-before-ai-](./quick/260716-50x-client-side-image-compression-before-ai-/) |
| 260716-53i | Favorite food: detail star + quick-add from Home «+» | 2026-07-16 | 4257d07, a1569d5 | [260716-53i-favorite-food](./quick/260716-53i-favorite-food/) |
| fast | Favorites: photos in list + dedicated `/favorites` page | 2026-07-16 | f479646 | — |
| 260716-51m | Analyze-food retry «Повторить» on error MealCard | 2026-07-16 | 7454b43, 210f130, a257dbc | [260716-51m-analyze-food-retry-button](./quick/260716-51m-analyze-food-retry-button/) |
| 260716-5gj | PWA installability + Meal Detail Полезность/Точность layout | 2026-07-16 | bc3f6c8, 7895879 | [260716-5gj-pwa-1-10-ui-ux](./quick/260716-5gj-pwa-1-10-ui-ux/) |
| 260716-i2n | No-food photo → ошибка распознавания + «Повторить» | 2026-07-16 | 02db668 | [260716-i2n-no-food-detection-error-and-retry](./quick/260716-i2n-no-food-detection-error-and-retry/) |
| 260716-iqm | Quantitative micronutrients (мг/мкг) + AI daily norms + chart vs norm | 2026-07-16 | e03000e, d09130b, 1a6f6e2 | [260716-iqm-ai](./quick/260716-iqm-ai/) |
| 260716-j45 | Onboarding result: tips how to photo food for AI | 2026-07-16 | 9c746e8, 557baec | [260716-j45-onboarding-photo-tips](./quick/260716-j45-onboarding-photo-tips/) |
| 260716-jaa | Onboarding desired weight (targetWeight) after Goal | 2026-07-16 | 50177a8, e01208d, ae67511 | [260716-jaa-onboarding-target-weight](./quick/260716-jaa-onboarding-target-weight/) |
| 260716-jlq | gpt-4.1 for onboarding micronutrientTargetsApi | 2026-07-16 | 17c6829, 3e96aec, 6b7ae04 | [260716-jlq-use-gpt-4-1-for-onboarding-micronutrient](./quick/260716-jlq-use-gpt-4-1-for-onboarding-micronutrient/) |
| 260716-jqc | RU grams/few-shot analyze prompts + stronger user messages | 2026-07-16 | 3a17608, b3f0f8f, c2bc136, baec96e | [260716-jqc-grams-ru-few-shot-user-message-healthine](./quick/260716-jqc-grams-ru-few-shot-user-message-healthine/) |
| 260716-jve | Onboarding target weight deadline (targetWeightDate) | 2026-07-16 | 4629491, 2746b6e | [260716-jve-onboarding-target-weight-deadline](./quick/260716-jve-onboarding-target-weight-deadline/) |
| 260718-4y0 | Frontend AI model switch (Settings → chat/completions) | 2026-07-18 | d9d4b79, 1b1ee38, 4d94245, bd1847a | [260718-4y0-frontend-model-switch](./quick/260718-4y0-frontend-model-switch/) |
| 260719-mq7 | Per-100g KBJU on ingredient edit (density ↔ portion) | 2026-07-19 | 9662f34, 4638154, 9b84404 | [260719-mq7-100](./quick/260719-mq7-100/) |
| fast | Toggle ingredient KBJU: На 100 г / На порцию | 2026-07-19 | cb77e5c | — |
| fast | Apply temperature 0.2 to all AI models | 2026-07-20 | 0e08c21 | — |
| 260721-rt6 | Settings: экспорт/импорт данных в JSON | 2026-07-21 | 9c629a7 | [260721-rt6-json](./quick/260721-rt6-json/) |
| 260721-ruz | Multi-photo: save all angles + slider on meal detail | 2026-07-21 | — | [260721-ruz-multi-photo-meal](./quick/260721-ruz-multi-photo-meal/) |
| fast | Add google/gemini-3.6-flash to AI model options | 2026-07-21 | a74d412 | — |
| fast | Widen onboarding numeric ranges (age/height/weight) | 2026-08-03 | 913a219 | — |
| fast | Remove onboarding slider range hint text | 2026-08-03 | ba4eea7 | — |
| fast | Count piece foods (rolls/wings) via itemCount, not one plate = 1 | 2026-08-03 | 48dde42 | — |
| 260803-3sp | Barcode scanner + Open Food Facts → diary meal | 2026-08-03 | — | [260803-3sp-barcode-scanner-with-open-food-facts-sca](./quick/260803-3sp-barcode-scanner-with-open-food-facts-sca/) |
| 260803-wue | Telegram auth mock (Auth.js-shaped client, /login, Settings) | 2026-08-03 | fb97749, 12752f5, 5521fa0, 7e42e0c | [260803-wue-telegram-auth-js](./quick/260803-wue-telegram-auth-js/) |
| 260804-3gx | One-time T-Bank yearly license + paywall (ai-app + ai-food) | 2026-08-04 | ai-app: 6f15ad3,cc016b3,af7d95b,281b401; ai-food: aced7b9 | [260804-3gx-one-time-t-bank-backend-ai-app-paywall-a](./quick/260804-3gx-one-time-t-bank-backend-ai-app-paywall-a/) |
| fast | Login quota: 50 guest + 100 after auth (sum 150) | 2026-08-04 | 9e935d1 | — |
| fast | Vercel SPA rewrite: hard reload on deep routes no longer 404 | 2026-08-04 | 617650e | — |
| 260806-tfe | Reject off-topic ask-about-dish and edit-meal inputs with user notification | 2026-08-06 | 45d0946, e866022, 5ab6654 | [260806-tfe-reject-off-topic-ask-about-dish-and-edit](./quick/260806-tfe-reject-off-topic-ask-about-dish-and-edit/) |
| 260806-u2q | Food prompts/model/temperature → ai-app `/v1/food/analyze|refine|ask` | 2026-08-06 | 8e8f081, aa20cb4, 1c97998, 9bd3312 | [260806-u2q-apps-ai-food-apps-ai-app-model-params](./quick/260806-u2q-apps-ai-food-apps-ai-app-model-params/) |
| 260806-vce | Unified /scan (Еда\|Штрихкод) + voice on textareas | 2026-08-06 | — | [260806-vce-scan-food-barcode-voice](./quick/260806-vce-scan-food-barcode-voice/) |
| 260807-itx | Android widgets: quick-action buttons matching AddFoodSheet | 2026-08-07 | aed20d5, d1b710b, c4961a9 | [260807-itx-android-widgets-quick-action-buttons-mat](./quick/260807-itx-android-widgets-quick-action-buttons-mat/) |
| 260807-j74 | Android: separate 1×1 home widgets per AddFood action | 2026-08-07 | 0a92316, 4d53b00 | [260807-j74-android-separate-1x1-home-widgets-per-ad](./quick/260807-j74-android-separate-1x1-home-widgets-per-ad/) |
| 260807-jk6 | Android: today KBJU progress rings widget | 2026-08-07 | 50b86a1, e01d474 | [260807-jk6-android-home-widget-today-kbju-progress-](./quick/260807-jk6-android-home-widget-today-kbju-progress-/) |

### Blockers/Concerns

- Spec drift between design doc and implementation (CONCERNS.md) — address during phase execution
- Diary persist may already exist in code — verify E2E in Phase 4

## Session Continuity

Last session: 2026-08-07T11:25:00Z
Stopped at: Completed quick task 260807-jk6
Resume file: None
Next: Device smoke-test KBJU widget (`pnpm cap:build`) or /gsd-plan-phase for Phase 2
