import type { FoodItem } from '@ai-food/shared-types';
import { sanitizeGrams } from './mealGrams';

export type NutrientKey = 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber';

export interface PortionNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

const NUTRIENT_KEYS: NutrientKey[] = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
];

const ZERO_NUTRIENTS: PortionNutrients = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
};

export function sanitizeNutrient(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 10) / 10);
}

/** Parse editor input (comma or dot) then snap to tenths. */
export function parseNutrientInput(raw: string): number {
  return sanitizeNutrient(Number(raw.replace(',', '.')));
}

/** Absolute portion nutrients from per-100g density × grams. */
export function nutrientsFromPer100(
  per100: PortionNutrients,
  grams: number,
): PortionNutrients {
  const safeGrams = sanitizeGrams(grams);
  if (safeGrams === 0) return { ...ZERO_NUTRIENTS };

  const result = { ...ZERO_NUTRIENTS };
  for (const key of NUTRIENT_KEYS) {
    result[key] = sanitizeNutrient((per100[key] ?? 0) * safeGrams / 100);
  }
  return result;
}

/** Per-100g density derived from absolute portion nutrients + grams. */
export function nutrientsPer100FromPortion(
  portion: PortionNutrients & { grams: number },
): PortionNutrients {
  const safeGrams = sanitizeGrams(portion.grams);
  if (safeGrams === 0) return { ...ZERO_NUTRIENTS };

  const result = { ...ZERO_NUTRIENTS };
  for (const key of NUTRIENT_KEYS) {
    result[key] = sanitizeNutrient(((portion[key] ?? 0) * 100) / safeGrams);
  }
  return result;
}

/**
 * Rescale absolute portion nutrients when grams change.
 * If oldGrams is 0, returns nutrients unchanged (no density to preserve).
 */
export function scalePortionNutrientsByGrams(
  nutrients: PortionNutrients,
  oldGrams: number,
  newGrams: number,
): PortionNutrients {
  const safeOld = sanitizeGrams(oldGrams);
  if (safeOld === 0) {
    return {
      calories: nutrients.calories,
      protein: nutrients.protein,
      carbs: nutrients.carbs,
      fat: nutrients.fat,
      fiber: nutrients.fiber,
    };
  }

  const safeNew = sanitizeGrams(newGrams);
  const ratio = safeNew / safeOld;
  const result = { ...ZERO_NUTRIENTS };
  for (const key of NUTRIENT_KEYS) {
    result[key] = sanitizeNutrient((nutrients[key] ?? 0) * ratio);
  }
  return result;
}

export function sumItemCalories(items: FoodItem[]): number {
  return items.reduce((sum, item) => sum + item.calories, 0);
}

function sumNutrient(items: FoodItem[], key: NutrientKey): number {
  return items.reduce((sum, item) => sum + (item[key] ?? 0), 0);
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
    [key]: sanitizeNutrient((item[key] ?? 0) * ratio),
  }));
}

export function sanitizeFoodItemPatch(
  patch: Partial<FoodItem>,
): Partial<FoodItem> {
  const next: Partial<FoodItem> = { ...patch };
  const nutrientKeys: NutrientKey[] = [
    'calories',
    'protein',
    'carbs',
    'fat',
    'fiber',
  ];
  for (const key of nutrientKeys) {
    if (key in next && typeof next[key] === 'number') {
      next[key] = sanitizeNutrient(next[key] as number);
    }
  }
  if ('grams' in next && typeof next.grams === 'number') {
    next.grams = sanitizeGrams(next.grams);
  }
  return next;
}
