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
  items: NutritionItem[];
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
