# Gallery Multi-Select → Separate Meals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gallery multi-select creates one diary meal per photo (max 10, quota-truncated), instead of one multi-angle meal.

**Architecture:** Pure `limitGalleryMealFiles` in `features/add-food/lib` owns max/quota truncation. `AddFoodSheet` calls it, shows toasts, then fires N × `submitFood({ image })`. Legacy `images[]` analyze path stays for old meals/retry. E2E asserts N analyze bodies / N cards, not a photo-count badge.

**Tech Stack:** React 18 + TypeScript, Vitest + Testing Library, Playwright e2e, sonner toasts, existing `useSaveMeal` / concurrent `runMealAnalyze`.

**Spec:** `apps/ai-food/docs/superpowers/specs/2026-11-16-gallery-separate-meals-design.md`

## Global Constraints

- Cross-slice imports only via barrel `index.ts` (FSD).
- Named exports only; no `any` / `@ts-ignore`.
- Hard limit ~150 lines per file; extract helper instead of growing `AddFoodSheet`.
- Russian UI strings hardcoded (match current `AddFoodSheet` style).
- Do **not** remove API `images[]` or legacy multi-angle retry/display.
- `MAX_FOOD_IMAGES = 10`.
- Quota: finite `remaining` truncates; toast `Хватило на X из Y`; empty after truncate → paywall.
- Tests are primary acceptance (unit helper + sheet + e2e).

## File map

| File | Role |
|------|------|
| Create `src/features/add-food/lib/limitGalleryMealFiles.ts` | Pure max + quota truncation |
| Create `src/features/add-food/lib/limitGalleryMealFiles.test.ts` | Unit table from spec |
| Create `src/features/add-food/lib/index.ts` | Barrel re-export |
| Modify `src/features/add-food/ui/AddFoodSheet.tsx` | Use helper; N submits; copy/limit 10 |
| Create `src/features/add-food/ui/AddFoodSheet.test.tsx` | Sheet wiring: N×`{ image }`, toasts, paywall |
| Modify `e2e/fixtures/photo.ts` | New gallery `aria-label` |
| Modify `e2e/analyze-photo.spec.ts` | Replace badge-3 with N separate meals |

---

### Task 1: `limitGalleryMealFiles` helper

**Files:**
- Create: `apps/ai-food/src/features/add-food/lib/limitGalleryMealFiles.ts`
- Create: `apps/ai-food/src/features/add-food/lib/limitGalleryMealFiles.test.ts`
- Create: `apps/ai-food/src/features/add-food/lib/index.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface LimitGalleryMealFilesOptions {
    max: number;
    /** `null` = unlimited (subscription / unknown); do not quota-truncate */
    remaining: number | null;
  }

  export interface LimitGalleryMealFilesResult {
    files: File[];
    truncatedByMax: boolean;
    truncatedByQuota: boolean;
    requestedCount: number;
  }

  export function limitGalleryMealFiles(
    files: File[],
    options: LimitGalleryMealFilesOptions,
  ): LimitGalleryMealFilesResult;
  ```

- [ ] **Step 1: Write the failing tests**

Create `apps/ai-food/src/features/add-food/lib/limitGalleryMealFiles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { limitGalleryMealFiles } from './limitGalleryMealFiles';

function files(n: number): File[] {
  return Array.from(
    { length: n },
    (_, i) => new File([`b${i}`], `f${i}.jpg`, { type: 'image/jpeg' }),
  );
}

describe('limitGalleryMealFiles', () => {
  it('returns empty for empty input', () => {
    const result = limitGalleryMealFiles([], { max: 10, remaining: null });
    expect(result).toEqual({
      files: [],
      truncatedByMax: false,
      truncatedByQuota: false,
      requestedCount: 0,
    });
  });

  it('keeps a single file unchanged', () => {
    const input = files(1);
    const result = limitGalleryMealFiles(input, { max: 10, remaining: null });
    expect(result.files).toEqual(input);
    expect(result.truncatedByMax).toBe(false);
    expect(result.truncatedByQuota).toBe(false);
    expect(result.requestedCount).toBe(1);
  });

  it('caps at max and sets truncatedByMax', () => {
    const input = files(11);
    const result = limitGalleryMealFiles(input, { max: 10, remaining: null });
    expect(result.files).toHaveLength(10);
    expect(result.files).toEqual(input.slice(0, 10));
    expect(result.truncatedByMax).toBe(true);
    expect(result.truncatedByQuota).toBe(false);
    expect(result.requestedCount).toBe(11);
  });

  it('truncates by finite remaining', () => {
    const input = files(7);
    const result = limitGalleryMealFiles(input, { max: 10, remaining: 3 });
    expect(result.files).toHaveLength(3);
    expect(result.truncatedByMax).toBe(false);
    expect(result.truncatedByQuota).toBe(true);
    expect(result.requestedCount).toBe(7);
  });

  it('does not quota-truncate when remaining is null', () => {
    const input = files(7);
    const result = limitGalleryMealFiles(input, { max: 10, remaining: null });
    expect(result.files).toHaveLength(7);
    expect(result.truncatedByQuota).toBe(false);
  });

  it('returns empty when remaining is 0', () => {
    const input = files(5);
    const result = limitGalleryMealFiles(input, { max: 10, remaining: 0 });
    expect(result.files).toEqual([]);
    expect(result.truncatedByQuota).toBe(true);
    expect(result.requestedCount).toBe(5);
  });

  it('applies max then quota', () => {
    const input = files(15);
    const result = limitGalleryMealFiles(input, { max: 10, remaining: 4 });
    expect(result.files).toHaveLength(4);
    expect(result.files).toEqual(input.slice(0, 4));
    expect(result.truncatedByMax).toBe(true);
    expect(result.truncatedByQuota).toBe(true);
    expect(result.requestedCount).toBe(15);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `D:\Project\Main\ai-food-base\apps\ai-food`:

```bash
pnpm test -- src/features/add-food/lib/limitGalleryMealFiles.test.ts
```

Expected: FAIL — module `./limitGalleryMealFiles` not found (or export missing).

- [ ] **Step 3: Implement helper + barrel**

Create `apps/ai-food/src/features/add-food/lib/limitGalleryMealFiles.ts`:

```ts
export interface LimitGalleryMealFilesOptions {
  max: number;
  /** `null` = unlimited; do not quota-truncate */
  remaining: number | null;
}

export interface LimitGalleryMealFilesResult {
  files: File[];
  truncatedByMax: boolean;
  truncatedByQuota: boolean;
  requestedCount: number;
}

export function limitGalleryMealFiles(
  files: File[],
  { max, remaining }: LimitGalleryMealFilesOptions,
): LimitGalleryMealFilesResult {
  const requestedCount = files.length;
  const truncatedByMax = requestedCount > max;
  const afterMax = files.slice(0, Math.max(0, max));

  if (remaining === null) {
    return {
      files: afterMax,
      truncatedByMax,
      truncatedByQuota: false,
      requestedCount,
    };
  }

  const capped = Math.max(0, remaining);
  const truncatedByQuota = afterMax.length > capped;
  return {
    files: afterMax.slice(0, capped),
    truncatedByMax,
    truncatedByQuota,
    requestedCount,
  };
}
```

Create `apps/ai-food/src/features/add-food/lib/index.ts`:

```ts
export {
  limitGalleryMealFiles,
  type LimitGalleryMealFilesOptions,
  type LimitGalleryMealFilesResult,
} from './limitGalleryMealFiles';
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- src/features/add-food/lib/limitGalleryMealFiles.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/features/add-food/lib
git commit -m "feat(ai-food): add limitGalleryMealFiles for per-photo gallery picks"
```

---

### Task 2: Wire `AddFoodSheet` + component tests

**Files:**
- Modify: `apps/ai-food/src/features/add-food/ui/AddFoodSheet.tsx`
- Create: `apps/ai-food/src/features/add-food/ui/AddFoodSheet.test.tsx`

**Interfaces:**
- Consumes: `limitGalleryMealFiles` from `../lib`
- Produces: `MAX_FOOD_IMAGES === 10`; gallery selection → N × `submitFood({ image })` never `{ images }`; aria-label `Выбор из галереи (до 10 фото, каждое — отдельное блюдо)`

- [ ] **Step 1: Write the failing sheet tests**

Create `apps/ai-food/src/features/add-food/ui/AddFoodSheet.test.tsx`:

```ts
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsageSnapshot } from '@/features/auth';

const mocks = vi.hoisted(() => ({
  submitFood: vi.fn(),
  usage: undefined as UsageSnapshot | undefined,
  toastMessage: vi.fn(),
  showPaywall: vi.fn(),
}));

vi.mock('@/features/save-meal', () => ({
  useSaveMeal: () => mocks.submitFood,
}));

vi.mock('@/features/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/auth')>();
  return {
    ...actual,
    useUsage: () => ({ data: mocks.usage }),
  };
});

vi.mock('@/features/billing', () => ({
  showGenerationQuotaPaywall: (...args: unknown[]) => mocks.showPaywall(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    message: (...args: unknown[]) => mocks.toastMessage(...args),
    error: vi.fn(),
  },
}));

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    BottomSheet: ({
      open,
      children,
    }: {
      open: boolean;
      onClose: () => void;
      children: React.ReactNode;
    }) => (open ? <div data-testid="add-food-sheet">{children}</div> : null),
  };
});

import { AddFoodSheet } from './AddFoodSheet';

function fileList(n: number): File[] {
  return Array.from(
    { length: n },
    (_, i) => new File([`x${i}`], `meal-${i}.jpg`, { type: 'image/jpeg' }),
  );
}

function renderSheet(): void {
  render(
    <MemoryRouter>
      <AddFoodSheet open onClose={vi.fn()} />
    </MemoryRouter>,
  );
}

function pickFiles(files: File[]): void {
  const input = screen.getByLabelText(/Выбор из галереи/);
  fireEvent.change(input, { target: { files } });
}

describe('AddFoodSheet gallery multi-select', () => {
  beforeEach(() => {
    mocks.submitFood.mockReset();
    mocks.toastMessage.mockReset();
    mocks.showPaywall.mockReset();
    mocks.usage = {
      used: 0,
      limit: 50,
      remaining: null,
      authenticated: false,
      hasActiveSubscription: true,
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 0,
    };
  });

  it('submits one meal per photo, never images[]', () => {
    renderSheet();
    const picked = fileList(3);
    pickFiles(picked);

    expect(mocks.submitFood).toHaveBeenCalledTimes(3);
    for (let i = 0; i < 3; i += 1) {
      expect(mocks.submitFood).toHaveBeenNthCalledWith(i + 1, {
        image: picked[i],
      });
    }
    expect(
      mocks.submitFood.mock.calls.some(
        (call) => call[0] && typeof call[0] === 'object' && 'images' in call[0],
      ),
    ).toBe(false);
  });

  it('caps at 10 and toasts', () => {
    renderSheet();
    pickFiles(fileList(11));

    expect(mocks.toastMessage).toHaveBeenCalledWith(
      'Можно выбрать не больше 10 фото',
    );
    expect(mocks.submitFood).toHaveBeenCalledTimes(10);
  });

  it('truncates to remaining quota and toasts', () => {
    mocks.usage = {
      used: 47,
      limit: 50,
      remaining: 3,
      authenticated: false,
      hasActiveSubscription: false,
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 0,
    };
    renderSheet();
    pickFiles(fileList(7));

    expect(mocks.toastMessage).toHaveBeenCalledWith('Хватило на 3 из 7');
    expect(mocks.submitFood).toHaveBeenCalledTimes(3);
  });

  it('opens paywall when quota is exhausted', () => {
    mocks.usage = {
      used: 50,
      limit: 50,
      remaining: 0,
      authenticated: false,
      hasActiveSubscription: false,
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 0,
    };
    renderSheet();
    pickFiles(fileList(2));

    expect(mocks.submitFood).not.toHaveBeenCalled();
    expect(mocks.showPaywall).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run sheet tests to verify they fail**

```bash
pnpm test -- src/features/add-food/ui/AddFoodSheet.test.tsx
```

Expected: FAIL — still submits `{ images }` for multi file and/or `MAX_FOOD_IMAGES` is 3 / old aria-label / wrong toast.

- [ ] **Step 3: Update `AddFoodSheet.tsx`**

In `apps/ai-food/src/features/add-food/ui/AddFoodSheet.tsx`:

1. Import helper:
   ```ts
   import { limitGalleryMealFiles } from '../lib';
   ```
2. Change constant:
   ```ts
   /** Max photos per gallery pick — each photo becomes its own meal. */
   export const MAX_FOOD_IMAGES = 10;
   ```
3. Replace `handleImagesSelect` body with:

```ts
  const handleImagesSelect = (files: File[]) => {
    if (generationLocked) {
      handleGenerationLocked();
      return;
    }
    if (files.length === 0) return;

    const remaining =
      !usage ||
      usage.hasActiveSubscription ||
      usage.remaining === null
        ? null
        : usage.remaining;

    const {
      files: limited,
      truncatedByMax,
      truncatedByQuota,
      requestedCount,
    } = limitGalleryMealFiles(files, {
      max: MAX_FOOD_IMAGES,
      remaining,
    });

    if (truncatedByMax) {
      toast.message(`Можно выбрать не больше ${MAX_FOOD_IMAGES} фото`);
    }
    if (truncatedByQuota && limited.length > 0) {
      toast.message(`Хватило на ${limited.length} из ${requestedCount}`);
    }

    if (limited.length === 0) {
      handleGenerationLocked();
      return;
    }

    handleClose();
    for (const image of limited) {
      void submitFood({ image });
    }
  };
```

4. Update input aria-label to:
   ```tsx
   aria-label="Выбор из галереи (до 10 фото, каждое — отдельное блюдо)"
   ```

Ensure `usage` from `useUsage()` is already in scope (`const { data: usage } = useUsage();` — already present).

- [ ] **Step 4: Run sheet + helper tests**

```bash
pnpm test -- src/features/add-food/lib/limitGalleryMealFiles.test.ts src/features/add-food/ui/AddFoodSheet.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/features/add-food/ui/AddFoodSheet.tsx apps/ai-food/src/features/add-food/ui/AddFoodSheet.test.tsx
git commit -m "feat(ai-food): gallery multi-select creates one meal per photo"
```

---

### Task 3: E2E — N photos → N analyzes / meals

**Files:**
- Modify: `apps/ai-food/e2e/fixtures/photo.ts`
- Modify: `apps/ai-food/e2e/analyze-photo.spec.ts`

**Interfaces:**
- Consumes: new gallery aria-label from Task 2
- Produces: e2e proves 3 gallery files → 3 analyze requests (not one multi-image meal / badge `3`)

- [ ] **Step 1: Update fixture label**

In `apps/ai-food/e2e/fixtures/photo.ts`, change:

```ts
const input = page.getByLabel('Выбор из галереи (до 3 ракурсов)');
```

to:

```ts
const input = page.getByLabel(
  'Выбор из галереи (до 10 фото, каждое — отдельное блюдо)',
);
```

- [ ] **Step 2: Replace badge e2e with separate-meals e2e**

In `apps/ai-food/e2e/analyze-photo.spec.ts`, replace the test `галерея 3 фото показывает badge количества` with:

```ts
  test('галерея 3 фото создаёт 3 отдельных приёма', async ({
    onboardedPage: page,
  }) => {
    await uploadFromAddFoodGallery(page, [
      TEST_IMAGE_PATH,
      TEST_IMAGE_PATH,
      TEST_IMAGE_PATH,
    ]);

    await expect
      .poll(() => getCapturedAnalyzeBodies().length, { timeout: 30_000 })
      .toBe(3);

    for (const body of getCapturedAnalyzeBodies().slice(-3)) {
      const payload = body as {
        images?: string[];
        image?: string;
      };
      const imageCount =
        payload.images?.length ?? (payload.image ? 1 : 0);
      expect(imageCount).toBe(1);
    }

    await dismissBlockingSheets(page);
    await expect(
      page.getByRole('button', { name: /Куриный салат с рисом/ }),
    ).toHaveCount(3, { timeout: 30_000 });
  });
```

Keep the single-photo test unchanged. Ensure `getCapturedAnalyzeBodies` remains imported from `./fixtures/gateway-mock`.

If `toHaveCount(3)` is flaky because meal titles duplicate as one locator group that already works — prefer asserting analyze body count `=== 3` as hard requirement and meal buttons count as soft; both should pass with mock gateway.

- [ ] **Step 3: Run unit suite for add-food + e2e analyze-photo**

```bash
pnpm test -- src/features/add-food
pnpm test:e2e -- e2e/analyze-photo.spec.ts
```

(Run from `apps/ai-food`. If `test:e2e` script ignores extra args, use: `pnpm exec playwright test e2e/analyze-photo.spec.ts`.)

Expected: unit PASS; e2e PASS including new 3-meal test; old badge assertion gone.

- [ ] **Step 4: Commit**

```bash
git add apps/ai-food/e2e/fixtures/photo.ts apps/ai-food/e2e/analyze-photo.spec.ts
git commit -m "test(ai-food): e2e gallery multi-select creates separate meals"
```

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| N photos → N meals, never gallery `images[]` | Task 2 |
| Max 10 | Task 1–2 |
| Quota truncate + toast | Task 1–2 |
| remaining 0 → paywall | Task 2 |
| Pure helper + unit table | Task 1 |
| Sheet tests | Task 2 |
| E2E replace badge-3 | Task 3 |
| Legacy multi-angle API/retry untouched | Out of scope / no task edits those files |

## Placeholder scan

No TBD / “similar to Task N” / empty test steps.

## Type consistency

`limitGalleryMealFiles(files, { max, remaining })` → `{ files, truncatedByMax, truncatedByQuota, requestedCount }` used identically in Task 1 tests and Task 2 sheet wiring.
