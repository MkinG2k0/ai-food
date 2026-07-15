import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useDiaryStore } from './useDiaryStore';
import { isSameDay } from '@/shared/lib';
import type { Meal } from '@ai-food/shared-types';

const mockMeal: Meal = {
  id: '1',
  timestamp: '2026-06-24T10:00:00.000Z',
  items: [
    {
      id: 'item-1',
      name: 'Chicken Salad',
      calories: 320,
      protein: 35,
      carbs: 18,
      fat: 12,
      grams: 100,
    },
  ],
  totalCalories: 320,
};

describe('useDiaryStore', () => {
  beforeEach(async () => {
    await act(async () => {
      await useDiaryStore.persist.rehydrate();
    });
    useDiaryStore.setState({ meals: [], selectedDate: new Date() });
  });

  it('starts with empty meals', () => {
    const { result } = renderHook(() => useDiaryStore());
    expect(result.current.meals).toHaveLength(0);
  });

  it('exposes selectedDate defaulting to today', () => {
    const { result } = renderHook(() => useDiaryStore());
    expect(result.current.selectedDate).toBeInstanceOf(Date);
    expect(isSameDay(result.current.selectedDate, new Date())).toBe(true);
  });

  it('updates selectedDate via setSelectedDate', async () => {
    const { result } = renderHook(() => useDiaryStore());
    const past = new Date();
    past.setDate(past.getDate() - 3);
    await act(async () => {
      result.current.setSelectedDate(past);
    });
    expect(isSameDay(result.current.selectedDate, past)).toBe(true);
  });

  it('clearDiary does not wipe selectedDate', async () => {
    const { result } = renderHook(() => useDiaryStore());
    const past = new Date();
    past.setDate(past.getDate() - 2);
    await act(async () => {
      result.current.setSelectedDate(past);
      result.current.addMeal(mockMeal);
      result.current.clearDiary();
    });
    expect(result.current.meals).toHaveLength(0);
    expect(isSameDay(result.current.selectedDate, past)).toBe(true);
  });

  it('adds a meal', async () => {
    const { result } = renderHook(() => useDiaryStore());
    await act(async () => {
      result.current.addMeal(mockMeal);
    });
    expect(result.current.meals).toHaveLength(1);
    expect(result.current.meals[0]).toEqual(mockMeal);
  });

  it('prepends newer meals (newest first)', async () => {
    const { result } = renderHook(() => useDiaryStore());
    const meal2: Meal = { ...mockMeal, id: '2', timestamp: '2026-06-24T11:00:00.000Z' };
    await act(async () => {
      result.current.addMeal(mockMeal);
      result.current.addMeal(meal2);
    });
    expect(result.current.meals[0].id).toBe('2');
    expect(result.current.meals[1].id).toBe('1');
  });

  it('clears all meals', async () => {
    const { result } = renderHook(() => useDiaryStore());
    await act(async () => {
      result.current.addMeal(mockMeal);
      result.current.clearDiary();
    });
    expect(result.current.meals).toHaveLength(0);
  });

  it('updates a meal by id', async () => {
    const { result } = renderHook(() => useDiaryStore());
    await act(async () => {
      result.current.addMeal(mockMeal);
      result.current.updateMeal('1', {
        status: 'ready',
        totalCalories: 400,
      });
    });
    expect(result.current.meals[0].totalCalories).toBe(400);
    expect(result.current.meals[0].status).toBe('ready');
  });

  it('removes a meal by id', async () => {
    const { result } = renderHook(() => useDiaryStore());
    await act(async () => {
      result.current.addMeal(mockMeal);
      result.current.removeMeal('1');
    });
    expect(result.current.meals).toHaveLength(0);
  });

  const multiItemMeal: Meal = {
    id: 'm1',
    timestamp: '2026-06-24T12:00:00.000Z',
    name: 'Burger',
    items: [
      {
        id: 'a',
        name: 'Bun',
        calories: 200,
        protein: 6,
        carbs: 40,
        fat: 2,
        grams: 80,
      },
      {
        id: 'b',
        name: 'Patty',
        calories: 300,
        protein: 24,
        carbs: 0,
        fat: 20,
        grams: 120,
      },
    ],
    totalCalories: 500,
  };

  it('updateMealItem patches item and recalculates totalCalories', async () => {
    const { result } = renderHook(() => useDiaryStore());
    await act(async () => {
      result.current.addMeal(multiItemMeal);
      result.current.updateMealItem('m1', 'a', { calories: 250, protein: 8 });
    });
    const meal = result.current.meals[0];
    expect(meal.items[0].calories).toBe(250);
    expect(meal.items[0].protein).toBe(8);
    expect(meal.items[0].name).toBe('Bun');
    expect(meal.totalCalories).toBe(550);
  });

  it('updateMealItem is no-op for unknown meal or item', async () => {
    const { result } = renderHook(() => useDiaryStore());
    await act(async () => {
      result.current.addMeal(multiItemMeal);
      result.current.updateMealItem('missing', 'a', { calories: 1 });
      result.current.updateMealItem('m1', 'missing', { calories: 1 });
    });
    expect(result.current.meals[0]).toEqual(multiItemMeal);
  });

  it('updateMealItem clamps negative and NaN nutrient values to >= 0 finite', async () => {
    const { result } = renderHook(() => useDiaryStore());
    await act(async () => {
      result.current.addMeal(multiItemMeal);
      result.current.updateMealItem('m1', 'a', {
        calories: -10,
        protein: Number.NaN,
        carbs: Infinity,
        fat: -5,
      });
    });
    const item = result.current.meals[0].items[0];
    expect(item.calories).toBe(0);
    expect(item.protein).toBe(0);
    expect(item.carbs).toBe(0);
    expect(item.fat).toBe(0);
    expect(result.current.meals[0].totalCalories).toBe(300);
  });

  it('removeMealItem removes item and recalculates totalCalories', async () => {
    const { result } = renderHook(() => useDiaryStore());
    await act(async () => {
      result.current.addMeal(multiItemMeal);
      result.current.removeMealItem('m1', 'a');
    });
    const meal = result.current.meals[0];
    expect(meal.items).toHaveLength(1);
    expect(meal.items[0].id).toBe('b');
    expect(meal.totalCalories).toBe(300);
  });

  it('removeMealItem leaving empty items keeps meal with totalCalories 0', async () => {
    const { result } = renderHook(() => useDiaryStore());
    await act(async () => {
      result.current.addMeal(multiItemMeal);
      result.current.removeMealItem('m1', 'a');
      result.current.removeMealItem('m1', 'b');
    });
    const meal = result.current.meals[0];
    expect(meal).toBeDefined();
    expect(meal.id).toBe('m1');
    expect(meal.items).toEqual([]);
    expect(meal.totalCalories).toBe(0);
  });

  it('updateMealNutrition scales all items so sum matches target', async () => {
    const { result } = renderHook(() => useDiaryStore());
    await act(async () => {
      result.current.addMeal(multiItemMeal);
      result.current.updateMealNutrition('m1', { calories: 1000, protein: 60 });
    });
    const meal = result.current.meals[0];
    const sumCal = meal.items.reduce((s, i) => s + i.calories, 0);
    const sumPro = meal.items.reduce((s, i) => s + i.protein, 0);
    // Integer rounding may drift sum by ±items.length
    expect(sumCal).toBeGreaterThanOrEqual(1000 - meal.items.length);
    expect(sumCal).toBeLessThanOrEqual(1000 + meal.items.length);
    expect(sumPro).toBeGreaterThanOrEqual(60 - meal.items.length);
    expect(sumPro).toBeLessThanOrEqual(60 + meal.items.length);
    expect(meal.totalCalories).toBe(sumCal);
    expect(
      meal.items.every(
        (i) =>
          Number.isInteger(i.calories) &&
          Number.isInteger(i.protein) &&
          Number.isInteger(i.carbs) &&
          Number.isInteger(i.fat),
      ),
    ).toBe(true);
    // carbs/fat unchanged when not passed
    expect(meal.items.reduce((s, i) => s + i.carbs, 0)).toBe(40);
    expect(meal.items.reduce((s, i) => s + i.fat, 0)).toBe(22);
  });

  it('updateMealNutrition puts target on first item when current sum is 0', async () => {
    const zeroMeal: Meal = {
      ...multiItemMeal,
      id: 'z1',
      items: [
        { id: 'a', name: 'A', calories: 0, protein: 0, carbs: 0, fat: 0, grams: 100 },
        { id: 'b', name: 'B', calories: 0, protein: 0, carbs: 0, fat: 0, grams: 100 },
      ],
      totalCalories: 0,
    };
    const { result } = renderHook(() => useDiaryStore());
    await act(async () => {
      result.current.addMeal(zeroMeal);
      result.current.updateMealNutrition('z1', { calories: 400, protein: 20 });
    });
    const meal = result.current.meals[0];
    expect(meal.items[0].calories).toBe(400);
    expect(meal.items[0].protein).toBe(20);
    expect(meal.items[1].calories).toBe(0);
    expect(meal.items[1].protein).toBe(0);
    expect(meal.totalCalories).toBe(400);
  });

  it('updateMealNutrition is no-op when items are empty', async () => {
    const emptyMeal: Meal = {
      id: 'e1',
      timestamp: '2026-06-24T12:00:00.000Z',
      items: [],
      totalCalories: 0,
      name: 'Empty',
    };
    const { result } = renderHook(() => useDiaryStore());
    await act(async () => {
      result.current.addMeal(emptyMeal);
      result.current.updateMealNutrition('e1', { calories: 500, protein: 30 });
    });
    expect(result.current.meals[0]).toEqual(emptyMeal);
  });

  it('setMealPortions scales items, grams and totalCalories by 0.5 steps', async () => {
    const { result } = renderHook(() => useDiaryStore());
    await act(async () => {
      result.current.addMeal({ ...multiItemMeal, portions: 1 });
      result.current.setMealPortions('m1', 1.5);
    });
    const meal = result.current.meals[0];
    expect(meal.portions).toBe(1.5);
    expect(meal.items[0].calories).toBe(300);
    expect(meal.items[0].grams).toBe(120);
    expect(meal.items[1].calories).toBe(450);
    expect(meal.totalCalories).toBe(750);
  });

  it('setMealPortions treats missing portions as 1 and clamps to min 0.5', async () => {
    const { result } = renderHook(() => useDiaryStore());
    await act(async () => {
      result.current.addMeal(multiItemMeal);
      result.current.setMealPortions('m1', 0.5);
    });
    const meal = result.current.meals[0];
    expect(meal.portions).toBe(0.5);
    expect(meal.items[0].calories).toBe(100);
    expect(meal.items[1].calories).toBe(150);
    expect(meal.totalCalories).toBe(250);
  });

  it('setMealPortions is no-op when portions unchanged after normalize', async () => {
    const { result } = renderHook(() => useDiaryStore());
    await act(async () => {
      result.current.addMeal({ ...multiItemMeal, portions: 1 });
      result.current.setMealPortions('m1', 1.1);
    });
    expect(result.current.meals[0].portions).toBe(1);
    expect(result.current.meals[0].totalCalories).toBe(500);
  });
});
