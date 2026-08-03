# Coding Conventions

**Analysis Date:** 2026-06-24

## Naming Patterns

**Files:**
- React components and pages: PascalCase — `HomePage.tsx`, `MealCard.tsx`, `NutritionCard.tsx`
- Hooks and stores: camelCase with `use` prefix — `useAnalyzeFood.ts`, `useImageStore.ts`, `useDiaryStore.ts`
- API modules: camelCase with `Api` suffix — `analyzeFoodApi.ts`
- Utilities: camelCase — `formatters.ts`, `utils.ts`, `queryClient.ts`
- Barrel files: always `index.ts` at the public boundary of each slice
- Tests: co-located, same base name + `.test.ts` — `useImageStore.test.ts`, `formatters.test.ts`

**Directories (FSD segments):**
- `ui/` — presentational components (`ImagePicker.tsx`, `MealCard.tsx`)
- `model/` — hooks, Zustand stores, business logic (`useSaveMeal.ts`, `useDiaryStore.ts`)
- `api/` — HTTP client calls (`analyzeFoodApi.ts`)
- Slice root — `index.ts` barrel only; no implementation files at slice root

**Functions:**
- camelCase for all functions — `formatCalories`, `analyzeFoodApi`, `setImage`
- Custom hooks: `use` prefix — `useAnalyzeFood`, `useSaveMeal`
- Event handlers in components: `handle` prefix — `handleImageSelect`, `handleFileChange`

**Variables:**
- camelCase — `todayMeals`, `previewUrl`, `mockResponse`
- Constants: UPPER_SNAKE_CASE for module-level config — `DAILY_GOAL`, `API_BASE_URL`, `MOCK_RESPONSE`

**Types:**
- PascalCase for interfaces and types — `Meal`, `NutritionResult`, `ButtonProps`, `DiaryState`
- Props interfaces: `{ComponentName}Props` — `ImagePickerProps`, `NutritionCardProps`, `MealCardProps`
- Store state interfaces: descriptive noun + `State` — `ImageState`, `DiaryState`
- Shared domain types live in `src/shared/types/index.ts` and are imported as `@ai-food/shared-types`
- Prefer `interface` for object shapes; use `type` for imports (`import type { Meal }`)

**Packages:**
- Scoped workspace names — `@ai-food/mobile`, `@ai-food/backend`, `@ai-food/shared-types`

## Code Style

**Formatting:**
- No ESLint, Prettier, Biome, or EditorConfig detected — style is enforced implicitly by TypeScript strict mode and team convention
- 2-space indentation throughout observed source
- Semicolons at statement ends (dominant style)
- Single quotes for strings in most files; double quotes appear in `src/app/providers.tsx` — prefer single quotes for new code
- Trailing commas in multiline objects and arrays
- Numeric separators for readability — `30_000`, `5 * 60 * 1000`
- `type: "module"` in `package.json`; ESM imports with explicit `.ts` extensions not required (bundler resolution)

**Linting:**
- Not detected at repo root or package level
- TypeScript compiler acts as primary static checker:
  - `strict: true`
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noFallthroughCasesInSwitch: true`
- Run `pnpm type-check` from root (Turbo) or `pnpm type-check` in `apps/mobile`

**React / UI:**
- Named function exports for components — `export function HomePage()`, not default exports
- shadcn/ui primitives use `React.forwardRef` with `displayName` — see `src/shared/ui/button.tsx`
- Variant styling via `class-variance-authority` (`cva`) + `cn()` from `src/shared/lib/utils.ts`
- Tailwind utility classes inline on JSX elements; semantic color tokens (`bg-background`, `text-muted-foreground`, `text-destructive`)
- Icons from `lucide-react`, sized with `h-N w-N` classes
- Accessibility: `aria-label` on icon-only buttons — `src/pages/home/ui/HomePage.tsx`

## Import Organization

**Order:**
1. React / framework (`react`, `react-router-dom`)
2. Third-party libraries (`@tanstack/react-query`, `zustand`, `lucide-react`, `axios`)
3. Internal aliases — higher FSD layers first when applicable (`@/widgets/*`, `@/features/*`, `@/entities/*`, `@/shared/*`)
4. Relative imports — only within the same slice (`../api/analyzeFoodApi` inside `features/analyze-food`)
5. Type-only imports — `import type { ... }` on a separate line or grouped at end

**Path Aliases:**
- `@/*` → `src/*` — configured in `tsconfig.json` and `vite.config.ts`
- shadcn aliases in `components.json`: `components`/`ui` → `@/shared/ui`, `lib` → `@/shared/lib`

**Barrel / FSD import rules (prescriptive):**
- Cross-slice imports MUST go through `index.ts` barrels — documented in `.cursor/rules/index-reexports.mdc`
- Correct: `import { ImagePicker, useImageStore } from '@/features/add-food'`
- Correct: `import { Button } from '@/shared/ui'`
- Wrong: `import { ImagePicker } from '@/features/add-food/ui/ImagePicker'`
- Within a slice, relative paths are allowed — `export { Button } from './button'` in `src/shared/ui/index.ts`
- FSD layer order (high → low): `app → pages → widgets → features → entities → shared`
- Higher layers import from lower only; no same-layer cross-imports between features

**Zustand selector pattern:**
```typescript
const meals = useDiaryStore((s) => s.meals);
const setImage = useImageStore((s) => s.setImage);
```
Use atomic selectors; avoid destructuring the whole store in components.

## Error Handling

**Patterns:**
- HTTP errors centralized in Axios response interceptor — `src/shared/api/client.ts`
- Interceptor maps Axios errors to `ApiError` shape from `@ai-food/shared-types` and re-throws via `Promise.reject(apiError)`
- API functions (`analyzeFoodApi`) do not wrap try/catch; callers rely on rejection
- React Query hooks declare error type — `useQuery<AnalyzeFoodResponse, Error>` in `src/features/analyze-food/model/useAnalyzeFood.ts`
- UI consumes query state — `isError` branch with user-facing message in `src/pages/result/ui/ResultPage.tsx`
- Navigation guards via `useEffect` + `navigate(..., { replace: true })` when required state is missing
- Backend mock (`apps/backend/src/routes/analyze-food.ts`) has no error paths; always returns mock JSON after delay
- No global error boundary component detected

**When adding API calls:**
1. Use `apiClient` from `@/shared/api`
2. Return typed `response.data`
3. Let interceptor normalize errors
4. Surface errors in UI via React Query `isError` / `error`, or handle in mutation `onError`

## Logging

**Framework:** `console` only

**Patterns:**
- `console.log` used once for server startup — `../backend/src/index.ts`
- No structured logging, no client-side logging framework
- `sonner` Toaster is mounted in `src/app/providers.tsx` but `toast()` is not called anywhere yet — use for user notifications when needed

## Comments

**When to Comment:**
- Non-obvious environment workarounds — jsdom polyfill in `src/test/setup.ts`
- Distinguishing similar elements — gallery vs camera inputs in `src/features/add-food/ui/ImagePicker.tsx`
- Do not add comments for self-explanatory code; the codebase is lightly commented

**JSDoc/TSDoc:**
- Not used; types and naming carry intent

## Function Design

**Size:**
- Keep hooks and components focused; pages compose widgets/features without heavy logic
- Extract formatting to `src/shared/lib/formatters.ts`
- Extract API calls to `api/` segment files
- Business orchestration in `model/` hooks — `useSaveMeal` builds `Meal` and navigates

**Parameters:**
- Props destructured in function signature — `export function MealCard({ meal }: MealCardProps)`
- Optional props with defaults in destructuring — `NutritionRow` in `src/entities/nutrition/ui/NutritionRow.tsx`
- Callback props: `onImageSelect: (file: File) => void`

**Return Values:**
- Components return JSX directly
- Hooks return React Query result objects or store selectors
- Pure functions return typed primitives/strings — `formatCalories(kcal: number): string`
- Custom action hooks may return a function — `useSaveMeal()` returns `(result: NutritionResult) => void`

## Module Design

**Exports:**
- Named exports exclusively for app code
- Barrel `index.ts` re-exports public API per slice:
  - `src/features/add-food/index.ts`
  - `src/entities/meal/index.ts`
  - `src/shared/ui/index.ts`
  - `src/shared/lib/index.ts`
- Export types alongside values when needed — `export { Button, type ButtonProps, buttonVariants }`

**Barrel Files:**
- Required at every public FSD segment boundary (`features/*`, `entities/*`, `widgets/*`, `pages/*`, `shared/*`)
- When adding a new public symbol, update the slice's `index.ts` in the same PR
- `src/shared/types` exports all domain interfaces from `src/shared/types/index.ts`

**State management split (prescriptive):**
- Zustand — client/UI state only (`useImageStore`, `useDiaryStore`); never store API responses
- TanStack Query — server/async state (`useAnalyzeFood`)
- `useDiaryStore` uses `persist` middleware with key `ai-food-diary` — `src/entities/meal/model/useDiaryStore.ts`


---

*Convention analysis: 2026-06-24*
