import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ApiError, Meal, MealCustomContentEntry } from '@ai-food/shared-types';
import { useDiaryStore } from '@/entities/meal';
import { useSettingsStore } from '@/features/settings';
import { fetchMealCustomContentApi } from '../api/fetchMealCustomContentApi';
import { resolveCustomContentSlides } from './resolveCustomContentSlides';

function buildMealContext(meal: Meal) {
  return {
    name: meal.name,
    totalCalories: meal.totalCalories,
    items: meal.items.map((item) => ({
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      grams: item.grams,
    })),
  };
}

/**
 * Lazy-loads initial Markdown from settings; supports follow-up Q&A slides.
 */
export function useMealCustomContent(mealId: string | undefined) {
  const meal = useDiaryStore((s) => s.meals.find((m) => m.id === mealId));
  const updateMeal = useDiaryStore((s) => s.updateMeal);
  const customInstructionsEnabled = useSettingsStore(
    (s) => s.customInstructionsEnabled,
  );
  const customInstructionsRaw = useSettingsStore((s) => s.customInstructions);
  const instructions = customInstructionsEnabled
    ? customInstructionsRaw.trim()
    : '';
  const mealReady =
    !!meal &&
    meal.status !== 'analyzing' &&
    meal.status !== 'error' &&
    mealId != null;
  const needsInitialFetch =
    mealReady && instructions.length > 0 && meal.customContent === undefined;

  const slides = resolveCustomContentSlides(meal);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex((prev) => {
      if (slides.length === 0) return 0;
      return Math.min(prev, slides.length - 1);
    });
  }, [slides.length]);

  const query = useQuery({
    queryKey: ['meal-custom-content', mealId, instructions],
    enabled: needsInitialFetch,
    queryFn: () =>
      fetchMealCustomContentApi({
        mealContext: buildMealContext(meal!),
        customInstructions: instructions,
      }),
    staleTime: Infinity,
    retry: 1,
  });

  useEffect(() => {
    if (!mealId || query.data === undefined || !query.isSuccess) return;
    const current = useDiaryStore.getState().meals.find((m) => m.id === mealId);
    if (!current || current.customContent !== undefined) return;
    updateMeal(mealId, { customContent: query.data });
  }, [mealId, query.data, query.isSuccess, updateMeal]);

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) {
        const err: ApiError = {
          message: 'Введите вопрос.',
          code: 'ANALYSIS_FAILED',
          status: 400,
        };
        throw err;
      }
      const current = useDiaryStore.getState().meals.find((m) => m.id === mealId);
      if (!current || !mealId) {
        const err: ApiError = {
          message: 'Приём пищи не найден.',
          code: 'ANALYSIS_FAILED',
          status: 404,
        };
        throw err;
      }
      const content = await fetchMealCustomContentApi({
        mealContext: buildMealContext(current),
        question: trimmed,
      });
      if (!content.trim()) {
        const err: ApiError = {
          message: 'Пустой ответ. Попробуйте переформулировать вопрос.',
          code: 'ANALYSIS_FAILED',
          status: 500,
        };
        throw err;
      }
      const entry: MealCustomContentEntry = {
        id: crypto.randomUUID(),
        question: trimmed,
        content,
      };
      const nextEntries = [...(current.customContentEntries ?? []), entry];
      updateMeal(mealId, { customContentEntries: nextEntries });
      return entry;
    },
    onSuccess: () => {
      // Jump to the newest slide after append
      setActiveIndex(() => {
        const next = useDiaryStore.getState().meals.find((m) => m.id === mealId);
        const nextSlides = resolveCustomContentSlides(next);
        return Math.max(0, nextSlides.length - 1);
      });
    },
  });

  const safeIndex =
    slides.length === 0 ? 0 : Math.min(activeIndex, slides.length - 1);
  const activeSlide = slides[safeIndex];

  return {
    instructions,
    slides,
    activeIndex: safeIndex,
    activeSlide,
    setActiveIndex,
    canGoPrev: safeIndex > 0,
    canGoNext: safeIndex < slides.length - 1,
    goPrev: () => setActiveIndex((i) => Math.max(0, i - 1)),
    goNext: () =>
      setActiveIndex((i) =>
        slides.length === 0 ? 0 : Math.min(slides.length - 1, i + 1),
      ),
    isLoading: needsInitialFetch && (query.isLoading || query.isFetching),
    isError: needsInitialFetch && query.isError,
    error: query.error,
    refetch: query.refetch,
    askQuestion: askMutation.mutateAsync,
    isAsking: askMutation.isPending,
    askError: askMutation.error,
  };
}
