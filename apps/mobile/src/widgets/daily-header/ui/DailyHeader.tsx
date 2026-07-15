import { useDiaryStore } from '@/entities/meal';
import { useProfileStore } from '@/features/onboarding';
import { formatCalories, isSameDay, formatHeaderDate } from '@/shared/lib';
import { WeekStrip } from './WeekStrip';

interface DailyHeaderProps {
  selectedDate: Date;
  weekOffset: number;
  onDaySelect: (date: Date) => void;
  onWeekChange: (delta: 1 | -1) => void;
}

export function DailyHeader({
  selectedDate,
  weekOffset,
  onDaySelect,
  onWeekChange,
}: DailyHeaderProps) {
  const meals = useDiaryStore((s) => s.meals);
  const targets = useProfileStore((s) => s.targets);

  const dailyGoal = targets?.kcal ?? 2000;

  const dayCalories = meals
    .filter(
      (m) =>
        isSameDay(new Date(m.timestamp), selectedDate) &&
        (m.status ?? 'ready') === 'ready'
    )
    .reduce((sum, m) => sum + m.totalCalories, 0);

  const remaining = dailyGoal - dayCalories;
  const progress = Math.min((dayCalories / dailyGoal) * 100, 100);

  return (
    <header className="bg-emerald-500 text-white px-4 pt-12 pb-6">
      <p className="text-emerald-100 text-sm font-medium">{formatHeaderDate(selectedDate)}</p>
      <p className="text-4xl font-bold mt-1">{formatCalories(dayCalories)}</p>
      <p className="text-emerald-100 text-sm mt-1">
        {remaining > 0
          ? `${Math.round(remaining)} ккал осталось`
          : `${Math.round(Math.abs(remaining))} ккал сверх нормы`}
      </p>
      <div className="mt-4 h-1.5 bg-emerald-400 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <WeekStrip
        weekOffset={weekOffset}
        selectedDate={selectedDate}
        meals={meals}
        onDaySelect={onDaySelect}
        onWeekChange={onWeekChange}
      />
    </header>
  );
}
