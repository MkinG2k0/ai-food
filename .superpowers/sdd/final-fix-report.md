# Final Fix Report

## recordUsageEvent — non-OK response handling

- **Finding:** `recordUsageEvent.ts` did not check `response.ok`; 4xx/5xx silently dropped manual/barcode analytics.
- **Fix:** After `fetch`, throw `Error` with status when `!response.ok` (caught by existing `catch` → `console.warn`).
- **Status:** Fixed
- **Commit:** `140a24b` — `fix(ai-food): treat non-OK usage event responses as failures`
- **Tests:** 2/2 passed (`recordUsageEvent.test.ts`: 200 OK no warn; 503 triggers warn path)
- **Paths:**
  - `apps/ai-food/src/features/auth/api/recordUsageEvent.ts`
  - `apps/ai-food/src/features/auth/api/recordUsageEvent.test.ts`

## Onboarding — auth hydration race

- **Finding:** Cold-start profile restore ran before the auth store had hydrated and did not retry when the token appeared.
- **Fix:** `OnboardingPage` now waits for both profile and auth hydration; the effect depends on both hydration states.
- **Regression test:** Covers the `authHydrated: false -> true` transition and verifies that `/auth/me` is not requested early.
- **Status:** Fixed
- **Tests:**
  - `pnpm --dir apps/ai-food exec vitest run src/features/onboarding/ui/OnboardingPage.test.tsx` — PASS (1/1)
  - `pnpm --dir apps/ai-food type-check` — PASS

## Admin overview charts — Ant Design Plots v2 API

- **Finding:** Chart series, tooltip formatter, and hidden axes used v1-style props ignored by `@ant-design/plots@2`.
- **Fix:** Added `colorField`, migrated tooltip to G2 v5 `valueFormatter`, and replaced axis props with `axis={{ x: false, y: false }}`. The chart trigger has an accessible label; unused local `Stats` fields were removed.
- **Status:** Fixed
- **Test:** `pnpm --filter ai-web type-check` — PASS (exit 0).
- **Concern:** `antd@5.24.2` does not support `destroyOnHidden`, so the existing `destroyOnClose` remains for equivalent modal teardown behavior.
