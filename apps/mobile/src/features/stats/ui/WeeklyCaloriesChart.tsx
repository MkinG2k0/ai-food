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
import {
  getWeeklyCalorieSeries,
  macroCalories,
  type DailyCaloriePoint,
} from '../model/getWeeklyCalorieSeries';
import {
  averageLoggedCalories,
  chartTicks,
  formatDateRangeLabel,
  niceChartMax,
} from '../model/chartScale';

interface WeeklyCaloriesChartProps {
  meals: Meal[];
  weekOffset: number;
  onWeekChange: (delta: 1 | -1) => void;
  goalKcal?: number;
}

const PLOT_HEIGHT = 200;
const SWIPE_OFFSET_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 500;

/** Stack order bottom → top (same hue language as home macros). */
const STACK = [
  { key: 'carbs' as const, label: 'Углеводы', className: 'bg-sky-500' },
  { key: 'fat' as const, label: 'Жир', className: 'bg-amber-400' },
  { key: 'protein' as const, label: 'Белки', className: 'bg-rose-400' },
];

function barHeightKcal(point: DailyCaloriePoint): number {
  const fromMacros = macroCalories(point).total;
  if (fromMacros > 0) return fromMacros;
  return point.calories;
}

interface ChartWeekPanelProps {
  series: DailyCaloriePoint[];
  goalKcal?: number;
  interactive: boolean;
  reduceMotion: boolean | null;
}

function ChartWeekPanel({
  series,
  goalKcal,
  interactive,
  reduceMotion,
}: ChartWeekPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex(null);
  }, [series[0]?.date.toISOString()]);

  const dataMax = Math.max(0, ...series.map(barHeightKcal));
  const chartMax = niceChartMax(dataMax, goalKcal);
  const ticks = chartTicks(chartMax);
  const average = averageLoggedCalories(series);
  const rangeLabel =
    series.length >= 2
      ? formatDateRangeLabel(series[0].date, series[series.length - 1].date)
      : '';

  const selected =
    selectedIndex !== null ? series[selectedIndex] : undefined;
  const selectedMacros = selected ? macroCalories(selected) : null;

  const summaryLine = selected
    ? `${formatCalories(selected.calories)} · ${formatDayLabel(selected.date)}`
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
                    aria-label={`${formatDayLabel(point.date)}: ${formatCalories(point.calories)}, белки ${formatMacro(point.protein)}, жир ${formatMacro(point.fat)}, углеводы ${formatMacro(point.carbs)}`}
                    aria-pressed={isSelected}
                  >
                    <div className="relative flex h-full w-full items-end justify-center">
                      {heightKcal > 0 ? (
                        <motion.div
                          className={`flex w-[55%] min-w-[10px] max-w-[28px] origin-bottom flex-col-reverse overflow-hidden rounded-full ${
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
                          className="h-1 w-[55%] min-w-[10px] max-w-[28px] rounded-full bg-muted"
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
                className={`min-w-0 flex-1 text-center text-[10px] font-medium uppercase tracking-wide ${
                  selectedIndex === index
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {formatDayLabel(point.date)}
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

export function WeeklyCaloriesChart({
  meals,
  weekOffset,
  onWeekChange,
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
  }, [weekOffset]);

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
        onWeekChange(1);
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
        onWeekChange(-1);
      });
    } else {
      animate(x, -slotWidth, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }

  const weekOffsets = [weekOffset - 1, weekOffset, weekOffset + 1];

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
      aria-label="Калории по неделям, свайп для смены недели"
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
          {weekOffsets.map((offset, i) => {
            const series = getWeeklyCalorieSeries(meals, offset);
            const isCurrent = i === 1;

            return (
              <div
                key={['prev', 'current', 'next'][i]}
                className="shrink-0"
                style={{ width: '33.3333%' }}
                aria-hidden={!isCurrent}
              >
                <ChartWeekPanel
                  series={series}
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
