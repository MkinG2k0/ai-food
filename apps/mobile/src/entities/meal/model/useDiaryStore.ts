import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Meal } from '@ai-food/shared-types';

interface DiaryState {
  meals: Meal[];
  addMeal: (meal: Meal) => void;
  updateMeal: (id: string, patch: Partial<Meal>) => void;
  removeMeal: (id: string) => void;
  clearDiary: () => void;
}

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set) => ({
      meals: [],
      addMeal: (meal) => set((state) => ({ meals: [meal, ...state.meals] })),
      updateMeal: (id, patch) =>
        set((state) => ({
          meals: state.meals.map((meal) =>
            meal.id === id ? { ...meal, ...patch } : meal
          ),
        })),
      removeMeal: (id) =>
        set((state) => ({ meals: state.meals.filter((meal) => meal.id !== id) })),
      clearDiary: () => set({ meals: [] }),
    }),
    { name: 'ai-food-diary' }
  )
);
