import { Flame, Target } from 'lucide-react';
import { cn } from '@/shared/lib';
import type { FriendProfileStatsCardProps } from './FriendProfileStatsCard.types';

export function FriendProfileStatsCard({
  className,
  profile,
}: FriendProfileStatsCardProps) {
  const { calorieStreak, goalKg, streak, targets, weightKg } = profile;

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card p-4 shadow-sm',
        className,
      )}
    >
      <div className="grid grid-cols-3 gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">Серия</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold tabular-nums tracking-tight">
            <Flame className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
            <span className="font-medium text-muted-foreground">Запись</span>
            {streak}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold tabular-nums tracking-tight">
            <Target className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
            <span className="font-medium text-muted-foreground">Норма</span>
            {calorieStreak ?? 0}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">Вес</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
            {weightKg != null ? (
              <>
                {weightKg}
                <span className="ml-1 text-xs font-medium text-muted-foreground">
                  кг
                </span>
              </>
            ) : (
              '—'
            )}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">Цель</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
            {goalKg != null ? (
              <>
                {goalKg}
                <span className="ml-1 text-xs font-medium text-muted-foreground">
                  кг
                </span>
              </>
            ) : (
              '—'
            )}
          </p>
        </div>
      </div>

      {targets ? (
        <div className="mt-4 border-t border-border/60 pt-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            Дневные цели
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-kbju-kcal-soft px-2.5 py-1 text-xs font-medium tabular-nums text-kbju-kcal-fg">
              {targets.kcal} ккал
            </span>
            <span className="rounded-full bg-kbju-protein-soft px-2.5 py-1 text-xs font-medium tabular-nums text-kbju-protein-fg">
              Б {targets.protein}
            </span>
            <span className="rounded-full bg-kbju-fat-soft px-2.5 py-1 text-xs font-medium tabular-nums text-kbju-fat-fg">
              Ж {targets.fat}
            </span>
            <span className="rounded-full bg-kbju-carbs-soft px-2.5 py-1 text-xs font-medium tabular-nums text-kbju-carbs-fg">
              У {targets.carbs}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}