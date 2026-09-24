import type {
  Meal,
  MicronutrientId,
  MicronutrientUnit,
} from '@ai-food/shared-types';
import { MICRONUTRIENT_UNITS } from '@ai-food/shared-types';
import { MICRONUTRIENT_LABELS } from '@/entities/nutrition';

export interface BuildMicronutrientMealInput {
  nutrientId: MicronutrientId;
  /** Amount already in the nutrient's canonical mg/µg. */
  amount: number;
  mealId: string;
  itemId: string;
  timestamp: string;
  unit?: MicronutrientUnit;
  /** Optional diary title (e.g. «Витамин D 5000 МЕ»). */
  displayName?: string;
}

/** Parse user draft for micronutrient amount (comma or dot decimals). */
export function parseMicronutrientAmountDraft(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  const rounded = Math.round(n * 100) / 100;
  if (rounded <= 0 || rounded > 100_000) return null;
  return rounded;
}

/**
 * Builds a ready diary meal that only records a manual micronutrient amount
 * (0 kcal supplement-style entry).
 */
export function buildMicronutrientMeal(
  input: BuildMicronutrientMealInput,
): Meal | null {
  if (!Number.isFinite(input.amount) || input.amount <= 0) return null;

  const name =
    input.displayName?.trim() || MICRONUTRIENT_LABELS[input.nutrientId];
  const unit = input.unit ?? MICRONUTRIENT_UNITS[input.nutrientId];
  const amount = Math.round(input.amount * 1000) / 1000;

  return {
    id: input.mealId,
    timestamp: input.timestamp,
    name,
    items: [
      {
        id: input.itemId,
        name,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        grams: 0,
      },
    ],
    totalCalories: 0,
    portions: 1,
    status: 'ready',
    micronutrients: [{ id: input.nutrientId, amount, unit }],
  };
}
