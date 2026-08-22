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

export const FOOD_TYPES = [
  'salad',
  'soup',
  'sandwich',
  'pizza',
  'sushi',
  'fish',
  'burger',
  'bowl',
  'chicken',
  'meat',
  'pasta',
  'bakery',
  'main',
  'snack',
  'dessert',
  'drink',
] as const;

export type FoodType = (typeof FOOD_TYPES)[number];

/** Full pharmacy-style catalog (~25): vitamins A–K + B1–B12, common minerals. */
export const MICRONUTRIENT_IDS = [
  'vitaminA',
  'vitaminC',
  'vitaminD',
  'vitaminE',
  'vitaminK',
  'vitaminB1',
  'vitaminB2',
  'vitaminB3',
  'vitaminB5',
  'vitaminB6',
  'vitaminB7',
  'folate',
  'vitaminB12',
  'calcium',
  'magnesium',
  'zinc',
  'iron',
  'copper',
  'manganese',
  'iodine',
  'selenium',
  'chromium',
  'molybdenum',
  'potassium',
  'phosphorus',
] as const;

export type MicronutrientId = (typeof MICRONUTRIENT_IDS)[number];

export type MicronutrientUnit = 'mg' | 'µg';

/** Canonical unit per micronutrient id (AI must match; normalize coerces). */
export const MICRONUTRIENT_UNITS: Record<MicronutrientId, MicronutrientUnit> = {
  vitaminA: 'µg',
  vitaminC: 'mg',
  vitaminD: 'µg',
  vitaminE: 'mg',
  vitaminK: 'µg',
  vitaminB1: 'mg',
  vitaminB2: 'mg',
  vitaminB3: 'mg',
  vitaminB5: 'mg',
  vitaminB6: 'mg',
  vitaminB7: 'µg',
  folate: 'µg',
  vitaminB12: 'µg',
  calcium: 'mg',
  magnesium: 'mg',
  zinc: 'mg',
  iron: 'mg',
  copper: 'mg',
  manganese: 'mg',
  iodine: 'µg',
  selenium: 'µg',
  chromium: 'µg',
  molybdenum: 'µg',
  potassium: 'mg',
  phosphorus: 'mg',
};

/** Quantitative micronutrient estimate for a meal portion (not lab values). */
export interface MicronutrientEstimate {
  id: MicronutrientId;
  amount: number;
  unit: MicronutrientUnit;
}

/** One Markdown answer in the meal «Дополнительно» carousel. */
export interface MealCustomContentEntry {
  id: string;
  /** User question that produced this answer; omitted for settings-based first slide */
  question?: string;
  content: string;
}

export interface Meal {
  id: string;
  timestamp: string;
  items: FoodItem[];
  totalCalories: number;
  /** Short dish title; omitted on legacy persisted meals */
  name?: string;
  /** Primary / first photo path; omitted when meal has no photos */
  imageUri?: string;
  /** AI category for a text-only meal; omitted for legacy, manual, and photo meals */
  foodType?: FoodType;
  /**
   * All photo paths (multi-angle). When present, prefer over `[imageUri]`.
   * Omitted on legacy meals that only have `imageUri`.
   */
  imageUris?: string[];
  status?: MealStatus;
  /** Servings multiplier; omitted on legacy meals → treat as 1 */
  portions?: number;
  /**
   * Estimated total dish weight in grams.
   * Editing redistributes item grams by share; does not change KBJU.
   * Omitted on legacy meals.
   */
  totalGrams?: number;
  /** AI healthiness score 1–10; omitted on legacy meals */
  healthiness?: number;
  /** AI recognition confidence 0–1; omitted on legacy meals */
  confidence?: number;
  /** Last analyze failure code; set when status is error */
  analyzeErrorCode?: string;
  /** Gateway analyze job id; omitted on legacy / finished meals */
  analyzeJobId?: string;
  /** Quantitative micronutrient amounts for the portion; omitted on legacy meals */
  micronutrients?: MicronutrientEstimate[];
  /** OpenRouter model id used for the scan; omitted on legacy / manual meals */
  aiModel?: string;
  /** Scale anchor used for portion size; omitted on legacy meals */
  portionReference?: string;
  /** Added/free sugar grams within carbs; omitted on legacy meals */
  addedSugar?: number;
  /** Short Russian rationale for confidence; omitted on legacy meals */
  confidenceReason?: string;
  /** Short Russian rationale for healthiness; omitted on legacy meals */
  healthinessReason?: string;
  /** Hidden calories / uncertainty notes; omitted on legacy meals */
  disclaimers?: string[];
  /**
   * Markdown from lazy custom-instructions answer on meal detail (first slide).
   * `undefined` = not loaded yet; `""` = loaded with no content.
   * Omitted on legacy meals.
   */
  customContent?: string;
  /**
   * Follow-up Q&A answers on meal detail (after the initial customContent slide).
   * Navigate with arrows; never replaces prior answers.
   */
  customContentEntries?: MealCustomContentEntry[];
  /** ISO clock for LWW diary sync; omitted on legacy local meals */
  clientUpdatedAt?: string;
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
  /** AI category emitted by the text XML analysis; omitted for legacy and photo XML */
  foodType?: FoodType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** AI recognition confidence 0–1; omitted when model does not return it */
  confidence?: number;
  /** Integer 1–10 healthfulness score from AI; omitted when feature disabled or model skips */
  healthiness?: number;
  items: NutritionItem[];
  /**
   * Count of discrete edible units (pieces/rolls/wings) when food is usually counted that way.
   * Not the length of `items` (composition). Maps to Meal.portions.
   * Omitted when model skips — treat as 1.
   */
  itemCount?: number;
  /**
   * Estimated total dish weight in grams (sum of visible food).
   * Display-only on the client; omitted when model skips.
   */
  totalGrams?: number;
  /** Quantitative micronutrient amounts for the portion; omitted if model skipped */
  micronutrients?: MicronutrientEstimate[];
  /** Scale anchor used for portion size (plate / spoon / …) */
  portionReference?: string;
  /** Added/free sugar grams within carbs; 0 if none */
  addedSugar?: number;
  /** Short Russian rationale for confidence */
  confidenceReason?: string;
  /** Short Russian rationale for healthiness */
  healthinessReason?: string;
  /** Hidden calories / uncertainty notes from the model */
  disclaimers?: string[];
  /**
   * Optional Markdown custom answer (refine only when user asks to update).
   * Primary fill path is lazy fetch on meal detail, not first analyze.
   */
  customContent?: string;
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
  /** Onboarding plan start day (YYYY-MM-DD); snapshot at finish */
  planStartDate?: string;
  /** Weight (kg) at onboarding finish — ideal trajectory start */
  planStartWeight?: number;
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
