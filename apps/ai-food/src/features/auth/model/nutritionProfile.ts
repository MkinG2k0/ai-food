import type { MicronutrientEstimate } from '@ai-food/shared-types';
import { MICRONUTRIENT_IDS } from '@ai-food/shared-types';

export type UserProfile = {
  gender: 'male' | 'female';
  age: number;
  height: number;
  weight: number;
  targetWeight: number;
  targetWeightDate: string;
  activity: 'low' | 'medium' | 'high';
  goal: 'lose' | 'maintain' | 'gain';
  dietType: 'none' | 'halal' | 'vegan' | 'vegetarian';
  /** Onboarding plan start day (YYYY-MM-DD); snapshot at finish */
  planStartDate?: string;
  /** Weight (kg) at onboarding finish — ideal trajectory start */
  planStartWeight?: number;
};

export type DailyTargets = {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
};

export type NutritionProfilePayload = {
  profile: UserProfile;
  targets: DailyTargets;
  micronutrientTargets?: MicronutrientEstimate[] | null;
};

const GENDERS = new Set<UserProfile['gender']>(['male', 'female']);
const ACTIVITIES = new Set<UserProfile['activity']>(['low', 'medium', 'high']);
const GOALS = new Set<UserProfile['goal']>(['lose', 'maintain', 'gain']);
const DIET_TYPES = new Set<UserProfile['dietType']>([
  'none',
  'halal',
  'vegan',
  'vegetarian',
]);
const MICRONUTRIENT_ID_SET = new Set<string>(MICRONUTRIENT_IDS);

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function parseUserProfile(value: unknown): UserProfile | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (
    !GENDERS.has(v.gender as UserProfile['gender']) ||
    !isPositiveNumber(v.age) ||
    !isPositiveNumber(v.height) ||
    !isPositiveNumber(v.weight) ||
    !isPositiveNumber(v.targetWeight) ||
    !isNonEmptyString(v.targetWeightDate) ||
    !ACTIVITIES.has(v.activity as UserProfile['activity']) ||
    !GOALS.has(v.goal as UserProfile['goal']) ||
    !DIET_TYPES.has(v.dietType as UserProfile['dietType'])
  ) {
    return null;
  }
  const base: UserProfile = {
    gender: v.gender as UserProfile['gender'],
    age: v.age,
    height: v.height,
    weight: v.weight,
    targetWeight: v.targetWeight,
    targetWeightDate: v.targetWeightDate,
    activity: v.activity as UserProfile['activity'],
    goal: v.goal as UserProfile['goal'],
    dietType: v.dietType as UserProfile['dietType'],
  };
  if (
    isNonEmptyString(v.planStartDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.planStartDate)
  ) {
    base.planStartDate = v.planStartDate;
  }
  if (isPositiveNumber(v.planStartWeight)) {
    base.planStartWeight = v.planStartWeight;
  }
  return base;
}

function parseDailyTargets(value: unknown): DailyTargets | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (
    !isPositiveNumber(v.kcal) ||
    !isNonNegativeNumber(v.protein) ||
    !isNonNegativeNumber(v.fat) ||
    !isNonNegativeNumber(v.carbs) ||
    !isNonNegativeNumber(v.fiber)
  ) {
    return null;
  }
  return {
    kcal: v.kcal,
    protein: v.protein,
    fat: v.fat,
    carbs: v.carbs,
    fiber: v.fiber,
  };
}

/** Loose parse: keep items with string id, finite amount, unit mg|µg. */
function parseMicronutrientTargets(
  value: unknown,
): MicronutrientEstimate[] | null {
  if (!Array.isArray(value)) return null;
  const out: MicronutrientEstimate[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    if (typeof r.id !== 'string' || !MICRONUTRIENT_ID_SET.has(r.id)) continue;
    if (typeof r.amount !== 'number' || !Number.isFinite(r.amount)) continue;
    if (r.unit !== 'mg' && r.unit !== 'µg') continue;
    out.push({
      id: r.id as MicronutrientEstimate['id'],
      amount: r.amount,
      unit: r.unit,
    });
  }
  return out;
}

export function parseNutritionProfile(
  value: unknown,
): NutritionProfilePayload | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const profile = parseUserProfile(v.profile);
  const targets = parseDailyTargets(v.targets);
  if (!profile || !targets) return null;

  const result: NutritionProfilePayload = { profile, targets };
  if ('micronutrientTargets' in v) {
    if (v.micronutrientTargets === null) {
      result.micronutrientTargets = null;
    } else {
      const micro = parseMicronutrientTargets(v.micronutrientTargets);
      if (micro) result.micronutrientTargets = micro;
    }
  }
  return result;
}
