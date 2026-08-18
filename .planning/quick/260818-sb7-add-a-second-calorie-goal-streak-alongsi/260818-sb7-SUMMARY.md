---
phase: 260818-sb7
plan: 01
subsystem: streak
tags: [streak, calories, friends, sync, ai-food, ai-app]

requires: []
provides:
  - Calorie-goal streak computed from ready-meal kcal vs targets.kcal
  - Stacked Запись / Норма weeks on the existing StreakSheet
  - calorieStreak nested on existing /user/streak clientStreak JSON
  - Friends list and profile show both streak lengths
affects: [streak, streak-sync, friends]

actuals:
  tokens: 42000
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Second streak track reuses logging freeze walk on a separate persist nest"
    - "Social length is clientStreak JSON, no new Prisma column or route"

key-files:
  created: []
  modified:
    - apps/ai-food/src/entities/streak/model/computeStreak.ts
    - apps/ai-food/src/features/streak/model/useStreakStore.ts
    - apps/ai-food/src/features/streak/ui/StreakSheet.tsx
    - apps/ai-food/src/features/streak-sync/model/syncStreak.ts
    - apps/ai-app/src/lib/streakSync.ts
    - apps/ai-app/src/lib/friends.ts
    - apps/ai-food/src/features/friends/ui/FriendListRow.tsx
    - apps/ai-food/src/pages/friends/ui/FriendProfilePage.tsx

key-decisions:
  - "Calories only; CALORIE_STREAK_TOLERANCE = 0.20 (D-01, D-02)"
  - "Bounds by profile.goal: gain lower, maintain both, lose upper (D-03)"
  - "Empty day never hits; today excluded until the local day closes (D-04, D-05)"
  - "Same sheet, stacked weeks Запись / Норма; separate freeze pool (D-06, D-08)"
  - "Friends list+profile show both numbers; sort still logging DESC (D-07, D-09)"

patterns-established:
  - "Nested calorieStreak persist + optional Zod on existing streak sync payload"
  - "Flame = logging, Target = calorie-goal in sheet and friends UI"

requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09]

coverage:
  - id: D1
    description: "Calorie streak hits from ready-meal kcal vs goal bounds and 20% constant"
    requirement: D-01
    verification:
      - kind: unit
        ref: apps/ai-food/src/entities/streak/model/computeStreak.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: "Today excluded from calorie length; empty day never counts; separate freezes"
    requirement: D-05
    verification:
      - kind: unit
        ref: apps/ai-food/src/entities/streak/model/computeStreak.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: "StreakSheet stacked Запись / Норма weeks and dual protection"
    requirement: D-06
    verification: []
    human_judgment: true
    rationale: "Visual stacked layout and DailyHeader chip staying logging-only need a device smoke"
  - id: D4
    description: "calorieStreak round-trips on /user/streak/sync; friends expose both numbers; sort by logging"
    requirement: D-09
    verification:
      - kind: unit
        ref: apps/ai-app/src/routes/userStreak.sync.test.ts
        status: pass
      - kind: unit
        ref: apps/ai-app/src/lib/friends.test.ts
        status: pass
    human_judgment: true
    rationale: "Friends list/profile UI with two numbers needs a logged-in smoke against a real friend"

duration: 45min
completed: 2026-08-18
status: complete
---

# Quick 260818-sb7: calorie goal streak

**Вторая серия «Норма» считается по калориям закрытых дней (±20% с границами по цели), живёт на той же шторке и видна друзьям.**

## Performance

- **Duration:** ~45 min (planner + interrupted executor + finish)
- **Tasks:** 3
- **Files:** compute/persist, StreakSheet, streak-sync, friends API/UI

## Accomplishments

- `CALORIE_STREAK_TOLERANCE = 0.20`; hit = ready meals' `totalCalories` vs `targets.kcal` and `profile.goal` (gain/maintain/lose).
- Empty day never counts; today is stripped until the local day closes.
- Nested `calorieStreak` persist with its own freeze pool (0..2, grants 7/14/30/60/100).
- Same `StreakSheet`: stacked weeks «Запись» / «Норма», dual stats and protection; DailyHeader flame stays logging.
- Existing `POST /user/streak/sync` carries `calorieStreak`; friends list and profile show both numbers; sort still logging DESC.

## Deviations

- Lose upper bound in tests is `G * 1.2` (2000 → 2400), not the verbal example 2200, so it matches D-02 20%.
- `userFriends.test.ts` fixtures updated in a follow-up commit after the main sync commit.

## Test results

- `apps/ai-food` vitest: computeStreak, useStreakStore, streakSyncMerge, friendsApi — 35 passed
- `apps/ai-app` vitest: friends, userStreak.sync, userFriends — 32 passed
