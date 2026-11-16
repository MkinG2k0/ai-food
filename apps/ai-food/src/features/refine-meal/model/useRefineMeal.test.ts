import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ApiError, Meal } from '@ai-food/shared-types';
import { useDiaryStore } from '@/entities/meal';
import { refineMealApi } from '@/features/analyze-food';
import {
  compressImageForAi,
  fileToImageDataUrl,
  loadMealImageAsFile,
} from '@/shared/lib';
import { REFINE_IMAGE_DATA_URL_MAX_CHARS } from './prepareRefineMealImage';
import { useRefineMeal } from './useRefineMeal';

vi.mock('@/features/analyze-food', () => ({
  refineMealApi: vi.fn(),
}));

vi.mock('@/shared/lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib')>();
  return {
    ...actual,
    compressImageForAi: vi.fn(),
    fileToImageDataUrl: vi.fn(),
    loadMealImageAsFile: vi.fn(),
  };
});

const mealImageFile = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
const compressedDataUrl = 'data:image/jpeg;base64,compressed';

const baseMeal: Meal = {
  id: 'meal-1',
  timestamp: '2026-07-16T10:00:00.000Z',
  name: 'Бургер',
  imageUri: 'meal-images/burger.jpg',
  totalCalories: 850,
  status: 'ready',
  items: [
    {
      id: 'item-1',
      name: 'Булка',
      calories: 200,
      protein: 6,
      carbs: 40,
      fat: 2,
      fiber: 2,
      grams: 80,
    },
    {
      id: 'item-2',
      name: 'Котлета',
      calories: 650,
      protein: 29,
      carbs: 38,
      fat: 40,
      fiber: 1,
      grams: 150,
    },
  ],
};

describe('useRefineMeal', () => {
  beforeEach(() => {
    useDiaryStore.setState({ meals: [{ ...baseMeal, items: [...baseMeal.items] }] });
    vi.mocked(refineMealApi).mockReset();
    vi.mocked(loadMealImageAsFile).mockReset();
    vi.mocked(compressImageForAi).mockReset();
    vi.mocked(fileToImageDataUrl).mockReset();
    vi.mocked(loadMealImageAsFile).mockResolvedValue(mealImageFile);
    vi.mocked(compressImageForAi).mockImplementation(async (file) => file);
    vi.mocked(fileToImageDataUrl).mockResolvedValue(compressedDataUrl);
    vi.mocked(refineMealApi).mockResolvedValue({
      result: {
        foodName: 'Бургер (половина)',
        calories: 425,
        protein: 17.5,
        carbs: 39,
        fat: 21,
        fiber: 3,
        confidence: 0.9,
        healthiness: 6,
        items: [
          {
            name: 'Булка',
            calories: 100,
            protein: 3,
            carbs: 20,
            fat: 1,
            grams: 40,
          },
          {
            name: 'Котлета',
            calories: 325,
            protein: 14.5,
            carbs: 19,
            fat: 20,
            grams: 75,
          },
        ],
      },
      processingTime: 120,
    });
  });

  it('updates meal name/items/totalCalories from refine result', async () => {
    const { result } = renderHook(() => useRefineMeal());

    await act(async () => {
      await result.current('meal-1', 'съел половину');
    });

    const meal = useDiaryStore.getState().meals[0];
    expect(refineMealApi).toHaveBeenCalledWith(
      expect.objectContaining({
        correction: 'съел половину',
        customInstructions: '',
        dietType: 'none',
        imageDataUrl: compressedDataUrl,
        mealContext: expect.objectContaining({
          name: 'Бургер',
          items: expect.arrayContaining([
            expect.objectContaining({ name: 'Булка', grams: 80 }),
          ]),
        }),
      })
    );
    expect(meal.name).toBe('Бургер (половина)');
    expect(meal.totalCalories).toBe(425);
    expect(meal.items).toHaveLength(2);
    expect(meal.items[0].name).toBe('Булка');
    expect(meal.items[0].grams).toBe(40);
    expect(meal.items[0].id).not.toBe('item-1');
    expect(meal.imageUri).toBe('meal-images/burger.jpg');
    expect(meal.timestamp).toBe('2026-07-16T10:00:00.000Z');
    expect(meal.status).toBe('ready');
    expect(meal.healthiness).toBe(6);
    expect(meal.confidence).toBe(0.9);
    expect(loadMealImageAsFile).toHaveBeenCalledWith('meal-images/burger.jpg');
    expect(compressImageForAi).toHaveBeenCalledWith(mealImageFile);
    expect(fileToImageDataUrl).toHaveBeenCalled();
  });

  it('omits image when compressed data URL exceeds soft limit', async () => {
    const hugeUrl = `data:image/jpeg;base64,${'a'.repeat(REFINE_IMAGE_DATA_URL_MAX_CHARS)}`;
    vi.mocked(fileToImageDataUrl).mockResolvedValue(hugeUrl);

    const { result } = renderHook(() => useRefineMeal());

    await act(async () => {
      await result.current('meal-1', 'съел половину');
    });

    expect(compressImageForAi).toHaveBeenCalled();
    expect(refineMealApi).toHaveBeenCalledWith(
      expect.objectContaining({
        correction: 'съел половину',
        imageDataUrl: undefined,
      }),
    );
  });

  it('refines text-only when compress throws', async () => {
    vi.mocked(compressImageForAi).mockRejectedValue(new Error('compress failed'));

    const { result } = renderHook(() => useRefineMeal());

    await act(async () => {
      await result.current('meal-1', 'котлета мясная');
    });

    expect(refineMealApi).toHaveBeenCalledWith(
      expect.objectContaining({
        correction: 'котлета мясная',
        imageDataUrl: undefined,
      }),
    );
  });

  it('does not call API when correction is empty', async () => {
    const { result } = renderHook(() => useRefineMeal());

    await expect(
      act(async () => {
        await result.current('meal-1', '   ');
      })
    ).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);

    expect(refineMealApi).not.toHaveBeenCalled();
    expect(useDiaryStore.getState().meals[0].totalCalories).toBe(850);
  });

  it('propagates API error and leaves meal unchanged', async () => {
    const apiError: ApiError = {
      message: 'rate limited',
      code: 'RATE_LIMITED',
      status: 429,
    };
    vi.mocked(refineMealApi).mockRejectedValue(apiError);

    const { result } = renderHook(() => useRefineMeal());

    await expect(
      act(async () => {
        await result.current('meal-1', 'съел половину');
      })
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.name).toBe('Бургер');
    expect(meal.totalCalories).toBe(850);
    expect(meal.items).toHaveLength(2);
  });

  it('does not call updateMeal when refineMealApi rejects OFF_TOPIC', async () => {
    const apiError: ApiError = {
      message:
        'Уточнение невалидно или не по теме блюда и не меняет состав.',
      code: 'OFF_TOPIC',
      status: 400,
    };
    vi.mocked(refineMealApi).mockRejectedValue(apiError);

    const realUpdate = useDiaryStore.getState().updateMeal;
    const updateMealSpy = vi.fn(realUpdate);
    useDiaryStore.setState({ updateMeal: updateMealSpy });

    const { result } = renderHook(() => useRefineMeal());

    await expect(
      act(async () => {
        await result.current('meal-1', '22');
      }),
    ).rejects.toMatchObject({ code: 'OFF_TOPIC', status: 400 });

    expect(updateMealSpy).not.toHaveBeenCalled();
    expect(useDiaryStore.getState().meals[0].totalCalories).toBe(850);
    expect(useDiaryStore.getState().meals[0].items[0].grams).toBe(80);

    useDiaryStore.setState({ updateMeal: realUpdate });
  });

  it('maps payload too large API error to Russian message', async () => {
    vi.mocked(refineMealApi).mockRejectedValue({
      message: 'request entity too large',
      code: 'ANALYSIS_FAILED',
      status: 413,
    } satisfies ApiError);

    const { result } = renderHook(() => useRefineMeal());

    await expect(
      act(async () => {
        await result.current('meal-1', 'съел половину');
      }),
    ).rejects.toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      message:
        'Фото слишком большое для уточнения — попробуйте ещё раз без фото или короче текст.',
    });
  });

  it('maps timeout API error to Russian message', async () => {
    vi.mocked(refineMealApi).mockRejectedValue({
      message: 'timeout of 30000ms exceeded',
      code: 'UNKNOWN',
      status: 0,
    } satisfies ApiError);

    const { result } = renderHook(() => useRefineMeal());

    await expect(
      act(async () => {
        await result.current('meal-1', 'съел половину');
      }),
    ).rejects.toMatchObject({
      code: 'ANALYSIS_TIMEOUT',
      message: 'Сервер не успел обработать уточнение. Попробуйте ещё раз.',
    });
  });

  it('continues text-only when image read fails', async () => {
    vi.mocked(loadMealImageAsFile).mockResolvedValue(null);

    const { result } = renderHook(() => useRefineMeal());

    await act(async () => {
      await result.current('meal-1', 'котлета мясная');
    });

    expect(refineMealApi).toHaveBeenCalledWith(
      expect.objectContaining({
        correction: 'котлета мясная',
        imageDataUrl: undefined,
      })
    );
    expect(useDiaryStore.getState().meals[0].name).toBe('Бургер (половина)');
  });

  it('rejects when meal is missing', async () => {
    const { result } = renderHook(() => useRefineMeal());

    await expect(
      act(async () => {
        await result.current('missing', 'съел половину');
      })
    ).rejects.toMatchObject({ code: 'ANALYSIS_FAILED', status: 404 });

    expect(refineMealApi).not.toHaveBeenCalled();
  });
});
