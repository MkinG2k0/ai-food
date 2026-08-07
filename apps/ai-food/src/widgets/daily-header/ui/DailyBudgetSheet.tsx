import type { Meal } from '@ai-food/shared-types';
import { mealDisplayName } from '@/entities/meal';
import { formatCalories } from '@/shared/lib';
import { BottomSheet } from '@/shared/ui';
import {
  dailyBudgetNumbers,
  groupMealsByPeriod,
  topMealsByCalories,
} from '../model/dailyBudget';

export interface DailyBudgetSheetProps {
  open: boolean;
  onClose: () => void;
  meals: Meal[];
  consumedKcal: number;
  goalKcal: number;
}

export function DailyBudgetSheet({
  open,
  onClose,
  meals,
  consumedKcal,
  goalKcal,
}: DailyBudgetSheetProps) {
  const budget = dailyBudgetNumbers(consumedKcal, goalKcal);
  const periods = groupMealsByPeriod(meals);
  const topMeals = topMealsByCalories(meals, 3);
  const maxPeriodKcal = Math.max(1, ...periods.map((p) => p.kcal));

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="max-h-[min(70vh,32rem)] space-y-5 overflow-y-auto px-1">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Бюджет дня</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Съедено {budget.progressPct}% от цели
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-muted/60 px-2 py-3">
            <p className="text-lg font-semibold tabular-nums tracking-tight">
              {budget.consumed}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">съедено</p>
          </div>
          <div className="rounded-xl bg-muted/60 px-2 py-3">
            <p
              className={`text-lg font-semibold tabular-nums tracking-tight ${
                budget.overGoal ? 'text-destructive' : ''
              }`}
            >
              {budget.overGoal ? `+${budget.overBy}` : budget.remaining}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {budget.overGoal ? 'сверх нормы' : 'осталось'}
            </p>
          </div>
          <div className="rounded-xl bg-muted/60 px-2 py-3">
            <p className="text-lg font-semibold tabular-nums tracking-tight">
              {budget.goal}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">цель</p>
          </div>
        </div>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">По приёмам</h3>
          <ul className="space-y-2.5">
            {periods.map((period) => {
              const fillPct =
                period.kcal > 0
                  ? Math.min(100, (period.kcal / maxPeriodKcal) * 100)
                  : 0;
              return (
                <li key={period.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-foreground">{period.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {period.mealCount === 0
                        ? '—'
                        : formatCalories(period.kcal)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">
            Топ по калориям
          </h3>
          {topMeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Пока нет записей за этот день
            </p>
          ) : (
            <ol className="space-y-2">
              {topMeals.map((meal, index) => (
                <li
                  key={meal.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate text-foreground">
                    <span className="mr-2 tabular-nums text-muted-foreground">
                      {index + 1}.
                    </span>
                    {mealDisplayName(meal)}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatCalories(meal.totalCalories)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </BottomSheet>
  );
}
