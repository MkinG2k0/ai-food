import type { Meal, MealCustomContentEntry } from '@ai-food/shared-types';

const INITIAL_ENTRY_ID = 'settings-initial';

/**
 * Carousel slides: non-empty initial `customContent` first, then follow-ups.
 */
export function resolveCustomContentSlides(
  meal: Meal | undefined,
): MealCustomContentEntry[] {
  if (!meal) return [];
  const slides: MealCustomContentEntry[] = [];
  const initial = meal.customContent?.trim();
  if (initial) {
    slides.push({ id: INITIAL_ENTRY_ID, content: initial });
  }
  for (const entry of meal.customContentEntries ?? []) {
    if (entry.content.trim()) {
      slides.push(entry);
    }
  }
  return slides;
}
