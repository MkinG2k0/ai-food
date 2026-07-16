---
phase: quick-260716-jqc
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts
  - apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts
autonomous: true
requirements:
  - QUICK-jqc

must_haves:
  truths:
    - "Vision SYSTEM_PROMPT is Russian-structured with sections for role, noFood, JSON schema, foodName/composition rules, required grams + scale anchors, cooking method, confidence bands, healthiness 1–10, edge cases, micronutrients, language."
    - "SYSTEM_PROMPT includes few-shot Example A (burger items with grams) and Example B (noFood person photo)."
    - "Image user message instructs visible portion, required grams on items, cooking method, no inventing food, JSON only."
    - "TEXT_SYSTEM_PROMPT mirrors the same structure for text input (typical serving when vague + lower confidence); text user message updated similarly."
    - "Existing prompt-fragment unit tests still pass; new assertions cover grams-required, healthiness scale, portion estimation, and few-shot/noFood example presence."
    - "MICRONUTRIENTS_PROMPT_RULE, schema validation (amount+unit), appendCustomInstructions, and appendDietPreference are unchanged; backend analyze-food route untouched."
  artifacts:
    - apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts
    - apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts
  key_links:
    - "SYSTEM_PROMPT / TEXT_SYSTEM_PROMPT → axios messages[0].content via appendCustomInstructions + appendDietPreference"
    - "Image/text userContent → messages[1].content (vision multimodal text part or plain string)"
    - "Tests inspect axios.post mock body.messages for prompt fragments"
---

<objective>
Improve analyze-food Vision/text prompts: RU-structured system prompt, required grams + cooking method + confidence/healthiness guidance, edge cases, few-shot examples, and stronger user messages (D-01–D-05).

Purpose: Better portion/grams accuracy and consistent JSON from gpt-4.1-mini without changing schema validation or micronutrient design.

Output: Updated `SYSTEM_PROMPT`, `TEXT_SYSTEM_PROMPT`, and user messages in `analyzeFoodApi.ts` plus matching test assertions.
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts
@apps/mobile/src/features/analyze-food/api/nutritionResultSchema.ts
@apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts

## Locked decisions (implement exactly)

- **D-01:** Rewrite vision `SYSTEM_PROMPT` as Russian-structured sections (Role; noFood via existing `NO_FOOD_PROMPT_RULE`; JSON schema fields; embed `FOOD_NAME_PROMPT_RULE` + `COMPOSITION_PROMPT_RULE`; Portion/grams REQUIRED on every item with scale anchors plate 22–27cm / tablespoon / can / 0.5L bottle, estimate visible portion, top-level macros = sum of items; Cooking method oil/crust/breading/grill/raw vs cooked, unclear → typical method + lower confidence; confidence bands 0.85–1.0 / 0.55–0.84 / 0.25–0.54 / under 0.25; healthiness 1–10 bands not medical advice; Edge cases food+person→analyze food, packaging/menu without visible portion→noFood, multiple dishes→all in items + meal-level foodName, blurry/no food→noFood; keep `MICRONUTRIENTS_PROMPT_RULE`; Russian text fields, numbers only, JSON only).
- **D-02:** Few-shot inside system prompt — Example A burger split with grams (nonnegative macros; note that real answers must include all 8 micronutrients, example may omit full array); Example B person photo → noFood JSON.
- **D-03:** Image user text must be exactly: `Оцени видимую порцию на фото. Разбей состав на items с обязательными grams. Учти способ приготовления. Не выдумывай еду, если её нет. Верни только JSON по схеме.`
- **D-04:** `TEXT_SYSTEM_PROMPT` same structural improvements adapted for text (typical serving when vague + lower confidence); strengthen text user message analogously.
- **D-05:** Update `analyzeFoodApi.test.ts` assertions on prompt fragments so they pass; add coverage for grams-required / healthiness scale / portion / few-shot noFood example phrases.

## Out of scope

- Micronutrient amount→level redesign; onboarding / vitamin norms / target weight
- Model upgrade (stay gpt-4.1-mini)
- ResultPage noFood UI
- Backend `apps/backend/src/routes/analyze-food.ts`
- Changes to `MICRONUTRIENTS_PROMPT_RULE` text, Zod/schema validators, `appendCustomInstructions`, `appendDietPreference`
</context>

<tasks>

<task type="auto">
  <name>Task 1: RU-structured prompts + stronger user messages</name>
  <files>apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts</files>
  <action>
    Per D-01, D-02, D-03, D-04 — edit only prompt strings and user message text in `analyzeFoodApi.ts`. Do not change request model, gateway URL, compression, parsing, `appendCustomInstructions`, or `appendDietPreference`.

    1. Replace the English one-liner `SYSTEM_PROMPT` / flat `NUTRITION_JSON_SCHEMA` assembly with a Russian-structured system prompt that includes clear section headings covering: Role; noFood (interpolate existing `NO_FOOD_PROMPT_RULE` unchanged); JSON schema field list (update `items[].grams` wording from optional to REQUIRED on every item — number only, no unit suffixes); embed `FOOD_NAME_PROMPT_RULE` and `COMPOSITION_PROMPT_RULE`; Portion/grams (required grams, scale anchors 22–27cm plate / tablespoon / can / 0.5L bottle, estimate visible portion, top-level macros = sum of items); Cooking method (oil, crust, breading, grill, raw vs cooked; if unclear use typical method and lower confidence); confidence scale bands (0.85–1.0 clear; 0.55–0.84 partial; 0.25–0.54 uncertain; below 0.25 guessing); healthiness 1–10 (1–3 ultra-processed/fried; 4–6 mixed; 7–10 whole foods; not medical advice); Edge cases (food visible with a person → analyze the food, not noFood; packaging or menu without a visible edible portion → noFood; multiple dishes → all components in items, foodName = meal name; blurry or no food → noFood); `MICRONUTRIENTS_PROMPT_RULE` unchanged; Language (Russian text fields; numbers only; JSON only).

    2. Per D-02, append few-shot examples inside the vision system prompt: Example A — compound burger broken into items each with grams and nonnegative macros (include a short note that production answers must always return all 8 micronutrients; the example JSON may omit the full micronutrients array); Example B — person/selfie style photo → `{"noFood":true,"reason":"..."}` in Russian.

    3. Per D-03, change the vision multimodal user text part from the current short Russian analyze line to the exact locked sentence about visible portion, required grams on items, cooking method, not inventing food, JSON only.

    4. Per D-04, rewrite `TEXT_SYSTEM_PROMPT` with the same section structure adapted for free-text meal description (no image; when serving size is vague use a typical serving and lower confidence). Update the text-mode user message string to parallel the stronger vision instructions (estimate portion/serving, required grams on items, cooking method when mentioned, do not invent food, JSON only) while still embedding the user description.

    5. Keep exports `FOOD_NAME_PROMPT_RULE`, `COMPOSITION_PROMPT_RULE`, re-exports of micronutrient/noFood rules, and all runtime logic outside prompts unchanged. Do not edit backend routes or `nutritionResultSchema.ts`.
  </action>
  <verify>
    <automated>pnpm --filter @ai-food/mobile exec vitest run src/features/analyze-food/api/analyzeFoodApi.test.ts</automated>
  </verify>
  <done>
    Vision and text system prompts are RU-structured with required grams, cooking, confidence, healthiness, edge cases, few-shots; image user message matches D-03 exactly; text user message strengthened per D-04; helpers and schema validation untouched.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Align prompt fragment tests</name>
  <files>apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts</files>
  <behavior>
    - Existing tests that embed FOOD_NAME / COMPOSITION / NO_FOOD / MICRONUTRIENTS rules and healthiness 1–10 still pass against the new SYSTEM_PROMPT
    - New or updated assertions confirm required-grams language (обязательн + grams), healthiness scale guidance, portion estimation (порци), and few-shot noFood example presence in the captured system message
    - Image user message content matches the locked D-03 Russian sentence
    - Text-mode request still sends a string user message that includes the description and asks for JSON with grams/portion guidance
  </behavior>
  <action>
    Per D-05 — update only `analyzeFoodApi.test.ts`:

    1. Keep tests that `toContain` the exported rule constants; they must still pass after Task 1.

    2. Adjust any brittle regexes that assumed English role phrasing or optional-grams wording so they match the new RU prompt (still require grams field documentation; still reject legacy portion-field naming if those negative checks already exist).

    3. Add assertions on the vision path system message for: required grams phrasing (e.g. match /grams/i and /обязательн/i), healthiness scale guidance (1–10 bands or ultra-processed/whole-foods language), portion estimation (/порци/i), and few-shot Example B / noFood example (match noFood true in an example context).

    4. Assert the vision user multimodal text part equals the exact D-03 string.

    5. For text analyze path, assert user content still includes the free-text description and mentions grams or portion estimation / JSON-only guidance.

    Do not weaken schema/runtime tests (healthiness range, grams type checks, noFood rejection). Do not touch backend tests.
  </action>
  <verify>
    <automated>pnpm --filter @ai-food/mobile exec vitest run src/features/analyze-food/api/analyzeFoodApi.test.ts</automated>
  </verify>
  <done>
    All analyzeFoodApi unit tests pass; new prompt-fragment and user-message assertions cover D-01–D-05 keywords without changing runtime validation behavior.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client → AI Gateway | Browser sends system+user prompts with images/text; API key already client-side (260716-05y) |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-jqc-01 | Information Disclosure | SYSTEM_PROMPT few-shot content | low | accept | Prompt text only; no new PII fields; examples are synthetic |
| T-jqc-02 | Tampering | Prompt injection via customInstructions | low | accept | Existing appendCustomInstructions append-only; unchanged in this plan |
| T-jqc-03 | Denial of Service | Longer system prompt token cost | low | accept | Still single chat completion; timeout 30s unchanged |
| T-jqc-SC | Tampering | npm/pip/cargo installs | low | accept | No new packages |
</threat_model>

<verification>
- Vitest `analyzeFoodApi.test.ts` green
- Grep confirms backend `analyze-food.ts` not modified
- Grep confirms `MICRONUTRIENTS_PROMPT_RULE` constant body unchanged in nutritionResultSchema.ts
</verification>

<success_criteria>
- SYSTEM_PROMPT and TEXT_SYSTEM_PROMPT deliver D-01/D-02/D-04 content
- Vision user message matches D-03 exactly
- Tests cover new key phrases and pass
- No schema/micronutrient redesign; no backend prompt edits; append helpers unchanged
</success_criteria>

<output>
Create `.planning/quick/260716-jqc-grams-ru-few-shot-user-message-healthine/260716-jqc-SUMMARY.md` when done
</output>
