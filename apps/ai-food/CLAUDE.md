<!-- GSD:project-start source:PROJECT.md -->
## Project

**AI Food**

Web/PWA + Capacitor дневник питания (monorepo `apps/ai-food` + `apps/ai-app`): фото или текст → AI → приём в дневник. После входа данные аккаунта синхронизируются между устройствами; **фото приёмов не синкаются**.

**Core Value:** Сфотографировал / описал еду → КБЖУ → сохранил; после логина дневник/вес/избранное/профиль восстанавливаются (**фото только на устройстве**).

### Constraints

- **Tech stack**: pnpm + Turborepo; React/FSD/Vite + Express/Prisma
- **Security**: `VITE_AI_GATEWAY_API_KEY` в бандле (техдолг); OpenRouter/T-Bank только на сервере
- **Persistence**: Preferences + Filesystem локально; server sync профиля(+микро)/дневника/веса/избранного/настроек; **фото намеренно никогда не на сервере**
- **Auth**: Telegram / demo; гость — только устройство
- **Architecture**: food routes + `/user/*/sync` с `X-User-Token`
- **Compatibility**: Web + Capacitor Android
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

**Analysis Date:** 2026-08-03

## Languages

**Primary:**
- TypeScript 5.9.3 (resolved via `pnpm-lock.yaml`) ? application code in `src/`
- TSX/JSX ? React components in `src/**/*.tsx`

**Secondary:**
- HTML ? `index.html` (Vite entry shell)
- CSS ? `src/app/styles/global.css` (Tailwind directives + CSS variables for shadcn/ui)
- JSON ? `package.json`, `components.json`

## Runtime

**Environment:**
- Node.js >= 18 (declared in root `package.json` `engines`)
- Browser (Chromium/WebKit) ? Vite SPA; Capacitor Android shell for native builds

**Package Manager:**
- pnpm 9.6.0 (pinned in root `package.json` `packageManager`)
- Lockfile: present (`pnpm-lock.yaml`)
- Single package ? no pnpm workspaces / Turborepo

## Frameworks

**Core:**
- React 18.3.1 ? UI in `src/`
- React Router DOM 6.24.1 ? routing in `src/app/router.tsx`

**Testing:**
- Vitest 2.1.9 ? unit tests (`vitest.config.ts`)
- Testing Library (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`)
- jsdom ? DOM environment for Vitest (`src/test/setup.ts`)

**Build/Dev:**
- Vite 5.4.21 ? dev server and production bundle (`vite.config.ts`)
- `@vitejs/plugin-react` ? React Fast Refresh
- TypeScript compiler (`tsc`) ? `type-check` / build (`tsc && vite build`)
- Capacitor 8 ? native Android (`android/`, `capacitor.config.ts`)

## Key Dependencies

**Critical:**
- `@tanstack/react-query` ? server/async state for food analysis
- `axios` ? HTTP client (`src/shared/api/client.ts`)
- `zustand` ? client state: image selection, diary, profile, settings
- `react-router-dom` ? SPA routing
- `sonner` ? toast notifications (`src/app/providers.tsx`)
- Domain types in `src/shared/types` (import alias `@ai-food/shared-types`)

**UI / styling:**
- Tailwind CSS + `tailwindcss-animate`
- shadcn/ui pattern ? `components.json`; components in `src/shared/ui/`
- `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`
- `lucide-react` ? icons
- `framer-motion` ? motion / week strip

**Native / storage:**
- `@capacitor/core`, `@capacitor/android`, `@capacitor/app`
- `@capacitor/camera`, `@capacitor/filesystem`, `@capacitor/preferences`

**Infrastructure:**
- Not detected ? no Docker, Kubernetes, cloud SDKs, or IaC in repo

## Configuration

**Environment:**
- AI Gateway: `VITE_AI_GATEWAY_URL`, `VITE_AI_GATEWAY_API_KEY` (client-side)
- Optional `VITE_API_URL` in `src/shared/api/client.ts`
- `.env` listed in `.gitignore` ? may exist locally; no `.env.example` committed

**Build:**
- Root `package.json` scripts: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm type-check`
- Capacitor: `pnpm cap:sync`, `pnpm cap:build`, `pnpm cap:open:android`
- `vite.config.ts` ? `@` ? `./src`, `@ai-food/shared-types` ? `./src/shared/types`
- `tsconfig.json` ? strict mode, path aliases `@/*` and `@ai-food/shared-types`

**Linting / formatting:**
- Not detected ? no ESLint, Prettier, or Biome config files

## Platform Requirements

**Development:**
- Node.js >= 18
- pnpm >= 9 (9.6.0 recommended via `packageManager` field)
- Run from repo root:
  ```bash
  pnpm install
  pnpm dev    # Vite :5173
  ```

**Production:**
- Static SPA build via `pnpm build` ? Vite `dist/`
- Native: `pnpm cap:build` then open Android Studio
- No hosting platform, CI/CD, or container definitions detected

---

*Stack analysis: 2026-08-03 (single-package repo)*
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

**Analysis Date:** 2026-06-24

## Naming Patterns

**Files:**
- React components and pages: PascalCase ? `HomePage.tsx`, `MealCard.tsx`, `NutritionCard.tsx`
- Hooks and stores: camelCase with `use` prefix ? `useAnalyzeFood.ts`, `useImageStore.ts`, `useDiaryStore.ts`
- API modules: camelCase with `Api` suffix ? `analyzeFoodApi.ts`
- Utilities: camelCase ? `formatters.ts`, `utils.ts`, `queryClient.ts`
- Barrel files: always `index.ts` at the public boundary of each slice
- Tests: co-located, same base name + `.test.ts` ? `useImageStore.test.ts`, `formatters.test.ts`

**Directories (FSD segments):**
- `ui/` ? presentational components (`ImagePicker.tsx`, `MealCard.tsx`)
- `model/` ? hooks, Zustand stores, business logic (`useSaveMeal.ts`, `useDiaryStore.ts`)
- `api/` ? HTTP client calls (`analyzeFoodApi.ts`)
- Slice root ? `index.ts` barrel only; no implementation files at slice root

**Functions:**
- camelCase for all functions ? `formatCalories`, `analyzeFoodApi`, `setImage`
- Custom hooks: `use` prefix ? `useAnalyzeFood`, `useSaveMeal`
- Event handlers in components: `handle` prefix ? `handleImageSelect`, `handleFileChange`

**Variables:**
- camelCase ? `todayMeals`, `previewUrl`, `mockResponse`
- Constants: UPPER_SNAKE_CASE for module-level config ? `DAILY_GOAL`, `API_BASE_URL`, `MOCK_RESPONSE`

**Types:**
- PascalCase for interfaces and types ? `Meal`, `NutritionResult`, `ButtonProps`, `DiaryState`
- Props interfaces: `{ComponentName}Props` ? `ImagePickerProps`, `NutritionCardProps`, `MealCardProps`
- Store state interfaces: descriptive noun + `State` ? `ImageState`, `DiaryState`
- Shared domain types live in `src/shared/types/index.ts` and are imported as `@ai-food/shared-types`
- Prefer `interface` for object shapes; use `type` for imports (`import type { Meal }`)

**Packages:**
- Scoped workspace names ? `@ai-food/mobile`, `@ai-food/backend`, `@ai-food/shared-types`

## Code Style

**Formatting:**
- No ESLint, Prettier, Biome, or EditorConfig detected ? style is enforced implicitly by TypeScript strict mode and team convention
- 2-space indentation throughout observed source
- Semicolons at statement ends (dominant style)
- Single quotes for strings in most files; double quotes appear in `src/app/providers.tsx` ? prefer single quotes for new code
- Trailing commas in multiline objects and arrays
- Numeric separators for readability ? `30_000`, `5 * 60 * 1000`
- `type: "module"` in `package.json`; ESM imports with explicit `.ts` extensions not required (bundler resolution)

**Linting:**
- Not detected at repo root or package level
- TypeScript compiler acts as primary static checker:
  - `strict: true`
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noFallthroughCasesInSwitch: true`
- Run `pnpm type-check` from repo root

**React / UI:**
- Named function exports for components ? `export function HomePage()`, not default exports
- shadcn/ui primitives use `React.forwardRef` with `displayName` ? see `src/shared/ui/button.tsx`
- Variant styling via `class-variance-authority` (`cva`) + `cn()` from `src/shared/lib/utils.ts`
- Tailwind utility classes inline on JSX elements; semantic color tokens (`bg-background`, `text-muted-foreground`, `text-destructive`)
- Icons from `lucide-react`, sized with `h-N w-N` classes
- Accessibility: `aria-label` on icon-only buttons ? `src/pages/home/ui/HomePage.tsx`

## Import Organization

**Order:**
1. React / framework (`react`, `react-router-dom`)
2. Third-party libraries (`@tanstack/react-query`, `zustand`, `lucide-react`, `axios`)
3. Internal aliases ? higher FSD layers first when applicable (`@/widgets/*`, `@/features/*`, `@/entities/*`, `@/shared/*`)
4. Relative imports ? only within the same slice (`../api/analyzeFoodApi` inside `features/analyze-food`)
5. Type-only imports ? `import type { ... }` on a separate line or grouped at end

**Path Aliases:**
- `@/*` ? `src/*` ? configured in `tsconfig.json` and `vite.config.ts`
- shadcn aliases in `components.json`: `components`/`ui` ? `@/shared/ui`, `lib` ? `@/shared/lib`

**Barrel / FSD import rules (prescriptive):**
- Cross-slice imports MUST go through `index.ts` barrels ? documented in `.cursor/rules/index-reexports.mdc`
- Correct: `import { ImagePicker, useImageStore } from '@/features/add-food'`
- Correct: `import { Button } from '@/shared/ui'`
- Wrong: `import { ImagePicker } from '@/features/add-food/ui/ImagePicker'`
- Within a slice, relative paths are allowed ? `export { Button } from './button'` in `src/shared/ui/index.ts`
- FSD layer order (high ? low): `app ? pages ? widgets ? features ? entities ? shared`
- Higher layers import from lower only; no same-layer cross-imports between features

**Zustand selector pattern:**
```typescript
const meals = useDiaryStore((s) => s.meals);
const setImage = useImageStore((s) => s.setImage);
```
Use atomic selectors; avoid destructuring the whole store in components.

## Error Handling

**Patterns:**
- HTTP errors centralized in Axios response interceptor ? `src/shared/api/client.ts`
- Interceptor maps Axios errors to `ApiError` shape from `@ai-food/shared-types` and re-throws via `Promise.reject(apiError)`
- API functions (`analyzeFoodApi`) do not wrap try/catch; callers rely on rejection
- React Query hooks declare error type ? `useQuery<AnalyzeFoodResponse, Error>` in `src/features/analyze-food/model/useAnalyzeFood.ts`
- UI consumes query state ? `isError` branch with user-facing message in `src/pages/result/ui/ResultPage.tsx`
- Navigation guards via `useEffect` + `navigate(..., { replace: true })` when required state is missing
- No in-repo backend mock; AI errors come from Gateway responses
- No global error boundary component detected

**When adding API calls:**
1. Use `apiClient` from `@/shared/api`
2. Return typed `response.data`
3. Let interceptor normalize errors
4. Surface errors in UI via React Query `isError` / `error`, or handle in mutation `onError`

## Logging

**Framework:** `console` only

**Patterns:**
- `console.log` used once for server startup ? `../backend/src/index.ts`
- No structured logging, no client-side logging framework
- `sonner` Toaster is mounted in `src/app/providers.tsx` but `toast()` is not called anywhere yet ? use for user notifications when needed

## Comments

**When to Comment:**
- Non-obvious environment workarounds ? jsdom polyfill in `src/test/setup.ts`
- Distinguishing similar elements ? gallery vs camera inputs in `src/features/add-food/ui/ImagePicker.tsx`
- Do not add comments for self-explanatory code; the codebase is lightly commented

**JSDoc/TSDoc:**
- Not used; types and naming carry intent

## Function Design

**Size:**
- Keep hooks and components focused; pages compose widgets/features without heavy logic
- Extract formatting to `src/shared/lib/formatters.ts`
- Extract API calls to `api/` segment files
- Business orchestration in `model/` hooks ? `useSaveMeal` builds `Meal` and navigates

**Parameters:**
- Props destructured in function signature ? `export function MealCard({ meal }: MealCardProps)`
- Optional props with defaults in destructuring ? `NutritionRow` in `src/entities/nutrition/ui/NutritionRow.tsx`
- Callback props: `onImageSelect: (file: File) => void`

**Return Values:**
- Components return JSX directly
- Hooks return React Query result objects or store selectors
- Pure functions return typed primitives/strings ? `formatCalories(kcal: number): string`
- Custom action hooks may return a function ? `useSaveMeal()` returns `(result: NutritionResult) => void`

## Module Design

**Exports:**
- Named exports exclusively for app code
- Barrel `index.ts` re-exports public API per slice:
  - `src/features/add-food/index.ts`
  - `src/entities/meal/index.ts`
  - `src/shared/ui/index.ts`
  - `src/shared/lib/index.ts`
- Export types alongside values when needed ? `export { Button, type ButtonProps, buttonVariants }`

**Barrel Files:**
- Required at every public FSD segment boundary (`features/*`, `entities/*`, `widgets/*`, `pages/*`, `shared/*`)
- When adding a new public symbol, update the slice's `index.ts` in the same PR
- `src/shared/types` exports all domain interfaces from `src/shared/types/index.ts`

**State management split (prescriptive):**
- Zustand ? client/UI state only (`useImageStore`, `useDiaryStore`); never store API responses
- TanStack Query ? server/async state (`useAnalyzeFood`)
- `useDiaryStore` uses `persist` middleware with key `ai-food-diary` ? `src/entities/meal/model/useDiaryStore.ts`


---

*Convention analysis: 2026-06-24*
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

**Analysis Date:** 2026-08-03

## Pattern Overview

**Overall:** Single-package Feature-Sliced Design (FSD) frontend (Vite/React) + Capacitor Android

**Key Characteristics:**
- One pnpm package at repo root ? no Turborepo / workspaces
- FSD layers with strict top-down import direction
- Server/async state via TanStack Query; client/UI state via Zustand
- Domain types in `src/shared/types` (alias `@ai-food/shared-types`)
- AI via sibling OpenRouter gateway repo `ai-app` (`VITE_AI_GATEWAY_*`); no in-repo backend ? see `docs/AI-GATEWAY.md`

## Layers

**App (composition root):**
- Purpose: Bootstrap React, wire global providers, define routes
- Location: `src/app/`
- Contains: `index.tsx`, `providers.tsx`, `router.tsx`, guards, styles
- Depends on: `pages/*`, `shared/lib` (queryClient)
- Used by: `src/main.tsx`

**Pages (route shells):**
- Purpose: Thin route-level components that compose widgets and features
- Location: `src/pages/*`
- Depends on: `widgets/*`, `features/*`, `entities/*`, `shared/*`
- Used by: `src/app/router.tsx`

**Widgets (composed UI blocks):**
- Purpose: Reusable multi-entity UI sections used across pages
- Location: `src/widgets/*`
- Depends on: `entities/*`, `shared/*`
- Used by: `pages/*`

**Features (user actions & workflows):**
- Purpose: Encapsulate user-facing capabilities with model + optional API/UI
- Location: `src/features/*`
- Depends on: `entities/*`, `shared/*`, `@ai-food/shared-types`
- Used by: `pages/*`

**Entities (domain objects):**
- Purpose: Core business objects and their presentation
- Location: `src/entities/{meal,nutrition}/`
- Depends on: `shared/*`, `@ai-food/shared-types`
- Used by: `widgets/*`, `pages/*`, `features/*`

**Shared (cross-cutting):**
- Purpose: Utilities, HTTP client, design system, domain types
- Location: `src/shared/{api,lib,ui,types}/`
- Depends on: third-party libs only
- Used by: All upper layers

## Data Flow

- **Zustand (client state):** image selection, diary, profile, settings, favorites, weight
- **TanStack Query (server/async state):** analyze / refine / custom content / micronutrient targets
- **Rule:** API responses are not stored in Zustand as a server cache; diary holds mapped `Meal` objects only

## Key Abstractionsctions

- Barrel `index.ts` at each public FSD slice boundary
- Axios client with error normalization to `ApiError`
- React Query hooks for async AI calls
- Orchestration hooks (e.g. `useSaveMeal`) composing stores + navigation

## Entry Points

- `src/main.tsx` ? React mount
- `src/app/index.tsx` ? Providers + router
- `src/app/router.tsx` ? routes
- `pnpm dev` ? Vite :5173
- `pnpm cap:sync` / `pnpm cap:open:android` ? native shell

## Error Handling

- Axios interceptor maps errors to `ApiError`
- UI surfaces query `isError` / retry flows on meal analyze paths

## Cross-Cutting Concerns

- Persistence: Capacitor Preferences (local cache) + server sync after login for diary / profile / weight / favorites (`docs/USER-DATA-SYNC.md`)
- Images: Capacitor Filesystem — **not synced** between devices
- PWA: `vite-plugin-pwa`

---

*Architecture analysis: 2026-08-13 (monorepo + user-data sync)*
<!-- GSD:architecture-end -->

<!-- manual:sibling-backend — keep in sync with docs/AI-GATEWAY.md -->
## Sibling Backend (ai-app)

Бэкенд в monorepo:

- **Путь:** `apps/ai-app` (`openrouter-gateway`)
- **Роль:** Express → OpenRouter, food routes, auth/quota/billing, **user-data sync**
- **Клиент:** `VITE_AI_GATEWAY_URL` + `VITE_AI_GATEWAY_API_KEY`; секреты только на сервере
- **Sync:** дневник / вес / избранное / профиль(+микро) / настройки после логина; **фото приёмов намеренно никогда не синкаются**
- **Канон:** [`docs/AI-GATEWAY.md`](docs/AI-GATEWAY.md) · [`docs/USER-DATA-SYNC.md`](docs/USER-DATA-SYNC.md) · [`.planning/codebase/INTEGRATIONS.md`](.planning/codebase/INTEGRATIONS.md)

Промпты и model — на gateway. Сжатие, XML/JSON parse, UX — на клиенте.

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
