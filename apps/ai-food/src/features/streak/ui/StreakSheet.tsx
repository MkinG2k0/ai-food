import { Flame, Shield } from 'lucide-react';
import type { StreakSnapshot } from '@/entities/streak';
import { streakDaysLabel } from '@/entities/streak';
import { BottomSheet, Button } from '@/shared/ui';

export interface StreakSheetProps {
  open: boolean;
  onClose: () => void;
  snapshot: StreakSnapshot;
}

function formatStartDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

export function StreakSheet({ open, onClose, snapshot }: StreakSheetProps) {
  const {
    currentLength,
    startDate,
    weekDays,
    bestStreak,
    personalBestLabel,
    nextMilestone,
    remainingDays,
    progress01,
    achieved100,
    freezeCount,
  } = snapshot;

  const previousMilestone =
    achieved100 || nextMilestone === null
      ? 100
      : nextMilestone - remainingDays;

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="max-h-[min(92dvh,56rem)] space-y-5 overflow-y-auto px-1">
        <div className="flex flex-col items-center pt-2 text-center">
          <Flame className="h-14 w-14 text-primary" aria-hidden />
          <p className="mt-3 text-5xl font-bold tabular-nums tracking-tight">
            {currentLength}
          </p>
          <p className="mt-1 text-base text-muted-foreground">
            {streakDaysLabel(currentLength)} подряд
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <div key={day.label} className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                    day.filled
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted bg-muted/40 text-muted-foreground'
                  }`}
                >
                  {day.filled ? (
                    <Flame className="h-4 w-4" aria-hidden />
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-lg font-semibold tabular-nums">
              {formatStartDate(startDate)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Начало серии</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-lg font-semibold tabular-nums text-primary">
              {bestStreak}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {personalBestLabel}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex w-10 shrink-0 flex-col items-center gap-1">
              <Flame className="h-5 w-5 text-primary" aria-hidden />
              <span className="text-sm font-semibold tabular-nums">
                {currentLength}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              {achieved100 ? (
                <p className="text-sm font-medium text-foreground">
                  100 дней достигнуто
                </p>
              ) : (
                <p className="text-sm font-medium text-foreground">
                  Ещё {remainingDays}{' '}
                  {streakDaysLabel(remainingDays)}
                </p>
              )}
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${Math.round(progress01 * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                до следующей цели
              </p>
            </div>

            <div className="flex w-10 shrink-0 flex-col items-center gap-1">
              <Flame
                className={`h-5 w-5 ${
                  nextMilestone ? 'text-muted-foreground' : 'text-primary'
                }`}
                aria-hidden
              />
              <span
                className={`text-sm font-semibold tabular-nums ${
                  nextMilestone ? 'text-muted-foreground' : 'text-primary'
                }`}
              >
                {nextMilestone ?? previousMilestone}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Защита серии
                {freezeCount > 0 ? ` ×${freezeCount}` : ''}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Сработает автоматически, если пропустите день
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {[0, 1].map((slot) => (
                <Shield
                  key={slot}
                  className={`h-5 w-5 ${
                    slot < freezeCount
                      ? 'text-primary'
                      : 'text-muted-foreground/40'
                  }`}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </div>

        <Button
          type="button"
          className="h-12 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
          onClick={onClose}
        >
          Продолжить
        </Button>
      </div>
    </BottomSheet>
  );
}
