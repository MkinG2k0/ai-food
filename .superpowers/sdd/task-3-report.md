# Task 3 Report: CTA, Nav, Hero

**Status:** DONE  
**Branch:** feat/ai-food-landing  
**Commit:** `e07edcd` — feat(ai-web): add landing nav, hero, and CTA buttons

## Changes

### Created
- `apps/ai-web/src/components/landing/CtaButtons.tsx` — primary/secondary CTAs with `dark`/`light` variants
- `apps/ai-web/src/components/landing/LandingNav.tsx` — sticky nav, anchor links, lime CTA
- `apps/ai-web/src/components/landing/LandingHero.tsx` — hero section with glow, headline split, light CTA row

### Modified
- `apps/ai-web/src/app/globals.css` — appended `.lp-nav*`, `.lp-hero*`, hero entrance animation + reduced-motion guard

## Verification

| Check | Result |
|-------|--------|
| `pnpm --filter ai-web type-check` | PASS (exit 0) |
| Brief TSX verbatim | OK |
| Brief CSS appended | OK |
| No barrel / page.tsx wiring | OK (Task 6) |
| No Ant Design | OK |

## Self-review

- **CtaButtons:** Uses `landingConfig` URLs and `landingContent.hero` labels; variant classes match Task 2 button tokens.
- **LandingNav:** Nav items from config; mobile hides links at 720px; external links have `rel="noopener noreferrer"`.
- **LandingHero:** Headline split on `\n`; `id="top"` for nav anchor; `CtaButtons variant="light"` on dark gradient.
- **CSS:** Hero animation delays skip glow (child 1); `--lp-*` vars require `.lp-page` wrapper — expected until Task 6.
- **No concerns** blocking downstream tasks.

## Files touched

- `apps/ai-web/src/components/landing/CtaButtons.tsx`
- `apps/ai-web/src/components/landing/LandingNav.tsx`
- `apps/ai-web/src/components/landing/LandingHero.tsx`
- `apps/ai-web/src/app/globals.css`
