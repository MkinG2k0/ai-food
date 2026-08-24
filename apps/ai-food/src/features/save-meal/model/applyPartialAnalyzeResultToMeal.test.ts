import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useDiaryStore } from '@/entities/meal';
import { applyPartialAnalyzeResultToMeal } from './applyPartialAnalyzeResultToMeal';

describe('applyPartialAnalyzeResultToMeal', () => {
  beforeEach(() => {
    useDiaryStore.setState({
      meals: [
        {
          id: 'meal-1',
          timestamp: '2026-08-22T10:00:00.000Z',
          name: 'Анализ…',
          status: 'analyzing',
          totalCalories: 0,
          totalGrams: 100,
          portions: 1,
          items: [
            {
              id: 'item-prev',
              name: 'Анализ…',
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              fiber: 0,
              grams: 100,
            },
            {
              id: 'item-extra',
              name: 'Should stay ignored',
              calories: 10,
              protein: 1,
              carbs: 1,
              fat: 1,
              fiber: 0,
              grams: 20,
            },
          ],
        },
      ],
      selectedDate: new Date(),
    });
  });

  it('noops on noFood', () => {
    applyPartialAnalyzeResultToMeal('meal-1', {
      noFood: true,
      foodName: 'Ignored',
      calories: 999,
    });
    const meal = useDiaryStore.getState().meals[0];
    expect(meal.totalCalories).toBe(0);
    expect(meal.items).toHaveLength(2);
  });

  it('noops when no scalar fields are present', () => {
    applyPartialAnalyzeResultToMeal('meal-1', {
      healthiness: 8,
      confidence: 0.5,
    });
    const meal = useDiaryStore.getState().meals[0];
    expect(meal.totalCalories).toBe(0);
    expect(meal.items).toHaveLength(2);
  });

  it('applies partial macros without replacing multi-item composition and stays analyzing', () => {
    applyPartialAnalyzeResultToMeal('meal-1', {
      foodName: 'Борщ',
      calories: 320,
      protein: 12,
      carbs: 40,
      fat: 8,
    });

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.status).toBe('analyzing');
    expect(meal.name).toBe('Борщ');
    expect(meal.totalCalories).toBe(320);
    expect(meal.items).toHaveLength(1);
    expect(meal.items[0]).toMatchObject({
      id: 'item-prev',
      name: 'Борщ',
      calories: 320,
      protein: 12,
      grams: 100,
    });
  });

  it('optionally updates totalGrams', () => {
    applyPartialAnalyzeResultToMeal('meal-1', {
      calories: 100,
      totalGrams: 250,
    });

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.totalGrams).toBe(250);
    expect(meal.status).toBe('analyzing');
  });
});
