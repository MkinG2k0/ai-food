import { forwardRef } from 'react';
import type { NutritionReportData } from '../model/buildReportData';

function progressPct(value: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((value / goal) * 100));
}

function deltaLabel(value: number, goal: number): string {
  if (goal <= 0) return '—';
  const delta = Math.round(((value - goal) / goal) * 100);
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}%`;
}

function profileSummary(data: NutritionReportData): string {
  const { profile, weight } = data;
  if (!profile) return 'Профиль не заполнен';
  const chunks = [
    `${profile.age} года`,
    `${profile.height} см`,
    `${weight.currentKg ?? profile.weight} кг`,
  ];
  if (weight.goalKg != null) {
    chunks.push(`цель ${weight.goalKg} кг`);
    if (weight.deltaToGoal != null) {
      const sign = weight.deltaToGoal > 0 ? '+' : '';
      chunks.push(`${sign}${weight.deltaToGoal.toFixed(1)} кг до цели`);
    }
  }
  return chunks.join(' · ');
}

const METRICS = [
  { key: 'kcal', label: 'Калории', unit: 'ккал', color: 'bg-emerald-500' },
  { key: 'protein', label: 'Белки', unit: 'г', color: 'bg-sky-500' },
  { key: 'fat', label: 'Жиры', unit: 'г', color: 'bg-rose-500' },
  { key: 'carbs', label: 'Углеводы', unit: 'г', color: 'bg-amber-500' },
  { key: 'fiber', label: 'Клетчатка', unit: 'г', color: 'bg-lime-600' },
] as const;

export interface NutritionReportDocumentProps {
  data: NutritionReportData;
}

export const NutritionReportDocument = forwardRef<
  HTMLDivElement,
  NutritionReportDocumentProps
>(function NutritionReportDocument({ data }, ref) {
  const { summary, weight } = data;

  const metricValues = {
    kcal: { value: summary.avgKcal, goal: summary.goalKcal },
    protein: { value: summary.avgProtein, goal: summary.goalProtein },
    fat: { value: summary.avgFat, goal: summary.goalFat },
    carbs: { value: summary.avgCarbs, goal: summary.goalCarbs },
    fiber: { value: summary.avgFiber, goal: summary.goalFiber },
  };

  return (
    <div
      ref={ref}
      className="mx-auto w-full max-w-[680px] bg-white text-neutral-900"
      data-report-root
    >
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-[#30ad54] to-[#248a43] px-6 py-6 text-white">
          <p className="text-sm font-semibold tracking-wide opacity-90">
            {data.appName}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Отчёт о питании
          </h1>
          <p className="mt-2 text-sm opacity-90">{data.periodRange}</p>
          <p className="mt-3 text-xs leading-relaxed opacity-80">
            {profileSummary(data)}
          </p>
        </div>

        <div className="space-y-6 px-5 py-5">
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Период
            </p>
            <p className="mt-1 text-sm font-medium">{data.periodRange}</p>
            <p className="text-sm text-neutral-500">
              {summary.dayCount} дн. · {summary.mealCount} приёмов пищи
            </p>
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  Сводка за период
                </p>
                <p className="text-sm text-neutral-500">среднее за день</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {METRICS.map(({ key, label, unit, color }) => {
                const { value, goal } = metricValues[key];
                const pct = progressPct(value, goal);
                return (
                  <div
                    key={key}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 p-3"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                      {label}
                    </p>
                    <p className="mt-1 text-xl font-bold tabular-nums">
                      {value}{' '}
                      <span className="text-sm font-medium text-neutral-500">
                        {unit}
                      </span>
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className={`h-full rounded-full ${color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] text-neutral-500">
                      <span>цель {goal}</span>
                      <span>{deltaLabel(value, goal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Динамика веса
            </p>
            {weight.goalKg != null ? (
              <p className="mt-1 text-sm text-neutral-600">
                Цель {weight.goalKg} кг
              </p>
            ) : null}
            {weight.periodStartKg != null && weight.periodEndKg != null ? (
              <p className="mt-2 text-lg font-semibold tabular-nums">
                {weight.periodStartKg} кг → {weight.periodEndKg} кг
              </p>
            ) : weight.currentKg != null ? (
              <p className="mt-2 text-lg font-semibold tabular-nums">
                {weight.currentKg} кг
              </p>
            ) : (
              <p className="mt-2 text-sm text-neutral-500">Нет записей</p>
            )}
          </section>

          <section className="report-diary">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Дневник питания
            </p>
            <div className="space-y-4">
              {data.days.map((day) => (
                <div
                  key={`${day.dayLabel}-${day.dateLabel}`}
                  className="overflow-hidden rounded-xl border border-neutral-200"
                >
                  <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                    <p className="text-sm font-semibold">
                      {day.dayLabel} {day.dateLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {day.kcal} / {day.goalKcal} ккал · Б {day.protein} · Ж{' '}
                      {day.fat} · У {day.carbs}
                      {day.fiber > 0 ? ` · Кл ${day.fiber} г` : ''}
                    </p>
                  </div>
                  {day.meals.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-neutral-500">
                      Нет записей
                    </p>
                  ) : (
                    <ul className="divide-y divide-neutral-100">
                      {day.meals.map((meal, index) => (
                        <li
                          key={`${meal.time}-${index}`}
                          className="flex gap-3 px-4 py-3"
                        >
                          <span className="w-11 shrink-0 pt-0.5 text-xs tabular-nums text-neutral-500">
                            {meal.time}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug">
                              {meal.name}
                            </p>
                            <p className="mt-0.5 text-xs text-neutral-500">
                              Б {meal.protein} · Ж {meal.fat} · У {meal.carbs}
                              {meal.fiber > 0 ? ` · Кл ${meal.fiber} г` : ''} ·{' '}
                              {meal.kcal} ккал
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          <p className="border-t border-neutral-200 pt-4 text-center text-[10px] text-neutral-400">
            {data.appName} · {data.periodRange}
          </p>
        </div>
      </div>
    </div>
  );
});
