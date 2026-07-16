import type {
  FoodItem,
  MicronutrientEstimate,
} from '@ai-food/shared-types';

/** Client-only favorite meal snapshot (not shared with backend). */
export interface FavoriteFood {
  id: string;
  sourceMealId: string;
  name: string;
  items: FoodItem[];
  totalCalories: number;
  portions?: number;
  imageUri?: string;
  healthiness?: number;
  confidence?: number;
  micronutrients?: MicronutrientEstimate[];
  createdAt: string;
}
