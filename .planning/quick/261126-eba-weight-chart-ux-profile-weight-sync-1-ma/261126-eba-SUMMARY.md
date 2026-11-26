---
phase: 261126-eba-weight-chart-ux-profile-weight-sync-1-ma
plan: 01
subsystem: ui
tags: [weight, chart, sync, tombstone, settings, zustand, vitest]
taiga_url: ""

requires: []
provides:
  - "Tappable own-weight fact points with Russian detail sheet (kg + date)"
  - "Confirm-delete via recordPendingDelete + weights sync deletes[]"
  - "Settings «Вес» and profile.weight follow latestWeightKg"
affects: [weight-sync, stats, settings]

actuals:
  tokens: 6832
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Mirror diary tombstone pattern on useWeightStore.pendingDeletes"
    - "Chart tap vs pan: select only when pan lock never engaged (<8px)"

key-files:
  created:
    - apps/ai-food/src/features/stats/ui/WeightEntryDetailSheet.tsx
  modified:
    - apps/ai-food/src/features/stats/model/useWeightStore.ts
    - apps/ai-food/src/features/weight-sync/model/weightSyncMerge.ts
    - apps/ai-food/src/features/weight-sync/model/syncWeightHistory.ts
    - apps/ai-food/src/features/stats/ui/WeightTrendChart.tsx
    - apps/ai-food/src/features/stats/ui/WeightProgressCard.tsx
    - apps/ai-food/src/pages/settings/ui/SettingsPage.tsx

key-decisions:
  - "Weight sync deletes reuse diary-style pendingDeletes + clear on tombstone/posted ids"
  - "Detail + confirm are two BottomSheets matching DeleteMealConfirmSheet copy style"
  - "alignProfileWeightToLog helper lives in WeightProgressCard (no new feature slice)"

patterns-established:
  - "Weight tombstones: recordPendingDelete → buildWeightSyncPayload.deletes → syncWeightsApi"
  - "Fact chart points carry WeightEntry.id for selection"

requirements-completed: [D-01, D-02, D-03, D-04]

coverage:
  - id: D1
    description: "Tap fact chart point shows exact kg and Russian date"
    requirement: D-01
    verification:
      - kind: other
        ref: "pnpm --filter ai-food type-check"
        status: pass
    human_judgment: true
    rationale: "Tap/visual sheet needs manual smoke on Stats chart"
  - id: D2
    description: "Confirm-delete removes entry from chart and local store"
    requirement: D-02
    verification:
      - kind: unit
        ref: "apps/ai-food/src/features/stats/model/useWeightStore.test.ts#recordPendingDelete"
        status: pass
    human_judgment: true
    rationale: "UI confirm flow needs manual smoke"
  - id: D3
    description: "Delete posts weights sync deletes[] and clears pendingDeletes after tombstones"
    requirement: D-03
    verification:
      - kind: unit
        ref: "apps/ai-food/src/features/weight-sync/model/syncWeightHistory.test.ts#pendingDeletes"
        status: pass
    human_judgment: false
  - id: D4
    description: "Settings Вес shows latestWeightKg; profile.weight updates on log/delete"
    requirement: D-04
    verification:
      - kind: unit
        ref: "apps/ai-food/src/features/stats/model/useWeightStore.test.ts#latestWeightKg"
        status: pass
      - kind: other
        ref: "pnpm --filter ai-food type-check"
        status: pass
    human_judgment: true
    rationale: "Settings row display needs quick visual check"

duration: 12min
completed: 2026-11-26
status: complete
---

# Phase 261126-eba Plan 01: Weight chart UX + profile weight sync Summary

**Own-weight chart points are tappable with confirm-delete through sync tombstones; Settings «Вес» tracks latest logged kg.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-11-26T07:22:00Z
- **Completed:** 2026-11-26T07:30:00Z
- **Tasks:** 3/3
- **Files modified:** 14

## Accomplishments

- Mirrored diary tombstones on weight store (`pendingDeletes` + `recordPendingDelete`) and forwarded them through `/user/weights/sync` `deletes[]`.
- Fact points on `WeightTrendChart` open `WeightEntryDetailSheet` (kg, ru-RU date, confirm delete).
- Settings «Вес» uses `latestWeightKg`; log/delete keep `profile.weight` in sync via `syncNutritionProfileToServer`.

## Task Commits

1. **Task 1 (RED): End-to-end weight delete through store and sync tombstones** - `106ac9f` (test)
2. **Task 1 (GREEN): implement weight delete tombstones** - `70a5a3f` (feat)
3. **Task 2: Tappable chart point detail sheet with confirm delete** - `01434f9` (feat)
4. **Task 3: Settings and profile.weight follow latest logged weight** - `2bc31a3` (feat)

**Plan metadata:** skipped (orchestrator commits docs; `commit_docs` not applied by executor per quick-task constraints)

## Files Created/Modified

- `apps/ai-food/src/features/stats/ui/WeightEntryDetailSheet.tsx` - Detail + confirm BottomSheets
- `apps/ai-food/src/features/stats/model/useWeightStore.ts` - pendingDeletes + recordPendingDelete
- `apps/ai-food/src/features/weight-sync/model/weightSyncMerge.ts` - deletes in buildWeightSyncPayload
- `apps/ai-food/src/features/weight-sync/model/syncWeightHistory.ts` - posts deletes, clears pending
- `apps/ai-food/src/features/stats/ui/WeightTrendChart.tsx` - tap select vs pan lock
- `apps/ai-food/src/features/stats/ui/WeightProgressCard.tsx` - selection + delete + profile align
- `apps/ai-food/src/pages/settings/ui/SettingsPage.tsx` - latestWeightKg for «Вес»
- Tests for store / merge / sync / sign-out reset

## Decisions Made

- Reused diary tombstone clear semantics (posted deletes ∪ response.tombstones).
- Friend/report charts left untouched (`interactive` / no `onPointSelect`).
- Profile calorie recalculation left out of scope per plan.

## Deviations from Plan

None - plan executed exactly as written.

## Threat Flags

None — deletes stay on existing authenticated `/user/weights/sync` surface already covered by the plan threat model.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `apps/ai-food/src/features/stats/ui/WeightEntryDetailSheet.tsx`
- FOUND: `apps/ai-food/src/features/stats/model/useWeightStore.ts` (`recordPendingDelete`)
- FOUND: commits `106ac9f`, `70a5a3f`, `01434f9`, `2bc31a3`
- FOUND: `.planning/quick/261126-eba-weight-chart-ux-profile-weight-sync-1-ma/META.json`
- FOUND: SUMMARY frontmatter `status: complete`, `taiga_url: ""`
