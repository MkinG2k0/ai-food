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
  /** All photo paths when favorite was saved from a multi-angle meal */
  imageUris?: string[];
  healthiness?: number;
  confidence?: number;
  micronutrients?: MicronutrientEstimate[];
  createdAt: string;
  /** LWW clock for server sync */
  clientUpdatedAt?: string;
}
