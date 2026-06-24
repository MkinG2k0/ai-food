import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDiaryStore } from '@/features/save-meal';
import { MealCard } from '@/entities/meal';
import { Button } from '@/shared/ui';
import { formatDate } from '@/shared/lib';
import type { Meal } from '@ai-food/shared-types';

export function DiaryPage() {
  const navigate = useNavigate();
  const meals = useDiaryStore((s) => s.meals);

  const grouped = meals.reduce<Record<string, Meal[]>>((acc, meal) => {
    const date = formatDate(meal.timestamp);
    (acc[date] ??= []).push(meal);
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center px-4 py-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold ml-2">Food Diary</h1>
      </header>

      <main className="flex-1 px-4 py-4">
        {meals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-lg font-medium">No meals yet</p>
            <p className="text-sm mt-1">Add your first meal to get started</p>
            <Button className="mt-4" onClick={() => navigate('/add')}>
              Add Food
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, dateMeals]) => (
              <div key={date}>
                <h2 className="text-sm font-medium text-muted-foreground mb-3">{date}</h2>
                <div className="space-y-3">
                  {dateMeals.map((meal) => (
                    <MealCard key={meal.id} meal={meal} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
