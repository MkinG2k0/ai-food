import { useNavigate } from 'react-router-dom';
import { useDiaryStore } from '@/entities/meal';
import { SwipeableMealCard } from '@/features/delete-meal';
import { Button, SubpageShell } from '@/shared/ui';
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
    <SubpageShell title="Дневник питания" onBack={() => navigate('/')}>
      {meals.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p className="text-lg font-medium">Пока нет приёмов пищи</p>
          <p className="text-sm mt-1">Добавьте первый приём пищи</p>
          <Button className="mt-4" onClick={() => navigate('/')}>
            Добавить еду
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateMeals]) => (
            <div key={date}>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">{date}</h2>
              <div className="space-y-3">
                {dateMeals.map((meal) => (
                  <SwipeableMealCard key={meal.id} meal={meal} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SubpageShell>
  );
}
