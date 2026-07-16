---
phase: quick-260716-jlq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts
  - apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.test.ts
autonomous: true
requirements:
  - QUICK-jlq

must_haves:
  truths:
    - "Onboarding micronutrientTargetsApi sends model gpt-4.1 to the AI Gateway chat completions request."
    - "Unit test asserts model is gpt-4.1 (not the previous mini variant)."
    - "analyze-food and refineMealApi model strings are unchanged."
  artifacts:
    - apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts
    - apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.test.ts
  key_links:
    - "axios.post body.model in micronutrientTargetsApi → AI Gateway /v1/chat/completions"
    - "test expect.objectContaining({ model }) matches production request payload"
---

<objective>
Switch the onboarding micronutrient-targets AI request from the mini model to `gpt-4.1` (user-confirmed).

Purpose: Stronger model for personalized daily micronutrient norms after onboarding.

Output: Updated `model` in `micronutrientTargetsApi` plus matching unit-test expectation. No other AI call sites changed.
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts
@apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.test.ts

## Locked scope

- **D-01:** In `micronutrientTargetsApi` axios POST body, set `model` to `gpt-4.1` (replacing the current mini variant used on ~line 100).
- **D-02:** Update the unit test that asserts `model` in `expect.objectContaining` to expect `gpt-4.1`.
- **D-03:** Do NOT change `analyzeFoodApi`, `refineMealApi`, or any other feature's model strings.

## Out of scope

- Prompt text, response parsing, fallbacks, env vars
- Backend routes
- analyze-food / refine-meal model upgrades
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Use gpt-4.1 for micronutrientTargetsApi</name>
  <files>apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts, apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.test.ts</files>
  <behavior>
    - micronutrientTargetsApi posts with model exactly gpt-4.1
    - test file expects model gpt-4.1 in axios.post payload assertion
  </behavior>
  <action>
    Per D-01, D-02, D-03:

    1. In `apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts`, change the chat completions request `model` field from the mini variant to `gpt-4.1` only. Leave SYSTEM_PROMPT, messages, timeout, headers, and fallback behavior untouched.

    2. In `apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.test.ts`, update the `expect.objectContaining({ model: ... })` assertion in the happy-path test so it expects `gpt-4.1`.

    3. Do not edit analyze-food, refine-meal, or any file outside the two listed paths.
  </action>
  <verify>
    <automated>pnpm --filter @ai-food/mobile exec vitest run src/features/onboarding/api/micronutrientTargetsApi.test.ts</automated>
  </verify>
  <done>
    Production request uses model gpt-4.1; unit test passes and asserts the same string; no other AI APIs modified.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client → AI Gateway | Browser sends chat completions with VITE_AI_GATEWAY_API_KEY; model string is client-controlled |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-jlq-01 | Elevation of Privilege | micronutrientTargetsApi model | low | accept | Model upgrade only; no new trust boundary or key exposure; key already client-side per prior override 260716-05y |
| T-jlq-02 | Information Disclosure | gateway request payload | low | accept | Same profile fields as before; only model id changes |
| T-jlq-SC | Tampering | npm/pip/cargo installs | low | accept | No new packages in this plan |
</threat_model>

<verification>
- Vitest for micronutrientTargetsApi passes
- Grep confirms only onboarding micronutrientTargetsApi (+ its test) reference the new model for this change; analyze/refine untouched
</verification>

<success_criteria>
- `micronutrientTargetsApi` request body uses `model: 'gpt-4.1'`
- Test expectation matches
- analyzeFoodApi and refineMealApi model strings unchanged
</success_criteria>

<output>
Create `.planning/quick/260716-jlq-use-gpt-4-1-for-onboarding-micronutrient/260716-jlq-SUMMARY.md` when done
</output>
