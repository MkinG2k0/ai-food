# Codebase Structure

**Analysis Date:** 2026-06-24

## Directory Layout

```
ai-food/
├── apps/
│   ├── mobile/                 # React + Vite frontend (FSD)
│   │   ├── src/
│   │   │   ├── app/            # Providers, router, global styles
│   │   │   ├── pages/          # Route-level page components
│   │   │   ├── widgets/        # Composed UI blocks
│   │   │   ├── features/       # User actions (add, analyze, save)
│   │   │   ├── entities/       # Domain models + display
│   │   │   ├── shared/         # API client, lib, UI primitives
│   │   │   ├── test/           # Vitest setup
│   │   │   └── main.tsx        # Vite entry
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── vitest.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── components.json     # shadcn/ui config
│   │   └── package.json
│   └── backend/                # Express mock API
│       ├── src/
│       │   ├── index.ts        # Server entry
│       │   └── routes/
│       │       └── analyze-food.ts
│       └── package.json
├── packages/
│   └── shared-types/           # Shared TypeScript interfaces
│       └── src/index.ts
├── docs/
│   └── superpowers/            # Design specs and plans
├── .cursor/rules/              # Cursor IDE rules (barrel exports)
├── .planning/codebase/         # GSD codebase analysis docs
├── turbo.json                  # Turborepo task pipeline
├── pnpm-workspace.yaml
└── package.json                # Root scripts (dev, build, test)
```

## Directory Purposes

**`apps/mobile/src/app/`:**
- Purpose: Application shell — composition root, not business logic
- Contains: `index.tsx`, `providers.tsx`, `router.tsx`, `styles/global.css`
- Key files: `apps/mobile/src/app/router.tsx`, `apps/mobile/src/app/providers.tsx`

**`apps/mobile/src/pages/`:**
- Purpose: One folder per route; thin orchestration layer
- Contains: `{slice}/ui/*Page.tsx`, `{slice}/index.ts`
- Key files: `apps/mobile/src/pages/home/ui/HomePage.tsx`, `apps/mobile/src/pages/result/ui/ResultPage.tsx`

**`apps/mobile/src/widgets/`:**
- Purpose: Multi-entity UI compositions reused across pages
- Contains: `{widget}/ui/*.tsx`, `{widget}/index.ts`
- Key files: `apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx`, `apps/mobile/src/widgets/nutrition-card/ui/NutritionCard.tsx`

**`apps/mobile/src/features/`:**
- Purpose: User-facing capabilities with internal segments
- Contains: `model/` (hooks, stores), `api/` (HTTP), `ui/` (feature components), `index.ts`
- Key files: `apps/mobile/src/features/add-food/model/useImageStore.ts`, `apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts`, `apps/mobile/src/features/save-meal/model/useSaveMeal.ts`

**`apps/mobile/src/entities/`:**
- Purpose: Domain entities — data models and pure display components
- Contains: `model/` (stores tied to entity), `ui/` (display), `index.ts`
- Key files: `apps/mobile/src/entities/meal/model/useDiaryStore.ts`, `apps/mobile/src/entities/meal/ui/MealCard.tsx`, `apps/mobile/src/entities/nutrition/ui/NutritionRow.tsx`

**`apps/mobile/src/shared/`:**
- Purpose: Infrastructure with no business domain knowledge
- Contains: `api/` (HTTP), `lib/` (utils, queryClient), `ui/` (shadcn components)
- Key files: `apps/mobile/src/shared/api/client.ts`, `apps/mobile/src/shared/lib/formatters.ts`, `apps/mobile/src/shared/ui/button.tsx`

**`packages/shared-types/`:**
- Purpose: Cross-app TypeScript contracts
- Contains: Domain interfaces only (no runtime code)
- Key files: `packages/shared-types/src/index.ts`

**`apps/backend/src/`:**
- Purpose: Mock REST API for food analysis
- Contains: Express app setup, route handlers
- Key files: `apps/backend/src/index.ts`, `apps/backend/src/routes/analyze-food.ts`

## Key File Locations

**Entry Points:**
- `apps/mobile/src/main.tsx`: Vite/React DOM bootstrap
- `apps/mobile/src/app/index.tsx`: App component with providers + router
- `apps/backend/src/index.ts`: Express server listen

**Configuration:**
- `package.json`: Root monorepo scripts (`dev`, `build`, `test`, `type-check`)
- `turbo.json`: Task dependencies and caching
- `pnpm-workspace.yaml`: Workspace package globs
- `apps/mobile/vite.config.ts`: Vite + `@` path alias
- `apps/mobile/tsconfig.json`: TypeScript strict + `@/*` paths
- `apps/mobile/tailwind.config.ts`: Tailwind + shadcn theme
- `apps/mobile/components.json`: shadcn/ui generator aliases
- `apps/mobile/vitest.config.ts`: Test runner config
- `apps/backend/tsconfig.json`: Backend TypeScript (CommonJS output to `dist/`)

**Core Logic:**
- `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts`: Food analysis query hook
- `apps/mobile/src/features/save-meal/model/useSaveMeal.ts`: Save meal orchestration
- `apps/mobile/src/entities/meal/model/useDiaryStore.ts`: Persisted diary state
- `apps/mobile/src/features/add-food/model/useImageStore.ts`: Image selection state
- `apps/backend/src/routes/analyze-food.ts`: Mock analyze endpoint

**Testing:**
- `apps/mobile/src/test/setup.ts`: Vitest global setup
- `apps/mobile/src/features/*/model/*.test.ts`: Feature/store unit tests
- `apps/mobile/src/entities/meal/model/useDiaryStore.test.ts`: Entity store tests
- `apps/mobile/src/shared/lib/formatters.test.ts`: Utility tests

## Naming Conventions

**Files:**
- React components: PascalCase — `HomePage.tsx`, `MealCard.tsx`, `NutritionRow.tsx`
- Hooks: camelCase with `use` prefix — `useAnalyzeFood.ts`, `useSaveMeal.ts`, `useImageStore.ts`
- API modules: camelCase with `Api` suffix — `analyzeFoodApi.ts`
- Stores: camelCase with `Store` suffix — `useDiaryStore.ts` (hook name matches file)
- UI primitives: lowercase — `button.tsx`, `card.tsx`, `badge.tsx` (shadcn convention)
- Barrel exports: always `index.ts` at slice root

**Directories:**
- FSD slices: kebab-case — `add-food/`, `daily-header/`, `meal-list/`
- Internal segments: lowercase fixed names — `ui/`, `model/`, `api/`
- Page slices match route purpose — `home/`, `add-food/`, `result/`, `diary/`

**Packages:**
- Scoped npm names — `@ai-food/mobile`, `@ai-food/backend`, `@ai-food/shared-types`

**Imports:**
- Cross-slice: `@/{layer}/{slice}` — `@/features/add-food`, `@/entities/meal`, `@/shared/ui`
- Shared types: `@ai-food/shared-types`
- Within slice: relative paths — `./ui/MealCard`, `../api/analyzeFoodApi`

## Where to Add New Code

**New Page/Route:**
- Page component: `apps/mobile/src/pages/{route-name}/ui/{RouteName}Page.tsx`
- Barrel: `apps/mobile/src/pages/{route-name}/index.ts`
- Register route in: `apps/mobile/src/app/router.tsx`

**New Feature:**
- Structure: `apps/mobile/src/features/{feature-name}/{model,api,ui}/`
- Public exports: `apps/mobile/src/features/{feature-name}/index.ts`
- Use `model/` for hooks and Zustand stores, `api/` for HTTP calls, `ui/` for feature-specific components

**New Widget:**
- Component: `apps/mobile/src/widgets/{widget-name}/ui/{WidgetName}.tsx`
- Barrel: `apps/mobile/src/widgets/{widget-name}/index.ts`
- Compose from `entities/*` and `shared/*` only

**New Entity:**
- Model: `apps/mobile/src/entities/{entity-name}/model/`
- Display: `apps/mobile/src/entities/{entity-name}/ui/`
- Barrel: `apps/mobile/src/entities/{entity-name}/index.ts`
- Add types to: `packages/shared-types/src/index.ts`

**New API Endpoint:**
- Backend route: `apps/backend/src/routes/{route-name}.ts`
- Mount in: `apps/backend/src/index.ts`
- Mobile API function: `apps/mobile/src/features/{feature}/api/{name}Api.ts`
- Query hook: `apps/mobile/src/features/{feature}/model/use{Name}.ts`

**New Shared UI Component:**
- Implementation: `apps/mobile/src/shared/ui/{component}.tsx`
- Re-export from: `apps/mobile/src/shared/ui/index.ts`
- Use shadcn CLI with `apps/mobile/components.json` aliases

**Utilities:**
- Helpers/formatters: `apps/mobile/src/shared/lib/`
- Re-export from: `apps/mobile/src/shared/lib/index.ts`

**Tests:**
- Co-locate with source: `{same-dir}/{name}.test.ts`
- Follow pattern in: `apps/mobile/src/entities/meal/model/useDiaryStore.test.ts`

## FSD Layer Import Rules

Import direction (higher → lower only):

```
app → pages → widgets → features → entities → shared
```

- `pages` may import from `widgets`, `features`, `entities`, `shared`
- `widgets` may import from `entities`, `shared` (not `features` or `pages`)
- `features` may import from `entities`, `shared`, and other features when orchestrating
- `entities` may import from `shared` only
- `shared` imports nothing from upper layers
- No cross-imports within the same layer (except feature-to-feature orchestration)

Enforced by convention and `.cursor/rules/index-reexports.mdc`.

## Special Directories

**`apps/mobile/src/shared/ui/`:**
- Purpose: shadcn/ui component library (Button, Card, Badge, Skeleton)
- Generated: Partially via shadcn CLI; manually maintained
- Committed: Yes

**`packages/shared-types/`:**
- Purpose: Shared contracts between frontend and backend
- Generated: No
- Committed: Yes

**`apps/backend/dist/`:**
- Purpose: Compiled backend output from `tsc`
- Generated: Yes (via `pnpm build` in backend)
- Committed: No (gitignored)

**`docs/superpowers/`:**
- Purpose: MVP design spec and implementation plans
- Generated: No
- Committed: Yes

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis artifacts for planning/execution
- Generated: By `/gsd-map-codebase`
- Committed: Yes

---

*Structure analysis: 2026-06-24*
