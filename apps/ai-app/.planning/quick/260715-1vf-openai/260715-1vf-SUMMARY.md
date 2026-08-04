---
phase: 260715-1vf-openai
plan: 01
subsystem: api
tags: [openai, express, gateway, zod, vitest]

requires: []
provides:
  - Standalone OpenAI HTTP gateway (chat, embeddings, models, analyze-food, health)
  - Shared OpenAI client, ApiError contract, optional API_KEY middleware
affects: [caller-apps, future-gateway-features]

tech-stack:
  added: []
  patterns:
    - createApp() factory for Express + tests
    - Optional API_KEY via Bearer or X-API-Key
    - mapOpenAIError → consistent ApiError codes for v1

key-files:
  created:
    - src/types.ts
    - src/lib/openai.ts
    - src/lib/errors.ts
    - src/middleware/api-key.ts
    - src/app.ts
    - src/routes/v1/models.ts
    - src/routes/v1/chat.ts
    - src/routes/v1/embeddings.ts
    - src/routes/v1/gateway.test.ts
  modified:
    - package.json
    - package-lock.json
    - .env.example
    - src/index.ts
    - src/routes/analyze-food.ts
    - src/routes/analyze-food.test.ts

key-decisions:
  - "Package name openai-gateway (standalone, no workspace deps)"
  - "Streaming chat rejected with STREAM_NOT_SUPPORTED (non-scope)"
  - "analyze-food keeps domain error codes; v1 uses UPSTREAM_* codes"

patterns-established:
  - "Mount /health before api-key middleware"
  - "Zod-validate v1 bodies before calling OpenAI"
  - "vi.mock('openai') + createApp() for route tests"

requirements-completed: [GATEWAY-01, GATEWAY-02, GATEWAY-03]

coverage:
  - id: D1
    description: "Standalone package without workspace:* or @ai-food/shared-types"
    requirement: GATEWAY-01
    verification:
      - kind: other
        ref: "grep package.json+src for @ai-food/shared-types|workspace:"
        status: pass
    human_judgment: false
  - id: D2
    description: "v1 models/chat/embeddings endpoints with Zod validation and non-streaming chat"
    requirement: GATEWAY-02
    verification:
      - kind: unit
        ref: "src/routes/v1/gateway.test.ts#GET /v1/models returns 200 with data array"
        status: pass
      - kind: unit
        ref: "src/routes/v1/gateway.test.ts#POST /v1/chat/completions returns completion JSON"
        status: pass
      - kind: unit
        ref: "src/routes/v1/gateway.test.ts#POST /v1/embeddings returns embeddings JSON"
        status: pass
      - kind: unit
        ref: "src/routes/v1/gateway.test.ts#POST /v1/chat/completions with stream=true returns 400 STREAM_NOT_SUPPORTED"
        status: pass
    human_judgment: false
  - id: D3
    description: "Shared ApiError contract, optional API_KEY auth, health open, analyze-food preserved"
    requirement: GATEWAY-03
    verification:
      - kind: unit
        ref: "src/routes/v1/gateway.test.ts#rejects protected routes with 401 UNAUTHORIZED when API_KEY is set and missing"
        status: pass
      - kind: unit
        ref: "src/routes/v1/gateway.test.ts#GET /health always returns 200 without API key even when API_KEY is set"
        status: pass
      - kind: unit
        ref: "src/routes/analyze-food.test.ts#AI-01"
        status: pass
      - kind: other
        ref: "npm test && npm run type-check"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-15
status: complete
---

# Phase 260715-1vf-openai Plan 01: OpenAI Gateway Summary

**Standalone Express OpenAI gateway with /v1 chat (vision-capable), embeddings, models, optional API_KEY, and preserved /analyze-food**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-14T22:24:30Z
- **Completed:** 2026-07-14T22:29:00Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments
- Removed monorepo coupling (`openai-gateway`, inlined types, no `workspace:*`)
- Shared OpenAI client (30s timeout), `ApiError` helpers, optional gateway auth
- Exposed `/v1/models`, `/v1/chat/completions`, `/v1/embeddings` plus open `/health`
- Automated coverage for v1 happy paths, validation, auth, and rate-limit mapping

## Task Commits

Each task was committed atomically:

1. **Task 1: Detach monorepo and add shared gateway core** - `d6802e5` (feat)
2. **Task 2 RED: Failing gateway v1 tests** - `efe657f` (test)
3. **Task 2 GREEN: v1 endpoints + analyze-food refactor** - `cce8dfa` (feat)
4. **Task 3: Auth and error-mapping coverage** - `cbfb76e` (test)

_Note: Docs artifacts left uncommitted per quick-task orchestrator constraints._

## Files Created/Modified
- `package.json` / `package-lock.json` - standalone `openai-gateway`
- `.env.example` - OPENAI_API_KEY, PORT, optional API_KEY
- `src/types.ts` - ApiError + analyze-food response types
- `src/lib/openai.ts` / `src/lib/errors.ts` - shared client + error mapping
- `src/middleware/api-key.ts` - optional Bearer / X-API-Key gate
- `src/app.ts` / `src/index.ts` - createApp + listen
- `src/routes/v1/*` - models, chat, embeddings + gateway tests
- `src/routes/analyze-food.ts` - shared client/errors, domain codes preserved

## Decisions Made
- Package named `openai-gateway` for clarity as a reusable service
- Non-streaming only: `stream=true` → `STREAM_NOT_SUPPORTED`
- analyze-food keeps `ANALYSIS_TIMEOUT` / `INVALID_IMAGE` / `ANALYSIS_FAILED`; v1 uses `UPSTREAM_TIMEOUT` / `BAD_REQUEST` / `UPSTREAM_ERROR`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched analyze-food/test imports off `@ai-food/shared-types` in Task 1**
- **Found during:** Task 1
- **Issue:** Removing workspace package would break type-check / done criteria ("no @ai-food/shared-types in src")
- **Fix:** Point imports at local `src/types.ts` immediately
- **Files modified:** `src/routes/analyze-food.ts`, `src/routes/analyze-food.test.ts`
- **Verification:** `npm run type-check` passed
- **Committed in:** `d6802e5`

**2. [Rule 1 - Bug] Set OPENAI_API_KEY in analyze-food tests after shared client fail-fast**
- **Found during:** Task 2
- **Issue:** `getOpenAIClient()` throws when key missing; mocked constructor never ran
- **Fix:** Set/restore `OPENAI_API_KEY` in test beforeEach/afterEach
- **Files modified:** `src/routes/analyze-food.test.ts`
- **Verification:** analyze-food suite passed
- **Committed in:** `cce8dfa`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Necessary for standalone build and existing tests; no scope creep.

## Issues Encountered
None beyond the auto-fixes above.

## User Setup Required
Set env vars before calling real OpenAI:
- `OPENAI_API_KEY` from OpenAI Dashboard
- optional `API_KEY` shared secret for callers (omit to disable auth)
- `PORT` (default 3001)

## Next Phase Readiness
Gateway is callable from other apps over HTTP with mocked tests green. Ready for manual smoke with a real key if desired.

## Self-Check: PASSED
- FOUND: src/app.ts, src/lib/openai.ts, src/lib/errors.ts, src/middleware/api-key.ts, src/routes/v1/models.ts, src/routes/v1/chat.ts, src/routes/v1/embeddings.ts, src/routes/v1/gateway.test.ts, src/types.ts
- FOUND commits: d6802e5, efe657f, cce8dfa, cbfb76e
- `npm test`: 16/16 passed
- `npm run type-check`: passed
- No `@ai-food/shared-types` or `workspace:` in package.json/src

---
*Phase: 260715-1vf-openai*
*Completed: 2026-07-15*
