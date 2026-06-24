<!-- GSD:project-start source:PROJECT.md -->
## Project

**AI Food**

Web-first приложение для учёта питания: пользователь фотографирует еду, получает оценку КБЖУ через AI и сохраняет приёмы пищи в локальный дневник. Сейчас — brownfield-проект на Turborepo + React (FSD) с mock-бэкендом; цель ближайшего цикла — заменить mock на реальный OpenAI Vision и довести продукт до рабочего web-MVP, который можно показать пользователям.

**Core Value:** Сфотографировал еду → получил правдоподобные данные о питании → сохранил в дневник — без лишних шагов и без потери данных при перезагрузке.

### Constraints

- **Tech stack**: Сохранить существующий monorepo (Turborepo, pnpm, React/FSD, Express) — не переписывать с нуля
- **Security**: OpenAI API key только на бэкенде; не экспонировать в клиентский bundle
- **Persistence**: localStorage на клиенте; без БД в этом цикле
- **Auth**: Без авторизации в MVP — один пользователь на устройство/браузер
- **Architecture**: API-вызовы только через TanStack Query hooks; Zustand не хранит server data
- **Compatibility**: Web-first; мобильный UX через responsive layout, не нативное приложение
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.9.3 (resolved via `pnpm-lock.yaml`) — all application code in `apps/mobile/`, `apps/backend/`, `packages/shared-types/`
- TSX/JSX — React components in `apps/mobile/src/**/*.tsx`
- HTML — `apps/mobile/index.html` (Vite entry shell)
- CSS — `apps/mobile/src/app/styles/global.css` (Tailwind directives + CSS variables for shadcn/ui)
- JSON — workspace manifests (`package.json`, `turbo.json`, `components.json`)
## Runtime
- Node.js >= 18 (declared in root `package.json` `engines`)
- Browser (Chromium/WebKit) — mobile app is a Vite SPA, not a native shell
- pnpm 9.6.0 (pinned in root `package.json` `packageManager`)
- Lockfile: present (`pnpm-lock.yaml`)
## Frameworks
- React 18.3.1 — UI in `apps/mobile/`
- React Router DOM 6.24.1 — routing in `apps/mobile/src/app/router.tsx`
- Express 4.22.2 — mock HTTP API in `apps/backend/src/index.ts`
- Turborepo 2.9.18 — monorepo task orchestration (`turbo.json`)
- Vitest 2.1.9 — unit tests in `apps/mobile/` (`vitest.config.ts`)
- Testing Library (`@testing-library/react` 16.0.0, `@testing-library/jest-dom` 6.4.6, `@testing-library/user-event` 14.5.2) — component/hook tests
- jsdom 24.1.3 — DOM environment for Vitest (`apps/mobile/src/test/setup.ts`)
- Vite 5.4.21 — dev server and production bundle for mobile (`apps/mobile/vite.config.ts`)
- `@vitejs/plugin-react` 4.3.1 — React Fast Refresh
- tsx 4.22.4 — backend dev watcher (`apps/backend/package.json` `dev` script)
- TypeScript compiler (`tsc`) — mobile type-check (`tsc --noEmit`) and backend build (`tsc` → `dist/`)
## Key Dependencies
- `@tanstack/react-query` 5.101.1 — server state for food analysis (`apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts`)
- `axios` 1.18.1 — HTTP client (`apps/mobile/src/shared/api/client.ts`)
- `zustand` 5.0.14 — client state: image selection, diary persistence (`apps/mobile/src/features/add-food/model/useImageStore.ts`, `apps/mobile/src/entities/meal/model/useDiaryStore.ts`)
- `react-router-dom` — SPA routing
- `sonner` 1.5.1 — toast notifications (`apps/mobile/src/app/providers.tsx`)
- `express` — HTTP server
- `cors` 2.8.5 — open CORS for local dev (`apps/backend/src/index.ts`)
- `multer` 1.4.5-lts.2 — multipart upload parsing (`apps/backend/src/routes/analyze-food.ts`)
- `@ai-food/shared-types` (`packages/shared-types/`) — cross-package TypeScript interfaces (`Meal`, `NutritionResult`, `AnalyzeFoodResponse`, `ApiError`); consumed by mobile and backend via `workspace:*`
- Tailwind CSS 3.4.19 — utility-first styling (`apps/mobile/tailwind.config.ts`, `postcss.config.js`)
- `tailwindcss-animate` 1.0.7 — animation utilities
- shadcn/ui pattern — configured in `apps/mobile/components.json`; components live in `apps/mobile/src/shared/ui/` (Button, Card, Badge, Skeleton)
- `@radix-ui/react-slot` 1.1.0 — composable primitives (Button)
- `class-variance-authority` 0.7.0, `clsx` 2.1.1, `tailwind-merge` 2.4.0 — variant/class utilities (`apps/mobile/src/shared/lib/utils.ts`)
- `lucide-react` 0.408.0 — icons
- Not detected — no Docker, Kubernetes, cloud SDKs, or IaC in repo
## Configuration
- Frontend API URL: `VITE_API_URL` read in `apps/mobile/src/shared/api/client.ts`; defaults to `http://localhost:3001`
- Backend port: `PORT` in `apps/backend/src/index.ts`; defaults to `3001`
- `.env` listed in `.gitignore` — file may exist locally; no `.env.example` committed
- No `.env.*` templates detected in repo
- Root: `package.json` — `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm type-check` via Turbo
- `turbo.json` — pipeline for `build`, `dev`, `test`, `type-check`; `dev` is persistent and uncached
- `pnpm-workspace.yaml` — workspaces: `apps/*`, `packages/*`
- Mobile: `apps/mobile/vite.config.ts` — `@` → `./src`, dev port 5173
- Mobile: `apps/mobile/tsconfig.json` — strict mode, ESNext modules, path alias `@/*`
- Backend: `apps/backend/tsconfig.json` — CommonJS output to `dist/`, target ES2022
- Shared types: `packages/shared-types/tsconfig.json` — types-only package, no build step; exports raw `.ts` via `package.json` `exports`
- Not detected — no ESLint, Prettier, or Biome config files
## Platform Requirements
- Node.js >= 18
- pnpm >= 9 (9.6.0 recommended via `packageManager` field)
- Run from repo root:
- Mobile-only: `pnpm --filter @ai-food/mobile dev`
- Backend-only: `pnpm --filter @ai-food/backend dev`
- Mobile: static SPA build via `pnpm --filter @ai-food/mobile build` → Vite `dist/` (standard Vite output; no deployment config in repo)
- Backend: `pnpm --filter @ai-food/backend build && pnpm --filter @ai-food/backend start` → Node runs `dist/index.js`
- No hosting platform, CI/CD, or container definitions detected
- Design spec (`docs/superpowers/specs/2026-06-24-ai-food-mvp-design.md`) mentions Capacitor for native camera; Capacitor is **not** in `apps/mobile/package.json`. Camera/gallery use HTML `<input type="file">` in `apps/mobile/src/features/add-food/ui/ImagePicker.tsx`.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components and pages: PascalCase — `HomePage.tsx`, `MealCard.tsx`, `NutritionCard.tsx`
- Hooks and stores: camelCase with `use` prefix — `useAnalyzeFood.ts`, `useImageStore.ts`, `useDiaryStore.ts`
- API modules: camelCase with `Api` suffix — `analyzeFoodApi.ts`
- Utilities: camelCase — `formatters.ts`, `utils.ts`, `queryClient.ts`
- Barrel files: always `index.ts` at the public boundary of each slice
- Tests: co-located, same base name + `.test.ts` — `useImageStore.test.ts`, `formatters.test.ts`
- `ui/` — presentational components (`ImagePicker.tsx`, `MealCard.tsx`)
- `model/` — hooks, Zustand stores, business logic (`useSaveMeal.ts`, `useDiaryStore.ts`)
- `api/` — HTTP client calls (`analyzeFoodApi.ts`)
- Slice root — `index.ts` barrel only; no implementation files at slice root
- camelCase for all functions — `formatCalories`, `analyzeFoodApi`, `setImage`
- Custom hooks: `use` prefix — `useAnalyzeFood`, `useSaveMeal`
- Event handlers in components: `handle` prefix — `handleImageSelect`, `handleFileChange`
- camelCase — `todayMeals`, `previewUrl`, `mockResponse`
- Constants: UPPER_SNAKE_CASE for module-level config — `DAILY_GOAL`, `API_BASE_URL`, `MOCK_RESPONSE`
- PascalCase for interfaces and types — `Meal`, `NutritionResult`, `ButtonProps`, `DiaryState`
- Props interfaces: `{ComponentName}Props` — `ImagePickerProps`, `NutritionCardProps`, `MealCardProps`
- Store state interfaces: descriptive noun + `State` — `ImageState`, `DiaryState`
- Shared domain types live in `packages/shared-types/src/index.ts` and are imported as `@ai-food/shared-types`
- Prefer `interface` for object shapes; use `type` for imports (`import type { Meal }`)
- Scoped workspace names — `@ai-food/mobile`, `@ai-food/backend`, `@ai-food/shared-types`
## Code Style
- No ESLint, Prettier, Biome, or EditorConfig detected — style is enforced implicitly by TypeScript strict mode and team convention
- 2-space indentation throughout observed source
- Semicolons at statement ends (dominant style)
- Single quotes for strings in most files; double quotes appear in `apps/mobile/src/app/providers.tsx` — prefer single quotes for new code
- Trailing commas in multiline objects and arrays
- Numeric separators for readability — `30_000`, `5 * 60 * 1000`
- `type: "module"` in `apps/mobile/package.json`; ESM imports with explicit `.ts` extensions not required (bundler resolution)
- Not detected at repo root or package level
- TypeScript compiler acts as primary static checker:
- Run `pnpm type-check` from root (Turbo) or `pnpm type-check` in `apps/mobile`
- Named function exports for components — `export function HomePage()`, not default exports
- shadcn/ui primitives use `React.forwardRef` with `displayName` — see `apps/mobile/src/shared/ui/button.tsx`
- Variant styling via `class-variance-authority` (`cva`) + `cn()` from `apps/mobile/src/shared/lib/utils.ts`
- Tailwind utility classes inline on JSX elements; semantic color tokens (`bg-background`, `text-muted-foreground`, `text-destructive`)
- Icons from `lucide-react`, sized with `h-N w-N` classes
- Accessibility: `aria-label` on icon-only buttons — `apps/mobile/src/pages/home/ui/HomePage.tsx`
## Import Organization
- `@/*` → `apps/mobile/src/*` — configured in `apps/mobile/tsconfig.json` and `apps/mobile/vite.config.ts`
- shadcn aliases in `apps/mobile/components.json`: `components`/`ui` → `@/shared/ui`, `lib` → `@/shared/lib`
- Cross-slice imports MUST go through `index.ts` barrels — documented in `.cursor/rules/index-reexports.mdc`
- Correct: `import { ImagePicker, useImageStore } from '@/features/add-food'`
- Correct: `import { Button } from '@/shared/ui'`
- Wrong: `import { ImagePicker } from '@/features/add-food/ui/ImagePicker'`
- Within a slice, relative paths are allowed — `export { Button } from './button'` in `apps/mobile/src/shared/ui/index.ts`
- FSD layer order (high → low): `app → pages → widgets → features → entities → shared`
- Higher layers import from lower only; no same-layer cross-imports between features
## Error Handling
- HTTP errors centralized in Axios response interceptor — `apps/mobile/src/shared/api/client.ts`
- Interceptor maps Axios errors to `ApiError` shape from `@ai-food/shared-types` and re-throws via `Promise.reject(apiError)`
- API functions (`analyzeFoodApi`) do not wrap try/catch; callers rely on rejection
- React Query hooks declare error type — `useQuery<AnalyzeFoodResponse, Error>` in `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts`
- UI consumes query state — `isError` branch with user-facing message in `apps/mobile/src/pages/result/ui/ResultPage.tsx`
- Navigation guards via `useEffect` + `navigate(..., { replace: true })` when required state is missing
- Backend mock (`apps/backend/src/routes/analyze-food.ts`) has no error paths; always returns mock JSON after delay
- No global error boundary component detected
## Logging
- `console.log` used once for server startup — `apps/mobile/../backend/src/index.ts`
- No structured logging, no client-side logging framework
- `sonner` Toaster is mounted in `apps/mobile/src/app/providers.tsx` but `toast()` is not called anywhere yet — use for user notifications when needed
## Comments
- Non-obvious environment workarounds — jsdom polyfill in `apps/mobile/src/test/setup.ts`
- Distinguishing similar elements — gallery vs camera inputs in `apps/mobile/src/features/add-food/ui/ImagePicker.tsx`
- Do not add comments for self-explanatory code; the codebase is lightly commented
- Not used; types and naming carry intent
## Function Design
- Keep hooks and components focused; pages compose widgets/features without heavy logic
- Extract formatting to `apps/mobile/src/shared/lib/formatters.ts`
- Extract API calls to `api/` segment files
- Business orchestration in `model/` hooks — `useSaveMeal` builds `Meal` and navigates
- Props destructured in function signature — `export function MealCard({ meal }: MealCardProps)`
- Optional props with defaults in destructuring — `NutritionRow` in `apps/mobile/src/entities/nutrition/ui/NutritionRow.tsx`
- Callback props: `onImageSelect: (file: File) => void`
- Components return JSX directly
- Hooks return React Query result objects or store selectors
- Pure functions return typed primitives/strings — `formatCalories(kcal: number): string`
- Custom action hooks may return a function — `useSaveMeal()` returns `(result: NutritionResult) => void`
## Module Design
- Named exports exclusively for app code
- Barrel `index.ts` re-exports public API per slice:
- Export types alongside values when needed — `export { Button, type ButtonProps, buttonVariants }`
- Required at every public FSD segment boundary (`features/*`, `entities/*`, `widgets/*`, `pages/*`, `shared/*`)
- When adding a new public symbol, update the slice's `index.ts` in the same PR
- `packages/shared-types` exports all domain interfaces from `packages/shared-types/src/index.ts`
- Zustand — client/UI state only (`useImageStore`, `useDiaryStore`); never store API responses
- TanStack Query — server/async state (`useAnalyzeFood`)
- `useDiaryStore` uses `persist` middleware with key `ai-food-diary` — `apps/mobile/src/entities/meal/model/useDiaryStore.ts`
- CommonJS modules (`"module": "CommonJS"` in `apps/backend/tsconfig.json`)
- Express routers as default exports — `export default router` in `apps/backend/src/routes/analyze-food.ts`
- Shared types imported from `@ai-food/shared-types`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Turborepo + pnpm workspaces orchestrate `apps/mobile`, `apps/backend`, and `packages/shared-types`
- Mobile app follows FSD layers with strict top-down import direction
- Server state (API) via TanStack Query; client/UI state via Zustand
- Shared domain types live in `@ai-food/shared-types` and are consumed by both apps
- Backend is a stateless mock — no database, no auth, hardcoded responses
## Layers
- Purpose: Bootstrap React, wire global providers, define routes
- Location: `apps/mobile/src/app/`
- Contains: `index.tsx`, `providers.tsx`, `router.tsx`, `styles/global.css`
- Depends on: `pages/*`, `shared/lib` (queryClient)
- Used by: `apps/mobile/src/main.tsx`
- Purpose: Thin route-level components that compose widgets and features
- Location: `apps/mobile/src/pages/{home,add-food,result,diary}/`
- Contains: `ui/*Page.tsx`, barrel `index.ts`
- Depends on: `widgets/*`, `features/*`, `entities/*`, `shared/*`
- Used by: `apps/mobile/src/app/router.tsx`
- Purpose: Reusable multi-entity UI sections used across pages
- Location: `apps/mobile/src/widgets/{daily-header,meal-list,nutrition-card}/`
- Contains: `ui/*.tsx`, barrel `index.ts`
- Depends on: `entities/*`, `shared/*`
- Used by: `pages/*`
- Purpose: Encapsulate user-facing capabilities with model + optional API/UI
- Location: `apps/mobile/src/features/{add-food,analyze-food,save-meal}/`
- Contains: `model/` (hooks, Zustand stores), `api/` (HTTP calls), `ui/` (feature UI)
- Depends on: `entities/*`, `shared/*`, `@ai-food/shared-types`
- Used by: `pages/*`, occasionally other features (e.g. `save-meal` imports `add-food`)
- Purpose: Core business objects and their presentation
- Location: `apps/mobile/src/entities/{meal,nutrition}/`
- Contains: `model/useDiaryStore.ts`, `ui/MealCard.tsx`, `ui/NutritionRow.tsx`
- Depends on: `shared/*`, `@ai-food/shared-types`
- Used by: `widgets/*`, `pages/*`, `features/*`
- Purpose: Cross-cutting utilities, HTTP client, design system
- Location: `apps/mobile/src/shared/{api,lib,ui}/`
- Contains: Axios client, formatters, shadcn/ui components, `queryClient`
- Depends on: `@ai-food/shared-types`, third-party libs only
- Used by: All upper layers
- Purpose: Single source of truth for domain interfaces
- Location: `packages/shared-types/src/index.ts`
- Contains: `FoodItem`, `Meal`, `NutritionResult`, `AnalyzeFoodResponse`, `ApiError`
- Depends on: Nothing (pure TypeScript interfaces)
- Used by: `apps/mobile`, `apps/backend`
- Purpose: Simulate food analysis endpoint with artificial delay
- Location: `apps/backend/src/`
- Contains: `index.ts` (Express app), `routes/analyze-food.ts`
- Depends on: `@ai-food/shared-types`, Express, multer, cors
- Used by: Mobile app via HTTP
## Data Flow
- **Zustand (client state):** `useImageStore` in `features/add-food/model/useImageStore.ts` — ephemeral image selection and preview URL; `useDiaryStore` in `entities/meal/model/useDiaryStore.ts` — persisted meal diary
- **TanStack Query (server state):** `useAnalyzeFood` in `features/analyze-food/model/useAnalyzeFood.ts` — caches analyze API response keyed by file metadata
- **Rule:** API responses never stored in Zustand; diary data never fetched via Query (local-only MVP)
## Key Abstractions
- Purpose: Hide internal file structure; enforce FSD import boundaries
- Examples: `apps/mobile/src/features/add-food/index.ts`, `apps/mobile/src/entities/meal/index.ts`, `apps/mobile/src/shared/ui/index.ts`
- Pattern: Each slice exports only public symbols via `index.ts`; cross-slice imports use `@/features/add-food`, never `@/features/add-food/ui/ImagePicker`
- Documented in: `.cursor/rules/index-reexports.mdc`
- Purpose: Single Axios instance with base URL and error normalization
- Examples: `apps/mobile/src/shared/api/client.ts`, `apps/mobile/src/shared/api/index.ts`
- Pattern: Feature `api/` modules call `apiClient`; response interceptor maps errors to `ApiError` shape from shared types
- Purpose: Encapsulate server state fetching with TanStack Query
- Examples: `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts`
- Pattern: `queryKey` includes file identity; `enabled` gates on non-null input; `queryFn` delegates to `api/` module
- Purpose: Orchestrate side effects across stores and navigation
- Examples: `apps/mobile/src/features/save-meal/model/useSaveMeal.ts`
- Pattern: Returns a callback function; composes Zustand actions + `useNavigate`
- Purpose: Minimal client-side state with optional persistence
- Examples: `useImageStore` (transient), `useDiaryStore` (persisted)
- Pattern: `create()` with typed interface; selectors in components use `(s) => s.field`
## Entry Points
- Location: `apps/mobile/src/main.tsx`
- Triggers: Browser loads `apps/mobile/index.html`
- Responsibilities: Mount React root, import global CSS, render `<App />`
- Location: `apps/mobile/src/app/index.tsx`
- Triggers: `main.tsx`
- Responsibilities: Wrap `AppRouter` in `Providers` (QueryClient, Toaster, DevTools)
- Location: `apps/mobile/src/app/router.tsx`
- Triggers: `App` component render
- Responsibilities: Define 4 routes (`/`, `/add`, `/result`, `/diary`) via `createBrowserRouter`
- Location: `apps/backend/src/index.ts`
- Triggers: `pnpm dev` → `tsx watch src/index.ts`
- Responsibilities: Express app on port 3001 (or `PORT` env), CORS, mount `/analyze-food` router, `/health` check
- Location: `package.json` scripts → `turbo dev`
- Triggers: `pnpm dev` from root
- Responsibilities: Start mobile (Vite :5173) and backend (:3001) in parallel
## Error Handling
- Axios response interceptor in `apps/mobile/src/shared/api/client.ts` rejects with `ApiError` `{ message, code, status }`
- `ResultPage` checks `isError` from `useAnalyzeFood` and shows retry UI with navigation back to `/add`
- Backend returns JSON success only; no structured error responses implemented
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
