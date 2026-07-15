import { useDiaryStore } from '@/entities/meal';
import { MealCard } from '@/entities/meal';
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
          {isToday ? 'No meals tracked today' : 'No meals on this day'}
        </p>
        {isToday && <p className="text-sm mt-1">Tap + to add your first meal</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredMeals.map((meal) => (
        <MealCard key={meal.id} meal={meal} />
      ))}
    </div>
  );
}
