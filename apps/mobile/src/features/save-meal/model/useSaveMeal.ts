import { useNavigate } from 'react-router-dom';
import { useDiaryStore } from '@/entities/meal';
import { useImageStore } from '@/features/add-food';
import { saveMealImage } from '@/shared/lib';
import type { NutritionResult, Meal, FoodItem } from '@ai-food/shared-types';

export function useSaveMeal() {
  const addMeal = useDiaryStore((s) => s.addMeal);
  const selectedImage = useImageStore((s) => s.selectedImage);
  const clearImage = useImageStore((s) => s.clear);
  const navigate = useNavigate();

  return async (result: NutritionResult) => {
    const item: FoodItem = {
      id: crypto.randomUUID(),
      name: result.foodName,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      portion: '1 serving',
    };

    const imageUri = selectedImage ? await saveMealImage(selectedImage) : undefined;

    const meal: Meal = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      items: [item],
      totalCalories: result.calories,
      imageUri,
    };

    addMeal(meal);
    clearImage();
    navigate('/');
  };
}
