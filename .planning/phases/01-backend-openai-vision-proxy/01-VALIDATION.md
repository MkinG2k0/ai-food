---
phase: 1
slug: backend-openai-vision-proxy
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-24
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (already installed in `apps/mobile`; backend has no test framework yet) |
| **Config file** | `apps/backend/vitest.config.ts` — Wave 0 creates |
| **Quick run command** | `pnpm --filter @ai-food/backend test --run` |
| **Full suite command** | `pnpm --filter @ai-food/backend test --run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @ai-food/backend test --run`
- **After every plan wave:** Run `pnpm --filter @ai-food/backend test --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | — | — | N/A | infra | `pnpm --filter @ai-food/backend test --run` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | AI-01 | — | API key not in response | unit | `pnpm --filter @ai-food/backend test --run` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | AI-02 | — | NutritionResult fields present | unit | `pnpm --filter @ai-food/backend test --run` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | ERR-03 | — | Typed error codes returned | unit | `pnpm --filter @ai-food/backend test --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/backend/vitest.config.ts` — Vitest config for backend
- [ ] `apps/backend/src/routes/analyze-food.test.ts` — stubs for AI-01, AI-02, ERR-03
- [ ] `apps/backend/package.json` — add vitest dev dependency

*Tests will mock the OpenAI SDK to avoid real API calls in CI.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real food photo triggers correct КБЖУ estimate | AI-01, AI-02 | Requires real OpenAI API key and real image | Run `pnpm dev`, upload food photo via frontend, verify non-zero result |
| INVALID_IMAGE returned for non-food file | ERR-03 | Requires real API call | Upload a text file or blank image, verify error code |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
