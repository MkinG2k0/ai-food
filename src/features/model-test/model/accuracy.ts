import type { KbjuReference } from './benchmarks';

/** Accuracy % for one macro: 100 − relative error, floored at 0. */
export function macroAccuracy(predicted: number, reference: number): number {
  if (reference === 0) {
    return predicted === 0 ? 100 : 0;
  }
  return Math.max(0, 100 - (Math.abs(predicted - reference) / reference) * 100);
}

/** Mean accuracy across calories / protein / fat / carbs. */
export function kbjuAccuracy(
  predicted: KbjuReference,
  reference: KbjuReference,
): number {
  return (
    (macroAccuracy(predicted.calories, reference.calories) +
      macroAccuracy(predicted.protein, reference.protein) +
      macroAccuracy(predicted.fat, reference.fat) +
      macroAccuracy(predicted.carbs, reference.carbs)) /
    4
  );
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatMacro(value: number, digits = 1): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}
