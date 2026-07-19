import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Meal } from '@ai-food/shared-types';
import { useDiaryStore } from '@/entities/meal';
import { useSettingsStore } from '@/features/settings';
import { fetchMealCustomContentApi } from '../api/fetchMealCustomContentApi';

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
 * Lazy-loads Markdown custom content when meal detail opens.
 * Persists `customContent` (including empty string) so revisits skip the API.
 */
export function useMealCustomContent(mealId: string | undefined) {
  const meal = useDiaryStore((s) => s.meals.find((m) => m.id === mealId));
  const updateMeal = useDiaryStore((s) => s.updateMeal);
  const customInstructions = useSettingsStore((s) => s.customInstructions);
  const aiModel = useSettingsStore((s) => s.aiModel);

  const instructions = customInstructions.trim();
  const mealReady =
    !!meal &&
    meal.status !== 'analyzing' &&
    meal.status !== 'error' &&
    mealId != null;
  const needsFetch =
    mealReady && instructions.length > 0 && meal.customContent === undefined;

  const query = useQuery({
    queryKey: ['meal-custom-content', mealId, instructions, aiModel],
    enabled: needsFetch,
    queryFn: () =>
      fetchMealCustomContentApi({
        mealContext: buildMealContext(meal!),
        customInstructions: instructions,
        model: aiModel,
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

  const content = meal?.customContent;

  return {
    instructions,
    content,
    isLoading: needsFetch && (query.isLoading || query.isFetching),
    isError: needsFetch && query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
