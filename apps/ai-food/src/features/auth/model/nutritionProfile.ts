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
  return {
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

export function parseNutritionProfile(
  value: unknown,
): NutritionProfilePayload | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const profile = parseUserProfile(v.profile);
  const targets = parseDailyTargets(v.targets);
  if (!profile || !targets) return null;
  return { profile, targets };
}
