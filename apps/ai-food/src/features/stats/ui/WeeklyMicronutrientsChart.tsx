import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type PanInfo,
} from 'framer-motion';
import { Settings2 } from 'lucide-react';
import type { Meal, MicronutrientEstimate, MicronutrientId } from '@ai-food/shared-types';
import {
  formatMicronutrientUnit,
  getMicronutrientStatus,
  isMineralMicronutrient,
  isVitaminMicronutrient,
  MICRONUTRIENT_LABELS,
} from '@/entities/nutrition';
import { defaultMicronutrientTargets } from '@/features/onboarding';
import { useSettingsStore } from '@/features/settings';
import { Button } from '@/shared/ui';
import { formatDateRangeLabel, formatMonthLabel } from '../model/chartScale';
import { getWeeklyCalorieSeries } from '../model/getWeeklyCalorieSeries';
import {
  getWeeklyMicronutrientSeries,
  weekHasMicronutrientData,
  type MicronutrientWeekPoint,
} from '../model/getWeeklyMicronutrientSeries';
import { getMonthlyMicronutrientSeries } from '../model/getMonthlyMicronutrientSeries';
import { monthStartFor, type StatsPeriod } from '../model/monthPeriod';
import { MicronutrientVisibilitySheet } from './MicronutrientVisibilitySheet';

interface WeeklyMicronutrientsChartProps {
  meals: Meal[];
  period: StatsPeriod;
  offset: number;
  onOffsetChange: (delta: 1 | -1) => void;
  micronutrientTargets?: MicronutrientEstimate[] | null;
}

const SWIPE_OFFSET_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 500;
/** Visual bar cap: 150% of daily norm */
const PROGRESS_CAP = 1.5;
/** 100% of daily norm as % of bar width (cap = 150%) */
const NORM_MARKER_PCT = (1 / PROGRESS_CAP) * 100;

function statusPillClass(band: ReturnType<typeof getMicronutrientStatus>['band']): string {
  switch (band) {
    case 'severe_deficit':
      return 'bg-red-50 text-red-700';
    case 'below_norm':
      return 'bg-amber-50 text-amber-800';
    case 'optimal':
      return 'bg-emerald-50 text-emerald-800';
    case 'surplus':
      return 'bg-violet-50 text-violet-800';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

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

function splitSeriesGroups(
  series: MicronutrientWeekPoint[],
  showAll: boolean,
  preferredIds: ReadonlySet<MicronutrientId>,
): {
  vitamins: MicronutrientWeekPoint[];
  minerals: MicronutrientWeekPoint[];
} {
  const visible = showAll
    ? series
    : series.filter((p) => preferredIds.has(p.id));
  return {
    vitamins: visible.filter((p) => isVitaminMicronutrient(p.id)),
    minerals: visible.filter((p) => isMineralMicronutrient(p.id)),
  };
}

interface MicronutrientWeekPanelProps {
  meals: Meal[];
  period: StatsPeriod;
  offset: number;
  interactive: boolean;
  reduceMotion: boolean | null;
  micronutrientTargets?: MicronutrientEstimate[] | null;
  showAll: boolean;
  preferredIds: ReadonlySet<MicronutrientId>;
  onToggleShowAll: () => void;
  onOpenSettings: () => void;
}

function MicronutrientRow({
  point,
  norms,
  periodHasAnyData,
  interactive,
  reduceMotion,
  index,
}: {
  point: MicronutrientWeekPoint;
  norms: Map<string, MicronutrientEstimate>;
  periodHasAnyData: boolean;
  interactive: boolean;
  reduceMotion: boolean | null;
  index: number;
}) {
  const norm = norms.get(point.id);
  const normAmount = norm?.amount ?? 0;
  const unitLabel = formatMicronutrientUnit(point.unit);
  const rowHasData = point.hasData;
  const ratio =
    rowHasData && normAmount > 0 ? point.dailyAvg / normAmount : null;
  const status = getMicronutrientStatus(ratio);
  const widthPct =
    rowHasData && normAmount > 0
      ? progressWidthPct(point.dailyAvg, normAmount)
      : 0;
  const pctLabel =
    ratio != null ? Math.round(ratio * 100) : null;

  return (
    <li key={point.id} className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-medium text-foreground">
            {MICRONUTRIENT_LABELS[point.id as MicronutrientId]}
          </span>
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${statusPillClass(status.band)}`}
          >
            {status.labelRu}
          </span>
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
          {pctLabel != null ? `${pctLabel}%` : '—'}
        </span>
      </div>

      <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
        {/* Optimal band 80–120% of norm within the 150% scale */}
        {normAmount > 0 ? (
          <div
            className="pointer-events-none absolute inset-y-0 bg-emerald-500/10"
            style={{
              left: `${(0.8 / PROGRESS_CAP) * 100}%`,
              width: `${(0.4 / PROGRESS_CAP) * 100}%`,
            }}
            aria-hidden
          />
        ) : null}
        {periodHasAnyData && rowHasData && widthPct > 0 ? (
          <motion.div
            className={`relative z-[1] h-full rounded-full ${status.barClass}`}
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
                    delay: index * 0.02,
                  }
            }
          />
        ) : null}
        {normAmount > 0 ? (
          <div
            className="pointer-events-none absolute inset-y-0 z-[2] w-px bg-foreground/35"
            style={{ left: `${NORM_MARKER_PCT}%` }}
            aria-hidden
            title="Дневная норма"
          />
        ) : null}
      </div>

      {rowHasData && normAmount > 0 ? (
        <p className="text-[10px] tabular-nums text-muted-foreground">
          {formatAmount(point.dailyAvg)} / {formatAmount(normAmount)} {unitLabel}
        </p>
      ) : null}
    </li>
  );
}

function MicronutrientWeekPanel({
  meals,
  period,
  offset,
  interactive,
  reduceMotion,
  micronutrientTargets,
  showAll,
  preferredIds,
  onToggleShowAll,
  onOpenSettings,
}: MicronutrientWeekPanelProps) {
  const series =
    period === 'month'
      ? getMonthlyMicronutrientSeries(meals, offset)
      : getWeeklyMicronutrientSeries(meals, offset);
  const hasData = weekHasMicronutrientData(series);
  const norms = resolveNorms(micronutrientTargets);
  const { vitamins, minerals } = splitSeriesGroups(series, showAll, preferredIds);
  const rangeLabel =
    period === 'month'
      ? formatMonthLabel(monthStartFor(new Date(), offset))
      : (() => {
          const calorieDays = getWeeklyCalorieSeries(meals, offset);
          return calorieDays.length >= 2
            ? formatDateRangeLabel(
                calorieDays[0].date,
                calorieDays[calorieDays.length - 1].date,
              )
            : '';
        })();
  const emptyCopy =
    period === 'month'
      ? 'Нет данных за месяц — появятся после анализа фото'
      : 'Нет данных за неделю — появятся после анализа фото';

  let rowIndex = 0;

  return (
    <div className="flex h-full flex-col px-4 py-4">
      <header className="mb-4 space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Витамины и минералы
          </h2>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            ср. / день
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{rangeLabel}</p>
        <p className="text-sm text-foreground/90">
          {hasData
            ? 'Среднесуточное потребление относительно дневной нормы'
            : emptyCopy}
        </p>
      </header>

      <div className="space-y-5">
        {vitamins.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Витамины
            </h3>
            <ul className="space-y-3" role="list">
              {vitamins.map((point) => {
                const index = rowIndex++;
                return (
                  <MicronutrientRow
                    key={point.id}
                    point={point}
                    norms={norms}
                    periodHasAnyData={hasData}
                    interactive={interactive}
                    reduceMotion={reduceMotion}
                    index={index}
                  />
                );
              })}
            </ul>
          </section>
        ) : null}

        {minerals.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Минералы
            </h3>
            <ul className="space-y-3" role="list">
              {minerals.map((point) => {
                const index = rowIndex++;
                return (
                  <MicronutrientRow
                    key={point.id}
                    point={point}
                    norms={norms}
                    periodHasAnyData={hasData}
                    interactive={interactive}
                    reduceMotion={reduceMotion}
                    index={index}
                  />
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto flex-1 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={onToggleShowAll}
          onPointerDown={(e) => e.stopPropagation()}
          data-testid="stats-micronutrients-toggle-all"
        >
          {showAll ? 'Свернуть' : 'Посмотреть все'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto shrink-0 gap-1.5 px-2.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={onOpenSettings}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Настройка списка витаминов"
          data-testid="stats-micronutrients-settings"
        >
          <Settings2 className="size-3.5" aria-hidden />
          Настройка
        </Button>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Оценка по фото, не медицинская рекомендация
      </p>
    </div>
  );
}

export function WeeklyMicronutrientsChart({
  meals,
  period,
  offset,
  onOffsetChange,
  micronutrientTargets,
}: WeeklyMicronutrientsChartProps) {
  const reduceMotion = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [showAll, setShowAll] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const statsMicronutrientIds = useSettingsStore((s) => s.statsMicronutrientIds);
  const preferredIds = new Set(statsMicronutrientIds);

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
      ? 'Витамины по месяцам, свайп для смены месяца'
      : 'Витамины по неделям, свайп для смены недели';

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
      aria-label={swipeLabel}
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
          {offsets.map((panelOffset, i) => {
            const isCurrent = i === 1;

            return (
              <div
                key={`${period}-${['prev', 'current', 'next'][i]}`}
                className="shrink-0"
                style={{ width: '33.3333%' }}
                aria-hidden={!isCurrent}
              >
                <MicronutrientWeekPanel
                  meals={meals}
                  period={period}
                  offset={panelOffset}
                  interactive={isCurrent}
                  reduceMotion={reduceMotion}
                  micronutrientTargets={micronutrientTargets}
                  showAll={showAll}
                  preferredIds={preferredIds}
                  onToggleShowAll={() => setShowAll((v) => !v)}
                  onOpenSettings={() => setSettingsOpen(true)}
                />
              </div>
            );
          })}
        </motion.div>
      </div>
      <MicronutrientVisibilitySheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </section>
  );
}
