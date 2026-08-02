# Manual Food Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add «Вручную» to AddFoodSheet and a `/manual-entry` page where the user can attach an optional photo, enter dish name + KBJU, optionally draft composition items, and save a ready meal to the diary without AI.

**Architecture:** Pure `buildManualMeal` maps form input → `Meal`. `useSaveManualMeal` persists an optional photo via `saveMealImage`, calls `buildManualMeal`, then `useDiaryStore.addMeal`. Page UI lives in `pages/manual-entry`; composition draft list in `features/manual-entry`. Entry button in existing `AddFoodSheet` navigates to `/manual-entry`.

**Tech Stack:** React 18 + TypeScript, Zustand diary store, react-router-dom, Vitest + Testing Library, Tailwind + existing shared `Button`, lucide-react icons, `@ai-food/shared-types`.

## Global Constraints

- Cross-slice imports MUST go through `index.ts` barrels (no deep imports like `@/features/manual-entry/ui/…` from outside the slice).
- FSD layer order: `app → pages → widgets → features → entities → shared`. No same-layer feature→feature imports.
- Named function exports for components — no default exports.
- 2-space indentation, single quotes, semicolons, trailing commas in multiline literals.
- No AI analyze/refine on this path; meal `status: 'ready'`, no `aiModel`.
- Russian UI copy: «Вручную», «Сохранить», «Состав», «Добавить», «Убрать».
- Spec: `docs/superpowers/specs/2026-08-03-manual-food-entry-design.md`.

## File map

| Path | Responsibility |
|------|----------------|
| `features/manual-entry/model/buildManualMeal.ts` | Pure validation + Meal assembly |
| `features/manual-entry/model/buildManualMeal.test.ts` | Unit tests for build rules |
| `features/manual-entry/model/useSaveManualMeal.ts` | Photo persist + addMeal + return mealId |
| `features/manual-entry/model/useSaveManualMeal.test.ts` | Hook tests |
| `features/manual-entry/ui/ManualCompositionDraft.tsx` | Composition list + add/remove |
| `features/manual-entry/index.ts` | Public barrel |
| `pages/manual-entry/ui/ManualEntryPage.tsx` | Full form page |
| `pages/manual-entry/index.ts` | Page barrel |
| `app/router.tsx` | Route `/manual-entry` |
| `features/add-food/ui/AddFoodSheet.tsx` | «Вручную» button |
| `features/news/model/changelog.ts` | User-facing news line |
| `entities/meal/index.ts` | Export `sumItemCalories` (used by builder) |

---

### Task 1: `buildManualMeal` pure builder

**Files:**
- Create: `apps/mobile/src/features/manual-entry/model/buildManualMeal.ts`
- Create: `apps/mobile/src/features/manual-entry/model/buildManualMeal.test.ts`
- Modify: `apps/mobile/src/entities/meal/index.ts` (export `sumItemCalories`)
- Create: `apps/mobile/src/features/manual-entry/index.ts` (partial — export builder types)

**Interfaces:**
- Produces:
  - `ManualCompositionDraftItem` — draft row shape
  - `BuildManualMealInput` — form payload (no File)
  - `buildManualMeal(input, ids): Meal | null` — returns `null` if invalid

- [ ] **Step 1: Export `sumItemCalories` from entities barrel**

In `apps/mobile/src/entities/meal/index.ts`, add `sumItemCalories` to the existing `mealNutritionMath` export block:

```ts
export {
  sanitizeNutrient,
  nutrientsFromPer100,
  nutrientsPer100FromPortion,
  scalePortionNutrientsByGrams,
  sumItemCalories,
  type PortionNutrients,
  type NutrientKey,
} from './model/mealNutritionMath';
```

- [ ] **Step 2: Write the failing tests**

Create `apps/mobile/src/features/manual-entry/model/buildManualMeal.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildManualMeal, type BuildManualMealInput } from './buildManualMeal';

const ids = {
  mealId: 'meal-1',
  itemId: 'item-1',
  timestamp: '2026-08-03T12:00:00.000Z',
};

function baseInput(overrides: Partial<BuildManualMealInput> = {}): BuildManualMealInput {
  return {
    name: 'Овсянка',
    calories: 350,
    protein: 12,
    carbs: 55,
    fat: 8,
    fiber: 4,
    grams: 250,
    composition: [],
    ...overrides,
  };
}

describe('buildManualMeal', () => {
  it('returns null when name is blank', () => {
    expect(buildManualMeal(baseInput({ name: '   ' }), ids)).toBeNull();
  });

  it('returns null when composition empty and calories <= 0', () => {
    expect(buildManualMeal(baseInput({ calories: 0 }), ids)).toBeNull();
  });

  it('builds single-item meal from dish fields when composition empty', () => {
    const meal = buildManualMeal(baseInput(), ids);
    expect(meal).not.toBeNull();
    expect(meal!.id).toBe('meal-1');
    expect(meal!.name).toBe('Овсянка');
    expect(meal!.status).toBe('ready');
    expect(meal!.portions).toBe(1);
    expect(meal!.aiModel).toBeUndefined();
    expect(meal!.items).toHaveLength(1);
    expect(meal!.items[0]).toMatchObject({
      id: 'item-1',
      name: 'Овсянка',
      calories: 350,
      protein: 12,
      carbs: 55,
      fat: 8,
      fiber: 4,
      grams: 250,
    });
    expect(meal!.totalCalories).toBe(350);
    expect(meal!.totalGrams).toBe(250);
  });

  it('uses composition items and sums totals when composition non-empty', () => {
    const meal = buildManualMeal(
      baseInput({
        calories: 999,
        composition: [
          {
            id: 'c1',
            name: 'Овёс',
            calories: 200,
            protein: 8,
            carbs: 30,
            fat: 4,
            fiber: 2,
            grams: 100,
          },
          {
            id: 'c2',
            name: 'Молоко',
            calories: 150,
            protein: 6,
            carbs: 12,
            fat: 5,
            fiber: 0,
            grams: 150,
          },
        ],
      }),
      ids,
    );
    expect(meal).not.toBeNull();
    expect(meal!.items).toHaveLength(2);
    expect(meal!.items.map((i) => i.name)).toEqual(['Овёс', 'Молоко']);
    expect(meal!.totalCalories).toBe(350);
    expect(meal!.totalGrams).toBe(250);
    expect(meal!.name).toBe('Овсянка');
  });

  it('returns null when a composition item has blank name or calories <= 0', () => {
    expect(
      buildManualMeal(
        baseInput({
          composition: [
            {
              id: 'c1',
              name: '  ',
              calories: 100,
              protein: 0,
              carbs: 0,
              fat: 0,
              fiber: 0,
              grams: 50,
            },
          ],
        }),
        ids,
      ),
    ).toBeNull();

    expect(
      buildManualMeal(
        baseInput({
          composition: [
            {
              id: 'c1',
              name: 'Овёс',
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              fiber: 0,
              grams: 50,
            },
          ],
        }),
        ids,
      ),
    ).toBeNull();
  });

  it('attaches imageUris when provided', () => {
    const meal = buildManualMeal(baseInput(), {
      ...ids,
      imageUris: ['meal-images/a.jpg'],
    });
    expect(meal!.imageUri).toBe('meal-images/a.jpg');
    expect(meal!.imageUris).toEqual(['meal-images/a.jpg']);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @ai-food/mobile test -- buildManualMeal.test.ts`

Expected: FAIL — module `./buildManualMeal` not found.

- [ ] **Step 4: Implement `buildManualMeal`**

Create `apps/mobile/src/features/manual-entry/model/buildManualMeal.ts`:

```ts
import type { FoodItem, Meal } from '@ai-food/shared-types';
import {
  sanitizeGrams,
  sanitizeNutrient,
  sumItemCalories,
  sumItemGrams,
} from '@/entities/meal';

export interface ManualCompositionDraftItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  grams: number;
}

export interface BuildManualMealInput {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  grams?: number;
  composition: ManualCompositionDraftItem[];
}

export interface BuildManualMealIds {
  mealId: string;
  itemId: string;
  timestamp: string;
  imageUris?: string[];
}

function toFoodItem(
  draft: ManualCompositionDraftItem,
): FoodItem {
  return {
    id: draft.id,
    name: draft.name.trim(),
    calories: sanitizeNutrient(draft.calories),
    protein: sanitizeNutrient(draft.protein),
    carbs: sanitizeNutrient(draft.carbs),
    fat: sanitizeNutrient(draft.fat),
    fiber: sanitizeNutrient(draft.fiber),
    grams: sanitizeGrams(draft.grams),
  };
}

export function buildManualMeal(
  input: BuildManualMealInput,
  ids: BuildManualMealIds,
): Meal | null {
  const name = input.name.trim();
  if (!name) return null;

  let items: FoodItem[];

  if (input.composition.length === 0) {
    const calories = sanitizeNutrient(input.calories);
    if (calories <= 0) return null;
    const grams = sanitizeGrams(input.grams ?? 100);
    items = [
      {
        id: ids.itemId,
        name,
        calories,
        protein: sanitizeNutrient(input.protein),
        carbs: sanitizeNutrient(input.carbs),
        fat: sanitizeNutrient(input.fat),
        fiber: sanitizeNutrient(input.fiber ?? 0),
        grams,
      },
    ];
  } else {
    for (const row of input.composition) {
      if (!row.name.trim()) return null;
      if (sanitizeNutrient(row.calories) <= 0) return null;
    }
    items = input.composition.map(toFoodItem);
  }

  const totalCalories = sumItemCalories(items);
  const gramsSum = sumItemGrams(items);
  const imageUris = ids.imageUris?.length ? ids.imageUris : undefined;

  return {
    id: ids.mealId,
    timestamp: ids.timestamp,
    name,
    items,
    totalCalories,
    portions: 1,
    status: 'ready',
    ...(gramsSum > 0 ? { totalGrams: gramsSum } : {}),
    ...(imageUris
      ? { imageUri: imageUris[0], imageUris }
      : {}),
  };
}
```

Create `apps/mobile/src/features/manual-entry/index.ts`:

```ts
export {
  buildManualMeal,
  type ManualCompositionDraftItem,
  type BuildManualMealInput,
  type BuildManualMealIds,
} from './model/buildManualMeal';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @ai-food/mobile test -- buildManualMeal.test.ts`

Expected: PASS (all tests).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/entities/meal/index.ts \
  apps/mobile/src/features/manual-entry/model/buildManualMeal.ts \
  apps/mobile/src/features/manual-entry/model/buildManualMeal.test.ts \
  apps/mobile/src/features/manual-entry/index.ts
git commit -m "feat: add buildManualMeal for manual diary entry"
```

---

### Task 2: `useSaveManualMeal` hook

**Files:**
- Create: `apps/mobile/src/features/manual-entry/model/useSaveManualMeal.ts`
- Create: `apps/mobile/src/features/manual-entry/model/useSaveManualMeal.test.ts`
- Modify: `apps/mobile/src/features/manual-entry/index.ts`

**Interfaces:**
- Consumes: `buildManualMeal`, `BuildManualMealInput` (composition without needing File in builder)
- Produces: `useSaveManualMeal(): (input: SaveManualMealInput) => Promise<string | null>`
  - `SaveManualMealInput = BuildManualMealInput & { image?: File | null }`
  - Returns `mealId` on success, `null` on validation failure
  - On `saveMealImage` throw: rethrow after not calling `addMeal` (page shows toast)

- [ ] **Step 1: Write the failing tests**

Create `apps/mobile/src/features/manual-entry/model/useSaveManualMeal.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSaveManualMeal } from './useSaveManualMeal';
import { useDiaryStore } from '@/entities/meal';
import { saveMealImage } from '@/shared/lib';

vi.mock('@/shared/lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib')>();
  return {
    ...actual,
    saveMealImage: vi.fn().mockImplementation(async (file: File) => {
      return `meal-images/${file.name}`;
    }),
  };
});

describe('useSaveManualMeal', () => {
  beforeEach(() => {
    useDiaryStore.setState({ meals: [], selectedDate: new Date('2026-08-03T10:00:00.000Z') });
    vi.mocked(saveMealImage).mockClear();
    vi.mocked(saveMealImage).mockImplementation(async (file: File) => {
      return `meal-images/${file.name}`;
    });
  });

  it('saves single-item ready meal without composition', async () => {
    const { result } = renderHook(() => useSaveManualMeal());
    let mealId: string | null = null;

    await act(async () => {
      mealId = await result.current({
        name: 'Овсянка',
        calories: 350,
        protein: 12,
        carbs: 55,
        fat: 8,
        fiber: 4,
        grams: 250,
        composition: [],
      });
    });

    expect(mealId).toBeTruthy();
    const meal = useDiaryStore.getState().meals[0];
    expect(meal.id).toBe(mealId);
    expect(meal.status).toBe('ready');
    expect(meal.items).toHaveLength(1);
    expect(meal.totalCalories).toBe(350);
    expect(meal.aiModel).toBeUndefined();
    expect(saveMealImage).not.toHaveBeenCalled();
  });

  it('saves composition sum and image uris', async () => {
    const { result } = renderHook(() => useSaveManualMeal());
    const file = new File(['x'], 'bowl.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current({
        name: 'Овсянка',
        calories: 999,
        protein: 0,
        carbs: 0,
        fat: 0,
        composition: [
          {
            id: 'c1',
            name: 'Овёс',
            calories: 200,
            protein: 8,
            carbs: 30,
            fat: 4,
            fiber: 0,
            grams: 100,
          },
          {
            id: 'c2',
            name: 'Молоко',
            calories: 150,
            protein: 6,
            carbs: 12,
            fat: 5,
            fiber: 0,
            grams: 150,
          },
        ],
        image: file,
      });
    });

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.items).toHaveLength(2);
    expect(meal.totalCalories).toBe(350);
    expect(meal.imageUri).toBe('meal-images/bowl.jpg');
    expect(meal.imageUris).toEqual(['meal-images/bowl.jpg']);
    expect(saveMealImage).toHaveBeenCalledWith(file);
  });

  it('returns null and does not add meal when invalid', async () => {
    const { result } = renderHook(() => useSaveManualMeal());
    let mealId: string | null = 'sentinel';

    await act(async () => {
      mealId = await result.current({
        name: '',
        calories: 100,
        protein: 0,
        carbs: 0,
        fat: 0,
        composition: [],
      });
    });

    expect(mealId).toBeNull();
    expect(useDiaryStore.getState().meals).toHaveLength(0);
  });

  it('does not add meal when saveMealImage throws', async () => {
    vi.mocked(saveMealImage).mockRejectedValueOnce(new Error('disk full'));
    const { result } = renderHook(() => useSaveManualMeal());
    const file = new File(['x'], 'bowl.jpg', { type: 'image/jpeg' });

    await expect(
      act(async () => {
        await result.current({
          name: 'Овсянка',
          calories: 350,
          protein: 0,
          carbs: 0,
          fat: 0,
          composition: [],
          image: file,
        });
      }),
    ).rejects.toThrow('disk full');

    expect(useDiaryStore.getState().meals).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @ai-food/mobile test -- useSaveManualMeal.test.ts`

Expected: FAIL — module not found / `useSaveManualMeal` undefined.

- [ ] **Step 3: Implement the hook**

Create `apps/mobile/src/features/manual-entry/model/useSaveManualMeal.ts`:

```ts
import { useDiaryStore } from '@/entities/meal';
import { saveMealImage, timestampForSelectedDate } from '@/shared/lib';
import {
  buildManualMeal,
  type BuildManualMealInput,
} from './buildManualMeal';

export type SaveManualMealInput = BuildManualMealInput & {
  image?: File | null;
};

export function useSaveManualMeal() {
  return async (input: SaveManualMealInput): Promise<string | null> => {
    const { selectedDate, addMeal } = useDiaryStore.getState();
    const mealId = crypto.randomUUID();
    const itemId = crypto.randomUUID();
    const timestamp = timestampForSelectedDate(selectedDate);

    let imageUris: string[] | undefined;
    if (input.image) {
      const uri = await saveMealImage(input.image);
      imageUris = [uri];
    }

    const meal = buildManualMeal(
      {
        name: input.name,
        calories: input.calories,
        protein: input.protein,
        carbs: input.carbs,
        fat: input.fat,
        fiber: input.fiber,
        grams: input.grams,
        composition: input.composition,
      },
      { mealId, itemId, timestamp, imageUris },
    );

    if (!meal) return null;

    addMeal(meal);
    return meal.id;
  };
}
```

Update `apps/mobile/src/features/manual-entry/index.ts`:

```ts
export {
  buildManualMeal,
  type ManualCompositionDraftItem,
  type BuildManualMealInput,
  type BuildManualMealIds,
} from './model/buildManualMeal';
export {
  useSaveManualMeal,
  type SaveManualMealInput,
} from './model/useSaveManualMeal';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @ai-food/mobile test -- useSaveManualMeal.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/manual-entry/model/useSaveManualMeal.ts \
  apps/mobile/src/features/manual-entry/model/useSaveManualMeal.test.ts \
  apps/mobile/src/features/manual-entry/index.ts
git commit -m "feat: add useSaveManualMeal hook"
```

---

### Task 3: `ManualCompositionDraft` UI

**Files:**
- Create: `apps/mobile/src/features/manual-entry/ui/ManualCompositionDraft.tsx`
- Modify: `apps/mobile/src/features/manual-entry/index.ts`

**Interfaces:**
- Consumes: `ManualCompositionDraftItem`
- Produces: `ManualCompositionDraft` component with props:
  ```ts
  export interface ManualCompositionDraftProps {
    items: ManualCompositionDraftItem[];
    onChange: (items: ManualCompositionDraftItem[]) => void;
  }
  ```

No separate unit test file required if page smoke is heavy — keep component presentational; validation stays in `buildManualMeal`. Optional: skip RTL for this task; covered by save validation.

- [ ] **Step 1: Implement the component**

Create `apps/mobile/src/features/manual-entry/ui/ManualCompositionDraft.tsx`:

```tsx
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib';
import type { ManualCompositionDraftItem } from '../model/buildManualMeal';

const inputClassName = cn(
  'w-full rounded-md border border-input bg-background px-2 py-1 text-sm',
  'ring-offset-background placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
);

export interface ManualCompositionDraftProps {
  items: ManualCompositionDraftItem[];
  onChange: (items: ManualCompositionDraftItem[]) => void;
}

function emptyItem(): ManualCompositionDraftItem {
  return {
    id: crypto.randomUUID(),
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    grams: 100,
  };
}

function patchItem(
  items: ManualCompositionDraftItem[],
  id: string,
  patch: Partial<ManualCompositionDraftItem>,
): ManualCompositionDraftItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

function parseNum(raw: string): number {
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export function ManualCompositionDraft({
  items,
  onChange,
}: ManualCompositionDraftProps) {
  const handleAdd = () => {
    onChange([...items, emptyItem()]);
  };

  const handleRemove = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Состав</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4" />
          Добавить
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Можно сохранить без состава — или добавить ингредиенты. Итог КБЖУ
          тогда станет суммой позиций.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="space-y-2 rounded-lg border border-border p-3"
            >
              <div className="flex items-start gap-2">
                <input
                  className={inputClassName}
                  placeholder="Название"
                  value={item.name}
                  onChange={(e) =>
                    onChange(patchItem(items, item.id, { name: e.target.value }))
                  }
                  aria-label="Название позиции состава"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(item.id)}
                  aria-label="Удалить позицию"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {(
                  [
                    ['calories', 'Ккал'],
                    ['protein', 'Б'],
                    ['carbs', 'У'],
                    ['fat', 'Ж'],
                    ['grams', 'г'],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="space-y-1">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      className={inputClassName}
                      value={item[field] || ''}
                      onChange={(e) =>
                        onChange(
                          patchItem(items, item.id, {
                            [field]:
                              field === 'grams'
                                ? parseNum(e.target.value)
                                : Math.round(parseNum(e.target.value)),
                          }),
                        )
                      }
                      aria-label={`${label} позиции`}
                    />
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Export from barrel**

Add to `apps/mobile/src/features/manual-entry/index.ts`:

```ts
export {
  ManualCompositionDraft,
  type ManualCompositionDraftProps,
} from './ui/ManualCompositionDraft';
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @ai-food/mobile type-check`

Expected: PASS (no errors in new files).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/manual-entry/ui/ManualCompositionDraft.tsx \
  apps/mobile/src/features/manual-entry/index.ts
git commit -m "feat: add ManualCompositionDraft UI"
```

---

### Task 4: `ManualEntryPage` + route

**Files:**
- Create: `apps/mobile/src/pages/manual-entry/ui/ManualEntryPage.tsx`
- Create: `apps/mobile/src/pages/manual-entry/index.ts`
- Modify: `apps/mobile/src/app/router.tsx`

**Interfaces:**
- Consumes: `useSaveManualMeal`, `ManualCompositionDraft`, `ManualCompositionDraftItem`
- Produces: route `/manual-entry` → `ManualEntryPage`
- On success: `navigate(`/meal/${mealId}`)`
- On image save error: `toast.error('Не удалось сохранить фото')` (or similar Russian message), stay on page
- Save disabled when: blank name, OR (empty composition && calories <= 0), OR (composition non-empty && any row invalid), OR `saving` in progress
- When `composition.length > 0`: dish KBJU inputs are `readOnly` and display summed values

- [ ] **Step 1: Implement the page**

Create `apps/mobile/src/pages/manual-entry/ui/ManualEntryPage.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ManualCompositionDraft,
  useSaveManualMeal,
  type ManualCompositionDraftItem,
} from '@/features/manual-entry';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib';

const inputClassName = cn(
  'w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm',
  'ring-offset-background placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-60',
);

function parseNutrient(raw: string): number {
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function parseGrams(raw: string): number {
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export function ManualEntryPage() {
  const navigate = useNavigate();
  const saveManualMeal = useSaveManualMeal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [fiber, setFiber] = useState(0);
  const [grams, setGrams] = useState(100);
  const [composition, setComposition] = useState<ManualCompositionDraftItem[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const compositionTotals = useMemo(() => {
    return composition.reduce(
      (acc, item) => ({
        calories: acc.calories + (item.calories || 0),
        protein: acc.protein + (item.protein || 0),
        carbs: acc.carbs + (item.carbs || 0),
        fat: acc.fat + (item.fat || 0),
        fiber: acc.fiber + (item.fiber || 0),
        grams: acc.grams + (item.grams || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, grams: 0 },
    );
  }, [composition]);

  const compositionActive = composition.length > 0;
  const displayCalories = compositionActive ? compositionTotals.calories : calories;
  const displayProtein = compositionActive ? compositionTotals.protein : protein;
  const displayCarbs = compositionActive ? compositionTotals.carbs : carbs;
  const displayFat = compositionActive ? compositionTotals.fat : fat;
  const displayFiber = compositionActive ? compositionTotals.fiber : fiber;
  const displayGrams = compositionActive ? compositionTotals.grams : grams;

  const compositionValid =
    !compositionActive ||
    composition.every((item) => item.name.trim() && item.calories > 0);

  const canSave =
    name.trim().length > 0 &&
    compositionValid &&
    (compositionActive ? true : calories > 0) &&
    !saving;

  const handlePickPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setImage(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    e.currentTarget.value = '';
  };

  const handleRemovePhoto = () => {
    setImage(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const mealId = await saveManualMeal({
        name,
        calories: compositionActive ? compositionTotals.calories : calories,
        protein: compositionActive ? compositionTotals.protein : protein,
        carbs: compositionActive ? compositionTotals.carbs : carbs,
        fat: compositionActive ? compositionTotals.fat : fat,
        fiber: compositionActive ? compositionTotals.fiber : fiber,
        grams: compositionActive ? compositionTotals.grams : grams,
        composition,
        image,
      });
      if (!mealId) return;
      navigate(`/meal/${mealId}`, { replace: true });
    } catch {
      toast.error('Не удалось сохранить фото');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-4 py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Вручную</h1>
      </header>

      <main className="flex-1 space-y-6 px-4 py-4 pb-28">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Фото</h2>
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Фото блюда"
                className="h-48 w-full rounded-xl object-cover"
              />
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="outline" onClick={handlePickPhoto}>
                  Заменить
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleRemovePhoto}
                  className="gap-1 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Убрать
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-start gap-3"
              onClick={handlePickPhoto}
            >
              <ImagePlus className="h-5 w-5 text-emerald-600" />
              Добавить фото
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Выбор фото"
          />
        </section>

        <section className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="manual-name">
            Название
          </label>
          <input
            id="manual-name"
            className={inputClassName}
            placeholder="Напр.: овсянка с ягодами"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">КБЖУ</h2>
          {compositionActive ? (
            <p className="text-xs text-muted-foreground">
              Считается из состава
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(
              [
                ['calories', 'Ккал', displayCalories, setCalories, parseNutrient],
                ['protein', 'Белки', displayProtein, setProtein, parseNutrient],
                ['carbs', 'Углеводы', displayCarbs, setCarbs, parseNutrient],
                ['fat', 'Жиры', displayFat, setFat, parseNutrient],
                ['fiber', 'Клетчатка', displayFiber, setFiber, parseNutrient],
                ['grams', 'Граммы', displayGrams, setGrams, parseGrams],
              ] as const
            ).map(([key, label, value, setter, parser]) => (
              <label key={key} className="space-y-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  readOnly={compositionActive}
                  disabled={compositionActive}
                  className={inputClassName}
                  value={value || ''}
                  onChange={(e) => setter(parser(e.target.value))}
                  aria-label={label}
                />
              </label>
            ))}
          </div>
        </section>

        <ManualCompositionDraft items={composition} onChange={setComposition} />
      </main>

      <div className="sticky bottom-0 border-t bg-background px-4 py-4">
        <Button
          type="button"
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={!canSave}
          onClick={() => void handleSave()}
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}
```

Create `apps/mobile/src/pages/manual-entry/index.ts`:

```ts
export { ManualEntryPage } from './ui/ManualEntryPage';
```

- [ ] **Step 2: Register the route**

In `apps/mobile/src/app/router.tsx`, add import:

```ts
import { ManualEntryPage } from '@/pages/manual-entry';
```

Inside `AppShell` children (next to `/favorites`):

```ts
{ path: '/manual-entry', element: <ProfileGuard><ManualEntryPage /></ProfileGuard> },
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @ai-food/mobile type-check`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/pages/manual-entry \
  apps/mobile/src/app/router.tsx
git commit -m "feat: add manual entry page and route"
```

---

### Task 5: «Вручную» button in `AddFoodSheet`

**Files:**
- Modify: `apps/mobile/src/features/add-food/ui/AddFoodSheet.tsx`

**Interfaces:**
- Produces: menu button that closes sheet and `navigate('/manual-entry')`
- Placement: after «Избранное» button in menu mode
- Icon: `Keyboard` from `lucide-react`, class `h-5 w-5 text-emerald-600`

- [ ] **Step 1: Add handler and button**

In `AddFoodSheet.tsx`:

1. Add `Keyboard` to the lucide import.
2. Add handler next to `handleFavoritesClick`:

```ts
const handleManualClick = () => {
  handleClose();
  navigate('/manual-entry');
};
```

3. After the Favorites `Button`, add:

```tsx
<Button
  variant="outline"
  className="h-12 w-full justify-start gap-3"
  onClick={handleManualClick}
>
  <Keyboard className="h-5 w-5 text-emerald-600" />
  <span>Вручную</span>
</Button>
```

- [ ] **Step 2: Manual smoke check**

Run: `pnpm --filter @ai-food/mobile type-check`

Expected: PASS.

Optional manual: open app → «+» → «Вручную» → fill name + kcal → Save → lands on meal detail.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/add-food/ui/AddFoodSheet.tsx
git commit -m "feat: add manual entry button to AddFoodSheet"
```

---

### Task 6: Changelog + final verification

**Files:**
- Modify: `apps/mobile/src/features/news/model/changelog.ts`

- [ ] **Step 1: Add news entry**

Prepend (or merge into today's release if `2026-08-03` already exists) in `NEWS_CHANGELOG`:

If a `2026-08-03` release already exists, append this item to its `items` array:

```ts
'Ручной ввод блюда: фото, КБЖУ и состав без AI',
```

If creating a new release object instead:

```ts
{
  date: '2026-08-03',
  title: 'Ручной ввод',
  items: [
    'Ручной ввод блюда: фото, КБЖУ и состав без AI',
  ],
},
```

Prefer merging into the existing `2026-08-03` block to keep one date heading.

- [ ] **Step 2: Run full relevant tests**

Run:

```bash
pnpm --filter @ai-food/mobile test -- buildManualMeal.test.ts useSaveManualMeal.test.ts
pnpm --filter @ai-food/mobile type-check
```

Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/news/model/changelog.ts
git commit -m "docs: mention manual food entry in changelog"
```

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Button «Вручную» in sheet | Task 5 |
| Page `/manual-entry` with photo/name/KBJU/composition | Task 4 (+ Task 3) |
| Save `status: 'ready'`, no AI | Task 1–2 |
| Empty composition → single stub item | Task 1 |
| Non-empty composition → sum totals | Task 1–2, Task 4 read-only KBJU |
| Name + kcal > 0 required | Task 1, Task 4 `canSave` |
| Photo optional via `saveMealImage` | Task 2, Task 4 |
| Navigate to `/meal/:id` after save | Task 4 |
| Back discards | Task 4 (`navigate(-1)`, no draft) |
| Image error toast, no meal | Task 2 + Task 4 |
| `timestampForSelectedDate` | Task 2 |
| Composition editable later on detail | Existing meal detail UI (no new work) |
| Changelog | Task 6 |
| Tests listed in spec | Task 1–2 |

No remaining TBD/placeholders. Types `ManualCompositionDraftItem` / `SaveManualMealInput` are consistent across tasks.
