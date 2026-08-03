---
phase: quick-260804-3gx
plan: 01
subsystem: payments
tags: [tbank, subscription, paywall, prisma, quota, react]

requires: []
provides:
  - One-time yearly license via T-Bank (or TBANK_MOCK)
  - Quota gated by hasActiveSubscription (login ≠ unlimited)
  - Frontend /subscribe + Settings soft paywall + 402 routing
affects: [billing, auth, analyze-food]

tech-stack:
  added: []
  patterns:
    - "hasActiveSubscription = status active AND expiresAt > now"
    - "T-Bank Token: scalar fields + Password, sort keys, concat values, SHA-256"
    - "TBANK_MOCK Init → success URL; sync activates license"

key-files:
  created:
    - d:/Project/Main/ai-app/src/lib/subscription.ts
    - d:/Project/Main/ai-app/src/lib/tbank.ts
    - d:/Project/Main/ai-app/src/routes/billing.ts
    - d:/Project/Main/ai-app/prisma/migrations/20260804010000_subscription_payment/migration.sql
    - src/features/billing/api/billingApi.ts
    - src/pages/subscribe/ui/SubscribePage.tsx
    - docs/SUBSCRIPTION.md
  modified:
    - d:/Project/Main/ai-app/src/middleware/quota.ts
    - d:/Project/Main/ai-app/src/lib/quota.ts
    - d:/Project/Main/ai-app/src/routes/auth.ts
    - d:/Project/Main/ai-app/src/app.ts
    - src/pages/settings/ui/SettingsPage.tsx
    - src/app/router.tsx
    - docs/AI-GATEWAY.md

key-decisions:
  - "Device billable usage counts all analyze/refine on device (not only userId=null) so login alone cannot bypass quota"
  - "Official T-Bank Token = sorted scalar values + Password, SHA-256 hex (not key=value)"
  - "Mock sync confirms payment when TBANK_MOCK=true for local success flow"

patterns-established:
  - "Unlimited AI only via hasActiveSubscription server-side"
  - "402 → guest /login, auth /subscribe"

requirements-completed: [QUICK-260804-3gx]

coverage:
  - id: D1
    description: "Schema + hasActiveSubscription quota gate (login ≠ unlimited)"
    requirement: QUICK-260804-3gx
    verification:
      - kind: unit
        ref: "ai-app npm test -- src/lib/subscription.test.ts src/lib/quota.test.ts src/middleware/quota.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "T-Bank billing Init/mock + notification CONFIRMED idempotent activate"
    requirement: QUICK-260804-3gx
    verification:
      - kind: unit
        ref: "ai-app npm test -- src/lib/tbank.test.ts src/routes/billing.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Frontend /subscribe + Settings + 402 paywall funnel"
    requirement: QUICK-260804-3gx
    verification:
      - kind: unit
        ref: "pnpm exec vitest run src/features/billing src/features/auth/api/fetchUsage.test.ts"
        status: pass
      - kind: other
        ref: "pnpm type-check"
        status: pass
    human_judgment: true
    rationale: "Full mock pay → unlimited AI smoke needs running gateway + UI"

duration: 8min
completed: 2026-08-04
status: complete
---

# Phase quick-260804-3gx Plan 01: T-Bank yearly license + paywall Summary

**One-time 1990 ₽/365d T-Bank license in ai-app; login no longer grants unlimited AI; ai-food paywall funnel free→login→subscribe.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-08-03T23:33:31Z
- **Completed:** 2026-08-03T23:41:00Z
- **Tasks:** 3/3
- **Files modified:** ~30 across ai-app + ai-food

## Accomplishments

- Prisma `Payment` + `User.subscriptionExpiresAt`; unlimited only via `hasActiveSubscription`
- Billing API: subscribe Init/mock, Token-verified notification, status/sync
- `/subscribe` + Settings license block + 402 routing; docs updated

## Task Commits

### ai-app

1. **Task 1 RED:** `6f15ad3` — test subscription/quota gate
2. **Task 1 GREEN:** `cc016b3` — schema, subscription helpers, quota by license
3. **Task 2 RED:** `af7d95b` — test T-Bank billing
4. **Task 2 GREEN:** `281b401` — billing routes + mock Init

### ai-food

5. **Task 3:** `aced7b9` — paywall UI, 402 routing, subscription docs

**Plan metadata:** skipped (orchestrator handles docs commit)

## Files Created/Modified

### ai-app
- `prisma/schema.prisma` + migration — Payment model, subscriptionExpiresAt
- `src/lib/subscription.ts` — price/duration/hasActive/activateYearLicense
- `src/lib/tbank.ts` — Token, Init PayType=O, GetState
- `src/routes/billing.ts` — subscribe/notification/status/sync/mock confirm
- `src/middleware/quota.ts` / `src/lib/quota.ts` — auth without sub → device quota
- `src/routes/auth.ts` / `usage.ts` — public subscription fields

### ai-food
- `src/features/billing/*` — API client, status hook, 402 helper
- `src/pages/subscribe/*` — paywall + success/fail
- Settings / MealCard / MealDetail — soft + hard paywall
- `docs/SUBSCRIPTION.md`, `docs/AI-GATEWAY.md`

## Decisions Made

- Device quota counts all billable events on device (Rule 2) so authenticated users without license share guest budget correctly
- T-Bank Token uses official values-concatenation SHA-256 (Password included; nested objects excluded)
- Mock payment activation via `POST /billing/sync` on success page when `mock=1`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] Device usage count included only userId=null**
- **Found during:** Task 1
- **Issue:** Auth-without-sub recording with userId would never burn guest quota
- **Fix:** `countGuestBillableUsage` counts all analyze/refine for the device
- **Files modified:** `ai-app/src/lib/quota.ts`
- **Commit:** `cc016b3`

## Threat Flags

None beyond plan register (T-Bank Token verify, server-only secrets, amount from env).

## Known Stubs

None that block the goal. Real T-Bank keys still required for production Init (`TBANK_MOCK=false`).

## Issues Encountered

None blocking.

## User Setup Required

- [ ] Set `TBANK_TERMINAL_KEY`, `TBANK_PASSWORD`, `PUBLIC_APP_URL` in ai-app for real payments
- [ ] Or `TBANK_MOCK=true` for local/dev
- [ ] Run `npx prisma migrate deploy` on ai-app DB

## Next Phase Readiness

- Ready for manual smoke: guest 402→login, auth 402→subscribe, mock pay→unlimited AI
- Free paths (manual/barcode/stats/diary) unchanged

## Self-Check: PASSED

- FOUND: ai-app subscription/tbank/billing files and commits `6f15ad3`, `cc016b3`, `af7d95b`, `281b401`
- FOUND: ai-food billing/subscribe docs and commit `aced7b9`
- FOUND: SUMMARY path `.planning/quick/260804-3gx-one-time-t-bank-backend-ai-app-paywall-a/260804-3gx-SUMMARY.md`
