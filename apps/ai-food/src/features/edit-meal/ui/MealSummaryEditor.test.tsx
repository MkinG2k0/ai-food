import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Meal } from '@ai-food/shared-types';
import { useDiaryStore } from '@/entities/meal';
import { MealSummaryEditor } from './MealSummaryEditor';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

const mealBase: Meal = {
  id: 'm1',
  timestamp: '2026-06-24T12:00:00.000Z',
  name: 'Burger',
  portions: 1,
  items: [
    {
      id: 'a',
      name: 'Bun',
      calories: 200,
      protein: 6,
      carbs: 40,
      fat: 2,
      fiber: 2,
      grams: 80,
    },
    {
      id: 'b',
      name: 'Patty',
      calories: 300,
      protein: 24,
      carbs: 0,
      fat: 20,
      fiber: 0,
      grams: 120,
    },
  ],
  totalCalories: 500,
};

function MealSummaryHarness({ mealId }: { mealId: string }) {
  const meal = useDiaryStore((s) => s.meals.find((m) => m.id === mealId));
  if (!meal) return null;
  return <MealSummaryEditor meal={meal} />;
}

describe('MealSummaryEditor portions input', () => {
  beforeEach(async () => {
    await act(async () => {
      await useDiaryStore.persist.rehydrate();
    });
    useDiaryStore.setState({ meals: [{ ...mealBase }], selectedDate: new Date() });
  });

  it('typing portions and blurring scales KBJU like +/-', () => {
    render(<MealSummaryHarness mealId="m1" />);

    const kcal = screen.getByLabelText('Калории блюда') as HTMLInputElement;
    expect(kcal.value).toBe('500');

    const portions = screen.getByLabelText('Съеденные порции (меняет КБЖУ)');
    fireEvent.focus(portions);
    fireEvent.change(portions, { target: { value: '0.5' } });
    fireEvent.blur(portions);

    expect((screen.getByLabelText('Калории блюда') as HTMLInputElement).value).toBe(
      '250',
    );
    expect(useDiaryStore.getState().meals[0]?.portions).toBe(0.5);
    expect(useDiaryStore.getState().meals[0]?.totalCalories).toBe(250);
  });
});