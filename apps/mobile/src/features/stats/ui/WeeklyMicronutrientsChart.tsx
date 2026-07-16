import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type PanInfo,
} from 'framer-motion';
import type { Meal } from '@ai-food/shared-types';
import { MICRONUTRIENT_LABELS } from '@/entities/nutrition';
import { formatDateRangeLabel } from '../model/chartScale';
import { getWeeklyCalorieSeries } from '../model/getWeeklyCalorieSeries';
import {
  getWeeklyMicronutrientSeries,
  micronutrientWeekTotal,
  weekHasMicronutrientData,
  type MicronutrientWeekPoint,
} from '../model/getWeeklyMicronutrientSeries';

interface WeeklyMicronutrientsChartProps {
  meals: Meal[];
  weekOffset: number;
  onWeekChange: (delta: 1 | -1) => void;
}

const SWIPE_OFFSET_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 500;

const LEVEL_STACK = [
  { key: 'high' as const, label: 'Много', className: 'bg-emerald-500' },
  { key: 'medium' as const, label: 'Средне', className: 'bg-amber-400' },
  { key: 'low' as const, label: 'Мало', className: 'bg-slate-300' },
];

function maxTotal(series: MicronutrientWeekPoint[]): number {
  return Math.max(1, ...series.map(micronutrientWeekTotal));
}

interface MicronutrientWeekPanelProps {
  meals: Meal[];
  weekOffset: number;
  interactive: boolean;
  reduceMotion: boolean | null;
}

function MicronutrientWeekPanel({
  meals,
  weekOffset,
  interactive,
  reduceMotion,
}: MicronutrientWeekPanelProps) {
  const series = getWeeklyMicronutrientSeries(meals, weekOffset);
  const calorieDays = getWeeklyCalorieSeries(meals, weekOffset);
  const hasData = weekHasMicronutrientData(series);
  const ceiling = maxTotal(series);
  const rangeLabel =
    calorieDays.length >= 2
      ? formatDateRangeLabel(calorieDays[0].date, calorieDays[calorieDays.length - 1].date)
      : '';

  return (
    <div className="flex h-full flex-col px-4 py-4">
      <header className="mb-4 space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Витамины
          </h2>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            оценка
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{rangeLabel}</p>
        <p className="text-sm text-foreground/90">
          {hasData
            ? 'Сколько раз за неделю витамин был «много / средне / мало»'
            : 'Нет оценок за неделю — появятся после анализа фото'}
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-hidden>
        {LEVEL_STACK.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${seg.className}`} />
            <span className="text-[11px] text-muted-foreground">{seg.label}</span>
          </div>
        ))}
      </div>

      <ul className="space-y-3" role="list">
        {series.map((point, index) => {
          const total = micronutrientWeekTotal(point);
          const widthPct = hasData ? Math.max(4, (total / ceiling) * 100) : 0;

          return (
            <li key={point.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-foreground">
                  {MICRONUTRIENT_LABELS[point.id]}
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {total > 0
                    ? `М ${point.high} · С ${point.medium} · Мл ${point.low}`
                    : '—'}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                {total > 0 ? (
                  <motion.div
                    className="flex h-full overflow-hidden rounded-full"
                    initial={
                      reduceMotion || !interactive
                        ? false
                        : { width: 0, opacity: 0.5 }
                    }
                    animate={{ width: `${widthPct}%`, opacity: 1 }}
                    transition={
                      reduceMotion || !interactive
                        ? { duration: 0 }
                        : {
                            type: 'spring',
                            stiffness: 160,
                            damping: 22,
                            delay: index * 0.03,
                          }
                    }
                  >
                    {LEVEL_STACK.map((seg) => {
                      const count = point[seg.key];
                      if (count <= 0) return null;
                      return (
                        <div
                          key={seg.key}
                          className={`h-full min-w-[2px] ${seg.className}`}
                          style={{ flex: `${count} 1 0` }}
                          title={`${seg.label}: ${count}`}
                        />
                      );
                    })}
                  </motion.div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-[11px] text-muted-foreground">
        Качественная оценка по приёмам пищи · не мг и не медзаключение
      </p>
    </div>
  );
}

export function WeeklyMicronutrientsChart({
  meals,
  weekOffset,
  onWeekChange,
}: WeeklyMicronutrientsChartProps) {
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
      aria-label="Витамины по неделям, свайп для смены недели"
    >
      <div
        ref={viewportRef}
        data-testid="stats-micronutrients-week-viewport"
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
            const isCurrent = i === 1;

            return (
              <div
                key={['prev', 'current', 'next'][i]}
                className="shrink-0"
                style={{ width: '33.3333%' }}
                aria-hidden={!isCurrent}
              >
                <MicronutrientWeekPanel
                  meals={meals}
                  weekOffset={offset}
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
