# SUMMARY — Scan analyze retry resilience (260923)

**Status:** Complete — merge-ready after fix wave (uncommitted on `fix/qa-remediation-a-d`)  
**Plan:** `260923-PLAN.md`

## Delivered

### Product
- `ANALYZING_STALE_MS = 20_000` (was 45s) — single export from `mealAnalyzeUi.ts`
- Stale «Повторить» now appears **even when `analyzeJobId` is set** (MealCard timer bug fixed)
- Clicking stale Retry resets UI via `retryGeneration` (loader again, fresh 20s timer)
- `ANALYSIS_TIMEOUT` is UI-terminal (`TERMINAL_ANALYZE_ERROR_CODES`) + clears `analyzeJobId` in `analyzeErrorPatch` → Retry immediately
- `useRetryAnalyzeMeal` clears leftover `analyzeJobId` on retry start
- `endMealAnalyze(mealId, signal)` is attempt-aware (aborted attempt cannot unregister the new retry)

### Tests
- Unit: `mealAnalyzeUi`, `MealCard` (fake timers + jobId), `analyzeErrorPatch`, `useRetryAnalyzeMeal`, `resumePendingAnalyzes` — **28/28** focused vitest pass
- E2E: `e2e/analyze-resilience.spec.ts` E1–E7 — **7/7**; full Playwright suite **41/41**
- Fixtures: gateway modes `hang` / `slowSuccess` / `timeoutError` / `failThenSuccess`; `e2e/fixtures/network.ts` (offline + Slow 3G CDP)

## Scenarios covered
| # | Scenario |
|---|----------|
| E1 | Hang → stale Retry @ 20s |
| E2 | Retry → success (`failThenSuccess`) |
| E3 | Offline mid-analyze |
| E4 | Slow 3G → ready |
| E5 | Reload mid-analyze (kill/reopen sim) |
| E6 | ANALYSIS_TIMEOUT → immediate Retry |
| E7 | INVALID_INPUT Retry regression |

## Out of scope / follow-ups
- Native APK process kill (Detox) — simulated via `page.reload` + persist
- Server SSE/job deadline still 120s (client UX independent)
- Hang mock cannot stream headers while holding body open (Playwright limitation); stale path still covered without jobId during hold

## SDD ledger
`.superpowers/sdd/progress-260923-scan-retry.md` — Tasks 1–5 review clean
