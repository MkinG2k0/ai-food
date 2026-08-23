import type { Meal } from '@ai-food/shared-types';
import type { ImportedMealDraft, ImportPreviewRow } from '../model/types';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function mealDedupeKeyFromParts(
  date: string,
  time: string,
  name: string,
  calories: number,
): string {
  return `${date}|${time}|${name.trim().toLowerCase()}|${calories}`;
}

export function mealDedupeKeyFromMeal(meal: Meal): string {
  const d = new Date(meal.timestamp);
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const name = meal.name ?? meal.items[0]?.name ?? '';
  return mealDedupeKeyFromParts(date, time, name, meal.totalCalories);
}

export function markImportDuplicates(
  drafts: ImportedMealDraft[],
  existingMeals: Meal[],
): ImportPreviewRow[] {
  const existing = new Set(existingMeals.map(mealDedupeKeyFromMeal));
  return drafts.map((draft) => {
    const key = mealDedupeKeyFromParts(
      draft.date,
      draft.time,
      draft.name,
      draft.calories,
    );
    return {
      ...draft,
      status: existing.has(key) ? 'duplicate' : 'new',
    };
  });
}
