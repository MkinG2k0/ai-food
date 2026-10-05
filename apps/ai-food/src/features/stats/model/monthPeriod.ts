export type StatsPeriod = 'week' | 'month' | 'quarter' | 'halfYear' | 'year';

export const STATS_PERIOD_OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: '3 месяца' },
  { value: 'halfYear', label: 'Полгода' },
  { value: 'year', label: 'Год' },
];

export const STATS_PERIOD_MONTHS: Record<
  Exclude<StatsPeriod, 'week'>,
  number
> = {
  month: 1,
  quarter: 3,
  halfYear: 6,
  year: 12,
};

/** First day of the first month in a rolling window that ends on the reference month. */
export function spanStartFor(
  referenceDate: Date,
  monthCount: number,
  spanOffset: number,
): Date {
  const endMonth = referenceDate.getMonth() + spanOffset * monthCount;
  const startMonth = endMonth - (monthCount - 1);
  const d = new Date(referenceDate.getFullYear(), startMonth, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function spanElapsedDays(
  spanStart: Date,
  monthCount: number,
  referenceDate: Date = new Date(),
): Date[] {
  return Array.from({ length: monthCount }, (_, i) =>
    monthElapsedDays(monthStartFor(spanStart, i), referenceDate),
  ).flat();
}

export function statsPeriodEmptyCopy(period: StatsPeriod): string {
  switch (period) {
    case 'week':
      return 'Нет данных за неделю — появятся после анализа фото';
    case 'month':
      return 'Нет данных за месяц — появятся после анализа фото';
    case 'quarter':
      return 'Нет данных за 3 месяца — появятся после анализа фото';
    case 'halfYear':
      return 'Нет данных за полгода — появятся после анализа фото';
    case 'year':
      return 'Нет данных за год — появятся после анализа фото';
  }
}

export function statsPeriodSwipeLabel(
  subject: 'Калории' | 'Витамины',
  period: StatsPeriod,
): string {
  switch (period) {
    case 'week':
      return `${subject} по неделям, свайп для смены недели`;
    case 'month':
      return `${subject} по месяцам, свайп для смены месяца`;
    case 'quarter':
      return `${subject} по 3 месяца, свайп для смены периода`;
    case 'halfYear':
      return `${subject} по полугодиям, свайп для смены периода`;
    case 'year':
      return `${subject} по годам, свайп для смены года`;
  }
}

export function monthStartFor(referenceDate: Date, monthOffset: number): Date {
  const d = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + monthOffset,
    1,
  );
  d.setHours(0, 0, 0, 0);
  return d;
}

export function monthEndFor(monthStart: Date): Date {
  const d = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export interface MonthWeekBucket {
  start: Date;
  end: Date;
}

/**
 * Calendar chunks 1–7, 8–14, … Last chunk ends on the last day of the month.
 * The week that contains `referenceDate` is clipped to today when viewing
 * the current month; future weeks stay in the list with full ranges.
 */
export function getMonthWeekBuckets(
  monthStart: Date,
  referenceDate: Date = new Date(),
): MonthWeekBucket[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const lastDay = monthEndFor(monthStart).getDate();
  const today = startOfDay(referenceDate);
  const clipCurrentWeek = isSameMonth(monthStart, today);

  const buckets: MonthWeekBucket[] = [];
  for (let startDay = 1; startDay <= lastDay; startDay += 7) {
    const endDay = Math.min(startDay + 6, lastDay);
    const start = new Date(year, month, startDay);
    start.setHours(0, 0, 0, 0);
    let end = new Date(year, month, endDay);
    end.setHours(0, 0, 0, 0);

    if (
      clipCurrentWeek &&
      start.getTime() <= today.getTime() &&
      today.getTime() <= end.getTime()
    ) {
      end = today;
    }

    buckets.push({ start, end });
  }
  return buckets;
}

export function eachDayInclusive(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/** Days in [start, end] that are not after `today`. */
export function eachElapsedDay(start: Date, end: Date, today: Date): Date[] {
  const cap = startOfDay(today);
  const from = startOfDay(start);
  if (from.getTime() > cap.getTime()) return [];
  const last = startOfDay(end);
  const clippedEnd = last.getTime() > cap.getTime() ? cap : last;
  return eachDayInclusive(from, clippedEnd);
}

/**
 * Days that count toward month averages: 1…last day, or 1…today in the
 * current month. Future months return [].
 */
export function monthElapsedDays(
  monthStart: Date,
  referenceDate: Date = new Date(),
): Date[] {
  const monthEnd = monthEndFor(monthStart);
  const today = startOfDay(referenceDate);
  if (today.getTime() < monthStart.getTime()) return [];
  const end =
    isSameMonth(monthStart, today) && today.getTime() < monthEnd.getTime()
      ? today
      : monthEnd;
  return eachDayInclusive(monthStart, end);
}
