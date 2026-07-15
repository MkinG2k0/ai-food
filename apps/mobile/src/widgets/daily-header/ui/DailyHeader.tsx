import { useNavigate } from 'react-router-dom';
import { BarChart2, User } from 'lucide-react';
import { useDiaryStore } from '@/entities/meal';
import { useProfileStore } from '@/features/onboarding';
import { isSameDay } from '@/shared/lib';
import { WeekStrip } from './WeekStrip';
import { NutritionSummaryCard } from './NutritionSummaryCard';

interface DailyHeaderProps {
  selectedDate: Date;
  weekOffset: number;
  onDaySelect: (date: Date) => void;
  onWeekChange: (delta: 1 | -1) => void;
}

const FALLBACK_TARGETS = {
  kcal: 2000,
  protein: 150,
  fat: 70,
  carbs: 250,
  fiber: 30,
} as const;

export function DailyHeader({
  selectedDate,
  weekOffset,
  onDaySelect,
  onWeekChange,
}: DailyHeaderProps) {
  const navigate = useNavigate();
  const meals = useDiaryStore((s) => s.meals);
  const targets = useProfileStore((s) => s.targets);

  const goalKcal = targets?.kcal ?? FALLBACK_TARGETS.kcal;
  const goalProtein = targets?.protein ?? FALLBACK_TARGETS.protein;
  const goalFat = targets?.fat ?? FALLBACK_TARGETS.fat;
  const goalCarbs = targets?.carbs ?? FALLBACK_TARGETS.carbs;
  const goalFiber = targets?.fiber ?? FALLBACK_TARGETS.fiber;

  const dayMeals = meals.filter(
    (m) =>
      isSameDay(new Date(m.timestamp), selectedDate) &&
      (m.status ?? 'ready') === 'ready',
  );

  const consumedKcal = dayMeals.reduce((sum, m) => sum + m.totalCalories, 0);
  const consumedProtein = dayMeals.reduce(
    (sum, m) => sum + m.items.reduce((s, i) => s + i.protein, 0),
    0,
  );
  const consumedFat = dayMeals.reduce(
    (sum, m) => sum + m.items.reduce((s, i) => s + i.fat, 0),
    0,
  );
  const consumedCarbs = dayMeals.reduce(
    (sum, m) => sum + m.items.reduce((s, i) => s + i.carbs, 0),
    0,
  );
  const consumedFiber = dayMeals.reduce(
    (sum, m) => sum + m.items.reduce((s, i) => s + (i.fiber ?? 0), 0),
    0,
  );

  return (
    <header className="px-4 pt-12 pb-2">
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          className="absolute left-0 p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Статистика"
          onClick={() => navigate('/stats')}
        >
          <BarChart2 className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight">AI Food</h1>
        <button
          type="button"
          className="absolute right-0 p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Настройки"
          onClick={() => navigate('/settings')}
        >
          <User className="h-5 w-5" />
        </button>
      </div>

      <WeekStrip
        weekOffset={weekOffset}
        selectedDate={selectedDate}
        meals={meals}
        onDaySelect={onDaySelect}
        onWeekChange={onWeekChange}
      />

      <NutritionSummaryCard
        consumedKcal={consumedKcal}
        consumedProtein={consumedProtein}
        consumedFat={consumedFat}
        consumedCarbs={consumedCarbs}
        consumedFiber={consumedFiber}
        goalKcal={goalKcal}
        goalProtein={goalProtein}
        goalFat={goalFat}
        goalCarbs={goalCarbs}
        goalFiber={goalFiber}
      />
    </header>
  );
}
