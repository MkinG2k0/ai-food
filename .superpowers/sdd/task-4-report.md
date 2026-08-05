# Task 4 Report: HowItWorks, Features, Compare

**Status:** DONE  
**Branch:** feat/ai-food-landing  
**Commit:** `f59b0d1` — feat(ai-web): add how-it-works, features, and compare sections

## Changes

### Created
- `apps/ai-web/src/components/landing/LandingHowItWorks.tsx` — 3-step ordered list with numbered labels
- `apps/ai-web/src/components/landing/LandingFeatures.tsx` — feature grid + decorative mock card
- `apps/ai-web/src/components/landing/LandingCompare.tsx` — two-column comparison (manual vs product)

### Modified
- `apps/ai-web/src/app/globals.css` — appended `.lp-steps*`, `.lp-features*`, `.lp-mock*`, `.lp-compare*` + responsive breakpoints

## Verification

| Check | Result |
|-------|--------|
| `pnpm --filter ai-web type-check` | PASS (exit 0) |
| Brief TSX verbatim | OK |
| Brief CSS appended | OK |
| No barrel / page.tsx wiring | OK (Task 6) |
| No Ant Design | OK |

## Self-review

- **LandingHowItWorks:** Title split on `\n`; step numbers zero-padded; `id="how"` from content.
- **LandingFeatures:** 6 items from content; mock card hardcoded (decorative, `aria-hidden`); muted section background.
- **LandingCompare:** No `id` in content — section has no anchor (consistent with brief); accent column uses `--lp-ink`.
- **CSS:** Responsive at 800px (steps), 900px (features), 700px (compare).
- **No concerns** blocking downstream tasks.

## Files touched

- `apps/ai-web/src/components/landing/LandingHowItWorks.tsx`
- `apps/ai-web/src/components/landing/LandingFeatures.tsx`
- `apps/ai-web/src/components/landing/LandingCompare.tsx`
- `apps/ai-web/src/app/globals.css`
