---
phase: 260806-u2q
plan: 01
subsystem: api
tags: [openrouter, food-api, prompts, sse, express, vitest]

requires: []
provides:
  - "POST /v1/food/analyze|refine|ask with server-owned prompts and OPENROUTER_MODEL"
  - "Thin ai-food clients with clean payloads (no model/messages/temperature)"
  - "Updated AI-GATEWAY.md and ai-gateway.mdc contract"
affects: [analyze-food, refine-meal, ai-app-gateway]

tech-stack:
  added: []
  patterns:
    - "Domain food routes build OpenRouter messages server-side; client sends user data only"
    - "Analyze stays SSE; refine/ask stay JSON chat.completion"

key-files:
  created:
    - apps/ai-app/src/food/modelConfig.ts
    - apps/ai-app/src/food/prompts.ts
    - apps/ai-app/src/food/buildMessages.ts
    - apps/ai-app/src/food/analyzeFeatures.ts
    - apps/ai-app/src/routes/food.ts
    - apps/ai-app/src/routes/food.test.ts
  modified:
    - apps/ai-app/src/app.ts
    - apps/ai-app/.env.example
    - apps/ai-food/src/features/analyze-food/api/analyzeFoodApi.ts
    - apps/ai-food/src/features/analyze-food/api/refineMealApi.ts
    - apps/ai-food/src/features/analyze-food/api/fetchMealCustomContentApi.ts
    - apps/ai-food/src/features/analyze-food/api/streamChatCompletions.ts
    - apps/ai-food/docs/AI-GATEWAY.md
    - .cursor/rules/ai-gateway.mdc

key-decisions:
  - "Separate /v1/food/* routes rather than templating chat/completions"
  - "Zod .strict() rejects client model/messages/temperature on food bodies"
  - "Settings aiModel UI retained but unused by food API calls"

patterns-established:
  - "apps/ai-app/src/food/* is SoT for food prompts and model/temperature"
  - "streamFoodAnalyze posts clean analyze JSON to /v1/food/analyze"

requirements-completed: [QUICK-260806-u2q]

coverage:
  - id: D1
    description: Server food routes own prompts, OPENROUTER_MODEL, temperature 0
    requirement: QUICK-260806-u2q
    verification:
      - kind: unit
        ref: apps/ai-app/src/routes/food.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Frontend food APIs hit /v1/food/* with clean payloads
    requirement: QUICK-260806-u2q
    verification:
      - kind: unit
        ref: apps/ai-food/src/features/analyze-food/api/analyzeFoodApi.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Docs/rule document /v1/food/analyze|refine|ask
    requirement: QUICK-260806-u2q
    verification:
      - kind: other
        ref: "rg /v1/food/analyze|/v1/food/refine|/v1/food/ask AI-GATEWAY.md ai-gateway.mdc"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-06
status: complete
---

# Phase 260806-u2q Plan 01: AI prompts/config → backend Summary

**Food analyze/refine/ask now use server-owned prompts and OPENROUTER_MODEL via `/v1/food/*`; clients send only user data and still compress/parse locally.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-06T18:47:00Z
- **Completed:** 2026-08-06T18:59:00Z
- **Tasks:** 3/3
- **Files modified:** ~25

## Accomplishments

- Added `POST /v1/food/analyze` (SSE), `/refine`, `/ask` (JSON) with prompts in `apps/ai-app/src/food/*`
- Slimmed ai-food APIs to clean bodies; kept compress + XML/JSON parse + off-topic guards
- Updated `AI-GATEWAY.md` and `.cursor/rules/ai-gateway.mdc` for the new contract

## Task Commits

1. **Task 1: Backend food routes + prompts + model config** - `8e8f081` (feat)
2. **Task 2: Frontend thin clients + test rewrite** - `aa20cb4` (feat)
3. **Task 3: Update AI-GATEWAY docs and cursor rule** - `1c97998` + `9bd3312` (docs)

**Plan metadata:** not committed (orchestrator handles SUMMARY/STATE)

## Files Created/Modified

- `apps/ai-app/src/food/*` — modelConfig, prompts, buildMessages, analyzeFeatures
- `apps/ai-app/src/routes/food.ts` + `food.test.ts` — three food POSTs + tests
- `apps/ai-app/src/app.ts` — mount `/v1/food` behind quota
- `apps/ai-food/.../analyzeFoodApi.ts` / `refineMealApi.ts` / `fetchMealCustomContentApi.ts` — thin clients
- `apps/ai-food/docs/AI-GATEWAY.md`, `.cursor/rules/ai-gateway.mdc` — contract docs

## Decisions Made

- Separate food endpoints (locked CONTEXT); temperature hardcoded to 0; model from `OPENROUTER_MODEL`
- Keep Settings `aiModel` UI; food calls ignore it
- Onboarding `micronutrientTargetsApi` still uses `/v1/chat/completions` (out of scope)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical] Cursor rule was gitignored**
- **Found during:** Task 3
- **Issue:** `.cursor/` is gitignored so `git add` skipped `ai-gateway.mdc`
- **Fix:** Force-staged with `git add -f` so the rule lands in history as required by the plan
- **Files modified:** `.cursor/rules/ai-gateway.mdc`
- **Committed in:** `9bd3312`

**2. [Rule 1 - Bug] Ask client sent settings instructions with follow-up questions**
- **Found during:** Task 2 (test rewrite)
- **Issue:** Previous behavior avoided attaching settings recipe prompts to question mode
- **Fix:** When `question` is set, body sends only `question` (not `customInstructions`)
- **Files modified:** `fetchMealCustomContentApi.ts`
- **Committed in:** `aa20cb4`

## Threat Flags

None — food routes reuse existing `requireApiKey` + `enforceChatQuota`; Zod `.strict()` mitigates T-260806-u2q-01.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `apps/ai-app/src/routes/food.ts`, `apps/ai-app/src/food/prompts.ts`, `apps/ai-food/docs/AI-GATEWAY.md`
- FOUND commits: `8e8f081`, `aa20cb4`, `1c97998`, `9bd3312`
