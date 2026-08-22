import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { Meal } from '@ai-food/shared-types';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

const fetchMealCustomContentApi = vi.fn();

vi.mock('../api/fetchMealCustomContentApi', () => ({
  fetchMealCustomContentApi: (...args: unknown[]) => fetchMealCustomContentApi(...args),
}));

import { useDiaryStore } from '@/entities/meal';
import { useSettingsStore } from '@/features/settings';
import { useMealCustomContent } from './useMealCustomContent';

const meal: Meal = {
  id: 'meal-1',
  timestamp: '2026-08-22T10:00:00.000Z',
  items: [
    {
      id: 'item-1',
      name: 'Салат',
      calories: 200,
      protein: 8,
      carbs: 12,
      fat: 10,
      fiber: 4,
      grams: 180,
    },
  ],
  totalCalories: 200,
  status: 'ready',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useMealCustomContent', () => {
  beforeEach(async () => {
    fetchMealCustomContentApi.mockReset();
    fetchMealCustomContentApi.mockResolvedValue('Initial markdown');

    await act(async () => {
      await useDiaryStore.persist.rehydrate();
      await useSettingsStore.persist.rehydrate();
    });

    useDiaryStore.setState({ meals: [{ ...meal }], selectedDate: new Date() });
    useSettingsStore.setState({
      customInstructions: 'Без сахара',
      customInstructionsEnabled: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches initial custom content and persists it on the meal', async () => {
    const { result } = renderHook(() => useMealCustomContent('meal-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchMealCustomContentApi).toHaveBeenCalledWith({
      mealContext: expect.objectContaining({ name: undefined, totalCalories: 200 }),
      customInstructions: 'Без сахара',
    });

    await waitFor(() =>
      expect(useDiaryStore.getState().meals[0].customContent).toBe('Initial markdown'),
    );
    expect(result.current.slides.length).toBeGreaterThan(0);
  });

  it('does not fetch when custom instructions are disabled', async () => {
    useSettingsStore.setState({
      customInstructionsEnabled: false,
      customInstructions: 'ignored',
    });

    const { result } = renderHook(() => useMealCustomContent('meal-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchMealCustomContentApi).not.toHaveBeenCalled();
    expect(result.current.instructions).toBe('');
  });

  it('appends Q&A slide via askQuestion', async () => {
    fetchMealCustomContentApi
      .mockResolvedValueOnce('Initial markdown')
      .mockResolvedValueOnce('Answer markdown');

    vi.stubGlobal('crypto', {
      randomUUID: () => 'entry-1',
    });

    const { result } = renderHook(() => useMealCustomContent('meal-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(useDiaryStore.getState().meals[0].customContent).toBe('Initial markdown'),
    );

    await act(async () => {
      await result.current.askQuestion('Сколько белка?');
    });

    const updated = useDiaryStore.getState().meals[0];
    expect(updated.customContentEntries).toEqual([
      {
        id: 'entry-1',
        question: 'Сколько белка?',
        content: 'Answer markdown',
      },
    ]);
    expect(result.current.activeIndex).toBe(result.current.slides.length - 1);
  });

  it('rejects empty questions', async () => {
    const { result } = renderHook(() => useMealCustomContent('meal-1'), {
      wrapper: createWrapper(),
    });

    await expect(result.current.askQuestion('   ')).rejects.toMatchObject({
      message: 'Введите вопрос.',
    });
  });

  it('navigates slides with goPrev/goNext', async () => {
    useDiaryStore.setState({
      meals: [
        {
          ...meal,
          customContent: 'Intro',
          customContentEntries: [
            { id: 'e1', question: 'Q1', content: 'A1' },
            { id: 'e2', question: 'Q2', content: 'A2' },
          ],
        },
      ],
    });

    const { result } = renderHook(() => useMealCustomContent('meal-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.canGoNext).toBe(true);
    act(() => {
      result.current.goNext();
    });
    expect(result.current.activeIndex).toBe(1);

    act(() => {
      result.current.goPrev();
    });
    expect(result.current.activeIndex).toBe(0);
    expect(result.current.canGoPrev).toBe(false);
  });
});
