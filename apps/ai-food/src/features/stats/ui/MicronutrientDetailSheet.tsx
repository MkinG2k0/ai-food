import { useNavigate } from 'react-router-dom';
import { ChevronRight, Utensils } from 'lucide-react';
import type {
  Meal,
  MicronutrientEstimate,
  MicronutrientId,
} from '@ai-food/shared-types';
import { MICRONUTRIENT_UNITS } from '@ai-food/shared-types';
import {
  formatMicronutrientUnit,
  getMicronutrientInfo,
  getMicronutrientStatus,
  MICRONUTRIENT_LABELS,
} from '@/entities/nutrition';
import { mealDisplayName, useMealImage } from '@/entities/meal';
import { BottomSheet } from '@/shared/ui';
import { getRecentMealsWithMicronutrient } from '../model/getRecentMealsWithMicronutrient';

/** Same scale as WeeklyMicronutrientsChart rows */
const PROGRESS_CAP = 1.5;
const NORM_MARKER_PCT = (1 / PROGRESS_CAP) * 100;

export interface MicronutrientDetailSheetProps {
  open: boolean;
  onClose: () => void;
  nutrientId: MicronutrientId | null;
  meals: Meal[];
  dailyAvg?: number | null;
  norm?: MicronutrientEstimate | null;
}

function formatAmount(amount: number): string {
  if (amount === 0) return '0';
  if (amount >= 100) return String(Math.round(amount));
  if (Number.isInteger(amount)) return String(amount);
  return amount < 10
    ? amount.toFixed(1).replace(/\.0$/, '')
    : String(Math.round(amount * 10) / 10);
}

function formatMealWhen(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

function progressWidthPct(dailyAvg: number, normAmount: number): number {
  if (normAmount <= 0) return 0;
  const ratio = Math.min(dailyAvg / normAmount, PROGRESS_CAP);
  return Math.max(0, (ratio / PROGRESS_CAP) * 100);
}

function RecentMealRow({
  meal,
  amountLabel,
  onOpen,
}: {
  meal: Meal;
  amountLabel: string;
  onOpen: () => void;
}) {
  const imageSrc = useMealImage(meal.imageUri);
  const title = mealDisplayName(meal);

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition-colors hover:bg-muted/60 active:bg-muted"
      >
        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <Utensils className="size-4 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">
            {formatMealWhen(meal.timestamp)}
            <span className="mx-1.5 text-border">·</span>
            <span className="tabular-nums">{amountLabel}</span>
          </p>
        </div>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground/70"
          aria-hidden
        />
      </button>
    </li>
  );
}

export function MicronutrientDetailSheet({
  open,
  onClose,
  nutrientId,
  meals,
  dailyAvg,
  norm,
}: MicronutrientDetailSheetProps) {
  const navigate = useNavigate();

  if (!nutrientId) return null;

  const info = getMicronutrientInfo(nutrientId);
  const label = MICRONUTRIENT_LABELS[nutrientId];
  const unitLabel = formatMicronutrientUnit(
    norm?.unit ?? MICRONUTRIENT_UNITS[nutrientId],
  );
  const recent = getRecentMealsWithMicronutrient(meals, nutrientId, 3);
  const normAmount = norm?.amount ?? 0;
  const hasProgress = dailyAvg != null && dailyAvg > 0 && normAmount > 0;
  const ratio = hasProgress ? dailyAvg / normAmount : null;
  const status = getMicronutrientStatus(ratio);
  const widthPct = hasProgress ? progressWidthPct(dailyAvg, normAmount) : 0;
  const pctLabel = ratio != null ? Math.round(ratio * 100) : null;

  function openMeal(mealId: string) {
    onClose();
    navigate(`/meal/${mealId}`);
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      className="max-h-[85dvh] pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.25rem))]"
    >
      <div
        className="flex max-h-[calc(85dvh-3rem)] flex-col gap-5 overflow-y-auto overscroll-contain"
        data-testid="micronutrient-detail-sheet"
      >
        <header className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <h2 className="truncate text-lg font-semibold text-foreground">
                  {label}
                </h2>
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${statusPillClass(status.band)}`}
                >
                  {status.labelRu}
                </span>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {pctLabel != null ? `${pctLabel}%` : '—'}
              </span>
            </div>

            <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
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
              {widthPct > 0 ? (
                <div
                  className={`relative z-[1] h-full rounded-full ${status.barClass}`}
                  style={{ width: `${widthPct}%` }}
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

            {hasProgress ? (
              <p className="text-[10px] tabular-nums text-muted-foreground">
                {formatAmount(dailyAvg)} / {formatAmount(normAmount)} {unitLabel}
              </p>
            ) : null}
          </div>

          <p className="text-sm leading-relaxed text-foreground/90">
            {info.summary}
          </p>
        </header>

        <section className="space-y-1.5">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            За что отвечает
          </h3>
          <p className="text-sm leading-relaxed text-foreground/90">
            {info.functions}
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Где содержится
          </h3>
          <p className="text-sm leading-relaxed text-foreground/90">
            {info.sources}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Последние блюда
          </h3>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              За последний месяц нет приёмов с оценкой этого нутриента
            </p>
          ) : (
            <ul className="divide-y divide-border/60" role="list">
              {recent.map(({ meal, amount, unit }) => (
                <RecentMealRow
                  key={meal.id}
                  meal={meal}
                  amountLabel={`${formatAmount(amount)} ${formatMicronutrientUnit(unit)}`}
                  onOpen={() => openMeal(meal.id)}
                />
              ))}
            </ul>
          )}
        </section>

        <p className="text-[11px] text-muted-foreground">
          Оценка по фото, не медицинская рекомендация
        </p>
      </div>
    </BottomSheet>
  );
}
