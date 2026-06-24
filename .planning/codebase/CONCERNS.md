# Codebase Concerns

**Analysis Date:** 2026-06-24

## Tech Debt

**Design spec drift (MVP doc vs implementation):**
- Issue: `docs/superpowers/specs/2026-06-24-ai-food-mvp-design.md` describes Capacitor, bottom nav, `useDiary()` stub, `staleTime: 30s` on `useAnalyzeFood`, and a request interceptor on the Axios client — none are fully implemented.
- Files: `docs/superpowers/specs/2026-06-24-ai-food-mvp-design.md`, `apps/mobile/src/features/add-food/ui/ImagePicker.tsx`, `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts`, `apps/mobile/src/shared/api/client.ts`, `apps/mobile/src/app/router.tsx`, `apps/mobile/src/pages/home/ui/HomePage.tsx`
- Impact: Future phases may assume Capacitor/mobile shell, navigation patterns, or caching behavior that does not exist; onboarding from the spec misleads implementers.
- Fix approach: Update the spec to match current scope, or implement the missing pieces in dedicated phases. Track deltas explicitly in planning docs.

**`useDiaryStore` layer relocation (partial migration):**
- Issue: Diary state lives in `apps/mobile/src/entities/meal/model/useDiaryStore.ts` (correct FSD placement), but `docs/superpowers/plans/2026-06-24-ai-food-mvp.md` still references `apps/mobile/src/features/save-meal/model/useDiaryStore.ts`. The `save-meal` feature now only exports `useSaveMeal` from `apps/mobile/src/features/save-meal/index.ts`.
- Files: `apps/mobile/src/entities/meal/model/useDiaryStore.ts`, `apps/mobile/src/features/save-meal/model/useSaveMeal.ts`, `docs/superpowers/plans/2026-06-24-ai-food-mvp.md`
- Impact: Plan-driven work may recreate duplicate stores or import from obsolete paths.
- Fix approach: Update the plan doc; delete or redirect any stale references. Keep a single store in `entities/meal`.

**Hardcoded product constants:**
- Issue: Daily calorie goal (`2000`), macro chart maxima (protein 60g, carbs 150g, etc.), and fixed portion string `'1 serving'` are embedded in UI/save logic.
- Files: `apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx`, `apps/mobile/src/widgets/nutrition-card/ui/NutritionCard.tsx`, `apps/mobile/src/features/save-meal/model/useSaveMeal.ts`
- Impact: Personalization and accurate macro visualization require scattered edits; easy to miss a location.
- Fix approach: Centralize in `shared/lib` config or a `entities/user-settings` slice when user profiles arrive.

**Dead API surface on diary store:**
- Issue: `clearDiary()` is implemented and tested but never exposed in UI.
- Files: `apps/mobile/src/entities/meal/model/useDiaryStore.ts`, `apps/mobile/src/entities/meal/model/useDiaryStore.test.ts`, `apps/mobile/src/pages/diary/ui/DiaryPage.tsx`
- Impact: Users cannot reset diary; feature exists only in tests.
- Fix approach: Add diary settings/clear action on `DiaryPage` or a settings screen.

**Sonner toaster mounted but unused:**
- Issue: `<Toaster />` is rendered in `apps/mobile/src/app/providers.tsx`, but no `toast()` calls exist anywhere in `apps/mobile/`.
- Files: `apps/mobile/src/app/providers.tsx`, `apps/mobile/package.json`
- Impact: Dead dependency wiring; save/error flows give no user feedback beyond inline UI.
- Fix approach: Call `toast.success` in `useSaveMeal` and `toast.error` on analysis failure, or remove Sonner until needed.

**React Query Devtools in production bundle:**
- Issue: `ReactQueryDevtools` is unconditionally imported in `apps/mobile/src/app/providers.tsx`.
- Files: `apps/mobile/src/app/providers.tsx`
- Impact: Production build is ~366 KB JS (`vite build` output); devtools add weight and expose query internals in prod.
- Fix approach: Lazy-load devtools behind `import.meta.env.DEV` or a dedicated dev entry.

**No lint/format toolchain:**
- Issue: No ESLint, Prettier, or Biome config anywhere in the repo.
- Files: root `package.json`, `apps/mobile/package.json`, `apps/backend/package.json`
- Impact: Style and import-rule violations (e.g. `.cursor/rules/index-reexports.mdc`) are not enforced; drift accumulates silently.
- Fix approach: Add ESLint + Prettier (or Biome) at monorepo root with FSD/import rules.

**Barrel-export rule not enforced:**
- Issue: `.cursor/rules/index-reexports.mdc` documents barrel imports, but tooling does not enforce it.
- Files: `.cursor/rules/index-reexports.mdc`, all cross-slice imports under `apps/mobile/src/`
- Impact: Direct deep imports may appear without review catching them.
- Fix approach: ESLint `no-restricted-imports` aligned with the rule file.

## Known Bugs

**Nutrition data loss on save:**
- Symptoms: `fiber` and `confidence` from `NutritionResult` are displayed on the result screen but not persisted into `FoodItem` / `Meal`.
- Files: `packages/shared-types/src/index.ts`, `apps/mobile/src/features/save-meal/model/useSaveMeal.ts`, `apps/mobile/src/widgets/nutrition-card/ui/NutritionCard.tsx`
- Trigger: Save any analyzed meal and inspect stored `Meal` in Zustand/localStorage — `FoodItem` has no `fiber` or `confidence` fields.
- Workaround: None; data is discarded at save time.

**Manual `Content-Type` on multipart upload:**
- Symptoms: `analyzeFoodApi` sets `headers: { 'Content-Type': 'multipart/form-data' }` without a boundary. Axios normally sets boundary automatically; manual header can break parsing on strict servers.
- Files: `apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts`
- Trigger: POST `/analyze-food` against a server that requires correct multipart boundaries (works today with permissive mock multer).
- Workaround: Mock backend currently accepts uploads; may fail when switching to real AI service.

**`useAnalyzeFood` error typing mismatch:**
- Symptoms: Axios interceptor normalizes errors to `ApiError`, but `useAnalyzeFood` declares `useQuery<AnalyzeFoodResponse, Error>`. Callers cannot access `status` or `code` without casting.
- Files: `apps/mobile/src/shared/api/client.ts`, `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts`, `apps/mobile/src/pages/result/ui/ResultPage.tsx`
- Trigger: Any non-2xx API response.
- Workaround: `ResultPage` only shows generic "Analysis failed" message.

**Mock `processingTime` does not reflect actual delay:**
- Symptoms: Backend returns fixed `processingTime: 2100` while actual `setTimeout` delay is random 1500–3000 ms.
- Files: `apps/backend/src/routes/analyze-food.ts`
- Trigger: Every analyze request.
- Workaround: None for consumers relying on accurate timing metrics.

## Security Considerations

**Wide-open CORS on backend:**
- Risk: `app.use(cors())` in `apps/backend/src/index.ts` allows any origin — acceptable for local mock, unsafe if deployed publicly.
- Files: `apps/backend/src/index.ts`
- Current mitigation: Intended as local-only mock server.
- Recommendations: Restrict origins via env config before any non-local deployment.

**Unbounded file upload (multer memory storage):**
- Risk: `multer.memoryStorage()` with no `limits` accepts arbitrarily large files into memory — DoS vector.
- Files: `apps/backend/src/routes/analyze-food.ts`
- Current mitigation: None.
- Recommendations: Add `limits: { fileSize: N }`, reject non-image MIME types, stream or discard buffer promptly.

**No upload validation on client:**
- Risk: `ImagePicker` accepts any `image/*` file with no size check before upload.
- Files: `apps/mobile/src/features/add-food/ui/ImagePicker.tsx`, `apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts`
- Current mitigation: None.
- Recommendations: Client-side max size, optional resize/compress before POST.

**Diary persisted in localStorage unencrypted:**
- Risk: Meal history readable/clearable by any script on the origin; no user isolation.
- Files: `apps/mobile/src/entities/meal/model/useDiaryStore.ts` (Zustand `persist` middleware, key `ai-food-diary`)
- Current mitigation: Acceptable for single-user MVP with no auth.
- Recommendations: When auth arrives, move to server-side storage; add `version`/`migrate` to persist config for schema changes.

**Default API URL hardcoded to localhost:**
- Risk: Production builds fall back to `http://localhost:3001` if `VITE_API_URL` is unset.
- Files: `apps/mobile/src/shared/api/client.ts`
- Current mitigation: Env var hook exists (`import.meta.env.VITE_API_URL`).
- Recommendations: Fail build or show explicit error in prod when env is missing; document required vars (no `.env.example` in repo).

## Performance Bottlenecks

**Full-resolution images uploaded without compression:**
- Problem: Entire `File` from the picker is POSTed as-is.
- Files: `apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts`, `apps/mobile/src/features/add-food/model/useImageStore.ts`
- Cause: No resize/compress step before `FormData.append`.
- Improvement path: Canvas-based downscale or `browser-image-compression` before upload; especially important on mobile networks.

**`useAnalyzeFood` refetches on every `/result` visit:**
- Problem: Hook sets `staleTime: 0`, overriding global `30_000` in `apps/mobile/src/shared/lib/queryClient.ts`.
- Files: `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts`, `apps/mobile/src/shared/lib/queryClient.ts`
- Cause: Per-hook `staleTime: 0` forces refetch even when the same image was just analyzed.
- Improvement path: Align with spec (`staleTime: 30_000`) or use `staleTime: Infinity` for immutable file analysis.

**Synchronous localStorage writes on each meal save:**
- Problem: Zustand `persist` serializes full `meals` array on every `addMeal`.
- Files: `apps/mobile/src/entities/meal/model/useDiaryStore.ts`
- Cause: Default persist behavior; array grows unbounded.
- Improvement path: Cap history, paginate diary, or move to IndexedDB for larger datasets.

**Backend `setTimeout` without request lifecycle handling:**
- Problem: Delayed response still fires if client disconnects; holds closure until timeout.
- Files: `apps/backend/src/routes/analyze-food.ts`
- Cause: No `req.on('close')` cleanup or abort signal.
- Improvement path: Clear timeout on client disconnect; use `AbortController` pattern when moving to real AI.

## Fragile Areas

**`ResultPage` redirect guard:**
- Files: `apps/mobile/src/pages/result/ui/ResultPage.tsx`
- Why fragile: `useEffect` redirects to `/add` when `selectedImage` is null — race with navigation after `clearImage()` in `useSaveMeal` could flash wrong state or double-navigate.
- Safe modification: Gate render on `selectedImage`, use router state for result payload, or defer `clearImage` until after navigation.
- Test coverage: No page-level tests.

**Date filtering for "today" uses local `toDateString()`:**
- Files: `apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx`, `apps/mobile/src/widgets/meal-list/ui/MealList.tsx`
- Why fragile: Meals saved near midnight or across timezones may appear on wrong day; `timestamp` is ISO UTC but comparison uses local date strings.
- Safe modification: Use date-fns/dayjs with explicit timezone or store local date key on `Meal`.
- Test coverage: No tests for today-filter logic.

**Cross-feature import in `useSaveMeal`:**
- Files: `apps/mobile/src/features/save-meal/model/useSaveMeal.ts` (imports `@/features/add-food` and `@/entities/meal`)
- Why fragile: Orchestrates navigation, image store, and diary store — single hook is the integration point; changes to any dependency break save flow.
- Safe modification: Add integration test for save flow; consider moving orchestration to a page-level handler.
- Test coverage: `useSaveMeal` has zero tests.

**Zustand persist without schema version:**
- Files: `apps/mobile/src/entities/meal/model/useDiaryStore.ts`
- Why fragile: Changing `Meal` shape in `packages/shared-types/src/index.ts` can corrupt or crash hydrated state.
- Safe modification: Add `version` and `migrate` to persist options before schema changes.
- Test coverage: Unit tests reset state manually; no migration tests.

**Query key collision risk:**
- Files: `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts`
- Why fragile: `queryKey` uses `image?.name`, `image?.size`, `image?.lastModified` — two different files with identical metadata share cache.
- Safe modification: Include a stable unique id at pick time (e.g. `crypto.randomUUID()` in `useImageStore`).
- Test coverage: Not covered.

## Scaling Limits

**In-memory diary (localStorage):**
- Current capacity: Unbounded `meals[]` array in browser storage (typically 5–10 MB per origin).
- Limit: Large histories slow hydration and risk `QuotaExceededError`.
- Scaling path: Backend persistence, pagination, IndexedDB.

**Single mock response for all foods:**
- Current capacity: One hardcoded `MOCK_RESPONSE` in `apps/backend/src/routes/analyze-food.ts`.
- Limit: No variety, no multi-item meals, no portion editing — blocks realistic UX testing.
- Scaling path: Response variants, image-hash-based mocks, then real AI integration.

**Monorepo test scope:**
- Current capacity: Only `@ai-food/mobile` defines a `test` script; `turbo test` runs 15 tests in 4 files.
- Limit: Backend and integration paths unverified in CI.
- Scaling path: Add backend route tests, API contract tests, Playwright E2E.

## Dependencies at Risk

**`multer@1.4.5-lts.1`:**
- Risk: Legacy LTS line; memory-storage pattern does not scale.
- Impact: Upload handling must be reworked for production AI pipeline.
- Migration plan: Replace with busboy/direct SDK upload to object storage when adding real backend.

**No Capacitor (despite design spec):**
- Risk: Spec and README imply React + Capacitor mobile app; implementation is Vite SPA with `<input type="file" capture>`.
- Impact: Native camera permissions, app store distribution, and offline behavior are unaddressed.
- Migration plan: Add `@capacitor/core` + platform packages; replace `ImagePicker` web fallback with Camera API.

## Missing Critical Features

**`useDiary()` TanStack Query stub:**
- Problem: Design spec defines `useDiary()` as future backend hook; not implemented — all diary reads go directly to Zustand.
- Blocks: Swapping local storage for API without touching every consumer (`DailyHeader`, `MealList`, `DiaryPage`).

**Backend persistence and auth:**
- Problem: No database, no user accounts, no meal sync (explicit non-goals in spec but required for production).
- Blocks: Multi-device use, data recovery, GDPR-compliant deletion.

**CI/CD pipeline:**
- Problem: No `.github/workflows`, no automated test/build on PR.
- Blocks: Regression safety as team or scope grows.

**Environment documentation:**
- Problem: `.env` is gitignored (`.gitignore`) but no `.env.example` documents `VITE_API_URL` or `PORT`.
- Blocks: Reproducible deploys and onboarding without reading source.

## Test Coverage Gaps

**Backend (`apps/backend/`):**
- What's not tested: `POST /analyze-food`, multer parsing, CORS, `/health`, delay behavior.
- Files: `apps/backend/src/index.ts`, `apps/backend/src/routes/analyze-food.ts`
- Risk: Route regressions ship unnoticed; `package.json` has no `test` script.
- Priority: High (before real AI swap)

**Pages and widgets:**
- What's not tested: `HomePage`, `AddFoodPage`, `ResultPage`, `DiaryPage`, `MealList`, `DailyHeader`, `NutritionCard`, `ImagePicker`.
- Files: `apps/mobile/src/pages/**`, `apps/mobile/src/widgets/**`
- Risk: Navigation flows, empty states, and error UI break without detection.
- Priority: Medium

**`useSaveMeal` hook:**
- What's not tested: Meal construction, navigation, image clear orchestration.
- Files: `apps/mobile/src/features/save-meal/model/useSaveMeal.ts`
- Risk: ID generation, calorie mapping, or navigation regressions.
- Priority: Medium

**API client and `analyzeFoodApi`:**
- What's not tested: Interceptor error shaping, FormData construction, timeout behavior.
- Files: `apps/mobile/src/shared/api/client.ts`, `apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts`
- Risk: Production API integration surprises.
- Priority: Medium

**E2E flows:**
- What's not tested: Full flow Home → Add → Result → Save → Diary.
- Files: N/A (no Playwright/Cypress config)
- Risk: Integration breaks between router, stores, and query hook.
- Priority: Medium (before release)

**Persist middleware / hydration:**
- What's not tested: localStorage round-trip, corrupt data handling, `clearDiary` in persisted state.
- Files: `apps/mobile/src/entities/meal/model/useDiaryStore.ts`
- Risk: Production users with stale persisted shape crash on load.
- Priority: Low (until schema changes)

---

*Concerns audit: 2026-06-24*
