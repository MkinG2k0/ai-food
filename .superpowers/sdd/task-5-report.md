# Task 5 Report: Pricing, FAQ, Final CTA, Footer

**Status:** DONE  
**Branch:** feat/ai-food-landing  
**Commit:** `21962aa` — feat(ai-web): add pricing, FAQ, final CTA, and footer

## Changes

### Created
- `apps/ai-web/src/components/landing/LandingPricing.tsx` — free/paid cards, CtaButtons, muted section
- `apps/ai-web/src/components/landing/LandingFaq.tsx` — native `<details>` accordion with numbered summaries
- `apps/ai-web/src/components/landing/LandingFinalCta.tsx` — gradient CTA block with light-variant buttons
- `apps/ai-web/src/components/landing/LandingFooter.tsx` — legal links, seller block, copyright

### Modified
- `apps/ai-web/src/app/globals.css` — appended `.lp-pricing*`, `.lp-faq*`, `.lp-final*`, `.lp-footer*` + responsive breakpoint

## Verification

| Check | Result |
|-------|--------|
| `pnpm --filter ai-web type-check` | PASS (exit 0) |
| Brief TSX verbatim | OK |
| Brief CSS appended | OK |
| No ₽ prices in content | OK (price deferred to app) |
| FAQ uses native `<details>` | OK |
| Reuses CtaButtons + legalConfig | OK |
| No barrel / page.tsx wiring | OK (Task 6) |
| No Ant Design | OK |

## Self-review

- **LandingPricing:** Two-column grid; accent card uses `--lp-ink`; `id="pricing"` from content.
- **LandingFaq:** 8 items; zero-padded index; `summary` marker hidden via CSS.
- **LandingFinalCta:** Centered layout; `CtaButtons variant="light"`.
- **LandingFooter:** Next.js `Link` for legal routes; external Telegram support link; `formatSellerBlock()` for seller info.
- **No concerns** blocking downstream Task 6 wiring.

## Files touched

- `apps/ai-web/src/components/landing/LandingPricing.tsx`
- `apps/ai-web/src/components/landing/LandingFaq.tsx`
- `apps/ai-web/src/components/landing/LandingFinalCta.tsx`
- `apps/ai-web/src/components/landing/LandingFooter.tsx`
- `apps/ai-web/src/app/globals.css`
