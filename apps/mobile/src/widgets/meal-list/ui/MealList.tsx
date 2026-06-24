import { useNavigate } from 'react-router-dom';
import { useDiaryStore } from '@/features/save-meal/model/useDiaryStore';
import { MealCard } from '@/entities/meal/ui/MealCard';
import { Button } from '@/shared/ui';

export function MealList() {
  const navigate = useNavigate();
  const meals = useDiaryStore((s) => s.meals);

  const today = new Date().toDateString();
  const todayMeals = meals.filter(
    (m) => new Date(m.timestamp).toDateString() === today
  );

  if (todayMeals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <p className="text-base font-medium">No meals tracked today</p>
        <p className="text-sm mt-1">Tap + to add your first meal</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-foreground">Today's Meals</h2>
        <Button variant="ghost" size="sm" onClick={() => navigate('/diary')}>
          View All
        </Button>
      </div>
      {todayMeals.map((meal) => (
        <MealCard key={meal.id} meal={meal} />
      ))}
    </div>
  );
}
