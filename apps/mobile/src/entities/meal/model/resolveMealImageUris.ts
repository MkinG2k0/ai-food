import type { Meal } from '@ai-food/shared-types';

/** Prefer `imageUris`; fall back to single `imageUri` for legacy meals. */
export function resolveMealImageUris(
  meal: Pick<Meal, 'imageUri' | 'imageUris'>,
): string[] {
  if (meal.imageUris && meal.imageUris.length > 0) {
    return meal.imageUris;
  }
  if (meal.imageUri) {
    return [meal.imageUri];
  }
  return [];
}
