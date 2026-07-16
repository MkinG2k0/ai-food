---
phase: quick-260716-iqm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/shared-types/src/index.ts
  - apps/mobile/src/features/analyze-food/api/nutritionResultSchema.ts
  - apps/mobile/src/features/analyze-food/api/nutritionResultSchema.test.ts
  - apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts
  - apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts
  - apps/mobile/src/features/analyze-food/api/refineMealApi.ts
  - apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts
  - apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.test.ts
  - apps/mobile/src/features/onboarding/model/defaultMicronutrientTargets.ts
  - apps/mobile/src/features/onboarding/model/useProfileStore.ts
  - apps/mobile/src/features/onboarding/model/useOnboarding.ts
  - apps/mobile/src/features/onboarding/index.ts
  - apps/mobile/src/features/stats/model/getWeeklyMicronutrientSeries.ts
  - apps/mobile/src/features/stats/model/getWeeklyMicronutrientSeries.test.ts
  - apps/mobile/src/features/stats/ui/WeeklyMicronutrientsChart.tsx
  - apps/mobile/src/pages/stats/ui/StatsPage.tsx
  - apps/mobile/src/entities/nutrition/ui/MicronutrientsBadges.tsx
  - apps/mobile/src/entities/nutrition/ui/MicronutrientsBadges.test.tsx
  - apps/mobile/src/entities/nutrition/model/micronutrientLabels.ts
autonomous: true
requirements:
  - QUICK-iqm

must_haves:
  truths:
    - "Analyze/refine return micronutrient amounts in mg/µg (not qualitative buckets); badges show amount + unit."
    - "After onboarding finish (and setProfile), personal daily micronutrient norms are stored on the profile (AI Gateway, with local RDA fallback)."
    - "Weekly vitamins chart shows daily-average intake vs personal daily norm as a progress bar with Russian unit labels."
    - "Legacy meals with only qualitative level contribute 0 to chart/badges without crashing."
  artifacts:
    - packages/shared-types/src/index.ts
    - apps/mobile/src/features/analyze-food/api/nutritionResultSchema.ts
    - apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts
    - apps/mobile/src/features/onboarding/model/defaultMicronutrientTargets.ts
    - apps/mobile/src/features/onboarding/model/useProfileStore.ts
    - apps/mobile/src/features/stats/model/getWeeklyMicronutrientSeries.ts
    - apps/mobile/src/features/stats/ui/WeeklyMicronutrientsChart.tsx
    - apps/mobile/src/entities/nutrition/ui/MicronutrientsBadges.tsx
  key_links:
    - "MICRONUTRIENTS_PROMPT_RULE + normalizeMicronutrients → NutritionResult/Meal.micronutrients amount+unit"
    - "useOnboarding.finish / setProfile → micronutrientTargetsApi → useProfileStore.micronutrientTargets"
    - "StatsPage micronutrientTargets → WeeklyMicronutrientsChart → getWeeklyMicronutrientSeries dailyAvg vs norm"
---

<objective>
Replace qualitative micronutrient levels (много/средне/мало) with quantitative amounts (мг/мкг), compute personal daily norms from onboarding profile via client AI Gateway, and show intake vs norm on the weekly vitamins chart.

Purpose: User wants measurable vitamin/mineral tracking against personal RDA-like targets from onboarding, not frequency of qualitative buckets.

Output: Quantitative MicronutrientEstimate; persisted MicronutrientTargets; analyze/refine prompts+validation; chart progress bars; badges with amounts.
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@packages/shared-types/src/index.ts
@apps/mobile/src/features/analyze-food/api/nutritionResultSchema.ts
@apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts
@apps/mobile/src/features/analyze-food/api/refineMealApi.ts
@apps/mobile/src/features/onboarding/model/useProfileStore.ts
@apps/mobile/src/features/onboarding/model/useOnboarding.ts
@apps/mobile/src/features/stats/model/getWeeklyMicronutrientSeries.ts
@apps/mobile/src/features/stats/ui/WeeklyMicronutrientsChart.tsx
@apps/mobile/src/pages/stats/ui/StatsPage.tsx
@apps/mobile/src/entities/nutrition/ui/MicronutrientsBadges.tsx
@apps/mobile/src/entities/nutrition/model/micronutrientLabels.ts

## Locked decisions (this quick task)

- **D-01 Quantitative estimate:** `MicronutrientEstimate` becomes `{ id: MicronutrientId; amount: number; unit: MicronutrientUnit }` where `MicronutrientUnit = 'mg' | 'µg'`. Remove `MicronutrientLevel` / qualitative `level` from the active type.
- **D-02 Fixed unit map:** Canonical units by id (AI must match; normalize coerces unit from map if amount valid):
  - `µg`: vitaminA, vitaminD, vitaminB12, folate
  - `mg`: vitaminC, iron, calcium, magnesium
  Export `MICRONUTRIENT_UNITS: Record<MicronutrientId, MicronutrientUnit>` from shared-types (or nutrition schema + re-export). Never use grams for vitamins.
- **D-03 Legacy meals:** Persisted rows with only `level` (no numeric `amount`) are ignored by normalize/chart/badges — treat as empty for that nutrient. No migration rewrite of diary storage required.
- **D-04 Targets type:** `MicronutrientTarget = { id; amount; unit }` and `MicronutrientTargets = MicronutrientEstimate[]` (exactly the 8 ids) OR a `Record<MicronutrientId, { amount; unit }>`. Prefer array of 8 for symmetry with meal micronutrients. Persist on profile store as `micronutrientTargets: MicronutrientEstimate[] | null`.
- **D-05 AI norms:** New `features/onboarding/api/micronutrientTargetsApi.ts` posts profile summary to the same client AI Gateway pattern as `analyzeFoodApi` (`VITE_AI_GATEWAY_URL` + `VITE_AI_GATEWAY_API_KEY`, `gpt-4.1-mini`, `response_format: json_object`). Returns daily targets for all 8 ids in correct units. On failure/invalid JSON → `defaultMicronutrientTargets()` (adult RDA-like defaults; sex-aware iron/calcium if cheap from gender).
- **D-06 When to fetch norms:** Call after `setProfile` in `useOnboarding.finish` (await AI, then `setMicronutrientTargets`). Also refresh when Settings redo-onboarding completes via the same `finish`/`setProfile` path. If `setProfile` is called elsewhere without going through finish, ensure store exposes `setMicronutrientTargets` and finish always sets it (AI or fallback) before navigate.
- **D-07 Chart metric:** For each nutrient: sum amounts from ready meals in the Mon–Sun week, divide by 7 → **daily average**, compare to **daily norm**. Progress bar width = min(avg / norm, 1.5) mapped to 0–100% of track (cap display at 150%). Label like `45 / 90 мг` or `12 мкг · 67%`. Remove stacked high/medium/low legend and footer about qualitative assessment; short footnote that values are estimates, not medical advice.
- **D-08 Badges:** Show `amount` + Russian unit (`мг` / `мкг`) for rows with `amount > 0`. Hide zero/missing. Optional subtle tint by % of daily norm if targets passed as optional prop; if norms absent, still show absolute amount.
- **D-09 Scope:** Same 8 `MICRONUTRIENT_IDS`. No new backend route. No full stats page rebuild. No new npm packages.
- **D-10 Russian copy:** Units display as «мг» and «мкг» (map from `mg` / `µg`).

## Patterns to follow

- Client AI Gateway axios POST like `analyzeFoodApi` (env vars, Bearer, timeout, ApiError reject)
- Zustand persist `ai-food-profile` via `capacitorStorage`
- FSD barrels: export new API/helpers from `features/onboarding/index.ts` only if pages need them; chart stays in stats
- Co-located Vitest tests; update fixtures that still use qualitative `level`
- Cross-slice imports via barrels only

## Out of scope

- Backend OpenAI / multer analyze route changes
- Medical disclaimer beyond one short chart footnote
- Rebuilding StatsPage layout beyond passing `micronutrientTargets`
- Changing calorie/weight charts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Quantitative micronutrient types + analyze/refine schema</name>
  <files>packages/shared-types/src/index.ts, apps/mobile/src/features/analyze-food/api/nutritionResultSchema.ts, apps/mobile/src/features/analyze-food/api/nutritionResultSchema.test.ts, apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts, apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts, apps/mobile/src/features/analyze-food/api/refineMealApi.ts</files>
  <behavior>
    - isMicronutrientEstimate accepts { id, amount, unit } with amount &gt;= 0 and unit matching MICRONUTRIENT_UNITS[id]
    - isMicronutrientEstimate rejects qualitative-only { id, level } rows
    - normalizeMicronutrients keeps known ids, coerces unit from MICRONUTRIENT_UNITS, drops invalid/duplicate ids, drops non-finite or negative amounts
    - MICRONUTRIENTS_PROMPT_RULE requires numeric amount + correct unit per id for the meal portion (all 8 ids; unknown → amount 0)
  </behavior>
  <action>
    1. In `packages/shared-types/src/index.ts` (D-01, D-02, D-04): add `MicronutrientUnit`, `MICRONUTRIENT_UNITS`, replace `MicronutrientEstimate` with `{ id, amount, unit }`, remove `MicronutrientLevel` export. Update Meal/NutritionResult JSDoc to say quantitative amounts for the portion. Keep the same 8 ids (D-09).

    2. In `nutritionResultSchema.ts`: rewrite `MICRONUTRIENTS_PROMPT_RULE` for amount+unit (explicit unit per id, Russian note that values are portion estimates). Rewrite `isMicronutrientEstimate` / `isMicronutrientsField` / `normalizeMicronutrients` per D-01–D-03. Do not accept legacy `level` as valid new data.

    3. Update SYSTEM prompt JSON schema snippets in `analyzeFoodApi.ts` and `refineMealApi.ts` so micronutrients example uses amount/unit instead of level. Keep `normalizeMicronutrients` on parse.

    4. Update `nutritionResultSchema.test.ts` and any micronutrient assertions in `analyzeFoodApi.test.ts` (prompt rule still embedded; fixtures use amount/unit). Fix TypeScript breakages in analyze/refine test fixtures that construct MicronutrientEstimate with level.
  </action>
  <verify>
    <automated>pnpm --filter @ai-food/mobile exec vitest run src/features/analyze-food/api/nutritionResultSchema.test.ts src/features/analyze-food/api/analyzeFoodApi.test.ts</automated>
  </verify>
  <done>
    Shared types and schema are quantitative; analyze/refine prompts ask for mg/µg amounts; tests pass; no MicronutrientLevel in shared-types public API.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: AI daily micronutrient norms after onboarding</name>
  <files>apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts, apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.test.ts, apps/mobile/src/features/onboarding/model/defaultMicronutrientTargets.ts, apps/mobile/src/features/onboarding/model/useProfileStore.ts, apps/mobile/src/features/onboarding/model/useOnboarding.ts, apps/mobile/src/features/onboarding/index.ts</files>
  <behavior>
    - defaultMicronutrientTargets(gender?) returns all 8 ids with positive amounts and correct units
    - micronutrientTargetsApi parses valid AI JSON into 8 targets; on gateway/schema failure returns defaults (does not throw to block onboarding)
    - useProfileStore persists micronutrientTargets; resetProfile clears them; setProfile may leave targets null until finish sets them
  </behavior>
  <action>
    1. Add `defaultMicronutrientTargets.ts` with sensible adult daily defaults in MICRONUTRIENT_UNITS (D-05). Sex-aware iron (higher for female) is enough; other nutrients can be single adult values.

    2. Add `micronutrientTargetsApi(profile: UserProfile): Promise&lt;MicronutrientEstimate[]&gt;` mirroring analyzeFoodApi gateway call (D-05, D-09): system prompt asks for JSON array/object of 8 daily RDA-like targets from gender/age/height/weight/activity/goal/dietType; validate with same normalize helpers (reuse from nutritionResultSchema or a tiny shared normalize in onboarding that uses MICRONUTRIENT_UNITS). On any error → return `defaultMicronutrientTargets(profile.gender)`.

    3. Extend `useProfileStore`: `micronutrientTargets: MicronutrientEstimate[] | null`, `setMicronutrientTargets`, clear in `resetProfile`. Persist with existing `ai-food-profile` key (D-04).

    4. In `useOnboarding.finish` (D-06): after `calculateTargets` + `setProfile(profile, targets)`, await `micronutrientTargetsApi(profile)` (or catch → defaults) then `setMicronutrientTargets`, then `navigate('/')`. Keep finish non-blocking on UI if needed by awaiting before navigate so chart has norms on first visit.

    5. Export only what other slices need from `features/onboarding/index.ts` (at least store already exported). Add Vitest with mocked axios for success + failure→defaults.
  </action>
  <verify>
    <automated>pnpm --filter @ai-food/mobile exec vitest run src/features/onboarding/api/micronutrientTargetsApi.test.ts</automated>
  </verify>
  <done>
    Profile store holds micronutrientTargets; finish writes AI or fallback norms; API module uses client gateway only; tests cover success and fallback.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Chart intake-vs-norm + badges with units</name>
  <files>apps/mobile/src/features/stats/model/getWeeklyMicronutrientSeries.ts, apps/mobile/src/features/stats/model/getWeeklyMicronutrientSeries.test.ts, apps/mobile/src/features/stats/ui/WeeklyMicronutrientsChart.tsx, apps/mobile/src/pages/stats/ui/StatsPage.tsx, apps/mobile/src/entities/nutrition/ui/MicronutrientsBadges.tsx, apps/mobile/src/entities/nutrition/ui/MicronutrientsBadges.test.tsx, apps/mobile/src/entities/nutrition/model/micronutrientLabels.ts</files>
  <behavior>
    - getWeeklyMicronutrientSeries sums amount per id for ready meals in week, returns dailyAvg = sum/7 (legacy level-only rows ignored)
    - Chart bar uses dailyAvg / normAmount (cap visual at 150%); label shows avg and norm with мг/мкг; no qualitative legend
    - MicronutrientsBadges renders amount + unit for amount &gt; 0; hides zeros
  </behavior>
  <action>
    1. Rewrite `getWeeklyMicronutrientSeries` (D-07, D-03): `MicronutrientWeekPoint = { id, dailyAvg, unit }` (unit from MICRONUTRIENT_UNITS). Sum `amount` for ready meals in week; dailyAvg = sum / 7. Ignore entries without finite amount. Update helpers (`weekHasMicronutrientData`, drop qualitative total helper or redefine as sum of dailyAvg). Rewrite tests with quantitative fixtures.

    2. Update `WeeklyMicronutrientsChart` props: accept `micronutrientTargets: MicronutrientEstimate[] | null`. For each row, resolve norm by id (fallback to defaultMicronutrientTargets if null so chart still works). Progress = dailyAvg / norm, width capped at 150% of track. Labels per D-07 / D-10. Remove LEVEL_STACK legend and qualitative copy. Footnote: short estimate-not-medical-advice line in Russian.

    3. `StatsPage`: pass `useProfileStore` `micronutrientTargets` into the chart (same pattern as goalKcal).

    4. `MicronutrientsBadges` (D-08, D-10): optional `targets?`; show e.g. `C 45 мг`; hide amount &lt;= 0; remove много/средне/мало classes. Add `formatMicronutrientUnit(unit)` helper in micronutrientLabels (mg→мг, µg→мкг). Update badge tests.

    5. Fix any remaining UI/test references to qualitative levels broken by Task 1 types.
  </action>
  <verify>
    <automated>pnpm --filter @ai-food/mobile exec vitest run src/features/stats/model/getWeeklyMicronutrientSeries.test.ts src/entities/nutrition/ui/MicronutrientsBadges.test.tsx</automated>
  </verify>
  <done>
    Chart shows daily-average vs personal norm with мг/мкг; badges show quantitative amounts; qualitative stacking/legend gone; listed tests pass.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client → AI Gateway | Profile demographics and meal analysis leave the device via Bearer key in Vite env |
| localStorage/persist | Profile + micronutrientTargets stored on device |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-iqm-01 | Information Disclosure | micronutrientTargetsApi / analyzeFoodApi | medium | accept | Same existing client-gateway key exposure as analyze (USER OVERRIDE 260716-05y); no new secret surface |
| T-iqm-02 | Tampering | AI-returned amounts/targets | medium | mitigate | Validate ids/units/amounts client-side; clamp negatives; fallback defaults on invalid payload |
| T-iqm-03 | Denial of Service | Gateway timeout on onboarding finish | low | mitigate | Timeout + always apply defaultMicronutrientTargets so finish still completes |
| T-iqm-04 | Elevation of Privilege | N/A (no auth) | low | accept | Single-device MVP without auth |
</threat_model>

<verification>
- `pnpm --filter @ai-food/mobile exec vitest run src/features/analyze-food/api/nutritionResultSchema.test.ts src/features/analyze-food/api/analyzeFoodApi.test.ts src/features/onboarding/api/micronutrientTargetsApi.test.ts src/features/stats/model/getWeeklyMicronutrientSeries.test.ts src/entities/nutrition/ui/MicronutrientsBadges.test.tsx`
- `pnpm --filter @ai-food/mobile type-check` (or root `pnpm type-check` scoped if faster)
- Manual smoke: finish onboarding → open `/stats` vitamins chart shows norms; analyze a meal → badges show мг/мкг
</verification>

<success_criteria>
- No qualitative micronutrient levels in active types or UI copy for vitamins chart/badges
- Personal daily norms exist after onboarding (AI or defaults)
- Chart compares daily-average intake to those norms with Russian units
- Same 8 micronutrient ids; client gateway only; diary legacy level rows do not crash
</success_criteria>

<output>
Create `.planning/quick/260716-iqm-ai/260716-iqm-SUMMARY.md` when done
</output>

## Atomic commits

1. `feat(260716-iqm): quantitative micronutrient types and analyze schema`
2. `feat(260716-iqm): AI micronutrient daily norms after onboarding`
3. `feat(260716-iqm): chart intake vs norm and quantitative badges`

## Source audit

| SOURCE | ID | Item | Plan | Status |
|--------|-----|------|------|--------|
| GOAL | — | Quantitative units + AI norms + chart vs norm | 01 | COVERED |
| REQ | QUICK-iqm | User locked intent (3 bullets) | 01 T1–T3 | COVERED |
| CONTEXT | D-01..D-10 | Locked design decisions above | 01 | COVERED |
| RESEARCH | — | N/A (quick, no research) | — | N/A |
