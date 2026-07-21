import type { FoodItem, Meal } from '@ai-food/shared-types';

/** Grams for user input / dish totals — 1 decimal is enough for display. */
export function sanitizeGrams(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 10) / 10);
}

/** Raw non-negative grams without coarse rounding (keeps composition shares). */
function rawGrams(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

/** Sum of item grams (1-decimal precision on the total only). */
export function sumItemGrams(items: Pick<FoodItem, 'grams'>[]): number {
  const sum = items.reduce((acc, item) => acc + rawGrams(item.grams), 0);
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
 * Uses raw item grams so tiny totals still keep real proportions.
 * Equal shares if all zero.
 */
export function itemGramShares(items: Pick<FoodItem, 'grams'>[]): number[] {
  if (items.length === 0) return [];
  const weights = items.map((item) => rawGrams(item.grams));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const equal = 1 / items.length;
    return items.map(() => equal);
  }
  return weights.map((w) => w / sum);
}

/**
 * Apportion `targetTenths` (0.1g units) by share using largest-remainder.
 * Guarantees the integer tenths sum exactly to the target.
 */
function apportionTenths(shares: number[], targetTenths: number): number[] {
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
  return tenths;
}

/**
 * Redistribute item grams to a new dish total while keeping each item's share.
 *
 * Tiny totals (not enough 0.1g slots to represent every positive share) keep
 * exact float proportions so 385→1→385 restores the original composition.
 * Normal totals use 0.1g largest-remainder for clean display values.
 */
export function scaleItemsGramsToTotal(
  items: FoodItem[],
  targetTotalGrams: number,
): { items: FoodItem[]; totalGrams: number } {
  const safeTarget = sanitizeGrams(targetTotalGrams);
  if (items.length === 0) {
    return { items, totalGrams: safeTarget };
  }

  const shares = itemGramShares(items);
  const targetTenths = Math.round(safeTarget * 10);
  const positiveCount = shares.filter((s) => s > 0).length;

  // Need ~1.0g average per positive item before 0.1g rounding is safe;
  // otherwise shares collapse (e.g. 1g / 5 items → 0.3/0.3/0.2/0.1/0.1).
  const tenthsSafe =
    positiveCount === 0 || targetTenths >= positiveCount * 10;

  let nextGrams: number[];
  if (tenthsSafe) {
    nextGrams = apportionTenths(shares, targetTenths).map((t) => t / 10);
  } else {
    nextGrams = shares.map((s) => s * safeTarget);
    const scaledSum = nextGrams.reduce((a, b) => a + b, 0);
    const drift = safeTarget - scaledSum;
    if (drift !== 0 && nextGrams.length > 0) {
      let maxIdx = 0;
      for (let i = 1; i < nextGrams.length; i += 1) {
        if (nextGrams[i]! > nextGrams[maxIdx]!) maxIdx = i;
      }
      nextGrams[maxIdx] = nextGrams[maxIdx]! + drift;
    }
  }

  const nextItems = items.map((item, index) => ({
    ...item,
    grams: nextGrams[index]!,
  }));

  return { items: nextItems, totalGrams: safeTarget };
}
