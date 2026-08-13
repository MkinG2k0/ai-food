# Codebase Structure

**Analysis Date:** 2026-08-03

## Directory Layout

```
ai-food/
├── src/                        # React + Vite app (FSD)
│   ├── app/                    # Providers, router, global styles
│   ├── pages/                  # Route-level page components
│   ├── widgets/                # Composed UI blocks
│   ├── features/               # User actions (add, analyze, save, …)
│   ├── entities/               # Domain models + display
│   ├── shared/
│   │   ├── api/                # Axios client
│   │   ├── lib/                # formatters, utils, storage
│   │   ├── ui/                 # shadcn primitives
│   │   └── types/              # Domain types (@ai-food/shared-types)
│   ├── test/                   # Vitest setup
│   └── main.tsx                # Vite entry
├── android/                    # Capacitor Android project
├── public/                     # Static assets / PWA icons
├── docs/                       # Design specs and plans
├── .cursor/rules/              # Cursor IDE rules (barrel exports)
├── .planning/                  # GSD planning artifacts
├── index.html
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── capacitor.config.ts
├── components.json             # shadcn/ui config
└── package.json                # Single package scripts
```

## Directory Purposes

**`src/app/`:**
- Purpose: Application shell — composition root, not business logic
- Contains: `index.tsx`, `providers.tsx`, `router.tsx`, `styles/global.css`, guards
- Key files: `src/app/router.tsx`, `src/app/providers.tsx`

**`src/pages/`:**
- Purpose: Thin route shells composing widgets/features
- Examples: `home`, `stats`, `settings`, `favorites`, `barcode`, `meal-detail`, `onboarding`

**`src/widgets/`:**
- Purpose: Multi-entity UI sections reused across pages
- Examples: `daily-header`, `meal-list`, `nutrition-card`

**`src/features/`:**
- Purpose: User-facing capabilities (`model/`, optional `api/`, `ui/`)
- Examples: `add-food`, `analyze-food`, `save-meal`, `onboarding`, `scan-barcode`

**`src/entities/`:**
- Purpose: Core domain objects and presentation
- Examples: `meal` (`useDiaryStore`), `nutrition`

**`src/shared/`:**
- Purpose: Cross-cutting utilities, HTTP client, design system, domain types
- Types live in `src/shared/types` (alias `@ai-food/shared-types`)

**`android/`:**
- Purpose: Capacitor-generated Android project; regenerated paths via `pnpm cap:sync`

**`docs/`:**
- Purpose: Product overview (`AI-APP-FEATURES.md`) and historical superpowers specs/plans

## FSD Import Rules

- Cross-slice imports MUST go through `index.ts` barrels
- Higher layers import from lower only: `app → pages → widgets → features → entities → shared`
- Path alias `@/*` → `src/*`

## Where to Look

| Need | Location |
|------|----------|
| Routes | `src/app/router.tsx` |
| Diary persistence (local cache) | `src/entities/meal/model/useDiaryStore.ts` |
| Diary / weight / favorites sync | `src/features/diary-sync`, `weight-sync`, `favorites-sync` |
| User-data sync contract | `docs/USER-DATA-SYNC.md` (**photos not synced**) |
| AI analyze API | `src/features/analyze-food/api/` |
| Domain types | `src/shared/types/index.ts` |
| Product context for agents | `docs/AI-APP-FEATURES.md` |

---

*Structure analysis: 2026-08-03 (single-package repo)*
