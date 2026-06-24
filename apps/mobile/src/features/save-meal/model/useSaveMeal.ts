import { useNavigate } from 'react-router-dom';
import { useDiaryStore } from './useDiaryStore';
import { useImageStore } from '@/features/add-food';
import type { NutritionResult, Meal, FoodItem } from '@ai-food/shared-types';

export function useSaveMeal() {
  const addMeal = useDiaryStore((s) => s.addMeal);
  const clearImage = useImageStore((s) => s.clear);
  const navigate = useNavigate();

  return (result: NutritionResult) => {
    const item: FoodItem = {
      id: crypto.randomUUID(),
      name: result.foodName,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      portion: '1 serving',
    };

    const meal: Meal = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      items: [item],
      totalCalories: result.calories,
    };

    addMeal(meal);
    clearImage();
    navigate('/');
  };
}
