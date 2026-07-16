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

export const NO_FOOD_PROMPT_RULE = `Если на изображении НЕТ съедобной еды или напитка — верни ТОЛЬКО JSON:
{ "noFood": true, "reason": string (кратко на русском, что на фото вместо еды) }
Случаи noFood: люди, животные, пейзажи, предметы, неясное/размытое фото, пустая тарелка без еды, грязь/мусор, текст/скриншоты.
НЕ придумывай блюдо и НЕ возвращай КБЖУ для таких фото. НЕ пиши foodName вроде «Неизвестное блюдо», «Нет еды», «Человек».
Если еда есть — верни обычную схему питания БЕЗ поля noFood.`;

export function isNoFoodResult(value: unknown): value is NoFoodResult {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.noFood === true && typeof v.reason === 'string' && v.reason.trim().length > 0;
}

export const MICRONUTRIENTS_PROMPT_RULE = `micronutrients — массив из ровно 8 объектов { "id", "amount", "unit" } для всей порции (оценка, не меддиагноз):
id ∈ vitaminA|vitaminC|vitaminD|vitaminB12|iron|calcium|folate|magnesium;
amount — неотрицательное число (оценка содержания в этой порции); неизвестно → 0;
unit строго по id: vitaminA/vitaminD/vitaminB12/folate → "µg"; vitaminC/iron/calcium/magnesium → "mg".
Всегда включай все 8 id. Не используй граммы и не возвращай качественные level.`;

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
    if (typeof row.id !== 'string' || !ID_SET.has(row.id)) continue;
    if (typeof row.amount !== 'number' || !Number.isFinite(row.amount) || row.amount < 0) {
      continue;
    }
    const id = row.id as MicronutrientId;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, amount: row.amount, unit: MICRONUTRIENT_UNITS[id] });
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
    typeof v.confidence !== 'number' ||
    v.confidence < 0 ||
    v.confidence > 1 ||
    typeof v.healthiness !== 'number' ||
    v.healthiness < 1 ||
    v.healthiness > 10 ||
    !Array.isArray(v.items) ||
    !isMicronutrientsField(v.micronutrients)
  ) {
    return false;
  }
  return v.items.every(isNutritionItem);
}
