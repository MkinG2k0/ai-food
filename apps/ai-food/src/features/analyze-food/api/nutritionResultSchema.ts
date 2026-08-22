import type {
  MicronutrientEstimate,
  MicronutrientId,
  MicronutrientUnit,
  NutritionResult,
} from '@ai-food/shared-types';
import { MICRONUTRIENT_IDS, MICRONUTRIENT_UNITS } from '@ai-food/shared-types';

const ID_SET = new Set<string>(MICRONUTRIENT_IDS);
const UNITS = new Set<MicronutrientUnit>(['mg', 'µg']);

/** AI response when the image does not contain edible food. */
export interface NoFoodResult {
  noFood: true;
  reason: string;
}

export function isNoFoodResult(value: unknown): value is NoFoodResult {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.noFood === true && typeof v.reason === 'string' && v.reason.trim().length > 0;
}

/** Convert model amount_mg into canonical MicronutrientEstimate (µg where MICRONUTRIENT_UNITS says µg). */
export function amountMgToCanonical(
  id: MicronutrientId,
  amountMg: number,
): MicronutrientEstimate {
  const unit = MICRONUTRIENT_UNITS[id];
  const amount = unit === 'µg' ? amountMg * 1000 : amountMg;
  return { id, amount, unit };
}

/** Convert canonical estimate back to mg for XML serialization. */
export function toAmountMg(estimate: MicronutrientEstimate): number {
  return estimate.unit === 'µg' ? estimate.amount / 1000 : estimate.amount;
}

export function isMicronutrientEstimate(value: unknown): value is MicronutrientEstimate {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || !ID_SET.has(row.id)) return false;
  if (typeof row.amount !== 'number' || !Number.isFinite(row.amount) || row.amount < 0) {
    return false;
  }
  if (typeof row.unit !== 'string' || !UNITS.has(row.unit as MicronutrientUnit)) {
    return false;
  }
  const id = row.id as MicronutrientId;
  return row.unit === MICRONUTRIENT_UNITS[id];
}

/** Accepts omitted/empty; when present, every entry must be valid known id+amount+unit. */
export function isMicronutrientsField(value: unknown): value is MicronutrientEstimate[] | undefined {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return true;
  return value.every(isMicronutrientEstimate);
}

/**
 * Keep known ids, coerce unit from MICRONUTRIENT_UNITS, drop invalid/duplicate ids,
 * non-finite/negative amounts, and legacy level-only rows.
 * Also accepts `{ id, amountMg }` / `{ name, amount_mg }` from XML parsing.
 */
export function normalizeMicronutrients(
  value: unknown,
): MicronutrientEstimate[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const seen = new Set<MicronutrientId>();
  const out: MicronutrientEstimate[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const rawId = row.id ?? row.name;
    if (typeof rawId !== 'string' || !ID_SET.has(rawId)) continue;
    const id = rawId as MicronutrientId;
    if (seen.has(id)) continue;

    let estimate: MicronutrientEstimate | null = null;
    const amountMg = row.amountMg ?? row.amount_mg;
    if (typeof amountMg === 'number' && Number.isFinite(amountMg) && amountMg >= 0) {
      estimate = amountMgToCanonical(id, amountMg);
    } else if (typeof row.amount === 'number' && Number.isFinite(row.amount) && row.amount >= 0) {
      estimate = { id, amount: row.amount, unit: MICRONUTRIENT_UNITS[id] };
    }
    if (!estimate) continue;
    seen.add(id);
    out.push(estimate);
  }
  return out.length > 0 ? out : undefined;
}

export function isNutritionItem(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  if (typeof item.name !== 'string') return false;
  if (typeof item.calories !== 'number') return false;
  if (typeof item.protein !== 'number') return false;
  if (typeof item.carbs !== 'number') return false;
  if (typeof item.fat !== 'number') return false;
  if (item.grams !== undefined && typeof item.grams !== 'number') return false;
  if (item.fiber !== undefined && typeof item.fiber !== 'number') return false;
  return true;
}

export function isNutritionResult(value: unknown): value is NutritionResult {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (
    typeof v.foodName !== 'string' ||
    typeof v.calories !== 'number' ||
    typeof v.protein !== 'number' ||
    typeof v.carbs !== 'number' ||
    typeof v.fat !== 'number' ||
    typeof v.fiber !== 'number' ||
    !Array.isArray(v.items) ||
    !isMicronutrientsField(v.micronutrients)
  ) {
    return false;
  }
  if (v.healthiness !== undefined) {
    if (
      typeof v.healthiness !== 'number' ||
      v.healthiness < 1 ||
      v.healthiness > 10
    ) {
      return false;
    }
  }
  if (v.confidence !== undefined) {
    if (typeof v.confidence !== 'number' || v.confidence < 0 || v.confidence > 1) {
      return false;
    }
  }
  if (v.portionReference !== undefined && typeof v.portionReference !== 'string') return false;
  if (v.itemCount !== undefined) {
    if (typeof v.itemCount !== 'number' || !Number.isFinite(v.itemCount) || v.itemCount <= 0) {
      return false;
    }
  }
  if (v.totalGrams !== undefined) {
    if (typeof v.totalGrams !== 'number' || !Number.isFinite(v.totalGrams) || v.totalGrams < 0) {
      return false;
    }
  }
  if (v.addedSugar !== undefined && typeof v.addedSugar !== 'number') return false;
  if (v.confidenceReason !== undefined && typeof v.confidenceReason !== 'string') return false;
  if (v.healthinessReason !== undefined && typeof v.healthinessReason !== 'string') return false;
  if (v.disclaimers !== undefined) {
    if (!Array.isArray(v.disclaimers) || !v.disclaimers.every((d) => typeof d === 'string')) {
      return false;
    }
  }
  if (v.customContent !== undefined && typeof v.customContent !== 'string') {
    return false;
  }
  return v.items.every(isNutritionItem);
}
