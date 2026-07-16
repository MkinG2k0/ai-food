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

export type MicronutrientLevel = 'high' | 'medium' | 'low' | 'none';

/** Qualitative micronutrient estimate for a meal portion (not lab values). */
export interface MicronutrientEstimate {
  id: MicronutrientId;
  level: MicronutrientLevel;
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
  /** Qualitative micronutrient levels; omitted on legacy meals */
  micronutrients?: MicronutrientEstimate[];
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
  /** Qualitative top micronutrients; omitted if model skipped */
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
