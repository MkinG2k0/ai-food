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

/** e.g. "10 июл · 16 июл" */
export function formatDateRangeLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d
      .toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
      .replace(/\./g, '')
      .trim();
  return `${fmt(start)} · ${fmt(end)}`;
}
