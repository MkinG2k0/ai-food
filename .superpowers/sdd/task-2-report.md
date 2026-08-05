# Task 2 Report: Fonts, metadata, landing CSS foundation

**Status:** DONE  
**Branch:** feat/ai-food-landing  
**Commit:** `153393d` — feat(ai-web): add Herb Lab fonts and landing CSS tokens

## Changes

### `apps/ai-web/src/app/layout.tsx`
- Added `Fraunces` (`--font-lp-display`) and `DM_Sans` (`--font-lp-sans`) via `next/font/google` with `latin` + `latin-ext` subsets and `display: swap`
- Font CSS variables applied on `<html className={...}>`
- Updated metadata title/description per brief (Russian copy)

### `apps/ai-web/src/app/globals.css`
- Removed generic `main:not(.legal-doc)` grid centering stub
- Preserved `.legal-doc*`, `.landing`, `.admin-*` rules unchanged
- Appended Herb Lab `.lp-*` foundation: page tokens, typography, sections, buttons, CTA row, reduced-motion guard

## Verification

| Check | Result |
|-------|--------|
| `pnpm --filter ai-web type-check` | PASS (exit 0) |
| Brief layout.tsx verbatim | OK |
| Brief CSS block appended | OK |
| `.legal-doc*` / `.admin-*` / `.landing` preserved | OK |
| `page.tsx` not wired | OK (out of scope) |

## Self-review

- **Fonts:** Variables on `<html>`; `.lp-page` and `.lp-display` reference `--font-lp-sans` / `--font-lp-display` — correct cascade for Task 3+ components.
- **Metadata:** Matches brief strings exactly.
- **Layout removal:** Stub home page loses centering until Task 6 migrates to `.lp-page` — intentional per brief.
- **No concerns** blocking downstream tasks.

## Files touched

- `apps/ai-web/src/app/layout.tsx`
- `apps/ai-web/src/app/globals.css`
