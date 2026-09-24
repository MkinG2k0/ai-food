# Scan / analyze resilience + Retry fix (2026-09-23)

Canonical plan: [`apps/ai-food/.planning/quick/260923-scan-analyze-retry-resilience/260923-PLAN.md`](../../../apps/ai-food/.planning/quick/260923-scan-analyze-retry-resilience/260923-PLAN.md)

## Snapshot

- **Stale Retry:** 45s → **20s** (backend analyze ~15s + network headroom).
- **Bugfix:** stale timer ignored when `analyzeJobId` set; `ANALYSIS_TIMEOUT` keeps jobId → loader forever; Retry doesn’t clear jobId.
- **Tests:** Vitest state machine + Playwright e2e (`hang`, offline, throttle, reload, Retry→success).
