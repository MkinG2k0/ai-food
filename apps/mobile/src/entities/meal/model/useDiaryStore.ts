import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Meal } from '@ai-food/shared-types';

interface DiaryState {
  meals: Meal[];
  selectedDate: Date;
  addMeal: (meal: Meal) => void;
  updateMeal: (id: string, patch: Partial<Meal>) => void;
  removeMeal: (id: string) => void;
  clearDiary: () => void;
  setSelectedDate: (date: Date) => void;
}

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set) => ({
      meals: [],
      selectedDate: new Date(),
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
      setSelectedDate: (date) => set({ selectedDate: date }),
    }),
    {
      name: 'ai-food-diary',
      partialize: (state) => ({ meals: state.meals }),
    }
  )
);
