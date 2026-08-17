import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, Flame, User } from 'lucide-react';
import { useDiaryStore } from '@/entities/meal';
import { localDateKey } from '@/entities/streak';
import { useProfileStore } from '@/features/onboarding';
import { useSettingsStore } from '@/features/settings';
import { StreakSheet, useStreak } from '@/features/streak';
import { isSameDay, useSearchParamSheet } from '@/shared/lib';
import { WeekStrip } from './WeekStrip';
import { NutritionSummaryCard } from './NutritionSummaryCard';
import { DailyBudgetSheet } from './DailyBudgetSheet';

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
  const calendarRings = useSettingsStore((s) => s.calendarRings);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const {
    isOpen: streakOpen,
    open: openStreakSheet,
    close: closeStreakSheet,
  } = useSearchParamSheet('streak');
  const { snapshot: streakSnapshot, markCelebrated, hydrated } = useStreak();

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

  useEffect(() => {
    if (!hydrated || !streakSnapshot.shouldCelebrate) return;
    openStreakSheet();
    markCelebrated(localDateKey(new Date()));
  }, [hydrated, streakSnapshot.shouldCelebrate, markCelebrated, openStreakSheet]);

  return (
    <header className="px-4 pt-safe-header pb-2">
      <div className="relative flex items-center justify-center">
        <div className="absolute left-0 flex items-center gap-0.5">
          <button
            type="button"
            className="p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Статистика"
            onClick={() => navigate('/stats')}
          >
            <BarChart2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-full px-1.5 py-1 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            aria-label={`Серия ${streakSnapshot.currentLength} дней`}
            onClick={openStreakSheet}
          >
            <Flame className="h-4 w-4 text-primary" aria-hidden />
            <span className="tabular-nums">{streakSnapshot.currentLength}</span>
          </button>
        </div>
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
        targets={targets}
        calendarRings={calendarRings}
        onDaySelect={onDaySelect}
        onWeekChange={onWeekChange}
      />

      <NutritionSummaryCard
        entranceKey={localDateKey(selectedDate)}
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
        onFlameClick={() => setBudgetOpen(true)}
      />

      <DailyBudgetSheet
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        meals={dayMeals}
        consumedKcal={consumedKcal}
        goalKcal={goalKcal}
      />

      <StreakSheet
        open={streakOpen}
        onClose={closeStreakSheet}
        snapshot={streakSnapshot}
      />
    </header>
  );
}
