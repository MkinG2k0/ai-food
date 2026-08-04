import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSaveManualMeal } from './useSaveManualMeal';
import { useDiaryStore } from '@/entities/meal';
import { saveMealImage } from '@/shared/lib';

vi.mock('@/shared/lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib')>();
  return {
    ...actual,
    saveMealImage: vi.fn().mockImplementation(async (file: File) => {
      return `meal-images/${file.name}`;
    }),
  };
});

describe('useSaveManualMeal', () => {
  beforeEach(() => {
    useDiaryStore.setState({ meals: [], selectedDate: new Date('2026-08-03T10:00:00.000Z') });
    vi.mocked(saveMealImage).mockClear();
    vi.mocked(saveMealImage).mockImplementation(async (file: File) => {
      return `meal-images/${file.name}`;
    });
  });

  it('saves single-item ready meal without composition', async () => {
    const { result } = renderHook(() => useSaveManualMeal());
    let mealId: string | null = null;

    await act(async () => {
      mealId = await result.current({
        name: 'Овсянка',
        calories: 350,
        protein: 12,
        carbs: 55,
        fat: 8,
        fiber: 4,
        grams: 250,
        composition: [],
      });
    });

    expect(mealId).toBeTruthy();
    const meal = useDiaryStore.getState().meals[0];
    expect(meal.id).toBe(mealId);
    expect(meal.status).toBe('ready');
    expect(meal.items).toHaveLength(1);
    expect(meal.totalCalories).toBe(350);
    expect(meal.aiModel).toBeUndefined();
    expect(saveMealImage).not.toHaveBeenCalled();
  });

  it('saves composition sum and image uris', async () => {
    const { result } = renderHook(() => useSaveManualMeal());
    const file = new File(['x'], 'bowl.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current({
        name: 'Овсянка',
        calories: 999,
        protein: 0,
        carbs: 0,
        fat: 0,
        composition: [
          {
            id: 'c1',
            name: 'Овёс',
            calories: 200,
            protein: 8,
            carbs: 30,
            fat: 4,
            fiber: 0,
            grams: 100,
          },
          {
            id: 'c2',
            name: 'Молоко',
            calories: 150,
            protein: 6,
            carbs: 12,
            fat: 5,
            fiber: 0,
            grams: 150,
          },
        ],
        image: file,
      });
    });

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.items).toHaveLength(2);
    expect(meal.totalCalories).toBe(350);
    expect(meal.imageUri).toBe('meal-images/bowl.jpg');
    expect(meal.imageUris).toEqual(['meal-images/bowl.jpg']);
    expect(saveMealImage).toHaveBeenCalledWith(file);
  });

  it('returns null and does not add meal when invalid', async () => {
    const { result } = renderHook(() => useSaveManualMeal());
    let mealId: string | null = 'sentinel';

    await act(async () => {
      mealId = await result.current({
        name: '',
        calories: 100,
        protein: 0,
        carbs: 0,
        fat: 0,
        composition: [],
      });
    });

    expect(mealId).toBeNull();
    expect(useDiaryStore.getState().meals).toHaveLength(0);
  });

  it('does not add meal when saveMealImage throws', async () => {
    vi.mocked(saveMealImage).mockRejectedValueOnce(new Error('disk full'));
    const { result } = renderHook(() => useSaveManualMeal());
    const file = new File(['x'], 'bowl.jpg', { type: 'image/jpeg' });

    await expect(
      act(async () => {
        await result.current({
          name: 'Овсянка',
          calories: 350,
          protein: 0,
          carbs: 0,
          fat: 0,
          composition: [],
          image: file,
        });
      }),
    ).rejects.toThrow('disk full');

    expect(useDiaryStore.getState().meals).toHaveLength(0);
  });
});
