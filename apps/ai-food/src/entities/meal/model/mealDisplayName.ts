import type { Meal } from '@ai-food/shared-types';

/** Display title for a meal: persisted name, else items join, else placeholder. */
export function mealDisplayName(meal: Meal): string {
  const trimmed = meal.name?.trim();
  if (trimmed) return trimmed;

  if (meal.items.length > 0) {
    const joined = meal.items.map((item) => item.name).join(', ').trim();
    if (joined) return joined;
    return meal.items[0]?.name?.trim() || 'Без названия';
  }

  return 'Без названия';
}
