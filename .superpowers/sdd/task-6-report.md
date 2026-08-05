# Task 6 Report: Promos section on pricing page

**Status:** DONE  
**Branch:** `feat/admin-promo-codes`  
**Commit:** `a7edee6` — feat(ai-web): manage promo codes on pricing page

## Summary

- Added a second `Промокоды` card below the existing pricing card.
- Added promo list loading through `GET promos`.
- Added promo creation form with required code and integer discount validation from 1 to 99.
- Added promo deletion with confirmation through `DELETE promos/${id}`.
- Added success/error notifications and promo query invalidation after mutations.

## Verification

- `pnpm --filter ai-web type-check` — PASS (exit 0).
- `pnpm --filter ai-web build` — PASS (exit 0); `/admin/pricing` prerendered.
- IDE diagnostics for `apps/ai-web/src/app/admin/pricing/page.tsx` — no errors.
- Manual browser check not run; optional per brief.

## Self-review

- Compared the final diff with every UI and API requirement in the task brief.
- Only `apps/ai-web/src/app/admin/pricing/page.tsx` was included in the implementation commit.
- Existing unrelated working-tree changes were not staged or modified by the implementation.
- No blocking concerns found.
