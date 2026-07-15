import { formatCalories, formatDayLabel } from '@/shared/lib';
import type { DailyCaloriePoint } from '../model/getWeeklyCalorieSeries';

interface WeeklyCaloriesChartProps {
  series: DailyCaloriePoint[];
}

const CHART_HEIGHT = 160;
const BAR_MAX_HEIGHT = 120;

export function WeeklyCaloriesChart({ series }: WeeklyCaloriesChartProps) {
  const maxCalories = Math.max(0, ...series.map((p) => p.calories));

  return (
    <div
      className="w-full"
      role="img"
      aria-label="Калории за последние 7 дней"
    >
      <div className="flex items-end justify-between gap-1.5" style={{ height: CHART_HEIGHT }}>
        {series.map((point) => {
          const heightPx =
            maxCalories === 0
              ? 0
              : Math.max(
                  point.calories > 0 ? 4 : 0,
                  Math.round((point.calories / maxCalories) * BAR_MAX_HEIGHT),
                );

          return (
            <div
              key={point.date.toISOString()}
              className="flex flex-1 flex-col items-center justify-end gap-1 min-w-0"
            >
              {point.calories > 0 ? (
                <span className="text-[10px] leading-none text-muted-foreground tabular-nums truncate max-w-full">
                  {Math.round(point.calories)}
                </span>
              ) : (
                <span className="text-[10px] leading-none text-transparent select-none">0</span>
              )}
              <div
                className="w-full max-w-[36px] rounded-t-md bg-foreground/80"
                style={{ height: heightPx }}
                title={formatCalories(point.calories)}
              />
              <span className="text-xs text-muted-foreground">
                {formatDayLabel(point.date)}
              </span>
            </div>
          );
        })}
      </div>
      {maxCalories === 0 && (
        <div
          className="mt-1 border-t border-border"
          aria-hidden
        />
      )}
    </div>
  );
}
