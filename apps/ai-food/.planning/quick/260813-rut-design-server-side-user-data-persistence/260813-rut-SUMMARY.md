---
phase: 260813-rut
plan: 01
subsystem: docs
tags: [user-data-sync, design, diary, prisma-sketch, LWW, offline-first]

requires: []
provides:
  - "docs/USER-DATA-SYNC.md — server-side user data persistence design"
  - "AI-GATEWAY see-also link to USER-DATA-SYNC"
affects: [future-diary-sync-implementation]

actuals:
  tokens: 2525
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: [design-doc-before-sync-API, bulk-sync-LWW-offline-first]

key-files:
  created:
    - apps/ai-food/docs/USER-DATA-SYNC.md
  modified:
    - apps/ai-food/docs/AI-GATEWAY.md

key-decisions:
  - "P0 diary via POST /user/meals/sync bulk + Prisma Meal sketch (no code this task)"
  - "Default conflict strategy: LWW on clientUpdatedAt for whole-meal documents"
  - "micronutrientTargets confirmed local-only in ai-food-profile; NutritionProfilePayload is profile+DailyTargets only"
  - "Sync must not gate behind subscription (diary/settings free forever)"

patterns-established:
  - "User-data design lives in ai-food/docs; implementation later in ai-app + client"
  - "X-User-Token user scoping required for any future diary sync"

requirements-completed: [QUICK-260813-rut]

coverage:
  - id: D1
    description: "USER-DATA-SYNC.md with inventory, gaps, P0 sketch, LWW, client-only, rollout, out-of-scope"
    requirement: QUICK-260813-rut
    verification:
      - kind: other
        ref: "Select-String Inventory|P0|LWW|client-only|Out of scope|Phase on USER-DATA-SYNC.md"
        status: pass
    human_judgment: false
  - id: D2
    description: "micronutrientTargets gap accurate + AI-GATEWAY see-also link"
    requirement: QUICK-260813-rut
    verification:
      - kind: other
        ref: "Select-String USER-DATA-SYNC|micronutrientTargets on both docs"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-08-13
status: complete
---

# Phase 260813-rut Plan 01: Server-side user data persistence design Summary

**Design doc `USER-DATA-SYNC.md` locks inventory/gaps/P0 bulk meal sync + LWW and confirms `micronutrientTargets` stay client-only until a future sync.**

## Performance

- **Duration:** ~8 min
- **Tasks:** 2/2
- **Commits:** 2

## Accomplishments

- Wrote `apps/ai-food/docs/USER-DATA-SYNC.md` — inventory, P0–P3 gaps, Prisma Meal + `POST /user/meals/sync` sketch, LWW, client-only list, phased A→E rollout, explicit out-of-scope
- Spot-checked `useProfileStore.micronutrientTargets` vs `NutritionProfilePayload`; linked from `AI-GATEWAY.md` «См. также»
- No Prisma Meal models, Express routes, or client sync hooks added

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `812728c` | docs(260813-rut): add USER-DATA-SYNC design |
| 2 | `5f4f6b2` | docs(260813-rut): micronutrientTargets gap + AI-GATEWAY link |

## Deviations from Plan

None - plan executed exactly as written (SUMMARY filename `260813-rut-SUMMARY.md` per orchestrator, not `260813-rut-01-SUMMARY.md`).

## Auth Gates

None.

## Known Stubs

None — design-only; intentional “not implemented” notes are documentation, not code stubs.

## Self-Check: PASSED

- FOUND: `apps/ai-food/docs/USER-DATA-SYNC.md`
- FOUND: `apps/ai-food/docs/AI-GATEWAY.md` references USER-DATA-SYNC
- FOUND: commit `812728c`
- FOUND: commit `5f4f6b2`
- CONFIRMED: no `model Meal` / meal routes under `apps/ai-app`
