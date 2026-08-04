---
phase: 260716-iun-openai-5
plan: 01
subsystem: api
tags: [concurrency, openai, vercel, semaphore]

requires:
  - phase: 260715-1vf-openai
    provides: OpenAI gateway v1 handlers and getOpenAIClient
provides:
  - In-process semaphore createLimiter with OPENAI_CONCURRENCY=5
  - runOpenAI wrapper acquiring the shared pool around upstream calls
  - Unit proof that peak concurrency never exceeds 5
affects: [openai-gateway, concurrency]

tech-stack:
  added: []
  patterns:
    - Hand-rolled FIFO semaphore (no p-limit/bottleneck)
    - All OpenAI network work goes through runOpenAI, not body parsing

key-files:
  created:
    - lib/queue.ts
    - lib/queue.test.ts
  modified:
    - lib/openai.ts
    - api/v1/chat/completions.ts
    - api/v1/embeddings.ts
    - api/v1/models.ts

key-decisions:
  - "Pool limit 5 (D-02): parallel-with-cap via createLimiter, not serial-one-at-a-time"
  - "Pool wraps OpenAI calls only via runOpenAI; lib/request.ts untouched (D-03)"
  - "No new npm dependency — hand-rolled ~50-line semaphore (T-260716-SC)"

patterns-established:
  - "Pattern: export OPENAI_CONCURRENCY + createLimiter from lib/queue.ts; singleton limiter in lib/openai.ts"
  - "Pattern: handlers call runOpenAI((client) => client.<api>(...)) for all upstream work"

requirements-completed: [POOL-01]

coverage:
  - id: D1
    description: "In-process semaphore caps OpenAI upstream concurrency at 5 per isolate"
    requirement: POOL-01
    verification:
      - kind: unit
        ref: "lib/queue.test.ts#createLimiter(5): peak in-flight is exactly 5; 6th starts after one finishes"
        status: pass
    human_judgment: false
  - id: D2
    description: "Slot released on rejection so waiters can proceed"
    requirement: POOL-01
    verification:
      - kind: unit
        ref: "lib/queue.test.ts#releases slot when wrapped fn rejects"
        status: pass
    human_judgment: false
  - id: D3
    description: "chat.completions, embeddings.create, and models.list all use shared runOpenAI pool"
    requirement: POOL-01
    verification:
      - kind: integration
        ref: "api/gateway.test.ts (npm test -- api/gateway.test.ts)"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-16
status: complete
---

# Phase 260716-iun: OpenAI Concurrency Pool Summary

**In-process semaphore (limit 5) with `runOpenAI` wrapping all three `/v1` OpenAI call sites — no new deps, public HTTP contracts unchanged**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-07-16T10:37:22Z
- **Completed:** 2026-07-16T10:41:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Hand-rolled FIFO `createLimiter` with `OPENAI_CONCURRENCY = 5`
- `runOpenAI(fn)` acquires the shared singleton pool around `getOpenAIClient()` work
- chat / embeddings / models handlers route upstream calls through `runOpenAI`
- Unit tests prove peak ≤ 5, 6th waits then runs, and slots release on reject

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Semaphore tests** - `cb17734` (test)
2. **Task 1 (GREEN): queue + runOpenAI** - `3bade6b` (feat)
3. **Task 2: Wire v1 handlers** - `e3b93f4` (feat)

**Plan metadata:** skipped (orchestrator commits docs)

## Files Created/Modified
- `lib/queue.ts` - `createLimiter` semaphore + `OPENAI_CONCURRENCY`
- `lib/queue.test.ts` - concurrency / release / serial unit proofs
- `lib/openai.ts` - singleton limiter + `runOpenAI`
- `api/v1/chat/completions.ts` - upstream via `runOpenAI`
- `api/v1/embeddings.ts` - upstream via `runOpenAI`
- `api/v1/models.ts` - upstream via `runOpenAI`

## Decisions Made
- Pool of 5 (not serial 1) per D-01/D-02
- Wrap only OpenAI network work in `runOpenAI`; leave `lib/request.ts` alone (D-03)
- No p-limit / bottleneck — hand-rolled semaphore only (T-260716-SC)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Isolate-local pool is in place; a global (Redis/Upstash) queue remains out of scope if region-wide caps are needed later
- No blockers

## Self-Check: PASSED
- FOUND: lib/queue.ts, lib/openai.ts runOpenAI, lib/queue.test.ts, three wired handlers
- FOUND commits: cb17734, 3bade6b, e3b93f4
- FOUND: npm test queue + gateway green; type-check clean

---
*Phase: 260716-iun-openai-5*
*Completed: 2026-07-16*
