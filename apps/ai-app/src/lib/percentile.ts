export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** `sortedAsc` must already be sorted ascending. */
export function percentileSorted(sortedAsc: number[], p: number): number | null {
  const n = sortedAsc.length;
  if (n === 0) return null;
  const idx = Math.min(n - 1, Math.max(0, Math.ceil((p / 100) * n) - 1));
  return sortedAsc[idx]!;
}

export function p50(values: number[]): number | null {
  if (values.length === 0) return null;
  return percentileSorted([...values].sort((a, b) => a - b), 50);
}

export function p95(values: number[]): number | null {
  if (values.length === 0) return null;
  return percentileSorted([...values].sort((a, b) => a - b), 95);
}
