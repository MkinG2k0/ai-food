import { useDiaryStore } from '@/entities/meal';
import { useProfileStore } from '@/features/onboarding';
import { formatCalories } from '@/shared/lib';

export function DailyHeader() {
  const meals = useDiaryStore((s) => s.meals);
  const targets = useProfileStore((s) => s.targets);

  const dailyGoal = targets?.kcal ?? 2000;

  const today = new Date().toDateString();
  const todayCalories = meals
    .filter((m) => new Date(m.timestamp).toDateString() === today)
    .reduce((sum, m) => sum + m.totalCalories, 0);

  const remaining = dailyGoal - todayCalories;
  const progress = Math.min((todayCalories / dailyGoal) * 100, 100);

  return (
    <header className="bg-emerald-500 text-white px-4 pt-12 pb-6">
      <p className="text-emerald-100 text-sm font-medium">Today</p>
      <p className="text-4xl font-bold mt-1">{formatCalories(todayCalories)}</p>
      <p className="text-emerald-100 text-sm mt-1">
        {remaining > 0
          ? `${Math.round(remaining)} kcal remaining`
          : `${Math.round(Math.abs(remaining))} kcal over goal`}
      </p>
      <div className="mt-4 h-1.5 bg-emerald-400 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  );
}
