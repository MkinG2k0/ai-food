import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type PanInfo,
} from 'framer-motion';
import type { Meal, MicronutrientEstimate } from '@ai-food/shared-types';
import {
  formatMicronutrientUnit,
  MICRONUTRIENT_LABELS,
} from '@/entities/nutrition';
import { defaultMicronutrientTargets } from '@/features/onboarding';
import { formatDateRangeLabel } from '../model/chartScale';
import { getWeeklyCalorieSeries } from '../model/getWeeklyCalorieSeries';
import {
  getWeeklyMicronutrientSeries,
  weekHasMicronutrientData,
} from '../model/getWeeklyMicronutrientSeries';

interface WeeklyMicronutrientsChartProps {
  meals: Meal[];
  weekOffset: number;
  onWeekChange: (delta: 1 | -1) => void;
  micronutrientTargets?: MicronutrientEstimate[] | null;
}

const SWIPE_OFFSET_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 500;
/** Visual bar cap: 150% of daily norm */
const PROGRESS_CAP = 1.5;

function formatAmount(amount: number): string {
  if (amount === 0) return '0';
  if (amount >= 100) return String(Math.round(amount));
  if (Number.isInteger(amount)) return String(amount);
  return amount < 10
    ? amount.toFixed(1).replace(/\.0$/, '')
    : String(Math.round(amount * 10) / 10);
}

function resolveNorms(
  targets: MicronutrientEstimate[] | null | undefined,
): Map<string, MicronutrientEstimate> {
  const source =
    targets && targets.length > 0 ? targets : defaultMicronutrientTargets();
  return new Map(source.map((t) => [t.id, t]));
}

function progressWidthPct(dailyAvg: number, normAmount: number): number {
  if (normAmount <= 0) return 0;
  const ratio = Math.min(dailyAvg / normAmount, PROGRESS_CAP);
  return Math.max(0, (ratio / PROGRESS_CAP) * 100);
}

interface MicronutrientWeekPanelProps {
  meals: Meal[];
  weekOffset: number;
  interactive: boolean;
  reduceMotion: boolean | null;
  micronutrientTargets?: MicronutrientEstimate[] | null;
}

function MicronutrientWeekPanel({
  meals,
  weekOffset,
  interactive,
  reduceMotion,
  micronutrientTargets,
}: MicronutrientWeekPanelProps) {
  const series = getWeeklyMicronutrientSeries(meals, weekOffset);
  const calorieDays = getWeeklyCalorieSeries(meals, weekOffset);
  const hasData = weekHasMicronutrientData(series);
  const norms = resolveNorms(micronutrientTargets);
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
            ср. / день
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{rangeLabel}</p>
        <p className="text-sm text-foreground/90">
          {hasData
            ? 'Среднесуточное потребление относительно дневной нормы'
            : 'Нет данных за неделю — появятся после анализа фото'}
        </p>
      </header>

      <ul className="space-y-3" role="list">
        {series.map((point, index) => {
          const norm = norms.get(point.id);
          const normAmount = norm?.amount ?? 0;
          const unitLabel = formatMicronutrientUnit(point.unit);
          const ratio = normAmount > 0 ? point.dailyAvg / normAmount : 0;
          const widthPct = hasData ? progressWidthPct(point.dailyAvg, normAmount) : 0;
          const pctLabel = normAmount > 0 ? Math.round(ratio * 100) : 0;

          return (
            <li key={point.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-foreground">
                  {MICRONUTRIENT_LABELS[point.id]}
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {normAmount > 0
                    ? `${formatAmount(point.dailyAvg)} / ${formatAmount(normAmount)} ${unitLabel} · ${pctLabel}%`
                    : '—'}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                {hasData && widthPct > 0 ? (
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
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
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-[11px] text-muted-foreground">
        Оценка по фото, не медицинская рекомендация
      </p>
    </div>
  );
}

export function WeeklyMicronutrientsChart({
  meals,
  weekOffset,
  onWeekChange,
  micronutrientTargets,
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
                  micronutrientTargets={micronutrientTargets}
                />
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

