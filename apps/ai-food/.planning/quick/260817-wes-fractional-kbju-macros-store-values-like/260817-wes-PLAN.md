---
phase: 260817-wes
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ai-food/src/entities/meal/model/mealNutritionMath.ts
  - apps/ai-food/src/entities/meal/model/mealNutritionMath.test.ts
  - apps/ai-food/src/entities/meal/model/mealPortions.test.ts
  - apps/ai-food/src/entities/meal/index.ts
  - apps/ai-food/src/features/scan-barcode/api/mapOffProductToMeal.ts
  - apps/ai-food/src/features/scan-barcode/api/mapOffProductToMeal.test.ts
  - apps/ai-app/src/food/prompts.ts
  - apps/ai-food/src/features/analyze-food/api/parseNutritionXml.test.ts
  - apps/ai-food/src/shared/lib/formatters.ts
  - apps/ai-food/src/shared/lib/formatters.test.ts
  - apps/ai-food/src/shared/lib/useAnimatedNumber.ts
  - apps/ai-food/src/entities/meal/ui/FoodMacrosBadges.tsx
  - apps/ai-food/src/entities/nutrition/ui/NutritionRow.tsx
  - apps/ai-food/src/features/edit-meal/ui/MealSummaryEditor.tsx
  - apps/ai-food/src/pages/food-item-edit/ui/FoodItemEditPage.tsx
  - apps/ai-food/src/pages/manual-entry/ui/ManualEntryPage.tsx
  - apps/ai-food/src/features/manual-entry/ui/ManualCompositionDraft.tsx
  - apps/ai-food/src/features/manual-entry/model/buildManualMeal.test.ts
  - apps/ai-food/src/features/scan-barcode/ui/BarcodeProductConfirm.tsx
  - apps/ai-food/src/features/scan-barcode/api/fetchProductByBarcode.ts
autonomous: true
requirements:
  - QUICK-260817-wes

estimate:
  tokens: 42000
  raw_tokens: 42000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "Дневник может хранить 5.5 г белка (и другие БЖУ/клетчатку с одним знаком) без округления до целого при сохранении, синке и правке"
    - "Масштаб порций, граммов и правка соотношения БЖУ оставляют десятичные: 5.5 × 2 → 11, а не 6 × 2"
    - "Промпты analyze/refine в apps/ai-app просят одну десятичную (пример 5.5), а не только целые КБЖУ"
    - "Парсер XML принимает 5.5 как число, не отбрасывая дробную часть"
    - "В карточке/бейджах/редакторе макросы показываются как 5.5 без хвостового .0; ккал в списках по-прежнему целые"
    - "Старые целые значения в localStorage остаются валидными числами — миграции дневника нет"
  artifacts:
    - path: apps/ai-food/src/entities/meal/model/mealNutritionMath.ts
      provides: "sanitizeNutrient snaps to tenths like sanitizeGrams; parseNutrientInput for editors"
    - path: apps/ai-app/src/food/prompts.ts
      provides: "analyze/refine prompts request 1 decimal macros; few-shot 5.5"
    - path: apps/ai-food/src/shared/lib/formatters.ts
      provides: "formatMacro shows tenths, drops trailing .0; formatCalories stays whole kcal"
  key_links:
    - from: sanitizeNutrient
      to: scalePortionNutrientsByGrams / scaleMealByPortionRatio / scaleItemsNutrient / sanitizeFoodItemPatch
      via: "all nutrient writes go through tenths snap"
    - from: MealSummaryEditor parseNutrient
      to: updateMealNutrition → scaleItemsNutrient
      via: "ratio edit keeps tenths on items and totals"
    - from: apps/ai-app/src/food/prompts.ts
      to: parseNutritionXml
      via: "model may emit 5.5; Number() parse already accepts decimals"
---

<objective>
Хранить и считать КБЖУ как десятичные (5.5 г белка), запрашивать ту же точность у ИИ и не терять дроби при смене порций, граммов и соотношения БЖУ.

Purpose: Сейчас sanitizeNutrient, редакторы и formatMacro режут макросы до целых, поэтому 5.5 невозможно ни сохранить, ни увидеть.

Output: tenths-sanitize + AI prompts + UI/editors/barcode. D-wes-01 (store tenths), D-wes-02 (AI decimals), D-wes-03 (scale/ratio), D-wes-04 (display), D-wes-05 (editors).
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/ai-food/src/entities/meal/model/mealNutritionMath.ts
@apps/ai-food/src/entities/meal/model/mealGrams.ts
@apps/ai-food/src/entities/meal/model/mealPortions.ts
@apps/ai-food/src/shared/lib/formatters.ts
@apps/ai-food/src/shared/lib/useAnimatedNumber.ts
@apps/ai-app/src/food/prompts.ts
@apps/ai-food/src/features/analyze-food/api/parseNutritionXml.ts
@.cursor/rules/ai-gateway.mdc
@.cursor/rules/index-reexports.mdc

## Locked precision (D-wes-01 … D-wes-05)

- Protein, fat, carbs, fiber, calories: snap to 1 decimal on sanitize/scale/edit (same tenths formula as sanitizeGrams).
- Display: macros show tenths and drop trailing .0 (same style as formatItemGrams). kcal in formatCalories / meal-card calorie digit stay whole numbers.
- Daily header (NutritionSummaryCard), Android widgets, onboarding calculateTargets, Settings daily goals: leave whole-number display/goals as they are.
- Prisma Meal.totalCalories is already Float; items is Json. mealPayloadSchema uses z.number() not int. Do not add a Prisma migration or diary JSON rewrite. Existing integer meals stay valid numbers.
- healthiness stays integer 1–10. Do not change that wording in prompts.

## Root cause (confirmed)

1. sanitizeNutrient uses whole-number snap, so every grams/portion/ratio path (nutrientsFromPer100, scalePortionNutrientsByGrams, scaleItemsNutrient, scaleMealByPortionRatio, sanitizeFoodItemPatch, buildManualMeal) collapses 5.5 → 6 or 5.
2. Editors (MealSummaryEditor.parseNutrient, FoodItemEditPage value, ManualEntryPage, ManualCompositionDraft) snap inputs to whole numbers and display whole numbers.
3. formatMacro and useAnimatedNumber snap display to whole numbers, so even a stored 5.5 would render as 6.
4. mapOffProductToMeal.scale uses whole-number snap; OFF per-100 already has tenths (6.3) and then loses them.
5. AI prompts say «число» with integer few-shots (protein 4 / 28). Parser parseNumber already uses Number() and accepts 5.5.

## Do not change

- apps/ai-app/prisma/schema.prisma (already Float)
- Onboarding calculateTargets / Settings parseTargetValue (daily goals stay whole)
- NutritionSummaryCard / Android widget integer labels
- formatCalories whole-kcal strings
- Client must not send model/messages/temperature (prompts only in apps/ai-app)
- pages/scan, compress, auth, billing
- New npm packages
- Do not export new helpers from a deep file path to other slices — barrel via entities/meal/index.ts or shared/lib/index.ts (already exports formatters / useAnimatedNumber)
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>End-to-end tenths macros — sanitize, scale, barcode</name>
  <files>apps/ai-food/src/entities/meal/model/mealNutritionMath.ts, apps/ai-food/src/entities/meal/model/mealNutritionMath.test.ts, apps/ai-food/src/entities/meal/model/mealPortions.test.ts, apps/ai-food/src/entities/meal/index.ts, apps/ai-food/src/features/scan-barcode/api/mapOffProductToMeal.ts, apps/ai-food/src/features/scan-barcode/api/mapOffProductToMeal.test.ts</files>
  <reversibility rating="reversible">Tenths snap is local to sanitizeNutrient; old integers remain valid numbers.</reversibility>
  <behavior>
    - sanitizeNutrient(5.5) is 5.5; sanitizeNutrient(5.54) is 5.5; sanitizeNutrient(2.5) is 2.5; non-finite → 0; negatives → 0 (D-wes-01)
    - nutrientsFromPer100({ protein: 10, fat: 5, fiber: 2, calories: 250, carbs: 20 }, 50) keeps fat 2.5 and fiber 1 (not 3 and 1) (D-wes-03)
    - nutrientsFromPer100 of 10 protein / 100g at 55g → protein 5.5 (D-wes-03)
    - scalePortionNutrientsByGrams({ protein: 5.5, calories: 90, carbs: 14, fat: 2, fiber: 0 }, 125, 250) → protein 11 (D-wes-03)
    - scaleItemsNutrient one item protein 5.5 target 11 → 11; two items 5.5+5.5 target 8.2 redistributes with tenths and finite numbers (D-wes-03)
    - scaleMealByPortionRatio of an item with protein 5.5 and ratio 2 → protein 11, grams scaled via existing sanitizeGrams (D-wes-03)
    - scaleOffProductToItem Nutella 100g keeps protein 6.3 / carbs 57.5 / fat 30.9; 50g calories 269.5 (D-wes-01)
  </behavior>
  <action>
    Change sanitizeNutrient in mealNutritionMath.ts so it uses the same tenths snap as sanitizeGrams in mealGrams.ts: finite check, floor at 0, one decimal. Do not keep whole-number snap. Calories use the same tenths snap as protein/fat/carbs/fiber (D-wes-01). Downstream helpers already call sanitizeNutrient — do not add a second rounder in scalePortionNutrientsByGrams, scaleItemsNutrient, nutrientsFromPer100, nutrientsPer100FromPortion, or sanitizeFoodItemPatch.

    Add parseNutrientInput(raw: string): number that replaces comma with dot, then sanitizeNutrient. Export parseNutrientInput from entities/meal/index.ts next to sanitizeNutrient (index-reexports.mdc). Other slices must import it from @/entities/meal, not from mealNutritionMath.ts.

    Rewrite mealNutritionMath.test.ts expectations that assumed whole-number snap (fat 2.5→3, fiber 1.6→2, per-100 round-trip ±1). Add the behavior cases above. Add a scaleItemsNutrient test (import it). Tighten per-100 round-trip at grams=80: recovered density should be within 0.2 of the original sample, not ±1.

    Extend mealPortions.test.ts with one item protein 5.5, grams 50, ratio 2 → protein 11 and grams 100 (D-wes-03). Keep existing 1.5× integer cases.

    In mapOffProductToMeal.ts replace the whole-number scale helper with sanitizeNutrient((per100 * grams) / 100) imported from @/entities/meal. Keep grams as Math.max(1, sanitizeGrams(grams)) so barcode portions can be 32.5 g. Update mapOffProductToMeal.test.ts: 100 g Nutella keeps OFF tenths (6.3 / 57.5 / 30.9); 50 g calories 269.5 not 270 (D-wes-01).
  </action>
  <verify>
    <automated>cd apps/ai-food; pnpm exec vitest run src/entities/meal/model/mealNutritionMath.test.ts src/entities/meal/model/mealPortions.test.ts src/features/scan-barcode/api/mapOffProductToMeal.test.ts --reporter=dot</automated>
  </verify>
  <done>
    5.5 survives sanitize, per-100, portion ratio, nutrient-ratio redistribution, and barcode scale. parseNutrientInput is exported from entities/meal. D-wes-01 D-wes-03.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Ask AI for one-decimal macros; accept 5.5 in XML</name>
  <files>apps/ai-app/src/food/prompts.ts, apps/ai-food/src/features/analyze-food/api/parseNutritionXml.test.ts</files>
  <reversibility rating="reversible">Prompt wording only; parser already Number()-parses decimals.</reversibility>
  <behavior>
    - parseNutritionXml of an analysis with top-level and item protein 5.5 (and comma 5,5 if already supported) yields protein 5.5, not 5 (D-wes-02)
    - Prompts in apps/ai-app/src/food/prompts.ts tell the model to use one decimal for calories/protein/carbs/fat/fiber and include 5.5 in EXAMPLE_C_XML (D-wes-02)
  </behavior>
  <action>
    Edit apps/ai-app/src/food/prompts.ts only (ai-gateway.mdc: food prompts live here, not in the client). Add one shared bullet used by LEGACY_SYSTEM_PROMPT, LEGACY_TEXT_SYSTEM_PROMPT, GEMINI_SYSTEM_PROMPT, and SYSTEM_PROMPT_BASE (refine JSON): for calories/protein/carbs/fat/fiber output one decimal when not a whole number (example 5.5), never force whole numbers; 0 if none. Keep healthiness as integer 1–10 (D-wes-02).

    In LEGACY_NUTRITION_XML_SCHEMA, GEMINI_NUTRITION_XML_SCHEMA, and the refine JSON field comments, describe those five nutrient fields as numbers that may have one decimal (example 5.5), not whole-only.

    Change EXAMPLE_C_XML yogurt protein from 4 to 5.5 in both the top-level tag and the single item so few-shot demonstrates a fraction. Leave EXAMPLE_A burger integers as a mixed example.

    Do not add model/messages/temperature to the client. Do not change parseNutritionXml.ts unless a test proves Number() drops decimals (it should not — parseNumber already replaces comma with dot).

    Add a parseNutritionXml.test.ts case: XML with foodName, calories 90, protein 5.5, carbs 14, fat 2, fiber 0, one item mirroring those values and grams 125 → parsed.protein === 5.5 and items[0].protein === 5.5 (D-wes-02).
  </action>
  <verify>
    <automated>cd apps/ai-food; pnpm exec vitest run src/features/analyze-food/api/parseNutritionXml.test.ts --reporter=dot</automated>
  </verify>
  <done>
    Gateway prompts request one-decimal macros with a 5.5 few-shot. Parser test locks 5.5. Client still sends clean bodies. D-wes-02.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Show and edit tenths in UI, manual entry, barcode confirm</name>
  <files>apps/ai-food/src/shared/lib/formatters.ts, apps/ai-food/src/shared/lib/formatters.test.ts, apps/ai-food/src/shared/lib/useAnimatedNumber.ts, apps/ai-food/src/entities/meal/ui/FoodMacrosBadges.tsx, apps/ai-food/src/entities/nutrition/ui/NutritionRow.tsx, apps/ai-food/src/features/edit-meal/ui/MealSummaryEditor.tsx, apps/ai-food/src/pages/food-item-edit/ui/FoodItemEditPage.tsx, apps/ai-food/src/pages/manual-entry/ui/ManualEntryPage.tsx, apps/ai-food/src/features/manual-entry/ui/ManualCompositionDraft.tsx, apps/ai-food/src/features/manual-entry/model/buildManualMeal.test.ts, apps/ai-food/src/features/scan-barcode/ui/BarcodeProductConfirm.tsx, apps/ai-food/src/features/scan-barcode/api/fetchProductByBarcode.ts</files>
  <reversibility rating="reversible">Display/input only; storage contract already tenths from task 1.</reversibility>
  <behavior>
    - formatMacro(5.5) is "5.5 г"; formatMacro(35) is "35 г"; formatMacro(35.9) is "35.9 г" (D-wes-04)
    - formatCalories(320.7) stays "321 ккал" (whole kcal UX unchanged) (D-wes-04)
    - buildManualMeal with protein 5.5 persists 5.5 on the FoodItem (D-wes-01)
  </behavior>
  <action>
    formatMacro: format like formatItemGrams (tenths, drop trailing .0) then append " г". Keep the helper inside formatters.ts — do not import entities/meal from shared. formatCalories stays whole kcal (D-wes-04). Update formatters.test.ts accordingly.

    useAnimatedNumber: add optional decimals (default 0) so NutritionSummaryCard keeps whole daily totals. Snap the displayed value to that many decimals. FoodMacrosBadges: calories hook decimals 0; protein/fat/carbs/fiber and MacroDigits decimals 1. Bump compact MacroDigits maxDigits from 3 to 4 so "12.5" fits (D-wes-04).

    NutritionRow: show tenths via the same drop-trailing-zero pattern as formatItemGrams (inline or a tiny local helper), not whole-number snap (D-wes-04).

    Editors — replace whole-number parse and whole-number input value with parseNutrientInput from @/entities/meal and formatItemGrams (already in meal) or the same tenths string for the value. Add step={0.1} on nutrient type=number inputs. Files: MealSummaryEditor (parseNutrient + calories/macro value), FoodItemEditPage (patchNumber/patchPer100 + value), ManualEntryPage (parseNutrient), ManualCompositionDraft (onChange for non-grams fields). Grams fields stay sanitizeGrams / parseGrams as today (D-wes-05).

    BarcodeProductConfirm: grams state uses sanitizeGrams (allow 32.5), not whole-number snap; input step 0.1. fetchProductByBarcode parseServingGrams: return sanitizeGrams of the parsed number instead of whole grams so "32.5 g" survives (import sanitizeGrams from @/entities/meal) (D-wes-03).

    Add buildManualMeal.test.ts case: protein 5.5 on empty composition persists items[0].protein 5.5 (D-wes-01).
  </action>
  <verify>
    <automated>cd apps/ai-food; pnpm exec vitest run src/shared/lib/formatters.test.ts src/features/manual-entry/model/buildManualMeal.test.ts src/entities/meal/model/mealNutritionMath.test.ts --reporter=dot</automated>
  </verify>
  <done>
    Macros display and edit as tenths (5.5). kcal strings stay whole. Daily header animation default remains whole. Barcode grams/macros keep tenths. D-wes-04 D-wes-05.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| AI gateway → client XML/JSON | Untrusted model output already parsed as numbers |
| Client diary → POST /user/meals/sync | Logged-in meal JSON including items[] macros |
| User nutrient inputs | Editors accept free numeric text |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-wes-01 | Tampering | sanitizeNutrient / parseNutrientInput | medium | mitigate | Keep non-finite → 0 and floor at 0 so NaN/Infinity/negatives cannot poison totals; tenths snap bounds float noise |
| T-wes-02 | Tampering | parseNutritionXml | low | accept | Parser already requires finite numbers; decimals do not enlarge the attack surface vs integers |
| T-wes-03 | Information Disclosure | food prompts | low | accept | One extra decimal in macros is not sensitive beyond existing nutrition payload |
| T-wes-04 | Denial of Service | huge float inputs | low | accept | Existing UI min=0 and diary size limits; no new unbounded arrays |
| T-wes-SC | Tampering | npm/pip/cargo installs | low | accept | No new packages in this plan |
</threat_model>

<verification>
cd apps/ai-food; pnpm exec vitest run src/entities/meal/model/mealNutritionMath.test.ts src/entities/meal/model/mealPortions.test.ts src/features/scan-barcode/api/mapOffProductToMeal.test.ts src/features/analyze-food/api/parseNutritionXml.test.ts src/shared/lib/formatters.test.ts src/features/manual-entry/model/buildManualMeal.test.ts --reporter=dot
</verification>

<success_criteria>
- sanitizeNutrient(5.5) === 5.5 and portion/ratio/barcode scale keep tenths
- EXAMPLE_C_XML and analyze/refine prompts request one decimal; XML 5.5 parses as 5.5
- formatMacro(5.5) === "5.5 г"; editors can enter 5.5; formatCalories still whole kcal
- No Prisma migration; no diary JSON rewrite
</success_criteria>

<output>
Create `.planning/quick/260817-wes-fractional-kbju-macros-store-values-like/260817-wes-01-SUMMARY.md` when done
</output>
