---
phase: 260818-2so-friends-system-add-by-username-telegram-
plan: 01
subsystem: api
tags: [friends, prisma, telegram, react-query, express, ai-food, ai-app]

requires: []
provides:
  - FriendRequest Prisma model and /user/friends REST API
  - ai-food friends FSD feature with /friends routes and header bell
  - sharePhotosToFriends settings sync and profile privacy flag
affects: [social, settings-sync, daily-header]

actuals:
  tokens: 46000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Gateway /user/friends/* with verifyUserToken on every route"
    - "React Query keys friends + friendRequests with mutation invalidation"
    - "Telegram sendMessage fire-and-forget on new pending request"

key-files:
  created:
    - apps/ai-app/src/lib/friends.ts
    - apps/ai-app/src/routes/userFriends.ts
    - apps/ai-food/src/features/friends/
    - apps/ai-food/src/pages/friends/
  modified:
    - apps/ai-app/prisma/schema.prisma
    - apps/ai-app/src/lib/settingsSync.ts
    - apps/ai-app/src/app.ts
    - apps/ai-food/src/features/settings/model/useSettingsStore.ts
    - apps/ai-food/src/widgets/daily-header/ui/DailyHeader.tsx
    - apps/ai-food/src/app/router.tsx
    - apps/ai-food/src/pages/settings/ui/SettingsPage.tsx

key-decisions:
  - "Friend meals read from existing Meal sync — no photo blobs on wire (D-01)"
  - "Telegram DM only on new pending request; accept/decline in-app only (D-03)"
  - "sharePhotosToFriends default true; controls placeholder icon only, not server photos"

patterns-established:
  - "friendsApi mirrors fetchReferral: gatewayBase + getQuotaHeaders + parseError"
  - "Public friends exports via features/friends/index.ts barrel"

requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06]

coverage:
  - id: D1
    description: "POST /user/friends/request resolves @username or Telegram ID and sends Telegram DM"
    requirement: D-02
    verification:
      - kind: unit
        ref: apps/ai-app/src/routes/userFriends.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: "Friends list sorted by streak DESC; accept/decline incoming requests"
    requirement: D-05
    verification:
      - kind: unit
        ref: apps/ai-app/src/lib/friends.test.ts#sortFriendsByStreakDesc
        status: pass
    human_judgment: true
    rationale: "End-to-end accept flow and streak sort with real synced data needs two-account smoke"
  - id: D3
    description: "Friend profile shows 7-day meals KBJU, targets, weight, streak without image fields"
    requirement: D-06
    verification:
      - kind: unit
        ref: apps/ai-app/src/routes/userFriends.test.ts#returns profile without image fields
        status: pass
    human_judgment: false
  - id: D4
    description: "sharePhotosToFriends toggle in Settings syncs to gateway"
    requirement: D-01
    verification:
      - kind: unit
        ref: apps/ai-app/src/lib/friends.test.ts#parseSharePhotosToFriends
        status: pass
    human_judgment: true
    rationale: "Toggle UX and friend-side placeholder behavior needs visual check"
  - id: D5
    description: "DailyHeader bell with pending badge; guests redirected from /friends"
    requirement: D-04
    verification: []
    human_judgment: true
    rationale: "Badge count and guest redirect require logged-in UI smoke"

duration: 25min
completed: 2026-08-18
status: complete
---

# Quick 260818-2so: Friends System Summary

**Friend requests by @username or Telegram ID with streak-sorted list, in-app bell badge, Telegram DM on request, and 7-day friend profile (KBJU only, no photo blobs).**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 25

## Accomplishments

- Added `FriendRequest` model, migration, and full `/user/friends` API with auth, friendship checks, and fire-and-forget Telegram DM
- Extended settings sync with `sharePhotosToFriends` (default true) on backend and frontend
- Shipped ai-food friends feature: API client, React Query hooks, `/friends` + profile pages, header bell, settings toggle

## Task Commits

1. **Backend: FriendRequest schema + /user/friends API + Telegram DM** — `1243054` (feat)
2. **Frontend: friends feature, pages, header bell, settings toggle** — `f4595a5` (feat)
3. **Integration: query invalidation, errors, human smoke path** — `9fc5223` (test)

## Test Results

| Suite | Result |
|-------|--------|
| `apps/ai-app` `friends.test.ts` + `userFriends.test.ts` | 19 passed |
| `apps/ai-food` `friendsApi.test.ts` + `useFriendsQueries.test.ts` | 5 passed |
| Integration re-run (`userFriends.test.ts`) | 11 passed |

## Deviations from Plan

None — plan executed as written.

## Self-Check: PASSED

- SUMMARY path exists
- Commits 1243054, f4595a5, 9fc5223 found in git log

---
*Phase: 260818-2so-friends-system-add-by-username-telegram-*
*Completed: 2026-08-18*
