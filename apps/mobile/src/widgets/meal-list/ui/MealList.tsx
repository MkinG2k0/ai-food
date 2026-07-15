import { useDiaryStore } from '@/entities/meal';
import { SwipeableMealCard } from '@/features/delete-meal';
import { isSameDay } from '@/shared/lib';

interface MealListProps {
  selectedDate: Date;
}

export function MealList({ selectedDate }: MealListProps) {
  const meals = useDiaryStore((s) => s.meals);

  const isToday = isSameDay(selectedDate, new Date());
  const filteredMeals = meals.filter(
    (m) => isSameDay(new Date(m.timestamp), selectedDate)
  );

  if (filteredMeals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <p className="text-base font-medium">
          {isToday ? 'Сегодня приёмов пищи нет' : 'В этот день приёмов пищи нет'}
        </p>
        {isToday && <p className="text-sm mt-1">Нажмите +, чтобы добавить первое блюдо</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredMeals.map((meal) => (
        <SwipeableMealCard key={meal.id} meal={meal} />
      ))}
    </div>
  );
}
