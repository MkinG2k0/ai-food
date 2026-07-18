export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  grams: number;
}

export type MealStatus = 'analyzing' | 'ready' | 'error';

export const MICRONUTRIENT_IDS = [
  'vitaminA',
  'vitaminC',
  'vitaminD',
  'vitaminB12',
  'iron',
  'calcium',
  'folate',
  'magnesium',
] as const;

export type MicronutrientId = (typeof MICRONUTRIENT_IDS)[number];

export type MicronutrientUnit = 'mg' | 'µg';

/** Canonical unit per micronutrient id (AI must match; normalize coerces). */
export const MICRONUTRIENT_UNITS: Record<MicronutrientId, MicronutrientUnit> = {
  vitaminA: 'µg',
  vitaminC: 'mg',
  vitaminD: 'µg',
  vitaminB12: 'µg',
  iron: 'mg',
  calcium: 'mg',
  folate: 'µg',
  magnesium: 'mg',
};

/** Quantitative micronutrient estimate for a meal portion (not lab values). */
export interface MicronutrientEstimate {
  id: MicronutrientId;
  amount: number;
  unit: MicronutrientUnit;
}

export interface Meal {
  id: string;
  timestamp: string;
  items: FoodItem[];
  totalCalories: number;
  /** Short dish title; omitted on legacy persisted meals */
  name?: string;
  imageUri?: string;
  status?: MealStatus;
  /** Servings multiplier; omitted on legacy meals → treat as 1 */
  portions?: number;
  /** AI healthiness score 1–10; omitted on legacy meals */
  healthiness?: number;
  /** AI recognition confidence 0–1; omitted on legacy meals */
  confidence?: number;
  /** Last analyze failure code; set when status is error */
  analyzeErrorCode?: string;
  /** Quantitative micronutrient amounts for the portion; omitted on legacy meals */
  micronutrients?: MicronutrientEstimate[];
  /** OpenRouter model id used for the scan; omitted on legacy / manual meals */
  aiModel?: string;
}

export interface NutritionItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  grams?: number;
  fiber?: number;
}

export interface NutritionResult {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: number;
  /** Integer 1–10 healthfulness score from AI */
  healthiness: number;
  items: NutritionItem[];
  /** Quantitative micronutrient amounts for the portion; omitted if model skipped */
  micronutrients?: MicronutrientEstimate[];
}

export interface AnalyzeFoodRequest {
  image: File;
}

export interface AnalyzeFoodResponse {
  result: NutritionResult;
  processingTime: number;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
}

export type ActivityLevel = 'low' | 'medium' | 'high';

export type Goal = 'lose' | 'maintain' | 'gain';

export type DietType = 'none' | 'halal' | 'vegan' | 'vegetarian';

export interface UserProfile {
  gender: 'male' | 'female';
  age: number;
  height: number;
  weight: number;
  /** Desired weight in kg (onboarding target) */
  targetWeight: number;
  /** Deadline to reach targetWeight (YYYY-MM-DD) */
  targetWeightDate: string;
  activity: ActivityLevel;
  goal: Goal;
  dietType: DietType;
}

export interface DailyTargets {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}
