/** Round chart ceiling to a readable tick (FatSecret-style grids). */
export function niceChartMax(dataMax: number, goal?: number): number {
  const peak = Math.max(dataMax, goal ?? 0, 100);
  const rough = peak * 1.08;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const nice =
    normalized <= 1.25
      ? 1.25
      : normalized <= 2
        ? 2
        : normalized <= 2.5
          ? 2.5
          : normalized <= 5
            ? 5
            : 10;
  return nice * magnitude;
}

/** Five evenly spaced ticks including 0 and max. */
export function chartTicks(max: number): number[] {
  return [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
}

/** Average over days with any logged calories; null if none. */
export function averageLoggedCalories(
  points: { calories: number }[],
): number | null {
  const logged = points.filter((p) => p.calories > 0);
  if (logged.length === 0) return null;
  const sum = logged.reduce((acc, p) => acc + p.calories, 0);
  return sum / logged.length;
}

function shortMonth(date: Date): string {
  return date
    .toLocaleDateString('ru-RU', { month: 'short' })
    .replace(/\./g, '')
    .trim();
}

/** e.g. "10 июл · 16 июл" */
export function formatDateRangeLabel(start: Date, end: Date): string {
  const fmt = (d: Date) => `${d.getDate()} ${shortMonth(d)}`;
  return `${fmt(start)} · ${fmt(end)}`;
}

/** e.g. "август 2026" */
export function formatMonthLabel(date: Date): string {
  return date
    .toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    .replace(/\s*г\.?$/i, '')
    .trim();
}

/** e.g. "8–13 авг" */
export function formatCompactDayRange(start: Date, end: Date): string {
  const month = shortMonth(start);
  if (start.getDate() === end.getDate()) {
    return `${start.getDate()} ${month}`;
  }
  return `${start.getDate()}–${end.getDate()} ${month}`;
}
