import type { FoodItem } from '@ai-food/shared-types';

export type NutrientKey = 'calories' | 'protein' | 'carbs' | 'fat';

export function sanitizeNutrient(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export function sumItemCalories(items: FoodItem[]): number {
  return items.reduce((sum, item) => sum + item.calories, 0);
}

function sumNutrient(items: FoodItem[], key: NutrientKey): number {
  return items.reduce((sum, item) => sum + item[key], 0);
}

/** Scale one nutrient across items so their sum equals sanitized target. */
export function scaleItemsNutrient(
  items: FoodItem[],
  key: NutrientKey,
  target: number,
): FoodItem[] {
  if (items.length === 0) return items;

  const safeTarget = sanitizeNutrient(target);
  const currentSum = sumNutrient(items, key);

  if (currentSum === 0) {
    return items.map((item, index) =>
      index === 0 ? { ...item, [key]: safeTarget } : { ...item, [key]: 0 },
    );
  }

  const ratio = safeTarget / currentSum;
  return items.map((item) => ({
    ...item,
    [key]: sanitizeNutrient(item[key] * ratio),
  }));
}

export function sanitizeFoodItemPatch(
  patch: Partial<FoodItem>,
): Partial<FoodItem> {
  const next: Partial<FoodItem> = { ...patch };
  const nutrientKeys: NutrientKey[] = ['calories', 'protein', 'carbs', 'fat'];
  for (const key of nutrientKeys) {
    if (key in next && typeof next[key] === 'number') {
      next[key] = sanitizeNutrient(next[key] as number);
    }
  }
  return next;
}
