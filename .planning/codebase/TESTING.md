# Testing Patterns

**Analysis Date:** 2026-06-24

## Test Framework

**Runner:**
- Vitest `^2.0.3` — `apps/mobile/package.json`
- Config: `apps/mobile/vitest.config.ts`
- Backend (`apps/backend`): no test runner, no test script

**Assertion Library:**
- Vitest built-in `expect`
- `@testing-library/jest-dom` matchers loaded globally via setup file

**Supporting libraries:**
- `@testing-library/react` `^16.0.0` — `renderHook`, `act`, `waitFor`
- `@testing-library/user-event` `^14.5.2` — installed, not used in existing tests
- `jsdom` `^24.1.1` — DOM environment

**Run Commands:**
```bash
pnpm test                    # Root: turbo test (all packages with test script)
pnpm --filter @ai-food/mobile test        # vitest run (single pass)
pnpm --filter @ai-food/mobile test:watch  # vitest watch mode
pnpm --filter @ai-food/mobile exec vitest run src/path/to/file.test.ts  # Single file
```

**Vitest config highlights (`apps/mobile/vitest.config.ts`):**
- `environment: 'jsdom'`
- `setupFiles: ['./src/test/setup.ts']`
- `globals: true` — Vitest globals available, but existing tests still import explicitly from `'vitest'`
- `@` alias mirrors app tsconfig

## Test File Organization

**Location:**
- Co-located with source in the same directory segment
- Pattern: `{moduleName}.test.ts` adjacent to `{moduleName}.ts`

**Current test files:**
| File | Tests |
|------|-------|
| `apps/mobile/src/shared/lib/formatters.test.ts` | Pure utility functions |
| `apps/mobile/src/features/add-food/model/useImageStore.test.ts` | Zustand store |
| `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.test.ts` | React Query hook + mocked API |
| `apps/mobile/src/entities/meal/model/useDiaryStore.test.ts` | Zustand store with persist |

**Naming:**
- Suffix `.test.ts` (not `.spec.ts`)
- No `__tests__/` directories
- No separate `tests/` tree

**Structure:**
```
apps/mobile/src/
├── test/
│   └── setup.ts              # Global test setup (jest-dom, jsdom polyfills)
├── shared/lib/
│   ├── formatters.ts
│   └── formatters.test.ts
├── features/{feature}/model/
│   ├── useX.ts
│   └── useX.test.ts
└── entities/{entity}/model/
    ├── useY.ts
    └── useY.test.ts
```

**Where to add tests:**
- Pure helpers → co-locate in `shared/lib/` or relevant `lib/` segment
- Zustand stores → co-locate in `{slice}/model/`
- React Query hooks → co-locate in `{feature}/model/`, mock `{feature}/api/`
- Page/widget component tests → co-locate in `ui/` next to component (none exist yet)
- Backend routes → no convention yet; would need new Vitest/Jest setup in `apps/backend`

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImageStore } from './useImageStore';

describe('useImageStore', () => {
  beforeEach(() => {
    useImageStore.setState({ selectedImage: null, previewUrl: null });
  });

  it('starts with no image', () => {
    const { result } = renderHook(() => useImageStore());
    expect(result.current.selectedImage).toBeNull();
  });

  it('sets image and creates a blob preview URL', () => {
    const { result } = renderHook(() => useImageStore());
    const file = new File(['data'], 'food.jpg', { type: 'image/jpeg' });

    act(() => result.current.setImage(file));

    expect(result.current.selectedImage).toBe(file);
    expect(result.current.previewUrl).toMatch(/^blob:/);
  });
});
```

**Patterns:**
- Top-level `describe` named after the unit under test (function name, hook name, or store name)
- Nested `describe` per function when testing multiple exports — see `formatters.test.ts`
- `it` descriptions state behavior in plain English — `'starts with empty meals'`, `'rounds decimals'`
- Import tested module via relative path `./useImageStore` from same folder
- Import shared types from `@ai-food/shared-types` for fixtures
- Use `beforeEach` to reset mutable singleton state (Zustand stores)
- Wrap state mutations in `act()` when testing hooks
- Use `waitFor` for async React Query resolution

**Pure function test pattern (`apps/mobile/src/shared/lib/formatters.test.ts`):**
```typescript
import { describe, it, expect } from 'vitest';
import { formatCalories, formatMacro, formatDate } from './formatters';

describe('formatCalories', () => {
  it('formats whole number', () => {
    expect(formatCalories(320)).toBe('320 kcal');
  });
});
```

## Mocking

**Framework:** Vitest `vi` API

**Patterns:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAnalyzeFood } from './useAnalyzeFood';
import * as analyzeFoodApiModule from '../api/analyzeFoodApi';

vi.mock('../api/analyzeFoodApi');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useAnalyzeFood', () => {
  beforeEach(() => {
    vi.mocked(analyzeFoodApiModule.analyzeFoodApi).mockResolvedValue(mockResponse);
  });

  it('fetches nutrition data when image is provided', async () => {
    const file = new File(['data'], 'food.jpg', { type: 'image/jpeg' });
    const { result } = renderHook(() => useAnalyzeFood(file), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(analyzeFoodApiModule.analyzeFoodApi).toHaveBeenCalledWith(file);
  });
});
```

**What to Mock:**
- HTTP API modules (`vi.mock('../api/analyzeFoodApi')`) — never hit real backend in unit tests
- React Query: disable retries in test `QueryClient` (`retry: false`)
- jsdom gaps: `URL.createObjectURL` / `revokeObjectURL` polyfilled in `apps/mobile/src/test/setup.ts`

**What NOT to Mock:**
- Zustand store implementation under test — test real store, reset with `setState` in `beforeEach`
- Pure utility functions — test directly without mocks
- React Testing Library primitives (`renderHook`, `act`, `waitFor`)
- `@ai-food/shared-types` — use real type shapes for fixtures

**Zustand store reset pattern:**
```typescript
beforeEach(() => {
  useDiaryStore.setState({ meals: [] });
});
```
Apply to any Zustand store before each test to avoid cross-test leakage. For `persist` stores (`useDiaryStore`), in-memory `setState` is sufficient for unit tests; localStorage side effects are not asserted.

## Fixtures and Factories

**Test Data:**
```typescript
const mockMeal: Meal = {
  id: '1',
  timestamp: '2026-06-24T10:00:00.000Z',
  items: [
    {
      id: 'item-1',
      name: 'Chicken Salad',
      calories: 320,
      protein: 35,
      carbs: 18,
      fat: 12,
      portion: '1 serving',
    },
  ],
  totalCalories: 320,
};

const mockResponse: AnalyzeFoodResponse = {
  result: {
    foodName: 'Test Food',
    calories: 300,
    protein: 20,
    carbs: 30,
    fat: 10,
    fiber: 5,
    confidence: 0.92,
  },
  processingTime: 2000,
};
```

**Location:**
- Inline constants at top of test file, named `mock*` — no shared `fixtures/` directory yet
- Use `new File(['data'], 'food.jpg', { type: 'image/jpeg' })` for image file fixtures
- Derive variants with spread — `{ ...mockMeal, id: '2' }`

**Prescriptive for new fixtures:**
- Define `mock*` constants in the test file unless reused across 3+ files
- If shared, add `apps/mobile/src/test/fixtures/` (not present yet) and export from `apps/mobile/src/test/index.ts`

## Coverage

**Requirements:** None enforced — no coverage thresholds in `vitest.config.ts`

**View Coverage:**
```bash
pnpm --filter @ai-food/mobile exec vitest run --coverage
```
Note: `@vitest/coverage-v8` is not installed; add it before using `--coverage`.

## Test Types

**Unit Tests:**
- Primary and only test type in the repo
- Scope: pure functions, Zustand stores, React Query hooks
- 4 test files, ~20 test cases total
- No component render tests (`render(<Component />)`) despite `@testing-library/react` being available

**Integration Tests:**
- Not used
- API integration with Express backend is manual (dev server), not automated

**E2E Tests:**
- Not used — no Playwright, Cypress, or Detox configuration

## Common Patterns

**Async Testing:**
```typescript
it('fetches nutrition data when image is provided', async () => {
  const { result } = renderHook(() => useAnalyzeFood(file), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(mockResponse);
});
```

**Idle/disabled query testing:**
```typescript
it('is in idle state when image is null', () => {
  const { result } = renderHook(() => useAnalyzeFood(null), {
    wrapper: createWrapper(),
  });
  expect(result.current.fetchStatus).toBe('idle');
  expect(result.current.data).toBeUndefined();
});
```

**Error Testing:**
- Not implemented in existing tests
- Recommended pattern when adding:
```typescript
beforeEach(() => {
  vi.mocked(analyzeFoodApiModule.analyzeFoodApi).mockRejectedValue(
    new Error('Network error')
  );
});

it('surfaces error state', async () => {
  const { result } = renderHook(() => useAnalyzeFood(file), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.isError).toBe(true));
});
```

**Global setup (`apps/mobile/src/test/setup.ts`):**
```typescript
import '@testing-library/jest-dom';

if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = (_blob: Blob) => `blob:mock-${Math.random()}`;
}
if (!global.URL.revokeObjectURL) {
  global.URL.revokeObjectURL = () => {};
}
```
Add new global polyfills here, not per-file.

## Turbo / Monorepo

**Root `package.json`:**
- `"test": "turbo test"` orchestrates all workspace packages

**`turbo.json` test task:**
- `dependsOn: ["^build"]` — shared packages build before tests run
- Only `@ai-food/mobile` defines a `test` script; `@ai-food/backend` and `@ai-food/shared-types` are skipped by Turbo

**Shared types in tests:**
- Import directly from `@ai-food/shared-types` — workspace dependency, no build artifact required for Vitest (source export)

## Gaps and Priorities

| Area | Status | Risk |
|------|--------|------|
| React component / page tests | Missing | UI regressions undetected |
| `useSaveMeal` hook | Untested | Save flow logic unverified |
| Backend routes | No tests | Mock API behavior unverified |
| Error paths (API failures) | Untested | Error UI may break silently |
| E2E user flows | Missing | Full journey untested |
| Coverage reporting | Not configured | No visibility into test breadth |

**Recommended next tests (in priority order):**
1. `useSaveMeal` — mock `useDiaryStore`, `useImageStore`, `useNavigate`; assert meal shape and navigation
2. `ResultPage` error/loading states — `render` with QueryClientProvider
3. `analyze-food` route — add Vitest + supertest in `apps/backend` when backend grows beyond mock

---

*Testing analysis: 2026-06-24*
