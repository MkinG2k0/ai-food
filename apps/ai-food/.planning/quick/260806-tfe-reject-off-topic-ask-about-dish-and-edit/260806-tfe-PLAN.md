---
phase: quick-260806-tfe
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/features/analyze-food/lib/foodTopicGuard.ts
  - src/features/analyze-food/lib/foodTopicGuard.test.ts
  - src/features/analyze-food/api/fetchMealCustomContentApi.ts
  - src/features/analyze-food/api/fetchMealCustomContentApi.test.ts
  - src/features/analyze-food/api/refineMealApi.ts
  - src/features/analyze-food/api/refineMealApi.test.ts
  - src/features/analyze-food/index.ts
  - src/features/refine-meal/model/useRefineMeal.test.ts
autonomous: true
requirements:
  - QUICK-tfe
must_haves:
  truths:
    - "Off-topic or garbage input in «Спросить о блюде» does not append a carousel answer slide; user sees a toast that the question is invalid or off-topic."
    - "Off-topic or garbage input on «Изменить» does not call updateMeal / does not change grams or composition; user sees a toast that the correction is invalid or off-topic."
    - "Obvious junk (bare numbers like 22, keyboard mash, math like 2+2) is rejected client-side before the gateway request when the heuristic matches."
    - "Semantic off-topic that slips past the heuristic is rejected after the model returns the OFF_TOPIC / offTopic sentinel — still no answer slide and no meal mutation."
    - "Valid food questions and meal edits (cooking, calories, ingredients, allergens, portion to X grams with clear intent) still succeed."
  artifacts:
    - src/features/analyze-food/lib/foodTopicGuard.ts
    - src/features/analyze-food/lib/foodTopicGuard.test.ts
    - src/features/analyze-food/api/fetchMealCustomContentApi.ts
    - src/features/analyze-food/api/refineMealApi.ts
  key_links:
    - "MealCustomContentBlock handleAsk → askQuestion → fetchMealCustomContentApi(question) → foodTopicGuard → toast.error on OFF_TOPIC"
    - "RefineMealSheet → useRefineMeal → refineMealApi(correction) → foodTopicGuard → no updateMeal on OFF_TOPIC → MealDetailPage toast.error"
    - "Existing sonner toast.error paths reuse ApiError.message (no new toast library)"
---

<objective>
Reject invalid / off-topic inputs for «Спросить о блюде» and «Изменить» so the app neither shows an AI answer nor mutates meal composition; notify via toast (D-01, D-02, D-03). Keep valid food Q&A and meal edits working (D-04).

Purpose: Stop quota waste and bad UX when users type garbage, math, code requests, or bare numbers that wrongly rescale grams.

Output: Shared `foodTopicGuard` + prompt/API rejection in analyze-food (ask + refine) wired to existing sonner error toasts.
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@src/features/analyze-food/ui/MealCustomContentBlock.tsx
@src/features/analyze-food/model/useMealCustomContent.ts
@src/features/analyze-food/api/fetchMealCustomContentApi.ts
@src/features/analyze-food/api/refineMealApi.ts
@src/features/refine-meal/model/useRefineMeal.ts
@src/pages/meal-detail/ui/MealDetailPage.tsx
@src/features/refine-meal/ui/RefineMealSheet.tsx
@src/features/analyze-food/index.ts

## Locked decisions (from user requirements — do not reopen)

**D-01 — Ask about dish:** If the user question is invalid or not about the meal/food, cancel the request: do not treat the model output as an answer slide. Examples of reject: keyboard mash, empty-ish junk, math, code/identity questions, bare numbers without dish context.

**D-02 — Edit meal («Изменить»):** Same gate for refine correction text. Especially bare numbers like «22» must not change grams/composition. Do not apply `updateMeal` on reject.

**D-03 — Notification:** On reject, show sonner toast (existing pattern in MealCustomContentBlock / MealDetailPage) stating the input is invalid or off-topic.

**D-04 — Valid inputs still work:** Questions about cooking, calories, ingredients, allergens, reducing calories; edits like portion to X grams with clear intent — must continue to succeed.

## Architecture constraints

- Food prompts/validation live in `apps/ai-food` `features/analyze-food` — do not add a new backend in ai-food or move food prompts to `apps/ai-app`.
- Prefer hybrid: cheap client heuristic (skip gateway when obvious junk) + prompt sentinel for semantic off-topic (same spirit as analyze `noFood`).
- Cross-slice imports only via barrels (`@/features/analyze-food`); new public helpers export from `src/features/analyze-food/index.ts` if needed outside the slice.
- Reuse `ApiError` shape `{ message, code, status }` with code `OFF_TOPIC` and status `400`.
- UI already calls `toast.error(apiError.message)` on ask/refine failure — prefer putting the user-facing Russian message on the thrown error so UI wiring stays minimal.

## Out of scope

- Settings-driven initial customContent fetch (no user question).
- Manual FoodItemEditPage edits.
- New npm dependencies; gateway/ai-app changes; auth/billing.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Shared foodTopicGuard + unit tests</name>
  <files>src/features/analyze-food/lib/foodTopicGuard.ts, src/features/analyze-food/lib/foodTopicGuard.test.ts</files>
  <behavior>
    - `isObviouslyIrrelevantFoodInput('22')` → true (bare number; edit must not rescale grams per D-02)
    - `isObviouslyIrrelevantFoodInput('12312фыв')` → true (mash)
    - `isObviouslyIrrelevantFoodInput('сколько будет 2+2')` → true (math)
    - `isObviouslyIrrelevantFoodInput('напиши функцию')` → true (off-topic code)
    - `isObviouslyIrrelevantFoodInput('кто ты')` → true
    - `isObviouslyIrrelevantFoodInput('как приготовить это блюдо')` → false
    - `isObviouslyIrrelevantFoodInput('сделай порцию 200 г')` → false (number WITH food intent)
    - `isObviouslyIrrelevantFoodInput('сколько калорий')` → false
    - `isOffTopicAskResponse('OFF_TOPIC')` → true; normal markdown → false
    - `isOffTopicRefinePayload({ offTopic: true, reason: '…' })` → true; NutritionResult-shaped object → false
    - `offTopicApiError()` returns ApiError with code OFF_TOPIC, status 400, Russian message covering invalid/off-topic (D-03)
  </behavior>
  <action>
    Create `foodTopicGuard.ts` in analyze-food lib (per D-01/D-02). Export:
    1) `isObviouslyIrrelevantFoodInput(text)` — trim; reject pure numeric tokens; reject inputs dominated by punctuation/symbols or very short non-food noise; reject clear math / identity / code-request phrases (Russian + common English). Do NOT reject when digits appear together with food/portion language (grams, порци, калор, ингредиент, аллерген, приготов, блюд, etc.).
    2) `isOffTopicAskResponse(raw)` — true when normalized content is exactly the sentinel token OFF_TOPIC (allow optional surrounding whitespace).
    3) `isOffTopicRefinePayload(parsed)` — true when object has `offTopic === true` (reason optional string).
    4) `offTopicApiError(kind: 'ask' | 'edit')` — stable Russian toast copy: ask mentions вопрос невалиден/не по теме блюда; edit mentions уточнение невалидно/не по теме и не меняет состав.
    Avoid implementing UI here. Co-locate Vitest tests covering the behavior list above.
  </action>
  <verify>
    <automated>pnpm exec vitest run src/features/analyze-food/lib/foodTopicGuard.test.ts</automated>
  </verify>
  <done>Guard helpers and tests exist; heuristics distinguish bare «22» from «порцию 200 г»; sentinel detectors work; OFF_TOPIC ApiError factory ready for APIs.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Prompt + API rejection for ask and refine</name>
  <files>src/features/analyze-food/api/fetchMealCustomContentApi.ts, src/features/analyze-food/api/fetchMealCustomContentApi.test.ts, src/features/analyze-food/api/refineMealApi.ts, src/features/analyze-food/api/refineMealApi.test.ts, src/features/analyze-food/index.ts</files>
  <behavior>
    - fetchMealCustomContentApi with question «22» or «кто ты»: rejects OFF_TOPIC before axios (axios not called)
    - fetchMealCustomContentApi question path: when model returns OFF_TOPIC sentinel, rejects OFF_TOPIC and does not return that string as content
    - QUESTION_SYSTEM_PROMPT instructs: off-topic / non-food questions → reply with exactly OFF_TOPIC and nothing else; on-topic food questions → normal Markdown
    - refineMealApi with correction «22»: rejects OFF_TOPIC before axios
    - refineMealApi: when parsed JSON is offTopic true, rejects OFF_TOPIC (isNutritionResult path not applied)
    - refine SYSTEM_PROMPT documents offTopic rejection object for non-meal corrections; valid corrections still return NutritionResult JSON
    - Valid question «сколько калорий в этом блюде» still posts to gateway (mock) and returns markdown
  </behavior>
  <action>
    Wire `foodTopicGuard` into ask and refine APIs (D-01, D-02).

    **Ask (`fetchMealCustomContentApi`):** Only when `input.question` is non-empty (follow-up ask path). Before gateway POST: if `isObviouslyIrrelevantFoodInput(question)` throw `offTopicApiError('ask')`. Extend `QUESTION_SYSTEM_PROMPT` + question user text: if the question is not about this meal/food (cooking, nutrition, ingredients, allergens, preparation, portion advice, etc.), respond with exactly the single token OFF_TOPIC — no Markdown answer. After `normalizeCustomContent`, if `isOffTopicAskResponse` → throw `offTopicApiError('ask')`. Do not change settings-instructions initial fetch behavior.

    **Refine (`refineMealApi`):** Before gateway POST: if `isObviouslyIrrelevantFoodInput(correction)` throw `offTopicApiError('edit')`. Extend refine system prompt (and/or user text): if the correction is not a meal edit (portion, ingredients, swaps, composition, calories of this dish), return JSON `{"offTopic":true,"reason":"..."}` instead of NutritionResult — never invent a new meal. After `parseJsonContent`, if `isOffTopicRefinePayload(parsed)` → throw `offTopicApiError('edit')` before `isNutritionResult`.

    Export guard symbols from analyze-food `index.ts` only if another slice needs them; otherwise keep internal. Extend existing API test files (mock axios) for the behaviors above; do not weaken existing refine/ask tests.
  </action>
  <verify>
    <automated>pnpm exec vitest run src/features/analyze-food/api/fetchMealCustomContentApi.test.ts src/features/analyze-food/api/refineMealApi.test.ts src/features/analyze-food/lib/foodTopicGuard.test.ts</automated>
  </verify>
  <done>Ask and refine APIs reject obvious junk without gateway calls; model OFF_TOPIC/offTopic sentinels become ApiError OFF_TOPIC; valid food flows still pass tests.</done>
</task>

<task type="auto">
  <name>Task 3: Confirm toast UX + refine hook isolation</name>
  <files>src/features/refine-meal/model/useRefineMeal.test.ts, src/features/analyze-food/ui/MealCustomContentBlock.tsx, src/pages/meal-detail/ui/MealDetailPage.tsx</files>
  <action>
    Ensure D-03 notification without new toast infrastructure. Confirm `MealCustomContentBlock.handleAsk` already surfaces `toast.error(apiError.message)` and does not clear the textarea on failure (only clear on success — keep that). Confirm `MealDetailPage.handleRefine` uses `toast.error` on reject and never reaches success toast when OFF_TOPIC is thrown from `useRefineMeal` → `refineMealApi`.

    If messages from `offTopicApiError` already flow through these catch blocks, do not duplicate toast calls inside the APIs. Only touch UI files if copy needs a thin mapping (e.g. prefer OFF_TOPIC message over generic fallback) — keep changes minimal.

    Extend `useRefineMeal.test.ts`: when `refineMealApi` rejects with OFF_TOPIC, `updateMeal` is not called (D-02). No need for a new React component test unless existing patterns make it cheap.
  </action>
  <verify>
    <automated>pnpm exec vitest run src/features/refine-meal/model/useRefineMeal.test.ts src/features/analyze-food/lib/foodTopicGuard.test.ts src/features/analyze-food/api/fetchMealCustomContentApi.test.ts src/features/analyze-food/api/refineMealApi.test.ts</automated>
  </verify>
  <done>OFF_TOPIC rejects show user-facing toast via existing sonner paths; diary meal unchanged on edit reject; ask does not append slides on reject.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| User free-text → client analyze-food APIs | Untrusted question/correction strings enter ask/refine before gateway |
| Model response → client parsers | Untrusted model output may be Markdown or JSON; must not mutate meal unless validated NutritionResult |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-tfe-01 | Tampering | refineMealApi parse path | medium | mitigate | Reject offTopic payload before updateMeal; only apply isNutritionResult |
| T-tfe-02 | Denial of Service | ask/refine gateway calls | medium | mitigate | Heuristic short-circuit skips gateway for obvious junk; OFF_TOPIC still one call for semantic cases only |
| T-tfe-03 | Information Disclosure | off-topic model answers | low | mitigate | Ask path discards OFF_TOPIC sentinel; never appends as carousel content |
| T-tfe-SC | Tampering | npm installs | low | accept | No new packages in this plan |
</threat_model>

<verification>
- Vitest suites listed in tasks pass.
- Manual smoke (executor): on meal detail, ask «22» / «кто ты» → toast, no new slide; «Изменить» with «22» → toast, macros/grams unchanged; ask «как снизить калории» and edit «порция 150 г» still work.
</verification>

<success_criteria>
- D-01..D-04 satisfied: off-topic ask/edit cancelled with toast; valid food flows intact.
- No ai-app / new backend changes; validation lives in analyze-food prompts + client guard.
</success_criteria>

## Source audit

| ID | Source | Item | Plan |
|----|--------|------|------|
| GOAL | user_requirements | Reject off-topic ask + edit with notification | COVERED 01 tasks 1–3 |
| REQ | QUICK-tfe | Same as goal | COVERED 01 |
| D-01 | user_requirements | Cancel invalid ask-about-dish | COVERED task 2 ask path |
| D-02 | user_requirements | Cancel invalid edit; no gram change | COVERED task 2 refine + task 3 |
| D-03 | user_requirements | Toast notification | COVERED task 1 factory + task 3 |
| D-04 | user_requirements | Valid food inputs still work | COVERED task 1/2 tests |
| RESEARCH | — | No research phase | N/A |
| DEFERRED | — | None | N/A |

<output>
Create `.planning/quick/260806-tfe-reject-off-topic-ask-about-dish-and-edit/260806-tfe-SUMMARY.md` when done
</output>
