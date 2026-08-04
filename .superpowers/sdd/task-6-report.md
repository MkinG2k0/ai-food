# Task 6 Report: Remove in-app legal routes and modules

## Branch lock

- Checked out `feat/legal-site-pages`; `git branch --show-current` → `feat/legal-site-pages`.
- `git rev-parse --short HEAD` (before edits) → `f3a1b71` — matches expected.

## Changes

### router.tsx

- Removed `import { TermsPage, PrivacyPage } from '@/pages/legal';`
- Removed routes `/legal/terms` and `/legal/privacy`

### Deleted directories

- `apps/ai-food/src/pages/legal/` — 4 files (index, TermsPage, PrivacyPage, LegalDocumentPage)
- `apps/ai-food/src/shared/legal/` — 5 files (legalConfig, privacyContent, termsContent, termsContent.test, types)

## Grep verification

Searched `apps/ai-food/src` for: `pages/legal`, `shared/legal`, `/legal/terms`, `/legal/privacy`, `buildTermsSections`, `LegalDocumentPage`

Result: **no matches**

## Tests & type-check

```
pnpm --filter ai-food test -- src/shared/lib/legalSiteUrl.test.ts  → PASS (3 tests)
pnpm --filter ai-food type-check                                    → PASS
pnpm --filter ai-web type-check                                     → PASS
```

## Commit

```
92ff64e refactor(ai-food): remove in-app legal pages in favor of site
```

10 files changed, 336 deletions(-)

## Concerns

None. Settings (Task 5) already opens external legal URLs via `getLegalUrl`; in-app legal UI fully removed.

## Final-review fixes (post 92ff64e)

- `refundsContent.ts`: replaced hardcoded `AI Food` with `${productName}` in subscription/license paragraph.
- `LegalDocumentLayout.tsx`: added `children?: never` to Props; switched section/paragraph keys to index-based.

```
pnpm --filter ai-web type-check  → PASS
```

## Commit

```
fix(ai-web): use productName in refunds copy
```
