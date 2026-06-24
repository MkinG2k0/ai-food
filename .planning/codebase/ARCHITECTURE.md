# Architecture

**Analysis Date:** 2026-06-24

## Pattern Overview

**Overall:** Monorepo with Feature-Sliced Design (FSD) frontend + thin mock Express backend

**Key Characteristics:**
- Turborepo + pnpm workspaces orchestrate `apps/mobile`, `apps/backend`, and `packages/shared-types`
- Mobile app follows FSD layers with strict top-down import direction
- Server state (API) via TanStack Query; client/UI state via Zustand
- Shared domain types live in `@ai-food/shared-types` and are consumed by both apps
- Backend is a stateless mock — no database, no auth, hardcoded responses

## Layers

**App (composition root):**
- Purpose: Bootstrap React, wire global providers, define routes
- Location: `apps/mobile/src/app/`
- Contains: `index.tsx`, `providers.tsx`, `router.tsx`, `styles/global.css`
- Depends on: `pages/*`, `shared/lib` (queryClient)
- Used by: `apps/mobile/src/main.tsx`

**Pages (route shells):**
- Purpose: Thin route-level components that compose widgets and features
- Location: `apps/mobile/src/pages/{home,add-food,result,diary}/`
- Contains: `ui/*Page.tsx`, barrel `index.ts`
- Depends on: `widgets/*`, `features/*`, `entities/*`, `shared/*`
- Used by: `apps/mobile/src/app/router.tsx`

**Widgets (composed UI blocks):**
- Purpose: Reusable multi-entity UI sections used across pages
- Location: `apps/mobile/src/widgets/{daily-header,meal-list,nutrition-card}/`
- Contains: `ui/*.tsx`, barrel `index.ts`
- Depends on: `entities/*`, `shared/*`
- Used by: `pages/*`

**Features (user actions & workflows):**
- Purpose: Encapsulate user-facing capabilities with model + optional API/UI
- Location: `apps/mobile/src/features/{add-food,analyze-food,save-meal}/`
- Contains: `model/` (hooks, Zustand stores), `api/` (HTTP calls), `ui/` (feature UI)
- Depends on: `entities/*`, `shared/*`, `@ai-food/shared-types`
- Used by: `pages/*`, occasionally other features (e.g. `save-meal` imports `add-food`)

**Entities (domain models & display):**
- Purpose: Core business objects and their presentation
- Location: `apps/mobile/src/entities/{meal,nutrition}/`
- Contains: `model/useDiaryStore.ts`, `ui/MealCard.tsx`, `ui/NutritionRow.tsx`
- Depends on: `shared/*`, `@ai-food/shared-types`
- Used by: `widgets/*`, `pages/*`, `features/*`

**Shared (infrastructure & primitives):**
- Purpose: Cross-cutting utilities, HTTP client, design system
- Location: `apps/mobile/src/shared/{api,lib,ui}/`
- Contains: Axios client, formatters, shadcn/ui components, `queryClient`
- Depends on: `@ai-food/shared-types`, third-party libs only
- Used by: All upper layers

**Shared Types Package:**
- Purpose: Single source of truth for domain interfaces
- Location: `packages/shared-types/src/index.ts`
- Contains: `FoodItem`, `Meal`, `NutritionResult`, `AnalyzeFoodResponse`, `ApiError`
- Depends on: Nothing (pure TypeScript interfaces)
- Used by: `apps/mobile`, `apps/backend`

**Backend (mock API):**
- Purpose: Simulate food analysis endpoint with artificial delay
- Location: `apps/backend/src/`
- Contains: `index.ts` (Express app), `routes/analyze-food.ts`
- Depends on: `@ai-food/shared-types`, Express, multer, cors
- Used by: Mobile app via HTTP

## Data Flow

**Add Food → Analyze → Save Flow:**

1. User taps FAB on `HomePage` → navigates to `/add`
2. `AddFoodPage` renders `ImagePicker`; on file select calls `useImageStore.setImage(file)` and navigates to `/result`
3. `ResultPage` reads `selectedImage` from `useImageStore`, passes it to `useAnalyzeFood(image)`
4. `useAnalyzeFood` (TanStack Query) calls `analyzeFoodApi` → `apiClient.post('/analyze-food', FormData)` → backend mock
5. Backend `POST /analyze-food` accepts multipart upload, waits 1.5–3s, returns hardcoded `AnalyzeFoodResponse`
6. `ResultPage` displays `NutritionCard` widget with result; user taps "Save to Diary"
7. `useSaveMeal()` maps `NutritionResult` → `Meal` + `FoodItem`, calls `useDiaryStore.addMeal()`, clears image store, navigates to `/`
8. `HomePage` widgets (`DailyHeader`, `MealList`) read persisted meals from `useDiaryStore`

**Diary Read Flow:**

1. `useDiaryStore` persists `meals[]` to localStorage via Zustand `persist` middleware (key: `ai-food-diary`)
2. `DailyHeader` filters today's meals, sums `totalCalories`, shows progress against 2000 kcal goal
3. `MealList` shows today's meals with link to `/diary`
4. `DiaryPage` groups all meals by date using `formatDate`, renders `MealCard` per meal

**State Management:**
- **Zustand (client state):** `useImageStore` in `features/add-food/model/useImageStore.ts` — ephemeral image selection and preview URL; `useDiaryStore` in `entities/meal/model/useDiaryStore.ts` — persisted meal diary
- **TanStack Query (server state):** `useAnalyzeFood` in `features/analyze-food/model/useAnalyzeFood.ts` — caches analyze API response keyed by file metadata
- **Rule:** API responses never stored in Zustand; diary data never fetched via Query (local-only MVP)

## Key Abstractions

**Barrel Exports (Public API per slice):**
- Purpose: Hide internal file structure; enforce FSD import boundaries
- Examples: `apps/mobile/src/features/add-food/index.ts`, `apps/mobile/src/entities/meal/index.ts`, `apps/mobile/src/shared/ui/index.ts`
- Pattern: Each slice exports only public symbols via `index.ts`; cross-slice imports use `@/features/add-food`, never `@/features/add-food/ui/ImagePicker`
- Documented in: `.cursor/rules/index-reexports.mdc`

**API Client:**
- Purpose: Single Axios instance with base URL and error normalization
- Examples: `apps/mobile/src/shared/api/client.ts`, `apps/mobile/src/shared/api/index.ts`
- Pattern: Feature `api/` modules call `apiClient`; response interceptor maps errors to `ApiError` shape from shared types

**Query Hooks (Feature Model):**
- Purpose: Encapsulate server state fetching with TanStack Query
- Examples: `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts`
- Pattern: `queryKey` includes file identity; `enabled` gates on non-null input; `queryFn` delegates to `api/` module

**Action Hooks (Feature Model):**
- Purpose: Orchestrate side effects across stores and navigation
- Examples: `apps/mobile/src/features/save-meal/model/useSaveMeal.ts`
- Pattern: Returns a callback function; composes Zustand actions + `useNavigate`

**Zustand Stores:**
- Purpose: Minimal client-side state with optional persistence
- Examples: `useImageStore` (transient), `useDiaryStore` (persisted)
- Pattern: `create()` with typed interface; selectors in components use `(s) => s.field`

## Entry Points

**Mobile Vite Entry:**
- Location: `apps/mobile/src/main.tsx`
- Triggers: Browser loads `apps/mobile/index.html`
- Responsibilities: Mount React root, import global CSS, render `<App />`

**Mobile App Root:**
- Location: `apps/mobile/src/app/index.tsx`
- Triggers: `main.tsx`
- Responsibilities: Wrap `AppRouter` in `Providers` (QueryClient, Toaster, DevTools)

**Mobile Router:**
- Location: `apps/mobile/src/app/router.tsx`
- Triggers: `App` component render
- Responsibilities: Define 4 routes (`/`, `/add`, `/result`, `/diary`) via `createBrowserRouter`

**Backend Server:**
- Location: `apps/backend/src/index.ts`
- Triggers: `pnpm dev` → `tsx watch src/index.ts`
- Responsibilities: Express app on port 3001 (or `PORT` env), CORS, mount `/analyze-food` router, `/health` check

**Monorepo Dev:**
- Location: `package.json` scripts → `turbo dev`
- Triggers: `pnpm dev` from root
- Responsibilities: Start mobile (Vite :5173) and backend (:3001) in parallel

## Error Handling

**Strategy:** Normalize at HTTP layer; display in UI per feature

**Patterns:**
- Axios response interceptor in `apps/mobile/src/shared/api/client.ts` rejects with `ApiError` `{ message, code, status }`
- `ResultPage` checks `isError` from `useAnalyzeFood` and shows retry UI with navigation back to `/add`
- Backend returns JSON success only; no structured error responses implemented

## Cross-Cutting Concerns

**Logging:** `console.log` in backend startup (`apps/backend/src/index.ts`); no frontend logging framework

**Validation:** TypeScript strict mode; no runtime schema validation (Zod, etc.)

**Authentication:** Not implemented — open CORS, no tokens, no user sessions

**Styling:** TailwindCSS utility classes; shadcn/ui components in `apps/mobile/src/shared/ui/`; design tokens in `apps/mobile/src/app/styles/global.css` and `apps/mobile/tailwind.config.ts`

**Persistence:** Zustand `persist` middleware on diary store only; image preview URLs are in-memory

---

*Architecture analysis: 2026-06-24*
