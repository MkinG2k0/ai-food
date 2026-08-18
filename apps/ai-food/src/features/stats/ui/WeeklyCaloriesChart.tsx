import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type PanInfo,
} from 'framer-motion';
import type { Meal } from '@ai-food/shared-types';
import { formatCalories, formatDayLabel, formatMacro } from '@/shared/lib';
import { MACRO_BAR_CLASSES } from '@/shared/ui';
import {
  getWeeklyCalorieSeries,
  macroCalories,
  type DailyCaloriePoint,
} from '../model/getWeeklyCalorieSeries';
import {
  calorieBarRangeLabel,
  getMonthlyCalorieSeries,
} from '../model/getMonthlyCalorieSeries';
import type { StatsPeriod } from '../model/monthPeriod';
import {
  averageLoggedCalories,
  chartTicks,
  formatCompactDayRange,
  formatDateRangeLabel,
  formatMonthLabel,
  niceChartMax,
} from '../model/chartScale';

interface WeeklyCaloriesChartProps {
  meals: Meal[];
  period: StatsPeriod;
  offset: number;
  onOffsetChange: (delta: 1 | -1) => void;
  goalKcal?: number;
}

const PLOT_HEIGHT = 200;
const SWIPE_OFFSET_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 500;

/** Stack order bottom → top (same hue language as home macros). */
const STACK = [
  { key: 'carbs' as const, label: 'Углеводы', className: MACRO_BAR_CLASSES.carbs },
  { key: 'fat' as const, label: 'Жир', className: MACRO_BAR_CLASSES.fat },
  { key: 'protein' as const, label: 'Белки', className: MACRO_BAR_CLASSES.protein },
];

function barHeightKcal(point: DailyCaloriePoint): number {
  const fromMacros = macroCalories(point).total;
  if (fromMacros > 0) return fromMacros;
  return point.calories;
}

interface ChartWeekPanelProps {
  series: DailyCaloriePoint[];
  rangeLabel: string;
  periodAverage: number | null;
  axisKind: 'weekday' | 'dayRange';
  goalKcal?: number;
  interactive: boolean;
  reduceMotion: boolean | null;
}

function ChartWeekPanel({
  series,
  rangeLabel,
  periodAverage,
  axisKind,
  goalKcal,
  interactive,
  reduceMotion,
}: ChartWeekPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex(null);
  }, [series[0]?.date.toISOString(), series[0]?.endDate?.toISOString()]);

  const dataMax = Math.max(0, ...series.map(barHeightKcal));
  const chartMax = niceChartMax(dataMax, goalKcal);
  const ticks = chartTicks(chartMax);
  const average = periodAverage ?? averageLoggedCalories(series);

  const selected =
    selectedIndex !== null ? series[selectedIndex] : undefined;
  const selectedMacros = selected ? macroCalories(selected) : null;
  const selectedLabel = selected
    ? axisKind === 'dayRange'
      ? formatCompactDayRange(selected.date, selected.endDate ?? selected.date)
      : formatDayLabel(selected.date)
    : '';

  const summaryLine = selected
    ? `${formatCalories(selected.calories)} · ${selectedLabel}`
    : average !== null
      ? `${Math.round(average)} ккал · среднее за день`
      : 'Нет данных за период';

  const goalTopPct =
    goalKcal && goalKcal > 0
      ? Math.min(100, Math.max(0, ((chartMax - goalKcal) / chartMax) * 100))
      : null;

  return (
    <div className="flex h-full flex-col px-4 py-4">
      <header className="mb-4 space-y-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Калории
        </h2>
        <p className="text-xs text-muted-foreground">{rangeLabel}</p>
        <p className="text-sm font-medium tabular-nums text-foreground/90">
          {summaryLine}
        </p>
        {selected && selectedMacros && selectedMacros.total > 0 && (
          <p className="text-xs tabular-nums text-muted-foreground">
            Б {formatMacro(selected.protein)} · Ж {formatMacro(selected.fat)} · У{' '}
            {formatMacro(selected.carbs)}
          </p>
        )}
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-hidden>
        {STACK.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${seg.className}`} />
            <span className="text-[11px] text-muted-foreground">{seg.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2" role="img" aria-label={summaryLine}>
        <div
          className="relative flex w-9 shrink-0 flex-col justify-between pb-6 text-right"
          style={{ height: PLOT_HEIGHT + 24 }}
          aria-hidden
        >
          {[...ticks].reverse().map((tick) => (
            <span
              key={tick}
              className="text-[10px] leading-none tabular-nums text-muted-foreground"
            >
              {tick >= 1000
                ? `${(tick / 1000).toFixed(tick % 1000 === 0 ? 0 : 1)}k`
                : tick}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="relative" style={{ height: PLOT_HEIGHT }}>
            {ticks.map((tick) => {
              const top = ((chartMax - tick) / chartMax) * 100;
              return (
                <div
                  key={tick}
                  className="pointer-events-none absolute inset-x-0 border-t border-border/60"
                  style={{ top: `${top}%` }}
                  aria-hidden
                />
              );
            })}

            {goalTopPct !== null && (
              <div
                className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-foreground/35"
                style={{ top: `${goalTopPct}%` }}
                title={`Цель: ${Math.round(goalKcal!)} ккал`}
                aria-hidden
              />
            )}

            <div className="absolute inset-0 z-20 flex items-end justify-between gap-1 px-0.5">
              {series.map((point, index) => {
                const macros = macroCalories(point);
                const heightKcal = barHeightKcal(point);
                const heightPct =
                  chartMax === 0 || heightKcal <= 0
                    ? 0
                    : Math.max(2.5, (heightKcal / chartMax) * 100);
                const isSelected = selectedIndex === index;
                const hasStack = macros.total > 0;

                return (
                  <button
                    key={point.date.toISOString()}
                    type="button"
                    disabled={!interactive}
                    className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none"
                    onClick={() =>
                      setSelectedIndex((prev) =>
                        prev === index ? null : index,
                      )
                    }
                    aria-label={`${axisKind === 'dayRange' ? calorieBarRangeLabel(point) : formatDayLabel(point.date)}: ${formatCalories(point.calories)}, белки ${formatMacro(point.protein)}, жир ${formatMacro(point.fat)}, углеводы ${formatMacro(point.carbs)}`}
                    aria-pressed={isSelected}
                  >
                    <div className="relative flex h-full w-full items-end justify-center">
                      {heightKcal > 0 ? (
                        <motion.div
                          className={`flex w-[55%] min-w-[10px] origin-bottom flex-col-reverse overflow-hidden rounded-full ${
                            axisKind === 'dayRange' ? 'max-w-[40px]' : 'max-w-[28px]'
                          } ${
                            isSelected
                              ? 'ring-2 ring-primary/35 ring-offset-1 ring-offset-card'
                              : ''
                          }`}
                          initial={
                            reduceMotion || !interactive
                              ? false
                              : { height: '0%', opacity: 0.4 }
                          }
                          animate={{ height: `${heightPct}%`, opacity: 1 }}
                          transition={
                            reduceMotion || !interactive
                              ? { duration: 0 }
                              : {
                                  type: 'spring',
                                  stiffness: 140,
                                  damping: 20,
                                  delay: index * 0.045,
                                }
                          }
                          title={formatCalories(point.calories)}
                        >
                          {hasStack ? (
                            STACK.map((seg) => {
                              const segKcal = macros[seg.key];
                              if (segKcal <= 0) return null;
                              const flexGrow = segKcal / macros.total;
                              return (
                                <div
                                  key={seg.key}
                                  className={`w-full min-h-[2px] ${seg.className}`}
                                  style={{ flex: `${flexGrow} 1 0` }}
                                />
                              );
                            })
                          ) : (
                            <div className="h-full w-full bg-gradient-to-t from-primary to-primary/55" />
                          )}
                        </motion.div>
                      ) : (
                        <div
                          className={`h-1 w-[55%] min-w-[10px] rounded-full bg-muted ${
                            axisKind === 'dayRange' ? 'max-w-[40px]' : 'max-w-[28px]'
                          }`}
                          aria-hidden
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex justify-between gap-1 px-0.5">
            {series.map((point, index) => (
              <span
                key={point.date.toISOString()}
                className={`min-w-0 flex-1 text-center text-[10px] font-medium ${
                  axisKind === 'dayRange'
                    ? 'tracking-normal'
                    : 'uppercase tracking-wide'
                } ${
                  selectedIndex === index
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {axisKind === 'dayRange'
                  ? calorieBarRangeLabel(point)
                  : formatDayLabel(point.date)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {goalKcal != null && goalKcal > 0 && (
        <p className="mt-4 text-[11px] text-muted-foreground">
          Пунктир — дневная цель · {Math.round(goalKcal)} ккал
        </p>
      )}
    </div>
  );
}

function seriesForOffset(
  meals: Meal[],
  period: StatsPeriod,
  offset: number,
): {
  series: DailyCaloriePoint[];
  rangeLabel: string;
  periodAverage: number | null;
} {
  if (period === 'month') {
    const month = getMonthlyCalorieSeries(meals, offset);
    return {
      series: month.weeks,
      rangeLabel: formatMonthLabel(month.monthStart),
      periodAverage: month.dailyAverage,
    };
  }
  const series = getWeeklyCalorieSeries(meals, offset);
  return {
    series,
    rangeLabel:
      series.length >= 2
        ? formatDateRangeLabel(series[0].date, series[series.length - 1].date)
        : '',
    periodAverage: averageLoggedCalories(series),
  };
}

export function WeeklyCaloriesChart({
  meals,
  period,
  offset,
  onOffsetChange,
  goalKcal,
}: WeeklyCaloriesChartProps) {
  const reduceMotion = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  function recenter() {
    const slotWidth = viewportRef.current?.getBoundingClientRect().width ?? 0;
    if (!slotWidth) return;
    x.set(-slotWidth);
  }

  useLayoutEffect(() => {
    recenter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, period]);

  useEffect(() => {
    window.addEventListener('resize', recenter);
    return () => window.removeEventListener('resize', recenter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    const slotWidth = viewportRef.current?.getBoundingClientRect().width ?? 0;
    if (!slotWidth) return;

    if (
      info.offset.x < -SWIPE_OFFSET_THRESHOLD ||
      info.velocity.x < -SWIPE_VELOCITY_THRESHOLD
    ) {
      animate(x, -2 * slotWidth, {
        type: 'tween',
        duration: 0.2,
        ease: 'easeOut',
      }).then(() => {
        onOffsetChange(1);
      });
    } else if (
      info.offset.x > SWIPE_OFFSET_THRESHOLD ||
      info.velocity.x > SWIPE_VELOCITY_THRESHOLD
    ) {
      animate(x, 0, {
        type: 'tween',
        duration: 0.2,
        ease: 'easeOut',
      }).then(() => {
        onOffsetChange(-1);
      });
    } else {
      animate(x, -slotWidth, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }

  const offsets = [offset - 1, offset, offset + 1];
  const swipeLabel =
    period === 'month'
      ? 'Калории по месяцам, свайп для смены месяца'
      : 'Калории по неделям, свайп для смены недели';

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
      aria-label={swipeLabel}
    >
      <div
        ref={viewportRef}
        data-testid="stats-week-chart-viewport"
        className="touch-pan-y overscroll-x-contain overflow-hidden"
      >
        <motion.div
          drag="x"
          style={{ x, width: '300%' }}
          dragConstraints={viewportRef}
          dragElastic={0.15}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          className="flex cursor-grab select-none active:cursor-grabbing"
        >
          {offsets.map((panelOffset, i) => {
            const panel = seriesForOffset(meals, period, panelOffset);
            const isCurrent = i === 1;

            return (
              <div
                key={`${period}-${['prev', 'current', 'next'][i]}`}
                className="shrink-0"
                style={{ width: '33.3333%' }}
                aria-hidden={!isCurrent}
              >
                <ChartWeekPanel
                  series={panel.series}
                  rangeLabel={panel.rangeLabel}
                  periodAverage={panel.periodAverage}
                  axisKind={period === 'month' ? 'dayRange' : 'weekday'}
                  goalKcal={goalKcal}
                  interactive={isCurrent}
                  reduceMotion={reduceMotion}
                />
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
