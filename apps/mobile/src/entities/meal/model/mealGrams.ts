import type { FoodItem, Meal } from '@ai-food/shared-types';

/** Grams stored/scaled to 1 decimal so small total changes still move every item. */
export function sanitizeGrams(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 10) / 10);
}

/** Sum of item grams (1-decimal precision). */
export function sumItemGrams(items: Pick<FoodItem, 'grams'>[]): number {
  const sum = items.reduce((acc, item) => acc + sanitizeGrams(item.grams ?? 0), 0);
  return sanitizeGrams(sum);
}

/** Prefer stored totalGrams; fall back to sum of composition. */
export function resolveMealTotalGrams(
  meal: Pick<Meal, 'totalGrams' | 'items'>,
): number {
  if (
    meal.totalGrams !== undefined &&
    Number.isFinite(meal.totalGrams) &&
    meal.totalGrams >= 0
  ) {
    return sanitizeGrams(meal.totalGrams);
  }
  return sumItemGrams(meal.items);
}

/** Format grams for UI (drop trailing .0). */
export function formatItemGrams(grams: number): string {
  const n = sanitizeGrams(grams);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Share of each item in the dish weight (0–1).
 * Uses current item grams; equal shares if all zero.
 */
export function itemGramShares(items: Pick<FoodItem, 'grams'>[]): number[] {
  if (items.length === 0) return [];
  const weights = items.map((item) => sanitizeGrams(item.grams ?? 0));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const equal = 1 / items.length;
    return items.map(() => equal);
  }
  return weights.map((w) => w / sum);
}

/**
 * Redistribute item grams to a new dish total while keeping each item's share.
 * Uses 0.1g steps + largest-remainder so every positive-share item moves when
 * the total changes enough, and ±0.1 still apportions fairly.
 */
export function scaleItemsGramsToTotal(
  items: FoodItem[],
  targetTotalGrams: number,
): { items: FoodItem[]; totalGrams: number } {
  const safeTarget = sanitizeGrams(targetTotalGrams);
  if (items.length === 0) {
    return { items, totalGrams: safeTarget };
  }

  // Work in tenths of a gram to keep integer apportionment exact
  const targetTenths = Math.round(safeTarget * 10);
  const shares = itemGramShares(items);
  const exactTenths = shares.map((share) => share * targetTenths);
  const floored = exactTenths.map((v) => Math.floor(v + 1e-9));
  let remaining = targetTenths - floored.reduce((a, b) => a + b, 0);

  const order = exactTenths
    .map((v, i) => ({ i, frac: v - floored[i]! }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const tenths = [...floored];
  for (let k = 0; k < remaining; k += 1) {
    const idx = order[k % order.length]!.i;
    tenths[idx] = tenths[idx]! + 1;
  }

  const nextItems = items.map((item, index) => ({
    ...item,
    grams: sanitizeGrams(tenths[index]! / 10),
  }));

  return { items: nextItems, totalGrams: sanitizeGrams(targetTenths / 10) };
}
