import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Meal } from '@ai-food/shared-types';
import { useDiaryStore } from '@/entities/meal';
import { FoodItemEditPage } from './FoodItemEditPage';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/features/diary-sync', () => ({
  useSyncMealOnLeave: () => undefined,
}));

const shawarmaMeal: Meal = {
  id: 'shawarma-1',
  timestamp: '2026-06-24T12:00:00.000Z',
  name: 'Шаурма',
  status: 'ready',
  totalGrams: 350,
  totalCalories: 700,
  items: [
    {
      id: 'wrap',
      name: 'Лаваш',
      calories: 200,
      protein: 6,
      carbs: 36,
      fat: 4,
      fiber: 2,
      grams: 100,
    },
    {
      id: 'meat',
      name: 'Мясо',
      calories: 400,
      protein: 32,
      carbs: 4,
      fat: 28,
      fiber: 0,
      grams: 150,
    },
    {
      id: 'sauce',
      name: 'Соус',
      calories: 100,
      protein: 1,
      carbs: 4,
      fat: 9,
      fiber: 0,
      grams: 100,
    },
  ],
};

describe('FoodItemEditPage grams → KBJU', () => {
  beforeEach(async () => {
    await act(async () => {
      await useDiaryStore.persist.rehydrate();
    });
    useDiaryStore.setState({
      meals: [{ ...shawarmaMeal, items: shawarmaMeal.items.map((i) => ({ ...i })) }],
      selectedDate: new Date(),
    });
  });

  it('changing item weight scales item macros and meal totalCalories', async () => {
    render(
      <MemoryRouter initialEntries={['/meal/shawarma-1/item/meat']}>
        <Routes>
          <Route
            path="/meal/:mealId/item/:itemId"
            element={<FoodItemEditPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const grams = await screen.findByLabelText('Граммы');
    fireEvent.focus(grams);
    fireEvent.change(grams, { target: { value: '75' } });
    fireEvent.blur(grams);

    const meal = useDiaryStore.getState().meals[0];
    const meat = meal?.items.find((i) => i.id === 'meat');
    expect(meat?.grams).toBe(75);
    expect(meat?.calories).toBe(200);
    expect(meat?.protein).toBe(16);
    expect(meat?.fat).toBe(14);
    expect(meal?.totalCalories).toBe(500);
    expect(meal?.totalGrams).toBe(275);
  });
});
