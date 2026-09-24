# Plan: QA remediation A–D

Branch: `fix/qa-remediation-a-d`  
Base: `71e9b0f` (master)  
Workspace: `d:\Project\Main\ai-food-base` (in-place feature branch)

## Global Constraints

- Work only under `apps/ai-food` and (Task 7 only) `apps/ai-app` rate-limit touch; do not change `apps/ai-web` unless needed for docs.
- Do **not** sync meal photos to the server; do **not** remove `VITE_AI_GATEWAY_API_KEY` from the client (accepted tech debt).
- Follow existing FSD patterns; barrel exports via slice `index.ts`.
- Russian UI copy for user-facing strings.
- Commits: atomic, conventional (`fix:`, `test:`, `feat:`, `chore:`); one logical change per commit preferred.
- Prefer fixing root causes over only silencing tests.
- Latest changelog date for news: read `NEWS_CHANGELOG[0].date` in `apps/ai-food/src/features/news/model/changelog.ts` (was `2026-08-25` at plan time) — e2e seed must be `>=` that date.
- After Task 3, `pnpm --filter ai-food test:e2e` must be **34 passed / 0 failed** before starting Phase B.

---

## Task 1: E2E fixtures — newsSeen seed + waitForHome race

**Phase:** A  
**Goal:** Fixtures never leave LatestNewsSheet / BootSplash intercepting clicks after `waitForHome`.

### Requirements

1. In `apps/ai-food/e2e/fixtures/seed.ts`, set default `newsSeenDate` to a date **≥** current `NEWS_CHANGELOG[0].date` (prefer importing/sharing the constant or hardcoding the same ISO date with a comment pointing at changelog).
2. Harden `waitForHome` / `dismissBlockingSheets` / `dismissNewsSheetIfPresent` in `apps/ai-food/e2e/fixtures/test.ts`:
   - Wait for BootSplash gone (`z-[100]`).
   - Then wait until news sheet either appears and can be dismissed, OR is confirmed absent after news hydration (do not dismiss too early before hydration).
   - Re-check once after FAB is visible (sheet can race after first dismiss).
3. Ensure `onboardedPage`, `diaryPage`, `loggedInPage`, `editableMealPage` still use the hardened `openHome`/`waitForHome`.
4. Fix specs that bypass fixtures:
   - `e2e/analyze-describe.spec.ts` — test «кастом-инструкции…» must call `waitForHome` (or use `onboardedPage` with settings override) before clicking FAB.
   - `e2e/favorites-flow.spec.ts` — keep `waitForHome`; ensure toggle test dismisses sheets before meal click if needed.
   - `e2e/meal-edit.spec.ts` / `e2e/diary-meal.spec.ts` — before clicking meal card, ensure no blocking overlay (call `dismissBlockingSheets` in beforeEach if fixture race remains).
5. Add or extend a focused unit/helper test only if you extract pure timing/predicate helpers; otherwise rely on e2e for this task.
6. Run `pnpm --filter ai-food test:e2e` and fix remaining overlay-related failures until green (or report remaining non-overlay failures clearly).

### Acceptance

- Default seed cannot show LatestNewsSheet for latest release.
- Raw `page.goto('/')` tests that click FAB use `waitForHome`.
- E2E suite green preferred; if blocked by unrelated failures, document them in the report.

---

## Task 2: UX — LatestNewsSheet must not trap primary CTA

**Phase:** A  
**Goal:** Product UX: cold-start news does not permanently steal pointer from FAB / meal list.

### Requirements

1. Review `LatestNewsSheet` + `HomePage` interaction (`suppressed` prop, z-index vs FAB).
2. Ensure dismissing works via backdrop / Escape / «Понятно»; primary CTA becomes usable after one dismiss.
3. Optional small UX improvement if cheap: keep sheet from covering the FAB affordance longer than needed (e.g. ensure `onClose` on backdrop dismisses and marks seen). Do **not** remove the news feature.
4. Unit test any pure helpers touched (`shouldShowLatestNews`, dismiss store).
5. Do not break e2e seed contract from Task 1.

### Acceptance

- After dismiss, FAB receives clicks.
- News still shows once per unseen release.

---

## Task 3: Vite — exclude android build intermediates from e2e webServer

**Phase:** A  
**Goal:** Stop Vite error noise `@emotion/is-prop-valid` from `android/.../intermediates/...` during Playwright webServer.

### Requirements

1. Update `apps/ai-food/vite.config.ts` (or playwright webServer config) so Android Cap sync build assets are not watched/resolved during web e2e/dev.
2. Verify e2e webServer logs no longer spam that unresolved dependency (run a short e2e or `vite` start if needed).
3. Re-run full `pnpm --filter ai-food test:e2e` — **must be 34/34** before Phase B.

### Acceptance

- No android intermediates resolution error in e2e webServer output.
- `test:e2e` → 34 passed, 0 failed.

---

## Task 4: App ErrorBoundary

**Phase:** B  
**Goal:** Uncaught React errors show recovery UI instead of blank screen.

### Requirements

1. Add `ErrorBoundary` component under `apps/ai-food/src/app/` (class or react-error-boundary pattern matching repo style — no new dep unless already present).
2. Wrap router outlet / providers so page crashes recover with Russian copy + button «На главную» (navigate `/` or reload).
3. Log error via existing `appDebugLog` if appropriate.
4. Unit test: render child that throws → fallback visible; recovery control present.
5. Export/wire via existing app composition (`providers.tsx` or `AppShell`).

### Acceptance

- Artificial throw in a child shows fallback, not white screen.
- Focused tests pass.

---

## Task 5: Peripheral e2e smoke coverage

**Phase:** B  
**Goal:** CI catches smoke regressions on friends / import / barcode / news / consent.

### Requirements

1. Add `e2e/peripheral-smoke.spec.ts` (or split files if clearer) using existing fixtures + gateway mock:
   - Guest opens `/friends` → redirected or prompted to login (match current product behavior).
   - From AddFoodSheet, navigate toward barcode/scan barcode mode (`/scan?mode=barcode` or existing path) — assert page loads without crash.
   - Open `/import-meals` as onboarded guest — shell/title visible.
   - From settings or direct `/news` — news page loads.
   - Consent: if applicable, assert ConsentGuard route `/consent` reachable or settings legal links; keep minimal.
2. Streak: if celebration sheet can block FAB, ensure fixture dismiss still works (extend `dismissBlockingSheets` if needed).
3. Keep specs fast and mock-based (no real OpenRouter).

### Acceptance

- New e2e specs pass locally with full suite still green.

---

## Task 6: Gateway abuse hardening (light)

**Phase:** B  
**Goal:** Tighten app-level API key abuse posture without removing client key.

### Requirements

1. Inspect existing quota/rate middleware in `apps/ai-app`.
2. Apply a **small** hardening: e.g. clearer rate-limit headers, slightly stricter default for unauthenticated analyze, or document-enforced check — pick the smallest meaningful code improvement that already fits patterns.
3. Add/adjust unit tests in ai-app for the change.
4. Do not redesign auth.

### Acceptance

- Gateway unit tests pass for touched files.
- Report what changed and why it reduces abuse risk.

---

## Task 7: Settings IA split

**Phase:** C  
**Goal:** Settings discoverable — ≤2 taps to backup, reminders, account.

### Requirements

1. Refactor `SettingsPage` (~1050 lines) into clearer IA without losing features:
   - Prefer accordion sections already present, OR sub-routes under `/settings/...`, OR extracted section components composed by the page.
   - Target groups: Профиль · Анализ · Данные · Аккаунт · О приложении (labels may match existing Russian copy).
2. Preserve sync/debounce behavior (`queueSettingsSync`, etc.).
3. Update e2e `settings.spec.ts` if selectors change; keep green.
4. Do not redesign visual brand; follow existing SubpageShell / Card patterns.

### Acceptance

- Settings still functional; e2e settings pass.
- Cognitive density reduced (sections collapsed by default or navigable).

---

## Task 8: Photo-local tip after login / empty images

**Phase:** C  
**Goal:** Users understand meal photos stay on-device after sync.

### Requirements

1. After successful login sync (or first time viewing a synced meal without local image), show a one-time tip/toast/banner in Russian explaining photos remain on the device where taken.
2. Persist “seen” flag in settings or a small zustand persist store (Preferences-compatible like other seen flags).
3. Unit test for “show once” logic.
4. Do not upload photos.

### Acceptance

- Tip shows at most once per install/profile.
- Copy is accurate to product policy.

---

## Task 9: Secondary feature discovery polish

**Phase:** C  
**Goal:** Friends / import slightly more discoverable.

### Requirements

1. Small, focused improvements only: e.g. empty-state hint on friends list, or clearer Settings → Data entry for import (if not already obvious after Task 7).
2. No new nav system / bottom tab bar in this task (explicitly deferred).
3. Keep changes minimal.

### Acceptance

- At least one clearer path to Friends and Import without new IA paradigm.

---

## Task 10: ESLint baseline + README e2e overlay contract

**Phase:** D  
**Goal:** `pnpm lint` does more than tsc; document e2e news overlay contract.

### Requirements

1. Add minimal ESLint flat config for `apps/ai-food` (typescript-eslint + react-hooks if deps allow; keep rules few — unused vars, hooks rules). Wire `lint` script without breaking CI catastrophically — fix only errors introduced by the config on touched files or obvious easy wins; if flood of pre-existing issues, start with warn or narrow ignore until green.
2. Update root or `apps/ai-food` README: e2e must seed `newsSeenDate >= NEWS_CHANGELOG[0].date`; `waitForHome` dismisses overlays.
3. Root `package.json` lint may stay turbo type-check OR gain filter — document which.

### Acceptance

- Lint script runs successfully under the chosen policy.
- README documents overlay contract.

---

## Execution notes for SDD

- Implementer commits after each task.
- Do not pause for human between tasks.
- Final whole-branch review after Task 10.
