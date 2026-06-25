---
phase: 01-backend-openai-vision-proxy
plan: "02"
subsystem: backend
tags: [openai, vision, express, zod, dotenv, typescript]
one-liner: "Real OpenAI Vision proxy via gpt-4o-mini with Zod validation and typed error mapping replacing mock backend"
dependency-graph:
  requires: ["01-01"]
  provides: ["real-openai-vision-endpoint"]
  affects: ["apps/backend/src/index.ts", "apps/backend/src/routes/analyze-food.ts"]
tech-stack:
  added: ["dotenv (runtime loading)", "openai SDK per-request client", "Zod runtime validation"]
  patterns: ["multer error-wrapping middleware", "typed ApiError responses", "per-request OpenAI instantiation for testability"]
key-files:
  created: []
  modified:
    - apps/backend/src/index.ts
    - apps/backend/src/routes/analyze-food.ts
    - apps/backend/src/routes/analyze-food.test.ts
decisions:
  - "Per-request OpenAI client construction (not module-scope singleton) required for vi.mock() test isolation"
  - "Multer error-wrapping middleware catches boundary-not-found to return INVALID_IMAGE 400 instead of unhandled 500"
  - "ConstructorParameters<typeof OpenAI.RateLimitError> fixes type error — Parameters<> does not accept class types"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-25"
  tasks-completed: 2
  tasks-total: 3
  files-modified: 3
requirements: [AI-01, AI-02, ERR-03]
---

# Phase 01 Plan 02: Real OpenAI Vision Implementation Summary

Real OpenAI Vision proxy via gpt-4o-mini with Zod validation and typed error mapping replacing mock backend.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Load dotenv as first statement in index.ts | f15b810 | apps/backend/src/index.ts |
| 2 | Replace mock route with real OpenAI Vision implementation | fad01e2 | apps/backend/src/routes/analyze-food.ts, analyze-food.test.ts |
| 3 | Human verify real AI analysis end-to-end | — | CHECKPOINT (awaiting) |

## What Was Built

### Task 1 — dotenv loading
`apps/backend/src/index.ts` now has `import dotenv from 'dotenv'` + `dotenv.config()` as the first two lines, before `import express` and `import analyzeFoodRouter`. This ensures `process.env.OPENAI_API_KEY` is populated before the route module's OpenAI client is constructed. Startup log updated from "Mock backend running" to "Backend running".

### Task 2 — Real OpenAI Vision route
`apps/backend/src/routes/analyze-food.ts` fully replaced:
- **Model:** `gpt-4o-mini` with `response_format: { type: 'json_object' }` and English system prompt specifying exact JSON schema
- **Zod validation:** `NutritionResultSchema` validates all 7 fields (`foodName`, `calories`, `protein`, `carbs`, `fat`, `fiber`, `confidence 0–1`) before returning to client
- **Error mapping:** `RateLimitError→429/RATE_LIMITED`, `APIConnectionTimeoutError→504/ANALYSIS_TIMEOUT`, `BadRequestError→400/INVALID_IMAGE`, all others→500/ANALYSIS_FAILED
- **Real processingTime:** `Date.now()` before/after OpenAI call
- **DoS mitigation:** 10MB file size limit on multer (T-02-02)
- **Multer error wrapper:** catches missing boundary → returns 400/INVALID_IMAGE instead of unhandled 500

## Test Results

All 6 tests GREEN:
- AI-01: 200 + foodName string + processingTime number
- AI-02: all 7 NutritionResult fields with correct types, confidence 0–1
- ERR-03a: no file → 400 INVALID_IMAGE
- ERR-03b: RateLimitError → 429 RATE_LIMITED
- ERR-03c: APIConnectionTimeoutError → 504 ANALYSIS_TIMEOUT
- ERR-03d: non-JSON content → 500 ANALYSIS_FAILED

TypeScript build: zero errors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Per-request OpenAI client construction instead of module-scope singleton**
- **Found during:** Task 2 — 5/6 tests failing with "Cannot read properties of undefined (reading 'completions')"
- **Issue:** The plan specified `const openai = new OpenAI(...)` at module scope. With vitest's `vi.mock('openai')`, `vi.mocked(OpenAI).mockImplementation(...)` is called per-test, but a module-scope singleton is constructed once at import time (before any test's `mockImplementation` runs). The singleton captured the auto-mocked class prototype with undefined `chat`.
- **Fix:** Changed to `function getOpenAIClient(): OpenAI { return new OpenAI({ ... }); }` called inside the route handler. Each request constructs a fresh instance, so per-test `mockImplementation` is picked up correctly.
- **Files modified:** apps/backend/src/routes/analyze-food.ts
- **Commit:** fad01e2

**2. [Rule 1 - Bug] Multer boundary-not-found error → INVALID_IMAGE wrapper**
- **Found during:** Task 2 — ERR-03a test: sending `Content-Type: multipart/form-data` with no file attachment causes multer to throw "Multipart: Boundary not found", propagating as an unhandled 500
- **Issue:** The plain `upload.single('image')` middleware does not catch its own errors. When the test sends the header without a body, multer throws before reaching the `if (!req.file)` guard.
- **Fix:** Wrapped multer in `uploadMiddleware()` that passes multer's callback error to `sendApiError(res, 400, 'INVALID_IMAGE', ...)`.
- **Files modified:** apps/backend/src/routes/analyze-food.ts
- **Commit:** fad01e2

**3. [Rule 1 - Bug] Test type error: `Parameters<>` → `ConstructorParameters<>` for RateLimitError**
- **Found during:** Task 1 build verification — `TS2344: Type 'typeof RateLimitError' does not satisfy the constraint '(...args: any) => any'`
- **Issue:** Wave 1 test used `{} as Parameters<typeof OpenAI.RateLimitError>[2]`. `Parameters<>` requires a function type, not a class type.
- **Fix:** Changed to `{} as ConstructorParameters<typeof OpenAI.RateLimitError>[3]` (index 3 = headers parameter of `APIError` constructor).
- **Files modified:** apps/backend/src/routes/analyze-food.test.ts
- **Commit:** fad01e2

## Known Stubs

None. The implementation is complete — no hardcoded nutrition values, no mock delays, no placeholder responses.

## Threat Surface

All T-02-xx threats from the plan's threat model are addressed:
- T-02-01: API key loaded via dotenv, never in any response
- T-02-02: 10MB multer limit added (was missing from plan implementation spec — added per Rule 2)
- T-02-03: Zod schema validates OpenAI response before use
- T-02-04: `if (!req.file)` guard + multer error wrapper
- T-02-05: Raw OpenAI errors logged server-side only; client gets generic ApiError shape
- T-02-06: `timeout: 30_000` in OpenAI client + APIConnectionTimeoutError mapped to 504

## Self-Check: PASSED

- [x] `apps/backend/src/index.ts` — dotenv on line 1-2, exists in worktree
- [x] `apps/backend/src/routes/analyze-food.ts` — real implementation, no MOCK_RESPONSE
- [x] Commit f15b810 — Task 1
- [x] Commit fad01e2 — Task 2
- [x] 6/6 tests GREEN
- [x] TypeScript build exits 0
