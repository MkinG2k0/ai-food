---
phase: 01-backend-openai-vision-proxy
plan: 01
subsystem: backend
tags: [tdd, scaffold, openai, vitest, testing]
dependency_graph:
  requires: []
  provides:
    - apps/backend/package.json (openai, zod, dotenv, vitest, supertest)
    - apps/backend/vitest.config.ts
    - apps/backend/src/routes/analyze-food.test.ts
    - apps/backend/.env.example
  affects:
    - apps/backend/src/routes/analyze-food.ts (downstream — Wave 2 implements against these tests)
tech_stack:
  added:
    - openai@^6.45.0
    - zod@^4.4.3
    - dotenv@^17.4.2
    - vitest@^2
    - supertest@^7.2.2
    - "@types/supertest@^7.2.0"
  patterns:
    - TDD RED state — tests written before implementation
    - vi.mock('openai') hoisting for SDK isolation
    - supertest HTTP-level assertions against mounted Express router
key_files:
  created:
    - apps/backend/vitest.config.ts
    - apps/backend/src/routes/analyze-food.test.ts
    - apps/backend/.env.example
  modified:
    - apps/backend/package.json
    - pnpm-lock.yaml
decisions:
  - "Removed @vitest/coverage-v8 due to peer dep version mismatch (^4 vs vitest ^2); not required by plan"
  - "Used static ESM import for analyze-food router (not dynamic require) for correct vi.mock hoisting"
  - "Installed pnpm deps in main repo, copied lockfile to worktree, then ran pnpm install in worktree for node_modules"
  - "dotenv ^17 ships own TypeScript types — @types/dotenv not installed (package does not exist on npm)"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-25T16:06:30Z"
  tasks_completed: 2
  files_changed: 5
---

# Phase 01 Plan 01: TDD Scaffold — Install Packages and Write Failing Tests

**One-liner:** TDD scaffold for OpenAI Vision backend: installed openai/zod/dotenv/vitest/supertest and wrote 6 failing test stubs covering AI-01, AI-02, and ERR-03 against the mock Express router.

## What Was Built

- **Package installations:** `openai ^6.45.0`, `zod ^4.4.3`, `dotenv ^17.4.2` added to runtime dependencies; `vitest ^2`, `supertest ^7.2.2` added to devDependencies.
- **Vitest config** (`apps/backend/vitest.config.ts`): Node environment, globals enabled, targets `src/**/*.test.ts`.
- **Test stubs** (`apps/backend/src/routes/analyze-food.test.ts`): 6 tests covering all three requirements — AI-01 (200 with foodName+processingTime), AI-02 (full 7-field NutritionResult schema + confidence 0–1), ERR-03a (400 INVALID_IMAGE), ERR-03b (429 RATE_LIMITED), ERR-03c (504 ANALYSIS_TIMEOUT), ERR-03d (500 ANALYSIS_FAILED).
- **Environment template** (`apps/backend/.env.example`): `OPENAI_API_KEY=your_key_here` and `PORT=3001`.

## RED State Confirmed

Running `vitest run` from `apps/backend` in the worktree:
- 2 passed (AI-01, AI-02 — the mock route returns matching shape by coincidence)
- 4 failed (ERR-03a–d — mock always returns 200, tests expect 400/429/504/500)

This is the expected RED state per the plan. Wave 2 (plan 01-02) implements the real route to turn all 6 tests green.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 09548e9 | chore(01-01): install openai, zod, dotenv; add vitest; add test scripts |
| Task 2 | 58cca9c | test(01-01): add vitest config and failing test stubs for AI-01, AI-02, ERR-03 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed @vitest/coverage-v8 peer dep mismatch**
- **Found during:** Task 1
- **Issue:** `@vitest/coverage-v8 ^4.1.9` was installed but required `vitest@^4`, conflicting with the plan's `vitest ^2` pin. The plan does not mention coverage reporting — only running tests.
- **Fix:** Removed `@vitest/coverage-v8` entirely; kept `vitest ^2` which matches the project's existing mobile app vitest version.
- **Files modified:** apps/backend/package.json

**2. [Rule 3 - Blocking] Used static ESM import instead of dynamic require for router**
- **Found during:** Task 2
- **Issue:** Initial test used `require('./analyze-food')` inside a helper function. In vitest's ESM+transform mode, `require` inside function bodies does not get the mocked module — `vi.mock` hoisting only works with static `import` at module top level.
- **Fix:** Changed to `import analyzeFoodRouter from './analyze-food'` at module top level. The single `buildApp()` function now mounts the same router instance per test (sufficient for TDD stubs).
- **Files modified:** apps/backend/src/routes/analyze-food.test.ts

**3. [Rule 3 - Blocking] Worktree required pnpm install for node_modules**
- **Found during:** Task 2
- **Issue:** The git worktree had no `node_modules`; vitest binary and module resolution failed. Copied updated `pnpm-lock.yaml` from main repo to worktree and ran `pnpm install --frozen-lockfile` in the worktree root.
- **Fix:** Worktree now has its own `node_modules` symlinked via pnpm. The `pnpm-lock.yaml` in the worktree reflects the new dependencies.
- **Files modified:** pnpm-lock.yaml (in worktree)

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundaries introduced. The `.env.example` contains only the placeholder value `your_key_here` — safe to commit. The `.env` file (with real key) is already covered by `.gitignore` (threat T-01-01 mitigated as planned).

## Known Stubs

None. This plan creates test stubs (intentional RED state) but no production code stubs. The `analyze-food.ts` mock route is unchanged — it is the subject of Wave 2 (plan 01-02) replacement.

## Self-Check: PASSED

- `apps/backend/vitest.config.ts` — FOUND
- `apps/backend/src/routes/analyze-food.test.ts` — FOUND
- `apps/backend/.env.example` — FOUND
- Commit 09548e9 — FOUND
- Commit 58cca9c — FOUND
