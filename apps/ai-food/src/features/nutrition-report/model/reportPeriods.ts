import { getWeekStart } from '@/shared/lib/dateUtils';

export interface ReportPeriod {
  id: string;
  label: string;
  start: Date;
  end: Date;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Inclusive day count between two calendar days. */
export function inclusiveDayCount(start: Date, end: Date): number {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

export function formatReportPeriodRange(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = start.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endFmt = end.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${startFmt} – ${endFmt}`;
}

/** Rolling N calendar days ending on `today` (inclusive). */
export function rollingDaysEndingToday(today: Date, count: number): ReportPeriod {
  const end = startOfDay(today);
  const start = addDays(end, -(count - 1));
  return { id: `last-${count}`, label: '', start, end };
}

/** Previous Mon–Sun week before the week containing `today`. */
export function previousCalendarWeek(today: Date): ReportPeriod {
  const thisMonday = getWeekStart(today);
  const end = addDays(thisMonday, -1);
  const start = addDays(thisMonday, -7);
  return { id: 'last-week', label: '', start, end };
}

export function buildReportPeriodPresets(today: Date = new Date()): ReportPeriod[] {
  const last7 = rollingDaysEndingToday(today, 7);
  const lastWeek = previousCalendarWeek(today);
  const last14 = rollingDaysEndingToday(today, 14);
  const last30 = rollingDaysEndingToday(today, 30);

  return [
    {
      ...last7,
      label: 'Последние 7 дней',
    },
    {
      ...lastWeek,
      label: 'Прошлая неделя',
    },
    {
      ...last14,
      label: 'Последние 2 недели',
    },
    {
      ...last30,
      label: 'Последние 30 дней',
    },
  ];
}

export function reportFileName(start: Date, end: Date): string {
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return `ai-food-report-${fmt(start)}_${fmt(end)}.pdf`;
}
