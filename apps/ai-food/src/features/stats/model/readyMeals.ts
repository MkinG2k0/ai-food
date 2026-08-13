import type { Meal } from '@ai-food/shared-types';

export function isReadyMeal(meal: Meal): boolean {
  return (meal.status ?? 'ready') === 'ready';
}

export function sumMealMacros(meal: Meal): { protein: number; carbs: number; fat: number } {
  return meal.items.reduce(
    (acc, item) => ({
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { protein: 0, carbs: 0, fat: 0 },
  );
}
