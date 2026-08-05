# Task 6 Report: Compose page, barrel, cleanup stub, verify

**Status:** DONE  
**Branch:** feat/ai-food-landing  
**Commit:** `4b072e6` — feat(ai-web): ship Herb Lab marketing landing on /

## Changes

### Created
- `apps/ai-web/src/components/landing/index.ts` — barrel re-exporting all 10 landing components

### Modified
- `apps/ai-web/src/app/page.tsx` — full landing composition inside `.lp-page` wrapper; stub «Скоро» removed
- `apps/ai-web/src/app/globals.css` — removed obsolete `.landing` stub rules

## Verification

| Check | Result |
|-------|--------|
| `pnpm --filter ai-web type-check` | PASS (exit 0) |
| `pnpm --filter ai-web build` | PASS (exit 0); `/` static (171 B) |
| «Скоро» absent from `page.tsx` | OK (grep: no matches) |
| CTA URLs not hardcoded in `page.tsx` | OK (no URLs; CTAs via `landingConfig` in components) |
| Brief TSX verbatim | OK |
| Stub `.landing` CSS removed | OK |
| `/admin/login` route in build | OK (static) |

## Grep summary

- `page.tsx`: no «Скоро», no `webAppUrl`/`ruStoreUrl`/hardcoded URLs
- CTA links remain in `CtaButtons.tsx` + `LandingNav.tsx` via `landingConfig`

## Manual smoke

Not run in this session (requires `pnpm --filter ai-web dev`). Build output confirms `/` prerendered; downstream manual checklist from brief still recommended.

## Self-review

- **page.tsx:** Nav → main (Hero, HowItWorks, Features, Compare, Pricing, FAQ, FinalCta) → Footer; matches spec section map.
- **Barrel:** All components exported; `CtaButtons` available but not imported in page (used internally by sections).
- **No concerns** blocking merge.

## Files touched

- `apps/ai-web/src/components/landing/index.ts`
- `apps/ai-web/src/app/page.tsx`
- `apps/ai-web/src/app/globals.css`

---

## Final review fix: Cyrillic fonts (post Task 6)

**Status:** DONE  
**Commit:** `e09c2e4` — fix(ai-web): use Lora and Manrope for Cyrillic landing fonts

### Problem
Fraunces and DM Sans lack Cyrillic glyphs; Russian landing fell back to Georgia/system-ui.

### Fix
- `layout.tsx`: Fraunces → **Lora** (`--font-lp-display`), DM Sans → **Manrope** (`--font-lp-sans`); subsets `['cyrillic', 'latin', 'latin-ext']`, `display: 'swap'`
- `globals.css` (minor): FAQ chevron `::after` "▸" rotates on `[open]`

### Verification

| Check | Result |
|-------|--------|
| `pnpm --filter ai-web type-check` | PASS (exit 0) |
| `pnpm --filter ai-web build` | PASS (exit 0) |

### Concerns
None.
