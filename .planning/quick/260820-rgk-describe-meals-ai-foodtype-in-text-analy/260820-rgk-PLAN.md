---
phase: 260820-rgk-describe-meals-ai-foodtype-in-text-analy
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ai-app/src/food/prompts.ts
  - apps/ai-food/src/shared/types/index.ts
  - apps/ai-food/src/features/analyze-food/api/parseNutritionXml.ts
  - apps/ai-food/src/features/analyze-food/api/parseNutritionXml.test.ts
  - apps/ai-food/src/features/save-meal/model/applyAnalyzeResultToMeal.ts
  - apps/ai-app/prisma/schema.prisma
  - apps/ai-app/prisma/migrations/20260820190000_add_meal_food_type/migration.sql
  - apps/ai-app/src/lib/mealSync.ts
  - apps/ai-app/src/routes/userMeals.sync.test.ts
  - apps/ai-food/src/entities/meal/model/mealFoodType.ts
  - apps/ai-food/src/entities/meal/model/mealFoodType.test.ts
  - apps/ai-food/src/entities/meal/ui/MealCard.tsx
  - apps/ai-food/src/pages/meal-detail/ui/MealDetailPage.tsx
autonomous: true
requirements:
  - D-01
  - D-02
  - D-03

estimate:
  tokens: 30000
  raw_tokens: 30000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "A meal created with «Описать» receives a validated foodType from the existing text-analysis XML, persists it in the local diary, and keeps it after sync (D-01, D-03)."
    - "Photo-based analyze paths retain their current XML schema and do not require foodType (D-01)."
    - "A ready text-only meal with a known foodType has a pastel rounded Lucide thumbnail in both its diary card and details; image meals retain photo UI (D-02, D-03)."
  artifacts:
    - path: apps/ai-food/src/shared/types/index.ts
      provides: "Shared FoodType union plus optional foodType fields on NutritionResult and Meal."
    - path: apps/ai-app/src/food/prompts.ts
      provides: "Text-only analysis schema and prompt instruction requesting exactly one supported food type."
    - path: apps/ai-app/src/lib/mealSync.ts
      provides: "Validated LWW round-trip of the optional meal foodType."
    - path: apps/ai-food/src/entities/meal/model/mealFoodType.ts
      provides: "Single source of food-type labels, Lucide icons, and pastel tile classes."
  key_links:
    - from: TEXT_SYSTEM_PROMPT
      to: parseNutritionXml and NutritionResult.foodType
      via: "The text XML emits one constrained <foodType> tag that the client accepts only when it is in the shared union (D-01)."
    - from: applyAnalyzeResultToMeal
      to: Meal.foodType and diary persistence
      via: "The final text-analysis result copies its classification into the saved meal (D-03)."
    - from: mealFoodTypeUi
      to: MealCard and MealDetailPage
      via: "Both text-only presentation points use the same accessible icon, label, and Tailwind class mapping (D-02, D-03)."
---

<objective>
Add a text-analysis-only food classification that travels from the existing gateway XML response into the synced meal model, then render it as a shared pastel Lucide thumbnail for text-only meals (D-01, D-02, D-03).

Purpose: Give meals created through «Описать» a meaningful, consistent visual identity without adding a classification request or changing photo flows.
Output: Text XML foodType contract, local/server meal persistence, and reusable thumbnail mapping used by diary and meal details.
</objective>

<execution_context>
@C:/Users/mk/.cursor/gsd-core/workflows/execute-plan.md
@C:/Users/mk/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/260820-rgk-describe-meals-ai-foodtype-in-text-analy/260820-rgk-CONTEXT.md
@apps/ai-app/src/food/prompts.ts
@apps/ai-food/src/features/analyze-food/api/parseNutritionXml.ts
@apps/ai-food/src/features/save-meal/model/applyAnalyzeResultToMeal.ts
@apps/ai-app/src/lib/mealSync.ts
@apps/ai-food/src/features/friends/model/mealDaypart.ts
@apps/ai-food/src/features/friends/ui/FriendProfileMeals.tsx

## Locked decisions

- D-01: Add foodType to the existing text-analyze XML only; no classify endpoint and no foodType requirement for vision, camera, or gallery analysis.
- D-02: Match the friends MealThumb visual language: rounded-2xl pastel bg-*-100 tile and h-7 w-7 Lucide outline icon with text-*-700; never emoji.
- D-03: Use the mapped thumbnail only for describe/text-only meals without imageUri after the AI result supplies foodType; photo thumbnails remain unchanged and foodType is synced as meal metadata.
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>End-to-end text XML classification into a persisted local meal</name>
  <files>apps/ai-app/src/food/prompts.ts, apps/ai-food/src/shared/types/index.ts, apps/ai-food/src/features/analyze-food/api/parseNutritionXml.ts, apps/ai-food/src/features/analyze-food/api/parseNutritionXml.test.ts, apps/ai-food/src/features/save-meal/model/applyAnalyzeResultToMeal.ts</files>
  <behavior>
    - A complete text-analysis XML response with an allowed foodType yields that value in NutritionResult and the ready Meal written by applyAnalyzeResultToMeal.
    - Missing foodType remains valid for existing/legacy XML and leaves Meal.foodType optional.
    - An unsupported, empty, or malformed foodType is excluded rather than becoming untyped persisted data.
    - selectAnalyzeSystemPrompt(false) instructs the model to include foodType, while selectAnalyzeSystemPrompt(true) retains the vision schema without that tag or requirement.
  </behavior>
  <action>
    Per D-01, define one shared finite FoodType union in shared types for the visual categories: salad, soup, sandwich, pizza, sushi, burger, bowl, main, snack, dessert, and drink. Add optional foodType to NutritionResult and Meal so legacy meals and analysis results remain readable.

    Split the current reusable XML schema in prompts.ts into a vision schema and a text schema. Keep the vision schema and VISION_SYSTEM_PROMPT semantically unchanged. Extend only the text schema used by TEXT_SYSTEM_PROMPT with a top-level foodType tag and an explicit allowed-enum instruction: the text model must choose one category that best describes the whole meal, not an ingredient; use main for an uncategorized hot/main dish. Do not add foodType to refine JSON or any vision user prompt.

    Extend partial and final XML parsing to read only a closed top-level foodType tag, normalize it through the shared union, and attach it only when supported. Preserve the current tolerant behavior for legacy responses that omit the tag. Update the XML serializer used in parser tests when the result has foodType. Copy result.foodType into both branches of applyAnalyzeResultToMeal so final text analysis persists the classification in the diary, without fabricating a value for manual, photo, or old meals.

    Add focused Vitest cases before implementation for text XML parsing, omission/invalid-value compatibility, and serialize/parse round-trip. Use the existing parser test fixture style; do not introduce a new parser dependency or another gateway endpoint.
  </action>
  <verify>
    <automated>pnpm --filter ai-food test -- src/features/analyze-food/api/parseNutritionXml.test.ts &amp;&amp; pnpm --filter ai-food type-check &amp;&amp; pnpm --filter openrouter-gateway type-check &amp;&amp; node -e "const fs=require('fs'); const s=fs.readFileSync('apps/ai-app/src/food/prompts.ts','utf8'); const text=s.slice(s.indexOf('const TEXT_SYSTEM_PROMPT'),s.indexOf('/** Short fixed user text')); const vision=s.slice(s.indexOf('const VISION_SYSTEM_PROMPT'),s.indexOf('const TEXT_SYSTEM_PROMPT')); if(!text.includes('foodType') || vision.includes('foodType')) process.exit(1);"</automated>
  </verify>
  <done>
    The existing text analyze response accepts one supported foodType and persists it on the completed local meal; omitted values remain compatible. Camera/gallery XML and prompt requirements do not contain foodType (D-01).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Round-trip foodType through authenticated diary sync</name>
  <files>apps/ai-app/prisma/schema.prisma, apps/ai-app/prisma/migrations/20260820190000_add_meal_food_type/migration.sql, apps/ai-app/src/lib/mealSync.ts, apps/ai-app/src/routes/userMeals.sync.test.ts</files>
  <behavior>
    - POST /user/meals/sync accepts an optional valid foodType, writes it to the Meal row, and returns it in the merged snapshot.
    - Old payloads without foodType remain valid and read back without the optional property.
    - Existing LWW and user-scoping behavior remains unchanged while foodType is preserved as metadata.
  </behavior>
  <action>
    Per D-03, add nullable Meal.foodType to the Prisma model and create the named SQL migration that adds the nullable column without backfilling legacy data. Regenerate Prisma artifacts through the repository's existing Prisma workflow when executing the migration change; do not store classification in image URI fields or photo blobs.

    Extend mealPayloadSchema, MealRow, row-to-payload conversion, and every create/update write path in mealSync.ts with optional foodType. Constrain the transport field to the same finite values defined by the client contract (or an equivalent server-side Zod enum kept explicitly synchronized), rejecting unsupported payload values rather than persisting arbitrary strings. Preserve null/undefined handling so a legacy client neither fails nor overwrites the field with a synthetic value.

    Add an API sync test that posts a meal with foodType, asserts the Prisma write includes it, and asserts the response returns it. Update the activeRow fixture with the nullable field so the mocked row accurately represents the migrated schema. No new package installation is needed.
  </action>
  <verify>
    <automated>pnpm --filter openrouter-gateway test -- src/routes/userMeals.sync.test.ts &amp;&amp; pnpm --filter openrouter-gateway type-check &amp;&amp; pnpm --filter openrouter-gateway prisma:generate</automated>
  </verify>
  <done>
    foodType is optional, validated metadata in the authenticated meal sync contract, Prisma schema, migration, writes, and snapshot responses; photos still sync only as URI stubs (D-03).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Render shared pastel food-type thumbnails for text-only meals</name>
  <files>apps/ai-food/src/entities/meal/model/mealFoodType.ts, apps/ai-food/src/entities/meal/model/mealFoodType.test.ts, apps/ai-food/src/entities/meal/ui/MealCard.tsx, apps/ai-food/src/pages/meal-detail/ui/MealDetailPage.tsx</files>
  <behavior>
    - Each supported FoodType resolves to a Russian accessible label, a Lucide icon, a bg-*-100 tile class, and a text-*-700 icon class.
    - A ready MealCard without a resolved photo and with foodType renders that mapping; an image-backed meal still renders its image.
    - MealDetailPage keeps MealPhotoSlider for photo meals and shows the mapped text-only thumbnail before the summary only when there are no image URIs and foodType exists.
    - Meals with no image and no foodType retain the existing generic Utensils fallback.
  </behavior>
  <action>
    Create mealFoodType.ts beside meal model helpers. It must map every shared FoodType to a Russian label plus LucideIcon, `bg-*-100` tile class, and `text-*-700` icon class. Use visually distinct food-appropriate Lucide icons and keep the mapping self-contained; mirror friends mealDaypartUi's typed Record pattern rather than copying friend daypart rules or changing friend components. Add unit coverage that every supported type maps to an icon, label, and the required pastel/foreground class families.

    In MealCard, select the food-type thumbnail only for ready, non-error meals where resolveMealImageUris(meal) is empty and meal.foodType resolves. Render it with the friends geometry: flex 16×16 centered rounded-2xl tile and h-7 w-7 icon, with the Russian label exposed to assistive technology. Preserve loader, error, generic Utensils, multi-photo count, and real-photo branches unchanged.

    In MealDetailPage, preserve the existing photo slider whenever imageUris is non-empty. When it is empty and foodType resolves, render the same mapped 16×16 pastel Lucide thumb near the summary as the detail thumbnail, with its accessible label. Do not display a generic replacement for legacy/manual meals lacking foodType.
  </action>
  <verify>
    <automated>pnpm --filter ai-food test -- src/entities/meal/model/mealFoodType.test.ts &amp;&amp; pnpm --filter ai-food type-check &amp;&amp; node -e "const fs=require('fs'); const card=fs.readFileSync('apps/ai-food/src/entities/meal/ui/MealCard.tsx','utf8'); const detail=fs.readFileSync('apps/ai-food/src/pages/meal-detail/ui/MealDetailPage.tsx','utf8'); if(!card.includes('meal.foodType') || !card.includes('rounded-2xl') || !detail.includes('mealFoodType')) process.exit(1);"</automated>
    <human-check>Create one meal through «Описать» and one via camera. The described meal shows its colored Lucide food-type tile in the home card and in details. The camera meal keeps its photo thumbnail/slider. A legacy text meal with no foodType keeps its generic fallback without an error.</human-check>
  </verify>
  <done>
    Text-only meals classified by AI have consistent pastel Lucide thumbnails in card and detail views; photo presentation and friends daypart UI are unchanged (D-02, D-03).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| OpenRouter text XML → client parser | Model-produced classification is untrusted until constrained to the supported enum. |
| Client diary → authenticated meal sync | Offline client metadata crosses to a user-scoped LWW database record. |
| Meal metadata → UI icon map | Persisted foodType selects a local icon and CSS classes, never arbitrary markup. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260820-01 | Tampering | Text XML foodType parser | medium | mitigate | Normalize and accept only the finite shared food-type union before saving it to Meal. |
| T-260820-02 | Tampering | POST /user/meals/sync payload | medium | mitigate | Validate foodType with a server enum and retain existing JWT user scoping and LWW writes. |
| T-260820-03 | Elevation of privilege | foodType UI selection | low | mitigate | Map enum values to locally imported Lucide components and fixed Tailwind classes; never render model-supplied component names or classes. |
| T-260820-04 | Information disclosure | Meal sync | low | accept | The new field is non-sensitive meal metadata under the existing authenticated sync contract; image blobs remain device-only. |
| T-260820-SC | Tampering | npm/pip/cargo installs | low | accept | No packages are added in this plan. |
</threat_model>

<verification>
- `pnpm --filter ai-food test -- src/features/analyze-food/api/parseNutritionXml.test.ts src/entities/meal/model/mealFoodType.test.ts`
- `pnpm --filter openrouter-gateway test -- src/routes/userMeals.sync.test.ts`
- `pnpm --filter ai-food type-check && pnpm --filter openrouter-gateway type-check`
- Apply the migration and run the gateway Prisma generation command before integration testing sync.
- Manual: compare a described meal, a photo meal, and a legacy no-photo meal without foodType.
</verification>

<success_criteria>
- Existing text analysis returns one validated foodType with no additional API call, while vision analysis has no corresponding requirement (D-01).
- The text-only classification is retained in the local diary and across authenticated meal synchronization (D-03).
- Ready text-only classified meals use a rounded pastel Lucide tile in MealCard and meal details; photo and legacy fallback behavior remain intact (D-02, D-03).
</success_criteria>

<output>
Create `.planning/quick/260820-rgk-describe-meals-ai-foodtype-in-text-analy/260820-rgk-SUMMARY.md` when execution completes.
</output>
